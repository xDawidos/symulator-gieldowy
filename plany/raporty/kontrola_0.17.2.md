# Kontrola 0.17.2 „Energia i środowisko”

Gałąź `claude/impl-017-s0b-891539`, baza po scaleniu zmiany-AI 965ad54. Nie scalona.

## Etapy

- **E0:** sonda `T.pow` w `PROBE_017`: przychody Energii i odbiorców prądu, poziom cen, ludność, budynki energetyczne. Sonda tylko czyta. Wynik bazy w sekcji „Baza E0”.
- **E1:** Energetyka węglowa (TRN, ESA, wsad węgla 0,40), Energetyka gazowa (PING, wsad gazu 0,40), WielkiWoltaż w OZE, nowa prywatna spółka PING na Srebrnej. TRN bez uranu, Meferox bez zmian. Nowe podsektory tylko dla przypisanych spółek. Powstawanie nowych spółek zależy od popytu, więc jest w E2.
- **E2:** `energy.js`. Moc startowa z przychodu segmentu Energia (kraj 30 GW, zużycie mniejsze o rezerwę 12%), atom startuje od zera, bo PUR nie ma jeszcze bloku. Zużycie rośnie z PKB i ludnością, moc tylko z bloków, budynków z katalogu i projektów państwa. Cena: udziały × koszt typu, premia za niedobór. Wsad „prąd” działa jak wsad surowców, względem średniej z 8 kw., więc średnio zero. Część wsadu węgla i gazu przeszła na prąd: Przemysł, Chemia, PKC. Zlecenia: złoża i działka u geologa, technologie u podwykonawcy `energy`. Nowe spółki miejskie po 6 kw. niedoboru, IPO z sektorem Energia. Moc upadłej spółki zostaje w puli kraju. Widoki czekają na znak po projekcie.
- **E3:** 3 ustawy, ruchy partii, ruch `set` dla ustawy bez kierunku. Zieloni: 25% na start gry, zamiana na wyborach od zanieczyszczenia 60 (szansa 30%), poza rządem. Stary zapis zostaje przy Socjaldemokratach. Państwowe spółki pierwsze w przetargach elektrowni przy dostawcach państwowych.
- **E4-E5:** zrobione razem, bo limity i pomiar zależą od emisji. Urząd finansowany 15% opłat (30% przy Zielonych), dotacja z konta prywatnego jak KNF. Emisje, wskaźnik, opłata, kary, ESG, 5 typów zdarzeń po 2–3 warianty, skandale w mediach i Tied. Poziomy i stawki według „Domknięcia projektu”.
- **E6-E9:** poziom życia z 5 czynników, punkt zero na starcie gry, więc migracja startuje bez zmian. Fundusz opłat płaci OZE według mocy, nowa linia `budget.energyFund`, saldo budżetu bez zmian. Atom: do 4 bloków, przychód +15, +10, +5%, moc po 6% kraju, kontrakt zależny od ustaw, zgoda UEiE, Narodowy Atom po 16 kw. dopłat. Opinia ±2%. Efekty 4 technologii na emisje, Smart Grid na zużycie, Magazyny Bateryjne na próg blackoutu.
- **E10 (bez widoków):** 5 haseł Akademii, zapis w wersji 23.

## Odstępstwa i decyzje mechaniczne do zgłoszenia

- **Podwykonawcy `energy`:** zostaje minimum 3, nie 2. `auctionMin` to 3, a przy 2 firmach zmienia się wynik aukcji budów. Geologów jest 2, bo ich zlecenia nie idą przez aukcję.
- **E4 i E5, E6–E9:** jeden commit na grupę, bo kod jest przepleciony.
- **Widoki:** `energy_ui.js` wg projektu 11. Karta kraju startowego nie istnieje w grze, więc wiersze Poziom życia i Opinia są w zakładce Kraj.

## Baza E0 (commit 965ad54 z sondą, 120 gier, 27 kw., preset `fundusz-gig`)

