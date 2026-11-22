# TRAKTOR

**Niech ziemia zatrzyma swoją wodę.**
Asystent jednej działki rolnej dla całej Polski. Podajesz numer działki (albo klikasz na mapie), uprawę i datę. TRAKTOR pobiera dane na żywo, ocenia sytuację wodną, podaje przyczyny i proponuje działania: retencję, agrotechnikę, a na końcu nawadnianie.

Zadanie KOWR „Zatrzymaj wodę, chroń plony”, HackNation 2026.

> **Stan prac (22.11.2026).** Wszystkie moduły v2 są na `main` (silnik scalony w commicie `8ef08a1`). Trzy poprawki reguł silnika wskazane w przeglądzie `docs/review2/01-engine-logic.md` (P0) są **w poprawkach**: limit dawki nawadniania, faza dojrzewania i zbioru (miesiąc zbioru), porównanie z archiwum SMSR 2018. Prezentację PDF i raporty eksportujemy ponownie po tych poprawkach.

| Element | Stan |
|---|---|
| `/mapa`: przykład zastawek pod Bydgoszczą (BDOT10k + NMT + ULDK) z warunkami na żywo (Open-Meteo, IMGW-PIB) | gotowe |
| `/slides`: prezentacja (10 slajdów) | gotowe. `deliverables/prezentacja.pdf` **do ponownego eksportu po poprawkach silnika** |
| Kontrakt analizy (`web/src/lib/analiza/types.ts`, `crops.ts`) | gotowe |
| Moduł satelitarny `web/src/lib/analiza/satellite.ts` (Sentinel-2 L2A: Microsoft Planetary Computer, zapasowo Earth Search) | gotowe |
| Raport `/raport` (druk, PDF, JSON, zapis w przeglądarce; `?demo=1` = dane przykładowe) | gotowe |
| Kreator `/analiza` (mapa całej Polski: ortofotomapa GUGiK, działka z ULDK/KIEG, uprawa, data) | gotowe, liczy wynik przez `/api/analiza` |
| Silnik `/api/analiza`, `/api/dzialka` (ULDK, NASA POWER + Open-Meteo, IMGW, gleba, teren, Sentinel-2, reguły) | gotowe. W poprawkach: limit dawki nawadniania, miesiąc zbioru, kalibracja wobec SMSR 2018 |

Pakiet zgłoszeniowy (opis, lista kontrolna pkt 4.1, film, finał, dostęp jury): **`deliverables/README.md`**.

---

## 1. Instrukcja uruchomienia

Wymagania: Windows, macOS lub Linux; **Node.js ≥ 20.9** (`engines` w `web/package.json`), zalecany **22 LTS** (`web/.nvmrc`); dostęp do internetu. Internet jest potrzebny **także przy budowaniu**: `next/font` pobiera kroje Archivo i Inter w czasie `npm run build`. W czasie działania dane pobierane są na żywo. Konto nie jest potrzebne.

```powershell
cd web
npm install
npm run build
npm run start -- -p 3010
```

Otwórz **http://localhost:3010/analiza**.

Wersja online: **<LINK DO WERSJI DZIAŁAJĄCEJ>** (do uzupełnienia przez zespół; do tego czasu obowiązuje uruchomienie lokalne powyżej).

Zmienne środowiskowe nie są wymagane. Wzór jest w `web/.env.example` (same nazwy, puste wartości). Aby ustawić klucz, skopiuj go do `web/.env.local` (plik poza repozytorium, w `.gitignore`):

```powershell
Copy-Item web/.env.example web/.env.local
```

```
GOOGLE_MAPS_API_KEY=     # zostaw puste: w wersji dla jury wyłączone
ANTHROPIC_API_KEY=       # opcjonalny
```

| Klucz | Do czego | W wersji dla jury |
|---|---|---|
| `ANTHROPIC_API_KEY` | przeredagowanie opisów na prosty język (bez zmiany liczb) | opcjonalny |
| `GOOGLE_MAPS_API_KEY` | dodatkowe podkłady Google na `/mapa` | **wyłączony** (usługa płatna, pkt 5.4) |

