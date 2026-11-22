# TRAKTOR

**Niech ziemia zatrzyma swoją wodę.**
Asystent jednej działki rolnej dla całej Polski. Podajesz numer działki (albo klikasz na mapie), uprawę i datę. TRAKTOR pobiera dane na żywo, ocenia sytuację wodną, podaje przyczyny i proponuje działania: retencję, agrotechnikę, a na końcu nawadnianie.

Zadanie KOWR „Zatrzymaj wodę, chroń plony”, HackNation 2026.

> **Stan prac (22.11.2026).** Moduły v2 powstają równolegle na osobnych gałęziach. Pozycje oznaczone **„w trakcie”** nie są jeszcze scalone z `main`. Ten plik opisuje stan docelowy zgłoszenia i mówi wprost, czego jeszcze brakuje.

| Element | Stan |
|---|---|
| `/mapa`: przykład zastawek pod Bydgoszczą (BDOT10k + NMT + ULDK) | gotowe |
| `/slides`: prezentacja | gotowe, aktualizacja pod v2 w trakcie |
| Kontrakt analizy (`web/src/lib/analiza/types.ts`, `crops.ts`) | gotowe |
| Silnik `/api/analiza`, `/api/dzialka` (ULDK, meteo, gleba, teren) | w trakcie |
| Moduł satelitarny (Sentinel-2) | w trakcie |
| Kreator `/analiza` (mapa całej Polski) | w trakcie |
| Raport `/raport` (druk, PDF, JSON) | w trakcie |

---

## 1. Instrukcja uruchomienia

Wymagania: Windows, macOS lub Linux; **Node.js 22 LTS lub nowszy**; dostęp do internetu (dane pobierane są na żywo). Konto nie jest potrzebne.

```powershell
cd web
npm install
npm run build
npm run start -- -p 3010
```

Otwórz **http://localhost:3010/analiza**.

Wersja online: **<URL po wdrożeniu>**

Klucze opcjonalne w pliku `web/.env.local` (poza repozytorium). Bez nich aplikacja działa w pełni.

```
ANTHROPIC_API_KEY=...
# GOOGLE_MAPS_API_KEY=...   # wyłączone w wersji dla jury
```

| Klucz | Do czego | W wersji dla jury |
|---|---|---|
| `ANTHROPIC_API_KEY` | przeredagowanie opisów na prosty język (bez zmiany liczb) | opcjonalny |
| `GOOGLE_MAPS_API_KEY` | dodatkowe podkłady Google na `/mapa` | **wyłączony** (usługa płatna, pkt 5.4) |

