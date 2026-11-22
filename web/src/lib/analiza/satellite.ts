/**
 * Sentinel-2 L2A parcel indices (NDVI, NDMI) read live from STAC COGs
 * (Microsoft Planetary Computer, fallback Earth Search; same Copernicus L2A product).
 * Window reads only (HTTP range requests via geotiff), SCL cloud mask, 5-year baseline in parallel, 15 s budget.
 * Debug: TRAKTOR_SAT_PROVIDER=es forces Earth Search.
 * Plain TS, no Next imports: testable with `node --experimental-strip-types`.
 */
import { fromUrl } from "geotiff";
import type { Assessment, Parcel, SourceInfo } from "./types";
import type { Crop } from "./crops";

const STAC = "https://earth-search.aws.element84.com/v1";
const BUDGET_MS = 15000;
const MIN_VALID = 0.6;
const DAY = 86400000;

type Sat = Assessment["satellite"];
type Ring = number[][];

/* ---------- WGS84 -> UTM (Snyder / USGS, accuracy << 1 m in-zone) ---------- */
export function toUtm(lon: number, lat: number, zone: number): [number, number] {
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const phi = (lat * Math.PI) / 180;
  const lam0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  const sin = Math.sin(phi), cos = Math.cos(phi), tan = Math.tan(phi);
  const N = a / Math.sqrt(1 - e2 * sin * sin);
  const T = tan * tan, C = ep2 * cos * cos, A = cos * (lam - lam0);
  const e4 = e2 * e2, e6 = e4 * e2;
  const M = a * ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi
    - ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi)
    + ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi)
    - ((35 * e6) / 3072) * Math.sin(6 * phi));
  const x = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
  const y = k0 * (M + N * tan * ((A * A) / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24
    + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  return [x, y]; // northern hemisphere
}

/* ---------- geometry helpers ---------- */
function rings(p: Parcel): Ring[] {
  const g = p.geometry;
  if (g.type === "Polygon") return g.coordinates as number[][][];
  return (g.coordinates as number[][][][]).flat();
}

function inside(x: number, y: number, rs: Ring[]): boolean {
  let c = false; // even-odd over all rings: handles holes and multipolygons
  for (const r of rs) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
  }
  return c;
}

function bbox(rs: Ring[]): [number, number, number, number] {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const r of rs) for (const [x, y] of r) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  return [a, b, c, d];
}

/* ---------- STAC providers ----------
 * Same Copernicus Sentinel-2 L2A data from two free catalogues, no account:
 * - Microsoft Planetary Computer (Azure West Europe, anonymous SAS token): fast from Poland, primary.
 * - Element84 Earth Search (AWS us-west-2): fallback.
 */
type Provider = "pc" | "es";
type RawItem = {
  id: string;
  properties: Record<string, unknown> & { datetime: string; "eo:cloud_cover"?: number };
  assets: Record<string, { href: string }>;
};
/** normalized scene */
type Item = {
  id: string;
  provider: Provider;
  date: string;
  dt: number;
  cloud: number;
  epsg: number;
  tile: string;
  href: { red?: string; nir?: string; nir08?: string; swir16?: string; scl?: string };
  /** reflectance = DN * 1e-4 + offset */
  offset: number;
  self: string;
};

const STAC_PC = "https://planetarycomputer.microsoft.com/api/stac/v1";
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

let sas: { token: string; exp: number } | null = null;
async function pcToken(signal: AbortSignal): Promise<string> {
  if (sas && sas.exp - Date.now() > 5 * 60000) return sas.token;
  const r = await fetch("https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a", { signal });
  if (!r.ok) throw new Error(`SAS ${r.status}`);
  const j = (await r.json()) as { token: string; "msft:expiry": string };
  sas = { token: j.token, exp: Date.parse(j["msft:expiry"]) };
  return j.token;
}

const baselineGe4 = (p: RawItem["properties"]) => parseFloat(String(p["s2:processing_baseline"] ?? "0")) >= 4;

