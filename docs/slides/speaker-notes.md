# TRAKTOR: speaker notes (jury pitch)

Deck: `/slides` · keys: ← → / spacja / PageUp/Down · `1`–`9`, `0` = slajd 10 · `F` pełny ekran · `P` notatki · `#3` w URL trzyma pozycję · „Zapisz jako PDF” drukuje 1 slajd na stronę.

Rules: only facts from the pitch kit. Never claim yield or cost per weir. TRZYMAJ / OTWÓRZ stay in Polish. Map data is real. Storage and hectares are screening estimates ("szacunki przesiewowe"). Weather scenarios are demo scenarios.

Numbers on the slides are computed at runtime from real data west of Bydgoszcz (Białe Błota / Sicienko; BDOT10k ditches, GUGiK NMT 1 m, ULDK parcels):
- 1 939 points on ditches → 112 safe sites. 1 522 refused because the ditch is not visible in the 1 m terrain model.
- S-007, real parcel 040307_2.0023.306/2. Max board 50 cm: 420–630 m³, backwater ~167 m, 0,8–1,4 ha. At 60 cm water spills onto the neighbour parcel .304/1: refused.
- Whole area, 112 sites: 84 100–126 100 m³, 178–296 ha.
If the data is regenerated, read the numbers off the slide.

---

## 2-minute version (~12 s per slide, demo slide skipped or 20 s)

1. **Title.** Poland already built a water machine on 6.4 million hectares. It only runs one way: out. TRAKTOR makes it run both ways.
2. **Problem.** 6.4 million hectares are drained. In 2025 drought hit 394 gminas. Drought aid comes after the loss. In September 2024, a flood. Same ditch.
3. **Insight.** One board in an existing ditch. Two states. TRZYMAJ holds water in a drought. OTWÓRZ empties the ditch before a storm.
4. **How.** Seven steps. Ditches, terrain, site checks, the board, one order a day, monitoring.
5. **Refusal.** Real ditches west of Bydgoszcz. 1 939 points. 112 safe. Most places cannot take a board. TRAKTOR says no, and says why.
6. **Demo.** Skip it, or take 20 s: open S-007, raise the board to 60 cm, show the refusal.
7. **Flip.** Same board. KBW minus 86 mm: TRZYMAJ. IMGW level-2 warning, 42 mm in 72 hours: OTWÓRZ, with a deadline.
8. **Data.** Seven free public datasets. Ranges. A reason for every refusal. The water-law permit and a site visit on every card. The language model only explains.
9. **Impact.** One site holds 420 to 630 m³. A screening estimate. Field studies: 30.5% less outflow, a third less nitrate.
10. **Ask.** Give us one KOWR branch and its leased land. We'll index it and validate ten sites with one spółka wodna this spring.

## 5-minute version (~25–40 s per slide, demo ~1:45)

1. **Title.** Poland already built a water machine on 6.4 million hectares of drained farmland. It only runs one way: out. TRAKTOR makes it run both ways. Let the land hold its water. Niech ziemia zatrzyma swoją wodę.
2. **Problem.** About 6.4 million hectares are drained. That's NIK and GUS. In 2025 IUNG flagged drought for spring cereals in 394 gminas. That's 16 percent. Drought aid, up to 3 000 zł per hectare, comes after the loss. In September 2024 the country flooded: Copernicus EMSR756. Too much water, then too little. Same ditch.
3. **Insight.** The idea is small on purpose. One wooden board in a ditch that already exists. Two states. TRZYMAJ keeps water near the roots in a drought. OTWÓRZ empties the ditch before a storm. Click the tile. Watch the level.
4. **How it works.** Seven steps. We take every ditch from BDOT10k. We read the terrain from 1 m LiDAR. We score each point and run the safety checks. Then we say where the board goes. And we give one plain order a day: TRZYMAJ or OTWÓRZ.
5. **The refusal.** This is the key slide. These are real ditches west of Bydgoszcz, in Białe Błota and Sicienko. We test 1 939 points. 112 are safe. Every other point has a named reason. Most often the ditch doesn't show in the 1 m terrain model, so we don't guess. Others: water on a neighbour's parcel, a flood zone, a slope too steep, a road or culvert. Most places cannot take a board. TRAKTOR says no, and says why.
6. **Demo (~1:45).** The real map west of Bydgoszcz. Every BDOT10k ditch. 1 939 points, 112 safe sites. Search a parcel: its sites light up. Open S-007, on real parcel 040307_2.0023.306/2. Raise the board from 20 to 40 cm. Watch m³, backwater, hectares and days of buffer. At 60 cm it turns red: water reaches the neighbour parcel .304/1. Refused. The order says TRZYMAJ. "Dlaczego?" shows KBW −86 mm, no rain, soil class I. Switch to the storm warning: OTWÓRZ, with a deadline and the m³ it frees. Finish on the printable site card: the legal route and "Wymaga wizji lokalnej".
7. **The flip.** Same site, same board, two demo scenarios. Drought: climatic water balance −86 mm over 60 days. Rule R4: TRZYMAJ. Storm: IMGW level-2 warning and 42 mm in 72 hours. Rule R1: OTWÓRZ before the warning starts. That frees 420 to 630 m³. Each order comes from a rule with a threshold. The thresholds still need calibration.
8. **Data and honesty.** Seven free public sources: BDOT10k, NMT LiDAR 1 m from GUGiK, ULDK, IMGW, Open-Meteo, ISOK, IUNG. Storage and hectares are screening estimates, always shown as a range. Every refusal has a reason. Every card names the water-law permit, article 389 point 6. Every card says a site visit is required. Geometry and rules are deterministic: you can't afford a hallucinated flood. The language model only rewrites results in plain Polish. It doesn't change the numbers.
9. **Impact.** S-007 at 50 cm holds 420 to 630 m³ in the ditch and rewets 0.8 to 1.4 hectares. All 112 sites: 84 100 to 126 100 m³. These are screening estimates. The published studies: controlled drainage cut outflow by 30.5 percent and nitrate by 33.6 percent. Weirs raised usable ditch storage from 23 to 41 percent. We don't claim yield. The pilot will measure it.
10. **Path and ask.** Start where one owner makes one decision. KOWR manages 1.324 million hectares. Then the spółki wodne, who already maintain the ditches. Then the whole country, computed for each powiat. Our ask: give us one KOWR branch and its leased land. We'll index it and validate ten sites with one spółka wodna this spring.

## Jury Q&A, short answers
- **Legal?** A farmer can't just drop a board in. Every card states the permit route (art. 389 pkt 6).
- **Is 1 m DTM accurate?** Not always. So we test it and refuse "rów niewidoczny w NMT". Here that's 1 522 of 1 939 points.
- **Neighbours / buried drains?** Neighbour flooding is computed and refused. Buried drains are flagged for the site visit.
- **Yield?** Not claimed. The pilot measures it.
- **Who operates?** The owner or the spółka wodna. On KOWR land, one owner means one decision.
- **vs SatAgro / Agrometeo?** They monitor moisture. We tell you what to change in your drainage, where and when.
