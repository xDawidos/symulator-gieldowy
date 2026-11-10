# Plan 0.18 „Łańcuchy produkcyjne” (specyfikacja 2026-11-10; po 0.17.3, przed 0.19.1)

Zastępuje szkic z 2026-10-25. Decyzje z rozmowy 2026-11-10 są w sekcji „Decyzje”. Rejestr dóbr, receptury, udziały popytu, model bilansu i nowe IPO są opisane w `plan_seria_0.18_towary_ipo_miasta.md` (sekcje 2–6) i tu się ich nie powtarza. Ten plan dzieli to na wersje i części. Liczby są startowe, stroi je sesja kodu w bramkach.

**Cel:** gospodarka ma pełny graf ogniw: wydobycie → przetwórstwo → fabryka → transport → dystrybucja → konsumpcja. Ceny dóbr wewnętrznych biorą się z podaży i popytu. Gdy jedno ogniwo pada (strajk w kopalni, blokada cieśniny), skutek idzie w dół łańcucha.

**Czego uczy:** łańcucha wartości, szoku podażowego i efektu byka, zapasów (bufor czy koszt), substytucji i R&D, różnicy między popytem na dobra zwykłe i luksusowe.

## Stan wyjściowy (po scaleniu 0.17.1, d0f193e)

| Miara | Wartość (kontrola 0.17.1, T6) |
|---|---|
| Testy | 1062/1062 |
| GIG 6,5 roku / 20 lat | 11,01% / 12,44% (cel 20 lat 8–11%) |
| Średnia odchyłek marż sektorów | −0,15 pp |
| Zapis (6,5 roku / 10 krajów) | 2,43 mln / 2,59 mln znaków |
| Czas kroku (po kolei, z UI, 6 gier) | 2339 ms/kw., rozrzut 1323–3957 |
| Format zapisu | v23 |
| Linie kryzysu | 5 (`CRISIS_LINE_ORDER` w `crises.js`), 1,1 na 20 lat |

**Stan kodu, który plan zakłada:**
- `commodities.js` liczy tylko wpływ cen na wyniki (K1). Bilansu ilości nie ma. Wsad i produkt są przypisane po symbolu (`COMMODITY_ASSIGNMENTS`) i po sektorze (`COMMODITY_SECTOR_INPUTS`, `COMMODITY_SUBSECTOR_INPUTS`).
- `metals` to jeden surowiec, który odpowiada miedzi i żelazu razem (MLD, KJM, UOW, TKS, SSA, GLK, zdarzenie `strike`).
- Podsektory są w `SECTORS` (`core.js:1847`). Hutnictwa, Maszyn, Stoczni, Chemii polimerowej, Nawozów ani Przetwórstwa spożywczego nie ma. Chemia nie ma podsektorów, a jej profil emisji jest zgadywany z symbolu i nazwy (`CHEM_PROFILE_BY_SYMBOL`, `energy.js:423`).
- Prąd liczy `energy.js` (0.17.2), a okno Państwa ma zakładki (`stateTab`, `ui.js:8373`). Panel energii w `energy_ui.js` jest wzorem dla nowego panelu.

## Zasady (obowiązują we wszystkich wersjach)

1. **Graf to odchylenie, nie zastąpienie.** Marżę sektora wyznacza profil (zasada 0.13). Graf dodaje odchylenie o średniej zero w czasie. Na starcie bilans każdego dobra wynosi 1 z konstrukcji.
2. **Poziom szczegółu:** podsektor × kraj. Partii towaru nie śledzimy. Ogniwo ma aktywność, zdolność, zapas i cenę.
3. **Czysty moduł.** `goods.js` (rejestr) i `chains.js` (bilans) nie dotykają DOM ani `window`. Receptury trzymamy w `Float32Array`, a bilans liczymy raz na kwartał. Spółka czyta gotowy czynnik `factor[podsektor][kraj]`. Worker przyjdzie później (0.18.5), moduł ma być do niego gotowy.
4. **Giełda towarowa zostaje egzogeniczna.** Sprzężenie z bilansem jest jednokierunkowe i słabe: `(b_świat)^(−0,3)`, w widełkach ±15% (seria 5.1).
5. **Każda część kończy się commitem.** Przed commitem: testy jednostkowe i przebiegi ×200, bez błędów JS i niezmienników.
6. **Zapis:** pola opcjonalne. Stare zapisy uzupełnia pierwszy kwartał. Dobra wewnętrzne trzymają najwyżej 40 kwartałów historii i nic tygodniowo (K4).
7. **UI:** tylko ciemny motyw, ikony SVG zamiast emoji, PLN, „udział” zamiast JU, „konto prywatne”. Kolor nigdy nie jest jedynym nośnikiem informacji. Bez nowych okien modalnych.

## Podział wersji

| Wersja | Nazwa | Zakres w skrócie | Bramka |
|---|---|---|---|
| **0.18.0** | Porządki przed grafem | wspólny kod spółek polskich i zagranicznych, usunięcie kwitów GDR, poziomy giełd, błędy z gry 2026-11-10 | na końcu |
| **0.18.1** | Pilotaż | rejestr dóbr, nowe podsektory, rozdzielenie `metals`, bilans w trybie cichym, potem 3 łańcuchy włączone, szok podażowy jako 6. linia kryzysu, panel Państwo → Łańcuchy | po trybie cichym i na końcu |
| **0.18.2** | Pełny graf | pozostałe łańcuchy po grupach sektorów, prąd jako wsad wszystkich, uran i blok w 3 etapach, Mennica z wyłącznikiem, usługi jako dystrybucja, podwykonawcy | na końcu (GIG strojony z bilansem) |
| **0.18.3** | Mechaniki grafu | magazyny i zapasy, hierarchia konsumpcji, substytucja i R&D, ESG, mapa szlaków | na końcu |
| **0.18.4** | Audyt, oceny i IPO | księgowość i audyt jako B2B, ocena AAA–D, nowe IPO, finanse z serii (filie banków, Lombardex/Limbard, Wrona), sufity 130/180 | na końcu |
| **0.18.5** | Wydajność | profil kwartału, budżet ms/kw. dla serii, rzadsze rysowanie przy ×200, LOD spółek, Worker dla grafu i surowców, jeśli pomiar go uzasadni | kontrola końcowa 0.18 |
| po 0.18 | Cel gry | `plan_cel_gry.md` jako osobna wersja (numer nadamy przy planowaniu) | — |

Wersje idą po kolei. Każda zaczyna się od pomiaru bazy poprzedniej i kończy kontrolą `raporty/kontrola_0.18.N.md`.

---

## Zgłoszenia z gry (2026-11-10) i przydział

Przed każdą naprawą trzeba odtworzyć błąd w kodzie albo w przebiegu.

