"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { browser } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/brand/Icon";
import { Button, FooterLine, ProgressLine, SkipLink } from "@/components/brand/ui";
import { CROPS, type AnalysisError, type AnalysisResult, type CropId } from "@/lib/analiza";
import { FIXTURE } from "./fixture";
import { cropName, dateShort, dateTime } from "./format";
import { ReportSheet } from "./ReportSheet";
import { getSaved, isValidResult, listSaved, removeSaved, reportKey, saveReport, type SavedReport } from "./saved";

/** CSS string literal: no quotes, backslashes or line breaks from data can escape it. */
const cssStr = (s: string) => `"${s.replace(/[\\"\n\r]/g, " ")}"`;

/**
 * Print: A4, running header (parcel id + analysis date) and "Strona x z y" in the page margins.
 * Margin boxes print in Chromium (Chrome, Edge, Opera); Firefox and Safari skip them, the sheet
 * header and footer still carry the parcel id, the date and the method version.
 */
const printCss = (demo: boolean, r: AnalysisResult | null, marginBoxes: boolean) => {
  const head = r ? `Działka ${r.parcel.id} · ${cropName(r)} · analiza na ${dateShort(r.request.date)}` : "Raport wodny działki";
  const foot = `${demo ? "DEMO · dane przykładowe · " : ""}TRAKTOR · Raport wodny działki`;
  // demo marker: in the page margin where margin boxes print (no overlap); else a fixed element on each page
  const right = demo && marginBoxes ? "DEMO · dane przykładowe, nie wynik analizy" : r ? `wygenerowano ${dateTime(r.generatedAt, true)}` : "";
  const rightCss = demo && marginBoxes ? "font: 600 7.5pt sans-serif; letter-spacing: .08em; color: #984630;" : "font: 7.5pt sans-serif; color: #4A5E4C;";
  return `
@page {
  size: A4 portrait;
  margin: 13mm 12mm 13mm;
  @top-left { content: ${cssStr(head)}; font: 7.5pt sans-serif; color: #4A5E4C; }
  @top-right { content: ${cssStr(right)}; ${rightCss} }
  @bottom-left { content: ${cssStr(foot)}; font: 7.5pt sans-serif; color: ${demo ? "#984630" : "#1F3A22"}; }
  @bottom-right { content: "Strona " counter(page) " z " counter(pages); font: 7.5pt sans-serif; color: #1F3A22; }
}
@page :first { @top-left { content: none; } ${demo && marginBoxes ? "" : "@top-right { content: none; }"} }
@media print {
  ${demo && marginBoxes ? ".raport-wrap .raport-demo-print { display: none !important; }" : ""}
  /* demo marker repeated on every printed page (fixed elements print on each page) */
  .raport-demo-print { display: block !important; position: fixed; top: 0; right: 0; font: 600 7.5pt sans-serif; letter-spacing: .1em; text-transform: uppercase; color: #984630; border: 1px dashed #B5573B; padding: .6mm 2mm; background: #fff; }
  html, body { background: #fff !important; }
  .raport-wrap { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
  .raport-sheet { box-shadow: none !important; background: #fff !important; max-width: none !important; width: auto !important; padding: 0 !important; margin: 0 !important; zoom: 0.84; }
  .raport-sheet, .raport-sheet * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .raport-avoid, .raport-sheet figure, .raport-sheet tr, .raport-sheet li { break-inside: avoid; page-break-inside: avoid; }
  .raport-head, .raport-sheet h2, .raport-sheet h3, .raport-sheet caption, .raport-sheet thead { break-after: avoid; page-break-after: avoid; }
  .raport-sheet thead { display: table-header-group; }
  .raport-sheet p { orphans: 2; widows: 2; }
  .raport-sheet a { color: inherit; }
}
`;
};

type Params = {
  parcelId: string | null;
  lon: string | null;
  lat: string | null;
  crop: CropId;
  date: string;
  /** "1" = illustrative fixture; "historical" / "today" = recorded engine outputs (still demo-marked) */
  demo: DemoKind | null;
  saved: string | null;
};

type DemoKind = "1" | "historical" | "today";
const DEMO_KINDS: DemoKind[] = ["1", "historical", "today"];

/** Recorded engine samples load on demand, so they never weigh on the normal report bundle. */
async function loadDemo(kind: DemoKind): Promise<AnalysisResult> {
  if (kind === "historical") return (await import("@/lib/analiza/fixtures/sample-historical.json")).default as unknown as AnalysisResult;
  if (kind === "today") return (await import("@/lib/analiza/fixtures/sample-today.json")).default as unknown as AnalysisResult;
  return FIXTURE;
}

/** Today in Poland (the engine validates dates against Europe/Warsaw). */
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());

