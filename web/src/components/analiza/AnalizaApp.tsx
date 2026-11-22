"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { browser } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/brand/Icon";
import { Segmented } from "@/components/brand/Segmented";
import { Button, Callout, FooterLine, ProgressLine, SectionEyebrow, SourceLine, StepRail, type StepState } from "@/components/brand/ui";
import { CROPS, type AnalysisResult, type CropId, type LonLat, type Parcel } from "@/lib/analiza";
import {
  fetchParcel,
  fmt,
  geocode,
  isAborted,
  joinPl,
  looksLikeParcelQuery,
  minDateIso,
  plPlural,
  postAnalysis,
  TIMEOUT,
  todayIso,
  validDate,
  type ApiError,
  type ParcelCandidate,
  type ParcelHit,
  type Place,
} from "./api";
import { fixtureResult } from "./fixture";
import MapView, { type Basemap, type MapMarker } from "./MapView";
import Results from "./Results";

const LOAD_STEPS: { label: string; icon: IconName }[] = [
  { label: "Działka (ULDK)", icon: "pin" },
  { label: "Pogoda, 10 lat", icon: "storm" },
  { label: "Satelita", icon: "lidar" },
  { label: "Gleba", icon: "drought" },
  { label: "Teren i rowy", icon: "ditch" },
];
const BASEMAPS = [
  { value: "satelita", label: "Satelita" },
  { value: "mapa", label: "Mapa" },
] as const;
const MAP_SOURCE: Record<Basemap, string> = {
  satelita: "Ortofotomapa i granice działek (GUGiK), Sentinel-2 cloudless 2016 (EOX, CC BY 4.0)",
  mapa: "OpenStreetMap (ODbL), granice działek (GUGiK)",
};
const ERR = "mt-1.5 text-[14px] font-medium text-terra-ink";
const CLICK_MIN_ZOOM = 13;
const SHOW_DEV = process.env.NODE_ENV !== "production";

type Phase = "form" | "loading" | "result" | "error";
type ErrKind = "ambiguous" | "needs_obreb" | "not_agri" | "too_large" | "not_found" | "bad_request" | "busy" | "timeout" | "other";

/** Engine 400 validation codes (server.ts validateRequest, /api/dzialka). Client codes such as BAD_RESPONSE are not field errors. */
const FIELD_CODE: Record<string, "parcel" | "crop" | "date"> = {
  bad_parcel: "parcel",
  bad_point: "parcel",
  bad_crop: "crop",
  bad_date: "date",
};

/**
 * Engine codes are mostly lowercase (bad_date, parcel_not_found, rate_limited, busy, uldk_error, internal),
 * three are uppercase (AMBIGUOUS, NEEDS_OBREB, NOT_AGRICULTURAL). Compare the exact engine strings.
 */
function kindOf(e: ApiError): ErrKind {
  const c = e.code;
  if (c === "AMBIGUOUS") return "ambiguous";
  if (c === "NEEDS_OBREB") return "needs_obreb";
  if (c === "NOT_AGRICULTURAL") return "not_agri";
  if (c === "parcel_too_large") return "too_large";
  if (c === "parcel_not_found") return "not_found";
  if (c in FIELD_CODE || c === "bad_json") return "bad_request";
  if (c === "rate_limited" || c === "busy" || e.status === 429 || e.status === 503) return "busy";
  if (c === TIMEOUT) return "timeout";
  return "other";
}

/** URL keeps parcelId (+ demo); crop and date are written only by an analysis run, so a reload re-runs only a real run. */
function syncUrl(q: { parcelId: string; crop?: string; date?: string }) {
  const url = new URL(window.location.href);
  url.searchParams.set("parcelId", q.parcelId);
  for (const k of ["crop", "date"] as const) {
    const v = q[k];
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  }
  window.history.replaceState(null, "", url);
}

const candidateLabel = (c: ParcelCandidate) =>
  [c.commune && `gm. ${c.commune}`, c.county && `pow. ${c.county}`, c.voivodeship && `woj. ${c.voivodeship}`].filter(Boolean).join(" · ");

