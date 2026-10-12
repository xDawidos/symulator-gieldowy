# Plan 0.15 „Giełda międzynarodowa” (szkic, po 0.14; mapa całości: `plan_0.13-0.15_mapa.md`)

Cel: nasza giełda wychodzi za granicę.
- Dochodzą waluty i kantor, a potem forex.
- Gracz poznaje zagraniczne spółki. Najpierw pojedyncze (wydarzenie „Gigant wkracza na scenę”), potem przez lotnisko i bilety na zagraniczne rynki, a na końcu przez trwałe połączenie giełd.
- Każdy kraj ma stereotypowe spółki, swoje spółki państwowe, boty i cechy prezesów.

Czego to uczy:
- **Ryzyko walutowe:** zysk z akcji zagranicznej może zjeść kurs waluty.
- **Spread kantoru**, kwity depozytowe (ADR/GDR), forex, dźwignia i depozyt zabezpieczający.
- **Przewagi narodowe:** dlaczego Niemcy mają motoryzację i chemię, Tajwan półprzewodniki, a Szwajcaria banki.
- **Konsolidacja giełd:** co oznacza dla prowizji, płynności i inwestorów.

Kolejność: G0 → G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8. Każdy etap z testami, przebiegiem ×200 (po 0.14 T0) i commitem.

**Zależność:** budujemy po 0.14, bo korzystamy z jej segmentów (T1), podsektorów (T2), specjalizacji-nisz (T3), spin-offów (T4) i spółek zależnych (T6). Pracownicy i związki z 0.13 obejmują też spółki zagraniczne (G2, „Profil kraju”).

---

## Punkt wyjścia (stan kodu)

- **Kraje startowe:** `START_COUNTRIES` (`player.js`) — PL, DE, CZ, SE, CH, US, JP, CN, IN. Wszystkie poza PL są zablokowane, z ceną przepustki (`passCost`).
- **Operatorzy rynków** (`finance.js`, markets): GPW, XTD, PLU5, uśpiony EURONEXT (`dormantForever`). Mają prowizje, opłaty za notowanie i inwestowanie w spółki członkowskie.
- **Sektor `Gaming`:** ma profil (`core.js`) i technologie (`companies.js`), ale **żadnej spółki**.
- **Akcje w obrocie:** niezmiennik „akcje w obrocie = suma posiadaczy” (`getTrackedHeldShares`, `getAvailableShares`) musi objąć spółki w obcych walutach i nowych posiadaczy (boty zagraniczne, posiadacze biletów).
- **Limity spółek z 0.13.1:** krajowe luźno ok. 110 (111–115 w porządku), łącznie 150 zwykłych spółek. **Spółki zagraniczne nie liczą się do żadnego z nich** — każdy kraj ma własny limit (G2).
- **Rozmiar zapisu:** po poprawce z 0.13 zapis ma ok. 2,35 MB po 200 kw. Ponad 120 nowych spółek go zwiększy, dlatego spółki krajów, które nie dołączyły, **nie są zapisywane** (tworzone przy dołączeniu z definicji).

## G0. Porządki na starcie (spółki polskie i uniwersalne)

Zmiany obowiązują tylko w nowych grach. Stare zapisy zachowują swoje spółki.

- **Spółki typowo polskie** — tylko przy starcie w Polsce:
  - Miejskie Ziemniaki (dawniej Wieczne Ziemniaki), Konfiturex, Super Makarony;
  - Kopalnie Węgla Mine, Stocznia Morska, Miedź Ludowa, Siarkobrzeg, KrzeUraFos4, Betonex, Annesco;
  - Energa, Tauron, Państwowy Uran, Bałtycka Energia (dawniej Bałtycka Energia Wiatrowa);
  - Orzeł Telekom, Narodowy Operator Cyfrowy;
  - Giereklud, Budipol, Majsterbud, Linapol;
  - Polska Zbrojownia, Orzeł Defence, Grom Systems, Husaria Arms;
  - Bałtyckie Rejsy, Krajoznawsto Obce, Lek-Pol, Uniwersytet Gdański, Czysty Błysk, Pikselowe Marzenia, Błyskawiczna Proteza;
  - **nowe (Gaming):** DVD Project Black, WayPlay.