function readParams(): Params {
  const q = new URLSearchParams(window.location.search);
  const c = q.get("crop") as CropId | null;
  const d = q.get("date");
  return {
    parcelId: q.get("parcelId") || q.get("id"),
    lon: q.get("lon"),
    lat: q.get("lat"),
    crop: c && CROPS.some((x) => x.id === c) ? c : "pszenica_ozima",
    date: d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today(),
    demo: DEMO_KINDS.find((k) => k === q.get("demo")) ?? null,
    saved: q.get("saved"),
  };
}

function queryOf(p: Params, r?: AnalysisResult | null) {
  const q = new URLSearchParams();
  const pid = r?.parcel.id ?? p.parcelId;
  if (pid) q.set("parcelId", pid);
  else if (p.lon && p.lat) {
    q.set("lon", p.lon);
    q.set("lat", p.lat);
  }
  q.set("crop", r?.crop.id ?? p.crop);
  q.set("date", r?.request.date ?? p.date);
  return q.toString();
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; messagePl: string; step?: string; code?: string }
  | { kind: "ok"; result: AnalysisResult; demo: boolean };

const TIMEOUT_MS = 60_000;

/**
 * Engine answers that are not failures: the parcel itself is out of scope or not identified.
 * Retrying gives the same answer, so these get their own words and no "Spróbuj ponownie".
 */
const NOT_APPLICABLE: Record<string, { eyebrow: string; title: string; action: string }> = {
  NOT_AGRICULTURAL: { eyebrow: "Analiza nie dotyczy tej działki", title: "To nie jest grunt rolny.", action: "Wybierz inną działkę" },
  parcel_too_large: { eyebrow: "Analiza nie dotyczy tej działki", title: "Działka jest za duża do analizy.", action: "Wybierz inną działkę" },
  NEEDS_OBREB: { eyebrow: "Wskaż działkę dokładniej", title: "Podaj obręb albo pełny identyfikator.", action: "Popraw działkę" },
  AMBIGUOUS: { eyebrow: "Wskaż działkę dokładniej", title: "Kilka działek pasuje do tego numeru.", action: "Wybierz działkę" },
  parcel_not_found: { eyebrow: "Nie znaleziono działki", title: "Nie ma takiej działki w ULDK.", action: "Popraw działkę" },
};

