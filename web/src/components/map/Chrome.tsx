"use client";

import Link from "next/link";
import type { Conditions, Order, ScenarioName } from "@/lib/traktor";
import { GMINA, SCENARIO_LABEL, fmtRange } from "@/lib/traktor";

type BasemapChoice = "osm" | "google-roadmap" | "google-satellite" | "ortho" | "schema";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/brand/Icon";

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
  return (
    <header className="relative z-30 flex flex-wrap items-center gap-x-5 gap-y-2 bg-forest px-4 py-2.5 text-cream">
      <Link href="/" aria-label="TRAKTOR, strona główna" className="shrink-0">
        <Logo color="cream" height={18} />
      </Link>
      <div className="shrink-0 border-l border-cream/25 pl-4 max-[900px]:hidden">
        <p className="eb opacity-70">Mapa gminy</p>
        <p className="text-[13px] font-medium">{GMINA.name} · pow. {GMINA.powiat}</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] max-[900px]:order-last max-[900px]:basis-full max-[900px]:gap-x-3 max-[900px]:text-[11.5px]" aria-live="polite">
        <span
          className={`eb rounded-[2px] px-2 py-1 ${isLive ? "bg-cream text-forest" : "border border-cream/60"}`}
          title={conditions.labelPl}
        >
          {isLive ? "NA ŻYWO" : conditions.mode === "fixture" ? "DANE ZAPISANE" : "SCENARIUSZ DEMONSTRACYJNY"}
        </span>
        <span className="num">
          <span className="opacity-70">KBW 60 dni </span>
          <b>{fmt(conditions.kbw60Mm)} mm</b>
        </span>
        <span className="num">
          <span className="opacity-70">Opad 72 h </span>
          <b>{fmt(conditions.precip72hMm)} mm</b>
        </span>
        <span className="num">
          <span className="opacity-70">ET₀ </span>
          <b>{fmt(conditions.et0Mm)} mm/d</b>
        </span>
        {warn ? (
          <span className="inline-flex items-center gap-1.5 rounded-[2px] bg-terra px-2 py-0.5 font-semibold">
            <Icon name="storm" size={14} />
            IMGW: {warn.event}, st. {warn.level}
          </span>
        ) : (
          <span className="opacity-70">Ostrzeżenia: brak</span>
        )}
        {liveNote && <span className="text-[11.5px] opacity-80">{liveNote}</span>}
      </div>
      <nav className="no-print flex shrink-0 items-center gap-3 text-[13px]">
        <Link href="/" className="underline-offset-4 hover:underline">
          Start
        </Link>
        <Link href="/slides" className="underline-offset-4 hover:underline">
          Prezentacja
        </Link>
      </nav>
      {loading && (
        <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden bg-cream/20">
          <div className="h-full origin-left bg-cream [animation:progress-line_1.2s_ease-in-out_infinite]" />
        </div>
      )}
    </header>
  );
}

function Toggle({ on, onClick, children, hint }: { on: boolean; onClick: () => void; children: string; hint?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-2 rounded-[2px] border-[1.5px] px-2.5 text-[12.5px] transition-colors duration-300 ${
        on ? "border-forest bg-forest text-cream" : "border-forest/35 text-forest hover:bg-cream"
      }`}
    >
      <span className={`inline-block size-2.5 rounded-[1px] border ${on ? "border-cream bg-cream" : "border-forest/60"}`} />
      {children}
      {hint && <span className="text-[10.5px] opacity-70">{hint}</span>}
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
}) {
  const open = orders.filter((o) => o.action === "OTWORZ");
  const hold = orders.filter((o) => o.action === "TRZYMAJ");
  const still = orders.filter((o) => o.action === "NIE_RUSZAJ");
  const freed: [number, number] = [
    Math.round(open.reduce((s, o) => s + (o.capacityFreedM3?.[0] ?? 0), 0) / 10) * 10,
    Math.round(open.reduce((s, o) => s + (o.capacityFreedM3?.[1] ?? 0), 0) / 10) * 10,
  ];
  return (
    <div className="no-print relative z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-forest/15 bg-cream px-4 py-2.5 text-forest">
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Warunki">
        <span className="eb mr-1 opacity-70 max-[900px]:hidden">Warunki</span>
        {CHOICES.map((c, i) => {
          const on = c === scenario;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onScenario(c)}
              className={`inline-flex min-h-9 items-center gap-2 rounded-[2px] border-[1.5px] px-3 text-[13px] font-medium transition-colors duration-[400ms] ${
                on
                  ? c === "storm-warning"
                    ? "border-water bg-water text-cream"
                    : "border-forest bg-forest text-cream"
                  : "border-forest/35 hover:bg-cream-deep"
              }`}
            >
              <kbd className="num text-[10px] opacity-60">{i + 1}</kbd>
              {CHOICE_LABEL[c]}
            </button>
          );
        })}
      </div>
      <div className="num min-w-0 flex-1 text-[13px] max-[900px]:order-first max-[900px]:basis-full max-[900px]:text-[12px]" aria-live="polite">
        {open.length > 0 ? (
          <span className="font-semibold text-water">
            OTWÓRZ: {open.length} miejsc · zwolniona pojemność {fmtRange(freed, "m³")}
            {still.length > 0 && <span className="font-normal text-forest"> · NIE RUSZAJ: {still.length}</span>}
          </span>
        ) : (
          <span>
            <b>TRZYMAJ: {hold.length} miejsc</b>
            {still.length > 0 && <span> · NIE RUSZAJ: {still.length}</span>}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eb mr-0.5 opacity-70 max-[900px]:hidden">Mapa</span>
        {(
          [
            ...(googleEnabled
              ? ([
                  ["google-roadmap", "Google"],
                  ["google-satellite", "Google satelita"],
                ] as const)
              : []),
            ["osm", "OSM"],
            ["ortho", "Ortofoto"],
            ["schema", "Schemat"],
          ] as [BasemapChoice, string][]
        ).map(([k, label]) => (
          <Toggle key={k} on={basemap === k} onClick={() => onBasemap(k)}>
            {label}
          </Toggle>
        ))}
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
      </div>
    </div>
  );
}
