# 0.14.5 Redesign — krok 1: ocena (hierarchia, czytelność, spójność)

Data: 2026-10-17 · gałąź bazowa: `zmiany-AI` (f133ad9) · motyw oceniany: ciemny (domyślny), kontrolnie jasny.

> Uwaga o narzędziach: w tej sesji wtyczka Design (skill `design-critique`) nie była dostępna na liście skilli,
> więc ocenę zrobiłem ręcznie według tej samej struktury (pierwsze wrażenie → hierarchia → czytelność → spójność → użyteczność),
> uzupełniając zrzuty pomiarami z przeglądarki (rozmiary, kolory, wysokości wierszy liczone przez `getComputedStyle`).

## Zestaw ekranów do porównań przed/po

Zawsze te same ekrany i rozmiary: **desktop 1440×900** oraz **mobile 390×844** (zrzuty z panelu są skalowane do szerokości 800 px).
Stan gry: nowa gra (Polska, domyślne nazwy), ok. 1 min na x5, potem pauza. Ekrany otwierane funkcjami widoku (`openDescriptionModal('KFX')`, `openMailbox()`, `openAcademy()` itd.), żeby dało się je powtórzyć w kroku 7.

| Nr | Plik (`zrzuty/przed/`) | Ekran | Jak otworzyć |
|---|---|---|---|
| 01 | `01_start_nowa_gra.jpg` | start nowej gry (Babcia + formularz) | czysty zapis, odśwież |
| 02 | `02_pulpit_gora.jpg` | pulpit: górny pasek, panel funduszu | po starcie |
| 03 | `03_rynek_filtry_naglowek.jpg` | filtry giełd i nagłówek tabeli | przewiń `#market` |
| 04 | `04_tabela_akcji_sektory.jpg` | tabela akcji z podnagłówkami sektorów | przewiń `#market` |
| 05 | `05_wiersz_handel_rozwiniety.jpg` | wiersz z rozwiniętym handlem (▼) | `toggleStockDrawer('KFX')` |
| 06 | `06_karta_spolki.jpg` | karta spółki | `openDescriptionModal('KFX')` |
| 07, 08 | `07_poczta_lista.jpg`, `08_poczta_wiadomosc.jpg` | poczta | `openMailbox()` |
| 09 | `09_akademia.jpg` | CV i szkolenia → Akademia | `openAcademy()` |
| 10 | `10_skaner_spolek.jpg` | skaner spółek | `openScanner()` (wymaga Analityka) |
| 11 | `11_inkubator_pula_topbar_zaslania.jpg` | inkubator / pula start-upów | `toggleStartupPanelVisibility()` |
| 12 | `12_miasto.jpg` | miasto (festiwal) | `openCityInvestmentModal()` |
| 13 | `13_panstwo_kraj.jpg` | Państwo → Kraj | `openCountryPanel()` |
| 14 | `14_klienci_rynek_JU_dymki_zaslaniaja.jpg` | klienci i rynek JU + stos dymków | `openJuMarket()` |
| 15 | `15_panel_funduszu_wyniki.jpg` | panel funduszu: wyniki 4 okresów | przewiń `#portfolio` |
| 16 | `16_okno_decyzji_potwierdzenie.jpg` | okno decyzji (potwierdzenie) | `gameConfirm(...)` |
| 17 | `17_wykres_swiecowy.jpg` | wykres ceny | `showPriceHistoryModal('KFX')` |
| 18 | `18_pasek_newsow.png` | pasek newsów | góra ekranu |
| 19, 19b | `19_motyw_jasny_pulpit.jpg`, `19b_motyw_jasny_karta_spolki.jpg` | motyw jasny | `toggleDarkMode()` |
| 20 | `20_waski_panel_800px.jpg` | szerokość pośrednia ~800 px | — |
| 21–25 | `21_mobile_390_gora.jpg` … `25_mobile_390_tabela_niewidoczna.jpg` | mobile: góra, przyklejony pasek, menu, karta, tabela | 390×844 |

## Pierwsze wrażenie

Ciemny „dashboard” z kartami i zaokrągleniami ma dobry kierunek (spójne panele, czytelne KPI w oknach Państwa i JU).
Ale **pulpit nie pokazuje tego, co w grze najważniejsze — rynku**. Na 1440×900 górny pasek zajmuje 30% wysokości,
a tabela akcji mieści 2–3 spółki. Okna powstawały w różnych etapach i widać to: część ma nowy nagłówek „bank-hero”,
część stary szary prostokąt bez tła pod spodem. Liczby są zapisywane na kilka sposobów naraz.

