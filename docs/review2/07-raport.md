# Review #7: /raport vs brief 3.3.5–6 (committed HEAD 5833927)

Scope: `web/src/app/raport/page.tsx` and `web/src/components/raport/{RaportApp,ReportSheet,charts,format,saved,fixture}.tsx?` from `git show HEAD:`.
I mapped both engine fixtures (`lib/analiza/fixtures/sample-today.json`, `sample-historical.json`, 2018-07-20) onto every field the report reads.
Working tree: a redesign edits RaportApp/ReportSheet/charts (+443/−366). I checked it with grep only. It adds `methodVersion` to the header. ERA5 text, threshold logic, attribution mapping and the demo banner are unchanged, so the findings below still apply.

## Requirement checklist (brief 3.3.5–6)

| Requirement | Status | Where |
|---|---|---|
| Water deficit status (now and historical) | OK | ReportSheet.tsx:297-318, 2 levels + summary + 14-row indicator table |
| Causes, with the data behind them | OK | :372-394, evidence + weight + source tags |
| Retention recommendations, justified | OK | :397-404, Dlaczego/Jak/Gdzie/Prawo/Podstawa |
| Agrotechnical recommendations | OK | :407-414 |
| Irrigation, optional | OK | :417-447, decision, deficit, dose, m³/ha, legal note |
| Analysis DATE | OK | :272-277 analysis date, generation time, duration |
| Data SOURCES | PARTIAL | :497-543, table OK but licence/attribution texts wrong (P1-2, P1-3) |
| Limitations: currency and accuracy | PARTIAL | :486-489 currency text is wrong for the current engine (P1-1) |
| Uncertainty level | OK | :450-455 level + meter + reasons |
| Factors not considered | OK | :477-484 `notConsideredPl` |
| Missing data stated plainly | OK | `n()` → "brak danych", `missingPl`, source status "! brak" |
| No false precision | PARTIAL | P2-1 |
| Saved in the system / file / print | OK | localStorage (saved.ts, max 12), JSON download, print → PDF |
| Demo labelled | PARTIAL | header banner only (P2-5) |
| Error states | OK | RaportApp.tsx:103-143, 226-246: non-JSON, `{error}`, 60 s timeout, retry, missing saved key |

Data binding: every field the report reads exists in both fixtures with the contract names. Nothing is renamed. All nullable fields go through `n()`/`?? NA`. `ditchDistM`, `floodZone`, `deficitMm` and `doseMm` are null in the fixtures and render safely. No crash path found for valid engine output.

## MISSING / NOT READY

### P0
None. The report renders both fixtures, covers every section the brief asks for, and prints.

### P1
1. **Meteo method text contradicts the engine.** The engine now uses NASA POWER (MERRA-2, ~50 km) plus the Open-Meteo forecast. It also uses weather *after* the analysis date: "dane po dacie analizy do 2026-12-01" in today's fixture, and "rzeczywista pogoda 7 dni po dacie" in the historical one. The report hard-codes three wrong statements:
   - "ERA5 (Open-Meteo) ... siatka ok. 10–30 km" at format.ts:102.
   - "Źródło: Open-Meteo (ERA5)" at ReportSheet.tsx:366.
   - "dane meteo do {data} (reanaliza ERA5 … 5-dniowym opóźnieniem)" at ReportSheet.tsx:487.

   The engine's own `uncertainty.reasonsPl[0]` says NASA POWER, so the same page contradicts itself.
   *Fix:* drop the ERA5 lines from `METHOD_LIMITS` (the engine already sends them in `reasonsPl`). Build the currency line from `sources[OpenMeteo].detail`, or state it plainly: "meteo z NASA POWER + Open-Meteo, okno do X dni po dacie analizy".
2. **The OSM watercourse source is credited to GUGiK.** The engine reuses id `BDOT10k` for OpenStreetMap (label "Rowy i cieki … (OpenStreetMap)", licence "© OpenStreetMap contributors, ODbL"). But `attributionFor("BDOT10k")` returns "Dane: GUGiK (ULDK, NMT, BDOT10k)" (format.ts:86-89). `licenseOf` prefers that text over `x.license` (ReportSheet.tsx:231), so:
   - the ODbL notice required by 03-licences.md row 30 disappears;
   - BDOT10k is claimed even though it was never used.

   The comment "no OSM line" at format.ts:73 is out of date.
   *Fix:* for that id, show `x.license`: "© autorzy OpenStreetMap" with a link to openstreetmap.org/copyright. Better still, add an `OSM` id to the contract on main. The row tag "BDOT10k" at ReportSheet.tsx:217 then also changes.
3. **NASA POWER is dropped from the attribution.** The `OpenMeteo` id is mapped to "Open-Meteo.com, CC BY 4.0" (format.ts:80-81). This override replaces the engine licence "NASA POWER Project, LaRC (dane otwarte); Open-Meteo.com, CC BY 4.0" in both the table and the attribution list. NASA asks for a citation.
   *Fix:* merge the two texts. Do not override `x.license` when it is more complete.
