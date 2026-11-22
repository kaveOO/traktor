# HACKATHON MASTER REPORT: KOWR "Zatrzymaj wodę, chroń plony" / STOP WATER, PROTECT CROP

**Event:** HackNation 2026, Bydgoszcz, 21–22 Nov 2026 (verified).
**Prepared:** 2026-11-20.
**Project name:** TRAKTOR (working name, renamed from PRÓG on 2026-11-22). Build plan: [`TRAKTOR_BUILD_PLAN.html`](TRAKTOR_BUILD_PLAN.html).

## 1. The answer in one paragraph

**Build TRAKTOR, a tool that turns Poland's existing drainage ditches into reversible water storage.**
TRAKTOR reads every melioration ditch in a gmina from national data (BDOT10k) together with the 1 m LiDAR terrain. It computes where a simple board (weir) would hold water and how much, at each crest height. It **refuses** sites where the backwater would reach a road, a building, a flood zone or a neighbour's parcel, or where the channel isn't visible in the terrain data. Each day it issues one order per site: **TRZYMAJ** (hold, in drought) or **OTWÓRZ** (open, before a forecast storm). It ends with a printable site card that states the honest legal route.
It answers both halves of the campaign with **one physical object on infrastructure that already exists on about 6.4 mln ha**. It runs on free, verified public data. Its natural first customer is **KOWR as a landowner of 1.324 mln ha**.

## 2. How we got here

| Stage                  | What happened                                                                                                                                                                                                                                                                             | Output                                                                                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Model discovery        | 88 model IDs listed by the CLI. **72 attempted, 40 executed successfully.** 22 failed on no OpenCode pay-as-you-go balance, 6 were blocked by account privacy settings, 3 were deprecated, and 1 was blocked by the Go weekly quota. 1 failed on the network and was aborted by the user. | [`research/model_inventory.md`](research/model_inventory.md)                                                                                                                                                                         |
| Independent brainstorm | 40 models, identical prompt, isolated sessions, no cross-visibility. About 200 ideas + about 100 unconventional ones.                                                                                                                                                                     | [`research/independent_ideas.md`](research/independent_ideas.md); raw model responses are archived outside the repo                                                                                                                  |
| Cross-model debate     | **15 panelists** from 7 model families critiqued all ideas. 4 more panelists failed on the Go weekly quota. Two panelists produced near-duplicate scores; they are flagged, and the rank order is unchanged without them.                                                                 | [`research/cross_model_debate.md`](research/cross_model_debate.md)                                                                                                                                                                   |
| Research & validation  | Two web-verification passes. Endpoints were fetched live where possible, and every claim is tagged VERIFIED / PARTIAL / UNVERIFIED.                                                                                                                                                       | [`research/data_sources.md`](research/data_sources.md)                                                                                                                                                                               |
| Scoring                | Panel mean + jury rescoring with the weighted rubric                                                                                                                                                                                                                                      | [`research/idea_scoring.md`](research/idea_scoring.md)                                                                                                                                                                               |
| Selection              | Winner + best alternative + most ambitious alternative                                                                                                                                                                                                                                    | [`research/final_recommendation.md`](research/final_recommendation.md)                                                                                                                                                               |
| Design & plan          | Blueprint, architecture, 48 h plan, pitch                                                                                                                                                                                                                                                 | [`product_blueprint`](research/product_blueprint.md), [`technical_architecture`](research/technical_architecture.md), [`weekend_execution_plan`](research/weekend_execution_plan.md), [`pitch_and_demo`](research/pitch_and_demo.md) |

## 3. What the models said

**Convergence:**

- 29 of 40 models independently recommended either **farm retention siting** (16) or **ditch-weir / controlled drainage** (13).
- 8 models used the same product name, "Zastawka".

**We treated the convergence as a hypothesis, not proof.** The panel itself called the pond-siting cluster herd behaviour.

**Debate ranking** (15 panelists, mean weighted score out of 10):

1. Ditch-weir siting: **7.76**
2. Forecast-driven drainage operation: **7.41**
3. Farm pond siting: **7.05**
4. SAR flood evidence: 6.50
5. Catchment coordination: 6.46
6. Drought-claim evidence: 6.33
7. Ditch audit: 6.27
8. Water ledger: 6.06
9. Retention credits: 5.97
10. Trafficability: 5.47

**Votes:** 14 of 15 picked the ditch-weir family as the most likely winner, and 13 of 15 proposed combining siting with operation.

**Sharpest critiques** (they shaped the design):

- A 1 m DTM may not resolve a ditch channel.
- Buried tile drains can be back-flooded.
- A weir needs a _pozwolenie wodnoprawne_, not a simple notification.
- Somebody has to own and operate the board.
- Evaporation is missing from the estimates.
- Tenure: tenants won't build. That points straight at KOWR as landlord.
- SatAgro and IMGW Agrometeo already cover moisture monitoring.

**Most original ideas not chosen:**

- "Tabele dla gmin": reproduce the official IUNG verdict, then disaggregate to parcels (minimax-m3).
- ŁATA: a painted staff gauge read by phone camera (claude-fable-5-1).
- MELIORENTGEN: find buried PRL drains (claude-opus-5, qwen3.8-max).
- ZASTOISKO: chronic waterlogging → pond or set-aside decision (claude-fable-5-1).

## 4. Verified facts that decided it

