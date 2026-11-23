# Plan 0.20 „Korporacje 2” (2026-11-23)

Polecenie użytkownika z 2026-11-23: wersja 0.20 z analizą wydatków i mechanik firm (czy firmy płacą pracownikom, relacje między firmami) i z nowym, bardziej „RPG-owym” rozwojem spółek, oraz ocena pomysłów: mapa kraju na trzech szczeblach, specjalizacje miast, migracje, drabina rozwoju, kategorie dóbr 0–4, spółki pozagiełdowe (OTC), IPO z deficytu, awaryjny import. Ten plik to **szkic zakresu z decyzjami**. Specyfikacja z liczbami powstanie po 0.19.2, jak przed każdą wersją.

## Decyzje użytkownika (2026-11-23)

| Nr | Pytanie | Decyzja |
|---|---|---|
| K1 | Co przesunąć za Korporacje 2 | **Wersje krajów (dawne 0.19.6+), Globalne korporacje (dawne 0.20) i silnik „flavour” (dawne 0.19.3).** Seria 0.19 to Polityka (0.19.1), Mapa kraju (0.19.2), Usługi i projekty (0.19.3, nowy zakres), Handel (0.19.4) i bramka (0.19.5). Nowa kolejność jest w tabeli niżej |
| K2 | Liczba miast | **1 + 6 + 12** (Stolica, 6 wojewódzkich, 12 powiatowych), ale **na start nie wszystkie istnieją**: część miast i połączeń otwiera się z czasem (rozwój infrastruktury, wzrost ludności). Wdrożenie w 0.19.2 |
| K3 | Drabina rozwoju | **5 szczebli:** Lokalna → Regionalna → Krajowa → Potentat krajowy → Międzynarodowa. „Okoliczny monopolista” nie jest szczeblem, tylko stanem pilnowanym przez urząd antymonopolowy |
| K4 | Obieg płac | **W 0.20:** wypłaty → dochód gospodarstw w mieście → popyt (część K2 niżej). 0.21 Rynek pracy 2 traci ten punkt |

## Nowa kolejność wersji (K1)

| Wersja | Nazwa | Zakres w skrócie |
|---|---|---|
| 0.19.1 | Polityka i Społeczeństwo 2 | bez zmian (`plan_0.19.md`) |
| 0.19.2 | **Mapa kraju** (dawniej Miasta 2) | 3 szczeble miast, odblokowania miast i połączeń, specjalizacje (tagi), polityki miejskie, migracje wewnętrzne, zdarzenia lokalne, kategorie dóbr 0–4 na mapie, galerie jako warunek kat. 3 |
| 0.19.3 | **Usługi i projekty** (nowy zakres na wolnym numerze) | Turystyka i usługi cyfrowe w grafie, projekty budowlane, megaprojekty i projekty czasowe (PR0–PR8), przeniesione z 0.19.2, żeby ją odciążyć |
| 0.19.4 | Handel światowy | bez zmian |
| 0.19.5 | Bramka testowa serii 0.19 | bez zmian |
| **0.20** | **Korporacje 2** | ten plik |
| 0.21 | Rynek pracy 2 | bez obiegu płac (jest w 0.20 K2) |
| 0.22 | Multikulturalizm: silnik „flavour” | dawne 0.19.3 |
| 0.23 | Globalne korporacje | dawne 0.20: podwójne notowanie, córki zagraniczne, przejęcia od strony kupującego. Po silniku, bo korzysta z poziomów obecności |
| 0.24+ | Wersje krajów | dawne 0.19.6+: Niemcy (wzór), USA, Czechy, dalej pozostałe |
| 1.0 | Ostatnia wersja | bez zmian (`plan_1.0.md`) |

## Analiza: wydatki i mechaniki firm (kod, 2026-11-23)

### Rachunek kwartału spółki (`companies.js:3280–3330`)

