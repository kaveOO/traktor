import type { AnalysisError, AnalysisRequest, AnalysisResult, Level, LonLat, Parcel } from "@/lib/analiza";
import { FIXTURE_PARCEL, FIXTURE_PARCEL_ID } from "./fixture";

/** Parcel ids look like 040307_2.0023.306/2 (TERYT gminy _ typ . obręb . numer). */
export const PARCEL_ID_RE = /^\d{6}_\d\.\d{4}(\.[\w/]+)+$/;
export const looksLikeParcelId = (q: string) => PARCEL_ID_RE.test(q.trim()) || /^\d{6}_\d\./.test(q.trim());

export type Fetched<T> = { ok: true; data: T; fixture?: boolean } | { ok: false; messagePl: string };

async function getJson<T>(url: string, init?: RequestInit, timeoutMs = 45000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    const body = (await r.json().catch(() => null)) as unknown;
    if (!r.ok) {
      const e = body as Partial<AnalysisError> | null;
      throw new Error(e?.messagePl || `serwer odpowiedział kodem ${r.status}`);
    }
    return body as T;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("przekroczony czas odpowiedzi");
    if (e instanceof TypeError) throw new Error("brak połączenia z serwerem");
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchParcel(q: { id: string } | { lonLat: LonLat }): Promise<Fetched<Parcel>> {
  const url =
    "id" in q
      ? `/api/dzialka?id=${encodeURIComponent(q.id.trim())}`
      : `/api/dzialka?lon=${q.lonLat[0].toFixed(6)}&lat=${q.lonLat[1].toFixed(6)}`;
  try {
    const data = await getJson<Parcel>(url, undefined, 20000);
    if (!data?.geometry) throw new Error("niepełna odpowiedź");
    return { ok: true, data };
  } catch (e) {
    // Until the engine lane is merged: the fixture parcel still works.
    if ("id" in q && q.id.trim() === FIXTURE_PARCEL_ID) return { ok: true, data: FIXTURE_PARCEL, fixture: true };
    return { ok: false, messagePl: (e as Error).message };
  }
}

export async function postAnalysis(req: AnalysisRequest): Promise<Fetched<AnalysisResult>> {
  try {
    const data = await getJson<AnalysisResult>("/api/analiza", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!data?.assessment) throw new Error("niepełna odpowiedź");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, messagePl: (e as Error).message };
  }
}

/** Place search. GUGiK UUG GetLocation returned no objects for place names in tests, so we use Nominatim
 * (OSM, ODbL): only on submit, at most 1 request per second, Poland only. */
let lastGeocode = 0;
export type Place = { label: string; lonLat: LonLat; bbox?: [number, number, number, number] };
export async function geocode(q: string): Promise<Fetched<Place[]>> {
  const wait = 1100 - (Date.now() - lastGeocode);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pl&limit=5&accept-language=pl&q=${encodeURIComponent(q)}`;
    const rows = await getJson<{ display_name: string; lon: string; lat: string; boundingbox?: string[] }[]>(url, undefined, 10000);
    return {
      ok: true,
      data: rows.map((r) => ({
        label: r.display_name,
        lonLat: [Number(r.lon), Number(r.lat)],
        bbox: r.boundingbox
          ? [Number(r.boundingbox[2]), Number(r.boundingbox[0]), Number(r.boundingbox[3]), Number(r.boundingbox[1])]
          : undefined,
      })),
    };
  } catch (e) {
    return { ok: false, messagePl: (e as Error).message };
  }
}

/** Risk levels: word + icon + rank (the brand LevelTag maps rank to agri / soil / terracotta). */
export const LEVEL_PL: Record<Level, { word: string; icon: "water" | "drought"; rank: number }> = {
  niskie: { word: "Niskie", icon: "water", rank: 1 },
  umiarkowane: { word: "Umiarkowane", icon: "drought", rank: 2 },
  wysokie: { word: "Wysokie", icon: "drought", rank: 3 },
  bardzo_wysokie: { word: "Bardzo wysokie", icon: "drought", rank: 4 },
};

export const fmt = (n: number | null | undefined, digits = 0, unit = "") =>
  n === null || n === undefined || Number.isNaN(n)
    ? "brak danych"
    : `${n.toLocaleString("pl-PL", { maximumFractionDigits: digits, minimumFractionDigits: digits })}${unit ? ` ${unit}` : ""}`;

export const todayIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const minDateIso = () => {
  const t = todayIso();
  return `${Number(t.slice(0, 4)) - 10}${t.slice(4)}`;
};

export function bboxOf(p: Parcel): [number, number, number, number] {
  const pts: number[][] =
    p.geometry.type === "Polygon"
      ? (p.geometry.coordinates as number[][][]).flat()
      : (p.geometry.coordinates as number[][][][]).flat(2);
  let [a, b, c, d] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of pts) {
    a = Math.min(a, x);
    b = Math.min(b, y);
    c = Math.max(c, x);
    d = Math.max(d, y);
  }
  return [a, b, c, d];
}
