# 04 · Accessibility audit (WCAG 2.2 AA), read-only

Scope: `main` @ fd4d836 (+ uncommitted map edits): /mapa, /karta, /slides, /metoda, brand components.
v2 worktrees: `traktor-wt2/ui` has only `components/analiza/fixture.ts` (no UI yet). `traktor-wt2/report` has no `app/raport` or `components/raport` yet. **Nothing to audit there.** Apply the rules below when those screens get built.
Severity: **H** blocks a user group · **M** real barrier with a workaround · **L** polish.

## Contrast (1.4.3 text 4.5:1, large ≥24px or ≥18.66px bold 3:1; 1.4.11 UI 3:1)

| Pair (as used) | Ratio | Verdict |
|---|---|---|
| forest / cream | 10.59 | pass |
| cream on **water** `#3B7FA3` | 3.76 | **fails <24px**: `Chrome.tsx:150` storm radio 13px, `SitePanel.tsx:330` "OTWÓRZ" 12px, `StateTiles.tsx:41,66` 15px desc |
| water text on cream / cream-deep | 3.76 / 3.56 | **fails**: `Chrome.tsx:163` 13px, `SiteCard.tsx:259` 12px, `StateTiles.tsx:42` inactive tile text |
| cream on **terra** `#B5573B` | 4.07 | **fails**: `ui.tsx:71` StatusChip 11px, `SitePanel.tsx:191-206,285-288` 13.5px, `Chrome.tsx:57` IMGW chip 12.5px, `SitePanel.tsx:50` 14px |
| terra text on cream / deep | 4.07 / 3.86 | **fails**: `SitePanel.tsx:53`, `SiteCard.tsx:186,219,227,306` (10.5-14px) |
| cream on **agri** / agri on cream | 4.27 | **fails**: `ui.tsx:71` "Przyjęte" 11px, `SiteCard.tsx:219` 11px, `Overlays.tsx:58` 15px bold |
| cream@0.8 on terra | 3.18 | fails `SitePanel.tsx:58` "✕ cm" 10px |
| forest@0.7 on **cream-deep** | 4.43 | **fails**: every `opacity-70` in the aside (`SitePanel.tsx:13,20,32,153,185,220,249,268,311,340`) |
| forest@0.6 on cream / deep | 3.49 / 3.42 | fails: `SitePanel.tsx:33`, `Chrome.tsx:155` kbd, `Overlays.tsx:58,159,195`, slides `opacity-60` captions (`slides.tsx:77,172,177,359,468,472`) |
| forest@0.5 on cream | 2.73 | fails `slides.tsx:328` |
| cream@0.6 on water (kbd on active storm radio) | 2.33 | fails `Chrome.tsx:155` |
| forest@0.7/0.75 on cream; cream@0.7 on forest | 4.55 / 5.23 / 6.05 | pass (4.55 is marginal, and it fails over imagery or cream-deep) |
| agri on cream 150px, water 56px, OrderBadge `hd text-xl` 800 | ≥3 | pass (large text) |
| **1.4.11** refused dots terra@0.32 | 1.50 | **fails** `MapCanvas.tsx:378` |
| 1.4.11 toggle/crest borders forest@.30-.35, terra@.6 | 1.75-2.22 | L: the label text identifies the control, but state (refused crest) relies on the border, `SitePanel.tsx:53` |

**Fix (shared, on `main`)**: add text-safe ink tokens and use them for any text below 24px, keeping the brand fills for large and graphic uses:
```css
--color-water-ink:#2E6585; /* 5.38 cream, 5.10 deep */
--color-terra-ink:#984630; /* 5.49 / 5.20 */
--color-agri-ink:#3F6630;  /* 5.66 / 5.37 */
```
Small text on water, terra or agri fills becomes `bg-water-ink`, `bg-terra-ink` or `bg-agri-ink`. Replace `opacity-60` and `opacity-70` on small text with `text-forest/80` (6.0 on cream, 5.8 on deep). Ban `opacity-50` for text. Raise unselected refused dots to `fillOpacity .7` plus a cream stroke.

## Keyboard and focus

