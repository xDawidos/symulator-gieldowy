# Plan 0.12 „Nauka giełdy” (U4)

Cel: gra pośrednio uczy podstaw giełdy, analizy fundamentalnej, księgowości i audytu. Uczy przez mechanikę, nie wykłady. Gracz, który rozumie wskaźniki, zarabia więcej i unika pułapek. Wiedza pojawia się w chwili, gdy jest potrzebna: przy decyzji, na karcie spółki, po błędzie.

Punkt wyjścia (po 0.11.6):
- spółki różnią się marżą, wzrostem i wyceną;
- karta spółki ma kafelki C/Z, C/WK, stopy dywidendy, zadłużenia i kondycji;
- szkolenie „Księgowy” to dziś tylko podgląd „faktur” za 2000 zł i obniżka podatku;
- „Analityk Finansowy” ma jeden poziom (wycena analityczna).

Kolejność: N1 → N2 → N3 → N4 → N5. Każda część z testami, przebiegiem ×50 i commitem.

---

## N1. Akademia: słownik i porównanie z sektorem

- **Mediana sektora przy każdym wskaźniku** w karcie spółki, np. „C/Z 9,4 · sektor 12,1 → tania względem sektora”, z kolorem tanio/drogo. Tak samo dla C/WK, stopy dywidendy, marży i zadłużenia.
- **Słownik „Akademia”** (nowa zakładka w CV): ok. 20 haseł, np.:
  - kapitalizacja, C/Z, C/WK, EPS;
  - ROE, marża, zadłużenie, płynność;
  - dywidenda i dzień odcięcia;
  - przepływy pieniężne;
  - NAV, benchmark, dywersyfikacja, zmienność;
  - obligacje i ryzyko kredytowe;
  - fuzje i przejęcia.

  Każde hasło ma 2–3 zdania i **przykład z bieżącej gry** (np. „Energa ma C/Z 9,4 przy średniej sektora 12”).
- **Odblokowywanie przez kontakt:** hasło odblokowuje się, gdy gracz pierwszy raz trafi na pojęcie (np. pierwsza dywidenda, pierwsze przejęcie). Wtedy pojawia się krótkie powiadomienie „📘 Nowe hasło w Akademii”.
- **Objaśnienie po błędzie:** przy stracie z konkretnej przyczyny pojawia się podpowiedź z hasłem. Przykłady:
  - bankructwo spółki z zadłużeniem > 80%;
  - zakup tuż przed dniem odcięcia dywidendy;
  - niewypłacalność obligacji.

## N2. Skaner spółek i rozbudowany „Analityk Finansowy”

- **Skaner spółek** (nowe okno, poziom 1): filtry, kolumny sortowalne, zapisane presety.
  - C/Z niższe od sektora;
  - C/WK < 1;
  - stopa dywidendy > X;
  - zadłużenie < Y;
  - zysk rośnie rok do roku;
  - kondycja ≥ Z.

  Wyższe poziomy dodają kolejne kolumny (ROE, przepływy, czerwone flagi).
- **Analityk Finansowy, 3 poziomy:**
  1. wycena z C/Z sektora;
  2. wycena z wartości księgowej i z dywidend (model Gordona) — gracz widzi, że różne metody dają różne wyniki;
  3. konsensus analityków przed raportem kwartalnym.
- **Reakcja na niespodziankę:** kurs reaguje na różnicę między wynikiem a oczekiwaniami, a nie na sam wynik. To uczy, dlaczego „dobry raport” bywa spadkiem.

## N3. Ścieżka Księgowy → Audytor (5 poziomów, zastępuje obecnego „Księgowego”)

Każdy poziom odblokowuje narzędzie w zakładce Finanse karty spółki i hasła w Akademii:

