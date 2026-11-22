import { CROPS, type AnalysisResult, type Level, type SourceInfo, type Uncertainty, type Irrigation, type Recommendation } from "@/lib/analiza";

export const NA = "brak danych";
export const TZ = "Europe/Warsaw";

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

/** Date-only strings are read at noon UTC, so they stay on the same calendar day in Warsaw. */
const toDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);

export function dateLong(iso: string | null | undefined): string {
  if (!iso) return NA;
  const d = toDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return NA;
  const d = toDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });
}

/** Date and time in Polish time (Europe/Warsaw). `suffix` adds "czasu PL" so a PDF reads the same everywhere. */
export function dateTime(iso: string | null | undefined, suffix = false): string {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const s = d.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return suffix ? `${s} czasu PL` : s;
}

/** Polish crop name with diacritics from CROPS (the result may carry an older ASCII name). */
export const cropName = (r: Pick<AnalysisResult, "crop">) => CROPS.find((c) => c.id === r.crop.id)?.namePl ?? r.crop.namePl;

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

/* ---------- Attribution ---------- */

export const OSM_ATTR = "© autorzy OpenStreetMap, ODbL";
export const OSM_URL = "https://www.openstreetmap.org/copyright";
const isOsm = (x: SourceInfo) => /openstreetmap/i.test(`${x.label} ${x.license}`);
const mentionsPower = (x: SourceInfo) => /nasa\s*power/i.test(`${x.label} ${x.detail} ${x.license} ${x.note ?? ""}`);

/**
 * Licence / attribution text for one source. The engine's `license` is authoritative;
 * fixed texts only fill gaps. OSM-based sources always print the ODbL notice; NASA POWER is credited when used.
 */
export function attributionOf(x: SourceInfo): string {
  if (isOsm(x)) return OSM_ATTR;
  let t = (x.license ?? "").trim();
  if (!t) t = FALLBACK_ATTR[x.id] ?? "";
  if (mentionsPower(x) && !/nasa/i.test(t)) t = t ? `NASA POWER Project, NASA LaRC; ${t}` : "NASA POWER Project, NASA LaRC";
  return t;
}
export const attributionUrl = (x: SourceInfo) => (isOsm(x) ? OSM_URL : x.url);

const FALLBACK_ATTR: Partial<Record<SourceInfo["id"], string>> = {
  IMGW: "Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy (dane przetworzone)",
  OpenMeteo: "Open-Meteo.com, CC BY 4.0",
  Sentinel2: "Contains modified Copernicus Sentinel data",
  SoilGrids: "SoilGrids 2.0, ISRIC, CC BY 4.0",
  ULDK: "Dane: GUGiK (ULDK)",
  NMT: "Dane: GUGiK (NMT)",
  BDOT10k: "Dane: GUGiK (BDOT10k)",
  IUNG: "IUNG-PIB, mapa podatności gleb na suszę",
};

/** Short tag for a source row; the watercourse source may come from OpenStreetMap under the BDOT10k id. */
export const srcTag = (x: SourceInfo | undefined, fallback: string) => (x && isOsm(x) ? "OSM" : fallback);

export const LLM_LABEL = "Tekst przeredagowany przez model językowy; liczby z analizy";

/** Method limits always stated (science review). */
export const METHOD_LIMITS = [
  "Pogoda: NASA POWER (siatka ok. 0,5°) i Open-Meteo dla ostatnich dni. To dane regionalne, nie pomiar na tym polu.",
];
export const METEO_SOURCE = "NASA POWER (siatka ok. 0,5°) + Open-Meteo dla ostatnich dni";

export const SCREENING_NOTE = "Rekomendacje mają charakter przesiewowy; przed inwestycją wymagana wizja lokalna.";

/* ---------- KBW threshold ---------- */

type Season = AnalysisResult["assessment"]["meteo"]["seasons"][number] & { thresholdMm?: number | null };
export type KbwThreshold = {
  /** seasons oldest → newest */
  seasons: Season[];
  /** one line for all seasons, or null */
  line: number | null;
  /** per-bar thresholds when they differ between seasons */
  perSeason: (number | null)[] | null;
  /** what the line is, for labels */
  kind: "smsr" | "iung" | null;
  /** a threshold existed but contradicted the engine's drought flags, so it is not drawn */
  dropped: boolean;
};

/**
 * Threshold the engine used: per-season `thresholdMm` → `smsrThresholdMm` (result or meteo) → crops.iungKbw fallback.
 * A single line is drawn only if it agrees with every season's drought flag.
 */
export function kbwThreshold(r: AnalysisResult): KbwThreshold {
  const m = r.assessment.meteo as AnalysisResult["assessment"]["meteo"] & { smsrThresholdMm?: number | null };
  const seasons = [...(m.seasons as Season[])].sort((a, b) => a.year - b.year);
  const per = seasons.map((s) => (typeof s.thresholdMm === "number" ? s.thresholdMm : null));
  if (per.some((v) => v !== null)) {
    const vals = per.filter((v): v is number => v !== null);
    const same = vals.every((v) => v === vals[0]) && vals.length === per.length;
    return same ? { seasons, line: vals[0], perSeason: null, kind: "smsr", dropped: false } : { seasons, line: null, perSeason: per, kind: "smsr", dropped: false };
  }
  const smsr = (r as AnalysisResult & { smsrThresholdMm?: number | null }).smsrThresholdMm ?? m.smsrThresholdMm;
  let line: number | null = typeof smsr === "number" ? smsr : null;
  let kind: KbwThreshold["kind"] = line !== null ? "smsr" : null;
  if (line === null) {
    const crop = CROPS.find((c) => c.id === r.crop.id);
    const cat = r.assessment.soil.iungCategory;
    const i = cat ? ["I", "II", "III", "IV"].indexOf(cat) : -1;
    if (crop && i >= 0) {
      line = crop.iungKbw[i];
      kind = "iung";
    }
  }
  if (line === null) return { seasons, line: null, perSeason: null, kind: null, dropped: false };
  const contradicts = seasons.some((s) => (s.drought ? s.kbwCriticalMm > line! : s.kbwCriticalMm < line!));
  return contradicts ? { seasons, line: null, perSeason: null, kind, dropped: true } : { seasons, line, perSeason: null, kind, dropped: false };
}