- **Spółki uniwersalne** — przy każdym starcie, niezależnie od kraju:
  - EcoLube, Elektrownia SA, Alicante Housing, Wolf & Stein Tech., WinPost, Dunder Mifflin, Drużyna Holding, BurgerLand, Beretxol, Plandex, BlueBull, Cyberfood Corp, VitaGen, Meferox, Cyber-Ochrona, WielkiWoltaż, Krawaciarze Inc., Sanitas Szpitale, SuperKonsumpcja!, Universal Projects, Cortex Neural, Nova Robotics, Biurowce Obsługi Rachunkowej;
  - instytuty badawcze GUM Med Research i Instytut Badań Stosowanych;
  - spółki budowlane do przetargów: Budimix, Infrastrukturex, Bractwo Stali, DrogiStal, BobBuild;
  - infrastruktura: banki notowane, holdingi, Lombardex, REIT-y, Fundacja i operator giełdy.
- **Bank Żywności** staje się bankiem: sektor Bankowość, nowa nazwa do ustalenia (propozycja: „Bank Rolno-Spożywczy”).
- **Usunięte** w nowych grach: KolenBreg, Firma Tłusta Pucha, Luksusowe Spinacze, Boazeria Organiczna, DarAwansu, Six Hand.
- **Testy** odwołujące się do usuniętych symboli trzeba przepiąć na inne spółki, bez zmiany sensu testu.

## G1. Waluty i kantor (fundament)

- **Waluty:** PLN, EUR, USD, CHF, SEK, CZK, CNY, JPY, INR, TWD.
- **Kursy:** losowy ruch powracający do średniej, w twardych widełkach (zł za 1 jednostkę). Na kurs wpływają różnica stóp procentowych (makro 0.10.2), kryzysy i wydarzenia krajowe.

  | Waluta | Widełki | Waluta | Widełki |
  |---|---|---|---|
  | EUR | 3,80–5,50 | CNY | 0,45–0,70 |
  | USD | 3,40–5,00 | JPY | 0,022–0,036 |
  | CHF | 3,90–5,60 | INR | 0,040–0,060 |
  | SEK | 0,32–0,48 | TWD | 0,10–0,16 |
  | CZK | 0,15–0,21 | | |

- **Kantor:** kupno i sprzedaż walut z marżą (spread) 1–2%, mniejszą dla dużych kwot. Dostępny **od startu**; waluty można kupować jako spekulację.
- **Gotówka w walutach:** gracz (fundusz), boty i fundusze botów mają `cashByCurrency`.
- **Ceny w walutach:** spółka zagraniczna ma `stock.currency`, a jej cena jest w tej walucie.
- **Wycena w złotych:** NAV, kapitalizacja, ETF-y, ranking, podatki i niezmienniki liczone przez jedną funkcję `toPln(amount, currency)`.
- **Ryzyko regresji:** to największe ryzyko całej wersji. Robimy to pierwsze i pokrywamy testami: NAV funduszu z akcjami w EUR, a potem zmiana kursu — NAV zmienia się tylko o efekt walutowy.
- **Wykres kursu waluty** w oknie kantoru.

## G2. Rynki zagraniczne i spółki

- **Rynki:** każdy kraj to operator rynku jak GPW (prowizja, opłata za notowanie).
  - Niemcy — DAX, Szwecja — SSE, USA — NYSE-podobny („Wall Street Exchange”); nazwy pozostałych rynków do ustalenia.
  - Spółki danego kraju widać w **osobnych zakładkach rynków**, bo tabela główna już jest za długa.
- **Spółki tworzone przy dołączeniu kraju** — z definicji, nie od startu gry:
  - liczba zależy od wielkości kraju;
  - kraj ma przewagę w swoich mocnych branżach;
  - **gigant** zaczyna na wyższym poziomie giełdy, z dużą kapitalizacją.
- **Spółki specjalne** (pogrubione w tabelach) mają po jednej własnej mechanice.
- **Profil kraju dla pracowników (0.13):** spółki zagraniczne mają model pracowników, zadowolenia i związków z 0.13. Pełne społeczeństwo (klasy, ustawy, partie, migracja) jest tylko w kraju startowym. Kraj ma **stały profil**, który zmienia cel zadowolenia, szansę na związek i udział szarej strefy. Marży nie zmienia (zasada kalibracji z 0.13: marżę wyznacza profil sektora).

  | Kraj | Płace (indeks wzgl. PL, do wglądu) | Prawa pracownicze | Szansa związku | Szara strefa |
  |---|---|---|---|---|
  | 🇩🇪 Niemcy | 1,6 | ochronne | ×1,2 (współdecydowanie) | 0 |
  | 🇫🇷 Francja | 1,5 | ochronne | ×2,0 (częste strajki) | 0 |
  | 🇸🇪 Szwecja | 1,5 | ochronne | ×1,5, zadowolenie +5 | 0 |
  | 🇨🇭 Szwajcaria | 1,9 | standard | ×0,6 | 0 |
  | 🇺🇸 USA | 1,7 | liberalne | ×0,5 | +2 pp |
  | 🇯🇵 Japonia | 1,3 | standard | ×0,4 (lojalność) | 0 |
  | 🇨🇳 Chiny | 0,6 | liberalne | ×0,2 (związki państwowe) | +5 pp |
  | 🇮🇳 Indie | 0,3 | liberalne | ×0,8 | +10 pp |
  | 🇨🇿 Czechy | 0,9 | standard | ×0,8 | +2 pp |
  | 🇹🇼 Tajwan | 0,9 | standard | ×0,4 | 0 |

