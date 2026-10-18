# Plan 0.15 „Hossa i bessa” (po 0.14.5 Redesign, przed 0.15.1 „Kryzysy” i 0.16 „Giełda międzynarodowa”)

Cel: rynek ma własny nastrój, niezależny od gospodarki. Przechodzi przez hossę i bessę, nadmuchuje bańki i czasem się załamuje. W długim terminie rośnie umiarkowanie, ok. **8–10% rocznie** zamiast dzisiejszych 18–22%. Rynek ma swoich zwycięzców (**jednorożce**) i przegranych (**gasnące gwiazdy**).

Gracz uczy się, że:
- ceny mogą długo odbiegać od fundamentów;
- rynek wyprzedza gospodarkę;
- strach i chciwość to okazje i pułapki;
- tania spółka bywa pułapką, a droga — okazją.

Bessa i hossa mają dawać **decyzje**, a nie tylko obraz:
- kiedy sprzedać startup;
- czy dokupić w panice;
- czy wyjść z sektora w bańce;
- czy trzymać gotówkę na odpływ klientów;
- czy zostać przy gasnącym gigancie.

Czego to uczy:
- **Cykl rynku a cykl gospodarki:** giełda zwykle wyprzedza gospodarkę o 1–2 kwartały.
- **Wycena a fundamenty:** premia i dyskonto całego rynku, C/Z rynku względem historii, premia za ryzyko akcji (zysk z akcji vs lokata).
- **Spółki wzrostowe i pułapki wartości:** wzrost zysku, ROE, C/Z wzrostowe; „tania, bo tonie”.
- **Psychologia:** strach i chciwość, euforia, kapitulacja; „kupuj, gdy krew leje się na ulicach”.
- **Bańki spekulacyjne:** jak rosną, po czym je poznać, jak pękają; tani kapitał i rozwodnienie.
- **Krach i bezpieczniki giełdy:** dźwignia i margin call, wstrzymanie handlu, bank centralny jako pożyczkodawca ostatniej instancji, polityka makroostrożnościowa.
- **Zarządzanie ryzykiem:** obsunięcie kapitału, dywersyfikacja, gotówka jako opcja, okno IPO.
- **Indeks giełdowy:** jak jest liczony (ważony kapitalizacją, jeśli H1 go wprowadzi).

Zakres (decyzje użytkownika):
- nastrój rynku i fazy — widok fazy za umiejętnością Analityk Indeksowy L4–L5;
- bańki i krachy;
- jednorożce i gasnące gwiazdy;
- boty i klienci zależni od nastroju;
- decyzje gracza w cyklu: okno IPO, emisje/skupy/przejęcia, margin call i KNF, rynki kapitałowe, retrospektywa;
- osiągnięcia w zakładce CV i szkolenia;
- **bez krótkiej sprzedaży**.

Kolejność: H0 → H1 → H2 → H3 → H4 → H5 → H6. Każda część z testami, przebiegami ×200 (6,5 roku i 20 lat) i commitem (część z kilkoma krokami — commit po każdym kroku).
- **Punkt kontrolny po H1:** gra jest zbalansowana bez nastroju. Jeśli H2–H6 się przeciągną, H1 może zostać scalone osobno (bez zmiany wersji zapisu).
- **Audyt planu i droga do niego:** `raporty/audyt_planu_0.15.md`.
- **Dalej:** linie kryzysów historycznych to **0.15.1** (`plan_0.15.1_kryzysy.md`, szkic).

UI 0.15 budujemy z komponentów systemu designu 0.14.5 (`plany/design/`). Ten plan określa treść, miejsce i stany. **Projekt wyglądu nowych elementów zlecamy czatowi designu** (sekcja „Zlecenie dla czatu designu”).

---

## Punkt wyjścia (stan kodu)

- **Kurs na tik (1 s gry, `core.js`):**
  - szum 0,2% × zmienność;
  - powrót do wartości godziwej `PRICE_MEAN_REVERSION_PER_TICK = 0,0003` (półokres ok. 2300 s ≈ **7–8 kw.**);
  - nastrój z fazy gospodarki (pomijalny, ok. 0,06% na kw.);
  - dryf z fazy spółki i CEO.
- **Wartość godziwa** (`updateFundamentalRatios`, `companies.js`): zysk na akcję z 4 kw. × C/Z sektora × `getValuationMultiplier` (limit 0,4–1,8) × premia kondycji, plus 25% kotwicy księgowej. Kurs idzie za zyskiem.
- **Giełdy według ceny:** Śmieciowa 0–20 zł, Brązowa 20–75 zł, wyżej srebro, złoto itd. (`companies.js`).
- **Cykl gospodarki** (`ECONOMY_PHASES`): Ożywienie → Ekspansja → Przegrzanie → Recesja, ok. 13 kw. na cykl.
  - `marketTrend` (pasek u góry) wynika z indeksu koniunktury i jest widoczny dla każdego.
  - `getCyclePositiveEventBias` 0,46–0,53.
- **GIG** (`updateMarketIndexes`): indeks łańcuchowy **równych wag przeważany co tik**. TIG5 i SIG20 to średnie ceny.
- **Umiejętność „Analityk Indeksowy 📈”** (`player.js`): L1 podgląd indeksów (150 zł), L2 handel indeksami (350 zł), L3 WNR (550 zł).
- **Czas:** tydzień gry = 60 s, kwartał = 300 s (5 tygodni), okres funduszu = 3 kw.
- **Klienci** mają typy z `panic` (😨 Strachliwy) i `chase` (🦊 Spryciarz). Przyczyny odpływu zawierają już „😱 panika”.
- **Zaufanie** (`computeTrustTarget`):
  - nadwyżka nad GIG, obsunięcie i zmienność ponad GIG;
  - kara makro (wynik < max(lokata, inflacja)), do −15;
  - premia za dodatni wynik do +10;
  - spokój +5.
- **Premia za wynik R5** liczy nadwyżkę nad GIG.
- **Osiągnięć w grze nie ma.** CV gracza (`playerProfile.cv`) ma wpisy szkoleń i certyfikatów.
- **Pomiary:**
  - GIG 18–22% rocznie (kontrola 0.14: 20,2 ± 0,7%; 20 lat: 22,3%), marża 24 → 28%;
  - fundusz = GIG: zaufanie 53–56, ale JU −4,7…−7,4%/rok (cel ±3%);
  - u CEO cele korporacji do 64% wpływów prywatnych (cel ≤ 25%).

