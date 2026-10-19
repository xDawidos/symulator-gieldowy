# Raport z pomiaru GIG (0.15 H0): skąd bierze się 18–22% rocznie

- **Data pomiaru:** 2026-10-19
- **Wersja:** 0.15 H0 (krok pomiaru i sond cieni przed strojeniem w H1)
- **Stan kodu:** `zmiany-AI` (`71ce45d`), narzędzia pomiarowe: `tests/przebiegi.html`, `run_przebiegi.mjs`, `analyze_h0.mjs`
- **Metoda:** automatyczne przebiegi symulacyjne w ramce z wirtualnym zegarem (niezależnym od dławienia timerów przeglądarki), próby po 20 przebiegów na wariant, długość 6,5 roku gry (27 kwartałów).

---

## 1. Główne wyniki i tabela porównawcza

Próba 20 przebiegów po 6,5 roku gry (27 kwartałów). Wszystkie stopy roczne podane w %/rok z błędem standardowym średniej ($\pm \sigma / \sqrt{N}$):

| Wariant | Przebiegi | GIG %/rok | GIG Cap10 %/rok | Buy & Hold %/rok | Wzrost EPS (p50) | Zmiana C/Z (P/E) | Marża konc. (mediana) |
|---|---|---|---|---|---|---|---|
| **Bazowy (`sim_bazowy`)** | 20 | **20,7 ± 0,7** | 22,5 ± 0,7 | 27,8 ± 2,4 | **17,8 ± 0,7** | −3,3 ± 0,9 | 19,8% → 22,9% (+3,1 pp) |
| **Zdarzenia symetryczne (`h1`)** | 20 | **21,1 ± 0,6** | 23,4 ± 0,6 | 30,1 ± 2,2 | 17,5 ± 0,8 | −3,0 ± 0,9 | 19,6% → 22,7% (+3,1 pp) |
| **Bez inflacji przychodów (`h3`)** | 20 | **20,4 ± 0,9** | 22,7 ± 1,1 | 28,6 ± 2,8 | 17,7 ± 0,6 | −3,3 ± 0,9 | 20,2% → 22,9% (+2,7 pp) |
| **Inwestycje połowa (`h6`)** | 20 | **20,8 ± 1,1** | 22,6 ± 1,1 | 22,6 ± 1,2 | 18,7 ± 0,5 | −4,3 ± 0,9 | 19,8% → 23,8% (+4,0 pp) |
| **Stała marża (`h7`)** | 20 | **17,7 ± 1,1** | 18,9 ± 1,0 | 23,2 ± 2,2 | **14,5 ± 0,5** | −3,1 ± 0,7 | 18,0% → 20,4% (+2,4 pp) |
| **Fundusz = GIG** | 20 | 20,1 ± 0,7 | 22,5 ± 0,8 | 28,7 ± 2,3 | 18,4 ± 0,6 | −3,5 ± 0,6 | 20,0% → 22,6% (+2,6 pp) |
| **CEO (`sim_ceo`)** | 20 | 20,1 ± 0,9 | 22,4 ± 0,8 | 31,7 ± 3,1 | 18,3 ± 0,8 | −4,0 ± 0,9 | 20,1% → 23,3% (+3,2 pp) |

---

## 2. Testowanie hipotez z planu 0.15

### Hipoteza h1: Asymetria zdarzeń rynkowych (ODRZUCONA ❌)
- **Wynik:** wariant `zdarzenia-symetryczne` (bias = 0,5 we wszystkich fazach) dał GIG **21,1 ± 0,6%** wobec **20,7 ± 0,7%** w bazie ($\Delta = +0,4$ pp, $p > 0,6$).
- **Wniosek:** Zdarzenia rynkowe i spółkowe nie odpowiadają za nadmierny wzrost rynku. Ich rozkład w długim terminie jest neutralny.

### Hipoteza h3: Przenoszenie inflacji do bazy przychodów (ODRZUCONA ❌)
- **Wynik:** wyzerowanie parametru `INFLATION_PASS_THROUGH = 0` dało GIG **20,4 ± 0,9%** ($\Delta = -0,3$ pp).
- **Wniosek:** Przenoszenie inflacji w przychodach odpowiada za mniej niż 0,3 pp rocznego wzrostu indeksu.

### Hipoteza h6: Premia z inwestycji operacyjnych spółek (ODRZUCONA ❌)
- **Wynik:** obcięcie zwrotu z inwestycji katalogowych o 50% (`incomeBonus` / ROI) dało GIG **20,8 ± 1,1%** ($\Delta = +0,1$ pp).
- **Wniosek:** Zyski z inwestycji operacyjnych stanowią jedynie drobny ułamek wyniku operacyjnego spółek dojrzałych.

### Hipoteza h7: Dryf marży i brak presji konkurencji (POTWIERDZONA ✅)
- **Wynik:** podwojenie presji konkurencyjnej (`getCrowdingPressure`) obniżyło wzrost GIG z **20,7% do 17,7%** ($\Delta = -3,0$ pp, $p < 0,03$) oraz wzrost zysku na akcję EPS z **17,8% do 14,5%** ($\Delta = -3,3$ pp).
- **Wniosek:** Ekspansja marży w czasie gry (+3,1 pp w 6,5 roku) to jedno z kluczowych źródeł nienaturalnego wzrostu zysków.

---

## 3. Tabela dekompozycji wzrostu GIG (w pp/rok)

Dekompozycja rocznej stopy wzrostu GIG (20,7%/rok):

