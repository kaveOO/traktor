# TRAKTOR: rejestr źródeł, licencji i warunków (Regulamin § 2 ust. 10)

Stan na 22.11.2026. Podstawa: przegląd `docs/review/03-licences.md`, pola `license` w `node_modules` (`web/`, `scripts/geo/`) oraz kod (`main` i gałąź silnika `v2/engine`).
Warunki usług to nasza lektura opublikowanych regulaminów. Pozycje oznaczone **(sprawdzić)** trzeba potwierdzić na aktualnej stronie dostawcy przed wdrożeniem produkcyjnym.

## 1. Co jest czyje

- **Kod TRAKTOR** (wszystko w `web/src/**`, `scripts/**`, dokumentacja w `docs/**`, `deliverables/**`, `README.md`) powstał podczas wydarzenia i należy do zespołu. Po wygranej przenosimy autorskie prawa majątkowe na KOWR (§ 5 Regulaminu, zob. `docs/PRZEKAZANIE.md`).
- **Komponenty zewnętrzne** (biblioteki npm, kroje pisma) zostają na swoich licencjach. Wszystkie są permisywne lub o słabym copyleft (tylko niezmienione binaria narzędzi). Pełna lista: `docs/THIRD_PARTY_NOTICES.md`.
- **Dane** nie są częścią kodu. Aplikacja pobiera je z usług publicznych w chwili zapytania. Wyjątek: przykład `/mapa`, czyli pochodne z BDOT10k, NMT i ULDK (GUGiK) zapisane w `web/src/lib/traktor/real-data.json` oraz wycinek ortofotomapy `web/public/maps/orto-bydgoszcz-west.jpg`, pobrane 22.11.2026.
- **Żadna licencja nie blokuje przeniesienia kodu na KOWR.** Ograniczenia dotyczą korzystania z niektórych usług w produkcji (pkt 3) i wymagają decyzji KOWR, nie zmiany właściciela kodu.

## 2. Dane i usługi zewnętrzne

