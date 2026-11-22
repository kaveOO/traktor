import type { Level, SourceInfo, Uncertainty, Irrigation, Recommendation } from "@/lib/analiza";

export const NA = "brak danych";

/** Polish number, fixed decimals; null -> "brak danych". */
export function n(v: number | null | undefined, digits = 0, unit = ""): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NA;
  const s = v.toLocaleString("pl-PL", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return unit ? `${s} ${unit}` : s;
}

export function signed(v: number | null | undefined, digits = 0, unit = ""): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return NA;
  const s = n(Math.abs(v), digits, unit);
  return v < 0 ? `−${s}` : v > 0 ? `+${s}` : s;
}

export function dateLong(iso: string | null | undefined): string {
  if (!iso) return NA;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return NA;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const LEVEL_PL: Record<Level, string> = {
  niskie: "niskie",
  umiarkowane: "umiarkowane",
  wysokie: "wysokie",
  bardzo_wysokie: "bardzo wysokie",
};
export const LEVEL_RANK: Record<Level, number> = { niskie: 1, umiarkowane: 2, wysokie: 3, bardzo_wysokie: 4 };

export const UNC_RANK: Record<Uncertainty["level"], number> = { niska: 1, średnia: 2, wysoka: 3 };

export const STATUS_PL: Record<SourceInfo["status"], string> = { ok: "pełne", partial: "częściowe", missing: "brak" };

export const DECISION_PL: Record<Irrigation["decision"], string> = {
  nie_teraz: "Nie teraz",
  rozwaz: "Rozważ nawadnianie",
  tak: "Nawadniaj",
};

export const PRIORITY_PL: Record<Recommendation["priority"], string> = {
  1: "Priorytet 1 · najpierw",
  2: "Priorytet 2",
  3: "Priorytet 3 · gdy możliwe",
};

export const MONTHS_PL = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];

export function monthsRange(months: number[]): string {
  if (!months.length) return NA;
  const names = months.map((m) => MONTHS_PL[m - 1]);
  return names.length === 1 ? names[0] : `${names[0]}–${names[names.length - 1]}`;
}

/**
 * Exact attribution texts from docs/review/03-licences.md. Shown only for sources present in the result.
 * GUGiK sources share one line. The report uses no map tiles, so no OSM line.
 */
export const GUGIK_ATTR = "Dane: GUGiK (ULDK, NMT, BDOT10k)";
export function attributionFor(id: SourceInfo["id"], year: number): string | null {
  switch (id) {
    case "IMGW":
      return "Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy (dane przetworzone)";
    case "OpenMeteo":
      return "Open-Meteo.com, CC BY 4.0";
    case "Sentinel2":
      return `Contains modified Copernicus Sentinel data ${year}`;
    case "SoilGrids":
      return "SoilGrids 2.0, ISRIC, CC BY 4.0";
    case "ULDK":
    case "NMT":
    case "BDOT10k":
      return GUGIK_ATTR;
    case "IUNG":
      return "IUNG-PIB, mapa podatności gleb na suszę";
    default:
      return null;
  }
}
export const ATTR_URL: Partial<Record<SourceInfo["id"], string>> = { OpenMeteo: "https://open-meteo.com" };

export const LLM_LABEL = "Tekst przeredagowany przez model językowy; liczby z analizy";

/** Method limits always stated (science review). */
export const METHOD_LIMITS = [
  "Pogoda z reanalizy ERA5 (Open-Meteo) ma charakter regionalny (siatka ok. 10–30 km), nie opisuje pojedynczego pola.",
  "Progi suszy SMSR (IUNG) stosujemy do bilansu liczonego z ET₀ Open-Meteo. IUNG liczy KBW inną metodą, więc ocena suszy jest przybliżona.",
];

export const SCREENING_NOTE = "Rekomendacje mają charakter przesiewowy; przed inwestycją wymagana wizja lokalna.";
