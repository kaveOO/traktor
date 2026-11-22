import { DuckDBInstance } from "@duckdb/node-api";
const db = await DuckDBInstance.create(":memory:");
const c = await db.connect();
await c.run("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET enable_geoparquet_conversion=false;");
const url = "https://opendata.geoportal.gov.pl/bdot10k/schemat2021/GeoParquet/" + (process.argv[2] ?? "OT_SWRM_L") + ".parquet";
const d = await c.runAndReadAll(`DESCRIBE SELECT * FROM read_parquet('${url}')`);
console.log(d.getRowObjects().map((r) => `${r.column_name}: ${r.column_type}`).join("\n"));
const m = await c.runAndReadAll(`SELECT key, value FROM parquet_kv_metadata('${url}') WHERE key='geo'`);
for (const r of m.getRowObjects()) console.log(String(r.value).slice(0, 600));
const rg = await c.runAndReadAll(`SELECT count(DISTINCT row_group_id) AS rgs, sum(row_group_num_rows)/count(*) AS x FROM parquet_metadata('${url}')`);
console.log(rg.getRowObjects());

