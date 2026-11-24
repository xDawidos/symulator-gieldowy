# 20. Budownictwo jako tabela porównawcza (R13, O8)

Makieta: [makiety/20_budownictwo.html](makiety/20_budownictwo.html). Okno w ramie z [19_okna.md](19_okna.md) (`.wn--build`, zakładki poziome). Wspólny CSS ramy: `makiety/19_okna.css`.

## Problem
Dziś (`renderConstructionCompaniesList`, `renderConstructionProjectsList` w ui.js) każda spółka i każda budowa to karta z 6 parami klucz–wartość. Nie da się porównać spółek ani znaleźć budowy z problemem.

## Co pokazuje / markup
| Część | Co pokazuje | Dane | Markup |
|---|---|---|---|
| Nagłówek | Zdanie stanu: „12 budów w toku, 3 z problemem. 2 przetargi otwarte do końca miesiąca.” | `constructionProjects`, przetargi | `.wn-head p` |
| Pasek liczb | Budowy w toku, wolne moce (suma `maxProjects − aktywne`), po terminie, wstrzymane, przetargi otwarte | jw. | `.wn-strip` |
| Tabela spółek | Wiersz = spółka: nazwa + ticker, **moce jako kratki** (zajęta / wolna) i „3/5”, oferty w toku, wygrane / ukończone, gotówka, kredyt obrotowy, tempo / koszt / ryzyko z technologii (0 wyszarzone), **ryzyko** słowem: „bez opóźnień”, „2 budowy po terminie”, „1 budowa wstrzymana” | `constructionStats`, `getActiveProjectsForBuilder`, `getOpenBidsForBuilder`, `getConstructionTechnologyBonuses`, `cash`, `constructionCredit` | `table.bd-table`, `tr.bd-row[aria-expanded]`, `.bd-slots`, `.bd-tech`, `.bd-risk.is-ok/.is-warn/.is-down` |
| Rozwinięcie spółki | Jej budowy (pasek postępu z kreską planu, termin, stan) + doświadczenie, limit budów, oferty, gotówka, kredyt | jw. | `tr.bd-detail`, `.bd-builds`, `.bd-dl` |
| Tabela budów | Budowa i zamawiający, wykonawca, postęp, termin („prognoza: 5 tyg. po terminie”, „zapas 6 tyg.”), opóźnienia wykonawca / zewnętrzne, stan. **Sortowanie: wstrzymane, zagrożony termin, w toku** | `getProjectedRemainingMs`, `getProjectTimeLeftMs`, `contractorDelayMs`, `excusedDelayMs`, `getConstructionProjectStatusLabel` | `.bd-prog` (`--v` postęp, `--plan` gdzie powinna być wg terminu), `.is-late`, `.is-stop` |
| Telefon | Spółki: nazwa, „3/5”, ryzyko. Budowy: nazwa (wykonawca pod nią), postęp, stan. Reszta w rozwinięciu | | `.bd-hide-sm`, `.bd-show-sm` |

Postęp jest neutralny (R4). Kolor dostaje dopiero problem: żółty z ikoną dla terminu, czerwony z ikoną dla wstrzymania.

**Kreska planu** = część czasu umownego, która minęła (`1 − timeLeft / czas umowny`). Pasek przed kreską: budowa wyprzedza plan.

## Stany puste
- Brak spółek: „Brak spółek budowlanych w grze.” (bez zmian).
- Spółka bez budów (w rozwinięciu): „Brak aktywnych budów. Spółka startuje w przetargach.”
- Brak budów: „Brak aktywnych budów.”

Podwykonawcy i Finansowanie pomostowe zostają bez zmian, tylko w nowej ramie.

## Prompt dla czatu kodu
> Przebuduj zakładkę „Firmy budowlane i projekty” okna Budownictwo według `plany/design/20_budownictwo.md` i makiety `plany/design/makiety/20_budownictwo.html`. Karty z `renderConstructionCompaniesList` i `renderConstructionProjectsList` zamień na dwie tabele (`.bd-table`): spółki z rozwijanym wierszem (`aria-expanded`, Enter/Spacja) i budowy posortowane wstrzymane → zagrożony termin → w toku. Moce jako kratki `.bd-slots`, postęp `.bd-prog` z kreską planu, ryzyko słowem z ikoną. Dane bez zmian (te same funkcje). Na telefonie ukryj kolumny `.bd-hide-sm`. Zachowaj odświeżanie (`data-project-id`) i otwarty wiersz między odświeżeniami. Testy: kolejność budów, tekst ryzyka dla 0/1/2 opóźnionych i wstrzymanej, liczba kratek = `maxProjects`. Jeśli rama okna z R9 (19) jeszcze nie weszła, tabele idą do obecnego okna.