---

## H0. Pomiar: skąd 18–22% rocznie (bez zmian zachowania)

- **Sondy cieni** w `tests/przebiegi.html` (liczone obok, bez wpływu na grę):
  - `gigCap10`: GIG ważony kapitalizacją, limit 10% na spółkę;
  - `buyHold`: średnia „kup i trzymaj” spółek notowanych w kw. 1 (bankruci = 0);
  - `gigSurvivors`: GIG tylko ze spółek z kw. 1;
  - mediana wzrostu zysku na akcję (spółki z modelem fundamentalnym);
  - rozkład wzrostu zysku na akcję (p10, p50, p90), żeby H1b wiedziało, ile dziś jest „naturalnych jednorożców”;
  - C/Z rynku (mediana), marża (mediana i średnia ważona przychodami).
- **Hipotezy i warianty** (presety w ramce, ≥ 20 przebiegów × 6,5 roku na wariant):

| Hipoteza | Jak sprawdzamy |
|---|---|
| h1 asymetria zdarzeń rynkowych | preset `zdarzenia-symetryczne` (bias 0,5, równa siła ±) |
| h2 „zapadka” wartości godziwej | rozkład: Δln GIG vs Δln zysku na akcję + Δln C/Z rynku |
| h3 inflacja w przychodach bez kosztów | preset `bez-inflacji-przychodow` (`INFLATION_PASS_THROUGH = 0`) |
| h4 skład indeksu (ocalali, debiuty) | sonda `gigSurvivors` vs GIG |
| **h5 premia za przeważanie równych wag co tik** | sondy `gigCap10` i `buyHold` vs GIG |
| **h6 reinwestycja** (zwrot z inwestycji spółek, niska wypłata) | preset `inwestycje-polowa` (`incomeBonus` × 0,5); rozkład ROE × zatrzymany zysk |
| **h7 dryf marży** | marża mediana i ważona w czasie; preset `marza-stala` (presja konkurencji × 2) |

- **Pomiary poboczne** (ta sama próba, bazowo + preset `fundusz-gig`):
  - zaufanie funduszu = GIG rozbite na składniki: nadwyżka, obsunięcie, kara makro, premia za wynik, spokój;
  - zmiana JU rocznie;
  - udział celów korporacji we wpływach prywatnych CEO (preset `ceo`, ≥ 20 przebiegów).
- **Próba bazowa:** 20 przebiegów × 6,5 roku i 20 × 20 lat.
- **Wynik:** raport `plany/raporty/pomiar_gig_0.15.md`:
  - tabela składników w pp rocznie: zysk na akcję (w tym przychody, marża, liczba akcji), zmiana C/Z, premia za przeważanie, skład, zdarzenia, reszta;
  - rekomendacja ≤ 3 pokręteł do H1;
  - wynik R5 dla CEO;
  - składniki zaufania funduszu = GIG.
- **Commit:** sondy i presety (bez zmian zachowania gry), potem raport.

## H1. Kalibracja: trend, zwycięzcy i przegrani, zaufanie

**H1a. Trend** — najwyżej 3 pokrętła z raportu H0, każde w osobnym commicie z pomiarem (≥ 20 × 6,5 roku). Kandydaci w kolejności:
1. **GIG ważony kapitalizacją z limitem 10%** — tylko jeśli h5 ≥ 2 pp rocznie (decyzja użytkownika).
   - Wagi = kapitalizacja, ucięta do 10% i rozdzielona na resztę; przeliczane co tydzień gry; zmiana wartości co tik z kursów i wag.
   - Ciągłość: przy migracji łańcuch od bieżącej wartości GIG.
   - TIG5 i SIG20 też ważone kapitalizacją.
   - Opis indeksu w UI i hasło Akademii „Indeks ważony kapitalizacją”.
2. Zwrot z inwestycji spółek albo wypłata dywidend (h6).
3. `SECTOR_GROWTH_FACTOR` / `INFLATION_PASS_THROUGH` / presja konkurencji na marże (h3, h7).

**H1b. Jednorożce i gasnące gwiazdy** (dwa commity; cele trendu z H1a mierzymy już z nimi):

| | 🦄 Jednorożce | 🌠 Gasnące gwiazdy |
|---|---|---|
| Ile | **2–3 na grę 6,5-letnią** (gwarantowane); w dłuższej grze nowy co ok. 3 lata (ok. 6–8 na 20 lat) | **2–3 na grę**, start w 2.–4. roku (kw. 5–16); w dłuższej grze kolejna co ok. 5 lat (ok. 5–6 na 20 lat) |
| Kto | 1–2 na starcie z dolnych 60% kapitalizacji (spółki z modelem fundamentalnym, waga ×2 dla sektorów wzrostowych: Technologia, Medycyna, Gaming, OZE, Fintech), 1 z debiutów w latach 1–3 | z górnych 20% kapitalizacji, kurs ≤ 300 zł; bez spółek Skarbu Państwa i spółek specjalnych |
| Przebieg | **12–24 kw. wzrostu:** przychody +25…+35 pp/rok ponad trend sektora, marża +0,5 pp/kw. (do mediany sektora + 10 pp); potem 4 kw. łagodnego powrotu do trendu | **8–16 kw. gaśnięcia:** przychody −8…−20%/rok, marża −1,5 pp/kw. aż do straty, cięcie dywidendy przy pierwszej stracie, rosnący dług |
| Kurs | cel: **×5–10 w grze 6,5-letniej** (od startu wzrostu); wycena przez zysk, a w okresie wzrostu C/Z sektora × 1,3–1,6 (premia wzrostu) | zysk → strata → kotwica straty (P9); jeśli po 12 kw. kurs nadal > 75 zł, gaśnięcie trwa dalej — **zawsze kończy się na cenie giełdy Brązowej (≤ 75 zł), w ok. połowie przypadków Śmieciowej (≤ 20 zł)** |
| Po drodze | ochrona przed bankructwem; boty nie przejmują jednorożca w okresie wzrostu (gracz może). Gdy jednorożec zniknie, gra wybiera następnego, żeby utrzymać 2–3 | po dnie 20% szans na zwrot akcji (nowy prezes, restrukturyzacja) — nie każdy upadły jest martwy; reszta zostaje nisko, bywa przejęta albo upada |
| Fałszywe tropy | **1–2 „wschodzące gwiazdy”** na grę: 2–4 kw. jak jednorożec, potem wzrost gaśnie — lekcja, że przeszły wzrost nie gwarantuje przyszłego | gasnąca gwiazda wygląda tanio (niskie C/Z, wysoka stopa dywidendy przed cięciem) — **pułapka wartości** |
| Co widzi gracz | **nic nie jest oznaczone.** Sygnały w danych: przychody r/r, ROE, marża, konsensus (Analityk Finansowy), maile prasowe („XYZ podwaja sprzedaż”) | spadek przychodów 4 kw. z rzędu, marża w dół, wymówki zarządu w mailach, cięcie dywidendy, obniżki ratingu |

