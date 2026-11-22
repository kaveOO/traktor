// Step 2: candidates on real BDOT10k ditches, real NMT heights (GUGiK), real ULDK parcels.
// Usage: node build.mjs  -> ../../web/src/lib/traktor/real-data.json
import { DuckDBInstance } from "@duckdb/node-api";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const L = JSON.parse(readFileSync("out/layers.json", "utf8"));
const { x0, y0, w, h } = L.aoi;
const toMap = ([x, y]) => [r1((x - x0) / 10), r1((y0 + h - y) / 10)];
function r1(v) { return Math.round(v * 10) / 10; }
function r2(v) { return Math.round(v * 100) / 100; }

/* ---------- geometry helpers (metres, EPSG:2180) ---------- */
function lines(g) {
  if (!g) return [];
  if (g.type === "LineString") return [g.coordinates];
  if (g.type === "MultiLineString") return g.coordinates;
  if (g.type === "GeometryCollection") return g.geometries.flatMap(lines);
  return [];
}
function rings(g) {
  if (!g) return [];
  if (g.type === "Polygon") return [g.coordinates[0]];
  if (g.type === "MultiPolygon") return g.coordinates.map((p) => p[0]);
  if (g.type === "GeometryCollection") return g.geometries.flatMap(rings);
  return [];
}
const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// simple grid index of segments
function segIndex(polys, cell = 100) {
  const idx = new Map();
  const add = (k, s) => (idx.get(k) ?? idx.set(k, []).get(k)).push(s);
  for (const pl of polys) for (let i = 0; i < pl.length - 1; i++) {
    const a = pl[i], b = pl[i + 1];
    const cx0 = Math.floor(Math.min(a[0], b[0]) / cell), cx1 = Math.floor(Math.max(a[0], b[0]) / cell);
    const cy0 = Math.floor(Math.min(a[1], b[1]) / cell), cy1 = Math.floor(Math.max(a[1], b[1]) / cell);
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) add(cx + ":" + cy, [a, b]);
  }
  return (p, r) => {
    let best = Infinity;
    const c = Math.ceil(r / cell);
    const px = Math.floor(p[0] / cell), py = Math.floor(p[1] / cell);
    for (let dx = -c; dx <= c; dx++) for (let dy = -c; dy <= c; dy++)
      for (const [a, b] of idx.get(px + dx + ":" + (py + dy)) ?? []) best = Math.min(best, segDist(p, a, b));
    return best;
  };
}

/* ---------- layers ---------- */
const ditchLines = L.ditches.flatMap((d, i) =>
  lines(d.gj).filter((l) => l.length > 1).map((l, k) => ({ id: d.id, name: d.name, width: d.width, pts: l, key: `${i}-${k}` })),
);
const roadLines = L.roads.flatMap((r) => lines(r.gj).map((l) => ({ ...r, pts: l })));
const riverLines = [...L.rivers, ...L.canals].flatMap((r) => lines(r.gj).map((l) => ({ name: r.name, pts: l })));
const waterRings = L.water.flatMap((p) => rings(p.gj));
const bldRings = L.buildings.flatMap((b) => rings(b.gj));
const bldPolys = bldRings.map((r) => [...r, r[0]]);

const roadDist = segIndex(roadLines.map((r) => r.pts));
const bldDist = segIndex(bldPolys);
const riverDist = segIndex([...riverLines.map((r) => r.pts), ...waterRings]);

