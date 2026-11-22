import type { Conditions, CrestHeight, Order, Range, Site } from "./types";

/** Thresholds: "do kalibracji" (to be calibrated). Shown in the "Dlaczego?" drawer. */
export const THRESHOLDS = {
  version: "v0-demo",
  stormWarningLevel: 2,
  rain72hMm: 30,
  droughtKbwMm: -50,
  holdMonths: [4, 5, 6, 7, 8, 9],
  springMonths: [3, 4],
  springPrecip7dMm: 20,
};

const fmtDeadline = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { weekday: "long", hour: "2-digit", minute: "2-digit" });

/** Pure order engine: first matching rule wins. Runs on server and client (instant scenario flip). */
export function decideOrder(site: Site, c: Conditions, crestCm?: CrestHeight | null): Order {
  const crest = site.crests.find((k) => k.heightCm === (crestCm ?? site.maxAcceptedCrestCm));
  const capacity: Range | undefined = crest?.storageM3;
  const expiresAt = new Date(Date.now() + 24 * 3600_000).toISOString();
  const base = { siteId: site.id, operatorPl: "Właściciel zastawki / spółka wodna (do potwierdzenia)", expiresAt };
  const inputs = {
    "KBW 60 dni [mm]": c.kbw60Mm,
    "Opad 72 h [mm]": c.precip72hMm,
    "Opad 7 dni [mm]": c.precip7dMm,
    "ET₀ [mm/d]": c.et0Mm,
    Miesiąc: c.month,
    Ostrzeżenia: c.warnings.length ? c.warnings.map((w) => `${w.event} st. ${w.level}`).join("; ") : "brak",
  };

  const storm = c.warnings.find((w) => w.kind === "meteo" && w.level >= THRESHOLDS.stormWarningLevel);
  const heavyRain = c.precip72hMm >= THRESHOLDS.rain72hMm;

  if (storm || heavyRain) {
    if (site.downstreamSensitive) {
      return {
        ...base,
        action: "NIE_RUSZAJ",
        ruleId: "R0-downstream",
        consult: true,
        reasons: [
          storm ? `IMGW: ${storm.event}, stopień ${storm.level}.` : `Prognoza ${c.precip72hMm} mm w 72 h.`,
          "Poniżej zastawki jest droga lub zabudowa. Skonsultuj otwarcie ze spółką wodną.",
        ],
        inputs,
      };
    }
    const deadlineIso = storm
      ? new Date(new Date(storm.validFrom).getTime() - 12 * 3600_000).toISOString()
      : new Date(Date.now() + 24 * 3600_000).toISOString();
    return {
      ...base,
      action: "OTWORZ",
      ruleId: storm ? "R1-storm-warning" : "R2-forecast-rain",
      reasons: [
        storm
          ? `IMGW: ${storm.event}, stopień ${storm.level} dla powiatu ${storm.powiat}.`
          : `Prognoza ${c.precip72hMm} mm w 72 h (próg ${THRESHOLDS.rain72hMm} mm).`,
        `Otwórz do: ${fmtDeadline(deadlineIso)}, aby zwolnić pojemność rowu.`,
      ],
      deadline: deadlineIso,
      capacityFreedM3: capacity,
      inputs,
    };
  }

  if (c.kbw60Mm <= THRESHOLDS.droughtKbwMm && THRESHOLDS.holdMonths.includes(c.month)) {
    return {
      ...base,
      action: "TRZYMAJ",
      ruleId: "R4-drought-hold",
      reasons: [
        `KBW ${c.kbw60Mm} mm w 60 dni (próg ${THRESHOLDS.droughtKbwMm} mm).`,
        `Prognoza ${c.precip7dMm} mm w 7 dni. Brak ostrzeżeń.`,
        `Gleba kat. ${site.soilCategory} (IUNG).`,
      ],
      inputs,
    };
  }

  if (THRESHOLDS.springMonths.includes(c.month) && c.precip7dMm < THRESHOLDS.springPrecip7dMm) {
    return {
      ...base,
      action: "TRZYMAJ",
      ruleId: "R5-spring-hold",
      reasons: ["Wiosna: zatrzymaj nadwyżkę wody na lato.", `Prognoza ${c.precip7dMm} mm w 7 dni. Brak ostrzeżeń.`],
      inputs,
    };
  }

  return { ...base, action: "NIE_RUSZAJ", ruleId: "R9-neutral", reasons: ["Warunki neutralne."], inputs };
}

/** Days of buffer = stored mm over the band / daily ET0. */
export function bufferDays(storageMm: Range, et0Mm: number): Range | null {
  if (et0Mm < 0.5) return null; // show "> 60 dni"
  return [Math.max(1, Math.round(storageMm[0] / et0Mm)), Math.max(1, Math.round(storageMm[1] / et0Mm))];
}

export const fmtRange = (r: Range, unit = "") =>
  `${r[0].toLocaleString("pl-PL")}–${r[1].toLocaleString("pl-PL")}${unit ? ` ${unit}` : ""}`;
