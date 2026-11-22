# 10. Jury test set and live source check

Checked 2026-11-22 from a residential IP. Scripts were throwaway PowerShell in %TEMP%. No app code was changed.

## Two blocking findings (fix before the jury)

1. **IUNG WCS axis order is wrong in our contract.** The skill and `engine/web/src/lib/analiza/soil.ts` send `subset=y(N)&subset=x(E)`, but this GeoServer coverage follows the Polish geodetic convention: **x = northing, y = easting**. The DescribeCoverage envelope is `133120 171570 / 775030 862010` (x range = northing range).
   - Decoded GeoTIFF pixels compared with WMS GetFeatureInfo at the true point:
     - Kraszyce: GFI = 3. Current order gives 11 (forest). Swapped order gives 3.
     - Lewin Brzeski: GFI = 4. Current order gives 12 (water). Swapped order gives 4.
     - Głubczyce and Sobolew match by chance.
   - East of E = 775 030 (Lubelskie, Podlasie) the current order returns **HTTP 404**, because the transposed point falls outside the envelope. A jury parcel in Hrubieszów would show "brak danych".
   - **Fix:** `subset=x(${N-d},${N+d})&subset=y(${E-d},${E+d})`. As a check or fallback, use WMS GetFeatureInfo on `Susza:katgl_landuse2024` (`info_format=application/json`, returns `GRAY_INDEX`).
2. **Open-Meteo free tier ran out**, so every archive call returned 429: `{"reason":"Daily API request limit exceeded. Please try again tomorrow."}`. The archive call was not timed.
   - The limit is 10 000 calls a day per IP. Requests longer than 2 weeks count as several calls (open-meteo.com/en/pricing, fetched today), so one 10-year daily request costs about 260 calls, which is roughly 38 analyses a day.
   - The forecast endpoint (`past_days`) still returned 200.
   - **Fix:** cache per grid cell (0.1°) on disk, pre-warm all 12 parcels below plus the demo parcel, request only the needed years (for example the 2 seasons around the analysis date plus the climatology from cache), and show a "dane meteo: cache z dnia …" source line. Consider a paid key for jury day.

## Legend: IUNG `katgl_landuse2024` values (GetLegendGraphic)
1–4 = soil drought-susceptibility category I–IV (I = light, most susceptible), 5 = organic soils, 11 = forest, 12 = water, 13 = built-up, 14 = roads and wasteland, 19/99 = unclassified. **Any value ≥ 11 means "nie jest użytkiem rolnym" and the app should say so instead of running the analysis.** This check rejected 5 of my first 14 candidate points (forest or built-up), so the jury will likely also hit non-agricultural parcels.

## Parcel set (all ids verified: GetParcelByXY → id → GetParcelById round-trips with status 0)

| # | Region / type | lon, lat | Parcel id (TERYT) | Gmina, obręb | IUNG cat. | Verified |
|---|---|---|---|---|---|---|
| 1 | Kujawy drought belt, black soils | 18.250, 52.650 | `040706_5.0021.44` | Kruszwica, Kraszyce | III | yes |
| 2 | Wielkopolska (Kościan) | 16.750, 52.050 | `301103_2.0035.322/3` | Kościan, Wyskoć | II | yes |
| 3 | Lubelskie loess, Hrubieszów basin (**AR_ sheet id**) | 23.850, 50.780 | `060404_2.0142.AR_2.182` | Hrubieszów, Brodzica | IV | yes |
| 4 | Podlasie (Bielsk Podl.) | 23.100, 52.750 | `200303_2.0052.141/1` | Bielsk Podlaski (gm. wiejska), Szastały | III | yes |
| 5 | Mazowsze sands (Garwolin) | 21.700, 51.800 | `140311_2.0002.30/3` | Sobolew, Chotynia | I | yes |
| 6 | Opolskie, Płaskowyż Głubczycki loess | 17.850, 50.200 | `160203_4.0100.156/4` | Głubczyce (obszar wiejski), Głubczyce | IV | yes |
| 7 | Małopolska upland (Proszowice) | 20.300, 50.200 | `121405_5.0016.480/3` | Proszowice, Opatkowice | III | yes |
| 8 | Pomorze, Żuławy (polder) | 18.950, 54.150 | `220903_2.0006.97/60` | Lichnowy, Parszewo | IV | yes |
| 9 | Warmia (Kętrzyn) | 21.300, 54.050 | `280803_2.0011.3/1` | Kętrzyn (gm. wiejska), Grabno | III | yes |
| 10 | Lubuskie (Sulechów) | 15.600, 52.100 | `080906_5.0002.65/3` | Sulechów, Brzezie k. Sulechowa | II | yes |
| 11 | Zachodniopomorskie, Pyrzyce plain | 14.880, 53.200 | `321205_5.0005.135` | Pyrzyce, Turze | IV | yes |
| 12 | Sept 2024 flood, Nysa Kłodzka valley | 17.550, 50.760 | `160104_5.0124.2/1` | Lewin Brzeski, Ptakowice | IV | yes |

