import type { LonLat } from "./types";

/**
 * EPSG:2180 (PUWG 1992) <-> WGS84 without proj4.
 * Transverse Mercator on GRS80, lon0 = 19°, k0 = 0.9993, FE = 500000, FN = -5300000.
 * Snyder (1987) series, accuracy well under 1 m inside Poland.
 * XY = [easting, northing].
 */
export type XY = [number, number];

const A = 6378137;
const F = 1 / 298.257222101;
const E2 = 2 * F - F * F;
const EP2 = E2 / (1 - E2);
const K0 = 0.9993;
const LON0 = (19 * Math.PI) / 180;
const FE = 500000;
const FN = -5300000;
const E4 = E2 * E2;
const E6 = E4 * E2;
const M1 = 1 - E2 / 4 - (3 * E4) / 64 - (5 * E6) / 256;
const M2 = (3 * E2) / 8 + (3 * E4) / 32 + (45 * E6) / 1024;
const M3 = (15 * E4) / 256 + (45 * E6) / 1024;
const M4 = (35 * E6) / 3072;
const meridian = (phi: number) => A * (M1 * phi - M2 * Math.sin(2 * phi) + M3 * Math.sin(4 * phi) - M4 * Math.sin(6 * phi));

export function to2180([lon, lat]: LonLat): XY {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const t = Math.tan(phi);
  const N = A / Math.sqrt(1 - E2 * s * s);
  const T = t * t;
  const C = EP2 * c * c;
  const Aa = (lam - LON0) * c;
  const x =
    K0 * N * (Aa + ((1 - T + C) * Aa ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * EP2) * Aa ** 5) / 120);
  const y =
    K0 *
    (meridian(phi) +
      N * t * ((Aa * Aa) / 2 + ((5 - T + 9 * C + 4 * C * C) * Aa ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * EP2) * Aa ** 6) / 720));
  return [FE + x, FN + y];
}

export function from2180([e, n]: XY): LonLat {
  const x = e - FE;
  const M = (n - FN) / K0;
  const mu = M / (A * M1);
  const se = Math.sqrt(1 - E2);
  const e1 = (1 - se) / (1 + se);
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const s = Math.sin(phi1);
  const c = Math.cos(phi1);
  const t = Math.tan(phi1);
  const C1 = EP2 * c * c;
  const T1 = t * t;
  const N1 = A / Math.sqrt(1 - E2 * s * s);
  const R1 = (A * (1 - E2)) / Math.pow(1 - E2 * s * s, 1.5);
  const D = x / (N1 * K0);
  const phi =
    phi1 -
    ((N1 * t) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * D ** 6) / 720);
  const lam =
    LON0 +
    (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * D ** 5) / 120) / c;
  return [(lam * 180) / Math.PI, (phi * 180) / Math.PI];
}

/** Rings of a Polygon or MultiPolygon as a flat list of polygons (each = rings, first = outer). */
export type Rings = number[][][];
export function polygonsOf(geom: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] }): Rings[] {
  return geom.type === "Polygon" ? [geom.coordinates as Rings] : (geom.coordinates as Rings[]);
}

function ringArea(r: number[][]): number {
  let s = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return s / 2;
}

/** Local scale factor of TM at easting e (used to correct projected area). */
const scaleAt = (e: number) => {
  const d = (e - FE) / (K0 * 6381000);
  return K0 * (1 + (d * d) / 2);
};

/** Projected polygons (EPSG:2180) from WGS84 polygons. */
export const project = (polys: Rings[]): Rings[] => polys.map((p) => p.map((r) => r.map((pt) => to2180([pt[0], pt[1]]))));

/** Area in hectares of WGS84 polygons. */
export function areaHa(polys: Rings[]): number {
  let m2 = 0;
  for (const p of project(polys)) {
    p.forEach((r, i) => {
      const a = Math.abs(ringArea(r));
      const k = scaleAt(r[0][0]);
      m2 += (i === 0 ? a : -a) / (k * k);
    });
  }
  return m2 / 10000;
}

