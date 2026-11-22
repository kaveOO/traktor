# TRAKTOR: pakiet zgłoszeniowy HackNation 2026 / KOWR

| Pole | Wartość |
|---|---|
| Nazwa zespołu | **<NAZWA ZESPOŁU>** (bez imion i nazwisk, § 6) |
| Tytuł rozwiązania | **TRAKTOR: asystent wody dla jednej działki rolnej** |
| Zadanie | KOWR „Zatrzymaj wodę, chroń plony” |
| Repozytorium (prywatne) | `https://github.com/kaveOO/traktor-hacknation2026` |
| Wersja zgłoszona (commit SHA) | `<SHA>` (wpisać wynik `git log -1 --format=%H` po ostatnim pushu) |
| Wersja działająca | <LINK DO WERSJI DZIAŁAJĄCEJ> |
| Film (≤ 3:00) | <LINK DO FILMU> |
| Data przygotowania pakietu | 22.11.2026 |

## DO UZUPEŁNIENIA PRZEZ ZESPÓŁ

Te pola są celowo zostawione jako znaczniki `<…>`. Nie wysyłamy zgłoszenia, dopóki któryś z nich zostaje w plikach, poza tabelą znaczników w tym pliku (sprawdzenie: `Select-String -Path README.md,docs\*.md,deliverables\*.md -Pattern '<NAZWA ZESPOŁU>|<LINK DO|<SHA>|<ORGANIZACJA>'`; `<ORGANIZACJA>` może zostać, jeśli nie używamy wariantu B).

| Znacznik | Gdzie wpisać | Skąd wziąć |
|---|---|---|
| `<NAZWA ZESPOŁU>` | `README.md` (tabela „Zgłoszenie” i sekcja „Zespół”), `docs/ZGLOSZENIE.md`, `deliverables/opis-rozwiazania.md`, ten plik (tabela wyżej) | decyzja zespołu, bez imion i nazwisk (§ 6) |
| `<LINK DO FILMU>` | `README.md` (tabela „Zgłoszenie”), ten plik, `film-scenariusz.md` (koniec) | po nagraniu wg `film-scenariusz.md` (YouTube niepubliczny / Drive) |
| `<LINK DO WERSJI DZIAŁAJĄCEJ>` | `README.md` §1, ten plik, `demo-final.md` (T−60) | po wdrożeniu na serwer Node; jeśli nie wdrażamy: zamienić na „uruchomienie lokalne, README pkt 1” |
| `<SHA>` | ten plik (tabela wyżej) | `git log -1 --format=%H` po ostatnim pushu |
| Dostęp jury (loginy / e-maile jurorów) | nie do repo: GitHub → Settings → Collaborators, wg `dostep-jury.md` §1–3 | instrukcja platformy HackNation |
| `<ORGANIZACJA>` | `dostep-jury.md` §2 (tylko wariant B) i link do repo w tym pliku oraz `README.md` | nazwa organizacji GitHub, bez imion i nazwisk |
| `<TOKEN>` | **nigdzie w repo**: tylko kanałem platformy (`dostep-jury.md` §3, wariant C) | fine-grained token tylko do odczytu |

Szablony, których **nie** wypełniamy w zgłoszeniu: `<tytuł>` załączników w `docs/PRZEKAZANIE.md` §3 (dopiero po wygranej, z Regulaminu), `<woj>/<uprawa>/<data>/<ID>` w poleceniach eksportu, `<imię>` w poleceniu sprawdzającym w `dostep-jury.md` §5, `<pakiet>` w `docs/THIRD_PARTY_NOTICES.md`.

Do ponownego eksportu po poprawkach silnika (robi lider):
- `deliverables/prezentacja.pdf` (slajdy zmieniły się po eksporcie z 09:30; sprawdzić ≤ 10 stron),
- raporty prawdziwych działek w `deliverables/raporty/` (PDF + JSON, 2–3 działki z `demo-final.md`),
- zrzut `/analiza` z mapą i wynikiem.

## Lista kontrolna pkt 4.1

Legenda: ✅ gotowe · ⏳ zostało do zrobienia (z opisem)

