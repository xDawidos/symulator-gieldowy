# Kontrola 0.17 S4 „Transport i indeks frachtu”

Gałąź `claude/impl-017-s0b-891539` (po scaleniu `zmiany-AI` 5cb1dbf; nie scalona z powrotem). Testy: **934/934** (było 928; S4 +6). Zapis bez podbicia wersji: fracht w polu `commodities.fr` (opcjonalne), stary zapis startuje od 100. Surowe JSON-y: notatki sesji, `serie_s4/`.

## Co zrobiono
1. **Podsektory i spółki** (`e350ac7`):
   - „Transport i logistyka”: Morski, Lotnictwo (nazwa zostaje), Lądowy, Logistyka (pole `freight` w definicji podsektora: `sea`, `air`, `land`).
   - Koleje DBF, AMR, CKO, RDF, IKP, CKN → „Lądowy”; JDL → „Logistyka”; ABL zostaje w „Budowlany”.
   - Nowe spółki PL: GRT (Morski, państwowa, 48 zł, BRONZE), CFL (Lotnictwo, państwowa, 26 zł), PKC (Lądowy, państwowa, 18 zł, JUNK; wsad węgiel 0,10), TIR (Lądowy, prywatna, 40 zł). Każda z wpisem w `COMPANY_DESCRIPTIONS` (tekst z listy, rozwinięty o jedno zdanie jak w S2).
   - Zagraniczne: HKR, DHX (DE), POP (US, państwowa), CMA (FR), KML (JP), EVG (TW), z polem `desc`. W S2 nie weszły.
2. **Indeks frachtu** (`4a6c0b1`, nowy plik `freight.js`):
   - `I = 100 · (ropa/Ś8)^f · popyt^d · (1/przepustowość)^k · zakłócenia · szum`, parametry z tabeli specyfikacji. Popyt to faza cyklu Przemysłu (jak u surowców), przepustowość = 1 (S5), szum log-AR(1) z powrotem 0,25/kw. i zmiennością z tabeli.
   - Krok tygodniowy na końcu `stepCommodities`, średnia kwartalna i Ś8_I przy `processCommoditiesQuarterly`.
   - Zakłócenia: „Statek utknął w kanale” (morski +40% na 4–8 tyg., EVG −8%), „Strajk kolejarzy” (lądowy +15% na 2–4 tyg., państwowe koleje kraju −3%), „Pył wulkaniczny” (lotniczy +30% na 2–4 tyg.); wpis w dzienniku i wiadomość.
   - Czas dostawy tylko informacyjnie (zakłócenie wydłuża o 1–2 tyg.).
   - **Wpływ na spółki** (w `getCommodityResultAdj`): przewoźnicy (podsektor z `freight`) przychód × `(Ī/Ś8_I)^0,7`, paliwo przez wsad ropy z S2; odbiorcy (Przemysł 0,06, Motoryzacja 0,05, Żywność 0,05, Dobra konsumpcyjne 0,05, Chemia 0,04) marża −= udział · (Ī/Ś8_I − 1) dla koszyka rodzajów (morski 0,4, lądowy 0,4, lotniczy 0,2 — koszyka specyfikacja nie podaje). Logistyka bez indeksu.
   - Okno „Rynek”: sekcja „Indeks frachtu (baza 100)” — trzy rodzaje (wartość, odchylenie od Ś8 ze strzałką i znakiem, czas dostawy, zakłócenie słowem) i ropa. Sprawdzone w przeglądarce, konsola bez błędów.
3. **Testy** (`6822b57`, 6): indeks rośnie z ropą (wykładnik f) i popytem (d); zakłócenie podnosi indeks i czas dostawy, wygasa, EVG −8%; przewoźnik zyskuje, odbiorca traci udział × odchylenie; „średnio zero” ×200 (marża Przemysłu < 0,3 pp, przychód armatora < 3%); nowe spółki na giełdach, z opisami, w zapisie, koleje w „Lądowy”, fracht w zapisie i stary zapis od 100; sekcja w oknie „Rynek”.
   - Stary test S1 „cena wraca ku średniej” sprawdzał jedną losową ścieżkę uranu i przestał trafiać przez inną kolejność losowań; teraz średnia z 30 ścieżek i deterministyczny powrót celu.
4. Sonda przebiegów (`a947070`): indeks frachtu na koniec i liczba zakłóceń; narzędzie `fracht_serie.mjs`.

## Seria PL ×200 (48 + 48 gier, 27 kw., preset `fundusz-gig`, baza = `zmiany-AI` 5cb1dbf przez `--target`)
| Miara | Baza | S4 |
|---|---|---|
| Niezmienniki / ujemna gotówka / JS / `invAfterLoad` / przerwane | 0 / 0 / 0 / 0 / 0 | **0 / 0 / 0 / 0 / 0** |
| Średnia odchyłek marż sektorów (17) | — | **+0,19 pp (SE 0,20), w widełkach 0 ± 0,3** |
| Sektory-odbiorcy: Przemysł / Motoryzacja / Żywność / Chemia | — | +1,06 / −0,54 / +0,86 / +0,10 pp (SE 0,6–0,8 każdy; średnio +0,37); Dobra konsumpcyjne pominięte (SE 2,7) |
| `earningsIndexCagr` / marża końcowa | 6,92% / 22,21% | 7,09% / 22,15% (w widełkach) |
| GIG (informacyjnie) | 9,88% | 11,64% (Δ 1,76 pp, SE 0,91) |
| **Zapis** | 2,318 mln (p90 2,47; > 2,49 mln: 4/48) | **2,412 mln (+4,0%)**, p90 2,61 mln, **> 2,49 mln: 16/48**, maks. 2,716 mln |
| ms/kw. | 1484 | 1540 |
| Indeks na koniec (mediana, p10–p90) | — | morski 115 (65–175), lotniczy 99 (80–125), lądowy 101 (89–113) |
| Zakłócenia na grę | — | kanał 0,13, strajk 0,15, pył 0,04 |

