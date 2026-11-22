---
name: TRAKTOR Pitch
description: Facts, claims policy, demo script and jury Q&A for the TRAKTOR hackathon pitch. Load before writing slides, landing copy, speaker notes or any public claim.
---

# TRAKTOR pitch kit

Challenge: KOWR "Zatrzymaj wodę, chroń plony", HackNation 2026, Bydgoszcz.

## Facts you may state (verified; sources in research/data_sources.md)
- ~**6,4 mln ha** of Polish farmland is drained (NIK/GUS).
- Controlled drainage: **−30,5% outflow (~71 mm)**, **−33,6% nitrate** (Kęsicka et al. 2022, PLoS ONE).
- Weirs raised usable ditch storage **23% → 41%** (Bajkowski et al. 2024, JWLD).
- 2025: IUNG flagged drought for spring cereals in **394 gminas (16%)**.
- 2024 drought aid: **1 000 / 2 000 / 3 000 zł/ha**, paid after the loss.
- KOWR manages **ok. 1,4 mln ha** of state farmland (official task description; gov.pl gave 1,324 mln ha on 28.11.2025 — on stage say "ok. 1,4 mln ha").
- September 2024 flood = Copernicus EMS **EMSR756**.
- A weir needs a **pozwolenie wodnoprawne (art. 389 pkt 6 Prawa wodnego)**; maintenance by owners / spółka wodna (art. 205).

## Never say
Yield increase from controlled drainage in Poland · cost per weir · "first tool ever" (say "we found no existing tool") · "AI-validated" anything. Map numbers are real (BDOT10k + NMT 1 m + ULDK, west of Bydgoszcz); storage, hectares and days of buffer are "szacunki przesiewowe" (screening estimates); weather scenarios are labelled "scenariusz demonstracyjny".

## One-liners
- "Poland already built a water machine on 6.4 million hectares. It only runs one way: out. TRAKTOR makes it run both ways."
- "One board. Two states." / "Jedna zastawka. Dwa tryby."
- "Most places cannot take a board. TRAKTOR says no, and says why."

## Demo script (~1:45)
1. Real map west of Bydgoszcz (Białe Błota / Sicienko): every BDOT10k ditch; counter 1 939 points → 112 safe (real BDOT10k + NMT 1 m + ULDK; storage is a screening estimate).
2. Search a parcel → sites light up.
3. Open S-007: slide 20→40 cm (m³, backwater, ha, days of buffer); 60 cm → red: neighbour's parcel. Refused.
4. Order: TRZYMAJ, "Dlaczego?" → KBW −86 mm, no rain, soil cat. I.
5. Switch scenario to storm warning → OTWÓRZ with deadline and m³ freed.
6. Site card: printable, legal route, "Wymaga wizji lokalnej".

## Where AI is
Geometry and rules are deterministic on purpose ("you can't afford a hallucinated flood"). Forecasts come from IMGW/Open-Meteo. An LLM only rewrites structured results into plain Polish, with a number guard. ML comes after the pilot, once there are field labels.

## The ask
"Give us one KOWR branch and its leased land. We'll index it and validate ten sites with one spółka wodna this spring."

## Jury Q&A (short answers)
- Legal? No, a farmer can't just drop a board in: every card states the permit route.
- 1 m DTM accurate? Not always, so we test it and refuse "rów niewidoczny w NMT".
- Neighbours/buried drains? Neighbour flooding is computed and refused; buried drains are flagged for a site visit.
- Yield? Not claimed; the pilot measures it.
- Who operates? Owner or spółka; on KOWR land one owner = one decision.
- vs SatAgro/Agrometeo? They monitor moisture. We tell you what to change in your drainage, where and when.
- Scale? National data (BDOT10k, NMT, ULDK, IMGW): precompute per powiat; cost is compute, not licences.
