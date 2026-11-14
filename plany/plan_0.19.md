# Plan 0.19 (cała seria; wspólny plik od 2026-11-14)

Polecenie użytkownika z 2026-11-14: „zrób wspólny plik 0.19 ze wszystkim; multikulturalizm zamień na 0.19.3”. Ten plik zastępuje `plan_0.19.1_polityka_2.md`, `plan_0.19.2_multikulturalizm.md` i sekcję 7 „Miasta 2” z `plan_seria_0.18_towary_ipo_miasta.md`. Zbiera też wszystko, co w innych planach odłożono „do 0.19”. Wszystkie wersje to na razie **szkice zakresu**: przed każdą powstaje specyfikacja z decyzjami, tak jak w 0.18.

## Kolejność i numeracja

| Wersja | Nazwa | Wcześniej | Zakres w skrócie |
|---|---|---|---|
| **0.19.1** | Polityka i Społeczeństwo 2 | 0.19.1 „Polityka 2” (mapa) i 0.19.1 „Społeczeństwo 2” (plan serii) — ten sam numer, połączone | partie i wydarzenia polityczne, sponsoring i lobbing, nepotyzm, urzędy; ruch klas, zdrowie i nauka, poziom życia |
| **0.19.2** | Miasta 2 | 0.19.2 (sekcja 7 planu serii) | miasta w kraju, oddziały spółek, projekty miejskie, galerie, szpitale i uniwersytety, REIT zdrowie przez najem |
| **0.19.3** | Multikulturalizm (wspólny silnik „flavour”) | 0.19.2 „Multikulturalizm” | konfiguracja kraju: administracja, motyw, zasady, instytucje, poziomy obecności, przychylność per kraj |
| **0.19.4** | Handel światowy | „0.19 Handel światowy” (mapa), w planie serii cła jako „0.20” | cła na krawędziach grafu, służba celna, doktryny handlowe, umowy, embarga, unie celne, WTO, handel energią |
| **0.19.5** | Bramka testowa serii 0.19 | 0.19.3 „bramka testowa” | serie i gra ręczna po całej serii, strojenia |
| **0.19.6+** | Wersje krajów | 0.19.3 Niemcy, 0.19.4 USA, 0.19.5 Czechy | 0.19.6 Niemcy (wzór), 0.19.7 USA, 0.19.8 Czechy, dalej pozostałe kraje |

Przed 0.19.1 idą jeszcze: 0.18.6 Porządki, 0.18.7 Progresja i onboarding, 0.18.8 Długa gra (`plan_0.18.6_porzadki_dluga_gra.md`) i wersja „Cel gry” (`plan_cel_gry.md`). Dalsze wersje (Globalne korporacje, Rynek pracy 2) są w mapie (`plan_0.13-0.16_mapa.md`, „Po 0.16”).

**Wspólne zasady serii:**
- Budżet czasu kroku: **900 ms/kw.** z UI (kontrola końcowa 0.18, `raporty/kontrola_0.18.md`). Każda wersja mierzy bazę i nową wersję po kolei, w tych samych warunkach.
- Cel GIG 20 lat: **10–13%** (U1, 2026-11-13). Marże 0 ± 0,3 pp, GIG ±1 pp względem bazy wersji.
- Commit po każdej części, raport `raporty/kontrola_0.19.N.md`, wiersz w mapie.
- UI: ciemny motyw, ikony SVG, PLN, „udział”, „konto prywatne”; kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.

---

## 0.19.1 Polityka i Społeczeństwo 2

Źródła: zgłoszenia z gry 2026-10-25 (`pomysly_na_kolejne_wersje.md`, 9.2), notatki 0.11 z `roadmap.txt`, dopiski z 0.17.1, 0.17.2 i planu serii. **Pierwszy krok: sprawdzić, co z listy już działa w 0.11–0.17** (partie z Zielonymi z 0.17.2, populacja, ustawy, sponsoring, lobbing, presja ekologiczna z 0.18.6 O5) i skreślić duplikaty.