- **Limity spółek (decyzja):** spółki zagraniczne **nie liczą się** do krajowego limitu ok. 110 ani do łącznych 150. Każdy kraj ma własny limit: 1,5 × liczba startowa (np. USA 19 → 28 razem z państwowymi). W zapisie są tylko spółki krajów, które dołączyły.
- **Spółki państwowe** (propozycja, 1–4 na kraj, zależnie od wielkości):
  - pakiet obcego państwa jest poza wolnym obrotem (jak `stateOwnershipPct`);
  - obce państwo **nie korzysta** z naszego `governmentTreasury`;
  - dywidendy państwowe trafiają do „skarbu kraju X”, licznika tylko do wglądu.

### 🇺🇸 USA — 15 + 4 państwowe, USD
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Palant-YR** | Technologia/AI | specjalizacja: szpiegostwo dla obronności; kontrakty wywiadowcze rosną z wydatkami na obronność |
| Glasses | Technologia | gigant (wyszukiwarka, reklama) |
| Amazonka Corp. | Usługi + Technologia | gigant (e-commerce) |
| **Pear** | Technologia + Dobra konsumpcyjne | gigant (smartfony); co rok premiera modelu: hit albo flop; lojalni klienci, czyli mniejszy spadek w recesji |
| Macrohard | Technologia | oprogramowanie |
| FingerPrint | Media + Technologia | social media; specjalizacja Rozrywka |
| Envidia | Technologia/Półprzewodniki | projektant chipów do AI |
| Teslar Motors | Motoryzacja | auta elektryczne, ekologia, wysoka zmienność |
| Lotos Aerospace | Przemysł + Obronność | lotnictwo |
| Wall Street Corp. | Finanse | bank inwestycyjny |
| Texas Oil & Barbecue | Energia | |
| Hollywood Dreams Pictures | Media | specjalizacja Rozrywka |
| Big Pharma Unlimited | Medycyna | specjalizacja Farmaceutyki |
| ChickQueen | Żywność | |
| Coke&Fent | Alkohole/Napoje | |
| *AmeriRail* | Usługi | państwowa (kolej) |
| *US Mail & Parcel* | Usługi | państwowa (poczta) |
| *Tennessee Valley Power* | Energia | państwowa |
| *Fannie & Freddie Mortgage* | Finanse | państwowa (hipoteki) |

### 🇩🇪 Niemcy (DAX) — 13 + 3 państwowe, EUR
Przewaga: chemia, motoryzacja, medycyna, przemysł.
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Panzerwafel GmbH** | Żywność + Obronność | wafle w racjach wojskowych; rosną z wydatkami na obronność |
| VolksDeutsch Auto | Motoryzacja | gigant |
| Sternwagen AG | Motoryzacja | specjalizacja premium |
| BMV Bayerwerke | Motoryzacja | opis: kierowcy po zakupie auta stają się idiotami |
| Chemiefabrik Rhein AG | Chemia | gigant |
| BayernMunch | Medycyna | specjalizacja Farmaceutyki |
| Medizintechnik Schwarzwald | Medycyna | |
| Siemenz Industrie | Przemysł + Technologia | |
| SPASF Software | Technologia | |
| Deutsche Goldhaus | Finanse | |
| Oktoberbräu Feust | Alkohole/Piwowarstwo | |
| Autobahn Logistik | Budowlany | |
| MetallRai | Przemysł + Obronność | |
| *Deutsche Bahnhof* | Usługi | państwowa (kolej) |
| *Bundespost* | Usługi | państwowa |
| *Wiederaufbaubank* | Finanse | państwowa (bank rozwoju) |

