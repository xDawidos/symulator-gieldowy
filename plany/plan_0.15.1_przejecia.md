# Plan 0.15.1 „Sztuka przejęć” (po 0.15.0.1 „Poprawki 0.15”, przed 0.15.2 „Kochaj i zarabiaj”)

Cel: przejęcia przestają być zdarzeniem, które gracz tylko ogląda, albo przyciskiem „kup spółkę za 25% premii”. Gracz:
- **rozgrywa oferty kupna** spółek, w których ma duży pakiet;
- **zdobywa kontrolę rozmową**, odkupując pakiety od innych akcjonariuszy i od prezesa;
- **zarabia albo traci na przejęciach botów** (arbitraż fuzji);
- widzi, jak przejęcie zapisuje się w księgach kupującego (wartość firmy i jej odpis).

Czego to uczy:
- **Premia za przejęcie i arbitraż fuzji:** cena celu po ogłoszeniu = cena oferty minus spread ryzyka transakcji. Spread maleje, gdy transakcja się zbliża, a przy zerwaniu kurs spada.
- **Negocjacje:** kotwiczenie ceny, cena maksymalna kupującego (synergie), konkurencyjny proces sprzedaży (aukcja), ryzyko urażenia drugiej strony.
- **Due diligence i audyt:** kupujący bada księgi; kreatywna księgowość i ukryte zobowiązania obniżają cenę albo zrywają transakcję; audyt przed sprzedażą zmniejsza tę stratę.
- **Ład korporacyjny i prawo:** transakcje pakietowe poza rynkiem, wezwanie i ochrona akcjonariuszy mniejszościowych, rola KNF, wpływ ustaw na rynek.
- **Księgowość przejęcia:** wartość firmy (goodwill), test utraty wartości, odpis, „klątwa zwycięzcy” (przepłacone przejęcie).

Decyzja użytkownika: gracz jako większościowiec **dostaje oferty** i je rozgrywa; kontrolę zdobywa **odkupem pakietów** od botów (istniejące relacje) i od prezesa, a nie przez nowy przycisk „kup spółkę”. Istniejące przejęcie z panelu zarządzania spółką (`openManagementModal`) zostaje bez zmian.

Kolejność: M0 → M1 → M2 → **M10** → M3 → M4 → M5 → M6 → **M9** → M7 → M8 (M9 i M10 dopisane 2026-10-21 na prośbę użytkownika; mapa M10 zaraz po M2, bo pomaga śledzić kolejne części). **Commit po każdej części** (część z kilkoma krokami — commit po każdym kroku).

UI z komponentów 0.14.5. **Projekt wyglądu nowych elementów zlecamy czatowi designu** (sekcja „Zlecenie dla czatu designu”).

---

## Punkt wyjścia (stan kodu)

| Element | Gdzie | Stan |
|---|---|---|
| Proces przejęcia | `ma.js` `advanceMergerProcess`, `runMergerStage` | 7 etapów, ok. 1 kw. na etap, komplikacje z decyzją, mini-zdarzenia, koszty |
| Obrony | `ma.js` `TAKEOVER_DEFENSES` | zatruta pigułka, Biały Rycerz, Pac-Man, negocjacje (+10–20 pp premii) |
| Antymonopol | `ma.js` etap 4, `checkAntitrust` | blokada i kara |
| Fundusz jako akcjonariusz celu | `ma.js` `notifyFundOfTakeover` | przy ≥ 20% akcji: sprzedaż po cenie oferty, głos przeciw, obrona (> 50%) |
| Wybór celu i finansowania | `companies.js` `initiateMergerProcess`, `ui.js` okno `ma-target-modal` | gotówka, LBO, wymiana akcji; **premia stała 25%** |
| Kurs celu w procesie | `ma.js` etap 5 | `partner.price *= 1.1` — skok bez związku z ceną oferty |
| Rozliczenie | `companies.js` `resolveMerger` | wypłata posiadaczom; bilans celu dodany do bilansu przejmującego; **zapłacona gotówka nie zmniejsza aktywów, kapitał własny celu dopisany** (księgowanie niespójne) |
| Relacje z botami | `ai.js` (`botRelations`, `changeRelation`, prezenty) | −100…100; życzliwy bot sam oferuje pakiet z 5% dyskontem (`offerBotBlock`) |
| Reputacja gracza w spółce | `stock.reputation.player` | −100…100 |
| Pakiet zarządu | `stock.insiderShares` | poza wolnym obrotem; w rejestrze jako „Zarząd i pracownicy” (`getShareholders`) |
| Kreatywna księgowość, audyt | `companies.js` `stock.fraud`, `stock.audit`, `finishAudit`, `revealFraud` | oszustwa z korektą; zlecony audyt z wynikiem po kwartale |
| Ustawy i partie | `core.js` `SOCIAL_LAWS`, `PARTY_PROGRAMS`, `announceLawChange` | 4 ustawy, zapowiedź kwartał wcześniej, rynek dyskontuje |
| KNF | `state.js` `oversight.knf` (poziom 0–5), `getInstitutionEffectiveness` | skuteczność 0,05–0,95 |