Tryb deweloperski: `npm run dev` (http://localhost:3000).

## 2. Podstawowe funkcjonalności

Przepływ `/analiza`:

```
działka (numer ULDK lub klik)  →  uprawa  →  data (dziś lub do 10 lat wstecz)
   →  1. ocena sytuacji wodnej
   →  2. przyczyny (każda z liczbą i źródłem)
   →  3. rekomendacje retencyjne
   →  4. agrotechnika
   →  5. nawadnianie (opcjonalne: nie teraz / rozważ / tak, X mm)
   →  raport: druk, PDF, JSON, zapis w przeglądarce
```

- **Działka.** Numer w formacie ULDK, np. `040307_2.0023.306/2`, albo kliknięcie na mapie. Pobieramy obrys, powierzchnię, gminę i powiat.
- **Uprawa.** 10 upraw z miesięcznym współczynnikiem Kc (FAO-56) i okresem krytycznym: pszenica ozima, jęczmień jary, żyto, rzepak ozimy, kukurydza, ziemniak, burak cukrowy, użytki zielone, warzywa gruntowe, sad.
- **Ocena.** Klimatyczny bilans wodny (KBW) z 60 dni, percentyl na tle 10 lat, liczba lat z suszą w okresie krytycznym, NDVI/NDMI działki na tle lat poprzednich, kategoria gleby, spadek terenu, odległość do rowu.
- **Przyczyny.** Deficyt opadów, upał, niska retencja gleby, odpływ powierzchniowy, wrażliwa uprawa, stres roślin. Bez przyczyny nie ma rekomendacji.
- **Rekomendacje** (identyfikatory z `web/src/lib/analiza/analyze.ts`). Retencja (naturalne metody retencji, NWRM): `zastawka` (zastawka na rowie/cieku do 300 m, teren płaski), `oczko` (oczko lub niecka w najniższym punkcie), `pas_buforowy` (pas zieleni lub zadrzewienie w poprzek spadku). Agrotechnika: `miedzyplony`, `mulcz`, `uprawa_uproszczona`, `materia_organiczna`, `walowanie`, `odmiana_termin`, `lustracja` (sprawdzenie łanu w terenie). Na końcu `nawadnianie`. Każda rekomendacja wskazuje przyczyny (`basedOn`), ma uzasadnienie i, gdy trzeba, drogę prawną (pozwolenie wodnoprawne, „Wymaga wizji lokalnej”).
- **Działka nierolnicza.** Gdy IUNG w punkcie wskazuje las, wodę lub zabudowę, aplikacja zwraca komunikat zamiast analizy (kod `NOT_AGRICULTURAL`, HTTP 422). Działki większe niż 500 ha nie są analizowane.
- **Niepewność.** Poziom niska / średnia / wysoka z listą braków („Brak danych satelitarnych: zachmurzenie”).

Inne strony:

| Ścieżka | Co |
|---|---|
| `/mapa` | Przykład: zastawki na rowach na zachód od Bydgoszczy (Białe Błota / Sicienko), dane BDOT10k + NMT 1 m + ULDK. Suwak wysokości piętrzenia, odmowy z powodem, tryby TRZYMAJ / OTWÓRZ. Polecenia liczone z **warunków na żywo** (`/api/traktor/conditions`: Open-Meteo prognoza 7 dni + archiwum 60 dni, ostrzeżenia IMGW-PIB dla powiatu bydgoskiego) albo ze scenariuszy zapisanych |
| `/karta?site=S-007&crest=40&scenario=drought-aug` | Karta miejsca zastawki do druku |
| `/slides` | Prezentacja (strzałki, `F` pełny ekran, `P` notatki, druk = PDF) |
| `/metoda` | Metoda, źródła, ograniczenia |
| `/` | Strona główna |

## 3. Architektura

```
 przeglądarka                       serwer Next.js 16 (Node)                     źródła zewnętrzne
 ┌──────────────┐  POST/GET        ┌─────────────────────────────┐
 │ /analiza     │ ───────────────► │ /api/analiza                │
 │ kreator+mapa │ ◄─────────────── │  cache (działka,uprawa,data) │
 └──────────────┘  AnalysisResult  │  analyze.ts                 │
 ┌──────────────┐                  │   ├ uldk.ts      ──────────────► ULDK (GUGiK)
 │ /raport      │ ─ GET ─────────► │   ├ meteo.ts     ──────────────► NASA POWER (10 lat) + Open-Meteo prognoza, IMGW
 └──────────────┘                  │   ├ soil.ts      ──────────────► IUNG WCS, SoilGrids
 ┌──────────────┐  /api/dzialka    │   ├ terrain.ts   ──────────────► NMT GUGiK, OSM Overpass (opcj.)
 │ (kreator)    │                  │   └ satellite.ts ──────────────► Sentinel-2 L2A COG (Planetary Computer → Earth Search)
 └──────────────┘                  │  równolegle, limit czasu    │
                                   │  na źródło, wynik częściowy │
                                   └─────────────────────────────┘
 ┌──────────────┐  GET             ┌─────────────────────────────┐
 │ /mapa        │ ───────────────► │ /api/traktor/conditions     │ ─► Open-Meteo prognoza + archiwum 60 d, IMGW-PIB
 └──────────────┘ ◄─────────────── │ /api/traktor/{order,parcel, │
                                   │   scenario,explain}         │ ─► (opcj.) Anthropic API, domyślnie wyłączone
        ▲                          └─────────────────────────────┘
        │ real-data.json
 scripts/geo (offline, DuckDB) ──► BDOT10k GeoParquet, NMT, ULDK
```

- **Next.js 16** (App Router), TypeScript, Tailwind CSS 4. Jeden proces Node: strony + API.
- **`web/src/lib/analiza`**: moduły `uldk`, `meteo` + `power`, `soil`, `terrain`, `satellite`, `smsr`, `analyze`, `server` (walidacja, cache, limity). Po ULDK wszystkie źródła idą równolegle ze wspólnym terminem ok. 20 s, a całą analizę zamyka budżet 24 s (`maxDuration = 30`). Gdy źródło nie odpowie, wynik jest częściowy, a brak trafia do sekcji niepewności. Cel regulaminowy: ≤ 30 s.

Trasy API (`web/src/app/api/**`):

| Trasa | Metoda | Co robi |
|---|---|---|
| `/api/analiza` | `POST` (JSON `AnalysisRequest`, ≤ 4 kB) albo `GET ?parcelId=..` lub `?lon=..&lat=..`, `&crop=..&date=..` | pełna analiza działki → `AnalysisResult` (kontrakt `web/src/lib/analiza/types.ts`). Cache 1 h (maks. 200 wyników), nagłówek `X-Cache: HIT`, limit 30/min na IP, maks. 4 analizy naraz (dalej 503 „Serwer liczy inne analizy”) |
| `/api/dzialka` | `GET ?id=..` albo `?lon=..&lat=..` | obrys działki z ULDK (WGS84), `tooLarge` dla > 500 ha; 409 z listą kandydatów przy niejednoznacznym numerze. Limit 60/min na IP |
| `/api/traktor/conditions` | `GET ?scenario=live` (domyślnie) lub nazwa scenariusza | warunki dla `/mapa` (`web/src/app/api/_lib/conditions.ts`): Open-Meteo prognoza 7 dni, KBW z 60 dni z archiwum Open-Meteo (gdy archiwum odpowie 429 lub błędem: prognoza z `past_days=60`), ostrzeżenia IMGW-PIB dla powiatu 0403. Każda część osobno wraca do scenariusza zapisanego, gdy źródło nie odpowie (etykieta „Dane zapisane”). Cache CDN 30 min |
| `/api/traktor/scenario/[name]` | `GET` | scenariusz zapisany: `drought-aug`, `storm-warning`, `spring-wet` |
| `/api/traktor/order` | `POST` | polecenia TRZYMAJ / OTWÓRZ dla zastawek przykładu `/mapa` przy danych warunkach |
| `/api/traktor/parcel` | `GET ?id=..` lub `?q=..` | wyszukiwanie działki w danych przykładu `/mapa` (bez ULDK) |
| `/api/traktor/explain` | `POST` | opis miejsca zastawki: szablon, opcjonalnie przeredagowany przez Anthropic API (tylko z `ANTHROPIC_API_KEY`) |

Interfejs wywołuje `/api/analiza`, `/api/dzialka` (kreator i raport), `/api/traktor/conditions` i `/api/tiles/google/status` (`/mapa`). Trasy `order`, `parcel`, `scenario`, `explain` i `health` to API dla integracji i testów; strony liczą polecenia zastawek w przeglądarce z tych samych reguł (`web/src/lib/traktor`).
| `/api/tiles/google/**` | `GET` | proxy podkładów Google; bez `GOOGLE_MAPS_API_KEY` zwraca 404 |
| `/api/health` | `GET` | `{ ok, sha, demo: true, time }`; `sha` z `VERCEL_GIT_COMMIT_SHA` albo `"local"`. Flaga `demo: true` oznacza wersję konkursową |

- **Mapa `/analiza`**: MapLibre GL. Podkład: ortofotomapa GUGiK (WMTS EPSG:3857), przy małym przybliżeniu EOX Sentinel-2 cloudless **2016** (CC BY 4.0). Do wyboru mapa OSM, granice działek KIEG od przybliżenia 15, wyszukiwanie miejscowości przez Nominatim.
- **Google Map Tiles**: opcjonalne podkłady na `/mapa` przez serwerowe proxy. **Wyłączone w wersji dla jury**: bez `GOOGLE_MAPS_API_KEY` trasy zwracają 404, a podkład jest ukryty.
- **Reguły są deterministyczne.** Te same dane wejściowe dają ten sam wynik. Model językowy (opcjonalny) tylko przeredagowuje gotowy tekst.
- **`scripts/geo`**: skrypty offline (DuckDB) budujące przykład `/mapa` do `web/src/lib/traktor/real-data.json`.

## 4. Źródła i zakresy danych

| Kategoria (pkt 3.3) | Źródło | Co bierzemy | Zakres przestrzenny | Zakres czasowy |
|---|---|---|---|---|
| przestrzenne | ULDK (GUGiK) `GetParcelById`, `GetParcelByXY` | obrys, TERYT, gmina, powiat, powierzchnia | cała Polska, działka ewidencyjna | stan bieżący |
| meteorologiczne | NASA POWER (LaRC), API daily point, community AG | dobowy opad, temperatura, wilgotność, wiatr, promieniowanie → ET0 FAO-56 (Penman-Monteith, zapasowo Hargreaves) | centroid działki (cache per komórka 0,1°), siatka źródłowa ok. 0,5° | 10 lat wstecz od daty analizy do wczoraj |
| meteorologiczne | Open-Meteo, prognoza (`past_days=92`, `forecast_days=10`) | opad, ET0 FAO, Tmax/Tśr dla dni, których NASA POWER jeszcze nie ma, oraz prognoza | centroid działki, siatka kilka km | ostatnie 92 dni + 10 dni prognozy |
| meteorologiczne | Open-Meteo, archiwum ERA5 (`archive-api.open-meteo.com`) | **tylko `/mapa`**: opad i ET0 FAO → KBW z 60 dni dla przykładu pod Bydgoszczą. W silniku `/analiza` **nieużywane** (darmowe archiwum zwracało 429, limit dzienny; 10 lat bierzemy z NASA POWER). Przy 429 `/mapa` liczy KBW z prognozy z `past_days=60` | jeden punkt: środek gminy przykładu | 60 dni kończące się 5 dni przed dziś |
| meteorologiczne | Open-Meteo, prognoza dla `/mapa` (`forecast_days=7`) | opad 72 h i 7 dni, ET0 na dziś | jw. | 7 dni prognozy |
| meteorologiczne | IMGW-PIB, ostrzeżenia | aktywne ostrzeżenia meteorologiczne | powiat działki (`/analiza`), powiat bydgoski 0403 (`/mapa`) | `/analiza`: tylko gdy data = dziś; `/mapa`: zawsze bieżące |
| satelitarne | Sentinel-2 L2A: **Microsoft Planetary Computer** (STAC + token SAS), zapasowo **Earth Search** (Element 84, AWS Open Data) | NDVI (B04/B08), NDMI (B8A/B11) średnio dla działki, maska SCL (klasy 4–5) | piksel 10–20 m, obrys działki | scena najbliższa dacie (nie po niej) + mediana tego samego okna z 5 poprzednich sezonów |
| przestrzenne (podkład) | Ortofotomapa GUGiK WMTS; EOX Sentinel-2 cloudless 2016; KIEG WMS | obraz i granice działek na mapie (bez obliczeń) | cała Polska | ortofotomapa wg arkuszy, mozaika EOX z 2016 r., KIEG stan bieżący |
| glebowe | IUNG-PIB, WCS podatności na suszę (`Susza__katgl_landuse2024`) | kategoria gleby I–IV | cała Polska, raster | warstwa 2024 |
| glebowe | ISRIC SoilGrids 2.0 | piasek, glina, węgiel organiczny → pojemność wodna (Saxton-Rawls) | 250 m | warstwa statyczna |
| hydrologiczne / rzeźba | NMT GUGiK 1 m (`GetHByPointList`) | wysokości w siatce nad działką → spadek, najniższy punkt | punkt, rozdzielczość 1 m | stan z lotniczego skanowania (różne lata) |
| hydrologiczne | OpenStreetMap (Overpass, 2 serwery) | rowy, kanały i cieki w pobliżu (odległość do najbliższego) | ok. 1 km wokół działki | stan bieżący |
| hydrologiczne | ISOK (PGW Wody Polskie) | **tylko link** w raporcie: strefy zagrożenia powodziowego nie są sprawdzane automatycznie (wpis w „Brakach”) | – | – |
| hydrologiczne / przestrzenne | BDOT10k (GUGiK), GeoParquet | rowy, rzeki, kanały, drogi, budynki, pokrycie terenu (tylko `/mapa`) | powiaty 0403, 0461 | pobrane 22.11.2026 |

Każdy raport zawiera tabelę źródeł: nazwa, użyty zakres (np. „NASA POWER 2016-11-22..2026-11-21”), status (pobrano / częściowo / brak), czas pobrania, licencja.

## 5. Dane pobierane na bieżąco i pobrane wcześniej

| Dane | Sposób | Data |
|---|---|---|
| Wszystko w `/analiza` i `/raport` (ULDK, NASA POWER, Open-Meteo prognoza, IMGW, Sentinel-2, IUNG, SoilGrids, NMT, OSM Overpass) | **na żywo, przy każdym zapytaniu** (z pamięcią podręczną serwera: wynik 1 h dla tej samej działki, uprawy i daty; seria NASA POWER per komórka 0,1°) | czas pobrania zapisany w raporcie |
| Podkłady mapy (ortofotomapa GUGiK, EOX 2016, OSM, KIEG) | na żywo, kafle z serwerów dostawców | – |
| Warunki na `/mapa` (Open-Meteo prognoza 7 dni + archiwum 60 dni, ostrzeżenia IMGW-PIB) | **na żywo** przez `/api/traktor/conditions` (cache 30 min). Gdy źródło nie odpowie: wartości ze scenariusza zapisanego `drought-aug`, z etykietą „Dane zapisane (brak połączenia)” | czas `asOf` w odpowiedzi |
| Raport `/raport?demo=1` | **dane przykładowe** (`web/src/components/raport/fixture.ts`), z banerem „Dane przykładowe (tryb demo)” | tylko do pokazania układu |
| Przykład `/mapa`: warstwy BDOT10k, próbki NMT, działki ULDK, obraz ortofotomapy GUGiK | pobrane wcześniej skryptami `scripts/geo` | **22.11.2026** |
| Scenariusze `/mapa` (`drought-aug`, `storm-warning`, `spring-wet`) | stałe w kodzie, `web/src/lib/traktor` | do pokazania reguł, oznaczone w interfejsie |
| Tabela upraw (Kc, okres krytyczny, progi KBW) | stała w kodzie, `web/src/lib/analiza/crops.ts` | wg FAO-56 i IUNG SMSR, progi „do kalibracji” |

Ocena, przyczyny, rekomendacje i nawadnianie **liczy aplikacja** z pobranych danych. Nie wyświetlamy gotowych rekomendacji.

Odtworzenie przykładu `/mapa`:

```powershell
cd scripts/geo
npm install
node extract.mjs   # BDOT10k → out/layers.json
node build.mjs     # NMT + ULDK → web/src/lib/traktor/real-data.json
```

Skrypty potrzebują internetu: dane GUGiK oraz rozszerzenia DuckDB (`extensions.duckdb.org`) pobierane przy pierwszym uruchomieniu.

## 6. Biblioteki, komponenty, usługi zewnętrzne, AI

| Element | Wersja | Do czego |
|---|---|---|
| next | 16.4.6 | aplikacja, API |
| react, react-dom | 19.3.0 | interfejs |
| tailwindcss, @tailwindcss/turbopack | 4.3.3 | style |
| maplibre-gl | ^6.19 | mapa całej Polski |
| geotiff | ^3.0 | odczyt okien z COG Sentinel-2 i WCS IUNG |
| typescript | ^5 | typy |
| eslint, eslint-config-next | ^9 / 16.4.6 | lint |
| @duckdb/node-api (tylko `scripts/geo`) | ^2.0 | odczyt BDOT10k GeoParquet |
| Archivo, Inter (`next/font`) | — | kroje pisma |

Usługi zewnętrzne: wszystkie z tabeli w pkt 4, plus podkłady mapy (ortofotomapa GUGiK, EOX s2cloudless 2016, kafle OSM, KIEG) i wyszukiwarka Nominatim. Bez kont i bez płatnych usług w podstawowych funkcjach. Dwie usługi płatne są opcjonalne i **wyłączone w wersji dla jury**: Google Map Tiles i Anthropic API. Koszty i alternatywy: `docs/LICENCJE.md` §3. Pełna lista pakietów z licencjami: `docs/THIRD_PARTY_NOTICES.md`.

### AI w projekcie

- **Przy tworzeniu kodu** korzystaliśmy z asystenta AI do programowania: **Claude (Anthropic) w środowisku OpenCode**. Pomagał pisać i przeglądać kod, dokumentację i slajdy, a także przygotował przeglądy w `docs/review/`. Projekt, reguły, decyzje i weryfikacja wyników należą do zespołu. Warunki Anthropic przyznają wyniki użytkownikowi, więc nic nie blokuje przeniesienia kodu na KOWR.
- **W aplikacji analiza jest deterministyczna**: reguły i wzory (FAO-56, progi SMSR, NDVI/NDMI), bez modelu. Te same dane wejściowe dają ten sam wynik. Pole `textSource` w wyniku ma wartość `"template"`.
- **Opcjonalny model językowy** (`ANTHROPIC_API_KEY`) służy tylko do przeredagowania gotowego opisu miejsca zastawki na prostszy język, w trasie API `/api/traktor/explain` (strony `/karta` i `/mapa` jej obecnie nie wywołują i pokazują tekst z reguł). **Domyślnie wyłączony.** Strażnik liczb odrzuca tekst, w którym pojawia się liczba spoza szablonu, i wtedy pokazujemy tekst z reguł. Do modelu trafiają tylko wskaźniki, bez danych osobowych.
- Nie używamy uczenia maszynowego do oceny. ML ma sens po pilotażu, gdy będą dane z pola.
- W aplikacji i prezentacji nie ma obrazów wygenerowanych przez AI (zasada marki, `docs/blender/prompts.md`). Grafiki to SVG i wycinek ortofotomapy GUGiK.

## 7. Licencje i warunki

| Źródło / biblioteka | Licencja / warunki | Atrybucja |
|---|---|---|
| ULDK, NMT, BDOT10k, ortofotomapa (GUGiK) | dane otwarte, ustawa Prawo geodezyjne i kartograficzne (art. 40a), bez opłat | „Dane: Główny Urząd Geodezji i Kartografii” |
| Open-Meteo (prognoza; archiwum ERA5 tylko na `/mapa`) | dane CC BY 4.0; **darmowe API tylko do użytku niekomercyjnego**; archiwum ERA5 dodatkowo warunki Copernicus C3S | „Weather data by Open-Meteo.com”; dla archiwum „Contains modified Copernicus Climate Change Service information” |
| NASA POWER (LaRC) | dane NASA, otwarte, bez opłat i kont; prośba o cytowanie | „Dane: NASA Langley Research Center POWER Project” |
| IMGW-PIB | ponowne wykorzystanie na warunkach IMGW-PIB | „Źródłem pochodzenia danych jest IMGW-PIB.” + „Dane IMGW-PIB zostały przetworzone.” |
| Sentinel-2 L2A (Microsoft Planetary Computer; zapasowo Earth Search / AWS Open Data) | dane: licencja Copernicus Sentinel (wolny dostęp); usługi: warunki Planetary Computer i Element 84, bez SLA | „Contains modified Copernicus Sentinel data [rok]” |
| EOX Sentinel-2 cloudless **2016** (kafle) | CC BY 4.0 (roczniki 2018+ są NC-SA i **nie są używane**); hostowana usługa EOX niekomercyjna | „Sentinel-2 cloudless – s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)” |
| KIEG (GUGiK, granice działek WMS) | usługa publiczna, podgląd bezpłatny | „Działki: KIEG, GUGiK / starostwa” |
| Nominatim (wyszukiwanie miejscowości) | polityka OSMF: ≤ 1 zapytanie/s, dane ODbL | „© autorzy OpenStreetMap” |
| IUNG-PIB (WCS, progi SMSR) | brak jawnej licencji w usłudze (do potwierdzenia z IUNG) | „Źródło: IUNG-PIB, System Monitoringu Suszy Rolniczej” |
| ISRIC SoilGrids | CC BY 4.0 | „SoilGrids, ISRIC – World Soil Information” |
| OpenStreetMap (dane, kafle) | ODbL; kafle wg Tile Usage Policy | „© współtwórcy OpenStreetMap” |
| ISOK (Wody Polskie) | dane publiczne | „Źródło: ISOK, PGW Wody Polskie” |
| Google Map Tiles | płatne, warunki Google | **wyłączone w wersji dla jury** |
| next, react, react-dom, tailwindcss, typescript, eslint | MIT / Apache-2.0 (typescript) | — |
| maplibre-gl | BSD-3-Clause | — |
| geotiff | MIT | — |
| @duckdb/node-api | MIT | — |
| Archivo, Inter | SIL Open Font License 1.1 | — |
| sharp (opcjonalna optymalizacja obrazów Next.js) | Apache-2.0 + LGPL-3.0 (libvips, niezmieniona) | tekst licencji |

