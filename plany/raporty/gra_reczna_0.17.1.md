# Gra ręczna 0.17.1

Godzina gry na ×1 (skrócona przyspieszeniem tam, gdzie scenariusz czeka na zdarzenie). Karta obserwacji: krok, czego oczekiwałem, co się stało, zrzut, ocena (błąd / dziwne / dobre). Zrzuty w `zrzuty_0.17.1/`.

| # | Scenariusz |
|---|---|
| 1 | Start nowej gry → pierwszy kantor i spekulacja walutami |
| 2 | Gigant wkracza na scenę (GDR) → zakup kwitów |
| 3 | Lotnisko, bilet na rynek DE, zakup spółki zagranicznej |
| 4 | Kryzys bankowy z zarażaniem kraju obcego |
| 5 | Kontrakt towarowy z dźwignią i margin call |
| 6 | Połączenie giełd (wariant B) |
| 7 | Zapis i wczytanie w trakcie linii kryzysu |
| 8 | Rozmowa z prezesem i prośba do inwestora o zakup udziałów |
| 9 | Własna spółka energetyczna: blok, zlecenie geologa, ESG |
| 10 | Internet: pauza przy otwarciu, lombard i windykacja |

## Karta obserwacji

Gra w przeglądarce (podgląd `gra-kod`, 1280×800), nowa gra od scenki startowej. Część zdarzeń wywołałem funkcjami gry, żeby nie czekać godzinami (gigant, kryzys, połączenie giełd); ingerencje testowe są zaznaczone. Panel aplikacji był widoczny, zrzuty w `zrzuty_0.17.1/`.

| # | Krok | Oczekiwanie | Wynik | Zrzut | Ocena |
|---|---|---|---|---|---|
| 0 | Nowa gra z menu | potwierdzenie, globus, dane, SMS, umowa, rozmowa z szefem | wszystko przechodzi; globus pokazuje nazwę tylko przy wybranym kraju; „Pomiń pisanie” pojawia się, gdy szef pisze | 00, 01 | dobre |
| 0a | Scenka startowa | czas stoi | w trakcie scenki lecą powiadomienia o badaniach spółek i inwestycjach banków | – | dziwne |
| 1 | Internet → Kantory24, kupno i sprzedaż EUR | wymiana ze spreadem | 2000 PLN → 460,51 EUR (spread 20 PLN); po 3 kw. sprzedaż za 1859 PLN | 02, 02b | dobre |
| 2 | Gigant (wywołany) → kwity | okno, przejście do kantoru, zakup | okno giganta zatrzymuje grę, „Otwórz Kantory24” prowadzi na zakładkę kwitów, zakup 10 HSR.GDR za 733 PLN | 03, 04 | dobre |
| 2a | Tekst okna giganta | aktualna ścieżka | „Kupisz je w oknie Kantor → Obce”, a okna Kantor już nie ma (jest Internet → Kantory24 → Obce) | 03 | dziwne |
| 3 | Lotnisko, bilet DE, spółka niemiecka | bilet i zakup | bez lotniska bilet niedostępny; budowa z przetargu trwała 8 kw.; bilet 2500 PLN; zakup 1 akcji LPD.DE za 786 PLN | 05 | dobre |
| 3a | Rynki zagraniczne | domyślnie kraj z biletem | zakładka otwiera się na Szwajcarii (bez biletu), wszystkie „Kup” wyłączone bez wyjaśnienia | – | dziwne |
| 4 | Kryzys bankowy (wywołany) i zarażenie | etapy, cięcie stóp, spadki za granicą | etapy do odbicia, stopa 1,02%, premie DE/CH/CZ/JP −11…−13% (w kraju −6%) | 06 | dobre, zarażenie silniejsze za granicą niż w kraju (do sprawdzenia) |
| 4a | Okno Państwa w kryzysie | spójne liczby | w pasku „Stopa bazowa BC 1,62%”, na karcie „Stopa referencyjna 1,02%” (stopa w grze 1,02%) | 06 | dziwne, niepotwierdzone (mogła się zmienić między odświeżeniami) |
| 5 | Kontrakt na gaz 1:3 i margin call | zamknięcie przy depozycie < 50% | pozycja 45 000 PLN, depozyt 15 000 PLN; po ręcznym obniżeniu ceny gazu o 40% (ingerencja) zamknięcie z wynikiem −10 277 PLN i mail „Margin call” | 07 | dobre |
| 5a | Tabela towarów | dźwignia zgodna z formularzem | kolumna „Dźwignia 1:10”, a formularz dla gazu daje najwyżej 1:3 | 07 | dziwne |
| 5b | Nagłówek o stopach | kierunek i format | „BC podnosi stopy do 1.02%”: kropka zamiast przecinka; kierunek do sprawdzenia | – | dziwne |
| 6 | Połączenie giełd, wariant B (wywołane) | okno, mail, spadek GPW | okno i mail „Obca giełda przejmuje naszą: USA”, GIG −11% w 2 kw., opłaty ×1.5 | 08 | dobre; „×1.5” z kropką |
| 7 | Zapis i wczytanie w kryzysie | ten sam stan | kryzys, kwartał, gotówka i udziały bez zmian, ale **GIG po wczytaniu 0, a po tiku 611 zamiast 2874** | – | **błąd, naprawiony** |
| 8 | Rozmowa z prezesem, prośba do inwestora | rozmowa i prośba | zakup akcji ALI dodaje prezesa do kontaktów, rozmowa 2 tury; prośba „Udziały w funduszu” przy relacji 25 (ustawionej przez debug): rozmowa neutralna, kara −4, bez oferty | 09 | dobre |
| 8a | Komunikat o rynku wejścia | nazwa rynku | „Twoje stanowisko nie daje dostępu do rynku PRV” – kod zamiast nazwy | – | dziwne |
| 9 | Spółka energetyczna: blok, działka, ESG | sekcja Energia działa | kontrola nad ESA wymuszona w teście (ingerencja); działka, ESG (UEiE poziom 3 przez debug) i blok gazowy ruszają | 10 | dobre |
| 9a | Teksty sekcji Energia | czytelne liczby | „Elektrownie Elektrownia SA”, „170 tona” (cena węgla), blok 18 MW pokazany jako „+0,0 GW” | 10 | dziwne |
| 10 | Internet: pauza, lombard, windykacja | czas stoi, strony działają | otwarcie zatrzymuje czas, przejścia nie ruszają pauzy, zamknięcie wznawia; Lombardex S.A. i Windykacja się wyświetlają | 11 | dobre |

**Podsumowanie:** 1 błąd blokujący dla oceny funduszu (GIG po wczytaniu) naprawiony od razu (4ea994d, test). Pozostałe uwagi to teksty i spójność widoków, idą do listy T4 (`balans_0.17.1.md`).
