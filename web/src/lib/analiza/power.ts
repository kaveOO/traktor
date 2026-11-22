import { fetchT } from "./util";
import { cacheGet, cachePut, canUseFs } from "../runtime";

/**
 * NASA POWER daily point data (MERRA-2 based, ~0.5°) for the 10-year climatology.
 * Open-Meteo's archive API is rate-limited (429) on the free tier, so POWER is the primary history source.
 * ET0 = FAO-56 Penman-Monteith (eq. 6) from Tmax/Tmin/RH/u2/Rs; sunshine hours from Angstrom (a=0.25, b=0.5).
 */
export const LICENSE_POWER = "NASA POWER Project, NASA Langley Research Center (LaRC), domena publiczna";
/** f = RH at ~13:00 (%), estimated as 100·ea/es(Tmax) + 5 pp (docs/review2/02 §4); v = wind at 10 m (m/s) = WS2M / 0.748 */
export type PowerDay = { p: number | null; e: number | null; t: number | null; tm: number | null; sun: number | null; f?: number | null; v?: number | null };
/** bump when the PowerDay shape changes (invalidates the disk cache) */
const CACHE_VER = "v2";

const PARAMS = "PRECTOTCORR,T2M_MAX,T2M_MIN,T2M,RH2M,WS2M,ALLSKY_SFC_SW_DWN";
const TTL_MS = 12 * 3600_000;
const mem = new Map<string, { start: string; at: number; days: Map<string, PowerDay> }>();
const inflight = new Map<string, Promise<Map<string, PowerDay>>>();
type DiskEntry = { start: string; at: number; days: [string, PowerDay][] };
/** OS temp-dir cache on Node only; Workers have no persistent fs (Cache API used instead). Loaded lazily so workerd never touches node:fs/os. */
async function diskPath(key: string): Promise<string> {
  const [{ tmpdir }, { join }] = await Promise.all([import("node:os"), import("node:path")]);
  return join(tmpdir(), "traktor-power-cache", `${key}.json`);
}
async function diskGet(key: string): Promise<DiskEntry | null> {
  if (!canUseFs()) return cacheGet<DiskEntry>(`power:${key}`);
  try {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(await diskPath(key), "utf8")) as DiskEntry;
  } catch {
    return null;
  }
}
async function diskPut(key: string, v: DiskEntry): Promise<void> {
  if (!canUseFs()) return cachePut(`power:${key}`, v, TTL_MS / 1000);
  try {
    const [{ mkdir, writeFile }, { dirname }] = await Promise.all([import("node:fs/promises"), import("node:path")]);
    const file = await diskPath(key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(v));
  } catch {
    /* best effort */
  }
}

const es = (t: number) => 0.6108 * Math.exp((17.27 * t) / (t + 237.3));

function ra(latDeg: number, doy: number) {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
  const d = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(d))));
  const Ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.sin(ws));
  return { Ra, N: (24 / Math.PI) * ws };
}