### 🇯🇵 Japonia — 13 + 3 państwowe, JPY
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Bakugan TV** | Media (specjalizacja TV) | hit albo klapa sezonu anime; rośnie z liczbą krajów na giełdzie (eksport kultury) |
| SushShama | Żywność | |
| Toyotomi Motors | Motoryzacja | gigant |
| Hondaru Motors | Motoryzacja | |
| Sonic Electronics | Technologia + Media | |
| Pokeman | Gaming | |
| Mitsubosh Heavy Industries | Przemysł | |
| Araska Corp. | Przemysł | robotyka, gigant |
| Shinkansen Railways | Usługi | |
| SaKyoto | Alkohole | |
| YellowPharm | Medycyna | specjalizacja Farmaceutyki |
| Howam To Bank | Finanse | |
| Samurai | Obronność | |
| *Nippon Poczta Holding* | Usługi | państwowa |
| *TEPKO Tokio Energia* | Energia | państwowa |
| *Japoński Bank Rozwoju* | Finanse | państwowa |

### 🇨🇳 Chiny — 13 + 4 państwowe, CNY
| Spółka | Sektor | Uwagi |
|---|---|---|
| Alibaka Group | Technologia + Usługi | gigant |
| Tencentyl | Technologia + Media | gigant |
| Huiei Telecom | Technologia | ryzyko sankcji |
| BuildYourDream Motors | Motoryzacja | auta elektryczne |
| Wielcy Murarze Chińscy | Budowlany | |
| Fabryka Świata Industries | Przemysł | |
| Smok Rare Earths | Przemysł (podsektor: przemysł ciężki) | metale ziem rzadkich |
| RicePlantators | Żywność | start na giełdzie brązowej |
| **PanDa Bank** | Finanse | parabank: wysokie oprocentowanie lokat, ryzyko upadku jak Amber Gold |
| TikTak Media | Media | gigant |
| Jedwabn Logistyka | Usługi | |
| Herbata Yunnan | Żywność (podsektor: herbata, tylko w Chinach) | |
| Daj | Żywność | sprzedaż jaj |
| *Państwowa Sieć Energetyczna* | Energia | państwowa |
| *Chińska Kolej Narodowa* | Budowlany | państwowa |
| *Ludowy Bank Rolny* | Finanse | państwowa |
| *Sinochem Narodowy* | Chemia | państwowa |

### 🇫🇷 Francja — 11 + 2 państwowe, EUR
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Maison Champagnerie** | Alkohole | co rok losowa jakość winobrania; luksus rośnie w hossie |
| **Grenouille & Fils** | Żywność | żabie udka; sezonowość, protesty ekologów |
| Luxe Vuitonnet | Dobra konsumpcyjne | gigant luksusu (ubrania) |
| Jetaime | Dobra konsumpcyjne | dom mody |
| Beauté Paris | Chemia + Dobra konsumpcyjne | kosmetyki |
| Airbuss | Przemysł | lotnictwo |
| Gaz de Provence | Energia | |
| Crédit le Krecik | Finanse | |
| Bagieta SA | Żywność + Budowlany | |
| Croissanterie Dupont | Żywność | croissanty (nazwa robocza) |
| Côte d'Azur Resorts | Turystyka | |
| *Électricité Nationale* | Energia | państwowa (atom) |
| *Rail de France* | Usługi | państwowa |

### 🇮🇳 Indie — 10 + 4 państwowe, INR
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Curry Masala Ltd** | Żywność | ceny przypraw, sezon monsunowy |
| **Bollywood Studios** | Media (specjalizacja TV/film) | co kwartał premiera: hit albo klapa |
| HelloSir! | Technologia | gigant IT (outsourcing) |
| GangesGroup | Medycyna | specjalizacja Farmaceutyki (leki generyczne) |
| Mata Group | Przemysł + Motoryzacja | |
| Relajans Industries | Energia + Przemysł | |
| Bank of Bharat | Finanse | |
| Indian Express | Usługi | |
| Taj Mahal Hotels | Turystyka | |
| Karakorum | Obronność | |
| *Indyjskie Koleje Państwowe* | Usługi | państwowa |
| *Węgiel Indii* | Przemysł | państwowa |
| *Narodowa Ropa i Gaz Indii* | Energia | państwowa |
| *Narodowe Ubezpieczenia Bharat* | Finanse | państwowa |

### 🇨🇭 Szwajcaria — 7 + 1 państwowa, CHF
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Waschmabank** | Finanse | bank „bez pytań”: pranie pieniędzy mafii (szczegóły w G4); w skarbcu złoto — tylko informacja na karcie spółki, bez nowych możliwości inwestycyjnych |
| **Matterhornen** | Żywność (podsektor: słodycze) | czekolada; ceny kakao, stabilna dywidenda |
| UBZ Bankgesellschaft | Finanse | |
| Rochevartis Pharma | Medycyna | specjalizacja Farmaceutyki, gigant |
| Nestlik | Żywność | gigant |
| Präzision Uhren AG | Dobra konsumpcyjne | zegarki |
| Alpen Ski Resorts | Turystyka | |
| *Alpenpost* | Usługi | państwowa |

