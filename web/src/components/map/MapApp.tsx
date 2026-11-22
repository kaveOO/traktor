"use client";

import { use, useCallback, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { browser } from "react-dom";
import type { Conditions, CrestHeight, Order, RefusalCode, ScenarioName } from "@/lib/traktor";
import { CRESTS, GMINA, SCENARIOS, candidates, decideOrder, getScenario, getSite, mapFeatures, sites } from "@/lib/traktor";
import { SkipLink } from "@/components/brand/ui";
import { MapCanvas, type Basemap, type Focus } from "./MapCanvas";
import { Legend, MapCredit, MapSource, ParcelSearch, RefusalCounter } from "./Overlays";
import { CandidatePanel, GminaPanel, SitePanel } from "./SitePanel";
import { CHOICES, ScenarioDock, TopBar, type ScenarioChoice } from "./Chrome";
import { centroid } from "./geo";

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  const site = p.get("site");
  const s = site && getSite(site) ? site : null;
  const crestN = Number(p.get("crest"));
  const crest = (CRESTS as number[]).includes(crestN) ? (crestN as CrestHeight) : null;
  const sc = p.get("scenario");
  const scenario: ScenarioChoice = sc === "live" || SCENARIOS.includes(sc as ScenarioName) ? (sc as ScenarioChoice) : "drought-aug";
  return { site: s, crest, scenario, kowr: p.get("kowr") === "1" };
}

function isConditions(x: unknown): x is Conditions {
  return !!x && typeof x === "object" && typeof (x as Conditions).kbw60Mm === "number" && Array.isArray((x as Conditions).warnings);
}