---

## M0. Pomiar (bez zmian zachowania gry)

`tests/przebiegi.html`:
- **sondy:** przejęcia na grę (rozpoczęte, zakończone, zerwane i przyczyna), premia oferty, kurs celu 1 kw. przed ogłoszeniem, przy ogłoszeniu, co kwartał i przy rozliczeniu/zerwaniu; liczba spółek z udziałem funduszu ≥ 33% i > 50%; przejęcia spółek z udziałem funduszu ≥ 20%;
- **preset `wiekszosciowiec`:** na starcie fundusz dostaje > 50% akcji 2 spółek (średnia kapitalizacja, z modelem zysku) i polityka sondy dla ofert z M2 (przyjmuje ≥ 30% premii, wcześniej kontroferta na górnej granicy przedziału z rozmów);
- **sonda `arbitraz`:** wirtualny portfel kupuje każdy cel dzień po ogłoszeniu (stała kwota) i trzyma do rozliczenia albo zerwania; wynik vs GIG.

Raport bazowy w `raporty/pomiar_0.15.1.md`. **Commit M0.**

## M1. Arbitraż fuzji (dla każdego gracza)

`companies.js` (`initiateMergerProcess`, `cancelMerger`, `resolveMerger`), `ma.js` (`runMergerStage`), `core.js` (pętla cen):
- **przy ogłoszeniu przejęcia za gotówkę lub LBO** kurs celu skacze do `cena oferty × (1 − spread)`; zapamiętujemy `preDealPrice`;
- **spread** (przeliczany co kwartał):

| Składnik | Wartość |
|---|---|
| podstawa | 3% |
| wrogie przejęcie albo aktywna obrona | +4 pp |
| LBO | +3 pp |
| ryzyko antymonopolowe (inicjator i cel mają razem > 25% kapitalizacji sektora) | +4 pp |
| czas: każdy etap do końca (7 − etap) | +1 pp |
| razem | najwyżej 15% |

- **w trakcie procesu** cel wraca nie do wartości godziwej, tylko do `cena oferty × (1 − spread)` (zwykłe tempo powrotu); szum kursu celu × 0,5;
- **zerwanie** (`cancelMerger`): kurs celu × `preDealPrice / cena oferty × (1 − spread)` ± 5% — wraca w okolice ceny sprzed ogłoszenia; dalej zwykły powrót do wartości godziwej;
- **inicjator przy ogłoszeniu:** −1% za każde 10 pp premii ponad 20%, najwyżej −8%; przy wymianie akcji dodatkowo −3% (rozwodnienie);
- **usunąć** `partner.price *= 1.1` z etapu 5;
- **wymiana akcji (fuzja):** cel podąża za kursem inicjatora × parytet (bez spreadu ceny gotówkowej), spread 3–8%;
- **karta spółki:** linia „W trakcie przejęcia: oferta X zł · kurs Y zł · spread Z% · etap N/7”; pasek newsów przy ogłoszeniu i zerwaniu (dla wszystkich).
- **Akademia:** „Arbitraż fuzji”, „Premia za przejęcie”.
- **Testy:** kurs celu po ogłoszeniu = oferta × (1 − spread) ± 0,5%; spread maleje z etapem; po zerwaniu kurs w ±5% ceny sprzed ogłoszenia; inicjator −1…−8%; fuzja bez skoku do ceny gotówkowej.
- **Commit M1.**

## M2. Oferty kupna dla większościowca

**Kiedy oferta przychodzi** (raz na kwartał dla każdej spółki, w której fundusz ma ≥ 33% akcji):

| Składnik | Szansa na kwartał |
|---|---|
| podstawa | 6% |
| spółka tania (kurs / wartość godziwa < 0,9) | +4 pp |
| Hossa albo Euforia, albo sektor w bańce | +3 pp |
| Bessa albo Kapitulacja | −3 pp |
| limit | 1 aktywna oferta na spółkę, najwyżej 2 naraz w grze; po odrzuceniu przerwa 4 kw. dla tej spółki |

- **Oferent:** spółka z tego samego lub pokrewnego sektora (wspólny segment) z gotówką albo zdolnością LBO ≥ cena; rzadziej bot-inwestor `whale` lub `pro_investor` (pakiet kontrolny). Bez spółek Skarbu Państwa i spółek zależnych.
- **Przedmiot:** fundusz > 50% — cała spółka (wezwanie na 100%, mniejszościowi dostają tę samą cenę); fundusz 33–50% — pakiet funduszu (kupujący przejmuje kontrolę).
- **Oferta wstępna:** premia 10–30% nad kursem (wg kondycji i osobowości oferenta).
- **Ukryta cena maksymalna oferenta:** `max(kurs × 1,15, wartość godziwa × synergia) × (1 + 0…15%)`; synergia 1,10–1,40 (wyższa przy wspólnym segmencie); ograniczona gotówką i zdolnością LBO.
- **Nastawienie oferenta** (ukryte): zdeterminowany (cena maks. +10%, odporny na urażenie), elastyczny, oportunista (cena maks. −10%, łatwo odchodzi).

