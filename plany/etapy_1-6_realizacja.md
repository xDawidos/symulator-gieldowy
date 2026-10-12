# Etapy 1–6: budownictwo i R&D — realizacja

Testy: otwórz `tests/tests.html` przez lokalny serwer (np. `python -m http.server 8765`, potem
`http://127.0.0.1:8765/tests/tests.html`). Testy działają na własnych spółkach, z kontrolowanym
losowaniem, i nie nadpisują zapisu gracza.

## Zasady księgowe (wspólne)
- Gotówka spółki zmienia się tylko przez `adjustCompanyCash` (gameCore.js) — rachunek w banku porusza się razem z nią.
- Każda płatność trafia do `paymentJournal` (ostatnie 400 wpisów) i `paymentTotals` (sumy bez limitu).
  Odbiorcy spoza modelu mają prefiks `external:` (dostawcy, usługi badawcze, kredyt bez banku).
- Pozycje rozliczone w chwili zdarzenia (R&D, kontrakty, nieruchomości, koszty inwestycji) czekają w
  `company.periodLedger` / `research.ledger`. Raport kwartalny je tylko pokazuje (`lastReportBreakdown`),
  nie zmienia drugi raz gotówki ani aktywów. Gotówkę w raporcie zmienia wyłącznie wynik operacyjny.

## R&D
- Opłata startowa i utrzymanie: `recordResearchExpense` (rodzaj, technologia, kwota, ID płatności; brak kapitalizacji).
- Wstrzymanie zachowuje postęp; wznowienie pobiera tylko utrzymanie.
- Inwestycje bankowe: osobna ścieżka (`processBankInvestmentResume`).

## Kontrakty budowlane
- Depozyt zamawiającego (escrow), zaliczka 20%, płatności za etapy 25/50/75%, reszta przy odbiorze.
- Wykonawca: zaliczki = zobowiązanie, koszty = produkcja w toku, wynik dopiero przy odbiorze/anulowaniu.
  Brak gotówki → kredyt obrotowy; brak finansowania przez 6 tygodni → zerwanie z winy wykonawcy.
- Kara (0,5%/dzień, maks. 10%) płaci wykonawca, premia (maks. 3%) płaci zamawiający. Opóźnienia
  zewnętrzne i zmiany zamówienia wydłużają termin.
- Anulowanie: wina zamawiającego / brak winy / wina wykonawcy — różne rozliczenia, niedokończony obiekt
  trafia do zamawiającego wg kwoty faktycznie zatrzymanej przez wykonawcę.
- Budynek: `purchasePrice`, `bookValue` (= koszt), `marketValue` (szacunek, poza bilansem).
- Podwykonawcy: przypisani do projektu, wynagrodzenie w kosztach kontraktu, zwalniani po zakończeniu.
- Konsorcja: wyłączone (brak modelu podziału kosztów i odpowiedzialności).

## Katalog
- `INVESTMENT_CLASSIFICATION` (companies.js) — jawny rodzaj każdej pozycji; `mixed` = etap budowlany
  w przetargu + etap wyposażenia realizowany przez spółkę po odbiorze.
- Czas w katalogu: dni (1 dzień = 1/7 tygodnia gry).
- `getConstructionCatalogForCompany` — wszystkie sektory spółki, bez duplikatów, wg poziomu działu rozwoju.

## Zapis (save.js, format v2)
- Spółki przez symbol, referencje `{__stockRef}`, walidacja, odtworzenie mocy, brak postępu offline.
- Zapis v1 jest oznaczony jako niezgodny (nie jest kasowany). `resetSavedGame()` w konsoli usuwa zapis.

## Do następnego bloku (koniunktura i ceny)
- `EXCHANGE_BASE_EARNINGS` było niezdefiniowane (raport kwartalny się wywracał) — dodane wartości robocze do kalibracji.
- Podatek miejski 2–3% gotówki tygodniowo jest bardzo wysoki w stosunku do reszty gospodarki.
- Pełny system zleceń niebudowlanych (państwo, firmy prywatne) — rodzaje pozycji są już rozdzielone.