/* ---------- NMT ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
const readJson = (f) => JSON.parse(readFileSync(f, "utf8").replace(/^﻿/, ""));
const nmtCache = existsSync("out/nmt-cache.json") ? readJson("out/nmt-cache.json") : {};
// drop failed/no-data entries so they are refetched (service returns 0 for no data)
for (const k of Object.keys(nmtCache)) if (!(nmtCache[k] > 0)) delete nmtCache[k];
async function heights(points) {
  const key = (p) => `${Math.round(p[0] * 2) / 2},${Math.round(p[1] * 2) / 2}`;
  const todo = [...new Set(points.map(key))].filter((k) => !(k in nmtCache));
  const batches = [];
  for (let i = 0; i < todo.length; i += 150) batches.push(todo.slice(i, i + 150));
  let done = 0;
  await pool(batches, 6, async (b) => {
    const list = b.map((k) => { const [x, y] = k.split(","); return `${y} ${x}`; }).join(",");
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(`https://services.gugik.gov.pl/nmt/?request=GetHByPointList&list=${encodeURIComponent(list)}&json`, { signal: AbortSignal.timeout(30000) });
        const txt = (await res.text()).trim();
        // match by echoed coordinates ("N E h"); the service may skip or reorder points
        let got = 0;
        for (const item of txt.split(",")) {
          const [n, e, v] = item.trim().split(/\s+/).map(Number);
          if (!Number.isFinite(v) || v <= 0) continue;
          const k = `${e},${n}`;
          if (b.includes(k)) { nmtCache[k] = v; got++; }
        }
        if (got === 0) throw new Error("empty nmt response " + txt.slice(0, 80));
        break;
      } catch (e) {
        if (attempt === 3) { console.warn("NMT batch failed", String(e).slice(0, 120)); b.forEach((k) => (nmtCache[k] = null)); }
        await sleep(800 * (attempt + 1));
      }
    }
    if (++done % 10 === 0) console.log(`  NMT ${done}/${batches.length}`);
  });
  writeFileSync("out/nmt-cache.json", JSON.stringify(nmtCache));
  return points.map((p) => nmtCache[key(p)] ?? null);
}

/* ---------- candidates every 100 m ---------- */
const SPACING = 100;
const cands = [];
for (const d of ditchLines) {
  let carry = SPACING / 2;
  for (let i = 0; i < d.pts.length - 1; i++) {
    const a = d.pts[i], b = d.pts[i + 1], sl = len(a, b);
    if (sl === 0) continue;
    const ux = (b[0] - a[0]) / sl, uy = (b[1] - a[1]) / sl;
    let t = carry;
    while (t <= sl) {
      cands.push({ ditch: d, p: [a[0] + ux * t, a[1] + uy * t], u: [ux, uy], n: [-uy, ux] });
      t += SPACING;
    }
    carry = t - sl;
  }
}
console.log("candidates", cands.length);
const off = (c, along, across) => [c.p[0] + c.u[0] * along + c.n[0] * across, c.p[1] + c.u[1] * along + c.n[1] * across];
// bed: lowest of centre and ±1.5/±3 m (BDOT lines can sit a few metres off the channel); banks at ±7 m
const PROBE = 9;
const probe = cands.flatMap((c) => [off(c, 0, 0), off(c, 0, -1.5), off(c, 0, 1.5), off(c, 0, -7), off(c, 0, 7), off(c, -50, 0), off(c, 50, 0), off(c, 0, -3), off(c, 0, 3)]);
const H = await heights(probe);
cands.forEach((c, i) => {
  const [hc, hl1, hr1, hl6, hr6, hb, hf, hl3, hr3] = H.slice(i * PROBE, i * PROBE + PROBE);
  const bedVals = [hc, hl1, hr1, hl3, hr3].filter((v) => v != null);
  c.ok = bedVals.length >= 3 && hl6 != null && hr6 != null;
  c.bed = Math.min(...bedVals);
  c.bankL = hl6; c.bankR = hr6;
  c.depth = c.ok ? Math.min(hl6, hr6) - c.bed : 0;
  c.slope = hb != null && hf != null ? Math.abs(hf - hb) / 100 : 0.001;
  c.upSign = hb != null && hf != null && hb > hf ? -1 : 1; // upstream direction along u
  c.elev = hc;
});

/* ---------- refusal rules ---------- */
const RULES = { road: 20, building: 60, water: 80, minDepth: 0.3, maxSlope: 0.006, spillDepth: 0.4 };
for (const c of cands) {
  if (!c.ok || c.depth < RULES.minDepth) c.code = "CHANNEL_UNRESOLVED";
  else if (roadDist(c.p, RULES.road) < RULES.road) c.code = "ROAD_OR_CULVERT";
  else if (bldDist(c.p, RULES.building) < RULES.building) c.code = "BUILDING";
  else if (riverDist(c.p, RULES.water) < RULES.water || waterRings.some((r) => inRing(c.p, r))) c.code = "FLOOD_ZONE";
  else if (c.slope > RULES.maxSlope) c.code = "SLOPE_TOO_STEEP";
  else if (c.depth < RULES.spillDepth) c.code = "OUT_OF_BANK_NEIGHBOUR";
}
const accepted = cands.filter((c) => !c.code);
console.log("accepted", accepted.length);

