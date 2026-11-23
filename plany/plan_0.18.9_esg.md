# Plan 0.18.9 „ESG i etyka” (2026-11-23)

Ostatnia część serii 0.18. Zgłoszenie użytkownika z 2026-11-23 (punkty 1–13 niżej). Stan wyjściowy: `zmiany-AI` po 0.18.8 (4bd767b, seria końcowa fk: GIG 20 lat 10,33%, Rubinowa 76%, Szmaragdowa 84%, zanieczyszczenie około 66). Liczby są startowe, a kalibrację robi kontrola G11.

## Decyzje użytkownika (2026-11-23)

| Nr | Decyzja | Część |
|---|---|---|
| 1 | Trzy litery E, S, G w skali A–D i wynik łączny A–D. A = firma super etyczna, B = pojedyncze zarzuty (np. współpraca z nieetycznymi), C = nieetyczna, D = duże zarzuty. Nie każda spółka ma ocenę („brak oceny”) | G1 |
| 2 | Jeden z audytorów (E5) patrzy na ESG, co wpływa na jego rating kredytowy | G2 |
| 3 | Klient etyczny jest niezadowolony, gdy fundusz ma duży udział w spółkach C i D. Rozszerzamy istniejący typ `ethical` | G6 |
| 4 | Fundusz gracza może ogłosić się etycznym: większe zainteresowanie (zwłaszcza etycznych), ale limit udziałów w C i trochę w B | G6 |
| 5 | Nowe cechy CEO: etyk, ignorant, ekolog, konserwatysta (ten ostatni głównie tradycyjna energia), wpływające na decyzje spółki | G3 |
| 6 | Spółki stają się etyczne przez inwestycje i ulepszenia ograniczające CO2, brak szarej strefy i projekty ekologiczne (nowa lista) | G4 |
| 7 | Strona „RateU” w Internecie: najwyżej i najniżej oceniani (wpływ na cenę), płatne badanie wskazanej spółki u firmy konsultingowej; przy rozwiniętym UEiE zakładka pro- i antyekologicznych | G7 |
| 8 | Karta spółki: czy firma jest etyczna i rating ESG (lub „brak oceny”) | G8 |
| 9 | Popyt inwestorów: A trochę wyższy, C i D niższy | G5 |
| 10 | UEiE na najwyższym poziomie może wprowadzić ESG jako kryterium awansu (do kryteriów E0). Poziom niżej: raz w roku rozporządzenia i kary za greenwashing, więc jest różnica między etyką deklarowaną a rzeczywistą | G9 |
| 11 | Można rozwinąć mechaniki z umiarem; dodatki oznaczone „propozycja planowania” | oznaczenia w tekście |
| 12 | Dostroić progi Rubinowej i Szmaragdowej do obsadzenia bliskiego 100% celu; Diament dla najlepszej spółki | G10 |
| 13 | Zanieczyszczenie nie jest celem 0.18.9 (handel emisjami w 0.19.1), ale ESG nie może go wyraźnie podnieść | bramka G11 |
| 14 | (zmiana 2026-11-23) ESG bada kilku audytorów, nie jeden: na starcie 1 losowy nigdy (`noEsg`), 2 losowi tak; co rok pozostali dołączają z szansą 10%, najwyżej 5, wpis w Gazecie. W RateU badania zamawia się u każdego z 6 audytorów (Wielka Trójka dokładniej i drożej, mali taniej i mniej dokładnie); audytor bez ESG daje tylko prywatną ocenę kredytową | G2, G7 |

## Co już jest w kodzie (przegląd 2026-11-23)

