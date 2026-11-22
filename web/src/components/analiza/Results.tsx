"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/brand/Icon";
import { OrderBadge, StateTiles } from "@/components/brand/StateTiles";
import { Button, Callout, LevelTag, RecCard, SectionEyebrow, SourceChipList } from "@/components/brand/ui";
import { getCrop, type AnalysisResult, type Level, type Recommendation, type SourceInfo } from "@/lib/analiza";
import { KbwLegend, KbwSeasonsChart } from "@/components/raport/charts";
import { LEVEL_PL, fmt } from "./api";

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
  OpenMeteo: "Open-Meteo",
  IMGW: "IMGW",
  Sentinel2: "Sentinel-2",
  IUNG: "IUNG",
  SoilGrids: "SoilGrids",
  NMT: "NMT",
  BDOT10k: "BDOT10k",
  ISOK: "ISOK",
  EDO: "EDO",
};
const STATUS_PL: Record<SourceInfo["status"], string> = { ok: "dostępne", partial: "częściowe", missing: "brak danych" };
const PRIORITY_PL = { 1: "wysoki", 2: "średni", 3: "niski" } as const;
const KIND_PL: Record<Recommendation["kind"], string> = { retencja: "Retencja", agrotechnika: "Agrotechnika", nawadnianie: "Nawadnianie" };
const UNC_RANK = { niska: 1, średnia: 2, wysoka: 3 } as const;

export function SourceChips({ ids, sources }: { ids: SourceInfo["id"][]; sources: SourceInfo[] }) {
  return (
    <SourceChipList
      className="mt-2"
      items={ids.map((id) => ({ id, label: SOURCE_SHORT[id], status: sources.find((x) => x.id === id)?.status ?? "missing" }))}
    />
  );
}

