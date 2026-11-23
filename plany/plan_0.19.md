# Plan 0.19 (cała seria; wspólny plik od 2026-11-14)

Polecenie użytkownika z 2026-11-14: „zrób wspólny plik 0.19 ze wszystkim; multikulturalizm zamień na 0.19.3”. Ten plik zastępuje `plan_0.19.1_polityka_2.md`, `plan_0.19.2_multikulturalizm.md` i sekcję 7 „Miasta 2” z `plan_seria_0.18_towary_ipo_miasta.md`. Zbiera też wszystko, co w innych planach odłożono „do 0.19”. Wszystkie wersje to na razie **szkice zakresu**: przed każdą powstaje specyfikacja z decyzjami, tak jak w 0.18.

## Kolejność i numeracja

| Wersja | Nazwa | Wcześniej | Zakres w skrócie |
|---|---|---|---|
| **0.19.1** | Polityka i Społeczeństwo 2 | 0.19.1 „Polityka 2” (mapa) i 0.19.1 „Społeczeństwo 2” (plan serii) — ten sam numer, połączone | partie i wydarzenia polityczne, sponsoring i lobbing, nepotyzm, urzędy; ruch klas, zdrowie i nauka, poziom życia |
| **0.19.2** | Mapa kraju (dawniej Miasta 2) | 0.19.2 (sekcja 7 planu serii), rozszerzone 2026-11-23 | miasta na 3 szczeblach (1 + 6 + 12, część otwiera się z czasem), specjalizacje, polityki miejskie, migracje, zdarzenia lokalne, kategorie dóbr 0–4 na mapie, oddziały, galerie, szpitale i uniwersytety, REIT zdrowie przez najem |
| **0.19.3** | Usługi i projekty (nowy zakres od 2026-11-23) | wydzielone z 0.19.2 | Turystyka i usługi cyfrowe w grafie, projekty budowlane, megaprojekty i projekty czasowe (PR0–PR8) |
| **0.19.4** | Handel światowy | „0.19 Handel światowy” (mapa), w planie serii cła jako „0.20” | cła na krawędziach grafu, służba celna, doktryny handlowe, umowy, embarga, unie celne, WTO, handel energią |
| **0.19.5** | Bramka testowa serii 0.19 | 0.19.3 „bramka testowa” | serie i gra ręczna po całej serii, strojenia |
| ~~0.19.6+~~ → **0.24+** | Wersje krajów | przeniesione 2026-11-23 za Korporacje 2 | Niemcy (wzór), USA, Czechy, dalej pozostałe kraje |
| ~~0.19.3~~ → **0.22** | Multikulturalizm (wspólny silnik „flavour”) | przeniesione 2026-11-23 za Korporacje 2 | konfiguracja kraju: administracja, motyw, zasady, instytucje, poziomy obecności, przychylność per kraj |

**Decyzja użytkownika 2026-11-23 (`plan_0.20_korporacje_2.md`, K1):** państwa trzecie na później, w zamian mapa kraju startowego. Po 0.19.5 idą: 0.20 Korporacje 2, 0.21 Rynek pracy 2, 0.22 Multikulturalizm (silnik), 0.23 Globalne korporacje (dawne 0.20), 0.24+ wersje krajów.

Przed 0.19.1 idą jeszcze: 0.18.6 Porządki, 0.18.7 Progresja i onboarding, 0.18.8 Długa gra (`plan_0.18.6_porzadki_dluga_gra.md`) i wersja „Cel gry” (`plan_cel_gry.md`). Dalsze wersje (Korporacje 2, Rynek pracy 2, Multikulturalizm, Globalne korporacje, wersje krajów) są w `plan_0.20_korporacje_2.md` i w mapie (`plan_0.13-0.16_mapa.md`, „Po 0.16”).

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
| **P5** | **Nowe urzędy** (programy socjalne są od 0.15.4 P7), w tym **Ministerstwo Infrastruktury** (P5a, opis niżej) |
| **P5b** | **Ujednolicenie ustaw:** jeden widok ustaw w oknie Państwa (opis niżej) |
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

### P5a. Ministerstwo Infrastruktury (pomysł użytkownika 2026-11-22)

Słowa użytkownika: w zakładce Prawo i Kraj są dwa sposoby pokazywania ustaw, a finansowanie infrastruktury jest poza nimi; ministerstwo infrastruktury ma o nim decydować i mieć mini okienko w Gospodarka → Przegląd.

