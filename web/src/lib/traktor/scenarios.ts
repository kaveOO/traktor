import type { Conditions, ScenarioName } from "./types";
import { GMINA } from "./copy";

/** Recorded demo scenarios. Always labelled as scenarios in the UI, never presented as live data. */
const now = () => new Date();
const inHours = (h: number) => new Date(now().getTime() + h * 3600_000).toISOString();

export const SCENARIO_LABEL: Record<ScenarioName, string> = {
  "drought-aug": "Susza · sierpień",
  "storm-warning": "Ostrzeżenie burzowe",
  "spring-wet": "Mokra wiosna",
};

export function getScenario(name: ScenarioName): Conditions {
  const base = {
    mode: "scenario" as const,
    scenario: name,
    labelPl: `Scenariusz demonstracyjny: ${SCENARIO_LABEL[name]}`,
    asOf: now().toISOString(),
    sources: ["IMGW-PIB (nagranie)", "Open-Meteo (nagranie)"],
  };
  switch (name) {
    case "drought-aug":
      return { ...base, month: 8, kbw60Mm: -86, precip72hMm: 1, precip7dMm: 3, et0Mm: 4.2, warnings: [] };
    case "storm-warning":
      return {
        ...base,
        month: 8,
        kbw60Mm: -71,
        precip72hMm: 42,
        precip7dMm: 47,
        et0Mm: 3.1,
        warnings: [
          {
            kind: "meteo",
            event: "Intensywne opady deszczu z burzami",
            level: 2,
            powiat: GMINA.powiat,
            validFrom: inHours(30),
            validTo: inHours(54),
          },
        ],
      };
    case "spring-wet":
      return { ...base, month: 3, kbw60Mm: 34, precip72hMm: 6, precip7dMm: 14, et0Mm: 1.2, warnings: [] };
  }
}

export const SCENARIOS: ScenarioName[] = ["drought-aug", "storm-warning", "spring-wet"];
