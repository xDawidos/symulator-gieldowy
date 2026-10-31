# Kontrola 0.16.10 „Nowa scenka startowa”

Gałąź `claude/impl-01610-370c4e` (nie scalona, bez zmian w `zmiany-AI`/`main`). Testy: **905/905** (było 895; grupa „0.16.10 Nowa scenka startowa”: 10). Zapis bez zmian (v21; scenka nie dodaje pól do zapisu).

## Co zrobiono
Nowy plik `intro.js` (logika bez DOM u góry, wyświetlanie niżej; opóźnienia wstrzykiwane przez `schedule`, w testach ręczny zegar). Stary kod scenki (`INTRO_SMS`, `showIntroScene`, `completeIntroScene` w `ui.js`) usunięty; `main.js` woła tylko `showIntroScene()`.
1. **Kraj** — `showCountryGlobe` bez zmian, jako osobny krok (`introPickCountry` → `setStartCountry`).
2. **Dane gracza** — karta „Twoje dane”: imię, firma stażu (= nazwa korporacji), „Opcje zaawansowane” z kryzysem; wartości domyślne „Dawid” / „Wawelska Grupa Inwestycyjna”; walidacja pustych i za długich (`validateIntroField`, komunikat `role="alert"`, `aria-invalid`).
3. **SMS** — wskaźnik pisania, potem wiadomość gracza i odpowiedź babci (teksty z planu), przelew kieszonkowego jak dawniej. Enter/Spacja (poza polami i przyciskami) albo kliknięcie w wiadomości przyspiesza (`introHurry`). Log ma `role="log"`/`aria-live`, dopisywane są tylko nowe dymki.
4. **Umowa o pracę** — dokument (papier, ciemny tusz), „[imię] od dzisiaj jest zatrudniony w [firma]”, data z gry (`formatGameDate`), podpis i kratka „Oczekuje na podpis” → „Podpisano” (tekst + ikona, nie sam kolor). Telefon zanika, umowa wchodzi; przy `prefers-reduced-motion` zamiana natychmiast (CSS `display:none` + `delays.fade = 0`).
5–6. **TeamedUP! i szef** — okno TeamedUP! (komponenty 0.14.5, wygląd jak w 0.16.6) z rozmową: powitanie szefa, pole nazwy funduszu (domyślna wartość, walidacja), wiadomość gracza składana automatycznie, „Powodzenia, nie zawiedź mnie.”. Zakładki TeamedUP! nieaktywne, przycisk zamknięcia ukryty.
7. **Odblokowanie** — po wiadomości szefa scenka kończy się (`completeIntroScene` zapisuje imię, firmę, nazwę funduszu, CV, kryzys i powitalną pocztę do tych samych pól co dawniej); przycisk „Zaczynam pracę” zamyka TeamedUP!. Mechanika startu bez zmian: gra nadal startuje zapauzowana, „Wznów” rusza zegar.

**Blokada do końca scenki** (`isIntroActive`): `.app-shell` jest `inert` (menu, zakładki, giełda niedostępne myszą i klawiaturą), `togglePauseGame`, `openMailbox`, `openInternetPage`, `closeTeamedUp`, `setTeamedPane` nic nie robią.
**Pominięcie**: przycisk „Pomiń” (w każdym kroku, widoczny tak jak dotąd tylko w trybie debug) i opcja trwała `toggleIntroSkip` — domyślne dane (albo już wpisane) i kraj (domyślnie PL), kolejka czasomierzy czyszczona, globus zamykany, drugie pominięcie nic nie robi.

## Weryfikacja w aplikacji (Browser pane, serwer z worktree)
Pierwszy przebieg od zimnego startu przez `main.js` i prawdziwe klikanie/klawisze: globus (lista) → „Wybieram ten kraj” → dane (puste imię + Enter: „Podaj imię.”, fokus w polu) → SMS-y → TeamedUP! (powitanie szefa, pole z „Fundusz Pierwszy Krok”, Enter) → odpowiedź szefa → Enter na „Zaczynam pracę”: `step: done`, `inert: false`, TeamedUP! zamknięty, nazwa funduszu w pasku bocznym i tytule karty, jedno powitanie w poczcie, gra na pauzie. Dalej przez API (`startNewCareer` + `showIntroScene`) dla umowy (DOM i zrzuty: umowa z „Podpisano”, 375 px bez przewijania poziomego, kraj DE → kwoty w EUR), debug + Spacja (przyspieszenie, przyciski „Pomiń” widoczne), pominięcie z poziomu przycisku, opcja trwała (bez globusa, `done`, 1 mail).

## Pominięte i problemy
1. **Reduced-motion nie przeklikany** — narzędzie nie przełącza `prefers-reduced-motion`; sprawdzone testem (`fade = 0`) i regułą CSS, nie zrzutem.
2. Błąd znaleziony i poprawiony w trakcie: tytuł umowy był niewidoczny (globalne `h2 { color: … !important }`) i karta wychodziła poza ekran 375 px (brak `box-sizing`).
3. Przycisk „Pomiń” nadal tylko w trybie debug (jak przed 0.16.10); gracz bez debug nie pominie scenki.
4. Zapis w trakcie scenki (np. ukrycie karty) zachowuje domyślne nazwy; po wczytaniu scenki nie ma (jak dawniej). Przerwana scenka nie wraca.
5. Brak osobnego sprite’a/ilustracji szefa (awatar „SZ”), brak dźwięku. Szef bez imienia („Szef”).
6. Czas kroków (ms): pisanie 1100, przerwa 700, umowa 2200 + 1800, zanik 600, szef 1400, odpowiedź 900 — do dostrojenia po próbie z graczem.
7. Nawigacja `Tab` po scence idzie po oknie TeamedUP!/karcie; nie sprawdzono czytnika ekranu.
