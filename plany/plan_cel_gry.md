# Plan „Cel gry” (2026-11-03; wdrożenie od 0.18, nic w ≤0.17.5)

Uzupełnia sekcję 12 planu serii `plan_seria_0.18_towary_ipo_miasta.md`. Zatwierdzone przez użytkownika: celem jest zostanie **CEO** i/lub **przejęcie innych funduszy**; dodatkowy tryb to **symulowane fundusze**.

## 1. Co już jest w kodzie (stan z przeglądu, nie od zera)

Cel „CEO lub przejęcie” istnieje od etapu C (`player.js`, sekcja career.js):
- Kariera: `CAREER_POSITIONS` = Młodszy zarządca → Zarządca funduszu → Starszy zarządca → Kierownik projektu → Członek zarządu → CEO (udział w opłacie 15%→40%, dostęp do giełd 2→7). Limity miejsc: `POSITION_LIMITS` (kierownik 2, zarząd 3, CEO 1).
- Ocena zarządu co 4 okresy (`BOARD_REVIEW_EVERY_PERIODS`), próg awansu `PROMOTION_SCORE = 60`, słaby wynik `WEAK_SCORE = 35`; boty-zarządcy z własnymi funduszami, zamiany miejsc i degradacje.
- Przejęcia firm zarządzających (zewnętrzne fundusze = holdingi) na modelu M&A, od stanowiska Członek zarządu; wniosek, budżet korporacji, komplikacje 8%, upadek wniosku 3% (`proposeFundTakeover`, `completeFundTakeover`).
- `checkVictory()`: zwycięstwo `ceo` (stanowisko CEO) albo `domination` (przejęto `VICTORY_TAKEOVERS_REQUIRED` = 3 wskazane fundusze). Ekran zwycięstwa, wpis do CV, „Możesz grać dalej”.
- Cele okresu w zakładce Firma (`getPlayerTargets`), relacje z botami i szefem (`getPlayerBoss`).

**Wniosek:** nie ma czego „wymyślać” od zera. Brakuje: (a) wyraźnego celu pokazanego graczowi od pierwszej minuty, (b) wykonalnej ścieżki do fotela CEO (dziś CEO = awans po ocenie, bez rywalizacji i bez konsekwencji), (c) porażki i końca gry, (d) przejęcia jako realnego zdarzenia dla rynku, (e) trybów dodatkowych. Reszta planu to dokładnie te pięć dziur.

## 2. Znalezione problemy w obecnym celu

1. **Nic nie kończy gry ani nie grozi porażką.** `checkVictory` tylko pokazuje ekran; poza nim jedyną karą jest degradacja po słabych ocenach. Cel bez ryzyka nie jest celem.
2. **Dwa cele mieszają się ze sobą.** `ceo` ma pierwszeństwo przed `domination`, a obie nagrody wyglądają tak samo. Gracz nie wie, czy ma konkurować o fotel, czy przejmować.
3. **CEO to jedno miejsce, ale rywale to boty zarządcy.** Co się stanie z botem, który był CEO przed Tobą? Dziś wynika to tylko z zamiany miejsc po ocenie.
4. **Przejęcie funduszu to licznik 3 sztuk.** Brak wpływu na rynek, KNF, jednostki uczestnictwa (udziały) klientów przejmowanego funduszu ani na boty.
5. **Dawne pomysły z notatek** (większościowiec w spółce diamentowej przez 5 min; firma „Boss”) nie mieszczą się w żadnej ścieżce. Rozstrzygnięcie w pkt 7.
6. **Długość gry nigdzie nie zapisana.** Rok = 20 tygodni (4 kwartały × 5), okres oceny = 3 kwartały. Przy ×200 pełna kariera trwa niewiele czasu rzeczywistego, więc cel musi mieć tempo zapisane w latach gry, nie w minutach.

## 3. Struktura celu (trzy ścieżki + dwa tryby)

| Ścieżka | Warunek zwycięstwa | Kto rywalizuje |
|---|---|---|
| **A. CEO** | Zostajesz CEO korporacji i utrzymujesz stanowisko przez N okresów oceny (propozycja N = 2, żeby nie wygrać jednorazowym skokiem oceny) | boty-zarządcy z listy `corporation.managers` |
| **B. Dominacja** | Przejmujesz wskazane fundusze (dziś 3), przy czym każde przejęcie ma skutki z pkt 5 | boty-fundusze i fundusze zewnętrzne |
| **C. Wielka gra** (opcjonalnie, tryb zaawansowany) | A i B jednocześnie: CEO + przejęte fundusze o łącznych aktywach ≥ ustalony próg | wszyscy |

