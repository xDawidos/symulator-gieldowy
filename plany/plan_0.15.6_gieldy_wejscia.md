# Plan 0.15.6 „Giełdy wejścia” (po 0.15.5, przed 0.16.1)

Źródło: zgłoszenia z gry 2026-10-25 (`pomysly_na_kolejne_wersje.md`, sekcje 9.1–9.2) i decyzje z tego samego dnia. Plan pisany **bez czytania kodu** — stan rynków i progi poziomów do potwierdzenia w E0; liczby to propozycje do strojenia.

Cel: **wejście na giełdę ma znaczenie.** Główny parkiet (GPW) dostaje wyższe wymagania, NewHorizons staje się rynkiem dla spółek młodych i ryzykownych, powstaje giełda prywatna z łagodnymi wymogami i większym ryzykiem oszustwa, a urząd antymonopolowy pilnuje koncentracji. To też **ostateczne domknięcie limitu spółek** po 0.15.4.

Czego uczy:
- **Rynki główne i alternatywne** (GPW, NewConnect): wymagania, ryzyko, płynność.
- **Ścieżka spółki:** startup → główny parkiet albo NewHorizons → awans / firma prywatna / giełda prywatna.
- **Ryzyko oszustwa** na rynkach o słabym nadzorze.
- **Nadzór nad koncentracją** (urząd antymonopolowy).

Kolejność: E0 → E1 → … → E8. **Commit po każdej części** (część z kilkoma krokami — commit po każdym kroku). UI z komponentów 0.14.5; wygląd zleca czat designu. Zapis v15 bez zmiany numeru (pola opcjonalne).

---

## Punkt wyjścia (do potwierdzenia w E0)

| Element | Stan |
|---|---|
| Rynki | `finance.js`: GPW, XTD, PLU5, uśpiony EURONEXT; NewHorizons działa jako rynek (z zgłoszenia: państwowy); poziomy giełd od śmieciowej do platynowej |
| Startupy | pula (0.14.1), debiuty wg kategorii |
| Spółki miejskie | reguła debiutu z 0.15.4 P7 (nie wszystkie na giełdę) |
| Oszustwa | `stock.fraud`, audyty (`finishAudit`), korekta wyników (`revealFraud`) |
| Limit spółek | 0.15.4 P5: > 125 nie dłużej niż 4 kw. |
| Konkurencja w przetargach | 0.15.5 B1: limit udziału 40% w oknie 8 kw. |

## E0. Pomiar i diagnoza

- **Sondy:** liczba spółek na rynkach i poziomach, źródła spółek (z 0.15.4), wymagania debiutu (kapitalizacja, zysk, wiek, wolny obrót) wg poziomów, odsetek startupów, które debiutują, kto może inwestować w NewHorizons (boty, fundusze), koncentracja rynku wg sektorów (HHI).
- **Raport** `raporty/diagnoza_0.15.6.md`: odczytane progi i proponowane mnożniki.
- **Commit E0.**

## E1. Wymagania wejścia na GPW

- **Mnożnik wymogów** (kapitalizacja, zysk, wiek spółki, wolny obrót) rośnie z liczbą spółek krajowych: 1,0 do 100, liniowo do 1,5 przy ≥ 125.
- **Ścieżka „zawróć”:** spółka spadająca poniżej wymogów (po 4 kw.) przechodzi na NewHorizons zamiast upadać (delisting z wykupem po rynkowej cenie — z 0.15.4 P5).
- **Testy:** mnożnik, delisting bez ujemnej gotówki i „duchów posiadaczy”. **Commit E1.**

## E2. NewHorizons (państwowy operator)

- **Wymagania:** ok. 25–40% progów GPW (kapitalizacja i zysk), brak wymogu zysku dla spółek innowacyjnych; wolny obrót niższy.
- **Ryzyko i zmienność:** wyższe od GPW (zmienność ×1,3–1,6, szansa upadku ×2–3), ale **większy potencjał wzrostu**; spółki innowacyjne i wczesne.
- **Ograniczenia inwestorów:** nie wszystkie boty i fundusze mogą inwestować (reguła osobowości i mandatów; np. Stoik i fundusze bezpieczne nie; Spekulant i startupowe tak); gracz po odblokowaniu rynku.
- **Płynność:** minimalny popyt (market maker państwa) w limitach, żeby rynek nie zamarł.
- **Spółki atomowe** (0.17.2) tu nie wchodzą.
- **Testy:** wymogi, ograniczenia inwestorów, market maker. **Commit E2.**

