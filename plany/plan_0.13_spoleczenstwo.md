# Plan 0.13 „Społeczeństwo i rynek pracy”

Cel: rynek przestaje być oderwany od ludzi. Spółki zatrudniają pracowników, którzy kosztują, bywają zadowoleni albo nie, zakładają związki i odchodzą. Kraj ma populację, klasy zamożności, edukację i migrację. Od struktury społecznej zależą popyt konsumpcyjny, płace i polityka. Gracz-zarządzający widzi to w wynikach spółek (koszt pracy, strajki, marże) i w makro (płace → inflacja → stopy). Większościowiec może też podejmować decyzje.

Czego to uczy (cel nadrzędny gry):
- koszt pracy jako główna linia kosztów, wydajność i dźwignia operacyjna;
- rynek pracy: bezrobocie, presja płacowa (krzywa Phillipsa), niedobór specjalistów, drenaż mózgów;
- związki zawodowe, układ zbiorowy i strajk jako ryzyko operacyjne;
- struktura społeczna a popyt: sektory dóbr luksusowych kontra defensywne;
- polityka socjalna: płaca minimalna, zasiłki, budżet państwa; litera „S” w ESG.

Następna wersja, 0.14 „Struktura spółek” (segmenty, podsektory, specjalizacja, wydzielenia, koncerny), ma osobny plan: `plan_0.14_struktura_spolek.md`. Kolejność ustalona: najpierw społeczeństwo.

Kolejność: S1 → S2 → S3 → S4 → S5 → S6. Każda część z testami, przebiegiem ×50 i commitem.

---

## Punkt wyjścia (stan kodu po 0.12)

- `macro` ma inflację, bezrobocie (`NATURAL_UNEMPLOYMENT = 0.06`), PKB, cykle sektorów i wybory z dwiema partiami (`RULING_PARTIES`: Koalicja Rynkowa, Blok Państwowy) — `core.js`.
- Populacja istnieje tylko w mieście (`city.population`, start 25–45 tys., `player.js`/`state.js`); podatek miejski od mieszkańca.
- Model wyników (`computeQuarterResults`, `companies.js`): marża = profil sektora + kondycja + koniunktura − inflacja. **Koszt pracy nie jest wydzielony**, jest „w środku” marży.
- Skala pieniędzy jest umowna (spółki np. 5 zł × 1000 akcji), więc **płace liczymy jako indeks i udział w przychodach**, a nie jako złote na etat. Liczby pracowników są fabularne (do wyświetlenia i proporcji), a nie wyliczane z przychodów w złotych.
- Prezesi z cechami istnieją (`stock.ceo`), skarb państwa też (`governmentTreasury`). Systemu ustaw nie ma.

**Zasada kalibracji:** przy ustawieniach neutralnych (polityka „Standardowa”, indeks płac 1,0, brak związku) marże i zyski spółek są **takie same jak w 0.12**. Nowe systemy tylko odchylają wynik od tej bazy. Dzięki temu nie trzeba przestrajać całej gospodarki.

---

## S1. Kraj: populacja, klasy, edukacja (dane + panel)

**Stan `society` (w `core.js` obok `macro`):**
- **Populacja kraju:** start 38,0 mln (losowo 36–40).
  - Przyrost naturalny: +0,05% na kwartał.
  - Migracja: S3.
  - Zdarzenia: tabela niżej.
- **Klasy** (udziały populacji, w sumie 100%):

| Klasa | Start | Waga konsumpcji (na osobę) | Preferuje sektory |
|---|---|---|---|
| Biedna | 22% | 0,6 | Żywność, Usługi podstawowe |
| Średnia niższa | 26% | 0,85 | Żywność, Dobra konsumpcyjne |
| Średnia | 24% | 1,0 | Dobra konsumpcyjne, Gaming, Usługi |
| Średnia wyższa | 15% | 1,3 | Turystyka, Gaming, Nieruchomości |
| Zamożna | 10% | 1,8 | Turystyka, Nieruchomości, Finanse |
| Bardzo zamożna | 3% | 3,0 | Nieruchomości, Finanse (luksus) |

