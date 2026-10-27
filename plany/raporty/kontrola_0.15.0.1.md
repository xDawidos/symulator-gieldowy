# Kontrola 0.15.0.1 „Poprawki 0.15” (2026-10-21)

- **Kod:** gałąź `claude/funny-villani-16217c` od `zmiany-AI` = `45d435c`, ostatni commit części C0–C6 `e7bb900` (+ ten raport).
- **Plan:** `plany/plan_0.15.0.1_poprawki.md`, tło `raporty/weryfikacja_0.15.md`.
- **Testy:** `tests/tests.html` **513/513** (było 492; nowa grupa „0.15.0.1”, 21 testów; poprawione H4.3, H4.5 i test etapu A „recesja”).
- **Przebiegi C7** (`tests/przebiegi.html`, ×200, kod `e7bb900`):
  - 20 gier × 6,5 roku bez presetu (`c7`);
  - 20 gier × 6,5 roku z `fundusz-gig` (`c7fg`);
  - 5 gier × 20 lat (`c7long`) + 5 gier kontrolnych 20-letnich (`c7long2`, wynik krachów niżej).
- ± to błąd standardowy średniej.

## Zmiany

| Część | Commit | Co |
|---|---|---|
| C0 | `32f6548`, `1607262` | Sondy w przebiegach: nastrój (premia ważona tikami), bezpieczniki wg stopnia i w krachu / poza nim, tiki zamrożone, wycena (kurs / wartość, wartość / zysk, mnożnik, stopa), łańcuchowy indeks zysku rynku i liczby akcji, emisje i skupy wg fazy, bramka umorzeń |
| C1 | `78b6c69`, `fef845b` | **B1:** wstrzymanie liczone `getGameClockMs()` (15 s gry = 15 tików przy każdej prędkości, pauza nie skraca); 3. stopień do końca tygodnia gry; wczytanie usuwa stary znacznik `Date.now()`; baner z poprawnym spadkiem. Progi zerowane co tydzień gry (wcześniej każdy stopień działał raz na całą grę). Pokrętło z planu: 1. stopień −7% → **−8%** |
| C2 | `53560d4` | **B2:** margin call botów sprzedaje 20–40% wolnych akcji. **B3:** margin call gracza liczy dług z pożyczek lombardowych i spłaca je od najstarszej; brak gotówki → `forceLiquidation(…, 'margin')` (wolne akcje, wpływ na cenę, `sharesHeld`); mail i dziennik z kwotą, pozycjami i dźwignią. **B4:** windykator nie zajmuje akcji w zastawie |
| C3 | `71563b4` | **B6/B7:** dopłaty Komendanta Jakuba i Funkcjonariusza ze skarbu państwa (`takeFromTreasury`); koniec `TypeError` (przypisanie do `const`) przerywającego pętlę klientów; usunięty martwy warunek `retiree` |
| C4 | `b82e302` + strojenie `1318d90`, `0f3e089`, `dd1470d`, `e7bb900` | Emisje i skupy na walnym wg wyceny; emisja ratunkowa bez nastroju i wagi bańki; newsy i hasło Akademii „Emisje i skupy w cyklu rynku”. Strojenie (decyzja użytkownika „popraw emisje”) — niżej |
| C5a | `5217208` | Mnożnik C/Z fazy gospodarki 0,93 / 1,00 / 1,05 / 1,10 |
| C5b | `a41beac` | Krach tylko w Euforii, Dystrybucji i Hossie ≥ 4 kw.; szansa 2,5%/kw.; dno premii −35% |
| C6a | `ddcae66` | Obsunięcie względem GIG (+3 pp tolerancji) + część absolutna k = 0,15 przy spadku GIG > 10%; przyczyny „obsunięcie większe niż GIG” i „głęboka bessa” |
| C6b | `f554833` | Bramka umorzeń 10% udziałów z początku kwartału (panika ≤ 5%), kolejka `queuedRedemption` idzie pierwsza w następnym kwartale, rezygnacja przy odzyskanym zadowoleniu; mail, pasek newsów, zaufanie −2, hasło Akademii „Bramka umorzeń”, wiersz w panelu „Dlaczego klienci…”; rynek wtórny poza bramką |
| C6c | — | Niepotrzebne: udziały funduszu = GIG w celu bez strojenia napływu |

