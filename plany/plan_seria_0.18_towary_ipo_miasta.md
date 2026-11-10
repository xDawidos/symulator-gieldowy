# Seria 0.18–0.19: towary, łańcuchy, bilans surowcowy, IPO i miasta (szkic, 2026-11-03)

Nic w tym pliku nie zmienia wersji do 0.17.5 włącznie. Liczby są **startowe** (do strojenia w bramkach). Źródła: rozmowa z użytkownikiem 2026-11-03 oraz przegląd `commodities.js`, `reits.js`, `listings.js`, `companies.js` (IPO).

## 0. Decyzje z rozmowy (zatwierdzone)

- **Cel gry:** zostanie CEO i/lub przejęcie innych funduszy. Dodatkowe tryby: symulowane fundusze (gra obok botów-funduszy).
- **Złoto i srebro** konsumuje też Mennica (wytwarza pieniądze). Mennica jest eksperymentem z wyłącznikiem.
- **Podział dóbr:** materiały, półprodukty, dobra kapitałowe, końcowe zwykłe, końcowe luksusowe. Piwo zwykłe; wino, whiskey, słodycze, pojazdy luksusowe, odrzutowce, jachty luksusowe. Herbata: w Azji (JP, CN, TW, IN) zwykła, poza Azją luksusowa (jedno pole „klasa wg kraju”). Samolot cywilny to dobro kapitałowe, odrzutowiec biznesowy to luksus.
- **Kopaliny:** żelazo, miedź (+srebro jako współprodukt), ziemie rzadkie, siarka, uran, węgiel, ropa, gaz, złoto. Leśnictwo i papier to osobny przemysł. Guma tylko z ropy. Baterie w Chemii. Kawa tylko jako kontrakt (bez producenta i odbiorcy). Bez tytoniu i bawełny.
- **Rakiety** na razie konsumują samoloty (uproszczenie; do zmiany przy lotnictwie wojskowym).
- **Rozdzielone:** Budowlany (wykonawca) i Nieruchomości (właściciel).
- **Energia** zostaje w Przemysł i Surowce, a nie w osobnej grupie.
- **Wydajność:** profil kwartału, graf na poziomie podsektor × kraj, receptury jako `Float32Array` i mnożenie macierzy, poziomy szczegółu spółek, Web Worker, ograniczenie renderowania przy ×200, WebAssembly (po profilu).

## 1. Wnioski z przeglądu kodu

