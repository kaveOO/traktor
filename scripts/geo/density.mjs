import { DuckDBInstance } from "@duckdb/node-api";
const db = await DuckDBInstance.create("bdot.duckdb");
const c = await db.connect();
await c.run("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET enable_geoparquet_conversion=false;");
const U = (n) => `https://opendata.geoportal.gov.pl/bdot10k/schemat2021/GeoParquet/${n}.parquet`;
const t0 = Date.now();
await c.run(`CREATE OR REPLACE TABLE ditch AS
  SELECT TERYT, LOKALNYID, NAZWA, SZEROKOSC, ST_GeomFromWKB(GEOM) AS g
  FROM read_parquet('${U("OT_SWRM_L")}') WHERE TERYT IN ('0461','0403')`);
console.log("ditch loaded", (Date.now() - t0) / 1000, "s");
const n = await c.runAndReadAll(`SELECT TERYT, count(*) n, round(sum(ST_Length(g))/1000) km FROM ditch GROUP BY 1`);
console.log(n.getRowObjects());
const b = await c.runAndReadAll(`SELECT min(ST_XMin(g)) x0, max(ST_XMax(g)) x1, min(ST_YMin(g)) y0, max(ST_YMax(g)) y1 FROM ditch`);
console.log(b.getRowObjects());
// densest 10 km x 6.4 km window on a 1 km grid, using the ditch length
const w = await c.runAndReadAll(`
  WITH cells AS (SELECT floor(ST_X(ST_Centroid(g))/1000) cx, floor(ST_Y(ST_Centroid(g))/1000) cy, sum(ST_Length(g)) l FROM ditch GROUP BY 1,2),
  wins AS (SELECT a.cx wx, a.cy wy, sum(b.l) l FROM cells a JOIN cells b ON b.cx BETWEEN a.cx AND a.cx+9 AND b.cy BETWEEN a.cy AND a.cy+5 GROUP BY 1,2)
  SELECT wx*1000 x0, wy*1000 y0, round(l/1000) km FROM wins ORDER BY l DESC LIMIT 8`);
console.log(w.getRowObjects());