Cel: polityka dotyczy wszystkich otwartych krajów, partie się zmieniają, gracz ma więcej narzędzi wpływu, a społeczeństwo się zmienia (klasy awansują, zdrowie i nauka mają znaczenie).

| Część | Zakres |
|---|---|
| **P0** | Inwentaryzacja istniejących mechanik; baza 0.19.1 |
| **P1** | **Wydarzenia dla państw obcych** (prezydent idiota, zamknięcie granicy, ucieczka ludzi, dofinansowania i inne), zgodnie z profilem kraju (0.16) |
| **P2** | **Partie:** nowe i zmieniające się z czasem (populistyczna, liberalna, Zieloni, centrum, socjaldemokracja, libertariańska, anarchistyczna, komunistyczna, technokraci); 6 partii w kraju startowym, 4 w innych; **6 wydarzeń na typ partii**; program polityczny i ekonomiczny wpływa na ceny akcji, spółki państwowe, bank i handel |
| **P3** | **Sponsoring** wyborów (+5% za każdy) i lobbing sektorowy (np. podatek cukrowy → Żywność); więcej polityk wzmacniających i osłabiających spółki państwa |
| **P4** | **Nepotyzm, poziomy 2–4 (najpierw poziom 2):** zasugerowanie spółce państwowej sprzedaży akcji funduszowi gracza; poufne informacje o ruchach rządu (6. zmysł na spółkach państwowych nie działa); sugerowanie inwestycji |
| **P5** | **Nowe urzędy** (programy socjalne są od 0.15.4 P7) |
| **S1** | **Ruch klas** (dopisek z 0.17.1): dziś udziały klas przez 8 lat zmieniają się najwyżej o 1–2 pp i raczej w dół (średnia 24 → 23%), nikt nie awansuje. Diagnoza razem z pytaniem, czemu realna gospodarka nie rośnie; po zmianie sprawdzić wybory (wagi `CLASS_VOTE` strojone na stałej strukturze) |
| **S2** | **Zdrowie i nauka:** wskaźniki zdrowia i nauki, szpitale i uniwersytety jako odbiorcy (łańcuch Zdrowie z 0.18: farmacja, sprzęt medyczny → szpitale → zdrowie obywateli) |
| **S3** | **Poziom życia** (z 0.17.2: konsumpcja i zadowolenie, zdrowie, bezpieczeństwo, edukacja i nauka, informacja) pogłębiony o S1–S2; w 0.19.2 przechodzi na miasta |
| **P6** | Interfejs, Akademia, zapis, kontrola, raport `raporty/kontrola_0.19.1.md` |

**Wielkość:** L–XL (dwa bloki). Jeśli specyfikacja pokaże, że to za dużo na jedną wersję, blok S przechodzi na osobną wersję przed Miastami, a numery 0.19.2+ się nie zmieniają (wtedy 0.19.1a / 0.19.1b). **Zależności:** 0.16 (kraje), 0.13 (partie i ustawy), 0.17.2 (energia, Zieloni, poziom życia), 0.18.6 O5 (presja ekologiczna). Doktryny handlowe zależne od partii wchodzą w 0.19.4 i korzystają z partii z P2.

**Ryzyka:** balans polityki a kalibracja GIG (wydarzenia zmieniają ceny) → pomiar ±1 pp; zakres bliski 0.13 → najpierw inwentaryzacja; za dużo wydarzeń → najwyżej 3 maile na kwartał (miara z 0.13); ruch klas zmienia wybory → seria wyborcza.

