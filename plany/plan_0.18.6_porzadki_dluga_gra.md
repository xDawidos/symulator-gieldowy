# Plan 0.18.6 „Porządki”, 0.18.7 „Progresja i onboarding”, 0.18.8 „Długa gra” (2026-11-13, etapy 2026-11-14)

Zgłoszenie użytkownika z 2026-11-13 (5 celów: debug, stany puste, formaty, pamięć i skala, długa gra). Stan wyjściowy: `zmiany-AI` po 0.18.5 (64f17cd). Kontrola końcowa 0.18 trwa w czacie „Realizacja 0.18”, więc ten plan nie rusza przed jej scaleniem. Liczby są startowe.

**Podział i kolejność (decyzje 2026-11-13 i 2026-11-14):** trzy etapy z listy użytkownika po kolei, potem cel gry.

| Kolejność | Wersja | Etap użytkownika | Zakres |
|---|---|---|---|
| 1 | **0.18.6 Porządki** | Etap 1: porządki i spójność | `debug.js`, stany puste (makieta 22), jedno formatowanie, z decyzji U1–U8: kryzysy (U2), presja ekologiczna (U7), ramy okien (U6), zapisy na IPO (U5); z makiet 22 i 23: pola z etykietą, akcent fazy, bezpiecznik |
| 2 | **0.18.7 Progresja i onboarding** | Etap 2 | stopniowe odblokowywanie (E1), Pierwsze kroki z premią na konto prywatne (E2, makieta 22), wskazówki o fazie (E3, makieta 23) |
| 3 | **0.18.8 Długa gra** | Etap 3: late game 50–100 lat | diagnoza i limity pamięci, skala kapitału, 3 automaty w Akademii, czarne łabędzie, podsumowania dekad (makieta 23) |
| 4 | Cel gry | — | `plan_cel_gry.md`, numer nadamy przy planowaniu (po 0.18.8, przed 0.19.1) |

Makiety 22 i 23 (`design/22_pierwsze_kroki.md`, `design/23_fazy_dekada.md`, commit beac246) **zaakceptowane przez użytkownika 2026-11-14**. Wdrażają je części O2, O8, E1, E2, E3 i D6.

## Uzgodnienie z listą użytkownika (2026-11-14)

| Punkt listy | Część planu | Różnica i rozstrzygnięcie |
|---|---|---|
| Etap 1: globalny moduł formatowania (PLN, 2 albo 4 miejsca dla NAV, polskie spacje i przecinki) | **O3** | zgodne; 4 miejsca tylko dla NAV / udziału (makieta 18: „10,4210 PLN”), kwoty 2, liczby akcji 0 |
| Etap 1: panel debug poza `index.html`, tylko `?debug=1` lub localhost | **O1** | **różnica:** użytkownik 2026-11-14 potwierdził, że przycisk w Ustawieniach na razie zostaje; `?debug=1` / localhost w „Odłożone” |
| Etap 2: Progressive Disclosure (obligacje korporacyjne, aukcje hipoteczne, Miasto) po progach NAV lub szkoleniach | **E1** (dawne D3) | „Aukcje hipoteczne” w grze nie istnieją; najbliższe to aukcje akcji zastawnych (`startCollateralAuction`). Miasto: blokujemy obecne okno inwestycji miejskich, a Miasta 2 (0.19.2) dostają tylko szkielet reguły w rejestrze |
| Etap 2: 4 zadania „Pierwsze kroki” z premią na konto prywatne | **E2** (nowe) | według makiety 22: 4 × 50 PLN; dopisek 2026-11-14: E2 to ogólny system zadań według makiety 24 (TeamedUP! + przypinanie do 3, kategorie Rynek i Mechaniki) |
| Etap 3: 3 automaty w Akademii | **D4** | auto-rolowanie lokat bez zmian; „limity aukcyjne” zawężone do bonów skarbowych z limitem gotówki; rebalancing klas aktywów zastąpiony **alertem koncentracji sektora (tylko alert, bez automatycznej sprzedaży)**, decyzja 2026-11-14 |
| Etap 3: czarne łabędzie co 15–25 lat (stopy, zaufanie klientów, sektory) i podsumowanie dekady | **D5, D6** | skrócenie spokoju z U2 zostaje w O4 (bez dublowania); skutki łabędzi uzupełnione o stopy i zaufanie klientów; dekada w TeamedUP! (makieta 23) |
| (spoza listy) makieta 23: akcent fazy, bezpiecznik | **O8** | decyzja 2026-11-14: w 0.18.6 |
| (spoza listy) makieta 23: wskazówki o fazie | **E3** | decyzja 2026-11-14: w 0.18.7 |
| (spoza listy) makieta 22: pola z etykietą | **O8** | małe, w 0.18.6 |

## Co już jest w kodzie (przegląd 2026-11-13)

| Cel | Stan | Szczegóły |
|---|---|---|
| Panele deweloperskie | **częściowo** | Jest tryb debug: `isDebugMode()` czyta flagę z `localStorage` (`ui.js:7379`), klasa `.debug-only` (prędkości ×10–×200, `index.html:365`) i blok `#debug-tools` w oknie Ustawień (`index.html:595`, ok. 100 linii: gotówka, relacje, faza rynku, bańka, genealogia). Funkcje: 7 `debug*` w `ui.js`, 4 w `core.js`. **Przycisk „Tryb debug” widzi każdy gracz.** `debugCheckInvariants()` używają testy i przebiegi |
| Stany puste | **częściowo** | Ok. 150 tekstów „Brak …” rozsianych po modułach, bez wspólnego komponentu. Makieta 18 ma wzór pustego stanu pozycji |
| Formatowanie | **w większości** | Od 0.14.5 jest `formatNumberPl` (`Intl.NumberFormat('pl-PL')` z pamięcią), `formatZl` (waluta konta), `formatPLNShort`, `formatPct`, `formatNav` (`ui.js:6948–6985`), daty w `formatGameDate` i `formatQuarterDate` (`campaigns.js:16`). **Omijają je:** ok. 340 wstawek `${x.toFixed(n)}` w tekstach (ui.js 123, companies.js 70, learning.js 56, player.js 48, state.js 31…), 68 `toLocaleString`, stałe „PLN” i „zł” w `index.html` i kilku modułach |
| Historia i pamięć | **częściowo** | Świece mają limit 60–100 (`core.js:3919`), okresy funduszu 12, indeksy 20, makro i społeczeństwo 16, dobra wewnętrzne 40 kw. (K4). **Bez limitu:** `playerProfile.cv` (wpisy co zdarzenie), dzienniki (np. `ratingState.log`, `blockDealState.log`) do sprawdzenia |
| Odblokowywanie | **częściowo** | Dostęp do giełd według stanowiska (`CAREER_POSITIONS`, 2 → 7), licencje giełd (`licenseCost`), certyfikaty mentora (`learning.js:1774`), poziomy urzędów. Zakładki boczne (Bank, Państwo, Miasto, Budownictwo, Internet…) są dostępne od startu |
| Automatyzacja | **brak** | Są tylko automaty botów (`rebalanceEtf`, `rebalanceCommodityBasket`). Gracz nie ma auto-rolowania lokat ani limitów w aukcjach (`resolveTBillAuction`, `resolveCollateralAuction`) |
| Kryzysy | **są, za rzadkie** | 6 linii w `crises.js` (z `supply`), 0,75 na 20 lat przy celu 1–2 (U2, D33 w `raporty/decyzje_0.18.md`). Częstość ograniczają 12 kw. spokoju, wymóg fazy rynku i krachy |
| Miasto | **jest okno, miast nie ma** | Zakładka „Miasto” to dziś okno inwestycji miejskich (`openCityInvestmentModal`, `ui.js:5029`). Miasta jako obiekty to 0.19.2 |

