# Plan 0.14 „Struktura spółek” (po 0.13; mapa całości: `plan_0.13-0.16_mapa.md`)

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

Kolejność: T0 (✅ zrobione, `117feec`) → T1 → T2 → T3 → T4 → T5 → T6. Każda część z testami, przebiegiem ×200 i commitem.

**Warunek startu:** domknięty etap A z mapy (`plan_0.13-0.16_mapa.md`): weryfikacja 0.13.1 i pomiar 0.13.

---

## Punkt wyjścia (stan kodu)

- `stock.sector` jest już **tablicą**, a `getSectorProfile` (`core.js`) liczy **zwykłą średnią** profili sektorów. Spółka może mieć kilka branż, ale bez wag.
- Spółki zależne istnieją (`makeSubsidiary`, `isSubsidiaryOf`, `subsidiaries`; 50% zysku córki trafia do matki). Powstają jednak tylko przez przejęcie lub dominujący wpływ, nigdy przez wydzielenie.
- Niezmiennik akcji („akcje w obrocie = suma posiadaczy”) jest kluczowy, bo spin-off dzieli akcje między wszystkich posiadaczy. Błąd „akcje ponad wolny obrót” (bank inwestycyjny + ETF) **naprawiono w 0.13.1** (`b3cd5a5`, „duchy posiadaczy” P3). Brakuje jeszcze potwierdzenia w długim przebiegu (mapa, A1); bez niego nie zaczynamy T4.
- **Limity spółek z 0.13.1** (`companies.js`): miękki limit krajowy 100 (`LISTING_SOFT_CAP`), twardy 110 (`LISTING_HARD_CAP`), łącznie 150 zwykłych spółek (`LISTING_TOTAL_CAP`). Decyzja: limit krajowy jest **luźny, ok. 110**; 111–115 jest w porządku.

## T1. Porządek kategorii, segmenty działalności i filtry (fundament danych)

### T1a. Słownik sektorów (porządek kategorii)

**Problem (stan kodu):**
- Duble:
  - `Bankowość Komercyjna` ma profil identyczny z `Bankowość`;
  - `Finanse Konsumenckie` jest prawie takie samo jak `Finanse`;
  - `Logistyka` jest prawie taka sama jak `Transport`.

  Każda nazwa ma **osobny cykl sektora** (`macro.sectorCycles`) i osobne mediany, więc dwa banki z różnymi etykietami zachowują się różnie w makro.
- Typ banku `Międzynarodowy` (`BANK_TYPES.INTERNATIONAL`) trafił do `stock.sector` jako etykieta bez profilu i pojawia się jako chip filtra.
- Etykieta `Usługi` dopisywana jako druga „z rozpędu” (np. przy Mediach i pożyczkach) zapycha filtr.
- Mediany, Akademia i skaner biorą `sector[0]`, więc kolejność w tablicy decyduje o porównaniu.
- Gaming ma profil, ale 0 spółek (spółki dochodzą w 0.16 G0).

**Rozwiązanie:**
- **Jeden rejestr `SECTORS`** (w `core.js`, zastępuje rozproszone listy): nazwa, ikona, grupa, profil (`SECTOR_PROFILES`), podsektory (T2). Jest jedynym źródłem dla profili, cykli, mediany, filtrów, skanera i Akademii.
- **Kanoniczna lista sektorów i grup** (kolejność wyświetlania):

| Grupa | Sektory |
|---|---|
| 💰 Finanse | Bankowość; Finanse |
| 🛒 Konsumpcja | Żywność; Dobra konsumpcyjne; Turystyka; Media; Gaming |
| 🏭 Przemysł i surowce | Przemysł; Chemia; Energia; Budowlany; Transport i logistyka |
| 🏥 Zdrowie i nauka | Medycyna; Badania |
| 💻 Technologia | Technologia |
| 🏢 Nieruchomości | Nieruchomości |
| 🛡️ Obronność | Obronność |
| 🧰 Usługi | Usługi |