- **Niezmienniki:** liczba akcji, posiadacze, limity spółek bez zmian (to tylko modyfikatory przychodów i marży oraz premia wzrostu w wycenie).
- **Akademia:** „Spółka wzrostowa”, „Pułapka wartości”.

**Cele po H1a + H1b** (przed nastrojem):
- mediana GIG w 20 latach **8–10%** nominalnie (inflacja 2,5–3%);
- mediana wzrostu zysku na akcję (spółki) **8–11%/rok**;
- C/Z rynku bez trendu (±1 pp/rok);
- marża mediana bez trendu (±1 pp na 20 lat);
- σ rocznych stóp GIG ≥ 8 pp (pełny cel 12–20 pp po H2–H4).

**H1c. Zaufanie i JU funduszu = GIG** (osobny commit):
- **Kara makro** liczy niedobór względem lokaty pomniejszony o połowę niedoboru GIG:
  `kara = min(15, 300 × max(0, niedobór funduszu − 0,5 × niedobór GIG))`, gdzie niedobór = max(lokata, inflacja) × lata − wynik okresu.
  - Klienci częściowo rozumieją, że spadał cały rynek.
  - Fundusz gorszy od lokaty i od GIG nadal traci zaufanie.
- Następnie strojenie bazowego napływu JU.
- **Cel** (preset `fundusz-gig`, ≥ 20 × 6,5 roku): zaufanie **45–55**, JU **−3…+3%/rok**.
- **Drugi pomiar po H5** (panika klientów zmienia bilans).

**H1d. Pozostałe kalibracje** (pomiar; zmiana tylko gdy cel niespełniony):
- **R5, cele korporacji CEO:** jeśli w H0 > 25% wpływów prywatnych, to suma nagród za cele korporacji CEO ≤ 25% wpływów prywatnych z ostatnich 4 kw.
- **Ocena zarządu i premia R5:** fundusz = GIG ma neutralną ocenę (środek skali) i premię R5 ok. 0.
- **Lokaty:**
  - lokata wygrywa z GIG w 20–35% okien 3-letnich;
  - w 20 latach GIG ≥ lokata + 2 pp/rok.
- **Wydzielenia T4:** kontrolnie 10 przebiegów presetu `wydzielenia` — efekt ponad GIG nadal +3–8%.

## H2. Nastrój rynku i fazy hossy i bessy

**H2a. Stan i silnik** (bez UI):
- **Stan per rynek** (grunt pod 0.16): `marketRegimes = { home: {...} }` z polami:
  - `phase`, `quartersInPhase`, `phaseLength`;
  - `premium` (bieżąca) i `premiumTarget`;
  - `sentiment` (0–100) i `sentimentParts`;
  - `gigPeak`, `gigTrough`;
  - `shownPhase`, `shownSince`, `history` (≤ 40 kw.: faza, premia, GIG, potwierdzona tak/nie).
- Funkcje biorą rynek jako parametr (`getMarketRegime(market = 'home')`); 0.16 dopisze rynki zagraniczne i zarażanie.
- **Fazy** (ukryte; gracz z umiejętnością widzi je z opóźnieniem — H2b):

| Faza | Długość (kw.) | Cel premii | Nastrój zdarzeń | Zmienność | Przejście |
|---|---|---|---|---|---|
| 🌱 Akumulacja | 2–4 | −10…0% | 0 | ×0,9 | → Hossa |
| 🐂 Hossa | 5–10 | 0…+15% | +0,3 | ×1,0 | → Euforia (40%) albo Dystrybucja (60%) |
| 🚀 Euforia | 1–3 | +20…+35% | +0,6 | ×1,2 | → Dystrybucja (albo krach, H4) |
| 🌫️ Dystrybucja | 1–2 | +10…+15% | −0,2 | ×1,2 | → Bessa |
| 🐻 Bessa | 2–5 | −10…−25% | −0,5 | ×1,4 | → Kapitulacja (50%) albo Akumulacja (50%) |
| 😱 Kapitulacja | 1 | −30…−35% | −0,8 | ×1,8 | → Akumulacja |

  Średni cykl ok. 15–17 kw.; średni cel premii ważony czasem ≈ 0 (premia nie zmienia długiego trendu).
- **Wyprzedzanie gospodarki** (sprawdzane co kw.):
  - gospodarka w Przegrzaniu, a rynek w Hossie lub Euforii → szansa 25%, że faza kończy się teraz;
  - gospodarka w Recesji od ≥ 2 kw., a rynek w Bessie lub Kapitulacji → tak samo.
- **Start i migracja:**
  - Ekspansja i Przegrzanie → Hossa;
  - Ożywienie → Akumulacja;
  - Recesja → Bessa;
  - premia 0.
- **Mechanika premii:**
  - **ruch premii:** płynnie co tik, 25% odległości do celu na kw. (`p += (cel − p) × 0,00096` na tik);
  - **mnożnik spółki:** `m = 1 + β × (premia rynku + premia sektora)`, β = beta sektora w granicach 0,5–1,5; łączny limit 0,3–2,5;
  - **kurs:** w pętli cen kurs × `m_teraz / m_poprzedni` (zapamiętane w spółce), a cel powrotu = `fairValue × m`;
  - **wartość godziwa bez premii:** `fundamentals.fairValue` zostaje fundamentalna (Analityk i skaner pokazują wartość bez premii — w bańce gracz widzi kurs wysoko ponad wartością);
  - **bez premii:** spółki bez kotwicy wyceny, typy specjalne, startupy, rynki internetowe;
  - **kotwice P9** (banki, REIT-y, spółki ze stratą) dostają premię przez cel powrotu jak reszta.
