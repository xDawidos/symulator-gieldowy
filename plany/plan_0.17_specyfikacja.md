# 0.17 „Surowce i transport” — specyfikacja części S1–S7 (2026-11-01)

Uzupełnia `plan_0.17_surowce_transport.md` (zakres, kolejność, miary). Liczby są **startowe**: chat kodu może je stroić w kalibracji, ale każdą zmianę wpisuje do raportu kontrolnego. Lista spółek: `propozycja_spolek_0.17.md` (zatwierdzona).

Zasady wspólne:
- **Ceny surowców nie zależą od gracza ani botów** (rynek światowy, egzogeniczny). Upraszcza kalibrację i wyklucza manipulację.
- **„Średnio zero”:** każdy wpływ ceny na spółki liczony względem **średniej kroczącej ceny z 8 kwartałów**, nie względem ceny startowej. Długoterminowo odchyłki marż znoszą się z definicji; liczy się tylko odchylenie od trendu.
- Rozliczenia w **walucie bazowej funduszu po kursie USD** (wynik zawiera zmianę kursu; Akademia to wyjaśnia).
- Zapis: nowe pola **opcjonalne** (stare zapisy działają bez nich), podbicie `SAVE_FORMAT_VERSION` tylko gdy potrzebne.

---

## S1 — Rejestr surowców i zdarzenia

Nowy plik `commodities.js` (rejestr, krok tygodniowy, historia, zapis).

### Parametry startowe (ceny w USD)

| Id | Surowiec | Cena średnia | Zmienność roczna σ | Powrót do średniej θ (kw.) | Sezon (mnożnik średniej) | Popyt przemysłu β_p | Zbrojenia β_z | Widełki × średnia |
|---|---|---|---|---|---|---|---|---|
| `gold` | Złoto (uncja) | 2 000 | 15% | 0,05 | — | −0,2 (bezpieczna przystań) | 0,1 | 0,5–2,0 |
| `oil` | Ropa (baryłka) | 75 | 35% | 0,15 | Q3 +3% | 1,0 | 0,2 | 0,4–2,5 |
| `gas` | Gaz (MMBtu) | 3,5 | 40% | 0,25 | Q1 +12%, Q4 +6%, Q2 −6%, Q3 −12% | 0,8 | 0,1 | 0,4–3,0 |
| `coal` | Węgiel (tona) | 120 | 30% | 0,15 | Q1 +6%, Q3 −6% | 0,9 | 0,1 | 0,4–2,5 |
| `metals` | Metale przemysłowe (indeks miedź/żelazo) | 100 | 25% | 0,10 | — | 1,3 | 0,5 | 0,5–2,0 |
| `grain` | Zboże (buszel) | 6 | 25% | 0,20 | Q2 +5%, Q3 −8% (żniwa) | 0,2 | 0 | 0,5–2,0 |
| `uranium` | Uran (funt) | 60 | 30% | 0,08 | — | 0,3 | 0,1 | 0,4–2,5 |

### Model (co tydzień)

- `ln P(t+1) = ln P(t) + θ_t · (ln M(t) − ln P(t)) + σ/√52 · ε + szoki`, gdzie `θ_t = 1 − (1 − θ)^(1/13)`.
- Cel `M(t) = średnia · inflacja USD (2%/rok) · sezon(kwartał) · (1 + β_p · (popyt − 1)) · (1 + β_z · (zbrojenia − 1))`.
- **Popyt przemysłu** = mnożnik z fazy cyklu sektora Przemysł (`macro.sectorCycles`, faza → 0,85…1,15) kraju startowego, uśredniony z krajami dołączonymi.
- **Zbrojenia** = średni udział wydatków obronnych krajów (S6) / 2,5% (przed S6 = 1).
- Szok = przesunięcie `ln M` na czas zdarzenia (cena dochodzi do niego tempem θ) i jednorazowy skok ceny o połowę szoku.
- Cena przycinana do widełek; historia 104 tygodni (wykres), starsza co kwartał.
- Nastrój rynku (hossa/bessa z 0.15) dodaje ±3% do `M` dla ropy, metali i węgla.

