# Spis 0.18.6 (O0): debug, puste kontenery, formatowanie poza helperami

Stan: `zmiany-AI` po 5107f8f. Narzędzie: `plany/design/narzedzia/spis_formatow.mjs` (tabela; `--lista` daje wszystkie miejsca z klasą; `--kontrola` to bramka O3).

## 1. Debug (do O1 → `debug.js`)

| Miejsce | Co | Uwagi |
|---|---|---|
| `index.html` 595–641 | `.debug-settings`: przycisk `#debug-toggle-btn` i blok `#debug-tools` (8 przycisków, wybór fazy rynku, mapa rodowa `<details>`, wybór bańki) | style inline w 9 miejscach → klasy w `style.css` |
| `index.html` 365–368 | `.speed-btn.debug-only` ×10, ×50, ×100, ×200 | zostają w pasku (pokazuje je `applyDebugModeUi`) |
| `ui.js` 7379–7570 | `isDebugMode` (zostaje), `applyDebugModeUi`, `toggleIntroSkip`, `toggleDebugMode`, `debugAddWallet`, `debugAddFund`, `debugShiftRelations`, `debugEndPeriod`, `debugBoardReview`, `debugSetMarketPhase`, `debugCheckInvariants` | `checkWorldInvariants` zostaje w `ui.js` (czytają go testy i przebiegi) |
| `core.js` 3170–3600 | `debugTriggerSectorBubble`, `debugPopSectorBubble`, `debugTriggerMarketCrash`, `debugTriggerMarketHalt` | sprawdzić wywołania z gry i testów przed przeniesieniem |
| `companies.js` 6935 | `renderGenealogyDebug` | używa danych genealogii (kod gry), przenosimy tylko wywołanie UI |

## 2. Puste kontenery (do O2)

W `index.html` są 102 elementy z `id` bez treści. W świeżej grze przed pierwszym tickiem na ekranie głównym puste i widoczne jest tylko `#topbar-mood-slot` (celowo: wskaźnik nastroju od poziomu analityka). Puste przed pierwszym kwartałem, ale niewidoczne: `#indexes-container`, `#etf-table-body`, `#commodity-etf-box`. Reszta to kontenery okien wypełniane przy otwarciu. Sprawdzi je test DOM w O2: otwiera okna po kolei i szuka widocznych pustych kontenerów oraz gołych tekstów „Brak …” bez komponentu.

Teksty „Brak …” do zamiany na `renderEmptyState` (pierwsza kolejka według planu: portfel, pozycje, aukcje, poczta, Tied, klienci, kontrakty, łańcuchy): `ui.js` 58, `learning.js` 4, `countries_ui.js` 2, `internet.js` 2, `tied.js` 2, `chains_ui.js` 1.

## 3. Formatowanie poza helperami (do O3)

Klasy: **tekst** = trafia do tekstu dla gracza; **svg** = współrzędne i style (zostają); **obliczenie** = zaokrąglenie wracające do liczby (zostaje); **obliczenie?** = do przejrzenia ręcznie; **log** = konsola (zostaje); **dane** = wyrażenia podmiany waluty i słownik symboli (zostają).

| Plik | toFixed/tekst | toFixed/svg | toFixed/obliczenie | toFixed/obliczenie? | toFixed/log | toLocaleString/tekst | toLocaleString/obliczenie? | zł/tekst | zł/dane |
|---|---|---|---|---|---|---|---|---|---|
| ui.js | 75 | 16 | 1 | 7 | 0 | 17 | 3 | 1 | 0 |
| companies.js | 49 | 1 | 0 | 0 | 4 | 9 | 0 | 0 | 0 |
| learning.js | 44 | 0 | 0 | 4 | 0 | 1 | 0 | 6 | 0 |
| player.js | 37 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| state.js | 26 | 1 | 0 | 0 | 0 | 7 | 0 | 0 | 0 |
| ma.js | 13 | 0 | 0 | 0 | 0 | 15 | 0 | 0 | 0 |
| core.js | 25 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| ai.js | 11 | 0 | 0 | 0 | 5 | 6 | 0 | 0 | 0 |
| finance.js | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| currency_ui.js | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 5 |
| campaigns.js | 7 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| listings.js | 4 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 0 |
| energy.js | 0 | 0 | 2 | 4 | 0 | 0 | 0 | 0 | 0 |
| countries.js | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| currency.js | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| foreign_companies.js | 1 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 |
| events.js | 3 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| exchange_clock.js | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| splits.js | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| index.html | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| crises.js | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| main.js | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| bots_domestic.js | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| commodities.js | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| commodity_market.js | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| energy_ui.js | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| flags.js | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| forex.js | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| goods.js | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| infrastructure.js | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| reits.js | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| security.js | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| tied.js | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **razem** | **326** | **23** | **4** | **16** | **11** | **64** | **3** | **24** | **6** |

Do wymiany w O3: **326 `toFixed` w tekstach, 64 `toLocaleString` w tekstach, 24 „zł” w tekstach**. „obliczenie?” (16 + 3) przejrzę ręcznie przy pliku. Klasyfikacja to heurystyka z wyrażeń regularnych: część „tekst” to diagnostyka (np. `checkGoodsRegistry` w `goods.js`), którą zostawiam jako log.
