# Stage 1: Independent brainstorming (40 models)

## Method

- Every model got **the same prompt**: five ideas (A), a strongest recommendation (B) and at least two unconventional ideas (C), all for KOWR's _STOP WATER, PROTECT CROP_ challenge.
- Each model ran in its **own isolated OpenCode subagent session**, all launched in parallel. Each was told not to read any other file under `research/` and wrote only to its own file. No model saw another model's ideas before writing.
- Web research was optional in this stage. One model (`opencode-go/minimax-m3`) chose to verify a few sources live.
- The full responses (one file per model, about 40 × 20–55 KB) and a per-model extraction of every model's ideas are **archived outside the repo**. This document summarises them.

## Models executed (40)

claude-agent: claude-opus-5, claude-fable-5-1, claude-fable-5, claude-sonnet-5, claude-opus-4-8, claude-opus-4-7, claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 ·
opencode-go: qwen4-max, qwen3.8-max, qwen3.8-flash, qwen3.7-plus, kimi-k3.1-pro, kimi-k3, kimi-k2.7-code, gpt-6-luna, gpt-5.6-luna, grok-4.7, claude-haiku-5-5, glm-5.3, glm-5.3-flash, minimax-m3, minimax-m3.1-flash, mimo-v2.6-pro, mimo-v2.6-flash, step-5-preview, hy3, hy4-preview, hy4-flash-free, longcat-2.0, beam-free ·
opencode (free): big-pickle, deepseek-v4.1-flash-free, flint-40b-free, iceman-free, mimo-v2.6-flash-free, nemotron-3.5-lightning-free, nemotron-3.5-super-vl-free, tidepool-alpha-free (its file header says the model name is "withheld per product policy").
See [`model_inventory.md`](model_inventory.md) for the 32 models that could not be run and why.

In total there are about 200 main ideas and about 100 unconventional ideas.

## What the models recommended (section B)

| Cluster                                                                                                      | # models recommending | Example product names (model)                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** Farm/parcel retention siting (ponds, swales, depressions) + subsidy dossier                           | **16**                | RetencjaMapa (claude-opus-4-8), WODA.WPOLU (minimax-m3.1-flash), WodoMapa (mimo-v2.6-pro), Retencjomat (kimi-k3), RETENCJOMETR (qwen3.8-flash), Rów i Gąbka (big-pickle), DrenaŻyw (tidepool)                                                                                               |
| **C2** Ditch weir / controlled drainage on existing melioration ditches (siting and/or open-close operation) | **13**                | ZASTAWKA (claude-opus-5, claude-fable-5-1, hy4-preview, qwen3.8-max, step-5-preview), Zastawka (grok-4.7, glm-5.3, qwen4-max), PIĘTRZ (deepseek-v4.1-flash-free), Odwróć Melioracje (claude-opus-4-7), Zawór (kimi-k3.1-pro), Rów Rzeźnicki (minimax-m3), RetencjaSmart (claude-sonnet-4-6) |
| **C4** Parcel water balance / "water account" / field twin (retain–drain–irrigate)                           | **7**                 | WARNA (glm-5.3-flash), Wodny Portfel (longcat-2.0), Wodny paszport działki (hy4-flash-free), WODNE KONTO (mimo-v2.6-flash-free), WodaNaJutro (gpt-5.6-luna), Woda w Równowadze (gpt-6-luna), RówPilot (iceman-free)                                                                         |
| C14 Low-cost IoT sensors                                                                                     | 2                     | HydroAlert (claude-haiku-4-5), AgriSense (nemotron-3.5-lightning-free)                                                                                                                                                                                                                      |
| C5 Parcel drought-claim evidence                                                                             | 1                     | Pola (claude-sonnet-5)                                                                                                                                                                                                                                                                      |
| C7 Ditch maintenance prioritisation                                                                          | 1                     | Meliorator (kimi-k2.7-code)                                                                                                                                                                                                                                                                 |

