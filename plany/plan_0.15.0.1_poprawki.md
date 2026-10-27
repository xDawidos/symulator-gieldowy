# Plan 0.15.0.1 „Poprawki 0.15” (po 0.15.0 „Hossa i bessa”, przed 0.15.1 „Sztuka przejęć”)

Cel: naprawić błędy znalezione w weryfikacji 0.15 (`raporty/weryfikacja_0.15.md`), dokończyć brakującą część H5c i doprowadzić balans rynku i funduszu do celów planu 0.15, zanim kolejne wersje 0.15.x zaczną na nim budować.

Gracz zobaczy:
- bezpiecznik giełdowy, który trwa sekundy gry, a nie kwartały (przy ×50 dziś 15 s to ok. 2,5 kw. zamrożonej giełdy);
- margin call, który naprawdę spłaca dług i pogłębia krach przez sprzedaż botów;
- spółki, które emitują akcje, gdy są drogie, i skupują je, gdy są tanie;
- fundusz śledzący GIG, który w bessie nie traci połowy klientów, a przy masowych umorzeniach uruchamia **bramkę umorzeń**.

Czego to uczy (nowe lub naprawione):
- **Emisje i skupy w cyklu:** zarządy sprzedają akcje, gdy rynek płaci dużo, i skupują je w panice — emisja w hossie rozwadnia akcjonariuszy.
- **Bramka umorzeń:** fundusz może czasowo ograniczyć wypłaty (jak fundusze nieruchomości i FIZ), ale płaci za to zaufaniem.
- **Obsunięcie względem rynku:** klient ocenia zarządzającego po tym, o ile stracił więcej niż rynek, a nie tylko po samej stracie.
- **Margin call:** przymusowa sprzedaż spłaca dług po cenie z presją, nie „wymazuje” pieniędzy.

Kolejność: C0 → C1 → C2 → C3 → C4 → C5 → C6 → C7. **Commit po każdej części** (część z kilkoma krokami — commit po każdym kroku). Testy po każdej części (`tests/tests.html`, dziś 492/492).

---

## Punkt wyjścia (pomiar 2026-10-20)

Pomiar przyczyny dryfu premii: `raporty/audyt_planow_0.15.x.md`, sekcja 1. Przebiegi ×200 z łatką pomiarową wstrzykniętą parametrem `patch` w `tests/przebiegi.html`, bez zmian w kodzie gry. Wariant „naprawa B1” liczy bezpiecznik zegarem gry.

| Miara | Bez naprawy (10 × 6,5 roku) | Naprawa B1 (30 × 6,5 roku: 18 bez presetu, 12 `fundusz-gig`) | Naprawa B1 (3 × 20 lat) | Cel |
|---|---|---|---|---|
| Tiki zamrożone bezpiecznikiem | **52 ± 7%** | 0,3% | 0,1% | ≈ 0 |
| Średnia premia rynku ważona czasem | −4,1 ± 3,4% | ok. −0,6 ± 0,5% | +0,1 ± 1,5% | −3…+3% |
| Zmiana C/Z rynku (mediana) | −0,3 ± 0,3 pp/rok (rozrzut 21 → 6) | −0,2 ± 0,1 pp/rok | +0,1 pp/rok | ±1 pp/rok |
| GIG rocznie | 6,5 ± 2,5% | 11,1–13,4% | **10,6 ± 0,4%** | 8–10% (20 lat) |
| Zysk na akcję, mediana spółek | 6,9% | 6,2–8,0% | 2,3% (bankruci = −100%) | 8–11% → zmiana miary (decyzja 1) |
| Fundusz = GIG: udziały rocznie / zaufanie | — | **−21,4 ± 2,4% / 41,7** | — | ±3% / 45–55 |
| Bezpieczniki na grę / krachy na grę | 1,5 / 0,6 | 1,3 / 0,2 | 1,3 / 1,0 | krach 1–3 na 20 lat |

