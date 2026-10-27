# Audyt przepływów pieniędzy w inkubatorze (0.14.1 R0)

- **Data:** 2026-10-14
- **Stan kodu:** `zmiany-AI` po 0.14 T3 (`0be33e4`) + narzędzia R0 (księga puli, niezmienniki).
- **Metoda:** przegląd kodu wszystkich ścieżek życia startupu × źródeł wkładu oraz 4 przebiegi ×200 (26 kw.) z presetem „gracz-pula”: gracz co kwartał wpłaca do puli i inwestuje bezpośrednio w 1 startup.

## Narzędzia (R0)

- **Księga puli** (`investmentPool.ledger`), osobno dla każdego uczestnika: wpłaty, wypłaty, zamiana na akcje, zwroty, straty, opłaty. Prowadzona od nowej gry; w starym zapisie od chwili wczytania, ze stanem otwarcia z faktów.
- **Niezmiennik puli:** wpłaty − wypłaty − opłaty zapłacone + opłaty otrzymane = niezainwestowane + w startupach + na akcje + straty. Dodatkowo suma wkładów = środki puli.
- **Niezmiennik inkubatora** (dla każdego startupu): suma roszczeń ≈ zebrane − wpłaty bez roszczeń + dopłata przed debiutem + ratunek + premia prywatyzacji.
  - Wpłaty bez roszczeń to drobni inwestorzy z zewnątrz i anioł biznesu. Ich część trafia przy debiucie do wolnego obrotu; tak działa gra z założenia.
- Oba niezmienniki trafiają do `checkWorldInvariants()` jako **ostrzeżenia**.

## Ścieżka × źródło (stan przed R1)

| Ścieżka | Fundusz gracza (bezpośrednio, w tym auto-inwestowanie i oferty) | Pula: gracz i boty | Boty | Fundusze kolegów | Banki | Anioł biznesu / drobni inwestorzy | Dopłata przed debiutem |
|---|---|---|---|---|---|---|---|
| Debiut | ✅ akcje | ✅ akcje (proporcjonalnie) | ✅ | ✅ | ✅ | ✅ bez roszczenia (wolny obrót) | ✅ (w roszczeniu funduszu) |
| Debiut po oczekiwaniu na miejsce | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Przejęcie po oczekiwaniu (105–200%) | ✅ zwrot | ❌ **0 (błąd A′)** | ✅ zwrot | ✅ zwrot | ❌ **0 (F1)** | — | ✅ (w roszczeniu) |
| Oszustwo (0%) | ✅ 0 / ubezpieczenie 75% | ❌ bez komunikatu (A) | ✅ 0 | ✅ 0 | ✅ 0 (bez komunikatu) | — | ✅ |
| Porażka (50–70%, 5–15%, 0%) | ✅ zwrot | ❌ **0 (A)** | ✅ | ✅ | ❌ **0 (F1)** | — | ✅ |
| Opóźnienie → sukces / porażka | ✅ jak wyżej | ✅ / ❌ (A) | ✅ | ✅ | ✅ / ❌ (F1) | — | ✅ |
| Komplikacje → ratunek (debiut) | ✅ (ratunek = roszczenie) | ✅ | ✅ (ratunek botów = roszczenie) | ✅ | ✅ | — | ✅ |
| Komplikacje → upadek (5–15%) | ✅ | ❌ **0 (A)** | ✅ | ✅ | ❌ **0 (F1)** | — | ✅ |
| Prywatyzacja (Anioł Biznesu 5) | ✅ wykup 120% | ⚠️ zwrot 100% od razu na konto, z pominięciem puli (F3) | ✅ zwrot 100% | ✅ zwrot 100% | ✅ zwrot 100% | — (wpłaty bez roszczeń zastąpione wykupem) | ✅ |
| Startup operatora rynku (D1) | ✅ (gwarantowany debiut) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ubezpieczenie | ✅ 75% (tylko fundusz, na konkretny startup) | — nie obejmuje puli (zgodnie z planem) | — | — | — | — | — |

## Wynik przebiegów (4 × 26 kw., preset gracz-pula)

- **Niezmiennik puli:** rozjazd w każdym przebiegu, od kw. 4–11. Dotyczy gracza (np. 1370 vs 954 zł, 1683 vs 855 zł) i bota `ai5` (do ok. 3000 zł). To straty wkładu puli przy końcu startupu bez debiutu — błąd A.
- **Martwy „Wkład w pulę”** (błąd E): na końcu przebiegu 528–1105 zł w `playerStakes.player` przy 0 zł niezainwestowanych i 0 zł w startupach. Blokuje limit 10% aktywów na startupy.
- **Niezmiennik inkubatora:** czysty po uwzględnieniu wpłat bez roszczeń.

## Błędy i decyzje

| # | Błąd | Naprawa |
|---|---|---|
| A, A′ | `removeStartup` pomija `poolInvestors` (także przejęcie po oczekiwaniu) | R1 |
| B | Pula poza NAV | R2 |
| C | Brak wycofania i statusu | R3 |
| D | Słaba widoczność | R4 |
| E | `playerStakes` nie maleje | R1 (wyliczane z faktów) |
| **F1 (nowy)** | `removeStartup` kasuje wkład **banków** bez zwrotu, także przy przejęciu 105–200%. Błąd tego samego rodzaju co A (brak rozliczenia, nie zmiana zasad). | R1: banki jak pozostali inwestorzy |
| F2 (z założenia) | Oferty specjalne: „zniżka” i „bonus udziałów” zapisują roszczenie wyższe od zapłaconej kwoty. Niezmiennik inkubatora się zgadza, bo `currentFunding` rośnie o tę samą kwotę. | bez zmian (zasada oferty) |
| F3 | Prywatyzacja: zwrot dla uczestników puli od razu na konto (gracz) albo do bota, z pominięciem puli | R1: zwrot do puli jako niezainwestowane środki (jak w planie) |
