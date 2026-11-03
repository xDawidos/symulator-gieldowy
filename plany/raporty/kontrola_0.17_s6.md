# Kontrola 0.17 S6 — zbrojenia, surowce i bezpieczeństwo państwa

Gałąź `claude/impl-017-s0b-891539` (nie scalona z `zmiany-AI`). Testy: **954/954** (było 948; S6 +6). Zapis bez podbicia wersji: stan w `society.defense` (pole opcjonalne; stary zapis startuje bez podbicia i szoków), linia `society.budget.defense`. Surowe JSON-y: notatki sesji, `serie_s6/` (`s6a` — seria z błędem opisanym niżej, `s6b` — po poprawce).

## Co zrobione
- **Nowy plik `security.js`** (ładowany po `infrastructure.js`):
  - budżet obronny = przychody budżetu × `defenseShare` partii;
  - poziom bezpieczeństwa i indeks zbrojeń świata;
  - skutki poziomu bezpieczeństwa.
- **`RULING_PARTIES.defenseShare`:**
  - Koalicja Rynkowa 2,0%, Blok Państwowy 3,5%, Ludowcy 2,0%, Socjaldemokraci 1,5%;
  - w koalicji udział to średnia ważona;
  - po starcie embarga rośnie ×1,5 na 4–8 kw.
- **Budżet:**
  - linia `budget.defense` wchodzi do `spending`, więc liczy się do deficytu;
  - kwota schodzi ze skarbu.
- **Zamówienia:**
  - trafiają do krajowej zbrojeniówki proporcjonalnie do kapitalizacji, jako przychód kwartału (z lagiem 1 kw.);
  - liczy się tylko nadwyżka ponad poziom przy udziale 2%. Poziom 2% jest już w bazie przychodów, więc przy 2% skutek jest zerowy;
  - bonus wzrostu od policji (`getDefenseGrowthBonus`) zmniejszony o połowę: 0,004 → 0,002.
- **Półprzewodniki (spółki krajowe, według udziału segmentu):** przychód kwartału +1% przy udziale 3,5%, liniowo względem 2%.
- **Surowce:** `getGlobalDefenseIndex()` = (udział PL + Σ udziałów krajów obcych) / (1 + N) / 2,5%. Haki z S1 (β_z: metale 0,5, ropa 0,2) były gotowe.
- **Poziom bezpieczeństwa S:**
  - wzór: S = 50 + 600·(udział − 2%) + 10·efektywność policji − szoki, przycięty do 0–100;
  - szok geopolityczny (start embarga) odejmuje 5–15 pkt na 4–8 kw. wszystkim krajom;
  - kraje obce mają stałe `security` w `COUNTRY_DEFS`: DE 70, US 80, CZ 65, SE 70, CH 85, FR 70, JP 70, TW 40, CN 60, IN 55.
- **Skutki S:**
  1. Boty zagraniczne: szansa zakupu na rynku krajowym × (0,8 + 0,4·S/100). Wycena (`getValuationMultiplier`) × (1 ± 2%) przy S = 100 / 0, według S kraju spółki.
  2. Popyt konsumentów (`demandIndex`): ±0,5 pp przy odchyleniu S o 25 od 50.
  3. Szansa embarga × (1,5 − S/100). Hak z S1 jest teraz aktywny.
- **Testy S6 (6):**
  - udziały partii, koalicja i podbicie;
  - linia budżetu, skarb i zamówienia proporcjonalne do kapitalizacji (zero przy 2%);
  - przychód zbrojeniówki i Półprzewodników, spółki obce bez zamówień;
  - wzór S, szoki i szansa embarga;
  - stałe S krajów obcych, indeks zbrojeń i cel metali;
  - skutki S: wycena, popyt, boty.

