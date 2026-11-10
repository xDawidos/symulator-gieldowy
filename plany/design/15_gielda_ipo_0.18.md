# Projekt UI 0.18: giełda towarowa, debiuty (IPO), ocena kredytowa, wymogi giełd

Data: 2026-11-10 · zlecenie: `plany/plan_seria_0.18_towary_ipo_miasta.md` (sekcja 2: nowe kontrakty, K3; sekcja 6: IPO; 0.18.2 i 0.18.11) · makieta: [makiety/15_gielda_ipo_018.html](makiety/15_gielda_ipo_018.html) · CSS: bloki „Ocena kredytowa” i „Debiuty” w [makiety/018.css](makiety/018.css).

Makieta jest statyczna, każdy stan ma osobny przykład. Liczby, nazwy spółek, audytorów i banków są przykładowe.

## Decyzje użytkownika (2026-11-10)
1. **Zakres IPO:** widok inwestora (kalendarz debiutów i zapis), ocena kredytowa na karcie spółki, ściąga wymogów. **Bez** ścieżki emisji dla gracza-właściciela (gracz nie wybiera opiekuna ani audytora w tej wersji).
2. **Miejsce:** strona Startupy, nowa sekcja **„Debiuty”** pod tabelą startupów. Drabinka `.sc-steps` rośnie do 5 kroków: Zbiórka → Rozwój → Audyt → Subskrypcja → Rynek.

## Co pokazuje
| Element | Dane | Markup / komponent |
|---|---|---|
| Giełda towarowa | „Metale” znikają, wchodzą Ruda żelaza i Miedź (`badge--info` „nowy”), Kawa jako 8. kontrakt; nowa kolumna „Bilans w grze”: wpływ bilansu dobra na cel ceny (▲ niedobór +X%, ▼ nadwyżka −X%, ■ równowaga, „tylko kontrakt”) | istniejąca tabela 0.17 (`asset-mini-table`, `.cm-name`), ikony `surowiec-iron`, `surowiec-copper`, `surowiec-coffee` |
| Migracja metali | jednorazowa notka po wczytaniu starego zapisu: pozycje na metale zamknięte po cenie z dnia zmiany, wynik na koncie prywatnym | `notice-inline` |
| ETF koszykowy | 8 surowców, kawa poza koszykiem | `.bank-card` |
| Karta debiutu | nazwa, symbol, stan (zapisy otwarte, wycofany, na giełdzie); sektor i pochodzenie; rynek docelowy i poziom startowy; ocena i audytor; opiekun (reputacja 1–5, prowizja); cena emisyjna, wycena, dyskonto; wielkość oferty; zapisy jako krotność oferty | `.ipo-card.is-open / .is-pulled / .is-done`, `.ipo-facts` (`dl`), `limit-meter` |
| Pasek zapisów | przy nadsubskrypcji pasek pełny, a kreska stoi na 100% oferty (1/krotność). Poniżej 100% `is-warn`, kreska na końcu. Zawsze też słowami: krotność i szacowany przydział | `limit-meter` + `aria-label` |
| Zapis | kwota z konta prywatnego, przeliczenie na akcje, przydział przy obecnej redukcji, termin | `.ipo-form`, `btn-primary` |
| Wynik | przydział i zwrot, zmiana ceny 1. dnia (premia hossy), zwrot po wycofaniu | `.ipo-card.is-done / .is-pulled` |
| Ocena kredytowa | litery i słowo klasy: inwestycyjna (AAA–A), inwestycyjna najniższa (BBB), spekulacyjna (BB–B), zagrożona (CCC), niewypłacalna (D), brak oceny, wygasła | `.cr-badge.is-inv / .is-mid / .is-spec / .is-bad / .is-none` |
| Karta spółki | kafelek „Ocena”, ważność w kw., audytor w `title`; blokada awansu na wyższą giełdę; cofnięcie oceny po przekupstwie | `.cc-kpi`, `notice-inline.is-warn` z `klodka`, `alert--warn` z ikoną `audyt` |
| Wymogi | rynki PRV/NH/GPW (kapitalizacja, free float, zysk, ocena); poziomy od Śmieciowej do Diamentowej (cena albo ranking, ocena) | `asset-mini-table.req-table` w `<details>`; to samo w Akademii |

## Zasady
- Ocena zawsze literami i słowem, kolor tylko wspiera. „Brak oceny” ma przerywaną ramkę i `title`: spółki zwykle ujawniają tylko oceny od A, więc brak oceny często znaczy słabą spółkę (błąd selekcji z planu 6.4).
- Kwoty zapisu, zwroty i kary w PLN, z konta prywatnego gracza.
- Bez nowego okna: zapis odbywa się w karcie debiutu. Toast tylko po zapisie i przy wyniku debiutu.

## Stany puste i blokady
| Stan | Treść |
|---|---|
| Brak debiutów | „W tym kwartale nie ma debiutów. Startupy z oceną wejdą do zapisów po audycie.” |
| Brak gotówki | `notice-inline.is-warn` z brakującą kwotą, przycisk `disabled` |
| Sufit giełdy | `notice-inline` z `zegar`: zajęte miejsca (np. 132 z 130), czas czekania X z 4 kw. |

## Do sprawdzenia w planie
- Rozliczenie otwartych pozycji na „metale” przy podziale (makieta zakłada zamknięcie po cenie z dnia zmiany). Plan mówi tylko o cenach.
- Czy gracz ma limit zapisu na jeden debiut.

## Prompt dla czatu kodu (0.18.2 i 0.18.11)
> Wdróż wygląd wg `plany/design/15_gielda_ipo_0.18.md` i makiety `plany/design/makiety/15_gielda_ipo_018.html` (CSS w bloku 0.18). Giełda towarowa: nowe wiersze i kolumna „Bilans w grze” w `commodity_market.js`, notka migracji metali jednorazowo po wczytaniu zapisu. Startupy: drabinka 5 kroków w `STARTUP_STEPS` i `STARTUP_STAGE_INFO`, nowa sekcja `renderIpoSection()` pod `displayStartups` z kartami `.ipo-card` i zapisem z konta prywatnego. Karta spółki: kafelek „Ocena” i notka blokady awansu w `renderCompanyCardOverview`. Ściąga wymogów w Akademii i w `<details>` pod Debiutami. Testy: klasa `.cr-badge` dla AAA, BBB, BB, CCC, D i braku oceny; pasek zapisów przy 0,6× i 2,4× (`aria-label` z liczbą); blokada awansu bez oceny. Sprawdź przy 1280 i 390 px, commit po polsku.
