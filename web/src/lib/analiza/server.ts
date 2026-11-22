import { CROPS } from "./crops";
import { inPoland } from "./geo";
import type { AnalysisError, AnalysisRequest, AnalysisResult, CropId, LonLat } from "./types";
import { looksLikeParcelId, normalizeParcelId, type ParcelCandidate } from "./uldk";
import { shiftYears, todayPL } from "./util";
import { analyze, AnalysisFailure } from "./analyze";
import { rateLimited } from "./ratelimit";

/* ---------- validation ---------- */
export type Valid = { ok: true; req: AnalysisRequest } | { ok: false; err: AnalysisError };
const bad = (error: string, messagePl: string, step = "walidacja"): Valid => ({ ok: false, err: { error, messagePl, step } });

export function validDate(s: unknown): string | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
}

export function validLonLat(lon: unknown, lat: unknown): LonLat | null {
  const a = typeof lon === "string" ? Number(lon) : lon;
  const b = typeof lat === "string" ? Number(lat) : lat;
  if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  return inPoland([a, b]) ? [a, b] : null;
}

export function validateRequest(input: { parcelId?: unknown; lon?: unknown; lat?: unknown; lonLat?: unknown; crop?: unknown; date?: unknown }): Valid {
  const crop = typeof input.crop === "string" ? CROPS.find((c) => c.id === input.crop)?.id : undefined;
  if (!crop) return bad("bad_crop", `Nieznana uprawa. Dostępne: ${CROPS.map((c) => c.id).join(", ")}.`);
  const today = todayPL();
  const date = input.date === undefined || input.date === "" ? today : validDate(input.date);
  if (!date) return bad("bad_date", "Podaj datę w formacie RRRR-MM-DD.");
  if (date > today) return bad("bad_date", "Data nie może być z przyszłości.");
  if (date < shiftYears(today, -10)) return bad("bad_date", "Analiza obejmuje ostatnie 10 lat. Podaj późniejszą datę.");
  let parcelId: string | undefined;
  let lonLat: LonLat | undefined;
  if (typeof input.parcelId === "string" && input.parcelId.trim()) {
    if (input.parcelId.length > 80 || !looksLikeParcelId(input.parcelId))
      return bad("bad_parcel", "Nieprawidłowy numer działki. Przykład: 040307_2.0023.306/2.");
    parcelId = normalizeParcelId(input.parcelId);
  } else {
    const ll = Array.isArray(input.lonLat) ? validLonLat(input.lonLat[0], input.lonLat[1]) : input.lon !== undefined ? validLonLat(input.lon, input.lat) : null;
    if (!ll) return bad("bad_parcel", "Podaj numer działki albo wskaż punkt na mapie w Polsce.");
    lonLat = [Math.round(ll[0] * 1e6) / 1e6, Math.round(ll[1] * 1e6) / 1e6];
  }
  return { ok: true, req: { ...(parcelId ? { parcelId } : { lonLat }), crop: crop as CropId, date } };
}

/* ---------- cache, concurrency, rate limit ---------- */
export { clientIp, rateLimited } from "./ratelimit";
const CACHE_TTL = 3600_000;
/** results with a missing/partial source (timeouts) are kept only briefly, so a retry can get the full answer */
const CACHE_TTL_DEGRADED = 120_000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; ttl: number; r: AnalysisResult }>();
type Job = { p: Promise<AnalysisResult>; ctrl: AbortController; clients: number };
const inflight = new Map<string, Job>();
const MAX_CONCURRENT = 10;
const QUEUE_WAIT_MS = 15000;
export const PER_IP_PER_MIN = 60;
let running = 0;
const waiters: (() => void)[] = [];

/** ISOK is never queried automatically, IMGW only matters today: they do not make a result "degraded" */
const DEGRADING = new Set(["OpenMeteo", "Sentinel2", "IUNG", "SoilGrids", "NMT", "BDOT10k", "ULDK"]);
const degraded = (r: AnalysisResult) =>
  r.sources.some((s) => DEGRADING.has(s.id) && (s.status === "missing" || (s.status === "partial" && /limit czasu|nie odpowiedzia|niedostępn/i.test(`${s.detail} ${s.note ?? ""}`))));

