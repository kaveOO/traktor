"use client";

import { useEffect, useState } from "react";
import type { Order, OrderAction, RefusalCode, Site } from "@/lib/traktor";
import { DEMO_NOTE, REFUSAL_LABEL, REFUSAL_RULE, SOURCES_MAP, candidates, mapFeatures, plural, sites, summary } from "@/lib/traktor";
import { SourceLine } from "@/components/brand/ui";
import { C, DATA_DATE, ORDER_COLOR, ORDER_DASH, ORDER_LETTER, shortParcel } from "./geo";

const CODES = Object.keys(REFUSAL_LABEL) as RefusalCode[];
// same colour + opacity as LAND_STYLE in MapCanvas
const LAND_LEGEND: [string, string, number][] = [
  ["pola", "#C9BF86", 0.42],
  ["sady", "#8FA86A", 0.45],
  ["las", "#4F7A3A", 0.42],
  ["zabudowa", "#B98D5F", 0.28],
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
        className="num mt-1 w-full rounded-[2px] border-[1.5px] border-forest/60 bg-cream px-3 py-2 text-[14px] focus:border-forest max-[640px]:mt-0 max-[640px]:py-1.5"
      />
      <p role="status" className="sr-only">
        {qq.length >= 2 && !picked ? (hits.length ? `${hits.length} ${plural(hits.length, "wynik", "wyniki", "wyników")}` : "Brak takiej działki") : ""}
      </p>
      {qq.length >= 2 && !picked && (
        <ul className="mt-2 space-y-0.5">
          {hits.length === 0 && <li className="text-[12px] text-forest-muted">Brak takiej działki przy rowach na mapie. Wpisz numer, np. 306/2.</li>}
          {hits.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => pick(p.id)} className="num min-h-6 w-full rounded-[2px] px-2 py-1 text-left text-[13px] hover:bg-cream-deep">
                {p.id}
                <span className="ml-2 text-[11px] text-forest-muted">{p.owner === "own" ? "przy zastawce" : "sąsiednia"}</span>
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
              <button key={s.id} type="button" onClick={() => onSite(s.id)} className="mt-1 block min-h-6 w-full text-left underline">
                <span className="num">{s.id}</span> · {s.name}
              </button>
            ))
          ) : (
            <p className="text-forest-muted">Na tej działce nie ma miejsca na zastawkę.</p>
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
            <button type="button" onClick={() => onSite(s.id)} className="flex min-h-6 w-full items-center gap-3 px-1 py-2 text-left hover:bg-cream">
              <span className="num w-6 text-[12px] text-forest-muted">{s.rank}.</span>
              <span className="num w-14 text-[13px] font-semibold">{s.id}</span>
              <span className="flex-1 truncate text-[13px]">{s.name}</span>
              <span className="num text-[12px] text-forest-muted">
                {c ? `${c.storageM3[0].toLocaleString("pl-PL")}–${c.storageM3[1].toLocaleString("pl-PL")} m³` : "—"}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

const ORDER_PL: Record<OrderAction, string> = { TRZYMAJ: "TRZYMAJ", OTWORZ: "OTWÓRZ", NIE_RUSZAJ: "NIE RUSZAJ" };
export const orderPl = (a: OrderAction) => ORDER_PL[a];

/** Text equivalent of the map: every site with its order (keyboard and screen-reader path). */
export function AllSitesList({
  orders,
  onSite,
  kowrOnly = false,
}: {
  orders: Order[];
  onSite: (id: string) => void;
  kowrOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const byId = new Map(orders.map((o) => [o.siteId, o]));
  const list = [...sites].filter((s) => !kowrOnly || s.kowr).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="all-sites"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-9 w-full items-center justify-between rounded-[2px] border-[1.5px] border-forest/60 px-3 text-[13px] font-medium hover:bg-cream"
      >
        Lista wszystkich miejsc ({list.length})
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <table id="all-sites" className="mt-2 w-full border-collapse text-left text-[12.5px]">
          <caption className="sr-only">Wszystkie miejsca bezpieczne: polecenie na dziś i maksymalna wysokość zastawki</caption>
          <thead>
            <tr className="border-b border-forest/30">
              <th scope="col" className="eb py-1 pr-2 text-forest-muted">Miejsce</th>
              <th scope="col" className="eb py-1 pr-2 text-forest-muted">Polecenie</th>
              <th scope="col" className="eb py-1 text-right text-forest-muted">Maks.</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const o = byId.get(s.id);
              return (
                <tr key={s.id} className="border-b border-forest/10">
                  <th scope="row" className="py-0.5 pr-2 font-normal">
                    <button type="button" onClick={() => onSite(s.id)} className="num inline-flex min-h-6 items-center text-left font-semibold underline">
                      {s.id}
                    </button>
                    <span className="block truncate text-[11.5px] text-forest-muted">{s.name}</span>
                  </th>
                  <td className="py-0.5 pr-2">{o ? orderPl(o.action) : "—"}</td>
                  <td className="num py-0.5 text-right">{s.maxAcceptedCrestCm ? `${s.maxAcceptedCrestCm} cm` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Marker sample shared by the legend: ring + order letter (not colour alone, WCAG 1.4.1). */
function RingSample({ action }: { action: OrderAction }) {
  const ring = ORDER_COLOR[action];
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
      <circle cx="9" cy="9" r="7.6" fill="none" stroke={ring} strokeWidth="2" strokeDasharray={ORDER_DASH[action]} />
      <circle cx="9" cy="9" r="5.4" fill={C.agri} stroke={C.cream} strokeWidth="1" />
      <text x="9" y="11.6" textAnchor="middle" fill={C.cream} style={{ fontSize: 7, fontWeight: 800 }}>
        {ORDER_LETTER[action]}
      </text>
    </svg>
  );
}

/** Legend swatches drawn exactly as SPEC §06 (page 09 artwork): pins with a 3 px cream ring, ditch 3 px round,
 * retention zone water 28% with a dashed 1.5 px water edge. Decorative: the text next to each one is the label. */
function Pin({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="8" fill={color} stroke={C.cream} strokeWidth="3" />
    </svg>
  );
}
function DitchSample({ dashed = false }: { dashed?: boolean }) {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden className="shrink-0">
      <path d="M2 5 H18" stroke={C.water} strokeWidth="3" strokeLinecap="round" strokeDasharray={dashed ? "3 4" : undefined} strokeOpacity={dashed ? 0.6 : 1} />
    </svg>
  );
}

export function Legend({ showFlood, basemap = "gugik-orto" }: { showFlood: boolean; basemap?: MapBasemap }) {
  const row = "flex items-center gap-2";
  return (
    <div data-ui className="rounded-[4px] bg-cream/95 px-3 py-2.5 text-[11.5px] text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)]">
      <p className="eb mb-1 text-forest-muted">Legenda</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className={row}>
          <Pin color={C.agri} />
          Miejsce bezpieczne
        </span>
        <span className={row}>
          <Pin color={C.terra} />
          Miejsce odrzucone
        </span>
        <span className={row}>
          <DitchSample />
          Rów (BDOT10k)
        </span>
        <span className={row}>
          <DitchSample dashed />
          Rów niewidoczny w NMT
        </span>
        <span className={row}>
          <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden className="shrink-0">
            <rect x="1" y="1" width="18" height="10" rx="2" fill={C.water} fillOpacity="0.28" stroke={C.water} strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          Strefa retencji
        </span>
        {showFlood && (
          <span className={row}>
            <span className="inline-block h-2.5 w-4 rounded-[1px] border" style={{ borderColor: C.water, background: "repeating-linear-gradient(45deg, rgba(59,127,163,.5) 0 2px, rgba(59,127,163,.15) 2px 5px)" }} />
            Do 80 m od cieku (zamiast ISOK)
          </span>
        )}
        <span className={row}>
          <RingSample action="TRZYMAJ" />
          T: TRZYMAJ (pierścień ciągły)
        </span>
        <span className={row}>
          <RingSample action="OTWORZ" />
          O: OTWÓRZ (pierścień przerywany)
        </span>
        <span className={row}>
          <RingSample action="NIE_RUSZAJ" />
          N: NIE RUSZAJ (kropkowany)
        </span>
        <span className={row}>
          <span className="inline-block h-2.5 w-4 rounded-[1px] border-2 border-dashed" style={{ borderColor: C.terra, background: "rgba(181,87,59,.18)" }} aria-hidden />
          Działka sąsiada: ryzyko
        </span>
      </div>
      {/* land cover is drawn only on the "Schemat" basemap */}
      {basemap === "schema" && (
        <>
          <p className="eb mt-2 mb-0.5 text-[10px] text-forest-muted">Pokrycie terenu (BDOT10k)</p>
          <div className="grid grid-cols-3 gap-1 text-[10.5px]">
            {LAND_LEGEND.map(([label, color, op]) => (
              <span key={label} className="flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-[1px]" style={{ background: color, opacity: op }} aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type MapBasemap = "gugik-orto" | "s2-cloudless" | "osm" | "schema";

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
          <span lang="en">Sentinel-2 cloudless</span> –{" "}
          <a href="https://s2maps.eu" target="_blank" rel="noreferrer" className={a}>
            https://s2maps.eu
          </a>{" "}
          <span lang="en">by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)</span>, CC BY 4.0
        </>
      );
    case "osm":
      return (
        <>
          Podkład: ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className={a}>
            autorzy OpenStreetMap
          </a>{" "}
          (ODbL)
        </>
      );
    case "schema":
      return <>Podkład: BDOT10k (GUGiK)</>;
  }
}

export function MapSource({ basemap = "gugik-orto" }: { basemap?: MapBasemap }) {
  return (
    <div data-ui className="max-w-[520px] rounded-[4px] bg-cream/95 px-2.5 py-1.5 text-forest">
      <SourceLine tone="onCream">
        {SOURCES_MAP}
        {DATA_DATE && <span className="num"> · stan danych {DATA_DATE}</span>}
      </SourceLine>
      <p className="text-[11px] text-forest-muted">{DEMO_NOTE}</p>
      <p className="text-[11px] text-forest-muted">
        <BasemapCredit basemap={basemap} />
      </p>
    </div>
  );
}

const SHORT_CREDIT: Record<MapBasemap, [string, string | null]> = {
  "gugik-orto": ["Ortofoto © GUGiK", "https://www.geoportal.gov.pl"],
  "s2-cloudless": ["Sentinel-2 cloudless 2016 © EOX, CC BY 4.0", "https://s2maps.eu"],
  osm: ["© autorzy OpenStreetMap (ODbL)", "https://www.openstreetmap.org/copyright"],
  schema: ["BDOT10k © GUGiK", null],
};

/** Short source line + attribution, always visible in the map corner on phones (SPEC §06: a source line on every map;
 * tile licences require the credit at every width). */
export function MapCredit({ basemap }: { basemap: MapBasemap }) {
  const [text, href] = SHORT_CREDIT[basemap];
  return (
    <p data-ui className="max-w-[260px] rounded-[4px] bg-cream/95 px-1.5 py-0.5 text-right text-[10.5px] leading-tight text-forest">
      Źródło: BDOT10k, NMT 1 m (GUGiK)
      {DATA_DATE && <span className="num">, {DATA_DATE}</span>}
      {" · "}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="underline">
          {text}
        </a>
      ) : (
        text
      )}
    </p>
  );
}
