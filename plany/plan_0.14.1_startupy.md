# Plan 0.14.1 „Poprawki z gry: startupy, portfel prywatny, widok spółek” (po 0.14 T3, przed T4)

Cel: pieniądze w inkubatorze nigdy nie znikają po cichu. Każda złotówka wpłacona do startupu, bezpośrednio albo przez pulę, kończy jako akcje po debiucie, zwrot albo **zgłoszona** strata. Gracz widzi, gdzie są jego pieniądze.

Zgłoszenia użytkownika (2026-10-14):
1. Wpłacił do puli, pieniądze zeszły z konta, a mimo długiego czasu nie dostał żadnych akcji (R0–R4).
2. Gracz dostaje za dużo prywatnych pieniędzy (R5).
3. Układ tabeli akcji jest nieczytelny: podtypy i specjalizacje spółek są słabo widoczne (R6).

Zakres (decyzja): **tylko naprawa błędów i widoczność**. Zasady działania puli (losowy wybór startupu, interwał) zostają. Dochodzi wypłata niezainwestowanej części z opłatą 2%.

Kolejność: R0 → R1 → R2 → R3 → R4 → R5 → R6. Każda część z testami, przebiegiem ×200 i commitem.

---

## Diagnoza (przegląd kodu, stan `zmiany-AI` po 0.14 T2)

| # | Błąd | Gdzie | Skutek |
|---|---|---|---|
| A | `removeStartup` rozlicza fundusz (`playerPortfolio`), boty, banki i fundusze botów, ale **pomija `startup.poolInvestors`** | `companies.js`, `removeStartup` | Każde zakończenie inne niż debiut zeruje wkład puli bez komunikatu: upadek, oszustwo, porażka po komplikacjach, opóźnienie z porażką. To samo dotyczy przejęcia startupu czekającego na miejsce na giełdzie: udziałowcy dostają 105–200% wkładu, a pula 0. |
| A′ | Startup gotowy do debiutu, a giełda pełna (sufit ~110 z 0.13.1) → `awaitingListing` → po 8 kw. przejęcie przez `removeStartup` | `processAwaitingListings` | Przy pełnej giełdzie (stan normalny od połowy gry) to **najbardziej prawdopodobna ścieżka** zgłoszonego przypadku: pula czeka 8 kw. i traci wszystko przez błąd A. |
| B | Pieniądze w puli (niezainwestowane i zainwestowane przez pulę) **nie wchodzą do NAV** | `player.js`, `getFundAssets` | Wpłata do puli od razu obniża NAV, wynik względem GIG i ocenę zarządu. Bezpośrednie wkłady w startupy są w NAV, przez `playerPortfolio`. |
| C | Pula inwestuje tylko w startupy w fazie `funding` i tylko od 1000 zł; brak wycofania | `processPoolInvestments` | Gdy nie ma startupów w zbiórce, pieniądze leżą bez końca i bez informacji. |
| D | Panel puli pokazuje tylko niezainwestowane wkłady; portfel pokazuje `playerStakes.player` jako „Wkład w pulę” | `displayInvestmentPool`, `ui.js` (portfel) | Nie widać, w które startupy pula weszła ani co się z nimi stało. |
| E | `investmentPool.playerStakes` nie maleje po upadku (wynika z A) | `removeStartup` | Zawyżony „Wkład w pulę” w portfelu; `getFundStartupExposure` liczy martwe pieniądze, więc limit 10% aktywów na startupy blokuje się na stałe. |

---

## R0. Audyt przepływów pieniędzy w inkubatorze (najpierw, bez zmian zachowania)

Przejść **wszystkie ścieżki** życia startupu i wpisać do raportu, czy każde źródło wkładu jest rozliczane:

- **Ścieżki:**
  - debiut;
  - debiut po oczekiwaniu na miejsce;
  - przejęcie po oczekiwaniu;
  - oszustwo;
  - porażka;
  - opóźnienie, potem sukces albo porażka;
  - komplikacje: ratunek albo upadek;
  - prywatyzacja (Anioł Biznesu poz. 5);
  - startup operatora rynku (D1);
  - ubezpieczenie.
- **Źródła wkładu:**
  - fundusz gracza (bezpośrednio);
  - pula (gracz i boty);
  - auto-inwestowanie w startup (`updateStartupAutoInvestTimers`, `acceptStartupOffer`);
  - boty;
  - fundusze kolegów (`botFundInvestInStartups`);
  - banki (`processBankStartupSponsorship`);
  - anioł biznesu (zdarzenie);
  - dopłata przed debiutem (`ipoPriceBonus`).