- **Mapowanie starych nazw** (przy wczytaniu zapisu i w definicjach spółek):

| Dziś | Po zmianie |
|---|---|
| `Bankowość Komercyjna` | sektor `Bankowość`, podsektor **Bank komercyjny** |
| bank typu inwestycyjnego | `Bankowość`, podsektor **Bank inwestycyjny** |
| `Międzynarodowy` (etykieta) | usunięta z sektorów → `Bankowość`, podsektor **Bank międzynarodowy** |
| `Finanse Konsumenckie` | sektor `Finanse`, podsektor **Pożyczki konsumenckie** (profil: C/Z 10, stopy 0,8 jako modyfikator podsektora) |
| operatorzy rynków, domy maklerskie | `Finanse`, podsektor **Rynki kapitałowe** |
| `Logistyka`, `Transport` | jeden sektor **Transport i logistyka** (podsektory: Logistyka, Lotnictwo z T2) |
| `common` (w definicjach technologii) | zostaje jako klucz technologii, ale **nie jest sektorem**: filtr i rejestr go pomijają |

- **Para `Bankowość` + `Finanse` na jednej spółce** (np. `['Bankowość Komercyjna', 'Finanse']`) daje jeden segment `Bankowość`. Bank to bank; nie liczymy go dwa razy w finansach.
- **Reguła drugiej etykiety:** sektor poboczny zostaje tylko wtedy, gdy jest prawdziwym segmentem (T1b, udział ≥ 20%). Doklejone `Usługi` usuwamy, jeśli spółka nie ma takiego segmentu.
- **Cykle sektorów:** `macro.sectorCycles` tylko dla kanonicznych sektorów. Przy migracji cykl zdublowanej nazwy znika, a zostaje cykl sektora docelowego.
- **Typ instrumentu osobno od sektora:** REIT, holding, ETF, startup, fundusz i operator rynku to **filtr „Typ”**, a nie chip sektora. Dziś REIT jest wyjątkiem w `getMarketSectorList`.
- **Test rejestru:** każda spółka (także startupy, zbrojeniówka, przykrywki mafii i spółki z 0.16) ma wyłącznie sektory z rejestru; brak `Międzynarodowy`, `common` i starych nazw po migracji.

### T1b. Segmenty działalności

- **`stock.segments = [{ sector, subsector|null, share }]`**: udziały w przychodach, w sumie 1,0, najwyżej 3 segmenty.
  - `stock.sector` zostaje dla zgodności i jest wyliczany z segmentów.
  - `getSectorProfile` liczy **średnią ważoną** udziałami.
- **Migracja:** dzisiejsze spółki wielosektorowe dostają równe udziały, czyli wynik taki sam jak teraz.
- **Karta spółki:** wykres „Struktura przychodów” (segmenty), segment główny wyróżniony.
- **Cykl sektora** działa na spółkę proporcjonalnie do udziałów segmentów, a nie średnią jak dziś.
- **Sektor główny** = segment o największym udziale. Mediany sektora, Akademia, skaner i opisy spółek biorą sektor główny zamiast `sector[0]`.
- **Akademia:** hasło „Segmenty działalności”.

### T1c. Filtry i widok kategorii
- **Chipy sektorów pogrupowane** według tabeli z T1a: ikona grupy i liczba spółek przy każdym sektorze (np. „Bankowość 9”). Ukryte są sektory z 0 spółek.
- **Domyślnie filtr pokazuje spółki, dla których to sektor główny.** Przełącznik **„także segmenty poboczne”** pokazuje też spółki z tym segmentem pobocznym (oznaczone ikoną ◐).
- **Po wybraniu sektora** pojawia się drugi rząd chipów z jego **podsektorami** (T2) i liczbą spółek. W skanerze jest ten sam filtr.
- **Filtr „Typ”:** akcje / REIT / holding / ETF / startup / operator rynku.
- **Karta spółki:** sektor główny z ikoną, podsektor i specjalizacja (T3) oraz pasek segmentów (T1b).
- **Zapamiętany wybór** filtra (sektor, podsektor, przełącznik) w `localStorage`, jak inne ustawienia widoku.

