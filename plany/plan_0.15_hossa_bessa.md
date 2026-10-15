# Plan 0.15 „Hossa i bessa” (po 0.14, przed 0.16 „Giełda międzynarodowa”)

Cel: rynek ma własny nastrój, niezależny od gospodarki. Przechodzi przez hossę i bessę, nadmuchuje bańki i czasem się załamuje. W długim terminie rośnie umiarkowanie, ok. 7–9% rocznie zamiast dzisiejszych 17–19%. Gracz uczy się, że ceny mogą długo odbiegać od fundamentów, że rynek wyprzedza gospodarkę i że strach i chciwość to okazje i pułapki.

Czego to uczy:
- **Cykl rynku a cykl gospodarki:** giełda zwykle wyprzedza gospodarkę o 1–2 kwartały.
- **Wycena a fundamenty:** premia i dyskonto całego rynku, C/Z rynku względem historii.
- **Psychologia:** strach i chciwość, euforia, kapitulacja; „kupuj, gdy krew leje się na ulicach”.
- **Bańki spekulacyjne:** jak rosną, po czym je poznać, jak pękają.
- **Krach i bezpieczniki giełdy:** zawieszenie handlu, reakcja banku centralnego.
- **Zarządzanie ryzykiem:** obsunięcie kapitału (drawdown), dywersyfikacja, gotówka jako opcja.

Zakres (decyzja użytkownika):
- nastrój rynku i fazy;
- bańki i krachy;
- boty i klienci zależni od nastroju;
- **bez krótkiej sprzedaży**.

Kolejność: H0 → H1 → H2 → H3 → H4 → H5 → H6. Każda część z testami, przebiegiem ×200 (6,5 roku i 20 lat) i commitem.

---

## Punkt wyjścia (stan kodu)

- **Cykl gospodarki** (`core.js`, `ECONOMY_PHASES`): Ożywienie → Ekspansja → Przegrzanie → Recesja.
  - Każda faza ma PKB, mnożnik C/Z (0,85–1,20) i `mood`.
  - `marketTrend` (pasek u góry) wynika z indeksu koniunktury.
  - `getCyclePositiveEventBias` przechyla zdarzenia rynkowe (0,46–0,53).
- **Pozostałe składniki:**
  - cykle sektorów (`SECTOR_CYCLE_PHASES`);
  - wskaźnik zmienności `marketVolatilityIndex` (WNR);
  - `getValuationMultiplier` (cykl × stopy × sektor × arystokraci × projekty, limit 0,4–1,8).
- **Nie ma warstwy nastroju rynku** oddzielonej od gospodarki: brak baniek, krachów, premii lub dyskonta całego rynku i bezpieczników.
- **GIG rośnie ok. 17–19% rocznie** (pomiary etapu A i 0.14), a komentarz B5 w `companies.js` zakłada 7–9%. Część różnicy mogły dawać instytuty badawcze z wykładniczą ceną (naprawa w 0.14.2 P1); resztę wyjaśnia H0.

---

## H0. Pomiar: skąd 17–19% rocznie (bez zmian zachowania)

- **Rozkład zwrotu GIG** (20 przebiegów × 20 lat, po 0.14.2) na składniki:
  - wzrost przychodów: trend sektora, PKB, inflacja, kondycja, projekty;
  - zmiana marż;
  - zmiana wyceny (C/Z rynku, `getValuationMultiplier`);
  - zdarzenia rynkowe (przechylenie i siła);
  - debiuty (`ipo_boost`), skupy, emisje;
  - skład indeksu: czy upadłe spółki z niego wypadają, a nowe wchodzą po zawyżonych cenach.
- **Hipotezy do sprawdzenia:**
  - asymetria zdarzeń (dodatnie silniejsze lub częstsze);
  - powrót ceny do wartości godziwej, która sama rośnie z każdą korzystną zmianą;
  - inflacja przenoszona na przychody bez odpowiednika w kosztach;
  - indeks liczony z przetrwałych spółek, czyli efekt ocalałych (survivorship).