### 🇸🇪 Szwecja (SSE) — 7 + 2 państwowe, SEK
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Surströmming Stålverk AB** | Przemysł + Rybołówstwo | stal (cykliczna) + kiszony śledź (stabilny); zdarzenie „otwarcie puszki”: skandal albo viral |
| IKEJA | Dobra konsumpcyjne | gigant |
| Volvik | Motoryzacja | |
| Spotifaj | Media + Technologia | |
| Ericssen | Technologia | telekomunikacja |
| Saabre Defence | Obronność | |
| Östersjö Fiske AB | Rybołówstwo | |
| *Vattenkraft* | Energia | państwowa |
| *Systemkrogen* | Alkohole | państwowa — monopol na sprzedaż alkoholu; stabilna, wysoka dywidenda dla państwa |

### 🇨🇿 Czechy — 8 + 1 państwowa, CZK
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Pivovar Bohemia** | Alkohole/Piwowarstwo | ulubiona spółka Kozela; upały w lecie podbijają sprzedaż |
| Ovce Pivo | Alkohole/Piwowarstwo | |
| Škodar Auto | Motoryzacja | |
| ČEP Energie | Energia | |
| Knedlík a.s. | Żywność | |
| Bohemia Sklo | Dobra konsumpcyjne | szkło i kryształy |
| Praha Bank | Finanse | |
| Krecik Group | Media (specjalizacja TV) | |
| *České Koleje* | Usługi | państwowa |

### 🇹🇼 Tajwan — 5 + 1 państwowa, TWD
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Krzemowa Wyspa Semiconductor (KWS)** | Technologia/Półprzewodniki | gigant; napięcie Chiny–Tajwan: −30% i spadki półprzewodników na świecie; dostawca dla AI |
| Foxkon | Technologia | montaż elektroniki |
| Asuss | Technologia | |
| Formoza Chemia | Chemia | |
| Bubble Tea Taipei | Żywność | |
| *Taipower Formosa* | Energia | państwowa |

**Razem:** 102 spółki prywatne i 25 państwowych. Tworzone są dopiero przy dołączeniu kraju.

### Rozszerzanie liczby spółek w innych krajach (propozycja)
- **Debiuty krajowe:** po dołączeniu kraju jego startupy debiutują na jego rynku, tak jak polskie startupy. Szansa zależy od koniunktury kraju.
- **Spin-offy z 0.14 (T4):** dotyczą też spółek zagranicznych. Spółka córka zostaje w kraju matki.
- **Limit na kraj:** najwyżej 1,5 × liczba startowa (decyzja; patrz „Limity spółek” wyżej). Upadłości, przejęcia i wchłonięcia córek (0.14 T6) zwalniają miejsce. Spin-off zagranicznej spółki ponad limit kraju jest możliwy tylko jako carve-out.
- **Wydarzenie „Gigant wkracza na scenę”** (G3) może sprowadzić pojedynczą spółkę z kraju, który jeszcze nie dołączył.

## G3. Otwieranie regionów

Trzy drogi, które się uzupełniają: pojedyncze spółki, bilety dla wybranych inwestorów i pełne połączenie giełd.

1. **Wydarzenie „Gigant wkracza na scenę”** — gra się zatrzymuje, okno pokazuje, która spółka dołącza. Dwa warianty:
   - **(a) notowanie kwitów depozytowych (GDR):** zagraniczny gigant (np. Glasses, Pear, Toyotomi Motors) trafia na naszą giełdę. Cena jest w złotych, przeliczana z waluty spółki po kursie kantoru;
   - **(b) zagraniczne przejęcie:** spółka z zagranicy przejmuje spółkę z kraju startowego przez istniejący proces M&A z obcym inicjatorem. Akcjonariusze dostają gotówkę w złotych po kursie.
   - Rzadko: ok. raz na 2 lata gry, nie częściej niż raz na rok.
