# QA review 3: brand, accessibility, brief compliance (lane 10 "qa")

- Code under test: `main` @ `6034855` (branch `v5/qa`). Production build (`npm run build` passed: TypeScript OK, 15 routes), `next start -p 3050`.
- Source of truth: `docs/brand/SPEC.md` (Brand Guidelines 1.0), `TRAKTOR_PLAN_v2.html`, `.opencode/skills/traktor-analiza/SKILL.md`.
- Tools: headless Edge via the DevTools Protocol (true 1440×900 and 375×812 viewports; note: plain `msedge --headless --window-size=375,812` clamps the layout viewport to 504 px and crops the image, so those shots are misleading), axe-core 4 (already in `node_modules`, tags wcag2a/aa, 21a/aa, 22aa), computed-style probes, a scripted keyboard Tab walk, a `prefers-reduced-motion: reduce` reload, `Page.printToPDF`, curl for the API.
- Screenshots: `docs/review3/shots/` (JPG, all under 220 kB). `-d` = 1440×900, `-m` = 375×812, `-full` = full page at 50 %.
- Owning lanes: **1** noslides · **2** brand system · **3** landing · **4** analiza flow · **5** analiza results · **6** maps · **7** raport · **8** metoda/karta/404 · **9** engine/api.

---

## Top 15 (fix in this order)

