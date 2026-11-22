# TRAKTOR: wdrożenie na VPS (Linux)

TRAKTOR to jeden proces Node (Next.js 16: strony i API). Analiza działki trwa 5–30 s, a cache i limity są w pamięci procesu. Dlatego uruchamiamy go jako **zwykły serwer Node**, nie jako funkcje serverless.

Pliki: `deploy/traktor.service` (systemd), `deploy/Caddyfile` (zalecany, automatyczny TLS), `deploy/nginx.conf` (wariant z certbotem), `deploy/traktor.env.example`, `scripts/deploy-vps.sh`.

> Konfiguracje sprawdziliśmy tylko przez przegląd i lokalny build (`npm run build`). Na prawdziwym serwerze jeszcze ich nie uruchamialiśmy. Przy pierwszym wdrożeniu zrób `caddy validate` / `nginx -t` i `systemd-analyze verify`.

## 1. Serwer

- **Minimum 2 vCPU / 2 GB RAM**, 20 GB dysku. Build Next.js zużywa ok. 1–1,5 GB RAM. Odczyt okien Sentinel-2 (`geotiff`) i obliczenia ET0 obciążają CPU, a kod przyjmuje maks. 4 analizy naraz.
- Zalecany wariant: 4 vCPU / 4–8 GB przy większym ruchu.
- System: Ubuntu 24.04 LTS albo Debian 12. **Node.js 22 LTS** (np. z NodeSource), `git`, `curl`.

Szacunkowy koszt miesięczny (**do potwierdzenia w aktualnych cennikach**, ceny netto, kurs ok. 4,3 zł/€):

| Dostawca | Plan | Szacunek |
|---|---|---|
| Hetzner Cloud | CX22 / CPX21 (2–3 vCPU, 4 GB) | ok. 20–40 zł |
| OVHcloud | VPS (2–4 vCore, 4–8 GB) | ok. 25–60 zł |

## 2. Przygotowanie (jednorazowo, jako root)

```bash
adduser --system --group --home /srv/traktor traktor
adduser deploy && usermod -aG traktor deploy          # konto do wdrożeń przez SSH (klucz)
install -d -o deploy -g traktor -m 0775 /srv/traktor /srv/traktor/releases
install -d -o root -g traktor -m 0750 /etc/traktor
install -o root -g traktor -m 0640 deploy/traktor.env.example /etc/traktor/traktor.env
cp deploy/traktor.service /etc/systemd/system/ && systemctl daemon-reload && systemctl enable traktor
# deploy może restartować usługę i zapisać SHA w env:
echo 'deploy ALL=(root) NOPASSWD: /bin/systemctl restart traktor, /usr/bin/systemctl restart traktor, /bin/sed -i * /etc/traktor/traktor.env, /usr/bin/sed -i * /etc/traktor/traktor.env' > /etc/sudoers.d/traktor
```

Usługa działa jako `traktor` (bez logowania), słucha tylko na `127.0.0.1:3000`. Pliki wydań należą do `deploy`, a usługa ma do nich zapis (`ReadWritePaths=/srv/traktor`, Next zapisuje cache w `.next/cache`).

**Firewall:** z zewnątrz otwarte tylko 22 (SSH, najlepiej tylko klucze), 80 i 443.

```bash
ufw default deny incoming && ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
```

## 3. DNS i TLS

1. Rekord **A** (i **AAAA** przy IPv6) domeny, np. `traktor.example.pl`, kieruje na IP serwera.
2. **Caddy (zalecany):** `apt install caddy`, skopiuj `deploy/Caddyfile` do `/etc/caddy/Caddyfile`, wpisz domenę i e-mail, `caddy validate --config /etc/caddy/Caddyfile`, `systemctl reload caddy`. Certyfikat Let's Encrypt Caddy pobiera i odnawia sam.
3. **nginx (wariant):** `deploy/nginx.conf` → `sites-available/traktor`, `nginx -t`, `certbot --nginx -d traktor.example.pl`. Konfiguracja ustawia: `proxy_read_timeout 90s`, `client_max_body_size 16k`, gzip (brotli po instalacji modułu), cache na rok dla `/_next/static/`, `no-store` dla `/api/`.

Nagłówki bezpieczeństwa (CSP itd.) ustawia aplikacja (`web/next.config.ts`). Proxy dodaje tylko HSTS.

## 4. Zmienne środowiskowe

Plik `/etc/traktor/traktor.env` (wzór: `deploy/traktor.env.example`, te same nazwy co `web/.env.example`). **Aplikacja działa bez żadnego klucza.**

