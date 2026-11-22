/**
 * Field pattern, Guidelines 1.0 §05 "Fields from above": the main brand image.
 * Long narrow strip fields at the angle they lie, hairline boundaries, palette colours only,
 * exactly ONE straight water-blue ditch crossing the strips and ONE cream tick (the board) on it.
 * Flat colour only: no texture, gradient, shading or 3D.
 *
 * Pure SVG, deterministic for a given `seed` (same markup on server and client), aria-hidden.
 * Server component: drift is CSS only (`.field-drift-*` in globals.css), off under prefers-reduced-motion.
 *
 * Coordinates: a 1000 × 1000 local frame (the SVG uses `slice`, so it fills any box).
 * Pass real parcel shapes via `parcels` (polygons in that frame) and optionally the `ditch` segment.
 */

type Pt = readonly [number, number];
export type FieldTone = "forest" | "color";

/* Palette colours only (SPEC §03 + elevation tints). Terracotta never decorates, so it is not here. */
const TONES: Record<FieldTone, { ground: string; fills: readonly string[]; weights: readonly number[]; line: string; lineOpacity: number }> = {
  // dark pattern: forest field, greens, soil and low elevation tint; cream hairlines
  forest: {
    ground: "#1F3A22",
    fills: ["#1F3A22", "#4F7A3A", "#2F5F73", "#6B4A2E", "#8FA86A"],
    weights: [5, 3, 1.2, 1.2, 0.6],
    line: "#F3ECDD",
    lineOpacity: 0.22,
  },
  // colour pattern: cream ground, elevation tints, agri green, soil; forest hairlines
  color: {
    ground: "#F3ECDD",
    fills: ["#EFE6D3", "#F3ECDD", "#C9BF86", "#8FA86A", "#B98D5F", "#4F7A3A", "#6B4A2E", "#A9BFCF"],
    weights: [3, 2, 2.4, 2.4, 1.4, 1.2, 0.5, 0.4],
    line: "#1F3A22",
    lineOpacity: 0.28,
  },
};

const WATER = "#3B7FA3";
const CREAM = "#F3ECDD";

/** mulberry32: small deterministic PRNG */
function prng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pts = (p: readonly Pt[]) => p.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ");

function pick(rand: () => number, fills: readonly string[], weights: readonly number[], avoid?: string) {
  const total = weights.reduce((a, b) => a + b, 0);
  for (let tries = 0; tries < 4; tries++) {
    let x = rand() * total;
    for (let i = 0; i < fills.length; i++) {
      x -= weights[i];
      if (x <= 0) {
        if (fills[i] !== avoid) return fills[i];
        break;
      }
    }
  }
  return fills.find((f) => f !== avoid) ?? fills[0];
}

/**
 * Generated strip fields in the unrotated frame: strips run along y (long), boundaries are almost
 * parallel lines across x (narrow strips), each strip is broken into 1–3 parcels along its length.
 * The frame is oversized so the pattern still fills the box after rotation and drift (scale ≤ 1.15).
 */
function stripParcels(rand: () => number) {
  const X0 = -760, X1 = 1760, Y0 = -760, Y1 = 1760;
  // boundary lines: x at top and bottom (slight wedge, like real strips)
  const lines: { t: number; b: number }[] = [];
  let x = X0;
  let skew = 0;
  while (x < X1) {
    skew += (rand() - 0.5) * 6;
    skew = Math.max(-28, Math.min(28, skew));
    lines.push({ t: x, b: x + skew });
    // mostly narrow strips, an occasional wider field
    const w = rand() < 0.12 ? 60 + rand() * 70 : 12 + rand() * 30;
    x += w;
  }
  // field roads: two transverse breaks that strips share loosely
  const roads = [Y0 + (Y1 - Y0) * (0.3 + rand() * 0.1), Y0 + (Y1 - Y0) * (0.62 + rand() * 0.1)];
  const at = (l: { t: number; b: number }, y: number) => l.t + ((l.b - l.t) * (y - Y0)) / (Y1 - Y0);

  const polys: Pt[][] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const L = lines[i];
    const R = lines[i + 1];
    const cuts = [Y0];
    for (const r of roads) if (rand() < 0.8) cuts.push(r + (rand() - 0.5) * 60);
    if (rand() < 0.25) cuts.push(Y0 + rand() * (Y1 - Y0));
    cuts.push(Y1);
    cuts.sort((a, b) => a - b);
    for (let k = 0; k < cuts.length - 1; k++) {
      const ya = cuts[k];
      const yb = cuts[k + 1];
      if (yb - ya < 40) continue;
      polys.push([
        [at(L, ya), ya],
        [at(R, ya), ya],
        [at(R, yb), yb],
        [at(L, yb), yb],
      ]);
    }
  }
  return polys;
}

