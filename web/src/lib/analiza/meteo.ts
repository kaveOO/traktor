import type { Crop } from "./crops";
import type { Assessment, LonLat, SourceInfo } from "./types";
import { LICENSE_POWER, omForecast, powerSeries } from "./power";
import { addDays, daysBetween, fetchT, r0, r1, shiftYears, source, todayPL } from "./util";

export const LICENSE_OM = "Open-Meteo.com, CC BY 4.0";
export const LICENSE_IMGW = "Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy (dane przetworzone)";
type Daily = Record<string, (number | null)[] | string[] | undefined> & { time?: string[] };
/** ei = ETP SMSR (Doroszewski et al. 2012 eq. 2) per day; f = RH13 %, v = wind 10 m m/s */
export type Day = { p: number | null; e: number | null; t: number | null; tm: number | null; sun: number | null; ei: number | null; fc: boolean; f?: number | null; v?: number | null };

/** pm = P − ET0 FAO-56; iung = P − ETP SMSR (eq. 2), the method SMSR thresholds are calibrated on */
export type KbwSum = { pm: number; iung: number | null; p: number; days: number; total: number; forecastDays: number };

export type MeteoOut = {
  meteo: Omit<Assessment["meteo"], "droughtYears" | "seasons" | "warnings" | "kbw60Mm" | "kbw60Percentile">;
  /** mean ET0 FAO over the same 30 days in the previous years (for the "duże parowanie" cause) */
  et0_30NormMm: number | null;
  /** KBW sums over [start, end] (inclusive) with FAO-56 ET0 (pm) and ETP SMSR (iung) */
  kbw: (start: string, end: string) => KbwSum | null;
  day: (d: string) => Day | undefined;
  /** last day with data ≤ date */
  dataEnd: string;
  /** first day (≤ date) filled from the forecast API (archive lag) */
  lagFrom: string | null;
  hasForecast: boolean;
  /** NASA POWER history available (10-year background) */
  archiveOk: boolean;
  firstDay: string;
  lastDay: string;
};

