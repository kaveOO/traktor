/**
 * Outbound HTTP gate for the engine. Cloudflare Workers allow 6 simultaneous open connections per
 * incoming request; extra fetches queue in the runtime and, when it suspects a deadlock, it cancels the
 * least recently used connection (that is what broke Sentinel-2 COG reads on Workers). So every engine
 * fetch goes through `netFetch`, which:
 * - holds a slot from a per-request gate (Workers: 6 total, of which Sentinel-2 may use at most 4, so
 *   ULDK/meteo/soil/terrain/OSM always keep 2 slots; Node: generous limits that only stop runaway fan-out),
 * - reads the whole body while holding the slot (a connection stays open until its body is consumed),
 *   then returns an in-memory Response,
 * - starts the per-call timeout only after the slot is granted (queue time does not eat the timeout;
 *   the caller's outer signal still aborts the wait).
 * Per-request scope: `withNetScope()` (AsyncLocalStorage that Next/OpenNext put on globalThis). Outside a
 * scope (plain Node scripts) one module-wide gate is used.
 * Plain TS, no Next or node: imports.
 */
import { isWorkers } from "../runtime";

class Gate {
  private n = 0;
  private q: (() => void)[] = [];
  readonly max: number;
  constructor(max: number) {
    this.max = max;
  }

  acquire(signal?: AbortSignal | null): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(abortError(signal));
    if (this.n < this.max) {
      this.n++;
      return Promise.resolve(this.releaser());
    }
    return new Promise((resolve, reject) => {
      const go = () => {
        signal?.removeEventListener("abort", onAbort);
        this.n++;
        resolve(this.releaser());
      };
      const onAbort = () => {
        const i = this.q.indexOf(go);
        if (i >= 0) this.q.splice(i, 1);
        reject(abortError(signal!));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.q.push(go);
    });
  }

  private releaser(): () => void {
    let done = false;
    return () => {
      if (done) return;
      done = true;
      this.n--;
      this.q.shift()?.();
    };
  }
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new Error("aborted");
}

type Gates = { all: Gate; sat: Gate };

const envInt = (k: string) => {
  const v = typeof process !== "undefined" ? Number(process.env?.[k]) : NaN;
  return Number.isInteger(v) && v > 0 ? v : null;
};

/** Workers: 6 connections per request (platform limit), Sentinel-2 ≤ 4 of them. Node: high caps. */
export function netLimits(): { all: number; sat: number } {
  const w = isWorkers();
  const all = envInt("TRAKTOR_NET_MAX") ?? (w ? 6 : 48);
  const sat = Math.min(all, envInt("TRAKTOR_SAT_NET_MAX") ?? (w ? 4 : 24));
  return { all, sat };
}

const newGates = (): Gates => {
  const l = netLimits();
  return { all: new Gate(l.all), sat: new Gate(l.sat) };
};

type Als<T> = { run<R>(store: T, fn: () => R): R; getStore(): T | undefined };
let als: Als<Gates> | null | undefined;
function scopeStore(): Als<Gates> | null {
  if (als === undefined) {
    const C = (globalThis as { AsyncLocalStorage?: new () => Als<Gates> }).AsyncLocalStorage;
    als = typeof C === "function" ? new C() : null;
  }
  return als;
}
let shared: Gates | null = null;
const gates = (): Gates => scopeStore()?.getStore() ?? (shared ??= newGates());

/** Run `fn` with its own connection budget (one per incoming request / analysis). */
export function withNetScope<T>(fn: () => Promise<T>): Promise<T> {
  const s = scopeStore();
  return s ? s.run(newGates(), fn) : fn();
}

export type NetOpts = { timeoutMs?: number; lane?: "sat" };

/** fetch through the gate; the returned Response is fully buffered (body already read). */
export async function netFetch(url: string, init: RequestInit = {}, o: NetOpts = {}): Promise<Response> {
  const g = gates();
  const outer = init.signal ?? undefined;
  const relSat = o.lane === "sat" ? await g.sat.acquire(outer) : null;
  let rel: (() => void) | null = null;
  try {
    rel = await g.all.acquire(outer);
    const t = o.timeoutMs ? AbortSignal.timeout(o.timeoutMs) : null;
    const signal = t && outer ? AbortSignal.any([outer, t]) : (t ?? outer);
    const res = await fetch(url, { ...init, signal });
    const empty = res.status === 204 || res.status === 304 || (init.method ?? "GET").toUpperCase() === "HEAD";
    const body = empty ? null : await res.arrayBuffer();
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
  } finally {
    rel?.();
    relSat?.();
  }
}

/** Short, secret-free error text for logs (drops query strings, e.g. SAS tokens). */
export function errText(e: unknown): string {
  const m = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return m.replace(/\?[^\s"')]*/g, "?…").slice(0, 160);
}
