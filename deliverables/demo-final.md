# Finał: plan wystąpienia (2–3 min prezentacji + demo + 2 min pytań)

Role (bez nazwisk): **P** prowadzi i mówi, **D** obsługuje komputer z demo, **Z** pilnuje czasu i planu awaryjnego.

## T−60 min: przygotowanie

- [ ] Wersja online działa: `<LINK DO WERSJI DZIAŁAJĄCEJ>`/analiza (1 pełna analiza testowa).
- [ ] Lokalnie na laptopie demo: `cd web; npm run build; npm run start -- -p 3010` → http://localhost:3010/analiza. Klucze Google i Anthropic **nieustawione**.
- [ ] Internet: Wi-Fi sali + **hotspot telefonu** gotowy (zmiana sieci < 30 s).
- [ ] Karty w przeglądarce (w tej kolejności): 1 `/slides`, 2 `/analiza`, 3 `/mapa`, 4 `/raport?demo=1` (zapas), 5 PDF raportów z dysku.
- [ ] Rozgrzany cache: działki z tabeli niżej, data dzisiejsza (każda raz). Wynik siedzi w pamięci serwera 1 h.
- [ ] Na pulpicie: `deliverables/prezentacja.pdf`, `deliverables/raporty/*.pdf`, plik filmu (offline) i link do filmu.
- [ ] Zoom przeglądarki 110–125% (czytelność z sali), tryb pełnoekranowy, powiadomienia wyłączone.
- [ ] Ładowarka, przejściówka HDMI/USB-C, pilot do slajdów (strzałki).

## Na scenie

| Czas | Kto | Co | Ekran |
|---|---|---|---|
| 0:00–0:20 | P | Problem: „6,4 mln ha zmeliorowanych. Rowy wypuszczają wodę. 394 gminy z suszą w zbożach jarych w 2025. Pomoc przychodzi po stracie.” | slajd 2 |
| 0:20–0:40 | P | Rozwiązanie: „Trzy pola: działka, uprawa, data. Jeden raport. Najpierw przyczyna, potem rada.” | slajdy 3–4 |
| 0:40–2:10 | D + P | **Demo na żywo na działce od jury** (niżej) | `/analiza` |
| 2:10–2:30 | D | `/mapa`: jedna odmowa zastawki z powodem („Woda na działce sąsiada”) | `/mapa` |
| 2:30–2:50 | P | Uczciwość i skala: źródła z datą, niepewność, „Wymaga wizji lokalnej”. Każda działka w ULDK, dane publiczne, cel ≤ 30 s | slajdy 8–9 |
| 2:50–3:00 | P | Prośba: „Dajcie nam jeden oddział KOWR. Policzymy jego działki i w sezonie porównamy raporty z polem.” | slajd 10 |

### Demo: krok po kroku

1. „Proszę o numer działki albo miejscowość.” Jury podaje numer → D wpisuje w pole wyszukiwania → **Szukaj**. Gdy jury nie ma numeru: klik w działkę na mapie (granice KIEG od przybliżenia 15).
2. Uprawa: od jury (domyślnie **pszenica ozima**). Data: dzisiejsza albo od jury (do 10 lat wstecz).
3. **Analizuj działkę**. W trakcie P mówi: „Teraz pobieramy dane: ewidencja GUGiK, 10 lat pogody z NASA POWER, prognoza Open-Meteo, Sentinel-2, gleba IUNG i SoilGrids, rzeźba z NMT.”
4. Wynik: przejść **w kolejności**: ocena → przyczyny (pokazać liczbę i próg) → retencja → agrotechnika → nawadnianie.
5. Pokazać **tabelę źródeł** i **poziom niepewności**. Jeśli czegoś brakuje: „Brak danych podajemy wprost. Niepewność rośnie.”
6. **Raport** → „Drukuj / zapisz PDF” (sam podgląd, bez drukowania).
7. Jeśli zostało ≥ 20 s: ta sama działka, data sprzed 5 lat → inny wynik.

## Działki testowe (sprawdzić dzień przed, wpisać czasy)

`docs/review/10-jury-test-set.md` jeszcze nie istnieje. Do wtedy uzupełniamy tabelę ręcznie: po jednej działce rolnej z różnych województw, znalezionej kliknięciem na mapie w `/analiza` (numer z panelu). Kryterium: czas ≤ 30 s i spójny wynik dziś oraz −5 lat.