| Zmienna | Znaczenie | Domyślnie |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | płatne podkłady Google na `/mapa` | puste → wyłączone (404) |
| `ANTHROPIC_API_KEY` | płatne przeredagowanie opisu (`/api/traktor/explain`) | puste → tekst z szablonu |
| `VERCEL_GIT_COMMIT_SHA` | pole `sha` w `/api/health` (ustawia skrypt wdrożenia) | `local` |

`NODE_ENV=production` i `PORT=3000` ustawia jednostka systemd.

## 5. Wdrożenie, aktualizacja, rollback

Z katalogu głównego repozytorium (Linux, macOS, WSL albo Git Bash):

```bash
export TRAKTOR_TARGET=deploy@traktor.example.pl
export TRAKTOR_URL=https://traktor.example.pl
./scripts/deploy-vps.sh            # build lokalny (bramka) → git archive HEAD → build na serwerze → przełączenie → restart → health check
./scripts/deploy-vps.sh rollback   # powrót do poprzedniego wydania
./scripts/deploy-vps.sh status     # stan usługi i lista wydań
./scripts/deploy-vps.sh logs       # ostatnie 100 linii logu
```

- Wydania leżą w `/srv/traktor/releases/<data>-<sha>`, a `/srv/traktor/current` to dowiązanie. Skrypt trzyma **2 ostatnie wydania** (`TRAKTOR_KEEP`).
- Build produkcyjny powstaje **na serwerze** (`npm ci && npm run build`), bo binaria SWC z Windows nie działają na Linuksie. Build wymaga internetu (`next/font`).
- Na serwer trafia tylko to, co jest w commicie (`git archive`): bez `node_modules`, `.next` i `.env*`. **Zmiany niezacommitowane nie są wdrażane.**
- Gdy health check nie przejdzie, skrypt kończy się błędem. Wtedy uruchom `rollback`.
- Wersja PowerShell (`scripts/deploy-vps.ps1`) jeszcze nie istnieje. Na Windows użyj Git Bash albo WSL.

## 6. Logi i monitorowanie

```bash
journalctl -u traktor -f                 # aplikacja
journalctl -u traktor --since "1 hour ago" -p warning
journalctl -u caddy -f                   # proxy (albo /var/log/nginx/traktor.*.log)
```

- Monitorowanie: zewnętrzny darmowy sprawdzacz (np. Uptime Kuma na innej maszynie) co 1–5 min na `https://<domena>/api/health`, oczekiwane `"ok":true`.
- Warto ograniczyć rozmiar journala: `SystemMaxUse=500M` w `/etc/systemd/journald.conf`.

## 7. Kopie zapasowe i cache

- **Serwer nie przechowuje danych osobowych ani raportów.** Raporty zapisują się w przeglądarce użytkownika. Backup = repozytorium git i plik `/etc/traktor/traktor.env` (klucze trzymaj w menedżerze haseł, nie w kopii na dysku publicznym).
- Cache wyników (1 h, maks. 200) i limity zapytań są **w pamięci procesu**: restart je czyści. Seria NASA POWER jest też w katalogu tymczasowym (`PrivateTmp`, czyszczony przy restarcie). Nie trzeba go archiwizować.
- Limity działają per IP. Za proxy aplikacja dostaje `X-Forwarded-For` (ustawia go Caddy i nginx). Przy kilku instancjach potrzebny wspólny magazyn (Redis). To plan, w kodzie jeszcze go nie ma.

## 8. Alternatywa: Railway / Render

Dostępne bez własnego serwera, ale tylko w trybie **usługi webowej Node (stały kontener)**, **nie** w trybie serverless/edge:

- Build: `cd web && npm ci && npm run build`. Start: `cd web && npx next start -p $PORT`. Health check: `/api/health`. Node 22 (`web/.nvmrc`, `engines`).
- Zmienne jak w pkt 4, ustawiane w panelu.
- **Uwaga na limity czasu żądań:** analiza trwa do ok. 30 s. Sprawdź w aktualnej dokumentacji dostawcy limit czasu żądania HTTP oraz to, czy darmowy plan usypia usługę (pierwsze żądanie po uśpieniu trwa dłużej i czyści cache w pamięci).
- Darmowe plany mają mało RAM (często 512 MB), a to może nie wystarczyć na build i równoległe analizy. Realnie potrzebny plan płatny z ok. 1–2 GB.
- Vercel i inne platformy serverless nie są zalecane: cache i limity w pamięci nie są tam współdzielone między wywołaniami.