## Problemy uszeregowane według wpływu

Skala: **K** krytyczny (blokuje grę / główny ekran) · **W** wysoki · **Ś** średni · **N** niski.

### K1. Górny pasek zjada ekran (desktop 30%, mobile ~70%) — zrzuty 02, 11, 22, 25
- Desktop: `#topbar` ma 270 px z 900 (siatka `minmax(240px,1.2fr) auto auto auto` łamie się na 3 rzędy: tytuł, KPI, prędkość i 5 przycisków). [style.css:2810](../../style.css)
- Pasek jest `position: sticky` i przy przewijaniu strony **zasłania treść** (zrzut 11: nagłówek inkubatora pod paskiem).
- Mobile 390 px: pasek ma ~600 px wysokości i też jest przyklejony — pod nim zostaje ~230 px; tabeli akcji praktycznie nie widać (zrzuty 22, 25). [style.css:3569](../../style.css), [style.css:2461](../../style.css)
- Tytuł „Stock Market Trader Game” zajmuje miejsce dwa razy (pasek boczny i górny), a „wersja 0.12 nauka” jest nieaktualna.
- **Kierunek:** jeden niski pasek (KPI + prędkość/pauza), rzadkie akcje (Zapisz, Eksport, Reset) do menu/ustawień; na mobile pasek zwinięty do jednej linii KPI.

### K2. Tabela akcji: 3 spółki na ekran, wiersze 68–142 px — zrzuty 04, 05
- 91 wierszy, średnio **91 px**, maks. 142 px. Długie nazwy łamią się na 3 linie, a przycisk „i” spada do osobnej linii („Wieczne Ziemniaki Sp. z o.o.”). [ui.js:1021](../../ui.js), [style.css:1390](../../style.css)
- Nagłówek kolumn ma 77 px („Wolumen / dostępne” w 3 liniach).
- Tabela przewija się w swoim panelu (`#market`, ok. 580 px), a strona przewija się osobno — dwa paski przewijania jeden obok drugiego, łatwo „zgubić” przewijanie.
- Mobile: tabela ma 334 px, kolumny 3–5 (zmiana, wolumen, moje akcje) są ściśnięte do 0 px i znikają, wiersz ma 165 px (zrzut 25; przyczyna do sprawdzenia w kroku 5 — brak osobnego układu tabeli na wąski ekran).
- **Kierunek:** gęsty wiersz 44–52 px (nazwa w jednej linii z obcięciem i pełną nazwą w dymku, meta pod spodem drobniej), stała szerokość kolumn liczbowych, na mobile układ „karta-wiersz” (nazwa + cena + zmiana w jednym rzędzie).

### W1. Niespójny zapis liczb i walut — zrzuty 02, 04, 09, 11
W jednym widoku: `10000.00` i `10 000,00 zł` (gotówka zmienia format po pierwszym ticku), `2,00 PLN` i `100,00 zł`, `0.00%` (kropka) obok `2,00` (przecinek), `3 479 764 384 zł` obok `3479,76 zł`, `Moje pieniądze: 103.00 zł`, `382,538 PLN` (przecinek jako separator tysięcy — wygląda jak 382 zł), `NAV / JU 10.0000 zł`.
Źródło: kilka formatów (`formatZl` [ui.js:5408](../../ui.js), `formatPlnShort` [player.js:3742](../../player.js), `formatProjectMoney`, `formatConstructionMoney`) i 65× `toFixed()` w ui.js.
- **Kierunek (warstwa widoku):** jeden formatter `pl-PL` dla kwot (`12 345,67 zł`), procentów (`−5,21%`, ze znakiem minus) i NAV (4 miejsca po przecinku, ale z przecinkiem). Tylko „zł” albo tylko „PLN” — do decyzji w kroku 4.

### W2. Okna wyglądają, jakby pochodziły z różnych gier — zrzuty 06, 07, 12, 13, 14, 16, 17
- Trzy rodziny nagłówków: „bank-hero” z ikoną i paskiem (Państwo, Miasto, JU), zwykły tytuł h2 (Akademia, Skaner, wykres), nagłówek poczty.
- Karta spółki w ciemnym motywie ma tło **#424242** (neutralny szary spoza palety) z dawnej reguły `body.dark-mode #description-modal … !important` [style.css:784](../../style.css).
- Karta spółki, potwierdzenie i wykres **nie mają przyciemnienia tła** — wyglądają jak doklejone do pulpitu; Akademia i Poczta mają. Okna nie mają `role="dialog"`, fokus zostaje na przycisku pod oknem (szczegóły w kroku 2).
- Przycisk zamknięcia: czerwone kółko z „×” w rogu — wygląda jak przycisk ostrzegawczy, różne rozmiary w różnych oknach.
- Wykres: jasnoszare płótno w ciemnym oknie, mały (≈400×220), zbędny poziomy pasek przewijania (zrzut 17).
- **Kierunek:** jeden komponent okna (nagłówek z ikoną, opcjonalny pasek KPI, zakładki, stopka akcji), jedno tło i jedna zasłona.

