# 29. Baner „Czarny łabędź” (0.18.8 D5, ekran 5) — DO AKCEPTACJI

Makieta: [makiety/29_czarny_labedz.html](makiety/29_czarny_labedz.html) (samodzielna). Kod dziś: `showBlackSwanBanner()` (`ui.js` ok. 9647), wariant `.crisis-banner` z ikoną `alert`, 33f81ed bez makiety.

## Co pokazuje / markup
| Część | Treść | Markup / ARIA |
|---|---|---|
| Kontener | czarne tło (`--ink-950`), lewa krawędź 6 px: czerwona (negatywny) albo zielona (pozytywny), szerszy niż zwykły baner (720 px) | `section.swan(.is-positive)[role=alert][aria-labelledby][aria-describedby]` — ogłaszany raz |
| Ikona typu | pandemia `kryzys-pandemia`, wojna `kryzys-ropa`, upadek waluty `moneta`, rewolucja technologiczna `rakieta`, krach systemu bankowego `kryzys-bank` (zamiast wspólnego `alert`) | `.swan-ic` |
| Rodzaj | „Czarny łabędź” (i „, pozytywny”) + „zdarza się raz na 15–25 lat” | `.swan-kind` |
| Nazwa i zdanie | `swan.name`, `BLACK_SWANS[id].news` | `h2`, `p.swan-news` |
| Fakty | Kraje, stopy procentowe (cięcie/podwyżka i zakres z `rate`), zaufanie klientów (`trust` w pkt), czas trwania z paskiem („teraz 2. z 6 kw.”) | `dl.swan-facts`, pasek `role=img` z `aria-label` |
| Sektory | chipy ▲/▼ z procentem z `sectors` (kolor + strzałka + liczba) | `ul.secs[aria-label]` |
| Stopka | linia kryzysu i faza rynku, link do opisu w Gazecie Ekonomicznej | `.swan-foot` |
| Zamknij | krzyżyk i Esc; po zamknięciu w górnym pasku zostaje plakietka „Pandemia globalna · 2 z 6 kw.”, która otwiera baner ponownie | `button.swan-close`, `button.swan-chip` |

Ruch: jedno wejście 0,45 s, tylko przy `prefers-reduced-motion: no-preference`. Bez pulsowania. Bez nowego okna.

## Prompt dla czatu kodu
> Przebuduj `showBlackSwanBanner()` według `plany/design/29_czarny_labedz.md` i makiety `plany/design/makiety/29_czarny_labedz.html`: osobny wariant `.swan` (czarne tło, krawędź 6 px, ikona typu), `role=alert` raz, fakty (kraje, stopy, zaufanie, czas z paskiem), chipy sektorów z `BLACK_SWANS[id].sectors`, stopka z linią i linkiem do Gazety, zamknięcie krzyżykiem i Esc, plakietka w pasku do końca łabędzia. Testy: baner pozytywny ma słowo „pozytywny”; plakietka znika po `untilQ`; brak ikony `alert` w nagłówku łabędzia.
