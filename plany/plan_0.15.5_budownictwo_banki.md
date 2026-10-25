# Plan 0.15.5 „Budownictwo i banki” (po 0.15.4 „Poprawki z gry 3”, przed 0.15.6 i 0.16.1)

Źródło: zgłoszenia z gry 2026-10-25 (`pomysly_na_kolejne_wersje.md`, sekcje 9.1–9.2) i decyzje z tego samego dnia. Plan pisany **bez czytania kodu** — nazwy i progi do potwierdzenia w B0; wartości liczbowe to propozycje do strojenia pomiarem.

Cel: przetargi mają prawdziwą konkurencję (Budimix nie wygrywa wszystkiego), podwykonawcy mają co robić, banki dobrze obsługują sektor budowlany, a REIT-y dostają własną mechanikę.

Czego uczy:
- **Konkurencja i koncentracja:** co się dzieje, gdy jeden wykonawca wygrywa wszystko.
- **Generalny wykonawca i podwykonawcy;** przejęcia pionowe.
- **Ryzyko kredytowe** w sektorze budowlanym (deweloperzy, banki, kryzys bankowy z 0.15.3).
- **REIT:** zysk z najmu, obowiązkowa wypłata dywidendy, dźwignia (LTV), wrażliwość na stopy.

Kolejność: B0 → B1 → … → B8. **Commit po każdej części** (część z kilkoma krokami — commit po każdym kroku). UI z komponentów 0.14.5; wygląd zleca czat designu. Zapis v15 bez zmiany numeru (pola opcjonalne).

---

## Punkt wyjścia (do potwierdzenia w B0)

| Element | Stan wg zgłoszeń |
|---|---|
| Przetargi | Budimix wygrywa praktycznie wszystkie; 62 z 66 projektów u jednego podwykonawcy; megaprojekty robi tylko Biuro Obsługi Rachunkowej; Orzeł Telekom w niemal każdym megaprojekcie |
| Podwykonawcy | **są w grze jako prywatne firmy zależne albo niezależne, nienotowane** (decyzja); w praktyce działa tylko specjalność industrial |
| Spółki budowlane | Budimix, Infrastrukturex, Bractwo Stali, DrogiStal, BobBuild (spółki uniwersalne, załącznik A planu 0.16) |
| Banki | Bankowość z podsektorami (0.14 T1a), banki komercyjne, parabank (0.11) |
| REIT-y | w infrastrukturze spółek uniwersalnych (załącznik A); stan i zakres mechaniki do sprawdzenia |
| Limit udziału w przetargach | brak (urząd antymonopolowy dopiero w 0.15.6) |

## B0. Pomiar i diagnoza

- **Sondy** w `tests/przebiegi.html`: udział wygranych przetargów wg spółki i wg okna 8 kw.; indeks koncentracji HHI; liczba ofert na przetarg; udział podwykonawców wg specjalności i firm; kto wykonuje megaprojekty (lista różnych wykonawców); kondycja spółek budowlanych i banków kredytujących; stan REIT-ów (przychód, dywidenda, LTV, wycena do wartości godziwej).
- **Diagnoza przyczyn:** dlaczego Budimix i Orzeł Telekom wygrywają (cena, jakość, zdolność, brak przeciążenia mocy, kryteria sektorowe); dlaczego jedna firma dostaje 62/66 zleceń podwykonawczych.
- **Raport** `raporty/diagnoza_0.15.5.md`: przyczyny, pliki, kroki naprawy; inwentaryzacja REIT-ów (co jest, co dopisać).
- **Commit B0** (sondy osobno od raportu).

## B1. Strojenie przetargów

- **Ocena ofert** wielokryterialna: cena (40%), jakość (25%), zdolność wykonawcza (20%), historia i reputacja (15%) — wagi do strojenia.
- **Przeciążenie mocy:** po wygranych zdolność wykonawcy maleje do czasu zakończenia projektów; wygrana ponad moc daje opóźnienia i kary.
- **Limit udziału** (decyzja: tylko limit, urząd w 0.15.6): jedna firma nie wygrywa więcej niż 40% przetargów w oknie 8 kw. (kolejna oferta odrzucana albo karana współczynnikiem).
- **Megaprojekty:** wykonawca ze **specjalnością właściwą sektorowi** (np. telekomunikacja i IT — Technologia; energetyka — Energia); **konsorcjum ≥ 2 wykonawców, żaden > 60%**; Biuro Obsługi Rachunkowej i Orzeł Telekom tylko tam, gdzie specjalność pasuje.
- **Testy:** wagi, przeciążenie, limit okna, konsorcjum, brak ujemnej gotówki po karach.
- **Commit B1** (krok na element).

