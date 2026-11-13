# Plan 0.18.6 „Porządki” i wersja „Długa gra” (2026-11-13)

Zgłoszenie użytkownika z 2026-11-13 (5 celów: debug, stany puste, formaty, pamięć i skala, długa gra). Stan wyjściowy: `zmiany-AI` po 0.18.5 (64f17cd). Kontrola końcowa 0.18 trwa w czacie „Realizacja 0.18”, więc ten plan nie rusza przed jej scaleniem. Liczby są startowe.

**Podział (decyzja 2026-11-13):**

| Wersja | Zakres | Kiedy |
|---|---|---|
| **0.18.6 Porządki** | wydzielenie debug do `debug.js`, stany puste, jedno formatowanie liczb, kwot i dat; z decyzji U1–U8: kryzysy (U2), presja ekologiczna (U7), ramy okien (U6), zapisy gracza na IPO (U5) | zaraz po scaleniu 0.18 |
| **Długa gra** | limity historii i pamięci, skala kapitału gracza wobec rynku, stopniowe odblokowywanie, automatyzacja portfela, czarne łabędzie, podsumowania dekad | po wersji „Cel gry”, przed 0.19.1; numer nadamy razem z celem gry |

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

O0–O3 i O6 bez zmiany balansu (GIG i marże ±0,3 pp, szum). O4, O5 i O7 zmieniają balans, więc mają własne bramki. **Cel GIG 20 lat: 10–13%** (U1, 2026-11-13). Bramka całej wersji: 0 błędów, testy zielone, zapis bez wzrostu, GIG 20 lat w 10–13%, marże 0 ± 0,3 pp.

### O0. Spis

- **Zakres:** dokładna lista do O1–O3: elementy debug w `index.html` i JS; kontenery, które przed pierwszym tickiem albo bez danych renderują się puste (tabele, okna, listy); wszystkie miejsca formatowania liczb poza helperami (`toFixed`, `toLocaleString`, stałe „PLN”/„zł”, kropka dziesiętna). Każde miejsce oznaczamy: tekst dla gracza, log konsoli albo obliczenie (np. zaokrąglenie przez `toFixed`, którego nie ruszamy).
- **Pliki:** `raporty/spis_0.18.6.md` (nowy), skrypt `design/narzedzia/spis_formatow.mjs` (nowy, grep z klasyfikacją).
- **Weryfikacja:** spis do akceptacji użytkownika.

### O1. Wydzielenie debug do `debug.js`

- **Decyzja 2026-11-13:** przycisk „Tryb debug” **zostaje na razie w Ustawieniach**. Docelowo debug ma działać tylko na localhost (zapis w „Odłożone”).
- **Zakres:** cały kod debug przenosimy do `debug.js`: funkcje `debug*` z `ui.js` i `core.js`, `applyDebugModeUi`, `toggleDebugMode`, sondy pomocnicze i blok `#debug-tools`. Blok jest budowany przez `debug.js` (wstawiany do okna Ustawień), a nie zapisany w `index.html`. W `index.html` zostaje tylko pusty kontener i przycisk. `isDebugMode()` zostaje w `ui.js`, bo czyta ją kod gry (energia, intro, A1). `debugCheckInvariants` przenosimy do `debug.js`, ładowanego zawsze, więc testy i przebiegi działają bez zmian. Style inline z bloku debug przechodzą do klas w `style.css`.
- **Pliki:** `debug.js` (nowy), `index.html` (−ok. 100 linii, `<script src="debug.js">`), `ui.js`, `core.js`, `style.css`, `tests/tests.html`, `tests/przebiegi.html` (kolejność skryptów).
- **Test:** po włączeniu trybu debug panel ma te same przyciski co dziś; po wyłączeniu w DOM nie ma ani jednego elementu `#debug-tools`; `grep "function debug" ui.js core.js` daje 0; testy i przebiegi bez zmian.

### O2. Stany puste

- **Zakres:** jeden komponent `renderEmptyState({ icon, title, text, action })` w stylu makiety 18 (ikona SVG, jedno zdanie, opcjonalny przycisk). Stosujemy go w kontenerach ze spisu O0, najpierw w tych, które gracz widzi w pierwszych minutach (portfel, pozycje, poczta, Tied, klienci, kontrakty, łańcuchy przed pierwszym kwartałem). Do tego jeden stan „ładowanie przed pierwszym tickiem” dla tabel rynku. Teksty według `design/04_teksty.md`.
- **Pliki:** `ui.js` (komponent), moduły UI ze spisu (`ui.js`, `energy_ui.js`, `chains_ui.js`, `countries_ui.js`, `currency_ui.js`, `internet.js`, `tied.js`, `learning.js`), `style.css`.
- **Test:** świeża gra przed pierwszym tickiem: żaden kontener ze spisu nie jest pusty (test DOM po kolei otwiera okna); stary zapis bez danych łańcuchów pokazuje stan pusty.
- **Design:** ekran 1 z listy niżej.

