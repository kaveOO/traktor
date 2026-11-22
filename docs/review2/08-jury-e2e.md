# 08. End-to-end jury QA (read-only)

Run on 2026-11-22, 09:45–10:10, from a detached worktree of HEAD `5833927` (`traktor-wt2/qa-e2e`) with `npm ci`, `npm run build` (passed, 75 s) and `next start -p 3022`.
- **No `.env.local`.** The run was keyless, which is what a jury clone gets.
- Requests came from a residential IP and ran one at a time, paced under the 30/min per-IP limit.
- Artefacts (24 PDFs, DOM dumps, API JSON, a screenshot) are in `%TEMP%\traktor-qa`, not in the repo. No code was touched.

## P0 / P1 first

**P0 (blocks the jury run): none found.**
- Every parcel × date returned 200 in ≤ 9.4 s cold.
- Every report rendered with the parcel id, a level, causes and sources.
- All 3 non-agricultural parcels were rejected with 422 `NOT_AGRICULTURAL`.

**P1 (the jury will notice):**
1. **2018 drought is under-called, and "history" contradicts the date.**
   - On 2018-07-20 only Kraszyce (III) and Chotynia (I, sand) are `wysokie`.
   - Wyskoć (cat. II, Wielkopolska, expected drought) is `niskie` with KBW −138 mm, and its summary has no SMSR threshold.
   - Szastały is `niskie` (KBW −98 mm).
   - Kraszyce reads "Susza w **0 z 10** ostatnich sezonów" and "Podatność w 10 latach: **Niskie**" on the date of the worst SMSR drought on record (94 % of gminy). The SMSR thresholds the engine uses (−239 mm for Kraszyce, −180 to −306 mm elsewhere) are never reached by the 60-day KBW (−36 to −149 mm), so the drought history is almost always 0–3/10.
   - A juror who knows 2018 will doubt the method. Fix: calibrate the thresholds (the method version already says "progi do kalibracji"), or label history as "wg progów SMSR, kalibracja w toku".
2. **BDOT10k is `missing` in 24/24 runs, and each one waits a ~4.8 s timeout.**
   - The report then shows "Odległość do rowu lub cieku: brak danych" and "Brak danych o ciekach (usługa niedostępna)", so the retention (zastawki) section is weak on every parcel.
   - Removing the dead call would also cut ~1–2 s per run.
3. **ISOK is `missing` in 24/24** (0 ms, so it is not wired up). No flood signal for Ptakowice (Sept 2024 flood valley).
4. **SoilGrids timed out (8 s) in 2/24 runs** (Kraszyce 2021, Wyskoć 2018). Then AWC, texture, irrigation deficit and dose all show "brak danych". Wyskoć 2018 has 13 × "brak danych" in its report.
5. **Sentinel-2 is `partial` on every 2018 date** and `missing` once (Chotynia 2021).
   - Kraszyce 2018 has the cause "stres_roslin" from NDVI 0.21 vs 0.87, but the text itself notes this is the ripening period.
   - The cause stays plausible but fragile.

**P2:**
- IMGW timed out once (Kraszyce, today, 5 s).
- For a non-agricultural parcel the report says "Błąd analizy" and offers "Spróbuj ponownie". That is a correct message, but retrying cannot help and "błąd" is the wrong framing.
- `/analiza` result panel shows a horizontal scrollbar at 1440×900.
- IUNG reports Brodzica as cat. III (the test set said IV). Not a bug, since this run uses the fixed axis order.
- Report PDF is 3 pages (2 parcels 4 pages). The commit "print 1 page" no longer holds with v2 content.
- Map is blank in headless (WebGL, expected). Not verified in a real GPU browser in this run.

## Routes (all GET, next start)
| Route | Status | Note |
|---|---|---|
| `/` `/analiza` `/raport?demo=1` `/mapa` `/karta` `/slides` `/metoda` | 200 ×7 | 29–116 ms (static) |
| `/api/health` | 200 | `{"ok":true,"demo":true}` |
| `/api/dzialka?parcelId=040706_5.0021.44` | 200 | 402 ms |
| `/nonexistent` | 404 | expected |

