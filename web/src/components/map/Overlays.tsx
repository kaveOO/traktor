"use client";

import { useEffect, useState } from "react";
import type { RefusalCode, Site } from "@/lib/traktor";
import { DEMO_NOTE, REFUSAL_LABEL, REFUSAL_RULE, SOURCES_MAP, mapFeatures, plural, sites, summary } from "@/lib/traktor";
import { SourceLine } from "@/components/brand/ui";
import { C, shortParcel } from "./geo";

const CODES = Object.keys(REFUSAL_LABEL) as RefusalCode[];
const LAND_LEGEND: [string, string, number][] = [
  ["pola", "#C9BF86", 0.55],
  ["las", "#4F7A3A", 0.45],
  ["zabudowa", "#B98D5F", 0.35],
  ["woda", "#3B7FA3", 0.8],
];
const SHADE = [1, 0.82, 0.66, 0.52, 0.4, 0.3];

const REFUSED = candidates.filter((c) => c.status === "refused");
const PAGE = 25;

/** Keyboard/touch path to refused points of one reason (the dots on the map are too dense to tab through). */
function RefusedPoints({ code, onPoint }: { code: RefusalCode; onPoint: (id: string) => void }) {
  const [n, setN] = useState(PAGE);
  useEffect(() => setN(PAGE), [code]);
  const list = REFUSED.filter((c) => c.refusalCode === code);
  return (
    <div className="mt-2">
      <p className="text-[12px] text-forest-muted" id={`rule-${code}`}>
        {REFUSAL_RULE[code]}
      </p>
      <p className="eb mt-2 text-forest-muted">Punkty: {list.length.toLocaleString("pl-PL")}</p>
      <ul className="mt-1 flex max-h-32 flex-wrap gap-1 overflow-y-auto" aria-label={`Odrzucone punkty: ${REFUSAL_LABEL[code]}`}>
        {list.slice(0, n).map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onPoint(c.id)}
              className="num inline-flex min-h-6 items-center rounded-[2px] border border-terra-ink/60 px-1.5 text-[11.5px] text-terra-ink hover:bg-cream-deep"
            >
              {c.id}
            </button>
          </li>
        ))}
      </ul>
      {n < list.length && (
        <button type="button" className="mt-1 inline-flex min-h-6 items-center text-[11.5px] underline" onClick={() => setN((k) => k + PAGE)}>
          Pokaż kolejne {Math.min(PAGE, list.length - n)}
        </button>
      )}
    </div>
  );
}

/** Animated count: all points analysed → safe sites. */
export function RefusalCounter({
  filter,
  onFilter,
  onPoint,
  compact = false,
}: {
  filter: RefusalCode | null;
  onFilter: (c: RefusalCode | null) => void;
  /** open a refused point in the panel */
  onPoint: (id: string) => void;
  /** collapse to the headline when a site is open, so the card never covers it */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(!compact);
  useEffect(() => setOpen(!compact), [compact]);
  const from = summary.pointsAnalysed;
  const to = summary.sitesAccepted;
  const [n, setN] = useState(from);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + 300;
    const step = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - t0) / 1500));
      const k = 1 - (1 - t) ** 3;
      setN(Math.round(from + (to - from) * k));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  const done = n === to;
  const total = from;

  return (
    <div data-ui className="w-[300px] max-w-full rounded-[4px] bg-cream/95 p-4 text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)]">
      <p className="eb text-forest-muted">Kontrola bezpieczeństwa</p>
      <p className="sr-only">
        {to} {plural(to, "bezpieczne miejsce", "bezpieczne miejsca", "bezpiecznych miejsc")} z {from.toLocaleString("pl-PL")}{" "}
        sprawdzonych punktów na rowach.
      </p>
      <div className="mt-1 flex items-baseline gap-2" aria-hidden>
        <span className="hd num text-[44px]">{n.toLocaleString("pl-PL")}</span>
        <span className={`sh text-[15px] transition-colors duration-500 ${done ? "text-agri-ink" : "text-forest-muted"}`}>
          {done ? plural(to, "bezpieczne miejsce", "bezpieczne miejsca", "bezpiecznych miejsc") : "punktów"}
        </span>
      </div>
      <p className="text-[12px] text-forest-muted" aria-hidden>
        z <span className="num">{from.toLocaleString("pl-PL")}</span> sprawdzonych punktów na rowach
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-1 inline-flex min-h-6 items-center text-[11.5px] text-forest-muted underline"
      >
        {open ? "Zwiń powody odmowy" : "Pokaż powody odmowy"}
      </button>
      {open && (<>
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-[1px]" aria-hidden>
        <span style={{ width: `${(to / total) * 100}%`, background: C.agri, minWidth: 3 }} />
        {CODES.map((c, i) => (
          <span
            key={c}
            style={{
              width: `${(summary.refusalsByCode[c] / total) * 100}%`,
              background: C.terra,
              opacity: filter && filter !== c ? 0.15 : SHADE[i],
            }}
          />
        ))}
      </div>
      <ul className="mt-2 space-y-0.5">
        {CODES.map((c, i) => (
          <li key={c}>
            <button
              type="button"
              onClick={() => onFilter(filter === c ? null : c)}
              aria-pressed={filter === c}
              aria-describedby={filter === c ? `rule-${c}` : undefined}
              className={`flex min-h-6 w-full items-center gap-2 rounded-[2px] px-1.5 py-1 text-left text-[12.5px] hover:bg-cream-deep ${
                filter === c ? "bg-cream-deep font-semibold" : ""
              }`}
            >
              <span className="inline-block size-2.5 rounded-full" style={{ background: C.terra, opacity: SHADE[i] }} aria-hidden />
              <span className="flex-1">{REFUSAL_LABEL[c]}</span>
              <span className="num">{summary.refusalsByCode[c].toLocaleString("pl-PL")}</span>
            </button>
          </li>
        ))}
      </ul>
      {filter && <RefusedPoints code={filter} onPoint={onPoint} />}
      {filter && (
        <button type="button" className="mt-1 inline-flex min-h-6 items-center text-[11.5px] text-forest-muted underline" onClick={() => onFilter(null)}>
          Pokaż wszystkie powody
        </button>
      )}
      </>)}
    </div>
  );
}