- **Indeks popytu** = Σ(udział × waga) / wartość startowa. Na starcie wynosi 1,00. Wpływa na wzrost przychodów sektorów konsumenckich, w punktach procentowych na kwartał: `+(popyt − 1) × elastyczność × 2 pp`.
  - Elastyczność: Turystyka 1,5; Gaming 1,3; Nieruchomości 1,2; Dobra konsumpcyjne 1,0; Usługi 0,8; Media 0,6; Żywność 0,3.
  - Przykład: popyt 1,05 → Turystyka +0,15 pp na kwartał.
- **Ruchliwość klas co kwartał:** część każdej klasy przesuwa się o jeden szczebel w górę albo w dół.
  - Przesunięcie `s = clamp((PKB − 2%) × 0,4 − (bezrobocie − 6%) × 0,5 − (inflacja − 2,5%) × 0,2, −0,8%, +0,8%)`, liczone od udziału klasy.
  - Ustawy z S5 dodają osobne przesunięcia biednej → średniej niższej.
- **Edukacja:** indeks 0–100, start 55.
  - Dryfuje ±1 na kwartał w stronę celu.
  - Cel zależy od priorytetu państwa: niski 45 / średni 60 / wysoki 75. Priorytet losuje się na każdą kadencję, z wagą partii rządzącej (S5).
  - Edukacja reaguje z opóźnieniem (bezwładność 4–8 lat). Uczy, że to inwestycja długoterminowa.
- **Zdarzenia demograficzne** (dopisane do istniejącej tabeli zdarzeń makro):

| Zdarzenie | Szansa / rok | Populacja | Inne skutki |
|---|---|---|---|
| Epidemia | 4% | −0,3% | Turystyka −10% przychodów przez 2 kw., Medycyna +5% |
| Wyż demograficzny | 5% | +0,2% na kwartał przez 4 kw. | popyt na Nieruchomości +, edukacja −1 |
| Fala emigracji | wyzwalana w S3 | −0,5% | odpływ specjalistów (drenaż mózgów) |
| Napływ uchodźców / imigrantów | 4% | +0,8% | tania siła robocza +, wydatki państwa + |
| Klęska żywiołowa | 3% | −0,1% | Budowlany + (odbudowa), Żywność − |

- **Miasto jako część kraju:** `city.population` co kwartał rośnie o tempo krajowe plus dotychczasowy składnik lokalny (festyny, projekty). Podatek miejski bez zmian.
- **UI:** nowa zakładka **„Kraj”** (obok Miasta). Pokazuje:
  - populację i jej trend;
  - pasek klas;
  - edukację i migrację;
  - indeks popytu;
  - partie i ustawy (S5).

**Akademia:** hasła „Struktura społeczna a popyt”, „Dobra luksusowe i podstawowe (elastyczność)”.

## S2. Pracownicy w spółkach

**Pięć grup zatrudnienia** w każdej spółce z modelem przychodów:

1. Dyrekcja i zarząd;
2. Specjaliści;
3. Pracownicy;
4. Tania siła robocza;
5. Szara strefa (nierejestrowani).

**Struktura według sektora** (udziały %, przykłady; pozostałe sektory dostają najbliższy wzorzec):

| Sektor | Zarząd | Specjaliści | Pracownicy | Tania siła | Szara strefa | Koszt pracy (% przychodów) |
|---|---|---|---|---|---|---|
| Technologia | 4 | 45 | 41 | 10 | 0 | 30 |
| Badania | 4 | 50 | 36 | 10 | 0 | 40 |
| Medycyna | 4 | 40 | 46 | 10 | 0 | 30 |
| Bankowość / Finanse | 5 | 35 | 55 | 5 | 0 | 20–25 |
| Przemysł / Chemia | 2 | 15 | 58 | 23 | 2 | 25 / 15 |
| Budowlany | 2 | 10 | 45 | 35 | 8 | 30 |
| Żywność | 2 | 8 | 50 | 35 | 5 | 20 |
| Usługi / Turystyka | 2 | 8 | 50 | 33 | 7 | 40 / 35 |
| Energia | 3 | 25 | 62 | 10 | 0 | 12 |
| Nieruchomości | 5 | 20 | 55 | 18 | 2 | 8 |