Pełny rejestr (§ 2 ust. 10 Regulaminu): **`docs/LICENCJE.md`**. Wszystkie pakiety npm: **`docs/THIRD_PARTY_NOTICES.md`** (brak GPL/AGPL/NC). Przekazanie KOWR: **`docs/PRZEKAZANIE.md`**.

Uwagi do wdrożenia produkcyjnego:
- **Open-Meteo**: darmowe API jest niekomercyjne. KOWR potrzebuje planu komercyjnego albo własnej instancji (kod Open-Meteo jest otwarty, AGPL).
- **Kafle OSM**: polityka użycia nie pozwala na duży ruch. W produkcji: własny serwer kafli lub podkłady GUGiK (WMTS).
- **Google**: płatne, w wersji dla jury wyłączone.
- **EOX s2cloudless**: tylko rocznik 2016. Dla KOWR usunąć warstwę albo zawrzeć umowę z EOX (ortofotomapa GUGiK wystarcza).
- **Nominatim, Overpass**: polityki fair use. W produkcji geokoder GUGiK (UUG) i wyciąg offline / BDOT10k.
- **Planetary Computer / Earth Search**: bezpłatne, bez SLA. Przy dużym ruchu Copernicus Data Space lub własny magazyn scen.

## 8. Znane ograniczenia

