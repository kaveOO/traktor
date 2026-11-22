---
name: TRAKTOR Brand
description: TRAKTOR visual identity and copy rules (colours, type, logo, icons, state tiles, motion, map style, tone of voice). Load before building or reviewing any TRAKTOR UI, slide, card or graphic.
---

# TRAKTOR brand (Guidelines 1.0)

**Source of truth: `docs/brand/SPEC.md`** (unpacked from the real artifact) plus the original artwork in
`docs/brand/pages/NN-*.html` (inline SVGs: logo, icons, buttons, rail). **SPEC wins over this file.**

Tagline: **Let the land hold its water.** / **Niech ziemia zatrzyma swoją wodę.**
Idea: one wooden board in an existing drainage ditch, two states. Grounded · Reversible · Precise.

## Use the shared components. Never re-implement them.
All in `web/src/components/brand/` (most also re-exported from `ui.tsx`):
- `Logo` (props `height`, `color: "forest"|"cream"`, `lockup: "primary"|"stacked"|"wordmark"`), `LogoMark` (square mark, `size`, optional `title`), `LogoSymbol` (deprecated alias of LogoMark). 1.0 artwork: a soil square with the ditch cut and the board on top; the empty space is the T. **Never type "TRAKTOR" as a logo.** Min: lockup 120 px wide, mark 16 px (enforced). Clear space = `LOGO_CLEAR_SPACE` (3/16) × mark size. Colourways: cream on forest, forest on cream, cream on soil. Never on busy pattern: on the dark field pattern cream top-left; on the colour pattern inside a forest block.
- `Icon name="ditch|board|water|drought|storm|lidar|pin|tractor"`: 24 px grid, 2 px stroke, round caps/joins, no fills (paths identical to pages/11-iconography.html). **Never emoji.**
- `FieldPattern` (the brand image, SPEC §05): flat aerial strip fields. Props `seed`, `parcels` (polygons in a 1000×1000 local frame, for real parcel shapes), `ditch` ([[x,y],[x,y]]), `board` (0..1 along the ditch), `angle` (deg), `tone: "forest"|"color"`, `drift: true|"scroll"|"time"` (scale ≤ 1.15, off under reduced motion), `className` (give it a size). SVG, deterministic, server component, aria-hidden. One straight water ditch + one cream board tick, hairline boundaries, palette only.
- `Button` (`variant primary|secondary`, `tone onForest|onCream`, `href`, `target`), `Eyebrow`, `Card`, `StatusChip`, `ProgressLine` (`label`, `value?` 0..1, `tone`), `ProgressRail` (`current`, `tone`, `size sm|md`), `StepRail` (`size sm|md`), `SourceLine`, `SkipLink` in `ui.tsx`.
- Data primitives in `data.tsx`: `LevelMeter`, `LevelTag`, `SourceChip(List)`, `RecCard`, `Callout`, `FooterLine`, `SectionEyebrow`.
- `StateTiles` (TRZYMAJ/OTWÓRZ, radiogroup; `variant="toggle"` = aria-pressed buttons) and `OrderBadge` (incl. NIE RUSZAJ). `Segmented`.
- `PointCloud` is **@deprecated** (SPEC §05: no 3D/shading). Do not use in new work; use `FieldPattern`.

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
| `water-ink` | #2E6585 | **text-safe** water: small text, fills carrying small cream text (5.38 on cream) |
| `terra-ink` | #984630 | **text-safe** terra (5.49 on cream) |
| `agri-ink` | #3F6630 | **text-safe** agri (5.66 on cream) |
| `forest-muted` | #4A5E4C | secondary text on cream instead of opacity (5.96) |
| `cream-muted` | #C4C5B4 | secondary text on forest (7.11) |

Ratio: cream 50 · forest 25 · greens+soil 15 · water+terracotta 10.
Elevation tints low→high: `elev-1` #2F5F73, `elev-2` #8FA86A, `elev-3` #C9BF86, `elev-4` #B98D5F, `elev-5` #EFE6D3.
**Contrast (WCAG 2.2):** forest/cream 10.6:1; forest on sky 6.5:1; cream on soil 6.8:1. Cream on agri 4.3, on terracotta 4.1, on water 3.8 = **AA large only** (24 px+ / 19 px+ bold). Below that use the `-ink` token. Never fade informative text with `opacity-*`. Status never by colour alone.

