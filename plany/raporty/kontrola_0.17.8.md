# Kontrola 0.17.8: generator opisów spółek

Gałąź `claude/impl-017-s0b-891539` po scaleniu `zmiany-AI` 5fe70bd, nie scalona z powrotem i nie wypchnięta. Testy: **970/970**, w tym 9 w grupie „0.17.8 Generator opisów spółek”. Plan: `plany/plan_generator_opisow.md`.

## Co zrobione
- **Generator w `companies.js`:** `getDescriptionSentences` składa opis na bieżąco. Warianty wybiera hash, więc tekst jest ten sam przy każdym otwarciu karty. Opis nie trafia do zapisu.
- **Pierwsze zdanie:** pozycja według poziomu giełdy i fraza działalności. Fraza pochodzi kolejno z typu aktywa (REIT, windykator, lombard, biuro rachunkowe), podsektora (28 fraz, po jednej na każdy), a na końcu z sektora (21 fraz).
- **Środek:** dokładnie 1 podpowiedź, hasło firmy zależne od poziomu giełdy i czasem zdanie o charakterze sektora.
- **Ostatnie zdanie:** cytat prezesa z puli `neutral` i `positive`.
- **Stałe opisy:** przeniesione ENG, TRN, PUR, NOC; usunięte ZST, SLS, TIR. Testy S2 i S4 poprawione. Po prywatyzacji stały opis znika i działa generator.
- **Stare zapisy:** pole `descriptionParts` jest pomijane. Nowe spółki go nie dostają.
- **Usunięty martwy kod:** `sectorSpecifics`, `getCEOQuote`, `getVolatilitySentence`, `companyMottos`, pula `innovator`.
- **Bez zmian:** startupy, instytuty i spółki zagraniczne. Opisu MLD nie dodałem.

## Poprawki po pierwszym przeglądzie
1. **Frazy:** frazy sektorów są teraz szerokie, bo to zapas dla spółek bez podsektora. Przemysł: „dostarcza towary i usługi innym firmom”, Technologia: „dostarcza usługi i rozwiązania cyfrowe”, Żywność: „dostarcza jedzenie i napoje klientom w całym kraju”.
2. **Pula pozycji:** usunięte „bezpieczna przystań” i „konglomerat”. Poprawione określenia niesiadające z „w sektorze”: „nowicjusz”, „gigant”, „lider”, „weteran”, „tytan” (bez „na rynku”, „branży”). Usunięte też „stabilna firma”, „pewny gracz”, „dynamiczny startup”, „filar rynku”, „główny dostawca”, „lider segmentu”, bo mówiły o kursie albo źle się składały. Platynowa używa puli „lider”.
3. **Hasła firm:** zamiast starych mott trzy pule (Śmieciowa i Brązowa, Srebrna i Złota, od Platynowej wzwyż). Podane jako „Hasło firmy: „…””, czyli to, co spółka mówi o sobie, więc nie twierdzą niczego o jej danych. Przejście między pulami zmienia hasło razem z pierwszym zdaniem.
4. **Nowe podpowiedzi:** „bez długów” (zobowiązania ≤ 2% aktywów) i „duży dług” (≥ 33%). Czytają ten sam bilans co kafelek „Zadłużenie”. Banki są wyłączone, bo depozyty mają poza bilansem.
5. **Test sprzeczności:** pula pozycji nie zawiera już słów o kursie, a test sprawdza to na puli i na wszystkich spółkach.

## Progi i rozkład podpowiedzi (66 spółek przez generator, jedna nowa gra)
Progi: stabilna ≤ 0,8 mediany sektora, nerwowa ≥ 1,3, wsad ≥ 0,15, produkt ≥ 0,3, dywidenda `Aggressive` i `Total`, bez długów ≤ 2%, duży dług ≥ 33%.

| Podpowiedź | Pasuje | Wybrana |
|---|---|---|
| Duży dług | 21 | 12 |
| Surowiec we wsadzie | 16 | 11 |
| Stabilna | 20 | 9 |
| Nerwowa | 18 | 7 |
| Odporność | 19 | 5 |
| Dywidenda | 13 | 5 |
| Bez długów | 7 | 5 |
| Kierunek rozwoju | 8 | 3 |
| Surowiec w produkcie | 6 | 3 |
| Własne badania | 0 | 0 |
| **Zdanie zapasowe** | — | **6** (było 14) |

Zapasowe dostają: WPY, PLX, BHI, MIN, SKP, QBF. Żadna podpowiedź nie pasuje do połowy giełdy. „Własne badania” pojawią się w trakcie gry, bo na starcie nikt nie ma technologii. Dywidenda zmienia się między grami.

## Przegląd fraz na 66 spółkach
Wszystkie frazy są prawdziwe, ale nie wszystkie dokładne.