- **Pogoda nie jest w skali pola.** NASA POWER to siatka ok. 0,5° (dziesiątki km), Open-Meteo kilka km. Lokalna burza może nie być widoczna. NASA POWER to inny produkt niż ERA5. Źródło podajemy w raporcie.
- **Reguły silnika w poprawkach** (przegląd `docs/review2/01-engine-logic.md`, P0): dawka nawadniania nie ma jeszcze limitu na jedno podlewanie (dziś uzupełnia cały ubytek), zboża i rzepak po fazie krytycznej (dojrzewanie, zbiór) mogą dostać przyczynę „stres roślin” i nawadnianie, a wynik dla suszy 2018 wymaga porównania z archiwum SMSR. Do czasu poprawek traktuj te elementy raportu ostrożnie.
- **Rekomendacja „wrażliwa uprawa” opiera się na kalendarzu** (okres krytyczny uprawy), nie na pomiarze.
- **Sentinel-2 i chmury.** Przy zachmurzeniu nie ma sceny blisko daty. Wtedy status „brak danych” i wyższa niepewność.
- **SoilGrids ma 250 m.** Działka może leżeć na innej glebie niż piksel.
- **Kategorie IUNG są zgrubne** (4 klasy).
- **NMT 1 m może nie pokazać małych rowów.** Wtedy „rów niewidoczny w NMT” i wizja lokalna.
- **Brak danych o drenowaniu podziemnym.** Sączki nie są w żadnym otwartym zbiorze.
- **Faza uprawy przybliżona miesiącem**, bez daty siewu.
- **Progi KBW i NDVI są „do kalibracji”.** To przybliżenia progów IUNG SMSR.
- **Kc uproszczone** do wartości miesięcznych.
- **Dostępność usług.** Overpass bywa wolny lub niedostępny. Wtedy wynik częściowy.
- **ISOK nie jest sprawdzany automatycznie.** Raport podaje link i wpis w brakach danych.
- **Cache i limity są w pamięci jednego procesu.** Restart serwera je czyści. Przy kilku instancjach potrzebny wspólny magazyn (Redis).
- **Zastawki na `/mapa`**: objętości, hektary i dni zapasu to szacunki przesiewowe. Każde miejsce wymaga wizji lokalnej i pozwolenia wodnoprawnego.
- Nie podajemy wzrostu plonu ani kosztów działań.

