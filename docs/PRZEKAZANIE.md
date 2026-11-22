# TRAKTOR: pakiet przekazania dla KOWR (Regulamin § 5)

Dokument na wypadek wygranej. Opisuje, co przekazujemy, jak, w jakim terminie i co KOWR musi przejąć technicznie oraz licencyjnie.

## 1. Zobowiązania z Regulaminu (skrót)

- **Nieodpłatne przeniesienie autorskich praw majątkowych** do rozwiązania na KOWR, w tym kodu źródłowego i dokumentacji (§ 5).
- **Każdy członek zespołu podpisuje** dokumenty przeniesienia **w ciągu 7 dni** (od dnia wskazanego w Regulaminie / wezwania organizatora). Brak podpisu choćby jednej osoby = **utrata nagrody przez cały zespół**.
- Przekazanie kodu i dokumentacji: **prywatne repozytorium** albo **nośnik danych**.
- **Do przekazania repozytorium pozostaje prywatne.** Nie udostępniamy kodu nikomu poza jury, organizatorem i KOWR.
- Nazwa zespołu bez imion i nazwisk (§ 6).

## 2. Harmonogram (D = dzień ogłoszenia wyników / wezwania)

| Dzień | Działanie | Kto |
|---|---|---|
| D | Potwierdzenie przyjęcia nagrody na platformie. Ustalenie z KOWR formy przekazania (repo czy nośnik) i adresatów | lider |
| D+1 | Zamrożenie wersji: tag `kowr-handover-v1`, `git bundle`, sumy kontrolne (pkt 4) | lider |
| D+1 – D+5 | Każdy członek wypełnia i podpisuje Załączniki 1–4 (pkt 3). Skany do lidera, oryginały pocztą, jeśli Regulamin wymaga | wszyscy |
| D+5 | Lider sprawdza komplet podpisów (tabela pkt 3) | lider |
| **≤ D+7** | Wysłanie dokumentów i przekazanie kodu. Potwierdzenie odbioru od KOWR na piśmie (e-mail) | lider |
| po odbiorze | Zgodnie z ustaleniami z KOWR: usunięcie kopii roboczych lub przekazanie repozytorium na własność KOWR | lider |

## 3. Dokumenty: lista kontrolna

Tytuły i treść załączników według Regulaminu wydarzenia (wpisz dokładne nazwy z Regulaminu, nie zgaduj):

| Załącznik | Tytuł (z Regulaminu) | Członek 1 | Członek 2 | Członek 3 | Członek 4 | Członek 5 |
|---|---|---|---|---|---|---|
| Załącznik nr 1 | `<tytuł>` | ☐ | ☐ | ☐ | ☐ | ☐ |
| Załącznik nr 2 | `<tytuł>` | ☐ | ☐ | ☐ | ☐ | ☐ |
| Załącznik nr 3 | `<tytuł>` | ☐ | ☐ | ☐ | ☐ | ☐ |
| Załącznik nr 4 | `<tytuł>` | ☐ | ☐ | ☐ | ☐ | ☐ |

Do dokumentów dołączamy (jako opis przedmiotu przeniesienia):
- [ ] identyfikator wersji: tag `kowr-handover-v1`, SHA commita, suma SHA-256 pliku `traktor.bundle`,
- [ ] `docs/LICENCJE.md`: rejestr źródeł danych, usług i narzędzi AI (§ 2 ust. 10),
- [ ] `docs/THIRD_PARTY_NOTICES.md`: komponenty na licencjach zewnętrznych, które **nie** są przedmiotem przeniesienia,
- [ ] ten dokument.

Członków zespołu w tabeli oznaczamy numerami. Dane osobowe są tylko w podpisanych dokumentach, nie w repozytorium.

## 4. Co przekazujemy