- `getEsgRating` (`energy.js:438`) zwraca A, gdy `stock.esg`, B dla emisji ≤ średniej sektora i C dla wyższych. Gra nigdzie z tego nie korzysta (tylko test `tests.js:17480`).
- Ścieżka ESG: `canOrderEsg` / `orderEsg` (`energy.js:631–648`) od poziomu UEiE 3 (`ENERGY_OFFICE_RULES.esgLevel`). Koszt to roczny przychód × `esgCost` 1, emisje −25% na stałe (`ecoCut`). Boty zamawiają ścieżkę w `processAiEsg` (`energy.js:650`) z presją ekologiczną (U7) i incydentami (U9).
- Klient `ethical` (`player.js:1546`) w `getClientSatisfactionDrift` dostaje −0,08, gdy `getFundEthicsIssue` (`player.js:2959`) coś zwróci. Dziś są dwa powody: spółka > 10% udziałów złapana na szarej strefie albo średnie zadowolenie pracowników < 45. Emisje się nie liczą.
- Szara strefa i polityki kadrowe: `companies.js:10434…` (`exploit`, `getGreyShare`, `greyCaughtQuarter`). Cechy CEO prowadzące do wyzysku: `EXPLOIT_CEO_TRAITS` (`companies.js:10484`).
- Cechy CEO: `ceoTraits` (`companies.js:683`), rzadkości common…, wpływ przez `traits.some(t => t.id === …)`.
- Audytorzy: `AUDITORS` (`listings.js:581`, Wielka Trójka i trzy małe, różne skale), `auditStock`, `getTrueRatingIndex`, ocena ważna 4 kw. Oceny są bramką Platynowej (≥ A) i elitarnych.
- Internet: `INTERNET_FAVORITES` (`internet.js:10`) ma 6 stron. RateU będzie siódmą.
- Elitarne: `ELITE_RULES` (`finance.js:976`): Rubinowa A+, zysk 8 kw., 2 × próg Platynowej; Szmaragdowa A+, dywidenda 2 kw., 3 × próg. Wynik 0.18.8: Rubinowa 76%, Szmaragdowa 84% (cel ≥ 90%). Spadek Rubinowej wynika z tego, że część jej spółek przeszła na Szmaragdową (`raporty/kontrola_0.18.8.md:58`).

## Model ESG (wspólny dla części)

- **Ocena rzeczywista** (`getEsgTrue(stock)`, bez DOM, z pamięcią podręczną na kwartał): trzy filary w punktach 0–100.
  - **E (środowisko):** emisje względem średniej sektora (`getSegmentEmission` / `SECTOR_EMISSIONS`, jak dziś), `ecoCut` (ścieżka ESG, ulepszenia, projekty), incydenty ekologiczne z U9 (`ecoHeat`), miks energii spółki (OZE / tradycyjna). Spółki bez emisji (np. usługi) startują od 65.
  - **S (społeczeństwo):** zadowolenie pracowników, udział szarej strefy (`getGreyShare`), złapanie na szarej strefie (−25 na 8 kw.), strajki, polityka `exploit`, projekty społeczne.
  - **G (ład korporacyjny):** cechy CEO z `EXPLOIT_CEO_TRAITS` (−20), ujawnione przekupstwo audytora (−30 na 8 kw.), kary KNF, kara za greenwashing (G9), wolny obrót. Do tego **powiązania**: spółka matka, spółki zależne albo partner z przetargu (podwykonawca z 0.18.2 G6) z oceną D obniża G o 10. To jest „współpraca z nieetycznymi” z punktu 1.
- **Litery:** A ≥ 75, B 55–74, C 35–54, D < 35. Filary i wynik łączny mają tę samą skalę. Wynik łączny = 0,4 E + 0,3 S + 0,3 G, ale filar z D obniża wynik łączny o co najmniej jedną literę (duży zarzut nie znika w średniej).
- **Ocena publiczna** (`getEsgRating`, zmieniona): ocena audytora ESG (G2) z szumem ±1 litera, ważna 4 kw. Bez oceny zwraca `null`, a UI pisze „brak oceny”. Stary wynik A/B/C z emisji znika, a test `tests.js:17480` zmieniamy.
- **Pokrycie (punkt 1):** oceniane są wszystkie spółki z Platynowej i elitarnych (przy audycie kredytowym u audytora ESG albo osobno raz w roku), spółki ze Złotej z szansą 50% na rok, niższe tylko na zlecenie (spółka, która deklaruje etykę, sama zamawia ocenę) albo przez badanie gracza (G7, widoczne tylko dla gracza). Cel: 40–70% krajowych spółek (bez REIT) ma ocenę publiczną.
- **Deklaracja** (`stock.ethicsClaim`): spółka może ogłosić się etyczną. Uczciwie robi to przy ocenie rzeczywistej A lub B. Nieuczciwie (**greenwashing**) robi to przy C lub D, gdy presja (U7), cechy CEO albo spadki kursu sprawiają, że dobra opinia się opłaca. Audytor z ESG (G2) daje się zwieść deklaracji z szansą 15%: podnosi wtedy ocenę o 1 literę. Różnica między deklaracją a oceną rzeczywistą to podstawa kar w G9.
- **Zapis:** `stock.esgRating = { grade, e, s, g, q, until, auditor }`, `stock.ethicsClaim`, `stock.esgProjects[]`, `playerFund.ethical`, `playerProfile.esgStudies[]`. Migracja: stary `stock.esg = true` daje +15 do E (ścieżka zostaje), a brak pól oznacza „brak oceny”.

