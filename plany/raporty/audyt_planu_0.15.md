# Audyt planu 0.15 „Hossa i bessa” (etapy 1–5 planowania)

- **Data:** 2026-10-17.
- **Stan wyjściowy:** `plan_0.15_hossa_bessa.md` z 2026-10-14 (H0–H6), mapa `plan_0.13-0.16_mapa.md`, raporty `kontrola_0.14.md`, `kontrola_0.14.2.md`, `weryfikacja_0.13.1.md`, kod `zmiany-AI` (`f133ad9`).
- **Wynik:** nowy `plan_0.15_hossa_bessa.md` (etap 6). Ten plik zapisuje drogę: zbiórkę, rozwinięcie, audyt, ocenę designu i decyzje.

---

## Etap 1. Zbiórka pomysłów

### Jak dziś działa rynek (odczyt kodu)

- **Kurs na tik (1 s gry):** szum 0,2% × zmienność + powrót do wartości godziwej (0,03% × luka na tik, półokres ok. 1 godziny gry) + nastrój z fazy gospodarki (`MARKET_MOOD_PER_TICK` × `mood` × beta) + dryf z fazy spółki i CEO (`core.js`, pętla cen).
- **Wartość godziwa** (`updateFundamentalRatios`, `companies.js`): zysk na akcję z 4 kw. × C/Z sektora × `getValuationMultiplier` (cykl × stopy × cykl sektora × arystokraci × projekty, limit 0,4–1,8) × premia kondycji (±30%); 25% kotwicy księgowej. Kurs idzie za zyskiem — **GIG rośnie tyle, ile rośnie zysk na akcję plus zmiana mnożnika**.
- **Cykl gospodarki** (`ECONOMY_PHASES`): Ożywienie 2–4 kw., Ekspansja 3–6, Przegrzanie 1–3, Recesja 2–4. Pełny cykl śr. ok. 13 kw. Mnożnik C/Z 0,85–1,20. Faza zmienia się dokładnie w momencie zmiany gospodarki — rynek nie wyprzedza gospodarki.
- **Czas:** tydzień gry = 60 s, kwartał = 300 s (5 tygodni). „Krach w 1–4 tygodnie” = 1–4 minuty przy ×1.
- **Klienci funduszu** mają już typy (`player.js`): 😨 Strachliwy (`panic: true`, umarza całość), 🦊 Spryciarz (`chase: 1,6`, goni wyniki), 🛡️ Ostrożny, 🦁 Odważny, 💎 Bogaty, 🪙 Sknera, 🏛️ Instytucja. H5 nie musi tworzyć nowych typów.
- **Zaufanie** (`computeTrustTarget`): nadwyżka nad GIG × 400, obsunięcie i zmienność ponad GIG, **kara makro** gdy wynik < max(lokata, inflacja) (`getMacroTrustPenalty`, do −15) i **premia za dodatni wynik** (do `TRUST_GAIN_BONUS_MAX`). Dwa ostatnie składniki liczą wynik bezwzględny, nie względem GIG — ważne dla H1 (niżej, audyt).
- **Boty** (`ai.js`): reckless, calm, whale, pro_investor, yolo_trader (dźwignia do 70%), market_maker, dividend_chaser, banker.

### Tabela zbiórki

| # | Pomysł | Źródło | Co rozwiązuje |
|---|---|---|---|
| Z1 | Pomiar składników zwrotu GIG (H0) | plan H0; mapa „Otwarte sprawy”; `kontrola_0.14.2.md` (≥ 20 przebiegów na wariant) | nie wiemy, skąd 18–22%/rok zamiast 7–9% |
| Z2 | Kalibracja długiego trendu GIG do 7–9%/rok, σ 12–20 pp (H1) | plan H1; komentarz B5 w `companies.js`; `testy_ogolne_0.11.md` („rynek wciąż byczy”) | lokaty i obligacje bez sensu, brak prawdziwych złych lat |
| Z3 | Marża rośnie 24 → 28% w 0.14 | `kontrola_0.14.md`, `kontrola_0.14.2.md` | możliwe źródło wzrostu zysku, a więc GIG |
| Z4 | Fundusz = GIG traci 5–7% JU rocznie (cel ±3%) | mapa (P12); `weryfikacja_0.13.1.md` | gracz kopiujący indeks jest karany — zła lekcja („indeks to porażka”) |
| Z5 | Cele korporacji dają CEO do 64% wpływów prywatnych (cel ≤ 25%) | mapa, wiersz 0.14.1 R5 | balans portfela prywatnego na najwyższym stanowisku |
| Z6 | Nastrój rynku: indeks strachu i chciwości, 6 faz, premia wyceny całego rynku (H2) | plan H2; `roadmap.txt` 0.12 („nagła bessa”) | rynek bez własnej psychologii; faza = gospodarka |
| Z7 | Opóźnione potwierdzenie fazy i szum wskaźnika (H2) | plan H2 | ochrona przed exploitem „kup na sygnał” |
| Z8 | Panel „Sygnały rynku”, tło faz na wykresie GIG (H2) | plan H2 | gracz ma się czego uczyć, a nie zgadywać |
| Z9 | Bańki sektorowe: pompowanie i pęknięcie (H3) | plan H3; `roadmap.txt` („bańki”) | brak lekcji „cena ≠ wartość” na poziomie sektora |
| Z10 | Krach rynku i bezpiecznik giełdy (H4) | plan H4; `roadmap.txt` („krachy”); `plany.txt` 4.1.2 (instytucja ratuje przy dużych spadkach) | brak rzadkich, mocnych zdarzeń; lekcja o circuit breakers |
| Z11 | Nadzwyczajne cięcie stóp po krachu (H4) | plan H4; makro 0.10.2 | bank centralny jako pożyczkodawca ostatniej instancji |
| Z12 | Boty zależne od nastroju wg osobowości (H5) | plan H5; `roadmap.txt` bot „Spekulant” | boty nie tworzą tłumu, który pompuje i panikuje |
| Z13 | Klienci zależni od nastroju: panikarze w bessie, goniący wyniki w euforii (H5) | plan H5; typy klientów w `player.js` | koszt (i zysk) zachowania kontrariańskiego dla zarządzającego |
| Z14 | Akademia (hasła), Mentor (3 zadania), pasek newsów, faza w raporcie okresu (H6) | plan H6; 0.12 N1, 0.14.2 P7 | lekcja w chwili zdarzenia |
| Z15 | Bot „Spekulant”: handluje wg trendu, ignoruje fundamenty | `roadmap.txt` 0.12 | tłum goniący trend; źródło pędu (momentum) |
| Z16 | Opcje i CFD („Mistrz Opcji”) | `roadmap.txt` 0.12 | zarabianie na spadkach — poza zakresem (decyzja: bez krótkiej sprzedaży) |
| Z17 | Scenariusz „Wielki Kryzys” (start tuż przed krachem) | `roadmap.txt` / `ewentualny roadmap.txt` 1.0 | nauka kryzysu w skróconej formie |
| Z18 | Muzyka zależna od hossy i bessy | `roadmap.txt` 1.0 | klimat |
| Z19 | Zarządzający aktywami z prowizją zależną od hossy i bessy | `roadmap.txt` 0.5, 4.6.3 | — (brak takiej mechaniki w grze) |
| Z20 | Bank centralny „chłodzi” rynek w hossie (np. negatywne zdarzenie, podatki) | `plany.txt` 4.2.2 | polityka makroostrożnościowa; hamulec euforii |
| Z21 | Instytucja państwa podnosi kurs przy dużych spadkach | `plany.txt` 4.1.2 | ochrona przed zapaścią (dziś częściowo: Skarb Państwa) |
| Z22 | Stopa zależna od tego, ile spółek rośnie (szerokość rynku) | `plany.txt` 4.2.5 | zamieniony na wskaźnik szerokości rynku w sygnałach |
| Z23 | Lokaty, obligacje, bony to „wpłać i czekaj” | `testy_ogolne_0.11.md` („nudne”) | w bessie dostają sens: ucieczka do bezpiecznych aktywów |
| Z24 | Komunikat „klienci odchodzą, bo…” | `testy_ogolne_0.11.md` („słabe”) | częściowo zrobione w 0.13.1 B5 — dopisać przyczynę „panika rynku” |
| Z25 | Podsektor „Rynki kapitałowe”: obroty rosną w hossie | komentarz w `SECTORS` (`core.js`) | fundamentalne powiązanie: biura maklerskie i operatorzy zarabiają na hossie |
| Z26 | Grunt pod 0.16: nastrój per rynek (korelacja i zarażanie), „Bankier” dokupuje w krachu, luksus rośnie w hossie | `plan_0.16_gielda_miedzynarodowa.md` | 0.16 nie musi przebudowywać 0.15 |

