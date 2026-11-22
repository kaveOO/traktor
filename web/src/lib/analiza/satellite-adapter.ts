import type { Crop } from "./crops";
import type { Assessment, Parcel, SourceInfo } from "./types";
import { withTimeout } from "./util";

export const EMPTY_SAT: Assessment["satellite"] = { sceneDate: null, cloudPct: null, ndvi: null, ndmi: null, ndviNorm: null, ndmiNorm: null, anomalyPl: null, history: [] };

/** Calls the satellite lane's module with a hard timeout; never throws. */
export async function satelliteSafe(parcel: Parcel, date: string, crop: Crop, timeoutMs = 12000): Promise<{ data: Assessment["satellite"]; source: SourceInfo }> {
  const t0 = Date.now();
  const missing = (detail: string): { data: Assessment["satellite"]; source: SourceInfo } => ({
    data: EMPTY_SAT,
    source: {
      id: "Sentinel2",
      label: "Zdjęcia satelitarne Sentinel-2",
      detail,
      status: "missing",
      fetchedAt: new Date().toISOString(),
      ms: Date.now() - t0,
      license: "Copernicus Sentinel-2 (ESA), dane otwarte; Earth Search STAC",
      url: "https://earth-search.aws.element84.com/v1",
    },
  });
  try {
    const mod = await import("./satellite");
    if (typeof mod.getSatellite !== "function") return missing("moduł satelitarny niedostępny");
    const r = await withTimeout(mod.getSatellite(parcel, date, crop), timeoutMs, "sat timeout");
    if (!r?.data || !r.source) return missing("moduł satelitarny zwrócił pusty wynik");
    return { data: { ...EMPTY_SAT, ...r.data }, source: r.source };
  } catch (e) {
    return missing(e instanceof Error && e.message === "sat timeout" ? `brak sceny w ${Math.round(timeoutMs / 1000)} s (limit czasu)` : "błąd modułu satelitarnego");
  }
}