Spare points:
- Sand category I: `142402_2.0015.213` (Obryte, Sadykierz, 21.30/52.70) and `141510_2.0005.417/8` (Rzekun, Dzbenin, 21.55/53.05).
- Loess: `060406_2.0135.34` (Trzeszczany, Zadębce, 23.75/50.85).

Negative tests (the app should say "nie jest użytkiem rolnym"):
- `040706_5.0020.3309/3` (Kruszwica, 18.30/52.70, forest 11)
- `141703_2.0001.116` (Celestynów, forest 11)
- `321205_4.0009.16` (Pyrzyce town, built-up 13)

Caveat: categories come from IUNG GFI at the chosen point, not from a visual check of the orthophoto. Parcel centroids can still fall on a different land-use class.

## Timings (ms, HTTP status). 4 parcels, single run, cold

| Call | Kraszyce | Brodzica (E) | Głubczyce | Lewin Brz. | Notes |
|---|---|---|---|---|---|
| ULDK GetParcelByXY (+geom_wkt) | 229 | 146 | 296–409 | 287–374 | always 200 |
| Open-Meteo archive 10 y daily, 3 vars | 429 | 429 | 429 | 429 | daily quota exhausted, see above |
| Earth Search STAC, 20-day window | 572–1451 | 447–983 | 434–1345 | 485–1188 | 200; full items are 125–540 kB, use `fields` to trim (≈450 ms) |
| SoilGrids sand/clay/soc, 3 depths | 1731 | 1730 | 1296–2398 | 1261–1891 | 200, slowest stable call |
| NMT GetHByPointList, 40 pts | 110–195 | 110–1129 | 111–1090 | 115–1141 | 200; "N E" order correct, heights plausible (84–264 m) |
| IUNG WCS 60×60 m | 293–404 | **404** | 293 | 304–316 | 404 = transposed axis bug; 200 when fixed |

STAC scene counts at 17.85/50.20 (point intersects):
- 2026-07-01..20: 26 items (clear ≤ 30 %: 6)
- 2018-07-01..20: 22 items (5 ≤ 15 %)
- 2026-11-02..22: 20 items (4 ≤ 21 %)

Brodzica, 2026-07: 12 items. Archive depth back to 2018 is fine. November windows are mostly cloudy, so widen to ±30 days or fall back with a "brak sceny bez chmur" label.

Budget per analysis, run in parallel: about 2 s without Open-Meteo (SoilGrids is the long pole). Fire all calls with `Promise.allSettled` and a 10 s timeout each.

## Id formats the jury may type (tested on ULDK)