- **Wynik:** raport `plany/raporty/pomiar_gig_0.15.md` z tabelą składników (pp rocznie) i rekomendacją, które pokrętła zmienić w H1.

## H1. Kalibracja długiego trendu

- Na podstawie H0 zmieniamy tylko pokrętła wskazane w raporcie, najwyżej 3. Każde w osobnym commicie z pomiarem.
- **Cel długoterminowy** (20 lat, mediana przebiegów): **GIG 7–9% rocznie** nominalnie przy inflacji 2,5–3%, czyli realnie ok. 4–6%.
- **Rozrzut:** odchylenie standardowe rocznych stóp zwrotu GIG 12–20 pp. Rynek ma mieć złe lata, a nie spokojne 8% co roku.
- **Kalibracje zależne od GIG trzeba sprawdzić ponownie:**
  - B5 (zaufanie i JU dla funduszu = GIG ma dalej ok. 50). **Stan wyjściowy z kontroli P12 (2026-10-16, 10×200):** zaufanie 53–56, ale JU −4,7…−7,4%/rok (cel ±3%) — niespełnione już od 0.13.1, więc strojenie JU robimy tutaj, po kalibracji GIG, na ≥ 20 przebiegach;
  - ocena zarządu;
  - premia za wynik (0.14.1 R5);
  - lokaty i obligacje względem akcji: przy niższym GIG lokata ma być realną alternatywą w bessie, ale nie w długim terminie.

## H2. Nastrój rynku i fazy hossy i bessy

**Nowy stan `marketRegime`** (obok `economyCycle`):
- `sentiment`: indeks **strachu i chciwości** od −100 do +100;
- `phase`: faza rynku;
- `premium`: premia lub dyskonto wyceny całego rynku względem fundamentów.

| Faza | Długość (kw.) | Premia wyceny (cel) | Zdarzenia i zmienność | Typowe przejście |
|---|---|---|---|---|
| 🌱 Akumulacja | 2–4 | −10…0% | spokojnie, zmienność ×0,9 | → Hossa |
| 🐂 Hossa | 4–10 | 0…+15% | lekko dodatnie, zmienność ×1,0 | → Euforia (40%) albo Dystrybucja (60%) |
| 🚀 Euforia | 1–3 | +20…+40% | dodatnie, zmienność ×1,2, więcej debiutów | → Dystrybucja albo krach (H4) |
| 🌫️ Dystrybucja | 1–2 | +10…+20%, maleje | mieszane, zmienność ×1,2 | → Bessa |
| 🐻 Bessa | 2–6 | −10…−25% | ujemne, zmienność ×1,4 | → Kapitulacja (50%) albo Akumulacja (50%) |
| 😱 Kapitulacja | 1 | −30…−40% | ostre spadki, zmienność ×1,8 | → Akumulacja |

- **Premia przesuwa się stopniowo** (ok. 25% odległości do celu na kwartał). Wchodzi do `getValuationMultiplier` jako dodatkowy czynnik, a limit 0,4–1,8 zostaje.
- **Powiązanie z gospodarką:** przejścia faz rynku są skorelowane z cyklem gospodarki, ale go wyprzedzają.
  - Bessa zaczyna się zwykle w Przegrzaniu albo na początku Recesji.
  - Hossa zwykle w środku Recesji albo w Ożywieniu (szansa przejścia ×2, gdy faza gospodarki „pasuje”).
  - Uczy, że giełda wyprzedza gospodarkę.
- **Nieprzewidywalność (ochrona przed exploitem):**
  - długości faz losowe w widełkach, a przejścia probabilistyczne;
  - **gracz widzi fazę z opóźnieniem**: oznaczenie „prawdopodobnie hossa” dopiero po potwierdzeniu (1 kw. lub −20% / +20% od szczytu albo dołka, jak w prawdziwych definicjach);
  - indeks strachu i chciwości jest widoczny od razu, ale z szumem.
