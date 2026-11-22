# 10 · Legacy v1 code, lint, bundle, repo hygiene, headers (read-only)

Date 2026-11-22. Bundle numbers come from a clean `next build` of HEAD `5833927`, built in a throwaway worktree (`traktor-wt2/qa-lint`, removed afterwards). The build passed: 18 routes, TypeScript clean. Lint was run on the primary `web/` working tree, which includes the uncommitted changes. Headers were checked against `next start -p 3097` on that build.

## 1. Legacy v1 code still shipped
The v1 routes `/mapa`, `/karta`, `/metoda`, `/slides` and `/api/traktor/{conditions,order,parcel,scenario,explain}` are all built and reachable. Only `/mapa` uses `/api/traktor/conditions` (`components/map/MapApp.tsx:92`). Nothing in `components/` calls `explain`, `order`, `parcel` or `scenario`, so they are dead to the UI. Only curl or old docs reach them.

**How users move between v1 and v2:**
- **The landing page has zero links to `/analiza` or `/raport`.** The hero CTA "Zobacz bezpieczne miejsca" goes to `/mapa?site=S-007…` (`app/page.tsx:89`). The other CTAs go to `/mapa` (`:164`, `:255`), `/metoda` (`:201`) and `/slides` (`:258`).
- The nav (`components/landing/SiteNav.tsx:6-8`) has Miejsca → `/mapa`, Dane → `/metoda`, Prezentacja. The footer (`SiteFooter.tsx:17-32`) links `/mapa`, `/metoda`, `/karta`, `/slides`.
- The whole landing pitch is v1: one wooden check dam (zastawka), TRZYMAJ/OTWÓRZ, the synthetic gmina west of Bydgoszcz.
- v2 links back to v1: `/analiza` has "Przykład: zastawki" → `/mapa` (`AnalizaApp.tsx:329`). Only the slides link forward to `/analiza` (`components/slides/slides.tsx:210`). `/raport` → `/analiza` is fine.
- `/metoda` documents the v1 pipeline ("Osiem kroków od rowu do rankingu", rules "pierwsza pasująca wygrywa", `CRESTS`, `THRESHOLDS`; `app/metoda/page.tsx:138-151`). It does not cover the v2 sources (ULDK, NASA POWER, SMSR, IUNG, SoilGrids, NMT, S2).
- So a juror who opens `/` never sees the product the brief asks for (parcel → analysis → report).

**`real-data.json` (1.36 MB) through the barrel.** `lib/traktor/index.ts` re-exports `mock.ts`, so any value import from `@/lib/traktor` pulls the dataset in. This was confirmed in the build: chunk `1g2sg7f32twgp.js` is 1 335 KB raw and appears on `/mapa`, `/karta` and `/slides`.
- `/slides` only needs strings plus `summary`: `components/slides/Deck.tsx:6` (`TAGLINE_EN`) and `slides.tsx:11-18` (`summary`, `FACTS`…).
- `/`, `/metoda` and `SiteFooter` import from the barrel too, but they are server components, so they stay clean.
- The v2 code is clean. `ReportSheet` and `brand/data.tsx` import from `@/lib/traktor/copy`. `@/lib/analiza/index.ts` re-exports only `types` and `crops`.

**Keep / hide recommendation:**
Keep `/mapa` and `/karta` as a labelled "Przykład: zastawki (dane demonstracyjne)" side demo, and make `/analiza` the entry point. Leave the `/api/traktor/{order,parcel,scenario,explain}` routes in place, but remove them from the docs and the health story. Gate `explain` (see P1-4).

## 2. ESLint (`npx eslint src`): 10 errors, 2 warnings, all in v1 code
| Count | Rule | Where |
|---|---|---|
| 6 | `react-hooks/set-state-in-effect` (error) | `map/Overlays.tsx:24,69,75`, `map/MapApp.tsx:91`, `map/MapCanvas.tsx:137`, `landing/RefusalCounter.tsx:20` |
| 4 | `react-hooks/refs` (ref read during render, error) | `map/MapCanvas.tsx:95,230,230`, `brand/PointCloud.tsx:22` |
| 1 | `@typescript-eslint/no-unused-vars` (warn) | `map/MapCanvas.tsx:5` |
| 1 | unused `eslint-disable` directive (warn) | `map/MapCanvas.tsx:166` |

`components/analiza/**`, `components/raport/**`, `lib/analiza/**` and `app/api/{analiza,dzialka}` have **0 findings**.

None of these break the build, because `next build` does not run ESLint in Next 16. They are React Compiler purity rules: extra renders or stale reads, not crashes.
- Only `landing/RefusalCounter.tsx:20` (on `/`) and `brand/PointCloud.tsx:22` (shared brand code) touch the jury path.
- The rest are on `/mapa`.
- `npm run lint` exits non-zero. Fix these if anyone runs lint in CI or a juror runs it; otherwise P2.

