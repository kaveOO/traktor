// Step 1: extract real BDOT10k layers for the AOI west of Bydgoszcz (EPSG:2180), clipped + simplified.
// Usage: node extract.mjs   -> out/layers.json
import { DuckDBInstance } from "@duckdb/node-api";
import { mkdirSync, writeFileSync } from "node:fs";

export const AOI = { x0: 416000, y0: 585500, w: 10000, h: 6400 }; // easting/northing, metres
const { x0, y0, w, h } = AOI;
const ENV = `ST_MakeEnvelope(${x0}, ${y0}, ${x0 + w}, ${y0 + h})`;
const TERYT = "TERYT IN ('0403','0461')";
const U = (n) => `https://opendata.geoportal.gov.pl/bdot10k/schemat2021/GeoParquet/${n}.parquet`;

const db = await DuckDBInstance.create(":memory:");
const c = await db.connect();
await c.run("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET enable_geoparquet_conversion=false;");

async function layer(name, cols, simplify, extraWhere = "") {
  const t = Date.now();
  const sql = `
    WITH src AS (SELECT ${cols ? cols + "," : ""} ST_GeomFromWKB(GEOM) g FROM read_parquet('${U(name)}') WHERE ${TERYT} ${extraWhere}),
    clip AS (SELECT * EXCLUDE g, ST_SimplifyPreserveTopology(ST_Intersection(g, ${ENV}), ${simplify}) g FROM src WHERE ST_Intersects(g, ${ENV}))
    SELECT * EXCLUDE g, ST_AsGeoJSON(g) gj FROM clip WHERE NOT ST_IsEmpty(g)`;
  const r = await c.runAndReadAll(sql);
  const rows = r.getRowObjects().map((o) => ({ ...o, gj: JSON.parse(o.gj) }));
  console.log(name, rows.length, "features", (Date.now() - t) / 1000, "s");
  return rows;
}

const out = {
  aoi: AOI,
  ditches: await layer("OT_SWRM_L", "LOKALNYID id, NAZWA name, SZEROKOSC width", 1.5),
  rivers: await layer("OT_SWRS_L", "NAZWA name", 3),
  canals: await layer("OT_SWKN_L", "NAZWA name", 3),
  water: await layer("OT_PTWP_A", "", 4),
  forest: await layer("OT_PTLZ_A", "", 6),
  fields: await layer("OT_PTTR_A", "", 6),
  orchards: await layer("OT_PTUT_A", "", 6),
  builtup: await layer("OT_PTZB_A", "", 6),
  roads: await layer("OT_SKDR_L", "LOKALNYID id, KLASADROGI cls, NUMERDROGI num, NAZWADROGI name", 3),
  buildings: await layer("OT_BUBD_A", "", 1),
};
mkdirSync("out", { recursive: true });
writeFileSync("out/layers.json", JSON.stringify(out));
console.log("written out/layers.json");
