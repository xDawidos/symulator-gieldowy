# Plan aktualizacji 0.10.2 „makro”

Etykieta wersji w grze: **„wersja 0.10.2 makro”** (zamiast „0.9 development BETA”). Zapis gry: **v10**.
Kolejność: M0 → M1 → … → M6, commit po każdej części, potem audyt A1–A4.

Legenda: **[P]** Twoja propozycja · **[+]** moje ulepszenie lub dodatek.

---

## M0. Poprawki po etapie G (szybkie)

- **Walne zgromadzenia tylko dla większościowca (> 50%).** Mail, głosowanie, wnioski i kampanie są dostępne tylko wtedy.
  - Poniżej 50% walne odbywa się w tle, a fundusz głosuje „za”.
  - Rada nadzorcza (20/35%) zostaje jako wgląd.
  - Pierwsze walne nigdy nie wypada w 1. kwartale gry.
- **Oferta emisji ratunkowej trafia do zapisu.**
- **Etykieta wersji 0.10.2 makro.**
- Zdublowaną, ukrytą sekcję „Fuzje i Przejęcia” w index.html usuwamy przy okazji M5.

## M1. Makroekonomia 📉📈

- **[P] Globalne wskaźniki:**
  - inflacja (CPI);
  - bezrobocie;
  - PKB;
  - stopa referencyjna Banku Centralnego.

  Liczone co kwartał z cyklu koniunktury, z bezwładnością (bez skoków).
- **[P] Posiedzenia Banku Centralnego:**
  - **Decyzja.** Co kwartał BC podnosi stopy, obniża je albo zostawia. Decyzja zależy od inflacji vs cel 2,5%, bezrobocia i charakteru prezesa (jastrząb, gołąb, stabilizator).
  - **Ogłoszenie w gazecie.** Decyzja trafia jako wydanie „Gazety Ekonomicznej” do poczty i do dziennika zdarzeń.
  - **Długofalowy wpływ:**
    - `LOAN_INTEREST_RATE` i kredyty spółek;
    - lokaty funduszu i depozyty;
    - kupony nowych obligacji;
    - wyceny (wyższe stopy obniżają mnożniki wycen, zwłaszcza spółek wzrostowych).
- **[+] Zaskoczenie rynku.** Przed posiedzeniem gazeta podaje oczekiwania analityków. Rynek reaguje mocniej na niespodziankę niż na decyzję zgodną z oczekiwaniami.
- **[P] Cykle sektorów.** Każdy sektor ma własną fazę: wzrost, szczyt, spadek, dołek. Faza jest przesunięta względem rynku i ma własną długość. Wrażliwość na stopy:
  - banki zyskują na wyższych stopach;
  - nieruchomości i budownictwo tracą;
  - energia i medycyna są defensywne.
- **[P] Wydarzenia spółek państwowych:**
  - działający cykl pozytywnych i negatywnych zdarzeń: dotacje, kontrakty rządowe, audyty NIK, podatek specjalny, zmiany zarządów;
  - realne skutki: kurs, gotówka, kondycja;
  - dziś `triggerStateCompanyEventCycle` to pusty stub.
- **[+] Wybory co 4 lata gry.** Wygrana partii zmienia politykę wobec spółek państwowych: prywatyzacja kontra nacjonalizacja i dotacje. Kampania wyborcza to okres podwyższonej zmienności.
- **[P] Przegląd i balans wydarzeń:**
  - wagi zależne od fazy cyklu;
  - przerwy między powtórzeniami (to samo zdarzenie nie wraca od razu);
  - kilka nowych zdarzeń makro: szok naftowy, kryzys walutowy, boom technologiczny, susza, pandemia (łagodnie).
  - Pozostałe stuby w events.js (szósty zmysł, dywidendy) zostaną uzupełnione albo usunięte.
- **[+] Klienci porównują wynik funduszu z inflacją i oprocentowaniem lokat.** Fundusz przegrywający z lokatą traci zaufanie klientów.
- **[+] Panel „Makro”** w oknie Państwa: wskaźniki z wykresami ostatnich kwartałów, kalendarz posiedzeń BC i fazy sektorów.

## M2. Dywidendy 💰

