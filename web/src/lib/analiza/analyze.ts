import { getCrop, type Crop } from "./crops";
import { getImgwWarnings, getMeteo, LICENSE_IMGW, LICENSE_OM, type KbwSum, type MeteoOut } from "./meteo";
import { EMPTY_SAT, satelliteSafe } from "./satellite-adapter";
import { inSmsrSeason, SMSR_GROUP, SMSR_GROUP_PL, smsrThreshold, windowsOf, type SmsrWindow } from "./smsr";
import { categoryFromTexture, getIungCategory, getSoilGrids, type LandUse } from "./soil";
import { getTerrain, getWatercourses } from "./terrain";
import type { AnalysisRequest, AnalysisResult, Assessment, Cause, Irrigation, Level, Parcel, Recommendation, SourceInfo, Uncertainty } from "./types";
import { AmbiguousParcel, getParcelById, getParcelByXY, type ParcelCandidate } from "./uldk";
import { addDays, daysBetween, fmtPL, r0, shiftYears, todayPL, UpstreamError } from "./util";

export class AnalysisFailure extends Error {
  constructor(public code: string, public messagePl: string, public step?: string, public candidates?: ParcelCandidate[]) {
    super(code);
  }
}
const LAND_PL: Record<string, string> = { las: "las", woda: "wody", zabudowa: "teren zabudowany", nieuzytki: "drogi lub nieużytki", inne: "teren nierolniczy" };

