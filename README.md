# TRAKTOR

**Niech ziemia zatrzyma swoją wodę.** (Let the land hold its water.)
TRAKTOR turns Poland's existing drainage ditches into reversible water storage: one board, two states, TRZYMAJ (hold) in drought and OTWÓRZ (open) before a storm. Built for the KOWR challenge "Zatrzymaj wodę, chroń plony", HackNation 2026.

## Run

```powershell
cd web
npm install
npm run dev        # http://localhost:3000
npm run build; npm run start   # production
```

## Routes

| Route | What |
|---|---|
| `/` | Landing page |
| `/mapa` | Main app: gmina map, refusal counter, site panel, crest slider, TRZYMAJ / OTWÓRZ orders, scenarios |
| `/mapa?site=S-007&crest=60&scenario=drought-aug` | Demo deep link (60 cm refused: neighbour's parcel) |
| `/karta?site=S-007&crest=40&scenario=drought-aug` | Printable site card (A4) |
| `/slides` | 10-slide pitch deck (arrows, `F` fullscreen, `P` notes, print = PDF) |
| `/metoda` | Method, data sources, rules, limits |
| `/api/health`, `/api/traktor/*` | API (conditions, scenario, order, parcel, explain) |

## Demo keys (on `/mapa`)
`1`–`4` scenarios (live, drought, storm, wet spring) · `←/→` crest height · click a green site to open it.

## Data
The map is **real data** for the area west of Bydgoszcz (Białe Błota / Sicienko): BDOT10k ditches, rivers, roads, buildings and land cover, GUGiK NMT 1 m heights and ULDK parcels, built offline by `scripts/geo` (`npm i` there, then `node extract.mjs` and `node build.mjs`) into `web/src/lib/traktor/real-data.json`. Storage, hectares and days of buffer are screening estimates; soil category is illustrative (IUNG not loaded) and the flood check is an 80 m corridor along rivers and canals (ISOK not loaded). Live weather in "Na żywo" mode comes from Open-Meteo and IMGW-PIB, with a recorded fallback.

## Repo
- `web/`: Next.js 16 app. Shared brand components in `web/src/components/brand`, data + rules in `web/src/lib/traktor`.
- `.opencode/skills/`: `traktor-brand`, `traktor-stack`, `traktor-pitch` skills.
- `.opencode/agents/`: `traktor-lane` (builds one lane in its own worktree), `traktor-integrator` (merges lanes).
- `scripts/lanes.ps1` / `scripts/merge-lanes.ps1`: parallel worktrees and the merge.
- `research/`, `HACKATHON_MASTER_REPORT.md`, `TRAKTOR_BUILD_PLAN.html`: research and plan.
