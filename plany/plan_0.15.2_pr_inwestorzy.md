# Plan 0.15.2 „Kochaj i zarabiaj (PR & Inwestorzy)”

> **Wersja:** 0.15.2 (po 0.15.1 „Sztuka przejęć”, przed 0.15.3 „Wielkie Kryzysy”).  
> **Status:** Zaplanowane na podstawie decyzji gracza (Wariant C).  
> **Główne moduły:** `playerFund.js`, `fundBots.js` (nowy), `ui.js`, `prDepartment.js` (nowy).

---

## 1. Cel i wizja

Aktualizacja rozbudowuje zarządzanie funduszem gracza o głęboką relację z inwestorami (botami), negocjacje warunków emisji certyfikatów/Jednostek Uczestnictwa (JU), ograniczenia płynnościowe chroniące gracza przed gwałtownym odpływem kapitału oraz mechaniki Public Relations i Investor Relations (PR/IR).

Gracz przestaje być tylko biernym obserwatorem wpłat i wypłat botów – staje się aktywnym zarządcą, który kreuje politykę emisji, negocjuje z VIP-ami, prowadzi dialogi i dba o zaufanie poszczególnych frakcji inwestorów.

---

## 2. Kalendarz gry i wskaźnik czasu

Zgodnie z decyzją gracza, zegar i kalendarz w grze otrzymują format **„Lata w firmie” / „Staż zarządcy”**:
- Wyświetlanie u góry ekranu w formacie:  
  **`[ Rok X, Miesiąc Y, Tydzień Z ]`** (np. `1 rok, 3 msc, 2 tydz` lub `Rok 3, Msc 8, Tydz 1`).
- Staż ten jest powiązany z:
  - Odblokowywaniem nowych możliwości (reputacja zarządcy z czasem rośnie);
  - Trwaniem okresów lock-up inwestorów;
  - Liczeniem czasu na wyjście z debetu płynnościowego (1 tydzień gry).

---

## 3. Nowe zasady emisji Jednostek Uczestnictwa (JU)

Koniec z niekontrolowanymi, ciągłymi wahaniami kapitału funduszu. Gracz otwiera **kampanie emisyjne**:

### A. Okna emisji (Czas trwania)
- Zamiast ciągłej emisji w tle, emisja otwiera się w zaplanowanych oknach:
  - **Tydzień** (szybka emisja ratunkowa lub okazjonalna, mniejszy zasięg marketingowy);
  - **1 miesiąc** (standardowa runda inwestycyjna);
  - **3 miesiące (1 kwartał)** (duża kampania instytucjonalna z czasem na przekonywanie VIP-ów).

### B. Minimalny okres uczestnictwa (Lock-up: 0 do 5 lat)
- Gracz ustala suwakiem minimalny czas, przez który inwestor nie może umorzyć JU:
  - **0 lat (brak lock-up):** przyciąga spekulantów i graczy krótkoterminowych, wysokie ryzyko panicznego odpływu gotówki przy bessie.
  - **1–2 lata:** zrównoważony standard dla zamożniejszych inwestorów.
  - **3–5 lat:** odstrasza drobnych ciułaczy, ale przyciąga fundusze emerytalne, instytucje i bogatych inwestorów ceniących stabilność strategii.

### C. Gwarancja zwrotu wkładu (Opcjonalna) & Reguła debetu
- Gracz może zaoferować certyfikaty z **gwarancją kapitału** (ochrona 100% kwoty początkowej).
- Drastycznie zwiększa zainteresowanie inwestorów ostrożnych i instytucjonalnych.
- **Ryzyko i reguła niedoboru (Decyzja gracza - Opcja A):**
  - Jeśli wartość wyceny JU spadnie poniżej ceny zakupu, a inwestor kończy okres uczestnictwa i wycofuje środki, **fundusz dopłaca brakującą kwotę z gotówki**.
  - Jeśli w kasie funduszu brakuje gotówki, system automatycznie dokonuje **awaryjnej likwidacji akcji i aktywów funduszu** po bieżących cenach rynkowych.
  - Jeśli nawet po sprzedaży wszystkich aktywów wciąż brakuje środków, **saldo gotówki funduszu wchodzi na minus** (uruchamia się automatyczny kredyt płynnościowy / linia ratunkowa z instytucji finansowej oferującej pożyczki).
  - **Rygorystyczny termin gracza:** Gracz ma dokładnie **1 tydzień czasu gry** na wyprowadzenie salda funduszu na poziom $\ge 0$ (np. dokapitalizowanie z majątku prywatnego, pilna emisja nowych udziałów, zewnętrzna pożyczka).
  - Jeśli po 1 tygodniu gry saldo nadal jest ujemne: **ogłoszenie niewypłacalności funduszu, dymisja zarządcy, wejście syndyka i sankcje KNF**.