export const MAX_AREA_HA = 500;
const LEVELS: Level[] = ["niskie", "umiarkowane", "wysokie", "bardzo_wysokie"];
export const LEVEL_PL: Record<Level, string> = { niskie: "niskie", umiarkowane: "umiarkowane", wysokie: "wysokie", bardzo_wysokie: "bardzo wysokie" };
const CAT_IDX = { I: 0, II: 1, III: 2, IV: 3 } as const;
/** IUNG WOD mid-class (mm, root zone) per category, used as TAW when the IUNG category is known */
const WOD_MID = [110, 149, 186, 220];
const MONTHS_PL = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const MONTHS_GEN = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const WINTER_CROPS = new Set(["pszenica_ozima", "zyto", "rzepak_ozimy", "sad", "uzytki_zielone"]);
const mm = (n: number | null | undefined) => `${fmtPL(n)} mm`;
const signed = (n: number | null | undefined) => (n === null || n === undefined ? "b.d." : n > 0 ? `+${fmtPL(n)}` : fmtPL(n).replace("-", "−"));
const dayPl = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS_GEN[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

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

type WinEval = { w: SmsrWindow; k: KbwSum; thr: number | null | "niewskazana" | "brak"; partial: boolean; projected?: number | null };

export async function analyze(req: AnalysisRequest, budgetMs = 24000): Promise<AnalysisResult> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const kill = setTimeout(() => ctrl.abort(), budgetMs);
  try {
    const crop: Crop = getCrop(req.crop);
    const date = req.date;
    const today = todayPL();
    const isToday = date === today;
    const month = Number(date.slice(5, 7));
    const Y = Number(date.slice(0, 4));
    const pTab = (crop as { p?: number }).p ?? 0.5;

    /* 1. parcel */
    let parcel: Parcel;
    let uldkSrc: SourceInfo;
    try {
      const r = req.parcelId ? await getParcelById(req.parcelId, ctrl.signal) : await getParcelByXY(req.lonLat![0], req.lonLat![1], ctrl.signal);
      parcel = r.parcel;
      uldkSrc = r.source;
    } catch (e) {
      if (e instanceof AmbiguousParcel) throw new AnalysisFailure("AMBIGUOUS", e.userPl ?? "Kilka działek pasuje.", "dzialka", e.candidates);
      const msg = e instanceof UpstreamError && e.userPl ? e.userPl : "Nie udało się pobrać granic działki z ULDK.";
      throw new AnalysisFailure(e instanceof UpstreamError && e.message === "not found" ? "parcel_not_found" : "uldk_error", msg, "dzialka");
    }
    if (parcel.areaHa > MAX_AREA_HA)
      throw new AnalysisFailure("parcel_too_large", `Działka ${parcel.id} ma ${fmtPL(parcel.areaHa)} ha. Analizujemy działki do ${MAX_AREA_HA} ha.`, "dzialka");
    const powiat = parcel.id.slice(0, 4);
    // one deadline for all sources after ULDK (~20 s), never past the outer budget
    const deadline = Math.min(Date.now() + 20000, t0 + budgetMs - 1000);
    const leftD = () => deadline - Date.now();

    /* 2a. land-use gate (IUNG): forest / water / built-up parcels are not analysed */
    const iungR = await capped(getIungCategory(parcel, ctrl.signal), Math.min(5500, leftD()), () => ({
      data: null as Assessment["soil"]["iungCategory"],
      landUse: null as LandUse | null,
      source: miss("IUNG", "Kategoria podatności gleby na suszę (IUNG-PIB)", "IUNG-PIB, mapa podatności gleb na suszę (warunki ponownego wykorzystania do potwierdzenia)", "limit czasu"),
    }));
    if (iungR.landUse && iungR.landUse.kind !== "rolna" && iungR.landUse.kind !== "organiczna")
      throw new AnalysisFailure(
        "NOT_AGRICULTURAL",
        `Działka ${parcel.id} to nie jest grunt rolny według mapy IUNG (${LAND_PL[iungR.landUse.kind] ?? "teren nierolniczy"}, ${Math.round((1 - iungR.landUse.agriShare) * 100)}% powierzchni). Analiza suszy rolniczej nie dotyczy tej działki.`,
        "dzialka",
      );

    /* 2b. other sources in parallel */
    const [meteoR, sgR, nmtR, waterR, satR, imgwR] = await Promise.all([
      capped(
        getMeteo(parcel.centroid, date, crop, ctrl.signal).then((x) => x as { data: MeteoOut | null; source: SourceInfo }),
        Math.min(19000, leftD()),
        () => ({ data: null, source: miss("OpenMeteo", "Opady, parowanie, temperatura (Open-Meteo, ERA5)", LICENSE_OM, "brak odpowiedzi Open-Meteo w limicie czasu", "https://open-meteo.com") }),
      ),
      capped(getSoilGrids(parcel.centroid, crop, ctrl.signal), Math.min(9000, leftD()), () => ({
        data: { sandPct: null, clayPct: null, socGkg: null, awcMm: null, textureClassPl: null },
        source: miss("SoilGrids", "Uziarnienie i węgiel organiczny gleby (SoilGrids 250 m)", "SoilGrids 2.0, ISRIC, CC BY 4.0", "limit czasu"),
      })),
      capped(getTerrain(parcel, ctrl.signal), Math.min(12000, leftD()), () => ({
        data: { elevMin: null, elevMax: null, slopePct: null, lowPoint: null },
        source: miss("NMT", "Wysokości terenu (NMT GUGiK)", "GUGiK NMT", "limit czasu"),
      })),
      capped(getWatercourses(parcel, ctrl.signal), Math.min(5500, leftD()), () => ({
        data: { ditchDistM: null, watercourses: [] as Assessment["terrain"]["watercourses"] },
        source: miss("BDOT10k", "Rowy i cieki w promieniu 1 km (OpenStreetMap)", "© OpenStreetMap contributors, ODbL", "limit czasu"),
      })),
      capped(satelliteSafe(parcel, date, crop, Math.min(15000, leftD() - 300)), Math.min(15500, leftD()), () => ({
        data: EMPTY_SAT,
        source: miss("Sentinel2", "Zdjęcia satelitarne Sentinel-2", `Contains modified Copernicus Sentinel data ${Y}`, "limit czasu"),
      })),
      isToday
        ? capped(getImgwWarnings(powiat, ctrl.signal), 6000, () => ({
            data: [] as Assessment["meteo"]["warnings"],
            source: miss("IMGW", "Ostrzeżenia meteorologiczne (IMGW-PIB)", LICENSE_IMGW, "limit czasu"),
          }))
        : Promise.resolve(null),
    ]);

    const M = meteoR.data;
    const sat = satR.data;
    const iung = iungR.data;
    const soil: Assessment["soil"] = { iungCategory: iung, ...sgR.data };
    const terrain: Assessment["terrain"] = { ...nmtR.data, ...waterR.data, floodZone: null };
    const isokSrc = miss("ISOK", "Strefy zagrożenia powodziowego (ISOK)", "Wody Polskie / ISOK", "nie sprawdzano automatycznie", "https://wody.isok.gov.pl/imap_kzgw/");

    /* 3. SMSR: soil category, windows, thresholds */
    const fallbackCat = !iung ? categoryFromTexture(soil.textureClassPl, soil.clayPct) : null;
    const cat = iung ?? fallbackCat;
    const catIdx = cat ? CAT_IDX[cat] : 2;
    const catLabel = iung ? `kat. ${iung}` : fallbackCat ? `kat. ${fallbackCat} (szacunek z SoilGrids)` : "kat. III (przyjęta, brak danych o glebie)";
    const group = SMSR_GROUP[crop.id];
    const beetNo = smsrThreshold(crop.id, catIdx, 0) === "niewskazana";
    const smsrUsable = !!group && !beetNo;
    const primary = (k: KbwSum) => k.iung ?? k.pm;

    let completed: WinEval | null = null;
    let current: WinEval | null = null;
    const notes: string[] = [];
    const inSeason = inSmsrSeason(date);
    if (M && inSeason) {
      const end = M.dataEnd;
      const wins = windowsOf(Y);
      const done = wins.filter((w) => w.end <= end);
      const lastDone = done[done.length - 1];
      if (lastDone) {
        const k = M.kbw(lastDone.start, lastDone.end);
        if (k) completed = { w: lastDone, k, thr: smsrThreshold(crop.id, catIdx, lastDone.idx), partial: false };
      }
      const run = wins.find((w) => w.start <= end && w.end > end);
      if (run) {
        const k = M.kbw(run.start, end);
        if (k) {
          // projection: partial + remaining days × mean daily (P − ET) of the next 7 days (forecast or, for past dates, actual weather after the date)
          let s = 0, n = 0;
          for (let d = addDays(end, 1); d <= addDays(end, 7); d = addDays(d, 1)) {
            const v = M.day(d);
            if (v && v.p !== null && v.e !== null) {
              s += v.p - (v.ei ?? v.e);
              n++;
            }
          }
          if (!n)
            for (let d = addDays(end, -6); d <= end; d = addDays(d, 1)) {
              const v = M.day(d);
              if (v && v.p !== null && v.e !== null) {
                s += v.p - (v.ei ?? v.e);
                n++;
              }
            }
          const remaining = daysBetween(end, run.end);
          current = { w: run, k, thr: smsrThreshold(crop.id, catIdx, run.idx), partial: true, projected: n ? r0(primary(k) + (remaining * s) / n) : null };
        }
      }
    }

    // percentile of the reference window vs the same window in previous years (FAO ET0)
    const refWin = completed ? { a: completed.w.start, b: completed.w.end } : M ? { a: addDays(M.dataEnd, -59), b: M.dataEnd } : null;
    const refK = refWin && M ? (completed ? completed.k : M.kbw(refWin.a, refWin.b)) : null;
    const past: number[] = [];
    if (M && refWin)
      for (let y = 1; y <= 10; y++) {
        const k = M.kbw(shiftYears(refWin.a, -y), shiftYears(refWin.b, -y));
        if (k) past.push(k.pm);
      }
    const pct = refK ? percentile(refK.pm, past) : null;

    /* seasons: last 10 completed SMSR seasons */
    const lastSeason = date.slice(5) >= "09-30" ? Y : Y - 1;
    const seasons: Assessment["meteo"]["seasons"] = [];
    let droughtPm = 0;
    let fallbackRule = false;
    if (M) {
      const raw: { year: number; k: number; pm: number; drought: boolean; droughtPm: boolean }[] = [];
      for (let y = lastSeason; y > lastSeason - 10; y--) {
        let worst: { k: number; pm: number; ratio: number } | null = null;
        let dr = false, drPm = false;
        for (const w of windowsOf(y)) {
          const thr = smsrThreshold(crop.id, catIdx, w.idx);
          const k = M.kbw(w.start, w.end);
          if (!k) continue;
          if (smsrUsable && typeof thr === "number") {
            const ratio = primary(k) / thr;
            if (!worst || ratio > worst.ratio) worst = { k: primary(k), pm: k.pm, ratio };
            if (primary(k) < thr) dr = true;
            if (k.pm < thr) drPm = true;
          } else if (!smsrUsable) {
            if (!worst || k.pm < worst.k) worst = { k: k.pm, pm: k.pm, ratio: 0 };
          }
        }
        if (worst) raw.push({ year: y, k: worst.k, pm: worst.pm, drought: dr, droughtPm: drPm });
      }
      if (!smsrUsable && raw.length >= 5) {
        // no SMSR threshold: standardised anomaly ≤ −1 (like SPEI), do kalibracji
        fallbackRule = true;
        const mean = raw.reduce((s, r) => s + r.k, 0) / raw.length;
        const sd = Math.sqrt(raw.reduce((s, r) => s + (r.k - mean) ** 2, 0) / raw.length) || 1;
        raw.forEach((r) => (r.drought = r.droughtPm = (r.k - mean) / sd <= -1));
      }
      raw.forEach((r) => seasons.push({ year: r.year, kbwCriticalMm: r0(r.k), drought: r.drought }));
      droughtPm = raw.filter((r) => r.droughtPm).length;
    }
    const droughtYears = M && seasons.length ? seasons.filter((s) => s.drought).length : null;

    /* 4. levels */
    const ndmiAnom = sat.ndmi !== null && sat.ndmiNorm !== null ? sat.ndmi - sat.ndmiNorm : null;
    const ndviAnom = sat.ndvi !== null && sat.ndviNorm !== null ? sat.ndvi - sat.ndviNorm : null;
    let currentLevel: Level | null = null;
    let R: number | null = null; // KBW / threshold for the decisive window
    let mode: "smsr" | "percentyl" = "percentyl";
    const ratioLevel = (r: number) => (r >= 1 ? 3 : r >= 0.75 ? 2 : r >= 0.5 ? 1 : 0);
    if (M) {
      let s: number | null = null;
      const evalW = completed ?? current;
      if (smsrUsable && evalW) {
        if (typeof evalW.thr === "number") {
          const K = evalW.partial ? evalW.projected ?? primary(evalW.k) : primary(evalW.k);
          R = K < 0 ? K / evalW.thr : 0;
          s = ratioLevel(R);
          if (evalW.partial) s = Math.min(s, 2);
          mode = "smsr";
        } else if (evalW.thr === null) {
          R = 0;
          s = 0;
          mode = "smsr";
          notes.push(`SMSR nie przewiduje suszy dla grupy „${SMSR_GROUP_PL[group!]}” w oknie ${evalW.w.labelPl} (poza okresem wrażliwości).`);
        }
        if (s !== null && current && completed && typeof current.thr === "number" && current.projected !== null && current.projected !== undefined && current.projected < current.thr) s += 1;
      }
      if (s === null && pct !== null) {
        s = pct <= 10 ? 2 : pct <= 25 ? 1 : 0;
        if (inSeason && pct <= 5) s = 3;
      }
      if (s !== null && R !== null && R >= 0.5 && ndmiAnom !== null && ndviAnom !== null && ndmiAnom <= -0.1 && ndviAnom <= -0.1) s += 1;
      if (s !== null && !inSeason) s = Math.min(s, 1); // SMSR does not assess drought outside 21.III–30.IX
      if (s !== null) currentLevel = LEVELS[Math.max(0, Math.min(3, s))];
    }
    if (!inSeason) notes.push("Poza okresem monitoringu suszy SMSR (21.III–30.IX): SMSR nie ocenia wtedy suszy; ocena z bilansu P − ET0 (FAO) na tle 10 lat.");
    if (!group) notes.push("Dla użytków zielonych SMSR nie podaje progów suszy: ocena z percentyla bilansu, a sezony suszy z reguły zastępczej (anomalia ≤ −1 odch. std.), do kalibracji.");
    if (beetNo) notes.push("SMSR: burak cukrowy na glebie kategorii I to „uprawa niewskazana” (brak progu suszy). Ocena z percentyla bilansu.");

    let historicalLevel: Level | null = null;
    if (droughtYears !== null && seasons.length >= 5) {
      let s = droughtYears === 0 ? 0 : droughtYears <= 2 ? 1 : droughtYears <= 4 ? 2 : 3;
      if ((terrain.slopePct ?? 0) > 5 || cat === "I") s += 1;
      historicalLevel = LEVELS[Math.min(3, s)];
    } else if (cat) historicalLevel = LEVELS[3 - CAT_IDX[cat]];

    const meteo: Assessment["meteo"] = {
      kbw60Mm: refK ? refK.pm : null,
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
    };

    /* 5. causes */
    const causes: Cause[] = [];
    const winTxt = (e: WinEval) =>
      `KBW ${e.partial ? "w trwającym oknie" : "w ostatnim zakończonym oknie"} SMSR ${e.w.labelPl}${e.partial ? ` (do ${dayPl(M!.dataEnd)})` : ""}: ${e.k.iung !== null ? `${signed(e.k.iung)} mm z ETP IUNG, ${signed(e.k.pm)} mm z ET0 FAO` : `${signed(e.k.pm)} mm z ET0 FAO`}${e.partial && e.projected !== null && e.projected !== undefined ? `; prognoza na koniec okna ${signed(e.projected)} mm` : ""}`;
    {
      const ev: string[] = [];
      let w: 1 | 2 | 3 = 1;
      const e = completed ?? current;
      if (mode === "smsr" && e && typeof e.thr === "number" && R !== null && R >= 0.75) {
        ev.push(`${winTxt(e)}; próg suszy SMSR dla grupy „${SMSR_GROUP_PL[group!]}”, ${catLabel}: ${signed(e.thr)} mm.`);
        w = R >= 1 ? 3 : 2;
      } else if (mode === "percentyl" && pct !== null && pct <= 20 && refK && refK.pm < -30) {
        ev.push(`Bilans P − ET0 z okresu ${refWin!.a}..${refWin!.b}: ${signed(refK.pm)} mm, ${pct}. percentyl na tle ${past.length} poprzednich lat.`);
        w = pct <= 10 ? 2 : 1;
      }
      const p = meteo.precip30Mm;
      const pn = meteo.precip30NormMm;
      if (p !== null && pn !== null && pn > 10 && p < 0.6 * pn) {
        ev.push(`Opad z 30 dni: ${mm(p)}, ${r0((100 * p) / pn)}% średniej z 10 lat (${mm(pn)}).`);
        w = Math.max(w, 2) as 1 | 2 | 3;
      }
      if (droughtYears !== null && droughtYears >= 3) {
        ev.push(`Susza ${fallbackRule ? "(reguła zastępcza)" : "wg progów SMSR"} w ${droughtYears} z ${seasons.length} ostatnich sezonów${!fallbackRule && droughtPm !== droughtYears ? ` (z ET0 FAO: ${droughtPm})` : ""}.`);
        if (droughtYears >= 5) w = Math.max(w, 2) as 1 | 2 | 3;
      }
      if (ev.length) causes.push({ id: "deficyt_opadow", titlePl: "Niedobór opadów względem parowania", evidencePl: ev.join(" "), weight: w, sources: ["OpenMeteo", ...(iung ? (["IUNG"] as const) : [])] });
    }
    if ((meteo.tmax30MeanC !== null && meteo.tmax30MeanC >= 25) || (meteo.et0_30Mm !== null && meteo.et0_30Mm >= 110)) {
      causes.push({
        id: "upal",
        titlePl: "Wysoka temperatura i parowanie",
        evidencePl: `Średnia temperatura maksymalna z 30 dni: ${fmtPL(meteo.tmax30MeanC, 1)} °C; parowanie ET0 (FAO): ${mm(meteo.et0_30Mm)} w 30 dni (warunki rejonu).`,
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
        ev.push(`Woda dostępna w strefie korzeni (${crop.rootDepthM} m): szacunek ok. ${mm(soil.awcMm)} (${soil.textureClassPl ?? "b.d."}, piasek ${soil.sandPct}%, ił ${soil.clayPct}%; SoilGrids).`);
        w = Math.max(w, soil.awcMm < 60 ? 3 : 2) as 1 | 2 | 3;
      }
      if (soil.socGkg !== null && soil.socGkg < 8) ev.push(`Mało węgla organicznego: ${fmtPL(soil.socGkg, 1)} g/kg w warstwie 0–30 cm (szacunek SoilGrids).`);
      if (ev.length) causes.push({ id: "niska_retencja_gleby", titlePl: "Gleba słabo zatrzymuje wodę", evidencePl: ev.join(" "), weight: w, sources: [...(iung ? (["IUNG"] as const) : []), ...(soil.sandPct !== null ? (["SoilGrids"] as const) : [])] });
    }
    if (terrain.slopePct !== null && terrain.slopePct >= 2) {
      causes.push({
        id: "odplyw_powierzchniowy",
        titlePl: "Woda spływa po spadku terenu",
        evidencePl: `Średni spadek działki ok. ${fmtPL(terrain.slopePct, 1)}% (${terrain.slopePct > 10 ? "bardzo duży" : terrain.slopePct > 5 ? "duży" : "umiarkowany"} spływ), różnica wysokości ${fmtPL((terrain.elevMax ?? 0) - (terrain.elevMin ?? 0), 1)} m (NMT).`,
        weight: terrain.slopePct >= 5 ? 3 : 2,
        sources: ["NMT"],
      });
    }
    if (crop.critical.includes(month)) {
      causes.push({
        id: "wrazliwa_uprawa",
        titlePl: "Uprawa w okresie krytycznym",
        evidencePl: `${crop.namePl}: ${MONTHS_PL[month - 1]} to okres największej wrażliwości na brak wody (${crop.critical.map((m) => MONTHS_PL[m - 1]).join(", ")}).`,
        weight: 2,
        sources: [],
      });
    }
    const meteoCause = (R !== null && R >= 0.5) || (mode === "percentyl" && pct !== null && pct <= 25);
    if ((meteoCause || soilCause) && ((ndviAnom !== null && ndviAnom <= -0.1) || (ndmiAnom !== null && ndmiAnom <= -0.08))) {
      causes.push({
        id: "stres_roslin",
        titlePl: "Zdjęcie satelitarne potwierdza słabszy stan roślin",
        evidencePl: `Sentinel-2 ${sat.sceneDate ?? ""}: NDVI ${fmtPL(sat.ndvi, 2)} (ta sama działka w poprzednich latach: ${fmtPL(sat.ndviNorm, 2)}), NDMI ${fmtPL(sat.ndmi, 2)} (${fmtPL(sat.ndmiNorm, 2)}). Uprawy w poprzednich latach mogły być inne.${sat.anomalyPl ? " " + sat.anomalyPl : ""}`,
        weight: (ndmiAnom ?? 0) <= -0.2 || (ndviAnom ?? 0) <= -0.2 ? 3 : 2,
        sources: ["Sentinel2"],
      });
    }
    causes.sort((a, b) => b.weight - a.weight);
    const has = (id: Cause["id"]) => causes.some((c) => c.id === id);
    const pick = (...ids: Cause["id"][]) => ids.filter(has);

    /* 6. recommendations (only from causes; NWRM catalogue) */
    const recs: Recommendation[] = [];
    const slope = terrain.slopePct;
    const near = terrain.watercourses[0];
    if ((has("deficyt_opadow") || has("niska_retencja_gleby")) && near && near.distM <= 300 && (slope === null || slope < 1)) {
      recs.push({
        id: "zastawka",
        kind: "retencja",
        titlePl: `Zastawka na ${near.kind === "rów" ? "rowie" : near.kind === "kanał" ? "kanale" : "cieku"}`,
        whyPl: `${has("deficyt_opadow") ? "Niedobór wody w bilansie. " : ""}${near.name} płynie ok. ${near.distM} m od działki, teren płaski (${slope === null ? "spadek b.d." : `spadek ${fmtPL(slope, 1)}%`}). Zatrzymana w rowie woda podnosi poziom wody w glebie obok.`,
        howPl: "Piętrzyć wodę po roztopach i ulewach (zastawka, przepust z piętrzeniem). Otwierać przed zalaniem pól i przed pracami polowymi.",
        wherePl: `${near.name}, ok. ${near.distM} m od granicy działki`,
        priority: 1,
        basedOn: pick("deficyt_opadow", "niska_retencja_gleby"),
        legalPl: "Piętrzenie wody wymaga pozwolenia wodnoprawnego (Prawo wodne, art. 389 pkt 6) i uzgodnienia z Wodami Polskimi lub spółką wodną. Wymaga wizji lokalnej.",
        sources: ["BDOT10k", "NMT", "OpenMeteo"],
      });
    }
    if ((has("deficyt_opadow") || has("odplyw_powierzchniowy")) && slope !== null && slope >= 1 && terrain.lowPoint) {
      recs.push({
        id: "oczko",
        kind: "retencja",
        titlePl: "Małe oczko wodne lub niecka w najniższym miejscu",
        whyPl: `Woda spływa do najniższego punktu działki (${fmtPL(terrain.elevMin, 1)} m n.p.m., spadek ${fmtPL(slope, 1)}%). Zatrzymana tam zasila glebę zamiast odpłynąć.`,
        howPl: "Płytka niecka lub oczko zbierające spływ z pola; skarpy obsiać trawą. Wielkość dobrać do zlewni.",
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
        titlePl: "Pas zieleni lub zadrzewienie w poprzek spadku",
        whyPl: `Spadek ok. ${fmtPL(slope, 1)}% przyspiesza spływ wody po opadach.`,
        howPl: "Pas trawy lub krzewów szerokości kilku metrów wzdłuż poziomic, przy dolnej granicy działki. Uprawa i siew w poprzek stoku.",
        wherePl: "dolna krawędź działki, w stronę najniższego punktu",
        location: terrain.lowPoint ?? undefined,
        priority: 2,
        basedOn: ["odplyw_powierzchniowy"],
        sources: ["NMT"],
      });
    }
    if (has("niska_retencja_gleby") || has("odplyw_powierzchniowy") || (droughtYears ?? 0) >= 3) {
      const basedOn = pick("niska_retencja_gleby", "odplyw_powierzchniowy", "deficyt_opadow");
      if (basedOn.length)
        recs.push({
          id: "miedzyplony",
          kind: "agrotechnika",
          titlePl: "Międzyplony po zbiorze",
          whyPl: "Okrywa roślinna ogranicza parowanie z gołej gleby i spływ, poprawia strukturę gleby.",
          howPl: "Wysiać międzyplon (np. gorczyca, facelia, mieszanki) zaraz po zbiorze przedplonu; zostawić na zimę jako mulcz.",
          priority: 2,
          basedOn,
          sources: [...(has("niska_retencja_gleby") ? (["IUNG", "SoilGrids"] as const) : []), ...(has("odplyw_powierzchniowy") ? (["NMT"] as const) : []), ...(has("deficyt_opadow") ? (["OpenMeteo"] as const) : [])],
        });
    }
    if (has("deficyt_opadow") || has("upal")) {
      recs.push({
        id: "mulcz",
        kind: "agrotechnika",
        titlePl: "Zostawić resztki pożniwne na powierzchni",
        whyPl: "Mulcz osłania glebę przed słońcem i wiatrem, mniej wody wyparowuje.",
        howPl: "Słomę pociąć i rozrzucić równo; płytka uprawa zamiast orki tam, gdzie to możliwe.",
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
    if (has("niska_retencja_gleby")) {
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
    }
    if (has("deficyt_opadow") && [3, 4, 9, 10].includes(month)) {
      recs.push({
        id: "walowanie",
        kind: "agrotechnika",
        titlePl: "Wałowanie po siewie",
        whyPl: "W suchym okresie siewu wałowanie poprawia podsiąk wody do nasion.",
        howPl: "Wałem pierścieniowym zaraz po siewie, gdy gleba nie jest mokra.",
        priority: 3,
        basedOn: ["deficyt_opadow"],
        sources: ["OpenMeteo"],
      });
    }
    if (has("wrazliwa_uprawa") || (droughtYears ?? 0) >= 4) {
      const basedOn = pick("wrazliwa_uprawa", "deficyt_opadow");
      if (basedOn.length)
        recs.push({
          id: "odmiana_termin",
          kind: "agrotechnika",
          titlePl: "Odmiana i termin siewu pod suszę",
          whyPl: `${crop.namePl} najbardziej potrzebuje wody w okresie: ${crop.critical.map((m) => MONTHS_PL[m - 1]).join(", ")}${droughtYears !== null ? `; susza w ${droughtYears} z ${seasons.length} ostatnich sezonów` : ""}.`,
          howPl: "Odmiana tolerancyjna na suszę (lista odmian zalecanych COBORU dla województwa); siew w optymalnym, raczej wczesnym terminie.",
          priority: 3,
          basedOn,
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

    /* 7. irrigation: FAO-56 daily root-zone balance */
    let irrigation: Irrigation | null = null;
    let tawSrc = "";
    if (M) {
      const historical = daysBetween(date, today) > 7;
      const prefix = historical ? `Na dzień ${dayPl(date)} zalecenie brzmiałoby: ` : "";
      const kcOf = (d: string) => crop.kc[Number(d.slice(5, 7)) - 1] ?? 0;
      const firstKc = crop.kc.findIndex((k, i) => i >= 2 && k > 0);
      const seasonStart = WINTER_CROPS.has(crop.id) ? `${Y}-03-01` : `${Y}-${String(firstKc + 1).padStart(2, "0")}-01`;
      const kcNow = kcOf(date);
      const TAW = cat && iung ? r0(WOD_MID[catIdx] * Math.min(1, crop.rootDepthM)) : soil.awcMm ?? (cat ? r0(WOD_MID[catIdx] * Math.min(1, crop.rootDepthM)) : r0(150 * Math.min(1, crop.rootDepthM)));
      tawSrc = iung ? `TAW ${TAW} mm z kategorii IUNG ${iung}` : soil.awcMm !== null ? `TAW ${TAW} mm (Saxton–Rawls, SoilGrids)` : `TAW ${TAW} mm (założone)`;
      const lowNeed = crop.id === "pszenica_ozima" || crop.id === "zyto" || crop.id === "jeczmien_jary" || crop.id === "uzytki_zielone";
      const scope = lowNeed ? " W zbożach i na użytkach zielonych nawadnianie jest rzadkie; najpierw retencja i agrotechnika." : "";
      if (date < seasonStart || kcNow < 0.45 || !inSmsrSeason(date) && month >= 10) {
        irrigation = {
          decision: "nie_teraz",
          deficitMm: null,
          doseMm: null,
          timingPl: `${prefix}nie nawadniać.`,
          reasonPl: `Poza okresem intensywnego wzrostu (${MONTHS_PL[month - 1]}, Kc ${fmtPL(kcNow, 2)}); roślina zużywa mało wody.${scope}`,
        };
      } else {
        let Dr = 0;
        const step = (d: string, D: number) => {
          const v = M.day(d);
          if (!v || v.p === null || v.e === null) return { D, ok: false, pe: 0, etc: 0, raw: 0 };
          const etcPot = kcOf(d) * v.e;
          const p = Math.max(0.1, Math.min(0.8, pTab + 0.04 * (5 - etcPot)));
          const raw = p * TAW;
          const ks = D <= raw ? 1 : Math.max(0, (TAW - D) / ((1 - p) * TAW));
          const pe = v.p < 0.2 * v.e ? 0 : v.p;
          const etc = ks * etcPot;
          return { D: Math.max(0, Math.min(TAW, D - pe + etc)), ok: true, pe, etc, raw };
        };
        let rawNow = pTab * TAW;
        for (let d = seasonStart; d <= M.dataEnd; d = addDays(d, 1)) {
          const s = step(d, Dr);
          Dr = s.D;
          if (s.ok) rawNow = s.raw;
        }
        // 7 days ahead: forecast (recent dates) or actual weather after the date (past dates); else repeat last week
        let D7 = Dr, sumPeEtc = 0, n7 = 0, rain7 = 0;
        for (let d = addDays(M.dataEnd, 1); d <= addDays(M.dataEnd, 7); d = addDays(d, 1)) {
          const s = step(d, D7);
          if (!s.ok) continue;
          D7 = s.D;
          sumPeEtc += s.pe - s.etc;
          rain7 += s.pe;
          n7++;
        }
        const aheadSrc = n7 >= 5 ? (historical ? "rzeczywista pogoda 7 dni po dacie (w miejsce prognozy)" : "prognoza Open-Meteo na 7 dni") : "powtórzenie ostatnich 7 dni";
        if (n7 < 5) {
          D7 = Dr;
          sumPeEtc = 0;
          rain7 = 0;
          for (let d = addDays(M.dataEnd, -6); d <= M.dataEnd; d = addDays(d, 1)) {
            const s = step(d, D7);
            if (!s.ok) continue;
            D7 = s.D;
            sumPeEtc += s.pe - s.etc;
            rain7 += s.pe;
          }
        }
        const RAW = rawNow;
        let decision: Irrigation["decision"] = "nie_teraz";
        if ((Dr >= RAW && sumPeEtc < 0) || (D7 >= RAW && Dr >= 0.7 * RAW)) decision = "tak";
        else if (Dr >= 0.7 * RAW || D7 >= RAW || (Dr >= RAW && rain7 >= Dr - 0.5 * RAW)) decision = "rozwaz";
        const net = r0(Math.min(TAW, Math.max(Dr, decision === "tak" ? D7 : Dr)));
        const dose = decision === "nie_teraz" ? null : net;
        irrigation = {
          decision,
          deficitMm: r0(Dr),
          doseMm: dose,
          timingPl:
            prefix +
            (decision === "nie_teraz"
              ? "nie nawadniać; sprawdzić ponownie za tydzień."
              : `dawka netto ok. ${dose} mm (brutto ok. ${r0((dose ?? 0) / 0.9)}–${r0((dose ?? 0) / 0.75)} mm zależnie od sprzętu), rano lub wieczorem, w ciągu 3–5 dni; pominąć, jeśli spadnie ≥ ${Math.max(10, r0((dose ?? 0) / 2))} mm deszczu.`) +
            ` Za 7 dni ubytek wody ok. ${r0(D7)} mm (${aheadSrc}).`,
          reasonPl: `Bilans wody w strefie korzeni (FAO-56, od ${dayPl(seasonStart)}, start: gleba pełna po zimie): ubytek ${r0(Dr)} mm, próg stresu (RAW) ${r0(RAW)} mm, ${tawSrc}.${scope}`,
        };
        if (decision !== "nie_teraz") {
          const basedOn = pick("deficyt_opadow", "wrazliwa_uprawa", "upal", "niska_retencja_gleby");
          if (basedOn.length)
            recs.push({
              id: "nawadnianie",
              kind: "nawadnianie",
              titlePl: decision === "tak" ? "Nawadnianie wskazane" : "Rozważyć nawadnianie",
              whyPl: irrigation.reasonPl,
              howPl: irrigation.timingPl,
              priority: decision === "tak" ? 1 : 2,
              basedOn,
              legalPl: "Pobór wody do nawadniania zwykle wymaga pozwolenia wodnoprawnego; sprawdź w Wodach Polskich.",
              sources: ["OpenMeteo", ...(iung ? (["IUNG"] as const) : soil.awcMm !== null ? (["SoilGrids"] as const) : [])],
            });
        }
      }
    }
    const kindOrder = { retencja: 0, agrotechnika: 1, nawadnianie: 2 } as const;
    recs.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.priority - b.priority);

    /* 8. uncertainty: six-item score (docs/review/07-science.md §4) */
    const reasonsPl: string[] = ["Opady i parowanie z modeli dla rejonu (NASA POWER ~50 km, Open-Meteo ~10 km), nie pomiar na polu."];
    let score = 0;
    const evW = completed ?? current;
    if (mode === "smsr" && evW && typeof evW.thr === "number") {
      const K = primary(evW.k);
      if (Math.abs(K - evW.thr) < Math.max(25, 0.15 * Math.abs(evW.thr))) {
        score++;
        reasonsPl.push(`Bilans blisko progu suszy SMSR (${signed(K)} mm wobec ${signed(evW.thr)} mm).`);
      }
      if (evW.k.iung !== null && (evW.k.pm < evW.thr) !== (evW.k.iung < evW.thr)) {
        score++;
        reasonsPl.push(`Werdykt zależy od metody parowania: z ET0 FAO ${signed(evW.k.pm)} mm, z ETP IUNG ${signed(evW.k.iung)} mm (progi SMSR kalibrowano na ETP IUNG).`);
      }
    }
    reasonsPl.push("Progi SMSR są kalibrowane na ETP IUNG z danych stacji IMGW; tu ETP IUNG liczone ze wzoru miesięcznego z danych modelowych, usłonecznienie szacowane z promieniowania (przybliżenie).");
    if (!iung) {
      score++;
      reasonsPl.push(fallbackCat ? "Kategoria gleby oszacowana z SoilGrids (brak danych IUNG)." : "Brak kategorii gleby: przyjęto kategorię III.");
    }
    if (satR.source.status === "missing" || (ndmiAnom !== null && ndmiAnom <= -0.08 && !meteoCause) || (ndmiAnom !== null && ndmiAnom > 0.08 && (R ?? 0) >= 1)) {
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
    reasonsPl.push("Gleba z map (IUNG, SoilGrids 250 m) w środku działki: szacunek, nie pomiar.");
    if (irrigation?.deficitMm !== null && irrigation) reasonsPl.push("Woda w glebie z modelu FAO-56 (start: gleba pełna po zimie; po suchej zimie zaniżony ubytek).");
    const missingPl: string[] = [];
    if (!M) missingPl.push("Brak danych meteorologicznych (Open-Meteo nie odpowiedział): ocena wilgotności niepełna.");
    if (satR.source.status === "missing") missingPl.push(`Brak danych satelitarnych: ${satR.source.detail}.`);
    if (!iung) missingPl.push("Brak kategorii gleby IUNG w punkcie.");
    if (sgR.source.status === "missing") missingPl.push("Brak uziarnienia gleby (SoilGrids).");
    if (nmtR.source.status === "missing") missingPl.push("Brak wysokości terenu (NMT): nie oceniono spływu ani miejsca na oczko.");
    if (waterR.source.status === "missing") missingPl.push("Brak danych o ciekach (usługa niedostępna): nie oceniono zastawek na rowach.");
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

    /* 9. summary */
    const parts: string[] = [];
    parts.push(currentLevel ? `Ryzyko niedoboru wody ${isToday ? "dziś" : `na ${dayPl(date)}`}: ${LEVEL_PL[currentLevel]}.` : "Brak danych do oceny bieżącej.");
    if (mode === "smsr" && evW) parts.push(`${winTxt(evW)}${typeof evW.thr === "number" ? `, próg SMSR ${signed(evW.thr)} mm` : ""}.`);
    else if (refK) parts.push(`Bilans P − ET0 z 60 dni: ${signed(refK.pm)} mm${pct !== null ? ` (${pct}. percentyl na tle ${past.length} lat)` : ""}.`);
    if (droughtYears !== null) parts.push(`Susza w ${droughtYears} z ${seasons.length} ostatnich sezonów.`);
    if (cat) parts.push(`Gleba: ${catLabel}${soil.textureClassPl ? `, ${soil.textureClassPl}` : ""}.`);
    if (!inSeason) {
      parts.push("Poza okresem monitoringu suszy SMSR (21.III–30.IX): SMSR nie ocenia wtedy suszy rolniczej.");
      const last = seasons[0];
      if (last) parts.push(`Ostatni sezon (${last.year}): ${last.drought ? "susza" : "bez suszy"} ${fallbackRule ? "(reguła zastępcza)" : "wg progów SMSR"}, najgorsze okno KBW ${signed(last.kbwCriticalMm)} mm.`);
    }
    if (iungR.landUse?.kind === "organiczna") parts.push("Gleba organiczna (torf, mursz): IUNG nie nadaje kategorii podatności.");
    if (!causes.length) parts.push("Dane nie wskazują przyczyn niedoboru wody; brak zaleceń.");

    const sources: SourceInfo[] = [uldkSrc, meteoR.source, ...(imgwR ? [imgwR.source] : []), satR.source, iungR.source, sgR.source, nmtR.source, waterR.source, isokSrc];
    return {
      request: req,
      textSource: "template",
      methodVersion: "traktor-analiza 0.1 (SMSR progi do kalibracji)",
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - t0,
      parcel,
      crop: { id: crop.id, namePl: crop.namePl },
      assessment: { currentLevel, historicalLevel, summaryPl: parts.join(" "), meteo, satellite: sat, soil, terrain },
      causes,
      recommendations: recs,
      irrigation,
      uncertainty,
      sources,
    };
  } finally {
    clearTimeout(kill);
  }
}