- **Liczba zatrudnionych:** start według giełdy.
  - JUNK 20–150, BRONZE 100–600, SILVER 400–2500, GOLD 2000–10 000, PLATINUM 8000–40 000, RUBY/EMERALD 30 000–120 000.
  - Potem zmienia się proporcjonalnie do przychodów (`zatrudnienie = start × przychody / przychody_start`) i do wydajności.
  - Zwolnienia (spadek przychodów o ponad 10% r/r albo kondycja < −2) obniżają zadowolenie o 10.
- **Koszt pracy w RZiS:** nowa linia `labor = przychody × udział_kosztu_pracy × indeks_kosztu_pracy`.
  - Marża liczy się jako `marża_0.12 + udział × (1 − indeks)`. Przy indeksie 1,0 nic się nie zmienia (zasada kalibracji).
  - Księgowy poziom 1 pokazuje koszt pracy jako osobny słupek.
- **Indeks kosztu pracy spółki:**
  - liczony z indeksów płac grup (S3), ważonych strukturą;
  - mnożony przez politykę kadrową;
  - dzielony przez wydajność;
  - plus koszty związku (S4).
- **Polityka kadrowa** (`stock.laborPolicy`):

| Polityka | Płace | Cel zadowolenia | Szansa na związek | Wydajność | Inne |
|---|---|---|---|---|---|
| Wyzysk | ×0,85 | 20 | ×3 | −3% | szara strefa +10 pp, kontrole Inspekcji Pracy ×3 |
| Oszczędna | ×0,93 | 40 | ×1,8 | 0 | — |
| Standardowa | ×1,00 | 60 | ×1 | 0 | — |
| Prospołeczna | ×1,08 | 80 | ×0,4 | +4% | rotacja −50%, przyciąga specjalistów |

  - **Kto ustala:** prezes według cech, bez udziału gracza.
    - Słaba kondycja → Oszczędna.
    - Cechy „chciwy” i „nadużycia” → Wyzysk.
    - Cecha „lojalny pracownikom” → Prospołeczna.
  - **Większościowiec (gracz lub bot powyżej 50%) może zmienić politykę.** Nie musi tego robić, domyślnie decyduje prezes.
    - Blokada: 4 kwartały między zmianami.
    - Zmiana działa stopniowo: marża przez 2 kwartały, zadowolenie od razu −15 przy obniżce i +5 przy podwyżce.
  - **Bilans polityk (cel strojenia):** Wyzysk daje najwyższą marżę w krótkim terminie i najwyższe ryzyko (strajki, odejścia, kary, PR). Po 5 latach całkowity zwrot z akcji (TSR) wszystkich polityk ma się mieścić w ±3 pp rocznie, a Wyzysk ma mieć największy rozrzut wyników.
- **Zadowolenie** (0–100, jedna liczba na spółkę):
  - Co kwartał przesuwa się o 25% odległości do celu.
  - Cel = polityka ± płace względem rynku (±10) + prawa pracownicze (S5, 0–10) + kondycja (±5) + układ zbiorowy (+10) − zwolnienia (−10).
  - Poniżej 35: rotacja 3–8% na kwartał (wydajność −1–3%, koszt rekrutacji), większa szansa na związek.
  - Powyżej 70: wydajność +2%, spółka podkupuje specjalistów (S3).
