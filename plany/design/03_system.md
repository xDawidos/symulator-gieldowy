# 0.14.5 Redesign — krok 3: system designu

Data: 2026-10-18 · podstawa: [01_ocena.md](01_ocena.md), [02_dostepnosc.md](02_dostepnosc.md).

## Decyzje użytkownika
| Pytanie | Decyzja |
|---|---|
| Kierunek estetyczny (3 warianty, makiety w Figmie) | **A · Terminal** — prawie czarne tło, bursztynowy akcent, IBM Plex Sans + IBM Plex Mono w liczbach, ostre rogi 3–6 px, gęsta tabela |
| Wspólny układ makiet | **przyjęty**: niski pasek (KPI + data + prędkość + pauza + powiadomienia + menu ☰), Zapisz/Eksport/Reset w menu ☰, menu boczne w grupach Świat / Moja firma / Ja, wiersz tabeli 40 px |
| Jasny motyw | **tylko ciemny** — przełącznik motywu znika z ustawień w kroku 5 (funkcja `toggleDarkMode` zostaje w kodzie, testy jej nie używają) |

Odrzucone warianty B · Gabinet i C · Fintech zostają w Figmie na stronie „01 Kierunki” do porównania.

## Gdzie co jest
| Co | Gdzie |
|---|---|
| Plik Figma | https://www.figma.com/design/9fhi6NP9nIdIiz4tg6X8Mk |
| Strona „01 Kierunki (warianty)” | ramki A `6:2`, B `7:2`, C `8:2` — [podgląd A](makiety/03_kierunek_A_terminal.png), [B](makiety/03_kierunek_B_gabinet.png), [C](makiety/03_kierunek_C_fintech.png) |
| Strona „02 System” | fundamenty (`17:289`) + wszystkie komponenty — [podgląd komponentów](makiety/03_system_komponenty.png), [fundamenty](makiety/03_system_fundamenty.png) |
| Strona „03 Ekrany” | pusta — na makiety ekranów w kroku 5 |
| Źródło tokenów | [`plany/design/tokens.json`](tokens.json) |
| Plik zmiennych CSS | [`tokens.css`](../../tokens.css) (katalog gry, obok `style.css`) — **wygenerowany**, nie edytować ręcznie |
| Generator | [`plany/design/narzedzia/gen_tokens.py`](narzedzia/gen_tokens.py) → `tokens.css` + [`kontrast_tokenow.md`](kontrast_tokenow.md) |
| Makiety kierunków (HTML) | [`plany/design/makiety/03_kierunki.html`](makiety/03_kierunki.html) |

`tokens.css` **nie jest jeszcze podpięty** w `index.html` — to pierwsza część kroku 5 (fundament zmiennych). Do tego czasu gra wygląda jak przed redesignem.

## Zasada nazw (Figma = CSS)
Nazwa zmiennej w Figmie z `/` zamienionym na `-` i poprzedzona `--` to nazwa w CSS:
`color/bg/base` → `var(--color-bg-base)`, `space/4` → `var(--space-4)`, styl tekstu `text/num-lg` → klasa `.t-num-lg`.
Każda zmienna w Figmie ma ustawioną składnię WEB (`var(--…)`), więc w trybie Dev Mode Figma pokazuje gotowe nazwy CSS.

## Architektura tokenów
| Warstwa | Figma (kolekcja, tryb) | CSS | Liczba |
|---|---|---|---|
| Prymitywy (surowe kolory) | Primitives · „Wartość”, ukryte w pickerach | `--ink-900`, `--amber-400`, `--exchange-gold`… | 42 |
| Kolory semantyczne (aliasy prymitywów) | Color · „Ciemny” | `--color-bg-*`, `--color-text-*`, `--color-border-*`, `--color-focus`, `--color-chart-*`, `--color-section-*` | 44 |
| Odstępy, promienie, rozmiary | Layout · „Wartość” | `--space-*`, `--radius-*`, `--size-*` | 26 |
| Kroje | Typography · „Wartość” | `--font-family-sans`, `--font-family-mono` | 2 |
| Style tekstu | 14 stylów `text/*` | zmienne `--text-*-size/line/weight/track` + klasy `.t-*` | 14 |
| Cienie | 2 style `shadow/*` | `--shadow-popover`, `--shadow-modal` | 2 |
| Ruch | — | `--motion-fast` 120 ms, `--motion-base` 200 ms, `--motion-ease` | 3 |
| Komponenty | (właściwości komponentów) | `--btn-*`, `--chip-*`, `--field-*`, `--card-*`, `--table-*`, `--modal-*`, `--toast-*`, `--nav-*` | 33 |

Plan Starter w Figmie pozwala na 1 tryb na kolekcję i 3 strony w pliku — oba limity pasują do decyzji „tylko ciemny”.