2. **Port lotniczy i bilety** (zakładka Miasto):
   - miasto zleca budowę lotniska przez istniejący system przetargów budowlanych, więc zarabiają na nim spółki budowlane;
   - po otwarciu lotniska działa sprzedaż **biletów**, czyli licencji na rynek danego kraju. Ceny z `START_COUNTRIES.passCost`; Tajwan i Francję trzeba tam dopisać;
   - **każdy inwestor kupuje bilet osobno:** gracz za gotówkę funduszu, a boty i fundusze botów każdy za swoje;
   - z biletem dany inwestor kupuje wszystkie spółki kraju, przez kantor i z wyższą prowizją (np. 0,6% zamiast 0,25%);
   - każdy sprzedany bilet daje mały bonus Turystyce;
   - **animacja po zakupie:** samolot startuje z ziemi w chmury, bez konkretnego celu. SVG/CSS, ok. 2 s, pomijalna kliknięciem, wyłączona przy `prefers-reduced-motion`;
   - **wydarzenie:** bot albo fundusz z innego kraju wchodzi na rynek kraju startowego (nowy posiadacz z gotówką w swojej walucie).
3. **Wydarzenia giełdowe** — trwałe połączenie rynków:
   - **pozytywne:** nasza giełda przejmuje giełdę X;
   - **neutralne:** powstaje giełda międzynarodowa z naszą i najwyżej 2 innymi, kolejne dołączają powoli;
   - **negatywne, wariant B:** naszą giełdę przejmuje giełda X. Kraj X i tak dołącza, ale na swoich warunkach: jego waluta jest rozliczeniowa dla nowych notowań, opłaty za notowanie rosną, a kurs GPW spada;
   - **szansa:** liczona w **kwartałach gry**, nie w minutach, bo od 0.14 T0 zegar gry nie zależy od prędkości (1 kwartał = 5 min przy ×1). 1% na kwartał, podwajana co kwartał do limitu 32%. Po wydarzeniu wraca do 1% i są 2 kwartały przerwy. Proporcje: pozytywne 50%, neutralne 30%, negatywne 20%;
   - **skutki dołączenia kraju:**
     - spółki kraju trafiają na naszą giełdę z normalną prowizją, bez biletu;
     - pojawiają się boty kraju (G6);
     - waluta kraju pojawia się w kantorze (jeśli jeszcze jej nie ma);
     - rośnie siła inwestorów mniejszościowych (kapitał bota market maker);
     - Turystyka dostaje duży, malejący bonus;
   - **wspólnota europejska:** powstaje, gdy dołączą co najmniej 3 kraje europejskie (DE, CZ, SE, CH, FR). Pojawia się wtedy bot europejski.

## G4. Sektory, podsektory, specjalizacje i spółki specjalne

- **Kategorie (0.14 T1a):** w tabelach G2 banki zapisane jako „Finanse” (Wall Street Corp., Deutsche Goldhaus, UBZ Bankgesellschaft, Howam To Bank, PanDa Bank, Waschmabank, Crédit le Krecik, Bank of Bharat, Praha Bank, banki państwowe) dostają sektor **Bankowość** i podsektor (komercyjny, inwestycyjny albo międzynarodowy). Nowe sektory trafiają do rejestru `SECTORS`: Motoryzacja do grupy Przemysł i surowce, Rybołówstwo i Alkohole do Konsumpcji.
- **Nowe sektory:** Motoryzacja, Rybołówstwo, Alkohole (podsektor: Piwowarstwo i napoje). Każdy dostaje profil wyceny oraz dane z 0.13 i 0.14:

  | Sektor | Zarząd / Specjaliści / Pracownicy / Tania siła / Szara strefa (%) | Koszt pracy (% przychodów) | Elastyczność popytu (0.13 S1) | Powiązane branże (0.14 T3) |
  |---|---|---|---|---|
  | Motoryzacja | 3 / 20 / 55 / 20 / 2 | 22 | 1,3 | Przemysł, Technologia |
  | Rybołówstwo | 2 / 5 / 45 / 38 / 10 | 25 | 0,3 | Żywność |
  | Alkohole | 3 / 10 / 55 / 30 / 2 | 18 | 0,4 (defensywne) | Żywność |
- **Turystyka:** gigantyczna premia za każde nowe państwo — przychód i kurs w górę, malejąco w czasie.
- **Podsektory** (mechanizm z 0.14 T2): Półprzewodniki i AI (Technologia), Przemysł ciężki (Przemysł), Słodycze i Herbata (Żywność; Herbata tylko w Chinach).
- **Specjalizacje-nisze** (0.14 T3, bez własnego profilu wyceny): TV i Rozrywka (Media), Farmaceutyki (Medycyna) i Wywiad i obronność (Technologia) są już w 0.14. 0.15 dopisuje Premium (Motoryzacja).
- **Gaming:** pierwsze spółki — DVD Project Black i WayPlay (PL) oraz Pokeman (JP).
- **Waschmabank** — bank „bez pytań”:
  - mafia i Bruno Gato wpłacają brudną gotówkę i odbierają czystą; bank bierze 10–20% prowizji, więc ma bardzo wysoką marżę;
  - co kwartał szansa na kontrolę albo przeciek („Swiss Leaks”): kurs spada o 30–60%, bank płaci karę, prezesowi grozi areszt;
  - gracz może trzymać tam część gotówki poza kontrolą nadzoru (0.11). Jeśli to wyjdzie na jaw: afera i utrata reputacji;
  - złoto w skarbcu to tylko informacja na karcie spółki.