Pierwsza partia (24 + 24) dała +0,55 pp (SE 0,31), ale rosły też sektory bez frachtu (Turystyka, Finanse) — szum ścieżek; po podwojeniu próby średnia w widełkach.

## Odchyłki i ryzyka
- ~~Tydzień gry ≠ 1/13 kwartału~~ — **poprawione** (`2c9fe62`, zob. niżej).
- **Zapis:** +94 tys. znaków, głównie 4 nowe spółki krajowe (fracht < 1 tys.). Średnia w limicie 2,49 mln, ale co trzecia gra powyżej. Decyzja „średnia czy p90” przed S7 staje się pilna.
- Koszyk rodzajów dla odbiorców (0,4 / 0,4 / 0,2) i wsad PKC (węgiel 0,10) — moje założenia.
- Indeks morski ma największy rozrzut (p10 65, p90 175) przez d = 1,5 przy cyklu Przemysłu i σ 40%.
- „Opisy” PL rozwinięte o jedno zdanie o wpływie frachtu (jak opisy S2).

## Poprawka: jedna stała tygodni gry (`2c9fe62`)
Decyzja użytkownika: gra zostaje przy 5 tygodniach na kwartał; S1, S3 i S4 liczą z `WEEKS_PER_QUARTER` (5) i `WEEKS_PER_YEAR` (20) z core.js zamiast 13/52. Reszta gry bez zmian.
- S1: θ_t = 1 − (1 − θ)^(1/5), szum σ/√20, sezon `qN/5` — zmienność roczna, powrót do średniej i sezon jak w planie.
- S3: zapadalność `5 · (kwartały naprzód) − qN`, `T = tygodnie/20`, opłaty ETC/ETF `(1 − opłata)^(1/20)` co tydzień, trend botów i „zmiana w kwartale” w tabeli z 5 tygodni. `minWeeksLeft` zostaje 2 tygodnie (seria bieżąca w ofercie w tygodniach 1–3).
- S4: szanse zakłóceń `roczna/20` na tydzień, θ i σ szumu jak w S1. Czas trwania zakłóceń i czas dostawy zostają w tygodniach gry (kanał 4–8 tyg. = 0,8–1,6 kw.).
- Kantor: `KANTOR_OFFER_WEEKS = WEEKS_PER_QUARTER` (oferty co kwartał, nie co 2,6 kw.).
- Testy S1/S3/S4 na 5 kroków na kwartał; zmienność roczna z 800 tygodni. **934/934.**

### Seria PL po poprawce (24 gry, baza bez zmian: te same gry `zmiany-AI` 5cb1dbf)
| Miara | vs baza 24 | vs baza 48 |
|---|---|---|
| Niezmienniki / ujemna gotówka / JS / `invAfterLoad` / przerwane | 0 / 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 / 0 |
| Średnia odchyłek marż sektorów | **+0,09 pp (SE 0,30), OK** (15 sekt.) | **−0,09 pp (SE 0,24), OK** (15 sekt.) |
| Sektory z wsadem (średnio) | +0,29 pp | +0,10 pp |
| `earningsIndexCagr` | 5,86% → 7,22% (Δ 1,36, SE 0,72, w widełkach) | 6,92% → 7,22% (w widełkach) |
| Marża końcowa | 21,87% → 22,61% (w widełkach) | 22,21% → 22,61% (w widełkach) |
| GIG | 9,45% → 8,80% | 9,88% → 8,80% (w widełkach) |
| Zapis | 2,330 → 2,378 mln (+2,1%) | 2,318 → 2,378 mln (+2,6%); p90 2,53 mln, > 2,49 mln: 5/24 |
| ms/kw. | 1438 → 1667 | 1484 → 1667 |

Odbiorcy frachtu vs baza 48: Przemysł −0,04, Chemia +0,47, Żywność +1,15, Dobra konsumpcyjne −1,67 pp (SE 0,6–0,8; ten ostatni ok. 2,6 SE — do obserwacji w S6). Indeks na koniec (mediana, p10–p90): morski 94 (65–139), lotniczy 100 (74–137), lądowy 96 (83–120) — rozrzut morskiego mniejszy niż przed poprawką (wcześniej p90 175), bo powrót szumu działa teraz z pełną siłą. Zakłócenia na grę (27 kw. ≈ 6,75 roku): kanał 0,38, strajk 0,13, pył 0,13 (oczekiwane 0,34 / 0,34 / 0,20; mała próba).

Poza zakresem (te same 13/52, nie ruszane zgodnie z decyzją „reszta gry bez zmian”): `stepFxRates` dryf średniej σ/√52 (currency.js:113), `COUNTRY_RULES.historyWeeks: 13` i `GDR_RULES.historyWeeks: 52` (tylko długość historii do wykresu/zapisu), test forexu `holdingCostYear / 52`.
