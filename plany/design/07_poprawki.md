# 0.14.5 Redesign — krok 7: lista błędów i poprawek

Data: 2026-10-19 · źródło: przegląd ekranów w kroku 7 ([07_porownanie.md](07_porownanie.md), zrzuty w [zrzuty/po7/](zrzuty/po7/)).
Decyzja użytkownika: poprawki **spisane, nie wdrożone** w kroku 7 — do wykonania osobno (czat kodu albo krok 7b).

Zasady jak w całym redesignie: tylko warstwa widoku (`index.html`, `style.css`, renderowanie w `ui.js`, napisy w plikach logiki), bez zmian w logice i nazwach funkcji z testów, testy 457/457, `displayStocks` i pasek newsów bez spowolnienia, commit na każdą część.

## Podsumowanie
| # | Poprawka | Waga | Wielkość | Zrzut |
|---|---|---|---|---|
| ~~P1~~ | ~~Liczby po polsku i drobne błędy widoku (8 punktów)~~ — **zrobione** 2026-10-19 | ~~wysoka~~ | ~~średnia~~ | 06, 13, 14, 17, 20, 21, 24 |
| ~~P2~~ | ~~`color-scheme: dark` — natywne paski przewijania, listy i pola~~ — **zrobione** 2026-10-19 | ~~wysoka~~ | ~~1 linia~~ | 17, 20 |
| P3 | Filtry sektorów i giełd w jednym rzędzie | wysoka | średnia | 02, 03 |
| P4 | Jeden nagłówek i jeden styl zakładek we wszystkich oknach | średnia | średnia | 09, 11, 12, 27–31 |
| P5 | Poczta: szerszy spis i wydanie zbiorcze jako lista | średnia | mała | 07, 08 |
| P6 | Usunięcie martwego CSS (177 reguł, 18 KB) z testem stylów | niska (porządek) | mała + test | — |

## ~~P1. Liczby po polsku i drobne błędy widoku~~ — zrobione
> **Wykonane (2026-10-19):**
> 1. ✓ 111 wywołań `toFixed(1–4)` w tekstach `ui.js` → `formatNumberPl`; poza tym pomocniki `pct`, `compareWithSector` (`learning.js`), cele w oknie Firmy (`ai.js`), taśma i historia klientów (`player.js`), odznaki dywidend (`companies.js`). Zostaje 9 wystąpień w CSS/SVG/`value=` (celowo). Logi, maile i newsy z logiki mają jeszcze kropkę: to treść, a tam `toFixed` bywa też zaokrąglaniem.
> 2. ✓ nie dotyczy: „2175 PLN” jest zgodne z polską normą i `Intl` pl-PL (odstęp tysięcy od 5 cyfr).
> 3. ✓ powtórzona stopa dywidendy ukryta w karcie spółki (`#description-modal .dividend-yield`). W oknie akcjonariatu zostaje, a test „opis w karcie” przechodzi.
> 4. ✓ wykres: przyczyną było `#chart-svg-area` z `width: 100%` i ramką bez `box-sizing` (+2 px) oraz SVG liczone z `offsetWidth`. Teraz `box-sizing: border-box` i `clientWidth`.
> 5. ✓ menu gry: ikona ⋯ (`wiecej`).
> 6. ✓ pasek KPI ≤ 480 px: siatka 2×2.
> 7. ✓ Miasto: budżet i populacja ukryte (są w pasku KPI), bez „|”, odliczanie „1 min 04 s” (wcześniej „04ss”), „Obecny zarząd”.
> 8. ✓ pula start-upów: `mini-progress` 4 px, procent z przecinkiem, kwota `formatZl`, nazwa przez `escapeHtml`.

<details><summary>Pierwotny opis</summary>

1. **Przecinek dziesiętny wszędzie w widoku.** Kwoty PLN i chipy zmian używają `formatNumberPl` (przecinek), a wiele okien jeszcze `toFixed` (kropka). Czasem oba zapisy są w jednym kafelku: karta spółki „C/WK 1,84 · sektor 1.48”. Gdzie:
   - `ui.js` ma 128 wywołań `toFixed(1–4)` w tekstach widoku;
   - lokalne pomocniki `const pct = …toFixed…` w liniach ok. 418, 3515, 7016, 7830, 7968;
   - napisy w logice, np. `companies.js:8369` „Stopa dywidendy: …%”.

   Jak: w tekstach widoku `x.toFixed(n)` → `formatNumberPl(x, n)`, procenty → `formatPct` albo `formatNumberPl(v * 100, n) + '%'`. **Nie** zmieniać `toFixed` w atrybutach `value=`, w porównaniach i w danych do `parseFloat`. Przykłady przed → po: „4.50%” → „4,50%”, „0.999” → „0,999”, „13.51” → „13,51”, „+9.3%” → „+9,3%”, „100.0%” → „100,0%”.
