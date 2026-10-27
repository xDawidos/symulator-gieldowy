# 0.14.5 Redesign — krok 2: dostępność (WCAG 2.2 AA)

Data: 2026-10-17 · stan: `zmiany-AI` + krok 1 · ekrany jak w [01_ocena.md](01_ocena.md) (desktop 1440×900, oba motywy).

> Skill `accessibility-review` (wtyczka Design) nie był dostępny w tej sesji — przegląd zrobiony ręcznie:
> skrypt w przeglądarce przeszedł po **wszystkich widocznych tekstach** pulpitu i 10 okien (ok. 2 500 węzłów),
> policzył kontrast tekstu do rzeczywistego tła (z przezroczystościami), zmierzył cele kliknięcia i sprawdził fokus.
> Czytnika ekranu nie testowałem — wnioski o nazwach i rolach wynikają z DOM.

## Podsumowanie

| Obszar | Wynik | Najważniejsze |
|---|---|---|
| Kontrast tekstu — ciemny | **3 problemy na pulpicie, 6 w oknach** | szare paski tabeli `#545454`, czerwony `#EF4444` na kartach, tło karty spółki `#424242`, wersja `#555` |
| Kontrast tekstu — jasny | **9 problemów na pulpicie** | Reset 1,6:1, aktywna prędkość 1,9:1, aktywna zakładka giełd 2,0:1, czerwone/zielone chipy zmian ~4,0–4,4:1 |
| Kontrast elementów (ramki pól) | **nie spełnia** | ramka pola `#334155` na `#1F2937` = 1,4:1 (wymagane 3:1) |
| Cele kliknięcia (2.5.8, min. 24×24) | **99 poniżej 24 px** | 91× przycisk „i” 22×22, pola wyboru 13×13, wpisy w pasku newsów 15 px wysokości |
| Klawiatura | **duże luki** | wiersze spółek, chipy sektorów, sortowanie kolumn, lista poczty, klienci JU — tylko myszą |
| Fokus | widoczny, ale domyślny przeglądarki | brak własnego stylu (oprócz `.close-btn`); okna nie przenoszą fokusu |
| Okna (dialogi) | 5 z 41 ma `role="dialog"` | brak `aria-modal`, brak pułapki fokusu, fokus nie wraca po zamknięciu |
| Ruch | **dobrze**, z jedną luką | pasek newsów w trybie „ogranicz ruch” zmienia wpis co 5 s; pauza tylko po najechaniu myszą |
| Kolor jako jedyny nośnik | częściowo | zmiany % mają znak; skaner, wykres świecowy i wykres okresów tylko kolorem |

## 1. Kontrast tekstu (1.4.3, min. 4,5:1; duży tekst 3:1)

### Ciemny motyw
| Kontrast | Gdzie | Kolor na tle | Przyczyna w kodzie |
|---|---|---|---|
| 2,38:1 | „wersja 0.12 nauka” | `#555` na `#111827` | [style.css:147](../../style.css) — stary kolor z jasnego motywu |
| 2,95:1 (×47) | meta spółki w co drugim wierszu („Żywność • KFX”) | `#94A3B8` na `#545454` | szare paski tabeli [style.css:1515](../../style.css) (`#4f4f4f`, `#545454`, `#3f3f3f` spoza palety) |
| 4,33:1 (×47) | „0” w kolumnie „moje akcje” w co drugim wierszu | `#C0C4CC` na `#545454` | j.w. |
| 2,40:1 / 2,55:1 | znaczniki prezesa „Księgowy”, „Pewniak” | biały na `#A0A0A0` / `#4CAF50` | kolory cech w JS (styl w linii) |
| 2,67:1 i 3,92:1 | karta spółki: zmiana tygodniowa, podtytuł, „seria”, wiek prezesa | `#EF4444` / `#94A3B8` na `#424242` | tło karty [style.css:784](../../style.css) |
| 3,90:1 | czerwone wartości na kartach (JU, Państwo, karta spółki: „sektor 1.15 · droga”, „-7 078 927 zł”) | `#EF4444` na `#1F2937` | token `--color-down` za ciemny dla kart |
| 2,73:1 (×12) | podpisy kart KPI w Państwie i JU („+0.10% w kwartale”) | `#64748B` na `#243244` | `.bank-card-type` |

