import type { NextRequest } from "next/server";
import { getSession, googleKey } from "../_session";

/** { enabled } tells the map whether to offer the Google basemaps. Never returns the key. */
export async function GET(req: NextRequest) {
  void req.url;
  if (!googleKey()) return Response.json({ enabled: false, reason: "GOOGLE_MAPS_API_KEY not set" });
  try {
    await getSession("roadmap");
    return Response.json({ enabled: true });
  } catch (e) {
    return Response.json({ enabled: false, reason: String(e).slice(0, 120) });
  }
}