- **Ditch data exists nationally and is free:** BDOT10k `OT_SWRM_L` GeoParquet (HEAD 200). Many panelists had assumed it didn't.
- GUGiK NMT 1 m is available, **but the WCS area download timed out**. The terrain for the demo area must be pre-downloaded.
- ULDK parcels, IMGW API, Open-Meteo, ISOK flood WMS and IUNG soil drought WCS were all fetched live.
- Science: −30.5% outflow and −33.6% nitrate (Kęsicka 2022); ditch storage 23% → 41% with weirs (Bajkowski 2024). **No Polish yield evidence was found, so don't claim yield.**
- Law: weir = pozwolenie wodnoprawne (art. 389 pkt 6); lighter routes in art. 395; maintenance by owners or the spółka (art. 205).
- Gap: no existing DEM-based weir-siting tool for Polish farmers was found, though the search was not exhaustive. SatAgro sells drought monitoring at €5–9/ha/yr, so plain monitoring is _not_ a gap.

## 5. Final selection

|                     | Concept                                                                                                           | Jury score | Why                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🥇 **Winner**       | **TRAKTOR**: ditch-weir siting + refusal/validation + forecast hold/open order + site card                           | **8.25**   | One reversible object for both hazards. Real national data, a demo-proof deterministic core, a memorable "refusal" and "flip" demo, and KOWR as a natural pilot. |
| 🥈 Best alternative | WODA.WPOLU-style farm retention siting with refusal                                                               | 6.85       | Safer and reuses about 70% of the pipeline. Crowded, and weaker on flat land.                                                                                    |
| 🚀 Most ambitious   | ZASTOISKO + PODTOP: Sentinel-1 multi-year waterlogging persistence + 72 h DEM ponding forecast, replaying EMSR756 | 6.65       | Best visuals, highest technical risk (SAR pipeline not yet verified).                                                                                            |

## 6. Product in brief

- **User journey:**
  1. Gmina map of all ditches.
  2. A counter of points analysed vs suitable, with refusal reasons.
  3. Find my parcel (ULDK).
  4. Open a site: cross-section, crest slider showing m³, backwater, ha rehydrated and days of buffer as ranges; red refusal when a neighbour's land is hit.
  5. Order of the day with "Dlaczego?" (Why?).
  6. Printable site card with the legal route and the gaps.
- **AI used honestly:**
  - Geometry and rules are deterministic, on purpose.
  - Forecasts come from IMGW and Open-Meteo.
  - An LLM only turns the structured results into plain Polish, with a number-guard.
  - A vision model reads gauge photos (bonus).
  - ML comes after the hackathon, once there are field labels.
- **Stack:**
  - The existing Next.js 16 template on Cloudflare Workers.
  - Feature folder `src/features/traktor`, Zod contracts.
  - A Python offline pipeline producing static GeoJSON.
  - A MapLibre map (new dependency: needs team approval).
  - Fixtures and scenario injection for a demo that cannot fail.

## 7. Weekend plan (summary)

- **Tonight:**
  - Pick the demo gmina (kujawsko-pomorskie suggested).
  - Download the BDOT10k ditch, road and building layers and the **NMT sheets**.
  - Check that the ditches are visible in the DTM.
  - Record fixtures.
  - Check whether the event rules allow data preparation before the start.
- **h0–8:** contracts, real ditches on the map, mock sites.
- **h8–28:** backwater + refusals pipeline, rules engine, conditions API, site panel, refusal counter. Gate: slider + refusal + flip on one real site.
- **h28–40:** site card, polish, deploy, tests (`pnpm check`), bonuses only if green.
- **h40–48:** freeze, rehearse 3×, backup video, Q&A drill.

## 8. Pitch in 30 seconds

> "Poland drained six and a half million hectares of farmland to get water _out_. Every spring those ditches export exactly the water the crop will be missing in July. TRAKTOR reads every drainage ditch in a gmina from national data, finds where a simple board would keep that water in the field, and refuses the places where it would flood a road, a house or a neighbour. Then it tells the farmer each day: hold the water, or open before the storm. It's one object for both drought and flood, built entirely on free Polish data, and KOWR, as a landowner of 1.3 million hectares, can pilot it this spring."

## 9. Risks and honesty rules

| Risk                                      | Handling                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Rival teams with the same "Zastawka" idea | A distinct name; the refusal-first demo; KOWR landlord framing; the honest legal route                            |
| DTM can't see ditches                     | Choose and validate the demo area tonight; refusal rule in the product                                            |
| Live APIs fail on stage                   | Fixtures + scenario mode + backup video                                                                           |
| Over-claiming                             | No yield claims, no cost claims, ranges everywhere, "wymaga wizji lokalnej" (requires a site visit) on every card |
| KOWR parcel list not public               | Illustrative overlay, labelled; make it the pilot ask                                                             |

## 10. Limitations of this research

- **32 of 72 attempted models could not be run.** The causes were account billing, privacy settings and quota (see the inventory). The paid `opencode/*` family includes strong models (e.g. claude-opus-5-5, gpt-6.2-sol/astra, gemini-4-neon) whose views are therefore missing.
- The debate panel had 15 members, not all 40. That was a trade-off for time and quota.
- Several facts remain UNVERIFIED. They are listed in `data_sources.md` §6 and must not be claimed on stage.
- The scoring is judgement. The rubric and per-criterion scores are shown, so the team can disagree with them explicitly.
