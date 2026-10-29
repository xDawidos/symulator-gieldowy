# Plan 0.19.2 „Multikulturalizm” (szkic zakresu; po 0.19.1 „Polityka 2”)

Źródło: zgłoszenie użytkownika z 2026-10-29: aktualizacja dodająca „favour” (przychylność polityczną) dla państw innych niż Polska. Dziś mechanika przychylności istnieje tylko dla Polski: `macro.election.favor` (`core.js` ~5026–5092: `getPoliticalFavor`, `settlePoliticalFavor`, `POLITICAL_FAVOR_QUARTERS` = 8 kwartałów, po wyborach ze znakiem ±1 zależnie od wygranej partii, której fundusz dawał darowizny) oraz `favors` firm, które kupiły przychylność (`companies.js`). Wpływ: m.in. szansa na zlecenia i ruchy spółek państwowych (`companies.js` ~9735).

## Cel

Gracz może budować przychylność również w innych państwach (kraje z 0.16.2–0.16.11): partia rządząca, wybory, darowizny i lobbing wpływają na spółki państwowe, regulatorów, cła, przetargi i przejęcia w danym kraju. Gra przestaje być „polska z dodatkowymi rynkami”, a staje się światem o różnych układach politycznych.

## Zakres roboczy (do uzgodnienia z użytkownikiem przed startem)

1. **Przychylność per kraj:** wspólny model `countryFavor[kraj]` (znak, kwartały, poziom) zamiast jednej polskiej `macro.election.favor`; Polska jest jednym z krajów (migracja zapisu).
2. **Źródła przychylności:** darowizny dla partii (z 0.19.1), lobbing, sponsoring, relacje z politykami (z rozmów 0.17.3), nepotyzm (0.19.1, poziomy), obecność inwestycji w kraju (np. superprojekty, spółki zależne).
3. **Skutki:** szansa na przetargi i zlecenia państwowe, ceny przejęć spółek państwowych, pobłażliwość nadzoru (BaFin, SEC…), cła i ulgi, ryzyko afery (korupcja ujawniona = utrata przychylności i kara).
4. **Wybory w innych krajach:** uproszczona symulacja państw z 0.19.1 (decyzja 4), cykle wyborcze, programy partii, reakcje rynku; kraj startowy z S0/0.16.11 ma pełną politykę, pozostałe uproszczoną.
5. **Interfejs:** karta kraju z partią rządzącą, programem i poziomem przychylności; panel sponsoringu/lobbingu (jak w zleceniu 0.19.1); makiety wg konwencji z `plany/design/stitch/`.
6. **Testy i kontrola:** niezmienniki, kalibracja GIG ±1 pp, limit eventów (≤ 3 maile na kwartał, jak 0.13), brak wpływu przychylności na rdzeń NAV poza opisanymi kanałami.

## Otwarte pytania

1. Czy „favour” oznacza wyłącznie przychylność polityczną po wyborach (jak dziś), czy także szerszą „przychylność kulturową” (opinia publiczna kraju o funduszu, wpływ na turystykę i klientów)? Nazwa „Multikulturalizm” sugeruje drugie; domyślnie: polityczna + opinia publiczna kraju jako osobne wskaźniki.
2. Czy darowizny w obcych krajach są legalne (regulacje, ryzyko afery per kraj)?
3. Czy zaczynamy od krajów z pełnymi danymi (DE/US/CZ) i dopiero potem Azja?
4. Zależność od 0.19.1 (Polityka 2) i 0.17.3 (Rozmowy): wspólne wskaźniki relacji.