| Składnik | Wpływ (pp/rok) | Mechanizm w kodzie |
|---|---|---|
| **Wzrost zysku na akcję EPS (mediana p50)** | **+17,8 pp** | Model fundamentalny (`computeQuarterResults`): baza przychodów rośnie z `SECTOR_GROWTH_FACTOR = 0.8` i wag sektorowych (Technologia 8%, Gaming 7%, Medycyna 5%) z mnożnikiem dźwigni operacyjnej. |
| *— w tym trend przychodów sektora* | *+14,5 pp* | `growth = profile.growth / 4 * SECTOR_GROWTH_FACTOR` |
| *— w tym ekspansja marży (dryf)* | *+3,3 pp* | Marża mediana rośnie z 19,8% do 22,9% przez brak zbieżności marż w dół. |
| **Kompresja mnożnika C/Z (P/E)** | **−3,3 pp** | Mnożnik P/E rynku spada z 15,2 do 12,5 (ceny nie nadążają za eksplozją EPS, co chroni rynek przed jeszcze większym wzrostem). |
| **Premia kapitalizacyjna (duże vs małe)** | **+1,8 pp** | GIG ważony kapitalizacją (`cap10`) rośnie o 22,5%/rok (+1,8 pp szybciej niż równoważony GIG). |
| **Skład indeksu (debiuty vs ocalali)** | **−0,8 pp** | Spółki ocalałe z kwartału 1 (`gigSurvivors`) rosną o 21,5%/rok, a dołączające później startupy i debiuty lekko rozwadniają indeks. |
| **Premia przeważania (Buy & Hold vs GIG)** | **+7,1 pp** | Portfel pasywny „Kup i trzymaj” bez rebalansowania rośnie aż o 27,8%/rok (zwycięzcy uciekają w górę i dominują portfel). |

> **Podsumowanie atrybucji:** Rynek w grze **nie rośnie z powodu bańki wyceny (C/Z spada)**, ani ze zdarzeń losowych, lecz z **nadmiernego organicznego wzrostu zysków spółek (EPS +17,8%/rok)** napędzanego parametrem `SECTOR_GROWTH_FACTOR = 0.8` oraz brakiem stabilizacji marży operacyjnej.

---

## 4. Pomiary poboczne (Fundusz gracza i CEO)

### Fundusz gracza śledzący GIG (`fundusz-gig`)
- **Zaufanie botów:** średnio **50,5 ± 1,1 pkt** (idealnie trafia w punkt równowagi 50 pkt).
- **Dynamika Jednostek Uczestnictwa (JU):** odpływ netto na poziomie **−5,8% ± 3,0%/rok** (wynika z tego, że część typów botów ma próg wejścia `trustNeed` = 55 pkt; do skorygowania w H1c do przedziału $\pm 3\%$).

### Portfel prywatny CEO (`sim_ceo`)
- **Udział premii za cele korporacji (`Premia za cel`):**
  - Średnia: **35,9%** całkowitych wpływów do portfela prywatnego CEO.
  - Zakres: od **0,0% do 84,7%**.
  - **Cel z planu (R5):** $\le 25\%$ (obecny poziom 35,9% wymaga lekkiej redukcji w H1).

---

## 5. Rekomendacja pokręteł do wdrożenia w H1 (Maksymalnie 3 pokrętła)

Na podstawie twardych danych empirycznych, aby sprowadzić GIG do docelowego przedziału **8–10% rocznie**, rekomendujemy następujące 3 pokrętła w etapie H1:

1. **Pokrętło 1 (Główne – Trend przychodów `SECTOR_GROWTH_FACTOR`):**
   - Obniżenie `SECTOR_GROWTH_FACTOR` z obecnego `0.8` do **`0.40 – 0.45`**.
   - Spowoduje to spadek bazowego wzrostu przychodów o ok. 6–7 pp rocznie, co bezpośrednio zredukuje wzrost EPS z 17,8% do ok. 10–11%/rok.

2. **Pokrętło 2 (Stabilizacja marż – Presja rynkowa):**
   - Wprowadzenie umiarkowanej presji konkurencyjnej na marże (zgodnie z testem `marza-stala`), aby marże dojrzałych spółek nie dryfowały w górę o +3–4 pp, lecz oscylowały wokół mediany sektora ($\pm 0,5$ pp).
   - Odejmuje kolejne ~2–3 pp od wzrostu EPS.

3. **Pokrętło 3 (Indeks ważony kapitalizacją z limitem 10% – `gigCap10`):**
   - Zastąpienie prostego łańcuchowego indeksu równej wagi indeksem ważonym kapitalizacją z limitem 10% (zgodnie z decyzją gracza).
   - Odzwierciedla realny rynek giełdowy (jak WIG20/S&P500), uodparnia indeks na skrajne wahania mikro-spółek.

---

## 6. Ograniczenie „naturalnych jednorożców” przed H1b

W obecnym stanie gry (przed wdrożeniem H1b):
- **p10 wzrostu EPS:** +3,6%/rok
- **p50 (mediana) wzrostu EPS:** +17,8%/rok
- **p90 wzrostu EPS:** +31,0%/rok
- Spółki rosnące > 25%/rok stanowiły aż **22% wszystkich spółek** na rynku! Każda z nich była „naturalnym jednorożcem” bez dedykowanej mechaniki.
- Po wdrożeniu Pokrętła 1 i 2 rynek uspokoi się do 8–10%, a jednorożce (H1b: 2–3 gwarantowane na grę) staną się unikalnymi, ekscytującymi perełkami, które gracz musi świadomie wyłowić z tłumu.
