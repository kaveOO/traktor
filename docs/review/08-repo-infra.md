# 08 · Repo & infrastructure review (read-only)

Snapshot 2026-11-22, `main` @ `fd4d836`. I changed nothing except this file. Severity: **P0** fix before submission · **P1** should fix · **P2** nice to have.

## 1. Git hygiene
- **Working tree:** 5 uncommitted map files (`web/src/components/map/{Chrome,MapApp,MapCanvas,OsmTiles,Overlays}.tsx`). Commit them or stash them before the v2 merge. Shared code changes only on `main`, so do it on `main`.
- **Upstream:** `main` tracks `origin/main`, which is shown as **gone**. Either the remote branch was deleted or it was never pushed. **P0** if the jury gets a GitHub link: `git push -u origin main`.
- **History is small and clean:** 24 commits, 103 tracked files. No `node_modules`, `.next`, `.duckdb`, `scripts/geo/out` or env files are tracked. Largest blobs:
  - `web/public/maps/orto-bydgoszcz-west.jpg`: 2.4 MB (fine)
  - `web/src/lib/traktor/real-data.json`: 1.36 MB. This is a generated build artefact, committed on purpose so the app runs without the geo pipeline. Keep it, and say so in the README.
  - Everything else is under 250 kB.
- **Untracked local artefacts (correctly ignored):**
  - `scripts/geo/bdot.duckdb` (1 MB)
  - `scripts/geo/out/{layers,nmt-cache,uldk-cache}.json` (2.5 MB)
  - `web/tsconfig.tsbuildinfo`, `web/.next`
- **Stash:** `stash@{0}: On feat/landing: mangled-encoding` changes only `web/src/app/page.tsx` (56+/56-). It looks like an encoding mishap that was later fixed by hand. Check it, then drop it: `git stash show -p stash@{0} | more` → `git stash drop stash@{0}`.

## 2. .gitignore completeness
- **Root** (`node_modules/ .next/ *.log .env .env.local .env.*.local`) is fine. Add `*.duckdb`, `*.tsbuildinfo`, `.DS_Store`, `Thumbs.db` and `deliverables/**/*.mp4` (videos go to a release or Drive, not to git).
- **`web/.gitignore` (P0 bug):** the `.env*` line also ignores **`web/.env.example`**. Commit `d5cb1fb` says it adds `.env.example`, but the file is **not tracked**: it exists only on disk. Fix:
  ```
  # web/.gitignore: after the ".env*" line
  !.env.example
  ```
  then `git add web/.env.example`. Check first that it holds only placeholder values.
- **`scripts/geo/.gitignore`** (`node_modules/ out/ *.duckdb`) is fine.

## 3. Secrets
- I searched the working tree (`git grep`) and the full history including the stash (`git log --all -G`) for `AIza…`, `sk-ant-…`, `ghp_…`, PEM private keys and `password=`. **Nothing found.**
- `token` matches only design tokens (`globals.css`, brand skill, `explain.ts`) and the lockfile. These are not secrets.
- I could not inspect `web/.env.local`: the safety policy blocked it. It is git-ignored, so it is not at risk of being committed. If the Google key in it was ever pasted into chats or screenshots, rotate it, and restrict it by HTTP referrer/IP plus the Map Tiles API in the GCP console.

## 4. Worktrees and branches (nothing removed)
| Worktree | Branch | State |
|---|---|---|
| `traktor-wt/{card-api,landing,map,slides}` | `feat/*` (v1) | clean, **merged into main**: safe to remove |
| `traktor-wt2/{docs,engine,report,satellite,ui}` | `v2/*` | still at `fd4d836` with **uncommitted work** (engine 4, satellite 3, docs/report/ui 1 file each): **active, keep** |

Cleanup for the v1 lanes, once the lead says go (not destructive: they are clean and merged):
```powershell
foreach ($l in 'card-api','landing','map','slides') { git worktree remove "../traktor-wt/$l"; git branch -d "feat/$l" }
git worktree prune
```
Every v2 branch tip equals `main`, so `git branch --merged main` lists them too. Do **not** read that as "done".

