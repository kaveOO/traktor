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
  "Dane rzeczywiste: BDOT10k, NMT 1 m i ULDK (GUGiK). Retencja i nawodnienie to szacunki przesiewowe.";

export const SOURCES_MAP = "BDOT10k (rowy, cieki, drogi, budynki, pokrycie terenu); NMT 1 m (GUGiK); ULDK";

export const REFUSAL_LABEL: Record<RefusalCode, string> = {
  ROAD_OR_CULVERT: "Droga lub przepust",
  BUILDING: "Budynek w pobliżu",
  FLOOD_ZONE: "Blisko rzeki lub kanału",
  CHANNEL_UNRESOLVED: "Rów niewidoczny w NMT",
  OUT_OF_BANK_NEIGHBOUR: "Woda na działce sąsiada",
  SLOPE_TOO_STEEP: "Za duży spadek",
};

export const CRESTS: CrestHeight[] = [20, 30, 40, 50, 60];

export const TAGLINE_PL = "Niech ziemia zatrzyma swoją wodę.";
export const TAGLINE_EN = "Let the land hold its water.";

export const LEGAL = {
  permit: "Zastawka (piętrzenie) wymaga pozwolenia wodnoprawnego: art. 389 pkt 6 Prawa wodnego.",
  lighter: "Lżejsza ścieżka (art. 395) dotyczy tylko wybranych zmian retencyjnych bez urządzenia piętrzącego.",
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
