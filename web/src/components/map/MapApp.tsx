"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { browser } from "react-dom";
import type { Conditions, CrestHeight, Order, RefusalCode, ScenarioName } from "@/lib/traktor";
import { CRESTS, SCENARIOS, candidates, decideOrder, getScenario, getSite, mapFeatures, sites } from "@/lib/traktor";
import { MapCanvas, type Focus } from "./MapCanvas";
import { Legend, MapSource, ParcelSearch, RefusalCounter } from "./Overlays";
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
  const [flood, setFlood] = useState(true);
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

  const liveNote = scenario === "live" && !live.loading && live.failed ? "brak połączenia — dane zapisane" : null;

  const orders = useMemo(() => {
    const out: Record<string, Order> = {};
    for (const s of sites) out[s.id] = decideOrder(s, conditions, s.id === siteId ? crest : s.maxAcceptedCrestCm);
    return out;
  }, [conditions, siteId, crest]);
  const orderList = useMemo(
    () => Object.values(orders).filter((o) => !kowr || getSite(o.siteId)?.kowr),
    [orders, kowr],
  );

  const selectSite = useCallback((id: string) => {
    const s = getSite(id);
    if (!s) return;
    setSiteId(id);
    setCandId(null);
    setCrest(s.maxAcceptedCrestCm ?? 40);
    setFocus((f) => ({ xy: s.xy, w: 360, key: (f?.key ?? 0) + 1 }));
  }, []);

  const selectCandidate = useCallback((id: string) => {
    setCandId(id);
    setSiteId(null);
  }, []);

  const focusParcel = useCallback((pid: string) => {
    const p = mapFeatures.parcels.find((q) => q.id === pid);
    if (!p) return;
    setParcelHl(pid);
    setFocus((f) => ({ xy: centroid(p.points), w: 220, key: (f?.key ?? 0) + 1 }));
  }, []);

  // keyboard: 1-4 scenarios, ←/→ crest, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) {
        setScenario(CHOICES[n - 1]);
        return;
      }
      if (e.key === "Escape") {
        setSiteId(null);
        setCandId(null);
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [siteId]);

  const order = site ? orders[site.id] : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-cream text-forest">
      <TopBar conditions={conditions} liveNote={liveNote} loading={scenario === "live" && live.loading} />
      <div className="relative flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1" aria-label="Mapa">
          <MapCanvas
            orders={orders}
            selected={site}
            crest={crest}
            showFlood={flood}
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
            <RefusalCounter
              compact={!!site}
              filter={filter}
              onFilter={(c) => {
                setFilter(c);
                if (c) setShowRefused(true);
              }}
            />
          </div>
          <div className="pointer-events-none absolute top-3 right-4 z-10 [&>*]:pointer-events-auto max-[900px]:left-4">
            <ParcelSearch onParcel={focusParcel} onSite={selectSite} />
          </div>
          <div className="pointer-events-none absolute bottom-2 left-4 z-10 flex flex-col items-start gap-2 [&>*]:pointer-events-auto max-[900px]:hidden">
            <Legend showFlood={flood} />
            <MapSource />
          </div>
        </main>
        <aside
          className="relative z-20 w-[400px] shrink-0 overflow-y-auto border-l border-forest/15 bg-cream-deep max-[900px]:absolute max-[900px]:inset-x-0 max-[900px]:bottom-0 max-[900px]:max-h-[55%] max-[900px]:w-auto max-[900px]:rounded-t-[8px] max-[900px]:border-t max-[900px]:border-l-0 max-[900px]:shadow-[0_-8px_24px_rgba(31,58,34,.18)]"
          aria-label="Panel miejsca"
        >
          <div className="mx-auto mt-2 hidden h-1 w-10 rounded-full bg-forest/25 max-[900px]:block" aria-hidden />
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
        refused={showRefused}
        onRefused={() => setShowRefused((r) => !r)}
      />
    </div>
  );
}