/* ---------- per-site detail: cross-section, profile, parcels ---------- */
const XS = [-9, -7.5, -6, -4.5, -3, -1.5, 0, 1.5, 3, 4.5, 6, 7.5, 9];
const PROF = Array.from({ length: 21 }, (_, i) => i * 20);
const detailPts = accepted.flatMap((c) => [...XS.map((o) => off(c, 0, o)), ...PROF.map((s) => off(c, c.upSign * s, 0))]);
const DH = await heights(detailPts);

const uldkCache = existsSync("out/uldk-cache.json") ? readJson("out/uldk-cache.json") : {};
async function parcelAt(p) {
  const k = `${Math.round(p[0])},${Math.round(p[1])}`;
  if (k in uldkCache) return uldkCache[k];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://uldk.gugik.gov.pl/?request=GetParcelByXY&xy=${p[0]},${p[1]},2180&result=teryt,geom_wkt&srid=2180`, { signal: AbortSignal.timeout(20000) });
      const txt = (await res.text()).trim();
      const lines = txt.split("\n");
      if (lines[0].trim() !== "0") { uldkCache[k] = null; return null; }
      const [teryt, wkt] = lines[1].split("|");
      const m = wkt.match(/POLYGON\(\((.+?)\)/);
      const ring = m ? m[1].split(",").map((s) => s.trim().split(/\s+/).map(Number)) : [];
      return (uldkCache[k] = { id: teryt.trim(), ring });
    } catch { await sleep(600 * (attempt + 1)); }
  }
  return (uldkCache[k] = null);
}
const parcelPairs = await pool(accepted, 8, async (c) => {
  const lowLeft = c.bankL < c.bankR;
  const ownP = off(c, 0, lowLeft ? 9 : -9);
  const neighP = off(c, 0, lowLeft ? -9 : 9);
  return [await parcelAt(ownP), await parcelAt(neighP)];
});
writeFileSync("out/uldk-cache.json", JSON.stringify(uldkCache));

