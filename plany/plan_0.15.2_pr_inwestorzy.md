# Plan 0.15.2 „Kochaj i zarabiaj” (po 0.15.1 „Sztuka przejęć”, przed 0.15.3 „Wielkie Kryzysy”)

Cel: gracz przestaje tylko patrzeć na wpłaty i wypłaty klientów. Sam projektuje sposób zbierania kapitału:
- kampania emisyjna z czasem trwania;
- okres blokady (lock-up);
- opcjonalna gwarancja kapitału;
- mandat inwestycyjny.

Do tego dba o relacje z trzema grupami inwestorów przez analityka relacji inwestorskich (IR) i pozyskuje inwestorów VIP argumentami popartymi wynikami funduszu.

Czego to uczy:
- **Pozyskiwanie kapitału:** runda subskrypcji, koszt pozyskania, wpływ wyników i nastroju rynku na popyt.
- **Płynność a stabilność:** fundusze otwarte i zamknięte (FIZ), lock-up, bramka umorzeń (z 0.15.0.1), rynek wtórny udziałów.
- **Gwarancja kapitału ma cenę:** fundusz, który gwarantuje wkład, oddaje część zysku i ryzykuje dopłatę w bessie (gwarancja działa jak wystawiona opcja sprzedaży).
- **Mandat inwestycyjny:** obietnica wobec klientów, dryf stylu i jego koszt.
- **Relacje inwestorskie:** segmentacja klientów, komunikacja oparta na danych, a nie na obietnicach.

Kolejność: K0 → K1 → K2 → K3 → K4 → K5 → K6 → K7 → K8 → K9. **Commit po każdej części** (część z kilkoma krokami — commit po każdym kroku).
- **Warunek:** budowa po 0.15.0.1 (kalibracja odpływu i bramka umorzeń) i po 0.15.1.
- **Zasada:** gracz, który nie korzysta z nowych opcji, ma grę jak w 0.15.0.1. Domyślnie emisja ciągła, bez lock-upu, bez gwarancji, bez mandatu.

UI z komponentów 0.14.5. **Projekt wyglądu zlecamy czatowi designu** (sekcja „Zlecenie dla czatu designu”).

---

## Punkt wyjścia (stan kodu, `player.js`)

| Element | Stan |
|---|---|
| Emisja ręczna | `issueFundUnits`: ≤ 2 na okres oceny, wielkość ≤ (5% + 20% × zaufanie) udziałów, od 25% zaufania; popyt od zadowolonych klientów i 0–4 nowych |
| Emisja ciągła | przełącznik `setFundOpenSubscriptions`; zadowoleni klienci dokupują co tydzień (`processClientsWeekly`) |
| Klienci | 12 typów (`CLIENT_TYPES`): cierpliwość, awersja do zmienności, pogoń za wynikiem, lojalność, wielkość wpłat, próg zaufania, panika |
| Preferencje | `fundSatisfiesClientPreference` (Emeryt — defensywne, Nowoczesny — wzrostowe), Etyczny |
| Odpływ | zadowolenie (`getClientSatisfactionDrift`), od 0.15.0.1 obsunięcie względem GIG i bramka umorzeń 10%/kw. z kolejką |
| Rynek wtórny udziałów | `juMarket`: klienci wystawiają udziały, premia lub dyskonto do NAV |
| Panel „Dlaczego klienci…” | przyczyny napływu i odpływu (`FUND_FLOW_OUT_REASONS`) |
| Data w UI | „Rok X · kw. Y” w kilku miejscach; brak stałego kalendarza w górnym pasku |
| Szkic | wymieniał moduły `playerFund.js`, `fundBots.js`, `prDepartment.js` — **nie istnieją**; wszystko jest w `player.js` i `ui.js` |

---

## K0. Pomiar (bez zmian zachowania gry)