function normalize(f: RawItem, provider: Provider, token: string): Item {
  const p = f.properties;
  const keys = provider === "pc"
    ? { red: "B04", nir: "B08", nir08: "B8A", swir16: "B11", scl: "SCL" }
    : { red: "red", nir: "nir", nir08: "nir08", swir16: "swir16", scl: "scl" };
  const h = (k: string) => { const u = f.assets[k]?.href; return u ? (provider === "pc" ? `${u}?${token}` : u) : undefined; };
  // PC serves original DNs (+1000 offset since baseline 04.00). Earth Search items with
  // earthsearch:boa_offset_applied=true already had the offset removed (verified on pixels:
  // red DN ~200 over vegetation), despite raster:bands saying -0.1.
  const offset = provider === "pc" ? (baselineGe4(p) ? -0.1 : 0) : p["earthsearch:boa_offset_applied"] === true ? 0 : baselineGe4(p) ? -0.1 : 0;
  return {
    id: f.id,
    provider,
    date: p.datetime.slice(0, 10),
    dt: Date.parse(p.datetime),
    cloud: Number(p["eo:cloud_cover"] ?? 0),
    epsg: Number(p["proj:epsg"] ?? String(p["proj:code"] ?? "").replace("EPSG:", "")),
    tile: String(p["s2:mgrs_tile"] ?? p["grid:code"] ?? ""),
    href: { red: h(keys.red), nir: h(keys.nir), nir08: h(keys.nir08), swir16: h(keys.swir16), scl: h(keys.scl) },
    offset,
    self: `${provider === "pc" ? STAC_PC : STAC}/collections/sentinel-2-l2a/items/${f.id}`,
  };
}