**Co może zrobić gracz** (okno oferty — wzorzec istniejącego okna przejęcia; gra **nie** pauzuje, oferta ważna 2 kw.):

| Ruch | Koszt | Skutek |
|---|---|---|
| **Rozmowy wstępne** | 0 zł, raz na ofertę | nastawienie oferenta słowem i przedział ceny maksymalnej ±10% |
| **Kontroferta** (cena za akcję) | 0 zł, najwyżej 3 rundy | ≤ cena maks. → przyjęta (w górnych 10% przedziału oferent proponuje środek); do 115% ceny maks. → oferent podnosi do ceny maks. i mówi „ostatnie słowo”; > 115% → **urażenie** z szansą 60% (oportunista 80%, zdeterminowany 30%): zerwanie, przerwa 4 kw., a przy pakiecie funduszu < 66% szansa 30% na **wrogie wezwanie** do pozostałych akcjonariuszy (istniejące obrony) |
| **Zaproś drugiego oferenta** (aukcja) | 0,5% wartości oferty (doradca) | szansa 50% na drugą ofertę; 1–2 rundy podbić o 3–8% do niższej z cen maks.; pierwszy oferent urażony z szansą 20% |
| **Audyt przed sprzedażą** | jak zlecony audyt (`stock.audit`) | patrz M3 |
| **Przyjmij** / **Odrzuć** | — | rozliczenie M3 / bez kary, przerwa 4 kw. |

- **Rozliczenie:** gotówka do funduszu (i do mniejszościowych po tej samej cenie) albo akcje oferenta (wymiana, istniejące `stockSwap`); transakcja uzgodniona trwa **3 kw.** (badanie, zgody i antymonopol, rozliczenie) zamiast 7 etapów; w tym czasie działa arbitraż z M1.
- **Wiadomość:** mail z akcją „Otwórz ofertę” i wpis w pasku newsów; bez dymka i bez pauzy.
- **Boty** z pakietami ≥ 33% dostają te same oferty i decydują wg osobowości (istniejące `aiDecide…`): spokojni przyjmują ≥ 25% premii, ryzykanci żądają +10 pp.
- **Akademia:** „Cena maksymalna i synergie”, „Konkurencyjny proces sprzedaży”.
- **Testy:** szansa oferty wg tabeli (10 000 losowań, ±1 pp); przedział z rozmów zawiera cenę maks.; kontroferta ≤ maks. przyjęta; > 115% → urażenie z szansą wg nastawienia; aukcja nie przekracza niższej z cen maks.; mniejszościowi dostają tę samą cenę; akcje = posiadacze po rozliczeniu.
- **Commit M2.**

## M3. Badanie spółki (due diligence) i ukryte zobowiązania

**Ukryte zobowiązania** (nowe pole `stock.hiddenLiabilities`, zł):
- przy starcie gry 12% spółek z modelem zysku dostaje ukryte zobowiązania 5–20% długu (poręczenia, pozwy, kary); szansa ×2 przy prezesie z cechą skorumpowany / chciwy / skłonny do korupcji, ×1,5 przy kondycji < 0;
- nowe spółki (debiuty) — ta sama reguła;
- **ujawnienie:** zlecony audyt (`finishAudit`) z szansą 70%, badanie kupującego (niżej), albo samoistnie 2%/kw.;
- **skutek ujawnienia:** zobowiązania bilansowe += wartość, jednorazowy spadek kursu o wartość na akcję (`applyPriceEffect`), mail, gdy fundusz ma akcje.

**Badanie kupującego** (1. kwartał rozliczenia z M2, a także przy przejęciach botów):

| Co znajduje | Szansa wykrycia | Skutek |
|---|---|---|
| oszustwo księgowe (`stock.fraud`) | 70% | 50%: obniżka ceny o 15–30%; 50%: zerwanie (i ujawnienie oszustwa — `revealFraud`) |
| ukryte zobowiązania | 60% | obniżka ceny o ich wartość na akcję; ujawnienie |

- **Audyt przed sprzedażą** (gracz zleca istniejący audyt przed przyjęciem oferty): problemy ujawnione wcześniej obniżają cenę o **połowę mniej** i **nie zrywają** transakcji („kupujący wie, z czym idzie”).
- Gracz może przyjąć obniżkę, negocjować raz (oferent przyjmuje połowę różnicy, jeśli cena maks. pozwala) albo zerwać bez kary.
- **Akademia:** „Due diligence”, „Ukryte zobowiązania”, „Audyt przed sprzedażą”.
- **Testy:** 12% spółek z ukrytymi zobowiązaniami (±3 pp na 100 grach startowych); wykrycia wg tabeli (10 000 losowań); audyt przed sprzedażą zmniejsza obniżkę o połowę; ujawnienie zwiększa zobowiązania i obniża kurs o wartość na akcję.
- **Commit M3** (dwa kroki: ukryte zobowiązania; badanie kupującego).

