# Review 2 / 05: API layer (`/api/analiza`, `/api/dzialka`, helpers, legacy routes)

Reviewed on 2026-11-22 against HEAD 5833927. In 643c96e only `components/analiza/api.ts` changed: 6 lines, and the AMBIGUOUS gap below is still there.
- **Live test:** separate worktree, `npm ci` + `npm run build` (passed, Next 16.4.6), `next start -p 3021`, residential IP. Crop `pszenica_ozima` unless stated otherwise.
- Server stopped and worktree removed afterwards. No app code was changed.

## Live results

| Request | Status | ms | Key fields |
|---|---|---|---|
| Kraszyce `040706_5.0021.44`, today | 200 | 6052 | cur umiarkowane, hist niskie, KBW60 −12, IUNG III |
| Wyskoć `301103_2.0035.322/3`, today | 200 | 5866 | cur umiarkowane, IUNG II |
| Brodzica `060404_2.0142.AR_2.182` (AR_), today | 200 | 9106 | IUNG III (east of E 775030 now works), SoilGrids missing |
| Szastały `200303_2.0052.141/1`, today | 200 | 10799 | cur umiarkowane, IUNG III |
| Chotynia `140311_2.0002.30/3`, today | 200 | 5880 | IUNG I, hist **bardzo_wysokie**, 3/10 drought years |
| Głubczyce `160203_4.0100.156/4`, today | 200 | 8356 | IUNG IV, niskie |
| Kraszyce, 2018-07-20 | 200 | 7305 | cur **wysokie**, KBW60 −142 |
| Wyskoć, 2018-07-20 | 200 | 9041 | umiarkowane, KBW60 −153, SoilGrids missing |
| Brodzica, 2018-07-20 | 200 | 6341 | niskie, KBW60 −49 |
| Szastały, 2018-07-20 | 200 | 6534 | niskie, KBW60 −98 |
| Chotynia, 2018-07-20 | 200 | 5755 | cur **wysokie**, KBW60 −123 |
| Głubczyce, 2018-07-20 | 200 | 34 | X-Cache HIT, niskie, KBW60 −87 |
| `<script>` | 400 | 96 | `bad_parcel` |
| `306/2` (number only) | **404** | 3 | `parcel_not_found` with the "Sam numer nie wystarczy" text |
| `Kobylniki 1` | 409 | 1310 | `AMBIGUOUS`, 5 candidates (`/api/dzialka` gives the same) |
| Forest `040706_5.0020.3309/3` / `141703_2.0001.116` | 422 | 1199 / 729 | `NOT_AGRICULTURAL` (las 99 % / 100 %) |
| Built-up `321205_4.0009.16` | 422 | 638 | `NOT_AGRICULTURAL` (zabudowa 100 %) |
| Future 2026-11-23 / 11 years old 2015-07-20 | 400 / 400 | 6 / 6 | `bad_date` |
| Edge 2016-11-22 (exactly 10 y) | 200 | 5765 | accepted, Sentinel-2 missing |
| 2018-02-30 · numeric date (POST) | 400 · 400 | 8 · 3 | `bad_date` |
| Bad crop / no crop | 400 | 8 / 37 | `bad_crop` with the list of crops |
| lon/lat outside Poland / NaN | 400 | 18 | `bad_parcel` |
| lon/lat 18.25,52.65 | 200 | 6083 | resolves to Kraszyce |
| No type digit `040706.0021.44` | 200 | 6105 | resolves to `_5` |
| `Brodzica 182` (text) | 200 | 5803 | resolves, but a cache **miss** (see P2-1) |
| `…ar_2.182` lowercase / `322-3` dash | 200 | 30 / 54 | normalised, cache HIT |
| POST 20 kB / bad JSON / array | 413 / 400 / 400 | 23 / 8 / 6 | `too_large` / `bad_json` |
| POST valid (GET parity) / POST `lonLat:[…]` | 200 / 200 | 86 HIT / 5672 | same body as GET |
| `/api/dzialka` id AR_ / xy / xy outside / none | 200 / 200 / 400 / 400 | 608 / 562 / 4 / 4 | ok |
| 3 identical requests in parallel (in-flight dedupe) | 200 ×3 | ~6020 each | one computation |
| **8 different requests in parallel** | 200 ×4, **503 ×4** | 9.9–10.4 s / 4.7 s | `busy` |
| 35 requests from one IP (mostly cached) | 200 ×7, 429 ×28 | n/a | cache hits use up the limit |
| 35 requests with a **spoofed X-Forwarded-For** | 200 ×35 | n/a | limit bypassed |

- **Response size:** 7–12 kB.
- **Headers:** `Cache-Control: no-store` on all v2 responses; `X-Cache: HIT` on cache hits.
- **Error contract:** consistent. Every error has `{error, messagePl, step}`; AMBIGUOUS responses add `candidates`.

## What is right
- **Validation**
  - Strict date format: real-calendar check, Warsaw "today", future and older-than-10-years both rejected.
  - Crop whitelist; lon/lat limited by `inPoland`; 80-character limit and a character class on ids.
  - Body capped at 4 kB, checked against both the header and the actual length.
- **Id handling:** AR_ sheets, a missing gmina-type digit, `-` instead of `/` and lowercase `ar_` are all normalised (`uldk.ts:12-21`).
- **Status codes:** follow the contract. 400 validation, 404 not found, 409 AMBIGUOUS, 422 NOT_AGRICULTURAL or too large, 429, 502 upstream, 503 busy.
- **Caching and dedupe**
  - In-flight dedupe works.
  - The cache is bounded at 200 entries × ~10 kB ≈ 2 MB.
  - The rate-limit map is bounded at 5000 IPs.
  - The click-on-map result is also cached under its parcel id (`server.ts:117`).