## Analysis matrix: GET /api/analiza (cold = first call; warm = in-process cache HIT 4–52 ms in all cases)
| # | Parcel (crop) | Date | Status | Cold s | Level now / 10 yr | Causes | Report (Edge PDF) |
|---|---|---|---|---|---|---|---|
| 1 | 040706_5.0021.44 Kraszyce III (pszenica) | today | 200 | 8.2 | umiark. / niskie | stres_roslin | OK 3 p |
| | | 2018-07-20 | 200 | 8.6 | **wysokie** / niskie | stres, upał | OK 3 p |
| | | 2021-06-15 | 200 | 9.0 | niskie / niskie | wrażliwa uprawa | OK 3 p (SoilGrids missing) |
| 2 | 301103_2.0035.322/3 Wyskoć II (rzepak) | today | 200 | 8.4 | umiark. / wysokie | retencja, deficyt | OK 3 p |
| | | 2018-07-20 | 200 | 8.9 | **niskie** / umiark. | upał, retencja, stres | OK 3 p (SoilGrids missing) |
| | | 2021-06-15 | 200 | 8.1 | niskie / umiark. | retencja | OK 3 p |
| 3 | 060404_2.0142.AR_2.182 Brodzica (burak), east, AR_ id | today | 200 | 5.7 | niskie / niskie | odpływ | OK 3 p |
| | | 2018-07-20 | 200 | 6.1 | niskie / umiark. | odpływ, uprawa | OK 3 p |
| | | 2021-06-15 | 200 | 5.9 | niskie / niskie | odpływ | OK 3 p |
| 4 | 200303_2.0052.141/1 Szastały (łąka), east | today | 200 | 6.5 | umiark. / wysokie | retencja, deficyt | OK 4 p |
| | | 2018-07-20 | 200 | 6.4 | **niskie** / umiark. | retencja, upał | OK 3 p |
| | | 2021-06-15 | 200 | 6.5 | niskie / umiark. | retencja | OK 3 p |
| 5 | 140311_2.0002.30/3 Chotynia I sand (żyto) | today | 200 | 5.6 | umiark. / b. wysokie | retencja, deficyt | OK 3 p |
| | | 2018-07-20 | 200 | 5.8 | **wysokie** / wysokie | retencja, stres, upał | OK 3 p |
| | | 2021-06-15 | 200 | 5.6 | niskie / b. wysokie | retencja, deficyt | OK 3 p (S2 missing) |
| 6 | 160203_4.0100.156/4 Głubczyce IV loess (kukurydza) | today | 200 | 5.8 | niskie / niskie | none, 0 recs | OK 3 p |
| | | 2018-07-20 | 200 | 5.8 | niskie / niskie | upał, uprawa | OK 3 p |
| | | 2021-06-15 | 200 | 5.7 | niskie / niskie | none ("brak zaleceń") | OK 3 p |
| 7 | 220903_2.0006.97/60 Żuławy IV (pszenica) | today | 200 | 6.5 | umiark. / niskie | deficyt, stres | OK 4 p |
| | | 2018-07-20 | 200 | 6.3 | umiark. / niskie | upał, stres | OK 3 p |
| | | 2021-06-15 | 200 | 8.4 | niskie / niskie | uprawa | OK 3 p |
| 8 | 160104_5.0124.2/1 Ptakowice flood (ziemniak) | today | 200 | 6.1 | niskie / niskie | retencja | OK 3 p |
| | | 2018-07-20 | 200 | 9.3 | niskie / niskie | upał, retencja | OK 3 p |
| | | 2021-06-15 | 200 | 6.0 | niskie / niskie | retencja | OK 3 p |

