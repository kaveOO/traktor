import type { AnalysisRequest, AnalysisResult, Level, LonLat, Parcel } from "@/lib/analiza";
import { FIXTURE_PARCEL, FIXTURE_PARCEL_ID } from "./fixture";

/** Same shape as lib/analiza/uldk ParcelCandidate (kept local: uldk.ts is server code). */
export type ParcelCandidate = { id: string; commune?: string; county?: string; voivodeship?: string; region?: string };

/** Full engine error, never reduced to a string. `code` is the engine `error` field or a client code. */
export type ApiError = {
  code: string;
  messagePl: string;
  status: number;
  step?: string;
  candidates?: ParcelCandidate[];
  /** seconds to wait before retrying (429 / 503) */
  retryAfterS?: number;
};

/** Client-side codes for failures without an engine body. */
export const TIMEOUT = "TIMEOUT";
export const NETWORK = "NETWORK";
/** The caller cancelled the request (newer parcel / search / unmount). Never shown to the user. */
export const ABORTED = "ABORTED";
const aborted = (): { ok: false; error: ApiError } => ({ ok: false, error: { code: ABORTED, status: 0, messagePl: "Anulowano" } });
export const isAborted = (r: Fetched<unknown>) => !r.ok && r.error.code === ABORTED;

/** Polish plural: 1 działka, 2-4 działki, 5+ działek (12-14 → działek). */
export const plPlural = (n: number, one: string, few: string, many: string) => {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
};

/** Wait `ms`, resolve false if the signal aborts first. */
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<boolean>((res) => {
    if (signal?.aborted) return res(false);
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", stop);
      res(true);
    }, ms);
    const stop = () => {
      clearTimeout(t);
      res(false);
    };
    signal?.addEventListener("abort", stop, { once: true });
  });

export type Fetched<T> = { ok: true; data: T; fixture?: boolean } | { ok: false; error: ApiError };

/** Parcel from /api/dzialka with the engine flags. */
export type ParcelHit = Parcel & { tooLarge?: boolean; matches?: number };

/**
 * Should the query go to /api/dzialka?id= (the engine resolves full ids, ids without the _N suffix,
 * AR_ sheet ids and "obręb numer" text such as "Zakrzewo 306/2")? Yes whenever it contains a digit.
 * Only pure place names (no digits) go to the geocoder.
 */
export const looksLikeParcelQuery = (q: string) => /\d/.test(q.trim());

const sentence = (s: string) => `${s.trim().replace(/[.\s]+$/, "")}.`;
/** Join message parts without double full stops. */
export const joinPl = (...parts: (string | null | undefined | false)[]) =>
  parts
    .filter((p): p is string => !!p && !!p.trim())
    .map(sentence)
    .join(" ");

async function getJson<T>(url: string, init?: RequestInit, timeoutMs = 45000, signal?: AbortSignal): Promise<Fetched<T>> {
  if (signal?.aborted) return aborted();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  const onAbort = () => ctl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    const body = (await r.json().catch(() => null)) as (Record<string, unknown> & { error?: string; messagePl?: string }) | null;
    if (!r.ok || (body && typeof body.error === "string")) {
      // Retry-After: delta-seconds or an HTTP date
      const raH = r.headers.get("retry-after");
      const ra = raH == null ? NaN : /^\d+$/.test(raH.trim()) ? Number(raH) : Math.ceil((Date.parse(raH) - Date.now()) / 1000);
      const code = (body?.error as string | undefined) ?? `HTTP_${r.status}`;
      return {
        ok: false,
        error: {
          code,
          status: r.status,
          messagePl: body?.messagePl || `Serwer odpowiedział kodem ${r.status}`,
          step: typeof body?.step === "string" ? body.step : undefined,
          candidates: Array.isArray(body?.candidates) ? (body!.candidates as ParcelCandidate[]) : undefined,
          retryAfterS: Number.isFinite(ra) && ra > 0 ? ra : code === "rate_limited" ? 60 : code === "busy" ? 10 : undefined,
        },
      };
    }
    if (!body) return { ok: false, error: { code: "BAD_RESPONSE", status: r.status, messagePl: "Serwer zwrócił pustą odpowiedź" } };
    return { ok: true, data: body as T };
  } catch (e) {
    if (signal?.aborted) return aborted();
    if ((e as Error).name === "AbortError")
      return { ok: false, error: { code: TIMEOUT, status: 0, messagePl: `Serwer nie odpowiedział w ${Math.round(timeoutMs / 1000)} s` } };
    return { ok: false, error: { code: NETWORK, status: 0, messagePl: "Brak połączenia z serwerem" } };
  } finally {
    clearTimeout(t);
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Parcel by id/text or by point. The fixture parcel is used only when `allowFixture`
 * (dev build or ?demo=1) and the server is unreachable, never silently in production.
 */
export async function fetchParcel(
  q: { id: string } | { lonLat: LonLat },
  allowFixture = false,
  signal?: AbortSignal,
): Promise<Fetched<ParcelHit>> {
  const url =
    "id" in q
      ? `/api/dzialka?id=${encodeURIComponent(q.id.trim())}`
      : `/api/dzialka?lon=${q.lonLat[0].toFixed(6)}&lat=${q.lonLat[1].toFixed(6)}`;
  const r = await getJson<ParcelHit>(url, undefined, 20000, signal);
  if (r.ok && !r.data?.geometry) return { ok: false, error: { code: "BAD_RESPONSE", status: 200, messagePl: "Niepełna odpowiedź serwera" } };
  if (!r.ok && allowFixture && "id" in q && q.id.trim() === FIXTURE_PARCEL_ID && [NETWORK, TIMEOUT, "HTTP_404"].includes(r.error.code))
    return { ok: true, data: FIXTURE_PARCEL, fixture: true };
  return r;
}

/** Longest Retry-After we wait for automatically; longer waits go to the visible countdown. */
const AUTO_RETRY_MAX_S = 15;

/**
 * POST /api/analiza. A 503 (engine queue full) is retried once after Retry-After (capped at 15 s);
 * `onRetryWait(s)` lets the UI say so. 429 is never retried automatically (60 s, shown as a countdown).
 */
export async function postAnalysis(
  req: AnalysisRequest,
  opts: { signal?: AbortSignal; onRetryWait?: (seconds: number) => void } = {},
): Promise<Fetched<AnalysisResult>> {
  const once = () =>
    getJson<AnalysisResult>(
      "/api/analiza",
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req) },
      45000,
      opts.signal,
    );
  let r = await once();
  if (!r.ok && r.error.status === 503 && (r.error.retryAfterS ?? 5) <= AUTO_RETRY_MAX_S) {
    const s = Math.max(1, r.error.retryAfterS ?? 5);
    opts.onRetryWait?.(s);
    if (!(await sleep(s * 1000, opts.signal))) return aborted();
    r = await once();
  }
  if (r.ok && !r.data?.assessment) return { ok: false, error: { code: "BAD_RESPONSE", status: 200, messagePl: "Niepełna odpowiedź serwera" } };
  return r;
}

