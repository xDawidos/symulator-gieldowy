# Plan 0.17.3 „Rozmowy i Tied”

Specyfikacja po decyzjach użytkownika z 2026-11-05. Zastępuje szkicowy zakres z 2026-10-27. Kolejność wersji: **najpierw Rozmowy, potem 0.17.2 Energia, na końcu 0.17.1 balans**, bo balans musi widzieć nowe drogi pieniędzy. Wszystkie liczby są startowe, do strojenia w testach.

## Cel

Tied staje się miejscem relacji. Gracz zbiera kontakty, czyta posty prezesów, wiceprezesów i inwestorów, reaguje na nie, a im bliższa relacja, tym więcej widzi. Charakter rozmówcy jest ukryty i gracz odczytuje go ze stylu postów.

## Decyzje

1. **Kontakty:** lista w Tied. Prezes trafia do niej, gdy gracz choć raz kupił akcje jego spółki. W karcie spółki, w sekcji „Prezes”, jest link do profilu na Tied.
2. **Rozmówcy:** prezesi, wiceprezesi i wyróżnieni inwestorzy-boty.
3. **Bez udziałów:** można reagować na post prezesa, który wyświetla się w Tied. Polubienie daje +1 do relacji. Komentarz to wybór 1 z 3 losowych tekstów, np. „Super!”, „Gratuluję!”, „Trzymamy za was kciuki :)”.
4. **Treść postów:** poza wynikami prezesi dają delikatne podpowiedzi o rozwoju, dywidendzie, skupie akcji, zmianie strategii i planach przejęcia.
5. **Odbiorcy postów:** publiczne, dla znajomych, dla zaufanych znajomych.
6. **Zmiana prezesa:** relacja zostaje przy osobie, która odchodzi. Nowy prezes spoza spółki zaczyna od zera.
7. **Wiceprezesi:** od giełdy Złotej i progu kapitalizacji, 1–3 w spółce. Mają konta w Tied, postują, można mieć z nimi relację. Gdy wiceprezes zostaje prezesem, relacja się utrzymuje.
8. **Premia:** dodatnia relacja z prezesem daje lekki bonus do reputacji w spółce.
9. **Walne zostaje:** odwołanie, dywidenda, zmiana banku i pozostałe decyzje działają jak dziś.
10. **VIP-y przechodzą na Tied:** wiadomość VIP-a to także mail w zakładce „Ważne”.
11. **Charaktery:** 7 (3 pozytywne, 2 neutralne, 2 negatywne dla gracza). Gracz nie widzi typu, typ zdradza styl postów.
12. **Boty i fundusz:** bez sprzedaży po cenie innej niż NAV. Gracz zbiera **obietnice** zakupu jednostek pod warunkiem wykonania celu. Obietnice są w TeamedUP! jako karteczki. Niespełnienie obniża relację z botem.

Dotychczasowe ustalenia, które zostają: jedna skala relacji −100…+100, 1 rozmowa z osobą na kwartał gry, „szybka rozmowa” jako słabsza opcja, brak losowania po wyborze odpowiedzi.

## Stan kodu (sprawdzone 2026-11-05)

- Prezes to obiekt w `stock.ceo` bez identyfikatora: `name`, `age`, `tenure`, `traits`, `timers`. Trzeba dodać `id`.
- `playerTransactions` jest czyszczone po pełnej sprzedaży (`player.js:466`), więc kontakty potrzebują własnego pola.
- Zastąpienie prezesa idzie przez `replaceCeo` (8 wywołań). Wariant z kandydatem przyjmuje obiekt, co pasuje do awansu wiceprezesa.
- Decyzje spółek zapadają w chwili wykonania: skup z `ceo.timers.buyback`, dywidenda w `reviewDividendPolicy`, strategia w `processStrategyQuarterly`, przejęcia losowo. Prawdziwa zapowiedź wymaga wyboru z wyprzedzeniem (patrz R2).
- W Poczcie nie ma zakładki „Ważne”. Są Odebrane, Oznaczone, PULS, FLESZ, OBSER i Spam. Maile mają pole `importance`.
- VIP: oferta z `maybeCreateVipOffer`, decyzja w `pitchVip`, mail z `action: { type: 'vip' }`.
- Relacje botów: `botRelations.values`, zanik 5% kwartalnie, tabela w panelu funduszu.
- Limit postów Tied: 60 (`TIED_POST_LIMIT`), pole `mailbox.tied`.

