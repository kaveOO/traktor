"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/brand/Icon";
import { OrderBadge, StateTiles } from "@/components/brand/StateTiles";
import { Button, Callout, LevelTag, RecCard, SectionEyebrow, SourceChip } from "@/components/brand/ui";
import type { AnalysisResult, Level, Recommendation, SourceInfo } from "@/lib/analiza";
import { KbwLegend, KbwSeasonsChart } from "@/components/raport/charts";
// same threshold rule as the printed report: one line only if it agrees with every season's drought flag
import { kbwThreshold, signed } from "@/components/raport/format";
import { LEVEL_PL, fmt, fmtDateTime } from "./api";

const SECTIONS: { id: string; label: string; title: string; icon: IconName }[] = [
  { id: "ocena", label: "Ocena", title: "Ocena sytuacji wodnej", icon: "drought" },
  { id: "przyczyny", label: "Przyczyny", title: "Skąd brak wody", icon: "lidar" },
  { id: "retencja", label: "Retencja", title: "Zatrzymaj wodę na polu", icon: "board" },
  { id: "agrotechnika", label: "Agrotechnika", title: "Uprawa i gleba", icon: "tractor" },
  { id: "nawadnianie", label: "Nawadnianie", title: "Nawadnianie (opcjonalne)", icon: "water" },
  { id: "zrodla", label: "Niepewność i źródła", title: "Niepewność i źródła", icon: "pin" },
];
type SectionId = string;

const SOURCE_SHORT: Record<SourceInfo["id"], string> = {
  ULDK: "ULDK",
  OpenMeteo: "Meteo",
  IMGW: "IMGW",
  Sentinel2: "Sentinel-2",
  IUNG: "IUNG",
  SoilGrids: "SoilGrids",
  NMT: "NMT",
  BDOT10k: "BDOT10k",
  ISOK: "ISOK",
  EDO: "EDO",
};
const STATUS_PL: Record<SourceInfo["status"], string> = { ok: "pobrane", partial: "częściowe", missing: "brak danych" };
const PRIORITY_PL = { 1: "wysoki", 2: "średni", 3: "niski" } as const;
const KIND_PL: Record<Recommendation["kind"], string> = { retencja: "Retencja", agrotechnika: "Agrotechnika", nawadnianie: "Nawadnianie" };
const UNC_RANK = { niska: 1, średnia: 2, wysoka: 3 } as const;
const NA = "brak danych";

/** ISOK is never queried (link to the map only): not a failure, so no warning colour. */
const isLinkOnly = (s: SourceInfo | undefined) =>
  !!s && s.id === "ISOK" && s.status !== "ok" && /nie (pobier|sprawdz)|tylko link/i.test(`${s.label} ${s.detail} ${s.note ?? ""}`);

function LinkOnlyChip({ label }: { label: string }) {
  return (
    <span className="num inline-flex items-center gap-1 rounded-[2px] border border-forest/40 px-1.5 py-0.5 text-[10px] leading-[14px] font-semibold tracking-[0.06em] whitespace-nowrap text-forest uppercase">
      {label}
      <span className="normal-case">· tylko link</span>
    </span>
  );
}

export function SourceChips({ ids, sources, className = "mt-2" }: { ids: SourceInfo["id"][]; sources: SourceInfo[]; className?: string }) {
  if (!ids.length) return null;
  return (
    <ul className={`flex flex-wrap gap-1 ${className}`} aria-label="Źródła">
      {ids.map((id) => {
        const s = sources.find((x) => x.id === id);
        return (
          <li key={id}>
            {isLinkOnly(s) ? <LinkOnlyChip label={SOURCE_SHORT[id]} /> : <SourceChip label={SOURCE_SHORT[id]} status={s?.status ?? "missing"} />}
          </li>
        );
      })}
    </ul>
  );
}

function LevelBox({ label, level }: { label: string; level: Level | null }) {
  const l = level ? LEVEL_PL[level] : null;
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[4px] border border-forest/15 bg-cream p-4">
      <p className="eb text-forest-muted">{label}</p>
      <div>
        <LevelTag
          word={l?.word ?? null}
          rank={l?.rank ?? null}
          icon={l?.icon}
          size="md"
          meterLabel={l ? `${label}: ${l.word.toLowerCase()}, poziom ${l.rank} z 4` : `${label}: brak danych`}
        />
      </div>
    </div>
  );
}

