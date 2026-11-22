// MapLibre 6 loads its tile worker as a separate ES module. Turbopack does not emit it, so the map never
// starts in production. Copy the worker from node_modules into public/ (served as /vendor/...), and
// MapView calls setWorkerUrl() with that path. Runs automatically before `npm run build` (prebuild).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("maplibre-gl/package.json"));
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "vendor");
mkdirSync(out, { recursive: true });
copyFileSync(join(pkgDir, "dist", "maplibre-gl-worker.mjs"), join(out, "maplibre-gl-worker.mjs"));
console.log("maplibre worker -> public/vendor/maplibre-gl-worker.mjs");
