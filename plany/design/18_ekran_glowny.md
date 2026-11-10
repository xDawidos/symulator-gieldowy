# Projekt UI: ekran główny (R1–R8 z listy 2026-11-10)

Data: 2026-11-10 · źródło: [17_przeglad_2026-11-10.md](17_przeglad_2026-11-10.md), sekcja „Do realizacji” (R1–R8, R10–R12) · makieta: [makiety/18_ekran_glowny.html](makiety/18_ekran_glowny.html) (3 ramki: desktop w toku, telefon 390 px z szufladą, start gry).

CSS makiety jest kompletny i od razu do użycia. Klasy `.ms-*` to nowe nazwy; czat kodu podmienia nimi obecne `.topbar*`, `#stock-table`, `.dashboard-*` albo mapuje je na istniejące elementy (tabela niżej). Telefon jest zrobiony przez `@container (max-width: 640px)`; w grze to samo jako `@media (max-width: 640px)`. Liczby i spółki są przykładowe.

## Decyzje projektu
1. **Jedna zapamiętywalna rzecz: giełda jako szkielet listy.** Nagłówek giełdy to płytka z krawędzią 3 px w kolorze metalu (`--exchange-*`), nazwą w Plex Sans Condensed, regułą wejścia („kurs do 20 PLN”, „kurs od 400 PLN, ocena BBB”) i liczbą spółek. Wzdłuż wierszy grupy biegnie szyna 3 px w tym samym kolorze (35%). Nagłówek jest przyklejony (`sticky`) pod paskiem.
2. **Bursztyn = „to jest Twoje”:** gotówka funduszu, konto prywatne, liczba Twoich akcji, główny przycisk sesji, aktywna zakładka dolnej nawigacji, plakietka Poczty. Nic więcej. Kierunek zmian: tylko zieleń i czerwień ze znakiem ▲▼.
3. **Typografia:** Plex Sans Condensed (giełdy, tickery, tytuły sekcji, logo), Plex Sans (nazwy, opisy, etykiety), Plex Mono tylko dla liczb (`tabular-nums`). **Zero wersalików**, także w nagłówkach kolumn. Do `@import` w `style.css` dopisać `IBM+Plex+Sans+Condensed:wght@500;600`.
4. **Promienie:** 2 px (wiersze, tagi, podświetlenie ceny), 6 px (panele, przyciski), pełne (chipy, przełączniki).
5. **Ruch:** tylko ticker newsów, podświetlenie ceny 500 ms przy zmianie, otwarcie szuflady. Podświetlenie jest w `prefers-reduced-motion: no-preference`; ticker też trzeba tam przenieść.