| # | Sev | Finding | Fix | Lane |
|---|---|---|---|---|
| 1 | P0 | **The /analiza map never renders in production.** MapLibre 6 resolves its worker from `import.meta.url`. Under Turbopack that resolves to `/analiza`, which serves HTML. Console: `Failed to load module script … MIME type "text/html" … /analiza` and then `Error: Worker failed to load`. The map area is blank cream (`shots/analiza-d.jpg`, `shots/flow-d2018-result.jpg`). | Copy `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` (+ `maplibre-gl-shared.mjs`, which it imports) to `public/vendor/maplibre/`, ideally via a `postinstall`/`prebuild` copy script. In `components/analiza/MapView.tsx:173`, call `lib.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs")` before `createMap`. Check that CSP `worker-src 'self' blob:` allows it (it does). Re-test with `next build && next start`, not only `next dev`. | 6 (+4) |
| 2 | P0 | **The TRZYMAJ/OTWÓRZ tiles overflow on the landing page** at both 1440 and 375. "TRZYMAJ" is clipped to "TRZYMA", and "OTWÓRZ" spills outside its 2 px outline (`shots/home-states-d.jpg`, `shots/home-states-m.jpg`). This is the brand's signature element (§07). | `components/brand/StateTiles.tsx:25`: size `lg` uses `text-6xl` in a half-width grid cell. Add `min-w-0` to the tiles, and make the label fluid: `text-[clamp(32px,4.2vw,60px)]` for `lg` and `text-[clamp(24px,6vw,36px)]` for `md`. Below `sm`, use `grid-cols-1 sm:grid-cols-2` (lines 68, 83). Keep `p-9` (36 px, as the spec requires). | 2 |
| 3 | P0 | **Custom 404 is missing.** The Next default page appears: black, English, system font, no landmarks, no way back (`shots/404-d.jpg`). | Add `app/not-found.tsx` with a cream ground, `SiteNav solid`, H1 `hd` "Nie ma takiej strony.", body "Sprawdź adres albo wróć na start.", and buttons [Sprawdź działkę → /analiza] [Strona główna → /]. Keep `lang=pl` and add `<main>`. | 8 |
| 4 | P1 | **Imagery breaks §05 "Flat colour only. No texture, gradient, shading or 3D."** The hero is a layered Blender 3D render with shading and a tractor (`components/landing/ParallaxHero.tsx`, `app/page.tsx:74`). Section 08 and the slides use the LiDAR `PointCloud` (`app/page.tsx:222`), which was the old guideline. | Lane 2: build `components/brand/FieldPattern.tsx` (SVG, palette fills, hairline boundaries, long narrow strips from a real parcel set at their real angle, **one straight water-blue ditch**, **one cream tick** for the board, slow drift 10–14 s with scale ≤ 1.15, static under reduced motion). Lane 3: use it in the hero (1440×810 reference, logo cream top-left, forest block for the words) and in section 08. Remove `PointCloud` from `page.tsx:3,222`, and delete `components/brand/PointCloud.tsx` once `/slides` is gone. | 2, 3 |
| 5 | P1 | **Historical analyses are labelled "dziś".** For date 2018-07-20 the results say "WYNIK ANALIZY. RYZYKO SUSZY DZIŚ: WYSOKIE." and the tile says "Ryzyko suszy dziś". | `components/analiza/Results.tsx:252,308`: when `result.request.date !== today`, write "Ryzyko suszy 20.07.2018: wysokie". Add a `fmtDatePl` next to `fmtDateTime` in `components/analiza/api.ts:137`. | 5 |
| 6 | P1 | **Numbers in /analiza contradict each other and the report.** (a) The "Sezony z suszą (z ostatnich 10)" label shows the value **"1 z 11"** (`Results.tsx:338`). (b) The chart threshold is **"próg IUNG −240 mm"**, while the summary and the report use **SMSR −224 mm** with a per-season tick (`Results.tsx:351` vs `ReportSheet.tsx:159`). (c) The label "okresie krytycznym (miesiące 7, 8)" shows raw month numbers (`Results.tsx:347,351`). | (a) Use one count everywhere. The label should state what is counted: "Sezony z suszą: 1 z 11 (2008–2018)", or exclude the current season and say "1 z 10". (b) Pass `thresholdKind="smsr"` and the per-season thresholds as the report does (`charts.tsx:108,221`). (c) Write "lipiec–sierpień" using the report's `period` helper. | 5 (+9 for the count) |
| 7 | P1 | **The summary is a 530–560 character jargon block** (`assessment.summaryPl`: "ETP SMSR; z ET0 FAO −186 mm … wg progów SMSR z 2019 r."). It fails §12 "Short. Plain. Sure." and is the first thing a farmer reads on /analiza and /raport. The 2018 case also reads as a contradiction: "Ryzyko … wysokie" while the next sentence says "… bez suszy" (the level comes from the FAO-56 soil-water deficit, which is never stated up front). | Engine: put at most 3 sentences in `summaryPl`, with the driver first. Example for 2018-07-20: "Ryzyko suszy 20.07.2018: wysokie. W glebie brakuje 106 mm wody, a rośliny cierpią od 97 mm. Od maja spadło o 205 mm mniej wody, niż wyparowało; próg suszy to 224 mm." Move the method detail (ETP SMSR, Doroszewski, MERRA-2, windows) into `uncertainty.reasonsPl` / sources. | 9 |
| 8 | P1 | **Brand §09 minimum 48 px button height is broken in many places**: /mapa scenario + layer buttons **36 px**, "Warunki/Warstwy" 32 px, "Zwiń powody odmowy" 24 px, ranking rows 36 px (`components/map/Chrome.tsx`, `SitePanel.tsx`); /karta height chips and "Drukuj / zapisz PDF" **40 px** (`components/card/SiteCard.tsx:207` `!min-h-10`); /raport toolbar **44 px** (`components/raport/RaportApp.tsx:191` class `tool`); /analiza Satelita/Mapa segmented and zoom buttons 44 px. (WCAG 2.5.8 still passes; this is a brand failure.) | Remove the `!min-h-*` overrides and use `Button` / `Segmented` as they are (`min-h-12`). On /mapa, where space is tight, keep 48 px and use a horizontal scroller, or put the layer buttons in the existing "Warstwy i podkład" sheet. | 6, 8, 7, 4 |
| 9 | P1 | **Landing has no skip link, and the first focus stop is invisible.** Tab 1 lands on the logo link with a **forest outline on the forest/80 header** (`components/landing/SiteNav.tsx:23`; the global rule in `globals.css:120` matches `.bg-forest` but not `.bg-forest/80`). The other pages have a SkipLink (`shots/home-focus-d.jpg`). | Add `<SkipLink href="#main">Przejdź do treści</SkipLink>` + `id="main"` on `<main>` in `app/page.tsx:72`. Add `focus-visible:outline-cream` to the logo link at `SiteNav.tsx:23`, or extend the `globals.css:120` selector with `[class*="bg-forest/"]`. | 3 (+2 for globals) |
| 10 | P1 | **axe-core reports colour-contrast failures on `/`** (6 nodes): `eb opacity-60` value eyebrows "Grounded/Reversible/Precise" at **3.49:1** (`app/page.tsx:123`); `text-[11px] opacity-70` source lines at **4.41:1** on cream-deep (`page.tsx:88`); "Kliknij kafelek…" at **4.41:1** (`components/landing/BoardStates.tsx:142`), plus `:146`. Also on mobile: `scrollable-region-focusable` for the progress rail scroller (`page.tsx:112`). | Replace opacity fades with the tokens `text-forest-muted` / `text-cream-muted`, as `SourceLine` already does. For the rail scroller, add `tabIndex={0} role="region" aria-label="Etapy pracy"`, or let the rail wrap to 2 rows below 640 px. | 3 |
| 11 | P1 | **/slides is still live and linked from 4 places** (lane 1 must remove it): `components/landing/SiteNav.tsx:8`, `components/landing/SiteFooter.tsx:37`, `app/page.tsx:238`, `components/map/Chrome.tsx:96`. Its keyboard Tab cycles between a 1×1 px sr-only button and `body`. | Delete `app/slides/**`, `components/slides/**`, `docs/slides/**` and the 4 links. Add a redirect `/slides → /` in `next.config.ts` so old QR codes and links do not 404. | 1 |
| 12 | P2 | **Untrue or contradictory claims on the landing page.** "Siedem publicznych źródeł. **Zero licencji.**" (`page.tsx:152`), but the report lists CC BY 4.0 and ODbL attributions. "Model językowy tylko tłumaczy wynik…" (`page.tsx:174`), but the API returns `textSource: "template"`. Section 05 says "dane demonstracyjne" (`page.tsx:140`) right above "Dane rzeczywiste: BDOT10k…" (`lib/traktor/copy.ts:15`). | Use "Siedem publicznych źródeł. Bez opłat." For the AI paragraph: "Teksty składamy z gotowych zdań. Liczby idą prosto z obliczeń." (keep the LLM wording only if an LLM is on in production). For section 05: "Przykład spod Bydgoszczy. Rowy, teren i działki: dane GUGiK. Retencja i hektary: szacunek." | 3 |
| 13 | P2 | **/raport recomputes the analysis that /analiza just produced.** Observed: an /analiza run (2019-06-30, 8.5 s), then opening "Raport do druku (PDF)" showed "Liczymy analizę…" for more than 6 s, and the next GET was a cache **MISS** (8.4 s) (`shots/raport-refetch-d.jpg`). A plain POST followed by GET does hit the cache, so the miss comes from the UI path (a likely cause is an aborted duplicate request evicting the shared entry; needs repro in `lib/analiza/server.ts`). | Lane 7: hand the result over via the existing saved-report mechanism (`RaportApp.tsx:90`, `?saved=`), or `sessionStorage` keyed by `parcelId|crop|date`, before `window.open`. Lane 9: make sure an aborted request never deletes a completed or in-flight cache entry. | 7, 9 |
| 14 | P2 | **Data and copy bugs in the report**: "pow. **powiat** inowrocławski" (`components/raport/ReportSheet.tsx:295`; ULDK already returns "powiat …"); the irrigation section repeats DLACZEGO/JAK word for word from the decision block above; the cause "Uprawa w okresie krytycznym" has **no source** (`lib/analiza/analyze.ts:525-528` `sources: []`; also `:812`); "nie nawadniać." starts lower-case (`analyze.ts:752,760`); the footer has a double period "szacunki.. Źródła" (`components/landing/SiteFooter.tsx:44`); the live region says "dane z **pięciu** źródeł" while 8–9 sources are queried (`components/analiza/AnalizaApp.tsx:194`). | Strip a leading `powiat ` before prefixing "pow." (also in `AnalizaApp.tsx:67`). In the irrigation card, show only the decision block, or show the rec card with different text. For the crop-calendar cause, use `sources: ["IUNG"]` or a "kalendarz upraw (COBORU/IUNG)" source. Use "Nie podlewaj teraz." Remove "." from `DEMO_NOTE` usage. Use "Liczymy. Pobieramy dane z 8 źródeł." | 7, 9, 3, 4 |
| 15 | P2 | **The Overpass/BDOT10k step is the bottleneck and fails silently.** In the first cold run both analyses spent **8.0 s** on `BDOT10k … missing (Overpass niedostępny)` (total 10.5 s / 8.4 s). On the rerun the same source came back "partial" with 13 segments. Ditch-based recommendations (zastawka) vanish when it fails. | Lower the Overpass timeout to about 4 s per mirror and race the mirrors in parallel. Cache rows per tile for 24 h. When it fails, keep the "Brak danych o rowach…" missing line (already present) and add a "Sprawdź ponownie" link. | 9 |

