# Dostęp jury do prywatnego repozytorium (pkt 4.3, Regulamin § 5)

Repozytorium: `https://github.com/philpiano/traktor` (właściciel konta wykonuje kroki poniżej).
Zasada: repozytorium jest **prywatne do końca wydarzenia** i dalej, do przekazania KOWR (jeśli wygramy). Nie udostępniamy go nikomu poza jury i zespołem.

## 0. Najpierw: wypchnij kod

Przegląd `docs/review/08-repo-infra.md` wykazał, że `origin/main` był oznaczony jako „gone”. Przed wysłaniem linku:

```powershell
git status                 # czysto?
git push -u origin main    # wypycha main i ustawia śledzenie
git log -1 --format=%H     # ten SHA wpisz w deliverables/README.md
```

Sprawdź w przeglądarce (zalogowany), że na GitHubie widać ostatni commit i README.

## 1. Wariant A (zalecany): jury jako współpracownicy z prawem odczytu

Dotyczy konta osobistego. **Konto osobiste nie daje roli Read**: każdy zaproszony współpracownik dostaje zapis (push). Jeśli zależy nam na samym odczycie, użyj wariantu B (organizacja).

1. GitHub → repozytorium → **Settings** → **Collaborators** (w sekcji *Access*). GitHub może poprosić o ponowne potwierdzenie hasłem lub 2FA.
2. **Add people** → wpisz login GitHub lub e-mail członka jury (z instrukcji platformy HackNation) → **Add … to this repository**.
3. Powtórz dla każdego jurora. Zaproszenie wygasa po 7 dniach, więc wyślij je w dniu oddania zgłoszenia.
4. Na liście zobaczysz status *Pending invite* → po akceptacji login jurora.

## 2. Wariant B: organizacja i rola Read

1. Przenieś repozytorium do organizacji zespołu albo utwórz ją: *Your organizations* → **New organization** → plan *Free*. Nazwa bez imion i nazwisk (§ 6).
2. Repo → **Settings** → **General** → *Danger Zone* → **Transfer ownership** do organizacji. Repo zostaje prywatne.
3. Repo → **Settings** → **Collaborators and teams** → **Add people** → login jurora → rola **Read**.
4. Zaktualizuj `git remote set-url origin https://github.com/<ORGANIZACJA>/traktor-hacknation2026.git` i link w zgłoszeniu.

## 3. Wariant C: gdy platforma prosi o link lub token, nie o konta

- **Fine-grained personal access token** (tylko odczyt, jedno repo): avatar → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**:
  - *Repository access*: **Only select repositories** → `traktor-hacknation2026`,
  - *Permissions → Repository permissions*: **Contents: Read-only** (Metadata: Read-only dodaje się samo),
  - *Expiration*: data końca oceny + kilka dni.
  
  Jury klonuje: `git clone https://<TOKEN>@github.com/philpiano/traktor.git`. Token przekaż **tylko kanałem wskazanym przez platformę**, nigdy w repozytorium ani na slajdzie. Po ocenie: **Revoke**.
- **Deploy key** (tylko odczyt, SSH): jury generuje parę `ssh-keygen -t ed25519 -C "jury-hacknation"` i przysyła klucz **publiczny**. Repo → **Settings** → **Deploy keys** → **Add deploy key** → wklej, *Allow write access* **odznaczone**. Jury: `git clone git@github.com:philpiano/traktor.git`.
- **Archiwum** (gdy platforma przyjmuje plik): `git bundle create traktor.bundle --all` (pełna historia) i odtworzenie `git clone traktor.bundle traktor`. Plik wgraj tylko do platformy.

## 4. Jak utrzymać prywatność

- Repo → **Settings** → **General** → *Danger Zone*: widoczność ma być **Private**. Nie klikaj *Change visibility*.
- Nie włączaj GitHub Pages dla repo prywatnego, nie publikuj *Releases* z kodem na zewnątrz.
- Wdrożenie (wersja działająca) pokazuje aplikację, nie kod. Na hostingu nie podpinaj publicznego podglądu repozytorium. Zmienne środowiskowe ustawiaj w panelu hostingu, nie w repo.
- Nie wklejaj linku do repo w publicznych kanałach (Discord, LinkedIn, X) do czasu przekazania KOWR.
- Forki: Settings → General → *Features*: zostaw wyłączone *Allow forking* (dla repo prywatnego w organizacji).
- Po zakończeniu oceny usuń jury z *Collaborators* / unieważnij token, jeśli regulamin tego nie zabrania. Zachowaj dostęp do czasu ogłoszenia wyników.

## 5. Lista kontrolna prywatności (wykonaj przed wysłaniem zgłoszenia)

- [ ] Okno incognito (wylogowany) → `https://github.com/philpiano/traktor` → **404 „Page not found”**.
- [ ] Okno incognito → `https://raw.githubusercontent.com/philpiano/traktor/main/README.md` → **404**.
- [ ] Settings → General: *Visibility* = **Private**.
- [ ] Settings → Collaborators: tylko zespół + jury (porównaj z listą z platformy).
- [ ] Settings → Deploy keys / tokeny: tylko te dla jury, wszystkie tylko do odczytu.
- [ ] `git log --all -G "AIza[0-9A-Za-z_-]{20}"` i `git log --all -S sk-ant` → pusto (żadnych kluczy w historii).
- [ ] W repo nie ma imion i nazwisk członków zespołu (§ 6): `git grep -i -n "<imię>"` dla każdej osoby. Uwaga: autorzy commitów to dane git. Login `traktor-dev` jest neutralny. Sprawdź `git log --format="%an <%ae>" | sort -u`.
- [ ] Juror potwierdził, że widzi repo (poproś o odpowiedź na platformie).