| # | Zgłoszenie | Wstępna przyczyna (z przeglądu kodu, niesprawdzona) | Część |
|---|---|---|---|
| Z1 | 212 spółek w grze, a tylko 3 na Giełdzie Platynowej | próg PLATINUM to `minPrice: 1500` (`companies.js:1300`), więc o poziomie decyduje cena akcji, a nie wielkość spółki | 0.18.0 R3 |
| Z2 | Wszystkie spółki giełd dołączających lądują na Złotej | prawdopodobnie poziom przydzielany na sztywno przy połączeniu giełd, a nie z ceny | 0.18.0 R3 |
| Z3 | Polską spółkę diamentową można otworzyć na wykresie bez kupowania, zagranicznej nie | osobne ścieżki kodu dla spółek polskich i obcych | 0.18.0 R1 |
| Z4 | Ten sam kod w dwóch wersjach dla spółek polskich i zagranicznych | jak wyżej (widok „źródło danych” z 0.16.9 połączył tylko część) | 0.18.0 R1 |
| Z5 | Kwity GDR do usunięcia, nic ciekawego nie dodają | — | 0.18.0 R2 |
| Z6 | Prezesi z innych giełd: cechy narodowe, ale też z puli ogólnej | `ceoTraits` (`companies.js:682`) to jedna pula; brak puli narodowej | 0.18.0 R4 |
| Z7 | Boty na Tied zawsze piszą tę samą wiadomość; mają mieć 3 warianty, w tym jeden z imieniem autora posta | jeden szablon odpowiedzi | 0.18.0 R5 |
| Z8 | Posty Tied zawsze zaczynają się od „Z dumą…” | dwa stałe wstępy (`tied.js:61`) | 0.18.0 R5 |
| Z9 | Państwo → Przegląd: karta „Spółki Skarbu Państwa” się nie odświeża | karta budowana raz przy otwarciu (`ui.js:8384`), do sprawdzenia | 0.18.0 R6 |
| Z10 | Kryzysy są mało widoczne | tylko wiadomość i ikona | 0.18.1 P4 (baner) |
| Z11 | REIT „Zdrowie” (szpitale na wynajem, HOR) jest najmocniejszy w grze | profil `health`: zwrot 6,5% i prawie zero spadku w recesji (−0,01), a w pandemii zysk (`reits.js:28`) | 0.18.2 G6 |
| Z12 | Za mało banków późno w grze (23 lata) | do diagnozy: upadki i przejęcia banków bez nowych | 0.18.4 A1 |
| Z13 | Wykres liniowy liczby spółek na giełdzie z eksportem wyników | — | 0.18.4 A4 |

---

## 0.18.0 Porządki przed grafem

Graf liczy się jako podsektor × kraj, więc spółki polskie i zagraniczne powinny przechodzić przez ten sam kod, zanim ruszy pilotaż. Pomiar bazy P0 jest robiony już po 0.18.0.

| Część | Zakres | Pliki | Test / weryfikacja |
|---|---|---|---|
| **R0** | **Spis podwójnego kodu:** lista funkcji z osobną wersją dla spółek polskich i obcych (wykres, karta, szuflada, kupno, poziom giełdy, wyniki, zdarzenia). Dla każdej: czy łączymy i jakim kosztem. Lista do akceptacji użytkownika | `raporty/spis_kodu_pl_obce_0.18.0.md` | — |
| **R1** | **Wspólny model spółki:** łączenie funkcji z R0 po kawałku, jedna funkcja z parametrem kraju lub źródła danych, po każdym kawałku testy. W tym wykres spółki bez posiadania akcji jednakowo dla polskich i obcych (Z3) | `foreign_companies.js`, `companies.js`, `ui.js`, `countries_ui.js` i inne według R0 | test per scalona funkcja; przebiegi 24 gry: GIG i marże ±0,5 pp, 0 błędów |
| **R2** | **Usunięcie kwitów GDR** (decyzja: bez migracji). Kasujemy `gdr.js`, odwołania w 9 plikach, zakładkę kwitów, pola w zapisie (v24), sondy i testy GDR. Stare zapisy nie są przeliczane: przy wczytaniu pola kwitów są pomijane, a kwity przepadają bez zwrotu | `gdr.js` (usunięty), `countries.js`, `countries_data.js`, `countries_ui.js`, `currency.js`, `currency_ui.js`, `internet.js`, `listings.js`, `main.js`, `player.js`, `index.html`, `tests/` | brak odwołań do GDR (`grep`); stary zapis z kwitami wczytuje się bez błędu; niezmienniki 0 |
| **R3** | **Poziomy giełd (Z1, Z2):** diagnoza rozkładu spółek po poziomach w serii (krajowe i obce); poziom spółek z giełd dołączających z ceny jak u krajowych; strojenie progów, tak żeby PLATINUM miał sensowny udział (propozycja: 5–10% spółek, do decyzji po diagnozie). Przy niskich kursach zależy też od podziałów akcji (`splits.js`) | `companies.js` (`exchanges`, przydział poziomu), `exchange_links.js`, `foreign_companies.js`, `splits.js` | rozkład poziomów w raporcie; spółki dołączające nie wszystkie na GOLD |
| **R4** | **Prezesi obcych spółek (Z6):** pula cech narodowych per kraj + pula ogólna; losowanie np. 1 cecha narodowa i reszta z ogólnej | `companies.js` (`ceoTraits`, losowanie), `countries_data.js` | każdy kraj ma pulę; prezes obcej spółki ma co najmniej 1 cechę narodową |
| **R5** | **Teksty Tied (Z7, Z8):** 3 warianty odpowiedzi botów na post, w tym jeden z imieniem autora; 6–8 wstępów postów dla spółki i dla współpracy | `tied.js` | test: w 50 postach co najmniej 4 różne wstępy, odpowiedzi botów nie powtarzają się pod jednym postem |
| **R6** | **Państwo → Przegląd: Spółki Skarbu Państwa (Z9):** karta odświeża się po nacjonalizacji i prywatyzacji oraz co tydzień przy otwartym oknie | `ui.js` | test: po nacjonalizacji karta pokazuje nową spółkę bez ponownego otwarcia okna |
| **R7** | Kontrola 0.18.0, `raporty/kontrola_0.18.0.md` | — | seria 24 × 6,5 roku |

**Bramka 0.18.0:** GIG i marże ±0,5 pp względem d0f193e, 0 błędów i niezmienników, testy zielone, zapis bez wzrostu (GDR usunięte), czas kroku bez wzrostu.

---

## 0.18.1 Pilotaż

Trzy łańcuchy (decyzja 2026-10-25): **metale → motoryzacja i stocznie**, **ropa i gaz → paliwa i chemia**, **zboże → żywność**.

**Dobra w pilotażu (16):** ruda żelaza, miedź, węgiel, ropa, gaz, zboże (M, z kontraktem); stal, paliwa, półprodukty chemiczne, guma, nawozy (P); maszyny, statki, pojazdy użytkowe (K); samochody osobowe, żywność i piwo (Z). Prąd jest wsadem stałym, czytanym z `energy.js` bez zmian (pełne sprzężenie w 0.18.2). Miedź dostaje kontrakt już teraz, ale jej łańcuch dopiero w 0.18.2.

### P0. Pomiar bazy 0.18