- **[P] Dywidendowy arystokrata.** Status dostaje spółka, która wypłaca dywidendę nieprzerwanie przez ≥ 8 kwartałów i jej nie obniżyła. Nie dotyczy REIT-ów.
  - Etykieta pod nazwą spółki.
  - Bonusy: +0,2 do stabilności (mniejsza zmienność), +0,05 do przyrostu (wzrostu fundamentów), +0,07 do zainteresowania (popytu).
  - Obcięcie dywidendy zabiera status i powoduje spadek kursu.
- **[+] Kalendarz dywidend:**
  - dzień ustalenia prawa (kto ma akcje w tym dniu, dostaje dywidendę), potem wypłata;
  - kurs spada w dniu odcięcia;
  - widok w obecnym oknie trackera dywidend.
- **[+] Stopa dywidendy i historia wypłat w karcie spółki.** Polityka zarządu reaguje na stopy procentowe (przy wysokich stopach presja na wyższe wypłaty).
- **[+] Wymuszanie dywidend** spójne z relacjami botów (M4).

## M3. ETF-y z prawdziwym portfelem 📊

- **[P] ETF-y sobie zarządzają.** Każdy ETF ma portfel prawdziwych akcji kupionych na rynku i jest widoczny w akcjonariacie spółek. Losowe zasady:
  - maksymalny udział jednej spółki (np. 10–25%);
  - tylko płacący dywidendę;
  - tylko giełda złota i wyżej;
  - sektor;
  - minimalna kapitalizacja;
  - tylko spółki państwowe;
  - tylko arystokraci.

  ETF przegląda skład co kwartał (rebalancing).
- **[P] Roczny cel wzrostu** (np. 5–12%). Gdy ETF nie dowozi celu, zmienia wagi i zaostrza lub luzuje zasady.
- **[P] Wystawcy ETF-ów:**
  - banki inwestycyjne i internetowe tworzą własne ETF-y, np. „Alior Dywidendowy ETF”;
  - nowe nazewnictwo: emitent + strategia;
  - ETF z małymi aktywami może zostać zamknięty.
- **[P] Nowe rodzaje:** ETF REIT, ETF holdingów, ETF państwowy, ETF arystokratów.
- **[+] Wycena z wartości aktywów netto (NAV).** Cena ETF-u to wartość jego portfela na jednostkę, a nie średnia cen. Wpłaty i umorzenia inwestorów powodują, że ETF dokupuje albo sprzedaje akcje.

## M4. Zakładka „Firma” i relacje z botami 🤝

- **[P] Zakładka Firma:**
  - hierarchia korporacji (stanowiska);
  - szef (członek zarządu): czy lubi gracza;
  - targety okresu;
  - relacje z innymi uczestnikami firmy.
- **[P] Relacje z każdym botem** (inwestorzy i menedżerowie firmy) w skali −100…100:
  - wymuszenie dywidendy w spółce, gdzie bot ma > 1% akcji: −0,25 pkt za każdy procent jego akcji;
  - działanie na szkodę spółki, w której bot jest większościowcem: −10 za każdy czyn;
  - współpraca, przekazanie pieniędzy albo działanie na rzecz takiej spółki poprawia relacje.
- **[P] Bot wrogi (relacja < −40):**
  - próbuje przejąć spółki, w których gracz jest większościowcem;
  - wzmacnia pozycję w spółkach, gdzie gracz ma udziały;
  - wysyła maile, w których wyśmiewa decyzje gracza, umniejsza je albo je kwestionuje.
- **[P] Bot przyjazny (relacja > 40):**
  - nie przeszkadza;
  - czasem daje dobrą radę (prawdziwą wskazówkę o spółce);
  - wysyła pozytywne maile.
- **[+] Mechaniki relacji:**
  - relacje powoli wracają do zera;
  - przyjazny bot może zaproponować wspólny zakup pakietu albo sprzedać pakiet z rabatem;
  - wrogi bot może rozsiewać plotki przez „gazetę anty-gracz”.

## M5. Spółki rynkowe i maklerzy 🏛️

- **[P] GPW** to główny operator. Wszystkie obecne spółki są jej członkami.
- **[P] XTD i PLU5** pojawiają się jako startupy:
  - bardzo drogie;
  - rozwijają się powoli;
  - mogą nagle zyskać sponsora i wejść na giełdę.
