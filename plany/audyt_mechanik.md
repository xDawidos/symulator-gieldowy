# Audyt mechanik — decyzje (przed etapem B)

Nowy koncept: gracz zarządza pieniędzmi klientów w funduszu (JU, NAV), robi karierę w korporacji
i ma prywatnie pensję. Kolumna „Etap” mówi, kiedy dana decyzja jest realizowana:
- **B** — fundusz gracza;
- **C** — kariera i rywale;
- **E** — świat i instytucje;
- **D** — grafika, błędy, duplikaty.

| Mechanika | Decyzja | Etap |
|---|---|---|
| Handel akcjami (`buyStock`/`sellStock`) | Kupuje i sprzedaje fundusz, nie gracz. Podatek zostaje, ale w nowej formie. Wpływ transakcji na cenę ma być minimalny. | B |
| Gotówka 100 mld, XP 10 mld | Start: **100 zł od babci** + pensja. Pensja (pieniądze za pracę) zastępuje XP. | B |
| Licencje na giełdy | Dostęp do giełd zależy od stanowiska. Naprawić błąd `newExchange`. Nowe giełdy: Rubin, Szmaragd, Diament (opis niżej). | B (dostęp), E (nowe giełdy), D (błąd) |
| Drzewko umiejętności | Zamienia się w **CV z ładną grafiką**. Umiejętności stają się szkoleniami kupowanymi za pieniądze; każde zostawia znak na CV (od brązowego do złotego), a bonusy zostają. Unikanie podatków (San Escobar) **zostaje**. Startupy do przebudowy później. | B |
| Własna firma gracza i praca pasywna | Wyłączyć. | B |
| Minigry | Zamrozić. | B |
| Kredyty, depozyty i hipoteki gracza | Prywatne kredyty gracza znikają. W zamian kredyty dla spółek **oraz dla botów-inwestorów**, żeby banki zarabiały. | B (wyłączenie), E (kredyty botów) |
| Lombard i windykator | **Zostają** i do rozwinięcia: windykator może zabierać akcje graczowi i botom, w lombardzie można zostawiać akcje w zastaw. | E |
| Obligacje i bony | Kupuje je fundusz. Mechanikę zmodernizować. | B (kupujący), E (modernizacja) |
| Podatek od bogactwa i miejski od gotówki gracza i botów | Wyłączyć. | B |
| Miasto, burmistrz, wybory, festyn | **Zostają, do modernizacji.** Z miasta wychodzą spółki miejskie, burmistrz wpływa na decyzje i zdarzenia oraz zleca przetargi. | E |
| Media, PR, gazeta „Puls Rynku” | Zamiana na **skrzynkę mailową wzorowaną na Gmailu**. Każde czasopismo to inna spółka z giełdy pod tą nazwą. Subskrypcje przysyłają maile; można dopłacić za maile tylko z ważnymi informacjami, bez spamu. | E |
| Reklama (popup + adblock) | Zamiana na **spam w mailu**. Umiejętność (szkolenie) najpierw blokuje spam, potem spam z czasopism. | E |
| Startupy, inkubator, pula inwestycyjna | Na razie wyłączyć; decyzja w ostatniej fazie. | B (wyłączenie) |
| Władza korony 👑 | Fundusz **może mieć ponad 50%** i wywierać presję jako większościowiec; obecne mechaniki zostają. Odnowa i nowe mechaniki później. | B (przeniesienie na fundusz), później rozbudowa |
| M&A i wrogie przejęcia | Zostają, do długofalowego rozwoju. | — |
| Banki | Zostają, do modernizacji (w tym model wyceny banków). | E |
| Budownictwo i R&D | Zostają. | — |
| Holdingi | Stają się funduszami-rywalami (zewnętrznymi). | C |
| Boty (`aiCompetitors`) | Zarządcy funduszy wewnętrznych i zewnętrznych **oraz wielcy inwestorzy indywidualni** z własnymi strategiami. | C |
| ETF-y, indeksy | Zostają jako benchmark; fundusz może je kupować. | B |
| REIT-y | Zostają jako aktywo funduszu. | B |
| Ranking | Ranking funduszy wg stopy zwrotu, stabilności i zaufania. | C |
| Reputacja w spółkach | Reputacja funduszu jako akcjonariusza. | B |
| Cechy CEO, instytuty badawcze | Zostają. | — |
| Państwo (nacjonalizacja, prywatyzacja, urząd antymonopolowy) | Zostaje, ale **ma faktycznie działać** (sprawdzić i naprawić). | E |

## Nowe poziomy giełd (etap E)
- **Rubin**
  - spółki z ceną od 5 000 PLN, maks. 6 spółek;
  - premia do stabilności;
  - może założyć jedną spółkę zależną (finansując ją);
  - spółka zależna oddaje matce część przychodu, ma te same polityki i startuje z tymi samymi
    badaniami co matka;
  - spółka zależna nie może przeskoczyć matki na giełdzie, ale może się uwolnić spod jej wpływu.
- **Szmaragd**
  - kapitał od 1 mld, cena od 10 000 PLN za akcję;
  - większa premia do stabilności;
  - do 2 nowych spółek zależnych (przez wykup słabszej spółki albo założenie nowej);
  - maks. 3 spółki zależne, które przekazują matce pieniądze.
- **Diament**
  - największa spółka w grze, dostępna dopiero po 30 minutach gry;
  - może wykupywać akcje spółek z każdego niższego poziomu oprócz Szmaragdu;
  - dąży do monopolu;
  - ma wszystkie bonusy niższych poziomów (warunki do ewentualnego doprecyzowania).

## Etap D: błędy i duplikaty (do naprawy i usunięcia)
- **Błąd:** `buyExchangeLicense` (player.js:1920) używa niezdefiniowanej zmiennej `newExchange`.
- **Błąd:** `playerCompany` nie jest zapisywany w zapisie gry. Firma gracza będzie wyłączona w etapie B,
  więc sprawdzić, czy problem jeszcze istnieje.
- **Błąd:** w rankingu wpis gracza nie ma `id`.
- **Duplikaty do usunięcia** (zostaje jedna wersja):
  - `calculateNetWorth` — player.js i economy.js;
  - `playerBailsOutCompany` — dwie wersje w player.js;
  - `takeMortgageLoan` — companies.js i player.js;
  - `initiateMergerProcess` — dwie wersje w companies.js;
  - `findMajorityShareholder`, `handleTakeover*`, `triggerBankIPOEvent` — companies.js i events.js;
  - `replaceCeo` — companies.js i descriptions.js;
  - `processBankStartupSponsorship` — dwie wersje w companies.js.
