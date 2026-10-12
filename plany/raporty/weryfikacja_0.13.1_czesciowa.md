# Raport weryfikacji 0.13.1 (częściowy) — „duchy posiadaczy”, decyzje 1 i 2, B5

- **Data:** 2026-10-12
- **Zweryfikowany commit:** `f1b63ca` na `claude/budowa`. Zawiera:
  - `6803621`, `1b4be86`, `b9b42e9` — „duchy posiadaczy” (P3);
  - `603eab2` — decyzja 1: łączny sufit 150 liczy tylko zwykłe spółki;
  - `2e7c3e6` — decyzja 2: ratunek operatora rynku internetowego finansują spółki członkowskie;
  - `f1b63ca` — B5: stabilność funduszu.
- **Werdykt:** OK z uwagami. Weryfikacja jest **niepełna**: długi przebieg ×50 przerwano na polecenie użytkownika.
- **Testy:** 310/310 (`tests/tests.html`).
- **Przebieg ×50:** nie wykonany do końca, brak wyniku `checkWorldInvariants()` dla tej wersji.

## Sprawdzone

- **Testy:** `tests.html` przechodzi 310/310, w tym nowe grupy P3, B5 oraz decyzji 1 i 2.
- **Przegląd kodu P3 („duchy posiadaczy”):**
  - `purgeSymbolHolders` czyści pakiety po usuniętej albo ponownie użytej spółce u innych spółek, funduszy botów, botów, banków, w portfelu prywatnym gracza i w ETF-ach. Portfela funduszu gracza (`playerPortfolio`) nie rusza.
  - `trimGhostHolders` zdejmuje nadmiar akcji w kolejności: spółki upadłe → inne spółki → ETF-y → banki → fundusze botów → boty → miasto. Fundusz i portfel gracza zostają nietknięte.
- **Według budowy (nie potwierdzone przez weryfikację):**
  - w 2 przebiegach po 250 kwartałów z kontrolą co 5 ticków nie było rozjazdów;
  - spółek krajowych było najwyżej 109–111, zwykłych 149–150;
  - kalibracja B5: wynik = GIG daje +1–2% JU rocznie, +5 pp wzrost, −5 pp powolny spadek.

## Niesprawdzone (do wykonania przy następnej weryfikacji)

1. **Długi przebieg ×50 (lub ×200), z zapisem i wczytaniem w połowie:**
   - `checkWorldInvariants()` puste — w szczególności brak „akcje w obrocie ≠ posiadacze” (wcześniej GIEB, PLX, WZM);
   - spółki krajowe ≤ ~110, zwykłe ≤ 150;
   - rozmiar zapisu stabilny (ok. 2,1–2,5 MB), bez błędów zapisu.
2. **B5 w praktyce:**
   - kalibracja wzrostu i spadku liczby JU względem GIG;
   - panel „Dlaczego klienci odchodzą / przychodzą”;
   - powiadomienie przy napływie lub odpływie > 10% JU w kwartale;
   - emisja ciągła domyślnie otwarta i działanie przełącznika;
   - wycofywanie ofert JU przez zadowolonych i neutralnych klientów.
3. **Decyzja 2:** ratunek operatora przez spółki rynku (najwyżej 30% ich gotówki) w interfejsie i w długiej grze.
4. **Decyzja 1:** sufit krajowy bywa 111, bo debiut startupu operatora jest gwarantowany. Do potwierdzenia, czy to akceptowalne.

## Uwagi i ryzyka (z przeglądu kodu, bez potwierdzenia w symulacji)

- **`trimGhostHolders` może maskować błędy.** Zdejmuje akcje botom i bankom bez rozliczenia gotówki. Jeśli rozjazd ma inną, prawdziwą przyczynę, przycinanie ją ukryje, a log jest tylko w trybie debug.
  - **Propozycja:** każde przycięcie zapisywać w liczniku widocznym w `checkWorldInvariants()` i w logu także poza trybem debug.
- **Zmiana balansu przez B5:** przy dobrych wynikach fundusz rośnie wolniej niż wcześniej (zgłoszone przez budowę).

## Problemy koncepcyjne do decyzji planowania

- Brak nowych w tej części.
