/**
 * Parcel analysis contract (KOWR brief 3.2-3.3). FROZEN: change only on main.
 * Flow: parcel -> crop -> date -> assessment -> causes -> retention -> agrotechnics -> irrigation -> report.
 * Every value carries its source; missing data is explicit (status "missing"), never invented.
 */

export type LonLat = [number, number];

export type CropId =
  | "pszenica_ozima"
  | "jeczmien_jary"
  | "zyto"
  | "rzepak_ozimy"
  | "kukurydza"
  | "ziemniak"
  | "burak_cukrowy"
  | "uzytki_zielone"
  | "warzywa"
  | "sad";

export type AnalysisRequest = {
  /** ULDK parcel id, e.g. "040307_2.0023.306/2"; or lonLat from a map click */
  parcelId?: string;
  lonLat?: LonLat;
  crop: CropId;
  /** analysis date YYYY-MM-DD, today or up to 10 years back */
  date: string;
};

export type SourceStatus = "ok" | "partial" | "missing";

export type SourceInfo = {
  id: "ULDK" | "OpenMeteo" | "IMGW" | "Sentinel2" | "IUNG" | "SoilGrids" | "NMT" | "BDOT10k" | "ISOK" | "EDO";
  label: string;
  /** dataset/period actually used, e.g. "ERA5 2016-11-22..2026-11-22" */
  detail: string;
  status: SourceStatus;
  fetchedAt: string;
  ms: number;
  license: string;
  url?: string;
  note?: string;
};

export type Parcel = {
  id: string;
  teryt: string;
  voivodeship?: string;
  county?: string;
  commune?: string;
  region?: string;
  areaHa: number;
  centroid: LonLat;
  /** WGS84 ring(s) */
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
};

export type Level = "niskie" | "umiarkowane" | "wysokie" | "bardzo_wysokie";

/** 1) Ocena stanu wilgotności */
export type Assessment = {
  /** current water situation at the analysis date */
  currentLevel: Level | null;
  /** historical susceptibility from 10 years */
  historicalLevel: Level | null;
  summaryPl: string;
  meteo: {
    kbw60Mm: number | null; // climatic water balance P - ET0, 60 days to date
    kbw60Percentile: number | null; // 0-100 vs same window in the previous years
    precip30Mm: number | null;
    precip30NormMm: number | null; // mean of the same window over 10 years
    et0_30Mm: number | null;
    etc30Mm: number | null; // crop ET = Kc * ET0
    tmax30MeanC: number | null;
    dryDaysMax: number | null; // longest run of days < 1 mm in last 60 days
    droughtYears: number | null; // of the last 10 seasons, years with KBW below the IUNG threshold in the crop's critical period
    seasons: { year: number; kbwCriticalMm: number; drought: boolean }[];
    /** monthly climatology for the chart: mean deficit P - ETc per month over 10 years */
    monthly: { month: number; pMm: number; etcMm: number }[];
    warnings: { event: string; level: number; validTo: string }[];
  };
  satellite: {
    sceneDate: string | null;
    cloudPct: number | null;
    ndvi: number | null;
    ndmi: number | null;
    ndviNorm: number | null; // median of same window in previous years
    ndmiNorm: number | null;
    anomalyPl: string | null; // crop-aware interpretation
    history: { date: string; ndvi: number | null; ndmi: number | null }[];
  };
  soil: {
    iungCategory: "I" | "II" | "III" | "IV" | null; // drought susceptibility, I = most susceptible
    sandPct: number | null;
    clayPct: number | null;
    socGkg: number | null; // soil organic carbon g/kg
    awcMm: number | null; // plant available water in root zone
    textureClassPl: string | null;
  };
  terrain: {
    elevMin: number | null;
    elevMax: number | null;
    slopePct: number | null; // mean slope over the parcel
    lowPoint: LonLat | null; // lowest sample, candidate for a small pond
    ditchDistM: number | null; // nearest ditch/watercourse
    watercourses: { name: string; kind: "rów" | "ciek" | "kanał"; distM: number }[];
    floodZone: boolean | null; // ISOK
  };
};

/** 2a) Przyczyny */
export type Cause = {
  id: "deficyt_opadow" | "upal" | "niska_retencja_gleby" | "odplyw_powierzchniowy" | "wrazliwa_uprawa" | "stres_roslin";
  titlePl: string;
  evidencePl: string; // with the numbers that triggered it
  weight: 1 | 2 | 3;
  sources: SourceInfo["id"][];
};

/** 2b/2c) Rekomendacje */
export type Recommendation = {
  id: string;
  kind: "retencja" | "agrotechnika" | "nawadnianie";
  titlePl: string;
  whyPl: string; // which cause + data justify it
  howPl: string; // concrete action
  wherePl?: string;
  location?: LonLat;
  priority: 1 | 2 | 3;
  basedOn: Cause["id"][];
  legalPl?: string; // e.g. pozwolenie wodnoprawne
  sources: SourceInfo["id"][];
};

/** 3) Nawadnianie (opcjonalne) */
export type Irrigation = {
  decision: "nie_teraz" | "rozwaz" | "tak";
  deficitMm: number | null; // ETc - P - available soil water, next 7-14 days or season
  doseMm: number | null;
  timingPl: string;
  reasonPl: string;
};

export type Uncertainty = {
  level: "niska" | "średnia" | "wysoka";
  reasonsPl: string[];
  missingPl: string[]; // explicit "brak danych"
  notConsideredPl: string[]; // factors not in the analysis
};

export type AnalysisResult = {
  request: AnalysisRequest;
  generatedAt: string;
  durationMs: number;
  parcel: Parcel;
  crop: { id: CropId; namePl: string };
  assessment: Assessment;
  causes: Cause[];
  recommendations: Recommendation[];
  irrigation: Irrigation | null;
  uncertainty: Uncertainty;
  sources: SourceInfo[];
};

export type AnalysisError = { error: string; messagePl: string; step?: string };