## R0. Osoby, relacje, kontakty

- `ceo.id`: nadawane przy tworzeniu, stare zapisy dostają je przy wczytaniu.
- Relacje z prezesami i wiceprezesami w `botRelations.values` pod kluczem `ceo:<id>`. Zanik i `getRelation` działają bez zmian. Tabela prezentów w panelu funduszu pokazuje dalej tylko inwestorów i kolegów.
- `playerProfile.contacts`: lista identyfikatorów osób z nazwą, spółką i rolą, dopisywana przy `buyStock` (także dla osób, które później odeszły ze spółki).
- Tied odblokowuje się jak dziś. Kontakty zbierają się wcześniej i czekają.
- Zakres startowy: spółki krajowe. Spółki zagraniczne poza zakresem.
- Zapis: `SAVE_FORMAT_VERSION` 22, pola opcjonalne. Relacje równe 0 nie trafiają do zapisu.

### Progi relacji

| Poziom | Próg | Dostęp |
|---|---|---|
| Kontakt | Dowolna relacja | Posty publiczne |
| Znajomy | ≥ +20 | Posty dla znajomych |
| Zaufany znajomy | ≥ +60 | Posty dla zaufanych |

Reakcje dają najwyżej +2 kwartalnie na osobę. Przy zaniku 5% sufit z samych reakcji to +40, więc do „znajomych” da się dojść polubieniami, a do „zaufanych” potrzebne są rozmowy i spełnione obietnice.

Polubienie: raz na post, +1. Komentarz: raz na post, +1, wybór 1 z 3 tekstów z puli. Oba wliczają się w limit +2.

### Premia do reputacji

Relacja z prezesem ≥ +40: +1 kwartalnie do `stock.reputation.player`, przez `changeReputation`, do górnej granicy +30 z tego źródła.

## R1. Tied: profile i kontakty

- Czwarty widok obok kanału: lista kontaktów z rolą, spółką, słownym poziomem relacji i filtrem (prezesi, wiceprezesi, inwestorzy, VIP-y).
- Profil osoby: rola, spółka, staż, relacja słowem i miernikiem, ostatnie posty, przycisk rozmowy, odnośnik do karty spółki.
- Link w karcie spółki przy nazwisku prezesa (`renderCompanyCardOverview`, `ui.js:4356`). Wiceprezesi w tej samej sekcji, od razu z linkami.
- Post dostaje polubienie i komentarz. Post niedostępny dla gracza widać jako wpis z autorem i informacją „dla znajomych” bez treści.

## R2. Posty i zapowiedzi

### Rodzaje

| Odbiorcy | Treść | Przykład |
|---|---|---|
| Publiczne | Wyniki, współprace, hasła | „Z dumą dzielę się wiadomością…” |
| Znajomi | Kierunek bez szczegółów | „Coraz częściej rozmawiamy w zarządzie o akcjonariuszach.” |
| Zaufani | Bliżej konkretu, bez liczb | „Przyglądamy się mniejszemu graczowi z sektora Chemia.” |

### Zapowiedzi

- Spółka ma najwyżej 1 plan: `stock.plannedMove = { type, atQ, real }`, typy `dividend`, `buyback`, `strategy`, `takeover`.
- Plan powstaje 1–2 kwartały wcześniej i to on wykonuje decyzję. Częstość zdarzeń ma zostać taka jak dziś, co sprawdza kontrola.
- Prawdziwość zależy od charakteru autora, patrz tabela. Plan może też odpaść z przyczyn zewnętrznych, więc podpowiedź nigdy nie jest pewnikiem.
- Podpowiedź bez liczb i dat, tylko kierunek.
- `TIED_POST_LIMIT` zostaje 60. Zmiana limitu tylko po pomiarze zapisu.

## R3. Wiceprezesi

- Warunek: giełda Złota lub wyższa oraz kapitalizacja od progu do ustalenia na danych (start: mediana spółek ze Złotej). Liczba 1–3 rośnie z kapitalizacją, stała dla spółki z hasha symbolu.
- Obiekt jak prezes, w `stock.deputies`. Cechy: dokładnie 1 z 15 cech wiceprezesa i najwyżej 1 z `ceoTraits`.
- Gdy spółka spada pod próg, nowi nie przychodzą, obecni zostają do końca kadencji.
- Awans: `replaceCeo(stock)` bez kandydata wybiera wiceprezesa, jeśli jest (szansa start 70%). Przy walnym wiceprezesi są na liście kandydatów. Relacja zostaje pod tym samym `ceo:<id>`, nowy zastępca dochodzi z opóźnieniem 1–2 kwartałów.
- Po awansie cecha wiceprezesa zostaje jako nieaktywna historia w profilu, a prezes dostaje zwykły zestaw przez `assignCeoTraits`, z zachowaniem cechy z `ceoTraits`.