## M4. Odkup pakietów od akcjonariuszy i od prezesa

W liście akcjonariuszy spółki (`getShareholders`) przy pozycjach: **bot-inwestor**, **fundusz bota** (kolega z korporacji), **„Zarząd i pracownicy”** — przycisk **„Zaproponuj odkup”**:
- parametry: liczba akcji (do całego pakietu), cena za akcję (kurs −10%…+50%);
- najwyżej **1 propozycja na posiadacza na kwartał**.

**Cena rezerwowa** (ukryta, pokazywana jako przedział po rozmowie — patrz niżej):

| Posiadacz | Wzór |
|---|---|
| bot-inwestor | `max(kurs, wartość godziwa) × (1 + baza osobowości) − relacja / 1000` |
| fundusz bota (kolega) | jak bot, baza 0,08 |
| prezes i zarząd | `max(kurs, wartość godziwa) × 1,20` (+0,10 przy cesze „oddany” albo gdy prezes jest założycielem) `− reputacja gracza w spółce / 1000` |

Baza osobowości: spokojny 0,05; dywidendowy 0,08; zawodowiec 0,10; wieloryb 0,15; ryzykant i spekulant 0,00 (sprzedają chętnie, ale w Euforii +0,10). Relacja i reputacja −100…100 zmieniają cenę o ±10%.

**Decyzja posiadacza:**
- cena ≥ rezerwowa → zgoda na całą liczbę akcji; przy cenie ≥ rezerwowa + 10% relacja +3;
- 85–100% rezerwowej → kontroferta w połowie drogi (gracz przyjmuje albo rezygnuje);
- < 85% → **urażenie:** relacja −10 (bot) albo reputacja −10 (prezes), blokada rozmów z tym posiadaczem na 2 kw.;
- bot wrogi (relacja ≤ −40) odmawia zawsze; sojusznik (≥ 70) — rezerwowa −5%.

**Rozmowa przed propozycją** (bezpłatna, raz na kwartał): przedział ceny rezerwowej ±10% i nastawienie słowem.

**Transakcja poza rynkiem:**
- bez wpływu na kurs; przeniesienie akcji w rejestrze (pakiet bota → portfel funduszu; `insiderShares` → portfel funduszu i `sharesHeld += n`, bo pakiet zarządu jest poza obrotem);
- zapłata z gotówki funduszu do bota albo na zewnątrz (`recordPayment`, „wypłata dla zarządu”);
- **prezes**, który sprzeda ponad połowę swojego pakietu: szansa 30% na odejście (`replaceCeo`) — zarząd bez udziałów traci motywację;
- istniejąca oferta pakietu od życzliwego bota (`offerBotBlock`) zostaje.
- **Akademia:** „Transakcja pakietowa”, „Pakiet kontrolny”.
- **Testy:** zgoda wg ceny rezerwowej; urażenie poniżej 85%; limit 1 propozycji na kwartał; akcje = posiadacze po odkupie od bota i od zarządu; gotówka funduszu −zapłata; brak wpływu na kurs.
- **Commit M4.**

## M5. KNF, wezwanie i próg wezwania

Decyzja użytkownika: przekroczenie 50% przez odkup pakietów poza rynkiem uruchamia najpierw ostrzeżenie, a powtórzenia — kary i wezwania. Próg wezwania ustawiają partie; wyższe progi odblokowują poziomy KNF.

**Nowa ustawa** w `SOCIAL_LAWS` — **„Próg wezwania”** (`tenderThreshold`):
- poziomy: **66% / 75% / 90% / 99%**, start 66%;
- znaczenie: do jakiego udziału fundusz musi ogłosić wezwanie na pozostałe akcje, gdy przekroczy 50% transakcjami pakietowymi (wyższy próg = silniejsza ochrona mniejszościowych, droższa kontrola);
- **partie** (`PARTY_PROGRAMS`): Ludowcy +1, Blok Państwowy +1, Koalicja Rynkowa −1; zmiana z zapowiedzią kwartał wcześniej (istniejące `announceLawChange`);
- **limit KNF:** najwyższy dozwolony poziom zależy od poziomu KNF: 0–1 → 66%, 2 → 75%, 3 → 90%, 4–5 → 99% (partia nie przeforsuje progu ponad limit).

**Drabina KNF** (osobny licznik `oversight.records.player.tenderStrikes`, **nie** licznik przestępstw — nie prowadzi do wyroku):

