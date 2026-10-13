# Plan 0.14.1 „Rynek startupów — naprawa” (po 0.14 T3, przed T4)

Cel: pieniądze w inkubatorze nigdy nie znikają po cichu. Każda złotówka wpłacona do startupu, bezpośrednio albo przez pulę, kończy jako akcje po debiucie, zwrot albo **zgłoszona** strata. Gracz widzi, gdzie są jego pieniądze.

Zgłoszenie użytkownika (2026-10-14): wpłacił do puli, pieniądze zeszły z konta, a mimo długiego czasu nie dostał żadnych akcji.

Zakres (decyzja): **tylko naprawa błędów i widoczność**. Zasady działania puli (losowy wybór startupu, interwał) zostają. Dochodzi wypłata niezainwestowanej części z opłatą 2%.

Kolejność: R0 → R1 → R2 → R3 → R4. Każda część z testami, przebiegiem ×200 i commitem.

---

## Diagnoza (przegląd kodu, stan `zmiany-AI` po 0.14 T2)

| # | Błąd | Gdzie | Skutek |
|---|---|---|---|
| A | `removeStartup` rozlicza fundusz (`playerPortfolio`), boty, banki i fundusze botów, ale **pomija `startup.poolInvestors`** | `companies.js`, `removeStartup` | Każde zakończenie inne niż debiut zeruje wkład puli bez komunikatu: upadek, oszustwo, porażka po komplikacjach, opóźnienie z porażką. To samo dotyczy przejęcia startupu czekającego na miejsce na giełdzie: udziałowcy dostają 105–200% wkładu, a pula 0. |
| A′ | Startup gotowy do debiutu, a giełda pełna (sufit ~110 z 0.13.1) → `awaitingListing` → po 8 kw. przejęcie przez `removeStartup` | `processAwaitingListings` | Przy pełnej giełdzie (stan normalny od połowy gry) to **najbardziej prawdopodobna ścieżka** zgłoszonego przypadku: pula czeka 8 kw. i traci wszystko przez błąd A. |
| B | Pieniądze w puli (niezainwestowane i zainwestowane przez pulę) **nie wchodzą do NAV** | `player.js`, `getFundAssets` | Wpłata do puli od razu obniża NAV, wynik względem GIG i ocenę zarządu. Bezpośrednie wkłady w startupy są w NAV, przez `playerPortfolio`. |
| C | Pula inwestuje tylko w startupy w fazie `funding` i tylko od 1000 zł; brak wycofania | `processPoolInvestments` | Gdy nie ma startupów w zbiórce, pieniądze leżą bez końca i bez informacji. |
| D | Panel puli pokazuje tylko niezainwestowane wkłady; portfel pokazuje `playerStakes.player` jako „Wkład w pulę” | `displayInvestmentPool`, `ui.js` (portfel) | Nie widać, w które startupy pula weszła ani co się z nimi stało. |
| E | `investmentPool.playerStakes` nie maleje po upadku (wynika z A) | `removeStartup` | Zawyżony „Wkład w pulę” w portfelu; `getFundStartupExposure` liczy martwe pieniądze, więc limit 10% aktywów na startupy blokuje się na stałe. |

---

## R0. Audyt przepływów pieniędzy w inkubatorze (najpierw, bez zmian zachowania)

Przejść **wszystkie ścieżki** życia startupu i wpisać do raportu, czy każde źródło wkładu jest rozliczane:

- **Ścieżki:**
  - debiut;
  - debiut po oczekiwaniu na miejsce;
  - przejęcie po oczekiwaniu;
  - oszustwo;
  - porażka;
  - opóźnienie, potem sukces albo porażka;
  - komplikacje: ratunek albo upadek;
  - prywatyzacja (Anioł Biznesu poz. 5);
  - startup operatora rynku (D1);
  - ubezpieczenie.
- **Źródła wkładu:**
  - fundusz gracza (bezpośrednio);
  - pula (gracz i boty);
  - auto-inwestowanie w startup (`updateStartupAutoInvestTimers`, `acceptStartupOffer`);
  - boty;
  - fundusze kolegów (`botFundInvestInStartups`);
  - banki (`processBankStartupSponsorship`);
  - anioł biznesu (zdarzenie);
  - dopłata przed debiutem (`ipoPriceBonus`).
- **Narzędzie: niezmiennik inkubatora (test i `checkWorldInvariants()` jako ostrzeżenie):**
  - dla każdego startupu: `currentFunding` ≈ suma roszczeń + wpłaty bez roszczeń (anioł biznesu), z tolerancją;
  - dla puli: `wpłaty − wypłaty = niezainwestowane + w startupach + rozliczone (akcje po koszcie, zwroty, straty)`. Licznik rozliczeń jest prowadzony per uczestnik.
- **Wynik:** tabela ścieżka × źródło (✅ / ❌) w raporcie `plany/raporty/audyt_startupow_0.14.1.md`. Błędy z diagnozy (A–E) i nowo znalezione naprawiamy w R1–R4. Błąd spoza tej listy, który wymaga zmiany zasad, wraca do planowania.

## R1. Rozliczenie puli przy każdym końcu startupu (błędy A, A′, E)

- `removeStartup` rozlicza `poolInvestors` **tak samo jak bezpośrednich inwestorów** (ten sam `refundMin`–`refundMax`):
  - przejęcie po oczekiwaniu: uczestnicy puli dostają 105–200% swojego wkładu;
  - porażka i oszustwo: zwrot według ścieżki (0–70%);
  - ubezpieczenie funduszu nie obejmuje wkładu przez pulę, bo jest kupowane na konkretny startup.
