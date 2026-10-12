# Raport weryfikacji 0.13.1 — „duchy posiadaczy”, decyzje 1 i 2, B5 (etap A)

- **Data:** 2026-10-13 (zastępuje raport częściowy z 2026-10-12).
- **Zweryfikowany kod:** gałąź `zmiany-AI` (`c105e89`) + poprawki etapu A:
  - `ee91a58` — A3: licznik przycięć „duchów posiadaczy”;
  - `2ab2c4e` — A1: naprawa usterek po inwestycji bez ujemnej gotówki, stanowisko `tests/przebiegi.html`;
  - `441d5d5` — A2: pomiar 0.13 (wyniki w `plan_0.13_spoleczenstwo.md`).
- **Werdykt:** **OK z uwagami.** Spójność świata (akcje, posiadacze, sufity, zapis) potwierdzona w długiej grze. Dwie sprawy balansu funduszu (B5) i jedna polityk kadrowych (0.13) wymagają decyzji — lista na końcu.
- **Testy:** 313/313 (`tests/tests.html`; było 310, doszły 2 testy A3 i 1 test A1).

## Jak sprawdzaliśmy

- **A1 — długi przebieg:** prawdziwa gra (`index.html`), prędkość ×200, nowa gra, bierny gracz, 256 kwartałów (64 lata gry). Zapis i wczytanie w kw. 125. Monitor co kwartał: `checkWorldInvariants()`, ostrzeżenia przycięć, liczba spółek, raport zapisu.
  - Panel przeglądarki był ukryty, więc timery były dławione: rzeczywista prędkość 20–195× (mediana 130×). Logika gry liczy się według zegara gry (T0), więc kolejność zdarzeń jest ta sama.
- **A2, A4 — przebiegi seryjne:** `tests/przebiegi.html` — gra w ramce z wirtualnym zegarem (setInterval, setTimeout, Date.now, performance.now), ×50, bez dławienia i bez dotykania zapisu gracza. Śledzi niezmienniki co kwartał oraz każde zejście gotówki spółki poniżej zera ze stosem wywołań.
  - Presety: `fundusz-gig` (fundusz gracza trzyma wirtualną pozycję indeksową GIG zamiast akcji), `fundusz-gig-zamkniety` (to samo, emisja ciągła zamknięta), `bez-013`, `polityki-losowe`.

## Sprawdzone

### A1. Długi przebieg ×200 z zapisem i wczytaniem

| Cel | Wynik | Ocena |
|---|---|---|
| `checkWorldInvariants()` puste | 254 z 256 kwartałów puste; 2 jednorazowe „ujemna gotówka”: GOOT −15 000 (kw. 133), PROL −30 231 (kw. 227); **ani razu** „akcje w obrocie ≠ posiadacze” | ✅ po poprawce (niżej) |
| 0 przycięć poza wczytaniem starego zapisu | 0 przycięć w grze, 0 przy wczytaniu | ✅ |
| Spółki krajowe ≤ 115 | najwyżej **110** (nigdy ponad) | ✅ |
| Zwykłe spółki ≤ 150 | najwyżej **145** | ✅ |
| Zapis ok. 2,1–2,5 MB bez błędów | 0,75–2,50 MB, **0 błędów zapisu**; wczytanie w kw. 125 bez utraty spółek i gotówki (176 spółek, 109/143) | ✅ z uwagą |

- **Ujemna gotówka GOOT −15 000:** źródło to `finishInvestment` — naprawa usterek po inwestycji (5% kosztu „Studia Gier” 300 000) nie sprawdzała gotówki. Ślad potwierdzony też w 0.12 (VEUS −15 000).
  - **Poprawka (`2ab2c4e`):** po naprawie od razu `coverNegativeCash` (kredyt ratunkowy jak w P3), test w grupie P3.
- **PROL −30 231:** kwota nieokrągła, spółka zniknęła przed analizą. W 1503 kwartałach przebiegów seryjnych obecnego kodu (z tego 963 już z poprawką) nie było ani jednego naruszenia na granicy kwartału. Kandydat do obserwacji: koszty fuzji `initiator.cash -= process.costs` w `ma.js` bez sprawdzenia gotówki.
- **Rozmiar zapisu:** od kw. ~155 pełny zapis przekracza 2,5 MB i część zapisów (34 z 256) schodzi do poziomu awaryjnego (krótsze wykresy) z jednorazowym ostrzeżeniem dla gracza. Rozmiar rośnie z liczbą spółek (ok. 13 KB na spółkę; 165 spółek w zapisie = 2,2 MB samych spółek). Nie jest to błąd, ale przy sufitach 110/150 zapis stoi na granicy.
- **Drobne:** przy wczytaniu startupy bez pola `cash` dają ostrzeżenia „nieprawidłowa gotówka (undefined) — ustawiono 0” (ECOV, EURO, HEMC). Bez skutków; tylko szum w konsoli.

### A3. Licznik przycięć `trimGhostHolders`