- **Zakres:** seria na stanie po 0.18.0: 50 × 6,5 roku, 20 × 20 lat, 20 × `kraje-stopniowo`, czas kroku po kolei (6 gier). Do tego sonda „profil wsadu” dla każdego podsektora × kraj: przychód, koszt wsadu, marża. Z niej P2 skalibruje macierze `A` i `B`.
- **Pliki:** `tests/przebiegi.html` (sonda `PROBE_018`), `design/narzedzia/baza_serie.mjs`, raport `raporty/baza_0.18.md`.
- **Weryfikacja:** raport z tabelą jak „Stan wyjściowy”, plus rozkład przychodu podsektorów w PL i za granicą.
- **Bramka:** liczby bazy zapisane. Kodu gry nie zmieniamy.

### P1. Rejestr dóbr, nowe podsektory i rozdzielenie `metals`

- **Zakres:**
  - `goods.js`: rejestr dóbr z polami: id, nazwa, klasa M/P/K/Z/L, producent (podsektor), kontrakt tak/nie, `δ` dla K, ikona SVG. Dobra spoza pilotażu wpisujemy od razu z flagą `active: false`, żeby 0.18.2 tylko je włączało.
  - Nowe podsektory: Przemysł → **Hutnictwo**, **Maszyny**, **Stocznie** (STM przechodzi z Przemysłu ciężkiego); Chemia → **Chemia polimerowa**, **Nawozy**, **Farmacja** (z `CHEM_PROFILE_BY_SYMBOL`, czyli koniec zgadywania z nazwy w `energy.js`); Żywność → **Przetwórstwo spożywcze**. Najpierw przypisujemy istniejące spółki. Nowe spółki (najwyżej 6) dodajemy tylko tam, gdzie ogniwo w PL nie ma producenta. Lista nowych spółek jest do akceptacji użytkownika przed commitem.
  - **`metals` → `iron` + `copper`:** dwa kontrakty (`COMMODITY_DEFS`), przypisania MLD, KJM, UOW, TKS, SSA, GLK według profilu spółki, zdarzenie `strike` losuje jedno z dwóch. Migracja zapisu: obie ceny startują od średniej 8 kw. starego `metals`, a pozycje kontraktów i ETC na `metals` przechodzą 50/50. ETF koszykowy dostaje nowe wagi. To ósmy surowiec. Kawa wchodzi w 0.18.2.
  - Emoji w tekstach zdarzeń surowcowych zamieniamy na ikony SVG (K5).
- **Pliki:** `goods.js` (nowy), `core.js` (`SECTORS`, `SUBSECTOR_START_ASSIGNMENTS`), `commodities.js`, `commodity_market.js`, `energy.js` (profil chemii z podsektora), `companies.js` (nowe spółki), `countries_data.js` (przypisania zagraniczne), `main.js` (zapis v25, migracja `metals`), `index.html` (skrypt).
- **Test:** rejestr spójny (każde dobro ma producenta i co najmniej jednego odbiorcę), migracja zapisu v24 → v25 z pozycją na `metals`, podsektory przypisane zgodnie z tabelą, brak emoji w tekstach surowców.
- **Bramka:** średnia odchyłek marż 0 ± 0,3 pp względem P0 (nowe podsektory nie mogą przesunąć balansu), GIG ±1 pp, 0 błędów, testy zielone.

### P2. Bilans w trybie cichym

- **Zakres:** `chains.js` liczy co kwartał aktywność `x_j`, zdolność `c_j`, popyt `D = A·x`, podaż `S = B·min(x, c)`, zapas, bilans `b` i cenę wewnętrzną `P = P0·b^(−ε)` (seria 5.2). **Wynik niczego nie zmienia:** trafia tylko do sondy i do zapisu. Macierze `A` i `B` kalibrujemy z P0 tak, żeby na starcie `b = 1` dla każdego dobra i kraju. Cykle (maszyny → maszyny) łamie opóźnienie 1 kwartału. Import pokrywa niedobór z krajów z nadwyżką do limitu przepustowości (`infrastructure.js`), koszt to fracht (`freight.js`), cła = 0. Dobra kapitałowe: zasób `K` per podsektor × kraj, popyt `δ·K` + ekspansja.
- **Pliki:** `chains.js` (nowy, bez DOM), `core.js` (wywołanie raz na kwartał po wynikach), `main.js` (zapis stanu: aktywność, zdolność, zapas, cena, 40 kw. historii ceny), `tests/przebiegi.html` (sonda `chains`).
- **Test:** `b = 1 ± 0,01` w kwartale 1. Zachowanie masy: `S + import − D − Δzapas = 0` dla każdego dobra. Widełki ceny 0,5–2,0 × P0. Moduł działa bez `document` (test w czystym kontekście).
- **Bramka cicha:** w 20 grach × 6,5 roku bilans zostaje w 0,8–1,25 w 90% kwartałów, ceny wewnętrzne w 0,7–1,4 × P0, a czas obliczeń bilansu ≤ 5% kroku. Wynik gry identyczny jak w P1 przy tym samym ziarnie, bo tryb cichy niczego nie zmienia.

### P3. Włączenie trzech łańcuchów

- **Zakres:** czynnik `factor[podsektor][kraj]` (przychód i koszt wsadu) zastępuje dla dóbr pilotażu przeliczanie profilu z segmentów (K2). Niedobór (`b < 1`) obniża aktywność odbiorcy o `(1 − b)` ważone udziałem wsadu. Priorytet ma obronność i państwo, reszta dostaje proporcjonalnie. Cena wewnętrzna wchodzi w koszt odbiorców i przychód producentów. Słabe sprzężenie z kontraktami: `(b_świat)^(−0,3)` w ±15%. Popyt per kraj usuwa skrót z `getCommodityIndustryDemand()` (K6). Wyłącznik `CHAINS_ACTIVE` (domyślnie włączony) pozwala porównać serię z P2.
- **Pliki:** `chains.js`, `commodities.js` (odczyt czynnika zamiast pętli po segmentach dla dóbr pilotażu), `companies.js` (wynik kwartalny spółki), `core.js`.
- **Test:** czynnik ze średnią 1 na starcie. Ręczny niedobór stali −20% obniża marżę motoryzacji, a huta zyskuje cenowo. Sprzężenie z kontraktem nie wychodzi poza ±15%.
- **Bramka:** średnia odchyłek marż 0 ± 0,3 pp, GIG 6,5 roku ±1 pp względem P0, GIG 20 lat nie gorszy niż 12,4% (strojenie GIG z bilansem w 0.18.2). Marże sektorów pilotażu (Przemysł, Motoryzacja, Chemia, Żywność, Alkohole, Transport) mieszczą się w ±1 pp od bazy. Czas kroku ≤ +15%, zapis ≤ +4%.

### P4. Szok podażowy jako 6. linia kryzysu

