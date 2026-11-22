# Bezpieczeństwo i ochrona danych (TRAKTOR)

Stan na 2026-11-22, gałąź `v4/security` (od commita 609f638). Prototyp hackathonowy: zabezpieczenia na poziomie prototypu (pkt 5.6 regulaminu), bez kont i bez danych osobowych.

## 1. Gdzie trafiają dane? (krótko dla jury)
- Nie zbieramy danych osobowych. Brak kont, logowania, ciasteczek, analityki, pikseli śledzących.
- Usługi zewnętrzne dostają tylko: **współrzędne** (punkt, środek działki, prostokąt wokół działki), **identyfikator działki ewidencyjnej** lub **nazwę miejscowości** wpisaną w wyszukiwarkę.
- Nie pytamy o właściciela działki ani o numer księgi wieczystej. ULDK zwraca tylko granicę, TERYT i nazwy jednostek.
- Zapisane raporty są wyłącznie w `localStorage` przeglądarki użytkownika (`components/raport/saved.ts`). Serwer ich nie zapisuje; użytkownik usuwa je sam.

## 2. Odbiorcy danych (żądania do usług zewnętrznych)

| Usługa | Kto wysyła | Co otrzymuje |
|---|---|---|
| ULDK (GUGiK) `uldk.gugik.gov.pl` | serwer | id działki albo punkt lon/lat |
| NMT (GUGiK) `services.gugik.gov.pl/nmt` | serwer | lista punktów w EPSG:2180 wewnątrz działki |
| GUGiK ortofotomapa (WMTS/WMS), KIEG `integracja.gugik.gov.pl` | przeglądarka | kafle mapy (z, x, y / bbox), IP i nagłówki przeglądarki |
| IUNG-PIB WCS `sgeo.iung.pl` | serwer | prostokąt ±500 m wokół działki (EPSG:2180) |
| ISRIC SoilGrids `rest.isric.org` | serwer | punkt (środek działki) |
| NASA POWER `power.larc.nasa.gov` | serwer | komórka siatki 0,1° (zaokrąglone współrzędne), zakres dat |
| Open-Meteo `api.open-meteo.com`, `archive-api.open-meteo.com` | serwer | komórka 0,1° albo stały punkt gminy demo |
| IMGW-PIB `danepubliczne.imgw.pl` | serwer | nic (pobieramy całą listę ostrzeżeń i filtrujemy lokalnie po TERYT) |
| Microsoft Planetary Computer, Earth Search (AWS) | serwer | prostokąt działki (WGS84), zakres dat; odczyty fragmentów plików COG |
| Overpass (OSM) `overpass-api.de`, `overpass.kumi.systems` | serwer | punkt i promień 1 km |
| Nominatim (OSM) `nominatim.openstreetmap.org` | **przeglądarka** | wpisana nazwa miejscowości, IP i nagłówki przeglądarki |
| Podkłady: OSM `tile.openstreetmap.org`, EOX `tiles.maps.eox.at` | przeglądarka | kafle mapy, IP i nagłówki przeglądarki |
| Google Map Tiles (opcjonalne, **wyłączone** bez klucza) | serwer | z/x/y kafla |
| Anthropic API (opcjonalne, **wyłączone** bez klucza) | serwer | tekst szablonu z danych demo; liczby zamaskowane, bez danych użytkownika |

Żądania z serwera wychodzą z adresu IP serwera, nie użytkownika. Żądania z przeglądarki (kafle, Nominatim) ujawniają danej usłudze IP użytkownika, jak każda mapa internetowa.

## 3. Notatka RODO
- **Dane osobowe:** aplikacja nie przetwarza danych osobowych w rozumieniu art. 4 pkt 1 RODO w swoich bazach, bo żadnych baz nie ma. Identyfikator działki i współrzędne nie wskazują osoby bez dostępu do rejestru właścicieli, którego nie używamy. Ostrożnie: w połączeniu z EGiB działka może wskazać właściciela, więc traktujemy ją jak dane wrażliwe biznesowo i nie logujemy jej.
- **Adres IP:** używany tylko w pamięci procesu do limitu zapytań (okno 60 s, maks. 5000 wpisów, bez zapisu na dysk). Podstawa: art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes: ochrona usługi przed nadużyciem).
- **Retencja:** brak trwałego przechowywania. Pamięć podręczna wyników (1 h, maks. 200 wpisów) zawiera tylko id działki, uprawę, datę i wynik, bez IP. Pamięć podręczna NASA POWER w katalogu tymczasowym systemu zawiera tylko dane pogodowe dla komórki siatki.
- **Logi:** serwer loguje tylko komunikat błędu silnika (`console.error("analiza failed", message)`), bez treści zapytań i bez IP. Logi platformy hostingowej (np. dostępowe) zależą od wdrożenia i należy je opisać przy wdrożeniu w KOWR.
- **Profilowanie, decyzje automatyczne:** brak. Wynik to szacunek z danych publicznych z dopiskiem „Wymaga wizji lokalnej”.
- **Przekazanie poza EOG:** serwer wysyła współrzędne do usług w USA (NASA POWER, Earth Search na AWS us-west-2) i do Anthropic (tylko gdy klucz włączony). To nie są dane osobowe.
- **Przy wdrożeniu w KOWR:** dodać stronę z informacją o przetwarzaniu (art. 13), rozważyć serwerowe proxy dla Nominatim i kafli, aby IP użytkownika nie trafiało do OSM.

