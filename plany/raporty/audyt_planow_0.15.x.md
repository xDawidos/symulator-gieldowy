# Audyt planów serii 0.15.x (2026-10-20)

Planowanie wersji 0.15.0.1 „Poprawki 0.15”, 0.15.1 „Sztuka przejęć”, 0.15.2 „Kochaj i zarabiaj” i 0.15.3 „Wielkie Kryzysy”.

- **Kod:** `zmiany-AI` = `9be89f1` (po weryfikacji 0.15, testy 492/492).
- **Źródła:**
  - `raporty/weryfikacja_0.15.md`, `plan_0.15_hossa_bessa.md`, `raporty/audyt_planu_0.15.md`, `raporty/pomiar_gig_0.15.md`;
  - szkice 0.15.1–0.15.3 (wariant C z 2026-10-19);
  - kod: `core.js`, `companies.js`, `ma.js`, `player.js`, `ai.js`, `events.js`, `main.js`.
- **Metoda:**
  - pomiar przyczyny dryfu premii: model Monte Carlo silnika faz (4000 × 20 lat) i przebiegi ×200 z łatkami pomiarowymi wstrzykniętymi parametrem `patch` (bez zmian w kodzie gry);
  - dla każdego szkicu: zbiórka pomysłów → rozwinięcie → audyt krytyczny → ocena design managera → decyzja kierownika planowania.

---

## 1. Pomiar przyczyny dryfu premii (przed planem 0.15.0.1)

### 1.1. Model silnika faz (Monte Carlo, 4000 gier × 80 kw.)

Odtworzenie `MARKET_PHASES`, ruchu premii (25% drogi na kw.) i krachu z `core.js`, bez reszty gry.

| Wariant | Średnia premia ważona czasem | p10 / p90 | Czas w Bessie i Kapitulacji | Krachy na 20 lat |
|---|---|---|---|---|
| Same fazy, bez krachu | **+0,7%** | −1,2 / +2,6% | 23% | 0 |
| Fazy + krach | **−1,0%** | −4,0 / +1,6% | 24% | 1,0 |
| Fazy + krach + zamrożenie 10 kw. po krachu (B1 przy ×200) | **−4,2%** | −11,5 / +1,5% | 24% | 1,0 |
| Fazy + krach + zamrożenie 2,5 kw. (B1 przy ×50) | −1,4% | −4,8 / +1,6% | 24% | 1,0 |

Wnioski:
- **Cele premii w tabeli faz są zrównoważone** (+0,7% ważone czasem). Asymetria Bessa/Kapitulacja vs Hossa nie jest przyczyną.
- **Krach kosztuje ok. −1,7 pp** średniej premii: urywa resztę Hossy i spycha premię o 25–35 pp, także z niskiego poziomu (krach może zacząć się w Akumulacji).
- **Największy efekt to B1.** Bezpiecznik liczony `Date.now()` w przebiegach ×200 zamraża kursy i premię:
  - 1. stopień (15 s) to 3000 s gry, czyli **10 kw.**;
  - 3. stopień (60 s) to **40 kw.**

  Premia zostaje na dnie krachu, a zyski spółek rosną dalej, więc C/Z rynku spada.

### 1.2. Przebiegi ×200 z łatką pomiarową

Łatka zapisuje co kwartał: fazę, premię, cel premii, krach, udziały i zaufanie funduszu, medianę kurs / wartość godziwa, medianę wartość godziwa / zysk, mnożnik wyceny i stopę bazową. Zlicza tiki zamrożone bezpiecznikiem. Wariant „naprawa B1” podmienia `isMarketHalted` i `triggerMarketHalt` na zegar gry (`getGameClockMs()`).

