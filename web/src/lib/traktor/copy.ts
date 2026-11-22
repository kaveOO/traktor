import type { CrestHeight, RefusalCode } from "./types";

/** Polish copy. Tone: short, plain, sure. TRZYMAJ / OTWÓRZ never translated. */

export const GMINA = {
  name: "Okolice Bydgoszczy · Białe Błota i Sicienko",
  short: "Białe Błota / Sicienko",
  powiat: "bydgoski",
  powiatTeryt: "0403",
  voivodeship: "kujawsko-pomorskie",
  center: { lat: 53.157, lon: 17.818 },
};

export const DEMO_NOTE =
  "Dane rzeczywiste: BDOT10k, NMT 1 m, ULDK (GUGiK). Retencja, hektary i dni zapasu to wstępne szacunki.";

export const SOURCES_MAP = "BDOT10k (rowy, cieki, drogi, budynki, pokrycie terenu); NMT 1 m (GUGiK); ULDK";

export const REFUSAL_LABEL: Record<RefusalCode, string> = {
  ROAD_OR_CULVERT: "Droga lub przepust",
  BUILDING: "Blisko budynku",
  FLOOD_ZONE: "Blisko rzeki lub kanału",
  CHANNEL_UNRESOLVED: "Rów niewidoczny w NMT",
  OUT_OF_BANK_NEIGHBOUR: "Woda na działce sąsiada",
  SLOPE_TOO_STEEP: "Za duży spadek",
};

/** The refusal rule behind each code (thresholds from scripts/geo/build.mjs). */
export const REFUSAL_RULE: Record<RefusalCode, string> = {
  CHANNEL_UNRESOLVED: "Rów płytszy niż 0,3 m w NMT 1 m. Nie zgadujemy.",
  ROAD_OR_CULVERT: "Droga bliżej niż 20 m.",
  BUILDING: "Budynek bliżej niż 60 m.",
  FLOOD_ZONE: "Rzeka lub kanał bliżej niż 80 m albo punkt w wodzie.",
  SLOPE_TOO_STEEP: "Spadek dna ponad 0,6%.",
  OUT_OF_BANK_NEIGHBOUR: "Rów płytszy niż 0,4 m. Woda wyjdzie na działkę sąsiada.",
};

/** Polish plural: 1 miejsce, 2–4 miejsca, 5+ miejsc (12–14 → miejsc). */
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}
export const miejsc = (n: number) => plural(n, "miejsce", "miejsca", "miejsc");

export const CRESTS: CrestHeight[] = [20, 30, 40, 50, 60];

export const TAGLINE_PL = "Niech ziemia zatrzyma swoją wodę.";
export const TAGLINE_EN = "Let the land hold its water.";

export const LEGAL = {
  permit: "Zastawka wymaga pozwolenia wodnoprawnego (art. 389 pkt 6 Prawa wodnego).",
  lighter: "Lżejsza ścieżka (art. 395) obejmuje tylko wybrane prace bez urządzenia piętrzącego.",
  maintenance: "Utrzymanie rowu: właściciel gruntu lub spółka wodna (art. 205).",
  siteVisit: "Wymaga wizji lokalnej.",
};

export const FACTS = {
  drainedHa: "6,4 mln ha",
  outflow: "−30,5% odpływu (~71 mm)",
  nitrate: "−33,6% azotanów",
  storage: "retencja rowu 23% → 41%",
  kowrHa: "1,324 mln ha",
  droughtGminas: "394 gminy (16%) z suszą w 2025",
};