## 9. Weryfikacja wyników

1. **Tabela źródeł w każdym raporcie**: zakres danych, czas pobrania, status. Każdą liczbę da się odtworzyć z podanego źródła.
2. **KBW vs IUNG SMSR.** Porównaj nasz KBW i ocenę suszy z mapą SMSR dla tej gminy i okresu (susza.iung.pulawy.pl).
3. **NDVI vs Copernicus Browser.** Otwórz tę samą scenę Sentinel-2 (data w raporcie) i porównaj wartość dla obrysu działki.
4. **Opad i ET0** można sprawdzić w NASA POWER Data Access Viewer (power.larc.nasa.gov) dla centroidu z raportu, a ostatnie dni w Open-Meteo.
5. **Działki testowe**: 12 działek z 12 regionów, sprawdzonych w ULDK, z kategorią gleby IUNG i trzema datami testowymi (dziś, susza 2018-07-20, mokry okres) wraz z oczekiwanym kierunkiem wyniku: `docs/review/10-jury-test-set.md`, wybór do finału w `deliverables/demo-final.md`. Sprawdzamy czas ≤ 30 s i zgodność kierunku wyniku z oczekiwanym. Działki leśne i zabudowane z tej listy służą do testu odmowy („nie jest użytkiem rolnym”).
6. **Przejrzyste reguły.** Każda przyczyna pokazuje liczbę, która ją uruchomiła, i próg. Każda rekomendacja wskazuje przyczynę.
7. **Poziom niepewności** z listą braków i czynników nieuwzględnionych.

