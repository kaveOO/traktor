"use client";

import { useState } from "react";
import type { Candidate, Conditions, CrestHeight, Order, Site } from "@/lib/traktor";
import { CRESTS, DEMO_NOTE, GMINA, LEGAL, REFUSAL_LABEL, REFUSAL_RULE, THRESHOLDS, bufferDays, ditches, fmtRange, plural, summary } from "@/lib/traktor";
import { Button, Eyebrow, SourceLine, StatusChip } from "@/components/brand/ui";
import { OrderBadge, StateTiles } from "@/components/brand/StateTiles";
import { CrossSection, LongProfile } from "./Sections";
import { RankingList } from "./Overlays";
import { shortParcel } from "./geo";

function Tag({ children }: { children: string }) {
  return <span className="eb rounded-[2px] border border-forest/25 px-1 py-px text-[9px] opacity-70">{children}</span>;
}

function Metric({ label, value, tag }: { label: string; value: string; tag: string }) {
  return (
    <div className="rounded-[2px] bg-cream p-2.5">
      <div className="flex items-center justify-between gap-1">
        <span className="eb text-[10px] opacity-70">{label}</span>
        <Tag>{tag}</Tag>
      </div>
      <div className="num mt-1 text-[17px] font-semibold leading-tight">{value}</div>
    </div>
  );
}

