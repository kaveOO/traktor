# Review 2 · 01: engine logic (analyze.ts and its decision helpers)

Scope: `web/src/lib/analiza/analyze.ts` plus `smsr.ts`, `crops.ts`, `meteo.ts` (KBW/climatology), `soil.ts` (category, AWC), `satellite-adapter.ts`, `server.ts` (cache). I read the code line by line and checked it against `fixtures/sample-historical.json` (winter wheat, Kujawy, 2018-07-20) and `sample-today.json`. I edited nothing.

## (a) What works
- **Order follows the brief.** Assessment → causes (sorted by weight) → recommendations, sorted retencja → agrotechnika → nawadnianie (`analyze.ts:612-613`). Irrigation is optional (`null` without weather data).
- **Every rec has a `basedOn` cause.** Each one is built from `has()/pick()` on causes (`:376-511`), and empty `basedOn` arrays are guarded (`:428`, `:488`, `:597`).
- **Thresholds are the official SMSR table.** Real values per crop group × soil category × 14 windows (`smsr.ts:13-30`). `null` (no drought defined) is kept apart from "niewskazana" (beet on category I) and "brak" (grassland), each with a labelled fallback (`:225-231`, `:271-272`).
- **Current and historical are kept apart.** `currentLevel` comes from the decisive window plus a percentile against the same window over 10 years. `historicalLevel` uses only *completed* seasons before the date (`:201`), and past dates get the prefix "Na dzień … zalecenie brzmiałoby" (`:518`).
- **Crop-aware inputs.** Kc per month, root depth, FAO-56 p, critical months and the SMSR group per crop. AWC scales with root depth (`soil.ts:163`).
- **Robustness.** Every source is wrapped in `capped()` with a fallback, under one deadline (`:85`) inside a 24 s budget. Failures are typed: AMBIGUOUS/404/422 parcels, parcels > 500 ha, and a land-use gate that rejects non-farm parcels.
- **Uncertainty.** A six-item score, `missingPl` for every missing source, an ISOK note, a `notConsideredPl` list and honest model notes (gleba pełna po zimie, ETP IUNG z danych modelowych).
- **Contract.** Every `AnalysisResult` field is filled; `floodZone` is explicitly `null` with the ISOK source marked "missing". Output is deterministic for the same upstream data (templates, no randomness, stable sorts).

## (b) Missing / not ready

### P0 (a juror will see these)
1. **Irrigation dose is not capped, so the dose is absurd.** Fixture 2018: net dose **130 mm** (144–173 mm gross), "pominąć, jeśli spadnie ≥ 65 mm". `analyze.ts:581` refills the whole depletion (`min(TAW, max(Dr, D7))`). **Fix:** `dose = min(D7 − 0.3·RAW, MAXDOSE[cat])` with MAXDOSE ≈ 20/25/30/35 mm (cat. I–IV), plus the sentence "powtarzać co N dni". Use a skip-rain threshold of `max(10, dose)`.
2. **Satellite and irrigation ignore crop phenology at harvest.** On 20 July, winter wheat is ripening or already harvested. NDVI 0.21 vs 0.87 still produced:
   - a +1 level bump (`:266`), giving "wysokie" while R = 149/239 = 0.62;
   - a weight-3 cause "stres_roslin" (`:366-374`);
   - a priority-1 "lustracja" rec;
   - "Nawadnianie wskazane" (`:527` only checks Kc < 0.45, and wheat in July has Kc 0.6).

   The satellite text itself says "spadek NDVI jest naturalny", so the output contradicts itself. **Fix:** add a `harvestMonth` (or `senescenceFrom`) field to the crop table. For winter cereals and rape (≥ VII) and spring cereals (≥ VIII): skip the satellite bump and cause, and return irrigation `nie_teraz` with "po fazie krytycznej / dojrzewanie".
3. **A recommendation can come from a calendar alone.** The cause `wrazliwa_uprawa` (`:356-364`) has `sources: []` and fires on the month only. When every source is missing, or in a wet year, it still produces "odmiana_termin" (`:486-498`) and can be the only basis for "nawadnianie" (`:596`). It also suppresses "Dane nie wskazują przyczyn" (`:686`). This breaks the rule "no recommendation without a data-backed cause". **Fix:** treat `wrazliwa_uprawa` as a *modifier*. Emit it only if `deficyt_opadow`, `upal` or `niska_retencja_gleby` exists, and exclude it from `basedOn` when it is the only cause.
4. **The 2018 result may not match SMSR.** The famous 2018 drought in Kujawy comes out as "−149 mm vs −239 mm, no drought" and "Susza w 0 z 10 sezonów". If SMSR's 2018 archive lists drought for zboża ozime in that gmina, the jury will see the mismatch. **Fix:** before demo day, compare 3–4 test-set gminy with the SMSR archive tables (2018, 2015, 2019). If the bias is systematic (NASA POWER P/ET, monthly ETP formula), document it or apply a labelled correction "do kalibracji". Demo only cases that agree.

