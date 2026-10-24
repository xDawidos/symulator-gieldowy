# Plan 0.15.5 „Budownictwo i banki” (po 0.15.4, przed 0.15.6 i 0.16.1)

Źródło: zgłoszenia z gry 2026-10-25 (`pomysly_na_kolejne_wersje.md`, sekcja 9). Plan pisany bez czytania kodu; stan sektora sprawdzamy w P0.

Cel: przetargi mają prawdziwą konkurencję (Budimix nie wygrywa wszystkiego), podwykonawcy mają co robić, a banki i kolejny typ spółek dostają własną mechanikę.

Czego uczy:
- **Konkurencja i koncentracja:** co się dzieje, gdy jeden wykonawca wygrywa wszystko; dlaczego powstają urzędy antymonopolowe.
- **Łańcuch wykonawców:** generalny wykonawca i podwykonawcy; przejęcia pionowe.
- **Bankowość:** kredyt, depozyt, marża odsetkowa, ryzyko kredytowe sektora budowlanego.

Kolejność: B0 → B1 → … → B7. **Commit po każdej części.** UI z komponentów 0.14.5; wygląd zleca czat designu. Zapis v15, pola opcjonalne.

## Punkt wyjścia (z zgłoszeń; do sprawdzenia w P0)

- Budimix wygrywa praktycznie wszystkie przetargi; 62 z 66 projektów u jednego podwykonawcy; megaprojekty robi tylko Biuro Obsługi Rachunkowej; Orzeł Telekom jest w niemal każdym megaprojekcie.
- Podwykonawcy w praktyce nieużywani; działa tylko specjalność industrial.
- Bankowość ma sektor i podsektory (0.14 T1a), parabank (0.11), banki komercyjne (0.6).

## Części

| Część | Zakres |
|---|---|
| **B0** | **Pomiar:** udział wygranych przetargów wg spółki, koncentracja (indeks HHI), udział podwykonawców, kto robi megaprojekty, wyniki sektora Budowlany i banków; raport `raporty/diagnoza_0.15.5.md` |
| **B1** | **Strojenie przetargów:** ocena ofert (cena, jakość, zdolność, historia), limit udziału jednej spółki w czasie (np. nie więcej niż 3 z 5 kolejnych), przeciążenie mocy po wygranych (spadek zdolności), rotacja; megaprojekty dla spółek właściwych sektorów |
| **B2** | **Więcej podwykonawców:** rejestr z kilkunastoma specjalnościami (nie tylko industrial), ceny i jakość różne, **konkurencja o zlecenia** (podwykonawcy sami się oferują) |
| **B3** | **Przejęcia pionowe:** spółka budowlana przejmuje podwykonawców jak spółki zależne (0.14 T6) albo wchłania je; podwykonawca w grupie ma zlecenia z grupy |
| **B4** | **Banki:** pomiar i strojenie (kredyty dla Budowlanego i deweloperów, ryzyko, marża odsetkowa); nowy rodzaj spółki ze „specjalną funkcją” — **do wyboru przez użytkownika** (patrz decyzje) |
| **B5** | **Dopasowanie do limitów 0.15.4/0.15.6:** podwykonawcy jako spółki ≤ limit; brak „duchów posiadaczy” |
| **B6** | Interfejs, Akademia („Przetarg i kryteria”, „Koncentracja rynku”), zapis |
| **B7** | **Kontrola**, raport `raporty/kontrola_0.15.5.md`, wiersz w mapie |

## Jak sprawdzimy (orientacyjnie)

| Miara | Cel |
|---|---|
| Najwyższy udział wygranych przetargów jednej spółki (20 lat) | ≤ 35% |
| Spółek z wygraną w ≥ 10% przetargów | ≥ 3 |
| Udział projektów u największego podwykonawcy | ≤ 25% |
| Megaprojekty: liczba różnych wykonawców | ≥ 4 w 20 latach |
| Orzeł Telekom w megaprojektach | ≤ 40% |
| Marża i GIG sektorów budowlany i bankowy | ±1 pp względem bazy |
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 |
| Czas kroku / zapis | +≤ 2% / +≤ 0,1% |

## Ryzyka

- **Zmiana wyniku sektora Budowlany** (GIG, kryzys bankowy 0.15.3 zależy od Budowlanego) → pomiar ±1 pp.
- **Za dużo podwykonawców = więcej spółek** → limit 0.15.4 P5; podwykonawcy jako małe podmioty bez notowania.
- **Nowa „funkcja specjalna”** niedookreślona → decyzja użytkownika przed B4.

## Decyzje do podjęcia

1. Który typ spółek dostaje „funkcję specjalną” (propozycje: ubezpieczyciele, fundusze nieruchomości REIT, spółki energetyczne)?
2. Czy urząd antymonopolowy wchodzi tu, czy w 0.15.6 (propozycja: 0.15.6, w B1 tylko limit udziału)?
3. Czy podwykonawcy są spółkami w rejestrze giełdowym, czy prywatnymi podmiotami bez notowania (propozycja: prywatne)?

## Zlecenie dla czatu designu (przed B6)

1. Okno przetargu: oferty z kryteriami (cena, jakość, zdolność), ranking słowem i liczbą.
2. Widok podwykonawców i ich udziału.
3. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.