const num = (a: unknown, i: number) => {
  const v = Array.isArray(a) ? a[i] : null;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

const monthOf = (d: string) => Number(d.slice(5, 7));
const dim = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** astronomical day length (h), FAO-56 eq. 24/34 (same as power.ts) */
function dayLength(lat: number, d: string): number {
  const doy = Math.round((Date.parse(d + "T00:00:00Z") - Date.UTC(Number(d.slice(0, 4)), 0, 0)) / 86400_000);
  const decl = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const x = Math.max(-1, Math.min(1, -Math.tan((lat * Math.PI) / 180) * Math.tan(decl)));
  return (24 / Math.PI) * Math.acos(x);
}

/**
 * ETP used by SMSR: Doroszewski et al. 2012, eq. 2 (simplified Penman), monthly constants (mm/month).
 * d = mean astronomical day length (h), h = monthly sunshine sum (h), t = mean air temperature (°C),
 * f = relative humidity at 13:00 (%), v = wind speed at 10 m (m/s). Checked in docs/review2/02 (~141 mm in July 2018).
 */
export const etpSmsrMonth = (d: number, h: number, t: number, f: number, v: number) =>
  Math.max(
    0,
    161 + 19.57 * d - 152.7 * Math.log(d) + 0.0004034 * h * h + 0.00186 * Math.max(0, t + 5) ** 3 + 0.004192 * (100 - f) ** 2 + 0.0003681 * Math.max(0, v) * Math.max(0, 100 - f) ** 2.5,
  );
export const ETP_SMSR_PL = "ETP SMSR (Doroszewski i in. 2012)";

export async function getMeteo(lonLat: LonLat, date: string, crop: Crop, signal?: AbortSignal): Promise<{ data: MeteoOut; source: SourceInfo }> {
  const t0 = Date.now();
  const today = todayPL();
  const [lon, lat] = lonLat;
  const Y = Number(date.slice(0, 4));
  const firstSeason = (date.slice(5) >= "09-30" ? Y : Y - 1) - 9;
  // 10 seasons + percentile windows + FAO-56 season start (1.III)
  const start = [addDays(shiftYears(date, -10), -70), `${firstSeason}-03-01`].sort()[0];
  // history: NASA POWER from Jan 1 (cache-friendly start); recent days + forecast: Open-Meteo forecast API (not the archive: 429 on free tier)
  const powerStart = `${Number(start.slice(0, 4))}-01-01`;
  const recent = daysBetween(date, today) <= 85;
  // no future leakage: for past dates nothing after the analysis date is used; only "today" gets the forecast
  const horizon = date >= today ? addDays(date, 10) : date;
  const [arch, fc] = await Promise.allSettled([
    powerSeries(lon, lat, powerStart, signal),
    recent ? omForecast(lon, lat, signal) : Promise.reject(new Error("skip")),
  ]);
  const S = new Map<string, Day>();
  if (arch.status === "fulfilled") for (const [d, v] of arch.value) if (d <= horizon) S.set(d, { ...v, ei: null, fc: false });
  const put = (d: Daily) => {
    (d.time ?? []).forEach((day, i) => {
      if (day > horizon) return;
      const rhMin = num(d.relative_humidity_2m_min, i);
      const v: Day = {
        p: num(d.precipitation_sum, i),
        e: num(d.et0_fao_evapotranspiration, i),
        t: num(d.temperature_2m_max, i),
        tm: num(d.temperature_2m_mean, i),
        sun: num(d.sunshine_duration, i),
        ei: null,
        // forecast API values for days up to today are model analyses; "fc" marks days not covered by the archive
        fc: true,
        f: rhMin === null ? null : Math.min(100, rhMin + 5),
        v: num(d.wind_speed_10m_mean, i),
      };
      const cur = S.get(day);
      if (!cur || cur.p === null || cur.e === null) if (v.p !== null && v.e !== null) S.set(day, v);
      if (!S.has(day)) S.set(day, v);
    });
  };
  if (fc.status === "fulfilled") put(fc.value as Daily);
  if (arch.status !== "fulfilled" && fc.status !== "fulfilled") throw new Error("meteo down");

  // ETP SMSR: eq. 2 with monthly-equivalent inputs per decade (1–10, 11–20, 21–end), spread evenly over the decade's days
  const decKey = (d: string) => `${d.slice(0, 7)}-${Number(d.slice(8, 10)) <= 10 ? 1 : Number(d.slice(8, 10)) <= 20 ? 2 : 3}`;
  const decs = new Map<string, { d: number; sun: number; t: number; f: number; v: number; n: number }>();
  for (const [d, v] of S) {
    if (v.tm === null || v.sun === null || v.f === null || v.f === undefined || v.v === null || v.v === undefined) continue;
    const k = decKey(d);
    const o = decs.get(k) ?? { d: 0, sun: 0, t: 0, f: 0, v: 0, n: 0 };
    o.d += dayLength(lat, d);
    o.sun += v.sun / 3600;
    o.t += v.tm;
    o.f += v.f;
    o.v += v.v;
    o.n++;
    decs.set(k, o);
  }
  for (const [d, v] of S) {
    const o = decs.get(decKey(d));
    if (!o || o.n < 5) continue;
    const n = dim(Number(d.slice(0, 4)), monthOf(d));
    v.ei = etpSmsrMonth(o.d / o.n, (o.sun / o.n) * n, o.t / o.n, o.f / o.n, o.v / o.n) / n;
  }

  const days = [...S.keys()].sort();
  const okDay = (d: string) => {
    const v = S.get(d);
    return !!v && v.p !== null && v.e !== null;
  };
  let end = date;
  for (let k = 0; k < 10 && !okDay(end); k++) end = addDays(end, -1);
  if (!okDay(end)) throw new Error("no data near date");
  let lagFrom: string | null = null;
  for (let d = addDays(end, -15); d <= end; d = addDays(d, 1)) if (S.get(d)?.fc && !lagFrom) lagFrom = d;

  const kbw = (a: string, b: string): KbwSum | null => {
    let pm = 0, iu = 0, p = 0, n = 0, ni = 0, f = 0;
    const total = daysBetween(a, b) + 1;
    for (let d = a; d <= b; d = addDays(d, 1)) {
      const v = S.get(d);
      if (!v || v.p === null || v.e === null) continue;
      pm += v.p - v.e;
      p += v.p;
      n++;
      if (v.ei !== null) {
        iu += v.p - v.ei;
        ni++;
      }
      if (v.fc) f++;
    }
    if (n < total * 0.8) return null;
    return { pm: r0(pm), iung: ni >= n * 0.9 ? r0(iu) : null, p: r0(p), days: n, total, forecastDays: f };
  };

  const kc = (d: string) => crop.kc[monthOf(d) - 1] ?? 0;
  const w30s = addDays(end, -29);
  const sum30 = (f: (v: Day, d: string) => number | null) => {
    let s = 0, n = 0;
    for (let d = w30s; d <= end; d = addDays(d, 1)) {
      const v = S.get(d);
      const x = v ? f(v, d) : null;
      if (x === null) continue;
      s += x;
      n++;
    }
    return n >= 24 ? (s * 30) / n : null;
  };
  const p30Past: number[] = [];
  const e30Past: number[] = [];
  for (let y = 1; y <= 10; y++) {
    const k = kbw(shiftYears(w30s, -y), shiftYears(end, -y));
    if (k && k.days >= 28) {
      p30Past.push(k.p);
      e30Past.push(k.p - k.pm);
    }
  }
  const tmax: number[] = [];
  for (let d = w30s; d <= end; d = addDays(d, 1)) {
    const t = S.get(d)?.t;
    if (typeof t === "number") tmax.push(t);
  }
  let run = 0, dryMax = 0;
  for (let d = addDays(end, -59); d <= end; d = addDays(d, 1)) {
    const p = S.get(d)?.p;
    run = typeof p === "number" && p < 1 ? run + 1 : 0;
    dryMax = Math.max(dryMax, run);
  }
  // monthly climatology (complete months, 10 years before the date)
  const ym = new Map<string, { p: number; etc: number; n: number }>();
  const climStart = shiftYears(end, -10);
  for (const d of days) {
    if (d < climStart || d > end) continue;
    const v = S.get(d)!;
    if (v.p === null || v.e === null) continue;
    const o = ym.get(d.slice(0, 7)) ?? { p: 0, etc: 0, n: 0 };
    o.p += v.p;
    o.etc += v.e * kc(d);
    o.n++;
    ym.set(d.slice(0, 7), o);
  }
  const monthly: MeteoOut["meteo"]["monthly"] = [];
  for (let m = 1; m <= 12; m++) {
    const list = [...ym.entries()].filter(([k, o]) => Number(k.slice(5, 7)) === m && o.n >= dim(Number(k.slice(0, 4)), m) - 1).map(([, o]) => o);
    if (list.length) monthly.push({ month: m, pMm: r0(list.reduce((s, o) => s + o.p, 0) / list.length), etcMm: r0(list.reduce((s, o) => s + o.etc, 0) / list.length) });
  }

  const firstDay = days.find(okDay) ?? start;
  const lastDay = [...days].reverse().find(okDay) ?? end;
  const archiveOk = arch.status === "fulfilled";
  const p30 = sum30((v) => v.p);
  const detail =
    `${archiveOk ? `NASA POWER (MERRA-2, ~0,5°, ok. 50 km) ${firstDay}..${end}` : `tylko Open-Meteo (model prognostyczny) ${firstDay}..${end}, bez 10-letniego tła NASA POWER`}` +
    `; ETP SMSR (Doroszewski i in. 2012, wzór 2) do progów suszy, ET0 FAO-56 do bilansu wody w glebie` +
    (fc.status === "fulfilled" && (lagFrom || lastDay > date) ? `; ostatnie dni${lastDay > date ? " i prognoza" : ""}: Open-Meteo (~10 km)` : "") +
    (lagFrom ? `; od ${lagFrom} z Open-Meteo (opóźnienie archiwum)` : "") +
    (lastDay > date ? `; prognoza do ${lastDay}` : "; bez danych po dacie analizy") +
    `; punkt ${lat.toFixed(2)}N ${lon.toFixed(2)}E (warunki rejonu, nie pomiar na polu)`;
  return {
    data: {
      et0_30NormMm: e30Past.length >= 5 ? r0(e30Past.reduce((a, b) => a + b, 0) / e30Past.length) : null,
      archiveOk,
      meteo: {
        precip30Mm: p30 === null ? null : r0(p30),
        precip30NormMm: p30Past.length >= 5 ? r0(p30Past.reduce((a, b) => a + b, 0) / p30Past.length) : null,
        et0_30Mm: (() => { const x = sum30((v) => v.e); return x === null ? null : r0(x); })(),
        etc30Mm: (() => { const x = sum30((v, d) => (v.e === null ? null : v.e * kc(d))); return x === null ? null : r0(x); })(),
        tmax30MeanC: tmax.length >= 20 ? r1(tmax.reduce((a, b) => a + b, 0) / tmax.length) : null,
        dryDaysMax: dryMax,
        monthly,
      },
      kbw,
      day: (d) => S.get(d),
      dataEnd: end,
      lagFrom,
      hasForecast: fc.status === "fulfilled",
      firstDay,
      lastDay,
    },
    source: source("OpenMeteo", "Opady, parowanie, temperatura (NASA POWER + Open-Meteo)", `${LICENSE_POWER}; ${LICENSE_OM}`, t0, archiveOk ? "ok" : "partial", detail, {
      url: "https://power.larc.nasa.gov",
      note: [end !== date ? `Ostatni dzień z danymi: ${end}.` : "", "Dane meteorologiczne: NASA POWER Project (LaRC) oraz Open-Meteo.com (CC BY 4.0)."].filter(Boolean).join(" "),
    }),
  };
}

/* ---------- IMGW warnings (only for today) ---------- */
const toLevel = (v: unknown) => {
  const n = Number(v);
  return n >= 3 ? 3 : n >= 2 ? 2 : 1;
};

export async function getImgwWarnings(powiatTeryt: string, signal?: AbortSignal): Promise<{ data: Assessment["meteo"]["warnings"]; source: SourceInfo }> {
  const t0 = Date.now();
  const url = "https://danepubliczne.imgw.pl/api/data/warningsmeteo";
  const label = "Ostrzeżenia meteorologiczne (IMGW-PIB)";
  try {
    const res = await fetchT(url, { timeoutMs: 5000, signal });
    const j: unknown = await res.json();
    const out: Assessment["meteo"]["warnings"] = [];
    if (Array.isArray(j)) {
      for (const w of j as Record<string, unknown>[]) {
        const t = w?.teryt;
        const list = Array.isArray(t) ? t.map(String) : typeof t === "string" ? t.split(/[,\s]+/) : [];
        if (!list.some((c) => c.startsWith(powiatTeryt))) continue;
        out.push({ event: String(w.nazwa_zdarzenia ?? "Ostrzeżenie meteorologiczne"), level: toLevel(w.stopien), validTo: String(w.obowiazuje_do ?? "") });
      }
    }
    return { data: out, source: source("IMGW", label, LICENSE_IMGW, t0, "ok", `ostrzeżenia aktualne dla powiatu ${powiatTeryt}: ${out.length}`, { url: "https://danepubliczne.imgw.pl" }) };
  } catch {
    return { data: [], source: source("IMGW", label, LICENSE_IMGW, t0, "missing", "brak odpowiedzi API IMGW-PIB", { url: "https://danepubliczne.imgw.pl" }) };
  }
}
