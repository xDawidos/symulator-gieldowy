# Kontrola 0.17 „Surowce, transport, infrastruktura, bezpieczeństwo” (S7, wersja 0.17.7)

Gałąź `claude/impl-017-s0b-891539` (po scaleniu `zmiany-AI` 1edbee2; nie scalona z powrotem). Testy: **958/958** (było 954; S7 +4). Pomiary na commicie `c01d6af`, baza = `zmiany-AI` e06a598 przez `--target`. Surowe JSON-y: notatki sesji, `serie_s7/`.

## Wynik

| Kryterium | Cel | Wynik | Ocena |
|---|---|---|---|
| GIG, 120 + 120 gier PL w jednej partii | ±1 pp | 10,34% → 11,43%: **+1,09 pp** (SE 0,57) | **ponad cel o 0,09 pp**, w granicach błędu |
| Średnia odchyłek marż sektorów | 0 ± 0,3 pp | **−0,21 pp** (SE 0,12) | OK |
| Niezmienniki, ujemna gotówka, błędy JS, przerwane gry | 0 | 0 we wszystkich seriach | OK |
| Seria PL 20 lat ×12 | bez awarii | 12/12 gier; 0 niezmienników i błędów JS | OK |
| Czas kroku, 8 gier sekwencyjnie | ≤ 1 334 ms/kw. | **1 382 ms** (baza na tej maszynie: 1 352) | **POZA o 48 ms**; baza też poza limitem, 0.17 dodaje 2,2% |
| Exploit kontraktów, na wartości pozycji | ≤ lokata + 6 pp (11,34%) | powrót do średniej 3,2%, krótkie na gazie 9,3% | OK |
| Exploit kontraktów, na depozycie 1:3 | ≤ lokata + 6 pp (11,34%) | powrót do średniej 9,6%; **krótkie na gazie 27,8%** | **POZA** (zob. niżej) |
| Zapis, średnia 27 kw. | ≤ 2,49 mln znaków | **2 425 485** | OK |

## Zapis (27 kw., bez kompresji)

| Seria | Średnia | p90 | Maksimum | Gry ponad 2,49 mln |
|---|---|---|---|---|
| 0.17 | 2 425 485 | 2 610 669 | 2 918 513 | 41/120 |
| Baza | 2 425 981 | 2 604 398 | 2 768 115 | 42/120 |

Limit liczony dla średniej to założenie robocze. Średnia nie zmieniła się względem bazy, ale maksimum wzrosło o ok. 150 tys. znaków. Gra 20-letnia: średnio 3,88 mln znaków.

## Marże na dużej próbie
Przy 120 grach wahania z S5 (−0,08 do −0,53 pp) i spadek Chemii o 2–3 pp okazały się szumem baz po 24 gry: Chemia wychodzi **+0,16 pp** (SE 0,43). Najniżej są Rybołówstwo −0,81 pp, Motoryzacja −0,72 pp, Medycyna −0,71 pp i Żywność −0,66 pp, wszystkie w granicach ok. 1,5 SE. `earningsIndexCagr` −0,17 pp (SE 0,34), marża końcowa +0,07 pp (SE 0,28), oba w widełkach.

## Exploit kontraktów (preset `kontrakty`, 24 gry, 27 kw., dźwignia 1:3, seria kolejna)
Lokata średnio 5,34% rocznie.

| Strategia | Pozycje | Wygrane | Zamknięte przymusowo | Na wartości pozycji | Na depozycie: łącznie | Na depozycie: średnia gier |
|---|---|---|---|---|---|---|
| Powrót do średniej | 266 | 49% | 63 | 3,2% | 9,6% | 8,5% (SE 12,7) |
| Krótkie na gazie | 269 | 53% | 85 | 9,3% | **27,8%** | 15,6% (SE 19,4) |

