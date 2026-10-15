# Plan 0.14.2 „Poprawki z gry 2” (po 0.14.1, przed T4)

Zgłoszenia użytkownika z gry (2026-10-14), ze zrzutami ekranu:
- cena instytutu GUM Med Research rośnie wykładniczo (ok. 6,4 biliarda zł za akcję, C/Z liczone w bilionach);
- spółki zależne znikają z widoku albo nie dają się rozwinąć w Platynie;
- córki mają za mało nazw i wszystkie robią to samo co matka;
- powiadomień jest za dużo;
- emisja ratunkowa zabrała pieniądze, a akcje nie pojawiły się w portfelu;
- bank inwestycyjny trzyma mnóstwo drobnych pakietów;
- elektrownię jądrową może budować każdy;
- nazwa „DejwCorp” wypada za często;
- rynki ETF i akcji nie dają się zwinąć;
- nie wiadomo, co znaczy „Impuls Innowacji”.

Kolejność: **P1 → P2 najpierw** (błędy, które psują grę i pieniądze), potem P3 → P10. Każda część z testami, przebiegiem ×200 i commitem.

**Koordynacja z 0.14.1:** R6 (widok spółek z podnagłówkami sektorów) i P3 dotykają tej samej tabeli. P3 robimy po R6 i na jego układzie: córka zawsze stoi pod matką, także gdy jest w innym sektorze.

---

## P1. Instytuty badawcze: kurs bez wykładniczego wzrostu (krytyczne)

**Diagnoza** (`companies.js`, `updateResearchInstitutes`, `checkResearchInstitutePositions`):
- **Składany dryf bez kotwicy.** Co 10 tików `stock.price *= 1 + priceBonus × 0,002`, gdzie `priceBonus = 0,05 × liczba technologii „wzmacnianie ceny i zysków” na całym rynku`. Liczba technologii rośnie przez całą grę, więc rośnie i mnożnik, a kurs nie ma żadnego odniesienia do zysków instytutu. Od poprawki zegara (`b347888`: co 10 tików zamiast `Date.now() % 10`) ten dryf działa zawsze.
- **Mechanika „sąsiadów”.** Dwa instytuty stojące obok siebie w wewnętrznej tablicy `stocks` dają skok kursu ×2,5 albo −80% i dymek na ekranie. Kolejność tablicy jest dla gracza niewidoczna, więc to czysta loteria i część zalewu powiadomień.
- **Inne:** brak opisu („Brak opisu dla tego instytutu”). C/Z i C/WK liczone z kosmicznej ceny.

**Naprawa:**
- **Kurs instytutu jak każdej spółki:** wartość godziwa z zysków. Zysk kwartalny instytutu (dziś: technologie na rynku × 5000 zł) jest wyceniany przez C/Z sektora Badania; cena powraca do wartości godziwej tak jak u innych spółek.
- **Technologie rynku** wpływają na **zysk** instytutu (przychód z licencji), a nie na kurs bezpośrednio. Bonus do kondycji i zmienności zostaje, ale z limitem.
- **Usuwamy mechanikę „sąsiadów w tablicy”.** Zamiast niej, rzadko: „konkurencja instytutów” jako zdarzenie (raz na 1–2 lata gry) z ruchem ±10–20%, wpis do paska newsów (P7), bez dymku.
- **Opisy** dla 3 instytutów (GUM Med Research, Instytut Badań Stosowanych i trzeci) w stylu opisów spółek.
- **Migracja zapisu:** cena instytutu powyżej 10× wartości godziwej → jednorazowa korekta do wartości godziwej z wpisem w dzienniku („Rewizja wyceny instytutu”). Posiadacze akcji tracą nienależny zysk; fundusz gracza dostaje wpis wyjaśniający.
- **Bezpiecznik ogólny:** w `checkWorldInvariants()` ostrzeżenie, gdy jakakolwiek spółka ma cenę > 100× wartości godziwej albo C/Z > 1000.
- **Testy:** 500 kwartałów symulacji instytutu przy rosnącej liczbie technologii → cena w granicach 0,3–3× wartości godziwej; brak skoków od kolejności tablicy; migracja koryguje kosmiczną cenę.