---

## Etap 2. Rozwinięcie i podrasowanie

### Dwa odkrycia z kodu, które zmieniają plan

1. **GIG to indeks równych wag przeważany co sekundę gry** (`updateMarketIndexes`: średnia zmian cen wszystkich spółek na każdym tiku). Taki indeks dostaje „premię za przeważanie”: co tik sprzedaje to, co podrożało, i kupuje to, co staniało. Zarabia więc na samym szumie małych, zmiennych spółek, a fundusz gracza nie może tego powtórzyć. To nowa hipoteza H0 (h5), której nie było w planie. Prawdziwe indeksy (WIG, WIG20) są ważone kapitalizacją z limitem udziału jednej spółki.
2. **Kurs dochodzi do wartości godziwej powoli:** `PRICE_MEAN_REVERSION_PER_TICK = 0,0003`, czyli półokres ok. 2300 s ≈ 7–8 kw. gry. Premia wyceny, która wchodzi tylko przez `getValuationMultiplier` (jak w starym H2), w Euforii trwającej 1–3 kw. przesunęłaby kurs o 5–15% celu, a nie o +20…+40%. Bańki i krachy nie zadziałałyby. **Premia nastroju musi działać na kurs bezpośrednio** i jednocześnie na wartość godziwą, żeby powrót do wartości jej nie kasował.

### Rozwinięcie pomysłów

**R0 (Z1, Z3, Z5) — pomiar H0, rozszerzony**
- 7 hipotez: h1 asymetria zdarzeń; h2 „zapadka” wartości godziwej; h3 inflacja w przychodach bez odpowiednika w kosztach; h4 skład indeksu (ocalali, debiuty); **h5 premia za przeważanie równych wag co tik**; **h6 reinwestycja** (zwrot z inwestycji spółek `incomeBonus` / koszt, np. 15% przychodu za 100 000 zł; niska wypłata dywidend), czyli zysk na akcję rośnie jak ROE × zatrzymany zysk; **h7 dryf marży** 24 → 28%.
- **Sondy cieni** (liczone obok, bez wpływu na grę): GIG ważony kapitalizacją z limitem 10% na spółkę, średnia „kup i trzymaj” wszystkich spółek z kw. 1, mediana zysku na akcję, C/Z rynku (mediana).
- **Rozkład:** Δln GIG = Δln zysku na akcję + Δln C/Z rynku + premia za przeważanie + reszta (zdarzenia, debiuty).
- **Próba:** ≥ 20 przebiegów × 6,5 roku na wariant i 20 × 20 lat bazowo (wniosek z `kontrola_0.14.2.md`: 10 przebiegów daje szum ±1 pp).
- **Do tego dwa pomiary poboczne na tej samej próbie:**
  - zaufanie funduszu = GIG rozbite na składniki: nadwyżka, obsunięcie, kara makro, premia za wynik, spokój;
  - udział celów korporacji we wpływach prywatnych CEO (R5).

**R1 (Z2, Z4, Z5, Z23) — kalibracja H1**
- **Trend GIG:** najwyżej 3 pokrętła z raportu H0, każde w osobnym commicie z pomiarem. Kandydaci w kolejności:
  1. GIG ważony kapitalizacją z limitem 10% (jeśli h5 ≥ 2 pp). Uczy, czym jest indeks ważony kapitalizacją; fundusz gracza może go wtedy realnie odwzorować;
  2. zwrot z inwestycji spółek albo wypłata dywidend (h6);
  3. `SECTOR_GROWTH_FACTOR` / `INFLATION_PASS_THROUGH` / presja na marże (h3, h7).
- **Cele po H1** (przed nastrojem): mediana GIG 20 lat 7–9%, mediana zysku na akcję 6–8%/rok, C/Z rynku bez trendu (±1 pp/rok). Rozrzut σ ≥ 8 pp — pełny cel 12–20 pp dopiero po H2–H4.
- **Zaufanie i JU:** fundusz = GIG ma mieć zaufanie 45–55 i JU −3…+3%/rok na ≥ 20 przebiegach. Przy GIG 7–9% kara makro (wynik poniżej lokaty) i premia za dodatni wynik uderzą w fundusz indeksowy częściej niż dziś. Propozycja:
  - kara makro liczy niedobór względem lokaty pomniejszony o połowę niedoboru GIG: „klienci częściowo rozumieją, że spadał cały rynek”;
  - potem strojenie bazowego napływu JU.
- **R5:** jeśli na ≥ 20 przebiegach cele korporacji dają CEO > 25% wpływów prywatnych, nagrody za cele CEO dostają limit 25% wpływów z ostatnich 4 kw.
- **Lokaty:** lokata wygrywa z GIG w 25–40% okien 3-letnich, ale w 20 latach GIG ≥ lokata + 2 pp/rok. Lokata ma być realną decyzją w bessie, a nie strategią na zawsze.
- **Ocena zarządu i premia R5:** fundusz = GIG ma dostać ocenę neutralną (środek skali) — pomiar po H1 i ponownie po H5.

**R2 (Z6, Z7, Z8, Z22) — nastrój rynku H2, przebudowany**
- **Stan per rynek:** `marketRegimes.home` (klucz rynku, grunt pod 0.16 — Z26) z polami:
  - `phase`, `quartersInPhase`, `phaseLength`;
  - `premium` i `premiumTarget`;
  - `sentiment` i jego składniki;
  - `peak` i `trough` GIG, `label`, `history` (≤ 40 kw.).
- **Ukryta faza** (silnik): 6 faz jak w planie, z korektą liczb:

| Faza | Długość (kw.) | Cel premii | Nastrój zdarzeń | Zmienność |
|---|---|---|---|---|
| Akumulacja | 2–4 | −10…0% | 0 | ×0,9 |
| Hossa | 4–10 | 0…+15% | +0,3 | ×1,0 |
| Euforia | 1–3 | +20…+35% | +0,6 | ×1,2 |
| Dystrybucja | 1–2 | +10…+15% | −0,2 | ×1,2 |
| Bessa | 2–6 | −10…−25% | −0,5 | ×1,4 |
| Kapitulacja | 1 | −30…−35% | −0,8 | ×1,8 |

  Przejścia jak w planie: Hossa → Euforia 40% / Dystrybucja 60%; Bessa → Kapitulacja 50% / Akumulacja 50%. Średni cykl ok. 17 kw. (ok. 4 lata): 1–2 cykle w grze 6,5-letniej, ok. 5 w 20 latach.
