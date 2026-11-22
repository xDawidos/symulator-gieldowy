# 32. Ministerstwo Infrastruktury (Państwo → Gospodarka → Przegląd) — zaakceptowana 2026-11-22

Makieta: [makiety/32_ministerstwo_infrastruktury.html](makiety/32_ministerstwo_infrastruktury.html) (samodzielna). Uwaga użytkownika 2026-11-22: ministerstwo decyduje o finansowaniu infrastruktury i ma mini okienko w Gospodarka → Przegląd. Mechanikę (kto decyduje, wpływ gracza, budżet) planuje czat planowania; makieta używa tylko danych, które już są w kodzie.

## Skąd dziś bierze się finansowanie (sprawdzone w kodzie)
- Ustawa `SOCIAL_LAWS.infrastructure` (`core.js:5333`, poziomy od „Porzucenie” do „Autostrady na wczoraj”, start „Utrzymanie”), zmieniana przez rząd jak inne ustawy.
- `INFRA_LEVELS` (`infrastructure.js:20`): `spend` = % wpływów budżetu na kwartał (utrzymanie), `wear` = zużycie przepustowości na rok, `chance` = szansa nowego projektu na rok (o połowę mniej przy deficycie, `processInfraQuarterly`).
- `settleInfraBudget`: utrzymanie plus raty za budowy (pomniejszone o wpłaty PPP gracza). W budżecie jako `budget.infrastructureSpending` (dziś wiersz „Infrastruktura” w karcie Budżet państwa w zakładce Kraj).
- Przepustowość `society.infra.cap` dla `sea`, `air`, `land`: start 1,00, minimum 0,70, górna granica z limitów projektów (morska 1,45, lotnicza 1,30, lądowa 1,88). Wchodzi do frachtu (`freight.js:40`).
- Projekty `INFRA_TYPES`: port, lotnisko, magistrala kolejowa, autostrada (odcinki). Typ losowany z wagą 1/przepustowość⁴ (`pickInfraType`), więc najsłabszy rodzaj transportu ma pierwszeństwo. PPP: gracz może sfinansować 25% projektu.

## Co pokazuje karta
| Część | Treść | Dane | Markup / ARIA |
|---|---|---|---|
| Nagłówek | „Ministerstwo Infrastruktury” i zdanie: finansowanie infrastruktury, decyduje rząd, Ty możesz współfinansować (PPP); bez odwołania do dawnej ustawy (poprawka 2026-11-22) | — | `article.card.mi[aria-labelledby]` na całą szerokość siatki Przeglądu |
| Finansowanie | poziom słowem, „poziom 3 z 5”, skala; utrzymanie w kwartale (kwota i % wpływów), raty za budowy, zużycie na rok, szansa projektu | `society.laws.infrastructure`, `INFRA_LEVELS`, `inf.lastUpkeep`, `inf.lastInstallments` | `.mi-steps[role=img]`, `dl.mi-dl` |
| Przepustowość | 3 paski (morska, lotnicza, lądowa) z kreską startu 1,00, liczba (poniżej 1,00 kolorem ostrzeżenia) i zdanie o szlakach z mapy 16 | `getInfraCapacity`, `getInfraCapUpper` | `ul.cap`, pasek `role=img` z pełnym opisem |
| Priorytety | typy projektów w kolejności szansy (z wagi `pickInfraType`) i wolne miejsca (limit − obiekty); energia jako odnośnik do zakładki Energia | `INFRA_TYPES`, `countInfraObjects` | `ol.prio` |
| Projekty w toku | nazwa (z odcinkami), wykonawca, termin, postęp, wpływ na przepustowość (`gain`), udział PPP gracza bursztynem | `society.infra.projects` | `ul.pj[tabindex=0][aria-label]` z przewijakiem (`max-height` ok. 3 projektów, `overflow-y: auto`, poprawka 2026-11-22) |
| Akcje | „Mapa szlaków” (Łańcuchy → Szlaki), „Przetargi: Budownictwo” | — | `.mi-acts` |

Telefon: jedna kolumna (`@media (max-width: 860px)`). Ikona magistrali pochodzi z `018_ikony.svg` (do przeniesienia do sprite'a gry, jak w notce 13).

## Do planu (czat planowania)
- Kto decyduje o poziomie finansowania: dziś rząd przez ustawę. Propozycja zgodna z prośbą: ministerstwo jako właściciel tej decyzji, z priorytetami (kolejność typów) zamiast losowania; wpływ gracza przez PPP i lobbing (do decyzji).
- **Łącza** (z listy użytkownika: drogi, kolej, energia, łącza, porty) nie mają dziś danych w grze. `INFRA_TYPES` ma port, lotnisko, kolej i autostradę, a energia ma własne bloki. W karcie łączy nie ma; do dopisania, jeśli plan je doda (np. typ `fiber` wpływający na sektor Technologia, jak czynnik „Łącza” w mieście z makiety 16).
- Wiersz „Infrastruktura” w Budżecie państwa (Kraj) może zostać jako liczba z odnośnikiem do karty.

## Prompt dla czatu kodu
> Według `plany/design/32_ministerstwo_infrastruktury.md` i makiety `plany/design/makiety/32_ministerstwo_infrastruktury.html`: w Państwo → Gospodarka → Przegląd dodaj kartę „Ministerstwo Infrastruktury” na całą szerokość pod obecnymi trzema: poziom finansowania ze skalą, utrzymanie i raty z `settleInfraBudget`, zużycie i szansa z `INFRA_LEVELS`, przepustowość 3 rodzajów z kreską startu, priorytety typów z wagi `pickInfraType` i wolnymi miejscami, projekty w toku z postępem, wpływem i udziałem PPP gracza, odnośniki do mapy szlaków i Budownictwa. Mechanika bez zmian, dopóki plan jej nie zmieni. Testy: karta pokazuje 3 rodzaje przepustowości i projekty `tender`/`build`; udział PPP tylko przy projektach z wpłatą gracza.
