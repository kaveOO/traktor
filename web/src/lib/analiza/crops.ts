import type { CropId } from "./types";

/**
 * Crop table. Kc after FAO-56 (Allen et al.), simplified to monthly values for Polish conditions.
 * critical = months of the highest sensitivity to water stress (IUNG SMSR uses crop-specific periods).
 * IUNG drought thresholds (KBW, mm) per soil category I-IV are approximations of the published
 * SMSR thresholds; marked "do kalibracji" in the UI.
 */
export type Crop = {
  id: CropId;
  namePl: string;
  /** Kc per month, index 0 = January */
  kc: number[];
  critical: number[]; // months 1-12
  rootDepthM: number;
  /** FAO-56 Table 22 depletion fraction p (readily available water = p * TAW) */
  p: number;
  /** KBW threshold (mm, 60 days) below which drought is declared, per soil category I..IV */
  iungKbw: [number, number, number, number];
  /** how to read NDVI in the critical window (typical healthy NDVI) */
  ndviHealthy: number;
  /**
   * Phenology (Polish calendar, typical dates). From `ripeningFrom` (MM-DD) until `phaseEndsAt` the crop is ripening
   * or already harvested: falling NDVI is natural, irrigation and field checks for water stress make no sense.
   * Optional: crops without a ripening phase (grassland, orchard, vegetables) leave it out.
   */
  ripeningFrom?: string;
  /** typical harvest months (1-12) */
  harvestMonths?: number[];
  /** MM-DD when the post-harvest phase ends (next sowing of a winter crop); default = 12-31 */
  phaseEndsAt?: string;
  /** sowing months (1-12): rolling after sowing and sowing-date advice only make sense here */
  sowingMonths?: number[];
  /** permanent crop (grassland, orchard): no tillage, no cover crops after harvest, no rolling */
  permanent?: boolean;
};

const K = (...v: number[]) => v;

export const CROPS: Crop[] = [
  { id: "pszenica_ozima", namePl: "Pszenica ozima", kc: K(0.4, 0.4, 0.5, 0.8, 1.15, 1.15, 0.6, 0.3, 0.3, 0.5, 0.5, 0.4), critical: [5, 6], rootDepthM: 1.2, p: 0.55, iungKbw: [-150, -170, -190, -210], ndviHealthy: 0.75, ripeningFrom: "07-01", harvestMonths: [7, 8], phaseEndsAt: "09-10", sowingMonths: [9, 10] },
  { id: "jeczmien_jary", namePl: "Jęczmień jary", kc: K(0, 0, 0.3, 0.6, 1.15, 1.1, 0.5, 0.3, 0, 0, 0, 0), critical: [5, 6], rootDepthM: 1.0, p: 0.55, iungKbw: [-120, -140, -160, -180], ndviHealthy: 0.7, ripeningFrom: "07-10", harvestMonths: [7, 8], sowingMonths: [3, 4] },
  { id: "zyto", namePl: "Żyto", kc: K(0.4, 0.4, 0.5, 0.8, 1.1, 1.05, 0.5, 0.3, 0.3, 0.5, 0.5, 0.4), critical: [5, 6], rootDepthM: 1.2, p: 0.55, iungKbw: [-170, -190, -210, -230], ndviHealthy: 0.7, ripeningFrom: "07-01", harvestMonths: [7, 8], phaseEndsAt: "09-10", sowingMonths: [9, 10] },
  { id: "rzepak_ozimy", namePl: "Rzepak ozimy", kc: K(0.4, 0.4, 0.6, 0.9, 1.1, 1.0, 0.4, 0.3, 0.5, 0.7, 0.6, 0.4), critical: [4, 5], rootDepthM: 1.0, p: 0.6, iungKbw: [-130, -150, -170, -190], ndviHealthy: 0.75, ripeningFrom: "06-25", harvestMonths: [7], phaseEndsAt: "08-15", sowingMonths: [8, 9] },
  { id: "kukurydza", namePl: "Kukurydza", kc: K(0, 0, 0, 0.3, 0.5, 0.9, 1.2, 1.2, 0.8, 0.4, 0, 0), critical: [7, 8], rootDepthM: 1.0, p: 0.55, iungKbw: [-200, -220, -240, -260], ndviHealthy: 0.8, ripeningFrom: "09-10", harvestMonths: [9, 10, 11], sowingMonths: [4, 5] },
  { id: "ziemniak", namePl: "Ziemniak", kc: K(0, 0, 0, 0.4, 0.6, 1.1, 1.15, 0.9, 0.6, 0, 0, 0), critical: [6, 7, 8], rootDepthM: 0.5, p: 0.35, iungKbw: [-180, -200, -220, -240], ndviHealthy: 0.75, ripeningFrom: "08-25", harvestMonths: [8, 9, 10], sowingMonths: [4, 5] },
  { id: "burak_cukrowy", namePl: "Burak cukrowy", kc: K(0, 0, 0, 0.35, 0.6, 1.0, 1.2, 1.2, 1.0, 0.7, 0, 0), critical: [7, 8], rootDepthM: 1.0, p: 0.55, iungKbw: [-210, -230, -250, -270], ndviHealthy: 0.8, ripeningFrom: "09-20", harvestMonths: [9, 10, 11], sowingMonths: [3, 4] },
  { id: "uzytki_zielone", namePl: "Użytki zielone (łąka, pastwisko)", kc: K(0.4, 0.4, 0.6, 0.9, 1.0, 1.0, 1.0, 1.0, 0.95, 0.8, 0.6, 0.4), critical: [5, 6, 7, 8], rootDepthM: 0.5, p: 0.6, iungKbw: [-110, -130, -150, -170], ndviHealthy: 0.7, permanent: true },
  { id: "warzywa", namePl: "Warzywa gruntowe", kc: K(0, 0, 0, 0.5, 0.8, 1.05, 1.05, 1.0, 0.8, 0, 0, 0), critical: [6, 7, 8], rootDepthM: 0.4, p: 0.4, iungKbw: [-100, -120, -140, -160], ndviHealthy: 0.7, sowingMonths: [4, 5] },
  { id: "sad", namePl: "Sad (jabłoń)", kc: K(0.4, 0.4, 0.5, 0.7, 0.9, 1.0, 1.05, 1.05, 0.9, 0.7, 0.5, 0.4), critical: [6, 7, 8], rootDepthM: 1.2, p: 0.5, iungKbw: [-160, -180, -200, -220], ndviHealthy: 0.7, harvestMonths: [8, 9, 10], permanent: true },
];

export const getCrop = (id: CropId) => CROPS.find((c) => c.id === id) ?? CROPS[0];

/** "dojrzewanie" = ripening/harvest phase (NDVI falls naturally); "po_zbiorze" after the harvest months; null = growing or off-season */
export function phaseOf(crop: Crop, date: string): "dojrzewanie" | "po_zbiorze" | null {
  if (!crop.ripeningFrom) return null;
  const md = date.slice(5);
  if (md < crop.ripeningFrom || md >= (crop.phaseEndsAt ?? "12-32")) return null;
  const m = Number(date.slice(5, 7));
  const lastHarvest = Math.max(...(crop.harvestMonths ?? [m]));
  return m > lastHarvest ? "po_zbiorze" : "dojrzewanie";
}