| # | Znalezisko | Skutek dla planu |
|---|---|---|
| K1 | `commodities.js` to **model wpływu cen** (względem średniej 8 kw.), a nie bilans ilości. Nie ma podaży ani popytu; cena jest egzogeniczna, `COMMODITY_IDS` to stałe 7 | Bilans surowcowy jest **nowy**; nie rozszerzamy starego modelu cen, tylko dodajemy warstwę obok |
| K2 | Profil surowcowy spółki jest liczony z tabel (`COMMODITY_ASSIGNMENTS` po symbolu, `COMMODITY_SECTOR_INPUTS`) przy każdym wyniku kwartalnym, w pętli po segmentach | Przy ~35 dobrach wynik policzyć raz na podsektor × kraj i trzymać w tablicy, a spółka tylko czyta |
| K3 | `metals` to jeden surowiec (indeks miedź/żelazo) w przypisaniach MLD, KJM, UOW, TKS, SSA, GLK i w zdarzeniu `strike` | Rozdzielenie na `iron` i `copper` w 0.18.2 z migracją zapisów (stara cena `metals` → obie ceny startują od średniej) |
| K4 | Zapis surowców trzyma 104 tygodnie + 80 kwartałów historii na surowiec (ok. 1300 liczb dla 7) | Dobra wewnętrzne trzymają tylko 40 kwartałów, bez historii tygodniowej |
| K5 | Teksty zdarzeń surowcowych mają emoji (⛴️🌾☢️🪙) | Wymiana na ikony SVG (reguła UI: ikony zamiast emoji) |
| K6 | `getCommodityIndustryDemand()` bierze fazę cyklu tylko kraju startowego (komentarz `shortcut`) | Graf podsektor × kraj daje popyt per kraj; ten skrót znika |
| K7 | `reits.js` jest DOM-free i już rozdziela wykonawcę od właściciela: REIT zleca budowę (`orderReitBuilding`) i księguje aktywa. Typy portfela: mieszany, biura, handel, magazyny, zdrowie, hotele. Są 4 REIT-y po symbolu (`REIT_PROFILES`) | Nieruchomości = istniejące REIT-y plus nowy typ `residential`. Galerie handlowe to typ `retail`, magazyny to `warehouse`; nie tworzymy nowej klasy spółek |
| K8 | Projekty budowlane (`office_building`, `residential_complex`, `shopping_center` itd.) siedzą w `companies.js` z kosztem, czasem i premią | Miasta i Budowlany używają tej samej listy projektów; trzeba tylko dodać miasto jako zamawiającego |
| K9 | Wymogi giełd to **dwie osie**: rynek (GPW/NH/PRV z progiem kapitalizacji, free float, zysk w `listings.js`) i poziom giełdy po cenie (BRONZE… PLATINUM… DIAMOND, `rankBased` dla diamentu) | Ocena kredytowa dochodzi jako trzecia oś; tabela wymogów w sekcji 6 |
| K10 | Sufity: `LISTING_HARD_CAP` 110 (krajowe), `LISTING_TOTAL_CAP` 150 (zwykłe łącznie). Banki, REIT-y, instytuty i startupy są poza sufitem | ~40 nowych spółek z nowych podsektorów nie zmieści się bez rozszerzenia sufitu albo kolejki; patrz sekcja 6 |
| K11 | **Worker:** `commodities.js`, `reits.js`, `listings.js` nie dotykają DOM (0 odwołań). Ale `companies.js` ma 131 odwołań do DOM/okna, `state.js` 94, `player.js` 74, `core.js` 27, `finance.js` 25. Logika miesza się z interfejsem (np. sponsoring banku startupu w `companies.js` odświeża panel startupów) | Worker całej symulacji jest **etapem 2**. Najpierw nowy graf jako czysty moduł (od razu do Workera), potem wycinanie DOM z logiki |

## 2. Rejestr dóbr

Klasy: **M** materiał, **P** półprodukt, **K** dobro kapitałowe, **Z** końcowe zwykłe, **L** końcowe luksusowe. „Kontrakt” = ma instrument na giełdzie towarowej; reszta liczona wewnętrznie z bilansu.