### Jasny motyw (traktowany po macoszemu — część reguł ciemnych „przecieka”)
| Kontrast | Gdzie | Kolor na tle |
|---|---|---|
| 1,20:1 | opis kosztu w rozwiniętym handlu („Wartość ~1 zł · prowizja…”) | `#5B6476` na `#525866` |
| 1,58:1 | przycisk **Reset** | `#FCA5A5` na `#FDE5E5` |
| 1,92:1 | aktywna prędkość „x5” | `#38BDF8` na `#E3F6FE` |
| 2,02:1 | aktywna zakładka giełd „Wszystkie” | `#22C55E` na `#E0F7E8` |
| 2,56:1 | nieaktywne „x1”, „x2” | `#94A3B8` na białym |
| 3,61:1 | „Sprzedaj” | `#FCA5A5` na `#685561` |
| 4,02:1 (×39) | chip spadku „-7.20%” | `#DC2626` na `#FDE5E5` |
| 4,45:1 (×52) | chip wzrostu „+3.21%” | `#15803D` na `#E0F7E8` |
| 4,39:1 (×49) | podnagłówki sektorów „─ 💳 Finanse ─” (11 px) | `#6B7280` na `#F3F4F6` |
| 4,36:1 | podpisy kart KPI (Państwo, JU) | `#64748B` na `#F3F5F9` |

Bez problemów: poczta, Akademia, bank, miasto, skaner, ustawienia, wykres (oba motywy).

## 2. Kontrast elementów interfejsu (1.4.11, min. 3:1)
- Ramka pól liczbowych i list: `--border-color` `#334155` na `#1F2937` = **1,42:1**, na `#111827` = 1,71:1. W jasnym `#D6DCE6` na białym = 1,38:1. Pola wpisywania ilości (`.qty-input-wrapper input`) nie mają ramki wcale [style.css:3398](../../style.css).
- Paski postępu (dostępność akcji, zaufanie) — pasek niebieski na ciemnym ok; tło paska prawie niewidoczne (to dopuszczalne, informacja jest też w liczbie).
- Nieaktywne przyciski prędkości w jasnym motywie — 2,56:1 (granica przycisku niewidoczna).

## 3. Cele kliknięcia (2.5.8 AA: min. 24×24 px; dobra praktyka dotyk: 44×44)
Na pulpicie 235 elementów klikalnych, **99 poniżej 24 px**:
- **91× przycisk „i”** (karta spółki) — 22×22 px, tuż obok nazwy (łatwo trafić w wiersz zamiast w „i”). [ui.js:1021](../../ui.js), [style.css:605](../../style.css), [style.css:2122](../../style.css)
- pola wyboru (`Emisja ciągła`, „także segmenty poboczne”) — 13×13 px, ale z klikalną etykietą (OK, jeśli etykieta zostaje `<label>`).
- pole liczby i lista w skanerze — 20 px wysokości.
- wpisy paska newsów — 15 px wysokości (klikalne, otwierają kartę spółki).
- `<summary>` „Dlaczego klienci odchodzą” — 18 px.

Poniżej 44 px (ważne na telefonie): 63 przyciski ▼ handlu, 18 chipów sektorów, 11 zakładek giełd, przyciski drugorzędne, prędkość.

## 4. Klawiatura (2.1.1) i fokus (2.4.3, 2.4.7, 2.4.11)

### Elementy tylko dla myszy (`onclick` na elemencie, który nie przyjmuje fokusu)
| Element | Liczba | Skutek |
|---|---|---|
| `tr.clickable` — wiersze tabeli (rozwijanie, nagłówki giełd) | 43 + 91 wierszy spółek | nie da się klawiaturą zwinąć giełdy ani wejść w wiersz |
| `span.sector-chip` — filtry sektorów | 33 | filtrowania nie da się zrobić klawiaturą |
| `th.clickable` — sortowanie kolumn | 14 | sortowanie tylko myszą |
| `div.mail-row` — lista poczty | 46 | **poczty nie da się czytać klawiaturą** |
| `div.ju-client` — klienci JU | 27 | j.w. |
| `span.news-item`, `h2/h3/span.clickable`, `span.chip-max` | 7 | zwijanie paneli, „MAX” |

**Kierunek (krok 5):** te elementy jako `<button>` (albo `role="button" tabindex="0"` + Enter/Spacja w jednym miejscu); sortowanie jako przycisk w `<th>` z `aria-sort`. To zmiana renderowania w ui.js — nazwy funkcji zostają.

