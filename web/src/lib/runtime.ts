/**
 * Runtime detection + tiny shared cache for code that must run on Node (next start / Vercel) AND on
 * Cloudflare Workers (workerd via OpenNext). Plain TS, no Next imports.
 *
 * Rules for the engine (web/src/lib/analiza/**):
 * - Native addons (`@duckdb/node-api`): only `await import()` them behind `canUseNative()`; never a
 *   top-level import (workerd cannot load .node binaries; the import would also break the bundle).
 * - OS temp-dir / file caches: only behind `canUseFs()`. On Workers use `cacheGet`/`cachePut`
 *   (Cache API, per data centre) on top of the in-memory Map.
 * - In-memory Maps, rate limiters and concurrency gates are per isolate on Workers (many isolates,
 *   evicted at any time): treat them as best-effort, never as a global limit.
 */

/** True inside Cloudflare Workers (workerd sets navigator.userAgent = "Cloudflare-Workers"). */
export function isWorkers(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

const envFlag = (k: string) => typeof process !== "undefined" && process.env?.[k] === "1";

/** Persistent local filesystem (OS temp dir survives between requests). False on Workers (/tmp is per request). */
export function canUseFs(): boolean {
  return !isWorkers() && !envFlag("TRAKTOR_DISABLE_FS_CACHE");
}

/** Native Node addons (DuckDB). Off on Workers or when TRAKTOR_DISABLE_DUCKDB=1. */
export function canUseNative(): boolean {
  return !isWorkers() && !envFlag("TRAKTOR_DISABLE_DUCKDB");
}

/* ---------- Cache API (Workers: caches.default, per data centre; no-op elsewhere) ---------- */

type CfCacheStorage = CacheStorage & { default?: Cache };
const CACHE_ORIGIN = "https://cache.traktor.internal/";

function defaultCache(): Cache | null {
  if (!isWorkers() || typeof caches === "undefined") return null;
  return (caches as CfCacheStorage).default ?? null;
}

const keyUrl = (key: string) => CACHE_ORIGIN + encodeURIComponent(key);

/** JSON value stored under `key` (any string; e.g. the upstream URL) or null. Never throws. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const c = defaultCache();
  if (!c) return null;
  try {
    const res = await c.match(keyUrl(key));
    return res ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Store a JSON value for `ttlSec`. Fire-and-forget safe; never throws. */
export async function cachePut(key: string, value: unknown, ttlSec: number): Promise<void> {
  const c = defaultCache();
  if (!c) return;
  try {
    await c.put(
      keyUrl(key),
      new Response(JSON.stringify(value), {
        headers: { "content-type": "application/json", "cache-control": `public, max-age=${Math.max(1, Math.floor(ttlSec))}` },
      }),
    );
  } catch {
    /* cache is best-effort */
  }
}
