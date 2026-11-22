import type { CropId } from "./types";

/**
 * Official SMSR (IUNG-PIB) KBW drought thresholds, mm, per crop group × soil category I..IV × 60-day window.
 * Source: https://susza.iung.pulawy.pl/progi/ (MRiRW regulation of 11.04.2019), checked 2026-11-22 (docs/review/07-science.md).
 * null ("x") = SMSR does not define drought for that crop in that window (no yield loss expected) — NOT missing data.
 * Windows W0..W13 = six decades each, starting 21.III, 1.IV, 11.IV, 21.IV, 1.V, 11.V, 21.V, 1.VI, 11.VI, 21.VI, 1.VII, 11.VII, 21.VII, 1.VIII.
 */
const _ = null;
type Row = (number | null)[];
export type SmsrGroup = "zboza_ozime" | "zboza_jare" | "kukurydza_ziarno" | "rzepak" | "ziemniak" | "burak" | "warzywa" | "drzewa_owocowe";

export const SMSR: Record<SmsrGroup, [Row | "niewskazana", Row, Row, Row]> = {
  zboza_ozime: [[-129,-132,-137,-145,-154,-165,-180,-199,-220,_,_,_,_,_],[-150,-153,-158,-166,-175,-186,-201,-220,-241,_,_,_,_,_],
    [-188,-191,-196,-204,-213,-224,-239,-258,-279,_,_,_,_,_],[-215,-218,-223,-231,-240,-251,-266,-285,-306,_,_,_,_,_]],
  zboza_jare: [[-125,-127,-130,-135,-142,-153,-169,-186,-207,_,_,_,_,_],[-144,-146,-149,-154,-161,-172,-188,-205,-226,_,_,_,_,_],
    [-174,-176,-179,-184,-191,-202,-218,-235,-256,_,_,_,_,_],[-194,-196,-199,-204,-211,-222,-238,-255,-276,_,_,_,_,_]],
  kukurydza_ziarno: [[_,_,_,-168,-161,-156,-153,-152,-153,-154,-156,-158,-161,-164],[_,_,_,-200,-193,-188,-185,-184,-185,-186,-188,-190,-193,-196],
    [_,_,_,-236,-229,-224,-221,-220,-221,-222,-224,-226,-229,-232],[_,_,_,-271,-264,-259,-256,-255,-256,-257,-259,-261,-264,-267]],
  rzepak: [[-207,-187,-170,-155,-142,-132,_,_,_,_,_,_,-138,-138],[-232,-211,-193,-177,-165,-155,_,_,_,_,_,_,-158,-158],
    [-275,-254,-236,-220,-208,-198,_,_,_,_,_,_,-205,-205],[-297,-276,-258,-242,-230,-220,_,_,_,_,_,_,-230,-230]],
  ziemniak: [[_,_,-238,-232,-226,-219,-210,-200,-189,-178,-168,-157,-147,_],[_,_,-257,-251,-245,-238,-229,-219,-208,-197,-187,-176,-166,_],
    [_,_,-286,-280,-274,-267,-258,-248,-237,-226,-216,-205,-195,_],[_,_,-306,-300,-294,-287,-278,-268,-257,-246,-236,-225,-215,_]],
  burak: ["niewskazana",[-250,-248,-245,-241,-237,-232,-226,-220,-212,-202,-192,-182,-169,-155],
    [-277,-275,-272,-268,-264,-259,-253,-247,-239,-229,-219,-209,-196,-182],[-296,-294,-291,-287,-283,-278,-272,-266,-258,-248,-238,-228,-215,-201]],
  warzywa: [[_,_,_,-189,-187,-185,-184,-184,-184,-185,-187,-188,_,_],[_,_,_,-207,-205,-203,-202,-202,-202,-203,-205,-206,_,_],
    [_,_,_,-243,-241,-239,-238,-238,-238,-239,-241,-242,_,_],[_,_,_,-263,-261,-259,-258,-258,-258,-259,-261,-262,_,_]],
  drzewa_owocowe: [[-168,-171,-175,-180,-187,-193,-199,-205,-210,-215,-220,-223,_,_],[-190,-193,-197,-202,-209,-215,-221,-227,-232,-237,-242,-245,_,_],
    [-229,-232,-236,-241,-248,-254,-260,-266,-271,-276,-281,-284,_,_],[-249,-252,-256,-261,-268,-274,-280,-286,-291,-296,-301,-304,_,_]],
};

/** uzytki_zielone: no SMSR threshold (fallback rule, labelled). */
export const SMSR_GROUP: Record<CropId, SmsrGroup | null> = {
  pszenica_ozima: "zboza_ozime",
  zyto: "zboza_ozime",
  jeczmien_jary: "zboza_jare",
  kukurydza: "kukurydza_ziarno",
  rzepak_ozimy: "rzepak",
  ziemniak: "ziemniak",
  burak_cukrowy: "burak",
  warzywa: "warzywa",
  sad: "drzewa_owocowe",
  uzytki_zielone: null,
};

export const SMSR_GROUP_PL: Record<SmsrGroup, string> = {
  zboza_ozime: "zboża ozime",
  zboza_jare: "zboża jare",
  kukurydza_ziarno: "kukurydza na ziarno",
  rzepak: "rzepak i rzepik",
  ziemniak: "ziemniak",
  burak: "burak cukrowy",
  warzywa: "warzywa gruntowe",
  drzewa_owocowe: "drzewa owocowe",
};

const STARTS = ["03-21", "04-01", "04-11", "04-21", "05-01", "05-11", "05-21", "06-01", "06-11", "06-21", "07-01", "07-11", "07-21", "08-01"];
const ENDS = ["05-20", "05-31", "06-10", "06-20", "06-30", "07-10", "07-20", "07-31", "08-10", "08-20", "08-31", "09-10", "09-20", "09-30"];
const DM = (s: string) => `${Number(s.slice(3))}.${["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][Number(s.slice(0, 2)) - 1]}`;

export type SmsrWindow = { idx: number; start: string; end: string; labelPl: string };
export const windowsOf = (year: number): SmsrWindow[] =>
  STARTS.map((s, idx) => ({ idx, start: `${year}-${s}`, end: `${year}-${ENDS[idx]}`, labelPl: `${DM(s)}–${DM(ENDS[idx])}` }));

/** inside the SMSR monitoring season 21.III–30.IX */
export const inSmsrSeason = (date: string) => date.slice(5) >= "03-21" && date.slice(5) <= "09-30";

/** threshold (mm) for a crop/category/window; null = drought not defined; "niewskazana" = crop not advised on that soil; "brak" = no SMSR group */
export function smsrThreshold(crop: CropId, catIdx: number, w: number): number | null | "niewskazana" | "brak" {
  const g = SMSR_GROUP[crop];
  if (!g) return "brak";
  const row = SMSR[g][catIdx];
  if (row === "niewskazana") return "niewskazana";
  return row[w] ?? null;
}

/** windows in which SMSR defines drought for the crop (any soil category) */
export const cropWindows = (crop: CropId): number[] => {
  const g = SMSR_GROUP[crop];
  if (!g) return [];
  const row = SMSR[g][2] as Row;
  return row.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0);
};
