# Review 2 / 04: Sentinel-2 module (satellite.ts, satellite-adapter.ts, satellite-test.mjs)

Read-only review, 2026-11-22. No app code was changed. Throwaway harness: `%TEMP%\satrev\run.mjs`. It pulls the real ULDK geometries for jury parcels #1 Kraszyce (18.25°E, on the zone boundary), #3 Brodzica (23.85°E, zone 34) and #6 Głubczyce, plus a synthetic **500 ha** square at 18.02°E, then calls `getSatellite` directly. Crop: pszenica ozima.

## Live results (wall time per parcel, cold-ish, residential IP)

| Date / provider | Kraszyce | Brodzica (34N) | Głubczyce | 500 ha @18.02°E |
|---|---|---|---|---|
| 2025-07-10, PC | 3.4 s, ok, T34UCD | 2.8 s, ok, T34UGB | 2.6 s, ok, T33UYR | 4.9 s, ok, T33UYU |
| 2025-07-10, ES forced | **15.0 s, missing** (budget hit) | 14.9 s, ok | 12.2 s, ok | **15.0 s, missing**, norm 1/5 |
| 2018-07-20, PC | 1.8 s, partial (norm = 2017 only) | 1.8 s, partial | 1.3 s, partial | 2.5 s, partial |
| 2026-11-22, PC | 2.0 s, ok (4/5 y) | 1.6 s, ok (3/5 y) | 2.1 s, ok (4/5 y) | 3.5 s, ok, SCL 7 used |

- PC and ES give the same values on the same dates. Głubczyce: NDVI 0.429 vs 0.426, history within ±0.01. So the BOA offset handling is consistent across both catalogues.
- Kraszyce 2018-07-20: NDVI 0.21, NDMI −0.20 against 0.87 in 2017. That is a plausible drought-year signal.

## What works
- **Token** (`satellite.ts:94-102`): the SAS token is cached per module and refreshed 5 min before `msft:expiry`. If the token or PC search fails, the code falls back to Earth Search (`:159-167`). Abort is respected.
- **STAC query** (`:130-157`): uses the bbox with a 0.001° pad (about 100 m), closed datetime windows, scene cloud < 60 % (the parcel mask decides; scenes at 45–49 % were used correctly), sort desc, limit 40. Reprocessed duplicates are deduped by tile+date, using generation_time or sequence. Both `s2:mgrs_tile` and `grid:code` are handled.
- **UTM zone** comes from each item's `proj:epsg`, not from the longitude. A parcel near 18°E is projected into whichever tile's zone is read (Kraszyce → 34UCD, 18.02°E → 33UYU), so there is no 32633/32634 mismatch. The Snyder series is well under 1 m within ±3.5° of the central meridian, which covers all of Poland from either zone.
- **COG window** (`:172-185`): `getOrigin`/`getResolution` give the correct sign for `ry`. The window is padded by 1 px on each side, clamped to W/H, and returns null if empty. `at()` (`:187-192`) maps every 10 m point into each band's own grid, so B04/B08 at 10 m and B8A/B11/SCL at 20 m line up without resampling. The pixel-centre grid (`floor/10*10+5`) matches the S2 tile origins. Points outside the tile read 0 (SCL nodata), so they are rejected and the overlapping tile is tried.
- **Mask**: even-odd point-in-polygon over all rings handles holes and multipolygons. A tiny parcel falls back to its centroid pixel. SCL {4,5}, with {4,5,7} only when fewer than 60 % of pixels are valid, and a source note when 7 is used (`:196-224`). SCL is read first, so cloudy parcels exit after one small read.
- **Bands**: NDVI uses B08/B04 at 10 m. NDMI uses B8A/B11 at 20 m (Gao 1996), as 07-science requires.
- **Offset**: PC subtracts 0.1 when `s2:processing_baseline` ≥ 04.00 (parseFloat("05.09") is handled). ES subtracts 0 when `earthsearch:boa_offset_applied`. Cross-provider agreement confirms both.
- **Baseline**: 5 years are searched in parallel with the current scene. The history scene with the least cloud wins (DOY breaks ties). The spread rule (> 0.3 → no anomaly) and the "uprawy mogły się różnić" label follow 07-science.
- **Memory for 500 ha**: about 50 k sample points and windows of about 240×240 px per band. That is trivial, and it ran in 4.9 s.
- **Licence**: "Contains modified Copernicus Sentinel data 2020-2025 (Copernicus Sentinel Data Legal Notice); Microsoft Planetary Computer (…)". The year range is correct and comes from the scenes actually used.

## MISSING / NOT READY

### P0
- None. The module returns sane, sourced values for all 3 jury parcels and the 500 ha case, with both PC and ES.

