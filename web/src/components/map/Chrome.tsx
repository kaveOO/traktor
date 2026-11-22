"use client";

import Link from "next/link";
import { useState } from "react";
import type { Conditions, Order, ScenarioName } from "@/lib/traktor";
import { GMINA, SCENARIO_LABEL, fmtRange, miejsc } from "@/lib/traktor";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/brand/Icon";
import { radioKeyDown } from "@/components/brand/radio";

type BasemapChoice = "gugik-orto" | "s2-cloudless" | "osm" | "google-roadmap" | "google-satellite" | "schema";

export type ScenarioChoice = ScenarioName | "live";
export const CHOICES: ScenarioChoice[] = ["live", "drought-aug", "storm-warning", "spring-wet"];
export const CHOICE_LABEL: Record<ScenarioChoice, string> = { live: "Na żywo", ...SCENARIO_LABEL };

const fmt = (n: number) => n.toLocaleString("pl-PL");

export function TopBar({
  conditions,
  liveNote,
  loading,
}: {
  conditions: Conditions;
  liveNote: string | null;
  loading: boolean;
}) {
  const isLive = conditions.mode === "live";
  const warn = conditions.warnings[0];
  // phones: the conditions strip sits behind a "Warunki" disclosure so the map keeps its height
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-30 flex flex-wrap items-center gap-x-5 gap-y-2 bg-forest px-4 py-2.5 text-cream max-[640px]:gap-x-3 max-[640px]:py-2">
      <Link href="/" aria-label="TRAKTOR, strona główna" className="inline-flex min-h-6 shrink-0 items-center">
        <Logo color="cream" height={18} />
      </Link>
      <div className="shrink-0 border-l border-cream/25 pl-4 max-[900px]:pl-3">
        <p className="eb text-cream-muted max-[900px]:hidden">Mapa rowów</p>
        <p className="text-[13px] font-medium max-[900px]:text-[12px]">
          {GMINA.name}
          <span className="max-[900px]:hidden"> · pow. {GMINA.powiat}</span>
        </p>
      </div>
      <button
        type="button"
        className="ml-auto hidden min-h-8 items-center gap-1.5 rounded-[2px] border border-cream/60 px-2.5 text-[12px] font-medium max-[640px]:inline-flex"
        aria-expanded={open}
        aria-controls="map-conditions"
        onClick={() => setOpen((o) => !o)}
      >
        {warn && <Icon name="storm" size={14} />}
        Warunki <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      <div
        id="map-conditions"
        className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] max-[900px]:order-last max-[900px]:basis-full max-[900px]:gap-x-3 max-[900px]:text-[11.5px] ${
          open ? "" : "max-[640px]:hidden"
        }`}
        aria-busy={loading}
      >
        <span
          className={`eb rounded-[2px] px-2 py-1 ${isLive ? "bg-cream text-forest" : "border border-cream/60"}`}
          title={conditions.labelPl}
        >
          {isLive ? "NA ŻYWO" : conditions.mode === "fixture" ? "DANE ZAPISANE" : "SCENARIUSZ DEMONSTRACYJNY"}
        </span>
        <span className="num">
          <span className="text-cream-muted">KBW 60 dni </span>
          <b>{fmt(conditions.kbw60Mm)} mm</b>
        </span>
        <span className="num">
          <span className="text-cream-muted">Opad 72 h </span>
          <b>{fmt(conditions.precip72hMm)} mm</b>
        </span>
        <span className="num">
          <span className="text-cream-muted">ET₀ </span>
          <b>{fmt(conditions.et0Mm)} mm/d</b>
        </span>
        {warn ? (
          <span className="inline-flex items-center gap-1.5 rounded-[2px] bg-terra-ink px-2 py-0.5 font-semibold">
            <Icon name="storm" size={14} />
            IMGW: {warn.event}, st. {warn.level}
          </span>
        ) : (
          <span className="text-cream-muted">Brak ostrzeżeń</span>
        )}
        {liveNote && <span className="text-[11.5px] text-cream-muted">{liveNote}</span>}
      </div>
      <p role="status" className="sr-only">
        {loading ? "Pobieram dane na żywo…" : liveNote ?? ""}
      </p>
      <nav aria-label="Strony" className="no-print flex shrink-0 items-center gap-3 text-[13px] max-[640px]:hidden">
        <Link href="/" className="inline-flex min-h-6 items-center underline-offset-4 hover:underline">
          Start
        </Link>
        <Link href="/slides" className="inline-flex min-h-6 items-center underline-offset-4 hover:underline">
          Prezentacja
        </Link>
      </nav>
      {loading && (
        <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden bg-cream/20" aria-hidden>
          <div className="progress-line h-full origin-left bg-cream" />
        </div>
      )}
    </header>
  );
}

const toggleCls = (on: boolean) =>
  `inline-flex min-h-9 shrink-0 items-center gap-2 rounded-[2px] border-[1.5px] px-2.5 text-[12.5px] whitespace-nowrap transition-colors duration-300 ${
    on ? "border-forest bg-forest text-cream" : "border-forest/60 text-forest hover:bg-cream-deep"
  }`;

function Toggle({ on, onClick, children, hint }: { on: boolean; onClick: () => void; children: string; hint?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={toggleCls(on)}>
      <span className={`inline-block size-2.5 rounded-[1px] border ${on ? "border-cream bg-cream" : "border-forest"}`} aria-hidden />
      {children}
      {hint && <span className={`text-[10.5px] ${on ? "text-cream-muted" : "text-forest-muted"}`}>{hint}</span>}
    </button>
  );
}

export function ScenarioDock({
  scenario,
  onScenario,
  orders,
  kowr,
  onKowr,
  flood,
  onFlood,
  refused,
  onRefused,
  basemap,
  onBasemap,
  googleEnabled = false,
  shortcuts,
  onShortcuts,
}: {
  basemap: BasemapChoice;
  onBasemap: (b: BasemapChoice) => void;
  googleEnabled?: boolean;
  scenario: ScenarioChoice;
  onScenario: (s: ScenarioChoice) => void;
  orders: Order[];
  kowr: boolean;
  onKowr: () => void;
  flood: boolean;
  onFlood: () => void;
  refused: boolean;
  onRefused: () => void;
  shortcuts: boolean;
  onShortcuts: () => void;
}) {
  const [layersOpen, setLayersOpen] = useState(false);
  const open = orders.filter((o) => o.action === "OTWORZ");
  const hold = orders.filter((o) => o.action === "TRZYMAJ");
  const still = orders.filter((o) => o.action === "NIE_RUSZAJ");
  const freed: [number, number] = [
    Math.round(open.reduce((s, o) => s + (o.capacityFreedM3?.[0] ?? 0), 0) / 10) * 10,
    Math.round(open.reduce((s, o) => s + (o.capacityFreedM3?.[1] ?? 0), 0) / 10) * 10,
  ];
  const basemaps = [
    ...(googleEnabled
      ? ([
          ["google-roadmap", "Google"],
          ["google-satellite", "Google satelita"],
        ] as const)
      : []),
    ["s2-cloudless", "Satelita"],
    ["gugik-orto", "Ortofoto"],
    ["osm", "Mapa"],
    ["schema", "Schemat"],
  ] as [BasemapChoice, string][];
  const bmKeys = basemaps.map(([k]) => k);

  return (
    <div className="no-print relative z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-forest/15 bg-cream px-4 py-2.5 text-forest max-[640px]:gap-y-1.5 max-[640px]:px-3 max-[640px]:py-2">
      {/* scenarios: one row, scrolls sideways on phones */}
      <div
        className="flex items-center gap-1.5 max-[640px]:-mx-3 max-[640px]:basis-[calc(100%+1.5rem)] max-[640px]:flex-nowrap max-[640px]:overflow-x-auto max-[640px]:px-3 max-[640px]:pb-0.5"
        role="radiogroup"
        aria-label="Warunki"
      >
        <span className="eb mr-1 shrink-0 text-forest-muted max-[900px]:hidden" aria-hidden>
          Warunki
        </span>
        {CHOICES.map((c, i) => {
          const on = c === scenario;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => onScenario(c)}
              onKeyDown={(e) => radioKeyDown(e, CHOICES, scenario, onScenario)}
              className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-[2px] border-[1.5px] px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-[400ms] ${
                on
                  ? c === "storm-warning"
                    ? "border-water-ink bg-water-ink text-cream"
                    : "border-forest bg-forest text-cream"
                  : "border-forest/60 hover:bg-cream-deep"
              }`}
            >
              {shortcuts && (
                <kbd className="num text-[10px]" aria-hidden>
                  {i + 1}
                </kbd>
              )}
              {CHOICE_LABEL[c]}
            </button>
          );
        })}
      </div>
      <div className="num min-w-0 flex-1 text-[13px] max-[900px]:order-first max-[900px]:basis-full max-[900px]:text-[12px]" aria-live="polite">
        {open.length > 0 ? (
          <span className="font-semibold text-water-ink">
            OTWÓRZ: {open.length} {miejsc(open.length)} · zwolniona pojemność {fmtRange(freed, "m³")}
            {still.length > 0 && <span className="font-normal text-forest"> · NIE RUSZAJ: {still.length}</span>}
          </span>
        ) : (
          <span>
            <b>TRZYMAJ: {hold.length} {miejsc(hold.length)}</b>
            {still.length > 0 && <span> · NIE RUSZAJ: {still.length}</span>}
          </span>
        )}
      </div>
      <button
        type="button"
        className="hidden min-h-8 items-center gap-1.5 rounded-[2px] border-[1.5px] border-forest/60 px-2.5 text-[12.5px] font-medium max-[640px]:inline-flex"
        aria-expanded={layersOpen}
        aria-controls="map-layers"
        onClick={() => setLayersOpen((o) => !o)}
      >
        Warstwy i podkład <span aria-hidden>{layersOpen ? "▴" : "▾"}</span>
      </button>
      <div id="map-layers" className={`flex flex-wrap items-center gap-1.5 ${layersOpen ? "" : "max-[640px]:hidden"}`}>
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Podkład mapy">
          <span className="eb mr-0.5 text-forest-muted max-[900px]:hidden" aria-hidden>
            Mapa
          </span>
          {basemaps.map(([k, label]) => {
            const on = basemap === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => onBasemap(k)}
                onKeyDown={(e) => radioKeyDown(e, bmKeys, basemap, onBasemap)}
                className={toggleCls(on)}
              >
                <span className={`inline-block size-2.5 rounded-full border ${on ? "border-cream bg-cream" : "border-forest"}`} aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
        <span className="mx-1 h-5 w-px bg-forest/20" aria-hidden />
        <Toggle on={kowr} onClick={onKowr} hint="ilustracyjnie">
          KOWR
        </Toggle>
        <Toggle on={flood} onClick={onFlood}>
          Strefa 80 m od cieku
        </Toggle>
        <Toggle on={refused} onClick={onRefused}>
          Odrzucone punkty
        </Toggle>
        <Toggle on={shortcuts} onClick={onShortcuts}>
          Skróty klawiaturowe
        </Toggle>
      </div>
    </div>
  );
}
