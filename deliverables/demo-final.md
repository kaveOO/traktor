# Finał: plan wystąpienia (2–3 min prezentacji + demo + 2 min pytań)

Role (bez nazwisk): **P** prowadzi i mówi, **D** obsługuje komputer z demo, **Z** pilnuje czasu i planu awaryjnego.

## T−60 min: przygotowanie

- [ ] Wersja online działa: `<LINK DO WERSJI DZIAŁAJĄCEJ>`/analiza (1 pełna analiza testowa). Link do uzupełnienia przez zespół; bez wdrożenia demo idzie z laptopa (punkt niżej).
- [ ] Lokalnie na laptopie demo: `cd web; npm run build; npm run start -- -p 3010` → http://localhost:3010/analiza. Klucze Google i Anthropic **nieustawione**.
- [ ] Internet: Wi-Fi sali + **hotspot telefonu** gotowy (zmiana sieci < 30 s).
- [ ] Karty w przeglądarce (w tej kolejności): 1 `/slides`, 2 `/analiza`, 3 `/mapa`, 4 `/raport?demo=1` (zapas), 5 PDF raportów z dysku.
- [ ] Rozgrzany cache: działki z tabeli niżej, data dzisiejsza (każda raz). Wynik siedzi w pamięci serwera 1 h (maks. 200 wyników; restart serwera czyści cache). Seria NASA POWER zostaje w katalogu tymczasowym 12 h.
- [ ] `/mapa`: etykieta warunków „Dane na żywo · Open-Meteo, IMGW-PIB”. Jeśli „Dane zapisane (brak połączenia)”, mówimy to wprost.
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

Źródło: [`docs/review/10-jury-test-set.md`](../docs/review/10-jury-test-set.md) (12 działek; identyfikatory sprawdzone w ULDK: `GetParcelByXY` → id → `GetParcelById`, kategoria gleby z IUNG w punkcie). Kryterium: czas ≤ 30 s i kierunek wyniku zgodny z kolumną „Oczekiwany kierunek”. Czasy wpisać dzień przed finałem.

Daty testowe (te same dla każdej działki):
- **D1 = dziś (22.11.2026)**: poza sezonem SMSR (21.III–30.IX). Aplikacja ma napisać, że SMSR nie ocenia wtedy suszy, i podać stan ostatniego sezonu. Bez flagi „susza” z bieżącego KBW.
- **D2 = 2018-07-20**: najszerzej notowana susza w SMSR (2018: susza w ok. 94% gmin, IUNG SiR 71/2023).
- **D3 = 2024-09-20** (po powodzi z 12–16 IX 2024 w Opolskiem i na Dolnym Śląsku): bez suszy, wyraźnie dodatni KBW na #6 i #12.

| # | Numer działki (ULDK) | Region (gmina, obręb) | Kat. IUNG | Uprawa (propozycja) | Oczekiwany kierunek D2 (2018-07-20) | Czas D1 | Czas D2 | Czas D3 | Uwagi (braki danych) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `040706_5.0021.44` | kujawsko-pomorskie, Kruszwica, Kraszyce (czarne ziemie, pas suszy Kujaw) | III | pszenica ozima | susza | | | | porównać z archiwum SMSR 2018 (w poprawkach) |
| 2 | `301103_2.0035.322/3` | wielkopolskie, Kościan, Wyskoć | II | kukurydza | susza | | | | |
| 3 | `060404_2.0142.AR_2.182` | lubelskie, Hrubieszów, Brodzica (lessy; numer z arkuszem `AR_`) | IV | burak cukrowy | słabsza susza lub brak | | | | test numeru z `AR_` |
| 4 | `200303_2.0052.141/1` | podlaskie, Bielsk Podlaski (gm. wiejska), Szastały | III | użytki zielone | prawdopodobnie susza (brak progu SMSR dla użytków zielonych: reguła zastępcza) | | | | |
| 5 | `140311_2.0002.30/3` | mazowieckie, Sobolew, Chotynia (piaski) | I | żyto | susza | | | | |
| 6 | `160203_4.0100.156/4` | opolskie, Głubczyce (obszar wiejski) (Płaskowyż Głubczycki, lessy) | IV | rzepak ozimy | słabsza susza lub brak; D3: dodatni KBW | | | | |
| 7 | `121405_5.0016.480/3` | małopolskie, Proszowice, Opatkowice | III | ziemniak | prawdopodobnie susza | | | | |
| 8 | `220903_2.0006.97/60` | pomorskie, Lichnowy, Parszewo (Żuławy, polder) | IV | pszenica ozima | słabsza susza lub brak | | | | |
| 9 | `280803_2.0011.3/1` | warmińsko-mazurskie, Kętrzyn (gm. wiejska), Grabno | III | jęczmień jary | prawdopodobnie susza | | | | |
| 10 | `080906_5.0002.65/3` | lubuskie, Sulechów, Brzezie k. Sulechowa | II | kukurydza | susza | | | | |
| 11 | `321205_5.0005.135` | zachodniopomorskie, Pyrzyce, Turze (równina pyrzycka) | IV | pszenica ozima | susza (wg zestawu testowego) | | | | |
| 12 | `160104_5.0124.2/1` | opolskie, Lewin Brzeski, Ptakowice (dolina Nysy Kłodzkiej, powódź IX 2024) | IV | kukurydza | D3: wyraźnie dodatni KBW; ISOK tylko link | | | | |
| zapas | `040307_2.0023.306/2` | kujawsko-pomorskie, przykład ze slajdu 6 | – | pszenica ozima | – | | | | działka zapasowa |