### Fokus
- Widoczny jest tylko domyślny obrys przeglądarki (`auto`), w różnych kolorach (pomarańczowy, biały, zielony). Własny styl ma tylko `.close-btn:focus-visible` [style.css:3986](../../style.css).
- Dwa miejsca gaszą obrys (`outline: none`): suwak auto-inwestycji [style.css:505](../../style.css) i pole ilości w handlu [style.css:3405](../../style.css) — w tym drugim **fokus jest niewidoczny**.
- Przyklejony górny pasek może zasłaniać element z fokusem przy przewijaniu Tabem (2.4.11) — zrzut 11 w kroku 1.
- **Kierunek:** jeden token `--focus-ring` (2–3 px, kontrast ≥3:1 do obu teł), `:focus-visible` dla wszystkich interaktywnych; `scroll-margin-top` równy wysokości paska.

### Okna dialogowe (4.1.2, 2.4.3)
- 41 okien; `role="dialog"` ma 5, `aria-modal` — 0. Nazwy okien (tytuł) nie są powiązane.
- Po otwarciu fokus zostaje na `<body>` (sprawdzone na karcie spółki) — klawiatura dalej chodzi po pulpicie pod oknem.
- Brak pułapki fokusu i powrotu fokusu do przycisku, który otworzył okno.
- **Escape** zamyka okna `div[id$="-modal"]` [ui.js:3545](../../ui.js), ale nie zamyka poczty ani okien typu `intro-overlay`.
- **Kierunek:** wspólna funkcja widoku do otwierania/zamykania okna (rola, `aria-labelledby`, fokus na pierwszy element, pułapka, powrót, Escape) — podpięta pod istniejące `open…Modal()`.

### Nazwy przycisków (4.1.2)
- 91× „i” bez `aria-label` (czytnik przeczyta „i”). Potrzebne: `aria-label="Karta spółki Konfiturex"`.
- Przyciski z samą ikoną (▼, 📈, 📊, 🏗️, 🗳️, 📰) mają tylko `title` — wystarcza jako nazwa, ale `title` nie działa na dotyku; lepiej `aria-label` + widoczny podpis w rozwiniętym handlu.
- Nagłówki: jest tylko jeden `h1` i trzy `h2` na pulpicie; panel funduszu i sekcje nie mają nagłówków (nawigacja czytnikiem po nagłówkach słaba).
- Komunikaty: `#notif-bar` i `breaking-news` mają `aria-live` — dobrze. Dymki `showToast` znikają po 3 s (6 s dla ostrzeżeń) — przy dłuższych tekstach to za krótko do przeczytania (2.2.1); propozycja: czas zależny od długości tekstu + pauza przy najechaniu.

## 5. Ruch (2.2.2, 2.3.3) — `prefers-reduced-motion`
- **Pasek newsów:** przy „ogranicz ruch” pokazuje jeden wpis i zmienia go co 5 s bez animacji [ui.js:2777](../../ui.js) — dobrze. Pauza działa tylko po najechaniu myszą [ui.js:2758](../../ui.js); brak pauzy przy fokusie klawiatury i na dotyku, brak przycisku „wstrzymaj” (2.2.2 wymaga mechanizmu zatrzymania dla treści ruchomej >5 s).
- Animacje CSS: jedna (`breaking-in`, 0,25 s) i 13 przejść `transition` — drobne, ale nie są wyłączane przy „ogranicz ruch” (reguła `prefers-reduced-motion` dotyczy tylko `will-change` paska) [style.css:4417](../../style.css).
- Brak migających elementów (2.3.1 — OK).
- **Kierunek:** globalna reguła `@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms; transition-duration:.01ms } }`, przycisk pauzy w pasku newsów, pauza też przy `focusin`. Nowe animacje z kroku 6 — tylko z tą regułą.

