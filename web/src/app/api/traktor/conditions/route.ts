import { getScenario } from "@/lib/traktor";
import { clientIp, rateLimited } from "@/lib/analiza/ratelimit";
import { liveConditions, SOURCE_IMGW, SOURCE_OM } from "../../_lib/conditions";
import { isScenario, json } from "../../_lib/util";

const CACHE = { "Cache-Control": "s-maxage=1800" };

export async function GET(req: Request) {
  try {
    const scenario = new URL(req.url).searchParams.get("scenario") ?? "live";
    if (isScenario(scenario)) return json(getScenario(scenario), 200, CACHE);
    if (scenario !== "live") {
      return json({ error: "Nieznany scenariusz", allowed: ["live", "drought-aug", "storm-warning", "spring-wet"] }, 400);
    }
    // live mode calls Open-Meteo + IMGW on every request: cap per client (the map asks once per view)
    if (rateLimited("cond:" + clientIp(req), 30))
      return json({ error: "rate_limited", messagePl: "Za dużo zapytań. Odczekaj minutę." }, 429, { "Retry-After": "60" });
    return json(await liveConditions(), 200, CACHE);
  } catch {
    const fb = getScenario("drought-aug");
    return json({ ...fb, mode: "fixture", labelPl: "Dane zapisane (brak połączenia)", sources: [...fb.sources, SOURCE_IMGW, SOURCE_OM] });
  }
}
