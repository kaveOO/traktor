import type { AnalysisResult } from "@/lib/analiza";

/** Reports saved in the browser (localStorage). Full AnalysisResult kept so a saved report opens offline. */
const KEY = "traktor.raporty.v1";
const MAX = 12;

export type SavedReport = { key: string; savedAt: string; parcelId: string; cropPl: string; date: string; result: AnalysisResult };

export function reportKey(r: AnalysisResult) {
  return `${r.parcel.id}|${r.crop.id}|${r.request.date}|${r.generatedAt}`;
}

export function listSaved(): SavedReport[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as SavedReport[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveReport(r: AnalysisResult): { ok: boolean; list: SavedReport[] } {
  const entry: SavedReport = {
    key: reportKey(r),
    savedAt: new Date().toISOString(),
    parcelId: r.parcel.id,
    cropPl: r.crop.namePl,
    date: r.request.date,
    result: r,
  };
  const list = [entry, ...listSaved().filter((x) => x.key !== entry.key)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    return { ok: true, list };
  } catch {
    return { ok: false, list: listSaved() };
  }
}

export function removeSaved(key: string): SavedReport[] {
  const list = listSaved().filter((x) => x.key !== key);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list;
}

export function getSaved(key: string): AnalysisResult | null {
  return listSaved().find((x) => x.key === key)?.result ?? null;
}
