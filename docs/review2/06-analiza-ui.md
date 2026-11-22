# Review #6: /analiza UI vs engine contract

Scope: the committed `HEAD` (5833927) versions of `web/src/components/analiza/{AnalizaApp,MapView,Results,api,fixture}.tsx|ts` and `app/analiza/page.tsx`, checked against `lib/analiza/types.ts`, `lib/analiza/server.ts`, `app/api/analiza/route.ts` and `app/api/dzialka/route.ts`. Line numbers refer to HEAD.
Working tree: a redesign is in progress (Results +/-668, AnalizaApp +/-331). It changes visuals (LevelTag, marker tones, parcel line 1 px, uncertainty meter) and does **not** fix any item below. I checked this by grepping the diff for AMBIGUOUS, candidates, error codes, fetchedAt and basedOn.

## What works
- **Flow follows the brief order.** Parcel → crop → date → tabs: Ocena (current + 10-year level, summary, weather, KBW chart, satellite, soil/terrain) → Przyczyny → Retencja → Agrotechnika → Nawadnianie (opcjonalne) → Niepewność i źródła (Results.tsx:8-15, 368-600). Every required element of `AnalysisResult` is shown: causes with evidence and weight, recommendations with why/how/where/legal, irrigation decision/deficit/dose/timing, uncertainty (reasons, missing, not considered), and a sources table with status, detail, licence and link.
- **Missing data is explicit.** `fmt()` renders null as "brak danych" (api.ts:93). Source chips mark `missing` as "· brak" (Results.tsx:38-47). There are fallbacks for no satellite scene, no seasons and no causes.
- **Inputs.** All 10 `CROPS` are offered. The date input has `min`/`max` (today−10 y … today) with a hint and validation (AnalizaApp.tsx:219, 464-479). Errors are linked via `aria-describedby`, and focus moves to the first invalid field (:221-224). Server validation matches (server.ts:28-32).
- **URL state.** `parcelId/crop/date` are written with `replaceState` on run (:106-110) and restored on load, with an auto-run when all three are present (:145-162). The crop from the URL is validated against `CROPS`.
- **Race safety.** `runId` drops stale responses (:99, 112).
- **Loading.** An elapsed-seconds counter shows "Zwykle 10–30 s", lists the sources and announces every 5 s (:127-137, 498-516). The client timeout is 45 s (api.ts:10), above the server budget (24 s, `maxDuration` 30). There is a retry button (:525-532).
- **Raport link** reuses `parcelId/crop/date`, the same names `RaportApp` reads (:265-267).
- **MapLibre.**
  - Basemaps: GUGiK ORTO **WMTS EPSG:3857** (MapView.tsx:19-20), EOX `s2cloudless_3857` = **2016 layer, CC BY 4.0** (:30-34), OSM, and a KIEG parcel WMS from z15.
  - The parcel outline uses fill + halo + line, and `fitBounds` pads for the side panel or bottom sheet (:89-93, 172-197).
  - Markers are numbered `<button>`s with `aria-label`/`aria-pressed` (:230-252).
  - On unmount, markers are removed and `map.remove()` is called (:149-154). Callbacks go through refs, so there are no re-inits. Reduced motion is respected.
- **Accessibility essentials.** Skip link, sr-only h1, a polite live region (:494), `role=alert` on errors, an ARIA tabs pattern with arrow/Home/End keys (Results.tsx:285-299, 344-367), an sr-only data table for the chart, a 16 px inputs/44 px targets baseline, and a map region label that describes the parcel and markers.
- **Fixtures are labelled.** The banner reads "Dane przykładowe (fixture), nie wynik obliczeń" (Results.tsx:338-342). The dev panel is shown only when `NODE_ENV !== "production"` or `?demo=1`.

## MISSING / NOT READY

### P0 (breaks a brief requirement or the demo)
1. **AMBIGUOUS has no candidate picker.** `/api/dzialka` and `/api/analiza` return 409 `{error:"AMBIGUOUS", candidates:[…]}`. The engine message even says "Wybierz właściwą z listy" (uldk.ts:87). But `getJson` throws away everything except `messagePl` (api.ts:16-18), so the user is told to pick from a list that does not exist.
   - Fix: return `{code, messagePl, candidates}` from `getJson`/`Fetched`.
   - On `AMBIGUOUS`, render a radio list or buttons (`id`, `commune`, `county`, `region`). Choosing one calls `loadParcelById(c.id)`.

### P1 (should fix before the demo)
2. **Short parcel forms never reach the engine.** The client's `looksLikeParcelId` accepts only `^\d{6}_\d\.` (api.ts:5-6). The engine accepts "obręb + numer" text (uldk.ts `looksLikeParcelId`: letters, digits, `./-_` and a digit). So "Zakrzewo 306/2" is sent to Nominatim and fails, and the AMBIGUOUS path is never reached.
   - Fix: when the query contains a digit and a `/` or `.`, try `/api/dzialka?id=` first, then fall back to geocoding.
