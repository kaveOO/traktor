/**
 * Real data for the demo area west of Bydgoszcz (gmina Białe Błota), built offline by
 * scripts/geo (BDOT10k ditches/roads/buildings/land cover, GUGiK NMT 1 m heights, ULDK parcels).
 * File name kept as mock.ts so imports stay stable. Map space: 1000 x 640 units, 1 unit = 10 m.
 */
import type { Candidate, Ditch, MapFeatures, Parcel, RefusalCode, Site, Summary, XY } from "./types";
import raw from "./real-data.json";

type RealData = {
  meta: { corners: [number, number][]; builtAt: string; source: string; rules: Record<string, number>; spacingM: number };
  ditches: Ditch[];
  candidates: Candidate[];
  sites: Site[];
  land: NonNullable<MapFeatures["land"]>;
  rivers: NonNullable<MapFeatures["rivers"]>;
  roads: MapFeatures["roads"];
  footprints: XY[][];
  parcels: Parcel[];
};
const data = raw as unknown as RealData;

export const DATA_META = data.meta;
// "Rów Pruski Rów" -> "Pruski Rów": BDOT names often already contain the type
const cleanName = (n: string) =>
  /^Rów [0-9A-Fa-f]{6}$/.test(n)
    ? `Rów bez nazwy · ${n.slice(4).toUpperCase()}`
    : n.replace(/^Rów (?=(Rów|Kanał|Struga|Strumień|Potok)\b)/i, "").replace(/^Rów (.+ Rów)$/i, "$1");
export const ditches: Ditch[] = data.ditches.map((d) => ({ ...d, name: cleanName(d.name) }));
export const candidates: Candidate[] = data.candidates;
export const sites: Site[] = data.sites.map((s) => ({ ...s, name: cleanName(s.name) }));

/** Featured site for the demo script: 60 cm refused because water spills onto the neighbour's parcel. */
export const FEATURED_SITE_ID = "S-007";

const W = 1000;
const H = 640;

export const mapFeatures: MapFeatures = {
  width: W,
  height: H,
  elevationBands: [],
  contours: [],
  lake: [],
  floodZone: [],
  roads: data.roads,
  buildings: data.footprints.map((f, i) => {
    const xs = f.map((p) => p[0]);
    const ys = f.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    return { id: `B${i}`, xy: [(x0 + x1) / 2, (y0 + y1) / 2] as XY, w: x1 - x0, h: y1 - y0 };
  }),
  parcels: data.parcels,
  land: data.land,
  rivers: data.rivers,
  footprints: data.footprints,
};

/** Map units -> WGS84 by bilinear interpolation of the AOI corners (NW, NE, SW, SE). */
export function toLatLon([x, y]: XY) {
  const [nw, ne, sw, se] = data.meta.corners;
  const fx = x / W;
  const fy = y / H;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const top = [lerp(nw[0], ne[0], fx), lerp(nw[1], ne[1], fx)];
  const bot = [lerp(sw[0], se[0], fx), lerp(sw[1], se[1], fx)];
  return { lat: Math.round(lerp(top[0], bot[0], fy) * 1e5) / 1e5, lon: Math.round(lerp(top[1], bot[1], fy) * 1e5) / 1e5 };
}

/** Ground height (NMT) at the nearest analysed point, m a.s.l. */
const withElev = candidates.filter((c) => c.elev != null);
export function elevationAt([x, y]: XY) {
  let best = withElev[0];
  let bd = Infinity;
  for (const c of withElev) {
    const d = (c.xy[0] - x) ** 2 + (c.xy[1] - y) ** 2;
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best?.elev ?? 60;
}

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
const roundTo = (v: number, step: number) => Math.round(v / step) * step;
export const summary: Summary = {
  pointsAnalysed: candidates.length,
  sitesAccepted: sites.length,
  refusalsByCode,
  totalStorageM3: [
    roundTo(sites.reduce((t, s) => t + (atMax(s)?.storageM3[0] ?? 0), 0), 100),
    roundTo(sites.reduce((t, s) => t + (atMax(s)?.storageM3[1] ?? 0), 0), 100),
  ],
  totalRehydratedHa: [
    Math.round(sites.reduce((t, s) => t + (atMax(s)?.rehydratedHa[0] ?? 0), 0)),
    Math.round(sites.reduce((t, s) => t + (atMax(s)?.rehydratedHa[1] ?? 0), 0)),
  ],
};

export function getSite(id: string) {
  return sites.find((s) => s.id === id);
}
