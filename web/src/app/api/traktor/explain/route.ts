import { CRESTS, FEATURED_SITE_ID, getScenario, getSite, type Conditions, type CrestHeight } from "@/lib/traktor";
import { liveConditions } from "../../_lib/conditions";
import { llmRewrite, templateText } from "../../_lib/explain";
import { isScenario, json, readBody } from "../../_lib/util";

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const siteId = typeof body.siteId === "string" ? body.siteId : FEATURED_SITE_ID;
    const site = getSite(siteId);
    if (!site) return json({ error: "Nie znaleziono miejsca", siteId }, 404);
    const crestCm = (CRESTS.includes(Number(body.crestCm) as CrestHeight)
      ? Number(body.crestCm)
      : (site.maxAcceptedCrestCm ?? 20)) as CrestHeight;
    let c: Conditions;
    if (body.scenario === "live") c = await liveConditions();
    else c = getScenario(isScenario(body.scenario) ? body.scenario : "drought-aug");

    const template = templateText(site, crestCm, c);
    const key = process.env.ANTHROPIC_API_KEY;
    if (key) {
      const llm = await llmRewrite(template, key);
      if (llm) return json({ textPl: llm, source: "llm" });
    }
    return json({ textPl: template, source: "template" });
  } catch {
    return json({ textPl: "Wymaga wizji lokalnej.", source: "template" });
  }
}
