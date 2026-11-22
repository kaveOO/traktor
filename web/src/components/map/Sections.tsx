"use client";

import type { Crest, Site } from "@/lib/traktor";
import { C } from "./geo";

/** Cross-section at the weir: field - bank - bed - bank - field, board and water at the selected crest. */
export function CrossSection({ site, crest }: { site: Site; crest: Crest }) {
  const W = 360;
  const H = 170;
  const padT = 16;
  const padB = 26;
  const { offset, ground } = site.xs;
  const o0 = offset[0];
  const o1 = offset[offset.length - 1];
  const yMax = Math.max(...ground) + 0.25;
  const X = (o: number) => ((o - o0) / (o1 - o0)) * W;
  const Y = (z: number) => padT + (1 - z / yMax) * (H - padT - padB);
  const level = crest.heightCm / 100;
  const yLevel = Y(level);
  const groundD = `M0 ${H} ` + offset.map((o, i) => `L${X(o)} ${Y(ground[i])}`).join(" ") + ` L${W} ${H} Z`;
  const refused = crest.status === "refused";
  // right bank top (neighbour side) = index 5
  const xRightBank = X(offset[5]);
  const bankH = ground[5];
  // board spans the channel up to the crest
  const xbL = X(-0.8 - level * 1.1);
  const xbR = X(0.8 + level * 1.1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Przekrój rowu przy zastawce ${crest.heightCm} cm`}>
      <rect width={W} height={H} fill={C.cream} />
      {/* water, rising smoothly */}
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        fill={C.water}
        fillOpacity={0.75}
        style={{ transform: `translateY(${yLevel}px)`, transition: "transform 1.2s ease-in-out" }}
      />
      {refused && (
        <rect
          x={xRightBank}
          y={padT}
          width={W - xRightBank}
          height={Y(bankH) - padT + 2}
          fill={C.terra}
          fillOpacity={0.22}
        />
      )}
      {/* wooden board (ground below covers what is under the bed) */}
      <rect
        x={xbL}
        y={0}
        width={xbR - xbL}
        height={H}
        fill={C.soil}
        fillOpacity={0.45}
        stroke={C.soil}
        strokeWidth={1.5}
        style={{ transform: `translateY(${yLevel}px)`, transition: "transform 1.2s ease-in-out" }}
      />
      {/* ground */}
      <path d={groundD} fill={C.cream} />
      <path d={groundD} fill={C.agri} fillOpacity={0.35} />
      <path
        d={offset.map((o, i) => `${i ? "L" : "M"}${X(o)} ${Y(ground[i])}`).join(" ")}
        fill="none"
        stroke={C.forest}
        strokeWidth={2}
      />
      <line
        x1={xbL}
        x2={xbR}
        y1={0}
        y2={0}
        stroke={C.soil}
        strokeWidth={5}
        style={{ transform: `translateY(${yLevel}px)`, transition: "transform 1.2s ease-in-out" }}
      />
      {/* labels */}
      <text x={6} y={H - 8} fontSize={10} fill={C.forest} opacity={0.75}>
        pole właściciela
      </text>
      <text x={W - 6} y={H - 8} fontSize={10} textAnchor="end" fill={refused ? C.terra : C.forest} fontWeight={refused ? 700 : 400} opacity={refused ? 1 : 0.75}>
        {refused ? "woda na działce sąsiada" : "pole sąsiada"}
      </text>
      <text x={xbR + 4} y={-6} fontSize={11} fill={C.soil} fontWeight={700} className="num" style={{ transform: `translateY(${yLevel}px)`, transition: "transform 1.2s ease-in-out" }}>
        {crest.heightCm} cm
      </text>
    </svg>
  );
}

/** Long profile upstream of the weir: bed, bank and the backwater wedge. */
export function LongProfile({ site, crest }: { site: Site; crest: Crest }) {
  const W = 360;
  const H = 96;
  const pad = 10;
  const { chainage, bed, bank } = site.profile;
  const cMax = chainage[chainage.length - 1];
  const zMax = Math.max(...bank) + 0.1;
  const X = (c: number) => (c / cMax) * W;
  const Y = (z: number) => pad + (1 - z / zMax) * (H - 2 * pad - 10);
  const level = crest.heightCm / 100;
  const wedge: string[] = [`M${X(0)} ${Y(level)}`];
  let end = 0;
  for (let i = 0; i < chainage.length; i++) {
    if (bed[i] >= level) {
      const prev = i > 0 ? i - 1 : 0;
      const t = (level - bed[prev]) / (bed[i] - bed[prev] || 1);
      end = chainage[prev] + (chainage[i] - chainage[prev]) * Math.max(0, Math.min(1, t));
      break;
    }
    end = chainage[i];
  }
  wedge.push(`L${X(end)} ${Y(level)}`);
  for (let i = chainage.length - 1; i >= 0; i--) if (chainage[i] <= end) wedge.push(`L${X(chainage[i])} ${Y(bed[i])}`);
  wedge.push("Z");
  const line = (z: number[]) => chainage.map((c, i) => `${i ? "L" : "M"}${X(c)} ${Y(z[i])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Profil podłużny rowu z cofką">
      <rect width={W} height={H} fill={C.cream} />
      <path d={wedge.join(" ")} fill={C.water} fillOpacity={0.6} style={{ transition: "d 1.2s ease-in-out" }} />
      <path d={line(bank)} fill="none" stroke={C.agri} strokeWidth={1.5} strokeDasharray="4 3" />
      <path d={line(bed)} fill="none" stroke={C.soil} strokeWidth={2} />
      <line x1={1} x2={1} y1={Y(0) + 2} y2={Y(level) - 4} stroke={C.soil} strokeWidth={3} />
      <text x={4} y={H - 3} fontSize={9.5} fill={C.forest} opacity={0.7}>
        zastawka
      </text>
      <text x={W - 2} y={H - 3} fontSize={9.5} textAnchor="end" fill={C.forest} opacity={0.7} className="num">
        {cMax} m w górę rowu
      </text>
    </svg>
  );
}
