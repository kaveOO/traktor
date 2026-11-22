# Cross-model debate: stage 2 synthesis

Sources: the debate prompt, the idea catalogue (`## Finalist candidates` 1–10) and every panelist critique. These raw files are archived outside the repo. Every claim below is attributed to the panelist(s) who made it. Panelist ids are shortened: the `claude-agent/`, `opencode-go/` and `opencode/` prefixes are dropped.

## 1. Method and panel

- **Stage 1:** 40 models brainstormed independently. The results were clustered into `idea_catalogue.md`, which lists 10 finalist candidates.
- **Stage 2:** every panelist received the same prompt (`debate_prompt.md`). They read the catalogue, which is anonymised by cluster but cites source models, and treated a set of verified data facts as ground truth. Each panelist produced:
  - six awards;
  - the single biggest weakness of each finalist;
  - scores on 7 weighted criteria (Innovation 20 %, Impact 20 %, Winning 20 %, Feasibility 15 %, Demo 10 %, Scale 10 %, Campaign 5 %);
  - a best-combination proposal;
  - a herd-behaviour check.
- Panelists were told not to read other stage-2 files. They were also told to judge their own stage-1 ideas as harshly as anyone else's. Self-critique is disclosed by fable-5-1, opus-4-8, opus-5, hy4-preview, mimo-v2.6-pro, qwen4-max, big-pickle, deepseek-v4.1-flash-free, mimo-v2.6-flash-free and nemotron. flint-40b-free gave its own idea ("Agent rolnika") the _most underrated_ award.

**The panel that ran has 15 members, not 12.** The `stage2/` folder contains 15 files:

| Provider        | Panelists                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| claude-agent    | claude-fable-5-1, claude-opus-4-8, claude-opus-5, claude-sonnet-5                                                   |
| opencode-go     | gpt-6-luna, hy4-preview, kimi-k3.1-pro, mimo-v2.6-pro, qwen4-max                                                    |
| opencode (free) | big-pickle, deepseek-v4.1-flash-free, flint-40b-free, iceman-free, mimo-v2.6-flash-free, nemotron-3.5-super-vl-free |

**Failed Go-provider panelists.** The planned list of 7 failures ("OpenCode Go weekly usage limit reached") was minimax-m3, glm-5.3, step-5-preview, mimo-v2.6-pro, qwen4-max, grok-4.7 and hy4-preview. Three of those seven did produce critiques: **hy4-preview, mimo-v2.6-pro and qwen4-max all have stage-2 files**. Judging by which files are missing, only **4 failed: minimax-m3, glm-5.3, step-5-preview and grok-4.7**. Substitutes came from claude-agent (4) and free opencode models (6).

**Integrity flags.** Two panelists look like copies of other panelists' critiques:

- **nemotron-3.5-super-vl-free** reproduces claude-sonnet-5's score table _exactly_ (all 70 sub-scores). Its best-combination and herd sections are nearly word for word the same as sonnet-5's.
- **flint-40b-free** shares 54 of 70 sub-scores with gpt-6-luna (F5, F6 and F10 are identical). Its weakness text reuses gpt-6-luna's wording ("not necessarily additional/persistent/beneficial/attributable"), and its combination text reuses sonnet-5's ("design and operating phases of the same physical object").

Both may have read other stage-2 files despite the instruction. They are kept in the tallies but should be treated as weaker, non-independent votes. Removing both does not change the rank order of the mean scores (§3).

---

## 2. Award tallies (15 panelists)

### Most innovative

| Winner                                                                                        | n   | Panelists                            |
| --------------------------------------------------------------------------------------------- | --- | ------------------------------------ |
| "Tabele dla gmin" inversion (minimax-m3): calibrate to IUNG gmina verdicts, then disaggregate | 3   | opus-5, gpt-6-luna, mimo-v2.6-pro    |
| Zawór / coordination with a rejected "everyone closes" plan (kimi-k3.1-pro, F3)               | 3   | opus-4-8, sonnet-5, flint            |
| ŁATA painted staff gauge + QR (claude-fable-5-1)                                              | 3   | qwen4-max, deepseek, mimo-v2.6-flash |
| Polder for rent / paid controlled flooding (minimax-m3.1-flash; hy4-preview U2)               | 2   | hy4-preview, kimi-k3.1-pro           |
| CML-Rain, rainfall from microwave links (claude-opus-4-7)                                     | 2   | iceman, nemotron                     |
| KONTUR ISOXML tractor export (step-5-preview)                                                 | 1   | fable-5-1                            |
| MELIORENTGEN / melioration crowd-archaeology (qwen3.8-max, claude-opus-5)                     | 1   | big-pickle                           |

- opus-5 on Tabele: "converts a confrontation into an extension of an existing legal instrument, which is the single cleverest conceptual move in all 40 files."
- sonnet-5 on Zawór: "the only one in the whole catalogue whose demo centrepiece is a _rejected_ plan."
- deepseek on ŁATA: "the only idea in 40 that turns measurement into a social act rather than a hardware purchase."

