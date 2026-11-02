# Kontrola 0.17 S3 „Giełda towarowa”

Gałąź `claude/impl-017-s0b-891539` (od `7ae11ce` na `zmiany-AI`, nie scalona). Testy: **924/924** (było 915; S3 +9). Zapis bez podbicia wersji: pozycje w polu `forex` (nowe pole pozycji `expires`), ETC/ETF i boty w polu `commodities` (`f`, `b`). Surowe JSON-y: notatki sesji, `serie_s3/`.

## Co zrobiono (commit po każdym punkcie)
1. **Silnik depozytu** (`forex.js`, `0eebb88`): rynek może nadpisać `holdingCostYear` i `entrySpread` oraz podać `maxLeverageOf(instrument)` (nie więcej niż limit silnika 1:10), `expiresOf(instrument)` (pozycja dostaje `expires`, czyli tydzień `fxWeek`) i `settleOf(instrument)` (cena rozliczenia). W tygodniu zapadalności pozycja zamyka się z powodem `expiry` po cenie rozliczenia, z wpisem w dzienniku. Forex nie podaje tych pól, więc działa jak dotąd (test: koszt utrzymania i brak `expires`). Przy okazji: kwartał roku dla sezonu surowców liczy się teraz po kalendarzu gry (`q % 4 + 1`, jak `formatQuarterDate`); w S1 był przesunięty o kwartał.
2. **Rynek `commodities`** (`commodity_market.js`, `50f7b0c`):
   - Serie kwartalne `KOD-R{rok}Q{kw}` (np. `OIL-R3Q2`), 4 najbliższe zapadalności. Seria bieżącego kwartału znika z oferty na 2 tygodnie przed końcem.
   - Cena: `F = M^a · P^(1−a) · (1 + (r_USD + c)·T)`. `M` to cel z S1 razy sezon kwartału zapadalności. `r_USD` to stopa kraju USA (gdy dołączony), inaczej średnia z danych kraju. Koszt przechowania `c` jak w specyfikacji.
   - Wycena co tydzień po `F`; rozliczenie gotówkowe przy zapadalności po cenie bieżącej. Ceny w walucie bazowej po kursie USD, więc wynik zawiera kurs.
   - „Przedłuż” zamyka pozycję i otwiera tę samą na następnej serii (spread jak przy otwarciu).
   - Dźwignia: złoto 1:10; ropa, metale, zboże 1:5; gaz, węgiel, uran 1:3. Bez kosztu utrzymania, spread 0,3%, limit łączny wspólny z forexem (3× aktywa).
   - Dostępne bez umiejętności, z funduszem (do S7).
3. **ETC i ETF „Koszyk Surowców”** (`ae1cb95`): osobny portfel w stanie surowców (nie tablica `etfs`).
   - ETC: cena surowca × czynnik opłaty (−0,4%/rok, naliczany co tydzień). Koszyk: równe wagi 7 surowców, rebalans przy zamknięciu kwartału (wartość jednostki bez zmian), −0,6%/rok. Spread 0,2%.
   - Wymaga „Ekspert Rynków Globalnych” L1 (`etfExpert`).
   - Wartość wchodzi do `getFundAssets` i NAV; nie liczy się do limitu dźwigni.
   - **Podatek: brak** („jak forex”, a silnik depozytu nie pobiera podatku od zysku).
4. **Boty** (`4f8061c`, `dfd032c`):
   - Spekulanci to 2 krajowe boty agresywne (`reckless` Adam „Ryzyko”, `yolo_trader` Darek „Yolo”), najwyżej 2 pozycje na bota, szansa 6% na tydzień.
   - Sygnał: trend 13-tygodniowy (> ±5%), a bez trendu powrót do średniej (> ±10% od celu). Depozyt ≤ 5% gotówki, dźwignia 1–3.
   - Pozycje są w rejestrze `commodityState.bots`, nie w silniku gracza, i nie ruszają cenami. Rozliczenie przy zapadalności albo zamknięcie poniżej 50% depozytu.
   - Pozycje zabezpieczające spółek to tylko podgląd: `h × udział wsadu × przychód kwartału`, seria +3 kw.
   - **Zmiana liczby:** próg depozytu bota 500 → **50**. Gotówka botów jest w skali gry (start ok. 10 tys.), a przy 500 boty otwierały średnio 0,5 pozycji na grę.
