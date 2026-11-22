# Product blueprint: TRAKTOR

## 1. Product identity

|                       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**              | **TRAKTOR** (working name; previously PRÓG). Short, farm-native and instantly recognisable to the target user. It deliberately avoids "Zastawka", which 8 of 40 models chose independently, so rival teams may use it.                                                                                                                                                                                                                                                                                                                     |
| **Tagline (PL)**      | _Rów, który pracuje w obie strony._                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Tagline (EN)**      | _The ditch that works both ways._                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Elevator pitch**    | Poland drained 6.4 million hectares of farmland to get water out fast. Now the same fields run dry in July. TRAKTOR reads every melioration ditch in a gmina from national data, finds where a simple board would keep water in the landscape, refuses the places where it would flood a road, a house or a neighbour, and tells the farmer each day whether to hold the water or release it before a storm. The output is a site card a farmer, a spółka wodna or KOWR can act on this season. |
| **Problem statement** | Polish drainage infrastructure is designed one way: remove water. Each spring it exports exactly the water the crop will lack in summer. The same ditch, managed differently, could hold that water and still release it before floods. No tool tells a farmer _which_ ditch segment, _how high_, _when to open_, and _what not to touch_.                                                                                                                                                   |
| **Target audience**   | **Primary:** farmers with drained land in the drought belt (Kujawy, Wielkopolska, Mazowsze), especially KOWR tenants and larger farms. **Operators:** spółki wodne and gmina staff. **Institutional:** KOWR regional branches (OT) as landlord and pilot sponsor, plus ODR advisers.                                                                                                                                                                                                         |
| **USP**               | (1) It uses infrastructure that already exists and keeps land in production, unlike ponds. (2) The same object serves drought and flood, reversibly. (3) It is honest by design: it refuses unsafe sites, shows ranges and states the legal route. (4) It is built entirely on free national data: BDOT10k, NMT, ULDK, ISOK, IUNG, IMGW.                                                                                                                                                     |

## 2. User journey

### 2.1 Opening the app (gmina view)

- The map is centred on the demo gmina, over an orthophoto or OSM basemap.
- All BDOT10k melioration ditches are drawn as thin blue lines.
- A top banner shows the **current situation**:
  - 60-day climatic water balance (KBW, P−ET₀) for the gmina;
  - the IUNG soil drought-susceptibility category mix;
  - any active IMGW meteo or hydro warning.
- A big counter shows **"Przeanalizowano 1 240 punktów na rowach → 31 nadaje się na próg"** (1,240 points on ditches analysed → 31 suitable for a weir), illustrative numbers.
- A refusal breakdown chart lists the reasons: road or culvert nearby, building, ISOK flood zone, channel not resolvable in LiDAR, backwater leaves the channel, neighbour's parcel affected, slope too steep.

### 2.2 Finding my field

- The farmer types a parcel number or taps the map. ULDK returns the parcel geometry.
- The view zooms to the parcel and highlights the ditches bordering it and the candidate weirs that would raise water near it.

### 2.3 One site (the core screen)

- **Cross-section and long profile** of the ditch, with the water surface drawn at the chosen crest height.
- **Crest slider: 20 / 30 / 40 / 50 / 60 cm.** For each height:
  - **Channel storage:** m³ (deterministic from the DTM), minus an evaporation estimate.
  - **Backwater length:** m.
  - **Rehydration zone:** ha of field where the groundwater could rise into the root zone (screening band, shown as a range).
  - **Days of buffer:** stored mm ÷ current ET₀, shown as a range.
  - **Outflow avoided per season:** literature-based range (controlled drainage −30% outflow, Kęsicka 2022).
- **Refusal behaviour.** If a height pushes water out of the channel onto a road, a building or a _neighbour's_ parcel, the card turns red and that height is **refused**, with the parcel ID shown. The tool does not merely warn.
- **Uncertainty strip:**
  - "Kanał rozpoznany w NMT: TAK / NIE" (channel resolved in the DTM)
  - "Drenowanie podziemne powyżej: NIEZNANE → wymaga wizji" (subsurface drainage upstream: UNKNOWN → requires a site visit)
  - "Własność urządzenia: do potwierdzenia" (owner of the structure: to be confirmed)

### 2.4 The order of the day (decision)

For every accepted site, one of three orders is shown with a date, a reason and an expiry:

