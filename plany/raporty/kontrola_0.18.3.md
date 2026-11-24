# Kontrola 0.18.3 — Mechaniki grafu

Gałąź `zmiany-AI`, commity: bf75b0f (U19, rama okna Państwa) i 85a5758 (M1–M5). Seria kontrolna M6 (+ M6b): migawka kodu po 85a5758. Baza: G9 (D35).

## Części

| Część | Co zrobione | Decyzja |
|---|---|---|
| U19 | rama okna Państwa i szyna zakładek z grupami według makiety 19 (przed kolejnymi zakładkami) | D34 |
| M1 | magazyny: zaplecze kraju mnoży cel zapasu i pojemność; Magazyny zarabiają na zapasie | D36 |
| M2 | luksus i herbata: popyt dóbr L z elastycznością na koniunkturę, herbata Z/L zależnie od kraju | D37 |
| M3 | substytucja z poziomu badań (stal → lżejsze materiały, półprodukty w chemii), najwyżej 5 pp na rok | D38 |
| M4 | emisyjność podsektora z receptury, ocena ESG A/B/C | D39 |
| M5 | mapa szlaków (widok „Szlaki” w Państwo → Łańcuchy): mapa SVG i tabela, stan słowem | D40 |

## Bramka (M6 + M6b wobec G9)

| Miara | Cel | Wynik | Ocena |
|---|---|---|---|
| Średnia odchyłek marż sektorów | 0 ± 0,3 pp | M6 (25 gier): −0,43 pp (SE 0,22); M6 + M6b (50 gier): **−0,02 pp (SE 0,19)** | OK (pierwsza próbka to szum) |
| GIG 6,5 roku | ±1 pp wobec G9 | 10,82% → 11,22% (+0,40 pp, SE 0,92) | OK |
| GIG 20 lat | (G8, U1) | 12,56% → 11,81% (SE 0,42) | bliżej celu 8–11%, dalej U1 |
| Zanieczyszczenie po 20 latach | średnio 55–65, ESG nie rozregulowuje | G9 72,1 → M6 73,1 | ESG neutralne (+1); **poziom poza celem już w bazie** → U7 |
| Bilans dóbr w normie (b 0,8–1,25) | ≥ 90% | 96,3% obserwacji; ceny w 0,7–1,4: 99,2% | OK |
| Czas kroku z UI (po kolei) | ≤ +10% | G9 1580 → M6 1494 ms/kw. | OK |
| Zapis | — | +0,3% (50 gier) | OK |
| Linie kryzysu (20 lat) | (U2) | 0,95 → 0,65 | jak wcześniej, U2 |
| Niezmienniki, błędy JS, ujemna gotówka, po wczytaniu | 0 | 0 | OK |

## Makiety

- Mapa szlaków: makieta 16 (klasy `rt-*`); kraje „wkrótce” przygaszone dodał design później (5ff7405) — zgodność do sprawdzenia.
- Ekran ESG (lista designu nr 15): nie ma makiety; ocena A/B/C tylko w danych i karcie. **Czeka na makietę.**
- Rama okna Państwa: według makiety 19 (zaakceptowana).

## Co nie zostało sprawdzone

- Gra ręczna (tryb autonomiczny).
- Poziom zanieczyszczenia 72–73 wobec celu 55–65 — strojenie energii (0.17.2) poza zakresem 0.18, U7.
