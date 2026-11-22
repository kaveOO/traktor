# TRAKTOR: speaker notes (jury pitch)

Deck: `/slides` · keys: ← → / spacja / PageUp/Down · `1`–`9`, `0` = slajd 10 · `F` pełny ekran · `P` notatki · `#3` w URL trzyma pozycję · „Zapisz jako PDF” drukuje 1 slajd na stronę.

Rules: only facts from the pitch kit. Demo numbers are always "dane demonstracyjne". Never claim yield or cost per weir. TRZYMAJ / OTWÓRZ stay in Polish.

Demo numbers (from `summary` and S-007 in `web/src/lib/traktor/mock.ts`): 1 239 points analysed → 31 safe sites; S-007 max board 50 cm (60 cm refused: neighbour's parcel), 930–1 400 m³, ~385 m backwater, 1,9–3,2 ha; gmina total 29 300–43 900 m³, 53–88 ha. Note: the mock has 1 239 points, not 1 240. Say "about twelve hundred" or read the number off the slide.

---

## 2-minute version (~12 s per slide, demo slide skipped or 20 s)

1. **Title.** Poland already built a water machine on 6.4 million hectares. It only runs one way: out. TRAKTOR makes it run both ways.
2. **Problem.** 6.4 million hectares drained. In 2025 drought hit 394 gminas. Drought aid comes after the loss. A year earlier, the September flood. Same ditch.
3. **Insight.** One board in an existing ditch. Two states. TRZYMAJ holds water in drought. OTWÓRZ frees the ditch before a storm.
4. **How.** Seven steps: ditch network, LiDAR terrain, site scoring, safety checks, the board, the weekly order, monitoring.
5. **Refusal.** In our demo gmina: about twelve hundred points, thirty-one safe. Most places cannot take a board. TRAKTOR says no, and says why.
6. **Demo.** (Skip in the 2-minute version, or 20 s: open S-007, push the board to 60 cm, show the refusal.)
7. **Flip.** Same board. KBW minus 86 millimetres: TRZYMAJ. IMGW level-2 warning, 42 mm in 72 hours: OTWÓRZ, with a deadline.
8. **Data.** Seven free public datasets. Ranges, refusals, the water-law permit, a site visit on every card. The LLM only explains.
9. **Impact.** One site holds 930 to 1 400 m³, demo data. Field studies show 30.5% less outflow and a third less nitrate.
10. **Ask.** Give us one KOWR branch and its leased land. We'll index it and validate ten sites with one spółka wodna this spring.

## 5-minute version (~25–40 s per slide, demo ~1:45)

1. **Title.** Poland already built a water machine on 6.4 million hectares of drained farmland. It only runs one way: out. TRAKTOR makes it run both ways. Let the land hold its water: niech ziemia zatrzyma swoją wodę.
2. **Problem.** About 6.4 million hectares are drained (NIK/GUS). In 2025 IUNG flagged drought for spring cereals in 394 gminas, 16 percent. Drought aid, up to 3 000 zł per hectare, is paid after the loss. In September 2024 the same country flooded: Copernicus EMSR756. Too much, then too little, and it's the same ditch.
3. **Insight.** Our idea is small on purpose: one wooden board in a ditch that already exists. Two states. TRZYMAJ keeps water near the roots in drought. OTWÓRZ empties the ditch before a forecast storm. Click the tile and watch the level change.
4. **How it works.** Seven steps. We take every ditch from BDOT10k, read the terrain from 1 m LiDAR, score each point, run safety checks, then say where a board goes, and give one plain order: TRZYMAJ or OTWÓRZ. Grounded, reversible, precise.
5. **The refusal.** This is the most important slide. In our demo gmina we test about twelve hundred points on the ditches. Thirty-one are safe. The rest are refused, each with a named reason: slope too steep, water on a neighbour's parcel, a road or culvert, a flood zone, a ditch the terrain model can't see. Most places cannot take a board. TRAKTOR says no, and says why.
6. **Demo (~1:45).** Map of Gmina Kruszwica, every ditch, 31 safe sites (demo data). Search a parcel and its sites light up. Open S-007: raise the board from 20 to 40 cm and watch m³, backwater, hectares and days of buffer. At 60 cm it turns red: the neighbour's parcel. Refused. The order says TRZYMAJ; "Dlaczego?" shows KBW −86 mm, no rain, soil class I. Switch to the storm warning: OTWÓRZ, with a deadline and the m³ it frees. Finish on the printable site card: legal route, "Wymaga wizji lokalnej".
7. **The flip.** Same site, same board, two scenarios. Drought: climatic water balance −86 mm over 60 days, rule R4, TRZYMAJ. Storm: IMGW level-2 warning and 42 mm in 72 hours, rule R1, OTWÓRZ before the warning starts, freeing 930 to 1 400 m³. Rules with thresholds, not guesses, and thresholds are marked for calibration.
8. **Data and honesty.** Seven free public sources: BDOT10k, NMT LiDAR 1 m from GUGiK, ULDK, IMGW, Open-Meteo, ISOK, IUNG. Honest by design: ranges not single numbers, every refusal explained, every card names the water-law permit, article 389 point 6, and says a site visit is required. Geometry and rules are deterministic: you can't afford a hallucinated flood. The language model only rewrites results into plain Polish.
9. **Impact.** For S-007 at 50 cm: 930 to 1 400 m³ held in the ditch and 1.9 to 3.2 hectares rewetted. Across the demo gmina: 29 300 to 43 900 m³. These are demo numbers. What's published: controlled drainage cut outflow by 30.5 percent and nitrate by 33.6 percent, and weirs raised usable ditch storage from 23 to 41 percent. We don't claim yield; the pilot will measure it.
10. **Path and ask.** Start where one owner makes one decision: KOWR manages 1.324 million hectares. Then spółki wodne, who already maintain the ditches. Then the country, precomputed per powiat. Our ask: give us one KOWR branch and its leased land. We'll index it and validate ten sites with one spółka wodna this spring.

## Jury Q&A, short answers
- **Legal?** A farmer can't just drop a board in. Every card states the permit route (art. 389 pkt 6).
- **Is 1 m DTM accurate?** Not always, so we test it and refuse "rów niewidoczny w NMT".
- **Neighbours / buried drains?** Neighbour flooding is computed and refused. Buried drains are flagged for the site visit.
- **Yield?** Not claimed. The pilot measures it.
- **Who operates?** The owner or the spółka wodna. On KOWR land, one owner means one decision.
- **vs SatAgro / Agrometeo?** They monitor moisture. We tell you what to change in your drainage, where and when.