**Decyzje (podjęte 2026-10-25):**
1. Partie w krajach obcych: stały profil z wydarzeniami i zmianami programu (bez pełnej symulacji wyborów).
2. Programy socjalne weszły w 0.15.4 P7; tu zostają nowe urzędy (P5).
3. Nepotyzm: najpierw poziom 2; poziomy 3 i 4 w kolejnych krokach P4.
4. Uproszczone symulacje państw (zgłoszenie 2026-10-28): inne państwa mają własne, uproszczone symulacje (gospodarka, budżet, partia rządząca, polityka zagraniczna) zamiast samego stałego profilu z decyzji 1; reagują na handel, kryzysy i działania gracza. Zakres i koszt czasu kroku do ustalenia w specyfikacji.

**Zlecenie dla designu:** karta kraju z partią rządzącą i programem; panel sponsoringu i lobbingu; poziomy Nepotyzmu w drzewku umiejętności; wskaźniki klas, zdrowia i nauki w oknie Państwa.

---

## 0.19.2 Miasta 2

Źródło: rozmowa z użytkownikiem 2026-11-03 (dawna sekcja 7 planu serii) i dopiski z 0.17.2, 0.18 i decyzji U8.

### Model

- Każdy kraj dzieli się na kilka **miast** (PL: 6, kraje obce: 3–4; liczba dla krajów obcych otwarta). Miasto: ludność i struktura klas (0.13), **infrastruktura** (drogi, kolej, energia, łącza; 0–100), zanieczyszczenie, zadowolenie, podatek lokalny, budżet, lista projektów i spółek z siedzibą.
- **Graf towarów zostaje na poziomie podsektor × kraj** (nie × miasto). Miasto modyfikuje: koszt i dostępność pracy, limit rozwoju, zanieczyszczenie i zadowolenie. Dzięki temu miasta nie mnożą macierzy.
- **Oddziały spółek:** spółka może otworzyć oddział w mieście (zatrudnia tam). Oddział zwiększa aktywność podsektora, ale zużywa pojemność miasta.
- **Pojemność miasta** = f(infrastruktura, ludność, wykształcenie). Przekroczenie → rosną koszty pracy i podatki, rośnie zanieczyszczenie, spada zadowolenie.
- **Projekty miasta** (to samo `MEGA_PROJECTS` i lista projektów budowlanych, tylko zamawiającym jest miasto), przetargi dla Budowlanego, infrastruktura z 0.17 S5 na poziomie kraju jako tło.

### Zasady

- **1 uniwersytet na miasto.** Bonus dla spółek „obok” liczony z tabeli giełdowej (ten sam sektor i poziom), nie z mapy miast.
- **Galerie handlowe** = REIT typ `retail` (Nieruchomości), na giełdach prywatnych także prywatne i miejskie. Są ogniwem dystrybucji: część konsumpcji dóbr końcowych w mieście realizuje się tylko przez powierzchnię handlową (galerie, sieci handlowe, e-commerce). Brak galerii = niższa sprzedaż dóbr końcowych.
- **REIT zdrowie (U8, 2026-11-13):** dziś najsłabszy typ REIT (CAGR 20 lat 1,0% wobec 5,4–6,9%). Rozwiązanie przez najem: biura innym firmom, szpitale miastu i państwu, mieszkania mieszkańcom; czynsz zależy od popytu w mieście (ludność, klasy, infrastruktura), a nie od samego profilu typu.
- **Szpitale i uniwersytety** zależą od miasta (potrzeby i klasy z 0.19.1).
- **Prąd:** miasta mają własne zużycie prądu (dopisek z 0.17.2), do zbalansowania i pomiaru.
- **Poziom życia** z 0.19.1 S3 liczony na miasto.
- **Okno „Miasto”:** dziś okno inwestycji miejskich (`openCityInvestmentModal`). Miasta 2 korzystają z rejestru odblokowań z 0.18.7 E1 (szkielet reguły `city2`).
- **Podsumowanie dekady** (0.18.8 D6, makieta 23): od 0.19.2 dochodzi komórka „Wkład w Miasto”.
- **Mapa szlaków** (makieta 16): karta kraju dostaje listę miast (przed 0.19.2 „kraj bez miast”).

### Ryzyko

