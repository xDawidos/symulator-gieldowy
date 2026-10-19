# Plan 0.15.1 „Sztuka przejęć (M&A)”

> **Wersja:** 0.15.1 (po 0.15.0 „Hossa i bessa”, przed 0.15.2 „Kochaj i zarabiaj”).  
> **Status:** Zaplanowane na podstawie decyzji gracza (Wariant C).  
> **Główne moduły:** `ma.js`, `companies.js`, `ui.js`, `economy.js`.

---

## 1. Cel i wizja

Obecny mechanizm przejęć i fuzji (wprowadzony częściowo w wersjach 0.11/0.14) był zbyt binarny i nagły: transakcja dochodziła do skutku natychmiast lub była sztywno zablokowana, a gracz nie miał pola do negocjacji wieloetapowej.

**W wersji 0.15.1 przejęcie spółki staje się procesem biznesowym z elementami psychologii i ryzyka:**
1. **Darmowe rozmowy wstępne** – gracz może bez ponoszenia kosztów wysondować nastawienie zarządu i głównych akcjonariuszy do sprzedaży spółki.
2. **Wieloetapowy proces przejęcia** – od badania intencji, przez list intencyjny (LOI), audyt Due Diligence, aż po formalną ofertę wiążącą lub wrogie wezwanie.
3. **Psychologia zarządu i ryzyko obrazy** – zbyt niska oferta (lowball) może urazić radę nadzorczą lub prezesa. Zarząd może zerwać rozmowy na wiele kwartałów, wdrożyć strategię „trującej pigułki” (Poison Pill) lub zacząć szukać „Białego Rycerza” (White Knight).

---

## 2. Etapy procesu przejęcia (Pipeline M&A)

W oknie spółki oraz w zakładce funduszu/korporacji pojawia się przejrzysty panel procesu M&A:

### Krok 1: Wstępne badanie i rozmowy sondujące (Darmowe)
- **Koszt:** 0 zł.
- **Działanie:** Gracz kontaktuje się z zarządem spółki celowej w celu zbadania ich otwartości na inwestora strategicznego.
- **Wynik:**
  - *Zarząd przyjazny:* spółka poszukuje kapitału lub ma problemy z sukcesją (szansa na gładkie przejęcie po rozsądnej cenie).
  - *Zarząd neutralny:* oczekuje standardowej premii rynkowej (np. +15–30% do średniego kursu z 3 miesięcy).
  - *Zarząd wrogi / niechętny:* prezes lub założyciel nie chce oddawać kontroli; przejęcie będzie wymagało wrogiego wezwania (hostile takeover) lub gigantycznej premii.

### Krok 2: List intencyjny (LOI) & Klauzula poufności (NDA)
- **Koszt:** symboliczny koszt prawny (np. 10 000 – 50 000 zł w zależności od wielkości spółki).
- **Czas trwania:** 1–2 kwartały na wyłączność negocjacyjną.
- Ustalenie wstępnego korytarza wyceny (np. 110–130% kapitalizacji).

### Krok 3: Badanie Due Diligence (Audyt śledczy)
- **Opcje badania:**
  - *Podstawowe (tanie, szybkie):* weryfikacja oficjalnych sprawozdań.
  - *Głębokie (droższe, z udziałem renomowanych audytorów):* szansa na wykrycie ukrytych faktów.
- **Co audyt może wykryć (mechanika losowa zależna od ładu korporacyjnego spółki):**
  - **Ukryty dług / roszczenia pozabilansowe:** faktyczny dług spółki okazuje się o 15–40% wyższy niż w bilansie.
  - **Wysoka jakość aktywów (pozytywne zaskoczenie):** ukryte patenty, niedowartościowane nieruchomości – wartość spółki jest wyższa.
  - **Kreatywna księgowość:** marża operacyjna była zawyżana, konieczność korekty wyceny w dół.
  - Gracz może po audycie: renegocjować cenę w dół, wycofać się bez konsekwencji lub kontynuować na starych warunkach.

### Krok 4: Składanie oferty wiążącej i negocjacje ceny
- Gracz proponuje cenę za akcję (lub wycenę pakietu kontrolnego 51% / 100%).
- **Mechanika „Urażenia propozycją” (Offense & Board Backlash):**
  - Jeśli oferta wynosi **< 85% wartości godziwej** (lub poniżej aktualnego kursu):
    - Istnieje wysoka szansa (np. 70%), że **zarząd poczuje się głęboko urażony**.
    - Skutki obrazy zarządu:
      - Natychmiastowe zerwanie rozmów (blokada negocjacji polubownych na 1–3 lata gry).
      - Spadek relacji z kluczowymi inwestorami w branży.
      - Zarząd może przyjąć uchwałę obronną (*Poison Pill* – emisja tanich akcji dla dotychczasowych akcjonariuszy rozwadniająca pozycję agresora) lub wezwać na pomoc konkurenta (*Biały Rycerz* / White Knight), który składa kontrofertę.
  - Jeśli oferta jest **uczciwa (100–120% wyceny rynkowej)**: standardowe negocjacje, możliwość targowania się o 5–10%.
  - Jeśli oferta jest **hojna (> 130% wyceny)**: zarząd rekomenduje akcjonariuszom natychmiastowe przyjęcie oferty.

### Krok 5: Finalizacja i wezwanie giełdowe
- Formalne wezwanie na akcje spółki (Tender Offer) do progu 51%, 66% (większość kwalifikowana) lub 100% (squeeze out / wycofanie z giełdy).
- Zgoda organu antymonopolowego (UOKiK): jeśli gracz kontroluje już > 40% danego sektora, transakcja może wymagać sprzedaży części aktywów lub zostać zablokowana.

---

## 3. Integracja z istniejącym kodem

- `src/ma.js`:
  - Rozbudowa obiektu procesu fuzji: statusy `['INITIAL_TALKS', 'LOI', 'DUE_DILIGENCE', 'NEGOTIATION', 'TENDER_OFFER', 'COMPLETED', 'REJECTED_OFFENDED', 'BLOCKED_ANTITRUST']`.
  - Obsługa darmowego pierwszego kroku (`cost: 0`).
  - Funkcja `evaluateOfferSentiment(targetCompany, offeredPrice, fairValue)` zwracająca stopień akceptacji lub poziom urażenia zarządu.
- `src/companies.js`:
  - Flagi w obiekcie spółki: `boardSentiment` (wobec gracza), `poisonPillActive`, `cooldownUntilQuarter`.
- `src/ui.js`:
  - Dedykowana zakładka / modal negocjacji M&A z podglądem postępów, raportem z Due Diligence i suwakiem oferty cenowej z prognozą reakcji rady nadzorczej.

---

## 4. Testy i kryteria akceptacji

1. Rozmowa wstępna nie pobiera ani 1 grosza z konta gracza ani funduszu.
2. Złożenie oferty o 30% poniżej kursu skutkuje zerwaniem rozmów i statusem obrazy zarządu w 100% testowych prób wariantu skrajnego.
3. Due Diligence poprawnie ujawnia ukryte parametry spółki przed finalnym podpisaniem umowy.
4. Pełna zgodność ze stanem zapisu (v15) i brak regresji w 459 istniejących testach.
