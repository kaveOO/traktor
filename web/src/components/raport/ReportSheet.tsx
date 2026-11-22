import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/brand/Icon";
import { getCrop, type AnalysisResult, type Cause, type Recommendation, type SourceInfo } from "@/lib/analiza";
import { KbwSeasonsChart, LevelMeter, ParcelOutline } from "./charts";
import {
  ATTR_URL,
  attributionFor,
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

function SrcTags({ ids, sources }: { ids: SourceInfo["id"][]; sources: SourceInfo[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ids.map((id) => {
        const s = sources.find((x) => x.id === id);
        const st = s?.status ?? "missing";
        return (
          <span
            key={id}
            className={`num inline-block rounded-[2px] border px-1 text-[9px] leading-[14px] whitespace-nowrap ${
              st === "ok" ? "border-forest/40" : "border-dashed border-terra text-terra"
            }`}
          >
            {SRC_SHORT[id]}
            {st !== "ok" ? ` · ${STATUS_PL[st]}` : ""}
          </span>
        );
      })}
    </span>
  );
}

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
        {icon && <Icon name={icon} size={18} />}
        <span className="eb num opacity-80">{String(no).padStart(2, "0")}</span>
        <h2 id={id} className="sh text-[19px]">
          {title}
        </h2>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function RecItem({ r, causes, sources }: { r: Recommendation; causes: Cause[]; sources: SourceInfo[] }) {
  const based = r.basedOn.map((id) => causes.find((c) => c.id === id)?.titlePl ?? id);
  return (
    <li className="raport-avoid rounded-[4px] border border-forest/30 px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-[13px] font-semibold">{r.titlePl}</h3>
        <span className="eb !text-[9.5px]">
          <span className="num mr-1 inline-block border-[1.5px] border-forest px-1">{r.priority}</span>
          {PRIORITY_PL[r.priority]}
        </span>
      </div>
      <dl className="mt-1 grid grid-cols-[52px_1fr] gap-x-2 gap-y-0.5 text-[11px] leading-snug">
        <dt className="font-semibold">Dlaczego</dt>
        <dd>{r.whyPl}</dd>
        <dt className="font-semibold">Jak</dt>
        <dd>{r.howPl}</dd>
        {r.wherePl && (
          <>
            <dt className="font-semibold">Gdzie</dt>
            <dd>
              {r.wherePl}
              {r.location ? <span className="num opacity-75"> ({r.location[1].toFixed(5)} N, {r.location[0].toFixed(5)} E)</span> : null}
            </dd>
          </>
        )}
        {r.legalPl && (
          <>
            <dt className="font-semibold">Prawo</dt>
            <dd>{r.legalPl}</dd>
          </>
        )}
        <dt className="font-semibold">Podstawa</dt>
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
  const catIdx = so.iungCategory ? ["I", "II", "III", "IV"].indexOf(so.iungCategory) : -1;
  const threshold = catIdx >= 0 ? crop.iungKbw[catIdx] : null;
  const precipDelta =
    m.precip30Mm !== null && m.precip30NormMm ? Math.round(((m.precip30Mm - m.precip30NormMm) / m.precip30NormMm) * 100) : null;
  const seasonsN = m.seasons.length || 10;
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
      value: n(m.precip30Mm, 1, "mm"),
      ctx: `norma ${n(m.precip30NormMm, 1, "mm")}${precipDelta !== null ? ` (${signed(precipDelta, 0, "%")})` : ""}`,
      src: ["OpenMeteo"],
    },
    {
      label: "Parowanie uprawy ETc, 30 dni",
      value: n(m.etc30Mm, 1, "mm"),
      ctx: `ET₀ ${n(m.et0_30Mm, 1, "mm")} × Kc (FAO-56)`,
      src: ["OpenMeteo"],
    },
    { label: "Średnia Tmax, 30 dni", value: n(m.tmax30MeanC, 1, "°C"), ctx: "", src: ["OpenMeteo"] },
    { label: "Najdłuższy okres bez opadu (< 1 mm), 60 dni", value: n(m.dryDaysMax, 0, "dni"), ctx: "", src: ["OpenMeteo"] },
    {
      label: `Sezony z suszą w okresie krytycznym (${period})`,
      value: m.droughtYears !== null ? `${n(m.droughtYears)} / ${seasonsN}` : NA,
      ctx: threshold !== null ? `próg KBW ${signed(threshold)} mm (do kalibracji)` : "próg nieznany: brak kategorii gleby",
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
  const dataYear = Number((s.sceneDate ?? r.request.date).slice(0, 4)) || new Date(r.generatedAt).getFullYear();
  const licenseOf = (x: SourceInfo) => attributionFor(x.id, dataYear) ?? x.license;
  const attributions = Array.from(
    new Map(
      r.sources
        .map((x) => [attributionFor(x.id, dataYear), ATTR_URL[x.id]] as const)
        .filter((e): e is readonly [string, string | undefined] => !!e[0])
        .map((e) => [e[0], e[1]]),
    ),
  );
  // Contract has no text-origin flag yet; tolerate one if the engine adds it (e.g. summarySource: "llm").
  const extra = r as unknown as { summarySource?: string; textSource?: string };
  const llm = extra.summarySource === "llm" || extra.textSource === "llm";

  return (
    <article className="raport-sheet mx-auto mt-6 w-full max-w-[210mm] bg-cream px-[8mm] py-[9mm] text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)] sm:px-[12mm] print:mt-0">
      {/* Header */}
      <header className="border-b-2 border-forest pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Logo height={18} />
          <p className="eb">Raport z {dateTime(r.generatedAt)}</p>
        </div>
        {demo && (
          <p className="mt-2 rounded-[2px] border-[1.5px] border-dashed border-terra px-2 py-1 text-[11px] font-semibold text-terra">
            Dane przykładowe (tryb demo). To nie jest wynik analizy tej działki.
          </p>
        )}
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="hd text-[34px]">Raport wodny działki</h1>
            <p className="num mt-1.5 text-[17px] font-semibold break-all">{p.id}</p>
            <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11.5px]">
              <dt className="eb !text-[9.5px] self-center">Położenie</dt>
              <dd>
                gm. {p.commune ?? NA}, pow. {p.county ?? NA}, woj. {p.voivodeship ?? NA}
              </dd>
              <dt className="eb !text-[9.5px] self-center">Powierzchnia</dt>
              <dd className="num">{n(p.areaHa, 2, "ha")}</dd>
              <dt className="eb !text-[9.5px] self-center">Uprawa</dt>
              <dd>
                {r.crop.namePl} <span className="opacity-75">(okres krytyczny: {period})</span>
              </dd>
              <dt className="eb !text-[9.5px] self-center">Data analizy</dt>
              <dd className="num">{dateLong(r.request.date)}</dd>
              <dt className="eb !text-[9.5px] self-center">Wygenerowano</dt>
              <dd className="num">
                {dateTime(r.generatedAt)} · obliczenia {n(r.durationMs / 1000, 1, "s")}
              </dd>
            </dl>
          </div>
          <figure className="shrink-0 text-center">
            <ParcelOutline parcel={p} lowPoint={t.lowPoint} />
            <figcaption className="mt-0.5 text-[9px] leading-tight opacity-75">
              Obrys: ULDK
              {t.lowPoint ? (
                <>
                  <br />
                  <span className="mr-1 inline-block size-2 rounded-full bg-water align-middle" />
                  najniższy punkt
                </>
              ) : null}
            </figcaption>
          </figure>
        </div>
      </header>

      {/* 1 */}
      <Section no={1} id="s1" title="Ocena sytuacji wodnej" icon="drought">
        <div className="raport-avoid grid gap-2 sm:grid-cols-2 print:grid-cols-2">
          {[
            { k: "Teraz (na datę analizy)", v: a.currentLevel },
            { k: "Historycznie (10 sezonów)", v: a.historicalLevel },
          ].map(({ k, v }) => (
            <div key={k} className="flex items-center gap-3 rounded-[4px] border-2 border-forest/25 px-3 py-2">
              <Icon name={v && LEVEL_RANK[v] >= 3 ? "drought" : "water"} size={26} />
              <div>
                <p className="eb !text-[9.5px]">Zagrożenie suszą · {k}</p>
                <p className="flex items-center gap-2">
                  <span className="hd text-[22px]">{v ? LEVEL_PL[v] : "brak danych"}</span>
                  <LevelMeter
                    rank={v ? LEVEL_RANK[v] : null}
                    label={v ? `Poziom ${LEVEL_RANK[v]} z 4` : "Poziom nieznany"}
                  />
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] leading-[1.45]">{a.summaryPl}</p>
        {llm && <p className="mt-0.5 text-[10px] italic opacity-80">{LLM_LABEL}</p>}
        {s.anomalyPl && <p className="mt-1 text-[11.5px] leading-snug opacity-90">Satelita: {s.anomalyPl}</p>}
        {m.warnings.length > 0 && (
          <div className="mt-2 flex items-start gap-2 rounded-[4px] border-2 border-terra px-3 py-1.5 text-[11.5px]">
            <Icon name="storm" size={18} className="mt-0.5 shrink-0" />
            <ul>
              {m.warnings.map((w) => (
                <li key={w.event + w.validTo}>
                  Ostrzeżenie IMGW-PIB: {w.event}, stopień {w.level}, ważne do {dateTime(w.validTo)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <table className="num mt-3 w-full border-collapse text-[11px]">
          <caption className="eb mb-1 text-left">Kluczowe wskaźniki (wartość, kontekst, źródło)</caption>
          <thead>
            <tr className="border-b border-forest/40 text-left">
              <th scope="col" className="py-1 pr-2 font-semibold">Wskaźnik</th>
              <th scope="col" className="py-1 pr-2 text-right font-semibold">Wartość</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Kontekst</th>
              <th scope="col" className="py-1 font-semibold">Źródło</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="raport-avoid border-b border-forest/15 align-top">
                <th scope="row" className="py-[3px] pr-2 text-left font-normal">{row.label}</th>
                <td className={`py-[3px] pr-2 text-right font-semibold whitespace-nowrap ${row.value === NA ? "italic opacity-80" : ""}`}>
                  {row.value}
                </td>
                <td className="py-[3px] pr-2 text-[10px] leading-tight opacity-85">{row.ctx}</td>
                <td className="py-[3px]">
                  <SrcTags ids={row.src} sources={r.sources} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <figure className="raport-avoid mt-3 grid items-end gap-x-4 gap-y-1 print:grid-cols-[110mm_1fr]">
          <KbwSeasonsChart seasons={m.seasons} thresholdMm={threshold} periodPl={period} />
          <figcaption className="text-[10px] leading-snug opacity-85">
            KBW (opad − ET₀) w okresie krytycznym uprawy ({period}), sezony {m.seasons[0]?.year ?? "?"}–
            {m.seasons[m.seasons.length - 1]?.year ?? "?"}. Słupki kreskowane z literą S: susza (KBW poniżej progu IUNG dla kat.{" "}
            {so.iungCategory ?? "?"}). {m.droughtYears !== null ? `Susza w ${n(m.droughtYears)} z ${seasonsN} sezonów.` : ""} Źródło:
            Open-Meteo (ERA5), progi IUNG uproszczone, do kalibracji.
          </figcaption>
        </figure>
      </Section>

      {/* 2 */}
      <Section no={2} id="s2" title="Przyczyny" icon="lidar">
        {causes.length ? (
          <ol className="grid gap-x-5 gap-y-1 print:grid-cols-2">
            {causes.map((c, i) => (
              <li key={c.id} className="raport-avoid grid grid-cols-[18px_1fr] gap-x-2 text-[11.5px] leading-snug">
                <span className="num font-semibold">{i + 1}.</span>
                <div>
                  <p className="font-semibold">
                    {c.titlePl}{" "}
                    <span className="eb !text-[9px] font-semibold opacity-75">
                      waga {c.weight}/3
                    </span>
                  </p>
                  <p>{c.evidencePl}</p>
                  <SrcTags ids={c.sources} sources={r.sources} />
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
        <RecList
          items={recs("agrotechnika")}
          causes={r.causes}
          sources={r.sources}
          emptyPl="Brak rekomendacji agrotechnicznych dla tej daty i uprawy."
        />
      </Section>

      {/* 5 */}
      <Section no={5} id="s5" title="Nawadnianie (opcjonalne)" icon="water">
        {irr ? (
          <div className="raport-avoid rounded-[4px] border-2 border-forest/25 px-3 py-2">
            <p className="hd text-[22px]">{DECISION_PL[irr.decision]}</p>
            <dl className="num mt-1 grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5 text-[11px] leading-snug">
              <dt className="font-semibold">Deficyt wody</dt>
              <dd>{n(irr.deficitMm, 0, "mm")}</dd>
              <dt className="font-semibold">Dawka</dt>
              <dd>{irr.doseMm !== null ? `${n(irr.doseMm, 0, "mm")} (= ${n(irr.doseMm * 10, 0, "m³/ha")})` : NA}</dd>
              <dt className="font-semibold">Termin</dt>
              <dd>{irr.timingPl || NA}</dd>
              <dt className="font-semibold">Uzasadnienie</dt>
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
            Prawo: pobór wody do nawadniania zwykle wymaga pozwolenia wodnoprawnego. Sprawdź w Wodach Polskich.
          </p>
        )}
      </Section>

      {/* 6 */}
      <Section no={6} id="s6" title="Ograniczenia i niepewność" icon="pin" keep>
        <p className="flex items-center gap-2 text-[12px]">
          <span className="eb !text-[9.5px]">Niepewność wyniku</span>
          <span className="hd text-[20px]">{unc.level}</span>
          <LevelMeter rank={UNC_RANK[unc.level]} of={3} label={`Niepewność ${UNC_RANK[unc.level]} z 3`} />
        </p>
        <div className="mt-1.5 grid gap-3 text-[11px] leading-snug sm:grid-cols-3 print:grid-cols-3">
          <div className="raport-avoid">
            <h3 className="eb mb-1 !text-[9.5px]">Dlaczego taki poziom</h3>
            <ul className="list-disc space-y-0.5 pl-4">
              {[...unc.reasonsPl, ...METHOD_LIMITS].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="raport-avoid">
            <h3 className="eb mb-1 !text-[9.5px]">Brakujące dane</h3>
            {missing.length ? (
              <ul className="list-disc space-y-0.5 pl-4">
                {missing.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <p>Wszystkie źródła odpowiedziały.</p>
            )}
          </div>
          <div className="raport-avoid">
            <h3 className="eb mb-1 !text-[9.5px]">Nie uwzględniono</h3>
            <ul className="list-disc space-y-0.5 pl-4">
              {unc.notConsideredPl.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-1.5 text-[10.5px] opacity-85">
          Aktualność: dane meteo do {dateShort(r.request.date)} (reanaliza ERA5 publikowana z ok. 5-dniowym opóźnieniem), scena
          satelitarna z {dateShort(s.sceneDate)}. Wartości to szacunki z danych zdalnych, nie pomiary na działce.
        </p>
        <div className="raport-avoid mt-2 flex items-center gap-3 rounded-[4px] border-[3px] border-double border-forest px-3 py-2">
          <Icon name="pin" size={22} className="shrink-0" />
          <p className="text-[12.5px] font-semibold">{SCREENING_NOTE}</p>
        </div>
      </Section>

      {/* 7 */}
      <Section no={7} id="s7" title="Źródła danych" icon="ditch">
        <table className="num w-full border-collapse text-[10px] leading-tight">
          <caption className="eb mb-1 text-left">Źródła użyte w analizie, pobrane w chwili generowania raportu</caption>
          <thead>
            <tr className="border-b border-forest/40 text-left">
              <th scope="col" className="py-1 pr-2 font-semibold">Źródło</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Zakres / okres</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Status</th>
              <th scope="col" className="py-1 pr-2 font-semibold">Pobrano</th>
              <th scope="col" className="py-1 font-semibold">Licencja / uznanie autorstwa</th>
            </tr>
          </thead>
          <tbody>
            {r.sources.map((x) => (
              <tr key={x.id} className="raport-avoid border-b border-forest/15 align-top">
                <th scope="row" className="py-[3px] pr-2 text-left font-semibold">{x.label}</th>
                <td className="py-[3px] pr-2">
                  {x.detail}
                  {x.note ? <span className="block opacity-75">{x.note}</span> : null}
                </td>
                <td className={`py-[3px] pr-2 whitespace-nowrap ${x.status !== "ok" ? "font-semibold text-terra" : ""}`}>
                  {x.status === "ok" ? "" : "! "}
                  {STATUS_PL[x.status]}
                </td>
                <td className="py-[3px] pr-2 whitespace-nowrap">{dateTime(x.fetchedAt)}</td>
                <td className="py-[3px]">{licenseOf(x) || NA}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="raport-avoid mt-2 text-[9.5px] leading-snug opacity-85">
          <p className="eb mb-0.5 !text-[9px]">Uznanie autorstwa</p>
          <ul className="space-y-0.5">
            {attributions.map(([text, url]) => (
              <li key={text}>
                {text}
                {url ? (
                  <>
                    {" "}
                    (<a href={url} className="underline">{url.replace(/^https?:\/\//, "")}</a>)
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <footer className="raport-avoid mt-5 flex items-end justify-between gap-4 border-t border-forest/30 pt-2 text-[9.5px]">
        <p className="opacity-80">
          Raport przesiewowy z danych zdalnych. Nie zastępuje opinii agronoma, projektu ani pozwolenia. Działka {p.id} · {r.crop.namePl} ·{" "}
          {dateShort(r.request.date)}
        </p>
        <p className="sh shrink-0 text-[12px]">TRAKTOR · Let the land hold its water.</p>
      </footer>
    </article>
  );
}
