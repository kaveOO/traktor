import type { CrestHeight, Site } from "@/lib/traktor";

type P = [number, number];

/** Cross-section at the weir with the board and the water level at the crest. */
export function CrossSection({ site, crestCm }: { site: Site; crestCm: CrestHeight }) {
  const { offset, ground } = site.xs;
  const h = crestCm / 100;
  const W = 360;
  const H = 125;
  const padT = 14;
  const padB = 18;
  const minX = offset[0];
  const maxX = offset[offset.length - 1];
  const maxY = Math.max(...ground, h) + 0.15;
  const sx = (x: number) => ((x - minX) / (maxX - minX)) * W;
  const sy = (y: number) => padT + (1 - y / maxY) * (H - padT - padB);
  const g: P[] = offset.map((x, i) => [x, ground[i]]);

  // water polygon: ground below h between the bank crossings (spills to the edge if the bank is lower)
  const water: P[] = [];
  let inside = false;
  for (let i = 0; i < g.length - 1; i++) {
    const [x1, y1] = g[i];
    const [x2, y2] = g[i + 1];
    if (!inside && y1 >= h && y2 < h) {
      const t = (y1 - h) / (y1 - y2);
      water.push([x1 + (x2 - x1) * t, h]);
      inside = true;
    }
    if (inside) {
      if (y2 < h) water.push([x2, y2]);
      else {
        const t = (h - y1) / (y2 - y1);
        water.push([x1 + (x2 - x1) * t, h]);
        break;
      }
    }
    if (inside && i === g.length - 2 && y2 < h) water.push([x2, h]);
  }
  const spills = water.length > 0 && water[water.length - 1][0] >= maxX - 0.01;
  const wl = water.length ? water[0][0] : -0.5;
  const wr = water.length ? water[water.length - 1][0] : 0.5;
  const half = (site.xs.offset[4] - site.xs.offset[3]) / 2;
  const groundPath = `M${sx(minX)},${H} ` + g.map(([x, y]) => `L${sx(x)},${sy(y)}`).join(" ") + ` L${sx(maxX)},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`Przekrój rowu przy zastawce ${crestCm} cm`}
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {water.length > 2 && (
        <polygon points={water.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")} fill={spills ? "#B5573B" : "#3B7FA3"} opacity={0.45} />
      )}
      <path d={groundPath} fill="#6B4A2E" opacity={0.22} />
      <polyline points={g.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")} fill="none" stroke="#6B4A2E" strokeWidth={2} />
      {/* board: from bed to crest across the channel bottom */}
      <rect
        x={sx(-half - 0.25)}
        y={sy(h)}
        width={sx(half + 0.25) - sx(-half - 0.25)}
        height={sy(0) - sy(h)}
        fill="none"
        stroke="#1F3A22"
        strokeWidth={2}
        strokeDasharray="4 2"
      />
      <line x1={sx(wl)} y1={sy(h)} x2={sx(wr)} y2={sy(h)} stroke={spills ? "#B5573B" : "#3B7FA3"} strokeWidth={1.6} />
      <text x={sx(0)} y={sy(h) - 4} fontSize={10} textAnchor="middle" fill="#1F3A22" fontWeight={700} fontFamily="var(--font-inter)">
        Zastawka {crestCm} cm
      </text>
      <text x={4} y={H - 4} fontSize={9} fill="#1F3A22" opacity={0.7} fontFamily="var(--font-inter)">
        działka własna (pn.)
      </text>
      <text x={W - 4} y={H - 4} fontSize={9} textAnchor="end" fill={spills ? "#B5573B" : "#1F3A22"} opacity={spills ? 1 : 0.7} fontFamily="var(--font-inter)">
        {spills ? "woda wychodzi na działkę sąsiada" : "działka sąsiada (pd.)"}
      </text>
    </svg>
  );
}
