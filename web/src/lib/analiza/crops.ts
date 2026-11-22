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
  /** KBW threshold (mm, 60 days) below which drought is declared, per soil category I..IV */
  iungKbw: [number, number, number, number];
  /** how to read NDVI in the critical window (typical healthy NDVI) */
  ndviHealthy: number;
};

const K = (...v: number[]) => v;

export const CROPS: Crop[] = [
  { id: "pszenica_ozima", namePl: "Pszenica ozima", kc: K(0.4, 0.4, 0.5, 0.8, 1.15, 1.15, 0.6, 0.3, 0.3, 0.5, 0.5, 0.4), critical: [5, 6], rootDepthM: 1.0, iungKbw: [-150, -170, -190, -210], ndviHealthy: 0.75 },
  { id: "jeczmien_jary", namePl: "Jęczmień jary", kc: K(0, 0, 0.3, 0.6, 1.15, 1.1, 0.5, 0.3, 0, 0, 0, 0), critical: [5, 6], rootDepthM: 0.8, iungKbw: [-120, -140, -160, -180], ndviHealthy: 0.7 },
  { id: "zyto", namePl: "Żyto", kc: K(0.4, 0.4, 0.5, 0.8, 1.1, 1.05, 0.5, 0.3, 0.3, 0.5, 0.5, 0.4), critical: [5, 6], rootDepthM: 1.0, iungKbw: [-170, -190, -210, -230], ndviHealthy: 0.7 },
  { id: "rzepak_ozimy", namePl: "Rzepak ozimy", kc: K(0.4, 0.4, 0.6, 0.9, 1.1, 1.0, 0.4, 0.3, 0.5, 0.7, 0.6, 0.4), critical: [4, 5], rootDepthM: 1.0, iungKbw: [-130, -150, -170, -190], ndviHealthy: 0.75 },
  { id: "kukurydza", namePl: "Kukurydza", kc: K(0, 0, 0, 0.3, 0.5, 0.9, 1.2, 1.2, 0.8, 0.4, 0, 0), critical: [7, 8], rootDepthM: 1.0, iungKbw: [-200, -220, -240, -260], ndviHealthy: 0.8 },
  { id: "ziemniak", namePl: "Ziemniak", kc: K(0, 0, 0, 0.4, 0.6, 1.1, 1.15, 0.9, 0.6, 0, 0, 0), critical: [6, 7, 8], rootDepthM: 0.5, iungKbw: [-180, -200, -220, -240], ndviHealthy: 0.75 },
  { id: "burak_cukrowy", namePl: "Burak cukrowy", kc: K(0, 0, 0, 0.35, 0.6, 1.0, 1.2, 1.2, 1.0, 0.7, 0, 0), critical: [7, 8], rootDepthM: 1.0, iungKbw: [-210, -230, -250, -270], ndviHealthy: 0.8 },
  { id: "uzytki_zielone", namePl: "Użytki zielone (łąka, pastwisko)", kc: K(0.4, 0.4, 0.6, 0.9, 1.0, 1.0, 1.0, 1.0, 0.95, 0.8, 0.6, 0.4), critical: [5, 6, 7, 8], rootDepthM: 0.4, iungKbw: [-110, -130, -150, -170], ndviHealthy: 0.7 },
  { id: "warzywa", namePl: "Warzywa gruntowe", kc: K(0, 0, 0, 0.5, 0.8, 1.05, 1.05, 1.0, 0.8, 0, 0, 0), critical: [6, 7, 8], rootDepthM: 0.4, iungKbw: [-100, -120, -140, -160], ndviHealthy: 0.7 },
  { id: "sad", namePl: "Sad (jabłoń)", kc: K(0.4, 0.4, 0.5, 0.7, 0.9, 1.0, 1.05, 1.05, 0.9, 0.7, 0.5, 0.4), critical: [6, 7, 8], rootDepthM: 1.2, iungKbw: [-160, -180, -200, -220], ndviHealthy: 0.7 },
];

export const getCrop = (id: CropId) => CROPS.find((c) => c.id === id) ?? CROPS[0];
