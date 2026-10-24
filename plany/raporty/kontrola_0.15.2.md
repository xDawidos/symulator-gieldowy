# Kontrola 0.15.2 „Kochaj i zarabiaj” (2026-10-24)

- **Kod:** gałąź `claude/funny-villani-16217c` (na 0.15.1 = `53537b7`), część K1–K8 w commicie `75011c5`, część K0/K9 (preset `kampanie`) w tym raporcie. Nowy moduł `campaigns.js`, haki w `player.js`, `ui.js`, `index.html`.
- **Plan:** `plany/plan_0.15.2_pr_inwestorzy.md`.
- **Testy:** `tests/tests.html` — nowa grupa „0.15.2” (31 testów); razem z 0.15.3 **596/596**.
- **Przebiegi** (`tests/przebiegi.html`, ×200): preset `kampanie` (co 4 kw. kampania 1 kw. na 15% NAV, na zmianę bez lock-upu / lock-up 2 lata / lock-up 2 lata + gwarancja / mandat defensywny, na bazie `fundusz-gig`); 4 gry × 6,5 roku. Kontrola braku regresji bez nowych opcji: 4 × 20 lat `fundusz-gig` na kodzie 0.15.1 (`53537b7`) i na obecnym.

## Co zrobiono

| Część | Zakres |
|---|---|
| K0 | preset `kampanie` i pole `camp` w wynikach przebiegów (kampanie, gwarancja, kredyt, mandaty, IR, VIP) |
| K1 | kalendarz „Rok 3 · kw. 2 · tydz. 4” w pasku (na telefonie „R3 · K2 · T4”, w dymku data rozpoczęcia gry); `formatGameDate`, `formatQuarterDate` dla wszystkich terminów nowych mechanik |
| K2 | kampanie emisyjne: 1 tydzień / 2 tygodnie / 1 kwartał, cel 5–30% NAV (≤ 5% + 20% × zaufanie), koszt 0,2% celu + 0,5% zebranej kwoty, popyt wg wyniku vs GIG (±30% za ±10 pp) i wskaźnika strachu i chciwości, limit 2 emisji na okres (kampania liczy się jako jedna), raport w poczcie, pasek newsów, hasło Akademii |
| K3 | transze klienta z lock-upem 0–3 lata: umorzenie omija zablokowane udziały, sprzedaż na rynku wtórnym zostaje, mnożniki popytu wg typu, mail kwartał przed końcem lock-upu, niezadowoleni w lock-upie wystawiają udziały i obniżają zaufanie (−0,5, ≤ −2 na tydzień) |
| K4 | gwarancja kapitału (lock-up ≥ 1 rok, udział w zysku 70%, ≤ 30% udziałów), dopłata gotówka → wymuszona sprzedaż → kredyt płynnościowy (stopa bazowa + 3 pp, ≤ 20% aktywów, spłata 10%/tydz. gdy gotówka > 5% aktywów, zaufanie −5, mail KNF), NAV pomniejszony o kredyt, zobowiązanie w oknie rynku udziałów |
| K5 | mandaty (sektor/dywidendowy/defensywny/wzrostowy/bezpieczny), pomiar co tydzień, 2 kwartały naruszenia = zaufanie −10 raz + wyjście klientów także z lock-upu (przez bramkę), nowa przyczyna „📜 złamany mandat”, zmiana mandatu −5 |
| K6 | 3 grupy inwestorów, nastrój (−50…+50, ważony udziałami, ze słowem), analityk IR L1–L3 (0,05 / 0,10 / 0,15% aktywów na kwartał, min. 200 / 400 / 600 zł), misje grup i przyczyny z `getClientSatisfactionDrift` |
| K7 | VIP: oferta (10%/kw. przy zaufaniu ≥ 50, aktywa ≥ 50 000 zł, ≤ 2 na rok), 3 argumenty sprawdzane danymi, wzór szansy 25% + 35% + 30% + zaufanie/10 pp, wpłata 5–15% z lock-upem 1–2 lata, wcześniejsze wyjście przy wyniku słabszym od GIG o > 10 pp, przerwa 4 kw. po porażce |
| K8 | 8 haseł Akademii, 5 osiągnięć, nagłówki w pasku newsów |

## Odstępstwa od planu

1. **Rozliczenie gwarancji na końcu lock-upu**, nie przy umorzeniu: transza z gwarancją jest rozliczana automatycznie, gdy lock-up się kończy (zysk: klientowi zostaje 70%, resztę funduszowi przez umorzenie części udziałów klienta; strata: dopłata gotówką do ceny wejścia). Ekonomicznie to samo, ale prostsze i bez wiecznej gwarancji.
2. **Nazwa pola:** kampania emisyjna to `playerFund.subscription` (pole `playerFund.campaign` już zajmuje kampania marketingowa).
3. **Transze tylko dla udziałów specjalnych:** zwykłe udziały (emisja ciągła, stare) nie mają transzy; wolne udziały = udziały klienta − zablokowane. Transze są przycinane przy każdej zmianie liczby udziałów klienta.
4. **Popyt kampanii skalowany wielkością funduszu** (plan nie przewidywał): obecny klient dokupuje większą z kwot: 30% typowej wpłaty albo 12% swojej pozycji; nowi klienci wpłacają × √(aktywa / 30 000). Bez tego w dużym funduszu kampanie nic by nie zbierały.
5. **Zakładka „Relacje”** to karty w oknie rynku udziałów (pod opłatą i kampanią marketingową), nie osobna zakładka panelu funduszu; wygląd do dopracowania przez czat designu (zlecenie w planie).
6. **Mail VIP** używa istniejącego wzorca maili z akcją (3 przyciski argumentów), druga ścieżka: te same przyciski w karcie „Inwestorzy VIP”.
7. **Osiągnięcie „Słowo dotrzymane”** wymaga mandatu bez naruszenia przez ≥ 4 kwartały; „Dyplomata rynkowy” sprawdza nastroje 3 grup przy rozliczeniu misji IR.