| Seria | Gry | GIG %/rok | Zysk na akcję (mediana spółek) | Zmiana C/Z pp/rok | Średnia premia | Tiki zamrożone | Udziały funduszu %/rok | Zaufanie | Bezpieczniki / krachy na grę |
|---|---|---|---|---|---|---|---|---|---|
| `m_base` bez naprawy | 10 × 6,5 roku | 6,5 ± 2,5 | 6,9 ± 0,3 | −0,3 ± 0,3 (C/Z na koniec 6–21) | −4,1 ± 3,4 | **52 ± 7%** | (gracz bierny) | — | 1,5 / 0,6 |
| `m_fix` naprawa B1 | 12 × 6,5 roku | 11,1 ± 1,2 | 6,2 ± 0,8 | −0,2 ± 0,1 | +0,6 ± 0,7 | 0,3% | (gracz bierny) | — | 1,3 / 0,17 |
| `m_fix2` naprawa B1 + sonda wyceny | 6 × 6,5 roku | 13,4 ± 1,6 | 8,0 ± 0,6 | −0,2 ± 0,2 | −2,6 ± 1,0 | 0,4% | (gracz bierny) | — | 1,5 / 0,33 |
| `m_fixfg` naprawa B1, `fundusz-gig` | 12 × 6,5 roku | 12,3 ± 1,2 | 7,1 ± 0,7 | −0,2 ± 0,2 | −0,8 ± 0,9 | 0,3% | **−21,4 ± 2,4** | **41,7 ± 2,2** | 1,3 / 0,25 |
| `m_fixlong` naprawa B1 | 3 × 20 lat | **10,6 ± 0,4** | 2,3 ± 0,5 (bankruci = −100%) | +0,1 ± 0,1 | +0,1 ± 1,5 | 0,1% | (gracz bierny) | — | 1,3 / 1,0 |

Obserwacje:
- **Bez naprawy B1 przez połowę gry kursy stoją.** To wyjaśnia wyniki weryfikacji (C/Z 14,5 → 5,0, GIG −9,5%/rok w jednej grze, premia przy wejściu w fazy −22% przez 4 kolejne fazy).
- **Po naprawie średnia premia i C/Z są w celu** (premia −0,6 ± 0,5% łącznie w 30 grach 6,5-letnich, +0,1% w 20 latach; C/Z −0,2 pp/rok).
- **Wartość godziwa skacze z fazą gospodarki.** Sonda `m_fix2` (przykład): mnożnik wyceny 1,27 → 0,84 w jednym kwartale (Przegrzanie → Recesja), mediana kurs / wartość godziwa 0,55–1,45. Nastrój rynku od 0.15 liczy cykl drugi raz.
- **Krach w Akumulacji:** w `m_fix2` krach z premii −8% zepchnął ją do −38% (poniżej celu Kapitulacji).
- **Odpływ z funduszu = GIG** (12 gier, suma wartości umorzeń): 🎢 obsunięcie 51%, 📉 wynik gorszy od GIG 37%, 🤝 zaufanie 9%, 😱 panika 2%. Typowy przebieg w bessie: 1102 → 740 → 365 → 196 udziałów w 3 kw., potem w Hossie bez napływu (zaufanie < progu typów klientów).
- **Zysk na akcję:** mediana spółek 6–8%/rok, a GIG (ważony kapitalizacją) 11–13% przy stałym C/Z — duże spółki rosną szybciej niż mediana. Podniesienie wzrostu wszystkich spółek wypchnęłoby GIG ponad cel.
- **Nowy błąd B7** (czytanie kodu): `const value` nadpisywane dla klienta Funkcjonariusz w `processClientsWeekly` — wyjątek przerywa tygodniową pętlę klientów.

### 1.3. Model reguł krachu (Monte Carlo, 4000 × 20 lat)

| Reguła | Średnia premia | Krachy na 20 lat | Gry 6,5-letnie z ≥ 1 krachem |
|---|---|---|---|
| Dziś (poza Bessą i Kapitulacją, 1,2%/kw.) | −1,0% | 0,93 | 27% |
| Euforia, Dystrybucja, Hossa ≥ 4 kw.; dno −35%; 1,2%/kw. | −0,3% | 0,61 | 21% |
| jak wyżej, 2,0%/kw. | −0,7% | 0,88 | 30% |
| **jak wyżej, 2,5%/kw.** (wybrane) | −0,9% | 1,02 | 32% |

### 1.4. Decyzje użytkownika (2026-10-20)

1. Zysk na akcję liczony jak GIG (ważony kapitalizacją), cel 8–11%; mediana spółek ≥ 5% jako kontrola.
2. Odpływ: obsunięcie względem GIG + bramka umorzeń 10%/kw. z kolejką.
3. Mnożnik C/Z fazy gospodarki o połowę.
4. Krach tylko w Euforii, Dystrybucji i w Hossie trwającej długo (≥ 4 kw.); spadek 25–35 pp, nie niżej niż −35%.