## E3. Ścieżka startupów i giełda prywatna

- **Ścieżka (decyzja):** startup **celuje w główny parkiet** (kategorie brąz–platyna); jeśli nie spełnia wymogów — **niższy próg NewHorizons**; z NewHorizons: **awans na główny parkiet** (po spełnieniu wymogów) **albo firma prywatna albo wejście na giełdę prywatną**.
- **Giełda prywatna:** bez ostrych wymogów (jak NewHorizons lub niżej); **większa szansa, że spółka okaże się oszustwem** (propozycja: 25% vs 5% na GPW): ukryte problemy, zaniżona jakość raportów, upadek ze stratą inwestorów; wykrycie przez audyt (istniejące `stock.fraud`, `revealFraud`).
- **Testy:** ścieżki awansu, szansa oszustwa wg rynku, wykrycie. **Commit E3.**

## E4. Spółki miejskie

- Spółki miejskie startują na NewHorizons (część zostaje miejska — reguła 0.15.4 P7; cel: 30–60% spółek miejskich notowanych); awans na GPW wg E1.
- Nazwa „miasto” (0.15.4). **Commit E4.**

## E5. Urząd antymonopolowy

- **Poziomy 1–3** (rozwój przez wydatki państwa): coraz niższe progi interwencji.
- **Wskaźniki:** udział w przetargach (uzupełnienie limitu 40% z 0.15.5), udział rynkowy sektora (HHI), udział w kapitalizacji; **interwencje:** kara (propozycja 2–5% rocznego obrotu), nakaz podziału (wymuszony spin-off lub sprzedaż pakietu), zakaz przejęcia (w M&A).
- **Spójność:** przejęcia z 0.15.1, antymonopol z etapu 4 (`checkAntitrust`) — urząd zastępuje stałe progi progami zależnymi od poziomu.
- **Testy:** interwencje wg poziomu, zakaz przejęcia, nakaz podziału bez straty wartości dla posiadaczy. **Commit E5.**

## E6. Media-córka jako gazeta (opcjonalnie: na końcu, jeśli wersja nie jest za duża)

- Spółka zależna w Mediach wysyła graczowi maile, działa jak gazeta **przychylna matce** (lekko kłamie), może kłamać o przeciwnikach.
- **Oznaczenie źródła** w mailu; ryzyko zdemaskowania i kara (spójne z „czarnym PR” z 0.7); wiarygodność maleje po wykryciu kłamstw.
- **Testy:** przychylność, zdemaskowanie, kara. **Commit E6.**

## E7. Interfejs i Akademia

- Widok rynków (GPW, NewHorizons, prywatna), ścieżka spółki; karta wymagań debiutu; okno interwencji urzędu antymonopolowego.
- Akademia: „Rynek główny i alternatywny”, „Giełda prywatna i ryzyko oszustwa”, „Antymonopol”. **Commit E7.**

## E8. Kontrola końcowa

Pomiar z „Jak sprawdzimy”, raport `raporty/kontrola_0.15.6.md`, wiersz w mapie. **Commit E8.**

---

## Zlecenie dla czatu designu (przed E7)

1. Widok rynków (GPW, NewHorizons, prywatna) i **ścieżki spółki** (oś: startup → parkiet / NewHorizons → awans / prywatna).
2. Karta wymagań debiutu; okno interwencji urzędu antymonopolowego.
3. Oznaczenie ryzyka giełdy prywatnej słowem (nie samym kolorem); oznaczenie źródła w mailach media-córki.
4. **Mapa spółek jako drzewo genealogiczne** (jeśli nie zrobiona w 0.15.4).
5. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.

## Zapis gry i testy