- **Mechanika premii:**
  - premia zbliża się do celu o 25% odległości na kwartał, płynnie co tik;
  - zmiana premii mnoży kurs i wartość godziwą spółki naraz, z siłą zależną od bety sektora: efekt = 1 + β × premia, β 0,5–1,5 (defensywne mniej);
  - nie dotyczy spółek specjalnych, startupów i rynków internetowych;
  - premię liczymy osobno, poza limitem 0,4–1,8 w `getValuationMultiplier`; limit łączny 0,3–2,5.
- **Wyprzedzanie gospodarki:**
  - gdy gospodarka jest w Przegrzaniu, a rynek w Hossie lub Euforii, faza rynku z szansą 25%/kw. kończy się wcześniej;
  - gdy gospodarka jest w Recesji (od 2. kw.), a rynek w Bessie lub Kapitulacji — tak samo.

  Rynek skręca więc średnio ok. 1–2 kw. przed gospodarką.
- **Zdarzenia:** `getCyclePositiveEventBias` = 0,5 + 0,06 × (0,5 × nastrój gospodarki + 0,5 × nastrój fazy rynku).
- **Widoczna etykieta = prawdziwa definicja z GIG, a nie ukryta faza.** Liczona z tygodniowych zamknięć:
  - 🐂 Hossa: ≥ +20% od ostatniego dołka;
  - 🐻 Bessa: ≤ −20% od szczytu;
  - 📉 Korekta: −10…−20% od szczytu;
  - ↔️ Rynek bez trendu: pozostałe.

  Etykieta sama się spóźnia (jak w rzeczywistości), więc nie daje przewagi, i uczy prawdziwej definicji. Szum z planu jest niepotrzebny.
- **Indeks strachu i chciwości 0–100** (zamiast −100…+100; skala jak w znanych indeksach). Liczony co tydzień z 5 jawnych składników, każdy 0–100:
  1. **pęd:** GIG względem swojej średniej z 4 kw. (−15% → 0, +15% → 100);
  2. **szerokość rynku:** % spółek powyżej swojej średniej z 4 kw. (Z22);
  3. **zmienność:** WNR względem mediany z 5 lat (odwrotnie);
  4. **wycena:** C/Z rynku względem mediany z 5 lat;
  5. **apetyt:** debiuty w kw. i zadłużenie botów względem średniej.

  Strefy: < 20 skrajny strach, 20–40 strach, 40–60 neutralnie, 60–80 chciwość, > 80 skrajna chciwość. Wskaźnik jest uczciwy, bo gracz widzi, z czego się składa; nie zna ukrytej fazy.
- **Panel „Sygnały rynku”** (jedna karta): wskaźnik i 5 składników, etykieta, C/Z rynku vs mediana 5 lat i **premia za ryzyko akcji** (nowe): zysk/cena rynku minus oprocentowanie lokaty. Uczy, kiedy akcje są drogie względem bezpiecznej alternatywy.
- **Wykres GIG:** tło w kolorze etykiety (Hossa / Bessa / Korekta).

**R3 (Z9) — bańki sektorowe H3, z liczbami**
- **Start:** 5%/kw. (ok. 19%/rok); ×2 w Hossie i Euforii, ×0 w Bessie i Kapitulacji. Najwyżej 1 bańka naraz, przerwa 4 kw. po pęknięciu.
- **Kandydaci** (istnieją w rejestrze `SECTORS`): Sztuczna inteligencja, Fintech, Biotechnologia, Półprzewodniki, Drony, OZE, Gaming, Nieruchomości. Waga ×2, gdy sektor jest w dobrej fazie cyklu sektora albo był przełom technologiczny.
- **Pompowanie:** premia sektora +5…+12 pp na kw., do +150%.
- **Szansa pęknięcia na kw.:** 4% + 12% × premia + 3% × liczba kwartałów. Przykład: premia +60% w 6. kw. → ok. 29%.
  - ×2 przy podwyżce stóp ≥ 50 pb w kwartale, przy krachu albo przy chybionych wynikach sektora.
- **Pęknięcie:** premia spada do −15…−25% w 1–3 kw., potem wraca do 0 w ciągu 4 kw. Spadek od szczytu: przy +50% ok. −47%, przy +80% ok. −56%, przy +120% ok. −64%.
- **Strona fundamentalna (decyzje, nie tylko obserwacja):**
  - spółki z sektora bańki emitują akcje 2× częściej (tani kapitał — lekcja o rozwodnieniu);
  - startupy z tego sektora debiutują 2× częściej i drożej (okno IPO, niżej).
- **Sygnały:**
  - kolumna „Premia sektora” w skanerze (C/Z sektora / mediana 5 lat − 1);
  - wiadomość w pasku newsów, gdy premia przekroczy +30% („Media: gorączka SI”);
  - wiadomość przy pęknięciu.

**R4 (Z10, Z11, Z20) — krach i bezpieczniki H4**
- **Szansa krachu na kw.:**
  - 0,5% podstawy;
  - +3% w Euforii;
  - +1 pp za każde 10 pp premii ponad +20%;
  - +1 pp, gdy średnia dźwignia botów > 40%.

  Cel: 1–3 krachy na 20 lat (mediana 2) i ≥ 1 w 30–50% gier 6,5-letnich.
- **Przebieg:** premia rynku spada o 25–35 pp w ciągu 1–4 tygodni gry (60–240 s), bezpośrednio na kursach; potem faza Bessa (60%) albo Kapitulacja (40%).
- **Margin call botów (nowe):** w pierwszym tygodniu krachu boty z długiem > 50% wartości portfela sprzedają 20–40% pozycji, a wpływ ich transakcji na cenę pogłębia spadek. Uczy, jak dźwignia zamienia spadek w krach.
- **Bezpieczniki** (progi jak na giełdach USA; zamiast jednego progu 10% z planu): spadek GIG od zamknięcia poprzedniego tygodnia gry:
  - −7% → wstrzymanie handlu na 15 s gry;
  - −13% → na 30 s;
  - −20% → do końca tygodnia.

  Wstrzymanie dotyczy wszystkich (gracz, boty, fundusze); każdy próg działa raz w tygodniu. Wiadomość w pasku.
- **Bank centralny:** po krachu nadzwyczajne cięcie o 50 pb w ciągu tygodnia. Szansa 70%, gdy inflacja ≤ cel + 1 pp, w przeciwnym razie 30%.
- **KNF chłodzi euforię (Z20):** gdy premia > +25% przez ≥ 2 kw., z szansą 50% KNF obniża dopuszczalną dźwignię botów (yolo 0,7 → 0,5, reszta 0,5 → 0,35) na 4 kw. To obniża szansę krachu o 1 pp. Uczy polityki makroostrożnościowej.

**R5 (Z12, Z13, Z15, Z24, Z25) — boty, klienci i rynek H5, z decyzjami gracza**
- **Boty:**
  - yolo_trader i reckless dostają zachowanie „Spekulanta” (Z15, bez nowego bota): w Hossie i Euforii kupują spółki z największym wzrostem z 4 tygodni i biorą więcej kredytu; w Kapitulacji i krachu sprzedają 30–50% pozycji;
  - calm i pro_investor kupują przy wskaźniku < 25 i redukują przy premii > +20%;
  - whale kupuje duże pakiety w Akumulacji;
  - dividend_chaser dokupuje wysokie stopy dywidendy w Bessie;
  - banker bez zmian (0.16: „Bankier” dokupuje w krachu — punkt zaczepienia).