function LevelBox({ label, level }: { label: string; level: Level | null }) {
  const l = level ? LEVEL_PL[level] : null;
  return (
    <div className="flex-1 rounded-[4px] border border-forest/15 bg-cream p-4">
      <p className="eb text-forest-muted">{label}</p>
      <div className="mt-2">
        <LevelTag
          word={l?.word ?? null}
          rank={l?.rank ?? null}
          icon={l?.icon}
          size="md"
          meterLabel={l ? `Ryzyko ${l.word.toLowerCase()}, poziom ${l.rank} z 4` : "Poziom nieznany"}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, src, sources }: { label: string; value: string; src: SourceInfo["id"]; sources: SourceInfo[] }) {
  const na = value === "brak danych";
  return (
    <div className="rounded-[4px] border border-forest/15 bg-cream p-3">
      <dt className="text-[13px] leading-snug text-forest-muted">{label}</dt>
      <dd className={`num sh mt-1 text-[22px] ${na ? "text-[17px] text-terra-ink" : ""}`}>{value}</dd>
      <dd>
        <SourceChips ids={[src]} sources={sources} />
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
        <div className="flex items-center gap-2 text-[11px] text-forest-muted">
          <span className="eb w-12">Teraz</span>
          <span className="h-2.5 flex-1 rounded-[1px] bg-forest/10">
            <span className="block h-full rounded-[1px] bg-water transition-[width] duration-[1600ms] ease-in-out" style={{ width: pct(value) }} />
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-forest-muted">
          <span className="eb w-12">Norma</span>
          <span className="h-2.5 flex-1 rounded-[1px] bg-forest/10">
            <span className="block h-full rounded-[1px] bg-forest-muted" style={{ width: pct(norm) }} />
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
      <p className="eb text-forest-muted">Tryb zastawki po montażu · wskazanie orientacyjne</p>
      <p className="mt-1 text-[12px] leading-snug text-forest-muted">
        Z oceny na dziś: ostrzeżenie o burzy = OTWÓRZ, ryzyko suszy od umiarkowanego = TRZYMAJ, inaczej NIE RUSZAJ.
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

  const crop = getCrop(r.crop.id);
  const cat = a.soil.iungCategory;
  const threshold = crop.iungKbw[cat ? ["I", "II", "III", "IV"].indexOf(cat) : 1];
  const months = crop.critical.join(", ");

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
  const causeTitle = (id: string) => r.causes.find((c) => c.id === id)?.titlePl ?? id;

  const recList = (k: Recommendation["kind"], empty: string) => {
    const list = recs(k);
    if (!list.length) return empty ? <p className="mt-3 text-[15px]">{empty}</p> : null;
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

  return (
    <section aria-labelledby="wyniki-h" className="mt-2">
      <p className="eb text-forest-muted">Wynik</p>
      <h2 id="wyniki-h" tabIndex={-1} className="hd rise mt-1 text-[36px] outline-none">
        Wynik analizy
        <span className="sr-only">
          . Ryzyko suszy dziś: {a.currentLevel ? LEVEL_PL[a.currentLevel].word.toLowerCase() : "brak danych"}.
        </span>
      </h2>
      <p className="mt-2 text-[14px] text-forest-muted">
        {r.crop.namePl} · działka <span className="num">{r.parcel.id}</span> · <span className="num">{r.request.date}</span>
        {r.durationMs ? (
          <>
            {" "}
            · <span className="num">{fmt(r.durationMs / 1000, 1)} s</span>
          </>
        ) : null}
      </p>
      {fixture && (
        <Callout tone="warning" icon="pin" title="Dane przykładowe" className="mt-3">
          To nie wynik obliczeń. Tylko do pokazu ekranu.
        </Callout>
      )}

      <div role="tablist" aria-label="Części wyniku" className="mt-5 grid grid-cols-3 gap-1.5" onKeyDown={onKey}>
        {SECTIONS.map((s, i) => {
          const on = tab === s.id;
          return (
            <button
              key={s.id}
              ref={(n) => {
                tabRefs.current[i] = n;
              }}
              role="tab"
              id={`tab-${s.id}`}
              aria-controls={`panel-${s.id}`}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(s.id)}
              className={`flex min-h-12 flex-col items-start justify-center rounded-[2px] border-[1.5px] px-2.5 py-1.5 text-left transition-colors duration-[400ms] ${
                on ? "border-forest bg-forest text-cream" : "border-forest/30 bg-cream text-forest hover:brightness-[.94]"
              }`}
            >
              <span className={`eb num !text-[10px] ${on ? "text-cream-muted" : "text-forest-muted"}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[13px] leading-tight font-semibold">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="mt-5">
        <SectionEyebrow no={idx + 1} className="text-forest-muted">
          {sec.label}
        </SectionEyebrow>
        <h3 key={tab} className="sh rise mt-1 flex items-center gap-2 text-[26px] leading-[1.15]">
          <Icon name={sec.icon} size={24} />
          {sec.title}
        </h3>

        {tab === "ocena" && (
          <>
            <div className="mt-4 flex gap-2">
              <LevelBox label="Ryzyko suszy dziś" level={a.currentLevel} />
              <LevelBox label="Podatność, 10 lat" level={a.historicalLevel} />
            </div>
            <p className="mt-4 text-[16px] leading-[1.5]">{a.summaryPl}</p>
            {m.warnings.length > 0 && (
              <Callout tone="warning" icon="storm" title="Ostrzeżenia IMGW" className="mt-4" role="note">
                <ul className="mt-1 space-y-0.5">
                  {m.warnings.map((w) => (
                    <li key={w.event + w.validTo}>
                      {w.event}, stopień <span className="num">{w.level}</span>, do <span className="num">{w.validTo}</span>
                    </li>
                  ))}
                </ul>
              </Callout>
            )}

            <H3 icon="storm">Pogoda</H3>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              <Stat label="Bilans wodny 60 dni (opad − parowanie)" value={fmt(m.kbw60Mm, 0, "mm")} src="OpenMeteo" sources={S} />
              <Stat
                label="Na tle 10 lat (percentyl, 0 = najsuchszy)"
                value={m.kbw60Percentile === null ? "brak danych" : `${m.kbw60Percentile}.`}
                src="OpenMeteo"
                sources={S}
              />
              <Stat label="Opad 30 dni / norma" value={`${fmt(m.precip30Mm)} / ${fmt(m.precip30NormMm, 0, "mm")}`} src="OpenMeteo" sources={S} />
              <Stat label="Potrzeby wodne uprawy 30 dni" value={fmt(m.etc30Mm, 0, "mm")} src="OpenMeteo" sources={S} />
              <Stat label="Średnia temp. maks. 30 dni" value={fmt(m.tmax30MeanC, 1, "°C")} src="OpenMeteo" sources={S} />
              <Stat label="Najdłużej bez deszczu (60 dni)" value={fmt(m.dryDaysMax, 0, "dni")} src="OpenMeteo" sources={S} />
              <Stat
                label="Sezony z suszą (z ostatnich 10)"
                value={m.droughtYears === null ? "brak danych" : `${m.droughtYears} z ${m.seasons.length || 10}`}
                src="OpenMeteo"
                sources={S}
              />
            </dl>

            <figure className="mt-4 rounded-[4px] border border-forest/15 bg-cream p-3">
              <figcaption className="text-[14px] font-medium">
                Bilans wodny w okresie krytycznym (miesiące <span className="num">{months}</span>), ostatnie{" "}
                <span className="num">{m.seasons.length}</span> sezonów
              </figcaption>
              <div className="mt-2">
                <KbwSeasonsChart seasons={m.seasons} thresholdMm={threshold} periodPl={`miesiące ${months}`} fs={10} idPrefix="an-kbw" className="w-full" />
              </div>
              <KbwLegend className="mt-2" />
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
              <Stat label="Kategoria podatności IUNG (I = najbardziej)" value={a.soil.iungCategory ?? "brak danych"} src="IUNG" sources={S} />
              <Stat label="Gleba" value={a.soil.textureClassPl ?? "brak danych"} src="SoilGrids" sources={S} />
              <Stat label="Woda dostępna dla korzeni" value={fmt(a.soil.awcMm, 0, "mm")} src="SoilGrids" sources={S} />
              <Stat label="Piasek / glina" value={`${fmt(a.soil.sandPct)} / ${fmt(a.soil.clayPct, 0, "%")}`} src="SoilGrids" sources={S} />
              <Stat
                label="Wysokość terenu"
                value={a.terrain.elevMin === null ? "brak danych" : `${fmt(a.terrain.elevMin, 1)}–${fmt(a.terrain.elevMax, 1, "m")}`}
                src="NMT"
                sources={S}
              />
              <Stat label="Średni spadek" value={fmt(a.terrain.slopePct, 1, "%")} src="NMT" sources={S} />
              <Stat label="Najbliższy rów lub ciek" value={fmt(a.terrain.ditchDistM, 0, "m")} src="BDOT10k" sources={S} />
              <Stat
                label="Strefa zalewowa"
                value={a.terrain.floodZone === null ? "brak danych" : a.terrain.floodZone ? "tak" : "nie"}
                src="ISOK"
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
                .map((c) => (
                  <RecCard
                    key={c.id}
                    eyebrow={`Waga ${c.weight === 3 ? "duża" : c.weight === 2 ? "średnia" : "mała"}`}
                    title={
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {c.titlePl}
                      </span>
                    }
                    rows={[{ k: "Dane", v: c.evidencePl }]}
                    chips={
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <SourceChips ids={c.sources} sources={S} />
                        <span className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-forest-muted">
                          <span className="eb">Waga</span>
                          <WeightMeter w={c.weight} />
                        </span>
                      </div>
                    }
                  />
                ))}
            </ul>
          ) : (
            <p className="mt-4 text-[15px]">Dane nie wskazują przyczyn niedoboru wody.</p>
          ))}

        {tab === "retencja" && recList("retencja", "Brak rekomendacji retencyjnych dla tej działki.")}

        {tab === "agrotechnika" && recList("agrotechnika", "Brak rekomendacji agrotechnicznych.")}

        {tab === "nawadnianie" && (
          <>
            {r.irrigation ? (
              <div className="mt-4 rounded-[4px] border-2 border-forest/15 bg-cream p-5">
                <p className="eb text-forest-muted">Decyzja na dziś</p>
                <p className="hd mt-2 flex items-center gap-2 text-[30px]">
                  <Icon name="water" size={26} />
                  {r.irrigation.decision === "tak"
                    ? "Nawadniaj"
                    : r.irrigation.decision === "rozwaz"
                      ? "Rozważ nawadnianie"
                      : "Nie nawadniaj teraz"}
                </p>
                <p className="mt-3 text-[15px] leading-[1.45]">{r.irrigation.reasonPl}</p>
                <dl className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-[4px] border border-forest/15 p-3">
                    <dt className="eb text-forest-muted">Niedobór wody</dt>
                    <dd className="num sh mt-1 text-[22px]">{fmt(r.irrigation.deficitMm, 0, "mm")}</dd>
                  </div>
                  <div className="rounded-[4px] border border-forest/15 p-3">
                    <dt className="eb text-forest-muted">Dawka</dt>
                    <dd className="num sh mt-1 text-[22px]">{fmt(r.irrigation.doseMm, 0, "mm")}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[15px]">
                  <span className="eb mr-2 text-forest-muted">Kiedy</span>
                  {r.irrigation.timingPl}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-[15px]">Nawadnianie nie zostało ocenione dla tej uprawy i daty.</p>
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
                  <li key={x} className="flex gap-2 text-terra-ink">
                    <span aria-hidden className="mt-[9px] inline-block h-0 w-3 shrink-0 border-t-[1.5px] border-dashed border-terra" />
                    <span className="text-forest">{x}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px]">Wszystkie źródła odpowiedziały.</p>
            )}
            <H3>Czego nie uwzględniamy</H3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-[1.45]">
              {r.uncertainty.notConsideredPl.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <H3>Źródła danych</H3>
            <div className="mt-2 overflow-x-auto">
              <table className="num w-full border-collapse text-left text-[13px]">
                <caption className="sr-only">Źródła danych użyte w analizie</caption>
                <thead>
                  <tr className="border-b-[1.5px] border-forest">
                    <th scope="col" className="eb py-1.5 pr-2">Źródło</th>
                    <th scope="col" className="eb py-1.5 pr-2">Stan</th>
                    <th scope="col" className="eb py-1.5 pr-2 text-right">Czas</th>
                    <th scope="col" className="eb py-1.5">Licencja</th>
                  </tr>
                </thead>
                <tbody>
                  {S.map((s) => (
                    <tr key={s.id} className="border-b border-forest/15 align-top">
                      <th scope="row" className="py-2 pr-2 font-semibold">
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noopener" className="underline underline-offset-2">
                            {s.label}
                            <span className="sr-only"> (otwiera się w nowej karcie)</span>
                          </a>
                        ) : (
                          s.label
                        )}
                        <span className="block font-normal text-forest-muted">{s.detail}</span>
                        {s.note && <span className="block font-normal">{s.note}</span>}
                      </th>
                      <td className="py-2 pr-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-[2px] border px-1.5 text-[12px] whitespace-nowrap ${
                            s.status === "ok" ? "border-agri text-agri-ink" : "border-dashed border-terra font-semibold text-terra-ink"
                          }`}
                        >
                          <span aria-hidden className={`inline-block size-1.5 rounded-full ${s.status === "ok" ? "bg-agri" : "border border-terra"}`} />
                          {STATUS_PL[s.status]}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-right whitespace-nowrap">{fmt(s.ms / 1000, 1, "s")}</td>
                      <td className="py-2">{s.license}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] text-forest-muted">Progi suszy IUNG w tej wersji są do kalibracji. Każde zalecenie wymaga wizji lokalnej.</p>
          </>
        )}

        <nav aria-label="Kolejna część wyniku" className="mt-6 flex justify-between gap-2">
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
        {tab === "retencja" || tab === "agrotechnika" ? (
          <p className="mt-3 text-[12px] text-forest-muted">
            Każde zalecenie wynika z przyczyny: {r.causes.map((c) => causeTitle(c.id)).join(", ") || "brak"}.
          </p>
        ) : null}
      </div>
    </section>
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