- **Zdarzenia:** `getCyclePositiveEventBias` = 0,5 + 0,06 × (0,5 × nastrój gospodarki + 0,5 × nastrój fazy rynku).
- **Zmienność:** mnożnik fazy w `volatilityModifier`.
- **Commit H2a.**

**H2b. Co widzi gracz — widok za umiejętnością** (decyzje użytkownika: ukryta faza z opóźnieniem; dostęp przez umiejętność):
- **Potwierdzenie fazy:**
  - Hossa, Euforia i Bessa — po 1 kw. w fazie;
  - Akumulacja i Dystrybucja — po 2 kw.;
  - wcześniej, gdy GIG potwierdzi: ≥ +20% od dołka dla Hossy lub Euforii, ≤ −20% od szczytu dla Bessy lub Kapitulacji.
- **Fazy krótsze niż opóźnienie** (Kapitulacja, krótka Euforia lub Dystrybucja) trafiają do historii **wstecz**: „Za nami: kapitulacja (dno GIG w kw. X)”.
- **Indeks strachu i chciwości 0–100**, liczony co tydzień jako średnia 5 składników 0–100, plus szum ±5 pkt:
  1. **pęd:** GIG względem średniej z 4 kw. (−15% → 0, +15% → 100);
  2. **szerokość rynku:** % spółek powyżej swojej średniej z 4 kw.;
  3. **zmienność:** WNR względem mediany z 5 lat (wyższa → strach);
  4. **wycena:** C/Z rynku (mediana) względem mediany z 5 lat;
  5. **apetyt:** debiuty w kw. i średnia dźwignia botów względem średniej z 5 lat.

  Strefy: < 20 skrajny strach, 20–40 strach, 40–60 neutralnie, 60–80 chciwość, > 80 skrajna chciwość. Wskaźnik nie zna ukrytej fazy.
- **Premia za ryzyko akcji:** zysk/cena rynku (1 / C/Z) minus oprocentowanie lokaty, w pp.
- **Dostęp — „Analityk Indeksowy 📈” dostaje 2 nowe poziomy:**

| Poziom | Koszt | Co odblokowuje |
|---|---|---|
| L1–L3 | bez zmian | indeksy, handel indeksami, WNR |
| **L4 „Nastroje rynku”** | 900 zł (wymaga L3) | element KPI w górnym pasku (zamiast `marketTrend`): potwierdzona faza i wskaźnik, np. „🐂 Hossa · 62 chciwość”; dymek z opisem fazy i „potwierdzona X kw. temu”; wiadomości o zmianie fazy w pasku newsów |
| **L5 „Strateg rynku”** | 1600 zł (wymaga L4) | okno **„Rynek”** (kliknięcie elementu KPI); kolumna „Premia sektora” w skanerze i wiersz w karcie spółki (gdy gracz ma Skaner z Analityka Finansowego) |

  - **Bez L4:**
    - stary `marketTrend` znika z górnego paska (decyzja użytkownika: widok nastroju tylko z umiejętnością);
    - gracz widzi GIG (jeśli ma L1) i wiadomości publiczne: krach, bezpiecznik, bańka w mediach, bank centralny, KNF — to wiadomości z „gazet”, nie analiza.
  - **Okno „Rynek”** (L5; wzorzec okien Państwo/Kraj):
    - pasek KPI: faza, wskaźnik, C/Z rynku vs mediana 5 lat, premia za ryzyko akcji, obsunięcie GIG od szczytu;
    - 5 kart składników wskaźnika z mini-wykresami (20 tygodni);
    - wykres GIG z tłem potwierdzonych faz **i podpisami faz** (kolor nie jest jedynym nośnikiem);
    - lista historii faz.
  - **Opis umiejętności i hasło Akademii** mówią wprost: faza jest potwierdzana z opóźnieniem, jak w prawdziwym rynku.
- **Commit H2b.**

## H3. Bańki sektorowe

- **Start:**
  - szansa 5%/kw.; ×2 w Hossie i Euforii, ×0 w Bessie i Kapitulacji;
  - najwyżej 1 bańka naraz, przerwa 4 kw. po pęknięciu.
- **Kandydaci:** Sztuczna inteligencja, Fintech, Biotechnologia, Półprzewodniki, Drony, OZE, Gaming, Nieruchomości. Waga ×2, gdy sektor jest w dobrej fazie cyklu sektora, był przełom technologiczny albo w sektorze rośnie jednorożec.
- **Pompowanie:** premia sektora +5…+12 pp na kw. (losowo co kw.), do +150%.
- **Szansa pęknięcia na kw.:** 4% + 12% × premia + 3% × kwartały bańki.
  - ×2 przy podwyżce stóp ≥ 50 pb w kwartale, przy krachu (H4) albo gdy mediana wyników sektora jest poniżej oczekiwań.
- **Pęknięcie:** premia spada do −15…−25% w 1–3 kw., potem wraca do 0 w ciągu 4 kw.
  - Spadek od szczytu ok. −47% przy premii +50%, ok. −56% przy +80%, ok. −64% przy +120%.
- **Zasięg:** premia sektora działa na spółkę według **udziału segmentu** w sektorze bańki (0.14 T1b). Konglomerat jest mniej wystawiony — lekcja dywersyfikacji.
- **Strona fundamentalna:**
  - spółki z sektora bańki emitują akcje 2× częściej (istniejąca ścieżka emisji);
  - startupy z tego sektora debiutują 2× częściej (wycena — okno IPO, H5).
- **Sygnały:**
  - kolumna „Premia sektora” w skanerze (L5): C/Z sektora / mediana 5 lat − 1;
  - pasek newsów (dla wszystkich) przy premii > +30% („Media: gorączka Sztucznej inteligencji”) i przy pęknięciu.
- **Ochrona przed exploitem:**
  - bez stałego terminu;
  - szansa pęknięcia rośnie;
  - cel: strategia „kup przy premii +30%, sprzedaj przy +80%” ma dodatnią średnią, ale ≥ 30% szans na stratę.
- **Commit H3.**

## H4. Krach, margin call, bezpieczniki i reakcja instytucji

- **Szansa krachu na kw.:**
  - 1,2% podstawy;
  - +6 pp w Euforii;
  - +1 pp za każde 10 pp premii rynku ponad +20%;
  - +1 pp przy średniej dźwigni botów > 40%;
  - nie w Bessie ani Kapitulacji.
