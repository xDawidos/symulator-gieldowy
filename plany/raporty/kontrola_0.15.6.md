# Kontrola 0.15.6 „Giełdy wejścia” (2026-10-26)

- **Kod:** gałąź `claude/impl-0156-717f07` (od `992f999` = 0.15.5, nie scalona), części E0–E8, commit po każdej części i po każdym strojeniu. Nowy moduł `listings.js` (wymogi, NH, giełda prywatna, ścieżka startupu, urząd antymonopolowy, media-córka, widoki); haki w `companies.js`, `core.js`, `finance.js`, `ai.js`, `player.js`, `main.js`, `ui.js`, `learning.js`.
- **Plan i diagnoza:** `plany/plan_0.15.6_gieldy_wejscia.md`, `plany/raporty/diagnoza_0.15.6.md` (E0).
- **Testy:** `tests/tests.html` — nowe grupy „0.15.6 E1…E8” (44 testy); razem **712/712** (668 dotychczasowych bez zmian; poza jednym wpisem w `resetWorld`, który wyłącza nowe kierowanie debiutów w testach starszych od 0.15.6 — tak samo jak wcześniej `SUBCONTRACTOR_RULES`).
- **Zapis gry:** nadal v15. Nowe pola opcjonalne: w spółce `market` (NH/PRV; brak = GPW), `marketSinceQ`, `belowReqQ`, `sectorBase`, `antitrust`, `antitrustBanUntilQ`, `mediaCred`, `mediaLie`; w zapisie `antitrustOffice` (poziom urzędu — dawniej w ogóle nie zapisywany) i `antitrustLog`. Migracja: spółki bez pola rynku zostają na GPW (test). Przyrost: ≈ 4,3 tys. znaków na 2,3 mln typowego zapisu = **≈ 0,19%** (test z budżetem 0,3%).
- **Przebiegi** (`tests/przebiegi.html`, ×200, wirtualny zegar, kopia kodu 0.15.5 w osobnym katalogu jako baza, te same sondy): **po zmianach** 20 gier × 6,5 roku bez presetu (`k65`), 20 × 6,5 roku `fundusz-gig` (`k65g`), 10 × 20 lat (`k20`); **baza 0.15.5**: `b65`, `b65g` po 20 gier, `b20` 10 gier. Wynik serii zbiorczych jest w sondzie `p0156` (nie commitowano plików JSON — kilka MB każdy).
- **Rozrzut:** GIG ma odchylenie ≈ 4–5 pp między grami, więc błąd średniej z 20 gier to ≈ 1 pp, a z 10 gier ≈ 1,5 pp; przy tych próbach „±1 pp” nie da się potwierdzić ani obalić. Znany odziedziczony problem GIG po 20 latach (13,9% wobec 11,5% w bazie 0.15.3) nie jest tu naprawiany; baza `b20` dała 13,0%.

## Co zrobiono