| Źródło / usługa | Gdzie w aplikacji | Licencja / warunki | Wymagana atrybucja | Uwagi produkcyjne |
|---|---|---|---|---|
| ULDK, GUGiK (`uldk.gugik.gov.pl`) | `/analiza`, `/api/dzialka`, `scripts/geo` | Dane PZGiK udostępniane bezpłatnie (Prawo geodezyjne i kartograficzne art. 40a, od 31.07.2020). Bez SLA | „Źródło: GUGiK, ULDK” | Cache per działka |
| NMT, GUGiK (`services.gugik.gov.pl/nmt`) | silnik (spadek, najniższy punkt), `scripts/geo` | Jak wyżej | „NMT: GUGiK” | – |
| Ortofotomapa GUGiK, WMTS EPSG:3857 (`mapy.geoportal.gov.pl`) | `/analiza`, `/mapa` | Usługa PZGiK, bezpłatna, wymagane podanie źródła | „Ortofotomapa: GUGiK, geoportal.gov.pl” | Domyślny podkład także w produkcji |
| KIEG, granice działek WMS (`integracja.gugik.gov.pl`) | `/analiza` (warstwa od przybliżenia 15) | Zintegrowane dane EGiB starostw, publikowane przez GUGiK. Podgląd bezpłatny | „Działki: KIEG, GUGiK / starostwa powiatowe” | Pokazujemy tylko geometrię i numer, bez danych właścicieli |
| BDOT10k, GUGiK (`opendata.geoportal.gov.pl`, GeoParquet) | `scripts/geo` → `/mapa` | Zbiór PZGiK, otwarty od 2020 | „BDOT10k: GUGiK” | Pobrane 22.11.2026 |
| EOX Sentinel-2 cloudless **2016** (`tiles.maps.eox.at`, warstwa `s2cloudless_3857`) | `/analiza`, `/mapa` (małe przybliżenia) | Rocznik 2016: **CC BY 4.0**. Roczniki 2018+ są CC BY-NC-SA 4.0, więc ich **nie używamy**. Hostowana usługa EOX::Maps jest bezpłatna do użytku niekomercyjnego (sprawdzić) | „Sentinel-2 cloudless – s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)” | Dla KOWR: usunąć warstwę albo zawrzeć umowę z EOX. Ortofotomapa GUGiK pokrywa ten przypadek |
| OpenStreetMap, kafle (`tile.openstreetmap.org`) | `/analiza` i `/mapa` (podkład „Mapa”) | Dane ODbL 1.0, kafle CC BY-SA 2.0. Tile Usage Policy OSMF: atrybucja, bez masowego pobierania i dużego ruchu, bez SLA | „© autorzy OpenStreetMap” z linkiem do openstreetmap.org/copyright | Produkcja: własny serwer kafli albo podkłady GUGiK |
| Nominatim (`nominatim.openstreetmap.org`) | `/analiza` (wyszukiwanie miejscowości) | Polityka OSMF: ≤ 1 zapytanie/s, bez autouzupełniania, identyfikujący nagłówek, cache. Dane ODbL | „Wyszukiwanie: © autorzy OpenStreetMap (Nominatim)” | Produkcja: geokoder GUGiK (UUG) albo własny Nominatim |
| Overpass API (`overpass-api.de`, `overpass.kumi.systems`) | silnik, cieki w promieniu 1 km (opcjonalne) | Publiczne instancje, fair use (~10 tys. zapytań/dzień). Dane ODbL | „© autorzy OpenStreetMap” | Bywa niedostępny. Wtedy wynik częściowy. Produkcja: wyciąg offline albo BDOT10k |
| Open-Meteo, prognoza (`api.open-meteo.com`, `past_days=92`) | silnik: ostatnie dni i prognoza | Dane CC BY 4.0. **Darmowe API tylko do użytku niekomercyjnego** (limity dzienne; zapytania o długie okresy liczone wielokrotnie) | „Weather data by Open-Meteo.com” z linkiem | KOWR: plan komercyjny albo własna instancja (serwer AGPL-3.0 jako osobna usługa, nie dotyka naszego kodu) albo dane IMGW-PIB |
| Open-Meteo, archiwum ERA5 | **nieużywane** w silniku (limit 429 w czasie hackathonu) | jw. + licencja Copernicus | „Contains modified Copernicus Climate Change Service information” | Możliwy powrót przy planie komercyjnym |
| NASA POWER (`power.larc.nasa.gov`, community AG) | silnik: dobowa seria 10 lat (opad, ET0, temperatura) dla komórki 0,1° | Dane NASA, otwarte, bez opłat i kont. NASA prosi o cytowanie projektu POWER (sprawdzić aktualną formułę) | „Dane: NASA Langley Research Center (LaRC) POWER Project, NASA Earth Science/Applied Science Program” | Inny produkt niż ERA5. W raporcie podajemy źródło wprost |
| IMGW-PIB (`danepubliczne.imgw.pl`) | ostrzeżenia meteo (data = dziś) | Ponowne wykorzystanie na warunkach IMGW-PIB | „Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy.” + „Dane IMGW-PIB zostały przetworzone.” | – |
| Copernicus Sentinel-2 L2A przez **Microsoft Planetary Computer** (STAC `planetarycomputer.microsoft.com/api/stac/v1`, token SAS) | `web/src/lib/analiza/satellite.ts`: NDVI, NDMI, maska SCL | Dane Copernicus: wolny, pełny i otwarty dostęp (rozp. UE 1159/2013). Usługa Planetary Computer ma własne Terms of Use: bezpłatna, bez SLA, tokeny SAS krótkotrwałe (sprawdzić) | „Zawiera zmodyfikowane dane Copernicus Sentinel [rok]” | Bez konta. Przy dużym ruchu: własna kopia scen lub Copernicus Data Space |
| Copernicus Sentinel-2 L2A przez **Earth Search** (Element 84, AWS Open Data `sentinel-cogs`), zapas | jw., gdy Planetary Computer nie odpowie | Dane Copernicus jw. STAC Element 84 bezpłatny, bez SLA | jw. | – |
| IUNG-PIB, WCS podatności na suszę (`sgeo.iung.pl`, warstwa 2024) | silnik: kategoria gleby I–IV | **Brak jawnej licencji w usłudze.** Instytut państwowy, ustawa o otwartych danych (sprawdzić) | „Źródło: IUNG-PIB, System Monitoringu Suszy Rolniczej” | KOWR powinien uzyskać od IUNG pisemne warunki |
| IUNG SMSR, progi KBW (`susza.iung.pulawy.pl/progi`) | `web/src/lib/analiza/smsr.ts` (progi z rozporządzenia MRiRW z 11.04.2019) | Treść urzędowa (progi z rozporządzenia) | „Progi: IUNG-PIB SMSR” | – |
| ISRIC SoilGrids 2.0 (`rest.isric.org`) | silnik: piasek, glina, SOC → pojemność wodna | **CC BY 4.0**. REST w wersji beta, fair use, bez SLA | „SoilGrids 2.0, ISRIC – World Soil Information, CC BY 4.0” | Cache per działka |
| ISOK, PGW Wody Polskie | link w raporcie. Warstwa na `/mapa` to **przybliżenie 80 m, nie ISOK** | Informacja sektora publicznego | „Mapy zagrożenia powodziowego: PGW Wody Polskie, ISOK” | Do podłączenia |
| Google Map Tiles API | `/api/tiles/google/**` (proxy, opcjonalne) | **Płatne**, warunki Google Maps Platform (logo, atrybucja dynamiczna, zakaz cache). Klucza i umowy nie da się przenieść | logo Google + atrybucja | **Wyłączone w wersji dla jury** (brak `GOOGLE_MAPS_API_KEY` = trasa nieaktywna). KOWR potrzebuje własnej umowy |
| Anthropic API (Claude) | `/api/traktor/explain` (karta zastawki): opcjonalne przeredagowanie opisu | **Płatne**, Commercial Terms (wyniki należą do klienta). Klucz zespołu, nieprzenoszalny | „Opis przeredagowany przez model AI. Liczby z reguł.” | **Domyślnie wyłączone** (brak `ANTHROPIC_API_KEY` = tekst z szablonu). Wysyłamy tylko wskaźniki, bez danych osobowych |