export default function MapApp() {
  use(browser("Interaktywna mapa działa tylko w przeglądarce."));
  const [init] = useState(readUrl);
  const [siteId, setSiteId] = useState<string | null>(init.site);
  const [crest, setCrest] = useState<CrestHeight>(
    init.crest ?? (init.site ? (getSite(init.site)?.maxAcceptedCrestCm ?? 40) : 40),
  );
  const [scenario, setScenario] = useState<ScenarioChoice>(init.scenario);
  const [kowr, setKowr] = useState(init.kowr);
  const [flood, setFlood] = useState(false);
  // default: live GUGiK orthophoto (free, no key, most detail). No Google tiles: no key, no proxy.
  const [basemap, setBasemap] = useState<Basemap>("gugik-orto");
  const [showRefused, setShowRefused] = useState(true);
  const [filter, setFilter] = useState<RefusalCode | null>(null);
  const [candId, setCandId] = useState<string | null>(null);
  const [parcelHl, setParcelHl] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(() => {
    const s = init.site ? getSite(init.site) : null;
    return s ? { xy: s.xy, w: 360, key: 1 } : null;
  });
  const [live, setLive] = useState<{ c: Conditions | null; failed: boolean; loading: boolean }>({
    c: null,
    failed: false,
    loading: false,
  });

  const site = siteId ? (getSite(siteId) ?? null) : null;
  const cand = candId ? candidates.find((c) => c.id === candId) : undefined;

  // URL state
  useEffect(() => {
    const p = new URLSearchParams();
    if (siteId) {
      p.set("site", siteId);
      p.set("crest", String(crest));
    }
    p.set("scenario", scenario);
    if (kowr) p.set("kowr", "1");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  }, [siteId, crest, scenario, kowr]);

  // live conditions (never blocks the map)
  useEffect(() => {
    if (scenario !== "live" || live.c || live.loading) return;
    let alive = true;
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 7000);
    setLive((l) => ({ ...l, loading: true }));
    fetch("/api/traktor/conditions?scenario=live", { signal: ctl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: unknown) => {
        if (!alive) return;
        if (!isConditions(j)) throw new Error("bad payload");
        setLive({ c: j, failed: j.mode !== "live", loading: false });
      })
      .catch(() => alive && setLive({ c: null, failed: true, loading: false }))
      .finally(() => window.clearTimeout(timer));
    return () => {
      alive = false;
      ctl.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  const conditions: Conditions = useMemo(() => {
    if (scenario === "live") return live.c ?? { ...getScenario("drought-aug"), mode: "fixture" };
    return getScenario(scenario);
  }, [scenario, live.c]);

  const liveNote = scenario === "live" && !live.loading && live.failed ? "Brak połączenia. Pokazuję dane zapisane." : null;

  const orders = useMemo(() => {
    const out: Record<string, Order> = {};
    for (const s of sites) out[s.id] = decideOrder(s, conditions, s.id === siteId ? crest : s.maxAcceptedCrestCm);
    return out;
  }, [conditions, siteId, crest]);
  const orderList = useMemo(
    () => Object.values(orders).filter((o) => !kowr || getSite(o.siteId)?.kowr),
    [orders, kowr],
  );

  // mobile bottom sheet: collapsed (25%) or expanded (60%); the map controls ride above it via --sheet-h
  const [sheetOpen, setSheetOpen] = useState(!!init.site);

  const selectSite = useCallback((id: string) => {
    const s = getSite(id);
    if (!s) return;
    setSiteId(id);
    setCandId(null);
    setSheetOpen(true);
    setCrest(s.maxAcceptedCrestCm ?? 40);
    setFocus((f) => ({ xy: s.xy, w: 360, key: (f?.key ?? 0) + 1 }));
  }, []);

  const selectCandidate = useCallback((id: string) => {
    setCandId(id);
    setSiteId(null);
    setSheetOpen(true);
  }, []);

  const onFilter = useCallback((c: RefusalCode | null) => {
    setFilter(c);
    if (c) setShowRefused(true);
  }, []);

  const focusParcel = useCallback((pid: string) => {
    const p = mapFeatures.parcels.find((q) => q.id === pid);
    if (!p) return;
    setParcelHl(pid);
    setFocus((f) => ({ xy: centroid(p.points), w: 220, key: (f?.key ?? 0) + 1 }));
  }, []);

  // keyboard: 1-4 scenarios, ←/→ crest, Esc closes. Bound to the app root, so it only acts while focus is
  // inside the map app; never in form fields; 1-4 and ←/→ can be switched off (WCAG 2.1.4).
  const [shortcuts, setShortcuts] = useState(true);
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return;
    const t = e.target as HTMLElement;
    // form fields keep their keys (radio groups and the map stop their own arrow keys)
    if (t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") {
      if (siteId || candId) {
        setSiteId(null);
        setCandId(null);
      }
      return;
    }
    if (!shortcuts) return;
    const n = Number(e.key);
    if (e.key.length === 1 && n >= 1 && n <= 4) {
      setScenario(CHOICES[n - 1]);
      return;
    }
    if (siteId && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      setCrest((c) => {
        const i = CRESTS.indexOf(c) + (e.key === "ArrowRight" ? 1 : -1);
        return CRESTS[Math.max(0, Math.min(CRESTS.length - 1, i))];
      });
    }
  };

  // phones: legend + sources live in the sheet behind a disclosure
  const [legendOpen, setLegendOpen] = useState(false);

  const order = site ? orders[site.id] : null;
  const announce = site ? `Otwarto miejsce ${site.id}, ${site.name}` : cand ? `Otwarto miejsce odrzucone ${cand.id}` : "Widok gminy";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-cream text-forest focus:outline-none" tabIndex={-1} onKeyDown={onKey}>
      <SkipLink href="#panel">Przejdź do panelu</SkipLink>
      <h1 className="sr-only">Mapa rowów: {GMINA.name}</h1>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <TopBar conditions={conditions} liveNote={liveNote} loading={scenario === "live" && live.loading} />
      <div className={`relative flex min-h-0 flex-1 ${sheetOpen ? "max-[900px]:[--sheet-h:60%]" : "max-[900px]:[--sheet-h:25%]"}`}>
        <main className="relative min-w-0 flex-1" aria-label="Mapa">
          <MapCanvas
            credit={
              <div className="hidden max-[900px]:block">
                <MapCredit basemap={basemap} />
              </div>
            }
            orders={orders}
            selected={site}
            crest={crest}
            showFlood={flood}
            basemap={basemap}
            showRefused={showRefused}
            refusalFilter={filter}
            kowrOnly={kowr}
            parcelHl={parcelHl}
            candId={candId}
            focus={focus}
            onSelectSite={selectSite}
            onSelectCandidate={selectCandidate}
          />
          <div className="pointer-events-none absolute top-3 left-4 z-10 [&>*]:pointer-events-auto max-[900px]:hidden">
            <RefusalCounter compact={!!site} filter={filter} onFilter={onFilter} onPoint={selectCandidate} />
          </div>
          <div className="pointer-events-none absolute top-3 right-4 z-10 [&>*]:pointer-events-auto max-[900px]:left-4 max-[640px]:top-2 max-[640px]:right-2 max-[640px]:left-2">
            <ParcelSearch onParcel={focusParcel} onSite={selectSite} />
          </div>
          <div className="pointer-events-none absolute bottom-2 left-4 z-10 flex flex-col items-start gap-2 [&>*]:pointer-events-auto max-[900px]:hidden">
            <Legend showFlood={flood} basemap={basemap} />
            <MapSource basemap={basemap} />
          </div>
        </main>
        <aside
          id="panel"
          tabIndex={-1}
          className="relative z-20 w-[400px] shrink-0 overflow-y-auto border-l border-forest/15 bg-cream-deep focus:outline-none max-[900px]:absolute max-[900px]:inset-x-0 max-[900px]:bottom-0 max-[900px]:h-[var(--sheet-h)] max-[900px]:w-auto max-[900px]:rounded-t-[8px] max-[900px]:border-t max-[900px]:border-l-0 max-[900px]:shadow-[0_-8px_24px_rgba(31,58,34,.18)] max-[900px]:transition-[height] max-[900px]:duration-300"
          aria-label="Panel miejsca"
        >
          <button
            type="button"
            className="sticky top-0 z-30 hidden h-7 w-full items-center justify-center bg-cream-deep max-[900px]:flex"
            aria-expanded={sheetOpen}
            aria-controls="panel"
            aria-label={sheetOpen ? "Zwiń panel" : "Rozwiń panel"}
            onClick={() => setSheetOpen((o) => !o)}
          >
            <span className="h-1 w-10 rounded-full bg-forest/50" aria-hidden />
          </button>
          {site && order ? (
            <SitePanel
              key={site.id}
              site={site}
              crest={crest}
              order={order}
              conditions={conditions}
              scenarioParam={scenario === "live" ? "drought-aug" : scenario}
              onCrest={setCrest}
              onClose={() => setSiteId(null)}
            />
          ) : cand ? (
            <CandidatePanel cand={cand} onClose={() => setCandId(null)} />
          ) : (
            <GminaPanel orders={orderList} conditions={conditions} kowrOnly={kowr} onSite={selectSite} />
          )}
          {/* below 900px the legend, sources and refusal reasons live here instead of over the map */}
          <div className="hidden px-5 pb-6 max-[900px]:block">
            <button
              type="button"
              aria-expanded={legendOpen}
              aria-controls="legend-sources"
              onClick={() => setLegendOpen((o) => !o)}
              className="inline-flex min-h-9 w-full items-center justify-between rounded-[2px] border-[1.5px] border-forest/60 px-3 text-[13px] font-medium"
            >
              Legenda i źródła <span aria-hidden>{legendOpen ? "▴" : "▾"}</span>
            </button>
            {legendOpen && (
              <div id="legend-sources" className="mt-2 flex flex-col gap-2 [&>*]:shadow-none">
                <RefusalCounter filter={filter} onFilter={onFilter} onPoint={selectCandidate} />
                <Legend showFlood={flood} basemap={basemap} />
                <MapSource basemap={basemap} />
              </div>
            )}
          </div>
        </aside>
      </div>
      <ScenarioDock
        scenario={scenario}
        onScenario={setScenario}
        orders={orderList}
        kowr={kowr}
        onKowr={() => setKowr((k) => !k)}
        flood={flood}
        onFlood={() => setFlood((f) => !f)}
        basemap={basemap}
        onBasemap={setBasemap}
        refused={showRefused}
        onRefused={() => setShowRefused((r) => !r)}
        shortcuts={shortcuts}
        onShortcuts={() => setShortcuts((s) => !s)}
      />
    </div>
  );
}
