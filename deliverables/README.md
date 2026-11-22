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

## Lista kontrolna pkt 4.1

Legenda: ✅ gotowe · ⏳ zostało do zrobienia (z opisem)

| # | Element (pkt 4.1) | Stan | Plik / co zostało |
|---|---|---|---|
| 1 | Nazwa zespołu i tytuł rozwiązania | ⏳ | Tytuł gotowy. Wpisać nazwę zespołu tutaj, w `docs/ZGLOSZENIE.md`, `README.md` (sekcja Zespół) i na platformie |
| 2 | Zwięzły opis: problem, funkcjonalności, dane, korzyści | ✅ | [`opis-rozwiazania.md`](opis-rozwiazania.md) (do wklejenia na platformę) |
| 3 | Link do prywatnego repozytorium + dostęp jury | ⏳ | `git push -u origin main`, potem dostęp wg [`dostep-jury.md`](dostep-jury.md) i lista kontrolna prywatności (wylogowany → 404) |
| 4 | README (lub równoważny dokument) z 9 punktami pkt 4.2 | ✅ | [`../README.md`](../README.md). Stan silnika oznaczony „w trakcie”, zaktualizować po scaleniu |
| 5 | Prezentacja PDF ≤ 10 slajdów | ✅ / ⏳ | [`prezentacja.pdf`](prezentacja.pdf): **10 stron**, eksport z `/slides` 22.11.2026. ⏳ Wyeksportować ponownie po aktualizacji slajdów (uwagi niżej) |
| 6 | Działający prototyp: link do wersji online **lub** instrukcja uruchomienia w README (obowiązkowe) | ⏳ | Instrukcja w README ✅. ⏳ Silnik `/api/analiza` i `/api/dzialka` **nie jest jeszcze na `main`** (gałąź `v2/engine`, praca niezatwierdzona), więc `/analiza` na `main` nie liczy jeszcze wyniku. ⏳ Wdrożenie i link online |
| 7 | Film ≤ 3 min | ⏳ | Scenariusz: [`film-scenariusz.md`](film-scenariusz.md). Nagrać po scaleniu silnika, wgrać (YouTube niepubliczny / Drive), wpisać link |
| 8 | Raporty wygenerowane przez prototyp | ⏳ | Jest tylko [`raporty/raport-demo-DANE-PRZYKLADOWE.pdf`](raporty/raport-demo-DANE-PRZYKLADOWE.pdf) (`/raport?demo=1`, **dane przykładowe, nie wynik analizy**). ⏳ Do wygenerowania po scaleniu silnika: 2–3 działki z różnych województw (PDF + JSON), dziś i −5 lat |
| 9 | Zrzuty ekranu / grafiki (opcjonalne) | ✅ / ⏳ | [`zrzuty/mapa-1440x900.png`](zrzuty/mapa-1440x900.png), [`zrzuty/raport-demo-1440x900.png`](zrzuty/raport-demo-1440x900.png), [`zrzuty/analiza-kreator-bez-mapy-1440x900.png`](zrzuty/analiza-kreator-bez-mapy-1440x900.png). ⏳ `/analiza` z mapą i wynikiem: przeglądarka bez trybu headless (WebGL), najlepiej po scaleniu silnika |

## Pozostałe wymagania (README pkt 4.2, 5.4–5.6, Regulamin)

| Wymaganie | Stan | Gdzie |
|---|---|---|
| 9 punktów README (uruchomienie, funkcje, architektura, źródła i zakresy, dane na żywo vs pobrane z datami, biblioteki/usługi/AI, licencje, ograniczenia, weryfikacja) | ✅ | `README.md` §1–9 |
| Skalowalność (5.5), bezpieczeństwo (5.6), dostępność (5.4) | ✅ opis / ⏳ część wdrożeń | `README.md` (sekcje na końcu) |
| Usługi płatne oznaczone, z kosztem i alternatywą | ✅ | `docs/LICENCJE.md` §3 |
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

Odtworzenie po scaleniu silnika (PowerShell):

```powershell
cd web; npm run build; npm run start -- -p 3015
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
& $edge --headless --disable-gpu --no-pdf-header-footer --virtual-time-budget=10000 --print-to-pdf="$PWD\..\deliverables\prezentacja.pdf" http://localhost:3015/slides
& $edge --headless --disable-gpu --no-pdf-header-footer --virtual-time-budget=40000 --print-to-pdf="$PWD\..\deliverables\raporty\raport-<woj>-<uprawa>-<data>.pdf" "http://localhost:3015/raport?parcelId=<ID>&crop=<uprawa>&date=<RRRR-MM-DD>"
```

Raport prawdziwej działki najlepiej zapisać z przeglądarki („Drukuj / zapisz PDF” i „Pobierz JSON”), bo analiza trwa do ~25 s.

## Uwagi do slajdów (właściciel: lane slides, nie zmieniane w tym pakiecie)

Slajdy w `prezentacja.pdf` mają dwa sformułowania niezgodne z obecną implementacją. Poprawić w `web/src/components/slides/**` i wyeksportować ponownie:
1. Slajdy 4 i 5: „Open-Meteo ERA5, 10 lat”. Silnik bierze 10 lat z **NASA POWER**, a Open-Meteo (prognoza) daje ostatnie dni i prognozę. Archiwum ERA5 Open-Meteo nie jest używane (limit 429).
2. Slajd 9: „Publiczne, bez licencji”. Dane są publiczne i bez opłat, ale mają licencje (CC BY 4.0, warunki GUGiK, Copernicus). Proponowane: „Publiczne, bez opłat”.

Slajd 5 wymienia też „ISOK” jako źródło hydrologiczne. W silniku ISOK jest tylko linkiem, a na `/mapa` jest przybliżenie 80 m. Lepiej „ISOK (link)” albo usunąć.

## Ostatnie kroki (człowiek)

1. Nazwa zespołu: wpisać w 4 miejscach (pkt 1 tabeli).
2. Scalić silnik (`v2/engine`) do `main` → `npm run build` → odświeżyć README („w trakcie” → „gotowe”).
3. Wdrożyć (serwer Node: Railway / Render / VPS, bez kluczy) → wpisać <LINK DO WERSJI DZIAŁAJĄCEJ>.
4. Wygenerować raporty 2–3 działek (`demo-final.md`, tabela) → `deliverables/raporty/`.
5. Poprawić slajdy (wyżej) → ponowny eksport `prezentacja.pdf`, sprawdzić ≤ 10 stron.
6. Nagrać film wg `film-scenariusz.md` → wgrać → wpisać <LINK DO FILMU>.
7. `git push -u origin main` → wpisać SHA → dostęp jury wg `dostep-jury.md` → test prywatności (wylogowany = 404).
8. Złożyć zgłoszenie na platformie (lider zespołu): nazwa, tytuł, opis, link do repo, README, PDF, link online, film, raporty, zrzuty.
