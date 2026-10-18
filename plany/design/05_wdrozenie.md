# 0.14.5 Redesign — krok 5: wdrożenie nowego UI

Data: 2026-10-18 · podstawa: [03_system.md](03_system.md), [04_teksty.md](04_teksty.md), makiety w Figmie (plik 9fhi6NP9nIdIiz4tg6X8Mk, strony „01 Kierunki” — wariant A, „02 System”).
Skill `frontend-design` nie był dostępny w tej sesji — wdrożenie według makiet i biblioteki z Figmy.

## Części i commity
| Część | Commit | Co |
|---|---|---|
| 5.1 Fundament | `e839006` | `tokens.css` przed `style.css`, IBM Plex Sans/Mono, stare zmienne jako aliasy tokenów, wszystkie zaokrąglenia na tokenach, tylko ciemny motyw, globalny `:focus-visible`, `prefers-reduced-motion` wyłącza animacje i przejścia |
| 5.2 Marka i pasek | `f9489b4` | Capital Quest (logo, tytuł karty z nazwą funduszu), pasek 60 px: 4 KPI, data gry, prędkość, pauza, menu ☰ (Zapisz grę / Eksportuj zapis / Ustawienia / Nowa gra…); formatery `formatNumberPl`/`formatZl` (PLN)/`formatPLNShort`/`formatPct` (minus −)/`formatNav`; okno „Nowa gra” zamiast `confirm()`; `gameConfirm` z tytułem-pytaniem i przyciskiem z nazwą działania |
| 5.3 Tabela akcji | `f429662` | ikony SVG (30 interfejsu + 18 sektorów), chipy jako `<button aria-pressed>`, kwadraty kolorów giełd, wiersz 40 px z nazwą w jednej linii, chip zmiany ▲/▼, sortowanie z `aria-sort`, panel handlu z podpisanymi narzędziami; wydajność bez spadku |
| 5.4 Menu i panele | `1efa6ca` | menu w grupach Świat / Moja firma / Ja, panel funduszu (przełącznik kont, mini-KPI, ramka stanu, zwijane sekcje), „udziały” zamiast „JU” w widoku; naprawa `position: sticky` (`overflow-x: clip`, `min-height` powłoki) |
| 5.5 Okna | `2413f56`, `8d8c1a8` | wspólna obsługa okien (role, zasłona, fokus do okna i z powrotem, pułapka Tab, Escape), jeden wygląd okna z paskiem akcentu sekcji, okna sekcji bez gradientów, karta spółki, wykres (świeca rosnąca pusta), poczta i klienci z klawiatury; `index.html` bez emoji i z poprawnymi wielkimi literami |
| 5.6 Newsy i dymki | `8dcb952` | przycisk pauzy paska newsów, pauza przy fokusie; powiadomienia: 2 widoczne + „+N”, pod zasłoną okna; komunikaty w stylu Toast, czas zależny od długości tekstu |
| 5.7 Mobile i przewijanie | `6385ece` | jedno przewijanie strony (usunięty `max-height: 60vh` paneli), przyklejony panel funduszu i nagłówek kolumn; ≤ 860 px: pasek 109 px, szuflada menu, tabela jako karty-wiersze, okna na pełną szerokość |
| 5.8 Teksty w logice | `ad82687` | PLN, „udziały”, nazwy giełd bez emoji, „Wznów / Pauza” w plikach logiki — same napisy |
| 5.9 Domknięcie | (ten commit) | cele kliknięcia ≥ 24 px w nagłówkach, ten dokument, mapa |

Testy po każdej części: **457/457**. Logika gry i nazwy funkcji używanych przez testy bez zmian.

## Pomiary przed → po (pulpit, 1440×900, ciemny motyw)
| Miara | Przed (krok 1–2) | Po |
|---|---|---|
| Wysokość paska górnego | 270 px (30% ekranu) | 60 px |
| Pasek górny na telefonie (390 px) | ok. 600 px, przyklejony | 109 px |
| Średnia wysokość wiersza spółki | 91 px (maks. 142) | 43 px |
| Spółki widoczne naraz | 2–3 | ok. 20 |
| Paski przewijania | 2 obok siebie (rynek + strona) | 1 (strona) + panel funduszu z prawej |
| Teksty poniżej AA na pulpicie | 3 grupy (ciemny), 9 (jasny) | 0 |
| Cele kliknięcia < 24 px | 99 | 2 (pola wyboru z klikalną etykietą — wyjątek WCAG) |
| Elementy obsługiwane tylko myszą | 9 grup (wiersze, chipy, sortowanie, poczta, klienci…) | 0 |
| Okna z `role="dialog"` | 5 z 41 | wszystkie (wspólna obsługa) |
| `displayStocks` (148 wierszy, naprzemiennie) | 24,8 ms | 23,8 ms |
| Waluta | PLN i zł wymieszane | PLN (poza listem Babci) |

