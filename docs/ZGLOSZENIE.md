# TRAKTOR: zgłoszenie

Zespół: **<nazwa zespołu>** · Zadanie KOWR „Zatrzymaj wodę, chroń plony” · HackNation 2026

## Zwięzły opis rozwiązania

**Problem.** Susza rolnicza wraca co kilka lat, a pomoc przychodzi po stracie. W Polsce zmeliorowano ok. 6,4 mln ha. Rowy odprowadzają wodę w jedną stronę: na zewnątrz. Rolnik nie ma prostego narzędzia, które dla jego działki powie: jak jest z wodą, dlaczego i co zrobić.

**Rozwiązanie.** TRAKTOR to asystent jednej działki dla całej Polski. Wpisujesz numer działki (albo klikasz na mapie), wybierasz uprawę i datę: dziś lub do 10 lat wstecz. W 10–30 s dostajesz raport w kolejności z Załącznika 1:

1. ocena sytuacji wodnej (dziś i na tle 10 lat),
2. przyczyny, każda z liczbą i źródłem,
3. rekomendacje retencyjne (np. zastawka na rowie, oczko w obniżeniu, strefa buforowa),
4. agrotechnika (międzyplony, mulcz, uprawa uproszczona, materia organiczna),
5. nawadnianie: nie teraz / rozważ / tak, ile mm i do kiedy.

Raport ma poziom niepewności, listę braków danych i tabelę źródeł. Można go wydrukować, zapisać jako PDF lub JSON.

**Dane.** Wszystko pobierane na żywo przy zapytaniu, z darmowych i legalnych źródeł:
- przestrzenne: ULDK (obrys działki),
- meteorologiczne: Open-Meteo ERA5 (10 lat) + prognoza, ostrzeżenia IMGW,
- satelitarne: Sentinel-2 (NDVI, NDMI na tle 5 poprzednich sezonów),
- glebowe: kategoria podatności na suszę IUNG, SoilGrids,
- hydrologiczne i rzeźba: NMT 1 m GUGiK, cieki i rowy, strefy powodziowe.

Wynik liczy aplikacja, regułami jawnymi i powtarzalnymi. Nie ma gotowych rekomendacji. Model językowy jest opcjonalny i tylko upraszcza tekst; nie zmienia liczb.

**Przykład zastawek.** Na `/mapa` pokazujemy rowy na zachód od Bydgoszczy (BDOT10k + NMT 1 m + ULDK): gdzie zastawka zatrzyma wodę, a gdzie odmawiamy i dlaczego (np. cofka na działkę sąsiada). Każde miejsce: „Wymaga wizji lokalnej” i droga do pozwolenia wodnoprawnego.

**Korzyści.**
- Rolnik: decyzja dla swojej działki w pół minuty, bez konta i bez opłat.
- Doradca ODR / KOWR: ten sam, sprawdzalny raport dla wielu działek; źródła i daty w każdym raporcie.
- Woda: więcej retencji w krajobrazie zamiast szybkiego odpływu rowami.
- Skala: tylko dane krajowe i otwarte; koszt to obliczenia, nie licencje.

Nie obiecujemy wzrostu plonu. Pilotaż ma go zmierzyć.

---

## Scenariusz filmu (maks. 3:00)

| Czas | Obraz | Lektor (skrót) |
|---|---|---|
| 0:00–0:15 | Spękane pole, potem pełny rów, woda odpływa | „Polska zbudowała maszynę wodną na 6,4 mln ha. Działa w jedną stronę: wypuszcza wodę.” |
| 0:15–0:30 | Ekran `/analiza`, pole numeru działki | „TRAKTOR: wpisz numer działki, uprawę i datę.” |
| 0:30–0:55 | Wpisanie numeru, wybór „Pszenica ozima”, data dzisiejsza, „Analizuj”; lista źródeł z czasami | „Dane pobieramy na żywo: ULDK, Open-Meteo z 10 lat, Sentinel-2, IUNG, SoilGrids, NMT.” |
| 0:55–1:20 | Ocena: KBW, percentyl, NDVI na tle lat | „Najpierw ocena: jak jest dziś i jak było przez 10 lat.” |
| 1:20–1:40 | Przyczyny z liczbami | „Potem przyczyny. Każda z liczbą i źródłem.” |
| 1:40–2:05 | Rekomendacje: retencja, agrotechnika, nawadnianie | „Dopiero potem działania: retencja, agrotechnika, na końcu nawadnianie.” |
| 2:05–2:20 | Zmiana daty na 5 lat wstecz, nowy wynik | „Ta sama działka, inna data. Wynik liczony od nowa.” |
| 2:20–2:40 | `/mapa`: rowy pod Bydgoszczą, odmowa zastawki z powodem | „Zastawka? Tylko tam, gdzie nie zaleje sąsiada. Inaczej mówimy nie i dlaczego.” |
| 2:40–2:55 | Raport PDF: niepewność, tabela źródeł | „Raport do druku. Źródła, daty, braki danych. Wszystko sprawdzalne.” |
| 2:55–3:00 | Logo, hasło | „Niech ziemia zatrzyma swoją wodę.” |

Nagrywać na wersji produkcyjnej (`npm run start`), z wcześniej rozgrzaną pamięcią podręczną tylko dla wstępu; scenę zmiany daty nagrać na żywo.

---

## Lista kontrolna na finał (2–3 min prezentacji + 2 min pytań)

Przed wejściem:
- [ ] Aplikacja uruchomiona (`npm run start -- -p 3010`) i wersja online działa: `<URL po wdrożeniu>`.
- [ ] Internet sprawdzony; zapasowy hotspot.
- [ ] Gotowe raporty PDF dla 2–3 działek testowych (na wypadek awarii sieci lub źródła).
- [ ] Slajdy `/slides` otwarte w drugiej karcie; PDF slajdów na pulpicie.
- [ ] Klucz Google wyłączony; `ANTHROPIC_API_KEY` opcjonalny (aplikacja działa bez niego).

Działki testowe (różne województwa; uzupełnić i sprawdzić czas ≤ 30 s, dziś i 5 lat wstecz):

| Numer działki | Województwo | Uprawa | Czas dziś | Czas −5 lat |
|---|---|---|---|---|
| `040307_2.0023.306/2` | kujawsko-pomorskie | pszenica ozima | | |
| `<numer>` | `<woj.>` | kukurydza | | |
| `<numer>` | `<woj.>` | ziemniak | | |
| `<numer>` | `<woj.>` | użytki zielone | | |
| `<numer>` | `<woj.>` | rzepak ozimy | | |

Na scenie:
- [ ] 0:00 Problem w jednym zdaniu (6,4 mln ha zmeliorowanych, woda tylko odpływa).
- [ ] 0:20 Na żywo: działka od jury (1–3 numery) + data podana przez jury.
- [ ] Pokazać kolejność: ocena → przyczyny → retencja → agrotechnika → nawadnianie.
- [ ] Pokazać tabelę źródeł i poziom niepewności.
- [ ] `/mapa`: jedna odmowa zastawki z powodem.
- [ ] Prośba: jeden oddział KOWR i jego dzierżawy, dziesięć miejsc z jedną spółką wodną wiosną.

Gdy źródło nie odpowiada: wynik częściowy jest celowy. Powiedzieć: „Brak danych podajemy wprost, niepewność rośnie.” Potem pokazać gotowy PDF.

Odpowiedzi na pytania: `.opencode/skills/traktor-pitch/SKILL.md` (sekcja Jury Q&A).