---

## 0.18.6 Porządki

O0–O3, O6 i O8 bez zmiany balansu (GIG i marże ±0,3 pp, szum). O4, O5 i O7 zmieniają balans, więc mają własne bramki. **Cel GIG 20 lat: 10–13%** (U1, 2026-11-13). Bramka całej wersji: 0 błędów, testy zielone, zapis bez wzrostu, GIG 20 lat w 10–13%, marże 0 ± 0,3 pp.

### O0. Spis

- **Zakres:** dokładna lista do O1–O3: elementy debug w `index.html` i JS; kontenery, które przed pierwszym tickiem albo bez danych renderują się puste (tabele, okna, listy); wszystkie miejsca formatowania liczb poza helperami (`toFixed`, `toLocaleString`, stałe „PLN”/„zł”, kropka dziesiętna). Każde miejsce oznaczamy: tekst dla gracza, log konsoli albo obliczenie (np. zaokrąglenie przez `toFixed`, którego nie ruszamy).
- **Pliki:** `raporty/spis_0.18.6.md` (nowy), skrypt `design/narzedzia/spis_formatow.mjs` (nowy, grep z klasyfikacją).
- **Weryfikacja:** spis do akceptacji użytkownika.

### O1. Wydzielenie debug do `debug.js`

- **Decyzja 2026-11-13, potwierdzona 2026-11-14:** przycisk „Tryb debug” **zostaje na razie w Ustawieniach**. Docelowo debug ma działać tylko na localhost (zapis w „Odłożone”).
- **Zakres:** cały kod debug przenosimy do `debug.js`: funkcje `debug*` z `ui.js` i `core.js`, `applyDebugModeUi`, `toggleDebugMode`, sondy pomocnicze i blok `#debug-tools`. Blok jest budowany przez `debug.js` (wstawiany do okna Ustawień), a nie zapisany w `index.html`. W `index.html` zostaje tylko pusty kontener i przycisk. `isDebugMode()` zostaje w `ui.js`, bo czyta ją kod gry (energia, intro, A1). `debugCheckInvariants` przenosimy do `debug.js`, ładowanego zawsze, więc testy i przebiegi działają bez zmian. Style inline z bloku debug przechodzą do klas w `style.css`.
- **Pliki:** `debug.js` (nowy), `index.html` (−ok. 100 linii, `<script src="debug.js">`), `ui.js`, `core.js`, `style.css`, `tests/tests.html`, `tests/przebiegi.html` (kolejność skryptów).
- **Test:** po włączeniu trybu debug panel ma te same przyciski co dziś; po wyłączeniu w DOM nie ma ani jednego elementu `#debug-tools`; `grep "function debug" ui.js core.js` daje 0; testy i przebiegi bez zmian.

### O2. Stany puste

- **Zakres:** jeden komponent `renderEmptyState({ icon, title, text, action })` według makiety 22 (§2) w 4 wariantach: brak danych, przed pierwszą sesją, zablokowane (używane od E1), w tabeli (`tr.empty-row`). Stosujemy go w kontenerach ze spisu O0, najpierw w tych, które gracz widzi w pierwszych minutach (portfel, pozycje, poczta, Tied, klienci, kontrakty, łańcuchy przed pierwszym kwartałem). Do tego jeden stan „ładowanie przed pierwszym tickiem” dla tabel rynku. Teksty według `design/04_teksty.md`.
- **Pliki:** `ui.js` (komponent), moduły UI ze spisu (`ui.js`, `energy_ui.js`, `chains_ui.js`, `countries_ui.js`, `currency_ui.js`, `internet.js`, `tied.js`, `learning.js`), `style.css`.
- **Test:** świeża gra przed pierwszym tickiem: żaden kontener ze spisu nie jest pusty (test DOM po kolei otwiera okna); stary zapis bez danych łańcuchów pokazuje stan pusty.
- **Design:** ekran 1 z listy niżej.

### O3. Jedno formatowanie

- **Zakres:** helpery formatowania przechodzą z `ui.js` do nowego `formatters.js`. To czysty moduł bez DOM, ładowany pierwszy, a nazwy funkcji zostają (`formatNumberPl`, `formatZl`, `formatPLNShort`, `formatPct`, `formatNav`, `formatGameDate`, `formatQuarterDate`). Dochodzą: `formatInt` (liczba akcji, bez groszy), `formatShares` („1 250 akcji”), `formatPp` (punkty procentowe), `formatDateLong`. Waluta zawsze z `getBaseCurrency()` (dziś PLN), nigdy „zł” na sztywno. Udział funduszu (NAV) ma 4 miejsca jak w makiecie 18 („10,4210 PLN”), wszystkie inne kwoty 2, liczby akcji 0, procenty 2 (pp 1). Potem wymiana wstawek ze spisu O0, plik po pliku, tylko w tekstach dla gracza. Logi konsoli i obliczenia zostają.
- **Pliki:** `formatters.js` (nowy), `ui.js`, `campaigns.js`, `index.html` (stałe „zł”), moduły ze spisu (ui.js, companies.js, learning.js, player.js, state.js, core.js, ai.js, ma.js, finance.js, exchange_clock.js, listings.js…). Commit po każdym pliku albo grupie.
- **Test:** testy helperów (minus typograficzny, `—` dla NaN, waluta EUR przy starcie z DE); skrypt `spis_formatow.mjs` w trybie kontroli: 0 wstawek `toFixed` w tekstach dla gracza, 0 „zł” w kodzie UI; przebieg 24 gier bez zmiany wyniku (formatowanie nie zmienia liczb).
- **Bramka:** kontrola `raporty/kontrola_0.18.6.md`.