- **Zakres:** linia `supply` w `CRISIS_LINES` z wariantami: blokada cieśniny, strajk portowy, strajk w kopalni. Etapy jak w 0.15.3. Szok zmniejsza zdolność `c_j` ogniwa na 2–4 kw., a skutek idzie w dół łańcucha z opóźnieniem (efekt byka). Tracą ogniwa za szokiem, zyskują dostawcy z innych krajów (import). Linia korzysta ze wspólnego budżetu częstości linii i ma ikonę SVG, bez emoji.
  - **Baner kryzysu (Z10, dla wszystkich 6 linii):** niemodalny baner u góry ekranu przy starcie linii i przy zmianie etapu. Ma animację spadającego wykresu, nazwę kryzysu, etap i krótkie „co to znaczy dla Ciebie”. Można go zamknąć. Przy ograniczeniu ruchu (`prefers-reduced-motion`) animacji nie ma. Przy ×200 baner pokazuje się najwyżej raz na etap.
- **Pliki:** `crises.js` (`CRISIS_LINES`, `CRISIS_LINE_ORDER`), `chains.js` (mnożnik zdolności), `events.js` (wiadomości), `ui.js` i `style.css` (baner), preset `kryzys` w `tests/przebiegi.html` (szósta linia).
- **Test:** wymuszona linia: cena stali rośnie, a marża motoryzacji spada z opóźnieniem 1–2 kw. Zdolność wraca po linii. Budżet linii nie rośnie. Baner pojawia się przy starcie i przy każdym etapie, raz, i nie blokuje okien.
- **Bramka:** cena w dół łańcucha +3–15% w Zarażaniu, powrót w 4–8 kw. Wszystkie linie razem 1–2 na 20 lat. Zyskujące sektory ≥ GIG + 5 pp w ≥ 70% gier z linią.

### P5. Interfejs i Akademia

- **Zakres:** zakładka **Państwo → Łańcuchy** (wzór: panel energii) i wiersz łańcucha w karcie spółki → Przegląd. Hasła Akademii „Łańcuch wartości”, „Efekt byka”, „Bilans dobra”. Ikony dóbr i ogniw z makiety designu. Szczegóły ekranów są w sekcji „Lista ekranów dla designu”.
- **Pliki:** `chains_ui.js` (nowy, wzór `energy_ui.js`), `ui.js` (zakładka `stateTab === 'chains'`, wiersz w karcie spółki), `learning.js` (`ACADEMY_ENTRIES`), `style.css`, `img/` (ikony z `design/makiety/018_ikony.svg`), `index.html`.
- **Test:** panel renderuje się bez błędów dla PL i kraju obcego, również przy pustym stanie (stary zapis przed pierwszym kwartałem). W wiadomościach i panelu nie ma emoji. Wiersz w karcie spółki pokazuje się tylko spółkom z ogniwa.
- **Bramka:** przegląd zrzutów z makietą `13_lancuch_018.html`, kontrast tokenów jak w `design/kontrast_tokenow.md`.

### P6. Kontrola 0.18.1 i bramka pilotażu

- **Zakres:** pełna seria jak P0 plus preset `kryzys` z linią `supply`. Raport `raporty/kontrola_0.18.1.md` i wiersz w mapie.
- **Bramka pilotażu (warunek startu 0.18.2):**

| Miara | Cel |
|---|---|
| Średnia odchyłek marż sektorów | 0 ± 0,3 pp |
| GIG 6,5 roku | ±1 pp względem P0 |
| GIG 20 lat | nie gorszy niż 12,4% |
| Szok podażowy | +3–15% w dół łańcucha, powrót 4–8 kw., linie 1–2 na 20 lat |
| Czas kroku / zapis | ≤ +15% / ≤ +4% względem P0 |
| Niezmienniki, błędy JS, ujemna gotówka | 0 |

Jeśli któraś miara wyjdzie poza cel, 0.18.2 nie rusza, dopóki pilotaż nie zostanie dostrojony.

---

## 0.18.2 Pełny graf

Pozostałe łańcuchy z serii (sekcja 3, pkt 4–10) po grupach sektorów. Każda część włącza swoje dobra w rejestrze, dodaje podsektory i przypisania, kalibruje `A` i `B` tak, żeby na starcie `b = 1`, i dopisuje testy spójności. **Bramka każdej części:** średnia odchyłek marż 0 ± 0,3 pp, 0 błędów, czas kroku ≤ +5% na część.

| Część | Zakres | Pliki (poza `goods.js`, `chains.js`, `core.js`, testami) |
|---|---|---|
| **G0** | Pomiar bazy po 0.18.1 | `raporty/baza_0.18.2.md` |
| **G1** | **Surowce:** ziemie rzadkie, siarka (+ współprodukt rafinerii), złoto jako wydobycie, uran jako wydobycie, **Leśnictwo** (drewno, tarcica), **kawa** jako 9. kontrakt (bez producenta i odbiorcy). Srebro jako współprodukt miedzi (stały współczynnik, bez kontraktu) | `commodities.js`, `commodity_market.js`, `companies.js`, `countries_data.js`, `main.js` (v26) |
| **G2** | **Chemia i papier:** papiernie, baterie (Chemia), półprodukty dla farmacji, łańcuch miedzi (energetyka, baterie, elektronika) | `companies.js`, `energy.js` (emisje nowych podsektorów) |
| **G3** | **Przemysł i technologia:** przemysł lotniczy (najwyżej 3 duże spółki), sprzęt medyczny, roboty, półprzewodniki (dużo prądu, ziemie rzadkie, srebro), odbiorcy chipów (AI, gaming, drony, media cyfrowe) | `companies.js`, `player.js` (`MODERN_SUBSECTORS`) |
| **G4** | **Energia w grafie:** prąd jako dobro P z wsadem prawie każdego sektora (miks z `energy.js`), uran → blok jądrowy w 3 etapach (badania → konsorcjum do 3 firm → uruchomienie) zamiast `nuclearBlock` | `energy.js`, `companies.js` (blok), `energy_ui.js` |
| **G5** | **Obronność i zdrowie:** drony, amunicja (siarka), pojazdy bojowe, rakiety (konsumują samoloty, uproszczenie), farmacja → szpitale, sprzęt medyczny | `companies.js`, `core.js` (`society.defense`) |
| **G6** | **Budownictwo, nieruchomości i podwykonawcy:** stal, cement i tarcica dla Budowlanego, REIT typu `residential` (K7), strojenie REIT `health` (Z11: dziś najmocniejszy w grze; recesja i pandemia, zwrot z najmu; cel: wynik REIT-ów w jednym przedziale ±3 pp/rok), rynek podwykonawców: powstawanie nowych, specjalności, geolodzy i energetyczni z 0.17.2 | `reits.js`, `subcontractors.js`, `companies.js` (projekty budowlane) |
| **G7** | **Usługi, dystrybucja i Mennica:** handel i usługi jako ogniwo dystrybucji dóbr końcowych (bez galerii, które wejdą z miastami w 0.19.2), Mennica (papier, maszyny, złoto, srebro, miedź → gotówka) z wyłącznikiem `MINT_ACTIVE` | `companies.js`, `finance.js` (gotówka w bankach), `chains.js` |
| **G8** | **Strojenie GIG razem z bilansem** (decyzja 2026-11-10): seria 20 × 20 lat. Pokrętła: `ε`, sprzężenie z kontraktami, koszt importu, tempo amortyzacji K. Cel: GIG 20 lat 8–11% przy marżach 0 ± 0,3 pp. Jeśli bilans nie wystarczy, decyzja użytkownika przed 0.18.3 | `chains.js` (stałe), raport strojenia |
| **G9** | Kontrola 0.18.2, `raporty/kontrola_0.18.2.md` | — |

