---
name: TRAKTOR Brand
description: TRAKTOR visual identity and copy rules (colours, type, logo, icons, state tiles, motion, map style, tone of voice). Load before building or reviewing any TRAKTOR UI, slide, card or graphic.
---

# TRAKTOR brand (from "TRAKTOR Brand Guidelines 1.0")

Tagline: **Let the land hold its water.** / **Niech ziemia zatrzyma swoją wodę.**
Idea: one wooden board in an existing drainage ditch, two states. Grounded · Reversible · Precise.

## Use the shared components. Never re-implement them.
All in `web/src/components/brand/`:
- `Logo` (primary lockup, props `height`, `color: "forest"|"cream"`), `LogoSymbol`. The wordmark is artwork: **never type "TRAKTOR" in a font as a logo**. Min lockup 110 px wide, symbol 24 px.
- `Icon name="ditch|board|water|drought|storm|lidar|pin|tractor"`: 24 px grid, 2 px stroke, no fills. **Never emoji.**
- `Button` (`variant primary|secondary`, `tone onForest|onCream`, `href`), `Eyebrow`, `Card`, `StatusChip`, `ProgressLine`, `ProgressRail`, `SourceLine` in `ui.tsx`.
- `StateTiles` (TRZYMAJ/OTWÓRZ pair) and `OrderBadge` (incl. NIE RUSZAJ) in `StateTiles.tsx`.
- `PointCloud`: LiDAR point-cloud canvas for heroes (prop `water` 0..1 rises smoothly).

## Colour (Tailwind classes exist for each)
| Token | Hex | Use |
|---|---|---|
| `forest` | #1F3A22 | primary text, dark grounds |
| `cream` | #F3ECDD | primary light ground |
| `cream-deep` | #EFE6D3 | panels |
| `agri` | #4F7A3A | accent, **safe/accepted site** |
| `soil` | #6B4A2E | secondary accent |
| `sky` | #A9BFCF | atmosphere (counts as a ground) |
| `water` | #3B7FA3 | water, data, **OTWÓRZ** |
| `terra` | #B5573B | **rejected site / warnings only, never decoration** |
Ratio: cream 50 · forest 25 · greens+soil 15 · water+terracotta 10.
Elevation tints low→high: `elev-1` #2F5F73, `elev-2` #8FA86A, `elev-3` #C9BF86, `elev-4` #B98D5F, `elev-5` #EFE6D3.
Cream text on agri/terra/water only at ≥24 px or ≥19 px bold.

## Type
- `.hd`: Archivo ExtraBold, 78% width, UPPERCASE, leading 0.93. Display 96, H1 64.
- `.sh`: Archivo Bold 85% width, sentence case. H2 40/1.1, H3 26/1.15.
- Body: Inter 16–20 px, line height 1.45–1.5. Caption Inter 12.
- `.eb`: data label / eyebrow, Inter SemiBold 11, +14% tracking, uppercase.
- `.num`: tabular figures for **all** data.

## Components spec
- Buttons: primary = cream fill + forest text on forest (inverted on cream), 2 px radius, min height 48 px. Secondary = 1.5 px outline. Hover darkens 6%.
- Card: cream 94% over imagery, 4 px radius, shadow `0 8px 24px rgba(31,58,34,.18)`, 24 px padding.
- State tiles: exactly one active. Active TRZYMAJ = forest fill, cream text. Active OTWÓRZ = water fill, cream text. Inactive = 2 px outline in state colour. 4 px radius. 400 ms colour change, nothing else moves. **TRZYMAJ / OTWÓRZ never translated.**
- Progress rail 01–07: Sieć rowów · Teren LiDAR · Ocena miejsc · Kontrola bezpieczeństwa · Montaż zastawki · TRZYMAJ/OTWÓRZ · Monitoring.
- Site card label pattern: `SITE [ID] · ACCEPTED`, then segment name, then `Board height [cm] · Retention [m³] · Upstream fields [ha]`.

## Maps: "clean, map-like, calm"
Elevation tint bands, cream contours (major every 1 m), ditch network in water blue, retention zone = water blue 28% opacity, safe site = agri green dot, rejected = terracotta dot. **No hillshade drama, glow or 3D tilt.** Labels in Inter, values tabular, **a source line on every map** (`SourceLine`).

## Motion: "move like a camera"
Slow push-ins 8–12 s, scale ≤ 1.12. Headlines fade in rising 16 px, 600 ms, `cubic-bezier(.2,.7,.2,1)` (class `rise`), never letter by letter. Water level changes 1.2–2 s ease-in-out, no overshoot. **Never:** spinners, flashing, bounce/springs, glows. Loading = one thin progress line. Respect reduced motion.

## Layout system
Forest or cream ground, our own LiDAR imagery or documentary photography, condensed caps, **one idea per surface**. Footer line on every page: "Let the land hold its water." Page chrome: small logo top-left, section eyebrow like `02 — BRAND IDEA`.

## Imagery
Use `PointCloud` or plain colour. No stock or AI-generated photos, no drones at sunset, neon, cartoon tractors or manufacturer colours.

## Tone of voice: short, plain, sure
Write like a good agronomist talks: one idea per sentence, concrete nouns, numbers over adjectives.
| Say | Not |
|---|---|
| zastawka / board | smart water-control module |
| zatrzymaj wodę / hold water | optimise hydrological retention capacity |
| miejsce bezpieczne / odrzucone (safe / rejected site) | AI-validated opportunity zone |
| przed burzą / before a storm | proactively, ahead of extreme weather events |
Examples: "To miejsce jest bezpieczne. Tu montujemy." · "To miejsce jest zbyt ryzykowne. Tu nie budujemy." · "Prognoza burzy. Przełącz na OTWÓRZ." UI language is Polish.