---

## Skalowalność (pkt 5.5)

Zrobione w kodzie:
- **Pamięć podręczna wyniku** wg (działka, uprawa, data): w pamięci procesu, TTL 1 h, maks. 200 wyników. Równoczesne zapytania o to samo czekają na jedno obliczenie.
- **Cache serii NASA POWER** per komórka 0,1° (wiele działek dzieli jedną komórkę), także w katalogu tymczasowym na dysku (TTL 12 h).
- **Limit równoległości**: maks. 4 analizy naraz w procesie. Kolejne czekają do 4 s, potem odpowiedź 503 „Serwer liczy inne analizy”.
- **Limity zapytań**: 30 analiz/min i 60 zapytań `/api/dzialka`/min na adres IP.

Plan na produkcję (jeszcze nie w kodzie):
- Dłuższy cache dla dat z przeszłości (dane archiwalne się nie zmieniają) i wspólny magazyn (Redis lub dysk).
- **Warstwy krajowe liczone z góry per powiat**: rowy BDOT10k, kategorie IUNG, kandydaci na zastawki. Zapytanie czytałoby gotowy plik zamiast usług zdalnych.
- **Osobna kolejka dla odczytów Sentinel-2** (najcięższy krok), z własnym limitem równoległości.
- **CDN dla kafli** i statycznych zasobów. Własny serwer kafli zamiast OSM.
- **Własna instancja Open-Meteo** albo plan komercyjny.
- Serwer Node (VPS, Railway, Render), nie funkcje serverless: analiza trwa do 30 s, a cache jest w pamięci procesu.

