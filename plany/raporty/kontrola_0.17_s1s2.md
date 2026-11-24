# Kontrola 0.17 S1–S2 „Rejestr surowców” i „Spółki i koszty wsadu”

Gałąź `claude/impl-017-s0b-891539` (od `d32c834` na `zmiany-AI`, nie scalona). Testy: **915/915** (było 906; S1 +4, S2 +5; 4 testy danych krajów i firm PL z nowymi liczbami spółek). Zapis bez podbicia wersji: nowe pole opcjonalne `commodities`. Surowe JSON-y serii i wydruk porównania: notatki sesji, `serie_s1s2/`.

## S1 — `commodities.js`
- Rejestr 7 surowców z tabeli specyfikacji (cena USD, σ, θ, sezon, β_p, β_z, widełki). Krok tygodniowy jest w `processFundWeekly` (przed depozytami), zamknięcie kwartału zaraz po `processFinancialReports`, więc raporty spółek widzą średnią mijającego kwartału.
- Cel `M` = średnia × inflacja USD 2%/rok × (1 + β_p·(popyt − 1)) × (1 + β_z·(zbrojenia − 1)) × nastrój (±3% dla ropy, metali i węgla w hossie/euforii albo bessie/kapitulacji) × szoki. Popyt przemysłu bierze się z fazy cyklu sektora Przemysł: boom 1,15, szczyt 1,05, spadek 0,85, dołek 0,95. Zbrojenia = 1 (hak `getGlobalDefenseIndex` czeka na S6). Szansa embarga ma hak `getHomeSecurityLevel` (S6).
- Widełki liczone od średniej z inflacją (bez sezonu i szoków); co kwartał cena jest do nich przycinana. Historia: 104 tygodnie oraz średnie kwartalne (do 80 kw.). Ś8 startuje od średniej, więc spółki zaczynają od zerowego wpływu.
- Zdarzenia: embargo (4%/rok), strajk w kopalniach (6%/rok, węgiel albo metale, −20% produkcji krajowych spółek z tym produktem), rekordowe zbiory (8%/rok, nie w roku suszy), awaria reaktora (2%/rok, Energetyka jądrowa −5% kursu), ucieczka do złota (start linii bankowej, czarnego czwartku albo pandemii). Spięcia: szok makro `oil` (także iskra linii 1973) → ropa +40% na 3 kw., `drought` → zboże +20% na 2 kw., `energyprices` → gaz i węgiel −15% na 2 kw. Szok przesuwa cel i jednorazowo podnosi cenę o połowę (w logarytmie).
- Zapis: ceny, historia z 5 cyframi znaczącymi, zdarzenia, długość serii odchylenia. Stary zapis startuje z cen średnich.

**Zmiany liczb względem specyfikacji (S1):**
1. **Sezon mnoży cenę wprost, nie cel `M`** (interpolacja liniowa między środkami kwartałów). Gdy sezon siedział w `M`, przy θ = 0,25/kw. zostawało z niego ok. ±2%: test „średnia Q1 > Q3 dla gazu” nie przechodził (Q1 4,99 < Q3 5,15 na 40 latach). Teraz powrót do średniej liczy się bez sezonu. Amplitudy bez zmian.
2. **Czas szoku naftowego: 3 kw.** Specyfikacja mówi „jak teraz”, ale szoki makro nie miały czasu trwania. Susza i spadek cen energii: 2 kw., jak w tabeli.
3. **Popyt przemysłu tylko z kraju startowego.** Kraje dołączone nie mają własnych `sectorCycles`; to oznaczony skrót w kodzie.

## S2 — koszty wsadu i nowe spółki
- `computeQuarterResults`: przychód kwartału × `revenueFactor` (produkt: 1 + w·((P̄q/Ś8)^0,6 − 1), z dźwignią operacyjną jak przy innych czynnikach kwartału; baza przychodów bez zmian), marża + `marginAdj` (wsad: −udział·(r_ef − 1)·(1 − przerzucenie)). `r_ef` = (1 − h)·P̄q/Ś8 + h·P̄(q−4)/Ś8. Przerzucenie rośnie 0 → 60% liniowo przez 4 zamknięte kwartały odchylenia w tę samą stronę. Ta sama funkcja liczy spółki krajowe i zagraniczne.
- `h`: spółki państwowe 0,3, pozostałe 0,3–0,7, stałe dla spółki (liczone z symbolu, więc bez pola w zapisie).
- Rafinerie (PES, MEF, TBN): wsad ropa 0,6 i produkt ropa 0,6 z opóźnieniem 1 kw. GLK (handel) działa tak samo, z koszykiem metale/węgiel/ropa 0,2/0,1/0,1.
- **Przypisania w tabeli `COMMODITY_ASSIGNMENTS`** (`commodities.js`, po symbolu albo id spółki kraju), a nie w polu definicji spółki. Dzięki temu stare zapisy (spółki z zapisu nie mają nowych pól) też dostają profil, jak w `SUBSECTOR_START_ASSIGNMENTS`. Spółki bez wpisu dziedziczą wsad sektora i podsektora z tabeli specyfikacji, ważony udziałem segmentu. Rolnictwo ma produkt zboże.
- Udziały wsadu dla istniejących spółek (w liście bez liczb; dobrane do skali tabeli domyślnej): SIK gaz 0,15; ECL ropa 0,25; KUP gaz 0,3; LND gaz 0,3; ESA węgiel 0,35; TRN węgiel 0,3 i uran 0,1; TKS i SSA metale 0,3 i węgiel 0,1; MEF jak rafineria. Produkty: KWM węgiel, MLD metale, PUR uran, TOB ropa, NRG ropa/gaz 0,5/0,5, GPR gaz, WGI węgiel; nowe: NAG gaz, ZST złoto, SLS zboże, JDM zboże, NGR złoto, GTG gaz/ropa 0,6/0,4, DOL węgiel, KJM metale, UOW metale, BHO zboże.
- **Nowe spółki (13):**
  - PL (`companies.js`, poziom giełdy z ceny): PES (Energia + Chemia / Rafinerie, państwowa, 120 zł × 10 mln akcji = gigant ≥ 1 mld zł, SILVER), NAG (Energia / Gaz, państwowa, BRONZE), ZST (Przemysł / Wydobycie, zmienna 1,8, JUNK), SLS (Żywność / Rolnictwo, BRONZE). Wszystkie z pochodzeniem PL.
  - Zagranica (`countries_data.js`): JDM, NGR, GTG (US), DOL (CZ), KJM (SE, państwowa), GLK (CH), TBN (CN, gigant, także w `FOREIGN_GIANTS`, więc może wejść jako kwit GDR), UOW (CN, państwowa), BHO (IN, państwowa).
  - Nowe podsektory: Energia/Rafinerie, Energia/Gaz, Przemysł/Wydobycie, Przemysł/Handel surowcami. Są oznaczone `listedOnly`, więc losowanie podsektorów nowych spółek ich nie wybiera.
  - TBN ma rodzaj `giant` (nie `state`): w danych kraju spółka ma jeden rodzaj, a decyzja brzmiała „giganci”.
  - Transportowych spółek nie ma (to S4).
