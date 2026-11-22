# Security / Bezpieczeństwo

Full Polish version: [docs/BEZPIECZENSTWO.md](docs/BEZPIECZENSTWO.md).

## Reporting a vulnerability / Zgłaszanie podatności
Nie zakładaj publicznego issue. Napisz prywatnie do zespołu TRAKTOR (kanał podany w zgłoszeniu hackathonowym) albo przez GitHub „Report a vulnerability” (Security Advisories), jeśli repozytorium jest publiczne. Odpowiadamy w ciągu 72 h. Prosimy o opis, kroki odtworzenia i adres trasy.

## Scope / Zakres
Prototyp hackathonowy (Next.js 16, `web/`). Brak kont, logowania, bazy danych i płatności.

## Personal data / Dane osobowe
- Aplikacja nie zbiera danych osobowych, nie ustawia ciasteczek, nie ma analityki ani śledzenia.
- Do usług zewnętrznych trafiają tylko współrzędne punktu/działki, identyfikator działki ewidencyjnej (ULDK) albo nazwa miejscowości (Nominatim). Właściciela działki nie pobieramy.
- Zapisane raporty są tylko w `localStorage` przeglądarki użytkownika; serwer ich nie przechowuje.

## Secrets / Sekrety
- Żaden klucz nie jest potrzebny do głównych funkcji. Opcjonalne: `GOOGLE_MAPS_API_KEY`, `ANTHROPIC_API_KEY` (tylko po stronie serwera, nigdy `NEXT_PUBLIC_*`).
- Pliki `.env*` są w `.gitignore`; w repozytorium jest tylko szablon `web/.env.example` z pustymi wartościami.

## Audit status (2026-11-22)
- `npm audit --omit=dev`: 0 vulnerabilities (53 prod deps).
- Secret scan (tree + full git history): no keys found.
- Details and open items: docs/BEZPIECZENSTWO.md.