Szacunek kosztów infrastruktury (**szacunki, do potwierdzenia cennikami**; przy ok. 5 analizach na rolnika miesięcznie):

| Skala | Infrastruktura | Koszt miesięczny (szacunek) |
|---|---|---|
| 1 000 rolników (~5 tys. analiz) | 1 VPS 2–4 vCPU, cache w pamięci/na dysku, plan Open-Meteo | ok. 150–600 zł |
| 10 000 rolników (~50 tys. analiz) | 2–3 instancje, Redis, kolejka, CDN, własny serwer kafli lub Open-Meteo | ok. 1 000–3 000 zł |

Koszt to obliczenia i transfer, nie licencje na dane.

## Bezpieczeństwo (pkt 5.6)

- Bez kont i bez danych osobowych. Numer działki to dana publiczna.
- Raport zapisuje się lokalnie (przeglądarka, PDF, JSON), nie na serwerze.
- Walidacja wejścia: format numeru działki, zakres współrzędnych (Polska), lista upraw, data od dziś do 10 lat wstecz.
- Limity zapytań (gotowe, `web/src/lib/analiza/server.ts`): 30 analiz/min i 60 zapytań o działkę/min na adres IP, maks. 4 analizy naraz, treść `POST` ≤ 4 kB. Cache wyników 1 h. Proxy kafli Google ogranicza współrzędne i odrzuca zapytania cross-site.
- Klucze API tylko po stronie serwera (`.env.local`, poza repozytorium). Proxy kafli nie ujawnia klucza.
- Nagłówki bezpieczeństwa w `web/next.config.ts`: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`.
- `npm audit --omit=dev` w `web/`: **0 podatności** (ponownie 22.11.2026, po scaleniu silnika i dodaniu `geotiff`). Wcześniejszy przegląd: `docs/review/02-security.md`. W historii gita nie ma kluczy API.
- Zapytania do źródeł tylko na stałe adresy z kodu (bez adresów od użytkownika).

## Dostępność (WCAG 2.2 AA)

Wdrożone w commicie `7ec9bab` (a11y + mobile) i w przejściu marki `643c96e`. „Zrobione” oznacza: zaimplementowane w kodzie. Nie było jeszcze testów czytnikiem ekranu, na urządzeniach mobilnych ani audytu narzędziem, więc nie deklarujemy pełnej zgodności z WCAG 2.2 AA.

| Wymaganie | Stan |
|---|---|
| Cała analiza bez myszy (numer działki zamiast kliknięcia) | zrobione |
| Widoczny fokus, linki „Przejdź do…” (`/analiza`, `/raport`, `/mapa`, `/karta`, `/metoda`) | zrobione |
| Mapa `/mapa` z klawiatury (strzałki, +/−, znaczniki miejsc osiągalne tabulatorem), tabela wszystkich miejsc jako opis tekstowy | zrobione |
| Panel miejsca jako okno dialogowe (`role="dialog"`), na telefonie zwijany panel dolny | zrobione |
| Przełączniki jako grupy radiowe (`role="radiogroup"`, strzałki) | zrobione |
| Postęp i wyniki ogłaszane przez `aria-live` (`/analiza`, `/mapa`, `/slides`) | zrobione |
| Wartości z tabelą danych (raport: tabele źródeł i serii; `/mapa`: tabele parametrów) | zrobione |
| Kolor nigdy jedynym nośnikiem informacji (ikona + tekst, poziom słownie) | zrobione |
| Kontrast: osobne odcienie „ink” do tekstu z par księgi znaku | zrobione (bez pomiaru narzędziem dla każdej pary) |
| Etykiety pól, błędy przy polach | zrobione |
| Cele dotyku ≥ 44 px | częściowo, do sprawdzenia na urządzeniach |
| Powiększenie 200% / zawijanie (reflow), widok mobilny, gest powiększania | zrobione |
| `prefers-reduced-motion`, `lang="pl"` | zrobione |
| Widoczna atrybucja podkładów i danych | zrobione |
| Test czytnikiem ekranu (NVDA, VoiceOver, TalkBack) | **otwarte** |
| Test na urządzeniach (Android, iOS) i w Firefox, Safari, Opera | **otwarte** |
| Automatyczny test axe / Lighthouse | **otwarte** |

## Zgłoszenie (pkt 4.1)

Pełna lista kontrolna ze stanem każdego punktu: **`deliverables/README.md`**.

| Element | Stan |
|---|---|
| Nazwa zespołu i tytuł: **<NAZWA ZESPOŁU>** / TRAKTOR: asystent wody dla jednej działki rolnej | nazwa do uzupełnienia przez zespół |
| Zwięzły opis rozwiązania | `deliverables/opis-rozwiazania.md` |
| Link do prywatnego repozytorium | `https://github.com/kaveOO/traktor-hacknation2026` (dostęp jury: `deliverables/dostep-jury.md`) |
| README (ten plik) | gotowe |
| Prezentacja PDF ≤ 10 slajdów | `deliverables/prezentacja.pdf` (10 stron), **do ponownego eksportu po poprawkach silnika** |
| Film ≤ 3 min (scenariusz: `deliverables/film-scenariusz.md`) | `<LINK DO FILMU>` (do uzupełnienia przez zespół) |
| Wygenerowane raporty (2–3 działki, PDF/JSON) | `deliverables/raporty/`: **do ponownego eksportu po poprawkach silnika** (silnik działa; teraz w katalogu jest tylko raport demo na danych przykładowych) |

## Struktura repozytorium

```
web/                      aplikacja Next.js 16
  src/app/                strony: /, /analiza, /raport, /mapa, /karta, /slides, /metoda; api/
  src/lib/analiza/        silnik v2: typy, uprawy, moduły źródeł
  src/lib/traktor/        przykład /mapa: dane i reguły zastawek
  src/components/         komponenty (brand, map, card, slides, analiza, raport)
scripts/geo/              skrypty offline (DuckDB) dla przykładu /mapa
scripts/lanes.ps1         równoległe gałęzie robocze
docs/                     zgłoszenie, licencje, przekazanie KOWR, przeglądy, notatki do slajdów
deliverables/             pakiet zgłoszeniowy: opis, PDF, zrzuty, raporty, scenariusz filmu, plan finału
research/                 badania, źródła
TRAKTOR_PLAN_v2.html      plan v2 i analiza luk wobec zadania
```

## Zespół

**<NAZWA ZESPOŁU>**. Bez imion i nazwisk (§ 6 ust. 2 regulaminu). Kontakt: przez platformę HackNation.