### Zdarzenia (nowe w `commodities.js`, losowane co kwartał; istniejące spięte z cenami)

| Zdarzenie | Surowce | Czas | Szansa / warunek | Skutek dla spółek |
|---|---|---|---|---|
| **Embargo / blokada cieśniny** (geopolityczne) | ropa +30…60%, gaz +20…40% | 2–4 kw. | 4%/rok × (1,5 − bezpieczeństwo/100) (przed S6 × 1,0) | przez koszty wsadu (S2); bezpieczeństwo kraju startowego −5 |
| **Strajk w kopalniach** | węgiel lub metale +15…25% | 1–2 kw. | 6%/rok | spółki wydobywcze kraju startowego z tym produktem: −20% produkcji (przychód) |
| **Ucieczka do złota** | złoto +10…20%; ropa i metale −10% | 2–4 kw. | start linii kryzysu bankowa / czarny czwartek / pandemia (`crises.js`) | — |
| **Rekordowe zbiory** | zboże −15…25% | 1 sezon (2 kw.) | 8%/rok, nie w roku suszy | rolnictwo: przychód w dół, Żywność: koszt w dół |
| **Awaria reaktora za granicą** | uran −30% | 4–6 kw. | 2%/rok | Energetyka jądrowa −5% kursu jednorazowo |
| Istniejące: szok naftowy (`MACRO_SHOCK_EVENTS.oil`, linia 1973) | ropa +40% | jak teraz | bez zmian | tekst zgodny z ceną |
| Istniejące: susza (`drought`) | zboże +20% | 2 kw. | bez zmian | — |
| Istniejące: spadek cen energii (`energyprices`) | gaz i węgiel −15% | 2 kw. | bez zmian | — |

**Testy S1 (ok. 6):** widełki w 100% kroków ×200; zmienność roczna w ±5 pp od σ; sezon gazu widoczny (średnia Q1 > Q3); zdarzenie przesuwa cenę i wygasa; zapis i wczytanie bez różnic; stary zapis bez pola `commodities` startuje z cen średnich.

---

## S2 — Spółki i koszty wsadu

### Pola definicji spółki
- `commodity: { produkt: { gold: 1 }, wsad: { oil: 0.25 } }` — opcjonalne; przypisania z listy spółek i tabela domyślna niżej.
- Spółki bez pola dziedziczą **wsad domyślny sektora/podsektora** (tabela). Produkt ma tylko spółka przypisana.

### Wpływ na wyniki (kwartalnie, w `computeQuarterResults`)
- **Produkt:** przychód × `(P̄q / Ś8)^0,6` (P̄q — średnia ceny w kwartale, Ś8 — średnia krocząca 8 kw.).
- **Wsad:** marża −= `udział · (P̄q / Ś8 − 1) · (1 − przerzucenie)`; **przerzucenie na ceny** rośnie liniowo 0 → 60% w 4 kw. trwania odchylenia.
- **Zabezpieczenie (hedging):** spółka ma `h` = 0,3…0,7 (losowane, państwowe 0,3) — `h` części wsadu liczone po cenie sprzed 4 kw. Te zabezpieczenia widać w S3 jako „pozycje zabezpieczające spółek” (tylko informacja).
- Rafinerie (PES, TBN, MEF): wsad ropa 0,6, produkt „paliwa” = ropa 0,6 z opóźnieniem 1 kw. → zarabiają na **marży rafineryjnej** przy zmianie ceny, nie na samym poziomie.

### Wsad domyślny (udział kosztów)

| Sektor / podsektor | Wsad |
|---|---|
| Chemia | ropa 0,25, gaz 0,15 |
| Przemysł | metale 0,25, węgiel 0,05 |
| Motoryzacja | metale 0,15, ropa 0,05 |
| Energia (bez OZE i jądrowej) | węgiel 0,35, gaz 0,15 |
| Energetyka jądrowa | uran 0,20 |
| Transport i logistyka | ropa 0,20 (Lotnictwo 0,30) |
| Żywność | zboże 0,20 (Rolnictwo: produkt zboże, wsad 0) |
| Budowlany | metale 0,10 |
| Obronność | metale 0,15 (S6 dokłada popyt) |
| Pozostałe | brak |