- **Przebieg:**
  - premia rynku spada o 25–35 pp liniowo w ciągu 1–4 tygodni gry (60–240 s), bezpośrednio na kursach;
  - potem faza Bessa (60%) albo Kapitulacja (40%);
  - bańka (jeśli trwa) pęka.
- **Punkt zaczepienia dla 0.15.1:** `marketCrash.theme` (w 0.15 zawsze `null`) i funkcja szoku sektorowego (`applySectorShock(sektor, premia, kwartały)`). Linie kryzysów z 0.15.1 użyją tego samego silnika z tematem i listą sektorów zyskujących, tracących i upadających.
- **Margin call botów:** w pierwszym tygodniu krachu bot z długiem > 50% wartości portfela sprzedaje 20–40% pozycji.
  - Wpływ transakcji na cenę pogłębia spadek.
  - Niezmiennik „akcje = posiadacze” sprawdzany po każdej sprzedaży.
- **Bezpieczniki** — spadek GIG od zamknięcia poprzedniego tygodnia gry:
  - −7% → wstrzymanie handlu na 15 s gry;
  - −13% → na 30 s;
  - −20% → do końca tygodnia.

  Każdy próg raz w tygodniu.
  - **Osobna flaga rynku** `marketHalt = { until, level }` i funkcja `isMarketHalted(market)`. **Nie** `tradeHalted` spółek, bo te wypadają z GIG i z pętli cen.
  - W czasie wstrzymania kursy stoją, a zlecenia czekają albo są odrzucone z komunikatem. Dotyczy to gracza, botów, funduszy botów, ETF-ów, banków, holdingów i wezwań; wezwania przesuwają termin.
  - Wiadomość w pasku newsów (dla wszystkich).
- **Bank centralny:** po krachu nadzwyczajne cięcie o 50 pb w ciągu tygodnia. Szansa 70%, gdy inflacja ≤ cel + 1 pp, w przeciwnym razie 30%. Przez istniejący mechanizm stóp (wyceny przez `rateSens`, lokaty, kredyty).
- **KNF chłodzi euforię:** gdy premia rynku > +25% przez ≥ 2 kw., to z szansą 50% (raz na fazę) dopuszczalna dźwignia botów spada na 4 kw.:
  - yolo_trader 0,7 → 0,5;
  - reszta 0,5 → 0,35.

  Wiadomość w pasku newsów.
- **Commit H4** (krach, margin call, punkt zaczepienia) i **commit H4b** (bezpieczniki, bank centralny, KNF).

## H5. Boty, klienci i spółki w cyklu rynku

- **Boty** (`ai.js`):

| Osobowość | Hossa / Euforia | Bessa / Kapitulacja / krach |
|---|---|---|
| yolo_trader, reckless („Spekulant”) | kupują spółki z największym wzrostem z 4 tygodni (ranking raz na tydzień), biorą więcej kredytu | sprzedają 30–50% pozycji |
| calm, pro_investor | redukują pozycje przy premii rynku > +20% | kupują przy wskaźniku < 25 |
| whale | — | duże pakiety w Akumulacji |
| dividend_chaser | bez zmian (łapie się na pułapki wartości: kupuje gasnące gwiazdy przed cięciem dywidendy) | dokupują wysokie stopy dywidendy |
| banker | bez zmian (0.16: „Bankier” dokupuje w krachu) | bez zmian |

- **Klienci funduszu** (istniejące typy):
  - 😨 Strachliwy: szansa paniki ×2, gdy ukryta faza to Bessa lub Kapitulacja, albo GIG ≤ −10% od szczytu, i wskaźnik < 25;
  - 🦊 Spryciarz: napływ ×1,5 przy wskaźniku > 75; odchodzi po pierwszym kwartale z wynikiem funduszu ≤ −5%;
  - **limit:** odpływ z przyczyny „😱 panika” ≤ 8% JU na kw.;
  - nowa przyczyna napływu i odpływu „🤑 moda na akcje” w panelu „Dlaczego klienci…”.
- **Okno IPO:**
  - mnożnik wyceny debiutu startupu × (1 + premia rynku + premia sektora), w granicach 0,6–1,8 (`handleSuccessfulIPO`);
  - przy wskaźniku < 25 startup z szansą 60% przekłada debiut o ≤ 2 kw. przez istniejące `parkStartupForListing` (chyba że brakuje mu gotówki);
  - w panelu puli startupów jedna linia przyczyny, wpis w poczcie.
- **Spółki w cyklu rynku:**
  - premia rynku > +15% → szansa emisji ×1,5 (×2 w sektorze bańki);
  - premia < −15% → skupy akcji ×1,5 i apetyt na przejęcia (`ma.js`) ×1,3.
- **Rynki kapitałowe:** przychody spółek z podsektorów Rynki kapitałowe i Bank inwestycyjny × (0,8 + 0,45 × wskaźnik / 100), czyli 0,8…1,25.
- **Drugi pomiar zaufania i JU** (preset `fundusz-gig`, ≥ 20 × 6,5 roku): zaufanie 45–55, JU −3…+3%/rok. Jeśli poza celem — strojenie paniki i mody (nie formuły H1c).
- **Commit H5a** (boty), **H5b** (klienci), **H5c** (okno IPO, spółki, rynki kapitałowe).

## H6. Spięcie z grą: Akademia, Mentor, osiągnięcia, newsy, retrospektywa

- **Akademia** (odblokowanie przy pierwszym kontakcie):
  - Hossa i bessa (cykl jako diagram, definicja ±20%), Korekta;
  - Cykl rynku a cykl gospodarki;
  - Indeks strachu i chciwości, Szerokość rynku;
  - Premia za ryzyko akcji;
  - Bańka spekulacyjna;
  - Krach giełdowy, Bezpieczniki giełdy;
  - Pożyczkodawca ostatniej instancji;
  - Dźwignia i margin call;
  - Obsunięcie kapitału;
  - Okno IPO;
  - Spółka wzrostowa, Pułapka wartości (z H1b);
  - Indeks ważony kapitalizacją (jeśli H1 go wprowadzi).
- **Mentor** (ścieżka ryzyka, zadanie przydzielane tylko wtedy, gdy zjawisko jest możliwe):

| Zadanie | Kiedy przydzielane | Warunek |
|---|---|---|
| Kup w skrajnym strachu | gracz ma Analityka Indeksowego L4 i wskaźnik < 20 | kup za ≥ 5% aktywów funduszu i trzymaj 4 kw. |
| Wyjdź z bańki | bańka trwa i gracz ma pozycję w jej sektorze | sprzedaj ≥ 50% pozycji przed pęknięciem |
| Przetrwaj bessę | ukryta faza Bessa trwa ≥ 1 kw. | obsunięcie funduszu w fazie mniejsze niż GIG |