| # | Element (pkt 4.1) | Stan | Plik / co zostało |
|---|---|---|---|
| 1 | Nazwa zespołu i tytuł rozwiązania | ⏳ | Tytuł gotowy. Wpisać nazwę zespołu tutaj, w `docs/ZGLOSZENIE.md`, `README.md` (sekcja Zespół) i na platformie |
| 2 | Zwięzły opis: problem, funkcjonalności, dane, korzyści | ✅ | [`opis-rozwiazania.md`](opis-rozwiazania.md) (do wklejenia na platformę) |
| 3 | Link do prywatnego repozytorium + dostęp jury | ⏳ | `git push -u origin main`, potem dostęp wg [`dostep-jury.md`](dostep-jury.md) i lista kontrolna prywatności (wylogowany → 404) |
| 4 | README (lub równoważny dokument) z 9 punktami pkt 4.2 | ✅ | [`../README.md`](../README.md). Opisuje stan na `main` (silnik scalony w `8ef08a1`) i poprawki silnika w toku |
| 5 | Prezentacja PDF ≤ 10 slajdów | ✅ / ⏳ | [`prezentacja.pdf`](prezentacja.pdf): **10 stron**, eksport z `/slides` 22.11.2026 (09:30). ⏳ **Do ponownego eksportu po poprawkach silnika** (slajdy w kodzie zmienione po eksporcie) |
| 6 | Działający prototyp: link do wersji online **lub** instrukcja uruchomienia w README (obowiązkowe) | ✅ / ⏳ | Instrukcja w README ✅. Silnik `/api/analiza` i `/api/dzialka` jest na `main`, `/analiza` liczy wynik na żywo ✅. ⏳ Poprawki reguł silnika (P0 z `docs/review2/01-engine-logic.md`: limit dawki nawadniania, miesiąc zbioru, SMSR 2018). ⏳ Wdrożenie i link online (opcjonalne, bo jest instrukcja) |
| 7 | Film ≤ 3 min | ⏳ | Scenariusz: [`film-scenariusz.md`](film-scenariusz.md). Nagrać po poprawkach silnika, wgrać (YouTube niepubliczny / Drive), wpisać link |
| 8 | Raporty wygenerowane przez prototyp | ⏳ | Jest tylko [`raporty/raport-demo-DANE-PRZYKLADOWE.pdf`](raporty/raport-demo-DANE-PRZYKLADOWE.pdf) (`/raport?demo=1`, **dane przykładowe, nie wynik analizy**). ⏳ **Do ponownego eksportu po poprawkach silnika**: 2–3 działki z `demo-final.md` (PDF + JSON), dziś i 2018-07-20 lub −5 lat |
| 9 | Zrzuty ekranu / grafiki (opcjonalne) | ✅ / ⏳ | [`zrzuty/mapa-1440x900.png`](zrzuty/mapa-1440x900.png), [`zrzuty/raport-demo-1440x900.png`](zrzuty/raport-demo-1440x900.png), [`zrzuty/analiza-kreator-bez-mapy-1440x900.png`](zrzuty/analiza-kreator-bez-mapy-1440x900.png). ⏳ `/analiza` z mapą i wynikiem: przeglądarka bez trybu headless (WebGL), po poprawkach silnika |

## Pozostałe wymagania (README pkt 4.2, 5.4–5.6, Regulamin)

| Wymaganie | Stan | Gdzie |
|---|---|---|
| 9 punktów README (uruchomienie, funkcje, architektura, źródła i zakresy, dane na żywo vs pobrane z datami, biblioteki/usługi/AI, licencje, ograniczenia, weryfikacja) | ✅ | `README.md` §1–9 |
| Zakres użycia AI zadeklarowany (5.1) | ✅ | `README.md` §6 „AI w projekcie”, `docs/LICENCJE.md` §5 |
| Skalowalność: limity, cache, aktualizacja danych, koszty (5.5); bezpieczeństwo i brak danych osobowych (5.6); dostępność WCAG | ✅ opis / ⏳ część wdrożeń | `README.md` (sekcje na końcu) |
| Usługi płatne oznaczone, z kosztem i alternatywą (5.4) | ✅ | `docs/LICENCJE.md` §3, `README.md` §6–7 |
| Rejestr bibliotek, danych i narzędzi AI z licencjami (§ 2 ust. 10) | ✅ | `docs/LICENCJE.md`, `docs/THIRD_PARTY_NOTICES.md` |
| Repo prywatne do końca wydarzenia (4.3, § 5) | ⏳ | sprawdzić wg `dostep-jury.md` §5 |
| Brak imion i nazwisk w repo (§ 6) | ✅ autorzy commitów: `traktor-dev` | ponowić `git log --format="%an" | sort -u` przed wysłaniem |
| Plan przekazania KOWR po wygranej (§ 5) | ✅ | `docs/PRZEKAZANIE.md` |
| Plan finału (2–3 min + demo + Q&A, plan awaryjny) | ✅ | [`demo-final.md`](demo-final.md) |