**Observation:** C1 and C2 together account for **29 of 40** recommendations. Eight models independently named their product "Zastawka", which means "ditch weir board".

## All concept clusters (models proposing any idea in the cluster / models recommending it)

| #   | Cluster                                                                | Proposing | Recommending | Strongest distinctive variants (model)                                                                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------- | --------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Farm retention siting + subsidy dossier                                | 32        | 16           | WODA.WPOLU: constraint check that rejects a site and offers a fix (minimax-m3.1-flash). WodoMapa: animated 20 mm rain routed before/after (mimo-v2.6-pro). RETENCJOMETR "Kłodzko Replay" (qwen3.8-flash). Honest "flat parcel, low benefit" (claude-opus-4-8)                                                            |
| C2  | Ditch weir / controlled drainage                                       | 24        | 13           | PIĘTRZ: priority-flood exact volume + Hooghoudt "days of drought buffer" (deepseek-v4.1-flash-free). ZASTAWKA: neighbour consent + KOWR as landlord (claude-opus-5). Zastawka: ZAMKNIJ / OTWÓRZ / NIE RUSZAJ orders with a 7-day consent protocol (grok-4.7). Zawór: rejected "everyone closes" scenario (kimi-k3.1-pro) |
| C3  | Catchment / water-company (spółka wodna) coordination, cost sharing    | 22        | 0            | Wspólnota Wody (claude-fable-5), Wspólny Rów (minimax-m3), Shapley cost split (qwen4-max and others), Ćwiczenie 100 mm multiplayer rain rehearsal (kimi-k3.1-pro)                                                                                                                                                        |
| C4  | Parcel water ledger / field twin                                       | 22        | 7            | WARNA in złoty (glm-5.3-flash), HYDROBLIŹNIAK with dual deficit/excess counters (qwen3.8-max), KROPLA SMS for smallholders (see catalogue)                                                                                                                                                                               |
| C5  | Drought/damage claim evidence (parcel vs gmina)                        | 22        | 1            | DOWÓD SUSZY: hash-stamped, self-benchmarked (claude-opus-5; qwen3.8-max). SUSZALERT "law as code" (qwen3.8-flash). "Tabele dla gmin" inversion (minimax-m3)                                                                                                                                                              |
| C6  | Flood/waterlogging SAR detection + ponding forecast                    | 24        | 0            | POZ.72 replant clock (minimax-m3.1-flash), PODTOP 72 h ponding forecast (deepseek-v4.1-flash-free), ZASTOISKO chronic wet zones → pond economics (claude-fable-5-1)                                                                                                                                                      |
| C7  | Ditch/drainage condition audit & maintenance                           | 22        | 1            | ROWY "ditch cardiogram" (deepseek-v4.1-flash-free), Meliorator (kimi-k2.7-code), MELIORENTGEN buried tile drains (claude-opus-5, qwen3.8-max)                                                                                                                                                                            |
| C8  | Parametric insurance / climate credit scoring                          | 26        | 0            | ParaSusza, Gminna Kasa Sucha, ZNIŻKA ZA ZASTAWKĘ                                                                                                                                                                                                                                                                         |
| C9  | Retention credits / payment for ecosystem services / "downstream pays" | 31        | 0            | "Woda z Góry" reverse auction (claude-opus-5), Kto traci poniżej (grok-4.7), Polder for rent (minimax-m3.1-flash, hy4-preview)                                                                                                                                                                                           |
| C10 | Water sharing / logistics / mutual aid                                 | 26        | 0            | OSP fire-brigade water logistics, Nocna Warta frost-night scheduler (glm-5.3), irrigation time bank                                                                                                                                                                                                                      |
| C11 | Trafficability / compaction windows                                    | 16        | 0            | CZY WJADĘ? (claude-opus-5), OKNO POLOWE (deepseek-v4.1-flash-free)                                                                                                                                                                                                                                                       |
| C12 | Satellite drought early warning                                        | 11        | 0            | Barometr Działki, AquaRadar                                                                                                                                                                                                                                                                                              |
| C13 | Climate-shifted calendar / varieties / rotation                        | 20        | 0            | Klimatyczny Analog "your gmina in 2040 = today's Hungary" (claude-fable-5-1, big-pickle), TERMINOMAT                                                                                                                                                                                                                     |
| C14 | Low-cost sensors & crowdsourcing                                       | 20        | 2            | ŁATA painted staff gauge + QR + computer vision (claude-fable-5-1), KROKIEW €35 LoRaWAN node                                                                                                                                                                                                                             |
| C15 | Soil organic matter as storage                                         | 8         | 0            | PRÓCHNICA, GlebaSkan                                                                                                                                                                                                                                                                                                     |
| C16 | Beavers as retention                                                   | 6         | 0            | BÓBR INŻYNIER, BobrBank                                                                                                                                                                                                                                                                                                  |
| C17 | Gamification                                                           | 10        | 0            | Liga Retencji, Rain Bounty                                                                                                                                                                                                                                                                                               |
| C18 | Energy–water nexus                                                     | 3         | 0            | Pump scheduling against day-ahead power prices (claude-fable-5-1, minimax-m3.1-flash)                                                                                                                                                                                                                                    |