/** FAO-56 Penman-Monteith daily ET0 (mm). z = elevation (m). */
export function et0PM(tmax: number, tmin: number, rh: number, u2: number, rs: number, latDeg: number, doy: number, z = 150): number {
  const tmean = (tmax + tmin) / 2;
  const esat = (es(tmax) + es(tmin)) / 2;
  const ea = Math.max(0.01, (Math.min(100, Math.max(0, rh)) / 100) * esat);
  const delta = (4098 * es(tmean)) / (tmean + 237.3) ** 2;
  const P = 101.3 * Math.pow((293 - 0.0065 * z) / 293, 5.26);
  const gamma = 0.000665 * P;
  const { Ra } = ra(latDeg, doy);
  const rso = (0.75 + 2e-5 * z) * Ra;
  const rns = 0.77 * rs;
  const ratio = rso > 0 ? Math.min(1, rs / rso) : 0.5;
  const rnl = 4.903e-9 * (((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2) * (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * ratio - 0.35);
  const rn = rns - rnl;
  const et0 = (0.408 * delta * rn + gamma * (900 / (tmean + 273)) * u2 * (esat - ea)) / (delta + gamma * (1 + 0.34 * u2));
  return Math.max(0, et0);
}

/** Hargreaves fallback when RH/wind are missing */
const et0Hargreaves = (tmax: number, tmin: number, latDeg: number, doy: number) =>
  Math.max(0, 0.0023 * ra(latDeg, doy).Ra * 0.408 * ((tmax + tmin) / 2 + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)));

const doyOf = (d: string) => Math.round((Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(+d.slice(0, 4), 0, 0)) / 86400_000);

export const cellOf = (lon: number, lat: number) => ({ lon: Math.round(lon * 10) / 10, lat: Math.round(lat * 10) / 10 });

/** Daily series for a 0.1° cell from `start` (YYYY-MM-DD) to yesterday; cached in memory and in the OS temp dir. */
export async function powerSeries(lon: number, lat: number, start: string, signal?: AbortSignal): Promise<Map<string, PowerDay>> {
  const c = cellOf(lon, lat);
  const key = `${CACHE_VER}_${c.lat.toFixed(1)}_${c.lon.toFixed(1)}`;
  const hit = mem.get(key);
  if (hit && hit.start <= start && Date.now() - hit.at < TTL_MS) return hit.days;
  const raw = await diskGet(key);
  if (raw && raw.start <= start && Date.now() - raw.at < TTL_MS) {
    const days = new Map(raw.days);
    mem.set(key, { start: raw.start, at: raw.at, days });
    return days;
  }
  const fk = `${key}|${start}`;
  const running = inflight.get(fk);
  if (running) return running;
  const job = (async () => {
    const end = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${PARAMS}&community=AG&longitude=${c.lon}&latitude=${c.lat}&start=${start.replace(/-/g, "")}&end=${end.replace(/-/g, "")}&format=JSON`;
    const res = await fetchT(url, { timeoutMs: 9000, retries: 1, signal });
    const j = (await res.json()) as { properties?: { parameter?: Record<string, Record<string, number>> } };
    const P = j.properties?.parameter;
    if (!P?.PRECTOTCORR) throw new Error("bad power");
    const v = (k: string, d: string) => {
      const x = P[k]?.[d];
      return typeof x === "number" && x > -900 ? x : null;
    };
    const days = new Map<string, PowerDay>();
    for (const ds of Object.keys(P.PRECTOTCORR)) {
      const d = `${ds.slice(0, 4)}-${ds.slice(4, 6)}-${ds.slice(6, 8)}`;
      const p = v("PRECTOTCORR", ds), tx = v("T2M_MAX", ds), tn = v("T2M_MIN", ds), tm = v("T2M", ds), rh = v("RH2M", ds), u = v("WS2M", ds), rs = v("ALLSKY_SFC_SW_DWN", ds);
      if (p === null || tx === null || tn === null) continue;
      const doy = doyOf(d);
      const e = rs !== null && rh !== null && u !== null ? et0PM(tx, tn, rh, u, rs, c.lat, doy) : et0Hargreaves(tx, tn, c.lat, doy);
      let sun: number | null = null;
      if (rs !== null) {
        const { Ra, N } = ra(c.lat, doy);
        sun = Math.max(0, Math.min(N, (N * (rs / Math.max(0.1, Ra) - 0.25)) / 0.5)) * 3600;
      }
      const ea = rh !== null ? (Math.min(100, Math.max(0, rh)) / 100) * ((es(tx) + es(tn)) / 2) : null;
      const f = ea !== null ? Math.min(100, (100 * ea) / es(tx) + 5) : null;
      days.set(d, { p: Math.max(0, p), e: Math.round(e * 100) / 100, t: tx, tm: tm ?? (tx + tn) / 2, sun, f: f === null ? null : Math.round(f * 10) / 10, v: u === null ? null : Math.round((u / 0.748) * 100) / 100 });
    }
    const entry = { start, at: Date.now(), days };
    mem.set(key, entry);
    if (mem.size > 300) mem.delete(mem.keys().next().value as string);
    // Node: fire-and-forget file write. Workers: awaited (un-awaited I/O may be cancelled after the response).
    const put = diskPut(key, { start, at: entry.at, days: [...days] });
    if (!canUseFs()) await put;
    return days;
  })();
  inflight.set(fk, job);
  try {
    return await job;
  } finally {
    inflight.delete(fk);
  }
}

/* Open-Meteo forecast API (separate quota from the archive): last 92 days + 10-day forecast, cached 1 h per cell */
type OmDaily = Record<string, (number | null)[] | string[] | undefined> & { time?: string[] };
const omMem = new Map<string, { at: number; d: OmDaily }>();
export async function omForecast(lon: number, lat: number, signal?: AbortSignal): Promise<OmDaily> {
  const c = cellOf(lon, lat);
  const key = `${c.lat}_${c.lon}`;
  const hit = omMem.get(key);
  if (hit && Date.now() - hit.at < 3600_000) return hit.d;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_mean,sunshine_duration,relative_humidity_2m_min,wind_speed_10m_mean&wind_speed_unit=ms&timezone=Europe%2FWarsaw&past_days=92&forecast_days=10`;
  const res = await fetchT(url, { timeoutMs: 7000, retries: 1, signal });
  const j = (await res.json()) as { daily?: OmDaily };
  if (!j.daily?.time?.length) throw new Error("no daily");
  omMem.set(key, { at: Date.now(), d: j.daily });
  if (omMem.size > 300) omMem.delete(omMem.keys().next().value as string);
  return j.daily;
}
