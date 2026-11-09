# Kontrola 0.17.1 „Wielkie testy i balans”

Gałąź `claude/impl-017-s0b-891539`, baza zmiany-AI 7e95dc3 i plan dd5c29d. Nie scalona. Wersja nie dodaje mechanik: mierzy, stroi i naprawia.

## T0. Przygotowanie

**Presety** (`tests/przebiegi.html`, wynik w `s017.t171`):

| Preset | Co robi | Miary |
|---|---|---|
| `bierny`, `wejscia` | gracz nic nie robi | GIG, spółki krajowe i limity, debiuty, koncentracja (sonda P0156) |
| `fundusz-gig` | fundusz równy indeksowi (istniejący) | udziały, zaufanie, napływ |
| `gracz-aktywny` | kupuje, kampanie, IR, VIP (istniejący) | mandaty, lock-up, relacje |
| `dzwignia` | forex 1:10 do limitu 3 × aktywa, akcje w lombardzie | otwarte i odrzucone pozycje, zamknięcia według powodu, najniższa gotówka i aktywa, upadek funduszu |
| `forex-towary` | `kontrakty` (powrót do średniej, krótkie na gazie) i momentum par walutowych 1:3 | zysk na kapitał wobec lokaty |
| `kryzys` | kolejna z 5 linii kryzysu na grę, 2 kraje do zarażania, embargo w 3. roku | GIG co kwartał, linia, szok |
| `kraje-stopniowo` | 10 krajów po kolei od 2. kwartału (istniejący) | zapis, czas kroku, boty zagraniczne |
| `zachety` | górny limit próśb do inwestorów (z 0.17.3) | wpłaty z obietnic jako % aktywów |

**Sondy** dopisane do `PROBE_017` (`s017.tied171`): rozkład relacji z inwestorami (p10, mediana, p90), znajomi, posty, obietnice (oferty, przyjęte, spełnione, wpłaty), kary KNF. Prąd i środowisko: istniejąca sonda E0 (`s017.pow`), wybory: `elections`. Analiza: `porownaj_marze.mjs`, `kontrola_zapis_czas.mjs`, `energia_serie.mjs`.

**Serie** puszczane z `--noui`, najwyżej 4–5 naraz. Czas kroku mierzony osobno, bez `--noui`, po kolei.

**Lista miar** jak w planie („Jak sprawdzimy” i „Nowe systemy w pomiarze”). Karta obserwacji gry ręcznej: `gra_reczna_0.17.1.md`.

## T1. Duża seria (kod 941042a, `--noui`, kolejka po 5 przebiegów)

| Seria | Gry | GIG | Marża końcowa | Zapis | ms/kw. | Błędy |
|---|---|---|---|---|---|---|
| bez gracza, 6,5 roku | 50 | 11,07% (med 10,67%, SE 0,60) | 22,5% | 2,42 mln | 1298 | 0 |
| bez gracza, 20 lat | 20 | **13,33%** (med 13,47%, SE 0,23) | 19,3% | 3,83 mln | 1909 | 0 |
| `fundusz-gig`, 6,5 roku | 20 | 10,96% (med 10,35%) | 22,3% | 2,39 mln | 1235 | 0 |
| `fundusz-gig`, 20 lat | 5 | **13,82%** (med 14,16%) | 20,9% | 3,83 mln | 1919 | 0 |

Czas kroku w tej tabeli liczony przy 5 przebiegach naraz i bez rysowania interfejsu, więc nie jest porównywalny z pomiarami „po kolei”.

**Porównanie z bazami:** GIG 20 lat 13,3–13,8% jak w bazie 0.17 (13,78%) i 0.16.1 (13,1–13,7%), w 0.15.3 było 11,4%. Odchyłka od celu 8–11% jest odziedziczona od 0.15.1 i nie pochodzi z 0.17.x. GIG 6,5 roku 11,1% (baza 0.17: 9,9–10,7%, w granicach szumu σ ≈ 4 pp).

