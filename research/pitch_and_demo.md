# Pitch & demo: TRAKTOR

**Facts you may say on stage.** All verified, sources in `data_sources.md`:

- About **6.4 mln ha** of Polish agricultural land is drained (NIK / GUS).
- Controlled drainage cut outflow **30.5% (~71 mm)** and nitrate **33.6%** (Kęsicka et al. 2022).
- Weirs raised usable ditch storage from **23% to 41%** (Bajkowski et al. 2024).
- In 2025, IUNG flagged drought for spring cereals in **394 gminas (16%)**.
- 2024 drought aid was paid at **1,000 / 2,000 / 3,000 zł/ha**.
- KOWR manages **1.324 mln ha** of state agricultural land.
- The September 2024 flood was **Copernicus EMS activation EMSR756**.
- A weir needs a **pozwolenie wodnoprawne (art. 389 pkt 6)**.

**Do not say:** a yield increase from controlled drainage in Poland (no field evidence found); a cost per weir (not verified); "the first tool ever" (say "we found no existing tool").

Numbers marked _(demo)_ below come from our own run on the demo gmina. Replace them with the real outputs.

---

## 30-second pitch

> "Poland drained six and a half million hectares of farmland to get water _out_. Every spring those ditches export exactly the water the crop will be missing in July. TRAKTOR reads every drainage ditch in a gmina from national data, finds where a simple board would keep that water in the field, and refuses the places where it would flood a road, a house or a neighbour. Then it tells the farmer each day: hold the water, or open before the storm. It's one object for both drought and flood, built entirely on free Polish data, and KOWR, as a landowner of 1.3 million hectares, can pilot it this spring."

## 2-minute presentation

1. **(0:00–0:20) Hook.** Two photos of the same field: flooded in spring, cracked in August. "Too much, then too little, and the same ditch is responsible for both."
2. **(0:20–0:45) Insight.** "Poland already built the biggest water machine in the country: 6.4 million hectares of drainage. It's installed one way. Studies show controlled drainage keeps about 30% more water in the landscape and cuts nitrate by a third. What's missing is knowing _where_, _how high_ and _when_."
3. **(0:45–1:35) Live demo, short version.**
   - Gmina view: "1,240 points analysed, 31 suitable" _(demo)_.
   - Open one site and slide the crest; 60 cm is refused because of the neighbour's parcel.
   - Inject the storm warning: TRZYMAJ flips to OTWÓRZ.
4. **(1:35–1:50) Honesty.** "It's a screening tool: ranges, sources, the legal route (pozwolenie wodnoprawne), and a site visit before anything is built."
5. **(1:50–2:00) Ask.** "Give us one KOWR branch and its leased land. We'll index it and validate ten sites with one spółka wodna this spring."

## 5-minute presentation

| Time      | Section           | Content                                                                                                                                                                                                     |
| --------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Hook              | Two photos, one ditch. "Stop water, protect crop" taken literally.                                                                                                                                          |
| 0:30–1:15 | Problem           | 6.4 mln ha drained; 394 gminas in drought in 2025; drought aid up to 3,000 zł/ha paid _after_ the loss; the September 2024 flood (EMSR756). Both hazards hit the same system.                               |
| 1:15–1:45 | Insight           | Reversible retention on existing ditches keeps land in production, needs no new reservoir and works both ways. Cite the 30.5% outflow, 33.6% nitrate and 23→41% storage results.                            |
| 1:45–3:30 | Demo              | The three scenarios below                                                                                                                                                                                   |
| 3:30–4:00 | How it works      | National BDOT10k ditches × 1 m LiDAR × parcels × flood zones × soil drought susceptibility × IMGW and forecasts. Deterministic geometry, transparent rules, and an LLM only for explaining in plain Polish. |
| 4:00–4:30 | Why it's credible | It refuses most sites; it shows ranges; it states the water-law route; it names unknowns (subsurface drains, structure owner).                                                                              |
| 4:30–5:00 | Path and ask      | KOWR pilot on state land, then spółki wodne, gminas and ODR advisers. Ask: one OT, its parcel list and one season.                                                                                          |

## Slide structure (8 slides)

1. Title: **TRAKTOR: Rów, który pracuje w obie strony** (two photos)
2. The problem in numbers (drained area, drought gminas, aid, the 2024 flood)
3. The insight: one ditch, two directions (diagram: board in = hold, board out = release)
4. Live demo (switch to the app)
5. How it works: the data stack (logos: GUGiK, IMGW, IUNG, ISOK/Wody Polskie, Open-Meteo), "100% free public data"
6. Honest by design: the refusal list, ranges, legal route
7. Impact: per site (m³, ha rehydrated, days of buffer _(demo)_) and the gmina total _(demo)_; nitrate co-benefit
8. Path: KOWR pilot → spółki wodne → national; the ask

## Live demo script (about 1:45)

Before going on stage: fixtures mode ON, scenario `drought-aug` loaded, browser at 110%, backup video ready.

