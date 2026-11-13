# Kontrola końcowa 0.18 — Łańcuchy produkcyjne (W4)

Gałąź `zmiany-AI`. Kod końcowy: c7cdc02 (po 0.18.0–0.18.4, makiecie 18, W1, W2a i poprawce kary audytu). Baza: P0 (`baza_0.18.md`, migawka sprzed 0.18.1).

Serie końcowe (bez UI, po 5 gier naraz):
- W4: migawka 5bf80eb, 50 gier × 6,5 roku, 20 × 20 lat, 20 × kraje-stopniowo;
- W4b: migawka c7cdc02, 50 gier × 6,5 roku;
- bisekcja bx1/bx2: kod W4 bez sondy W0 albo bez poprawki REIT, po 25 gier.

Pomiar z UI (po kolei): 4 gry × 27 kw.

## Wersje 0.18

| Wersja | Kontrola | Wynik w skrócie |
|---|---|---|
| 0.18.0 Porządki | `kontrola_0.18.0.md` | zaliczona |
| 0.18.1 Pilotaż | `kontrola_0.18.1.md` | zaliczona poza zyskującymi w linii supply (D25) i częstością linii (D33) |
| 0.18.2 Pełny graf | `kontrola_0.18.2.md` | marże −0,03 pp, GIG +0,37 pp; GIG 20 lat poza celem (U1), Mennica wyłączona (D47) |
| 0.18.3 Mechaniki | `kontrola_0.18.3.md` | marże −0,02 pp (50 gier); zanieczyszczenie poza celem już w bazie (U7) |
| 0.18.4 Audyt i IPO | `kontrola_0.18.4.md` | GIG ±0,0 pp, debiuty w ±20%, banki ≥ start − 1; zapis 20 lat +7,7% (D54) |
| 0.18.5 Wydajność | ten raport | W0 profil, W1 rysowanie, W2a indeksy; W2 LOD i W3 Worker pominięte (D52, D53) |
| UI | D34, D49, D50 | rama okna Państwa (makieta 19), ekran główny (makieta 18, 6 części) |

## Bramka końcowa 0.18.5

| Miara | Cel | Wynik | Ocena |
|---|---|---|---|
| Czas kroku z UI | ≤ budżet z W0 i nie więcej niż P0 | P0 1392–1618, P6 1601, G9 1580, M6 1494, A5 1488 → **W4 780, W4b 704–745 ms/kw.** | OK (ok. 2× szybciej; pomiary W4 w nocy, bez obciążenia, czyli w innych warunkach niż P0; różnica i tak dużo większa niż rozrzut warunków) |
| Czas kroku bez UI (w seriach) | — | P0 1318 → W4b 845 ms/kw. (−36%) | OK |
| Zapis | ≤ +10% wobec P0 | 6,5 roku +3,6% (W4b); 20 lat +5,3% (3,91 → 4,11 mln znaków); kraje-stopniowo +8,4% | OK |
| Średnia odchyłek marż sektorów | 0 ± 0,3 pp | W4b (kod końcowy, 50 gier): **−0,11 pp (SE 0,18)**; W4 + W4b (100 gier): −0,34 pp (SE 0,15) | OK na kodzie końcowym, łącznie na granicy (D56) |
| GIG 6,5 roku | ±1 pp wobec P0 (11,11%) | W4b 10,54% (−0,57 pp, SE 0,82); W4 + W4b 10,12% (−0,99 pp) | OK |
| GIG 20 lat | 8–11% (G8) | P0 12,81% → W4 11,88% (SE 0,34) | poza celem, U1 |
| Bilans dóbr w normie (b 0,8–1,25) | ≥ 90% | 97,1%; ceny w 0,7–1,4: 99,6% | OK |
| Linie kryzysu (20 lat) | 1–2 | 0,75 → 0,90 | poniżej, U2 |
| Zanieczyszczenie po 20 latach | 55–65 | G9 72,1 → W4 74,9 | poza celem, U7 |
| REIT-y (CAGR 20 lat) | typy w zbliżonym przedziale | mixed 6,9%, office 6,5%, hospitality 5,4%, **health 1,0%** (przed D46: −0,6%) | health dalej najsłabszy (D55) |
| Niezmienniki, błędy JS, po wczytaniu | 0 | 0 | OK |
| Ujemna gotówka | 0 | W4: 4 przypadki (kara za przekupiony audyt, A2) → poprawka c7cdc02; W4b: 0 | OK po poprawce |
| `kraje-stopniowo` | — | GIG 12,85% (P0 10,46%), 0 błędów | OK |

## Profil kwartału (W0, D51)

Z UI (W4, 4 gry × 27 kw., zegar okna nadrzędnego): `runStockTick` 661 ms/kw., w tym ceny 182, rysowanie tabeli 88, boty 74; raporty finansowe 40, przegląd poziomów giełd 25; **łańcuchy 3 ms/kw. (0,4%), surowce ok. 1 ms/kw.**

**Budżet dla 0.19+:** 900 ms/kw. z UI w warunkach pomiaru W4 (po kolei, maszyna bez obciążenia), czyli W4 + 15%. Każda wersja mierzy P0 i nową wersję po kolei, w tych samych warunkach.

## Bisekcja spadku marż w pierwszej partii W4

W4 wobec M6: −0,67 pp (SE 0,17). Sprawdzone:
- bez sondy W0 (bx1): −0,12 pp;
- bez poprawki REIT (bx2): −0,15 pp;
- W2a daje te same wartości GIG, SIG20 i SIG40 co stara wersja (300 ticków na tym samym stanie);
- kod końcowy W4b: −0,11 pp wobec P0.

Wniosek: pierwsza partia W4 była niskim losowaniem, a nie skutkiem zmiany (D56).

## Co nie zostało sprawdzone

- Pomiar czasu P0/P6 z UI w tych samych warunkach co W4: migawki sprzed 0.18.5 nie kończą przebiegu z UI w obecnym środowisku („brak wyniku”), przyczyny nie ustaliłem.
- Gra ręczna (tryb autonomiczny).