### 15 cech wiceprezesa

Efekty małe, do sprawdzenia przy wdrożeniu, czy dany parametr istnieje.

| Cecha | Działanie |
|---|---|
| Gaduła | Postuje dwa razy częściej |
| Milczek | Postuje rzadko, ale podpowiedzi są trafniejsze |
| Plotkarz | Część postów dla zaufanych widzą już znajomi |
| Towarzyski | Reakcje wobec niego liczą się w limicie jako +3 zamiast +2 |
| Rzecznik | Publiczne posty spółki pojawiają się częściej |
| Skarbnik | Zmienność kursu −2% |
| Inżynier | Badania spółki +5% szybciej |
| Sprzedawca | Przychody +0,5% |
| Kontroler | Koszty −0,5% |
| Prawnik | Odporność na zdarzenia +5% |
| Kadrowy | Mniejsze ryzyko strajku lub odejść pracowników |
| Następca | Większa szansa awansu na prezesa |
| Aspirant | Większa szansa awansu, ale po pominięciu odchodzi ze spółki |
| Lojalny | Nie odchodzi przy zmianie prezesa ani właściciela |
| Stary wyga | Po awansie zachowuje staż z pracy w spółce |

## R4. Charaktery i rozmowa

### Charaktery

Dotyczą prezesów, wiceprezesów i VIP-ów. Boty dostają charakter przez mapowanie ze swojej osobowości (`personality`).

| Charakter | Dla gracza | Styl postów | Zapowiedzi |
|---|---|---|---|
| Rachmistrz | Pozytywny | Rzeczowo, o marży i kosztach | Prawdziwe 90% |
| Mentor | Pozytywny | Dzieli się lekcjami, spokojny ton | Prawdziwe 85%, częstsze dla znajomych |
| Lojalista | Pozytywny | Dziękuje ludziom i partnerom | Prawdziwe 80%, relacja zanika o połowę wolniej |
| Zachowawczy | Neutralny | Ostrożnie, „stabilnie”, „bez pośpiechu” | Prawdziwe 70%, rzadkie |
| Sceptyk | Neutralny | Studzi, pyta, wątpi w modę rynku | Prawdziwe 70% |
| Blefiarz | Negatywny | Same superlatywy, dużo wykrzykników | Prawdziwe 40% |
| Manipulator | Negatywny | Pochlebia gracza, prosi o przysługi | Prawdziwe 50%, zapowiedź bywa na rękę jego spółce |

Charakter jest stały dla osoby i nigdy nie pojawia się w UI. Akademia uczy czytania stylu, ale nie mapuje go na liczby.

### Rozmowa

- Dostępna dla kontaktów, 1 na osobę na kwartał gry.
- 2–3 tury, w każdej 3–4 opcje w tonie: liczby, wizja, bezpieczeństwo, relacja, presja.
- Wynik zależy od macierzy charakter × ton i relacji. Nastrój −2…+2 daje zmianę relacji od −6 do +6.
- „Szybka rozmowa”: bez minigry, najwyżej +2.
- Prośby wymagają udziału gracza ≥ 5% (próg do testów): dywidenda, skup, strategia. Bez udziału rozmowa daje tylko relację i lekką podpowiedź.
- Jedna funkcja `resolveTalk(partner, choices)` i dane w tabeli.

### VIP

- Oferta jest wiadomością w Tied z profilem VIP-a. Rozmowa zastępuje 3 argumenty.
- Skutki bez zmian: wpłata 5–15% z lock-upem, wyjście przy słabym wyniku.
- Dodatkowo mail z `importance: 3` i nowa zakładka Poczty „Ważne” (filtr po `importance`).

## R5. Obietnice botów