## Elementy
| Element | Zawartość | Klasa w makiecie | Obecnie w grze |
|---|---|---|---|
| Pasek sesji (R5) | stan „Sesja wstrzymana” albo „Sesja trwa” (kropka + słowo), data, x1/x2/x5, przycisk „Rozpocznij grę”, potem „Wznów” albo „Wstrzymaj”, menu ⋯ | `.ms-session`, `.ms-state`, `.ms-speed`, `.ms-play` | `#time-controls`, `.speed-segmented`, `#pause-game-btn` |
| Liczby w pasku (R6) | NAV/udział, gotówka funduszu (bursztyn), zaufanie. Min. 112 px na kafelek, odstęp 28 px. Konto prywatne tylko w panelu funduszu | `.ms-kpis`, `.ms-kpi.is-mine` | `.topbar-kpi-group` |
| Filtry | Wszystkie, Posiadane, Ulubione + chipy giełd z kwadratem w kolorze metalu; na telefonie przycisk „Filtry (n)” | `.ms-chip`, `.ms-filter-btn` | `.market-level-tabs`, `.sector-chips`, `#market-filters-btn` |
| Nagłówek giełdy (R1) | nazwa, reguła wejścia, liczba spółek | `tr.ms-ex.t-*` > `.ex-plate` | `tr.sector-subheader` |
| Wiersz spółki (R2) | ticker (Condensed), nazwa min. 180 px z `title`, branża jako tag (nagłówek branży dopiero od 3 spółek), wykres 7 sesji 56×18, kurs, zmiana tygodniowa ▲▼ albo „—” przed pierwszą sesją, dostępne „684 szt.” z paskiem, „Masz” (bursztyn, gdy > 0), przycisk handlu 30 px (telefon 40 px) | `tr.ms-row.t-*`, `.ms-tick`, `.ms-name`, `.ms-tag`, `.ms-spark`, `.ms-price.flash-up/-down`, `.ms-chg`, `.ms-avail`, `.ms-mine.has` | `#stock-table` wiersze, `.change-pill`, `.row-state` |
| Panel funduszu (R7) | nazwa funduszu, przełącznik Fundusz / Konto prywatne, NAV dużą liczbą (30 px), pod nią: od startu, GIG, wobec GIG w pp; księga (`dl`): gotówka z % aktywów, akcje, klienci, konto prywatne; pasek zaufania; tabela pozycji; „Kampania emisyjna” | `.ms-fund`, `.ms-nav-big`, `.ms-vs`, `.ms-ledger`, `.ms-trust`, `.ms-pos` | panel „Mój fundusz” (`#fund-panel-title`), `.portfolio-kpi-card` |
| Pusty stan funduszu | „Nie masz jeszcze pozycji. Wybierz spółkę z listy i kliknij przycisk handlu. Zaufanie klientów spada, gdy cały fundusz leży w gotówce.” | `.ms-empty` | pusta tabela pozycji, alert „Zaufanie spada” |
| Telefon (R8) | górny pasek w 1 wierszu (logo, NAV, gotówka, przycisk sesji); wiersz spółki w 2 liniach (nazwa i kurs; ticker z branżą i zmiana; „(masz)” przy posiadanych); dolna nawigacja Rynek, Fundusz, Poczta, Menu (60 px); „Fundusz” otwiera szufladę z tą samą księgą | `.ms-tabbar`, `.ms-drawer.is-open`, siatka `.ms-row` | `.topbar.is-compact`, przycisk „Mój fundusz” (do usunięcia) |
| Dostępność (R12) | `:focus-visible` bursztynowa obwódka 2 px; cele dotyku 40 px na telefonie; tekst min. 11–12 px; nagłówek kolumny „Handel” ukryty wizualnie (`.sr`); stan sesji w `role="status"` | — | — |

## Czego makieta nie zmienia
Lewe menu (tylko bez wersalików w nagłówkach grup), ticker newsów, panel handlu po rozwinięciu wiersza, skaner spółek, indeksy. Panel handlu dostanie styl z tych samych zasad przy wdrażaniu.

## Prompt dla czatu kodu
> Wdróż ekran główny wg `plany/design/18_ekran_glowny.md` i makiety `plany/design/makiety/18_ekran_glowny.html`. CSS z bloku makiety przenieś do `style.css` jako „Ekran główny 2026-11”, `@container` zamień na `@media (max-width: 640px)`, dodaj Plex Sans Condensed do `@import`. Kolejno, z commitem po każdej części: (1) typografia i zero wersalików, (2) nagłówek giełdy i szyna, (3) wiersz spółki z wykresem 7 sesji, „—” przed pierwszą sesją i podświetleniem 500 ms, (4) pasek sesji i 3 liczby, (5) panel funduszu jako księga z wynikiem wobec GIG, (6) telefon: dolna nawigacja i szuflada funduszu, usuń przycisk „Mój fundusz”. Nagłówki branż tylko od 3 spółek, inaczej tag w wierszu. Bursztyn wyłącznie dla rzeczy gracza. Testy: „—” przed pierwszą sesją, klasa `t-*` z giełdy spółki, `prefers-reduced-motion` wyłącza podświetlenie, brak `text-transform: uppercase` w nowych regułach. Sprawdź przy 1366, 1440 i 390 px, commit po polsku.
