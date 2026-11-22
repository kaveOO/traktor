import { getCrop, phaseOf, type Crop } from "./crops";
import { ETP_SMSR_PL, getImgwWarnings, getMeteo, LICENSE_IMGW, LICENSE_OM, type KbwSum, type MeteoOut } from "./meteo";
import { LICENSE_POWER } from "./power";
import { EMPTY_SAT, satelliteSafe } from "./satellite-adapter";
import { inSmsrSeason, SMSR_GROUP, SMSR_GROUP_PL, smsrThreshold, windowsOf, type SmsrWindow } from "./smsr";
import { categoryFromTexture, getIungCategory, getSoilGrids, type LandUse } from "./soil";
import { getTerrain, getWatercourses } from "./terrain";
import type { AnalysisRequest, AnalysisResult, Assessment, Cause, Irrigation, Level, Parcel, Recommendation, SourceInfo, Uncertainty } from "./types";
import { AmbiguousParcel, getParcelById, getParcelByXY, type ParcelCandidate } from "./uldk";
import { addDays, daysBetween, fmtPL, r0, shiftYears, todayPL, UpstreamError } from "./util";
import { withNetScope } from "./net";

export class AnalysisFailure extends Error {
  code: string;
  messagePl: string;
  step?: string;
  candidates?: ParcelCandidate[];
  constructor(code: string, messagePl: string, step?: string, candidates?: ParcelCandidate[]) {
    super(code);
    this.code = code;
    this.messagePl = messagePl;
    this.step = step;
    this.candidates = candidates;
  }
}
const LAND_PL: Record<string, string> = { las: "las", woda: "wody", zabudowa: "teren zabudowany", nieuzytki: "drogi lub nieużytki", inne: "teren nierolniczy" };

