# TRAKTOR w kontenerze (Docker)

Obraz budujemy z `Dockerfile` w katalogu głównym repo. Ma trzy etapy: `deps` → `builder` → `runner`. Bazą jest `node:22-bookworm-slim`, a do obrazu trafia tylko wynik `output: "standalone"` z `web/next.config.ts` oraz `.next/static` i `public`. Proces działa jako użytkownik bez uprawnień roota (`nextjs`, uid 1001), a telemetria Next.js jest wyłączona.

> Stan weryfikacji (22.11.2026): `npm run build` z `output: "standalone"` przechodzi lokalnie. Powstaje `.next/standalone` o rozmiarze ok. 26 MB, do tego `static` ok. 9 MB i `public` ok. 2,3 MB. **Samego obrazu nie budowaliśmy**, bo na maszynie roboczej nie ma Dockera. Dockerfile sprawdziliśmy tylko przez lekturę. Pierwsze zbudowanie obrazu na maszynie z Dockerem jest otwartym zadaniem.

## Wymagania

- Docker Engine 24+ albo Docker Desktop (Windows, macOS) z Compose v2.
- **Internet przy budowaniu.** `npm ci` pobiera pakiety, a `next/font` w czasie `npm run build` pobiera kroje Archivo i Inter. Bez sieci build się nie uda.
- **Internet w czasie działania.** Wszystkie dane są pobierane na żywo: ULDK, NASA POWER, Open-Meteo, IMGW, Sentinel-2, IUNG, SoilGrids, NMT i Overpass.

## Budowanie i uruchomienie

```powershell
# Windows (skrypty w repo)
powershell -File scripts/docker-build.ps1          # obraz traktor:local, tag sha = git rev-parse --short HEAD
powershell -File scripts/docker-run.ps1            # http://localhost:3031/analiza
powershell -File scripts/docker-run.ps1 -Port 8080 # inny port hosta

# albo Compose
docker compose up -d --build
docker compose ps

# albo ręcznie
docker build -t traktor:local .
docker run -d --name traktor-app --init -p 3031:3000 traktor:local
```

Kontekst budowania to katalog główny repo. `.dockerignore` odcina `docs/`, `research/`, `deliverables/`, `node_modules`, `.next` i wszystkie pliki `.env*`.

## Zmienne środowiskowe

Żadna nie jest wymagana. Sekrety nie są wkładane do obrazu i podaje się je przy uruchomieniu (`-e` albo zmienne powłoki dla Compose). Wzór nazw jest w `web/.env.example`.

| Zmienna | Domyślnie | Do czego |
|---|---|---|
| `PORT` / `HOSTNAME` | `3000` / `0.0.0.0` | adres serwera w kontenerze |
| `VERCEL_GIT_COMMIT_SHA` | `local` | pole `sha` w `/api/health` (skrypty i Compose podają skrót commita) |
| `ANTHROPIC_API_KEY` | puste | opcjonalne przeredagowanie opisów (`/api/traktor/explain`). Puste = szablon |
| `GOOGLE_MAPS_API_KEY` | puste | opcjonalne podkłady Google na `/mapa`. Usługa płatna, **wyłączona w wersji dla jury** |

```powershell
$env:ANTHROPIC_API_KEY = "..."; docker compose up -d   # wartość tylko w powłoce, nie w repo
```

## Healthcheck, logi, aktualizacja

- `HEALTHCHECK` co 30 s wywołuje `GET /api/health`. Używa `fetch` z Node, bo w obrazie slim nie ma curl. Odpowiedź ma postać `{ ok, sha, demo: true, time }`. Stan sprawdzisz poleceniem `docker ps` (kolumna STATUS) albo `docker inspect --format '{{.State.Health.Status}}' traktor-app`.
- Logi: `docker logs -f traktor-app` albo `docker compose logs -f app`.
- Aktualizacja: `git pull`, potem `docker compose up -d --build`. Albo `scripts/docker-build.ps1` i `scripts/docker-run.ps1`, który usuwa stary kontener o tej samej nazwie.
- Oczekiwany rozmiar obrazu: obraz bazowy `node:22-bookworm-slim` ma ok. 200 MB, a aplikacja dodaje ok. 40 MB. **To szacunek, nie pomiar.** Do sprawdzenia poleceniem `docker images traktor`.

## Znane ograniczenia

- **Analiza trwa do ok. 30 s** (budżet 24 s, `maxDuration = 30`). Proxy przed kontenerem musi mieć limit czasu odczytu ≥ 60 s. `stop_grace_period: 40s` pozwala dokończyć żądania w toku.
- **Cache i limity są w pamięci jednego kontenera**: wynik 1 h, maks. 200 wyników, 30 analiz/min/IP, maks. 4 analizy naraz. Restart je czyści. Cache NASA POWER leży w `/tmp` kontenera i znika razem z kontenerem.
- **Jeden proces Node na kontener.** Nie ma klastra ani workerów.
- Limit na IP czyta `X-Forwarded-For`. Bez proxy wszyscy użytkownicy za NAT mają jeden wspólny limit. Za proxy nagłówek musi ustawiać proxy, a nie klient.
- Darmowe API Open-Meteo jest niekomercyjne i ma dzienny limit na IP. Wszystkie kontenery za jednym IP wyjściowym dzielą ten limit.

## Skalowanie za proxy

1. Uruchom N kontenerów `app` (np. `docker compose up -d --scale app=3`). Najpierw usuń `container_name` i sztywne `ports`, a ruch wpuszczaj przez proxy.
2. Przed nimi postaw odwrotną proxy, np. Caddy (zakomentowany szablon jest w `docker-compose.yml`). Ustaw w niej TLS, `X-Forwarded-For` i limit czasu ≥ 60 s. Statyki `/_next/static/*` można cache'ować długo, bo są niezmienne.
3. Licz się z tym, że każda instancja ma osobny cache i osobne limity. Przy kilku instancjach sesje przyklejone (sticky) po IP poprawią trafienia w cache. Wspólny magazyn (Redis) jest w planie, ale jeszcze nie ma go w kodzie.
