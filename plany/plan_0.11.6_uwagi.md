# Plan 0.11.6 „Uwagi z gry”

Źródło: uwagi gracza po ok. 5 minutach gry (po 0.11.5). Kolejność: U1 → U2 → U3, każda część z testami, krótkim przebiegiem ×50 i commitem. U4 (edukacja) to większy temat — osobny plan jako kierunek 0.12.

---

## U1. Błędy i exploity (najpierw)

| Problem | Przyczyna / zmiana |
|---|---|
| **Startup: 35 zł → 80% akcji, ok. 300 tys. zł zysku** | Pula akcji inwestorów dzieli się tylko między faktyczne wpłaty, a wycena IPO liczy się od pełnego celu zbiórki. Zmiana: udział = wpłata / max(wpłaty, cel zbiórki). Niezebrana część zostaje u założycieli (insiderzy). Wpłata 35 zł przy celu 300 tys. daje ułamek procenta. |
| **Od startu można handlować na wyższych giełdach** | Sprawdzić dostęp wg stanowiska (`canAccessExchange`, `syncExchangeAccessWithPosition`) przy nowej grze i po wczytaniu. Zablokować kupno, a w liście pokazać kłódkę z wymaganym stanowiskiem. |
| **Szósty zmysł za tani** | 200/500 XP → ok. 1500/3500 XP (porównanie z innymi umiejętnościami). |
| **Prywatne obligacje mają kosmiczne oprocentowanie** | Oprocentowanie = stopa obligacji skarbowych + premia za ryzyko wg kondycji spółki (ok. +1…+6 pkt proc.), z górnym limitem. |
| **Lokata nie widnieje w pozycjach funduszu** | Dodać lokaty (i PPP, obligacje projektowe) jako wiersze w tabeli pozycji funduszu. |
| **Przełącznik „portfel funduszu / prywatny” nic nie zmienia** | Przełącznik ma zmieniać tabelę pozycji, gotówkę i wartość, a w karcie spółki pokazywać, z którego konta kupujesz. |
| **Wrogie przejęcie nie wyskakuje na ekranie** | Wyjątek od zasady „bez okien”: decyzja o przejęciu (fundusz ≥ 20%) otwiera okno i pauzuje grę. |
| **Negocjacje w tym samym panelu** | Osobne okno negocjacji: Twoja żądana premia, odpowiedź agresora wg charakteru, kolejne rundy (max 3). |

## U2. Interfejs

- **NewHorizons:** sekcja zwijana jak inne giełdy. Nagłówek nie jest przyklejony do góry przy przewijaniu listy (albo przyklejony tylko w obrębie swojej sekcji).
- **Okno informacji o spółce:** nowy układ:
  - u góry nazwa, kurs, zmiana i plakietki;
  - pod spodem kafelki wskaźników (C/Z, C/WK, stopa dywidendy, kondycja, kapitalizacja);
  - wykres;
  - zakładki: Finanse / Akcjonariat / Zarządzanie / Historia.
- **Walne zgromadzenie** usunięte z bocznego menu; dostępne tylko z karty spółki i z maila.
- **Struktura akcjonariatu** bez przycisków walnego i inwestycji: tylko paski akcjonariuszy. Akcje są w zakładce „Zarządzanie”.
- **Filtr „tylko posiadane”** na liście spółek (fundusz / prywatne / oba).
- **„Zmiana 24h”** nie ma sensu w czasie gry. Kolumna „Zmiana (tydz.)” liczona w tygodniach gry, a w podpowiedzi zmiana kwartalna.

## U3. Fundamenty spółek

- **Spółki państwowe bez parametrów (np. C/Z):** dostają model wyników jak inne spółki (przychody, marża, historia kwartałów), więc C/Z, C/WK i dywidenda się wyświetlają.
- **Spółki z jednego sektora startują z prawie tym samym C/Z:** losowa rozbieżność na starcie:
  - marża ±30% profilu sektora;
  - tempo wzrostu ±;
  - cena startowa nie wprost z wartości godziwej (rynek przewartościowany albo niedowartościowany o −30…+40%).

  Analiza fundamentalna ma wtedy sens: są tanie i drogie spółki.

## U4. Kierunek 0.12: gra, która uczy (osobny plan)

Cel gry pośrednio: nauka podstaw giełdy i analizy fundamentalnej. Pomysły do rozpisania:

- **Ścieżka „Księgowy” → „Audytor”:** każdy poziom odblokowuje kawałek wiedzy i narzędzie:
  1. rachunek zysków i strat;
  2. bilans i zadłużenie;
  3. przepływy pieniężne;
  4. wykrywanie „kreatywnej księgowości” (spółki z zawyżonym zyskiem, które później korygują wyniki);
  5. audyt — zlecenie badania spółki przed zakupem.
- **Krótkie wyjaśnienia przy wskaźnikach** (C/Z, C/WK, ROE, zadłużenie, stopa dywidendy): co znaczy, jaki poziom jest „tani” w danym sektorze.
- **Zadania szkoleniowe** (CV/szkolenia): „znajdź spółkę z C/Z poniżej średniej sektora i dodatnim przepływem”, nagroda XP.
- **Raporty kwartalne do analizy:** spółki czasem fałszują wyniki; gracz z umiejętnością audytu może to wykryć wcześniej niż rynek.

## Weryfikacja

- Testy:
  - podział akcji startupu (mała wpłata = mały udział);
  - blokada giełd wg stanowiska;
  - oprocentowanie obligacji ≤ limit;
  - lokata w pozycjach;
  - przełącznik kont;
  - rozbieżność C/Z w sektorze;
  - parametry spółek państwowych.
- Przebieg ×50 i kilka zrzutów ekranu nowego okna spółki.
