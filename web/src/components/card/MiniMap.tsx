import { ditches, elevationAt, mapFeatures, type CrestHeight, type Site, type XY } from "@/lib/traktor";

const ELEV: Record<number, string> = { 1: "#2F5F73", 2: "#8FA86A", 3: "#C9BF86", 4: "#B98D5F", 5: "#EFE6D3" };
const pts = (p: XY[]) => p.map(([x, y]) => `${x},${y}`).join(" ");

/** Walk upstream along the ditch from the site for `lenUnits` map units. */
function upstreamPath(site: Site, lenUnits: number): XY[] {
  const d = ditches.find((k) => k.id === site.ditchId);
  if (!d || d.points.length < 2) return [];
  let best = 0;
  let bestD = Infinity;
  d.points.forEach((p, i) => {
    const dd = Math.hypot(p[0] - site.xy[0], p[1] - site.xy[1]);
    if (dd < bestD) {
      bestD = dd;
      best = i;
    }
  });
  const first = d.points[0];
  const last = d.points[d.points.length - 1];
  const step = elevationAt(first) >= elevationAt(last) ? -1 : 1; // upstream = higher end
  const out: XY[] = [site.xy];
  let left = lenUnits;
  let prev = site.xy;
  for (let i = best + step; i >= 0 && i < d.points.length && left > 0; i += step) {
    const p = d.points[i];
    const seg = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    if (seg >= left) {
      const t = left / (seg || 1);
      out.push([prev[0] + (p[0] - prev[0]) * t, prev[1] + (p[1] - prev[1]) * t]);
      break;
    }
    out.push(p);
    left -= seg;
    prev = p;
  }
  return out;
}

export function MiniMap({ site, crestCm }: { site: Site; crestCm: CrestHeight }) {
  const W = 220;
  const H = 140;
  const x0 = site.xy[0] - W / 2;
  const y0 = site.xy[1] - H / 2;
  const crest = site.crests.find((k) => k.heightCm === crestCm);
  const refusedNeighbours = new Set(
    site.crests.filter((k) => k.status === "refused" && k.refusal?.objectRef).map((k) => k.refusal!.objectRef!),
  );
  const nearParcels = mapFeatures.parcels.filter((p) =>
    p.points.some(([x, y]) => x > x0 - 40 && x < x0 + W + 40 && y > y0 - 40 && y < y0 + H + 40),
  );
  const zone = crest ? upstreamPath(site, crest.backwaterM / 10) : [];
  const zoneRefused = crest?.status === "refused";

  return (
    <svg
      viewBox={`${x0} ${y0} ${W} ${H}`}
      className="block h-auto w-full rounded-[4px] border border-forest/20"
      role="img"
      aria-label={`Mapa okolicy miejsca ${site.id}`}
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <defs>
        <clipPath id="mm-clip">
          <rect x={x0} y={y0} width={W} height={H} />
        </clipPath>
      </defs>
      <g clipPath="url(#mm-clip)">
        <rect x={x0} y={y0} width={W} height={H} fill="#EFE6D3" />
        {mapFeatures.elevationBands.map((b) => (
          <polygon key={b.level} points={pts(b.points)} fill={ELEV[b.level]} opacity={0.55} />
        ))}
        {mapFeatures.contours.map((c, i) => (
          <polyline key={i} points={pts(c)} fill="none" stroke="#F3ECDD" strokeWidth={0.6} opacity={0.9} />
        ))}
        <polygon points={pts(mapFeatures.lake)} fill="#2F5F73" opacity={0.8} />
        {nearParcels.map((p) => {
          const own = p.owner === "own" && site.ownParcels.includes(p.id);
          const refused = refusedNeighbours.has(p.id);
          if (!own && !refused && p.owner !== "kowr") {
            return <polygon key={p.id} points={pts(p.points)} fill="none" stroke="#6B4A2E" strokeWidth={0.5} opacity={0.35} />;
          }
          return (
            <polygon
              key={p.id}
              points={pts(p.points)}
              fill={own ? "#4F7A3A" : "#B5573B"}
              fillOpacity={0.12}
              stroke={own ? "#4F7A3A" : "#B5573B"}
              strokeWidth={1}
              strokeDasharray={own ? undefined : "3 2"}
            />
          );
        })}
        {mapFeatures.roads.map((r) => (
          <polyline key={r.id} points={pts(r.points)} fill="none" stroke="#6B4A2E" strokeWidth={2.2} opacity={0.7} />
        ))}
        {mapFeatures.buildings.map((b) => (
          <rect key={b.id} x={b.xy[0] - b.w / 2} y={b.xy[1] - b.h / 2} width={b.w} height={b.h} fill="#1F3A22" opacity={0.7} />
        ))}
        {ditches.map((d) => (
          <polyline
            key={d.id}
            points={pts(d.points)}
            fill="none"
            stroke="#3B7FA3"
            strokeWidth={d.id === site.ditchId ? 1.8 : 1.1}
            strokeDasharray={d.resolvable ? undefined : "2 2"}
          />
        ))}
        {zone.length > 1 && (
          <polyline
            points={pts(zone)}
            fill="none"
            stroke={zoneRefused ? "#B5573B" : "#3B7FA3"}
            strokeOpacity={0.28}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <circle cx={site.xy[0]} cy={site.xy[1]} r={4.2} fill="#4F7A3A" stroke="#F3ECDD" strokeWidth={1.4} />
        <text x={site.xy[0] + 6} y={site.xy[1] - 6} fontSize={7} fontWeight={700} fill="#1F3A22" fontFamily="var(--font-inter)">
          {site.id}
        </text>
        {/* scale bar: 50 units ~ 500 m */}
        <g transform={`translate(${x0 + 8} ${y0 + H - 10})`}>
          <rect x={-3} y={-8} width={58} height={13} fill="#F3ECDD" opacity={0.85} rx={1} />
          <line x1={0} y1={0} x2={50} y2={0} stroke="#1F3A22" strokeWidth={1.2} />
          <line x1={0} y1={-2.5} x2={0} y2={2.5} stroke="#1F3A22" strokeWidth={1} />
          <line x1={50} y1={-2.5} x2={50} y2={2.5} stroke="#1F3A22" strokeWidth={1} />
          <text x={25} y={-2.5} fontSize={5.5} textAnchor="middle" fill="#1F3A22" fontFamily="var(--font-inter)">
            ~500 m
          </text>
        </g>
      </g>
    </svg>
  );
}

export function MiniMapLegend() {
  const item = (swatch: React.ReactNode, label: string) => (
    <span className="inline-flex items-center gap-1">
      {swatch}
      {label}
    </span>
  );
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
      {item(<span className="inline-block size-2.5 rounded-full bg-agri" />, "Zastawka")}
      {item(<span className="inline-block h-0.5 w-4 bg-water" />, "Rów")}
      {item(<span className="inline-block h-2 w-4 bg-water/30" />, "Strefa piętrzenia")}
      {item(<span className="inline-block size-2.5 border border-agri bg-agri/15" />, "Działka własna")}
      {item(<span className="inline-block size-2.5 border border-dashed border-terra bg-terra/15" />, "Działka sąsiada (ryzyko)")}
    </div>
  );
}
