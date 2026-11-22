# TRAKTOR: zgłoszenie

Zespół: **<NAZWA ZESPOŁU>** · Tytuł rozwiązania: **TRAKTOR: asystent wody dla jednej działki rolnej** · Zadanie KOWR „Zatrzymaj wodę, chroń plony” · HackNation 2026

Pakiet zgłoszeniowy i lista kontrolna pkt 4.1: **`deliverables/README.md`** (tam też lista znaczników „DO UZUPEŁNIENIA PRZEZ ZESPÓŁ”: nazwa zespołu, link do filmu, link do wersji działającej, SHA).

| Co | Plik |
|---|---|
| Zwięzły opis rozwiązania (do wklejenia na platformę) | `deliverables/opis-rozwiazania.md` |
| Scenariusz filmu (≤ 3:00) | `deliverables/film-scenariusz.md` |
| Plan finału: wystąpienie, demo, pytania, plan awaryjny | `deliverables/demo-final.md` |
| Dostęp jury do prywatnego repozytorium | `deliverables/dostep-jury.md` |
| Rejestr źródeł i licencji (§ 2 ust. 10) | `docs/LICENCJE.md`, `docs/THIRD_PARTY_NOTICES.md` |
| Przekazanie KOWR po wygranej (§ 5) | `docs/PRZEKAZANIE.md` |

## Zwięzły opis rozwiązania (skrót, pełna wersja w `deliverables/opis-rozwiazania.md`)

**Problem.** Susza rolnicza wraca co kilka lat, a pomoc przychodzi po stracie. W Polsce zmeliorowano ok. 6,4 mln ha, a rowy odprowadzają wodę tylko na zewnątrz. Rolnik nie ma prostego narzędzia, które dla jego działki powie, jak jest z wodą, dlaczego i co zrobić.

**Rozwiązanie.** Asystent jednej działki dla całej Polski. Podajesz numer działki (albo klikasz na mapie), uprawę i datę: dziś lub do 10 lat wstecz. Dostajesz raport w kolejności z Załącznika 1:
1. ocena,
2. przyczyny (z liczbą i źródłem),
3. retencja,
4. agrotechnika,
5. nawadnianie.

Raport ma poziom niepewności, braki danych i tabelę źródeł. Druk, PDF, JSON.

**Dane.** Na żywo, z darmowych źródeł publicznych:
- ULDK i ortofotomapa GUGiK,
- NASA POWER (10 lat) + Open-Meteo (ostatnie dni i prognoza), ostrzeżenia IMGW-PIB,
- Sentinel-2 L2A (Microsoft Planetary Computer, zapasowo Earth Search),
- IUNG-PIB (kategoria gleby, progi SMSR) i SoilGrids,
- NMT 1 m GUGiK, cieki z OSM.

Przykład zastawek `/mapa` dodatkowo pobiera na żywo warunki z Open-Meteo (prognoza 7 dni, archiwum 60 dni) i ostrzeżenia IMGW-PIB.

Wynik liczy aplikacja jawnymi regułami. Model językowy niczego nie liczy.

**Korzyści.** Rolnik dostaje decyzję dla swojej działki bez konta i opłat. Doradca ODR / KOWR dostaje sprawdzalny raport dla wielu działek. Krajobraz zyskuje retencję przed nawadnianiem. Koszt to obliczenia, nie licencje. Nie obiecujemy wzrostu plonu, zmierzy go pilotaż.
