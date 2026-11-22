// Run from web/: node --experimental-strip-types src/lib/analiza/satellite-test.mjs 2025-06-15,2021-07-20 pszenica_ozima
import { registerHooks } from "node:module";
// the engine uses extensionless relative imports (bundler style): map them to .ts for plain Node
registerHooks({
  resolve(spec, ctx, next) {
    if (/^\.\.?\//.test(spec) && !/\.[cm]?[jt]s$/.test(spec)) {
      try { return next(spec + ".ts", ctx); } catch { /* fall through */ }
    }
    return next(spec, ctx);
  },
});
const { getSatellite } = await import("./satellite.ts");

const crops = {
  pszenica_ozima: { id: "pszenica_ozima", namePl: "Pszenica ozima", kc: [0.4, 0.4, 0.5, 0.8, 1.15, 1.15, 0.6, 0.3, 0.3, 0.5, 0.5, 0.4], critical: [5, 6], rootDepthM: 1, iungKbw: [-150, -170, -190, -210], ndviHealthy: 0.75 },
  kukurydza: { id: "kukurydza", namePl: "Kukurydza", kc: [0, 0, 0, 0.3, 0.5, 0.9, 1.2, 1.2, 0.8, 0.4, 0, 0], critical: [7, 8], rootDepthM: 1, iungKbw: [-200, -220, -240, -260], ndviHealthy: 0.8 },
};
function sq(lat, lon) {
  const dLat = 100 / 111320, dLon = 100 / (111320 * Math.cos((lat * Math.PI) / 180));
  return { id: `t_${lat}_${lon}`, teryt: "", areaHa: 4, centroid: [lon, lat], geometry: { type: "Polygon", coordinates: [[[lon - dLon, lat - dLat], [lon + dLon, lat - dLat], [lon + dLon, lat + dLat], [lon - dLon, lat + dLat], [lon - dLon, lat - dLat]]] } };
}
const pts = [[52.40, 16.90], [53.15, 17.82], [50.30, 19.95]];
const dates = (process.argv[2] ?? "2025-06-15,2021-07-20").split(",");
const crop = crops[process.argv[3] ?? "pszenica_ozima"];
for (const d of dates) for (const [la, lo] of pts) {
  const t = Date.now();
  const r = await getSatellite(sq(la, lo), d, crop);
  console.log(JSON.stringify({ d, la, lo, wall: Date.now() - t, ...r }, null, 1));
}

