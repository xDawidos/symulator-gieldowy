# Kontrola 0.17 S5 „Infrastruktura publiczna i PPP”

Gałąź `claude/impl-017-s0b-891539` (po scaleniu `zmiany-AI` do 9594eb6; nie scalona z powrotem). Testy: **948/948** (było 934; S5 +9, decyzja 24 +5, 3 stare testy lotniska i łączenia giełd przepisane). Zapis bez podbicia wersji: stan w `society.infra` (pole opcjonalne), ustawa w `society.laws.infrastructure` (stary zapis: Utrzymanie, przepustowość 1,0). Surowe JSON-y: notatki sesji, `serie_s5/`.

## Co zrobiono
1. **Infrastruktura** (`74d2852`, nowy plik `infrastructure.js`):
   - Przepustowość kraju (morski, lotniczy, lądowy): start 1,0, dolna 0,7, górna 1 + limit × przyrost (1,45 / 1,30 / 1,88). Wchodzi do indeksu frachtu S4 jako `(1/przepustowość)^k`.
   - Projekty: port 3,2 mln (+0,15), lotnisko 2,8 mln (+0,15), magistrala 2,0 mln (+0,10), autostrada 1,6 mln w 2–5 odcinkach (+0,08 po równo, koszt odcinka ±10%). Limity (ukończone + w budowie): 3 / 2 / 4 / 6. Czas budowy w dniach (kwartał = 35 dni) × `INFRA_RULES.timeMult` (w kodzie 1).
   - Zamawiający: podmiot „Skarb Państwa (inwestycje)” (`INFRA_CLIENT`, gotówka w `society.infra.cash`, odtwarzany przy wczytaniu). Przy umowie wpłaca całą cenę na depozyt z `governmentTreasury`; wykonawca dostaje **zaliczkę 30%** (pole `advanceRate` przetargu i projektu; etapy liczone od niej). Po odbiorze obiekt nie trafia do portfela zamawiającego — zamiast tego rośnie przepustowość.
   - Przetarg „cena > jakość”: wagi cena 0,6, jakość 0,25, wolne moce 0,15, bez reputacji. Port, lotnisko, magistrala — zwykły ranking (istniejąca ścieżka `awardTender`).
   - **Autostrada:** każdy odcinek to osobny przetarg. Przy rozstrzygnięciu wykonawcy AI składają pakiet ciągłych odcinków (1 – wolne sloty, szansa udziału 0,7), cena za odcinek jak w zwykłej ofercie AI, rabat −2% za każdy odcinek ponad pierwszy; oferty złożone na pojedyncze odcinki (np. gracza) liczą się jako pakiety jednoodcinkowe. Państwo wybiera podział o najniższym koszcie ocenionym (pełny przegląd): cena po rabacie × (1 + (0,25·(1 − jakość) + 0,15·(1 − wolne moce)) / 0,6); rabat zależy od liczby odcinków, które firma faktycznie dostaje. Odcinek bez oferty (albo zerwany) wraca do przetargu w następnym kwartale. Odcinek = 1 slot wykonawcy. Dziennik: „Autostrada (4 odcinków): odcinki 1–2 — ABL, odcinki 3–4 — …; łącznie X zł”.
   - **Ustawa „Finansowanie infrastruktury”** (`SOCIAL_LAWS.infrastructure`, 5 poziomów, start Utrzymanie): wydatki 0 / 1 / 2 / 3 / 4,5% wpływów, zużycie 5 / 3,5 / 2 / 1 / 0,5% na rok (odejmowane co kwartał od przepustowości), szansa projektu 0 / 10 / 25 / 45 / 70% na rok (×0,5 przy deficycie). Typ losowany spośród typów poniżej limitu z wagą 1/przepustowość⁴ rodzaju. Partie: Blok Państwowy +1, Ludowcy +1, Koalicja Rynkowa −1, Socjaldemokraci bez ruchu. Zapowiedź: +1 → Budowlany +3%, Transport +1%; −1 → Budowlany −2%, Transport −0,5%. Zakładka Państwo → Ustawy pokazuje ją jak pozostałe.
   - **Budżet:** `budget.infrastructureSpending` = % wpływów z ustawy (wydatek skarbu) + raty projektów w toku (cena × (1 − PPP/koszt) / kwartały budowy; gotówka jest już w depozycie), wliczane do `budget.spending`.
   - **PPP:** przy ogłoszeniu projektu jedna oferta na 25% kosztu (autostrada na cały projekt), oprocentowanie obligacji skarbowych + premia deficytu + 1 pp, termin = budowa + 4 kw. Wpłata trafia do skarbu i zmniejsza raty państwa; odsetki i spłata ze skarbu (`pppPayerFunds`), bez wykupu i restrukturyzacji miasta. Limit 15% aktywów i odzysk 60% bez zmian.
   - **Przewoźnicy krajowi** (spółki PL z podsektorem frachtu): przychód × (1 + 0,05 · (przepustowość − 1) / 0,15).
   - **Program robót publicznych** (Czarny czwartek, bessa) ogłasza projekt z listy (poniżej limitu); bez wolnego typu — dopłata jak dotąd. Domyka odstępstwo 6 z `kontrola_0.15.3.md`.
   - Okno „Rynek”: przy każdym rodzaju frachtu przepustowość kraju.