Plan: `plan_0.15.0.1_poprawki.md`.

---

## 2. Szkic 0.15.1 „Sztuka przejęć (M&A)”

### 2.1. Co już jest w kodzie (szkic tego nie uwzględnia)

| Element szkicu | Stan w kodzie |
|---|---|
| Wieloetapowy proces | ✅ `ma.js`: 7 etapów, ok. 1 kw. na etap (`advanceMergerProcess`, `runMergerStage`), komplikacje z decyzją, mini-zdarzenia, koszty |
| Zatruta pigułka, Biały Rycerz, negocjacje | ✅ `TAKEOVER_DEFENSES`: pigułka, Biały Rycerz, Pac-Man, negocjacje (+10–20 pp premii) |
| Antymonopol | ✅ `checkAntitrust` na etapie 4 z karą |
| Decyzja funduszu jako akcjonariusza celu | ✅ `notifyFundOfTakeover` (≥ 20% akcji): sprzedaż po cenie oferty, głos przeciw, obrona |
| LBO, fuzja przez wymianę akcji | ✅ `validateLbo`, `stockSwap` |
| Inicjowanie przez gracza | ✅ tylko z panelu spółki, w której fundusz ma > 50% (`openManagementModal`); **premia stała 25%**, bez wyboru ceny |
| Badanie spółki, kreatywna księgowość | ✅ osobno: `stock.fraud`, zlecone audyty (`finishAudit`), korekta wyników (`revealFraud`) — **niepołączone z M&A** |
| Moduły `economy.js`, `src/ma.js`, `src/ui.js` | ❌ nie istnieją; są `ma.js`, `companies.js`, `ui.js` |

**Wniosek:** szkic opisuje od zera to, co już działa. Plan musi rozbudować istniejące etapy 1–3, a nie budować drugiego procesu.

### 2.2. Zbiórka i rozwinięcie pomysłów

| # | Pomysł | Czego uczy | Kto zobaczy w przeciętnej grze |
|---|---|---|---|
| A | **Arbitraż fuzji:** przy ogłoszeniu wezwania kurs celu skacze do ceny oferty minus **spread ryzyka**, a potem zbiega do ceny oferty; przy zerwaniu spada | spread = cena ryzyka transakcji; „premia za przejęcie”; ryzyko zdarzenia | **każdy gracz** (boty przejmują spółki co kilka kwartałów) |
| B | **Rozmowy wstępne (bezpłatne):** nastawienie zarządu (przyjazny / neutralny / wrogi) i przedział ceny, jaką zarząd zaakceptuje | wycena w przejęciu, premia kontrolna, interesy zarządu | gracz z większościowym pakietem w spółce |
| C | **Oferta z wyborem ceny** i ryzykiem urażenia zarządu | negocjacje, kotwiczenie ceny, wrogie przejęcie | jak wyżej + boty (premia wg osobowości) |
| D | **Badanie due diligence** (podstawowe i głębokie) połączone z kreatywną księgowością | audyt, ukryte zobowiązania, czerwone flagi | jak wyżej; **mocno wspiera cel gry (księgowość i audyt)** |
| E | **Wartość firmy (goodwill) i test utraty wartości** po przejęciu | rozliczenie przejęcia w bilansie, odpis, „klątwa zwycięzcy” | jak wyżej + przejęcia botów widoczne w raportach spółek |
| F | List intencyjny jako osobny płatny krok | wyłączność negocjacji | — |
| G | „Spadek relacji z inwestorami w branży” po urażeniu | — | — |
| H | Wezwania 51/66/100% i przymusowy wykup | progi kontroli | częściowo jest (wezwania przy córkach T6) |

### 2.3. Audyt krytyczny

- **Wpływ na przeciętną grę (6,5 roku):**
  - B–E dotyczą tylko gracza z pakietem > 50% w spółce. W przeciętnej grze to rzadkie, więc same B–E to „funkcja dla zaawansowanych”.
  - **A działa dla wszystkich** i zmienia kursy przy każdym przejęciu botów — trzeba ją zmierzyć.
  - W grze 20-letniej gracz częściej kontroluje spółki, więc B–E mają tam większe znaczenie.
