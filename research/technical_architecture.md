# Technical architecture: TRAKTOR

Design principles:

1. **Precompute the heavy geospatial work offline; keep the live path thin.** The demo must not depend on a slow WCS. The GUGiK NMT WCS GetCoverage _timed out_ during verification.
2. **Fit the existing repo.** This is a Next.js 16 app with feature folders, Zod contracts and Cloudflare Workers via OpenNext (branch `feature/cloudflare-hosting`), with Vercel as the alternative.
3. **Deterministic core, AI only where it adds value** (see §5).
4. **Every live call has a recorded fixture fallback**, switched by a demo-mode flag.

## 1. Overview

```
            OFFLINE (Python, run before/at start of hackathon)                ONLINE (Next.js on Cloudflare Workers)
┌─────────────────────────────────────────────────────────┐   ┌───────────────────────────────────────────────┐
│ BDOT10k OT_SWRM_L.parquet ──┐                           │   │  /traktor (map UI, MapLibre)                     │
│ NMT 1 m sheets (GeoTIFF/ASC)├─► pipeline/               │   │    ├─ loads sites.geojson, ditches.geojson   │
│ BDOT10k roads/buildings     │   1 clip AOI              │   │    ├─ GET /api/traktor/conditions?gmina=…        │
│ ISOK flood WMS (rasterised) │   2 ditch long-profile    │   │    │     → IMGW warnings + Open-Meteo fcst    │
│ IUNG drought WCS 5 m        │   3 channel check         │   │    │       + 60-day KBW (cached 30 min)       │
│ ULDK parcels (AOI batch)   ─┘   4 candidates+crests     │   │    ├─ GET /api/traktor/parcel?xy=…  → ULDK       │
│                                 5 backwater fill        │   │    ├─ POST /api/traktor/order {siteId}           │
│                                 6 refusal rules         │──►│    │     → rules engine → TRZYMAJ/OTWÓRZ/…    │
│                                 7 metrics + ranges      │   │    └─ /traktor/site/[id]/card (print CSS → PDF)  │
│   outputs: sites.geojson, ditches.geojson,              │   │  optional: POST /api/traktor/explain (LLM)       │
│            profiles/{id}.json, aoi_meta.json            │   │  fixtures/ for every external call            │
└─────────────────────────────────────────────────────────┘   └───────────────────────────────────────────────┘
```

## 2. Components

| Layer         | Choice                                                                                                                                                                                       | Why                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend      | Next.js 16 (App Router, React 19) from the repo, Tailwind 4, shadcn/ui (already installed)                                                                                                   | Zero setup cost                                                                                                                                               |
| Map           | **MapLibre GL JS** (new dependency, so **ask the team** per AGENTS.md before adding it). Basemap: OSM raster or GUGiK orthophoto WMS.                                                        | Vector GeoJSON, smooth zoom, data-driven styling for accepted/refused sites. A fallback without the dependency is SVG over a static tile, as one model noted. |
| Charts        | Inline SVG for the cross-section and long profile                                                                                                                                            | No dependency                                                                                                                                                 |
| Backend       | Next.js route handlers in `src/app/api/traktor/*`, logic in `src/features/traktor/server.ts`                                                                                                       | Matches the existing `ideas` feature pattern                                                                                                                  |
| Contracts     | `src/features/traktor/schemas.ts` (Zod): `Site`, `Refusal`, `Conditions`, `Order`, `SiteCard`                                                                                                   | Repo rule: validate all external input                                                                                                                        |
| Storage       | Static GeoJSON in `public/data/traktor/` (or Cloudflare R2 if over size limits). **No database needed for the MVP.** Supabase (already in the template) only if saved sites or users are added. | Fewer moving parts                                                                                                                                            |
| Geoprocessing | Python 3.12: `geopandas`, `shapely`, `rasterio`, `numpy`, `duckdb` (to filter the 159 MB parquet), `scipy.ndimage` / `richdem` or `whitebox` for priority-flood                              | Mature, fast to write                                                                                                                                         |
| Hosting       | Cloudflare Workers via OpenNext (already set up on this branch). Vercel is the alternative. Check the Worker bundle-size limit (`pnpm cf:size`).                                             | Already set up                                                                                                                                                |
| PDF           | Print-optimised page + browser "Save as PDF"                                                                                                                                                 | No server-side PDF library                                                                                                                                    |