**Stan w kodzie (2026-11-22):** finansowanie infrastruktury to ustawa `society.laws.infrastructure` (`SOCIAL_LAWS.infrastructure`, `core.js:5333`; poziomy „Porzucenie” … „Autostrady na wczoraj”, start 2). Poziom (`INFRA_LEVELS`, `infrastructure.js:20`) wyznacza: udział wpływów państwa na utrzymanie (0–4,5%), tempo zużycia przepustowości i szansę ogłoszenia projektu na kwartał. `settleInfraBudget` (`infrastructure.js:352`) liczy utrzymanie i raty projektów, a wynik trafia do budżetu jako `budget.infrastructureSpending` (`core.js:5943`). Partie ruszają tę ustawę w swoich ruchach (`state` i `people` +1, `core.js:5381–5382`). Przetargi na odcinki i PPP gracza są w `infrastructure.js`, przepustowość szlaków (`society.infra.cap`) czyta mapa szlaków z 0.18.3 M5 i import w łańcuchach.

**Decyzja planu: Ministerstwo przejmuje ustawę zamiast jej dublować.**
- **Kto decyduje:** ministerstwo podlega rządowi. Co kwartał ustala poziom finansowania (te same 5 poziomów, więc balans z 0.17 zostaje) według programu partii rządzącej (dzisiejsze ruchy partii przechodzą na ministra) i stanu sieci. Gdy przepustowość któregoś trybu spadnie poniżej 0,85, minister podnosi poziom o 1, nawet wbrew programowi, ale najwyżej raz na rok. Ustawa `infrastructure` znika z listy ustaw i staje się „polityką ministerstwa”, a stary zapis przenosi jej poziom.
- **Budżet:** stała część wpływów państwa według poziomu (jak dziś `INFRA_LEVELS.spend`) plus raty projektów. Nowość: **plan inwestycji na 4 kwartały** (lista projektów z `INFRA_TYPES` w kolejności), żeby gracz i spółki widzieli, co nadchodzi. Przy deficycie skarbu (budżet państwa na minusie 2 kw.) ministerstwo tnie plan o jeden projekt.
- **Wpływ gracza:**
  1. **lobbing** (0.19.1 P3) za podniesieniem poziomu albo za konkretnym projektem (np. port zamiast lotniska);
  2. **przetargi** jak dziś (Budowlany, podwykonawcy z 0.18.2 G6) i **PPP** gracza (zmniejsza raty);
  3. **nepotyzm** poziom 3 (P4): wcześniejsza informacja o planie inwestycji.
- **Skutki:** przepustowość szlaków (morskie, lotnicze, lądowe) → koszt importu w łańcuchach i stan szlaków w M5; przychody przewoźników (`getInfraCarrierFactor`); w 0.19.2 ministerstwo dzieli część budżetu na miasta (infrastruktura miasta 0–100). Brak finansowania obniża poziom życia (S3) przez zużycie.
- **Łącza (sieć szerokopasmowa), decyzja planu:** w 0.19.1 nie dodajemy łączy jako czwartego trybu szlaków (szlaki dotyczą towarów: morze, powietrze, ląd). Łącza wchodzą w 0.19.2 jako typ infrastruktury miasta (`broadband` w `INFRA_TYPES`, zamawiany przez ministerstwo albo miasto) i podnoszą popyt na usługi cyfrowe oraz wskaźnik „informacja” poziomu życia.
- **UI:** mini okienko w **Gospodarka → Przegląd**: poziom finansowania słowem, budżet kwartalny, plan inwestycji (3–4 pozycje z terminem), stan przepustowości trzech trybów (słowem i liczbą), minister i partia, przycisk „Lobbing” (od P3). Makietę robi równolegle czat designu.
- **Pliki:** `infrastructure.js` (decyzja ministerstwa, plan inwestycji), `core.js` (ustawa → polityka ministerstwa, ruchy partii), `ui.js` (mini okienko), `main.js` (migracja poziomu).
- **Test i bramka:** przy tych samych ruchach partii poziom finansowania w serii jak dziś (±0,3 poziomu średnio), GIG i marże ±0,3 pp; reakcja na przepustowość < 0,85 najwyżej raz na rok; plan inwestycji zgodny z ogłoszonymi projektami.

### P5b. Ujednolicenie ustaw

