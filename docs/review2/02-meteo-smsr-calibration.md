# Review 2 · 02: Meteo and SMSR calibration (2018-07-20 shows almost no drought)

Scope: `web/src/lib/analiza/meteo.ts`, `power.ts` (ET0 and sunshine), `smsr.ts`. I also followed the window and verdict logic into `analyze.ts`, because that's where most of the bias comes from. Read-only review. The scripts are in `%TEMP%\rv02` and the data in `%TEMP%\rv02dl`.

Sources: NASA POWER daily (the engine's cells), IMGW-PIB synop daily and hourly data for 2018 (8 stations), and Doroszewski et al. 2012 (PDF read, eq. 2 checked).

Official SMSR 2018 reference values come from IUNG communiqués quoted in the press:
- report 03 (11.IV–10.VI): national mean −179 mm.
- report 04 (21.IV–20.VI): −190.5 mm.
- report 06 (11.V–10.VII): mean −178. Poznań −260…−269, Wielkopolska −240…−249, Kujawy −200…−239, south −50…−100.
- report 08 (1.VI–31.VII): mean −109. Poznań −190…−199, Garwolin plain −120…−139, east 0…−100.

Open-Meteo archive and historical-forecast both returned 429 (daily quota), so that source was NOT TESTED.

## 1. Verdict in one paragraph
The KBW arithmetic is fine. The engine reproduces its own −149/−150 mm for Kraszyce W6, and the SMSR window table, the thresholds and the crop mapping match 07-science.md exactly.

The "almost no drought on 2018-07-20" result has three causes, in this order:
- **(A) Window logic.** The verdict looks only at the last completed window, 21.V–20.VII (W6). In 2018 that window included the late-June and July rain. SMSR defines drought as KBW below the threshold in **any** six-decade window since 21.III, and the 2018 drought sat in W2–W5 (April to early July).
- **(B) Wrong ETP formula.** SMSR uses Doroszewski 2012 eq. 2, a simplified Penman with RH at 13:00 and wind. The engine uses FAO-56 PM or the Doroszewski & Górski 1995 monthly formula, and both are about 30 mm per 60 days lower than eq. 2.
- **(C) NASA POWER (MERRA-2, ~0.5°) is too wet in the dry west.** Lubuskie and Wielkopolska get 35–50 mm more P and up to 60 mm less ET0 than the stations. In Kujawy and Mazowsze the difference is negligible.

(A) flips Kościan, Sulechów and Sobolew to drought even with today's ET. (B) brings Kraszyce to the threshold (ratio 0.97–1.0). Station data puts Kraszyce clearly in drought.

## 2. Checks against 07-science.md
| Item | Code | Status |
|---|---|---|
| 14 windows: starts 21.III…1.VIII, 6 decades, ends 20.V…30.IX | `smsr.ts:57-58` | OK (= SMSR report numbers 01–14) |
| Threshold table (8 groups × 4 categories × 14) | `smsr.ts:13-30` | OK, identical to 07-science §2 |
| Crop mapping (rye→ozime, maize→ziarno, grassland none, beet cat. I "niewskazana") | `smsr.ts:33-44,69-75` | OK |
| "Current" window at D | `analyze.ts:156-162` | Last window with end ≤ dataEnd → W6 on 2018-07-20 (correct per 07-science §3) |
| Drought = any window 21.III–D | `analyze.ts:246`, `analyze.ts:201` | **MISSING.** Only `completed ?? current` is evaluated. The current season is excluded from `seasons` (lastSeason = Y−1 before 30.IX) |
| ETP used against thresholds | `meteo.ts:44-45, 83-101`; `analyze.ts:147` | **Wrong formula.** Monthly D&G 1995, not SMSR eq. 2 |
| ETP units | `power.ts:14,98` (POWER AG gives Rs in MJ m⁻² d⁻¹, Ra in MJ) | OK. Ångström sunshine 8.6 h/d vs Toruń measured 8.7 h/d |
| ET0 PM inputs (u2 = WS2M, RH2M, Tmax/Tmin, z=150) | `power.ts:32-47` | OK (FAO-56 eq. 6 checked line by line) |
| eq. 2 time step | paper p. 79 | Constants only make sense **monthly** (h = monthly sunshine sum): ~141 mm/month in July. Applied to daily or decadal sums it gives 11–100 mm/day. "Decadal" in 07-science §3 is wrong |

## 3. Numbers: KBW (mm) per window 2018, three ET methods, POWER vs IMGW synop
PM = FAO-56 ET0. IU = IUNG monthly, as in the engine. E2 = SMSR eq. 2, monthly-equivalent per decade. Station RH13 is the 12 UTC observation. For POWER, RH13 ≈ 100·ea/es(Tmax).

| Source | W2 11.IV–10.VI PM/IU/E2 | W3 21.IV–20.VI | W4 1.V–30.VI | W5 11.V–10.VII | W6 21.V–20.VII | W7 1.VI–31.VII |
|---|---|---|---|---|---|---|
| **#1 Kraszyce** POWER 52.6/18.3 | −146/−167/−187 | −164/−184/−204 | −166/−191/−203 | −186/−195/**−218** | −142/**−150**/−173 | −140/−143/−167 |
| Toruń 12250 (50 km) | −186/−186/−219 | −204/−206/−239 | −210/−222/−243 | −215/−216/−241 | −142/−144/−167 | −140/−140/−161 |
| Koło 12345 (60 km) | −160/−151/−171 | −178/−167/−191 | −173/−167/−183 | −173/−164/−179 | −116/−105/−123 | −115/−95/−121 |
| *SMSR Kujawy (official)* | | | | *−200…−239* | | |
| **#2 Kościan** POWER 52.1/16.8 | −158/−164/−189 | −176/−179/−206 | −177/−180/−206 | −197/−185/−222 | −153/−140/−177 | −153/−137/−174 |
| Poznań 12330 | −252/−216/−284 | −268/−231/−304 | −275/−240/−310 | −297/**−252**/−331 | −214/−175/−245 | −207/−175/−231 |
| *SMSR Poznań / Wlkp.* | | | | *−260…−269 / −240…−249* | | *−190…−199* |
| **#5 Sobolew** POWER 51.8/21.7 | −164/−166/−201 | −177/−175/−211 | −161/−164/−191 | −163/−156/−189 | −123/−114/−148 | −115/−104/**−137** |
| Kozienice / Siedlce | −148/−146/−182 · −169/−176/−204 | | | −144/−145/−160 · −152/−167/−173 | | −103/−99/−115 · −83/−91/−94 |
| *SMSR Garwolin plain* | | | | | | *−120…−139* |
| **#10 Sulechów** POWER 52.1/15.6 | −147/−146/−174 | −173/−171/−199 | −177/−176/−202 | −192/−182/−215 | −146/−137/−168 | −144/−138/−163 |
| Zielona Góra 12400 | −220/−200/−232 | −248/−225/−262 | −243/−225/−253 | −250/−225/−259 | −223/−201/−232 | −220/−203/−226 |
| *SMSR national mean* | *−179* | *−190.5* | | *−178* | | *−109* |

60-day P and ET compared:
- P: POWER vs stations are equal in Kujawy (W5 67 vs 58/80) and Mazowsze (97 vs 96). POWER is far wetter in the west: Sulechów 67 vs Zielona Góra 32, Kościan 69 vs Poznań 28 / Leszno 73.
- ET: POWER ET0 is 0–60 mm below the stations (Kościan 265 vs Poznań 325).
- Mean POWER W2 over the 4 parcels: PM −154, IU −161, **E2 −188**. SMSR national −179, and this belt is drier than the national mean. **E2 reproduces SMSR. PM and IU are ~25–35 mm too wet.**
- E2 on Poznań station data overshoots (−331 vs −260…−269), because Poznań city is hot and windy. Use E2 on gridded/POWER data or on interpolated stations, not on a single urban station.

Drought check with the 2019 thresholds (engine table), season-to-date = worst W0–W6 compared with the W6-only verdict:
| Parcel (cat., crop) | Engine today (W6, IU) | Any window, IU (today's ET) | Any window, E2 (POWER) | Any window, station PM/IU |
|---|---|---|---|---|
| #1 Kraszyce (III, pszenica oz.) | −150 / −239 → no (R 0.63) | W5 −195/−224 → R 0.87, no | W3 −204/−204, W5 −218/−224 → R 0.97–1.0, borderline | Toruń W4 −222/−213 → **drought** |
| #2 Kościan (II) | −140/−201 → no | W3 −179/−166, W4 −180/−175 → **drought** | **drought** (W2–W5) | **drought** |
| #5 Sobolew (I) | −114/−180 → no | W2 −166/−137 … W5 −156/−154 → **drought** | **drought** | **drought** |
| #10 Sulechów (II) | −137/−201 → no | W3 −171/−166 → **drought** | **drought** | **drought** (ZG −225/−166) |

Caveat for the jury framing: the 2018 figure of "94 % of gminy" used the **2009** thresholds (paper Fig. 3, e.g. zboża ozime III maj–cze −250, cze–lip −300). It also counts any crop, any soil category and any window. One parcel × one crop × W6 under the 2019 thresholds is not comparable, so the comparison has to be per window and season-to-date.

## 4. Root cause, ranked by effect on 2018-07-20
1. **Verdict window (~40–70 mm of "missing" deficit).** In 2018, W6 was 40–70 mm milder than W3–W5. The SMSR legal rule is any window.
2. **ETP formula (−25…−35 mm KBW per 60 d).** E2 ≈ PM × 1.12 in May–July 2018 (POWER Kraszyce W6 281 vs 249 mm). IU ≈ PM, so it doesn't add the missing ETP.
3. **POWER in western Poland (−35…−60 mm in Lubuskie/Wlkp.).** Coarse cell, smoothed convective P, and low Rs and wind compared with the stations. Kujawy and Mazowsze: ≤ ±15 mm.
4. Minor: POWER-derived RH13 (ea/es(Tmax)) is 2–7 pp drier than measured at 12 UTC, which gives E2 about +10 mm. Correct it with +5 pp.

## 5. MISSING / NOT READY
| P | file:line | Problem | Fix | Expected effect |
|---|---|---|---|---|
| **P0** | `analyze.ts:246` (`evalW = completed ?? current`), `analyze.ts:201` | Verdict uses only the last completed window. W0…W(last) of the current season are ignored. | Compute `seasonToDate = argmax_w KBW_w/thr_w` over all completed windows of year Y with a numeric threshold. `currentLevel` comes from max(R_seasonToDate, R_current). Show both: "susza w sezonie: tak (okno 11.V–10.VII, −218 vs −224)" and "aktualne okno 21.V–20.VII: −173". Add the current season to `seasons` as "w toku". | 2018-07-20: Kościan, Sulechów, Sobolew → drought; Kraszyce R 0.63→0.87 (IU) / 0.97 (E2) |
| **P0** | `meteo.ts:44-45, 83-101`; `analyze.ts:147` | Thresholds are compared against D&G-1995 monthly ETP, not SMSR eq. 2. | Add `etpSmsr(d,h,t,f,v)` = eq. 2 with monthly-equivalent inputs per decade (d = mean astronomical day length, h = mean daily sunshine × days in month, t = mean T2M, f = RH13, v = wind at 10 m = WS2M/0.748), × decade days / month days. Sum decades per window. Make it `primary`. Keep PM as the range. Need RH13 and wind in `PowerDay` (`power.ts:12,100`): f ≈ 100·ea/es(Tmax) + 5. | KBW −25…−35 mm/60 d. W2 4-parcel mean −161 → −188 (SMSR −179); Sobolew W7 −104 → −137 (SMSR −120…−139); Kraszyce W5 −195 → −218 (SMSR −200…−239) |
| **P1** | `power.ts:79`, `meteo.ts:58-61` | Single coarse POWER cell is too wet in the west. Open-Meteo archive (ERA5-Land 0.1°) is blocked by 429. | (a) Pre-warm a disk cache of Open-Meteo `era5_land` for the 13 jury cells (one-off, paid key or next day). (b) For past dates, cross-check P against IMGW synop daily (`danepubliczne.imgw.pl/.../dobowe/synop/YYYY/YYYY_SSS_s.zip`; fields s_d col 13 = P, col 20 = sunshine; s_d_t col 7 = wind, 13 = RH; hourly s_t col 37 = RH at 12 UTC). Use IDW of the 2–3 nearest stations as the source line "IMGW, stacje X, Y". | West −35…−60 mm; Kujawy ~0 |
| P1 | `analyze.ts:196,198,218`; `analyze.ts:282` | Percentile, `kbw60Mm` and `droughtPm` use `k.pm` while the verdict uses `primary`, so the UI shows two different KBW numbers. | Use one primary ETP (E2) everywhere and keep PM only as the "range". | Consistent numbers |
| P1 | fixtures | No regression test against official SMSR values. | Add `fixtures/smsr2018.json` with the table rows above: W2 national −179, W5 Kujawy [−239,−200], W7 Garwolin [−139,−120], W7 Poznań [−199,−190]. Assert E2 POWER within ±30 mm. | Guards calibration |
| P2 | `meteo.ts:186-190` | Source line says "komórka 0,1°", but POWER/MERRA-2 is ~0.5°×0.625° (~50 km). | Change the wording to "komórka ~50 km (NASA POWER)". | Honest label |
| P2 | `docs/review/07-science.md:82` | Says eq. 2 time step "looks decadal". | Change it to monthly constants, applied per decade as a monthly equivalent (§2). | Doc correctness |
| P2 | `meteo.ts:100` | `dayLength15` uses a Cooper declination; `power.ts` uses FAO. | Use one shared FAO function (difference < 0.1 h). | Cosmetic |
| P2 | jury copy | "94 % gmin w 2018" used the 2009 thresholds and counts all crops, categories and windows. | In the pitch, compare per window and season-to-date, and cite reports 03/06/08. | Avoids an unfair "engine is wrong" claim |

## 6. Verdict
**NOT READY for the 2018 jury date, but fixable in about 2–3 hours.** The data pipeline and units are correct, and the window table and thresholds are exact. With P0 #1 (season-to-date any-window) and P0 #2 (SMSR eq. 2 ETP), the engine reproduces the official 2018 KBW within the published ranges for Kujawy, Garwolin and the national mean. Three of four tested parcels show drought on 2018-07-20 and Kraszyce sits at its threshold. The remaining western wet bias (Sulechów, Kościan) needs P1 (ERA5-Land cache or the IMGW station cross-check).
