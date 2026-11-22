# 05 · Performance review (read-only)

Date 2026-11-22. Measured on the main build in `web/.next` (Next 16.4.6, cacheComponents), served by `next start -p 3013` (now stopped), plus Node `fetch` probes to the upstreams from this machine. Another agent rebuilt `.next` at 09:13 while this review ran, so the numbers below come from both builds; the two builds give the same picture. I did not rebuild, because a `next start -p 3010` was serving from that directory. No browser was attached, so DOM and render costs below are counted from code and data, not profiled.

## Measured numbers

**Client JS per route** (unique `<script>` chunks in prerendered HTML; gzip -9):

| Route | JS raw | JS gzip | Contains real-data.json |
|---|---|---|---|
| `/` landing | 576 KB | 179 KB | no (server component) |
| `/metoda` | 569 KB | 176 KB | no |
| `/mapa` | 1 964 KB | **475 KB** | yes |
| `/karta` | 1 932 KB | **465 KB** | yes |
| `/slides` | 1 936 KB | **467 KB** | yes |

- One chunk (`1z7gsnhittd9e.js`, previously `352yql9k_-_-9.js`) is 1 375 KB raw, 288 KB gzip, 214 KB brotli. On the wire it was 292 KB (`next start` serves gzip, not brotli). That is about 60 % of the JS gzip on map, card and slides. Compiling it takes 9 ms and JSON.parse of the data takes 11 ms, both in Node on a desktop CPU; expect 4–6× that on a mid-range phone.
- What `real-data.json` (1 363 KB) contains: footprints 323 KB, land 248 KB, candidates 225 KB, sites 212 KB, roads 198 KB, ditches 126 KB, parcels 24 KB. **Land, roads and footprints are 769 KB (56 %) and are drawn only on the "Schemat" basemap.**
- Fonts: 4 woff2 files are preloaded on every route (Link header): 90 + 86 + 85 + 48 = **309 KB**. That is Archivo with the `wdth` axis plus Inter, latin and latin-ext. On the landing page this is more than the JS.
- `public/maps/orto-bydgoszcz-west.jpg`: **2.4 MB, 4000×2560** (about 41 MB decoded RGBA). It is always rendered under the default `gugik-orto` basemap, even when the live tiles load.
- Server TTFB (warm, localhost): HTML pages 3–9 ms (first hit 12–47 ms). Fixture APIs 3–8 ms. `POST /api/traktor/order` 4–8 ms but returns a **49 KB** body. `conditions?scenario=live` 107–306 ms. `tiles/google/status` 36–204 ms.

**Upstreams** (3 sequential runs each):

| Source | Result |
|---|---|
| Open-Meteo **archive** (10 y and 60 d) | **HTTP 429 "Daily API request limit exceeded"** on every run today |
| Open-Meteo forecast, past_days=60 | 688 ms cold, then 57–59 ms |
| NASA POWER daily, 10 y, 3 vars (fallback candidate) | 1 241–1 480 ms, 180 KB |
| ULDK GetParcelById | 643–1 870 ms |
| ULDK GetParcelByXY | 242–261 ms |
| GUGiK NMT GetHByPointList, 30 pts | 91–246 ms |
| IUNG WCS (soil-agri category) | 296–855 ms |
| SoilGrids (ISRIC) | **1 889–5 691 ms** |
| STAC earth-search search | 440–1 517 ms |
| Overpass (overpass-api.de and kumi) | **both failed**: fetch failed at about 10 s, timeout at 20 s |
| IMGW warnings | 45–480 ms |
| GUGiK ORTO WMTS EPSG:3857, 24 tiles in parallel | about 200 ms wall, p50 130 ms, about 7 KB per tile |
| GUGiK ORTO **WMS** 512 px (used in the ui lane), 12 in parallel | about 1 015 ms wall, **p50 731 ms**, 59 KB per tile |
| KIEG WMS 256 px, 12 in parallel | about 1 413 ms wall, p50 564 ms |

**/mapa DOM** (counted from data and code): default orthophoto view has 72–143 tile `<image>`s, 2 634 ditch paths (halo + stroke), 1 827 refused `<circle>`s each with a `<title>`, and 336 site circles. That is about **6 800 SVG nodes**. "Schemat" adds 1 276 land polygons, about 1 500–3 000 road paths and one footprint path with 23 431 vertices. Tile counts:

| Viewport | View width (map units) | Zoom | Tiles |
|---|---|---|---|
| 1520×860 | 1 400 | z14 | 127 |
| 1520×860 | 1 000 | z14 | 72 |
| 1520×860 | 360 (site focus) | z16+z14 | **143** |
| 1520×860 | 80 | z18 | 112 |
| 390×700 portrait | any | any | about 2.8× more than visible (see issue 5) |

## Top issues, ranked by impact on the "≤ 30 s per parcel" score

1. **The Open-Meteo archive is rate-limited right now (429 for the whole day).** Open-Meteo's free terms count a request with more than 2 weeks of data as several calls. So a 10-year daily pull probably costs hundreds of "calls", and the free daily limit allows only a few dozen analyses per IP. Treat that weighting as likely; it is not verified against today's limit. The v2 engine (`traktor-wt2/engine/.../meteo.ts`) needs this archive for its 10-year baseline. Its fallback is forecast `past_days=92`, which has no 10-year history, and `fetchT` also retries on 429. **Fixes:**
   (a) Cache the climatology in a server module keyed by a grid cell (lat/lon rounded to 0.1°, the same as ERA5-Land), plus the period. The baseline does not change during the hackathon. Pre-warm it for the demo parcels and keep it on disk (a `.cache/*.json` file read at boot).
   (b) Make NASA POWER the second source (measured 1.2–1.5 s for 10 y). Label it honestly as a different source.
   (c) Do not retry 429. Fail fast and use the fallback.
   (d) Fetch only the critical months per year, and only the variables you need.
2. **There is no global time budget yet, and the worst case adds up to more than 30 s.** There is no `/api/analiza` orchestrator yet. Taking the module timeouts as written:
   - ULDK: 8 s × 2 tries, then the dependent calls.
   - meteo: archive 10 s × 2 + fallback 8 s = 28 s.
   - IUNG: 7 s × 2.
   - NMT: 8 s × 2.
   - Overpass: 9 s (and it is down today).
   - satellite: 12 s.

   A sequential worst case is ULDK 16 s + meteo 28 s = **44 s**.
   **Fix:** use one `AbortController` per request with a deadline of about 20 s. Have every `fetchT` use `min(own timeout, deadline − now − 1 s)`. Retry only on a fast 5xx, and only if more than 5 s remain. Run everything after ULDK in a single `Promise.allSettled` and return partial results with a "brak danych" status. Expected p50 is about ULDK 0.3–1.9 s + max(SoilGrids about 2–6 s, STAC + COG reads) ≈ **5–8 s**, with p95 capped at 20 s. Also:
   - Cache ULDK results by id or xy.
   - Cache the whole `AnalysisResult` by (parcel, crop, date), as the skill already requires.
   - Run SoilGrids and IUNG with a 4 s cap, since soil only changes on a scale of years and can be cached per cell.
   - Give Overpass 4 s and fall back to "missing", or use BDOT10k WFS.
   - The satellite module evaluates up to 4 scenes **one after another** in `bestScene`. Evaluate the 2 newest in parallel instead.
3. **`real-data.json` is bundled into three client routes (+288 KB gzip and 1.37 MB to parse).** The cause is the barrel `@/lib/traktor` (`index.ts`, which re-exports `mock.ts`). Any client import from it, even `TAGLINE_EN` in `Deck.tsx`, pulls in the whole dataset. On slow 4G (about 200 KB/s) that is about 1.5 s of extra download, plus parse and module-init work (`mapFeatures.buildings` runs `Math.min(...)` over 3 457 footprints at import time). **Fixes, in order:**
   - **slides:** in the server `page.tsx`, compute `site = getSite(FEATURED_SITE_ID)` plus `summary` and pass them as props to `Deck`. Import strings from `@/lib/traktor/copy` directly, not from the barrel. This removes the chunk completely.
   - **karta:** in the server page, read `searchParams` inside Suspense (cacheComponents-compatible) and send only the site, its parcels and the ditches clipped to a bounding box (about 10–30 KB).
   - **mapa:** move the geometry to `public/data/aoi-core.json` (sites, candidates, ditches, parcels: about 590 KB raw, about 120 KB gzip) and `aoi-schema.json` (land, roads, footprints: 769 KB). Load the second file **only when "Schemat" is chosen**. Fetch with `fetch().json()` (parses off the main thread in Chromium) and cache with `immutable`. Convert to brotli-friendly flat number arrays; rounding is already 0.1 unit.