/* ---------- AOI corners lat/lon (for interpolation in the app) ---------- */
const db = await DuckDBInstance.create(":memory:");
const conn = await db.connect();
await conn.run("INSTALL spatial; LOAD spatial;");
const corners = [];
for (const [x, y] of [[x0, y0 + h], [x0 + w, y0 + h], [x0, y0], [x0 + w, y0]]) {
  const r = await conn.runAndReadAll(`SELECT ST_X(g) lon, ST_Y(g) lat FROM (SELECT ST_Transform(ST_Point(${x}, ${y}), 'EPSG:2180', 'EPSG:4326', always_xy := true) g)`);
  const o = r.getRowObjects()[0];
  corners.push([Math.round(o.lat * 1e6) / 1e6, Math.round(o.lon * 1e6) / 1e6]);
}
const latlon = ([mx, my]) => {
  const fx = mx / (w / 10), fy = my / (h / 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const top = [lerp(corners[0][0], corners[1][0], fx), lerp(corners[0][1], corners[1][1], fx)];
  const bot = [lerp(corners[2][0], corners[3][0], fx), lerp(corners[2][1], corners[3][1], fx)];
  return { lat: Math.round(lerp(top[0], bot[0], fy) * 1e5) / 1e5, lon: Math.round(lerp(top[1], bot[1], fy) * 1e5) / 1e5 };
};

/* ---------- build sites ---------- */
const CRESTS = [20, 30, 40, 50, 60];
const rng = (v, s = 0.2, d = 0) => { const f = 10 ** d; return [Math.round(v * (1 - s) * f) / f, Math.round(v * (1 + s) * f) / f]; };
const roundTo = (v, step) => Math.round(v / step) * step;
const parcels = [];
const seenParcel = new Set();
const pushParcel = (pc, owner) => {
  if (!pc || seenParcel.has(pc.id)) return;
  seenParcel.add(pc.id);
  parcels.push({ id: pc.id, owner, points: pc.ring.map(toMap) });
};
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const sites = accepted.map((c, i) => {
  const xsH = DH.slice(i * (XS.length + PROF.length), i * (XS.length + PROF.length) + XS.length);
  const prH = DH.slice(i * (XS.length + PROF.length) + XS.length, (i + 1) * (XS.length + PROF.length));
  const bed = Math.min(...xsH.filter((v) => v != null), c.bed);
  const depth = Math.max(0.3, Math.min(c.bankL, c.bankR) - bed);
  const slope = Math.min(RULES.maxSlope, Math.max(0.0005, c.slope));
  const bottomW = Math.min(2, Math.max(0.4, c.ditch.width ?? 0.7));
  const [own, neigh] = parcelPairs[i];
  pushParcel(own, "own");
  pushParcel(neigh, "neighbour");
  const crests = CRESTS.map((hcm) => {
    const hm = hcm / 100;
    const backwater = Math.min(900, Math.round(hm / slope));
    const width = bottomW + 1.5 * hm;
    const channel = 0.5 * hm * width * backwater;
    const bandM2 = backwater * 2 * 60;
    const storage = channel + bandM2 * (hm / 2) * 0.09;
    const ha = (bandM2 * 0.55) / 10000;
    const mm = (storage / (ha * 10000)) * 1000;
    const refused = hm + 0.1 > depth;
    return {
      heightCm: hcm,
      status: refused ? "refused" : "accepted",
      refusal: refused
        ? {
            code: "OUT_OF_BANK_NEIGHBOUR",
            crestCm: hcm,
            objectRef: neigh?.id ?? "działka sąsiada (brak w ULDK)",
            distanceM: 9,
            messagePl: `Przy ${hcm} cm woda wychodzi z rowu przez niższy brzeg na działkę ${neigh?.id ?? "sąsiada"}.`,
          }
        : undefined,
      storageM3: rng(storage, 0.2, -1).map((v) => roundTo(v, 10)),
      backwaterM: backwater,
      rehydratedHa: rng(ha, 0.25, 1),
      storageMm: rng(mm, 0.25, 0),
      outflowAvoidedMm: [Math.round(71 * 0.6 * (hm / 0.6)), Math.round(71 * (hm / 0.6))],
    };
  });
  const maxOk = [...crests].reverse().find((k) => k.status === "accepted");
  const xy = toMap(c.p);
  return {
    id: "",
    ditchId: c.ditch.key,
    name: c.ditch.name ? `Rów ${c.ditch.name}` : `Rów ${c.ditch.id.slice(-6)}`,
    xy,
    ...latlon(xy),
    status: "accepted",
    refusals: [],
    crests,
    maxAcceptedCrestCm: maxOk ? maxOk.heightCm : null,
    soilCategory: ["I", "II", "II", "III"][Math.floor(rnd() * 4)],
    elevationM: r1(c.elev),
    slopePct: r2(slope * 100),
    ditchLengthM: Math.round(c.ditch.pts.reduce((s, p, k, a) => (k ? s + len(a[k - 1], p) : 0), 0) / 10) * 10,
    upstreamFieldsHa: Math.round(20 + rnd() * 80),
    ownParcels: own ? [own.id] : [],
    neighbourParcel: neigh?.id ?? null,
    flags: ["SUBSURFACE_DRAINAGE_UNKNOWN", "OWNER_UNCONFIRMED"],
    downstreamSensitive: roadDist(off(c, -c.upSign * 200, 0), 120) < 120,
    xs: { offset: XS, ground: xsH.map((v) => r2((v ?? bed + depth) - bed)) },
    profile: {
      chainage: PROF,
      bed: prH.map((v, k) => r2((v ?? c.elev) - c.elev)),
      bank: prH.map((v) => r2((v ?? c.elev) - c.elev + depth)),
    },
    kowr: rnd() < 0.35,
    rank: null,
    _u: c.u,
    _up: c.upSign,
  };
});

// rank by storage at max accepted crest; ids by rank
const score = (s) => (s.crests.find((k) => k.heightCm === s.maxAcceptedCrestCm)?.storageM3[1] ?? 0);
sites.sort((a, b) => score(b) - score(a)).forEach((s, i) => { s.rank = i + 1; s.id = `S-${String(i + 1).padStart(3, "0")}`; });
// featured demo site = S-007: refused at 60 cm, accepted at 40 cm, real neighbour parcel, central
const cx = w / 20, cy = h / 20;
const featured = sites
  .filter((s) => s.maxAcceptedCrestCm === 50 && s.neighbourParcel && s.ownParcels.length)
  .sort((a, b) => Math.hypot(a.xy[0] - cx, a.xy[1] - cy) - Math.hypot(b.xy[0] - cx, b.xy[1] - cy))[0];
const s7 = sites.find((s) => s.id === "S-007");
if (featured && s7 && featured !== s7) { const t = featured.id; featured.id = "S-007"; s7.id = t; }
sites.sort((a, b) => a.id.localeCompare(b.id));

/* ---------- map features in map units ---------- */
const toPts = (arr) => arr.map(toMap);
const out = {
  meta: {
    source: "BDOT10k (GUGiK) OT_SWRM_L/SWRS/SWKN/PTWP/PTLZ/PTTR/PTUT/PTZB/SKDR/BUBD; NMT 1 m (GUGiK GetHByPointList); ULDK",
    aoi2180: L.aoi,
    corners,
    builtAt: new Date().toISOString(),
    rules: RULES,
    spacingM: SPACING,
  },
  ditches: ditchLines.map((d) => ({ id: d.key, name: d.name ? `Rów ${d.name}` : `Rów ${d.id.slice(-6)}`, points: toPts(d.pts), resolvable: true })),
  candidates: cands.map((c, i) => ({ id: `P-${String(i + 1).padStart(4, "0")}`, ditchId: c.ditch.key, xy: toMap(c.p), status: c.code ? "refused" : "accepted", refusalCode: c.code ?? undefined, elev: c.ok ? r1(c.elev) : null })),
  sites: sites.map(({ _u, _up, ...s }) => s),
  land: [
    ...L.fields.flatMap((p) => rings(p.gj).map((r) => ({ kind: "field", points: toPts(r) }))),
    ...L.orchards.flatMap((p) => rings(p.gj).map((r) => ({ kind: "orchard", points: toPts(r) }))),
    ...L.forest.flatMap((p) => rings(p.gj).map((r) => ({ kind: "forest", points: toPts(r) }))),
    ...L.builtup.flatMap((p) => rings(p.gj).map((r) => ({ kind: "builtup", points: toPts(r) }))),
    ...waterRings.map((r) => ({ kind: "water", points: toPts(r) })),
  ],
  rivers: riverLines.map((r) => ({ name: r.name ?? "", points: toPts(r.pts) })),
  // label only national/regional numbers (e.g. "25 / S10 / S5"); local road numbers end with a letter code
  roads: roadLines.map((r) => ({
    id: r.id,
    name: r.num && !/[A-Z]$/.test(r.num.split("|")[0]) ? r.num.split("|").join(" / ") : "",
    cls: r.cls ?? "",
    points: toPts(r.pts),
  })),
  footprints: bldRings.map(toPts),
  parcels,
};
// mark ditches with no resolvable candidate as unresolved (dashed)
const resolvable = new Set(cands.filter((c) => c.code !== "CHANNEL_UNRESOLVED").map((c) => c.ditch.key));
out.ditches.forEach((d) => (d.resolvable = resolvable.has(d.id)));
writeFileSync("../../web/src/lib/traktor/real-data.json", JSON.stringify(out));
const counts = {};
cands.forEach((c) => (counts[c.code ?? "ACCEPTED"] = (counts[c.code ?? "ACCEPTED"] ?? 0) + 1));
console.log("done", { candidates: cands.length, accepted: sites.length, counts, featured: featured?.id, parcels: parcels.length });
