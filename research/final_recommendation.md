# Final recommendation: jury verdict

## The answer

**Build TRAKTOR, a tool that turns Poland's existing field-drainage ditches into reversible water storage.**
It finds where a simple board in a ditch would hold water, refuses the places where that would cause harm, and tells the farmer, day by day, whether to hold the water (drought) or release it (storm). It then prints a site card that a farmer, a spółka wodna or KOWR can act on.

> "Poland already built a water machine on 6.4 million hectares. It only runs one way: out. TRAKTOR makes it run both ways."

## Winner: TRAKTOR (F1 ZASTAWKA siting + F2 forecast order + a refusal/validation layer)

### Why it beats the alternatives

| Requirement from the brief      | How TRAKTOR meets it                                                                                                                                                                                                        | Evidence                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Clear, specific problem         | About 6.4 mln ha of Polish farmland is drained. The ditches were built to remove water fast, so spring water leaves before the summer drought.                                                                           | NIK (via GUS), VERIFIED                                                       |
| Both scarcity _and_ excess      | The same object does both, reversibly: board in (hold), board out (release before a storm). The two halves of the brief become one decision on one map.                                                                  | Concept, plus the panel consensus (13/15 combine siting + operation)          |
| Real agricultural value         | Controlled drainage cut outflow by 30.5% (~71 mm) and nitrate by 33.6%. Weirs raised usable ditch storage from 23% to 41%.                                                                                               | Kęsicka et al. 2022 (PLoS ONE); Bajkowski et al. 2024 (JWLD), VERIFIED        |
| Genuine technological advantage | Nationwide ditch geometry (BDOT10k `OT_SWRM_L`) is joined with 1 m LiDAR terrain, cadastral parcels, flood-hazard zones, soil drought susceptibility and live IMGW/forecast data. No existing tool was found doing this. | data_sources.md. Absence of competitors: VERIFIED search, not exhaustive      |
| Feasible weekend MVP            | Heavy geoprocessing is precomputed for **one** demo area. Live parts are only the forecast, warnings and parcel lookup. Every input is free and was verified live.                                                       | data_sources.md §5                                                            |
| Memorable demo                  | The headline is a counter that _refuses_ most candidate sites, with reasons. Then the same weir flips from TRZYMAJ to OTWÓRZ when a storm warning is injected.                                                           | Panel consensus (claude-opus-5, gpt-6-luna, kimi-k3.1-pro, grok-4.7 variants) |
| Credible path to deployment     | KOWR manages 1.324 mln ha of state land and is itself a landowner. On its own leased land it can authorise structures without assembling neighbour consent, which makes it the natural first pilot.                      | KOWR, VERIFIED                                                                |
| Polish-specific                 | It uses PRL-era melioration, spółki wodne, Prawo wodne, BDOT10k, ISOK and IUNG. It cannot be a generic import.                                                                                                           |                                                                               |

### Why not the runner-ups

- **F4 Farm pond siting.** It was the most popular idea (32/40 models), so expect several rival teams. A pond takes land out of production and needs an operat wodnoprawny, and the analysis says little on flat drought-belt terrain. TRAKTOR keeps land in production and uses infrastructure that already exists.
- **F5 Water ledger / F12 drought maps.** SatAgro (€5–9/ha/yr, free for farms under 50 ha) and the free IMGW Agrometeo already do this.
- **F6 Drought evidence.** The IUNG gmina index is the _legal_ definition of drought, and arguing against it is risky in front of a state-agency jury.
- **F3 Coordination / F10 Credits.** Very original, but there is no first user or payer, and the demo would show invented neighbours.

## Best alternative: **WODA.WPOLU-style retention siting with refusal** (F4, best variant by minimax-m3.1-flash)

Choose this if the team lacks a GIS-capable person, or if the demo area's ditch layer turns out unusable after tonight's data check. It reuses about 70% of TRAKTOR's pipeline: parcel → DEM → candidates → constraint check that _refuses and relocates_ → pond sized to the deficit, with a flood-service score → dossier. It is safer to build but less distinctive.

## Most technically ambitious alternative: **ZASTOISKO + PODTOP: chronic waterlogging and ponding forecast** (F7; claude-fable-5-1 + deepseek-v4.1-flash-free)

This uses a 5-year Sentinel-1 backscatter _persistence_ map to find field zones that drown every spring. A recurring pattern is robust where single-date SAR flood mapping is not. Those zones are joined with a DEM fill-and-spill ponding forecast for the next 72 h of IMGW/Open-Meteo rain. The decision for each zone is: fix the drain, dig a pond, or stop sowing it and take the eco-scheme payment. The demo replays EMSR756 (September 2024 flood).
It is high-risk because it needs a working CDSE OAuth + Statistical API pipeline, which was not executed during verification, plus SAR preprocessing. It also has the best visual "wow".

## Conditions attached to the recommendation (non-negotiable honesty rules)

1. **Screening, not engineering.** Every number is shown as a range with its assumptions. Every site card says "wymaga wizji lokalnej" (requires a site visit).
2. **The water-law route is stated correctly.** A weir (piętrzenie) needs a pozwolenie wodnoprawne (art. 389 pkt 6). Holding water in a ditch without a structure, and rebuilding ditches to retain water, have lighter tracks (art. 395). Do not promise a "simple zgłoszenie".
3. **Refuse rather than guess.** Refuse a site when:
   - the DTM cannot resolve the channel;
   - backwater reaches a road, a building, an ISOK flood zone or a neighbour's parcel beyond the crest limit;
   - drained (tile) fields are upstream and their status is unknown. In that case the card asks for a field check instead of guessing.
4. **No invented data.** The demo area is one real gmina with real BDOT10k ditches. Any manually corrected structure is labelled "zweryfikowane ręcznie na potrzeby demo" (manually verified for the demo).
5. **The yield effect of controlled drainage in Poland is not proven** (no field yield study was found). Pitch it on water retained, outflow reduced and nitrate reduced, which are all cited, not on yield.
