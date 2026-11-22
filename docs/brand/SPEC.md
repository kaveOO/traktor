# TRAKTOR Brand Guidelines 1.0: authoritative spec

Source: the exported artifact "TRAKTOR Brand Guidelines" (16 pages), unpacked on 22.11.2026.
Original export: `docs/brand/brand-guidelines.html` (not committed, 10.9 MB). Per-page HTML with the original SVG artwork: `docs/brand/pages/NN-*.html`; open them in a browser to see each page.
This file wins over `.opencode/skills/traktor-brand/SKILL.md` where they differ.

Tagline: **Let the land hold its water. / Niech ziemia zatrzyma swoją wodę.**
Big line: **The future of water is already in the field.**
Values: **Grounded · Reversible · Precise.**

## 01 Brand idea
Poland already has a dense network of agricultural drainage ditches. TRAKTOR adds a small wooden board and a clear rule: hold water when the land is dry, open the ditch before a storm. No new infrastructure.

## 02 Logo
A square of soil with a ditch cut into it and a board across the top; the empty space is the T. Use `components/brand/Logo` only.
- Lockups: primary (default wherever there is width), stacked (square/portrait), mark (boards, stickers, icons), wordmark (when the mark is already nearby).
- Clear space: x = the board height (3/16 of the mark) on every side.
- Minimum: mark 16 px on screen / 6 mm print; lockup 120 px / 32 mm.
- Colourways: cream on forest (primary dark), forest on cream (primary light), cream on soil. On the dark field pattern: cream, top left. On the colour pattern: always inside a forest block.
- Misuse (never): re-type the wordmark, rearrange mark and wordmark, stretch, recolour outside the palette, shadows or glows, outline or fill the T, place directly on busy pattern.

## 03 Colour
| Name | Hex | Use |
|---|---|---|
| Forest green | #1F3A22 | primary text, dark grounds |
| Warm cream | #F3ECDD | primary light ground |
| Cream deep | #EFE6D3 | panels |
| Agricultural green | #4F7A3A | accent, safe site |
| Soil brown | #6B4A2E | secondary accent |
| Muted sky | #A9BFCF | atmosphere (counts as a ground) |
| Water blue | #3B7FA3 | water, data, OTWÓRZ |
| Terracotta | #B5573B | rejected site, warnings only |

- Ratio: cream 50 · forest 25 · greens and soil 15 · water and terracotta 10. Terracotta never decorates.
- Accessible pairs (WCAG 2.2): forest/cream 10.6:1 AAA both ways; forest on sky 6.5:1 AA; cream on soil 6.8:1 AA; cream on agri 4.3:1, cream on terracotta 4.1:1, cream on water 3.8:1 are **AA large only** (24 px+, or 19 px+ bold). For small text on/in water use `water-ink` #2E6585 (repo token).
- Elevation tints, low → high: #2F5F73 · #8FA86A · #C9BF86 · #B98D5F · #EFE6D3.

## 04 Typography
- **Archivo** headlines: ExtraBold, ~78% width (`font-stretch: 78%`, needs the variable `wdth` axis), UPPERCASE, leading 0.92–0.98. Subheads: Bold, ~85% width, sentence case.
- **Inter** body and UI: Regular and Medium, 16–20 px, line height 1.45–1.5. **Tabular figures for all data** (`font-variant-numeric: tabular-nums`).
- Scale: Display Archivo ExtraBold 78% 96/0.92 · H1 ExtraBold 78% 64/0.94 · H2 Bold 85% 40/1.1 · H3 Bold 85% 26/1.15 · Body Inter 18/1.5 · Caption Inter 12/1.45 · Data label Inter SemiBold 11, +14% tracking, tabular.
- The wordmark is artwork, never typed.