## 3. Usługi płatne lub z ograniczeniem komercyjnym: koszty i alternatywy (pkt 5.4)

| Usługa | Status w zgłoszeniu | Koszt przy użyciu | Alternatywa bez opłat licencyjnych |
|---|---|---|---|
| Google Map Tiles | wyłączona | wg cennika Google Maps Platform (płatność za sesje/kafle, sprawdzić) | Ortofotomapa GUGiK WMTS (już domyślna) |
| Anthropic API | wyłączone domyślnie | wg cennika za tokeny (ułamki grosza na opis, sprawdzić) | Szablon deterministyczny (już domyślny) |
| Open-Meteo w produkcji | darmowe API wystarcza na demo (niekomercyjne) | plan komercyjny wg cennika Open-Meteo (sprawdzić) | Własna instancja Open-Meteo (AGPL, osobna usługa), NASA POWER, IMGW-PIB |
| EOX s2cloudless (hostowane kafle) | rocznik 2016, CC BY | umowa z EOX przy użyciu komercyjnym | Usunąć warstwę. Ortofotomapa GUGiK |
| Kafle OSM, Nominatim | demo w granicach polityki | – (zakaz dużego ruchu) | Własny serwer kafli / Nominatim albo GUGiK (WMTS, UUG) |

## 4. Kroje pisma

| Krój | Licencja | Uwagi |
|---|---|---|
| Archivo (oś `wdth`), Inter | SIL Open Font License 1.1 | `next/font/google` pobiera pliki przy budowaniu i serwuje je z naszej domeny. W czasie działania nie ma wywołań do Google |

## 5. Narzędzia AI (pkt 4.2.6, § 2 ust. 10)

| Narzędzie | Do czego | Warunki |
|---|---|---|
| Claude (Anthropic) przez OpenCode, asystent programowania | pisanie i przegląd kodu, dokumentacji, slajdów; przeglądy w `docs/review/` | Warunki Anthropic przyznają wyniki użytkownikowi. Projekt, reguły, decyzje i weryfikacja: zespół |
| Claude przez Anthropic API, w aplikacji (opcjonalnie) | przeredagowanie gotowego opisu na prostszy język (karta `/karta`) | Domyślnie wyłączone. Strażnik liczb odrzuca tekst z liczbą spoza wyniku. Analiza w `/analiza` jest w pełni deterministyczna (`textSource: "template"`) |

Nie używamy wygenerowanych obrazów w aplikacji ani w prezentacji. Jeśli pojawią się w filmie, dopiszemy narzędzie i jego warunki.

## 6. Gdzie atrybucje są wyświetlane

1. Róg mapy: podkład aktywny (GUGiK, EOX 2016, OSM, BDOT10k).
2. Raport `/raport`: tabela źródeł z licencją, zakresem, statusem i czasem pobrania dla każdej pozycji.
3. `/metoda` i README: pełny rejestr.
4. Ten plik i `docs/THIRD_PARTY_NOTICES.md`: rejestr do przekazania KOWR.
