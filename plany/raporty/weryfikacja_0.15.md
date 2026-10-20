# Weryfikacja 0.15 „Hossa i bessa” (2026-10-20)

- **Sprawdzony kod:** `zmiany-AI` = `a2fb29d` (32 commity z GitHuba: redesign 0.14.5 P3–P6, 0.15 H0–H6, zapis v15).
- **Metoda:**
  - porównanie planu `plan_0.15_hossa_bessa.md` z kodem (grep i czytanie);
  - przegląd nowego kodu logiki (`git diff 7995e03..a2fb29d`, ok. 2,1 tys. linii w `core.js`, `companies.js`, `ai.js`, `finance.js`, `events.js` i więcej w `player.js`, `state.js`, `learning.js`);
  - testy `tests/tests.html` i `tests/test_h3_bubbles.html`;
  - przebiegi `tests/przebiegi.html` ×200:
    - 6 gier po 6,5 roku bez presetu (`v015`);
    - 4 gry z presetem `fundusz-gig` (`v015fg`);
    - 1 gra 20-letnia (`v015long`).
- **Werdykt:** **działa i jest stabilne technicznie, ale ma 3 błędy w krachu i margin callu, 1 brak z planu i 2 duże problemy balansu.** Do naprawy przed 0.15.1.

## Testy

| Zestaw | Wynik |
|---|---|
| `tests/tests.html` | **492/492** |
| `tests/test_h3_bubbles.html` (30 baniek) | szczyt premii: średnio +48%, mediana +41% (zakres 28–92%); dołek po pęknięciu: średnio −30%; cały cykl: średnio 11,6 kw. (5–19) |

## Plan → kod

| Część | Stan |
|---|---|
| H0 pomiar, H1a (GIG ważony kapitalizacją z limitem 10%, TIG5, SIG20), H1b (jednorożce, gasnące gwiazdy, wschodzące gwiazdy) | ✅ |
| H1c kara makro z połową niedoboru GIG | ✅ w kodzie, ❌ cel niespełniony (niżej) |
| H2a fazy, premia × beta na kursie (`marketRegimeMultiplier`), wyprzedzanie gospodarki (25%) | ✅ |
| H2b potwierdzanie faz i retrospektywa („za nami”), strach i chciwość, Analityk Indeksowy L4/L5, okno „Rynek” | ✅ |
| H3 bańki sektorowe (4 typy, rozlewanie) | ✅ |
| H4 krach, `marketCrash.theme`, `applySectorShock`, margin call | ✅ w kodzie, ⚠️ błędy B1–B3 |
| H4b bezpieczniki, nadzwyczajne cięcie stóp (70/30%), KNF i dźwignia botów | ✅, ⚠️ B1 |
| H5a boty, H5b klienci (Strachliwy, Spryciarz, „moda na akcje”, limit paniki), H5c okno IPO (premia, odkładanie debiutu przy strachu < 25), etapy M&A | ✅ |
| H5c **emisje akcji spółek wg nastroju** (premia > +15% → emisje ×1,5, ×2 w bańce) | ❌ **brak w kodzie** |
| H5 okna emisyjne funduszu i lock-up | ➡️ przeniesione do planu 0.15.2 (świadomie) |
| H6 Akademia, Mentor, osiągnięcia, pasek newsów, retrospektywa | ✅ |
| Zapis v15 z migracją | ✅ (zapis i wczytanie bez strat w każdym przebiegu) |
| Poza planem | Megaprojekt SMSR (`state.js`), twardy windykator, bot „Komendant Jakub”, nowe typy klientów Emeryt i Nowoczesny |

## Błędy w nowym kodzie