- **Narzędzie: niezmiennik inkubatora (test i `checkWorldInvariants()` jako ostrzeżenie):**
  - dla każdego startupu: `currentFunding` ≈ suma roszczeń + wpłaty bez roszczeń (anioł biznesu), z tolerancją;
  - dla puli: `wpłaty − wypłaty = niezainwestowane + w startupach + rozliczone (akcje po koszcie, zwroty, straty)`. Licznik rozliczeń jest prowadzony per uczestnik.
- **Wynik:** tabela ścieżka × źródło (✅ / ❌) w raporcie `plany/raporty/audyt_startupow_0.14.1.md`. Błędy z diagnozy (A–E) i nowo znalezione naprawiamy w R1–R4. Błąd spoza tej listy, który wymaga zmiany zasad, wraca do planowania.

## R1. Rozliczenie puli przy każdym końcu startupu (błędy A, A′, E)

- `removeStartup` rozlicza `poolInvestors` **tak samo jak bezpośrednich inwestorów** (ten sam `refundMin`–`refundMax`):
  - przejęcie po oczekiwaniu: uczestnicy puli dostają 105–200% swojego wkładu;
  - porażka i oszustwo: zwrot według ścieżki (0–70%);
  - ubezpieczenie funduszu nie obejmuje wkładu przez pulę, bo jest kupowane na konkretny startup.
- Zwrot idzie **do puli jako niezainwestowane środki uczestnika** (`contributors`), a nie od razu na konto. Pula zainwestuje je ponownie albo gracz je wycofa (R3). Dzięki temu pieniądze nie wracają w połowie operacji poza kontrolą limitu 10%.
- `investmentPool.playerStakes[id]` maleje o rozliczony wkład w każdej ścieżce: debiut (już działa), zwrot i strata.
- **Komunikat dla gracza** przy każdym rozliczeniu z jego udziałem: wpis w dzienniku i w kwartalnym raporcie inkubatora, bez nowego maila na każde zdarzenie:
  - „🏊 Pula: {startup} — debiut, Twój udział: X akcji”;
  - „🏊 Pula: {startup} upadł — Twoja strata Y zł”;
  - „🏊 Pula: {startup} przejęty — zwrot Z zł do puli”.
- **Migracja zapisu** (bez zmiany wersji, pola opcjonalne):
  - przy wczytaniu `playerStakes.player` przeliczamy z faktów: niezainwestowane + wkłady w żyjących startupach;
  - martwe kwoty po startupach, których już nie ma, schodzą do zera z jednorazowym wpisem „korekta wkładu w pulę”;
  - **pieniędzy nie oddajemy wstecz**, bo nie wiemy, jaką ścieżką startup zniknął (decyzja 4).

## R2. Pula w NAV funduszu (błąd B)

- `getFundAssets` dolicza:
  - **niezainwestowaną część puli należącą do gracza** (`contributors.player`), po wartości nominalnej;
  - **wkłady gracza przez pulę w żyjące startupy**, po koszcie, tak jak bezpośrednie wkłady (`investedAmount`) w `getHoldingMarketValue`.
- Test: wpłata do puli nie zmienia NAV (±0). Upadek startupu obniża NAV o stratę, a debiut zamienia koszt na wartość akcji.
- `getFundStartupExposure` liczy wkład przez pulę z faktów (jak wyżej), a nie z `playerStakes`.

## R3. Wypłata z puli i martwe pieniądze (błąd C)

- Przycisk **„Wycofaj z puli”**: gracz wycofuje dowolną część **niezainwestowanych** środków. Opłata 2% trafia do puli, czyli do pozostałych uczestników proporcjonalnie, a gdy ich nie ma, do zarządcy inkubatora. Pieniądze już zainwestowane w startupy zostają do ich końca.
- **Status puli** w panelu:
  - „Pula czeka: brak startupów w fazie zbiórki”;
  - „Za mało środków (min. 1000 zł)”;
  - „Następna inwestycja za X s”.
- Boty nadal mogą wpłacać; nie wycofują (bez zmian zasad).

## R4. Widoczność: panel puli i portfel (błąd D)

- **Panel puli:**
  - **Niezainwestowane:** łącznie i Twoje.
  - **W startupach:** lista: startup, etap, kwota puli, Twój udział w zł i %.
  - **Historia rozliczeń** (ostatnie 10): debiut z liczbą akcji, zwrot, strata.
- **Portfel funduszu:** dwa wiersze zamiast jednego: „Pula — niezainwestowane” i „Pula — w startupach”, z wartościami zgodnymi z NAV (R2).
- **Karta startupu:** w liście inwestorów pozycja „Pula Inwestycyjna (w tym Ty: X zł)”.

