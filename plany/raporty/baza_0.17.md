# Baza 0.17 (S0): pomiar po 0.16 (2026-10-31)

Kod = `zmiany-AI` w commicie `992019c` (0.16.1–0.16.12 + scenka 0.16.10; testy 905/905, zapis v21), **kodu gry nie zmieniano**. Przebiegi ×200 (`tests/przebiegi.html`, 27 kw. = 6,5 roku), preset `fundusz-gig` (PL) i `start-DE|US|CZ`, harness jak w `baza_0.16.md`. Narzędzie agregujące: `plany/design/narzedzia/baza_serie.mjs` (nowe, osobny commit); skrót wyników: `plany/raporty/baza_0.17/skrot.json`. Surowe JSON-y (15 plików, ~15 MB) są w notatkach sesji (`serie_baza017/`), nie w repozytorium.

**Przebieg pomiaru:** 6 równoległych instancji Edge (osobne `SIM_PORT`/`SIM_CDP`, start co 8 s — przy jednoczesnym starcie wszystkich sześciu strona przebiegów zawisła na „Start…”, więc to warunek), limit 60 min na serię. PL 6×8 gier; potem naraz DE 3×8, US 6, CZ 6, PL 20 lat 3×4 (8 instancji); na końcu seria sekwencyjna 4 gry PL na jednej instancji (czas kroku). Razem 100 gier, **1 przerwana** (DE: `TypeError: Failed to fetch` przy ładowaniu ramki — przerwanie połączenia lokalnego serwera przy 8 instancjach, nie błąd gry; DE ma 23 gry, nie 24). Zawieszeń 0, wyjątków JS 0, niezmienników 0, ujemnej gotówki 0, złych cen 0.

## Wyniki (agregacja: średnia ± odch.; w nawiasie błąd średniej SE i przedział 95%)

| Seria | gier | GIG CAGR | mediana GIG | Marża końcowa | Zapis (znaki) | gz (B) | ms/kw. |
|---|---|---|---|---|---|---|---|
| **PL**, 27 kw. | **48** | **9,89% ± 3,89** (SE 0,56; **±1,15 pp**) | 9,85% | 22,2% ± 2,5 (SE 0,37) | 2,327 mln ± 153 tys. | 509 tys. | 2142 (6 równolegle) |
| **DE**, 27 kw. | **23** | 9,68% ± 4,12 (SE 0,86; ±1,80) | 9,54% | 19,5% | 1,883 mln | 419 tys. | 2328 (8 równolegle) |
| USA, 27 kw. (orient.) | 6 | 13,46% ± 3,28 (SE 1,34; ±3,4) | 13,67% | 20,0% | 1,781 mln | 397 tys. | 2279 |
| Czechy, 27 kw. (orient.) | 6 | 11,02% ± 2,58 (SE 1,05; ±2,7) | 11,19% | 21,3% | 1,649 mln | 371 tys. | 2084 |
| **PL 20 lat** (81 kw.) | **12** | **13,78% ± 1,67** (SE 0,48; ±1,06) | 13,78% | 21,2% | 3,719 mln | 825 tys. | 3046 (8 równolegle) |
| PL sekwencyjnie (1 instancja) | 4 | 13,5% ± 5,2 (za mało na GIG) | 12,2% | 22,5% | 2,284 mln | 500 tys. | **1213** (1055–1381) |

Uwagi: USA i Czechy mają uproszczoną mechanikę (nie baza docelowa). GIG sekwencyjnej serii jest tylko dla porządku (n = 4). Zapis „znaki” = JSON przed kompresją; kontrola zapisu: `lossless` i `loadOk` 100% gier, mieści się w limicie lokalnym (`localFits`) we wszystkich.

### Pozostałe metryki na grę (średnia ± odch.; w nawiasie przedział 95% średniej)