**Bramka 0.18.2:** marże 0 ± 0,3 pp, GIG 6,5 roku ±1 pp względem G0, GIG 20 lat według G8, czas kroku ≤ +25% i zapis ≤ +8% względem P0 (bazy 0.18.1), 0 błędów. Mennica: seria z włączoną i wyłączoną, różnica GIG ≤ 0,5 pp, inaczej zostaje wyłączona.

---

## 0.18.3 Mechaniki grafu

| Część | Zakres | Pliki | Test / weryfikacja |
|---|---|---|---|
| **M0** | Pomiar bazy po 0.18.2 | raport | — |
| **M1** | **Magazyny i zapasy:** pojemność zapasu z REIT-ów `warehouse` i podsektora Magazyny (LIN), koszt trzymania, cel pokrycia 0,5 kw., bufor w szoku, inwestycja „hala / terminal” w katalogu inwestycji | `chains.js`, `reits.js`, `companies.js` (katalog) | szok z pełnym magazynem daje płytszy skok ceny niż z pustym; koszt trzymania widać w marży magazynów |
| **M2** | **Hierarchia konsumpcji:** dobra Z i L, popyt na luksus 2–3 razy mocniej reaguje na recesję, udział klas wyższych (0.13), herbata jako „klasa wg kraju” (Azja Z, poza Azją L), poziom życia (0.17.2) czyta konsumpcję | `chains.js`, `core.js` (społeczeństwo), `energy.js` (poziom życia) | w recesji spadek sprzedaży luksusu ≥ 2 × spadek dóbr Z; herbata w JP jako Z |
| **M3** | **Substytucja i R&D:** technologie (0.13) zmieniają współczynniki `A` (kompozyty zamiast stali, automatyzacja zamiast pracy) stopniowo, z limitem rocznej zmiany | `chains.js`, `companies.js` (technologie) | po technologii udział stali w motoryzacji spada zgodnie z tabelą; bilans stali przechodzi z 1 płynnie |
| **M4** | **ESG** (rozwinięcie 0.17.2 E4): emisyjność z receptury zamiast profilu, ścieżka ESG spółki (koszt jednorazowy, niższe emisje, ocena ESG), wymóg poziomu UEiE | `energy.js`, `companies.js`, `energy_ui.js` | emisje kraju bez skoku przy przejściu na recepturę (±5%); spółka ESG ma niższe emisje |
| **M5** | **Mapa szlaków:** państwa i połączenia (morskie, lotnicze, lądowe) ze statusem słownym: aktywny, utrudniony, wstrzymany; przepustowość i obciążenie z importu w bilansie | `chains_ui.js`, `infrastructure.js` (odczyt), `ui.js` | mapa pokazuje wstrzymane połączenie w trakcie linii `supply`; czytelna bez koloru |
| **M6** | Kontrola 0.18.3, `raporty/kontrola_0.18.3.md` | — | — |

**Bramka 0.18.3:** marże 0 ± 0,3 pp, GIG ±1 pp względem M0, zanieczyszczenie po 20 latach średnio 55–65 (ESG nie może go rozregulować), czas kroku ≤ +10%, 0 błędów.

---

## 0.18.4 Audyt, oceny i nowe IPO

Szczegóły w serii, sekcja 6.

| Część | Zakres | Pliki | Test / weryfikacja |
|---|---|---|---|
| **A0** | Pomiar bazy po 0.18.3 | raport | — |
| **A1** | **Finanse z serii:** księgowość jako usługa B2B (z niej wyrasta audytor), filie banków, Lombardex/Limbard, Wrona (pożyczki konsumenckie, zgłoszenie 9.1 pkt 12); **za mało banków późno w grze (Z12):** diagnoza liczby banków w serii 20 × 23 lata (upadki, przejęcia, nowe), nowe banki lub filie, gdy liczba spadnie poniżej progu | `finance.js`, `companies.js`, `internet.js` | lombard nie jest pusty, a Wrona ma klientów w serii; liczba banków po 23 latach ≥ liczby startowej − 1 |
| **A2** | **Audyt i ocena AAA–D:** ocena ważna 4 kw., szum ±1 stopień (Big 3 myli się rzadziej), przekupstwo audytora z ujawnieniem (spadek kursu, kara, utrata licencji, śledztwo policji, więcej w kraju z silną mafią), selekcja ujawnień (spółki pokazują tylko ≥ A), 2 losowe oceny na kwartał | `listings.js`, `companies.js`, `security.js` (policja) | rozkład ocen w serii; ujawnienie przekupstwa daje spadek kursu |
| **A3** | **Nowe IPO:** gotowość → audyt → opiekun emisji (prowizja 3–7%) → cena emisyjna z dyskontem 5–15% → subskrypcja z redukcją → wejście. Wycofanie emisji w bessie. Ocena jako bramka poziomu giełdy (GOLD ≥ BBB … DIAMOND ≥ AAA) | `listings.js`, `companies.js` (`chooseDebutMarket`), `ui.js` | debiuty na grę jak w bazie ±20%; spółka bez oceny zostaje na poprzednim poziomie |
| **A4** | **Sufity** 110 → 130 i 150 → 180, kolejka `awaitingListing` zostaje. **Wykres liczby spółek (Z13):** wykres liniowy liczby spółek na giełdach (łącznie i według rynku lub poziomu) w grze, z eksportem do CSV | `companies.js` (`LISTING_HARD_CAP`, `LISTING_TOTAL_CAP`, historia liczby spółek), `ui.js` (wykres i eksport) | spółek krajowych ≤ 135, > 145 najwyżej 2 kw.; eksport CSV zgadza się z historią |
| **A5** | Kontrola 0.18.4, `raporty/kontrola_0.18.4.md` | — | — |

**Bramka 0.18.4:** GIG ±1 pp względem A0, marże 0 ± 0,3 pp, debiuty i upadki startupów jak w bazie ±20%, zapis ≤ +5% (więcej spółek), 0 błędów.

---

## 0.18.5 Wydajność (po pełnym grafie, decyzja 2026-11-10)

