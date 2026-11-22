# THIRD_PARTY_NOTICES: komponenty zewnętrzne w TRAKTOR

Wygenerowano 22.11.2026 z pól `license` w `package.json` zainstalowanych pakietów (`web/node_modules`, `scripts/geo/node_modules`), wersje z `package-lock.json`.
Kod TRAKTOR jest naszym utworem. Poniższe komponenty zostają na licencjach ich autorów i nie są przedmiotem przeniesienia praw na KOWR. KOWR otrzymuje je na tych samych licencjach. Pełne teksty licencji są w katalogu każdego pakietu (`node_modules/<pakiet>/LICENSE*`) po `npm ci`.

## Podsumowanie

| Zakres | Pakiety | Licencje |
|---|---|---|
| `web/`, wszystkie (z narzędziami dev) | 386 | MIT 312 · Apache-2.0 23 · ISC 22 · BSD-2-Clause 9 · BSD-3-Clause 5 · MPL-2.0 3 · BlueOak-1.0.0 3 · CC0-1.0 2 · 0BSD 1 · CC-BY-4.0 1 · Python-2.0 1 · (MIT OR Apache-2.0) 1 · (MIT AND Zlib) 1 · MIT AND BSD-3-Clause 1 · Apache-2.0 AND LGPL-3.0-or-later 1 |
| `web/`, produkcyjne (`npm ls --omit=dev`) | 60 | tabela niżej (stan po dodaniu `@duckdb/node-api` do `web/package.json`, 22.11.2026) |
| `scripts/geo/` | 4 | MIT 3 · Apache-2.0 1 |

**Brak licencji GPL, AGPL, SSPL, BUSL, niekomercyjnych i pakietów bez licencji.**
Słaby copyleft dotyczy tylko niezmienionych binariów:
- `lightningcss` (MPL-2.0, narzędzie budowania Tailwind),
- `axe-core` (MPL-2.0, tylko lint),
- `sharp` / `@img/sharp-win32-x64` (Apache-2.0 oraz LGPL-3.0-or-later dla dołączonej biblioteki libvips, linkowanej dynamicznie i wymienialnej; opcjonalna optymalizacja obrazów Next.js).

Nie modyfikujemy tych pakietów.

Bezpieczeństwo zależności: `npm audit --omit=dev` w `web/` uruchomiony ponownie 22.11.2026 po scaleniu silnika (z `geotiff`) i po dodaniu `@duckdb/node-api`: **0 podatności** (info 0, low 0, moderate 0, high 0, critical 0).

## Zależności bezpośrednie (`web/package.json`)

| Pakiet | Wersja | Licencja | Repozytorium |
|---|---|---|---|
| next | 16.4.6 | MIT | github.com/vercel/next.js |
| react, react-dom | 19.3.0 | MIT | github.com/facebook/react |
| maplibre-gl | 6.19.0 | BSD-3-Clause | github.com/maplibre/maplibre-gl-js |
| geotiff | 3.0.5 | MIT | github.com/geotiffjs/geotiff.js |
| @duckdb/node-api | 2.0.1-r.1 | MIT | github.com/duckdb/duckdb-node-neo |
| tailwindcss, @tailwindcss/turbopack (dev) | 4.3.3 | MIT | github.com/tailwindlabs/tailwindcss |
| typescript (dev) | 5.x | Apache-2.0 | github.com/microsoft/TypeScript |
| eslint (dev), eslint-config-next (dev) | 9.x / 16.4.6 | MIT | github.com/eslint/eslint |
| @types/node, @types/react, @types/react-dom (dev) | – | MIT | DefinitelyTyped |

## Zależności produkcyjne (pełna lista, 60)

