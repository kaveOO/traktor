"use client";

import Link from "next/link";
import { use, useState } from "react";
import { browser } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/brand/Icon";
import { OrderBadge } from "@/components/brand/StateTiles";
import { Button, FooterLine, SkipLink, SourceLine, StatusChip } from "@/components/brand/ui";
import { radioKeyDown } from "@/components/brand/radio";
import {
  bufferDays,
  CRESTS,
  DEMO_NOTE,
  decideOrder,
  FACTS,
  FEATURED_SITE_ID,
  fmtRange,
  getScenario,
  getSite,
  LEGAL,
  REFUSAL_LABEL,
  SCENARIO_LABEL,
  SCENARIOS,
  sites,
  SOURCES_MAP,
  type CrestHeight,
  type ScenarioName,
} from "@/lib/traktor";
import { CrossSection } from "./CrossSection";
import { MiniMap, MiniMapLegend } from "./MiniMap";

const PRINT_CSS = `
@page { size: A4 portrait; margin: 12mm; }
@media print {
  html, body { background: #fff !important; }
  .karta-sheet { box-shadow: none !important; background: #fff !important; width: auto !important; max-width: none !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; }
  .karta-sheet * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .karta-avoid { break-inside: avoid; }
  /* fit one A4 page by tightening spacing, not by shrinking text (print text stays >= 10px) */
  .karta-sheet .mt-3 { margin-top: 2mm !important; }
  .karta-sheet .mt-4 { margin-top: 3mm !important; }
  .karta-sheet .gap-4 { gap: 3mm !important; }
  .karta-sheet header { padding-bottom: 2mm !important; }
}
`;

const MISSING = [
  "Wizja lokalna",
  "Pomiar geodezyjny przekroju i spadku",
  "Operat wodnoprawny",
  "Drenowanie podziemne",
  "Właściciel zastawki",
];

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const siteId = p.get("site") || FEATURED_SITE_ID;
  const crestRaw = Number(p.get("crest"));
  const scRaw = p.get("scenario");
  const scenario: ScenarioName = SCENARIOS.includes(scRaw as ScenarioName) ? (scRaw as ScenarioName) : "drought-aug";
  return { siteId, crestRaw, scenario };
}

