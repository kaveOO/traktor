import { getScenario } from "@/lib/traktor";
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
    return json(await liveConditions(), 200, CACHE);
  } catch {
    const fb = getScenario("drought-aug");
    return json({ ...fb, mode: "fixture", labelPl: "Dane zapisane (brak połączenia)", sources: [...fb.sources, SOURCE_IMGW, SOURCE_OM] });
  }
}
