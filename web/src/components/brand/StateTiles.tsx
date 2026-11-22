"use client";

import type { OrderAction } from "@/lib/traktor/types";
import { Icon } from "./Icon";
import { radioKeyDown } from "./radio";

/**
 * 11 The two states. A reusable pair of tiles; exactly one is active.
 * Active TRZYMAJ: forest fill, cream text. Active OTWÓRZ: water-blue fill, cream text.
 * Inactive: 2px outline in the state colour. 4px radius. 400ms colour change, nothing else moves.
 * TRZYMAJ and OTWÓRZ are never translated.
 * A11y: exactly-one-of-two is a radiogroup (role="radio" + aria-checked, roving tabindex, arrow keys).
 * That is the correct ARIA for mutually exclusive choices; aria-pressed toggles would announce two
 * independent on/off buttons. `variant="toggle"` is available if a caller needs aria-pressed buttons.
 */
export function StateTiles({
  active,
  onChange,
  size = "md",
  showEnglish = false,
  variant = "radio",
}: {
  active: OrderAction;
  onChange?: (a: "TRZYMAJ" | "OTWORZ") => void;
  size?: "sm" | "md" | "lg";
  showEnglish?: boolean;
  /** "radio" (default) = radiogroup; "toggle" = two buttons with aria-pressed */
  variant?: "radio" | "toggle";
}) {
  // SPEC §07: 36px padding (lg, and md from 768px up); sm is the compact in-panel variant
  const pad = size === "lg" ? "p-9" : size === "md" ? "p-5 md:p-9" : "p-3";
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
      // ink variant: the tile carries 11-15px text, brand water (#3B7FA3) is only 3.76:1 with cream
      on: "bg-water-ink text-cream border-water-ink",
      off: "border-water text-water-ink",
    },
  ];
  const keys = tiles.map((t) => t.key);
  const body = (t: (typeof tiles)[number], isOn: boolean) => (
    <>
      <div className="flex items-start justify-between">
        <span className="eb">{isOn ? "Aktywny" : "Nieaktywny"}</span>
        <Icon name={t.icon} size={20} />
      </div>
      <div className={`hd mt-3 ${title}`}>{t.label}</div>
      <div className="sh mt-2 text-[15px]">{t.pl}</div>
      {showEnglish && (
        <div lang="en" className="mt-1 text-[12px]">
          {t.en}
        </div>
      )}
    </>
  );

  // read-only: a plain status, not two disabled radios
  if (!onChange) {
    const cur = tiles.find((t) => t.key === active);
    return (
      <div className="grid grid-cols-2 gap-3" role="group" aria-label={`Tryb zastawki: ${cur ? cur.label : "NIE RUSZAJ"}`}>
        {tiles.map((t) => {
          const isOn = active === t.key;
          return (
            <div key={t.key} className={`rounded-[4px] border-2 transition-colors duration-[400ms] ${pad} ${isOn ? t.on : `${t.off} bg-transparent`}`}>
              {body(t, isOn)}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === "toggle") {
    return (
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Tryb zastawki">
        {tiles.map((t) => {
          const isOn = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={isOn}
              onClick={() => onChange(t.key)}
              className={`cursor-pointer rounded-[4px] border-2 text-left transition-colors duration-[400ms] ${pad} ${
                isOn ? t.on : `${t.off} bg-transparent`
              }`}
            >
              {body(t, isOn)}
            </button>
          );
        })}
      </div>
    );
  }

  const sel = keys.find((k) => k === active);
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tryb zastawki">
      {tiles.map((t, i) => {
        const isOn = active === t.key;
        // roving tabindex; if neither is active (NIE RUSZAJ) the first tile takes the tab stop
        const tab = isOn || (!sel && i === 0) ? 0 : -1;
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={isOn}
            tabIndex={tab}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => radioKeyDown(e, keys, sel ?? keys[0], onChange)}
            className={`cursor-pointer rounded-[4px] border-2 text-left transition-colors duration-[400ms] ${pad} ${
              isOn ? t.on : `${t.off} bg-transparent`
            }`}
          >
            {body(t, isOn)}
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
    // ink fill: the badge is also used at 15-16px (card, panel), where brand water fails 4.5:1
    OTWORZ: { cls: "bg-water-ink text-cream", label: "OTWÓRZ", icon: "storm" as const },
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