- **`getCyclePositiveEventBias`** liczy się z fazy rynku (zamiast tylko z gospodarki); siła zdarzeń bez zmian.
- **UI:**
  - w górnym pasku zamiast samego `marketTrend`: **wskaźnik strachu i chciwości** (pasek od 😱 do 🤑) i faza (z opóźnieniem);
  - na wykresie GIG tło w kolorze faz (historycznie potwierdzonych);
  - panel **„Sygnały rynku”**: C/Z rynku względem mediany z 5 lat, odsetek botów w pełni zainwestowanych, liczba debiutów w kwartale, kredyty botów, zmienność.

## H3. Bańki sektorowe

- **Szansa:** ok. 25% na rok gry, że jeden sektor albo podsektor wchodzi w bańkę. Najwyżej 1 bańka naraz, częściej w Hossie i Euforii.
- **Kandydaci:** podsektory i sektory „modne”: Sztuczna inteligencja, Fintech, Biotechnologia, Półprzewodniki, Gaming, Nieruchomości, Energetyka OZE. Wagi zależą od fazy i zdarzeń, np. przełom technologiczny.
- **Przebieg:**
  1. **Pompowanie** (4–10 kw., długość losowa, bez stałego terminu):
     - premia wyceny sektora +5…+10 pp na kwartał, do +60…+150%;
     - więcej debiutów i startupów z tego sektora;
     - newsy w pasku („wszyscy mówią o AI”).
  2. **Pęknięcie:** spadek −40…−70% w 1–3 kw., potem powrót premii do zera.
  3. Szansa pęknięcia rośnie z wysokością premii i długością bańki; impulsem może być podwyżka stóp, korekta wyników w sektorze albo krach rynku.
- **Sygnały dla gracza:**
  - C/Z sektora względem mediany z 5 lat;
  - liczba debiutów w sektorze;
  - udział botów „yolo” w akcjach sektora.

  Skaner dostaje kolumnę „Premia sektora”.
- **Ochrona przed exploitem:** bez stałego terminu, pęknięcie losowe, sygnały wskazują ryzyko, ale nie datę. Cel: strategia „kup na początku bańki, sprzedaj przy premii +80%” ma dodatnią, ale niepewną oczekiwaną stopę zwrotu, z ≥ 30% szans na stratę.

## H4. Krach rynku i bezpieczniki

- **Krach** (rzadki): oczekiwanie ok. raz na 8–15 lat gry.
  - Szansa na kwartał rośnie z długością Euforii, premią rynku i zadłużeniem botów.
  - Spadek GIG −20…−35% w 1–4 tygodnie gry, potem Bessa albo Kapitulacja.
- **Bezpiecznik giełdy:** spadek indeksu o > 10% w jednym tygodniu gry → **zawieszenie handlu** na ułamek tygodnia (dla wszystkich, także botów), z newsem w pasku. Uczy, czym są circuit breakers.
- **Reakcja banku centralnego (makro 0.10.2):** po krachu nadzwyczajne cięcie stóp z szansą zależną od inflacji. Wpływa na wyceny przez `rateSens`.
- **Akademia:** hasła „Krach giełdowy”, „Bezpieczniki giełdy”, „Bank centralny jako pożyczkodawca ostatniej instancji”.

## H5. Boty i klienci zależni od nastroju

- **Boty według osobowości** (`ai.js`):

| Osobowość | Euforia / Hossa | Bessa / Kapitulacja |
|---|---|---|
| yolo_trader, reckless | kupują więcej, biorą kredyt | panicznie sprzedają w Kapitulacji |
| calm, pro_investor | ograniczają zakupy przy premii > +20% | kupują przy strachu < −60 („kontrarianie”) |
| whale | duże pakiety w Akumulacji | trzymają |
| dividend_chaser | bez zmian (stopa dywidendy) | dokupują wysokie stopy dywidendy |

- **Klienci funduszu:**
  - w Bessie i Kapitulacji rośnie odpływ klientów „panikarzy”;
  - w Euforii napływ klientów „goniących wyniki”, którzy odchodzą przy pierwszym spadku.

  Przyczyny trafiają do panelu „Dlaczego klienci odchodzą / przychodzą” (z 0.13.1 B5). **Ograniczenie:** fundusz = GIG zachowuje zaufanie ok. 50 (cel z etapu A).