### Kalibracja (warunek wejścia S2)
- Przebiegi ×200, 60 + 60 gier PL w jednej partii: **średnia odchyłek marż sektorów 0 ± 0,3 pp**, `earningsIndexCagr` i marża końcowa w widełkach bazy. Jeśli nie — zmniejszyć wykładnik produktu (0,6) albo udziały, nie dodawać korekt per sektor.
- Nowe spółki z listy wchodzą w S2 (wydobywcze, rolne, rafinerie); transportowe w S4.

**Testy S2 (ok. 6):** wzrost ceny o 20% ponad Ś8 → przychód kopalni +11,5%; marża huty spada o `udział·0,2` przy przerzuceniu 0; po 4 kw. przerzucenie 60%; `h` opóźnia wpływ; spółka bez pola dostaje wsad sektora; nowe spółki są w zapisie i na giełdach z poprawnym poziomem.

---

## S3 — Giełda towarowa: kontrakty, ETC, ETF

### Kontrakty terminowe (silnik `marginEngine`, rynek `'commodities'`)
- Seria kwartalna: zapadalność na koniec 1., 2., 3. i 4. kwartału naprzód; instrument `OIL-2027Q3` itd.
- **Cena kontraktu** = oczekiwana cena + koszt przechowania: `F = M^a · P^(1−a) · (1 + (r_USD + c) · T)`, `a = 1 − (1 − θ)^(kwartały do zapadalności)`, `c` (rocznie): złoto 0,5%, ropa 3%, gaz 6%, węgiel 2%, metale 1,5%, zboże 5%, uran 1%.
  - Cena nad średnią → kontrakty tańsze od ceny bieżącej (**backwardation**); pod średnią → droższe (**contango**). To samo chroni przed exploitem „kup nisko, sprzedaj wysoko”: oczekiwany powrót jest już w cenie.
- Wycena pozycji co tydzień po `F` jej zapadalności; w dniu zapadalności `F = P` → **rozliczenie gotówkowe** i zamknięcie; przycisk **„Przedłuż”** (rolowanie na następną serię, spread jak przy otwarciu).
- **Dźwignia wg surowca:** złoto 1:10; ropa, metale, zboże 1:5; gaz, węgiel, uran 1:3. Limit łączny funduszu wspólny z forexem (`fundLeverageCap` = 3 × aktywa).
- Rynek ma własne: `holdingCostYear = 0` (koszt jest w cenie kontraktu), `entrySpread = 0,3%`.
- **Zmiany w silniku** (`forex.js`, ogólne): pole pozycji `expires` (tydzień) z zamknięciem „zapadalność”; reguły rynku nadpisują `maxLeverage`, `holdingCostYear`, `entrySpread` (np. `maxLeverageOf(instrument)`); stare pozycje forex bez zmian.
- **Do S7 dostępne od razu** (tryb testów); od S7 za umiejętnością „Mistrz Opcji”.

### ETC i ETF surowcowy (bez dźwigni, nie liczą się do limitu dźwigni)
- **ETC** na każdy z 7 surowców: cena = cena bieżąca × (1 − 0,4%)^lata (opłata), kupno/sprzedaż z gotówki funduszu, spread 0,2%. Wartość wchodzi do aktywów funduszu i NAV.
- **ETF „Koszyk Surowców”** (Internet → ETF): równe wagi 7 surowców, rebalans co kwartał, opłata 0,6%/rok. Osobny rodzaj portfela (`commodityEtf`), **nie** w tablicy `etfs` (te trzymają akcje).
- Wymaga umiejętności „Ekspert Rynków Globalnych” L1 (jak obecne ETF-y).
- Podatek od zysku: jak forex.

### Boty
- **Zabezpieczające:** to spółki z S2 (pozycje `h`, tylko podgląd „otwarte pozycje zabezpieczające”).
- **Spekulacyjne:** 2–3 istniejące boty krajowe o stylu agresywnym otwierają małe pozycje (≤ 5% gotówki, dźwignia ≤ 1:3) przez `marginEngine`: trend 13-tygodniowy albo powrót do średniej. **Nie ruszają ceną**; wpływają tylko na swoją gotówkę. Sonda: wynik botów na kontraktach.