| Część | Zakres |
|---|---|
| E0 | Sonda `PROBE_0156` (rynki i poziomy, kapitalizacja/zysk/wiek/wolny obrót, debiuty startupów, HHI, oszustwa, wycofania), diagnoza z odczytanymi progami. **Odkrycie:** „NewHorizons” w grze było nazwą panelu inkubatora, nie rynkiem, a wymogów wejścia nie było wcale — NH i giełdę prywatną trzeba było stworzyć. |
| E1 | Wymogi wejścia (kapitalizacja 100 tys. zł, wolny obrót 30%, dodatni zysk) z mnożnikiem 1,0 do 100 spółek krajowych → 1,5 przy ≥ 125 (`getListingRequirementMultiplier`); rynki NH i PRV w `MARKET_OPERATOR_DEFS` (flaga `entry`, bez spółki-operatora, poza limitem spółek krajowych, w łącznym sufitcie 150); **zejście na NH zamiast upadku** (kapitalizacja poniżej 30% wymogu przez 4 kw., najwyżej 2 spółki na kwartał, od najsłabszej; NH pełny → wykup jak przy wycofaniu z 0.15.4 P5). |
| E2 | NH: zmienność ×1,45, szansa upadku ×3, „przełomy” (4%/kw. dla zdrowych spółek, kurs +15…40%), minimalny obrót 0,3% kapitalizacji (popyt zastępczy państwa, ≤ 15 spółek/kw., tylko przy dodatnim skarbie); nie inwestują `calm`, `banker`, `dividend_chaser` oraz fundusze `cautious`/`dividend`; gracz od poziomu dostępu 2 (NH) i 3 (PRV). |
| E3 | Debiut wg kapitalizacji: ≥ wymóg GPW → GPW (brak miejsca: czeka w inkubatorze jak dotąd), ≥ wymóg NH (24 tys.) → NH, mniej → giełda prywatna; z NH po 8 kw.: awans na GPW (35%/kw. przy spełnionych wymogach) albo słaba spółka → giełda prywatna (60%) lub firma prywatna (wykup, 40%); PRV: szansa startu oszustwa ×5, wykrycie 4–10 kw. (GPW 3–7), spadek po ujawnieniu o 15 pp mocniejszy, własny limit oszustw, pojemność ≤ 10% spółek, limit funduszu gracza 20% wartości z komunikatem. |
| E4 | Spółki miejskie debiutują na NH (reguła 3–5 z 8 z 0.15.4 P7 bez zmian), bez ryzyka NH i ograniczeń inwestorów; awans na GPW po 8 kw. i spełnieniu wymogów (wolny obrót ≥ 30% wymaga mniejszego pakietu miasta). |
| E5 | Urząd antymonopolowy wg poziomu (0–5; interwencje od poziomu 1, progi poziomów 1–3): wskaźniki — udział w przychodach sektora głównego (od 5 spółek i po wzroście o ≥ 25 pp), w przetargach (okno 8 kw. z 0.15.5), w kapitalizacji; kara 2/3,5/5% rocznych przychodów (≤ połowy gotówki) po 2 kw. ponad progiem, po 4 kw. nakaz podziału (wymuszone wydzielenie przez istniejący `executeSpinoff` — wartość dla posiadaczy zachowana, test) albo zakaz przejęć na 12 kw.; próg blokady fuzji = ustawa × (1 … 0,75) wg poziomu; najwyżej 1 interwencja na kwartał. |
| E6 | Media-córka jako gazeta matki: maile (≤ 2 na kwartał) o matce (przychylnie, 35% podkolorowane) i o jej konkurentach (50% nieprawdziwy zarzut, −1% × wiarygodność kursu), źródło i wiarygodność w każdym mailu, zdemaskowanie (15% × (1 + KNF) na kwartał): kara 2% kapitalizacji (≤ 30% gotówki), matka −3%, wiarygodność −20 pp (min. 10%). |
| E7 | Panel Rynki (Państwo): ścieżka spółki, karty wymagań GPW/NH/PRV z ryzykiem słowem; plakietka rynku przy spółce („rynek NH · ryzyko podwyższone”, „giełda prywatna · ryzyko oszustwa”); nagłówek rynku wejścia bez przycisku koncesji; karta urzędu antymonopolowego z progami i ostatnimi interwencjami; 3 hasła Akademii (rynek główny i alternatywny, giełda prywatna, antymonopol) z quizem i odblokowaniem przy zdarzeniach. Komponenty 0.14.5, ikony SVG, bez nowych okien. |
| E8 | Pomiar, strojenie (2 rundy), poprawka błędu z 0.15.4 (niżej), testy zapisu i niezmienników, ten raport. |

## Wyniki (tabela „Jak sprawdzimy”)