- **Szara strefa:**
  - Część zatrudnionych bez umów: płace ×0,6, bez podatków, więc marża rośnie.
  - Kontrola **Inspekcji Pracy**: szansa na kwartał = udział szarej strefy × 20% × mnożnik polityki.
  - Kara: 3× oszczędność z ostatnich 4 kwartałów, kurs −4%, wpis w dzienniku.
  - Jeśli spółka ma większościowca-gracza: wpis compliance (jak w ciemnej strefie 0.11).
  - Skarb traci podatki, co jest widoczne w budżecie (S5).
- **UI:** zakładka **„Zatrudnienie”** w karcie spółki. Pokazuje grupy (liczby i indeks płac), koszt pracy w % przychodów względem sektora, zadowolenie z trendem, politykę oraz związek (S4).

**Akademia:** hasła „Koszt pracy i wydajność”, „Dźwignia operacyjna”, „Szara strefa”.

## S3. Rynek pracy: płace, niedobory, odejścia, podkupowanie, migracja

- **Indeksy płac rynkowych** dla 5 grup (start 1,0) zmieniają się co kwartał:
  - Ogólnie (krzywa Phillipsa): `+inflacja/4 + 0,5 × (6% − bezrobocie)/4`.
  - **Specjaliści:** dodatkowo `+2% × (niedobór − 1)/0,1`, gdy niedobór > 1.
    - Niedobór = popyt na specjalistów (suma ze spółek) / podaż.
    - Podaż = siła robocza × (10% + edukacja/100 × 25%).
  - **Tania siła:** −0,5% na kwartał przy dużej imigracji, płaca minimalna (S5) działa jako podłoga.
  - Indeksy płac są **realne względem inflacji**: odejście od 1,0 oznacza realny wzrost kosztu pracy, a nie samą inflację, bo ta jest już w przychodach. Zapobiega to podwójnemu liczeniu inflacji.
- **Sprzężenie z makro (małe, z limitem):**
  - realny wzrost płac powyżej 2% rocznie → inflacja +0,1 pp;
  - niedobór specjalistów → wzrost sektorów Technologia, Badania, Medycyna −0,1 pp na kwartał na każde 0,1 niedoboru;
  - bezrobocie dostaje składnik od podaży pracy: migracja i populacja ±0,2 pp.
- **Odejścia między firmami:** pracownicy ze spółek z zadowoleniem < 35 przechodzą do spółek z tego samego sektora z zadowoleniem > 60. Liczbowo przesuwamy wydajność: −1% u źródła, +0,5% u celu.
- **Podkupowanie:**
  - **Specjaliści:** automatycznie co kwartał, spółka z gotówką i zadowoleniem > 70 od najsłabszej z sektora. Zysk wydajności +1% kosztem gotówki.
  - **Prezes:** bot-większościowiec z osobowością agresywną (10% na rok) albo gracz-większościowiec (akcja „Podkup prezesa” z innej spółki).
    - Koszt: 1% kapitalizacji spółki docelowej, płacony z gotówki spółki gracza.
    - Szansa: 60% − zadowolenie spółki źródłowej/2.
    - Prezes zabiera cechy; spółka źródłowa dostaje losowego prezesa i kurs −3%.
    - Limit 1 na rok na gracza (żeby nie powstał handel prezesami).
- **Migracja:**
  - Atrakcyjność kraju A (0–100) = 0,4 × średnie zadowolenie (ważone zatrudnieniem) + 0,3 × realne płace (indeks) + 0,3 × (100 − bezrobocie × 500).
  - Saldo migracji = `(A − 50) × 0,004%` populacji na kwartał.
  - Przy A < 40 przez 4 kwartały wyzwala się zdarzenie „Fala emigracji”: uciekają głównie specjaliści, więc niedobór rośnie.
  - Imigranci zasilają głównie klasę biedną i tanią siłę roboczą.

**Akademia:** hasła „Krzywa Phillipsa”, „Niedobór talentów i płace”, „Drenaż mózgów”.

## S4. Związki zawodowe i strajki