## R5. Portfel prywatny: mniej pieniędzy, więcej wyborów

**Cel (decyzja):** pieniądze prywatne są **rzadkie i służą do wyborów**. Na niższych stanowiskach starcza na część szkoleń, spotkań i analityków, więc gracz musi wybierać. Duże kwoty pojawiają się dopiero wyżej, głównie z premii za wynik.

**Źródła dziś** (wpływy do `player-wallet`):

| Źródło | Gdzie | Dziś |
|---|---|---|
| Cele korporacji | `settleCorporateGoals` | min(5% budżetu korporacji, **10 000 zł**) za każdy spełniony cel. Fundusz startuje z 10 000 zł, a portfel prywatny ze 100 zł. **Użytkownik wskazał to źródło jako za hojne.** |
| Premia za wynik | `computePerformanceBonus` | 20% × nadwyżka nad GIG × aktywa × mnożnik stanowiska (1,0–3,0) |
| Udział w opłacie | `chargeManagementFee` | 15–40% opłaty za zarządzanie, co tydzień |
| Nadzorowany fundusz | `processCorporationWeekly` | udział w opłacie nadzorowanego funduszu |
| Zdarzenie z nagrodą | `events.js` (ok. linii 898) | stałe 5000 zł |
| Mentor, quizy Akademii | `learning.js` | 150 zł / 60 zł |
| Handel prywatny, dywidendy | konto prywatne | uczciwy dochód z inwestycji (bez zmian) |

**Kroki:**
1. **Pomiar** (przed zmianami):
   - przebiegi z presetem gracza aktywnego: fundusz bije GIG o +2–3 pp i awansuje; plus preset „fundusz = GIG”;
   - zbieramy wpływy prywatne na rok według źródła i stanowiska, z dziennika płatności (`recordPayment` → `player-wallet`);
   - porównujemy je z kosztami wyborów dostępnych na stanowisku: szkolenia, spotkania, lunch z CEO, analitycy, stoisko na festynie.
2. **Cele korporacji (od razu, decyzja):** wypłata za spełniony cel = min(5% budżetu korporacji, **1% aktywów funduszu gracza × mnożnik stanowiska**, **3000 zł**). Przy funduszu 10 000 zł to ok. 100 zł; wyżej rośnie z funduszem i stanowiskiem. Główną nagrodą celu zostaje ocena zarządu (+5).
3. **Zdarzenie 5000 zł:** kwota skalowana do pozycji gracza, np. 2% aktywów funduszu (minimum 200 zł, maksimum 5000 zł).
4. **Pozostałe źródła** stroimy po pomiarze, żeby spełnić cele z tabeli „Jak sprawdzimy”. Najpierw udział w opłacie (feeShare) i stała 0,20 w premii; wzór premii zostaje.

**Cele:**

| Stanowisko | Wpływy prywatne na rok (gracz aktywny) |
|---|---|
| Młodszy zarządca, Zarządca | starczają na **ok. połowę** szkoleń i wydatków dostępnych na stanowisku; nie da się kupić wszystkiego w pierwszych 2 latach |
| Starszy zarządca, Kierownik projektu | większość wydatków stanowiska i skromne inwestowanie prywatne |
| Członek zarządu, CEO | duże kwoty, głównie z premii za wynik (≥ 60% wpływów) |

Dodatkowo: cele korporacji to ≤ 25% wpływów prywatnych na każdym stanowisku.

## R6. Widok spółek: giełda → poziom → sektor, opis działalności pod nazwą

Decyzja użytkownika: tabela akcji jest ułożona hierarchicznie, a pod nazwą spółki widać, czym się zajmuje.

- **Układ tabeli:**
  - nagłówek **rynku** (GPW i rynki internetowe; zakładka „Internet” jak dziś);
  - nagłówek **poziomu giełdy** (Śmieciowa … Diamentowa);
  - w każdym poziomie **cienki podnagłówek sektora** (ikona i nazwa, np. „─ 🏦 Bankowość ─”), ułożony w kolejności grup z rejestru `SECTORS` (0.14 T1a);
  - spółka trafia pod podnagłówek swojego **sektora głównego** (największy segment);
  - sortowanie po cenie (nagłówek kolumny) działa wewnątrz każdego podnagłówka sektora;
  - spółki zależne nadal wcięte pod spółką-matką.
- **Pod nazwą spółki** (mniejszą czcionką):
  - działalność według segmentów, od największego, w formacie **„Sektor (podsektor albo specjalizacja)”**;
  - przy dwóch lub trzech działalnościach wszystkie, rozdzielone „ · ”;
  - gdy segment ma i podsektor, i specjalizację-niszę (T3), w nawiasie oba: „Medycyna (Biotechnologia, Farmaceutyki)”;
  - przykłady: „Bankowość (Bank komercyjny)”, „Finanse (Fintech) · Technologia”, „Technologia (Sztuczna inteligencja) · Gaming”.