| # | Criterion | Sev | Where | Issue → fix |
|---|---|---|---|---|
| K1 | 2.1.1 Keyboard | **H** | `MapCanvas.tsx:397-404` | Site `<g role="button">` has no `tabIndex` or key handler. Refused candidates `:372-386` are click-only. → `tabIndex={0} onKeyDown={e=>(e.key==="Enter"\|\|e.key===" ")&&(e.preventDefault(),onSelectSite(s.id))}` and a `focus-visible` ring (`<circle className="focus-ring"/>` drawn when `:focus`). For 1,000+ candidates, add a keyboard list "Odrzucone punkty" in the panel (filter by code) rather than making every dot a tab stop. |
| K2 | 4.1.2 / 1.1.1 | **H** | `MapCanvas.tsx:227` | `role="img"` on the `<svg>` makes all children presentational, so the site buttons are invisible to AT. → `role="group" aria-label="Mapa gminy…"`; mark decorative layers `aria-hidden`. |
| K3 | 2.5.7 Dragging / 2.1.1 | **M** | `MapCanvas.tsx:191-215` | Pan is drag-only; zoom buttons exist, pan buttons do not. → Arrow keys on the focused map wrapper (`tabIndex={0}`, `aria-describedby` hint) pan by 10% of vb.w, `+`/`-` zoom; optionally 4 pan buttons in the zoom stack. |
| K4 | 2.1.4 Character Key Shortcuts | **M** | `MapApp.tsx:152-155`; `Deck.tsx:57-61` | Global single keys 1-4, digits, `f` and `p` with no way to turn them off. → Require a modifier (`Alt+1`) or only act when focus is on body or the deck, plus a toggle "Skróty klawiszowe: wył." |
| K5 | 2.1.1 / 4.1.2 | **H** | `Deck.tsx:49-54` | Window keydown `preventDefault`s Space and Enter, so keyboard users cannot press StateTiles on slide 3 (`slides.tsx:171`) or any link, and the deck advances instead. Backspace is hijacked too. → `if ((e.target as Element).closest("a,button,input,select,[data-noadvance]")) return;` before handling. |
| K6 | 2.4.3 Focus Order / 4.1.2 | **H** | `SitePanel.tsx:69` WhyDrawer | `role="dialog"` with no focus move, no `aria-modal` and no focus return. Esc closes the whole site (`MapApp.tsx:157`), not the drawer. → On open, focus the heading (`tabIndex={-1}`). Esc closes the drawer first, then focus returns to the "Dlaczego?" button. `aria-modal="true" aria-labelledby`. |
| K7 | 2.4.3 / 4.1.3 | M | `MapApp.tsx:125-132` | Selecting a site (list, search, marker) swaps the aside silently and focus stays behind. → After select, `panelHeading.current?.focus()` (`<h2 tabIndex={-1}>`), or add an `aria-live="polite"` sr-only line "Otwarto miejsce S-007". |
| K8 | 2.4.7 Focus Visible | M | `Overlays.tsx:150` | Input `outline-none` leaves only a forest/40→forest border change. Most buttons in Chrome/Overlays/SitePanel/SiteCard rely on UA default, which is invisible on `bg-forest` in some browsers. → Global `:focus-visible{outline:2px solid var(--color-forest);outline-offset:2px}` and `.bg-forest :focus-visible, header :focus-visible{outline-color:var(--color-cream)}`. Drop `outline-none`. |
| K9 | 2.4.11 Focus Not Obscured | L | `SiteCard.tsx:121` sticky toolbar; map overlays | → `scroll-padding-top:64px` on html for /karta. |
| K10 | 2.4.1 Bypass Blocks | M | all routes (`layout.tsx:25`) | No skip link. → First child of body: `<a href="#main" className="sr-only focus:not-sr-only …">Przejdź do treści</a>`. Map: also "Przejdź do panelu miejsca" (`#panel`). |
| K11 | 4.1.2 radiogroup | L | `Chrome.tsx:136`, `SitePanel.tsx:35`, `SiteCard.tsx:166` | `role=radio` without roving tabindex or arrow keys. → Either plain `aria-pressed` buttons or roving `tabIndex={on?0:-1}` with arrows. Basemap toggles (`Chrome.tsx:189`) are mutually exclusive, so they should be a radiogroup and not `aria-pressed`. |

## Structure, names, language

