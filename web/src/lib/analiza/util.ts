import { netFetch } from "./net";
import type { SourceInfo } from "./types";

export const UA = "TRAKTOR-hackathon/2.0 (parcel water assistant)";

export class UpstreamError extends Error {
  readonly userPl?: string;
  constructor(msg: string, userPl?: string) {
    super(msg);
    this.userPl = userPl; // no parameter property: the engine stays runnable with node --experimental-strip-types
  }
}

/** fetch with timeout, optional retries, and an outer abort signal (global budget). */
export async function fetchT(
  url: string,
  opts: { timeoutMs: number; retries?: number; signal?: AbortSignal; init?: RequestInit } = { timeoutMs: 8000 },
): Promise<Response> {
  const retries = opts.retries ?? 0;
  let last: unknown;
  for (let a = 0; a <= retries; a++) {
    if (opts.signal?.aborted) throw new UpstreamError("aborted");
    try {
      // through the per-request connection gate (Workers: 6 open connections per request); the timeout
      // starts once a slot is granted, the outer signal also aborts the wait
      const res = await netFetch(
        url,
        { ...opts.init, headers: { "User-Agent": UA, ...(opts.init?.headers ?? {}) }, signal: opts.signal, cache: "no-store" },
        { timeoutMs: opts.timeoutMs },
      );
      if (!res.ok) throw new UpstreamError(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      last = e;
      // never retry on rate limit (429) or client errors: it only burns quota
      if (e instanceof UpstreamError && /^HTTP (4\d\d)$/.test(e.message)) break;
    }
  }
  throw last instanceof Error ? last : new UpstreamError(String(last));
}

export const r0 = (n: number) => Math.round(n);
export const r1 = (n: number) => Math.round(n * 10) / 10;
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const nn = <T>(v: T | null | undefined): v is T => v !== null && v !== undefined && !(typeof v === "number" && !Number.isFinite(v));

export function source(
  id: SourceInfo["id"],
  label: string,
  license: string,
  t0: number,
  status: SourceInfo["status"],
  detail: string,
  extra: { url?: string; note?: string } = {},
): SourceInfo {
  return { id, label, detail, status, fetchedAt: new Date().toISOString(), ms: Date.now() - t0, license, ...extra };
}

/** Rejects after ms; used to cap a whole module. */
export function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new UpstreamError(label)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => ymd(new Date(Date.parse(s + "T00:00:00Z") + n * 86400_000));
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400_000);
/** today in Europe/Warsaw as YYYY-MM-DD */
export const todayPL = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
export const shiftYears = (s: string, y: number) => {
  const [Y, M, D] = s.split("-").map(Number);
  const d = M === 2 && D === 29 ? 28 : D;
  return `${Y + y}-${String(M).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};
export const fmtPL = (n: number | null | undefined, d = 0) =>
  n === null || n === undefined || !Number.isFinite(n) ? "b.d." : n.toLocaleString("pl-PL", { maximumFractionDigits: d, minimumFractionDigits: 0 });
