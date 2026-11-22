"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { browser } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/brand/Icon";
import { Segmented } from "@/components/brand/Segmented";
import { Button, Callout, FooterLine, ProgressLine, SectionEyebrow, SourceLine, StepRail, type StepState } from "@/components/brand/ui";
import { CROPS, type AnalysisResult, type CropId, type LonLat, type Parcel } from "@/lib/analiza";
import { fetchParcel, fmt, geocode, looksLikeParcelId, minDateIso, postAnalysis, todayIso, type Place } from "./api";
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

export default function AnalizaApp() {
  use(browser("Mapa i analiza działają tylko w przeglądarce."));

  const initial = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    const crop = p.get("crop");
    return {
      parcelId: p.get("parcelId") ?? "",
      crop: (CROPS.some((c) => c.id === crop) ? crop : "") as CropId | "",
      date: p.get("date") ?? "",
      demo: p.get("demo") === "1",
    };
  }, []);

  const [today] = useState(todayIso);
  const [minDate] = useState(minDateIso);

  const [query, setQuery] = useState(initial.parcelId);
  const [searchMsg, setSearchMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [busySearch, setBusySearch] = useState(false);

  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [parcelFixture, setParcelFixture] = useState(false);
  const [crop, setCrop] = useState<CropId | "">(initial.crop);
  const [date, setDate] = useState(initial.date || today);
  const [formErr, setFormErr] = useState<{ parcel?: string; crop?: string; date?: string }>({});

  const [phase, setPhase] = useState<Phase>("form");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isFixture, setIsFixture] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState("");

  const [basemap, setBasemap] = useState<Basemap>("satelita");
  const [showParcels, setShowParcels] = useState(true);
  const [activeRec, setActiveRec] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lonLat: LonLat; zoom?: number; bbox?: [number, number, number, number]; key: number } | null>(
    null,
  );

  const panelRef = useRef<HTMLElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);

  const announce = (t: string) => setLive(t);

  const selectParcel = useCallback((p: Parcel, fixture = false) => {
    setParcel(p);
    setParcelFixture(fixture);
    setFormErr((e) => ({ ...e, parcel: undefined }));
    setResult(null);
    setPhase("form");
    setActiveRec(null);
    announce(`Wybrano działkę ${p.id}${p.commune ? `, gmina ${p.commune}` : ""}, ${fmt(p.areaHa, 2)} ha.`);
  }, []);

  const loadParcelById = useCallback(
    async (id: string) => {
      setBusySearch(true);
      setSearchMsg({ text: "Szukam działki…" });
      const r = await fetchParcel({ id });
      setBusySearch(false);
      if (r.ok) {
        selectParcel(r.data, !!r.fixture);
        setSearchMsg({ text: r.fixture ? `Działka ${r.data.id} (dane przykładowe, serwer niedostępny).` : `Znaleziono działkę ${r.data.id}.` });
        return r.data;
      }
      setSearchMsg({ text: `Nie znaleziono działki: ${r.messagePl}. Sprawdź numer i spróbuj ponownie.`, error: true });
      return null;
    },
    [selectParcel],
  );

  const runAnalysis = useCallback(
    async (p: Parcel, c: CropId, d: string) => {
      const id = ++runId.current;
      setPhase("loading");
      setError("");
      setResult(null);
      setActiveRec(null);
      setElapsed(0);
      announce("Analiza rozpoczęta. Pobieramy dane z pięciu źródeł.");
      const url = new URL(window.location.href);
      url.searchParams.set("parcelId", p.id);
      url.searchParams.set("crop", c);
      url.searchParams.set("date", d);
      window.history.replaceState(null, "", url);
      const r = await postAnalysis({ parcelId: p.id, crop: c, date: d });
      if (id !== runId.current) return;
      if (r.ok) {
        setResult(r.data);
        setIsFixture(false);
        setPhase("result");
        announce(`Analiza gotowa. Ryzyko suszy teraz: ${r.data.assessment.currentLevel ?? "brak danych"}.`);
      } else {
        setError(r.messagePl);
        setPhase("error");
        announce(`Nie udało się pobrać danych: ${r.messagePl}.`);
      }
    },
    [],
  );

  // elapsed seconds while loading
  useEffect(() => {
    if (phase !== "loading") return;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const s = Math.round((Date.now() - t0) / 1000);
      setElapsed(s);
      if (s > 0 && s % 5 === 0) setLive(`Trwa analiza, ${s} s.`);
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // move focus to the result heading when it appears
  useEffect(() => {
    if (phase === "result" || phase === "error") resultRef.current?.focus();
  }, [phase]);

  // URL state on load
  useEffect(() => {
    if (!initial.parcelId) return;
    let cancelled = false;
    (async () => {
      const p = await loadParcelById(initial.parcelId);
      if (cancelled || !p) return;
      if (initial.crop && initial.date) {
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
  }, [initial, loadParcelById, runAnalysis]);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setPlaces([]);
    if (!q) {
      setSearchMsg({ text: "Wpisz numer działki lub nazwę miejscowości.", error: true });
      return;
    }
    if (looksLikeParcelId(q)) {
      await loadParcelById(q);
      return;
    }
    setBusySearch(true);
    setSearchMsg({ text: "Szukam miejscowości…" });
    const r = await geocode(q);
    setBusySearch(false);
    if (!r.ok) {
      setSearchMsg({ text: `Wyszukiwanie nie działa: ${r.messagePl}. Wpisz numer działki.`, error: true });
      return;
    }
    if (!r.data.length) {
      setSearchMsg({ text: `Nie znaleziono „${q}”. Spróbuj innej nazwy albo numeru działki.`, error: true });
      return;
    }
    setPlaces(r.data);
    goPlace(r.data[0]);
    setSearchMsg({
      text: `Znaleziono ${r.data.length} ${r.data.length === 1 ? "miejsce" : "miejsc"}. Przybliż mapę i kliknij swoją działkę.`,
    });
  };

  const goPlace = (pl: Place) => setFlyTarget({ lonLat: pl.lonLat, bbox: pl.bbox, zoom: 14, key: Date.now() });

  const onMapClick = useCallback(
    async (lonLat: LonLat, zoom: number) => {
      if (zoom < CLICK_MIN_ZOOM) {
        setSearchMsg({ text: "Przybliż mapę, aby wskazać działkę." });
        return;
      }
      setSearchMsg({ text: "Szukam działki w tym miejscu…" });
      const r = await fetchParcel({ lonLat });
      if (r.ok) {
        selectParcel(r.data);
        setQuery(r.data.id);
        setSearchMsg({ text: `Wybrano działkę ${r.data.id}.` });
      } else setSearchMsg({ text: `Nie udało się pobrać działki: ${r.messagePl}.`, error: true });
    },
    [selectParcel],
  );

  const onAnalyze = (e: FormEvent) => {
    e.preventDefault();
    const err: typeof formErr = {};
    if (!parcel) err.parcel = "Najpierw wybierz działkę: wpisz numer w wyszukiwarce albo kliknij mapę.";
    if (!crop) err.crop = "Wybierz uprawę.";
    if (!date || date < minDate || date > today) err.date = `Podaj datę od ${minDate} do ${today}.`;
    setFormErr(err);
    if (Object.keys(err).length) {
      const first = err.parcel ? "f-parcel" : err.crop ? "f-crop" : "f-date";
      document.getElementById(first)?.focus();
      return;
    }
    runAnalysis(parcel!, crop as CropId, date);
  };

  const loadFixture = () => {
    setResult(fixtureResult({ crop: (crop || "pszenica_ozima") as CropId, date }));
    setIsFixture(true);
    setPhase("result");
    announce("Wczytano dane przykładowe.");
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
    const rec = result?.recommendations.find((r) => r.id === id);
    announce(rec ? `Rekomendacja: ${rec.titlePl}` : "");
    requestAnimationFrame(() => document.getElementById(`rec-${id}`)?.scrollIntoView({ block: "nearest" }));
  };

  const mapLabel = shownParcel
    ? `Mapa. Wybrana działka ${shownParcel.id}${shownParcel.commune ? `, gmina ${shownParcel.commune}` : ""}, ${fmt(shownParcel.areaHa, 2)} ha.${
        markers.length ? ` ${markers.length} znaczników rekomendacji.` : ""
      } Strzałki przesuwają mapę, plus i minus zmieniają przybliżenie.`
    : "Mapa Polski. Nie wybrano działki. Strzałki przesuwają mapę, plus i minus zmieniają przybliżenie.";

  const raportHref = shownParcel && result
    ? `/raport?parcelId=${encodeURIComponent(shownParcel.id)}&crop=${result.crop.id}&date=${result.request.date}`
    : "";

  const steps: { label: string; state: StepState }[] = (() => {
    const done = [!!parcel, !!crop, !!date];
    const cur = done.indexOf(false);
    return ["Działka", "Uprawa", "Data"].map((label, i) => ({
      label,
      state: done[i] ? "done" : i === cur ? "current" : "todo",
    }));
  })();
  const resultPhase = phase === "result" && !!result;

  return (
    <div className="analiza-ui fixed inset-0 overflow-hidden bg-cream-deep text-forest">
      <a
        href="#panel"
        onClick={(e) => {
          e.preventDefault();
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
        <div className="pointer-events-auto overflow-hidden rounded-[4px] bg-cream/95 text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)]">
          <div className="flex items-center justify-between gap-3 bg-forest px-4 text-cream">
            <Link href="/" aria-label="TRAKTOR, strona główna" className="inline-flex min-h-12 items-center">
              <Logo height={18} color="cream" />
            </Link>
            <Link href="/mapa" className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-cream underline-offset-4 hover:underline">
              <Icon name="board" size={18} />
              Przykład: zastawki
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
                  placeholder="np. 040307_2.0023.306/2"
                  aria-describedby="q-msg"
                  aria-invalid={searchMsg?.error || undefined}
                  autoComplete="off"
                  spellCheck={false}
                  className="num min-h-12 min-w-0 flex-1 rounded-[2px] border-[1.5px] border-forest bg-cream px-3 text-[16px] placeholder:text-forest-muted"
                />
                <Button type="submit" disabled={busySearch} className="!px-4" aria-label="Szukaj">
                  <Icon name="pin" size={18} />
                  Szukaj
                </Button>
              </div>
              {busySearch && <ProgressLine className="mt-2" label="Szukam…" />}
              <p
                id="q-msg"
                role="status"
                className={`mt-1.5 min-h-5 text-[13px] leading-snug ${searchMsg?.error ? "font-medium text-terra-ink" : "text-forest-muted"}`}
              >
                {searchMsg?.text ?? ""}
              </p>
            </form>
            {places.length > 1 && (
              <ul className="mt-1 max-h-40 divide-y divide-forest/10 overflow-y-auto border-y border-forest/15" aria-label="Wyniki wyszukiwania">
                {places.map((p) => (
                  <li key={p.label}>
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

      {/* right panel (desktop) / bottom sheet (mobile) */}
      <main
        id="panel"
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 z-30 max-h-[55vh] overflow-y-auto rounded-t-[8px] bg-cream/95 p-5 text-forest shadow-[0_-8px_24px_rgba(31,58,34,.18)] min-[900px]:inset-y-3 min-[900px]:right-3 min-[900px]:left-auto min-[900px]:max-h-none min-[900px]:w-[420px] min-[900px]:rounded-[4px] min-[900px]:p-6 min-[900px]:shadow-[0_8px_24px_rgba(31,58,34,.18)]"
        aria-labelledby="panel-h"
      >
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
                  <dd className="num">{fmt(parcel.areaHa, 2, "ha")}</dd>
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
              Od {minDate} do {today} (do 10 lat wstecz).
            </p>
            {formErr.date && (
              <p id="e-date" className={ERR}>
                {formErr.date}
              </p>
            )}
          </fieldset>

          <Button type="submit" disabled={phase === "loading"} className="w-full">
            <Icon name="water" size={20} />
            Analizuj działkę
          </Button>
        </form>

        <div aria-live="polite" role="status" className="sr-only">
          {live}
        </div>

        {phase === "loading" && (
          <section aria-labelledby="load-h" className="mt-8">
            <p className="eb text-forest-muted">W toku</p>
            <h2 id="load-h" className="sh mt-1 text-[26px]">
              Liczymy
            </h2>
            <ProgressLine className="mt-3" label="Analiza w toku" />
            <p className="num mt-2 text-[14px] text-forest-muted">
              Minęło {elapsed} s. Zwykle 10–30 s. Pięć źródeł naraz:
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

        <div ref={resultRef} tabIndex={-1} className="outline-none">
          {phase === "error" && (
            <Callout tone="warning" icon="storm" title="Analiza nie powiodła się" className="mt-8" role="alert">
              <p id="err-h" className="mt-1">
                Brak danych: {error}. Spróbuj ponownie.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() => parcel && crop && runAnalysis(parcel, crop as CropId, date)}
              >
                Spróbuj ponownie
              </Button>
            </Callout>
          )}

          {resultPhase && (
            <div className="mt-8 border-t-2 border-forest pt-6">
              <Results r={result!} activeRec={activeRec} onSelectRec={onSelectRec} markerNumber={markerNumber} fixture={isFixture} />
              <div className="mt-8 flex flex-col gap-2">
                <Button href={raportHref} target="_blank" className="w-full">
                  Raport do druku (PDF)<span className="sr-only"> (otwiera się w nowej karcie)</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {(SHOW_DEV || initial.demo) && (
          <div className="mt-8 border-t border-forest/15 pt-3">
            <p className="eb text-forest-muted">Tryb deweloperski</p>
            <button type="button" onClick={loadFixture} className="mt-1 min-h-11 text-[14px] underline underline-offset-2">
              Wczytaj dane przykładowe
            </button>
          </div>
        )}

        <footer className="mt-8 border-t border-forest/15 pt-3">
          <p className="text-[12px] leading-snug text-forest-muted">
            Ocena z danych publicznych. Każde zalecenie wymaga wizji lokalnej.
          </p>
          <FooterLine className="mt-1.5" />
        </footer>
      </main>
    </div>
  );
}
