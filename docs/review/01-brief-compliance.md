# 01 · Brief compliance matrix (KOWR "Zatrzymaj wodę, chroń plony")

Snapshot 2026-11-22. Scope: `main` @ fd4d836 (plus uncommitted map edits) and worktrees `../traktor-wt2/{engine,satellite,ui,report,docs}`.
**Finding: every `v2/*` branch is at fd4d836 with no commits.** The only lane output so far is an untracked probe, `engine/web/scripts-probe.mjs` (IUNG WCS + SoilGrids reachability test). On main, v2 is only the contract: `web/src/lib/analiza/{types,crops,index}.ts` and the skill. Everything the jury can actually use is still v1 (the ditch-board map near Bydgoszcz).

Status key: **done** · **wip** (contract or probe only) · **missing** · **risk** (exists, but would score low or fail as it stands)

## A. Functional (3.2–3.3, 6)

| # | Requirement (brief §) | Where | Status | Concrete fix |
|---|---|---|---|---|
| A1 | Any Polish parcel by id or map click (3.3.2, 5.5, 6) | v1 `api/traktor/parcel` (local data only). v2 `api/dzialka` not created | missing | Engine: `lib/analiza/uldk.ts` with GetParcelById + GetParcelByXY (srid=4326, `result=geom_wkt,teryt,...`). Validate the id with a regex, set an 8 s timeout, return `AnalysisError` with `messagePl` |
| A2 | Analysis date: today or ≤10 y back (6) | `types.ts` `AnalysisRequest.date` | wip | Validate on the server (reject future dates and dates >10 y back, explain why in Polish). Open-Meteo archive lags ~5 days, so use forecast `past_days` for those dates. Sentinel-2 must look up scenes up to the date, not after it |
| A3 | Crop choice, crop-aware assessment (3.3.3) | `crops.ts` (10 crops, Kc, critical months, KBW thresholds) | wip | Good base. Label the IUNG thresholds "do kalibracji" in the UI. Show the crop's critical period in the result |
| A4 | Meteo, 10-year data computed live (3.3.4, 4.2.5) | `Assessment.meteo` type only | missing | Engine: one Open-Meteo archive call for 10 y + 60 days (daily P, ET0, Tmax). Compute KBW60, the percentile, `seasons[]` and `monthly[]`. Hit it with a cache test so it stays well under 30 s |
| A5 | Satellite, crop-aware (3.2.1a, 3.3) | `getSatellite` signature in SKILL; `satellite.ts` absent | missing | Satellite lane: STAC search, B04/B08/B11/SCL window read via `geotiff`, NDVI/NDMI vs median of the same weeks. Return `status:"missing"` + `missingPl` when cloud cover is too high. Cap at ~6 scenes |
| A6 | Soil (3.3) | probe only | wip | IUNG WCS category + SoilGrids sand/clay/SOC → AWC (Saxton–Rawls). Fall back to one source if the other fails |
| A7 | Hydro + spatial: terrain, ditches, flood (3.2.2a, 3.3) | v1 offline `lib/traktor/real-data.json` (one gmina) | missing | NMT GetHByPointList grid (N-E order!) → slope + low point. ISOK WMS GetFeatureInfo → `floodZone`. BDOT10k via DuckDB is optional and adds a dependency; at minimum use OSM Overpass waterways (free) for `ditchDistM` |
| A8 | Mandatory order: assessment → causes → retention → agrotech → irrigation (Zał. 1) | `types.ts` (Cause, Recommendation.kind, Irrigation) | wip | UI tabs and report sections must follow exactly this order. Engine: never emit a recommendation with an empty `basedOn` (add an assert/unit check) |
| A9 | Causes from data, each with numbers + source (3.3.5) | `Cause.evidencePl`, `sources` | missing | Rule engine with thresholds in one table. Every cause string should interpolate the measured value and the threshold |
| A10 | Retention + agrotech recommendations, justified (3.2.2) | v1: ditch boards only | missing | NWRM catalogue (ditch board, pond at low point, buffer strips, cover crops, residues, reduced tillage, OM). Selection driven by causes + terrain. `legalPl` for ditch boards and ponds (pozwolenie wodnoprawne/zgłoszenie) |
| A11 | Irrigation, optional (3.2.3) | `Irrigation` type | missing | ETc − P − AWC balance → nie_teraz/rozważ/tak + dose. Explicitly say "orientacyjnie" |
| A12 | Not pre-made: results computed from fetched data (3.3.4) | v1 is pre-computed | **risk** | The v1 `/mapa` must not be the jury entry point. Landing CTA → `/analiza`. Mark v1 "Przykład: jeden obszar" |
| A13 | Uncertainty + missing data explicit | `Uncertainty` type | missing | Derive the level from source statuses. Always fill `notConsideredPl` (drainage, groundwater, irrigation history, field management) |
| A14 | Report: status, causes, recs, date, sources, limits, uncertainty; save/PDF/print (3.3.5–6) | v1 `/karta` (site card). `app/raport` absent | missing | Report lane: `/raport?parcelId&crop&date` → GET `/api/analiza`, print CSS A4, "Zapisz PDF" = `window.print()`, plus "Pobierz JSON". Footer: generatedAt, sources with licence, method version |
| A15 | Jury compares with reference data (6) | — | **risk** | Show raw intermediate values (KBW mm, percentile, NDVI, IUNG cat.) so they can be checked against IUNG SMSR / EDO / IMGW. Link to the IUNG SMSR page for the same gmina. Test 5 parcels against SMSR for 2018/2019/2023 |

## B. Non-functional

