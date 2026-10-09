# Audyt 0.10.2

## A2 — martwy kod i stuby (commit 61ca111)
- Skan: brak zdublowanych funkcji, brak zdublowanych id w HTML, brak wywołań niezdefiniowanych funkcji.
- Usunięto 17 nieużywanych funkcji (m.in. okna bez elementów w HTML: `openStockDetailModal`, `displayEventLog`).
- `triggerResearchEvent` był pustym stubem wywoływanym w 5% cykli zdarzeń — teraz działające zdarzenia R&D.
- Panel Analityka Dywidend nie miał przycisku — przywrócony (zakładki giełd, po szkoleniu).

## A1 — przepływy pieniędzy i akcji
Narzędzie: `getTrackedHeldShares` / `reconcileSharesHeld` + nowe niezmienniki w `checkWorldInvariants`
(akcje w obrocie = suma posiadaczy, ujemna gotówka spółek). Uzgadnianie przy wczytaniu i co kwartał.

Znalezione i naprawione:
1. Dywidendy nie trafiały do banków, holdingów, pakietów spółek, ETF-ów, miasta i Skarbu Państwa — pieniądze znikały. `payDividendToInstitutions`.
2. Usuwana spółka (przejęcie, bankructwo) zostawiała swoje pakiety jako „wiszące” akcje — teraz przechodzą na przejmującego albo wracają do obrotu (`releaseCompanyStakes`).
3. Skarb Państwa kupował mniejszościowe pakiety za darmo i liczył je podwójnie (w obrocie i w pakiecie państwa); nadpisywał też udział zamiast go zwiększać. Teraz płaci z budżetu, pakiet poza obrotem.
4. Pakiet państwa w spółkach niepaństwowych nie był wyłączany z wolnego obrotu.
5. Spółki państwowe tworzone z pakietem państwa liczonym jednocześnie w obrocie.
6. Holding przy dokupie nadpisywał pakiet (gubił wcześniejsze akcje).
7. Sprzedaż części spółki zależnej nie zmniejszała pakietu matki.
8. Nowa spółka zależna z giełdy elitarnej: pakiet matki nie był zapisany.
9. Fundacja FPM: 100% akcji jako „anonimowi posiadacze” → pakiet założycielski (insiderzy).
10. Banki płaciły odsetki od depozytów spółek, nic na nich nie zarabiając — duże banki traciły dziesiątki mln zł na kwartał i bankrutowały. Teraz lokują wolne depozyty w bonach (stopa BC + 0,5 pkt), a lokaty firmowe mają 60% stopy depozytowej.
11. Projekty specjalne: wykonawca dostaje 8% wpłat konsorcjum jako przychód.

Wynik: 13 kwartałów gry ×50 bez korekt uzgadniania, bez ujemnej gotówki i NaN; banki wypłacalne.

Zostaje (do decyzji / A4):
- `acquireWeakerSubsidiary`: matka płaci za 51%, ale udział jest tylko jako `parentStakePct` (bez akcji w rejestrze); dywidenda spółki zależnej trafia w całości do matki.
- Modyfikator reputacji przy dywidendzie dla gracza (×1,05 / ×0,8) tworzy lub zabiera drobne kwoty.
- `bank.cash` w modelu to suma przepływów klientów (miliardy) — wymaga przemyślenia przy większej przebudowie banków.

## Notatki zebrane w trakcie M1–M3

## Naprawione przy okazji M2/M3 (stare błędy psujące ceny)
- `applyPriceEffect` mnożył zmienność spółki ×1,1 przy każdym zdarzeniu, bez limitu → zmienność rosła do tysięcy, kursy zapadały się do 0,01 zł. Teraz ×1,05, najwyżej 2× zmienności bazowej.
- Debiut startupu: „IPO boost” liczony w czasie rzeczywistym (przy ×50 trwał 50× dłużej) i mnożony przez nieograniczoną zmienność → ceny rzędu 10^10 zł. Teraz czas gry i zmienność ograniczona do 3.
- Debiut startupu bez bilansu (aktywa 0) → wartość godziwa ≈ 0, kurs ściągany do zera. Teraz bilans z zebranego kapitału.
- Instytuty badawcze: stała kwota do ceny co ~10 ticków oraz składane zmienność/kondycja → nieograniczony wzrost. Teraz procentowy dryf i stałe modyfikatory.
- Odcięcie dywidendy obniżało kurs o pełną dywidendę na akcję (przy tanich akcjach do 0,01 zł). Teraz najwyżej −10%.
- `checkForPotentialMA`: holding bez `specializationSectors` rzucał wyjątek.
- `sellEtf` odwoływał się do niezdefiniowanej zmiennej (sprzedaż ETF nie działała) — przepisane w etf.js.

## Do sprawdzenia w A4 (balans)
- Mediana cena / wartość godziwa waha się 0,56–1,18 w ciągu 13 kwartałów — rynek dość nerwowy. Do strojenia: siła powrotu do wartości godziwej, siła zdarzeń.
- Polityki dywidendowe „Pełna (100%)” i „Wysoka” systematycznie trzymają kurs poniżej wartości godziwej (wypłata obniża kurs, a wycena z zysku nie).
- Akcje groszowe z Giełdy Śmieciowej (KFX, WZM, SIX) spadają do zera.
- Bank po debiucie (BKNET1) ma wartość godziwą bliską zera (cena / wartość ≈ 50 000).
- PKB r/r w ekspansji ~7% (model cyklu).
- Liczba arystokratów dywidendowych (~20–40% spółek po 13 kwartałach) — być może za łatwo.

## Notatki z M4–M6
- Projekty specjalne: wkłady uczestników wychodzą z gotówki (aktywa bez zmian), ale nikt ich nie otrzymuje — wykonawca nie dostaje przychodu z budowy. Do rozważenia w A1: przychód wykonawcy.
- `aiBuyStock`: wpływ na cenę liniowy w liczbie akcji (`price += quantity × price × 0.000005`) — duże zakupy botów (np. wrogi bot skupujący pakiet) mogą mocno podbić kurs. Do A4.
- Prowizje operatorów pobierane od funduszu i botów; banki inwestycyjne i ETF-y handlują bez prowizji.
- Relacje: koledzy z firmy nie reagują jeszcze na wyniki gracza (tylko nadzór, konsolidacja, zamiana stanowisk, prezenty).