## 5. scripts/geo: can a jury member re-run it?
- **Pipeline:** `cd scripts/geo; npm ci; node extract.mjs; node build.mjs`. Optional helpers: `probe.mjs <LAYER>` and `density.mjs`, which writes `bdot.duckdb`. `fix-docs.mjs` was a one-off doc rewrite: it should be **deleted or moved to `scripts/geo/archive/`**, because rerunning it now is a silent no-op or misleading. It is also the only remaining place that mentions "Kruszwica".
- **Runtime:** Node ≥ 20 (top-level await, `fetch`, `AbortSignal.timeout`). Tested locally on Node 26.13.1. `@duckdb/node-api ^2.0.1-r.1` ships prebuilt binaries (win/mac/linux x64/arm64), so no compiler is needed.
- **Network endpoints (all public, no key):**
  - `opendata.geoportal.gov.pl/bdot10k/schemat2021/GeoParquet/*.parquet` (remote parquet via DuckDB `httpfs`)
  - `services.gugik.gov.pl/nmt/` (GetHByPointList)
  - `uldk.gugik.gov.pl/` (GetParcelByXY)
  - DuckDB also downloads the `httpfs` and `spatial` extensions from `extensions.duckdb.org` on first run, so the network must allow that host too.
- **Run time:** extract takes about 1–3 min (remote parquet scan filtered by TERYT 0403/0461). build.mjs makes about 2k NMT points in batches plus ULDK per candidate, with retry and sleep: about 5–15 min cold, seconds when the caches in `out/` exist. The caches are git-ignored, so a fresh clone always runs cold.
- **Gaps (P1):**
  - `scripts/geo/package.json` is the `npm init` stub (`"type":"commonjs"`, no scripts), and the `.mjs` files only work because of the extension. Add `"type":"module"`, `"engines":{"node":">=20"}` and scripts `"extract":"node extract.mjs","build":"node build.mjs","all":"npm run extract && npm run build"`.
  - Add `scripts/geo/README.md` covering inputs, outputs, run time, endpoints, data date (BDOT10k schemat2021) and the AOI (`x0 416000, y0 585500, 10×6.4 km, EPSG:2180`).
  - `build.mjs` writes to `../../web/...`, so it must be run from `scripts/geo`. Document that or resolve the path via `import.meta.dirname`.

## 6. Lane scripts and agent instructions (v1 vs v2)
- `scripts/lanes.ps1` and `merge-lanes.ps1` hard-code the v1 lanes (`landing,map,card-api,slides` → `../traktor-wt`, `feat/*`). They are **stale for v2**. Proposal: parametrise them rather than copy them:
  ```powershell
  param([string[]]$Lanes=@('engine','satellite','ui','report','docs'), [string]$Prefix='v2', [string]$WtDir='traktor-wt2')
  # branch "$Prefix/$lane", dir "../$WtDir/$lane"; merge order: engine, satellite, ui, report, docs
  ```
  `merge-lanes.ps1` already runs `tsc --noEmit` and `npm run build` after the merges. Keep that, and add `npm run lint`.
- **Stale v1 instructions (P1):**
  - Root `AGENTS.md`: the lane table is v1 only. Add the v2 table or point to the `traktor-analiza` skill.
  - `.opencode/agents/traktor-lane.md`: "landing, map, card-api or slides". Generalise it to "a lane listed in AGENTS.md / traktor-analiza".
  - `.opencode/agents/traktor-integrator.md`: v1 merge order `feat/<lane>`. Add the v2 order.
  - `.opencode/skills/traktor-stack/SKILL.md`: lines 37–68 cover v1 lanes, ports 3101–3104, "`mock.ts` (deterministic demo gmina)" and "from mock parcels". `mock.ts` now holds **real** data: its header says "File name kept as mock.ts". Update the wording and add the v2 lanes, `/api/analiza` and `/api/dzialka`.
  - `traktor-analiza` (v2) is consistent.
  - "Kruszwica" appears nowhere in the tracked docs except `fix-docs.mjs`.
- `web/AGENTS.md` is auto-generated by `next dev`. Leave it.

