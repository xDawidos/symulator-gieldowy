# Plan 0.17.2 „Energia i środowisko”

Specyfikacja po decyzjach użytkownika z 2026-11-06. Zastępuje szkic z 2026-10-25. Kolejność wersji: 0.17.3, potem 0.17.2, na końcu 0.17.1 (balans). Liczby są startowe, stroi je sesja kodu w bramkach.

## Cel

Energia dostaje własny rynek, a kraj nowy wskaźnik poziomu życia. Wersja ma być zrobiona w pełnym zakresie, bez wariantów minimalnych.

## Stan kodu (sprawdzone 2026-11-06)

- Energia ma 9 spółek w `initialStocks`. Podsektory: Energetyka jądrowa, OZE, Rafinerie, Gaz. Węglowego brak.
- Przypisania: PUR i TRN jądrowa, BEW i ENG OZE, PES Rafinerie, NAG Gaz. ESA, WIW i MEF bez podsektora.
- Atom: `nuclearBlock` w `companies.js:11231`, zmiany w sekcji „Atom”.
- OZE: dotacja przez `partySubsidy` (`core.js:1873`).
- Wsad surowców: `COMMODITY_SECTOR_INPUTS` i `COMMODITY_SUBSECTOR_INPUTS` w `commodities.js`.
- Katalog inwestycji Energii: `energy_plant`, `wind_farm`, `solar_park` (`companies.js:2387`).
- Spółki miejskie: lista startowa z Elektrociepłownią Miejską (`companies.js:5016`).
- Specjaliści budowlani: 7 w `specialists`, specjalności `technology`, `general`, `office`, `industrial`, `residential`.
- Partie: 4 stałe (`PARTY_IDS`), kolumny głosów w `CLASS_VOTE`.
- Urzędy: `oversight.police` i `oversight.knf` z `getInstitutionEffectiveness` i `fundInstitution`.
- Atrakcyjność kraju: `getCountryAttractiveness` (`core.js`), steruje migracją.
- Poziomu życia w kodzie nie ma. Zdrowia i informacji jako wskaźników też nie ma. Bezpieczeństwo (`society.defense`, S6) i wykształcenie (`society.education`) są.

## E0. Pomiar

Baza po scaleniu 0.17.3: marże Energii i odbiorców prądu, sonda mocy i zużycia w trybie cichym. Sonda ma potwierdzić, że zapotrzebowanie i moc startowa się równoważą.

## E1. Spółki i podsektory

- Nowy podsektor **Energetyka węglowa**: TRN, ESA. Opis TRN dotąd mówił o węglu, a dane o atomie.
- Nowy podsektor **Energetyka gazowa**: PING. Wsad gazu.
- **WielkiWoltaż:** OZE. **Meferox:** bez zmian.
- **Nowa spółka PING**, ticker PING: prywatna, giełda Srebrna, gazowa. Wpis w `SUBSECTOR_START_ASSIGNMENTS` i `listedOnly` dla nowych podsektorów. Opis przez generator.
- **Nowe spółki:** gdy zapotrzebowanie stale przekracza moc, powstaje spółka energetyczna najpierw jako miejska. Później może wejść na giełdę istniejącą ścieżką spółek miejskich.

## E2. Prąd

- Moc i produkcja liczone per spółka w `stock.power = { type, capacity }`, stan kraju w `society.energy`.
- Miks: udział mocy każdego typu w mocy kraju, zmieniany budową nowych bloków.
- Cena prądu: `Σ udział × koszt typu`. Koszty: węgiel i gaz z ceny surowca, atom z ceny uranu i wysokiego kosztu kapitału, OZE bez paliwa, z kosztem kapitału.
- Ustawa „Dostawcy energii” modyfikuje cenę (patrz E3).
- Nowy wsad „prąd” dla Przemysłu, Chemii, Motoryzacji, Budowlanego i kolei (PKC). Zastępuje część wsadu węgla i gazu z 0.17 S2, kalibracja „średnio zero”.
- Plan dalszy: niemal każdy sektor bierze prąd, a miasta mają własne zużycie. To trzeba zbalansować i zmierzyć, zapis w `plan_seria_0.18_towary_ipo_miasta.md`.

### Budowa i zlecenia

- Spółki energetyczne budują nowe bloki i budynki energetyczne: AI według niedoboru i ceny prądu, gracz jako właściciel przez `orderStrategy` lub panel spółki.
- Państwowe projekty elektrowni idą przez przetargi jak infrastruktura S5, z limitami na typ.
- **Zlecenia na rynek podwykonawców:**

