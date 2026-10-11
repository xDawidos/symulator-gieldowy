# Plan 0.14 „Struktura spółek” (szkic, po 0.13)

Cel: spółki żyją jak prawdziwe grupy kapitałowe.
- Zaczynają w jednej branży, rozszerzają działalność na kolejne segmenty, specjalizują się albo zmieniają profil.
- Po dużym wzroście wydzielają spółkę córkę (spin-off) i dają akcjonariuszom jej akcje.
- Największe stają się koncernami i zawierają kooperacje.

Dochodzą podsektory (np. biotechnologia, fintech, energetyka jądrowa).

Czego to uczy:
- **Struktura przychodów i wyceny:** segmenty działalności, wycena sumy części (SOTP) i dyskonto konglomeratu.
- **Spin-off:** czym jest wydzielenie i dlaczego często tworzy wartość, a także czym jest dywidenda rzeczowa.
- **Profil ryzyka:** różnice między podsektorami, np. binarne ryzyko badań klinicznych w biotechnologii albo długie inwestycje w atomie.
- **Strategia spółki:** dlaczego specjalizacja daje wyższą marżę, a dywersyfikacja niższe ryzyko.
- **Łańcuch dostaw:** ryzyko kontrahenta.

Kolejność: T1 → T2 → T3 → T4 → T5. Każda część z testami, przebiegiem ×50 i commitem.

---

## Punkt wyjścia (stan kodu)

- `stock.sector` jest już **tablicą**, a `getSectorProfile` (`core.js`) liczy **zwykłą średnią** profili sektorów. Spółka może mieć kilka branż, ale bez wag.
- Spółki zależne istnieją (`makeSubsidiary`, `isSubsidiaryOf`, `subsidiaries`; 50% zysku córki trafia do matki). Powstają jednak tylko przez przejęcie lub dominujący wpływ, nigdy przez wydzielenie.
- Niezmiennik akcji („akcje w obrocie = suma posiadaczy”) jest kluczowy. Znany otwarty błąd z bankiem inwestycyjnym i jego ETF-em **musi być naprawiony przed T4**, bo spin-off dzieli akcje między wszystkich posiadaczy.
- Ostrzeżenie z testów 0.11: liczba spółek rośnie z 73 do ~97 w 6,5 roku i tabela robi się długa. Spin-offy dokładają spółki, więc potrzebny jest limit (T4).

## T1. Segmenty działalności (fundament danych)

- **`stock.segments = [{ sector, subsector|null, share }]`**: udziały w przychodach, w sumie 1,0, najwyżej 3 segmenty.
  - `stock.sector` zostaje dla zgodności i jest wyliczany z segmentów.
  - `getSectorProfile` liczy **średnią ważoną** udziałami.
- **Migracja:** dzisiejsze spółki wielosektorowe dostają równe udziały, czyli wynik taki sam jak teraz.
- **Karta spółki:** wykres „Struktura przychodów” (segmenty), segment główny wyróżniony.
- **Cykl sektora** działa na spółkę proporcjonalnie do udziałów segmentów, a nie średnią jak dziś.
- **Akademia:** hasło „Segmenty działalności”.

## T2. Podsektory

Jeden lub dwa podsektory na sektor. Każdy modyfikuje profil rodzica i ma własną nazwę na karcie i w skanerze. **Tylko trzy mają własną mechanikę**, żeby zakres nie eksplodował.

| Sektor | Podsektor | Różnica profilu względem sektora | Mechanika własna |
|---|---|---|---|
| Medycyna | **Biotechnologia** | beta 1,6, C/Z 30, wzrost +4 pp, marża −10 pp | **Badania kliniczne:** faza I→II→III co 3–6 kw. Wynik binarny: sukces kurs +40–80%, porażka −40–70%. Szanse 60% / 45% / 60%. |
| Medycyna | Sprzęt medyczny | beta 0,8, marża +3 pp | — |
| Energia | **Energetyka jądrowa** | beta 0,4, amortyzacja 0,14, C/Z 14 | **Budowa bloku:** inwestycja 8–16 kw., zgoda regulatora (ryzyko opóźnienia), potem stabilny przychód. Kontrakty z państwem zależą od partii. |
| Energia | OZE | stopy ×1,5, dotacje wg partii | — |
| Finanse | **Fintech** | beta 1,5, wzrost +5 pp, C/Z 25 | **Licencja KNF:** co rok 10% szans na kontrolę; przy słabej kondycji kara lub zakaz nowych klientów (wzrost 0 na 2 kw.). |
| Technologia | Półprzewodniki | beta 1,8, cykl sektora głębszy ×1,5 | — |
| Technologia | Sztuczna inteligencja | C/Z 35, wzrost +6 pp, zmienność ×1,3 | — |
| Przemysł | Robotyka | wzrost +2 pp, marża +2 pp | — |
| Nieruchomości | Magazyny | beta 1,0, wzrost +2 pp | — |
| Transport | Lotnictwo | beta 1,8, wrażliwość na ceny energii | — |
| Obronność | Drony | wzrost +4 pp, C/Z 22 | — |
| Żywność | Rolnictwo | dotacje Ludowców (0.13), pogoda | — |