- **Exploity:**
  - A: „kupuj każdy cel po ogłoszeniu” nie może dawać pewnego zysku. Potrzebny odsetek zerwanych transakcji 10–25% i spread dobrany do ryzyka. Cel: średnio +1…+4% ponad GIG na transakcję, ≥ 15% transakcji ze stratą.
  - B: bezpłatne sondowanie co tydzień zdradzałoby wycenę. Limit: 1 rozmowa na spółkę na 4 kw., a wynik to przedział ±10%, nie liczba.
  - D: głębokie DD nie może być tańsze niż spodziewana strata z oszustwa; koszt 1% kapitalizacji celu.
- **Nuda i frustracja:**
  - urażenie zarządu blokuje rozmowy na 4 kw., ale wrogie wezwanie dalej jest możliwe — gracz nie traci celu na zawsze;
  - odpis wartości firmy to strata księgowa bez gotówki; uczy, ale nie niszczy funduszu.
- **Kalibracje:**
  - A zmienia kurs celu przy każdym przejęciu (GIG, wydzielenia T4, wycena koncernów). Dziś etap 5 robi `partner.price *= 1.1`, więc zamiana jest bliska zeru dla GIG. Do pomiaru: GIG ±0,3 pp.
  - E dodaje aktywo do bilansu przejmującego. **Naprawia przy okazji obecny błąd księgowy:** dziś zapłacona gotówka znika z kasy, a kapitał własny się nie zmienia (premia ponad wartość księgową nie ma pokrycia w bilansie).
- **Koszt i ryzyko regresji:** średnie. Zmiany w `ma.js` (etapy 1–3), `companies.js` (`initiateMergerProcess`, `resolveMerger`, bilans), `ui.js` (okno celu). Ryzyko w rozliczeniu przejęcia (wielu posiadaczy, ETF-y, fundusze botów) — dotykamy tylko bilansu przejmującego.
- **Wydajność i zapis:** kilka pól w `mergerProcess` i `goodwill` w bilansie; < 0,05% zapisu.
- **F i G:** F dubluje etap 2 („negocjacje”) — wystarczy, że badanie DD daje 2 kw. wyłączności. G jest niemierzalne i niejasne.

### 2.4. Ocena design managera

- **Jedno okno zamiast „dedykowanej zakładki”:** rozbudowa istniejącego okna wyboru celu M&A (`ma-target-modal`) do karty przejęcia z 3 sekcjami: „Rozmowy”, „Badanie”, „Oferta”. Suwak premii z podpisem reakcji zarządu słowem, nie samym kolorem.
- **Arbitraż fuzji bez nowego UI:** linia w karcie spółki „W trakcie przejęcia: oferta X zł, spread Y%” i wpis w pasku newsów. Pasuje do komponentów 0.14.5.
- **Wartość firmy:** nowy wiersz w bilansie spółki i hasło Akademii.
- Obciążenie interfejsu: niskie (1 rozbudowane okno, 2 wiersze).

### 2.5. Decyzja kierownika planowania

Propozycja kierownika planowania: A–E dla gracza jako kupującego; odrzucić F (dubluje etap 2) i G (niemierzalne).

**Decyzja użytkownika (zmienia kierunek):**
- gracz jako większościowiec **dostaje oferty** i je rozgrywa (B, C, D po stronie sprzedającego), a nie kupuje spółek nowym przyciskiem;
- kontrolę zdobywa **odkupem pakietów** od botów (istniejące relacje) i od prezesa;
- przekroczenie 50% pakietami: ostrzeżenie KNF → kary → nakaz wezwania albo odsprzedaży;
- **ustawa „Próg wezwania” 66/75/90/99%** zmieniana przez partie, z limitem zależnym od poziomu KNF;
- odpis wartości firmy: test co 4 kw., odpis 25–50%.

**Wynik:** **zatwierdzony** plan `plan_0.15.1_przejecia.md` (M0–M8): A arbitraż, oferty dla większościowca (≥ 33%), due diligence kupującego i ukryte zobowiązania, odkup pakietów, KNF i próg wezwania, wartość firmy. Odrzucone: F, G, nowy proces od zera, rozbudowa przejęć z panelu zarządzania (→ `pomysly_na_kolejne_wersje.md`).

---

## 3. Szkic 0.15.2 „Kochaj i zarabiaj (PR i inwestorzy)”

