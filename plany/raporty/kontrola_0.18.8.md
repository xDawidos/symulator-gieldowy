# Kontrola 0.18.8 — Długa gra (D7)

Gałąź `zmiany-AI`. Plan: `plany/plan_0.18.6_porzadki_dluga_gra.md` (sekcja 0.18.8). Decyzje: `raporty/decyzje_0.18.8.md` (G1–G8, U13). Diagnoza: `raporty/diagnoza_dluga_gra.md`. Baza: e5a / e5ab (kod końcowy 0.18.7 z E5, 25 gier × 6,5 roku i 25 × 20 lat).

Seria kontrolna d7 (migawka po a6cad5d): 25 gier × 6,5 roku i 10 × 20 lat bez presetu, bez UI. Przebieg dymny: 2 × 50 lat z presetem `automaty` (gracz-aktywny + wszystkie automaty). Testy: 1122/1122 (po U9, U11, U13 i makietach 28–30: 1127/1127).

Bez bramki balansu dla 50–100 lat (decyzja 2026-11-13); dla 50 lat mierzona tylko technika.

## Części

| Część | Commity | Co zrobione |
|---|---|---|
| D0 | 844824e (sonda), ten commit (raport) | `PROBE_LONG` w przebiegach, diagnoza 4 gier × 50 lat: zapis 50 lat = 1,28 × 20 lat, sterta bez trendu, fundusz botów 8 ppm rynku; propozycje skali kapitału → U13 |
| D1 | a6cad5d | CV gracza: 40 wpisów + liczniki według typu (co kwartał i przy wczytaniu) |
| D2 | 8cfdb3d | według U13: poślizg zlecenia gracza 0,5 × udział w free floacie (do 15%, połowa w cenie, szacunek w szufladzie zlecenia; boty dalej z pułapem 2%), pułap napływu klientów względem kapitalizacji rynku, wyjście większościowca (> 50%, sprzedaż ≥ 5% akcji → spadek kursu do 25% przez 4–6 tygodni, wiadomość o panice) |
| U9 | 8cfdb3d (UI, test), 07da1b3 | incydenty ekologiczne (związki, aktywiści, kontrole z karą, oskarżenia), część „Wpływ na cenę i produkcję” w Przeglądzie karty spółki, presja ×3,0, wybór OZE pod presją |
| U11 | 8cfdb3d, ten commit | Szmaragdowa od A+; sonda warunków (`em`) wskazała dywidendę jako wąskie gardło → 2 kw. dywidendy zamiast 4 (H2) |
| Makiety 28–30 | f6a5254 | Automaty, baner Czarny łabędź z plakietką w pasku, Ranking → Historia |
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

## Seria końcowa (fk)

Migawka po U9, U11 (A+, 2 kw. dywidendy), U13 i makietach 28–30: 25 gier × 6,5 roku i 15 × 20 lat, bez presetu, bez UI. Baza d7.

| Miara | Cel | Wynik | Ocena |
|---|---|---|---|
| GIG 6,5 roku | ±0,5 pp | 10,09% → 10,89% (+0,79 pp, SE 1,21) | w szumie |
| GIG 20 lat | ±0,5 pp i 10–13% | 9,74% → 10,33% (+0,59 pp, SE 0,67) | w szumie, w celu 10–13% |
| Średnia odchyłek marż sektorów | ±0,5 pp | −0,28 pp (SE 0,27); 20 lat +0,17 pp (SE 0,57) | OK |
| Zapis | bez wzrostu | −3,1% / −1,2% | OK |
| Niezmienniki, ujemna gotówka, błędy JS, po wczytaniu | 0 | 0 w 40 grach | OK |
| Szmaragdowa 1–3 od 3. roku | ≥ 90% | 84% (u13: 62%, em z A+: 67%) | blisko celu |
| Rubinowa 3–6 od 3. roku | ≥ 90% | 76% (em: 90%) | spadek: część spółek przechodzi na Szmaragdową |
| Diamentowa = 1 | 100% | 100%, 1,33 zmiany na 20 lat | OK |
| Rozkład poziomów | ±3 pp | Platynowa 3,9%, Rubinowa 2,9%, Szmaragdowa 1,4% | OK |

### Zanieczyszczenie po U9

| Seria | Gier | Zanieczyszczenie po 20 latach | ≥ 90 | Węgiel / OZE |
|---|---|---|---|---|
| d7 (przed U9) | 10 | 66,6 (SE 5,6) | 2 | 44% / 28% |
| u9 | 25 | 66,3 (SE 4,6) | 4 | 44% / 28% |
| fk | 15 | 74,6 (SE 7,0) | 5 | 48% / 28% |

U9 nie obniżyło zanieczyszczenia do celu 55–65 (łącznie u9 + fk ok. 69). Incydenty zmieniają wynik i produkcję emitentów, ale miks energetyczny (węgiel 44–48%) się nie zmienia: bloki węglowe żyją długo, a wybór OZE pod presją dotyczy tylko nowych budów. Zgodnie z decyzją użytkownika U9 system handlu emisjami trafia do Polityki 2 (0.19.1) jako potencjalna ustawa (H1).

## Zrzuty i sprawdzenia w podglądzie

Sprawdzone w grze (podgląd): Ranking → Historia z raportem dekady (bursztynowy wynik funduszu, komórki: najlepsza spółka, rynek, kryzysy, kariera, sektory, najsłabsza spółka, rządy), CV i Akademia → Automaty w stanie zablokowanym (kłódka, „Zdobądź Certyfikat … u mentora”) i odblokowanym (przełącznik, pola progów), baner „Czarny łabędź: Wojna regionalna” w stylu banera kryzysu. Stan podglądu przywrócony po sprawdzeniu.

## Co nie zostało sprawdzone

- Zanieczyszczenie poza celem 55–65 → handel emisjami w 0.19.1 (H1); `plan_0.19.md` należy do innego czatu, nie edytowałem go.
- Rubinowa 76% kwartałów z 3–6 spółkami (cel ≥ 90%) po zmianie Szmaragdowej; Szmaragdowa 84% (cel ≥ 90%). Bez dalszego strojenia w 0.18.8 (H2).
- Seria końcowa bez przebiegu 50 lat (technika 50 lat sprawdzona w d7b/d7c przed U9 i U13).
- Wiadomość dekady w TeamedUP! sprawdzona testem (kanał, treść, bez emoji); w podglądzie oglądana tylko jej pełna wersja w Rankingu.