4. **`/mapa` re-renders about 6 800 SVG nodes on every `pointermove` and animation frame.** `setVb` lives in `MapCanvas`, which is not memoized, so each pan event re-runs React over every layer. It also rebuilds 2 634 `path()` strings (about 4 ms in Node alone) and changes `r` on all 1 827 refused circles on zoom, because `r = 1.5*u`. Every path also uses `vectorEffect="non-scaling-stroke"`, which is slow to repaint on WebKit and Firefox. Expect 30–60 ms frames on mid-range phones and on Safari; this is an estimate, not profiled. **Fixes:**
   - Hoist static layers into `React.memo` components whose props exclude `vb`, so only the `viewBox` attribute changes.
   - During drag, write `viewBox` imperatively through a ref and commit state on `pointerup`, throttled to rAF.
   - Merge ditches into **2 `<path>`s** (resolvable and not resolvable) per style, instead of 2 634.
   - Draw refused candidates as one path of tiny arcs, or on a `<canvas>`. Hit-test clicks with a nearest-point search in map units (the data is already in memory) instead of 1 827 `onClick` handlers and `<title>`s.
   - Longer term: MapLibre is already a dependency, and rendering these layers as GeoJSON there makes pan essentially free.
5. **Tile over-fetch.** `OsmTiles.visible()` culls by the viewBox, but with `preserveAspectRatio="slice"` a portrait phone (390×700) shows only about 36 % of the viewBox width. That means **about 2.8× more tiles than visible**. The 900 ms fly-to animation also recomputes the zoom level every frame, so several zoom levels' worth of tiles start loading and are then dropped. A site focus alone is 143 tiles. **Fix:** cull against the actual visible rectangle (`size.w/scale`, `size.h/scale`), and freeze `z` during `animateTo`, choosing it at the end.
6. **2.4 MB orthophoto JPEG on the default view.** Resize it to 2000×1280 WebP or AVIF (an estimated 200–350 KB). Render it only on the first tile `onError`, or when offline, not under working live tiles. That also saves about 40 MB of decoded image memory, which matters for iOS Safari.
7. **Live conditions have no server cache.** `cache: "no-store"` plus `s-maxage` has no effect without a CDN, so every request hits all 3 upstreams. Wrap `liveConditions()` in `"use cache"` + `cacheLife({ revalidate: 1800 })` (Next 16 cacheComponents), or use a 30 min module-level memo. Also, when the archive call falls back to forecast `past_days`, the source line still says "archiwum 60 dni". Fix that label too.
8. **Fonts: 309 KB preloaded on every route.** Keep Archivo `wdth` (`font-stretch` is used in `globals.css:49,57`). But set `preload: false` on Inter (body text falls back cleanly), or limit both to the weights actually used. Expected saving is about 130 KB on the critical path.
9. **ui lane (`traktor-wt2/ui`):**
   - `MapView` imports `maplibre-gl` statically: 293 KB + a 155 KB worker gzip, plus 72 KB CSS. Load it with `next/dynamic(..., { ssr: false })` so the parcel-id form is usable before the map JS arrives, and add `preconnect` hints for the tile hosts.
   - The orthophoto uses **WMS GetMap 512 px (p50 731 ms per tile)**. The comment says WMTS has no 3857 matrix set, but the main app's WMTS `TILEMATRIXSET=EPSG:3857` URL works (measured 200 OK, p50 130 ms). Switch to the WMTS URL template for about 5× faster basemap tiles.
   - KIEG WMS (p50 564 ms) is fine at z ≥ 15.
   - The client timeout of 45 s in `getJson` is above the 30 s brief. Set it to 25 s and show progress per module.
10. **Smaller items:**
    - `POST /api/traktor/order` returns 49 KB for all sites; accept `siteIds` from the map.
    - `MapApp` creates new inline lambdas each render (`onFilter`, `onClose`), which defeats any future `memo`. Wrap them in `useCallback`.
    - `orders` is recomputed only when conditions, site or crest change (112 × `decideOrder`, cheap), so it is fine.

## Suggested order (by return on effort)
1. Meteo cache, NASA POWER fallback and no retry on 429 (this one blocks the 30 s score today). 2. Global deadline plus `allSettled` in `/api/analiza`, and a result cache. 3. Pass slides and karta props from the server, and split the map data into two `public/` files. 4. Memoize the MapCanvas layers and merge ditches and refused points. 5. Cull tiles to the visible area and freeze `z`. 6. WebP orthophoto, lazy MapLibre, WMTS in the ui lane. 7. Fonts and the conditions cache.

Re-measure after the fixes: run `npm run build`, then rerun the per-route gzip script (`%TEMP%\traktor-perf\routes.cjs <web/.next>`), and check that `/slides` and `/karta` are ≤ 200 KB gzip and `/mapa` ≤ 250 KB.
