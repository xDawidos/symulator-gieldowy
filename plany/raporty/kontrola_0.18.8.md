# Kontrola 0.18.8 — Długa gra (D7)

Gałąź `zmiany-AI`. Plan: `plany/plan_0.18.6_porzadki_dluga_gra.md` (sekcja 0.18.8). Decyzje: `raporty/decyzje_0.18.8.md` (G1–G8, U13). Diagnoza: `raporty/diagnoza_dluga_gra.md`. Baza: e5a / e5ab (kod końcowy 0.18.7 z E5, 25 gier × 6,5 roku i 25 × 20 lat).

Seria kontrolna d7 (migawka po a6cad5d): 25 gier × 6,5 roku i 10 × 20 lat bez presetu, bez UI. Przebieg dymny: 2 × 50 lat z presetem `automaty` (gracz-aktywny + wszystkie automaty). Testy: 1122/1122.

Bez bramki balansu dla 50–100 lat (decyzja 2026-11-13); dla 50 lat mierzona tylko technika.

## Części

| Część | Commity | Co zrobione |
|---|---|---|
| D0 | 844824e (sonda), ten commit (raport) | `PROBE_LONG` w przebiegach, diagnoza 4 gier × 50 lat: zapis 50 lat = 1,28 × 20 lat, sterta bez trendu, fundusz botów 8 ppm rynku; propozycje skali kapitału → U13 |
| D1 | a6cad5d | CV gracza: 40 wpisów + liczniki według typu (co kwartał i przy wczytaniu) |
| D2 | — | czeka na decyzję użytkownika (U13), nic nie wdrożone |
| D4 | 844824e | `automation.js`: auto-rolowanie lokat, auto-oferty na aukcjach bonów, alert koncentracji sektora; zakładka „Automaty” w CV i Akademia |
| D5 | 33f81ed | czarne łabędzie: 5 typów, 1 na 15–25 lat od 10. roku, poza budżetem linii, kilka krajów, baner |
| D6 | 5125efc | `history.js`: raport dekady, wiadomość „Kronika Rynku” w TeamedUP!, Ranking → Historia |

## Bramka 0.18.8

| Miara | Cel | Wynik | Ocena |
|---|---|---|---|
| GIG 6,5 roku | ±0,5 pp wobec bazy | 11,30% → 10,09% (−1,21 pp, SE 1,11) | w szumie (1,1 SE), formalnie poza ±0,5 |
| GIG 20 lat | ±0,5 pp i 10–13% | 9,79% → 9,74% (−0,06 pp, SE 0,61) | ±0,5 OK; poziom tuż pod 10% jak w 0.18.7 (U12) |
| Średnia odchyłek marż sektorów | ±0,5 pp | 6,5 roku −0,34 pp (SE 0,25); 20 lat −0,29 pp (SE 0,52) | OK |
| Debiuty | bez zmian | 6,5 roku 19,9 → 17,6 (SE 0,9); 20 lat 80,1 → 80,7 | OK (6,5 roku −12%, w ±20%) |
| Zapis | bez wzrostu | 6,5 roku −0,4%, 20 lat +0,3% | OK |
| Niezmienniki, ujemna gotówka, błędy JS, po wczytaniu, zawieszenia | 0 | 0 w 35 grach serii | OK |
| Łabędzie w grze 6,5-letniej | 0 | 0 (test harmonogramu 20 × 27 kw.; pierwszy najwcześniej w 40. kw.) | OK |
| Raport dekady | po 10 latach komplet pól; po 30 latach 3; ≤ 2 KB na dekadę | test: 3 raporty, ≤ 2 KB; przebieg dymny: 4 raporty na 50 lat (piąty wypada na 200. kw., po końcu przebiegu) | OK |
| Automaty (preset `automaty`) | 20 lat bez błędów i niezmienników | 2 × 50 lat: 0 błędów JS, 0 niezmienników, 0 zawieszeń, 0 błędów kroku kwartału | OK |
| Łabędzie w 50 latach | 2–3 | 2 i 2 (wojna regionalna → linia naftowa, rewolucja technologiczna; rewolucja technologiczna, pandemia), każdy w 3 krajach | OK |
| Zapis 50 lat w przebiegu dymnym | ≤ 1,5 × 20 lat | 1,31 / 1,34 × | OK |
| Zapis 50 lat | ≤ 1,5 × zapisu po 20 latach | D0: 1,28 × | OK |

### Przebieg dymny 50 lat

Pierwsza wersja przebiegu (d7) dała 1000 błędów JS na grę i kurczącą się liczbę spółek (59–70 po 50 latach). Przyczyną był sam preset `automaty`: nadpisywał `playerProfile.mentor` bez pól zadań mentora, więc `assignMentorTasks` rzucał wyjątek w każdym kroku. Po poprawce presetu (`getMentor()`) przebiegi d7b i d7c: 0 błędów, liczba spółek 203–214 po 50 latach (jak w D0), GIG 50 lat 9,7–11,5%. W grze z łabędziem w kwartale, w którym trwała już inna linia, łabędź działał bez własnej linii (zgodnie z G5). Historia łabędzi trafia teraz do `crisisSummary().swans` (pole `crises.swans` w przebiegach).

Narzędzie sprawdzające serie (`e0chk.mjs` w scratchpadzie) nie czytało pola `errorCount`; po poprawce sprawdziłem wstecz serie 0.18.6–0.18.8 (o45c, e0h, e0x, e0y, e5a, e5b, d0, d7): błędy JS tylko w d7 z błędnym presetem.

## Zrzuty i sprawdzenia w podglądzie

Sprawdzone w grze (podgląd): Ranking → Historia z raportem dekady (bursztynowy wynik funduszu, komórki: najlepsza spółka, rynek, kryzysy, kariera, sektory, najsłabsza spółka, rządy), CV i Akademia → Automaty w stanie zablokowanym (kłódka, „Zdobądź Certyfikat … u mentora”) i odblokowanym (przełącznik, pola progów), baner „Czarny łabędź: Wojna regionalna” w stylu banera kryzysu. Stan podglądu przywrócony po sprawdzeniu.

## Co nie zostało sprawdzone

- Makiety: okno „Automaty” (ekran 4), baner łabędzia (ekran 5) i zakładka Historia (ekran 6, część poza wiadomością z makiety 23 §3) są zrobione bez makiet — do przeglądu designu.
- D2 (skala kapitału) czeka na U13.
- Wiadomość dekady w TeamedUP! sprawdzona testem (kanał, treść, bez emoji); w podglądzie oglądana tylko jej pełna wersja w Rankingu.