- **v15, pola opcjonalne:** rynek spółki (GPW / NewHorizons / prywatna), mnożnik wymogów, poziom urzędu antymonopolowego, interwencje; przyrost < 0,3%.
- **Migracja:** istniejące spółki zostają na dotychczasowych rynkach.
- **Testy** (nowa grupa „0.15.6”, ok. 30): wymienione w częściach; niezmienniki po 20 latach; zapis i wczytanie w trakcie interwencji.

## Jak sprawdzimy

Przebiegi ×200: 20 gier × 6,5 roku bez presetu, 20 × 6,5 roku z `fundusz-gig`, 10 × 20 lat. Baza: kontrola 0.15.5.

| Miara | Cel |
|---|---|
| Spółki krajowe | 100–115 na koniec; > 125 nigdy dłużej niż 2 kw. |
| Udział spółek na NewHorizons | 15–30% |
| Startupy awansujące na główny parkiet | 20–40%; upadki na NewHorizons 2–3× częstsze niż na GPW |
| Giełda prywatna: udział spółek, oszustwa | ≤ 10% spółek; oszustwa ok. 5× częstsze niż na GPW |
| Wykrycie oszustwa (audyt) | ≥ 50% w ciągu 8 kw. |
| Interwencje antymonopolowe | 0–2 na 20 lat |
| GIG, marża | ±1 pp / ±0,5 pp względem bazy 0.15.5 |
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 |
| Czas kroku / zapis | +≤ 2% / +≤ 0,3% |

## Ryzyka

- **Zmiana GIG** (słabe spółki znikają z GPW, młodsze mniej stabilne) → pomiar ±1 pp, strojenie wymagań.
- **Boty omijają NewHorizons** → płynność zbyt niska; minimalny popyt (E2).
- **Giełda prywatna jako pułapka bez wyjścia** (frustracja) → wykrycie przez audyt, ostrzeżenie słowem, limit udziału gracza przy wejściu bez ostrzeżenia (np. ≤ 20% portfela).
- **Urząd antymonopolowy zbyt agresywny** → interwencje tylko w skrajnych przypadkach, kara przed nakazem.
- **Media-córka** wprowadza fałszywe informacje → oznaczenie źródła, możliwość zdemaskowania; E6 opcjonalne.
- **Rozmiar wersji** → E6 do przesunięcia.

## Decyzje (podjęte 2026-10-25)

1. **NewHorizons: państwowy operator**, ścieżka startupu: główny parkiet → (jeśli się nie uda) niższy próg NewHorizons → awans na główny parkiet albo firma prywatna albo wejście na giełdę prywatną (E3).
2. **Giełda prywatna:** łagodniejsze wymogi wejścia, ale większa szansa, że spółka okaże się oszustwem (E3).
3. **Urząd antymonopolowy w 0.15.6;** w 0.15.5 tylko limit udziału w przetargach.
4. **Media-córka jako gazeta (E6): opcjonalnie na końcu 0.15.6**, jeśli wersja nie jest za duża.

## Prompt dla czatu implementującego E0

```
Wdrażasz część E0 planu 0.15.6 „Giełdy wejścia” (gałąź zmiany-AI, nowa gałąź robocza; po 0.15.5).
Przeczytaj: plany/plan_0.15.6_gieldy_wejscia.md, plany/raporty/diagnoza_0.15.4.md i kontrola_0.15.5.md (jeśli są), plany/pomysly_na_kolejne_wersje.md (sekcja 9).
Kod: finance.js (rynki, poziomy), companies.js (debiuty, startupy, oszustwa), core.js, ma.js (checkAntitrust), tests/przebiegi.html, tests/tests.html.
Zakres E0: sondy (spółki wg rynków i poziomów, źródła spółek, wymagania debiutu, odsetek debiutów startupów, kto inwestuje w NewHorizons, HHI sektorów);
raport plany/raporty/diagnoza_0.15.6.md z odczytanymi progami i proponowanymi mnożnikami. Niczego nie zmieniaj w grze poza sondami. Testy muszą przechodzić. Commity po polsku.
```
