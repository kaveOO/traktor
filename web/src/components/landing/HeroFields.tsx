/**
 * "Fields from above" (brand §05): long narrow strip fields at the angle they lie, hairline boundaries,
 * palette colours, ONE straight water-blue ditch, ONE cream tick = the board. Flat colour only.
 *
 * Server component, deterministic (no Math.random, no window): same parcels in -> same SVG out, so it is
 * SSR-safe and every site can get its own pattern from its own parcels. Strip widths, strip lengths and the
 * angle are measured from the real parcel polygons (oriented extents along each parcel's long axis); the
 * blocks are then tiled so the frame is always fully covered.
 *
 * Motion (brand §10), CSS only and only under `prefers-reduced-motion: no-preference`:
 * a slow 12 s ease-in-out pan on load + a scroll-linked drift (scroll-driven animation where supported).
 * Total scale stays <= 1.15; otherwise the pattern is static.
 *
 * Prop API mirrors the shared `<FieldPattern parcels? angle tone drift />` (lane 2) so it can be swapped later.
 */

export type PatternParcel = { points: [number, number][] };

type Tone = "forest" | "color";

const VB_W = 1600;
const VB_H = 900;

/** Palette only (§03): forest, agri, soil, elevation tints, cream deep. Weights = rough share of strips. */
const PALETTE: Record<Tone, { ground: string; line: string; lineOpacity: number; fills: [string, number][] }> = {
  forest: {
    ground: "#1F3A22",
    line: "#F3ECDD",
    lineOpacity: 0.22,
    fills: [
      ["#1F3A22", 5],
      ["#4F7A3A", 3],
      ["#6B4A2E", 2],
    ],
  },
  color: {
    ground: "#4F7A3A",
    line: "#1F3A22",
    lineOpacity: 0.35,
    fills: [
      ["#4F7A3A", 3],
      ["#8FA86A", 3],
      ["#C9BF86", 2],
      ["#B98D5F", 2],
      ["#6B4A2E", 1],
      ["#EFE6D3", 1],
    ],
  },
};

/** Fallback shape statistics (metres) if no parcels are given: typical Polish strip fields. */
const DEFAULT_WIDTHS = [18, 24, 14, 32, 20, 46, 16, 28, 22, 60, 19, 35];
const DEFAULT_LENGTHS = [420, 360, 520, 300, 610, 450];
const DEFAULT_ANGLE = -12;

/** Small deterministic hash -> [0, 1). */
function hash(a: number, b: number, seed: number) {
  let h = (a * 374761393 + b * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Long-axis angle (deg) and oriented extents (m) of one polygon, from the vertex covariance. */
function measure(points: [number, number][]) {
  const n = points.length;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of points) {
    cx += x / n;
    cy += y / n;
  }
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of points) {
    sxx += (x - cx) ** 2;
    syy += (y - cy) ** 2;
    sxy += (x - cx) * (y - cy);
  }
  const a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  let u0 = Infinity;
  let u1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  for (const [x, y] of points) {
    const u = (x - cx) * ux + (y - cy) * uy;
    const v = -(x - cx) * uy + (y - cy) * ux;
    u0 = Math.min(u0, u);
    u1 = Math.max(u1, u);
    v0 = Math.min(v0, v);
    v1 = Math.max(v1, v);
  }
  return { angle: (a * 180) / Math.PI, length: u1 - u0, width: v1 - v0 };
}

/** Strip statistics from real parcels: elongated ones only (length >= 2.5 x width). */
export function stripStats(parcels: PatternParcel[] | undefined) {
  const strips = (parcels ?? [])
    .filter((p) => p.points.length >= 4)
    .map((p) => measure(p.points))
    .filter((m) => m.width >= 6 && m.length >= 2.5 * m.width);
  if (strips.length < 4) return { widths: DEFAULT_WIDTHS, lengths: DEFAULT_LENGTHS, angle: DEFAULT_ANGLE, n: 0 };
  // dominant direction: circular mean of the doubled angle, weighted by elongation
  let c = 0;
  let s = 0;
  for (const m of strips) {
    const w = m.length / m.width;
    c += w * Math.cos((2 * m.angle * Math.PI) / 180);
    s += w * Math.sin((2 * m.angle * Math.PI) / 180);
  }
  const angle = ((0.5 * Math.atan2(s, c)) * 180) / Math.PI;
  return {
    widths: strips.map((m) => Math.min(m.width, 120)),
    lengths: strips.map((m) => Math.min(Math.max(m.length, 200), 900)),
    angle,
    n: strips.length,
  };
}

