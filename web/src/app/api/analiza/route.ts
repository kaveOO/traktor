import { clientIp, rateLimited, runAnalysis, validateRequest } from "@/lib/analiza/server";

export const maxDuration = 30;

const MAX_BODY = 4096;
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });

async function handle(req: Request, input: Record<string, unknown>) {
  const ip = clientIp(req);
  // coarse flood guard for invalid requests; the real per-client limit is applied only to uncached analyses
  if (rateLimited("req:" + ip, 300)) return json({ error: "rate_limited", messagePl: "Za dużo zapytań. Odczekaj minutę." }, 429, { "Retry-After": "60" });
  const v = validateRequest(input);
  if (!v.ok) return json(v.err, 400);
  const out = await runAnalysis(v.req, { ip, signal: req.signal });
  return json(out.body, out.status, { ...(out.cached ? { "X-Cache": "HIT" } : {}), ...(out.headers ?? {}) });
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  return handle(req, {
    parcelId: q.get("parcelId") ?? q.get("id") ?? undefined,
    lon: q.get("lon") ?? undefined,
    lat: q.get("lat") ?? undefined,
    crop: q.get("crop") ?? undefined,
    date: q.get("date") ?? undefined,
  });
}

/** reads the body with a byte counter (also for chunked requests without Content-Length) */
async function readCapped(req: Request, max: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) {
    all.set(c, o);
    o += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return json({ error: "too_large", messagePl: "Zapytanie jest za duże." }, 413);
  let body: unknown;
  try {
    const text = await readCapped(req, MAX_BODY);
    if (text === null) return json({ error: "too_large", messagePl: "Zapytanie jest za duże." }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad_json", messagePl: "Nieprawidłowe zapytanie (oczekiwany JSON)." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "bad_json", messagePl: "Nieprawidłowe zapytanie." }, 400);
  return handle(req, body as Record<string, unknown>);
}
