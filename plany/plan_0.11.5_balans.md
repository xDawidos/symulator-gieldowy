# Plan aktualizacji 0.11.5 „Balans”

Źródło: [testy_ogolne_0.11.md](testy_ogolne_0.11.md). Cel: żadna mechanika nie daje pewnego zysku bez ryzyka. Poboczne systemy mają znaczenie dla kariery, a gra nie zasypuje gracza powiadomieniami.

Kolejność: B1 → B2 → B3 → B4 → B5. Po każdej części testy, przebieg ×50 i commit. Na końcu pomiar kontrolny według celów z sekcji „Jak sprawdzimy”.

---

## B1. Exploity — mechaniki za mocne

| Mechanika | Teraz | Po zmianie |
|---|---|---|
| **Pakiet „pod stołem”** | +10% premii, ryzyko 20, bez limitu | Najwyżej 1 na kwartał. Premia 10% → 4% przy pakiecie o wartości ≥ 10% aktywów funduszu. Ryzyko 20 + 1 pkt za każdy 1% aktywów (pakiet = 30% aktywów → ryzyko 50). |
| **Parabank: akcje** | Kurs +8–20% co kwartał, upadek zawsze po 5–6 kw. | Termin upadku losowy (3–8 kw.), ukryty. Kurs z szumem (−10…+20% na kwartał). Ostrzeżenie KNF może przyspieszyć śledztwo o 1–2 kw. Sprzedaż dużego pakietu w fazie otwarcia (≥ 2% akcji) może wywołać „panikę” i wcześniejszy upadek. |
| **Umorzenie długu** | 30% zobowiązań za 5% tej kwoty | Najwyżej 15% zobowiązań, nie więcej niż 5% aktywów funduszu. Łapówka 10%. Drugi raz w tej samej spółce w ciągu roku: ryzyko ×2. |
| **Dopłata do inwestycji za akcje** | Emisja po cenie −5%, bez limitu | Emisja po cenie rynkowej. Dyskonto 5% tylko do 25% kosztu inwestycji. Ponad limit akcji tylko do +10% liczby akcji spółki. |
| **Wejściówka** | −15%, przysługa 10% kosztu, pełny handel | Akcji nie można sprzedać, dopóki stanowisko nie daje dostępu do tej giełdy (zastaw „do czasu awansu”). Przysługa 15%. |
| **Cynk** | 60% sukcesu (+40…80%) / 40% porażki | 50% sukces, 35% porażka, 15% „prowokacja policyjna” (kurs bez zmian, +30 podejrzeń). Oczekiwany zysk ok. +5% zamiast +21%. |
| **Prezenty dla botów** | +1 pkt za 100 zł, raz na kwartał | Efekt malejący: każdy kolejny prezent dla tej samej osoby działa w połowie. Charaktery: „wieloryb” i „Wilk” przyjmują tylko duże kwoty, „Stoik” odmawia. Bez wzrostu relacji powyżej 60 samymi prezentami. |
| **Kupno ETF i akcji przez boty** | Bez prowizji operatora | Prowizja także dla ETF-ów (przy rebalansingu) i banków inwestycyjnych. Równe zasady. |

## B2. Poczta i powiadomienia (drażniące)

- **Ważne maile przypięte i niekasowane:** żądania mafii, walne, kary, oferty (prywatyzacja, emisja ratunkowa, pakiet od bota), wyrok, decyzja w sprawie przejęcia. Limit 150 dotyczy tylko zwykłych wiadomości.
- **„Wydanie gazety” raz na tydzień gry:** rutynowe newsy (raporty, badania, ruchy botów) zbierane w jednym mailu z listą punktów, zamiast osobnego maila dla każdego. Cel: 10–20 maili na kwartał zamiast ~106.
- **Okna otwierające się same** (wyniki festynu, oferta IPO banku, ranking) zamienione na pasek powiadomień z przyciskiem „Otwórz” i na mail.
- **Żądania mafii:** termin do końca następnego kwartału. Przypomnienie w pasku pilnych wiadomości na 1 kwartał przed karą. Licznik żądań w menu „Szara strefa”.
- **Blokada handlu poniżej 1 zł:** zamiast 80% szans co tick — blokada dopiero po 2 tygodniach gry poniżej 1 zł, z komunikatem.
- **Kpiące maile wrogich botów:** najwyżej jeden na kwartał od wszystkich wrogów łącznie.