export function FieldPattern({
  seed = 7,
  parcels,
  angle = -18,
  tone = "color",
  drift = false,
  ditch,
  board = 0.58,
  className = "",
}: {
  /** deterministic variation of the generated strips */
  seed?: number;
  /** real parcel polygons in the 1000×1000 local frame; replaces the generated strips */
  parcels?: readonly (readonly Pt[])[];
  /** strip direction in degrees (0 = strips run top to bottom). Ignored for `parcels` (drawn as given). */
  angle?: number;
  /** "forest" = dark pattern (logo in cream, top left); "color" = colour pattern (logo inside a forest block) */
  tone?: FieldTone;
  /** slow pan: `true`/"scroll" = tied to scroll (CSS scroll timeline, static fallback), "time" = 12 s loop */
  drift?: boolean | "scroll" | "time";
  /** the one ditch as a straight segment in the local frame. Default: crosses the strips through the centre. */
  ditch?: readonly [Pt, Pt];
  /** where the board sits along the ditch, 0..1 */
  board?: number;
  className?: string;
}) {
  const t = TONES[tone];
  const rand = prng(seed);
  const generated = !parcels;
  const shapes = parcels ?? stripParcels(rand);

  // fills: neighbours never share a colour, so every strip reads as its own field
  let prev: string | undefined;
  const fills = shapes.map(() => (prev = pick(rand, t.fills, t.weights, prev)));

  // ditch: straight, crossing the strips (perpendicular-ish to them in the generated frame)
  const tilt = generated ? (rand() - 0.5) * 16 : 0;
  const cy = 500 + (rand() - 0.5) * 140;
  const rad = (tilt * Math.PI) / 180;
  const [a, b]: readonly [Pt, Pt] = ditch ?? [
    [-760, cy - Math.tan(rad) * 1260],
    [1760, cy + Math.tan(rad) * 1260],
  ];
  // board: a short cream bar across the ditch. Default placement keeps it inside the visible frame.
  const tb = Math.max(0, Math.min(1, board));
  const visA = ditch ? a : ([0, a[1] + ((b[1] - a[1]) * 760) / 2520] as Pt);
  const visB = ditch ? b : ([1000, a[1] + ((b[1] - a[1]) * 1760) / 2520] as Pt);
  const bx = visA[0] + (visB[0] - visA[0]) * tb;
  const by = visA[1] + (visB[1] - visA[1]) * tb;
  const ditchDeg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;

  const mode = drift === true ? "scroll" : drift || null;
  const groupTransform = generated ? `rotate(${r1(angle)} 500 500)` : undefined;

  return (
    <div aria-hidden="true" className={`relative overflow-clip ${className}`} style={{ backgroundColor: t.ground }}>
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        className={`absolute inset-0 block h-full w-full ${mode ? `field-drift field-drift-${mode}` : ""}`}
        focusable="false"
      >
        <rect x="-1000" y="-1000" width="3000" height="3000" fill={t.ground} />
        <g transform={groupTransform}>
          {shapes.map((p, i) => (
            <polygon
              key={i}
              points={pts(p)}
              fill={fills[i]}
              stroke={t.line}
              strokeOpacity={t.lineOpacity}
              strokeWidth={0.75}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* the one ditch: straight water-blue line */}
          <line x1={r1(a[0])} y1={r1(a[1])} x2={r1(b[0])} y2={r1(b[1])} stroke={WATER} strokeWidth={7} strokeLinecap="butt" />
          {/* the board: one cream tick across the ditch */}
          <rect
            x={r1(bx - 3.5)}
            y={r1(by - 12)}
            width={7}
            height={24}
            fill={CREAM}
            transform={`rotate(${r1(ditchDeg)} ${r1(bx)} ${r1(by)})`}
          />
        </g>
      </svg>
    </div>
  );
}