## 3. TypeScript
- `strict: true` (`web/tsconfig.json:7`).
- **0** `any`, `as any`, `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck` in `src/`.
- 2 `eslint-disable react-hooks/exhaustive-deps` (`MapApp.tsx:106`, `MapCanvas.tsx:138`), plus 1 stale one (`MapCanvas.tsx:166`).
- `allowJs: true`, and `src/lib/analiza/satellite-test.mjs` is a dev script inside `src/`. It is harmless, but it belongs in `scripts/`.
- `npm run typecheck` = `next typegen && tsc --noEmit`, and the build's TypeScript step passed.

## 4. Bundle (HEAD build, unique `<script>` chunks in the prerendered HTML, gzip -9)
| Route | raw | gzip | Heavy chunk |
|---|---|---|---|
| `/` | 577 KB | 178 KB | — |
| `/metoda` | 570 KB | 176 KB | — |
| `/raport` | 621 KB | 194 KB | — |
| **`/analiza`** | 1 664 KB | **481 KB** | `38myqc64fsn-w.js` 1 085 KB (maplibre-gl, static import) |
| `/mapa` | 1 979 KB | 474 KB | real-data 1 335 KB |
| `/karta` | 1 935 KB | 461 KB | real-data |
| `/slides` | 1 939 KB | 463 KB | real-data |

- **maplibre-gl is NOT loaded lazily.** `components/analiza/MapView.tsx:3` has `import * as maplibregl from "maplibre-gl"`. As a result `/analiza`, the main v2 page, is the heaviest route.
- **geotiff stays on the server.** It is used only in `lib/analiza/satellite.ts:8` and `soil.ts:1`. No client chunk contains it, and no client chunk contains Anthropic or other server code.
- Upstream names (SoilGrids, NASA POWER) do appear in client chunks, but only as source labels inside `components/analiza/fixture.ts` and the slides. There is no server-module leak.
- There is no `import "server-only"` guard anywhere, so a future value import from `lib/analiza/server.ts` into a client file would not fail the build.

## 5. Repo
- **Worktrees.** There are 11 stale worktrees:
  - `traktor-wt/{card-api,landing,map,slides}` (v1 `feat/*`)
  - `traktor-wt2/{docs,engine,report,satellite,ui}` (v2)
  - `traktor-wt2/{qa-api,qa-e2e}` (detached at HEAD)

  All are clean (`status --porcelain` is empty), and every branch is merged into main (`git branch --no-merged main` is empty). They are safe to remove with `git worktree remove <dir>` (no force needed), then delete the branches. Each one holds about 400 MB of `node_modules`.
- **Stash.** `stash@{0}` "On feat/landing: mangled-encoding" (08:00). It is probably obsolete, since the landing UTF-8 is correct on main. Check it, then drop it.
- **`.gitignore`.** The root and `web/.gitignore` cover `.next`, `node_modules`, `.env*` and `!.env.example`. OK.
- **`web/.env.example`.** Keys are `ANTHROPIC_API_KEY` and `GOOGLE_MAPS_API_KEY`, and both match the code (`_lib/explain.ts`, `tiles/google/_session.ts`). Both are optional. Say "optional" in the README if it does not already.
- **Large tracked files.**
  - `web/public/maps/orto-bydgoszcz-west.jpg` 2.4 MB (v1 only)
  - `real-data.json` 1.36 MB
  - `deliverables/zrzuty/mapa-1440x900.png` 1.3 MB
  - 2 PDFs of about 0.9 MB each

  This is acceptable; no LFS is needed.
- **`scripts/lanes.ps1:7`** and **`merge-lanes.ps1`** only know the v1 lanes `landing, map, card-api, slides`, and `traktor-wt`.
- **`AGENTS.md`** (lane table) and **`.opencode/skills/traktor-stack/SKILL.md:37-62`** are still v1: "Import from `@/lib/traktor`", "mock parcels", v1 cross-lane URLs, `/mapa`… This is the advice that causes the barrel bundle bug.
- **`.opencode/agents/traktor-integrator.md:12`.** The smoke test lists only v1 routes, with no `/analiza`, `/raport` or `/api/analiza`.
- **`package.json` scripts.** `dev/build/start/lint/typecheck/check` are OK. `check` does not include `lint`, and there is no `test` script, even though the fixtures in `lib/analiza/fixtures` exist. `npm ci` warns that eslint@9.39.5 is deprecated (cosmetic).
- **`/api/health`** returns `demo: true` (`app/api/health/route.ts:6`), which is v1 wording, while v2 is live data.

