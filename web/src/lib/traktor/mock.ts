/**
 * Deterministic mock gmina for the demo. Stands in for the offline pipeline output
 * (BDOT10k ditches x NMT 1 m). Every surface that shows it must carry DEMO_NOTE.
 * Map space: 1000 x 640 units, 1 unit ~ 10 m. West is higher ground, east falls to the lake.
 */
import type {
  Candidate,
  Crest,
  CrestHeight,
  Ditch,
  MapFeatures,
  Parcel,
  Range,
  Refusal,
  RefusalCode,
  Site,
  Summary,
  XY,
} from "./types";
import { GMINA } from "./copy";

/* ---------- utils ---------- */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261122);
const r = (a: number, b: number) => a + rnd() * (b - a);
const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
const rng = (v: number, spread = 0.2, d = 0): Range => [round(v * (1 - spread), d), round(v * (1 + spread), d)];

function densify(pts: XY[], step = 6): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      // gentle meander perpendicular to the segment
      const wob = Math.sin((i * 7 + k) * 0.35) * 1.6;
      const nx = -(y2 - y1) / len;
      const ny = (x2 - x1) / len;
      out.push([round(x1 + (x2 - x1) * t + nx * wob, 1), round(y1 + (y2 - y1) * t + ny * wob, 1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function distToPolyline(p: XY, line: XY[]) {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  return best;
}

function inPolygon([x, y]: XY, poly: XY[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function toLatLon([x, y]: XY) {
  return {
    lat: round(GMINA.center.lat + ((320 - y) * 10) / 111320, 5),
    lon: round(GMINA.center.lon + ((x - 500) * 10) / 67540, 5),
  };
}

export function elevationAt([x, y]: XY) {
  return round(79.5 + (1000 - x) * 0.011 + Math.sin(y / 90) * 0.8, 1);
}

/* ---------- static features ---------- */
const W = 1000;
const H = 640;

const lakeShore = (y: number) => 860 + Math.sin(y / 70) * 22 + (y > 400 ? (y - 400) * 0.12 : 0);
const lake: XY[] = [];
for (let y = 0; y <= H; y += 20) lake.push([round(lakeShore(y)), y]);
lake.push([W, H], [W, 0]);

const floodZone: XY[] = [];
for (let y = 0; y <= H; y += 20) floodZone.push([round(lakeShore(y) - 70 - Math.cos(y / 50) * 14), y]);
for (let y = H; y >= 0; y -= 20) floodZone.push([round(lakeShore(y)), y]);

const bandEdge = (k: number, y: number) => 140 + k * 170 + Math.sin(y / 80 + k) * 34 + Math.cos(y / 37 + k * 2) * 12;
const elevationBands: MapFeatures["elevationBands"] = [];
// level 5 (highest) in the west ... level 1 at the lake
for (let k = 0; k < 5; k++) {
  const left: XY[] = [];
  const right: XY[] = [];
  for (let y = 0; y <= H; y += 16) {
    left.push([k === 0 ? 0 : round(bandEdge(k - 1, y)), y]);
    right.push([k === 4 ? W : round(bandEdge(k, y)), y]);
  }
  elevationBands.push({ level: (5 - k) as 1 | 2 | 3 | 4 | 5, points: [...left, ...right.reverse()] });
}
const contours: XY[][] = [];
for (let k = 0; k < 4; k++) {
  for (const off of [0, 85]) {
    const line: XY[] = [];
    for (let y = 0; y <= H; y += 16) line.push([round(bandEdge(k, y) + off * (k < 3 ? 1 : 0)), y]);
    contours.push(line);
  }
}

const roads: MapFeatures["roads"] = [
  { id: "DW412", name: "DW 412", points: densify([[0, 236], [220, 242], [430, 252], [640, 282], [830, 300]], 20) },
  { id: "DG-01", name: "droga gminna", points: densify([[448, 0], [440, 210], [436, 420], [444, 640]], 20) },
];

const buildings: MapFeatures["buildings"] = [];
for (let i = 0; i < 14; i++) {
  buildings.push({ id: `B${i}`, xy: [round(r(410, 500)), round(r(200, 300))], w: round(r(6, 12)), h: round(r(6, 10)) });
}
for (let i = 0; i < 4; i++) {
  buildings.push({ id: `F${i}`, xy: [round(r(170, 210)), round(r(430, 460))], w: round(r(7, 14)), h: round(r(6, 10)) });
}

/* ---------- ditches ---------- */
const DITCH_DEF: { id: string; name: string; pts: XY[]; resolvable: boolean }[] = [
  { id: "R-1", name: "Rów R-1 Główny", pts: [[30, 120], [300, 150], [560, 196], [800, 258], [850, 262]], resolvable: true },
  { id: "R-2", name: "Rów R-2 Polny", pts: [[70, 322], [320, 332], [560, 360], [850, 384]], resolvable: true },
  { id: "R-3", name: "Rów R-3 Łąkowy", pts: [[50, 522], [300, 502], [520, 470], [790, 500], [880, 520]], resolvable: true },
  { id: "R-4", name: "Rów R-4 Boczny", pts: [[300, 150], [312, 332], [300, 502], [290, 620]], resolvable: true },
  { id: "R-5", name: "Rów R-5 Brzozowy", pts: [[560, 196], [572, 360], [540, 470]], resolvable: true },
  { id: "R-6", name: "Rów R-6", pts: [[150, 30], [168, 322]], resolvable: false },
  { id: "R-7", name: "Rów R-7 Dolny", pts: [[420, 610], [430, 470], [436, 360]], resolvable: true },
  { id: "R-8", name: "Rów R-8", pts: [[680, 40], [690, 262], [700, 372]], resolvable: false },
  { id: "R-9", name: "Rów R-9 Klinowy", pts: [[120, 600], [180, 522], [168, 322]], resolvable: true },
  { id: "R-10", name: "Rów R-10 Szeroki", pts: [[640, 620], [660, 490], [700, 372]], resolvable: true },
];
export const ditches: Ditch[] = DITCH_DEF.map((d) => ({
  id: d.id,
  name: d.name,
  points: densify(d.pts, 6),
  resolvable: d.resolvable,
}));

/* ---------- candidates ---------- */
const TARGET_POINTS = 1240;
const TARGET_ACCEPTED = 31;

function polyLen(pts: XY[]) {
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return s;
}
const totalLen = ditches.reduce((s, d) => s + polyLen(d.points), 0);
const spacing = totalLen / TARGET_POINTS;

function sampleAlong(pts: XY[], step: number): XY[] {
  const out: XY[] = [];
  let carry = step / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    let t = carry;
    while (t <= len) {
      out.push([round(x1 + ((x2 - x1) * t) / len, 1), round(y1 + ((y2 - y1) * t) / len, 1)]);
      t += step;
    }
    carry = t - len;
  }
  return out;
}

type Raw = { id: string; ditchId: string; xy: XY; code?: RefusalCode; eligible: boolean };
const raw: Raw[] = [];
let ci = 0;
for (const d of ditches) {
  for (const xy of sampleAlong(d.points, spacing)) {
    ci++;
    const id = `P-${String(ci).padStart(4, "0")}`;
    let code: RefusalCode | undefined;
    if (!d.resolvable) code = "CHANNEL_UNRESOLVED";
    else if (roads.some((rd) => distToPolyline(xy, rd.points) < 16)) code = "ROAD_OR_CULVERT";
    else if (buildings.some((b) => Math.hypot(b.xy[0] - xy[0], b.xy[1] - xy[1]) < 34)) code = "BUILDING";
    else if (inPolygon(xy, floodZone)) code = "FLOOD_ZONE";
    raw.push({ id, ditchId: d.id, xy, code, eligible: !code });
  }
}
// pick accepted with spacing, rest get slope / neighbour refusals
const eligible = raw.filter((p) => p.eligible).sort(() => rnd() - 0.5);
const accepted: Raw[] = [];
for (const p of eligible) {
  if (accepted.length >= TARGET_ACCEPTED) break;
  if (accepted.every((a) => Math.hypot(a.xy[0] - p.xy[0], a.xy[1] - p.xy[1]) > 48)) accepted.push(p);
}
const acceptedIds = new Set(accepted.map((a) => a.id));
for (const p of raw) {
  if (!p.code && !acceptedIds.has(p.id)) p.code = rnd() < 0.42 ? "OUT_OF_BANK_NEIGHBOUR" : "SLOPE_TOO_STEEP";
}

export const candidates: Candidate[] = raw.map((p) => ({
  id: p.id,
  ditchId: p.ditchId,
  xy: p.xy,
  status: acceptedIds.has(p.id) ? "accepted" : "refused",
  refusalCode: acceptedIds.has(p.id) ? undefined : p.code,
}));

/* ---------- sites ---------- */
const CREST_HEIGHTS: CrestHeight[] = [20, 30, 40, 50, 60];
const parcels: Parcel[] = [];

function parcelId(n: number) {
  return `040706_5.0012.${400 + n}`;
}

function buildSite(p: Raw, idx: number): Site {
  const ditch = ditches.find((d) => d.id === p.ditchId)!;
  const slopePct = round(r(0.08, 0.32), 2);
  const depth = round(r(1.1, 1.6), 2);
  const bottomW = round(r(0.5, 0.9), 2);
  // which crest first spills onto the neighbour (forced for S-007)
  const spillAt: CrestHeight | null = idx === 6 ? 60 : rnd() < 0.35 ? (rnd() < 0.5 ? 50 : 60) : null;
  const lowBank = spillAt ? (spillAt - 5) / 100 : depth;
  const ownId = parcelId(idx * 2);
  const neighId = parcelId(idx * 2 + 1);
  const crests: Crest[] = CREST_HEIGHTS.map((h) => {
    const hm = h / 100;
    const backwater = round(hm / (slopePct / 100), 0);
    const width = bottomW + 1.5 * hm;
    const channel = 0.5 * hm * width * backwater;
    const bandM2 = backwater * 2 * 60;
    const soil = bandM2 * (hm / 2) * 0.09;
    const storage = channel + soil;
    const ha = (bandM2 * 0.55) / 10000;
    const mm = (storage / (ha * 10000)) * 1000;
    const refused = spillAt !== null && h >= spillAt;
    const refusal: Refusal | undefined = refused
      ? {
          code: "OUT_OF_BANK_NEIGHBOUR",
          crestCm: h,
          objectRef: neighId,
          distanceM: round(r(25, 70)),
          messagePl: `Przy ${h} cm woda wychodzi z rowu na działkę ${neighId}, która należy do sąsiada.`,
        }
      : undefined;
    return {
      heightCm: h,
      status: refused ? "refused" : "accepted",
      refusal,
      storageM3: rng(storage, 0.2, -1),
      backwaterM: backwater,
      rehydratedHa: rng(ha, 0.25, 1),
      storageMm: rng(mm, 0.25, 0),
      outflowAvoidedMm: [round(71 * 0.6 * (hm / 0.6)), round(71 * (hm / 0.6))],
    };
  });
  const maxOk = [...crests].reverse().find((c) => c.status === "accepted");
  // cross-section: field - bank - channel - bank - field (bed = 0)
  const half = bottomW / 2;
  const xs = {
    offset: [-9, -5, -2.6, -half, half, 2.6, 5, 9],
    ground: [depth + 0.15, depth + 0.05, depth, 0, 0, lowBank, lowBank + 0.05, lowBank + 0.12].map((v) => round(v, 2)),
  };
  const chainage: number[] = [];
  const bed: number[] = [];
  const bank: number[] = [];
  for (let c = 0; c <= 600; c += 20) {
    chainage.push(c);
    const b = (c * slopePct) / 100 + Math.sin(c / 45) * 0.03;
    bed.push(round(b, 2));
    bank.push(round(b + depth + Math.sin(c / 70) * 0.08, 2));
  }
  // parcels: own on the north side, neighbour on the south side of the weir
  const [x, y] = p.xy;
  parcels.push({ id: ownId, owner: "own", points: [[x - 34, y - 40], [x + 34, y - 40], [x + 34, y - 2], [x - 34, y - 2]] });
  parcels.push({ id: neighId, owner: "neighbour", points: [[x - 30, y + 2], [x + 38, y + 2], [x + 38, y + 36], [x - 30, y + 36]] });
  const { lat, lon } = toLatLon(p.xy);
  return {
    id: `S-${String(idx + 1).padStart(3, "0")}`,
    ditchId: ditch.id,
    name: ditch.name,
    xy: p.xy,
    lat,
    lon,
    status: "accepted",
    refusals: [],
    crests,
    maxAcceptedCrestCm: maxOk ? maxOk.heightCm : null,
    soilCategory: (["I", "I", "II", "II", "III", "IV"] as const)[Math.floor(r(0, 6))],
    elevationM: elevationAt(p.xy),
    slopePct,
    ditchLengthM: round(polyLen(ditch.points) * 10, -1),
    upstreamFieldsHa: round(r(18, 120)),
    ownParcels: [ownId],
    flags: ["SUBSURFACE_DRAINAGE_UNKNOWN", "OWNER_UNCONFIRMED"],
    downstreamSensitive: idx % 9 === 4,
    xs,
    profile: { chainage, bed, bank },
    kowr: rnd() < 0.4,
    rank: null,
  };
}

const builtSites = accepted.map(buildSite);
// rank by storage at max accepted crest, soil category I first
const score = (s: Site) => {
  const c = s.crests.find((k) => k.heightCm === s.maxAcceptedCrestCm);
  return (c ? c.storageM3[1] : 0) * (s.soilCategory === "I" ? 1.3 : 1);
};
[...builtSites].sort((a, b) => score(b) - score(a)).forEach((s, i) => (s.rank = i + 1));
export const sites: Site[] = builtSites;

/** Featured site for the demo script: 60 cm refused because of the neighbour's parcel. */
export const FEATURED_SITE_ID = "S-007";

export const mapFeatures: MapFeatures = {
  width: W,
  height: H,
  elevationBands,
  contours,
  lake,
  floodZone,
  roads,
  buildings,
  parcels,
};

/* ---------- summary ---------- */
const refusalsByCode = candidates.reduce(
  (acc, c) => {
    if (c.refusalCode) acc[c.refusalCode]++;
    return acc;
  },
  {
    ROAD_OR_CULVERT: 0,
    BUILDING: 0,
    FLOOD_ZONE: 0,
    CHANNEL_UNRESOLVED: 0,
    OUT_OF_BANK_NEIGHBOUR: 0,
    SLOPE_TOO_STEEP: 0,
  } as Record<RefusalCode, number>,
);
const atMax = (s: Site) => s.crests.find((k) => k.heightCm === s.maxAcceptedCrestCm);
export const summary: Summary = {
  pointsAnalysed: candidates.length,
  sitesAccepted: sites.length,
  refusalsByCode,
  totalStorageM3: [
    round(sites.reduce((t, s) => t + (atMax(s)?.storageM3[0] ?? 0), 0), -2),
    round(sites.reduce((t, s) => t + (atMax(s)?.storageM3[1] ?? 0), 0), -2),
  ],
  totalRehydratedHa: [
    round(sites.reduce((t, s) => t + (atMax(s)?.rehydratedHa[0] ?? 0), 0)),
    round(sites.reduce((t, s) => t + (atMax(s)?.rehydratedHa[1] ?? 0), 0)),
  ],
};

export function getSite(id: string) {
  return sites.find((s) => s.id === id);
}
