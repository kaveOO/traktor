# CI: co sprawdzamy i jak

## Workflowy
| Plik | Kiedy | Co sprawdza |
|---|---|---|
| `.github/workflows/ci.yml`, job `typecheck-build` | push i PR do `main` | `npm ci`, `npm run typecheck` (`next typegen && tsc --noEmit`), `npm run build` |
| `.github/workflows/ci.yml`, job `audit` | push i PR do `main` | `npm audit --omit=dev --audit-level=high` (tylko zależności runtime) |
| `.github/workflows/smoke.yml` | ręcznie (`workflow_dispatch`) i co noc o 03:00 UTC | build, `next start -p 3033`, kod 200 dla `/`, `/analiza`, `/raport?demo=1`, `/mapa`, `/api/health` oraz `ok:true` w `/api/health` |

Runner: ubuntu-latest, Node 22 (jak w `web/.nvmrc`). Cache: `~/.npm` (przez `setup-node`) i `web/.next/cache`. Limit czasu: 20 min. `concurrency` przerywa poprzedni przebieg, gdy na tę samą gałąź trafi nowy push.

**Dlaczego `npm run typecheck`, a nie samo `npx tsc --noEmit`:** typ `RouteContext` generuje `next typegen`. Sprawdziłem lokalnie: na czystym drzewie samo `tsc --noEmit` zgłasza `Cannot find name 'RouteContext'`, a `npm run typecheck` kończy się bez błędów.

## Sekrety
Nie są potrzebne. W kodzie są tylko opcjonalne zmienne:
- `GOOGLE_MAPS_API_KEY`: bez klucza `/api/tiles/google/status` zwraca `enabled:false`.
- `ANTHROPIC_API_KEY`: bez klucza używany jest tekst z szablonu.
- `TRAKTOR_SAT_PROVIDER` i `VERCEL_GIT_COMMIT_SHA`: obie mają wartości domyślne.

Żadna z nich nie jest czytana w czasie builda.

## Internet w czasie builda
`next/font/google` (Archivo, Inter w `layout.tsx`) pobiera kroje podczas `next build`. Bez sieci build się nie uda. Dlatego CI ma krok informacyjny: sprawdza dostępność `fonts.googleapis.com` i przy awarii wypisuje ostrzeżenie (`continue-on-error`), żeby było widać, że zawiodła sieć, a nie nasz kod.

## Zewnętrzne API (niestabilne)
Planetary Computer, NASA POWER, Open-Meteo (429), ULDK i Overpass bywają wolne lub niedostępne. CI ich **nie wywołuje**. Smoke test sprawdza tylko strony i `/api/health`, nie woła `/api/analiza` ani `/api/dzialka`. Strony renderują się bez tych usług, bo dane pobierane są dopiero po akcji użytkownika, a `/raport?demo=1` korzysta z fixture. Testy, które wołają te API, nie mogą blokować merge'a.

## Lokalnie (Windows, PowerShell)
```powershell
cd web
npm ci
npm run typecheck
npm run build
npm audit --omit=dev --audit-level=high
npm run start -- -p 3033   # osobne okno, potem:
foreach ($p in "/","/analiza","/raport?demo=1","/mapa","/api/health") { "$p " + (Invoke-WebRequest "http://localhost:3033$p" -UseBasicParsing).StatusCode }
```

## Ochrona gałęzi `main` (ustawić w GitHub)
- Require a pull request before merging.
- Require status checks: `Typecheck + build` oraz `Audit (runtime deps)`, z opcją „up to date”.
- Block force pushes i deletions.
- Smoke **nie** jest wymaganym checkiem, bo działa nocą i ręcznie.

## Czego CI nie sprawdza
- ESLint: `npm run lint` ma dziś 10 błędów w kodzie v1 (`docs/review2/10-legacy-lint-bundle-repo.md` §2). Dodać go do CI po ich poprawieniu.
- Testów jednostkowych nie ma.