> Note: `AGENTS.md` warns that this Next.js version has breaking changes. Read `node_modules/next/dist/docs/` before writing route handlers.

## 3. Offline pipeline (the core algorithm)

Input: one AOI, a single gmina in the drought belt. Suggestion: kujawsko-pomorskie. The event is in Bydgoszcz and Kujawy is the classic drought area. Pick the gmina **tonight** using IUNG drought frequency and the density of `OT_SWRM_L`.

1. **Clip ditches.** Use DuckDB/GeoPandas on `OT_SWRM_L.parquet` with the gmina boundary (from PRG/ULDK). Optionally add OSM `waterway=ditch|drain`.
2. **Long profile.** Sample the NMT every 5 m along each ditch line. The bed elevation is the minimum within a ±2 m cross-section window, and the bank is the 90th percentile within ±6 m. Smooth the result, then compute the bed slope `s`.
3. **Channel resolvability check.** If bank − bed < 0.3 m over most of the segment, or the profile is noisy (e.g. it rises downstream), **refuse** with "kanał nierozpoznawalny w NMT". This addresses the panel's main technical criticism (claude-opus-5 and 6 others).
4. **Candidates.** Place a candidate every 100 m along resolvable segments. Skip points within 30 m of road or ditch intersections (likely culverts, `OT_SKDR_L` ∩ ditch).
5. **Backwater per crest h ∈ {0.2, 0.3, 0.4, 0.5, 0.6} m.** Water surface elevation `WSE = bed(x0) + h`.
   - Walk upstream along the profile while `bed < WSE`, giving the backwater length (≈ h/s on uniform slope).
   - **Channel storage** = Σ cross-section area below WSE × Δx.
   - **Out-of-bank test:** run a priority-flood / connected-component fill on the DTM from the channel cells at WSE. Any land cell below WSE connected to the pool counts as out-of-bank inundation.
6. **Refusal rules**, in order, each recording the offending object:
   - out-of-bank inundation touches a road, a building or an ISOK flood-hazard polygon → refuse;
   - out-of-bank inundation touches a parcel other than the user's → refuse that crest, citing the ULDK parcel ID;
   - slope too steep (backwater < 50 m at 0.4 m) → refuse as ineffective;
   - Natura 2000 → _flag_, because the GDOŚ service was not verified;
   - subsurface drainage unknown → _flag_: "wymaga wizji lokalnej".
7. **Metrics with ranges.**
   - **Rehydration band:** land within 100 m of the pool where `ground − WSE ≤ 1.0 m` (a screening heuristic, labelled as such) gives ha.
   - **Evaporation:** subtract pool surface × 4–5 mm/d. This is a panel-suggested assumption, flagged as such.
   - **Days of buffer:** (storage mm over the band) ÷ ET₀.
   - **Seasonal outflow avoided:** band area × literature range.
   - Join the **IUNG susceptibility** category for prioritisation: category I sands rank highest.
8. **Rank** accepted sites by storage per site, rehydrated ha and soil category. Export `sites.geojson`, `profiles/{id}.json`, `ditches.geojson` and `aoi_meta.json`. Commit only small outputs, not the raw rasters.

Size control: one gmina at 1 m resolution is roughly 100–200 km², or 10⁸–2·10⁸ cells. Process it **per ditch buffer** (±100 m corridor), not the whole raster.

## 4. Online services

| Endpoint                          | Calls                                                                                                                                                                        | Cache  | Fallback                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------- |
| `GET /api/traktor/conditions?gmina=` | IMGW `warningsmeteo` / `warningshydro`, IMGW `meteo` (nearest station precipitation), Open-Meteo forecast (72 h precipitation, ET₀), Open-Meteo archive (60-day P−ET₀ = KBW) | 30 min | `fixtures/conditions_*.json` |
| `GET /api/traktor/parcel?xy=`        | ULDK `GetParcelByXY`                                                                                                                                                         | 1 day  | AOI parcel GeoJSON           |
| `POST /api/traktor/order`            | Rules engine (pure TypeScript, unit-tested) on `Conditions` + `Site`                                                                                                         | –      | –                            |
| `GET /api/traktor/scenario/{name}`   | Injects a recorded condition set: `drought-aug`, `storm-warning`, `spring-wet`                                                                                               | –      | Required for the demo        |
| `POST /api/traktor/explain` (bonus)  | LLM; see §5                                                                                                                                                                  | –      | Template text                |