| Miara | Cel | Wynik | Ocena |
|---|---|---|---|
| Niezmienniki, ujemna gotówka, JS, pieniądze znikąd | 0 | 0 we wszystkich seriach T1 | OK |
| GIG 20 lat | mediana 8–11% | 13,5% (bez gracza), 14,2% (`fundusz-gig`) | **POZA**, odziedziczone |
| Premia rynku 20 lat | −3…+3% | −1,6% (bez gracza), −1,1% (`fundusz-gig`) | OK |
| Fundusz = GIG: udziały | ±3%/rok | −5,8%/rok (6,5 roku), −3,4%/rok (20 lat); w ±3% tylko 4/20 i 2/5 gier | **POZA** |
| Fundusz = GIG: zaufanie | 45–55 | mediana 45 (6,5 roku), 46 (20 lat); w 45–55 tylko 5/20 i 2/5 | na granicy |
| Linie kryzysu | 1–2 na 20 lat | 1,1 (bez gracza), 0,4 (`fundusz-gig`, 5 gier) | OK / mało danych |
| Spółki krajowe | ≤ 115, > 125 najwyżej 2 kw. | maks. 89, nigdy > 115 | OK |
| Prąd | | rezerwa na koniec 4–11%, blackout 0,25 na grę, 4 bloki na 6,5 roku i 23 na 20 lat, Narodowy Atom w 22% gier 6,5-letnich i 75% 20-letnich | OK |
| Zanieczyszczenie | cel ok. 55 | 48–52 po 6,5 roku, 61–72 po 20 latach (maks. 99,9) | rośnie dalej po 6,5 roku |
| Smog, protesty | | 0,9 i 0,6 na 6,5 roku; 5,2 i 3,6 na 20 lat | |
| Poziom życia | | p10/med/p90: 57,6 / 60,6 / 63,0 (6,5 roku), 60,5 / 64,7 / 73,2 (20 lat) | |
| Wybory | | Koalicja Rynkowa 64–70% wygranych, reelekcja 13–39% | jak baza 0.17.2 |
| Tied bez gracza | | relacje 0, obietnic 0 (bez gracza nic się nie dzieje) | zgodne z projektem |

- **Gracz bierny** (preset `bierny`): fundusz traci 27% udziałów rocznie i zaufanie spada do 14. Tak ma być: gotówka leży, klienci odchodzą.

## T2. Presety graczy (po 20 gier × 6,5 roku, `kraje-stopniowo` 10)

| Preset | GIG | Zapis | Wynik presetu | Błędy |
|---|---|---|---|---|
| `dzwignia` | 11,6% | 2,51 mln | 4,6 pozycji forex 1:10 na grę, 65 zamknięć przez margin call (3,25 na grę), upadku funduszu 0, aktywa spadają do ok. 1300 PLN | **1 niezmiennik**, poprawiony |
| `forex-towary` | 10,3% | 2,43 mln | momentum forex −4,2%/rok na kapitał, kontrakty: powrót do średniej +7,8%/rok, krótkie na gazie −22%/rok; lokata ok. 5,6%/rok | 0 |
| `kryzys` | 10,9% | 2,43 mln | po 4 gry na linię, embargo w każdej grze, największy spadek GIG średnio −34,7% | 0 |
| `kraje-stopniowo` | 11,3% | **2,59 mln** | 10 krajów po kolei | 0 |
| `wejscia` | 9,2% | 2,43 mln | spółki krajowe maks. 76, debiuty i upadki startupów 21 i 10 na grę | 0 |
| `gracz-aktywny` | 11,5% | 2,43 mln | udziały −5,0%/rok, zaufanie mediana 65 | 0 |
| `zachety` | 10,8% | 2,44 mln | wpłaty z obietnic 3,40% aktywów rocznie (limit 0.17.3: 3,35%), 21,9 oferty na grę | 0 |

- **Pewny zysk:** najlepsza strategia mechaniczna (kontrakty, powrót do średniej) daje 7,8%/rok wobec lokaty 5,6%, czyli +2,2 pp. Cel ≤ lokata + 4–6 pp spełniony.
- **Dźwignia:** preset używa 1:10, a nie 1:3 z celu planu. Przy 1:10 fundusz nie upada, ale traci prawie wszystko przez zamknięcia. Osobnej serii przy 1:3 nie liczyłem.
- **Zapis z 10 krajami:** 2,59 mln znaków, poniżej 3 MB.