### O4. Kryzysy częściej (U2, decyzja 2026-11-13)

- **Zakres:** minimalny okres spokoju między liniami **12 → 10 kw.** (nie 8) i łagodniejszy wymóg fazy rynku (linia może ruszyć w szerszym zbiorze faz; dokładną listę ustala diagnoza). `CRISIS_BASE_CHANCE` bez zmian (D33: to pokrętło nie działa). Bez czarnych łabędzi (te są w „Długiej grze”).
- **Pliki:** `crises.js` (stałe spokoju i warunek fazy), preset `kryzys` w `tests/przebiegi.html`.
- **Test:** test jednostkowy: linia nie startuje przed 10 kw. od poprzedniej; seria 20 × 20 lat bez UI.
- **Bramka:** **1–2 linie na 20 lat**, GIG 20 lat w 10–13%, marże 0 ± 0,3 pp. Jeśli przy 10 kw. wyjdzie poniżej 1, pytanie do użytkownika (8 kw. albo inny warunek).

### O5. Presja ekologiczna (U7, decyzja 2026-11-13: mechanika zamiast strojenia)

Stan w kodzie: partia **„Zieloni”** (`green`, `core.js:4872`) wchodzi na wyborach na miejsce Socjaldemokratów przy zanieczyszczeniu ≥ 60 z szansą 30% (`GREENS_SWAP_POLLUTION`, `GREENS_SWAP_CHANCE`, `core.js:5433`) albo od startu gry (25%). Jej poparcie rośnie o 0,1 pp na punkt ponad 30. Protest i smog (`ENERGY_EVENTS`, `energy.js:456`) mają stałą szansę po przekroczeniu progu. UEiE dostaje 15% budżetu energetycznego, a przy Zielonych w rządzie 30% (`ENERGY_OFFICE_RULES`, `energy.js:453`). Strajki pracownicze (`startStrike`, `getStrikeRisk`, `companies.js:10949, 11173`) nie zależą od zanieczyszczenia.

- **Zakres:** jeden wskaźnik **presji ekologicznej** 0–100 w `society.energy`. Rośnie z zanieczyszczeniem ponad 45 i z każdym smogiem, protestem i kwaśnym deszczem, a spada powoli, gdy zanieczyszczenie maleje. Skutki presji:
  1. częstsze protesty i smog (mnożnik szansy 1 → 2 przy presji 100) oraz **strajki ekologiczne** w spółkach o największej emisji (spadek zadowolenia pracowników, więc wyższe `getStrikeRisk`);
  2. udział UEiE w budżecie energetycznym rośnie płynnie z 15% do 30% także bez Zielonych w rządzie (z Zielonymi do 40%), co przez poziomy urzędu obniża emisje;
  3. silniejsi Zieloni: poparcie rośnie o presję × współczynnik, a przy presji ≥ 60 wchodzą na wybory już od zanieczyszczenia 50 i z wyższą szansą;
  4. spada opinia publiczna spółek emitujących (`OPINION_EVENTS`).
- **Pliki:** `energy.js` (presja, zdarzenia, budżet UEiE), `core.js` (Zieloni: poparcie, wejście), `companies.js` (strajk ekologiczny), `energy_ui.js` (wskaźnik w Państwo → Środowisko), `main.js` (pole w zapisie; stary zapis liczy presję z bieżącego zanieczyszczenia). Teksty bez emoji.
- **Test:** presja rośnie przy zanieczyszczeniu 70 i spada przy 40; szansa protestu przy presji 100 jest dwa razy większa od bazowej; budżet UEiE 15% → 30% bez Zielonych; Zieloni wchodzą przy 50, gdy presja ≥ 60.
- **Bramka:** seria 20 × 20 lat (razem z O4): zanieczyszczenie po 20 latach średnio 55–65, gry „brudne” (≥ 90) najwyżej w 10%, Zieloni obecni w ≥ 50% gier z zanieczyszczeniem > 60, GIG 20 lat 10–13%, marże 0 ± 0,3 pp.

### O6. Ramy okien i poprawki z makiet (U6)

- **Zakres:** okna Bank, Firma i Internet w ramie `.wn` z makiety 19; z makiety 18: pasek telefonu w jednym wierszu i szersza kolumna nazwy (D50).
- **Pliki:** `ui.js`, `internet.js`, `style.css`, `index.html`.
- **Test:** test DOM: trzy okna mają ramę `.wn`; zrzuty przy 1280 i 1920 px; pasek telefonu się nie łamie.

### O7. Zapisy funduszu gracza na IPO (U5)

- **Zakres:** w nowym IPO (0.18.4 A3) gracz jako fundusz składa zapis w okresie subskrypcji: liczba akcji albo kwota, z blokadą gotówki. Przy nadsubskrypcji przydział jest redukowany proporcjonalnie, jak u botów, a nadwyżka gotówki wraca po przydziale. Wycofana emisja oznacza pełny zwrot. Obowiązują limity KNF i limit pozycji funduszu, lock-up bez zmian. Zapis widać w karcie debiutu, a wynik przydziału przychodzi pocztą.
- **Pliki:** `listings.js` (subskrypcja, redukcja), `companies.js` (debiut), `player.js` (blokada gotówki, przydział), `ui.js` (formularz według makiety), `main.js` (zapis otwartych zapisów).
- **Test:** nadsubskrypcja 3× daje przydział 1/3 i zwrot reszty; wycofanie daje pełny zwrot; niezmienniki 0 (zablokowana + wolna gotówka = gotówka przed zapisem).
- **Bramka:** debiuty i „pop” pierwszego dnia jak w kontroli 0.18.4 ±20%, GIG ±0,5 pp.