## Części

| Część | Zakres | Test i bramka |
|---|---|---|
| **G0** | **Pomiar wyjściowy:** sonda w serii 24 × 6,5 roku i 10 × 20 lat na 0.18.8: rozkład `getEsgTrue` (filary i łączny) bez zmian w grze, udział spółek w A–D, ile spółek ma emisje powyżej sektora i szarą strefę; obsadzenie elitarnych z rozbiciem, który warunek odpada (ocena, kapitalizacja, zysk, dywidenda) | raport `raporty/diagnoza_esg_0.18.9.md`; wagi i progi liter dobrane tak, by rozkład trafił w widełki G11 przed jakimkolwiek wpływem na grę |
| **G1** | **Model ESG:** `esg.js` (nowy plik, logika bez DOM): `getEsgTrue`, litery, wynik łączny z zasadą „D w filarze”, pokrycie, deklaracja i greenwashing, migracja zapisu. `getEsgRating` przechodzi do `esg.js` i zwraca ocenę publiczną albo `null` | testy jednostkowe: litery na progach, filar D obniża łączny, migracja `esg = true`, spółka bez oceny → `null`; rozkład jak w G0 |
| **G2** | **Audytorzy ESG i rating kredytowy (zmiana użytkownika 2026-11-23):** ESG nie jest przypięte do jednego audytora. Na starcie gry jeden losowy audytor dostaje `noEsg` (nigdy nie bada ESG), a 2 losowi spośród pozostałych dostają `esg: true`. Co rok każdy pozostały audytor bez ESG (i bez `noEsg`) dołącza z szansą 10%, najwyżej 5 audytorów z ESG; dołączenie to wpis w Gazecie. Audytor z ESG przy audycie wystawia też ocenę ESG, a w ocenie kredytowej dolicza ryzyko ESG: A +1 stopień z szansą 50%, C −1, D −2 (D w G: zawsze −2). Audytorzy bez ESG bez zmian. Gdy spółka nie trafi do audytora z ESG, ocenę ESG dostaje z corocznego audytu ESG (pokrycie z G1). **Migracja zapisu:** `aud2` plus jeden losowy audytor z ESG, jeden losowy z pozostałych dostaje `noEsg` | test: start gry: dokładnie 1 `noEsg` i 2 z ESG; dołączanie najwyżej do 5 i nigdy dla `noEsg`; ta sama spółka u audytora z ESG z ESG D ma ocenę kredytową niższą o 2; średnia zmiana ocen kredytowych w serii 0 ± 0,2 stopnia; obsadzenie elitarnych nie spada o więcej niż 3 pp (sprawdza G10) |
| **G3** | **Cechy CEO:** `etyk`, `ignorant`, `ekolog`, `konserwatysta` w `ceoTraits` (rzadkość common/uncommon, pary wykluczające się: etyk–ignorant, ekolog–konserwatysta). Skutki: **etyk** — brak polityki `exploit`, szansa deklaracji tylko uczciwej, projekty S i G ×2, koszty płac +1%; **ignorant** — szansa ścieżki ESG i projektów ×0,3, greenwashing przy presji ×2; **ekolog** — ścieżka ESG i projekty E ×3, w wyborze energii OZE pierwsze (U9), wsad energii droższy o 2%; **konserwatysta** — tradycyjne źródła energii (węgiel, gaz) w miksie spółki, ścieżka ESG ×0,3, mniejsza zmienność kursu (−3%) | test: rozkład cech w nowych CEO (każda 4–8%); w serii spółki z ekologiem mają E średnio ≥ 10 pkt wyżej niż z konserwatystą; marże grup z cechami ±0,5 pp |
| **G4** | **Droga do etyki:** (a) ścieżka ESG jak dziś (zostaje); (b) **ulepszenie eko** pozycji z `INVESTMENT_CATALOG`, które mają emisje albo produkcję (fabryki, zakłady): koszt +20%, `ecoCut` +5% (sumarycznie do `ecoMax` 0,7); (c) polityka kadrowa bez `exploit`, czyli brak szarej strefy, podnosi S po 4 kw.; (d) **projekty ekologiczne i społeczne** `ESG_PROJECTS`: lista 8–10 pozycji, każda z filarem, kosztem jako udziałem rocznego przychodu, czasem i skutkiem (np. „Nasadzenia leśne” E, „Oczyszczalnia ścieków” E i mniej incydentów, „Panele na dachach zakładów” E i taniej energia, „Recykling opakowań” E, „Program dla lokalnej społeczności” S, „Szkolenia i staże” S, „Fundacja edukacyjna” S, „Audyt łańcucha dostaw” G, „Program antykorupcyjny” G). Wybór bota według oceny „zysk z oceny ESG / koszt” (bez losowania, wzór z PR2 0.19.2), z cechami z G3 i presją U7. Gracz zleca projekt w spółce, którą kontroluje (WZA albo większość) | test: projekt podnosi właściwy filar o zapisany zakres; ulepszenie eko obniża emisje; w serii 20 lat 10–25% spółek zrealizowało ≥ 1 projekt; marże ±0,3 pp; zanieczyszczenie bez wzrostu (G11) |
| **G5** | **Popyt inwestorów:** składnik popytu w kursie według oceny publicznej: A +1,5%, B 0, C −1,5%, D −3% (roczna różnica w wycenie, rozkładana kwartalnie, z `getInstitutionEffectiveness`, gdy rynek mało uważny). **Zasada średniej zero:** składnik jest liczony względem średniej ważonej kapitalizacją ocenionych spółek, więc nie przesuwa GIG. Spółki bez oceny mają 0 | test: średni wpływ na rynek 0 ± 0,1%; w serii A vs D różnica stopy zwrotu 2–5 pp rocznie; GIG ±0,3 pp |
| **G6** | **Klient etyczny i fundusz etyczny:** (a) `getFundEthicsIssue` dostaje trzeci powód: udział NAV w spółkach C i D (ocena publiczna albo badanie gracza) > 15%, przy czym D liczy się podwójnie. Komunikat w historii klienta pokazuje procent; (b) **fundusz etyczny** (`playerFund.ethical`): przełącznik w oknie funduszu. Gdy jest włączony: napływ nowych pieniędzy +15%, klienci `ethical` przychodzą 2 × częściej (waga w `player.js:3806`), ich zadowolenie +0,02 na kwartał. Limity: D 0%, C ≤ 5% NAV, B ≤ 40% NAV, a spółki bez oceny liczą się jak B. Przekroczenie: ostrzeżenie w TeamedUP!, kwartał na poprawę, potem zaufanie −5 i odejścia klientów etycznych. Wycofanie deklaracji: zaufanie −3 i powrót najwcześniej po 4 kw. Zakup łamiący limit pokazuje ostrzeżenie w oknie zlecenia (bez blokady i bez nowego okna modalnego) | test: fundusz z 20% w C traci zadowolenie klientów etycznych; fundusz etyczny w limitach ma napływ wyższy o 10–20% niż bez deklaracji; złamanie limitu przez 2 kw. kosztuje zaufanie |
| **G7** | **RateU** (`rateu.pl`, ulubione w Internecie, ikona SVG): zakładki (1) **Ranking**: 10 najwyżej i 10 najniżej ocenionych (wynik łączny i filary, audytor, data). Publikacja co kwartał daje jednorazowy impuls ceny: pierwsza dziesiątka +1%, ostatnia −1,5% (średnia zero jak w G5, impuls ze składnika G5, nie dodatkowy); (2) **Zamów badanie** (zmiana użytkownika 2026-11-23): usługi oferuje wszystkich 6 audytorów z `AUDITORS` (bez osobnej firmy konsultingowej). Koszt bazowy 0,02% kapitalizacji, w widełkach 15 000–300 000 PLN: Wielka Trójka ×1,5 i szum ±3 pkt, mali audytorzy ×0,7 i szum ±8 pkt; płaci fundusz (`recordPayment`). Wynik po 1 kw., ważny 4 kw. i widoczny tylko dla gracza, także dla spółek bez oceny publicznej: **audytor z ESG** daje pełne E, S, G i łączny z oceny rzeczywistej oraz zgodność deklaracji (wykrycie greenwashingu); **audytor bez ESG** daje tylko prywatną ocenę kredytową w swojej skali (`formatAuditorGrade`) z dopiskiem „nie bada ESG”. Limit 4 badania na kwartał łącznie u wszystkich audytorów; (3) **Ekologia** (od poziomu UEiE 4): 10 najbardziej pro- i 10 najbardziej antyekologicznych spółek według filaru E i emisji | test DOM: Ranking 10 + 10, badanie odejmuje opłatę i daje wynik po 1 kw., zakładka Ekologia ukryta poniżej poziomu 4; brak emoji |
| **G8** | **Karta spółki:** nowy blok „Etyka i ESG” (krajowa karta i wiersz listy): deklaracja („deklaruje etykę” / brak), wynik łączny i litery E, S, G z audytorem i datą albo „brak oceny”, badanie gracza z dopiskiem „Twoje badanie” i różnicą względem deklaracji, kary za greenwashing w ostatnich 8 kw. Litera zawsze z napisem (kolor nie jest jedynym nośnikiem). Zagraniczne spółki: „brak oceny” (ESG krajowe w 0.18.9) | test DOM bloku w trzech stanach (ocena, brak oceny, badanie gracza) |
| **G9** | **UEiE: rozporządzenia, greenwashing, kryterium awansu:** (a) **poziom 4:** raz w roku rozporządzenie ESG (wpis w Gazecie): kontrola deklaracji u 3–6 spółek (losowanie ważone różnicą deklaracja–rzeczywistość), kara 1–3% rocznego przychodu, G −20 na 8 kw., kurs −4–8%, ocena publiczna zastąpiona rzeczywistą; (b) **poziom 5:** szansa 25% na rok, że UEiE wprowadzi **ESG jako kryterium awansu** (ogłoszenie 1 kw. wcześniej, okres przejściowy 4 kw., jak zmiany KNF w E0d): Platynowa wymaga ESG ≥ C, Rubinowa ≥ B, Szmaragdowa i Diamentowa ≥ B. Spółki z Platynowej i elitarnych bez oceny dostają audyt ESG z urzędu. Kryterium znika, gdy UEiE spadnie poniżej 5 (z tym samym ogłoszeniem). Wpis do kryteriów E0 w `plan_0.18.6_porzadki_dluga_gra.md` | test: przy poziomie 4 jedno rozporządzenie na rok; kara tylko dla spółek z różnicą deklaracji; przy poziomie 5 kryterium ogłoszone z wyprzedzeniem; obsadzenie elit z kryterium ≥ 85% (G10) |
| **G10** | **Progi Rubinowej i Szmaragdowej (punkt 12):** najpierw sonda z G0 pokazuje, który warunek odpada. Kolejność pokręteł: (1) Rubinowa `profitQ` 8 → 6 kw.; (2) Rubinowa `capMult` 2 → 1,6; (3) Szmaragdowa `capMult` 3 → 2,5; (4) Rubinowa uzupełniana z kolejki kandydatów, gdy spółka przechodzi na Szmaragdową (zwolnione miejsce bierze najlepsza spółka spełniająca warunki w tym samym kwartale, bez okresu potwierdzenia 2 kw.). Grade A+ zostaje. Diamentowa bez zmian (najlepsza spółka) | Rubinowa 3–6 i Szmaragdowa 1–3 w ≥ 90% kwartałów od 3. roku, cel 95%; Diament 1 spółka w ≥ 95%; rozkład poziomów ±3 pp; to samo z kryterium ESG z G9 ≥ 85% |
| **G11** | **Kontrola** (seria 24 × 6,5 roku i 10 × 20 lat, raport `raporty/kontrola_0.18.9.md`) | bramki niżej |

