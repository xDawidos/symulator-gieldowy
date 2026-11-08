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

## Kontrola ×200 (48aa9da względem bazy, po 120 gier, 27 kw., preset `fundusz-gig`)

Poprzednia kontrola (0ef0495) też przeszła bramki (GIG +0,62 pp, marże 0,16 pp), ale potem emisje elektrowni przeszły z przychodu na produkcję prądu (Tauron z 3,6 GW miał 0,1% emisji kraju, teraz 35%), a moc startowa trafia tylko do spółek z podsektorem energetyki. Dlatego kontrola powtórzona.

| Miara | Baza | Nowa | Cel | Wynik |
|---|---|---|---|---|
| GIG | 10,28% | 11,03% (Δ +0,74, SE 0,53) | ±1 pp | OK |
| Średnia odchyłek marż (19 sektorów) | | 0,09 pp (SE 0,12) | 0 ± 0,3 pp | OK |
| Indeks zysków | 7,10% | 7,34% | w widełkach | OK |
| Marża końcowa | 22,75% | 22,63% | w widełkach | OK |
| Zapis, średnia | 2 421 327 | 2 441 009 (+0,8%) | do 2% | OK |
| Czas kroku, 8 gier po kolei | 1341 i 1326 ms (dwa pomiary) | 1335 ms (+0,1%) | do 2% | OK |
| Błędy JS, niezmienniki | 0 | 0 | 0 | OK |
| Blackouty | | 0,23 na grę, 26 gier z 120 | rzadkie | OK |
| Nowe spółki energetyczne | | miejskie 0,05 na grę, Narodowy Atom 29 z 120 | | |
| Bloki na grę | | 4,0, projekty państwa 0,06 | | |
| Rezerwa mocy | 12% na starcie | 5–8% przez grę | | |
| Poziom życia na koniec | | p10 59,7, mediana 61,9, p90 63,3 (start ok. 50) | | |
| Zanieczyszczenie | | 40 → 39 | | |
| Poziom UEiE na koniec | | 2,3 średnio | | |
| Zieloni | | 41 z 120 gier | | |
| Rządzący na koniec | | Koalicja Rynkowa 80, Blok Państwowy 33, Ludowcy 5, Socjaldemokraci 2 | | |
| Miks na koniec | | węgiel 53%, gaz 15%, atom 2%, OZE 31% | | |
| Zdarzenia na grę | | awarie 1,33, skandale 1,02, protesty 0,14, smog 0,02 | | |

- **Czas:** wcześniejszy pomiar dał +2,8%, po liczeniu emisyjności raz na kwartał +2,0%, teraz +0,1%. Profil w pełnej grze: kod energetyki to ok. 1,4 ms na kwartał przy kroku 1335 ms.
- **Sektory:** Chemia −0,85 pp (SE 0,47), Transport i logistyka +1,29 pp (SE 0,58). Chemię obniża opłata za emisje. Średnia jest w bramce, więc nie stroiłem osobno.
- **Ujemna gotówka:** 5 gier w nowej, 1 w bazie. To osobny licznik (nie niezmiennik, ten ma 0). Przyczyny nie badałem.
- **Rządzący:** Koalicja Rynkowa wygrywa częściej niż w poprzedniej serii nowej wersji (80 wobec 57). Baza nie zapisuje rządzących, więc nie wiem, czy to zmiana 0.17.2, czy szum.
- **Zanieczyszczenie** stoi przy 40 i nie dochodzi do 80, więc spadek produkcji (decyzja 12) w seriach się nie pojawia. Działa w testach.

## Widoki

Desktop (1024 px) i 390 px sprawdzone przez DOM w grze: zakładka Energia, Kraj, Nadzór, sekcje Energia Tauronu i Państwowego Urana. Wszystkie elementy z projektu są na miejscu, poziomego przewijania strony nie ma. Pasek zakładek Państwa przewija się sam (9 zakładek), tak jak dotąd. Zrzutów ekranu nie ma, bo panel aplikacji był ukryty i nie rysował strony.

Surowe serie: folder notatek, `serie_0172`.

## Przyczyny trzech odchyleń (2026-11-08)

- **Ujemna gotówka:** we wszystkich 6 przypadkach (5 w nowej, 1 w bazie) to spółka budowlana przy strajku. Kara umowna liczona `Math.round(min(gotówka, 1% przychodu))` zaokrąglała w górę, więc gotówka schodziła do ok. −0,4 PLN. Błąd z 0.13, poprawiony na `Math.floor`. Różnica 5 wobec 1 to szum przy tak rzadkim zdarzeniu.
- **Koalicja Rynkowa:** wygrywa już w bazie: 61% wyborów (137 z 226), na koniec rządzi w 62 grach na 120. W trzech seriach nowej wersji 60%, 63% i 69% wyborów. Serie n3 i n4 różnią się tylko liczeniem emisji, a dają na koniec 57 i 80 gier, więc rozrzut między seriami jest większy niż wpływ 0.17.2. Przewaga Koalicji wynika z istniejących wag klas (`CLASS_VOTE`: klasa średnia i wyższe głosują na nią w 42–78%). Do sprawdzenia dalej jest `getLifeVoteAdj`: poziom życia rośnie przez grę, więc rządzący dostają do +3 pp, a to wzmacnia każdą partię u władzy.
- **Zanieczyszczenie przy 40:** wskaźnik z wzoru `P = 0,9 P + emisje / norma` dąży do 10 × emisje / norma, a norma jest ustawiona tak, by start dawał 40. P rośnie tylko, gdy rosną emisje. W seriach realne przychody spółek spadają (wszystkie ×0,95, odbiorcy prądu ×0,88), a zużycie prądu rośnie ×1,17. Przy udziale energetyki 40% daje to emisje ok. ×1,00, więc P stoi. Średnie maksimum w grze to 41, najwyższe 46. ESG prawie nie występuje (0,008 na grę), więc to nie obniżki trzymają P.

## Kontrola po poprawkach zanieczyszczenia i wyborów (2026-11-08)

Baza: 180 gier (pierwsza seria 120, druga 60 przerwana na polecenie użytkownika). Obie bazy zgodne: GIG 10,28% i 10,22%.

| Seria | GIG wobec bazy | Indeks zysków | Średnia marż | Uwagi |
|---|---|---|---|---|
| 26282c6, przychód z bloku 35% (120 gier) | +1,64 pp (SE 0,46), **POZA** | +0,78 pp, **POZA** | 0,16 pp | zapis +0,8%, czas 1360 ms (+2,0%), 0 błędów |
| przychód z bloku 20% (100 gier, jeden wątek przerwany) | +0,37 pp (SE 0,51), OK | +0,43 pp, OK | 0,23 pp, OK | przyjęte w kodzie |

- **Zanieczyszczenie:** 40 → 49–50 na koniec gry (cel ok. 55 rośnie dalej po 27 kw.). Smog ok. 1 raz na grę, protesty 0,9, kwaśne deszcze 0,2.
- **Wybory:** reelekcja po 1. kadencji 26% (baza 20%, przed poprawką 35%). Koalicja Rynkowa rządzi na koniec w 72 grach na 120 (baza 62). GIG nie zależy od tego, kto rządzi, ani od Zielonych.
- **Niesprawdzone:** czasu kroku dla przychodu z bloku 20% nie mierzyłem (pomiary zakończone na polecenie użytkownika); zmiana to jedna stała, więc kosztu czasu nie dokłada.