export default function RaportApp() {
  use(browser("Raport działa tylko w przeglądarce."));
  const [params] = useState(readParams);
  // @page margin boxes print in Chromium 131+ (Chrome, Edge, Opera); Firefox and Safari ignore them
  const [marginBoxes] = useState(() => {
    const v = /Chrom(?:e|ium)\/(\d+)/.exec(navigator.userAgent);
    return !!v && Number(v[1]) >= 131;
  });
  const [state, setState] = useState<State>(() => {
    if (params.demo === "1") return { kind: "ok", result: FIXTURE, demo: true };
    if (params.demo) return { kind: "loading" };
    if (params.saved) {
      const s = getSaved(params.saved);
      if (s === "invalid") return { kind: "error", messagePl: "Zapisany raport ma stary lub uszkodzony format. Policz analizę ponownie." };
      if (s) return { kind: "ok", result: s, demo: false };
      return { kind: "error", messagePl: "Nie znaleziono zapisanego raportu w tej przeglądarce." };
    }
    if (!params.parcelId && !(params.lon && params.lat)) return { kind: "idle" };
    return { kind: "loading" };
  });
  const [saved, setSaved] = useState<SavedReport[]>(listSaved);
  const [notice, setNotice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const needsFetch = !params.demo && !params.saved && !!(params.parcelId || (params.lon && params.lat));

  useEffect(() => {
    if (!params.demo || params.demo === "1") return;
    let cancelled = false;
    loadDemo(params.demo).then(
      (result) => !cancelled && setState({ kind: "ok", result, demo: true }),
      () => !cancelled && setState({ kind: "error", messagePl: "Nie udało się wczytać danych przykładowych." }),
    );
    return () => {
      cancelled = true;
    };
  }, [params.demo]);

  useEffect(() => {
    if (!needsFetch) return;
    const ctrl = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    fetch(`/api/analiza?${queryOf(params)}`, { signal: ctrl.signal, headers: { accept: "application/json" } })
      .then(async (res) => {
        if (cancelled) return;
        const body = (await res.json().catch(() => null)) as AnalysisResult | AnalysisError | null;
        if (!body)
          throw new Error(
            res.status === 404
              ? "Serwis analizy jest niedostępny (HTTP 404). Spróbuj za chwilę."
              : `Serwer analizy nie odpowiedział poprawnie (HTTP ${res.status}).`,
          );
        if (cancelled) return;
        if ("error" in body) {
          setState({ kind: "error", messagePl: body.messagePl || "Analiza nie powiodła się.", step: body.step, code: body.error });
          return;
        }
        if (!res.ok || !isValidResult(body)) throw new Error(`Nieoczekiwana odpowiedź serwera (HTTP ${res.status}).`);
        setState({ kind: "ok", result: body, demo: false });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (ctrl.signal.aborted) {
          setState({ kind: "error", messagePl: `Analiza trwała dłużej niż ${TIMEOUT_MS / 1000} s i została przerwana.` });
        } else {
          setState({
            kind: "error",
            messagePl: e instanceof Error && e.message ? e.message : "Brak połączenia z serwerem analizy.",
          });
        }
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [attempt, needsFetch, params]);

  const retry = useCallback(() => {
    setState({ kind: "loading" });
    setAttempt((a) => a + 1);
  }, []);

  const result = state.kind === "ok" ? state.result : null;
  const demoMode = state.kind === "ok" && state.demo;
  const backHref = `/analiza?${queryOf(params, result)}`;

  const downloadJson = () => {
    if (!result) return;
    const name = `${demoMode ? "demo-" : ""}raport-${result.parcel.id.replace(/[^\w.-]+/g, "_")}-${result.crop.id}-${result.request.date}.json`;
    const text = JSON.stringify(result, null, 2);
    try {
      const blob = new Blob([text], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      // Safari (macOS and iOS) reads the blob after click() returns: removing or revoking it early cancels the file
      window.setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 30_000);
      setNotice(`Pobieranie pliku ${name}. Na iPhonie i iPadzie plik trafia do aplikacji Pliki (Pobrane).`);
    } catch {
      // very old browsers without Blob URLs: data URL
      const a = document.createElement("a");
      a.href = `data:application/json;charset=utf-8,${encodeURIComponent(text)}`;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const printPdf = () => {
    setNotice(null);
    window.print();
  };

  const saveLocal = () => {
    if (!result) return;
    const { ok, list } = saveReport(result);
    setSaved(list);
    setNotice(ok ? "Raport zapisany w tej przeglądarce." : "Nie udało się zapisać: pamięć przeglądarki pełna lub zablokowana.");
  };

  const isSaved = result ? saved.some((s) => s.key === reportKey(result)) : false;
  const na = state.kind === "error" && state.code ? NOT_APPLICABLE[state.code] : undefined;

  // brand §09: buttons keep the 48 px minimum height
  const tool = "!px-4 !text-[14px]";

  return (
    <div className="raport-wrap flex min-h-screen flex-col bg-cream-deep pb-10 text-forest print:bg-white print:pb-0">
      <style>{printCss(demoMode, result, marginBoxes)}</style>
      <SkipLink href="#raport">Przejdź do raportu</SkipLink>

      <div className="no-print sticky top-0 z-10 w-full border-b border-forest/15 bg-cream">
        <nav aria-label="Narzędzia raportu" className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2 px-4 py-2.5">
          <Link href={backHref} className="inline-flex min-h-12 items-center pr-2 text-[14px] font-medium underline-offset-4 hover:underline">
            <span aria-hidden>←</span>&nbsp;Wróć do analizy
          </Link>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" onClick={printPdf} disabled={!result} className={tool} aria-describedby={result ? "pdf-help" : undefined}>
              Zapisz PDF / drukuj
            </Button>
            <Button type="button" variant="secondary" onClick={downloadJson} disabled={!result} className={tool}>
              Pobierz JSON
            </Button>
            {!demoMode && (
              <Button type="button" variant="secondary" onClick={saveLocal} disabled={!result} className={tool}>
                {isSaved ? "Zapisano w przeglądarce" : "Zapisz w przeglądarce"}
              </Button>
            )}
          </div>
        </nav>
        {result && (
          <p id="pdf-help" className="mx-auto max-w-[210mm] px-4 pb-2 text-[13px] leading-snug text-forest-muted">
            PDF: w oknie drukowania wybierz „Zapisz jako PDF”, papier A4, skala 100%. Wyłącz „Nagłówki i stopki” przeglądarki: raport ma własne. Safari:
            Plik → Eksportuj jako PDF.
          </p>
        )}
        <p role="status" className="mx-auto max-w-[210mm] px-4 text-[13px] [&:not(:empty)]:pb-2">
          {notice ?? ""}
        </p>
        {state.kind === "loading" && <ProgressLine label="Liczymy analizę" />}
      </div>

      <main id="raport" tabIndex={-1} className="flex w-full flex-col focus:outline-none">
        {state.kind === "loading" && (
          <div className="mx-auto mt-10 w-full max-w-[210mm] px-6">
            <p className="eb text-forest-muted">01 — Raport wodny działki</p>
            {params.demo ? (
              <h1 className="sh rise mt-2 text-[26px]">Wczytujemy dane przykładowe.</h1>
            ) : (
              <>
                <h1 className="sh rise mt-2 text-[26px]">Liczymy analizę z aktualnych danych.</h1>
                <p className="mt-2 text-[16px] leading-[1.5]">Granice działki, pogoda z 10 lat, gleba, teren i zdjęcie satelitarne. Zwykle 10–30 s.</p>
              </>
            )}
          </div>
        )}

        {state.kind === "idle" && (
          <div className="mx-auto mt-10 w-full max-w-[210mm] px-6">
            <Logo height={20} />
            <p className="eb mt-8 text-forest-muted">01 — Raport wodny działki</p>
            <h1 className="hd rise mt-2 text-[48px]">Nie wskazano działki.</h1>
            <p className="mt-3 text-[16px] leading-[1.5]">Wybierz działkę, uprawę i datę w analizie. Raport otworzy się z wynikiem.</p>
            <Button href="/analiza" className="mt-6">
              <Icon name="pin" size={18} />
              Przejdź do analizy
            </Button>
          </div>
        )}

        {state.kind === "error" && na && (
          <div className="mx-auto mt-10 w-full max-w-[210mm] px-6" role="alert">
            <p className="eb text-forest-muted">{na.eyebrow}</p>
            <h1 className="hd mt-2 text-[40px]">{na.title}</h1>
            <p className="mt-3 text-[16px] leading-[1.5]">{state.messagePl}</p>
            <p className="mt-2 text-[14px] text-forest-muted">
              Działka <span className="num">{params.parcelId ?? (params.lon ? `${params.lat}, ${params.lon}` : "?")}</span>, data{" "}
              <span className="num">{dateShort(params.date)}</span>. Raportu nie tworzymy: ponowne liczenie da ten sam wynik.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button href={backHref}>
                <Icon name="pin" size={18} />
                {na.action}
              </Button>
            </div>
          </div>
        )}

        {state.kind === "error" && !na && (
          <div className="mx-auto mt-10 w-full max-w-[210mm] px-6" role="alert">
            <p className="eb text-terra-ink">Błąd analizy{state.step ? ` · krok: ${state.step}` : ""}</p>
            <h1 className="hd mt-2 text-[40px]">Nie udało się przygotować raportu.</h1>
            <p className="mt-3 text-[16px] leading-[1.5]">{state.messagePl}</p>
            <p className="mt-2 text-[14px] text-forest-muted">
              Działka <span className="num">{params.parcelId ?? (params.lon ? `${params.lat}, ${params.lon}` : "?")}</span>, data{" "}
              <span className="num">{dateShort(params.date)}</span>. Bez danych nie pokazujemy wyniku.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {needsFetch && (
                <Button type="button" onClick={retry}>
                  Spróbuj ponownie
                </Button>
              )}
              <Button href={backHref} variant="secondary">
                Wróć do analizy
              </Button>
            </div>
          </div>
        )}

        {state.kind === "ok" && <ReportSheet r={state.result} demo={state.demo} />}
      </main>

      {saved.length > 0 && (
        <aside aria-labelledby="zapisane" className="no-print mx-auto mt-8 w-full max-w-[210mm] px-4">
          <h2 id="zapisane" className="eb num mb-2 text-forest-muted">
            Zapisane raporty ({saved.length})
          </h2>
          <ul className="divide-y divide-forest/15 rounded-[4px] border border-forest/20 bg-cream text-[14px] shadow-[0_8px_24px_rgba(31,58,34,.18)]">
            {saved.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
                <a href={`/raport?saved=${encodeURIComponent(s.key)}`} className="num inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline">
                  {s.parcelId}
                </a>
                <span>{CROPS.find((c) => c.id === s.result?.crop?.id)?.namePl ?? s.cropPl}</span>
                <span className="num text-forest-muted">analiza na {dateShort(s.date)}</span>
                <span className="num ml-auto text-[12px] text-forest-muted">zapisano {dateTime(s.savedAt)}</span>
                <button
                  type="button"
                  onClick={() => setSaved(removeSaved(s.key))}
                  className="min-h-11 rounded-[2px] border-[1.5px] border-forest px-3 text-[13px] font-medium hover:brightness-[.94]"
                  aria-label={`Usuń zapisany raport ${s.parcelId} z ${dateShort(s.date)}`}
                >
                  Usuń
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[12px] text-forest-muted">Zapis tylko w tej przeglądarce. Do archiwum: JSON albo PDF.</p>
        </aside>
      )}

      {state.kind !== "ok" && (
        <footer className="no-print mx-auto mt-auto w-full max-w-[210mm] px-6 pt-10">
          <FooterLine />
        </footer>
      )}
    </div>
  );
}