### W3. Akcje bez hierarchii; niebezpieczne obok bezpiecznych — zrzuty 02, 08, 16, 19
- Górny pasek: Wznów / Zapisz / Eksport / **Reset** / Rynek w jednym rzędzie, ten sam rozmiar; „Reset” (kasuje zapis, natywny `confirm()` [main.js:772](../../main.js)) stoi tuż obok „Zapisz”.
- Przycisk „📊 Rynek” otwiera **Bank** (`openBankModal()`) — etykieta nie odpowiada celowi. [index.html:143](../../index.html)
- Potwierdzenie: „Anuluj” i „Potwierdź” wyglądają tak samo, brak przycisku głównego (zrzut 16).
- Poczta: „Usuń” ma tę samą wagę co „Oznacz gwiazdką” (zrzut 08).
- Motyw jasny: Reset jest bladoróżowy, prawie niewidoczny, a Zapisz/Eksport/Rynek są czarne i najmocniejsze na ekranie (zrzut 19).
- **Kierunek:** 3 poziomy przycisków (główny / drugorzędny / cichy) + wariant niebezpieczny używany tylko w oknach potwierdzenia.

### W4. Dymki powiadomień zasłaniają treść i się piętrzą — zrzut 14
Powiadomienia (`#notif-bar`, z-index 3500) zostają, aż gracz je zamknie; po minucie gry 3 dymki zakrywają tabelę funduszy w oknie JU i prawy dolny róg pulpitu. [style.css:4420](../../style.css)
- **Kierunek:** maks. 2 widoczne + licznik „+3”, automatyczne zwijanie do ikony dzwonka, dymki pod oknami modalnymi albo przesunięte, gdy okno jest otwarte.

### Ś1. Filtry sektorów: „osierocone” ikony i nadmiar chipów — zrzuty 03, 10
- Ikony grup (💰 🛒 🏭 🏥) wstawione między chipy jako gołe emoji bez tła i podpisu — wyglądają jak zepsute przyciski. [ui.js:60](../../ui.js), [style.css:3135](../../style.css)
- Nad tabelą są dwa rzędy filtrów (sektory ×17, giełdy ×10) — razem ok. 250 px, zanim zacznie się tabela.
- **Kierunek:** grupy jako małe etykiety tekstowe („Finanse:”) albo rozwijane menu grup; filtry giełd jako jeden segment/rozwijana lista.

### Ś2. Podnagłówki sektorów i giełd za słabe — zrzut 04
`— 🍞 Żywność —` ma 11 px i 21 px wysokości — gubi się między wysokimi wierszami. Nagłówek giełdy („Giełda Śmieciowa 🗑️ ▼”) i nagłówek GPW mają podobną wagę do wierszy spółek. [style.css:1535](../../style.css)
- **Kierunek:** czytelna drabinka: giełda (pasek z kolorem rangi giełdy) → sektor (12–13 px, wersaliki, licznik spółek) → spółka; spółki zależne pod matką z wcięciem i linią.

### Ś3. Paleta i style nawarstwione — cały style.css
- 4498 linii, **185 różnych kolorów hex** wpisanych na sztywno, **192× `!important`**, stary ciemny motyw (linie 652–1573) i nowy system zmiennych (1573+) działają jednocześnie.
- Te same selektory zdefiniowane kilka razy: `.topbar` ×4, `.stock-name` ×3, `.app-sidebar` ×2, `.info-btn` ×2; czcionki importowane dwa razy, `--radius-*` zdefiniowane dwa razy z różnymi wartościami (6/10/14 i 10/14/18) — [style.css:1598](../../style.css), [style.css:2637](../../style.css).
- Każde okno ma własną parę kolorów (`--bank-navy`, `--bank-gold` dla JU, Państwa, Miasta, Budownictwa) — to dobry pomysł (rozpoznawalność), ale nie jest częścią palety.
- Rozmiary tekstu: 27 różnych wartości (10, 10.5, 11, 12, 12.5, 13 px…, rem i px wymieszane).
- **Kierunek:** krok 3 — jedna warstwa tokenów, skala 6–7 rozmiarów tekstu, kolory okien jako „akcenty sekcji” w palecie.