- **Klienci** (istniejące typy):
  - 😨 Strachliwy: szansa paniki ×2, gdy etykieta to Bessa albo Korekta i wskaźnik < 25;
  - 🦊 Spryciarz: napływ ×1,5 przy wskaźniku > 75; odchodzi przy pierwszym kwartale z wynikiem funduszu ≤ −5%.

  Przyczyny w panelu: istniejące „😱 panika” i nowe „🤑 moda na akcje”. Ograniczenie: fundusz = GIG ma zaufanie 45–55.
- **Nowe decyzje gracza (bez nowych paneli):**
  - **Okno IPO (nowe):** wycena debiutu startupu × (1 + premia rynku + premia sektora), w granicach 0,6–1,8. Przy wskaźniku < 25 startup z szansą 60% przekłada debiut o ≤ 2 kw. (chyba że kończy mu się gotówka). Gracz z pulą startupów (0.14.1) ma powód, by w euforii sprzedawać, a w bessie czekać.
  - **Spółki w cyklu rynku (nowe):**
    - przy premii > +15% emisje ×1,5 (×2 w sektorze bańki);
    - przy premii < −15% skupy akcji ×1,5 i apetyt na przejęcia ×1,3 (tanie cele).

    Gracz z tanimi akcjami częściej dostaje wezwanie z premią.
  - **Rynki kapitałowe (Z25):** przychody spółek z podsektorów Rynki kapitałowe i Bank inwestycyjny × 0,8…1,25, liniowo od wskaźnika strachu i chciwości. Uczy, że biura maklerskie są „dźwignią na hossę”.
- **Lekcja:** gracz, który w Kapitulacji trzyma albo dokupuje, bije GIG w długim terminie, ale przejściowo traci klientów Strachliwych.

**R6 (Z14, Z24) — spięcie z grą H6**
- **Akademia:** 12 haseł, odblokowanych przy pierwszym kontakcie:
  - Hossa i bessa (definicja 20%), Korekta;
  - Cykl rynku a cykl gospodarki;
  - Indeks strachu i chciwości, Szerokość rynku;
  - Premia za ryzyko akcji;
  - Bańka spekulacyjna;
  - Krach giełdowy, Bezpieczniki giełdy;
  - Pożyczkodawca ostatniej instancji;
  - Dźwignia i margin call;
  - Obsunięcie kapitału;
  - opcjonalnie Indeks ważony kapitalizacją (jeśli H1 go wprowadzi).
- **Mentor** (3 zadania, ścieżka „Ryzyko”):
  - „Kup przy skrajnym strachu (< 20) i trzymaj 4 kw.”;
  - „Sprzedaj ≥ połowę pozycji w sektorze z bańką przed pęknięciem”;
  - „Przejdź przez bessę z obsunięciem funduszu mniejszym niż GIG”.
- **Pasek newsów:** zmiana etykiety, start i pęknięcie bańki, krach, bezpiecznik, cięcie stóp, KNF. Limit: ≤ 1 wiadomość o nastroju na 2 tygodnie gry (poza krachem).
- **Raport okresu:** etykieta rynku i obsunięcie GIG w okresie.
- **Retrospektywa (nowe):** po zakończeniu Bessy albo Hossy jeden mail, w którym gracz widzi swój wynik obok rynku:
  - wynik GIG i funduszu;
  - najlepszy i najgorszy sektor;
  - obsunięcie gracza vs GIG.

**Nowe pomysły odrzucone już na tym etapie (do pomysłów):**
- zlecenia z limitem i stop-loss — pasują do krachu (poślizg ceny), ale to osobny system handlu;
- „list do klientów” w bessie (komunikacja zarządzającego) — dobra lekcja, ale nowy przycisk i pętla obietnic; odłożone;
- państwowy fundusz kupujący w krachu (Z21) — odłożone do 0.16, gdy będzie więcej rynków.

### Decyzje użytkownika po etapie 2 (2026-10-17)

1. **Faza widoczna dla gracza:** ukryta faza (6 nazw) pokazywana z opóźnieniem, jak w starym planie, a nie definicja techniczna z GIG. Definicja ±20% zostaje jako szybsze potwierdzenie i hasło Akademii.
2. **GIG ważony kapitalizacją** (limit 10% na spółkę) — tak, jeśli H0 pokaże, że równe wagi dają ≥ 2 pp rocznie.
3. **Nowe decyzje w 0.15:** okno IPO; emisje, skupy i przejęcia zależne od nastroju; margin call botów i KNF; rynki kapitałowe i retrospektywa — wszystkie.

---

## Etap 3. Audyt krytyczny

### Ile tego zobaczy przeciętny gracz (z liczb etapu 2)

Średni cykl rynku: Akumulacja 3 + Hossa 7 + Euforia 0,8 (40% × 2) + Dystrybucja 1,5 + Bessa 4 + Kapitulacja 0,5 (50% × 1) ≈ **17 kw.**, a z wcześniejszym końcem faz (wyprzedzanie gospodarki) ok. 15 kw.

| Zjawisko | Gra 6,5 roku (26 kw.) | Gra 20 lat (80 kw.) | Uwagi |
|---|---|---|---|
| Pełne cykle | ok. 1,7 | ok. 5 | bez stałego rytmu, długości losowe |
| Co najmniej jedna faza Bessy | ok. 95% gier | 100% | |
| Spadek GIG ≥ 20% od szczytu | ok. 70–85% | ≥ 95% | cel planu ≥ 50% / ≥ 80% ✅ |
| Euforia | ok. 55% gier | ok. 2 razy | |
| Bańka sektorowa | ok. 0,9 na grę | ok. 2,8 | cel 2–6 na 20 lat ✅ (dolna część) |
| Krach (liczby z etapu 2: 0,5% + 3%) | ok. 15–20% gier | ok. 0,7 | ❌ poniżej celu 1–3 |
| Czas w Dystrybucji, Bessie i Kapitulacji | ok. 35% | ok. 35% | w realnym rynku ok. 20–25% |

**Wnioski z liczb:**
- **Krach jest za rzadki.** Euforia to tylko ok. 5% czasu, więc dodatek „+3% w Euforii” prawie nie działa. Poprawka: podstawa **1,2%/kw.**, Euforia **+6 pp**, premia i dźwignia jak było. Średnio ok. 1,5%/kw.: ok. 1,2 krachu na 20 lat i ok. 33% gier 6,5-letnich z krachem.
- **Za dużo czasu w słabym rynku** (35%) grozi frustracją. Poprawka: Bessa **2–5 kw.** (zamiast 2–6), Hossa **5–10 kw.** (zamiast 4–10). Wtedy ok. 30% czasu w fazach spadkowych, z czego realne spadki to ok. 20–25%.
- **Premia nie ma długiego dryfu:** średnia ważona celów faz ≈ −0,4%. Długi trend GIG zależy więc tylko od H1, a nastrój dokłada rozrzut, nie wzrost ✅.

### Audyt funkcji