| Metryka | PL (48) | DE (23) | USA (6) | CZ (6) | PL 20 lat (12) |
|---|---|---|---|---|---|
| Spółki krajowe po 27 kw. (limit giełdy) | 57,5 ± 4,9 (±1,4) | 40,1 ± 4,7 | 38,3 | 33,8 | 57,8 ± 7,4 |
| Spółki obce na liście po 27 kw. | 100,7 ± 38 (±11) | 136,6 ± 37 | 140 | 132 | 265,8 ± 12 |
| Wszystkie spółki rynku macierzystego (z startupami) | 89,3 ± 8,3 | 62,1 ± 8,0 | 60,3 | 53,2 | 135,9 ± 12 |
| Kapitalizacja spółki: mediana rynku / największa (jedn. gry) | 326 tys. / 47 mln | 374 tys. / 29 mln | 253 tys. / 42 mln | 167 tys. / 42 mln | 78 tys. / 15,8 mln |
| Wartość funduszu (udziały × NAV, jedn. gry) | 10 835 ± 4043 (±1196) | 9 395 ± 5651 | 13 926 | 8 879 | 53 412 ± 26 329 |
| Zaufanie do funduszu (koniec) | 51,6 ± 9,3 | 52,0 | 57,8 | 59,0 | 54,7 |
| Upadłości (krajowe + obce) | 1,98 ± 1,55 (±0,46) | 1,46 | 1,17 | 1,67 | 8,0 ± 2,2 |
| Debiuty startupów udane / nieudane | 23,2 ± 5,3 / 11,8 | 22,2 / 13,6 | 24,5 / 12,5 | 20,0 / 14,2 | 87,4 / 44,4 |
| Przejęcia w procesie M&A (rynek krajowy, rozstrzygnięte) | 4,77 ± 2,20 (±0,65) | 4,39 | 5,17 | 4,33 | 17,9 ± 4,4 |
| Przejęcia obcych (`executeIssuerTakeover`, D3) | 0,38 ± 0,53 | 0,65 | 0,67 | 0,67 | 3,75 |
| Przejęcia giganta / GDR giganta | 0,81 / 1,19 | 0,61 / 1,35 | 0,83 / 1,50 | 0,33 / 1,83 | 4,50 / 2,00 |
| Linie kryzysu na grę (kolejność: ile gier miało linię) | 0,17 (8/48 gier: pandemia 2, bankowa 2, naftowa 3, internetowa 1) | 0,04 (bankowa 1) | 0 | 0,17 (pandemia 1) | 0,50 (pandemia 3, naftowa 2, internetowa 1) |
| Połączenia giełd / „intl” / przejęcie naszej giełdy (wpisy) | 1,33 / 0,75 / 0,50 | 1,50 / 0,54 / 0,38 | 1,17 / 1,17 / 0,33 | 1,50 / 0,67 / 0,33 | 2,17 / 1,75 / 1,42 |
| Kraje otwarte na koniec (razem ze startowym) | 6,2 ± 2,1 | 5,9 | 7,5 | 7,5 | 10,0 |
| Kraj startowy | brak (PL bez kraju w q0) | DE 23/23 | US 6/6 | CZ 6/6 | — |
| Zapis: budowa (ms) / kompresja lz (znaki) | 186 / 345 tys. | 176 / 293 tys. | 186 / 280 tys. | 154 / 264 tys. | 188 / 529 tys. |

Definicje i luki: „spółki krajowe/wszystkie” z `p0156.last` (stan po 27 kw.), „obce” z `foreign.listed`; „przejęcia w procesie M&A” = `ma.resolved` (spółki krajowe z krajowymi), przejęcia obcych = `foreign.stats.takeovers` (D3, w tym obca↔krajowa — sonda nie rozróżnia udziału spółki krajowej, więc „z udziałem krajowych / bez” **nie da się podać**; do dodania w S0). **Łącznej kapitalizacji rynku sonda nie zapisuje** (tylko kwantyle rozkładu): podane są mediana i maksimum spółki; w S0 dodać sumę. Wartość funduszu liczona jako udziały × NAV końca gry.

### Gry z przejęciem naszej giełdy przez obcą i bez

| Seria | z przejęciem (n) | GIG | marża | bez przejęcia (n) | GIG | marża | różnica GIG |
|---|---|---|---|---|---|---|---|
| PL | 19 | 9,15% ± 3,41 | 22,2% | 29 | 10,37% ± 4,16 | 22,2% | −1,2 pp (SE 1,15 — **nieistotna**) |
| DE | 8 | 9,34% ± 4,30 | 18,5% | 15 | 9,86% ± 4,16 | 20,0% | −0,5 pp (SE 1,8) |
| PL 20 lat | 10 | 13,71% ± 1,82 | 21,0% | 2 | 14,15% | 22,2% | n za małe |

Przejęcie naszej giełdy zdarzyło się w 40% gier PL. Różnica GIG ma znak dodatni dla „bez” we wszystkich seriach, ale w żadnej nie wychodzi poza błąd.

## Porównanie z wcześniejszymi bazami (PL, `fundusz-gig` 27 kw. ×200, o ile nie zaznaczono)

