# Plan 0.17 „Surowce i transport” (szkic zakresu, po 0.16 „Giełda międzynarodowa”; po nim 0.17.1 „Wielkie testy rozgrywki i balans”, 0.17.2 „Energia i środowisko”, potem 0.18 „Łańcuchy produkcyjne”)

Cel: gra dostaje ceny surowców, giełdę towarową i transport. Surowce są wsadem i produktem spółek; transport wpływa na koszty i czas dostaw. To **warstwa pod 0.18** (łańcuchy produkcyjne) — bez niej łańcuch nie ma czego przenosić.

Czego uczy:
- **Cykl surowcowy:** ceny surowców zależą od popytu przemysłu i zbrojeń, podaży i geopolityki.
- **Kontrakty terminowe:** dźwignia, depozyt, zapadalność; contango i backwardation w prostej formie.
- **Koszty wsadu:** kto zyskuje i traci na wzroście ceny ropy, miedzi, zboża.
- **Logistyka:** fracht morski (tani, wolny), lotniczy (drogi, szybki), lądowy (elastyczny); wąskie gardła.

Kolejność: S0 → S0b → S1 → … → S7. **Szczegóły części S1–S7 (liczby, wzory, testy): `plan_0.17_specyfikacja.md`.** **Commit po każdej części.** UI z komponentów 0.14.5; projekt wyglądu zleca się czatowi designu.

**Zależności:** 0.16 (kraje otwarte: surowce mają kraje producentów; waluta USD; **silnik depozytu `marginEngine` z forexu G21**, który tu obsługuje kontrakty). Zapis: pola opcjonalne w v16.

**Wielkość orientacyjna:** L (9 części, ok. 40 testów; nowe spółki ok. 25; zapis ≤ +7% (podniesione z +4% 2026-11-02)).

**Stan (2026-11-01):** S0 zrobione i scalone (`raporty/baza_0.17.md`): PL 48 gier GIG 9,9% ± 1,15, marża 22,2%, zapis 2,327 mln znaków, krok 1213 ms/kw. (jedna instancja). **Budżet 0.17: zapis ≤ 2,49 mln znaków (+7%, decyzja 2026-11-02; po S2 zużyte +3,3%), krok ≤ 1334 ms/kw.** (pomiar sekwencyjny, ≥ 8 gier przed i po). Silnik `marginEngine` jest w `forex.js` (dźwignia ≤ 1:10, łącznie ≤ 3 × aktywa funduszu). Umiejętności „Mistrz Opcji” w kodzie jeszcze nie ma (dopisać w S7 do drzewa umiejętności w `player.js`).

---

## Punkt wyjścia (do sprawdzenia w kodzie przed S0)

- Sektory: Energia (OZE, Energetyka jądrowa), Chemia, Przemysł, Transport i logistyka (Lotnictwo, Logistyka), Budowlany, Obronność, Żywność; spółki surowcowe PL (Kopalnie Węgla Mine, Miedź Ludowa, Siarkobrzeg, Państwowy Uran, Stocznia Morska).
- Szoki makro w `core.js` (`MACRO_SHOCK_EVENTS`: szok naftowy) — tylko efekty kursowe; kryzysowa linia naftowa 1973 w `crises.js` działa przez szoki sektorowe.
- Przetargi budowlane i PPP: `city.js`; interwencje państwa z 0.15.3 bez zamówień PPP (odstępstwo 6 z kontroli 0.15.3).
- Silnik depozytu: `forex.js` (0.16.4 G21) — `registerMarginMarket`/`openMarginPosition`, wspólny limit `fundLeverageCap`.
- Spółki ETF: `etfs` w `companies.js` trzymają **akcje** (`holdings[symbol]`); ETF surowcowy to nowy rodzaj portfela (surowce zamiast akcji).

## Części

