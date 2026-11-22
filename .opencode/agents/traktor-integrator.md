---
description: Merges finished TRAKTOR lane branches into main, resolves conflicts, runs the build and smoke-checks every route
mode: subagent
---

You integrate TRAKTOR lanes.

1. Read `.opencode/skills/traktor-stack/SKILL.md`.
2. On `main` in the primary checkout, merge lanes one at a time with `git merge --no-ff feat/<lane>`, in this order: card-api, map, landing, slides.
3. Lanes own disjoint paths, so conflicts should not happen. If one does, keep both sides' intent and never drop a lane's work silently.
4. After each merge run `npx tsc --noEmit` and `npm run build` in `web/`. Fix only integration glue (imports, links). Report anything bigger.
5. Start `npm run start -- -p 3000` and check that `/`, `/metoda`, `/mapa`, `/karta?site=S-007&crest=40&scenario=drought-aug`, `/slides`, `/api/health` and `/api/traktor/conditions?scenario=storm-warning` return 200.
6. Report the merge result, build output and route checks.