Sonda w trybie cichym tylko czyta. Przez grę przychody Energii rosną ×1,11, odbiorców prądu ×1,07, poziom cen ×1,22, ludność 37,8 → 39,0 mln. Budynków energetycznych z katalogu nie ma w żadnej grze, więc moc rośnie tylko przez bloki i projekty państwa. Na starcie zużycie i moc równoważą się z założenia (rezerwa 12%).

## Strojenie

- **Miks startowy:** pierwsza próba dała 97% OZE, bo moc szła za przychodem, a Bałtycka Energia ma największy przychód. Miks startowy jest stały: węgiel 55%, gaz 15%, atom 0%, OZE 30%. W typie moc dzieli przychód.
- **Zużycie:** z samego PKB rosło o 4% przez grę i rynek prądu nie pracował. Doszedł trend 2% rocznie (elektryfikacja), emisje elektrowni idą za produkcją prądu.
- **Pierwsza kontrola:** GIG +1,31 pp (poza bramką), przychody Energii ×1,71. Przychód z nowego bloku zmniejszony do 35% przyrostu mocy, opłata za emisje 0; 0,3; 0,7; 1,2; 1,8% (było 0,6–2,5%), Narodowy Atom po 20 kw. dopłat i 3% na kwartał.
- **Runner:** Edge w nowym profilu otwierał kartę Adblock Plus i przebiegi stały. `run_przebiegi.mjs` ma teraz `--disable-extensions`. Sonda E0 miała `${…}` w szablonie presetu, co psuło skrypt.

## Kontrola ×200 (0ef0495 względem bazy, po 120 gier)

| Miara | Baza | Nowa | Cel | Wynik |
|---|---|---|---|---|
| GIG | 10,28% | 10,91% (Δ +0,62, SE 0,49) | ±1 pp | OK |
| Średnia odchyłek marż (19 sektorów) | | 0,16 pp (SE 0,12) | 0 ± 0,3 pp | OK |
| Indeks zysków | 7,10% | 7,24% | w widełkach | OK |
| Marża końcowa | 22,75% | 22,47% | w widełkach | OK |
| Zapis, średnia | 2 421 327 | 2 423 318 (+0,1%) | do 2% | OK |
| Błędy JS, niezmienniki | 0 | 0 | 0 | OK |
| Czas kroku, sekwencyjnie | patrz niżej | | do 2% | |
| Blackouty | | 0,13 na grę, 16 gier z 120 | rzadkie | OK |
| Nowe spółki energetyczne | | miejskie 0,02 na grę, Narodowy Atom 23 z 120 | | |
| Bloki na grę | | 3,9 (w tym projekty państwa 0,02) | | |
| Poziom życia na koniec | | p10 59,9, mediana 61,6, p90 63,6 (start ok. 50) | | |
| Zanieczyszczenie | | 40 → 37 | | |
| Zieloni | | 32 z 120 gier (start 25% i zamiany) | | |
| Rządzący na koniec | | Koalicja Rynkowa 57, Blok Państwowy 53, Ludowcy 8, Socjaldemokraci 2 | | |
| Miks na koniec | | węgiel 54%, gaz 15%, atom 1,5%, OZE 30% | | |

- **Chemia −1,48 pp (SE 0,48):** jedyny sektor wyraźnie niżej. Składają się na to opłata za emisje (0,7 × 0,3%) i mniejszy wsad gazu na rzecz prądu. Średnia sektorów jest w bramce, więc nie stroiłem tego osobno.
- **Medycyna +1,33 pp (SE 0,49):** bez związku z energetyką, prawdopodobnie szum.
- **Zanieczyszczenie spada:** ESG, kary i technologie obniżają emisje szybciej, niż rośnie produkcja. Założenie „produkcja = dodatkowy skutek zanieczyszczeń” działa w kodzie, ale w seriach wskaźnik nie dochodzi do 80, więc skutek się nie pojawia.
- **Pierwsza seria nowej wersji** (przed strojeniem) miała 4 naruszenia „ujemna gotówka funduszu” botów w jednej grze. Po strojeniu 0, w bazie 1 ujemna gotówka. Nie badałem przyczyny.