- **PanDa Bank (parabank):** używa **istniejącej mechaniki parabanku z 0.11** razem z poprawkami balansu z 0.11.5 (losowy termin upadku, kurs z szumem). Nie budujemy drugiej. Lokaty z wysokim oprocentowaniem przyciągają klientów, co kwartał rośnie ryzyko upadku, a przy upadku inwestorzy i deponenci tracą i wybucha afera.
- **Pozostałe spółki specjalne:** po jednej mechanice, jak w tabelach G2.

## G5. Prezesi — cechy krajowe

**Zagraniczni** (po dwie na kraj; nadawane spółkom danego kraju, czasem także innym):
| Kraj | Cechy |
|---|---|
| 🇩🇪 | Ordnung muss sein (mniejsza zmienność), Ingenieur (badania i rozwój +) |
| 🇸🇪 | Lagom (umiar w ryzyku), Fika (zadowolenie pracowników z 0.13 +) |
| 🇨🇭 | Tajemnica bankowa, Neutralność (odporność na kryzysy) |
| 🇺🇸 | Move fast (wzrost +, zmienność +), Shareholder value (skup akcji własnych) |
| 🇯🇵 | Kaizen (marża rośnie stopniowo), Keiretsu (kooperacje z 0.14 T5) |
| 🇨🇳 | Plan pięcioletni (dotacje państwa), Kopiuj-wklej (tańsze badania, ryzyko sankcji) |
| 🇫🇷 | Savoir-vivre (marża na luksusie +), Grève générale (silniejsze związki z 0.13) |
| 🇮🇳 | Jugaad (niższe koszty), Outsourcing |
| 🇨🇿 | Švejk (przetrwa kryzys, ale rośnie wolno), Piwny dyplomata |
| 🇹🇼 | Krzemowa tarcza (odporność geopolityczna), Pracoholik |

**Polscy prezesi:**
- Janusz biznesu (niższe koszty, niższe zadowolenie załogi);
- Szwagier w ministerstwie (kontrakty państwowe);
- Polak potrafi (szybciej wychodzi z kryzysu);
- Cwaniak (zysk +, ryzyko afery).

Cechy pokrywające się z istniejącymi (np. `skapiec`) łączymy, zamiast dublować.

## G6. Boty zagraniczne

Każdy bot pojawia się dopiero wtedy, gdy jego kraj dołączy do giełdy.

| Bot | Kiedy | Zachowanie |
|---|---|---|
| Kacper „Intercontinental” Bayer | po pierwszym przejęciu giełdy przez naszą | skupuje obce waluty, gra tylko spółkami zagranicznymi |
| Michael „Dad” Santos | USA | start w USD; polskie spółki kupuje losowo, amerykańskie „idealnie” (według fundamentów) |
| Peter „Lech” Kozel | Czechy | głównie spółki czeskie, lubi też europejskie; kupuje w EUR i CZK; 20% środków trzyma na wydatki prywatne |
| „Tygrys” | Chiny | agresywny, celuje w technologię |
| „Konfucjusz” | Japonia | japoński odpowiednik Stoika; skupia się na rynku japońskim; akcjami handluje tylko z Tygrysem (transakcje bot–bot) |
| Gregor „Bankier” Gutzwiller | Szwajcaria | tylko banki i REIT-y; rezerwa w CHF; „neutralność”: nie sprzedaje w panice, dokupuje przy krachach; aktywnie używa władzy korony; lubi Waschmabank |
| „Wiking” | Szwecja | agresywny, kupuje cokolwiek |
| niemiecki wieloryb | Niemcy | duży gracz, tylko stabilne spółki, unika polskich |
| bot europejski (odpowiednik yolo) | wspólnota europejska (≥ 3 kraje europejskie) | hazardzista |

Polski Grzegorz „Bankier” Kacperczyk zostaje bez zmian.

## G7. Forex (po otwarciu drugiego rynku)

- **Od startu:** kantor, czyli kupno i sprzedaż walut za złotówki, bez dźwigni (G1).
- **Po otwarciu drugiego rynku:**
  - pary krzyżowe, np. EUR/USD;
  - pozycje długie i krótkie z dźwignią do 1:10;
  - depozyt zabezpieczający i automatyczne zamknięcie pozycji (margin call) przy dużej stracie.