Wnioski z pomiaru:
1. **B1 jest główną przyczyną „dryfu premii” i spadku C/Z z weryfikacji.** W przebiegach ×200 jeden bezpiecznik 1. stopnia (15 s czasu rzeczywistego) zamrażał kursy na 10 kw., a 3. stopnia (60 s) na 40 kw. Premia stała na dnie, a zyski rosły dalej. Po naprawie średnia premia i C/Z są w celu.
2. **Cele premii w tabeli faz są zrównoważone** (model: +0,7% ważone czasem). Krach kosztuje ok. −1,7 pp; dziś może wybuchnąć w Akumulacji i zepchnąć premię do −38%.
3. **Wartość godziwa skacze o ok. 29% przy zmianie fazy gospodarki** (mnożnik C/Z 1,20 w Przegrzaniu → 0,85 w Recesji), a nastrój rynku od 0.15 liczy cykl drugi raz. Mediana kurs / wartość godziwa waha się 0,55–1,45.
4. **Odpływ z funduszu = GIG:** 51% to „🎢 obsunięcie”, 37% „📉 wynik gorszy od GIG”, 9% zaufanie, 2% panika. Zadowolenie klienta liczy obsunięcie **absolutne** (`getClientSatisfactionDrift`), a zaufanie — ponad GIG. W bessie fundusz traci 60–80% udziałów w 3 kw. (tygodniowy limit 15% pozwala na ok. 55% na kwartał).
   - Limit paniki 8%/kw. **jest** w kodzie (`processClientsWeekly`), ale obejmuje tylko przyczynę „panika”.
5. **Nowy błąd B7:** w `processClientsWeekly` (`player.js`) `const value` jest nadpisywane dla klienta Funkcjonariusz (`value = Math.round(value * 1.20)`). To wyjątek `TypeError`, który przerywa tygodniową pętlę klientów (dalsi klienci w tym tygodniu nie są obsłużeni). Dopłata 20% też powstaje z niczego.
6. **H5c:** mnożnik ×1,5 przy premii > +15% trafił do **emisji ratunkowej** (`events.js`), czyli do zadłużonych spółek z dyskontem 15–25%. To nie jest lekcja „emisja, gdy akcje są drogie”. Waga ×2 dla sektora bańki też jest w emisji ratunkowej (`ma.js`).

---

## C0. Sondy w przebiegach (bez zmian zachowania gry)

`tests/przebiegi.html`, w `PROBE` (co kwartał i w `finish`):
- **nastrój:** faza, premia, cel premii, krach (tak/nie), średnia premia ważona czasem;
- **bezpieczniki:** liczba według stopnia, osobno w krachu i poza nim; tiki zamrożone;
- **wycena:** mediana kurs / wartość godziwa, mediana wartość godziwa / zysk, mediana `getValuationMultiplier`, stopa bazowa;
- **zysk rynku ważony kapitalizacją** (decyzja 1): łańcuchowy indeks zysku spółek GIG — co kwartał suma `epsTtm × totalShares` tych samych spółek w kw. t i t−1 (spółki z dodatnim zyskiem w obu), iloczyn ilorazów; roczna stopa jak GIG;
- **emisje i skupy:** liczba uchwał `issue` i `buyback` według fazy rynku; suma `totalShares` spółek GIG (rozwodnienie rynku);
- **fundusz:** udziały, zaufanie, przepływy według przyczyn (już są w `s.fund`), wykorzystanie bramki umorzeń (od C6).

Wynik w `finish()` jako `mood`, `halts`, `valuation`, `earningsIndexCagr`, `issuance`. **Commit C0.**

## C1. B1 — bezpiecznik na zegarze gry

`core.js` (`isMarketHalted`, `getMarketHaltRemainingSeconds`, `triggerMarketHalt`, `checkCircuitBreakers`) i pętla tygodniowa w `main.js`:
- czas wstrzymania liczony **`getGameClockMs()`**:
  - `untilGameMs = getGameClockMs() + sekundy × 1000`;
  - `isMarketHalted` porównuje z `getGameClockMs()`;
  - pauza gry zatrzymuje odliczanie (zegar funduszu stoi w pauzie);
