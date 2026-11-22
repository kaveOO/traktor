# TRAKTOR: agent guide

Hackathon project (KOWR "Zatrzymaj wodę, chroń plony"). The app lives in `web/` (Next.js 16). Research and plan are in `research/`, `HACKATHON_MASTER_REPORT.md` and `TRAKTOR_BUILD_PLAN.html`.

## Load these skills first
- `traktor-stack`: Next 16 rules, lane ownership, API contracts, commit protocol
- `traktor-brand`: visual identity; reuse `web/src/components/brand/*`
- `traktor-pitch`: facts you may claim, demo script

## Parallel build: lanes
Each lane = one branch + one git worktree + one agent (`.opencode/agents/traktor-lane.md`). Lanes own disjoint folders, so they never conflict:

| Lane | Branch | Worktree | Owns (under web/src) |
|---|---|---|---|
| landing | feat/landing | ../traktor-wt/landing | app/page.tsx, app/metoda/**, components/landing/** |
| map | feat/map | ../traktor-wt/map | app/mapa/**, components/map/** |
| card-api | feat/card-api | ../traktor-wt/card-api | app/api/**, app/karta/**, components/card/** |
| slides | feat/slides | ../traktor-wt/slides | app/slides/**, components/slides/**, docs/slides/** |

Shared code (`web/src/lib/traktor/**`, `web/src/components/brand/**`, `globals.css`, `layout.tsx`, configs) changes only on `main`.

- Create worktrees: `powershell -File scripts/lanes.ps1`
- Merge lanes: `powershell -File scripts/merge-lanes.ps1` (or use the `traktor-integrator` agent)

## Rules
- Polish UI copy, honest labels (demo data, ranges, source line, "Wymaga wizji lokalnej").
- No new dependencies without the lead's OK.
- `npm run build` in `web/` must pass before a lane is done.
