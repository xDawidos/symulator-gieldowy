# Testy ogólne po wersji 0.11 „Ciemna Strefa”

## Metoda

- **Testy automatyczne:** 198 testów, wszystkie zaliczone.
- **Przebiegi gry na ×50:**
  - 27 kwartałów (6,75 roku gry) bez działań gracza;
  - kilka przebiegów po 13 kwartałów z wymuszonymi scenariuszami (mafia, parabank, szara strefa).
- **Co mierzyłem:**
  - błędy JS i niezmienniki świata;
  - czas ticku;
  - liczbę maili i toastów;
  - okna otwierające się samoczynnie;
  - wskaźniki rynku i makro.
- **Opłacalność ryzykownych mechanik:** policzona z parametrów w kodzie.

**Wydajność:** tick rynku trwa średnio 0,7 ms (p95 2,6 ms, maks. 5 ms) przy ok. 120 spółkach i 14 ETF-ach.

## Naprawione w trakcie testów

1. **Benchmark GIG.** Był zwykłą średnią ceną wszystkich akcji, więc każda nowa droga spółka (np. zbrojeniówka za 2000 zł) skokowo podbijała indeks.
   - W 6,75 roku GIG urósł 5×, a fundusz gracza nie miał szans go pobić.
   - To uderzało w zaufanie klientów, ocenę zarządu i awanse.
   - Teraz GIG jest indeksem łańcuchowym: liczy średnią zmianę cen spółek notowanych w obu chwilach.
2. **NaN w gotówce botów** (znany od etapu G1 jako „Bankier”). Kredyt w banku aktywowanym w trakcie gry nie miał oprocentowania. Teraz stopy są ustawiane dla wszystkich banków, z bezpiecznym zapasem.
3. **Nacjonalizacja** wykupywała tylko gracza i boty. Fundusze kolegów, konto prywatne, banki, holdingi i ETF-y zostawały z „wiszącymi” akcjami. Teraz wykupywani są wszyscy posiadacze.
4. **Korupcja bez gracza rosła do ~40.** Skorumpowani prezesi i boty dokładali więcej, niż instytucje usuwały. Po strojeniu poziom wynosi ok. 15–20, więc czyny gracza są wyraźnie widoczne.

## ✅ Mocne strony

- **Makro z Bankiem Centralnym:** oczekiwania analityków, niespodzianki i przenoszenie stóp na kredyty, lokaty i wyceny. Cykle sektorów dają realne powody do rotacji portfela.
- **Spójność modelu:** akcje w obrocie zawsze równe sumie posiadaczy, przepływy pieniędzy z uzgadnianiem i niezmiennikami. Dzięki temu nowe systemy (ETF-y, mafia, rynki) nie psują rynku po cichu.
- **Ciemna strefa powiązana z karierą:** wykrycie uderza w zaufanie klientów, wpis compliance i ocenę zarządu. Ryzyko ma sens w roli zarządzającego.
- **Parabank:** dobra narracja (śledztwo → policja → ucieczka prezesa) i prawdziwy dylemat lokat.
- **Mafia opt-in:** gracz, który nie dzwoni do „przyjaciół”, nie jest przez nią karany, a porażka grozi tylko współpracującym.
- **Wrogie boty mają realne skutki:** skup akcji, próby przejęć, sabotaż przez mafię. Zakładka Firma pokazuje relacje.
- **Dywidendowi arystokraci i ETF-y z prawdziwymi portfelami** urealniają rynek.

## ⚡ Za mocne (exploity)

| Mechanika | Dlaczego za mocna | Propozycja |
|---|---|---|
| **Pakiet „pod stołem”** | +10% wartości pakietu od razu, koszt 0,2% aktywów. Przy ok. 8% szans wykrycia na kwartał oczekiwana kara to ok. 0,2% aktywów. Powtarzalne co kwartał. | Limit 1 na kwartał. Premia malejąca z wielkością pakietu. Podejrzenie zależne od wielkości pakietu. |
| **Parabank: akcje** | Kurs rośnie co kwartał o 8–20%, a upadek ma stały termin (5–6 kw.). Kupno z rabatem 10% i sprzedaż w 3.–4. kwartale daje +40–100% prawie bez ryzyka. | Losowy termin upadku (3–8 kw.), kurs z szumem i możliwymi spadkami, wcześniejsze śledztwo przy ostrzeżeniu KNF. |
| **Umorzenie długu za łapówkę** | 30% zobowiązań spółki trafia do kapitału za 5% tej kwoty plus 0,4% aktywów. Przy dużym długu zysk dla NAV jest wielokrotnie większy niż koszt i ryzyko. | Limit kwotowy. Druga usługa w tej samej spółce mocno podnosi ryzyko. |
| **Dopłata do inwestycji za akcje −5% (G4)** | Natychmiastowe 5% zysku, powtarzalne do pełnego kosztu każdej inwestycji. | Emisja po cenie rynkowej albo limit 25% kosztu inwestycji. |
| **Wejściówka** | Akcje −15% minus przysługa 10% to ok. +5%. Do tego dostęp do giełd ponad stanowisko, czyli obejście ścieżki kariery. | Bez dostępu do sprzedaży, dopóki stanowisko na to nie pozwala, albo wyższa przysługa. |
| **Cynk** | Oczekiwana wartość ok. +21% pozycji (60% × +60% vs 40% × −37,5%). | Szansa sukcesu 45–50% albo cynk czasem fałszywy (policyjna prowokacja). |
| **Prezenty dla botów** | +1 pkt za 100 zł. Przyjaźń (60+) kosztuje kilka tysięcy zł, a daje pakiety −5% i trafne rady. | Malejący efekt kolejnych prezentów. Niektóre osobowości odrzucają prezenty. |