### 3.1. Co już jest w kodzie

| Element szkicu | Stan w kodzie |
|---|---|
| Emisja udziałów | ✅ ręczna emisja (`issueFundUnits`, ≤ 2 na okres, wielkość wg zaufania) i **emisja ciągła** z przełącznikiem (`setFundOpenSubscriptions`) |
| Typy inwestorów | ✅ 12 typów klientów (`CLIENT_TYPES`: Spryciarz, Ostrożny, Strachliwy, Odważny, Bogaty, Sknera, Instytucja, Inwestor, Etyczny, Emeryt, Nowoczesny, Funkcjonariusz) z cierpliwością, awersją do zmienności, lojalnością |
| Preferencje klientów | ✅ `fundSatisfiesClientPreference` (Emeryt — defensywne, Nowoczesny — wzrostowe), Etyczny |
| Przyczyny odpływu i napływu | ✅ panel „Dlaczego klienci…” (`FUND_FLOW_OUT_REASONS`) |
| Rynek wtórny udziałów | ✅ `juMarket` (premia i dyskonto do NAV) |
| Moduły `playerFund.js`, `fundBots.js`, `prDepartment.js` | ❌ nie istnieją; fundusz i klienci są w `player.js` |

### 3.2. Zbiórka i rozwinięcie pomysłów

| # | Pomysł | Czego uczy | Uwagi |
|---|---|---|---|
| A | **Kalendarz** „Rok 3 · kw. 2 · tydz. 4” | czas w finansach (lock-up, okresy) | gra nie ma miesięcy (kwartał = 5 tygodni); „miesiąc” nie dzieli się równo |
| B | **Kampania emisyjna** (okno 1 tydz. / 2 tydz. / 1 kw.) obok emisji ciągłej | runda subskrypcji, koszt pozyskania kapitału | koszt marketingu 0,3–1% zbieranej kwoty |
| C | **Lock-up 0–3 lata** w kampanii | fundusze zamknięte (FIZ), płynność vs stabilność | szkic: 0–5 lat; przy grze 6,5-letniej 5 lat to prawie cała gra |
| D | **Mandat (cel emisji)**: min. udział sektora lub stylu | mandat inwestycyjny, dryf stylu | wykorzystuje istniejące preferencje klientów |
| E | **Grupy inwestorów i relacje**: Detaliczni / Instytucjonalni / Zamożni | segmentacja klientów | z istniejących 12 typów, bez nowego modelu |
| F | **Analityk IR** (zatrudnienie, 2 podwyżki: misje grup, przyczyny) | relacje inwestorskie, komunikacja | dane przyczyn już są (`getClientSatisfactionDrift`) |
| G | **VIP i rozmowa** (wybór argumentu) | dopasowanie oferty do profilu inwestora | szkic: 4 tony + „zabawny”, animacje |
| H | **Przysługa przyjacielska** (gwarantowany zakup za relację) | — | pewny napływ na żądanie |
| I | **Gwarancja kapitału** z regułą debetu (1 tydzień na wyjście na 0, potem upadłość) | gwarancja = wystawiona opcja put | bardzo silny wpływ na balans |

### 3.3. Audyt krytyczny

- **Kalibracja funduszu jest najbardziej wrażliwym miejscem gry.** Cel „fundusz = GIG → udziały ±3%/rok” nie jest spełniony od 0.13.1 (raporty A4, P12, weryfikacja 0.15). Lock-up, kampanie i VIP zmieniają przepływy, więc **0.15.2 musi stać na skalibrowanym 0.15.0.1** i mieć własny pomiar.
- **C lock-up:** obniża odpływ w bessie (cel tej funkcji), ale może stać się dominującą strategią („zawsze 3 lata”). Zabezpieczenie: lock-up zmniejsza napływ typów niecierpliwych (Spryciarz, Nowoczesny, Strachliwy ×(1 − 0,3 × lata)), a udziały w lock-upie można sprzedać tylko na rynku wtórnym z dyskontem.
- **I gwarancja kapitału:** ryzyko zakończenia gry w 1 tydzień po krachu (frustracja), a w hossie darmowy napływ (exploit). W prawdziwym rynku fundusze z ochroną kapitału trzymają większość w obligacjach — to osobny produkt. **Odrzucić z 0.15.2.**
- **H przysługa przyjacielska:** pewny napływ na żądanie omija całą kalibrację. **Odrzucić.**
- **G rozmowa z VIP:** zgadywanie tonu to loteria, a nie lekcja. Lepiej: 3 argumenty sprawdzane danymi funduszu (Liczby — nadwyżka nad GIG; Bezpieczeństwo — obsunięcie mniejsze niż GIG; Wizja — udział spółek wzrostowych). Trafienie zależy od profilu VIP-a **i** od prawdziwych wyników.
- **Wpływ na przeciętną grę:** duży — fundusz ma każdy gracz. Wszystkie elementy mają działać bez obowiązku obsługi (domyślnie emisja ciągła jak dziś, bez lock-upu i mandatu).
- **Zapis:** transze lock-upu u klienta (`lockedUntilQ`, `units`), mandat, relacje grup, stan analityka; < 0,1% zapisu.

