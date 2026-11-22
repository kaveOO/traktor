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

async function getJson<T>(url: string, init?: RequestInit, timeoutMs = 45000): Promise<Fetched<T>> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    const body = (await r.json().catch(() => null)) as (Record<string, unknown> & { error?: string; messagePl?: string }) | null;
    if (!r.ok || (body && typeof body.error === "string")) {
      const ra = Number(r.headers.get("retry-after"));
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
    if ((e as Error).name === "AbortError")
      return { ok: false, error: { code: TIMEOUT, status: 0, messagePl: `Serwer nie odpowiedział w ${Math.round(timeoutMs / 1000)} s` } };
    return { ok: false, error: { code: NETWORK, status: 0, messagePl: "Brak połączenia z serwerem" } };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Parcel by id/text or by point. The fixture parcel is used only when `allowFixture`
 * (dev build or ?demo=1) and the server is unreachable, never silently in production.
 */
export async function fetchParcel(q: { id: string } | { lonLat: LonLat }, allowFixture = false): Promise<Fetched<ParcelHit>> {
  const url =
    "id" in q
      ? `/api/dzialka?id=${encodeURIComponent(q.id.trim())}`
      : `/api/dzialka?lon=${q.lonLat[0].toFixed(6)}&lat=${q.lonLat[1].toFixed(6)}`;
  const r = await getJson<ParcelHit>(url, undefined, 20000);
  if (r.ok && !r.data?.geometry) return { ok: false, error: { code: "BAD_RESPONSE", status: 200, messagePl: "Niepełna odpowiedź serwera" } };
  if (!r.ok && allowFixture && "id" in q && q.id.trim() === FIXTURE_PARCEL_ID && [NETWORK, TIMEOUT, "HTTP_404"].includes(r.error.code))
    return { ok: true, data: FIXTURE_PARCEL, fixture: true };
  return r;
}

export async function postAnalysis(req: AnalysisRequest): Promise<Fetched<AnalysisResult>> {
  const r = await getJson<AnalysisResult>("/api/analiza", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (r.ok && !r.data?.assessment) return { ok: false, error: { code: "BAD_RESPONSE", status: 200, messagePl: "Niepełna odpowiedź serwera" } };
  return r;
}

/** Place search. GUGiK UUG GetLocation returned no objects for place names in tests, so we use Nominatim
 * (OSM, ODbL): only on submit, only for queries without digits, at most 1 request per second, Poland only. */
let lastGeocode = 0;
export type Place = { label: string; lonLat: LonLat; bbox?: [number, number, number, number] };
export async function geocode(q: string): Promise<Fetched<Place[]>> {
  const wait = 1100 - (Date.now() - lastGeocode);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pl&limit=5&accept-language=pl&q=${encodeURIComponent(q)}`;
  const r = await getJson<{ display_name: string; lon: string; lat: string; boundingbox?: string[] }[]>(url, undefined, 10000);
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