Dziś ustawy są pokazywane na dwa sposoby: w zakładce Prawo i w zakładce Kraj okna Państwa, a infrastruktura jest poza nimi. Zostaje **jeden komponent karty ustawy** (nazwa, poziom słowem i paskiem 0–4, co daje, kto chce zmiany, ostatnia zmiana) używany w obu miejscach. Kraj pokazuje skrót (najważniejsze 4 ustawy i link), Prawo pełną listę. Polityki ministerstw (infrastruktura z P5a, później energia z UEiE) mają tę samą kartę z dopiskiem „decyduje: Ministerstwo …”. Makietę wspólnego widoku robi równolegle czat designu. **Pliki:** `ui.js` (zakładki `country` i Prawo), `state.js`, `style.css`. **Test:** jedna funkcja renderuje kartę ustawy w obu miejscach; liczba i poziomy ustaw identyczne w obu widokach.

**Zlecenie dla designu:** wspólny widok ustaw (P5b) i mini okienko Ministerstwa Infrastruktury w Gospodarka → Przegląd (P5a); karta kraju z partią rządzącą i programem; panel sponsoringu i lobbingu; poziomy Nepotyzmu w drzewku umiejętności; wskaźniki klas, zdrowia i nauki w oknie Państwa.

---

## 0.19.2 Mapa kraju (dawniej Miasta 2)

Źródło: rozmowa z użytkownikiem 2026-11-03 (dawna sekcja 7 planu serii) i dopiski z 0.17.2, 0.18 i decyzji U8.

### Mapa kraju na 3 szczeblach (decyzje użytkownika 2026-11-23)

- **Szczeble:** **Stolica** (1: centrum spółek zagranicznych i głównych siedzib krajowych, popyt na kat. 4), **miasta wojewódzkie** (6: siedziby córek i oddziałów, galerie dla kat. 3), **miasta powiatowe** (12, po 2 na województwo: baza przemysłowa kat. 1–2 albo brak większych firm).
- **Nie wszystko na start:** na początku gry istnieje Stolica, część miast wojewódzkich i powiatowych oraz część połączeń między nimi. Kolejne miasta i połączenia otwierają się z czasem: przez plan inwestycji Ministerstwa Infrastruktury (0.19.1 P5a: droga albo kolej otwiera połączenie), wzrost ludności i migracje, odkrycie złoża (zdarzenie lokalne). Liczby startowe do specyfikacji (propozycja: Stolica + 4 wojewódzkie + 6 powiatowych, reszta w ciągu 10–15 lat).
- **Specjalizacje (tagi):** 6–8 tagów, miasto ma 1–2: np. Zagłębie surowcowe (tańsze wydobycie, wyższe zanieczyszczenie), Węzeł kolejowy (tańszy fracht lądowy), Miasto akademickie (Nauka, specjaliści), Kurort (Turystyka, **zakaz brudnego przemysłu**), Port (fracht morski), Centrum finansowe (tylko Stolica). Tag zmienia koszty, limity i przyciąga podsektory, z zasadą średniej zero dla marż. Tag może się zmienić (np. odkrycie złoża).
- **Polityki miejskie i okręgowe:** burmistrz (jak dziś `city.mayor`) i rada wybierają 1–2 polityki z listy (np. ulgi dla przemysłu, strefa czystego powietrza, budownictwo mieszkaniowe, przyciąganie inwestorów).
- **Migracja wewnętrzna:** raz na kwartał, ≤ 1% ludności miasta, według atrakcyjności (zanieczyszczenie, płace, poziom życia S3, mieszkania). Przykład: wyjazd z zanieczyszczonych powiatów do wojewódzkich podnosi tam popyt na mieszkania i galerie REIT. Rozszerza migrację kraju (`core.js:5270`).
- **Zdarzenia lokalne:** 6–10 typów (awaria sieci przesyłowej, odkrycie złoża, targi, powódź, nowa inwestycja zagraniczna), ≤ 1 na miasto na rok, z istniejącego silnika zdarzeń z celem „miasto”.
- **Kategorie dóbr 0–4 (widok na klasy z 0.18, bez zmiany grafu):** 0 = **usługi lokalne** (bezpieczeństwo, komunalne, opieka: wskaźnik pokrycia potrzeb miasta 0–100%, bez magazynu), 1 = M (surowce), 2 = P (półprodukty), 3 = Z i K (końcowe i inwestycyjne), 4 = L (premium). Na mapie: kat. 1–2 w powiatach, kat. 3 sprzedaje się przez powierzchnię handlową (galerie) w wojewódzkich, popyt na kat. 4 skupia się w Stolicy, a produkcja zaawansowanej kat. 4 (technologia, farmacja) wymaga wskaźnika Nauki miasta.
- Kraje obce: bez mapy do czasu silnika 0.22 i wersji krajów 0.24+ (decyzja K1).