- **Przychód:** bazowy przychód rośnie co kwartał o wzrost z profilu sektora, PKB, kondycji, fazy rynku, projektów, społeczeństwa i szumu (±25% na kwartał). Kwartałowe mnożniki to strajk, epidemia, kryzys, kooperacja, wynik towarowy (0.17) i zamówienia obronne.
- **Marża:** marża profilu sektora × korekty (kondycja, faza, PKB, inflacja, tłok, strategia, gwiazda rynku) minus erozja konkurencyjna (35% nadwyżki ponad profil) plus korekty: koszt pracy, towary (graf 0.18) i zastępca-kontroler.
- **EBITDA** = przychód × marża − dźwignia operacyjna przy spadku (40% kosztów sztywnych) − **koszty stałe** (`fixedExpenses`, czyli utrzymanie inwestycji) + wynik działających inwestycji.
- **Dalej:** amortyzacja = przychód × `profile.da`, odsetki = zobowiązania × stopa kredytu / 4, CIT (do skarbu, `citQuarter`), dotacja 70% straty dla spółek państwowych.

### Czy firmy płacą pracownikom?

**Pośrednio tak, ale pieniądze nigdzie nie płyną.**
- Koszt pracy `labor` = przychód × udział pracy (`laborShare` z szablonu sektora) × indeks kosztu pracy (`getLaborCostIndex`: płace rynkowe 5 grup, premia, polityka, wydajność, związek, rotacja, szara strefa). Ta kwota jest **zapisywana w historii i pokazywana** („w tym koszt pracy”).
- W wyniku liczy się tylko **odchylenie** `laborShare × (1 − indeks)` (`getLaborMarginAdj`). Bazowy koszt pracy jest już w marży profilu. Przy indeksie 1,0 płace nic nie zmieniają (zasada kalibracji 0.13).
- **Obieg się nie zamyka:** popyt obywateli (`society.demandIndex`) wynika ze struktury klas (`SOCIETY_CLASSES`), a nie z wypłat. Spółka, która zwalnia albo tnie płace, nie obniża popytu w kraju. Wyjątkami są realne przepływy pieniędzy w szarej strefie: kary Inspekcji Pracy i doradztwo kadrowe gracza (`recordPayment`).
- **Zatrudnienie:** `workforce.employees` liczone z przychodu i wydajności (`companies.js:10731`), ze zwolnieniami przy spadku przychodu. Zatrudnienie wpływa na związek (≥ 200 osób), ale nie na wynik.

### Inne wydatki

- **Wsady z grafu (0.18):** odbiorca płaci przez mnożniki marży i aktywności (`computeChainFactors`), a producent zyskuje z ceny. Przepływ jest symetryczny w sensie wyniku, ale **bez przelewu między konkretnymi spółkami**: graf jest anonimowy (podsektor × kraj).
- **Inwestycje:** koszt jednorazowy z gotówki albo kredytu, potem `fixedExpenses` (utrzymanie). Koszty są absolutne (diagnoza 0.19.3 PR3).
- **Podatek miejski** 0,5% (`companies.js:3757`), modyfikowany przez burmistrza.
- **Ścieżka ESG, kary, ugody, audyty:** jednorazowe obciążenia gotówki.

### Relacje między firmami

| Relacja | Gdzie | Co robi | Czego brakuje |
|---|---|---|---|
| Kooperacje | `cooperations`, `companies.js:12540–12575` | +0,5 pp marży × udział segmentu, tunelowanie, przenoszenie szoków (strajk, bankructwo partnera) | wyboru partnera według grafu (kooperacja nie wynika z tego, kto komu sprzedaje) |
| Matka i córki | `foundSubsidiary` (`finance.js:1084`), carve-out, spin-off | córki dostają kopię działów, limit córek, koszty stałe dzielone | przepływów wewnątrzgrupowych poza dywidendą |
| Przejęcia | `ma.js` (oferty, wezwania, LBO, pigułka) | pełne M&A od strony sprzedającego | strony kupującego (dawne 0.20 → 0.23) |
| Podwykonawcy | `subcontractors.js` | osobny rejestr firm budowlanych (nie spółki) | — |
| Przetargi | `core.js` (tender, escrow) | zamawiający płaci Budowlanemu realnie | — |
| Konkurencja | `getDominanceGrowthDrag`, urząd antymonopolowy | duża spółka rośnie wolniej | konkurencji lokalnej (miasta), wojen cenowych |
| Graf towarów | `chains.js` | ceny i niedobory na poziomie podsektora | konkretnych dostawców i odbiorców |

