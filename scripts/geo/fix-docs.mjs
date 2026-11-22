// One-off: update docs that quoted the old mock numbers (run from repo root).
import { readFileSync, writeFileSync } from "node:fs";
const edits = {
  "docs/slides/speaker-notes.md": [
    [/Demo numbers \(from `summary`[^\n]*/, "Numbers are REAL (BDOT10k ditches, GUGiK NMT 1 m, ULDK parcels; area west of Bydgoszcz, Białe Błota/Sicienko): 1 939 points analysed on real ditches → 112 safe sites; 1 522 refused because the ditch is not visible in the 1 m terrain model. S-007 (real parcel 040307_2.0023.306/2): max board 50 cm, 60 cm refused (water spills onto neighbour parcel .304/1). Storage and hectares are screening estimates: read them off the slide."],
    ["Map of Gmina Kruszwica, every ditch, 31 safe sites (demo data).", "Real map west of Bydgoszcz: every BDOT10k ditch, 1 939 points tested, 112 safe sites."],
  ],
  ".opencode/skills/traktor-pitch/SKILL.md": [
    ["Map of Gmina Kruszwica: every ditch; counter 1 240 points → 31 safe (demo data).", "Real map west of Bydgoszcz (Białe Błota / Sicienko): every BDOT10k ditch; counter 1 939 points → 112 safe (real BDOT10k + NMT 1 m + ULDK; storage is a screening estimate)."],
  ],
  "README.md": [
    [/The demo gmina \(Kruszwica[^\n]*?\(BDOT10k ditches × NMT LiDAR 1 m × ULDK × ISOK × IUNG\)\./, "The map is **real data** for the area west of Bydgoszcz (Białe Błota / Sicienko): BDOT10k ditches, rivers, roads, buildings and land cover, GUGiK NMT 1 m heights and ULDK parcels, built offline by `scripts/geo` (`npm i` there, then `node extract.mjs` and `node build.mjs`) into `web/src/lib/traktor/real-data.json`. Storage, hectares and days of buffer are screening estimates; soil category is illustrative (IUNG not loaded) and the flood check is an 80 m corridor along rivers and canals (ISOK not loaded)."],
  ],
  "docs/blender/prompts.md": [["(`1 240 → 31`) only as labelled demo data.", "(`1 939 → 112`, real BDOT10k + NMT data west of Bydgoszcz)."]],
};
for (const [f, list] of Object.entries(edits)) {
  let t = readFileSync(f, "utf8");
  for (const [a, b] of list) {
    const before = t;
    t = t.replace(a, b);
    if (t === before) console.log("MISS", f, String(a).slice(0, 50));
  }
  writeFileSync(f, t);
}
writeFileSync("scripts/geo/.gitignore", "node_modules/\nout/\n*.duckdb\n");
console.log("ok");