- Bot z relacją ≥ +20 proponuje umowę: „Kupię jednostki za X, jeśli do końca kw. Y wykonasz cel”.
- Po przyjęciu cel staje się karteczką w TeamedUP!: bot, cel, kwota, termin, stan słowem.
- Najwyżej 3 aktywne karteczki.
- Spełnienie: bot kupuje jednostki **po NAV**, z własnej gotówki, jako klient funduszu (`addFundClient`, `applySubscriptionUnits`) z lock-upem 1 rok. Relacja +5.
- Brak gotówki u bota w dniu spełnienia: bot kupuje tyle, na ile go stać, gracz nie traci relacji i widzi to na karteczce.
- Niespełnienie: relacja −10. Rezygnacja przed terminem: −5.
- Cele sprawdzane przy zmianie kwartału i po transakcji.
- Kwota jednej obietnicy: start 1–3% NAV, najwyżej 25% gotówki bota.

### Cele

Od użytkownika:
1. Kup min. N akcji określonej spółki.
2. Sprzedaj posiadaną spółkę.
3. Ustaw określoną kategorię spółek na min. 10% wartości portfela.

Propozycje:
4. Utrzymaj akcje spółki przez 2 kwartały (nie sprzedawaj).
5. Zejdź z największą pozycją poniżej 25% portfela.
6. Utrzymaj gotówkę funduszu ≥ 10% do końca kwartału.
7. Zamknij wszystkie pozycje krótkie.
8. Spłać kredyt lub zejdź z dźwignią do zera.
9. Pokonaj GIG w kwartale.
10. Zagłosuj na walnym spółki tak, jak prosi bot.
11. Miej min. 10% portfela w obligacjach lub ETF-ach.

Bot wybiera cel zgodnie ze swoim portfelem, np. poleca spółkę, którą sam trzyma. Charakter Manipulator proponuje to częściej przed własną sprzedażą.

## R6. Akademia, testy, kontrola

- Hasła Akademii: „Jak czytać Tied”, „Relacje i kontakty”, „Obietnice inwestorów”.
- Testy: macierz charakter × ton, progi widoczności postów, limit reakcji, zanik, zachowanie relacji po awansie wiceprezesa, kontakt po pełnej sprzedaży akcji, obietnica spełniona i niespełniona, NAV bez zmian przy zakupie, stary zapis.
- Niezmienniki: obietnica nie tworzy pieniędzy, a gotówka bota maleje o wpłatę.
- Kontrola ×200:
  - częstość dywidend, skupów, zmian strategii i przejęć jak w bazie;
  - gracz wybierający opcje według charakteru: sukces 40–70%, losowy: ok. 25%;
  - nowy preset „czytelnik Tied”, który handluje po zapowiedziach: przewaga nad presetem bazowym poniżej progu do ustalenia;
  - rozmiar zapisu: średnia w limicie;
  - czas kroku: bez wzrostu ponad 2%.

## Interfejs

Czat designu: lista kontaktów, profil, post z reakcjami, wpis zablokowany, okno rozmowy, karteczki w TeamedUP!, zakładka „Ważne”. Bez koloru jako jedynego nośnika, bez emoji. Gra używa „prezes”, nie „CEO”.

## Kolejność etapów

R0 (dane) → R1 (kontakty) → R2 (posty i zapowiedzi) → R3 (wiceprezesi) → R4 (charaktery, rozmowy, VIP) → R5 (obietnice) → R6 (kontrola). Design przed R1.

## Ryzyka

- **Przewaga z zapowiedzi:** zaufani znajomi mogą dawać zbyt pewny zysk. Stąd brak liczb i dat, ukryty charakter i preset kontrolny.
- **Klikanie polubień:** limit +2 kwartalnie na osobę.
- **Rozmiar zapisu:** 41 ze 120 gier przekracza już limit, a wiceprezesi i relacje dokładają dane.
- **Przeniesienie decyzji spółek na plany:** największa zmiana w logice. Etap R2 ma osobną kontrolę częstości.
- **Ilość tekstu:** 7 charakterów × rodzaje postów × 5 tonów. Treści powstają jako pule, nie pojedyncze zdania.

## Polecenie dla czatu kodu

> Wdróż 0.17.3 według `plany/plan_0.17.3_rozmowy.md`, etapami R0–R6, po scaleniu 0.17.8 i po projekcie czatu designu. Przed R2 przeczytaj `reviewDividendPolicy`, `processStrategyQuarterly`, skup w `ceo.timers.buyback` i start przejęć, a przed R4 kod VIP w `campaigns.js`. Po każdym etapie commit po polsku i raport. Nie scalaj do `zmiany-AI`, nie wypychaj. Na końcu raport `plany/raporty/kontrola_0.17.3.md` z kontrolą ×200.
