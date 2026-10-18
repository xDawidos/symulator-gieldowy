# 0.14.5 Redesign — krok 7: lista błędów i poprawek

Data: 2026-10-19 · źródło: przegląd ekranów w kroku 7 ([07_porownanie.md](07_porownanie.md), zrzuty w [zrzuty/po7/](zrzuty/po7/)).
Decyzja użytkownika: poprawki **spisane, nie wdrożone** w kroku 7 — do wykonania osobno (czat kodu albo krok 7b).

Zasady jak w całym redesignie: tylko warstwa widoku (`index.html`, `style.css`, renderowanie w `ui.js`, napisy w plikach logiki), bez zmian w logice i nazwach funkcji z testów, testy 457/457, `displayStocks` i pasek newsów bez spowolnienia, commit na każdą część.

## Podsumowanie
| # | Poprawka | Waga | Wielkość | Zrzut |
|---|---|---|---|---|
| ~~P1~~ | ~~Liczby po polsku i drobne błędy widoku (8 punktów)~~ — **zrobione** 2026-10-19 | ~~wysoka~~ | ~~średnia~~ | 06, 13, 14, 17, 20, 21, 24 |
| ~~P2~~ | ~~`color-scheme: dark` — natywne paski przewijania, listy i pola~~ — **zrobione** 2026-10-19 | ~~wysoka~~ | ~~1 linia~~ | 17, 20 |
| ~~P3~~ | ~~Filtry sektorów i giełd w jednym rzędzie~~ — **zrobione** 2026-10-19 | ~~wysoka~~ | ~~średnia~~ | 02, 03 |
| ~~P4~~ | ~~Jeden nagłówek i jeden styl zakładek we wszystkich oknach~~ — **zrobione** 2026-10-19 | ~~średnia~~ | ~~średnia~~ | 09, 11, 12, 27–31 |
| ~~P5~~ | ~~Poczta: szerszy spis i wydanie zbiorcze jako lista~~ — **zrobione** 2026-10-19 | ~~średnia~~ | ~~mała~~ | 07, 08 |
| ~~P6~~ | ~~Usunięcie martwego CSS (180 reguł, 18 KB) z testem stylów~~ — **zrobione** 2026-10-19 | ~~niska~~ | ~~mała + test~~ | — |

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

## ~~P2. `color-scheme: dark`~~ — zrobione
> **Wykonane (2026-10-19):** `color-scheme: dark` w `:root` z generatora `gen_tokens.py` (→ `tokens.css`). Natywne paski przewijania, listy `<select>` i pola są ciemne. Pominięte: `scrollbar-color`/`scrollbar-width: thin` (sam `color-scheme` usuwa białe paski).

## ~~P3. Filtry sektorów i giełd w jednym rzędzie~~ — zrobione
> **Wykonane (2026-10-19):**
> - Jeden przewijany rząd chipów grup sektorów z rozwijanymi menu wielosektorowymi (`.sector-group-dropdown`, obsługa klawiatury `Escape`, fokus, zamykanie po kliknięciu na zewnątrz).
> - Aktywny sektor podmienia etykietę grupy z wyróżnieniem akcentem.
> - Zakładki giełd (`.market-level-tabs`) w jednym zwartym, przewijanym rzędzie (`nowrap`, `scrollbar-width: thin`).
> - Kontrolki poboczne (`.sector-filter-controls`) i podchipy wyrównane w jednym rzędzie (`.sector-filter-extra`).

## ~~P4. Jeden nagłówek i jeden styl zakładek~~ — zrobione
> **Wykonane (2026-10-19):**
> - Spójny nagłówek `header.bank-hero` (emblemat z ikoną SVG, kicker i tytuł do lewej) wdrożony we wszystkich oknach: Akademia/CV (`#skills-modal`), Wykres (`#price-chart-modal`), Badania R&D (`#research-modal`), Lombard (`#pawnshop-modal`), Szara strefa (`#grey-zone-modal`), Poczta (`#mail-overlay`), Korporacja (`#corporation-overlay`).
> - Usunięto stary zielony nagłówek `text-up` w Lombardzie.
> - Zakładki ujednolicone do standardu `.bank-tab-btn` (w Akademii, Korporacji i Budownictwie).
> - Akademia: ikona kłódki przy zablokowanych hasłach `uiIcon('klodka')`.
> - Inkubator: `#investment-pool-panel` przebudowany na komponent `.bank-card` z `.bank-card-head` i `.bank-card-form`.
> - Szara strefa: przyciski zleceń zmienione z agresywnego `btn-danger` na stonowany `btn-secondary`, emoji zastąpione ikonami SVG.
> - Reguła awaryjna `.modal > h2:first-of-type` w `style.css`.

## ~~P5. Poczta~~ — zrobione
> **Wykonane (2026-10-19):**
> 1. Szerszy spis wiadomości, gdy brak zaznaczenia (`190px minmax(0, 1fr) 280px`), dynamicznie przełączany na układ czytania po wybraniu wiadomości (`.has-selection`).
> 2. Wydania zbiorcze rynku automatycznie parsowane z jednolitego ciągu do czytelnej listy `<ul class="list-plain mail-digest">` z odstępami i punktorami akcentu.

## ~~P6. Martwy CSS (porządek)~~ — zrobione
> **Wykonane (2026-10-19):**
> - Usunięto 180 martwych reguł CSS (18 301 bajtów) za pomocą `plany/design/narzedzia/martwy_css.py --usun`.
> - Zaktualizowano raport w `plany/design/martwy_css.md`.
> - Wszystkie 457 testów przechodzi (457/457).

## Podsumowanie zakończenia wersji 0.14.5
Wszystkie punkty naprawcze P1–P6 z etapu 7b zostały wdrożone, przetestowane i zatwierdzone. Całość redesignu 0.14.5 została ukończona. Makiety UI 0.15 i komponenty są generowane jako interaktywne szablony HTML (makiety w `plany/design/makiety/`), gotowe do użycia w Google Stitch / HTML bez konieczności oczekiwania na limity Figmy. Projekt jest w pełni gotowy do przejścia do wersji **0.15 „Hossa i bessa”**.
