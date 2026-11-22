# Review 3/10: soil, terrain, water, geo, ULDK parsing

Scope: `web/src/lib/analiza/soil.ts`, `terrain.ts` (NMT and Overpass), `geo.ts`, `uldk.ts`. Read-only review on 2026-11-22.

Live checks used throwaway node and jiti scripts in `%TEMP%\rev3`. They import the real modules. Parcels tested: #1 Kraszyce, #3 Brodzica (AR_ id), #8 Lichnowy (Żuławy), #12 Lewin Brzeski. #3, #8 and #12 were run twice.

## Live results

| Parcel | ULDK | IUNG (expected) | SoilGrids | NMT run 1 / run 2 | Overpass |
|---|---|---|---|---|---|
| 040706_5.0021.44 | 10.06 ha | III, 98 % agri (III) ✅ | 72/9 %, glina piaszczysta, AWC 112 mm, 1.4 s | 90.7–93.0 m, 0.8 % / same, 62/62 | missing (4.8 s) |
| 060404_2.0142.AR_2.182 | 1.83 ha, AR_ ok | III, 77 % of agri pixels (IV at the test point) ✅* | 20/28 %, glina ilasta, 2.7 s | 206.9–216.4 m, 4.5 % / same | missing |
| 220903_2.0006.97/60 | 34.84 ha | IV, 88 % agri ✅ | 16/41 %, ił pylasty, **6.2 s** | 1.4–3.8 m, 0.3 % / same | missing |
| 160104_5.0124.2/1 | 106.74 ha | IV ✅ | 47/17 %, glina, 2.2 s | **35/65 pts, 0.9 %** / 65/65, 1.0 %, max 161.5 → 162.7 | missing |

\* Brodzica: WMS GetFeatureInfo at the parcel centroid returns GRAY_INDEX 3. A 120 × 200 m WCS tile holds 800 px of cat. III and 160 px of cat. IV. So III is correct for the parcel; the IV in the jury table was read at a different point. Update `docs/review/10` so the jury key says "III (mixed with IV)".

## What works (verified)

- **IUNG axis order is fixed.** `soil.ts:36` sends `subset=x(N…)&subset=y(E…)`.
  - Brodzica (east of E 775 030) now returns 200, not 404.
  - The returned GeoTIFF is 24 px wide (E) × 40 px high (N) with bbox `[minE, minN, maxE, maxN]`. The pixel→EPSG:2180 mapping at `soil.ts:53` is therefore right; there is no transposition.
  - nodata is 0 and is skipped (`:51`).
- **Majority pixel inside the polygon** (`soil.ts:46-68`):
  - holes are respected (`inPolys`);
  - it falls back to the whole bbox when fewer than 3 pixels fall inside;
  - organic (5) and the ≥ 11 codes are mapped to a land-use kind;
  - `analyze.ts:94` stops the analysis for anything except `rolna` or `organiczna`;
  - the category share is reported in the source line. Good.
- **SoilGrids units are correct.**
  - sand and clay come in g/kg with d_factor 10, giving %;
  - SOC comes in dg/kg with d_factor 10, giving g/kg;
  - OM % = SOC g/kg ÷ 10 × 1.724 (`:156`);
  - depth weights 5/10/15 give a true 0–30 cm mean (`:134`).
- **Saxton–Rawls 2006 coefficients match the paper (Table 1, eq. 1–2):**
  - θ1500t: −0.024, 0.487, 0.006, 0.005, −0.013, 0.068, 0.031, then +(0.14θ − 0.02);
  - θ33t: −0.251, 0.195, 0.011, 0.006, −0.027, 0.452, 0.299, then +(1.283θ² − 0.374θ − 0.015);
  - OM is capped at 8 %, which is the paper's validity range.
- **The USDA texture triangle** (`soil.ts:81-95`) matches the USDA class boundaries, and the Polish names follow PTG.
- **geo.ts projection is exact for our purposes.** Compared with ULDK `srid=2180` on 3 parcels (E 225 km to 842 km, i.e. the far west and far east), the error is ≤ 1 mm both ways (to2180 and from2180).
  - Constants are right: GRS80, λ0 = 19°, k0 = 0.9993, FE 500 000, FN −5 300 000.
  - Area is corrected by k² (`geo.ts:91-107`).
- **NMT order:**
  - the request is built northing first (`terrain.ts:9`);
  - the response echo key round-trips;
  - with every batch present, repeated runs gave identical slope (Kraszyce, Brodzica, Żuławy).
- **WKT parsing:**
  - `SRID=` prefix, polygon with a hole, and multipolygon with a hole in the 2nd part all parse correctly (synthetic tests);
  - ULDK 4326 returns lon lat, which matches `parseWkt`;
  - AR_ ids pass `FULL_ID` and `normalizeParcelId` (`ar_` → `AR_`, `156-4` → `156/4`, `040706-5.` → `040706_5.`).

## MISSING / NOT READY

### P0
1. **Overpass never answered.** All 4 parcels came back `missing` after 4.8 s.
   - Direct test: `overpass-api.de` fails with UND_ERR_CONNECT_TIMEOUT (DNS resolves, so this looks like a TCP block or outage from this network). `overpass.kumi.systems`, `overpass.private.coffee` and `maps.mail.ru` all hit a 20 s timeout.
   - Result: every jury analysis shows "Brak danych o ciekach". The ditch and retention measures that rely on `ditchDistM` lose their evidence.
   - Fix:
     - pre-fetch the waterways for the 12 jury parcels plus the demo parcel into `fixtures/` (an OSM or BDOT10k extract; a GeoJSON per parcel bbox is enough) and read the cache first in `terrain.ts:90`;
     - re-test from the venue network;
     - keep the honest "usługa niedostępna" line when there is a cache miss.

