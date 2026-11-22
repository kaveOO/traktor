import type { NextRequest } from "next/server";
import { getSession, googleKey, type GoogleMapType } from "../../../../_session";

/** Tile proxy: /api/tiles/google/{roadmap|satellite}/{z}/{x}/{y}. Keeps the key server-side. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/tiles/google/[type]/[z]/[x]/[y]">) {
  const { type, z, x, y } = await ctx.params;
  if (!googleKey()) return Response.json({ error: "GOOGLE_MAPS_API_KEY not set" }, { status: 404 });
  if (type !== "roadmap" && type !== "satellite") return Response.json({ error: "bad type" }, { status: 400 });
  if (![z, x, y].every((v) => /^\d+$/.test(v))) return Response.json({ error: "bad tile" }, { status: 400 });
  const [Z, X, Y] = [z, x, y].map(Number);
  if (Z > 20 || X >= 2 ** Z || Y >= 2 ** Z) return Response.json({ error: "bad tile" }, { status: 400 });
  // only our own pages may use the proxy (protects the paid quota)
  if (req.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403 });
  try {
    const session = await getSession(type as GoogleMapType);
    const res = await fetch(
      `https://tile.googleapis.com/v1/2dtiles/${z}/${x}/${y}?session=${session}&key=${encodeURIComponent(googleKey())}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return Response.json({ error: `tile ${res.status}` }, { status: 502 });
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return Response.json({ error: "google tiles unavailable" }, { status: 502 });
  }
}
