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