| # | Funkcja | Co zobaczy gracz i czy zmieni decyzje | Exploit i przewidywalność | Nuda i frustracja | Kalibracje | Koszt, ryzyko, wydajność, zapis |
|---|---|---|---|---|---|---|
| F1 | H0 pomiar (7 hipotez, sondy cieni) | nic — pomiar | — | — | fundament dla H1 | średni koszt (sondy, presety, ≥ 60 przebiegów); ryzyko niskie (sondy bez wpływu na grę) |
| F2 | H1 trend GIG (≤ 3 pokrętła, ewentualnie GIG ważony kapitalizacją) | rynek mniej „darmowy”, lokata i obligacje mają sens; gracz musi wybierać spółki | GIG ważony kapitalizacją da się odwzorować — fundusz indeksowy przestaje być karany za premię za przeważanie | — | **dotyka wszystkiego, co liczy „ponad GIG”:** zaufanie, ocena zarządu, premia R5 (`PERFORMANCE_BONUS_RATE` liczy nadwyżkę), efekt wydzielenia T4, cele korporacji | średni–duży koszt; **ryzyko wysokie**. Ciągłość wartości GIG przy zmianie metody: łańcuch od wartości z chwili migracji. TIG5 i SIG20 to dziś średnie ceny — przy okazji ważyć je kapitalizacją (tanio, spójnie) |
| F3 | H1 zaufanie i JU | fundusz = GIG przestaje tracić 5–7% JU | — | dziś zła lekcja „indeks przegrywa” — naprawa | B5 (zaufanie ~50); po H5 trzeba zmierzyć ponownie, bo panika klientów zmieni bilans | mały koszt; ryzyko średnie (formuła kary makro) |
| F4 | H1 limit celów korporacji CEO | tylko CEO, rzadko | — | — | R5 | mały; najpierw pomiar (może nie być potrzebny) |
| F5 | H1 lokaty vs GIG | lokata realną decyzją w bessie | lokata „na zawsze” nie może wygrywać — cel GIG ≥ lokata + 2 pp w 20 latach | — | makro, cięcie stóp z H4 obniża lokatę | pomiar, bez kodu (o ile cel spełniony) |
| F6 | H2 ukryta faza i premia | GIG faluje mocniej; każdy gracz to odczuje | długości losowe, przejścia probabilistyczne ✅ | patrz liczby wyżej (poprawka długości) | **premia nie może wchodzić do `fundamentals.fairValue`**: wtedy narzędzie Analityka i skaner pokazywałyby w bańce „wartość godziwą” z premią i lekcja „cena ≠ wartość” by zniknęła. Premia działa na kurs i na cel powrotu w pętli cen, a wartość godziwa pokazywana graczowi zostaje fundamentalna. M&A i wyceny botów liczą się z kursu, nie z wartości godziwej — sprawdzić | pętla cen to gorąca ścieżka: 1 mnożenie na spółkę na tik — pomijalne; **ryzyko średnio-wysokie** (semantyka wartości godziwej, kotwice P9) |
| F7 | H2 faza z opóźnieniem (decyzja użytkownika) | nazwa fazy i „od kiedy” w górnym pasku | **strategia fazowa:** wyjście przy potwierdzonej Dystrybucji, powrót przy potwierdzonej Akumulacji. Szacunek +1,5–2,5 pp/rok ponad GIG — w celu ≤ +4 pp, ale blisko. Zabezpieczenia: Dystrybucja i Akumulacja potwierdzane dopiero po **2 kw.** albo po ruchu GIG −10% / +10%; pomiar strategii w „Jak sprawdzimy” | Kapitulacja (1 kw.) i krótka Euforia (1 kw.) przy opóźnieniu 1 kw. byłyby widoczne dopiero po fakcie. Poprawka: pokazujemy je wstecz („Za nami: kapitulacja”) w historii i w retrospektywie — gracz uczy się, że dno rozpoznaje się po czasie | — | stan ok. 2–4 KB w zapisie |
| F8 | H2 indeks strachu i chciwości + panel sygnałów + premia za ryzyko akcji | wskaźnik w górnym pasku, karta w zakładce Rynek | strategia kontrariańska (kup < 20, sprzedaj > 80) — cel przewagi ≤ +4 pp i ≥ 30% przebiegów gorszych od GIG; składniki z danych, szum ±5 pkt (decyzja: „ze szumem”) | — | — | składniki co tydzień, O(liczba spółek) — pomijalne; potrzebne średnie z 4 kw. na spółkę (z istniejącej historii kwartalnej) |
| F9 | H2 tło faz na wykresie GIG | historia potwierdzonych faz | — | — | — | mały koszt, UI |
| F10 | H3 bańki | ok. 1 na grę 6,5-letnią; decyzja: sprzedać za wcześnie albo za późno | brak terminu, szansa pęknięcia rośnie — cel ≥ 30% szans straty dla „kup na starcie, sprzedaj przy +80%” ✅ | — | emisje ×2 w sektorze bańki zwiększają liczbę akcji — niezmienniki akcji ✅ (istniejąca ścieżka emisji) | średni koszt; premia sektora tą samą drogą co premia rynku |
| F11 | H4 krach | ok. 1 na 3 gry 6,5-letnie | szansa rośnie z premią i dźwignią — sygnał, ale nie data ✅ | rzadki = mocny; krach w 1–4 tyg. może zaskoczyć gracza przy ×200 (całość w ułamku sekundy). Bez okna modalnego — pasek newsów + poczta | ocena zarządu względem GIG chroni gracza; JU: panika Strachliwych | średni koszt |
| F12 | H4 margin call botów | pogłębia krach; ślad w poczcie (boty sprzedają) | — | — | boty mogą przegrać kapitał — `checkWorldInvariants` (akcje = posiadacze) przy masowej sprzedaży | średni koszt; ryzyko średnie (ścieżki sprzedaży botów i kredyt) |
| F13 | H4 bezpieczniki 7/13/20% | przy ×1 widać 15–30 s przerwy; przy ×200 praktycznie niewidoczne (wiadomość zostaje) | — | blokada sprzedaży w panice — zamierzona lekcja | **pułapka w kodzie:** spółki z `tradeHalted` wypadają z GIG (`updateMarketIndexes`) i z pętli cen. Bezpiecznik nie może ustawiać `tradeHalted` na spółkach — potrzebna osobna flaga rynku sprawdzana przy każdym zleceniu (gracz, boty, fundusze botów, ETF-y, banki) | średni koszt; **ryzyko regresji średnie** — wszystkie ścieżki kupna i sprzedaży |
| F14 | H4 nadzwyczajne cięcie stóp | 1 wiadomość, niższe stopy kredytów i lokat | — | — | `rateSens` wycen, lokaty | mały (istniejący bank centralny) |
| F15 | H4 KNF ogranicza dźwignię | 1 wiadomość w euforii, ok. raz na 2 gry | — | — | dźwignia botów | mały |
| F16 | H5 boty wg osobowości | rynek tłumu; ślad w akcjonariacie i poczcie | boty kontrariańskie stabilizują rynek; boty momentum go rozkołysują — strojenie w pomiarze | — | rozrzut GIG (σ), obsunięcie — mierzyć po H5 | średni koszt; ranking „największy wzrost z 4 tyg.” liczony raz na tydzień dla wszystkich botów, nie przy każdej decyzji |
| F17 | H5 klienci zależni od nastroju | panel przyczyn: panika / moda | — | **frustracja:** bessa + panika + kara makro mogą zabrać dużo JU naraz. Limit: odpływ z przyczyny „panika” ≤ 8% JU na kw. | B5 i JU — **drugi pomiar po H5** | mały koszt (istniejące typy klientów) |
| F18 | H5 okno IPO | tylko gracz z pulą startupów (0.14.1); decyzja „sprzedać w euforii” | — | przełożony debiut zamraża pulę do 2 kw. — komunikat z przyczyną | rozliczenie puli (`collectStartupClaims`) bez zmian — zmienia się tylko mnożnik i termin | mały; **odroczenie przez istniejące `parkStartupForListing`** (ścieżka P1) |
| F19 | H5 emisje, skupy, przejęcia wg nastroju | więcej wezwań w bessie; rozwodnienie w euforii | — | — | liczba przejęć wpływa na limity spółek (wchłonięcia zwalniają miejsca) — mierzyć krajowe ≤ 115 / łącznie ≤ 150 | mały (mnożniki istniejących szans) |
| F20 | H5 rynki kapitałowe | kilka spółek; ciekawostka w karcie spółki | — | — | marża podsektora | mały |
| F21 | H6 Akademia (12 haseł) | odblokowywane przy kontakcie | — | — | — | mały |
| F22 | H6 Mentor (3 zadania) | zadania z nagrodą | „kup przy strachu < 20” można spełnić małą pozycją — wymóg ≥ 5% aktywów funduszu | „przejdź przez bessę” zależy od losu — w grze bez bessy zadanie niewykonalne. Rozwiązanie: zadania przydzielane dopiero, gdy zjawisko jest możliwe (bańka trwa / faza Bessa potwierdzona) | — | mały |
| F23 | H6 pasek newsów | 5–10 wiadomości rocznie | — | limit ≤ 1 wiadomość o nastroju na 2 tyg. ✅ | — | mały |
| F24 | H6 retrospektywa | ok. 1 mail na rok | — | — | — | mały |
| F25 | Grunt pod 0.16 (`marketRegimes` per rynek) | nic | — | — | — | mały teraz, oszczędza migrację v16 |

