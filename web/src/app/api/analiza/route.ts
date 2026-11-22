import { clientIp, rateLimited, runAnalysis, validateRequest } from "@/lib/analiza/server";

export const maxDuration = 30;

const MAX_BODY = 4096;
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });

async function handle(req: Request, input: Record<string, unknown>) {
  if (rateLimited(clientIp(req))) return json({ error: "rate_limited", messagePl: "Za dużo zapytań. Odczekaj minutę." }, 429);
  const v = validateRequest(input);
  if (!v.ok) return json(v.err, 400);
  const out = await runAnalysis(v.req);
  return json(out.body, out.status, out.cached ? { "X-Cache": "HIT" } : {});
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

export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return json({ error: "too_large", messagePl: "Zapytanie jest za duże." }, 413);
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: "too_large", messagePl: "Zapytanie jest za duże." }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad_json", messagePl: "Nieprawidłowe zapytanie (oczekiwany JSON)." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "bad_json", messagePl: "Nieprawidłowe zapytanie." }, 400);
  return handle(req, body as Record<string, unknown>);
}
