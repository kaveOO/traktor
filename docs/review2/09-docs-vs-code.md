# Review 2 / #9: documentation and submission deliverables vs actual code

Scope: README.md, docs/{ZGLOSZENIE,LICENCJE,THIRD_PARTY_NOTICES,PRZEKAZANIE}.md, deliverables/**. Checked against `main` at 5833927 plus the uncommitted working tree (22.11.2026). Read-only review.

## A. The biggest problem: docs say the engine is not merged, but it is
Commit `8ef08a1 merge: v2 engine lane` put `web/src/lib/analiza/{analyze,meteo,power,soil,terrain,uldk,smsr,server}.ts` and `app/api/{analiza,dzialka}` on `main`. The docs still describe the engine as unfinished in these places:

| # | Claim | File:line | Fact in code | Fix |
|---|---|---|---|---|
| A1 | Engine row: "**w trakcie** (gałąź v2/engine, jeszcze nie na main)" | README.md:18 | merged; routes exist (`app/api/analiza/route.ts`, `dzialka/route.ts`) | change to "gotowe" |
| A2 | `/analiza` "liczy wynik po scaleniu silnika" | README.md:17 | the wizard calls `/api/analiza` | change to "gotowe" |
| A3 | Banner "Moduły v2 powstają… nie są jeszcze scalone" | README.md:8 | false | rewrite as a frozen-version note |
| A4 | "Przepływ /analiza (w trakcie)" | README.md:55 | implemented | remove "(w trakcie)" |
| A5 | "na main jest satellite.ts i kontrakt, reszta w gałęzi silnika" | README.md:106 | all modules are on main | delete the sentence |
| A6 | Limitation "Silnik nie jest jeszcze scalony z main" | README.md:213 | false | delete the bullet |
| A7 | Rate limit + cache "(w trakcie, razem ze scaleniem silnika)" | README.md:263 | done: `server.ts:57` (30/min per IP), `dzialka` 60/min, cache 1 h / 200 entries, `MAX_CONCURRENT=4` | mark done, add the dzialka limit and the concurrency cap |
| A8 | Raporty "po scaleniu silnika" | README.md:297, deliverables/README.md:25-28 | engine ready, reports can be generated now | generate them (see B3) |
| A9 | Item 6: "Silnik… nie jest jeszcze na main" | deliverables/README.md:25, :87 | false | update, drop step 2 of "Ostatnie kroki" |
| A10 | "Do scalenia /analiza pokazuje interfejs" | README.md:213 | — | delete |
| A11 | "kod (main i gałąź silnika v2/engine)" | docs/LICENCJE.md:3 | everything is on main | "kod na main @ SHA" |

## B. MISSING / NOT READY

| P | Item | Where | Fix |
|---|---|---|---|
| **P0** | Team name placeholder `<NAZWA ZESPOŁU>` (pkt 4.1 item 1) | README.md:291,317; ZGLOSZENIE.md:3; opis-rozwiazania.md:3; deliverables/README.md:5 | fill in all 5 places |
| **P0** | No working-version link `<LINK DO WERSJI DZIAŁAJĄCEJ>` (the run instructions are an acceptable alternative, but the placeholder must not be shipped) | README.md:37; deliverables/README.md:10; demo-final.md:7 | deploy, or replace with "uruchomienie lokalne, pkt 1" |
| **P0** | Film `<LINK DO FILMU>` (mandatory item 4.1) | README.md:296; deliverables/README.md:11 | record and link |
| **P0** | Generated reports: only `raport-demo-DANE-PRZYKLADOWE.pdf` (fixture). The brief requires reports produced by the prototype | deliverables/raporty/ | 2–3 real parcels (PDF + JSON), today and −5 years. The engine is ready |
| **P0** | Submitted commit `<SHA>`; repo must be pushed and access verified | deliverables/README.md:9, dostep-jury.md §0 | push, fill in the SHA, run the 404 privacy test |
| **P1** | `prezentacja.pdf` is stale: exported 09:30, slides changed 09:43 (`slides.tsx:123,153,437` now say NASA POWER). The "Uwagi do slajdów" (ERA5, "bez licencji") in deliverables/README.md:76-82 refer to the old PDF | deliverables/prezentacja.pdf | re-export, check ≤ 10 pages, delete or update the notes section |
| **P1** | **The Open-Meteo ERA5 archive IS called live** by `/mapa`: `MapApp.tsx:92` → `/api/traktor/conditions` → `app/api/_lib/conditions.ts:48` `archive-api.open-meteo.com` (+ forecast + IMGW). Docs say the archive is "nieużywane" and that `/mapa` is pre-downloaded only | README.md:119,138; LICENCJE.md:27 | README §4/§5: add the "/mapa: warunki live (Open-Meteo forecast + archive 60 d, IMGW)" row; LICENCJE row 27 → "używane tylko na /mapa (warunki 60 dni), Copernicus C3S attribution" |
| **P1** | Demo test-parcel table empty (`<numer>` ×5, no times). README §9.5 points to it as the verification evidence | demo-final.md:41-48; README.md:232 | fill in the table after running the engine |
| **P1** | demo-final.md:39 says `docs/review/10-jury-test-set.md` "jeszcze nie istnieje". It exists | demo-final.md:39 | link it and copy the parcels from it |
| **P1** | Undocumented API routes: `/api/health`, `/api/traktor/{conditions,explain,order,parcel,scenario/[name]}`. README §3 lists only analiza/dzialka/tiles | README.md:104-108 | add one line per route. `/api/health` returns `demo: true` and reads `VERCEL_GIT_COMMIT_SHA`: check that this is intended |
| **P2** | WCAG table: every row "w trakcie", but commit 7ec9bab implemented the skip links, keyboard map, aria, reduced motion and reflow | README.md:271-283 | update each row against review #4 results (only claim what is tested) |
| **P2** | The NWRM catalogue lists "zadrzewienia". The engine has no such recommendation; it has `walowanie`, `odmiana_termin`, `lustracja` (analyze.ts:476,490,502) | README.md:71 | match the catalogue to the ids in analyze.ts |
| **P2** | `web/.env.example` exists (tracked) but README §1 does not mention it | README.md:39 | "skopiuj `web/.env.example` → `web/.env.local`" |
| **P2** | The library table omits `@types/*`. Fine, but NOTICES is the full list. sharp is listed. OK | README.md:154 | — |
| **P2** | Scalability claims "Kolejka dla odczytów Sentinel-2" and "Warstwy krajowe liczone z góry per powiat" read as if they exist. Code has only a global `MAX_CONCURRENT=4` for analyses, with no per-powiat layers | README.md:242-243 | prefix with "W produkcji:" / "plan" |
| **P2** | "data … do 10 lat wstecz": validation `shiftYears(today,-10)` is OK, and future dates are rejected. OK | — | — |
| **P2** | PRZEKAZANIE §5: `methodVersion` is set (analyze.ts:692). Cache 200 / 1 h matches. OK | — | — |

## C. Claims checked and correct (✓)
- Sources actually called: ULDK (`uldk.ts`), NASA POWER (`power.ts`, `meteo.ts`, 0.1° cell, disk cache in tmp, TTL 12 h), Open-Meteo forecast `past_days=92&forecast_days=10` (`power.ts:126`), IMGW (`meteo.ts`), Planetary Computer then Earth Search (`satellite.ts`, 5-year baseline), IUNG WCS `sgeo.iung.pl`, SoilGrids `rest.isric.org`, NMT `services.gugik.gov.pl`, Overpass (2 mirrors, both in LICENCJE), GUGiK WMTS, KIEG `integracja.gugik.gov.pl`, EOX `s2cloudless_3857` (= the 2016 layer, CC BY), OSM tiles, Nominatim (client-side, 1 request/s, `api.ts`). ISOK is only a link (`analyze.ts:137`), and the docs say so.
- Budgets: 20 s per-source deadline and 24 s total (`analyze.ts:56,85`), `maxDuration=30`. Matches README:106.
- Versions: next 16.4.6, react 19.3.0, tailwind 4.3.3, maplibre ^6.19, geotiff ^3.0. Matches package.json.
- Security headers: CSP, nosniff, Referrer-Policy, frame-ancestors present in `next.config.ts`. `.env.local` is gitignored. Input validation matches README:262.
- `textSource: "template"` (analyze.ts:691). LLM only in `/api/traktor/explain`. The AI-tools statement (Claude/OpenCode, no AI images) is present in README §6 and LICENCJE §5.
- Licences for NASA POWER, Planetary Computer (marked "(sprawdzić)"), Earth Search, EOX, Nominatim, Overpass, IUNG ("brak jawnej licencji") are all present. Paid services (Google, Anthropic) are flagged off, with cost and alternatives.
- The 10 crops and the 6 cause ids match README:68-70.
- The routes listed in README:303 all exist. `TRAKTOR_PLAN_v2.html`, `research/`, `scripts/lanes.ps1` and `orto-bydgoszcz-west.jpg` exist.

## D. Clean Windows machine: run instructions (mental test)
1. Node 22: `web/.nvmrc` = 22 and engines `>=20.9`, consistent. README says "22 LTS lub nowszy". OK.
2. `npm install` works (lockfile present). `npm run build` **needs internet at build time** (`next/font/google` downloads Archivo/Inter). Not stated. P2: add "build wymaga internetu".
3. No env vars are required. All keys are optional. OK.
4. `npm run start -- -p 3010` works on PowerShell. OK.
5. `scripts/geo`: README uses `npm install`, PRZEKAZANIE uses `npm ci`. Both work. The DuckDB extension download needs internet (PRZEKAZANIE says so, README does not). P2.
6. Port 3000 for dev is stated. OK.

## E. Scalability / cost and security sections
- The cost table is labelled "szacunki, do potwierdzenia". Acceptable. Two scalability bullets read as implemented (B, P2).
- The security section is accurate except A7 (the rate limit is already done, the doc says "w trakcie"). The `npm audit` claim refers to the earlier review. Re-run it after the engine merge, because geotiff was added (P2).

## Verdict: are the submission docs ready? **NO, not yet.**
The content is good: the 9 README items of pkt 4.2 are all present and the source and licence claims match the code. But:
(1) 11 statements still say the engine is unmerged. A juror who runs the app will see this contradiction.
(2) Five P0 gaps remain: team name, film, real reports, SHA/push, and the online-link placeholder.
(3) The PDF is stale.
(4) The live ERA5 archive call on `/mapa` is undocumented.
Fixing A + B-P1 takes about 1 hour of editing. The P0 items depend on people (name, film, deployment).