## B2. Podwykonawcy: więcej i konkurencyjni

- **Rejestr specjalności** (propozycja 12): fundamenty, konstrukcje stalowe, instalacje, elektryka, dachy, wykończenia, drogowe, mosty, okablowanie IT, energetyka, geodezja, industrial. Każdy podwykonawca: cena, jakość, moc, reputacja.
- **Konkurencja:** przy zleceniu wykonawca generalny prosi o oferty 3–5 podwykonawców (aukcja), wybór wg ceny, jakości i reputacji; **limit udziału jednego podwykonawcy** u jednego generalnego (≤ 50% zleceń w oknie 8 kw.).
- **Nowi podwykonawcy** powstają (startupy rzemieślnicze) i upadają; liczba na specjalność 3–8.
- **Prywatne, nienotowane** (decyzja): bez wpływu na limit spółek giełdowych.
- **Testy:** aukcja, limit, powstawanie i upadek, zapis. **Commit B2.**

## B3. Przejęcia pionowe podwykonawców

- Spółka budowlana może **przejąć podwykonawcę** (cena ok. 6–10 × roczny zysk) jako **spółkę zależną** (0.14 T6: transfer zysku 30–70%, usamodzielnienie, wchłonięcie przy ≥ 90% z przymusowym wykupem). Podwykonawca w grupie ma pierwszeństwo przy ofertach grupy.
- **Zabezpieczenie przed zamknięciem rynku:** zlecenie od grupy nie omija aukcji, gdy cena grupy > rynkowa + 15%; jedna grupa nie kontroluje > 40% podwykonawców danej specjalności (limit przed 0.15.6).
- **Testy:** przejęcie, pierwszeństwo, limit specjalności, wchłonięcie, niezmienniki (podwykonawca nie zwiększa liczby spółek giełdowych). **Commit B3.**

## B4. Banki

- **Pomiar i strojenie:** kredyty dla Budowlanego i deweloperów, marża odsetkowa (kredyt vs depozyt względem stopy bazowej), udział złych kredytów w sektorze budowlanym, powiązanie z kryzysem bankowym z 0.15.3 (Nieruchomości i Budowlany tracą −35…−40%).
- **Ryzyko koncentracji:** bank nie kredytuje jednego deweloperskiego dłużnika ponad limit (np. 10% kapitału).
- **Testy:** limit koncentracji, marża w widełkach, kryzys bankowy bez ujemnej gotówki. **Commit B4.**

## B5. REIT-y / fundusze nieruchomości (funkcja specjalna, decyzja użytkownika)

- **Portfel nieruchomości:** wartość, czynsz, obłożenie; przychód z najmu = wartość × stopa najmu × obłożenie; koszty utrzymania.
- **Obowiązek wypłaty:** ≥ 80% zysku jako dywidenda (cecha REIT-u; dywidenda stała i przewidywalna, z progiem minimalnym z 0.15.4).
- **Dźwignia:** zadłużenie ≤ 60% wartości portfela (LTV); koszt długu = stopa bazowa + marża; wrażliwość na stopy (`rateSens`) wyższa niż u zwykłych spółek.
- **Wycena:** wartość portfela × (1 ± premia/dyskonto do NAV) zależna od stóp, cyklu i faz; **obłożenie** zależy od gospodarki (Recesja −, pandemia −: biura i handel; Magazyny +, jak w 0.15.3).
- **Powiązanie z budownictwem:** REIT zamawia budynki u generalnych wykonawców (zlecenia dla Budowlanego), nowe obiekty zwiększają portfel po ukończeniu.
- **Testy:** wypłata ≥ 80%, LTV, wrażliwość na stopy, obłożenie w Recesji, zlecenie budowy, zapis. **Commit B5.**

## B6. Spójność z limitami i zapisem

- Podwykonawcy nie zwiększają limitu spółek giełdowych; brak „duchów posiadaczy” po przejęciach pionowych; przycięcie zapisu (dane podwykonawców w wersji skróconej). **Commit B6.**

## B7. Interfejs i Akademia

- Okno przetargu: oferty z kryteriami, ranking słowem i liczbą; widok podwykonawców (aukcja, udział, grupa); karta REIT (portfel, LTV, wypłata).
- Akademia: „Przetarg i kryteria”, „Koncentracja rynku”, „REIT”, „Ryzyko kredytowe”. **Commit B7.**

## B8. Kontrola końcowa

Pomiar z „Jak sprawdzimy”, raport `raporty/kontrola_0.15.5.md`, wiersz w mapie. **Commit B8.**