| Zlecenie | Dla kogo | Wykonawca | Skutek |
|---|---|---|---|
| Poszukiwanie nowych złóż | Ropa, węgiel, gaz | Geolog | Wynik losowy: większa produkcja surowca na czas złoża lub nic |
| Szukanie działki pod inwestycję | Wszystkie typy | Geolog | Niższy koszt i krótszy czas następnej budowy |
| Inwestowanie w najnowsze technologie | OZE i atom | Badania (istniejący system R&D) | Tańsza moc lub wyższa sprawność |

- **Nowy typ podwykonawcy: geolog.** Obsługuje też szukanie działki, jedna nazwa wystarcza.
- Start: 2 podwykonawców energetycznych (`energy`) i 2 geologów (`geology`). Mogą powstawać nowi. Liczba geologów to założenie planu.

### Blackout

Rzadkie zdarzenie przy dużym niedoborze mocy: niższe przychody przemysłu, spadek zadowolenia, wpis w mediach. Handel prądem jest przeniesiony, więc niedobór trzeba pokryć budową albo wyższą ceną, a próg blackoutu stroi się po sondzie E0.

## E3. Ustawy i partie

| Ustawa | Opcje | Skutek |
|---|---|---|
| Polityka energetyczna | Węgiel, gaz, atom, OZE, brak dofinansowań | Wybrany typ ma delikatny bonus do stabilności i zarobków |
| Dostawcy energii | Prywatna, mieszana (start), państwowa | Prywatna: cena rynkowa. Mieszana: cena z limitem. Państwowa: cena niższa, koszt budżetu, państwowe spółki pierwsze w przetargach |
| Polityka klimatyczna | 5 poziomów | Wyższy poziom: wyższa opłata za emisje |

Partie dostają preferencje w `PARTY_PROGRAMS.moves`.

### Zieloni

- Nowa partia, zwolennicy ekologii. Pojawia się w grze zamiast Socjaldemokratów, zajmuje ich miejsce w `PARTY_IDS` i `CLASS_VOTE`, ma własne wagi.
- Założenie planu: losowanie przy starcie gry oraz możliwa zamiana na wyborach przy wysokim zanieczyszczeniu. Stare zapisy zostają przy Socjaldemokratach.
- Program: wyższa polityka klimatyczna, OZE, wyższy budżet UEiE.

## E4. Urząd Energii i Ekologii

- Poziomy 0–5 i budżet jak `oversight.knf`, bez łapówek na start.
- **Poziom 0: brak limitów.** Limity powstają z poziomami i ustala je urząd na podstawie pomiaru produkcji i wpływu na zdrowie obywateli.
- Wyższy poziom: dokładniejszy pomiar, częstsza kontrola, wyższa skuteczność kar.
- **ESG:** wzmocniony urząd odblokowuje ścieżkę ESG. Spółka może iść w ekologię, płacąc na początku za niższe emisje. Rozwinięcie w 0.18.
- Spółka jądrowa: zgodę na blok wydaje UEiE zamiast ogólnego „regulatora”.

## E5. Zanieczyszczenia

- Krajowy wskaźnik 0–100: `P = 0,9 × P + emisje / norma`.
- Emisje spółki = produkcja × współczynnik sektora i typu. Start: węgiel 1,0, Chemia 0,7, Przemysł 0,6, gaz 0,5, Motoryzacja 0,3, Budowlany 0,2, atom 0,05, OZE 0,02.
- **Debug mode:** emisje spółek i kraju widoczne od początku, także przy UEiE poziom 0.
- **Skutki:** poziom życia (przez zdrowie), ułamek przyrostu populacji i przy wysokim wskaźniku mały spadek produkcji. Punkt „produkcja” z decyzji 10 zapisany jako skutek, do potwierdzenia.
- Opłata za emisje: procent przychodów proporcjonalnie do emisji, według polityki klimatycznej.
- Przekroczenie limitu: kara.
- Obniżanie emisji: inwestycje ekologiczne, technologie, ESG.

### Zdarzenia

Smog, protesty, awaria elektrowni, **kwaśne deszcze** (obniżają produkcję spółek rolniczych). Po 2–3 warianty na typ. Skandale ekologiczne opisują media (PULS, FLESZ, OBSER) i Tied.

## E6. Poziom życia

Nowy wskaźnik krajowy 0–100, średnia ważona 5 czynników:

| Czynnik | Źródło w 0.17.2 |
|---|---|
| Konsumpcja i zadowolenie | Satysfakcja, płace realne, `demandIndex` |
| Zdrowie | Nowy: usługi publiczne, sektor Medycyna, zanieczyszczenie |
| Bezpieczeństwo | Bezpieczeństwo państwa S6, poziom policji |
| Edukacja i nauka | `society.education`, sektor Badania, odblokowane technologie |
| Informacja | Nowy: Media, operatorzy, wolność mediów przez ustawy i skandale |

