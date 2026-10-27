# Diagnoza 0.15.6 „Giełdy wejścia” (E0, 2026-10-25)

- **Kod bazowy:** gałąź `claude/impl-0156-717f07` na commicie `992f999` (0.15.5, testy 668/668). W E0 w grze **niczego nie zmieniono** — tylko sonda `PROBE_0156` w `tests/przebiegi.html` (pole `p0156` wyniku) i poprawka narzędzi (`run_tests.mjs`, `run_przebiegi.mjs`: nagłówek `no-store`, osobny profil Edge i porty z `SIM_PORT` / `SIM_CDP` — domyślne porty 8765/9222/9223 bywają zajęte przez inne sesje i narzędzie czytało wtedy cudze wyniki).
- **Przebiegi:** 2 gry × 6,5 roku (×200, wirtualny zegar). Próba mała — to diagnoza progów, nie pomiar końcowy.

## 1. Stan wyjściowy (poprawki do założeń planu)

| Założenie planu | Stan w kodzie |
|---|---|
| „NewHorizons działa jako rynek (państwowy)” | **Nie.** „Giełda NewHorizons” (`index.html`, panel startupów) to nazwa **inkubatora startupów**, nie rynku. Rynki w `finance.js`: GPW (główny), XTD, PLU5 (operatorzy-startupy, rynki internetowe), Euronext (uśpiony na stałe), do 4 nowych rynków internetowych w trakcie gry. **NH i giełdę prywatną trzeba dopiero stworzyć** (E2, E3). Nazwa „NewHorizons” zostaje dla rynku, panel startupów zostaje „Pula / inkubator”. |
| „Poziomy giełd od śmieciowej do platynowej” | Poziomy `exchanges` (JUNK…PLATINUM, RUBY/EMERALD/DIAMOND) to **ranga spółki wg kursu / rankingu kapitalizacji** (dostęp inwestorów po licencji), nie wymóg wejścia. Wszystkie debiuty startupów wchodzą na BRONZE. Wymogów wejścia **nie ma w ogóle** — jedyne bramki to sufity liczby spółek (0.15.4 P1/P5). |
| „Wymagania debiutu (kapitalizacja, zysk, wiek, wolny obrót)” | Brak. Do ustalenia nowe — patrz §3. |
| Spółka na rynku | Pole `stock.market` (brak = GPW). Spółki rynków internetowych nie liczą się do limitu spółek krajowych (`isCountedListedCompany`) i mają limit 8 na rynek. |
| Oszustwa | `stock.fraud` (start 0,8%/kw., ×2 przy złej kondycji, ×3 skorumpowany prezes, najwyżej 5% spółek), wykrycie przez audytora po 3–7 kw. albo KNF (rzadko), `revealFraud` = odpis + kurs −20…40%. Prawie wszystkie wykrycia: „audytor”. |

## 2. Liczby z sond (2 gry × 27 kw.)

