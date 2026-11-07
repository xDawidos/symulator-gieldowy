# Projekt UI 0.17.2: Energia i środowisko

Data: 2026-11-07 · zlecenie: `plany/plan_0.17.2_energia_srodowisko.md` (E2–E10, „Atom”) · system: [03_system.md](03_system.md) · makieta: [makiety/11_energia_0172.html](makiety/11_energia_0172.html) · zrzuty: `zrzuty/z0172/`.

To projekt dla czatu kodu. CSS jest w grze (blok „0.17.2” na końcu `style.css`), 8 ikon w `UI_ICON_PATHS` i `img/ikony/`. Logiki nie ma. Wszystkie liczby i nazwy w makiecie są przykładowe, wartości stroi czat kodu. Źródłem projektu jest makieta HTML.

## Zasady
1. **Kolor nigdy sam.** Typ energii ma zawsze ikonę i słowo. Pasek miksu ma nazwy na segmentach, przy 390 px czytelna jest legenda. Stan: ikona, słowo, liczba.
2. **Bez nowych okien.** Zakładka w Państwie, sekcja w karcie spółki, karta w Nadzorze, wiersze w Kraju i w oknie „Rynek”.
3. **Bez wskaźników w górnym pasku.** Także dla Opinii publicznej (E8).
4. **Wzorce z gry:** `renderLimitMeter`, `.bank-card`, `.bank-ticker`, `.crisis-axis`, `.cc-kpi`, `.notice-inline`, `alert`, `badge--*`. Nowe są tylko klasy `.en-*`, bez nowych tokenów.
5. **Słownictwo:** PLN, „prezes”, „UEiE” w etykietach, pełna nazwa na karcie urzędu. „Regulator” znika z komunikatów o blokach. Ustawy i typy po polsku: węgiel, gaz, atom, OZE.

## Gdzie co jest
| Miejsce | Zawartość | Funkcja |
|---|---|---|
| Państwo → **Energia** (nowa zakładka za „Kraj”) | pasek liczb, miks, bilans, cena, bloki w budowie, zanieczyszczenie, poziom życia, alerty | nowa `renderEnergyPanel`; `index.html` (przycisk `data-tab="energy"`), `updateStateModalContent` |
| Państwo → Nadzór | karta UEiE jak Policja i KNF, oś 6 poziomów | `renderOversightPanel`, `card('ueie', …)` |
| Państwo → Kraj | 3 ustawy w tabeli, oś Polityki klimatycznej, nowe linie budżetu, Zieloni na liście partii | `renderCountryPanel`, `renderPartyBars` |
| Karta kraju | wiersze „Poziom życia” i „Opinia publiczna” | `renderCountryCard` |
| Okno „Rynek” | kafelki Opinia publiczna i Cena prądu | `renderMarketModal`, wzór `.freight-card` |
| Karta spółki → Przegląd | `.cc-kpi`: Moc, Emisje, Limit UEiE, ESG | `renderCompanyCardOverview` |
| Karta spółki → Zarządzanie | sekcja Energia: liczby, bloki, zlecenia | `renderCompanyCardManage`, nowa `renderEnergyManage(stock)` nad `renderStrategyOrders` |
| Budownictwo → Podwykonawcy | specjalności `energy` i `geology` | `renderConstructionSubcontractorsList` |

## Elementy
| Element | Markup | Uwagi |
|---|---|---|
| Miks | `.en-mix` + `.en-legend`, typ w `.en-t-coal/gas/nuclear/oze` | `role="img"` z całym miksem w `aria-label`; legenda: ikona, nazwa, %, GW |
| Bilans | `.en-state`, `limit-meter.en-wide` | skala 0–110% mocy, kreska na 100%; plakietka Nadwyżka (`badge--up`), Równowaga (`--neutral`), Niedobór (`--warn`), Blackout (`--down`) |
| Cena prądu | `asset-mini-table` | udział i koszt typu, zdanie o ustawie „Dostawcy energii” |
| Bloki w budowie | `.en-rows` | spółka, typ, kw. X z Y, moc; projekt państwowy z limitem typu i „Przetarg” |
| Zanieczyszczenie | `.en-value`, `limit-meter` z kreską limitu | poziom słowem, zmiana ▲▼, opłata; najwięksi emitenci od poziomu 2 UEiE |
| Poziom życia | `.en-factors` | 5 czynników: ikona, słowo, liczba, pasek; czynnik poniżej 50 `is-warn` i powód w `<small>` |
| Blok | `.en-block` + `.is-run`, `.is-build`, `.is-wait`, `.is-locked` | Budowa, Czeka na zgodę, Działa, Awaria, Zablokowany; zawsze powód i liczba |
| Zlecenie | `.en-orders` > `.en-order` | koszt, czas, wykonawca, „Zleć”; w toku pasek; wynik jako zwykła karta |
| Poziomy UEiE | `.crisis-axis.en-levels` | 6 kroków, przy 390 px jedna kolumna |