| # | Numer działki (ULDK) | Województwo | Uprawa | Czas dziś | Czas −5 lat | Uwagi (braki danych) |
|---|---|---|---|---|---|---|
| 1 | `040307_2.0023.306/2` | kujawsko-pomorskie | pszenica ozima | | | działka zapasowa ze slajdu 6 |
| 2 | `<numer>` | wielkopolskie | kukurydza | | | |
| 3 | `<numer>` | lubelskie | ziemniak | | | |
| 4 | `<numer>` | mazowieckie | użytki zielone | | | |
| 5 | `<numer>` | dolnośląskie | rzepak ozimy | | | |
| 6 | `<numer>` | podlaskie / warmińsko-mazurskie | jęczmień jary | | | |

Z każdej sprawdzonej działki zapisz raport PDF i JSON do `deliverables/raporty/` (nazwa: `raport-<woj>-<uprawa>-<data>.pdf`).

## Plan awaryjny

| Problem | Reakcja (Z daje znak, D wykonuje) | Co mówi P |
|---|---|---|
| Analiza > 30 s albo źródło nie odpowiada | Poczekaj do 30 s. Wynik częściowy pokaż normalnie (tak jest zaprojektowany) | „Gdy źródło nie odpowiada, raport jest częściowy i mówi to wprost.” |
| Brak internetu w sali | Przełącz na hotspot. Jeśli nadal nic: karta 5, gotowy PDF raportu prawdziwej działki | „Pokażę raport tej działki policzony rano. Te same źródła i daty.” |
| Wersja online nie działa | Laptop, `localhost:3010` | – |
| Silnik niescalony / błąd API | `/raport?demo=1` (**baner „Dane przykładowe”, mówimy to głośno**) + gotowe PDF | „To dane przykładowe pokazujące układ raportu.” |
| Laptop / projektor zawodzi | Film (plik offline na pendrive i telefonie) + `prezentacja.pdf` | – |
| Numer działki od jury nie istnieje w ULDK | Pokaż komunikat błędu (walidacja), poproś o miejscowość, kliknij działkę na mapie | „ULDK nie zna tego numeru. Wybierzmy działkę z mapy.” |

Zasada: **nigdy nie udajemy wyniku na żywo danymi przykładowymi.** Demo z danymi przykładowymi zawsze z wyraźnym zastrzeżeniem.

## Pytania (2 min): krótkie odpowiedzi

Pełna lista: `.opencode/skills/traktor-pitch/SKILL.md` (sekcja Jury Q&A). Najczęstsze:

- **Skąd wiecie, że wynik jest dobry?** Każda liczba ma źródło i datę. KBW porównujemy z mapą IUNG SMSR dla gminy, NDVI z Copernicus Browser dla tej samej sceny. Progi są oznaczone „do kalibracji”. Kalibracja to pilotaż z IUNG.
- **Czy to AI?** Analiza jest deterministyczna: te same dane dają ten sam wynik. Model językowy niczego nie liczy, a w wersji dla jury jest wyłączony. Kod pisaliśmy z asystentem AI, co jest opisane w README.
- **Dlaczego NASA POWER, a nie ERA5?** Darmowe archiwum Open-Meteo miało limit dzienny (429) w czasie hackathonu. NASA POWER daje 10 lat dobowo w ok. 1,5 s. Źródło jest podane w raporcie.
- **Rozdzielczość pogody?** NASA POWER to siatka ok. 0,5° (dziesiątki km), Open-Meteo kilka km. To nie skala pola. Lokalna burza może nie być widoczna, więc mówimy o tym w ograniczeniach.
- **Koszty i skala?** Dane bez opłat licencyjnych. Szacunek 150–600 zł/mies. dla 1 000 rolników (README, sekcja skalowalności). W produkcji KOWR potrzebuje planu Open-Meteo lub własnej instancji i własnego serwera kafli.
- **Dane osobowe?** Brak. Numer działki to dana publiczna, bez danych właścicieli. Raport zostaje u użytkownika.
- **Zastawka a prawo?** Pozwolenie wodnoprawne (art. 389 pkt 6 Prawa wodnego). Utrzymanie rowu: właściciel lub spółka wodna. Każde miejsce: „Wymaga wizji lokalnej”.
- **Plon?** Nie obiecujemy. Pilotaż ma to zmierzyć.