- **Przydział na start:** ok. 25–35% spółek dostaje podsektor (pasujący do nazwy lub opisu). Nowe spółki i startupy losują go według szansy.
- **Powiązanie z 0.13:**
  - podsektory oparte na specjalistach (Biotechnologia, Sztuczna inteligencja, Półprzewodniki, Fintech) najmocniej odczuwają niedobór specjalistów;
  - Rolnictwo zależy od dotacji Ludowców.
- **Skaner:** filtr i kolumna podsektora. Mediana podsektora pokazywana obok mediany sektora, gdy ma ≥ 3 spółki.
- **Akademia:** hasła „Ryzyko binarne (biotechnologia)”, „Długi horyzont inwestycji (atom)”, „Regulacja (fintech)”.

## T3. Rozszerzanie, specjalizacja i zmiana profilu

Decyzje podejmuje prezes według cech, kondycji i cykli. **Większościowiec może zatwierdzić, zablokować albo zlecić** decyzję, ale nie musi.

- **Rozszerzenie (nowy segment):**
  - Warunki: kondycja ≥ 2, gotówka ≥ 15% rocznych przychodów, < 3 segmenty.
  - Koszt: 10–20% rocznych przychodów, budowa 4–8 kw. Nowy segment startuje z udziałem 10% i rośnie o 2–5 pp na kwartał do celu 20–40%.
  - **Powiązane branże** (tabela, np. Technologia–Gaming, Chemia–Przemysł, Energia–Przemysł, Budowlany–Nieruchomości, Medycyna–Badania) mają szansę sukcesu 80% i synergię +1 pp marży. Niepowiązane: 55% i brak synergii.
  - Porażka: odpis 50–100% kosztu i kurs −5–10%.
- **Specjalizacja (wejście w podsektor):**
  - Koszt 5–10% rocznych przychodów, 2–4 kw.
  - Segment dostaje podsektor. Przy udziale ≥ 70% jednego segmentu spółka dostaje premię „skupienia”: marża +1,5 pp.
- **Zmiana profilu (pivot):**
  - Udział segmentu głównego spada o 20–40 pp na rzecz nowego.
  - Przez 4 kw. marża −3 pp i zmienność ×1,3. Potem nowy profil.
  - Ryzyko 30%, że pivot „nie wyjdzie”: segment znika, a koszty zostają.
- **Częstotliwość (cel):** na rynku ok. 2–4 rozszerzenia i 1–2 pivoty rocznie.
- **Dyskonto konglomeratu:** wycena (C/Z docelowe w `fairValue`) −4% za każdy niepowiązany segment ponad pierwszy, maksymalnie −10%. Powiązane segmenty bez dyskonta.
- **Akademia:** hasła „Dywersyfikacja a specjalizacja”, „Synergia”, „Dyskonto konglomeratu”.

## T4. Wydzielenie spółki córki (spin-off)

- **Warunki zapowiedzi:**
  - spółka ma ≥ 2 segmenty;
  - segment do wydzielenia ma udział ≥ 30% i jest niepowiązany albo ma inny podsektor;
  - spółka jest na giełdzie GOLD lub wyżej (albo w górnych 25% kapitalizacji);
  - kondycja ≥ 1.
- **Częstotliwość:** szansa 4% na kwartał dla spełniających warunki; większościowiec (bot lub gracz) może zlecić od razu, ale nie musi.
- **Przebieg:**
  1. **Plotka** (opcjonalnie, kwartał przed zapowiedzią): przy Analityku poziomu 3 widoczna z wiarygodnością 60%.
  2. **Zapowiedź:** kurs +3–8% z szumem. Rynek wycenia zniknięcie dyskonta konglomeratu i od razu dyskontuje ruch, więc nie ma darmowego zysku po ogłoszeniu.
  3. **Walne** (istniejący system z `ma.js`) po 1 kw.: głosowanie akcjonariuszy; większościowiec rozstrzyga.
  4. **Wydzielenie:**
     - nowa spółka na giełdzie o 1–2 szczeble niższej;
     - przychody segmentu, proporcjonalna część aktywów, długu i gotówki;
     - pracownicy segmentu (0.13);
     - nowy prezes;
     - nazwa pochodna (np. „Techno Industrial”).
- **Akcje:** dywidenda rzeczowa. **Każdy posiadacz akcji matki** (gracz, fundusz, boty, ETF-y, insiderzy, państwo) dostaje akcje córki **proporcjonalnie** do posiadanych.
  - Kurs matki spada o wartość wydzielonej części; znacznik na wykresie (jak dzień odcięcia dywidendy).
  - Wariant **carve-out (25% przypadków):** matka zachowuje 51–80%, a córka jest `isSubsidiaryOf`, z istniejącym transferem zysku.