## T2. Podsektory

Jeden do trzech podsektorów na sektor (Bankowość ma trzy z porządku nazw w T1a). Każdy modyfikuje profil rodzica i ma własną nazwę na karcie i w skanerze. **Tylko trzy mają własną mechanikę**, żeby zakres nie eksplodował.

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
| Transport i logistyka | Lotnictwo | beta 1,8, wrażliwość na ceny energii | — |
| Transport i logistyka | Logistyka | profil dawnej Logistyki (C/Z 14, wzrost +1 pp) | — |
| Bankowość | Bank komercyjny / inwestycyjny / międzynarodowy | inwestycyjny: beta 1,4, zmienność ×1,2; międzynarodowy: wrażliwość na kursy walut (0.16) | — (porządek nazw z T1a) |
| Finanse | Pożyczki konsumenckie | C/Z 10, stopy 0,8 (dawne `Finanse Konsumenckie`) | — |
| Finanse | Rynki kapitałowe | beta 1,5 (obroty rosną w hossie) | — |
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
- **Wejście w podsektor:**
  - Koszt 5–10% rocznych przychodów, 2–4 kw.
  - Segment dostaje podsektor. Przy udziale ≥ 70% jednego segmentu spółka dostaje premię „skupienia”: marża +1,5 pp.
- **Specjalizacja (nisza) — pojęcie wspólne z 0.16:**
  - Lżejsza od podsektora etykieta segmentu: **bez własnego profilu wyceny**, z jednym modyfikatorem albo jednym typem zdarzeń.
  - Lista na 0.14: Media → TV, Rozrywka; Medycyna → Farmaceutyki; Technologia → Wywiad i obronność. 0.16 dopisuje Motoryzacja → Premium.
  - Przykłady modyfikatorów: TV i Rozrywka — zdarzenie „hit albo klapa sezonu”; Farmaceutyki — marża +2 pp i ryzyko wygaśnięcia patentu; Wywiad — przychody rosną z wydatkami na obronność.
  - Koszt 3–5% rocznych przychodów, 2 kw.; zmiana specjalizacji kosztuje tyle samo i zeruje premię „skupienia” na 2 kw.
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
- **Limit liczby spółek (decyzja):** spin-off może przekroczyć twardy sufit 110 **do 115 spółek krajowych** (limit luźny). Powyżej 115 albo przy pełnym łącznym suficie 150 możliwy jest tylko carve-out: córka zależna nie liczy się do limitu krajowego (zgodnie z 0.13.1). Bot-większościowiec chętniej przejmuje słabe spółki (M&A), a wchłonięcia z T6 zwalniają miejsca.
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

## T6. Spółki zależne: zarządzanie, usamodzielnienie, wchłonięcie, sprzedaż

Przeniesione z `pomysly_na_kolejne_wersje.md` (decyzja: część 0.14). Dziś córki powstają tylko przez przejęcie lub dominujący wpływ i oddają matce stałe 50% zysku.

- **Skąd się biorą córki:** przejęcie i dominujący wpływ (bez zmian), carve-out (T4), a do tego koncern (T5) może zamiast rozszerzenia segmentu **założyć córkę**. Córka startuje na giełdzie BRONZE z 20–30% akcji w ofercie publicznej, a ofertę kupują boty, fundusze i gracz.
- **Zarządzanie przez matkę:**
  - matka ustala **transfer zysku 30–70%** (dziś stałe 50%); wyższy transfer obniża kurs córki, bo mniejszościowi dostają mniej;
  - pożyczka wewnątrzgrupowa: matka może dokapitalizować córkę w kryzysie (do 20% gotówki matki);
  - polityka kadrowa (0.13) może być wspólna dla grupy;
  - gracz-większościowiec matki może tym sterować, ale nie musi; domyślnie decyduje prezes matki.