| # | Criterion | Sev | Where | Fix |
|---|---|---|---|---|
| S1 | 1.3.1 / 2.4.6 | M | /mapa has no `h1` (`Chrome.tsx:34` is `<p>`) | `<h1 className="sr-only">Mapa rowów: {GMINA.name}</h1>` |
| S2 | 1.3.1 landmarks | M | /karta and /slides have no `<main>` (`SiteCard.tsx:117`, `Deck.tsx:76`) | `<main id="main">` around the article or stage |
| S3 | 1.3.1 | L | `SiteCard.tsx:236,242,250,281,296,314,326,336` | Section titles are `<p className="eb">`. → `<h2 className="eb">` |
| S4 | 1.3.1 tables | L | `SiteCard.tsx:282-291`, `SitePanel.tsx:87-112` | `<td>` labels → `<th scope="row" className="font-normal text-left">`, plus a `<caption className="sr-only">` |
| S5 | 3.1.2 Language of Parts | M | `TAGLINE_EN` in `Deck.tsx:99`, `SiteCard.tsx:361`; `slides.tsx:49` h1; `En` component (`slides.tsx:35`); `StateTiles.tsx:67`; landing `p.en` `page.tsx:146` | `lang="en"` on those elements (for example inside `En`) |
| S6 | 4.1.2 | L | `Deck.tsx:80` | `aria-roledescription` on a div with no role is ignored. → stage `role="region" aria-label="Prezentacja"`, each `<section role="group" aria-roledescription="slajd">` |
| S7 | 4.1.2 | L | `StateTiles.tsx:55` | Read-only use shows two disabled radios ("niedostępne"). → When `!onChange`, render `<div role="img" aria-label={"Polecenie: "+label}>`, or plain divs with an sr-only "aktywny" |

## Dynamic updates (4.1.3 Status Messages)