### Model

- Kraj startowy dzieli się na **miasta** na 3 szczeblach (wyżej). Kraje obce zostają bez miast (K1). Miasto: ludność i struktura klas (0.13), **infrastruktura** (drogi, kolej, energia, łącza; 0–100), zanieczyszczenie, zadowolenie, podatek lokalny, budżet, lista projektów i spółek z siedzibą.
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
- **Okno „Miasto”:** dziś okno inwestycji miejskich (`openCityInvestmentModal`). Rejestr odblokowań przeniesiony do 1.0 (`plan_1.0.md`); Miasta 2 są dostępne bez blokady, a 1.0 dopisze im regułę.
- **Podsumowanie dekady** (0.18.8 D6, makieta 23): od 0.19.2 dochodzi komórka „Wkład w Miasto”.
- **Mapa szlaków** (makieta 16): karta kraju dostaje listę miast (przed 0.19.2 „kraj bez miast”).

---

## 0.19.3 Usługi i projekty (nowy zakres od 2026-11-23)

Wydzielone z 0.19.2, żeby Mapa kraju nie była za duża (decyzja planowania 2026-11-23, numer zwolniony przez przeniesienie Multikulturalizmu do 0.22). Obie części korzystają z miast z 0.19.2, więc idą zaraz po niej.

### Usługi w grafie: Turystyka i usługi cyfrowe (2026-11-22)

**Stan w kodzie:** Turystyka (3 spółki) nie ma roli w grafie (`goods.js`), działa tylko na profilu sektora i technologiach. Media, Gaming i Technologia/AI tylko kupują (papier, chipy: `goods.js:111–113`), a ich produkt nigdzie nie trafia. Bankowość, Finanse, Nieruchomości i Badania są poza grafem, ale mają własne mechaniki, więc zostają bez zmian.

- **Turystyka** jako nowe dobro usługowe `tourism` (klasa **Z**, a dla wyjazdów zagranicznych i hoteli premium **L**, jak herbata „klasa wg kraju”): wsad paliwa (przez transport lotniczy i lądowy), żywność, prąd; popyt obywateli z klas (luksusowa część mocniej spada w recesji, jak dobra L z 0.18.3 M2) i z **miast** (atrakcyjność, zanieczyszczenie obniża popyt). REIT-y typu `hospitality` (hotele) dostają czynsz z tego popytu.
- **Usługi cyfrowe** jako dobro `digital` (klasa **Z**, producenci: Media, Gaming, Technologia/Sztuczna inteligencja, Telekomunikacja): popyt obywateli (rozrywka, informacja; wskaźnik „informacja” poziomu życia z 0.17.2) i firm (część kosztów wszystkich sektorów usługowych i finansowych, np. 2–4%). Wsad: chipy, prąd, papier dla Mediów drukowanych. Usługa nie ma transportu ani zapasu, więc w bilansie ma zapas 0 i import tylko cyfrowy (bez frachtu, z cłem dopiero w 0.19.4).
- **Zasada grafu bez zmian:** odchylenie o średniej zero, `b = 1` na starcie (kalibracja jak w 0.18.1 P2).
- **Pliki:** `goods.js` (dwa dobra, odbiorcy), `chains.js` (usługi bez zapasu i frachtu), `reits.js` (hotele z popytu), dane miast.
- **Bramka:** marże Turystyki, Mediów, Gamingu i Technologii ±1 pp od bazy, średnia odchyłek marż 0 ± 0,3 pp, w recesji spadek popytu na turystykę L ≥ 2 × spadku Z.

### Projekty budowlane, megaprojekty i projekty czasowe (polecenie użytkownika 2026-11-22)

Polecenie: „dopracowanie i aktualizacja projektów budowlanych, megaprojektów infrastruktury i projektów czasowych”.