## B3. Systemy poboczne ważne dla kariery (do ominięcia)

- **Cele korporacji na okres oceny (KPI).** Co okres zarząd przydziela 2 losowe cele z puli; każdy spełniony daje +5 do oceny zarządu i premię z budżetu korporacji:
  - miejsce w radzie nadzorczej w 2 spółkach;
  - udział w PPP lub konsorcjum projektu specjalnego;
  - zero przewinień compliance w okresie;
  - wynik powyżej lokaty i inflacji;
  - fundusz w ETF-ach nie więcej niż 30% aktywów (dywersyfikacja);
  - udział w udanym debiucie startupu;
  - dywidendy z portfela ≥ X.

  Cele widać w zakładce Firma (rozszerzenie obecnych targetów).
- **Dotacje dla policji i KNF:** reputacja „przyzwoitego funduszu”. Kolejne kontrole KNF częściej kończą się czysto (+zaufanie), a mandaty są niższe o 25%. Bez wpływu na podejrzenia, żeby nie było „odpustu”.
- **Projekty specjalne dla funduszu bez większości:** obligacje projektowe. Fundusz kupuje część finansowania jako dług (oprocentowanie + premia przy ukończeniu, ryzyko przy niepowodzeniu). Bonusy wzrostu w karcie spółki w formie widocznej plakietki.
- **Gwardia widoczna:** relacja jak z botami w zakładce Firma. Przyjazna Gwardia proponuje współinwestycje w zbrojeniówkę. Wroga Gwardia głosuje przeciw na walnych spółek, w których fundusz ma udziały.
- **Wdrożone w B3:** pula 6 celów: rada nadzorcza w 2 spółkach, PPP/konsorcjum/obligacje projektu, zero compliance, wynik ponad lokatę i inflację, dywersyfikacja (≥ 6 spółek, żadna > 25% aktywów; zamiast limitu ETF, który był spełniony „za darmo”), dywidendy ≥ 2% aktywów. Cel „debiut startupu” odłożony. Premia za cel: 5% budżetu korporacji (max 10 tys. zł) do portfela prywatnego. Przyzwoity fundusz: dotacje ≥ max(5 tys. zł, 0,5% aktywów), wygasają 10% na kwartał. Obligacje projektowe: 7% rocznie od konsorcjum, +5% przy ukończeniu, upadek w budowie = odzysk 50%; do 20% kosztu projektu i 10% aktywów funduszu.

## B4. Pogłębienie płytkich mechanik

- **Rynek JU:** decyzje gracza:
  - kampania marketingowa funduszu (koszt z budżetu korporacji, napływ klientów wg charakterów);
  - zmiana opłaty za zarządzanie (niższa przyciąga klientów, ale daje mniejszy budżet korporacji).
- **PPP i obligacje:** zdarzenia w trakcie:
  - opóźnienie odsetek;
  - wcześniejszy wykup z premią;
  - restrukturyzacja przy słabym budżecie miasta z wyborem „zgódź się / odmów”.
- **Rynki XTD i PLU5:** spółka, w której fundusz ma większość, może przenieść notowania na inny rynek. Niższa prowizja i opłata za notowanie, ale mniej inwestorów (niższy popyt i wycena −3%).
- **Wybory:** fundusz może wesprzeć kampanię partii z konta prywatnego, co wpływa na relacje z wygraną albo przegraną stroną. Ryzyko: KNF i wizerunek.
- **Wojny PR:** gracz z udziałem ≥ 20% (nie tylko większościowiec) może „podpowiedzieć” zarządowi kampanię.

## B5. Rynek i tempo

