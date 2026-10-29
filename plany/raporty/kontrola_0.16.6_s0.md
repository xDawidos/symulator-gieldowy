# Kontrola 0.16.6 S0 „Wybór kraju startowego”

Gałąź `claude/impl-0166-s0-a31600` (niescalona, nad 0.16.9). Testy: `node plany/design/narzedzia/run_tests.mjs` → **863/863** (2 nowe testy: kraj startowy, ekran wyboru). Zapis **v19** (`playerProfile.country`; zapis starszy → `PL`, a kraj spoza listy → `PL`). Diagnoza i decyzja o podziale: `diagnoza_0.16.6_s0.md`.

## Zakres zrobiony
- **S0a:** inwentaryzacja; podział na S0 (ta wersja) i S0d (rynek macierzysty i społeczeństwo kraju innego niż PL — nie zrobione, kolejna wersja).
- **S0b:** `START_PLAYABLE = [PL, DE, US, CZ]`, `getStartCountry()`, `setStartCountry(id)` (`countries.js`). Kraj ≠ PL: giełda kraju dołączona od pierwszego dnia (`joinCountry(id,'start')`, bez newsa i szoku turystycznego), gracz handluje bez biletu (`hasTicket`), bez dopłaty poza sesją; inni inwestorzy (boty) nadal potrzebują biletu. **Waluta konta = PLN** dla wszystkich krajów (decyzja i uzasadnienie w diagnozie); rynek macierzysty (GPW, ≈100 spółek, społeczeństwo) pozostaje polski.
- **S0c:** `country_picker.js`: `showCountryGlobe(onPick)` — osobny ekran przed scenką (wywołanie w `main.js`; z formularza `intro-overlay` usunięto tylko wybór kraju, reszta scenki bez zmian; debug „pomijaj scenkę” pomija też ekran). Globus Globe.gl + tekstury + `kraje.geojson` ładowane dopiero na tym ekranie (≈3,2 MB), po wyborze `_destructor` i usunięcie z DOM. Obracanie/zoom (sterowanie biblioteki), podświetlone granice krajów gry (obrys i pinezka z flagą SVG i nazwą), kliknięcie obrysu/pinezki/pozycji listy z synchronizacją, lot kamery, karta kraju (stolica, waluta, giełda, sesja, nadzór, pracownicy), auto-obrót (wyłączony przy `prefers-reduced-motion`), reset widoku. Lista jest pełnoprawnym wyborem (przyciski, `aria-pressed`, fokus na wybranym); bez WebGL i w testach ekran jest samą listą. Kraje „wkrótce” (SE, CH, FR, JP, CN, IN, TW) można obejrzeć, nie potwierdzić.
- Skrypt w `index.html` i `tests/tests.html`; testy nie ładują WebGL (`__GAME_TEST_MODE__`).
- Licencje: `lib/LICENSES.md` — pochodzenie tekstury nocnej **nie zostało potwierdzone** (repozytorium three-globe nie podaje źródła); zapisano prawdopodobne (NASA) i zalecenie.

## Pomiar (przebiegi, ten sam harness, równolegle; 27 kw.)
Limit 50 minut na serię wystarczył na **3 gry na serię** (≈3,5 s/kwartał przy 5 równoległych) — zamiast planowanych 12.
| Seria | gier | GIG CAGR średnia ± odch. (se) | Niezmienniki / wyjątki | Czas kroku |
|---|---|---|---|---|
| baza 0.16.9 (`af7d727`) | 3 | 12,6% ± 3,6 (2,1) | 0 / 0 | 3,9 s |
| nowy kod, start PL | 3 | 14,7% ± 0,7 (0,4) | 0 / 0 | 3,5 s |
| start DE | 3 | 11,0% ± 3,4 (2,0) | 0 / 0 | 3,5 s |
| start US | 3 | 14,8% ± 6,7 (3,9) | 0 / 0 | 3,6 s |
| start CZ | 3 | 11,3% ± 2,4 (1,4) | 0 / 0 | 3,7 s |
Kraj startowy był dołączony w kw. 0 w każdej grze DE/US/CZ; ujemnej gotówki i błędów presetów brak. **Wymaganie „GIG dla PL ±1 pp” nie jest potwierdzone pomiarem** (błąd średniej 2 pp przy n=3). Argument pośredni: ścieżka PL nie wykonuje nowego kodu (`setStartCountry` nie jest wołane, `hasTicket` zwraca ten sam wynik), więc rozkład GIG jest ten sam co w 0.16.9; różnica 12,6 vs 14,7 to szum. Do uzupełnienia: seria 20+ gier PL vs baza (≈1 h na seria przy 2 równoległych).

## Pominięte i problemy
- **S0d** (rynek macierzysty, społeczeństwo, partie, urzędy, kryzysy, waluta bazowa dla kraju ≠ PL) — celowo poza zakresem; kraj startowy ≠ PL zmienia tylko dostęp do giełdy kraju i scenę startową. Tytuły „PLN”, „konto prywatne” bez zmian.
- Mała próba pomiaru (j.w.); sonda nowych mechanik w przebiegach (np. zakupy gracza na giełdzie kraju startowego) nie istnieje — gracz w symulacji kupuje przez fundusz indeksowy, więc zakup bez biletu sprawdzają tylko testy jednostkowe.
- **Weryfikacja wizualna:** w przeglądarce w aplikacji (serwer lokalny, WebGL) zobaczyłam globus, pinezki z flagami, kartę i listę (pulpit i 375 px, bez przewijania poziomego), wybór z listy → karta i callback, usunięcie canvasa i nakładki po potwierdzeniu. **Nie zweryfikowano:** obracanie/zoom myszą i dotykiem, kliknięcie w obrys kraju na globusie (tylko lista i pinezki przez DOM), nawigacja klawiaturą Tab/Enter ręcznie i czytnik ekranu, `prefers-reduced-motion`, ciemny/jasny motyw (gra ma tylko ciemny), pełny przepływ ekran → scenka z babcią po świeżym starcie (przeglądarka miała zapis; wywołano ekran ręcznie). Pinezki zachodzą na siebie w Europie (PL/DE/CZ/CH/FR) — czytelność przy większym zoomie, wyboru nie blokuje (lista).
- Dostępność: flaga SVG ma `aria-label` z nazwą kraju obok tekstu nazwy — czytnik może czytać nazwę dwa razy.
- Przy otwarciu strony z `file://` globus się nie wczyta (fetch geojson i tekstury); ekran pokazuje listę z komunikatem. Działa na serwerze (GitHub Pages, lokalny).
- Tekstury: źródło niepotwierdzone (zob. `lib/LICENSES.md`).
