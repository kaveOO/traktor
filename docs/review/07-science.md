# 07 · Science review of the analysis engine (read-only)

Scope: `web/src/lib/analiza/crops.ts` and `types.ts` (contract), `traktor-wt2/satellite/.../satellite.ts`, and `traktor-wt2/engine/.../{util,geo}.ts` (no meteo or soil code exists yet). Checked on 2026-11-22.
Tags: **VERIFIED** means I checked it against the primary source during this review. **UNVERIFIED** means it comes from memory of the literature or is my own heuristic, so label it "do kalibracji".

## 0. Top findings (fix before demo)
1. **`iungKbw` is wrong in both shape and values.** SMSR gives a threshold per crop group, per soil category and per **six-decade window** (14 windows, 21.III–30.IX). One number per category isn't enough. Vegetables (−100…−160 vs official −184…−263) and orchards are far too lenient, so the engine would declare drought too often. Grassland has **no SMSR threshold**. Sugar beet on category I is "uprawa niewskazana", not a threshold. Section 2 has the official table. VERIFIED.
2. **Windows.** SMSR uses fixed six-decade windows, not "60 days back from the date". A decade is days 1–10, 11–20 and 21–end of month. Outside 21.III–30.IX SMSR doesn't define drought. VERIFIED.
3. **ET method mismatch.** The thresholds are calibrated on IUNG's Penman-type ETP, not FAO-56 Penman-Monteith ET0 (Open-Meteo). Compare against both and report the range (section 3).
4. **NDVI/NDMI "norm" mixes crops.** The norm comes from the same parcel in earlier years, and crop rotation means those years were probably a different crop. An anomaly of ±0.05 is inside scene-to-scene noise. Satellite data must corroborate the meteo signal, never decide on its own (Zał. 1).
5. **Root depths are shallow** compared with FAO-56 Table 22, and there are no `p` values, so the irrigation rule (RAW = p·TAW) can't be computed (section 1).
6. **Don't over-claim the effect of organic matter on water.** Per 10 g/kg of extra SOC, AWC rises only about 1–2 % vol. "4 per mille" is a carbon target, not a water figure (section 6).

## 1. crops.ts vs FAO-56 (Allen et al. 1998, Tables 12 and 22)
Sources: Table 12 https://www.fao.org/3/x0490e/x0490e0b.htm and Table 22 https://www.fao.org/3/x0490e/x0490e0e.htm. VERIFIED.

| crop (FAO row) | Kc ini/mid/end FAO | crops.ts monthly | Zr FAO (m) | Zr crops.ts | p FAO |
|---|---|---|---|---|---|
| winter wheat (frozen soils) | 0.4 / 1.15 / 0.25–0.4 | 0.4…1.15, Jul 0.6, OK | 1.5–1.8 | 1.0 | 0.55 |
| spring barley | 0.3 / 1.15 / 0.25 | OK | 1.0–1.5 | 0.8 | 0.55 |
| rye (no FAO row, use wheat) | as wheat | OK | 1.5–1.8 | 1.0 | 0.55 |
| rapeseed/canola | 0.35 / 1.0–1.15 / 0.35 | OK (autumn 0.5–0.7 plausible) | 1.0–1.5 | 1.0 | 0.60 |
| maize grain | 0.3 / 1.20 / 0.60–0.35 | May 0.5 slightly high (use 0.35–0.4) | 1.0–1.7 | 1.0 | 0.55 |
| potato | 0.5 / 1.15 / 0.75 | Jun 1.1 slightly high (canopy closes late Jun, use 0.95) | 0.4–0.6 | 0.5 | **0.35** |
| sugar beet | 0.35 / 1.20 / 0.70 | OK | 0.7–1.2 | 1.0 | 0.55 |
| pasture, rotated grazing | 0.40 / 0.85–1.05 / 0.85 | OK | 0.5–1.5 | 0.4 | 0.60 |
| vegetables (cabbage/carrot) | ~0.7 / 1.05 / 0.95 | OK | 0.5–1.0 | 0.4 | 0.35–0.45 (use 0.40) |
| apple, active ground cover, frost | 0.50 / 1.20 / 0.95 | mid 1.05 (between bare-strip 0.95 and grass-alley 1.20), OK | 1.0–2.0 | 1.2 | 0.50 |