### O3. Jedno formatowanie

- **Zakres:** helpery formatowania przechodzą z `ui.js` do nowego `formatters.js`. To czysty moduł bez DOM, ładowany pierwszy, a nazwy funkcji zostają (`formatNumberPl`, `formatZl`, `formatPLNShort`, `formatPct`, `formatNav`, `formatGameDate`, `formatQuarterDate`). Dochodzą: `formatInt` (liczba akcji, bez groszy), `formatShares` („1 250 akcji”), `formatPp` (punkty procentowe), `formatDateLong`. Waluta zawsze z `getBaseCurrency()` (dziś PLN), nigdy „zł” na sztywno. Udziały funduszu (NAV) mają 4 miejsca. Potem wymiana wstawek ze spisu O0, plik po pliku, tylko w tekstach dla gracza. Logi konsoli i obliczenia zostają.
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

### O8. Kontrola 0.18.6

Seria 24 × 6,5 roku, seria 20 × 20 lat (O4, O5) i testy, raport `raporty/kontrola_0.18.6.md`. Zrzuty Ustawień (z debug i bez), stanów pustych, okien w ramie `.wn`, formularza zapisu na IPO i wskaźnika presji.

---

## Długa gra (po celu gry, przed 0.19.1)

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

### D3. Stopniowe odblokowywanie zakładek

- **Zakres:** rejestr `UNLOCKS` (zakładka lub funkcja → warunek: aktywa funduszu, stanowisko, certyfikat Akademii, rok gry). Proponowane progi startowe: Bank od startu (lokaty), obligacje i aukcje bonów po certyfikacie „Obligacje” albo aktywach ≥ 50 tys., aukcje zastawów po stanowisku Zarządca funduszu, Budownictwo i Państwo → Łańcuchy po 1. roku, okno **Miasto** (dziś inwestycje miejskie) po certyfikacie albo 2. roku. **Miasta 2 z 0.19.2 korzystają z tego samego rejestru.** Zablokowana zakładka jest widoczna z kłódką i warunkiem („Odblokujesz po…”), bez ukrywania. Stare zapisy i piaskownica: wszystko odblokowane. Ustawienie „Pokaż wszystko od startu”.
- **Pliki:** `unlocks.js` (nowy, bez DOM), `ui.js` (pasek boczny, przyciski), `learning.js` (certyfikaty jako warunek), `index.html`, `main.js` (zapis odblokowań).
- **Test:** nowa gra: zakładki z warunkiem pokazują kłódkę i warunek; spełnienie warunku odblokowuje i wysyła wiadomość; wczytany stary zapis ma wszystko odblokowane; przebiegi bez UI ignorują blokady (boty bez zmian).

### D4. Automatyzacja portfela (odblokowywana w Akademii)

- **Zakres:** trzy automaty, każdy po certyfikacie Akademii, ze wspólnym oknem „Automaty” (przegląd, włącz/wyłącz, dziennik ostatnich 20 akcji):
  1. **Auto-rolowanie lokat:** po zapadnięciu lokata odnawia się na ten sam okres w banku z najwyższą stopą, który przyjmuje depozyty funduszu (`canBankTakeFundDeposits`); próg minimalnej stopy.
  2. **Rebalancing:** docelowe udziały klas aktywów (akcje, obligacje, gotówka, towary) i tolerancja; raz na kwartał zlecenia do celu, z kosztami prowizji; respektuje lock-up i limity KNF.
  3. **Limity aukcyjne:** stała oferta w aukcjach bonów skarbowych i zastawów (kwota, maks. cena lub min. rentowność); składana automatycznie przy każdej aukcji.
- Automaty działają jak zlecenia gracza (te same opłaty i ograniczenia), więc nie dają przewagi poza oszczędnością klików.
- **Pliki:** `automation.js` (nowy, logika bez DOM), `finance.js` (lokaty), `core.js` (`resolveTBillAuction`), `companies.js` (`resolveCollateralAuction`), `player.js` (zlecenia), `learning.js` (certyfikaty), `ui.js` (okno), `main.js` (zapis ustawień).
- **Test:** lokata zapada → nowa w najlepszym banku; rebalancing przy odchyleniu > tolerancji, nie przy mniejszym; oferta aukcyjna złożona z limitem i odrzucona ponad limitem; preset `automaty` w przebiegach: 20 lat bez błędów i niezmienników.

### D5. Czarne łabędzie