### Rozwój spółek dziś

- **Działy** `research`, `development`, `economy` startują na poziomie 0–1 (`initializeDepartments`, `companies.js:7927`). **Poziom rośnie wyłącznie, gdy gracz go sfinansuje** (`player.js:1409–1429`). Boty nigdy nie rozwijają działów, więc progi `minDevLevel` w katalogu inwestycji i zniżka −10% od poziomu 3 są dla botów prawie martwe.
- **Spółki prywatne:** `privateCompanies` (`companies.js:678, 5100–5110, 7109`) to 5 zaślepek „Prywatna Inicjatywa #i” z niedokończoną logiką (komentarze TODO: IPO i inkubator tylko piszą do dziennika).
- **Nowe IPO:** startupy z losowym sektorem (`startupSectors`, `companies.js:1163, 4772`), a w miejsce przejętej spółki debiutuje spółka z tego samego sektora. Graf nie wpływa na to, co debiutuje.
- **Poziomy giełd** (E0 z 0.18.7) mierzą wielkość i jakość spółki, ale nie „zasięg” działalności.

## Ocena pomysłów użytkownika

| Pomysł | Ocena | Gdzie i w jakiej formie |
|---|---|---|
| Państwa trzecie na później, w zamian mapa kraju startowego na 3 szczeblach | **Ma sens.** Kraje obce mają już uproszczony model (spółki zagraniczne, kursy, bilety), a pełne wersje krajów to ogromny koszt treści ×10. Mapa kraju daje grunt pod logistykę lokalną, potrzeby mieszkańców i polityki miejskie, a drabina rozwoju i obieg płac potrzebują miejsca, w którym firma działa | K1 i K2; mapa w 0.19.2 |
| Specjalizacje miast (tagi: Zagłębie surowcowe, Węzeł kolejowy, Miasto akademickie, Kurort z zakazem brudnego przemysłu) | **Ma sens i pomaga zanieczyszczeniu:** brudny przemysł skupia się w zagłębiach, a kurorty go zakazują. Tag zmienia koszty, limity i przyciąga podsektory. Ryzyko: tagi nie mogą przesuwać średniej marż (zasada średniej zero) | 0.19.2: 6–8 tagów, miasto 1–2 tagi, tag może się zmienić (np. odkrycie złoża) |
| Migracja wewnętrzna (z zanieczyszczonych powiatów do miast wojewódzkich, popyt na mieszkania i galerie REIT) | **Ma sens.** Migracja kraju według atrakcyjności już jest (`core.js:5270`), więc wystarczy ją rozszerzyć na miasta. Łączy się z REIT przez najem (U8) i z poziomem życia (0.19.1 S3) | 0.19.2: migracja raz na kwartał, ograniczona (np. ≤ 1% ludności miasta) |
| Zdarzenia lokalne (awarie sieci, odkrycie złoża, targi) | **Ma sens**, tani: istniejący silnik zdarzeń z celem „miasto” | 0.19.2: 6–10 zdarzeń, ≤ 1 na miasto na rok |
| Graf krajowy, miasta modyfikują koszt pracy, podatki i limity przez pojemność infrastruktury | **Zgodne z planem 0.19.2** (to samo założenie). Dzięki temu miasta nie mnożą macierzy grafu | 0.19.2 bez zmian |
| Drabina rozwoju spółek z 4 filarami (zarobki, zatrudnienie, wycena, infrastruktura miasta jako bariera) | **Ma sens, w 5 szczeblach (K3).** Uwaga na podwójne bramki: poziomy giełd (E0) już mierzą wycenę i jakość, więc szczebel nie może być drugą bramką tych samych giełd. Szczebel mierzy **zasięg** i odblokowuje działania, a giełda wielkość. Jedyne powiązanie: debiut z OTC na Złotej i wyższej wymaga szczebla Regionalna | 0.20 K1 |
| Progi odblokowujące (oddziały w województwach, debiut na głównym parkiecie, centrala w Stolicy jako warunek szczebla krajowego, na szczycie własne B+R i eksport) | **Ma sens.** Oddziały są z 0.19.2, B+R to dział `research` (dziś martwy u botów), a eksport korzysta z grafu (sprzedaż do krajów w `chains.js`). Pełne córki zagraniczne zostają w 0.23 | 0.20 K1 |
| Kategorie dóbr 0–4 | **Ma sens jako widok na obecne klasy, bez zmiany grafu:** 1 = M (surowce), 2 = P (półprodukty), 3 = Z i K (końcowe i inwestycyjne), 4 = L (premium). **Kategoria 0 jest nowa:** usługi lokalne bez magazynu (bezpieczeństwo, komunalne, opieka) jako wskaźnik pokrycia potrzeb miasta 0–100%. Nazwa „pozagiełdowe” koliduje z OTC, więc kategoria 0 to „Usługi lokalne” | 0.19.2 (widok i kat. 0 w miastach) |
| Mapowanie kategorii na miasta (kat. 1–2 w powiatach, kat. 3 wymaga galerii w wojewódzkich, kat. 4 w Stolicy według Nauki) | **Ma sens z jedną poprawką:** kat. 4 to w grze także alkohole premium i dobra luksusowe, które nie zależą od nauki. Dlatego **popyt** na kat. 4 skupia się w Stolicy (klasy zamożne), a **produkcja** zaawansowanej kat. 4 (technologia, farmacja) wymaga wskaźnika Nauki miasta | 0.19.2 |
| Spółki OTC jako zagregowana moc produkcyjna per miasto i towar | **Ma sens i jest tani dla CPU.** Zastępuje martwe zaślepki `privateCompanies`. Moc OTC to część podaży krajowej w grafie, więc przy starcie trzeba ponownie skalibrować `b = 1` | 0.20 K5 |
| Organiczne IPO z deficytu (wysoki deficyt i marża ponad średnią przez kilka kwartałów) | **Ma sens.** Dziś sektor debiutu jest losowy. Debiut z OTC w ogniwie z niedoborem to naturalna odpowiedź rynku, w granicach limitów liczby spółek (`LISTING_SOFT_CAP` 120 itd.) | 0.20 K6 |
| Awaryjna substytucja importowa po zawyżonej cenie | **Ma sens, ale mniejszy problem niż się wydaje:** graf nie zamraża łańcucha, bo import już jest (limit `importHeadroom`), a niedobór obniża aktywność odbiorcy najwyżej o (1 − b) × udział × 0,6. Import awaryjny ponad limit po cenie ×1,5–2 zmienia twardy niedobór na wyższy koszt | 0.20 K7, po pomiarze, jak często niedobór przekracza limit |