Changes:
- Add `p` (above) and a `smsrGroup`. Change `rootDepthM` to: wheat and rye 1.2, barley 1.0, grassland 0.5. These sit at the low end of the FAO range, because Polish profiles often have compact or sandy subsoil.
- Interpolate Kc daily between mid-month values rather than using a step function.
- Adjust p per FAO-56: `p = clamp(p_tab + 0.04·(5 − ETc_day), 0.1, 0.8)` (Table 22 footnote). VERIFIED.
- Kc in Aug–Sep after a cereal harvest describes bare soil or stubble, not the crop. Say so in the UI.
- Mid-season Kc should be climate-adjusted with FAO-56 eq. 62: `Kc_mid + [0.04(u2−2) − 0.004(RHmin−45)](h/3)^0.3`. In Polish summers (u2≈2–3 m/s, RHmin≈45–55 %) the correction is ±0.03, so skipping it is acceptable.

## 2. SMSR KBW drought thresholds (official): replace `iungKbw`
Source: https://susza.iung.pulawy.pl/progi/, thresholds under the MRiRW regulation of 11.04.2019. VERIFIED (fetched today). Values in mm.
- The thresholds are the same for every voivodeship.
- "x" = no yield loss from drought in that window, so drought is impossible there. It does not mean missing data.
- SMSR defines a threshold as the KBW that gives about a 20 % yield drop compared with the long-term mean (https://susza.iung.pulawy.pl/system/). VERIFIED.
- The example on /system/ ("−140 mm for 1.IV–31.V, zboża, kat. I") is stale pre-2019 text. Use the table.

Windows `W[0..13]` start on 21.III, 1.IV, 11.IV, 21.IV, 1.V, 11.V, 21.V, 1.VI, 11.VI, 21.VI, 1.VII, 11.VII, 21.VII, 1.VIII. Each lasts 6 decades and ends the day before its start date two months later (21.III→20.V, 1.VIII→30.IX).
```ts
const _ = null; // x = drought not defined in this window
export const SMSR: Record<string, [I: (number|null)[] | "niewskazana", II: (number|null)[], III: (number|null)[], IV: (number|null)[]]> = {
  zboza_ozime: [[-129,-132,-137,-145,-154,-165,-180,-199,-220,_,_,_,_,_],[-150,-153,-158,-166,-175,-186,-201,-220,-241,_,_,_,_,_],
                [-188,-191,-196,-204,-213,-224,-239,-258,-279,_,_,_,_,_],[-215,-218,-223,-231,-240,-251,-266,-285,-306,_,_,_,_,_]],
  zboza_jare:  [[-125,-127,-130,-135,-142,-153,-169,-186,-207,_,_,_,_,_],[-144,-146,-149,-154,-161,-172,-188,-205,-226,_,_,_,_,_],
                [-174,-176,-179,-184,-191,-202,-218,-235,-256,_,_,_,_,_],[-194,-196,-199,-204,-211,-222,-238,-255,-276,_,_,_,_,_]],
  kukurydza_ziarno: [[_,_,_,-168,-161,-156,-153,-152,-153,-154,-156,-158,-161,-164],[_,_,_,-200,-193,-188,-185,-184,-185,-186,-188,-190,-193,-196],
                [_,_,_,-236,-229,-224,-221,-220,-221,-222,-224,-226,-229,-232],[_,_,_,-271,-264,-259,-256,-255,-256,-257,-259,-261,-264,-267]],
  rzepak:      [[-207,-187,-170,-155,-142,-132,_,_,_,_,_,_,-138,-138],[-232,-211,-193,-177,-165,-155,_,_,_,_,_,_,-158,-158],
                [-275,-254,-236,-220,-208,-198,_,_,_,_,_,_,-205,-205],[-297,-276,-258,-242,-230,-220,_,_,_,_,_,_,-230,-230]],
  ziemniak:    [[_,_,-238,-232,-226,-219,-210,-200,-189,-178,-168,-157,-147,_],[_,_,-257,-251,-245,-238,-229,-219,-208,-197,-187,-176,-166,_],
                [_,_,-286,-280,-274,-267,-258,-248,-237,-226,-216,-205,-195,_],[_,_,-306,-300,-294,-287,-278,-268,-257,-246,-236,-225,-215,_]],
  burak:       ["niewskazana",[-250,-248,-245,-241,-237,-232,-226,-220,-212,-202,-192,-182,-169,-155],
                [-277,-275,-272,-268,-264,-259,-253,-247,-239,-229,-219,-209,-196,-182],[-296,-294,-291,-287,-283,-278,-272,-266,-258,-248,-238,-228,-215,-201]],
  warzywa:     [[_,_,_,-189,-187,-185,-184,-184,-184,-185,-187,-188,_,_],[_,_,_,-207,-205,-203,-202,-202,-202,-203,-205,-206,_,_],
                [_,_,_,-243,-241,-239,-238,-238,-238,-239,-241,-242,_,_],[_,_,_,-263,-261,-259,-258,-258,-258,-259,-261,-262,_,_]],
  drzewa_owocowe: [[-168,-171,-175,-180,-187,-193,-199,-205,-210,-215,-220,-223,_,_],[-190,-193,-197,-202,-209,-215,-221,-227,-232,-237,-242,-245,_,_],
                [-229,-232,-236,-241,-248,-254,-260,-266,-271,-276,-281,-284,_,_],[-249,-252,-256,-261,-268,-274,-280,-286,-291,-296,-301,-304,_,_]],
};
// mapping: pszenica_ozima, zyto -> zboza_ozime; jeczmien_jary -> zboza_jare; kukurydza -> kukurydza_ziarno
// (silage row differs by <=4 mm); rzepak_ozimy -> rzepak; sad -> drzewa_owocowe; uzytki_zielone -> NONE (percentile only, say so)
```
Soil categories (https://susza.iung.pulawy.pl/kategorie/, VERIFIED): WOD (FC−PWP in the root zone, Ślusarczyk 1979; texture to 1.5 m)
- I < 127.5 mm: pl, plp, ps, psp (bardzo podatna)
- II 127.5–169.9 mm: pgl, pgm and the pylaste variants
- III 170–202.5 mm: gl, glp, płg, płz, płp
- IV > 202.5 mm: gs, gc, płi, i and the pylaste variants (mało podatna)

Categories cover mineral arable soils only. Organic soils (torf/mursz) get "brak kategorii".

Fallback when the IUNG WCS fails and SoilGrids is used (USDA classes, rough match, UNVERIFIED): sand and loamy sand → I; sandy loam with clay < 10 % → II; loam, silt loam, silt, or sandy loam with clay ≥ 10 % → III; clay loam, silty clay loam, clay → IV. Alternatively, compute WOD with Saxton-Rawls (section 5) and apply the WOD cut-offs above.

## 3. KBW computation (SMSR-consistent)
- SMSR definition: `KBW = P − ETP` summed over a six-decade window. Drought means KBW < threshold in any window between 21.III and 30.IX (https://susza.iung.pulawy.pl/system/). VERIFIED.
- SMSR's ETP is a simplified Penman formula (Doroszewski et al. 2012, eq. 2, https://bibliotekanauki.pl/articles/338234.pdf). VERIFIED. Inputs are d = day length (h), h = sunshine (h), t = mean temperature (°C), f = RH at 13:00 (%) and v = wind (m/s):
  `ETP = 161 + 19.57·d − 152.7·ln d + 0.0004034·h² + 0.00186·(t+5)³ + 0.004192·(100−f)² + 0.0003681·v·(100−f)^2.5`
  The time step looks decadal, but I couldn't confirm it from the excerpt. UNVERIFIED.
- Simpler monthly IUNG formula (Doroszewski & Górski 1995, quoted in IUNG SiR 71/2023, https://www.iung.pl/sir/zeszyt71_3.pdf). VERIFIED:
  `ETP_month = −89.6 + 0.0621·t² + 0.00448·h^1.66 + 9.1·f`, with t = monthly mean temperature, h = monthly sunshine hours, f = day length on the 15th (h).
- **Engine rule:**
  - Compute `KBW_PM = ΣP − ΣET0_FAO` from Open-Meteo `et0_fao_evapotranspiration`.
  - Also compute `KBW_IUNG` with the monthly formula, pro-rated by days. Open-Meteo provides daily `sunshine_duration` in seconds and `temperature_2m_mean`; day length comes from the astronomical formula.
  - Compare the threshold against `KBW_IUNG`, and show `[min,max]` of the two as the range.
  - If ET0_FAO and the IUNG ETP differ systematically by more than 15 %, say so in uncertainty. I haven't measured their bias. UNVERIFIED.
- **Window used at date D:** the last *completed* window ending on or before D (`status: "zakończone"`). Also show the window containing D (`"w toku"`, partial sum and days remaining). Before 21.III or after 30.IX, set `currentLevel` from the percentile only and write "poza okresem monitoringu SMSR (21.III–30.IX)".
- **Reference check for the jury:** SMSR publishes municipality tables (https://susza.iung.pulawy.pl/wykazy/). Showing "SMSR dla gminy X: susza tak/nie" next to our value would be the strongest validation. Check whether the tables can be scraped per season. UNVERIFIED.
- **Fix the label `dryDaysMax`.** ERA5 has a known drizzle bias: too many wet days of 0.1–1 mm. Keep the 1 mm cut-off (stricter than 0.1) and call it "przybliżenie z reanalizy".

## 4. Current vs historical level, uncertainty (proposed, UNVERIFIED, label "do kalibracji")
Let thr be the SMSR threshold for (crop group, category, window); thresholds are negative. Let `R = KBW_window / thr`.
- `currentLevel`:
  - R ≥ 1 → **bardzo_wysokie** (SMSR drought condition met)
  - 0.75 ≤ R < 1 → wysokie
  - 0.5 ≤ R < 0.75 → umiarkowane
  - otherwise → niskie
- Raise one level if the in-progress window already projects past thr, i.e. `partial + remaining_days·mean(P−ET0)` from the 7-day forecast is below thr.
- Satellite may raise the level only if R ≥ 0.5 **and** both NDMI and NDVI anomalies are ≤ −0.10. It may never lower a level set by meteo.
- Percentile: empirical, `pct = 100·(rank − 0.5)/n` against the same window in earlier years. Ten years gives only 10 % resolution, so use ERA5 1991–2020 plus recent years for percentiles (one Open-Meteo request covers the range). Keep 10 years for `droughtYears`, which the brief asks for.
- `historicalLevel` (long-term susceptibility):
  - k = number of the last 10 seasons with KBW < thr in ≥ 1 window of the crop's season, using the parcel's soil category
  - k = 0 → niskie, 1–2 → umiarkowane, 3–4 → wysokie, ≥ 5 → bardzo_wysokie
  - Raise one level if slope > 5 % or soil category I (runoff or low storage), and say why in `causes`
- Uncertainty score: start at 0 and add 1 for each of these:
  - |KBW − thr| < max(25 mm, 0.15·|thr|) (close to the threshold)
  - KBW_PM and KBW_IUNG fall on opposite sides of thr
  - soil from the SoilGrids fallback instead of the IUNG category
  - satellite missing, or contradicting meteo
  - window contains forecast or the archive lag (last 5 days)
  - grassland (no SMSR threshold)
  
  Always add a reason line: "meteo z reanalizy ERA5 dla rejonu ~10–30 km, nie pomiar na polu". Score 0 → niska, 1–2 → średnia, ≥ 3 → wysoka.

## 5. Soil water: Saxton & Rawls 2006 (SSSAJ 70:1569, doi:10.2136/sssaj2005.0117)
Inputs: S and C as fractions (0–1) and OM in % by weight. SoilGrids `soc` is in dg/kg, so `OM% = soc/10 · 1.724 / 10`. Coefficients come from memory of the paper; check them before use. UNVERIFIED.
```
θ1500t = −0.024S + 0.487C + 0.006OM + 0.005S·OM − 0.013C·OM + 0.068S·C + 0.031 ;  θ1500 = θ1500t + (0.14θ1500t − 0.02)
θ33t   = −0.251S + 0.195C + 0.011OM + 0.006S·OM − 0.027C·OM + 0.452S·C + 0.299 ;  θ33 = θ33t + (1.283θ33t² − 0.374θ33t − 0.015)
TAW_mm = Σ_layers 1000·(θ33 − θ1500)·Δz·(1 − cfvo/1000)   over 0–Zr (SoilGrids layers 0–5,5–15,15–30,30–60,60–100,100–200 cm)
```
- Valid for OM ≤ 8 % and clay ≤ 60 %.
- Polish WOD uses FC at about pF 2.0, while Saxton uses −33 kPa (pF 2.5). Saxton therefore **underestimates** AWC on sands. Use the IUNG category first.
- SoilGrids is 250 m modelled data. Call it "szacunek", not "pomiar".

## 6. Retention and soil-retention claims (wording)
- **Organic matter.** Minasny & McBratney 2018, EJSS 69:39 (doi:10.1111/ejss.12475), found +10 g/kg SOC raises AWC by only about +1.2 % vol. (from memory, UNVERIFIED). Minasny et al. 2017 (Geoderma 292:59, 4 per mille) is about C sequestration. Wording: "materia organiczna poprawia strukturę i infiltrację; wpływ na pojemność wodną jest umiarkowany". Don't give an mm gain.
- **NWRM.** Use the EU NWRM catalogue (http://nwrm.eu) for measures: N-measures for ponds/wetlands, A-measures for buffer strips, cover crops, reduced tillage and mulch. Effects stay qualitative and depend on the site.
- **Order follows Zał. 1.** Retention gets recommended where data support it:
  - slope > 2–5 % plus lowPoint → buffer strip or small pond
  - ditch nearby → damming or sluice on the ditch
  - soil category I–II → cover crops and mulch
  
  Irrigation comes last. Ponds and ditch damming need water-law clarification (`legalPl`, "wymaga uzgodnienia z Wodami Polskimi").
- **Slope.** Fit a plane to ≥ 9 NMT points rather than using (max−min)/diagonal. Classes, from common erosion practice (UNVERIFIED): < 2 % flat, 2–5 % moderate, 5–10 % high, > 10 % very high runoff.
- **Żyłowska & Kozyra 2025.** I couldn't locate or verify the paper. Cite it only after reading it. UNVERIFIED.

## 7. NDVI/NDMI (satellite.ts)
- **NDMI bands.** NDMI is defined as `(B8A − B11)/(B8A + B11)` (Gao 1996, RSE 58:257; Sentinel Hub NDMI script: https://custom-scripts.sentinel-hub.com/sentinel-2/ndmi/). The code uses `nir` (B08, 10 m) with `swir16` (B11, 20 m). Switch to Earth Search asset `nir08` (B8A) for NDMI and keep B08 for NDVI.
- **SCL mask.** `OK_SCL = {4,5,6,7}` includes 6 = water and 7 = unclassified. Use `{4,5}`, and optionally keep 7 if fewer than 60 % of pixels are valid.
- **Crop rotation.** Previous years on the same parcel probably grew different crops. Label the norm "ta sama działka, poprzednie lata (uprawy mogły być inne)", and drop the anomaly text when the history spread (max−min NDVI) is > 0.3.
- **Single-scene noise.** Matching ±15 days gives phenology shifts of ±2 weeks; atmosphere and BRDF add roughly 0.02–0.05. Raise the anomaly thresholds to ±0.10 (NDVI) and ±0.08 (NDMI), or use z-scores when n ≥ 4. UNVERIFIED (heuristic).
- **Phenology (Polish calendar).** Cereals and rapeseed senesce from late June or July, so falling NDVI is normal ripening. Treat June–July with Kc falling (month Kc < previous month Kc) as "dojrzewanie". NDVI saturates at LAI > 3 or NDVI > 0.8, so stress at full canopy shows earlier in NDMI.
- **NDMI < 0.** "NDMI < 0 at NDVI ≥ 0.3 = stress" is a plausible flag but not an established threshold. Keep "do kalibracji". Over full canopy, healthy NDMI is typically 0.2–0.4 (UNVERIFIED).
- **`stres_roslin` cause.** Emit it only together with a meteo cause (R ≥ 0.5) or a soil cause (category I–II). Satellite data alone isn't enough (Zał. 1).

## 8. ERA5 at field scale
- **Resolution.** ERA5 is 0.25° (about 28 km × 17 km at 52°N). ERA5-Land is 0.1° (~9 km). Request `models=era5_seamless` (ERA5-Land plus ERA5) from Open-Meteo: https://open-meteo.com/en/docs/historical-weather-api. VERIFIED that the option exists.
- **Scale.** Values describe the region, not the field. Convective summer rain can differ by 20–50 mm in a window between neighbouring villages, which is UNVERIFIED but typical. Always say "warunki rejonu".
- **Bias vs SMSR.** SMSR interpolates IMGW stations. ERA5 precipitation is smoother and drier in its peaks. If the nearest IMGW station within ~25 km has data (danepubliczne.imgw.pl), show its P for the window as a cross-check.
- **Archive lag.** It's about 5 days. Fill with forecast `past_days` and flag it in uncertainty.

## 9. Irrigation: FAO-56 daily root-zone balance (ch. 8, eq. 85–86; https://www.fao.org/3/x0490e/x0490e0e.htm)
```
TAW = 1000·(θFC − θWP)·Zr        RAW = p·TAW                       (eq. 82–83, VERIFIED)
Dr_i = clamp(Dr_{i-1} − Pe_i − I_i + ETc_adj_i, 0, TAW)             (eq. 85, RO/CR/DP folded into clamp+Pe)
Pe_i = P_i < 0.2·ET0_i ? 0 : P_i                                     (FAO-56: rain < ~0.2·ET0 evaporates)
Ks   = Dr ≤ RAW ? 1 : (TAW − Dr)/((1 − p)·TAW) ;  ETc_adj = Ks·Kc·ET0 (eq. 84)
```
- **Start.** Set Dr = 0 at the start of the season (1.III for winter crops, the sowing month for spring crops), assuming the profile is at FC after winter. After a dry winter that's wrong, so state the assumption.
- **TAW source.** Use the IUNG WOD mid-class value scaled to Zr, or Saxton-Rawls.
- **Decision rule:**
  - **tak**: Dr ≥ RAW and the 7-day forecast gives Σ(Pe − ETc) < 0
  - **rozważ**: Dr ≥ 0.7·RAW, or Dr ≥ RAW but rain ≥ (Dr − 0.5·RAW) is forecast
  - **nie_teraz**: otherwise, or outside the crop season
- **Dose.** Net dose = Dr (refill to FC), capped at RAW. Gross dose = net / efficiency (sprinkler ~0.75, drip ~0.90; UNVERIFIED typical values).
- **`deficitMm` (contract).** Its definition is ambiguous. Use `Dr` (depletion today, mm) and put the 7-day projection in `timingPl`.
- **Scope.** For cereals and grassland, state that irrigation is uncommon and that retention measures come first. Make no cost or yield claims.
- **Law.** Abstraction for irrigation generally needs a water-law permit (Prawo wodne). Point to Wody Polskie rather than quoting limits (UNVERIFIED specifics).

## 10. References
- Allen R.G. et al. 1998, FAO-56 Crop evapotranspiration: https://www.fao.org/3/x0490e/x0490e00.htm (Tables 12 and 22, eq. 82–86 VERIFIED)
- SMSR IUNG-PIB: thresholds https://susza.iung.pulawy.pl/progi/, categories https://susza.iung.pulawy.pl/kategorie/, definition https://susza.iung.pulawy.pl/system/ (VERIFIED)
- Doroszewski A. et al. 2012, Podstawy systemu monitoringu suszy rolniczej, WŚOW 12(2):77–91: https://bibliotekanauki.pl/articles/338234.pdf (VERIFIED, ETP eq.)
- Doroszewski & Górski 1995 monthly ETP, as quoted in IUNG SiR 71(25) 2023: https://www.iung.pl/sir/zeszyt71_3.pdf (VERIFIED formula)
- Saxton & Rawls 2006, SSSAJ 70:1569 (coefficients UNVERIFIED in-session). Gao 1996, RSE 58:257 (NDWI/NDMI)
- Minasny et al. 2017, Geoderma 292:59. Minasny & McBratney 2018, EJSS 69:39 (UNVERIFIED numbers)
- EU NWRM 2014/2015 catalogue: http://nwrm.eu. Żyłowska & Kozyra 2025 (not found, UNVERIFIED)