### Strojenie emisji (C4)

Pomiar po C6: emisje Hossa i Euforia 1,9 vs Bessa i Kapitulacja 2,4 na kwartał (cel ≥ 2× we wzrostach). Kolejne kroki:

| Krok | Zmiana | Wzrosty / spadki (emisje na kw. fazy) |
|---|---|---|
| `1318d90` | drogie akcje od premii > +10% (było +15%); emisja z braku gotówki przy tanich akcjach 50% → 20% | 2,1 / 2,1 i 1,8 / 2,2 — bez efektu |
| diagnoza | porządek obrad powstaje kwartał przed walnym: emisje „przy drogich akcjach” zgłoszone w Dystrybucji przechodziły w Bessie (20 przyjętych w Bessie przy 9 zgłoszonych) | — |
| `0f3e089` | na walnym zarząd wycofuje uchwałę kapitałową, której powód przestał obowiązywać | 1,24 / 0,95 i 1,69 / 1,18 |
| `dd1470d` | przewartościowana spółka (kurs ≥ 1,3 × wartości) emituje tylko przy premii ≥ −10%; skup z nadmiaru gotówki 50% → 30% | 1,57 / 1,04 i 1,29 / 1,21 |
| `e7bb900` | **okno emisji zamknięte w Bessie i Kapitulacji** (premia goni cel z opóźnieniem); emisja z braku gotówki w bessie 20% | **1,46 / 0 i 1,31 / 0** ✅ |

## Wyniki celów

| Miara | Cel | `c7` (20 × 6,5) | `c7fg` (20 × 6,5) | `c7long` (5 × 20 lat) | Stan |
|---|---|---|---|---|---|
| Tiki zamrożone bezpiecznikiem | ≤ 0,5% | 0,92 ± 0,12% | 0,75 ± 0,09% | 0,54 ± 0,03% | ⚠️ (z 52% przed B1) |
| Bezpieczniki poza krachem | ≤ 2 na 20 lat | 8,0 ± 0,8 | 9,1 ± 1,2 | 8,3 ± 0,4 | ❌ |
| Średnia premia ważona czasem | −3…+3% | −0,4 ± 0,8% | −0,2 ± 0,6% | +1,1 ± 1,0% | ✅ |
| C/Z rynku (mediana) | ±1 pp/rok | −0,37 ± 0,12 | −0,27 ± 0,09 | −0,14 ± 0,05 | ✅ |
| Kurs / wartość godziwa w 0,75–1,30 | ≥ 80% kwartałów | 74 ± 3% | 72 ± 4% | 73 ± 6% | ⚠️ (przed C5a 68–75%) |
| GIG rocznie | 8–10% (20 lat, mediana) | 10,8 ± 0,9% | 10,8 ± 1,0% | **mediana 10,0%** (9,9–11,7) | ✅ na granicy |
| Zysk rynku ważony kapitalizacją | 8–11%/rok | 11,0 ± 0,5% | 10,7 ± 0,7% | 11,1 ± 1,1% | ✅ na granicy |
| Zysk na akcję, mediana spółek | ≥ 5%/rok | 7,1 ± 0,3% | 6,6 ± 0,5% | 4,1 ± 0,6% (bankruci = −100%) | ⚠️ w 20 latach |
| Krachy | 1–3 na 20 lat; ≥ 1 w 30–50% gier 6,5-letnich | 1,44 / 20 lat; 45% gier | 0,64 / 20 lat; 20% gier | 0 w 5 grach; `c7long2`: 4 w 5 grach | ⚠️ łącznie 0,76 / 20 lat; 33% gier 6,5-letnich |
| Premia po krachu | ≥ −35% | min. −29% | min. −31% | — | ✅ |
| Emisje / skupy wg fazy | emisje we wzrostach ≥ 2×; skupy odwrotnie | emisje 1,46 / 0; skupy 2,4 / 4,5 | emisje 1,31 / 0; skupy 2,8 / 4,0 | emisje 1,99 / 0; skupy 4,6 / 7,1 | ✅ |
| Rozwodnienie rynku (akcje tych samych spółek GIG) | +0,5…+2%/rok | −0,07 ± 0,09% | −0,20 ± 0,10% | −0,13 ± 0,12% | ❌ |
| Fundusz = GIG: udziały / zaufanie | −3…+3%/rok / 45–55 | — | **+0,2 ± 2,1% / 51,1** | — | ✅ (przed: −21,4% / 41,7) |
| Fundusz = GIG: najgorszy kwartał | odpływ ≤ 10% (+ kolejka) | 10% | 9,5% | 10% | ✅ |
| Margin call | 0 „dług bez zmiany”; akcje = posiadacze | testy C2 | testy C2 | 0 naruszeń niezmienników | ✅ |
| Ostrzeżenia „zastaw > posiadanych” | 0 | 0 | 0 | 0 | ✅ (w `c1`, przed B4: 13) |
| Wyjątki JS | 0 | 0 | 0 | 0 | ✅ |
| Niezmienniki, ujemna gotówka, złe ceny, ostrzeżenia pieniędzy | 0 | 0 | 0 | 0 | ✅ |
| Zapis | bez strat | 20/20 | 20/20 | 5/5 (3,23 MB) | ✅ |
| Czas kroku | +≤ 2% | 2,40 s/kw. | 2,46 s/kw. | 3,47 s/kw. | ⚠️ bez porównania (3 karty równolegle) |

