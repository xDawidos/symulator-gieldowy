# Porządki 0.16.x → po 0.16.11 (usunięte pliki, graf, podział funkcji)

## 1. Usunięte pliki
| Co | Dlaczego |
|---|---|
| `plany/raporty/k4base,k4cz,k4de,k4de48,k4de57,k4pl,k4us.json`, `sim_015_final.json` (≈9,5 MB) | Surowe serie z przebiegów; Pliki były śledzone (wzorzec był tylko w `.graphifyignore`); teraz `plany/raporty/*.json` dopisane do `.gitignore`. Nikt ich nie czyta (żaden `*.js`, `index.html`, `tests`); wnioski są w raportach `.md` (`kontrola_*`, `pomiar_*`, `baza_0.16.md`). Odtwarzalne przez `run_przebiegi.mjs`. |
| `plany/design/stitch/export/` (5 folderów, ≈2,5 MB) | Bajt w bajt kopie folderów obok (`diff -r` bez różnic). Wzmianki w `plan_0.16.6` i `kontrola_0.16.5` o „nowszej wersji w export” są nieaktualne – identyczne. |
| `.vs/` (9 plików, ≈1 MB) | Cache Visual Studio, śledzony w repo (wzorzec tylko w `.graphifyignore`). Usunięty z repo, `.vs/` dopisane do `.gitignore`. |