- **Cel uczący:** gracz, który w Kapitulacji trzyma albo dokupuje, bije GIG w długim terminie, ale przejściowo traci klientów.

## H6. Spięcie z grą: Akademia, Mentor, pasek newsów

- **Akademia:** hasła:
  - „Hossa i bessa”;
  - „Cykl rynku a cykl gospodarki”;
  - „Strach i chciwość”;
  - „Bańka spekulacyjna”;
  - „Obsunięcie kapitału (drawdown)”;
  - hasła z H4.
- **Mentor:** 3 zadania.
  - „Kup w Kapitulacji i trzymaj 4 kwartały”.
  - „Sprzedaj co najmniej połowę pozycji w sektorze z bańką przed pęknięciem”.
  - „Przejdź przez Bessę z obsunięciem funduszu mniejszym niż GIG”.
- **Pasek newsów (0.14.2 P7):** zmiany faz (z opóźnieniem), bańki, krach i bezpiecznik.
- **Ocena zarządu:** bez zmian (względem GIG), ale w raporcie okresu informacja o fazie rynku.

---

## Zapis gry i testy

- **Zapis v15:** `marketRegime` (sentiment, phase, premium, historia potwierdzonych faz), stan bańki (sektor, premia, faza), stan krachu i bezpiecznika.
  - **Migracja:** faza startowa zgodna z obecnym `economyCycle` (Ekspansja → Hossa, Recesja → Bessa), premia 0.
- **Testy:**
  - przejścia faz zgodne z tabelą;
  - premia stopniowo do celu;
  - opóźnione potwierdzenie fazy;
  - bańka bez stałego terminu (rozkład długości);
  - pęknięcie bańki spada w granicach;
  - krach uruchamia bezpiecznik przy > 10% w tygodniu;
  - cięcie stóp po krachu;
  - zachowanie botów według osobowości w fazach;
  - niezmienniki świata;
  - migracja v14 → v15.

## Jak sprawdzimy (przebieg ×200; 20 przebiegów × 6,5 roku i 20 przebiegów × 20 lat)

| Miara | Cel |
|---|---|
| GIG rocznie (20 lat, mediana) | **7–9%** |
| Odchylenie standardowe rocznych stóp GIG | 12–20 pp |
| Bessa (−20% od szczytu) w przebiegu 20-letnim | ≥ 1 w ≥ 80% przebiegów; w 6,5-letnim ≥ 1 w ≥ 50% |
| Największe obsunięcie GIG w 20 latach (mediana) | 30–50% |
| Bańki na 20 lat | 2–6; pęknięcie −40…−70% |
| Krachy (> 20% w ≤ 4 tyg.) na 20 lat | 1–3 |
| Fundusz = GIG: zaufanie i zmiana JU | zaufanie ok. 50; JU ±3% rocznie |
| Przewaga strategii kontrariańskiej (kup przy strachu < −60, sprzedaj przy > +60) | dodatnia, ale ≤ +4 pp rocznie i z ≥ 30% przebiegów gorszych od GIG |
| Niezmienniki świata, czas kroku | 0 naruszeń; czas +≤ 5% |

## Ryzyka

- **Przestrojenie zależnych kalibracji** (B5, R5, ocena, lokaty) → H1 obowiązkowo sprawdza je ponownie.
- **Fazy za przewidywalne** → losowe długości, opóźnione potwierdzenie, szum wskaźnika, cel przewagi ≤ +4 pp.
- **Za dużo spadków dla zabawy** → mediana 7–9% i bessa jako epizod, a nie stan stały; Kapitulacja trwa 1 kw.
- **Pasek newsów zalany zmianami faz** → tylko potwierdzone zmiany i początek lub koniec bańki.

## Decyzje (podjęte 2026-10-14)

1. **Kolejność:** „Hossa i bessa” to 0.15, przed giełdą międzynarodową, która przechodzi na 0.16. Waluty i rynki zagraniczne kalibrujemy już na zrównoważonym rynku.
2. **Zakres:** nastrój rynku i fazy, bańki i krachy, boty i klienci zależni od nastroju.
3. **Bez krótkiej sprzedaży** w tej wersji.