- Testy S2: kopalnia +11,5% przy cenie +20% ponad Ś8; strajk; marża huty −udział·0,2 przy przerzuceniu 0; przerzucenie 30% po 2 kw. i 60% po 4 kw.; zabezpieczenie `h`; wsad z sektora i podsektora (w tym ważony segmentami); rafineria; nowe spółki na giełdach, w zapisie i z poprawnym poziomem giełdy.

## Kalibracja (warunek commitu S2): 60 + 60 gier PL ×200, 27 kw., jedna partia (6 instancji naprzemiennie)
Baza = kod `zmiany-AI` `d32c834` (bez S1 i S2), uruchomiony tą samą stroną przebiegów (`--target=../_baza/index.html`), więc obie serie mają tę samą sondę. Narzędzie: `design/narzedzia/porownaj_marze.mjs` (nowe).

| Miara | Baza | S2 | Δ (SE różnicy) | Kryterium |
|---|---|---|---|---|
| Średnia odchyłek marż sektorów (19 sektorów) | — | — | **+0,16 pp** (0,17) | 0 ± 0,3 pp ✅ |
| w tym sektory z wsadem (8) | — | — | −0,24 pp | — |
| `earningsIndexCagr` | 7,48% | 7,49% | +0,01 pp (0,44) | w widełkach ✅ |
| Marża końcowa | 22,29% | 22,10% | −0,20 pp (0,37) | w widełkach ✅ |
| GIG | 10,61% | 10,63% | +0,02 pp (0,76) | (tylko informacyjnie) |
| Zapis (znaki) | 2,305 mln | 2,380 mln | **+3,3%** | budżet 0.17: ≤ 2,42 mln (+4%) |
| ms/kw. (6 równolegle) | 1736 | 1800 | +3,7% | orientacyjnie; budżet mierzy się sekwencyjnie |
| Niezmienniki / ujemna gotówka / JS / `invAfterLoad` / przerwane | 0/0/0/0/0 | 0/0/0/0/0 | | 0 ✅ |

- Marże sektorów z wsadem: Chemia −0,23, Energia −0,32, Przemysł +0,17, Motoryzacja 0,00, Transport i logistyka −1,01 (SE 0,98), Żywność −0,16, Budowlany +0,05, Obronność −0,39 pp. Wszystkie w granicach ok. 1 SE. Największe różnice są w sektorach bez wsadu (Alkohole +1,71, Usługi +1,52), więc to szum.
- Z średniej wyłączone: Bankowość (marża banku nie pochodzi z modelu wyników, SE 111 pp) i Badania (SE 5,3 pp; 1–2 spółki). Reguła w narzędziu: SE ≤ 2 pp i ≥ 10 gier w obu ramionach.
- **Wykładnika produktu (0,6) ani udziałów nie zmieniano**: kryterium przeszło za pierwszym razem.

## Ryzyka i pominięte
- **Zapis +3,3%** (głównie 4 nowe spółki krajowe; same surowce to ok. 10 tys. znaków). Na S3–S7 zostaje ok. 0,7 pp budżetu (≈ 40 tys. znaków). Kontrakty, ETC i indeks frachtu trzeba zapisywać oszczędnie albo podnieść budżet.
- Stary zapis nie dostaje nowych spółek (lista spółek pochodzi z zapisu); ceny surowców startują wtedy od średnich.
- Opisy nowych spółek z listy: tylko zagraniczne mają `desc`. Krajowe spółki w `companies.js` nie mają pola opisu, więc opisy PES, NAG, ZST i SLS nie są wpięte.
- Bez interfejsu (S7) i bez Akademii.