## Wyniki (4 gry × 6,5 roku, preset `kampanie`; 4 × 20 lat A/B)

| Miara | Cel | Wynik | Stan |
|---|---|---|---|
| Kampania: zebrano / cel | 40–90% | średnio 79% z 19 kampanii (gry: 100%, 55%, 79%, 92%; pojedyncze kampanie 17–100%; 10 z 19 zebrało 100%) | ✅ (na górnej granicy) |
| 1 tydzień < 2 tygodnie < 1 kwartał | rosnąco | test jednostkowy (25 ziaren, fundusz 20× większy od popytu): rośnie | ✅ (w przebiegach tylko kampanie 1-kwartałowe) |
| Gwarancja: dopłaty | ≤ 2% NAV rocznie | 26 rozliczeń transz, w jednej grze 15 dopłat łącznie 361 zł (fundusz ok. 20 000 zł), w pozostałych 0; żadnej niepełnej | ✅ |
| Kredyt płynnościowy | ≤ 20% gier z gwarancjami | 0 z 4 gier | ✅ |
| Lock-up 2 lata: odpływ w bessie ≥ 30% mniejszy | — | **niezmierzone** (brak bessy w próbie z lock-upem; blokada umorzeń sprawdzona testem) | ⚠️ |
| Udział w zysku 70% | 30% zysku zostaje w funduszu | test jednostkowy (umorzone udziały = 30% zysku / NAV) | ✅ |
| Mandaty: naruszenia ≤ 30% | ≤ 30% | **preset `kampanie` trzyma fundusz w wirtualnym indeksie (brak akcji), więc mandat „defensywny” jest łamany w 100% przypadków** — test ścieżki, nie kalibracja | ⚠️ |
| Koszt IR | 0,2–0,6% aktywów rocznie | 0,05 / 0,10 / 0,15% × 4 = 0,2 / 0,4 / 0,6% (test) | ✅ |
| Misje, VIP (sukces 20–40% / 50–80%) | — | wzór VIP sprawdzony testem (10 000 losowań ±2 pp); preset nie używa IR ani VIP-ów — **niezmierzone w przebiegach** | ⚠️ |
| Niezmienniki, ujemna gotówka, wyjątki JS, ostrzeżenia pieniędzy | 0 | 0 / 0 / 0 / 0 | ✅ |
| Zapis i wczytanie | bez strat | 4/4 | ✅ |
| Czas kroku | +≤ 2% | 1,4–1,9 s/kw. (bez presetu) vs 2,1–3,7 s przy `fundusz-gig` jak w 0.15.1 (2,4–3,5) — bez zmiany | ✅ |

### Kontrola braku regresji (`fundusz-gig`, 4 × 20 lat, bez nowych opcji, linie 0.15.3 wyłączone)

| | Udziały po 20 latach (start 1000) | Zaufanie | Średnia premia rynku | GIG CAGR |
|---|---|---|---|---|
| 0.15.1 (`53537b7`), 3 gry | 1708 / 6269 / 6845 | 50 / 49 / 40 | −4,2 / −3,6 / −3,4% | 14,3 / 12,2 / 11,7% |
| 0.15.2 + 0.15.3 | 7635 / 20265 / 7370 / 628 | 54 / 47 / 47 / 60 | −1,1 / −2,8 / −3,8 / −3,6% | 11,0 / 11,2 / 12,0 / 13,7% |

**Wniosek: nowe opcje nie zmieniają gry gracza, który z nich nie korzysta** (te same rzędy wielkości, niezmienniki 0). ⚠️ **Odziedziczony problem, nie z 0.15.2:** w grach 20-letnich przy `fundusz-gig` liczba udziałów rośnie o kilkaset do kilkunastu tysięcy procent (+9…+10%/rok), a cel „±3%/rok” obowiązuje od 0.13.1. Tak samo jest na `53537b7`. Do osobnej decyzji (kalibracja napływu organicznego i dopłat w długiej grze).

## Otwarte sprawy

1. **Brak pomiaru bessy z lock-upem i misji IR w przebiegach** — zrobić presetem `gracz-aktywny` z kupowaniem akcji i kampaniami w Hossie i w Bessie.
2. **Mandaty:** kalibracja progów (naruszenia ≤ 30%) wymaga gracza, który naprawdę kupuje akcje spółek defensywnych/wzrostowych.
3. **Wygląd:** karty „Kampania emisyjna”, „Relacje inwestorskie”, „Inwestorzy VIP” użyły istniejących komponentów; zlecenie dla czatu designu pozostaje (osobna zakładka „Relacje”, podgląd popytu słowem).
4. **Odziedziczone:** dryf liczby udziałów w 20 latach (wyżej).
