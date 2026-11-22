import { GMINA, getScenario, type Conditions, type Warning } from "@/lib/traktor";

const LAT = GMINA.center.lat;
const LON = GMINA.center.lon;
const TERYT_POWIAT = GMINA.powiatTeryt;
const TIMEOUT_MS = 5000;

export const SOURCE_IMGW =
  "Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy (dane przetworzone)";
export const SOURCE_OM = "Open-Meteo.com (CC BY 4.0)";

type Daily = { precipitation_sum?: (number | null)[]; et0_fao_evapotranspiration?: (number | null)[] };

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const sum = (a: (number | null)[] | undefined) => (a ?? []).reduce<number>((s, v) => s + (typeof v === "number" ? v : 0), 0);
const r1 = (n: number) => Math.round(n * 10) / 10;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function forecast() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=precipitation_sum,et0_fao_evapotranspiration&forecast_days=7&timezone=Europe%2FWarsaw`;
  const j = (await getJson(url)) as { daily?: Daily };
  const p = j.daily?.precipitation_sum;
  const e = j.daily?.et0_fao_evapotranspiration;
  if (!Array.isArray(p) || p.length < 3 || !Array.isArray(e) || typeof e[0] !== "number") throw new Error("bad forecast");
  return { precip72hMm: r1(sum(p.slice(0, 3))), precip7dMm: r1(sum(p)), et0Mm: r1(e[0] as number) };
}

function kbwFrom(j: { daily?: Daily }, take?: number) {
  let p = j.daily?.precipitation_sum;
  let e = j.daily?.et0_fao_evapotranspiration;
  if (!Array.isArray(p) || !Array.isArray(e)) throw new Error("bad history");
  if (take) {
    p = p.slice(0, take);
    e = e.slice(0, take);
  }
  if (p.filter((v) => typeof v === "number").length < 30) throw new Error("short history");
  return { kbw60Mm: Math.round(sum(p) - sum(e)) };
}

async function archive(now: Date) {
  const end = new Date(now.getTime() - 5 * 86400_000);
  const start = new Date(end.getTime() - 59 * 86400_000);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${ymd(start)}&end_date=${ymd(end)}&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=Europe%2FWarsaw`;
  try {
    return kbwFrom((await getJson(url)) as { daily?: Daily });
  } catch {
    // archive down or rate-limited: forecast API keeps the last 60 days too (past_days)
    const alt = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=precipitation_sum,et0_fao_evapotranspiration&past_days=60&forecast_days=1&timezone=Europe%2FWarsaw`;
    return kbwFrom((await getJson(alt)) as { daily?: Daily }, 60);
  }
}

function toLevel(v: unknown): 1 | 2 | 3 {
  const n = Number(v);
  return n >= 3 ? 3 : n >= 2 ? 2 : 1;
}

async function warnings(): Promise<Warning[]> {
  const j = await getJson("https://danepubliczne.imgw.pl/api/data/warningsmeteo");
  if (!Array.isArray(j)) return []; // object with "message" = no warnings
  const out: Warning[] = [];
  for (const w of j as Record<string, unknown>[]) {
    if (!w || typeof w !== "object") continue;
    const t = w.teryt;
    const list = Array.isArray(t) ? t.map(String) : typeof t === "string" ? t.split(/[,\s]+/) : [];
    if (!list.some((code) => code.startsWith(TERYT_POWIAT))) continue;
    out.push({
      kind: "meteo",
      event: String(w.nazwa_zdarzenia ?? "Ostrzeżenie meteorologiczne"),
      level: toLevel(w.stopien),
      powiat: GMINA.powiat,
      validFrom: String(w.obowiazuje_od ?? ""),
      validTo: String(w.obowiazuje_do ?? ""),
    });
  }
  return out;
}

/** Live conditions: Open-Meteo + IMGW. Each failing part falls back to the drought-aug fixture. Never throws. */
export async function liveConditions(): Promise<Conditions> {
  const now = new Date();
  const fb = getScenario("drought-aug");
  const [f, a, w] = await Promise.allSettled([forecast(), archive(now), warnings()]);
  const okCount = [f, a, w].filter((x) => x.status === "fulfilled").length;
  if (okCount === 0) {
    return {
      ...fb,
      mode: "fixture",
      labelPl: "Dane zapisane (brak połączenia)",
      sources: [...fb.sources, SOURCE_IMGW, SOURCE_OM],
    };
  }
  const fc = f.status === "fulfilled" ? f.value : { precip72hMm: fb.precip72hMm, precip7dMm: fb.precip7dMm, et0Mm: fb.et0Mm };
  const kbw = a.status === "fulfilled" ? a.value.kbw60Mm : fb.kbw60Mm;
  const warns = w.status === "fulfilled" ? w.value : fb.warnings;
  const sources: string[] = [];
  sources.push(f.status === "fulfilled" ? `${SOURCE_OM}: prognoza 7 dni` : "Prognoza: dane zapisane (brak połączenia)");
  sources.push(a.status === "fulfilled" ? `${SOURCE_OM}: archiwum 60 dni (KBW)` : "KBW: dane zapisane (brak połączenia)");
  sources.push(w.status === "fulfilled" ? `${SOURCE_IMGW}: ostrzeżenia meteorologiczne` : "Ostrzeżenia: dane zapisane (brak połączenia)");
  const month = Number(
    new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "Europe/Warsaw" }).format(now),
  );
  return {
    mode: "live",
    labelPl: okCount === 3 ? "Dane na żywo · Open-Meteo, IMGW-PIB" : "Dane na żywo (częściowo zapisane) · Open-Meteo, IMGW-PIB",
    asOf: now.toISOString(),
    month: Number.isFinite(month) ? month : now.getMonth() + 1,
    kbw60Mm: kbw,
    precip72hMm: fc.precip72hMm,
    precip7dMm: fc.precip7dMm,
    et0Mm: fc.et0Mm,
    warnings: warns,
    sources,
  };
}