- **[P] Wejście nowego operatora** dodaje 5–10 nowych spółek z istniejących sektorów. Spółki mają etykietę „członek rynku XTD”.
- **[P] Euronext** jest widoczny jako nieaktywny operator („wkrótce”).
- **[P] Zamknięcie operatora** usuwa jego spółki z widoku gracza. Pozycje funduszu są rozliczane po ostatniej cenie, żeby fundusz nie stracił pieniędzy bez śladu.
- **[P] Przychody operatorów:**
  - inwestują w spółki, które mają w portfelu;
  - pobierają niewielką marżę (prowizję) od transakcji na swoim rynku.
- **[P] Umowy na wyłączność** ze spółkami przenoszą je na rynek danego operatora.
- **[+] Prowizje różnią się między operatorami.** Gracz płaci prowizję operatora przy handlu spółkami z jego rynku, więc wybór rynku ma znaczenie.
- Przy okazji usuwamy zdublowaną sekcję „Fuzje i Przejęcia” w index.html.

## M6. Konsorcja i projekty specjalne 🏗️

- **[P] Zakładka „Projekty specjalne”** w oknie Miasta. 11 megaprojektów, każdy do zrealizowania tylko raz:
  1. stadion narodowy;
  2. port lotniczy;
  3. elektrownia jądrowa;
  4. metro;
  5. port morski;
  6. centrum badawcze;
  7. most nad rzeką;
  8. szpital kliniczny;
  9. kampus technologiczny;
  10. centrum wystawiennicze;
  11. farma wiatrowa offshore.
- **[P] Konsorcjum:**
  - maksymalnie 5 spółek plus wykonawca budowlany;
  - każda spółka finansuje swoją część kosztu;
  - małe, stałe bonusy dla uczestników, proporcjonalnie do wkładu;
  - po przejęciu uczestnika jego bonus przechodzi na spółkę przejmującą.
- **[P] Projekty czasowe:**
  - do zrealizowania tylko w terminie;
  - tańsze, z mniejszymi bonusami;
  - bonus działa najwyżej 5 lat gry.
- **[+] Spółka funduszu w konsorcjum.** Spółka, w której fundusz jest większościowcem, może dołączyć do konsorcjum z decyzji gracza.
- **[+] Etapy projektów.** Megaprojekty używają etapów z G4 (projekt → budowa → weryfikacja).
- **[+] Lista projektów pokazuje:** zrealizowane (kto i jaki bonus), w realizacji (postęp, uczestnicy) i dostępne.

---

## Zapis i testy

- **Zapis v10:** wskaźniki makro, fazy sektorów, statusy arystokratów, portfele i zasady ETF-ów, relacje z botami, operatorzy rynków, konsorcja i projekty. Migracja z v9.
- **Testy dla każdej części:**
  - decyzja BC zmienia oprocentowanie kredytów i lokat;
  - status arystokraty: nadanie, bonusy, utrata;
  - ETF kupuje akcje, przestrzega zasad i jest widoczny w akcjonariacie;
  - relacje: kary i nagrody wg reguł;
  - wejście operatora dodaje 5–10 spółek, a jego zamknięcie usuwa je z widoku;
  - konsorcjum: bonus dla uczestników i przejście bonusu przy przejęciu;
  - niezmienniki świata.
- **Weryfikacja:** szybki przebieg ×50 po każdej części.

## Audyt (po M6), w częściach

- **A1. Przepływy pieniędzy i bilanse.** Brak „pieniędzy z powietrza”, NaN i ujemnych sald; spójność `sharesHeld` i akcjonariatu.
- **A2. Martwy kod i stuby.** Duplikaty funkcji i id w HTML, nieużywane funkcje, stare komentarze „bez zmian”.
- **A3. Interfejs.** Spójność okien z systemem wyglądu, style ustawiane w JS, czytelność na wąskim ekranie, motyw ciemny.
- **A4. Balans.** Długa sesja ×50: tempo przejęć, zwroty inwestycji, częstotliwość zdarzeń, siła stóp procentowych.
- Raport z audytu trafi do `plany/audyt_0.10.2.md`, a poprawki w osobnych commitach.
