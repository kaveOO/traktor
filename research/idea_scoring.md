# Idea scoring: unified rubric

## Rubric (weights given in the brief)

| Criterion                                | Weight |
| ---------------------------------------- | ------ |
| Innovation and originality               | 20%    |
| Real-world agricultural impact           | 20%    |
| Hackathon winning potential              | 20%    |
| Technical feasibility in a weekend       | 15%    |
| Demonstration and presentation potential | 10%    |
| Scalability and commercial potential     | 10%    |
| Alignment with the campaign              | 5%     |

`Weighted = 0.20·Inn + 0.20·Impact + 0.20·Win + 0.15·Feas + 0.10·Demo + 0.10·Scale + 0.05·Align`, on a 10-point scale.

## Two independent scorings

### A. Panel mean (15 model panelists, stage 2)

Source: [`cross_model_debate.md`](cross_model_debate.md). Totals were recomputed from sub-scores where a panelist's arithmetic was wrong. Two panelists produced near-duplicate scores (nemotron-3.5-super-vl-free ≈ claude-sonnet-5; flint-40b-free ≈ gpt-6-luna). They are kept, but removing them does not change the rank order.

| Rank | Finalist                                                | Mean     | Min  | Max  |
| ---- | ------------------------------------------------------- | -------- | ---- | ---- |
| 1    | F1 ZASTAWKA: ditch-weir siting + consent/permit pack    | **7.76** | 7.10 | 8.45 |
| 2    | F2 Forecast-driven controlled-drainage operations       | **7.41** | 6.60 | 8.30 |
| 3    | F4 Farm retention siting + subsidy dossier              | 7.05     | 6.15 | 7.75 |
| 4    | F7 SAR flood / waterlogging evidence + ponding forecast | 6.50     | 5.70 | 6.90 |
| 5    | F3 Catchment / spółka-wodna coordination                | 6.46     | 5.75 | 7.55 |
| 6    | F6 Parcel-vs-gmina drought evidence                     | 6.33     | 5.40 | 6.90 |
| 7    | F8 Ditch condition audit & maintenance queue            | 6.27     | 5.20 | 6.95 |
| 8    | F5 Parcel water ledger / field twin                     | 6.06     | 5.20 | 6.65 |
| 9    | F10 Retention credits / downstream-pays                 | 5.97     | 5.20 | 6.95 |
| 10   | F9 Trafficability / compaction windows                  | 5.47     | 4.65 | 6.35 |

### B. Jury scoring (orchestrator)

This scoring adjusts for facts the panel did **not** have: the later verification found that **BDOT10k `OT_SWRM_L` ditch lines are a free national download**. That removes the most-cited objection to F1/F2. It also adds what the panel exposed: the 1 m DTM may not resolve channels, buried drains, permits, the operator problem, and competition from SatAgro and IMGW Agrometeo.

| Finalist                                                     | Inn | Impact | Win | Feas | Demo | Scale | Align | **Weighted** |
| ------------------------------------------------------------ | --- | ------ | --- | ---- | ---- | ----- | ----- | ------------ |
| **TRAKTOR = F1 + F2 + refusal/validation layer (synthesis)**    | 8   | 8      | 9   | 7    | 10   | 7     | 10    | **8.25**     |
| F1 ZASTAWKA siting + consent pack                            | 7   | 8      | 9   | 7    | 9    | 7     | 10    | **7.95**     |
| F2 Controlled-drainage operations                            | 7   | 8      | 8   | 6    | 9    | 6     | 10    | **7.50**     |
| F4 Farm retention siting + dossier                           | 5   | 7      | 6   | 9    | 8    | 6     | 10    | **6.85**     |
| F7 SAR flood / waterlogging (persistence + ponding forecast) | 7   | 6      | 7   | 5    | 9    | 6     | 8     | **6.65**     |
| F8 Ditch audit & maintenance queue                           | 6   | 7      | 6   | 6    | 6    | 7     | 9     | **6.45**     |
| F3 Catchment coordination                                    | 9   | 7      | 5   | 4    | 6    | 5     | 8     | **6.30**     |
| F6 Parcel drought evidence                                   | 6   | 6      | 5   | 7    | 7    | 8     | 5     | **6.20**     |
| F10 Retention credits                                        | 9   | 5      | 4   | 4    | 5    | 5     | 7     | **5.55**     |
| F9 Trafficability                                            | 4   | 6      | 4   | 9    | 5    | 6     | 5     | **5.50**     |
| F5 Parcel water ledger                                       | 3   | 6      | 4   | 9    | 6    | 4     | 7     | **5.30**     |

## Score justifications (short)

- **F1 ZASTAWKA (7.95).**
  - _For:_ it is the only idea whose single physical object (a board in an existing ditch) answers both halves of the brief, drought and flood.
  - _For:_ its core is deterministic terrain computation on verified free national data: BDOT10k ditches, NMT 1 m and ULDK.
  - _For:_ no existing Polish DEM-based weir-siting tool was found (search was not exhaustive), and KOWR is a landlord of 1.324 mln ha.
  - _Against:_ building a weir needs a pozwolenie wodnoprawne (art. 389 pkt 6).
  - _Against:_ the DTM may not resolve narrow ditches.
  - _Against:_ buried drains create a back-flooding risk.
  - _Against:_ several rival teams may bring the same idea, since eight models chose the name "Zastawka".
- **F2 Operations (7.50).** It has the best "same object flips" moment and the strongest environmental case (−30% outflow, −34% nitrate, Kęsicka 2022). It loses points because no open structure inventory exists, the operator is unclear, liability is unresolved, and someone has to physically walk to the gate.
- **TRAKTOR synthesis (8.25).** It fixes F1's two biggest credibility holes with validation and refusal. It takes the single strongest demo beat from F2, the forecast flip. Most panelists independently proposed this combination (13 of 15).
- **F4 (6.85).** It is easy to build and demo, but it is the most crowded idea (32/40 models). It automates the cheap step (siting) and skips the expensive one (the water-law operat), and it says little on flat ground.
- **F7 (6.65).** Visually the most impressive, but Sentinel-1 revisits every 6–12 days and sees poorly under canopy, so the "within 24 h" claims are not achievable. A multi-year _persistence_ version (ZASTOISKO) is honest and is a strong second project.
- **F3, F10.** The most original ideas, but they have no first user or payer, and their demos depend on fictional seeded neighbours.
- **F6.** For state aid, the gmina-level IUNG index _is_ the legal definition, and pitching "the state is wrong" to KOWR judges backfires.
- **F5, F9.** Feasible, but they are worse versions of SatAgro and IMGW Agrometeo, or of the farmer's own judgment.

## Not decided by vote count

- 29/40 models recommended C1 or C2. That was treated as **a prior to be tested**, not as evidence.
- C1 (ponds) was _down-weighted_ despite being the most popular: it is crowded, legally heavy and weak on flat terrain.
- C2 survived because of verification:
  - the ditch data exists nationally;
  - peer-reviewed storage and outflow effects exist;
  - no direct competitor was found;
  - the control is reversible, which is what makes the "both directions" claim honest.