**Testy S3 (ok. 8):** `F` z backwardation/contango wg znaku `P − M`; zapadalność rozlicza po `P`; rolowanie; dźwignia wg surowca; wspólny limit z forexem; margin call < 50% depozytu, 0 ujemnej gotówki; ETC traci opłatę; ETF rebalans i zapis; exploit: strategia „kup pod średnią i roluj” ≤ lokata + 6 pp/rok w ×200.

---

## S4 — Transport i indeks frachtu

- **Podsektory „Transport i logistyka”:** Morski, Lotnictwo (cargo i pasażerskie; nazwa zostaje), Lądowy (kolej i ciężarówki), Logistyka. Przeniesienia kolei i nowe spółki z listy.
- **Indeks frachtu** (baza 100) dla każdego rodzaju, co tydzień:
  `I = 100 · (ropa/Ś8)^f · popyt^d · (1/przepustowość)^k · zakłócenia · szum`

| Rodzaj | f (paliwo) | d (popyt) | k (przepustowość, S5) | Zmienność | Czas dostawy (informacyjnie) |
|---|---|---|---|---|---|
| Morski | 0,3 | 1,5 | 0,5 | 40%/rok | 4–6 tyg. |
| Lotniczy | 0,5 | 0,8 | 0,3 | 20%/rok | 1 tydz. |
| Lądowy | 0,3 | 0,6 | 0,8 | 10%/rok | 1–2 tyg. |

- **Opisy:** krajowe spółki transportowe (GRT, CFL, PKC, TIR) od razu z wpisem w `COMPANY_DESCRIPTIONS` (teksty z listy spółek); zagraniczne mają pole `desc` w danych kraju.
- **Przewoźnicy:** przychód × `(Ī/Ś8_I)^0,7`, koszt paliwa przez wsad ropy (S2).
- **Koszt transportu dla sektorów** (udział, „średnio zero” względem Ś8): Przemysł 0,06, Motoryzacja 0,05, Żywność 0,05, Dobra konsumpcyjne 0,05, Chemia 0,04.
- **Zakłócenia:** „Statek utknął w kanale” (morski +40% na 4–8 tyg., EVG −8% kursu, 5%/rok), „Strajk kolejarzy” (lądowy +15% na 2–4 tyg., koleje kraju −3%, 5%/rok), „Pył wulkaniczny” (lotniczy +30% na 2–4 tyg., 3%/rok).
- **Czas dostawy w 0.17 tylko widoczny** (zakłócenia go wydłużają); działa od 0.18 w łańcuchach.
- Indeks frachtu w oknie „Rynek” (decyzja przy designie).

**Testy S4 (ok. 5):** indeks rośnie z ropą i popytem; zakłócenie podnosi i wygasa; przewoźnik zyskuje przy wysokim indeksie; „średnio zero” dla sektorów-odbiorców (×200); nowe spółki transportowe w zapisie.

---

## S5 — Infrastruktura publiczna i PPP

Zmiany użytkownika 2026-11-03 (decyzja 23): koszty ×2, projekty bez nazw własnych, limity obiektów w kraju, ustawa o finansowaniu infrastruktury (5 poziomów, poglądy partii), autostrady w odcinkach z osobnymi przetargami, test dłuższego czasu budowy.

### Przepustowość
- Kraj startowy ma przepustowość dla trzech rodzajów: morski (porty), lotniczy (lotniska), lądowy (magistrale kolejowe i autostrady). Start 1,0 (tyle S4 przyjmuje dziś na stałe).
- Zużycie co roku zależy od poziomu ustawy (tabela niżej). Dolna granica 0,7; górna = 1 + limit obiektów × przyrost (morski 1,45, lotniczy 1,30, lądowy 1,88).
- Przepustowość wchodzi do wzoru indeksu frachtu S4 (`(1/przepustowość)^k`).

### Projekty (nowe typy w katalogu inwestycji państwa; bez nazw własnych)

