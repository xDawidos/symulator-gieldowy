# Diagnoza 0.16.7 (F0) „Pełne spółki zagraniczne”

Stan wyjściowy: gałąź `claude/impl-0167-279746` na `78a51f1` (= zmiany-AI po 0.16.6), testy 841/841, zapis v17. Pomiary: `plany/design/narzedzia/probe.mjs` (wyrażenie JS na stronie testów w headless Edge), liczby czasu kroku i zapisu z `kontrola_0.16.4.md` / `kontrola_0.16.6.md` (przebiegi ×200).

## 1. Co robi spółka krajowa w kroku kwartału (`main.js` pętla kwartalna)
Jedna spółka z `stocks` przechodzi przez ~45 procedur. Pogrupowane:
- **Rdzeń finansowy (tani, czysty):** `computeQuarterResults` (przychód z cyklu sektora, PKB, inflacji, marża, amortyzacja, odsetki, CIT), `recordQuarterFundamentals` (historia 4 kw., EPS, niespodzianka vs konsensus), `updateFundamentalRatios` (wartość godziwa), `updateHealthFromProfitability`, bilans (`adjustBalanceSheet`/`adjustCompanyCash`), reakcja ceny na raport, polityka dywidendy (`declareQuarterDividend` → `payCompanyDividend`), bankructwo, prezes (`generateCeoCandidate`, `updateCeoTenureAndAge`), split (`splits.js`).
- **Rdzeń „krajowy” (ciężki, uwikłany w `stocks`):** M&A i przejęcia (`ma.js`, `checkForPotentialMA`), spółki zależne / wydzielenia / koncerny, walne zgromadzenia (governance), KNF i próg wezwania, zatrudnienie i strajki (workforce), R&D, inwestycje operacyjne, kreatywna księgowość i audyt, mafia/korupcja/policja, projekty specjalne, REIT-y, banki, ETF-y, listing/rynki NH, limit 115 spółek (`enforceListingLimitQuarterly`), indeksy GIG/SIG40/BSIG80.

## 2. Co zakłada jedną giełdę / PLN (pomiar liczbowy)
- `stocks` występuje **759 razy w 20+ plikach** (`companies.js` 201, `ui.js` 88, `state.js` 58, `ai.js` 56, `core.js` 55, `finance.js` 54, `ma.js` 49, `learning.js` 48, `main.js` 44, `player.js` 40…). Każde miejsce zakłada: cena i gotówka w PLN, portfel w `playerPortfolio[symbol]` (nie ma pola waluty), jeden indeks (GIG), jedna stopa, jeden skarb (`governmentTreasury`), jedną listę dla limitu 115, jeden bilet-less rynek.
- Dywidenda krajowa (`payDividendToShareholders`): wypłaca z `playerPortfolio`/`ai.portfolio` w PLN i podatkiem krajowym — obcy posiadacze są w `issuer.holders` (ilość) z gotówką w walucie (`playerCashByCurrency`, `addCurrencyCash`).
- `computeQuarterResults` dolicza CIT i dotację do `governmentTreasury` i `society.budget` (krajowych) — dla obcej spółki trzeba to przekierować do skarbu kraju (`countryState[kraj].treasury`).
- Progi w PLN: split od 1000 zł (`SPLIT_PRICE`), dywidenda minimalna 0,01 zł (`MIN_DIVIDEND_PER_SHARE`), `Math.max(1000, przychód)` — dla JPY/TWD/INR progi są zbyt niskie, dla CHF/USD zbyt wysokie → przeliczenie przez `fromPln(…, waluta)`.

## 3. Pomiar kosztu
| Wielkość | Wartość | Źródło |
|---|---|---|
| Spółek krajowych na starcie / po 6,5 roku | ok. 85 / do 110–115 | kontrole 0.15.x |
| Czas kroku kwartału (cała gra) | 1231 ms (bez krajów), 1362 ms (10 krajów + forex), 1162 ms (0.16.6) | kontrola_0.16.4/6 |
| → koszt jednej spółki krajowej | ≈ 11 ms/kw. (cała maszyneria) | 1,2 s / ~110 |
| Zapis (znaki) | 2,22 mln bez krajów, 2,28 mln z 10 krajami (kraje ≈ 30 tys.) | kontrola_0.16.4 |
| → zapis na spółkę krajową | ≈ 20 tys. znaków po 6,5 roku (1,5 tys. na starcie) | 2,2 mln / 110 |
| Spółek zagranicznych w 10 krajach | 127 (DE 16, US 19, CZ 9, SE 9, CH 8, FR 13, JP 16, CN 17, IN 14, TW 6) | `countries_data.js` |
| Obecna spółka zagraniczna | 444 B w pamięci, ≈ 210 B w zapisie, ≈ 1 ms/kw. łącznie na kraj | probe + G6 |
| **Rdzeń finansowy na obcej spółce** (`computeQuarterResults` + fundamenty) | **0,012 ms/kw. na spółkę; 853 B fundamentów** | probe (53 spółki) |