| Dobro | Kl. | Producent (podsektor) | Główni odbiorcy | Kontrakt |
|---|---|---|---|---|
| Ruda żelaza | M | Górnictwo żelaza | Huty | tak (z `metals`) |
| Miedź | M | Górnictwo miedzi | Energetyka (budowa, sieci), baterie, elektronika, Mennica | tak (z `metals`) |
| Srebro | M | współprodukt miedzi (stały współczynnik) | elektronika, sprzęt medyczny, Mennica, luksus | nie |
| Złoto | M | Górnictwo złota | Mennica, luksus, bezpieczna przystań | tak (jest) |
| Ziemie rzadkie | M | Górnictwo ziem rzadkich (skupione w jednym kraju, np. CN) | półprzewodniki, baterie, drony | nie |
| Siarka | M | Górnictwo siarki + współprodukt rafinerii | chemia, nawozy, farmacja, amunicja | nie |
| Uran | M | Górnictwo uranu | Energetyka jądrowa | tak (jest) |
| Węgiel, Ropa, Gaz | M | Górnictwo energetyczne, upstream | energetyka, rafinerie, chemia | tak (są) |
| Drewno | M | Leśnictwo | papiernie, tarcica, beczki | nie |
| Zboże | M | Rolnictwo | piwo, przemysł spożywczy, mięso (pasza) | tak (jest) |
| Cukier, owoce, mięso | M | Rolnictwo (plantacje, hodowla) | przemysł spożywczy, słodycze, wino, whiskey | nie |
| Herbata | M/Z/L | Rolnictwo (Azja) | konsumpcja (zwykła w Azji, luksus poza nią) | nie |
| Kawa | — | brak (tylko cena) | brak | tak (nowy, 8. kontrakt) |
| Stal | P | Huty | maszyny, stocznie, motoryzacja, budownictwo, obronność | nie |
| Tarcica | P | Leśnictwo | budownictwo | nie |
| Papier | P | Papiernie | Mennica, gazety, farmacja, uczelnie, słodycze (opakowania) | nie |
| Paliwa | P | Rafinerie | transport, rolnictwo, maszyny, wojsko | nie |
| Półprodukty chemiczne | P | Rafinerie | chemia polimerowa, farmacja, nawozy | nie |
| Guma | P | Chemia polimerowa (z półproduktów ropy) | maszyny, motoryzacja, samoloty, sprzęt medyczny | nie |
| Nawozy | P | Chemia nawozowa (gaz + siarka) | rolnictwo | nie |
| Baterie | P | Ogniwa i baterie (Chemia): ziemie rzadkie, miedź, chemia, energia | robotyka, drony, sprzęt medyczny, auta | nie |
| Półprzewodniki | P | Fabryki chipów: energia (dużo), ziemie rzadkie, chemia, srebro | AI, gaming, robotyka, drony, auta, samoloty, rakiety, sprzęt medyczny, media cyfrowe | nie |
| Prąd | P | Elektrownie (0.17.2: miks z węgla, gazu, uranu, OZE) | wszyscy | nie |
| Pieniądz gotówkowy | P | Mennica (papier, maszyny, złoto, srebro, miedź) | banki, państwo | nie |
| Maszyny | K | Fabryki maszyn (stal, guma, energia) | wszystkie wytwórcze | nie |
| Statki | K | Stocznie | transport morski, rybołówstwo morskie | nie |
| Samoloty (cywilne) | K | Przemysł lotniczy (max 3 duże spółki) | transport lotniczy, rakiety (uproszczenie) | nie |
| Pojazdy użytkowe | K | Motoryzacja | transport lądowy, obronność, niektóre spółki | nie |
| Roboty | K | Robotyka | przemysł, motoryzacja, górnictwo | nie |
| Sprzęt medyczny | K | Sprzęt medyczny | szpitale | nie |
| Żywność, piwo | Z | Przemysł spożywczy, browarnictwo | obywatele (przez handel) | nie |
| Leki | Z | Farmacja | obywatele, szpitale | nie |
| Samochody osobowe, gry, informacja | Z | Motoryzacja, Gaming, Media | obywatele | nie |
| Wino, whiskey, słodycze, pojazdy luksusowe, odrzutowce, jachty | L | Alkohole, Słodycze, Motoryzacja, Lotnictwo, Stocznie | klasy wyższe | nie |

**Zasady:**
- **Materiał i półprodukt** zużywa się w kwartale produkcji. **Dobro kapitałowe** nie jest „zjadane” przez recepturę, tylko kupowane jako inwestycja i amortyzowane (patrz 4).
- Pole `klasa wg kraju` ma tylko herbata; reszta ma klasę stałą.
- Dobra wewnętrzne mają cenę z bilansu (sekcja 5), kontraktowe dalej mają cenę egzogeniczną z `commodities.js` z małym sprzężeniem.

## 3. Łańcuchy produkcji (pilotaż: 1–3; reszta w 0.18.4–0.18.9)