| Część | Zakres | Uwagi |
|---|---|---|
| **S0** | Pomiar po 0.16 (zapis, czas kroku, GIG, marże; baza 0.17) | ✅ raport `raporty/baza_0.17.md` |
| **S0b** | **Odchyłki z bazy i sonda:** (1) ujemna pula „kwity” GDR po wczytaniu zapisu (`gdr.js:267`, 19/99 gier; ustalić, czy pula jest ujemna na żywo, czy rozjeżdża ją wczytanie) i nadmiar spółek CZ po wczytaniu; (2) `moneyWarn` inkubatora w grach 20-letnich (`player.js:671`, 10/12; bisekcja od 0.16.1); (3) sonda: łączna kapitalizacja rynku, udział spółek krajowych w przejęciach D3, `lzChars/limit`, liczniki `invAfterLoad` i `moneyWarn`; (4) harness: jedno ponowienie `loadFrame` po „Failed to fetch”; (5) **lista nowych spółek** `plany/propozycja_spolek_0.17.md` (propozycja 23 spółek gotowa 2026-11-01, czeka na akceptację) | ✅ `raporty/kontrola_0.17_s0b.md` (lista spółek zostaje na S2/S4) |
| **S1** | **Rejestr surowców** (**7 na start:** złoto, ropa, gaz, węgiel, metale przemysłowe, zboże, uran; srebro, kawa i bawełna dochodzą w 0.18 razem z łańcuchami): cena w USD, proces powracający do średniej + sezon + wpływ nastroju i linii (szok naftowy z `MACRO_SHOCK_EVENTS` i linia 1973 z `crises.js` ruszają ceną ropy), wpływ globalnego popytu przemysłu i zbrojeń | **cena co tydzień** (jak forex, pod depozyt i margin call); trend i sezon kwartalne; bez dziennej mikrostruktury; węgiel potrzebny też w 0.17.2 |
| **S2** | **Spółki i koszty:** nowe spółki z zatwierdzonej listy S0b; Kopalnie Węgla Mine ↔ węgiel, Miedź Ludowa ↔ metale, Państwowy Uran ↔ uran, Siarkobrzeg ↔ metale/chemia; spółki wydobywcze (przychód ∝ cena surowca), przemysł i chemia (koszt wsadu = udział kosztu × zmiana ceny), **średnia odchyłek marż = 0** (zasada 0.13: marżę wyznacza profil sektora) | kalibracja „średnio zero” jest warunkiem wejścia |
| **S3** | **Giełda towarowa:** kontrakty terminowe (zapadalność 1–4 kw.; **na czas testów dostępne od razu, pod koniec 0.17 zamknięte za umiejętnością „Mistrz Opcji”** — decyzja 2026-10-25), depozyt i margin call (`marginEngine`), boty spekulacyjne i hedgujące (spółki zabezpieczają wsad). **Bez dźwigni:** ETC na pojedynczy surowiec (1:1, opłata roczna, bez depozytu) i **ETF surowcowy na koszyk** w zakładce Internet → ETF (nowy rodzaj portfela: surowce zamiast akcji) | limit dźwigni funduszu wspólny z forexem; ETC/ETF nie liczą się do limitu dźwigni |
| **S4** | **Transport:** podsektory w Transporcie i logistyce (Morski, Lotniczy-cargo, Lądowy: kolej i ciężarówki); spółki (1–2 na kraj; flagowe państwowe w PL i USA: np. morska, POP, DHXL); **indeks frachtu** (cena + czas dostawy wg rodzaju) | bez nowego sektora, tylko podsektory |
| **S5** | **Infrastruktura publiczna:** porty morskie, tory, autostrady, lotniska (np. Chopin Industry Airport, Wałęsa Shipment) przez przetargi `city.js`; przepustowość podnosi tempo transportu; **zamówienia PPP** dopisane do interwencji państwa 0.15.3 | domyka odstępstwo 6 z 0.15.3 |
| **S6** | **Zbrojenia a surowce:** obronność zużywa metale i elektronikę (zamówienia rządowe); poziom bezpieczeństwa państwa | decyzja 2026-10-25: wchodzi do 0.17; po S2 |
| **S7** | **Zamknięcie kontraktów za umiejętnością „Mistrz Opcji”** (nowa w drzewie `player.js`; ETC i ETF zostają otwarte); kontrola GIG ±1 pp na **120 + 120 gier PL** w jednej partii, seria PL 20 lat ×12; interfejs, Akademia (np. „Kontrakt terminowy”, „Contango”, „Fracht”), zapis, kontrola, raport `raporty/kontrola_0.17.md` | |

## Jak sprawdzimy (orientacyjnie)

| Miara | Cel |
|---|---|
| Średnia odchyłek marż sektorów po S2, S4, S6 | 0 ± 0,3 pp; **`earningsIndexCagr` i marża końcowa** w widełkach bazy (ok. 60 gier na ramię, obie serie w tej samej partii) |
| GIG (tylko kontrola S7) | ±1 pp względem bazy 0.17, 120 + 120 gier PL |
| `invAfterLoad`, `moneyWarn` (po S0b) | 0 |
| Cena surowca w widełkach | 100% kroków; zmienność roczna 15–40% wg surowca |
| Spekulacja „kup nisko, sprzedaj wysoko” na kontraktach | ≤ lokata + 6 pp/rok |
| Margin call | zamknięcie przy kapitale pozycji < 50% depozytu; 0 ujemnej gotówki |
| Zapis / czas kroku | ≤ +7% / ≤ +10% |
| Niezmienniki, wyjątki JS | 0 |

## Główne ryzyka

