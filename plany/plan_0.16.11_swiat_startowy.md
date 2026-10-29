# Plan 0.16.11 „Świat startowy” (szkic zakresu; po 0.16.9, równolegle lub przed 0.16.10)

Źródło: zgłoszenie użytkownika z 2026-10-29: przy starcie z Niemiec fundusz jest w złotówkach, wszystkie akcje na giełdzie są polskie, a niemieckie firmy są tylko jako rynek zagraniczny. Decyzje użytkownika (2026-10-29): **zestawy krajowe + wspólne uniwersalne**, **waluta konta = waluta kraju startowego (EUR dla Niemiec)**, **najpierw Niemcy, potem USA i Czechy tym samym schematem**. Klasyfikacja firm na polskie i uniwersalne ustalana razem z użytkownikiem (propozycja niżej).

## Cel

Kraj startowy zmienia świat gracza, a nie tylko dodatkowe rynki: giełda macierzysta (np. „Frankfurt” zamiast GPW), firmy krajowe tego kraju, waluta konta i NAV, pensje i podatki w tej walucie, społeczeństwo i polityka kraju (S0d z 0.16.6). Polska zostaje tylko przy starcie z Polski, a wcześniej „zagraniczne” firmy kraju startowego stają się krajowymi.

## Zakres

### K0. Klasyfikacja firm startowych (z użytkownikiem)
- 53 firmy startowe z `companies.js` dzielimy na **polskie** (tylko start PL, część stanowi tło fabuły, np. spółki państwowe) i **uniwersalne** (marki bez narodowości, występują w każdym kraju startowym, ewentualnie z lokalną nazwą).
- Propozycja robocza (do akceptacji):
  - **Polskie:** Konfiturex, Miejskie Ziemniaki, Super Makarony, Kopalnie Węgla Mine, Czysty Błysk, Drużyna Holding, Bałtyckie Rejsy, Lek-Pol, Bank Rolno-Spożywczy, Krajoznawsto Obce, Linapol, Siarkobrzeg, Uniwersytet Gdański, Stocznia Morska, Bałtycka Energia, Orzeł Telekom, Energa, Tauron, Państwowy Uran, Miedź Ludowa, Narodowy Operator Cyfrowy, Elektrownia SA, Pikselowe Marzenia, Betonex, Błyskawiczna Proteza.
  - **Uniwersalne:** EcoLube, Alicante Housing, Wolf & Stein Tech., WinPost, Knor-FIX, Dunder Mifflin Paper Company, BurgerLand, Beretxol, DVD Project Black, WayPlay, Plandex, GUM Med Research, VitaGen, Cyber-Ochrona, Annesco, Meferox, Instytut Badań Stosowanych, BlueBull, Cyberfood Corp, WielkiWoltaż, Krawaciarze Inc., Sanitas Szpitale, SuperKonsumpcja!, Universal Projects, Cortex Neural, KrzeUraFos4, Biurowce Obsługi Rachunkowej, Nova Robotics.
- Uniwersalne dostają lokalną waluty i nazwę giełdy; część może mieć lokalne warianty nazw („Sanitas Krankenhäuser”).

### K1. Zestaw niemiecki
- Dane niemieckie z `countries_data.js` (13 + 3 państwowe) stają się firmami **krajowymi** przy starcie z Niemiec; dopisujemy brakujące do liczby startowej zbliżonej do polskiej (docelowo ok. 50 razem z uniwersalnymi), z podziałem na poziomy giełd (od śmieciowej do diamentowej), sektory, spółki państwowe (tylko na giełdzie macierzystej), banki, giganci. Nazwy fikcyjne w stylu gry (parodie niemieckich marek).
- Polskie spółki przy starcie z Niemiec: opcjonalnie jako rynek zagraniczny (kraj PL) bez biletu na start lub z biletem, do decyzji w K0.

### K2. Waluta konta i giełda macierzysta
- Waluta bazowa i `toPln` uogólnione na `toBase`/kurs bazowy: konto, NAV, ceny, pensje, podatki, dywidendy w walucie kraju startowego (EUR dla DE, USD dla US, CZK dla CZ); PLN zwykłą walutą w kantorze.
- Inwentaryzacja ok. 300 literałów „PLN/zł” (diagnoza `raporty/diagnoza_0.16.6_s0.md`): UI wyświetla walutę z jednego miejsca; testy z różnymi walutami bazowymi; zapis v-następna z migracją (stare zapisy = PL/PLN).
- Giełda macierzysta (nazwa, godziny sesji, opłaty) z danych kraju; poziomy giełd (`exchanges`) przeskalowane do waluty (progi cenowe, kapitalizacja, minimalne opłaty).

### K3. Społeczeństwo i polityka kraju startowego
- S0d z 0.16.6: klasy, partie, ustawy, migracja, urzędy dla kraju startowego (dla DE 6 partii zamiast PL), kryzysy z krajem startowym jako źródłem, spółki państwowe i banki centralne danego kraju.
- Zakres może być osobną wersją po K0–K2.

### K4. Testy i kontrola
- Testy: start z DE (waluta EUR, brak polskich firm krajowych, niemieckie krajowe, uniwersalne obecne, NAV w EUR, kantor z PLN), start z PL bez zmian (GIG ±1 pp względem 0.16.9), migracja zapisu, niezmienniki.
- Przebiegi ×200 dla PL i DE (≥ 12 gier na kraj); raport `kontrola_0.16.11.md` z sekcją „Pominięte i problemy”.

## Ryzyka i otwarte pytania

1. K2 (uogólnienie waluty) to największe ryzyko regresji rdzenia: osobne commity i testy niezmienników NAV/gotówki, równolegle do W1 z 0.16.9 (gotówka w wielu walutach) — wspólne salda walutowe i waluta bazowa muszą być jednym modelem; **K2 robić po W1**.
2. Kalibracja GIG dla kraju innego niż PL (stopy, inflacja, premia ryzyka) — osobny pomiar; dla DE można początkowo użyć parametrów makro z danych kraju (0.16.2).
3. Czy firmy uniwersalne mają lokalne warianty nazw, czy zostają takie same? Domyślnie: te same nazwy, lokalna waluta.
4. Czy polskie spółki przy starcie z Niemiec są dostępne od początku (z biletem)? Domyślnie: dostępne jako kraj zagraniczny z biletem.