3. **All error codes get the same UI.** Every failure renders as "Analiza nie powiodła się / Nie udało się pobrać danych: {msg}. Spróbuj ponownie." with a retry button (AnalizaApp.tsx:519-533).
   - `NOT_AGRICULTURAL` (422), `parcel_too_large` (422), `parcel_not_found` (404), `bad_date`/`bad_crop` (400) are not retryable. For these, show the engine message, hide "Spróbuj ponownie" and offer "Wybierz inną działkę".
   - `rate_limited` (429) and `busy` (503): retry with a short countdown.
   - Timeout: say "serwer nie odpowiedział w 45 s".
   - The copy currently produces a double full stop: "…tej działki.. Spróbuj".
4. **`tooLarge` from `/api/dzialka` is ignored** (route.ts:19). A parcel over 500 ha is selected, the user waits, and only then gets a 422. Fix: warn at selection time and disable "Analizuj".
5. **Parcel ID help is minimal.** There is only an example in the label (AnalizaApp.tsx:308-310). Nothing says where to find the number (wypis z rejestru, Geoportal, e-wniosek ARiMR) or which formats are accepted (full TERYT id, "obręb numer", `-` or `\` instead of `/`). Fix: add a one-line hint plus a `<details>` with the formats.
6. **Mobile bottom sheet is not collapsible in HEAD.** It is `max-h-[55vh]`, always open (:370), and covers half the map. On phones the result tabs and the map compete. The commit message 7ec9bab says "collapsible bottom sheet", but I could not find it in this component. Fix: add a drag/toggle handle with `aria-expanded`, collapsed by default once a result exists.

### P2 (polish / honesty)
7. **Sources table shows fetch duration (`ms`), not `fetchedAt`** (Results.tsx:565, 591). The dataset period is often in `detail` (for example "NASA POWER … 2016-01-01..2026-11-22", "scena … (2026-11-15)"), but the brief asks for sources with dates. Fix: add a "Pobrano" column showing `fetchedAt` as a local date and time.
8. **`?demo=1` loads the fixture in production.** It also shows the "Tryb deweloperski" block (:152-156, 553). That is acceptable for a pitch, but the "Raport (PDF)" link then opens a **live** report for the fixture parameters, so the two views won't match. Fix: append `&demo=1` to `raportHref` when `isFixture`.
9. **Silent fixture parcel in production.** `fetchParcel` returns `FIXTURE_PARCEL` for the demo id whenever the server fails (api.ts:40-41), even in production. It is labelled, but the analysis then runs live on fixture geometry. Fix: limit this to dev or `demo=1`.
10. **The date from the URL is not validated** before the auto-run (:151-156), so a bad URL produces a generic error. Also, `todayIso()` uses browser-local time while the server uses `todayPL()`, so a user outside Poland near midnight gets a "future date" 400. Fix: validate the URL date against min/max and compute today in Europe/Warsaw.
11. **No cancel during loading.** Changing the parcel during a run still shows the old result's phase. Fix: add an AbortController and a "Przerwij" button.
12. **Uncertainty appears only on tab 6.** Fix: show the `uncertainty.level` badge next to the two level badges in Ocena. The redesign adds a meter; check where it lands.
13. **Per-recommendation `basedOn` is not shown.** There is only a generic footer listing all causes (Results.tsx:620-624). Fix: add "Wynika z: {causeTitle(basedOn)}" on each RecCard.
14. **Unused fields.** `satellite.history`, `meteo.monthly`, `textSource` and `methodVersion` are not rendered. At minimum, show `methodVersion` and `textSource` ("tekst z szablonu").
15. **Focus after results** goes to a div with no label (`resultRef`, :141, 518). Fix: focus the `#wyniki-h` / `#err-h` heading instead.
16. **Duplicate announcements.** The live region, `#q-msg role=status` and `role=alert` all speak on parcel select and on errors. Fix: pick one per event.
17. **`tile.openstreetmap.org` as the "Mapa" basemap** (MapView.tsx:46) is not allowed for production-heavy use under the OSM tile policy. Fine for the demo; note it in the handover.
18. **Stale comment.** MapView.tsx:15-16 still says "EOX … 2020" and "WMS" while the code uses EOX 2016 and WMTS, and the constant is still named `ORTO_WMS`.
19. **Nominatim is called from the browser.** It is allowed by the CSP `connect-src https:` and throttled to 1 request/s, but it sends the user's query to a third party. Mention this in the privacy note.

## Verdict
**Not ready.** The happy path is solid and on-brief: all six result sections, explicit missing data, sources, URL state, accessible tabs, correct GUGiK WMTS 3857 and EOX 2016 basemaps, and clean MapLibre lifecycle. The contract is only half-consumed, though. Error codes and `candidates` are dropped in `getJson`, so AMBIGUOUS, NOT_AGRICULTURAL and too-large parcels all degrade into a generic "spróbuj ponownie". Short parcel numbers bypass the engine entirely. Fix items 1–3 in `api.ts` + `AnalizaApp.tsx`; it is about 60 lines, all inside the analiza folder, and can be coordinated with the redesign agent. Then fix 4–6, and /analiza is demo-safe.