## Distinctive outliers (only 1–2 models; notably original)

1. **CML-Rain** (claude-opus-4-7): rainfall maps from the attenuation of cell-tower microwave links.
2. **ŁATA** (claude-fable-5-1): zero-electronics painted staff gauge read by passers-by's phone cameras.
3. **MELIORENTGEN** (claude-opus-5, qwen3.8-max): find buried PRL-era tile drains from cropmarks and old paper plans.
4. **"Tabele dla gmin" inversion** (minimax-m3): calibrate a parcel model to reproduce the official IUNG gmina verdicts, then disaggregate to parcels.
5. **Polder for rent** (minimax-m3.1-flash, hy4-preview): pay owners of low-lying land to accept controlled flooding.
6. **Energy-price pump scheduling** (claude-fable-5-1, minimax-m3.1-flash).
7. **Nocna Warta** (glm-5.3): frost-night sprinkler water budget for shared orchard ponds.
8. **KONTUR** (step-5-preview): retention design exported as an ISOXML track for an RTK tractor.
9. **"Every ditch has a price"** (minimax-m3.1-flash): value ditch retrofits against a gmina's stormwater fees.
10. **Śnieg na wagę złota** (qwen4-max): snowpack as a reservoir, with meltwater credits.
11. **Kłodzko Replay** (qwen3.8-flash): replay the September 2024 rain on the user's catchment.
12. **Ćwiczenie 100 mm** (kimi-k3.1-pro): multiplayer rain-rehearsal game on the real ditch map.
13. **Sołtys Wodny** (claude-fable-5): voice phone agent that calls elderly farmers.
14. **Ściek na Pole** (deepseek-v4.1-flash-free, hy3): treated municipal wastewater matched to nearby farms.
15. **Road-runoff harvesting** (glm-5.3, nemotron-3.5-super-vl-free).

## Ten finalist candidates carried into stage 2

1. ZASTAWKA: ditch-weir siting with neighbour consent and permit pack
2. Forecast-driven controlled-drainage operations (open/close scheduler)
3. Catchment / water-company (spółka wodna) coordination layer
4. Farm-scale retention siting & subsidy dossier
5. Parcel water ledger / field twin
6. Parcel-vs-gmina drought evidence & claim autopilot
7. SAR flood / waterlogging evidence & ponding forecast
8. Ditch-network condition audit & maintenance queue
9. Trafficability / compaction windows
10. Retention credits / downstream-pays mechanism

The full merged description of each candidate is in the archived idea catalogue (kept outside the repo).