| Miara | Cel | Baza 0.15.5 | Po zmianach | Stan |
|---|---|---|---|---|
| Spółki krajowe na koniec (maks. w grze) | 100–115 | 6,5 r.: 82; 20 lat: 110 | 6,5 r.: 72; **20 lat: 88 (maks. 93)** | ❌ poniżej (celowo część spółek jest na NH; łącznie 150 = sufit) |
| > 125 spółek krajowych dłużej niż 2 kw. | nigdy | nigdy | nigdy | ✅ |
| Udział spółek na NewHorizons (koniec) | 15–30% | 0% | 6,5 r.: **12–13%**; 20 lat: **17%** (do 36 spółek) | ⚠ 6,5 r. poniżej, 20 lat ✅ |
| Startupy awansujące z NH na GPW | 20–40% | brak NH | 6,5 r.: 40 awansów na 267 wejść na NH (15%, za mało czasu); **20 lat: 161 na 639 (25%)** | ✅ (20 lat) |
| Upadki na NH względem GPW | 2–3× | — | na spółkę-rok: NH 1,07%, GPW 0,14% (7,6×; GPW traci słabe spółki na rzecz NH), względem **GPW z bazy 0,63% = 1,7×** (6,5 r.: 2,2% wobec 0,48% = 4,6×) | ⚠ zależy od odniesienia |
| Giełda prywatna: udział spółek | ≤ 10% | — | 2–3% (maks. 7%) | ✅ |
| Giełda prywatna: oszustwa wobec GPW | ok. 5× | — | na spółkę-rok: PRV 7,4%, GPW 1,9% = **3,9×** (6,5 r.: 13% wobec 2,3% = 5,8×, tylko 105 spółko-lat) | ⚠ ok. 4× |
| Wykrycie oszustwa w ciągu 8 kw. | ≥ 50% | — | z konstrukcji: GPW 100% (3–7 kw.), PRV 71% (4–10 kw.) + KNF; ujawnionych 636 przy 509 rozpoczętych w 10 grach 20-letnich (część z wcześniejszych startów) | ✅ (z konstrukcji; bez pomiaru rozkładu) |
| Interwencje antymonopolowe na 20 lat | 0–2 | 0 | **mediana 1,5 (0–6)**: 9 z 10 gier ≤ 2, jedna gra 6 | ⚠ |
| Interwencje w 6,5 roku | — | 0 | 5 kar/podziałów w 20 grach | — |
| GIG CAGR: 6,5 r. bez presetu | ±1 pp | 9,3% | 9,6% (**+0,3 pp**) | ✅ |
| GIG: 6,5 r. `fundusz-gig` | ±1 pp | 11,0% | 9,7% (**−1,3 pp**) | ⚠ w granicy szumu |
| GIG: 20 lat | ±1 pp | 13,0% | 13,8% (**+0,8 pp**) | ✅ |
| Marża końcowa (ważona): 6,5 r. / `fundusz-gig` / 20 lat | ±0,5 pp | 22,4% / 22,7% / 17,8% | 22,9% (+0,5) / 22,2% (−0,6) / 20,2% (**+2,3**) | ⚠ 20 lat w szumie (poprzednie bazy 20-letnie: 16,8–19,9%) |
| Niezmienniki | 0 | 0 | 0 w 50 grach | ✅ |
| Ujemna gotówka | 0 | 0 | 0 w 40 grach; **1 przypadek** (HYDO: strajk, −0,x zł, `startStrike` — kod nieruszany w 0.15.6) | ⚠ |
| Wyjątki JS | 0 | 0 | 0 w seriach końcowych (pierwsza seria dała 5× `processAiLoansWeekly` — poprawione, niżej) | ✅ |
| Czas kroku | +≤ 2% | 1704 ms (6,5 r. `fundusz-gig`) / 2090 ms (20 lat) | 1378 ms / (k20: 3195 ms przy zamrożeniach Edge — nieporównywalne) | ⚠ niemiarodajne |
| Zapis gry | +≤ 0,3% | — | +0,19% (oszacowanie bezpośrednie, test) | ✅ |

