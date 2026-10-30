# Kontrola 0.16.12 „Dokończenie krajów” (D1–D5)

Gałąź `claude/impl-01612-ad014c` (nie scalona, bez zmian w `zmiany-AI`/`main`). Testy: **895/895** (było 886; grupa „0.16.12 Dokończenie krajów”: D1 1, D2 2, D3 4, D4 2). Zapis **v21** (nowe pola opcjonalne: `pp` i `g.par` w wierszu emitenta, stare zapisy wczytują się bez zmian).

## Co zrobiono
- **D1** (`foreign_companies.js`): `foundForeignSubsidiary` — spółka zagraniczna zakłada najwyżej 1 córkę i 2 zależne (≤ 3 powiązane; pierwsza to „córka”, kolejne „zależne”). Nazwa i segment z `pickSubsidiaryName`/`pickSubsidiarySegment` (skrót długiego członu do 3 liter bez polskich znaków, np. „Stedigital” od „Sternwagen AG”; `taken` uwzględnia już spółki obce). Pakiet matki (`parentPack`, 60–80%) jest poza wolnym obrotem jak pakiet państwa, dywidenda córki idzie do kasy matki, upadek/przejęcie matki zwalnia pakiet, split zachowuje sumę. Córki liczą się do limitu giełdy kraju. Karta: zakładka „Grupa” i „Akcjonariat” pokazują matkę/córki, wiersz na liście ma notkę „córka X (63%)”.
- **D2**: `holdAgm`/`tallyAgmItem`/porządek obrad/okno „Walne” działają na emitencie zagranicznym (haki `isForeignShare`, `getForeignShareholders`, `findGovernedStock`). Udział funduszu z `holders`, emisja/skup w walucie spółki, nowe punkty: wynagrodzenia i odwołanie prezesa (kondycja ≤ −2). Drabina nadzoru: ostrzeżenie → kara → **nakaz wezwania** na pozostałe akcje (kurs +10%) gdy fundusz ma gotówkę, inaczej odsprzedaż (nadzór poziomu ≥ 3) albo wezwanie częściowe.
- **D3**: `executeIssuerTakeover` (obca↔obca, obca→krajowa, krajowa→obca), premia 25%, wypłata przez wspólne `settleTargetHolders` (wyjęte z `resolveMerger`), księgowanie z wartością firmy, genealogia. Wyłączone: spółki państwowe, giganci, specjalne, zależne, spoza listy giełdy macierzystej, brak gotówki, dwie krajowe (idą przez proces M&A). Ścieżki: kwartalna pętla, uchwała „sprzedaż spółki” z walnego, `startPlayerForeignTakeover` (spółka z >50% funduszu).
- **D4**: `getHomeMarketDef` — nagłówek i skróty giełdy macierzystej z danych kraju (DAX/WSE/PX, PL bez zmian: GPW); `getCompanyCountryNote` (spółka UNI → kraj i waluta rynku macierzystego); ok. 300 literałów „PLN/zł” w mailach, dzienniku, toastach, zamianie na `formatZl`; `localizeCurrencyText`/`localizeStaticCurrency` (jedno miejsce: Akademia i statyczny `index.html`, liczby przeliczane tylko w statycznych kwotach); „Cena w ${waluta}”, karta lotu „Frankfurt (DAX)”.

## Pomiar (preset `fundusz-gig` / `start-DE`, 12 gier × 27 kw. ×200; serie w `side-session-notes/.../serie_01612`)
| Seria | GIG CAGR śr. ± odch. | Marża | Zapis (znaki) | ms/kw. | Niezmienniki / ujemna gotówka / JS / kraje |
|---|---|---|---|---|---|
| baza 0.16.11 PL (a) | 8,6% ± 3,7 | 23,2% | 2,34 mln | 1529 | 0/0/0/0 |
| baza 0.16.11 PL (b) — **baza kontra baza** | 11,6% ± 6,0 | 21,8% | 2,30 mln | 1524 | 0/0/0/0 |
| 0.16.12 PL (pierwsza wersja D3) | 11,8% ± 3,3 | 22,4% | 2,33 mln | 1628 | 0/0/0/0 |
| 0.16.12 PL (z limitem przejęć) | 10,9% ± 4,1 | 22,6% | 2,28 mln | 1330 | 0/0/0/0 |
| baza 0.16.11 DE | 9,4% ± 3,7 | 20,5% | 1,87 mln | 1345 | 0/0/0/0 |
| 0.16.12 DE (pierwsza wersja) | 9,8% ± 4,2 | 20,8% | 1,88 mln | 1460 | 0/0/0/0 |
| 0.16.12 DE (z limitem) | 11,6% ± 2,7 | 20,7% | 1,89 mln | 1280 | 0/0/0/0 |

