# Kontrola 0.17.8: generator opisów spółek

Gałąź `claude/impl-017-s0b-891539` po scaleniu `zmiany-AI` 5fe70bd, nie scalona z powrotem i nie wypchnięta. Testy: **968/968**, w tym 7 nowych w grupie „0.17.8 Generator opisów spółek”. Plan: `plany/plan_generator_opisow.md`.

## Co zrobione
- **Generator w `companies.js`:** `getDescriptionSentences` składa opis na bieżąco. Warianty wybiera hash, więc tekst jest ten sam przy każdym otwarciu karty. Opis nie trafia do zapisu.
- **Pierwsze zdanie:** pozycja według poziomu giełdy i krótka fraza działalności.
- **Środek:** dokładnie 1 podpowiedź oraz 1–2 zdania ozdobne (motto i zdanie o charakterze sektora).
- **Ostatnie zdanie:** cytat prezesa z puli `neutral` i `positive`.
- **Stałe opisy:** przeniesione ENG, TRN, PUR, NOC; usunięte ZST, SLS, TIR. Testy S2 i S4 poprawione. Po prywatyzacji stały opis znika i działa generator.
- **Stare zapisy:** pole `descriptionParts` jest pomijane. Nowe spółki go nie dostają.
- **Usunięty martwy kod:** `sectorSpecifics`, `getCEOQuote`, `getVolatilitySentence`.
- **Bez zmian:** startupy, instytuty i spółki zagraniczne.

## Odstępstwa od planu
- **21 sektorów zamiast 16:** tabela fraz obejmuje wszystkie sektory z `SECTOR_NAMES`. Lista 16 z `sectorSpecifics` nie pokrywała m.in. Obronności, Budowlanego i Transportu.
- **Poziom 4 (Platynowa):** plan mówi „poziomy 5 i 6: `giant`” oraz „jak w `getCompanyDescriptor`”, a stary kod dawał `giant` już od poziomu 4. Wybrałem pierwsze zdanie planu: poziomy 3–4 używają `leader`, 5 i wyższe `giant`.
- **Pula pozycji:** „ugruntowana pozycja” usunięta, a „instytucja w branży” i „uznana marka w branży” skrócone, bo nie składały się ze zdaniem „to … w sektorze”.
- **Mediana zmienności:** liczona ze spółek startowych, nie z bieżących. Dzięki temu podpowiedź nie zmienia się przy cudzym debiucie.
- **Wybór podpowiedzi:** najwyższy stały numer z hasha symbolu i rodzaju podpowiedzi, nie „hash modulo liczba pasujących”. Nowa prawdziwa podpowiedź rzadziej wypiera dotychczasową.

## Progi i rozkład podpowiedzi (66 spółek przez generator, jedna nowa gra)
Progi po strojeniu: stabilna ≤ 0,8 mediany sektora (w planie 0,7), nerwowa ≥ 1,3 (w planie 1,4), wsad ≥ 0,15, produkt ≥ 0,3, dywidenda tylko polityki `Aggressive` i `Total`. Przy `Balanced` dywidenda pasowała do 33 z 66 spółek, czyli połowy giełdy.

| Podpowiedź | Pasuje | Wybrana |
|---|---|---|
| Stabilna | 20 | 10 |
| Nerwowa | 18 | 11 |
| Kierunek rozwoju | 8 | 3 |
| Surowiec we wsadzie | 16 | 12 |
| Surowiec w produkcie | 6 | 3 |
| Dywidenda | 13 | 6 |
| Własne badania | 0 | 0 |
| Odporność | 19 | 7 |
| Zdanie zapasowe | — | 14 |

- **Własne badania** nie pojawiają się na starcie, bo żadna spółka nie ma jeszcze odblokowanych technologii. Podpowiedź wejdzie w trakcie gry; warunek ma test.
- **Dywidenda** zmienia się między grami, bo polityki są losowane na starcie.
- **Długość:** 31 opisów ma 4 zdania, 35 ma 5.

## 12 przykładów
**ECL, Śmieciowa, Chemia:** EcoLube to świeża siła w sektorze Chemia, wytwarza surowce i półprodukty dla przemysłu. Uważnie patrzy na ceny ropy. Wizją spółki jest zostanie niekwestionowanym liderem innowacji w swojej branży. W tej branży dużo zależy od tego, co dzieje się z kosztem energii. „Analizujemy trendy rynkowe, aby podejmować świadome i odpowiedzialne decyzje.” — mówi prezes Stępień.

**SUM, Śmieciowa, Żywność:** Super Makarony to nowicjusz na rynku w sektorze Żywność, dostarcza produkty na sklepowe półki w całym kraju. Popyt nie znika tu nawet w recesji. Kluczem do sukcesu jest dla nas partnerstwo i transparentność w biznesie. „Naszym priorytetem jest optymalizacja procesów i długoterminowa satysfakcja klienta.” — mówi prezes Wiśniewski.

**BAL, Brązowa, Turystyka:** Bałtyckie Rejsy to pewny gracz w sektorze Turystyka, organizuje wyjazdy i wypoczynek. Akcjonariusze rzadko czekają tu na dywidendę z pustymi rękami. Inwestujemy w ludzi, bo to oni tworzą wartość naszej firmy. „Budujemy wartość dla naszych akcjonariuszy każdego dnia, konsekwentnie realizując strategię.” — mówi prezes Zieliński.

**KWM, Brązowa, Przemysł:** Kopalnie Węgla Mine to bezpieczna przystań w sektorze Przemysł, wytwarza produkty dla innych firm. Akcje ruszają się mocniej niż u większości sąsiadów z branży. Myślimy globalnie, działamy lokalnie. „Nasza siła leży w stabilności i przewidywalności, co cenią nasi partnerzy biznesowi.” — mówi prezes Górski.

