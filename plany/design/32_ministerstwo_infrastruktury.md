# 32. Ministerstwo Infrastruktury (Państwo → Gospodarka → Przegląd) — zaakceptowana 2026-11-22, zaktualizowana do planu 0.19.1 P5a (zmiany do akceptacji)

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
| Nagłówek (P5a) | „Ministerstwo Infrastruktury”, minister i partia, zdanie „finansowanie ustala co kwartał według programu partii rządzącej”, przycisk **Lobbing** (0.19.1 P3) | minister z rządu, partia rządząca | `header.mi-head`, `button.mi-lobby` |
| Polityka ministerstwa: finansowanie | poziom słowem, „poziom 3 z 5”, skala; utrzymanie w kwartale (kwota i % wpływów), raty za budowy, zużycie na rok, budżet kwartału razem; ramka z programem partii i regułą ministra (przepustowość < 0,85 → +1 poziom, najwyżej raz na rok) | `society.laws.infrastructure`, `INFRA_LEVELS`, `inf.lastUpkeep`, `inf.lastInstallments` | `.mi-steps[role=img]`, `dl.mi-dl` |
| Przepustowość | 3 rodzaje **słowem i liczbą** (dobra ≥ 1,10, w normie ≥ 0,95, słaba ≥ 0,85, krytyczna poniżej), pasek z kreską startu 1,00 i zdanie o szlakach z mapy 16 albo o zbliżaniu się do progu 0,85 | `getInfraCapacity`, `getInfraCapUpper` | `ul.cap`, pasek `role=img` z pełnym opisem |
| Plan inwestycji na 4 kwartały (P5a) | 4 pozycje: kwartał, projekt, koszt, uwaga („przetarg ogłoszony”, „zagrożony cięciem przy deficycie”); energia jako odnośnik do zakładki Energia | plan ministerstwa (nowy stan P5a) | `ol.prio` |
| Projekty w toku | nazwa (z odcinkami), wykonawca, termin, postęp, wpływ na przepustowość (`gain`), udział PPP gracza bursztynem | `society.infra.projects` | `ul.pj[tabindex=0][aria-label]` z przewijakiem (`max-height` ok. 3 projektów, `overflow-y: auto`, poprawka 2026-11-22) |
| Akcje | „Mapa szlaków” (Łańcuchy → Szlaki), „Przetargi: Budownictwo” | — | `.mi-acts` |

Telefon: jedna kolumna (`@media (max-width: 860px)`). Ikona magistrali pochodzi z `018_ikony.svg` (do przeniesienia do sprite'a gry, jak w notce 13).

## Do planu (czat planowania)
- **Ustalone w planie 0.19.1 P5a (2026-11-22):** ministerstwo podlega rządowi, poziom co kwartał według programu partii, reguła 0,85; budżet = udział wpływów plus raty, plan inwestycji na 4 kwartały cięty przy deficycie; wpływ gracza: lobbing, przetargi i PPP, nepotyzm poziom 3 (wcześniejsza informacja o planie).
- **Łącza:** według planu nie są czwartym rodzajem szlaków; wchodzą w 0.19.2 jako infrastruktura miasta (broadband, zamawia ministerstwo albo miasto). Wtedy w planie inwestycji mogą pojawić się pozycje „Łącza: [miasto]”.
- Wiersz „Infrastruktura” w Budżecie państwa (Kraj) może zostać jako liczba z odnośnikiem do karty.

## Prompt dla czatu kodu
> Po wdrożeniu mechaniki P5a planu 0.19.1, według `plany/design/32_ministerstwo_infrastruktury.md` i makiety `plany/design/makiety/32_ministerstwo_infrastruktury.html`: w Państwo → Gospodarka → Przegląd dodaj kartę „Ministerstwo Infrastruktury” na całą szerokość pod obecnymi trzema: minister, partia i przycisk Lobbing; polityka finansowania (poziom ze skalą, utrzymanie i raty, zużycie, budżet kwartału, ramka z programem partii i regułą 0,85); przepustowość 3 rodzajów słowem i liczbą z kreską startu; plan inwestycji na 4 kwartały; projekty w toku jako przewijana lista (`ul.pj[tabindex=0][aria-label]`) z postępem, wpływem i udziałem PPP gracza; odnośniki do mapy szlaków i Budownictwa. Testy: 3 rodzaje przepustowości ze słowem; plan ma ≤ 4 pozycje; udział PPP tylko przy projektach z wpłatą gracza; lista projektów przewija się powyżej 3 pozycji.
