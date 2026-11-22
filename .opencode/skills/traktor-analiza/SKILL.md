---
name: TRAKTOR Analiza
description: Rules for the v2 parcel assistant (KOWR brief) - analysis contract, API, lanes, data sources and the mandatory analysis order. Load before working on /analiza, /raport, /api/analiza or lib/analiza.
---

# TRAKTOR v2: parcel assistant (KOWR brief)

The jury types ANY Polish parcel id (or clicks the map) + a crop + a date (today or ≤10 years back) and compares our result with reference data. Results must be COMPUTED from data fetched at request time (current + 10-year archive). Pre-made recommendations fail the brief. Target ≤ 30 s, aim 10–20 s.

Mandatory order (Zał. 1): ocena sytuacji wodnej → przyczyny → rekomendacje retencyjne → agrotechnika → nawadnianie (opcjonalne). No recommendation without a cause backed by data.

## Contract (frozen, main only)
`web/src/lib/analiza/types.ts` (AnalysisRequest, AnalysisResult, SourceInfo, Cause, Recommendation, Irrigation, Uncertainty) and `crops.ts` (CROPS with monthly Kc, critical months, IUNG KBW thresholds per soil category). Import from `@/lib/analiza`.

## API
- `POST /api/analiza` body AnalysisRequest → AnalysisResult | AnalysisError. Also `GET /api/analiza?parcelId=..&crop=..&date=..` (same result; used by the report page). Server caches by (parcel, crop, date) in memory.
- `GET /api/dzialka?id=..` or `?lon=..&lat=..` → Parcel (ULDK) for the map preview.
- The satellite module exports `getSatellite(parcel: Parcel, date: string, crop: Crop): Promise<{ data: Assessment["satellite"]; source: SourceInfo }>` from `web/src/lib/analiza/satellite.ts`.

## Data sources (free, legal; list licence in SourceInfo.license)
- ULDK GetParcelById / GetParcelByXY (`result=geom_wkt,teryt,voivodeship,county,commune,region`, srid=4326). Parcel ids look like `040307_2.0023.306/2`.
- Open-Meteo archive (ERA5) `https://archive-api.open-meteo.com/v1/archive` daily precipitation_sum, et0_fao_evapotranspiration, temperature_2m_max; CC BY 4.0. Archive lags ~5 days: for dates in the last 5 days use the forecast API with `past_days`.
- IMGW warnings only when the date is today.
- Sentinel-2 L2A from Earth Search STAC `https://earth-search.aws.element84.com/v1` (no account), COGs read with `geotiff` (window read), SCL cloud mask.
- IUNG WCS `https://sgeo.iung.pl/geoserver/ows?service=WCS&version=2.0.1&request=GetCoverage&coverageId=Susza__katgl_landuse2024&subset=y(..)&subset=x(..)&format=image/tiff` (EPSG:2180; VERIFIED 2026-11-22: axis `x` = NORTHING, `y` = EASTING — i.e. subset=x(Nmin,Nmax)&subset=y(Emin,Emax); land-use codes ≥ 11 = non-agricultural). Open-Meteo archive free tier ≈ 38 ten-year analyses/day → NASA POWER is primary for the 10-year climatology. SoilGrids REST `https://rest.isric.org/soilgrids/v2.0/properties/query` (CC BY 4.0).
- NMT `https://services.gugik.gov.pl/nmt/?request=GetHByPointList&list=N E,N E&json` — EPSG:2180 with NORTHING FIRST; returns "N E h,..."; match by echoed coords; 0 = no data.
- BDOT10k ditches: remote parquet filtered by powiat TERYT with DuckDB (see scripts/geo/extract.mjs); optional and must time out gracefully.
- EPSG:2180 ⇄ WGS84: use `proj4`-free math in `web/src/lib/analiza/geo.ts` (engine lane writes it).

## Honesty
Every number has a source and date. Missing data → status "missing" and a sentence in uncertainty.missingPl ("Brak danych satelitarnych: zachmurzenie"). Levels as words, ranges where estimates. No yield or cost claims. Polish UI, brand tone (see traktor-brand). Thresholds labelled "do kalibracji".

## Lanes (worktrees in ../traktor-wt2/<lane>, branch v2/<lane>)
| Lane | Owns |
|---|---|
| engine | web/src/lib/analiza/** except types.ts, crops.ts, index.ts, satellite.ts; web/src/app/api/analiza/**, web/src/app/api/dzialka/** |
| satellite | web/src/lib/analiza/satellite.ts (+ satellite-*.ts helpers) |
| ui | web/src/app/analiza/**, web/src/components/analiza/** |
| report | web/src/app/raport/**, web/src/components/raport/** |
| docs | README.md, docs/** |
Lanes build against the contract; UI and report use their own fixture file until the engine is merged.
