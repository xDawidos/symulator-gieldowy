# Kontrola 0.18.4 — Audyt, oceny i IPO

Gałąź `zmiany-AI`, commit części: 10a2d12 (A1–A4). Seria kontrolna A5: migawka kodu po 10a2d12 (przed poprawką REIT D46 i przed częściami UI). Baza: seria M6 (D41).

## Części

| Część | Co zrobione | Decyzja |
|---|---|---|
| A1 | filie banków zagranicznych, gdy banków ubywa poniżej startu − 1 (Z12); audytorzy jako usługa B2B (6 firm) | D42 |
| A2 | ocena AAA–D z fundamentów, szum audytora, przekupstwo i jego ujawnienie, bramka awansu (Złota ≥ BBB, Platynowa ≥ A), publiczne tylko ≥ A | D43 |
| A3 | IPO: audyt, opiekun emisji z prowizją, dyskonto, „pop” w hossie, wycofanie w bessie | D44 |
| A4 | sufity 130/180, historia liczby spółek z wykresem i CSV w Państwo → Rynki (Z13), ocena w kafelku karty spółki | D45 |

Testy po A4: 1094/1094 (dziś 1100/1100 z częściami UI).

## Bramka (A5 wobec M6)

| Miara | Cel | Wynik | Ocena |
|---|---|---|---|
| GIG 6,5 roku | ±1 pp wobec M6 | 10,54% → 10,54% (−0,01 pp, SE 1,21) | OK |
| Średnia odchyłek marż sektorów | 0 ± 0,3 pp | +0,48 pp (SE 0,23) wobec M6; **wobec G9 ok. +0,05 pp** | szum M6 (zob. kontrola 0.18.3) |
| Debiuty startupów | ±20% wobec bazy | 6,5 roku: 21,6 → 21,0 (−3%); 20 lat: 87,3 → 97,1 (+11%) | OK |
| Upadki | ±20% | 6,5 roku: 4,7 → 4,8; 20 lat: 11,9 → 13,5 (+13%) | OK |
| Liczba banków po 23 latach | ≥ start − 1 | 0 z 20 gier poniżej; średnio 4,0 → 4,2 (banki w sondzie) | OK |
| Zapis | ≤ +5% | 6,5 roku −2,1%; 20 lat **+7,7%** (spółek 146 → 159, sufity 130/180) | 20 lat ponad (D54) |
| Czas kroku z UI (po kolei) | — | G9 1580 → M6 1494 → A5 1488 ms/kw. | OK |
| Niezmienniki, błędy JS, ujemna gotówka, po wczytaniu | 0 | 0 | OK |
| GIG 20 lat | (G8, U1) | 12,43% (SE 0,28) | jak wcześniej, U1 |

## Makiety

- Wykres liczby spółek i eksport CSV (Państwo → Rynki) z komponentów `bank-card` i `ch-legend`. **Czeka na zgodność z makietą.**
- Ocena w kafelku karty spółki: ikona `audyt` + stopień; znacznik „przekupiony audyt”. Makieta 15 (ocena, wymogi) — zgodność do sprawdzenia przy przeglądzie designu.
- Zapisy gracza w IPO z redukcją: niezrobione (D44, U5).

## Co nie zostało sprawdzone

- Statystyka ocen i IPO (liczba audytów, przekupstw, ujawnień, wycofanych emisji) — sonda serii ich nie zapisuje; działanie potwierdzają testy A1–A4.
- Gra ręczna (tryb autonomiczny).