## Błąd złapany w serii
W pierwszej serii (`s6a`) zamówienia obronne i premia Półprzewodników nie działały wcale. Przyczyna: spółki krajowe mają `country: 'PL'` jako kraj pochodzenia, a kod uznawał za krajowe tylko spółki bez pola `country`. Testy tego nie widziały, bo spółka testowa nie ma tego pola. Poprawka (`7bbcdf8`): spółka jest krajowa, gdy jest na liście `stocks`. Test ustawia teraz `country: 'PL'`.

## Seria PL 24 gry (`s6b`; 27 kw., preset `fundusz-gig`; baza = te same 24 gry bazy co w S5, odniesienie = S5 ×1 `s5x`)

| Miara | Baza | S5 ×1 | S6 |
|---|---|---|---|
| Odchyłka marż sektorów względem bazy | — | −0,53 pp, POZA | **−0,38 pp** (SE 0,26), POZA |
| Odchyłka marż względem S5 ×1 | — | — | **+0,21 pp**, OK |
| earningsIndexCagr | 7,35% | 6,36% | 6,94% (w widełkach) |
| Kwartały z deficytem | — | 55% | **60%** |
| Saldo / wpływy | — | −4,15% | −5,72% |
| Gier z CIT +2 pp (2 lata deficytu) | — | nie mierzono | 7/24 |
| Zapis > 2,49 mln znaków | 6/24 | 10/24 | 7/24 |
| Niezmienniki, ujemna gotówka, błędy JS | 0 | 0 | 0 |

**Zbrojenia i bezpieczeństwo:**
- **Udział obronny:** przez 45% kwartałów 2,0%, przez 12% 3,5% (Blok), koalicje 1,8–3,0%, z podbiciem do 5,25%. Budżet obronny to średnio 2,48% wpływów.
- **S:** średnio 57, p10 53, p90 62, zakres 43–75.
- **Podbicie po embargu:** w 8/24 grach, 7% kwartałów.
- **Indeks zbrojeń:** średnio 1,03, najwyżej 1,55 (embargo). Wtedy cel metali rośnie o ok. 27%.
- **Krajowa zbrojeniówka:** mediana wzrostu przychodu 4,3% rocznie (średnia 7,5%).
- **S5 bez zmian:** pierwsze lotnisko w 22/24 grach (ok. 17 kw.), 3,9 otwartego kraju na grę.

## Do uwagi
- **Deficyt rośnie:** z 55% do 60% kwartałów, bo linia obronna to nowy wydatek ok. 2,5% wpływów, nie przesunięcie z usług publicznych. W 7/24 grach dwa lata deficytu podnoszą CIT o 2 pp. Spec mówi „wliczana do wydatków (deficyt)”, więc tak zostawiłem. Alternatywa: finansować obronę z `publicServices` (bez wzrostu deficytu).
- **Marże względem bazy:** −0,38 pp, nadal poza widełkami. Większość odchyłki pochodzi z S5, bo S6 względem S5 ×1 to +0,21 pp. Chemia znów niżej (−1,2 pp), Media −1,8 pp, Usługi −1,4 pp. To szum rzędu 1–1,5 SE.
- **Skutki są małe z założenia:**
  - przy 3,5% zamówienia dają zbrojeniówce ok. +0,7% przychodu kwartału, a Półprzewodnikom +1%;
  - wycena zmienia się o ±0,3% przy typowym S;
  - popyt zmienia się o ok. +0,15 pp.
  Wyraźnie czuć tylko embargo: S spada o 5–15 pkt, a metale drożeją.
- **Interfejs:** linii budżetu obronnego i poziomu S nie ma jeszcze w interfejsie. To zakres S7. Linii infrastruktury z S5 też jeszcze nie ma.
- **Uproszczenia (spec ich nie rozstrzygał):**
  - kraje obce mają stały udział obronny 2,5% (także ×1,5 po embargu);
  - szoki geopolityczne biorą się tylko ze startu embarga;
  - premia ryzyka dla spółek obcych liczy się według S ich kraju;
  - stare kontrakty MON (`processDefenseQuarterly`) zostają bez zmian.
