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

- **Porażka (decyzja 2026-11-03):** gracz **traci wszystkie pieniądze i wszystkie akcje**, czyli gotówka i wartość pozycji (fundusz i konto prywatne) spadają do zera. Jedna prosta zasada, bez progów zaufania i bez porażki za słabe oceny (degradacja zostaje tylko karą stanowiskiem, jak dziś). Do dopisania w specyfikacji: czy liczą się łącznie fundusz i konto prywatne, czy kończy grę już fundusz (propozycja: fundusz, bo konto prywatne jest dodatkiem), oraz ekran porażki z „zacznij od nowa / wczytaj zapis”. Porażka jest tylko w trybach z celem, w piaskownicy zero oznacza tylko pusty portfel.
- **Długość gry (decyzja 2026-11-03):** **bez limitu czasu**, gra trwa tyle, ile chce gracz. Nie ma końcowego rankingu po N latach. Koniec gry to tylko zwycięstwo (z opcją „graj dalej”) albo porażka z tego punktu. Rok = 20 tygodni służy tylko do liczenia okresów (oceny, premie), nie jako licznik końca.
- **Menu startowe:** wybór ścieżki (A / B / C / Piaskownica), liczby symulowanych funduszy (0–5); bez wyboru długości gry. Cel widoczny stale w zakładce Firma (rozszerzenie `getPlayerTargets` o pasek „do zwycięstwa”).
- **Nowa gra+:** po zwycięstwie opcja „kontynuuj” zostaje, ale cel nie liczy się drugi raz.

## 7. Dawne pomysły: rozstrzygnięcie

- **Wygrana przez większościowca w spółce diamentowej (5/10 min):** odrzucić jako samodzielny cel; można wrócić jako wariant ścieżki C po 0.19.3 (wymaga rankingu DIAMOND z oceną AAA z nowego IPO, więc naturalnie dopiero po 0.18.11). Zapisane, nie wdrażane.
- **Firma „Boss”:** odrzucić; rolę „szefa” pełni `getPlayerBoss` + zarząd. Nie ma jej w żadnym kodzie.
- **Zdefiniowanie celu gry (pkt 1.2 starego planu):** zamykane tym dokumentem.

## 8. Tryb symulowanych funduszy

**Ile ich jest dziś (z kodu, nie z pomiaru w grze):**
- **Boty-zarządcy w korporacji:** losowo **3–5** (`createCorporation`), każdy z własnym funduszem (8–30 tys. na start) i osobowością; to oni są rywalami o fotel CEO.
- **Fundusze zewnętrzne** (holdingi, `getExternalFunds`): holdingów jest 9 w `companies.js`, z czego 3 to media (PULS, FLESZ, OBSER), więc około **6** to cele przejęć. Nie mają zarządcy, nie rywalizują o fotel.
- **Boty-inwestorzy** (`aiCompetitors` w `ai.js`): **9**, bez funduszy (gotówka i portfel), to rywale rynkowi i partnerzy relacji.

„Symulowany fundusz” w trybie dodatkowym = bot-zarządca z pierwszego punktu. Liczba jest dziś losowa (3–5) i niezmienna w menu; plan zmienia to na wybór gracza.

- Boty-zarządcy (istniejące) mają już fundusze; „symulowany fundusz” = bot z własną nazwą, osobowością i trasą rozwoju, który może zdobyć fotel CEO albo przejąć fundusze, jeśli gracz nie zdąży.
- Wymaga, żeby bot-zarządca umiał wykonać wniosek o przejęcie (dziś robi to tylko gracz). Reguły identyczne jak dla gracza, bez bonusów (zasada „średnio zero”).
- Wynik rywali widoczny w rankingu korporacji (istniejąca tabela Firma).
- Ryzyko: czas kroku. Rywale liczeni co tydzień jak dziś (zgodnie z decyzją, że LOD dotyczy tylko spółek).

## 9. Podział na wersje

Cel gry nie dostaje własnej wersji, bo większość elementów pasuje do planowanych:
- **0.18.0:** nic (wydajność); w razie potrzeby tylko pole `goal` w stanie gry (zapis opcjonalny).
- **0.18.11 (Audyt/oceny/IPO):** ocena AAA jako bramka giełdy DIAMOND; podstawa wariantu C.
- **0.19.1 (Społeczeństwo 2):** rozmowy z zarządem (0.17.3) mogą korzystać z relacji.
- **0.19.3 (bramka testowa):** menu startowe ze ścieżką celu, porażka i koniec gry, przejęcie ze skutkami (pkt 5), symulowane fundusze. Jeśli to za dużo, wydzielić **0.19.4 „Cel gry”**.
- Testy: macierz „ścieżka × wynik” (zwycięstwo A/B/C, porażka przy zerowym majątku), niezmiennik „brak wygranej przed K okresami”, przebiegi ×200 na ścieżkę (cel: 40–60% sukcesu dla gracza, który gra sensownie).

