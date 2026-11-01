# Kontrola 0.17 S0b „Odchyłki z bazy i sonda”

Gałąź `claude/impl-017-s0b-891539` (od `df49988` na `zmiany-AI`, nie scalona). Testy: **906/906** (było 905; +1 test zapisu krajów, +2 asercje w teście E3). Zapis bez zmiany wersji (nowe pole opcjonalne `n` w wierszu emitenta kraju). Surowe JSON-y serii i diagnozy: notatki sesji, `serie_s0b/`.

## Co zrobiono
1. **Ujemna pula „kwity” po wczytaniu i nadmiar spółek kraju** (`countries.js`). Na żywo pula nie jest ujemna: `checkGdrInvariants` wchodzi do `checkWorldInvariants`, sprawdzanego w każdej próbce, i daje 0. Błąd powstaje przy wczytaniu, z dwóch przyczyn:
   - córka obcej spółki przed pierwszym raportem nie ma fundamentów, więc jej wiersz nie ma pola `c`, a liczba akcji nie trafiała do zapisu. Po wczytaniu wracało domyślne 10 mln akcji, mniej niż pakiet matki, więc `float` wychodził ujemny (symbole `XXXZn.KR`). Teraz wiersz bez `c` zapisuje `n`, jeśli liczba akcji różni się od domyślnej;
   - wczytanie tworzyło wszystkie spółki z definicji kraju, także te zdjęte z giełdy (upadek, przejęcie D3). Stąd „CZ 16 > limit 15”. Teraz powstają tylko spółki obecne w zapisie.
   Test regresji: na starym kodzie zgłasza `10000000 ≠ 25000000`, na nowym przechodzi.
2. **`moneyWarn` inkubatora** (`companies.js`, `handleSuccessfulIPO`). Bisekcja na archiwalnych seriach z notatek: 0.16.2 20 lat 2/20 gier, baza 0.17 10/12. Błąd istniał więc już przed 0.16.1, a nasila się, gdy giełdy są pełne. Diagnoza łatką tygodniową w 6 grach 20-letnich: wszystkie 26 rozjazdów dotyczyły startupu w `awaitingListing` i zawsze znikały bezpośrednie roszczenia botów (`ai.portfolio`), a pula, fundusze kolegów i banki zostawały. Przyczyna: `purgeSymbolHolders` (P3 z 0.13.1) czyścił posiadaczy symbolu przed `chooseDebutMarket` (0.15.6 E3). Gdy żaden rynek nie miał miejsca, startup szedł do kolejki bez roszczeń botów. Czyszczenie przeniesione za wybór rynku. Test w E3 („NH pełny”): na starym kodzie `undefined ≠ 40000`.
   Przy okazji naprawione: `consolidateSupervisedFund` (`player.js`) nie przenosił `manager.fund.startups` do gracza, choć wliczał je do wyceny jednostek. Teraz roszczenia trafiają do `playerPortfolio` jako `investedAmount`. Test w B7 (na starym kodzie `undefined ≠ 20000`). Wywołuje to tylko przycisk w UI, więc przebiegi tego nie obejmowały.
3. **Sonda serii**: w `tests/przebiegi.html` nowy blok `PROBE_017` (pole `s017`: kapitalizacja GPW `capPl` i spółek krajów `capForeign` w PLN, przejęcia D3 `d3 {n, domAcq, domTgt}`) oraz `saveCheck.lzShare`. `baza_serie.mjs`: `invAfterLoad` (liczba gier), `moneyWarnQ`, `lzShare`, `capAll`, `d3Dom` w podsumowaniu i w wierszu wydruku.
4. **Harness**: `loadFrame` (w `tests/przebiegi.html`, bo tam jest pobieranie) ponawia raz po 2 s, gdy fetch rzuci błąd. Do tego `run_przebiegi.mjs --patch=plik.js` (kod łatki w ramce, użyty do diagnozy z p. 2).

## Pomiar (preset `fundusz-gig`, ×200; 4 instancje równolegle)
| Seria | n | GIG (± odch., CI95) | Marża | Zapis | lz/limit | ms/kw. | Niezm. / ujemna got. / JS | `invAfterLoad` | `moneyWarn` |
|---|---|---|---|---|---|---|---|---|---|
| baza 0.17 PL 27 kw. | 48 | 9,9% (± 1,15) | 22,2% | 2,327 mln | — | 1213 (sekw.) | 0/0/0 | 3/48 | 0/48 |
| **S0b PL 27 kw.** | **24** | **11,1% ± 3,7 (± 1,6)** | 22,4% | 2,364 mln | 14,5% | 2032 (4 równol.) | **0/0/0** | **0/24** | **0/24** |
| baza 0.17 PL 20 lat | 12 | 13,8% ± 1,7 | 21,2% | 3,72 mln | — | 3046 (8 równol.) | 0/0/0 | 8/12 | 10/12 |
| **S0b PL 20 lat** | **4** | 13,3% ± 1,6 | 20,8% | 3,58 mln | 21,4% (19–23%) | 3988 (4 równol.) | **0/0/0** | **0/4** | **0/4** |

- Cel S0b osiągnięty: `invAfterLoad` = 0 i `moneyWarn` = 0, niezmienniki 0, przerwań 0/28.
- GIG PL +1,2 pp względem bazy mieści się w szumie (CI95 ±1,6 przy n = 24; σ między grami 3,7–3,9 pp). Obie poprawki działają tylko przy wczytaniu i przy kolejce debiutów, więc nie powinny ruszać GIG. Czasu kroku nie porównuję, bo pomiar był równoległy, a nie sekwencyjny.
- Nowe miary (PL 27 kw.): łączna kapitalizacja ≈ 378 mld PLN (20 lat: 1152 mld); przejęć D3 13 na 24 gry, w tym krajowy kupiec 0%, krajowy cel 92% (20 lat: 19 przejęć, 5% / 68%). Zapis lz zajmuje 14,5% limitu lokalnego (20 lat: 21%), więc zapas jest duży.

## Pominięte
- Lista spółek `propozycja_spolek_0.17.md`: zgodnie ze zleceniem wchodzi w S2 i S4.
- Seria 20-letnia tylko 4 gry (wcześniej 12). Wystarcza do rozstrzygnięcia 0 vs 10/12, ale nie daje dokładnego GIG.
