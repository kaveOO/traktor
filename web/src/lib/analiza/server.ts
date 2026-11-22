import { CROPS } from "./crops";
import { inPoland } from "./geo";
import type { AnalysisError, AnalysisRequest, AnalysisResult, CropId, LonLat } from "./types";
import { looksLikeParcelId, normalizeParcelId, type ParcelCandidate } from "./uldk";
import { shiftYears, todayPL } from "./util";
import { analyze, AnalysisFailure } from "./analyze";
import { isWorkers } from "../runtime";

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
const CACHE_TTL = 3600_000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; r: AnalysisResult }>();
const inflight = new Map<string, Promise<AnalysisResult>>();
const MAX_CONCURRENT = 4;
let running = 0;
const waiters: (() => void)[] = [];
const hits = new Map<string, number[]>();

export function rateLimited(ip: string, perMin = 30): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
  return list.length > perMin;
}

/** On Workers trust only CF-Connecting-IP (set by Cloudflare; client copies are overwritten). Limits are per isolate there. */
export const clientIp = (req: Request) =>
  (isWorkers() && req.headers.get("cf-connecting-ip")) ||
  (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";

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
export type RunOut = { status: number; body: AnalysisResult | AnalysisErrorOut; cached?: boolean };

export async function runAnalysis(req: AnalysisRequest): Promise<RunOut> {
  const key = keyOf(req);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return { status: 200, body: hit.r, cached: true };
  const same = inflight.get(key);
  if (same) {
    try {
      return { status: 200, body: await same };
    } catch (e) {
      return failure(e);
    }
  }
  if (!(await slot(4000))) return { status: 503, body: { error: "busy", messagePl: "Serwer liczy inne analizy. Spróbuj za chwilę." } };
  const job = analyze(req);
  inflight.set(key, job);
  try {
    const r = await job;
    cache.set(key, { at: Date.now(), r });
    if (r.parcel?.id && req.lonLat) cache.set(keyOf({ ...req, lonLat: undefined, parcelId: r.parcel.id }), { at: Date.now(), r });
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
    return { status: 200, body: r };
  } catch (e) {
    return failure(e);
  } finally {
    inflight.delete(key);
    release();
  }
}

function failure(e: unknown): RunOut {
  if (e instanceof AnalysisFailure) {
    const status = e.code === "parcel_not_found" ? 404 : e.code === "parcel_too_large" || e.code === "NOT_AGRICULTURAL" ? 422 : e.code === "AMBIGUOUS" ? 409 : 502;
    const body: AnalysisErrorOut = { error: e.code, messagePl: e.messagePl, step: e.step, ...(e.candidates ? { candidates: e.candidates } : {}) };
    return { status, body };
  }
  console.error("analiza failed", e instanceof Error ? e.message : e);
  return { status: 500, body: { error: "internal", messagePl: "Nie udało się wykonać analizy. Spróbuj ponownie za chwilę." } };
}
