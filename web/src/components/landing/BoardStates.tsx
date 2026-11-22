"use client";

import { useState } from "react";
import { StateTiles } from "@/components/brand/StateTiles";

type Mode = "TRZYMAJ" | "OTWORZ";

/* Long profile of a ditch, flow left to right. Bed descends 240 -> 280 across 600 units. */
const BED = (x: number) => 240 + (x * 40) / 600;
const BOARD_X = 352;
const BOARD_W = 12;
const HOLD_LEVEL = 150; // crest / water surface when TRZYMAJ
const OPEN_LEVEL = 226; // lowered board, water spills to low level when OTWÓRZ
const MOTION = "transform 1.6s ease-in-out";

function DitchDiagram({ mode }: { mode: Mode }) {
  const hold = mode === "TRZYMAJ";
  const level = hold ? HOLD_LEVEL : OPEN_LEVEL;
  const up = BOARD_X; // upstream channel ends at the board
  const down = BOARD_X + BOARD_W;
  const downLevel = hold ? 268 : 260;
  return (
    <svg
      viewBox="0 0 600 360"
      className="h-auto w-full"
      role="img"
      aria-label={
        hold
          ? "Przekrój podłużny rowu: zastawka podniesiona, woda zatrzymana w rowie."
          : "Przekrój podłużny rowu: zastawka obniżona, woda odpływa przed burzą."
      }
    >
      <defs>
        <clipPath id="ch-up">
          <polygon points={`0,0 ${up},0 ${up},${BED(up)} 0,${BED(0)}`} />
        </clipPath>
        <clipPath id="ch-down">
          <polygon points={`${down},0 600,0 600,${BED(600)} ${down},${BED(down)}`} />
        </clipPath>
        <clipPath id="ch-board">
          <polygon points={`0,80 600,80 600,${BED(600)} 0,${BED(0)}`} />
        </clipPath>
      </defs>

      {/* field surface and crop rows */}
      <line x1="0" y1="100" x2="600" y2="100" stroke="#4F7A3A" strokeWidth="2" />
      {Array.from({ length: 30 }, (_, i) => (
        <line key={i} x1={10 + i * 20} y1="100" x2={10 + i * 20} y2="90" stroke="#4F7A3A" strokeWidth="1.5" />
      ))}
      {/* bank (channel side) */}
      <rect x="0" y="100" width="600" height="140" fill="#EFE6D3" opacity="0.55" />

      {/* upstream held water */}
      <g clipPath="url(#ch-up)">
        <rect
          x="0"
          y="0"
          width={up}
          height="360"
          fill="#3B7FA3"
          style={{ transform: `translateY(${level}px)`, transition: MOTION }}
        />
      </g>
      {/* downstream water */}
      <g clipPath="url(#ch-down)">
        <rect
          x={down}
          y="0"
          width={600 - down}
          height="360"
          fill="#3B7FA3"
          opacity="0.85"
          style={{ transform: `translateY(${downLevel}px)`, transition: MOTION }}
        />
      </g>

      {/* ditch bed and soil */}
      <polygon points={`0,${BED(0)} 600,${BED(600)} 600,360 0,360`} fill="#6B4A2E" />
      <line x1="0" y1={BED(0)} x2="600" y2={BED(600)} stroke="#1F3A22" strokeWidth="2" />

      {/* wooden board (planks) slides down when OTWÓRZ */}
      <g clipPath="url(#ch-board)">
        <g style={{ transform: `translateY(${level - HOLD_LEVEL}px)`, transition: MOTION }}>
          {Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              x={BOARD_X}
              y={HOLD_LEVEL + i * 18}
              width={BOARD_W}
              height="17"
              fill="#B98D5F"
              stroke="#6B4A2E"
              strokeWidth="1"
            />
          ))}
        </g>
      </g>
      {/* steel frame */}
      <rect
        x={BOARD_X - 4}
        y="84"
        width={BOARD_W + 8}
        height={BED(BOARD_X) - 84 + 6}
        fill="none"
        stroke="#1F3A22"
        strokeWidth="3"
      />

      {/* labels */}
      <g fontFamily="var(--font-inter), sans-serif" fontSize="13" fill="#1F3A22">
        <text x="12" y="78">
          Powierzchnia pola
        </text>
        <line x1={BOARD_X + 6} y1="84" x2={BOARD_X + 40} y2="56" stroke="#1F3A22" strokeWidth="1" />
        <text x={BOARD_X + 44} y="52">
          Zastawka w stalowej ramie
        </text>
        <text x="440" y={BED(440) + 26} fill="#F3ECDD">
          Dno rowu
        </text>
        <g style={{ transform: `translateY(${level - HOLD_LEVEL}px)`, transition: MOTION }}>
          <text x="24" y={HOLD_LEVEL - 10} fontWeight="600" fill="#2E6585">
            Zatrzymana woda
          </text>
        </g>
      </g>
    </svg>
  );
}

export function BoardStates() {
  const [mode, setMode] = useState<Mode>("TRZYMAJ");
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
      <div>
        <StateTiles active={mode} onChange={setMode} size="lg" showEnglish />
        <p className="mt-5 text-[17px] leading-[1.5]">
          {mode === "TRZYMAJ"
            ? "Sucho. Deski w górze. Woda zostaje w rowie i wsiąka w pole."
            : "Prognoza burzy. Deski w dół. Rów ma miejsce na deszcz."}
        </p>
        <p className="mt-2 text-[13px] text-forest-muted">Kliknij kafelek, aby przełączyć tryb.</p>
      </div>
      <figure className="rounded-[4px] bg-cream p-4 shadow-[0_8px_24px_rgba(31,58,34,.18)] md:p-6">
        <DitchDiagram mode={mode} />
        <figcaption className="eb mt-3 text-forest-muted">
          Przekrój podłużny rowu · schemat, nie w skali
        </figcaption>
      </figure>
    </div>
  );
}
