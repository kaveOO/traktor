import type { NextRequest } from "next/server";
import { clientIp, rateLimited } from "@/lib/analiza/ratelimit";
import { getSession, googleKey } from "../_session";

/** { enabled } tells the map whether to offer the Google basemaps. Never returns the key. */
export async function GET(req: NextRequest) {
  void req.url; // request-time handler (the key may be set only at runtime), never prerendered
  if (!googleKey()) return Response.json({ enabled: false, reason: "GOOGLE_MAPS_API_KEY not set" });
  // each call may create a paid Google session: the map asks once per page load
  if (rateLimited("tstat:" + clientIp(req), 30)) return Response.json({ enabled: false, reason: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  try {
    await getSession("roadmap");
    return Response.json({ enabled: true });
  } catch (e) {
    // only the status text ("createSession 403"), never the request URL (it carries the key)
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ enabled: false, reason: msg.replace(/key=[^&\s]+/g, "key=…").slice(0, 120) });
  }
}
