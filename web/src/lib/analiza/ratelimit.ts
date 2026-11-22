/** Per-client sliding-window rate limit (in memory, per server instance). */
const hits = new Map<string, number[]>();

export function rateLimited(key: string, perMin = 60): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.delete(key);
  hits.set(key, list);
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
  return list.length > perMin;
}

/**
 * Client IP for rate limiting. Prefer headers set by the platform/proxy (Cloudflare first: production runs on Workers);
 * from X-Forwarded-For take only the LAST hop (the one our proxy appended), never the client-supplied first value.
 */
export const clientIp = (req: Request) => {
  const h = req.headers;
  const xff = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return h.get("cf-connecting-ip") || h.get("x-vercel-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || xff[xff.length - 1] || "local";
};