| Część | Zakres | Pliki | Test / weryfikacja |
|---|---|---|---|
| **W0** | **Profil kwartału** (po kolei, z UI i z `--noui`): udział modułów w czasie kroku. Ustalenie budżetu ms/kw. dla 0.19+ | `tests/przebiegi.html`, `design/narzedzia/kontrola_zapis_czas.mjs` | raport profilu |
| **W1** | **Rysowanie przy ×200:** rysujemy co N-ty krok, zamknięte panele nie liczą widoków; sprawdzić kalendarz „co 2 liczby” | `ui.js`, `exchange_clock.js` | ms/kw. z UI spada; kalendarz pokazuje każdy tydzień przy ×1 |
| **W2** | **Poziomy szczegółu spółek (LOD):** gracz, polubione i duże co tydzień; małe i zagraniczne co kwartał z doliczaniem zaległości po dodaniu do polubionych. Dotyczy tylko spółek, boty i fundusze bez zmian | `companies.js`, `core.js` | **statystycznie neutralne:** GIG i marże ±0,5 pp przy LOD włączonym i wyłączonym (40 + 40 gier) |
| **W3** | **Worker dla grafu i surowców**, jeśli W0 pokaże, że `chains.js` i `commodities.js` to ≥ 15% kroku; wynik z opóźnieniem 1 kw. Rdzeń symulacji (DOM w `companies.js`, `state.js`, `player.js`) zostaje poza 0.18 | `chains_worker.js` (nowy), `chains.js` | ten sam wynik w Workerze i bez niego przy tym samym ziarnie |
| **W4** | **Kontrola końcowa 0.18**, `raporty/kontrola_0.18.md` | — | pełna seria jak P0 |

**Bramka 0.18.5 (końcowa):** czas kroku po kolei z UI ≤ budżet z W0 i nie więcej niż w P0, zapis ≤ +10% względem P0, GIG i marże w celach 0.18.2–0.18.4, 0 błędów.

---

## Lista ekranów dla designu (do przekazania czatowi „Design 0.18”)

Wymogi wspólne: ciemny motyw i tokeny z `tokens.css`, ikony SVG (bez emoji), PLN, „udział” zamiast JU, status zawsze słowem i liczbą (kolor nie może być jedynym nośnikiem), bez nowych okien modalnych, komponenty z 0.14.5. Stan pusty (stary zapis przed pierwszym kwartałem bilansu) i stan kraju obcego dla każdego panelu. Ekrany 1–4 są już w makiecie `13_lancuch_018.html`: do sprawdzenia z tą listą.

| # | Wersja | Ekran / panel | Co pokazuje | Dane (moduł, pole) |
|---|---|---|---|---|
| 1 | 0.18.1 | **Ikony** dóbr, ogniw i transportu | 16 dóbr pilotażu, klasy M/P/K/Z/L, rodzaje ogniw (wydobycie, przetwórstwo, fabryka, transport, dystrybucja, konsumpcja), transport (morski, lotniczy, lądowy), ikona linii `supply`. W 0.18.2 dojdzie ok. 20 kolejnych dóbr | rejestr `goods.js`: `id`, `class`, `icon` |
| 2 | 0.18.1 | **Państwo → Łańcuchy** (zakładka) | wybór łańcucha (3 w pilotażu), ogniwa jako oś: nazwa podsektora, status słowem (w normie, napięty, niedobór, nadwyżka), bilans `b` liczbą, zapas w kwartałach, cena wewnętrzna wobec startu (%), przepustowość; kto importuje i skąd; przełącznik kraju | `chains.js`: `balance[g][kraj]`, `stock`, `price/P0`, `activity`, `capacity`, `imports[]`; kraje z `countries.js` |
| 3 | 0.18.1 | **Karta spółki → Przegląd: wiersz łańcucha** | ogniwo spółki, główny wsad i produkt, zapas, wystawienie na szok (niskie, średnie, wysokie) i jego powód; odnośnik do zakładki Łańcuchy | `factor[podsektor][kraj]`, udział wsadu w kosztach, linia `supply` |
| 4 | 0.18.1 | **Stany szczególne** | pusty stan (bilans jeszcze nie policzony), kraj bez danego ogniwa, ogniwo w szoku | jak wyżej + `crisisLine` |
| 5 | 0.18.1 | **Szok podażowy w wiadomościach i pasku kryzysu** | 6. linia: nazwa wariantu (blokada cieśniny, strajk portowy, strajk w kopalni), etap, dotknięte ogniwa, kto zyskuje | `crises.js`: `crisisLine.id = 'supply'`, `stage`, `victims` |
| 6 | 0.18.1 | **Giełda towarowa: żelazo i miedź zamiast metali** | dwa wiersze kontraktów zamiast jednego, nowe wagi ETF koszykowego, informacja po migracji zapisu („pozycja na metalach podzielona po połowie”) | `COMMODITY_DEFS`, `commodity_market.js` |
| 7 | 0.18.1 | **Akademia** | 3 hasła: Łańcuch wartości, Efekt byka, Bilans dobra (schemat pomocniczy jak w haśle o energii) | `learning.js` |
| 8 | 0.18.2 | **Łańcuchy: pełny graf** | ok. 10 łańcuchów; widok listy łańcuchów ze statusem najgorszego ogniwa; łańcuchy rozgałęzione (ruda → stal → wielu odbiorców), czyli oś musi przyjąć rozgałęzienie albo listę odbiorców | `chains.js` jak w 2, `goods.js` |
| 9 | 0.18.2 | **Blok jądrowy w 3 etapach** (Państwo → Energia) | etap (badania, konsorcjum do 3 firm, uruchomienie), postęp, członkowie konsorcjum, koszt i termin | `energy.js`, `companies.js` (blok) |
| 10 | 0.18.2 | **Mennica** (karta spółki państwowej) | wsady (papier, maszyny, złoto, srebro, miedź), produkcja gotówki, stan wyłącznika eksperymentu (tylko debug) | `chains.js`, `MINT_ACTIVE` |
| 11 | 0.18.2 | **Rynek podwykonawców** (okno budownictwa) | specjalności (w tym geolodzy i energetyczni), nowi podwykonawcy, obłożenie | `subcontractors.js` |
| 12 | 0.18.3 | **Magazyny** (Łańcuchy → szczegół ogniwa) | zapas wobec celu 0,5 kw., pojemność, koszt trzymania, bufor w szoku | `chains.js`: `stock`, `capacity`; `reits.js` (`warehouse`) |
| 13 | 0.18.3 | **Konsumpcja** (Państwo → Łańcuchy albo Społeczeństwo) | popyt na dobra Z i L według klas, reakcja na cykl, herbata jako Z lub L w zależności od kraju | `chains.js` (konsumpcja), klasy z 0.13 |
| 14 | 0.18.3 | **Substytucja i R&D** (karta technologii) | które wsady zastępuje technologia i o ile rocznie | `chains.js` (`A`), technologie 0.13 |
| 15 | 0.18.3 | **ESG** (karta spółki i Państwo → Środowisko) | ścieżka ESG: koszt, emisje przed i po, ocena ESG, wymagany poziom UEiE | `energy.js` |
| 16 | 0.18.3 | **Mapa szlaków** (Państwo → Łańcuchy → Mapa) | państwa i połączenia morskie, lotnicze i lądowe, status słowem (aktywny, utrudniony, wstrzymany), obciążenie przepustowości; widok listy jako zamiennik dla czytników ekranu | `infrastructure.js`, `freight.js`, `chains.js` (`imports`) |
| 17 | 0.18.4 | **Ocena kredytowa** (karta spółki) | ocena AAA–D, audytor, data ważności, „brak oceny” jako informacja, ujawnione przekupstwo | `listings.js` |
| 18 | 0.18.4 | **Nowe IPO** (karta debiutu i zapis gracza) | etapy: gotowość, audyt, opiekun emisji (prowizja), cena emisyjna i dyskonto, subskrypcja i redukcja, wycofanie; zapis gracza na akcje | `listings.js`, `companies.js` (`chooseDebutMarket`) |
| 19 | 0.18.4 | **Poziomy giełdy z wymogiem oceny** | przy poziomach GOLD–DIAMOND wymagana ocena; spółka „zatrzymana na poziomie do audytu” | `listings.js` |
| 20 | 0.18.4 | **Finanse:** lombard, Wrona, filie banków | oferta lombardu (zastaw akcji), pożyczki konsumenckie, filie za granicą | `finance.js`, `internet.js` |
| 22 | 0.18.1 | **Baner kryzysu** (wszystkie 6 linii) | niemodalny baner u góry: animacja spadającego wykresu, nazwa kryzysu, etap, „co to znaczy dla Ciebie”, przycisk zamknięcia; wariant bez animacji (reduced-motion) i wariant dla linii `supply` | `crises.js`: `crisisLine.id`, `stage`, `CRISIS_LINES[id].name` |
| 23 | 0.18.0 | **Wykres spółki bez posiadania akcji** (spółki obce) | ten sam widok wykresu dla spółki polskiej i obcej, także diamentowej, bez kupowania | wspólny model spółki (R1) |
| 24 | 0.18.0 | **Kantory24 bez kwitów GDR** | okno bez zakładki kwitów; nic nie zostaje po usuniętej zakładce | `internet.js`, `currency_ui.js` |
| 25 | 0.18.4 | **Wykres liczby spółek na giełdach** z eksportem CSV | linia łącznie i według rynku lub poziomu, przycisk „Eksportuj CSV” | historia liczby spółek (A4) |
| 21 | 0.18.5 | **Ustawienia: rysowanie przy ×200** i ewentualny wskaźnik poziomu szczegółu spółki (polubione liczone dokładnie) | opcja „rysuj co N kroków”, znacznik w karcie spółki | `ui.js` |

