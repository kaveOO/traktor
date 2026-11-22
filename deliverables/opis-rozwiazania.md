# TRAKTOR: asystent wody dla jednej działki rolnej

**Zespół:** <NAZWA ZESPOŁU> · **Zadanie:** KOWR „Zatrzymaj wodę, chroń plony” · HackNation 2026

**Problem.** Susza rolnicza wraca co kilka lat, a pomoc suszowa przychodzi po stracie. W Polsce zmeliorowano ok. 6,4 mln ha. Rowy odprowadzają wodę w jedną stronę: na zewnątrz. Dane o wodzie leżą w kilkunastu osobnych serwisach, a rolnik nie jest analitykiem GIS. Brakuje narzędzia, które dla jednej działki i jednej uprawy powie: jak jest z wodą, dlaczego i co zrobić najpierw.

**Główne funkcjonalności.**
- Działka z całej Polski: numer ewidencyjny (ULDK) albo klik na mapie (ortofotomapa GUGiK).
- Wybór jednej z 10 upraw i daty analizy: dziś albo dowolny dzień do 10 lat wstecz.
- Raport w kolejności z Załącznika 1:
  1. ocena sytuacji wodnej, dziś i na tle 10 sezonów,
  2. przyczyny, każda z liczbą, progiem i źródłem,
  3. retencja (zastawka na rowie, oczko w obniżeniu, pas buforowy, z drogą prawną),
  4. agrotechnika (międzyplon, mulcz, uprawa uproszczona, materia organiczna, wałowanie, odmiana i termin siewu, sprawdzenie łanu w terenie),
  5. nawadnianie (nie teraz / rozważ / tak, ile mm).
- Poziom niepewności, lista braków danych i tabela źródeł z datą pobrania.
- Raport: druk, PDF, JSON, zapis w przeglądarce.
- Przykład zastawek na rowach pod Bydgoszczą (`/mapa`): gdzie zastawka zatrzyma wodę, a gdzie odmawiamy i dlaczego (np. cofka na działkę sąsiada). Polecenia TRZYMAJ / OTWÓRZ z warunków na żywo (Open-Meteo, IMGW-PIB).

**Sposób wykorzystania danych.** Dane pobieramy na żywo przy każdym zapytaniu, z darmowych źródeł publicznych, bez kont. Wynik liczy aplikacja jawnymi, powtarzalnymi regułami. Nie wyświetlamy gotowych rekomendacji.

| Kategoria | Źródło | Do czego |
|---|---|---|
| przestrzenne | ULDK, ortofotomapa i KIEG (GUGiK) | obrys działki, gmina, powierzchnia |
| meteorologiczne | NASA POWER (10 lat), Open-Meteo (ostatnie dni + prognoza), IMGW-PIB | klimatyczny bilans wodny, percentyl na tle 10 lat, ostrzeżenia |
| satelitarne | Sentinel-2 L2A (Microsoft Planetary Computer, zapasowo Earth Search) | NDVI i NDMI działki na tle 5 poprzednich sezonów |
| glebowe | IUNG-PIB (kategoria podatności na suszę, progi SMSR), ISRIC SoilGrids | retencja gleby, progi suszy |
| hydrologiczne i rzeźba | NMT 1 m (GUGiK), cieki z OSM | spadek, najniższy punkt, odległość do rowu |

Gdy źródło nie odpowie, raport jest częściowy i mówi to wprost, a niepewność rośnie. Model językowy nie liczy niczego. Opcjonalnie może tylko uprościć gotowy opis miejsca zastawki (domyślnie wyłączony, strażnik liczb).

**Korzyści.**
- **Rolnik:** decyzja dla swojej działki w mniej niż 30 s (cel), bez konta, bez opłat i bez danych osobowych.
- **Doradca ODR / KOWR:** ten sam sprawdzalny raport dla wielu działek. Każda liczba ma źródło i datę.
- **Krajobraz:** retencja przed nawadnianiem. Najpierw zatrzymujemy wodę, która już spadła.
- **Skala:** tylko dane krajowe i otwarte. Koszt to serwer, nie licencje.

Nie obiecujemy wzrostu plonu. Proponujemy pilotaż z jednym oddziałem KOWR, żeby go zmierzyć.