## ⚠️ Słabe

- **Bezczynny fundusz traci zaufanie do 0 w ok. 10 kwartałów.** To logiczne, ale nowy gracz może nie rozumieć dlaczego. Przydałby się komunikat „klienci odchodzą, bo przegrywasz z GIG / lokatą”.
- **Liczba spółek rośnie z 73 do ~97 w 6,5 roku** (startupy, rynki, przykrywki, zbrojeniówka). Tabela robi się długa, a filtry giełd tylko częściowo to rozwiązują.
- **Rynek wciąż jest dość byczy:** GIG +14% rocznie, nawet po poprawce.

## 😴 Nudne lub płytkie

- **Rynek JU:** tylko podgląd, bez decyzji.
- **PPP, obligacje, bony, lokaty:** „wpłać i czekaj”, bez zdarzeń w trakcie.
- **Projekty specjalne:** bonusy są niewidoczne (+0,4–1 pkt proc. wzrostu przychodów na kwartał). Gracz rzadko ma spółkę z gotówką na wkład.
- **Wybory i makro:** wyłącznie informacyjne. Gracz reaguje, ale niczego nie decyduje.
- **Rynki XTD/PLU5:** gracz tylko płaci prowizję. Brak decyzji (np. notowania własnej spółki na rynku z niższą prowizją).
- **Dotacje dla policji i KNF:** nie dają graczowi żadnej korzyści, więc nikt ich nie użyje.
- **Fundusz Gwardia:** dla gracza niewidoczny poza akcjonariatem.
- **Wojny PR:** tylko dla większościowca, efekty ±3%.

## 🚪 Do ominięcia w całości

- **Warunki zwycięstwa** (ocena zarządu: wynik vs GIG i zaufanie; dominacja: przejęcia funduszy) nie zależą od większości systemów. Można wygrać, ignorując:
  - startupy, budownictwo, miasto, PPP;
  - ETF-y, indeksy, lombard;
  - projekty specjalne, walne, mafię i szarą strefę.
- **Walne, projekty specjalne, obrony i wojny PR** działają tylko przy udziale ponad 50%. Gracz bez dużych pakietów nigdy ich nie zobaczy.
- **Mafia i szara strefa** są opcjonalne z założenia. To w porządku.

## 😤 Drażniące

- **Zalew poczty:** ok. 106 maili na kwartał. Przy ×1 to mail co ~3 s. Skrzynka trzyma 150 wiadomości, więc ważne maile (żądania mafii, walne, kary, oferty) szybko wypadają.
- **Okna otwierające się same w trakcie gry:** wyniki festynu (4× w 6,75 roku) i oferta IPO banku przerywają rozgrywkę.
- **Żądania mafii:** brak odpowiedzi do końca kwartału oznacza karę. Przy zalewie maili łatwo je przegapić i dostać karę bez winy.
- **Blokada handlu przy cenie poniżej 1 zł** (80% szans) zamraża spółki groszowe.
- **Kpiące maile wrogich botów co kwartał (35%)** są zamierzone, ale przy kilku wrogach robią się męczące.

## Rekomendacje (priorytety)

1. **Poczta:** ważne wiadomości (żądania, walne, kary, oferty) przypięte i niekasowane. Rutynowe newsy zbierane w jedno „wydanie gazety” na tydzień gry.
2. **Okna otwierane samoczynnie** zamienić na pasek powiadomień i pocztę.
3. **Zablokować exploity z tabeli „Za mocne”**, zwłaszcza pakiet „pod stołem”, akcje parabanku i dopłatę −5%.
4. **Powiązać systemy poboczne z karierą:** cele korporacji typu „zrealizuj projekt specjalny”, „miej 3 spółki z miejscem w radzie”, „zarób X na PPP”. Wtedy przestają być do ominięcia.
5. **Dać sens dotacjom dla policji i KNF:** niższe kary albo spadek podejrzeń w zamian za reputację „przyzwoitego funduszu”.
6. **Żądania mafii:** termin do końca następnego kwartału i przypomnienie w pasku pilnych wiadomości.