| Pakiet | Wersja | Licencja |
|---|---|---|
| @duckdb/node-api | 2.0.1-r.1 | MIT |
| @duckdb/node-bindings | 2.0.1-r.1 | MIT |
| @duckdb/node-bindings-win32-x64 | 2.0.1-r.1 | MIT (binarium DuckDB, zależne od platformy) |
| @img/colour | 1.1.0 | MIT |
| @img/sharp-win32-x64 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later |
| @mapbox/jsonlint-lines-primitives | 2.0.3 | MIT |
| @mapbox/point-geometry | 1.1.0 | ISC |
| @mapbox/tiny-sdf | 2.3.0 | BSD-2-Clause |
| @mapbox/unitbezier | 1.0.0 | BSD-2-Clause |
| @mapbox/vector-tile | 3.0.0 | BSD-3-Clause |
| @maplibre/geojson-vt | 6.3.3 | ISC |
| @maplibre/maplibre-gl-style-spec | 26.9.0 | ISC |
| @maplibre/mlt | 1.3.0 | MIT OR Apache-2.0 |
| @maplibre/vt-pbf | 4.3.3 | MIT |
| @next/env | 16.4.6 | MIT |
| @next/swc-win32-x64-msvc | 16.4.6 | MIT |
| @petamoriken/float16 | 3.9.3 | MIT |
| @swc/helpers | 0.5.23 | Apache-2.0 |
| @types/geojson | 7946.0.16 | MIT |
| @types/react | 19.3.0 | MIT |
| baseline-browser-mapping | 2.11.39 | Apache-2.0 |
| bidi-js | 1.1.0 | MIT |
| caniuse-lite | 1.0.30001826 | CC-BY-4.0 (dane: „Can I use”, Alexis Deveria) |
| client-only | 0.0.1 | MIT |
| csstype | 3.2.4 | MIT |
| detect-libc | 2.1.2 | Apache-2.0 |
| earcut | 3.2.4 | ISC |
| geotiff | 3.0.5 | MIT |
| gl-matrix | 3.4.4 | MIT |
| json-stringify-pretty-compact | 4.0.0 | MIT |
| kdbush | 4.1.0 | ISC |
| lerc | 3.0.0 | Apache-2.0 (Esri) |
| maplibre-gl | 6.19.0 | BSD-3-Clause |
| minimist | 1.2.8 | MIT |
| murmurhash-js | 1.0.0 | MIT |
| nanoid | 3.3.20 | MIT |
| next | 16.4.6 | MIT |
| pako | 2.2.0 | MIT AND Zlib |
| parse-headers | 2.0.6 | MIT |
| pbf | 5.2.0 | BSD-3-Clause |
| picocolors | 1.1.1 | ISC |
| postcss | 8.5.23 | MIT |
| potpack | 2.1.0 | ISC |
| protocol-buffers-schema | 3.6.1 | MIT |
| quick-lru | 6.1.2 | MIT |
| quickselect | 3.0.0 | ISC |
| react | 19.3.0 | MIT |
| react-dom | 19.3.0 | MIT |
| require-from-string | 2.0.2 | MIT |
| scheduler | 0.28.0 | MIT |
| semver (zależność `sharp`) | 7.8.6 | ISC |
| sharp | 0.35.5 | Apache-2.0 |
| source-map-js | 1.2.4 | BSD-3-Clause |
| styled-jsx | 5.1.6 | MIT |
| tinyqueue | 3.0.0 | ISC |
| tslib | 2.9.1 | 0BSD |
| web-worker | 1.5.0 | Apache-2.0 |
| xml-utils | 1.10.2 | CC0-1.0 |
| zstddec | 0.2.0 | MIT AND BSD-3-Clause |
| zustand | 5.1.0 | MIT |

Binaria `@next/swc-*`, `@img/sharp-*` i `@duckdb/node-bindings-*` zależą od platformy.

`@duckdb/node-api` jest w `web/package.json` (zmiana z 22.11.2026), ale kod `web/src` go jeszcze nie importuje, więc nie trafia do zbudowanej aplikacji. Jeśli zostanie użyty w trasie API, DuckDB pobiera rozszerzenia z `extensions.duckdb.org` (MIT) przy pierwszym użyciu. Na Linuksie/macOS instalują się odpowiedniki z tą samą licencją.

## `scripts/geo/` (przygotowanie danych offline, nie trafia do aplikacji)

| Pakiet | Wersja | Licencja |
|---|---|---|
| @duckdb/node-api | 2.0.1-r.1 | MIT |
| @duckdb/node-bindings (+ binarium platformy) | 2.0.1-r.1 | MIT |
| detect-libc | 2.1.2 | Apache-2.0 |

DuckDB przy pierwszym uruchomieniu pobiera rozszerzenia `httpfs` i `spatial` z `extensions.duckdb.org` (MIT).

## Kroje pisma

| Krój | Licencja | Uwagi |
|---|---|---|
| Archivo | SIL Open Font License 1.1 | self-hosting przez `next/font` |
| Inter | SIL Open Font License 1.1 | jw. |

OFL pozwala dołączać kroje do aplikacji. Nie wolno sprzedawać samych plików krojów.

## Wymagane informacje (skrót)

- **MIT / ISC / BSD / 0BSD / Zlib**: zachować informację o prawach autorskich i tekst licencji przy redystrybucji kodu źródłowego lub binariów. BSD-3-Clause zabrania używania nazw autorów do promocji.
- **Apache-2.0**: zachować tekst licencji i pliki `NOTICE`, jeśli pakiet je ma (np. `lerc`, `web-worker`, `sharp`).
- **LGPL-3.0 (libvips w sharp)**: zachować tekst licencji. Użytkownik może wymienić bibliotekę, bo jest linkowana dynamicznie.
- **CC-BY-4.0 (caniuse-lite)**: atrybucja danych „Can I use”.
- **MPL-2.0**: obowiązki tylko przy modyfikacji plików pakietu (nie modyfikujemy).

Odtworzenie listy: `npm ls --omit=dev --all` w `web/`, a pole `license` z `node_modules/*/package.json` (np. narzędziem `npx license-checker --production`, nieinstalowanym w projekcie).

Dane i usługi zewnętrzne (GUGiK, Copernicus, NASA POWER, Open-Meteo, IUNG, ISRIC, OSM, EOX, IMGW-PIB): `docs/LICENCJE.md`.
