import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/brand/Icon";
import { FooterLine, LevelTag, SourceChipList, SourceLine } from "@/components/brand/ui";
import { getCrop, type AnalysisResult, type Recommendation, type SourceInfo } from "@/lib/analiza";
import { LEGAL } from "@/lib/traktor/copy";
import { KbwLegend, KbwSeasonsChart, ParcelOutline } from "./charts";
import {
  absentByDesign,
  attributionOf,
  attributionUrl,
  cropName,
  kbwThreshold,
  METEO_SOURCE,
  missingSentence,
  srcTag,
  statusWord,
  unitName,
  DECISION_PL,
  LEVEL_PL,
  LEVEL_RANK,
  LLM_LABEL,
  METHOD_LIMITS,
  NA,
  PRIORITY_PL,
  SCREENING_NOTE,
  UNC_RANK,
  dateLong,
  dateShort,
  dateTime,
  monthsRange,
  n,
  signed,
} from "./format";

const SRC_SHORT: Record<SourceInfo["id"], string> = {
  ULDK: "ULDK",
  OpenMeteo: "Open-Meteo",
  IMGW: "IMGW-PIB",
  Sentinel2: "Sentinel-2",
  IUNG: "IUNG",
  SoilGrids: "SoilGrids",
  NMT: "NMT",
  BDOT10k: "BDOT10k",
  ISOK: "ISOK",
  EDO: "EDO",
};

const ISOK_MAP = "https://wody.isok.gov.pl/imap_kzgw/";

const KIND_PL: Record<Recommendation["kind"], string> = { retencja: "Retencja", agrotechnika: "Agrotechnika", nawadnianie: "Nawadnianie" };

/** Data label: Inter SemiBold, +14% tracking, uppercase (brand §04). */
const DL = "eb !text-[9.5px] text-forest-muted";

function SrcTags({ ids, r }: { ids: SourceInfo["id"][]; r: AnalysisResult }) {
  return (
    <SourceChipList
      size="sm"
      items={ids.map((id) => {
        const s = r.sources.find((x) => x.id === id);
        // ISOK is never queried (link only): not a failure, so no dashed "brak" chip
        const byDesign = s ? absentByDesign(s, r) : false;
        return { id, label: byDesign && id === "ISOK" ? "ISOK · link" : srcTag(s, SRC_SHORT[id]), status: byDesign ? "ok" : (s?.status ?? "missing") };
      })}
    />
  );
}

