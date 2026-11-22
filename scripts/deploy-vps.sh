#!/usr/bin/env bash
# TRAKTOR — wdrożenie na zwykły VPS (Linux + systemd + Caddy/nginx).
#
# Użycie (z katalogu głównego repozytorium):
#   ./scripts/deploy-vps.sh                 # bramka: build lokalny, wysyłka, build na serwerze, restart, health check
#   ./scripts/deploy-vps.sh --skip-build    # pomiń lokalny build (tylko dokumentacja / szybka poprawka konfiguracji)
#   ./scripts/deploy-vps.sh rollback        # wróć do poprzedniego wydania
#   ./scripts/deploy-vps.sh status          # stan usługi
#   ./scripts/deploy-vps.sh logs            # ostatnie 100 linii journala
#
# Konfiguracja przez zmienne środowiskowe:
#   TRAKTOR_TARGET=deploy@twoj-serwer.pl   (wymagane)
#   TRAKTOR_ROOT=/srv/traktor              katalog wydań na serwerze
#   TRAKTOR_URL=https://traktor.example.pl publiczny adres do health checku
#   TRAKTOR_KEEP=2                         ile wydań trzymać (2 = bieżące + poprzednie do rollbacku)
#
# Wymagania po stronie serwera: Node 22 LTS, npm, git tar, curl, sudo dla `systemctl restart traktor`.
# Szczegóły i pierwsze wdrożenie: docs/DEPLOY-VPS.md.
#
# Dlaczego build idzie też na serwerze: node_modules z Windows/macOS zawiera binaria SWC
# (@next/swc-*) w wersji dla swojego systemu. Kopia na Linuksa nie zadziała. Dlatego
# lokalny build jest tylko bramką (czy kod się kompiluje), a artefakt produkcyjny powstaje
# na serwerze z `npm ci && npm run build`. Wysyłamy źródła z `git archive` — bez node_modules.

set -euo pipefail

TARGET="${TRAKTOR_TARGET:-}"
REMOTE_ROOT="${TRAKTOR_ROOT:-/srv/traktor}"
PUBLIC_URL="${TRAKTOR_URL:-}"
KEEP="${TRAKTOR_KEEP:-2}"
HEALTH_PATH="/api/health"

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

# --- tryb zdalny (wywoływany na serwerze przez bootstrap) ---------------------
# args: --remote <stamp> <root> <keep> <sha>
remote_mode() {
  local stamp="$1" root="$2" keep="$3" sha="$4"
  local rel="$root/releases/$stamp"

  [ -d "$rel/web" ] || die "brak katalogu wydania: $rel/web"

  log "build na serwerze: $rel/web"
  cd "$rel/web"
  # Pełne npm ci: build Next.js potrzebuje devDependencies (typescript, tailwind).
  npm ci --no-audit --no-fund
  npm run build

  # /api/health zwraca to jako `sha` (domyślnie "local").
  if [ -f /etc/traktor/traktor.env ]; then
    if sudo sed -i "s/^VERCEL_GIT_COMMIT_SHA=.*/VERCEL_GIT_COMMIT_SHA=$sha/" /etc/traktor/traktor.env; then
      log "VERCEL_GIT_COMMIT_SHA=$sha zapisane w /etc/traktor/traktor.env"
    else
      warn "nie udało się zapisać SHA w /etc/traktor/traktor.env (health pokaże poprzednią wartość)"
    fi
  else
    warn "brak /etc/traktor/traktor.env — usługa użyje wartości domyślnych"
  fi

  log "przełączam /srv/traktor/current na $stamp"
  ln -sfn "$rel" "$root/.current.new"
  # mv -T podmienia dowiązanie atomowo; fallback dla systemów bez mv -T.
  mv -Tf "$root/.current.new" "$root/current" 2>/dev/null || {
    rm -f "$root/current"
    ln -sfn "$rel" "$root/current"
  }

  log "restart usługi traktor"
  sudo systemctl restart traktor

  log "health check (127.0.0.1:3000$HEALTH_PATH)"
  if ! wait_health "http://127.0.0.1:3000$HEALTH_PATH" 20; then
    warn "usługa nie odpowiedziała w 40 s. Sprawdź: journalctl -u traktor -n 80 --no-pager"
    warn "Rollback: ./scripts/deploy-vps.sh rollback (albo na serwerze: $root/current -> poprzednie wydanie)"
    exit 1
  fi
  log "aplikacja odpowiada"

  prune_releases "$root" "$keep"
  log "wdrożone wydanie: $stamp"
}

wait_health() {
  local url="$1" tries="${2:-20}" i
  for i in $(seq 1 "$tries"); do
    if curl -fsS --max-time 10 "$url" >/dev/null 2>&1; then
      curl -fsS --max-time 10 "$url" || true
      printf '\n'
      return 0
    fi
    sleep 2
  done
  return 1
}