| Baza / kontrola | gier | GIG CAGR | Marża | Zapis (znaki) | ms/kw.* |
|---|---|---|---|---|---|
| 0.15.3 (baza 0.15.4, **bez presetu**, `impl-0154_baza_pomiaru`) | 8 | mediana 12,1% | 21,6% | gz 435 tys. B | 2287 |
| 0.16.1 (`baza_0.16.md`) | 20 | 10,3% ± 4,5 (med. 11,0) | 22,3% | 2,32 mln | 3102 (maszyna obciążona) |
| 0.16.9 (baza z `kontrola_0.16.11`) | 12 | 8,9% ± 3,9 | 21,1% | 2,34 mln | 1360 |
| 0.16.11 | 12 | 8,4% ± 4,3 | 21,6% | 2,33 mln | 1368 |
| 0.16.11 „baza kontra baza” a / b (z `kontrola_0.16.12`) | 12 + 12 | 8,6% ± 3,7 / **11,6% ± 6,0** | 23,2 / 21,8% | 2,34 / 2,30 mln | 1529 / 1524 |
| 0.16.12 (po limicie przejęć) | 12 | 10,9% ± 4,1 | 22,6% | 2,28 mln | 1330 |
| **0.17 baza (kod 0.16.12, ta seria)** | **48** | **9,89% ± 3,89 (±1,15)** | **22,2%** | **2,327 mln** | **1213 sekw. / 2142 (6 równol.)** |
| *DE:* 0.16.11 → 0.16.12 → baza 0.17 | 12 → 12 → 23 | 10,4 / 9,4% → 11,6% → **9,7%** | 19,7–20,5 → 20,7 → 19,5% | 1,87–1,92 → 1,89 → 1,88 mln | 974–1345 → 1280 → 2328 (8 równol.) |
| *USA / CZ:* 0.16.11 → baza 0.17 | 6 → 6 | 11,9 → 13,5% / 11,7 → 11,0% | 20,4 → 20,0% / 20,0 → 21,3% | 1,67 → 1,78 / 1,84 → 1,65 mln | — |
| *PL 20 lat:* 0.15.3 → 0.16.1 → baza 0.17 | 8 → 12 → 12 | 11,4% → 13,1–13,7% → **13,8% ± 1,7** | 16,8 → 21,0 → 21,2% | gz 680 tys. B → 3,80 mln znaków → 3,72 mln znaków | 3291 → 1859 → 3046 |

\* Czas kroku zależy od liczby równoległych instancji i obciążenia maszyny — tylko porównania w obrębie jednej partii są rzetelne. **Rzetelny punkt odniesienia: 1213 ms/kw. na jednej instancji** (seria sekwencyjna). 6 równoległych instancji dało 2142 ms (×1,77), 8 — 2328 ms.

Wnioski z tabeli: (1) wszystkie serie PL od 0.16.1 mieszczą się w 8,4–11,6% i nowy pomiar (9,9% ± 1,15) leży w środku; **zmiana GIG 0.15.3→0.16 (12,1% → ~10%) jest w granicach szumu tamtej 8-growej serii (SE ≈ 1,4 pp) i nie została wykazana**. (2) Pooled sześć serii PL 0.16.9–0.16.12 (po 12 gier): ≈ 10,0%, zgodne z 9,9%; żadna z dawnych „różnic” +2…3 pp między wersjami nie jest rozróżnialna od szumu — w tym podejrzenie, że D3 (przejęcia obcych) podnosi GIG. (3) Marża 22,2% ± 0,37 jest stabilna od 0.16.1 (22,3%); wzrost marży z 0.16.9 (21,3→22,9%) był szumem. (4) Zapis PL 2,33 mln znaków — bez zmian od 0.16.1 (2,32 mln); DE o 19% mniejszy (mniej spółek krajowych).

## Dodatkowe odchyłki znalezione w serii (do obejrzenia, nie naprawiane)

1. **Niezmiennik „kwity” po wczytaniu zapisu** (`gdr.js:267`): `kwity XXXZn.KR: posiadacze 0 > pula −N` (ujemna pula `float`, np. −5…−107 mln) w `saveCheck.invAfterLoad` w **19 z 99** poprawnych gier: PL 3/48, DE 6/23, USA 1/6, CZ 1/6, PL 20 lat 8/12, seria sekwencyjna 0/4. W trakcie gry (`invariants`) 0 — wykrywa to dopiero kontrola po wczytaniu, więc albo wczytanie rozjeżdża pulę, albo ujemna pula istnieje na żywo, tylko nie jest sprawdzana. Narasta z długością gry. Raporty 0.16 nie podawały tego pola, więc **nie wiadomo, czy to regresja**. Do tego w jednej grze 20-letniej: `kraj CZ: 16 spółek > limit 15` po wczytaniu.
2. **Ostrzeżenia inkubatora startupów (20 lat)**: `moneyWarn` „startup X: roszczenia a ≠ zebrane b” (`player.js:671`) w **10 z 12** gier 20-letnich, od kw. ~48–60 do końca (po 1–3 startupy, często stała różnica). W 6,5-letnich seriach 0/87 gier. `baza_0.16.md` podawała dla serii 20-letniej „ostrzeżenia 0” — więc to zmiana po 0.16.1 albo skutek innego harnessu/presetu; wymaga bisekcji. Nie wpływa na `invariants` (0).
3. **Przerwanie gry bez błędu gry**: „Failed to fetch” przy 8 równoległych instancjach (serwer plików w `run_przebiegi.mjs` jest jednowątkowy i bez ponawiania) — jedna gra z 100. Warto dodać jedno ponowienie `loadFrame`.