| Element | Ścieżka | Uwagi |
|---|---|---|
| Aplikacja (kod źródłowy) | `web/` | Next.js 16, TypeScript. Bez `node_modules`, `.next` i plików `.env*` |
| Silnik analizy | `web/src/lib/analiza/**`, `web/src/app/api/analiza`, `web/src/app/api/dzialka` | deterministyczne reguły, kontrakt `types.ts` |
| Przykład zastawek | `web/src/lib/traktor/**`, `web/src/app/mapa`, `web/src/app/karta` | dane pochodne w `real-data.json` |
| Skrypty danych | `scripts/geo/` | DuckDB, BDOT10k, NMT, ULDK → `real-data.json` |
| Dokumentacja | `README.md`, `docs/**`, `deliverables/**`, `research/**` | README spełnia pkt 4.2 |
| Prezentacja, raporty, zrzuty | `deliverables/` | PDF, PNG. Film jako link lub plik na nośniku |
| Konfiguracja przykładowa | `web/.env.example` | tylko nazwy zmiennych, bez wartości |
| Historia zmian | całe repo git | pokazuje, że kod powstał podczas wydarzenia (§ 2 ust. 10) |

**Nie przekazujemy:** kluczy API zespołu (Google, Anthropic), kont w usługach zewnętrznych, pliku `web/.env.local`, lokalnych cache (`scripts/geo/out/`, `*.duckdb`).

### Wariant A: repozytorium GitHub

1. Opcja „transfer”: repo → **Settings** → **General** → *Danger Zone* → **Transfer ownership** → konto lub organizacja KOWR. Repo zostaje prywatne, historia i issues przechodzą.
2. Opcja „dostęp”: dodaj konta KOWR jako współpracowników (Settings → Collaborators), a KOWR robi własny fork prywatny lub import (GitHub Importer, GitLab, Azure DevOps).
3. Po potwierdzeniu odbioru: usuń zespół z dostępu albo archiwizuj kopię zgodnie z umową.

### Wariant B: nośnik danych (pendrive / dysk, ewentualnie zaszyfrowany)

```powershell
git tag -a kowr-handover-v1 -m "Przekazanie KOWR"
git bundle create traktor.bundle --all          # pełna historia, wszystkie gałęzie i tagi
git bundle verify traktor.bundle
Get-FileHash traktor.bundle -Algorithm SHA256   # wpisz sumę do protokołu
git archive --format=zip -o traktor-src.zip kowr-handover-v1   # migawka bez historii (do szybkiego wglądu)
```

Na nośnik: `traktor.bundle`, `traktor-src.zip`, `deliverables/` (PDF, zrzuty, raporty, film), `SHA256SUMS.txt`, skany podpisanych załączników (opcjonalnie, jeśli KOWR prosi).
Odtworzenie u KOWR: `git clone traktor.bundle traktor` → `cd traktor/web` → `npm ci` → `npm run build`.

## 5. Notatki techniczne dla zespołu KOWR

### Uruchomienie

```powershell
# Node.js 22 LTS lub nowszy (minimum w package.json: >= 20.9)
cd web
npm ci
npm run build
npm run start -- -p 3010      # http://localhost:3010/analiza
```

Aplikacja działa **bez żadnych kluczy**. Serwer Node, nie funkcje serverless: analiza trwa do ok. 25 s, a cache jest w pamięci procesu.

### Zmienne środowiskowe (`web/.env.local`, poza repozytorium)

| Zmienna | Do czego | Domyślnie |
|---|---|---|
| `ANTHROPIC_API_KEY` | opcjonalne przeredagowanie opisu na karcie zastawki (`/api/traktor/explain`), ze strażnikiem liczb | brak → tekst z szablonu |
| `GOOGLE_MAPS_API_KEY` | opcjonalne podkłady Google na `/mapa` | brak → trasy `/api/tiles/google/*` zwracają 404, podkład ukryty |

### Skąd są dane

- **Na żywo przy każdym zapytaniu** (`web/src/lib/analiza/*`):
  - ULDK (działka),
  - NASA POWER (10 lat, dobowo),
  - Open-Meteo forecast (ostatnie 92 dni + 10 dni prognozy),
  - IMGW-PIB (ostrzeżenia),
  - Sentinel-2 L2A (Microsoft Planetary Computer, zapasowo Earth Search),
  - IUNG WCS, SoilGrids, NMT GUGiK,
  - Overpass (cieki, opcjonalnie).

  Każde źródło ma limit czasu. Brak źródła = wynik częściowy i wyższa niepewność.