- **Usamodzielnienie:** matka schodzi poniżej 50%, sprzedając akcje w ofercie wtórnej (kurs córki −3–6%) albo oddając resztę akcjonariuszom jako spin-off (T4). Córka traci `isSubsidiaryOf`.
- **Wchłonięcie:**
  - przy ≥ 90% akcji matka może **przymusowo wykupić** resztę z premią 10–20% i połączyć spółki;
  - segment córki wraca do matki (T1), córka znika z giełdy i **zwalnia miejsce w limicie**;
  - gracz z pakietem mniejszościowym dostaje gotówkę po cenie wykupu.
- **Sprzedaż pakietu kontrolnego:**
  - matka sprzedaje pakiet innemu inwestorowi (bot, fundusz bota, koncern) z **premią za kontrolę** 15–30%;
  - kupujący, który przekracza 50%, ogłasza **wezwanie** na resztę akcji po tej samej cenie przez istniejący proces M&A (`ma.js`); mniejszościowi mogą sprzedać albo zostać.
- **Ochrona przed tunelowaniem:** transakcje matka–córka po cenach odbiegających od rynku o ponad 10% dają czerwoną flagę „transakcje z podmiotami powiązanymi” (jak w T5).
- **Częstotliwość (cel na przebieg):** wchłonięcia 1–2, usamodzielnienia 1–2, sprzedaże pakietów 0–2, nowe córki koncernów 1–3.
- **Akademia:** hasła „Premia za kontrolę”, „Wezwanie i ochrona mniejszości”, „Przymusowy wykup (squeeze-out)”.

---

## T0. Szybsze przebiegi testowe: prędkości ×100 i ×200 (przed T1)

Cel: przebiegi symulacyjne (6,5 roku gry) trwają dziś przy ×50 ok. 2,5–3 min na grę. Przy ×100 będzie to ok. 1,3 min, a przy ×200 ok. 40 s, więc testy ×N można powtarzać po każdej części.

- **Przyciski:** `x100` i `x200` obok ukrytych `x10` / `x50` w `index.html` (klasa `debug-only`, widoczne tylko w trybie debug), `setGameSpeed(100)` / `setGameSpeed(200)`.
- **Zapis gry:** prędkości testowe nie są zapisywane — `applySaveSnapshot` przyjmuje dziś tylko 1, 2, 5 i tak zostaje (wczytana gra startuje z normalną prędkością).
- **Pętle:** przy ×200 tik rynku co 5 ms, a kwartał co 1,5 s. Trzeba sprawdzić pętle liczone jako `X / speedMultiplier`:
  - czy żadna nie schodzi poniżej ~4 ms (minimalny interwał przeglądarki) — jeśli tak, ograniczyć ją dolnym progiem albo wykonywać kilka kroków w jednym wywołaniu;
  - odświeżanie UI przy dużych prędkościach już jest rzadsze (`uiRefreshTick`) — rozszerzyć regułę na ×100 i ×200;
  - autozapis co `60000 / speed` (300 ms przy ×200) — przy prędkościach testowych wyłączyć albo rzadziej.
- **Pomiar:** czas tiku (dziś śr. ok. 1,5 ms, p95 ok. 5 ms). Jeśli tik trwa dłużej niż interwał, gra zwalnia i ×200 nie jest prawdziwym ×200 — raportować w przebiegu „rzeczywistą prędkość” (kwartały gry na minutę).
- **Zgodność wyników:** krótki test porównawczy (np. 4 gry × 26 kw. przy ×50 i przy ×200) — GIG, liczba spółek, maile na kwartał i niezmienniki pieniędzy i akcji mają się zgadzać w granicach losowości. Kolejność zdarzeń w kwartale nie może zależeć od prędkości.
- **Testy:** `setGameSpeed(200)` ustawia wszystkie pętle; prędkość testowa nie trafia do zapisu.