### Czy da się to ominąć

- **Nastrój, bańki i krach dotyczą każdego gracza** — rynek się rusza bez względu na jego decyzje. Gracz może je zignorować i trzymać indeks: przy kalibracji H1/H5 zaufanie ma zostać ok. 50. To dobrze — gra nie zmusza do market timingu, ale go nagradza, gdy jest mądry (cel kontrariański ≤ +4 pp).
- **Do ominięcia w całości:** okno IPO (bez puli startupów), rynki kapitałowe (bez tych spółek), Mentor. Tanie, więc w porządku.

### Wpływ na istniejące kalibracje (podsumowanie)

| Kalibracja | Ryzyko | Kiedy sprawdzamy |
|---|---|---|
| B5: zaufanie i JU funduszu = GIG | wysokie (niższy GIG, bessy, panika) | H1 i ponownie H5 |
| Ocena zarządu (vs GIG) | średnie (zmiana metody GIG) | H1, H5 |
| Premia za wynik R5 (nadwyżka nad GIG) | średnie | H1, H5 |
| Cele korporacji CEO (R5) | niskie | H0 pomiar, H1 ewentualny limit |
| Lokaty i obligacje | średnie (stopy po krachu) | H1, H4 |
| Wydzielenia T4 (efekt ponad GIG) | niskie (metoda GIG) | H1 (kontrola 10 przebiegów presetu `wydzielenia`) |
| Limity spółek (110/150) | niskie (przejęcia ×1,3 w bessie, okno IPO) | H5 |
| Kotwice wyceny P9 (banki, strata) | średnie (premia nie może psuć kotwic) | H2 |

### Wydajność i zapis

- **Czas kroku:** premia (1 mnożenie na spółkę na tik), wskaźnik tygodniowy, ranking botów co tydzień — cel +≤ 5% ✅ realny.
- **Zapis v15:**
  - `marketRegimes` z historią ≤ 40 kw. ok. 3 KB;
  - bańka, krach, bezpiecznik, KNF < 1 KB;
  - szereg wskaźnika ≤ 80 tygodni ok. 1 KB.

  Razem < 0,3% przy 2–3 MB ✅.

### Koszt całej wersji

| Część | Koszt | Ryzyko regresji |
|---|---|---|
| H0 | średni | niskie |
| H1 | średni–duży (iteracje pomiarów) | wysokie |
| H2 | duży | średnio-wysokie |
| H3 | średni | średnie |
| H4 | średni | średnie (bezpiecznik, margin call) |
| H5 | średni | średnie (JU po raz drugi) |
| H6 | mały | niskie |

Zakres podobny do 0.14 (T1–T6). Największe ryzyko to H1 i H2, więc pomiary ≥ 20 przebiegów są obowiązkowe.

### Poprawki z audytu (wpisane do planu)

1. Krach: podstawa 1,2%/kw., Euforia +6 pp.
2. Bessa 2–5 kw., Hossa 5–10 kw.
3. Premia nastroju poza `fundamentals.fairValue`: działa na kurs i na cel powrotu w pętli cen.
4. Bezpiecznik jako osobna flaga rynku, nie `tradeHalted` spółek.
5. Dystrybucja i Akumulacja potwierdzane po 2 kw. albo po ruchu GIG ±10%; Kapitulacja i krótka Euforia pokazywane wstecz.
6. Odpływ z przyczyny „panika” ≤ 8% JU na kw.
7. Zadania Mentora przydzielane, gdy zjawisko jest możliwe; „kup przy strachu” z pozycją ≥ 5% aktywów.
8. Ranking botów momentum liczony raz na tydzień.
9. Przy zmianie metody GIG: łańcuch od wartości z chwili migracji; TIG5 i SIG20 też ważone kapitalizacją.
10. Zaufanie i JU mierzone dwa razy: po H1 i po H5.

---

## Etap 4. Ocena design managera

Odniesienie: redesign 0.14.5 (czat designu, `plany/design/01_ocena.md`, `02_dostepnosc.md`).

Problemy z oceny designu, których 0.15 nie może pogłębić:
- **K1:** górny pasek zajmuje 30% ekranu na desktopie i ok. 70% na mobile;
- **W4:** dymki powiadomień się piętrzą;
- **Ś6:** panel funduszu ma za dużo tekstu tej samej wagi;
- **kolor jako jedyny nośnik informacji** — dziś na wykresach.

### Obciążenie interfejsu — gdzie gracz to zobaczy

| Element 0.15 | Miejsce | Nowe panele / okna | Powiadomienia | Ocena |
|---|---|---|---|---|
| Faza rynku + wskaźnik strachu i chciwości | **jeden element KPI w górnym pasku** („🐂 Hossa · 62 chciwość”) **zamiast** obecnego `marketTrend` | 0 | 0 | ✅ zastępuje, nie dodaje — zgodne z K1 (niski pasek). Na mobile: tylko ikona fazy i liczba |
| Sygnały rynku + historia faz + tło faz na wykresie GIG | **jedno okno „Rynek”**, otwierane kliknięciem elementu KPI; wzorzec z okien Państwo/Kraj (pasek KPI + karty z mini-wykresami) | 1 okno | 0 | ✅ łączy 3 elementy starego planu (panel sygnałów, wykres GIG, historia) w jedno miejsce |
| Premia sektora | kolumna w skanerze + wiersz w karcie spółki (Analityk) | 0 | 0 | ✅ |
| Okno IPO, przełożony debiut | istniejący panel puli startupów: jedna linia przyczyny | 0 | wpis w poczcie | ✅ |
| Bańka, krach, bezpiecznik, cięcie stóp, KNF, zmiana fazy | pasek newsów (0.14.2 P7) | 0 | ≤ 1 wiadomość o nastroju na 2 tyg. | ✅ bez dymków; krach bez okna modalnego |
| Retrospektywa | poczta (1 mail na zmianę Bessa/Hossa) | 0 | ok. 1 mail/rok | ✅ |
| Przyczyny odpływu klientów | istniejący panel „Dlaczego klienci…” | 0 | istniejące powiadomienie > 10% JU | ✅ |
| Faza w raporcie okresu | jedna linia w raporcie okresu | 0 | 0 | ⚠️ panel funduszu przeładowany (Ś6) — nie dokładamy tam kafelków, tylko 1 linię tekstu w raporcie |
| Akademia, Mentor | istniejące okna | 0 | „📘 Nowe hasło” (istniejące) | ✅ |