| Projekt | Rodzaj | Przepustowość | Koszt (jedn. gry) | Budowa | Limit w kraju |
|---|---|---|---|---|---|
| Port morski (rozbudowa terminalu) | morski | +0,15 | 3,2 mln | 8–12 kw. | 3 |
| Lotnisko | lotniczy | +0,15 | 2,8 mln | 8–12 kw. | 2 |
| Magistrala kolejowa | lądowy | +0,10 | 2,0 mln | 6–10 kw. | 4 |
| Autostrada (2–5 odcinków) | lądowy | +0,08 (po równo na odcinek) | 1,6 mln (po równo na odcinek, ±10%) | 4–8 kw. na odcinek | 6 (wstępnie) |

- **Limit** liczy obiekty ukończone i w budowie. Po osiągnięciu limitu państwo nie ogłasza już projektu tego typu; przepustowość trzyma wtedy tylko ustawa (zużycie).
- **Slot budowy:** port, lotnisko i magistrala zajmują po 1 slocie wykonawcy (`constructionStats.maxProjects`); autostrada zajmuje **1 slot na odcinek**.
- **Przyrost przepustowości** przy ukończeniu obiektu; autostrada podnosi przepustowość po każdym ukończonym odcinku (0,08 / liczba odcinków).
- **Czas budowy — do testu w serii:** warianty ×1 (tabela) i ×1,5. W raporcie: ukończone projekty na grę, średnio zajęte sloty Budowlanego przez infrastrukturę, deficyt budżetu. Wybór wariantu należy do użytkownika po raporcie.

### Ustawa „Finansowanie infrastruktury” (nowa w `SOCIAL_LAWS`, klucz `infrastructure`, start: Utrzymanie)

| Poziom | Wydatki na infrastrukturę (% wpływów budżetu, co kwartał) | Zużycie przepustowości / rok | Szansa ogłoszenia projektu / rok |
|---|---|---|---|
| 0 Porzucenie | 0% | 5% | 0% |
| 1 Łatanie dziur | 1% | 3,5% | 10% |
| 2 Utrzymanie (start) | 2% | 2% | 25% |
| 3 Rozbudowa | 3% | 1% | 45% |
| 4 Autostrady na wczoraj | 4,5% | 0,5% | 70% |

- Wydatki to nowa linia budżetu (`budget.infrastructureSpending`), wliczana do `budget.spending`, więc podnosi deficyt. Koszt projektów płaci państwo (`governmentTreasury`) w ratach przez czas budowy, część może pokryć PPP gracza.
- Szansa projektu ×0,5 przy deficycie (`budget.deficitQuarters > 0`). Typ projektu losowany spośród typów poniżej limitu, z wagą tym większą, im niższa przepustowość danego rodzaju.
- **Poglądy partii** (`PARTY_PROGRAMS.moves`): Blok Państwowy +1 (wielkie inwestycje państwa), Ludowcy +1 (drogi i kolej w regionach), Koalicja Rynkowa −1 (cięcia wydatków; wolą PPP), Socjaldemokraci bez ruchu (wolą wydatki socjalne).
- **Reakcja kursów na ogłoszenie zmiany** (`LAW_ANNOUNCEMENT_EFFECTS`): +1 → Budowlany +3%, Transport i logistyka +1%; −1 → Budowlany −2%, Transport i logistyka −0,5%.
- Ustawa w zakładce Państwo → Ustawy jak pozostałe (opis poziomów, kto chce zmiany).

### Przetarg (zamawiający: państwo; kryterium „cena > jakość”)
- Wagi kryteriów: cena 0,6, jakość (czas i doświadczenie) 0,25, wolne moce 0,15; bez premii „państwowy wykonawca”.
- **Port, lotnisko, magistrala:** jeden przetarg, jedna oferta na firmę, wygrywa najwyższa ocena (istniejąca ścieżka ofert i ocen przetargów).
- **Autostrada:** każdy odcinek to osobna pozycja przetargu. Firma budowlana zgłasza ofertę na **od 1 do wszystkich odcinków** (najwyżej tyle, ile ma wolnych slotów), z ceną za każdy odcinek; za pakiet może dać rabat (−2% za każdy odcinek ponad pierwszy).
- Państwo wybiera **podział odcinków między firmy o najniższym łącznym koszcie ocenionym kryteriami** (pełny przegląd kombinacji, odcinków ≤ 5): jeśli dwie firmy razem wychodzą taniej niż jedna z rabatem pakietowym, dostają po części odcinków. Odcinek bez oferty wraca do przetargu w następnym kwartale.
- Dziennik: „Autostrada (4 odcinki): odcinki 1–2 — ABL, odcinki 3–4 — [firma]; łącznie X zł”.

