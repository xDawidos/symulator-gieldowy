# Projekt UI 0.18: karta łańcucha i wiersz w karcie spółki

Data: 2026-11-10 · zlecenie: `plany/plan_0.18_lancuchy_produkcyjne.md` (L4, „Zlecenie dla czatu designu” pkt 1, 2, 4) i `plany/plan_seria_0.18_towary_ipo_miasta.md` (sekcje 3 i 5) · makieta: [makiety/13_lancuch_018.html](makiety/13_lancuch_018.html) · CSS: [makiety/018.css](makiety/018.css) · ikony: [makiety/018_ikony.svg](makiety/018_ikony.svg).

To projekt dla czatu kodu. Makieta generuje markup z tablic `NODES`, `EDGES`, `COLS`. To ten sam kształt danych, który da rejestr `CHAINS` i stan bilansu, więc funkcje `nodeHtml`, `renderAxis` i `drawEdges` z makiety można przenieść prawie bez zmian. Liczby są przykładowe.

## Decyzje użytkownika (2026-11-10)
1. **Miejsce:** Państwo → nowa zakładka **Łańcuchy** za „Energia”. Bez nowego okna.
2. **Kształt:** kafle z pełnymi danymi w 6 kolumnach ogniw (wydobycie, hutnictwo, fabryka, spedycja, dystrybucja, konsumpcja), wyśrodkowane w pionie. Między kaflami krawędzie SVG: grubość to ilość towaru, styl to stan dostawcy. Pas przepływu i osobny graf węzłów odpadły.
3. **Status ogniwa** z bilansu `b = podaż / popyt`: Nadwyżka (b ≥ 1,05, `badge--up`), Równowaga (0,95–1,05, `badge--neutral`), Napięte (0,85–0,95, `badge--warn`), Niedobór (0,6–0,85, `badge--warn`), Przerwane (< 0,6, `badge--down`). Zawsze ikona, słowo i liczba „pokrycie X%”.

## Co pokazuje
| Element | Dane | Markup / komponent |
|---|---|---|
| Wybór łańcucha | 3 łańcuchy pilotażu, później 10; „szok” przy łańcuchu w szoku | `.sector-chips` + `.sector-chip` z ikoną |
| Pasek liczb | najsłabsze ogniwo, pokrycie popytu obywateli, cena na końcu łańcucha wobec startu, zapas w łańcuchu wobec celu | `.bank-ticker` |
| Nagłówki kolumn | nazwa i ikona ogniwa | `.ch-heads` (w kolumnie ukryte `h5` dla czytnika) |
| Kafel ogniwa | nazwa, klasa dobra M/P/K/Z/L, status, pokrycie, zapas w kw. (pasek, kreska = cel 0,5 kw.), wykorzystanie zdolności, zmiana ceny wewnętrznej, główne kraje | `<button class="ch-node st-*">`, `.gd-cls`, `badge`, `limit-meter`; `aria-label` z całym statusem |
| Krawędzie | przepływ dostawca → odbiorca; szara: normalnie, bursztynowa: napięte, czerwone kropki: niedobór lub przerwa | `<svg class="ch-edges">`, `path.g-edge.is-tight / .is-broken`, `stroke-width` = ilość |
| Szczegóły ogniwa | tabela kraj: podaż, popyt, bilans; zapas wobec celu; zdolność; wsady (udział w koszcie); odbiorcy (udziały z planu, priorytet obronności) | `.ch-detail` z dwiema `.bank-card`, `asset-mini-table`, `limit-meter` |
| Szok podażowy (6. linia kryzysu) | przyczyna, kraj, skala, czas; etap; kto traci i kto zyskuje (zmiana marży) | `alert--warn` z ikoną `szok`, `.crisis-axis` (etapy z `CRISIS_STAGE_NAMES`), `.ch-gainers` |
| Karta spółki → Przegląd | ogniwo i łańcuch, zapas wobec celu, wystawienie na szok słowem (niskie, średnie, wysokie) + udział wsadu w koszcie | 3 × `.cc-kpi`, za kafelkami 0.17.2; link „Zobacz łańcuch …” otwiera zakładkę z zaznaczonym ogniwem |

## Funkcje w kodzie (propozycja)
- `renderChainsPanel()` w zakładce `chains` (`index.html`: przycisk `data-tab="chains"`, gałąź w `updateStateModalContent`).
- `renderChainAxis(chain)` daje markup kolumn. `drawChainEdges(flowEl)` mierzy kafle (`getBoundingClientRect`) i rysuje krzywe. Wywołuje się je po renderze i z `ResizeObserver`, ale tylko gdy zakładka jest otwarta (zasada ×200: zamknięte panele nie liczą widoków).
- Kafelki spółki w `renderCompanyCardOverview`, tylko gdy podsektor spółki jest ogniwem.
- Ikony: przenieść 10 symboli z `018_ikony.svg` do `img/ikony/` i `UI_ICON_PATHS`. W ikonach ogniw zamienić emoji z tekstów zdarzeń surowcowych (K5) na `uiIcon`.

## Telefon (≤ 860 px)
Jedna kolumna, kafle ogniwa obok siebie (`auto-fill`, min 150 px), między ogniwami strzałka ↓. Krawędzi nie rysujemy, więc stan niesie kafel. Sprawdzone przy 375 px, bez przewijania w poziomie.

## Stany puste i szczególne
| Stan | Treść |
|---|---|
| Przed pierwszym kwartałem | „Dane pojawią się po pierwszym kwartale gry.” |
| Tryb pomiaru (0.18.1, graf cichy) | `notice-inline`: „Tryb pomiaru (0.18.1): łańcuch liczy podaż i popyt, ale jeszcze nie zmienia wyników spółek.” |
| Brak szoku | `notice-inline` z `ok`, sekcja szoku znika |
| Import zablokowany | `notice-inline.is-warn` z przepustowością portów (0.17 S5) |
| Łańcuch jeszcze niedostępny | `notice-inline` z `klodka` i wersją |

## Prompt dla czatu kodu (L4)
> Wdróż wygląd karty łańcucha wg `plany/design/13_lancuch_0.18.md` i makiety `plany/design/makiety/13_lancuch_018.html`. Blok `plany/design/makiety/018.css` dopisz na końcu `style.css` jako „0.18”, a ikony z `018_ikony.svg` przenieś do `img/ikony/` i `UI_ICON_PATHS`. Zakładka Łańcuchy w Państwie: `renderChainsPanel`, `renderChainAxis` i `drawChainEdges` (wzór w skrypcie makiety, dane z `CHAINS` i stanu bilansu), krawędzie rysuj tylko przy otwartej zakładce. Kafelki ogniwa w `renderCompanyCardOverview`. Progi statusu jak w sekcji „Decyzje”. Testy: progi `statusOf` (5 stanów), `aria-label` kafla ze słowem i liczbą, brak kafelków u spółki spoza łańcucha. Sprawdź w przeglądarce przy 1280 i 390 px, commit po polsku.
