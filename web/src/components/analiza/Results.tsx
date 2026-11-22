"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/brand/Icon";
import { getCrop, type AnalysisResult, type Level, type Recommendation, type SourceInfo } from "@/lib/analiza";
import { LEVEL_PL, fmt } from "./api";

const SECTIONS = [
  { id: "ocena", label: "Ocena" },
  { id: "przyczyny", label: "Przyczyny" },
  { id: "retencja", label: "Retencja" },
  { id: "agrotechnika", label: "Agrotechnika" },
  { id: "nawadnianie", label: "Nawadnianie" },
  { id: "zrodla", label: "Niepewność i źródła" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

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

export function SourceChips({ ids, sources }: { ids: SourceInfo["id"][]; sources: SourceInfo[] }) {
  if (!ids.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Źródła">
      {ids.map((id) => {
        const s = sources.find((x) => x.id === id);
        const missing = s?.status === "missing";
        return (
          <li
            key={id}
            className={`eb inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 !text-[10px] ${
              missing ? "border-terra text-[#8a3d27]" : "border-forest/40 text-forest"
            }`}
          >
            {SOURCE_SHORT[id]}
            {missing && <span>· brak</span>}
          </li>
        );
      })}
    </ul>
  );
}

function LevelBadge({ label, level }: { label: string; level: Level | null }) {
  const l = level ? LEVEL_PL[level] : null;
  return (
    <div className="flex-1 rounded-[4px] border border-forest/20 bg-cream p-3">
      <p className="eb opacity-80">{label}</p>
      {l ? (
        <p className={`sh mt-2 inline-flex items-center gap-2 rounded-[2px] px-2.5 py-1.5 text-[20px] text-cream ${l.tone}`}>
          <Icon name={l.icon} size={20} />
          {l.word}
          <span className="sr-only">ryzyko ({l.rank} z 4)</span>
        </p>
      ) : (
        <p className="sh mt-2 text-[20px]">Brak danych</p>
      )}
      {l && (
        <p className="num mt-1 text-[12px]" aria-hidden>
          Skala: {"■".repeat(l.rank)}
          {"□".repeat(4 - l.rank)} ({l.rank}/4)
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, src, sources }: { label: string; value: string; src: SourceInfo["id"]; sources: SourceInfo[] }) {
  return (
    <div className="rounded-[4px] border border-forest/15 bg-cream p-3">
      <dt className="text-[13px] leading-snug">{label}</dt>
      <dd className="num sh mt-1 text-[22px]">{value}</dd>
      <dd>
        <SourceChips ids={[src]} sources={sources} />
      </dd>
    </div>
  );
}

function KbwChart({ r }: { r: AnalysisResult }) {
  const seasons = r.assessment.meteo.seasons;
  if (!seasons.length) return <p>Brak danych o sezonach.</p>;
  const crop = getCrop(r.crop.id);
  const cat = r.assessment.soil.iungCategory;
  const threshold = crop.iungKbw[cat ? ["I", "II", "III", "IV"].indexOf(cat) : 1];
  const minV = Math.min(threshold, ...seasons.map((s) => s.kbwCriticalMm), -10);
  const maxV = Math.max(0, ...seasons.map((s) => s.kbwCriticalMm));
  const W = 360;
  const H = 170;
  const top = 10;
  const bottom = 34;
  const y = (v: number) => top + ((maxV - v) / (maxV - minV || 1)) * (H - top - bottom);
  const bw = W / seasons.length;
  const months = crop.critical.join(", ");
  return (
    <figure className="mt-3">
      <figcaption className="text-[14px] font-medium">
        Bilans wodny (opad − parowanie) w okresie krytycznym (miesiące {months}), ostatnie {seasons.length} sezonów
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" aria-hidden>
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="#1F3A22" strokeWidth="1" />
        {seasons.map((s, i) => {
          const y0 = y(0);
          const y1 = y(s.kbwCriticalMm);
          return (
            <g key={s.year}>
              <rect
                x={i * bw + 4}
                width={bw - 8}
                y={Math.min(y0, y1)}
                height={Math.max(1, Math.abs(y1 - y0))}
                fill={s.drought ? "#B5573B" : "#3B7FA3"}
              />
              {s.drought && (
                <text x={i * bw + bw / 2} y={Math.max(y0, y1) - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#F3ECDD">
                  S
                </text>
              )}
              <text x={i * bw + bw / 2} y={H - 18} textAnchor="middle" fontSize="10" fill="#1F3A22" className="num">
                {String(s.year).slice(2)}
              </text>
            </g>
          );
        })}
        <line x1="0" x2={W} y1={y(threshold)} y2={y(threshold)} stroke="#1F3A22" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={W - 2} y={y(threshold) - 4} textAnchor="end" fontSize="10" fill="#1F3A22">
          próg IUNG {threshold} mm (do kalibracji)
        </text>
        <text x="0" y={H - 3} fontSize="10" fill="#1F3A22">
          rok (20..) · S = susza · linia przerywana = próg
        </text>
      </svg>
      <table className="sr-only">
        <caption>Bilans wodny w okresie krytycznym, mm. Próg suszy IUNG: {threshold} mm.</caption>
        <thead>
          <tr>
            <th scope="col">Rok</th>
            <th scope="col">Bilans, mm</th>
            <th scope="col">Susza</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((s) => (
            <tr key={s.year}>
              <th scope="row">{s.year}</th>
              <td>{s.kbwCriticalMm}</td>
              <td>{s.drought ? "tak" : "nie"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function IndexBar({ name, value, norm, hint }: { name: string; value: number | null; norm: number | null; hint: string }) {
  const pct = (v: number | null) => `${Math.max(0, Math.min(1, ((v ?? 0) + 0.2) / 1.2)) * 100}%`;
  return (
    <div className="mt-3">
      <p className="text-[14px]">
        <strong>{name}</strong> {hint}: <span className="num">{fmt(value, 2)}</span>, norma{" "}
        <span className="num">{fmt(norm, 2)}</span>
        {value !== null && norm !== null && (
          <span>
            {" "}
            ({value < norm ? "poniżej" : "powyżej"} normy o <span className="num">{fmt(Math.abs(value - norm), 2)}</span>)
          </span>
        )}
      </p>
      <div className="mt-1 space-y-1" aria-hidden>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-12">teraz</span>
          <span className="h-2.5 flex-1 bg-forest/10">
            <span className="block h-full bg-water" style={{ width: pct(value) }} />
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-12">norma</span>
          <span className="h-2.5 flex-1 bg-forest/10">
            <span className="block h-full bg-forest/60" style={{ width: pct(norm) }} />
          </span>
        </div>
      </div>
    </div>
  );
}

function RecCard({
  rec,
  n,
  active,
  onSelect,
  sources,
}: {
  rec: Recommendation;
  n: number;
  active: boolean;
  onSelect: (id: string) => void;
  sources: SourceInfo[];
}) {
  return (
    <li
      id={`rec-${rec.id}`}
      className={`rounded-[4px] border-2 bg-cream p-4 transition-colors duration-[400ms] ${active ? "border-water" : "border-transparent"}`}
    >
      <div className="flex items-start gap-3">
        {rec.location && (
          <span className="num grid size-8 shrink-0 place-items-center rounded-full bg-forest text-[14px] font-bold text-cream" aria-hidden>
            {n}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="eb opacity-80">Priorytet {rec.priority === 1 ? "wysoki" : rec.priority === 2 ? "średni" : "niski"}</p>
          <h4 className="sh mt-1 text-[19px]">{rec.titlePl}</h4>
        </div>
      </div>
      <p className="mt-2 text-[15px] leading-normal">
        <strong>Dlaczego:</strong> {rec.whyPl}
      </p>
      <p className="mt-1 text-[15px] leading-normal">
        <strong>Co zrobić:</strong> {rec.howPl}
      </p>
      {rec.wherePl && (
        <p className="mt-1 text-[15px] leading-normal">
          <strong>Gdzie:</strong> {rec.wherePl}
        </p>
      )}
      {rec.legalPl && <p className="mt-2 border-l-2 border-terra pl-2 text-[14px]">{rec.legalPl}</p>}
      <SourceChips ids={rec.sources} sources={sources} />
      {rec.location && (
        <button
          type="button"
          onClick={() => onSelect(rec.id)}
          aria-pressed={active}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[2px] border-[1.5px] border-forest px-3 text-[14px] font-medium"
        >
          <Icon name="pin" size={18} />
          {active ? "Zaznaczone na mapie" : `Pokaż na mapie (znacznik ${n})`}
        </button>
      )}
    </li>
  );
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="sh mt-5 text-[20px]">{children}</h3>;
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
    return list.length ? (
      <ul className="mt-3 space-y-3">
        {list.map((rec) => (
          <RecCard
            key={rec.id}
            rec={rec}
            n={markerNumber(rec.id)}
            active={activeRec === rec.id}
            onSelect={onSelectRec}
            sources={S}
          />
        ))}
      </ul>
    ) : (
      <p className="mt-3">{empty}</p>
    );
  };

  return (
    <section aria-labelledby="wyniki-h" className="mt-2">
      <h2 id="wyniki-h" className="sh text-[24px]">
        Wynik analizy
      </h2>
      <p className="mt-1 text-[14px]">
        {r.crop.namePl} · działka <span className="num">{r.parcel.id}</span> · <span className="num">{r.request.date}</span>
        {r.durationMs ? (
          <>
            {" "}
            · <span className="num">{fmt(r.durationMs / 1000, 1)} s</span>
          </>
        ) : null}
      </p>
      {fixture && (
        <p className="mt-2 rounded-[2px] border-l-4 border-terra bg-cream p-2 text-[14px]">
          Dane przykładowe (fixture), nie wynik obliczeń. Do pokazu interfejsu.
        </p>
      )}

      <div role="tablist" aria-label="Kolejne kroki wyniku" className="mt-4 grid grid-cols-3 gap-1" onKeyDown={onKey}>
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            ref={(n) => {
              tabRefs.current[i] = n;
            }}
            role="tab"
            id={`tab-${s.id}`}
            aria-controls={`panel-${s.id}`}
            aria-selected={tab === s.id}
            tabIndex={tab === s.id ? 0 : -1}
            onClick={() => setTab(s.id)}
            className={`flex min-h-11 items-center gap-1.5 rounded-[2px] border px-2 text-left text-[13px] leading-tight ${
              tab === s.id ? "border-forest bg-forest font-semibold text-cream" : "border-forest/30 bg-cream text-forest"
            }`}
          >
            <span className="num font-semibold">{i + 1}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="mt-4">
        {tab === "ocena" && (
          <>
            <h3 className="sh text-[20px]">1. Ocena sytuacji wodnej</h3>
            <div className="mt-3 flex gap-2">
              <LevelBadge label="Ryzyko suszy teraz" level={a.currentLevel} />
              <LevelBadge label="Podatność w 10 latach" level={a.historicalLevel} />
            </div>
            <p className="mt-3 text-[16px] leading-normal">{a.summaryPl}</p>
            <H3>Pogoda</H3>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              <Stat label="Bilans wodny 60 dni (opad − parowanie)" value={fmt(m.kbw60Mm, 0, "mm")} src="OpenMeteo" sources={S} />
              <Stat
                label="Na tle 10 lat (percentyl, 0 = najsuchszy)"
                value={m.kbw60Percentile === null ? "brak danych" : `${m.kbw60Percentile}.`}
                src="OpenMeteo"
                sources={S}
              />
              <Stat
                label="Opad 30 dni / norma"
                value={`${fmt(m.precip30Mm)} / ${fmt(m.precip30NormMm, 0, "mm")}`}
                src="OpenMeteo"
                sources={S}
              />
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
            {m.warnings.length > 0 && (
              <div className="mt-3 border-l-4 border-terra bg-cream p-3" role="note">
                <p className="font-semibold">Ostrzeżenia IMGW</p>
                <ul className="mt-1 list-disc pl-5">
                  {m.warnings.map((w) => (
                    <li key={w.event + w.validTo}>
                      {w.event}, stopień {w.level}, do {w.validTo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <KbwChart r={r} />
            <H3>Rośliny z satelity</H3>
            {a.satellite.sceneDate ? (
              <>
                <p className="mt-1 text-[14px]">
                  Scena Sentinel-2 z <span className="num">{a.satellite.sceneDate}</span>, chmury{" "}
                  <span className="num">{fmt(a.satellite.cloudPct, 0, "%")}</span>.
                </p>
                <IndexBar name="NDVI" hint="(zieleń roślin)" value={a.satellite.ndvi} norm={a.satellite.ndviNorm} />
                <IndexBar name="NDMI" hint="(woda w liściach)" value={a.satellite.ndmi} norm={a.satellite.ndmiNorm} />
                {a.satellite.anomalyPl && <p className="mt-2 text-[15px]">{a.satellite.anomalyPl}</p>}
              </>
            ) : (
              <p className="mt-1">Brak danych satelitarnych dla tej daty.</p>
            )}
            <SourceChips ids={["Sentinel2"]} sources={S} />
            <H3>Gleba i teren</H3>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              <Stat
                label="Kategoria podatności IUNG (I = najbardziej)"
                value={a.soil.iungCategory ?? "brak danych"}
                src="IUNG"
                sources={S}
              />
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

        {tab === "przyczyny" && (
          <>
            <h3 className="sh text-[20px]">2. Przyczyny</h3>
            {r.causes.length ? (
              <ul className="mt-3 space-y-3">
                {[...r.causes]
                  .sort((p, q) => q.weight - p.weight)
                  .map((c) => (
                    <li key={c.id} className="rounded-[4px] bg-cream p-4">
                      <p className="eb opacity-80">Waga: {c.weight === 3 ? "duża" : c.weight === 2 ? "średnia" : "mała"}</p>
                      <h4 className="sh mt-1 text-[19px]">{c.titlePl}</h4>
                      <p className="mt-1 text-[15px] leading-normal">{c.evidencePl}</p>
                      <SourceChips ids={c.sources} sources={S} />
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-3">Dane nie wskazują przyczyn niedoboru wody.</p>
            )}
          </>
        )}

        {tab === "retencja" && (
          <>
            <h3 className="sh text-[20px]">3. Rekomendacje retencyjne</h3>
            {recList("retencja", "Brak rekomendacji retencyjnych dla tej działki.")}
          </>
        )}

        {tab === "agrotechnika" && (
          <>
            <h3 className="sh text-[20px]">4. Agrotechnika</h3>
            {recList("agrotechnika", "Brak rekomendacji agrotechnicznych.")}
          </>
        )}

        {tab === "nawadnianie" && (
          <>
            <h3 className="sh text-[20px]">5. Nawadnianie (opcjonalne)</h3>
            {r.irrigation ? (
              <div className="mt-3 rounded-[4px] bg-cream p-4">
                <p className="sh text-[22px]">
                  {r.irrigation.decision === "tak"
                    ? "Nawadniaj"
                    : r.irrigation.decision === "rozwaz"
                      ? "Rozważ nawadnianie"
                      : "Nie nawadniaj teraz"}
                </p>
                <p className="mt-2 text-[15px]">{r.irrigation.reasonPl}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-[13px]">Niedobór wody</dt>
                    <dd className="num sh text-[20px]">{fmt(r.irrigation.deficitMm, 0, "mm")}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px]">Dawka</dt>
                    <dd className="num sh text-[20px]">{fmt(r.irrigation.doseMm, 0, "mm")}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-[15px]">
                  <strong>Kiedy:</strong> {r.irrigation.timingPl}
                </p>
              </div>
            ) : (
              <p className="mt-3">Nawadnianie nie zostało ocenione dla tej uprawy i daty.</p>
            )}
            {recList("nawadnianie", "")}
          </>
        )}

        {tab === "zrodla" && (
          <>
            <h3 className="sh text-[20px]">6. Niepewność i źródła</h3>
            <p className="mt-2 text-[16px]">
              Niepewność wyniku: <strong>{r.uncertainty.level}</strong>
            </p>
            {r.uncertainty.reasonsPl.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
                {r.uncertainty.reasonsPl.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
            <H3>Brak danych</H3>
            {r.uncertainty.missingPl.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
                {r.uncertainty.missingPl.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px]">Wszystkie źródła odpowiedziały.</p>
            )}
            <H3>Czego nie uwzględniamy</H3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
              {r.uncertainty.notConsideredPl.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <H3>Źródła danych</H3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <caption className="sr-only">Źródła danych użyte w analizie</caption>
                <thead>
                  <tr className="border-b border-forest/30">
                    <th scope="col" className="py-1 pr-2">Źródło</th>
                    <th scope="col" className="py-1 pr-2">Stan</th>
                    <th scope="col" className="py-1 pr-2">Czas</th>
                    <th scope="col" className="py-1">Licencja</th>
                  </tr>
                </thead>
                <tbody>
                  {S.map((s) => (
                    <tr key={s.id} className="border-b border-forest/10 align-top">
                      <th scope="row" className="py-1.5 pr-2 font-medium">
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noopener" className="underline">
                            {s.label}
                          </a>
                        ) : (
                          s.label
                        )}
                        <span className="block font-normal opacity-80">{s.detail}</span>
                        {s.note && <span className="block font-normal">{s.note}</span>}
                      </th>
                      <td className="py-1.5 pr-2">
                        <span className="inline-flex items-center gap-1">
                          <span aria-hidden className={s.status === "ok" ? "text-agri" : "text-[#8a3d27]"}>
                            {s.status === "ok" ? "✓" : s.status === "partial" ? "◐" : "✕"}
                          </span>
                          {STATUS_PL[s.status]}
                        </span>
                      </td>
                      <td className="num py-1.5 pr-2">{fmt(s.ms / 1000, 1, "s")}</td>
                      <td className="py-1.5">{s.license}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px]">Progi suszy IUNG w tej wersji są do kalibracji. Każde zalecenie wymaga wizji lokalnej.</p>
          </>
        )}

        <div className="mt-5 flex justify-between gap-2">
          {idx > 0 ? (
            <button type="button" onClick={() => go(idx - 1)} className="min-h-11 rounded-[2px] border-[1.5px] border-forest px-3 text-[14px]">
              ← {SECTIONS[idx - 1].label}
            </button>
          ) : (
            <span />
          )}
          {idx < SECTIONS.length - 1 && (
            <button
              type="button"
              onClick={() => go(idx + 1)}
              className="min-h-11 rounded-[2px] bg-forest px-3 text-[14px] font-medium text-cream"
            >
              Dalej: {SECTIONS[idx + 1].label} →
            </button>
          )}
        </div>
        {tab === "retencja" || tab === "agrotechnika" ? (
          <p className="mt-2 text-[12px] opacity-80">
            Każde zalecenie wynika z przyczyny: {r.causes.map((c) => causeTitle(c.id)).join(", ") || "brak"}.
          </p>
        ) : null}
      </div>
    </section>
  );
}