| Przekroczenie 50% pakietami (w dowolnej spółce) | Reakcja |
|---|---|
| 1. | mail KNF z ostrzeżeniem i hasło Akademii „Wezwanie i ochrona akcjonariuszy mniejszościowych” |
| 2. | kara 2% wartości pakietów kupionych w ostatnich 2 kw., zaufanie −3 |
| 3. i kolejne | **nakaz wezwania** do progu po cenie ≥ najwyższej zapłaconej w ostatnich 2 kw. (posiadacze sprzedają wg ceny rezerwowej; drobni 60–90%); przy KNF poziom ≥ 3 i braku gotówki na wezwanie — **nakaz odsprzedaży** nadwyżki ponad 50% w 2 kw. (na rynku, z wpływem na cenę) |

- **Tempo:** KNF wykrywa przekroczenie w kwartale z szansą = skuteczność KNF (`getInstitutionEffectiveness`, 0,3–0,9); niewykryte sprawdzane co kwartał dalej. Silniejsza KNF wykrywa szybciej.
- Zwykłe zakupy na rynku (sesyjne) nie liczą się do drabiny.
- **Okno „Państwo”:** ustawa w liście ustaw z opisem i limitem KNF.
- **Akademia:** „Wezwanie”, „Ochrona akcjonariuszy mniejszościowych”, „Próg wezwania i polityka”.
- **Testy:** drabina 1 → 2 → 3; tempo wykrycia wg skuteczności; limit progu wg poziomu KNF; nakaz wezwania kupuje do progu po właściwej cenie; nakaz odsprzedaży schodzi do 50% w 2 kw.; zakupy sesyjne poza drabiną; zapis i wczytanie ustawy.
- **Commit M5** (dwa kroki: ustawa i limit KNF; drabina i nakazy).

## M6. Wartość firmy i test utraty wartości

`companies.js` `resolveMerger` (przejęcia gotówkowe i LBO):
- **naprawa księgowania:** cena zakupu `P`, aktywa netto celu `AN = aktywa − zobowiązania`:
  - aktywa przejmującego: `− P` (gotówka, przy LBO: `+ dług`) `+ aktywa celu + wartość firmy`;
  - zobowiązania: `+ zobowiązania celu` (+ dług LBO);
  - **wartość firmy** `= max(0, P − AN)` w nowym polu `balanceSheet.goodwill`;
  - kapitał własny przejmującego się nie zmienia (przy LBO maleje o koszty); zysk zatrzymany celu **nie** jest dopisywany;
  - `P < AN` → zysk z okazyjnego nabycia (jednorazowy, w wyniku kwartału);
- **plan z dnia przejęcia** w `stock.acquisitions[]`: `{ symbol, quarter, goodwill, planEbit (EBIT celu z 4 kw.), revenueShare (udział przychodów celu w łącznych) }`;
- **test co 4 kw.** (decyzja użytkownika): zysk przejętej części ≈ EBIT przejmującego z 4 kw. × `revenueShare`;
  - < 70% planu → odpis 25% pozostałej wartości firmy;
  - < 40% planu → odpis 50%;
  - odpis to koszt w wyniku kwartału (bez gotówki): zysk netto i zysk na akcję spadają, wycena przez model zysku;
- **wycena:** wartość firmy liczy się do kotwicy księgowej (25%) jak inne aktywa;
- **wiadomość:** gdy fundusz ma akcje przejmującego — mail „X odpisuje Y zł wartości firmy po przejęciu Z”; pasek newsów przy odpisie ≥ 50%;
- **raport spółki:** wiersz „Wartość firmy” w bilansie i „Odpis wartości firmy” w wyniku.
- **Akademia:** „Wartość firmy (goodwill)”, „Test utraty wartości”, „Klątwa zwycięzcy”.
- **Testy:** po przejęciu aktywa − zobowiązania − kapitał = 0 (spójność bilansu); wartość firmy = P − AN; odpis 25% / 50% wg progów; odpis bez ruchu gotówki; zapis i wczytanie `acquisitions`.
- **Commit M6.**

## M7. Akademia, osiągnięcia, pasek newsów

- **Hasła Akademii** (odblokowanie przy pierwszym kontakcie): z M1–M6 (13 haseł).
- **Osiągnięcia** (zakładka CV i szkolenia, XP bez pieniędzy):

| | Osiągnięcie | Warunek |
|---|---|---|
| 🤝 | Sprzedane z premią | sprzedaj spółkę (> 50%) z premią ≥ 40% nad kursem sprzed oferty |
| 🔨 | Aukcjoner | doprowadź do dwóch ofert i sprzedaj drożej niż pierwsza oferta o ≥ 10% |
| 📒 | Czyste księgi | audyt przed sprzedażą, potem transakcja bez zerwania |
| 🎯 | Arbitrażysta | 3 zyskowne pozycje w celach przejęć (kupione po ogłoszeniu, sprzedane albo rozliczone) |
| 🧩 | Pakiet po pakiecie | zdobądź > 50% spółki, w tym ≥ 20 pp z transakcji pakietowych |
| 🏚️ | Klątwa zwycięzcy (ukryte) | miej ≥ 5% aktywów w spółce, która odpisze ≥ 50% wartości firmy |