**Pliki:** `esg.js` (nowy: model, pokrycie, deklaracje, projekty, rozporządzenia), `energy.js` (`getEsgRating` → `esg.js`, OZE / tradycyjna według cech), `listings.js` (audytorzy z ESG i `noEsg`, dołączanie co rok, ryzyko ESG w ocenie, badania u audytorów), `companies.js` (cechy CEO, ulepszenie eko, wybór projektów, polityka kadrowa), `player.js` (`getFundEthicsIssue`, fundusz etyczny, wagi klientów), `finance.js` (`ELITE_RULES`, kryterium ESG), `internet.js` + `ui.js` (RateU, karta spółki, okno funduszu), `img/` (ikony), `index.html` (skrypt `esg.js`), `tests/tests.js`, `tests/przebiegi.html` (sondy `esg`, `elite`).

## Propozycje planowania (dodatki z punktu 11, z umiarem)

- **Propozycja planowania P1:** zmiany ocen ESG przechodzą przez wydarzenia E0c (Gazeta przy spadku do D, przy karze za greenwashing i przy wejściu do pierwszej dziesiątki RateU), z limitem 6 komunikatów na kwartał wspólnym z E0c.
- **Propozycja planowania P2:** zadanie w `tasks.js` (kategoria Mechaniki): „Zamów pierwsze badanie w RateU” i „Utrzymaj fundusz etyczny przez 4 kw.”, z premiami mieszczącymi się w limicie E2.
- **Propozycja planowania P3:** hasło Akademii `esg` (już odblokowywane w `learning.js:1186`) dostaje opis liter A–D, różnicy deklaracji i oceny rzeczywistej oraz limitów funduszu etycznego.
- **Propozycja planowania P4:** wykrycie greenwashingu w badaniu gracza ma wartość informacyjną: gracz może sprzedać spółkę przed rozporządzeniem UEiE. Bez donosu do urzędu (mniej mechanik, mniej nadużyć).