/** Section header: icon + data label "01 — TITLE" over a 1.5px forest rule. */
function Section({ no, title, icon, children, id }: { no: number; title: string; icon?: IconName; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="raport-section mt-4">
      <div className="raport-head flex items-center gap-2 border-b-[1.5px] border-forest pb-1">
        {icon && <Icon name={icon} size={16} />}
        <h2 id={id} className="eb num">
          {String(no).padStart(2, "0")} — {title}
        </h2>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function RecItem({ r, res }: { r: Recommendation; res: AnalysisResult }) {
  const based = r.basedOn.map((id) => res.causes.find((c) => c.id === id)?.titlePl ?? id);
  return (
    <li className="raport-avoid rounded-[4px] border border-forest/25 px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="eb !text-[9.5px] text-forest-muted">
          {KIND_PL[r.kind]} · {PRIORITY_PL[r.priority]}
        </p>
      </div>
      <h3 className="sh mt-0.5 text-[15px]">{r.titlePl}</h3>
      <dl className="mt-1 grid grid-cols-[64px_1fr] gap-x-2 gap-y-0.5 text-[11px] leading-snug">
        <dt className={`${DL} !text-[9px] pt-[2px]`}>Dlaczego</dt>
        <dd>{r.whyPl}</dd>
        <dt className={`${DL} !text-[9px] pt-[2px]`}>Jak</dt>
        <dd>{r.howPl}</dd>
        {r.wherePl && (
          <>
            <dt className={`${DL} !text-[9px] pt-[2px]`}>Gdzie</dt>
            <dd>
              {r.wherePl}
              {r.location ? (
                <span className="num text-forest-muted">
                  {" "}
                  ({n(r.location[1], 5)} N, {n(r.location[0], 5)} E)
                </span>
              ) : null}
            </dd>
          </>
        )}
        {r.legalPl && (
          <>
            <dt className="eb !text-[9px] pt-[2px] text-terra-ink">Prawo</dt>
            <dd>{r.legalPl}</dd>
          </>
        )}
        <dt className={`${DL} !text-[9px] pt-[2px]`}>Podstawa</dt>
        <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>{based.length ? `Przyczyna: ${based.join(" · ")}` : "brak powiązanej przyczyny"}</span>
          <SrcTags ids={r.sources} r={res} />
        </dd>
      </dl>
    </li>
  );
}

function RecList({ items, res, emptyPl }: { items: Recommendation[]; res: AnalysisResult; emptyPl: string }) {
  if (!items.length) return <p className="text-[11.5px]">{emptyPl}</p>;
  const sorted = [...items].sort((a, b) => a.priority - b.priority);
  return (
    <ul className="space-y-1.5">
      {sorted.map((x) => (
        <RecItem key={x.id} r={x} res={res} />
      ))}
    </ul>
  );
}

type Row = { label: string; value: string; ctx: ReactNode; src: SourceInfo["id"][] | ReactNode; muted?: boolean };

export function ReportSheet({ r, demo }: { r: AnalysisResult; demo?: boolean }) {
  const { assessment: a, parcel: p } = r;
  const m = a.meteo;
  const s = a.satellite;
  const so = a.soil;
  const t = a.terrain;
  const crop = getCrop(r.crop.id);
  const period = monthsRange(crop.critical);
  const thr = kbwThreshold(r);
  const threshold = thr.line;
  const thrName = thr.kind === "smsr" ? "próg SMSR" : "próg IUNG";
  const crop_ = cropName(r);
  const precipDelta =
    m.precip30Mm !== null && m.precip30NormMm ? Math.round(((m.precip30Mm - m.precip30NormMm) / m.precip30NormMm) * 100) : null;
  // the current season (inProgress) is drawn but not counted: droughtYears covers completed seasons only
  const completed = m.seasons.filter((x) => !x.inProgress);
  const seasonsN = completed.length;
  const current = m.seasons.find((x) => x.inProgress);
  const firstYear = thr.seasons[0]?.year;
  const lastYear = thr.seasons[thr.seasons.length - 1]?.year;
  const thrCtx =
    threshold !== null
      ? `${thrName} ${signed(threshold)} mm${thr.kind === "iung" ? " (do kalibracji)" : ""}`
      : thr.perSeason
        ? `${thrName} liczony osobno dla okna i sezonu`
        : thr.dropped
          ? "próg z tabel IUNG nie zgadza się z oceną sezonów, pomijamy go"
          : "próg nieznany: brak kategorii gleby";
  const recs = (k: Recommendation["kind"]) => r.recommendations.filter((x) => x.kind === k);
  const causes = [...r.causes].sort((x, y) => y.weight - x.weight);
  const meteoSrc = r.sources.find((x) => x.id === "OpenMeteo");
  const etp = m.etpMethodPl;
  // last day with weather data, as reported by the source (never assumed to be the analysis date)
  const meteoText = `${meteoSrc?.note ?? ""} ${meteoSrc?.detail ?? ""}`;
  const meteoLast =
    /ostatni dzień z danymi:?\s*(\d{4}-\d{2}-\d{2})/i.exec(meteoText)?.[1] ?? /\.\.(\d{4}-\d{2}-\d{2})/.exec(meteoSrc?.detail ?? "")?.[1] ?? null;

  // worst SMSR window: the verdict behind "Teraz". Outside the SMSR season (21.III–30.IX) the engine
  // sends no current window, so we show the newest season's worst window and say so.
  const newest = [...m.seasons].sort((x, y) => y.year - x.year)[0];
  const wSeason = current ?? (m.smsrWindowPl ? undefined : newest);
  const wWindow = m.smsrWindowPl ?? wSeason?.windowPl ?? null;
  const wKbw = m.smsrKbwMm ?? wSeason?.kbwCriticalMm ?? null;
  const wThr = m.smsrThresholdMm ?? wSeason?.thresholdMm ?? null;
  // the engine's own flag wins when it describes the same window
  const wDrought =
    wSeason && wSeason.windowPl === wWindow ? wSeason.drought : wKbw !== null && wThr !== null ? wKbw < wThr : null;
  const wTitle = !current && wSeason && !m.smsrWindowPl ? `Najgorsze okno SMSR · ostatni sezon ${wSeason.year}` : "Najgorsze okno SMSR w sezonie";

  const isokSrc = r.sources.find((x) => x.id === "ISOK");
  const isokLinkOnly = !isokSrc || absentByDesign(isokSrc, r);

  const rows: Row[] = [
    {
      label: "Klimatyczny bilans wodny (KBW), 60 dni",
      value: signed(m.kbw60Mm, 0, "mm"),
      ctx: [m.kbw60Percentile !== null ? `${n(m.kbw60Percentile)}. percentyl z 10 lat (niżej = sucho)` : "percentyl: brak danych", etp].filter(Boolean).join("; "),
      src: ["OpenMeteo"],
    },
    {
      label: "Opad, 30 dni",
      value: n(m.precip30Mm, 0, "mm"),
      ctx: `norma ${n(m.precip30NormMm, 0, "mm")}${precipDelta !== null ? ` (${signed(precipDelta, 0, "%")})` : ""}`,
      src: ["OpenMeteo"],
    },
    {
      label: "Parowanie uprawy ETc, 30 dni",
      value: n(m.etc30Mm, 0, "mm"),
      ctx: `ET₀ ${n(m.et0_30Mm, 0, "mm")} × Kc (FAO-56)`,
      src: ["OpenMeteo"],
    },
    {
      label: "Średnia Tmax · najdłużej bez opadu (< 1 mm, 60 dni)",
      value: `${n(m.tmax30MeanC, 1, "°C")} · ${n(m.dryDaysMax, 0, "dni")}`,
      ctx: "Tmax z 30 dni",
      src: ["OpenMeteo"],
    },
    {
      label: "Sezony z suszą wg SMSR (najgorsze okno w sezonie)",
      value: m.droughtYears !== null && seasonsN ? `${n(m.droughtYears)} z ${seasonsN}` : NA,
      ctx: `poprzednie sezony ${completed.length ? `${Math.min(...completed.map((x) => x.year))}–${Math.max(...completed.map((x) => x.year))}` : ""}; ${thrCtx}`,
      src: ["OpenMeteo", "IUNG"],
    },
    {
      label: "NDVI · NDMI (zieloność · wilgotność łanu)",
      value: `${n(s.ndvi, 2)} · ${n(s.ndmi, 2)}`,
      ctx: `norma ${n(s.ndviNorm, 2)} · ${n(s.ndmiNorm, 2)}; scena ${dateShort(s.sceneDate)}${s.cloudPct !== null ? `, chmury ${n(s.cloudPct)}%` : ""}`,
      src: ["Sentinel2"],
    },
    {
      label: "Kategoria gleby IUNG (podatność na suszę)",
      value: so.iungCategory ? `kat. ${so.iungCategory}` : NA,
      ctx: "I = najbardziej podatna",
      src: ["IUNG"],
    },
    {
      label: "Gleba: tekstura · woda dostępna (AWC)",
      value: `${so.textureClassPl ?? NA} · ${n(so.awcMm, 0, "mm")}`,
      ctx: `piasek ${n(so.sandPct, 0, "%")}, ił ${n(so.clayPct, 0, "%")}, C org. ${n(so.socGkg, 1, "g/kg")}; strefa korzeni ${n(crop.rootDepthM, 1, "m")}`,
      src: ["SoilGrids"],
    },
    {
      label: "Spadek terenu (średni)",
      value: n(t.slopePct, 1, "%"),
      ctx: `wysokość ${n(t.elevMin, 1)}–${n(t.elevMax, 1, "m n.p.m.")}`,
      src: ["NMT"],
    },
    {
      label: "Odległość do rowu lub cieku",
      value: n(t.ditchDistM, 0, "m"),
      ctx: t.watercourses.length ? t.watercourses.slice(0, 2).map((w) => `${w.kind}: ${w.name}, ${n(w.distM, 0, "m")}`).join("; ") : "",
      src: ["BDOT10k"],
    },
    isokLinkOnly && t.floodZone === null
      ? {
          label: "Obszar zagrożenia powodziowego",
          value: "nie sprawdzano",
          muted: true,
          ctx: (
            <>
              nie pobierane automatycznie (tylko link): sprawdź na{" "}
              <a href={isokSrc?.url ?? ISOK_MAP} className="underline">
                mapie ISOK
              </a>
            </>
          ),
          src: ["ISOK"],
        }
      : {
          label: "Obszar zagrożenia powodziowego",
          value: t.floodZone === null ? NA : t.floodZone ? "tak" : "nie",
          ctx: "",
          src: ["ISOK"],
        },
  ];

  const unc = r.uncertainty;
  const missing = unc.missingPl.map(missingSentence);
  const irr = r.irrigation;
  // licence text comes from each source (engine is authoritative); one line per distinct text
  const attributions = Array.from(new Map(r.sources.map((x) => [attributionOf(x), attributionUrl(x)] as const).filter(([txt]) => !!txt)));
  const llm = r.textSource === "llm";
  const degraded = r.sources.filter((x) => x.status !== "ok" && !absentByDesign(x, r));
  const partial = degraded.filter((x) => x.status === "partial");
  const outOfSeason = irr?.decision === "nie_teraz" && irr.deficitMm === null;
  const commune = unitName(p.commune, /^gmina\s+/i);
  const county = unitName(p.county, /^powiat\s+/i);
  const voiv = unitName(p.voivodeship, /^województwo\s+/i);

  return (
    <article className="raport-sheet mx-auto mt-6 w-full max-w-[210mm] bg-cream px-[12mm] py-[11mm] text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)] narrow:mt-0 narrow:px-4 narrow:py-5 print:mt-0">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-forest pb-3 narrow:gap-2">
        <Logo height={18} />
        <p className="hd text-center text-[17px]">Raport wodny działki</p>
        <div className="flex items-center gap-2">
          {degraded.length > 0 && (
            <span className="eb inline-flex items-center gap-1.5 rounded-[2px] border border-dashed border-terra px-2 py-1 text-terra-ink">
              Niepełne dane
            </span>
          )}
          <span className="num text-[11px]">{dateTime(r.generatedAt, true)}</span>
        </div>
      </header>

      {demo && (
        <>
          <p className="mt-3 rounded-[4px] border-2 border-dashed border-terra px-3 py-1 text-[11px] leading-snug font-semibold text-terra-ink">
            Dane przykładowe (tryb demo). To nie jest wynik analizy tej działki.
          </p>
          {/* repeated on every printed page (position: fixed in print) */}
          <p aria-hidden className="raport-demo-print hidden">
            DEMO · dane przykładowe, nie wynik analizy
          </p>
        </>
      )}

      <section aria-label="Działka" className="mt-4 flex items-start justify-between gap-4 narrow:flex-col">
        <div className="min-w-0">
          <p className={DL}>Działka</p>
          <h1 className="sh num mt-1 text-[28px] break-all">{p.id}</h1>
          <p className="num mt-1.5 text-[14px] font-medium">
            {n(p.areaHa, 2, "ha")} · {crop_} · analiza na {dateLong(r.request.date)}
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5 text-[11.5px]">
            <dt className={DL}>Położenie</dt>
            <dd>
              gm. {commune ?? NA}, pow. {county ?? NA}, woj. {voiv ?? NA}
              {p.region ? `, obręb ${p.region}` : ""}
            </dd>
            <dt className={DL}>Okres krytyczny</dt>
            <dd>{period}</dd>
            <dt className={DL}>Metoda</dt>
            <dd className="num">
              {r.methodVersion ?? "wersja nieznana"} · obliczenia {n(r.durationMs / 1000, 1, "s")}
            </dd>
          </dl>
        </div>
        <figure className="shrink-0">
          <ParcelOutline parcel={p} lowPoint={t.lowPoint} />
          <figcaption className="mt-1 text-[10px] leading-tight text-forest-muted">
            {t.lowPoint ? (
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-full border border-cream bg-water" aria-hidden /> najniższy punkt (NMT)
              </span>
            ) : null}
            <SourceLine className="!text-[10px]">ULDK (GUGiK)</SourceLine>
          </figcaption>
        </figure>
      </section>

      {/* 1 */}
      <Section no={1} id="s1" title="Ocena sytuacji wodnej" icon="drought">
        <div className="raport-avoid grid grid-cols-[1fr_1fr_1.25fr] gap-2 narrow:grid-cols-1">
          {[
            { k: "Teraz (na datę analizy)", v: a.currentLevel },
            { k: "Historycznie (10 sezonów)", v: a.historicalLevel },
          ].map(({ k, v }) => (
            <div key={k} className="rounded-[4px] border-2 border-forest/25 px-3 py-2">
              <p className={DL}>Zagrożenie suszą · {k}</p>
              <div className="mt-1">
                <LevelTag
                  word={v ? LEVEL_PL[v] : null}
                  rank={v ? LEVEL_RANK[v] : null}
                  size="sm"
                  meterLabel={v ? `Poziom ${LEVEL_RANK[v]} z 4` : "Poziom nieznany"}
                />
              </div>
            </div>
          ))}
          <div className="rounded-[4px] border-2 border-forest/25 px-3 py-2">
            <p className={DL}>{wTitle}</p>
            {wWindow && wKbw !== null ? (
              <dl className="num mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-[11px] leading-snug">
                <dt className="text-forest-muted">Okno</dt>
                <dd className="font-semibold">{wWindow}</dd>
                <dt className="text-forest-muted">KBW</dt>
                <dd className="font-semibold">
                  {signed(wKbw, 0, "mm")}
                  {wThr !== null ? <span className="font-normal"> wobec progu {signed(wThr, 0, "mm")}</span> : null}
                </dd>
                <dt className="text-forest-muted">Ocena</dt>
                <dd className={wDrought ? "font-semibold text-terra-ink" : "font-semibold"}>
                  {wDrought === null ? NA : wDrought ? "susza (poniżej progu)" : "bez suszy (powyżej progu)"}
                </dd>
              </dl>
            ) : (
              <p className="mt-1 text-[11px] text-terra-ink">Brak danych: okno SMSR nie zostało policzone.</p>
            )}
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-[1.45]">{a.summaryPl}</p>
        {llm && <p className="mt-0.5 text-[10px] text-forest-muted italic">{LLM_LABEL}</p>}
        {s.anomalyPl && (
          <p className="mt-1 text-[11px] leading-snug">
            <span className={`${DL} mr-1.5`}>Satelita</span>
            {s.anomalyPl}
          </p>
        )}
        {m.warnings.length > 0 && (
          <div className="raport-avoid mt-2 flex items-start gap-2 rounded-[4px] border-2 border-terra px-3 py-1.5 text-[11.5px]">
            <Icon name="storm" size={18} className="mt-0.5 shrink-0 text-terra-ink" />
            <ul>
              {m.warnings.map((w) => (
                <li key={w.event + w.validTo}>
                  <strong className="text-terra-ink">Ostrzeżenie IMGW-PIB:</strong> {w.event}, stopień <span className="num">{w.level}</span>,
                  ważne do <span className="num">{dateTime(w.validTo)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <table className="num mt-3 w-full border-collapse text-[11px]">
          <caption className="eb mb-1 text-left text-forest-muted">Kluczowe wskaźniki (wartość, kontekst, źródło)</caption>
          <thead>
            <tr className="border-b border-forest/40 text-left">
              <th scope="col" className={`${DL} py-1 pr-2`}>Wskaźnik</th>
              <th scope="col" className={`${DL} py-1 pr-2 text-right`}>Wartość</th>
              <th scope="col" className={`${DL} py-1 pr-2`}>Kontekst</th>
              <th scope="col" className={`${DL} py-1 text-right`}>Źródło</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const na = row.value === NA || /^brak danych · brak danych$/.test(row.value);
              return (
                <tr key={row.label} className="raport-avoid border-b border-forest/15 align-top">
                  <th scope="row" className="py-[3px] pr-2 text-left font-normal">{row.label}</th>
                  <td
                    className={`py-[3px] pr-2 text-right whitespace-nowrap ${
                      na ? "text-terra-ink italic" : row.muted ? "text-forest-muted italic" : "font-semibold"
                    }`}
                  >
                    {row.value}
                  </td>
                  <td className="py-[3px] pr-2 text-[10px] leading-tight text-forest-muted">{row.ctx}</td>
                  <td className="py-[3px]">
                    <div className="flex justify-end">{Array.isArray(row.src) ? <SrcTags ids={row.src} r={r} /> : row.src}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <figure className="raport-avoid mt-3 grid items-end gap-x-4 gap-y-1 print:grid-cols-[100mm_1fr]">
          <div>
            <KbwSeasonsChart seasons={thr.seasons} thresholdMm={threshold} perSeason={thr.perSeason} thresholdKind={thr.kind} periodPl={period} className="max-w-[100mm]" />
            <KbwLegend
              className="mt-1 !text-[10px]"
              threshold={threshold !== null ? "line" : thr.perSeason ? "ticks" : "none"}
              kind={thr.kind}
              inProgress={!!current}
            />
          </div>
          <figcaption className="text-[10px] leading-snug text-forest-muted">
            KBW (opad − parowanie{etp ? `, ${etp}` : ""}) w najgorszym 60-dniowym oknie SMSR każdego sezonu, lata{" "}
            <span className="num">{firstYear ?? "?"}</span>–<span className="num">{lastYear ?? "?"}</span>, od najstarszego. Kreskowane z literą S:
            susza. {m.droughtYears !== null && seasonsN ? `Susza w ${n(m.droughtYears)} z ${seasonsN} poprzednich sezonów.` : ""}{" "}
            {current ? `Sezon ${current.year} (*) trwa: okna tylko do daty analizy, nie wlicza się do sumy.` : ""}{" "}
            {thr.dropped ? "Linii progu nie rysujemy: uproszczony próg IUNG nie zgadza się z oceną sezonów." : ""}
            <SourceLine className="mt-0.5 !text-[10px]">{METEO_SOURCE}; progi SMSR (IUNG-PIB)</SourceLine>
          </figcaption>
        </figure>
      </Section>

      {/* 2 */}
      <Section no={2} id="s2" title="Przyczyny" icon="lidar">
        {causes.length ? (
          <ol className={`grid gap-x-5 gap-y-1.5 narrow:grid-cols-1 ${causes.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {causes.map((c, i) => (
              <li key={c.id} className="raport-avoid grid grid-cols-[18px_1fr] gap-x-2 text-[11.5px] leading-snug">
                <span className="num font-semibold">{i + 1}.</span>
                <div>
                  <p className="font-semibold">
                    {c.titlePl} <span className="eb num !text-[9px] text-forest-muted">waga {c.weight}/3</span>
                  </p>
                  <p>{c.evidencePl}</p>
                  <div className="mt-0.5">
                    <SrcTags ids={c.sources} r={r} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[11.5px]">Dane nie wskazują przyczyny deficytu wody na datę analizy. Dlatego nie dajemy rekomendacji bez podstawy.</p>
        )}
      </Section>

      {/* 3 */}
      <Section no={3} id="s3" title="Rekomendacje retencyjne" icon="board">
        <RecList items={recs("retencja")} res={r} emptyPl="Brak rekomendacji retencyjnych: dane nie wskazują przyczyny, którą retencja by usunęła." />
      </Section>

      {/* 4 */}
      <Section no={4} id="s4" title="Rekomendacje agrotechniczne" icon="tractor">
        <RecList items={recs("agrotechnika")} res={r} emptyPl="Brak rekomendacji agrotechnicznych: dane nie wskazują przyczyny dla tej daty i uprawy." />
      </Section>

      {/* 5 */}
      <Section no={5} id="s5" title="Nawadnianie (opcjonalne)" icon="water">
        {irr ? (
          <div className="raport-avoid grid grid-cols-[auto_1fr] items-start gap-x-4 rounded-[4px] border-2 border-forest/25 px-3 py-2 narrow:grid-cols-1">
            <div>
              <p className={DL}>Decyzja</p>
              <p className="hd mt-0.5 text-[22px]">{DECISION_PL[irr.decision]}</p>
            </div>
            <dl className="num grid grid-cols-[96px_1fr] gap-x-2 gap-y-0.5 text-[11px] leading-snug">
              <dt className={`${DL} !text-[9px] pt-[2px]`}>Deficyt wody</dt>
              <dd className={outOfSeason ? "" : "font-semibold"}>{outOfSeason ? "nie liczono poza sezonem" : n(irr.deficitMm, 0, "mm")}</dd>
              <dt className={`${DL} !text-[9px] pt-[2px]`}>{irr.doseMm !== null && irr.doseMm > 40 ? "Dawka sezonowa" : "Dawka"}</dt>
              <dd className={irr.doseMm !== null ? "font-semibold" : ""}>
                {irr.doseMm !== null
                  ? `${n(irr.doseMm, 0, "mm")} (= ${n(irr.doseMm * 10, 0, "m³/ha")})${irr.doseMm > 40 ? ", w kilku dawkach po 20–35 mm" : ""}`
                  : outOfSeason
                    ? "nie liczono poza sezonem"
                    : NA}
              </dd>
              <dt className={`${DL} !text-[9px] pt-[2px]`}>Termin</dt>
              <dd>{irr.timingPl || NA}</dd>
              <dt className={`${DL} !text-[9px] pt-[2px]`}>Uzasadnienie</dt>
              <dd>{irr.reasonPl}</dd>
            </dl>
          </div>
        ) : (
          <p className="text-[11.5px]">
            <strong>Nie dotyczy.</strong> Dla tej daty i uprawy analiza nie wskazuje potrzeby nawadniania.
          </p>
        )}
        {recs("nawadnianie").length > 0 && (
          <div className="mt-2">
            <RecList items={recs("nawadnianie")} res={r} emptyPl="" />
          </div>
        )}
        {irr && irr.decision !== "nie_teraz" && !recs("nawadnianie").some((x) => x.legalPl) && (
          <p className="mt-1.5 text-[10.5px]">
            <span className="eb !text-[9px] mr-1.5 text-terra-ink">Prawo</span>
            Pobór wody do nawadniania zwykle wymaga pozwolenia wodnoprawnego. Sprawdź w Wodach Polskich.
          </p>
        )}
      </Section>

      {/* 6 */}
      <Section no={6} id="s6" title="Ograniczenia i niepewność" icon="pin">
        <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-[11px] leading-snug narrow:grid-cols-1">
          {/* level + reasons stay together, so the level never ends a page alone */}
          <div className="raport-avoid">
            <div className="mb-1.5 flex items-center gap-3">
              <span className={DL}>Niepewność wyniku</span>
              <LevelTag word={unc.level} rank={UNC_RANK[unc.level]} of={3} icon="lidar" size="sm" meterLabel={`Niepewność ${UNC_RANK[unc.level]} z 3`} />
            </div>
            <h3 className={`${DL} mb-1`}>Dlaczego taki poziom</h3>
            <ul className="list-disc space-y-0.5 pl-4">
              {[...unc.reasonsPl, ...(unc.reasonsPl.some((x) => /nasa power/i.test(x)) ? [] : METHOD_LIMITS)].map((x) => (
                <li key={x} className="raport-avoid">
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="raport-avoid">
              <h3 className={`${DL} mb-1`}>Brakujące dane</h3>
              {missing.length ? (
                <ul className="space-y-0.5">
                  {missing.map((x) => (
                    <li key={x} className="flex gap-1.5">
                      <span aria-hidden className="mt-[7px] inline-block w-2.5 shrink-0 border-t-[1.5px] border-dashed border-terra" />
                      <span className="text-terra-ink">{x}</span>
                    </li>
                  ))}
                </ul>
              ) : partial.length ? null : (
                <p>Wszystkie pobierane źródła odpowiedziały w pełni.</p>
              )}
              {partial.length > 0 && (
                <p className={missing.length ? "mt-1" : ""}>
                  <span className="font-semibold text-terra-ink">Częściowe:</span> {partial.map((x) => x.label).join("; ")}.
                </p>
              )}
            </div>
            <div className="raport-avoid mt-2">
              <h3 className={`${DL} mb-1`}>Nie uwzględniono</h3>
              <p>{unc.notConsideredPl.join(" · ") || NA}</p>
            </div>
            <p className="raport-avoid mt-2 text-[10.5px] text-forest-muted">
              Aktualność: pogoda{" "}
              {meteoLast ? (
                <>
                  do <span className="num">{dateShort(meteoLast)}</span>
                </>
              ) : (
                "(zakres w tabeli źródeł)"
              )}
              , scena satelitarna z <span className="num">{dateShort(s.sceneDate)}</span>. To szacunki z danych zdalnych, nie pomiary na działce.
            </p>
          </div>
        </div>
        <div className="raport-avoid mt-2 flex flex-wrap items-center gap-3 rounded-[4px] border-[3px] border-double border-forest px-4 py-2">
          <Icon name="pin" size={24} />
          <p className="hd text-[24px]">{LEGAL.siteVisit}</p>
          <p className="ml-auto max-w-[80mm] text-right text-[10px] leading-snug text-forest-muted narrow:ml-0 narrow:text-left">{SCREENING_NOTE}</p>
        </div>
      </Section>

      {/* 7 */}
      <Section no={7} id="s7" title="Źródła danych" icon="ditch">
        <table className="num w-full border-collapse text-[10px] leading-tight">
          <caption className="eb mb-1 text-left text-forest-muted">Źródła użyte w analizie, pobrane w chwili liczenia (czas polski)</caption>
          <thead>
            <tr className="border-b border-forest/40 text-left">
              <th scope="col" className={`${DL} !text-[9px] py-1 pr-2`}>Źródło</th>
              <th scope="col" className={`${DL} !text-[9px] py-1 pr-2`}>Zakres / okres</th>
              <th scope="col" className={`${DL} !text-[9px] py-1 pr-2`}>Status</th>
              <th scope="col" className={`${DL} !text-[9px] py-1`}>Pobrano</th>
            </tr>
          </thead>
          <tbody>
            {r.sources.map((x) => {
              const byDesign = absentByDesign(x, r);
              return (
                <tr key={x.id} className="raport-avoid border-b border-forest/15 align-top">
                  <th scope="row" className="w-[40mm] py-[3px] pr-2 text-left font-semibold">{x.label}</th>
                  <td className="py-[3px] pr-2">
                    {x.detail}
                    {x.note ? <span className="text-forest-muted"> {x.note}</span> : null}
                  </td>
                  <td className="py-[3px] pr-2">
                    {x.status === "ok" || byDesign ? (
                      statusWord(x, r)
                    ) : (
                      <span className="inline-block rounded-[2px] border border-dashed border-terra px-1 font-semibold whitespace-nowrap text-terra-ink">
                        {statusWord(x, r)}
                      </span>
                    )}
                  </td>
                  <td className="py-[3px] whitespace-nowrap">
                    {x.id === "ISOK" && byDesign ? "nie dotyczy" : dateTime(x.fetchedAt)}
                    {x.ms > 0 ? <span className="block text-forest-muted">{n(x.ms / 1000, 1, "s")}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="raport-avoid mt-2 text-[9.5px] leading-snug text-forest-muted">
          <p className="eb !text-[9px] mb-0.5">Licencje i uznanie autorstwa</p>
          <ul className="[&>li]:inline [&>li]:after:content-['_']">
            {attributions.map(([text, url], i) => (
              <li key={text}>
                {text}
                {url ? (
                  <>
                    {" "}
                    (
                    <a href={url} className="underline">
                      {url.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
                    </a>
                    )
                  </>
                ) : null}
                {i < attributions.length - 1 ? <span aria-hidden> ·</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <footer className="raport-avoid mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t border-forest/30 pt-2 text-[10px]">
        <p className="min-w-0 flex-1 text-forest-muted">
          Raport przesiewowy z danych zdalnych. Nie zastępuje opinii agronoma, projektu ani pozwolenia. Działka <span className="num">{p.id}</span> · {crop_} ·
          analiza na <span className="num">{dateShort(r.request.date)}</span>
          {r.methodVersion ? ` · metoda ${r.methodVersion.split(" (")[0]}` : ""}.
        </p>
        <FooterLine className="shrink-0" />
      </footer>
    </article>
  );
}