### Most technically impressive

| Winner                                                                                                             | n      | Panelists                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **PIĘTRZ** (deepseek-v4.1-flash-free): priority-flood fill per crest height + Hooghoudt → "days of drought buffer" | **11** | fable-5-1, opus-5, sonnet-5, gpt-6-luna, hy4-preview, mimo-v2.6-pro, qwen4-max, big-pickle, flint, mimo-v2.6-flash, nemotron |
| POZ.72 / PODTOP SAR flood depth and ponding (minimax-m3.1-flash / deepseek)                                        | 2      | opus-4-8, iceman                                                                                                             |
| MELIORENTGEN (qwen3.8-max)                                                                                         | 1      | kimi-k3.1-pro                                                                                                                |
| ZAPORA "Kłodzko Replay" (qwen3.8-flash)                                                                            | 1      | deepseek (the author of PIĘTRZ)                                                                                              |

- opus-5: "the only entry in the catalogue that chains hydrology properly instead of gesturing at it … nobody else attempts the groundwater link at all."
- Caveats attached to the award:
  - The Hooghoudt inputs (hydraulic conductivity, drain spacing and depth) are not public (opus-5, gpt-6-luna, qwen4-max, deepseek).
  - Its precision "exposes the weak input" (big-pickle).

### Most commercially viable

| Winner                                                                                 | n   | Panelists                               |
| -------------------------------------------------------------------------------------- | --- | --------------------------------------- |
| Ditch audit / maintenance queue (F8: ROWY, Meliorator, Rowy 2.0)                       | 4   | fable-5-1, gpt-6-luna, deepseek, iceman |
| ZASTAWKA sold B2G to KOWR as landlord of state land (F1, claude-opus-5 variant)        | 4   | sonnet-5, big-pickle, flint, nemotron   |
| Drought evidence dossier (F6: Pola, DOWÓD SUSZY), opus-5 specifically sold to insurers | 3   | opus-4-8, opus-5, mimo-v2.6-pro         |
| WODA.WPOLU retention dossier sold per case (F4)                                        | 3   | hy4-preview, kimi-k3.1-pro, qwen4-max   |
| Forecast-driven operations as a season licence (F2)                                    | 1   | mimo-v2.6-flash                         |

- fable-5-1 on F8: "a single, legally obligated, budgeted buyer … no farmer acquisition cost and no KNF licence."
- sonnet-5 on the F1 B2G route: "a much shorter sales cycle than B2C/B2B2 agritech, and it doesn't compete head-on with SatAgro."

There is no consensus. The votes split four ways.

### Strongest environmental impact

| Winner                                                                                                   | n   | Panelists                                             |
| -------------------------------------------------------------------------------------------------------- | --- | ----------------------------------------------------- |
| Controlled / reversible drainage on existing ditches (F2/F1 family: Odwróć Melioracje, ZASTAWKA, PIĘTRZ) | 5   | fable-5-1, opus-5, hy4-preview, mimo-v2.6-pro, iceman |
| Catchment coordination (F3, Zawór)                                                                       | 4   | sonnet-5, gpt-6-luna, flint, nemotron                 |
| Peat rewetting / paludiculture (step-5-preview TORFOWISKO, mimo-v2.6-pro)                                | 3   | qwen4-max, big-pickle, deepseek                       |
| Farm retention siting (F4, WODA.WPOLU / WodoMapa)                                                        | 2   | opus-4-8, mimo-v2.6-flash                             |
| PRÓCHNICA, soil organic matter (deepseek)                                                                | 1   | kimi-k3.1-pro                                         |

opus-5 on drainage: "lower nitrate export to the Baltic … suppressed oxidation of drained organic and peaty soils … near-zero capex and no new land take."

### Best chance of winning THIS hackathon

| Winner                                                                                     | n     | Panelists                                                                                                  |
| ------------------------------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------- |
| **F1 ZASTAWKA siting + consent/permit pack** (mainly the claude-opus-5 variant)            | **8** | opus-4-8, opus-5, sonnet-5, gpt-6-luna, deepseek, flint, iceman, nemotron                                  |
| F2 ZAMKNIJ/OTWÓRZ/NIE RUSZAJ operations + protokół (grok-4.7; hy4-preview's servo variant) | 4     | fable-5-1 (with the F1 siting engine), hy4-preview, kimi-k3.1-pro, mimo-v2.6-flash (hy4-preview's version) |
| F1 siting staged with the F2 protokół / forecast flip                                      | 2     | qwen4-max, big-pickle                                                                                      |
| F4 WODA.WPOLU                                                                              | 1     | mimo-v2.6-pro                                                                                              |

**14 of 15 panelists choose the ditch-weir family (F1 and/or F2).** opus-5: "the only candidate that _is_ the campaign slogan as a physical object … the climax is a document a judge can hold, not a dashboard."

### Most underrated

