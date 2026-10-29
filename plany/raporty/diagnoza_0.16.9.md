# Diagnoza 0.16.9 (W3) „Spółki zagraniczne jak krajowe w interfejsie i na poziomach giełd”

Stan wyjściowy: gałąź `claude/impl-0169-b39bd6` na `712d1e7`, testy 863/863, zapis v19. Cel: bez kopiowania renderowania, bez przenoszenia spółek obcych do `stocks` (wariant A′ z diagnozy 0.16.7 zostaje).

## 1. Jak spółka trafia na poziom giełdy

| | Krajowa (`stocks`) | Zagraniczna (`foreignIssuers`) przed W3 |
|---|---|---|
| Poziom | `stock.exchange` ∈ JUNK…PLATINUM wg ceny w PLN (`exchanges[].minPrice/maxPrice`), przegląd okresowy `reviewCompanyPlacements` (awans/spadek z newsem) | brak pola; spółki kraju połączonego stały w osobnym bloku „kraj” pod krajowymi, niepołączonego tylko w Kantorze |
| Elita | `assignEliteExchanges` (ranking kapitalizacji z Platyny: Diament 1, Szmaragd 3 ≥ 2,5 mld, Rubin 6 ≥ 1,5 mld), premie `applyEliteBonuses` (zmienność, odporność) | brak |
| Wymogi dostępu | `playerAccessLevel ≥ exchanges[...].level` (wiersz zablokowany) | tylko bilet kraju (niepołączony) albo nic (połączony) |
| Zmiany poziomu | ±3% kursu i news | brak |

**Decyzja (bez zmiany stanu gry, GIG-neutralnie):** poziom obcej jest *pochodną* ceny i kapitalizacji w PLN liczoną na żądanie (`getForeignTier`), nie polem w zapisie. Nie ma awansów z efektem ceny ani premii zmienności elit dla obcych (to zmieniałoby model kursu obcych, a ten ma korelację z GIG wyregulowaną w 0.16.7). Skutki:
- **Kraj połączony:** poziomy *naszych* giełd: Śmieciowa…Platynowa po cenie w PLN tymi samymi progami co krajowe; Szmaragd/Rubin po kapitalizacji ≥ progu, w osobnych limitach (3/6) liczonych tylko wśród spółek krajów połączonych; Diament jest jeden i krajowy. Dostęp do zakupu wg `playerAccessLevel` (jak krajowe).
- **Kraj niepołączony:** te same progi cenowe jako własne poziomy giełdy kraju, etykieta „DAX: Giełda Srebrna” (operator z `countries_data.js`); bez elit, bez blokady poziomem (jest bilet).

## 2. Okno spółki: krajowa vs zagraniczna (przed W3)

| Element | Krajowa | Zagraniczna |
|---|---|---|
| Wejście | ikona karty w wierszu, klik wiersza otwiera szufladę (Kup/Sprzedaj, Wykres, Akcjonariat, Walne, Inwestycje) | brak karty; linia tekstu pod nazwą (`renderForeignCompanyLine`), inline Kup/Sprzedaj |
| Zakładki | Przegląd, Finanse, Akcjonariat, Zarządzanie, Zatrudnienie, Grupa | brak |
| Wykres | `renderChartSVGForStock` (świece z `candlestickHistory`, linia z `lineHistory`) | brak; dane są w `i.history` (13 tyg., ceny w walucie spółki) |
| Źródło danych | `stocks.find(symbol)` w ~12 miejscach ui.js | `foreignIssuers[id]`; pola walutowe w walucie kraju |

Wspólny kod karty zakłada PLN w ~25 miejscach (`formatZl`) oraz funkcje powiązane ze `stocks` (akcjonariat, walne, koncern, zatrudnienie).

## 3. Podpięcie — wspólny widok „źródło danych”

- `getCompanyCardSource(symbol)` (`foreign_companies.js`): spółka krajowa albo **widok spółki obcej** (`buildForeignCardStock`) — kopia przeliczona na PLN po bieżącym kursie, w kształcie spółki krajowej (segmenty, bilans, fundamenty, historia dywidend, `weeklyCloses`). Dzięki temu nagłówek, kafelki, Finanse i wycena renderują się *tym samym kodem*; w nagłówku dodatkowo cena i waluta spółki, kraj, poziom giełdy.
- Zakładki obcej: Przegląd (reużywa kodu krajowego + wykres), Finanse (kod krajowy), Akcjonariat/Zarządzanie/Grupa (krótkie widoki własne: akcjonariusze z `holders`, próg wezwania i nadzór kraju, brak spółek zależnych); Zatrudnienie ukryte.
- Wykres: `renderChartSVGForStock` dostaje spółkę z `foreignHistory` i rysuje linię (bez świec i alertów) tym samym kodem osi/siatki/segmentów; okno „Wykres” (`showPriceHistoryModal`) i karta korzystają z tego samego źródła.
- Lista główna: obce wiersze wchodzą do pętli giełd *razem z krajowymi* (grupa sektora, sortowanie ceny w PLN, „Kraj” jako klucz wtórny, zwijanie giełdy). Zniknął blok „kraj”.
- Dywidendy: `divHistory` (4 ostatnie, waluta spółki) daje stopę dywidendy jak u krajowych; skalowana splitem; zapis polem `dh` wiersza (opcjonalne pole, bez zmiany wersji).

## 4. Zakres pominięty w W3 (zob. raport kontroli)
Walne zgromadzenia, spółki zależne i zlecenia strategii obcych (W2.2), zatrudnienie (W2.3), premie zmienności elit i ±3% przy zmianie poziomu.