| # | Sev | Where | Issue → fix |
|---|---|---|---|
| D1 | M | `Deck.tsx` | Slide change is not announced. → `<p className="sr-only" aria-live="polite">Slajd {index+1} z {TOTAL}: {SLIDES[index].eyebrow}</p>` |
| D2 | L | `Chrome.tsx:37` | The whole conditions strip is one live region, so every flip re-reads 5 items. → Keep the region on the dock summary (`:161`) and add one sr-only sentence: "Warunki: Burza. OTWÓRZ: 4 miejsca". |
| D3 | M | `Chrome.tsx:74`, `ui.tsx:83` | Live fetch progress has no text, and a failure note appears without a live region (inside D2's region only by accident). → `aria-busy` on the strip plus an sr-only "Pobieram dane na żywo…" in `role="status"` |
| D4 | L | `Overlays.tsx:152-163` | Search results and "Brak takiej działki" are not announced. → `<p role="status" className="sr-only">{hits.length} wyników</p>` |
| D5 | L | `Overlays.tsx:57`, landing `RefusalCounter.tsx:64` | Animated numbers can be read mid-count. → `aria-hidden` on the animated span plus an sr-only final value (the landing sentence `:55` already does this, so replicate it in the map counter) |
| D6 | v2 | /analiza progress | When built: one `role="status"` line per stage ("Krok 3/7: Teren LiDAR"), `aria-busy` on results, and focus moved to the result heading on completion |

## Non-text content and colour

| # | Criterion | Sev | Where | Fix |
|---|---|---|---|---|
| A1 | 1.1.1 | M | `CrossSection.tsx:52`, `Sections.tsx:30,124`, `MiniMap.tsx:60`, `slides.tsx:98`, `BoardStates.tsx:26` | Labels name the chart but not its content. → `aria-describedby` to a sr-only `<p>`: "Woda przy 60 cm: 0,6 m, wychodzi na działkę sąsiada 304/1; cofka 410 m". The values are already in scope. |
| A2 | 1.1.1 | M | `MapCanvas.tsx:228` | The map has no text equivalent of the sites and their orders. RankingList covers the top 10 only, and only in GminaPanel. → Add a "Lista wszystkich miejsc" (table: id, nazwa, polecenie, retencja) behind a disclosure in the aside. |
| A3 | 1.4.1 Use of Colour | **M** | `MapCanvas.tsx:405`, `Overlays.tsx:242-248` | TRZYMAJ vs OTWÓRZ is shown only by ring colour (forest vs water, 2.82:1 to each other). → Add a shape cue: OTWÓRZ ring `strokeDasharray` or a small ▼ glyph; mirror it in the legend. |
| A4 | 1.4.1 | L | `MapCanvas.tsx:285-293` neighbour parcel refused = terra vs cream fill only | Text alert exists (`SitePanel.tsx:191`); add `strokeDasharray` when refused (the karta already does this, `SiteCard.tsx:307`). |
| A5 | 1.3.3 / 1.4.1 | L | `SitePanel.tsx:338` "Zielony punkt na mapie otwiera miejsce." | Relies on colour and on the pointer. → "Wybierz miejsce na mapie lub z rankingu poniżej." |

## Target size, reflow, motion, print

| # | Criterion | Sev | Where | Fix |
|---|---|---|---|---|
| T1 | 2.5.8 Target Size (24px) | **M** | refused dots `MapCanvas.tsx:376` (3px, dense) | Hit circle `r={12*u} fill="transparent"` when the dot is highlighted or filtered. Otherwise rely on the K1 list (equivalent-control exception). |
| T2 | 2.5.8 | M | text buttons ~16-22px tall: `Overlays.tsx:65-71,107`, `SitePanel.tsx:72,159,204,280`, `Overlays.tsx:170` | `className="… inline-flex min-h-6 items-center"` (24px). Use 44px (`min-h-11`) on touch for close buttons. Zoom 40px and toggles 36px pass AA but sit below the 44px recommendation. |
| R1 | 1.4.10 Reflow 320px | **M** | `SiteCard.tsx:208` `w-[210mm]` | Fixed 794px sheet scrolls horizontally on screen. → `w-full max-w-[210mm] print:w-auto`; stack the `grid-cols-2` sections below `sm`. |
| R2 | 1.4.10 / 1.3.? | M | `MapApp.tsx:196,209` hide RefusalCounter, Legend and source <900px | The legend and sources (and attribution) disappear on small screens and at 400% zoom. → Move them into the aside as a disclosure "Legenda i źródła", not `hidden`. |
| R3 | 1.4.10 / 1.4.4 | M | `MapApp.tsx:177` `h-dvh overflow-hidden` | At 400% zoom (320×256 CSS px) the top bar plus the dock exceed the height and get clipped. → `@media (max-height:500px){overflow:auto; h-auto}`, or collapse the dock behind "Warunki i warstwy". |
| R4 | 1.4.10 (exempt-ish) | L | `Deck.tsx:27` scale-to-fit | At 320px the scale is about 0.2 and text renders around 3px. A slide deck needs 2D layout, but provide `/slides?text=1` or the notes view as a linear text version. |
| M1 | 2.3.3 / 2.2.2 | **M** | `globals.css:96-103` + `Chrome.tsx:76`, `ui.tsx:84` | Reduced motion sets the infinite `progress-line` to 0.001ms, so it loops every frame and flickers. → add `animation-iteration-count:1 !important;`, or for `[animation*=progress-line]` show a static 40% bar. |
| M2 | 2.3.3 | L | `MapCanvas.tsx:292,405` inline `transition` and `slides.css:35-39` | Covered by the global rule. OK. JS animations check `matchMedia` (`MapCanvas.tsx:110`, `Overlays.tsx:35`). OK. |
| P1 | print | L | `SiteCard.tsx:271,288,342,351` 9.5-10px at opacity .7, then `zoom:.94` | About 9pt grey on paper. → Minimum 10px at `text-forest/80`; drop `zoom`. The "Odrzucone" state prints as text too, which is good. Add `<title>` via metadata per site (`Karta S-007 · TRAKTOR`) so PDF filenames make sense. |
| P2 | print | L | `slides.css:66-68` all slides printed; `aria-hidden` on hidden slides is irrelevant in print. OK. The /mapa print has no `.no-print` on the aside or overlays, so the decision is only partly printed. | `print:hidden` on the overlays, or link to /karta. |

## Passes worth keeping
`lang="pl"` (`layout.tsx:24`); labelled search input and selects; `aria-pressed` and `aria-expanded` on filters (`Overlays.tsx:68,93`); `role="alert"` on refusal (`SitePanel.tsx:191`); refused crests also carry "✕" and line-through (text, not colour only); karta toolbar targets ≥40px; reduced-motion handling in JS; hidden slides are `display:none` + `aria-hidden`.

## v2 rules (/analiza, /raport, not yet in the worktrees)
Use `<form>` with `<label for>`, `aria-invalid` and `aria-describedby="err-id"` on errors, and move focus to the error summary on submit. Announce progress per D6. Every chart gets a sr-only data table. Crop and parcel status needs text plus an icon, not colour alone. The report should be `<article>` with an h1-h3 outline, `<table>` with `<th scope>`, print at ≥10px, and the ink tokens above for small coloured text.