async function slot(waitMs: number): Promise<boolean> {
  if (running < MAX_CONCURRENT) {
    running++;
    return true;
  }
  return new Promise((resolve) => {
    const w = () => {
      clearTimeout(t);
      running++;
      resolve(true);
    };
    const t = setTimeout(() => {
      const i = waiters.indexOf(w);
      if (i >= 0) waiters.splice(i, 1);
      resolve(false);
    }, waitMs);
    waiters.push(w);
  });
}
function release() {
  running--;
  const w = waiters.shift();
  if (w) w();
}

const keyOf = (r: AnalysisRequest) => `${r.parcelId ?? r.lonLat?.map((v) => v.toFixed(5)).join(",")}|${r.crop}|${r.date}`;

/** AnalysisError + optional parcel candidates (code "AMBIGUOUS") for a picker in the UI */
export type AnalysisErrorOut = AnalysisError & { candidates?: ParcelCandidate[] };
export type RunOut = { status: number; body: AnalysisResult | AnalysisErrorOut; cached?: boolean; headers?: Record<string, string> };

function cached(key: string): AnalysisResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at >= hit.ttl) {
    cache.delete(key);
    return null;
  }
  return hit.r;
}

function store(key: string, r: AnalysisResult) {
  const e = { at: Date.now(), ttl: degraded(r) ? CACHE_TTL_DEGRADED : CACHE_TTL, r };
  cache.set(key, e);
  if (r.parcel?.id) cache.set(keyOf({ ...r.request, lonLat: undefined, parcelId: r.parcel.id }), e); // alias: map click / text id → resolved id
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

/**
 * Cached result → returned at once (does not count against the rate limit). Otherwise rate limit (per client),
 * in-flight dedupe, a concurrency slot (queue ≤ 15 s), and the analysis. `signal` = client request: when every
 * client waiting for the same job disconnects, the job is aborted.
 */
export async function runAnalysis(req: AnalysisRequest, ctx: { ip?: string; signal?: AbortSignal } = {}): Promise<RunOut> {
  const key = keyOf(req);
  const hit = cached(key);
  if (hit) return { status: 200, body: hit, cached: true };
  if (ctx.ip && rateLimited("an:" + ctx.ip, PER_IP_PER_MIN))
    return { status: 429, body: { error: "rate_limited", messagePl: "Za dużo zapytań. Odczekaj minutę." }, headers: { "Retry-After": "60" } };
  let job = inflight.get(key);
  if (!job) {
    if (!(await slot(QUEUE_WAIT_MS))) return { status: 503, body: { error: "busy", messagePl: "Serwer liczy inne analizy. Spróbuj za kilka sekund." }, headers: { "Retry-After": "5" } };
    const again = cached(key) ?? null; // finished while we waited
    if (again) {
      release();
      return { status: 200, body: again, cached: true };
    }
    const ctrl = new AbortController();
    const p = analyze(req, { signal: ctrl.signal });
    job = { p, ctrl, clients: 0 };
    inflight.set(key, job);
    p.then((r) => {
      if (!ctrl.signal.aborted) store(key, r); // an aborted run (all clients left) is not a real answer
    })
      .catch(() => undefined)
      .finally(() => {
        inflight.delete(key);
        release();
      });
  }
  const j = job;
  j.clients++;
  const leave = () => {
    j.clients--;
    if (j.clients <= 0) j.ctrl.abort();
  };
  ctx.signal?.addEventListener("abort", leave, { once: true });
  try {
    return { status: 200, body: await j.p };
  } catch (e) {
    return failure(e);
  } finally {
    ctx.signal?.removeEventListener("abort", leave);
    if (!ctx.signal?.aborted) j.clients--;
  }
}

function failure(e: unknown): RunOut {
  if (e instanceof AnalysisFailure) {
    const status = e.code === "parcel_not_found" ? 404 : e.code === "parcel_too_large" || e.code === "NOT_AGRICULTURAL" || e.code === "NEEDS_OBREB" ? 422 : e.code === "AMBIGUOUS" ? 409 : 502;
    const body: AnalysisErrorOut = { error: e.code, messagePl: e.messagePl, step: e.step, ...(e.candidates ? { candidates: e.candidates } : {}) };
    return { status, body };
  }
  console.error("analiza failed", e instanceof Error ? e.message : e);
  return { status: 500, body: { error: "internal", messagePl: "Nie udało się wykonać analizy. Spróbuj ponownie za chwilę." } };
}