### 3.4. Ocena design managera

- Panel funduszu ma już dużo sekcji. Nowe elementy:
  - **kalendarz** w górnym pasku (1 element KPI, wzorzec 0.14.5);
  - **„Nowa kampania”** jako formularz w istniejącym oknie emisji (czas, lock-up, mandat, koszt);
  - **„Relacje”** jako zakładka w panelu funduszu: 3 grupy z nastrojem (liczba i słowo), misje, przyczyny;
  - VIP przez pocztę (istniejący wzorzec maili z akcją), bez animacji rozmów.
- Obciążenie: średnie. Bez nowych okien modalnych poza istniejącymi.

### 3.5. Decyzja kierownika planowania

Propozycja kierownika planowania: A, B, C (0–3 lata), D, E, F, G (argumenty sprawdzane danymi); odrzucić H i I.

**Decyzja użytkownika:** gwarancja kapitału **zostaje w łagodnej wersji** — niedobór pokrywa fundusz (gotówka → wymuszona sprzedaż → kredyt płynnościowy), bez dymisji i upadłości po tygodniu. Plan dodaje zabezpieczenia przed exploitem: udział w zysku 70%, limit 30% udziałów, lock-up ≥ 1 rok. Kalendarz: „Rok · kw. · tydz.”.

**Wynik:** **zatwierdzony** plan `plan_0.15.2_pr_inwestorzy.md` (K0–K9). Odrzucone: H (przysługa przyjacielska), tony bez związku z danymi i animacje rozmów, reguła debetu z upadłością (→ `pomysly_na_kolejne_wersje.md`). **Warunek:** budowa po 0.15.0.1 i po 0.15.1.

---

## 4. Szkic 0.15.3 „Wielkie Kryzysy”

### 4.1. Punkt wyjścia

- `marketCrash.theme` istnieje (zawsze `null`).
- `applySectorShock` **jest wadliwa (B5):** dodaje premię na stałe, a `updateAllSectorPremiums` nadpisuje ją przy następnej aktualizacji. Trzeba ją przebudować przed 0.15.3.
- Szok inflacji (`macro.shocks.inflation`), nacjonalizacja i ratunek banków, osiągnięcia (H6b) — są.

### 4.2. Rozwinięcie

- **Linia kryzysu** 6–16 kw., etapy: zapowiedź (1–2 kw.) → wybuch → zarażanie → interwencja → dno → odbicie.
- **Częstość:** 2%/kw. po ≥ 12 kw. bez krachu i linii → średnio ok. 1 linia na 10–12 lat; w grze 6,5-letniej ok. 40%.
- **Linia zastępuje ogólny krach** (ta sama szansa łączna), więc długoterminowa średnia premii się nie zmienia.
- **Szoki sektorowe** jako stan z czasem trwania (naprawa B5), działające przez udział segmentu.
- **Upadki:** 1–3 spółki na linię, wybierane po dźwigni, kondycji i udziale segmentu w sektorach tracących.
- **Reakcja instytucji:** bank centralny tnie albo podnosi (szok naftowy), rząd pomaga sektorom (skarb państwa), ratunek banków (0.11/0.13.1).
- **Akademia:** 5 haseł z prawdziwą historią. **Osiągnięcia:** 6.

### 4.3. Audyt krytyczny