Ścieżki A i B pozostają rozdzielne (kod już je rozdziela). `checkVictory` zwraca jedno z trzech `type`; ekran zwycięstwa i CV opisują, którą ścieżką gracz wygrał. Kolejność pierwszeństwa nie ma znaczenia, bo gracz wybiera cel w menu startowym (pkt 6).

Tryby dodatkowe:
- **Symulowane fundusze** (zatwierdzone): obok funduszu gracza gra N funduszy-rywali, którzy mogą wygrać jako pierwsi (pkt 6).
- **Piaskownica:** bez celu, bez porażki (dzisiejsze „możesz grać dalej” staje się osobnym trybem).

## 4. Ścieżka CEO: jak ma działać

Dziś awans = ocena zarządu ≥ 60 w danym cyklu. Proponowane uzupełnienia, każde jako dopisek do istniejącej oceny, nie nowy system:

1. **Wynik oceny z CV.** Ocena zarządu uwzględnia kamienie milowe z `playerProfile.cv` (np. 4 okresy powyżej GIG, 100 tys. aktywów, przejęcia). Dziś CV jest dziennikiem; ma stać się wejściem do oceny (waga do ustalenia po pomiarze).
2. **Rywalizacja o miejsce CEO.** Gdy jest wolne lub obsadzone botem: kandydaci to bot na najwyższym stanowisku i gracz; wygrywa wyższa ocena z ostatnich 2 cykli. Przegrany bot dostaje spadek reputacji i, przy wieloletniej porażce, odchodzi (zwalnia miejsce). Nowy bot pojawia się z osobowością z `MANAGER_PERSONALITIES`.
3. **Rozmowy z zarządem.** Wpisuje się w 0.17.3 „Rozmowy” (jedna skala relacji −100…+100): rozmowa przed oceną może przesunąć wynik o mały bonus zależny od relacji; bez losowania po wyborze.
4. **Utrzymanie.** CEO nadal podlega ocenie: dwa słabe cykle z rzędu to utrata fotela (patrz pkt 6, porażka).

Niezmiennik: gracz nie zostaje CEO szybciej niż po min. K okresach od startu (K do ustalenia po przebiegach ×200); inaczej cel „przechodzi się” jednym dobrym wynikiem.

## 5. Ścieżka przejęcia funduszu: skutki, których dziś brak

Dziś `completeFundTakeover` dodaje symbol do `acquiredFunds`. Przejęcie ma zostać zdarzeniem w grze:

1. **Udziały klientów przejmowanego funduszu** (w UI „udział”, nie JU): klienci trafiają do funduszu gracza lub korporacji w części zależnej od relacji i charakteru (`CLIENT_TYPES`); reszta umarza (ruch odpływu z bramką `REDEMPTION_GATE_SHARE`).
2. **Portfel przejmowanego funduszu**: wchodzi do korporacji (nie do portfela gracza). Gracz jako zarządca korporacji dostaje udział w opłacie wg stanowiska (`feeShare`), jak dziś.
3. **Reakcja botów**: spadek relacji z botem-właścicielem, wzrost u botów konkurujących z nim (`onTakeoverStartedRelations`, `changeRelation` już istnieją).
4. **KNF**: przejęcie ≥ progu aktywów uruchamia kontrolę: zwiększa ryzyko `complianceRisk` portfela; nieuczciwe metody (naciski, plotki) mają skutek karny. Szczegóły progów po pomiarze.
5. **Limit jednoczesnych przejęć** (1–2) i koszt z budżetu korporacji (jak dziś); opóźnienie realizacji w czasie gry, nie w czasie rzeczywistym.

## 6. Porażka, koniec gry, start

