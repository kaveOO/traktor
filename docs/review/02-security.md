# 02 · Security review (read-only), 2026-11-22

Scope: `main` (web/) plus the lane worktrees `traktor-wt2/{engine,ui,report,satellite,docs}`. Brief 5.6 asks for basic, prototype-level security and no personal data. **Overall: acceptable for a prototype. No secrets leaked and no critical holes.** The real gaps are missing security headers, no abuse limits on routes that cost money or call upstream services, and validation that the upcoming `/api/analiza` and `/api/dzialka` routes still need.

## Secrets: verified clean
- `git log --all -S AIza`, `-G "AIza[0-9A-Za-z_-]{20}"`, `-S sk-ant` and `-G "sk-ant-…"` find no commits on any branch.
- A grep of the repo and every worktree for `AIza…` / `sk-ant-` finds nothing. The Google key from chat is **not in any file or commit**.
- `git ls-files` lists no tracked `.env*` file. `web/.gitignore` has `.env*` and root `.gitignore` has `.env`, `.env.local`, `.env.*.local`.
- `web/.env.example` holds only the key names `ANTHROPIC_API_KEY` and `GOOGLE_MAPS_API_KEY`, and neither value looks like a real key. I could not inspect `web/.env.local`: the safety hook blocks it, as intended.
- Keys are read only server-side (`process.env` in `api/tiles/google/_session.ts:9` and `api/traktor/explain/route.ts:20`). There is no `NEXT_PUBLIC_*` anywhere, and the key never appears in a response.
- `npm audit --omit=dev` (web/): **0 vulnerabilities**. Runtime deps are next 16.4.6, react 19.3, maplibre-gl, geotiff.

## HIGH
None.

## MEDIUM
**M1. No security headers.** `web/next.config.ts` has no `headers()` and there is no `proxy.ts`. Add this, then check `/mapa` in dev, because MapLibre needs `blob:` workers and `img-src https:` for the tiles:
```ts
async headers() {
  const csp = ["default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:", "worker-src 'self' blob:", "font-src 'self' data:",
    "connect-src 'self' https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org",
    "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"].join("; ");
  return [{ source: "/:path*", headers: [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  ]}];
},
```
(Dev mode needs `'unsafe-eval'` in `script-src`. Add it only when `NODE_ENV !== "production"`.)

**M2. The Google tile proxy is an open relay that spends your quota.** `api/tiles/google/[type]/[z]/[x]/[y]/route.ts:10` accepts any digits. SSRF is not possible because the host is fixed, but anyone can script requests against the key. Fix: bound the tile coordinates, reject foreign `Referer`/`Sec-Fetch-Site`, and set a daily cap plus API restriction (Map Tiles only) in Google Cloud.
```ts
const [Z, X, Y] = [z, x, y].map(Number);
if (Z > 22 || X >= 2 ** Z || Y >= 2 ** Z) return Response.json({ error: "bad tile" }, { status: 400 });
if (req.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403 });
```
`_session.ts:11` can also start several `createSession` calls at once on a cold cache. Cache the in-flight Promise, not only the result.

**M3. No cost or DoS limits on paid or slow routes.**
- `POST /api/traktor/explain` calls Anthropic on every request with no cache and no rate limit (`explain/route.ts:20-23`). The template has only a few inputs (site × crest × scenario), so cache the LLM text in a `Map` keyed by `siteId|crestCm|scenario`.
- `liveConditions()` (`_lib/conditions.ts:84`) fetches 3–4 upstream URLs with `cache:"no-store"`, and `/order` and `/explain` call it on every POST. `s-maxage` on GET `/conditions` only helps behind a CDN. Memoise it for about 10 minutes in module scope.
- The planned `/api/analiza` fans out to ULDK, Open-Meteo, IMGW and STAC, and runs up to 1 + 5×3 Sentinel scenes with 4 COG range reads each (`satellite.ts:268-283`, 15 s budget). The skill already says "cache by (parcel, crop, date)". Also add a simple per-IP token bucket (e.g. 10 analyses/min) and a global concurrency cap:
```ts
const hits = new Map<string, { n: number; t: number }>();
export function limited(req: Request, max = 10, winMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const h = hits.get(ip); const now = Date.now();
  if (!h || now - h.t > winMs) { hits.set(ip, { n: 1, t: now }); return false; }
  return ++h.n > max;
}
```

