/**
 * Google Map Tiles API (2D tiles) session cache. Server-only: the API key never reaches the browser.
 * Needs GOOGLE_MAPS_API_KEY in web/.env.local and "Map Tiles API" enabled in the Google Cloud project.
 */
export type GoogleMapType = "roadmap" | "satellite";

const sessions = new Map<GoogleMapType, { session: string; expiry: number }>();

export const googleKey = () => process.env.GOOGLE_MAPS_API_KEY ?? "";

export async function getSession(type: GoogleMapType): Promise<string> {
  const hit = sessions.get(type);
  if (hit && hit.expiry - 3600_000 > Date.now()) return hit.session;
  const res = await fetch(`https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(googleKey())}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mapType: type, language: "pl-PL", region: "PL", ...(type === "satellite" ? {} : { scale: "scaleFactor1x" }) }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`createSession ${res.status}`);
  const j = (await res.json()) as { session: string; expiry: string };
  sessions.set(type, { session: j.session, expiry: Number(j.expiry) * 1000 });
  return j.session;
}
