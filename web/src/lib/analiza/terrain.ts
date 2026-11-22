import { distLineToPolys, from2180, polygonsOf, project, sampleGrid, to2180, type GridPoint } from "./geo";
import type { Assessment, LonLat, Parcel, SourceInfo } from "./types";
import { fetchT, r0, r1, source } from "./util";

type Terrain = Assessment["terrain"];

/* ---------- NMT heights (GUGiK GetHByPointList, EPSG:2180, NORTHING FIRST) ---------- */
async function heightsBatch(pts: GridPoint[], signal?: AbortSignal): Promise<Map<string, number>> {
  const list = pts.map((p) => `${p.xy[1].toFixed(1)} ${p.xy[0].toFixed(1)}`).join(",");
  const res = await fetchT(`https://services.gugik.gov.pl/nmt/?request=GetHByPointList&list=${encodeURIComponent(list)}&json`, {
    timeoutMs: 8000,
    retries: 1,
    signal,
  });
  const txt = (await res.text()).replace(/[[\]"]/g, " ").trim();
  const out = new Map<string, number>();
  for (const item of txt.split(",")) {
    const [n, e, h] = item.trim().split(/\s+/).map(Number);
    if (Number.isFinite(h) && h > 0) out.set(`${Math.round(e * 10)},${Math.round(n * 10)}`, h);
  }
  return out;
}

export async function getTerrain(parcel: Parcel, signal?: AbortSignal): Promise<{ data: Pick<Terrain, "elevMin" | "elevMax" | "slopePct" | "lowPoint">; source: SourceInfo }> {
  const t0 = Date.now();
  const label = "Wysokości terenu (NMT GUGiK)";
  const lic = "GUGiK NMT, dane publiczne";
  const empty = { elevMin: null, elevMax: null, slopePct: null, lowPoint: null };
  try {
    const polys = project(polygonsOf(parcel.geometry));
    const { points, spacing } = sampleGrid(polys, 64);
    const batches: GridPoint[][] = [];
    for (let i = 0; i < points.length; i += 30) batches.push(points.slice(i, i + 30));
    const res = await Promise.allSettled(batches.map((b) => heightsBatch(b, signal)));
    const H = new Map<string, number>();
    res.forEach((r) => r.status === "fulfilled" && r.value.forEach((v, k) => H.set(k, v)));
    const hOf = (p: GridPoint) => H.get(`${Math.round(Number(p.xy[0].toFixed(1)) * 10)},${Math.round(Number(p.xy[1].toFixed(1)) * 10)}`);
    const got = points.map((p) => ({ p, h: hOf(p) })).filter((x): x is { p: GridPoint; h: number } => typeof x.h === "number");
    if (got.length < 3) return { data: empty, source: source("NMT", label, lic, t0, "missing", "brak wysokości z NMT dla działki", { url: "https://services.gugik.gov.pl/nmt/" }) };
    const hs = got.map((g) => g.h);
    const low = got.reduce((a, b) => (b.h < a.h ? b : a));
    // slope: local gradients from grid neighbours (median), fallback: least-squares plane
    const byIJ = new Map(got.map((g) => [`${g.p.i},${g.p.j}`, g.h]));
    const grads: number[] = [];
    for (const g of got) {
      const e = byIJ.get(`${g.p.i + 1},${g.p.j}`);
      const n = byIJ.get(`${g.p.i},${g.p.j + 1}`);
      if (e !== undefined && n !== undefined) grads.push(Math.hypot(e - g.h, n - g.h) / spacing);
    }
    let slope: number;
    if (grads.length >= 4) {
      grads.sort((a, b) => a - b);
      slope = grads[Math.floor(grads.length / 2)] * 100;
    } else {
      const mx = got.reduce((s, g) => s + g.p.xy[0], 0) / got.length;
      const my = got.reduce((s, g) => s + g.p.xy[1], 0) / got.length;
      const mh = hs.reduce((a, b) => a + b, 0) / hs.length;
      let sxx = 0, syy = 0, sxy = 0, sxh = 0, syh = 0;
      for (const g of got) {
        const dx = g.p.xy[0] - mx, dy = g.p.xy[1] - my, dh = g.h - mh;
        sxx += dx * dx; syy += dy * dy; sxy += dx * dy; sxh += dx * dh; syh += dy * dh;
      }
      const det = sxx * syy - sxy * sxy;
      const b = det ? (sxh * syy - syh * sxy) / det : 0;
      const c = det ? (syh * sxx - sxh * sxy) / det : 0;
      slope = Math.hypot(b, c) * 100;
    }
    const lp = from2180(low.p.xy);
    return {
      data: {
        elevMin: r1(Math.min(...hs)),
        elevMax: r1(Math.max(...hs)),
        slopePct: r1(slope),
        lowPoint: [Number(lp[0].toFixed(6)), Number(lp[1].toFixed(6))],
      },
      source: source("NMT", label, lic, t0, got.length >= points.length * 0.7 ? "ok" : "partial", `NMT 1 m, ${got.length}/${points.length} punktów co ~${r0(spacing)} m`, {
        url: "https://services.gugik.gov.pl/nmt/",
      }),
    };
  } catch {
    return { data: empty, source: source("NMT", label, lic, t0, "missing", "usługa NMT nie odpowiedziała", { url: "https://services.gugik.gov.pl/nmt/" }) };
  }
}

/* ---------- watercourses (OSM Overpass; BDOT10k needs DuckDB, not used live) ---------- */
type OsmWay = { tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] };
const KIND: Record<string, Terrain["watercourses"][number]["kind"]> = { ditch: "rów", drain: "rów", stream: "ciek", river: "ciek", canal: "kanał" };
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

export async function getWatercourses(parcel: Parcel, signal?: AbortSignal): Promise<{ data: Pick<Terrain, "ditchDistM" | "watercourses">; source: SourceInfo }> {
  const t0 = Date.now();
  const label = "Rowy i cieki w promieniu 1 km (OpenStreetMap)";
  const lic = "© OpenStreetMap contributors, ODbL";
  const [lon, lat] = parcel.centroid;
  const query = `[out:json][timeout:5];way(around:1000,${lat.toFixed(5)},${lon.toFixed(5)})[waterway~"^(ditch|drain|stream|river|canal)$"];out tags geom 200;`;
  try {
    const ctrl = new AbortController();
    const sig = signal ? AbortSignal.any([signal, ctrl.signal]) : ctrl.signal;
    const j = (await Promise.any(
      OVERPASS.map(async (u) => {
        const r = await fetchT(u, { timeoutMs: 4800, signal: sig, init: { method: "POST", body: "data=" + encodeURIComponent(query), headers: { "Content-Type": "application/x-www-form-urlencoded" } } });
        const out = (await r.json()) as { elements?: OsmWay[] };
        if (!Array.isArray(out.elements)) throw new Error("bad overpass");
        return out;
      }),
    )) as { elements: OsmWay[] };
    ctrl.abort();
    const polys = project(polygonsOf(parcel.geometry));
    const list = j.elements
      .filter((w) => w.geometry && w.geometry.length >= 2)
      .map((w) => {
        const line = w.geometry!.map((g) => to2180([g.lon, g.lat]));
        const kind = KIND[w.tags?.waterway ?? ""] ?? "rów";
        const name = w.tags?.name ?? (kind === "rów" ? "rów melioracyjny (bez nazwy)" : kind === "kanał" ? "kanał (bez nazwy)" : "ciek (bez nazwy)");
        return { name, kind, distM: r0(distLineToPolys(line, polys)) };
      })
      .sort((a, b) => a.distM - b.distM);
    // one entry per name+kind, nearest first
    const seen = new Set<string>();
    const watercourses = list.filter((w) => {
      const k = w.name + w.kind;
      if (seen.has(k) && !w.name.includes("bez nazwy")) return false;
      seen.add(k);
      return true;
    }).slice(0, 6);
    return {
      data: { ditchDistM: watercourses[0]?.distM ?? null, watercourses },
      source: source("BDOT10k", label, lic, t0, "partial", `OSM Overpass, ${list.length} odcinków w 1 km; BDOT10k nie odpytywany na żywo (kompletność OSM niepełna)`, {
        url: "https://www.openstreetmap.org/",
        note: "Brak rowu w OSM nie oznacza braku rowu w terenie.",
      }),
    };
  } catch {
    return {
      data: { ditchDistM: null, watercourses: [] },
      source: source("BDOT10k", label, lic, t0, "missing", "Brak danych o ciekach (usługa niedostępna)", { url: "https://www.openstreetmap.org/" }),
    };
  }
}

export const lonLatOk = (p: LonLat | null) => !!p && Number.isFinite(p[0]) && Number.isFinite(p[1]);
