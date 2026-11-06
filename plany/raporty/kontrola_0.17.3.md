# Kontrola 0.17.3 „Rozmowy i Tied”

Baza porównań: commit 63c33c7. Gałąź `claude/impl-017-s0b-891539`, nie scalona.

## Etapy
- **R2:** plany spółek w `stock.plannedMove`, zapowiedzi dla znajomych i zaufanych, 7 charakterów jako dane, zapowiedzi bez pokrycia, posty stylu, opinie botów z reklamą przed sprzedażą, kontrola KNF. Dywidenda, strategia i przejęcie AI wykonują się po 1–2 kw. Skup działa na liczniku, więc plan jest prognozą z licznika. Testy: 992/992.
- **R3:** wiceprezesi od giełdy Złotej i mediany kapitalizacji Złotej, 15 cech. Wszystkie cechy mają realny parametr, żadnej nie zastępowałem. Awans 70% (przy Następcy lub Aspirancie 90%), relacja zostaje pod `ceo:<id>`, kandydaci na walnym, karta spółki, profil firmy. Kontakt obejmuje też wiceprezesów spółki w chwili zakupu.
- **R4:** rozmowa 2–3 tury, `resolveTalk` bez losowania, „Napisz” sterowane jedną funkcją `getTiedTalkAccess`, szybka rozmowa, prośby od 5% udziału, wpis gracza, VIP przez rozmowę w Tied (mail Ważne prowadzi do Tied), premia reputacji i spadki relacji z R0. Sama macierz nie dawała celu 40–70% / 25%, dlatego doszło ukryte nastawienie z hasha: jeden ton +1, jeden −4, powtórzony ton −1.
- **R5:** obietnice botów: 11 celów, karteczki w TeamedUP!, oferta w Wiadomościach Tied. Zakup przez `subscribeClient`, bo `applySubscriptionUnits` nalicza koszt kampanii i zmieniałby NAV. Bot traci dokładnie tyle, ile dostaje fundusz. Cel 11 liczy obligacje i fundusze towarowe, bo ETF-y akcyjne gracza są osobno.
- **R6:** 3 hasła Akademii, sonda częstości zdarzeń, preset `czytelnik-tied`, `tied_serie.mjs`, test zapisu nowych pól. Widoki sprawdzone na desktopie i 390 px.

## Kontrola ×200 (commit 1c10064 względem 63c33c7)

Pierwsza seria na 2a9a0a5 była nieważna: GIG 26%, 172 spółki, skup ×3,5, krok ×3. Przyczyna: od R2 `noteTiedEvent` czytał `text` we wpisach kadrowych bez tekstu, więc wyjątek leciał z `logEvent` i przerywał kod wywołujący przed resetem licznika, a spółki powtarzały decyzje. Sonda pokazywała stałe 5 błędów na grę, bo lista była ucięta; teraz ma pełny licznik `errorCount`. Drugi błąd: `postTiedInvestorOpinion` losował spółkę w środku `find`. Bisekcja R2–R5 na 12 grach etapu pokazała wzrost już od R2. Obie poprawki mają testy regresji. Testy: 1013/1013.

Ramiona: nowa i baza po 120 gier, 27 kw., preset `fundusz-gig`; czytelnik Tied 24 gry; czas po 8 gier sekwencyjnie.

| Miara | Baza | Nowa | Cel | Wynik |
|---|---|---|---|---|
| GIG | 10,71% | 10,34% (Δ −0,37, SE 0,57) | w widełkach | OK |
| Średnia odchyłek marż | | 0,15 pp (SE 0,13) | 0 ± 0,3 pp | OK |
| Indeks zysków | 7,15% | 6,98% | w widełkach | OK |
| Marża końcowa | 22,30% | 22,53% | w widełkach | OK |
| Dywidendy na grę | 64,97 | 61,69 (−5,1%, SE 1,45) | jak w bazie | na granicy szumu |
| Skupy na grę | 20,53 | 20,09 (−2,2%, SE 2,53) | jak w bazie | OK |
| Zmiany strategii na grę | 44,60 | 37,97 (−14,9%, SE 0,69) | jak w bazie | **POZA** |
| Przejęcia na grę | 5,96 | 6,03 (+1,3%, SE 0,33) | jak w bazie | OK |
| Zapis, średnia | 2 408 979 | 2 405 514 (−0,1%) | do 2,49 mln | OK |
| Gry ponad 2,49 mln | 27/120 | 29/120 | | jak w bazie |
| Czas kroku, sekwencyjnie | 1212 ms | 1200 ms (−1,0%) | wzrost do 2% | OK |
| Błędy JS, niezmienniki | 0 | 0 (144 gry) | 0 | OK |
| Przewaga czytelnika Tied | | −0,46 pp na 2 kw. (SE ok. 2,3) | próg do ustalenia | bez przewagi |

- **Strategie −15%:** plan przesuwa decyzję o 1–2 kw., a w chwili wykonania warunki mogą już nie być spełnione albo większościowiec blokuje. Część spadku to plany niewykonane przed końcem gry. Zgodnie ze zleceniem nie obchodziłem tego; średnie marże, zyski i GIG nie reagują.
- **Czytelnik:** zapowiedzi prawdziwe w 80,4%. Wynik 2 kw. ponad GIG: po zapowiedzi 1,73 pp, losowa spółka 2,19 pp; po ucięciu 1% skrajnych −0,18 pp i 1,07 pp. Tied nie daje przewagi finansowej.
- **Rozmowy:** 64% gracz według charakteru i 25% losowy to wynik symulacji z R4; kontrola ×200 tego nie mierzy, a poprawka nie dotyka `resolveTalk`.
- **Czas w seriach równoległych** (2549 → 1594 ms) zależy od obciążenia i nie jest miarą; liczy się pomiar sekwencyjny.