## Zmiany techniczne ważne dla czatu kodu
- `tokens.css` jest **generowany** z `plany/design/tokens.json` (`python plany/design/narzedzia/gen_tokens.py`) — nowe kolory/odstępy dodawać tam, nie w CSS.
- Nowe pomocnicze funkcje widoku w ui.js: `uiIcon(nazwa, rozmiar)`, `uiIconNode(…)` (klon węzła — w gorących pętlach), `sectorIcon(sektor)`, `exchangeDot(klucz)`, `stripEmoji(tekst)`, `formatNumberPl`, `formatPLNShort`, `formatNav`, `requestNewGame()`, `toggleTopbarMenu()`, `toggleNewsTickerPause()`, `updateNotificationOverflow()`. `formatZl` zwraca teraz „… PLN”.
- `gameConfirm(tekst, akcja, { title, confirmLabel, cancelLabel, danger })` — trzeci parametr opcjonalny.
- Okna nie wymagają już kodu do dostępności: wystarczy klasa `.modal` (albo `.intro-overlay`) i `style.display`/`hidden` — `initDialogA11y` sam doda rolę, zasłonę i fokus.
- `displayStocks` buduje wiersze w odpiętym `tbody` i podmienia je `replaceChildren` (żywy `#stock-table-body` zostaje ten sam).
- Klasy komponentów: `.btn-primary|secondary|ghost|danger`, `.btn-sm`, `.icon-btn`, `.sector-chip.active`, `.badge--…`, `.alert--warn|down|info|up`, `.change-pill.up|down|flat`, `.modal` (+ `--modal-accent`), `.panel-head`, `.panel-toggle`, `.sr-only`, `.tone-…`.

## Co zostało (do kroku 6 / 7 albo jako dług)
- **Stare warstwy CSS:** `style.css` nadal zawiera stary ciemny motyw i wcześniejsze generacje reguł (nadpisane nowymi blokami o wyższej szczegółowości). Porządki (usunięcie martwych reguł) najlepiej po kroku 7 z porównaniem zrzutów.
- **Emoji w treściach z logiki:** logi, maile, nazwy wydarzeń i ikony typów klientów nadal mają emoji (powiadomienia je usuwają przez `stripEmoji`). Zgodnie z zasadą 9 z kroku 4 emoji w treściach fabularnych mogą zostać; reszta do decyzji w kroku 6.
- **Liczby w logice:** część komunikatów z plików logiki ma jeszcze kropkę dziesiętną (`toFixed`) — waluta jest już PLN.
- **Okna nieprzejrzane wizualnie:** Państwo, Miasto, Budownictwo, Szara strefa, Korporacja, M&A, B+R — korzystają z nowego wyglądu okna, ale nie sprawdziłem ich zrzut po zrzucie (krok 7).
- **Filtry sektorów na desktopie** zajmują 3 rzędy — można je zwinąć do jednego rzędu z menu grup (propozycja na krok 7).
- **Makiety ekranów w Figmie (strona „03 Ekrany”)** — nie powstały; wdrożenie oparłem na wariancie A i bibliotece komponentów.

## Zlecenie z czatu planowania: UI wersji 0.15 „Hossa i bessa”
Czat planowania (decyzja użytkownika) dodał osobny krok: zaprojektować w Figmie i opisać w `05b_ui_0.15.md` nowe elementy 0.15 (KPI nastroju rynku w pasku, okno „Rynek”, kolumna „Premia sektora”, „Osiągnięcia” w CV, dwa poziomy Analityka Indeksowego). Proponuję wykonać go **jako następny krok (5b), przed krokiem 6**, po scaleniu `zmiany-AI` (plan w `plany/plan_0.15_hossa_bessa.md`, commit cb0a4f6).