## 6. Kolor jako jedyny nośnik informacji (1.4.1)
| Miejsce | Dziś | Ocena |
|---|---|---|
| Chip zmiany % w tabeli | kolor + znak `+`/`-` | OK; lepiej prawdziwy minus `−` i strzałka ▲/▼ (daltonizm: zielony `#22C55E` i czerwony `#EF4444` różnią się jasnością tylko ~1,7×) |
| Skaner: C/Z, C/WK, ROE… | wartość zielona/czerwona = lepiej/gorzej od mediany sektora | **tylko kolor** — potrzebny znak (▲/▼ albo „+/−” do mediany) lub ikona |
| Wykres świecowy | świeca rosnąca/malejąca tylko kolorem | dodać różne wypełnienie (pusta/pełna) — standard giełdowy |
| Wykres 4 okresów funduszu | słupki fundusz / GIG / rywale — kolor + legenda | dodać etykiety wartości nad słupkami |
| Karta spółki „sektor 1.15 · droga” | kolor + słowo | OK |
| Znaczniki giełd (Śmieciowa…Diamentowa) | emoji + nazwa | OK |
| Aktywny filtr/zakładka | tylko kolor tła | dodać obrys lub podkreślenie (w jasnym motywie dziś 2,0:1) |

## Wnioski dla palety (wejście do kroku 3)
Wyliczone kontrasty kandydatów (tła: ciemne `#111827` panel / `#1F2937` karta / `#243244` karta 2; jasne białe / `#F3F5F9` / `#EEF1F6`):

| Rola | Dziś | Problem | Propozycja | Kontrast na najgorszym tle |
|---|---|---|---|---|
| strata (ciemny) | `#EF4444` | 3,46–3,9:1 na kartach | `#F87171` | 4,70:1 |
| zysk (ciemny) | `#22C55E` | OK | zostaje (lub `#4ADE80`) | 5,71:1 |
| strata (jasny) | `#DC2626` | 4,27:1 na `#EEF1F6` | `#B91C1C` | 5,71:1 |
| zysk (jasny) | `#15803D` | 4,43:1 na `#EEF1F6` | `#166534` | 6,30:1 |
| ostrzeżenie (jasny) | `#B45309` | 4,44:1 na `#EEF1F6` | ciemniejszy bursztyn (np. `#92400E`) | do potwierdzenia w kroku 3 |
| tekst drugorzędny (jasny) | `#64748B` (część miejsc) | 4,2–4,36:1 | tylko `--text-muted` `#5B6476` | 5,26:1 |
| tekst drugorzędny (ciemny) | `#64748B` w `.bank-card-type` | 2,73:1 | tylko `--text-muted` `#94A3B8` | 5,07:1 |
| ramka pól (ciemny) | `#334155` | 1,42:1 | osobny token `--border-strong` ok. `#8A94A6` | 4,25:1 |
| ramka pól (jasny) | `#D6DCE6` | 1,38:1 | `--border-strong` ok. `#7C8698`–`#6B7588` | ≥3:1 (do wyliczenia) |
| tło kart/okien | `#424242`, `#545454`, `#4F4F4F` | spoza palety | tylko `--bg-elevated*` | — |

Zasady na krok 3:
1. Każda para „kolor tekstu × tło” w tokenach sprawdzona na **wszystkich trzech** tłach motywu (panel, karta, karta 2) — w dokumencie systemu tabela kontrastów.
2. Zysk/strata zawsze z drugim nośnikiem (znak, strzałka, wypełnienie).
3. Kolory stanów (aktywny, wybrany, wyłączony) mają obrys, nie tylko tło.
4. Osobne tokeny: `--border-soft` (dekoracja, może być <3:1) i `--border-strong` (pola, przyciski — ≥3:1), `--focus-ring`.
5. Rozmiary: cel kliknięcia min. 24×24 na desktopie, 40–44 px na mobile; tekst min. 12 px (dziś 10–11 px w 22 miejscach CSS).

## Lista poprawek do kroku 5 (kolejność wg wpływu)
1. Elementy tylko-myszą → przyciski (wiersze, chipy, sortowanie, poczta, klienci JU).
2. Wspólna obsługa okien (rola, fokus, Escape, powrót fokusu).
3. Tokeny kontrastowe (tabela wyżej) + usunięcie `#424242`, `#545454`, `#555`.
4. Styl `:focus-visible` i `--focus-ring`; usunąć `outline: none` z pola ilości.
5. Przycisk „i” 24×24+ z `aria-label`; większe cele na mobile.
6. Pasek newsów: przycisk pauzy, pauza przy fokusie; globalna reguła reduced-motion.
7. Drugi nośnik dla koloru w skanerze i na wykresach.