Miasta dotykają zapisu (kilkadziesiąt obiektów), czasu kroku (oddziały) i UI (mapa). Pomiar względem budżetu 900 ms/kw.

---

## 0.19.3 Multikulturalizm (wspólny silnik „flavour”)

Źródło: zgłoszenie użytkownika z 2026-10-29 (dawny `plan_0.19.2_multikulturalizm.md`). „Flavour” = **własny charakter każdego państwa**: nie tylko inne firmy i waluta, ale własne mechaniki, instytucje, społeczeństwo, wygląd i zasady rozgrywki. Polska przestaje być jedynym krajem z pełnym „smakiem”, a Niemcy (potem USA, Czechy, kolejne) dostają własną wersję gry.

**Cel:** start w innym kraju ma być inną grą, a nie polską grą z inną walutą.

### Zakres roboczy (po jednym kraju naraz: Niemcy jako wzór)

1. **Własna administracja zamiast zakładki „Państwo”:** w Niemczech zakładka **Landy**; spółki państwowe i miejskie stają się spółkami landów (`Landesunternehmen`), z podatkami, dotacjami i skarbem na poziomie landu i federacji. W USA stany, w Czechach kraje; Polska zachowuje państwo i miasta (0.19.2). Dane i zakładka z konfiguracji kraju (`COUNTRY_DEFS`), wspólny silnik.
2. **Więcej własnych firm i projektów:** pełniejszy zestaw spółek (częściowo z 0.16.11), własne spółki miejskie, własne ośrodki badań, specjalne projekty i superprojekty kraju.
3. **Rozbudowa mechanik sektorowych:** inwentaryzacja sektorów bez własnej mechaniki specjalnej (m.in. Żywność, Usługi, Dobra konsumpcyjne, Alkohole — do potwierdzenia) i nadanie im mechanik, najlepiej z odmianą krajową (np. Reinheitsgebot w Niemczech).
4. **Społeczeństwo i polityka kraju:** własni obywatele, własny system partyjny (na bazie 0.19.1 P2), wydarzenia krajowe, nazwy w stylu kraju, inne boty startowe. Wspólne z S0d z 0.16.6.
5. **Motyw graficzny i zasady rozgrywki:** lekko inny motyw kraju (nadal ciemny) oraz lekko inne zasady, np. Niemcy: ład korporacyjny (brak mafii od startu, mniej oszustw); USA: wyższe ryzyko i premia, silniejszy lobbing; Czechy: mały, otwarty rynek, wrażliwy na kurs i sąsiadów.
6. **Przychylność polityczna per kraj:** wspólny model `countryFavor[kraj]` zamiast jednej polskiej `macro.election.favor`; źródła: darowizny, lobbing, relacje (0.17.3), nepotyzm (0.19.1 P4); skutki: przetargi, ceny przejęć spółek państwowych, pobłażliwość nadzoru, ryzyko afery.
7. **Nowe instytucje dla wszystkich państw:** wspólne instytucje (banki rozwoju, fundusze emerytalne, agencje nadzoru i antymonopolowe, izby handlowe) z lokalną nazwą i parametrami; lista do ustalenia z użytkownikiem.
8. **Greenfield i brownfield oraz poziomy obecności** zamiast przejmowania giełdy zagranicznej (0.16.3 wariant B): budowa od zera i przejęcie lub rozbudowa; poziomy obecności (brak, biuro, oddział, spółka zależna, pełna obecność) odblokowują kolejne możliwości.

### Podział na wersje (decyzja użytkownika 2026-10-29, numery od 2026-11-14)