- **Baza kontra baza**: dwie serie *tego samego kodu* różnią się o **3,1 pp GIG** (błąd różnicy ≈ 2,0 pp) i o 1,4 pp marży. Czyli szum n = 12 to ±2–3 pp GIG i ±1,5 pp marży. **Marża końcowa +1,6 pp po 0.16.9 to szum** (nie skutek zmian): ta sama skala rozrzutu występuje bez żadnej zmiany kodu.
- Kryterium „GIG ±1 pp względem 0.16.11” **nie jest rozstrzygalne** na n = 12: PL nowe − baza = +2,35 pp (błąd 1,6), DE +2,25 pp (błąd 1,3), obie różnice mniejsze niż różnica baza–baza. Średnia dwóch baz PL 10,1% vs średnia dwóch nowych 11,35% (+1,2 pp). Pierwsza seria wskazywała na przejęcia z udziałem spółek krajowych (gry z przejęciami ~14% vs ~9%), ale po ujawnieniu szumu baza–baza nie jest to dowiedziony skutek; limit „1 przejęcie z udziałem spółki krajowej na 12 kw.” i szansa 5% zostały jako ostrożność (mechanizm jak przejęcie giganta: gotówka z zewnątrz).
- Czas kroku i zapis w budżecie (zapis −2…+1%, krok −13…+8% przy zmiennym obciążeniu maszyny, pięć przebiegów równolegle). Niezmienniki, ujemna gotówka, wyjątki JS: 0 w 84 grach. Brak zawieszeń.
- Sonda w aplikacji (DE, 60 kw. wywołań `processCountriesQuarterly`+`processGovernanceQuarter`, wersja przed limitem): 15 ms/kw., 31 spółek zależnych (14 matek, max 3 na matkę), 22 przejęcia, ~2300 walnych obcych, niezmienniki 0. Giełda kraju dobiła do limitu (74/74) — córki zajmują miejsca debiutów.

## Sprawdzenie w aplikacji (Browser pane, start z DE i z PL)
DE: nagłówek „DAX — FRANKFURTER BÖRSENHAUS”, gotówka w EUR, meta spółki „Niemcy · EUR”, brak „PLN” w widocznym tekście, wiersz córki „córka Sternwagen AG (63%)”, karta (Grupa/Akcjonariat z matką), okno „Walne” spółki obcej z 60% (głosy, porządek, historia uchwał), 390 px bez przewijania poziomego. PL: „GPW — GIEŁDA PAPIERÓW WARTOŚCIOWYCH”, „Polska · PLN”, bez zmian. Zrzut ekranu nie udał się (timeout przy obciążonej maszynie), weryfikacja przez DOM.

## Pominięte i problemy
1. Kryterium GIG ±1 pp nierozstrzygalne statystycznie (szum baza–baza 3 pp); potrzebna seria ≥ 40 gier, jeśli ma być dowiedzione.
2. Brak przycisku „Przejmij obcą” w interfejsie (jest `startPlayerForeignTakeover`, testowane przez API).
3. Przejęcia: jednoetapowe, tylko za gotówkę, bez fuzji, negocjacji, pigułek; limit przejęć z udziałem spółki krajowej nie jest zapisywany (po wczytaniu liczy się od nowa); spółki zależne obcych nie są kandydatami ani przejmującymi.
4. Walne obcych: `quartersToAgm` i otwarty porządek nie są zapisywane (po wczytaniu losowy termin); brak bloków pakietowych i wglądu rady w plany inwestycyjne obcych.
5. Córki obcych zajmują miejsca w limicie giełdy kraju (74/74 po ~15 latach) i blokują debiuty; nie stoją wizualnie pod matką na liście.
6. Teksty z literałem w stałych ładowanych przy starcie (np. `offerText` w events.js „1,10 PLN”, etykiety `listings.js` „od 1 mln zł”, opisy w `player.js:123`) zostały bez zmian; reszta: komentarze i stałe. Statyczny HTML przepisywany po `syncBaseCurrency` — teksty tworzone później ręcznie w kodzie muszą używać `formatZl`.
7. Test F1/F2 z 0.16.7 zależał od losowej polityki dywidendy i precyzji zapisu — poluzowane asercje (kapitał własny do 6 cyfr znaczących).
8. Strajki obcych, partie/społeczeństwo kraju startowego, listy USA/CZ: poza zakresem (0.19.2).