`tests/przebiegi.html`:
- sondy: przepływy funduszu według typu klienta i przyczyny; udziały w kolejce bramki; wykorzystanie rynku wtórnego;
- **preset `kampanie`** (sonda gracza): co 4 kw. kampania 1 kw. na 15% NAV, na zmianę bez lock-upu / lock-up 2 lata / lock-up 2 lata + gwarancja, mandat „defensywny” w co drugiej;
- bazę liczymy na `fundusz-gig` po 0.15.0.1.

**Commit K0.**

## K1. Kalendarz w górnym pasku

- Element KPI: **„Rok 3 · kw. 2 · tydz. 4”** (decyzja użytkownika), w dymku: data rozpoczęcia gry i staż zarządcy w CV.
- Źródło: `macro.quarter` i tydzień w kwartale (`macro.weekInQuarter`).
- Wersja mobilna: „R3 · K2 · T4”.
- Wszystkie terminy w nowych mechanikach (lock-up, mandat, VIP) pokazujemy w tym samym formacie.
- **Commit K1.**

## K2. Kampanie emisyjne

W oknie emisji (zamiast dzisiejszego formularza emisji ręcznej; emisja ciągła zostaje jako przełącznik):

| Pole | Wartości |
|---|---|
| Czas trwania | **1 tydzień** / **2 tygodnie** / **1 kwartał** (5 tygodni) |
| Cel | 5–30% NAV (górna granica jak dziś: 5% + 20% × zaufanie udziałów) |
| Lock-up | 0 / 1 / 2 / 3 lata (K3) |
| Gwarancja kapitału | tak / nie (K4; wymaga lock-upu ≥ 1 rok) |
| Mandat | brak albo jeden z listy (K5) |

- **Koszt kampanii** (marketing i dystrybucja, z gotówki funduszu): 0,2% celu + 0,5% zebranej kwoty. Lekcja: kapitał kosztuje.
- **Zasięg wg czasu:** 1 tydzień ×0,5, 2 tygodnie ×0,8, 1 kwartał ×1,2 popytu.
- **Popyt co tydzień kampanii:**
  - obecni klienci (zadowoleni, jak dziś w `issueFundUnits`);
  - nowi klienci: `liczba = zaufanie × 4 × zasięg`;
  - mnożniki:
    - wynik vs GIG z ostatniego okresu: ±30% za ±10 pp;
    - wskaźnik strachu i chciwości: ×0,7 przy < 25, ×1,2 przy > 75;
    - atrakcyjność warunków wg typu klienta (K3–K5).
- **Limit:** ≤ 2 kampanie na okres oceny (jak dziś emisje); kampania 1 kw. liczy się jako jedna.
- Emisja ciągła działa obok kampanii bez lock-upu i gwarancji.
- **Raport kampanii** (mail na koniec): zebrano X z celu, nowi klienci według typu, koszt, warunki.
- **Akademia:** „Runda subskrypcji i koszt kapitału”.
- **Testy:** koszt = 0,2% celu + 0,5% zebranej kwoty; zasięg wg czasu; limit 2 na okres; bez kampanii gra jak w 0.15.0.1 (ten sam seed, te same przepływy).
- **Commit K2.**

## K3. Lock-up i transze udziałów

- **Transze klienta:** `client.tranches[] = { units, issueNav, lockedUntilQ, guaranteed, mandateId }`. Udziały z emisji ciągłej i stare udziały to jedna transza bez lock-upu (migracja).
- **Lock-up 0–3 lata** (decyzja użytkownika; szkic: 0–5):
  - udziałów w lock-upie **nie można umorzyć**;
  - można je sprzedać na rynku wtórnym (`juMarket`) — zwykle z dyskontem.
- **Atrakcyjność lock-upu L lat** (mnożnik popytu wg typu):