### P1
2. **Below-sea-level heights are dropped.** `terrain.ts:19` keeps only `h > 0`. NMT returns 0.0 for no data (sea), but genuine negatives on Żuławy: −0.4, −1.1, −1.2 and −0.9 m measured at 19.36/54.16, 19.30/54.13, 19.10/54.25 and 19.45/54.10.
   - Polder parcels (the jury's Żuławy theme) would come out `missing` or `partial`, and the **low point**, the most important pixel for retention, would be thrown away.
   - Jury parcel #8 is at +1.4 m, so it passes by luck.
   - Fix: `Number.isFinite(h) && h !== 0 && h > -20`.
3. **Slope instability (the 2.3 % vs 1.3 % reports).** The cause is partial NMT batches, not randomness.
   - Batches of 30 points run in parallel (`terrain.ts:33-34`). When one batch fails, a third of the grid is silently missing (`35/65`). That changes the neighbour pairs, the median and elevMax (161.5 vs 162.7).
   - The median of the forward-difference magnitude (`:45-53`) is also biased upward on flat fields: 1 m DEM noise of about ±0.15 m over 12–40 m spacing adds roughly 0.5–1 %.
   - This matters because `analyze.ts:347` flags runoff at slope ≥ 2 and `:397` uses ≥ 1.
   - Fix:
     - run batches sequentially or with concurrency 2, with `retries: 2`;
     - use the least-squares plane (already written, `:55-66`) as the reported "średni spadek" and keep the local median as "lokalnie do X %";
     - if coverage is below 90 %, set status `partial` and do not fire the slope-based measures.
4. **Centroid breaks on multipolygons with mixed ring orientation** (`geo.ts:113-131`). It sums the signed shoelace terms across parts.
   - Synthetic test: one CCW part plus one CW part gives centroid `[-3e17, -4e18]`.
   - The centroid drives SoilGrids, Overpass, meteo and the IUNG clamp window, so every point query would fail.
   - Fix: compute each part's area and centroid with its own sign normalised (`Math.abs`), then weight by |a|. Also subtract holes.
5. **SoilGrids has no retry, and Żuławy took 6.2 s** against an 8 s timeout and a 9 s module cap (`soil.ts:132`, `analyze.ts:108`). ISRIC regularly answers 502/503.
   - Fix: `retries: 1` on 5xx within the budget, plus cached SoilGrids JSON for the jury parcels.
6. **Source id `BDOT10k` labels OSM data** (`terrain.ts:128,136`). If the UI or report lists sources by id, it claims BDOT10k for OSM data, which breaks the honest-labels rule.
   - Fix: add an `OSM` id in `types.ts` (main branch) or make the label explicit everywhere the id is rendered.

### P2
7. **AWC uses 0–30 cm texture × root depth** (`soil.ts:163`). Sandy subsoils, and clay over sand, are mis-estimated.
   - SoilGrids also serves 30–60 and 60–100 cm. Query them and integrate per layer up to `rootDepthM`.
   - Impact is low: `analyze.ts:523` prefers the IUNG TAW.
8. **Texture fallback maps silt loam / silt to III** (`soil.ts:102`), but IUNG puts loess (Hrubieszów, Głubczyce) in IV.
   - SoilGrids also overstates clay in loess: Brodzica came out 20/28, "glina ilasta".
   - The fallback is used only when WCS fails. Label it "przybliżenie", which is already UNVERIFIED in the code.
9. **Organic-only parcels** (`soil.ts:64`) return `data: null`. `analyze.ts:140` then derives a texture category from SoilGrids for a peat soil. Skip the fallback when `landUse.kind === "organiczna"`.
10. **Parcels larger than about 1 km are clipped to ±500 m around the centroid** (`soil.ts:30-33`). Lewin, 106 ha: 29 971 px ≈ 75 ha. The source text still says "na działce". Add "(fragment ±500 m)" when clipped.
11. **Mixed land use below 50 % agricultural** (`soil.ts:63`) is labelled `inne` when the majority pixel is a category. The message then says "teren nierolniczy". Use the largest non-agricultural class instead.
12. **`distLineToPolys` does not test segment crossings** (`geo.ts:192-203`). A long straight ditch crossing a large parcel, with vertices outside on both sides, gets a distance > 0. Add a segment-intersection check, which returns 0.
13. **`normalizeParcelId` collapses `. ` everywhere** (`uldk.ts:18`), so "Brzezie k. Sulechowa 65/3" becomes "Brzezie k.Sulechowa", and ULDK may not match the obręb name. Apply the dot rule only between digits.
14. **The NMT low point is a single grid sample** (spacing up to 129 m on big parcels). Label it "najniższy z N punktów co ~X m", or densify around the minimum.
15. **Overpass query is centred on the centroid within 1 km.** Waterways along the far edge of parcels longer than 2 km are missed. Use `around` on the bbox, or add the parcel half-diagonal to the radius.

## Verdict

**Soil: ready.**
- The IUNG axis bug is fixed and verified against WMS GetFeatureInfo.
- SoilGrids units and the Saxton–Rawls coefficients are correct.

**Geo and ULDK: ready.** The projection error is at the mm level, and AR_ ids work. One latent multipolygon centroid bug remains (P1-4).

**Terrain: not ready for Żuławy, and the slope is fragile.** Fix P1-2 (negative heights) and P1-3 (batch retries and the plane slope) before the jury.

**Water: not ready.** Overpass returned nothing in 4 of 4 runs from this network. Ship cached waterway fixtures for the jury parcels (P0-1).
