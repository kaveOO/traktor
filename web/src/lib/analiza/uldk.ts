import type { LonLat, Parcel, SourceInfo } from "./types";
import { areaHa, centroid, inPoland, polygonsOf, type Rings } from "./geo";
import { fetchT, r2, source, UpstreamError } from "./util";

const BASE = "https://uldk.gugik.gov.pl/";
const FIELDS = "id,geom_wkt,teryt,voivodeship,county,commune,region";
const LICENSE = "GUGiK ULDK, dane publiczne (art. 40a Pgik)";

/** Full ULDK id: 6-digit TERYT gminy + _type + .obręb(4) + .number (with optional AR_x. and /y). */
export const FULL_ID = /^\d{6}_\d\.\d{4}\.(AR_\d+\.)?[0-9A-Za-z]+(\/[0-9A-Za-z]+)?$/;

export function normalizeParcelId(raw: string): string {
  return raw
    .trim()
    .replace(/^(\d{6})\s*[-\s]\s*(\d)\s*\./, "$1_$2.")
    .replace(/(\d)\s*[-\\]\s*(\d)/g, "$1/$2")
    .replace(/\s*\/\s*/g, "/")
    // collapse spaces around dots only inside ids ("040706_5 . 0021"), not in obręb names ("Brzezie k. Sulechowa")
    .replace(/(\d)\s*\.\s*(?=\d|AR_|ar_)/g, "$1.")
    .replace(/\s+/g, " ")
    .replace(/\bar_/gi, "AR_");
}

/** Loose check: either full id or "obręb + number" text that ULDK can resolve. */
export const looksLikeParcelId = (s: string) => {
  const n = normalizeParcelId(s);
  return n.length >= 3 && n.length <= 80 && /^[\p{L}\d_./\- ]+$/u.test(n) && /\d/.test(n);
};