- **TRZYMAJ** (hold). Example: "KBW −86 mm, brak opadów w prognozie 7 dni, gleba kat. I" (no rain forecast for 7 days, soil category I).
- **OTWÓRZ** (open). Example: "IMGW: ostrzeżenie o intensywnych opadach st. 2 dla powiatu; prognoza 42 mm/72 h. Otwórz do czwartku 18:00, aby zwolnić pojemność" (heavy-rain warning level 2 for the powiat, 42 mm forecast in 72 h; open by Thursday 18:00 to free capacity).
- **NIE RUSZAJ** (leave as is). Example: "warunki neutralne" (neutral conditions).

Each order has a **"Dlaczego?"** (Why?) button. It shows the inputs, the rule that fired and the thresholds, which are marked "do kalibracji" (to be calibrated).

### 2.5 Site card (artefact)

A one-page printable card (PL) with:

- map, cross-section and chosen crest;
- metrics with ranges;
- affected cadastral parcel IDs (from ULDK);
- **legal route:** a weir needs a _pozwolenie wodnoprawne_ (art. 389 pkt 6 Prawo wodne). Lighter routes are noted where they apply (art. 395);
- who maintains the ditch (art. 205: owners / spółka wodna);
- an honest list of what is still missing (site visit, survey, operat);
- co-benefit: nitrate outflow reduction (−34% in the cited study).

### 2.6 KOWR mode (pitch closer)

A toggle filters to parcels where KOWR is the landowner. These sites carry the label "decyzja jednego właściciela" (single-owner decision). The KOWR parcel list is **not verified as public data**. The demo uses an illustrative overlay, clearly labelled, and the pitch ask is to receive the real list for a pilot.

## 3. Decisions the farmer can make

1. Which ditch segment to put a weir on, and at what height. Or none: refusal is a valid outcome.
2. When to hold and when to release (daily order).
3. Whether to start the formal route: contact the spółka wodna or neighbours, ask an ODR adviser, or begin a pozwolenie wodnoprawne.
4. Whether to apply for support: regional small-retention grants (up to 100k PLN in 2026 in some voivodeships) and the ekoschemat for water retention on permanent grassland (245.98 zł/ha in 2025). These are VERIFIED facts. Eligibility for any specific site is **not** claimed.

## 4. How recommendations are explained

- Every number shows its **source**: BDOT10k, NMT, IMGW, Open-Meteo, IUNG or ISOK, with a timestamp.
- Every number is either **deterministic** (geometry), **literature-based** (with citation) or **assumption** (labelled and configurable).
- Every order shows the **rule** that produced it.
- Every refusal shows the **specific object** that caused it: road ID, building, flood polygon or parcel ID.
- Optional plain-language Polish summary, generated by an LLM from the structured JSON. Numbers are inserted programmatically and never generated by the model (see technical_architecture.md §5).

## 5. Measurable value

| Metric                                                             | Type                                                  | Shown as                 |
| ------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------ |
| m³ held in the channel per site                                    | Deterministic (DTM)                                   | Value ± DTM uncertainty  |
| Equivalent mm over the rehydration zone, and "days of ET₀ covered" | Derived                                               | Range                    |
| Seasonal outflow avoided                                           | Literature (−30.5%, ~71 mm in the Kęsicka 2022 study) | Range, with citation     |
| Nitrate export avoided                                             | Literature (−33.6%)                                   | Qualitative or %         |
| Sites refused, and why                                             | Deterministic                                         | Count + reason breakdown |
| Gmina-wide potential: Σ m³ over accepted sites                     | Deterministic                                         | Single headline number   |
| Flood readiness: capacity freed by OTWÓRZ before a storm           | Deterministic                                         | m³                       |

**Not claimed:** yield increase in tonnes per hectare (no Polish field evidence was found), or the cost per site (to be obtained from a spółka or contractor).

## 6. Scope boundaries

- **MVP:** one gmina, precomputed; live forecast, warnings and parcel lookup; site card; three demo scenarios.
- **Bonus:**
  - ŁATA: a photo of a painted staff gauge, read by a vision model, to confirm the water level;
  - Sentinel-1 wet-persistence check per segment;
  - SMS or email of the daily order.
- **Out of scope:** hardware or gate actuation, credit markets, insurance claims, multi-user voting, national coverage.
