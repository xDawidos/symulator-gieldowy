# 28. Automaty (CV i Akademia → Automaty; 0.18.8 D4, ekran 4) — DO AKCEPTACJI

Makieta: [makiety/28_automaty.html](makiety/28_automaty.html) (samodzielna). Kod dziś: `automation.js`, `renderAutomationPanel()` (`ui.js:7294`), wdrożone w 844824e bez makiety.

## Co się zmienia wobec kodu
| Dziś | Po |
|---|---|
| karta `bank-card` z checkboxem „Włączony” | karta `.au(.is-on/.is-locked)` z przełącznikiem `button.sw[role=switch][aria-checked]` i stanem słowem (Włączony / Wyłączony / Zablokowany) |
| pole liczbowe w procentach bez jednostki, etykieta w tekście `label` | `.fld`: etykieta nad polem, jednostka w polu („% rocznie”, „% gotówki”, „% akcji”), podpowiedź pod polem przez `aria-describedby`; przy wyłączonym automacie pola `disabled` |
| brak ostatniej akcji na karcie | `.au-last`: ostatnia akcja tego automatu (z `a.log`) |
| zablokowany: `renderEmptyState` „Zablokowany” | `.au-lock`: „Odblokujesz po zdobyciu: Certyfikat …” + przycisk „Otwórz Mentora” (nazwa z `MENTOR_TRACKS[...].label`) |
| dziennik: `ul` z „·” | `table` (Kiedy, Automat z ikoną, Co zrobił), `caption` ukryty, akcje „nie odnowiona” szarym tekstem |
| — | podsumowanie nad kartami: „1 z 3 włączone” + zdanie, że automaty działają jak ręczne decyzje |

Ikony: lokaty `odswiez`, bony `moneta`, koncentracja `alert`, zablokowany `klodka`. Kolor włączonego = `--color-text-up` (przełącznik i ikona), zawsze ze słowem. Zmiana przełącznika ogłaszana w `aria-live=polite`. `prefers-reduced-motion`: przełącznik bez przejścia.

## Prompt dla czatu kodu
> Przebuduj `renderAutomationPanel()` według `plany/design/28_automaty.md` i makiety `plany/design/makiety/28_automaty.html`: przełącznik `role=switch`, pola z etykietą nad sobą i jednostką, `aria-describedby` dla podpowiedzi, ostatnia akcja na karcie, zablokowany z nazwą certyfikatu i przyciskiem „Otwórz Mentora”, dziennik jako tabela. Logika `automation.js` bez zmian. Testy: przełącznik zmienia `aria-checked` i `setAutomation`; pola wyłączone przy wyłączonym automacie; dziennik ma ≤ 20 wierszy.