## Paleta (ciemny)
Wszystkie pary tekst × tło sprawdzone automatycznie ([kontrast_tokenow.md](kontrast_tokenow.md)) — **0 par poniżej AA**.

| Token | Wartość | Do czego | Kontrast (najgorsze tło) |
|---|---|---|---|
| `--color-bg-base` | `#0A0D12` | tło strony | — |
| `--color-bg-surface` | `#10141B` | panele, karty, okna | — |
| `--color-bg-raised` | `#161B24` | nagłówek tabeli, mini-karty, dymki, przycisk drugorzędny | — |
| `--color-bg-sunken` | `#0D1117` | podnagłówki sektorów, pasek newsów, pasek KPI okna | — |
| `--color-bg-hover` / `-pressed` | biały 4% / 8% | najechanie / wybrany wiersz | — |
| `--color-bg-overlay` | czarny 75% | zasłona pod oknem | — |
| `--color-bg-accent` / `-hover` | `#F5A524` / `#FFC861` | przycisk główny, licznik | tekst `on-accent` 9,1:1 |
| `--color-bg-accent-soft` | bursztyn 14% | wybrany chip, aktywna pozycja menu | — |
| `--color-bg-up-soft` / `down-soft` / `warn-soft` / `info-soft` | 8–14% koloru | tła chipów zmian i ramek stanu | tekst tonu ≥ 5,5:1 |
| `--color-bg-danger` | `#FF6B6B` | przycisk niebezpieczny (tylko potwierdzenia) | tekst `on-danger` 7,2:1 |
| `--color-text-primary` | `#E8ECF2` | tekst główny, liczby | 14,6:1 |
| `--color-text-secondary` | `#B4BDCB` | tekst drugorzędny | 9,1:1 |
| `--color-text-muted` | `#8792A3` | podpisy, meta, etykiety | 5,5:1 |
| `--color-text-disabled` | `#6B778A` | wyłączone (poza AA z definicji) | — |
| `--color-text-accent` | `#F5A524` | wyróżnienia | 8,5:1 |
| `--color-text-up` | `#3DDC84` | zysk (zawsze ▲ / +) | 9,7:1 |
| `--color-text-down` | `#FF6B6B` | strata (zawsze ▼ / −) | 6,2:1 |
| `--color-text-warn` | `#FFC861` | ostrzeżenie (zawsze z ikoną ⚠) | 11,3:1 |
| `--color-text-info` | `#5AB0FF` | informacja | 7,5:1 |
| `--color-border-subtle` | `#1F2631` | linie podziału, ramki kart (dekoracja) | — |
| `--color-border-default` | `#2B3442` | ramki chipów i przycisków | — |
| `--color-border-strong` | `#6B778A` | ramki pól formularza | 3,8:1 (≥3) |
| `--color-focus` | `#FFD98A` | obrys fokusu | 12,8:1 |
| `--color-chart-fund/index/rivals` | bursztyn / niebieski / fiolet | wykres okresów: fundusz / GIG / rywale | — |
| `--color-chart-up/down` | zielony / czerwony | świeca rosnąca (pusta) / malejąca (pełna) | — |
| `--color-section-*` | bank bursztyn, JU morski, Państwo czerwony, Miasto zielony, Budownictwo żółty, Szara strefa fiolet | pasek akcentu i ikona okna sekcji | — |
| `--exchange-*` | junk, bronze, silver, gold, platinum, ruby, emerald, diamond, internet | kwadrat rangi giełdy (dekoracja, nazwa obok) | — |

**Uwaga:** akcent marki (bursztyn) i ostrzeżenie są blisko siebie kolorystycznie — ostrzeżenie odróżnia się zawsze ikoną ⚠, ramką i jaśniejszym odcieniem (`amber/300`).

## Typografia
Kroje: **IBM Plex Sans** (tekst) i **IBM Plex Mono** (wszystkie liczby: kursy, kwoty, %, NAV, wolumen) — cyfry tej samej szerokości, kolumny się nie „ruszają” przy tickach.
W kroku 5 import czcionek w `style.css` zmienia się z Sora/Inter na `IBM Plex Sans:400;600` + `IBM Plex Mono:400;600`; zapas: `Segoe UI` / `Consolas`.

