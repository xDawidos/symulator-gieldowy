# Kontrola 0.18.2 — Pełny graf

Gałąź `zmiany-AI`, commit części: 2943fb8 (G1–G7), poprawka REIT po G9 (D46). Seria kontrolna G9: migawka kodu po 2943fb8.

## Części

| Część | Co zrobione | Decyzja |
|---|---|---|
| G1 | 32 aktywne dobra, 9 łańcuchów, srebro i siarka jako współprodukty, kawa jako 9. kontrakt (zapis v26) | D27 |
| G2–G3 | podsektory Leśnictwo, Papiernie, Przemysł lotniczy, Baterie; Drzewpol (DRZ) i Ogniwa Polskie (OGP); SRE, DMPC, ABS, LAE przypisane | D26 |
| G4 | prąd jako dobro zewnętrzne; blok jądrowy w 3 etapach (badania, konsorcjum, budowa) | D28, D29 |
| G5 | obronność i zdrowie przez receptury | D30 |
| G6 | REIT zdrowie (Z11), typ mieszkaniowy, podwykonawcy zależni od obłożenia | D31, D46 |
| G7 | handel jako dystrybucja; Mennica jako eksperyment (wyłączona) | D32, D47 |

Testy: **1094/1094** (po poprawce REIT).

## Bramka (G9, seria kontrolna wobec P6)

| Miara | Cel | Wynik | Ocena |
|---|---|---|---|
| Średnia odchyłek marż sektorów | 0 ± 0,3 pp | −0,03 pp (SE 0,23) | OK |
| GIG 6,5 roku | ±1 pp wobec P6 | 10,82% (+0,37 pp, SE 1,08) | OK |
| GIG 20 lat (G8) | 8–11% | 12,56% (SE 0,37) | **poza celem** → U1 (D48) |
| Bilans dóbr w normie (b 0,8–1,25) | ≥ 95% | 98,6% obserwacji | OK |
| Mennica włączona (g9m) wobec wyłączonej | GIG ≤ 0,5 pp, marże ±0,3 pp | GIG −0,03 pp, marże −0,47 pp (SE 0,25) | marże poza → wyłączona (D47) |
| REIT-y, CAGR 20 lat | typy w zbliżonym przedziale | mixed 7,85%, office 7,24%, hospitality 5,18%, **health −0,56%** | health odstaje → poprawka D46 |
| Czas kroku z UI (po kolei, te same warunki) | ≤ +15% wobec P0 | P6 1601 → G9 1580 ms/kw. | OK |
| Zapis | ≤ +4% | +2,4% (wobec P6); pomiar z UI −0,8% | OK |
| Niezmienniki, błędy JS, po wczytaniu | 0 | 0 | OK |
| `kraje-stopniowo` (10 gier) | — | GIG 9,81%, 0 błędów | OK |

## Makiety

- Nowe dobra i łańcuchy w Państwo → Łańcuchy: według `13_lancuch_018.html` (te same komponenty co w pilotażu).
- Blok jądrowy (etapy, konsorcjum): w istniejącej liście projektów okna energii (`energy_ui.js`). **Czeka na zgodność z makietą.**
- Kawa na giełdzie towarowej: wiersz jak pozostałe kontrakty.

## Co nie zostało sprawdzone

- Poprawka REIT zdrowie (D46) bez osobnej serii; wynik zmierzy seria M6 (`p018.reit`).
- Gra ręczna (tryb autonomiczny).
- G8 (GIG 20 lat) — do decyzji użytkownika, U1.