- **0.19.3 = wspólny silnik „flavour”:** `COUNTRY_DEFS` rozszerzony o administrację, motyw, zasady kraju, instytucje, poziomy obecności (pkt 8) i przychylność per kraj (pkt 6), z Polską jako pierwszą implementacją. Bez pełnej treści innych krajów.
- **Każdy kraj ma własną wersję po bramce 0.19.5:** 0.19.6 Niemcy (wzór), 0.19.7 USA, 0.19.8 Czechy, dalej Szwecja, Szwajcaria, Francja, Japonia, Chiny, Indie, Tajwan (kolejność do ustalenia). Każda z pomiarem GIG ±1 pp i czasu kroku.
- **Do czasu tych wersji** gra zostaje przy uproszczonej mechanice krajów (kraj startowy z 0.16.6/0.16.11, połączone giełdy i bilety z 0.16.2–0.16.3, stały profil społeczeństwa z 0.19.1).

**Zależności:** 0.16.11 (zestawy firm i waluta), 0.19.1 (Polityka i Społeczeństwo 2, symulacje państw), 0.19.2 (miasta jako wzór administracji). Pkt 8 dotyka 0.16.3, biletów z 0.16.2 i `foreign_companies.js` (po wspólnym modelu spółek z 0.18.0 R1).

**Przeniesione z 0.16.x (decyzja 2026-10-30):** partie, wybory i społeczeństwo kraju startowego (K3/S0d) — tutaj i w wersjach krajów; strajki i rynek pracy spółek zagranicznych — razem z „Rynek pracy 2”; listy firm i kalibracja GIG dla USA i Czech — w 0.19.7 i 0.19.8.

**Otwarte pytania:**
1. Czy motyw kraju zmienia tylko akcenty, czy także tło i ikonografię? (Domyślnie: akcenty, nagłówek i tło; ikony wspólne.)
2. Jak głęboko Landy? (Domyślnie 3–4 landy reprezentatywne.)
3. Pkt 8: co z połączonymi giełdami i biletami? (Domyślnie poziomy obecności je rozszerzają, a bilet jest warunkiem pierwszego poziomu.)
4. Nowe instytucje (pkt 7): które?
5. Czy opinia publiczna kraju o funduszu ma być osobnym wskaźnikiem? (Domyślnie tak.)

---

## 0.19.4 Handel światowy

Źródło: kierunek z 2026-10-25 (mapa, „Po 0.16”; `pomysly_na_kolejne_wersje.md` pkt 6) i odłożone z 0.17.2 i 0.18.

- **Cła na krawędziach grafu** z 0.18 (krawędzie mają kraj i rodzaj transportu); koszt importu w bilansie = fracht + cło (dziś cło = 0, `chains.js`).
- **Służba celna** w zakładce Państwa (poziomy: szczelność granic, ściągalność ceł, limity taryfowe).
- **Doktryny handlowe** zależne od partii w kraju startowym (0.19.1 P2), stałe za granicą: protekcjonizm, wolny handel, merkantylizm, autarkia, zakaz eksportu strategicznego.
- **Umowy, embarga, sankcje, unie celne, strefy wolnego handlu**; **WTO** i wieloletnie rundy negocjacji jako linia zdarzeń.
- **Handel energią między państwami** (przeniesiony z 0.17.2 przez Politykę 2): cena i przepływ prądu między krajami, potem cła i embarga.
- **Wielkość:** L. **Ryzyka:** wpływ ceł na marże i kryzysy; zbieżność z ustawami 0.13; czas kroku (krawędzie × kraje).

## 0.19.5 Bramka testowa serii 0.19

Jak 0.17.1: duża seria, presety graczy, gra ręczna, lista strojeń do decyzji użytkownika. Cele: GIG 20 lat 10–13%, marże 0 ± 0,3 pp, czas kroku ≤ 900 ms/kw., zapis bez dużego wzrostu, wybory i ruch klas po S1, miasta i handel w pomiarze.

## 0.19.6+ Wersje krajów

0.19.6 Niemcy (Landy, ład korporacyjny, firmy, badania, partie, wydarzenia, nazwy, boty, motyw), 0.19.7 USA, 0.19.8 Czechy, dalej pozostałe kraje. Zakres według 0.19.3.