export function parseWkt(wkt: string): Parcel["geometry"] {
  const body = wkt.replace(/^SRID=\d+;/i, "").trim();
  const isMulti = /^MULTIPOLYGON/i.test(body);
  const inner = body.replace(/^(MULTI)?POLYGON\s*/i, "");
  const ring = (s: string) =>
    s
      .split(",")
      .map((p) => p.trim().split(/\s+/).map(Number))
      .filter((p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map((p) => [p[0], p[1]]);
  const polyFrom = (s: string): number[][][] => (s.match(/\(([^()]+)\)/g) ?? []).map((r) => ring(r.slice(1, -1)));
  if (!isMulti) {
    const rings = polyFrom(inner);
    if (!rings.length || rings[0].length < 3) throw new UpstreamError("bad wkt");
    return { type: "Polygon", coordinates: rings };
  }
  // split polygons at ")),((" boundaries
  const parts = inner.slice(1, -1).split(/\)\s*\)\s*,\s*\(\s*\(/);
  const polys = parts.map((p, i, a) => {
    let s = p;
    if (i > 0) s = "((" + s;
    if (i < a.length - 1) s = s + "))";
    return polyFrom(s);
  });
  if (!polys.length || !polys[0].length) throw new UpstreamError("bad wkt");
  return polys.length === 1 ? { type: "Polygon", coordinates: polys[0] } : { type: "MultiPolygon", coordinates: polys };
}

function parseLine(line: string): Parcel {
  const [id, wkt, teryt, voivodeship, county, commune, region] = line.split("|").map((s) => (s ?? "").trim());
  const geometry = parseWkt(wkt);
  const polys: Rings[] = polygonsOf(geometry);
  return {
    id,
    teryt: teryt || id,
    voivodeship: voivodeship || undefined,
    county: county || undefined,
    commune: commune || undefined,
    region: region || undefined,
    areaHa: r2(areaHa(polys)),
    centroid: centroid(polys).map((v) => Math.round(v * 1e6) / 1e6) as LonLat,
    geometry,
  };
}

async function call(qs: string, signal?: AbortSignal): Promise<string[]> {
  const res = await fetchT(`${BASE}?${qs}&result=${FIELDS}&srid=4326`, { timeoutMs: 8000, retries: 1, signal });
  const txt = (await res.text()).trim();
  const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length || lines[0].startsWith("-1")) return [];
  return lines.slice(1).filter((l) => l.includes("POLYGON"));
}

export type ParcelLookup = { parcel: Parcel; source: SourceInfo; matches: number };

export type ParcelCandidate = { id: string; commune?: string; county?: string; voivodeship?: string; region?: string };
export class AmbiguousParcel extends UpstreamError {
  readonly candidates: ParcelCandidate[];
  constructor(candidates: ParcelCandidate[], input: string) {
    super("AMBIGUOUS", `„${input}” pasuje do ${candidates.length} działek w różnych gminach. Wybierz właściwą z listy albo podaj pełny identyfikator.`);
    this.candidates = candidates;
  }
}
const NO_TYPE = /^(\d{6})\.(\d{4})\.(.+)$/;
const NUMBER_ONLY = /^(AR_\d+\.)?\d+[A-Za-z]?(\/\d+[A-Za-z]?)?$/;

const toCandidate = (line: string): ParcelCandidate => {
  const [id, , , voivodeship, county, commune, region] = line.split("|").map((x) => (x ?? "").trim());
  return { id, voivodeship: voivodeship || undefined, county: county || undefined, commune: commune || undefined, region: region || undefined };
};

export async function getParcelById(raw: string, signal?: AbortSignal): Promise<ParcelLookup> {
  const t0 = Date.now();
  const id = normalizeParcelId(raw);
  const notFound = () =>
    new UpstreamError(
      "not found",
      `Nie znaleziono działki „${id}”. Podaj pełny identyfikator (np. 040706_5.0021.44) albo nazwę obrębu i numer (np. Kraszyce 44).`,
    );
  if (NUMBER_ONLY.test(id))
    throw new UpstreamError("need obreb", `Sam numer „${id}” nie wystarczy: taki numer jest w wielu obrębach. Podaj pełny identyfikator (np. 040706_5.0021.44) albo nazwę obrębu i numer (np. Kraszyce 44).`);
  let lines: string[] = [];
  let how = "GetParcelById";
  try {
    if (FULL_ID.test(id)) {
      const q = `request=GetParcelById&id=${encodeURIComponent(id)}`;
      lines = await call(q, signal);
      // ULDK sometimes answers "-1" under load: one more try, then the id-or-number search
      if (!lines.length) lines = await call(q, signal);
      if (!lines.length) lines = await call(`request=GetParcelByIdOrNr&id=${encodeURIComponent(id)}`, signal);
    } else if (NO_TYPE.test(id)) {
      // gmina-type digit missing (e.g. 040706.0020.3309/3): try the common suffixes in parallel
      const [, g, o, n] = id.match(NO_TYPE)!;
      how = "GetParcelById (uzupełniono typ gminy)";
      const tries = await Promise.allSettled(["1", "2", "3", "4", "5", "8"].map((t) => call(`request=GetParcelById&id=${encodeURIComponent(`${g}_${t}.${o}.${n}`)}`, signal)));
      lines = tries.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    } else {
      how = "GetParcelByIdOrNr (obręb + numer)";
      lines = await call(`request=GetParcelByIdOrNr&id=${encodeURIComponent(id)}`, signal);
    }
  } catch {
    throw new UpstreamError("uldk down", "Usługa ULDK (GUGiK) nie odpowiada. Spróbuj ponownie za chwilę albo wskaż działkę na mapie.");
  }
  if (!lines.length) throw notFound();
  const uniq = [...new Map(lines.map((l) => [l.split("|")[0].trim(), l])).values()];
  if (uniq.length > 1) throw new AmbiguousParcel(uniq.slice(0, 20).map(toCandidate), id);
  const parcel = parseLine(uniq[0]);
  const src = source("ULDK", "Granice działki (ULDK GUGiK)", LICENSE, t0, "ok", `${how}: ${id} → ${parcel.id}`, { url: "https://uldk.gugik.gov.pl/" });
  return { parcel, source: src, matches: 1 };
}

export async function getParcelByXY(lon: number, lat: number, signal?: AbortSignal): Promise<ParcelLookup> {
  const t0 = Date.now();
  if (!inPoland([lon, lat])) throw new UpstreamError("outside", "Wskazany punkt leży poza Polską.");
  let lines: string[];
  try {
    lines = await call(`request=GetParcelByXY&xy=${lon},${lat},4326`, signal);
  } catch {
    throw new UpstreamError("uldk down", "Usługa ULDK (GUGiK) nie odpowiada. Spróbuj ponownie za chwilę.");
  }
  if (!lines.length) throw new UpstreamError("not found", "W tym miejscu nie ma działki ewidencyjnej w ULDK.");
  const parcel = parseLine(lines[0]);
  return {
    parcel,
    source: source("ULDK", "Granice działki (ULDK GUGiK)", LICENSE, t0, "ok", `GetParcelByXY ${lon.toFixed(5)},${lat.toFixed(5)} → ${parcel.id}`, {
      url: "https://uldk.gugik.gov.pl/",
    }),
    matches: 1,
  };
}
