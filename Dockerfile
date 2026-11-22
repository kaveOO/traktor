# syntax=docker/dockerfile:1
#
# TRAKTOR — obraz produkcyjny (Next.js 16, `output: "standalone"`).
#
# Kontekst budowania to KATALOG GŁÓWNY repozytorium, nie `web/`:
#   docker build -t traktor:local .
#
# Build wymaga internetu: `next/font` pobiera w czasie `npm run build` kroje Archivo i Inter.
# Uruchomienie też potrzebuje internetu (ULDK, NASA POWER, Open-Meteo, Sentinel-2, NMT, ...).
# Żadne sekrety nie są wkładane do obrazu — zmienne podaje się przy `docker run` / w compose.
#
# Instrukcja, ograniczenia i skalowanie: docs/DEPLOY-DOCKER.md

# ---------- 1. Zależności (cache warstwy: tylko manifesty) ----------
FROM node:22-bookworm-slim AS deps
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2. Build ----------
FROM node:22-bookworm-slim AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# .dockerignore wycina web/node_modules, web/.next i pliki .env*
COPY web/ ./
# Jedyny krok wymagający sieci: kompilacja + `next/font` (Google Fonts, self-hosted w buildzie).
RUN npm run build

# ---------- 3. Runner (tylko to, co potrzebne w runtime) ----------
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

# Użytkownik bez uprawnień roota (stały uid/gid = powtarzalne uprawnienia wolumenów).
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --home-dir /app --shell /usr/sbin/nologin nextjs

# `standalone` zawiera server.js + wyśledzone node_modules. Statyki i public kopiujemy ręcznie
# (Next ich nie dokleja — patrz docs: "Automatically Copying Traced Files").
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Healthcheck bez curl/wget (ich nie ma w bookworm-slim): Node 22 ma globalny `fetch`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'3000')+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Standalone `server.js` czyta PORT i HOSTNAME ze środowiska.
CMD ["node", "server.js"]