Przyczyny odpływu z funduszu = GIG (`c7fg`, suma wartości): wynik gorszy od GIG 51%, kolejka bramki 46% (to te same umorzenia, odroczone), zaufanie 2%, panika 2%, głęboka bessa 0,5%. Obsunięcie absolutne przestało być główną przyczyną (było 51%). Bramka działa w ok. 4,8 z 26 kwartałów gry.

Gracz bierny (`c7`, bez presetu): udziały −23%/rok, zaufanie 29 — gracz nic nie robi (portfel = gotówka), wynik jak w 0.15.

### Krachy w grach 20-letnich

W `c7long` w kwartałach, w których krach jest możliwy (Hossa ≥ 4 kw., Euforia, Dystrybucja: 21–32 na grę), spodziewane ok. 0,8 krachu na grę, a wyszło 0 w 5 grach (szansa ok. 2%). Kolejność wywołań w pętli kwartalnej jest poprawna; model faz w teście C5b daje 1,0 krachu na 20 lat. Łącznie w przebiegach 6,5-letnich: 13 krachów na 250 lat gry (1,04 na 20 lat).

**Gry kontrolne `c7long2` (5 × 20 lat):** 4 krachy (0, 0, 1 w Dystrybucji, 2 w Hossie i Euforii, 1 w Hossie); GIG 7,6–12,7%; bezpieczniki poza krachem 4–12; niezmienniki, wyjątki 0; zapis bez strat.
- Razem gry 20-letnie: 4 krachy na 197 lat (0,4 na 20 lat); wszystkie przebiegi: 17 krachów na 447 lat gry (**0,76 na 20 lat**, cel 1–3).
- Mechanizm działa (krach w Hossie ≥ 4 kw., Euforii, Dystrybucji; dno premii ≥ −35%), ale częstość jest trochę poniżej celu. **Do decyzji:** szansa bazowa 2,5% → 3,5%/kw.
- GIG w 10 grach 20-letnich: mediana 10,05% (7,6–12,7%).

## Odstępstwa i otwarte sprawy

1. **Bezpieczniki poza krachem 7–9 na 20 lat (cel ≤ 2), tiki zamrożone 0,5–0,9% (cel ≤ 0,5%).**
   - Naprawa B1 wymagała też zerowania progów co tydzień gry (wcześniej każdy stopień mógł zadziałać tylko raz na całą grę, stąd 1,3 na grę w pomiarze planu).
   - Diagnoza (`window.__haltDiag`): to szerokie spadki rynku w tygodniu (mediana spółek −7…−12%), głównie po szokach makro i zdarzeniach rynkowych, oraz ostatni tydzień krachu (sonda liczy go już jako krach).
   - Pokrętło z planu (−7% → −8%) zmniejszyło liczbę z ok. 18 do 8 na 20 lat.
   - **Do decyzji:** próg 1. stopnia −10% albo progi liczone od zamknięcia poprzedniego dnia (5 dni w tygodniu) zamiast od początku tygodnia, albo przyjąć 8/20 lat jako zgodne z grą (bezpiecznik to lekcja „flash crash”).