| # | Gdzie | Błąd | Skutek | Naprawa |
|---|---|---|---|---|
| **B1** | `core.js` `isMarketHalted`, `triggerMarketHalt`, `getMarketHaltRemainingSeconds` | Bezpiecznik liczy czas zegarem **rzeczywistym** (`Date.now()`), a nie zegarem gry (`getGameClockMs()` z 0.14 T0). Do tego 3. stopień trwa 60 s zamiast „do końca tygodnia gry”. | Przy prędkości ×50 15 s wstrzymania to ok. 2,5 kwartału gry, a przy ×1 15 s. Pauza gry nie zatrzymuje odliczania. Po wczytaniu zapisu znacznik czasu nie ma sensu. | `untilGameMs = getGameClockMs() + sek × 1000` i porównanie z `getGameClockMs()`; stopień 3 do końca bieżącego tygodnia gry. |
| **B2** | `core.js` `executeMarginCalls` | `Number(ai.portfolio[symbol])`, a pozycja bota to obiekt `{ shares, avgPrice }`, więc wynik to `NaN` → 0. | **Margin call botów nigdy nic nie sprzedaje.** H4 „margin call pogłębia krach” nie działa. | `ai.portfolio[symbol]?.shares`, z uwzględnieniem `lockedShares` (aiSellStock i tak je pilnuje). |
| **B3** | `core.js` `checkPlayerMarginCall` | (a) „Uzupełnienie depozytu” zabiera gotówkę funduszu, ale **nie zmniejsza długu**, więc pieniądze znikają. (b) Likwidacja odejmuje akcje z `playerPortfolio`, ale **nie zmienia `stock.sharesHeld`** (niezmiennik „akcje = posiadacze”), ignoruje akcje w zastawie (`lockedShares`), nie ma wpływu na kurs ani płatności. | Utrata pieniędzy gracza; rozjazd rejestru akcji; sprzedaż akcji zastawionych w lombardzie. | Użyć istniejącej `forceLiquidation(amountNeeded)` (`player.js`) i spłacić z wpływów pożyczki lombardowe; wpis w dzienniku i poczcie. |
| **B4** | `ai.js` (twardy windykator, `processAiLoansWeekly`) | Zajęcie akcji dłużnika `h.shares -= sharesToSeize` bez uwzględnienia `lockedShares`. | Ostrzeżenie „zastaw > posiadanych” (bot Bankier, BPN) w przebiegu `v015` #1. | Zajmować tylko `shares − lockedShares`. |
| B5 | `core.js` `applySectorShock` | Dodaje premię sektora na stałe; `durationQuarters` nieużywane, a `updateAllSectorPremiums` i tak nadpisuje `stock.sectorPremium` przy następnej aktualizacji. | Dziś bez skutków (nikt jej nie woła), ale **0.15.3 Kryzysy** ma na niej stać. | Przy 0.15.3: szok jako osobny stan z czasem trwania, dodawany w `updateAllSectorPremiums`. |
| B6 | `ai.js` bot „Komendant Jakub” | „Państwowa dopłata” `ai.cash += subsidy` bez zmniejszenia `governmentTreasury`. | Pieniądze znikąd (małe kwoty). | Pobierać ze skarbu albo usunąć dopłatę. |

## Przebiegi

| Miara | Cel planu | `v015` (6,5 roku) | `v015long` (20 lat) |
|---|---|---|---|
| GIG rocznie | 8–10% (mediana 20 lat) | 6,7 / 11,4 / **−9,5** / 8,8 / 8,3 / **21,8** → mediana **8,6%**, ogromny rozrzut | **12,7%** |
| Zysk na akcję (mediana spółek) | 8–11% | 4,9–8,1% (mediana ok. 7%) ❌ | 7,4% ❌ |
| C/Z rynku (mediana) | bez trendu (±1 pp/rok) | 15,9→11,8; 15,6→9,5; **14,5→5,0**; 15,9→14,2; 14,7→10,5; 13,9→**26,4** (spada w 5 z 6 gier) | 14,9→11,8 |
| Niezmienniki, błędy, ujemna gotówka, złe ceny, ostrzeżenia pieniędzy | 0 | 0 (poza B4 w 1 przebiegu) | 0 |
| Zapis | bez strat | zwykły poziom, wczytanie bez strat | 3,1 mln znaków, gzip 630 KB, wczytanie bez strat |
| Dymki | ≤ 3/min, rutynowe w pasku | 9–23 dymki, 81–104 newsy w pasku ✅ | — |