### Pozostałe
- Gracz może współfinansować projekt przez **ofertę PPP** (istniejące `PPP_FUND_LIMIT`, `PPP_RECOVERY`); autostrada jako jedna oferta PPP na cały projekt.
- **Interwencje państwa 0.15.3:** „program robót publicznych” w Czarnym czwartku i bessie zamawia projekt z tej listy (poniżej limitu) zamiast samej dopłaty dla Budowlanego → **domyka odstępstwo 6** z `kontrola_0.15.3.md`.
- Po ukończeniu: przepustowość ↑ → niższy indeks frachtu w kraju → niższy koszt transportu sektorów krajowych, a przewoźnicy krajowi +5% wolumenu.
- **Ustalenia z sesją kodu (2026-11-03):** zamawiający to podmiot „Skarb Państwa (inwestycje)”, który przy podpisaniu umowy wpłaca całą cenę na depozyt z `governmentTreasury`; do budżetu koszt wchodzi w ratach (cena / kwartały budowy). `infrastructureSpending` = % wpływów z ustawy + raty projektów w toku. Państwo wypłaca wykonawcy **zaliczkę 30% ceny** projektu lub odcinka na start (mniej kredytu obrotowego). Przewoźnicy krajowi: przychód × (1 + 0,05 · (przepustowość − 1) / 0,15). PPP: jedna oferta na 25% kosztu, spłata ze skarbu, oprocentowanie obligacji skarbowych + 1 pp, termin = budowa + 4 kw., wpłata gracza zmniejsza raty państwa. Przetarg bez reputacji. Czas: kwartał = 35 dni budowy. W serii: zerwane budowy infrastruktury na grę.
- Zapis: pola opcjonalne (przepustowość, liczniki obiektów, projekty w toku z odcinkami); nowa ustawa w starym zapisie startuje od Utrzymania.

### Lotnisko S5 zamiast starego lotniska miasta (decyzja 24, 2026-11-03)
- **Usuwamy stary typ:** megaprojekt miasta `airport` („Port lotniczy”, `MEGA_PROJECTS` w `state.js`, 60 mln, konsorcjum) znika z listy megaprojektów. Jedynym lotniskiem w grze jest projekt S5 „Lotnisko”.
- **Mechaniki starego lotniska przechodzą na pierwsze ukończone lotnisko S5:**
  - `isAirportBuilt()` = co najmniej jedno ukończone lotnisko S5 (albo `airportState.forced`); `isAirportInProgress()` = lotnisko S5 w budowie;
  - bilety na rynki zagraniczne (`buyTicket`), boty kupujące bilety i otwierające kraje (`processAirportQuarterly`), cel gracza „Wejdź na rynek zagraniczny”, premia Turystyki za bilet — bez zmian, tylko warunek z S5;
  - premia sektorowa starego megaprojektu (Transport i logistyka, Turystyka: wzrost +1,0%, wycena +5%, kondycja +0,4) przy ukończeniu pierwszego lotniska S5;
  - **samo zlecenie lotniska:** reguła `TICKET_RULES.autoOrderFromQ` (od 4. kwartału) i `autoOrderChance` (30%/kw.) zostaje — gdy kraj nie ma żadnego lotniska ani lotniska w budowie, państwo ogłasza projekt S5 „Lotnisko” niezależnie od poziomu ustawy (inaczej przy „Porzuceniu” gra nie otwarłaby rynków zagranicznych);
  - przycisk „Zleć budowę lotniska” (okno lotniska, Internet → Ferie i wakacje) zleca państwu projekt S5 „Lotnisko” (poniżej limitu, gdy żadne nie jest w budowie).