5. **Interfejs roboczy** (`9c86a0a`, decyzja 20):
   - Zakładka „Giełda towarowa” w Kantory24, obok Forexu: lista 7 surowców (cena w USD, zmiana 13 tyg. ze strzałką i znakiem, krzywa słowem, dźwignia), serie wybranego surowca z „contango / backwardation” słowem i objaśnieniem, formularz jak w forexie, pozycje (depozyt liczbą i słowem: „bezpieczna / margin call / ryzyko zamknięcia”, tygodnie do zapadalności, „Przedłuż”, „Zamknij”) oraz tabela pozycji zabezpieczających spółek.
   - W panelu ETF blok „Surowce: ETC i ETF koszykowy”.
   - Bez nowych okien modalnych; kolor nie jest jedynym nośnikiem (strzałki, znaki, słowa).
   - Sprawdzone w przeglądarce: zakładka renderuje się, otwarcie kontraktu działa, konsola bez błędów.

## Testy S3 (9)
Silnik (reguły rynku, zapadalność, `expires` w zapisie, forex bez zmian); backwardation/contango wg znaku `P − M` i `F = P` w dniu zapadalności; rozliczenie gotówką i „Przedłuż”; dźwignia wg surowca, wspólny limit z forexem, margin call < 50% bez ujemnej gotówki; **exploit „kup pod średnią i roluj”** (200 przebiegów × 4 lata, kontrakty 1:1 na surowce > 10% poniżej celu, rozliczenie po 26 tyg.) ≤ stopa USD + 6 pp/rok; ETC (umiejętność, opłata 0,4%/rok, aktywa bez limitu dźwigni); ETF (rebalans bez zmiany wartości, równe wagi, opłata, zapis i wczytanie); boty (małe pozycje, ceny bez zmian, gotówka = start + wynik); interfejs.

## Seria PL ×200 (24 gry, 27 kw., preset `fundusz-gig`, 4 instancje równolegle; po poprawce progu botów)
| Miara | Wynik |
|---|---|
| Niezmienniki / ujemna gotówka / JS / kraje / `moneyWarn` / `invAfterLoad` / przerwane | **0 / 0 / 0 / 0 / 0 / 0 / 0** |
| GIG | 10,63% ± 4,80 (CI95 ±2,05; informacyjnie) |
| `earningsIndexCagr` / marża końcowa | 7,28% / 22,48% |
| **Zapis** | **średnio 2,416 mln znaków** (≤ 2,49 mln ✅); rozrzut duży: p90 2,59 mln, **8 z 24 gier > 2,49 mln**, maks. 2,617 mln; lz 14,9% limitu lokalnego |
| ms/kw. (4 równolegle) | 1544 (orientacyjnie) |
| **Boty na kontraktach** | 4,2 pozycji na grę (mediana 3,5), rozliczonych 3,7, margin call 0,13 na grę; wynik średnio **+169** na grę (odch. 700, mediana +4), łącznie +4 054 w 24 grach, czyli wokół zera, zgodnie z wyceną z oczekiwanym powrotem |
| Pierwsza seria (próg 500) | te same zera; zapis 2,366 mln; boty 0,5 pozycji na grę |

Ceny na koniec gry (P/średnia bez inflacji, mediana z 24 gier, pierwsza seria): złoto 1,02, ropa 1,22, gaz 0,96, węgiel 1,07, metale 1,24, zboże 1,12, uran 1,00. Inflacja USD 2%/rok daje ok. +14% po 6,5 roku, więc wartości > 1 są oczekiwane.

## Ryzyka i pominięte
- **Zapis:** średnia w budżecie, ale co trzecia gra przekracza 2,49 mln. Rozrzut wynika z gry (S2 + szum, odch. ok. 140 tys.); sam S3 przy presecie bez kontraktów dodaje kilka tys. znaków. Przed S7 warto zdecydować, czy budżet dotyczy średniej, czy p90.
- Depozyt botów jest poza ich gotówką i portfelem, więc ich wycena go nie widzi (najwyżej 2 × 5% gotówki).
- Preset `fundusz-gig` nie handluje kontraktami, więc kontrakty gracza sprawdzają tylko testy. Serię z presetem grającym na towarach warto dodać w S7 lub 0.17.1.
- Umiejętność „Mistrz Opcji” i blokada kontraktów: S7. Akademia (`kontraktTerminowy` jest odblokowywany, ale bez treści): S7.
