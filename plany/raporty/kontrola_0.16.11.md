# Kontrola 0.16.11 „Świat startowy” (K0–K2, K4)

Gałąź `claude/impl-01611-3c96f1` (nie scalona, bez zmian w `zmiany-AI`/`main`). Testy: **884/884** (było 880; +4: klasyfikacja, symbole banków, zestaw krajowy, waluta bazowa). Zapis **v21**.

## Co zrobiono
- **K0** — `getCompanyOrigin`: 32 firmy PL (`PL_ORIGIN_SYMBOLS`), reszta UNI, WiS = DE, DMPC = US (przeniesione do `countries_data.js`: DE 14+3, US 16+4, nie ma ich już wśród firm polskich). Banki: BKINV1→SPR, BKINV3→RPK, BKCORP3→BPIG (`getBankSymbol`, `migrateLegacyBankSymbols` w `applySaveSnapshot`: klucze portfeli i pola symbol w całym zapisie).
- **K1 (mechanizm)** — `applyStartCountrySet` (`countries.js`): po wyborze kraju spoza PL rynek macierzysty traci firmy spoza zestawu UNI + kraj startu (przy DE/US/CZ: 32 polskie), a stają się spółkami zagranicznymi kraju **PL** (`COUNTRY_DEFS.PL` budowany z usuniętych firm, waluta PLN, bilet ok. 25 tys. przepustki × 5%; zapisywany w `countries.pl`). PL zostaje bez zmian. **Firmy niemieckie dodatkowe NIE są wdrożone**: propozycja do zatwierdzenia w `plany/propozycja_firm_niemieckich.md` (40 firm, 4 pytania do użytkownika).
- **K2** — waluta bazowa = waluta kraju startu (PL→PLN, DE→EUR, US→USD, CZ→CZK), `playerProfile.baseCurrency`, zapis v21 (stare zapisy = PLN). Model: wewnętrznie „jednostki gry” = waluta bazowa × skala (PLN 1, EUR 4, USD 4, CZK 0,2), więc wszystkie stałe zbalansowane w złotych działają bez zmian; `toPln`/`fromPln`/`getFxRate` liczą względem bazy (saldo waluty bazowej nie „pływa”, PLN jest zwykłą walutą w kantorze i na forexie), `formatZl`, `formatPLNShort`, pasek gotówki, kantor, okno gotówki, karty krajów i podgląd okresu dzielą przez skalę i podpisują walutą bazową.

## Pomiar (preset `fundusz-gig` / `start-XX`, 27 kw. ×200)
| Seria | n | GIG CAGR śr. ± odch. | Marża | Zapis (znaki) | ms/kw. | Niezmienniki / ujemna gotówka / JS |
|---|---|---|---|---|---|---|
| baza 0.16.9 (`d8be82c`), PL | 12 | 8,9% ± 3,9 | 21,1% | 2,34 mln | 1360 | 0 / 0 / 0 |
| 0.16.11, PL | 12 | 8,4% ± 4,3 | 21,6% | 2,33 mln | 1368 | 0 / 0 / 0 |
| 0.16.11, start DE | 12 | 10,6% ± 2,7 | 17,7% | 1,77 mln | 911 | 0 / 0 / 0 |
| 0.16.11, start US | 6 | 11,9% ± 3,0 | 20,4% | 1,67 mln | 991 | 0 / 0 / 0 |
| 0.16.11, start CZ | 6 | 11,7% ± 3,7 | 20,0% | 1,84 mln | 967 | 0 / 0 / 0 |

- **PL: GIG −0,5 pp względem 0.16.9** (ten sam preset i harness, n = 12 + 12; błąd różnicy ≈ 1,6 pp przy σ ≈ 4) — w granicach ±1 pp co do wartości, ale statystycznie nierozstrzygalne przy 12 grach; PL nie zmienił kodu ścieżki obliczeń (skala 1), więc różnica to szum.
- DE/US/CZ: GIG wyższy (10,6–11,9%) i marża niższa przy mniejszym rynku macierzystym (59 firm UNI zamiast ~91): nie skalibrowane (plan: ryzyko 2), wymaga osobnego pomiaru i zestawu firm DE po zatwierdzeniu.
- Zrzuty przeglądarki: start z DE w aplikacji (okno wyboru kraju → DE): pasek gotówki 2500,00 EUR, NAV 2,5000 EUR, ceny akcji w EUR, okno gotówki (mobile 375 px) z saldem EUR i wymianą na PLN; 59 firm UNI, 0 polskich, niezmienniki 0.

## Pominięte i problemy
1. **Nie wdrożono firm niemieckich** (czekają na zatwierdzenie nazw). Dziś przy starcie z DE rynek macierzysty to tylko 59 firm UNI + 17 firm DE jako rynek zagraniczny „domowy”; DE/US/CZ nie mają jeszcze dopracowanego zestawu (USA/CZ: ten sam mechanizm, bez własnych list).
2. **Literały „PLN/zł” w tekstach** (ok. 300 miejsc: opisy, maile, Akademia, `index.html`: np. „PLN całkowity”, „Konto prywatne: … PLN”, bony skarbowe, ceny w `market-kpi-row`) — poprawione tylko formatery, pasek, kantor, okno gotówki, karty krajów i podgląd okresu. Reszta nadal mówi o złotych; kwoty w nich są skalowane tylko tam, gdzie idą przez `formatZl`.
3. Progi giełd, opłaty i stałe są w jednostkach gry (skala), nie „okrągłe” w EUR/USD (np. 50 000 → 12 500 EUR).
4. Kursy i zmiany walut w UI (`getFxChange`, widełki kursu w kantorze, wykres) nadal opisane w złotych/surowo; przy bazie ≠ PLN zmiana PLN względem bazy nie jest pokazywana.
5. Polskie firmy po usunięciu z rynku macierzystego są lekkimi spółkami zagranicznymi (bez pełnego modelu, państwowe w sektorze „kind: state” wg `stateOwnershipPct`); bank BPIG z puli banków może pojawić się ponownie przez IPO banku (nie przetestowane); GIG/SIG20 i reżim `home` nadal polskie (to K3).
6. **K3 (społeczeństwo, polityka, kryzysy kraju startowego) nie ruszone** — zakres XL (jak 0.13), zostaje na osobną wersję. Rynek macierzysty, partie, NBP/KNF pozostają polskie.
7. Stare zapisy z startem z DE/US/CZ (v19–v20) wczytują się jako PLN z polskimi firmami (zgodnie z decyzją „stare zapisy = PL/PLN”).
8. Do potwierdzenia: seria PL ×12 + baza ×12 nie rozstrzyga ±1 pp (wymagane ≥ 24 + 24 jak w 0.16.9); US/CZ tylko 6 gier.