- **Stare zapisy:** ukończony megaprojekt `airport` = 1 ukończone lotnisko S5 (przepustowość lotnicza +0,15, licznik limitu 1); megaprojekt `airport` w budowie kończy się po staremu i wtedy zamienia w lotnisko S5.
- **Łączenie giełd** (`hasLinkInfrastructure` / `LINK_RULES.infraMult` w `exchange_links.js`) liczy infrastrukturę S5 zamiast megaprojektów: mnożnik szansy = 1 + 2 (pierwsze lotnisko; jak dotychczasowe ×3) + 0,5 (drugie lotnisko) + 0,2 za każdy port + 0,1 za każdą magistralę kolejową (autostrady bez wpływu); najwyżej 1 + 2 + 0,5 + 0,6 + 0,4 = ×4,5.
- **Port morski tak samo** (decyzja użytkownika 2026-11-03): megaprojekt miasta `seaport` („Port morski”, 45 mln) też usunięty; premia sektorowa starego megaprojektu (Transport i logistyka, Przemysł: wzrost +0,8%, wycena +4%, kondycja +0,4) przy ukończeniu pierwszego portu S5. Stare zapisy: ukończony megaprojekt `seaport` = 1 port S5 (przepustowość morska +0,15, licznik limitu 1); w budowie kończy się po staremu i zamienia w port S5.
- **Testy:** bilet wymaga lotniska S5; autoOrder ogłasza lotnisko S5 przy „Porzuceniu”; stary zapis z ukończonym megaprojektem lotniska = 1 lotnisko S5; mnożnik łączenia giełd z lotnisk, portów i magistral.

**Testy S5 (ok. 8):** projekt podnosi przepustowość po ukończeniu (autostrada po każdym odcinku); zużycie zależy od poziomu ustawy; limit obiektów blokuje kolejny projekt typu; ustawa: wydatki w budżecie i ruchy partii; przetarg autostrady dzieli odcinki między dwie firmy, gdy tak taniej, i daje wszystkie jednej, gdy pakiet tańszy; odcinek zajmuje slot wykonawcy; PPP z udziałem gracza rozlicza się jak dotąd; interwencja kryzysowa zamawia projekt; stary zapis wczytuje się z ustawą na Utrzymaniu.

---

## S6 — Zbrojenia, surowce i bezpieczeństwo państwa

- **Budżet obronny kraju startowego:** nowa linia `society.budget.defense = przychody budżetu × defenseShare` partii rządzącej, wliczana do wydatków (deficyt).
  - `RULING_PARTIES`: dopisać `defenseShare` — Koalicja Rynkowa 2,0%, Blok Państwowy 3,5%, Ludowcy 2,0%, Socjaldemokraci 1,5%. Zmienia się po wyborach.
  - Przy szoku geopolitycznym (embargo) partia rządząca podnosi udział o 50% na 4–8 kw. (wszystkie partie).
- **Zamówienia:** budżet obronny trafia jako przychód do spółek `special: 'defense'` kraju startowego (proporcjonalnie do kapitalizacji); zastępuje część obecnego bonusu `getDefenseGrowthBonus` (policja) — razem kalibrowane do „średnio zero” przy udziale 2%.
- **Surowce:** obronność ma wsad metale 0,15 (S2); globalne „zbrojenia” (średni udział krajów / 2,5%) podnoszą cel cen metali (β_z 0,5) i ropy (0,2).
- **Elektronika:** zamówienia obronne dają małą premię popytu podsektorowi Półprzewodniki (+1% przychodu przy udziale 3,5%).
- **Poziom bezpieczeństwa (0–100)** kraju startowego = `50 + 600 · (defenseShare − 0,02) + 10 · efektywność policji − szoki geopolityczne (−5…−15, wygasają w 4–8 kw.)`.
  - Kraje obce: stała wartość `security` w `COUNTRY_DEFS` (DE 70, US 80, CZ 65, SE 70, CH 85, FR 70, JP 70, TW 40, CN 60, IN 55), spada tylko przy szokach geopolitycznych.
