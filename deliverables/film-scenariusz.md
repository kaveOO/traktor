# Film zgłoszeniowy: scenariusz (maks. 3:00)

Cel: jury w 3 minuty widzi problem, **działający prototyp na prawdziwej działce**, kolejność z Załącznika 1, źródła danych i uczciwość raportu.
Długość docelowa **2:50** (10 s zapasu). Limit twardy 3:00. Dłuższy film może nie zostać obejrzany do końca.

## Przed nagraniem

- Nagrywaj **po scaleniu silnika** (`/api/analiza`, `/api/dzialka`) na buildzie produkcyjnym: `cd web; npm run build; npm run start -- -p 3010`. Najlepiej na wersji online.
- Bez kluczy: `GOOGLE_MAPS_API_KEY` i `ANTHROPIC_API_KEY` **nieustawione** (pokazujemy wersję dla jury).
- Działka A (na żywo, dzisiejsza data): `040307_2.0023.306/2` (kujawsko-pomorskie) albo działka z innego województwa sprawdzona dzień wcześniej (`deliverables/demo-final.md`, tabela). Uprawa: pszenica ozima.
- Działka A, data −5 lat, np. 2021-06-15: ta sama działka w scenie zmiany daty.
- Przeglądarka: Chrome/Edge, okno 1920×1080, zoom 100%, bez zakładek i rozszerzeń (profil gościa), tryb pełnoekranowy F11.
- Rozgrzej cache jednym przebiegiem **tylko dla działki A z dzisiejszą datą** (wstęp ma być płynny). Zmianę daty nagraj na zimno, żeby było widać prawdziwy czas.
- Wyłącz powiadomienia systemowe (Windows: *Nie przeszkadzać*).

## Scenariusz

| Czas | Obraz (co na ekranie) | Lektor | Uwagi do montażu |
|---|---|---|---|
| 0:00–0:12 | Slajd 1 `/slides` (logo, hasło), przejście do slajdu 2 (394 gminy, 6,4 mln ha) | „Polska zmeliorowała 6,4 miliona hektarów. Rowy działają w jedną stronę: wypuszczają wodę. Potem przychodzi susza.” | Liczby ze slajdu 2 (źródła IUNG, NIK/GUS) |
| 0:12–0:25 | `/analiza`: pełny ekran mapy Polski na ortofotomapie GUGiK, panel „Sprawdź swoją działkę” | „TRAKTOR to asystent wody dla jednej działki. Dowolnej w Polsce.” | Powolny zoom mapy |
| 0:25–0:45 | Wpisanie numeru działki, „Szukaj” → obrys na mapie; wybór „Pszenica ozima”; data dzisiejsza; „Analizuj działkę” | „Wpisuję numer z ewidencji albo klikam działkę. Wybieram uprawę i datę.” | Kursor wyraźny (powiększony) |
| 0:45–1:00 | Postęp: lista źródeł z statusem i czasem (ULDK, NASA POWER, Open-Meteo, Sentinel-2, IUNG, SoilGrids, NMT) | „Dane pobieramy teraz, na żywo, z publicznych źródeł. Bez konta, bez opłat.” | Pokazać czas analizy (cel ≤ 30 s). Jeśli dłużej: przyspieszyć ×2 i **napisać na ekranie „przyspieszone ×2”** |
| 1:00–1:20 | Sekcja 1 „Ocena”: zagrożenie teraz i na tle 10 sezonów, KBW w mm, percentyl, NDVI/NDMI | „Najpierw ocena: jak jest dziś i jak było przez 10 lat. Bilans wodny, stan roślin z Sentinela-2.” | Zbliżenie na tabelę wskaźników ze źródłami |
| 1:20–1:35 | Sekcja 2 „Przyczyny”: każda z liczbą i progiem | „Potem przyczyny. Każda z liczbą, progiem i źródłem. Bez przyczyny nie ma rekomendacji.” | |
| 1:35–1:58 | Sekcje 3–5: retencja (zastawka/oczko + „pozwolenie wodnoprawne”), agrotechnika, nawadnianie (nie teraz / rozważ / tak, mm) | „Dopiero potem działania. Najpierw retencja, potem agrotechnika, na końcu nawadnianie.” | |
| 1:58–2:15 | Zmiana daty na 5 lat wstecz → nowa analiza, inny wynik | „Ta sama działka, czerwiec 2021. Wynik liczony od nowa, z danych z tamtego dnia.” | Nagrane na zimno |
| 2:15–2:30 | `/mapa`: rowy pod Bydgoszczą, kliknięcie odrzuconego punktu → powód („Woda na działce sąsiada”) | „Zastawka tylko tam, gdzie nie zaleje sąsiada. Inaczej mówimy nie i dlaczego.” | Podpis: „Przykład: dane BDOT10k i NMT pobrane 22.11.2026” |
| 2:30–2:45 | `/raport`: poziom niepewności, braki danych, tabela źródeł, „Drukuj / zapisz PDF” → podgląd PDF | „Raport do druku. Źródła, daty, braki danych. Wszystko da się sprawdzić.” | |
| 2:45–2:50 | Slajd 10: logo + „Niech ziemia zatrzyma swoją wodę.” | „TRAKTOR. Niech ziemia zatrzyma swoją wodę.” | Na ekranie: nazwa zespołu (bez imion), „HackNation 2026 · KOWR” |