### O8. UI z makiet 22 i 23 (zaakceptowane 2026-11-14)

- **Zakres:** (1) pola z etykietą (makieta 22 §3): widoczne `label for` dla pól z tabeli notki, chipy branż jako `fieldset` + `legend`; (2) akcent fazy rynku (makieta 23 §1): `data-phase` na `.app-main` tylko przy „Analityk indeksu” L4 i pokazanej fazie, `.phase-chip`, krawędź panelu rynku, ruch tylko przy `prefers-reduced-motion: no-preference`; (3) bezpiecznik giełdowy (makieta 23 §2): nowy `#circuit-breaker-banner` (`role=alert`, ikona zamiast emoji, bez wersalików i pulsowania, licznik `aria-hidden`); (4) usunięcie ukrytego wiersza konta prywatnego `.topbar-kpi[hidden]` z `index.html`.
- **Pliki:** `index.html`, `ui.js` (`updateMoodKpi`, `updateCircuitBreakerUI`), `style.css`, `tokens.css` (zmienne fazy).
- **Test:** każdy `select` w `index.html` ma etykietę; bez L4 brak `data-phase`, z L4 atrybut = `shownPhase`; bezpiecznik bez emoji i wersalików; przy `reduce` brak animacji.

### O9. Kontrola 0.18.6

Seria 24 × 6,5 roku, seria 20 × 20 lat (O4, O5) i testy, raport `raporty/kontrola_0.18.6.md`. Zrzuty Ustawień (z debug i bez), stanów pustych, okien w ramie `.wn`, formularza zapisu na IPO, wskaźnika presji, akcentu fazy i bezpiecznika.

---

## 0.18.7 Progresja i onboarding (Etap 2)

Bez zmiany balansu (blokady dotyczą tylko gracza; przebiegi bez UI je ignorują). E0 zmienia przydział poziomów giełd, więc ma własną bramkę rozkładu. Bramka: GIG i marże ±0,3 pp, 0 błędów, testy zielone.

### E0. Poziomy giełd bez kursu (uwaga użytkownika 2026-11-14; kryteria rozplanuje użytkownik)

Uwaga użytkownika: kurs nie powinien być jedynym wyznacznikiem poziomu giełdy (Śmieciowa…Platynowa), a reguła nie powinna być widoczna dla gracza. Dziś poziom wynika z ceny (`getPriceTierKey`, `companies.js:1309`; progi `exchanges`, D6 w `raporty/decyzje_0.18.md`), giełdy elitarne z rankingu kapitalizacji, a ocena AAA–D (0.18.4) jest bramką awansu.

- **Kryteria przydziału: do rozplanowania i dopisania przez użytkownika** (decyzja 2026-11-14). Do tego czasu ta część nie rusza. Propozycja z rozmowy, do odrzucenia lub zmiany: wynik z kapitalizacji (40%), oceny publicznej (25%), płynności (20%) i zysku z 4 kw. (15%), bez kursu, liczony jako percentyl; progi trzymające obecny rozkład (kontrola 0.18.0: Śmieciowa 9,8%, Brązowa 33,1%, Srebrna 31,6%, Złota 17,8%, Platynowa 5,6%); zmiana poziomu po 2 kwartałach; giełdy elitarne bez zmian (ranking), oceny dalej bramką awansu.
- **Ukrycie reguły (zdecydowane):** na płytce giełdy i w karcie spółki nie ma progów kursu. Po najechaniu na nazwę poziomu (także fokus klawiaturą) podpowiedź: wymagana ocena plus jedno zdanie bez liczb, np. Platynowa: „Dostęp od oceny A. Decydują też wielkość, płynność i zyski spółki.”; Brązowa i Srebrna: „Dostęp od oceny widocznej publicznie…”; Śmieciowa: „Dostęp bez oceny…”. Dokładne teksty po ustaleniu kryteriów.
- **Pliki (wstępnie):** `companies.js` (`exchanges`, przydział zamiast `getPriceTierKey`, `splits.js` jeśli split zależy od progu), `listings.js` (ocena), `ui.js` (płytka giełdy z makiety 18, podpowiedź), `main.js` (stan histerezy w zapisie).
- **Test i bramka (wstępnie):** rozkład poziomów jak w kontroli 0.18.0 ±3 pp na poziom, Platynowa 5–10%; podpowiedź bez liczb i bez kursu; GIG i marże ±0,3 pp; spółka nie skacze między poziomami częściej niż raz na 2 kw.

### E1. Stopniowe odblokowywanie (dawne D3)

- **Zakres:** rejestr `UNLOCKS` (zakładka lub funkcja → warunek: NAV / aktywa funduszu, stanowisko, certyfikat Akademii, rok gry). Progi startowe (do akceptacji): Bank od startu (lokaty, potrzebne w Pierwszych krokach); aukcje bonów skarbowych po certyfikacie „Obligacje” albo aktywach ≥ 50 tys.; **obligacje korporacyjne** (`index.html:781`) po tym samym certyfikacie albo aktywach ≥ 100 tys.; **aukcje akcji zastawnych** (w liście użytkownika „aukcje hipoteczne”; aukcji hipotecznych w grze nie ma) po stanowisku Zarządca funduszu; Budownictwo i Państwo → Łańcuchy po 1. roku; okno **Miasto** (dziś inwestycje miejskie) po certyfikacie albo 2. roku. **Miasta 2 (0.19.2):** w rejestrze tylko szkielet reguły (`city2: { requires: 'version-0.19.2' }`), bez ekranu. Zablokowana zakładka jest widoczna z kłódką i warunkiem (wariant „zablokowane” stanu pustego z makiety 22, z postępem „Aktywa 32 400 / 50 000 PLN”). Stare zapisy i piaskownica: wszystko odblokowane. Ustawienie „Pokaż wszystko od startu”.
- **Pliki:** `unlocks.js` (nowy, bez DOM), `ui.js` (pasek boczny, przyciski), `learning.js` (certyfikaty jako warunek), `index.html`, `main.js` (zapis odblokowań).
- **Test:** nowa gra: zakładki z warunkiem pokazują kłódkę i warunek; spełnienie warunku odblokowuje i wysyła wiadomość; stary zapis ma wszystko odblokowane; przebiegi bez UI ignorują blokady (boty bez zmian).

### E2. System zadań (makiety 22 i 24, zaakceptowane 2026-11-14)

