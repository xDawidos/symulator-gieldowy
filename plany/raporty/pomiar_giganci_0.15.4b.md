# Pomiar 0.15.4b „Giganci na starcie” (G0–G3, 2026-10-25)

Przebiegi ×200, 20 lat, kod 0.15.4 + parametr `giants=g,s` (mnożnik kapitalizacji gigantów ≥ 1 mld zł, mnożnik 10 największych spółek poniżej 1 mld zł). Mediany; „ORT” = Orzeł Telekom w górnej 3 na końcu.

| Wariant | Gry | ORT w górnej 3 | Najczęstsi w górnej 3 | GIG CAGR | Marża | Udział ORT na końcu | Kurs 1–3000 zł | Niezmienniki / wyjątki |
|---|---|---|---|---|---|---|---|---|
| Baza 0.15.3 | 11 | 8 (73%) | ORT 8, BOR 7, BEW 6 | 11,45% | 18,8% | 19% | 86% | 0 / 0 |
| 0.15.4 (giganci ×1, drugi szczebel ×1) | 10 | 6 (60%) | ORT 6, BOR 4, BEW 4 | 13,9% | 18,0% | 15% | 99,4% | 0 / 0 |
| C: giganci ×0,6, drugi szczebel ×2,5 | 12 | **11 (92%)** | ORT 10, BOR 5, CTX 4, BEW 4 | 14,6% | 18,2% | 15% | 99,4% | 0 / 0 |
| mocniejszy: ×0,35 / ×6 | 9 | **7 (78%)** | ORT 7, BEW 4, CTX 4, BOR 3 | 15,7% | 18,3% | 18% | 99,4% | 0 / 0 |

## Wniosek
- Zmiana wielkości startowej **nie zmniejsza** dominacji Orła Telekom (92% i 78% gier w górnej 3 wobec 60% bez zmian) i dodatkowo podnosi GIG (+0,7…+1,8 pp ponad 0.15.4). Cel „≤ 40% gier” i cel awaryjny „żaden gigant > 50% gier” **nie zostały osiągnięte** w żadnym wariancie.
- Przyczyna nie leży więc w wielkości startowej, tylko w **własnościach ORT** (sektor Technologia: wysoka beta i wzrost, koncern z kooperacjami i spółkami zależnymi, losowanie Jednorożca wśród spółek technologicznych z badaniami), które utrzymują go na czele niezależnie od startu.
- Decyzja: **domyślne mnożniki zostają 1 / 1** (bez zmiany startu); parametry i parametr przebiegów `giants=g,s` pozostają do dalszych pomiarów. Losowa wielkość startowa gigantów z 0.15.4 zostaje.

## Pominięte i problemy
1. Cel awaryjny (> 50% gier) nieosiągnięty; wymaga diagnozy per spółka (czy usunięcie premii sektora Technologia, kooperacji koncernu albo wagi Jednorożca z listy kandydatów zmienia wynik) — do zrobienia w 0.16.1 G0 razem z kalibracją GIG.
2. Próby 9–12 gier na wariant (plan: 30) — za mało na wniosek o GIG ±1 pp; wniosek o ORT jest jednak jednoznaczny (kierunek przeciwny do zamierzonego).
3. G3 (zmiana danych `initialStocks`) pominięte: wariant nie spełnił celu, więc nie zmieniano ceny ani liczby akcji w danych.