**Razem:** 1 nowe okno, 1 element KPI w miejsce starego, 1 kolumna skanera, 0 nowych typów powiadomień. To lżej niż stary plan (osobny panel sygnałów, tło wykresu, pasek strachu i faza jako dwa elementy paska).

### Spójność i czytelność

- **Nazwy faz:** 6 nazw (Akumulacja, Hossa, Euforia, Dystrybucja, Bessa, Kapitulacja) to dużo dla nowego gracza.
  - Każda faza ma ikonę, kolor **i** krótki opis w dymku: „Euforia — ceny dużo ponad fundamentami, ryzyko krachu rośnie”.
  - Hasło Akademii „Hossa i bessa” pokazuje cały cykl jako diagram.
- **Dostępność (krok 2 designu):** kolor nie może być jedynym nośnikiem.
  - Tło faz na wykresie GIG dostaje podpis fazy w pasku nad wykresem.
  - Wskaźnik strachu i chciwości ma liczbę i słowo strefy, a nie tylko kolor.
  - Animacja wskaźnika tylko z regułą `prefers-reduced-motion`.
- **Język:** „Faza (potwierdzona 1 kw. temu): Hossa” zamiast żargonu. Słowa „premia” i „dyskonto rynku” zawsze z liczbą („ceny 18% ponad fundamentami”).
- **Komponenty:** nowe UI 0.15 budujemy z komponentów systemu designu 0.14.5 (krok 3: zmienne CSS, karta, pasek KPI, okno). Czat kodu czyta `plany/design/` przed częścią UI. **Plan 0.15 nie określa stylu**, tylko treść i miejsce.

### Zakres wersji i kolejność

- **Czy 0.15 nie jest za duża?** Jest duża (7 części), ale spójna: każda część dotyka jednego mechanizmu, a UI to głównie jedno okno. Dzielenie na dwie wersje rozbiłoby kalibrację — zaufanie i JU trzeba zmierzyć po H5, a nie wydawać wersji z niezmierzonym bilansem.
- **Punkt kontrolny po H1:** po H1 gra jest już grywalna i zbalansowana (GIG 7–9%) bez nastroju. Jeśli H2–H6 się przeciągną, H1 może zostać scalone osobno (bez zmiany wersji zapisu).
- **Kolejność:** H0 → H1 → H2 → H3 → H4 → H5 → H6 zostaje.
  - **UI przesunięte do części, które je tworzą:** H2 robi element KPI i okno „Rynek”, H3 kolumnę skanera, H4 wiadomości w pasku. H6 robi tylko Akademię, Mentora i retrospektywę.
  - Dzięki temu każda część jest od razu sprawdzalna w grze.
- **Do odrzucenia z powodu designu:** muzyka (brak systemu dźwięku, a redesign go nie przewiduje) i scenariusz „Wielki Kryzys” (brak systemu scenariuszy i ekranu wyboru).

---

## Etap 5. Decyzje kierownika planowania

Legenda:
- ✅ **ZATWIERDŹ**;
- 🔁 **DO PONOWNEGO PLANOWANIA** — poprawione w tym czacie, wersja po poprawce jest w planie;
- ❌ **ODRZUĆ** — dopisane do `pomysly_na_kolejne_wersje.md`, jeśli warto wrócić.

| # | Projekt | Decyzja | Uzasadnienie / co poprawiono | Część |
|---|---|---|---|---|
| Z1 | Pomiar składników GIG | ✅ | rozszerzony o h5 (równe wagi co tik), h6 (reinwestycja), h7 (marża) i sondy cieni; ≥ 20 przebiegów na wariant | H0 |
| Z2 | Trend GIG 7–9% | ✅ | ≤ 3 pokrętła z raportu H0; σ pełna dopiero po H2–H4 | H1 |
| Z3 | Dryf marży | ✅ | jako hipoteza h7 i ewentualne pokrętło | H0/H1 |
| Z4 | JU funduszu = GIG | 🔁 | dopisana formuła kary makro (połowa niedoboru GIG odliczona) i **dwa pomiary** (po H1 i po H5) | H1, H5 |
| Z5 | Cele korporacji CEO > 25% | ✅ | najpierw pomiar; limit 25% tylko gdy potwierdzony | H0/H1 |
| Z6 | Nastrój, 6 faz, premia | 🔁 | premia działa **na kurs i cel powrotu, poza wartością godziwą**; Bessa 2–5 kw., Hossa 5–10 kw.; Kapitulacja −30…−35%; stan per rynek | H2 |
| Z7 | Faza z opóźnieniem (decyzja użytkownika) | 🔁 | 1 kw. dla Hossy, Euforii i Bessy; 2 kw. dla Akumulacji i Dystrybucji; wcześniej przy GIG ±20%; krótkie fazy pokazywane wstecz | H2 |
| Z8 | Sygnały rynku | 🔁 | jedno okno „Rynek” (KPI, 5 składników, wykres GIG z fazami, historia); wskaźnik 0–100 z 5 składników i szum ±5 | H2 |
| Z9 | Bańki sektorowe | ✅ | z liczbami (5%/kw., pęknięcie 4% + 12% × premia + 3% × kw.); efekt wg udziału segmentu | H3 |
| Z10 | Krach i bezpieczniki | 🔁 | szansa 1,2%/kw. + 6 pp w Euforii; progi 7/13/20%; **osobna flaga rynku** zamiast `tradeHalted` | H4 |
| Z11 | Nadzwyczajne cięcie stóp | ✅ | 50 pb; 70% / 30% wg inflacji | H4 |
| Z12 | Boty wg osobowości | ✅ | ranking momentum raz na tydzień | H5 |
| Z13 | Klienci wg nastroju | 🔁 | limit odpływu z paniki 8% JU/kw.; Spryciarz odchodzi po kw. ≤ −5% | H5 |
| Z14 | Akademia, Mentor, newsy, raport | 🔁 | Mentor przydziela zadania, gdy zjawisko trwa; „kup przy strachu” ≥ 5% aktywów; UI przeniesione do H2–H4 | H6 |
| Z15 | Bot „Spekulant” | ✅ | jako zachowanie yolo_trader i reckless, bez nowego bota | H5 |
| Z16 | Opcje i CFD | ❌ | decyzja „bez krótkiej sprzedaży”; osobny system instrumentów | — |
| Z17 | Scenariusz „Wielki Kryzys” | ❌ | brak systemu scenariuszy; wraca jako pomysł po 1.0 | — |
| Z18 | Muzyka hossa/bessa | ❌ | brak systemu dźwięku | — |
| Z19 | Zarządzający aktywami z prowizją zależną od rynku | ❌ | brak takiej mechaniki; nie dotyczy tematu wersji | — |
| Z20 | Bank centralny chłodzi hossę | ✅ | jako KNF obniża dźwignię botów w Euforii | H4 |
| Z21 | Państwo kupuje przy dużych spadkach | ❌ (odłożone) | do 0.16 (wiele rynków, zarażanie) | — |
| Z22 | Szerokość rynku | ✅ | składnik wskaźnika strachu i chciwości | H2 |
| Z23 | Lokaty i obligacje jako decyzja | ✅ | mierzalny cel w H1 | H1 |
| Z24 | Komunikat o przyczynie odpływu | ✅ | „😱 panika” (istnieje) i nowe „🤑 moda na akcje” | H5 |
| Z25 | Rynki kapitałowe zależne od hossy | ✅ | przychody × 0,8…1,25 | H5 |
| Z26 | Grunt pod 0.16 | ✅ | `marketRegimes` per rynek, funkcje z parametrem rynku | H2 |
| N1 | GIG ważony kapitalizacją | ✅ warunkowo | tylko jeśli h5 ≥ 2 pp (decyzja użytkownika); TIG5 i SIG20 też | H1 |
| N2 | Margin call botów | ✅ | | H4 |
| N3 | Okno IPO | ✅ | przez istniejące `parkStartupForListing` | H5 |
| N4 | Emisje, skupy, przejęcia wg nastroju | ✅ | mnożniki istniejących szans | H5 |
| N5 | Retrospektywa | ✅ | 1 mail na zmianę Bessa/Hossa | H6 |
| N6 | Premia za ryzyko akcji | ✅ | w oknie „Rynek”, hasło Akademii | H2 |
| N7 | Zlecenia z limitem i stop-loss | ❌ (odłożone) | osobny system handlu | — |
| N8 | „List do klientów” w bessie | ❌ (odłożone) | nowy przycisk i pętla obietnic | — |