| Styl / klasa | Krój | Rozmiar / linia | Użycie |
|---|---|---|---|
| `text/display` `.t-display` | Sans 600 | 28/34 | tytuł ekranu startowego, zwycięstwo |
| `text/heading-lg` | Sans 600 | 20/26 | tytuł okna |
| `text/heading-md` | Sans 600 | 16/22 | sekcja w oknie |
| `text/heading-sm` | Sans 600, WERSALIKI +4% | 14/20 | nagłówek panelu („RYNEK AKCJI”), nagłówek giełdy |
| `text/body` | Sans 400 | 14/20 | tekst |
| `text/body-strong` | Sans 600 | 14/20 | nazwa spółki, tytuł powiadomienia, przycisk |
| `text/body-sm` | Sans 400 | 13/18 | tekst w ramkach, chipy |
| `text/caption` | Sans 400 | 12/16 | meta (SYMBOL · sektor), podpisy |
| `text/label` | Sans 600, WERSALIKI +6% | 12/16 | etykiety KPI, nagłówki kolumn, podnagłówki sektorów |
| `text/num-sm` … `num-xl` | Mono 400/600 | 13 · 14 · 14 · 18 · 24 | liczby: tabela, KPI w pasku (18), KPI duże (24) |

Minimum 12 px (wymóg z kroku 2). 14 stylów zamiast dzisiejszych 27 rozmiarów.