2. **Testy** (`4f54072`, 9): przepustowość po odbiorze (autostrada po każdym odcinku), zużycie wg ustawy i dolna granica, limit, ustawa (poziomy, budżet, partie, zapowiedź), podział odcinków (dwie firmy / jedna z pakietem / odcinek bez oferty), slot na odcinek, zaliczka 30% i powrót odcinków bez oferty, PPP państwa, program robót publicznych, zapis i stary zapis.
3. **Decyzja 24 — lotnisko i port S5 zamiast megaprojektów miasta** (`344cfc4`):
   - `airport` i `seaport` usunięte z `MEGA_PROJECTS`. `isAirportBuilt()` = ukończone lotnisko S5 (albo `airportState.forced`), `isAirportInProgress()` = lotnisko S5 w przetargu lub budowie (albo stary megaprojekt w budowie).
   - `orderAirport()` (przycisk „Zleć budowę lotniska” i autoOrder od 4. kw., 30%/kw.) ogłasza projekt S5 „Lotnisko” niezależnie od ustawy. Bilety, boty otwierające kraje i cel „abroad” bez zmian.
   - Pierwsze lotnisko S5: premia dawnego megaprojektu (Transport i logistyka, Turystyka: wzrost +1,0 pkt, wycena +5%, kondycja +0,4); pierwszy port S5: Transport i logistyka, Przemysł (+0,8 pkt, +4%, +0,4). **Odstępstwo:** megaprojekt dawał premię tylko członkom konsorcjum (skalowaną wkładem); obiekt S5 nie ma konsorcjum, więc premię dostają wszystkie spółki krajowe z tych sektorów.
   - Stare zapisy: ukończony megaprojekt = 1 ukończony obiekt S5 (+0,15, licznik 1, bez ponownej premii); w budowie kończy się po staremu i wtedy zamienia (`migrateLegacyInfraMegaProjects` przy wczytaniu i w `completeProject`).
   - Łączenie giełd: mnożnik 1 + 2 (pierwsze lotnisko) + 0,5 (drugie) + 0,2 za port + 0,1 za magistralę, autostrady 0 (najwyżej ×4,5); stary megaprojekt portu już nie liczy się.
   - Teksty okna lotniska i strony „Ferie i wakacje”: projekt państwa zamiast megaprojektu miasta.
4. **Zerwane budowy** (`52fb72a`): przy projektach państwa odbiory co 10% postępu (zamiast 25 / 50 / 75%). Diagnoza z 8 gier: wszystkie zerwania to „Wykonawca nie zdołał sfinansować budowy” przy gotówce 0 i niskim zadłużeniu — przy odbiorach co 25% wypłaty zrównywały się z kosztami tuż przed etapem 75%, a do odbioru końcowego brakowało ok. 5% ceny (przy 2,5–3,3 mln to setki tysięcy, ponad limit banku). Teraz z zaliczką 30% wypłaty wyprzedzają koszty o co najmniej ok. 4% ceny. W statystykach: przyczyny zerwań i stan wykonawcy przy ostatnich 10.
5. Sonda przebiegów (`02702cc`): co kwartał sloty Budowlanego zajęte przez infrastrukturę, saldo i wpływy budżetu, poziom ustawy, przepustowość; na koniec projekty, liczniki, przyczyny zerwanych budów. Narzędzie `infra_serie.mjs`.