### P1
5. **Level raised without a matching cause or explanation.** The bump from the projected current window (`:260`) or the satellite (`:266`) is not reflected in the cause (`:304` looks only at the *completed* window with R ≥ 0.75) or in the summary. Result: "wysokie" alongside a summary showing −149/−239 and no deficit cause. **Fix:** record each bump in `notes`/`summaryPl` ("podniesione o 1: prognoza okna …, zdjęcie satelitarne"), and add the current-window evidence to `deficyt_opadow`.
6. **Early-season projection is mostly guesswork.** On ~21 III–10 IV the running window has 3–20 observed days. The 7-day mean is multiplied by up to 55 remaining days (`:183-184`) and can reach "wysokie". **Fix:** project only if `k.days ≥ 20`; otherwise use percentile mode and add an uncertainty note.
7. **Weather after a past date leaks into its assessment.** For past dates, observed weather after the date is used as the "prognoza" in the level (`:166-184`) and the cause text ("prognoza na koniec okna"). Only the irrigation text labels this. **Fix:** for `date < today − 7`, either drop the projection from `currentLevel` or label it "rzeczywista pogoda po dacie" in `winTxt` too.
8. **Agrotechnics ignore the crop.** Grassland and orchard get "Międzyplony po zbiorze", "resztki pożniwne", "Ograniczyć liczbę uprawek" and "Wałowanie po siewie" (`:426-485`). Wałowanie triggers in months 3/4/9/10 for any crop (winter wheat in April, orchards). **Fix:** add a `permanent` flag (uzytki_zielone, sad) that swaps in grassland and orchard measures (koszenie na wyższej wysokości, mulcz w rzędach, murawa międzyrzędzi). Allow wałowanie only in sowing months per crop (spring crops III–IV, winter crops IX–X).
9. **No land-use check when IUNG times out.** A forest or built-up parcel is then analysed as farmland with no warning (`:94`). **Fix:** if `iungR.landUse === null`, add to missingPl: "Nie potwierdzono, że to grunt rolny (IUNG niedostępny)". If SoilGrids is also missing, raise uncertainty to "wysoka".
10. **Partial weather data is not explained.** If NASA POWER fails and only Open-Meteo answers (source "partial"), seasons and percentile are empty, but missingPl says nothing (`:651-658`). When `!M`, the text blames "Open-Meteo" even though NASA POWER is primary (`:106`, `:652`). **Fix:** handle `meteoR.source.status==="partial"` with "Brak 10-letniego tła (NASA POWER): bez percentyla i historii". Rename the fallback label to "NASA POWER + Open-Meteo".
11. **Degraded results are cached for an hour.** A result with a source missing because of a timeout is stored for 1 h (`server.ts:116`), so the jury's retry gets the same degraded answer. **Fix:** set TTL to 2 min when any of sat/IUNG/meteo/NMT is `missing` with detail "limit czasu".
12. **The level is taken from the last window, not the worst one this season.** `evalW = completed ?? current` (`:246`), so an earlier drought window in the same season (e.g. 21.IV–20.VI 2018) is not reported. **Fix:** compute the worst ratio over completed windows of the current year and mention it in the summary ("najgorsze okno w tym sezonie …").

### P2
13. **"upal" title vs evidence.** The cause is titled "Wysoka temperatura" but fires on ET0 ≥ 110 alone (fixture: 23.3 °C, `:323`). Use the title "Duże parowanie" when tmax < 25.
14. **Duplicated numbers in "stres_roslin".** Its evidence repeats NDVI/NDMI because `anomalyPl` already contains them (`:370`). Use only `anomalyPl` when it exists.
15. **Percentile wording.** The text reads `okresu 2018-05-21..2018-07-20` (`:308`). Use `dayPl()`.
16. **Grammar in the gate message.** "Działka … to nie jest grunt rolny" (`:97`) should be "nie jest gruntem rolnym".
17. **Jargon in farmer-facing text.** KBW, ETP, ET0, RAW, TAW and Kc appear without explanation. Add a one-line gloss in the report legend.
18. **Possible double count in historicalLevel.** `cat === "I"` adds +1 (`:277`), but category I thresholds already raise drought years. Use slope only.
19. **Grassland historical level barely varies.** The fallback rule "anomaly ≤ −1 SD" (`:230`) flags about 16 % of years everywhere, so `historicalLevel` is nearly always "umiarkowane". Label it as relative, or base it on category plus percentile.
20. **`kbw60Mm` mixes two windows.** It is the completed SMSR window (FAO), not "60 dni do daty" (`:282`), while the level uses ETP IUNG. Document this in types or the UI label.
21. **No retention measure on flat land without a watercourse.** If there is no watercourse ≤ 300 m and the slope is < 1 %, retention is empty even with a deficit. Add a generic, cause-backed "retencja korytowa / regulowany odpływ drenarski" or say so explicitly.
22. **Legal citation unverified.** Check "Prawo wodne, art. 389 pkt 6" (`:393`) before the pitch.
23. **Satellite timeout not cancelled.** `ctrl.signal` is not passed to `satelliteSafe` (`:120`), so the module keeps running after the timeout.
24. **Sequential IUNG check costs time.** The land-use gate runs IUNG before the other sources (`:89`), adding ≤ 5.5 s to every request. Run it in parallel and gate afterwards.

## (c) Verdict
**Ready for jury: NO, not yet.** The architecture is sound: correct order, official SMSR thresholds, explicit missing data, labelled fallbacks and a full contract. But the one historical fixture we ship (2018, winter wheat) shows three visible errors:
- a 130 mm irrigation dose;
- "nawadnianie wskazane" and a stress alarm at harvest;
- a level raised to "wysokie" without an explanation, while possibly disagreeing with the SMSR 2018 reference.

P0 #3 also breaks the brief's rule "no recommendation without a data-backed cause". Fixing P0 1–3 is about 1–2 h of local changes in `analyze.ts` and `crops.ts`. P0 4 needs a 30-minute comparison against SMSR archive tables. After that, and #5/#8, the engine is jury-ready.