### D. Cel emisji (Investment Mandate)
- Gracz deklaruje cel zbieranego kapitału (np. „minimum 20% środków w sektor OZE”, „minimum 30% w spółki dywidendowe”, „inwestycje w surowce”).
- Czasami wymóg ten jest narzucony odgórnie przez inwestora instytucjonalnego jako warunek objęcia transzy.
- Spełnienie celu podnosi prestiż i rating funduszu; złamanie obietnicy skutkuje karami umownymi i ucieczką kapitału.

---

## 4. Segmentacja inwestorów i rozmowy z botami

Inwestorzy dzielą się na 3 główne klasy:
1. **Drobni / Detaliczni:** reagują na ogólny marketing i nastroje giełdowe.
2. **Instytucjonalni:** cenią długie lock-upy, niską zmienność, gwarancje i dywersyfikację.
3. **Inwestorzy VIP:** unikalne boty o zdefiniowanym profilu majątkowym (np. Baron Naftowy, Konserwatywny Rentier, Młody Rekin Techu, Family Office).

### Interaktywny pitching / Dialog z botami
- Przy pozyskiwaniu VIP-ów gracz wchodzi w interaktywny dialog pitchingowy.
- Wybór 1 z 4 wylosowanych tonów wypowiedzi:
  1. **Odważny / Wizjonerski** (stawia na agresywny wzrost i nowe technologie);
  2. **Bezpieczny / Konserwatywny** (podkreśla dywidendy, obligacje i kontrolę ryzyka);
  3. **Uprzejmy / Dyplomatyczny** (buduje długofalowy szacunek i relacje);
  4. **Konkretny / Ekonomiczny** (prezentuje suche liczby, wskaźniki C/Z, ROE, marże);
  *(Alternatywnie wariant: Zabawny / Luźny).*
- **Mechanika relacji:**
  - Trafienie w preferencje danego bota zwiększa pasek relacji.
  - Wysoka relacja odblokowuje opcję specjalną: **„Wymuś przysługę przyjacielską”** – gwarantuje natychmiastowe objęcie dużej puli JU, ale zużywa zaufanie (obniża pasek relacji na przyszłość).

---

## 5. Dział PR i Analityk Investor Relations (IR)

W siedzibie funduszu pojawia się możliwość zatrudnienia **Analityka PR/IR**:
- **Poziom 1 (Bazowy):**
  - Wyświetla nastroje kluczowych grup wobec gracza:
    - *Inwestorzy bogaci:* lubią cię (+30);
    - *Inwestorzy ostrożni:* kochają cię (+80);
    - *Inwestorzy odważni / agresywni:* nie lubią cię (−40).
- **Akcja „Daj podwyżkę dla PR-owca” (Krok 1):**
  - PR-owiec przynosi **konkretne zadania (misje) od grup**, np.:
    - *Zadanie od Ostrożnych:* „Kup obligacje skarbowe za min. 500 000 zł i utrzymaj przez 2 kwartały” $\rightarrow$ nagroda: skok relacji o +30 pkt.
    - *Zadanie od Bogatych:* „Zrealizuj stopę zwrotu z dywidend > 5% rocznie”.
- **Druga podwyżka (Krok 2 – Głęboka analiza preferencji):**
  - Analityk precyzyjnie wyjaśnia motywacje botów (np. *„Inwestorzy ostrożni cię nie lubią, bo w portfelu masz 40% spółek ze stratą i brak lokat bankowych”*).
- **Wskaźnik Zaufania do Funduszu (Reputacja IR):**
  - Widoczny na stałe na głównym pasku podsumowania funduszu.

---

## 6. Integracja i zgodność z systemem

- Kompatybilność z cyklem hossy/bessy (0.15.0) – w bessie boty chętniej żądają gwarancji kapitału, a brak lock-upu może zniszczyć nieostrożny fundusz.
- Nowe osiągnięcia w CV: „Zaufanie VIP-ów”, „Gwarancja bez pudła”, „Dyplomata rynkowy”.
- Wszystkie 459 testów zachowuje stabilność.