2. **Rozwodnienie rynku ≈ 0%/rok (cel +0,5…+2%).** Emisje są już w cyklu, ale skupów jest 2–3× więcej niż emisji (nadmiar gotówki spółek). **Do decyzji:** skup z nadmiaru gotówki 30% → 15% albo emisja z drogich akcji 30% → 40%. Ryzyko z planu (GIG > 10%) zostaje na granicy: mediana 20 lat 10,0%.
3. **Mediana kurs / wartość godziwa w przedziale w 72–74% kwartałów (cel ≥ 80%)** — C5a poprawiło o kilka pp; dalsze zawężenie to np. szybszy powrót do wartości (`PRICE_MEAN_REVERSION_PER_TICK`) — nie ruszane bez decyzji.
4. **Zysk na akcję mediany spółek w 20 latach 4,1%** (cel ≥ 5%; w 6,5 roku 6,6–7,1%) — bankruci liczeni jako −100%; zysk rynku ważony kapitalizacją w celu.
5. **Krachy 0,76 na 20 lat** (cel 1–3) — zob. wyżej; do decyzji szansa bazowa 3,5%/kw.
6. **Zmiany poza planem:**
   - emisje: okno zamknięte w Bessie i Kapitulacji, walne wycofuje uchwały kapitałowe bez aktualnego powodu, skup z nadmiaru gotówki 30% (decyzja użytkownika „popraw emisje”);
   - progi bezpiecznika zerowane co tydzień gry;
   - odliczanie chłodzenia KNF działa też w kwartałach bez ryzyka krachu;
   - „Komendant Jakub” bez dopłaty przy pustym skarbie.
7. **Nie sprawdzone osobno:** czas kroku i przyrost zapisu względem 0.15 (pomiary w 3 kartach równolegle; nowe pola zapisu to `queuedRedemption` klienta i 3 pola kwartału przepływów — rząd bajtów); widok panelu bramki w przeglądarce (tekst renderowany w przebiegach bez błędu, bez zrzutu).

## Po C7: decyzje użytkownika i pomiar (2026-10-21)

| Decyzja | Commit | Wynik (10 + 10 × 6,5 roku, 4–5 × 20 lat, ×200) |
|---|---|---|
| Bezpiecznik 1. stopnia −10% | `c01b553` | poza krachem 1,0 / 3,2 / 1,5 na 20 lat (było 8–9); tiki zamrożone 0,4–0,6% ✅ |
| Krach 3%/kw. | `c01b553` | 1,0–1,6 na 20 lat, w grach 20-letnich krach w każdej grze ✅ |
| Emisja przy drogich akcjach 37% → 40% | `c01b553`, `01bf512` | emisje tylko we wzrostach ✅; rozwodnienie +0,3 / −0,1 / −0,5%/rok ❌ |
| Skup z nadmiaru gotówki 25% | `9ce625c` | rozwodnienie +0,4 / −0,2 / −0,1%/rok ❌ (otwarte) |
| Zysk na akcję: przyjęte ok. 4% w 20 latach; łagodniejszy Spadek (−1,5 pp, wyjście 30%) | `9ce625c` | mediana spółek 6,6–6,8% (6,5 roku), 4,2% (20 lat) ✅ wg decyzji |
| Faza dla każdej spółki (błąd: ok. połowa spółek bez fazy) | `9ce625c` | spółki bez fazy 70% → 3–4% (to banki) ✅ |

- **Sondy:** bankruci znikają z listy spółek, więc dawna miara „bankrut = −100%” nic nie liczyła; sonda ma teraz rozbicie (strata na końcu, mediana ocalałych) i wzrost wg sektora.
- **Sektory (mediana zysku na akcję / kursu na rok, 20 lat):** najlepsze Finanse 17,5 / 17%, Technologia 7,7 / 7,5%, Usługi 8,1 / 6,3%, Obronność 7,1 / 8,0%; najsłabsze Przemysł −0,4 / 0,4%, Budowlany −0,2 / 4,3%, Turystyka −1,5 / 1,3%, Energia 2,0 / 6,8%, Chemia 2,2 / 6,0%.
- **Otwarte:** rozwodnienie rynku ≈ 0%/rok (cel +0,5…+2%).