Dopisek użytkownika: makieta 22 pokazuje wygląd okna zadań w ogóle; zadania mieszkają standardowo w TeamedUP!, a gracz może je przypiąć do panelu; więcej zadań tematycznych (bessa, hossa) i zadań na wzrost wartości, które uczą mechanik. Wygląd i zasady według `design/24_zadania.md`.

**Gdzie są zadania.** TeamedUP! → „Zadania i oceny” to pełna lista (zastępuje `renderTeamedTasks`; targety okresu z `getPlayerTargets`, `ai.js:2723`, wchodzą jako kategoria „Od zarządu”, oceny zarządu zostają pod listą). Filtr kategorii i licznik przypiętych nad listą. Panel funduszu → karta „Zadania” pokazuje **najwyżej 3 przypięte** (wygląd z makiety 22). Na starcie gra sama przypina 3 pierwsze zadania z Pierwszych kroków i dopina kolejne w wolne miejsce; inne kategorie przypina tylko gracz.

**Rejestr `TASKS`** (`tasks.js`, bez DOM). Każde zadanie ma:

| Pole | Znaczenie | Przykład |
|---|---|---|
| `id`, `cat` | identyfikator i kategoria: `start` (Pierwsze kroki), `board` (Od zarządu), `market` (Rynek), `mech` (Mechaniki) | `mech.deposit13` |
| `title`, `teach`, `go` | tytuł, „Uczy: …” (mechanika i kurs Akademii), przycisk przejścia | „Otwórz Bank” |
| `source` | kto daje zadanie: system, szef, firma informacyjna, Akademia | `academy` |
| `when(state)` | warunek pojawienia się (jawny fakt, posiadanie czegoś, odblokowanie z E1) | GIG ≥ 20% poniżej szczytu |
| `check(state)` | postęp i wykonanie, z danych gry | 2 000 / 5 000 PLN |
| `reward` | PLN na konto prywatne albo punkty oceny zarządu; nic do aktywów funduszu | `{ pln: 150 }` |
| `expires` | „bez terminu”, data gry albo fakt (np. odbicie GIG o 10%) | `{ until: 'gigRebound10' }` |
| `academy` | hasło lub kurs Akademii, z którym zadanie jest powiązane | `lokaty` |

**Kategorie i pule (pierwsza pula do akceptacji użytkownika przed wdrożeniem):**
- **Pierwsze kroki:** 4 zadania z makiety 22, po 50 PLN. Znikają po wykonaniu wszystkich.
- **Od zarządu:** dzisiejsze targety okresu i cele zarządu (punkty oceny i premia jak dziś).
- **Rynek** (zadania „fazowe”, 100–150 PLN): uruchamiane przez **jawne fakty**, nie wewnętrzną fazę (faza jest ukryta do L4, makieta 23): spadek GIG ≥ 20% od szczytu („Kup tanio w spadkach”, do odbicia GIG o 10%), 18 miesięcy wzrostów („Zabezpiecz zyski: ≥ 15% w gotówce lub obligacjach”), krach, bezpiecznik. Tekst opisuje fakt („GIG jest 22% poniżej szczytu”), bez nazwy fazy. Wygasają, gdy fakt minie.
- **Mechaniki** (zadania wzrostu wartości, 50–300 PLN): pojawiają się, gdy gracz ma to, czego zadanie uczy (np. ≥ 20% spółki → „Podnieś wartość spółki o 10%: WZA, dywidendy”; pierwsza lokata na 13 tygodni; dywersyfikacja; obligacje po E1; kampania i klienci; Tied; IPO; łańcuchy; surowce). Każde jest powiązane z kursem w Akademii.
- **Limity aktywnych:** najwyżej 2 „Rynek” i 3 „Mechaniki” naraz; losowanie bez powtórzeń ostatnich 6 `id` w kategorii.

**Cykl zadania:** wykonane daje nagrodę od razu, zostaje 1 kwartał na liście jako wykonane, potem trafia do historii; z panelu znika (zwalnia miejsce). Wygasłe znika bez kary.

**Zapis** `playerProfile.tasks = { active: [{ id, since, progress }], pinned: [id…], done: [{ id, q }], recent: { cat: [id…] }, collapsed }` (makieta 24). Zastępuje `firstSteps` z makiety 22. Stare zapisy: Pierwsze kroki pominięte.

- **Sprawdzanie:** po transakcji, przy otwarciu okna i raz na tydzień gry dla „Rynek” (bez pętli co tick). Nagroda przez tę samą funkcję co inne wpływy na konto prywatne, z wpisem w historii konta.
- **Pliki:** `tasks.js` (nowy, rejestr i logika bez DOM), `ai.js` (`renderTeamedTasks` → lista, „Od zarządu” z `getPlayerTargets`), `ui.js` (karta przypiętych), `learning.js` (powiązanie z kursami), `player.js` (premia), `main.js`, `style.css`. Telefon: TeamedUP! w ramie z makiety 19, panel przypiętych w szufladzie funduszu (makieta 18).
- **Test:** nagroda raz na zadanie (także po wczytaniu); czwarte przypięcie wyłączone z opisem „Przypięte 3 z 3…”; zadanie „Rynek” wygasa po odbiciu GIG; żaden tekst zadania nie zawiera nazwy fazy; stary zapis bez Pierwszych kroków; limity 2 i 3 aktywnych.
- **Bramka (w E4):** suma nagród z zadań ≤ 1 500 PLN na 6,5 roku (preset `gracz-aktywny`), GIG i marże bez zmian.

### E3. Wskazówki o fazie rynku (makieta 23 §4)

- **Zakres:** dla graczy bez L4 (i z L4 jako treść świata): wpisy analityków na Tied i maile firm informacyjnych w Poczta → Subskrypcje („Barometr Rynku: 3 z 5 wskaźników jak przed szczytem”). Opisują objawy, nie nazwę fazy. Dane z gry: wyceny, napływy, debiuty, obroty. Wiarygodność autora (3 kreski + słowo), szum jak w `macro.expectation`, opóźnienie względem prawdziwej fazy. Generowane przy zmianie `regime.phase` i losowo raz na kilka tygodni.
- **Pliki:** `tied.js`, `internet.js` (subskrypcje), `core.js` (odczyt fazy i wskaźników).
- **Test:** wskazówka nie zawiera nazwy fazy; przy zmianie fazy pojawia się najwyżej jedna wskazówka na kanał; wiarygodność rośnie z poziomem subskrypcji.