| Winner                                                          | n   | Panelists                                                                     |
| --------------------------------------------------------------- | --- | ----------------------------------------------------------------------------- |
| Ditch audit / maintenance queue (F8)                            | 4   | hy4-preview, mimo-v2.6-pro, qwen4-max, iceman                                 |
| "Tabele dla gmin" inversion                                     | 3   | opus-4-8 (jointly with "the same gauge, inverted"), mimo-v2.6-flash, nemotron |
| ŁATA                                                            | 2   | gpt-6-luna, kimi-k3.1-pro                                                     |
| PRÓCHNICA / soil organic matter                                 | 1   | fable-5-1                                                                     |
| ZASTOISKO, multi-year S1 ponding persistence (claude-fable-5-1) | 1   | opus-5                                                                        |
| Coordination layer (F3)                                         | 1   | sonnet-5                                                                      |
| SUSZALERT, "law as code" deadline watcher (qwen3.8-flash)       | 1   | big-pickle                                                                    |
| "Kto traci poniżej", pay per maintained structure (grok-4.7)    | 1   | deepseek                                                                      |
| Agent rolnika (flint's own idea)                                | 1   | flint                                                                         |

qwen4-max on F8: "the prerequisite that makes the popular ideas true."

---

## 3. Aggregated scores

### Weighted totals (out of 10), recomputed from sub-scores

deepseek reported totals on a /100 scale; they are divided by 10 here.

| Finalist                | fable | opus-4-8 | opus-5 | sonnet-5 | gpt-6-luna | hy4  | kimi | mimo-pro | qwen4-max | big-pickle | deepseek | flint | iceman | mimo-flash | nemotron | **Mean** | Min  | Max  | **Rank** |
| ----------------------- | ----- | -------- | ------ | -------- | ---------- | ---- | ---- | -------- | --------- | ---------- | -------- | ----- | ------ | ---------- | -------- | -------- | ---- | ---- | -------- |
| 1 ZASTAWKA siting       | 7.10  | 7.30     | 7.70   | 7.85     | 7.85*      | 7.80 | 8.05 | 7.80     | 7.85      | 8.45       | 7.50     | 7.85  | 8.15   | 7.35       | 7.85     | **7.76** | 7.10 | 8.45 | **1**    |
| 2 Forecast operations   | 7.25  | 6.65     | 7.35   | 6.85     | 7.90*      | 8.25 | 8.00 | 7.05     | 7.50      | 8.30       | 6.60     | 7.85* | 7.25   | 7.45       | 6.85     | **7.41** | 6.60 | 8.30 | **2**    |
| 4 Farm retention siting | 6.15  | 6.95     | 6.45   | 6.35     | 7.55*      | 6.75 | 7.70 | 7.35     | 7.15      | 7.65       | 6.85     | 7.75  | 7.55   | 7.20       | 6.35     | **7.05** | 6.15 | 7.75 | **3**    |
| 7 SAR flood evidence    | 5.70  | 6.90     | 6.60   | 6.25     | 6.85*      | 6.50 | 6.85 | 6.10     | 6.75      | 6.45       | 6.10     | 6.60  | 6.85   | 6.80       | 6.25     | **6.50** | 5.70 | 6.90 | **4**    |
| 3 Coordination          | 5.75  | 6.10     | 6.20   | 6.40     | 7.55*      | 6.55 | 7.10 | 6.40     | 6.75      | 6.70       | 5.80     | 7.05* | 6.10   | 6.00       | 6.40     | **6.46** | 5.75 | 7.55 | **5**    |
| 6 Drought evidence      | 5.40  | 6.40     | 6.65   | 5.60     | 6.60*      | 6.65 | 6.50 | 6.85     | 6.65      | 6.80       | 5.75     | 6.60  | 6.00   | 6.90       | 5.60     | **6.33** | 5.40 | 6.90 | **6**    |
| 8 Ditch audit           | 5.90  | 5.65     | 6.60   | 5.20     | 6.95*      | 6.45 | 6.55 | 5.95     | 6.80      | 6.80       | 6.15     | 6.75* | 6.55   | 6.60       | 5.20     | **6.27** | 5.20 | 6.95 | **7**    |
| 5 Water ledger          | 5.20  | 6.30     | 5.20   | 5.65     | 6.60       | 6.00 | 6.65 | 6.15     | 6.00      | 6.30       | 5.75     | 6.60  | 6.50   | 6.40       | 5.65     | **6.06** | 5.20 | 6.65 | **8**    |
| 10 Retention credits    | 5.20  | 5.70     | 5.75   | 5.60     | 6.95*      | 6.00 | 6.45 | 5.45     | 6.50      | 5.80       | 5.65     | 6.95* | 6.15   | 5.80       | 5.60     | **5.97** | 5.20 | 6.95 | **9**    |
| 9 Trafficability        | 4.95  | 5.50     | 5.80   | 4.65     | 6.25*      | 5.30 | 6.35 | 5.30     | 5.55      | 5.65       | 5.05     | 6.15* | 5.80   | 5.15       | 4.65     | **5.47** | 4.65 | 6.35 | **10**   |

\* = the panelist's own total was wrong and the recomputed value is shown. The 14 corrections:

- **gpt-6-luna (9 errors, all small):**

  | Finalist | Reported | Recomputed |
  | -------- | -------- | ---------- |
  | F1       | 7.80     | 7.85       |
  | F2       | 7.95     | 7.90       |
  | F3       | 7.50     | 7.55       |
  | F4       | 7.65     | 7.55       |
  | F6       | 6.50     | 6.60       |
  | F7       | 6.80     | 6.85       |
  | F8       | 6.90     | 6.95       |
  | F9       | 6.15     | 6.25       |
  | F10      | 6.75     | 6.95       |

  F2 still ranks above F1 after the corrections.

- **flint-40b-free (5 errors, large):**

  | Finalist | Reported | Recomputed |
  | -------- | -------- | ---------- |
  | F2       | 7.35     | 7.85       |
  | F3       | 7.75     | 7.05       |
  | F8       | 6.05     | 6.75       |
  | F9       | 5.05     | 6.15       |
  | F10      | 7.35     | 6.95       |

  The errors reverse flint's stated ranking. Coordination falls from 2nd to 5th, and F1 and F2 tie at 7.85.

- sonnet-5 and nemotron list F5 (5.65) below F10 and F6 (5.60), but their arithmetic is correct. All other panelists' totals check out to ±0.005.

**Each panelist's top finalist:**

- F1 for 11 panelists: opus-4-8, opus-5, sonnet-5, kimi, mimo-pro, qwen4-max, big-pickle, deepseek, iceman, nemotron, and flint (tied with F2).
- F2 for 4 panelists: fable-5-1, gpt-6-luna, hy4-preview, mimo-flash.

**Robustness.** Without nemotron and flint, the means are F1 7.75, F2 7.42, F4 7.05, F7 6.52, F3 6.42, F6 6.37, F8 6.32, F5 6.05, F10 5.92, F9 5.48. The order is identical. Population SD of the totals ranges from 0.33 (F1, the most agreed) to 0.55 (F8, the most disputed).

### Mean of each criterion per finalist (n = 15)

| Finalist                | Innov    | Impact | Win      | Feas     | Demo     | Scale    | Campaign |
| ----------------------- | -------- | ------ | -------- | -------- | -------- | -------- | -------- |
| 1 ZASTAWKA siting       | 7.27     | 7.80   | **8.73** | 6.53     | **8.73** | 6.60     | **9.80** |
| 2 Forecast operations   | 7.47     | 7.40   | 7.87     | 5.73     | **9.13** | 6.13     | 9.47     |
| 3 Coordination          | **8.73** | 7.13   | 5.67     | 4.13     | 5.60     | 5.80     | 7.80     |
| 4 Farm retention siting | 5.20     | 7.40   | 7.13     | 7.87     | 7.87     | **6.73** | 9.27     |
| 5 Water ledger          | 4.40     | 6.53   | 5.20     | **8.60** | 6.20     | 5.67     | 7.20     |
| 6 Drought evidence      | 6.40     | 6.47   | 5.80     | 6.93     | 6.53     | 6.27     | 5.53     |
| 7 SAR flood             | 6.67     | 6.53   | 6.47     | 5.27     | 8.20     | 6.07     | 7.07     |
| 8 Ditch audit           | 6.33     | 7.20   | 5.47     | 5.73     | 5.87     | 6.47     | 7.60     |
| 9 Trafficability        | 4.13     | 6.07   | 4.07     | 8.27     | 5.33     | 5.67     | 5.60     |
| 10 Retention credits    | 8.07     | 6.73   | 4.80     | **3.87** | 5.33     | 5.80     | 7.13     |

Reading:

- F1 leads on Win, Demo and Campaign, not on Innovation.
- F3 and F10 are the most innovative but the least feasible.
- F5 and F9 are the most feasible and the least innovative.
- opus-5 calls F4's low innovation score against its 32/40 popularity "the clearest single indicator of herd behaviour in this exercise".

---

## 4. Consensus weaknesses per finalist

Counts are the number of panelists who state the point anywhere in their critique of that finalist. Some points are worded differently by different panelists, so treat the counts as approximate.

**F1 ZASTAWKA siting**

- **No national ditch/weir inventory, so the candidate network is unverified: 13.** opus-4-8, sonnet-5, gpt-6-luna, hy4, kimi, mimo-pro, qwen4-max, big-pickle, deepseek, flint, iceman, mimo-flash, nemotron. See the correction in §8.
- **Ownership, consent and legal authority: 10.** The ditch is not the farmer's, and a consent letter is not consent. sonnet-5, gpt-6-luna, hy4 (its main point), mimo-pro (its main point), qwen4-max, big-pickle, flint, iceman, nemotron, opus-5.
- **A 1 m DTM does not resolve the ditch channel, or the DEM error is close to the crest height: 7.** fable-5-1 (the LiDAR return is the water or reed surface), opus-4-8, opus-5 (its main point: a typical rów 1.2–2.5 m wide and 0.5–1.0 m deep "is routinely bridged or flattened"), kimi, deepseek ("decimetre-level vertical error" against a 40 cm crest), mimo-flash (±10 cm), hy4.
- Sharp single critiques:
  - **Buried tile drains / outfalls get backflooded:** fable-5-1, opus-5, gpt-6-luna, kimi, big-pickle. opus-5 calls it "the single most likely way this intervention destroys the crop it was meant to protect".
  - **Piętrzenie needs a pozwolenie wodnoprawne with an operat, so the promised zgłoszenie shortcut probably does not exist:** opus-5. qwen4-max: "a pozwolenie wodnoprawne / spółka governance problem, not a PDF problem".
  - **ULDK returns geometry, not owners, and EGiB is restricted, so consent letters cannot be addressed to people:** opus-5.
  - **The Hooghoudt/Dupuit "days of buffer" figure is unfalsifiable without K and drain spacing:** opus-5, deepseek, gpt-6-luna, kimi, big-pickle.
  - **Wody Polskie already ran a "retencja korytowa" weir programme (2020–23), so "nobody does this" is false:** fable-5-1.

**F2 Forecast operations**

- **No operator, authority or liability holder ("who is liable if you close on 25 mm and 60 mm falls?"): 13.** fable, opus-4-8, opus-5, sonnet-5, gpt-6-luna, mimo-pro, qwen4-max, big-pickle, deepseek, flint, iceman, mimo-flash, nemotron.
- **Few or no adjustable structures and no gate register, so there is "nothing to operate": 9.** opus-4-8, opus-5, sonnet-5, hy4, big-pickle, deepseek, flint, mimo-flash, nemotron.
- **Open loop, with no level sensing or state observation: 7.** gpt-6-luna, hy4, kimi, mimo-pro, qwen4-max, mimo-flash, flint.
- **The ESP32 servo is theatre: 7.** fable, opus-4-8, sonnet-5, qwen4-max, big-pickle, deepseek, nemotron.
- Sharp single critique: **the human who walks to the ditch at 18:00 in the rain is never costed:** opus-5, mimo-pro.

**F3 Coordination layer**

- **The demo needs seeded fake neighbours and a scripted role-play: 15/15.**
- **Multi-party cold start, with no single-user value: 9.** fable, opus-4-8, opus-5, kimi, mimo-pro, qwen4-max, iceman, mimo-flash, deepseek.
- **Shapley / fairness split is unenforceable "mathematical theatre": 7.** fable, gpt-6-luna, hy4, qwen4-max, big-pickle, deepseek, mimo-flash.

**F4 Farm retention siting + dossier**

- **Commodity, crowded and undifferentiated, so rival teams will show the same screens: 11.** fable, opus-4-8, opus-5, sonnet-5, gpt-6-luna, hy4, mimo-pro, qwen4-max, deepseek, flint, nemotron.
- **A pre-filled PDF is not an application, permit or eligibility, and programme rules change: 11.** fable, opus-5 (the operat wodnoprawny is the real cost), gpt-6-luna, kimi, mimo-pro, qwen4-max, big-pickle, deepseek, flint, iceman, mimo-flash.
- **Flat or drained lowlands give little terrain signal, and the DEM bathtub is optimistic: 5.** fable, opus-5, qwen4-max, big-pickle, iceman.
- Also cited: farmer capex and land take (30–100 k zł): fable, hy4, deepseek, mimo-pro.

**F5 Parcel water ledger**

- **SatAgro sells it and IMGW Agrometeo gives it away free: 15/15.**
- **"A weather app with extra steps": 9.** fable, opus-4-8, gpt-6-luna, hy4, qwen4-max, big-pickle, deepseek, iceman, mimo-flash.
- **Uncalibrated bucket model with unknown Kc, rooting depth and soil, and crop type unavailable while LPIS is unverified: 9.** fable, opus-5, gpt-6-luna, kimi, mimo-pro, qwen4-max, deepseek, flint, iceman.
- Also cited: Open-Meteo is licensed for non-commercial use only (big-pickle, qwen4-max).

**F6 Drought evidence**

- **No legal standing: the IUNG gmina × soil × crop figure decides aid: 13.** fable, opus-5, sonnet-5, gpt-6-luna, kimi, mimo-pro, qwen4-max, big-pickle, deepseek, flint, iceman, mimo-flash, nemotron. opus-5: it is "not an estimate of the truth — it is the legal definition of it". fable: aid runs through the aplikacja suszowa, where the IUNG figure is binding.
- **Anti-institution optics in front of KOWR judges: 13.** fable, opus-4-8, opus-5, sonnet-5, hy4, kimi, mimo-pro, qwen4-max, big-pickle, deepseek, flint, iceman, nemotron.
- **IUNG SMSR has no API, so the scraper is brittle: 7.** opus-4-8, opus-5, hy4, kimi, qwen4-max, iceman, mimo-flash.
- Also cited: the product is reactive (6 panelists). minimax-m3's calibrate-then-disaggregate inversion is named as the escape route by opus-5, gpt-6-luna, mimo-v2.6-pro, mimo-flash and nemotron.

**F7 SAR flood evidence**

- **The S1 revisit (6–12 days) and latency rule out "within 24 h": 11.** opus-5, sonnet-5, gpt-6-luna, hy4, mimo-pro, qwen4-max, deepseek, flint, iceman, mimo-flash, nemotron.
- **Canopy limits: under a closed maize or cereal canopy, flooded vegetation double-bounces or brightens: 7.** fable, opus-5, gpt-6-luna, hy4, kimi, big-pickle, mimo-flash.
- **A DEM fill-and-spill is not a hydraulic forecast, and depth from a DEM is unreliable: 6.** gpt-6-luna, kimi, qwen4-max, deepseek, flint, mimo-flash.
- **Too few pixels on small strip parcels: 6.** fable, sonnet-5, gpt-6-luna, hy4, flint, nemotron.
- Also cited: it is reactive and documents loss rather than preventing it (5).

**F8 Ditch audit**

- **Missing ditch layer: 11.** opus-4-8, sonnet-5, gpt-6-luna, kimi, mimo-pro, qwen4-max, big-pickle, flint, iceman, mimo-flash, nemotron.
- **Ambiguous signal (silt vs deliberate retention vs mowing vs clay): 9.** opus-4-8, opus-5, gpt-6-luna, hy4, kimi, qwen4-max, flint, iceman, mimo-flash.
- **Sub-pixel: a 1–3 m ditch against 10 m pixels: 8.** fable, opus-5, gpt-6-luna, hy4, kimi, mimo-pro, big-pickle, deepseek.
- **No buyer with both the duty and the money: 7.** opus-4-8, opus-5, mimo-pro, big-pickle, deepseek, qwen4-max, fable.

**F9 Trafficability**

- **Looks like a weather app, with no wow: 10.**
- **The farmer already knows by eye: 9.**
- **No soil-strength, bearing-capacity or tyre data: 9.** deepseek adds that the soil map covers only 4 voivodeships, which forces a fallback to 250 m SoilGrids.

**F10 Retention credits**

- **No payer or willingness to pay: 15/15.**
- **No legal instrument: 12.**
- **MRV and additionality cannot be audited: 12.**
- Sharp single critique: **it would double-fund practices that CAP eco-schemes already pay for, inviting an audit finding:** opus-5.

---

## 5. Best-combination proposals

| Panelist        | Proposed product (one line)                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fable-5-1       | F1 + F2 "one ditch, two moments" + a step where the farmer draws the missing inventory (marks a tile-drain outfall); cut ponds, grant PDF, ESP32, Sentinel on the critical path |
| opus-4-8        | F4 pond siting as backbone + F1 weir as hero (hand-assembled gmina) + F7 dual-scenario/Kłodzko beat; **cut the F2 scheduler**                                                   |
| opus-5          | F1 spine + F8 S1-persistence / LiDAR-resolvability validator + one F2 OTWÓRZ order; "refusal as the headline"; cut subsidy generator and hardware                               |
| sonnet-5        | F1 + F2 "site it once, operate it forever" + zgłoszenie draft; coordination only as a slide                                                                                     |
| gpt-6-luna      | "RówPilot": F2 + a thin F1 on one manually checked catchment, with user correction and a human-in-the-loop request                                                              |
| hy4-preview     | F1 + F2 + a retention ledger/certificate (the MRV slice of F10); servo as an optional prop                                                                                      |
| kimi-k3.1-pro   | F1 + F2 + ŁATA gauge; one surveyed micro-reach; ranges, not point values                                                                                                        |
| mimo-v2.6-pro   | F1 + F2 + the F1/F4 document payload; the user corrects a culvert                                                                                                               |
| qwen4-max       | F1 + F2 (one structure, one rule) + ŁATA as the ground-truth flywheel                                                                                                           |
| big-pickle      | F1 + F2 + ŁATA / F8 photo "asset truth" step; user is the spółka chair, ODR adviser or KOWR estate manager                                                                      |
| deepseek        | F1 + F8 condition audit as the honesty layer + one document; **cut the F2 scheduler**                                                                                           |
| flint           | F1 + F2                                                                                                                                                                         |
| iceman          | F1 + light F2 toggle + consent/permit dossier                                                                                                                                   |
| mimo-v2.6-flash | F1 + F2 "the ditch with a brake"; ledger only as the engine under the slider; protokół with a 7-day expiry                                                                      |
| nemotron        | F1 + F2 + zgłoszenie draft (same as sonnet-5)                                                                                                                                   |

**Clusters**

- **A. F1 + F2 core (siting + operation of one object): 13/15.** fable, opus-5 (as a single order), sonnet-5, gpt-6-luna, hy4, kimi, mimo-pro, qwen4-max, big-pickle, flint, iceman, mimo-flash, nemotron.
  - Ground-truth / inventory layer added by 8: ŁATA (kimi, qwen4-max, big-pickle), user-corrected inventory (fable, gpt-6-luna, mimo-pro, big-pickle), S1 / audit validator (opus-5).
- **B. F1 without the scheduler: 2.** deepseek (with the F8 audit) and opus-4-8 (with F4 + F7).
- **Almost universal elements:**
  - A rejected or relocated site as the credibility beat.
  - Volumes labelled as screening estimates or ranges.
  - A holdable PDF or protokół.
  - Precomputing one gmina or catchment.
  - A pilot ask on KOWR's leased ZWRSP land. Made explicitly by 11: fable, opus-4-8, opus-5, hy4, kimi, mimo-pro, qwen4-max, big-pickle, deepseek, iceman, mimo-flash.
- **Cut by the majority:** F3 coordination voting and Shapley splits, F10 credits, F6 claims, F5 ledger, F9, live Sentinel processing, and hardware as a dependency.

**Majority shape.** One ditch-weir object, sited from LiDAR with priority-flood volumes and hard constraint refusals, then operated by a forecast-driven ZAMKNIJ/OTWÓRZ/NIE RUSZAJ order that flips on an IMGW warning. It ends in a draft site card / protokół with affected cadastral IDs and an honest water-law checklist. The ditch inventory gap is handled in the open by a pre-verified demo catchment plus a user or ŁATA ground-truth step, and the pitch closes on a KOWR state-land pilot.

---

## 6. Herd-behaviour verdicts

- **Mixed verdict: 15/15.** No panelist calls the C1/C2 convergence pure insight or pure herd behaviour.
- **The typical formulation:** the lever or diagnosis is right, but the product template ("parcel → LiDAR flow accumulation → ranked pins → PDF") is herd behaviour. fable-5-1: "right about the lever and wrong about the product". Others: sonnet-5, nemotron, big-pickle, deepseek, gpt-6-luna, kimi, flint, iceman, opus-4-8.
- **C2 justified, C1 herd: 3.** opus-5 ("C1 is herd behaviour. C2 is roughly right, but almost every model justified it with the wrong reason"), hy4-preview and qwen4-max.
- **"Half right, for the wrong reason":** mimo-v2.6-pro and mimo-v2.6-flash. mimo-flash: "the herd selected for demo-feasibility, then rationalised it as insight".
- **Is "8 of 13 C2 picks named Zastawka" a herd tell?**
  - Yes, according to 7: opus-4-8, opus-5, kimi, mimo-pro, qwen4-max, big-pickle, deepseek.
  - hy4-preview alone reads it as evidence "they found a real object, not a meme".
- **Named causes of the herd effect:**
  - The brief and its data list dictate the product: fable, deepseek, mimo-flash, sonnet-5, nemotron.
  - The campaign name invites lexical completion: deepseek, qwen4-max.
  - An "artefact prior" that judges reward PDFs: deepseek.

**What everyone misses** (panelist count):

| Missed point                                                                                            | n   | Panelists                                                                                                    |
| ------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------ |
| The ditch/asset inventory is missing; the data gap _is_ the product or the KOWR ask                     | 12  | fable, opus-4-8, gpt-6-luna, hy4, kimi, mimo-pro, qwen4-max, big-pickle, deepseek, flint, iceman, mimo-flash |
| Ownership, authority, liability and operator (spółka capacity, who walks to the ditch)                  | 12  | fable, opus-4-8, opus-5, sonnet-5, gpt-6-luna, hy4, kimi, mimo-pro, qwen4-max, big-pickle, iceman, nemotron  |
| Free and paid incumbents (SatAgro, IMGW Agrometeo) already cover the monitoring layer                   | 9   | opus-4-8, gpt-6-luna, kimi, mimo-pro, qwen4-max, big-pickle, flint, iceman, mimo-flash                       |
| No validation, ground truth or demand evidence                                                          | 8   | fable, sonnet-5, nemotron, mimo-pro, mimo-flash, iceman, gpt-6-luna, deepseek                                |
| False precision: m³ ≠ crop protection; evaporation; "days of buffer" not computable                     | 6   | opus-5 (evaporation 4–5 mm/day), kimi, big-pickle, deepseek, mimo-pro, gpt-6-luna                            |
| Flat terrain or sandy soils undermine DEM physics                                                       | 5   | fable (sands: lateral effect of tens of metres), sonnet-5, nemotron, mimo-flash, iceman                      |
| Maintenance (C7) is the prerequisite                                                                    | 4   | qwen4-max, iceman, mimo-flash, hy4                                                                           |
| Water quality, nitrates, WFD/Baltic benefit unused                                                      | 4   | opus-5, hy4, iceman, kimi                                                                                    |
| KOWR as landlord / counterparty; land tenure (tenants won't build)                                      | 3   | fable, opus-5, hy4                                                                                           |
| Soil organic matter / cover crops / non-structural measures                                             | 3   | fable, mimo-flash, kimi                                                                                      |
| Recurring engagement (nothing in February; deadline watcher)                                            | 3   | hy4, mimo-flash, qwen4-max                                                                                   |
| Buried tile drains as the primary hazard                                                                | 2   | fable, opus-5                                                                                                |
| Peat rewetting                                                                                          | 2   | qwen4-max, deepseek                                                                                          |
| Downstream cost and the value of an m³ go unpriced                                                      | 2   | deepseek, hy4                                                                                                |
| "Why hasn't KOWR / Wody Polskie built this already?"                                                    | 2   | sonnet-5, nemotron                                                                                           |
| Wody Polskie retencja korytowa as a validation set                                                      | 1   | fable                                                                                                        |
| Drought and flood happen in different places, so the dual-hazard story should be seasonal, not regional | 1   | opus-5                                                                                                       |
| Orchard and vegetable irrigators are ignored                                                            | 1   | fable                                                                                                        |

---

## 7. Main disagreements

1. **Include the F2 scheduler or not.**
   - 13 build siting + operation.
   - deepseek cuts it: "needs an installed base and an operator, and it doubles the surface area".
   - opus-4-8 cuts it as "fake without real mapped structures".
   - fable-5-1, gpt-6-luna and hy4 rank F2 above F1.
2. **Hardware.**
   - Cut entirely: fable, opus-5, gpt-6-luna, deepseek (except as a physical board on the table).
   - Optional prop: hy4, mimo-flash, big-pickle, kimi (hand-moved board).
   - hy4's best-chance award explicitly credits the servo as "disproportionately memorable".
3. **Pond/retention siting (F4).**
   - Commodity, cut it: fable, opus-5, hy4, qwen4-max, big-pickle.
   - Backbone: opus-4-8.
   - Best chance of winning: mimo-v2.6-pro.
   - F4 still ranks 3rd by mean score.
4. **"Days of drought buffer" and the funding shortlist in the demo.**
   - Kept, labelled as screening: mimo-pro, qwen4-max, iceman, mimo-flash, sonnet-5.
   - Cut or turned into ranges: deepseek, kimi, gpt-6-luna.
   - Grant generator cut or reduced to a checklist: opus-5, fable, mimo-flash.
5. **Spółki wodne status.**
   - mimo-pro and big-pickle repeat step-5-preview's claim that water unions were "dissolved in 2022".
   - fable and opus-5 call it wrong or overstated: spółki still exist, many inactive.
   - opus-4-8 says "largely gutted", deepseek "treat as a claim to verify", mimo-flash "defunded".
6. **Who has the ditch-maintenance duty and budget (F8).**
   - deepseek: "gminas are legally responsible for melioration ditches".
   - fable-5-1: Wody Polskie and gminy spend heavily.
   - opus-5: maintenance sits with benefiting landowners and spółki, and "a gmina has no general statutory obligation for private rowy".
7. **Commercial viability.** Split four ways (§2): F8 B2G audit, F1 sold to KOWR, F6 sold to insurers, F4 dossier service.
8. **Environmental impact.** Drainage at scale (5) vs coordination (4) vs peat rewetting (3).
9. **Coordination (F3).**
   - sonnet-5 and nemotron call it underrated and the top environmental lever, and rank it 3rd.
   - All others cut it from the build. opus-5: "unanimity is correct for once".
10. **Live consent SMS to a judge's phone.**
    - Included: hy4, kimi, mimo-pro, mimo-flash.
    - Explicitly cut: fable.
11. **Kłodzko 2024 replay.**
    - Emotional anchor: opus-4-8, mimo-pro, opus-5 (calls it "the best single demo device", §1).
    - opus-5 also warns that pairing the Kujawy drought belt with the Kłodzko flood mixes regions a hydrologist will catch.
    - deepseek warns it is "a different catchment from the demo farm".

---

## 8. Correction note: ditch data availability

Several panelists said no national ditch dataset exists, or that BDOT10k is not usable:

- opus-4-8: "a dataset that does not exist at national scale".
- qwen4-max: "BDOT10k is _not_ in the verified free-and-working list".
- Also sonnet-5, nemotron, mimo-pro, mimo-flash, big-pickle, iceman, flint, deepseek and hy4, each in F1/F8 weaknesses.

This followed the stage-2 prompt's statement that the melioration-infrastructure inventory has "NO national API". **A later verification corrects part of it:**

- **Ditch geometry is a free national download.** BDOT10k class **OT_SWRM_L** (rowy melioracyjne) is at `opendata.geoportal.gov.pl/bdot10k/schemat2021/GeoParquet/OT_SWRM_L.parquet` (HEAD request returned 200). The "no ditch layer" objection to F1, F2, F3 and F8 is therefore overstated. Line geometry exists nationally; only completeness and positional accuracy still need checking per reach. fable-5-1 was right that "ditch lines exist (BDOT10k rów class, OSM)". The other F1-specific technical objections still stand: whether 1 m LiDAR resolves the channel cross-section (opus-5, fable, deepseek) and buried tile drains.
- **The structure/weir inventory is still not openly available.** Wody Polskie's ewidencja urządzeń melioracji wodnych is digital but available **on request only**. Panelists' points about the absence of a weir/gate/culvert register (F2 "nothing to operate", F2/F10 MRV) and about owner/operator identity remain valid.
