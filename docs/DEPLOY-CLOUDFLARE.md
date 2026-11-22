# Wdrożenie TRAKTOR na Cloudflare Workers (OpenNext)

Aplikacja `web/` (Next.js 16.4, Cache Components) działa na Cloudflare Workers przez adapter
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) 1.20.18 i Wrangler 4.166. Pliki:

| Plik | Rola |
|---|---|
| `web/wrangler.jsonc` | nazwa workera `traktor`, `nodejs_compat` + `global_fetch_strictly_public`, assets, observability, `limits.cpu_ms`, zmienne |
| `web/open-next.config.ts` | konfiguracja OpenNext; cache przyrostowy: statyczne assety (tylko odczyt) |
| `web/next.config.ts` | `initOpenNextCloudflareForDev()` + nagłówki bezpieczeństwa (CSP itd., bez zmian) |
| `web/src/lib/runtime.ts` | `isWorkers()`, `canUseFs()`, `canUseNative()`, `cacheGet/cachePut` (Cache API) |

## 1. Wymagania

- Konto Cloudflare (darmowe wystarcza do `workers.dev`).
- **Workers Paid (5 USD/mies.)**, jeśli zostaje `"limits": { "cpu_ms": 30000 }`. Na planie Free limit CPU to
  10 ms na żądanie: `/api/analiza` go przekroczy, a wdrożenie z `cpu_ms` > 10 ms jest odrzucane. Na Free
  usuń blok `limits` (strony statyczne będą działać, analiza zwykle nie).
- Node 20.9+, `npm ci` w `web/`.
- Windows: OpenNext ostrzega, że Windows nie jest w pełni wspierany (zalecany WSL). Build i podgląd na
  Windows przeszły, ale produkcyjny build najlepiej robić w WSL lub CI (Linux).

## 2. Logowanie i wdrożenie

```powershell
cd web
npx wrangler login          # otwiera przeglądarkę, autoryzacja konta
npx wrangler whoami         # kontrola konta
npm run cf:preview          # build + lokalny workerd (http://localhost:8787)
npm run cf:deploy           # build + wdrożenie -> https://traktor.<subdomena>.workers.dev
```

Inne skrypty: `npm run cf:build` (tylko build do `.open-next/`), `npm run cf:typegen` (typy `CloudflareEnv`
z `wrangler.jsonc` do `cloudflare-env.d.ts`). Rozmiar paczki: `npx wrangler deploy --dry-run --outdir ../cf-dry`.

## 3. Zmienne i sekrety

Zmienne jawne są w `wrangler.jsonc` → `vars` (z `nodejs_compat` trafiają do `process.env`, OpenNext też je
tam kopiuje):

| Zmienna | Wartość | Po co |
|---|---|---|
| `TRAKTOR_DISABLE_DUCKDB` | `1` | natywny DuckDB (BDOT10k) nie działa w workerd |
| `TRAKTOR_RUNTIME` | `cloudflare-workers` | informacyjnie |

Klucze opcjonalne (domyślnie wyłączone; bez nich aplikacja działa na szablonach i darmowych podkładach):

```powershell
npx wrangler secret put ANTHROPIC_API_KEY      # tylko jeśli chcesz /api/traktor/explain z LLM
npx wrangler secret put GOOGLE_MAPS_API_KEY    # tylko jeśli chcesz kafelki Google
```

Lokalnie sekrety można dać w `web/.dev.vars` (ignorowany przez git). Nie wpisuj kluczy do `wrangler.jsonc`.

## 4. Własna domena

Dashboard → Workers & Pages → `traktor` → Settings → Domains & Routes → Add → Custom domain (domena musi być
w strefie Cloudflare). Albo w `wrangler.jsonc`:

```jsonc
"routes": [{ "pattern": "traktor.example.pl", "custom_domain": true }]
```

Uwaga: Cache API (`caches.default`, używany dla klimatologii NASA POWER) działa tylko na własnej domenie;
na `*.workers.dev` zapisy są ignorowane i zostaje cache w pamięci izolatu.

## 5. Ograniczenia i różnice względem Node (`next start`)