- **Pasek newsów:** ogłoszenie i zerwanie przejęcia, odpis ≥ 50%, zmiana progu wezwania (dla wszystkich); oferta dla gracza i ostrzeżenia KNF — poczta.
- **Commit M7.**

## M9. Drabina pakietów spółka → spółka (dopisane 2026-10-21, decyzja użytkownika)

Spółki kupują pakiety innych spółek stopniowo, a progi zmieniają zachowanie celu. Budowa na istniejących mechanizmach: `equityStakes`, córki T6 (`isSubsidiaryOf`, `parentStakePct`, transfer zysku), kooperacje T5, wchłonięcie z przymusowym wykupem, odkup pakietów z M4, wezwanie i KNF z M5, wartość firmy z M6.

**Kto może kupować (ranga giełdy):**
- spółki z giełd **Platynowej i wyższych** (poziom ≥ 4): pakiety w spółkach z niższych rang; kooperacje (25%) także z tą samą rangą;
- spółki **Złote** (poziom 3) z ograniczeniem: tylko szczególnie dobre albo bogate (kondycja ≥ 3 **albo** gotówka ≥ 25% kapitalizacji) — pakiety w spółkach z niższych rang i kooperacje (25%) ze spółkami Złotymi;
- spółka zawsze może zostać kupiona przez spółkę z wyższej rangi (Złote też);
- bez spółek Skarbu Państwa po stronie kupującej (wyjątek: nacjonalizacja przy 99%) i bez spółek zależnych.

**Progi** (udział kupującego w celu):

| Próg | Nazwa | Skutek |
|---|---|---|
| 25%+ | powiązanie | kooperacja (T5) z kupującym; głos kupującego na walnym celu |
| 50%+ | związanie | cel staje się córką (`isSubsidiaryOf`, transfer zysku T6); nowy prezes od kupującego z cechą **„Marionetka &lt;nazwa kupującego&gt;”** (np. „Marionetka Cortex”) — na walnym głosuje jak matka |
| 75%+ | przejęcie kontroli | zmiana nazwy nawiązująca do matki (np. „Cortex Drobex”), synergie kosztowe (marża +1 pp), polityka dywidendy pod matkę |
| 99% (90% przy wchłonięciu) | zdjęcie z giełdy | wchłonięcie / prywatyzacja (istniejący przymusowy wykup); przy spółce Skarbu Państwa — nacjonalizacja |

**Progi a ustawa i KNF (decyzja użytkownika 2026-10-21):**
- próg **25% (powiązanie) jest stały**;
- progi wyższe idą za ustawą „Próg wezwania” (M5) i limitem KNF: **związanie** od 50%, **przejęcie kontroli** od progu ustawy (66 / 75 / 90%), **zdjęcie z giełdy** od 99% (przy progu ustawy 99% — tylko wchłonięcie z przymusowym wykupem); im silniejsza KNF, tym wyżej są progi;
- ustawa dotyczy też spółek: przekroczenie progu bez wezwania = **nakaz wezwania** (jak dla funduszu, bez kar finansowych za 1. raz);
- **KNF kontroluje koncerny:** gdy koncern (z córkami) ma > 25% (decyzja 2026-10-23; było 30%) kapitalizacji sektora albo > 10% kapitalizacji GIG, KNF (szansa = skuteczność) nakazuje sprzedaż części pakietu (zejście do progu związania) albo blokuje nowe podkupowania na 4 kw.; pokrętło, gdy koncerny są za mocne.

**Długofalowe przejęcie (podkupowanie):** zamiast jednego wezwania kupujący przez kilka kwartałów dokupuje akcje na rynku (wpływ na cenę jak zakupy botów) i odkupuje pakiety od posiadaczy (cena rezerwowa z M4); limit tempa 3–8 pp udziału na kwartał. Przekroczenie progu ustawy „Próg wezwania” (M5) bez wezwania — nakaz wezwania jak dla funduszu.

**Cecha prezesa „Mistrz marionetek”** (nowa, rzadka): spółka z takim prezesem częściej rozpoczyna podkupowanie (×2) i szybciej dokupuje (górna granica tempa); spółki z „Marionetką” w zarządzie nie bronią się przed matką.

**Tempo w grze:** najwyżej kilka rozpoczętych podkupowań na rok w całej grze (cel do pomiaru: 2–5 na rok).

**Pomiar M9 (zgoda użytkownika):** liczba córek i koncernów (koncerny **5–8** — decyzja 2026-10-23; córki wg T6; za mocne koncerny osłabia KNF), GIG ±0,5 pp względem M8 bez M9, spójność rejestru akcji (akcje = posiadacze, 0 naruszeń), gotówka spółek wypływająca do akcjonariuszy (suma zakupów pakietów na rok).