- **1. stopień:** 15 s gry; **2. stopień:** 30 s gry; **3. stopień:** do końca bieżącego tygodnia gry — wstrzymanie kończy pętla tygodniowa (tam, gdzie dziś ustawia się `weeklyStartGig`), `untilGameMs = Infinity` do tej chwili;
- **wczytanie zapisu:** jeśli `marketHalt.untilGameMs > getGameClockMs() + 60 000` (stary znacznik z `Date.now()`), wstrzymanie znika;
- komunikat 3. stopnia bez zmian („do końca tygodnia gry”).
- **Pokrętło warunkowe:** jeśli w C7 bezpieczniki **poza krachem** > 2 na 20 lat, próg 1. stopnia −7% → −8%.
- **Testy:** 15 s wstrzymania = 15 tików przy ×1, ×50 i ×200; pauza nie skraca wstrzymania; 3. stopień kończy się w pętli tygodniowej; zapis z wstrzymaniem z `Date.now()` wczytuje się bez wstrzymania.
- **Commit C1.**

## C2. Margin call i zastaw (B2, B3, B4)

**B2 — margin call botów** (`executeMarginCalls`, `core.js`):
- pozycja bota to obiekt: sprzedaż `floor((shares − lockedShares) × 20–40%)`, z pominięciem startupów i pozycji bez kursu;
- przez `aiSellStock` (wpływ na cenę i rejestr akcji już tam jest).

**B3 — margin call gracza** (`checkPlayerMarginCall`, `core.js`):
- dług = pożyczki lombardowe funduszu (`playerFund.pawnLoans`, `getPawnOutstanding(getFundAccount())`); pole `playerFund.debt` usunąć z wzoru (nikt go nie ustawia, czyta je tylko `checkPlayerMarginCall`);
- próg bez zmian: dźwignia > 50%; kwota do spłaty `wymagane = dług − 40% × aktywa`;
- **spłata zamiast „potrącenia”:** z gotówki funduszu spłacamy pożyczki lombardowe od najstarszej (`repayPawnLoan`), aż spłacimy `wymagane`; zwolnione akcje wracają z zastawu;
- gdy gotówki brakuje: `forceLiquidation(brakująca kwota, 'margin')` (`player.js`) — sprzedaje tylko wolne akcje, zmienia `sharesHeld`, ma wpływ na cenę; potem spłata jak wyżej;
- `forceLiquidation` dostaje parametr przyczyny: `'redemption'` (dzisiejszy opis „klienci umarzają…”) albo `'margin'` („margin call: sprzedaż pod spłatę pożyczki lombardowej”);
- mail i dziennik: kwota spłacona, sprzedane pozycje, nowa dźwignia.

**B4 — windykator** (`processAiLoansWeekly`, `ai.js`): zajęcie najwyżej `shares − lockedShares`.

- **Testy:**
  - bot z długiem > 50% sprzedaje 20–40% wolnych akcji; akcje = posiadacze;
  - margin call gracza: dług spada dokładnie o zapłaconą kwotę, gotówka funduszu + wartość sprzedanych akcji − spłata = 0 (bez znikania pieniędzy); akcje w zastawie nietknięte; akcje = posiadacze;
  - windykator nie zajmuje akcji w zastawie.
- **Commit C2.**

## C3. Pieniądze znikąd (B6, B7)

- **B6 — „Komendant Jakub”** (`ai.js`): dopłata pobierana z `governmentTreasury`; gdy skarbu nie starcza, bez dopłaty (bot kupuje za tyle, ile ma).
- **B7 — Funkcjonariusz** (`processClientsWeekly`, `player.js`):
  - `let value`, a dopłata 20% z programu policyjnego pobierana z `governmentTreasury` (bez skarbu — bez dopłaty);
  - usunąć martwy warunek `def.key === 'retiree'` (typ nazywa się `senior`).
- **Testy:** klient Funkcjonariusz dokupuje udziały bez wyjątku, a pętla obsługuje wszystkich klientów; skarb maleje o dopłatę; Komendant bez skarbu nie dostaje pieniędzy.
- **Commit C3.**

## C4. Emisje i skupy spółek według nastroju (H5c)

Ścieżka: porządek obrad walnego (`buildAgmAgenda`, `ma.js`), uchwały `issue` (`runAgmIssue`: 10% akcji, cena kursu × 0,95) i `buyback` (`runBuyback`: do 10% gotówki).