- **Związek zakładowy** (w spółce):
  - Szansa powstania na kwartał = 2% × max(0,2, (50 − zadowolenie)/10) × mnożnik polityki × mnożnik praw pracowniczych (S5) × (zatrudnienie ≥ 200 ? 1 : 0,3).
  - Spółki państwowe startują z 30% szans na istniejący związek.
- **Związek sektorowy:**
  - Powstaje, gdy w sektorze są ≥ 3 związki zakładowe albo średnie zadowolenie sektora < 40 (15% na kwartał).
  - Obejmuje wszystkie spółki sektora; żądania i strajki są wspólne.
- **Koszty związku:** stałe +1% kosztu pracy (świadczenia), za to zadowolenie +5 i rotacja −30%.
- **Żądania co 4 kwartały:** podwyżka 3–8% (więcej przy wysokiej inflacji i niskim bezrobociu). Odpowiedź spółki:
  - **Zgoda:** płace grupy +X%, zadowolenie +10, możliwy **układ zbiorowy** (spokój na 8 kwartałów).
  - **Negocjacje:** połowa podwyżki; 50% szans na zgodę, inaczej jak odmowa ze strajkiem o 50% słabszym.
  - **Odmowa:** szansa strajku 40–70% (zależnie od zadowolenia).
- **Strajk:**
  - Przychody kwartału −5–15% (sektorowy: cały sektor), kurs −3–8%, zadowolenie −10.
  - Trwa do porozumienia: kolejny kwartał znów wymaga decyzji.
  - Kontrahenci (budowlanka, projekty) mogą naliczyć kary.
- **Kto decyduje:** prezes według cech. Gracz-większościowiec dostaje **przypiętego maila z decyzją**: termin do końca kwartału, domyślnie decyzja prezesa, a nie kara.
- **Ciemna strefa (opcjonalnie):** usługa „rozbicie związku” u „przyjaciół”. Związek znika, ale ryzyko wykrycia 30%, a przy wykryciu strajk generalny w sektorze i afera.
- **Klienci funduszu:** nowy charakter klienta **„Etyczny”**. Odchodzi, gdy spółki z udziałem funduszu ponad 10% mają średnie zadowolenie < 45 albo gdy w portfelu jest spółka złapana na szarej strefie. Dzięki temu mniejszościowiec też ma powód patrzeć na zadowolenie.

**Akademia:** hasła „Związek zawodowy i układ zbiorowy”, „Strajk jako ryzyko operacyjne”, „ESG: litera S”.

## S5. Państwo socjalne, ustawy i Ludowcy

- **Ustawy** (stan `society.laws`, poziomy). Partia rządząca zmienia **1 ustawę na rok** według swojego programu. Zmiana jest ogłaszana kwartał wcześniej: rynek reaguje na zapowiedź, czego uczy dyskontowanie.

| Ustawa | Poziomy | Skutki na poziom | Koszt dla budżetu |
|---|---|---|---|
| Płaca minimalna | 0–3 | płace pracowników i taniej siły +4%; biedni → średnia niższa +0,2% na kwartał; bezrobocie +0,2 pp; szara strefa +2 pp w spółkach Oszczędnych/Wyzysk | 0 |
| Zasiłki | 0–3 | waga konsumpcji biednych +0,1; zadowolenie +2; bezrobocie +0,1 pp | biedni × populacja × stawka |
| Mieszkania socjalne | 0–2 | biedni → średnia niższa +0,15% na kwartał; **kontrakty dla sektora Budowlany i Nieruchomości** (istniejący system projektów budowlanych) | program na 8 kw. |
| Prawa pracownicze | liberalne / standard / ochronne | zadowolenie 0 / +5 / +10; szansa związku ×0,7 / ×1 / ×1,5; polityka Wyzysk przy ochronnych: kary Inspekcji ×2 | 0 |