## Seria PL 24 + 24 (przed decyzją 24; 27 kw., preset `fundusz-gig`, baza = `zmiany-AI` e06a598 przez `--target`)
| Miara | Baza | S5 |
|---|---|---|
| Niezmienniki / ujemna gotówka / JS / `invAfterLoad` / przerwane | 0 / 0 / 0 / 0 / 0 | **0 / 0 / 0 / 0 / 0** |
| Średnia odchyłek marż sektorów (16) | — | **−0,37 pp (SE 0,28) — poza widełkami 0 ± 0,3** (1,3 SE) |
| Sektory z wsadem (7) | — | −0,39 pp |
| Największe odchyłki | — | Chemia −2,39, Usługi −2,10, Alkohole −1,70, Finanse +1,70, Dobra konsumpcyjne −1,57, Gaming +1,52 (SE 0,8–1,8) |
| `earningsIndexCagr` / marża końcowa / GIG | 7,35% / 22,89% / 10,88% | 7,57% / 22,64% / 11,40% (w widełkach) |
| Zapis | 2,389 mln | 2,395 mln (+0,3%); > 2,49 mln: 5/24 |
| Projekty na grę | — | ogłoszone 1,25; ukończone: port 0,33, lotnisko 0,17, magistrala 0,08, autostrada 0,17; zerwane 0,42 na grę = **25,6% podpisanych umów** (10 z 39) |
| Autostrady | — | 0,17/grę, 2,75 odcinka, 2,5 firmy na autostradę |
| Sloty Budowlanego zajęte przez infrastrukturę | — | 1,8% (wszystkie budowy 4,2%) |
| Deficyt | — | 47% kwartałów, saldo / wpływy −3,2%, infrastruktura / wpływy 2,1% |
| Ustawa (udział kwartałów) | — | Porzucenie 4%, Łatanie 13%, Utrzymanie 67%, Rozbudowa 13%, Autostrady 3% |
| Przepustowość na koniec (mediana) | 1,0 | morski 0,89, lotniczy 0,88, lądowy 0,88 |
| Indeks frachtu na koniec (mediana) | — | morski 102, lotniczy 102, lądowy 111 |

## Test czasu budowy ×1 vs ×1,5 (po decyzji 24 i poprawce odbiorów; po 24 gry PL, ta sama baza 24 gier)
Wariant ×1,5 przez `--patch` (`INFRA_RULES.timeMult = 1.5`). **W kodzie zostaje ×1 — wybiera użytkownik.**

| Miara | Baza | ×1 | ×1,5 |
|---|---|---|---|
| Niezmienniki / ujemna gotówka / JS / `invAfterLoad` | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Średnia odchyłek marż sektorów (16) | — | −0,53 pp (SE 0,26) — poza | **−0,08 pp (SE 0,27) — OK** |
| `earningsIndexCagr` / marża końcowa | 7,35% / 22,89% | 6,36% / 21,61% (w widełkach) | 6,77% / 22,84% (w widełkach) |
| Zapis (średnio; > 2,49 mln) | 2,389 mln; 6/24 | 2,437 mln (+2,0%); 10/24 | 2,428 mln (+1,6%); 7/24 |
| Ogłoszone projekty na grę | — | 2,46 | 2,88 |
| Ukończone na grę: port / lotnisko / magistrala / autostrada | — | 0,25 / 1,00 / 0,25 / 0,17 | 0,08 / 0,79 / 0,13 / 0,38 |
| Autostrady: na grę, odcinków, ukończonych odcinków, firm na autostradę | — | 0,21; 3,2; 2,6; 1,8 | 0,71; 3,5; 2,5; 2,2 |
| **Zerwane umowy** (zerwane / podpisane) | — | **14,9%** (10 / 67) | **8,2%** (9 / 110) |
| Przyczyny zerwań | — | brak finansowania 9, bankructwo wykonawcy 1 | brak finansowania 5, bankructwo 4 |
| Sloty Budowlanego zajęte przez infrastrukturę (wszystkie budowy) | — | 3,5% (5,9%) | 6,5% (9,0%) |
| Deficyt: kwartały / saldo ÷ wpływy / infrastruktura ÷ wpływy | — | 51% / −4,2% / 2,1% | 52% / −4,4% / 2,5% |
| Ustawa (udział kwartałów 0 / 1 / 2 / 3 / 4) | — | 3 / 16 / 69 / 12 / 0% | 3 / 4 / 64 / 21 / 8% |
| Przepustowość na koniec (mediana: morski / lotniczy / lądowy) | 1 / 1 / 1 | 0,86 / 1,02 / 0,86 | 0,89 / 1,02 / 0,94 |
| Pierwsze lotnisko: gier z lotniskiem, kwartał (średnio) | megaprojekt | 22/24, kw. 17,5 | 19/24, kw. 19,2 |
| Otwarte kraje na grę | 4,00 | 3,63 | 3,42 |
| Połączenia giełd na grę | 0,29 | 0,38 | 0,50 |