| Obszar | Na Workers |
|---|---|
| BDOT10k przez DuckDB (`@duckdb/node-api`) | wyłączone (`canUseNative()` = false). Silnik ma użyć Overpass (OSM), potem „brak danych”. |
| Cache NASA POWER w katalogu tymczasowym | wyłączony (`canUseFs()` = false); zamiast niego pamięć izolatu + Cache API (12 h, per centrum danych). |
| Cache wyników analizy, limit 30 zapytań/min/IP, limit 4 równoległych analiz | **per izolat** (Cloudflare uruchamia wiele izolatów i usuwa je w dowolnej chwili): to ochrona „best effort”, nie globalny limit. Globalny limit: Cloudflare Rate Limiting rule albo binding `ratelimit`. IP klienta brane z `CF-Connecting-IP`. |
| Czas żądania | brak limitu czasu ściennego dla czekania na `fetch`; liczy się CPU. `maxDuration` z route handlerów jest ignorowane. |
| CPU | analiza to głównie I/O (ULDK, NASA POWER, Open-Meteo, IUNG, SoilGrids, NMT, STAC). CPU idzie na: parsowanie JSON 10-letniej serii POWER i ETP FAO-56 (~3,9 tys. dni, ms), dekodowanie okien COG Sentinel-2 (deflate w JS, pako) i pętle pikseli (dziesiątki-setki pikseli na działkę). Szacunek: setki ms CPU na analizę, dlatego `cpu_ms: 30000` z zapasem. Zmierz w dashboardzie (Observability → CPU time). |
| Równoległe połączenia | Workers mają limit 6 jednocześnie otwartych połączeń na żądanie; nadmiarowe `fetch` czekają w kolejce (budżet satelity 15 s). |
| Obrazy | `next/image` nie jest używany; optymalizacja obrazów nie jest skonfigurowana (brak bindingu `IMAGES`). |
| Cache Components / PPR | OpenNext ostrzega: „Cache Components are not fully supported on Cloudflare yet” (PR opennextjs-cloudflare#1318). Strony renderują się poprawnie w podglądzie; aplikacja nie używa `"use cache"`, ISR ani `revalidate`. |
| Paczka | 11,8 MB / 2,56 MB gzip (limit: 3 MB Free, 10 MB Paid). `real-data.json` (1,36 MB surowo) jest w paczce serwera i kliencie; po gzip to ułamek, ale na Free zapas jest mały. |

Jeśli dojdzie ISR lub `"use cache"`: przełącz cache na R2 (instrukcja w `web/open-next.config.ts`).

## 6. Wycofanie wersji

```powershell
npx wrangler deployments list
npx wrangler rollback                 # poprzednia wersja
npx wrangler rollback <VERSION_ID>    # konkretna wersja
```

Albo Dashboard → Workers → `traktor` → Deployments → Rollback. Całkowite wyłączenie: `npx wrangler delete`.

## 7. Koszt (szacunek, ceny Cloudflare z 2026, sprawdź aktualny cennik)

| Scenariusz | Koszt |
|---|---|
| Demo / jury (setki-tysiące analiz/mies.) | 5 USD/mies. (Workers Paid, w cenie 10 mln żądań i 30 mln ms CPU) |
| ~100 tys. analiz/mies. przy ~0,5 s CPU | ~5 USD + nadwyżka CPU (~20 mln ms ponad limit × 0,02 USD/mln ms) ≈ 5-6 USD |
| Statyczne assety | bez opłat za żądania do assetów |

Koszty zewnętrzne: zero (wszystkie źródła danych są darmowe i bez kluczy).

## 8. Status testów lokalnych (workerd, `opennextjs-cloudflare preview`, 2026-11-22)

| Ścieżka | Status | Czas |
|---|---|---|
| `/`, `/analiza`, `/raport?demo=1`, `/mapa`, `/slides`, `/metoda`, `/karta`, `/api/health` | 200, nagłówki CSP obecne | 80-1700 ms (pierwsze żądanie zimne) |
| `/api/analiza` Kruszwica `040706_5.0021.44`, 2018-07-20 | 200 | 8,6 s (Node: 6,4 s) |
| ten sam, dziś | 200 | 8,5 s (Node: 6,1 s) |
| `/api/analiza` Głubczyce `160203_4.0100.156/4`, 2018-07-20 | 200 | 5,7 s (Node: 5,8 s) |
| ten sam, dziś | 200 | 5,9 s (Node: 7,2 s) |
| powtórka (cache izolatu) | 200, `X-Cache: HIT` | 0,2 s |

Znany problem: w pełnej paczce OpenNext Sentinel-2 wraca jako `missing`/`partial` tam, gdzie Node daje `ok`
(Głubczyce: brak sceny w obu datach). Ten sam kod satelity uruchomiony osobno w workerd (bez Next/Turbopack)
działa: `ok`, 2,9 s, 152 zapytania zakresowe. Chunki dekoderów geotiff są wbudowane w `handler.mjs`
(sprawdzone), więc przyczyna nieustalona; błędy są połykane w `bestScene()`. Kandydaci: chwilowe 429 z STAC
Planetary Computer podczas serii testów, limit 6 połączeń na żądanie przy równoległych źródłach. Do sprawdzenia:
tymczasowy `console.error` w `catch` w `bestScene()`/`search()` i `npx wrangler tail` po wdrożeniu.
Overpass (rowy OSM) był w czasie testów niedostępny także z Node, więc BDOT10k = `missing` na obu środowiskach.

## Sekcja do README

```markdown
### Cloudflare Workers

`web/` działa też na Cloudflare Workers (OpenNext). Szczegóły: [docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md).

    cd web
    npx wrangler login
    npm run cf:preview   # lokalnie na workerd
    npm run cf:deploy    # wdrożenie (Workers Paid: cpu_ms 30000)

Na Workers: BDOT10k przez DuckDB wyłączony (fallback Overpass), cache i limity zapytań są per izolat.
```