| Miara | Wynik |
|---|---|
| Spółki krajowe (limit) na końcu / maks. | 91–92 / 89–92 (cel 100–115 jest osiągany dopiero w grach 20-letnich) |
| Spółki łącznie (bez startupów) maks. | 100–101 |
| Rynki na końcu | GPW 91, PLU5 7, NETX 7 (rynki internetowe) — łącznie ≈ 14% spółek poza GPW |
| Poziomy spółek GPW na końcu | JUNK 19, BRONZE 23, SILVER 23, GOLD 26 |
| Startupy: debiut / porażka | 23 / 12 i 27 / 8 → **66–77% startupów debiutuje**; 2–4 „zaparkowane” przez pełną giełdę |
| Gdzie debiutują | 21–25 z 23–27 na GPW, reszta na rynki internetowe jako sponsorzy operatora |
| Kapitalizacja debiutu (mediana) | 56–66 tys. zł (zakres 33–230 tys.) |
| Kapitalizacja spółek GPW (zł) p5 / p10 / p25 / mediana / p75 | ≈ 5 tys. / 18–20 tys. / 90–350 tys. / 2–5 mln / 31–48 mln |
| Zysk roczny (4× kwartał) p5 / p10 / p25 / mediana | ≈ −5 tys. / 0,2–1 tys. / 7–20 tys. / 200–400 tys.; stratnych 3–8 spółek (3–8%) |
| Wolny obrót (udział akcji) p5 / p10 / p25 / mediana | 0,35–0,45 / 0,62 / 0,70 / 0,75–0,80 |
| Wiek (kwartały notowania) | spółki startowe 0 → rośnie z grą; debiutanci mają wiek 0 |
| Oszustwa: rozpoczęte / ujawnione w 27 kw. | 11 / 7 i 11 / 11 (≈ 1,9% spółek na rok), mediana 4–6 kw. do ujawnienia; wszystkie na GPW (poza jednym na PLU5) |
| Wycofania z wykupem (0.15.4 P5) | 0 w 6,5 roku (sufit 115 nieosiągany) |
| HHI sektorów wg kapitalizacji | 9 975–9 997 w sektorach ≥ 3 spółki — **miara bezużyteczna** (jedna spółka ma ≈ 99% kapitalizacji sektora, bo giganci ×100 większe od reszty). Do antymonopolu (E5) trzeba innej miary: udział w **przychodach sektora** albo w kapitalizacji całego rynku. |
| Kto inwestuje | 8 osobowości botów (`reckless`, `calm`, `whale`, `pro_investor`, `yolo_trader`, `market_maker`, `dividend_chaser`, `banker`), dostęp wg `ai.accessLevel` i poziomu giełdy spółki; fundusze botów (`aggressive`, `cautious`, `dividend`, `value`, `momentum`). Filtr „dostępnych akcji” jest w kilku miejscach `ai.js` / `player.js` — pojedynczy punkt wejścia dla ograniczeń NH do dopisania w E2. |

## 3. Proponowane progi i mnożniki (do wdrożenia w E1–E3)

Zasada: **wymóg wejścia GPW tak, by ok. 30–40% debiutów szło od razu na GPW, a reszta na NH**; spółki startowe (72) zostają bez zmian (migracja).

| Wymóg | GPW (baza, ×mnożnik 1,0–1,5) | NH (ok. 30%) | Giełda prywatna |
|---|---|---|---|
| Kapitalizacja | 80 tys. zł | 24 tys. zł | 5 tys. zł |
| Zysk roczny | > 0 (wynik netto 4 kw.) | brak dla innowacyjnych (sektory Biotech, Technologia, Gaming, Energia), reszta > −10% kapitalizacji | brak |
| Wiek notowania (awans NH → GPW) | ≥ 8 kw. | — | — |
| Wolny obrót | ≥ 30% | ≥ 20% | ≥ 10% |
| Utrzymanie (po 4 kw.) | kapitalizacja ≥ 50% wymogu wejścia (z mnożnikiem), inaczej NH | ≥ 50% wymogu NH, inaczej wycofanie z wykupem | — |

- **Mnożnik GPW:** 1,0 do 100 spółek krajowych, liniowo do 1,5 przy ≥ 125 (jak w planie).
- **NH (państwowy operator):** prowizja 0,10%, zmienność ×1,45, szansa upadku ×2,5, pojemność 40 spółek, minimalny popyt (market maker państwa) z `governmentTreasury`; boty `calm`, `banker`, `dividend_chaser` oraz fundusze `cautious`/`dividend` **nie** inwestują; gracz po odblokowaniu rynku (opłata licencji jak BRONZE).
- **Giełda prywatna:** szansa startu oszustwa ×5 względem GPW (0,8% → 4%/kw.), wykrycie przez audyt opóźnione (4–10 kw. zamiast 3–7), pojemność ≤ 10% spółek; limit portfela gracza przy wejściu: ≤ 20% bez ostrzeżenia.
- **Interwencje antymonopolowe:** próg wg przychodów sektora; poziom 1–3 = 60 / 50 / 40% udziału (kara 2–5% rocznego obrotu, potem nakaz podziału); 0–2 interwencje na 20 lat.

## 4. Pominięte w E0
- Czas kroku i zapis ×1 — niezmierzone.
- Próba tylko 2 gry (diagnoza); pomiar końcowy w E8 (≥ 20 gier).
- GIG w tej próbie 8% i 17% CAGR (rozrzut ≫ tolerancja); znany odziedziczony problem GIG (13,9% wobec 11,5%) nie jest tu naprawiany.
