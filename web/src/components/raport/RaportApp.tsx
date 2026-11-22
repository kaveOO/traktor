"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { browser } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/brand/Icon";
import { Button, FooterLine, ProgressLine, SkipLink } from "@/components/brand/ui";
import { CROPS, type AnalysisError, type AnalysisResult, type CropId } from "@/lib/analiza";
import { FIXTURE } from "./fixture";
import { dateShort, dateTime } from "./format";
import { ReportSheet } from "./ReportSheet";
import { getSaved, listSaved, removeSaved, reportKey, saveReport, type SavedReport } from "./saved";

const PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 12mm 12mm 14mm;
  @bottom-left { content: "Let the land hold its water."; font: 8pt Inter, sans-serif; color: #1F3A22; }
  @bottom-right { content: "Strona " counter(page) " z " counter(pages); font: 8pt Inter, sans-serif; color: #1F3A22; }
}
@media print {
  html, body { background: #fff !important; }
  .raport-wrap { background: #fff !important; padding: 0 !important; }
  .raport-sheet { box-shadow: none !important; background: #fff !important; max-width: none !important; width: auto !important; padding: 0 !important; margin: 0 !important; zoom: 0.84; }
  .raport-sheet * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .raport-avoid, .raport-sheet figure, .raport-sheet tr { break-inside: avoid; }
  .raport-head, .raport-sheet h2, .raport-sheet h3, .raport-sheet caption { break-after: avoid; }
  .raport-sheet thead { display: table-header-group; }
  .raport-sheet a { color: inherit; text-decoration: none; }
}
`;

type Params = {
  parcelId: string | null;
  lon: string | null;
  lat: string | null;
  crop: CropId;
  date: string;
  demo: boolean;
  saved: string | null;
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
    demo: q.get("demo") === "1",
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
  | { kind: "error"; messagePl: string; step?: string }
  | { kind: "ok"; result: AnalysisResult; demo: boolean };

const TIMEOUT_MS = 60_000;

export default function RaportApp() {
  use(browser("Raport działa tylko w przeglądarce."));
  const [params] = useState(readParams);
  const [state, setState] = useState<State>(() => {
    if (params.demo) return { kind: "ok", result: FIXTURE, demo: true };
    if (params.saved) {
      const s = getSaved(params.saved);
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
          setState({ kind: "error", messagePl: body.messagePl || "Analiza nie powiodła się.", step: body.step });
          return;
        }
        if (!res.ok || !body.parcel) throw new Error(`Nieoczekiwana odpowiedź serwera (HTTP ${res.status}).`);
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
  const backHref = `/analiza?${queryOf(params, result)}`;

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raport-${result.parcel.id.replace(/[^\w.-]+/g, "_")}-${result.crop.id}-${result.request.date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const saveLocal = () => {
    if (!result) return;
    const { ok, list } = saveReport(result);
    setSaved(list);
    setNotice(ok ? "Raport zapisany w tej przeglądarce." : "Nie udało się zapisać: pamięć przeglądarki pełna lub zablokowana.");
  };

  const isSaved = result ? saved.some((s) => s.key === reportKey(result)) : false;

  const tool = "!min-h-11 !px-4 !text-[14px]";

  return (
    <div className="raport-wrap flex min-h-screen flex-col bg-cream-deep pb-10 text-forest print:bg-white print:pb-0">
      <style>{PRINT_CSS}</style>
      <SkipLink href="#raport">Przejdź do raportu</SkipLink>

      <div className="no-print sticky top-0 z-10 w-full border-b border-forest/15 bg-cream">
        <nav aria-label="Narzędzia raportu" className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2 px-4 py-2.5">
          <Link href={backHref} className="inline-flex min-h-11 items-center pr-2 text-[14px] font-medium underline-offset-4 hover:underline">
            <span aria-hidden>←</span>&nbsp;Wróć do analizy
          </Link>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" onClick={() => window.print()} disabled={!result} className={tool}>
              Drukuj / zapisz PDF
            </Button>
            <Button type="button" variant="secondary" onClick={downloadJson} disabled={!result} className={tool}>
              Pobierz JSON
            </Button>
            <Button type="button" variant="secondary" onClick={saveLocal} disabled={!result} className={tool}>
              {isSaved ? "Zapisano w przeglądarce" : "Zapisz w przeglądarce"}
            </Button>
          </div>
        </nav>
        <p role="status" className="mx-auto max-w-[210mm] px-4 text-[13px] [&:not(:empty)]:pb-2">
          {notice ?? ""}
        </p>
        {state.kind === "loading" && <ProgressLine label="Liczymy analizę" />}
      </div>

      <main id="raport" tabIndex={-1} className="flex w-full flex-col focus:outline-none">
        {state.kind === "loading" && (
          <div className="mx-auto mt-10 w-full max-w-[210mm] px-6">
            <p className="eb text-forest-muted">01 — Raport wodny działki</p>
            <h1 className="sh rise mt-2 text-[26px]">Liczymy analizę z aktualnych danych.</h1>
            <p className="mt-2 text-[16px] leading-[1.5]">Granice działki, pogoda z 10 lat, gleba, teren i zdjęcie satelitarne. Zwykle 10–30 s.</p>
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

        {state.kind === "error" && (
          <div className="mx-auto mt-10 w-full max-w-[210mm] px-6" role="alert">
            <p className="eb text-terra-ink">Błąd analizy{state.step ? ` · krok: ${state.step}` : ""}</p>
            <h1 className="sh mt-2 text-[30px]">Nie udało się przygotować raportu.</h1>
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
                <span>{s.cropPl}</span>
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