| Sytuacja | Warunek | Uchwała | Szansa przy walnym |
|---|---|---|---|
| Brak gotówki (jak dziś) | gotówka < 3% kapitalizacji | emisja | 50% |
| **Drogie akcje** (nowe) | premia rynku > +15% **albo** kurs / wartość godziwa ≥ 1,3 | emisja | **30%**, ×2 (60%) w sektorze bańki |
| Nadmiar gotówki (jak dziś) | gotówka > 15% kapitalizacji i akcje nie są drogie | skup | 50% |
| **Tanie akcje** (nowe) | premia rynku < −15% **albo** kurs / wartość godziwa ≤ 0,75, gotówka > 5% kapitalizacji | skup | **40%** |

- Najwyżej jedna z tych uchwał na walne (emisja ma pierwszeństwo przed skupem przy drogich akcjach, skup przy tanich).
- **Usunąć** mnożnik ×1,5 z emisji ratunkowej (`events.js`) i wagę bańki z wyboru spółki do emisji ratunkowej (`ma.js`) — emisja ratunkowa wraca do roli ratunku zadłużonych.
- **Wiadomości:** gdy fundusz ma akcje spółki — wpis w pasku newsów „X emituje 10% akcji przy wysokiej wycenie” / „X skupuje akcje przy niskiej wycenie”; bez dymków.
- **Akademia:** hasło „Emisje i skupy w cyklu rynku” (odblokowanie przy pierwszej takiej uchwale w spółce z portfela): zarząd wybiera moment, emisja przy wysokiej wycenie rozwadnia, skup przy niskiej zwiększa udział w zysku.
- **Testy:** drogie akcje → uchwała emisji w porządku obrad z szansą 30% (10 000 losowań, ±2 pp), w sektorze bańki 60%; tanie akcje → skup 40%; emisja ratunkowa nie zależy od premii rynku; akcje = posiadacze po emisji i skupie.
- **Commit C4.**

## C5. Wycena w cyklu i krach (decyzje 3 i 4)

**C5a. Mnożnik C/Z fazy gospodarki o połowę** (`ECONOMY_PHASES`, `core.js`):

| Faza gospodarki | `peMult` dziś | Nowy |
|---|---|---|
| Ożywienie | 1,00 | 1,00 |
| Ekspansja | 1,10 | **1,05** |
| Przegrzanie | 1,20 | **1,10** |
| Recesja | 0,85 | **0,93** |

Nastrój rynku (premia faz rynku) przejmuje resztę wahań. Cel: mediana kurs / wartość godziwa w 80% kwartałów w 0,75–1,30 (dziś 0,55–1,45). **Commit C5a.**

**C5b. Krach tylko po wzrostach** (`checkMarketCrashQuarterly`, `processMarketCrashWeekly`, `core.js`):
- krach możliwy w **Euforii, Dystrybucji i Hossie trwającej ≥ 4 kw.** (nie w Akumulacji, nie w Bessie i Kapitulacji, nie w pierwszych 3 kw. Hossy);
- **szansa bazowa 1,2% → 2,5%/kw.** (mniej kwartałów, w których krach jest możliwy); dodatki bez zmian (+6 pp w Euforii, +1 pp za każde 10 pp premii ponad +20%, +1 pp przy dźwigni botów > 40%);
- spadek premii o 25–35 pp, ale **nie niżej niż −35%** (dno Kapitulacji): `cel = max(−0,35, start − spadek)`;
- model Monte Carlo (4000 × 20 lat): 1,0 krachu na 20 lat, ≥ 1 krach w 32% gier 6,5-letnich, średnia premia −0,9% (dziś: 0,9 / 27% / −1,0%).
- **Testy:** brak krachu w Akumulacji i w kw. 1–3 Hossy (10 000 losowań); premia po krachu ≥ −35%; rozkład liczby krachów w modelu.
- **Commit C5b.**

## C6. Odpływ z funduszu: obsunięcie względem GIG i bramka umorzeń (decyzja 2)

**C6a. Obsunięcie względem rynku** (`getClientSatisfactionDrift`, `player.js`):
- dziś: `drawdown = −max(0, DD funduszu − 0,05) × awersja × 0,3` na tydzień;
- nowe: `drawdown = −awersja × 0,3 × [max(0, DD funduszu − DD GIG − 0,03) + k × max(0, DD GIG − 0,10)]`, gdzie DD GIG = `current.benchmarkDrawdown`;
- **k = 0,15** (pokrętło 0,05–0,30): mała część absolutna — w głębokiej bessie Strachliwi i Emeryci dalej się niepokoją, ale fundusz = GIG nie traci większości klientów;
- panel „Dlaczego klienci odchodzą”: przyczyna „🎢 obsunięcie” opisana jako „obsunięcie większe niż GIG” (gdy dominuje część względna) albo „głęboka bessa” (część absolutna).
- **Commit C6a.**

