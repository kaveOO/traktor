import { fromArrayBuffer } from "geotiff";
import type { Crop } from "./crops";
import { inPolys, polygonsOf, project, to2180 } from "./geo";
import type { Assessment, LonLat, Parcel, SourceInfo } from "./types";
import { fetchT, r0, r1, source } from "./util";

type Soil = Assessment["soil"];
const CATS = ["I", "II", "III", "IV"] as const;

/**
 * IUNG drought-susceptibility soil category (SMSR layer Susza:katgl_landuse2024, 5 m pixels, EPSG:2180).
 * AXES: this coverage uses the Polish geodetic convention, x = NORTHING, y = EASTING (docs/review/10-jury-test-set.md).
 * The returned GeoTIFF is north-up with bbox [minE, minN, maxE, maxN].
 * Codes (GetLegendGraphic): 1..4 = kategoria I..IV, 5 = gleby organiczne, 11 = las, 12 = woda, 13 = zabudowa,
 * 14 = drogi i nieużytki, 19/99 = niesklasyfikowane, 0 = brak danych.
 * We count pixels inside the parcel polygon (bbox capped at ±500 m around the centroid) and take the majority.
 */
export type LandUse = { kind: "rolna" | "organiczna" | "las" | "woda" | "zabudowa" | "nieuzytki" | "inne"; agriShare: number; pixels: number };
const KIND: Record<number, LandUse["kind"]> = { 5: "organiczna", 11: "las", 12: "woda", 13: "zabudowa", 14: "nieuzytki" };

export async function getIungCategory(parcel: Parcel, signal?: AbortSignal): Promise<{ data: Soil["iungCategory"]; landUse: LandUse | null; source: SourceInfo }> {
  const t0 = Date.now();
  const label = "Kategoria podatności gleby na suszę (IUNG-PIB)";
  const lic = "IUNG-PIB, mapa podatności gleb na suszę (warunki ponownego wykorzystania do potwierdzenia)";
  const url0 = "https://susza.iung.pulawy.pl/kategorie/";
  try {
    const polys = project(polygonsOf(parcel.geometry));
    const [cx, cy] = to2180(parcel.centroid);
    const pts = polys.flatMap((p) => p[0]);
    const clampE = (v: number) => Math.max(cx - 500, Math.min(cx + 500, v));
    const clampN = (v: number) => Math.max(cy - 500, Math.min(cy + 500, v));
    let e0 = clampE(Math.min(...pts.map((q) => q[0])) - 10), e1 = clampE(Math.max(...pts.map((q) => q[0])) + 10);
    let n0 = clampN(Math.min(...pts.map((q) => q[1])) - 10), n1 = clampN(Math.max(...pts.map((q) => q[1])) + 10);
    if (e1 - e0 < 30) { e0 = cx - 15; e1 = cx + 15; }
    if (n1 - n0 < 30) { n0 = cy - 15; n1 = cy + 15; }
    const url = `https://sgeo.iung.pl/geoserver/ows?service=WCS&version=2.0.1&request=GetCoverage&coverageId=Susza__katgl_landuse2024&subset=x(${n0.toFixed(0)},${n1.toFixed(0)})&subset=y(${e0.toFixed(0)},${e1.toFixed(0)})&format=image/tiff`;
    const res = await fetchT(url, { timeoutMs: 5000, retries: 1, signal });
    if (!String(res.headers.get("content-type")).includes("tiff")) throw new Error("not tiff");
    const tif = await fromArrayBuffer(await res.arrayBuffer());
    const img = await tif.getImage();
    const [bx0, , , by1] = img.getBoundingBox();
    const [rx, ry] = img.getResolution();
    const w = img.getWidth();
    const h = img.getHeight();
    const band = (await img.readRasters())[0] as ArrayLike<number>;
    const countIn = new Map<number, number>();
    const countAll = new Map<number, number>();
    for (let row = 0; row < h; row++)
      for (let col = 0; col < w; col++) {
        const v = Math.round(Number(band[row * w + col]));
        if (!v) continue;
        countAll.set(v, (countAll.get(v) ?? 0) + 1);
        const p = [bx0 + (col + 0.5) * Math.abs(rx), by1 - (row + 0.5) * Math.abs(ry)];
        if (inPolys(p, polys)) countIn.set(v, (countIn.get(v) ?? 0) + 1);
      }
    const counts = [...countIn.values()].reduce((a, b) => a + b, 0) >= 3 ? countIn : countAll;
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    if (!total) return { data: null, landUse: null, source: source("IUNG", label, lic, t0, "missing", "brak danych IUNG dla działki", { url: url0 }) };
    const agri = [1, 2, 3, 4].reduce((s, k) => s + (counts.get(k) ?? 0), 0);
    const organic = counts.get(5) ?? 0;
    const major = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const agriShare = (agri + organic) / total;
    const landUse: LandUse = { kind: agriShare >= 0.5 ? (agri >= organic ? "rolna" : "organiczna") : KIND[major] ?? "inne", agriShare: Math.round(agriShare * 100) / 100, pixels: total };
    if (!agri) {
      return { data: null, landUse, source: source("IUNG", label, lic, t0, "partial", `brak kategorii I–IV na działce (${landUse.kind}, ${total} pikseli 5 m)`, { url: url0 }) };
    }
    const cats = [1, 2, 3, 4].map((k) => counts.get(k) ?? 0);
    const k = cats.indexOf(Math.max(...cats));
    const share = Math.round((100 * cats[k]) / agri);
    return {
      data: CATS[k],
      landUse,
      source: source("IUNG", label, lic, t0, "ok", `WCS Susza:katgl_landuse2024, ${total} pikseli 5 m na działce: kat. ${CATS[k]} (${share}% gruntów rolnych)`, { url: url0 }),
    };
  } catch {
    return { data: null, landUse: null, source: source("IUNG", label, lic, t0, "missing", "WCS IUNG nie odpowiedział", { url: url0 }) };
  }
}