Tryb deweloperski: `npm run dev` (http://localhost:3000).

## 2. Podstawowe funkcjonalności

Przepływ `/analiza` (w trakcie):

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
- **Rekomendacje.** Katalog naturalnych metod retencji (NWRM): zastawka na rowie, oczko w obniżeniu, strefy buforowe, zadrzewienia, międzyplony, mulcz, uprawa uproszczona, materia organiczna. Każda ma uzasadnienie i, gdy trzeba, drogę prawną (pozwolenie wodnoprawne).
- **Niepewność.** Poziom niska / średnia / wysoka z listą braków („Brak danych satelitarnych: zachmurzenie”).

Inne strony:

| Ścieżka | Co |
|---|---|
| `/mapa` | Przykład: zastawki na rowach na zachód od Bydgoszczy (Białe Błota / Sicienko), dane BDOT10k + NMT 1 m + ULDK. Suwak wysokości piętrzenia, odmowy z powodem, tryby TRZYMAJ / OTWÓRZ |
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
 │ /raport      │ ─ GET ─────────► │   ├ meteo.ts     ──────────────► Open-Meteo ERA5 + prognoza, IMGW
 └──────────────┘                  │   ├ soil.ts      ──────────────► IUNG WCS, SoilGrids
 ┌──────────────┐                  │   ├ terrain.ts   ──────────────► NMT GUGiK, OSM/ISOK
 │ /mapa        │ ─ GET ─────────► │   └ satellite.ts ──────────────► Sentinel-2 (Earth Search, COG)
 └──────────────┘  /api/dzialka    │  równolegle, limit czasu    │
        ▲                          │  na źródło, wynik częściowy │
        │ real-data.json           └─────────────────────────────┘
 scripts/geo (offline, DuckDB) ──► BDOT10k GeoParquet, NMT, ULDK
```

- **Next.js 16** (App Router), TypeScript, Tailwind CSS 4. Jeden proces Node: strony + API.
- **`/api/analiza`**: `POST` z `AnalysisRequest` albo `GET ?parcelId=..&crop=..&date=..`. Zwraca `AnalysisResult` (kontrakt w `web/src/lib/analiza/types.ts`).
- **`/api/dzialka`**: `?id=..` albo `?lon=..&lat=..` → obrys działki z ULDK.
- **`web/src/lib/analiza`**: moduły `uldk`, `meteo`, `soil`, `terrain`, `satellite`, `analyze`. Wszystkie źródła pobierane równolegle, każde z limitem czasu (cel: 8 s). Gdy źródło nie odpowie, wynik jest częściowy, a brak trafia do sekcji niepewności. Cel czasu całej analizy: 10–20 s, maks. 30 s.
- **Reguły są deterministyczne.** Te same dane wejściowe dają ten sam wynik. Model językowy (opcjonalny) tylko przeredagowuje gotowy tekst.
- **`scripts/geo`**: skrypty offline (DuckDB) budujące przykład `/mapa` do `web/src/lib/traktor/real-data.json`.

## 4. Źródła i zakresy danych

| Kategoria (pkt 3.3) | Źródło | Co bierzemy | Zakres przestrzenny | Zakres czasowy |
|---|---|---|---|---|
| przestrzenne | ULDK (GUGiK) `GetParcelById`, `GetParcelByXY` | obrys, TERYT, gmina, powiat, powierzchnia | cała Polska, działka ewidencyjna | stan bieżący |
| meteorologiczne | Open-Meteo, archiwum ERA5 | dobowy opad, ET0 (FAO), Tmax | punkt w centroidzie działki, siatka ~9–25 km | 10 lat wstecz od daty analizy |
| meteorologiczne | Open-Meteo, prognoza (`past_days`) | to samo dla ostatnich ~5 dni (opóźnienie archiwum) i prognoza | jw. | ostatnie dni + 7–14 dni |
| meteorologiczne | IMGW-PIB, ostrzeżenia | aktywne ostrzeżenia (susza, upał, opady) | powiat | tylko gdy data = dziś |
| satelitarne | Sentinel-2 L2A, Earth Search (AWS, Element 84) | NDVI, NDMI średnio dla działki, maska chmur SCL | piksel 10–20 m, obrys działki | scena najbliższa dacie + te same tygodnie z 5 poprzednich sezonów |
| glebowe | IUNG-PIB, WCS podatności na suszę (`Susza__katgl_landuse2024`) | kategoria gleby I–IV | cała Polska, raster | warstwa 2024 |
| glebowe | ISRIC SoilGrids 2.0 | piasek, glina, węgiel organiczny → pojemność wodna (Saxton-Rawls) | 250 m | warstwa statyczna |
| hydrologiczne / rzeźba | NMT GUGiK 1 m (`GetHByPointList`) | wysokości w siatce nad działką → spadek, najniższy punkt | punkt, rozdzielczość 1 m | stan z lotniczego skanowania (różne lata) |
| hydrologiczne | OpenStreetMap (Overpass), ISOK (w trakcie) | rowy i cieki w pobliżu, strefy zagrożenia powodziowego | ok. 1 km wokół działki | stan bieżący |
| hydrologiczne / przestrzenne | BDOT10k (GUGiK), GeoParquet | rowy, rzeki, kanały, drogi, budynki, pokrycie terenu (tylko `/mapa`) | powiaty 0403, 0461 | pobrane 22.11.2026 |

Każdy raport zawiera tabelę źródeł: nazwa, użyty zakres (np. „ERA5 2016-11-22..2026-11-22”), status (pobrano / częściowo / brak), czas pobrania, licencja.

## 5. Dane pobierane na bieżąco i pobrane wcześniej

| Dane | Sposób | Data |
|---|---|---|
| Wszystko w `/analiza` i `/raport` (ULDK, Open-Meteo, IMGW, Sentinel-2, IUNG, SoilGrids, NMT, OSM/ISOK) | **na żywo, przy każdym zapytaniu** (z pamięcią podręczną serwera dla tej samej działki, uprawy i daty) | czas pobrania zapisany w raporcie |
| Przykład `/mapa`: warstwy BDOT10k, próbki NMT, działki ULDK, obraz ortofotomapy GUGiK | pobrane wcześniej skryptami `scripts/geo` | **22.11.2026** |
| Tabela upraw (Kc, okres krytyczny, progi KBW) | stała w kodzie, `web/src/lib/analiza/crops.ts` | wg FAO-56 i IUNG SMSR, progi „do kalibracji” |

Ocena, przyczyny, rekomendacje i nawadnianie **liczy aplikacja** z pobranych danych. Nie wyświetlamy gotowych rekomendacji.

Odtworzenie przykładu `/mapa`:

```powershell
cd scripts/geo
npm install
node extract.mjs   # BDOT10k → out/layers.json
node build.mjs     # NMT + ULDK → web/src/lib/traktor/real-data.json
```

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

Usługi zewnętrzne: wszystkie z tabeli w pkt 4. Bez kont i bez płatnych usług w podstawowych funkcjach.

**AI.**
- Kod powstał z pomocą asystenta AI do programowania (Claude). Projekt, reguły i weryfikacja: zespół.
- W aplikacji analiza jest **deterministyczna** (reguły i wzory, bez modelu). Opcjonalny model językowy (`ANTHROPIC_API_KEY`) tylko przeredagowuje gotowy wynik na prosty język. Strażnik liczb odrzuca tekst, w którym pojawia się liczba spoza wyniku. Bez klucza aplikacja pokazuje tekst z reguł.
- Nie używamy uczenia maszynowego do oceny. ML ma sens po pilotażu, gdy będą dane z pola.

## 7. Licencje i warunki

| Źródło / biblioteka | Licencja / warunki | Atrybucja |
|---|---|---|
| ULDK, NMT, BDOT10k, ortofotomapa (GUGiK) | dane otwarte, ustawa Prawo geodezyjne i kartograficzne (art. 40a), bez opłat | „Dane: Główny Urząd Geodezji i Kartografii” |
| Open-Meteo (ERA5, prognoza) | dane CC BY 4.0; **darmowe API tylko do użytku niekomercyjnego** | „Weather data by Open-Meteo.com” (+ Copernicus ERA5) |
| Copernicus ERA5 | licencja Copernicus | „Contains modified Copernicus Climate Change Service information” |
| IMGW-PIB | dane publiczne, warunki IMGW | „Źródło: IMGW-PIB” |
| Sentinel-2 (Earth Search) | licencja Copernicus Sentinel (wolny dostęp) | „Contains modified Copernicus Sentinel data [rok]” |
| IUNG-PIB (WCS) | dane publiczne IUNG, warunki serwisu | „Źródło: IUNG-PIB, System Monitoringu Suszy Rolniczej” |
| ISRIC SoilGrids | CC BY 4.0 | „SoilGrids, ISRIC – World Soil Information” |
| OpenStreetMap (dane, kafle) | ODbL; kafle wg Tile Usage Policy | „© współtwórcy OpenStreetMap” |
| ISOK (Wody Polskie) | dane publiczne | „Źródło: ISOK, PGW Wody Polskie” |
| Google Map Tiles | płatne, warunki Google | **wyłączone w wersji dla jury** |
| next, react, react-dom, tailwindcss, typescript, eslint | MIT / Apache-2.0 (typescript) | — |
| maplibre-gl | BSD-3-Clause | — |
| geotiff | MIT | — |
| @duckdb/node-api | MIT | — |
| Archivo, Inter | SIL Open Font License 1.1 | — |

Uwagi do wdrożenia produkcyjnego:
- **Open-Meteo**: darmowe API jest niekomercyjne. KOWR potrzebuje planu komercyjnego albo własnej instancji (kod Open-Meteo jest otwarty, AGPL).
- **Kafle OSM**: polityka użycia nie pozwala na duży ruch. W produkcji: własny serwer kafli lub podkłady GUGiK (WMTS).
- **Google**: płatne, w wersji dla jury wyłączone.

## 8. Znane ograniczenia

- **ERA5 to siatka ~9–25 km**, nie skala pola. Lokalna burza może nie być widoczna.
- **Sentinel-2 i chmury.** Przy zachmurzeniu nie ma sceny blisko daty. Wtedy status „brak danych” i wyższa niepewność.
- **SoilGrids ma 250 m.** Działka może leżeć na innej glebie niż piksel.
- **Kategorie IUNG są zgrubne** (4 klasy).
- **NMT 1 m może nie pokazać małych rowów.** Wtedy „rów niewidoczny w NMT” i wizja lokalna.
- **Brak danych o drenowaniu podziemnym.** Sączki nie są w żadnym otwartym zbiorze.
- **Faza uprawy przybliżona miesiącem**, bez daty siewu.
- **Progi KBW i NDVI są „do kalibracji”.** To przybliżenia progów IUNG SMSR.
- **Kc uproszczone** do wartości miesięcznych.
- **Dostępność usług.** Overpass i ISOK bywają wolne lub niedostępne. Wtedy wynik częściowy.
- **Zastawki na `/mapa`**: objętości, hektary i dni zapasu to szacunki przesiewowe. Każde miejsce wymaga wizji lokalnej i pozwolenia wodnoprawnego.
- Nie podajemy wzrostu plonu ani kosztów działań.

## 9. Weryfikacja wyników

1. **Tabela źródeł w każdym raporcie**: zakres danych, czas pobrania, status. Każdą liczbę da się odtworzyć z podanego źródła.
2. **KBW vs IUNG SMSR.** Porównaj nasz KBW i ocenę suszy z mapą SMSR dla tej gminy i okresu (susza.iung.pulawy.pl).
3. **NDVI vs Copernicus Browser.** Otwórz tę samą scenę Sentinel-2 (data w raporcie) i porównaj wartość dla obrysu działki.
4. **Opad i ET0** można sprawdzić w Open-Meteo Historical Weather dla centroidu z raportu.
5. **Działki testowe** z różnych województw (lista w `docs/ZGLOSZENIE.md`), dla dzisiejszej daty i daty sprzed 5 lat. Sprawdzamy czas ≤ 30 s i spójność wyniku.
6. **Przejrzyste reguły.** Każda przyczyna pokazuje liczbę, która ją uruchomiła, i próg. Każda rekomendacja wskazuje przyczynę.
7. **Poziom niepewności** z listą braków i czynników nieuwzględnionych.

---

## Skalowalność (pkt 5.5)

- **Pamięć podręczna** wg (działka, uprawa, data). Dane archiwalne się nie zmieniają, więc wynik dla daty z przeszłości można trzymać długo.
- **Cache per źródło**: meteo per komórka siatki ERA5 (wiele działek dzieli jedną komórkę), gleba i NMT per działka.
- **Warstwy krajowe liczone z góry per powiat**: rowy BDOT10k, kategorie IUNG, kandydaci na zastawki. Zapytanie czyta gotowy plik zamiast zdalnego Parquetu.
- **Kolejka dla odczytów Sentinel-2** (najcięższy krok), z limitem równoległości.
- **Limity zapytań** do API i do źródeł zewnętrznych, żeby nie przeciążać usług publicznych.
- **CDN dla kafli** i statycznych zasobów. Własny serwer kafli zamiast OSM.
- **Własna instancja Open-Meteo** albo plan komercyjny.
- Serwer Node (VPS, Railway, Render), nie funkcje serverless: analiza trwa do 30 s.

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
- Limit zapytań na adres IP (w trakcie).
- Klucze API tylko po stronie serwera (`.env.local`, poza repozytorium). Proxy kafli nie ujawnia klucza.
- Nagłówki bezpieczeństwa: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors` (w trakcie).
- Zapytania do źródeł tylko na stałe adresy z kodu (bez adresów od użytkownika).

## Dostępność (WCAG 2.2 AA)

| Wymaganie | Stan |
|---|---|
| Cała analiza bez myszy (numer działki zamiast kliknięcia) | w trakcie |
| Widoczny fokus, link „Przejdź do treści”, logiczna kolejność tabulacji | w trakcie |
| Mapa z klawiatury (strzałki, +/−) i opis tekstowy | w trakcie |
| Postęp i wyniki ogłaszane przez `aria-live` | w trakcie |
| Wykresy z tabelą danych obok | w trakcie |
| Kolor nigdy jedynym nośnikiem informacji (ikona + tekst) | w trakcie |
| Kontrast wg par z księgi znaku | w trakcie |
| Etykiety pól, błędy przy polach, cele dotyku ≥ 44 px | w trakcie |
| Powiększenie 200%, widok mobilny | w trakcie |
| `prefers-reduced-motion`, `lang="pl"` | w trakcie |
| Test axe / Lighthouse; Chrome, Firefox, Edge, Safari, Opera | w trakcie |

## Zgłoszenie (pkt 4.1)

| Element | Stan |
|---|---|
| Nazwa zespołu i tytuł: **<nazwa zespołu>** / TRAKTOR | do uzupełnienia |
| Zwięzły opis rozwiązania | `docs/ZGLOSZENIE.md` |
| Link do prywatnego repozytorium | `<link do repozytorium>` |
| README (ten plik) | gotowe |
| Prezentacja PDF ≤ 10 slajdów (`/slides` → druk przeglądarki → Zapisz jako PDF) | `<plik PDF>` |
| Film ≤ 3 min (scenariusz w `docs/ZGLOSZENIE.md`) | `<link do filmu>` |
| Wygenerowane raporty (2–3 działki, PDF/JSON) | `<pliki raportów>` |

## Struktura repozytorium

```
web/                      aplikacja Next.js 16
  src/app/                strony: /, /analiza, /raport, /mapa, /karta, /slides, /metoda; api/
  src/lib/analiza/        silnik v2: typy, uprawy, moduły źródeł
  src/lib/traktor/        przykład /mapa: dane i reguły zastawek
  src/components/         komponenty (brand, map, card, slides, analiza, raport)
scripts/geo/              skrypty offline (DuckDB) dla przykładu /mapa
scripts/lanes.ps1         równoległe gałęzie robocze
docs/                     zgłoszenie, notatki do slajdów
research/                 badania, źródła
TRAKTOR_PLAN_v2.html      plan v2 i analiza luk wobec zadania
```

## Zespół

**<nazwa zespołu>**. Bez imion i nazwisk (§ 6 ust. 2 regulaminu). Kontakt: przez platformę HackNation.