---

## Timings and live runs (brief: result ≤ 30 s)

| Run | Path | Time | Result |
|---|---|---|---|
| 040706_5.0021.44 · kukurydza · **2018-07-20** | `GET /api/analiza` cold | **10.5 s** (`durationMs` 9729) | 200; current **wysokie**, historical umiarkowane; 3 causes, 7 recommendations, irrigation `rozwaz` 30 mm; uncertainty średnia; missing BDOT10k + ISOK |
| same · **2026-11-22 (today)** | `GET /api/analiza` cold | **8.4 s** (`durationMs` 8420) | 200; current **niskie**; 1 cause, 3 recommendations, irrigation `nie_teraz`; NMT partial (32/62 points), BDOT10k missing |
| same · 2019-06-30 | UI `/analiza` (URL params → "Analizuj działkę") cold | parcel lookup 0.9 s, **result 7.7 s** | OK; loading = thin progress line + "Liczymy" (`shots/flow-d2018-loading.jpg`) |
| 2018-07-20 / today | UI (server cache warm) | 4.1 s / 1.2 s | OK (`shots/flow-d2018-result.jpg`, `shots/flow-m-today-result.jpg`) |
| /raport from the UI link | PDF via `Page.printToPDF` | – | 2018: **4 pages**, 0.8 MB; today: **3 pages**, 0.74 MB. Print CSS footer shows the tagline; the demo marker repeats on each page |