Wnioski liczbowe:
- **Wariant A dosłowny** (127 spółek w `stocks` ze wszystkimi procedurami): +127 × 11 ms ≈ **+1,4 s/kw. (+115%)** i +127 × ~20 tys. ≈ **+2,5 mln znaków (+110%)** zapisu. Przekracza każdy rozsądny budżet i dotyka 759 miejsc.
- **Rdzeń finansowy na wspólnym kodzie** kosztuje 127 × 0,012 ≈ **1,5 ms/kw.**; z historią i bilansem ≈ 2–3 tys. znaków zapisu na spółkę ≈ **+0,3 mln (+13%)** przed kompresją.
- Budżet F4 (ustalony tu): czas kroku **≤ +15%** względem 0.16.6 (≈ +175 ms), zapis **≤ +12%** (≈ +270 tys. znaków) przy 10 krajach i 127 spółkach.

## 4. Decyzja o architekturze
Wariant A (jedna lista z polem `country`) **wymaga większej przebudowy, niż zakładał szkic**: 759 odwołań do `stocks`, a portfele gracza i botów, indeks, limit 115, listing, UI i podatki nie mają pojęcia waluty ani rynku. Przebudowa tego w jednej wersji groziłaby regresją wszystkiego, co działa (GIG, wyniki krajowe, zapisy).

**Wybrana ścieżka (bezpieczniejsza): wariant A′ „wspólny model i wspólny kod, osobny magazyn”.**
- Spółka zagraniczna zostaje w `foreignIssuers` (tam ma posiadaczy w walucie, bilety, bezpiecznik, nadzór kraju, boty zagraniczne) — **magazyn jest jeden na rynek** i niezależny od `stocks`.
- Dostaje te same pola co krajowa (`totalShares`, `symbol`, `market`, `balanceSheet`, `cash`, `financialHealth`, `fundamentals`, `ceo`, `dividend*`) i **te same funkcje** liczą jej wynik (`computeQuarterResults`, `recordQuarterFundamentals`, `updateHealthFromProfitability`, `generateCeoCandidate`, reguły dywidendy i splitu — z progami przeliczonymi na walutę). Nie ma gałęzi „zagraniczna” w tych funkcjach, jest jeden cienki adapter (`foreign_companies.js`): kurs/waluta, skarb kraju, wypłata dywidendy do `holders`.
- Poza wspólnym kodem zostają świadomie procedury „krajowe, ciężkie” (M&A między spółkami, spółki zależne, walne, strajki, R&D, mafia, księgowość oszukańcza). Obcy emitenci mają ich odpowiedniki z 0.16.2–0.16.6 (nadzór kraju, próg wezwania, boty zagraniczne, kryzys przenoszony na kraj, spółki specjalne) — nie powielamy 45 procedur ×127.
- To jest „wariant A” w sensie modelu (jedno źródło prawdy o tym, jak liczy się spółka) i „wariant B” w sensie magazynu. Przejście do jednej listy zostaje opcją po stabilizacji (wymagałoby portfeli wielowalutowych — osobna wersja).

## 5. Podział wersji
- **0.16.7:** F0 (ten raport), F1 (model + zapis v18 z migracją), F2 (raporty, bilans, dywidendy, splity, prezesi, bankructwa/ratunek, kryzysy i spółki specjalne na wspólnym kodzie; spółki państwowe tylko GPW bez zmian).
- **0.16.8:** F3 (limity spółek zależne od wielkości kraju), F3b (zegar giełd i godziny sesji), F4 (budżet czasu/zapisu), F5 (parytet, pomiar ×200, raport). Podział wynika z rozmiaru; zamykam 0.16.7 przed F3 (commit i testy po każdym etapie).