- **U2 jest w 0.18.6 (O4)**, tu zostają tylko łabędzie.
- **Czarny łabędź:** rzadkie zdarzenie **ponad liniami i poza ich wspólnym budżetem**, 1 na 15–25 lat (losowy odstęp, pierwszy najwcześniej po 10. roku, więc w grze 6,5-letniej nie wystąpi). Kilka typów: pandemia globalna, wojna regionalna, upadek waluty, rewolucja technologiczna (pozytywny łabędź), krach systemu bankowego. Każdy uruchamia 1–2 linie z `crises.js` jednocześnie w kilku krajach, zmienia parametry na dłużej (np. stopa, popyt na klasę dóbr w łańcuchach, migracja) i ma wpis w historii świata. Baner kryzysu (0.18.1 P4) w wariancie „Czarny łabędź”.
- **Pliki:** `crises.js` (stałe spokoju, rejestr `BLACK_SWANS`, harmonogram), `chains.js` (szoki popytu), `countries.js` (wiele krajów), `ui.js` (baner), `tests/przebiegi.html` (preset `labedz`).
- **Test:** wymuszony łabędź uruchamia swoje linie i wraca do normy; przebieg dymny 50 lat: 2–3 łabędzie, 0 błędów; gra 6,5-letnia: 0 łabędzi.

### D6. Podsumowania dekad i historia świata

- **Zakres:** co 10 lat gry raport dekady: GIG i inflacja za dekadę, najlepsze i najgorsze sektory, kryzysy i łabędzie, rządy i ustawy, wynik funduszu wobec GIG, kamienie milowe gracza. Raport trafia do poczty i do nowej zakładki „Historia” w oknie Ranking (lista dekad). Zapis dekady jest zagregowany (kilkadziesiąt liczb), więc zastępuje szczegółową historię z D1.
- **Pliki:** `history.js` (nowy, bez DOM: zbieranie i agregacja), `ui.js` (zakładka), `player.js` (CV), `main.js`.
- **Test:** po 10 latach powstaje raport z kompletem pól; po 30 latach 3 raporty; zapis rośnie o ≤ 2 KB na dekadę.

### D7. Kontrola

Testy, seria 24 × 6,5 roku i 10 × 20 lat (GIG ±0,5 pp i w 10–13% dla 20 lat, marże ±0,5 pp), przebieg dymny 50 lat (tylko technika), raport `raporty/kontrola_dluga_gra.md`.

---

## Lista ekranów dla designu

| # | Wersja | Ekran | Co pokazuje | Dane |
|---|---|---|---|---|
| 1 | 0.18.6 | **Stan pusty** (komponent) | ikona, jedno zdanie, opcjonalny przycisk; warianty: brak danych, przed pierwszym tickiem, zablokowane | `renderEmptyState` |
| 2 | 0.18.6 | **Ustawienia → Debug** | ten sam zestaw narzędzi co dziś, ale w klasach CSS zamiast stylów inline | `debug.js` |
| 8 | 0.18.6 | **Zapis funduszu na IPO** (karta debiutu) | okres subskrypcji, cena emisyjna, pole liczby akcji lub kwoty, zablokowana gotówka, stan po przydziale (redukcja, zwrot), wycofana emisja | `listings.js`, `player.js` |
| 9 | 0.18.6 | **Presja ekologiczna** (Państwo → Środowisko) | wskaźnik 0–100 słowem i liczbą, źródła (zanieczyszczenie, smog, protesty), skutki: budżet UEiE, poparcie Zielonych, strajki ekologiczne | `energy.js` (`society.energy`) |
| 10 | 0.18.6 | **Bank, Firma, Internet w ramie `.wn`** | trzy okna w ramie z makiety 19; pasek telefonu w 1 wierszu, szersza kolumna nazwy (makieta 18) | `ui.js`, `internet.js` |
| 3 | Długa gra | **Zakładka zablokowana** | kłódka w pasku bocznym, w środku warunek i postęp („Aktywa 32 / 50 tys. PLN”, „Certyfikat: Obligacje”) | `unlocks.js` |
| 4 | Długa gra | **Okno „Automaty”** | trzy automaty: stan, parametry, ostatnie akcje, warunek odblokowania | `automation.js` |
| 5 | Długa gra | **Baner „Czarny łabędź”** | wariant banera kryzysu: typ, kraje, linie, czas trwania | `crises.js` (`BLACK_SWANS`) |
| 6 | Długa gra | **Raport dekady** (poczta i Ranking → Historia) | GIG, inflacja, sektory, kryzysy, rządy, fundusz wobec GIG, kamienie milowe; lista dekad | `history.js` |
| 7 | Długa gra | **Poślizg w formularzu zlecenia** (jeśli D2 go wybierze) | szacowany poślizg i udział w obrocie dnia | `player.js` |