## Bramki kontroli G11

| Kryterium | Widełki |
|---|---|
| Pokrycie oceną publiczną (krajowe bez REIT) | 40–70% |
| Rozkład ocen publicznych (każda klasa niepusta w każdej grze 20 lat) | A 10–25%, B 30–45%, C 25–40%, D 5–15% |
| Greenwashing (deklaracja przy rzeczywistym C/D) | 3–10% spółek z deklaracją; 1 rozporządzenie na rok przy poziomie 4 |
| Średni wpływ G5 na rynek | 0 ± 0,1% |
| GIG 20 lat | 10–13% i ± 0,3 pp od 0.18.8 (10,33%) |
| Marże (średnia odchyłek) | 0 ± 0,3 pp; grupy cech CEO ± 0,5 pp |
| Zanieczyszczenie 20 lat | bez pogorszenia: ≤ wynik 0.18.8 + 0,5 (około 66,8); cel 55–65 dopiero w 0.19.1 |
| Elitarne od 3. roku | Rubinowa 3–6 i Szmaragdowa 1–3 w ≥ 90% kwartałów (cel 95%), Diamentowa 1 w ≥ 95%; z kryterium ESG ≥ 85% |
| Fundusz etyczny (strategia testowa bota) | napływ +10–20%, limity działają |
| Czas kroku | ≤ 900 ms/kw., wzrost ≤ 20 ms; `getEsgTrue` liczone raz na kwartał |
| Błędy | 0 w 40 grach |