1. **Metale → motoryzacja i statki (pilotaż):** ruda żelaza → huta (stal; węgiel/energia) → maszyny → motoryzacja, stocznie, przemysł lotniczy → transport → konsument (luksus: jachty, pojazdy luksusowe).
2. **Ropa i gaz → paliwa i chemia (pilotaż):** ropa → rafinerie (paliwa + półprodukty + siarka) → paliwa do transportu; półprodukty → chemia polimerowa (guma) → maszyny, motoryzacja, sprzęt medyczny. Prąd z gazu/oleju robią elektrownie, nie rafinerie.
3. **Zboże → żywność (pilotaż):** pola (nawozy z chemii, paliwa, maszyny) → przemysł spożywczy / browarnictwo → handel → konsumpcja. Cukier i owoce → słodycze, wino, whiskey (+drewno na beczki).
4. **Drewno → papier:** Leśnictwo → papiernie → Mennica, gazety, farmacja, uczelnie, opakowania słodyczy; tarcica → budownictwo.
5. **Miedź i srebro → elektronika i energia:** kopalnia miedzi (+srebro) → sieci i bloki energetyczne, baterie, elektronika, sprzęt medyczny, Mennica.
6. **Ziemie rzadkie → baterie i chipy:** wydobycie (jeden kraj dominuje) → ogniwa i półprzewodniki → robotyka, AI, gaming, drony, auta, sprzęt medyczny. Węzeł wrażliwy na szok i na handel światowy (0.20).
7. **Uran → energetyka jądrowa:** wydobycie → blok (projekt w 3 etapach: badania → budowa konsorcjum do 3 firm → uruchomienie) → prąd.
8. **Pieniądz:** papier + maszyny + złoto + srebro + miedź → Mennica → gotówka → banki i państwo. Bankowość elektroniczna obniża popyt na gotówkę.
9. **Obronność:** metale + chemia (siarka) + półprzewodniki + baterie + pojazdy + samoloty (rakiety) → drony, amunicja, pojazdy bojowe, rakiety → bezpieczeństwo państwa (S6 z 0.17).
10. **Zdrowie:** chemia + papier + siarka → farmacja; guma + metale + maszyny + srebro + baterie → sprzęt medyczny → szpitale → zdrowie obywateli (0.19.1).

## 4. Wykorzystanie towarów

**Udziały popytu** (startowe, sumują się do 100% w wierszu; to jest kalibracja bilansu: na starcie podaż = popyt).

| Dobro | Udziały odbiorców |
|---|---|
| Stal | motoryzacja 25%, maszyny 25%, budownictwo 20%, stocznie 12%, obronność 8%, inne 10% |
| Paliwa | transport 50%, rolnictwo 12%, maszyny i przemysł 18%, wojsko 8%, inne 12% |
| Półprodukty chem. | guma 30%, farmacja 20%, nawozy 20%, inne chemia 30% |
| Guma | motoryzacja 40%, maszyny 25%, samoloty 15%, sprzęt medyczny 10%, inne 10% |
| Papier | Mennica 15%, gazety 25%, farmacja 15%, uczelnie 10%, opakowania 25%, inne 10% |
| Baterie | robotyka 30%, drony 20%, sprzęt medyczny 20%, auta 30% |
| Półprzewodniki | AI 20%, gaming 15%, robotyka 15%, auta 15%, drony 10%, media cyfrowe 10%, inne 15% |
| Ziemie rzadkie | półprzewodniki 45%, baterie 45%, drony 10% |
| Miedź | energetyka (budowa i sieci) 35%, baterie 20%, elektronika 20%, budownictwo 15%, Mennica 5%, inne 5% |
| Srebro | elektronika 45%, sprzęt medyczny 20%, Mennica 20%, luksus 15% |
| Złoto | Mennica 25%, luksus 30%, rezerwa i bezpieczna przystań 45% |

**Dobra kapitałowe (amortyzacja):** zasób K per podsektor × kraj zużywa się z `δ`: maszyny 2%/kw., pojazdy 3%/kw., statki 1%/kw., samoloty 1,2%/kw., roboty 3%/kw. Popyt kwartalny = `δ·K` + inwestycje ekspansji spółek. Transport „konsumuje” statki, samoloty i pojazdy wyłącznie w ten sposób, więc bez zakupów flota starzeje się i traci przepustowość.

**Dobra luksusowe:** popyt zależy od udziału klas wyższych (0.13) i reaguje 2–3 razy mocniej na recesję niż dobra zwykłe (hierarchia dóbr z dawnego L8).

## 5. Bilans surowcowy

### 5.1 Zasada: dwie warstwy cen

1. **Giełda towarowa (jest, 0.17):** ceny egzogeniczne. Zasada „ceny nie zależą od gracza ani botów” zostaje.
2. **Bilans (nowy):** ceny wewnętrzne dóbr z podaży i popytu. Sprzęga się z giełdą jednokierunkowo i słabo: cel `M` kontraktu mnożymy przez `(b_świat)^(−0,3)` w widełkach ±15%, gdzie `b_świat` to bilans światowy tego dobra. Wystarczy, żeby kopalnie i huty widziały koszt, a gracz nie mógł „drukować” surowców.