- **Znaczniki** przy nazwie (dzisiejsze ikony) **zostają bez zmian**.
- **Kolumna „Sektor”** znika z tabeli, bo ta sama informacja jest pod nazwą. Zwolnione miejsce zostaje dla pozostałych kolumn.
- **Filtry z 0.14 T1c** (chipy sektorów, podsektory, przełącznik segmentów pobocznych, „Typ”) bez zmian. Przy aktywnym filtrze puste podnagłówki sektorów się nie pokazują.
- **Skaner:** ten sam opis działalności w kolumnie spółki.
- **Testy:** kolejność wierszy (rynek → poziom → podnagłówek sektora → spółki); opis działalności dla spółki z 1, 2 i 3 segmentami, z podsektorem i niszą; spółka zależna pod matką; sortowanie po cenie wewnątrz sektora.
- **Wydajność:** tabela renderuje się nie wolniej niż dziś (pomiar `displayStocks` przy ~110 spółkach).

---

## Zapis gry i testy

- **Zapis:** v14 bez zmiany wersji. Nowe pola opcjonalne: historia rozliczeń puli, licznik rozliczeń per uczestnik. Migracja `playerStakes` jak w R1.
- **Testy** (`tests/tests.html`), po jednym na ścieżkę z udziałem puli:
  - debiut: akcje proporcjonalnie do wkładu;
  - debiut po oczekiwaniu;
  - przejęcie po oczekiwaniu: zwrot 105–200% do puli;
  - oszustwo: 0;
  - porażka: zwrot według ścieżki;
  - komplikacje → ratunek: akcje;
  - komplikacje → upadek: zwrot;
  - prywatyzacja: zwrot do puli;
  - wpłata do puli nie zmienia NAV;
  - wypłata z puli z opłatą 2%: opłata trafia do pozostałych uczestników;
  - `playerStakes` po każdej ścieżce = fakty;
  - limit 10% nie blokuje się po upadku;
  - migracja starego zapisu z martwym `playerStakes`;
  - niezmiennik puli i inkubatora.

## Jak sprawdzimy (przebieg ×200, 6,5 roku gry)

Preset przebiegu: gracz co kwartał wpłaca do puli i inwestuje bezpośrednio w 1 startup (do limitu 10%).

| Miara | Cel |
|---|---|
| Niezmiennik puli (wpłaty − wypłaty = niezainwestowane + w startupach + rozliczone) | 0 rozjazdów |
| Rozliczenia bez komunikatu dla gracza | 0 |
| Skok NAV w chwili wpłaty do puli | 0 |
| `playerStakes.player` vs fakty | różnica 0 przez cały przebieg |
| Wkład w pulę „uwięziony” > 8 kw. bez startupu w zbiórce | widoczny status w panelu; wypłata możliwa |
| GIG, marże, niezmienniki świata | bez zmian względem stanu po T3 |
| R5: wpływy prywatne według stanowiska | w celach z tabeli R5; cele korporacji ≤ 25% wpływów |
| R6: czas `displayStocks` | nie dłuższy niż przed zmianą |

## Decyzje (podjęte 2026-10-14)

1. **Kiedy:** zaraz po 0.14 T3, przed T4. T4 (spin-offy) dotyka akcji i posiadaczy, więc pieniądze startupów mają być wtedy czyste.
2. **Zakres:** tylko naprawa błędów A–E i widoczność. Pula nadal wybiera startup losowo, w tym samym interwale.
3. **Wypłata z puli:** tak, tylko niezainwestowana część, z opłatą 2%.

4. **Stare zapisy:** bez zwrotu wstecz pieniędzy utraconych przez błąd A. Przy wczytaniu tylko korekta martwego „Wkładu w pulę” do faktów, z wpisem w dzienniku; limit 10% się odblokowuje.
5. **Portfel prywatny:** pieniądze prywatne mają być rzadkie i służyć do wyborów. Cele korporacji płacą za dużo, więc obcinamy je od razu: min(5% budżetu, 1% aktywów funduszu × mnożnik stanowiska, 3000 zł). Resztę źródeł stroimy po pomiarze.
6. **Widok spółek:** układ rynek → poziom giełdy → podnagłówek sektora głównego; pod nazwą spółki „Sektor (podsektor albo specjalizacja)”, wszystkie działalności rozdzielone „ · ”. Znaczniki bez zmian; kolumna „Sektor” usunięta.