## P2. Emisja ratunkowa: pieniądze zeszły, akcji nie ma (krytyczne)

Zgłoszenie: gracz przyjął ofertę z maila „Emisja ratunkowa”, zapłacił, ale nie widzi akcji w portfelu ani w filtrze „Moje”.

**Do sprawdzenia** (`ma.js`: `triggerRescueOfferingEvent`, `acceptRescueOffer`, `issueRescueShares`; `ui.js`: `openRescueOfferingModal`, akcja maila `rescue`):
- `rescueOffer` jest **jedną globalną zmienną**. Nowa emisja nadpisuje poprzednią. Mail sprawdza symbol przed otwarciem okna, ale samo okno i `acceptRescueOffer` biorą **bieżącą** ofertę. Trzeba sprawdzić scenariusz: okno otwarte, w tle nowa emisja innej spółki, klik „Obejmij” → zakup akcji innej spółki niż na ekranie.
- Zapis i wczytanie w trakcie oferty: czy `rescueOffer` jest zapisywany. Jeśli nie, mail po wczytaniu wskazuje zamkniętą ofertę.
- Ścieżka gotówki: `issueRescueShares` → `playerPortfolio` → widok portfela i `isStockOwnedByPlayer`. Dziennik płatności (`recordPayment … Emisja ratunkowa`) pozwala porównać zapłatę z przyrostem akcji.
- Uzgadnianie i przycinanie akcji po emisji (`totalShares`, `sharesHeld`, `trimGhostHolders`): czy nowe akcje gracza nie są zdejmowane.

**Naprawa (minimum):**
- oferta zapisana **per spółka** (mapa ofert po symbolu), okno i przyjęcie zawsze dla symbolu z maila;
- oferty zapisywane w zapisie gry;
- **test niezmiennika:** każda płatność funduszu za akcje (emisja ratunkowa, dopłata do inwestycji, IPO, wezwanie) daje przyrost akcji w `playerPortfolio` równy liczbie z komunikatu;
- wpis w dzienniku „Fundusz obejmuje X akcji {spółka}” i odświeżenie widoku portfela.

Jeśli przyczyna okaże się inna, czat kodu opisuje ją w raporcie i naprawia w tym samym zakresie.

## P3. Spółki zależne: widoczność, nazwy, działalność

**Widok (decyzja: zawsze pod matką):**
- córka **zawsze** wyświetla się pod matką, niezależnie od własnego poziomu giełdy, zakładki poziomu i filtra sektora. Jeśli matka jest widoczna, jej córki też;
- przy córce znacznik jej własnego poziomu giełdy (np. 🥈) i udział matki („zależna, 60%”);
- **naprawa rozwijania** w Platynie i na giełdach elitarnych: `toggleSubsidiaryVisibility` szuka zwinięcia po giełdzie matki, a tabela po R6 ma podnagłówki sektorów. Sprawdzić wszystkie poziomy i zakładkę „Wszystkie”;
- córka może być na innym poziomie giełdy niż matka. Poziom wynika z jej ceny i kapitalizacji, jak dziś.

**Działalność córki** (`foundSubsidiary`, `finance.js`): dziś córka kopiuje sektor i segmenty matki, dlatego wszystkie córki Cortex Neural są technologiczne.
- Córka dostaje **jeden segment**:
  - 50%: segment poboczny matki, jeśli matka go ma;
  - 40%: sektor **powiązany** z sektorem głównym matki (tabela branż powiązanych z 0.14 T3);
  - 10%: sektor matki (ten sam, np. inny podsektor).
- Profil, cykl i pracownicy (0.13) wynikają z nowego segmentu, a nie z matki.

**Nazwy córek:** dziś matka plus jedno z 5 słów (Nova, Plus, Labs, Serwis, Invest). Nowe wzorce (nazwa nie może się powtórzyć):
- „{Matka} {słowo sektora}”: Cortex Neural Energy;
- „{pierwszy człon matki} {słowo sektora}”: Cortex Energy;
- skrót-zlepek: Cortenergy, Cortechem;
- „{Matka} {słowo dodatkowe}”, dzisiejsze słowa, tylko gdy córka ma sektor matki.