---

## Zlecenie dla czatu designu (przed B7)

1. Okno przetargu: oferty z kryteriami (cena, jakość, zdolność, reputacja), ranking słowem i liczbą; konsorcjum w megaprojektach.
2. Widok podwykonawców: specjalności, aukcja, udział, należenie do grupy.
3. Karta REIT-u: portfel, obłożenie, LTV, dywidenda.
4. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.

## Zapis gry i testy

- **v15, pola opcjonalne:** okno wygranych przetargów, rejestr podwykonawców (wersja skrócona), grupy i przejęcia pionowe, stan REIT-ów; przyrost < 0,2%.
- **Migracja:** puste okna; rejestr podwykonawców budowany z istniejących danych.
- **Testy** (nowa grupa „0.15.5”, ok. 30): wymienione w częściach; niezmienniki po 20 latach; zapis i wczytanie w trakcie przetargu.

## Jak sprawdzimy

Przebiegi ×200: 20 gier × 6,5 roku bez presetu, 20 × 6,5 roku z `fundusz-gig`, 10 × 20 lat. Baza: kontrola 0.15.4.

| Miara | Cel |
|---|---|
| Najwyższy udział wygranych przetargów jednej spółki (20 lat) | ≤ 35%; w oknie 8 kw. ≤ 40% |
| Spółki z wygraną w ≥ 10% przetargów | ≥ 3 |
| Udział projektów u największego podwykonawcy | ≤ 25% (cel dla jednej specjalności ≤ 50%) |
| Megaprojekty: liczba różnych wykonawców | ≥ 4 w 20 latach |
| Orzeł Telekom w megaprojektach | ≤ 40% |
| Podwykonawcy na specjalność | 3–8 |
| Przejęcia pionowe | 1–4 na grę 20-letnią; ≤ 40% podwykonawców specjalności w jednej grupie |
| REIT: wypłata, LTV | ≥ 80% zysku, ≤ 60% |
| REIT: stopa dywidendy | 3–8% rocznie |
| Marża, GIG sektora Budowlany i Bankowość | ±1 pp względem bazy |
| Kryzys bankowy 0.15.3 (spadek GIG, upadki) | w dotychczasowych celach |
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 |
| Czas kroku / zapis | +≤ 2% / +≤ 0,2% |

## Ryzyka

- **Zmiana wyniku Budowlanego** (wpływ na kryzys bankowy z 0.15.3) → pomiar ±1 pp.
- **Limit okna i konsorcja** mogą zablokować przetargi (brak chętnych) → fallback: przetarg powtórzony z poluzowanym limitem.
- **Zbyt agresywne przejęcia pionowe** zamykają rynek → limit 40%, aukcja bez omijania.
- **REIT pokrywa się z sektorem Nieruchomości** → inwentaryzacja w B0 przed B5.
- **Rozmiar wersji** → B5 (REIT) i B4 (banki) można przesunąć do osobnej wersji bez szkody dla B1–B3.

## Decyzje (podjęte 2026-10-25)

1. **Funkcja specjalna: REIT-y / fundusze nieruchomości** (obok banków).
2. **Podwykonawcy już są w grze:** prywatne firmy zależne albo niezależne, nienotowane — B2–B3 rozbudowują istniejący rejestr.
3. **Urząd antymonopolowy w 0.15.6;** w 0.15.5 tylko limit udziału w przetargach (B1).

## Prompt dla czatu implementującego B0

```
Wdrażasz część B0 planu 0.15.5 „Budownictwo i banki” (gałąź zmiany-AI, nowa gałąź robocza; po 0.15.4).
Przeczytaj: plany/plan_0.15.5_budownictwo_banki.md, plany/plan_sektor_budowlany.md, plany/raporty/diagnoza_0.15.4.md (jeśli jest),
plany/pomysly_na_kolejne_wersje.md (sekcja 9). Kod: companies.js, city.js, finance.js, ma.js, core.js, tests/przebiegi.html, tests/tests.html.
Zakres B0: sondy (udział wygranych przetargów wg spółki i okna 8 kw., HHI, liczba ofert, udział podwykonawców, wykonawcy megaprojektów,
kondycja spółek budowlanych i banków, stan REIT-ów); diagnoza przyczyn (Budimix, Orzeł Telekom, 62/66 u jednego podwykonawcy);
raport plany/raporty/diagnoza_0.15.5.md z inwentaryzacją REIT-ów. Niczego nie naprawiaj w B0. Testy muszą przechodzić. Commity po polsku, sondy osobno od raportu.
```