/** USDA texture triangle, Polish names (przybliżenie; PTG uses its own classes). */
export function textureClassPl(sand: number, clay: number): string {
  const silt = Math.max(0, 100 - sand - clay);
  if (silt + 1.5 * clay < 15) return "piasek";
  if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return "piasek gliniasty";
  if ((clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) || (clay < 7 && silt < 50 && silt + 2 * clay >= 30)) return "glina piaszczysta";
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return "glina";
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return "pył gliniasty";
  if (silt >= 80 && clay < 12) return "pył";
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return "glina piaszczysto-ilasta";
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return "glina ilasta";
  if (clay >= 27 && clay < 40 && sand <= 20) return "glina pylasto-ilasta";
  if (clay >= 35 && sand > 45) return "ił piaszczysty";
  if (clay >= 40 && silt >= 40) return "ił pylasty";
  return "ił";
}

/** Rough SMSR category from a USDA-ish texture class (fallback when IUNG WCS fails; UNVERIFIED, docs/review/07-science.md §2). */
export function categoryFromTexture(cls: string | null, clayPct: number | null): "I" | "II" | "III" | "IV" | null {
  if (!cls) return null;
  if (cls === "piasek" || cls === "piasek gliniasty") return "I";
  if (cls === "glina piaszczysta") return (clayPct ?? 0) < 10 ? "II" : "III";
  if (["glina", "pył gliniasty", "pył"].includes(cls)) return "III";
  return "IV";
}

/** Saxton & Rawls (2006) field capacity minus wilting point (m3/m3). S, C as fractions, OM in %. */
export function saxtonRawlsPaw(sandPct: number, clayPct: number, omPct: number): number {
  const S = sandPct / 100;
  const C = clayPct / 100;
  const OM = Math.min(8, Math.max(0, omPct));
  const t1500 = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * S * OM - 0.013 * C * OM + 0.068 * S * C + 0.031;
  const th1500 = t1500 + (0.14 * t1500 - 0.02);
  const t33 = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * S * OM - 0.027 * C * OM + 0.452 * S * C + 0.299;
  const th33 = t33 + (1.283 * t33 * t33 - 0.374 * t33 - 0.015);
  return Math.max(0.02, th33 - th1500);
}

type SgLayer = { name: string; unit_measure?: { d_factor?: number }; depths: { label: string; values: { mean: number | null } }[] };

export async function getSoilGrids(
  lonLat: LonLat,
  crop: Crop,
  signal?: AbortSignal,
): Promise<{ data: Omit<Soil, "iungCategory">; source: SourceInfo }> {
  const t0 = Date.now();
  const [lon, lat] = lonLat;
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon.toFixed(5)}&lat=${lat.toFixed(5)}&property=sand&property=clay&property=soc&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`;
  const label = "Uziarnienie i węgiel organiczny gleby (SoilGrids 250 m)";
  const lic = "SoilGrids 2.0, ISRIC, CC BY 4.0";
  const empty = { sandPct: null, clayPct: null, socGkg: null, awcMm: null, textureClassPl: null };
  try {
    const res = await fetchT(url, { timeoutMs: 8000, signal, init: { headers: { Accept: "application/json" } } });
    const j = (await res.json()) as { properties?: { layers?: SgLayer[] } };
    const W: Record<string, number> = { "0-5cm": 5, "5-15cm": 10, "15-30cm": 15 };
    const get = (name: string) => {
      const l = j.properties?.layers?.find((x) => x.name === name);
      if (!l) return null;
      const df = l.unit_measure?.d_factor ?? 10;
      let s = 0;
      let w = 0;
      for (const d of l.depths) {
        const v = d.values?.mean;
        if (typeof v === "number" && W[d.label]) {
          s += (v / df) * W[d.label];
          w += W[d.label];
        }
      }
      return w ? s / w : null;
    };
    // SoilGrids: sand/clay g/kg (d_factor 10 -> %), soc dg/kg (d_factor 10 -> g/kg)
    const sand = get("sand");
    const clay = get("clay");
    const soc = get("soc");
    if (sand === null || clay === null)
      return { data: empty, source: source("SoilGrids", label, lic, t0, "missing", "brak wartości w punkcie (teren zabudowany lub woda?)", { url: "https://soilgrids.org/" }) };
    const om = soc === null ? 1.5 : (soc / 10) * 1.724;
    const paw = saxtonRawlsPaw(sand, clay, om);
    return {
      data: {
        sandPct: r0(sand),
        clayPct: r0(clay),
        socGkg: soc === null ? null : r1(soc),
        awcMm: r0(paw * crop.rootDepthM * 1000),
        textureClassPl: textureClassPl(sand, clay),
      },
      source: source(
        "SoilGrids",
        label,
        lic,
        t0,
        soc === null ? "partial" : "ok",
        `średnia 0–30 cm w punkcie ${lat.toFixed(3)}N ${lon.toFixed(3)}E; AWC z równań Saxton–Rawls (2006) × strefa korzeni ${crop.rootDepthM} m`,
        { url: "https://soilgrids.org/" },
      ),
    };
  } catch {
    return { data: empty, source: source("SoilGrids", label, lic, t0, "missing", "SoilGrids nie odpowiedział w 8 s", { url: "https://soilgrids.org/" }) };
  }
}