Słowa sektorów z rejestru `SECTORS` (np. Energia → Energy/Power/Volt; Chemia → Chem/Lab; Finanse → Capital/Finance; Nieruchomości → Estate/Properties).
- **Test:** 20 córek jednej matki → ≥ 15 różnych nazw; żadna córka bez segmentu; ≥ 50% córek w innym sektorze niż główny matki.

## P4. Nazwy nowych spółek i startupów („DejwCorp”)

- **Diagnoza:** `generateNewStartup` (`companies.js`) ma listy nazw tylko dla części sektorów. Każdy inny sektor dostaje stałą nazwę `DejwCorp` z doklejanymi znakami. Po porządku sektorów (0.14 T1) takich sektorów przybyło: Gaming, Media, Badania, Obronność, Finanse, Transport i logistyka, Nieruchomości, Chemia i inne.
- **Naprawa:**
  - listy przedrostków i przyrostków dla **każdego** sektora z rejestru `SECTORS`, a dla podsektorów z własną mechaniką słowa podsektora (np. Biotechnologia: Gen-, Bio-, -Thera);
  - sprawdzanie unikalności nazwy wśród żywych i usuniętych spółek;
  - `DejwCorp` zostaje tylko jako rzadka niespodzianka: najwyżej 1 na grę, szansa 1%.
- **Test:** 500 wygenerowanych startupów → 0 nazw awaryjnych poza niespodzianką, ≥ 90% unikalnych.

## P5. Bank inwestycyjny: mniej drobnych pakietów, prawdziwa strategia

**Dziś** (`ai.js`, `runInvestmentBankAI`): bank co turę kupuje za 10–25% gotówki najzdrowszą spółkę, której jeszcze nie ma, i sprzedaje kawałki przy +30% / −15%. Efekt: dziesiątki drobnych pakietów.

**Nowa strategia** (decyzja użytkownika):
1. **„Pakiet do odsprzedaży”:** bank szuka spółek, w których jeden posiadacz (bot, fundusz, koncern, gracz) ma 40–50% akcji. Skupuje wolny obrót, do 10–15% akcji spółki, żeby:
   - odsprzedać pakiet temu posiadaczowi z premią 10–20%, gdy ten będzie chciał przekroczyć 50% (oferta dla gracza mailem, z decyzją);
   - albo sprzedać w wezwaniu.

   Uczy, czym jest premia za kontrolę i rola banku inwestycyjnego.
2. **Popularne spółki:** spółki z największym obrotem i zainteresowaniem botów w ostatnim kwartale. Bank kupuje większe pozycje i trzyma je do spadku popularności.
3. **Koncentracja portfela:**
   - najwyżej 8–12 pozycji;
   - minimalna pozycja 1% akcji spółki;
   - pozycje poniżej 0,5% bank sprzedaje przy kolejnych turach;
   - zakup tylko z wolnego obrotu (`getAvailableShares`).

**Cele i testy:**
- pozycji banku ≤ 12;
- 0 pozycji poniżej 0,5% akcji po 4 kwartałach;
- co najmniej 1 „pakiet do odsprzedaży” na przebieg;
- niezmienniki akcji i pieniędzy.

## P6. Inwestycje spółek: elektrownia jądrowa nie dla każdego

- **Diagnoza:** katalog inwestycji spółek ma pozycje energetyczne bez pilnowania sektora albo podsektora, np. „Rozbudowa Elektrowni” i „Reaktor Fuzyjny” w `companies.js`. Do tego budowa bloku jądrowego i zlecenia z 0.14 T3 w karcie spółki.
- **Naprawa:**
  - **audyt katalogu inwestycji i technologii:** każda pozycja ma pole `sector` albo `subsector`, respektowane w wyborze bota, w karcie spółki i w zleceniach większościowca;
  - **blok jądrowy:** tylko podsektor Energetyka jądrowa (0.14 T2);
  - **Reaktor Fuzyjny:** tylko Energia, z podsektorem jądrowym albo po technologii poprzedzającej;
  - **Rozbudowa Elektrowni:** tylko Energia.
