// Regenerate sample-today.json and sample-historical.json straight from the engine (no server needed).
// Run from web/: node --experimental-strip-types src/lib/analiza/fixtures/gen-samples.mjs [today-date]
// Parcel: Kraszyce 040706_5.0021.44 (Kujawy, IUNG III), pszenica ozima; historical date 2018-07-20.
import { registerHooks } from "node:module";
import { writeFileSync } from "node:fs";
// the engine uses extensionless relative imports (bundler style): map them to .ts for plain Node
registerHooks({
  resolve(spec, ctx, next) {
    if (/^\.\.?\//.test(spec) && !/\.[cm]?[jt]sx?$|\.json$/.test(spec)) {
      try { return next(spec + ".ts", ctx); } catch { /* fall through */ }
    }
    return next(spec, ctx);
  },
});
const { analyze } = await import("../analyze.ts");
const { todayPL } = await import("../util.ts");

const parcelId = "040706_5.0021.44";
const crop = "pszenica_ozima";
const today = process.argv[2] ?? todayPL();
for (const [file, date] of [["sample-today.json", today], ["sample-historical.json", "2018-07-20"]]) {
  const t = Date.now();
  const r = await analyze({ parcelId, crop, date });
  const bad = r.sources.filter((s) => s.status !== "ok").map((s) => `${s.id}:${s.status}`);
  console.log(file, date, `${Date.now() - t} ms`, r.assessment.currentLevel, "window", r.assessment.meteo.smsrWindowPl, "thr", r.assessment.meteo.smsrThresholdMm, "not ok:", bad.join(" ") || "none");
  writeFileSync(new URL(`./${file}`, import.meta.url), JSON.stringify(r, null, 1) + "\n");
}
