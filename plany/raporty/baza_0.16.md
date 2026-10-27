# Baza 0.16 i domknięcie 0.15 (G0, 2026-10-27)

Baza = kod 0.15.6 + G0a (sondy, presety) + G0b (pułap napływu), bez walut, GDR i porządków spółek (osobny worktree). Przebiegi ×200 (`tests/przebiegi.html`, wirtualny zegar), podsumowanie: `plany/design/narzedzia/podsumuj_serie.mjs`. Surowe JSON-y nie są commitowane (kilka MB każdy). Odchylenie GIG między grami ≈ 3–4,5 pp, więc błąd średniej z 20 gier ≈ 1 pp, z 12 gier ≈ 0,6 pp.

## Liczby wzorcowe (baza 0.16)

| Seria | GIG CAGR (mediana / średnia ± odch.) | Marża końcowa ważona | Zapis (znaki JSON) | Czas kroku (ms/kw.) | Niezmienniki / ujemna gotówka / wyjątki / ostrzeżenia |
|---|---|---|---|---|---|
| 20 gier × 6,5 roku, bez presetu (`base_k65`) | 10,7% / 10,1% ± 3,6 | 22,1% | 2,33 mln | 3160 (obciążona maszyna) | 0 / 0 / 0 / 0 |
| 20 × 6,5 roku `fundusz-gig` (`base_k65g`) | 11,0% / 10,3% ± 4,5 | 22,3% | 2,32 mln | 3102 | 0 / 0 / 0 / 0 |
| 12 × 20 lat `fundusz-gig` (`base_k20b`, po pułapie emisji wymuszonej) | 13,1% / 13,7% ± 1,8 | 21,0% | 3,80 mln | 1859 | 0 / 0 / 0 / 0 |

Czasy kroku zależą od liczby jednocześnie działających przebiegów — porównywać tylko w obrębie jednej partii.

## G0a: sondy i presety

- Dodane: bajty zapisu wg sekcji i pól spółki (`saveSizes.bySection`, `topStockFields`, `perStock`), czas budowy zapisu, sonda zdarzeń „Gigant” i kursów walut, preset **`gracz-akcje`** (prawdziwe zakupy akcji jednego typu przez ~70% aktywów, kampanie emisyjne z mandatem co rok; fazy rynku zapisywane przy pomiarach). Preset `gracz-aktywny` zostaje bez zmian (kariera + alfa).
- Poprawki harnessu: okna „wezwanie” i „komplikacja” oraz okno wydarzenia „Gigant” zatrzymywały przebieg bez gracza (kilka przebiegów stało godzinami); stuby w presecie i w `przebiegi.html`.
- **Niezmierzone** (nie dodane do sond, bez wpływu na 0.16.1): upadki w linii wg dźwigni, wynik sektorów zyskujących względem GIG w linii, kierunek stóp w linii, 5 gier na linię, misje IR i VIP (`ir` zostaje puste w presecie), bessa z lock-upem poza mandatem (mandat mierzony w Hossie i Bessie, bez osobnego scenariusza). Czas zapisu/wczytania: `saveMs` ≈ 0 ms (pomiar zbyt zgrubny).

## G0b: dryf udziałów (`fundusz-gig`, 20 lat)

- **Diagnoza** (4 gry bez pułapu, 10 z pułapem organicznym): napływ w jednostkach wartości — **emisja wymuszona („duży klient chce 10–30% aktywów”, `maybeTriggerForcedEmission`) to ≈ 70% napływu** (np. 721 z 958 tys. zł w grze z +11,9%/rok), organiczni nowi klienci ≈ 25%, dopłaty ≈ 0. Kampanie, VIP i rynek wtórny w tym presecie nie występują.
- **Bez pułapu:** udziały +3,1%/rok średnio (−2,0 … +6,4%), 1 z 4 gier w ±3%.
- **Pułap (pojemność strategii):** mnożnik `getFundCapacityFactor` = 1 do 60 tys. zł aktywów, potem (60 tys./aktywa)^0,6, nie mniej niż 0,2; stosowany do napływu organicznego, dopłat i **szansy emisji wymuszonej**. Gry ≤ 6,5 roku praktycznie bez zmian (aktywa zwykle < 60 tys.).
- **Wynik (12 gier × 20 lat):** udziały +1,1%/rok (średnia, −2,1 … +6,4), 9/12 gier w ±3% (cel ±3%/rok — **osiągnięty w większości, nie we wszystkich**); zaufanie 45–55 w 4/12 gier (mediana 44) — **cel zaufania niespełniony**, poza zakresem pułapu (zaufanie wynika z wyniku względem GIG).

## G0c: mandaty

Gracz naprawdę kupujący akcje danego typu (8 gier × 6,5 roku, 21 mandatów, po 2 gry na typ): **0 naruszeń (0%, cel ≤ 30%)**; zgodność tygodniowych pomiarów z progiem 76–100% (defensywny 76–82%, wzrostowy 94%, dywidendowy 82–100%, sektorowy 85–97%), w Bessie 100%. Gracz niekupujący akcji tego typu łamie mandat w 78% (23 mandatów) — zgodnie z założeniem. **Progów nie zmieniono.**

## G0d: odstępstwa 0.15.3

Obie pozycje **skreślone z planu 0.15.3**: „debiuty startupów 3× rzadziej w bańce internetowej” (mała korzyść, osobny hamulec debiutów już działa) i „dźwignia botów > 40% w Czarnym czwartku” (brak prostej miary dźwigni botów; warunek Euforia + premia > +25% wystarcza, linia i tak jest rzadka).

## G0e: stan nierozstrzygnięty z 0.15

GIG po 20 latach 13,1–13,7% (baza 0.15.3: 11,5%) — odziedziczony dryf, **nie naprawiany** (zgodnie z zadaniem), jest teraz wzorcem 0.16.