## Stany puste i błędy
| Stan | Treść |
|---|---|
| Przed pierwszym kwartałem | „Dane pojawią się po pierwszym kwartale gry.” |
| Brak budów | „Żadna spółka nie buduje teraz nowych bloków. Budowy ruszają przy niedoborze mocy i wysokiej cenie prądu.” |
| UEiE poziom 0 | `notice-inline`: „Urząd nie mierzy emisji i nie ma limitów. Pomiar pojawi się od poziomu 1.” |
| Zdrowie przy UEiE 0 | w `.en-factors` „brak pomiaru” zamiast liczby i paska |
| Debug | `notice-inline.is-warn`: „Tryb debug: emisje widoczne mimo braku pomiaru.” |
| Niedobór | `alert--warn` z liczbą GW i procentem |
| Zanieczyszczenie krytyczne | `alert--warn`, skutki słowem i liczbą |
| Blackout | `alert--warn`, ikona `blackout`, skutki i czas |
| Ponad limit UEiE | `alert--warn` w sekcji Energia spółki: kwota kary i co zrobić |
| Bez kontroli | „Zlecać może tylko większościowy akcjonariusz. Teraz masz 12%.” |
| Blokady | przy przycisku, przycisk `disabled`: brak gotówki z brakującą kwotą, zajęci geolodzy, limit typu, brak zgody UEiE, poprzedni blok |

Spółka spoza energetyki nie ma sekcji Energia ani kafelka Moc. Kafelki Emisje i Limit widać u każdej spółki z emisjami, gdy urząd je mierzy.

## Decyzje użytkownika (2026-11-07)
1. **Jednostki:** GW i PLN/MWh. Czat kodu przelicza `capacity`.
2. **Widoczność emisji:** UEiE 0 nic, poziom 1 kraj, poziom 2 spółki. Debug pokazuje wszystko.
3. **Poziom życia przy UEiE 0:** wskaźnik zostaje, ale czynnik „Zdrowie” ma napis „brak pomiaru”.
4. **Poziomy UEiE:** 0 bez limitów, 1 pomiar kraju, 2 pomiar spółek i limit z karą, 3 częstsze kontrole i ścieżka ESG, 4 dokładny pomiar i wyższe kary, 5 pełny nadzór.
5. **ESG:** od poziomu 3 przycisk „Wejdź na ścieżkę ESG”: jednorazowy koszt, potem niższe emisje. Liczby stroi czat kodu, rozwinięcie w 0.18.
6. **Progi słowne:** 5 słów co 20 pkt. Zanieczyszczenie: bardzo niskie, niskie, umiarkowane, wysokie, krytyczne. Poziom życia: bardzo niski, niski, przeciętny, wysoki, bardzo wysoki. Opinia: bardzo nieprzychylna, nieprzychylna, neutralna, przychylna, bardzo przychylna.
7. **Emisje spółki:** udział w emisjach kraju, np. „6% kraju”.
8. **Polityka klimatyczna:** nazwy brak opłat, niska, średnia, wysoka, bardzo wysoka. Stawki 0%, 0,6%, 1,2%, 1,8%, 2,5% to punkt startu do strojenia.
9. **„Najnowsze technologie”:** osobne zlecenie z kosztem, czasem i wynikiem, jak u geologa. To nowy mechanizm obok R&D. Wykonawcę i powiązanie z R&D ustala czat kodu z planem.
10. **Dotacja UEiE:** tak, z konta prywatnego, jak KNF.
11. **Bloki poza atomem:** dowolna liczba, po kolei. Ogranicza je gotówka i niedobór mocy.
12. **Produkcja:** wysokie zanieczyszczenie daje mały spadek produkcji. Makieta pokazuje to przy poziomie „krytyczne”, próg i wartość do strojenia.

## Prompt dla czatu kodu (E2, E10)
> Wdróż wygląd 0.17.2 wg `plany/design/11_energia_0.17.2.md` i makiety `plany/design/makiety/11_energia_0172.html`. Klasy `.en-*` i ikony są gotowe, nie dopisuj tokenów. Zakładka Energia: `renderEnergyPanel` i przycisk w `index.html`, gałąź w `updateStateModalContent`. Spółka: `renderEnergyManage(stock)` w `renderCompanyCardManage`, kafelki w `renderCompanyCardOverview`. Reszta: karta `ueie` w `renderOversightPanel`, `renderCountryPanel`, `renderCountryCard`, `renderMarketModal`, `renderConstructionSubcontractorsList`. Paski przez `renderLimitMeter`. Skale: bilans 0–110% mocy, relacje liczbowe w tekście obok paska. W komunikatach o blokach zamień „regulator” na UEiE, ikony przez `uiIcon` zamiast emoji w nowych tekstach UI. Trzymaj się sekcji „Decyzje użytkownika”, punkty 5, 9 i 12 wymagają mechaniki poza dotychczasowym planem. Testy: 1 na miks (wszystkie typy słowem), 1 na stany bilansu, 1 na blokadę kolejnego bloku, 1 na UEiE poziom 0 bez wartości emisji, 1 na spółkę spoza energetyki. Sprawdź w przeglądarce na desktopie i 390 px, commit po polsku.