**Order rules v0** (all thresholds in `config.ts`, labelled "do kalibracji"):

- Open-Meteo values are point-model values; IMGW warnings are per powiat.
- `OTWÓRZ` when: an IMGW heavy-rain warning at level 2 or above applies to the powiat, **or** the 72 h forecast is at least 30 mm, **or** (a hydro warning for flood or high water applies **and** the pool is above 50% of the crest).
- `TRZYMAJ` when: KBW over 60 days is at most −50 mm, no rain warning applies, and the date is between April and September.
- `NIE RUSZAJ` otherwise. Every order carries a `reason[]`, an `expiresAt` and the `inputs` it used.

## 5. Where AI is (and is not) used

| Feature                                                      | Technique                                                                                                                                                                          | Justification                                                                                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Ditch profile, backwater, storage, refusals                  | **Traditional geospatial algorithms** (priority-flood, raster sampling, overlay)                                                                                                   | Physics and geometry: deterministic, explainable, demo-proof. Using ML here would be marketing.                              |
| Hold/open order                                              | **Transparent rules** on NWP forecasts                                                                                                                                             | Liability and explainability. The forecasting itself is done by Open-Meteo and IMGW models; we do not train a weather model. |
| Weather forecast                                             | **External NWP** (Open-Meteo ICON/ECMWF, IMGW warnings)                                                                                                                            | Better than anything trainable in 48 h                                                                                       |
| Plain-language explanation and site-card narrative (PL)      | **LLM**, given structured JSON. A Zod-validated template plus prose; numbers are inserted programmatically, and output is rejected if it contains digits not present in the input. | Turns technical output into text a farmer reads, which is where an LLM genuinely helps                                       |
| Staff-gauge reading from a photo (ŁATA, bonus)               | **Computer vision** with a vision-capable LLM or a simple OCR of painted marks                                                                                                     | Cheap ground truth with no electronics                                                                                       |
| Channel-resolvability classifier, S1 wet-persistence anomaly | **ML (post-hackathon)** trained on field-verified segments                                                                                                                         | Needs labels we do not have this weekend                                                                                     |

## 6. Data sources used by the MVP

See [`data_sources.md`](data_sources.md) §5 for verified call patterns.

- BDOT10k `OT_SWRM_L` and road/building layers
- GUGiK NMT 1 m: download sheets for the AOI in advance. The point-list service is a fallback for profiles.
- ULDK
- IMGW danepubliczne
- Open-Meteo forecast and archive
- ISOK MZP WMS
- IUNG `Susza__katgl_landuse2024` WCS

Optional: CDSE Sentinel-1 Statistical API, EMSR756.

## 7. Feature-folder layout (repo conventions)

```
src/features/traktor/
  schemas.ts      # Zod contracts (Site, Refusal, Conditions, Order)
  types.ts
  rules.ts        # pure order engine  ← unit tests
  server.ts       # IMGW/Open-Meteo/ULDK clients + fixtures
  config.ts       # thresholds (do kalibracji)
  components/     # Map, SitePanel, CrossSection, OrderBadge, SiteCard
  fixtures/
  index.ts
src/app/traktor/page.tsx, src/app/traktor/site/[id]/card/page.tsx
src/app/api/traktor/{conditions,parcel,order,scenario,explain}/route.ts
pipeline/          # Python, outside the Next build
public/data/traktor/  # precomputed GeoJSON
```

Use `pnpm new:feature traktor` to scaffold. Run `pnpm check` before merging.

## 8. Key technical risks and mitigations

| Risk                                             | Mitigation                                                                                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NMT WCS times out                                | Download NMT sheets for the AOI tonight via the geoportal download. Fall back to `GetHByPointList` for profiles only, or to Copernicus DEM 30 m (labelled as degraded) |
| 1 m DTM does not resolve the channel             | Resolvability check plus refusal. Choose an AOI with wider ditches.                                                                                                    |
| BDOT10k ditch lines offset from the real channel | Snap to the local DTM minimum within ±3 m. Show the offset.                                                                                                            |
| IMGW or Open-Meteo down on stage                 | Demo-mode fixtures and scenario injection                                                                                                                              |
| Worker bundle or static asset size               | Keep GeoJSON under a few MB (simplify geometry, one gmina). Use R2 if needed.                                                                                          |
| Map dependency not approved                      | SVG fallback                                                                                                                                                           |