### 5.2 Model (co kwartał, poziom podsektor × kraj)

- **Aktywność** `x_j` podsektora j (1,0 = poziom startowy) z wyników spółek i cyklu sektora. **Zdolność** `c_j` z liczby i wielkości spółek, inwestycji i amortyzacji.
- **Popyt** na dobro g: `D_g = Σ_j A[g][j] · x_j` (macierz `A`: udziały z tabeli w sekcji 4, `Float32Array`).
- **Podaż**: `S_g = Σ_j B[g][j] · min(x_j, c_j)` (macierz `B`; współprodukt, np. srebro z miedzi, to osobny wiersz `B`).
- **Zapas** `z_g` (magazyny, Nieruchomości: logistyczne): `z ← clamp(z + S − D, 0, pojemność)`, cel pokrycia 0,5 kwartału.
- **Bilans** `b_g = (S_g + (z_g − z*_g)/τ) / D_g`, `τ` = 2 kw.
- **Cena wewnętrzna:** `P_g = P0_g · b_g^(−ε)`, `ε` = 0,5, widełki 0,5–2,0 × P0, wygładzenie `θ` jak w S1. Na starcie `b = 1` z konstrukcji, więc wyniki „średnio zero” (jak w 0.17) zachowane.
- **Niedobór** (`b < 1`): odbiorcy dostają `b` ich potrzeby (priorytet: obronność i państwo, potem reszta proporcjonalnie). Aktywność odbiorcy spada o `(1 − b)` ważone udziałem tego wsadu w jego kosztach; spółka widzi to jako niższy przychód w raporcie. Cykle (np. maszyny → maszyny) łamiemy **opóźnieniem 1 kwartału** (dostępność z poprzedniego kwartału).
- **Import:** niedobór pokrywa import z krajów z nadwyżką do limitu przepustowości (port/lotnisko/magistrala z 0.17 S5), koszt = fracht (S4) + cło (0.20). Do 0.20 cła = 0.
- **Szoki:** strajk w kopalni, blokada cieśniny, wypadek reaktora zmniejszają `c_j` na kilka kwartałów; skutek idzie w dół łańcucha z opóźnieniem (efekt byka, jak w planie 0.18).
- **Pilotażowa bramka:** średnia odchyłek marż sektorów 0 ± 0,3 pp, GIG ±1 pp, czas kroku ≤ budżet z 0.18.0.

### 5.3 Wydajność

- Graf ma ~35 dóbr × ~45 podsektorów × ~10 krajów; liczy się raz na kwartał jako mnożenie macierzy. To rzędu dziesiątek tysięcy operacji, wielokrotnie mniej niż pętla po ~100 spółkach.
- Wynik trafia do tablicy `czynnik[podsektor][kraj]` (przychód, marża), a spółka tylko go czyta. Znika przeliczanie profilu z segmentów (K2).
- Moduł grafu jest czysty (bez DOM), więc od razu może działać w Workerze.

## 6. Nowe IPO

### 6.1 Stan w kodzie

Startup z inkubatora trafia przez `chooseDebutMarket(cap)`: GPW od 90 000, NH od 24 000, PRV od 5 000, o ile jest wolne miejsce (sufity 110/150), inaczej czeka (`awaitingListing`). Poziom giełdy (JUNK→PLATINUM) wynika z ceny akcji, a RUBY, EMERALD i DIAMOND z rankingu kapitalizacji.

### 6.2 Przebieg nowego IPO

1. **Gotowość:** startup/spółka prywatna spełnia próg kapitalizacji rynku docelowego.
2. **Audyt:** spółka zamawia audyt u firmy B2B (0.18.9/0.18.11). Wynik: ocena AAA–D, ważna 4 kwartały.
3. **Opiekun emisji:** wybór banku inwestycyjnego (reputacja, prowizja 3–7%). Gracz wybiera, gdy sam prowadzi spółkę; boty losują wg reputacji.
4. **Cena emisyjna:** wycena × (1 − dyskonto 5–15%). Dyskonto maleje z oceną i reputacją banku, rośnie w bessie. Gorąca hossa daje „pop” pierwszego dnia (premia do ceny po debiucie).
5. **Subskrypcja:** boty i gracz zapisują się; przy nadsubskrypcji redukcja proporcjonalna. Bessa albo ocena poniżej progu może **wycofać** emisję (spółka czeka kwartał).
6. **Wejście:** rynek i poziom giełdy z tabeli niżej; ograniczenia sufitów przez kolejkę jak dotąd.