1. **Gmina view (15 s).** "This is gmina X in Kujawy. These blue lines are every drainage ditch from the national topographic database. We tested 1,240 points. Watch the counter." It drops to **31**, and reasons scroll past: road/culvert, building, flood zone, channel not visible in LiDAR, backwater leaves the channel. "Most places _cannot_ take a weir. These can."
2. **Find my field (10 s).** Type the parcel number. ULDK zooms to the parcel, and two candidate sites light up.
3. **The site (35 s).** Open site #7 and show the cross-section.
   - Slide 20 → 40 cm: the channel holds about **X m³** _(demo)_, the backwater runs **Y m**, about **Z ha** is rehydrated, and that buys roughly **N–M days** of crop water use _(demo)_.
   - Slide to 60 cm: **red**. "At 60 cm the water leaves the ditch onto parcel 0412…, which belongs to a neighbour. TRAKTOR refuses it."
4. **Order of the day (20 s).** The badge says **TRZYMAJ**. "Why?" shows KBW −86 mm, no rain in 7 days, sandy soil category I.
5. **The flip (15 s).** Switch the scenario to `storm-warning`. The IMGW heavy-rain warning appears, and the badge flips to **OTWÓRZ do czwartku 18:00** (open by Thursday 18:00), with about X m³ of capacity freed. "Same board, opposite decision. That's both halves of the campaign in one object."
6. **Site card (10 s).** Click "Karta miejsca" (site card). The printable page shows the cross-section, the parcels affected, the legal route (pozwolenie wodnoprawne, art. 389), what's missing (site visit, drainage check), and the nitrate co-benefit.

## Three demo scenarios

| #   | Scenario                            | Inputs (fixture)                                                                 | What judges see                                                                                                                          | Message                                                          |
| --- | ----------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | **August drought** (`drought-aug`)  | KBW −86 mm, 7-day forecast < 5 mm, no warnings                                   | TRZYMAJ on all accepted sites; gmina total m³ held; days of buffer                                                                       | Water kept from spring now feeds the root zone                   |
| 2   | **Storm warning** (`storm-warning`) | IMGW heavy-rain level 2 for the powiat, 42 mm in 72 h                            | Orders flip to OTWÓRZ with a deadline; freed capacity in m³; any site where opening is unsafe downstream shows NIE RUSZAJ / "skonsultuj" | The same structure protects against excess water                 |
| 3   | **The refusal** (any time)          | Crest 60 cm on site #7; plus a site next to a road and one in an ISOK flood zone | Red card; parcel ID or road named; site never offered                                                                                    | The tool is safe and honest, not a map that lights up everywhere |

## Key metrics to show

- Points analysed vs sites accepted, with refusal reasons as %
- Per site: m³ held (range), backwater length, ha rehydrated, days of buffer
- Gmina total: Σ m³ storable, Σ ha rehydrated _(demo)_
- Flood readiness: m³ freed by OTWÓRZ before the storm _(demo)_
- Literature co-benefits: −30.5% outflow, −33.6% nitrate (cited)
- Data: 7 free public sources, 0 sensors needed

## Likely jury questions with strong answers

1. **"Is this legal? Can a farmer just put a board in a ditch?"** No, and we say so on every card. A weir is a water device that needs a pozwolenie wodnoprawne (art. 389 pkt 6). Lighter routes exist for some retention changes (art. 395). Ditch maintenance falls on owners or the spółka wodna (art. 205). TRAKTOR gets the farmer to the _right_ conversation with the right site.
2. **"How accurate is a 1 m DEM for a ditch?"** Not always good enough, so we test it. If the channel isn't visible in the LiDAR profile, the site is refused as "kanał nierozpoznawalny". Every number is a range and every card requires a site visit.
3. **"Won't raising water flood buried drains or neighbours?"** The neighbour case is computed and refused. Buried drains aren't in public data, so the card flags "drenowanie podziemne: nieznane → wizja" (subsurface drainage: unknown → site visit) rather than guessing. The Wody Polskie melioration register (available on request) is our first integration after the hackathon.
4. **"Does it increase yield?"** We don't claim yield. Studies show about 30% less outflow and about a third less nitrate. Yield is what the pilot will measure.
5. **"Who operates the board?"** The landowner, or the spółka wodna if it's their device. That's why the order names the operator and has an expiry. On KOWR land there is a single owner, so a single decision.
6. **"Isn't this just SatAgro or IMGW Agrometeo?"** No. They monitor moisture. We tell you _what to change in your drainage, where, and when_, and that infrastructure exists on 6.4 mln ha.
7. **"Where is the AI?"** Where it helps: plain-language explanation of each decision in Polish, and (bonus) reading a staff gauge from a photo. The hydrology is deterministic on purpose: you can't afford a hallucinated flood.
8. **"How does it scale?"** The data is national (BDOT10k, NMT, ULDK, IMGW), so precompute runs per powiat. The cost is compute, not data licences.
9. **"Business model?"** It's a public-good tool. KOWR or Wody Polskie license it for state land and spółki; ODR advisers use it for farm plans; a paid tier serves large farms and gminas (nitrate/WFD reporting).

## Likely objections and how to address them

| Objection                               | Response                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Every team will have a retention map." | Ours refuses. Show the counter dropping, then the red card.                                                                                                  |
| "Spółki wodne are inactive."            | That's why we start on KOWR land: one owner, one decision.                                                                                                   |
| "The thresholds are made up."           | They're configurable, labelled "do kalibracji", and shown in "Dlaczego?". Calibration is pilot step one.                                                     |
| "Evaporation eats the stored water."    | It's subtracted, and the range is shown. The main effect is a higher water table in the field, not a visible pond.                                           |
| "Demo data is fake."                    | The ditches, terrain and parcels are real national data for a real gmina. The weather is a recorded real feed in demo mode, with live mode shown separately. |