- **Budżet państwa:** `governmentTreasury` dostaje wydatki socjalne i ubytek podatków przez szarą strefę.
  - Deficyt utrzymujący się przez 4 kwartały → rentowność obligacji skarbowych +0,25 pp (przy implementacji sprawdzić, skąd dziś bierze się rentowność obligacji).
  - Deficyt utrzymujący się przez 8 kwartałów → podatek CIT +2 pp albo cięcie ustaw. Wybór zależy od partii.
- **Nowa partia: Ludowcy.**
  - `RULING_PARTIES.people`: prywatyzacja 0,8; nacjonalizacja 1,0; dotacje 1,3 (głównie Żywność); nastroje +0,01.
  - Program: płaca minimalna ↑, zasiłki ↑, mieszkania socjalne, edukacja „średni”.
- **Programy pozostałych partii:**
  - Koalicja Rynkowa: ustawy ↓, prawa liberalne, edukacja „wysoki” (technika).
  - Blok Państwowy: prawa ochronne, mieszkania, edukacja „wysoki”.
- **Poparcie wyliczane z klas** (preferencje Ludowcy / Państwowy / Rynkowa):
  - Biedna 50/35/15; Średnia niższa 35/35/30; Średnia 20/35/45; Średnia wyższa 10/30/60; Zamożna 5/20/75; Bardzo zamożna 5/15/80.
  - Do tego obecne czynniki: darowizny, koniunktura (bezrobocie i inflacja szkodzą rządzącym) oraz szum ±5 pp.
- **Koalicja:** jeśli zwycięzca ma < 40%, rządzi z drugą partią. Parametry są średnią ważoną poparciem, a ustawy zmienia partia silniejsza.
- **Darowizny z funduszu:** obecny mechanizm `supportElectionCampaign` obejmuje 3 partie.

**Akademia:** hasła „Płaca minimalna”, „Deficyt budżetowy i rentowność obligacji”, „Rynek dyskontuje zapowiedzi”.

## S6. Spięcie z grą: skaner, Mentor, KPI, poczta

Ta część pilnuje, żeby nowego systemu nie dało się w całości pominąć.

- **Skaner:**
  - nowe kolumny: koszt pracy % (względem sektora), zadowolenie, związek (brak / zakładowy / sektorowy), ryzyko strajku (niskie / średnie / wysokie);
  - filtr „szara strefa > 5%” jako czerwona flaga przy Księgowym na poziomie 4.
- **Mentor:** 3 nowe zadania.
  - „Trzymaj spółkę przez strajk i sprzedaj z zyskiem”.
  - „Znajdź spółkę z zadowoleniem > 70 i marżą powyżej sektora”.
  - „Zarób na zapowiedzi ustawy (kup Budowlany przed programem mieszkań)”.
- **Cele korporacji (KPI):**
  - „W roku żadna spółka z udziałem funduszu > 20% nie strajkuje”;
  - „Średnie zadowolenie portfela ≥ 55” (pojawia się, gdy fundusz ma klientów Etycznych).
- **Poczta:**
  - kwartalny zbiorczy **„Raport z rynku pracy i kraju”** (jeden mail);
  - przypięte tylko decyzje gracza (żądania związku, strajk w spółce większościowej);
  - limit: średnio ≤ 3 nowe maile na kwartał.

---

## Zapis gry i testy

- **Zapis (następna wersja; dziś `SUPPORTED_SAVE_VERSIONS` kończy się na 12 — sprawdzić przy implementacji):**
  - `society` (populacja, klasy, edukacja, priorytet edukacji, migracja, ustawy, indeksy płac, budżet socjalny);
  - w spółce `workforce` (grupy, zadowolenie, polityka, blokada zmian, związek, układ zbiorowy, strajk);
  - partia `people` w `macro.election`.

  **Migracja:** kraj tworzony od zera. Spółki dostają zatrudnienie według giełdy, politykę według cech prezesa i zadowolenie równe celowi polityki. Związki tylko w spółkach państwowych (30%). Populacja miasta bez zmian.