## Odstępstwa od planu i otwarte sprawy

1. **NewHorizons nie istniał jako rynek** (plan zakładał, że tak): stworzony w E1 jako rynek bez spółki-operatora (flaga `entry`, „państwowy operator” = rynek prowadzony przez państwo bez opłat i bez zależności od upadku operatora). Panel startupów w `index.html` nadal nazywa się „Giełda NewHorizons” — nazwę panelu zostawiono, bo zmiana tekstów to osobna sprawa dla czatu designu.
2. **Wymogi wejścia dopiero w tej wersji:** progi 100 tys. / 24 tys. / 5 tys. zł wybrane z rozkładu kapitalizacji (E0) i dostrojone w E8 (z 80 tys.); „wiek” spółki użyty tylko do awansu z NH (8 kw.), nie do debiutu.
3. **Minimalny debiut to 1000 akcji po 25–50 zł (≥ 25 tys. zł)**, więc startup nigdy nie ma kapitalizacji poniżej wymogu NH — giełda prywatna jest w praktyce tylko ścieżką z NH (test sprawdza funkcję wyboru rynku dla małych kwot).
4. **Market maker państwa** to popyt zastępczy (podnoszony obrót), nie transakcje na akcjach — brak właściciela „państwa” w księgach akcji (audyt A1 liczy posiadaczy); skarbu nie obciąża.
5. **Szansa oszustwa na giełdzie prywatnej** zrealizowana jako mnożnik ×5 szansy kwartalnej (jak GPW 0,8%/kw.), nie jako „25% spółek przy wejściu”; zmierzone ≈ 4× (ograniczenie: limit jednoczesnych oszustw 80% spółek PRV i krótki pobyt spółek na PRV). Ukryte zobowiązania i „zaniżona jakość raportów” na PRV — **nie dodano** (zostają mechaniki 0.15.1).
6. **Szansa upadku NH ×3** (nie ×2,5): przy ×2,5 pomiar dał 1,7× upadków GPW z bazy; na NH trafiają słabsze spółki (selekcja), więc wobec samego GPW po zmianach to 7–8×.
7. **Urząd antymonopolowy: miara HHI wg kapitalizacji jest bezużyteczna** (jedna spółka ma ≈ 99% kapitalizacji sektora — giganci ×100 większe od reszty), więc interwencje opierają się na udziale w przychodach sektora liczonym od 5 spółek **i po wzroście o ≥ 25 pp**, na udziale w przetargach i w kapitalizacji rynku. Pierwsze progi dały 14–26 interwencji na 10 lat, drugie (sektor od 85%, przetargi 65%, kapitalizacja 45–50%) — mediana 6,5 na 20 lat, po podniesieniu wzrostu do 25 pp i progów kapitalizacji — mediana 1,5; jedna gra 20-letnia ma nadal 6 interwencji.
8. **E6 zrobione w wersji skróconej:** nie mierzono, jak często w grze występuje spółka zależna z sektora Media (maile gazety zależą od ich istnienia) — testy pilnują mechaniki, przebiegi nie liczą maili gazet.
9. **E7 bez czatu designu:** wygląd z gotowych klas (`bank-card`, `bank-grid`, `list-plain`), bez makiet w Figmie; lista „Ścieżka spółki” to zwykła lista numerowana, nie oś. **Mapa spółek jako drzewo genealogiczne** (zlecenie dla czatu designu, punkt 4) — nie zrobiona.
10. **Poprawka błędu z 0.15.4 P5** wykryta przez pomiar: `delistWithBuyout` zerował zastaw pożyczek botów, a `processAiLoansWeekly` czytał `loan.collateral.quantity` dla lombardu po terminie (TypeError co tydzień). Naprawione (spłata z gotówki bota, reszta umorzona) + test. Wcześniej błąd ujawniał się rzadko, bo wycofań było ≈ 0.
11. **Narzędzia:** `run_tests.mjs` i `run_przebiegi.mjs` — osobne porty (`SIM_PORT`/`SIM_CDP`), osobny profil Edge, `no-store`, zabijanie całego drzewa Edge, flagi przeciw usypianiu kart i co sekundę `Page.setWebLifecycleState`. Wcześniej domyślne porty 8765/9222/9223 bywały zajęte przez inne sesje i narzędzie czytało **cudze wyniki**, a ukryte karty Edge zamrażały się po kilku minutach (przebieg stawał w miejscu).