- **Test:** spółka spoza Energii nie widzi i nie dostaje tych inwestycji; bot nie wybiera inwestycji spoza swojego sektora.

## P7. Powiadomienia: pasek newsów zamiast zalewu

Decyzja: **przewijany pasek newsów u góry i tylko ważne dymki.**

- **Pasek newsów** (u góry ekranu, przewijany, pauza po najechaniu):
  - korekty wyników, IPO i debiuty, przejęcia, awanse i spadki giełd, zdarzenia sektorów i makro, wyniki badań klinicznych, kontrole KNF, instytuty, emisje ratunkowe innych spółek;
  - klik w news otwiera kartę spółki; historia ostatnich 50 newsów po kliknięciu „📰”.
- **Dymki (toasty) tylko dla spraw gracza:**
  - spółki, w których fundusz albo konto prywatne ma akcje;
  - decyzje do podjęcia (mail z akcją);
  - kary, awans i ocena, przelewy.

  Najwyżej **3 dymki na minutę gry**; nadmiar trafia do paska.
- **Narożnik (ciągłe informacje):** przegląd źródeł, które dziś piszą do rogu ekranu. Rutynowe idą do paska, a w rogu zostaje tylko stan gry (czas, prędkość).
- **Korekty wyników:** pasek; mail tylko, gdy gracz ma akcje tej spółki (dziś jedno i drugie zawsze).
- **Znaczniki na wykresie:** nakładające się ikony (np. ✂️ w jednym tygodniu, zrzut 1–2) łączymy w jeden znacznik z liczbą i listą w dymku.
- **Cel:** dymków ≤ 3 na minutę przy ×1; w przebiegu ×200 liczba wywołań `showToast` niezwiązanych z graczem = 0.

## P8. Widok: zwijane rynki i wyjaśnione fazy spółek

- **Zwijane sekcje:**
  - rynek ETF jako osobna, zwijana sekcja, jak NewHorizons;
  - cały rynek akcji też zwijany (nagłówek sekcji).

  Stan zwinięcia zapamiętany w `localStorage`.
- **Fazy spółki** (Impuls Innowacji 💡, Złoty Rok, Zejście w Cień i inne z `corporatePhase`):
  - **dymek** na znaczniku fazy: co to za faza i w skrócie, co daje (np. „Impuls Innowacji: przełom badawczy, przez ok. X tyg. szybszy wzrost przychodów i wyższa zmienność”);
  - **hasło w Akademii** „Fazy rozwoju spółki” z listą faz, czasem trwania i wpływem na kurs i wyniki.

## P9. Wycena spółek specjalnych i małych spółek ze stratą (znaleziska bezpiecznika z P1)

Bezpiecznik z P1 (cena > 100× wartości godziwej albo C/Z > 1000) w przebiegach ×200 wskazał kolejne spółki bez sensownej kotwicy wyceny. Nie naprawiono ich w P1, bo wykraczały poza jego zakres.

| Spółka / typ | Objaw | Prawdopodobna przyczyna (do potwierdzenia) |
|---|---|---|
| Banki BKMORT1, BKCOOP1 | wartość z majątku ok. 0, cena 60–130 | bilans banku (kapitał własny) nie jest podstawą wyceny banków-spółek |
| TAX (biuro rachunkowe), WRN (windykator) | C/Z w dziesiątkach tysięcy | zysk liczony osobną ścieżką `assetType` (prowizje, odsetki) jest bliski zera względem ceny; brak kotwicy |
| REIT HOR | ok. 47× wartości | REIT bez wyceny z NAV nieruchomości |
| Zwykłe spółki SMAF, MAJB, KRA (20 lat) | cena > 100× przy ujemnym zysku i małym kapitale | przy stracie wartość godziwa z C/Z nie działa, a cena nie ma kotwicy w majątku ani przychodach |

