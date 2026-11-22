import type { LonLat, Parcel } from "@/lib/analiza";
import { n } from "./format";

/* Small print-safe SVG graphics. No external tiles, every graphic has a text alternative. */

function rings(g: Parcel["geometry"]): number[][][] {
  if (g.type === "Polygon") return g.coordinates as number[][][];
  return (g.coordinates as number[][][][]).flat();
}

/** Parcel outline from WGS84 geometry, equirectangular projection around the centroid, with scale bar + north arrow. */
export function ParcelOutline({ parcel, lowPoint, size = 112 }: { parcel: Parcel; lowPoint?: LonLat | null; size?: number }) {
  const rs = rings(parcel.geometry).filter((r) => r.length > 2);
  if (!rs.length) {
    return (
      <div className="grid place-items-center border border-forest/30 text-[10px]" style={{ width: size, height: size }}>
        Brak geometrii
      </div>
    );
  }
  const lat0 = (parcel.centroid?.[1] ?? rs[0][0][1]) * (Math.PI / 180);
  const mx = 111320 * Math.cos(lat0);
  const my = 110540;
  const proj = ([lon, lat]: number[]) => [lon * mx, -lat * my];
  const pts = rs.map((r) => r.map(proj));
  const all = pts.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(x1 - x0, y1 - y0, 1);
  const pad = 10;
  const inner = size - pad * 2;
  const k = inner / span;
  const ox = pad + (inner - (x1 - x0) * k) / 2;
  const oy = pad + (inner - (y1 - y0) * k) / 2 - 6;
  const tx = (p: number[]) => [ox + (p[0] - x0) * k, oy + (p[1] - y0) * k];
  const d = pts.map((r) => r.map((p, i) => `${i ? "L" : "M"}${tx(p)[0].toFixed(1)} ${tx(p)[1].toFixed(1)}`).join("") + "Z").join("");
  // scale bar: nice round length ~ 1/3 of span
  const nice = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  const target = span / 3;
  const len = nice.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a), nice[0]);
  const lp = lowPoint ? tx(proj(lowPoint)) : null;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Obrys działki ${parcel.id}, około ${n(parcel.areaHa, 2)} ha${lp ? ", z zaznaczonym najniższym punktem" : ""}. Północ u góry.`}
      className="shrink-0"
    >
      <rect x="0.5" y="0.5" width={size - 1} height={size - 1} fill="none" stroke="#1F3A22" strokeOpacity=".25" />
      <path d={d} fill="#4F7A3A" fillOpacity=".18" stroke="#1F3A22" strokeWidth="1.5" strokeLinejoin="round" fillRule="evenodd" />
      {lp && (
        <g>
          <circle cx={lp[0]} cy={lp[1]} r="3.2" fill="#3B7FA3" stroke="#F3ECDD" strokeWidth="1" />
        </g>
      )}
      {/* north arrow */}
      <g transform={`translate(${size - 12} 13)`} stroke="#1F3A22" strokeWidth="1.2" fill="none">
        <path d="M0 6V-6M-3 -2L0 -6L3 -2" />
        <text x="0" y="-8" textAnchor="middle" fontSize="7" fill="#1F3A22" stroke="none" fontWeight="600">N</text>
      </g>
      {/* scale bar */}
      <g transform={`translate(${pad} ${size - 9})`}>
        <path d={`M0 -3V0H${len * k}V-3`} stroke="#1F3A22" strokeWidth="1.2" fill="none" />
        <text x={len * k + 3} y="1" fontSize="7" fill="#1F3A22" className="num">{len >= 1000 ? `${len / 1000} km` : `${len} m`}</text>
      </g>
    </svg>
  );
}

/** Level meter: word + filled segments (shape, not colour alone). */
export function LevelMeter({ rank, of = 4, label }: { rank: number | null; of?: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-[3px]" role="img" aria-label={label}>
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className={`inline-block h-[9px] w-[14px] rounded-[1px] border-[1.5px] border-forest ${rank !== null && i < rank ? "bg-forest" : "bg-transparent"}`}
        />
      ))}
    </span>
  );
}

/** KBW in the crop's critical period, 10 seasons. Bars go down from 0; drought years hatched + marked "S". */
export function KbwSeasonsChart({
  seasons,
  thresholdMm,
  periodPl,
}: {
  seasons: { year: number; kbwCriticalMm: number; drought: boolean }[];
  thresholdMm: number | null;
  periodPl: string;
}) {
  if (!seasons.length) {
    return <p className="text-[11px]">Brak danych: archiwum meteo dla 10 sezonów niedostępne.</p>;
  }
  const W = 330;
  const H = 128;
  const L = 34;
  const R = 6;
  const T = 14;
  const B = 18;
  const minV = Math.min(...seasons.map((s) => s.kbwCriticalMm), thresholdMm ?? 0, -50);
  const maxV = Math.max(0, ...seasons.map((s) => s.kbwCriticalMm));
  const lo = Math.floor(minV / 50) * 50;
  const hi = Math.ceil(maxV / 50) * 50;
  const y = (v: number) => T + ((hi - v) / (hi - lo || 1)) * (H - T - B);
  const bw = (W - L - R) / seasons.length;
  const ticks: number[] = [];
  for (let v = hi; v >= lo; v -= 50) ticks.push(v);
  const desc = seasons
    .map((s) => `${s.year}: ${n(s.kbwCriticalMm)} mm${s.drought ? " (susza)" : ""}`)
    .join("; ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-labelledby="kbw-t kbw-d" className="block max-w-[110mm]">
      <title id="kbw-t">Klimatyczny bilans wodny w okresie krytycznym ({periodPl}), 10 sezonów</title>
      <desc id="kbw-d">
        {desc}. {thresholdMm !== null ? `Próg suszy IUNG: ${n(thresholdMm)} mm.` : "Próg suszy nieznany."}
      </desc>
      <defs>
        <pattern id="kbw-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="#B5573B" fillOpacity=".25" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="#B5573B" strokeWidth="2" />
        </pattern>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#1F3A22" strokeOpacity={v === 0 ? 0.8 : 0.12} />
          <text x={L - 4} y={y(v) + 3} fontSize="8" textAnchor="end" fill="#1F3A22" className="num">
            {v === 0 ? "0" : `−${Math.abs(v)}`}
          </text>
        </g>
      ))}
      <text x={2} y={9} fontSize="8" fill="#1F3A22">mm</text>
      {seasons.map((s, i) => {
        const x = L + i * bw + bw * 0.18;
        const w = bw * 0.64;
        const y0 = y(0);
        const y1 = y(s.kbwCriticalMm);
        const top = Math.min(y0, y1);
        const h = Math.max(Math.abs(y1 - y0), 0.8);
        return (
          <g key={s.year}>
            <rect
              x={x}
              y={top}
              width={w}
              height={h}
              fill={s.drought ? "url(#kbw-hatch)" : "#3B7FA3"}
              fillOpacity={s.drought ? 1 : 0.75}
              stroke={s.drought ? "#B5573B" : "none"}
              strokeWidth="1"
            />
            {s.drought && (
              <text x={x + w / 2} y={Math.min(y0, y1) - 3} fontSize="8" textAnchor="middle" fill="#B5573B" fontWeight="700">S</text>
            )}
            <text x={x + w / 2} y={H - 5} fontSize="8" textAnchor="middle" fill="#1F3A22" className="num">
              {String(s.year).slice(2)}
            </text>
          </g>
        );
      })}
      {thresholdMm !== null && (
        <g>
          <line x1={L} x2={W - R} y1={y(thresholdMm)} y2={y(thresholdMm)} stroke="#1F3A22" strokeWidth="1.2" strokeDasharray="4 3" />
          <text x={W - R} y={y(thresholdMm) - 3} fontSize="7.5" textAnchor="end" fill="#1F3A22" fontWeight="600" stroke="#F3ECDD" strokeWidth="3" paintOrder="stroke">
            próg IUNG {thresholdMm < 0 ? "−" : ""}{n(Math.abs(thresholdMm))} mm (do kalibracji)
          </text>
        </g>
      )}
    </svg>
  );
}