/** Parcel search + ranking list. */
export function ParcelSearch({
  onParcel,
  onSite,
}: {
  onParcel: (id: string) => void;
  onSite: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const qq = q.trim();
  const hits = qq.length >= 2 ? mapFeatures.parcels.filter((p) => p.id.includes(qq)).slice(0, 6) : [];
  const sitesFor = (pid: string): Site[] => sites.filter((s) => s.ownParcels.includes(pid));
  const pick = (id: string) => {
    setPicked(id);
    onParcel(id);
  };

  return (
    <div data-ui className="w-[280px] max-w-full rounded-[4px] bg-cream/95 p-4 text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)] max-[640px]:p-2.5">
      <label className="eb text-forest-muted max-[640px]:sr-only" htmlFor="parcel-q">
        Szukaj działki
      </label>
      <input
        id="parcel-q"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPicked(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) pick(hits[0].id);
        }}
        placeholder="np. 306/2 lub 040307_2.0023.306/2"
        className="num mt-1 w-full rounded-[2px] border-[1.5px] border-forest/40 bg-cream px-3 py-2 text-[14px] outline-none focus:border-forest"
      />
      {qq.length >= 2 && !picked && (
        <ul className="mt-2 space-y-0.5">
          {hits.length === 0 && <li className="text-[12px] opacity-70">Brak takiej działki przy rowach na mapie. Wpisz numer, np. 306/2.</li>}
          {hits.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p.id)} className="num w-full rounded-[2px] px-2 py-1 text-left text-[13px] hover:bg-cream-deep">
                {p.id}
                <span className="ml-2 text-[11px] opacity-60">{p.owner === "own" ? "przy zastawce" : "sąsiednia"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked && (
        <div className="mt-2 rounded-[2px] bg-cream-deep p-2 text-[12.5px]">
          <p className="num font-semibold">Działka {shortParcel(picked)}</p>
          {sitesFor(picked).length ? (
            sitesFor(picked).map((s) => (
              <button key={s.id} type="button" onClick={() => onSite(s.id)} className="mt-1 block w-full text-left underline">
                <span className="num">{s.id}</span> · {s.name}
              </button>
            ))
          ) : (
            <p className="opacity-75">Na tej działce nie ma miejsca na zastawkę.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function RankingList({ onSite, limit = 8, kowrOnly = false }: { onSite: (id: string) => void; limit?: number; kowrOnly?: boolean }) {
  const list = [...sites]
    .filter((s) => !kowrOnly || s.kowr)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, limit);
  return (
    <ol className="divide-y divide-forest/10">
      {list.map((s) => {
        const c = s.crests.find((k) => k.heightCm === s.maxAcceptedCrestCm);
        return (
          <li key={s.id}>
            <button type="button" onClick={() => onSite(s.id)} className="flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-cream">
              <span className="num w-6 text-[12px] opacity-60">{s.rank}.</span>
              <span className="num w-14 text-[13px] font-semibold">{s.id}</span>
              <span className="flex-1 truncate text-[13px]">{s.name}</span>
              <span className="num text-[12px] opacity-75">
                {c ? `${c.storageM3[0].toLocaleString("pl-PL")}–${c.storageM3[1].toLocaleString("pl-PL")} m³` : "—"}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function Legend({ showFlood }: { showFlood: boolean }) {
  const row = "flex items-center gap-2";
  return (
    <div data-ui className="rounded-[4px] bg-cream/95 px-3 py-2.5 text-[11.5px] text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)]">
      <p className="eb mb-1 opacity-70">Legenda</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className={row}>
          <span className="inline-block size-3 rounded-full border-2" style={{ background: C.agri, borderColor: C.cream, outline: `2px solid ${C.forest}` }} />
          Miejsce bezpieczne
        </span>
        <span className={row}>
          <span className="inline-block size-2 rounded-full" style={{ background: C.terra, opacity: 0.7 }} />
          Punkt odrzucony
        </span>
        <span className={row}>
          <span className="inline-block h-0.5 w-4" style={{ background: C.water }} />
          Rów (NMT)
        </span>
        <span className={row}>
          <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: C.water, opacity: 0.6 }} />
          Rów niewidoczny w NMT
        </span>
        <span className={row}>
          <span className="inline-block h-2.5 w-4 rounded-[1px]" style={{ background: C.water, opacity: 0.28 }} />
          Strefa retencji
        </span>
        {showFlood && (
          <span className={row}>
            <span className="inline-block h-2.5 w-4 rounded-[1px] border" style={{ borderColor: C.water, background: "repeating-linear-gradient(45deg, rgba(59,127,163,.5) 0 2px, rgba(59,127,163,.15) 2px 5px)" }} />
            Do 80 m od cieku (zamiast ISOK)
          </span>
        )}
        <span className={row}>
          <span className="inline-block size-2.5 rounded-full border-2" style={{ borderColor: C.forest }} />
          Pierścień: TRZYMAJ
        </span>
        <span className={row}>
          <span className="inline-block size-2.5 rounded-full border-2" style={{ borderColor: C.water }} />
          Pierścień: OTWÓRZ
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1 text-[10px]">
        {LAND_LEGEND.map(([label, color, op]) => (
          <span key={label} className="flex items-center gap-1 opacity-80">
            <span className="inline-block h-2 w-3 rounded-[1px]" style={{ background: color, opacity: op }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

type MapBasemap = "gugik-orto" | "s2-cloudless" | "osm" | "google-roadmap" | "google-satellite" | "schema";

/** Attribution for the active basemap (required by each tile provider's terms). */
function BasemapCredit({ basemap }: { basemap: MapBasemap }) {
  const a = "underline";
  switch (basemap) {
    case "gugik-orto":
      return (
        <>
          Ortofotomapa: GUGiK,{" "}
          <a href="https://www.geoportal.gov.pl" target="_blank" rel="noreferrer" className={a}>
            geoportal.gov.pl
          </a>
        </>
      );
    case "s2-cloudless":
      return (
        <>
          Sentinel-2 cloudless –{" "}
          <a href="https://s2maps.eu" target="_blank" rel="noreferrer" className={a}>
            https://s2maps.eu
          </a>{" "}
          by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016), CC BY 4.0
        </>
      );
    case "osm":
      return (
        <>
          Podkład: ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className={a}>
            autorzy OpenStreetMap
          </a>
        </>
      );
    case "google-roadmap":
    case "google-satellite":
      return <>Dane mapy ©{new Date().getFullYear()} Google</>;
    case "schema":
      return <>Podkład: BDOT10k (GUGiK)</>;
  }
}

export function MapSource({ basemap = "gugik-orto" }: { basemap?: MapBasemap }) {
  return (
    <div data-ui className="max-w-[520px] rounded-[2px] bg-cream/90 px-2.5 py-1.5 text-forest">
      <SourceLine>{SOURCES_MAP}</SourceLine>
      <p className="text-[11px] opacity-75">{DEMO_NOTE}</p>
      <p className="text-[11px] opacity-75">
        <BasemapCredit basemap={basemap} />
      </p>
    </div>
  );
}