## Zapis gry i testy

- **Zapis:**
  - `segments`, podsektor, procesy rozszerzeń, pivotów i spin-offów, badania kliniczne i budowy bloków;
  - status koncernu, kooperacje;
  - T6: transfer zysku córki, pożyczki wewnątrzgrupowe, trwające wezwania.

  **Migracja:** najpierw mapowanie starych nazw sektorów (T1a: Bankowość Komercyjna, Finanse Konsumenckie, Międzynarodowy, Logistyka, Transport) i połączenie cykli sektorów. Potem segmenty z obecnych sektorów (równe udziały, bez doklejonych `Usługi`) i podsektory przydzielane raz przy wczytaniu.
- **Testy:**
  - T1a: każda spółka ma tylko sektory z rejestru; po migracji brak `Bankowość Komercyjna`, `Finanse Konsumenckie`, `Międzynarodowy`, `Logistyka`, `common`;
  - T1a: liczba cykli sektorów = liczba sektorów kanonicznych;
  - T1c: filtr „Bankowość” (domyślny) obejmuje wszystkie banki; przełącznik „także segmenty poboczne” zwiększa listę, nie zmniejsza;
  - T1c: filtr „Typ = REIT” nie zależy od sektora;
  - średnia ważona profilu = dzisiejszy wynik przy równych udziałach (dla spółek bez zmienionych nazw);
  - rozszerzenie zwiększa liczbę segmentów i udziały sumują się do 1;
  - dyskonto konglomeratu;
  - spin-off zachowuje akcje, gotówkę i dług;
  - wszyscy posiadacze (także ETF-y) dostają akcje córki proporcjonalnie;
  - carve-out tworzy `isSubsidiaryOf`;
  - limit 110 spółek;
  - badanie kliniczne daje wynik binarny;
  - kooperacja przenosi szok partnera;
  - czerwona flaga przy kooperacji spółek jednego właściciela;
  - T6: wchłonięcie przy ≥ 90% usuwa córkę, oddaje segment matce i zwalnia miejsce w limicie;
  - T6: sprzedaż pakietu kontrolnego wywołuje wezwanie po tej samej cenie;
  - T6: transfer zysku 30–70% zmienia gotówkę matki i córki zgodnie z ustawieniem.

## Jak sprawdzimy (przebieg ×50, a po T0 ×100/×200; 6,5 roku gry)

| Miara | Cel |
|---|---|
| Spin-offy | 2–5 na przebieg |
| Liczba spółek po 6,5 roku | krajowe ≤ 115, zwykłe łącznie ≤ 150 |
| Suma wartości matka + córka 2 kw. po spin-offie vs przed zapowiedzią | średnio +3–8% |
| Rozszerzenia / pivoty rocznie | 2–4 / 1–2 |
| Spółki z ≥ 2 segmentami po 6,5 roku | 25–45% |
| Koncerny | 3–6 (decyzja 14); kooperacje aktywne 4–12 |
| Spółki zależne (T6) | wchłonięcia 1–2, usamodzielnienia 1–2, sprzedaże 0–2 na przebieg |
| GIG rocznie vs 0.13 | różnica ≤ ±2 pp |
| Niezmiennik akcji | 0 naruszeń |

## Decyzje (podjęte)