| # | Requirement | Where | Status | Concrete fix |
|---|---|---|---|---|
| B1 | ≤30 s per result (7.5) | — | **risk** | Use `Promise.allSettled` with 8 s per source, an overall 25 s guard and a partial result. Cache keyed by (parcel, crop, date). Measure on a cold Railway/Render instance, not localhost |
| B2 | Chrome/Firefox/Edge/Safari/Opera; mobile welcome (3.2) | — | missing | Test the matrix before recording. MapLibre needs WebGL, so add a fallback message. Safari: check that `print()` and the date input work |
| B3 | No paid services in core (5.4) | `api/tiles/google/*`, `api/_lib/explain.ts` (Anthropic) | **risk** | Remove the Google tile routes from the jury build, or gate them behind a disabled-by-default flag and document it. The LLM explain is optional with a template fallback: keep it, but document it and keep it off by default. Revoke the Google key that was shared in chat |
| B4 | No personal data, basic security (5.6) | `next.config.ts` has no headers; no proxy | missing | Add `headers()` (CSP-lite, X-Content-Type-Options, Referrer-Policy, frame-ancestors). Add input regex validation and a per-IP rate limit in the route. Parcel ids are not personal data, but say so in the README. Strip the team member names (Regulamin §6.2) |
| B5 | Hosting reachable by the jury | — | missing | Node host (Railway/Render), plus README run-locally steps and the env vars (none required) |
| B6 | Accessibility WCAG 2.2 AA (plan §5) | `layout.tsx` `lang="pl"` only | missing | Full flow by keyboard (id field), `aria-live` progress, a table next to each chart, 44 px targets. Run Lighthouse/axe |
| B7 | Free, legal data with licences listed | `SourceInfo.license` | wip | Each source module must fill `license`. Copy the same list into the README |

## C. Deliverables (4.1–4.2, 5.3)

| # | Requirement | Where | Status | Concrete fix |
|---|---|---|---|---|
| C1 | README with the 9 items of 4.2 | `README.md` (v1: ditch boards, routes) | **risk** | Docs lane: rewrite it around the 4.2 list in order (problem, solution, data + licences, method, run, architecture, limits, AI use, scaling/cost). Remove the v1 framing |
| C2 | PDF presentation ≤10 slides | `components/slides/slides.tsx` (v1 deck), `docs/slides/speaker-notes.md` | **risk** | The deck pitches v1 (one gmina). Rewrite it for the parcel assistant, export a PDF, and check the page count is ≤10 |
| C3 | Video ≤3 min | — | missing | Script: id → crop → date → progress → tabs → PDF, on 2 parcels (today + 5 y ago). Record only after B1/B2 pass |
| C4 | Generated example reports | — | missing | Commit 2–3 PDFs from different voivodeships to `docs/reports/` once A14 is done |
| C5 | AI-use statement | — | missing | README section: AI-assisted coding. The in-app LLM is optional and never produces numbers |
| C6 | Private repo until the end of the event | origin `github.com/kaveOO/traktor-hacknation2026` | unverified | Check visibility in GitHub settings (gh CLI not installed here) and grant the jury access per the platform |
| C7 | Scaling + cost description (5.3) | — | missing | README: per-request external calls, cache, free-tier limits (Open-Meteo 10k/day, Earth Search), and the path to KOWR hosting |

## D. Other observations
- `crops.ts`: the IUNG thresholds are ordered correctly (cat. I triggers first) but are approximations, so keep them labelled "do kalibracji". IUNG KBW is computed over 6-decade windows within the critical period; the type uses a 60-day KBW, which is consistent.
- `types.ts` has no `version`/`methodVersion` field. Add it to the report footer through a UI constant to avoid a contract change.
- `Assessment.terrain.watercourses` assumes ditch data. If BDOT10k is dropped, return an empty array with `status:"missing"` and do not invent ditches.
- Main has uncommitted map edits (`components/map/*`). Commit or stash them before merging the lanes.
- `.env*` is gitignored, and the grep found no Google key in tracked text files.

## E. Top 10 risks (ranked)
1. **No live engine yet (A1–A11).** All v2 branches are empty. Without `/api/analiza` the submission fails §3.3 and §6 outright. Do the engine critical path first: ULDK → Open-Meteo → IUNG → causes → recs.
2. **The jury lands on v1 pre-computed content (A12).** §3.3.4 says pre-made recommendations fail. Re-point the landing and nav to `/analiza` today, even as a stub.
3. **30 s budget on a cold host (B1).** Sentinel-2 COG reads plus the 10-y archive plus NMT, in series, will blow it. Make calls parallel with timeouts and partial results.
4. **Report/PDF missing (A14, C4).** It is an explicit deliverable and the jury's main artefact.
5. **Reference-data mismatch (A15).** If KBW or the category disagree with IUNG SMSR, credibility drops. Calibrate on 5 parcels × 3 drought years.
6. **Satellite is fragile (A5).** Clouds, STAC latency, CORS/range requests. Without honest `missing` handling it either errors or invents values.
7. **The deck and README tell the v1 story (C1, C2).** That costs points on "zgodność z zadaniem" even if the app works.
8. **Paid services in the build (B3).** The Google tiles proxy and the Anthropic call must be off and documented, or §5.4 is at risk.
9. **Browser matrix untested (B2).** Safari/Firefox WebGL and print. Opera is mandatory and easy to forget.
10. **Hosting not chosen (B5).** If there is no URL, the jury cannot test "any parcel". DuckDB/serverless limits push this to a Node host, and the decision is still open.

Gate before the video: 3 random parcels (N, centre, S) × {today, today−5 y} each render a full report in ≤30 s in Chrome + Safari, with every missing source shown explicitly.