**C6b. Bramka umorzeń** (`processClientsWeekly`, `player.js`):
- **łączny limit umorzeń: 10% udziałów z początku kwartału** (wszystkie umorzenia na rynku pierwotnym: niezadowoleni, panika, Spryciarz, brak kupca na rynku wtórnym); w tym **panika ≤ 5%** (dziś 8%);
- tygodniowy limit 15% zostaje (w praktyce działa limit kwartalny);
- **kolejka:** klient, który chciał umorzyć ponad limit, dostaje `queuedRedemption` (udziały); na początku następnego kwartału jego umorzenie idzie **pierwsze** i liczy się do nowego limitu; jeśli w międzyczasie zadowolenie wróci powyżej progu niezadowolenia, klient rezygnuje z kolejki;
- **gdy bramka zadziała** (raz na kwartał): mail i wpis w pasku newsów „Fundusz uruchomił bramkę umorzeń: X udziałów w kolejce”, zaufanie −2 (bramka chroni fundusz, ale klienci to widzą);
- panel „Dlaczego klienci…”: wiersz „Bramka umorzeń: wykorzystano X% z 10%, w kolejce Y udziałów”;
- sprzedaż udziałów na rynku wtórnym (`juMarket`) **nie** jest objęta bramką (to wyjście bez umorzenia).
- **Akademia:** hasło „Bramka umorzeń” (odblokowanie przy pierwszym uruchomieniu).
- **Commit C6b.**

**C6c. Strojenie napływu** (tylko jeśli po C6a–C6b udziały funduszu = GIG są poza −3…+3%/rok): `ORGANIC_INFLOW_BASE` (0,02) w krokach ±0,005, potem `k` z C6a. Każdy krok: 20 przebiegów `fundusz-gig` × 6,5 roku. **Commit po każdym kroku.**
  - Jeśli zaufanie funduszu = GIG zostanie < 45: rozbicie składników (sonda `trustBreakdown` z H0: nadwyżka, obsunięcie, kara makro, premia za wynik, spokój, wymuszone sprzedaże) w raporcie C7 i krok strojenia **po decyzji użytkownika**.

- **Testy C6:** fundusz = GIG w bessie (GIG −30%, fundusz −30%) ma składnik obsunięcia ≤ 15% dzisiejszego; fundusz −30% przy GIG −10% ma pełny składnik; suma umorzeń w kwartale ≤ 10% udziałów z początku kwartału; kolejka realizowana jako pierwsza w następnym kwartale i rezygnacja przy odzyskanym zadowoleniu; panika ≤ 5%; rynek wtórny poza bramką; zapis i wczytanie kolejki.

## C7. Kontrola końcowa

Pomiar z „Jak sprawdzimy”, raport `raporty/kontrola_0.15.0.1.md`, wiersz w mapie. **Commit C7.**

---

## Zapis gry i testy

- **Zapis v15 bez zmiany numeru** (wszystkie nowe pola opcjonalne, z domyślnymi wartościami przy wczytaniu):
  - `client.queuedRedemption` (udziały), w statystyce kwartału `gateUnitsRedeemed`, `gateTriggered`;
  - `marketHalt.untilGameMs` w zegarze gry (stary znacznik z `Date.now()` czyszczony przy wczytaniu);
  - przyrost zapisu < 0,05%.
- **Testy** (nowa grupa „0.15.0.1”, ok. 20 testów): wymienione w częściach C1–C6, do tego:
  1. niezmienniki świata po 20 latach;
  2. brak `NaN` w pozycjach botów po margin callu;
  3. zapis i wczytanie w trakcie wstrzymania, krachu i z kolejką umorzeń.

## Jak sprawdzimy

Przebiegi ×200 w `tests/przebiegi.html`: **20 gier × 6,5 roku bez presetu, 20 gier × 6,5 roku z `fundusz-gig` i 5 gier × 20 lat**. Każda część C1–C6: ≥ 10 gier × 6,5 roku (C6 — z `fundusz-gig`). ± to błąd standardowy średniej.

