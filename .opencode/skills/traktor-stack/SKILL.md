---
name: TRAKTOR Stack
description: How to build in the TRAKTOR repo fast - Next.js 16 rules (cache components), folder ownership per lane, shared data/contracts, API contracts, commands and the commit/merge protocol. Load before writing any code in web/.
---

# TRAKTOR stack

App lives in `web/` (Next.js 16.4, React 19.3, TypeScript, Tailwind 4, npm). No other UI libraries. No new dependencies without asking the lead.

## Next.js 16 rules that bite
- `cacheComponents: true` is on. Any page that reads browser-only state, time (`Date.now()`, `new Date()`), `Math.random()` or URL params must render that part **client-side inside `<Suspense>`**.
- Pattern for interactive views (official, React 19.3):
  ```tsx
  // page.tsx (server)
  import { Suspense } from "react";
  import { ProgressLine } from "@/components/brand/ui";
  import App from "./App";
  export default function Page() {
    return <Suspense fallback={<ProgressLine />}><App /></Suspense>;
  }
  // App.tsx
  "use client";
  import { use } from "react";
  import { browser } from "react-dom";
  export default function App() {
    use(browser("Interactive map is browser-only."));
    const params = new URLSearchParams(window.location.search); // fine here
    ...
  }
  ```
- Do **not** use `useSearchParams` (it needs extra Suspense plumbing). Read `window.location` inside the browser-only component and update the URL with `window.history.replaceState`.
- Route handlers: `export async function GET(req: Request)`; dynamic params via `ctx: RouteContext<'/api/x/[name]'>` and `const { name } = await ctx.params`. Reading `req.url` makes the handler dynamic (that's fine).
- Page `params`/`searchParams` props are Promises. Avoid them; use the client pattern above.
- Docs live in `web/node_modules/next/dist/docs/`. Check them when unsure.

## Shared code (read-only for lanes, owned by main)
- `web/src/lib/traktor/` → `types.ts` (contracts), `mock.ts` (deterministic demo gmina: `ditches`, `candidates`, `sites`, `mapFeatures`, `summary`, `getSite`, `FEATURED_SITE_ID="S-007"`), `scenarios.ts` (`getScenario`, `SCENARIOS`, `SCENARIO_LABEL`), `rules.ts` (`decideOrder`, `bufferDays`, `fmtRange`, `THRESHOLDS`), `copy.ts` (`GMINA`, `DEMO_NOTE`, `SOURCES_MAP`, `REFUSAL_LABEL`, `CRESTS`, `LEGAL`, `FACTS`, taglines). Import from `@/lib/traktor`.
- `web/src/components/brand/` → see the TRAKTOR Brand skill.
- `web/src/app/globals.css`, `web/src/app/layout.tsx`.
If you need something changed there, **do not edit it**. Build a local version inside your lane folder and write the request in your final report.

## Lanes (one branch + one worktree each, no overlapping files)
| Lane | Branch | Owns (only these paths, under `web/src/`) | Routes |
|---|---|---|---|
| landing | `feat/landing` | `app/page.tsx`, `app/metoda/**`, `components/landing/**` | `/`, `/metoda` |
| map | `feat/map` | `app/mapa/**`, `components/map/**` | `/mapa` |
| card+api | `feat/card-api` | `app/api/**`, `app/karta/**`, `components/card/**` | `/api/*`, `/karta` |
| slides | `feat/slides` | `app/slides/**`, `components/slides/**`, and `docs/slides/**` at repo root | `/slides` |

Cross-lane links (use these exact URLs): `/`, `/metoda`, `/mapa`, `/mapa?site=S-007&crest=60&scenario=drought-aug`, `/karta?site=S-007&crest=40&scenario=drought-aug`, `/slides`.

## API contracts (lane card+api implements; others may call them but must work if they fail)
- `GET /api/health` → `{ ok: true, sha, demo: true }`
- `GET /api/traktor/conditions?scenario=live|drought-aug|storm-warning|spring-wet` → `Conditions` (live = Open-Meteo + IMGW, falls back to `getScenario("drought-aug")` with `mode:"fixture"` on any error, 5 s timeout)
- `GET /api/traktor/scenario/[name]` → `Conditions`
- `POST /api/traktor/order` body `{ scenario?: ScenarioName, conditions?: Conditions, siteIds?: string[] }` → `Order[]`
- `GET /api/traktor/parcel?id=...` or `?q=...` → `{ parcel, siteIds }` from mock parcels
- `POST /api/traktor/explain` body `{ siteId, crestCm, scenario }` → `{ textPl, source: "llm"|"template" }`
The map computes orders **client-side** with `decideOrder` (instant flip). It never blocks on the API.

## Honesty rules (all lanes)
- Every data surface shows `DEMO_NOTE` small, and a `SourceLine`.
- Ranges, not single numbers. Every card says "Wymaga wizji lokalnej."
- Weir = pozwolenie wodnoprawne (art. 389 pkt 6). No yield claims. No cost claims. Only the cited facts in `FACTS`.

## Commands (run in the worktree's `web/`)
- `npx tsc --noEmit` (fast check), `npm run build` (must pass before you finish), `npm run dev -- -p <port>` for a look.
- Ports: landing 3101, map 3102, card-api 3103, slides 3104 (avoid clashes).

## Commit protocol
- Commit early and often on your lane branch only: `git add -A && git commit -m "<lane>: <what>"`.
- Never commit outside your owned paths. Run `git status` before committing and revert anything else.
- Never merge, rebase or push. The lead merges lanes into `main`.
- Final report: what's done, routes, anything you need from shared code, known gaps.