export default function AnalizaApp() {
  use(browser("Mapa i analiza działają tylko w przeglądarce."));

  const [today] = useState(todayIso);
  const [minDate] = useState(minDateIso);

  const initial = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const crop = p.get("crop");
    const date = p.get("date") ?? "";
    return {
      parcelId: p.get("parcelId") ?? "",
      crop: (CROPS.some((c) => c.id === crop) ? crop : "") as CropId | "",
      date,
      dateOk: !date || validDate(date, minDate, today),
      demo: p.get("demo") === "1",
    };
  }, [minDate, today]);
  // the fixture parcel/result is allowed only in dev builds or with ?demo=1
  const allowFixture = SHOW_DEV || initial.demo;

  const [query, setQuery] = useState(initial.parcelId);
  const [searchMsg, setSearchMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [candidates, setCandidates] = useState<ParcelCandidate[]>([]);
  const [busySearch, setBusySearch] = useState(false);

  const [parcel, setParcel] = useState<ParcelHit | null>(null);
  const [parcelFixture, setParcelFixture] = useState(false);
  const [crop, setCrop] = useState<CropId | "">(initial.crop);
  const [date, setDate] = useState(initial.date && initial.dateOk ? initial.date : today);
  const [formErr, setFormErr] = useState<{ parcel?: string; crop?: string; date?: string }>(
    initial.dateOk ? {} : { date: `Data z adresu „${initial.date}” jest nieprawidłowa. Podaj datę od ${minDate} do ${today}.` },
  );

  const [phase, setPhase] = useState<Phase>("form");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isFixture, setIsFixture] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryIn, setRetryIn] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState("");
  const [sheetOpen, setSheetOpen] = useState(true);

  const [basemap, setBasemap] = useState<Basemap>("satelita");
  const [showParcels, setShowParcels] = useState(true);
  const [activeRec, setActiveRec] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lonLat: LonLat; zoom?: number; bbox?: [number, number, number, number]; key: number } | null>(
    null,
  );

  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  /** id of the current analysis run; a response from an older run is dropped */
  const runId = useRef(0);
  const runCtl = useRef<AbortController | null>(null);
  /** the newest parcel lookup / place search wins; older ones are aborted */
  const lookupCtl = useRef<AbortController | null>(null);
  /** a candidate picked after an AMBIGUOUS analysis (or a shared link) continues straight into the analysis */
  const pickContinues = useRef(!!(initial.crop && initial.date && initial.dateOk));

  const tooLarge = !!parcel?.tooLarge;
  const tooLargeMsg = (p: Parcel) => `Działka ma ${fmt(p.areaHa, 0, "ha")}. To za dużo na jedną analizę. Wybierz mniejszą działkę.`;

  /** phone: fold the sheet and scroll the search card to the candidate list (desktop: no-op scroll) */
  const revealCandidates = () => {
    setSheetOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById("cand-h")?.scrollIntoView({ block: "nearest" })));
  };

  const newLookup = () => {
    lookupCtl.current?.abort();
    const c = new AbortController();
    lookupCtl.current = c;
    return c.signal;
  };
  /** Drop the running analysis: its response must never land on a different parcel / fixture. */
  const cancelRun = useCallback(() => {
    runId.current++;
    runCtl.current?.abort();
    runCtl.current = null;
  }, []);

  // abort everything on unmount
  useEffect(
    () => () => {
      lookupCtl.current?.abort();
      runCtl.current?.abort();
    },
    [],
  );

  /** Selecting a parcel is announced once, by the search status line (#q-msg), not by the live region. */
  const selectParcel = useCallback(
    (p: ParcelHit, fixture = false, keepUrl = false) => {
      cancelRun();
      setParcel(p);
      setParcelFixture(fixture);
      setCandidates([]);
      setFormErr((e) => ({ ...e, parcel: p.tooLarge ? tooLargeMsg(p) : undefined }));
      setResult(null);
      setIsFixture(false);
      setError(null);
      setRetryIn(0);
      setLive("");
      setPhase("form");
      setActiveRec(null);
      if (!keepUrl) syncUrl({ parcelId: p.id });
    },
    [cancelRun],
  );

  /** Search status text for a failed parcel lookup, per error code. */
  const parcelErrorText = (e: ApiError) => {
    switch (kindOf(e)) {
      case "busy":
        return joinPl(e.messagePl, e.retryAfterS && !/odczekaj|spróbuj/i.test(e.messagePl) ? `Spróbuj za ${e.retryAfterS} s` : null);
      case "timeout":
        return joinPl("Serwer działek nie odpowiedział w 20 s", "Spróbuj ponownie");
      default:
        return joinPl(e.messagePl);
    }
  };

  /**
   * Parcel by id/text or by map point. The newest lookup wins (older ones are aborted, their answers dropped).
   * Returns the parcel, null on a real failure, or "aborted" when a newer lookup replaced this one.
   */
  const lookupParcel = useCallback(
    async (q: { id: string } | { lonLat: LonLat }, keepUrl = false): Promise<ParcelHit | null | "aborted"> => {
      const signal = newLookup();
      setBusySearch(true);
      setPlaces([]);
      setSearchMsg({ text: "id" in q ? "Szukam działki…" : "Szukam działki w tym miejscu…" });
      const r = await fetchParcel(q, "id" in q && allowFixture, signal);
      if (isAborted(r) || signal.aborted) return "aborted";
      setBusySearch(false);
      if (r.ok) {
        selectParcel(r.data, !!r.fixture, keepUrl);
        setQuery(r.data.id);
        setSearchMsg(
          r.data.tooLarge
            ? { text: tooLargeMsg(r.data), error: true }
            : {
                text: `${r.fixture ? "Działka przykładowa (serwer niedostępny)" : "Wybrano działkę"} ${r.data.id}${
                  r.data.commune ? `, gm. ${r.data.commune}` : ""
                }, ${fmt(r.data.areaHa, 2, "ha")}.`,
              },
        );
        return r.data;
      }
      if (kindOf(r.error) === "ambiguous" && r.error.candidates?.length) {
        const n = r.error.candidates.length;
        setCandidates(r.error.candidates);
        revealCandidates();
        setSearchMsg({ text: `${plPlural(n, "Pasuje", "Pasują", "Pasuje")} ${n} ${plPlural(n, "działka", "działki", "działek")}. Wybierz właściwą z listy.`, error: true });
        return null;
      }
      setCandidates([]);
      setSearchMsg({ text: parcelErrorText(r.error), error: true });
      return null;
    },
    [selectParcel, allowFixture],
  );

  const runAnalysis = useCallback(async (p: Parcel, c: CropId, d: string) => {
    // one run at a time: a new run replaces (and aborts) the old one
    runCtl.current?.abort();
    const ctl = new AbortController();
    runCtl.current = ctl;
    const id = ++runId.current;
    setPhase("loading");
    setError(null);
    setRetryIn(0);
    setResult(null);
    setIsFixture(false);
    setActiveRec(null);
    setElapsed(0);
    setSheetOpen(true);
    setFormErr({});
    setLive("Analiza rozpoczęta. Pobieramy dane z pięciu źródeł.");
    syncUrl({ parcelId: p.id, crop: c, date: d });
    const r = await postAnalysis(
      { parcelId: p.id, crop: c, date: d },
      {
        signal: ctl.signal,
        onRetryWait: (s) => {
          if (id === runId.current) setLive(`Serwer jest zajęty. Ponawiamy za ${s} s.`);
        },
      },
    );
    if (id !== runId.current || isAborted(r)) return;
    runCtl.current = null;
    setLive("");
    if (r.ok) {
      setResult(r.data);
      setIsFixture(false);
      setPhase("result");
      return;
    }
    const e = r.error;
    const k = kindOf(e);
    if (k === "bad_request") {
      // field-level message, no error box
      const field = FIELD_CODE[e.code] ?? "parcel";
      setFormErr((x) => ({ ...x, [field]: joinPl(e.messagePl) }));
      setPhase("form");
      requestAnimationFrame(() => document.getElementById(field === "date" ? "f-date" : field === "crop" ? "f-crop" : "f-parcel")?.focus());
      return;
    }
    if (k === "ambiguous" && e.candidates?.length) {
      setCandidates(e.candidates);
      pickContinues.current = true;
    }
    if (k === "needs_obreb") pickContinues.current = false;
    if (k === "busy") setRetryIn(e.retryAfterS ?? 10);
    setError(e);
    setPhase("error");
  }, []);

  // retry countdown for rate_limited / busy
  useEffect(() => {
    if (retryIn <= 0) return;
    const t = setTimeout(() => setRetryIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [retryIn]);

  // elapsed seconds while loading (announced every 10 s)
  useEffect(() => {
    if (phase !== "loading") return;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const s = Math.round((Date.now() - t0) / 1000);
      setElapsed(s);
      if (s > 0 && s % 10 === 0) setLive(`Trwa analiza, ${s} s.`);
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // focus the labelled result / error heading (it carries the announcement; no extra live message)
  useEffect(() => {
    if (phase === "result") document.getElementById("wyniki-h")?.focus();
    if (phase === "error") document.getElementById("err-h")?.focus();
  }, [phase, result]);

  // URL state on load
  useEffect(() => {
    if (!initial.parcelId) return;
    let cancelled = false;
    (async () => {
      const p = await lookupParcel({ id: initial.parcelId }, true);
      if (cancelled || !p || p === "aborted" || p.tooLarge) return;
      if (initial.crop && initial.date && initial.dateOk) {
        pickContinues.current = false;
        if (initial.demo) {
          setResult(fixtureResult({ crop: initial.crop, date: initial.date }));
          setIsFixture(true);
          setPhase("result");
        } else runAnalysis(p, initial.crop, initial.date);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, lookupParcel, runAnalysis]);

  const goPlace = (pl: Place) => setFlyTarget({ lonLat: pl.lonLat, bbox: pl.bbox, zoom: 14, key: Date.now() });

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setPlaces([]);
    setCandidates([]);
    pickContinues.current = false;
    if (!q) {
      setSearchMsg({ text: "Wpisz numer działki lub nazwę miejscowości.", error: true });
      return;
    }
    // anything with a digit goes to the engine first: full id, id without _N, AR_ sheet, "Zakrzewo 306/2"
    if (looksLikeParcelQuery(q)) {
      await lookupParcel({ id: q });
      return;
    }
    const signal = newLookup();
    setBusySearch(true);
    setSearchMsg({ text: "Szukam miejscowości…" });
    const r = await geocode(q, signal);
    if (isAborted(r) || signal.aborted) return;
    setBusySearch(false);
    if (!r.ok) {
      setSearchMsg({ text: "Wyszukiwarka miejscowości nie odpowiada. Wpisz numer działki albo spróbuj za chwilę.", error: true });
      return;
    }
    if (!r.data.length) {
      setSearchMsg({ text: `Nie znaleziono „${q}”. Wpisz inną nazwę albo obręb i numer działki.`, error: true });
      return;
    }
    const n = r.data.length;
    setPlaces(r.data);
    goPlace(r.data[0]);
    setSearchMsg({ text: `Znaleziono ${n} ${plPlural(n, "miejsce", "miejsca", "miejsc")}. Przybliż mapę i kliknij swoją działkę.` });
  };

  const pickCandidate = async (c: ParcelCandidate) => {
    const cont = pickContinues.current;
    setCandidates([]);
    setQuery(c.id);
    const p = await lookupParcel({ id: c.id });
    if (p === "aborted") return; // a newer pick / search took over; it decides whether to continue
    pickContinues.current = false;
    if (p && cont && !p.tooLarge && crop && validDate(date, minDate, today)) runAnalysis(p, crop, date);
    else if (p) requestAnimationFrame(() => document.getElementById(crop ? "analyze" : "f-crop")?.focus());
  };

  const onMapClick = useCallback(
    async (lonLat: LonLat, zoom: number) => {
      if (zoom < CLICK_MIN_ZOOM) {
        setSearchMsg({ text: "Przybliż mapę, aby wskazać działkę." });
        return;
      }
      pickContinues.current = false;
      setCandidates([]);
      await lookupParcel({ lonLat });
    },
    [lookupParcel],
  );

  const onAnalyze = (e: FormEvent) => {
    e.preventDefault();
    if (phase === "loading") return; // double submit (Enter in a field, double click)
    const err: typeof formErr = {};
    if (busySearch) err.parcel = "Trwa wyszukiwanie działki. Poczekaj chwilę.";
    else if (!parcel) err.parcel = "Najpierw wybierz działkę: wpisz numer w wyszukiwarce albo kliknij mapę.";
    else if (tooLarge) err.parcel = tooLargeMsg(parcel);
    if (!crop) err.crop = "Wybierz uprawę.";
    if (!date || !validDate(date, minDate, today)) err.date = `Podaj datę od ${minDate} do ${today}.`;
    setFormErr(err);
    if (Object.keys(err).length) {
      const first = err.parcel ? "f-parcel" : err.crop ? "f-crop" : "f-date";
      document.getElementById(first)?.focus();
      return;
    }
    runAnalysis(parcel!, crop as CropId, date);
  };

  const loadFixture = () => {
    cancelRun();
    setLive("");
    setResult(fixtureResult({ crop: (crop || "pszenica_ozima") as CropId, date }));
    setIsFixture(true);
    setError(null);
    setRetryIn(0);
    setPhase("result");
  };

  /** Back to the search field (on a phone the sheet folds down so the search card is visible). */
  const chooseAnother = () => {
    setPhase("form");
    setError(null);
    setRetryIn(0);
    setSheetOpen(false);
    const q = document.getElementById("q") as HTMLInputElement | null;
    q?.focus();
    q?.select();
  };

  const showCandidates = () => {
    setSheetOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById("cand-first")?.focus()));
  };

  const retry = () => {
    if (!parcel || !crop || retryIn > 0 || phase === "loading") return;
    if (!validDate(date, minDate, today)) {
      setFormErr((x) => ({ ...x, date: `Podaj datę od ${minDate} do ${today}.` }));
      setPhase("form");
      requestAnimationFrame(() => document.getElementById("f-date")?.focus());
      return;
    }
    runAnalysis(parcel, crop, date);
  };

  // map markers from recommendations with a location
  const markers: MapMarker[] = useMemo(
    () =>
      (result?.recommendations ?? [])
        .filter((r) => r.location)
        .map((r, i) => ({ id: r.id, lonLat: r.location!, label: r.titlePl, n: i + 1 })),
    [result],
  );
  const markerNumber = useCallback((id: string) => markers.find((m) => m.id === id)?.n ?? 0, [markers]);
  const shownParcel = result?.parcel ?? parcel;

  const onSelectRec = (id: string) => {
    setActiveRec(id);
    const m = markers.find((x) => x.id === id);
    if (m) setFlyTarget({ lonLat: m.lonLat, zoom: 16, key: Date.now() });
  };
  const onMarkerClick = (id: string) => {
    setActiveRec(id);
    setSheetOpen(true);
    const rec = result?.recommendations.find((r) => r.id === id);
    setLive(rec ? `Rekomendacja: ${rec.titlePl}` : "");
    requestAnimationFrame(() => document.getElementById(`rec-${id}`)?.scrollIntoView({ block: "nearest" }));
  };

  const mapLabel = shownParcel
    ? `Mapa. Wybrana działka ${shownParcel.id}${shownParcel.commune ? `, gmina ${shownParcel.commune}` : ""}, ${fmt(shownParcel.areaHa, 2)} ha.${
        markers.length ? ` ${markers.length} ${plPlural(markers.length, "znacznik", "znaczniki", "znaczników")} rekomendacji.` : ""
      } Strzałki przesuwają mapę, plus i minus zmieniają przybliżenie.`
    : "Mapa Polski. Nie wybrano działki. Strzałki przesuwają mapę, plus i minus zmieniają przybliżenie.";

  const raportHref =
    shownParcel && result
      ? `/raport?parcelId=${encodeURIComponent(shownParcel.id)}&crop=${result.crop.id}&date=${result.request.date}${isFixture ? "&demo=1" : ""}`
      : "";

  const steps: { label: string; state: StepState }[] = (() => {
    const done = [!!parcel && !tooLarge, !!crop, !!date && !formErr.date];
    const cur = done.indexOf(false);
    return ["Działka", "Uprawa", "Data"].map((label, i) => ({
      label,
      state: done[i] ? "done" : i === cur ? "current" : "todo",
    }));
  })();
  const resultPhase = phase === "result" && !!result;
  /** crop or date changed after the result: the result below is for the previous inputs */
  const resultStale = resultPhase && !isFixture && (result!.crop.id !== crop || result!.request.date !== date);
  const loading = phase === "loading";
  const ek = error ? kindOf(error) : null;
  const canRetry = ek === "busy" || ek === "timeout" || ek === "other";

  const errTitle: Record<ErrKind, string> = {
    ambiguous: "Kilka działek pasuje",
    needs_obreb: "Podaj obręb",
    not_agri: "To nie jest działka rolna",
    too_large: "Działka za duża",
    not_found: "Nie znaleziono działki",
    bad_request: "Popraw dane",
    busy: error?.code === "rate_limited" ? "Za dużo zapytań" : "Serwer jest zajęty",
    timeout: "Serwer nie odpowiedział",
    other: "Analiza nie powiodła się",
  };
  const errBody = (e: ApiError, k: ErrKind) => {
    switch (k) {
      case "ambiguous":
        return joinPl(e.messagePl);
      case "not_agri":
        return joinPl(e.messagePl, /nie dotyczy/i.test(e.messagePl) ? null : "Analiza suszy rolniczej nie dotyczy tej działki");
      case "busy":
        return joinPl(e.messagePl);
      case "timeout":
        return joinPl(e.messagePl, "Spróbuj ponownie");
      case "other":
        return joinPl(e.messagePl, /spróbuj/i.test(e.messagePl) ? null : "Spróbuj ponownie");
      default:
        return joinPl(e.messagePl);
    }
  };

  return (
    <div className="analiza-ui fixed inset-0 overflow-hidden bg-cream-deep text-forest">
      <a
        href="#panel"
        onClick={(e) => {
          e.preventDefault();
          setSheetOpen(true);
          panelHeadingRef.current?.focus();
        }}
        className="absolute top-2 left-2 z-50 -translate-y-24 rounded-[2px] bg-forest px-4 py-3 font-medium text-cream focus:translate-y-0"
      >
        Przejdź do panelu analizy
      </a>

      <h1 className="sr-only">TRAKTOR: analiza wody na działce</h1>

      <MapView
        parcel={shownParcel}
        basemap={basemap}
        showParcels={showParcels}
        markers={markers}
        activeMarker={activeRec}
        onMarkerClick={onMarkerClick}
        onMapClick={onMapClick}
        flyTarget={flyTarget}
        ariaLabel={mapLabel}
      />

      {/* top-left: logo strip + search card */}
      <header className="pointer-events-none absolute top-3 left-3 z-20 w-[min(420px,calc(100vw-24px))] min-[900px]:w-[min(440px,calc(100vw-500px))]">
        {/* phone: ends above the bottom sheet (60vh open / 25vh folded), so the AMBIGUOUS list is never hidden under it */}
        <div
          className={`pointer-events-auto overflow-y-auto overscroll-contain rounded-[4px] bg-cream/95 text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)] ${
            sheetOpen ? "max-h-[calc(100dvh-60vh-24px)]" : "max-h-[calc(100dvh-25vh-24px)]"
          } min-[900px]:max-h-[calc(100dvh-24px)]`}
        >
          <div className="flex items-center justify-between gap-3 bg-forest px-4 text-cream">
            <Link href="/" aria-label="TRAKTOR, strona główna" className="inline-flex min-h-12 shrink-0 items-center">
              <Logo height={18} color="cream" />
            </Link>
            <Link
              href="/mapa"
              className="inline-flex min-h-11 items-center gap-1.5 text-right text-[12px] leading-tight text-cream-muted underline-offset-4 hover:text-cream hover:underline"
            >
              <Icon name="board" size={16} className="shrink-0" />
              Przykład: zastawki na rowach (pod Bydgoszczą)
            </Link>
          </div>

          <div className="p-6 max-[899px]:p-4">
            <form role="search" onSubmit={onSearch} aria-label="Szukaj działki lub miejscowości">
              <label htmlFor="q" className="eb text-forest-muted">
                Działka lub miejscowość
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="np. Zakrzewo 306/2"
                  aria-describedby="q-hint q-msg"
                  aria-invalid={searchMsg?.error || undefined}
                  autoComplete="off"
                  spellCheck={false}
                  className="num min-h-12 min-w-0 flex-1 rounded-[2px] border-[1.5px] border-forest bg-cream px-3 text-[16px] placeholder:text-forest-muted"
                />
                {/* not `disabled`: a newer search replaces the running one, and focus stays on the button */}
                <Button type="submit" className="!px-4">
                  <Icon name="pin" size={18} />
                  Szukaj
                </Button>
              </div>
              <p id="q-hint" className="mt-1.5 text-[12px] leading-snug text-forest-muted">
                Pełny identyfikator: <span className="num">040307_2.0023.306/2</span> albo obręb i numer: <span className="num">Zakrzewo 306/2</span>.
              </p>
              <details className="mt-1 text-[12px] leading-snug">
                <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium underline-offset-2 hover:underline">
                  Gdzie znaleźć numer i jakie formaty działają?
                </summary>
                <ul className="mt-1 mb-2 list-disc space-y-1 pl-4 text-forest-muted">
                  <li>Numer jest na wypisie z rejestru gruntów, we wniosku o dopłaty (ARiMR) i na geoportal.gov.pl.</li>
                  <li>
                    Pełny identyfikator: TERYT gminy, typ, obręb, numer, np. <span className="num">040307_2.0023.306/2</span>. Bez członu „_2”
                    też zadziała.
                  </li>
                  <li>
                    Obręb i numer: <span className="num">Zakrzewo 306/2</span>. Zamiast „/” można wpisać „-”.
                  </li>
                  <li>
                    Arkusz mapy: <span className="num">…0023.AR_1.306/2</span>.
                  </li>
                  <li>Sam numer („306/2”) nie wystarczy: jest w wielu obrębach.</li>
                  <li>Nazwę miejscowości bez cyfr szukamy w OpenStreetMap (Nominatim).</li>
                </ul>
              </details>
              {busySearch && <ProgressLine className="mt-2" label="Szukam…" />}
              <p
                id="q-msg"
                role="status"
                className={`mt-1.5 min-h-5 text-[13px] leading-snug ${searchMsg?.error ? "font-medium text-terra-ink" : "text-forest-muted"}`}
              >
                {searchMsg?.text ?? ""}
              </p>
            </form>

            {candidates.length > 0 && (
              <div className="mt-2">
                <p id="cand-h" className="eb text-forest-muted">
                  Pasujące działki (<span className="num">{candidates.length}</span>)
                </p>
                <ul aria-labelledby="cand-h" className="mt-1 max-h-56 divide-y divide-forest/10 overflow-y-auto border-y border-forest/15">
                  {candidates.map((c, i) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        id={i === 0 ? "cand-first" : undefined}
                        onClick={() => pickCandidate(c)}
                        className="flex min-h-11 w-full flex-col items-start justify-center px-1 py-1.5 text-left hover:bg-cream-deep"
                      >
                        <span className="num text-[14px] font-semibold break-all">{c.id}</span>
                        <span className="text-[12px] leading-snug text-forest-muted">
                          {candidateLabel(c) || "brak danych o położeniu"}
                          {c.region ? ` · obręb ${c.region}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {places.length > 1 && (
              <ul className="mt-1 max-h-40 divide-y divide-forest/10 overflow-y-auto border-y border-forest/15" aria-label="Wyniki wyszukiwania">
                {places.map((p, i) => (
                  <li key={`${i}-${p.label}`}>
                    <button
                      type="button"
                      onClick={() => goPlace(p)}
                      className="flex min-h-11 w-full items-center gap-2 px-1 text-left text-[13px] leading-snug hover:bg-cream-deep"
                    >
                      <Icon name="pin" size={16} className="shrink-0" />
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-forest/15 pt-3">
              <Segmented label="Podkład mapy" options={BASEMAPS} value={basemap} onChange={setBasemap} />
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={showParcels}
                  onChange={(e) => setShowParcels(e.target.checked)}
                  className="size-5 accent-forest"
                />
                Granice działek (od przybliżenia 15)
              </label>
            </div>
            <SourceLine tone="onCream" className="mt-2">
              {MAP_SOURCE[basemap]}
            </SourceLine>
          </div>
        </div>
      </header>

      {/* right panel (desktop) / collapsible bottom sheet (mobile: ~60% / ~25% of the screen) */}
      <main
        id="panel"
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[4px] bg-cream text-forest min-[900px]:bg-cream/95 shadow-[0_-8px_24px_rgba(31,58,34,.18)] transition-[height] duration-300 ease-in-out ${sheetOpen ? "h-[60vh]" : "h-[25vh]"} min-[900px]:inset-y-3 min-[900px]:right-3 min-[900px]:left-auto min-[900px]:h-auto min-[900px]:w-[420px] min-[900px]:rounded-[4px] min-[900px]:shadow-[0_8px_24px_rgba(31,58,34,.18)]`}
        aria-labelledby="panel-h"
      >
        <button
          type="button"
          onClick={() => setSheetOpen((o) => !o)}
          aria-expanded={sheetOpen}
          aria-controls="panel-body"
          className="flex min-h-11 w-full shrink-0 flex-col items-center justify-center gap-1 border-b border-forest/15 min-[900px]:hidden"
        >
          <span aria-hidden className="h-1 w-10 rounded-full bg-forest/50" />
          <span className="text-[12px] font-medium">{sheetOpen ? "Zwiń panel" : "Rozwiń panel"}</span>
        </button>

        <div id="panel-body" className="min-h-0 flex-1 overflow-y-auto p-5 min-[900px]:p-6">
          <SectionEyebrow no={resultPhase ? 2 : 1} className="text-forest-muted">
            {resultPhase ? "Wynik" : "Dane działki"}
          </SectionEyebrow>
          <h2 id="panel-h" ref={panelHeadingRef} tabIndex={-1} className="hd rise mt-2 text-[40px]">
            Sprawdź działkę
          </h2>
          <p className="mt-2 text-[15px] leading-[1.45]">Działka, uprawa, data. Resztę bierzemy z danych publicznych.</p>

          <StepRail steps={steps} label="Kroki formularza" className="mt-5" />

          <form onSubmit={onAnalyze} noValidate className="mt-5 space-y-6">
            <fieldset>
              <legend className="flex items-baseline gap-2">
                <span className="eb num text-forest-muted">01</span>
                <span className="sh text-[20px]">Działka</span>
              </legend>
              <div
                id="f-parcel"
                tabIndex={-1}
                aria-describedby={formErr.parcel ? "e-parcel" : undefined}
                className={`mt-2 rounded-[4px] border bg-cream p-4 text-[15px] ${formErr.parcel ? "border-terra" : "border-forest/15"}`}
              >
                {parcel ? (
                  <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5">
                    <dt className="eb text-forest-muted">Numer</dt>
                    <dd className="num font-semibold break-all">{parcel.id}</dd>
                    <dt className="eb text-forest-muted">Gmina</dt>
                    <dd>
                      {parcel.commune ?? "brak danych"}
                      {parcel.county ? `, ${parcel.county}` : ""}
                    </dd>
                    {parcel.region && (
                      <>
                        <dt className="eb text-forest-muted">Obręb</dt>
                        <dd>{parcel.region}</dd>
                      </>
                    )}
                    <dt className="eb text-forest-muted">Pow.</dt>
                    <dd className={`num ${tooLarge ? "font-semibold text-terra-ink" : ""}`}>{fmt(parcel.areaHa, 2, "ha")}</dd>
                  </dl>
                ) : (
                  <p className="flex items-start gap-2">
                    <Icon name="pin" size={20} className="mt-0.5 shrink-0" />
                    <span>
                      Wpisz numer w{" "}
                      <button type="button" className="font-medium underline underline-offset-2" onClick={() => document.getElementById("q")?.focus()}>
                        wyszukiwarce
                      </button>{" "}
                      albo kliknij działkę na mapie.
                    </span>
                  </p>
                )}
                {parcelFixture && <p className="mt-2 text-[13px] text-terra-ink">Granice z danych przykładowych.</p>}
              </div>
              {formErr.parcel && (
                <p id="e-parcel" className={ERR}>
                  {formErr.parcel}
                </p>
              )}
            </fieldset>

            <fieldset>
              <legend className="flex items-baseline gap-2">
                <span className="eb num text-forest-muted">02</span>
                <span className="sh text-[20px]">Uprawa</span>
              </legend>
              <label htmlFor="f-crop" className="mt-2 block text-[14px]">
                Co rośnie na działce?
              </label>
              <select
                id="f-crop"
                value={crop}
                onChange={(e) => {
                  setCrop(e.target.value as CropId);
                  setFormErr((x) => ({ ...x, crop: undefined }));
                }}
                aria-invalid={!!formErr.crop || undefined}
                aria-describedby={formErr.crop ? "e-crop" : undefined}
                className={`mt-1.5 min-h-12 w-full rounded-[2px] border-[1.5px] bg-cream px-3 text-[16px] ${formErr.crop ? "border-terra-ink" : "border-forest"}`}
              >
                <option value="">Wybierz uprawę</option>
                {CROPS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.namePl}
                  </option>
                ))}
              </select>
              {formErr.crop && (
                <p id="e-crop" className={ERR}>
                  {formErr.crop}
                </p>
              )}
            </fieldset>

            <fieldset>
              <legend className="flex items-baseline gap-2">
                <span className="eb num text-forest-muted">03</span>
                <span className="sh text-[20px]">Data</span>
              </legend>
              <label htmlFor="f-date" className="mt-2 block text-[14px]">
                Na jaki dzień liczymy?
              </label>
              <input
                id="f-date"
                type="date"
                value={date}
                min={minDate}
                max={today}
                onChange={(e) => {
                  setDate(e.target.value);
                  setFormErr((x) => ({ ...x, date: undefined }));
                }}
                aria-invalid={!!formErr.date || undefined}
                aria-describedby={`d-hint${formErr.date ? " e-date" : ""}`}
                className={`num mt-1.5 min-h-12 w-full rounded-[2px] border-[1.5px] bg-cream px-3 text-[16px] ${formErr.date ? "border-terra-ink" : "border-forest"}`}
              />
              <p id="d-hint" className="num mt-1.5 text-[13px] text-forest-muted">
                Od {minDate} do {today} (do 10 lat wstecz, czas polski).
              </p>
              {formErr.date && (
                <p id="e-date" className={ERR}>
                  {formErr.date}
                </p>
              )}
            </fieldset>

            {resultStale && (
              <p className="text-[14px] font-medium">Zmieniono uprawę lub datę. Wynik niżej jest dla poprzednich danych. Kliknij „Analizuj działkę”.</p>
            )}
            {/* aria-disabled, not disabled: focus must not drop to <body> when the run starts; onAnalyze ignores repeats */}
            <Button
              type="submit"
              id="analyze"
              aria-disabled={loading || tooLarge || undefined}
              className={`w-full ${loading || tooLarge ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <Icon name="water" size={20} />
              {loading ? "Liczymy…" : "Analizuj działkę"}
            </Button>
          </form>

          <div aria-live="polite" role="status" className="sr-only">
            {live}
          </div>

          {loading && (
            <section aria-labelledby="load-h" className="mt-8">
              <p className="eb text-forest-muted">W toku</p>
              <h2 id="load-h" className="sh mt-1 text-[26px]">
                Liczymy
              </h2>
              <ProgressLine className="mt-3" label="Analiza w toku" />
              <p className="mt-2 text-[14px] text-forest-muted">
                Minęło <span className="num">{elapsed}</span> s. Zwykle <span className="num">10–30</span> s. Pięć źródeł naraz:
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[15px]">
                {LOAD_STEPS.map((s) => (
                  <li key={s.label} className="flex items-center gap-2.5">
                    <Icon name={s.icon} size={20} />
                    {s.label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {phase === "error" && error && ek && (
            <Callout tone="warning" icon={ek === "not_agri" ? "tractor" : ek === "busy" || ek === "timeout" ? "storm" : "pin"} className="mt-8">
              <h2 id="err-h" tabIndex={-1} aria-describedby="err-msg" className="sh text-[20px] text-terra-ink outline-none">
                {errTitle[ek]}
              </h2>
              <p id="err-msg" className="mt-1">
                {errBody(error, ek)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ek === "ambiguous" && candidates.length > 0 && (
                  <Button type="button" onClick={showCandidates}>
                    Pokaż listę działek
                  </Button>
                )}
                {canRetry && (
                  <Button
                    type="button"
                    aria-disabled={retryIn > 0 || undefined}
                    className={retryIn > 0 ? "cursor-not-allowed opacity-50" : ""}
                    onClick={retry}
                  >
                    {retryIn > 0 ? (
                      <>
                        Spróbuj za <span className="num">{retryIn}</span> s
                      </>
                    ) : (
                      "Spróbuj ponownie"
                    )}
                  </Button>
                )}
                {(ek === "not_agri" || ek === "too_large" || ek === "not_found" || ek === "needs_obreb") && (
                  <Button type="button" variant={ek === "needs_obreb" ? "primary" : "secondary"} onClick={chooseAnother}>
                    {ek === "needs_obreb" ? "Popraw numer działki" : "Wybierz inną działkę"}
                  </Button>
                )}
              </div>
            </Callout>
          )}

          {resultPhase && (
            <div className="mt-8 border-t-2 border-forest pt-6">
              <Results r={result!} activeRec={activeRec} onSelectRec={onSelectRec} markerNumber={markerNumber} fixture={isFixture} />
              <div className="mt-8 flex flex-col gap-2">
                <Button href={raportHref} target="_blank" className="w-full">
                  Raport do druku (PDF){isFixture ? " · dane przykładowe" : ""}
                  <span className="sr-only"> (otwiera się w nowej karcie)</span>
                </Button>
              </div>
            </div>
          )}

          {allowFixture && (
            <div className="mt-8 border-t border-forest/15 pt-3">
              <p className="eb text-forest-muted">Tryb deweloperski</p>
              <button type="button" onClick={loadFixture} className="mt-1 min-h-11 text-[14px] underline underline-offset-2">
                Wczytaj dane przykładowe
              </button>
            </div>
          )}

          <footer className="mt-8 border-t border-forest/15 pt-3">
            <p className="text-[12px] leading-snug text-forest-muted">
              Ocena z danych publicznych. Każde zalecenie wymaga wizji lokalnej. Nazwy miejscowości wyszukuje OpenStreetMap (Nominatim).
            </p>
            <FooterLine className="mt-1.5" />
          </footer>
        </div>
      </main>
    </div>
  );
}