- **Mniej byczy rynek:** GIG +14% rocznie → cel +7–9% rocznie.
  - Inflacja w przychodach: 0,3 → 0,15.
  - Trend wzrostu sektorów −20%.
  - Silniejszy wpływ recesji na marże.
- **Liczba spółek:** miękki limit ok. 100 notowanych.
  - Ponad limitem rzadziej pojawiają się nowe debiuty (startupy, rynki, przykrywki).
  - Najmniejsze spółki z kondycją ≤ −3 częściej łączą się albo bankrutują.
- **Bezczynny fundusz:** komunikat korporacji, gdy zaufanie spada przez wynik gorszy od GIG lub lokaty („klienci odchodzą, bo…”). Dodatkowo podpowiedź w panelu funduszu.
- **Wartość księgowa a wycena:** kotwica księgowa w wartości godziwej ograniczona do 2× wartości z zysku. Koniec spółek z wyceną zawyżoną przez ogromną wartość księgową (WIP, KFX).

## Jak sprawdzimy (cele pomiaru po B5)

27 kwartałów na ×50 bez działań gracza plus scenariusze z exploitami:

| Wskaźnik | Teraz | Cel |
|---|---|---|
| GIG rocznie | +14% | +7–9% |
| Maile na kwartał | ~106 | 10–20 |
| Okna otwierające się samoczynnie | kilka na grę | 0 |
| Liczba spółek po 6,75 roku | ~97 | ≤ 100 |
| Zysk z pakietu „pod stołem” (pakiet 30% aktywów, 4 kw.) | ok. +12% NAV | ≤ +2% NAV przy realnym ryzyku wykrycia |
| Zysk z akcji parabanku (kupno w fazie otwarcia) | +40–100% prawie pewne | oczekiwany ≤ 0, duża zmienność |
| Oczekiwany zysk z cynku | +21% | ok. +5% |
| Testy automatyczne | 198 | 198 + testy B1–B5 |

## Decyzje (podjęte)

1. **Cele korporacji:** spełniony cel daje +5 do oceny zarządu, niespełniony −3. Cele mają realne znaczenie.
2. **Opłata za zarządzanie:** gracz może ją zmieniać (0,5–3% rocznie). Niższa przyciąga klientów, wyższa zasila budżet korporacji, ale odstrasza klientów wrażliwych na koszty.
3. **Wsparcie kampanii wyborczej:** z pieniędzy funduszu. Wygrana partia jest przychylna (np. więcej kontraktów, łagodniejsze kontrole), przegrana mniej. Darowizna polityczna z pieniędzy klientów to ryzyko: podejrzenia KNF, a przy dużej kwocie spadek zaufania.

## Wyniki pomiaru (po B5)

Trzy przebiegi ×50 bez działań gracza (ok. 22–29 kwartałów każdy):

| Wskaźnik | Przed 0.11.5 | Po 0.11.5 |
|---|---|---|
| GIG rocznie | +14% | od +3% do +17% zależnie od przebiegu (recesje); decyzja: bez dalszego strojenia |
| Maile na kwartał | ~106 | ok. 15 w stanie ustalonym, średnio ok. 20 (więcej na starcie, gdy odchodzą klienci) |
| Okna otwierające się samoczynnie | kilka na grę | 0 w 2 z 3 przebiegów; w 1 przebiegu 3 nieustalone (do obserwacji) |
| Liczba spółek | ~97 i rośnie | równowaga ok. 107–109 |
| Testy automatyczne | 198 | 226 |

**Zmiana względem planu (decyzja użytkownika):** zamiast sztywnego limitu 100 spółek jest presja zatłoczenia: od 100 do 120 spółek rośnie szansa fuzji i przejęć (do ×3), marże spadają do −2 pkt proc. (konkurencja), małe spółki z kondycją ≤ −3 mogą upaść, a debiutów jest najwyżej o 30% mniej. Otwarcie nowego rynku częściowo przenosi spółki z GPW zamiast tworzyć nowe.