## Lista commitów (od `992f999`)

`git log 992f999..HEAD`: E0 (sondy, diagnoza), E1 (wymogi, rynki NH/PRV, zejście), E2 (NH), E3 (ścieżka, giełda prywatna), E4 (spółki miejskie), E5 (urząd), E6 (media-córka), E7 (widoki, Akademia), E8 (testy zapisu, strojenie ×2, poprawka lombardu, narzędzia, ten raport).

## Pominięte i problemy

1. **Spółki krajowe poniżej celu (20 lat: 88 wobec 100–115):** rynek krajowy jest świadomie mniejszy, bo słabe spółki i część debiutów trafiają na NH; łącznie spółek jest tyle co przedtem (sufit 150 osiągany lub prawie w 7 z 10 gier — nowe debiuty czekają w inkubatorze). Do decyzji: obniżyć wymóg GPW (100 → 60–70 tys. zł) albo zmienić cel na „krajowe + NH”.
2. **Udział NH w grze 6,5-letniej 12–13% (cel 15–30%)** — za mało czasu na wejścia i awanse; 20 lat 17%. Bez dalszego strojenia.
3. **Interwencje urzędu: jedna gra z 6 w 20 lat (cel 0–2):** sektorowy wskaźnik „wzrost o ≥ 25 pp” wciąż potrafi się uruchomić po upadku konkurentów lub przejęciach; kolejne strojenie wymaga ≥ 30 gier na wariant.
4. **Oszustwa PRV ≈ 4× (cel ok. 5×)** oraz **upadki NH 1,7–4,6× zależnie od odniesienia** (cel 2–3×) — zob. odstępstwa 5–6.
5. **GIG `fundusz-gig` −1,3 pp, marża 20 lat +2,3 pp** — w granicy szumu przy 10–20 grach; przyczyny nie badano (zasada: odziedziczony GIG nie jest naprawiany). Do 0.16.1 G0 (≥ 30 gier na wariant).
6. **Niezmierzone:** czas kroku przy ×1 (obciążenie maszyny i zamrożenia Edge psują średnie); rozmiar zapisu gracza przy ×1 w przeglądarce (oszacowanie bezpośrednie 0,19%); zachowanie botów wobec płynności NH (poza minimalnym obrotem państwa); częstość maili gazet (zob. odstępstwo 8); rozkład czasu do wykrycia oszustwa na PRV (tylko z konstrukcji).
7. **Pojedynczy przypadek ujemnej gotówki** w grze 20-letniej (`startStrike` w workforce, −0,x zł) — kod spoza 0.15.6, niezmieniany.
8. **Zlecenie dla czatu designu** (widok rynków i oś ścieżki spółki, karta wymagań, oznaczenie ryzyka, mapa spółek jako drzewo) — nie wykonane osobno; wygląd z gotowych komponentów.

## Decyzja użytkownika po kontroli (2026-10-26)

- Próg kapitalizacji GPW obniżony ze 100 tys. do **90 tys. zł** (`listings.js`), żeby zbliżyć liczbę spółek krajowych do celu 100–115 (było 88); pomiar po zmianie niewykonany.
- Odchylenia oszustw PRV (≈4× wobec 5×), upadków NH (1,7× wobec 2–3×) i interwencji urzędu zaakceptowane do ewentualnej zmiany celów w 0.17.1.