### Błąd naprawiony od razu

- **JU klientów ≠ JU funduszu** (`dzwignia`, 1 gra z 20, różnica 0,36 udziału w kw. 27). Przy umorzeniu bez gotówki klient dostawał tylko część pieniędzy, a resztka udziałów poniżej 0,5 znikała razem z nim z listy (`redeemClientUnits`, `player.js`). Teraz klient znika dopiero bez udziałów. Test dodany, 1058/1058.

## T5. Strojenia i poprawki (decyzje z T4)

| # | Zmiana | Commit |
|---|---|---|
| U1–U8 | teksty i spójność widoków (ścieżka do kwitów, kraj z biletem na start, nazwa rynku, MW w sekcji Energia, przecinek dziesiętny, bez paska wiadomości w scence startowej) | 8ea6fb3 |
| U5, U7, U9 | U5 i U7 to nie błędy; U9 to strojenie z propozycją (premia za granicą od bieżącej premii kraju źródłowego zamiast jego celu), do decyzji | 91646cd |
| S1 | **błąd:** pierwszy okres funduszu zaczynał się przy GIG = 0, więc przez cały okres klienci porównywali wynik z zerem (nadwyżka −18…+26%, ucieczka przez bramkę na 2 lata); dotyczyło gracza i zarządców | b92bac0 |
| S1 | tolerancja 1,5 pp nadwyżki dla klientów porównujących się z GIG i SIG20: fundusz jak indeks zostaje za nim o opłatę i gotówkę płynności (ok. 1,4 pp na okres), a przy pogoni za wynikiem 1,5 był stale pod progiem zadowolenia | a4df887 |
| S1 | **błąd:** Program Emerytalny przy długu państwa dawał ujemne granty i zabierał gotówkę funduszom zarządców (ujemna gotówka w długich grach; złapane sondą w T6, 11 z 11 trafień) | a9ebbaa |
| S2 | bez strojenia; punkt kontrolny w planie 0.18 (sekcja 14) | 91646cd |
| S3 | klasa średnia i wyższa średnia mniej za Koalicją Rynkową (36% i 51% zamiast 42% i 57%); kara za kadencje 2 pp po pierwszej i +6 pp za każdą kolejną (było 5 × kadencje) | b2a28d8, kolejne rundy |
| S4 | od 6,5 roku norma emisji rośnie o 1,5% rocznie (technologia), a elastyczność gaśnie do 20 lat z 3,3 do 2,2 | b2a28d8, kolejne rundy |
| S5 | emisyjność chemii według profilu spółki (rafineria 1,0, nawozy 0,9, tworzywa 0,6, farmacja 0,2); KUP na starcie 10–20% emisji kraju, Tauron 35% | b2a28d8 |
| S6 | preset `dzwignia` z parametrem dźwigni i depozytem najwyżej 25% aktywów | b2a28d8, e248452 |

Narzędzia: preset `kampanie` bierze koszt kampanii z pozycji indeksowej (przedtem wszystkie kampanie blokowała „Brak gotówki”), kolejka przebiegów przekazuje `patch`.

## T6. Serie po strojeniu (`--noui`, kolejka po 5)

Pełna seria na a4df887 (18 zadań, 395 gier), potem dwie rundy S3/S4 i seria kontrolna na stanie końcowym (10 gier × 20 lat, 5 × 20 lat `fundusz-gig`, 24 × 6,5 roku, `dzwignia` 1:3 × 20).