## Zawartość katalogu

```
deliverables/
  README.md                       ten plik: indeks i lista kontrolna
  opis-rozwiazania.md             zwięzły opis do platformy (≤ 1 strona)
  dostep-jury.md                  dostęp jury do prywatnego repo + kontrola prywatności
  film-scenariusz.md              scenariusz filmu 3:00, lista ujęć, OBS
  demo-final.md                   plan finału, działki testowe, plan awaryjny, Q&A
  prezentacja.pdf                 slajdy /slides (10 stron)
  raporty/raport-demo-DANE-PRZYKLADOWE.pdf   układ raportu na danych przykładowych
  zrzuty/*.png                    zrzuty 1440×900
```

Filmu nie dodajemy do gita (link). Pliki `*.mp4` trzymamy poza repozytorium.

## Jak powstały pliki PDF i zrzuty (22.11.2026)

- Build produkcyjny (`npm run build`, Next.js 16.4.6) na kopii roboczej `web/` z `main` @ `e7e717d` **plus niezatwierdzone zmiany mapy** w katalogu tymczasowym. Build przeszedł (16 tras). Uruchomienie `next start -p 3015` **bez kluczy** (Google i LLM wyłączone).
- Eksport: Microsoft Edge headless, `--print-to-pdf --no-pdf-header-footer` (slajdy, raport demo) i `--screenshot --window-size=1440,900` (zrzuty).
- Headless bez GPU nie renderuje mapy WebGL (MapLibre), dlatego zrzut `/analiza` pokazuje tylko panele. `/mapa` (SVG) renderuje się w pełni.

Ponowny eksport po poprawkach silnika (PowerShell; build wymaga internetu, `next/font`):

```powershell
cd web; npm run build; npm run start -- -p 3015
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
& $edge --headless --disable-gpu --no-pdf-header-footer --virtual-time-budget=10000 --print-to-pdf="$PWD\..\deliverables\prezentacja.pdf" http://localhost:3015/slides
& $edge --headless --disable-gpu --no-pdf-header-footer --virtual-time-budget=40000 --print-to-pdf="$PWD\..\deliverables\raporty\raport-<woj>-<uprawa>-<data>.pdf" "http://localhost:3015/raport?parcelId=<ID>&crop=<uprawa>&date=<RRRR-MM-DD>"
```

Raport prawdziwej działki najlepiej zapisać z przeglądarki („Drukuj / zapisz PDF” i „Pobierz JSON”), bo analiza trwa do ~25 s.

## Uwagi do slajdów

Stary `prezentacja.pdf` (eksport 09:30) ma sformułowania, które w kodzie slajdów już poprawiono (slajdy mówią teraz o NASA POWER). Nowy eksport po poprawkach silnika powinien to usunąć. Przy eksporcie sprawdzić:
1. Slajdy 4 i 5: 10 lat pogody z **NASA POWER**, Open-Meteo dla ostatnich dni i prognozy (w starym PDF: „Open-Meteo ERA5, 10 lat”).
2. Slajd 9: „Publiczne, bez opłat”, nie „bez licencji” (dane mają licencje: CC BY 4.0, warunki GUGiK, Copernicus).
3. Slajd 5: ISOK tylko jako link (silnik nie sprawdza stref automatycznie, na `/mapa` jest przybliżenie 80 m).

## Ostatnie kroki (człowiek)

1. Uzupełnić znaczniki z sekcji „DO UZUPEŁNIENIA PRZEZ ZESPÓŁ” (nazwa zespołu w 5 miejscach).
2. Po poprawkach silnika: `cd web; npm run build` → ponowny eksport `prezentacja.pdf` (≤ 10 stron) i raportów 2–3 działek z `demo-final.md` → `deliverables/raporty/`.
3. Wdrożyć (serwer Node: Railway / Render / VPS, bez kluczy) → wpisać `<LINK DO WERSJI DZIAŁAJĄCEJ>`; albo zostawić instrukcję lokalną i usunąć znacznik.
4. Nagrać film wg `film-scenariusz.md` → wgrać → wpisać `<LINK DO FILMU>`.
5. `git push -u origin main` → wpisać `<SHA>` → dostęp jury wg `dostep-jury.md` → test prywatności (wylogowany = 404).
6. Złożyć zgłoszenie na platformie (lider zespołu): nazwa, tytuł, opis, link do repo, README, PDF, link online, film, raporty, zrzuty.