| Input | GetParcelById | GetParcelByIdOrNr |
|---|---|---|
| `040706_5.0020.3309/3` (full) | ✅ | ✅ |
| `040706.0020.3309/3` (no `_5` gmina-type digit) | ❌ | ❌ |
| `Kobylniki 3309/3` (obręb name + number) | ❌ | ✅ unique |
| `Kobylniki 1` | ❌ | ✅ **5 hits** in 5 gminy (Kruszwica, Wyszogród, Wiślica, Kościan, Rokietnica) |
| `Kruszwica Kobylniki 3309/3` (gmina + obręb) | ❌ | ❌ |
| `Głubczyce 156/4` (with Polish letters, UTF-8) | n/a | ✅ |
| `Brodzica 182` / `Brodzica AR_2.182` | n/a | ✅ both resolve to `…0142.AR_2.182` |
| `3309/3` or `306/2` (number only) | ❌ | ❌ |
| `040706_5.0020.3309-3` (dash instead of slash) | ❌ | ❌ |

`GetRegionByNameOrId&id=Kobylniki&result=teryt,name,voivodeship,county,commune` lists every obręb with that name and its gmina and powiat. `GetCommuneByNameOrId` does not exist.

### Proposed UX (one search box plus a fallback picker)
1. Normalize the input: trim, collapse spaces, replace `-` and `\` with `/`, uppercase `ar_` to `AR_`, keep Polish letters (UTF-8).
2. If it matches `^\d{6}_\d\.\d{4}\.(AR_\d+\.)?\d+(/\d+)?$`, call GetParcelById.
3. If it matches `^\d{6}\.\d{4}\..+`, the gmina-type digit is missing. Try `_1` to `_5` and `_8` (≤ 6 calls) and keep the hits.
4. If it matches `<text> <number>`, call GetParcelByIdOrNr.
   - 1 hit: done.
   - Several hits: show a list "Kobylniki 1: gm. Kruszwica (inowrocławski) / gm. Wyszogród (płocki) / …".
5. If it is a number only, show the picker **Województwo → Gmina → Obręb** (obręb list from GetRegionByNameOrId, or a static TERYT obręb list), then build `teryt_obręb.numer`. Helper text: "Wpisz pełny identyfikator (np. 040706_5.0021.44) albo wybierz gminę i obręb".
6. Always echo the resolved full id, gmina and obręb, and the map outline, so the jury can confirm it is the same parcel as their reference.
7. Also accept "kliknij na mapie" (GetParcelByXY) and pasted lon,lat.

## Test dates per parcel (3 each, same for all 12)

| Date | Why | Expected direction |
|---|---|---|
| **2026-11-22 (today)** | outside the SMSR season (21.III–30.IX) | the app must say "poza sezonem wegetacyjnym SMSR" and show the last season's status and the soil water balance trend; no "susza" flag from KBW |
| **2018-07-20** | the most widespread drought in SMSR records. IUNG SiR 71/2023 table (iung.pl/sir/zeszyt71_2.pdf, read from a search snippet): 2018 had drought in 2 287 gminy (94.0 %), 2019 in 2 233 (90.2 %) | drought expected at #1, 2, 5, 10 and 11 (cat. I–II sands and Kujawy/Wielkopolska). Likely also at 4, 7 and 9. Weakest on the cat. IV loess and Żuławy (#3, 6, 8) |
| **2024-09-20** (flood) or **2017-07-31** (wet summer) | Sept 2024 flood after the 12–16 IX rain in Opolskie and Dolny Śląsk. 2017 was a wet summer (UNVERIFIED, from memory) | no drought. #12 and #6 should show strongly positive KBW and a waterlogging or flood signal (ISOK zone for #12). 2024 had an earlier dry spell in the east, so do not claim "wet" for #3 and #4 in July 2024 |

Optional fourth date:
- 2019-06-30 (second worst year, about 90 % of gminy): drought on the sands (#5, 10).
- 2023-06-20: regional drought, partial, UNVERIFIED.

Note: SMSR gmina tables online cover only 2020–2026 (`/wykazy/` year selector). For 2018 and 2019 the archive is `geoserver.iung.pl/arch18/` (seen in search results, not opened). The jury's reference for pre-2020 dates is probably our own KBW recomputed from P − ET0, so state that in the source line.