export function CrestSlider({ site, crest, onCrest }: { site: Site; crest: CrestHeight; onCrest: (c: CrestHeight) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Eyebrow className="opacity-70">Wysokość zastawki</Eyebrow>
        <span className="text-[11px] opacity-60">← / → zmienia</span>
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-1" role="radiogroup" aria-label="Wysokość zastawki">
        {CRESTS.map((h) => {
          const k = site.crests.find((c) => c.heightCm === h)!;
          const refused = k.status === "refused";
          const on = h === crest;
          return (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onCrest(h)}
              className={`num flex min-h-11 flex-col items-center justify-center rounded-[2px] border-[1.5px] text-[14px] font-semibold transition-colors duration-300 ${
                on
                  ? refused
                    ? "border-terra bg-terra text-cream"
                    : "border-forest bg-forest text-cream"
                  : refused
                    ? "border-terra/60 text-terra"
                    : "border-forest/30 text-forest hover:bg-cream"
              }`}
            >
              <span>{h}</span>
              <span className="text-[10px] font-normal leading-none opacity-80">{refused ? "✕ cm" : "cm"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WhyDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-cream-deep" role="dialog" aria-label="Dlaczego takie polecenie">
      <div className="flex items-center justify-between border-b border-forest/15 px-5 py-3">
        <Eyebrow>Dlaczego? · reguła {order.ruleId}</Eyebrow>
        <button type="button" onClick={onClose} className="eb rounded-[2px] border-[1.5px] border-forest px-2 py-1">
          Zamknij
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-[14px]">
        <div>
          <OrderBadge action={order.action} />
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {order.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <Eyebrow className="mb-1 opacity-70">Dane wejściowe</Eyebrow>
          <table className="w-full text-[13px]">
            <tbody>
              {Object.entries(order.inputs).map(([k, v]) => (
                <tr key={k} className="border-b border-forest/10">
                  <td className="py-1 pr-2 opacity-75">{k}</td>
                  <td className="num py-1 text-right">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Eyebrow className="opacity-70">Progi {THRESHOLDS.version}</Eyebrow>
            <Tag>do kalibracji</Tag>
          </div>
          <table className="w-full text-[13px]">
            <tbody>
              <tr className="border-b border-forest/10"><td className="py-1 opacity-75">Ostrzeżenie IMGW od stopnia</td><td className="num text-right">{THRESHOLDS.stormWarningLevel}</td></tr>
              <tr className="border-b border-forest/10"><td className="py-1 opacity-75">Opad 72 h, próg OTWÓRZ</td><td className="num text-right">{THRESHOLDS.rain72hMm} mm</td></tr>
              <tr className="border-b border-forest/10"><td className="py-1 opacity-75">KBW 60 dni, próg suszy</td><td className="num text-right">{THRESHOLDS.droughtKbwMm} mm</td></tr>
              <tr className="border-b border-forest/10"><td className="py-1 opacity-75">Miesiące TRZYMAJ</td><td className="num text-right">{THRESHOLDS.holdMonths.join(", ")}</td></tr>
              <tr className="border-b border-forest/10"><td className="py-1 opacity-75">Wiosna (miesiące)</td><td className="num text-right">{THRESHOLDS.springMonths.join(", ")}</td></tr>
              <tr><td className="py-1 opacity-75">Opad 7 dni wiosną poniżej</td><td className="num text-right">{THRESHOLDS.springPrecip7dMm} mm</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-[12px] opacity-75">
          Wykonuje: {order.operatorPl}. Polecenie ważne 24 h. {LEGAL.permit}
        </p>
      </div>
    </div>
  );
}

export function SitePanel({
  site,
  crest,
  order,
  conditions,
  scenarioParam,
  onCrest,
  onClose,
}: {
  site: Site;
  crest: CrestHeight;
  order: Order;
  conditions: Conditions;
  scenarioParam: string;
  onCrest: (c: CrestHeight) => void;
  onClose: () => void;
}) {
  const [why, setWhy] = useState(false);
  const k = site.crests.find((c) => c.heightCm === crest)!;
  const ditch = ditches.find((d) => d.id === site.ditchId);
  const days = bufferDays(k.storageMm, conditions.et0Mm);
  const refused = k.status === "refused";

  return (
    <div className="relative flex min-h-full flex-col">
      {why && <WhyDrawer order={order} onClose={() => setWhy(false)} />}
      <div className="space-y-4 px-5 pt-4 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="eb num">MIEJSCE {site.id}</p>
            <h2 className="sh mt-1 text-[24px]">{site.name}</h2>
            <p className="num mt-0.5 text-[12px] opacity-70">
              Ranking: {site.rank} z {summary.sitesAccepted} · spadek {site.slopePct.toLocaleString("pl-PL")}% · gleba kat. {site.soilCategory} (przykład)
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusChip status={site.status} />
            <button type="button" onClick={onClose} className="text-[12px] underline opacity-70">
              Zamknij
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Eyebrow className="opacity-70">Polecenie na dziś</Eyebrow>
            <OrderBadge action={order.action} className="text-base" />
          </div>
          <StateTiles active={order.action} size="sm" />
          {order.action === "NIE_RUSZAJ" && (
            <p className="mt-2 rounded-[2px] border-2 border-forest/30 px-3 py-2 text-[13px]">
              <span className="eb">NIE RUSZAJ</span>
              {order.consult ? " · skonsultuj ze spółką wodną" : " · zostaw zastawkę bez zmian"}
            </p>
          )}
          <p className="mt-2 text-[13px] leading-snug">{order.reasons[0]}</p>
          {order.capacityFreedM3 && (
            <p className="num mt-1 text-[13px]">Zwolniona pojemność: {fmtRange(order.capacityFreedM3, "m³")}</p>
          )}
        </div>

        <div className="rounded-[4px] border border-forest/15 bg-cream p-2">
          <CrossSection site={site} crest={k} />
          <p className="mt-1 px-1 text-[11px] opacity-70">Przekrój przy zastawce z NMT 1 m. Skala pionowa powiększona.</p>
        </div>

        <CrestSlider site={site} crest={crest} onCrest={onCrest} />

        {refused && k.refusal && (
          <div className="rounded-[4px] bg-terra p-4 text-cream" role="alert">
            <p className="eb">Odrzucone · {REFUSAL_LABEL[k.refusal.code]}</p>
            <p className="sh mt-1 text-[19px] leading-snug">
              Przy {crest} cm to miejsce jest zbyt ryzykowne. Tu nie budujemy.
            </p>
            <p className="mt-2 text-[13.5px]">{k.refusal.messagePl}</p>
            {k.refusal.objectRef && !k.refusal.messagePl.includes(k.refusal.objectRef) && (
              <p className="num mt-1 text-[12px] opacity-90">
                Obiekt: działka {k.refusal.objectRef}
                {k.refusal.distanceM ? ` · ${k.refusal.distanceM} m od zastawki` : ""}
              </p>
            )}
            {site.maxAcceptedCrestCm && (
              <button type="button" onClick={() => onCrest(site.maxAcceptedCrestCm!)} className="mt-3 text-[13px] font-semibold underline">
                Wróć do {site.maxAcceptedCrestCm} cm (bezpiecznie)
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <Metric label="Retencja" value={fmtRange(k.storageM3, "m³")} tag="szacunek" />
          <Metric label="Cofka" value={`${k.backwaterM.toLocaleString("pl-PL")} m`} tag="NMT" />
          <Metric label="Nawodnienie" value={fmtRange(k.rehydratedHa, "ha")} tag="szacunek" />
          <Metric label="Zapas wody" value={days ? fmtRange(days, "dni") : "> 60 dni"} tag="szacunek" />
          <div className="col-span-2">
            <Metric label="Mniej odpływu" value={fmtRange(k.outflowAvoidedMm, "mm/sezon")} tag="literatura" />
          </div>
        </div>
        <p className="text-[11px] opacity-70">
          Zapas = zatrzymane mm ÷ ET₀ {conditions.et0Mm.toLocaleString("pl-PL")} mm/d. To nie prognoza plonu.
        </p>

        <div className="rounded-[4px] border border-forest/15 p-3 text-[13px]">
          <Eyebrow className="mb-1.5 opacity-70">Niepewność</Eyebrow>
          <dl className="space-y-1">
            <div className="flex justify-between gap-2">
              <dt className="opacity-75">Rów widoczny w NMT</dt>
              <dd className="font-semibold">{ditch?.resolvable ? "tak" : "nie"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="opacity-75">Drenowanie podziemne</dt>
              <dd className="font-semibold">nieznane</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="opacity-75">Właściciel zastawki</dt>
              <dd className="font-semibold">do potwierdzenia</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="opacity-75">Działka przy zastawce</dt>
              <dd className="num font-semibold">{shortParcel(site.ownParcels[0])}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[12px] font-semibold">{LEGAL.siteVisit}</p>
        </div>

        <div className="rounded-[4px] border border-forest/15 bg-cream p-2">
          <LongProfile site={site} crest={k} />
          <p className="mt-1 px-1 text-[11px] opacity-70">
            Profil podłużny: dno, brzeg i cofka {k.backwaterM.toLocaleString("pl-PL")} m
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" type="button" onClick={(e) => {
              e.currentTarget.closest("aside")?.scrollTo({ top: 0 });
              setWhy(true);
            }} className="flex-1">
            Dlaczego?
          </Button>
          <Button href={`/karta?site=${site.id}&crest=${crest}&scenario=${scenarioParam}`} className="flex-1">
            Karta miejsca
          </Button>
        </div>

        <div className="text-forest">
          <SourceLine>NMT 1 m (GUGiK); BDOT10k; ULDK; {conditions.sources.join(", ")}</SourceLine>
          <p className="text-[11px] opacity-70">{DEMO_NOTE}</p>
        </div>
      </div>
    </div>
  );
}

export function CandidatePanel({ cand, onClose }: { cand: Candidate; onClose: () => void }) {
  return (
    <div className="space-y-3 px-5 pt-4 pb-6">
      <div className="flex items-start justify-between">
        <p className="eb num">PUNKT {cand.id}</p>
        <button type="button" onClick={onClose} className="text-[12px] underline opacity-70">
          Zamknij
        </button>
      </div>
      <StatusChip status="refused" />
      <div className="rounded-[4px] bg-terra p-4 text-cream">
        {cand.refusalCode && <p className="eb">{REFUSAL_LABEL[cand.refusalCode]}</p>}
        <p className="sh mt-1 text-[20px]">To miejsce jest zbyt ryzykowne. Tu nie budujemy.</p>
        {cand.refusalCode && <p className="mt-2 text-[13.5px]">{REFUSAL_RULE[cand.refusalCode]}</p>}
      </div>
      <p className="text-[13px] opacity-80">{ditches.find((d) => d.id === cand.ditchId)?.name}</p>
      <p className="text-[11px] opacity-70">{DEMO_NOTE}</p>
    </div>
  );
}

export function GminaPanel({
  orders,
  conditions,
  kowrOnly,
  onSite,
}: {
  orders: Order[];
  conditions: Conditions;
  kowrOnly: boolean;
  onSite: (id: string) => void;
}) {
  const count = (a: Order["action"]) => orders.filter((o) => o.action === a).length;
  return (
    <div className="space-y-4 px-5 pt-4 pb-6">
      <div>
        <Eyebrow className="opacity-70">{GMINA.short}</Eyebrow>
        <h2 className="sh mt-1 text-[26px] leading-tight">
          <span className="num">{summary.sitesAccepted}</span>{" "}
          {plural(summary.sitesAccepted, "bezpieczne miejsce", "bezpieczne miejsca", "bezpiecznych miejsc")} na zastawkę
        </h2>
        <p className="num mt-1 text-[13px] opacity-75">
          z {summary.pointsAnalysed.toLocaleString("pl-PL")} sprawdzonych punktów na rowach
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Metric label="Retencja razem" value={fmtRange(summary.totalStorageM3, "m³")} tag="szacunek" />
        <Metric label="Nawodnienie razem" value={fmtRange(summary.totalRehydratedHa, "ha")} tag="szacunek" />
      </div>
      <div className="rounded-[4px] border border-forest/15 p-3">
        <Eyebrow className="mb-2 opacity-70">Polecenia · {conditions.labelPl.replace("Scenariusz demonstracyjny: ", "")}</Eyebrow>
        <div className="num grid grid-cols-3 gap-1 text-center text-[12px]">
          <div className="rounded-[2px] bg-forest py-2 text-cream transition-colors duration-[400ms]">
            <div className="text-[20px] font-semibold">{count("TRZYMAJ")}</div>TRZYMAJ
          </div>
          <div className="rounded-[2px] bg-water py-2 text-cream">
            <div className="text-[20px] font-semibold">{count("OTWORZ")}</div>OTWÓRZ
          </div>
          <div className="rounded-[2px] border-2 border-forest/30 py-1.5">
            <div className="text-[20px] font-semibold">{count("NIE_RUSZAJ")}</div>NIE RUSZAJ
          </div>
        </div>
      </div>
      <p className="rounded-[2px] bg-cream px-3 py-2 text-[14px] font-semibold">Zielony punkt na mapie otwiera miejsce.</p>
      <div>
        <Eyebrow className="mb-1 opacity-70">Ranking miejsc{kowrOnly ? " · KOWR (ilustracyjnie)" : ""}</Eyebrow>
        <RankingList onSite={onSite} limit={10} kowrOnly={kowrOnly} />
      </div>
      <div>
        <SourceLine>BDOT10k; NMT 1 m (GUGiK); ULDK; obliczenia TRAKTOR</SourceLine>
        <p className="text-[11px] opacity-70">{DEMO_NOTE}</p>
      </div>
    </div>
  );
}