**Kolejność dla designu:** 23–24 przed R7, 1–7 i 22 przed P5 (pilotaż), 8–11 przed G9, 12–16 przed M6, 17–20 i 25 przed A5, 21 przed W4.

---

## Główne ryzyka

| Ryzyko | Zabezpieczenie |
|---|---|
| Graf zmienia balans wszystkich sektorów | `b = 1` na starcie, odchylenie o średniej zero, tryb cichy w P2, bramka marż po każdej części |
| Czas kroku rośnie przed 0.18.5 | budżet przyrostu na wersję (+15% / +25% / +10%), czysty moduł, bilans raz na kwartał |
| Migracja `metals` psuje stare zapisy | test migracji z otwartą pozycją i ETC; ETF z nowymi wagami |
| GIG 20 lat nie spada sam z bilansu | G8 ma własną serię i decyzję użytkownika, zanim ruszy 0.18.3 |
| Za dużo nowych spółek | w pilotażu najwyżej 6, sufity podnosimy dopiero w A4 |
| Gracz gubi się w grafie | w UI status słowem i liczbą, szczegóły dopiero w panelu Łańcuchy |

## Decyzje

**Podjęte 2026-10-25:** pilotaż to metale, ropa i zboże. Szok podażowy to 6. linia kryzysu ze wspólnym budżetem. Hierarchia konsumpcji jest w wersji po pilotażu.

**Podjęte 2026-11-10:**
1. Podział hybrydowy: 0.18.1 Pilotaż, 0.18.2 Pełny graf, 0.18.3 Mechaniki, 0.18.4 Audyt i IPO, 0.18.5 Wydajność. Grupy sektorów z serii stają się częściami 0.18.2.
2. Wydajność po pełnym grafie, czyli w 0.18.5, a nie w 0.18.0. Do tego czasu obowiązuje budżet przyrostu na wersję.
3. Graf jako czysty moduł w głównym wątku. Worker tylko dla grafu i surowców w 0.18.5, jeśli pomiar to uzasadni.
4. GIG 20 lat (12,4%) stroimy razem z bilansem w 0.18.2 (G8).
5. `metals` rozdzielamy na żelazo i miedź już w pilotażu.
6. Bilans najpierw w trybie cichym (P2), potem włączenie (P3).
7. Cel gry jako osobna wersja po 0.18.
8. Nowe podsektory w pilotażu z przypisaniem istniejących spółek, najwyżej 6 nowych.
9. 0.18.2 i 0.18.3 to dwie osobne wersje (łańcuchy i mechaniki).
10. Mennica w 0.18.2 z wyłącznikiem.
11. Łańcuchy w oknie Państwa (zakładka „Łańcuchy”).
12. Do 0.18 wchodzą też: ESG (M4), rynek podwykonawców (G6), finanse z serii (A1), usługi jako ogniwo dystrybucji (G7).
13. Zgłoszenia z gry z 2026-11-10 rozkładamy tematycznie po wersjach. Nowa 0.18.0 „Porządki przed grafem” obejmuje wspólny kod spółek polskich i obcych przed grafem.
14. Kwity GDR usuwamy bez migracji: stare zapisy tracą kwity bez zwrotu.
15. Widoczność kryzysu: niemodalny baner z animacją.

**Przeniesione poza 0.18:** miasta, galerie handlowe i oddziały (0.19.2); ruch klas (0.19.1); cła na krawędziach grafu (0.19 Handel światowy); Worker rdzenia symulacji i WebAssembly (po profilu W0); cel gry (osobna wersja); U9, czyli premia kryzysu za granicą (do decyzji, `raporty/balans_0.17.1.md`).

## Co nie zostało sprawdzone

Receptury i udziały popytu z serii to propozycja projektowa, a nie kalibracja. Czas kroku bilansu nie jest zmierzony. Planu nie sprawdzałem uruchomieniem gry. Przypisania spółek do nowych podsektorów (P1) trzeba sprawdzić na liście spółek przed commitem.

## Polecenie dla czatu kodu

