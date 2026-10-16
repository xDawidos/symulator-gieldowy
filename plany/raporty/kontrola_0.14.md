# Kontrola końcowa 0.14 „Struktura spółek” (po T6)

- **Data:** 2026-10-16
- **Stan kodu:** `ad1c213` (gałąź `claude/busy-burnell-81b619`, po scaleniu `zmiany-AI` `a41960f`).
- **Metoda:** `tests/przebiegi.html`, ×200, 6,5 roku gry (26 kw.). Do tego 1 przebieg 20-letni (80 kw.). Odniesienia z tą samą sondą: stan sprzed T1 (`a9fe91d`) i `8fdbf63` (po T5).
- **Uwaga do porównania czasu kroku:** serie liczyły się w 3–4 kartach naraz, więc ms/kw. nie są porównywalne między sobą.

## Wyniki (10 przebiegów na wariant)

| Miara | Przed T1 (`a9fe91d`) | Po T5 (`8fdbf63`) | **0.14 (`ad1c213`)** | Cel z planu |
|---|---|---|---|---|
| GIG %/rok | 18,2 ± 1,2 | 20,2 ± 1,2 | **20,2 ± 0,7** | ±2 pp vs 0.13 → +2,0 pp (na granicy) |
| Marża % | 26,3 ± 1,2 | 27,5 ± 1,0 | **28,2** | — (+1,9 pp vs przed T1) |
| Ujemna gotówka (przypadki) | 50 | 0 | **0** | 0 |
| Niezmienniki / bezpiecznik / błędy JS | 0 / 0 / 0 | 0 / 0 / 0 | **0 / 0 / 0** | 0 |
| Spółki krajowe / łącznie (maks.) | 81 / 103 | 88 / 112 | **88 / 112** | ≤ 115 / ≤ 150 |
| Zapis (MB, śr.) | 2,03 | 2,12 | **2,16** | ≤ +3% na część (vs `8fdbf63` +1,7%) |
| Maile na przebieg | 597 | 620 | 634 | — |

## 0.14 w liczbach („Jak sprawdzimy”)

| Miara | Wynik | Cel |
|---|---|---|
| Wydzielenia (spin-off + carve-out) | 2,8 na przebieg | 2–5 ✅ |
| Matka + córka 2 kw. po wydzieleniu ponad GIG | wymuszone: +5,0% ± 2,6 (n = 71, `5b19fd5`); w tej serii naturalne: +0,5% ± 3,5 (n = 25) | +3–8% ⚠️ (naturalne w szumie, bo od 0.14 T6 córki są też sprzedawane i wchłaniane) |
| Rozszerzenia / pivoty rocznie | 3,6 / 1,4 | 2–4 / 1–2 ✅ |
| Spółki z ≥ 2 segmentami | 22% | 25–45% ⚠️ (T3: 28%; wchłonięcia i wydzielenia przesuwają segmenty) |
| Koncerny | śr. z ostatnich 2 lat 2,8, na koniec 3,4 | 3–6 (decyzja 14) ⚠️ na granicy |
| Kooperacje aktywne | 6,9 | 4–12 ✅ |
| Nowe córki koncernów | 3,6 | 1–3 ⚠️ trochę za dużo |
| Wchłonięcia | 1,9 | 1–2 ✅ |
| Usamodzielnienia | 1,5 | 1–2 ✅ |
| Sprzedaże pakietu kontrolnego | 1,1 | 0–2 ✅ |
| Pożyczki wewnątrzgrupowe | 0,4 | — |

## Przebieg 20-letni (80 kw.)

GIG 22,3%/rok, marża 22,1%. Niezmienniki 0, ujemna gotówka 0, bezpiecznik 0, przycięcia „duchów” 0, błędy 0. Spółki krajowe ≤ 110, łącznie ≤ 146. Koncerny na koniec 5, kooperacje 16. Przez 20 lat: nowe córki 21, wchłonięcia 20, usamodzielnienia 7, sprzedaże pakietów 7, wydzielenia 13. ⚠️ **Zapis 3,26 MB** (cel z planu 0.16: < 3 MB przy kilku krajach) — do sprawdzenia przed 0.16 G2.

## Strojenie w T5/T6 (decyzja 14 i cele T6)

- Koncern: próg górne 10% → 15% (po T5: 3,0) → 20% (po T6 bez tego 2,1–2,5, bo usamodzielnienia i sprzedaże zabierają koncernom córki). Histereza: status zostaje do górnych 30%.
- Sam próg kapitalizacji nie podnosi stabilnie liczby koncernów. Ograniczeniem jest warunek struktury (≥ 3 segmenty albo ≥ 2 córki), a więcej koncernów oznacza więcej zakładanych córek, wchłonięć i usamodzielnień. **Do decyzji:** zostawić (na koniec 3,4, z 2 lat 2,8) albo zmienić warunek struktury (np. ≥ 2 segmenty niepowiązane).
- T6: usamodzielnienie 2,5% → 1%/kw. na córkę; sprzedaż pakietu 1,5% → 1%; nowa córka koncernu 4% → 12%/kw. (do 3 córek); dokupywanie akcji córki od 65% udziału (60% = córki z giełd elitarnych — przy 60% wchłonięć było 4,9), szansa 60%/kw., krok 5%; wchłonięcie przy ≥ 90% z szansą 60%/kw.

## Odbiega od planu

- Znaczek koncernu to 🏢 (🏛️ = Skarb Państwa; decyzja użytkownika).
- Próg koncernu górne 20% zamiast 10% (decyzja 14, dwa kroki).
- Kooperację między swoimi spółkami gracz proponuje, gdy kontroluje jedną stronę i ma ≥ 20% drugiej (plan: „między swoimi spółkami”), a nie tylko w koncernie.
- Czerwona flaga matka–córka w T6 dotyczy pożyczki wewnątrzgrupowej z oprocentowaniem odbiegającym od rynku o > 10% oraz (z T5) kooperacji przy wspólnym właścicielu z nierównymi udziałami. Innych transakcji matka–córka po cenach nierynkowych w grze nie ma.
- Wspólna polityka kadrowa: przełącznik gracza na karcie „Grupa” (boty z niej nie korzystają).
- Wypłata dywidendy przez córkę nadal idzie w całości do matki (stary kod `payDividendToShareholders`; mniejszościowi nie dostają dywidendy). Tego nie ruszano — kandydat na poprawkę.