- Wagi startowe równe, po 20%.
- Skutek: wchodzi do `getCountryAttractiveness`, więc steruje migracją, oraz do przyrostu populacji i nastrojów wyborczych.
- UI: karta kraju i panel Państwa, czynniki rozpisane słowem i liczbą.
- Pogłębienie: `0.19.1` Społeczeństwo 2 (zdrowie, nauka) i `0.19.2` Miasta 2 (wskaźnik na miasto).

## E7. OZE i atom z udziałem państwa

- OZE finansowane z opłat za emisje. Wydatek w nowej linii budżetu.
- Atom według sekcji „Atom”.
- Superprojekty OZE i atom na zasadach S5. 0.18 przebuduje blok na 3 etapy.

## E8. Opinia publiczna

- Krajowy modyfikator 0–100, najwyżej ±2% przychodów dla Dóbr konsumpcyjnych, Mediów i Turystyki.
- Bez wskaźnika w górnym pasku, widoczna w oknie „Rynek” i karcie kraju.
- Kształtują ją PR, skandale, ekologia i polityka.
- Skandale trafiają do mediów i Tied.

## E9. Technologie

Bez nowego katalogu. Istniejące pozycje z `technologies` dostają efekt na emisje lub prąd: m.in. Wychwyt CO2, Smart Grid, Certyfikat Eko-Odpowiedzialności, Ekologiczne Materiały.

## E10. Interfejs, Akademia, kontrola

- Zakładka Energia w panelu Państwa: miks, moc i zużycie, cena prądu, UEiE, emisje, poziom życia.
- Akademia: miks energetyczny, cena prądu, emisje i limity, poziom życia, ESG.
- Zapis: wersja kolejna po 0.17.3, pola opcjonalne.
- Kontrola ×200: GIG ±1 pp, marże średnio 0 ± 0,3 pp, zapis i czas bez wzrostu ponad 2%, częstość blackoutów, rozkład poziomu życia, partie, liczba nowych spółek energetycznych.
- Raport: `plany/raporty/kontrola_0.17.2.md`.

## Przeniesione

- **Handel energią między państwami:** do Polityki 2 (`plan_0.19.1_polityka_2.md`).

## Atom (decyzja użytkownika 2026-11-07)

- Kilka bloków w jednej spółce, kolejny wymaga działającego poprzedniego.
- Każdy blok daje realną moc w miksie kraju. Przychody kolejnych bloków maleją (start +15%, +10%, +5%, do strojenia).
- Zgodę wydaje UEiE zamiast ogólnego regulatora.
- Kontrakt z państwem zależy od ustaw „Polityka energetyczna” i „Dostawcy energii”, nie tylko od partii.
- Nowa państwowa spółka atomowa od giełdy Platynowej, bez NewHorizons, po kilku latach subsydiów OZE, z możliwą prywatyzacją. Istniejące spółki atomowe działają dalej.
- Bez zmian: budowa 8–16 kw., koszt ok. 2 kw. przychodów, szanse startu 4% i 3,5% × mnożnik partii.

## Założenie do potwierdzenia

„Dorzuć produkcję” z decyzji 10 plan przyjmuje jako dodatkowy skutek zanieczyszczeń.

## Zależności i ryzyka

- **Marże Energii i Przemysłu:** kalibracja „średnio zero”.
- **Nakładanie się z 0.18:** prąd jako towar i blok w 3 etapach. Dane muszą pozwolić na przebudowę.
- **Zapis i czas:** nowe pola tylko krajowe i per spółka energetyczna.
- **Partie:** zmiana `PARTY_IDS` dotyka wyborów, darowizn i UI, stare zapisy zostają przy `social`.
- **Skala:** E5–E6 dotykają migracji i populacji, więc mogą ruszyć GIG i podaż pracy. Osobna sonda.

## Kolejność etapów

E0 → E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8 → E9 → E10. Design przed E10, a najlepiej przed E2 dla zakładki Energia.

## Polecenie dla czatu kodu

> Wdróż 0.17.2 według `plany/plan_0.17.2_energia_srodowisko.md`, etapami E0–E10, po scaleniu 0.17.3 i po projekcie czatu designu. Po każdym etapie commit po polsku i wpis w `plany/raporty/kontrola_0.17.2.md`. Nie scalaj do `zmiany-AI`, nie wypychaj. Liczby strój w bramkach, a decyzje mechaniczne zgłaszaj użytkownikowi.