### P1
1. **The outer timeout equals the inner budget, so partial results are lost.** `analyze.ts:120` passes `min(15000, leftD-300)` to `satelliteSafe` (`satellite-adapter.ts:26`), and `getSatellite` has a fixed `BUDGET_MS = 15000` (`satellite.ts:13,356`). When the budget is hit, the inner abort resolves a few ms after the outer `withTimeout` has already rejected. The app then shows "brak sceny w 15 s" and throws away the history and current scene it already had. With ES forced, 2 of 4 parcels hit exactly 15.0 s. **Fix:** add `budgetMs` to `getSatellite(parcel, date, crop, budgetMs)`, call it with `timeoutMs - 1000`, and keep the outer timeout only as a guard.
2. **No PC → ES fallback for COG reads.** The fallback in `:159-167` covers only token or search errors. If the PC blob store returns 403, times out, or has an expired SAS, `bestScene` swallows the error (`:263`) and the user sees "Brak bezchmurnej sceny w 20 dniach" (`:402`), which is wrong. **Fix:** count read errors in `bestScene`. If every try threw (rather than being rejected for cloud), re-run `search("es")` once and retry. Also return a distinct note ("błąd odczytu COG").
3. **A 1-year "norm" is treated as comparable.** `spread` is null when n < 2 (`:386`), so `comparable = true` (`:294`). At 2018-07-20, which is a key jury date, every parcel gets an anomaly against 2017 alone ("NDVI o 0,66 niższy niż zwykle"), and 2017 may well have been a different crop. **Fix:** draw anomaly conclusions only when n ≥ 3, and otherwise show the values. For dates before 2022, also take years *after* the date (up to 5 others) to build the norm.
4. **Ripening text ignores the direction of change.** `:322-323` always says "spadek NDVI jest naturalny", even when NDVI *rose* (Brodzica 2025: 0.87 vs 0.44; Brodzica 2018: "+0,29"). It sits next to "wyższy niż zwykle", which reads as a contradiction. **Fix:** emit it only when `ndviNorm != null && ndvi < ndviNorm`.
5. **November wording for winter crops.** `winterCrop` counts as off-season only in Dec–Feb (`:315`). Kc in November is 0.5, so 2026-11-22 (jury date #1) produces "NDMI poniżej zera przy zielonej roślinności może oznaczać stres wodny" at NDVI 0.30/0.41 (`:344`), in autumn, outside the SMSR season. **Fix:** treat a winter crop in months 10–12 and 1–3 as off-season. Gate the NDMI < 0 flag on `ndvi >= 0.6 && kc >= 0.8`, not on `ndvi >= 0.3`.
6. **The current-scene window is too short for autumn and winter.** It is 20 days before the date (`:366`). Many November scenes are cloudy (10-jury-test-set). It worked today, but that is luck. **Fix:** if nothing is found, widen to 45 days and say so in the note ("scena sprzed N dni").

### P2
7. **Token stampede:** 6 parallel searches each call `pcToken` while the cache is empty, which means 6 SAS requests (`:95-101`). Cache the in-flight promise instead.
8. **History window is centred on `date`, not on `cur.date`** (`:372-375`). The current scene can be up to 20 days older than the date, so phenology can drift by up to 35 days. Also, ties are broken by cloud before DOY. Prefer `|Δdoy| ≤ 10 d` first and cloud second, or centre the window on `cur.date`.
9. **NDMI noise threshold** is 0.10 for both indices (`:280`). 07-science suggests 0.08 for NDMI. Either use 0.08 or document why 0.10 is kept.
10. **Dark-pixel clamp:** `Math.max(0, …)` (`:230`) turns red DN < 1000 into 0, which gives NDVI = 1.0. Skip the pixel when any reflectance is ≤ 0 instead.
11. **Adapter fallback source** (`satellite-adapter.ts:19-20`) cites only "Earth Search STAC" with the ES URL, although PC is the primary. Align it with the main licence string ("Contains modified Copernicus Sentinel data YYYY").
12. **No result cache:** a repeated analysis of the same parcel and date makes 6 searches and up to about 30 COG header fetches again. Add a small LRU keyed on `parcel.id|date`, which also helps during the jury demo.
13. **The spread rule turns the anomaly off almost everywhere:** 3 of 4 parcels in July 2025 (spread 0.32–0.65), so satellite never contributes in practice. That is honest and per spec, but say it in the pitch ("satelita pokazuje wartości; anomalia tylko przy stabilnej historii"). Consider using z-scores once n ≥ 4.
14. **`satellite-test.mjs`** uses 3 synthetic 4 ha squares with no assertions. Add jury parcels #1/#3/#6 (ULDK geometry), a 500 ha case, an ES run, and checks: NDVI in [−0.2, 1], `status != missing` in July, PC-vs-ES |ΔNDVI| < 0.03, wall < 10 s.
15. **Minor:** the rejection reason "cloud X%" also covers pixels off the tile edge (`:222`). The reason is internal only, but it misleads debugging.

## Verdict
**Ready for the demo with PC as primary:** 1.3–4.9 s per parcel, correct bands, offset, mask and projection on both sides of 18°E and in zone 34. It is not robust when PC degrades: the ES fallback takes 12–15 s and collides with the outer timeout (P1-1, P1-2). Fix the wording bugs P1-3 to P1-5 before jury dates 2018-07-20 and 2026-11-22, because they produce the exact contradictory or off-season sentences the jury will read.