## Odstępy, promienie, rozmiary
- **Odstępy:** `--space-half` 2 · `-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 24 · `-6` 32 · `-7` 48. Nazwy i wartości 1–5 **takie same jak dziś** w `style.css` (migracja bez zmian w regułach).
- **Promienie:** `--radius-xs` 2 (chip zmiany, znacznik) · `-sm` 3 (przyciski, pola, chipy) · `-md` 4 (karty, ramki stanu, dymki) · `-lg` 6 (okna, panele) · `-full` (liczniki). Dziś `--radius-sm/md/lg` = 10/14/18 — w kroku 5 zmiana wartości zmieni wygląd wszystkich reguł naraz (zamierzone).
- **Rozmiary:** kontrolki 28 / 34 / 40 (mobile), wiersz tabeli 40, kompaktowy 32, sektor 28, ikony 14/16/20, pasek górny 60, pasek newsów 28, menu boczne 220, **minimalny cel kliknięcia 24**.
- **Cienie:** tylko dla warstw nad treścią — `--shadow-popover` (dymki, powiadomienia, menu) i `--shadow-modal` (okna). Karty na pulpicie bez cienia — oddziela je ramka `border-subtle`.
- **Ruch:** 120 ms (najechanie, chip), 200 ms (okno, panel); wszystko wyłączane przez `prefers-reduced-motion` (krok 5).
- **Fokus:** `--focus-ring` = 2 px tła + 2 px `--color-focus` (widoczny na każdym tle).

## Komponenty (Figma „02 System” ↔ CSS)
| Komponent (Figma) | Warianty / właściwości | Klasa CSS (krok 5) | Zasady i dostępność |
|---|---|---|---|
| `icon/*` (30 ikon) | 24×24, kreska 1,8 | inline SVG, `currentColor` | menu, pasek, akcje; eksport do `img/ikony/` w kroku 6 |
| `Button` | Style: Primary / Secondary / Ghost / Danger × Size: SM / MD × State: Default / Hover / Disabled (24); Etykieta, Ikona (bool + wybór) | `.btn .btn--primary/secondary/ghost/danger .btn--sm` | 1 Primary na ekran/okno; Danger tylko w potwierdzeniu; fokus `--focus-ring` |
| `IconButton` | SM / MD × Default / Hover | `.icon-btn .icon-btn--sm` | zawsze `aria-label` + `title`; 28 px desktop, 40 px mobile |
| `Chip` | Default / Hover / Selected; Etykieta, Liczba | `.chip .is-selected` | `<button aria-pressed>`; wybrany = obrys + tło (nie tylko kolor) |
| `ChangePill` | Up / Down / Flat; Wartość | `.change .change--up/down/flat` | zawsze ▲/▼/■ i znak +/−; minus `−` |
| `Badge` | Neutral / Accent / Up / Down / Warn / Info | `.badge .badge--…` | etykieta 12 px wersaliki |
| `Input` | Default / Focus / Disabled | `.field` | ramka `border-strong`, zawsze `<label>` |
| `SegmentItem` | Default / Selected | `.seg > .seg__item` | prędkość gry, typ wykresu; `role="radiogroup"` |
| `Tab` | Default / Selected | `.tabs > .tab` | podkreślenie 2 px akcentem; `role="tab"`, `aria-selected` |
| `NavItem` | Default / Hover / Active; Ikona, Licznik | `.nav-item .is-active` | `aria-current="page"` |
| `Tooltip` | Tytuł, Treść | `.tooltip` | po najechaniu i fokusie; Escape zamyka |
| `StatCard` | Card / Inline; Etykieta, Wartość, Zmiana | `.stat .stat--inline` | wartość mono; zmiana ze znakiem |
| `Alert` | Warn / Down / Info / Up | `.alert .alert--…` | ikona + tytuł w kolorze tonu; `role="status"` (`alert` dla Down) |
| `Toast` | Info / Warn / Up / Down; Akcja | `.toast .toast--…` | maks. 2 widoczne + „+N”, nie zasłania okien, `aria-live="polite"` |
| `Table/Head` | — | `.tbl thead` | sortowanie = `<button>` w `<th>` z `aria-sort` |
| `Table/Exchange` | Giełda, Opis | `.tbl .row-exchange` | `<button aria-expanded>`; kwadrat `--exchange-*` |
| `Table/Sector` | Sektor, Liczba | `.tbl .row-sector` | 28 px, tło `sunken`, wersaliki 12 px |
| `Table/StockRow` | Default / Hover / Subsidiary; Nazwa, Meta, Kurs, Dostępne, Moje | `.tbl .row-stock` | 40 px, nazwa w 1 linii + `title`; zależna z wcięciem „└”; wiersz dostępny z klawiatury |
| `Modal` | Sekcja: Neutralna / Bank / JU / Państwo / Miasto / Budownictwo / Szara strefa; Tytuł, Nadtytuł, Pasek KPI, Zakładki, Stopka | `.modal .modal--bank…` (`--modal-accent`) | `role="dialog" aria-modal`, fokus do okna i powrót, Escape; szerokości 440/640/820/1100 |

Kontrola w Figmie: 14 zestawów + 4 pojedyncze komponenty + 30 ikon; **0 wypełnień bez zmiennej**, wszystkie zmienne mają zakres i składnię CSS, 0 zerwanych aliasów.

## Mapa: dzisiejsze zmienne w `style.css` → nowe tokeny (do kroku 5)
| Dziś | Nowy token |
|---|---|
| `--bg-main`, `--bg-soft` | `--color-bg-base` |
| `--bg-panel` | `--color-bg-surface` |
| `--bg-elevated` | `--color-bg-raised` |
| `--bg-elevated-2` | `--color-bg-raised` (karty w oknach) lub `--color-bg-sunken` (paski) |
| `--bg-hover` | `--color-bg-hover` |
| `--border-color` | `--color-border-default` (pola: `--color-border-strong`) |
| `--border-soft` | `--color-border-subtle` |
| `--text-main` | `--color-text-primary` |
| `--text-soft` | `--color-text-secondary` |
| `--text-muted` | `--color-text-muted` |
| `--text-on-accent` | `--color-text-on-accent` |
| `--accent-primary` | `--color-bg-accent` (tło) / `--color-text-accent` (tekst) |
| `--accent-primary-soft` | `--color-bg-accent-soft` |
| `--accent-info`, `--accent-info-soft` | `--color-text-info`, `--color-bg-info-soft` |
| `--color-up`, `--tint-up-strong` | `--color-text-up`, `--color-bg-up-soft` |
| `--color-down`, `--color-down-soft` | `--color-text-down`, `--color-bg-down-soft` |
| `--color-warn` | `--color-text-warn` |
| `--shadow-soft`, `--shadow-hover` | `--shadow-popover` (karty: bez cienia) |
| `--overlay` | `--color-bg-overlay` |
| `--radius-sm/md/lg/xl` (10/14/18/22) | `--radius-sm/md/lg/lg` (3/4/6/6) |
| `--space-1…5` | bez zmian |
| `--font-display`, `--font-body` | `--font-family-sans` |
| `--bank-navy`, `--bank-navy-2`, `--bank-gold`, `--bank-gold-soft` (okna Bank/JU/Państwo/Miasto/Budownictwo) | `--color-bg-surface`/`-raised` + `--modal-accent` (`--color-section-*`) |
| ok. 185 kolorów hex na sztywno, `#424242`, `#545454`, `#555` | odpowiednie tokeny semantyczne; usuwane w kroku 5 |

Plan migracji w kroku 5 (część „fundament zmiennych”): podpiąć `tokens.css` przed `style.css`, w `style.css` zostawić stare nazwy jako aliasy nowych (jedna sekcja), usunąć stary ciemny motyw (linie ~652–1573) i jasny `:root`, potem stopniowo zamieniać kolory na sztywno — po każdej części testy 457/457 i zrzut.

## Otwarte sprawy
- Ikony emoji w treściach fabularnych (Babcia, poczta, newsy) zostają; w interfejsie (menu, przyciski, nagłówki) zastępują je ikony SVG — szczegóły w kroku 6.
- Kolory rang giełd (`--exchange-*`) są dziś zapisane w JS (emoji 🗑️🥉🥈…) — w kroku 5 dochodzi kwadrat koloru, emoji w nazwie giełdy można zostawić albo usunąć (decyzja w kroku 4/5).
- Figma: ramki w makietach to warstwy zwykłe (import HTML), nie instancje komponentów — makiety ekranów w kroku 5 będą składane z komponentów biblioteki na stronie „03 Ekrany”.