**M4. Input checks for the upcoming `/api/dzialka` and `/api/analiza` (engine lane).**
- `uldk.ts:89-90` uses `encodeURIComponent(id)`, which is good: there is no query or WKT injection and the host is fixed. But `getParcelById` never calls `looksLikeParcelId` itself. The route **must** reject bad input before calling it (length ≤ 80, the regex at `uldk.ts:25`).
- `uldk.ts:112` interpolates `lon,lat` raw. The route must parse them with `Number()` and require `Number.isFinite` before calling. `inPoland` rejects `NaN` but would not catch a string that someone passes through without parsing.
- Validate `crop` against `CROPS` and `date` against `/^\d{4}-\d{2}-\d{2}$/` within today−10y..today. Any value that reaches a URL must be validated first.
- Cap parcel size from ULDK, e.g. refuse `areaHa > 500` and vertices > 5 000. Road and forest parcels can span kilometres. That inflates the Sentinel window reads (`satellite.ts:101-113`, `148`) and `Math.min(...xs)` (`geo.ts:159`), which can blow the stack on huge rings.
- `satellite.ts:102` `fromUrl(href)` follows asset hrefs from the STAC response. Those hrefs come from upstream, not the user, so the risk is low. Still, pin them: `new URL(href).hostname.endsWith(".amazonaws.com")`.

## LOW
- **L1. Error leakage.** `tiles/google/status/route.ts:12` returns `String(e)` (e.g. `createSession 403`) to the client. It's harmless but not needed, so return `{enabled:false}` and log on the server. The other routes return generic Polish messages, which is good.
- **L2. Unbounded bodies.** `readBody` (`_lib/util.ts:16`) has no size cap, and `/order` accepts any size `siteIds` array and echoes caller `sources`/`labelPl` (`order/route.ts:25,31`). Reject `content-length > 32 KB` and slice `siteIds` to 200.
- **L3. Reflected input.** `parcel/route.ts:11` and the ULDK "not found" message (`uldk.ts:97`) echo the query. It's JSON, and React escapes text, so there is no XSS today. Keep it that way: never move these strings into `dangerouslySetInnerHTML` or MapLibre `setHTML`.
- **L4. Nominatim is called from the browser** (`ui/components/analiza/api.ts:69`). The user's place query and IP go straight to OSM, the 1 req/s limit exists only per tab, and the OSM policy wants an identifying app. Proxy it server-side with a generic UA and a shared rate limit, or name it in the privacy note. Then drop it from CSP `connect-src`.
- **L5. Tile cache header.** The proxy forces `public, max-age=86400` (`[y]/route.ts:21`). Pass through Google's own `Cache-Control` so you stay within Map Tiles ToS.
- **L6. `.env.example` is gitignored.** `web/.gitignore` `.env*` also matches it, so the template is never committed. Add `!.env.example`.
- **L7. CORS:** there are no `Access-Control-*` headers, so the API is same-origin only by default. That's correct; keep it.

## Verified OK
- No `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` in main or any worktree. The one `target="_blank"` link has `rel="noreferrer"`.
- No `localStorage`/`sessionStorage` use, so nothing about the user is stored.
- **Personal data:** ULDK returns parcel ids and geometry only, with no owner names, which fits brief 5.6. The app has no accounts or cookies and logs no PII. Don't add owner lookups (KW numbers) and don't log full request bodies.
- The LLM path masks numbers and checks them on return (`_lib/explain.ts:30-72`). The prompt is built only from server-side fixtures, never from user text, so there is no prompt injection from the client.
- Open-Meteo and IMGW URLs are built from constants (`_lib/conditions.ts:24,47,63`), so there's no user input in them.
- No Overpass queries exist in runtime code (only offline `scripts/geo`).
