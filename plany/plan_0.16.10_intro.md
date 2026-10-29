# Plan 0.16.10 „Nowa scenka startowa” (szkic zakresu; po S0 z 0.16.6)

Źródło: zgłoszenie użytkownika z 2026-10-29. Dzisiejsza scenka (`showIntroScene`, `completeIntroScene`, `renderIntroCountries` w `ui.js`, overlay `intro-overlay` w `index.html`) to SMS od babci i jeden formularz (imię, nazwa korporacji, nazwa funduszu, kryzys w grze, kraj startowy). Rozbijamy ją na kolejne kroki, jak krótki film, z wejściem do gry przez TeamedUP!.

## Przebieg (kolejność kroków)

1. **Wybór kraju startowego na globusie** (S0 z 0.16.6): osobny ekran, bez reszty formularza.
2. **Dane gracza** (imię, nazwa firmy, w której zaczyna staż; kryzys w grze jako opcja zaawansowana, nazwa funduszu dopiero w kroku 6). Pola z wartościami domyślnymi (dziś „Dawid”, „Wawelska Grupa Inwestycyjna”), walidacja długości i pustych.
3. **Cutscenka SMS (automatyczna):**
   - Gracz pisze: „W końcu! Dostałem się do firmy [nazwa firmy] na staż. Jeszcze tylko uzupełnię papiery i zaczynam.” (wiadomości pojawiają się z opóźnieniem jak pisane; bez wpisywania przez gracza).
   - Odpowiedź (od babci, jak w obecnej scence): „Gratulacje! W nagrodę wyślę ci małe co nieco ;)”.
4. **Płynne przejście do „Umowy”:** dokument „Umowa o pracę”: „[imię gracza] od dzisiaj jest zatrudniony w [firma]” (data z gry, podpis, kratka „Podpisano”), animacja przejścia (zanikanie, bez migania; przy `prefers-reduced-motion` natychmiastowa zamiana).
5. **Otwarcie TeamedUP!** (0.16.5, po 0.16.9 „Lombard w Internecie” bez wejścia z TeamedUP): konwersacja z szefem; w czasie rozmowy pozostałe funkcje gry zablokowane (menu, zakładki, giełda, zegar nie biegnie).
6. **Rozmowa z szefem (skrypt):**
   - Szef: „Cześć [imię gracza], od dzisiaj jestem twoim szefem! Zanim zaczniesz, podaj nazwę swojego funduszu. Pogadam ze stałymi klientami, żebyś miał dobry start, a ty lepiej pomyśl, jak nazwiesz swój fundusz.”
   - Gracz (pole poniżej, wiadomość składana automatycznie): „Miło mi cię poznać, mój fundusz będzie się nazywał: [nazwa funduszu].” (pole nazwy z domyślną wartością i walidacją).
   - Po chwili szef: „Powodzenia, nie zawiedź mnie.”
7. **Start gry:** odblokowanie interfejsu, wyjście z TeamedUP!, pierwsza rozmowa/zadanie od szefa zgodnie z istniejącym początkiem gry (bez zmiany mechaniki startu).

## Wymagania

- **Pomijanie:** istniejący przycisk „Pomiń” i opcja trwała (`isIntroSkipEnabled`/`toggleIntroSkip`) zostają; pominięcie ustawia domyślne dane i kraj, bez błędów stanu.
- **Dostępność:** wszystkie kroki z klawiatury (Enter/Spacja przyspiesza pisanie), czytelne kontrasty, tekst alternatywny, `aria-live` dla przychodzących wiadomości, kolor nie jest jedynym nośnikiem, redukcja ruchu.
- **Zapis:** imię, firma, nazwa funduszu trafiają do tych samych pól stanu co dziś; stare zapisy bez zmian; nowa gra z wybranym krajem startowym (S0).
- **Wygląd:** komponenty i tokeny 0.14.5, makiety TeamedUP! ze Stitcha (`plany/design/stitch/teamedup_komunikator_firmowy`), ciemny motyw, bez zewnętrznych CDN-ów.
- **Testy:** przebieg scenki w teście bez interfejsu (kolejność kroków, wartości domyślne, pominięcie, blokada funkcji w TeamedUP!, odblokowanie po wiadomości szefa), bez czasomierzy zależnych od zegara w testach (opóźnienia wstrzykiwane).

## Otwarte pytania

1. Czy „kryzys w grze” zostaje w scence startowej (dziś lista wyboru), czy trafia do ustawień nowej gry?
2. Czy nazwa korporacji (dziś osobne pole) to ta sama „firma, w której staż” z SMS-a, czy dwa pojęcia (firma-pracodawca i korporacja gracza)? Domyślnie: jedna nazwa.
3. Kto odpisuje na SMS: babcia (jak dziś) czy ktoś inny?