**Spółki bez podsektora, którym przydałby się dokładniejszy opis.** Nie zgadywałem. Frazy nie kłamią, ale są ogólne. Dokładniejsza fraza wymaga podsektora w danych, a to zmienia też mechanikę (np. wsad i listę `listedOnly`), więc decyzja należy do użytkownika.

| Spółka | Fraza teraz | Co wynika z nazwy | Możliwa zmiana danych |
|---|---|---|---|
| KWM Kopalnie Węgla Mine | dostarcza towary i usługi innym firmom | kopalnia | podsektor Wydobycie |
| ORT Orzeł Telekom | dostarcza usługi i rozwiązania cyfrowe | telekom | nowy podsektor Telekomunikacja |
| STM Stocznia Morska | dostarcza towary i usługi innym firmom | stocznia | podsektor Przemysł ciężki |
| BTX Betonex | dostarcza towary i usługi innym firmom | beton | podsektor Przemysł ciężki |
| KRA Krawaciarze Inc. | dostarcza towary i usługi innym firmom | doradcy | bez zmiany, fraza pasuje |
| PIX Pikselowe Marzenia | dostarcza usługi i rozwiązania cyfrowe | grafika lub gry | do decyzji |
| NRB Nova Robotics | dostarcza usługi i rozwiązania cyfrowe | robotyka to drugi segment | zamiana segmentów |
| BOR Biurowce Obsługi Rachunkowej | obsługuje firmy i klientów indywidualnych | biurowce to drugi segment | zamiana segmentów |
| PLX Plandex | organizuje wyjazdy i wypoczynek | niejasne | do decyzji |

**Dane niezgodne z nazwą.** Podsektor Fintech mają WIP WinPost i CRO Cyber-Ochrona. Dlatego fraza Fintechu jest ogólna: „obsługuje klientów przez internet”. BFP Bank Finansowania Projektów i FPM Fundacja Przedsiębiorczości Miejskiej są typu `Holding`, więc dostają „zarządza kapitałem i udziałami w innych firmach”.

## 12 przykładów
**ECL, Śmieciowa, Chemia:** EcoLube to świeża siła w sektorze Chemia, wytwarza surowce i półprodukty dla przemysłu. Uważnie patrzy na ceny ropy. Hasło firmy: „Najpierw przetrwać, potem podbijać”. W tej branży dużo zależy od tego, co dzieje się z kosztem energii. „Analizujemy trendy rynkowe, aby podejmować świadome i odpowiedzialne decyzje.” — mówi prezes Stępień.

**KFX, Śmieciowa, Żywność:** Konfiturex to świeża siła w sektorze Żywność, dostarcza jedzenie i napoje klientom w całym kraju. Bank jest tu ważnym wspólnikiem, choć nie ma akcji. Hasło firmy: „Dziś parter, jutro piętro”. Tu o wyniku często decydują ceny składników. „Utrzymanie płynności i dyscyplina kosztowa to fundamenty naszej działalności w obecnym klimacie.” — mówi prezes Ostrowski.

**BLP, Śmieciowa, Medycyna:** Błyskawiczna Proteza to nowicjusz w sektorze Medycyna, produkuje sprzęt dla lekarzy i pacjentów. Kurs potrafi zaskoczyć nawet w spokojnej branży. Hasło firmy: „Małe kroki, duże nadzieje”. Popyt na zdrowie rzadko zależy od koniunktury. „Dzięki zaufaniu inwestorów i ciężkiej pracy całego zespołu osiągamy kolejne kamienie milowe.” — mówi prezes Mazur.

**TIR, Brązowa, Transport i logistyka:** Tir-Pol Spedycja to lokalny gracz w sektorze Transport i logistyka, przewozi ładunki koleją i drogami. Nerwowo śledzi notowania ropy. Hasło firmy: „Dziś parter, jutro piętro”. W tej branży liczy się każdy kilometr i każdy litr paliwa. „Działamy zgodnie z przyjętym planem, adaptując się do zmian w otoczeniu biznesowym.” — mówi prezes Stępień.

**KWM, Brązowa, Przemysł:** Kopalnie Węgla Mine to rozpoznawalna marka w sektorze Przemysł, dostarcza towary i usługi innym firmom. Bank jest tu ważnym wspólnikiem, choć nie ma akcji. Hasło firmy: „Dziś parter, jutro piętro”. „Nasza siła leży w stabilności i przewidywalności, co cenią nasi partnerzy biznesowi.” — mówi prezes Górski.

**DPB, Srebrna, Gaming:** DVD Project Black to sprawdzony partner w sektorze Gaming, tworzy i wydaje gry. Sporą część majątku finansuje długiem. Hasło firmy: „Konkurencja niech się martwi”. Jedna premiera potrafi przesądzić o całym roku. „Utrzymanie płynności i dyscyplina kosztowa to fundamenty naszej działalności w obecnym klimacie.” — mówi prezes Jankowski.