- **Przesunięcie marż wszystkich sektorów** (koszt wsadu) → kalibracja „średnio zero”, przebiegi ×200 przed commitem S2.
- **Dźwignia gracza** (kontrakty + forex) → wspólny limit dźwigni.
- **Zbyt wiele surowców = szum**: zaczynamy od 7 (z węglem); kolejne dopiero w 0.18.
- **ETF surowcowy w kodzie ETF-ów akcyjnych**: `etfs` obsługują tylko akcje (dywidendy, przejęcia, upadłości) — surowcowy trzymać osobno, żeby nie rozlewać warunków po `companies.js`.

## Decyzje (podjęte 2026-10-25)

1. **6 surowców na start** (złoto, ropa, gaz, metale przemysłowe, zboże, uran).
2. **Kontrakty od razu na czas testów**, a przed zamknięciem 0.17 zamykamy je za umiejętnością „Mistrz Opcji” (zadanie w S7).
3. **S6 Zbrojenia a surowce i bezpieczeństwo państwa wchodzi do 0.17** (nie jest już opcjonalne): obronność kupuje metale i elektronikę, zamówienia rządowe, poziom bezpieczeństwa państwa; kalibracja „średnio zero” z S2 nadal warunkiem wejścia.

## Zlecenie dla czatu designu (przed S3)

1. Okno giełdy towarowej (lista surowców z ceną i zmianą, wykres, kontrakty, ETC i ETF koszykowy, depozyt słowem i liczbą).
2. Indeks frachtu w oknie „Rynek” albo w zakładce Miasto (porty, tory, lotniska).
3. Ikony surowców i rodzajów transportu (SVG).
4. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.
4. **Szlify (2026-11-01):** S0 scalone; nowa część **S0b** (kwity po wczytaniu, inkubator 20 lat, sonda, lista spółek) przed S1.
5. **Kryterium:** po częściach `earningsIndexCagr` + marża (~60 gier/ramię); GIG ±1 pp tylko w kontroli S7 na 120 + 120 grach.
6. **Węgiel jako 7. surowiec** (z kontraktami).
7. **Cena surowców co tydzień** (trend i sezon kwartalne).
8. **Instrumenty:** kontrakty terminowe (za „Mistrzem Opcji” od S7) + ETC na pojedyncze surowce + ETF surowcowy na koszyk (Internet → ETF), bez dźwigni.
9. **Nowe spółki:** listę proponuje czat planowania (`plany/propozycja_spolek_0.17.md`), użytkownik zatwierdza przed S2.
10. **Design:** zlecenie czatowi designu przed S3 (zakres jak niżej + ETC/ETF w oknie giełdy towarowej).
11. **Dźwignia kontraktów wg surowca** (2026-11-01): złoto 1:10; ropa, metale, zboże 1:5; gaz, węgiel, uran 1:3; limit łączny wspólny z forexem.
12. **„Mistrz Opcji” — nowa umiejętność, 2 poziomy:** L1 tylko długie do 1:3, L2 krótkie i pełna dźwignia; ETC i ETF za „Ekspertem Rynków Globalnych” L1.
13. **Czas dostaw w 0.17 tylko widoczny**; liczy się od 0.18. W 0.17 transport działa przez koszt (indeks frachtu).
14. **Bezpieczeństwo państwa** wpływa na napływ kapitału zagranicznego, stabilność i nastroje oraz szansę szoków geopolitycznych (bez przestępczości).
15. **Budżet obronny wg partii rządzącej** (`defenseShare` w `RULING_PARTIES`), skok o 50% po szoku geopolitycznym.
16. **S6 pełne dla kraju startowego**, obce kraje ze stałym `security` w danych kraju.
17. **Nowe zdarzenia S1:** embargo/blokada cieśniny, strajk w kopalniach, ucieczka do złota, rekordowe zbiory, awaria reaktora za granicą; istniejące (szok naftowy, susza, spadek cen energii) ruszają cenami.
18. **Ceny surowców egzogeniczne** (gracz i boty nie ruszają ceną); wpływ na spółki względem średniej 8 kw. („średnio zero” z definicji).
19. **Budżet zapisu 0.17 podniesiony do +7%** (2026-11-02): ≤ 2,49 mln znaków PL 27 kw.; po S2 zużyte +3,3%.
20. **S3 bez czekania na design** (2026-11-02): okno giełdy towarowej w S3 roboczo z komponentów okna forexu; projekt czatu designu przed S7, wtedy ostateczny wygląd.
21. **Opisy własne spółek krajowych** (2026-11-02): `COMPANY_DESCRIPTIONS` w `companies.js` (PES, NAG, ZST, SLS już są); transportowe w S4, wszystkie pozostałe spółki PL w S7 (szczegóły w specyfikacji).
22. **Podatek od zysków z forexu, kontraktów, ETC i ETF** (2026-11-02) jak od zysków kapitałowych z akcji; wprowadzany na gałęzi S3 przed scaleniem.