## 05 Imagery
**Fields from above.** The main image is the land itself, drawn as strip fields seen from the air.
- Strips follow the land: drawn from real parcel shapes (long, narrow Polish strip fields) at the angle they lie.
- One ditch, drawn straight: a single water-blue line crosses the strips. Never curved, never more than one.
- The board is a cream tick: a short cream bar across the ditch marks the board. It is the only detail.
- **Flat colour only.** Palette colours, hairline field boundaries. **No texture, gradient, shading or 3D.**
- Photography: commissioned only (the ditch at golden hour from the bank, horizon high; the board in its steel frame, water on both sides; a farmer's hands on the board; a dirt track with a grass strip and birches; the tractor side-on, some mud, no brand livery). No stock, no renders presented as photos.

## 06 Data and GIS
Clean, map-like, calm.
- Contours: cream, major every 1 m. Ditch network (BDOT10k): water blue. Retention zone: water blue at 28%. Safe site: agri. Rejected site: terracotta.
- No hillshade drama, glow or 3D tilt in maps. Labels in Inter, values tabular, **a source line on every map**.
- Data card pattern: `Site [ID] · Accepted` / `Retention [m³]` / `Slope [%] · Ditch length [m]` / `Source: BDOT10k; LiDAR DTM 1 m (GUGiK)`.

## 07 The two states (TRZYMAJ / OTWÓRZ)
A reusable pair of tiles; exactly one is active (click to switch). TRZYMAJ and OTWÓRZ stay in Polish in every language.
- TRZYMAJ: "Zatrzymaj wodę w czasie suszy". OTWÓRZ: "Wypuść wodę przed prognozowaną burzą".
- Active TRZYMAJ: forest fill, cream text. Active OTWÓRZ: water-blue fill, cream text. Inactive: 2 px outline in the state colour.
- Shape: 4 px radius, 36 px padding. 400 ms colour change; nothing else moves.

## 08 Iconography
Drawn like a field survey: 24 px grid, 2 px stroke, rounded caps and joins, no fills. Set: ditch, board, water level, drought, storm forecast, LiDAR scan, map pin, tractor. Never emoji. Use `components/brand/Icon`.

## 09 UI elements
- Buttons: **primary = cream fill, forest text, 2 px radius** (inverted on cream: forest fill, cream text). **Secondary = 1.5 px outline.** **48 px min height.**
- Card: cream at 94% over imagery, 4 px radius, shadow `0 8px 24px rgba(31,58,34,.18)`, 24 px padding.
- Progress rail: steps 01–07. Done: filled. Current: filled with a soft ring. To do: outline.

## 10 Motion
Move like a camera: slow, scroll-driven, flat. Everything respects `prefers-reduced-motion`.
- Slow drift: the field pattern pans slowly across the frame, tied to scroll. 10–14 s, ease-in-out, scale ≤ 1.15.
- Text fades and rises: headlines fade in while rising 16 px. Never letter by letter. 600 ms, `cubic-bezier(.2,.7,.2,1)`.
- Water rises smoothly: level changes are continuous, 1.2–2 s, ease-in-out, no overshoot.
- **Never:** spinning loaders, flashing, springs/bounce, glows. **Loading = one thin progress line.**

## 11 Applications
One system everywhere: a forest or cream block for words, a field pattern for image, the square mark wherever the board itself appears. Website hero reference: 1440 × 810, headline "The future of water is already in the field." with buttons [primary] [secondary].

## 12 Tone of voice
**Short. Plain. Sure.** Write like a good agronomist talks: one idea per sentence, concrete nouns, numbers over adjectives. Say what the board does, not what the technology is.
- "To miejsce jest bezpieczne. Tu montujemy." / "To miejsce jest zbyt ryzykowne. Tu nie budujemy." / "Prognoza burzy. Przełącz na OTWÓRZ." / "Jedna zastawka. Dwa tryby."
- Say "zastawka / board", not "smart water-control module"; "trzymać wodę", not "optimise hydrological retention capacity"; "bezpieczne / odrzucone miejsce", not "AI-validated opportunity zone"; "przed burzą", not "proactively, ahead of extreme weather events".