Czytanie: ×1,5 dłużej trzyma budowy w toku (34 odcinki w toku na koniec wobec 8), więc ukończonych jest mniej, mimo że ogłoszeń więcej (szansa projektu rośnie, bo gracz-partia częściej trafia na Rozbudowę i Autostrady). Lotnisko S5 przychodzi o ok. 2 kw. później i w 5/24 grach wcale (×1: 2/24), stąd mniej otwartych krajów. Mniej zerwań przy ×1,5 to w większości skutek mniejszej liczby odbiorów w oknie gry, nie łatwiejszego finansowania.

## Odchyłki i ryzyka
- **Marże.** Trzy serie S5 wobec tej samej bazy: −0,37 (przed poprawką), −0,53 (×1), −0,08 pp (×1,5); SE 0,26–0,28. We wszystkich Chemia −2,0 … −3,0 pp — ale Chemia w tej bazie (18,1%) jest wyraźnie wyżej niż w bazach S4 (16,3–16,4%), a wartości S5 (15,2–16,1%) leżą przy tamtych, więc to w dużej części szum wspólnej bazy. Mechanizm, który działa naprawdę w tę stronę: przepustowość spada (zużycie 2%/rok na Utrzymaniu przy ok. 0,3–0,4 ukończonego projektu na rok na trzy rodzaje), indeks lądowy na koniec ok. 112, więc odbiorcy płacą więcej — ale względem Ś8 to ułamek pp. Do decyzji: czy zużycie na Utrzymaniu ma przewyższać projekty (przepustowość ok. 0,86–0,94 na koniec), czy obniżyć je np. do 1%/rok.
- **Zerwania** po poprawce 14,9% (×1) i 8,2% (×1,5) — w granicy użytkownika (≤ 20%). Reszta to wciąż brak finansowania przy gotówce wykonawcy 0 (wykonawcy MAJB, BOBB wydają nadwyżkę z zaliczek na inne cele) oraz bankructwa wykonawców. Kolejny krok, gdyby było trzeba: dłuższa tolerancja przestoju przy infrastrukturze albo kredyt z gwarancją państwa.
- **Duże kontrakty skupiają się** na kilku wykonawcach (MAJB, BOBB) — przy 2,5–3,3 mln na odcinek inne firmy budowlane rzadko mają sloty i finansowanie.
- **Deficyt** w ok. połowie kwartałów (baza nie mierzyła salda w tej sondzie). Linia infrastruktury to ok. 2–2,5% wpływów.
- **Premia pierwszego lotniska / portu** trafia do wszystkich spółek z sektorów premii (megaprojekt dawał ją tylko konsorcjum) — odstępstwo, zob. wyżej.
- **Zapis:** +1,6–2,0%; gier powyżej 2,49 mln 7–10/24 (baza 6/24). Decyzja „średnia czy p90” przed S7 dalej otwarta.
- Mniej otwartych krajów (3,4–3,6 wobec 4,0): lotnisko S5 buduje się 8–12 kw. (megaprojekt: 8 kw.).
- Jedna instancja pierwszej serii zawiesiła się w 7. kw. pierwszej gry (przeglądarka bez obciążenia procesora); powtórzona, wynik kompletny. Przyczyny nie ustaliłem.