/** Area-weighted centroid of WGS84 polygons (outer rings), falls back to vertex mean. */
export function centroid(polys: Rings[]): LonLat {
  let sx = 0;
  let sy = 0;
  let sa = 0;
  for (const p of project(polys)) {
    const r = p[0];
    // per part, sign-normalised: parts with opposite ring orientation must not cancel each other
    let px = 0, py = 0, pa = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
      px += (r[j][0] + r[i][0]) * f;
      py += (r[j][1] + r[i][1]) * f;
      pa += f;
    }
    const s = pa < 0 ? -1 : 1;
    sx += s * px;
    sy += s * py;
    sa += s * pa;
  }
  if (Math.abs(sa) < 1e-9) {
    const pts = polys.flatMap((p) => p[0]);
    return [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
  }
  const c = from2180([sx / (3 * sa), sy / (3 * sa)]);
  return c;
}

export function inRing(p: number[], r: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point-in-polygon for polygons in the same CRS as p (holes respected). */
export function inPolys(p: number[], polys: Rings[]): boolean {
  return polys.some((poly) => inRing(p, poly[0]) && !poly.slice(1).some((h) => inRing(p, h)));
}

export type GridPoint = { xy: XY; i: number; j: number };

/**
 * Regular grid inside projected (EPSG:2180) polygons, at most ~maxPoints points.
 * Returns the grid plus its spacing (m). Tiny or thin parcels fall back to vertices + centroid.
 */
export function sampleGrid(polys2180: Rings[], maxPoints = 64): { points: GridPoint[]; spacing: number } {
  const all = polys2180.flatMap((p) => p[0]);
  const xs = all.map((q) => q[0]);
  const ys = all.map((q) => q[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let area = 0;
  for (const p of polys2180) area += Math.abs(ringArea(p[0]));
  let spacing = Math.max(5, Math.sqrt(area / maxPoints));
  let points: GridPoint[] = [];
  for (let tries = 0; tries < 4; tries++) {
    points = [];
    for (let i = 0, x = x0 + spacing / 2; x < x1; i++, x += spacing)
      for (let j = 0, y = y0 + spacing / 2; y < y1; j++, y += spacing)
        if (inPolys([x, y], polys2180)) points.push({ xy: [x, y], i, j });
    if (points.length > maxPoints * 1.3) spacing *= 1.15;
    else if (points.length < Math.min(16, maxPoints / 3) && spacing > 5) spacing = Math.max(5, spacing * 0.7);
    else break;
  }
  if (points.length < 6) {
    // thin strip: use outer vertices too (no grid neighbours)
    const extra = all.slice(0, 40).map((q, k) => ({ xy: [q[0], q[1]] as XY, i: -1000 - k, j: -1000 - k }));
    points = [...points, ...extra];
  }
  return { points: points.slice(0, Math.round(maxPoints * 1.3)), spacing };
}

/** Distance (m) from point to segment in projected coords. */
export function distPointSeg(p: number[], a: number[], b: number[]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Minimum distance (m) from a projected polyline to projected polygons (0 if it touches/enters). */
export function distLineToPolys(line: number[][], polys: Rings[]): number {
  let best = Infinity;
  for (const v of line) if (inPolys(v, polys)) return 0;
  for (const poly of polys) {
    const r = poly[0];
    for (let i = 0; i < r.length - 1; i++) {
      for (const v of line) best = Math.min(best, distPointSeg(v, r[i], r[i + 1]));
    }
    for (let k = 0; k < line.length - 1; k++) for (const v of r) best = Math.min(best, distPointSeg(v, line[k], line[k + 1]));
  }
  return best;
}

/** Poland bbox (WGS84) with a small margin. */
export const inPoland = ([lon, lat]: LonLat) => lon >= 14.0 && lon <= 24.2 && lat >= 49.0 && lat <= 54.9;
