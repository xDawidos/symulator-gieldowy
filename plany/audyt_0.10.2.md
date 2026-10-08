# Audyt 0.10.2 — notatki zebrane w trakcie M1–M3

Zapisuję tu znaleziska do części A1–A4 (pełny audyt po M6).

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
