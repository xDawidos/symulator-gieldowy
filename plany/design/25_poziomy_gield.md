# 25. Podpowiedź poziomu giełdy (E0a, E0b; ekran 16) — DO AKCEPTACJI

Makieta: [makiety/25_poziomy_gield.html](makiety/25_poziomy_gield.html) (samodzielna). Plan: `plany/plan_0.18.6_porzadki_dluga_gra.md`, 0.18.7 E0a i E0b. Rozwija poprawkę makiety 18 (płytka bez reguły wejścia, zaakceptowana 2026-11-14).

## Co pokazuje / markup
| Część | Co pokazuje | Markup / ARIA |
|---|---|---|
| Płytka | krawędź 3 px w kolorze metalu, nazwa poziomu (przycisk), liczba spółek; elitarne: lekkie tło w kolorze metalu i limit miejsc („1 miejsce”, „3 miejsca”, „6 miejsc”). **Żadnych progów ani kursu** | `.ex-plate(.is-elite)`, `button.ex-name[aria-describedby]`, `.ex-cap`, `.ex-count` |
| Podpowiedź | wymagana ocena (jeśli jest) z ikoną `zweryfikowany` + jedno zdanie bez liczb. Teksty z E0a/E0b: Śmieciowa–Złota „Dostęp zależy od wielkości i zysków spółki.”; Platynowa „Wymagana ocena A” + „Dostęp od oceny A. Decydują też wielkość, płynność i zyski spółki.”; Rubinowa A+, „…i stałych zysków.”; Szmaragdowa AA, „…i regularnej dywidendy.”; Diamentowa „Tylko najlepsza spółka rynku.” | `span.ex-tip[role=tooltip][id]` (`.req`, `.why`) |
| Pokazywanie | najechanie (`:hover`), fokus klawiaturą (`:focus-visible`), dotknięcie (klik przełącza `data-open`); Esc i klik obok zamykają; bez `aria-expanded` | jak w makiecie 18 |
| Karta spółki | kafelek „Giełda” z nazwą poziomu jako ten sam przycisk z tą samą podpowiedzią | `.kpi .ex-name` + `.ex-tip` |

Limit miejsc elitarnych jest jedyną liczbą na płytce: to cecha poziomu, a nie próg dla spółki.

## Do uwagi dla kodu
- Skala ocen w grze (`RATING_GRADES`, `listings.js:579`) nie ma **A+**, a E0b wymaga A+ dla Rubinowej. Podpowiedź pokazuje A+ zgodnie z planem; plan mówi, że `listings.js` dostaje oceny A+ i AA (AA już jest).
- Treść podpowiedzi z jednej mapy (np. `EXCHANGE_TIP[tier]`), żeby płytka i karta mówiły to samo.

## Prompt dla czatu kodu
> Według `plany/design/25_poziomy_gield.md` i makiety `plany/design/makiety/25_poziomy_gield.html` (E0a, E0b planu 0.18.7): płytki giełd bez progów, nazwa poziomu jako `button.ex-name` z `aria-describedby` do `span.ex-tip[role=tooltip]` (wymagana ocena + zdanie z E0a/E0b), pokazywanie na `:hover`, `:focus-visible` i dotknięcie (`data-open`, Esc zamyka); elitarne z limitem miejsc; ten sam przycisk w kafelku „Giełda” karty spółki. Testy: podpowiedź bez cyfr poza nazwą oceny; każde id podpowiedzi unikalne; płytka bez `minPrice`.
