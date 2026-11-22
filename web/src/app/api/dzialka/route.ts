import { MAX_AREA_HA } from "@/lib/analiza/analyze";
import { clientIp, rateLimited, validLonLat } from "@/lib/analiza/server";
import { AmbiguousParcel, getParcelById, getParcelByXY, looksLikeParcelId } from "@/lib/analiza/uldk";
import { UpstreamError } from "@/lib/analiza/util";
import { withNetScope } from "@/lib/analiza/net";

export const maxDuration = 20;

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** GET /api/dzialka?id=.. or ?lon=..&lat=.. → Parcel (ULDK, WGS84) */
export function GET(req: Request) {
  // own connection budget per request (ULDK id lookup can fan out to 6 parallel calls; Workers allow 6)
  return withNetScope(() => handle(req));
}

async function handle(req: Request) {
  if (rateLimited("dz:" + clientIp(req), 120)) return json({ error: "rate_limited", messagePl: "Za dużo zapytań. Odczekaj minutę." }, 429);
  const q = new URL(req.url).searchParams;
  const id = q.get("id") ?? q.get("parcelId");
  try {
    if (id) {
      if (id.length > 80 || !looksLikeParcelId(id)) return json({ error: "bad_parcel", messagePl: "Nieprawidłowy numer działki. Przykład: 040307_2.0023.306/2." }, 400);
      const r = await getParcelById(id);
      return json({ ...r.parcel, tooLarge: r.parcel.areaHa > MAX_AREA_HA, matches: r.matches });
    }
    const ll = validLonLat(q.get("lon"), q.get("lat"));
    if (!ll) return json({ error: "bad_point", messagePl: "Podaj numer działki albo punkt (lon, lat) w Polsce." }, 400);
    const r = await getParcelByXY(ll[0], ll[1]);
    return json({ ...r.parcel, tooLarge: r.parcel.areaHa > MAX_AREA_HA, matches: 1 });
  } catch (e) {
    if (e instanceof AmbiguousParcel) return json({ error: "AMBIGUOUS", messagePl: e.userPl, candidates: e.candidates }, 409);
    if (e instanceof UpstreamError && e.message === "need obreb") return json({ error: "NEEDS_OBREB", messagePl: e.userPl }, 422);
    if (e instanceof UpstreamError && e.userPl) return json({ error: e.message === "not found" ? "parcel_not_found" : "uldk_error", messagePl: e.userPl }, e.message === "not found" ? 404 : 502);
    return json({ error: "uldk_error", messagePl: "Nie udało się pobrać działki z ULDK. Spróbuj ponownie." }, 502);
  }
}