## Type (SPEC §04)
Utilities (Tailwind `@utility`, work with variants): `type-display` (Archivo ExtraBold 78% UPPERCASE 96/0.92), `type-h1` (64/0.94), `type-h2` (Archivo Bold 85% 40/1.1), `type-h3` (26/1.15), `type-body` (Inter 18/1.5), `type-caption` (Inter 12/1.45), `type-data` (Inter SemiBold 11, +14% tracking, uppercase, tabular). Display/H1/H2 clamp down on narrow screens, max = spec.
Role classes (size-free, same as the artwork): `.hd` headline, `.sh` subhead, `.eb` data label/eyebrow, `.num` (or Tailwind `tabular-nums`) for **all** data. Body text Inter 16–20 px, lh 1.45–1.5.

## Components spec (SPEC §07, §09)
- Buttons: primary = cream fill + forest text on forest (inverted on cream), 2 px radius, 48 px min height, Inter Medium 16. Secondary = 1.5 px outline. Focus: 2 px solid outline, 2 px offset (WCAG 2.4.11/2.4.13).
- Card: cream 94% over imagery, 4 px radius, shadow `0 8px 24px rgba(31,58,34,.18)`, 24 px padding.
- State tiles: exactly one active. Active TRZYMAJ = forest fill; active OTWÓRZ = water fill (water-ink for small text). Inactive = 2 px outline in the state colour. 4 px radius, 36 px padding. 400 ms colour change, nothing else moves. **TRZYMAJ / OTWÓRZ never translated.**
- Progress rail 01–07 (34 px steps): Sieć rowów · Teren LiDAR · Ocena miejsc · Kontrola bezpieczeństwa · Montaż zastawki · TRZYMAJ/OTWÓRZ · Monitoring. Done filled, current filled + soft ring, to do outline.
- Data card: `Site [ID] · Accepted` / `Retention [m³]` / `Slope [%] · Ditch length [m]` / `Source: BDOT10k; LiDAR DTM 1 m (GUGiK)`.

## Maps: "clean, map-like, calm"
Cream contours (major every 1 m), ditch network water blue, retention zone water blue 28%, safe site agri, rejected terracotta. **No hillshade drama, glow or 3D tilt.** Inter labels, tabular values, **a source line on every map** (`SourceLine`).

## Motion (SPEC §10): "move like a camera"
- `.rise-in` (alias `.rise`): fade + rise 16 px, 600 ms `cubic-bezier(.2,.7,.2,1)`. Never letter by letter.
- `.water-level`: level changes 1.6 s ease-in-out (1.2–2 s range), no overshoot.
- `.state-colour`: 400 ms colour-only transition.
- Field drift: `FieldPattern drift` (scroll-tied, 10–14 s feel, scale ≤ 1.15).
- **Never:** spinners, flashing, bounce/springs, glows. Loading = `ProgressLine` only. Everything respects `prefers-reduced-motion` (global override in globals.css).

## Layout and imagery
One system everywhere: a forest or cream block for words, `FieldPattern` for image, the square mark wherever the board itself appears. Footer line on every page: "Let the land hold its water." Photography: commissioned only; no stock, no renders presented as photos, no gradients/texture/3D.

## Tone of voice: short, plain, sure
Write like a good agronomist talks: one idea per sentence, concrete nouns, numbers over adjectives.
| Say | Not |
|---|---|
| zastawka / board | smart water-control module |
| zatrzymaj wodę / hold water | optimise hydrological retention capacity |
| miejsce bezpieczne / odrzucone | AI-validated opportunity zone |
| przed burzą | proactively, ahead of extreme weather events |

Examples: "To miejsce jest bezpieczne. Tu montujemy." · "To miejsce jest zbyt ryzykowne. Tu nie budujemy." · "Prognoza burzy. Przełącz na OTWÓRZ." · "Jedna zastawka. Dwa tryby." UI language is Polish.
