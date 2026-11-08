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