- **Skutki bezpieczeństwa (decyzja):**
  1. **Napływ kapitału zagranicznego:** szansa zakupu przez boty zagraniczne × `(0,8 + 0,4 · S/100)`; premia za ryzyko kraju ±2% wyceny (P/E) przy S = 100 / 0.
  2. **Stabilność i nastroje:** ±0,5 pp nastrojów konsumentów przy odchyleniu S o 25 od 50.
  3. **Szoki geopolityczne:** szansa embarga × `(1,5 − S/100)` (S1).
- Bez wpływu na przestępczość i policję (poza składnikiem policji w S).

**Testy S6 (ok. 5):** linia budżetu i deficyt; zmiana partii zmienia udział; zamówienia trafiają do spółek obronnych; S liczy się ze wzoru i wpływa na szansę embarga; obce kraje mają stałe S.

---

## S7 — „Mistrz Opcji”, interfejs, Akademia, kontrola

- **Umiejętność „Mistrz Opcji”** (nowa w `skills`, `player.js`; bez emoji w nazwie, ikona od designu):
  - **L1 (koszt 1 500):** kontrakty terminowe — tylko pozycje długie, dźwignia do 1:3 (lub niższa wg surowca).
  - **L2 (koszt 5 000):** pozycje krótkie i pełna dźwignia wg surowca.
  - ETC i ETF zostają za „Ekspertem Rynków Globalnych” L1. Pozycje otwarte przed zakupem umiejętności (stare zapisy z czasu testów) zostają do zapadalności.
- **Interfejs:** okno giełdy towarowej wg projektu czatu designu (lista 7 surowców z ceną i zmianą, wykres 104 tyg., seria kontraktów z contango/backwardation słowem, depozyt słowem i liczbą, ETC, ETF koszykowy); indeks frachtu i przepustowość; bezpieczeństwo państwa w karcie kraju. Kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.
- **Opisy własne spółek krajowych** (decyzja 2026-11-02): mapa `COMPANY_DESCRIPTIONS` w `companies.js` (po symbolu, działa w starych zapisach; zastępuje zdanie o działalności z szablonu sektora) ma dziś 4 wpisy (PES, NAG, ZST, SLS). W S7 dopisać opisy **wszystkich ok. 32 pozostałych spółek PL** (1–2 zdania: czym się zajmuje, żart w stylu nazw, na co reaguje kurs). Propozycje tekstów w `plany/opisy_spolek_pl.md` do akceptacji przed wpisaniem; test: każda spółka z `initialStocks` ma wpis.
- **Akademia (8 lekcji):** Cykl surowcowy; Koszt wsadu i przerzucenie na ceny; Kontrakt terminowy; Contango i backwardation; Depozyt i margin call na towarach; ETC i ETF surowcowy; Fracht i wąskie gardła; Bezpieczeństwo państwa i zbrojenia.
- **Zapis:** budżet ≤ 2,49 mln znaków (+7%) (PL 27 kw.); historia cen 104 tyg. × 7 + indeks frachtu 3 × 104 ≈ 1 000 liczb.
- **Kontrola** `raporty/kontrola_0.17.md`: GIG ±1 pp na 120 + 120 gier PL (jedna partia), seria PL 20 lat ×12, czas kroku ≤ 1 334 ms/kw. (≥ 8 gier sekwencyjnie), niezmienniki 0, exploit kontraktów ≤ lokata + 6 pp.

**Testy S7 (ok. 4):** bez umiejętności brak kontraktów; L1 tylko długie ≤ 1:3; L2 krótkie; lekcje Akademii mają wpisy.

---

## Zlecenie dla czatu designu (przed S3) — uzupełnienie

Do zakresu z planu dochodzą: ETC i ETF koszykowy w oknie giełdy towarowej; seria kontraktów (4 zapadalności) z oznaczeniem contango/backwardation słowem; przepustowość infrastruktury; wskaźnik bezpieczeństwa państwa w karcie kraju; ikony 7 surowców, 3 rodzajów transportu i umiejętności „Mistrz Opcji”.