- **Osiągnięcia (nowe, zakładka CV i szkolenia):**
  - **Rejestr** `ACHIEVEMENTS` (`id`, ikona, tytuł, opis, `hidden`, `check`); zdobyte w `playerProfile.achievements` (`id` → kwartał).
  - **Gdzie:** sekcja „Osiągnięcia” w zakładce CV i szkolenia — zdobyte (z datą) i do zdobycia (ukryte jako „???” z podpowiedzią).
  - **Zdobycie:** powiadomienie „🏆 Osiągnięcie: …” (istniejące `pushNotification`) i wpis w CV.
  - **Nagroda:** XP (50–200), **bez pieniędzy** — nie rusza balansu.
  - **Sprawdzanie:** co tydzień gry i po zdarzeniach (jak Mentor).
  - **Lista 0.15** (0.15.1 dopisze osiągnięcia kryzysów historycznych):

| | Osiągnięcie | Warunek |
|---|---|---|
| 🌧️ | Przeżyj pierwszy kryzys | przejdź przez pierwszą Bessę albo krach (ukryta faza się kończy) z zaufaniem ≥ 30 i bez utraty stanowiska |
| 🏆 | Wygraj z kryzysem | w Bessie albo w 2 kw. od krachu fundusz lepszy od GIG o ≥ 5 pp |
| 🩸 | Krew na ulicach | kup za ≥ 5% aktywów przy wskaźniku < 20 i miej +30% na tej pozycji po 4 kw. |
| 🫧 | Ucieczka z bańki | przy pęknięciu bańki miej ≥ 50% mniej akcji jej sektora niż 2 kw. wcześniej (i wcześniej ≥ 5% aktywów) |
| 🦄 | Łowca jednorożców | kup jednorożca, zanim jego kurs urośnie ×2 od startu wzrostu, i trzymaj do ×5 |
| 🚢 | Zejście z tonącego statku | sprzedaj gasnącą gwiazdę (≥ 5% aktywów) przed spadkiem kursu o 50% od startu gaśnięcia |
| 🕳️ | Pułapka wartości (ukryte, ironiczne) | trzymaj gasnącą gwiazdę (≥ 5% aktywów) aż do ceny giełdy Brązowej |
| 🧊 | Zimna krew | w tygodniu z bezpiecznikiem nie sprzedawaj akcji i bądź na plusie 2 kw. później |
| 🐂 | Pierwsza hossa | przejdź całą Hossę z funduszem ≥ GIG |
| 🧭 | Pełny cykl | przeżyj wszystkie 6 faz rynku |
| 📈 | Dłużej niż rynek | 20 lat gry z wynikiem funduszu ≥ GIG |

- **Pasek newsów:**
  - zmiana potwierdzonej fazy (tylko z L4);
  - start i pęknięcie bańki, krach, bezpiecznik, cięcie stóp, KNF (dla wszystkich);
  - limit ≤ 1 wiadomość o nastroju na 2 tygodnie gry; krach i bezpiecznik poza limitem.
- **Raport okresu:** jedna linia o fazie rynku (z L4) i obsunięciu GIG w okresie. Bez nowych kafelków w panelu funduszu.
- **Retrospektywa:** po końcu Bessy albo Hossy (ukrytej fazy) jeden mail:
  - wynik GIG i funduszu w fazie;
  - obsunięcie obu;
  - najlepszy i najgorszy sektor;
  - link do hasła Akademii.
  
  Retrospektywa jest dla wszystkich — to lekcja po fakcie, więc nie zdradza bieżącej fazy.
- **Ocena zarządu:** bez zmian (względem GIG).
- **Commit H6a** (Akademia, Mentor, newsy, retrospektywa) i **H6b** (osiągnięcia).

---

## Zlecenie dla czatu designu (przed budową UI H2b i H6b)

Czat kodu nie projektuje wyglądu nowych elementów. Czat designu dostaje ten opis i dopisuje projekt do `plany/design/` (komponenty z systemu 0.14.5):
1. **Element KPI nastroju** w górnym pasku, zamiast `marketTrend`:
   - stany: brak (bez L4) / faza i wskaźnik (L4) / faza w trakcie potwierdzania;
   - 5 stref wskaźnika z liczbą i słowem;
   - 6 faz z ikoną, nazwą i opisem w dymku;
   - wersja mobile (ikona i liczba).
2. **Okno „Rynek”** (L5): pasek KPI (5 wartości), 5 kart składników z mini-wykresem, wykres GIG z tłem i podpisami faz, lista historii faz (w tym fazy „wstecz”).
3. **Kolumna „Premia sektora”** w skanerze i wiersz w karcie spółki.
4. **Sekcja „Osiągnięcia”** w zakładce CV i szkolenia: zdobyte (ikona, tytuł, data) i ukryte („???” + podpowiedź); powiadomienie o zdobyciu.
5. **Dwa nowe poziomy** Analityka Indeksowego w drzewku umiejętności (opis i podgląd tego, co odblokowują).
6. **Wymogi:**
   - kolor nigdy nie jest jedynym nośnikiem (2.2 dostępność);
   - animacje tylko z `prefers-reduced-motion`;
   - bez nowych okien modalnych i dymków (krach idzie paskiem newsów).

---

## Zapis gry i testy

- **Zapis v15** (`SUPPORTED_SAVE_VERSIONS` + 15):
  - `marketRegimes` (stan i historia ≤ 40 kw.);
  - `sectorBubble` (sektor, premia, faza, kwartały, przerwa);
  - `marketCrash` (tygodnie, spadek, `theme`);
  - `marketHalt`;
  - `knfLeverageCap` (do kiedy);
  - szereg wskaźnika ≤ 80 tygodni;
  - w spółkach ostatni mnożnik premii i znacznik `growthStar` / `fadingStar` / `falseStar` (start, długość, etap);
  - `playerProfile.achievements`;
  - przy H1 metoda GIG i wagi.

  Razem < 0,5% rozmiaru zapisu.
