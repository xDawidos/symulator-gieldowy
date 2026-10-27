# Plan 0.16.5 „Internet” (szkic zakresu; po 0.16.4, przed porządkami plików)

Źródło: zgłoszenie użytkownika z 2026-10-27. Reorganizacja okien rynku i nowa zakładka **Internet** w miejsce zakładki Kantor. Szkic: przed startem przeczytać kod 0.16.1–0.16.4 (kantor, bilety, rynki zagraniczne) i okna rynków w `ui.js`.

## Cel

Gra ma jedno „okno do świata”: przeglądarkę w grze. Strony otwierają się tylko z **ulubionych**, każda ma własny cel mechaniczny. Dzięki temu zakładki panelu przestają się mnożyć, a zagranica, kontakty i praca zespołu są w jednym, czytelnym miejscu.

## Zakres

### I0. Reorganizacja okien rynku
- **Okno ETF-ów:** zmiana układu (do ustalenia z użytkownikiem przed startem: dziś ETF-y są w oknie rynku akcji; docelowo osobna zakładka lub podział na ETF-y i fundusze).
- **Podział NewConnect i startupów:** dziś panel startupów w `index.html` nazywa się „Giełda NewHorizons” (rynek NH z 0.15.6 powstał osobno). Rozdzielić: **NewHorizons** (giełda wejścia dla małych spółek, z `listings.js`) i **Startupy** (inkubator, rundy finansowania); startupy przenieść do zakładki Internet (I2).

### I1. Zakładka Internet (zamiast Kantor)
- Przeglądarka w stylu Brave: pasek adresu tylko do odczytu, **dostęp do stron wyłącznie przez „ulubione”** (kafelki). Brak reklam i szumu.
- Nowe strony odblokowują się mechaniką gry (np. Ferie i wakacje po 0.16.2, Tied po relacjach), nie zakupem.
- Komponent: jedna ramka okna i zestaw stron-kart (każda strona to osobna funkcja `renderPage*`), wygląd z komponentów 0.14.5, ikony SVG, tylko ciemny motyw.

### I2. Strony w ulubionych
1. **Kantory24** — obecne okno kantora z 0.16.1 (waluty, `toPln`, GDR) przeniesione bez zmiany mechaniki.
2. **Tied** — portal typu LinkedIn do rozmów z botami i prezesami (CEO). CEO publikują posty: chwalą się wynikami, współpracami, przemyśleniami. Posty generowane z faktycznych zdarzeń spółki (raport, kooperacja, zmiana strategii). Rozmowy z 0.17.3 (minigra wyboru) startują stąd; część funkcji poczty (wiadomości od botów i prezesów) przenosi się tu.
3. **Giełdy startupów** — przeniesione startupy (I0).
4. **Ferie i wakacje** — imitacja strony linii lotniczej (bez reklam): zakup biletu = dostęp do rynku zagranicznego z 0.16.2. Szczegóły niżej.
5. **Lombard** — przeniesiony z obecnego miejsca (dostęp także przez TeamedUP!).

### I3. Ferie i wakacje (bilety do rynków zagranicznych)
- Bilet kupowany z **gotówki funduszu**, koszt **od 1000 zł** (rosnący wg odległości rynku: DE/CZ najtaniej, Azja najdrożej); ważny przez określony czas gry.
- Po zakupie **zmienia się tło/motyw okna** na barwy kraju (np. bordowe dla jednego rynku; kolor nigdy jedynym nośnikiem: nazwa kraju i flaga słowem/SVG) i pokazują się **spółki z tego kraju** (giełda zagraniczna z 0.16.2).
- Do rozważenia dodatkowo: pakiety (kilka krajów taniej), bilet ważny na jeden rynek vs. „wakacje” (tydzień bez decyzji = brak przełączania), losowe utrudnienia (opóźniony lot = brak handlu 1 tydzień), karta lojalnościowa za częste loty (rabat), informacja o strefie czasowej/godzinach sesji.
- Integracja z `G7` z 0.16.2 (lotnisko i bilety): funkcje biletów i dostępu do rynku zostają, **zmienia się tylko warstwa wyświetlania** (okno lotniska → strona w Internecie).

### I4. TeamedUP! (dawna poczta)
- Poczta zmienia nazwę na **TeamedUP!** — aplikacja jak Teams do informacji w firmie: powiadomienia o nowych wymaganiach, celach i prośbach od szefostwa (zarząd/rada funduszu), zatrudnianie pracowników.
- Zadania i cele od szefostwa (z 0.14/0.15) jako zadania z terminem; zatrudnianie (analityk, IR, itp.) z poziomu aplikacji.
- Przeniesienie części funkcji poczty do Tied (kontakty z botami i prezesami) — rozdzielić wg typu wiadomości (systemowe → TeamedUP!, towarzyskie/biznesowe → Tied).
- Dostęp do **lombardu** z TeamedUP!.

### I5. Testy i kontrola
- Testy: tylko ulubione otwierają strony, zakup biletu (gotówka funduszu, odmowa przy braku), zmiana motywu na kraj i powrót, migracja zapisu (poczta → TeamedUP!/Tied bez utraty wiadomości), NewHorizons bez startupów.
- Zapis: numer wersji wg stanu w czasie wdrożenia (po v16 z 0.16.1; migracja skrzynki).
- Projekt wyglądu: czat designu (przeglądarka, ulubione, strony Tied, Ferie i wakacje, TeamedUP!).

## Ryzyka i otwarte pytania

1. Duży ruch w interfejsie: wdrożyć etapami (I0 → I1 → I2 → I3 → I4), commit po każdym; dostępność (nawigacja klawiaturą po ulubionych, ARIA).
2. Czy gracz bez Tied (niski poziom) widzi zablokowane kafelki z opisem, czy w ogóle ich nie widzi?
3. Czy lombard zostaje także w obecnym miejscu (jedno źródło prawdy: tak, tylko wejście zmieniamy)?
4. Zależność od 0.17.3: rozmowy (R0–R3) mogą zacząć się w Tied, ale działają i bez niej.
