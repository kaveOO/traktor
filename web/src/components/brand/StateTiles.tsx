"use client";

import type { OrderAction } from "@/lib/traktor/types";
import { Icon } from "./Icon";

/**
 * 11 The two states. A reusable pair of tiles; exactly one is active.
 * Active TRZYMAJ: forest fill, cream text. Active OTWÓRZ: water-blue fill, cream text.
 * Inactive: 2px outline in the state colour. 4px radius. 400ms colour change, nothing else moves.
 * TRZYMAJ and OTWÓRZ are never translated.
 */
export function StateTiles({
  active,
  onChange,
  size = "md",
  showEnglish = false,
}: {
  active: OrderAction;
  onChange?: (a: "TRZYMAJ" | "OTWORZ") => void;
  size?: "sm" | "md" | "lg";
  showEnglish?: boolean;
}) {
  const pad = size === "lg" ? "p-9" : size === "md" ? "p-5" : "p-3";
  const title = size === "lg" ? "text-6xl" : size === "md" ? "text-4xl" : "text-2xl";
  const tiles = [
    {
      key: "TRZYMAJ" as const,
      label: "TRZYMAJ",
      pl: "Zatrzymaj wodę w czasie suszy",
      en: "Hold water during drought",
      icon: "drought" as const,
      on: "bg-forest text-cream border-forest",
      off: "border-forest text-forest",
    },
    {
      key: "OTWORZ" as const,
      label: "OTWÓRZ",
      pl: "Wypuść wodę przed prognozowaną burzą",
      en: "Release water before a forecast storm",
      icon: "storm" as const,
      on: "bg-water text-cream border-water",
      off: "border-water text-water",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tryb zastawki">
      {tiles.map((t) => {
        const isOn = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={isOn}
            disabled={!onChange}
            onClick={() => onChange?.(t.key)}
            className={`rounded-[4px] border-2 text-left transition-colors duration-[400ms] ${pad} ${
              isOn ? t.on : `${t.off} bg-transparent`
            } ${onChange ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className="flex items-start justify-between">
              <span className="eb opacity-80">{isOn ? "Aktywny" : "Nieaktywny"}</span>
              <Icon name={t.icon} size={20} />
            </div>
            <div className={`hd mt-3 ${title}`}>{t.label}</div>
            <div className="sh mt-2 text-[15px]">{t.pl}</div>
            {showEnglish && <div className="mt-1 text-[12px] opacity-80">{t.en}</div>}
          </button>
        );
      })}
    </div>
  );
}

/** Compact badge for the current order, including NIE RUSZAJ. */
export function OrderBadge({ action, className = "" }: { action: OrderAction; className?: string }) {
  const map = {
    TRZYMAJ: { cls: "bg-forest text-cream", label: "TRZYMAJ", icon: "drought" as const },
    OTWORZ: { cls: "bg-water text-cream", label: "OTWÓRZ", icon: "storm" as const },
    NIE_RUSZAJ: { cls: "border-2 border-forest/40 text-forest", label: "NIE RUSZAJ", icon: "board" as const },
  }[action];
  return (
    <span
      className={`hd inline-flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-xl transition-colors duration-[400ms] ${map.cls} ${className}`}
    >
      <Icon name={map.icon} size={18} />
      {map.label}
    </span>
  );
}