All runs are within 30 s. The headroom depends on Overpass (top 15 #15).

**Server note:** the first `next start` exited with code 1 and no stack trace in the log, between the two cold API runs and the next page load. I could not reproduce it on restart (the second instance ran for 15+ minutes without errors). Lane 9 should watch for it (native DuckDB / unhandled rejection?).

---

## Brief compliance on /analiza and /raport (SKILL.md contract)

| Item | /analiza | /raport | Evidence | Fix / lane |
|---|---|---|---|---|
| Status (current + historical level) | OK | OK | `shots/flow-d2018-result.jpg`, `shots/raport-2018-full.jpg` | – |
| Date of analysis shown | **FAIL** ("dziś" for 2018; ISO "2018-07-20" in the result header, mixed with Polish "20 lipca 2018") | OK ("analiza na 20 lipca 2018") | `Results.tsx:252,308` | Polish date everywhere, never "dziś" for past dates (5) |
| Causes from data, each with a source | Partial: cause 3 has no source chip | Partial: same | `analyze.ts:525-528` | top 15 #14 (9) |
| Recommendations derived from data (why/how/where/law/basis) | OK | OK; irrigation text duplicated | `shots/raport-2018-full.jpg` | top 15 #14 (7) |
| Sources with status, fetchedAt, licence | OK (chips with "· częściowe/· brak", never colour alone) | OK (table 07 + attribution) | – | – |
| Limitations / not considered | OK | OK ("Nie uwzględniono") | – | – |
| Uncertainty level + reasons | OK | OK | – | Shorten the reasons (§12) (9) |
| Missing data called out | OK (terra-ink "brak danych", missing chips) | OK ("Brakujące dane", "NIEPEŁNE DANE" stamp) | – | – |
| "Wymaga wizji lokalnej" | OK | OK (boxed) | – | – |
| PDF export | n/a (link "Raport do druku (PDF)", opens in a new tab and says so) | OK (Drukuj / zapisz PDF; JSON; save in browser) | PDFs 3–4 pages | Avoid the refetch (#13) (7) |
| ≤ 30 s | OK (7.7 s cold) | OK if it reuses the result; otherwise the user waits twice | `shots/raport-refetch-d.jpg` | #13 |
| Consistency of numbers between views | **FAIL** (1 z 11 vs "z ostatnich 10"; IUNG −240 vs SMSR −224) | OK (SMSR per season) | `Results.tsx:338,351` | #6 (5) |
| Map of the parcel | **FAIL** (blank, worker error) | OK (SVG mini-map + north + scale + source) | – | #1 (6) |
| Demo data labelled | OK (`?demo=1` banner, print marker) | OK | `shots/raport-demo-d.jpg` | – |

---

## Brand conformance by route

Status: OK / FAIL / NOTE (works but deviates from the spec or needs a check).

### Global / brand system (lane 2)

| Item (SPEC §) | Status | Evidence | Exact fix | Lane |
|---|---|---|---|---|
| §02 Logo only via `components/brand/Logo`, never typed | OK | grep: all lockups are `<Logo>`; Archivo is never used to type "TRAKTOR" | – | – |
| §02 Minimum size (lockup ≥ 120 px) | OK | the smallest lockup is `height=18` → 137 px wide (`Logo.tsx:27`) | Fix the comment at `Logo.tsx:15` ("Min width 110px" → 120 px), and add a dev assert `height >= 16` | 2 |
| §02 Colourways (cream on forest, forest on cream) | OK | `Logo.tsx:8` allows only forest/cream | Cream-on-soil is allowed by the spec but not needed | – |
| §03 Palette tokens | OK | `globals.css:12-18` hexes match the SPEC; ink variants (`terra-ink #984630`, `water-ink`) are used for small text | – | – |
| §03 Terracotta = rejected sites / warnings only | OK | Used only for: refusal bars and points (/, /mapa), height 60 rejected (/karta), drought level "wysokie", "NIEPEŁNE DANE", missing-data chips, form errors | – | – |
| §03 Ratio (cream 50 · forest 25 …) | OK | Cream dominates on /analiza, /raport, /karta, /metoda; forest blocks alternate on / | – | – |
| §04 Archivo ExtraBold 78% UPPERCASE headlines, leading 0.92–0.98 | OK | `.hd` `globals.css:57-64` (800, 78%, uppercase, 0.93); computed on /, /metoda, /analiza H2 = Archivo 78% 800 uppercase; the variable `wdth` axis loads (62–125%) | – | – |
| §04 Subheads Bold 85% sentence case | OK | `.sh` `globals.css:65-70`; /metoda H2 40 px, home H3 26 px match the scale | – | – |
| §04 Inter body 16–20 px | NOTE | Landing/metoda body is 16–20 px OK; /analiza panel copy is 13–15 px; /raport and /karta sheets use 9.5–11.5 px on screen (`p` sizes measured: 9.5×9, 10.5, 11.5×13) | Raport/karta: keep A4 print sizes under `@media print`, and set at least 12 px for captions and 14 px for body on screen (`narrow`/screen variant) | 7, 8 |
| §04 Tabular figures for all data | OK | `.num` used on stats, tables and chips; probe found no non-tabular numeric cells on /raport, /mapa, /karta | /metoda status column `td.text-[13px]` ("Wczytane: TERYT 0403") → add `num` (`app/metoda/page.tsx`, sources table) | 8 |
| §05 Imagery: flat field pattern | **FAIL** | Hero = 3D render (`ParallaxHero.tsx`); `PointCloud` (`page.tsx:222`, slides) | top 15 #4 | 2, 3 |
| §05 No gradients | **FAIL** (minor) | Scrims: `ParallaxHero.tsx:163-168`, `page.tsx:224` | Once FieldPattern lands, use a solid forest block for the words (§11) instead of gradient scrims | 3 |
| §06 Maps: source line on every map | OK | /analiza panel "Źródło: Ortofotomapa…", /mapa legend, /karta mini-map, /raport mini-map "Źródło: ULDK (GUGiK)" | – | – |
| §06 No hillshade, glow, 3D tilt | OK | No pitch or hillshade in map styles | – | – |
| §07 State tiles: 4 px radius, 36 px padding, 400 ms colour only | OK in code / **FAIL** in layout | `StateTiles.tsx:72,97` | top 15 #2 | 2 |
| §07 Active OTWÓRZ = water blue | NOTE | Uses `water-ink` instead of `#3B7FA3` (`StateTiles.tsx:43`) so 15 px text passes 4.5:1. This is a justified a11y deviation | Note it in SPEC §07 as a repo token decision | 2 |
| §07 TRZYMAJ/OTWÓRZ never translated; Polish UI | NOTE | The landing shows English sublines "Hold water during drought" / "Release water before a forecast storm" (`BoardStates.tsx:136` `showEnglish`) | Drop `showEnglish` on the Polish landing page | 3 |
| §08 Icons: 24 grid, 2 px stroke, no emoji | OK | grep found no emoji; all icons come from `components/brand/Icon` | – | – |
| §09 Buttons: 2 px radius, 1.5 px secondary, 48 px min | OK in `Button` (`ui.tsx:36-44`) / **FAIL** at call sites | see top 15 #8 | – | 4, 6, 7, 8 |
| §09 Card: cream 94%, 4 px, shadow, 24 px | OK | `ui.tsx:66-71` (`bg-cream/95`) | – | – |
| §09 Progress rail: done filled, current ring, to-do outline | OK | `/` (07 steps), `/analiza` (3 steps): current = ring (`shots/analiza-d.jpg`) | – | – |
| §10 Loading = one thin line, no spinners | OK | grep `animate-spin`/`spin` = 0; `ProgressLine` (`ui.tsx:90`); /analiza "Liczymy" + line (`shots/flow-d2018-loading.jpg`) | – | – |
| §10 Text rise 600 ms brand easing | OK | `.rise` (`globals.css:83-95`) | – | – |
| §10 Slow drift 10–14 s | NOTE | Hero drift 9 s (`ParallaxHero.tsx:101`) | 12 s (it goes away with FieldPattern anyway) | 3 |
| §10 Respect `prefers-reduced-motion` | OK | With reduce emulated, 0 running animations on all routes; `globals.css:139-152`; `PointCloud.tsx:29`; `ParallaxHero.tsx:42` | – | – |
| Unused preloaded CSS (console warnings) | NOTE | `19d-1jh7rwcxp.css`, `05-72sqjzu2pj.css` "preloaded but not used" on /, /metoda, /mapa, /raport | Likely maplibre CSS imported in `MapView.tsx:6` and hoisted into the layout chunk. Import it only inside the lazy map module | 6 |

### `/` landing (lane 3)

| Item | Status | Evidence | Exact fix | Lane |
|---|---|---|---|---|
| Hero headline Archivo 78% uppercase 92 px, lh 0.93 | OK | `shots/home-d.jpg` | – | – |
| Hero imagery flat field pattern | **FAIL** | `shots/home-d.jpg` (3D tractor render) | #4 | 2, 3 |
| Hero buttons primary cream / secondary 1.5 px outline, 48 px | OK | `shots/home-d.jpg` | – | – |
| Logo duplicated (nav lockup + hero lockup; section 08 lockup + footer lockup in one viewport) | NOTE | `shots/home-d.jpg`, `shots/home-pilot-d.jpg` | Remove the hero lockup (the nav already has it) and the 40 px lockup at `page.tsx:242-244` (the footer follows directly) | 3 |
| State tiles | **FAIL** | `shots/home-states-d.jpg`, `shots/home-states-m.jpg` | #2 | 2 |
| Mobile nav shows only "Analiza" (others `hidden sm:block`, no menu) | FAIL (usability) | `SiteNav.tsx:28`, `shots/home-m.jpg` | Show all links in a second row or a `<details>` menu below `sm` | 3 |
| Skip link / focus visible | **FAIL** | `shots/home-focus-d.jpg` | #9 | 3 |
| Contrast | **FAIL** | axe, 6 nodes | #10 | 3 |
| Claims and labels | **FAIL** | `page.tsx:140,152,174` | #12 | 3 |
| /slides links | FAIL (after lane 1) | `page.tsx:238`, `SiteNav.tsx:8`, `SiteFooter.tsx:37` | #11 | 1 |
| Footer typo "szacunki.." | FAIL | `SiteFooter.tsx:44` | #14 | 3 |
| PointCloud canvas has no `aria-hidden` | NOTE | canvas `label=null` (probe) | `aria-hidden` on the wrapper at `page.tsx:221` (it goes away with FieldPattern) | 3 |
| Landmarks / lang / single H1 | OK | header, nav, main, footer; `lang=pl`; 1 × H1 | – | – |

### `/analiza` (lanes 4, 5, 6)

| Item | Status | Evidence | Exact fix | Lane |
|---|---|---|---|---|
| Map renders | **FAIL (P0)** | console `Worker failed to load` | #1 | 6 |
| Mobile warning "Map cannot fit within canvas with the given bounds" | NOTE | console on 375 px | Clamp `fitBounds` padding to the canvas size (bottom sheet height) | 6 |
| Panel heading Archivo 78% uppercase; sr-only H1 | OK | `shots/analiza-d.jpg` | – | – |
| Header strip: board icon right of the cream lockup reads as a second mark | NOTE | `AnalizaApp.tsx:485`, `shots/analiza-d.jpg` | Drop the `Icon name="board"` in the "Przykład" link | 4 |
| Date help text in ISO "Od 2016-11-22 do 2026-11-22" | NOTE | `shots/analiza-d.jpg` | "Od 22.11.2016 do dziś (do 10 lat wstecz)." | 4 |
| Live region text "pięciu źródeł" | FAIL | `AnalizaApp.tsx:194` | #14 | 4 |
| Result says "dziś" for a past date; "1 z 11"; IUNG vs SMSR; "miesiące 7, 8" | **FAIL** | `Results.tsx:252,308,338,347,351` | #5, #6 | 5 |
| Result eyebrow "02 — WYNIK" sits above the H2 "SPRAWDŹ DZIAŁKĘ" after scrolling | NOTE | `shots/flow-d2018-result.jpg` (top) | The eyebrow should follow the visible section, or keep "01 — DANE DZIAŁKI" on the form | 4 |
| "WYNIK ANALIZY" heading shows a boxed outline after programmatic focus | NOTE | `shots/flow-d2018-result.jpg` | Add `outline-none` on `tabIndex=-1` headings that are focused programmatically (keep `:focus-visible` for keyboard) | 5 |
| Satelita/Mapa + zoom buttons 44 px | FAIL (brand) | probe | #8 | 6 |
| Skip link, focus ring, landmarks, axe | OK | axe 0 violations; skip link "Przejdź do panelu analizy" | – | – |
| Loading = progress line, no spinner | OK | `shots/flow-d2018-loading.jpg` | – | – |

### `/raport` (lane 7)

| Item | Status | Evidence | Exact fix | Lane |
|---|---|---|---|---|
| Logo, header, NIEPEŁNE DANE stamp (terracotta = warning) | OK | `shots/raport-demo-d.jpg` | – | – |
| Sections 01–07: status, causes, retention, agro, irrigation, limitations, sources | OK | `shots/raport-2018-full.jpg` | – | – |
| "pow. powiat …" | FAIL | `ReportSheet.tsx:295` | #14 | 7 |
| Duplicated irrigation text | FAIL | `shots/raport-2018-full.jpg` section 05 | #14 | 7 |
| Screen font sizes 9.5–11.5 px | NOTE | probe | Screen at least 12/14 px; print stays as it is | 7 |
| Toolbar buttons 44 px | FAIL (brand) | `RaportApp.tsx:191` | #8 | 7 |
| Refetch on open from /analiza | FAIL | `shots/raport-refetch-d.jpg` | #13 | 7, 9 |
| "Obliczenia: … metoda traktor-analiza 0.2 (SMSR: okna od 21.III do daty, ETP SMSR; progi do kalibracji)" in the header | NOTE (tone) | `shots/flow-m-today-raport.jpg` | Header: "Obliczenia: 8,4 s". Move the method string to section 07 | 7 |
| PDF | OK | 3–4 pages, tagline footer, demo marker on each page | – | – |
| axe / skip link / landmarks | OK | 0 violations; "Przejdź do raportu" | – | – |

### `/mapa` (lane 6)

| Item | Status | Evidence | Exact fix | Lane |
|---|---|---|---|---|
| Source line, legend, scale, north | OK | `shots/mapa-d.jpg` | – | – |
| Terracotta only for rejected points and refusal bars | OK | `shots/mapa-d.jpg` | – | – |
| Button heights 32–36 px | FAIL (brand) | probe | #8 | 6 |
| "Prezentacja" link to /slides | FAIL (after lane 1) | `Chrome.tsx:96` | #11 | 1 |
| 2 SVGs without a name or `aria-hidden` | NOTE | probe `svgNoLabel=2` | Add `aria-hidden` to decorative SVGs in `components/map/Overlays.tsx` | 6 |
| Mobile bottom sheet, no overflow | OK | `shots/mapa-m.jpg` | – | – |
| axe / skip link | OK | 0 violations | – | – |

### `/karta` (lane 8)

| Item | Status | Evidence | Exact fix | Lane |
|---|---|---|---|---|
| Card layout, PRZYJĘTE chip (agri), source lines, cross-section | OK | `shots/karta-d.jpg`, `shots/karta-m.jpg` | – | – |
| Height chips and Print button 40 px | FAIL (brand) | `SiteCard.tsx:207` and the height chips | #8 | 8 |
| Body sizes 10–11 px on screen | NOTE | probe | Same as raport | 8 |
| axe / skip link / landmarks | OK | 0 violations | – | – |

### `/metoda` (lane 8)

| Item | Status | Evidence | Exact fix | Lane |
|---|---|---|---|---|
| H1 78% uppercase, H2 85% sentence case, forest/cream blocks | OK | `shots/metoda-d.jpg`, `shots/metoda-full.jpg` | – | – |
| Tabular numbers in the status column | NOTE | probe | Add `num` | 8 |
| /slides link in nav/footer | FAIL (after lane 1) | shared SiteNav/SiteFooter | #11 | 1 |
| axe / skip link | OK | 0 violations | – | – |

### `/slides` (lane 1)

| Item | Status | Evidence | Exact fix | Lane |
|---|---|---|---|---|
| Route still exists (200) | FAIL | `shots/slides-d.jpg` | Remove it (lane 1 task) and add a redirect | 1 |
| Point cloud, curved ditch, gradients | FAIL (§05) | `shots/slides-d.jpg` | Goes away with the removal | 1 |
| Keyboard: Tab alternates between a 1×1 sr-only button and `body` | FAIL | probe | Goes away with the removal | 1 |

### 404 (lane 8)

| Item | Status | Evidence | Exact fix | Lane |
|---|---|---|---|---|
| Branded Polish 404 | **FAIL** | `shots/404-d.jpg`, `shots/404-m.jpg` | #3 | 8 |

### Engine / API (lane 9)

| Item | Status | Evidence | Exact fix | Lane |
|---|---|---|---|---|
| Contract fields present (parcel, crop, assessment, causes, recommendations, irrigation, uncertainty{reasons,missing,notConsidered}, sources{status,fetchedAt,licence}) | OK | `live-*.json` (curl) | – | – |
| `summaryPl` length and jargon | FAIL | 566 / 531 chars | #7 | 9 |
| Cause without sources | FAIL | `analyze.ts:528,812` | #14 | 9 |
| Overpass 8 s, then missing | FAIL | sources[BDOT10k].ms = 8019 / 8014 | #15 | 9 |
| Today: "−12 mm (5. percentyl na tle 10 lat)" next to level **niskie** confuses | NOTE | `live-today.json` | Outside 21.III–30.IX, don't print a percentile in the first sentence; say "Poza sezonem suszy. Ocena z ostatniego sezonu i gleby." | 9 |
| Cache eviction on aborted duplicate (suspected) | NOTE | top 15 #13 | Repro, then guard | 9 |
| Silent `next start` exit (code 1) | NOTE | once, not reproduced | Add `process.on('unhandledRejection')` logging | 9 |

---

## WCAG 2.2 AA spot checks (summary)

| Criterion | Result | Where |
|---|---|---|
| 1.4.3 Contrast (min) | FAIL on `/` (6 nodes: 3.49:1 and 4.41:1); other routes 0 axe violations | `page.tsx:88,123`, `BoardStates.tsx:142,146` |
| 1.4.11 Non-text contrast | OK (inputs use a 1.5 px forest border; chips have a border + word) | – |
| 2.4.1 Bypass blocks | FAIL on `/` (no skip link); OK elsewhere | `app/page.tsx:72` |
| 2.4.7 / 2.4.11 Focus visible / not obscured | FAIL on `/` (logo link forest on forest); OK elsewhere (cream on dark, forest on cream, maplibre canvas inset ring) | `SiteNav.tsx:23` |
| 2.5.8 Target size (minimum 24 px) | OK (the smaller targets are inline links or meet the spacing exception) | – |
| 1.3.1 Headings / landmarks | OK (1 × H1 per route, header/main/footer); 404 has none | 404 |
| 1.1.1 Alt text | OK (hero layers are `alt=""` decorative; Logo `role=img aria-label=TRAKTOR`); PointCloud canvas lacks `aria-hidden` | `page.tsx:221` |
| 3.1.1 Language | OK `lang=pl` on all routes; English fragments carry `lang="en"` | – |
| 2.3.3 / reduced motion | OK (no running animations under reduce) | – |
| 2.1.1 Keyboard | OK except /slides (to be removed); state tiles are a radiogroup with roving tabindex | `StateTiles.tsx:83-106` |
| 1.4.10 Reflow (375 px) | OK on all routes (no horizontal overflow); state tile text overflows its box | #2 |
| scrollable-region-focusable (axe) | FAIL on `/` mobile | `page.tsx:112` |

---

## Tone of voice (§12 "Short. Plain. Sure."): off-tone sentences with Polish rewrites

| # | Where | Current | Suggested | Lane |
|---|---|---|---|---|
| 1 | `app/page.tsx:152` | "Siedem publicznych źródeł. Zero licencji." | "Siedem publicznych źródeł. Bez opłat." | 3 |
| 2 | `app/page.tsx:174` | "Model językowy tylko tłumaczy wynik na prosty polski. Strażnik liczb sprawdza, że nie zmienił żadnej wartości." | "Teksty składamy z gotowych zdań. Liczby idą prosto z obliczeń." | 3 |
| 3 | `app/page.tsx:229` | "Zindeksujemy jego dzierżawy i zweryfikujemy 10 miejsc ze spółką wodną tej wiosny." | "Sprawdzimy jego dzierżawy. Wiosną ze spółką wodną obejrzymy 10 miejsc." | 3 |
| 4 | `app/page.tsx:140` + `lib/traktor/copy.ts:15` | "dane demonstracyjne · …" + "Dane rzeczywiste: BDOT10k, NMT 1 m, ULDK (GUGiK). Retencja, hektary i dni zapasu to wstępne szacunki." | "Przykład spod Bydgoszczy. Rowy, teren i działki: dane GUGiK. Retencja i hektary: szacunek." | 3 |
| 5 | `BoardStates.tsx:136` | "Hold water during drought" / "Release water before a forecast storm" (on a Polish page) | Remove (the Polish lines already say it) | 3 |
| 6 | `app/page.tsx:24-36` | Eyebrows "Grounded / Reversible / Precise" | Remove on the PL page, or use "Ugruntowany · Odwracalny · Precyzyjny" (already the H3s, so remove) | 3 |
| 7 | engine `assessment.summaryPl` (2018) | "Ryzyko niedoboru wody na 20 lipca 2018: wysokie. Najgorsze okno SMSR w tym sezonie: 11.V–10.VII: KBW −205 mm (ETP SMSR; z ET0 FAO −186 mm), próg −224 mm (kukurydza, kat. III): bez suszy. Trwające okno …" | "Ryzyko suszy 20.07.2018: wysokie. W glebie brakuje 106 mm wody, a rośliny cierpią od 97 mm. Od maja spadło o 205 mm mniej wody, niż wyparowało; próg suszy to 224 mm." | 9 |
| 8 | engine `assessment.summaryPl` (today) | "Ryzyko niedoboru wody dziś: niskie. Bilans opadu i parowania (ET0 FAO-56) z 60 dni do 19 listopada 2026: −12 mm (5. percentyl na tle 10 lat). … Dojrzewanie lub żniwa: spadek NDVI naturalny, nawadnianie i lustracja łanu nie mają sensu." | "Ryzyko suszy dziś: niskie. Jest po żniwach, więc woda nie zmieni plonu. W ostatnim sezonie suszy nie było." | 9 |
| 9 | engine `irrigation.timingPl` | "Na dzień 20 lipca 2018 zalecenie brzmiałoby: jednorazowo ok. 30 mm netto (kat. III: gleba zatrzyma najwyżej tyle; brutto ok. 33–40 mm zależnie od sprzętu), rano lub wieczorem. Ubytek ok. 106 mm uzupełniać w 4 dawkach co ok. 8 dni. …" | "Podlej 30 mm (300 m³/ha), rano lub wieczorem. Powtarzaj co 8 dni, razem 4 razy. Pomiń dawkę, jeśli spadnie 30 mm deszczu." | 9 |
| 10 | engine `irrigation.timingPl` | "nie nawadniać." | "Nie podlewaj teraz." | 9 |
| 11 | `components/raport/format.ts:122` | "Rekomendacje mają charakter przesiewowy; przed inwestycją wymagana wizja lokalna." | "To wstępna ocena. Przed budową obejrzyj miejsce." | 7 |
| 12 | `ReportSheet.tsx:618` | "Raport przesiewowy z danych zdalnych. Nie zastępuje opinii agronoma, projektu ani pozwolenia." | "Raport z danych zdalnych. Nie zastępuje agronoma, projektu ani pozwolenia." | 7 |
| 13 | raport header "Obliczenia" | "… metoda traktor-analiza 0.2 (SMSR: okna od 21.III do daty, ETP SMSR; progi do kalibracji)" | "8,4 s" (move the method to section 07) | 7 |
| 14 | `AnalizaApp.tsx:194` | "Analiza rozpoczęta. Pobieramy dane z pięciu źródeł." | "Liczymy. Pobieramy dane z 8 źródeł." | 4 |
| 15 | `Results.tsx:347` | "Bilans wodny w okresie krytycznym (miesiące 7, 8), ostatnie 11 sezonów" | "Bilans wody w lipcu i sierpniu, 2008–2018" | 5 |
| 16 | `lib/analiza/satellite.ts:391` (+ preceding lines) | "Przy słabym pokryciu roślinnością NDMI opisuje głównie wilgotność powierzchni gleby. Satelita tylko potwierdza sygnał z bilansu wodnego, nie rozstrzyga sam." | "Rośliny są rzadkie, więc satelita widzi głównie glebę. Traktuj to jako podpowiedź, nie dowód." | 9 |
| 17 | `app/metoda/page.tsx` lead | "Gdy czegoś nie wiemy, mówimy nie." | "Gdy czegoś nie wiemy, mówimy to wprost." | 8 |

---

## Console / runtime errors

| Route | Message | Lane |
|---|---|---|
| /analiza (all viewports) | `Failed to load module script: … MIME type "text/html" … /analiza` → `Error: Worker failed to load. Check that the worker URL is correct.` | 6 (#1) |
| /analiza 375 px | `Map cannot fit within canvas with the given bounds, padding, and/or offset.` | 6 |
| /, /metoda, /mapa, /raport | `The resource …/_next/static/chunks/19d-1jh7rwcxp.css / 05-72sqjzu2pj.css was preloaded using link preload but not used` | 6 |
| /nie-ma-takiej | 404 (expected) but the default Next page | 8 (#3) |
| server (`next start`) | No errors logged during the audit; one silent exit with code 1 (not reproduced) | 9 |

---

## Screenshot index (`docs/review3/shots/`)

`home-d/m`, `home-full`, `home-states-d/m`, `home-refusal-d`, `home-pilot-d`, `home-focus-d`, `analiza-d/m`, `flow-d2018-loading/result/raport`, `flow-m-today-loading/result/raport`, `raport-demo-d/m`, `raport-demo-full`, `raport-2018-full`, `raport-refetch-d`, `mapa-d/m`, `karta-d/m`, `karta-full`, `metoda-d/m`, `metoda-full`, `slides-d/m`, `404-d/m`.
