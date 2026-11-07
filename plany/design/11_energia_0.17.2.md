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
| Zanieczyszczenie | `.en-value`, `limit-meter` z kreską limitu | poziom słowem, zmiana ▲▼, opłata; najwięksi emitenci od poziomu UEiE ze spółkami |
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
| Debug | `notice-inline.is-warn`: „Tryb debug: emisje widoczne mimo braku pomiaru.” |
| Niedobór | `alert--warn` z liczbą GW i procentem |
| Blackout | `alert--warn`, ikona `blackout`, skutki i czas |
| Ponad limit UEiE | `alert--warn` w sekcji Energia spółki: kwota kary i co zrobić |
| Bez kontroli | „Zlecać może tylko większościowy akcjonariusz. Teraz masz 12%.” |
| Blokady | przy przycisku, przycisk `disabled`: brak gotówki z brakującą kwotą, zajęci geolodzy, limit typu, brak zgody UEiE, poprzedni blok |

Spółka spoza energetyki nie ma sekcji Energia ani kafelka Moc. Kafelki Emisje i Limit widać u każdej spółki z emisjami, gdy urząd je mierzy.

## Rozbieżności i decyzje
Mechaniki nie zmieniałem. Poniższe wymaga decyzji albo potwierdzenia. Propozycje są w makiecie, ale nie są ustalone.

1. **Jednostki.** Plan nie podaje jednostek mocy ani ceny. Makieta używa GW i PLN/MWh. Trzeba przeliczyć `capacity`, inaczej pokazać punkty mocy.
2. **Widoczność przy UEiE 0.** Plan mówi tylko, że debug pokazuje emisje od początku. Makieta przyjmuje: poziom 0 bez wartości, 1 kraj, 2 spółki.
3. **Poziom życia przy UEiE 0.** Czynnik „Zdrowie” zależy od zanieczyszczenia, więc gracz może je wyliczyć mimo braku pomiaru. Makieta nie blokuje poziomu życia.
4. **Poziomy UEiE.** Plan nie rozpisuje progów. Etykiety 6 kroków i dostęp do ESG od poziomu 3 to propozycja.
5. **ESG.** Plan nie podaje kosztu ani ścieżki przed 0.18. Makieta ma tylko notkę i kafelek stanu, bez przycisku startu.
6. **Progi słowne.** Plan nie ma słów dla zanieczyszczenia, poziomu życia i opinii. Makieta używa m.in. „wysokie”, „przeciętny”, „przychylna”. Propozycja: co 20 pkt.
7. **Skala emisji spółki.** Wzór nie ma jednostki. Makieta pokazuje udział w emisjach kraju, np. „6% kraju”.
8. **Opłata klimatyczna.** Plan nie podaje stawek ani nazw 5 poziomów. Wartości na osi to przykład.
9. **Zlecenie „Najnowsze technologie”.** Plan mówi o rynku podwykonawców, ale wykonawcą jest istniejący system R&D. Makieta pokazuje kartę, nie przesądza, czy to zlecenie, czy przejście do badań.
10. **Dotacja gracza dla UEiE.** Plan mówi „jak KNF”, więc karta ma dotację z portfela prywatnego. Do potwierdzenia, bo to wpływ na limity własnych spółek.
11. **Bloki poza atomem.** Plan nie mówi, ile bloków ma spółka węglowa, gazowa i OZE. Makieta pokazuje listę.
12. **„Produkcja” jako skutek zanieczyszczeń** jest w planie do potwierdzenia, a nie ma osobnego widoku.

## Prompt dla czatu kodu (E2, E10)
> Wdróż wygląd 0.17.2 wg `plany/design/11_energia_0.17.2.md` i makiety `plany/design/makiety/11_energia_0172.html`. Klasy `.en-*` i ikony są gotowe, nie dopisuj tokenów. Zakładka Energia: `renderEnergyPanel` i przycisk w `index.html`, gałąź w `updateStateModalContent`. Spółka: `renderEnergyManage(stock)` w `renderCompanyCardManage`, kafelki w `renderCompanyCardOverview`. Reszta: karta `ueie` w `renderOversightPanel`, `renderCountryPanel`, `renderCountryCard`, `renderMarketModal`, `renderConstructionSubcontractorsList`. Paski przez `renderLimitMeter`. Skale: bilans 0–110% mocy, relacje liczbowe w tekście obok paska. W komunikatach o blokach zamień „regulator” na UEiE, ikony przez `uiIcon` zamiast emoji w nowych tekstach UI. Punkty z sekcji „Rozbieżności i decyzje” zgłoś użytkownikowi, nie rozstrzygaj sam. Testy: 1 na miks (wszystkie typy słowem), 1 na stany bilansu, 1 na blokadę kolejnego bloku, 1 na UEiE poziom 0 bez wartości emisji, 1 na spółkę spoza energetyki. Sprawdź w przeglądarce na desktopie i 390 px, commit po polsku.