**Zasada naprawy:** każdy typ spółki ma jawny model wartości godziwej:
- **banki:** C/WK sektora Bankowość × kapitał własny z bilansu; brak bilansu → inicjalizacja z kapitalizacji startowej;
- **biuro rachunkowe, windykator, lombard:** C/Z sektora Finanse z ich własnego zysku, z podłogą wyceny z majątku (C/WK 0,5);
- **REIT-y:** wartość aktywów netto (NAV) nieruchomości ± premia lub dyskonto 0–20%;
- **holdingi:** NAV portfela (jest od 0.13.1 B11), sprawdzić kotwicę ceny;
- **zwykłe spółki ze stratą:** wartość godziwa = max(C/WK sektora × kapitał własny × 0,5; C/S sektora × przychody × 0,3). Cena wraca do niej jak przy zysku, tylko wolniej.

**Cele i testy:**
- 20 lat ×200: **0 ostrzeżeń bezpiecznika** poza pierwszymi 2 kwartałami po wczytaniu starego zapisu, gdy działa migracja;
- test dla każdego typu (bank, biuro rachunkowe, windykator, lombard, REIT, holding, spółka ze stratą): 500 kwartałów → cena 0,3–3× wartości godziwej;
- migracja: cena > 10× wartości godziwej → jednorazowa rewizja z wpisem, jak w P1.

**Skala licencji instytutów (otwarte z P1):** zysk instytutu rośnie liniowo z liczbą technologii na rynku (5 tys. zł/tech/kwartał dla każdego instytutu), więc kurs rośnie ok. ×50 w 12 lat. W 1.–2. roku kurs nie nadąża za zyskiem (stosunek 0,2–0,3). Decyzja użytkownika w czacie kodu; rekomendacja planowania: **licencje malejące** (np. pierwiastek z liczby technologii albo udział instytutu w rynku licencji dzielony między instytuty), żeby kurs rósł mniej więcej jak rynek.

## P10. Ujemna gotówka spółek po decyzjach z T3

Znalezione przy kontroli 0.14.1, było już przed nim:
- spółki schodzą poniżej zera po `startPivot` i `startExpansion` (strategia z 0.14 T3), bo koszt jest pobierany bez sprawdzenia gotówki;
- KFX ma ujemną gotówkę w raportach.

**Naprawa** (jak w poprawkach P3 0.13.1 i A1):
- przed startem pivotu albo rozszerzenia sprawdzić gotówkę;
- koszt rozłożony na raty pobiera tylko tyle, ile jest gotówki, a resztę bierze kredytem ratunkowym (`coverNegativeCash`) albo wstrzymuje projekt;
- prześledzić KFX i dopisać przyczynę do raportu.

**Test:** 20 lat ×200, 0 ostrzeżeń „ujemna gotówka” na granicy kwartału.

## P11. Płynny pasek newsów (zgłoszenie po 0.14.2, 2026-10-15)

Zgłoszenie: pasek zacina się, gdy wchodzą nowe newsy.

**Diagnoza** (`ui.js`: `pushNews`, `renderNewsTicker`; `style.css`: `.news-ticker-track`, `@keyframes news-scroll`):
1. Każdy news przebudowuje cały pas (`track.innerHTML`), a nowy wpis trafia **na początek** (`newsLog.unshift`). Widoczna treść przeskakuje o szerokość nowego wpisu.
2. Animacja CSS przesuwa pas o −100% jego szerokości w stałe 90 s. Gdy pas się wydłuża albo skraca, zmienia się prędkość i bieżąca pozycja, więc animacja skacze.
3. Przy dużych prędkościach gry newsy przychodzą kilka razy na sekundę, a każdy wymusza przebudowę i przeliczenie układu.

