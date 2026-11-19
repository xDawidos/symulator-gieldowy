# Diagnoza długiej gry (0.18.8 D0)

Przebieg dymny 4 gier × 50 lat (200 kw., ×200, bez UI): 2 × `gracz-aktywny`, 2 × `fundusz-gig`. Migawka kodu po 0.18.7 E5 (14acc05). Sonda `PROBE_LONG` w `tests/przebiegi.html` (pole `plong`): co 5 lat rozmiar zapisu według sekcji, pola spółek w pamięci, sterta JS, fundusz wobec rynku. Wszystkie 4 gry bez błędów JS, niezmienników i zawieszeń; GIG 50 lat 11,9–13,6% rocznie.

## 1. Pamięć i zapis

Średnie z 4 gier (zapis = `JSON.stringify(buildSaveSnapshot())`, bez kompresji; sterta = `performance.memory`, mocno szumi przez GC).

| Rok | Zapis (kB) | Sterta (MB) | Spółki | Zapis na wykresie |
|---|---|---|---|---|
| 0 | 316 | 141 | 104 | ▏ |
| 5 | 2 250 | 114 | 123 | ████████▌ |
| 10 | 2 979 | 139 | 143 | ███████████▎ |
| 15 | 3 548 | 95 | 163 | █████████████▍ |
| 20 | 4 128 | 118 | 185 | ███████████████▋ |
| 25 | 4 500 | 141 | 197 | █████████████████ |
| 30 | 4 711 | 130 | 201 | █████████████████▊ |
| 35 | 4 952 | 158 | 207 | ██████████████████▊ |
| 40 | 5 079 | 166 | 209 | ███████████████████▏ |
| 45 | 5 210 | 132 | 212 | ███████████████████▋ |
| 50 | 5 279 | 185 | 212 | ████████████████████ |

- **Zapis po 50 latach = 1,28 × zapisu po 20 latach** (bramka D1: ≤ 1,5). Przyrost wyhamowuje razem z liczbą spółek (sufit spółek krajowych P1).
- **`stocks` to ok. 83% zapisu** i rośnie tylko z liczbą spółek: 20,6 kB na spółkę po 20 i po 50 latach, czyli pola spółek mają już limity (świece, historia linii, wyniki, dzienniki).
- Rosną liniowo, ale mało (łącznie ok. 6 kB na rok): `countries` (+2,8 kB/rok, nowi emitenci; historia kursów ma limit), `genealogyLog` (+1,7 kB/rok, limit 600 wpisów już jest), `specialProjects.completed` (+0,9 kB/rok; zbudowane projekty działają dalej, nie przycinam), `aiCompetitors`, `paymentTotals`, `usedCompanyNames` (potrzebne do unikalności nazw).
- **CV gracza nie miało limitu** → D1: 40 ostatnich wpisów + liczniki według typu.
- W pamięci (poza zapisem) największe są `lineHistory` (ok. 9 MB tekstu JSON na 210 spółek, 43 kB na spółkę) i świece (1,5 MB); oba z limitem, rosną z liczbą spółek.
- Sterta 95–185 MB bez trendu wzrostowego między 20 a 50 latem (szum GC ±80 MB) — brak oznak wycieku.

**Wniosek:** dodatkowe limity poza CV nie są potrzebne do bramki. Przy 100 latach zapis wzrósłby o ok. 0,3 MB ponad poziom z 50 lat (stała liczba spółek + ok. 6 kB/rok). Ok. 5 MB surowego JSON nie zbliża się do limitu: gra zapisuje do IndexedDB z kompresją (`saveGameState`, `SAVE_IDB_RAW_LIMIT`), a zapasowo do `localStorage` w lz16.

## 2. Kapitał gracza a płynność

| Rok | Aktywa funduszu (PLN) | Kapitalizacja rynku (mld PLN) | Fundusz / rynek (ppm) | Czynnik pojemności | Średnia spółka (mln PLN) |
|---|---|---|---|---|---|
| 0 | 10 000 | 20,1 | 0,5 | 1,00 | 195 |
| 10 | 17 837 | 38,9 | 0,5 | 1,00 | 274 |
| 20 | 47 857 | 52,5 | 1,0 | 0,95 | 284 |
| 30 | 216 126 | 102,1 | 3,5 | 0,48 | 507 |
| 40 | 571 360 | 195,1 | 5,5 | 0,28 | 936 |
| 50 | 2 028 670 | 325,6 | 8,3 | 0,23 | 1 543 |

- Fundusz botów po 50 latach to **8 ppm rynku** i ok. 0,13% średniej spółki. Do obrotu dnia i free floatu nawet się nie zbliża. Presety trzymają wirtualną pozycję indeksową, więc zleceń nie składają; liczby z rachunku.
- **Wpływ zlecenia na kurs ma pułap 2% na transakcję** (`applyTradeImpact`: 0,5 × akcje / free float, max 2%). Gracz, który skupi kapitał w jednej małej spółce, może kupić np. połowę free floatu za cenę przesuniętą tylko o 2%. To jedyny realny problem skali — dotyczy gracza, nie botów.
- **Pułap napływu (`getFundCapacityFactor`) liczy się od stałej kwoty 60 000 PLN.** Kapitalizacja rynku rośnie 16 × w 50 lat (inflacja i wzrost), więc ten sam nominalny pułap z czasem hamuje fundusz coraz mocniej względem rynku (czynnik 0,2 od ok. 45. roku).

## 3. Propozycje do decyzji użytkownika (D2)

| # | Mechanizm | Skutek | Ryzyko |
|---|---|---|---|
| a | Bez zmian | gracz może tanio skupić dużą część małej spółki | — |
| b | **Poślizg bez pułapu 2%**: wpływ rośnie z udziałem zlecenia w free floacie (np. 0,5 × udział, max 15%), szacunek w formularzu zlecenia (ekran 7 listy designu) | duże zlecenie w małej spółce jest drogie; małe bez zmian | zmiana dla gracza handlującego dużymi pakietami; trzeba makiety |
| c | Limit udziału w obrocie dnia (rozbicie zlecenia na kilka dni) | realizm, ale nowe zlecenia odroczone | duża zmiana handlu i UI |
| d | **Pułap napływu względem kapitalizacji rynku** zamiast stałych 60 000 PLN | fundusz rośnie w długiej grze proporcjonalnie do rynku | szybszy wzrost funduszu po 30. roku (bez wpływu na 6,5 roku) |

Rekomendacja: **b + d** (b zamyka jedyną dziurę skali, d usuwa ukryte zaostrzanie w długiej grze). Obie zmieniają balans gracza, więc czekają na decyzję (U13 w `decyzje_0.18.8.md`).