## Odłożone

- **Debug tylko na localhost** (decyzja 2026-11-13: na razie zostaje w Ustawieniach). Po O1 wystarczy warunek ładowania `debug.js` (localhost albo parametr) i zmiana w testach.
- Mierzenie, czy gra 50–100 lat utrzymuje gracza: nie teraz.
- Miasta jako obiekty: 0.19.2 (używają rejestru odblokowań z D3).

## Co nie zostało sprawdzone

Liczby wstawek formatowania pochodzą z `grep`, bez klasyfikacji (część `toFixed` to obliczenia). Nie uruchamiałem gry 50-letniej, więc wycieki pamięci to hipoteza do D0. Progi odblokowań i parametry automatów to propozycja.

## Polecenie dla czatu kodu

```
Implementujesz plan plany/plan_0.18.6_porzadki_dluga_gra.md w Capital Quest.
Zacznij dopiero po scaleniu kontroli końcowej 0.18 (czat „Realizacja 0.18”).

Zasady: po polsku; część po części, commit po każdej, tylko swoje pliki;
testy (design/narzedzia/run_tests.mjs) i przebiegi ×200 przed commitem;
0 błędów JS i niezmienników; UI: ciemny motyw, ikony SVG, PLN, „udział”,
kolor nie jest jedynym nośnikiem, bez nowych okien modalnych; plików w
plany/design nie edytujesz; decyzje przez AskUserQuestion z rekomendacją.

0.18.6 Porządki (bramka: GIG 20 lat 10–13%, marże ±0,3 pp, zapis bez wzrostu):
O0 spis: debug, puste kontenery, formatowanie poza helperami (z klasyfikacją
   tekst / log / obliczenie); raporty/spis_0.18.6.md i
   design/narzedzia/spis_formatow.mjs. Spis pokaż mi przed O1.
O1 debug.js: cały kod debug z ui.js, core.js i index.html (#debug-tools)
   w jednym module, ładowanym zawsze; przycisk w Ustawieniach zostaje;
   isDebugMode zostaje w ui.js; testy i przebiegi bez zmian.
O2 renderEmptyState według makiety 18; najpierw okna z pierwszych minut;
   test DOM świeżej gry przed pierwszym tickiem.
O3 formatters.js (czysty, ładowany pierwszy) z obecnymi helperami +
   formatInt, formatShares, formatPp, formatDateLong; wymiana wstawek
   ze spisu plik po pliku (tylko teksty dla gracza); 0 „zł” w kodzie UI.
O4 U2: spokój 12 → 10 kw., łagodniejszy wymóg fazy; seria 20 × 20 lat,
   cel 1–2 linie (inaczej pytanie do mnie).
O5 U7: presja ekologiczna w society.energy (rośnie z zanieczyszczeniem,
   smogiem i protestami) → częstsze protesty, strajki ekologiczne, UEiE
   15 → 30% (40% z Zielonymi), silniejsi Zieloni (wejście od 50); bramka:
   zanieczyszczenie po 20 latach 55–65, „brudne” gry ≤ 10%.
O6 U6: Bank, Firma, Internet w ramie .wn (makieta 19), poprawki makiety 18.
O7 U5: zapis funduszu gracza na IPO z redukcją, blokadą i zwrotem gotówki.
O8 kontrola raporty/kontrola_0.18.6.md.

Długa gra (po wersji „Cel gry”; bez bramki balansu dla 50–100 lat):
D0 diagnoza: pamięć i zapis co 5 lat w przebiegu 50 lat, kapitał funduszu
   wobec obrotu; raport i propozycje do mojej decyzji.
D1 limity rosnących tablic (szczegół N kw. + agregaty roczne); 50 lat:
   zapis ≤ 1,5 × zapisu po 20 latach.
D2 skala kapitału według decyzji po D0; krótka gra ±0,5 pp.
D3 unlocks.js: rejestr odblokowań (aktywa, stanowisko, certyfikat, rok),
   kłódka z warunkiem, stare zapisy i piaskownica odblokowane.
D4 automation.js: auto-rolowanie lokat, rebalancing, limity aukcyjne;
   każdy po certyfikacie Akademii; te same opłaty co ręcznie.
D5 czarne łabędzie: 1 na 15–25 lat, od 10. roku,
   poza budżetem linii, kilka krajów, baner.
D6 history.js: raport dekady (poczta + Ranking → Historia).
D7 kontrola raporty/kontrola_dluga_gra.md (+ przebieg dymny 50 lat).

Po każdej części: commit, testy, wynik bramki, co nie zostało sprawdzone.
```