**SIK, Srebrna, Chemia:** Siarkobrzeg to ważny gracz w sektorze Chemia, wytwarza surowce i półprodukty dla przemysłu. Bank jest tu ważnym wspólnikiem, choć nie ma akcji. Hasło firmy: „Solidnie i terminowo”. „Dzięki zaufaniu inwestorów i ciężkiej pracy całego zespołu osiągamy kolejne kamienie milowe.” — mówi prezes Wiśniewska.

**SKP, Złota, Dobra konsumpcyjne (zdanie zapasowe):** SuperKonsumpcja! to wyznacznik standardów w sektorze Dobra konsumpcyjne, sprzedaje towary codziennego użytku. Na tle branży nie wyróżnia się na razie niczym szczególnym. Hasło firmy: „Konkurencja niech się martwi”. „Nie tylko spełniamy prognozy, my je przekraczamy. To nowy standard w naszej firmie.” — mówi prezes Lewandowska.

**STM, Złota, Przemysł:** Stocznia Morska to czołowy gracz w sektorze Przemysł, dostarcza towary i usługi innym firmom. Uważnie patrzy na ceny metali. Hasło firmy: „Konkurencja niech się martwi”. Gdy gospodarka zwalnia, ta branża czuje to jako jedna z pierwszych. „Rynek jest wymagający, ale dzięki efektywności operacyjnej utrzymujemy solidną pozycję.” — mówi prezes Kozłowski.

**GRET, Złota, Nieruchomości (REIT):** Global Real Estate Trust to kluczowy gracz w sektorze Nieruchomości, wynajmuje nieruchomości i dzieli się czynszem z akcjonariuszami. Bank jest tu ważnym wspólnikiem, choć nie ma akcji. Hasło firmy: „Solidnie i terminowo”. Tu czynsze płyną powoli, ale regularnie. „Rynek jest wymagający, ale dzięki efektywności operacyjnej utrzymujemy solidną pozycję.” — mówi prezes Szymański.

**BEW, Szmaragdowa, Energia (OZE):** Bałtycka Energia to mocarstwo w sektorze Energia, wytwarza prąd ze źródeł odnawialnych. Chętnie dzieli się zyskiem z akcjonariuszami. Hasło firmy: „Rynek nas zna, konkurencja też”. Energia to branża, w której państwo zawsze ma coś do powiedzenia. „Dzięki zaufaniu inwestorów i ciężkiej pracy całego zespołu osiągamy kolejne kamienie milowe.” — mówi prezes Kamińska.

**ORT, Szmaragdowa, Technologia:** Orzeł Telekom to gigant w sektorze Technologia, dostarcza usługi i rozwiązania cyfrowe. Kurs chodzi spokojniej niż u większości sąsiadów z branży. Hasło firmy: „Nie gonimy rynku, to rynek wie, gdzie jesteśmy”. Tu rynek płaci głównie za przyszłość, nie za przeszłość. „Jesteśmy na fali wznoszącej i nie zamierzamy zwalniać tempa.” — mówi prezes Kowalski.

## Karta spółki na ekranie
Sprawdzone w grze, konsola bez błędów. Tekst mieści się w sekcji „O spółce”.

- Spółka prywatna: [BurgerLand](zrzuty_0.17.8/karta_prywatna_BUL.jpg)
- Spółka państwowa ze stałym opisem: [NatGaz](zrzuty_0.17.8/karta_panstwowa_NAG.jpg)

## Propozycja opisu MLD (do akceptacji, nie w grze)
> Państwowa kopalnia i huta miedzi, w której każdy nowy rząd obiecuje modernizację. Wynik idzie za ceną metali, a rachunki za prąd zjadają marżę.

## Odstępstwa od planu
- **21 sektorów zamiast 16:** lista z `sectorSpecifics` nie pokrywała m.in. Obronności, Budowlanego i Transportu.
- **Mediana zmienności:** liczona ze spółek startowych, nie z bieżących, żeby podpowiedź nie zmieniała się przy cudzym debiucie.
- **Wybór podpowiedzi:** najwyższy stały numer z hasha symbolu i rodzaju podpowiedzi. Nowa prawdziwa podpowiedź rzadziej wypiera dotychczasową.
- **Poziom giełdy zmienia też hasło firmy** przy przejściu między pulami, zgodnie z poleceniem poprawek. Plan mówił tylko o pierwszym zdaniu.

## Do uwagi
- **Podpowiedzi o długu mogą się zmieniać w trakcie gry:** zadłużenie zmienia się co kwartał, więc spółka blisko progu 33% może przechodzić między podpowiedziami. Mieści się to w zasadzie „gdy przestanie być prawdziwa”.
- **Powtórzenia:** „Bank jest tu ważnym wspólnikiem” i to samo hasło mogą się trafić kilku spółkom na tej samej giełdzie, bo pule są małe.
- **„Prezes” przy nazwiskach kobiet:** bez zmian, jak w reszcie gry.
- **`plany/opisy_spolek_pl.md`:** pozostałe propozycje zostają tylko jako materiał.