/** Place search. GUGiK UUG GetLocation returned no objects for place names in tests, so we use Nominatim
 * (OSM, ODbL): only on submit, only for queries without digits, at most 1 request per second, Poland only. */
let lastGeocode = 0;
export type Place = { label: string; lonLat: LonLat; bbox?: [number, number, number, number] };
export async function geocode(q: string, signal?: AbortSignal): Promise<Fetched<Place[]>> {
  const wait = 1100 - (Date.now() - lastGeocode);
  if (wait > 0 && !(await sleep(wait, signal))) return aborted();
  lastGeocode = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pl&limit=5&accept-language=pl&q=${encodeURIComponent(q)}`;
  const r = await getJson<{ display_name: string; lon: string; lat: string; boundingbox?: string[] }[]>(url, undefined, 10000, signal);
  if (!r.ok) return r;
  return {
    ok: true,
    data: (Array.isArray(r.data) ? r.data : []).map((x) => ({
      label: x.display_name,
      lonLat: [Number(x.lon), Number(x.lat)],
      bbox: x.boundingbox
        ? [Number(x.boundingbox[2]), Number(x.boundingbox[0]), Number(x.boundingbox[3]), Number(x.boundingbox[1])]
        : undefined,
    })),
  };
}

/** Risk levels: word + icon + rank (the brand LevelTag maps rank to agri / soil / terracotta). */
export const LEVEL_PL: Record<Level, { word: string; icon: "water" | "drought"; rank: number }> = {
  niskie: { word: "Niskie", icon: "water", rank: 1 },
  umiarkowane: { word: "Umiarkowane", icon: "drought", rank: 2 },
  wysokie: { word: "Wysokie", icon: "drought", rank: 3 },
  bardzo_wysokie: { word: "Bardzo wysokie", icon: "drought", rank: 4 },
};

export const fmt = (n: number | null | undefined, digits = 0, unit = "") =>
  n === null || n === undefined || Number.isNaN(n)
    ? "brak danych"
    : `${n.toLocaleString("pl-PL", { maximumFractionDigits: digits, minimumFractionDigits: digits })}${unit ? ` ${unit}` : ""}`;

/** Date and time in Polish time. */
export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return "brak danych";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
};

/** Today in Poland (the engine validates against Europe/Warsaw, not the browser zone). */
export const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
export const minDateIso = () => {
  const t = todayIso();
  return `${Number(t.slice(0, 4)) - 10}${t.slice(4)}`;
};

/** URL / form date check: YYYY-MM-DD, a real calendar day, not in the future, at most 10 years back. */
export function validDate(d: string, min = minDateIso(), max = todayIso()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== day) return false;
  return d >= min && d <= max;
}

export function bboxOf(p: Parcel): [number, number, number, number] {
  const pts: number[][] =
    p.geometry.type === "Polygon"
      ? (p.geometry.coordinates as number[][][]).flat()
      : (p.geometry.coordinates as number[][][][]).flat(2);
  let [a, b, c, d] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of pts) {
    a = Math.min(a, x);
    b = Math.min(b, y);
    c = Math.max(c, x);
    d = Math.max(d, y);
  }
  return [a, b, c, d];
}