### 6.3 Wymogi zsumowane

| Oś | Wymóg |
|---|---|
| **Rynek** (jest) | PRV: kap. ≥ 5 000, bez zysku, ocena niewymagana. NH: kap. ≥ 24 000, free float 20%, zysk (innowacyjne zwolnione), ocena ≥ BB. GPW: kap. ≥ 90 000, free float 30%, zysk, ocena ≥ BBB |
| **Poziom giełdy** (jest + nowe) | JUNK–SILVER: bez oceny. GOLD: ≥ BBB. PLATINUM: ≥ A. RUBY: ≥ A+ i miejsce w rankingu. EMERALD: ≥ AA i miejsce w rankingu. DIAMOND: ≥ AAA i miejsce w rankingu (RUBY, EMERALD, DIAMOND są w kodzie przydzielane po rankingu kapitalizacji, `rankBased`) |
| **Brak oceny przy wzroście ceny** | Spółka, której cena przekracza próg poziomu, a nie ma wymaganej oceny, **zostaje na poprzednim poziomie** do audytu (to nowość: ocena jest bramką awansu, nie tylko wejścia) |

### 6.4 Ryzyka i nadużycia

- Audytor może się **pomylić** (szum oceny ±1 stopień) albo być **przekupiony** (ocena zawyżona; ujawnienie → spadek kursu, kara i utrata licencji audytora, śledztwo policji; w kraju z silną mafią szansa przekupstwa rośnie). Audytor Big 3 myli się rzadziej niż mała firma.
- Spółki same kupują audyt i ujawniają tylko ocenę ≥ A: gracz widzi, że brak oceny często znaczy „słaba” (błąd selekcji, element nauki).
- Subskrypcja **kwartalna** (nie miesięczna): 2 losowe oceny spółek na kwartał, poziomy subskrypcji do testu.
- Sufity: nowe podsektory dodają ~40 spółek, więc **podnosimy `LISTING_HARD_CAP` 110 → 130 i `LISTING_TOTAL_CAP` 150 → 180** (decyzja 2026-11-03). Wartości startowe; weryfikacja czasu kroku i zapisu w bramce 0.18.0. Kolejka `awaitingListing` zostaje.

### 6.5 Spółki, które powstają jako startupy

AI (wojskowe, naukowe, społeczne), OZE, Kosmos, Gaming, DeepTech, Fintech, MedTech/BioTech (już są). Mennica, uniwersytety, szpitale państwowe nie robią IPO.

## 7. Miasta 2 (0.19.2)

### 7.1 Model

- Każdy kraj dzieli się na kilka **miast** (PL: 6, kraje obce: 3–4). Miasto: ludność i struktura klas (0.13), **infrastruktura** (drogi, kolej, energia, łącza; 0–100), zanieczyszczenie, zadowolenie, podatek lokalny, budżet, lista projektów i spółek z siedzibą.
- **Graf towarów zostaje na poziomie podsektor × kraj** (nie × miasto). Miasto modyfikuje: koszt i dostępność pracy, limit rozwoju, zanieczyszczenie i zadowolenie. Dzięki temu miasta nie mnożą macierzy.
- **Oddziały spółek:** spółka może otworzyć oddział w mieście (zatrudnia tam). Oddział zwiększa aktywność podsektora, ale zużywa pojemność miasta.
- **Pojemność miasta** = f(infrastruktura, ludność, wykształcenie). Przekroczenie → rosną koszty pracy i podatki, rośnie zanieczyszczenie, spada zadowolenie.
- **Projekty miasta** (to samo `MEGA_PROJECTS` i lista projektów budowlanych, tylko zamawiającym jest miasto), przetargi dla Budowlanego, infrastruktura z 0.17 S5 na poziomie kraju jako tło.

### 7.2 Zasady wynikające z rozmowy