## 4. Model zagrożeń
| Zagrożenie | Ryzyko | Co robimy |
|---|---|---|
| Wyciek klucza API | niskie | klucze tylko w `process.env` na serwerze, brak `NEXT_PUBLIC_*`, `.env*` w `.gitignore`, wersja dla jury bez kluczy |
| Nadużycie kosztownych tras (DoS, wyczerpanie limitów usług publicznych) | średnie | `/api/analiza` 30/min/IP, `/api/dzialka` 60/min/IP, maks. 4 analizy naraz, kolejka 4 s, cache 1 h, limit treści 4 KB |
| Wstrzyknięcie do zapytań upstream (SSRF, query injection) | niskie | stałe hosty, `encodeURIComponent`, walidacja id działki (regex, ≤ 80 znaków), współrzędne tylko w granicach Polski, uprawa z listy, data w oknie 10 lat |
| XSS | niskie | React escapuje tekst; brak `dangerouslySetInnerHTML`, `eval`; CSP |
| Clickjacking | niskie | `frame-ancestors 'none'`, `X-Frame-Options: DENY` |
| Wstrzyknięcie promptu do LLM | niskie | prompt tylko z danych serwera, strażnik liczb; trasa domyślnie wyłączona |

## 5. Nagłówki bezpieczeństwa (`web/next.config.ts`)
- `Content-Security-Policy`: `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (bez `'unsafe-eval'` w produkcji, tylko w dev); `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`; `connect-src 'self' https:`; `img-src 'self' data: blob: https:`.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`.
- **Brak HSTS** (`Strict-Transport-Security`) w konfiguracji. Na Vercel HSTS dodaje platforma; przy innym hostingu dodać `max-age=63072000; includeSubDomains`.
- Świadomie szerokie: `'unsafe-inline'` w skryptach (Next bez nonce) i `https:` w `connect-src`/`img-src` (wiele źródeł kafli). Do zawężenia przy wdrożeniu.

## 6. Limity zapytań: stan tras bez uwierzytelnienia
| Trasa | Koszt | Limit |
|---|---|---|
| `GET/POST /api/analiza` | wysoki (8+ usług) | **tak**: 30/min/IP, 4 równolegle, cache |
| `GET /api/dzialka` | średni (ULDK) | **tak**: 60/min/IP |
| `GET /api/tiles/google/**` | płatny (gdy klucz) | **nie**; tylko blokada `Sec-Fetch-Site: cross-site` i zakres z/x/y. Bez klucza zwraca 404 |
| `GET /api/tiles/google/status` | płatny (gdy klucz) | nie |
| `POST /api/traktor/explain` | płatny (gdy klucz) | **nie**; żaden ekran jej nie wywołuje |
| `GET /api/traktor/conditions`, `POST /api/traktor/order` | niski (Open-Meteo, IMGW) | nie (tylko `s-maxage`) |
| `/api/traktor/parcel`, `/scenario/*`, `/api/health` | znikomy (dane lokalne) | nie potrzeba |

Limit jest w pamięci procesu: na hostingu bezserwerowym działa per instancja. IP pobierane z `X-Forwarded-For` (zaufane tylko za proxy platformy).

## 7. Czego świadomie nie robimy
- Brak kont i uwierzytelniania (prototyp publiczny, dane publiczne).
- Brak WAF i rozproszonego limitu (Redis) — do wdrożenia produkcyjnego.
- Brak serwerowego proxy dla Nominatim i kafli mapy.
- Brak pobierania danych właścicieli działek (KW, EGiB z danymi osobowymi).

## 8. Wyniki audytu (2026-11-22)
- `npm audit --omit=dev`: **0 podatności** (53 zależności produkcyjne). Zależności: next 16.4.6, react 19.3.0, maplibre-gl, geotiff.
- Skan sekretów (wzorce `AIza…`, `sk-ant-`, `sk-…`, przypisania `*_API_KEY=` z wartością) w drzewie i całej historii git: **brak kluczy**. Jedyne trafienia w historii to opisy wzorców w `docs/review/02-security.md` i `docs/review/08-repo-infra.md` (commit 5dc4e41), bez wartości.
- Śledzony plik env: tylko `web/.env.example` z pustymi wartościami. `.env*` w `.gitignore` (root i `web/`).
- Żaden klucz nie jest wymagany do `/analiza`, `/raport`, `/mapa`, `/karta`.

### Otwarte punkty dla zespołu
1. **Średnie:** `/api/traktor/explain` i proxy Google bez limitu zapytań. Bezpieczne, dopóki `ANTHROPIC_API_KEY` i `GOOGLE_MAPS_API_KEY` są puste na produkcji. Przed włączeniem kluczy: usunąć trasę `explain` lub dodać `rateLimited()`; dla Google ustawić dzienny limit w Google Cloud.
2. **Niskie:** brak HSTS w `next.config.ts` (sprawdzić na hostingu).
3. **Niskie:** Nominatim i kafle wywoływane z przeglądarki (IP użytkownika trafia do OSM/GUGiK/EOX). Opisane w interfejsie przy wyszukiwarce.
4. **Niskie:** `/api/tiles/google/status` zwraca treść błędu upstream (`String(e)`), bez sekretów.

## 9. Zgłaszanie podatności
Nie publikuj szczegółów w otwartym issue. Napisz prywatnie do zespołu TRAKTOR (kontakt w zgłoszeniu hackathonowym) albo użyj „Report a vulnerability” na GitHubie. Podaj trasę, kroki odtworzenia i spodziewany skutek. Potwierdzamy w ciągu 72 h.
