import type { AnalysisRequest, AnalysisResult, Parcel, SourceInfo } from "@/lib/analiza";

/**
 * DEV FIXTURE (dane przykładowe). Used only when the engine API is not available yet.
 * Geometry is the real ULDK outline of 040307_2.0023.306/2 (Zielonczyn, gm. Sicienko).
 * The numbers are illustrative, not computed. The UI labels this clearly.
 */
export const FIXTURE_PARCEL_ID = "040307_2.0023.306/2";

const RING: number[][] = [
  [17.816866575889, 53.1501297220474],
  [17.8168656817247, 53.1500236821994],
  [17.8168931358033, 53.1495434959122],
  [17.8169567136989, 53.1487232331544],
  [17.8169977877461, 53.1485196664105],
  [17.8170330332292, 53.147928960275],
  [17.8169434455495, 53.1479065365511],
  [17.8169096441271, 53.147876290576],
  [17.8169246773399, 53.1476803221607],
  [17.8170493766752, 53.146158411569],
  [17.8171422298567, 53.1447425800017],
  [17.8181522809391, 53.1448143096993],
  [17.8177598002331, 53.1507451267459],
  [17.8176821104908, 53.150806114755],
  [17.8169014677949, 53.150817677775],
  [17.816866575889, 53.1501297220474],
];

export const FIXTURE_PARCEL: Parcel = {
  id: FIXTURE_PARCEL_ID,
  teryt: "040307_2",
  voivodeship: "kujawsko-pomorskie",
  county: "powiat bydgoski",
  commune: "Sicienko",
  region: "Zielonczyn",
  areaHa: 5.4,
  centroid: [17.81745, 53.14785],
  geometry: { type: "Polygon", coordinates: [RING] },
};

const src = (
  id: SourceInfo["id"],
  label: string,
  detail: string,
  status: SourceInfo["status"],
  ms: number,
  license: string,
  note?: string,
): SourceInfo => ({ id, label, detail, status, ms, license, note, fetchedAt: "2026-11-22T09:00:00Z" });

