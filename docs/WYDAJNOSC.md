# Wydajność: JS przy pierwszym wczytaniu

Data: 2026-11-22, gałąź `v4/perf` (start z `609f638`). Pomiar: dwa `next build` (Next 16.4.6, Turbopack). Liczymy unikalne chunki `<script>` w prerenderowanym HTML z `.next/server/app`, kompresja gzip -9. Ruchu sieciowego nie mierzyliśmy w przeglądarce.

## Przed i po

| Trasa | przed raw kB | przed gzip kB | po raw kB | po gzip kB | Co zrobiono |
|---|---:|---:|---:|---:|---|
| `/` | 577 | 178 | 577 | 178 | — |
| `/metoda` | 570 | 176 | 570 | 176 | — |
| **`/analiza`** | **1693** | **492** | **654** | **205** | maplibre-gl ładowane leniwie (`await import()` w efekcie) |
| `/raport` | 636 | 199 | 636 | 199 | — |
| `/mapa` | 1985 | 476 | 1985 | 476 | — (real-data.json 1333 kB) |
| `/karta` | 1941 | 463 | 1941 | 463 | — (real-data.json) |
| `/slides` | 1945 | 465 | 1945 | 465 | — (real-data.json) |

Największe chunki przed zmianą: `real-data.json` 1333 kB (`/mapa`, `/karta`, `/slides`), maplibre-gl 1095 kB (`/analiza`), framework 224 + 166 + 110 kB (wszystkie trasy). Po zmianie maplibre-gl nie wchodzi już do pierwszego wczytania `/analiza`. Przeglądarka pobiera go osobnym chunkiem dopiero po zamontowaniu mapy.

## Zmiana: `web/src/components/analiza/MapView.tsx`
- `import type` zamiast importu wartości. Biblioteka ładuje się przez `import("maplibre-gl")` w efekcie inicjalizacji. Mapa powstaje w funkcji `createMap` poza komponentem.
- Stan `ready` ponownie uruchamia efekty: warstwy, obrys działki, kamerę i znaczniki. Dzięki temu działka, a także cel lotu wybrany przed wczytaniem mapy, pokazują się, gdy mapa jest gotowa.
- Podczas ładowania widać `ProgressLine` „Ładuję mapę”. Przy błędzie pokazujemy komunikat „Nie udało się wczytać mapy. Odśwież stronę.”
- CSS maplibre zostaje importowany statycznie, więc kontrolki nie przeskakują.
- `npx tsc --noEmit`: czysto. `eslint MapView.tsx`: 0 problemów. `npm run build`: przechodzi.

## Co zostało (niezrobione w tym przebiegu)
1. **`/slides`, `/mapa`, `/karta`: `real-data.json` (1333 kB).** Plik wchodzi przez barrel `@/lib/traktor` (`index.ts` re-eksportuje `mock.ts`). Dla `/slides` wystarczy importować z `@/lib/traktor/copy` (`Deck.tsx:6`, `slides.tsx:10-19`), a `summary` przekazać jako props z serwerowego `app/slides/page.tsx`. Oczekiwany zysk to około 1,3 MB raw na `/slides`. `/mapa` i `/karta` naprawdę potrzebują danych. Tam pomoże tylko `fetch` z `public/` albo `import()` po wejściu.
2. **`/mapa`.** Używa własnego canvasu (`components/map`), nie maplibre. Problemem jest tam wyłącznie real-data.
3. **Fonty.** `Archivo` ma oś `wdth` (używane `font-stretch` 78% i 85%) i obie wagi są zmienne. Bez zmian. Zawężenie wymaga pomiaru plików woff2.
4. **`/raport`.** Ma 199 kB gzip, blisko wspólnej bazy 171 kB. Dzielenie ścieżki druku dałoby niewiele.
5. **Brak `import "server-only"`** w `lib/analiza/server.ts`. Ten katalog należy do innej osoby, więc go nie ruszałem.
6. **Czasy serwera `/api/analiza`.** Nie mierzone, nie uruchamiałem serwera.