export default function SiteCard() {
  use(browser("Karta miejsca działa tylko w przeglądarce."));
  const [init] = useState(readParams);
  const [siteId, setSiteId] = useState(init.siteId);
  const [scenario, setScenario] = useState<ScenarioName>(init.scenario);
  const site = getSite(siteId);
  const defaultCrest = (s: typeof site) => (s?.maxAcceptedCrestCm ?? 20) as CrestHeight;
  const [crestCm, setCrestCm] = useState<CrestHeight>(
    CRESTS.includes(init.crestRaw as CrestHeight) ? (init.crestRaw as CrestHeight) : defaultCrest(site),
  );

  const sync = (s: string, c: number, sc: string) => {
    const q = new URLSearchParams({ site: s, crest: String(c), scenario: sc });
    window.history.replaceState(null, "", `/karta?${q.toString()}`);
  };

  if (!site) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <Logo height={22} />
        <h1 className="sh mt-10 text-[40px]">Nie ma miejsca „{siteId}”.</h1>
        <p className="mt-4 text-[17px]">Wybierz miejsce na mapie.</p>
        <Button href="/mapa" className="mt-8">
          <span aria-hidden>←</span> Wróć do mapy
        </Button>
      </main>
    );
  }

  const crest = site.crests.find((k) => k.heightCm === crestCm) ?? site.crests[0];
  const refused = crest.status === "refused";
  const orderCrest = refused ? site.maxAcceptedCrestCm : crestCm;
  const cond = getScenario(scenario);
  const order = decideOrder(site, cond, orderCrest);
  const buf = bufferDays(crest.storageMm, cond.et0Mm);
  const refusedCrests = site.crests.filter((k) => k.status === "refused");
  const today = new Date().toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  const mapHref = `/mapa?site=${site.id}&crest=${crestCm}&scenario=${scenario}`;

  const metrics: { label: string; value: string; src: string }[] = [
    { label: "Retencja w rowie i glebie", value: fmtRange(crest.storageM3, "m³"), src: "szacunek (NMT + model)" },
    { label: "Cofka", value: `${crest.backwaterM.toLocaleString("pl-PL")} m`, src: "NMT (spadek dna)" },
    { label: "Pole nawodnione", value: fmtRange(crest.rehydratedHa, "ha"), src: "szacunek (pas 2 × 60 m)" },
    { label: "Woda w pasie pola", value: fmtRange(crest.storageMm, "mm"), src: "szacunek (model)" },
    {
      label: "Zapas na suszę",
      value: buf ? `${fmtRange(buf, "dni")}` : "> 60 dni",
      src: `ET₀ ${cond.et0Mm.toLocaleString("pl-PL")} mm/d (scenariusz)`,
    },
    { label: "Mniej odpływu z pola", value: fmtRange(crest.outflowAvoidedMm, "mm"), src: "literatura (Kęsicka et al. 2022)" },
    { label: "Spadek dna rowu", value: `${site.slopePct.toLocaleString("pl-PL")}%`, src: "NMT" },
    { label: "Rzędna terenu", value: `${site.elevationM.toLocaleString("pl-PL")} m n.p.m.`, src: "NMT" },
    { label: "Długość rowu", value: `${site.ditchLengthM.toLocaleString("pl-PL")} m`, src: "BDOT10k" },
    { label: "Gleba", value: `kat. ${site.soilCategory}`, src: "przykład (bez IUNG)" },
  ];

  return (
    <div className="flex flex-col items-center bg-cream-deep pb-10 print:bg-white print:pb-0">
      <style>{PRINT_CSS}</style>
      <SkipLink href="#main">Przejdź do treści</SkipLink>

      {/* toolbar: screen only */}
      <div className="no-print sticky top-0 z-10 w-full border-b border-forest/15 bg-cream">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-3 px-4 py-3 text-[14px]">
          <Link href={mapHref} className="inline-flex min-h-10 items-center font-medium underline-offset-4 hover:underline">
            ← Wróć do mapy
          </Link>
          <label className="ml-auto inline-flex items-center gap-2">
            <span className="eb">Miejsce</span>
            <select
              value={site.id}
              onChange={(e) => {
                const s = getSite(e.target.value);
                const c = defaultCrest(s);
                setSiteId(e.target.value);
                setCrestCm(c);
                sync(e.target.value, c, scenario);
              }}
              className="min-h-10 rounded-[2px] border-[1.5px] border-forest bg-cream px-2"
            >
              {sites
                .filter((s) => s.status === "accepted")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2">
            <span className="eb">Scenariusz</span>
            <select
              value={scenario}
              onChange={(e) => {
                const sc = e.target.value as ScenarioName;
                setScenario(sc);
                sync(site.id, crestCm, sc);
              }}
              className="min-h-10 rounded-[2px] border-[1.5px] border-forest bg-cream px-2"
            >
              {SCENARIOS.map((s) => (
                <option key={s} value={s}>
                  {SCENARIO_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Wysokość zastawki">
            <span className="eb mr-1">Wysokość</span>
            {site.crests.map((k) => {
              const on = k.heightCm === crestCm;
              const bad = k.status === "refused";
              const pick = (h: CrestHeight) => {
                setCrestCm(h);
                sync(site.id, h, scenario);
              };
              return (
                <button
                  key={k.heightCm}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`${k.heightCm} cm${bad ? ", odrzucona" : ""}`}
                  tabIndex={on ? 0 : -1}
                  title={bad ? `Odrzucona: ${k.refusal?.messagePl ?? ""}` : "Przyjęta"}
                  onClick={() => pick(k.heightCm)}
                  onKeyDown={(e) => radioKeyDown(e, site.crests.map((q) => q.heightCm), crestCm, pick)}
                  className={`num min-h-10 min-w-11 rounded-[2px] border-[1.5px] px-2 transition-colors duration-[400ms] ${
                    bad
                      ? on
                        ? "border-terra-ink bg-terra-ink text-cream"
                        : "border-terra-ink text-terra-ink line-through"
                      : on
                        ? "border-forest bg-forest text-cream"
                        : "border-forest text-forest"
                  }`}
                >
                  {k.heightCm}
                </button>
              );
            })}
          </div>
          <Button type="button" onClick={() => window.print()} className="!min-h-10 !px-4 !text-[14px]">
            Drukuj / zapisz PDF
          </Button>
        </div>
      </div>

      {/* A4 sheet: fixed A4 in print, fluid (max 210mm) on screen so it reflows on phones */}
      <main id="main" tabIndex={-1} className="flex w-full justify-center focus:outline-none">
      <article className="karta-sheet mt-6 w-full max-w-[210mm] min-h-[297mm] bg-cream px-[12mm] py-[11mm] text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)] narrow:mt-0 narrow:min-h-0 narrow:px-4 narrow:py-5 print:mt-0">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-forest pb-3 narrow:gap-2">
          <Logo height={18} />
          <div className="hd text-center text-[17px]">Karta miejsca</div>
          <div className="flex items-center gap-2">
            <StatusChip status={refused ? "refused" : "accepted"} />
            <span className="num text-[11px]">{today}</span>
          </div>
        </header>

        <section className="mt-4">
          <p className={`eb ${refused ? "text-terra-ink" : "text-agri-ink"}`}>
            MIEJSCE {site.id}
          </p>
          <h1 className="sh mt-1 text-[28px]">{site.name}</h1>
          <p className="num mt-1.5 text-[14px] font-medium">
            Wysokość zastawki {crestCm} cm · Retencja {fmtRange(crest.storageM3, "m³")} (szacunek) · Spadek {site.slopePct.toLocaleString("pl-PL")}%
          </p>
          {refused && (
            <p className="mt-1.5 rounded-[4px] border-2 border-dashed border-terra px-3 py-1 text-[11px] leading-snug text-terra-ink">
              <strong>{crestCm} cm: odrzucone.</strong> {crest.refusal?.messagePl}{" "}
              {site.maxAcceptedCrestCm ? `Bezpieczne maksimum: ${site.maxAcceptedCrestCm} cm.` : ""}
            </p>
          )}
        </section>

        <section className="karta-avoid mt-3 grid grid-cols-2 gap-4 narrow:grid-cols-1">
          <div>
            <h2 className="eb mb-1.5">Okolica miejsca</h2>
            <MiniMap site={site} crestCm={crestCm} />
            <MiniMapLegend />
            <SourceLine tone="onCream" className="mt-1">{SOURCES_MAP}</SourceLine>
          </div>
          <div>
            <h2 className="eb mb-1.5">Przekrój przy zastawce</h2>
            <div className="rounded-[4px] border border-forest/20 bg-cream-deep/60 p-2">
              <CrossSection site={site} crestCm={crestCm} />
            </div>
            <SourceLine tone="onCream" className="mt-1">NMT LiDAR 1 m (GUGiK); przekrój uproszczony</SourceLine>

            <div className="mt-2 rounded-[4px] border-2 border-forest/25 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="eb">Polecenie na dziś</h2>
                <OrderBadge action={order.action} className="!px-2 !py-1 !text-[15px]" />
              </div>
              <ul className="mt-1.5 space-y-0.5 text-[10.5px] leading-snug">
                {order.reasons.map((r) => (
                  <li key={r}>· {r}</li>
                ))}
              </ul>
              {order.action === "OTWORZ" && order.deadline && (
                <p className="mt-1.5 text-[12px] font-semibold text-water-ink">
                  Termin:{" "}
                  {new Date(order.deadline).toLocaleString("pl-PL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {order.capacityFreedM3 ? ` · zwolnisz ${fmtRange(order.capacityFreedM3, "m³")}` : ""}
                </p>
              )}
              <p className="mt-1.5 text-[10px] text-forest-muted">
                {cond.labelPl} · reguła {order.ruleId}
                {refused && orderCrest ? ` · liczone dla ${orderCrest} cm` : ""}
              </p>
            </div>
          </div>
        </section>

        <section className="karta-avoid mt-3 grid grid-cols-[1.2fr_1fr] gap-4 narrow:grid-cols-1">
          <div className="min-w-0">
            <h2 className="eb mb-1">Parametry przy {crestCm} cm (zakresy)</h2>
            <table className="num w-full border-collapse text-[11px]">
              <caption className="sr-only">Parametry miejsca {site.id} przy zastawce {crestCm} cm, ze źródłem każdej wartości</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Parametr</th>
                  <th scope="col">Wartość</th>
                  <th scope="col">Źródło</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.label} className="border-b border-forest/15">
                    <th scope="row" className="py-[3px] pr-2 text-left font-normal">{m.label}</th>
                    <td className="py-[3px] pr-2 text-right font-semibold whitespace-nowrap">{m.value}</td>
                    <td className="py-[3px] text-right text-[10px] leading-tight text-forest-muted">{m.src}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 text-[10.5px] leading-snug">
            <div>
              <h2 className="eb mb-1">Działki</h2>
              <ul className="space-y-0.5">
                {site.ownParcels.map((p) => (
                  <li key={p} className="num">
                    <span className="inline-block size-2 border border-agri bg-agri/20" /> {p} · przy zastawce
                  </li>
                ))}
                {refusedCrests
                  .filter((k, i, all) => k.refusal?.objectRef && all.findIndex((q) => q.refusal?.objectRef === k.refusal?.objectRef) === i)
                  .map((k) => (
                    <li key={k.heightCm} className="num text-terra-ink">
                      <span className="inline-block size-2 border border-dashed border-terra" /> {k.refusal!.objectRef} · sąsiad ·{" "}
                      {REFUSAL_LABEL[k.refusal!.code].toLowerCase()} od {k.heightCm} cm
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h2 className="eb mb-1">Ścieżka prawna</h2>
              <ul className="space-y-0.5">
                <li>· {LEGAL.permit}</li>
                <li>· {LEGAL.lighter}</li>
                <li>· {LEGAL.maintenance}</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="karta-avoid mt-3 grid grid-cols-2 gap-4 text-[10.5px] leading-snug narrow:grid-cols-1">
          <div>
            <h2 className="eb mb-1">Do sprawdzenia</h2>
            <ul className="space-y-0.5">
              {MISSING.map((m) => (
                <li key={m} className="flex items-center gap-1.5">
                  <span className="inline-block size-3 rounded-[2px] border-[1.5px] border-forest" /> {m}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="eb mb-1">Korzyść dodatkowa</h2>
            <div className="flex items-start gap-2">
              <Icon name="water" size={20} className="mt-0.5 shrink-0 text-water" />
              <p>
                Drenaż sterowany w badaniach: <strong>{FACTS.outflow}</strong> i <strong>{FACTS.nitrate}</strong> w wodzie
                z drenów.
                <span className="block text-[10px] text-forest-muted">
                  <span lang="en">Kęsicka et al. 2022, PLoS ONE.</span> To nie prognoza dla tego miejsca.
                </span>
              </p>
            </div>
          </div>
        </section>

        <div className="karta-avoid mt-3 flex flex-wrap items-center gap-3 rounded-[4px] border-[3px] border-double border-forest px-4 py-2.5">
          <Icon name="pin" size={26} />
          <p className="hd text-[26px]">{LEGAL.siteVisit}</p>
          <p className="ml-auto max-w-[70mm] text-right text-[10px] leading-snug text-forest-muted narrow:ml-0 narrow:text-left">
            Karta to wstępna ocena z danych zdalnych. Nie zastępuje projektu ani pozwolenia.
          </p>
        </div>

        <footer className="mt-3 flex flex-wrap items-end justify-between gap-4 border-t border-forest/30 pt-2 text-[10px]">
          <div>
            <p className="text-forest-muted">{DEMO_NOTE}</p>
            <SourceLine tone="onCream">BDOT10k, NMT 1 m, ULDK (GUGiK); IMGW-PIB; Open-Meteo (CC BY 4.0)</SourceLine>
          </div>
          <FooterLine className="shrink-0" />
        </footer>
      </article>
      </main>
    </div>
  );
}