### E4. Kontrola 0.18.7

Seria 24 × 6,5 roku z gracza-aktywnego (blokady włączone w UI), testy, zrzuty kłódki, karty przypiętych zadań, listy zadań w TeamedUP! i wskazówek; suma nagród z zadań ≤ 1 500 PLN; raport `raporty/kontrola_0.18.7.md`.

---

## 0.18.8 Długa gra (Etap 3; przed celem gry)

**Decyzja 2026-11-13:** 50 i 100 lat to odcinki długofalowe. **Nie mierzymy, czy utrzymują gracza**, i nie ma bramki balansu dla 50–100 lat. Rozbudowujemy grę tak, żeby w późniejszych etapach był content. Mierzymy tylko technikę: brak błędów, pamięć i zapis w grze 50-letniej (przebieg dymny, nie seria balansu).

### D0. Diagnoza skali

- **Zakres:** (1) Pamięć: przebieg 50 lat bez UI z odczytem rozmiaru struktur co 5 lat (historie spółek, dzienniki, CV, poczta, wiadomości, okresy, łańcuchy); lista tablic bez limitu. (2) Kapitał gracza a płynność: jak rosną aktywa funduszu (preset `gracz-aktywny` i `fundusz-gig`) wobec kapitalizacji GIG i obrotu; od kiedy zlecenie funduszu przekracza dzienny obrót spółek, czy jest wpływ zlecenia na cenę i czy pułap napływu (`getFundCapacityFactor`) to hamuje.
- **Pliki:** `tests/przebiegi.html` (sonda `PROBE_LONG`), `design/narzedzia/dluga_gra.mjs` (nowy), raport `raporty/diagnoza_dluga_gra.md`.
- **Weryfikacja:** raport z wykresem rozmiaru zapisu i pamięci w czasie oraz z listą rozwiązań do decyzji użytkownika.

### D1. Limity historii i pamięci

- **Zakres:** limit dla każdej rosnącej tablicy z D0, według jednej zasady: szczegół za ostatnie N kwartałów, a starsze lata zagregowane do jednej liczby na rok (np. CV: ostatnie 40 wpisów + liczniki według typu i podsumowania dekad z D6). Poczta i wiadomości: limit liczby. Świece bez zmian (mają limit).
- **Pliki:** `player.js` (CV, okresy), `listings.js`, `ma.js` (dzienniki), `ui.js` (wiadomości), `main.js` (zapis, przycinanie przy wczytaniu).
- **Test:** przebieg dymny 50 lat: zapis po 50 latach ≤ 1,5 × zapisu po 20 latach, 0 błędów; stary zapis z długim CV wczytuje się i zostaje przycięty.

### D2. Skala kapitału gracza

- **Zakres:** według diagnozy D0, np. wpływ dużego zlecenia na cenę (poślizg rosnący z udziałem w obrocie), limit udziału funduszu w obrocie dnia albo rozbicie zlecenia na kilka dni, pułap napływu zależny od kapitalizacji rynku. Konkretne mechanizmy wybiera użytkownik po D0.
- **Pliki:** `player.js`, `core.js` (handel), `ui.js` (informacja o poślizgu w formularzu).
- **Test:** zlecenie 10% obrotu spółki ma poślizg zgodny z tabelą; przebieg 6,5 roku: GIG i marże ±0,5 pp (krótka gra nie może się zmienić).

### D4. Automatyzacja portfela (odblokowywana w Akademii)

- **Zakres:** trzy ulepszenia w zakładce Akademia, każde po certyfikacie, ze wspólnym oknem „Automaty” (przegląd, włącz/wyłącz, dziennik ostatnich 20 akcji):
  1. **Auto-rolowanie lokat terminowych:** po zapadnięciu lokata odnawia się na ten sam okres w banku z najwyższą stopą, który przyjmuje depozyty funduszu (`canBankTakeFundDeposits`); próg minimalnej stopy.
  2. **Auto-udział w aukcjach bonów skarbowych:** oferta składana przy każdej aukcji (`resolveTBillAuction`) do ustalonego limitu gotówki (kwota albo % gotówki funduszu) i z min. rentownością.
  3. **Alert koncentracji sektora (decyzja 2026-11-14: tylko alert):** wiadomość, gdy jeden sektor przekracza ustawiony limit akcji funduszu (domyślnie 35%), z odnośnikiem do pozycji. Bez automatycznej sprzedaży.
- Automaty 1–2 działają jak zlecenia gracza (te same opłaty i ograniczenia), więc nie dają przewagi poza oszczędnością klików.
- **Pliki:** `automation.js` (nowy, logika bez DOM), `finance.js` (lokaty), `core.js` (`resolveTBillAuction`), `player.js` (zlecenia, udziały sektorów), `learning.js` (certyfikaty), `ui.js` (okno), `main.js` (zapis ustawień).
- **Test:** lokata zapada → nowa w najlepszym banku; alert przy przekroczeniu limitu sektora raz (nie co tick) i ponownie dopiero po zejściu poniżej; oferta aukcyjna nie przekracza limitu gotówki; preset `automaty` w przebiegach: 20 lat bez błędów i niezmienników.

### D5. Czarne łabędzie

- **U2 jest w 0.18.6 (O4)**, tu zostają tylko łabędzie.
- **Czarny łabędź:** rzadkie zdarzenie **ponad liniami i poza ich wspólnym budżetem**, 1 na 15–25 lat (losowy odstęp, pierwszy najwcześniej po 10. roku, więc w grze 6,5-letniej nie wystąpi). Kilka typów: pandemia globalna, wojna regionalna, upadek waluty, rewolucja technologiczna (pozytywny łabędź), krach systemu bankowego. Każdy uruchamia 1–2 linie z `crises.js` jednocześnie w kilku krajach i tymczasowo zmienia: **stopy procentowe** (bank centralny), **zaufanie klientów** funduszy (odpływ lub napływ), **wybrane sektory** (premia lub kara), a w łańcuchach popyt na klasę dóbr i ma wpis w historii świata. Baner kryzysu (0.18.1 P4) w wariancie „Czarny łabędź”.
- **Pliki:** `crises.js` (stałe spokoju, rejestr `BLACK_SWANS`, harmonogram), `chains.js` (szoki popytu), `countries.js` (wiele krajów), `ui.js` (baner), `tests/przebiegi.html` (preset `labedz`).
- **Test:** wymuszony łabędź uruchamia swoje linie i wraca do normy; przebieg dymny 50 lat: 2–3 łabędzie, 0 błędów; gra 6,5-letnia: 0 łabędzi.