| Miara | Cel | T1 | Po strojeniu | Ocena |
|---|---|---|---|---|
| Niezmienniki, ujemna gotówka, JS, pieniądze znikąd | 0 | 0 (T2: 1, naprawione) | 0 w serii kontrolnej; w pełnej serii 4 niezmienniki i 1 ujemna gotówka z Programu Emerytalnego, naprawione | OK |
| GIG 6,5 roku | | 11,07% | 11,01% (50 gier) | bez zmian |
| GIG 20 lat | 8–11% | 13,33% | 12,44% (20 gier) | bliżej celu, nadal POZA (S2 w 0.18) |
| Marże sektorów | 0 ± 0,3 pp | | −0,15 pp (6,5 roku) | OK |
| Fundusz z kampaniami: udziały | ±3%/rok | (kampanie zablokowane) | +3,4…+4,6%/rok (6,5 roku), +3,6%/rok (20 lat) | na granicy, przyjęte (decyzja: cel dotyczy funduszu z kampaniami) |
| Fundusz z kampaniami: zaufanie | 45–55 | | mediana 47–52 | OK |
| Fundusz bez kampanii (`fundusz-gig`) | | −5,8%/rok | −5,4%/rok (6,5 roku), −0,9…−1,8%/rok (20 lat) | kurczy się zgodnie z 0.16.1 |
| Koalicja Rynkowa: wygrane | ok. 45–55% | 64–70% | 59–71% | **POZA** (patrz niżej) |
| Reelekcja | nie niżej niż baza 20% | 13–39% | 19–38% | OK |
| Zanieczyszczenie 6,5 roku | ok. 55 | 48–52 | 50,1 | OK |
| Zanieczyszczenie 20 lat | 55–65, 80+ tylko przy zaniedbaniu | 61–72 | 65,6 i 65,8 (średnie), ale 3/10 gier 93–99 | średnia na granicy, rozrzut duży |
| KrzeUraFos4 | żadna spółka spoza energetyki ponad Tauron na starcie | 46% wobec 35% | 10–22% wobec 35% | OK |
| Dźwignia 1:3 | | (nie mierzone) | 0 upadłości, 0 margin call, ale tylko 4 pozycje w 20 grach | mało danych |
| Zapis | | 2,42 mln (6,5 roku) | 2,43 mln | bez zmian |
| Czas kroku po kolei, bez `--noui`, 6 gier na wersję | bez pogorszenia | 2889 ms/kw. (baza T1) | 2339 ms/kw. | bez pogorszenia (duży rozrzut 1323–3957 ms) |

**Kolejne rundy S3/S4 w T6:**
1. Kara 6 × kadencje i elastyczność do 2,6: reelekcja spadła do 8–15%, zanieczyszczenie po 20 latach 73–98.
2. Kara 4 + 6 i elastyczność do 1,75: reelekcja 10–18%, zanieczyszczenie bez zmian (72,6). Wniosek: przy stałej normie elastyczność nie pomaga, bo emisje przemysłu rosną z realnym przychodem o 40–70% przez 20 lat.
3. Kara 2 + 6, norma +1,5% rocznie od 6,5 roku, elastyczność do 2,2: stan końcowy z tabeli.

**Koalicja Rynkowa:** reelekcja i dominacja się wykluczają. Kara wysoka od pierwszej kadencji obniżyła wygrane Koalicji do 51–57%, ale reelekcja spadła do 8–15%. Kara łagodna dla pierwszej kadencji przywróciła reelekcję i podniosła Koalicję do 59–71%. Do decyzji: dalsze przesunięcie wag klasy średniej (np. 32% zamiast 36%) albo przyjęcie obecnego stanu.

**Zanieczyszczenie:** gry dzielą się na czyste (30–45) i brudne (93–99), środek jest rzadki. Brudne to te, w których rośnie węgiel i przemysł ciężki bez reakcji UEiE. Do sprawdzenia w 0.18 razem z łańcuchami (przemysł zużywa prąd).

## T7. Podsumowanie i decyzja o 0.18

- Testy jednostkowe 1062/1062.
- Spełnione: błędy 0, GIG 6,5 roku, marże, zaufanie, reelekcja, zanieczyszczenie po 6,5 roku i średnio po 20 latach, S5, zapis, czas kroku.
- Na granicy lub poza: GIG 20 lat 12,4% (S2, punkt kontrolny w 0.18), Koalicja Rynkowa 59–71%, rozrzut zanieczyszczenia po 20 latach, udziały funduszu z kampaniami +3,4…+4,6%/rok, dźwignia 1:3 mało danych.
- **Propozycja:** wejść w 0.18. Otwarte punkty (Koalicja Rynkowa, U9, rozrzut zanieczyszczenia) nie blokują łańcuchów i będą mierzone w seriach 0.18.
- Surowe serie: folder notatek `serie_0171` (T1, T2) i kopie w schowku sesji (T6).