- **Timing:** `maxDuration = 30` (analiza) and 20 (dzialka) are valid for Next 16 route segments. The engine budget is 24 s, plus up to 4 s waiting for a slot, so 28 s at most. Tight but consistent.

## MISSING / NOT READY

### P1 (fix before the jury)
1. **The concurrency limit is too tight** (`lib/analiza/server.ts:52`, `:111`).
   - The limit is 4 analyses at a time. The 5th waits only 4 s and then gets 503, but a fresh analysis takes 6–11 s.
   - Five judges pressing "Analizuj" at the same moment means one of them sees "Serwer liczy inne analizy".
   - Fix: `MAX_CONCURRENT = 10`. The work is I/O-bound and each upstream has its own timeout.
   - Add `Retry-After: 5` to the 503 response, and have `postAnalysis` retry once after a 503.
2. **AMBIGUOUS candidates never reach the UI** (`components/analiza/api.ts:16-18`).
   - `getJson` throws away everything except `messagePl`.
   - So "Kobylniki 1" shows "Wybierz właściwą z listy…" with **no list**.
   - Fix: return `{ ok:false, code, candidates }` from `fetchParcel`, and render the candidates as buttons. Each button calls `fetchParcel({id})`.
3. **Rate-limit key and budget** (`server.ts:57-66`).
   - **Spoofing:** the limiter trusts the first `X-Forwarded-For` value, so a spoofed header bypassed the limit 35 out of 35 times. Vercel overwrites XFF; plain `next start` or another proxy does not.
   - **Shared IP:** the whole jury hall shares one NAT IP. Cached hits also count, and the limit is 30 per minute per IP.
   - Fix: key on `x-vercel-forwarded-for`, then `x-real-ip`, then the **last** XFF hop. Do not count cache hits. Raise the limit to 60 per minute.
   - Add a `Retry-After: 60` header.

### P2
1. **Text ids miss the cache.** `Brodzica 182` and `Kraszyce 44` were a miss (8.5 s) although the full id was already cached.
   - `server.ts:117` creates the alias only for lonLat.
   - Fix: also create it when `r.parcel.id !== req.parcelId`.
2. **Crop is part of the whole cache key** (`server.ts:93`).
   - Changing the crop re-fetches ULDK, IUNG, SoilGrids, NMT, OSM and STAC. Only meteo has its own cache (`power.ts`).
   - Fix: a per-parcel-id cache for parcel, soil, terrain and satellite data.
3. **Degraded results are cached for 1 h** (`server.ts:116`). SoilGrids was missing in 2 of 12 runs.
   - Fix: use a 5-minute TTL when any source is `missing` or `partial` (ISOK and BDOT10k are always missing, so leave them out of this check).
4. **A bare number returns 404 `parcel_not_found`** (`uldk.ts:106-107`, `analyze.ts:79`).
   - Fix: return 400 with code `NEED_OBREB`, so the UI can open an obręb picker instead of a generic "not found".
5. **No abort on client disconnect** (`app/api/analiza/route.ts:13`).
   - Fix: pass `req.signal` into `analyze`, merged into `ctrl` with `AbortSignal.any`. Otherwise a closed tab keeps its slot for up to 24 s.
6. **Chunked POST without Content-Length** (`route.ts:33`).
   - `req.text()` reads the whole body before the size check.
   - Fix: read `req.body` with a byte counter and stop at 4 kB.
7. **Client and server disagree on "today"** (`components/analiza/api.ts:99-107`).
   - The client uses the browser's time zone; the server uses Warsaw time. A browser east of Poland after 23:00 PL time would send "tomorrow" and get 400.
   - `minDateIso` keeps 29 Feb where the server's `shiftYears` uses 28 Feb.
   - Fix: format the client date with `timeZone: "Europe/Warsaw"`.
8. **Memory of the meteo cache** (`power.ts:104`). It holds up to 300 cells × ~3 650 days in memory, which could reach roughly 150 MB in the worst case.
   - Fix: limit it to about 60 cells. The disk cache covers the rest.
9. **Legacy routes**
   - **Still used:** `/api/traktor/conditions` and `/api/tiles/google/*` are used by v1 `/mapa`, which is still linked from SiteNav "Miejsca", the landing page and `AnalizaApp.tsx:329`. Keep them.
   - **Unused by any component:** `/api/traktor/parcel`, `/order`, `/explain` and `/scenario/[name]`. `explain` calls the Anthropic API whenever `ANTHROPIC_API_KEY` is set, with no rate limit, so anyone can spend that budget. Delete these four routes, or add `rateLimited()`.
   - **Tile proxy:** it only checks `sec-fetch-site`, which curl simply does not send. It is unprotected spend of paid Google quota if a key is configured (none is set now). Fix: add a rate limit, or remove the proxy.
10. **Possible engine issue, outside this scope.** On 2026-11-22, which is outside the SMSR season, `currentLevel` is "umiarkowane" for 4 of the 6 parcels. Ask the engine and SMSR reviewer whether out-of-season dates should cap or label `currentLevel`.

## Verdict
**Ready with 3 P1 fixes.**
- **Holds up:** validation, the error contract, status codes, GET/POST parity, normalisation and dedupe all held up against the jury set and the negative tests.
- **2018-07-20:** results point the right way: Kraszyce and Chotynia wysokie, Wyskoć umiarkowane, loess niskie.
- **Before the jury:**
  - Raise the concurrency limit.
  - Wire up the AMBIGUOUS picker.
  - Fix the rate-limit key and stop counting cache hits, so one shared hall IP does not hit 429 or 503 during the demo.