## Części 0.20

| Część | Zakres | Test i bramka |
|---|---|---|
| **K0** | **Pomiar:** w serii 24 × 6,5 roku i 10 × 20 lat: rozkład poziomów działów, udział spółek, które w ogóle zainwestowały, częstość niedoborów ponad limit importu (na ogniwo), sektory debiutów wobec deficytów, płace / przychód według sektorów, liczba kooperacji i ich zgodność z grafem | raport `raporty/diagnoza_korporacje_0.20.md` |
| **K1** | **Drabina 5 szczebli** (`corp.js`, nowy plik, logika bez DOM): Lokalna → Regionalna → Krajowa → Potentat krajowy → Międzynarodowa. **4 filary** liczone względem mediany rynku, jak E0a: zysk z 4 kw., zatrudnienie, wycena, **infrastruktura miasta siedziby** (pojemność z 0.19.2) jako bariera: bez wolnej pojemności awans czeka. Awans po 2 kw. spełniania, spadek po 4 kw. niespełniania. **Odblokowania:** Regionalna — oddziały w miastach wojewódzkich (0.19.2), debiut z OTC na Złotej; Krajowa — warunek: centrala w Stolicy (przeprowadzka jako projekt z kosztem i czasem), oddziały wszędzie, przetargi państwowe; Potentat — kooperacje w całym kraju, próg urzędu antymonopolowego (stan „monopolista” z K3); Międzynarodowa — własne B+R (dział `research` ≥ 3), eksport w grafie (sprzedaż za granicę z większym limitem). Start: szczebel z obecnej wielkości i zasięgu | test: awans i spadek z okresem potwierdzenia; rozkład na start: Lokalna 30–45%, Regionalna 25–35%, Krajowa 15–25%, Potentat 5–10%, Międzynarodowa 2–5%; w 20 latach 10–30% spółek awansuje o ≥ 1 szczebel |
| **K2** | **Obieg płac (K4):** fundusz płac spółki (`labor`, już liczony) dzielony na miasta zatrudnienia (siedziba i oddziały z 0.19.2) staje się **dochodem gospodarstw miasta**. Dochód miasta względem bazy (kalibracja: na starcie 1,0) przesuwa popyt miasta i kraju: `demandIndex` × (dochód / baza)^α, z α na start 0,3. Zwolnienia i cięcia płac obniżają popyt tam, gdzie spółka zatrudnia; szara strefa daje niższy dochód i mniej podatków. Bez podwójnego liczenia: koszt pracy zostaje w marży jak dziś, nowy jest tylko przepływ do miast | test: przy ustawieniach startowych popyt bez zmian (± 0,5%); zwolnienie 20% w dużej spółce obniża popyt jej miasta; GIG ± 0,3 pp; marże 0 ± 0,3 pp; brak pętli (zwolnienia → popyt → zwolnienia): wygaszanie z ograniczeniem zmiany na kwartał |
| **K3** | **Rozwój działów przez boty:** bot inwestuje w działy według szczebla, gotówki i cech CEO (`wizjoner`, `ksiegowy` itd.): koszt rośnie z poziomem i wielkością spółki (udział przychodu), limit 1 poziom na rok. Działy dostają limit poziomu według szczebla (Lokalna ≤ 2, Krajowa ≤ 4, Międzynarodowa ≤ 5). Gracz nadal może finansować działy | test: w 20 latach średni poziom działów 1,5–3; progi `minDevLevel` osiągane; marże ± 0,3 pp |
| **K4** | **Specjalizacja spółki (element RPG):** przy każdym awansie spółka wybiera 1 z 3 **profili** (np. Efektywność kosztowa, Marka, Innowacje, Logistyka, Eksport, Kadry), ze stałym, małym skutkiem (np. +1 pp marży, −5% kosztów transportu, +10% tempa badań). Bot wybiera według cech CEO i sektora, a gracz w spółce kontrolowanej sam. Profile są widoczne na karcie spółki jako „ścieżka rozwoju”. Zasada średniej zero nie dotyczy (to nagroda za rozwój), ale suma skutków jest ograniczona widełkami marż | test: każdy profil wybrany przez 5–30% spółek; marże szczebla Międzynarodowa − Lokalna ≤ 4 pp |
| **K5** | **Spółki OTC** zamiast `privateCompanies`: zagregowana moc produkcyjna per miasto × dobro (bez obiektów spółek, tanio dla CPU), część podaży krajowej w grafie; rośnie przy wysokiej cenie dobra i spada przy nadwyżce. Kalibracja `b = 1` na starcie z mocą OTC. Stare zaślepki usunięte (migracja: brak zawartości do przeniesienia) | test: masa grafu zachowana (`checkChainMass`); `b = 1` na starcie; czas kroku + ≤ 10 ms |
| **K6** | **Organiczne IPO z deficytu:** gdy w ogniwie przez ≥ 3 kw. b < 0,85 i marża ogniwa > średnia + 2 pp, z mocy OTC tego miasta i dobra **materializuje się spółka** (np. stalownia w zagłębiu) i debiutuje (ścieżka IPO z 0.18.4 A3, szczebel Lokalna albo Regionalna). Debiut zabiera część mocy OTC. Startupy losowe zostają, ale z wagą sektora według deficytu. Limity liczby spółek bez zmian | test: w 20 latach 30–60% debiutów w ogniwach z niedoborem; liczba spółek w limitach 0.18.4 A4 |
| **K7** | **Import awaryjny:** ponad limit `importHeadroom` odbiorca może kupić brakującą część po cenie ×1,5–2 (przez `costPass`). Twardy niedobór (`shortagePass`) działa tylko na część, której import awaryjny nie pokrył (np. przepustowość szlaku z 0.19.1 P5a) | test: kwartały z niedoborem > 20% spadają o ≥ 50% względem K0; marże odbiorców ± 0,3 pp |
| **K8** | **Relacje firm z grafu:** nowe kooperacje dobierane z grafu (dostawca i odbiorca tego samego dobra, ten sam albo sąsiedni szczebel miasta), a nie losowo. Przy szczeblu Krajowa+ również kontrakty dostaw z ceną stałą na 4 kw. (osłona przed skokiem ceny wsadu, jak `getChainContractFactor`) | test: ≥ 70% nowych kooperacji zgodnych z grafem; liczba kooperacji ±20% od K0 |
| **K9** | **UI:** karta spółki (szczebel, 4 filary z paskami i słowem, co odblokuje następny szczebel, profile, miasta siedziby i oddziałów), lista spółek (szczebel w wierszu i filtr), Państwo → mapa kraju (siedziby i OTC na mapie z 0.19.2). Ikony SVG, ciemny motyw, kolor nie jest jedynym nośnikiem | test DOM karty i filtra |
| **K10** | **Kontrola** (seria 24 × 6,5 roku i 10 × 20 lat, `raporty/kontrola_0.20.md`) | GIG 20 lat 10–13% i ± 0,3 pp od bazy; marże 0 ± 0,3 pp; zanieczyszczenie bez pogorszenia; elitarne jak w 0.18.9; czas kroku ≤ 900 ms/kw.; zapis + ≤ 5%; 0 błędów w 40 grach |