## 10. Otwarte pytania do użytkownika

Rozstrzygnięte 2026-11-03: **brak limitu czasu gry**; dochodzą **losowane cele poboczne** (pkt 11).

Rozstrzygnięte 2026-11-03: **porażka = brak pieniędzy i akcji** (pkt 6).

1. Czy do porażki liczy się sam fundusz, czy fundusz i konto prywatne łącznie (propozycja: sam fundusz).
2. Czy ścieżka C (CEO + przejęcia) ma wejść do 0.19.3, czy zostaje na później?
3. Ile symulowanych funduszy domyślnie: dziś jest 3–5 botów-zarządców z funduszami, plus ~6 funduszy zewnętrznych do przejęcia (pkt 8). Propozycja: domyślnie 3 rywali-zarządców, do wyboru 0–5.

## 11. Losowane cele poboczne

Dziś `getPlayerTargets` zwraca **te same 5 celów** w każdym okresie (pobij GIG, powyżej lokaty i inflacji, zaufanie ≥ 60, ocena ≥ 60, przejęcia). Stąd powtarzalność. Propozycja:

- **Pula celów** w tabeli danych (`id`, nazwa, warunek jako funkcja stanu, postęp 0–1, nagroda, trudność, wymagania). Stałe zostają tylko dwa cele „rdzeniowe” (pobij GIG; ocena zarządu), reszta jest losowana.
- **Losowanie na początku każdego okresu** (3 kwartały): 3 cele poboczne z puli, bez powtórzenia z poprzedniego okresu; wagi wg stanowiska i dostępnych mechanik (cel o danej mechanice tylko, gdy gracz ją odblokował, np. ropa dopiero po 0.17, IPO dopiero po 0.18.11). Losowanie na ziarnie gry, żeby zapis wczytany w połowie okresu dawał te same cele.
- **Nagrody** małe i niezależne od wygranej: premia do budżetu/konta prywatnego, relacje, zaufanie klientów, wpis do CV (wchodzi do oceny zarządu wg pkt 4.1). Cel poboczny nie może być jedyną drogą do awansu.
- **Przykładowa pula (do rozszerzania razem z kolejnymi wersjami):**
  - Rynek: portfel w ≥ 3 sektorach; zysk na jednym towarze; trafiony kontrakt/ETF; wyjście z pozycji przed spadkiem ≥ 15%.
  - Fundusz: napływ nowych udziałów od klientów; zero umorzeń w okresie; zmienność poniżej GIG.
  - Spółki: IPO spółki do portfela (po 0.18.11); dywidenda z prezesa przez rozmowę (po 0.17.3); inwestycja w startup.
  - Korporacja: relacja z botem ≥ +40; udana rozmowa z zarządem; wniosek o przejęcie bez komplikacji.
  - Świat: pozycja w kraju obcym (po wersjach krajów); zarobek w czasie kryzysu.
- **Zasada uczciwości:** wszystkie cele sprawdzają wynik gracza, nie ruch ceny (cena egzogeniczna nie może „dawać” celu przypadkiem); żaden cel nie wymaga losowego zdarzenia.
- **UI:** pasek celów w zakładce Firma, stan słowem („3 z 5 sektorów”), nie samym kolorem; ikony SVG.
- **Test:** każdy cel z puli ma test warunku (spełniony/niespełniony), losowanie nie powtarza celów, zapis zachowuje bieżące cele; przebieg ×200 sprawdza, że żaden cel nie jest spełniany przez pasywnego gracza ani niemożliwy.
- **Wersja:** mechanizm i ~10 celów w 0.19.3 razem z celem gry; kolejne cele dopisuje każda następna wersja do swojej mechaniki (wpis w jej planie).

## 12. Co nie zostało sprawdzone

Stan celu opisałem z kodu (`player.js` career.js, `ai.js` zakładka Firma, `ui.js` ekran zwycięstwa). Nie uruchamiałem gry, więc nie wiem, ile okresów zajmuje dziś awans do CEO ani jak często gracz wygrywa; progi N, K, długość gry i odsetki sukcesu to propozycje do pomiaru. Czy bot-zarządca ma dziś kod wniosku o przejęcie, nie sprawdzałem.