| Typy | Mnożnik |
|---|---|
| Instytucja, Inwestor, Bogaty, Emeryt, Funkcjonariusz, Ostrożny | ×(1 + 0,15 × L) |
| Spryciarz, Nowoczesny, Strachliwy | ×max(0, 1 − 0,3 × L) |
| pozostali | ×(1 − 0,1 × L) |

- **Zadowolenie klienta w lock-upie:** jak dziś, ale niezadowolony nie umarza zablokowanych udziałów. Wystawia je na rynku wtórnym (szansa ×1,5) i obniża zaufanie (−0,5 na tydzień na klienta, łącznie najwyżej −2 na tydzień).
- **Koniec lock-upu:** transza staje się zwykła; mail „X udziałów wychodzi z lock-upu w przyszłym kwartale” kwartał wcześniej (gracz szykuje gotówkę).
- **Akademia:** „Lock-up i fundusze zamknięte”.
- **Testy:** umorzenie omija transze w lock-upie; rynek wtórny dopuszcza sprzedaż; mnożniki popytu wg tabeli; migracja starych klientów do jednej transzy; zapis transz.
- **Commit K3.**

## K4. Gwarancja kapitału (wersja łagodna — decyzja użytkownika)

- **Warunki transzy z gwarancją:**
  - lock-up ≥ 1 rok;
  - **gwarancja 100% ceny wejścia (`issueNav`) na koniec lock-upu**;
  - **udział w zysku 70%**: przy umorzeniu po lock-upie klient dostaje `issueNav + 70% × max(0, NAV − issueNav)`, a reszta zysku zostaje w funduszu (dla pozostałych udziałowców);
  - transze z gwarancją ≤ **30% udziałów** funduszu (próg blokuje kampanię z gwarancją).
- **Atrakcyjność:** Ostrożny, Strachliwy, Emeryt, Sknera ×1,5; Instytucja ×1,2; Spryciarz i Nowoczesny ×0,7.
- **Dopłata** przy umorzeniu po lock-upie, gdy NAV < `issueNav`: fundusz płaci różnicę z gotówki; brak gotówki → `forceLiquidation`; dalej brak → **kredyt płynnościowy**.
- **Kredyt płynnościowy** (nowy, `playerFund.liquidityLoan`):
  - z banku komercyjnego, oprocentowanie stopa bazowa + 3 pp;
  - limit 20% aktywów;
  - spłata automatyczna 10% kapitału na tydzień, gdy gotówka > 5% aktywów;
  - przy uruchomieniu: zaufanie −5, mail KNF z informacją (bez kary);
  - **bez dymisji i bez upadłości po tygodniu** (decyzja użytkownika); jeśli limit nie wystarczy, klient dostaje mniej niż gwarancja i zaufanie spada o 15.
- **Raport okresu:** „Zobowiązanie z gwarancji: X zł” (suma `max(0, issueNav − NAV) × udziały` transz z gwarancją).
- **Akademia:** „Gwarancja kapitału i jej koszt”, „Opcja sprzedaży (put) w prostych słowach”.
- **Testy:**
  - dopłata dokładnie do `issueNav`;
  - udział 70% w zysku;
  - limit 30%;
  - kolejność: gotówka → wymuszona sprzedaż → kredyt;
  - spłata kredytu;
  - brak upadłości;
  - suma pieniędzy w świecie zachowana (dopłata z gotówki funduszu, kredyt z banku).
- **Commit K4.**

## K5. Mandat inwestycyjny

| Mandat | Warunek (sprawdzany co tydzień, średnia z kwartału) | Kto lubi (×1,3 popytu) |
|---|---|---|
| Sektor (wybór grupy sektorów z T1a) | ≥ 25% aktywów w tej grupie | Inwestor, Bogaty |
| Dywidendowy | stopa dywidendy portfela ≥ 3% | Emeryt, Bogaty, Sknera |
| Defensywny | ≥ 50% akcji w spółkach defensywnych | Emeryt, Ostrożny, Funkcjonariusz |
| Wzrostowy | ≥ 40% akcji w spółkach wzrostowych | Nowoczesny, Odważny |
| Bezpieczny | ≥ 30% w obligacjach i lokatach | Ostrożny, Strachliwy, Instytucja |