Zostawione celowo: `graphify-out/.graphify_labels.json` (używa go graphify; `graph.backup-*.json` nie istnieją), `img/ikony` (źródła sprite'a), `img/logo`, `lib/*`, `data/*`, `img/globus`, `plany/design/zrzuty` (powołują się na nie raporty), `planyPoprzednie.zip`.

Plany oznaczone jako zastąpione: `plan_sektor_budowlany.md` (→ `plan_0.15.5_budownictwo_banki.md`).

Test po porządkach: 885/885.

## 2. Graf (graphify update + `graphify_polacz.py`)
- `graphify update .` → 4229 węzłów, 188 społeczności (bez `lib/`); `graphify_polacz.py` dopina 5843 krawędzi `calls` między plikami.
- **Poprawki narzędzi:** `lib/` dopisane do `.graphifyignore` (minifikowany `globe.gl.min.js` dawał ~1650 śmieciowych węzłów, 564 krawędzie jednego węzła); `graphify_polacz.py` przy drugim uruchomieniu liczył własne stare krawędzie jako „istniejące”, a potem je kasował (zostawało 230 z ~5800) — teraz pomija je w `existing`, wynik powtarzalny. Kopie `graphify-out/20*-*-*/` (backup przy update) i pliki `.graphify_labels.pending.json`/`.sig` w `graphify-out/.gitignore`.
- **Huby (krawędzie calls, bez testów):** `logEvent()` 428 (414 wejść z innych plików), `formatZl()` 199, `showToast()` 189, `getRandomInRange()`/`getRandomElement()` ~140, `escapeHtml()` 125, `recordPayment()` 123, `adjustCompanyCash()` 106. Pliki: najwięcej wywołań na zewnątrz `companies.js` 829, `ui.js` 499, `state.js` 349, `main.js` 324; najwięcej wywoływane `core.js` 1039, `ui.js` 743, `events.js` 510.
- **Największy rozkład (fan-out):** `applySaveSnapshot` 62 funkcji z innych plików, `runQuarterlyTick` 58, `runStockTick` 47, `createNewWorld` 47 — to naturalne „dyrygenty” (lista kroków), nie do dalszego cięcia bez zmiany kolejności efektów.
- **Nieoczekiwane zależności w nowych modułach:**
  - logika → interfejs: `countries.js` → `ui.js` (12), `forex.js` → `ui.js` (9) i → `currency_ui.js` (3), `currency.js` → `ui.js` (3), `exchange_clock.js` → `ui.js` (3), `foreign_companies.js` → `ui.js` (6). Główna przyczyna: formatery (`formatZl`, `formatNumberPl`, `escapeHtml`, `showToast`) mieszkają w `ui.js`; reszta to odświeżanie widoku z logiki.
  - cykle między modułami UI: `countries_ui.js` ↔ `internet.js`, `countries_ui.js` ↔ `currency_ui.js`, `countries.js` ↔ `countries_ui.js` (1 wywołanie w stronę UI), `countries.js` ↔ `foreign_companies.js` (11/6).
  - `country_picker.js` i `exchange_clock.js` są małe i luźno powiązane (OK); `countries_data.js` to same dane.
- **Kandydaci do podziału / dalszych porządków (nie robione tu):**
  1. Formatery z `ui.js` do osobnego `format.js` (ładowany przed logiką) — usuwa większość zależności logika → UI.
  2. `forex.js`: odświeżanie widoku przez zdarzenie/callback zamiast bezpośredniego wołania `currency_ui.js`.
  3. Dalsze długie funkcje: `renderStockTableRow` (315, po wyjęciu z `displayStocks`), `openManagementModal` (270), `displayStartups` (227), `resolveMerger` (201), `renderConstructionHistoryList`/`ResearchList` (~180), `initializeResearchForStock` (176), `renderChartSVGForStock` (166), `processAiLoansWeekly` (164), `processClientsWeekly` (153), case `banker` w `makeAiDecision` (146, ma `break` ze switcha w środku — wymaga ręcznej przeróbki).
  4. Pliki >5000 linii: `companies.js` (13,2 tys.), `ui.js` (9,5 tys.), `core.js` (6 tys.) — podział na moduły tematyczne to osobna wersja (kolejność ładowania w `index.html` i `tests/tests.html`).
- **Ekstrakcja semantyczna planów 0.15.4–0.19.2:** pominięta. `graphify update` robi tylko AST; semantyka wymaga przejścia skilla po ~25 plikach planów (czytanie każdego przez model, kilkaset tys. tokenów), a w grafie są już stare węzły dokumentów z poprzedniej ekstrakcji (np. powiązania planów 0.15.1/0.17.3 z kodem). Koszt nieproporcjonalny do zysku przy obecnym zadaniu; do zrobienia `/graphify --update` w osobnej sesji, jeśli potrzebne.

## 3. Podział funkcji (bez zmiany zachowania)
Zasada: ciała przeniesione dosłownie (tylko wcięcie), kolejność wywołań i losowań `Math.random` bez zmian; `return`/`continue` przerywające całą funkcję/pętlę zamienione na `return true` + `if (…) return/continue` u wołającego. Nazwy publiczne bez zmian (`debugStockTick` dalej wskazuje na tik giełdy). Po każdym podziale testy 885/885.

| Funkcja (plik) | linii przed → po | Nowe funkcje (linii) |
|---|---|---|
| `setGameSpeed` (main.js) | 526 → 111 | `runStockTick` (~230), `runWeeklyTick` (71), `runQuarterlyTick` (89), `runYearlyTick` (29) |
| `makeAiDecision` (ai.js) | 732 → 391 | `aiTurnReckless`, `aiTurnPoliceChief`, `aiTurnCalm`, `aiTurnWhale` |
| `displayStocks` (ui.js) | 581 → 268 | `renderStockTableRow` (315; dawna strzałka `renderStockRow`, teraz cienka obwolutka) |
| `processFinancialReports` (companies.js) | 355 → 139 | `computeQuarterOperatingResult`, `resolveQuarterlyBankruptcy`, `reactToEarningsSurprise`, `updateVolatilityAfterReport`, `payCityTaxFromEarnings` |
| `applySaveSnapshot` (main.js) | 374 → 265 | `restoreSavedStocks`, `restoreSavedTenders`, `restoreSavedProjects` |
| `updateStockPrices` (core.js) | 273 → 179 | `getStockTickModifiers`, `updateTradeLockAfterTick`, `recordStockPriceHistory` |
| `createNewWorld` (main.js) | 260 → 139 | `activateStartingBanks`, `listActiveBanksOnExchange`, `placeInitialAiDeposits` |
| `advanceSectorBubblesQuarterly` (core.js) | 260 → 29 | `applySectorBubbleShield`, `tryStartSectorBubble`, `advanceInflatingBubble`, `advancePoppingBubble`, `advanceRecoveringBubble` |

Kontrola po podziale: każda nowa funkcja zamknięta na poziomie 0 z zrównoważonymi nawiasami (skrypt), `node --check` po każdej zmianie.

## 4. Testy i seria porównawcza
- Testy po każdym kroku: **885/885** (`SIM_PORT=8791 SIM_CDP=9391 node plany/design/narzedzia/run_tests.mjs`).
- Seria `fundusz-gig`, 27 kw. ×200; baza = commit `28549e6` (po porządkach, przed refaktorem, osobny worktree), refaktor = HEAD. Dwie pary po 6 gier, uruchamiane równolegle:

| Seria | n | GIG CAGR śr. ± odch. | Marża śr. | ms/kw. (mediana) | Niezmienniki / ujemna gotówka / JS |
|---|---|---|---|---|---|
| baza, para 1 | 6 | 7,6% ± 4,6 | 22,9% | 1281 | 0 / 0 / 0 |
| refaktor, para 1 | 6 | 11,6% ± 3,5 | 22,9% | 1262 | 0 / 0 / 0 |
| baza, para 2 | 6 | 10,6% ± 4,7 | — | 1382 | 0 / 0 / 0 |
| refaktor, para 2 | 6 | 7,1% ± 3,5 | — | 1338 | 0 / 0 / 0 |
| **baza razem** | 12 | **9,1% ± 4,7** | | | 0 |
| **refaktor razem** | 12 | **9,3% ± 4,1** | | | 0 |

Wniosek: różnica +0,2 pp przy błędzie różnicy ≈ 1,8 pp — szum (w pierwszej parze +4 pp, w drugiej −3,5 pp). Czas kroku bez wzrostu (−1,5% / −3%), niezmienniki 0. Surowe JSON-y serii nie są commitowane (`plany/raporty/*.json`).
