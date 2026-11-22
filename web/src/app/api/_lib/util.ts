import { SCENARIOS, type ScenarioName } from "@/lib/traktor";

/** JSON response helper. Never throws. */
export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

export function isScenario(v: unknown): v is ScenarioName {
  return typeof v === "string" && (SCENARIOS as string[]).includes(v);
}

/** Read a JSON body without throwing. Returns {} on any problem. */
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = (await req.json()) as unknown;
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
