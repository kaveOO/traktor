import { CRESTS, decideOrder, getScenario, sites, type Conditions, type CrestHeight } from "@/lib/traktor";
import { liveConditions } from "../../_lib/conditions";
import { isNum, isScenario, json, readBody } from "../../_lib/util";

function validConditions(v: unknown): v is Conditions {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    isNum(c.month) &&
    isNum(c.kbw60Mm) &&
    isNum(c.precip72hMm) &&
    isNum(c.precip7dMm) &&
    isNum(c.et0Mm) &&
    Array.isArray(c.warnings) &&
    c.warnings.every((w) => w && typeof w === "object" && typeof (w as Record<string, unknown>).event === "string")
  );
}

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    let c: Conditions;
    if (validConditions(body.conditions)) {
      const raw = body.conditions;
      c = { ...raw, sources: Array.isArray(raw.sources) ? raw.sources : [], labelPl: String(raw.labelPl ?? "Warunki z zapytania") };
    } else if (body.scenario === "live") {
      c = await liveConditions();
    } else {
      c = getScenario(isScenario(body.scenario) ? body.scenario : "drought-aug");
    }
    const ids = Array.isArray(body.siteIds) ? new Set(body.siteIds.map(String)) : null;
    const crest = CRESTS.includes(body.crestCm as CrestHeight) ? (body.crestCm as CrestHeight) : null;
    const list = sites.filter((s) => s.status === "accepted" && (!ids || ids.has(s.id)));
    const orders = list.map((s) => {
      // only use the requested crest if it is accepted for this site
      const ok = crest && s.crests.find((k) => k.heightCm === crest)?.status === "accepted" ? crest : s.maxAcceptedCrestCm;
      return decideOrder(s, c, ok);
    });
    return json(orders);
  } catch {
    return json({ error: "Nie udało się wyliczyć poleceń" }, 500);
  }
}