- **1 uniwersytet na miasto**. Bonus dla spółek „obok” liczony z tabeli giełdowej (ten sam sektor/poziom), nie z mapy miast.
- **Galerie handlowe** = REIT typ `retail` (Nieruchomości), na giełdach prywatnych także prywatne i miejskie. Są ogniwem dystrybucji: część konsumpcji dóbr końcowych w mieście realizuje się tylko przez powierzchnię handlową (galerie, sieci handlowe, e-commerce). Brak galerii = niższa sprzedaż dóbr końcowych.
- **Szpitale i uniwersytety** zależą od miasta (potrzeby i klasy: 0.19.1).

### 7.3 Ryzyko

Miasta dotykają zapisu (kilkadziesiąt obiektów), czasu kroku (oddziały) i UI (mapa). Dlatego po 0.19.1 i po bramce wydajności.

## 8. Wydajność: kolejność i ocena

| Etap | Zakres | Uwagi |
|---|---|---|
| 0.18.0 a | Profil kwartału; ustalenie budżetu ms/kw. dla całej serii; wycięcie z logiki wywołań DOM tam, gdzie są najgorsze | Aktualnie 1484–1667 ms/kw. wg kontroli S4, limit z S7 (1334) jest już przekroczony: najpierw nowy budżet |
| 0.18.0 b | Poziomy szczegółu spółek (= jak często gra liczy daną spółkę dokładnie): gracz, polubione, duże co tydzień; małe i zagraniczne co kwartał **z doliczeniem zaległości** (lazy catch-up) po dodaniu do polubionych | LOD dotyczy fundamentów (raport, dywidenda, zdarzenia); kurs ruszany lekkim szumem. Musi być statystycznie neutralny (pomiar GIG), inaczej obserwowanie spółki zmieniałoby jej los |
| 0.18.1 | Nowy graf jako czysty moduł z `Float32Array`; **nie dotyka DOM** | Gotowy do Workera od pierwszego dnia |
| 0.18.x | Web Worker dla symulacji: najpierw graf i surowce, potem rdzeń | Rdzeń zależy od wycięcia DOM z `companies.js` (131 odwołań), `state.js` (94), `player.js` (74); to osobny, duży etap |
| po profilu | WebAssembly tylko dla wskazanych gorących pętli | Bez przepisywania całości |
| ×200 | Ograniczenie renderowania: rysujemy co N-ty krok, panele zamknięte nie liczą widoków | Szybkie do zrobienia; kalendarz „co 2 liczby” (ze zgłoszeń) wynika prawdopodobnie z tej samej kwantyzacji |

## 9. Kolejność wersji (od 0.18; wszystko do 0.17.5 bez zmian)

| Wersja | Zakres |
|---|---|
| 0.18.0 | Wydajność a/b i budżet czasu; poprawki z gry, o ile nie ma ich w 0.17.5 |
| 0.18.1 | Rejestr sektorów, dóbr (klasy), ustaw i receptur jako dane; graf i bilans (sekcja 5) w trybie cichym (liczy, nic nie zmienia) |
| 0.18.2 | Surowce: podział kopalin, Leśnictwo, rozdzielenie `metals`, kawa |
| 0.18.3 | Chemia: guma, baterie, papier, nawozy, farmacja; rafineria bez prądu |
| 0.18.4 | Przemysł ciężki i motoryzacja: maszyny, stocznie, lotnictwo, sprzęt medyczny; kapitałowe z amortyzacją |
| 0.18.5 | Rolnictwo i żywność; **bramka pilotażu** (3 łańcuchy) |
| 0.18.6 | Technologia |
| 0.18.7 | Obronność |
| 0.18.8 | Budownictwo i Nieruchomości (dodać typ `residential`) |
| 0.18.9 | Usługi |
| 0.18.10 | Finanse (banki, filie, Mennica, Lombardex/Limbard, Wrona, księgowość) |
| 0.18.11 | Audyt, oceny i nowe IPO (sekcja 6) |
| 0.19.1 | Społeczeństwo 2, Zdrowie i Nauka |
| 0.19.2 | Miasta 2 |
| 0.19.3 | Bramka testowa |

