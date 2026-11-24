# Plan 1.0 (ostatnia wersja gry; szkic, 2026-11-18)

**1.0 to ostatnia wersja gry** (decyzja użytkownika 2026-11-18). Zbiera domknięcia, które mają sens dopiero, gdy wszystkie mechaniki już są. Zakres będzie rósł; każda pozycja przed wdrożeniem dostaje specyfikację.

## Stopniowe odblokowywanie zakładek (dawne D3, potem 0.18.7 E1)

Przeniesione z `plan_0.18.6_porzadki_dluga_gra.md` (2026-11-18). Opis z tamtego planu, do aktualizacji przy specyfikacji 1.0 (po Miastach 2 i krajach):

- **Zakres:** rejestr `UNLOCKS` (zakładka lub funkcja → warunek: NAV / aktywa funduszu, stanowisko, certyfikat Akademii, rok gry). Progi startowe (do akceptacji): Bank od startu (lokaty, potrzebne w Pierwszych krokach); aukcje bonów skarbowych po certyfikacie „Obligacje” albo aktywach ≥ 50 tys.; **obligacje korporacyjne** (`index.html:781`) po tym samym certyfikacie albo aktywach ≥ 100 tys.; **aukcje akcji zastawnych** (w liście użytkownika „aukcje hipoteczne”; aukcji hipotecznych w grze nie ma) po stanowisku Zarządca funduszu; Budownictwo i Państwo → Łańcuchy po 1. roku; okno **Miasto** (dziś inwestycje miejskie) po certyfikacie albo 2. roku. **Miasta 2 (0.19.2):** w rejestrze tylko szkielet reguły (`city2: { requires: 'version-0.19.2' }`), bez ekranu. Zablokowana zakładka jest widoczna z kłódką i warunkiem (wariant „zablokowane” stanu pustego z makiety 22, z postępem „Aktywa 32 400 / 50 000 PLN”). Stare zapisy i piaskownica: wszystko odblokowane. Ustawienie „Pokaż wszystko od startu”.
- **Pliki:** `unlocks.js` (nowy, bez DOM), `ui.js` (pasek boczny, przyciski), `learning.js` (certyfikaty jako warunek), `index.html`, `main.js` (zapis odblokowań).
- **Test:** nowa gra: zakładki z warunkiem pokazują kłódkę i warunek; spełnienie warunku odblokowuje i wysyła wiadomość; stary zapis ma wszystko odblokowane; przebiegi bez UI ignorują blokady (boty bez zmian).

Do sprawdzenia przy specyfikacji: progi po wszystkich wersjach 0.19; Miasta 2 (0.19.2) jako zwykła pozycja rejestru zamiast szkieletu; wygląd kłódki według wariantu „zablokowane” z makiety 22 i ekranu 3 z listy designu w planie 0.18.6.