| Miara | Cel |
|---|---|
| Tiki zamrożone bezpiecznikiem | ≤ 0,5% |
| Bezpieczniki poza krachem | ≤ 2 na 20 lat |
| Średnia premia rynku ważona czasem (20 lat) | −3…+3% |
| C/Z rynku (mediana) | bez trendu, ±1 pp/rok |
| Mediana kurs / wartość godziwa | w 0,75–1,30 w ≥ 80% kwartałów |
| GIG rocznie (20 lat, mediana) | 8–10% |
| **Zysk rynku ważony kapitalizacją** (decyzja 1) | **8–11%/rok**; mediana spółek ≥ 5%/rok |
| Krachy | 1–3 na 20 lat; ≥ 1 w 30–50% gier 6,5-letnich; premia po krachu ≥ −35% |
| Emisje / skupy według fazy | emisje w Hossie i Euforii ≥ 2× częściej niż w Bessie i Kapitulacji; skupy odwrotnie |
| Rozwodnienie rynku (suma akcji spółek GIG) | +0,5…+2%/rok |
| **Fundusz = GIG: udziały / zaufanie** | **−3…+3%/rok / 45–55** |
| Fundusz = GIG: najgorszy kwartał | odpływ ≤ 10% udziałów (+ kolejka) |
| Margin call | 0 przypadków „dług bez zmiany po potrąceniu”; akcje = posiadacze |
| Ostrzeżenia „zastaw > posiadanych” | 0 |
| Wyjątki JS w przebiegach | 0 |
| Niezmienniki, ujemna gotówka, bezpiecznik gotówki | 0 |
| Testy | 492 + nowe, wszystkie zielone |
| Czas kroku / zapis | +≤ 2% / +≤ 0,05% |

## Ryzyka

- **GIG po naprawie B1 jest nieco za wysoki** (10,6% w 20 latach, cel 8–10%). C4 dodaje rozwodnienie (+0,5…+2% akcji rocznie), które obniża wzrost kursów. Jeśli po C7 GIG > 10%: osobny krok strojenia `INFLATION_PASS_THROUGH` (0,15 → 0,10) po decyzji użytkownika.
- **Bramka umorzeń jako tarcza dla złego zarządzającego.** Zabezpieczenie: kolejka (umorzenie tylko odroczone), zaufanie −2 przy każdym uruchomieniu, limit 10%/kw. to nadal do 34% udziałów rocznie.
- **Względne obsunięcie usuwa lekcję „bessa boli”.** Zabezpieczenie: część absolutna k = 0,15 i panika Strachliwych (≤ 5%/kw.).
- **Połowa mnożnika C/Z cyklu zmienia lekcję „wycena zależy od cyklu”.** Cykl nadal działa przez zyski, stopy (`rateSens`) i nastrój rynku; wahania są mniejsze, ale widoczne.
- **Częstszy krach w Hossie (2,5%/kw.)** — cel liczby krachów pilnowany w C7.
- **Zmiana miary zysku na akcję** może ukryć słabe spółki. Zabezpieczenie: mediana spółek ≥ 5% jako dolna kontrola.

## Decyzje (podjęte)

2026-10-20 (planowanie 0.15.x, `raporty/audyt_planow_0.15.x.md`):
1. **Cel zysku na akcję** liczony jak GIG: zysk rynku ważony kapitalizacją 8–11%/rok; mediana spółek ≥ 5%/rok jako kontrola. Bez zmiany wzrostu przychodów (`SECTOR_GROWTH_FACTOR` zostaje 0).
2. **Odpływ z funduszu:** obsunięcie oceniane względem GIG (z małą częścią absolutną) **i** bramka umorzeń 10% udziałów na kwartał z kolejką.
3. **Mnożnik C/Z fazy gospodarki o połowę** (0,93 / 1,00 / 1,05 / 1,10).
4. **Krach tylko po wzrostach:** w Euforii, Dystrybucji i w Hossie trwającej ≥ 4 kw.; spadek premii 25–35 pp, nie niżej niż −35%; szansa bazowa 2,5%/kw.
5. **Przyczyna dryfu premii i spadku C/Z z weryfikacji to B1** (zamrażanie kursów w przebiegach). Tabela celów faz zostaje bez zmian.