**Pliki:** `corp.js` (nowy: szczeble, filary, profile, odblokowania), `companies.js` (działy botów, `privateCompanies` → OTC, debiuty z deficytu, kooperacje z grafu), `chains.js` (moc OTC, import awaryjny), `core.js` (`demandIndex` z dochodu miast), `state.js` (miasta z 0.19.2: dochód gospodarstw, pojemność), `listings.js` (debiut z OTC), `ui.js` (karta, lista, mapa), `main.js` (migracja zapisu), `tests/`.

**Zależności:** 0.19.2 Mapa kraju (miasta, pojemność, oddziały, Stolica), 0.19.1 P5a (przepustowość), 0.18.7 E0 (mediana rynku i poziomy giełd), 0.18.4 A3 (ścieżka IPO).

## Makiety dla designu (po akceptacji szkicu)

| Makieta | Część | Zakres |
|---|---|---|
| Karta spółki: ścieżka rozwoju | K1, K4, K9 | szczebel, 4 filary (pasek i słowo), następny próg i odblokowania, profile, wybór profilu w spółce kontrolowanej |
| Lista spółek: szczebel | K9 | znaczek szczebla w wierszu, filtr |
| Mapa kraju: siedziby i OTC | K5, K9 | warstwa na mapie z 0.19.2: siedziby, oddziały, moc OTC per miasto (dobro i skala) |

## Ryzyka

- **Obieg płac (K2) to pętla sprzężenia** (zwolnienia → spadek popytu → spadek przychodu → zwolnienia). Potrzebny limit zmiany na kwartał i pomiar w czarnych łabędziach (0.18.8 D5).
- **Drabina a poziomy giełd:** dwie skale wielkości mylą gracza. Na karcie muszą mieć różne nazwy i opis („zasięg” wobec „parkiet”).
- **OTC zmienia podaż w grafie:** wymaga ponownej kalibracji `b = 1` i pomiaru marż.
- **Zakres:** 0.20 jest duża (L). Jeśli specyfikacja pokaże więcej niż 10 części, dzielimy na 0.20.1 (K0–K4: drabina, płace, działy) i 0.20.2 (K5–K9: OTC, IPO, import, relacje, UI).

## Propozycje planowania (do potwierdzenia przy specyfikacji)

- **Propozycja planowania:** podział 0.20 na 0.20.1 i 0.20.2 jak w ryzykach.
- **Propozycja planowania:** profile z K4 przechodzą na córki (córka dziedziczy jeden profil matki).
