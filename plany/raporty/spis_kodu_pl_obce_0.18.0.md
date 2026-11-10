# Spis podwójnego kodu: spółki polskie i zagraniczne (0.18.0 R0, 2026-11-10)

Stan: `zmiany-AI` po 0616037 (kod jak d0f193e). Spółka krajowa to obiekt w `stocks` (`companies.js`), spółka zagraniczna to emitent w `foreignIssuers` (`kind: 'share'`, cena w walucie kraju, posiadacze w `holders`). Od 0.16.7 oba typy liczą wynik kwartalny tą samą funkcją `computeQuarterResults`, a od 0.16.9 karta spółki działa na wspólnym widoku `getCompanyCardSource` / `buildForeignCardStock`.

Decyzja o liście (autonomicznie, zgodnie z poleceniem): łączymy to, co gracz widzi jako „ten sam ekran” i co liczy graf (podsektor × kraj); modele cen i posiadania zostają osobne, bo różnią się z założenia (waluta, bilet, nadzór kraju), a ich połączenie to przepisanie `countries.js` i `ma.js`.

| # | Funkcja | Krajowe | Zagraniczne | Łączymy? | Koszt | Część |
|---|---|---|---|---|---|---|
| 1 | Wiersz tabeli akcji | `renderStockTableRow` (`ui.js`) | `renderLinkedStockRow` (`countries_ui.js`) | **tak, zachowanie**: klik w wiersz otwiera szufladę także bez dostępu do poziomu (Z3). Dwie funkcje rysujące zostają (inne kolumny ceny) | S | R1 |
| 2 | Szuflada (kup, sprzedaj, wykres, akcjonariat) | `renderStockDrawer` | gałąź `foreignIssuer` w tej samej funkcji | **tak**: wspólny pasek narzędzi (wykres, akcjonariat), przy braku dostępu przyciski handlu wyłączone z opisem, wykres działa | S | R1 |
| 3 | Wykres ceny | `showPriceHistoryModal` | to samo (linia tygodniowa w walucie, bez świec i alertów) | już wspólne (0.16.9) | — | — |
| 4 | Karta spółki | `openDescriptionModal` + `getCompanyCardSource` | widok `buildForeignCardStock` | już wspólne (0.16.9) | — | — |
| 5 | Wykres akcjonariatu | `renderOwnershipPieChart` | ta sama funkcja, „na rynku” z `getGdrFree` | wspólne; nazwa pomocnika zmienia się w R2 (`getIssuerFree`) | S | R2 |
| 6 | Posiadanie akcji obcych | `playerPortfolio[symbol]` | `issuer.holders.player` przez `getGdrHeld` | **nie** (inny rejestr, waluta); zostaje jedna nazwa `getIssuerHeld` po usunięciu GDR | S | R2 |
| 7 | Kupno i sprzedaż | `buyStock` / `sellStock` (`player.js`) | `buyForeignShares` / `sellForeignShares` (`countries.js`), `marketsUiTrade` | **nie**: rozliczenie w walucie, kantor, bilet, prowizja kraju. Szuflada woła właściwą funkcję | L | — |
| 8 | Poziom giełdy | pole `stock.exchange` z ceny (`companies.js:7392`) + ranking elitarnych (`finance.js`) | `getForeignTier` (cena w PLN, Szmaragd/Rubin z własnego rankingu) | **tak**: jeden pomocnik „poziom z ceny w PLN” (`getPriceTierKey`) używany w obu miejscach | S | R3 |
| 9 | Wynik kwartalny | `computeQuarterResults` + `recordQuarterFundamentals` | `runForeignReport` woła te same funkcje | już wspólne (0.16.7) | — | — |
| 10 | Dywidenda | `payDividendToShareholders` | `payForeignDividend` (podatek u źródła, waluta) | nie (waluta i podatek), mała różnica logiczna | M | — |
| 11 | Podział akcji | `splits.js` | `maybeForeignSplit` / `applyForeignShareChange` | nie w 0.18.0; diagnoza w R3, bo poziom zależy od ceny | M | R3 (diagnoza) |
| 12 | Prezes i cechy | `ceoTraits` (`companies.js`) | `newForeignCeo` z tej samej puli | **tak + pula narodowa** (Z6) | S | R4 |
| 13 | Upadłość | ścieżka krajowa w `companies.js` | `maybeForeignBankruptcy` | nie (uproszczona, bez sądu i wierzycieli krajowych) | L | — |
| 14 | Walne i kampanie | `ma.js` | te same funkcje z gałęzią `isForeignShare` | już wspólne (0.16.12) | — | — |
| 15 | Ruch ceny tygodniowy | silnik krajowy (`core.js`, `state.js`) | `stepCountryIssuer` (`countries.js`) | **nie**: to dwa modele z założenia (pełny i uproszczony); połączenie = W2/LOD w 0.18.5 | XL | — |
| 16 | Profil podsektora dla grafu | `getMainSubsector(stock)` + segmenty | `issuer.subsector`, `issuer.sectors` | **tak**: jeden odczyt „podsektor × kraj × przychód” dla `chains.js` (`getChainUnits`) | S | P2 |

## Co zmienia gracz

- Spółkę obcą na każdym poziomie (także diamentową i bez biletu) da się otworzyć w szufladzie i na wykresie bez kupowania (Z3).
- Po R2 nie ma kwitów GDR; akcje obce kupuje się tak jak dotąd: przez rynek kraju albo z głównej listy, gdy giełdy są połączone.

## Co nie zostało sprawdzone

Lista powstała z przeglądu kodu (`grep` po `foreignSource`, `isForeignShare`, `getGdrHeld`, `foreignIssuers`), bez pełnej analizy zależności `ma.js`.