- Mandat jest przypisany do transz z kampanii. Trwa do końca lock-upu, a bez lock-upu — 2 lata.
- **Naruszenie** przez 2 kolejne kwartały: zaufanie −10 (raz), klienci z tym mandatem mogą umorzyć także udziały w lock-upie (w ramach bramki umorzeń), przyczyna odpływu „📜 złamany mandat”.
- **Zmiana mandatu** przez gracza: zaufanie −5.
- Istniejące preferencje Emeryta i Nowoczesnego zostają (mandat je wzmacnia).
- **Akademia:** „Mandat inwestycyjny i dryf stylu”.
- **Testy:** warunki mandatów na portfelach testowych; naruszenie po 2 kw.; umorzenie z lock-upu tylko przy złamanym mandacie; nowa przyczyna w panelu.
- **Commit K5.**

## K6. Grupy inwestorów i analityk IR

- **Grupy** (z istniejących typów):
  - **Detaliczni:** Sknera, Strachliwy, Spryciarz, Ostrożny, Odważny, Nowoczesny, Etyczny, Emeryt, Funkcjonariusz;
  - **Instytucjonalni:** Instytucja, Inwestor;
  - **Zamożni:** Bogaty i VIP (K7).
- **Nastrój grupy** = średnie zadowolenie klientów ważone udziałami, w skali −50…+50, ze słowem (np. „lubią cię”).
- **Analityk IR** (zatrudnienie w panelu funduszu, koszt z funduszu co kwartał):

| Poziom | Koszt na kwartał | Co daje |
|---|---|---|
| L1 | 0,05% aktywów (min. 200 zł) | nastroje 3 grup w panelu funduszu (bez L1 — tylko łączne przyczyny jak dziś) |
| L2 „podwyżka” | 0,10% (min. 400 zł) | **misje grup**: 1 aktywna na grupę, nowa co 2 kw. |
| L3 „druga podwyżka” | 0,15% (min. 600 zł) | **przyczyny**: 2 najważniejsze składniki zadowolenia grupy z `getClientSatisfactionDrift` słowami, np. „Ostrożni: obsunięcie większe niż GIG, mało obligacji” |

- **Przykładowe misje** (czas 2 kw., nagroda: zadowolenie klientów grupy +0,10 i zaufanie +2; bez kary za porażkę):
  - Detaliczni: obsunięcie funduszu nie większe niż GIG + 3 pp w kwartale; opłata nie wyższa niż standardowa.
  - Instytucjonalni: wynik ≥ GIG w kwartale; żadna spółka > 10% aktywów.
  - Zamożni: stopa dywidendy portfela ≥ 3%; ≥ 15% w obligacjach i lokatach.
- Koszt IR to ok. 0,2–0,6% aktywów rocznie. Gracz waży koszt (wynik vs GIG) i korzyść (przepływy).
- **Akademia:** „Relacje inwestorskie (IR)”.
- **Testy:** przypisanie typów do grup; nastrój ważony udziałami; koszt wg poziomu; misje wg warunków; przyczyny z L3 zgodne ze składnikami zadowolenia.
- **Commit K6** (dwa kroki: grupy i L1; L2–L3).

## K7. Inwestorzy VIP

- **Oferty:** 0–2 na rok (szansa 10%/kw.), gdy zaufanie ≥ 50 i aktywa ≥ 50 000 zł; mail z profilem VIP-a.
- **Profile** (przykłady): Rentier (bezpieczeństwo), Rekin technologii (wizja), Family office (liczby), Baron dywidend (dywidendy).
- **Rozmowa:** gracz wybiera 1 z 3 argumentów, a gra sprawdza je **danymi funduszu**:

| Argument | Dane, które go potwierdzają |
|---|---|
| Liczby | nadwyżka nad GIG z ostatnich 4 okresów > 0 |
| Bezpieczeństwo | obsunięcie ≤ GIG w ostatnim roku i ≥ 15% w obligacjach lub lokatach |
| Wizja | ≥ 30% akcji w spółkach wzrostowych i wynik tej części ≥ GIG |

- **Szansa sukcesu** = 25% + 35% (argument pasuje do profilu) + 30% (dane potwierdzają) + zaufanie / 10 (pp).
- **Sukces:** wpłata 5–15% NAV z lock-upem 1–2 lata. VIP może wyjść przed końcem lock-upu, gdy fundusz będzie słabszy od GIG o > 10 pp w roku (umowa indywidualna, w ramach bramki).
- **Porażka:** przerwa 4 kw. dla tego VIP-a, bez kary.
- **Odrzucone ze szkicu:** „przysługa przyjacielska”, tony wypowiedzi bez związku z danymi, animacje rozmów.
- **Akademia:** „Dopasowanie oferty do inwestora”.
- **Testy:** szansa wg wzoru (10 000 losowań, ±2 pp); sprawdzanie danych; wpłata i lock-up; wcześniejsze wyjście VIP-a.
- **Commit K7.**

## K8. Akademia, osiągnięcia, pasek newsów

- **Hasła** z K2–K7 (8 haseł).
- **Osiągnięcia** (zakładka CV i szkolenia, XP bez pieniędzy):

| | Osiągnięcie | Warunek |
|---|---|---|
| 💎 | Zaufanie VIP-ów | pozyskaj 3 VIP-ów |
| 🛡️ | Gwarancja bez pudła | transza z gwarancją kończy lock-up bez dopłaty w bessie (GIG ≤ −10% w czasie lock-upu) |
| 🤝 | Dyplomata rynkowy | wszystkie 3 grupy „lubią cię” (≥ +20) jednocześnie |
| 🎯 | Słowo dotrzymane | mandat bez naruszenia przez cały okres |
| 📈 | Pełna subskrypcja | kampania zbiera ≥ 100% celu |

- **Pasek newsów:** koniec kampanii (wynik), VIP dołącza; bez dymków.
- **Commit K8.**

## K9. Kontrola końcowa

Pomiar z „Jak sprawdzimy”, raport `raporty/kontrola_0.15.2.md`, wiersz w mapie. **Commit K9.**

---

## Zlecenie dla czatu designu (przed K1–K2 i K6)

1. **Kalendarz** w górnym pasku (stan zwykły, wersja mobilna).
2. **Formularz kampanii** w oknie emisji: czas, cel, lock-up, gwarancja, mandat, podgląd kosztu i spodziewanego popytu słowem („mały / średni / duży”).
3. **Zakładka „Relacje”** w panelu funduszu: 3 grupy z nastrojem (liczba, słowo, ikona), misje, przyczyny (L3), stan analityka IR.
4. **Mail VIP** z 3 argumentami (wzorzec maili z akcją).
5. **Wiersze raportu okresu:** zobowiązanie z gwarancji, kredyt płynnościowy, udziały w lock-upie.
6. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.

## Zapis gry i testy

- **Zapis v15 bez zmiany numeru** (pola opcjonalne):
  - `client.tranches[]`;
  - `playerFund.campaign` (aktywna kampania) i historia ≤ 8 kampanii;
  - `playerFund.liquidityLoan`;
  - mandaty;
  - `playerFund.ir` (poziom, misje, przerwy VIP);
  - przyrost < 0,1% (transze ok. 4 pola na klienta).
- **Migracja:** każdy klient dostaje jedną transzę bez lock-upu i gwarancji; IR niezatrudniony.
- **Testy** (nowa grupa „0.15.2”, ok. 30): wymienione w częściach, do tego zachowanie pieniędzy w świecie po 20 latach z presetem `kampanie` i niezmienniki.