## 6. Security headers and CSP
These are present and served. On `/analiza` I saw:
- CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; worker-src 'self' blob:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
- `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (geolocation=self). Defined in `next.config.ts:5-34`.

Does MapLibre comply? I checked this from the config, not in a browser:
- The worker is created from a blob, which `worker-src blob:` allows.
- The tile, style and glyph fetches from the worker are covered by `connect-src https:`.
- Raster `<img>` uses `img-src https:`.
- No `unsafe-eval` is needed in production; it is added only in dev.

Gaps: `script-src 'unsafe-inline'` (Next without nonces) is the accepted trade-off. There is no HSTS header; Vercel adds it, so only self-hosting would need one. `connect-src https:` is broad; narrowing it is a P2 option.

## MISSING / NOT READY
| P | Issue | File:line | Fix |
|---|---|---|---|
| **P0** | Landing never links to the v2 product. The hero and nav send the jury to the v1 check-dam demo. | `app/page.tsx:89,164,255`; `landing/SiteNav.tsx:6`; `SiteFooter.tsx:17-32` | Hero CTA "Sprawdź działkę" → `/analiza`; nav: "Analiza działki" first plus "Raport"; demote `/mapa` to "Przykład: zastawki (dane demonstracyjne)"; footer as well. Adjust the hero copy to the parcel brief. |
| **P1-1** | maplibre-gl is imported statically, making `/analiza` 481 KB gzip. | `components/analiza/MapView.tsx:3` | Use `next/dynamic(() => import("./MapView"), { ssr: false })` in `AnalizaApp`, or `await import("maplibre-gl")` inside the effect. The form becomes usable before the map JS arrives. |
| **P1-2** | `/metoda` explains the v1 pipeline only. | `app/metoda/page.tsx:107-194` | Add a v2 section: sources (ULDK, NASA POWER/Open-Meteo, SMSR, IUNG, SoilGrids, NMT, S2), thresholds, uncertainty. Mark the v1 section as "Przykład retencji". |
| **P1-3** | `/analiza` header promotes the v1 map. | `components/analiza/AnalizaApp.tsx:329` | Keep the link but label it "Przykład (dane demo)", or move it to the results "Retencja" recommendation. |
| **P1-4** | `POST /api/traktor/explain` is unauthenticated and spends `ANTHROPIC_API_KEY` when the key is set, and no UI uses it. | `app/api/traktor/explain/route.ts:20`; `_lib/explain.ts:40-50` | Leave the key unset in prod, or delete or disable the route. Otherwise rate-limit it. |
| P1-5 | `/slides` pulls the 1.34 MB dataset for strings plus `summary`. | `slides/Deck.tsx:6`; `slides/slides.tsx:11-18` | Import from `@/lib/traktor/copy`; pass `summary` as props from the server `app/slides/page.tsx`. |
| P2-1 | 10 ESLint errors (set-state-in-effect ×6, refs ×4). | see §2 | Fix `RefusalCounter.tsx:20` and `PointCloud.tsx:22` first (on `/`); leave `/mapa` as is. |
| P2-2 | Agent docs and scripts are v1 ("mock", v1 lanes, barrel import advice). | `AGENTS.md`; `.opencode/skills/traktor-stack/SKILL.md:37-62`; `.opencode/agents/traktor-integrator.md:12`; `scripts/lanes.ps1:7` | Add the v2 lanes and routes; say "import from `@/lib/traktor/copy` in client code". |
| P2-3 | 11 merged, clean worktrees plus 1 stash. | `traktor-wt/*`, `traktor-wt2/*` | `git worktree remove` each, `git branch -d`, `git stash drop`. |
| P2-4 | No `server-only` guard on the engine. | `lib/analiza/server.ts`, `analyze.ts` | Add `import "server-only"` (supported by Next). |
| P2-5 | `/api/health` says `demo:true`; there is no `lint` or `test` in `check`. | `app/api/health/route.ts:6`; `web/package.json` | Report `engine:"v2"`; `check` = typecheck + lint + build. |
| P2-6 | Dev script inside `src/`. | `lib/analiza/satellite-test.mjs` | Move it to `scripts/`. |

## Verdict
**NOT READY for the jury entry path, but healthy underneath.**
- The v2 code is clean: 0 lint findings, 0 `any`, strict TS, the build passes, geotiff and keys stay server-side, and the CSP is served and MapLibre-compatible.
- The blocking issue is product framing: `/` and its nav send judges to the v1 synthetic check-dam map and never mention `/analiza`.
- Fix P0 (about 15 min of copy and hrefs) and P1-1 (lazy MapLibre, about 10 min) before submission. P1-2…5 are next. Everything else is cleanup.
