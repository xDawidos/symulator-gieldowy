# Kontrola 0.16.6 „Domknięcie”

Stan: S1 (bez S0), S2, S4, S5 zrobione; S3 (pomiar) poniżej. Testy 841/841 (`node plany/design/narzedzia/run_tests.mjs`, 14 nowych w grupie „0.16.6 Domknięcie”). Gałąź `claude/impl-0166-a38931`, niescalona. Zapis bez zmiany wersji (nowe pola opcjonalne: `oversight.hidden`, `exchangeLinks.goldenQ`, `oversightResale` w spółce obcej).

## Zrobione
- **S2:** szpital, kampus, centrum po ukończeniu = spółki państwowe SZK/KTE/CWE na GPW (od razu, 100 tys. akcji, Skarb 80%, kapitalizacja ≈ koszt, dywidenda do skarbu, sektory z projektu). Liczone do spółek krajowych, ale powstają także przy pełnym limicie (decyzja przy wdrożeniu). Blokada: spółka państwowa nie przechodzi poza GPW (`isStateGpwOnly` w `moveStockToMarket`, `moveListing`, cel zagranicznego przejęcia; wyłączność i wycofanie były już zablokowane). Spółki miejskie startują na NH i mogą tylko awansować na GPW.
- **S4:** strona „Startupy”: karty zamiast tabeli (plakietka etapu z ikoną i tekstem, drabinka Zbiórka → Rozwój → Rynek, % przy paskach, widoczny znacznik podejrzenia oszustwa, etykiety pól, pula w trzech sekcjach). Problemy z zrzutów: brak wskaźnika etapu, przyciski i pola wychodzące z komórki, oszustwo tylko w `title`, puste paski bez wartości, goły tekst puli, ucięty placeholder, brak układu na wąskim ekranie. Sprawdzone w przeglądarce (szeroki i 375 px, brak błędów konsoli); mechanika bez zmian.
- **S5:** TeamedUP! wg makiety Stitcha: karty kontaktów (awatar, rola, kropka nieprzeczytanej, Enter/Spacja), rozmowa w dymku, zadania jako karty ze stanem i paskiem (`role=progressbar`), wąski ekran. Kanały, czat i dokumenty z makiety nie istnieją w grze i nie dodano ich.
- **S1.3 złota akcja:** Gutzwiller wetuje połączenie „merged” z CH, najwyżej raz na 12 kw. (`LINK_RULES.goldenShareGapQ`, `exchangeLinks.goldenQ`).
- **S1.4 Bayer:** `bayerFxTrade` — do 15% najcenniejszej waluty zamieniane na najtańszą względem średniej; `applyFxFlow` przesuwa kursy o kwota/5 mln zł, najwyżej ±1% (test), widoczne w historii. Faktyczne przesunięcie przy kapitale Bayera ≈ 0,2%.
- **S1.5 Wilk:** kredyt (`aiTakeLoan`) na 50% gotówki przed pierwszym zakupem; odmowa banku nie blokuje cyklu.
- **S1.2 akcje obce:** `getIssuerHolders`/`getIssuerStake` (wspólny widok posiadaczy), kupno ponad próg wezwania po potwierdzeniu w oknie gry → drabina: ostrzeżenie, kara 2% wartości nadwyżki i −3 zaufania, nakaz odsprzedaży po 2 kw. (nadzór sprzedaje nadwyżkę). Licznik przewinień wspólny z KNF.
- **S1.1 Waschmabank:** rachunek liczy się do majątku i NAV (zmiana NAV = tylko widoczne prowizje 5% wpłata / 1% wypłata); poza zasięgiem kar, rekwizycji i podstawy kary KNF (tylko gotówka na koncie); wykrycie 3%/kw. × uwaga KNF albo „Swiss Leaks” → konfiskata całości, przewinienie, −10 zaufania, mail i news. Wypłata awaryjna w `forceLiquidation` (umorzenia). 6 osobnych testów niezmienników NAV. Karta w Kantory24 (rynek CH).
- **Bez zmian / już zrobione:** połączenia giełd ×3 po lotnisku/porcie (`hasLinkInfrastructure`, 0.16.3) — nie dublowane; waluta wariantu B tylko fabuła; „siła inwestorów mniejszościowych” usunięta z planu.

## Pomiar (przebiegi ×200, 20 gier × 27 kw., kod nowy vs baza `fc159e4` = 0.16.5, ten sam harness, równolegle)
| Seria | GIG CAGR średnia ± odch. (mediana) | z przejęciem naszej giełdy | bez przejęcia | Marża | Zapis | Czas kroku | Niezmienniki / ujemna gotówka / wyjątki |
|---|---|---|---|---|---|---|---|
| baza 0.16.5 | 10,2% ± 3,9 (10,3) | 10,8 ± 3,8 (n=11) | 9,4 ± 4,1 (n=9) | 21,3% | 2,26 mln | 1144 ms | 0 / 0 / 0 |
| 0.16.6 | 8,7% ± 5,1 (7,1) | 8,4 ± 5,6 (n=7) | 8,8 ± 5,0 (n=13) | 22,0% | 2,28 mln | 1162 ms | 0 / 0 / 0 |
- **GIG: −1,5 pp (średnia), cel ±1 pp NIE spełniony formalnie.** Błąd średniej serii ≈ 1,1–1,2 pp, więc różnica jest w granicach szumu (t ≈ 1,0), ale nie da się tego uznać za potwierdzone „±1 pp”. Podział: bez przejęcia −0,6 pp (mieści się), z przejęciem −2,4 pp (n=7 vs 11, rozrzut ogromny). Seria nowa miała mniej gier z przejęciem (7/20 vs 11/20), co sama zmienia średnią. Przyczyny nie wyizolowano; żadna z nowych mechanik nie ma oczywistego wpływu na indeks (Bayer ≈ 0,2% kursu walut, Wilk kilka tys. zł, SZK/KTE/CWE 3 spółki). Zalecenie: seria 40+ gier albo bisekcja, jeśli ma to blokować wersję.
- Niezmienniki 0, ujemna gotówka 0, wyjątki JS 0 w obu seriach.

## Pominięte i problemy
- **S0** (kraj startowy) — poza zakresem (po 0.16.7). Ekran startu ma już wybór kraju z listą.
- **Pomiar nie obejmuje nowych mechanik:** sonda `s066` w `tests/przebiegi.html` (superprojekty, konto w Waschmabanku, weto, kredyty Wilka) dodana po starcie przebiegów — brak jej w danych. Gracz w symulacji nie używa konta w Waschmabanku ani nie kupuje akcji obcych ponad próg, więc S1.1/S1.2 sprawdzają wyłącznie testy jednostkowe. Nie wiadomo, ile razy w 20 grach padło weto Gutzwillera i ile superprojektów się ukończyło.
- Pliki `ui.js`/`style.css` zmieniono (S5) w trakcie trwania serii nowego kodu; zmiany tylko wizualne.
- Drabina akcji obcych: nakaz KNF to tylko odsprzedaż; „wezwanie z zakupem” nie zrobione (ryzyko wyczyszczenia gotówki funduszu).
- Test „Wilk bierze kredyt” sprawdza kwotę tylko, gdy bank udzielił kredytu.
- Wpływ Bayera na kurs jest minimalny (≈0,2%); „widoczność w historii” to korekta ostatniego punktu tygodniowego, bez osobnego oznaczenia na wykresie.
- Zapis: `oversightResale` zapisany w rzędzie emitenta (`or`); stare zapisy bez pól działają (test).
- Surowe dane serii: notatki sesji (`serie_0166/k66_new.json`, `k66_base.json`), nie w repozytorium.