| Poziom | Narzędzie | Czego uczy |
|---|---|---|
| 1. Rachunek zysków i strat | Wykres 4–8 kwartałów: przychody → EBITDA → amortyzacja → odsetki → podatek → zysk netto | skąd bierze się zysk i co go zjada |
| 2. Bilans | Struktura aktywów i pasywów, dług netto, płynność, ROE | majątek, dług, kapitał własny |
| 3. Przepływy pieniężne | Gotówka z działalności vs zysk netto, wydatki inwestycyjne | „zysk na papierze” a prawdziwe pieniądze |
| 4. Czerwone flagi | Ikony ostrzeżeń na liście i w skanerze | rozpoznawanie kreatywnej księgowości |
| 5. Audyt | Zlecenie badania spółki (koszt z funduszu, 1 kwartał) — prawdziwe wyniki | rola audytora, weryfikacja przed dużą inwestycją |

**Nowa mechanika: kreatywna księgowość.**
- Część spółek „poprawia” wyniki: prezes z cechą, spółka w złej kondycji przed emisją albo spółka pod presją wyników. Raportowany zysk jest wyższy od prawdziwego.
- Po 2–6 kwartałach przychodzi **korekta wyników**: kurs −20–40%, zmiana prezesa, wpis w dzienniku.
- **Czerwone flagi:**
  - zysk rośnie, a gotówka z działalności spada;
  - należności rosną szybciej niż sprzedaż;
  - zmiana audytora;
  - wynik zawsze minimalnie powyżej konsensusu.
- Firmy księgowe (spółki typu Accounting) wykonują audyty i zarabiają na nich. Czasem przeoczą oszustwo — afera audytora.

## N4. Zadania szkoleniowe (Mentor)

- **Mentor** w korporacji daje zadania z nagrodą (XP, premia, hasło w Akademii). Kilka aktywnych naraz, rotacja co okres. Przykłady:
  - kup spółkę z C/Z poniżej mediany sektora i dodatnim zyskiem; trzymaj 2 kwartały;
  - zbuduj portfel z 5 sektorów, żaden > 30%;
  - sprzedaj spółkę z czerwoną flagą przed korektą wyników;
  - porównaj 2 metody wyceny jednej spółki (skaner);
  - kup obligacje i lokatę — porównaj zwrot z ryzykiem.
- **Podsumowanie po zadaniu:** co poszło dobrze, z linkiem do hasła.
- Opcjonalnie **certyfikaty** (np. „Analityk”, „Audytor”) jako dodatkowy warunek awansu na wyższe stanowiska (decyzja niżej).

## N5. Mechaniki giełdowe pokazane wprost

- **Dzień odcięcia dywidendy:** kurs spada o wartość dywidendy, w karcie i na wykresie zaznaczony dzień odcięcia.
- **Płynność i spread:** duże zlecenie w małej spółce porusza kurs (już jest). Gracz widzi szacowany koszt wejścia przed zakupem („kupno 2000 akcji podniesie kurs o ~3%”).
- **Wykres z wydarzeniami:** raporty, dywidendy, przejęcia i korekty jako znaczniki na wykresie spółki.

## Zapis gry i testy

- **Zapis v13:**
  - stan oszustw księgowych (prawdziwy i raportowany zysk, termin korekty);
  - audyty w toku;
  - odblokowane hasła;
  - zadania Mentora;
  - presety skanera.

  Migracja: spółki bez oszustwa, poziom Księgowego przeniesiony 1:1 (dawne poziomy 1–3 → 1–3).
- **Testy:**
  - mediana sektora;
  - filtry skanera;
  - korekta wyników ujawnia oszustwo, a audyt wykrywa je wcześniej;
  - czerwone flagi pojawiają się przy oszustwie częściej niż bez niego;
  - zadania Mentora zaliczają się i wypłacają nagrody;
  - kurs spada o dywidendę w dniu odcięcia.

## Decyzje (podjęte)

1. **Księgowy:** zostaje mała obniżka podatków −2% (jeden poziom), główną nagrodą są narzędzia.
2. **Certyfikaty:** warunek awansu na wyższe stanowiska (od Kierownika projektu wzwyż) — zadania Mentora prowadzą do certyfikatów.
3. **Kreatywna księgowość:** rzadko, ok. 3–5% spółek naraz, głównie słabe spółki i prezesi ze skłonnością do nadużyć.
4. **Akademia:** słownik z przykładami z gry + krótkie quizy (3 pytania) za XP po odblokowaniu hasła.