- Zwrot idzie **do puli jako niezainwestowane środki uczestnika** (`contributors`), a nie od razu na konto. Pula zainwestuje je ponownie albo gracz je wycofa (R3). Dzięki temu pieniądze nie wracają w połowie operacji poza kontrolą limitu 10%.
- `investmentPool.playerStakes[id]` maleje o rozliczony wkład w każdej ścieżce: debiut (już działa), zwrot i strata.
- **Komunikat dla gracza** przy każdym rozliczeniu z jego udziałem: wpis w dzienniku i w kwartalnym raporcie inkubatora, bez nowego maila na każde zdarzenie:
  - „🏊 Pula: {startup} — debiut, Twój udział: X akcji”;
  - „🏊 Pula: {startup} upadł — Twoja strata Y zł”;
  - „🏊 Pula: {startup} przejęty — zwrot Z zł do puli”.
- **Migracja zapisu** (bez zmiany wersji, pola opcjonalne):
  - przy wczytaniu `playerStakes.player` przeliczamy z faktów: niezainwestowane + wkłady w żyjących startupach;
  - martwe kwoty po startupach, których już nie ma, schodzą do zera z jednorazowym wpisem „korekta wkładu w pulę”;
  - **pieniędzy nie oddajemy wstecz**, bo nie wiemy, jaką ścieżką startup zniknął (decyzja 4).

## R2. Pula w NAV funduszu (błąd B)

- `getFundAssets` dolicza:
  - **niezainwestowaną część puli należącą do gracza** (`contributors.player`), po wartości nominalnej;
  - **wkłady gracza przez pulę w żyjące startupy**, po koszcie, tak jak bezpośrednie wkłady (`investedAmount`) w `getHoldingMarketValue`.
- Test: wpłata do puli nie zmienia NAV (±0). Upadek startupu obniża NAV o stratę, a debiut zamienia koszt na wartość akcji.
- `getFundStartupExposure` liczy wkład przez pulę z faktów (jak wyżej), a nie z `playerStakes`.

## R3. Wypłata z puli i martwe pieniądze (błąd C)

- Przycisk **„Wycofaj z puli”**: gracz wycofuje dowolną część **niezainwestowanych** środków. Opłata 2% trafia do puli, czyli do pozostałych uczestników proporcjonalnie, a gdy ich nie ma, do zarządcy inkubatora. Pieniądze już zainwestowane w startupy zostają do ich końca.
- **Status puli** w panelu:
  - „Pula czeka: brak startupów w fazie zbiórki”;
  - „Za mało środków (min. 1000 zł)”;
  - „Następna inwestycja za X s”.
- Boty nadal mogą wpłacać; nie wycofują (bez zmian zasad).

## R4. Widoczność: panel puli i portfel (błąd D)

- **Panel puli:**
  - **Niezainwestowane:** łącznie i Twoje.
  - **W startupach:** lista: startup, etap, kwota puli, Twój udział w zł i %.
  - **Historia rozliczeń** (ostatnie 10): debiut z liczbą akcji, zwrot, strata.
- **Portfel funduszu:** dwa wiersze zamiast jednego: „Pula — niezainwestowane” i „Pula — w startupach”, z wartościami zgodnymi z NAV (R2).
- **Karta startupu:** w liście inwestorów pozycja „Pula Inwestycyjna (w tym Ty: X zł)”.

---

## Zapis gry i testy

- **Zapis:** v14 bez zmiany wersji. Nowe pola opcjonalne: historia rozliczeń puli, licznik rozliczeń per uczestnik. Migracja `playerStakes` jak w R1.
- **Testy** (`tests/tests.html`), po jednym na ścieżkę z udziałem puli:
  - debiut: akcje proporcjonalnie do wkładu;
  - debiut po oczekiwaniu;
  - przejęcie po oczekiwaniu: zwrot 105–200% do puli;
  - oszustwo: 0;
  - porażka: zwrot według ścieżki;
  - komplikacje → ratunek: akcje;
  - komplikacje → upadek: zwrot;
  - prywatyzacja: zwrot do puli;
  - wpłata do puli nie zmienia NAV;
  - wypłata z puli z opłatą 2%: opłata trafia do pozostałych uczestników;
  - `playerStakes` po każdej ścieżce = fakty;
  - limit 10% nie blokuje się po upadku;
  - migracja starego zapisu z martwym `playerStakes`;
  - niezmiennik puli i inkubatora.

## Jak sprawdzimy (przebieg ×200, 6,5 roku gry)

Preset przebiegu: gracz co kwartał wpłaca do puli i inwestuje bezpośrednio w 1 startup (do limitu 10%).

| Miara | Cel |
|---|---|
| Niezmiennik puli (wpłaty − wypłaty = niezainwestowane + w startupach + rozliczone) | 0 rozjazdów |
| Rozliczenia bez komunikatu dla gracza | 0 |
| Skok NAV w chwili wpłaty do puli | 0 |
| `playerStakes.player` vs fakty | różnica 0 przez cały przebieg |
| Wkład w pulę „uwięziony” > 8 kw. bez startupu w zbiórce | widoczny status w panelu; wypłata możliwa |
| GIG, marże, niezmienniki świata | bez zmian względem stanu po T3 |

## Decyzje (podjęte 2026-10-14)

1. **Kiedy:** zaraz po 0.14 T3, przed T4. T4 (spin-offy) dotyka akcji i posiadaczy, więc pieniądze startupów mają być wtedy czyste.
2. **Zakres:** tylko naprawa błędów A–E i widoczność. Pula nadal wybiera startup losowo, w tym samym interwale.
3. **Wypłata z puli:** tak, tylko niezainwestowana część, z opłatą 2%.

4. **Stare zapisy:** bez zwrotu wstecz pieniędzy utraconych przez błąd A. Przy wczytaniu tylko korekta martwego „Wkładu w pulę” do faktów, z wpisem w dzienniku; limit 10% się odblokowuje.