**Naprawa:**
- **Kolejka zamiast przebudowy:** `pushNews` dopisuje news do historii i do kolejki paska, a pasu, który się przewija, nie przebudowuje.
- **Wpisy wchodzą z prawej**, na końcu pasa. Następny wpis z kolejki jest dokładany, gdy ostatni w pełni wjechał w pole widzenia. Wpisy, które w całości wyjechały z lewej, są usuwane z jednoczesną korektą przesunięcia o ich szerokość, więc nic nie skacze.
- **Stała prędkość w pikselach na sekundę** (ok. 60 px/s), niezależna od długości pasa. Ruch w `requestAnimationFrame` przez `transform: translate3d`, z `will-change: transform`. Animacja CSS `news-scroll` znika.
- **Pauza po najechaniu** zostaje, a ruch wznawia się od tego samego miejsca.
- **Nadmiar newsów:** kolejka paska najwyżej 15 wpisów. Przy przepełnieniu odpadają najstarsze rutynowe, ale zostają w historii 📰. Newsy dotyczące spółek gracza mają pierwszeństwo.
- **Pusty pasek:** gdy kolejka jest pusta, pas zapętla ostatnie wpisy bez przebudowy (dokłada kopie z historii).
- **`prefers-reduced-motion`:** bez przewijania; jeden news naraz, zmiana co 5 s bez animacji.
- **Karta zakładki w tle:** gdy strona jest ukryta (`document.hidden`), ruch staje, a po powrocie nie nadrabia skokiem.

**Testy:**
- `pushNews` w trakcie przewijania nie zmienia bieżącego przesunięcia widocznych wpisów (pozycja pierwszego widocznego wpisu przed i po różni się tylko o ruch z czasu);
- 200 newsów w 2 s (symulacja ×200) → kolejka ≤ 15, historia 50, bez wyjątków;
- prędkość pasa stała przy 3 i przy 12 wpisach.

**Kontrola ręczna:** przebieg przy ×1 i ×50 z otwartym paskiem; brak widocznych skoków przy wejściu nowego newsa.

---

## Zapis gry i testy

- **Zapis:** v14 z polami opcjonalnymi:
  - oferty emisji ratunkowych per spółka;
  - stan zwinięcia sekcji (w `localStorage`, nie w zapisie);
  - historia paska newsów (opcjonalnie, ostatnie 50).

  **Migracja:** korekta kosmicznych cen instytutów (P1); córki bez segmentu dostają segment według reguły P3, nazwy zostają.
- **Testy:** wymienione w każdej części oraz niezmienniki świata. Bezpiecznik ceny (P1) w `checkWorldInvariants()`.

## Jak sprawdzimy (przebieg ×200, 6,5 roku i 20 lat gry)

| Miara | Cel |
|---|---|
| Cena instytutów / wartość godziwa | 0,3–3× przez cały przebieg (także 20 lat) |
| Spółki z ceną > 100× wartości godziwej (każdy typ, 20 lat) | 0 (P9) |
| Emisja ratunkowa: zapłata vs przyrost akcji gracza | zgodne w 100% przypadków |
| Córki: różne nazwy / inny sektor niż matka | ≥ 75% unikalnych nazw / ≥ 50% |
| Nazwy awaryjne („DejwCorp”) | ≤ 1 na grę |
| Bank inwestycyjny: liczba pozycji / pozycje < 0,5% | ≤ 12 / 0 |
| Dymki | ≤ 3 na minutę gry przy ×1; rutynowe zdarzenia tylko w pasku |
| GIG, marże, niezmienniki | bez istotnej zmiany względem stanu po 0.14.1, poza skutkiem P1 (GIG może spaść, jeśli instytuty go zawyżały — zmierzyć i opisać) |

## Decyzje (podjęte 2026-10-14)

1. **Emisja ratunkowa:** zgłoszony przypadek to oferta z maila „Emisja ratunkowa”.
2. **Spółki zależne:** zawsze widoczne pod matką, na każdym poziomie i w każdej zakładce; córka może mieć własny, inny poziom giełdy (znacznik przy córce).
3. **Fazy spółki:** zostają w tabeli, z dymkiem „co to za faza i co daje” i hasłem w Akademii.
4. **Powiadomienia:** przewijany pasek newsów i tylko ważne dymki (sprawy gracza), najwyżej 3 na minutę.
5. **Bank inwestycyjny:** strategia „pakiet do odsprzedaży” (posiadacz z 40–50%) i popularne spółki, portfel skoncentrowany.
6. **Instytuty:** kurs oparty na zyskach; mechanika „sąsiadów w tablicy” usunięta (decyzja planowania — zależała od niewidocznej kolejności spółek).
