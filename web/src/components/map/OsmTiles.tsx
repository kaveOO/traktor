"use client";

import type { SyntheticEvent } from "react";
import { DATA_META } from "@/lib/traktor";

/**
 * Live raster tiles (Web Mercator XYZ) under the TRAKTOR map.
 * Our map space is EPSG:2180 (1 unit = 10 m, 1000 x 640). Over a 10 km AOI the transform from
 * Web Mercator pixels to that space is affine to within a few metres, so we fit one matrix per zoom
 * from the AOI corners and draw tiles inside a transformed <g>. Only tiles in view are rendered.
 */
const W = 1000;
const H = 640;

function merc(lat: number, lon: number, z: number): [number, number] {
  const n = 256 * 2 ** z;
  const r = (lat * Math.PI) / 180;
  return [((lon + 180) / 360) * n, ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n];
}

/** Affine map from mercator pixels (zoom z) to map units, fitted on NW, NE, SW corners. */
function fit(z: number) {
  const [nw, ne, sw, se] = DATA_META.corners; // [lat, lon]
  const P0 = merc(nw[0], nw[1], z);
  const P1 = merc(ne[0], ne[1], z);
  const P2 = merc(sw[0], sw[1], z);
  const P3 = merc(se[0], se[1], z);
  // map units: NW=(0,0), NE=(W,0), SW=(0,H). Solve M * [P-P0] = Q.
  const ux = [P1[0] - P0[0], P1[1] - P0[1]];
  const uy = [P2[0] - P0[0], P2[1] - P0[1]];
  const det = ux[0] * uy[1] - ux[1] * uy[0];
  const i00 = uy[1] / det, i01 = -uy[0] / det, i10 = -ux[1] / det, i11 = ux[0] / det;
  const a = W * i00, c = W * i01, b = H * i10, d = H * i11;
  const e = -(a * P0[0] + c * P0[1]);
  const f = -(b * P0[0] + d * P0[1]);
  const xs = [P0[0], P1[0], P2[0], P3[0]];
  const ys = [P0[1], P1[1], P2[1], P3[1]];
  // zoomed out, the view may extend ~1 AOI past the edge: pad the tile range by one AOI size
  const padX = (Math.max(...xs) - Math.min(...xs)) / 256;
  const padY = (Math.max(...ys) - Math.min(...ys)) / 256;
  return {
    m: [a, b, c, d, e, f] as const,
    matrix: `matrix(${a} ${b} ${c} ${d} ${e} ${f})`,
    tx0: Math.floor(Math.min(...xs) / 256 - padX),
    tx1: Math.floor(Math.max(...xs) / 256 + padX),
    ty0: Math.floor(Math.min(...ys) / 256 - padY),
    ty1: Math.floor(Math.max(...ys) / 256 + padY),
  };
}

const MIN_Z = 14;
const MAX_Z = 18;
type Level = ReturnType<typeof fit>;
const LEVELS: Record<number, Level> = Object.fromEntries(
  Array.from({ length: MAX_Z - MIN_Z + 1 }, (_, i) => [MIN_Z + i, fit(MIN_Z + i)]),
);
// ground metres per tile pixel at zoom 0 at the AOI latitude
const M_PER_PX_Z0 = 156543.03392 * Math.cos((DATA_META.corners[0][0] * Math.PI) / 180);

export type TileSource = "gugik-orto" | "s2-cloudless" | "osm";

/**
 * GUGiK ORTOFOTOMAPA, WMTS StandardResolution, TileMatrixSet "EPSG:3857" (GoogleMapsCompatible
 * grid: top-left origin, 256 px, identifiers "EPSG:3857:{z}", levels 0-19). Free, no key, CORS *.
 */
const GUGIK =
  "https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTOFOTOMAPA&STYLE=default&TILEMATRIXSET=EPSG:3857&FORMAT=image/jpeg";

const TILE_URL: Record<TileSource, (z: number, x: number, y: number) => string> = {
  "gugik-orto": (z, x, y) => `${GUGIK}&TILEMATRIX=EPSG:3857:${z}&TILEROW=${y}&TILECOL=${x}`,
  // EOX Sentinel-2 cloudless 2016 (CC BY 4.0; later years are CC BY-NC-SA 4.0)
  "s2-cloudless": (z, x, y) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/${z}/${y}/${x}.jpg`,
  osm: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
};

/** Imagery sources: dark tint, cream-haloed ditches. */
export const IMAGERY: ReadonlySet<TileSource> = new Set(["gugik-orto", "s2-cloudless"]);

// a failed tile stays hidden instead of showing a broken-image box
const hideOnError = (e: SyntheticEvent<SVGImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};

type VB = { x: number; y: number; w: number; h: number };

function visible(z: number, vb: VB) {
  const g = LEVELS[z];
  const [a, b, c, d, e, f] = g.m;
  const tiles: { x: number; y: number }[] = [];
  const pad = vb.w * 0.1;
  const half = Math.hypot(a, b) * 256 * 0.75; // ~tile half-diagonal in map units
  for (let x = g.tx0; x <= g.tx1; x++)
    for (let y = g.ty0; y <= g.ty1; y++) {
      const cx = (x + 0.5) * 256, cy = (y + 0.5) * 256;
      const mx = a * cx + c * cy + e, my = b * cx + d * cy + f; // tile centre in map units
      if (mx + half < vb.x - pad || mx - half > vb.x + vb.w + pad || my + half < vb.y - pad || my - half > vb.y + vb.h + pad) continue;
      tiles.push({ x, y });
    }
  return tiles;
}

function Layer({ z, vb, source }: { z: number; vb: VB; source: TileSource }) {
  return (
    <g transform={LEVELS[z].matrix}>
      {visible(z, vb).map(({ x, y }) => (
        <image
          key={`${source}/${z}/${x}/${y}`}
          href={TILE_URL[source](z, x, y)}
          x={x * 256}
          y={y * 256}
          width={256.6}
          height={256.6}
          preserveAspectRatio="none"
          onError={hideOnError}
        />
      ))}
    </g>
  );
}

/**
 * @param scale screen px per map unit; picks the zoom with ~1 tile px per screen px (z14-18).
 */
export function OsmTiles({ vb, scale, source = "gugik-orto" }: { vb: VB; scale?: number; source?: TileSource }) {
  const pxPerUnit = scale ?? 1500 / vb.w;
  const want = Math.log2((M_PER_PX_Z0 * pxPerUnit) / 10) + 0.3; // slight bias to the sharper level
  const z = Math.min(MAX_Z, Math.max(MIN_Z, Math.round(want)));
  return (
    <>
      {/* coarse layer underneath so zooming in never flashes blank while sharper tiles load */}
      {z >= MIN_Z + 2 && <Layer z={MIN_Z} vb={vb} source={source} />}
      <Layer z={z} vb={vb} source={source} />
    </>
  );
}
