"use client";

import { DATA_META } from "@/lib/traktor";

/**
 * Real OpenStreetMap raster tiles under the TRAKTOR map.
 * Our map space is EPSG:2180 (1 unit = 10 m, 1000 x 640). Over a 10 km AOI the transform from
 * Web Mercator pixels to that space is affine to within a few metres, so we fit one matrix from
 * the AOI corners and draw tiles inside a transformed <g>. Tiles load live from tile.openstreetmap.org.
 */
const W = 1000;
const H = 640;

function merc(lat: number, lon: number, z: number): [number, number] {
  const n = 256 * 2 ** z;
  const r = (lat * Math.PI) / 180;
  return [((lon + 180) / 360) * n, ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n];
}

/** Affine map from mercator pixels (zoom z) to map units, fitted on NW, NE, SW corners; SE checks it. */
function fit(z: number) {
  const [nw, ne, sw] = DATA_META.corners; // [lat, lon]
  const P0 = merc(nw[0], nw[1], z);
  const P1 = merc(ne[0], ne[1], z);
  const P2 = merc(sw[0], sw[1], z);
  // map units: NW=(0,0), NE=(W,0), SW=(0,H). Solve M * [P-P0] = Q.
  const ux = [P1[0] - P0[0], P1[1] - P0[1]];
  const uy = [P2[0] - P0[0], P2[1] - P0[1]];
  const det = ux[0] * uy[1] - ux[1] * uy[0];
  // inverse of [[ux0, uy0],[ux1, uy1]]
  const i00 = uy[1] / det, i01 = -uy[0] / det, i10 = -ux[1] / det, i11 = ux[0] / det;
  // M = [[W,0],[0,H]] * inverse
  const a = W * i00, c = W * i01, b = H * i10, d = H * i11;
  const e = -(a * P0[0] + c * P0[1]);
  const f = -(b * P0[0] + d * P0[1]);
  const xs = [P0[0], P1[0], P2[0], merc(DATA_META.corners[3][0], DATA_META.corners[3][1], z)[0]];
  const ys = [P0[1], P1[1], P2[1], merc(DATA_META.corners[3][0], DATA_META.corners[3][1], z)[1]];
  return {
    m: [a, b, c, d, e, f] as const,
    matrix: `matrix(${a} ${b} ${c} ${d} ${e} ${f})`,
    tx0: Math.floor(Math.min(...xs) / 256) - 1,
    tx1: Math.floor(Math.max(...xs) / 256) + 1,
    ty0: Math.floor(Math.min(...ys) / 256) - 1,
    ty1: Math.floor(Math.max(...ys) / 256) + 1,
  };
}

const LEVELS = { 14: fit(14), 15: fit(15), 16: fit(16), 17: fit(17) } as const;

/** View box in map units -> pick zoom (~1 tile px per screen px) and only the visible tiles. */
export type TileSource = "osm" | "google-roadmap" | "google-satellite";
const TILE_URL: Record<TileSource, (z: number, x: number, y: number) => string> = {
  osm: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  "google-roadmap": (z, x, y) => `/api/tiles/google/roadmap/${z}/${x}/${y}`,
  "google-satellite": (z, x, y) => `/api/tiles/google/satellite/${z}/${x}/${y}`,
};

export function OsmTiles({ vb, source = "osm" }: { vb: { x: number; y: number; w: number; h: number }; source?: TileSource }) {
  const z = vb.w > 700 ? 14 : vb.w > 350 ? 15 : vb.w > 170 ? 16 : 17;
  const g = LEVELS[z];
  const [a, b, c, d, e, f] = g.m;
  const tiles: { x: number; y: number }[] = [];
  const pad = vb.w * 0.15;
  for (let x = g.tx0; x <= g.tx1; x++)
    for (let y = g.ty0; y <= g.ty1; y++) {
      const cx = (x + 0.5) * 256, cy = (y + 0.5) * 256;
      const mx = a * cx + c * cy + e, my = b * cx + d * cy + f; // tile centre in map units
      const half = Math.abs(a) * 256; // tile half-diagonal-ish in map units
      if (mx + half < vb.x - pad || mx - half > vb.x + vb.w + pad || my + half < vb.y - pad || my - half > vb.y + vb.h + pad) continue;
      tiles.push({ x, y });
    }
  return (
    <g transform={g.matrix}>
      {tiles.map(({ x, y }) => (
        <image
          key={`${source}/${z}/${x}/${y}`}
          href={TILE_URL[source](z, x, y)}
          x={x * 256}
          y={y * 256}
          width={256.6}
          height={256.6}
          preserveAspectRatio="none"
        />
      ))}
    </g>
  );
}