async function searchOne(provider: Provider, bb: number[], from: string, to: string, signal: AbortSignal): Promise<Item[]> {
  const token = provider === "pc" ? await pcToken(signal) : "";
  const res = await fetch(`${provider === "pc" ? STAC_PC : STAC}/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      collections: ["sentinel-2-l2a"],
      bbox: bb,
      datetime: `${from}T00:00:00Z/${to}T23:59:59Z`,
      query: { "eo:cloud_cover": { lt: 60 } },
      sortby: [{ field: "properties.datetime", direction: "desc" }],
      limit: 40,
    }),
    signal,
  });
  if (!res.ok) throw new Error(`STAC ${provider} ${res.status}`);
  const j = (await res.json()) as { features: RawItem[] };
  // dedupe reprocessed duplicates (same tile + date): keep the later one
  const best = new Map<string, { it: Item; seq: number }>();
  for (const f of j.features ?? []) {
    const it = normalize(f, provider, token);
    const seq = Date.parse(String(f.properties["s2:generation_time"] ?? "")) || Number(f.properties["s2:sequence"] ?? 0);
    const k = `${it.tile}_${it.date}`;
    const o = best.get(k);
    if (!o || seq > o.seq) best.set(k, { it, seq });
  }
  return [...best.values()].map((v) => v.it).sort((a, b) => b.dt - a.dt);
}

async function search(bb: number[], from: string, to: string, signal: AbortSignal): Promise<Item[]> {
  if (typeof process !== "undefined" && process.env?.TRAKTOR_SAT_PROVIDER === "es") return searchOne("es", bb, from, to, signal);
  try {
    return await searchOne("pc", bb, from, to, signal);
  } catch (e) {
    if (signal.aborted) throw e;
    return searchOne("es", bb, from, to, signal);
  }
}

/* ---------- raster window ---------- */
type Win = { data: ArrayLike<number>; x0: number; y0: number; w: number; h: number; ox: number; oy: number; rx: number; ry: number };

async function readWin(href: string, ub: [number, number, number, number], signal: AbortSignal): Promise<Win | null> {
  const tif = await fromUrl(href, { allowFullFile: false }, signal);
  const img = await tif.getImage();
  const [ox, oy] = img.getOrigin();
  const [rx, ry] = img.getResolution(); // ry < 0
  const W = img.getWidth(), H = img.getHeight();
  const c0 = Math.max(0, Math.floor((ub[0] - ox) / rx) - 1);
  const c1 = Math.min(W, Math.ceil((ub[2] - ox) / rx) + 1);
  const r0 = Math.max(0, Math.floor((ub[3] - oy) / ry) - 1);
  const r1 = Math.min(H, Math.ceil((ub[1] - oy) / ry) + 1);
  if (c1 <= c0 || r1 <= r0) return null;
  const r = await img.readRasters({ window: [c0, r0, c1, r1], samples: [0], interleave: true, signal });
  return { data: r as unknown as ArrayLike<number>, x0: c0, y0: r0, w: c1 - c0, h: r1 - r0, ox, oy, rx, ry };
}

function at(win: Win, x: number, y: number): number {
  const c = Math.floor((x - win.ox) / win.rx) - win.x0;
  const r = Math.floor((y - win.oy) / win.ry) - win.y0;
  if (c < 0 || r < 0 || c >= win.w || r >= win.h) return 0;
  return win.data[r * win.w + c];
}

type SceneResult = { date: string; id: string; provider: Provider; self: string; cloud: number; ndvi: number; ndmi: number; validPct: number; usedUnclassified: boolean };

/** SCL 4 = vegetation, 5 = bare soil. 7 (unclassified) only as a fallback when 4+5 < 60 %. Water (6), shadow, cloud, snow excluded. */
const SCL_STRICT = new Set([4, 5]);
const SCL_LOOSE = new Set([4, 5, 7]);

async function evalScene(it: Item, parcel: Parcel, signal: AbortSignal): Promise<SceneResult | { rejected: string }> {
  const zone = it.epsg - 32600;
  if (!(zone >= 1 && zone <= 60)) return { rejected: "epsg" };
  const ur = rings(parcel).map((r) => r.map(([lo, la]) => toUtm(lo, la, zone)));
  const ub = bbox(ur);
  const { red: hRed, nir: hNir, nir08: hN8, swir16: hSw, scl: hScl } = it.href;
  if (!hScl || !hRed || !hNir || !hN8 || !hSw) return { rejected: "assets" };

  // 1) SCL first (small, 20 m): bail out early on cloudy parcels
  const scl = await readWin(hScl, ub, signal);
  if (!scl) return { rejected: "outside" };
  // pixel centres on the 10 m grid
  const cx = Math.floor(ub[0] / 10) * 10 + 5, cy = Math.floor(ub[1] / 10) * 10 + 5;
  const pts: [number, number][] = [];
  for (let x = cx; x <= ub[2]; x += 10) for (let y = cy; y <= ub[3]; y += 10) if (inside(x, y, ur)) pts.push([x, y]);
  if (!pts.length) { // tiny parcel: use the centroid pixel
    const [x, y] = toUtm(parcel.centroid[0], parcel.centroid[1], zone);
    pts.push([x, y]);
  }
  const share = (ok: Set<number>) => pts.filter(([x, y]) => ok.has(at(scl, x, y))).length / pts.length;
  let OK = SCL_STRICT;
  if (share(SCL_STRICT) < MIN_VALID) {
    if (share(SCL_LOOSE) < MIN_VALID) return { rejected: `cloud ${Math.round((1 - share(SCL_LOOSE)) * 100)}%` };
    OK = SCL_LOOSE;
  }

  // 2) bands. NDVI = (B08 − B04)/(B08 + B04) at 10 m; NDMI = (B8A − B11)/(B8A + B11) at 20 m (Gao 1996)
  const [red, nir, n8, sw] = await Promise.all([readWin(hRed, ub, signal), readWin(hNir, ub, signal), readWin(hN8, ub, signal), readWin(hSw, ub, signal)]);
  if (!red || !nir || !n8 || !sw) return { rejected: "outside" };
  const o = it.offset;
  const refl = (dn: number) => Math.max(0, dn * 1e-4 + o);
  let n = 0, sv = 0, sm = 0;
  for (const [x, y] of pts) {
    if (!OK.has(at(scl, x, y))) continue;
    const R = at(red, x, y), N = at(nir, x, y), N8 = at(n8, x, y), S = at(sw, x, y);
    if (!R || !N || !N8 || !S) continue; // nodata = 0
    const r = refl(R), nn = refl(N), a = refl(N8), s = refl(S);
    if (nn + r <= 0 || a + s <= 0) continue;
    sv += (nn - r) / (nn + r);
    sm += (a - s) / (a + s);
    n++;
  }
  if (n / pts.length < MIN_VALID) return { rejected: "nodata" };
  return {
    date: it.date,
    id: it.id,
    provider: it.provider,
    self: it.self,
    cloud: Math.round(it.cloud),
    ndvi: +(sv / n).toFixed(3),
    ndmi: +(sm / n).toFixed(3),
    validPct: Math.round((n / pts.length) * 100),
    usedUnclassified: OK === SCL_LOOSE,
  };
}

/** Try candidate scenes in order until one is clear over the parcel. */
async function bestScene(items: Item[], parcel: Parcel, signal: AbortSignal, maxTries = 4): Promise<SceneResult | null> {
  for (const it of items.slice(0, maxTries)) {
    if (signal.aborted) return null;
    try {
      const r = await evalScene(it, parcel, signal);
      if ("ndvi" in r) return r;
    } catch {
      if (signal.aborted) return null;
    }
  }
  return null;
}

/* ---------- interpretation ---------- */
const pl = (v: number, d = 2) => v.toFixed(d).replace(".", ",").replace("-", "−");

function median(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b), m = s.length >> 1;
  return +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(3);
}

/** anomaly thresholds: smaller differences are within scene-to-scene noise (phenology ±2 weeks, atmosphere, BRDF). Do kalibracji. */
const NOISE = 0.1;
/** history NDVI spread above which the parcel's past years are not comparable (crop rotation) */
const MAX_SPREAD = 0.3;

export function interpret(
  s: Pick<Sat, "ndvi" | "ndmi" | "ndviNorm" | "ndmiNorm">,
  month: number,
  crop: Crop,
  nYears: number,
  spread: number | null,
): string | null {
  const { ndvi, ndmi } = s;
  if (ndvi == null) return null;
  // norm comparable only when the parcel's past years agree with each other
  const comparable = spread == null || spread <= MAX_SPREAD;
  const ndviNorm = comparable ? s.ndviNorm : null;
  const ndmiNorm = comparable ? s.ndmiNorm : null;
  const kc = crop.kc[month - 1] ?? 0;
  const kcPrev = crop.kc[(month + 10) % 12] ?? 0;
  const winterCrop = crop.kc[0] > 0; // overwinters in the field
  const cereal = ["pszenica_ozima", "jeczmien_jary", "zyto", "rzepak_ozimy"].includes(crop.id);
  const name = crop.namePl.toLowerCase();
  const out: string[] = [];
  out.push(`NDVI ${pl(ndvi)}${ndmi != null ? `, NDMI ${pl(ndmi)}` : ""}.`);
  if (s.ndviNorm != null) {
    const base = `${nYears === 1 ? "Wartość z poprzedniego roku" : `Mediana z ${nYears} poprzednich lat`} na tej działce (uprawy mogły się różnić): NDVI ${pl(s.ndviNorm)}${s.ndmiNorm != null ? `, NDMI ${pl(s.ndmiNorm)}` : ""}.`;
    out.push(comparable ? base : `${base} Poprzednie lata różnią się między sobą o ${pl(spread!)} NDVI, prawdopodobnie inne uprawy: porównania z normą nie wyciągamy.`);
  }

  // phase-aware expectation (Polish calendar)
  let offSeason = false;
  if (cereal && month >= 7 && month <= 9 && kc <= 0.5) {
    offSeason = true;
    if (ndvi < 0.4) out.push(`Niski NDVI jest typowy po żniwach (${name}): to goła gleba lub ściernisko, nie oznaka suszy.`);
    else if (ndvi >= 0.6) out.push("Wysoki NDVI po terminie żniw: na działce rośnie prawdopodobnie inna uprawa, międzyplon lub zboże nie jest jeszcze zebrane. Wymaga wizji lokalnej.");
  } else if (winterCrop && (month <= 2 || month === 12)) {
    offSeason = true;
    out.push(`Zimą ${name} ma niski NDVI (spoczynek), indeks słabo mówi o wodzie.`);
  } else if (kc <= 0.35) {
    offSeason = true;
    if (ndvi < 0.4) out.push(`Poza sezonem wegetacji (${name}) niski NDVI jest spodziewany: przed siewem lub po zbiorze.`);
  }
  const ripening = !offSeason && cereal && (month === 6 || month === 7) && kc < kcPrev;
  if (ripening) out.push("To okres dojrzewania: spadek NDVI jest naturalny, ważniejsze jest porównanie z poprzednimi latami niż sama wartość.");

  if (!offSeason) {
    if (ndviNorm != null) {
      const d = ndvi - ndviNorm;
      if (d <= -NOISE) out.push(`NDVI o ${pl(-d)} niższy niż zwykle o tej porze: słabsza biomasa niż w poprzednich latach.`);
      else if (d >= NOISE) out.push(`NDVI o ${pl(d)} wyższy niż zwykle o tej porze.`);
      else out.push("NDVI w normie (różnica poniżej 0,10, w granicach szumu).");
    }
    if (kc >= 0.8 && !ripening && ndvi < 0.6 * crop.ndviHealthy)
      out.push(`To wyraźnie mniej niż typowe ${pl(crop.ndviHealthy)} dla zdrowej uprawy w pełni wegetacji: możliwy stres, słaby wschód albo inna uprawa na działce. Wymaga wizji lokalnej.`);
  }

  // water content (meaningful only over vegetation); at full canopy (NDVI > 0.8) NDVI saturates, NDMI reacts first
  if (ndmi != null && ndvi >= 0.3) {
    if (ndmiNorm != null) {
      const d = ndmi - ndmiNorm;
      if (d <= -NOISE) out.push(`NDMI o ${pl(-d)} niższy niż zwykle o tej porze: rośliny mają mniej wody.`);
      else if (d >= NOISE) out.push(`NDMI o ${pl(d)} wyższy niż zwykle o tej porze: rośliny mają więcej wody niż w poprzednich latach.`);
      else out.push("NDMI w normie (różnica poniżej 0,10).");
    }
    if (!offSeason && ndmi < 0) out.push("NDMI poniżej zera przy zielonej roślinności może oznaczać stres wodny (próg do kalibracji).");
  } else if (ndmi != null) {
    out.push("Przy słabym pokryciu roślinnością NDMI opisuje głównie wilgotność powierzchni gleby.");
  }
  out.push("Satelita tylko potwierdza sygnał z bilansu wodnego, nie rozstrzyga sam.");
  return out.join(" ");
}

/* ---------- main ---------- */
export async function getSatellite(parcel: Parcel, date: string, crop: Crop): Promise<{ data: Sat; source: SourceInfo }> {
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), BUDGET_MS);
  const signal = ctl.signal;
  const bb = bbox(rings(parcel));
  const pad = 0.001;
  const bb4 = [bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad];
  const t = Date.parse(`${date}T12:00:00Z`);
  const month = new Date(t).getUTCMonth() + 1;
  const year = new Date(t).getUTCFullYear();

  const current = (async () => {
    const items = await search(bb4, iso(t - 20 * DAY), date, signal); // newest first
    return bestScene(items, parcel, signal, 5);
  })().catch(() => null);

  const years = [1, 2, 3, 4, 5].map((k) => year - k).filter((y) => y >= 2017);
  const hist = years.map(async (y) => {
    const tc = Date.UTC(y, new Date(t).getUTCMonth(), new Date(t).getUTCDate(), 12);
    const items = await search(bb4, iso(tc - 15 * DAY), iso(tc + 15 * DAY), signal);
    // least cloudy first, ties: closest to the same day-of-year
    items.sort((a, b) => a.cloud - b.cloud || Math.abs(a.dt - tc) - Math.abs(b.dt - tc));
    return bestScene(items, parcel, signal, 3);
  });

  const [cur, ...hs] = await Promise.all([current, ...hist.map((p) => p.catch(() => null))]);
  const timedOut = signal.aborted;
  clearTimeout(timer);

  const histOk = hs.filter((h): h is SceneResult => !!h).sort((a, b) => a.date.localeCompare(b.date));
  const ndviNorm = median(histOk.map((h) => h.ndvi));
  const ndmiNorm = median(histOk.map((h) => h.ndmi));
  const spread = histOk.length >= 2 ? +(Math.max(...histOk.map((h) => h.ndvi)) - Math.min(...histOk.map((h) => h.ndvi))).toFixed(3) : null;
  const history = histOk.map((h) => ({ date: h.date, ndvi: h.ndvi, ndmi: h.ndmi }));
  if (cur) history.push({ date: cur.date, ndvi: cur.ndvi, ndmi: cur.ndmi });

  const data: Sat = {
    sceneDate: cur?.date ?? null,
    cloudPct: cur?.cloud ?? null,
    ndvi: cur?.ndvi ?? null,
    ndmi: cur?.ndmi ?? null,
    ndviNorm,
    ndmiNorm,
    anomalyPl: cur ? interpret({ ndvi: cur.ndvi, ndmi: cur.ndmi, ndviNorm, ndmiNorm }, month, crop, histOk.length, spread) : null,
    history,
  };

  const notes: string[] = [];
  if (!cur) notes.push(timedOut ? "Brak danych satelitarnych: limit czasu (15 s) minął przed odczytem bieżącej sceny" : "Brak bezchmurnej sceny w 20 dniach przed datą");
  if (histOk.length < years.length) notes.push(`Norma z ${histOk.length} z ${years.length} lat${timedOut ? " (limit czasu)" : " (zachmurzenie lub brak scen)"}`);
  if (histOk.length) notes.push("Norma to mediana z poprzednich lat na tej działce (uprawy mogły się różnić)");
  if (spread != null && spread > MAX_SPREAD) notes.push(`Rozrzut NDVI między latami ${pl(spread)}: prawdopodobnie zmiana uprawy, anomalii nie wyznaczono`);
  if (cur?.usedUnclassified) notes.push("Maska SCL: dopuszczono piksele niesklasyfikowane (7), mniej pewny odczyt");
  const status: SourceInfo["status"] = !cur ? "missing" : histOk.length >= 3 ? "ok" : "partial";

  const provider = (cur ?? histOk[0])?.provider ?? "pc";
  const catalogue = provider === "es" ? "Earth Search by Element 84 (AWS Open Data)" : "Microsoft Planetary Computer (zapas: Earth Search by Element 84, AWS Open Data)";
  const usedYears = [...new Set([...histOk.map((h) => h.date.slice(0, 4)), ...(cur ? [cur.date.slice(0, 4)] : [])])].sort();
  const yearsTxt = usedYears.length > 1 ? `${usedYears[0]}-${usedYears[usedYears.length - 1]}` : usedYears[0] ?? String(year);

  const detail = [
    cur ? `scena ${cur.id} (${cur.date}), zachmurzenie sceny ${cur.cloud}%, ważne piksele działki ${cur.validPct}%` : "brak bieżącej sceny",
    histOk.length ? `norma (mediana): ${histOk.map((h) => h.date).join(", ")}` : "brak normy wieloletniej",
    "NDVI B08/B04 10 m, NDMI B8A/B11 20 m, maska SCL 4-5",
  ].join("; ");

  return {
    data,
    source: {
      id: "Sentinel2",
      label: `Sentinel-2 L2A (Copernicus) via ${provider === "es" ? "Earth Search" : "Microsoft Planetary Computer"}`,
      detail,
      status,
      fetchedAt: new Date().toISOString(),
      ms: Date.now() - t0,
      license: `Contains modified Copernicus Sentinel data ${yearsTxt} (Copernicus Sentinel Data Legal Notice); ${catalogue}`,
      url: cur ? cur.self : `${STAC_PC}/collections/sentinel-2-l2a`,
      ...(notes.length ? { note: notes.join(". ") } : {}),
    },
  };
}