4. **The drought threshold and chart disagree with the engine's drought flags.** The report computes `threshold = crop.iungKbw[cat]` (ReportSheet.tsx:152-153; −190 mm for wheat on cat. III) and labels the chart "KBW w okresie krytycznym (maj–czerwiec)". The engine flags drought with official SMSR 60-day window thresholds (smsr.ts, analyze.ts:139-200), and `kbwCriticalMm` is the worst SMSR window based on ETP IUNG, not ET₀. In sample-today, 2019 = −222 mm sits below the dashed "próg IUNG −190 mm" line but has `drought:false`, so a juror sees a contradiction.
   *Fix:* have the engine expose the threshold it used (e.g. `seasons[].thresholdMm` or `meteo.smsrThresholdMm`) and draw that. Otherwise remove the line, and rename the label and the table row (:182-184) to "najgorsze okno SMSR (60 dni)".
5. **Implausible irrigation dose shown without a guard (engine-side, but printed).** Historical: `doseMm 130` is rendered as "130 mm (= 1300 m³/ha)" (ReportSheet.tsx:425). A single net dose is normally 20–35 mm.
   *Fix:* raise this with the engine lane: cap the dose or split it into several doses. Until then, the report could print "dawka sezonowa" when the value is above 40 mm.

### P2
1. **False precision.** The engine returns integer mm, but the report prints `n(precip30Mm,1)` "29,0 mm" and ETc/ET₀ "8,0 mm" (ReportSheet.tsx:169,175-176). Use 0 decimals. `location.toFixed(5)` uses a dot and is not in Polish format (:112). Use `n(v,5)`.
2. **Season order.** The engine sends the newest season first, so the chart runs 26→17 from left to right and the caption reads "sezony 2026–2017" (charts.tsx:138, ReportSheet.tsx:363-364). Sort ascending by year before drawing.
3. **Irrigation deficit label.** When `decision:"nie_teraz"` and `deficitMm:null`, "Deficyt: brak danych" is misleading, because the value was not computed out of season. Show "nie liczono (poza sezonem)".
4. **Sentinel attribution year.** `dataYear` is the scene year only (:230), but the engine licence states the range used for the norm ("2021-2026", "2017-2018"). Use the range from `x.license`.
5. **Demo banner on the first page only** (:252-256). Printed pages 2–3 of a demo report carry no marker. Add "DEMO" to the `@page` bottom-left content or to the footer when `demo` is set.
6. **`seasonsN = m.seasons.length || 10`** (:156). With an empty archive this shows "x / 10". Use NA instead.
7. **"Wszystkie źródła odpowiedziały"** (:474) appears whenever `missingPl` is empty, even if a source is `partial`: historical has Sentinel2 and NMT partial. Derive it from `sources[].status`.
8. **Timezone.** `dateTime()` uses the browser zone and does not name it. Add `timeZone:"Europe/Warsaw"` and the suffix "czasu PL" so the PDF reads the same everywhere.
9. **Print.** `@page` margin boxes with "Strona X z Y" (RaportApp.tsx:15-20) work in Chromium 131+ only. Firefox and Safari print no page numbers. The footer tagline is English ("Let the land hold its water.") in a Polish document. A4, `break-inside: avoid`, repeated `thead` and print colour are OK.
10. **Saved reports are not checked** (saved.ts:13-17, 51-53). If a v1 entry has an older shape, `ReportSheet` crashes. Check `result.parcel && result.assessment` before rendering, and fall back to the error state.
11. **JSON download.** `URL.revokeObjectURL` runs synchronously after `click()` (RaportApp.tsx:163). Defer it with `setTimeout(…, 0)` for Safari.
12. **Crop names without diacritics** come from crops.ts ("Jeczmien jary", "Zyto") and print in the report header. Fix them on main.
13. **Stale comment.** ReportSheet.tsx:240 says the contract has no `textSource`, but `types.ts:164` has it. Read `r.textSource` directly.

## Verdict
**Ready for the demo with fixes.** The structure fully meets 3.3.5–6: status, causes, three types of justified recommendation, date, sources, uncertainty, missing data, factors not considered, and PDF/print/JSON/local save. The data binding is null-safe against the real engine output.

Before submission, fix these four, because a juror reading the PDF will notice them:
- P1-1: wrong ERA5 method text.
- P1-2: OSM credited to GUGiK (a licence compliance issue).
- P1-3: NASA POWER attribution dropped.
- P1-4: threshold line that contradicts the drought flags.

The fixes for P1-1 to P1-3 are about 20 lines in format.ts and ReportSheet.tsx. P1-4 needs one field from the engine on main.