**Diagnoza (kod, 2026-11-22):**
- **Projekty spółek:** `INVESTMENT_CATALOG` (`companies.js:2385`), 65 pozycji w 17 grupach (`general` + 16 sektorów). Brakuje sektorów: **Alkohole, Motoryzacja, Rybołówstwo, Nieruchomości, Obronność**, a podsektory z 0.18 (Hutnictwo, Maszyny, Stocznie, Chemia polimerowa, Papiernie itd.) korzystają tylko z katalogu sektora. Koszty są **absolutne** (np. „Nowa Fabryka” 800 000), a jedyna zniżka to −10% od poziomu rozwoju 3 (`getInvestmentCostForCompany`, `companies.js:7990`), więc w długiej grze, gdy spółki rosną, projekty robią się drobne.
- **Jak wybierają boty:** `startRandomInvestment` (`companies.js:8156`) losuje **dowolną** pozycję spełniającą poziom rozwoju (`getRandomElement`), bez oceny zwrotu, gotówki ani potrzeb spółki. Katalog `general` jest dostępny zawsze, więc ogólne pozycje (biura, szkolenia) wypadają częściej niż sektorowe. Inne miejsca wyboru: przetargi budowlane (`core.js:5879`, tylko pozycje z budową), M&A (`ma.js:1710`) i miasta (`state.js:166`). Częstości w serii nie zmierzyłem: pierwszy krok PR0.
- **Megaprojekty państwa:** `MEGA_PROJECTS` (`state.js:705`), 9 pozycji. Każda jest **jednorazowa na całą grę** (`state.js:742`: projekt już ukończony albo aktywny nie wraca), więc w długiej grze katalog się wyczerpuje. Bonusy (wzrost, wycena, kondycja) dla sektorów są stałe.
- **Projekty czasowe:** `TIMED_PROJECT_TEMPLATES` (`state.js:717`), 6 pozycji, koszty 4–8 mln, też absolutne.
- **Infrastruktura:** `INFRA_TYPES` (`infrastructure.js:10`): port, lotnisko, kolej, autostrada, z przetargami na odcinki i PPP.
- **Emoji:** ikony projektów to emoji (136 pól `icon: '…'` w `companies.js`, 31 w `state.js`), wbrew zasadzie „ikony SVG”.
- **Graf:** żaden projekt nie zużywa stali, tarcicy ani maszyn, a dobra K (maszyny, pojazdy) mają popyt tylko z amortyzacji (0.18).

**Części (w 0.19.2, po modelu miast):**

| Część | Zakres | Test / bramka |
|---|---|---|
| **PR0** | **Pomiar:** sonda wyborów projektów w serii 24 × 6,5 roku i 10 × 20 lat: które pozycje boty wybierają, jak często, zwrot (koszt / roczny przyrost zysku), udział `general`; megaprojekty i czasowe: liczba na grę i rok wyczerpania katalogu | raport `raporty/diagnoza_projekty_0.19.2.md` |
| **PR1** | **Katalog spółek:** uzupełnienie o Alkohole, Motoryzację, Rybołówstwo, Nieruchomości, Obronność i podsektory z 0.18 (po 2–4 pozycje); przegląd nonsensów (pozycje bez związku z sektorem, dublujące się, z premią bez kosztu utrzymania) z listą usuniętych w raporcie; ikony SVG zamiast emoji (`uiIcon`) | każdy sektor i podsektor z grafu ma ≥ 2 pozycje; 0 emoji w katalogach |
| **PR2** | **Wybór botów według zwrotu:** zamiast losowania ocena pozycji: oczekiwany zwrot (premia przychodu × przychód spółki − utrzymanie) / koszt, gotówka i kredyt, potrzeby (np. niska kondycja → szkolenia, pełna zdolność w grafie → fabryka); losowanie ważone tą oceną, `general` bez przewagi | rozkład wyborów z PR0 bez jednej pozycji > 20% wszystkich; GIG i marże ±0,3 pp |
| **PR3** | **Skala w długiej grze:** koszt, wartość aktywa, utrzymanie i premie liczone względem wielkości spółki (np. koszt = udział rocznego przychodu, z widełkami) i inflacji, a koszty megaprojektów i czasowych względem PKB / wpływów państwa | w grze 20-letniej średni koszt projektu / przychód spółki w roku 15–20 = ± 20% roku 1–5 |
| **PR4** | **Graf towarów:** projekty budowlane mają wsad (stal, tarcica, cement przez Budowlany, maszyny jako dobro K dla fabryk i zakładów) liczony w bilansie jako popyt inwestycyjny; niedobór stali opóźnia budowę albo podnosi koszt (zamiast cichego braku) | kalibracja `b = 1` na starcie; niedobór stali −20% wydłuża budowy o 10–30% |
| **PR5** | **Kto zamawia:** spółka (katalog), **miasto** (projekty miasta z modelu 0.19.2: szpitale, uniwersytety, galerie, łącza, metro), **państwo przez Ministerstwo Infrastruktury** (0.19.1 P5a: porty, lotniska, kolej, autostrady, mosty) i rząd (megaprojekty narodowe). Wspólny opis zamawiającego w przetargu (kto płaci, kto dostaje premię) | każdy projekt ma zamawiającego; budżety państwa i miast bez ujemnych sald |
| **PR6** | **Megaprojekty powtarzalne:** szablony zamiast jednorazowych pozycji (np. „Szpital kliniczny” w kolejnym mieście, „Elektrownia” kolejny blok), z odstępem między tymi samymi typami (np. 3 lata) i limitem liczby aktywnych (`MAX_ACTIVE_PROJECTS = 2` zostaje); nazwa z miastem lub numerem; projekty czasowe jako pula wydarzeń z kalendarza (co rok inne, wybór według miast i rządu) | w 20 latach 6–12 megaprojektów i ≥ 1 na każde 3 lata; katalog się nie wyczerpuje |
| **PR7** | **Czytelne skutki dla gracza:** karta projektu pokazuje, kto zamawia, koszt, czas, wsad z grafu, komu daje premię i jak dużą (słowem i liczbą), co zmienia po ukończeniu (np. przepustowość, poziom życia miasta); wpis w Gazecie przy starcie i odbiorze | test DOM karty; brak emoji |
| **PR8** | Kontrola części projektów w ramach kontroli 0.19.2 | GIG 20 lat 10–13%, marże 0 ± 0,3 pp, czas kroku ≤ 900 ms/kw. |