- Każde przycięcie zapisuje symbol, posiadacza, liczbę akcji, kwartał i źródło (wczytanie / gra) w `ghostTrimLog` (ostatnie 200).
- `checkWorldInvariants()` zwraca je w `problems.warnings` (ostrzeżenia, nie naruszenia); `debugCheckInvariants()` pokazuje ich liczbę.
- Wpis w konsoli także poza trybem debug.
- W A1 (256 kw.) i we wszystkich przebiegach seryjnych (1503 kw.): **0 przycięć**.

### A4. B5 i decyzja 2 w praktyce

| Punkt | Wynik | Ocena |
|---|---|---|
| Kalibracja JU vs GIG (model jak w teście B5, 20 ziaren × 2 lata, zaufanie 50) | wynik = GIG → **+1,7% JU rocznie** (p10–p90: 1,3…2,2%); +2 pp → +4,3%; +5 pp → +9,8%; −2 pp → 0%; −5 pp → −7,4% (mediana −3%) | ✅ |
| Ten sam model przy innym zaufaniu | zaufanie 70 → +6,3%; zaufanie 30 → 0%; zaufanie 30 i −5 pp → **−71% rocznie** | ⚠️ |
| Długa gra: fundusz = GIG (6 przebiegów × 10 lat) | NAV +14,5…19,0% rocznie (GIG 16,1…19,7%, różnica = opłata i 5% gotówki). **Zaufanie dryfuje do 30–39** (mediana), JU po 6 latach **spada** do 9–83% stanu startowego | ❌ |
| Panel „Dlaczego klienci odchodzą / przychodzą” | renderuje się w długiej grze bez błędów; przyczyny odpływu: głównie „🤝 niskie zaufanie”, potem obsunięcie, wynik, panika | ✅ |
| Powiadomienie przy zmianie > 10% JU w kwartale | działa: 1–11 ostrzeżeń o napływie i 5–12 o odpływie na przebieg 10-letni | ✅ |
| Emisja ciągła: przełącznik i stan domyślny | domyślnie **otwarta**; po zamknięciu brak dopłat i organicznych nowych klientów. Zostają wpłaty spoza emisji: Państwowy Program Emerytalny (nie sprawdza przełącznika) i emisja | ✅ z uwagą |
| Ratunek operatora rynku internetowego (≤ 30% gotówki spółek) | w ok. 800 kwartałach przebiegów **ani razu** nie był potrzebny (operatorzy XTD, NETX, EGLD, KLIK zdrowi także po 64 latach). Wymuszony na zapisie z A1 (KLIK, kapitał −300 000): potrzeba 448 221 zł, zebrano całość, spółki zapłaciły **2,3–19,6%** gotówki, operator przetrwał z kondycją −1. Wpis „🛟 Spółki rynku KLIK składają się na ratunek…” trafia do poczty (wydanie PULS) | ✅ |

## Uwagi i ryzyka

1. **Zaufanie funduszu „= GIG” spada (B5 w praktyce).** `computeTrustTarget` karze obsunięcie (×60) i zmienność (×200) funduszu w wartościach bezwzględnych, a GIG ma je sam z siebie. Fundusz dokładnie śledzący GIG ma cel zaufania ok. 30–40 zamiast 50, więc kalibracja „+1–2% JU rocznie” działa tylko w teście ze stałym zaufaniem 50.
2. **Lokaty spółek w JU rosną wykładniczo.** `processCorporateSubscriptions`: co tydzień każda spółka z dobrą opinią i gotówką > 500 000 ma 3% szans na lokatę do **50% aktywów funduszu**. Przy kilkunastu takich spółkach fundusz rośnie kilkadziesiąt razy na kwartał (w 1 z 6 przebiegów: z 81 do 11 mln JU w 3 lata). To mechanika sprzed B5 (B5 dodało tylko warunek otwartej emisji).
3. **Polityki kadrowe (0.13):** przy losowym przypisaniu Oszczędna ma TSR +5,1 pp/rok ponad Standardową i największy rozrzut; Wyzysk wychodzi na zero (−0,2 pp) zamiast „najwyższe ryzyko”. Szczegóły w `plan_0.13_spoleczenstwo.md`, sekcja „Wyniki pomiaru”.
4. **`trimGhostHolders` nie maskuje dziś błędów:** licznik jest pusty w ok. 1760 kwartałach gry (A1 + przebiegi seryjne). Rejestr zostaje jako czujnik.
5. **Zapis na granicy 2,5 MB** w bardzo długiej grze (od ok. 40 lat gry), patrz A1.

## Do decyzji

1. **Cel zaufania vs GIG:** liczyć obsunięcie i zmienność względem GIG (kara tylko za nadwyżkę ponad indeks) czy zostawić?
2. **Lokaty spółek w JU:** ograniczyć (np. lokata do 5% aktywów funduszu albo roczna stopa jak w B5) czy zostawić?
3. **Polityki kadrowe:** stroić liczbami z planu (np. Oszczędna płace ×0,93 → ×0,95 albo cel zadowolenia 40 → 35; Wyzysk kontrole Inspekcji ×3 → ×4) czy zostawić?

## Problemy koncepcyjne do decyzji planowania

- Brak nowych poza listą „Do decyzji”.