1. **Rola gracza w wydzieleniu:** większościowiec może, ale nie musi, wpływać na specjalizację, rozszerzenia i wydzielenia. Domyślnie decyduje prezes i walne. Każdy akcjonariusz dostaje akcje córki proporcjonalnie do posiadanych akcji matki.
2. **Podsektory:** 1–2 na sektor; tylko Biotechnologia, Energetyka jądrowa i Fintech mają własną mechanikę.
3. **Warunek wstępny:** błąd „więcej akcji niż wolny obrót” (bank inwestycyjny + ETF) naprawiono w 0.13.1. Przed T4 trzeba go potwierdzić długim przebiegiem (mapa, A1).
4. **Limit przy spin-offie:** luźny limit krajowy ok. 110 — spin-off dozwolony do 115 spółek krajowych, powyżej tylko carve-out (córka zależna nie liczy się do limitu krajowego).
5. **Spółki zależne** (z pliku pomysłów) wchodzą do 0.14 jako T6.
6. **Pojęcia:** podsektor ma własny profil wyceny (T2); specjalizacja to lżejsza etykieta niszy z jednym modyfikatorem (T3) — tak samo w 0.16.
7. **Porządek kategorii** w 0.14 T1 (T1a), przed segmentami: jedna migracja zapisu.
8. **Bankowość i Finanse** to dwa sektory z podsektorami: Bankowość (bank komercyjny, inwestycyjny, międzynarodowy) i Finanse (pożyczki konsumenckie, rynki kapitałowe, fintech).
9. **Transport i Logistyka** łączą się w sektor „Transport i logistyka” z podsektorami Logistyka i Lotnictwo.
10. **Filtr sektora:** domyślnie sektor główny i przełącznik „także segmenty poboczne”; chipy pogrupowane z liczbą spółek, a po wyborze sektora lista podsektorów; osobny filtr „Typ”.
11. **Zdarzenia sektora Bankowość:** po porządku nazw (T1a) banki dostają zdarzenia sektora Bankowość, co jest poprawne. Dla równowagi (4 pozytywne : 2 negatywne) dochodzą 2 negatywne zdarzenia bankowe: podatek bankowy i masowe pozwy kredytobiorców. Realizacja razem z T2.
12. **Państwowy program jądrowy:** budowa bloku zdarzała się 0,15 razy na przebieg. Teraz są 2 spółki jądrowe na starcie (np. Państwowy Uran i Elektrownia SA), a spółka państwowa może budować blok bez własnej gotówki: Skarb Państwa finansuje go według partii rządzącej. Cel: 0,5–1,5 budowy na przebieg. Realizacja jako pierwszy commit T3.
13. **T4 po kontroli** (2026-10-15): efekt wydzielenia mierzymy **ponad GIG** z tego samego okresu (cel +3–8% sumy matka + córka po 2 kw.); jeśli nadal za dużo, obniżyć skok przy zapowiedzi. Szansa wydzielenia 4% → **5,25%** na kwartał (cel 2–5 na grę). Do zrobienia jako pierwszy commit nowego czatu kodu, przed T5.
14. **Koncerny po T5** (2026-10-16): cel zmieniony z 3–8 na **3–6** średnio na przebieg. Po T5 wyszło 2,4, więc warunek luzujemy minimalnie, aż do celu (najpierw próg kapitalizacji 10% → 15%). Znaczek koncernu to 🏢, bo 🏛️ oznacza Skarb Państwa.
15. **Poprawki po kontroli końcowej 0.14** (2026-10-16), przed 0.15:
    - **dywidenda spółki zależnej** trafia do **każdego** akcjonariusza proporcjonalnie, także do funduszu gracza i mniejszościowych. Dziś w starym kodzie idzie w całości do matki. Transfer zysku do matki (30–70%, T6) zostaje osobnym mechanizmem; test: mniejszościowy dostaje dywidendę = stopa × jego akcje;
    - **koncern:** dodatkowy warunek struktury „≥ 2 segmenty i ≥ 1 spółka zależna”, a próg kapitalizacji wraca na górne 15%. Cel 3–6 (decyzja 14);
    - **mniej nowych córek koncernów** (było 3,6 na grę, cel 1–3) i **wyższa szansa rozszerzenia o segment** (było 22% spółek z ≥ 2 segmentami, cel 25–45%);
    - **zapis 3,26 MB po 20 latach:** odchudzenie przed 0.16 (G0), nie teraz.