**Fazy rynku (gra 20-letnia, historia od najnowszej):** bear −17 · bull +10 · accumulation −7 · capitulation* −11 · bear −3 · distribution +16 · euphoria +20 · bull +8 · accumulation −9 · capitulation* −19 · bear −14 · distribution −15 · bull −22 · accumulation −22 · capitulation* −22 · bear −22 · bull +4 · accumulation −1 (liczby to premia rynku w % przy wejściu w fazę, * = faza potwierdzona wstecz). Cykle wyglądają naturalnie. Były 2 krachy (bull → bear bez dystrybucji), 1 bańka (półprzewodniki) oraz jednorożce i gasnące gwiazdy w obiegu.

### Problemy balansu

> **Korekta (2026-10-20, pomiar w czacie planowania 0.15.x, `plan_0.15.0.1`):** problem 1 (ujemna premia i spadek C/Z) to **skutek błędu B1**. W przebiegach ×200 bezpiecznik liczony zegarem rzeczywistym zamrażał kursy przez ok. 52% gry. Po naprawie B1 premia średnio −0,6% (20 lat: +0,1%), a C/Z zmienia się o −0,2 pp/rok, czyli w celu. Problem 2 (odpływ funduszu = GIG, ok. −21%/rok) zostaje. Doszedł nowy błąd **B7**: nadpisywanie `const value` dla klienta Funkcjonariusz w `processClientsWeekly`; wyjątek przerywa pętlę klientów.

1. **Premia rynku jest średnio ujemna, przez co C/Z rynku spada przez całą grę.**
   - Średnia premia przy wejściu w fazy to ok. −9%.
   - Plan zakłada, że średni cel ważony czasem ≈ 0.
   - C/Z mediana spada o 1–1,5 pp rocznie, a w jednej grze z 14,5 do 5,0, z GIG −9,5% rocznie mimo wzrostu zysków o 7,8%.

   Skutek: rynek po kilku latach jest trwale „tani”, a GIG zależy od tego, czy gra trafi na długą bessę.
   - **Przyczyna do potwierdzenia:** asymetria celów premii (Bessa −10…−25%, Kapitulacja −30…−35% przeciw Hossie 0…+15%), do tego krach (−25…−35 pp), a powrót premii do 0 jest tylko 25% na kwartał.
   - **Cel:** średnia premia ważona czasem w 20 latach w przedziale −3…+3%, a C/Z bez trendu.
2. **Fundusz = GIG traci 20–34% udziałów rocznie** (cel H1c: −3…+3%).
   - Ścieżki udziałów z 4 gier: 1000 → 75 / 250 / 243 / 211.
   - Zaufanie trzyma się 55–60, ale w bessie klienci wycofują 40–65% udziałów w 2 kwartały, głównie z przyczyn „📉 wynik gorszy od GIG” i „🎢 obsunięcie” (fundusz = GIG ma wynik słabszy od GIG o opłatę i gotówkę).
   - **Limitu „panika ≤ 8% udziałów na kw.” w kodzie nie ma.** Jest tylko tygodniowy limit wszystkich umorzeń `MAX_WEEKLY_REDEMPTION_SHARE = 0,15` (`player.js`), który w kwartale pozwala oddać praktycznie cały fundusz.
   - Raport autora (`sim_015_final.json`) mierzył tylko grę bez presetu (gracz bierny), więc celu H1c nie sprawdził.

## Zalecenie

Przed 0.15.1 krótka poprawka **0.15.0.1**:
- B1–B4 i B6;
- emisje akcji spółek według nastroju (brak z H5c);
- naprawa ujemnego dryfu premii;
- naprawa odpływu udziałów funduszu = GIG, z limitem łącznego odpływu na kwartał.

Pomiar na ≥ 20 grach z presetami `fundusz-gig` i bez presetu oraz na 5 grach 20-letnich.