/** Data tile: data label (Inter SemiBold 11, +14%), tabular value, optional hint, source chip. */
function Stat({
  label,
  hint,
  value,
  src,
  sources,
  neutral = false,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  src: SourceInfo["id"][];
  sources: SourceInfo[];
  /** value is "not checked" by design, not missing data */
  neutral?: boolean;
}) {
  const na = value === NA;
  return (
    <div className="flex min-w-0 flex-col rounded-[4px] border border-forest/15 bg-cream p-3">
      <dt className="eb leading-snug text-forest-muted">{label}</dt>
      <dd className={`num sh mt-1 ${na ? "text-[17px] text-terra-ink" : neutral ? "text-[17px]" : "text-[22px]"}`}>{value}</dd>
      {hint && <dd className="mt-0.5 text-[12px] leading-[1.45] text-forest-muted">{hint}</dd>}
      <dd className="mt-auto">
        <SourceChips ids={src} sources={sources} />
      </dd>
    </div>
  );
}

function IndexBar({ name, value, norm, hint }: { name: string; value: number | null; norm: number | null; hint: string }) {
  const pct = (v: number | null) => `${Math.max(0, Math.min(1, ((v ?? 0) + 0.2) / 1.2)) * 100}%`;
  return (
    <div className="mt-3">
      <p className="text-[15px]">
        <strong>{name}</strong> {hint}: <span className="num font-semibold">{fmt(value, 2)}</span>, norma{" "}
        <span className="num">{fmt(norm, 2)}</span>
        {value !== null && norm !== null && (
          <span>
            {" "}
            ({value < norm ? "poniżej" : "powyżej"} normy o <span className="num">{fmt(Math.abs(value - norm), 2)}</span>)
          </span>
        )}
      </p>
      <div className="mt-1.5 space-y-1" aria-hidden>
        <div className="flex items-center gap-2 text-forest-muted">
          <span className="eb w-14 shrink-0">Teraz</span>
          <span className="h-2.5 flex-1 rounded-[1px] bg-forest/10">
            {value !== null && (
              <span className="block h-full rounded-[1px] bg-water transition-[width] duration-[1600ms] ease-in-out motion-reduce:transition-none" style={{ width: pct(value) }} />
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-forest-muted">
          <span className="eb w-14 shrink-0">Norma</span>
          <span className="h-2.5 flex-1 rounded-[1px] bg-forest/10">
            {norm !== null && <span className="block h-full rounded-[1px] bg-forest-muted" style={{ width: pct(norm) }} />}
          </span>
        </div>
      </div>
    </div>
  );
}

function H3({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return (
    <h3 className="sh mt-6 flex items-center gap-2 text-[20px]">
      {icon && <Icon name={icon} size={20} />}
      {children}
    </h3>
  );
}

const isBoard = (rec: Recommendation) => /zastawk/i.test(`${rec.titlePl} ${rec.howPl}`);
const STORM_RE = /burz|ulew|opad|deszcz|wezbr/i;

/** Board mode implied by today's assessment: storm warning = OTWÓRZ, drought risk = TRZYMAJ, else NIE RUSZAJ. */
function boardMode(r: AnalysisResult): "TRZYMAJ" | "OTWORZ" | "NIE_RUSZAJ" {
  if (r.assessment.meteo.warnings.some((w) => STORM_RE.test(w.event))) return "OTWORZ";
  const rank = r.assessment.currentLevel ? LEVEL_PL[r.assessment.currentLevel].rank : 0;
  return rank >= 2 ? "TRZYMAJ" : "NIE_RUSZAJ";
}

function BoardModes({ r }: { r: AnalysisResult }) {
  const mode = boardMode(r);
  return (
    <div className="mt-4 border-t border-forest/15 pt-3">
      <p className="eb text-forest-muted">Tryb zastawki po montażu · orientacyjnie</p>
      <p className="mt-1 text-[12px] leading-[1.45] text-forest-muted">
        Ostrzeżenie o burzy: OTWÓRZ. Ryzyko suszy od umiarkowanego: TRZYMAJ. Inaczej: NIE RUSZAJ.
      </p>
      <div className="mt-2">
        {mode === "NIE_RUSZAJ" ? (
          <p className="flex flex-wrap items-center gap-2 text-[14px]">
            <OrderBadge action="NIE_RUSZAJ" className="!text-[16px]" />
            Woda w normie. Zastawka zostaje, jak stoi.
          </p>
        ) : (
          <StateTiles active={mode} size="sm" />
        )}
      </div>
    </div>
  );
}

/** SMSR season is 21.III–30.IX; outside it SMSR does not assess drought. */
const inSmsrSeason = (date: string) => {
  const md = date.slice(5);
  return md >= "03-21" && md <= "09-30";
};

export default function Results({
  r,
  activeRec,
  onSelectRec,
  markerNumber,
  fixture,
}: {
  r: AnalysisResult;
  activeRec: string | null;
  onSelectRec: (id: string) => void;
  markerNumber: (id: string) => number;
  fixture: boolean;
}) {
  const [tab, setTab] = useState<SectionId>("ocena");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const a = r.assessment;
  const m = a.meteo;
  const S = r.sources;
  const idx = SECTIONS.findIndex((s) => s.id === tab);
  const sec = SECTIONS[idx];

  const thr = kbwThreshold(r);
  const thrName = thr.kind === "smsr" ? "próg SMSR" : "próg IUNG";
  const completed = m.seasons.filter((s) => !s.inProgress);
  const inProgress = m.seasons.find((s) => s.inProgress);
  const smsrWin = m.smsrWindowPl ?? null;
  const smsrThr = typeof m.smsrThresholdMm === "number" ? m.smsrThresholdMm : null;
  const smsrKbw = typeof m.smsrKbwMm === "number" ? m.smsrKbwMm : null;
  const isok = S.find((s) => s.id === "ISOK");
  const isokLinkOnly = isLinkOnly(isok);
  const llm = r.textSource === "llm";

  const go = (i: number, focus = true) => {
    const j = (i + SECTIONS.length) % SECTIONS.length;
    setTab(SECTIONS[j].id);
    if (focus) tabRefs.current[j]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const to =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? idx + 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? idx - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? SECTIONS.length - 1
              : null;
    if (to === null) return;
    e.preventDefault();
    go(to);
  };
  const recs = (k: Recommendation["kind"]) =>
    r.recommendations.filter((x) => x.kind === k).sort((p, q) => p.priority - q.priority);
  const causeTitle = (id: string) => r.causes.find((c) => c.id === id)?.titlePl ?? null;

  /** "Na podstawie": the causes the engine linked (rec.basedOn), each with its evidence. */
  const basedOn = (rec: Recommendation): ReactNode => {
    const titles = rec.basedOn.map((id) => causeTitle(id)).filter((t): t is string => !!t);
    if (!titles.length) return <span className="text-terra-ink">brak przypisanej przyczyny w danych</span>;
    return (
      <>
        {titles.join("; ")}.{" "}
        <button type="button" onClick={() => go(1)} className="min-h-6 text-left font-medium underline underline-offset-2">
          Zobacz dane w zakładce Przyczyny
        </button>
      </>
    );
  };

  const recList = (k: Recommendation["kind"], empty: string) => {
    const list = recs(k);
    if (!list.length) return empty ? <p className="mt-3 text-[15px] leading-[1.45]">{empty}</p> : null;
    return (
      <ul className="mt-3 space-y-3">
        {list.map((rec) => {
          const n = markerNumber(rec.id);
          const active = activeRec === rec.id;
          return (
            <RecCard
              key={rec.id}
              id={`rec-${rec.id}`}
              eyebrow={`${KIND_PL[rec.kind]} · priorytet ${PRIORITY_PL[rec.priority]}`}
              title={rec.titlePl}
              n={rec.location ? n : undefined}
              icon={rec.kind === "retencja" ? (isBoard(rec) ? "board" : "ditch") : rec.kind === "agrotechnika" ? "tractor" : "water"}
              active={active}
              rows={[
                { k: "Na podstawie", v: basedOn(rec) },
                { k: "Dlaczego", v: rec.whyPl },
                { k: "Co zrobić", v: rec.howPl },
                ...(rec.wherePl ? [{ k: "Gdzie", v: rec.wherePl }] : []),
              ]}
              legal={rec.legalPl}
              chips={<SourceChips ids={rec.sources} sources={S} />}
            >
              {rec.kind === "retencja" && isBoard(rec) && <BoardModes r={r} />}
              {rec.location && (
                <Button
                  type="button"
                  variant={active ? "primary" : "secondary"}
                  onClick={() => onSelectRec(rec.id)}
                  aria-pressed={active}
                  className="mt-4 !min-h-11 !px-4 !text-[14px]"
                >
                  <Icon name="pin" size={18} />
                  {active ? "Zaznaczone na mapie" : `Pokaż na mapie (znacznik ${n})`}
                </Button>
              )}
            </RecCard>
          );
        })}
      </ul>
    );
  };

  const irr = r.irrigation;
  const irrOutOfSeason = irr?.decision === "nie_teraz" && irr.deficitMm === null;

  return (
    <section aria-labelledby="wyniki-h" className="analiza-results mt-2 min-w-0 [overflow-wrap:anywhere] [&_.eb]:[overflow-wrap:normal] [&_.hd]:[overflow-wrap:normal]">
      <p className="eb text-forest-muted">Wynik</p>
      <h2 id="wyniki-h" tabIndex={-1} className="hd rise mt-1 text-[36px] outline-none">
        Wynik analizy
        <span className="sr-only">
          . Ryzyko suszy na dzień analizy: {a.currentLevel ? LEVEL_PL[a.currentLevel].word.toLowerCase() : NA}.
        </span>
      </h2>
      <dl className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-[14px]">
        <dt className="eb text-forest-muted">Uprawa</dt>
        <dd>{r.crop.namePl}</dd>
        <dt className="eb text-forest-muted">Działka</dt>
        <dd className="num break-all">
          {r.parcel.id} · {fmt(r.parcel.areaHa, 2, "ha")}
        </dd>
        <dt className="eb text-forest-muted">Na dzień</dt>
        <dd className="num">{r.request.date}</dd>
        <dt className="eb text-forest-muted">Policzono</dt>
        <dd className="num">
          {fmtDateTime(r.generatedAt)}
          {r.durationMs ? ` · ${fmt(r.durationMs / 1000, 1, "s")}` : ""}
        </dd>
      </dl>
      {fixture && (
        <Callout tone="warning" icon="pin" title="Dane przykładowe" className="mt-3">
          To nie wynik obliczeń. Tylko do pokazu ekranu.
        </Callout>
      )}

      <div role="tablist" aria-label="Części wyniku" aria-orientation="horizontal" className="mt-5 grid grid-cols-3 gap-1.5" onKeyDown={onKey}>
        {SECTIONS.map((s, i) => {
          const on = tab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              ref={(n) => {
                tabRefs.current[i] = n;
              }}
              role="tab"
              id={`tab-${s.id}`}
              aria-controls={on ? `panel-${s.id}` : undefined}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(s.id)}
              className={`flex min-h-12 min-w-0 flex-col items-start justify-center rounded-[2px] border-[1.5px] px-2.5 py-1.5 text-left transition-colors duration-[400ms] ${
                on ? "border-forest bg-forest text-cream" : "border-forest/50 bg-cream text-forest hover:brightness-[.94]"
              }`}
            >
              <span className={`eb num !text-[10px] ${on ? "text-cream-muted" : "text-forest-muted"}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[13px] leading-tight font-semibold">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="mt-5 min-w-0">
        <SectionEyebrow no={idx + 1} className="text-forest-muted">
          {sec.label}
        </SectionEyebrow>
        <h3 key={tab} className="sh rise mt-1 flex items-center gap-2 text-[26px] leading-[1.15]">
          <Icon name={sec.icon} size={24} className="shrink-0" />
          {sec.title}
        </h3>

        {tab === "ocena" && (
          <>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <LevelBox label="Ryzyko suszy na dzień analizy" level={a.currentLevel} />
              <LevelBox label="Podatność, 10 sezonów" level={a.historicalLevel} />
            </div>
            <p className="mt-4 text-[16px] leading-[1.5]">{a.summaryPl}</p>
            {llm && <p className="mt-1 text-[12px] text-forest-muted">Tekst przeredagowany przez model językowy. Liczby z analizy.</p>}

            {/* the window that drove the verdict */}
            <div className="mt-4 rounded-[4px] border border-forest/15 bg-cream p-4">
              <p className="eb text-forest-muted">Podstawa oceny · SMSR (IUNG-PIB)</p>
              {smsrWin ? (
                <>
                  <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                    <div className="min-w-0">
                      <dt className="eb !text-[10px] text-forest-muted">Najgorsze okno</dt>
                      <dd className="num sh mt-0.5 text-[17px]">{smsrWin}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="eb !text-[10px] text-forest-muted">KBW</dt>
                      <dd className="num sh mt-0.5 text-[17px]">{signed(smsrKbw, 0, "mm")}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="eb !text-[10px] text-forest-muted">Próg SMSR</dt>
                      <dd className="num sh mt-0.5 text-[17px]">{smsrThr === null ? "brak progu" : signed(smsrThr, 0, "mm")}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-[13px] leading-[1.45]">
                    {smsrKbw !== null && smsrThr !== null
                      ? smsrKbw < smsrThr
                        ? "Bilans poniżej progu: susza w tym oknie."
                        : `Bilans ${fmt(smsrKbw - smsrThr)} mm nad progiem: bez suszy w tym oknie.`
                      : "Okno 60 dni w sezonie 21.III–30.IX, liczone do daty analizy."}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[14px] leading-[1.45]">
                  {inSmsrSeason(r.request.date)
                    ? "Brak progu SMSR dla tej uprawy i gleby w oknach do tej daty. Ocena z percentyla bilansu na tle 10 lat."
                    : "Data poza sezonem SMSR (21.III–30.IX). SMSR nie ocenia wtedy suszy. Poziom z ostatniego sezonu i gleby."}
                </p>
              )}
              {m.etpMethodPl && <p className="mt-1 text-[12px] leading-[1.45] text-forest-muted">Parowanie: {m.etpMethodPl}.</p>}
              <SourceChips ids={["OpenMeteo", "IUNG"]} sources={S} />
            </div>

            {m.warnings.length > 0 && (
              <Callout tone="warning" icon="storm" title="Ostrzeżenia IMGW" className="mt-4" role="note">
                <ul className="mt-1 space-y-0.5">
                  {m.warnings.map((w) => (
                    <li key={w.event + w.validTo}>
                      {w.event}, stopień <span className="num">{w.level}</span>, do <span className="num">{fmtDateTime(w.validTo)}</span>
                    </li>
                  ))}
                </ul>
              </Callout>
            )}

            <H3 icon="storm">Pogoda</H3>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              <Stat
                label="KBW 60 dni"
                hint={`opad − parowanie${m.etpMethodPl ? `, ${m.etpMethodPl.replace(/\s*\(.*\)$/, "")}` : ""}`}
                value={signed(m.kbw60Mm, 0, "mm")}
                src={["OpenMeteo"]}
                sources={S}
              />
              <Stat
                label="Percentyl, 10 lat"
                hint="0 = najsuchszy rok"
                value={m.kbw60Percentile === null ? NA : fmt(m.kbw60Percentile)}
                src={["OpenMeteo"]}
                sources={S}
              />
              <Stat
                label="Opad 30 dni"
                hint={`norma ${fmt(m.precip30NormMm, 0, "mm")}`}
                value={fmt(m.precip30Mm, 0, "mm")}
                src={["OpenMeteo"]}
                sources={S}
              />
              <Stat
                label="Potrzeby wody 30 dni"
                hint={`ETc = ET₀ ${fmt(m.et0_30Mm, 0, "mm")} × Kc`}
                value={fmt(m.etc30Mm, 0, "mm")}
                src={["OpenMeteo"]}
                sources={S}
              />
              <Stat label="Śr. temp. maks. 30 dni" value={fmt(m.tmax30MeanC, 1, "°C")} src={["OpenMeteo"]} sources={S} />
              <Stat label="Najdłużej bez deszczu" hint="dni z opadem < 1 mm, ostatnie 60 dni" value={fmt(m.dryDaysMax, 0, "dni")} src={["OpenMeteo"]} sources={S} />
              <Stat
                label="Sezony z suszą"
                hint={`zakończone sezony${inProgress ? `; ${inProgress.year} w toku, nie liczony` : ""}`}
                value={m.droughtYears === null || !completed.length ? NA : `${m.droughtYears} z ${completed.length}`}
                src={["OpenMeteo", "IUNG"]}
                sources={S}
              />
            </dl>

            <figure className="mt-4 min-w-0 rounded-[4px] border border-forest/15 bg-cream p-3">
              <figcaption className="text-[14px] leading-[1.45] font-medium">
                Najgorsze okno 60 dni w sezonie (21.III–30.IX), <span className="num">{m.seasons.length}</span> sezonów, od najstarszego
              </figcaption>
              <div className="mt-2">
                <KbwSeasonsChart
                  seasons={thr.seasons}
                  thresholdMm={thr.line}
                  perSeason={thr.perSeason}
                  thresholdKind={thr.kind}
                  periodPl="najgorsze okno 60 dni, 21.III–30.IX"
                  fs={10}
                  idPrefix="an-kbw"
                  className="w-full"
                />
              </div>
              <KbwLegend className="mt-2" threshold={thr.line !== null ? "line" : thr.perSeason ? "ticks" : "none"} kind={thr.kind} />
              <p className="mt-2 text-[12px] leading-[1.45] text-forest-muted">
                {thr.line !== null
                  ? `${thrName[0].toUpperCase()}${thrName.slice(1)}: ${signed(thr.line, 0, "mm")}${thr.kind === "iung" ? " (do kalibracji)" : ""}.`
                  : thr.perSeason
                    ? `${thrName[0].toUpperCase()}${thrName.slice(1)} zależy od okna, więc jest inny w każdym sezonie.`
                    : thr.dropped
                      ? "Linii progu nie rysujemy: uproszczony próg IUNG nie zgadza się z oceną sezonów."
                      : "Brak progu: brak kategorii gleby."}
                {inProgress ? ` Sezon ${inProgress.year} w toku: okna do daty analizy.` : ""}
              </p>
              {m.seasons.length > 0 && (
                <details className="mt-2 text-[13px]">
                  <summary className="min-h-11 cursor-pointer py-2 font-medium underline underline-offset-2">Sezony w liczbach</summary>
                  <ul className="num divide-y divide-forest/10 border-y border-forest/15">
                    {thr.seasons.map((s) => (
                      <li key={s.year} className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-2 py-1.5">
                        <span className="font-semibold">{s.year}</span>
                        <span className="min-w-0">
                          {s.windowPl ?? "okno: brak danych"}
                          {typeof s.thresholdMm === "number" ? ` · próg ${signed(s.thresholdMm, 0, "mm")}` : ""}
                          {s.inProgress ? " · w toku" : ""}
                        </span>
                        <span className={`text-right ${s.drought ? "font-semibold text-terra-ink" : ""}`}>
                          {signed(s.kbwCriticalMm, 0, "mm")}
                          {s.drought ? " · susza" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </figure>

            <H3 icon="lidar">Rośliny z satelity</H3>
            {a.satellite.sceneDate ? (
              <>
                <p className="mt-1 text-[14px] text-forest-muted">
                  Scena Sentinel-2 z <span className="num">{a.satellite.sceneDate}</span>, chmury{" "}
                  <span className="num">{fmt(a.satellite.cloudPct, 0, "%")}</span>.
                </p>
                <IndexBar name="NDVI" hint="(zieleń roślin)" value={a.satellite.ndvi} norm={a.satellite.ndviNorm} />
                <IndexBar name="NDMI" hint="(woda w liściach)" value={a.satellite.ndmi} norm={a.satellite.ndmiNorm} />
                {a.satellite.anomalyPl && <p className="mt-3 text-[15px] leading-[1.45]">{a.satellite.anomalyPl}</p>}
              </>
            ) : (
              <p className="mt-1 text-[15px] text-terra-ink">Brak danych satelitarnych dla tej daty.</p>
            )}
            <SourceChips ids={["Sentinel2"]} sources={S} />

            <H3 icon="ditch">Gleba i teren</H3>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              <Stat
                label="Kategoria IUNG"
                hint="podatność na suszę, I = największa"
                value={a.soil.iungCategory ? `kat. ${a.soil.iungCategory}` : NA}
                src={["IUNG"]}
                sources={S}
              />
              <Stat label="Gleba" value={a.soil.textureClassPl ?? NA} src={["SoilGrids"]} sources={S} />
              <Stat label="Woda dla korzeni" hint="AWC w strefie korzeni" value={fmt(a.soil.awcMm, 0, "mm")} src={["SoilGrids"]} sources={S} />
              <Stat
                label="Piasek / ił"
                value={a.soil.sandPct === null && a.soil.clayPct === null ? NA : `${fmt(a.soil.sandPct)} / ${fmt(a.soil.clayPct, 0, "%")}`}
                src={["SoilGrids"]}
                sources={S}
              />
              <Stat
                label="Wysokość terenu"
                value={a.terrain.elevMin === null ? NA : `${fmt(a.terrain.elevMin, 1)}–${fmt(a.terrain.elevMax, 1, "m")}`}
                src={["NMT"]}
                sources={S}
              />
              <Stat label="Średni spadek" value={fmt(a.terrain.slopePct, 1, "%")} src={["NMT"]} sources={S} />
              <Stat label="Najbliższy rów lub ciek" value={fmt(a.terrain.ditchDistM, 0, "m")} src={["BDOT10k"]} sources={S} />
              <Stat
                label="Strefa zalewowa"
                neutral={a.terrain.floodZone === null && isokLinkOnly}
                value={a.terrain.floodZone === null ? (isokLinkOnly ? "nie sprawdzane" : NA) : a.terrain.floodZone ? "tak" : "nie"}
                hint={
                  a.terrain.floodZone === null && isok?.url ? (
                    <a href={isok.url} target="_blank" rel="noopener" className="font-medium text-forest underline underline-offset-2">
                      Sprawdź na mapie ISOK
                      <span className="sr-only"> (otwiera się w nowej karcie)</span>
                    </a>
                  ) : undefined
                }
                src={["ISOK"]}
                sources={S}
              />
            </dl>
          </>
        )}

        {tab === "przyczyny" &&
          (r.causes.length ? (
            <ul className="mt-4 space-y-3">
              {[...r.causes]
                .sort((p, q) => q.weight - p.weight)
                .map((c) => {
                  const follow = r.recommendations.filter((x) => x.basedOn.includes(c.id));
                  return (
                    <RecCard
                      key={c.id}
                      eyebrow={`Przyczyna · waga ${c.weight === 3 ? "duża" : c.weight === 2 ? "średnia" : "mała"}`}
                      title={c.titlePl}
                      rows={[
                        { k: "Dane", v: c.evidencePl },
                        {
                          k: "Zalecenia",
                          v: follow.length ? follow.map((x) => x.titlePl).join("; ") : "brak zaleceń z tej przyczyny",
                        },
                      ]}
                      chips={
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <SourceChips ids={c.sources} sources={S} className="" />
                          <span className="inline-flex items-center gap-1.5 text-forest-muted">
                            <span className="eb">Waga</span>
                            <WeightMeter w={c.weight} />
                          </span>
                        </div>
                      }
                    />
                  );
                })}
            </ul>
          ) : (
            <p className="mt-4 text-[15px] leading-[1.45]">Dane nie wskazują przyczyn niedoboru wody. Bez przyczyny nie dajemy zaleceń.</p>
          ))}

        {tab === "retencja" && recList("retencja", "Brak zaleceń retencyjnych: dane nie wskazują przyczyny, która by je uzasadniała.")}

        {tab === "agrotechnika" && recList("agrotechnika", "Brak zaleceń agrotechnicznych: dane nie wskazują przyczyny, która by je uzasadniała.")}

        {tab === "nawadnianie" && (
          <>
            {irr ? (
              <div className="mt-4 rounded-[4px] border-2 border-forest/15 bg-cream p-5">
                <p className="eb text-forest-muted">Decyzja na dzień analizy</p>
                <p className="hd mt-2 flex items-center gap-2 text-[30px]">
                  <Icon name="water" size={26} className="shrink-0" />
                  {irr.decision === "tak" ? "Nawadniaj" : irr.decision === "rozwaz" ? "Rozważ nawadnianie" : "Nie nawadniaj teraz"}
                </p>
                <p className="mt-3 text-[15px] leading-[1.45]">{irr.reasonPl}</p>
                <dl className="mt-4 grid grid-cols-2 gap-2">
                  <div className="min-w-0 rounded-[4px] border border-forest/15 p-3">
                    <dt className="eb text-forest-muted">Niedobór wody</dt>
                    <dd className={`num sh mt-1 ${irr.deficitMm === null && !irrOutOfSeason ? "text-[17px] text-terra-ink" : irr.deficitMm === null ? "text-[17px]" : "text-[22px]"}`}>
                      {irr.deficitMm === null && irrOutOfSeason ? "nie dotyczy" : fmt(irr.deficitMm, 0, "mm")}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-[4px] border border-forest/15 p-3">
                    <dt className="eb text-forest-muted">Dawka</dt>
                    <dd className={`num sh mt-1 ${irr.doseMm === null ? "text-[17px]" : "text-[22px]"}`}>
                      {irr.doseMm === null ? (irr.decision === "nie_teraz" ? "0 mm" : NA) : fmt(irr.doseMm, 0, "mm")}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-[15px] leading-[1.45]">
                  <span className="eb mr-2 text-forest-muted">Kiedy</span>
                  {irr.timingPl}
                </p>
                <SourceChips ids={["OpenMeteo", "SoilGrids"]} sources={S} />
              </div>
            ) : (
              <p className="mt-4 text-[15px] leading-[1.45]">Nawadniania nie oceniamy dla tej uprawy i daty.</p>
            )}
            {recList("nawadnianie", "")}
          </>
        )}

        {tab === "zrodla" && (
          <>
            <div className="mt-4 rounded-[4px] border border-forest/15 bg-cream p-4">
              <p className="eb text-forest-muted">Niepewność wyniku</p>
              <div className="mt-2">
                <LevelTag
                  word={r.uncertainty.level}
                  rank={UNC_RANK[r.uncertainty.level]}
                  of={3}
                  icon="lidar"
                  meterLabel={`Niepewność ${r.uncertainty.level}, poziom ${UNC_RANK[r.uncertainty.level]} z 3`}
                />
              </div>
              {r.uncertainty.reasonsPl.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] leading-[1.45]">
                  {r.uncertainty.reasonsPl.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
            </div>
            <H3>Brak danych</H3>
            {r.uncertainty.missingPl.length ? (
              <ul className="mt-2 space-y-1 text-[15px] leading-[1.45]">
                {r.uncertainty.missingPl.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span aria-hidden className="mt-[10px] inline-block h-0 w-3 shrink-0 border-t-[1.5px] border-dashed border-terra" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px]">Wszystkie źródła odpowiedziały.</p>
            )}
            <H3>Czego nie uwzględniamy</H3>
            {r.uncertainty.notConsideredPl.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-[1.45]">
                {r.uncertainty.notConsideredPl.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px]">{NA}</p>
            )}

            <H3>Źródła danych</H3>
            <dl className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-[13px]">
              <dt className="eb text-forest-muted">Policzono</dt>
              <dd className="num">
                {fmtDateTime(r.generatedAt)}
                {r.durationMs ? ` · ${fmt(r.durationMs / 1000, 1, "s")}` : ""}
              </dd>
              <dt className="eb text-forest-muted">Metoda</dt>
              <dd className="min-w-0">{r.methodVersion ?? "wersja nieznana"}</dd>
              <dt className="eb text-forest-muted">Tekst</dt>
              <dd>{llm ? "przeredagowany przez model językowy, liczby z analizy" : "z szablonu, bez modelu językowego"}</dd>
            </dl>
            <ul className="mt-3 space-y-2" aria-label="Źródła danych użyte w analizie">
              {S.map((s) => {
                const link = isLinkOnly(s);
                return (
                  <li key={s.id} className="min-w-0 rounded-[4px] border border-forest/15 bg-cream p-3 text-[13px] leading-[1.45]">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <p className="min-w-0 font-semibold">
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noopener" className="underline underline-offset-2">
                            {s.label}
                            <span className="sr-only"> (otwiera się w nowej karcie)</span>
                          </a>
                        ) : (
                          s.label
                        )}
                      </p>
                      <SourceStatus s={s} linkOnly={link} />
                    </div>
                    <p className="mt-1 text-forest-muted">{s.detail}</p>
                    {s.note && <p className="mt-1">{s.note}</p>}
                    <dl className="num mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      <dt className="eb !text-[10px] text-forest-muted">Pobrano</dt>
                      <dd>{link ? "nie pobierane" : s.status === "missing" ? `próba ${fmtDateTime(s.fetchedAt)}` : fmtDateTime(s.fetchedAt)}</dd>
                      {!link && (
                        <>
                          <dt className="eb !text-[10px] text-forest-muted">Czas</dt>
                          <dd>{fmt(s.ms / 1000, 1, "s")}</dd>
                        </>
                      )}
                      <dt className="eb !text-[10px] text-forest-muted">Licencja</dt>
                      <dd className="min-w-0">{s.license || NA}</dd>
                    </dl>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[13px] leading-[1.45] text-forest-muted">
              Progi suszy SMSR (IUNG-PIB) są do kalibracji. Pogoda to dane regionalne, nie pomiar na tym polu. Każde zalecenie wymaga wizji lokalnej.
            </p>
          </>
        )}

        <nav aria-label="Kolejna część wyniku" className="mt-6 flex flex-wrap justify-between gap-2">
          {idx > 0 ? (
            <Button type="button" variant="secondary" onClick={() => go(idx - 1)} className="!min-h-11 !px-3 !text-[14px]">
              <span aria-hidden>←</span> {SECTIONS[idx - 1].label}
            </Button>
          ) : (
            <span />
          )}
          {idx < SECTIONS.length - 1 && (
            <Button type="button" onClick={() => go(idx + 1)} className="!min-h-11 !px-3 !text-[14px]">
              Dalej: {SECTIONS[idx + 1].label} <span aria-hidden>→</span>
            </Button>
          )}
        </nav>
      </div>
    </section>
  );
}

/** Source state: word + shape. Missing / partial = dashed terracotta; ISOK link-only = neutral outline. */
function SourceStatus({ s, linkOnly }: { s: SourceInfo; linkOnly: boolean }) {
  const ok = s.status === "ok";
  const cls = linkOnly
    ? "border-forest/40 text-forest"
    : ok
      ? "border-agri text-agri-ink"
      : "border-dashed border-terra font-semibold text-terra-ink";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-[2px] border px-1.5 text-[12px] whitespace-nowrap ${cls}`}>
      <span
        aria-hidden
        className={`inline-block size-1.5 rounded-full ${linkOnly ? "border border-forest" : ok ? "bg-agri" : "border border-terra"}`}
      />
      {linkOnly ? "nie pobierane (tylko link)" : STATUS_PL[s.status]}
    </span>
  );
}

/** Cause weight 1..3 as forest segments (weight is not a risk level, so no warning colour). */
function WeightMeter({ w }: { w: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={`Waga ${w} z 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`inline-block h-2 w-4 rounded-[1px] border-[1.5px] border-forest ${i <= w ? "bg-forest" : ""}`} />
      ))}
    </span>
  );
}