2. **Kapitalizacja bez odstępów tysięcy** w karcie spółki: „2175 PLN” → `formatZl(…, 0)` = „2 175 PLN”.
3. **Powtórzona stopa dywidendy** w nagłówku karty spółki (`companies.js:8369`, linia nad kafelkami). Ta sama wartość jest w kafelku „Stopa dywidendy”. Usunąć linię albo zostawić samą „serię”.
4. **Wykres ceny** (`showPriceHistoryModal`, zrzut 17): pod wykresem widać biały poziomy pasek przewijania, a prawy brzeg ostatniej świecy jest ucięty. SVG ma być szerokie na okno (`width: 100%`, viewBox według szerokości kontenera); w kontenerze `overflow-x: hidden`.
5. **Dwa identyczne przyciski ☰** przy ≤ 860 px (szuflada menu i menu gry `#topbar-menu-btn`). Menu gry dostaje ikonę „więcej” (⋯, trzy kropki) — nowa ścieżka w `UI_ICON_PATHS`, np. `wiecej: 'M5 12h.01M12 12h.01M19 12h.01'`.
6. **Pasek KPI na telefonie** (zrzut 21): widać 2,5 z 4 wartości („KONTO PI…”), a „Zaufanie” jest ukryte. Przy ≤ 480 px: siatka 2×2 (`grid-template-columns: 1fr 1fr`, etykieta 11 px, wartość 14 px) albo poziome przewijanie z cieniem na krawędzi. Rekomendacja: 2×2, bo pasek urośnie o ok. 36 px.
7. **Miasto — zakładka Przegląd** (zrzut 12): treść powtarza budżet i populację z paska KPI i używa zapisu „Budżet: … | Populacja: …”. Zostawić tylko to, czego nie ma w pasku (infrastruktura, festyn, zarząd), jako listę `etykieta — wartość`; „1m 04s” → „1 min 04 s”.
8. **Inkubator / pula** (zrzut 11): pasek „100.0%” na całą szerokość w kolorze info. Zamienić na `mini-progress` z tokenów (4 px, akcent), wartość z przecinkiem.

## ~~P2. `color-scheme: dark`~~ — zrobione
> **Wykonane (2026-10-19):** `color-scheme: dark` w `:root` z generatora `gen_tokens.py` (→ `tokens.css`). Natywne paski przewijania, listy `<select>` i pola są ciemne. Pominięte: `scrollbar-color`/`scrollbar-width: thin` (sam `color-scheme` usuwa białe paski).

<details><summary>Pierwotny opis</summary>

Strona nie deklaruje schematu kolorów (`getComputedStyle(html).colorScheme = normal`). Natywne paski przewijania (chipy na 800 px, wykres) są więc białe, a listy `<select>` i pola daty mają jasne menu systemowe.
- Jak: w `tokens.css` przez generator (`gen_tokens.py`): `:root { color-scheme: dark; }`. Dodatkowo `scrollbar-color: var(--color-border-strong) transparent; scrollbar-width: thin;` dla `.sector-chips`, `.modal` i panelu funduszu.
- Sprawdzić: zrzuty 17 i 20 bez białych pasków; `<select>` w karcie spółki ma ciemną listę.

</details>

</details>

## P3. Filtry sektorów i giełd w jednym rzędzie
Na 1440×900 nad tabelą jest 18 chipów sektorów w 5 rzędach i 11 chipów giełd w 2 rzędach. Tabela zaczyna się ok. 590 px od góry, a bez przewijania widać 4 spółki.
- Jak (`renderSectorFilterChips`, `ui.js:53`; dane `SECTOR_GROUPS` w `core.js:1695` bez zmian):
  - jeden rząd: `[Posiadane] [Wszystkie] [Finanse ▾] [Konsumpcja ▾] [Przemysł i surowce ▾] [Zdrowie i nauka ▾] [Technologia] [Nieruchomości] [Obronność] [Usługi]`;
  - grupa z ≥ 2 sektorami to przycisk `aria-haspopup="menu"` z listą sektorów (chip z ikoną i licznikiem); grupa z 1 sektorem to zwykły chip;
  - aktywny sektor podmienia etykietę grupy: „Żywność 9 ▾” z obramowaniem akcentu;
  - giełdy: jeden rząd przewijany w poziomie (P2 — ciemny pasek), albo `<select>` „Giełda: Wszystkie ▾” obok „Typ”;
  - „także segmenty poboczne” i „Typ” przenieść do tego samego rzędu (po prawej) albo pod ikonę filtra.
- Cel: tabela od ok. 300 px, na ekranie 1440×900 ok. 10 spółek bez przewijania. Klawiatura: menu grup jak menu ☰ (strzałki, Escape, fokus wraca na przycisk).
- Wydajność: zmienia się tylko pasek filtrów; `displayStocks` bez zmian.