- **ETF-y i indeksy:** córka trafia do portfeli ETF-ów razem z matką; przy rebalansowaniu może wypaść.
- **Limit liczby spółek:** gdy na rynku jest ≥ 110 spółek notowanych, spin-off jest możliwy tylko jako carve-out. Bot-większościowiec chętniej przejmuje słabe spółki (M&A), co zmniejsza listę.
- **Niezmienniki (testy obowiązkowe):**
  - akcje córki w obrocie = suma posiadaczy;
  - wartość matki przed = matka po + córka (± efekt zapowiedzi);
  - gotówka i dług się sumują.
- **Akademia:** hasła „Spin-off i dywidenda rzeczowa”, „Wycena sumy części (SOTP)”.

## T5. Koncerny i kooperacje

- **Koncern:** nowa klasa spółki (znaczek 🏛️), gdy spółka ma ≥ 3 segmenty albo ≥ 2 spółki zależne i jest w górnych 10% kapitalizacji.
  - Koncern zawiera **kooperacje**: umowy dostawca–odbiorca z innymi spółkami (najwyżej 3 na koncern).
- **Kooperacja** (8–16 kw.):
  - Obie strony: wzrost +0,3 pp na kwartał, marża +0,5 pp, tylko między segmentami powiązanymi.
  - **Ryzyko kontrahenta:** strajk (0.13), bankructwo albo korekta wyników partnera przenosi połowę szoku na drugą stronę.
  - Zerwanie: kara umowna.
- **Większościowiec-gracz** może zaproponować kooperację między swoimi spółkami. Ochrona przed **tunelowaniem**:
  - synergia tylko dla segmentów powiązanych;
  - kooperacja między spółkami jednego właściciela, gdy udziały są nierówne (np. 80% i 20%), generuje **czerwoną flagę „transakcje z podmiotami powiązanymi”** (skaner, Księgowy poziom 4);
  - pakiet mniejszościowy może zgłosić skargę do KNF.
- **Karta koncernu:** mapa grupy (zależne, kooperanci) i suma części vs kapitalizacja, czyli dyskonto lub premia holdingowa.
- **Akademia:** hasła „Grupa kapitałowa i holding”, „Ryzyko kontrahenta”, „Transakcje z podmiotami powiązanymi”.

---

## Zapis gry i testy

- **Zapis:**
  - `segments`, podsektor, procesy rozszerzeń, pivotów i spin-offów, badania kliniczne i budowy bloków;
  - status koncernu, kooperacje.

  **Migracja:** segmenty z obecnych sektorów (równe udziały), podsektory przydzielane raz przy wczytaniu.
- **Testy:**
  - średnia ważona profilu = dzisiejszy wynik przy równych udziałach;
  - rozszerzenie zwiększa liczbę segmentów i udziały sumują się do 1;
  - dyskonto konglomeratu;
  - spin-off zachowuje akcje, gotówkę i dług;
  - wszyscy posiadacze (także ETF-y) dostają akcje córki proporcjonalnie;
  - carve-out tworzy `isSubsidiaryOf`;
  - limit 110 spółek;
  - badanie kliniczne daje wynik binarny;
  - kooperacja przenosi szok partnera;
  - czerwona flaga przy kooperacji spółek jednego właściciela.

## Jak sprawdzimy (przebieg ×50, 6,5 roku gry)

| Miara | Cel |
|---|---|
| Spin-offy | 2–5 na przebieg |
| Liczba spółek po 6,5 roku | ≤ 115 |
| Suma wartości matka + córka 2 kw. po spin-offie vs przed zapowiedzią | średnio +3–8% |
| Rozszerzenia / pivoty rocznie | 2–4 / 1–2 |
| Spółki z ≥ 2 segmentami po 6,5 roku | 25–45% |
| Koncerny | 3–8; kooperacje aktywne 4–12 |
| GIG rocznie vs 0.13 | różnica ≤ ±2 pp |
| Niezmiennik akcji | 0 naruszeń |

## Decyzje (podjęte)

1. **Rola gracza w wydzieleniu:** większościowiec może, ale nie musi, wpływać na specjalizację, rozszerzenia i wydzielenia. Domyślnie decyduje prezes i walne. Każdy akcjonariusz dostaje akcje córki proporcjonalnie do posiadanych akcji matki.
2. **Podsektory:** 1–2 na sektor; tylko Biotechnologia, Energetyka jądrowa i Fintech mają własną mechanikę.
3. **Warunek wstępny:** naprawa błędu „więcej akcji niż wolny obrót” (bank inwestycyjny + ETF) przed T4.
