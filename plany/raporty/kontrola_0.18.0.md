# Kontrola 0.18.0 „Porządki przed grafem”

Gałąź `zmiany-AI`, od 0882e11 (R0) do b837851 (R3–R6). Baza: kod jak d0f193e (plan po 0616037). Praca autonomiczna, decyzje D1–D10 w `decyzje_0.18.md`.

## Części

| Część | Commit | Co zrobione | Test |
|---|---|---|---|
| R0 | 0882e11 | spis podwójnego kodu, `spis_kodu_pl_obce_0.18.0.md` (16 pozycji, decyzja D1) | — |
| R1 | ef1dfec | Z3: szuflada i wykres spółki obcej bez dostępu do poziomu jak u krajowej, handel zablokowany z powodem | test szuflady |
| R2 | f7babc1 | Z5: kwity GDR usunięte (`gdr.js`, zakładka, hasło Akademii, testy); rejestr emitentów i zdarzenie gigantów w `countries.js`; zapis v24 | zapis v23 z kwitami wczytuje się bez błędu, kwity przepadają; `grep -i gdr` w kodzie gry: tylko odczyt starego klucza zapisu |
| R3 | b837851 | Z1, Z2: Platynowa od 800 zł, wspólny `getPriceTierKey` | progi; poziom obcej = poziom z ceny w PLN |
| R4 | b837851 | Z6: cecha narodowa + pula ogólna | 1 cecha narodowa u każdego prezesa obcej spółki (bez państwowych), polski bez cudzych |
| R5 | b837851 | Z7, Z8: 8 i 7 wstępów, 3 rodzaje odpowiedzi botów bez powtórek | 50 postów: ≥ 4 wstępy; 200 postów: bez powtórek pod postem |
| R6 | b837851 | Z9: pełna lista Spółek Skarbu Państwa, odświeżenie po nacjonalizacji i prywatyzacji | nowa spółka widoczna od razu, także spoza 8 pierwszych |

Testy: **1064/1064**.

## Seria kontrolna (R7)

Bez gracza, 25 gier × 6,5 roku na ramię, `--noui`, po 5 naraz. Baza: kod 0616037 (ta sama sonda).

| Miara | Baza | 0.18.0 | Różnica | Cel | Ocena |
|---|---|---|---|---|---|
| GIG 6,5 roku | 10,76% (SE 0,75) | 10,23% (SE 0,81) | −0,53 pp (SE 1,11) | ±0,5 pp | w szumie (D5) |
| Średnia odchyłek marż sektorów (17) | — | — | +0,02 pp (SE 0,28) | ±0,5 pp | OK |
| Marża końcowa | 22,98% | 22,72% | −0,26 pp (SE 0,54) | — | OK |
| Niezmienniki, ujemna gotówka, błędy JS, po wczytaniu | 0 | 0 | — | 0 | OK |
| Zapis | 2,402 mln | 2,447 mln | +1,8% (SE ok. 2%) | bez wzrostu | OK: sekcja `countries` −17 tys. znaków (kwity), reszta to liczba spółek w grach (131 vs 128 obiektów) |
| Czas kroku po kolei z UI (3 gry) | 1375 ms/kw. | 1384 ms/kw. | +0,6% (SE ok. 1,6%) | bez wzrostu | OK |
| `kraje-stopniowo` (5 gier) | — | GIG 12,2%, 0 błędów, zapis 2,52 mln | — | — | OK |

Dodatkowo: przejęcia gigantów 0,84 → 0,68 na grę (SE 0,17 i 0,15), linie kryzysu 0,12 → 0,16 na 6,5 roku.

**Rozkład poziomów (R3, 30 gier, koniec gry):** spółki krajowe JUNK 9,8%, BRONZE 33,1%, SILVER 31,6%, GOLD 17,8%, **PLATINUM 5,6%**, RUBY 0,4%, EMERALD 0,9%, DIAMOND 0,9%. Przed zmianą PLATINUM 1–2% (0–3 spółki). Spółki obce giełd połączonych: JUNK 6,3%, BRONZE 21,5%, SILVER 51,7%, GOLD 16,1%, EMERALD 4,4% (wcześniej żadna ponad Złotą).

**Bramka 0.18.0: zaliczona** (GIG w szumie, marże, 0 błędów, zapis i krok bez istotnego wzrostu).

## Makiety

- Ekran 23 (wykres spółki bez posiadania akcji) i 24 (Kantory24 bez kwitów): użyte istniejące komponenty (szuflada, pasek zakładek). Bez osobnego przeglądu zrzutów z makietą; czeka na zgodność z makietą.

## Co nie zostało sprawdzone

- Z2 nie odtworzone w dosłownym brzmieniu (D7).
- Gra ręczna i zrzuty ekranu: nie robione (tryb autonomiczny, weryfikacja testami i seriami).
- Pomiar czasu kroku na 3 grach zamiast 6 (dwa ramiona po kolei).