- **Zapis:** `stock.stakeCampaign` (kupujący, cel udziału, tempo), progi osiągnięte, cecha prezesa; pola opcjonalne.
- **Testy:** progi 25/50/75/99 i ich skutki; „Marionetka &lt;nazwa&gt;” głosuje jak matka; zmiana nazwy przy 75%; zasady rang (Złota tylko przy kondycji ≥ 3 albo gotówce ≥ 25% kap., kupowanie tylko niższych rang, kooperacje w tej samej randze); podkupowanie w limicie tempa; akcje = posiadacze; „Mistrz marionetek” ×2.
- **Commit M9** (kroki: progi i skutki; podkupowanie i rangi; cecha prezesa).

## M10. Mapa rodowa spółek (tylko tryb deweloperski)

- **Dziennik zdarzeń rodowych** (zapisywany, ograniczony rozmiarem): założenie córki, wydzielenie (spin-off, carve-out), usamodzielnienie, sprzedaż pakietu kontrolnego, przejęcie, fuzja, wchłonięcie, progi M9, zmiana nazwy, bankructwo — z kwartałem i udziałem.
- **Widok:** w panelu deweloperskim drzewo jak drzewo genealogiczne (wcięta lista, bez grafiki): spółka → córki → ich córki; przy każdej spółce historia (np. „Cortex → córka A (usamodzielniona kw. 14) → córka A1”); spółki wchłonięte i zbankrutowane też widoczne.
- Bez wpływu na grę; niewidoczne poza trybem deweloperskim.
- **Testy:** zdarzenia trafiają do dziennika; drzewo odtwarza łańcuch matka → córka → wnuczka po usamodzielnieniu; zapis i wczytanie dziennika.
- **Commit M10.**

## M8. Kontrola końcowa

Pomiar z „Jak sprawdzimy”, raport `raporty/kontrola_0.15.1.md`, wiersz w mapie. **Commit M8.**

---

## Zlecenie dla czatu designu (przed M2 i M4)

1. **Okno oferty kupna** (M2): oferent, przedmiot, cena i premia, przedział z rozmów, historia rund, przyciski ruchów z kosztem; stan „ostatnie słowo” i „urażony” słowem i ikoną, nie samym kolorem.
2. **Linia arbitrażu** w karcie spółki (M1) i **sekcja „Oferty i pakiety”** w karcie spółki.
3. **„Zaproponuj odkup”** w liście akcjonariuszy (M4): pole liczby akcji, suwak ceny z podpisem „poniżej / w przedziale / powyżej oczekiwań” (po rozmowie).
4. **Ustawa „Próg wezwania”** w oknie „Państwo” z limitem KNF.
5. **Wiersze bilansu** „Wartość firmy” i wyniku „Odpis wartości firmy”.
6. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem, animacje tylko bez `prefers-reduced-motion`, **bez nowych okien modalnych poza oknem oferty** (wzorzec istniejącego okna przejęcia).

Kontrola końcowa (M8) obejmuje też M9 i M10: podkupowania na rok, córki i koncerny w celach T5/T6, spójność rejestru akcji.

## Zapis gry i testy

- **Zapis v15 bez zmiany numeru** (pola opcjonalne z domyślnymi wartościami):
  - w `mergerProcess`: `preDealPrice`, `spread`, `kind: 'offer'`, rundy, nastawienie i cena maks. oferenta, druga oferta;
  - `stock.hiddenLiabilities`, `stock.acquisitions[]`, `balanceSheet.goodwill`;
  - `society.laws.tenderThreshold` (scalane z domyślnymi przez `ensureSocietyState`), `oversight.records.player.tenderStrikes`, lista transakcji pakietowych z 2 kw. (cena, liczba akcji);
  - blokady rozmów (posiadacz → kwartał);
  - przyrost < 0,1%.
- **Migracja przy wczytaniu:** ukryte zobowiązania losowane wg reguły M3 dla istniejących spółek; wartość firmy 0; próg 66%; licznik KNF 0.
- **Testy** (nowa grupa „0.15.1”, ok. 35): wymienione w częściach, do tego niezmienniki świata po 20 latach i spójność bilansów wszystkich spółek po 20 latach (aktywa − zobowiązania − kapitał ≈ 0).

## Jak sprawdzimy

Przebiegi ×200: **20 gier × 6,5 roku bez presetu, 20 × 6,5 roku z `wiekszosciowiec`, 5 × 20 lat**; części M1–M6: ≥ 10 gier × 6,5 roku.

