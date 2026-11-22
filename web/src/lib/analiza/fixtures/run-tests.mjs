// node src/lib/analiza/fixtures/run-tests.mjs [base] — live end-to-end checks of /api/analiza on the jury test set
// (docs/review/10-jury-test-set.md). Writes sample-today.json and sample-historical.json.
import { writeFileSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3110";
const set = [
  ["Kujawy (III)", "040706_5.0021.44", "pszenica_ozima"],
  ["Kościan (II)", "301103_2.0035.322/3", "kukurydza"],
  ["Hrubieszów AR (IV)", "060404_2.0142.AR_2.182", "burak_cukrowy"],
  ["Bielsk Podl. (III)", "200303_2.0052.141/1", "zyto"],
  ["Garwolin piaski (I)", "140311_2.0002.30/3", "ziemniak"],
  ["Głubczyce (IV)", "160203_4.0100.156/4", "pszenica_ozima"],
  ["Sulechów (II)", "080906_5.0002.65/3", "jeczmien_jary"],
  ["Pyrzyce (IV)", "321205_5.0005.135", "rzepak_ozimy"],
];
const negatives = ["040706_5.0020.3309/3", "141703_2.0001.116", "321205_4.0009.16"];
const ids = ["040706.0020.3309/3", "Kobylniki 1", "Brodzica 182", "306/2", "040706_5.0020.3309-3"];
const today = new Date().toISOString().slice(0, 10);
const out = [];
const run = async (q) => {
  const t = Date.now();
  const res = await fetch(`${base}/api/analiza?${q}`);
  return { res, j: await res.json(), ms: Date.now() - t };
};
for (const [name, id, crop] of set) {
  for (const date of [today, "2018-07-20"]) {
    const { res, j, ms } = await run(`parcelId=${encodeURIComponent(id)}&crop=${crop}&date=${date}`);
    if (!res.ok) { console.log(name, date, res.status, ms, "ms", j.error, j.messagePl); continue; }
    const st = j.sources.map((s) => `${s.id}:${s.status[0]}${s.ms}`).join(" ");
    console.log(`${name} ${crop} ${date} ${ms} ms | cur=${j.assessment.currentLevel} hist=${j.assessment.historicalLevel} kbw=${j.assessment.meteo.kbw60Mm} pct=${j.assessment.meteo.kbw60Percentile} drought=${j.assessment.meteo.droughtYears}/10 iung=${j.assessment.soil.iungCategory} causes=${j.causes.map((c) => c.id)} irr=${j.irrigation?.decision} unc=${j.uncertainty.level}`);
    console.log("    " + st);
    if (date !== today) console.log("    " + j.assessment.summaryPl);
    out.push({ date, j });
  }
}
for (const id of negatives) {
  const { res, j, ms } = await run(`parcelId=${encodeURIComponent(id)}&crop=pszenica_ozima&date=${today}`);
  console.log("NEG", id, res.status, ms, "ms", j.error, j.messagePl);
}
for (const id of ids) {
  const t = Date.now();
  const res = await fetch(`${base}/api/dzialka?id=${encodeURIComponent(id)}`);
  const j = await res.json();
  console.log("ID", JSON.stringify(id), res.status, Date.now() - t, "ms", j.id ?? j.error, j.candidates ? j.candidates.map((c) => `${c.id} ${c.commune}`).join("; ") : j.messagePl ?? "");
}
const pick = (d) => out.find((o) => (d === "past" ? o.date !== today : o.date === today))?.j;
if (pick("past")) writeFileSync(new URL("./sample-historical.json", import.meta.url), JSON.stringify(pick("past"), null, 2));
if (pick("today")) writeFileSync(new URL("./sample-today.json", import.meta.url), JSON.stringify(pick("today"), null, 2));