## Makiety dla designu

Numery proponowane po makietach 31–32. Ikony SVG, ciemny motyw, PLN, bez nowych okien modalnych.

| Makieta | Część | Zakres |
|---|---|---|
| **33 RateU** | G7 | strona w przeglądarce: zakładki Ranking (10 + 10, litery E S G, audytor), Zamów badanie (wybór spółki, koszt, wynik po kwartale, lista zleconych badań), Ekologia (od poziomu 4, stan zablokowany z opisem) |
| **34 Karta spółki: Etyka i ESG** | G8 | blok w krajowej karcie i znaczek w wierszu listy; stany: ocena, brak oceny, badanie gracza z różnicą deklaracji, kara za greenwashing |
| **35 Fundusz etyczny** | G6 | przełącznik w oknie funduszu, limity D/C/B z paskami wykorzystania, ostrzeżenie w oknie zlecenia, stan przekroczenia z terminem poprawy |
| **36 Projekty ESG** | G4 | lista projektów w spółce kontrolowanej (filar, koszt, czas, skutek słowem i liczbą), ulepszenie eko na karcie inwestycji, trwające projekty |

## Ryzyka

- **Ocena kredytowa a elitarne:** G2 zmienia oceny, które są bramką elitarnych, więc G10 stroimy po G2 i G9, nie przed nimi.
- **Popyt a GIG:** składnik G5 i impuls RateU muszą mieć średnią zero, inaczej przesuną GIG.
- **Zanieczyszczenie:** cechy `konserwatysta` i `ignorant` mogą podnieść emisje. Ich udział jest ograniczony (4–8% CEO), a bramka „bez pogorszenia” trzyma całość.
- **Wydajność:** `getEsgTrue` przechodzi po segmentach i powiązaniach, więc wynik trzymamy w pamięci podręcznej na kwartał (czyszczoną jak `clearEmissionCache`).

## Kolejność

G0 → G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8 → G9 → G10 → G11. Makiety 33–36 równolegle z G1–G5, a wdrożenie UI (G6–G8) po ich akceptacji. Commit po każdej części.