- **Testy (`tests/tests.html`):**
  - neutralne ustawienia nie zmieniają marży (różnica < 0,001);
  - indeks popytu = 1,00 na starcie, a przesunięcie klasy w górę go podnosi;
  - udziały klas sumują się do 100% po 100 kwartałach;
  - niedobór specjalistów podnosi ich indeks płac;
  - polityka Wyzysk podnosi marżę i szansę na związek;
  - strajk obniża przychody kwartału;
  - układ zbiorowy blokuje żądania przez 8 kwartałów;
  - Inspekcja Pracy nalicza karę 3× oszczędności;
  - płaca minimalna podnosi płace i bezrobocie;
  - poparcie partii sumuje się do 100%;
  - koalicja przy zwycięzcy < 40%;
  - migracja zapisu ze starego zapisu nie gubi spółek ani gotówki;
  - niezmienniki pieniędzy i akcji bez zmian.

## Jak sprawdzimy (przebieg ×50, 6,5 roku gry)

| Miara | Cel |
|---|---|
| GIG rocznie vs 0.12 | różnica ≤ ±2 pp |
| Średnia marża sektorów (polityka Standardowa) vs 0.12 | ≤ ±1 pp |
| Populacja po 6,5 roku | +1% … +6%; w ≥ 10% przebiegów okresowy spadek |
| Klasa biedna | 12–30% (bez dryfu do 0 albo 50) |
| Spółki ze związkiem zakładowym po 6,5 roku | 15–35%; związki sektorowe 1–3 |
| Strajki na rynku | 2–6 na rok |
| TSR polityk (5 lat) | Wyzysk / Oszczędna / Standard / Prospołeczna w ±3 pp/rok; Wyzysk największy rozrzut |
| Ludowcy wygrywają wybory | 20–40% |
| Każda ustawa zmieniona ≥ 1 raz | ≥ 70% przebiegów |
| Nowe maile | ≤ 3 na kwartał średnio |
| Czas kroku gry | wzrost ≤ 10% |

## Ryzyka i jak im zapobiegamy

- **Niewidoczność dla mniejszościowca** → koszt pracy w RZiS, kolumny skanera, klienci Etyczni, KPI, Mentor.
- **Podwójne liczenie inflacji** → indeksy płac realne (S3).
- **Rozjechanie kalibracji** → zasada „neutralnie = 0.12” i test marży.
- **Exploit polityki kadrowej (Wyzysk przed sprzedażą)** → blokada 4 kw., efekt na marżę stopniowy, zadowolenie spada od razu, co widać w skanerze.
- **Exploit „podkup prezesa”** → limit 1 na rok i koszt z gotówki spółki.
- **Zalew poczty** → jeden raport zbiorczy na kwartał.

## Decyzje (podjęte)

1. **Kolejność:** najpierw 0.13 „Społeczeństwo i rynek pracy”, potem 0.14 „Struktura spółek”.
2. **Poziom populacji:** kraj (miliony) z klasami, edukacją i migracją w makro; miasto jest jego częścią i rośnie razem z krajem.
3. **Pracownicy:** liczby w 5 grupach, płace jako indeks, koszt pracy jako linia RZiS, jedno zadowolenie na spółkę; nazwani są tylko prezesi.
4. **Większościowiec** może (nie musi) wpływać na politykę kadrową i odpowiedzi na związki; domyślnie decyduje prezes.
5. **Klient „Etyczny”:** tak — odchodzi przy niskim zadowoleniu w spółkach portfela albo szarej strefie (S4, S6).
6. **„Rozbicie związku” w ciemnej strefie:** tak, ryzykowne (30% wykrycia → strajk generalny w sektorze i afera).
7. **Deficyt budżetu:** po 4 kw. rentowność obligacji +0,25 pp; po 8 kw. CIT +2 pp albo cięcie ustaw (zależnie od partii).
8. **Trzy partie:** zwycięzca poniżej 40% tworzy koalicję z drugą partią; parametry średnio ważone poparciem.