Napisy: dodać polskie napisy (dostępność, pkt 5.4). Wystarczy plik `.srt` z tekstem lektora.

## Lista ujęć do nagrania (osobne pliki, łatwiejszy montaż)

1. `01-slajdy.mp4`: slajd 1 → 2 (strzałka), 15 s.
2. `02-analiza-start.mp4`: mapa Polski, zoom do województwa, 15 s.
3. `03-analiza-dzialka-A-dzis.mp4`: wpisanie numeru → raport w panelu, całość bez cięć (dowód „na żywo”).
4. `04-analiza-przewijanie.mp4`: spokojne przewijanie sekcji 1–5.
5. `05-analiza-dzialka-A-2021.mp4`: zmiana daty, analiza na zimno.
6. `06-mapa-odmowa.mp4`: `/mapa`, klik w odrzucony punkt, panel z powodem.
7. `07-raport-pdf.mp4`: `/raport`, druk do PDF.
8. `08-slajd-koniec.mp4`: slajd 10.
9. Lektor: osobna ścieżka audio (mikrofon zewnętrzny lub słuchawki z mikrofonem, cichy pokój).

## Nagrywanie (OBS Studio, bezpłatny)

- *Ustawienia → Wideo*: rozdzielczość bazowa i wyjściowa **1920×1080**, **30 FPS**.
- *Ustawienia → Wyjście*: nagrywanie **MP4** (albo MKV i *Plik → Remux* do MP4), koder sprzętowy (NVENC/QuickSync/AMF) lub x264, jakość „Wysoka”. Audio 48 kHz.
- Źródło: *Przechwytywanie okna* (przeglądarka) zamiast całego ekranu (nie widać paska zadań i powiadomień).
- Kursor: włączony. Kliknięcia spokojne, bez krążenia myszą.
- Lektor: nagrany osobno do gotowego obrazu albo na żywo z filtrem *Tłumienie szumów* (RNNoise) i *Kompresor*.
- Montaż: DaVinci Resolve / Shotcut / Clipchamp. Eksport H.264, 1080p, ~8–12 Mb/s. Sprawdź długość: **≤ 3:00**.
- Publikacja: YouTube **„Niepubliczny”** (unlisted) albo Google Drive z dostępem przez link, według instrukcji platformy. Link wpisz w `deliverables/README.md` jako `<LINK DO FILMU>`. Pliku wideo **nie** dodawaj do gita.

## Czego nie mówić i nie pokazywać

- Bez obietnic wzrostu plonu i kosztów zastawek.
- Nie pokazywać `/raport?demo=1` jako wyniku działki: to dane przykładowe (baner na raporcie).
- Nie pokazywać kluczy, `.env`, terminala z tokenami ani imion członków zespołu (§ 6).
- „≤ 30 s” to cel z regulaminu. Mówić „zwykle kilkanaście sekund” tylko wtedy, gdy tak wyszło w nagraniu.