**Wynik:**
- 27 zatwierdzonych (z tego 7 po poprawce w tym czacie);
- 7 odrzuconych lub odłożonych — wszystkie dopisane do `pomysly_na_kolejne_wersje.md`.

---

## Etap 6. Stan końcowy

- `plan_0.15_hossa_bessa.md` — przepisany: H0–H6 z poprawkami z etapów 3–5, „Zapis gry i testy” (22 testy, zapis v15), „Jak sprawdzimy” (w tym trzy strategie: kontrariańska, fazowa, bańkowa), „Ryzyka”, „Decyzje (podjęte)”.
- `pomysly_na_kolejne_wersje.md` — 7 odrzuconych lub odłożonych pomysłów.
- `plan_0.13-0.16_mapa.md` — wiersz 0.15 i opis etapu C′.

---

## Poprawki użytkownika po etapie 6 (2026-10-18) i ich audyt

### Zgłoszenie

1. Mediana wzrostu zysku na akcję **8–11%** (zamiast 6–8%), z **gwarantowanymi jednorożcami**.
2. Nowe spółki: **gasnące gwiazdy**, które w połowie gry powoli tracą, aż spadną do ceny giełdy Brązowej albo Śmieciowej.
3. Element zamiast `marketTrend` dostępny **dopiero po umiejętności**; projekt wyglądu zlecić czatowi designu.
4. **Osiągnięcia** w zakładce CV i szkolenia (np. „Przeżyj pierwszy kryzys”, „Wygraj z kryzysem”); osiągnięcia kryzysowe w 0.15.1.
5. **0.15.1:** linie zdarzeń kryzysów: 2008 bankowość, 2001 dot-com (IT, gaming, technologia), 1973 naftowy (surowce), „1933” Czarny czwartek (cały rynek), „2022” pandemia (turystyka, usługi). Spółki zyskują, tracą albo upadają.
6. **0.16:** spółki notowane na innych giełdach pod tą samą nazwą, córki na innych giełdach (zmiana limitu córek), bot inspirowany Benjaminem Grahamem, bardziej odrębny „Wilk”.

### Doprecyzowania (AskUserQuestion)

- **GIG 8–10%** w 20 latach.
- **Jednorożce:** 2–3 na grę, kurs ×5–10.
- **Gasnące gwiazdy:** 2–3 na grę, start w 2.–4. roku.
- **Umiejętność:** Analityk Indeksowy L4–L5.

### Audyt nowych elementów

| Element | Przeciętna gra | Exploit i przewidywalność | Nuda i frustracja | Kalibracje | Koszt i ryzyko | Decyzja |
|---|---|---|---|---|---|---|
| Jednorożce (H1b) | 2–3 w każdej grze; nagroda dla gracza, który czyta przychody i ROE — **najmocniejsza lekcja analizy fundamentalnej w wersji** | gwarancja + widoczne sygnały = pewny zysk. Zabezpieczenia: 1–2 fałszywe tropy, premia wzrostu w C/Z, cel strategii ≤ +5 pp i ≥ 25% przebiegów gorszych | — | podnoszą zysk i GIG — dlatego cele H1a liczone z H1b | średni; ochrona przed przejęciem przez boty i zastępstwo | ✅ |
| Gasnące gwiazdy (H1b) | 2–3 w grze, widoczne (duże spółki) | brak krótkiej sprzedaży → bez exploitu; pułapka dla dividend_chaser i nieuważnego gracza | ryzyko frustracji przy dużej pozycji. Łagodzą to: powolność (8–16 kw.), sygnały i 20% zwrotów akcji | ciągną GIG (górne 20%) — w celu H1a; limit wagi 10% | średni; gwarancja „≤ 75 zł” przez dalsze gaśnięcie (bez twardego ustawienia ceny) | ✅ |
| Widok za umiejętnością (H2b) | gracz bez L4 traci `marketTrend` — mniej informacji na start | utrudnia market timing początkującym (dobrze) | ryzyko „nie wiem, co się dzieje”. Łagodzą to: publiczne wiadomości, retrospektywa dla wszystkich, tani L4 (900 zł), podpowiedź Mentora | — | mały; nowe poziomy w istniejącej umiejętności | ✅ |
| Osiągnięcia (H6b) | ok. 3–6 w grze 6,5-letniej | XP bez pieniędzy — nie da się „farmić” balansu; każde raz na grę | ironiczne ukryte („Pułapka wartości”) zamienia porażkę w lekcję | — | mały; nowy rejestr i sekcja w CV (projekt od designu) | ✅ |
| Linie kryzysów | — (0.15.1) | — | — | korzystają z silnika H4 i szoku sektorowego | w 0.15 tylko punkt zaczepienia (`theme`, `applySectorShock`) | ✅ szkic `plan_0.15.1_kryzysy.md` |
| Zgłoszenia 0.16 | — | — | — | — | — | ✅ dopisane do planu 0.16 (sekcja zgłoszeń) |

### Uwagi do zgłoszenia

- **Daty kryzysów:**
  - Czarny czwartek to 24.10.1929; rok 1933 to dno Wielkiego Kryzysu i fala upadłości banków w USA;
  - krach pandemiczny był w 2020; rok 2022 to bessa z inflacji i wojny.

  W szkicu 0.15.1 linie są opisane wzorem historycznym z poprawnymi datami, a lata ze zgłoszenia stoją obok.
- **Design:** nowe elementy UI 0.15 to element KPI, okno „Rynek”, kolumna skanera, sekcja osiągnięć i 2 poziomy umiejętności. Wszystkie są w sekcji „Zlecenie dla czatu designu” w planie.