## Wnioski dla 0.17

**Budżet czasu kroku i zapisu.** Baza PL: **1213 ms/kw. (jedna instancja)** i **2,327 mln znaków** (gz 509 tys. B, lz 345 tys. znaków; 87% zapisu to `stocks`, sekcja `countries` ok. 130 tys.). Budżet z planu 0.17 (zapis ≤ +4%, krok ≤ +10%) = **≤ 2,42 mln znaków** i **≤ 1334 ms/kw.** przy tym samym pomiarze sekwencyjnym (szum samego czasu kroku: ±70 ms SE na 4 grach, zakres gier 1055–1381; do rozstrzygnięcia +10% potrzeba ≥ 8 gier sekwencyjnie przed i po). Seria 20-letnia: 3,72 mln znaków, 825 tys. B gz, lz 529 tys. znaków — mieści się w limicie lokalnym we wszystkich 12 grach, ale zapas do limitu nie był tu mierzony (pole `localFits` tylko tak/nie); w S0 dodać wypisanie `lzChars / limit`.

**Szum i liczba gier.** σ(GIG) między grami ≈ 3,9 pp (PL; 4,1 DE; 20 lat tylko 1,7). Średnie ośmiu partii po 8 gier wahały się 7,8–12,1% (odch. średnich 1,7 pp ≈ 3,9/√8 — czysty szum, bez efektu partii/instancji). Do ±1 pp (95%): **jedna seria ≈ 58 gier**; **porównanie A/B (dwie ramiona) ≈ 117 gier na ramię**; wykrycie różnicy 1 pp z mocą 80% ≈ 237 na ramię (≈ 70 min przy 6 instancjach; 48 gier = 14 min, ok. 3,4 gry/min). W 0.17.1 zalecam: (a) **120 + 120 PL** dla kryterium ±1 pp (przedział ±1,0), (b) **kryterium na metryce o mniejszym rozrzucie**: indeks zysków `earningsIndexCagr` ma σ = 2,8 pp (mniej o 29% niż GIG, ~połowa liczby gier), marża końcowa σ = 2,5 pp, (c) **obie serie (baza i nowa) mierzyć w tej samej partii**, bez mieszania z dawnymi seriami o innym kodzie, (d) harness: dodać ziarno losowe na grę tylko jeśli ścieżki dadzą się sparować (po zmianie kodu rozjadą się po kilku losowaniach — niska wartość), (e) ponawiać `loadFrame` po „Failed to fetch” i startować instancje z odstępem 8 s.

**Znane odchyłki.** GIG 20 lat **13,8% ± 1,06 (95%)** przy celu 11,5%: odchyłka +2,3 pp jest rzeczywista (poza przedziałem), niezmieniona od 0.16.1 (13,1–13,7%) — odziedziczona z 0.15.1, nie naprawiana; GIG 6,5 roku 9,9% < GIG 20 lat (13,8%): dryf rośnie z czasem, marża końcowa 21,2% w 20 latach (cel wcześniejszy 16,8% z 0.15.3 nie jest już punktem odniesienia). Tryb DE (9,7%) i PL (9,9%) są nierozróżnialne; USA 13,5% ± 3,4 (n = 6) wskazuje wyższy GIG przy uproszczonej mechanice (do potwierdzenia dopiero po 0.19). Gier z przejęciem naszej giełdy przez obcą: 40% (PL), różnica GIG −1,2 pp nieistotna. Do wyjaśnienia przed lub w 0.17: odchyłki 1–2 z powyższej listy (kwity po wczytaniu, ostrzeżenia inkubatora w 20 latach).

**Co 0.17 powinna mierzyć w S0.** (1) Powtórzyć niniejszy pomiar na kodzie 0.17 po S0 (dane/doprecyzowanie), PL ≥ 48 gier + 4 sekwencyjnie na czas kroku; (2) dodać do sondy: **łączną kapitalizację** rynku, udział spółek krajowych w przejęciach D3, `lzChars/limit`, liczbę wpisów `invAfterLoad` i `moneyWarn` jako osobne liczniki w podsumowaniu; (3) dla surowców: liczbę kontraktów, wartość kontraktów, depozyty/wezwania (`marginEngine`), ceny surowców i ich korelację z GIG, wpływ transportu na marże sektorów — w jednej serii, a zapis i czas kroku względem tej bazy (≤ +4% / ≤ +10%); (4) serię 20-letnią PL (12 gier) po S7, bo kontrakty długie rosną z czasem; (5) kryterium akceptacji GIG tylko na ≥ 117 grach na ramię albo na `earningsIndexCagr`.