- **Kalibracja:** linia musi mieć ten sam wpływ na średnią premię co krach (dziś ok. −1,7 pp). Inaczej wraca dryf z 0.15. Cel w planie: średnia premia ważona czasem −3…+3% z liniami.
- **Exploit:** zapowiedź kryzysu w pasku newsów nie może zdradzać linii z pewnością. Sygnały 1–2 kw. wcześniej muszą też występować bez kryzysu (fałszywe alarmy 50%).
- **Frustracja:** upadki spółek z portfela gracza. Zabezpieczenie: wybór po dźwigni (gracz może to sprawdzić), sygnały w kondycji spółki.
- **Koszt:** średni (dane 5 linii + silnik etapów + B5). Ryzyko regresji: bańki (H3) i premia sektora — wspólny kod.
- **Zapis:** stan linii, szoki sektorowe; < 0,05%.

### 4.4. Ocena design managera

- Bez nowego okna: linia kryzysu w oknie „Rynek” (L5) jako sekcja „Kryzys” z etapem i sektorami tracącymi i zyskującymi; dla wszystkich nagłówki w pasku newsów i mail z retrospektywą.
- Opcjonalny wybór scenariusza na starcie nowej gry (ekran startu, 1 lista) — do decyzji.

### 4.5. Decyzja kierownika planowania

**Zatwierdź** z warunkami: B5 naprawione w 0.15.3 jako pierwsza część, kalibracja premii z liniami, fałszywe alarmy.

**Decyzja użytkownika:** scenariusz na start gry — tak, opcjonalnie.

**Wynik:** **zatwierdzony** plan `plan_0.15.3_kryzysy.md` (W0–W7). Częstość linii obniżona do 1%/kw. po ≥ 12 kw. spokoju + 40% krachów zamienionych w linie (łącznie ok. 1,2 linii na 20 lat), żeby nie wrócił dryf premii. Zarażanie między krajami → 0.16.

---

## 5. Kolejne 0.15.x

Ocena: **nie trzeba nowej wersji 0.15.x.** Wszystko, co wypłynęło w audycie, mieści się w 0.15.0.1–0.15.3 albo trafia do pomysłów:
- **przejęcia od strony kupującego** (suwak premii, rozmowy z zarządem celu przy przejęciu z panelu zarządzania) — do `pomysly_na_kolejne_wersje.md`, bo użytkownik wybrał stronę sprzedającą;
- **cel GIG w 20 latach** (10,6% po naprawie B1 przy celu 8–10%) — pilnuje 0.15.0.1 C7 (rozwodnienie z C4, ewentualnie `INFLATION_PASS_THROUGH` po decyzji);
- **ocena zarządu i premia R5 przy nowych przepływach funduszu** — mierzone w kontrolach 0.15.0.1 i 0.15.2.

### Kolejność budowy

| Wersja | Zależy od | Zapis |
|---|---|---|
| 0.15.0.1 Poprawki 0.15 | 0.15.0 | v15, pola opcjonalne |
| 0.15.1 Sztuka przejęć | 0.15.0.1 (kalibracja, margin call, emisje C4) | v15, pola opcjonalne |
| 0.15.2 Kochaj i zarabiaj | 0.15.0.1 (bramka umorzeń), 0.15.1 | v15, pola opcjonalne |
| 0.15.3 Wielkie Kryzysy | 0.15.0.1 (krach po wzrostach), B5 w W0 | v15, pola opcjonalne |
| 0.16 Giełda międzynarodowa | seria 0.15 | v16 |

## 6. Decyzje (podjęte 2026-10-20)

- **0.15.0.1:** zysk na akcję ważony kapitalizacją; obsunięcie względem GIG + bramka umorzeń 10%/kw.; połowa mnożnika C/Z cyklu; krach tylko po wzrostach (Hossa ≥ 4 kw., Euforia, Dystrybucja), dno −35%. Plan zatwierdzony.
- **0.15.1:** strona sprzedająca, odkup pakietów, ustawa „Próg wezwania” i drabina KNF, odpis wartości firmy co 4 kw. (25–50%). Plan zatwierdzony.
- **0.15.2:** zakres po audycie + łagodna gwarancja kapitału; kalendarz „Rok · kw. · tydz.”. Plan zatwierdzony.
- **0.15.3:** scenariusz na start gry. Plan zatwierdzony.