| Miara | Cel |
|---|---|
| Przejęcia botów na grę | jak w M0 ±30% |
| Spread przy ogłoszeniu (mediana) | 4–10% |
| Zerwane przejęcia | 10–25% |
| Sonda `arbitraz` | +1…+4% ponad GIG na transakcję; ≥ 15% transakcji ze stratą |
| Oferty dla większościowca (`wiekszosciowiec`) | 1–3 na kontrolowaną spółkę w 6,5 roku |
| Premia przyjętej oferty | średnio 20–45% |
| Kontroferta na górnej granicy przedziału | +5…+15 pp ponad ofertę wstępną |
| Urażenie przy żądaniu > 115% ceny maks. | ≥ 50% |
| Ukryte zobowiązania | 10–15% spółek; ujawnione w 20 lat ≥ 60% |
| Badanie kupującego | oszustwo wykryte w 60–80%; audyt przed sprzedażą zmniejsza obniżkę o ≥ 40% |
| Odkup pakietów | przy cenie ≥ rezerwowej zgoda ≥ 95%; < 85% urażenie 100% |
| Próg wezwania | zmiana ustawy w ≥ 50% gier 20-letnich; nigdy ponad limit KNF |
| Spójność bilansów | 0 spółek z różnicą > 0,1% |
| Odpisy wartości firmy | w 20–40% przejęć w ciągu 3 lat |
| GIG / zaufanie / udziały funduszu = GIG | bez zmian ±0,5 pp względem 0.15.0.1 |
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 |
| Czas kroku / zapis | +≤ 2% / +≤ 0,1% |

## Ryzyka

- **Arbitraż jako pewny zysk.** Zabezpieczenie: spread zależny od ryzyka, 10–25% zerwań, cel sondy ≤ +4% i ≥ 15% strat; jeśli przekroczony — spread +1 pp.
- **Oferty jako „bankomat”** (gracz kupuje spółki pakietami tylko po to, by sprzedać z premią). Zabezpieczenie: cena rezerwowa pakietów ≥ wartość godziwa + 5–20%, cena maks. oferenta oparta na wartości godziwej, drabina KNF przy przekroczeniu 50%.
- **Ukryte zobowiązania obniżą GIG.** Jednorazowo ok. 12% × 12% długu; cel GIG ±0,5 pp.
- **Naprawa księgowania przejęć zmieni bilanse koncernów** (kotwica księgowa 25%, wycena koncernów T5, wydzielenia T4). Zabezpieczenie: test spójności bilansów, kontrola T4 (preset `wydzielenia`, 10 gier).
- **Za dużo poczty.** Oferty tylko dla spółek z udziałem ≥ 33%; limit 2 naraz.
- **Ustawa bez znaczenia, gdy gracz nie kupuje pakietów.** Akceptowalne: ustawa jest tłem dla osób, które grają w kontrolę spółek.

## Decyzje (podjęte)

2026-10-23 (druga runda): długość przejęcia wg wielkości celu — 3 kw. dla najmniejszych, do 7 kw. dla największych (3 + 4 × p², p = miejsce w rankingu kapitalizacji); przejęcia z panelu też wg wielkości. Podkupowania 3,5%/kw.; skup tanich akcji 30%; przy nacjonalizacji Skarb Państwa spłaca dług spółki jej bankowi. Nowa partia **Socjaldemokraci** (głosy biednych klas; lubią nacjonalizacje, nie lubią koncernów, wspierają małe firmy) i dwie ustawy: **Progi CIT** (liniowy / dwa progi / progresywny: małe spółki −4/−6 pp, duże +2/+5 pp) i **Ustawa antymonopolowa** (łagodna / standardowa / surowa: próg KNF dla koncernu 30/25/20% sektora, blokada fuzji 50/40/30%; przy surowej KNF może nakazać sprzedaż kontroli nad największą córką — propozycja od kodu).

2026-10-23 (po kontroli M8): przejęcia botów i spółek trwają 4 kw. (start od etapu 3; arbitraż −6…−12% vs GIG przy 7 kw.); przejęcia z panelu funduszu — 7 etapów. KNF ogranicza koncerny od 25% kapitalizacji sektora; cel 5–8 koncernów.


2026-10-20 (planowanie 0.15.x, `raporty/audyt_planow_0.15.x.md`):
1. **Gracz po stronie sprzedającej:** większościowiec (≥ 33%) dostaje oferty i je rozgrywa (rozmowy, kontroferta z ryzykiem urażenia, aukcja, badanie kupującego). Istniejące przejęcie z panelu zarządzania zostaje bez zmian.
2. **Kontrola przez rozmowę:** odkup pakietów od botów (istniejące relacje) i od prezesa (reputacja w spółce), poza rynkiem.
3. **Przekroczenie 50% pakietami:** ostrzeżenie KNF i hasło Akademii; powtórzenia — kara, potem nakaz wezwania albo odsprzedaży. Próg wezwania 66/75/90/99% jako ustawa zmieniana przez partie; wyższe progi odblokowuje poziom KNF, a silniejsza KNF szybciej wykrywa.
4. **Arbitraż fuzji** dla każdego gracza; **wartość firmy** z testem co 4 kw. i odpisem 25–50%.
5. **Odrzucone ze szkicu:** płatny list intencyjny (dubluje negocjacje), „spadek relacji z inwestorami w branży” (niemierzalne), nowy proces od zera i moduły `economy.js`, `src/*` (nie istnieją).