## 7. package.json (web/)
Now: Next **16.4.6**, React 19.3.0, TS 5, eslint 9, Tailwind 4.3.3. Scripts: `dev`, `build`, `start` and a bare `lint: "eslint"`. No `engines` field and no `.nvmrc`.
```jsonc
"engines": { "node": ">=20.9" },              // Next 16 minimum
"scripts": {
  "dev": "next dev", "build": "next build", "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "check": "npm run typecheck && npm run lint && npm run build"
}
```
Also add a root `.nvmrc` containing `22` (an LTS version for jury machines and hosts). Local dev is on Node 26, so pin what the host will use.

## 8. Deployment readiness
- **Web app has no native dependencies:** DuckDB is only in `scripts/geo`, not in `web`. Keep it that way. If the v2 engine wants BDOT on request, a native `@duckdb/node-api` (about 60 MB) makes serverless bundles heavy and cold starts slow. Prefer the pre-extracted JSON or a small parquet in `public/`, read with plain `fetch`, with the "optional, must time out gracefully" path from the skill.
- **Analysis ≤ 30 s:** `/api/analiza` fans out to NMT, ULDK, Open-Meteo and satellite.
  - **Vercel** (recommended: native Next 16 with `cacheComponents`): Hobby allows up to 60 s with Fluid compute, Pro 300 s. Set `export const maxDuration = 30` (or 60) in `app/api/analiza/route.ts`, and give every upstream call its own timeout below the overall budget (e.g. `AbortSignal.timeout(8000)`). No route sets `runtime` or `maxDuration` today.
  - **Netlify:** about 26 s on the free tier by default, which is risky. Cloudflare Workers also ruled out: Node APIs and the `geotiff` bundle size need checking.
  - **Fallback that always works:** `npm run build && npm start` on any Node 22 VM or container (Railway, Fly, Render) with no time limit. Have it as plan B for the live demo.
- **Env vars:** `GOOGLE_MAPS_API_KEY` is optional (Google basemaps proxy; without it the app falls back to OSM). List every v2 key (satellite provider, etc.) in the tracked `web/.env.example` (see §2). Configure them in the host dashboard and never as `NEXT_PUBLIC_*`.
- **Health check:** `/api/health` exists. Use it as the uptime probe.
- **Before deploying:** run `npm run check` locally, then `vercel --prod` (or connect the GitHub repo once `origin/main` is pushed).

## 9. Deliverables folder (proposal)
```
deliverables/
  README.md            # index: live URL, repo URL + commit SHA, how to run (3 commands), data sources + dates
  slides/TRAKTOR-pitch.pdf          # print /slides to PDF (16:9; the deck already supports print-to-PDF)
  slides/speaker-notes.pdf          # from docs/slides/speaker-notes.md
  video/LINK.md                     # YouTube/Drive link + 1-line description; mp4 NOT in git (git-ignored)
  reports/raport-<parcel-id>.pdf    # 2-3 sample /raport outputs: one "OK", one refused ("Wymaga wizji lokalnej"), one missing-data
  reports/analiza-<parcel-id>.json  # matching /api/analiza responses (reproducibility)
  screenshots/{mapa,analiza,raport}.png
```
Generate the PDFs from the running app with the browser's print to PDF, and add the date and commit SHA in the footer. Reports must keep the honest labels (demo area, ranges, sources, "do kalibracji").

## 10. Quick fix list (in order)
1. Add `!.env.example` to `web/.gitignore` and track the file. 2. Commit the 5 map files. 3. `git push -u origin main`.
4. Add the `typecheck`/`check`/`engines` scripts and `.nvmrc`. 5. Set `maxDuration` and per-call timeouts in `/api/analiza`.
6. Add the scripts/geo `package.json` scripts and README; archive `fix-docs.mjs`. 7. Parametrise `lanes.ps1`/`merge-lanes.ps1` for v2.
8. Update `AGENTS.md`, the `traktor-stack` skill and the lane/integrator agents to the v2 lanes. 9. Drop the stash and remove the v1 worktrees (once the lead says go).
10. Create `deliverables/`.