## P4. Jeden nagłówek i jeden styl zakładek
Dziś są 3 style nagłówków okien i 3 style zakładek:
| Okno | Nagłówek | Zakładki | Zrzut |
|---|---|---|---|
| Bank, Państwo, Miasto, Klienci, Budownictwo | nowy (`.bank-hero`: ikona + nadtytuł + tytuł) | podkreślenie (`.bank-tab-btn`) · Budownictwo: przełącznik | 26, 13, 12, 14, 27 |
| Akademia (CV i szkolenia) | wyśrodkowany h2 + podtytuł | podkreślenie | 09 |
| Korporacja | zwykły h2 | „pigułki” (przyciski z obramowaniem) | 29 |
| Szara strefa | zwykły h2 | — | 28 |
| Lombard | **zielony** h2 (stary motyw) | — | 30 |
| Panel R&D, Wykres, Poczta | zwykły h2 | — | 31, 17, 07 |

- Jak:
  - wszystkie okna dostają `header.bank-hero`: ikonę sekcji z `UI_ICON_PATHS` (akademia, firma, szara-strefa, lombard, badania, wykres, poczta), nadtytuł w 1 linii i tytuł do lewej;
  - zakładki wszędzie jako `.bank-tab-btn` (podkreślenie akcentem, `role="tab"`, `aria-selected`);
  - przełącznik w Budownictwie i „pigułki” w Korporacji → ten sam styl;
  - w Lombardzie usunąć kolor z h2 (reguła ze starego motywu);
  - CSS: jedna reguła `.modal > h2:first-of-type` dla okien bez `bank-hero` (lewo, `--color-text-primary`, `--text-title-size`) jako zabezpieczenie.
- Akademia: kłódka 🔒 przy „???” → `uiIcon('klodka')`. Opcjonalnie emoji przy hasłach (`learning.js`, `entry.icon`) → `dataIcon(entry.icon)` po dopisaniu ikon do `EMOJI_ICONS`. W kroku 6 hasła zostały z emoji jako treść encyklopedyczna, więc to decyzja użytkownika.
- Inkubator (`toggleStartupPanelVisibility`): sekcje jako `.bank-card` z `.bank-card-head`, formularz wpłaty jako `.bank-card-form`, lista uczestników jako tabela `asset-mini-table`.
- Szara strefa: karty z czerwoną krawędzią i czerwone „Zleć” przy każdej usłudze męczą wzrok. Kolor ostrzeżenia zostawić na krawędzi karty i znaczniku ryzyka, a przycisk dać `btn-secondary`. Emoji w tytułach kart → ikony.

## P5. Poczta
1. **Szerszy spis**, gdy nie wybrano wiadomości: `.mail-layout` (`style.css:3988`) ma `190px 1.1fr 1fr`, a pusty podgląd zajmuje 40% okna i tematy są ucięte po ok. 20 znakach. Bez zaznaczenia: `190px 1fr 280px` z krótką podpowiedzią w podglądzie; po wybraniu: jak dziś.
2. **Wydanie zbiorcze jako lista** (zrzut 08): `events.js:139` składa treść jako `• a  • b  • c` w jednym akapicie. W widoku wiadomości: gdy treść zaczyna się od „• ”, podzielić po „  • ” i pokazać jako `<ul class="list-plain mail-digest">` (każda pozycja w osobnej linii, odstęp 4 px). Logika i treść maila bez zmian.

## P6. Martwy CSS (porządek)
Raport: [martwy_css.md](martwy_css.md). Wynik: 177 z 1317 reguł nie ma użytych klas/id (18 KB z 172 KB), np. `#main-nav`, `.topbar-cash-card`, `.skill-card`, `.commercial-bank-item`. Generator `narzedzia/martwy_css.py` z `--usun` usuwa je z `style.css`.
- Procedura bezpiecznego usunięcia:
  1. W przeglądarce zrobić migawkę wyliczonych stylów: dla każdego widocznego elementu ścieżka DOM → `color`, `background-color`, `font-*`, `padding`, `margin`, `border`, `display`, `position`, `width`/`height` (zaokrąglone). Ekrany: pulpit, rozwinięty wiersz, 12 okien z tabeli w 07_porownanie.md, mobile 390.
  2. `python plany/design/narzedzia/martwy_css.py --usun`.
  3. Ta sama migawka po zmianie — **0 różnic**. Do tego testy 457/457.
- Później (osobno): scalenie żywych, ale nadpisanych warstw (stary ciemny motyw i wcześniejsze generacje reguł). Każdy blok wyłączać po kolei z tym samym testem migawek.

## Zrobione w kroku 7 (poza listą)
- 10 starych PNG inwestycji usuniętych z `img/`, pole `icon` usunięte z katalogu inwestycji w `companies.js` (same dane widoku). `investmentIcon` bierze ikonę z `id` dla wszystkich 71 inwestycji.
- Zrzuty „po” (30) w `zrzuty/po7/`, raport martwego CSS.
