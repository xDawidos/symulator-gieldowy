# Kontrola 0.18.6 — Porządki (O9)

Gałąź `zmiany-AI`. Plan: `plany/plan_0.18.6_porzadki_dluga_gra.md` (sekcja 0.18.6). Decyzje: `raporty/decyzje_0.18.6.md` (E1–E9, U9). Baza: W4b (kod końcowy 0.18, c7cdc02) i W4 (20 lat).

Seria końcowa o45c (migawka po 395cdc6, kod O0–O8 bez 0.18.7): 25 gier × 6,5 roku i 20 gier × 20 lat, bez UI. Testy: 1111/1111 (po 0.18.7 E2–E3).

## Części

| Część | Commity | Co zrobione |
|---|---|---|
| O0 | e39a9cb | spis: debug, puste kontenery, formatowanie z klasyfikacją (`raporty/spis_0.18.6.md`, `design/narzedzia/spis_formatow.mjs` z `--kontrola`) |
| O1 | 6ffe35f | `debug.js`; blok narzędzi budowany w JS tylko przy włączonym trybie |
| O2 | 33d3514 | `renderEmptyState` w 4 wariantach; 14 okien w świeżej grze bez pustych kontenerów |
| O3 | 0d6c4e7, e40b83c, aa30a9f | `formatters.js`; 0 `toFixed` i 0 „zł” w tekstach dla gracza (`spis_formatow.mjs --kontrola`) |
| O4 | 381d24f, c65a2a0 | spokój 10 kw., łagodniejszy wymóg fazy, strojenie szansy i zamiany krachu (E5) |
| O5 | 4a66234, 395cdc6 | presja ekologiczna z kartą w Państwie i sprzężeniami (E6) |
| O6 | bfa64fa, afa07c5, 69107ef, c908146 | Bank, Korporacja, Internet w ramie `.wn`; pasek telefonu w 1 wierszu, szersza kolumna nazwy |
| O7 | cb90121 | zapisy funduszu na IPO z redukcją, blokadą i zwrotem |
| O8 | a5a1ee2 | etykiety pól, akcent fazy (L4), nowy bezpiecznik, bez ukrytego wiersza konta prywatnego |

## Bramka 0.18.6

| Miara | Cel | Wynik | Ocena |
|---|---|---|---|
| Średnia odchyłek marż sektorów (25 gier) | 0 ± 0,3 pp | −0,17 pp (SE 0,22) | OK |
| GIG 6,5 roku | — | 10,54% → 10,67% (+0,13 pp) | OK |
| GIG 20 lat | 10–13% (U1) | 11,96% (SE 0,39) | OK |
| Linie kryzysu (O4) | 1–2 na 20 lat | 0,90 → 1,25 | OK |
| Zanieczyszczenie po 20 latach (O5) | 55–65 | 74,9 (W4) → 67,5 | poza celem → U9 |
| Gry „brudne” ≥ 90 | ≤ 10% | 7/20 | poza celem → U9 |
| Zieloni w grach z zanieczyszczeniem > 60 | ≥ 50% | 4/11 | poza celem → U9 |
| Debiuty (O7) | ±20% | 6,5 roku −15,6%, 20 lat −6,9% | OK |
| Zapis | bez wzrostu | −1,3% (6,5 roku), −0,8% (20 lat) | OK |
| Czas kroku bez UI | — | 845 → 741 ms/kw. | OK |
| Neutralność O0–O3 (25 gier) | marże i GIG w szumie | marże +0,03 pp, GIG −1,32 pp (SE 0,95), zapis +1,0% | OK |
| Niezmienniki, błędy JS, ujemna gotówka, po wczytaniu | 0 | 0 | OK |

## Zrzuty i sprawdzenia w podglądzie

Sprawdzone w grze (podgląd, 390 / 1366 / 1440 px): Ustawienia z debug i bez, stany puste w Banku i Budownictwie, Bank, Korporacja i Internet w ramie `.wn` (stała wysokość przy zmianie zakładki), pasek telefonu w jednym wierszu, kolumna nazwy przy 1440 px, karta presji ekologicznej, chip fazy przy L4, baner bezpiecznika (wywołany narzędziem debug).

## Co nie zostało sprawdzone

- „Pop” pierwszego dnia po IPO (bramka O7) — sonda go nie zapisuje; debiuty w normie.
- Formularz zapisu na IPO tylko w testach i kodzie; w serii bez UI gracz nie składa zapisów.
- Pomiar czasu z UI (po kolei) — tylko bez UI.
- Gra ręczna (tryb autonomiczny).