- **Migracja v14 → v15:**
  - faza z `economyCycle` (Ekspansja i Przegrzanie → Hossa, Ożywienie → Akumulacja, Recesja → Bessa);
  - premia 0, `shownPhase` = faza;
  - szczyt i dołek = bieżący GIG;
  - bez bańki;
  - jednorożce i gasnące gwiazdy dobrane przy wczytaniu według reguł H1b (od bieżącego kwartału);
  - osiągnięcia puste;
  - GIG (jeśli zmieniono metodę) kontynuuje od bieżącej wartości;
  - poziomy L4–L5 Analityka Indeksowego niekupione.
- **Testy** (nowa grupa „0.15”):
  1. sondy H0 nie zmieniają stanu gry (ten sam seed → ten sam GIG);
  2. GIG ważony kapitalizacją: limit 10%, ciągłość przy migracji, debiut nie robi skoku;
  3. jednorożce: zawsze 2–3 aktywne lub zakończone w grze 6,5-letniej; zastępstwo, gdy jeden zniknie; boty go nie przejmują w okresie wzrostu;
  4. gasnące gwiazdy: start w kw. 5–16, kurs kończy ≤ 75 zł; liczba akcji i posiadacze bez zmian;
  5. kara makro: fundusz = GIG w spadającym rynku dostaje mniejszą karę niż fundusz gorszy od GIG;
  6. przejścia faz zgodne z tabelą (rozkład na 10 000 losowań);
  7. premia dochodzi do celu ok. 25% na kw.;
  8. premia nie zmienia `fundamentals.fairValue`;
  9. kurs i cel powrotu przesuwają się razem;
  10. potwierdzenie fazy: 1 kw. / 2 kw. / wcześniej przy ±20%; krótka faza trafia do historii wstecz;
  11. widok za umiejętnością: bez L4 brak elementu KPI i wiadomości o fazach; L4 element; L5 okno i kolumna skanera;
  12. wskaźnik strachu i chciwości w 0–100, składniki z danych, strefy;
  13. bańka: rozkład długości bez stałego terminu, pęknięcie w granicach, efekt wg udziału segmentu;
  14. krach: spadek premii 25–35 pp w 1–4 tygodnie, potem Bessa albo Kapitulacja; `theme` = null;
  15. margin call: bot z długiem > 50% sprzedaje 20–40%; akcje = posiadacze;
  16. bezpiecznik: progi 7/13/20% od zamknięcia tygodnia, raz na tydzień, flaga rynku; spółki nie dostają `tradeHalted`, GIG liczy się dalej po wznowieniu;
  17. wstrzymanie blokuje zlecenia gracza, botów, ETF-ów i banków;
  18. cięcie stóp po krachu (szansa wg inflacji);
  19. KNF obniża dźwignię botów na 4 kw.;
  20. boty według osobowości w fazach (kierunek transakcji);
  21. klienci: panika ×2 i limit 8% JU/kw.; Spryciarz napływa przy wskaźniku > 75;
  22. okno IPO: mnożnik 0,6–1,8, przełożenie przez `parkStartupForListing`, rozliczenie puli bez zmian;
  23. Mentor przydziela zadania tylko, gdy zjawisko trwa;
  24. osiągnięcia: każde z listy zdobywalne w scenariuszu testowym; raz na grę; zapis i wczytanie; XP bez pieniędzy;
  25. migracja v14 → v15;
  26. niezmienniki świata po 20 latach.

## Jak sprawdzimy

Przebiegi ×200 w `tests/przebiegi.html`. Każda część: ≥ 20 przebiegów × 6,5 roku. H1 i kontrola końcowa także 20 × 20 lat. Pozostałe części: 10 × 20 lat. ± to błąd standardowy średniej.

| Miara | Cel |
|---|---|
| GIG rocznie (20 lat, mediana) | **8–10%** |
| Wzrost zysku na akcję (mediana spółek) / C/Z rynku / marża | **8–11%/rok** / bez trendu (±1 pp/rok) / bez trendu (±1 pp na 20 lat) |
| Jednorożce | 2–3 w każdej grze 6,5-letniej; kurs ×5–10 od startu wzrostu do końca gry (mediana); 6–8 na 20 lat |
| Gasnące gwiazdy | 2–3 w grze 6,5-letniej, start w kw. 5–16; 100% kończy ≤ 75 zł, ok. 50% ≤ 20 zł; zwrot akcji ok. 20% |
| Strategia „kup spółki z przychodami > +25% r/r przez 2 kw.” | przewaga nad GIG ≤ +5 pp/rok; ≥ 25% przebiegów gorszych od GIG (fałszywe tropy) |
| σ rocznych stóp GIG | 12–20 pp (po H1: ≥ 8 pp) |
| Spadek GIG ≥ 20% od szczytu | ≥ 1 w ≥ 80% przebiegów 20-letnich; w ≥ 50% 6,5-letnich |
| Największe obsunięcie GIG w 20 latach (mediana) | 30–50% |
| Czas w Bessie lub Kapitulacji (ukryta faza) | 15–30% |
| Bańki na 20 lat / spadek przy pęknięciu | 2–6 / −40…−70% |
| Krachy (> 20% w ≤ 4 tyg.) | 1–3 na 20 lat; ≥ 1 w 30–50% przebiegów 6,5-letnich |
| Bezpieczniki | ≥ 1 przy każdym krachu; 0–2 poza krachami na 20 lat |
| Fundusz = GIG: zaufanie i JU (po H1 i po H5) | zaufanie 45–55; JU −3…+3%/rok |
| Fundusz = GIG: ocena zarządu, premia R5 | neutralna; ok. 0 |
| Cele korporacji CEO | ≤ 25% wpływów prywatnych |
| Lokata vs GIG | lokata lepsza w 20–35% okien 3-letnich; w 20 latach GIG ≥ lokata + 2 pp/rok |
| **Strategia kontrariańska** (kup przy wskaźniku < 20, sprzedaj > 80) | przewaga nad GIG dodatnia, ≤ +4 pp/rok; ≥ 30% przebiegów gorszych od GIG |
| **Strategia fazowa** (akcje w potwierdzonej Akumulacji, Hossie, Euforii; lokata w pozostałych) | ≤ +3 pp/rok; ≥ 30% przebiegów gorszych od GIG |
| **Strategia bańkowa** (kup przy premii sektora +30%, sprzedaj przy +80%) | średnio dodatnia; ≥ 30% transakcji ze stratą |
| Okno IPO | przełożone debiuty 0,5–3 na 20 lat; mnożnik wyceny w euforii śr. ≥ 1,2 |
| Osiągnięcia (gracz-sonda „kontrarianin” w przebiegach) | ≥ 3 zdobyte w 6,5 roku; 0 błędów sprawdzania |
| Wydzielenia T4 (preset `wydzielenia`, 10 przebiegów) | efekt ponad GIG +3–8% |
| Spółki krajowe / łącznie | ≤ 115 / ≤ 150 |
| Wiadomości o nastroju w pasku newsów | ≤ 1 na 2 tygodnie (poza krachem) |
| Niezmienniki, ujemna gotówka, bezpiecznik gotówki, błędy JS | 0 |
| Czas kroku / zapis | +≤ 5% / +≤ 0,5% |

