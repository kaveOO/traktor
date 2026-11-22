import type { Ditch, OrderAction, Parcel, Site, XY } from "@/lib/traktor";
import { elevationAt, mapFeatures } from "@/lib/traktor";

export const pts = (p: XY[]) => p.map(([x, y]) => `${x},${y}`).join(" ");

export const path = (p: XY[]) => p.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

export function centroid(p: XY[]): XY {
  const n = p.length || 1;
  return [p.reduce((s, q) => s + q[0], 0) / n, p.reduce((s, q) => s + q[1], 0) / n];
}

export const ELEV: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#2F5F73",
  2: "#8FA86A",
  3: "#C9BF86",
  4: "#B98D5F",
  5: "#EFE6D3",
};

export const C = {
  forest: "#1F3A22",
  cream: "#F3ECDD",
  creamDeep: "#EFE6D3",
  agri: "#4F7A3A",
  soil: "#6B4A2E",
  sky: "#A9BFCF",
  water: "#3B7FA3",
  terra: "#B5573B",
  terraInk: "#984630", // small text only
  grey: "#76746A", // ≥3:1 on cream (UI ring, WCAG 1.4.11)
};

export const ORDER_COLOR: Record<OrderAction, string> = {
  TRZYMAJ: C.forest,
  OTWORZ: C.water,
  NIE_RUSZAJ: C.grey,
};

/** Shape cues so the order never relies on ring colour alone (WCAG 1.4.1). */
export const ORDER_LETTER: Record<OrderAction, string> = { TRZYMAJ: "T", OTWORZ: "O", NIE_RUSZAJ: "N" };
/** strokeDasharray in px of the legend sample; the map scales it by 1/scale. */
export const ORDER_DASH: Record<OrderAction, string | undefined> = { TRZYMAJ: undefined, OTWORZ: "3 2", NIE_RUSZAJ: "1 2" };

/** Polyline along the ditch from the weir towards higher ground, `len` map units long. */
export function retentionPath(ditch: Ditch, xy: XY, len: number): XY[] {
  const p = ditch.points;
  let best = 0;
  let bd = Infinity;
  p.forEach((q, i) => {
    const d = Math.hypot(q[0] - xy[0], q[1] - xy[1]);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  const dir = elevationAt(p[0]) >= elevationAt(p[p.length - 1]) ? -1 : 1;
  const out: XY[] = [xy];
  let acc = 0;
  let prev = xy;
  for (let i = best + (dir < 0 ? 0 : 1); i >= 0 && i < p.length; i += dir) {
    const q = p[i];
    const seg = Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    if (acc + seg >= len) {
      const t = (len - acc) / (seg || 1);
      out.push([prev[0] + (q[0] - prev[0]) * t, prev[1] + (q[1] - prev[1]) * t]);
      return out;
    }
    acc += seg;
    out.push(q);
    prev = q;
  }
  return out;
}

export function ownParcel(site: Site): Parcel | undefined {
  return mapFeatures.parcels.find((p) => p.id === site.ownParcels[0]);
}

export function neighbourParcel(site: Site, objectRef?: string): Parcel | undefined {
  if (site.neighbourParcel) {
    const hit = mapFeatures.parcels.find((p) => p.id === site.neighbourParcel);
    if (hit) return hit;
  }
  if (objectRef) {
    const hit = mapFeatures.parcels.find((p) => p.id === objectRef);
    if (hit) return hit;
  }
  const i = mapFeatures.parcels.findIndex((p) => p.id === site.ownParcels[0]);
  return i >= 0 ? mapFeatures.parcels[i + 1] : undefined;
}

export const shortParcel = (id: string) => id.split(".").pop() ?? id;