export function HeroFields({
  parcels,
  angle,
  tone = "forest",
  drift = false,
  focus = [0.55, 0.55],
  seed = 7,
  className = "",
}: {
  /** Parcel polygons in metres (any planar CRS, y down). Their shapes set strip widths, lengths and angle. */
  parcels?: PatternParcel[];
  /** Strip direction in degrees (overrides the angle measured from parcels). */
  angle?: number;
  tone?: Tone;
  /** Slow pan + scroll drift. Ignored under prefers-reduced-motion. */
  drift?: boolean;
  /** Where the ditch and board sit, as a fraction of the frame [x, y]. */
  focus?: [number, number];
  seed?: number;
  className?: string;
}) {
  const stats = stripStats(parcels);
  const deg = angle ?? stats.angle;
  const pal = PALETTE[tone];
  const bag = pal.fills.flatMap(([c, w]) => Array<string>(w).fill(c));

  // scale: median real strip width -> ~22 px in the 1600 x 900 frame
  const sorted = [...stats.widths].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 20;
  const pxPerM = Math.min(1.6, Math.max(0.7, 22 / median));

  // tile a square that covers the rotated frame (+ overscan for the drift)
  const R = Math.hypot(VB_W, VB_H) / 2 + 40;
  const cx = VB_W / 2;
  const cy = VB_H / 2;

  // focus point in the strip frame (u along strips, v across)
  const rad = (deg * Math.PI) / 180;
  const fx = focus[0] * VB_W - cx;
  const fy = focus[1] * VB_H - cy;
  const fu = fx * Math.cos(rad) + fy * Math.sin(rad);
  const fv = -fx * Math.sin(rad) + fy * Math.cos(rad);

  const rects: { x: number; y: number; w: number; h: number; fill: string }[] = [];
  const headlands: number[] = [];
  const edges: string[] = [];
  const r1 = (n: number) => Math.round(n * 10) / 10;
  let u = -R;
  for (let b = 0; u < R; b++) {
    const len = stats.lengths[(b * 5 + seed) % stats.lengths.length] * pxPerM;
    const uEnd = Math.min(u + len, R);
    headlands.push(uEnd);
    // each block starts its strips at its own offset, so strip edges don't line up across headlands
    let v = -R - hash(b, 0, seed) * 40;
    for (let i = 0; v < R; i++) {
      const w = Math.max(5, stats.widths[(i + b * 11 + seed) % stats.widths.length] * pxPerM);
      const fill = bag[Math.floor(hash(b, i + 1, seed) * bag.length)];
      if (fill !== pal.ground) rects.push({ x: u, y: v, w: uEnd - u, h: w, fill });
      edges.push(`M${r1(u)} ${r1(v)}h${r1(uEnd - u)}`);
      v += w;
    }
    u = uEnd;
  }

  // the one ditch runs along the headland nearest the focus, straight across the strips
  const ditchU = headlands.reduce((best, h) => (Math.abs(h - fu) < Math.abs(best - fu) ? h : best), headlands[0]);

  const svg = (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      className="block h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={VB_W} height={VB_H} fill={pal.ground} />
      <g transform={`translate(${cx} ${cy}) rotate(${r1(deg)})`}>
        {rects.map((r, i) => (
          <rect key={i} x={r1(r.x)} y={r1(r.y)} width={r1(r.w)} height={r1(r.h)} fill={r.fill} />
        ))}
        {/* hairline field boundaries: one path for all strips */}
        <path
          d={edges.join("") + headlands.map((h) => `M${r1(h)} ${r1(-R)}V${r1(R)}`).join("")}
          stroke={pal.line}
          strokeOpacity={pal.lineOpacity}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
        {/* one ditch, drawn straight */}
        <path d={`M${r1(ditchU)} ${r1(-R)}V${r1(R)}`} stroke="#3B7FA3" strokeWidth="5" fill="none" />
        {/* the board: one cream tick across the ditch */}
        <rect x={r1(ditchU - 13)} y={r1(fv - 3)} width="26" height="6" fill="#F3ECDD" />
      </g>
    </svg>
  );

  if (!drift) return <div className={`relative overflow-hidden ${className}`}>{svg}</div>;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <style href="traktor-hero-fields" precedence="default">{`
@media (prefers-reduced-motion: no-preference) {
  .hf-pan { animation: hf-pan 12s cubic-bezier(.45,0,.55,1) both; }
  @supports (animation-timeline: scroll()) {
    .hf-scroll { animation: hf-scroll linear both; animation-timeline: scroll(root); animation-range: 0 100vh; }
  }
}
@keyframes hf-pan { from { transform: translate3d(-2.5%, 1.2%, 0) scale(1.1); } to { transform: translate3d(0, 0, 0) scale(1.06); } }
@keyframes hf-scroll { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-3%, 4%, 0) scale(1.08); } }
`}</style>
      {/* overscan so the drift never shows an edge */}
      <div className="hf-scroll absolute -inset-[6%] will-change-transform">
        <div className="hf-pan h-full w-full">{svg}</div>
      </div>
    </div>
  );
}
