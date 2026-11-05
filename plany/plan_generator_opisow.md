# Generator opisów spółek

Decyzja użytkownika (2026-11-05): zamiast ręcznych opisów wszystkich spółek powstaje generator z lekkimi podpowiedziami. Stałe opisy zostają tylko dla spółek państwowych. Plik zastępuje zakres „każda spółka z `initialStocks` ma wpis” i decyzję 21 z `plan_0.17_surowce_transport.md`.

## Budowa opisu (4–6 zdań)

| Miejsce | Treść | Kiedy się zmienia |
|---|---|---|
| 1. zdanie | Pozycja w sektorze i ogólnie, czym spółka się zajmuje | Przy przejściu na inny poziom giełdy |
| Środek | Dokładnie 1 podpowiedź, do tego 1–2 zdania ozdobne | Gdy przestanie być prawdziwa |
| Ostatnie zdanie | Cytat prezesa | Przy zmianie prezesa |

Przykład (spółka zmyślona):

> Mleczna Dolina to solidny brand w sektorze Żywność, dostarcza produkty na sklepowe półki w całym kraju. Trzyma się stabilnie w sektorze, który lubi nerwowe ruchy. Naszą misją jest dostarczanie najwyższej jakości. „Działamy zgodnie z przyjętym planem” — mówi prezes Nowak.

## Zasady

- **Zmiany tylko z powodu:** bez losowania przy otwarciu karty. Warianty wybiera hash, wzór jak w `getStockCommodityHedge` (`commodities.js`).
  - Pozycja: hash symbolu i poziomu giełdy.
  - Podpowiedź i zdania ozdobne: hash symbolu.
  - Cytat: hash imienia i nazwiska prezesa oraz symbolu.
- **Liczenie na bieżąco:** opis nie trafia do zapisu. `initializeDescriptionParts` przestaje tworzyć `descriptionParts`, ale nadal wywołuje `generateCEO`. Stare zapisy z tym polem działają, generator je pomija.
- **Lekkość:** słowa zamiast liczb. Podpowiedź wskazuje kierunek, nie podaje wartości.
- **Prawdziwość:** każda podpowiedź czyta te same dane co silnik.

## Pierwsze zdanie

- Pozycja: `companyDescriptors` według poziomu giełdy, jak w `getCompanyDescriptor`. Poziomy 5 i 6 używają puli `giant`.
- Działalność: nowa, krótka tabela ogólnych fraz dla 16 sektorów z `sectorSpecifics`. Obecne `activity` to pełne zdania, a część z nich wchodzi w pozycję („jest liderem”), więc nie nadają się do doklejenia.

## Podpowiedzi

Z pasujących wybieramy jedną (hash symbolu). Żadna nie pasuje: zdanie zapasowe o sektorze.

| Podpowiedź | Warunek | Przykład |
|---|---|---|
| Stabilna w sektorze | `volatilityFactor` ≤ 0,7 × mediana sektora | „Trzyma się stabilnie w sektorze, który lubi nerwowe ruchy.” |
| Nerwowa w sektorze | `volatilityFactor` ≥ 1,4 × mediana sektora | „Kurs potrafi zaskoczyć nawet w spokojnej branży.” |
| Kierunek rozwoju | Drugi sektor w `stock.sector` lub w `segments` | „Od lat planuje rozwój w stronę technologii.” |
| Surowiec we wsadzie | Największy `input` z `getStockCommodityProfile` powyżej progu | „Uważnie patrzy na ceny zboża.” |
| Surowiec w produkcie | Największy `product` z tego samego profilu | „Lubi, gdy gaz drożeje.” |
| Dywidenda | `dividendPolicy` | „Chętnie dzieli się zyskiem z akcjonariuszami.” |
| Własne badania | `research.unlockedTechs` niepuste | „Mocno stawia na własne badania.” |
| Odporność | `DEFENSIVE_SECTORS` | „Klienci wracają tu także w gorszych czasach.” |

Progi do strojenia: sprawdzić rozkład na `initialStocks`, żeby każda podpowiedź pojawiała się, ale nie u połowy giełdy.

## Spółki państwowe

- Warunek: `isStateOwned` i wpis w `COMPANY_DESCRIPTIONS`.
- Układ: 1. zdanie o pozycji i cytat prezesa działają jak u innych. Stały opis zastępuje ogólną działalność, podpowiedź i zdania ozdobne.
- Zostają: PES, NAG, GRT, CFL, PKC.
- Dochodzą z `plany/opisy_spolek_pl.md`: ENG, TRN, PUR, NOC.
- Do napisania: MLD (Miedź Ludowa), której nie ma wśród 32 propozycji.
- Wypadają na generator (nie są państwowe): ZST, SLS, TIR.
- Spółki miejskie i inne państwowe bez wpisu idą przez generator.

## Poza zakresem

Startupy, instytuty badawcze i spółki zagraniczne (`describeForeignCompany`) zostają bez zmian.

## Domyślne ustalenia

- Pula cytatów: `neutral` i `positive`. Cytat nie zmienia się z wynikami, więc `negative` wyglądałby dziwnie w spółce, która już wyszła na prostą.
- Zdania ozdobne: `companyMottos` i nowa krótka pula o charakterze sektora. Ich liczba (1–2) wynika z hasha, więc opis ma 4 lub 5 zdań. Jeśli pierwsze zdanie rozpadnie się na dwa, wychodzi 6.
- Zdanie „Na czele spółki stoi prezes X” znika, nazwisko jest w cytacie.

## Testy

- Dwa wywołania `assembleDescription` dają ten sam tekst.
- Każda spółka z `initialStocks` ma 4–6 zdań i dokładnie 1 podpowiedź.
- Zmiana poziomu giełdy zmienia pierwsze zdanie, a reszty nie.
- Zmiana prezesa zmienia cytat, a reszty nie.
- Każda podpowiedź ma warunek sprawdzony na danych spółki.
- Spółki państwowe z wpisem pokazują stały opis, ZST, SLS i TIR już nie.
- Do zmiany: testy S2 i S4 w `tests/tests.js`, które wymagają wpisu dla ZST, SLS i TIR.
- Stary zapis z `descriptionParts` wczytuje się i pokazuje nowy opis.

## Polecenie dla czatu kodu

> Wdróż generator opisów według `plany/plan_generator_opisow.md`. Zmieniasz `assembleDescription` i `initializeDescriptionParts` w `companies.js`, dodajesz tabelę fraz i podpowiedzi, przenosisz wpisy ENG, TRN, PUR, NOC z `plany/opisy_spolek_pl.md` do `COMPANY_DESCRIPTIONS`, usuwasz ZST, SLS, TIR. Opis MLD zaproponuj w raporcie. Po wdrożeniu pokaż 12 przykładowych opisów z różnych sektorów i poziomów giełdy oraz rozkład podpowiedzi. Commity po polsku, bez scalania.