- **Skąd przewaga:** cena kontraktu zawiera stopę i koszt przechowania (na gazie razem ok. 10% rocznie), a cena bieżąca tego nie zarabia. Stała pozycja krótka zbiera tę różnicę. To celowy skutek wzoru z S3 i odpowiada temu, jak działa contango.
- **Ryzyko:** co trzecia pozycja krótka na gazie kończy się przymusowym zamknięciem, a wynik gier jest bardzo rozrzucony. Wynik łączny (27,8%) mocniej liczy późne kwartały z dużym funduszem; średnia gier (15,6%) nie różni się istotnie od progu.
- **Ocena:** spec nie mówi, czy próg dotyczy wartości pozycji, czy depozytu. Na wartości pozycji przechodzi, na depozycie jest poza progiem. Decyzja dla użytkownika: zostawić czy obciąć koszt przechowania gazu (`COMMODITY_MARKET.carry.gas` z 6% na ok. 3%).
- **Strategie nie są jedynymi możliwymi:** preset mierzy dwie proste reguły, nie najlepszą możliwą grę.

## Pozostałe wyniki (120 gier)
- **Zerwane umowy państwa:** 15,8% (58 z 366), w limicie 1/5.
- **Deficyt:** 59% kwartałów według salda, CIT +2 pp w 44/120 grach. Decyzje S6 bez zmian.
- **Bezpieczeństwo:** średnio 58, zakres 41–69. Podbicie po embargu w 26/120 grach.
- **Lotnisko:** pierwsze w 107/120 gier, ok. 17. kw. Otwarte kraje 4,1 na grę, połączenia giełd 0,25.
- **20 lat:** GIG 12,65%, marża końcowa 19,6%. Bez porównania z bazą, bo tej serii nie liczyłem dla bazy; porównanie z grą 27 kw. nic nie mówi.

## Co zrobione w S7
- **„Mistrz Opcji”** (`optionsMaster`, 1 500 / 5 000):
  - L1: tylko długie, dźwignia do 1:3 lub niższa według surowca;
  - L2: krótkie i pełna dźwignia;
  - ETC i ETF zostają za „Ekspertem Rynków Globalnych”;
  - pozycje sprzed zakupu zostają do zapadalności: można je zamknąć, ale nie przedłużyć.
- **Okno giełdy towarowej** domknięte z istniejących komponentów (projektu czatu designu nie ma, założenie robocze):
  - lista 7 surowców, wykres ceny 104 tyg. z tym samym zakresem w zdaniu, serie z contango/backwardation słowem;
  - depozyt słowem i liczbą, ETC i ETF koszykowy, komunikat, gdy brakuje umiejętności.
  Formularz sprawdzony w przeglądarce (L1: tylko „długa”, dźwignia do 1:3), brak błędów w konsoli. Bez nowych okien modalnych.
- **Budżet państwa:** linie Infrastruktura, Obronność i bezpieczeństwo państwa. **Karta kraju:** bezpieczeństwo słowem i liczbą. Indeks frachtu i przepustowość były już w oknie „Rynek”.
- **Akademia:** 8 lekcji z quizami i przykładami z bieżących danych; w lekcji o kontrakcie zdanie o podatku (decyzja 22). Lekcje odblokowują się przy pierwszym kontrakcie, zakupie ETC albo dużym ruchu cen, frachtu i po embargu.
- **Opisy spółek:** 32 propozycje w `plany/opisy_spolek_pl.md`, jeszcze nie w grze (czekają na akceptację). Test „każda spółka ma wpis” wejdzie razem z nimi. W `initialStocks` bez opisu jest 70 spółek, a „ok. 32” to spółki z decyzją PL.

## Do decyzji użytkownika
1. Exploit: czy próg liczyć na wartości pozycji (zostawić), czy na depozycie (obciąć koszt przechowania gazu).
2. GIG +1,09 pp: przyjąć jako mieszczący się w błędzie (SE 0,57) czy szukać przyczyny.
3. Czas kroku: limit 1 334 ms przekracza już baza, więc albo nowy limit, albo osobna optymalizacja.
4. Opisy spółek: akceptacja tekstów i zakres testu (32 czy wszystkie).
5. Limit zapisu liczony dla średniej: 41/120 gier jest ponad 2,49 mln, tyle samo co w bazie.