```
Implementujesz 0.18 „Łańcuchy produkcyjne” w Capital Quest (JS bez frameworka).
Specyfikacja: plany/plan_0.18_lancuchy_produkcyjne.md. Rejestr dóbr, receptury,
udziały popytu, model bilansu (5.2), IPO (6) i wydajność (8):
plany/plan_seria_0.18_towary_ipo_miasta.md. Stan wyjściowy: zmiany-AI po d0f193e.

Zasady:
- Odpowiadaj po polsku. Pracuj część po części, commit po każdej, tylko swoje pliki.
- Przed commitem: testy (design/narzedzia/run_tests.mjs) i przebiegi ×200
  (tests/przebiegi.html, --noui, najwyżej 5 naraz). 0 błędów JS i niezmienników.
- Każda wersja kończy się raportem plany/raporty/kontrola_0.18.N.md i wierszem
  w plany/plan_0.13-0.16_mapa.md. Bramka niezaliczona = stop i pytanie do mnie.
- goods.js i chains.js bez DOM i window (test w czystym kontekście).
- Zapis: pola opcjonalne, stare zapisy uzupełnia pierwszy kwartał.
- UI: ciemny motyw, ikony SVG zamiast emoji, PLN, „udział”, „konto prywatne”,
  kolor nie jest jedynym nośnikiem, bez nowych okien modalnych. Wygląd według
  makiet w plany/design/makiety (13_lancuch_018.html i kolejne); plików w
  plany/design nie edytujesz.
- Decyzje (nowe spółki, strojenia poza celem) zadawaj przez AskUserQuestion
  z sugerowaną odpowiedzią.

0.18.0 Porządki przed grafem (zgłoszenia Z1–Z9 w planie):
R0 spis funkcji z osobną wersją dla spółek polskich i obcych, raport
   raporty/spis_kodu_pl_obce_0.18.0.md; pokaż mi listę przed łączeniem.
R1 wspólny model spółki: łącz po kawałku, testy po każdym; wykres spółki
   obcej bez posiadania akcji jak dla polskiej.
R2 usuń kwity GDR całkowicie (gdr.js, 9 plików, zakładka, zapis, testy);
   bez migracji: stary zapis wczytuje się, kwity przepadają.
R3 poziomy giełd: diagnoza rozkładu (3 z 212 na PLATINUM), spółki z giełd
   dołączających nie wszystkie na GOLD; propozycję progów pokaż mi.
R4 prezesi obcych spółek: pula cech narodowych + ogólna.
R5 Tied: 3 warianty odpowiedzi botów (jeden z imieniem autora), 6–8 wstępów.
R6 Państwo → Przegląd: karta Spółki Skarbu Państwa się odświeża.
R7 kontrola 0.18.0. Bramka: GIG i marże ±0,5 pp, 0 błędów, zapis i krok
   bez wzrostu.

0.18.1 Pilotaż:
P0 pomiar bazy (po 0.18.0): sonda PROBE_018 (profil wsadu podsektor × kraj), seria
   50 × 6,5 roku, 20 × 20 lat, 20 × kraje-stopniowo, krok po kolei;
   raport raporty/baza_0.18.md. Kod gry bez zmian.
P1 goods.js (wszystkie dobra, poza pilotażem active: false); nowe podsektory
   Hutnictwo, Maszyny, Stocznie (STM), Chemia polimerowa, Nawozy, Farmacja,
   Przetwórstwo spożywcze; najpierw przypisz istniejące spółki, nowych spółek
   najwyżej 6, listę pokaż mi przed commitem; metals → iron + copper z migracją
   v24 → v25 (ceny od średniej 8 kw., pozycje i ETC 50/50, nowe wagi ETF);
   emoji w zdarzeniach surowcowych → SVG. Bramka: marże 0 ± 0,3 pp, GIG ±1 pp.
P2 chains.js w trybie cichym (liczy, zapisuje, sonda, nic nie zmienia);
   kalibracja A i B z P0, b = 1 na starcie, zachowanie masy, import do limitu
   przepustowości, K z δ. Bramka cicha: b w 0,8–1,25 w 90% kw., ceny 0,7–1,4 × P0,
   bilans ≤ 5% kroku, wynik gry identyczny jak w P1.
P3 włączenie 3 łańcuchów: factor[podsektor][kraj] zamiast pętli po segmentach
   dla dóbr pilotażu, niedobór z priorytetem obronności, sprzężenie z
   kontraktami ±15%, usunięcie skrótu w getCommodityIndustryDemand, wyłącznik
   CHAINS_ACTIVE. Bramka: marże 0 ± 0,3 pp, GIG 6,5 roku ±1 pp, GIG 20 lat
   ≤ 12,4%, krok ≤ +15%, zapis ≤ +4%.
P4 linia supply w crises.js (blokada cieśniny, strajk portowy, strajk w
   kopalni), etapy jak 0.15.3, zdolność c_j w dół łańcucha, wspólny budżet;
   niemodalny baner kryzysu z animacją dla wszystkich 6 linii (reduced-motion).
   Bramka: +3–15% ceny w dół łańcucha, powrót 4–8 kw., linie 1–2 na 20 lat.
P5 chains_ui.js: Państwo → Łańcuchy, wiersz w karcie spółki, 3 hasła Akademii,
   ikony z makiety.
P6 kontrola 0.18.1 i bramka pilotażu (tabela w planie).

0.18.2 Pełny graf: G0 baza; G1 surowce (ziemie rzadkie, siarka, złoto, uran,
Leśnictwo, kawa jako 9. kontrakt, srebro jako współprodukt); G2 chemia i papier,
łańcuch miedzi; G3 przemysł lotniczy, sprzęt medyczny, roboty, półprzewodniki;
G4 prąd jako wsad prawie wszystkich, blok jądrowy w 3 etapach; G5 obronność
i zdrowie; G6 budownictwo, REIT residential, strojenie REIT health (najmocniejszy
w grze), rynek podwykonawców; G7 usługi
jako dystrybucja, Mennica z wyłącznikiem MINT_ACTIVE; G8 strojenie GIG 20 lat
do 8–11% pokrętłami bilansu (jeśli się nie da, pytanie do mnie); G9 kontrola.
Bramka każdej części: marże 0 ± 0,3 pp, krok ≤ +5%.

0.18.3 Mechaniki: M0 baza; M1 magazyny i zapasy; M2 hierarchia konsumpcji
(Z/L, herbata wg kraju, klasy); M3 substytucja i R&D; M4 ESG z receptury;
M5 mapa szlaków; M6 kontrola.

0.18.4 Audyt, oceny i IPO: A0 baza; A1 księgowość B2B, filie banków,
Lombardex/Limbard, Wrona, diagnoza i uzupełnianie banków w długiej grze; A2 audyt i ocena AAA–D z szumem i przekupstwem;
A3 nowe IPO (audyt, opiekun, dyskonto, subskrypcja, wycofanie, ocena jako
bramka poziomu); A4 sufity 130/180 i wykres liczby spółek z eksportem CSV;
A5 kontrola.

0.18.5 Wydajność: W0 profil kwartału i budżet ms/kw.; W1 rysowanie przy ×200;
W2 LOD spółek (neutralny statystycznie: 40 + 40 gier, ±0,5 pp); W3 Worker dla
grafu i surowców, jeśli W0 pokaże ≥ 15% kroku; W4 kontrola końcowa 0.18
(raporty/kontrola_0.18.md).

Zacznij od R0. Po każdej części podaj: commit, wynik testów, wynik bramki
i co nie zostało sprawdzone.
```