### D6. Podsumowania dekad i historia świata

- **Zakres:** co 10 lat gry raport dekady: GIG i inflacja za dekadę, najlepsze i najgorsze sektory, kryzysy i łabędzie, rządy i ustawy, wynik funduszu wobec GIG, kamienie milowe gracza. Raport przychodzi jako **wiadomość TeamedUP! od „Kronika Rynku”** (firma informacyjna, makieta 23 §3; decyzja użytkownika: bez nowego okna), a pełna wersja trafia do nowej zakładki „Historia” w oknie Ranking (lista dekad). Komórka „Wkład w Miasto” dochodzi w 0.19.2. Zapis dekady jest zagregowany (kilkadziesiąt liczb), więc zastępuje szczegółową historię z D1.
- **Pliki:** `history.js` (nowy, bez DOM: zbieranie i agregacja), `ui.js` (zakładka), `tied.js` (`getTeamedMessages`, nadawca typu `info`), `player.js` (CV), `main.js`.
- **Test:** po 10 latach powstaje raport z kompletem pól; po 30 latach 3 raporty; zapis rośnie o ≤ 2 KB na dekadę.

### D7. Kontrola

Testy, seria 24 × 6,5 roku i 10 × 20 lat (GIG ±0,5 pp i w 10–13% dla 20 lat, marże ±0,5 pp), przebieg dymny 50 lat (tylko technika), raport `raporty/kontrola_dluga_gra.md`.

---

## Lista ekranów dla designu

| # | Wersja | Ekran | Co pokazuje | Dane |
|---|---|---|---|---|
| 1 | 0.18.6 | **Stan pusty** (komponent) — makieta 22 §2 | 4 warianty: brak danych, przed pierwszą sesją, zablokowane, w tabeli | `renderEmptyState` |
| 2 | 0.18.6 | **Ustawienia → Debug** | ten sam zestaw narzędzi co dziś, ale w klasach CSS zamiast stylów inline | `debug.js` |
| 8 | 0.18.6 | **Zapis funduszu na IPO** (karta debiutu) | okres subskrypcji, cena emisyjna, pole liczby akcji lub kwoty, zablokowana gotówka, stan po przydziale (redukcja, zwrot), wycofana emisja | `listings.js`, `player.js` |
| 9 | 0.18.6 | **Presja ekologiczna** (Państwo → Środowisko) | wskaźnik 0–100 słowem i liczbą, źródła (zanieczyszczenie, smog, protesty), skutki: budżet UEiE, poparcie Zielonych, strajki ekologiczne | `energy.js` (`society.energy`) |
| 10 | 0.18.6 | **Bank, Firma, Internet w ramie `.wn`** | trzy okna w ramie z makiety 19; pasek telefonu w 1 wierszu, szersza kolumna nazwy (makieta 18) | `ui.js`, `internet.js` |
| 11 | 0.18.6 | **Pola z etykietą** — makieta 22 §3 | widoczne etykiety pól wyboru, chipy branż jako `fieldset` | `index.html` |
| 12 | 0.18.6 | **Akcent fazy i bezpiecznik** — makieta 23 §1–2 | chip fazy (od L4), krawędź rynku; baner bezpiecznika z licznikiem | `regime.shownPhase`, `updateCircuitBreakerUI` |
| 13 | 0.18.7 | **Karta przypiętych zadań** — makiety 22 i 24 (zaakceptowane) | do 3 przypiętych: kategoria, postęp, nagroda, termin, odepnij | `playerProfile.tasks.pinned` |
| 15 | 0.18.7 | **TeamedUP! → Zadania i oceny** — makieta 24 (zaakceptowana) | 4 kategorie, filtr, licznik przypiętych 3, karta zadania (Uczy, postęp, nagroda, termin, Przypnij) | `tasks.js`, `getPlayerTargets` |
| 16 | 0.18.7 | **Podpowiedź poziomu giełdy** (do zaprojektowania po E0) | po najechaniu na nazwę poziomu: wymagana ocena + jedno zdanie bez liczb; płytka giełdy bez progów kursu | `exchanges`, ocena z 0.18.4 |
| 14 | 0.18.7 | **Wskazówki o fazie** — makieta 23 §4 | wpis Tied i mail subskrypcji z wiarygodnością | `regime`, subskrypcje |
| 3 | 0.18.7 | **Zakładka zablokowana** | kłódka w pasku bocznym, w środku warunek i postęp („Aktywa 32 / 50 tys. PLN”, „Certyfikat: Obligacje”) | `unlocks.js` |
| 4 | 0.18.8 | **Okno „Automaty”** (do zaprojektowania) | auto-rolowanie, auto-udział w aukcjach bonów, alert koncentracji: stan, parametry, ostatnie akcje, warunek odblokowania | `automation.js` |
| 5 | 0.18.8 | **Baner „Czarny łabędź”** | wariant banera kryzysu: typ, kraje, linie, czas trwania | `crises.js` (`BLACK_SWANS`) |
| 6 | 0.18.8 | **Raport dekady** — makieta 23 §3 (TeamedUP!) + Ranking → Historia (do zaprojektowania) | GIG, inflacja, sektory, kryzysy, rządy, fundusz wobec GIG, kamienie milowe; lista dekad | `history.js` |
| 7 | 0.18.8 | **Poślizg w formularzu zlecenia** (jeśli D2 go wybierze) | szacowany poślizg i udział w obrocie dnia | `player.js` |

## Odłożone

- **Debug tylko na localhost albo z `?debug=1`** (lista użytkownika 2026-11-14; decyzja 2026-11-13 i 2026-11-14: na razie przycisk zostaje w Ustawieniach). Po O1 wystarczy warunek ładowania `debug.js` (localhost albo parametr) i zmiana w testach.
- Mierzenie, czy gra 50–100 lat utrzymuje gracza: nie teraz.
- Miasta jako obiekty: 0.19.2 (używają rejestru odblokowań z E1).
- Automatyczny rebalancing (klasy aktywów lub koncentracja): decyzja 2026-11-14, tylko alert.

