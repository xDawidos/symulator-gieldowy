# 36. Projekty ESG (okno Inwestycje spółki; 0.18.9 G4) — do akceptacji (2026-11-23)

Makieta: [makiety/36_projekty_esg.html](makiety/36_projekty_esg.html) (samodzielna). Plan: `plany/plan_0.18.9_esg.md`, G4. Bez nowego okna: istniejące okno `openCompanyInvestments` dostaje dwie sekcje, a karty z katalogu opcję „wersja eko”.

## Co pokazuje okno
| Część | Treść | Dane | Markup / ARIA |
|---|---|---|---|
| Nagłówek | spółka, ticker, przychód roczny; „kontrolujesz, 54% głosów” bursztynem (R4) albo „masz 12% głosów” | głosy gracza | `section[aria-labelledby]` |
| Ocena teraz | znaczek (publiczna albo Twoje badanie), słowo, punkty, filary z punktami | `getEsgRating`, badanie | `.now` |
| Projekty ESG | lista 9 pozycji: ikona, nazwa, filar (litera i nazwa), opis; skutek słowem i liczbą („Społeczeństwo +6 pkt (średni)”, mały do 4, średni 5–8, duży od 9) i skutek dodatkowy; przycisk „Zleć za X PLN” z udziałem przychodu i czasem; trwający projekt: przycisk „w toku” wyłączony | `ESG_PROJECTS` (nowe) | `ul.pj`, przycisk z pełnym `aria-label` |
| Bez kontroli | ramka z kłódką: projekty zleca większościowiec albo walne; przyciski wyłączone | — | `p.nocontrol` |
| Trwające projekty | nazwa, od kiedy, skutek po zakończeniu, pasek postępu w kwartałach | `stock.esgProjects[]` | pasek `role=img` |
| Ulepszenie eko | na karcie pozycji z emisjami albo produkcją pole „Wersja eko”: koszt +20% w PLN, emisje niższe o 5 pp, pasek redukcji emisji (dziś, po ulepszeniu, maks. 70%); przycisk „Buduj za X” z ceną po wyborze | `INVESTMENT_CATALOG`, `getStockEcoCut`, `ecoMax` | `label > input[type=checkbox]` |

Filary nie mają własnych barw: kolory należą do liter A–D, a filar rozpoznaje się po literze filaru, nazwie i ikonie. Telefon: wiersze projektów w dwóch kolumnach (ikona i treść), przycisk pod skutkiem.

## Liczby w makiecie (propozycja, kalibracja w G11)
| Projekt | Filar | Koszt (% przychodu) | Czas | Skutek |
|---|---|---|---|---|
| Nasadzenia leśne | E | 0,5% | 2 kw. | +4 |
| Oczyszczalnia ścieków | E | 2% | 4 kw. | +8, incydenty o 30% rzadsze |
| Panele na dachach zakładów | E | 3% | 3 kw. | +6, energia o 4% tańsza |
| Recykling opakowań | E | 1% | 2 kw. | +5 |
| Program dla lokalnej społeczności | S | 0,5% | 2 kw. | +5 |
| Szkolenia i staże | S | 1% | 4 kw. | +6, zadowolenie +3 |
| Fundacja edukacyjna | S | 1,5% | 4 kw. | +8 |
| Audyt łańcucha dostaw | G | 0,8% | 2 kw. | +6, ujawnia powiązania z D |
| Program antykorupcyjny | G | 1% | 3 kw. | +10 |

## Do planu (czat planowania)
- Gracz bez większości: czy może zgłosić projekt jako uchwałę na walnym (makieta to sugeruje w ramce), czy tylko większościowiec? Plan mówi „WZA albo większość”.

## Prompt dla czatu kodu
> Według `plany/design/36_projekty_esg.md` i makiety `plany/design/makiety/36_projekty_esg.html` (po wdrożeniu G4 planu 0.18.9): w oknie Inwestycje spółki (`openCompanyInvestments`) dodaj nad katalogiem stan oceny ESG spółki, sekcję „Projekty ESG” z `ESG_PROJECTS` (ikona, filar z nazwą, opis, skutek słowem i liczbą, koszt w PLN z udziałem przychodu i czasem, przycisk „Zleć” wyłączony dla projektu w toku i bez kontroli spółki, z ramką powodu) i sekcję „Trwające projekty” z paskiem postępu w kwartałach. Pozycje `INVESTMENT_CATALOG` z emisjami lub produkcją dostają pole „Wersja eko” (koszt +20%, `ecoCut` +5 pp do `ecoMax`) z paskiem redukcji emisji i ceną w przycisku. Bez nowego okna i bez emoji. Testy DOM: 9 projektów z filarem i skutkiem słowem; przycisk wyłączony bez kontroli i dla projektu w toku; zlecenie dodaje pozycję do trwających; wersja eko zmienia koszt o 20%.