Sekcje 6 i 7 mogą wejść wcześniej lub później, ale bilans (5) musi być w 0.18.1, bo od niego zależy kalibracja kolejnych grup.

## 10. Otwarte

Rozstrzygnięte 2026-11-03: srebro **bez kontraktu** (zostaje dobrem wewnętrznym); sufity podniesione (6.4); poziomy elitarne PLATINUM > RUBY > EMERALD > DIAMOND (6.3).

Rozstrzygnięte 2026-11-03: poziomy szczegółu obejmują **tylko spółki**; boty i fundusze liczone co tydzień jak dotąd.

1. Ile miast per kraj dla krajów obcych (3–4 to propozycja).

## 11. Co nie zostało sprawdzone

Receptury i udziały w tabelach to propozycja projektowa, nie kalibracja. Nie uruchamiałem gry, testów ani przebiegów. Czas kroku nowego grafu nie jest zmierzony. Liczba odwołań do DOM pochodzi z `grep`, nie z analizy zależności.

## 12. Cel gry (stan 2026-11-03)

**Zatwierdzone:** celem jest zostanie **CEO** i/lub **przejęcie innych funduszy**. Dodatkowe tryby: gra obok **symulowanych funduszy** (boty-fundusze jako rywale).

Starsze pomysły z notatek (`roadmap.txt`, dawny „plany poprawione przez ai.txt”), do włączenia albo odrzucenia przy rozpisywaniu celu:
- **Wygrana przez giełdę diamentową:** gracz jest większościowcem w spółce diamentowej przez 5 (w `roadmap.txt` 10) minut gry. Przy obecnym rankingu (RUBY/EMERALD/DIAMOND po kapitalizacji) to kandydat na jeden z wariantów „przejęcia”.
- **Firma „Boss”** jako warunek zwycięstwa (pkt 2.6 starego planu, nigdzie nierozpisany).
- **Zdefiniowanie celu gry** (pkt 1.2 starego planu): nadal otwarte.

**Rozpisane w `plan_cel_gry.md`** (uwaga: cel CEO/przejęcie istnieje już w kodzie, plan opisuje jego rozwinięcie). Zakres: ścieżka CEO (progi stanowisk z CV, szansa na fotel prezesa), przejęcie funduszu (jednostki uczestnictwa, kontrola zarządu, reakcja botów i KNF), warunki porażki, długość gry (6,5 roku / 20 lat) i tryb symulowanych funduszy.

## 13. Dopiski z 0.17.2 (2026-11-06)

- **Prąd powszechny:** w łańcuchach niemal każdy sektor bierze prąd. Trzeba to zbalansować i zmierzyć.
- **Miasta:** mają własne zużycie prądu (0.19.2), także do pomiaru.
- **ESG:** rozwinięcie ścieżki z 0.17.2: spółki idą w ekologię, oceny i koszty, wymaga poziomu UEiE.
- **Podwykonawcy:** rozbudowa i uporządkowanie rynku. Powstawanie nowych, specjalności, geolodzy i energetyczni z 0.17.2.
- **Poziom życia:** wskaźnik z 0.17.2 (konsumpcja i zadowolenie, zdrowie, bezpieczeństwo, edukacja i nauka, informacja) pogłębia 0.19.1, a 0.19.2 przenosi go na miasta.
- **Blok jądrowy:** 3 etapy zastępują mechanikę z 0.17.2.

## 14. Dopiski z 0.17.1 (2026-11-08)

- **Punkt kontrolny GIG 20 lat (S2 z 0.17.1):** w 0.17.1 13,5% rocznie (cel 8–11%), odziedziczone od 0.15.1, nie strojone. Zmierzyć ponownie seriami 20-letnimi po wejściu miast i łańcuchów surowcowych. Jeśli wynik jest gorszy niż 13,5%, stroić w tej wersji.
- **Ruch klas (do 0.19.1):** w 0.17.1 udziały klas przez 8 lat zmieniają się najwyżej o 1–2 pp i raczej w dół (średnia 24 → 23%). Nikt nie awansuje. Zdiagnozować razem z pytaniem, czemu realna gospodarka nie rośnie, a po zmianie sprawdzić wybory (wagi `CLASS_VOTE` są strojone na stałej strukturze).