prune_releases() {
  local root="$1" keep="$2" current old
  current="$(readlink -f "$root/current" 2>/dev/null || true)"
  ls -1d "$root"/releases/*/ 2>/dev/null | sort -r | tail -n +"$((keep + 1))" | while read -r old; do
    old="${old%/}"
    # Zabezpieczenie: usuwamy tylko katalogi wewnątrz releases/ i nigdy bieżącego wydania.
    case "$old" in
      "$root"/releases/*) ;;
      *) warn "pomijam nieoczekiwaną ścieżkę: $old"; continue ;;
    esac
    [ "$old" = "$current" ] && continue
    log "usuwam stare wydanie: $old"
    rm -rf -- "$old"
  done
}

# --- strona lokalna ----------------------------------------------------------
local_gate() {
  local skip="$1"
  [ -d web ] || die "uruchom z katalogu głównego repozytorium (brak web/)"
  if [ "$skip" = "1" ]; then
    warn "pomijam lokalny build (--skip-build)"
    return 0
  fi
  log "bramka lokalna: npm ci (jeśli brak node_modules) + npm run build"
  ( cd web
    [ -d node_modules ] || npm ci --no-audit --no-fund
    npm run build
  ) || die "lokalny build nie przeszedł — nie wdrażam"
}

push_and_deploy() {
  local sha stamp bundle
  sha="$(git rev-parse --short=12 HEAD)"
  stamp="$(date -u +%Y%m%d-%H%M%S)-$sha"
  bundle="$(mktemp "${TMPDIR:-/tmp}/traktor-$stamp.XXXXXX.tar.gz")"

  log "pakuję źródła z commita $sha (git archive — bez node_modules, .next i .env*)"
  git archive --format=tar.gz --prefix="" -o "$bundle" HEAD

  log "wysyłam paczkę na $TARGET:$REMOTE_ROOT"
  ssh "$TARGET" "mkdir -p '$REMOTE_ROOT/releases'"
  ssh "$TARGET" "cat > '$REMOTE_ROOT/incoming-$stamp.tar.gz'" < "$bundle"
  rm -f "$bundle"

  log "rozpakowuję i buduję na serwerze (może potrwać 2–4 min)"
  ssh "$TARGET" bash -s -- "$stamp" "$REMOTE_ROOT" "$KEEP" "$sha" <<'BOOTSTRAP'
set -euo pipefail
STAMP="$1"; ROOT="$2"; KEEP="$3"; SHA="$4"
REL="$ROOT/releases/$STAMP"
mkdir -p "$REL"
tar -xzf "$ROOT/incoming-$STAMP.tar.gz" -C "$REL"
rm -f "$ROOT/incoming-$STAMP.tar.gz"
# Dalej robi już skrypt z tego wydania — jedno źródło prawdy dla logiki zdalnej.
exec bash "$REL/scripts/deploy-vps.sh" --remote "$STAMP" "$ROOT" "$KEEP" "$SHA"
BOOTSTRAP

  if [ -n "$PUBLIC_URL" ]; then
    log "health check publiczny: $PUBLIC_URL$HEALTH_PATH"
    if wait_health "$PUBLIC_URL$HEALTH_PATH" 5; then
      log "publiczny adres odpowiada"
    else
      warn "publiczny adres nie odpowiedział — sprawdź DNS, TLS i proxy (Caddy/nginx)"
    fi
  fi

  log "gotowe. Rollback: ./scripts/deploy-vps.sh rollback"
}

do_rollback() {
  log "rollback na $TARGET"
  ssh "$TARGET" bash -s -- "$REMOTE_ROOT" <<'ROLLBACK'
set -euo pipefail
ROOT="$1"
current="$(readlink -f "$ROOT/current")"
prev="$(ls -1d "$ROOT"/releases/*/ 2>/dev/null | sed 's:/$::' | sort -r | grep -vx "$current" | head -n 1 || true)"
if [ -z "$prev" ]; then
  echo "[x] brak poprzedniego wydania w $ROOT/releases (trzymamy tylko TRAKTOR_KEEP wydań)" >&2
  exit 1
fi
echo "==> $current -> $prev"
ln -sfn "$prev" "$ROOT/.current.new"
mv -Tf "$ROOT/.current.new" "$ROOT/current" 2>/dev/null || { rm -f "$ROOT/current"; ln -sfn "$prev" "$ROOT/current"; }
sudo systemctl restart traktor
for i in $(seq 1 20); do
  if curl -fsS --max-time 10 "http://127.0.0.1:3000/api/health" >/dev/null 2>&1; then
    curl -fsS --max-time 10 "http://127.0.0.1:3000/api/health"; echo
    echo "==> rollback OK: $(basename "$prev")"
    exit 0
  fi
  sleep 2
done
echo "[x] po rollbacku usługa nie odpowiada — journalctl -u traktor -n 80 --no-pager" >&2
exit 1
ROLLBACK
}

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
}

# --- wejście ----------------------------------------------------------------
case "${1:-deploy}" in
  --remote)
    shift
    [ $# -ge 4 ] || die "tryb --remote wymaga 4 argumentów"
    remote_mode "$1" "$2" "$3" "$4"
    ;;
  deploy)
    skip=0
    [ "${2:-}" = "--skip-build" ] && skip=1
    [ -n "$TARGET" ] || die "ustaw TRAKTOR_TARGET=user@host (albo użyj: TRAKTOR_TARGET=... ./scripts/deploy-vps.sh)"
    command -v git >/dev/null || die "brak git"
    command -v ssh >/dev/null || die "brak ssh"
    command -v curl >/dev/null || die "brak curl"
    local_gate "$skip"
    push_and_deploy
    ;;
  rollback)
    [ -n "$TARGET" ] || die "ustaw TRAKTOR_TARGET=user@host"
    do_rollback
    ;;
  status)
    [ -n "$TARGET" ] || die "ustaw TRAKTOR_TARGET=user@host"
    ssh "$TARGET" "systemctl status traktor --no-pager | head -n 20; echo; readlink -f $REMOTE_ROOT/current; ls -1d $REMOTE_ROOT/releases/*/"
    ;;
  logs)
    [ -n "$TARGET" ] || die "ustaw TRAKTOR_TARGET=user@host"
    ssh "$TARGET" "journalctl -u traktor -n 100 --no-pager"
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    die "nieznane polecenie: $1 (deploy | rollback | status | logs)"
    ;;
esac