**NAG, Brązowa, Energia (stały opis):** NatGaz to zaufana marka w sektorze Energia. Państwowa spółka wydobycia i importu gazu, z kontraktami długoterminowymi ze wschodu „do renegocjacji”. Przychody rosną razem z ceną gazu. „Dzięki zaufaniu inwestorów i ciężkiej pracy całego zespołu osiągamy kolejne kamienie milowe.” — mówi prezes Michalski.

**DPB, Srebrna, Gaming:** DVD Project Black to sprawdzony partner w sektorze Gaming, tworzy i wydaje gry. Na tle branży nie wyróżnia się na razie niczym szczególnym. Budujemy przyszłość w oparciu o tradycję, doświadczenie i nowoczesne technologie. Jedna premiera potrafi przesądzić o całym roku. „Utrzymanie płynności i dyscyplina kosztowa to fundamenty naszej działalności w obecnym klimacie.” — mówi prezes Jankowski.

**SIK, Srebrna, Chemia:** Siarkobrzeg to filar rynku w sektorze Chemia, wytwarza surowce i półprodukty dla przemysłu. Akcjonariusze rzadko czekają tu na dywidendę z pustymi rękami. Firma kieruje się zasadą zrównoważonego rozwoju i odpowiedzialności społecznej. „Dzięki zaufaniu inwestorów i ciężkiej pracy całego zespołu osiągamy kolejne kamienie milowe.” — mówi prezes Wiśniewska.

**SKP, Złota, Dobra konsumpcyjne:** SuperKonsumpcja! to lider rynku w sektorze Dobra konsumpcyjne, sprzedaje towary codziennego użytku. Na tle branży nie wyróżnia się na razie niczym szczególnym. Jakość nie jest celem, jest standardem. „Nie tylko spełniamy prognozy, my je przekraczamy. To nowy standard w naszej firmie.” — mówi prezes Lewandowska.

**STM, Złota, Przemysł:** Stocznia Morska to kluczowy gracz w sektorze Przemysł, wytwarza produkty dla innych firm. Uważnie patrzy na ceny metali. Budujemy przyszłość w oparciu o tradycję, doświadczenie i nowoczesne technologie. Gdy gospodarka zwalnia, ta branża czuje to jako jedna z pierwszych. „Rynek jest wymagający, ale dzięki efektywności operacyjnej utrzymujemy solidną pozycję.” — mówi prezes Kozłowski.

**UNP, Platynowa, Technologia:** Universal Projects to lider rynku w sektorze Technologia, tworzy oprogramowanie i usługi cyfrowe. Akcjonariusze rzadko czekają tu na dywidendę z pustymi rękami. Spółka stawia na dynamiczny rozwój, elastyczność i pełną satysfakcję klienta. „Technologia, którą rozwijamy, daje nam przewagę na lata. Konkurencja może tylko patrzeć.” — mówi prezes Walczak.

**BEW, Szmaragdowa, Energia:** Bałtycka Energia to gigant na rynku w sektorze Energia, dostarcza energię firmom i domom. Chętnie dzieli się zyskiem z akcjonariuszami. Wizją spółki jest zostanie niekwestionowanym liderem innowacji w swojej branży. Energia to branża, w której państwo zawsze ma coś do powiedzenia. „Dzięki zaufaniu inwestorów i ciężkiej pracy całego zespołu osiągamy kolejne kamienie milowe.” — mówi prezes Kamińska.

**ORT, Szmaragdowa, Technologia:** Orzeł Telekom to konglomerat w sektorze Technologia, tworzy oprogramowanie i usługi cyfrowe. Kurs chodzi spokojniej niż u większości sąsiadów z branży. Kluczem do sukcesu jest dla nas partnerstwo i transparentność w biznesie. Tu rynek płaci głównie za przyszłość, nie za przeszłość. „Jesteśmy na fali wznoszącej i nie zamierzamy zwalniać tempa.” — mówi prezes Kowalski.

## Propozycja opisu MLD (do akceptacji, nie w grze)
> Państwowa kopalnia i huta miedzi, w której każdy nowy rząd obiecuje modernizację. Wynik idzie za ceną metali, a rachunki za prąd zjadają marżę.

## Do uwagi
- **Generyczność fraz:** fraza sektora nie zawsze pasuje do spółki: Orzeł Telekom „tworzy oprogramowanie”, a Kopalnie Węgla „wytwarzają produkty dla innych firm”. To skutek jednej frazy na sektor. Precyzję dałyby frazy na podsektor albo stałe opisy.
- **Niezgodność pozycji i podpowiedzi:** zdarza się, np. „bezpieczna przystań” przy „akcje ruszają się mocniej”. Pozycja zależy tylko od poziomu giełdy, a pula `stable` obejmuje to określenie.
- **Motta:** pula jest stara i korporacyjna, więc przy spółce ze Śmieciowej brzmi poważniej niż plan wskazuje („niekwestionowanym liderem”).
- **Cytat a zgodność płci:** „mówi prezes Wiśniewska” używa tego samego słowa „prezes” co reszta gry.
- **`plany/opisy_spolek_pl.md`:** pozostałe propozycje zostają tylko jako materiał, plan generatora je zastępuje.
- **Sprawdzone w grze:** rozkład i przykłady z uruchomionej gry, konsola bez błędów. Karty spółki nie oglądałem na ekranie po zmianie; `assembleDescription` zwraca tam zwykły tekst jak wcześniej.