**Pliki:** `companies.js` (`INVESTMENT_CATALOG`, `startRandomInvestment`, koszt), `state.js` (`MEGA_PROJECTS`, `TIMED_PROJECT_TEMPLATES`, harmonogram), `infrastructure.js` (ministerstwo jako zamawiający), `chains.js` (popyt inwestycyjny), `ui.js` (karta projektu), `img/` (ikony), `tests/przebiegi.html` (sonda).

**Dlaczego w 0.19.3 (po Mapie kraju):** miasta są nowym zamawiającym większości projektów (szpitale, uniwersytety, galerie, łącza), a Ministerstwo Infrastruktury z 0.19.1 jest już wtedy gotowe. Robienie katalogów przed miastami oznaczałoby drugi przegląd tych samych pozycji.

**Dlaczego tutaj (w 0.19.3, po miastach z 0.19.2), a Ministerstwo w 0.19.1:** Ministerstwo Infrastruktury to nowy urząd sterowany przez rząd i partie, więc pasuje do P5 (nowe urzędy) i P3 (lobbing) w 0.19.1, a Miasta 2 od razu dostają z niego budżet infrastruktury miast. Turystyka i usługi cyfrowe potrzebują popytu z klas po S1 (0.19.1) i z miast (atrakcyjność, zanieczyszczenie, informacja), więc wchodzą razem z Miastami; wcześniej popyt byłby tylko krajowy i trzeba by go przeliczać drugi raz.

### Ryzyko (0.19.2 i 0.19.3)

Miasta dotykają zapisu (kilkadziesiąt obiektów), czasu kroku (oddziały) i UI (mapa). Pomiar względem budżetu 900 ms/kw.

---

## 0.22 Multikulturalizm: wspólny silnik „flavour” (dawne 0.19.3, przeniesione 2026-11-23)

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
- **Każdy kraj ma własną wersję po silniku 0.22 i Globalnych korporacjach 0.23 (numery od 2026-11-23):** 0.24 Niemcy (wzór), potem USA, Czechy, dalej Szwecja, Szwajcaria, Francja, Japonia, Chiny, Indie, Tajwan (kolejność do ustalenia). Każda z pomiarem GIG ±1 pp i czasu kroku.
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

## 0.24+ Wersje krajów (dawne 0.19.6+, przeniesione 2026-11-23)

0.24 Niemcy (Landy, ład korporacyjny, firmy, badania, partie, wydarzenia, nazwy, boty, motyw), 0.19.7 USA, 0.19.8 Czechy, dalej pozostałe kraje. Zakres według 0.19.3.
