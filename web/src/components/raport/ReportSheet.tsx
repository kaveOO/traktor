import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/brand/Icon";
import { FooterLine, LevelTag, SourceChipList, SourceLine } from "@/components/brand/ui";
import { getCrop, type AnalysisResult, type Cause, type Recommendation, type SourceInfo } from "@/lib/analiza";
import { LEGAL } from "@/lib/traktor/copy";
import { KbwLegend, KbwSeasonsChart, ParcelOutline } from "./charts";
import {
  attributionOf,
  attributionUrl,
  cropName,
  kbwThreshold,
  METEO_SOURCE,
  srcTag,
  DECISION_PL,
  LEVEL_PL,
  LEVEL_RANK,
  LLM_LABEL,
  METHOD_LIMITS,
  NA,
  PRIORITY_PL,
  SCREENING_NOTE,
  STATUS_PL,
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

const KIND_PL: Record<Recommendation["kind"], string> = { retencja: "Retencja", agrotechnika: "Agrotechnika", nawadnianie: "Nawadnianie" };

function SrcTags({ ids, sources }: { ids: SourceInfo["id"][]; sources: SourceInfo[] }) {
  return (
    <SourceChipList
      size="sm"
      items={ids.map((id) => {
        const s = sources.find((x) => x.id === id);
        return { id, label: srcTag(s, SRC_SHORT[id]), status: s?.status ?? "missing" };
      })}
    />
  );
}

/** Section header in the /karta pattern: icon + eyebrow "01 — TITLE" over a 1.5px forest rule. */
function Section({
  no,
  title,
  icon,
  children,
  id,
  keep,
}: {
  no: number;
  title: string;
  icon?: IconName;
  children: ReactNode;
  id: string;
  keep?: boolean;
}) {
  return (
    <section aria-labelledby={id} className={`raport-section mt-5 ${keep ? "raport-avoid" : ""}`}>
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

function RecItem({ r, causes, sources }: { r: Recommendation; causes: Cause[]; sources: SourceInfo[] }) {
  const based = r.basedOn.map((id) => causes.find((c) => c.id === id)?.titlePl ?? id);
  return (
    <li className="raport-avoid rounded-[4px] border border-forest/25 px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="eb !text-[9.5px] text-forest-muted">
          {KIND_PL[r.kind]} · {PRIORITY_PL[r.priority]}
        </p>
        <span className="num inline-grid size-[18px] place-items-center rounded-full bg-forest text-[10px] font-semibold text-cream" aria-hidden>
          {r.priority}
        </span>
      </div>
      <h3 className="sh mt-0.5 text-[15px]">{r.titlePl}</h3>
      <dl className="mt-1 grid grid-cols-[64px_1fr] gap-x-2 gap-y-0.5 text-[11px] leading-snug">
        <dt className="eb !text-[9px] pt-[2px] text-forest-muted">Dlaczego</dt>
        <dd>{r.whyPl}</dd>
        <dt className="eb !text-[9px] pt-[2px] text-forest-muted">Jak</dt>
        <dd>{r.howPl}</dd>
        {r.wherePl && (
          <>
            <dt className="eb !text-[9px] pt-[2px] text-forest-muted">Gdzie</dt>
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
        <dt className="eb !text-[9px] pt-[2px] text-forest-muted">Podstawa</dt>
        <dd className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>{based.join(" · ") || "brak powiązanej przyczyny"}</span>
          <SrcTags ids={r.sources} sources={sources} />
        </dd>
      </dl>
    </li>
  );
}

function RecList({ items, causes, sources, emptyPl }: { items: Recommendation[]; causes: Cause[]; sources: SourceInfo[]; emptyPl: string }) {
  if (!items.length) return <p className="text-[11.5px]">{emptyPl}</p>;
  const sorted = [...items].sort((a, b) => a.priority - b.priority);
  return (
    <ul className="space-y-1.5">
      {sorted.map((r) => (
        <RecItem key={r.id} r={r} causes={causes} sources={sources} />
      ))}
    </ul>
  );
}

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
  const seasonsN = m.seasons.length;
  const firstYear = thr.seasons[0]?.year;
  const lastYear = thr.seasons[thr.seasons.length - 1]?.year;
  const thrCtx =
    threshold !== null
      ? `${thrName} ${signed(threshold)} mm${thr.kind === "iung" ? " (do kalibracji)" : ""}`
      : thr.perSeason
        ? `${thrName} liczony osobno dla każdego sezonu`
        : thr.dropped
          ? "próg z tabel IUNG nie zgadza się z oceną sezonów, pomijamy go"
          : "próg nieznany: brak kategorii gleby";
  const recs = (k: Recommendation["kind"]) => r.recommendations.filter((x) => x.kind === k);
  const causes = [...r.causes].sort((x, y) => y.weight - x.weight);

  const rows: { label: string; value: string; ctx: string; src: SourceInfo["id"][] }[] = [
    {
      label: "Klimatyczny bilans wodny (KBW), 60 dni",
      value: signed(m.kbw60Mm, 0, "mm"),
      ctx: m.kbw60Percentile !== null ? `${n(m.kbw60Percentile)}. percentyl z 10 lat (niżej = sucho)` : "percentyl: brak danych",
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
    { label: "Średnia Tmax, 30 dni", value: n(m.tmax30MeanC, 1, "°C"), ctx: "", src: ["OpenMeteo"] },
    { label: "Najdłuższy okres bez opadu (< 1 mm), 60 dni", value: n(m.dryDaysMax, 0, "dni"), ctx: "", src: ["OpenMeteo"] },
    {
      label: `Sezony z suszą (najgorsze okno 60 dni, ${period})`,
      value: m.droughtYears !== null && seasonsN ? `${n(m.droughtYears)} / ${seasonsN}` : NA,
      ctx: thrCtx,
      src: ["OpenMeteo", "IUNG"],
    },
    {
      label: "NDVI (zieloność łanu)",
      value: n(s.ndvi, 2),
      ctx: `norma ${n(s.ndviNorm, 2)} · scena ${dateShort(s.sceneDate)}${s.cloudPct !== null ? `, chmury ${n(s.cloudPct)}%` : ""}`,
      src: ["Sentinel2"],
    },
    { label: "NDMI (wilgotność łanu)", value: n(s.ndmi, 2), ctx: `norma ${n(s.ndmiNorm, 2)}`, src: ["Sentinel2"] },
    {
      label: "Kategoria gleby IUNG (podatność na suszę)",
      value: so.iungCategory ? `kat. ${so.iungCategory}` : NA,
      ctx: "I = najbardziej podatna",
      src: ["IUNG"],
    },
    { label: "Woda dostępna dla roślin (AWC)", value: n(so.awcMm, 0, "mm"), ctx: `strefa korzeni ${n(crop.rootDepthM, 1, "m")}`, src: ["SoilGrids"] },
    {
      label: "Tekstura gleby",
      value: so.textureClassPl ?? NA,
      ctx: `piasek ${n(so.sandPct, 0, "%")}, ił ${n(so.clayPct, 0, "%")}, C org. ${n(so.socGkg, 1, "g/kg")}`,
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
    {
      label: "Obszar zagrożenia powodziowego",
      value: t.floodZone === null ? NA : t.floodZone ? "tak" : "nie",
      ctx: "",
      src: ["ISOK"],
    },
  ];

  const unc = r.uncertainty;
  const missing = unc.missingPl.map((x) => (/^brak danych/i.test(x) ? x : `Brak danych: ${x}`));
  const irr = r.irrigation;
  // licence text comes from each source (engine is authoritative); one line per distinct text
  const attributions = Array.from(
    new Map(r.sources.map((x) => [attributionOf(x), attributionUrl(x)] as const).filter(([t]) => !!t)),
  );
  const llm = r.textSource === "llm";
  const anyMissing = r.sources.some((x) => x.status !== "ok");
  const partial = r.sources.filter((x) => x.status === "partial");
  const meteoSrc = r.sources.find((x) => x.id === "OpenMeteo");
  const outOfSeason = irr?.decision === "nie_teraz" && irr.deficitMm === null;

  return (
    <article className="raport-sheet mx-auto mt-6 w-full max-w-[210mm] bg-cream px-[12mm] py-[11mm] text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)] narrow:mt-0 narrow:px-4 narrow:py-5 print:mt-0">
      {/* Header: same lockup as /karta */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-forest pb-3 narrow:gap-2">
        <Logo height={18} />
        <div className="hd text-center text-[17px]">Raport wodny działki</div>
        <div className="flex items-center gap-2">
          {anyMissing && (
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

      <section className="mt-4 flex items-start justify-between gap-4 narrow:flex-col">
        <div className="min-w-0">
          <p className="eb text-forest-muted">Działka</p>
          <h1 className="sh num mt-1 text-[28px] break-all">{p.id}</h1>
          <p className="num mt-1.5 text-[14px] font-medium">
            {n(p.areaHa, 2, "ha")} · {crop_} · analiza na {dateLong(r.request.date)}
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5 text-[11.5px]">
            <dt className="eb !text-[9.5px] text-forest-muted">Położenie</dt>
            <dd>
              gm. {p.commune ?? NA}, pow. {p.county ?? NA}, woj. {p.voivodeship ?? NA}
            </dd>
            <dt className="eb !text-[9.5px] text-forest-muted">Okres krytyczny</dt>
            <dd>{period}</dd>
            <dt className="eb !text-[9.5px] text-forest-muted">Obliczenia</dt>
            <dd className="num">
              {n(r.durationMs / 1000, 1, "s")}
              {r.methodVersion ? ` · metoda ${r.methodVersion}` : ""}
            </dd>
          </dl>
        </div>
        <figure className="shrink-0">
          <ParcelOutline parcel={p} lowPoint={t.lowPoint} />
          <figcaption className="mt-1 text-[10px] leading-tight text-forest-muted">
            {t.lowPoint ? (
              <span className="flex items-center gap-1">
                <span className="inline-block size-2 rounded-full border border-cream bg-water" aria-hidden /> najniższy punkt
              </span>
            ) : null}
            <SourceLine>ULDK (GUGiK)</SourceLine>
          </figcaption>
        </figure>
      </section>

      {/* 1 */}
      <Section no={1} id="s1" title="Ocena sytuacji wodnej" icon="drought">
        <div className="raport-avoid grid grid-cols-2 gap-2 narrow:grid-cols-1">
          {[
            { k: "Teraz (na datę analizy)", v: a.currentLevel },
            { k: "Historycznie (10 sezonów)", v: a.historicalLevel },
          ].map(({ k, v }) => (
            <div key={k} className="rounded-[4px] border-2 border-forest/25 px-3 py-2">
              <p className="eb !text-[9.5px] text-forest-muted">Zagrożenie suszą · {k}</p>
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
        </div>
        <p className="mt-2 text-[12.5px] leading-[1.45]">{a.summaryPl}</p>
        {llm && <p className="mt-0.5 text-[10px] text-forest-muted italic">{LLM_LABEL}</p>}
        {s.anomalyPl && (
          <p className="mt-1 text-[11.5px] leading-snug">
            <span className="eb !text-[9.5px] mr-1.5 text-forest-muted">Satelita</span>
            {s.anomalyPl}
          </p>
        )}
        {m.warnings.length > 0 && (
          <div className="mt-2 flex items-start gap-2 rounded-[4px] border-2 border-terra px-3 py-1.5 text-[11.5px]">
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
              <th scope="col" className="eb !text-[9.5px] py-1 pr-2">Wskaźnik</th>
              <th scope="col" className="eb !text-[9.5px] py-1 pr-2 text-right">Wartość</th>
              <th scope="col" className="eb !text-[9.5px] py-1 pr-2">Kontekst</th>
              <th scope="col" className="eb !text-[9.5px] py-1 text-right">Źródło</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="raport-avoid border-b border-forest/15 align-top">
                <th scope="row" className="py-[3px] pr-2 text-left font-normal">{row.label}</th>
                <td className={`py-[3px] pr-2 text-right font-semibold whitespace-nowrap ${row.value === NA ? "font-normal text-terra-ink italic" : ""}`}>
                  {row.value}
                </td>
                <td className="py-[3px] pr-2 text-[10px] leading-tight text-forest-muted">{row.ctx}</td>
                <td className="py-[3px]">
                  <div className="flex justify-end">
                    <SrcTags ids={row.src} sources={r.sources} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <figure className="raport-avoid mt-3 grid items-end gap-x-4 gap-y-1 print:grid-cols-[110mm_1fr]">
          <div>
            <KbwSeasonsChart
              seasons={thr.seasons}
              thresholdMm={threshold}
              perSeason={thr.perSeason}
              thresholdKind={thr.kind}
              periodPl={period}
            />
            <KbwLegend
              className="mt-1 !text-[10px]"
              threshold={threshold !== null ? "line" : thr.perSeason ? "ticks" : "none"}
              kind={thr.kind}
            />
          </div>
          <figcaption className="text-[10px] leading-snug text-forest-muted">
            Najgorsze 60-dniowe okno bilansu wodnego (opad − parowanie) w sezonie uprawy ({period}), sezony{" "}
            <span className="num">{firstYear ?? "?"}</span>–<span className="num">{lastYear ?? "?"}</span>, od najstarszego. Kreskowane z literą S:
            susza według oceny sezonu. {m.droughtYears !== null && seasonsN ? `Susza w ${n(m.droughtYears)} z ${seasonsN} sezonów.` : ""}{" "}
            {thr.dropped ? "Linii progu nie rysujemy: uproszczony próg IUNG nie zgadza się z oceną sezonów." : ""}
            <SourceLine className="mt-0.5">{METEO_SOURCE}; progi SMSR (IUNG-PIB)</SourceLine>
          </figcaption>
        </figure>
      </Section>

      {/* 2 */}
      <Section no={2} id="s2" title="Przyczyny" icon="lidar">
        {causes.length ? (
          <ol className="grid grid-cols-2 gap-x-5 gap-y-1.5 narrow:grid-cols-1">
            {causes.map((c, i) => (
              <li key={c.id} className="raport-avoid grid grid-cols-[18px_1fr] gap-x-2 text-[11.5px] leading-snug">
                <span className="num font-semibold">{i + 1}.</span>
                <div>
                  <p className="font-semibold">
                    {c.titlePl} <span className="eb num !text-[9px] text-forest-muted">waga {c.weight}/3</span>
                  </p>
                  <p>{c.evidencePl}</p>
                  <div className="mt-0.5">
                    <SrcTags ids={c.sources} sources={r.sources} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[11.5px]">Dane nie wskazują przyczyny deficytu wody na datę analizy.</p>
        )}
      </Section>

      {/* 3 */}
      <Section no={3} id="s3" title="Rekomendacje retencyjne" icon="board">
        <RecList
          items={recs("retencja")}
          causes={r.causes}
          sources={r.sources}
          emptyPl="Brak rekomendacji retencyjnych: dane nie wskazują przyczyny, którą retencja by usunęła."
        />
      </Section>

      {/* 4 */}
      <Section no={4} id="s4" title="Rekomendacje agrotechniczne" icon="tractor">
        <RecList items={recs("agrotechnika")} causes={r.causes} sources={r.sources} emptyPl="Brak rekomendacji agrotechnicznych dla tej daty i uprawy." />
      </Section>

      {/* 5 */}
      <Section no={5} id="s5" title="Nawadnianie (opcjonalne)" icon="water">
        {irr ? (
          <div className="raport-avoid rounded-[4px] border-2 border-forest/25 px-3 py-2">
            <p className="eb !text-[9.5px] text-forest-muted">Decyzja</p>
            <p className="hd mt-0.5 text-[22px]">{DECISION_PL[irr.decision]}</p>
            <dl className="num mt-1 grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5 text-[11px] leading-snug">
              <dt className="eb !text-[9px] pt-[2px] text-forest-muted">Deficyt wody</dt>
              <dd className={outOfSeason ? "" : "font-semibold"}>{outOfSeason ? "nie liczono poza sezonem" : n(irr.deficitMm, 0, "mm")}</dd>
              <dt className="eb !text-[9px] pt-[2px] text-forest-muted">{irr.doseMm !== null && irr.doseMm > 40 ? "Dawka sezonowa" : "Dawka"}</dt>
              <dd className="font-semibold">
                {irr.doseMm !== null
                  ? `${n(irr.doseMm, 0, "mm")} (= ${n(irr.doseMm * 10, 0, "m³/ha")})${irr.doseMm > 40 ? ", w kilku dawkach po 20–35 mm" : ""}`
                  : outOfSeason
                    ? "nie liczono poza sezonem"
                    : NA}
              </dd>
              <dt className="eb !text-[9px] pt-[2px] text-forest-muted">Termin</dt>
              <dd>{irr.timingPl || NA}</dd>
              <dt className="eb !text-[9px] pt-[2px] text-forest-muted">Uzasadnienie</dt>
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
            <RecList items={recs("nawadnianie")} causes={r.causes} sources={r.sources} emptyPl="" />
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
      <Section no={6} id="s6" title="Ograniczenia i niepewność" icon="pin" keep>
        <div className="flex items-center gap-3">
          <span className="eb !text-[9.5px] text-forest-muted">Niepewność wyniku</span>
          <LevelTag
            word={unc.level}
            rank={UNC_RANK[unc.level]}
            of={3}
            icon="lidar"
            size="sm"
            meterLabel={`Niepewność ${UNC_RANK[unc.level]} z 3`}
          />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-3 text-[11px] leading-snug narrow:grid-cols-1">
          <div className="raport-avoid">
            <h3 className="eb !text-[9.5px] mb-1 text-forest-muted">Dlaczego taki poziom</h3>
            <ul className="list-disc space-y-0.5 pl-4">
              {[...unc.reasonsPl, ...(unc.reasonsPl.some((x) => /nasa power/i.test(x)) ? [] : METHOD_LIMITS)].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="raport-avoid">
            <h3 className="eb !text-[9.5px] mb-1 text-forest-muted">Brakujące dane</h3>
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
              <p>Wszystkie źródła odpowiedziały w pełni.</p>
            )}
            {partial.length > 0 && (
              <p className={missing.length ? "mt-1" : ""}>
                <span className="font-semibold text-terra-ink">Częściowe:</span> {partial.map((x) => x.label).join("; ")}.
              </p>
            )}
          </div>
          <div className="raport-avoid">
            <h3 className="eb !text-[9.5px] mb-1 text-forest-muted">Nie uwzględniono</h3>
            <ul className="list-disc space-y-0.5 pl-4">
              {unc.notConsideredPl.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-1.5 text-[10.5px] text-forest-muted">
          Aktualność: pogoda z {METEO_SOURCE}
          {meteoSrc?.detail ? ` (${meteoSrc.detail})` : ""}, scena satelitarna z <span className="num">{dateShort(s.sceneDate)}</span>. To
          szacunki z danych zdalnych, nie pomiary na działce.
        </p>
        <div className="raport-avoid mt-2 flex flex-wrap items-center gap-3 rounded-[4px] border-[3px] border-double border-forest px-4 py-2.5">
          <Icon name="pin" size={26} />
          <p className="hd text-[26px]">{LEGAL.siteVisit}</p>
          <p className="ml-auto max-w-[80mm] text-right text-[10px] leading-snug text-forest-muted narrow:ml-0 narrow:text-left">{SCREENING_NOTE}</p>
        </div>
      </Section>

      {/* 7 */}
      <Section no={7} id="s7" title="Źródła danych" icon="ditch">
        <table className="num w-full border-collapse text-[10px] leading-tight">
          <caption className="eb mb-1 text-left text-forest-muted">Źródła użyte w analizie, pobrane w chwili generowania raportu</caption>
          <thead>
            <tr className="border-b border-forest/40 text-left">
              <th scope="col" className="eb !text-[9px] py-1 pr-2">Źródło</th>
              <th scope="col" className="eb !text-[9px] py-1 pr-2">Zakres / okres</th>
              <th scope="col" className="eb !text-[9px] py-1 pr-2">Status</th>
              <th scope="col" className="eb !text-[9px] py-1 pr-2">Pobrano</th>
              <th scope="col" className="eb !text-[9px] py-1">Licencja / uznanie autorstwa</th>
            </tr>
          </thead>
          <tbody>
            {r.sources.map((x) => (
              <tr key={x.id} className="raport-avoid border-b border-forest/15 align-top">
                <th scope="row" className="py-[3px] pr-2 text-left font-semibold">{x.label}</th>
                <td className="py-[3px] pr-2">
                  {x.detail}
                  {x.note ? <span className="block text-forest-muted">{x.note}</span> : null}
                </td>
                <td className="py-[3px] pr-2 whitespace-nowrap">
                  {x.status === "ok" ? (
                    STATUS_PL[x.status]
                  ) : (
                    <span className="inline-block rounded-[2px] border border-dashed border-terra px-1 font-semibold text-terra-ink">
                      {STATUS_PL[x.status]}
                    </span>
                  )}
                </td>
                <td className="py-[3px] pr-2 whitespace-nowrap">{dateTime(x.fetchedAt)}</td>
                <td className="py-[3px]">{attributionOf(x) || NA}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="raport-avoid mt-2 text-[9.5px] leading-snug text-forest-muted">
          <p className="eb !text-[9px] mb-0.5">Uznanie autorstwa</p>
          <ul className="space-y-0.5">
            {attributions.map(([text, url]) => (
              <li key={text}>
                {text}
                {url ? (
                  <>
                    {" "}
                    (
                    <a href={url} className="underline">
                      {url.replace(/^https?:\/\//, "")}
                    </a>
                    )
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <footer className="raport-avoid mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-forest/30 pt-2 text-[10px]">
        <div className="min-w-0">
          <p className="text-forest-muted">
            Raport przesiewowy z danych zdalnych. Nie zastępuje opinii agronoma, projektu ani pozwolenia. Działka{" "}
            <span className="num">{p.id}</span> · {crop_} · <span className="num">{dateShort(r.request.date)}</span>
          </p>
          <SourceLine>ULDK, NMT, BDOT10k (GUGiK); Open-Meteo (CC BY 4.0); IMGW-PIB; Copernicus Sentinel-2; SoilGrids; IUNG-PIB</SourceLine>
        </div>
        <FooterLine className="shrink-0" />
      </footer>
    </article>
  );
}
