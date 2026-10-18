# 0.14.5 Redesign — krok 6: grafika

Data: 2026-10-19 · podstawa: [03_system.md](03_system.md) (ikony 24×24, kreska 1,8), [04_teksty.md](04_teksty.md) zasada 9 (emoji → ikony), [05_wdrozenie.md](05_wdrozenie.md) „Co zostało”.

Decyzje użytkownika (krok 6):
- emoji w zakresie **„interfejs i znaczniki”**; drzewko B+R, megaprojekty, PPP, społeczeństwo i prawa, koledzy, poczta i Babcia zostają z emoji;
- 6 nieużywanych PNG **usunięte**;
- Figma: **najpierw kod**, import do Figmy po odnowieniu limitu MCP (plan Starter).

## Części i commity
| Część | Commit | Co |
|---|---|---|
| 6.1 Inwestycje spółek | `fddaff8` | katalog inwestycji: ikony SVG zamiast jasnych kafelków PNG 64×64 (`investmentIcon(inv)`: najpierw według `id`, np. szpital, farma wiatrowa, port; potem według dawnego obrazka); 43 nowe ikony + 8 aliasów; usunięte `desk`, `face`, `face_sleeping`, `money`, `slupki`, `wykres` (.png) |
| 6.2 Emoji → ikony | `3a0ee42` | mapa `EMOJI_ICONS` (94 emoji → ikona) i `dataIcon(emoji)` dla danych: typy klientów, kampanie, jakość inwestycji, polityki kadrowe, cykle sektorów, karty makro i społeczeństwa, medale CV; 136 miejsc w szablonach `ui.js` (przyciski, statusy, sloty kart, etykiety); w nagłówkach i tytułach okien (`textContent`, `h2`/`h4`/`h5`) emoji usunięte; znaczniki wydarzeń na wykresie jako ikona w kółku (22 px, `tabindex`, `aria-label`, dymek także na fokus); ranking funduszy z polem `icon`; w oknie firmy (`ai.js`) cele z ikoną, przycisk „Prezent” zamiast samego 🎁 |
| 6.3 Ruch | `daba8bf` | tylko w `@media (prefers-reduced-motion: no-preference)`: wejście okien (8 px + przezroczystość, 200 ms), zasłona, powiadomienia (wjazd z prawej), błysk powiadomienia o osiągnięciu, przesuw znacznika paska nastroju, obrót strzałek paneli; tokeny `--motion-fast` / `--motion-base` / `--motion-ease` |
| 6.4 Eksport ikon | `30285e4` | `img/ikony/`: 120 plików SVG (102 interfejsu z fazami i osiągnięciami 0.15 + 18 sektorów), `sprite.svg`, `arkusz.html`; generator `narzedzia/gen_ikony.py` (źródło prawdy: `ui.js`) |
| 6.5 Domknięcie | (ten commit) | ten dokument, mapa |

Testy po każdej części: **457/457**. `displayStocks` i pasek newsów bez zmian (6.x ich nie dotyka).

## Pomiary przed → po
| Miara | Przed | Po |
|---|---|---|
| Emoji w kodzie widoku `ui.js` (poza komentarzami) | 202 | 33 — wyłącznie treści: Babcia, logi zdarzeń, powiadomienia (i tak czyszczone przez `stripEmoji`), klucze danych faz spółek, ★/☆ gwiazdki poczty |
| Rastrowe obrazki w interfejsie | 12 kafelków PNG (jasne tło, pixel-art) | 0 — tylko SVG w kolorze tekstu |
| Pliki w `img/` | 16 PNG + logo | 10 PNG (już nieużywane przez widok, patrz „Do decyzji”) + logo + `ikony/` |
| Ikony w zestawie | 30 interfejsu + 18 sektorów (+ 17 z 0.15) | 102 + 18 sektorów, w jednym stylu |
| Znaczniki na wykresie dostępne z klawiatury | 0 | wszystkie (`tabindex="0"`, `aria-label`) |
| Przyciski z samym emoji (bez nazwy) | 2 (🎁, 🔄) | 0 (🔄 → ikona + `title`, 🎁 → „Prezent”) |