## Co nie zostało sprawdzone

Liczby wstawek formatowania pochodzą z `grep`, bez klasyfikacji (część `toFixed` to obliczenia). Nie uruchamiałem gry 50-letniej, więc wycieki pamięci to hipoteza do D0. Progi odblokowań i parametry automatów to propozycja.

## Polecenie dla czatu kodu

```
Implementujesz plan plany/plan_0.18.6_porzadki_dluga_gra.md w Capital Quest,
w kolejności: 0.18.6 Porządki (Etap 1) → 0.18.7 Progresja i onboarding
(Etap 2) → 0.18.8 Długa gra (Etap 3). Cel gry dopiero potem.
Zacznij po scaleniu kontroli końcowej 0.18 (czat „Realizacja 0.18”).
Makiety 22 i 23 są zaakceptowane (2026-11-14); wdrażaj je według notek
plany/design/22_pierwsze_kroki.md i plany/design/23_fazy_dekada.md
(części O2 warianty, O8, E1 kłódka, E2, E3, D6).

Zasady: po polsku; część po części, commit po każdej, tylko swoje pliki;
testy (design/narzedzia/run_tests.mjs) i przebiegi ×200 przed commitem;
0 błędów JS i niezmienników; UI: ciemny motyw, ikony SVG, PLN, „udział”,
„konto prywatne”, kolor nie jest jedynym nośnikiem, bez nowych okien
modalnych; plików w plany/design nie edytujesz; decyzje przez
AskUserQuestion z rekomendacją. Cel GIG 20 lat: 10–13%.

0.18.6 Porządki (bramka: GIG 20 lat 10–13%, marże ±0,3 pp, zapis bez wzrostu):
O0 spis: debug, puste kontenery, formatowanie poza helperami (z klasyfikacją
   tekst / log / obliczenie); raporty/spis_0.18.6.md i
   design/narzedzia/spis_formatow.mjs. Spis pokaż mi przed O1.
O1 debug.js: cały kod debug z ui.js, core.js i index.html (#debug-tools)
   w jednym module, ładowanym zawsze; przycisk w Ustawieniach zostaje
   (decyzja 2026-11-14; ?debug=1 / localhost później); isDebugMode zostaje.
O2 renderEmptyState w 4 wariantach z makiety 22; najpierw portfel, pozycje,
   aukcje, poczta; test DOM świeżej gry przed pierwszym tickiem.
O3 formatters.js (czysty, ładowany pierwszy): obecne helpery + formatInt,
   formatShares, formatPp, formatDateLong; NAV/udział 4 miejsca, kwoty 2,
   akcje 0; wymiana wstawek ze spisu plik po pliku; 0 „zł” w kodzie UI.
O4 U2: spokój 12 → 10 kw., łagodniejszy wymóg fazy; seria 20 × 20 lat,
   cel 1–2 linie (inaczej pytanie do mnie).
O5 U7: presja ekologiczna → częstsze protesty, strajki ekologiczne, UEiE
   15 → 30% (40% z Zielonymi), Zieloni od 50; bramka: zanieczyszczenie
   po 20 latach 55–65, „brudne” gry ≤ 10%.
O6 U6: Bank, Firma, Internet w ramie .wn (makieta 19), poprawki makiety 18.
O7 U5: zapis funduszu gracza na IPO z redukcją, blokadą i zwrotem gotówki.
O8 makiety 22 §3 i 23 §1–2: pola z etykietą, akcent fazy (tylko L4),
   bezpiecznik bez emoji; usuń ukryty .topbar-kpi z kontem prywatnym.
O9 kontrola raporty/kontrola_0.18.6.md.

0.18.7 Progresja i onboarding (bramka: GIG i marże ±0,3 pp):
E1 unlocks.js: progi (aktywa, stanowisko, certyfikat, rok) dla aukcji
   bonów, obligacji korporacyjnych, aukcji akcji zastawnych, Budownictwa,
   Łańcuchów i okna Miasto; dla Miast 2 tylko szkielet reguły; kłódka
   z warunkiem i postępem (wariant „zablokowane”); stare zapisy odblokowane.
   Progi pokaż mi przed wdrożeniem.
E0 poziomy giełd bez kursu: NIE ZACZYNAJ, dopóki użytkownik nie dopisze
   kryteriów w planie. Zdecydowane już: płytka bez progów kursu, podpowiedź
   „Dostęp od oceny X” + jedno zdanie bez liczb.
E2 tasks.js według makiety 24: TeamedUP! → Zadania i oceny (kategorie
   Pierwsze kroki, Od zarządu, Rynek, Mechaniki), przypinanie do 3 na karcie
   panelu funduszu; zadania Rynek z jawnych faktów (bez nazwy fazy, max 2),
   Mechaniki uczące z kursem Akademii (max 3); zapis playerProfile.tasks;
   pulę zadań pokaż mi przed wdrożeniem; nagrody ≤ 1 500 PLN / 6,5 roku.
E3 wskazówki o fazie (makieta 23 §4): Tied i subskrypcje, bez nazwy fazy,
   z wiarygodnością i opóźnieniem.
E4 kontrola raporty/kontrola_0.18.7.md.

0.18.8 Długa gra (bez bramki balansu dla 50–100 lat; technika tak):
D0 diagnoza: pamięć i zapis co 5 lat w przebiegu 50 lat, kapitał funduszu
   wobec obrotu; raport i propozycje do mojej decyzji.
D1 limity rosnących tablic (szczegół N kw. + agregaty roczne); 50 lat:
   zapis ≤ 1,5 × zapisu po 20 latach.
D2 skala kapitału według decyzji po D0; krótka gra ±0,5 pp.
D4 automation.js w Akademii: auto-rolowanie lokat, auto-udział w aukcjach
   bonów do limitu gotówki, alert koncentracji sektora (tylko alert).
D5 czarne łabędzie: 1 na 15–25 lat, od 10. roku, poza budżetem linii,
   kilka krajów; skutki: stopy, zaufanie klientów, sektory; baner.
D6 history.js: dekada jako wiadomość TeamedUP! od „Kronika Rynku”
   (makieta 23 §3) + Ranking → Historia.
D7 kontrola raporty/kontrola_dluga_gra.md (+ przebieg dymny 50 lat).

Po każdej części: commit, testy, wynik bramki, co nie zostało sprawdzone.
```