## Jak sprawdzimy

Przebiegi ×200: **20 gier × 6,5 roku z `fundusz-gig`, 20 × 6,5 roku z `kampanie`, 5 × 20 lat z `kampanie`**; części K2–K7: ≥ 10 gier × 6,5 roku.

| Miara | Cel |
|---|---|
| `fundusz-gig` bez nowych opcji | jak w 0.15.0.1: udziały −3…+3%/rok, zaufanie 45–55 |
| Kampania: zebrano / cel | średnio 40–90%; 1 tydzień < 2 tygodnie < 1 kwartał |
| Lock-up 2 lata: odpływ w bessie | ≥ 30% mniejszy niż bez lock-upu |
| Gwarancja: dopłaty w 20 latach | średnio ≤ 2% NAV rocznie; kredyt płynnościowy w ≤ 20% gier z gwarancjami |
| Udział w zysku 70% | transze z gwarancją w hossie zostawiają funduszowi 30% zysku (sprawdzenie księgowe) |
| Mandaty | naruszenia w ≤ 30% mandatów sondy |
| Koszt IR | 0,2–0,6% aktywów rocznie |
| Misje | wykonane w 30–60% |
| VIP | sukces 20–40% przy złych danych, 50–80% przy pasujących |
| Ocena zarządu i premia R5 przy `kampanie` | bez zmian ±5 pkt względem `fundusz-gig` |
| Niezmienniki, ujemna gotówka, wyjątki JS, pieniądze znikąd | 0 |
| Czas kroku / zapis | +≤ 2% / +≤ 0,1% |

## Ryzyka

- **Lock-up jako strategia dominująca** („zawsze 3 lata”). Zabezpieczenie: niecierpliwe typy znikają z popytu (×0 przy 3 latach), niezadowoleni w lock-upie obniżają zaufanie, a dyskonto na rynku wtórnym rośnie.
- **Gwarancja jako darmowy napływ w hossie.** Zabezpieczenie: udział w zysku 70%, limit 30% udziałów, zobowiązanie widoczne w raporcie, kredyt płynnościowy obniża zaufanie.
- **Kampanie w euforii zbierają dużo, a w bessie nic** — to zamierzone (lekcja), ale nie może zablokować funduszu. Emisja ciągła działa dalej.
- **Za dużo zarządzania** (kampanie, mandaty, IR, VIP). Zabezpieczenie: wszystko opcjonalne, domyślnie gra jak w 0.15.0.1; VIP najwyżej 2 na rok.
- **Rozjazd kalibracji odpływu z 0.15.0.1.** Zabezpieczenie: pomiar `fundusz-gig` bez nowych opcji w każdej części.

## Decyzje (podjęte)

2026-10-20 (planowanie 0.15.x, `raporty/audyt_planow_0.15.x.md`):
1. **Zakres:** kalendarz, kampanie emisyjne (1 tydz. / 2 tydz. / 1 kw.), lock-up 0–3 lata, mandat, 3 grupy inwestorów z istniejących typów, analityk IR z 2 podwyżkami, VIP z argumentami sprawdzanymi danymi.
2. **Gwarancja kapitału zostaje w łagodnej wersji:** niedobór pokrywa fundusz (gotówka → wymuszona sprzedaż → kredyt płynnościowy), **bez dymisji i upadłości po tygodniu**; udział w zysku 70%, limit 30% udziałów, lock-up ≥ 1 rok.
3. **Kalendarz:** „Rok · kw. · tydz.” (gra nie ma miesięcy).
4. **Odrzucone:** „przysługa przyjacielska” (pewny napływ na żądanie), tony wypowiedzi bez związku z danymi i animacje rozmów, reguła debetu z upadłością po tygodniu, moduły `playerFund.js`, `fundBots.js`, `prDepartment.js` (nie istnieją).