- **Pobrane wcześniej (22.11.2026)**: tylko przykład `/mapa`, czyli `web/src/lib/traktor/real-data.json` (BDOT10k, NMT, ULDK) i `web/public/maps/orto-bydgoszcz-west.jpg` (ortofotomapa GUGiK). Odtworzenie: `cd scripts/geo; npm ci; node extract.mjs; node build.mjs` (5–15 min, sieć do `opendata.geoportal.gov.pl`, `services.gugik.gov.pl`, `uldk.gugik.gov.pl`, `extensions.duckdb.org`).
- **Stałe w kodzie**:
  - uprawy (Kc FAO-56, okresy krytyczne) w `crops.ts`,
  - progi suszy SMSR (rozporządzenie MRiRW z 11.04.2019) w `smsr.ts`.

  Progi są oznaczone „do kalibracji”.

### Utrzymanie

- **Cache**: w pamięci, klucz (działka, uprawa, data), TTL 1 h, maks. 200 wyników. Seria NASA POWER także w katalogu tymczasowym systemu. W produkcji: Redis lub dysk, dłuższy TTL dla dat z przeszłości.
- **Limity**: 30 analiz/min na IP (w pamięci procesu). Za load balancerem: wspólny limit (Redis) i poprawny `X-Forwarded-For`.
- **Monitorowanie**: `/api/health`. W raporcie zapisany jest status każdego źródła, więc warto logować odsetek wyników częściowych per źródło.
- **Zmiany API dostawców**: każde źródło ma osobny moduł (`uldk.ts`, `meteo.ts`, `power.ts`, `soil.ts`, `terrain.ts`, `satellite.ts`). Awaria jednego nie zatrzymuje analizy.
- **Kalibracja**: progi KBW i NDVI do weryfikacji z IUNG na danych z pilotażu.
- **Wersja metody**: pole `methodVersion` w wyniku. Podnosić przy każdej zmianie reguł.

## 6. Ograniczenia licencyjne, które KOWR przejmuje

Szczegóły: `docs/LICENCJE.md`. Decyzje do podjęcia przed wdrożeniem produkcyjnym:

| Usługa | Ograniczenie | Rekomendacja dla KOWR |
|---|---|---|
| Open-Meteo | darmowe API tylko niekomercyjnie, limity dzienne | plan komercyjny albo własna instancja (AGPL, osobna usługa) albo IMGW-PIB |
| Kafle OpenStreetMap | Tile Usage Policy: bez dużego ruchu | własny serwer kafli albo tylko podkłady GUGiK (WMTS) |
| Nominatim | ≤ 1 zapytanie/s, bez autouzupełniania | geokoder GUGiK (UUG) albo własny Nominatim |
| Overpass | publiczne instancje, fair use, częste awarie | wyciąg offline albo BDOT10k przeliczony z góry per powiat |
| EOX s2cloudless | rocznik 2016 CC BY. Hostowana usługa niekomercyjna | usunąć warstwę albo umowa z EOX |
| Microsoft Planetary Computer / Earth Search | bezpłatne, bez SLA | przy dużym ruchu: Copernicus Data Space lub własny magazyn scen |
| IUNG WCS | brak jawnej licencji | pisemne warunki od IUNG-PIB |
| Google Map Tiles | płatne, umowy i klucza nie da się przenieść | własna umowa Google Maps Platform albo rezygnacja (GUGiK wystarcza) |
| Anthropic API | płatne, klucz zespołu nieprzenoszalny | własny klucz lub inny model, albo pozostawić wyłączone |

Komponenty open source (`docs/THIRD_PARTY_NOTICES.md`) są permisywne, więc KOWR może ich używać komercyjnie. Przy redystrybucji trzeba zachować teksty licencji.
