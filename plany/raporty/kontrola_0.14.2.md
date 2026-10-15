# Kontrola 0.14.2 i atrybucja GIG/marży (krok 0 przed 0.14 T4)

- **Data:** 2026-10-15
- **Stan kodu:** `zmiany-AI` po 0.14.2 (`7769e9e`), presety atrybucji `7b20472`.
- **Metoda:** przebiegi ×200 po 6,5 roku gry (27 kw.), `tests/przebiegi.html`. Wyłączanie części presetami w ramce (bez cofania historii):
  - `bez-p6`: dawny katalog inwestycji i technologii (wszystkie sektory spółki);
  - `bez-p9`: dawne kotwice wyceny (bank z zysku po 4 kw. księgi, typy specjalne bez kotwicy, strata = 0,7 × wartość księgowa) i bez rewizji > 10×;
  - `bez-p9-banki`, `bez-p9-strata`: tylko jedna z tych kotwic po staremu;
  - `bez-p10`: bez kredytu przed wydatkiem.
- **GIG:** roczna stopa z kwartału 1 → 26; ± to błąd standardowy średniej. **Marża:** EBITDA / przychody w kw. 26.

## Wyniki

| Wariant | Przebiegi | GIG %/rok | Marża % | Ujemna gotówka | Kwartały z ostrzeżeniem bezpiecznika |
|---|---|---|---|---|---|
| przed 0.14.2 (`a31cccb`) | 10 | 17,3 ± 0,9 | 24,4 ± 1,4 | 149 | 220 |
| obecny | 20 | 19,4 ± 0,9 | 26,5 ± 0,7 | 0 | 0 |
| bez P6 | 10 | 23,3 ± 1,3 | 26,5 ± 1,2 | 0 | 0 |
| bez P9 | 10 | 17,4 ± 1,1 | 25,8 ± 0,8 | 0 | 138 |
| bez P9 — tylko banki po staremu | 10 | 21,4 ± 1,0 | 26,1 ± 0,8 | 0 | 0 |
| bez P9 — tylko spółki ze stratą po staremu | 10 | 19,8 ± 1,3 | 26,7 ± 0,6 | 0 | 0 |
| bez P10 | 10 | 18,7 ± 0,9 | 27,3 ± 0,7 | 126 | 0 |

„Przed 0.14.2” pochodzi z kontroli końcowej 0.14.2 (wtedy bezpiecznik nie istniał w kodzie bazowym; liczba ostrzeżeń to pomiar sondy na kodzie bazowym).

## Wnioski

- **Marża:** wzrost +2,0 pp na 20 przebiegach (ok. 1,3σ; wcześniejsze +3,4 pp to 10 przebiegów z jedną serią wysoko). Żadna część nie zmienia marży o więcej niż ok. 1 pp — brak kandydata do korekty.
- **GIG:** wyłączenie całego P9 obniża GIG o ok. 2 pp (ok. 1,4σ) — punktowo ponad próg 1,5 pp, ale:
  - osobno ani kotwica banków, ani spółek ze stratą GIG nie obniża (21,4 i 19,8%);
  - rozrzut średnich wariantów (17–23%) jest tego samego rzędu co błąd przy 10 przebiegach (bez P6 daje +3,8 pp w górę, czego mechanizm nie tłumaczy).
- **Decyzja użytkownika (2026-10-15):** bez korekty; sprawa przechodzi do 0.15 H0 — powtórzyć na ≥ 20 przebiegach na wariant przed strojeniem rynku.
- P10 i P9 robią swoje: bez P10 wraca ujemna gotówka (126 przypadków), bez P9 wracają ostrzeżenia bezpiecznika (138 kwartałów).