export function fixtureResult(req: Partial<AnalysisRequest> = {}): AnalysisResult {
  const date = req.date ?? "2026-06-15";
  const year = Number(date.slice(0, 4)) || 2026;
  const seasons = [-182, -121, -205, -96, -164, -230, -118, -141, -199, -175].map((kbw, i) => ({
    year: year - 10 + i,
    kbwCriticalMm: kbw,
    drought: kbw < -170,
  }));
  return {
    request: { parcelId: FIXTURE_PARCEL_ID, crop: req.crop ?? "pszenica_ozima", date },
    generatedAt: "2026-11-22T09:00:00Z",
    durationMs: 14200,
    parcel: FIXTURE_PARCEL,
    crop: { id: "pszenica_ozima", namePl: "Pszenica ozima" },
    assessment: {
      currentLevel: "wysokie",
      historicalLevel: "umiarkowane",
      summaryPl:
        "Od 60 dni opady są o 41% niższe od normy z 10 lat. Gleba lekka trzyma mało wody. Ryzyko suszy dla pszenicy jest wysokie.",
      meteo: {
        kbw60Mm: -168,
        kbw60Percentile: 14,
        precip30Mm: 21,
        precip30NormMm: 52,
        et0_30Mm: 118,
        etc30Mm: 136,
        tmax30MeanC: 25.8,
        dryDaysMax: 17,
        droughtYears: 4,
        seasons,
        monthly: [
          { month: 1, pMm: 31, etcMm: 3 },
          { month: 2, pMm: 26, etcMm: 5 },
          { month: 3, pMm: 30, etcMm: 14 },
          { month: 4, pMm: 32, etcMm: 42 },
          { month: 5, pMm: 51, etcMm: 98 },
          { month: 6, pMm: 58, etcMm: 112 },
          { month: 7, pMm: 76, etcMm: 69 },
          { month: 8, pMm: 62, etcMm: 31 },
          { month: 9, pMm: 45, etcMm: 18 },
          { month: 10, pMm: 36, etcMm: 14 },
          { month: 11, pMm: 37, etcMm: 6 },
          { month: 12, pMm: 35, etcMm: 3 },
        ],
        warnings: [],
      },
      satellite: {
        sceneDate: "2026-06-12",
        cloudPct: 4,
        ndvi: 0.58,
        ndmi: 0.09,
        ndviNorm: 0.71,
        ndmiNorm: 0.22,
        anomalyPl: "NDVI o 0,13 niżej niż zwykle w czerwcu. Rośliny mają mniej wody w liściach (NDMI 0,09 wobec 0,22).",
        history: [
          { date: "2026-04-20", ndvi: 0.52, ndmi: 0.18 },
          { date: "2026-05-08", ndvi: 0.66, ndmi: 0.2 },
          { date: "2026-05-25", ndvi: 0.64, ndmi: 0.14 },
          { date: "2026-06-12", ndvi: 0.58, ndmi: 0.09 },
        ],
      },
      soil: {
        iungCategory: "II",
        sandPct: 68,
        clayPct: 8,
        socGkg: 9.5,
        awcMm: 95,
        textureClassPl: "piasek gliniasty",
      },
      terrain: {
        elevMin: 92.4,
        elevMax: 96.1,
        slopePct: 1.4,
        lowPoint: [17.81765, 53.14495],
        ditchDistM: 140,
        watercourses: [{ name: "rów bez nazwy", kind: "rów", distM: 140 }],
        floodZone: false,
      },
    },
    causes: [
      {
        id: "deficyt_opadow",
        titlePl: "Za mało deszczu",
        evidencePl: "Klimatyczny bilans wodny 60 dni: −168 mm (14. percentyl z 10 lat). Opad 30 dni: 21 mm, norma 52 mm.",
        weight: 3,
        sources: ["OpenMeteo"],
      },
      {
        id: "niska_retencja_gleby",
        titlePl: "Gleba trzyma mało wody",
        evidencePl: "Piasek gliniasty, 68% piasku. Woda dostępna w strefie korzeni ok. 95 mm. Kategoria IUNG II.",
        weight: 2,
        sources: ["IUNG", "SoilGrids"],
      },
      {
        id: "stres_roslin",
        titlePl: "Rośliny już odczuwają brak wody",
        evidencePl: "NDMI 0,09 wobec normy 0,22 (scena 12.06, chmury 4%).",
        weight: 2,
        sources: ["Sentinel2"],
      },
    ],
    recommendations: [
      {
        id: "r1",
        kind: "retencja",
        titlePl: "Zastawka na rowie przy działce",
        whyPl: "Deficyt opadów −168 mm i rów 140 m od działki.",
        howPl: "Podnieś poziom wody w rowie deską 30–50 cm w okresie suszy. Otwórz przed prognozowaną ulewą.",
        wherePl: "Rów na południe od działki, ok. 140 m",
        location: [17.8176, 53.1441],
        priority: 1,
        basedOn: ["deficyt_opadow"],
        legalPl: "Zastawka na rowie wymaga pozwolenia wodnoprawnego (art. 389 pkt 6 Prawa wodnego). Wymaga wizji lokalnej.",
        sources: ["BDOT10k", "OpenMeteo"],
      },
      {
        id: "r2",
        kind: "retencja",
        titlePl: "Oczko wodne w najniższym punkcie",
        whyPl: "Najniższy punkt działki 92,4 m n.p.m., różnica wysokości 3,7 m.",
        howPl: "Rozważ płytkie zagłębienie retencyjne do zbierania wody po roztopach.",
        wherePl: "Południowy kraniec działki",
        location: [17.81765, 53.14495],
        priority: 2,
        basedOn: ["deficyt_opadow", "odplyw_powierzchniowy"],
        legalPl: "Wymaga wizji lokalnej. Sprawdź warunki w gminie.",
        sources: ["NMT"],
      },
      {
        id: "a1",
        kind: "agrotechnika",
        titlePl: "Zostaw resztki pożniwne na polu",
        whyPl: "Gleba lekka (68% piasku), mało próchnicy (9,5 g/kg).",
        howPl: "Mulcz ze słomy ogranicza parowanie. Uprawa bezorkowa lub płytka.",
        priority: 1,
        basedOn: ["niska_retencja_gleby"],
        sources: ["SoilGrids"],
      },
      {
        id: "a2",
        kind: "agrotechnika",
        titlePl: "Międzyplon po zbiorze",
        whyPl: "Niska zawartość próchnicy ogranicza zatrzymywanie wody.",
        howPl: "Wysiej międzyplon (np. gorczyca, facelia) zaraz po żniwach.",
        priority: 2,
        basedOn: ["niska_retencja_gleby"],
        sources: ["SoilGrids", "IUNG"],
      },
    ],
    irrigation: {
      decision: "rozwaz",
      deficitMm: 41,
      doseMm: 20,
      timingPl: "Wieczorem lub rano, 2 dawki w odstępie 5–7 dni.",
      reasonPl: "Pszenica jest w okresie krytycznym (maj–czerwiec). Deficyt wody w glebie ok. 41 mm.",
    },
    uncertainty: {
      level: "średnia",
      reasonsPl: ["Dane pogodowe z siatki ERA5 (~25 km), nie ze stacji na polu.", "Progi IUNG do kalibracji."],
      missingPl: ["Brak ostrzeżeń IMGW: ostrzeżenia są dostępne tylko dla dzisiejszej daty."],
      notConsideredPl: ["Poziom wód gruntowych", "Drenaż podziemny", "Odmiana i termin siewu"],
    },
    sources: [
      src("ULDK", "Działka ULDK (GUGiK)", "GetParcelById, EPSG:4326", "ok", 640, "Dane publiczne GUGiK"),
      src("OpenMeteo", "Open-Meteo ERA5", `ERA5 ${year - 10}..${year}`, "ok", 2100, "CC BY 4.0", undefined),
      src("Sentinel2", "Sentinel-2 L2A (Earth Search)", "Scena 2026-06-12, chmury 4%", "ok", 6800, "Copernicus, bezpłatna"),
      src("IUNG", "IUNG susza, kategorie gleb", "Susza__katgl_landuse2024", "ok", 900, "IUNG-PIB"),
      src("SoilGrids", "SoilGrids 2.0", "0–30 cm", "ok", 1500, "CC BY 4.0"),
      src("NMT", "NMT GUGiK", "25 punktów", "ok", 700, "Dane publiczne GUGiK"),
      src("BDOT10k", "BDOT10k rowy", "powiat 0403", "ok", 3900, "Dane publiczne GUGiK"),
      src("IMGW", "Ostrzeżenia IMGW", "Tylko dla dzisiejszej daty", "missing", 0, "Dane publiczne IMGW-PIB", "Data analizy nie jest dzisiejsza"),
    ],
  };
}