Testy odmowy (oczekiwany komunikat „nie jest użytkiem rolnym”, HTTP 422): `040706_5.0020.3309/3` (Kruszwica, las), `141703_2.0001.116` (Celestynów, las), `321205_4.0009.16` (Pyrzyce, zabudowa).

Zapasowe działki: piaski kat. I `142402_2.0015.213` (Obryte, Sadykierz), `141510_2.0005.417/8` (Rzekun, Dzbenin); lessy `060406_2.0135.34` (Trzeszczany, Zadębce).

Uwagi:
- Kategoria IUNG pochodzi z punktu, nie z oględzin ortofotomapy. Środek działki może trafić na inny typ użytku.
- Kierunek dla 2018 to oczekiwanie z zestawu testowego. Dla dat sprzed 2020 r. tabele gmin SMSR online nie istnieją, punktem odniesienia jest nasz KBW (P − ET0) z podanym źródłem. Porównanie z archiwum SMSR 2018 jest w poprawkach silnika (`docs/review2/01-engine-logic.md`, P0 4). Na finale pokazujemy tylko przypadki zgodne z SMSR.
- Na D2 dla zbóż ozimych i rzepaku (#1, #6, #8, #11) lipiec to dojrzewanie i zbiór. Do czasu poprawki „miesiąc zbioru” wynik może wskazać stres roślin i nawadnianie; na finale lepiej użyć kukurydzy lub ziemniaka.

Z każdej sprawdzonej działki zapisz raport PDF i JSON do `deliverables/raporty/` (nazwa: `raport-<woj>-<uprawa>-<data>.pdf`). **Raporty do ponownego eksportu po poprawkach silnika.**

## Plan awaryjny

| Problem | Reakcja (Z daje znak, D wykonuje) | Co mówi P |
|---|---|---|
| Analiza > 30 s albo źródło nie odpowiada | Poczekaj do 30 s. Wynik częściowy pokaż normalnie (tak jest zaprojektowany) | „Gdy źródło nie odpowiada, raport jest częściowy i mówi to wprost.” |
| Brak internetu w sali | Przełącz na hotspot. Jeśli nadal nic: karta 5, gotowy PDF raportu prawdziwej działki | „Pokażę raport tej działki policzony rano. Te same źródła i daty.” |
| Wersja online nie działa | Laptop, `localhost:3010` | – |
| Błąd API / 503 „Serwer liczy inne analizy” / 429 limit | Odczekaj chwilę i ponów (limit 30 analiz/min na IP, 4 naraz). Jeśli nadal błąd: gotowy PDF prawdziwej działki, w ostateczności `/raport?demo=1` (**baner „Dane przykładowe”, mówimy to głośno**) | „To dane przykładowe pokazujące układ raportu.” |
| Działka od jury to las lub zabudowa | Pokaż komunikat „nie jest użytkiem rolnym” (tak ma być), wybierz działkę obok na mapie | „IUNG pokazuje tu las. Analizujemy tylko grunty rolne.” |
| Laptop / projektor zawodzi | Film (plik offline na pendrive i telefonie) + `prezentacja.pdf` | – |
| Numer działki od jury nie istnieje w ULDK | Pokaż komunikat błędu (walidacja), poproś o miejscowość, kliknij działkę na mapie | „ULDK nie zna tego numeru. Wybierzmy działkę z mapy.” |

Zasada: **nigdy nie udajemy wyniku na żywo danymi przykładowymi.** Demo z danymi przykładowymi zawsze z wyraźnym zastrzeżeniem.

## Pytania (2 min): krótkie odpowiedzi

Pełna lista: `.opencode/skills/traktor-pitch/SKILL.md` (sekcja Jury Q&A). Najczęstsze:

- **Skąd wiecie, że wynik jest dobry?** Każda liczba ma źródło i datę. KBW porównujemy z mapą IUNG SMSR dla gminy, NDVI z Copernicus Browser dla tej samej sceny. Progi są oznaczone „do kalibracji”. Kalibracja to pilotaż z IUNG.
- **Czy to AI?** Analiza jest deterministyczna: te same dane dają ten sam wynik. Model językowy niczego nie liczy, a w wersji dla jury jest wyłączony. Kod pisaliśmy z asystentem AI, co jest opisane w README.
- **Dlaczego NASA POWER, a nie ERA5?** Darmowe archiwum Open-Meteo miało limit dzienny (429) w czasie hackathonu. NASA POWER daje 10 lat dobowo w ok. 1,5 s. Źródło jest podane w raporcie. Archiwum Open-Meteo (ERA5) zostało tylko na `/mapa` (60 dni dla jednego punktu), z zapasem na prognozę `past_days=60`.
- **Rozdzielczość pogody?** NASA POWER to siatka ok. 0,5° (dziesiątki km), Open-Meteo kilka km. To nie skala pola. Lokalna burza może nie być widoczna, więc mówimy o tym w ograniczeniach.
- **Koszty i skala?** Dane bez opłat licencyjnych. Szacunek 150–600 zł/mies. dla 1 000 rolników (README, sekcja skalowalności). W produkcji KOWR potrzebuje planu Open-Meteo lub własnej instancji i własnego serwera kafli.
- **Dane osobowe?** Brak. Numer działki to dana publiczna, bez danych właścicieli. Raport zostaje u użytkownika.
- **Zastawka a prawo?** Pozwolenie wodnoprawne (art. 389 pkt 6 Prawa wodnego). Utrzymanie rowu: właściciel lub spółka wodna. Każde miejsce: „Wymaga wizji lokalnej”.
- **Plon?** Nie obiecujemy. Pilotaż ma to zmierzyć.