**Report check, "OK".**
- Each report was printed by headless Edge (`--print-to-pdf`, 750–885 kB, 3–4 pages). A `--dump-dom` of the same URL confirms all of these:
  - the parcel id;
  - a level word;
  - a "Przyczyny" section;
  - a sources section naming ULDK, IUNG and Sentinel;
  - no error or loading state;
  - no "dane demo" label on live parcels.
- Every report has 5–13 "brak danych" cells, mostly BDOT10k, ISOK and SoilGrids.
- Edge print took 2.5–17 s with a warm API. One dump-dom took 43 s (Kraszyce 2021), probably headless virtual-time stalling on tiles or STAC rather than the API.
- I did not test the report with a cold API, so the cold end-to-end time is roughly API ≤ 9.4 s plus about 2.5 s of render, about 12 s, inside the 30 s budget.

**Today (2026-11-22):** every summary says "Poza okresem monitoringu suszy SMSR (21.III–30.IX)" and shows the last season. This is correct.

## Negatives and input edge cases
| Input | Result |
|---|---|
| `040706_5.0020.3309/3` (forest) | 422 NOT_AGRICULTURAL "las, 99 %", 0.8 s; /raport shows the message |
| `141703_2.0001.116` (forest) / `321205_4.0009.16` (built-up) | 422, "las 100 %" / "teren zabudowany 100 %", ~1 s |
| date 2016-11-21 / 2016-11-22 / 2026-11-23 | 400 "ostatnie 10 lat" / 200 (boundary OK) / 400 "z przyszłości" |
| no date | 200, defaults to today |
| `040706.0021.44` (no gmina digit) | 200, resolved |
| `Kraszyce 44` | 200, resolved, 9.4 s |
| `Kobylniki 1` | 409 AMBIGUOUS, 5 candidates |
| crop `banan` / id `999999_9.9999.1` | 400 lists the crops / 404 with a hint, 6.8 s |
| `lon=18.25&lat=52.65` on 2019-06-30 | 200, wysokie |

## Source latency (ms, from `sources[]`, 24 runs)
| Source | Typical | Worst | Status |
|---|---|---|---|
| ULDK | 200–560 | 3747 | ok 24/24 |
| Meteo (NASA POWER + Open-Meteo) | 12–330 | 2072 | ok 24/24, no 429 seen |
| IMGW (today only) | 59–138 | 5009 timeout | 7/8 |
| Sentinel-2 | 1.6–4.6 k | 7.5 k | ok 15, partial 8 (all 2018), missing 1 |
| IUNG WCS | 340–720 | 1281 | ok 24/24, including the east (axis fix holds) |
| SoilGrids | 1.6–3.3 k | 8.0 k timeout | 22/24, **the long pole** |
| NMT | 200–1500 | 5241 | ok 21, partial 2 |
| BDOT10k | ~4.8 k | — | **missing 24/24** |
| ISOK | 0 | — | **missing 24/24** |

## Not tested
- Chrome, Firefox, Safari and Opera. Only headless Edge (Chromium) was available.
- WebGL map rendering.
- Browser console errors (headless Edge `--dump-dom` does not expose them).
- Concurrent jurors. MAX_CONCURRENT is 4, and a fifth parallel cold request waits ≤ 4 s and then gets 503.
- Behaviour behind a shared NAT IP (30 req/min limit per IP) and when the meteo quota runs out.

## Verdict: would we pass the jury run today?
**Yes on function and timing. At risk on credibility.**
- Every id format the jury might type works.
- Non-agricultural parcels are refused with a clear message.
- Reports arrive in about 6–9 s, well under 30 s, and contain an id, a level, causes, recommendations and sources.
- The weak point is plausibility for 2018. Half of the expected drought parcels read `niskie`, and the "10-year drought history" says 0/10 in the 2018 drought year.
- Every report also carries "brak danych" for watercourses and flood zones (BDOT10k/ISOK). Those are exactly the inputs the retention (zastawki) story depends on.
- Fix order: calibrate or relabel the SMSR thresholds, then BDOT10k (or the OSM fallback the slides claim), then the SoilGrids timeout or cache, then ISOK.
