import { getScenario, SCENARIOS } from "@/lib/traktor";
import { isScenario, json } from "../../../_lib/util";

export async function GET(_req: Request, ctx: RouteContext<"/api/traktor/scenario/[name]">) {
  const { name } = await ctx.params;
  if (!isScenario(name)) return json({ error: "Nie znaleziono scenariusza", allowed: SCENARIOS }, 404);
  return json(getScenario(name));
}