## Decyzje użytkownika po kontroli (2026-11-06)

- **Strategie −15%:** zostaje. Niespełnione zapowiedzi są częścią gry.
- **„Napisz”:** zostaje wersja z planu.
- **Zapowiedzi:** mogą dawać przewagę, ale nie muszą, więc próg presetu „czytelnik Tied” nie obowiązuje.
- **GIG +1,09 pp z S7:** zamknięte. W obecnej kontroli GIG nie odbiega od bazy.
- **Limity czasu i zapisu:** bez zmian.

## Gaz i podsektory (commity po 5fc1f41)

Koszt przechowania gazu: 6% → 3% → 2%, bo przy 3% krótkie na gazie miały na depozycie 14,0%. Podsektory: KWM Wydobycie, STM i BTX Przemysł ciężki, ORT nowy Telekomunikacja (`listedOnly`). Fraza przemysłu ciężkiego rozszerzona o beton i statki. Przydział działa raz na świat, więc tylko w nowej grze; stare zapisy zostają bez podsektorów.

| Miara | Baza | Nowa | Cel | Wynik |
|---|---|---|---|---|
| Krótkie na gazie, na depozycie | 27,8% (przed zmianą) | 5,47% łącznie, −42,6% średnia gier (SE 27,9) | do 11,11% | OK |
| Krótkie na gazie, na wartości pozycji | 9,3% (przed zmianą) | 1,82% | do 11,11% | OK |
| Powrót do średniej, na depozycie | 9,6% (przed zmianą) | 8,78% | do 11,11% | OK |
| GIG | 10,71% | 10,55% (Δ −0,16, SE 0,54) | w widełkach | OK |
| Średnia odchyłek marż (20 sektorów) | | −0,08 pp (SE 0,13) | 0 ± 0,3 pp | OK |
| Indeks zysków | 7,15% | 7,28% | w widełkach | OK |
| Zapis, średnia | 2 408 979 | 2 405 184 (−0,2%) | do 2,49 mln | OK |
| Błędy JS, niezmienniki | 0 | 0 | 0 | OK |

Zmiany strategii na tej serii: 37,59 na grę (−15,7%), dywidendy −6,7%, skupy +0,9%, przejęcia +3,5%. Czasu kroku nie mierzyłem ponownie, bo zmiany dotyczą danych.

## Uwagi designu (sprawdzał stan R1)

| Punkt | Stan na gałęzi | Co zrobione |
|---|---|---|
| 1. Pasek nie zwija się płynnie | aktualny | `renderTiedPage` podmienia części i zachowuje węzeł `.tied-feedbar`; test regresji |
| 2. Polubienie zamyka komentarze | aktualny | otwarte `<details>` wracają po renderze; test regresji |
| 3. Kreska przy relacji od +20 | aktualny | bez kreski, tekst tymczasowy „Możesz wysłać prośbę do znajomych”, tylko gdy prośba jest możliwa; test |
| 4. Ikona przy „Profil w Tied” | aktualny | `grupa` 12 px przy prezesie i wiceprezesach |
| 5. „Zamknij rozmowę” | częściowo nieaktualny | rozmowa z R4 już to miała, poprawiony wątek wiadomości |
| 6. Formularz wpisu gracza | nieaktualny | R4 ma `.tied-compose` i 3 wpisy jak makieta, bez zmian |

Testy: 1016/1016. W grze: pasek zostaje tym samym węzłem i startują trzy przejścia po 200 ms, profil przy +34 bez kreski, ikona 12 px, konsola czysta. Panel przeglądarki był ukryty, więc samego zwijania nie widać na ekranie, a komentarzy i 390 px nie oglądałem w grze; komentarze pokrywa test.

## „Napisz” poza kontaktami (plan 3c058d3)

Scalone zmiany-AI (67b98d9). `renderTiedTalkAction` pokazuje wyłączony przycisk „Rozmowa po zakupie akcji tej spółki” u prezesa i wiceprezesa spoza kontaktów, którzy nie są autorami widocznego posta. Inwestorzy i VIP-y zostają bez przycisku, bo kontakt z nimi nie wynika z zakupu akcji, więc tekst byłby nieprawdziwy. Bez przycisku jest też zarząd spółki upadłej. Warunek dostępu `getTiedTalkAccess` bez zmian. Testy: 1016/1016.

## Prośba do inwestora o zakup udziałów (decyzja użytkownika)

W ostatniej turze pełnej rozmowy z inwestorem przy relacji od +20 jest prośba „Udziały w funduszu”. Udana rozmowa daje od razu ofertę obietnicy z `createPromiseOffer`, a dalej działa zwykły mechanizm: cel, zakup po NAV z gotówki bota, limit 3 aktywnych i jedna obietnica na bota. Nieudana rozmowa daje tylko efekt na relacji. Prośba ma ton nacisku, jak prośby do zarządu. VIP-y bez zmian.

Górny limit z presetu `zachety`, 24 gry: wszyscy inwestorzy od +30, 64% udanych rozmów, każda oferta przyjęta, każdy cel spełniony. Wpłaty 3,35% aktywów funduszu rocznie (największa gra 4,85%), 22,5 oferty na grę, GIG 10,60% wobec 10,55%, 0 błędów JS, 0 naruszeń niezmienników. Wynik dotyczy funduszu z presetu, średnio 12 376 PLN aktywów. Testy: 1017/1017. Widok na 390 px bez poziomego przewijania; desktopu nie oglądałem.
