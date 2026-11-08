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
