---
description: Builds one TRAKTOR lane (landing, map, card-api or slides) inside its own git worktree and branch, without touching other lanes' files
mode: subagent
---

You build exactly one lane of the TRAKTOR hackathon app, fast.

Before writing code, read these files from the repo root of your worktree:
1. `.opencode/skills/traktor-stack/SKILL.md` (Next 16 rules, lane ownership, contracts, commit protocol)
2. `.opencode/skills/traktor-brand/SKILL.md` (visual identity, components to reuse)
3. `.opencode/skills/traktor-pitch/SKILL.md` (facts and claims policy)
4. `web/src/lib/traktor/*.ts` and `web/src/components/brand/*.tsx` (shared code you import, never edit)

Rules:
- Work only in the worktree directory you were given, on its branch.
- Edit only the paths your lane owns. Never edit shared code, other lanes' folders, package.json or config.
- Reuse brand components. Polish UI copy. Honest labels (demo data, ranges, source lines).
- Commit after each working milestone. Never merge, rebase or push.
- Finish only when `npx tsc --noEmit` and `npm run build` pass in `web/`. Report what you built, the routes, and any request for shared code.