- **Akademia:** hasła „Ryzyko walutowe”, „Spread”, „ADR/GDR”, „Dźwignia i margin call”, „Konsolidacja giełd”.

## G8. Interfejs, zapis gry i testy

- **Interfejs:**
  - zakładki rynków z flagami i walutą;
  - okno kantoru z wykresem kursu;
  - zakładka Miasto: lotnisko (budowa przez przetarg, sprzedaż biletów, animacja startu);
  - okno wydarzenia „Gigant wkracza na scenę” z pauzą gry;
  - karta spółki: kraj, waluta, cena w walucie i w złotych.
- **Zapis v15:**
  - zapisujemy: kursy walut, `cashByCurrency`, bilety, dołączone kraje, szanse wydarzeń;
  - spółki krajów, które nie dołączyły, **nie trafiają do zapisu**;
  - migracja v14 → v15: stara gra dostaje waluty i kantor, ale bez nowych krajów.
- **Testy:**
  - przeliczenia `toPln` i NAV przy zmianie kursu;
  - niezmiennik akcji dla spółek w walutach;
  - zakup biletu przez bota i przez gracza;
  - dołączenie kraju: spółki, boty, waluta;
  - wariant B;
  - margin call na forexie;
  - migracja zapisu.

## Jak sprawdzimy (przebieg ×200, 6,5 roku gry)

- `checkWorldInvariants()` puste, również po zapisie i wczytaniu w połowie przebiegu.
- Zapis < 3 MB po 6,5 roku przy 3–4 dołączonych krajach.
- Spółki krajowe nadal ≤ 115, zwykłe ≤ 150. Każdy kraj ≤ 1,5 × liczba startowa.
- Kursy walut nie wychodzą poza widełki. NAV funduszu bez walut nie zmienia się od samego ruchu kursów.
- W typowym przebiegu dołączają 2–4 kraje, a nie wszystkie od razu.
- Boty zagraniczne nie zdobywają ponad 50% żadnej spółki w pierwszym roku po dołączeniu.

## Decyzje (podjęte)

1. Rynki: DE, CZ, SE, CH, US, JP, CN, IN, TW, FR. Tajwan i Francja dopisane do `START_COUNTRIES`.
2. Bez Colonizera.
3. Przejęcie naszej giełdy działa według wariantu B.
4. Półprzewodniki i AI to podsektory, TV to specjalizacja, Farmaceutyki to specjalizacja Medycyny, a Gaming to istniejący sektor.
5. Kantor i spekulacja walutami od startu. Forex (pary krzyżowe, dźwignia) po otwarciu drugiego rynku.
6. Szwajcarski bot: Gregor „Bankier” Gutzwiller, tylko banki i REIT-y.
7. Waschmabank (pranie pieniędzy, złoto tylko jako informacja), Matterhornen (czekolada).
8. Nazwy: Palant-YR, MetallRai, Bakugan TV, Ovce Pivo, VolksDeutsch Auto, Lotos Aerospace, RicePlantators (Żywność), PanDa Bank (parabank).
9. Spółki polskie: Bałtycka Energia, Miejskie Ziemniaki; Super Makarony, Annesco i BobBuild zostają; Bank Żywności staje się bankiem. Nowe spółki Gaming: DVD Project Black i WayPlay.
10. Otwieranie regionów:
    - wydarzenie „Gigant wkracza na scenę” (pauza gry, GDR albo zagraniczne przejęcie);
    - lotnisko z biletami kupowanymi przez każdego inwestora osobno, z animacją lotu w chmury;
    - wydarzenia giełdowe łączące rynki.

## Do potwierdzenia

- Spółki państwowe w krajach: lista z tabel G2 (1–4 na kraj).
- Nowa nazwa dla Banku Żywności (propozycja: „Bank Rolno-Spożywczy”).
- Nazwa spółki od croissantów (robocza: Croissanterie Dupont).
- Nazwy rynków poza DAX, SSE i Wall Street Exchange.
- Rozszerzanie liczby spółek w innych krajach (limit 1,5 × liczba startowa).
11. **Limity:** spółki zagraniczne mają osobny limit na kraj (1,5 × liczba startowa) i nie liczą się do krajowych ok. 110 ani do łącznych 150.
12. **Pracownicy za granicą:** model 0.13 i stały profil kraju (tabela w G2). Pełne społeczeństwo tylko w kraju startowym.
13. **Wydarzenia giełdowe** liczone w kwartałach gry, nie w minutach.