### Ś4. Nawigacja: zdublowane ikony i pozycje — zrzuty 02, 23
- Bank i Lombard mają tę samą ikonę 🏦; Kraj oraz Klienci i rynek JU — tę samą 👥.
- „Kraj” to w praktyce zakładka okna „Państwo” (zrzut 13), a w menu jest osobną pozycją; Akademia jest ukryta w „CV i szkolenia”.
- 13 pozycji bez grupowania (świat / moja firma / narzędzia).
- Mobile: menu otwiera się jako pusta kolumna z siatką ikon dosuniętą do dołu, „Ustawienia” ucięte, brak przycisku zamknięcia (zrzut 23). [style.css:3620](../../style.css)
- **Kierunek:** grupy w menu, unikalne ikony (SVG w kroku 6), na mobile dolny pasek 4–5 najczęstszych miejsc + „Więcej”.

### Ś5. Emotikony jako jedyne ikony — wszystkie ekrany
Emoji renderują się różnie w systemach (Windows vs Android), mają własne kolory, które kłócą się z paletą, i nie skalują się z tekstem równo (np. 🗑️ przy „Giełda Śmieciowa”, ikony w zakładkach karty spółki). W tabeli ikony narzędzi w rozwiniętym handlu (📈 📊 🏦 🏗️) nie mają podpisów (zrzut 05).
- **Kierunek:** krok 6 — zestaw ikon SVG w jednym stylu (kreska, `currentColor`), emoji zostawić w treściach fabularnych (Babcia, poczta).

### Ś6. Panel funduszu: dużo tekstu tej samej wagi — zrzuty 02, 15
Ostrzeżenia, limity emisji, okresy i wskaźniki mają ten sam mały rozmiar i podobny kolor; najważniejsze („Zaufanie spada”) ginie. Wiele sekcji `<details>` z trójkątami ▶ w różnym stylu. Wykres 4 okresów ma bardzo dużo pustego miejsca.
- **Kierunek:** u góry 4 KPI, pod nimi jeden „stan” (ostrzeżenie w ramce z ikoną), resztę w zwijanych sekcjach jednego typu.

### N1. Teksty i nazwy (szczegóły w kroku 4)
- Angielski tytuł gry i `<title>` w polskiej grze: „Stock Market Trader Game”.
- „wersja 0.12 nauka” (nieaktualna), „Historia Cen:” (wielkie litery w środku), „Ranking Stoisk na Żywo”, „Cel Promocji” — niespójna wielkość liter.
- Zablokowany skaner wygląda jak aktywny przycisk; dopiero po kliknięciu dymek mówi, że trzeba szkolenia.

### N2. Drobiazgi wizualne
- Tekst wersji `#555` na ciemnym tle — kontrast ok. 2,4:1 (krok 2). [style.css:147](../../style.css)
- Tekst opisu spółki wyjustowany — na mobile powstają „rzeki” odstępów (zrzut 24).
- Pasek newsów przy jasnym motywie zostaje ciemny; brak pauzy po najechaniu (do sprawdzenia w kroku 2).
- Szerokość ~800 px (zrzut 20): pasek boczny zostaje w pełnej szerokości i ściska treść.

## Co działa dobrze (zachować)
- Okna Państwa/Kraju i Klientów JU: pasek KPI pod nagłówkiem, karty wskaźników z mini-wykresami — dobry wzorzec dla reszty okien.
- Kolor i krój KPI (Sora) w górnym pasku — czytelne liczby.
- Wyraźne chipy „zmiana %” w tabeli (czerwony/zielony) i paski dostępności akcji.
- Poczta: trzy kolumny (foldery / lista / podgląd) — dobry układ, wymaga tylko dopracowania gęstości i stanów.
- Powitanie Babci w formie czatu — ma charakter, warto je zachować.

## Priorytety na kolejne kroki
1. **Układ pulpitu** (K1, K2): niski pasek górny, gęsta tabela, jedno przewijanie — największy zysk w grze.
2. **Format liczb** (W1) — tani, a podnosi wrażenie jakości wszędzie.
3. **Jeden komponent okna i przycisków** (W2, W3) — przy okazji system designu (krok 3).
4. **Powiadomienia** (W4) i **filtry/podnagłówki** (Ś1, Ś2).
5. Paleta i porządek w CSS (Ś3) — fundament w kroku 3/5.