## Dla czatu kodu — jak dodać ikonę
1. Ścieżkę 24×24 (kreska 1,8, bez wypełnień) dopisz do `UI_ICON_PATHS` w `ui.js`.
2. Jeśli dane mają emoji, dopisz je do `EMOJI_ICONS` (klucz **bez** `U+FE0F`) — wtedy `dataIcon(def.icon)` pokaże ikonę; emoji spoza mapy pokazuje się jak dawniej.
3. W HTML: `${uiIcon('nazwa', 14)}` (tekst), 18–20 w slotach kart (`.bank-card-icon`, `.ju-client-icon`); w gorących pętlach `uiIconNode` (klon węzła).
4. Uruchom `python plany/design/narzedzia/gen_ikony.py` — odświeży `img/ikony/`.
5. W `textContent`, `title`, `aria-label` i `<option>` ikon nie ma — tam sam tekst (`stripEmoji`).

## Specyfikacja assetów rastrowych (dla użytkownika, do `img/`)
Interfejs nie potrzebuje już grafiki rastrowej. Poniżej to, co warto mieć **poza** interfejsem gry — w kolejności ważności. Źródło: znak logo `img/logo/capital-quest-znak.svg` (bursztynowe Q na ciemnym tle) i tokeny (`--color-bg-base` #0A0D12, bursztyn `--color-text-accent`).

| # | Plik | Rozmiar | Format | Do czego | Uwagi |
|---|---|---|---|---|---|
| 1 | `img/app/icon-192.png`, `icon-512.png` | 192×192, 512×512 | PNG, sRGB | ikona aplikacji (manifest PWA, ekran telefonu) | znak na tle `#0A0D12`, znak ok. 70% boku, rogi proste (system sam zaokrągla) |
| 2 | `img/app/icon-maskable-512.png` | 512×512 | PNG | Android (ikona „maskable”) | znak w bezpiecznym kole Ø 80% (409 px); tło do krawędzi |
| 3 | `img/app/apple-touch-icon.png` | 180×180 | PNG, bez przezroczystości | Safari / iOS (nie czyta favicon SVG) | jak #1 |
| 4 | `img/app/favicon-32.png` | 32×32 | PNG | stare przeglądarki (fallback dla `favicon.svg`) | sam znak, bez napisu |
| 5 | `img/app/og-image.png` | 1200×630 | PNG albo JPG ≤ 300 KB | podgląd linku (komunikatory, social) — gdy gra będzie publikowana | logo poziome + hasło z kroku 4, zrzut tabeli akcji w tle (przyciemniony do 30%), tekst w polu 1080×510 |
| 6 | (opcjonalnie) `img/postacie/babcia.png` | 160×160 @2× = 320×320 | PNG z przezroczystością albo WebP | awatar w scence z Babcią (`#intro-overlay`, nagłówek telefonu) | ciepła ilustracja, ograniczona paleta (bursztyn + ink); bez tekstu w obrazku |

Wskazówki: eksport z Figmy (ramka = rozmiar docelowy, `Export → PNG 1×`), bez tekstu w obrazkach (tłumaczenia i czytniki), nazwy plików małymi literami bez polskich znaków. Po dostarczeniu #1–#4 czat kodu dopisze `manifest.webmanifest` i `<link rel="apple-touch-icon">` w `index.html`.

## Co zostało / do decyzji
- **10 starych PNG inwestycji** (`billboardicon`, `box`, `branch`, `equipment`, `fabrykaicon`, `globe`, `medlab`, `mine`, `server`, `update`) — widok ich już nie używa, ale ścieżki są w danych `companies.js` (pole `icon`). Proponuję usunąć je w kroku 7 razem z polem w danych (zmiana w pliku logiki — do zgody).
- **Figma:** po odnowieniu limitu MCP — jeden import `img/ikony/arkusz.html` na stronę „02 System” (komponenty ikon) oraz komponenty 0.15 (`MarketMood`, `MoodMeter`, `AchievementCard`) i nowe zmienne kolorów faz i stref (z kroku 5b).
- **Mentor i Akademia** (`learning.js`): ikony certyfikatów i haseł zostają z emoji (renderowane w pliku logiki; Akademia to treść encyklopedyczna). Do ewentualnej zmiany w kroku 7.
- **Klasa `.icon-24`** w `style.css` jest już martwa — do porządków w kroku 7.
- **Mignięcie ceny przy zmianie** w tabeli akcji — świadomie pominięte (koszt w `displayStocks` co tick).