- **Porażka:** (a) fundusz poniżej progu zaufania klientów przez N okresów i aktywa poniżej progu ⇒ likwidacja funduszu; (b) degradacja do najniższego stanowiska i utrata miejsca po kolejnych słabych ocenach (`WEAK_SCORE`, dziś tylko kara stanowiskiem); (c) bankructwo konta prywatnego nie kończy gry. Porażka jest tylko w trybach z celem.
- **Długość gry:** limit w latach gry (propozycja 20 lat = 400 tygodni, do potwierdzenia z użytkownikiem; w notatce padło też 6,5 roku). Po limicie: ranking końcowy vs rywale (symulowane fundusze), bez zwycięzcy, jeśli nikt nie spełnił warunku.
- **Menu startowe:** wybór ścieżki (A / B / C / Piaskownica), liczby symulowanych funduszy (0–5), długości gry. Cel widoczny stale w zakładce Firma (rozszerzenie `getPlayerTargets` o pasek „do zwycięstwa”).
- **Nowa gra+:** po zwycięstwie opcja „kontynuuj” zostaje, ale cel nie liczy się drugi raz.

## 7. Dawne pomysły: rozstrzygnięcie

- **Wygrana przez większościowca w spółce diamentowej (5/10 min):** odrzucić jako samodzielny cel; można wrócić jako wariant ścieżki C po 0.19.3 (wymaga rankingu DIAMOND z oceną AAA z nowego IPO, więc naturalnie dopiero po 0.18.11). Zapisane, nie wdrażane.
- **Firma „Boss”:** odrzucić; rolę „szefa” pełni `getPlayerBoss` + zarząd. Nie ma jej w żadnym kodzie.
- **Zdefiniowanie celu gry (pkt 1.2 starego planu):** zamykane tym dokumentem.

## 8. Tryb symulowanych funduszy

- Boty-zarządcy (istniejące) mają już fundusze; „symulowany fundusz” = bot z własną nazwą, osobowością i trasą rozwoju, który może zdobyć fotel CEO albo przejąć fundusze, jeśli gracz nie zdąży.
- Wymaga, żeby bot-zarządca umiał wykonać wniosek o przejęcie (dziś robi to tylko gracz). Reguły identyczne jak dla gracza, bez bonusów (zasada „średnio zero”).
- Wynik rywali widoczny w rankingu korporacji (istniejąca tabela Firma).
- Ryzyko: czas kroku. Rywale liczeni co tydzień jak dziś (zgodnie z decyzją, że LOD dotyczy tylko spółek).

## 9. Podział na wersje

Cel gry nie dostaje własnej wersji, bo większość elementów pasuje do planowanych:
- **0.18.0:** nic (wydajność); w razie potrzeby tylko ustalenie długości gry i pole `goal` w stanie gry (zapis opcjonalny).
- **0.18.11 (Audyt/oceny/IPO):** ocena AAA jako bramka giełdy DIAMOND; podstawa wariantu C.
- **0.19.1 (Społeczeństwo 2):** rozmowy z zarządem (0.17.3) mogą korzystać z relacji.
- **0.19.3 (bramka testowa):** menu startowe ze ścieżką celu, porażka i koniec gry, przejęcie ze skutkami (pkt 5), symulowane fundusze. Jeśli to za dużo, wydzielić **0.19.4 „Cel gry”**.
- Testy: macierz „ścieżka × wynik” (zwycięstwo A/B/C, porażka, limit czasu), niezmiennik „brak wygranej przed K okresami”, przebiegi ×200 na ścieżkę (cel: 40–60% sukcesu dla gracza, który gra sensownie).

## 10. Otwarte pytania do użytkownika

1. Długość gry w latach gry: 20 lat, 6,5 roku czy bez limitu?
2. Czy porażka ma być w każdym trybie z celem, czy tylko w „trudnym”?
3. Czy ścieżka C (CEO + przejęcia) ma wejść do 0.19.3, czy zostaje na później?
4. Ile symulowanych funduszy domyślnie (propozycja 3)?

## 11. Co nie zostało sprawdzone

Stan celu opisałem z kodu (`player.js` career.js, `ai.js` zakładka Firma, `ui.js` ekran zwycięstwa). Nie uruchamiałem gry, więc nie wiem, ile okresów zajmuje dziś awans do CEO ani jak często gracz wygrywa; progi N, K, długość gry i odsetki sukcesu to propozycje do pomiaru. Czy bot-zarządca ma dziś kod wniosku o przejęcie, nie sprawdzałem.