## Ryzyka

- **Przestrojenie zależnych kalibracji** (B5, R5, ocena, lokaty, T4) przez niższy GIG i zmianę metody GIG. Zabezpieczenie: H1 obowiązkowo je mierzy, a zaufanie i JU mierzymy drugi raz po H5.
- **Jednorożce za łatwe do znalezienia** (sama analiza przychodów daje pewny zysk). Zabezpieczenie: fałszywe tropy, premia wzrostu w C/Z (rynek częściowo już wycenia wzrost), cel strategii ≤ +5 pp i ≥ 25% przebiegów gorszych.
- **Gasnące gwiazdy ciągną GIG** (górne 20% kapitalizacji, przy GIG ważonym kapitalizacją ok. −1…−2 pp/rok w czasie gaśnięcia). Zabezpieczenie: cele H1a liczone z włączonym H1b; limit 10% wagi.
- **Premia „zjadana” przez powrót do wartości godziwej albo psująca lekcję wyceny.** Zabezpieczenie: premia na kursie i celu powrotu, `fairValue` bez premii; testy 8–9.
- **Fazy za przewidywalne mimo opóźnienia.** Zabezpieczenie: losowe długości, 2 kw. potwierdzenia dla faz przejściowych, cele strategii fazowej (≤ +3 pp) i kontrariańskiej (≤ +4 pp). Jeśli przekroczone — dłuższe potwierdzenie albo krótsze Dystrybucje.
- **Gracz bez L4 „nie wie, co się dzieje”.** Zabezpieczenie: publiczne wiadomości (krach, bańka, bank centralny), retrospektywa dla wszystkich, tani koszt L4 (900 zł), a Mentor i Akademia podpowiadają umiejętność.
- **Za dużo spadków dla zabawy.** Zabezpieczenie:
  - Bessa 2–5 kw., Kapitulacja 1 kw.;
  - cel czasu w Bessie 15–30%;
  - limit odpływu z paniki 8% JU/kw.;
  - ocena względem GIG.
- **Bezpiecznik psuje GIG albo przepływy** (wiele ścieżek zleceń). Zabezpieczenie: jedna flaga rynku i jedna funkcja sprawdzająca we wszystkich ścieżkach; testy 16–17.
- **Margin call i panika botów rozkołysują rynek ponad cel σ.** Strojenie siły sprzedaży (20–40%, 30–50%) w H4/H5.
- **Pasek newsów zalany.** Tylko potwierdzone zmiany, limit 1 na 2 tygodnie.
- **Za duża wersja.** Punkt kontrolny po H1; UI ograniczone do 1 okna, 1 elementu KPI i sekcji osiągnięć; linie kryzysów w osobnej 0.15.1.

## Decyzje (podjęte)

2026-10-14:
1. **Kolejność:** „Hossa i bessa” to 0.15, przed giełdą międzynarodową, która przechodzi na 0.16. Waluty i rynki zagraniczne kalibrujemy już na zrównoważonym rynku.
2. **Zakres:** nastrój rynku i fazy, bańki i krachy, boty i klienci zależni od nastroju.
3. **Bez krótkiej sprzedaży** w tej wersji.

2026-10-17 (planowanie 0.15, `raporty/audyt_planu_0.15.md`):
4. **Faza widoczna dla gracza:** ukryta faza (6 nazw) z opóźnieniem potwierdzenia, a nie definicja techniczna z GIG. Definicja ±20% przyspiesza potwierdzenie i trafia do Akademii.
5. **GIG ważony kapitalizacją** (limit 10%) — tak, jeśli H0 pokaże, że równe wagi dają ≥ 2 pp rocznie.
6. **Nowe decyzje gracza w 0.15:** okno IPO; emisje, skupy i przejęcia zależne od nastroju; margin call botów i KNF; rynki kapitałowe; retrospektywa.
7. **Premia nastroju działa na kurs**, nie przez `getValuationMultiplier`; wartość godziwa pokazywana graczowi zostaje fundamentalna.
8. **Krach:** 1,2%/kw. + 6 pp w Euforii. **Bezpieczniki:** 7/13/20% jako flaga rynku.
9. **Odrzucone lub odłożone** (do `pomysly_na_kolejne_wersje.md`): opcje i CFD, muzyka, zarządzający aktywami, państwowy fundusz w krachu (0.16), zlecenia z limitem i stop-loss, „list do klientów”. Scenariusz „Wielki Kryzys” przechodzi w linie kryzysów 0.15.1.

2026-10-18 (poprawki użytkownika):
10. **Cele trendu:** mediana wzrostu zysku na akcję **8–11%/rok**, GIG **8–10%/rok** (zamiast 6–8% i 7–9%).
11. **Jednorożce gwarantowane:** 2–3 na grę 6,5-letnią, kurs ×5–10. **Gasnące gwiazdy:** 2–3 na grę, start w 2.–4. roku, kończą na cenie giełdy Brązowej albo Śmieciowej.
12. **Widok nastroju tylko z umiejętnością:** Analityk Indeksowy L4 (element KPI zamiast `marketTrend`) i L5 (okno „Rynek”, premia sektora). Projekt wyglądu zleca się czatowi designu.
13. **Osiągnięcia** w zakładce CV i szkolenia (11 w 0.15, XP bez pieniędzy); osiągnięcia kryzysów historycznych w 0.15.1.
14. **0.15.1 „Kryzysy”:** linie zdarzeń kryzysów historycznych (`plan_0.15.1_kryzysy.md`, szkic). **0.16:** notowanie tej samej spółki na kilku giełdach, córki na innych giełdach (nowy limit córek), bot w stylu Benjamina Grahama, odróżnienie „Wilka” — dopisane do `plan_0.16_gielda_miedzynarodowa.md`.