export const MAX_AREA_HA = 500;
const LEVELS: Level[] = ["niskie", "umiarkowane", "wysokie", "bardzo_wysokie"];
export const LEVEL_PL: Record<Level, string> = { niskie: "niskie", umiarkowane: "umiarkowane", wysokie: "wysokie", bardzo_wysokie: "bardzo wysokie" };
const CAT_IDX = { I: 0, II: 1, III: 2, IV: 3 } as const;
/** IUNG WOD mid-class (mm, root zone) per category, used as TAW when the IUNG category is known */
const WOD_MID = [110, 149, 186, 220];
/** largest sensible single net irrigation dose (mm) per soil category I..IV: light soils hold less water */
const MAX_DOSE = [20, 25, 30, 35];
const MONTHS_PL = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const MONTHS_GEN = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const WINTER_CROPS = new Set(["pszenica_ozima", "zyto", "rzepak_ozimy", "sad", "uzytki_zielone"]);
const mm = (n: number | null | undefined) => `${fmtPL(n)} mm`;
const signed = (n: number | null | undefined) => (n === null || n === undefined ? "b.d." : n > 0 ? `+${fmtPL(n)}` : fmtPL(n).replace("-", "−"));
const dayPl = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS_GEN[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const POWER_PL = "NASA POWER + Open-Meteo";

async function capped<T>(p: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([p, new Promise<T>((res) => (timer = setTimeout(() => res(fallback()), Math.max(0, ms))))]);
  } catch {
    return fallback();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const miss = (id: SourceInfo["id"], label: string, license: string, detail: string, url?: string): SourceInfo => ({
  id, label, detail, status: "missing", fetchedAt: new Date().toISOString(), ms: 0, license, url,
});

/** empirical percentile of v among past values (rank − 0.5)/n, n includes v */
function percentile(v: number, past: number[]): number | null {
  if (past.length < 5) return null;
  const all = [...past, v];
  const rank = 1 + past.filter((x) => x < v).length + past.filter((x) => x === v).length / 2;
  return Math.round((100 * (rank - 0.5)) / all.length);
}

type Thr = number | null | "niewskazana" | "brak";
/** ratio = KBW / threshold (0 when KBW ≥ 0); null when the window has no numeric threshold */
type WinEval = { w: SmsrWindow; k: KbwSum; K: number; thr: Thr; ratio: number | null; partial: boolean; projected?: number | null; projRatio?: number | null; projSrc?: string };

export type AnalyzeOptions = { budgetMs?: number; signal?: AbortSignal };

/** One analysis = one outbound connection budget (Workers: 6 open connections per request, see net.ts). */
export function analyze(req: AnalysisRequest, opts: AnalyzeOptions | number = {}): Promise<AnalysisResult> {
  return withNetScope(() => analyzeIn(req, opts));
}

async function analyzeIn(req: AnalysisRequest, opts: AnalyzeOptions | number): Promise<AnalysisResult> {
  const o = typeof opts === "number" ? { budgetMs: opts } : opts;
  const budgetMs = o.budgetMs ?? 24000;
  const t0 = Date.now();
  const ctrl = new AbortController();
  const kill = setTimeout(() => ctrl.abort(), budgetMs);
  const onOuter = () => ctrl.abort();
  o.signal?.addEventListener("abort", onOuter, { once: true });
  try {
    const crop: Crop = getCrop(req.crop);
    const date = req.date;
    const today = todayPL();
    const isToday = date === today;
    const month = Number(date.slice(5, 7));
    const Y = Number(date.slice(0, 4));
    const pTab = crop.p ?? 0.5;
    const phase = phaseOf(crop, date);
    // winter crops rest from November to February (low Kc); satellite drops then are not water stress
    const dormant = crop.kc[0] > 0 && crop.kc[0] <= 0.4 && (month >= 11 || month <= 2) && !crop.permanent;

    /* 1. parcel */
    let parcel: Parcel;
    let uldkSrc: SourceInfo;
    try {
      const r = req.parcelId ? await getParcelById(req.parcelId, ctrl.signal) : await getParcelByXY(req.lonLat![0], req.lonLat![1], ctrl.signal);
      parcel = r.parcel;
      uldkSrc = r.source;
    } catch (e) {
      if (e instanceof AmbiguousParcel) throw new AnalysisFailure("AMBIGUOUS", e.userPl ?? "Kilka działek pasuje.", "dzialka", e.candidates);
      if (e instanceof UpstreamError && e.message === "need obreb")
        throw new AnalysisFailure("NEEDS_OBREB", e.userPl ?? "Sam numer działki nie wystarczy: podaj obręb (np. „Kobylniki 306/2”) albo pełny identyfikator.", "dzialka");
      const msg = e instanceof UpstreamError && e.userPl ? e.userPl : "Nie udało się pobrać granic działki z ULDK.";
      throw new AnalysisFailure(e instanceof UpstreamError && e.message === "not found" ? "parcel_not_found" : "uldk_error", msg, "dzialka");
    }
    if (parcel.areaHa > MAX_AREA_HA)
      throw new AnalysisFailure("parcel_too_large", `Działka ${parcel.id} ma ${fmtPL(parcel.areaHa)} ha. Analizujemy działki do ${MAX_AREA_HA} ha.`, "dzialka");
    const powiat = parcel.id.slice(0, 4);
    // one deadline for all sources after ULDK (~20 s), never past the outer budget
    const deadline = Math.min(Date.now() + 20000, t0 + budgetMs - 1000);
    const leftD = () => deadline - Date.now();

    /* 2. all sources in parallel; the IUNG land-use gate is checked as soon as IUNG answers */
    const iungP = capped(getIungCategory(parcel, ctrl.signal), Math.min(5500, leftD()), () => ({
      data: null as Assessment["soil"]["iungCategory"],
      landUse: null as LandUse | null,
      clipped: false,
      source: miss("IUNG", "Kategoria podatności gleby na suszę (IUNG-PIB)", "IUNG-PIB, mapa podatności gleb na suszę (warunki ponownego wykorzystania do potwierdzenia)", "limit czasu"),
    }));
    const satBudget = Math.max(3000, Math.min(15000, leftD() - 300));
    const restP = Promise.all([
      capped(
        getMeteo(parcel.centroid, date, crop, ctrl.signal).then((x) => x as { data: MeteoOut | null; source: SourceInfo }),
        Math.min(19000, leftD()),
        () => ({ data: null, source: miss("OpenMeteo", `Opady, parowanie, temperatura (${POWER_PL})`, `${LICENSE_POWER}; ${LICENSE_OM}`, "brak odpowiedzi NASA POWER i Open-Meteo w limicie czasu", "https://power.larc.nasa.gov") }),
      ),
      capped(getSoilGrids(parcel.centroid, crop, ctrl.signal), Math.min(14000, leftD()), () => ({
        data: { sandPct: null, clayPct: null, socGkg: null, awcMm: null, textureClassPl: null },
        source: miss("SoilGrids", "Uziarnienie i węgiel organiczny gleby (SoilGrids 250 m)", "SoilGrids 2.0, ISRIC, CC BY 4.0", "limit czasu"),
      })),
      capped(getTerrain(parcel, ctrl.signal), Math.min(14000, leftD()), () => ({
        data: { elevMin: null, elevMax: null, slopePct: null, lowPoint: null },
        source: miss("NMT", "Wysokości terenu (NMT GUGiK)", "GUGiK NMT, dane otwarte", "limit czasu"),
      })),
      capped(getWatercourses(parcel, ctrl.signal), Math.min(16500, leftD()), () => ({
        data: { ditchDistM: null, watercourses: [] as Assessment["terrain"]["watercourses"] },
        source: miss("BDOT10k", "Rowy i cieki w promieniu 1 km (OpenStreetMap)", "© OpenStreetMap contributors, ODbL", "brak danych (Overpass niedostępny)", "https://www.openstreetmap.org/"),
      })),
      capped(satelliteSafe(parcel, date, crop, satBudget, ctrl.signal), satBudget + 500, () => ({
        data: EMPTY_SAT,
        source: miss("Sentinel2", "Zdjęcia satelitarne Sentinel-2", `Contains modified Copernicus Sentinel data ${Y} (Copernicus Sentinel Data Legal Notice)`, "limit czasu"),
      })),
      isToday
        ? capped(getImgwWarnings(powiat, ctrl.signal), 6000, () => ({
            data: [] as Assessment["meteo"]["warnings"],
            source: miss("IMGW", "Ostrzeżenia meteorologiczne (IMGW-PIB)", LICENSE_IMGW, "limit czasu"),
          }))
        : Promise.resolve(null),
    ]);
    const iungR = await iungP;
    if (iungR.landUse && iungR.landUse.kind !== "rolna" && iungR.landUse.kind !== "organiczna") {
      ctrl.abort();
      restP.catch(() => undefined);
      throw new AnalysisFailure(
        "NOT_AGRICULTURAL",
        `Działka ${parcel.id} nie jest gruntem rolnym według mapy IUNG (${LAND_PL[iungR.landUse.kind] ?? "teren nierolniczy"}, ${Math.round((1 - iungR.landUse.agriShare) * 100)}% powierzchni). Analiza suszy rolniczej nie dotyczy tej działki.`,
        "dzialka",
      );
    }
    const [meteoR, sgR, nmtR, waterR, satR, imgwR] = await restP;

    const M = meteoR.data;
    const sat = satR.data;
    const iung = iungR.data;
    const organic = iungR.landUse?.kind === "organiczna";
    const soil: Assessment["soil"] = { iungCategory: iung, ...sgR.data };
    const terrain: Assessment["terrain"] = { ...nmtR.data, ...waterR.data, floodZone: null };
    // ISOK is not queried at all (no request, no failure): status stays "missing" for the contract, the text says why
    const isokSrc: SourceInfo = {
      ...miss("ISOK", "Strefy zagrożenia powodziowego (ISOK): nie pobierane, tylko link do mapy", "Wody Polskie / ISOK", "nie pobierane (tylko link do mapy ISOK)", "https://wody.isok.gov.pl/imap_kzgw/"),
      note: "Źródła nie odpytujemy automatycznie: to nie jest błąd ani limit czasu. Sprawdź strefę na mapie ISOK.",
    };
    // slope-based measures only with full NMT coverage (partial grids give unstable slopes)
    const slopeOk = nmtR.source.status === "ok" && terrain.slopePct !== null;

    /* 3. SMSR: soil category, windows, thresholds */
    const fallbackCat = !iung && !organic ? categoryFromTexture(soil.textureClassPl, soil.clayPct) : null;
    const cat = iung ?? fallbackCat;
    const catIdx = cat ? CAT_IDX[cat] : 2;
    const catLabel = iung ? `kat. ${iung}` : fallbackCat ? `kat. ${fallbackCat} (szacunek z SoilGrids)` : "kat. III (przyjęta, brak danych o glebie)";
    const group = SMSR_GROUP[crop.id];
    const beetNo = smsrThreshold(crop.id, catIdx, 0) === "niewskazana";
    const smsrUsable = !!group && !beetNo;
    const primary = (k: KbwSum) => k.iung ?? k.pm;
    const inSeason = inSmsrSeason(date);
    const notes: string[] = [];
    const evalOf = (w: SmsrWindow, k: KbwSum, partial: boolean): WinEval => {
      const thr = smsrThreshold(crop.id, catIdx, w.idx);
      const K = primary(k);
      return { w, k, K, thr, ratio: typeof thr === "number" ? (K < 0 ? K / thr : 0) : null, partial };
    };
    const worstOf = (list: WinEval[]) => list.filter((e) => e.ratio !== null).reduce<WinEval | null>((a, b) => (!a || (b.ratio ?? 0) > (a.ratio ?? 0) ? b : a), null);

    // completed windows of the current season up to the analysis date, plus the running one
    const done: WinEval[] = [];
    let current: WinEval | null = null;
    let fewDays: number | null = null;
    if (M && date.slice(5) >= "03-21") {
      const end = M.dataEnd;
      for (const w of windowsOf(Y)) {
        if (w.end <= end) {
          const k = M.kbw(w.start, w.end);
          if (k) done.push(evalOf(w, k, false));
        }
      }
      const run = inSeason ? windowsOf(Y).find((w) => w.start <= end && w.end > end) : undefined;
      if (run) {
        const k = M.kbw(run.start, end);
        if (k) {
          current = evalOf(run, k, true);
          if (k.days >= 20) {
            // projection to the window end: forecast (today only) or persistence of the last 7 days (past dates: no weather after the date)
            let s = 0, n = 0;
            const fcDays = isToday ? [1, 2, 3, 4, 5, 6, 7].map((i) => addDays(end, i)) : [];
            for (const d of fcDays) {
              const v = M.day(d);
              if (v && v.p !== null && v.e !== null) { s += v.p - (v.ei ?? v.e); n++; }
            }
            let src = "prognoza Open-Meteo na 7 dni";
            if (n < 5) {
              s = 0; n = 0;
              src = "przy pogodzie jak w ostatnich 7 dniach";
              for (let d = addDays(end, -6); d <= end; d = addDays(d, 1)) {
                const v = M.day(d);
                if (v && v.p !== null && v.e !== null) { s += v.p - (v.ei ?? v.e); n++; }
              }
            }
            if (n) {
              const projected = r0(current.K + (daysBetween(end, run.end) * s) / n);
              current.projected = projected;
              current.projSrc = src;
              current.projRatio = typeof current.thr === "number" ? (projected < 0 ? projected / current.thr : 0) : null;
            }
          } else fewDays = k.days;
        }
      }
    }
    const lastDone = done[done.length - 1] ?? null;
    const worstDone = worstOf(done);
    const seasonDrought = done.some((e) => typeof e.thr === "number" && e.K < e.thr);

    // reference window for kbw60/percentile: last completed SMSR window in season (ETP SMSR), else 60 days to date (ET0 FAO)
    const refInSeason = inSeason && !!lastDone;
    const refWin = refInSeason ? { a: lastDone!.w.start, b: lastDone!.w.end } : M ? { a: addDays(M.dataEnd, -59), b: M.dataEnd } : null;
    const refVal = (k: KbwSum) => (refInSeason ? primary(k) : k.pm);
    const etpMethodPl = refInSeason && lastDone?.k.iung !== null ? ETP_SMSR_PL : "ET0 FAO-56";
    const refK = refWin && M ? (refInSeason ? lastDone!.k : M.kbw(refWin.a, refWin.b)) : null;
    const past: number[] = [];
    if (M && refWin && M.archiveOk)
      for (let y = 1; y <= 10; y++) {
        const k = M.kbw(shiftYears(refWin.a, -y), shiftYears(refWin.b, -y));
        if (k) past.push(refVal(k));
      }
    const pct = refK ? percentile(refVal(refK), past) : null;

    /* seasons: last 10 completed SMSR seasons (+ the current one in progress) */
    const lastSeason = date.slice(5) >= "09-30" ? Y : Y - 1;
    const seasons: Assessment["meteo"]["seasons"] = [];
    let droughtPm = 0;
    let fallbackRule = false;
    if (M) {
      type Raw = { year: number; k: number; pm: number; thr: number | null; win: string; drought: boolean; droughtPm: boolean; inProgress: boolean };
      const raw: Raw[] = [];
      const seasonOf = (y: number, upTo: string | null): Raw | null => {
        const list: WinEval[] = [];
        for (const w of windowsOf(y)) {
          if (upTo && w.end > upTo) continue;
          const k = M.kbw(w.start, w.end);
          if (k) list.push(evalOf(w, k, false));
        }
        if (!list.length) return null;
        if (smsrUsable) {
          const wst = worstOf(list);
          if (!wst) return null;
          return {
            year: y, k: wst.K, pm: wst.k.pm, thr: typeof wst.thr === "number" ? wst.thr : null, win: wst.w.labelPl,
            drought: list.some((e) => typeof e.thr === "number" && e.K < e.thr),
            droughtPm: list.some((e) => typeof e.thr === "number" && e.k.pm < e.thr),
            inProgress: !!upTo,
          };
        }
        const wst = list.reduce((a, b) => (b.K < a.K ? b : a));
        return { year: y, k: wst.K, pm: wst.k.pm, thr: null, win: wst.w.labelPl, drought: false, droughtPm: false, inProgress: !!upTo };
      };
      if (lastSeason < Y && date.slice(5) >= "05-20") {
        const s = seasonOf(Y, M.dataEnd);
        if (s) raw.push(s);
      }
      for (let y = lastSeason; y > lastSeason - 10; y--) {
        const s = seasonOf(y, null);
        if (s) raw.push(s);
      }
      const completed = raw.filter((r) => !r.inProgress);
      if (!smsrUsable && completed.length >= 5) {
        // no SMSR threshold: standardised anomaly ≤ −1 (like SPEI), relative to this parcel's 10 years, do kalibracji
        fallbackRule = true;
        const mean = completed.reduce((s, r) => s + r.k, 0) / completed.length;
        const sd = Math.sqrt(completed.reduce((s, r) => s + (r.k - mean) ** 2, 0) / completed.length) || 1;
        raw.forEach((r) => (r.drought = r.droughtPm = (r.k - mean) / sd <= -1));
      }
      raw.forEach((r) => seasons.push({ year: r.year, kbwCriticalMm: r0(r.k), drought: r.drought, thresholdMm: r.thr, windowPl: r.win, ...(r.inProgress ? { inProgress: true } : {}) }));
      droughtPm = completed.filter((r) => r.droughtPm).length;
    }
    const completedSeasons = seasons.filter((s) => !s.inProgress);
    const droughtYears = M && completedSeasons.length ? completedSeasons.filter((s) => s.drought).length : null;

    /* 4. levels */
    const satComparable = sat.ndviNorm !== null && sat.ndmiNorm !== null;
    const ndmiAnom = sat.ndmi !== null && sat.ndmiNorm !== null ? sat.ndmi - sat.ndmiNorm : null;
    const ndviAnom = sat.ndvi !== null && sat.ndviNorm !== null ? sat.ndvi - sat.ndviNorm : null;
    const satPhaseOk = !phase && !dormant;
    let currentLevel: Level | null = null;
    let R: number | null = null; // KBW / threshold of the decisive window
    let decisive: WinEval | null = null;
    let decisiveProjected = false;
    let mode: "smsr" | "percentyl" | "poza_sezonem" = "percentyl";
    const bumps: string[] = [];
    const ratioLevel = (r: number) => (r >= 1 ? 3 : r >= 0.75 ? 2 : r >= 0.5 ? 1 : 0);
    const lastCompletedSeason = completedSeasons[0] ?? null;
    if (M && inSeason) {
      let s: number | null = null;
      if (smsrUsable) {
        const rDone = worstDone?.ratio ?? null;
        const rProj = current?.projRatio ?? null;
        if (rDone !== null || rProj !== null) {
          if (rProj !== null && (rDone === null || rProj > rDone)) {
            decisive = current;
            decisiveProjected = true;
            R = rProj;
            s = Math.min(ratioLevel(R), 2); // a projection alone never says "bardzo wysokie"
          } else {
            decisive = worstDone;
            R = rDone;
            s = ratioLevel(R!);
          }
          mode = "smsr";
        } else if (done.length || current) {
          const anyNumeric = [...done, ...(current ? [current] : [])].some((e) => typeof e.thr === "number");
          if (!anyNumeric && (done.length || (current && fewDays === null))) {
            R = 0;
            s = 0;
            mode = "smsr";
            notes.push(`SMSR nie określa suszy dla grupy „${SMSR_GROUP_PL[group!]}” w oknach do ${dayPl(M.dataEnd)} (poza okresem wrażliwości uprawy).`);
          }
        }
        if (fewDays !== null && mode !== "smsr") notes.push(`Za mało danych w bieżącym oknie SMSR (${fewDays} z 60 dni): ocena z percentyla bilansu, bez prognozy na koniec okna.`);
      }
      if (s === null && pct !== null) {
        s = pct <= 5 ? 3 : pct <= 10 ? 2 : pct <= 25 ? 1 : 0;
        mode = "percentyl";
      }
      if (s !== null && satPhaseOk && satComparable && R !== null && R >= 0.5 && ndmiAnom !== null && ndviAnom !== null && ndmiAnom <= -0.1 && ndviAnom <= -0.1 && s < 3) {
        s += 1;
        bumps.push("zdjęcie satelitarne: NDVI i NDMI wyraźnie niższe niż w poprzednich latach na tej działce");
      }
      if (s !== null) currentLevel = LEVELS[Math.max(0, Math.min(3, s))];
    } else if (M && !inSeason) {
      // outside 21.III–30.IX SMSR does not assess drought: level from the last season and the soil only, never inflated
      mode = "poza_sezonem";
      let s = 0;
      if (lastCompletedSeason?.drought) s = 1;
      else if ((cat === "I" || cat === "II") && lastCompletedSeason && typeof lastCompletedSeason.thresholdMm === "number" && lastCompletedSeason.kbwCriticalMm / lastCompletedSeason.thresholdMm >= 0.75) s = 1;
      currentLevel = LEVELS[s];
    }
    if (!group) notes.push("Dla użytków zielonych SMSR nie podaje progów suszy: ocena z percentyla bilansu, a sezony suszy z reguły zastępczej (anomalia ≤ −1 odch. std. względem 10 lat tej działki), do kalibracji.");
    if (beetNo) notes.push("SMSR: burak cukrowy na glebie kategorii I to „uprawa niewskazana” (brak progu suszy). Ocena z percentyla bilansu.");

    let historicalLevel: Level | null = null;
    if (droughtYears !== null && completedSeasons.length >= 5) {
      let s = droughtYears === 0 ? 0 : droughtYears <= 2 ? 1 : droughtYears <= 4 ? 2 : 3;
      if (slopeOk && (terrain.slopePct ?? 0) > 5) s += 1;
      historicalLevel = LEVELS[Math.min(3, s)];
    } else if (cat) historicalLevel = LEVELS[3 - CAT_IDX[cat]];

    const thrNum = (e: WinEval | null) => (e && typeof e.thr === "number" ? e.thr : null);
    const meteo: Assessment["meteo"] = {
      kbw60Mm: refK ? refVal(refK) : null,
      kbw60Percentile: pct,
      precip30Mm: M?.meteo.precip30Mm ?? null,
      precip30NormMm: M?.meteo.precip30NormMm ?? null,
      et0_30Mm: M?.meteo.et0_30Mm ?? null,
      etc30Mm: M?.meteo.etc30Mm ?? null,
      tmax30MeanC: M?.meteo.tmax30MeanC ?? null,
      dryDaysMax: M?.meteo.dryDaysMax ?? null,
      droughtYears,
      seasons,
      monthly: M?.meteo.monthly ?? [],
      warnings: imgwR?.data ?? [],
      smsrThresholdMm: mode === "smsr" ? thrNum(decisive) : null,
      smsrWindowPl: mode === "smsr" && decisive ? decisive.w.labelPl : null,
      smsrKbwMm: mode === "smsr" && decisive ? (decisiveProjected ? decisive.projected ?? decisive.K : decisive.K) : null,
      smsrWindowPartial: mode === "smsr" && decisive ? decisive.partial : null,
      smsrKbwProjected: mode === "smsr" && decisive ? decisiveProjected && decisive.projected != null : null,
      smsrProjectionPl: mode === "smsr" && decisive && decisiveProjected && decisive.projected != null ? decisive.projSrc ?? null : null,
      etpMethodPl,
    };

    /* 5. soil water balance (FAO-56), computed before the causes: it is evidence of a deficit */
    type Balance = { Dr: number; D7: number; RAW: number; TAW: number; sumPeEtc: number; rain7: number; aheadSrc: string; etcDay: number; seasonStart: string };
    let bal: Balance | null = null;
    let irrigation: Irrigation | null = null;
    let tawSrc = "";
    const historical = !isToday;
    const kcOf = (d: string) => crop.kc[Number(d.slice(5, 7)) - 1] ?? 0;
    const kcNow = kcOf(date);
    const firstKc = crop.kc.findIndex((k, i) => i >= 2 && k > 0);
    const seasonStart = WINTER_CROPS.has(crop.id) ? `${Y}-03-01` : `${Y}-${String(firstKc + 1).padStart(2, "0")}-01`;
    const growing = date >= seasonStart && kcNow >= 0.45 && !(month >= 10 && !inSeason);
    if (M && growing && !phase) {
      const TAW = cat && iung ? r0(WOD_MID[catIdx] * Math.min(1, crop.rootDepthM)) : soil.awcMm ?? (cat ? r0(WOD_MID[catIdx] * Math.min(1, crop.rootDepthM)) : r0(150 * Math.min(1, crop.rootDepthM)));
      tawSrc = iung ? `woda dostępna w strefie korzeni (TAW) ${TAW} mm z kategorii IUNG ${iung}` : soil.awcMm !== null ? `woda dostępna w strefie korzeni (TAW) ${TAW} mm (Saxton–Rawls, SoilGrids)` : `woda dostępna w strefie korzeni (TAW) ${TAW} mm (założona)`;
      const step = (d: string, D: number) => {
        const v = M.day(d);
        if (!v || v.p === null || v.e === null) return { D, ok: false, pe: 0, etc: 0, raw: 0 };
        const etcPot = kcOf(d) * v.e;
        const p = Math.max(0.1, Math.min(0.8, pTab + 0.04 * (5 - etcPot)));
        const raw = p * TAW;
        const ks = D <= raw ? 1 : Math.max(0, (TAW - D) / ((1 - p) * TAW));
        const pe = v.p < 0.2 * v.e ? 0 : v.p;
        const etc = ks * etcPot;
        return { D: Math.max(0, Math.min(TAW, D - pe + etc)), ok: true, pe, etc, raw, etcPot };
      };
      let Dr = 0;
      let rawNow = pTab * TAW;
      for (let d = seasonStart; d <= M.dataEnd; d = addDays(d, 1)) {
        const s = step(d, Dr);
        Dr = s.D;
        if (s.ok) rawNow = s.raw;
      }
      let etcSum = 0, etcN = 0;
      for (let d = addDays(M.dataEnd, -6); d <= M.dataEnd; d = addDays(d, 1)) {
        const v = M.day(d);
        if (v && v.e !== null) { etcSum += kcOf(d) * v.e; etcN++; }
      }
      // 7 days ahead: Open-Meteo forecast (today only); for past dates repeat the last 7 days (no weather after the date)
      let D7 = Dr, sumPeEtc = 0, n7 = 0, rain7 = 0;
      if (isToday)
        for (let d = addDays(M.dataEnd, 1); d <= addDays(M.dataEnd, 7); d = addDays(d, 1)) {
          const s = step(d, D7);
          if (!s.ok) continue;
          D7 = s.D; sumPeEtc += s.pe - s.etc; rain7 += s.pe; n7++;
        }
      const aheadSrc = n7 >= 5 ? "prognoza Open-Meteo na 7 dni" : historical ? "przy pogodzie jak w ostatnich 7 dniach; bez danych po dacie analizy" : "przy pogodzie jak w ostatnich 7 dniach";
      if (n7 < 5) {
        D7 = Dr; sumPeEtc = 0; rain7 = 0;
        for (let d = addDays(M.dataEnd, -6); d <= M.dataEnd; d = addDays(d, 1)) {
          const s = step(d, D7);
          if (!s.ok) continue;
          D7 = s.D; sumPeEtc += s.pe - s.etc; rain7 += s.pe;
        }
      }
      bal = { Dr, D7, RAW: rawNow, TAW, sumPeEtc, rain7, aheadSrc, etcDay: etcN ? etcSum / etcN : 3, seasonStart };
    }

    /* 6. causes (each one from data; the crop calendar only amplifies) */
    const causes: Cause[] = [];
    const winTxt = (e: WinEval, withProj = true) =>
      `${e.w.labelPl}${e.partial ? ` (do ${dayPl(M!.dataEnd)}, ${e.k.days} z ${daysBetween(e.w.start, e.w.end) + 1} dni)` : ""}: KBW ${signed(e.K)} mm${e.k.iung !== null ? ` (ETP SMSR; z ET0 FAO ${signed(e.k.pm)} mm)` : " (ET0 FAO)"}${withProj && e.partial && e.projected !== null && e.projected !== undefined ? `; na koniec okna ok. ${signed(e.projected)} mm ${e.projSrc}` : ""}`;
    const smsrPhrase = `próg suszy SMSR dla grupy „${group ? SMSR_GROUP_PL[group] : "-"}”, ${catLabel}`;
    {
      const ev: string[] = [];
      let w: 1 | 2 | 3 = 1;
      if (mode === "smsr" && decisive && typeof decisive.thr === "number" && R !== null && R >= 0.75) {
        ev.push(`${decisiveProjected ? "Trwające okno SMSR" : "Najgorsze okno SMSR w tym sezonie"} ${winTxt(decisive)}; ${smsrPhrase}: ${signed(decisive.thr)} mm.`);
        if (!decisiveProjected && lastDone && lastDone !== decisive) ev.push(`Ostatnie zakończone okno ${winTxt(lastDone, false)}.`);
        w = R >= 1 ? 3 : 2;
      } else if (mode !== "smsr" && pct !== null && pct <= 20 && refK && refVal(refK) < -30) {
        ev.push(`Bilans opadu i parowania (${etpMethodPl}) od ${dayPl(refWin!.a)} do ${dayPl(refWin!.b)}: ${signed(refVal(refK))} mm, ${pct}. percentyl na tle ${past.length} poprzednich lat.`);
        w = pct <= 10 ? 2 : 1;
      }
      const p = meteo.precip30Mm;
      const pn = meteo.precip30NormMm;
      if (p !== null && pn !== null && pn > 10 && p < 0.6 * pn) {
        ev.push(`Opad z 30 dni: ${mm(p)}, ${r0((100 * p) / pn)}% średniej z 10 lat (${mm(pn)}).`);
        w = Math.max(w, 2) as 1 | 2 | 3;
      }
      if (bal && bal.Dr >= 0.7 * bal.RAW) {
        ev.push(`Model wody w glebie (FAO-56, od ${dayPl(bal.seasonStart)}): ubytek ${r0(bal.Dr)} mm wobec progu stresu ${r0(bal.RAW)} mm.`);
        if (bal.Dr >= bal.RAW) w = Math.max(w, 2) as 1 | 2 | 3;
      }
      if (droughtYears !== null && droughtYears >= 3) {
        ev.push(`Susza ${fallbackRule ? "(reguła zastępcza)" : "wg progów SMSR"} w ${droughtYears} z ${completedSeasons.length} ostatnich sezonów${!fallbackRule && droughtPm !== droughtYears ? ` (z ET0 FAO: ${droughtPm})` : ""}.`);
        if (droughtYears >= 5) w = Math.max(w, 2) as 1 | 2 | 3;
      }
      if (ev.length) causes.push({ id: "deficyt_opadow", titlePl: "Niedobór opadów względem parowania", evidencePl: ev.join(" "), weight: w, sources: ["OpenMeteo", ...(iung ? (["IUNG"] as const) : [])] });
    }
    const etNorm = M?.et0_30NormMm ?? null;
    const hot = meteo.tmax30MeanC !== null && meteo.tmax30MeanC >= 25;
    const highEt = meteo.et0_30Mm !== null && meteo.et0_30Mm >= 110 && etNorm !== null && meteo.et0_30Mm >= 1.1 * etNorm;
    if ((hot || highEt) && kcNow > 0 && !phase) {
      causes.push({
        id: "upal",
        titlePl: hot ? "Wysoka temperatura i parowanie" : "Duże parowanie",
        evidencePl: `Średnia temperatura maksymalna z 30 dni: ${fmtPL(meteo.tmax30MeanC, 1)} °C; parowanie ET0 (FAO): ${mm(meteo.et0_30Mm)} w 30 dni${etNorm !== null ? `, średnio ${mm(etNorm)} w tych dniach w poprzednich latach` : ""} (warunki rejonu).`,
        weight: (meteo.tmax30MeanC ?? 0) >= 28 ? 3 : 2,
        sources: ["OpenMeteo"],
      });
    }
    const soilCause = cat === "I" || cat === "II";
    {
      const ev: string[] = [];
      let w: 1 | 2 | 3 = 1;
      if (soilCause) {
        ev.push(`Gleba ${cat === "I" ? "bardzo podatna" : "podatna"} na suszę (${catLabel}, SMSR IUNG).`);
        w = cat === "I" ? 3 : 2;
      }
      if (soil.awcMm !== null && soil.awcMm < 100) {
        ev.push(`Woda dostępna w strefie korzeni (${fmtPL(crop.rootDepthM, 1)} m): szacunek ok. ${mm(soil.awcMm)} (${soil.textureClassPl ?? "b.d."}, piasek ${soil.sandPct}%, ił ${soil.clayPct}%; SoilGrids).`);
        w = Math.max(w, soil.awcMm < 60 ? 3 : 2) as 1 | 2 | 3;
      }
      if (soil.socGkg !== null && soil.socGkg < 8) ev.push(`Mało węgla organicznego: ${fmtPL(soil.socGkg, 1)} g/kg w warstwie 0–30 cm (szacunek SoilGrids).`);
      if (ev.length) causes.push({ id: "niska_retencja_gleby", titlePl: "Gleba słabo zatrzymuje wodę", evidencePl: ev.join(" "), weight: w, sources: [...(iung ? (["IUNG"] as const) : []), ...(soil.sandPct !== null ? (["SoilGrids"] as const) : [])] });
    }
    if (slopeOk && terrain.slopePct! >= 2) {
      causes.push({
        id: "odplyw_powierzchniowy",
        titlePl: "Woda spływa po spadku terenu",
        evidencePl: `Średni spadek działki ok. ${fmtPL(terrain.slopePct, 1)}% (${terrain.slopePct! > 10 ? "bardzo duży" : terrain.slopePct! > 5 ? "duży" : "umiarkowany"} spływ), różnica wysokości ${fmtPL((terrain.elevMax ?? 0) - (terrain.elevMin ?? 0), 1)} m (NMT).`,
        weight: terrain.slopePct! >= 5 ? 3 : 2,
        sources: ["NMT"],
      });
    }
    const has = (id: Cause["id"]) => causes.some((c) => c.id === id);
    // the crop calendar is a modifier: only next to a water cause backed by data, never on its own
    if (crop.critical.includes(month) && !phase && (has("deficyt_opadow") || has("upal") || has("niska_retencja_gleby"))) {
      causes.push({
        id: "wrazliwa_uprawa",
        titlePl: "Uprawa w okresie krytycznym",
        evidencePl: `${crop.namePl}: ${MONTHS_PL[month - 1]} to okres największej wrażliwości na brak wody (${crop.critical.map((m) => MONTHS_PL[m - 1]).join(", ")}); wzmacnia skutki przyczyn opisanych wyżej.`,
        weight: 2,
        sources: [],
      });
    }
    const meteoCause = (R !== null && R >= 0.5) || (mode !== "smsr" && pct !== null && pct <= 25);
    if (satPhaseOk && satComparable && (meteoCause || soilCause) && ((ndviAnom !== null && ndviAnom <= -0.1) || (ndmiAnom !== null && ndmiAnom <= -0.08))) {
      causes.push({
        id: "stres_roslin",
        titlePl: "Zdjęcie satelitarne potwierdza słabszy stan roślin",
        evidencePl: `Sentinel-2${sat.sceneDate ? ` ${sat.sceneDate}` : ""}: ${sat.anomalyPl ?? `NDVI ${fmtPL(sat.ndvi, 2)} (poprzednie lata: ${fmtPL(sat.ndviNorm, 2)}), NDMI ${fmtPL(sat.ndmi, 2)} (${fmtPL(sat.ndmiNorm, 2)}). Uprawy w poprzednich latach mogły być inne.`}`,
        weight: (ndmiAnom ?? 0) <= -0.2 || (ndviAnom ?? 0) <= -0.2 ? 3 : 2,
        sources: ["Sentinel2"],
      });
    }
    if (phase && sat.ndvi !== null) notes.push(`${phase === "po_zbiorze" ? "Po żniwach" : "Dojrzewanie lub żniwa"} (${crop.namePl.toLowerCase()}): spadek NDVI jest naturalny, nie traktujemy go jako stresu wodnego.`);
    if (dormant && sat.ndvi !== null) notes.push(`Spoczynek zimowy (${crop.namePl.toLowerCase()}): zdjęcie satelitarne nie mówi o niedoborze wody.`);
    causes.sort((a, b) => b.weight - a.weight);
    const dataCauses = causes.filter((c) => c.id !== "wrazliwa_uprawa");
    const pick = (...ids: Cause["id"][]) => ids.filter(has);

    /* 7. recommendations (only from data-backed causes; NWRM catalogue; crop-aware) */
    const recs: Recommendation[] = [];
    const slope = slopeOk ? terrain.slopePct : null;
    const near = terrain.watercourses[0];
    const waterSrc: SourceInfo["id"][] = ["BDOT10k"];
    const osm = /OpenStreetMap|OSM/.test(waterR.source.label);
    const sowingNow = (crop.sowingMonths ?? []).includes(month);
    if ((has("deficyt_opadow") || has("niska_retencja_gleby")) && near && near.distM <= 300 && (slope === null || slope < 1)) {
      const touches = near.distM === 0;
      recs.push({
        id: "zastawka",
        kind: "retencja",
        titlePl: `Zastawka na ${near.kind === "rów" ? "rowie" : near.kind === "kanał" ? "kanale" : "cieku"}`,
        whyPl: `${has("deficyt_opadow") ? "Niedobór wody w bilansie. " : ""}${near.name} ${touches ? "przecina działkę lub biegnie wzdłuż jej granicy" : `płynie ok. ${near.distM} m od działki`}, teren ${slope === null ? "bez danych o spadku" : `płaski (spadek ${fmtPL(slope, 1)}%)`}. Woda zatrzymana w rowie podnosi poziom wody w glebie obok.`,
        howPl: "Piętrzyć wodę po roztopach i ulewach (zastawka, przepust z piętrzeniem). Otwierać przed zalaniem pól i przed pracami polowymi.",
        wherePl: touches ? `${near.name}, na granicy lub w obrębie działki` : `${near.name}, ok. ${near.distM} m od granicy działki`,
        priority: 1,
        basedOn: pick("deficyt_opadow", "niska_retencja_gleby"),
        legalPl: "Piętrzenie wody wymaga pozwolenia wodnoprawnego (Prawo wodne, art. 389 pkt 6) i uzgodnienia z Wodami Polskimi lub spółką wodną. Wymaga wizji lokalnej.",
        sources: [...waterSrc, ...(nmtR.source.status !== "missing" ? (["NMT"] as const) : []), ...(has("deficyt_opadow") ? (["OpenMeteo"] as const) : [])],
      });
    }
    if ((has("deficyt_opadow") || has("odplyw_powierzchniowy")) && slope !== null && slope >= 1 && terrain.lowPoint) {
      recs.push({
        id: "oczko",
        kind: "retencja",
        titlePl: "Małe oczko wodne lub niecka w najniższym miejscu",
        whyPl: `Woda spływa do najniższego punktu działki (${fmtPL(terrain.elevMin, 1)} m n.p.m., spadek ${fmtPL(slope, 1)}%). Zatrzymana tam zasila glebę zamiast odpłynąć.`,
        howPl: crop.permanent && crop.id === "sad" ? "Płytka niecka zbierająca spływ z międzyrzędzi; skarpy obsiać trawą. Wielkość dobrać do zlewni." : "Płytka niecka lub oczko zbierające spływ z pola; skarpy obsiać trawą. Wielkość dobrać do zlewni.",
        wherePl: "najniższy punkt działki (punkt na mapie)",
        location: terrain.lowPoint,
        priority: has("odplyw_powierzchniowy") ? 1 : 2,
        basedOn: pick("deficyt_opadow", "odplyw_powierzchniowy"),
        legalPl: "Wymaga uzgodnienia z Wodami Polskimi (zgłoszenie lub pozwolenie wodnoprawne zależnie od wielkości). Strefa powodziowa nie była sprawdzana. Wymaga wizji lokalnej.",
        sources: ["NMT"],
      });
    }
    if (has("odplyw_powierzchniowy")) {
      recs.push({
        id: "pas_buforowy",
        kind: "retencja",
        titlePl: crop.id === "uzytki_zielone" ? "Zadrzewienie lub żywopłot w poprzek spadku" : "Pas zieleni lub zadrzewienie w poprzek spadku",
        whyPl: `Spadek ok. ${fmtPL(slope, 1)}% przyspiesza spływ wody po opadach.`,
        howPl: crop.permanent ? "Pas krzewów lub drzew wzdłuż poziomic przy dolnej granicy działki." : "Pas trawy lub krzewów szerokości kilku metrów wzdłuż poziomic, przy dolnej granicy działki. Uprawa i siew w poprzek stoku.",
        wherePl: "dolna krawędź działki, w stronę najniższego punktu",
        location: terrain.lowPoint ?? undefined,
        priority: 2,
        basedOn: ["odplyw_powierzchniowy"],
        sources: ["NMT"],
      });
    }
    if (!recs.some((r) => r.kind === "retencja") && (has("deficyt_opadow") || has("niska_retencja_gleby")) && nmtR.source.status !== "missing") {
      // flat land without a mapped watercourse: the only generic retention measure is to keep drainage water in the field
      recs.push({
        id: "odplyw_drenarski",
        kind: "retencja",
        titlePl: "Regulowany odpływ z drenowania",
        whyPl: `${has("deficyt_opadow") ? "Niedobór wody w bilansie" : "Gleba słabo zatrzymuje wodę"}, a w pobliżu działki ${terrain.watercourses.length ? "nie ma rowu bliżej niż 300 m" : "nie znaleziono rowu ani cieku"}${slope !== null && slope < 1 ? " na płaskim terenie" : ""}. Jeśli pole jest zdrenowane, wiosną można zatrzymać część wody w glebie.`,
        howPl: "Na wylocie drenażu lub w studzience zbiorczej ustawić regulator odpływu (zastawkę drenarską); zamykać po roztopach, otwierać przed pracami polowymi i przy nadmiarze wody.",
        wherePl: "wylot drenażu lub rów odbiornik (do ustalenia w terenie)",
        priority: 3,
        basedOn: pick("deficyt_opadow", "niska_retencja_gleby"),
        legalPl: "Urządzenia melioracyjne zwykle należą do spółki wodnej: uzgodnij z nią lub z Wodami Polskimi. Wymaga wizji lokalnej (czy pole jest zdrenowane).",
        sources: [...waterSrc, "NMT"],
      });
    }
    const metSrc = (...extra: SourceInfo["id"][]): SourceInfo["id"][] => [...(has("deficyt_opadow") || has("upal") ? (["OpenMeteo"] as const) : []), ...extra];
    if (crop.id === "uzytki_zielone") {
      if (has("deficyt_opadow") || has("upal"))
        recs.push({
          id: "koszenie_wyzej",
          kind: "agrotechnika",
          titlePl: "Kosić wyżej i nie wypasać na krótko",
          whyPl: "Wyższa ruń osłania glebę i darń, mniej wody wyparowuje, trawa szybciej odrasta po suszy.",
          howPl: "Wysokość koszenia 7–10 cm; w suszy opóźnić kolejny pokos, nie wypasać do gołej darni.",
          priority: 2,
          basedOn: pick("deficyt_opadow", "upal"),
          sources: metSrc(),
        });
      if (has("niska_retencja_gleby"))
        recs.push({
          id: "podsiew_odporny",
          kind: "agrotechnika",
          titlePl: "Podsiew trawami odpornymi na suszę i nawożenie organiczne",
          whyPl: `Gleba słabo trzyma wodę (${catLabel}${soil.awcMm !== null ? `, szacunek ok. ${mm(soil.awcMm)} wody dostępnej w strefie korzeni` : ""}).`,
          howPl: "Podsiew mieszanką z kupkówką, stokłosą lub kostrzewą trzcinową; obornik lub kompost w umiarkowanych dawkach. Efekt po kilku sezonach.",
          priority: 2,
          basedOn: ["niska_retencja_gleby"],
          sources: [...(iung ? (["IUNG"] as const) : []), ...(soil.sandPct !== null ? (["SoilGrids"] as const) : [])],
        });
    } else if (crop.id === "sad") {
      if (has("deficyt_opadow") || has("upal") || has("niska_retencja_gleby"))
        recs.push({
          id: "mulcz_sad",
          kind: "agrotechnika",
          titlePl: "Mulcz w rzędach drzew, murawa w międzyrzędziach",
          whyPl: "Ściółka pod drzewami ogranicza parowanie z gleby i chwasty, które konkurują o wodę.",
          howPl: "Pas pod koronami: zrębki, kora lub słoma, warstwa 5–10 cm. Międzyrzędzia: murawa koszona nisko i często w suszy (mniej konkuruje o wodę).",
          priority: 2,
          basedOn: pick("deficyt_opadow", "upal", "niska_retencja_gleby"),
          sources: metSrc(...(has("niska_retencja_gleby") ? (["SoilGrids"] as const) : [])),
        });
      if (has("niska_retencja_gleby"))
        recs.push({
          id: "materia_organiczna",
          kind: "agrotechnika",
          titlePl: "Więcej materii organicznej w glebie",
          whyPl: `Gleba słabo trzyma wodę (${catLabel}${soil.awcMm !== null ? `, szacunek ok. ${mm(soil.awcMm)} wody dostępnej w strefie korzeni` : ""}).`,
          howPl: "Kompost lub obornik w pasach pod drzewami; mulcz organiczny rozkłada się i dokarmia glebę. Efekt po kilku latach.",
          priority: 2,
          basedOn: ["niska_retencja_gleby"],
          sources: ["SoilGrids"],
        });
    } else {
      const coverBasis = pick("niska_retencja_gleby", "odplyw_powierzchniowy", ...((droughtYears ?? 0) >= 3 ? (["deficyt_opadow"] as const) : []));
      if (coverBasis.length)
        recs.push({
          id: "miedzyplony",
          kind: "agrotechnika",
          titlePl: "Międzyplony po zbiorze",
          whyPl: "Okrywa roślinna ogranicza parowanie z gołej gleby i spływ, poprawia strukturę gleby.",
          howPl: "Wysiać międzyplon (np. gorczyca, facelia, mieszanki) zaraz po zbiorze przedplonu; zostawić na zimę jako mulcz.",
          priority: 2,
          basedOn: coverBasis,
          sources: [...(has("niska_retencja_gleby") ? (["IUNG", "SoilGrids"] as const) : []), ...(has("odplyw_powierzchniowy") ? (["NMT"] as const) : []), ...(coverBasis.includes("deficyt_opadow") ? (["OpenMeteo"] as const) : [])],
        });
      if (has("deficyt_opadow") || has("upal")) {
        recs.push({
          id: "mulcz",
          kind: "agrotechnika",
          titlePl: crop.id === "warzywa" ? "Ściółkowanie gleby" : "Zostawić resztki pożniwne na powierzchni",
          whyPl: "Mulcz osłania glebę przed słońcem i wiatrem, mniej wody wyparowuje.",
          howPl: crop.id === "warzywa" ? "Słoma, skoszona trawa lub agrowłóknina między rzędami; podlewać pod ściółkę." : "Słomę pociąć i rozrzucić równo; płytka uprawa zamiast orki tam, gdzie to możliwe.",
          priority: 2,
          basedOn: pick("deficyt_opadow", "upal"),
          sources: ["OpenMeteo"],
        });
        recs.push({
          id: "uprawa_uproszczona",
          kind: "agrotechnika",
          titlePl: "Ograniczyć liczbę uprawek",
          whyPl: "Każde przejście przesusza wierzchnią warstwę gleby.",
          howPl: "Uprawa bezorkowa lub łączenie zabiegów (agregat uprawowo-siewny); nie uprawiać w upał.",
          priority: 3,
          basedOn: pick("deficyt_opadow", "upal", "odplyw_powierzchniowy"),
          sources: ["OpenMeteo"],
        });
      }
      if (has("niska_retencja_gleby"))
        recs.push({
          id: "materia_organiczna",
          kind: "agrotechnika",
          titlePl: "Więcej materii organicznej w glebie",
          whyPl: `Gleba słabo trzyma wodę (${catLabel}${soil.awcMm !== null ? `, szacunek ok. ${mm(soil.awcMm)} wody dostępnej w strefie korzeni` : ""}).`,
          howPl: "Obornik, kompost, słoma, poplony. Materia organiczna poprawia strukturę i wsiąkanie wody; wpływ na pojemność wodną jest umiarkowany (rzędu 1% obj. wody na każde +10 g/kg węgla organicznego). Efekt po kilku latach.",
          priority: 2,
          basedOn: ["niska_retencja_gleby"],
          sources: ["SoilGrids"],
        });
      if (has("deficyt_opadow") && sowingNow)
        recs.push({
          id: "walowanie",
          kind: "agrotechnika",
          titlePl: "Wałowanie po siewie",
          whyPl: `${MONTHS_PL[month - 1][0].toUpperCase()}${MONTHS_PL[month - 1].slice(1)} to termin siewu (${crop.namePl.toLowerCase()}), a bilans wody jest ujemny: wałowanie poprawia podsiąk wody do nasion.`,
          howPl: "Wałem pierścieniowym zaraz po siewie, gdy gleba nie jest mokra.",
          priority: 3,
          basedOn: ["deficyt_opadow"],
          sources: ["OpenMeteo"],
        });
      if (has("deficyt_opadow") && (has("wrazliwa_uprawa") || (droughtYears ?? 0) >= 4))
        recs.push({
          id: "odmiana_termin",
          kind: "agrotechnika",
          titlePl: "Odmiana i termin siewu pod suszę",
          whyPl: `${crop.namePl} najbardziej potrzebuje wody w okresie: ${crop.critical.map((m) => MONTHS_PL[m - 1]).join(", ")}${droughtYears !== null ? `; susza w ${droughtYears} z ${completedSeasons.length} ostatnich sezonów` : ""}.`,
          howPl: "Odmiana tolerancyjna na suszę (lista odmian zalecanych COBORU dla województwa); siew w optymalnym, raczej wczesnym terminie.",
          priority: 3,
          basedOn: pick("deficyt_opadow", "wrazliwa_uprawa"),
          sources: ["OpenMeteo"],
        });
    }
    if (has("stres_roslin")) {
      recs.push({
        id: "lustracja",
        kind: "agrotechnika",
        titlePl: "Sprawdzić łan w terenie",
        whyPl: "Zdjęcie satelitarne pokazuje słabszy stan roślin niż w poprzednich latach na tej działce, przy niedoborze wody w bilansie lub słabej glebie.",
        howPl: "Obejrzeć miejsca o niskim NDVI: susza, choroby, szkodniki czy zagęszczenie gleby. Sprawdzić wilgotność gleby łopatą na 20–30 cm.",
        priority: 1,
        basedOn: pick("stres_roslin", "deficyt_opadow", "niska_retencja_gleby"),
        sources: ["Sentinel2"],
      });
    }

    /* 8. irrigation (optional): FAO-56 root-zone balance, capped single dose */
    if (M) {
      const prefix = historical ? `Na dzień ${dayPl(date)} zalecenie brzmiałoby: ` : "";
      const lowNeed = crop.id === "pszenica_ozima" || crop.id === "zyto" || crop.id === "jeczmien_jary" || crop.id === "uzytki_zielone";
      const scope = lowNeed ? " W zbożach i na użytkach zielonych nawadnianie jest rzadkie; najpierw retencja i agrotechnika." : "";
      if (phase) {
        irrigation = {
          decision: "nie_teraz",
          deficitMm: null,
          doseMm: null,
          timingPl: `${prefix}nie nawadniać.`,
          reasonPl: `${phase === "po_zbiorze" ? "Po zbiorze" : "Po fazie krytycznej: dojrzewanie lub żniwa"} (${crop.namePl.toLowerCase()}, ${MONTHS_PL[month - 1]}). Woda nie zwiększy już plonu.`,
        };
      } else if (!bal) {
        irrigation = {
          decision: "nie_teraz",
          deficitMm: null,
          doseMm: null,
          timingPl: `${prefix}nie nawadniać.`,
          reasonPl: `Poza okresem intensywnego wzrostu (${MONTHS_PL[month - 1]}, współczynnik uprawy Kc ${fmtPL(kcNow, 2)}); roślina zużywa mało wody.${scope}`,
        };
      } else {
        const { Dr, D7, RAW, sumPeEtc, rain7, aheadSrc, etcDay } = bal;
        let decision: Irrigation["decision"] = "nie_teraz";
        if ((Dr >= RAW && sumPeEtc < 0) || (D7 >= RAW && Dr >= 0.7 * RAW)) decision = "tak";
        else if (Dr >= 0.7 * RAW || D7 >= RAW || (Dr >= RAW && rain7 >= Dr - 0.5 * RAW)) decision = "rozwaz";
        const maxDose = MAX_DOSE[cat ? catIdx : 2];
        const need = r0(decision === "tak" ? Math.max(Dr, D7) : Dr);
        const dose = decision === "nie_teraz" ? null : Math.max(10, Math.min(maxDose, need));
        const nDoses = dose ? Math.max(1, Math.ceil(need / dose)) : 0;
        const every = dose ? Math.max(3, Math.min(10, Math.round(dose / Math.max(1, etcDay)))) : 0;
        const method = crop.id === "sad" ? "Linia kroplująca pod drzewami (kroplowe zużywa najmniej wody)" : crop.id === "warzywa" ? "Linia kroplująca lub zraszacze" : "Deszczownia";
        irrigation = {
          decision,
          deficitMm: r0(Dr),
          doseMm: dose,
          timingPl:
            prefix +
            (decision === "nie_teraz"
              ? "nie nawadniać; sprawdzić ponownie za tydzień."
              : `jednorazowo ok. ${dose} mm netto (${cat ? `kat. ${cat}: gleba ${catIdx <= 1 ? "lekka nie zatrzyma więcej" : "zatrzyma najwyżej tyle"}` : "większa dawka spłynie lub przesiąknie"}; brutto ok. ${r0((dose ?? 0) / 0.9)}–${r0((dose ?? 0) / 0.75)} mm zależnie od sprzętu), rano lub wieczorem.${nDoses > 1 ? ` Ubytek ok. ${need} mm uzupełniać w ${nDoses} dawkach co ok. ${every} dni.` : ""} Pominąć dawkę, jeśli spadnie ≥ ${Math.max(10, dose ?? 0)} mm deszczu. ${method}.`) +
            ` Za 7 dni ubytek wody ok. ${r0(D7)} mm (${aheadSrc}).`,
          reasonPl: `Bilans wody w strefie korzeni (FAO-56, od ${dayPl(bal.seasonStart)}, start: gleba pełna po zimie): ubytek ${r0(Dr)} mm, próg stresu ${r0(RAW)} mm, ${tawSrc}.${scope}`,
        };
        if (decision !== "nie_teraz") {
          const dataBasis = pick("deficyt_opadow", "upal", "niska_retencja_gleby");
          if (dataBasis.length)
            recs.push({
              id: "nawadnianie",
              kind: "nawadnianie",
              titlePl: decision === "tak" ? "Nawadnianie wskazane" : "Rozważyć nawadnianie",
              whyPl: irrigation.reasonPl,
              howPl: irrigation.timingPl,
              priority: decision === "tak" ? 1 : 2,
              basedOn: [...dataBasis, ...pick("wrazliwa_uprawa")],
              legalPl: "Pobór wody do nawadniania zwykle wymaga pozwolenia wodnoprawnego; sprawdź w Wodach Polskich.",
              sources: ["OpenMeteo", ...(iung ? (["IUNG"] as const) : soil.awcMm !== null ? (["SoilGrids"] as const) : [])],
            });
        }
      }
    }
    if (!M) {
      recs.push({
        id: "uzupelnij_dane",
        kind: "agrotechnika",
        titlePl: "Uzupełnić dane i ocenić działkę w terenie",
        whyPl: "Brak danych meteorologicznych: nie da się ocenić bilansu wody, więc nie podajemy zaleceń zależnych od pogody.",
        howPl: "Ponowić analizę za kilka minut. Do tego czasu ocenić wilgotność gleby łopatą na 20–30 cm i stan roślin na miejscu.",
        priority: 1,
        basedOn: [],
        sources: [],
      });
    }
    const kindOrder = { retencja: 0, agrotechnika: 1, nawadnianie: 2 } as const;
    recs.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.priority - b.priority);

    /* 9. uncertainty: six-item score (docs/review/07-science.md §4) */
    const reasonsPl: string[] = ["Opady i parowanie z modeli dla rejonu (NASA POWER ok. 50 km, ostatnie dni Open-Meteo ok. 10 km), nie pomiar na polu."];
    let score = 0;
    if (mode === "smsr" && decisive && typeof decisive.thr === "number") {
      const K = decisiveProjected ? decisive.projected ?? decisive.K : decisive.K;
      if (Math.abs(K - decisive.thr) < Math.max(25, 0.15 * Math.abs(decisive.thr))) {
        score++;
        reasonsPl.push(`Bilans blisko progu suszy SMSR (${signed(K)} mm wobec ${signed(decisive.thr)} mm).`);
      }
      if (decisive.k.iung !== null && (decisive.k.pm < decisive.thr) !== (decisive.k.iung < decisive.thr)) {
        score++;
        reasonsPl.push(`Werdykt zależy od metody parowania: z ${ETP_SMSR_PL} ${signed(decisive.k.iung)} mm, z ET0 FAO ${signed(decisive.k.pm)} mm (progi SMSR kalibrowano na ETP SMSR).`);
      }
      if (decisiveProjected) reasonsPl.push(`Ocena z trwającego okna ${decisive.w.labelPl}, ${decisive.projSrc}: to szacunek, nie wynik zakończonego okna.`);
    }
    reasonsPl.push(`Progi SMSR (rozporządzenie MRiRW z 2019 r.) porównujemy z ETP liczonym wzorem SMSR (Doroszewski i in. 2012) z danych modelowych; SMSR liczy z danych stacji IMGW. Wilgotność o 13:00 szacowana z temperatury maksymalnej, usłonecznienie z promieniowania.`);
    if (parcel.centroid[0] < 17.5 && M?.archiveOk) {
      score++;
      reasonsPl.push("Na zachodzie kraju opad z NASA POWER bywa zawyżony względem stacji IMGW (w 2018 r. o 35–60 mm na 60 dni w Lubuskiem i Wielkopolsce): susza może być niedoszacowana.");
    }
    if (!iung) {
      score++;
      reasonsPl.push(organic ? "Gleba organiczna (torf, mursz): IUNG nie nadaje kategorii; przyjęto kategorię III." : fallbackCat ? "Kategoria gleby oszacowana z SoilGrids (brak danych IUNG)." : "Brak kategorii gleby: przyjęto kategorię III.");
    }
    if (!iungR.landUse) {
      score++;
      if (sgR.source.status === "missing") score += 2;
    }
    if (satR.source.status === "missing" || (satComparable && ndmiAnom !== null && ndmiAnom <= -0.08 && !meteoCause && satPhaseOk) || (satComparable && ndmiAnom !== null && ndmiAnom > 0.08 && (R ?? 0) >= 1 && satPhaseOk)) {
      score++;
      reasonsPl.push(satR.source.status === "missing" ? "Brak zdjęcia satelitarnego do potwierdzenia." : "Zdjęcie satelitarne nie zgadza się z bilansem wodnym.");
    }
    if (M && (M.lagFrom || M.dataEnd !== date || (current && current.partial && current.k.forecastDays > 0))) {
      score++;
      reasonsPl.push(`Ostatnie dni z modelu prognostycznego lub z opóźnieniem archiwum${M.lagFrom ? ` (od ${M.lagFrom})` : ""}.`);
    }
    if (!group) {
      score++;
      reasonsPl.push("Użytki zielone: brak progu suszy SMSR.");
    }
    if (!M) score += 3;
    reasonsPl.push(...notes);
    reasonsPl.push("Gleba z map (IUNG, SoilGrids 250 m): szacunek, nie pomiar.");
    if (irrigation?.deficitMm !== null && irrigation) reasonsPl.push("Woda w glebie z modelu FAO-56 (start: gleba pełna po zimie; po suchej zimie ubytek zaniżony).");
    if (historical) reasonsPl.push(`Analiza na dzień ${dayPl(date)}: użyto wyłącznie danych do tego dnia (bez pogody, która nastąpiła później).`);
    const missingPl: string[] = [];
    if (!M) missingPl.push("Brak danych meteorologicznych (NASA POWER i Open-Meteo nie odpowiedziały): nie oceniono bilansu wody.");
    else if (!M.archiveOk) missingPl.push("Brak 10-letniego tła (NASA POWER nie odpowiedział): bez percentyla i historii sezonów; tylko ostatnie dni z Open-Meteo.");
    if (satR.source.status === "missing") missingPl.push(`Brak danych satelitarnych: ${satR.source.detail}.`);
    if (!iungR.landUse) missingPl.push("Nie potwierdzono, że to grunt rolny (mapa IUNG niedostępna). Sprawdź, czy działka jest polem uprawnym lub użytkiem zielonym.");
    if (!iung) missingPl.push("Brak kategorii gleby IUNG w punkcie.");
    if (sgR.source.status === "missing") missingPl.push("Brak uziarnienia gleby (SoilGrids).");
    if (nmtR.source.status === "missing") missingPl.push("Brak wysokości terenu (NMT): nie oceniono spływu ani miejsca na oczko.");
    else if (nmtR.source.status === "partial") missingPl.push("Wysokości terenu tylko dla części działki (NMT): spadku nie użyto do zaleceń.");
    if (waterR.source.status === "missing") missingPl.push("Brak danych o rowach i ciekach (Overpass/OpenStreetMap niedostępny): nie oceniono zastawek.");
    else if (osm) missingPl.push("Rowy i cieki z OpenStreetMap (BDOT10k nie jest odpytywany na żywo): mapa rowów może być niepełna.");
    missingPl.push("Nie sprawdzono strefy zagrożenia powodziowego (ISOK): sprawdź na mapie ISOK przed budową zbiornika.");
    const uncertainty: Uncertainty = {
      level: score === 0 ? "niska" : score <= 2 ? "średnia" : "wysoka",
      reasonsPl,
      missingPl,
      notConsideredPl: [
        "Drenaż podziemny i stan urządzeń melioracyjnych",
        "Poziom wody gruntowej",
        "Dokładna faza rozwojowa i stan łanu w dniu analizy",
        "Lokalne pomiary opadu i wilgotności gleby",
        "Nawadnianie i pobór wody na sąsiednich działkach",
        "Zabiegi agrotechniczne wykonane na działce",
      ],
    };

    /* 10. summary */
    const parts: string[] = [];
    if (currentLevel) {
      parts.push(`Ryzyko niedoboru wody ${isToday ? "dziś" : `na ${dayPl(date)}`}: ${LEVEL_PL[currentLevel]}${bumps.length ? ` (podniesione o jeden poziom: ${bumps.join("; ")})` : ""}.`);
    } else parts.push(M ? "Brak danych do oceny bieżącej." : "Brak danych meteorologicznych: ocena wilgotności niemożliwa.");
    if (mode === "smsr" && decisive && typeof decisive.thr === "number") {
      const drought = (decisiveProjected ? decisive.projected ?? decisive.K : decisive.K) < decisive.thr;
      parts.push(
        decisiveProjected
          ? `Trwające okno SMSR ${winTxt(decisive)}, próg ${signed(decisive.thr)} mm${drought ? ": zapowiedź suszy" : ""}.`
          : `Najgorsze okno SMSR w tym sezonie: ${winTxt(decisive, false)}, próg ${signed(decisive.thr)} mm (${crop.namePl.toLowerCase()}, ${catLabel}): ${drought ? "susza" : "bez suszy"}.`,
      );
      if (!decisiveProjected && current && current.k.days >= 1) parts.push(`Trwające okno ${winTxt(current)}.`);
      else if (!decisiveProjected && lastDone && lastDone !== decisive) parts.push(`Ostatnie zakończone okno ${winTxt(lastDone, false)}.`);
      parts.push("KBW to klimatyczny bilans wodny: opad minus parowanie. Ocena dla tej działki, uprawy, kategorii gleby i okna 60 dni wg progów SMSR z 2019 r.");
    } else if (mode === "smsr" && R === 0) {
      parts.push(notes.find((n) => n.startsWith("SMSR nie określa")) ?? "");
    } else if (refK) parts.push(`Bilans opadu i parowania (${etpMethodPl}) z 60 dni do ${dayPl(refWin!.b)}: ${signed(refVal(refK))} mm${pct !== null ? ` (${pct}. percentyl na tle ${past.length} lat)` : ""}.`);
    if (inSeason && seasonDrought && decisive && !decisiveProjected) {
      /* already said "susza" above */
    }
    if (droughtYears !== null) parts.push(`Susza w ${droughtYears} z ${completedSeasons.length} poprzednich sezonów${fallbackRule ? " (reguła zastępcza)" : ""}.`);
    if (cat) parts.push(`Gleba: ${catLabel}${soil.textureClassPl ? `, ${soil.textureClassPl}` : ""}.`);
    if (mode === "poza_sezonem") {
      parts.push("Poza okresem monitoringu suszy SMSR (21.III–30.IX): poziom ryzyka z ostatniego sezonu i gleby, bez bieżącego bilansu.");
      const last = lastCompletedSeason;
      if (last) parts.push(`Ostatni sezon (${last.year}): ${last.drought ? "susza" : "bez suszy"} ${fallbackRule ? "(reguła zastępcza)" : "wg progów SMSR"}, najgorsze okno ${last.windowPl ?? ""} KBW ${signed(last.kbwCriticalMm)} mm${typeof last.thresholdMm === "number" ? ` przy progu ${signed(last.thresholdMm)} mm` : ""}.`);
    }
    if (phase) parts.push(`${phase === "po_zbiorze" ? "Po żniwach" : "Dojrzewanie lub żniwa"}: spadek NDVI naturalny, nawadnianie i lustracja łanu nie mają sensu.`);
    if (organic) parts.push("Gleba organiczna (torf, mursz): IUNG nie nadaje kategorii podatności.");
    if (!iungR.landUse) parts.push("Nie potwierdzono, że to grunt rolny: sprawdź użytek działki.");
    if (!dataCauses.length) parts.push(M ? "Dane nie wskazują przyczyn niedoboru wody; brak zaleceń." : "Bez danych meteorologicznych nie podajemy zaleceń poza sprawdzeniem działki w terenie.");

    const sources: SourceInfo[] = [uldkSrc, meteoR.source, ...(imgwR ? [imgwR.source] : []), satR.source, iungR.source, sgR.source, nmtR.source, waterR.source, isokSrc];
    return {
      request: req,
      textSource: "template",
      methodVersion: "traktor-analiza 0.2 (SMSR: okna od 21.III do daty, ETP SMSR; progi do kalibracji)",
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - t0,
      parcel,
      crop: { id: crop.id, namePl: crop.namePl },
      assessment: { currentLevel, historicalLevel, summaryPl: parts.filter(Boolean).join(" "), meteo, satellite: sat, soil, terrain },
      causes,
      recommendations: recs,
      irrigation,
      uncertainty,
      sources,
    };
  } finally {
    clearTimeout(kill);
    o.signal?.removeEventListener("abort", onOuter);
  }
}
