# Weekend execution plan: TRAKTOR

**Event (verified):** KOWR challenge "Zatrzymaj wodę, chroń plony" at HackNation 2026, Bydgoszcz, **21–22 Nov 2026**.
**Assumption:** about 48 h, as stated in the brief. **Check the official schedule.** If it is a ~24 h sprint, use the compressed column at the bottom.
**Suggested team of 4:**

- **G**: geo/data, Python pipeline
- **B**: backend and API, rules engine
- **F**: frontend and map
- **P**: product, pitch and domain (also does QA)

## Phase 0: Tonight (Fri 20 Nov) — data prep, _if the rules allow pre-event data preparation_ (check them)

No product code. Only data and decisions.

| Task                                                                                                                                 | Owner | Done when                    |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------------------------- |
| Choose the AOI gmina (kujawsko-pomorskie or Wielkopolska): high IUNG drought frequency, dense `OT_SWRM_L`, flat-but-not-dead terrain | G + P | Gmina TERYT code decided     |
| Download `OT_SWRM_L.parquet` (~159 MB) and BDOT10k roads and buildings for the powiat                                                | G     | Files on disk                |
| **Download NMT 1 m sheets for the AOI** (the WCS timed out, so this is the #1 risk)                                                  | G     | GeoTIFF/ASC covering the AOI |
| Check that ditches are visible in the DTM in 3 spots (profile plot)                                                                  | G     | Go / no-go for the AOI       |
| Record fixtures: IMGW warnings, meteo, Open-Meteo forecast/archive for the AOI                                                       | B     | JSON fixtures saved          |
| Confirm with the team: MapLibre dependency yes or no                                                                                 | All   | Decision noted               |

If the DTM does not show ditches in the chosen AOI, **switch AOI tonight**. Don't find out on Saturday.

## Phase 1: Foundation (hours 0–8)

| Task                                                                                                     | Owner | Priority | Depends on   | Deliverable                                             |
| -------------------------------------------------------------------------------------------------------- | ----- | -------- | ------------ | ------------------------------------------------------- |
| Branch `feature/traktor`, `pnpm new:feature traktor`, Zod contracts (`Site`, `Refusal`, `Conditions`, `Order`) | B     | P0       | –            | Contracts merged first, so everyone builds against them |
| Pipeline steps 1–3: clip, long profiles, resolvability check                                             | G     | P0       | Phase 0 data | `ditches.geojson` with profile + resolvable flag        |
| Map shell: basemap, ditches layer, gmina outline, side panel                                             | F     | P0       | Contracts    | `/traktor` renders real ditches                            |
| Mock `sites.geojson` (10 hand-made sites) so F can work before G finishes                                | B     | P0       | Contracts    | Mock data                                               |
| Pitch skeleton: problem slide, photos, sources                                                           | P     | P1       | –            | 6 slide titles                                          |

**Gate at h8:** the real ditches of the real gmina are on the map.

## Phase 2: Core functionality (hours 8–28)

| Task                                                                                               | Owner | Priority | Depends on      | Deliverable                                                                        |
| -------------------------------------------------------------------------------------------------- | ----- | -------- | --------------- | ---------------------------------------------------------------------------------- |
| Pipeline steps 4–7: candidates, backwater per crest, out-of-bank fill, refusals, metrics           | G     | **P0**   | Profiles        | `sites.geojson` with accepted and refused sites plus reasons, `profiles/{id}.json` |
| Order rules engine + unit tests (TRZYMAJ / OTWÓRZ / NIE RUSZAJ)                                    | B     | **P0**   | Contracts       | `rules.ts` with Vitest coverage                                                    |
| `/api/traktor/conditions` (IMGW + Open-Meteo + KBW, cache, fixture fallback)                          | B     | **P0**   | –               | Live and fixture modes                                                             |
| `/api/traktor/scenario/{drought-aug, storm-warning, spring-wet}`                                      | B     | **P0**   | Fixtures        | Scenario switcher                                                                  |
| Site panel: cross-section SVG, crest slider, metric ranges, refusal state (red), uncertainty strip | F     | **P0**   | Profiles        | Core screen                                                                        |
| Refusal counter and reason breakdown (gmina view)                                                  | F     | P0       | `sites.geojson` | Headline beat                                                                      |
| ULDK parcel lookup + "my field" zoom                                                               | B/F   | P1       | –               | Search box                                                                         |
| ISOK flood and IUNG soil layers in the pipeline                                                    | G     | P1       | –               | Extra refusal and priority inputs                                                  |
| Domain check of thresholds and legal text (art. 389/395/205)                                       | P     | P1       | –               | `config.ts` values + site-card copy                                                |

**Gate at h28:** on one real site, the slider moves, 60 cm is refused because of a neighbour's parcel, and the scenario flips TRZYMAJ to OTWÓRZ.
**If behind:** cut ULDK live lookup (use the precomputed AOI parcels) and cut ISOK (keep roads and buildings).

## Phase 3: Demo (hours 28–40)

| Task                                                                                         | Owner | Priority | Deliverable          |
| -------------------------------------------------------------------------------------------- | ----- | -------- | -------------------- |
| Site card page (print CSS → PDF), PL copy, legal route, gap list                             | F + P | P0       | Printable card       |
| Lock the three demo scenarios and their exact sites (see pitch_and_demo.md)                  | P + G | P0       | Script with site IDs |
| Visual polish: accepted/refused styling, transitions, Polish labels, mobile check            | F     | P1       |                      |
| "Dlaczego?" (Why?) drawer showing inputs, rule and thresholds                                | B/F   | P1       | Explainability       |
| Deploy to Cloudflare (`pnpm cf:build` / preview); check `/api/health` returns the commit SHA | B     | P0       | Public URL           |
| Test: `pnpm check` green, Playwright smoke test of the demo path                             | B     | P0       | Command output saved |
| **Bonus:** LLM plain-language explanation (with number-guard + template fallback)            | B     | P2       |                      |
| **Bonus:** ŁATA staff-gauge photo → level (vision)                                           | B     | P3       |                      |
| **Bonus:** Sentinel-1 wet-persistence per segment (CDSE)                                     | G     | P3       |                      |
| **Bonus:** KOWR-mode overlay (illustrative, labelled)                                        | F     | P2       |                      |

**Gate at h40:** feature freeze. After this, only bug fixes and pitch work.

## Phase 4: Presentation (hours 40–48)

| Task                                                                         | Owner | Deliverable        |
| ---------------------------------------------------------------------------- | ----- | ------------------ |
| Final slides (see pitch_and_demo.md)                                         | P     | Deck               |
| Rehearse the demo 3×, timed; record a **backup video** of the full demo      | All   | Video file offline |
| Demo laptop: fixtures mode on, browser zoom set, offline copy of the GeoJSON | F     |                    |
| Q&A drill on the jury questions                                              | All   |                    |
| Final deploy + tag                                                           | B     | Live URL and SHA   |

## Must-have vs bonus vs roadmap

| Must-have MVP                                                                                 | Impressive bonus                          | Post-hackathon roadmap                                        |
| --------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| One real gmina, real BDOT10k ditches and NMT                                                  | LLM Polish explanations                   | National precompute, per powiat, on demand                    |
| Candidates + backwater + storage per crest                                                    | ŁATA photo gauge                          | Field validation with one spółka wodna and a KOWR branch (OT) |
| Refusals with reasons (roads, buildings, out-of-bank, neighbour parcel, unresolvable channel) | Sentinel-1 wet persistence                | Calibrate order thresholds with gauges; ML channel classifier |
| TRZYMAJ / OTWÓRZ / NIE RUSZAJ with "why"                                                      | KOWR overlay                              | Integrate the Wody Polskie melioration register (on request)  |
| Scenario injection + fixtures                                                                 | SMS/email order                           | Operat-wodnoprawny assist for qualified authors               |
| Printable site card (PL)                                                                      | ISOK + IUNG layers if not done in Phase 2 | Spółka operations: gate log, multi-structure scheduling       |
| Deployed URL + backup video                                                                   |                                           | Nitrate/WFD reporting for gminas                              |

## Compressed plan (if the event is about 24 h)

- **h0–4:** contracts, map with ditches, mock sites.
- **h4–12:** pipeline backwater + refusals; rules engine; scenario fixtures.
- **h12–18:** site panel + slider + refusal + flip.
- **h18–21:** site card, deploy, backup video.
- **h21–24:** pitch.
- Cut first: ULDK live, ISOK, KOWR mode, every bonus.
