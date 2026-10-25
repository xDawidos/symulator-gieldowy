# Kontrola 0.15.4 „Poprawki z gry 3” (2026-10-25)

- **Kod:** gałąź `claude/impl-0154-3ec987` (od `af66955` = 0.15.3), commity P0–P8 (lista na końcu). Nowy moduł `splits.js`; haki w `core.js`, `companies.js`, `finance.js`, `ui.js`, `main.js`, `learning.js`, `index.html`, `style.css`; narzędzia w `tests/przebiegi.html`.
- **Plan:** `plany/plan_0.15.4_poprawki_z_gry_3.md`; diagnoza: `plany/raporty/diagnoza_0.15.4.md`.
- **Testy:** `tests/tests.html` — nowa grupa „0.15.4” (28 testów); razem **624/624** (596 dotychczasowych bez zmian).
- **Zapis gry:** nadal v15; nowe pola opcjonalne: `splitHistory`, `lastSplitQuarter`, `dividendTooSmall` (spółki), `retailLoans`, `retailStats` (Lombardex, Wrona), `society.educationBonus`, `society.budget.programSpending` i `programs`, `municipalCompanies[].willList`. `gameChartClock` nie jest zapisywany (po wczytaniu wyznaczany z najnowszego punktu wykresu).
- **Przebiegi** (`tests/przebiegi.html`, ×200, serwer z `Cache-Control: no-store`, wirtualny zegar): **baza** = kod 0.15.3 z samymi sondami P0 — 16 gier × 6,5 roku bez presetu, 8 × 6,5 roku `fundusz-gig`, 11 × 20 lat; **po zmianach** (kod końcowy) — 8 × 6,5 roku, 8 × 6,5 roku `fundusz-gig`, 10 × 20 lat. Liczby to mediany, o ile nie napisano inaczej. Wszystkie serie na jednej maszynie, 3–5 przebiegów równolegle w kartach przeglądarki (czasy ścienne **nie są porównywalne** między seriami).
- **Rozrzut:** GIG ma duży rozrzut między grami (6,5 roku: 0,5–26% rocznie, odchylenie ≈ 4–6 pp; 20 lat: odchylenie 1,2 pp w bazie, 2 pp po zmianach), więc różnice poniżej ≈ 2 pp przy 8–16 grach są w szumie.

## Co zrobiono

| Część | Zakres |
|---|---|
| P0 | `tests/przebiegi.html`: wykres liczby spółek w czasie (krajowe, zależne, miejskie, startupy, wydzielone, wszystkie; powstałe i znikłe wg źródła), średni kurs wg branży (sortowanie po nagłówku), sondy: Orzeł Telekom, segmenty w niepowiązanych klastrach, lombard i Wrona, skarb, rozkład kursów, dywidendy poniżej progu, splity i wycofania. Raport `diagnoza_0.15.4.md` (przyczyna, plik, krok naprawy dla błędów 1–16) |
| P1 | **Błąd 1:** chipy sektorów, podnagłówki i „N spółek” liczą z `getListBaseStocks()` (rynek, zakładka poziomu, „Posiadane”, córki pod matką); dawniej chipy liczyły wszystkie rynki i poziomy. **Błąd 2:** okno „Dywidendowe” leżało pod zasłoną (`z-index: 1009` ze starej reguły ID wygrywał z `.modal`); test pilnuje wszystkich okien `#…-modal`. **Błąd 5:** menu grup kategorii przycinał `overflow-x` rzędu chipów — teraz `position: fixed`. **Błąd 6:** lewy margines wykresu z najdłuższej etykiety. **Błąd 7a:** kolumna kursu 148 px (było 108) |
| P2 | Oś czasu wykresów (linia, świece, zdarzenia, transakcje) = zegar gry `gameChartClock`, niezależny od prędkości; okresy w tikach i tygodniach gry; zegar nie cofa się po wczytaniu. Przy ×100: okres 5 tików = 181 punktów, tydzień gry = 16 (dawniej 3 i 2) |
| P3 | Minimalna dywidenda = większa z 0,01 zł i 0,1% kursu (ogłoszenie, wypłata, dywidenda specjalna); przycisk „Wymuś dywidendę” nieaktywny z podpisem „Dywidenda zbyt mała…”. „Warunki rynkowe”: mechanika sprawdzona (tylko gracz może ustawić warunki korzystne dla jednej strony, zarządy zawsze „rynkowe”), dopisek „Co to znaczy”, podpowiedzi, hasło Akademii „Warunki rynkowe w kooperacji” |
| P4 | Split (od 1000 zł, 2:1 … 1000:1, kurs po ≤ 700 zł) i konsolidacja (poniżej 1 zł, 1:2 … 1:100, kurs po ≥ 3 zł); 20% szans na kwartał, 50% od 3000 zł lub poniżej 0,50 zł; przerwa 8 kw. Przeliczane: akcje wszystkich posiadaczy (fundusz, konto prywatne, boty, fundusze kolegów, banki, holdingi, pakiety spółek, ETF-y, miasto, insiderzy, akcje własne), zastawy, zabezpieczenia kredytów, oferty banków, alerty, transakcje gracza, historia linii i świec, zamknięcia tygodniowe, EPS, wartość godziwa i księgowa, dywidendy na akcję. Ułamki przy konsolidacji: gotówka z kasy spółki. GIG/TIG5/SIG20 łańcuchowe (split bez skoku indeksu). Komunikaty: dziennik, pasek newsów, poczta i dymek dla posiadacza, ikona z opisem w tabeli i na wykresie, wiersz w karcie spółki, hasło Akademii „Split i reverse split” |
| P5 | Powyżej 115 spółek krajowych państwo wycofuje najsłabsze (≤ 2 na kwartał) z wykupem po kursie +10% (płaci spółka, resztę skarb); pełne wydzielenia tylko poniżej 110 spółek (powyżej — carve-out); córki wchłaniane do 3× chętniej przy zatłoczeniu; diagnoza „180”: nagłówek liczył wszystkie instrumenty (109 krajowych + 27 rynków internetowych + 15 zależnych + 19 stałych + banki i inni) |
| P6 | Limit różnorodności: segmenty w najwyżej 2 niepowiązanych klastrach sektorów (ekspansja, pivot, wchłonięcie córki). Orzeł Telekom: losowa wielkość startowa gigantów (≥ 1 mld zł), kara wyceny od 10% kapitalizacji (−1,5% za pp, max −35%), hamulec wzrostu (−0,15 pp na kwartał za pp udziału > 10%), brak Jednorożca dla spółki z udziałem > 12% |
| P7 | Klienci indywidualni lombardu i pożyczki konsumenckie Wrony (popyt z klasy biednej i recesji; portfel w panelach Lombard i Windykator); „Miasto” zamiast „Miasto Gdańsk”, na giełdę wchodzi 3–5 z 8 spółek miejskich; programy socjalne ze skarbu (rodziny, oświata, zdrowie): 10% nadwyżki ponad 50 mln zł na kwartał, ≤ kwartalna baza podatkowa, poza saldem budżetu |

## Wyniki (tabela „Jak sprawdzimy”)

| Miara | Cel | Baza 0.15.3 | Po zmianach | Stan |
|---|---|---|---|---|
| Spółki krajowe | ≤ 115 na koniec; > 125 ≤ 4 kw. | maks. 112; 0 kw. > 115 | maks. 110 (20 lat), 94 (6,5 roku); 0 kw. > 115 (wycofania 0 — limit nie został osiągnięty) | ✅ |
| Licznik w nagłówku | = lista | 142–181 (wszystkie instrumenty) | = wiersze tabeli (test) | ✅ |
| Kurs w 1–3000 zł | 99% | 89% (6,5 r.), 86% (20 l.); kurs maks. 12,9 tys. / 297 tys. zł | 98–99% na końcu i średnio w czasie; kurs maks. 5,6 tys. / 9,8 tys. zł | ✅ (granica 99%: 98% w części serii) |
| Wartość pozycji po splicie | bez zmian | — | testy jednostkowe (NAV, pakiety, ETF, zastaw, zapis) | ✅ |
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 | 0 / 0 / 0 | 0 / 0 / 0 (26 gier serii końcowych); wczesna wersja splitu przerywała pętlę kwartalną wyjątkiem — wyłapał to pierwszy przebieg, naprawione i objęte testem | ✅ |
| Dywidenda poniżej progu | 0 wypłat | — | 0 z ≈ 8 tys. (6,5 r.) i ≈ 50 tys. (20 l.) wypłat | ✅ |
| Orzeł Telekom w górnej 3 na końcu | ≤ 30% gier 20-letnich; żadna spółka > 30% | ORT 8/11 (73%), BOR 7/11, BEW 6/11; udział ORT na końcu 19% | **ORT 6/10 (60%), BOR 4/10, BEW 4/10**; udział ORT na końcu 14%; 6,5 roku: ORT 6/8 (baza 13/16) | ❌ nie osiągnięto (poprawa umiarkowana) |
| Spółki z segmentami w ≥ 3 niepowiązanych klastrach | 0 | 7/11 gier (1–4 spółki) | 0/10 gier | ✅ |
| Lombard | średnio ≥ 5 aktywnych pozycji | ≈ 0,02 | ≈ 12,5 | ✅ |
| Wrona | portfel > 0 w ≥ 80% gier | 9/11 (tylko przejęte akcje) | 10/10 (portfel pożyczek konsumenckich) | ✅ |
| Skarb państwa (P7) | brak celu liczbowego | 2,5 mld zł po 6,5 r.; 13,3 mld zł po 20 l. (rośnie bez końca) | 1,1 mld zł po 6,5 r.; 2,0 mld zł po 20 l. | ✅ (opis) |
| GIG (CAGR) | ± 1 pp | 6,5 r.: 11,6%; 20 l.: 11,45% | 6,5 r.: 11,0% (−0,6 pp); `fundusz-gig`: 12,8% (baza 7,6%, szum); **20 l.: 13,8% (+2,4 pp)** | ❌ 6,5 r. w normie, 20 lat poza (patrz uwaga 2) |
| Marża ważona na końcu | ± 0,5 pp | 6,5 r.: 21,35%; 20 l.: 18,8% (rozrzut 10,7–23,1%) | 6,5 r.: 21,7%; 20 l.: 17,7% | ✅ w szumie (rozrzut ≫ tolerancja) |
| Czas kroku | + ≤ 2% | 2,4 s/kw. (6,5 r.), 3,3 s/kw. (20 l.) | 1,6–2,3 s/kw., 2,9 s/kw. | ⚠️ nieporównywalne (inne obciążenie maszyny); koszt dodany: jedna aktualizacja zegara wykresów i obliczenie udziałów raz na kwartał |
| Rozmiar zapisu | + ≤ 0,05% | 430 tys. B (6,5 r.), 679 tys. B (20 l.) skompresowane | 482 tys. B (+12%), 722 tys. B (+6%) | ⚠️ patrz niżej: artefakt przebiegów, nie gry ×1 |

### Uwagi do wyników

1. **Rozmiar zapisu:** po P2 świece naprawdę powstają przy ×200 (dawniej „15 sekund” rzeczywistych = kilka kwartałów gry, więc `candlestickHistory` było prawie puste: 16 KB w całym zapisie, teraz 257 KB surowego JSON). W normalnej grze ×1 świece były zawsze zapisywane (24 na spółkę), więc zapis gracza nie rośnie. Bez świec zapis przebiegu ≈ baza (483 − 48 ≈ 435 tys. B). Pozostałe nowe pola to kilkadziesiąt bajtów na spółkę.
2. **GIG po 20 latach (+2,4 pp: 13,8% wobec 11,45%)** — przyczyny nie rozstrzygnięto, ale zawężono. Po 6,5 roku różnicy nie ma (11,0% wobec 11,6% z 16 gier), rozjazd narasta w latach 7–20. Wyłączanie po jednej zmianie (2–4 gry 20-letnie na wariant, patche w przebiegach; średnie GIG): **bez splitów 12,8%, bez wzmocnionego wchłaniania córek (P5) 12,8%**, bez programów socjalnych 15,5%, bez dominacji i różnorodności (P6) 13,9%, bez progu dywidendy 14,1%, bez klientów lombardu 15,4% (kod końcowy: 14,0%; baza 11,4% ± 1,2). Dwa z nich (splity, wchłanianie córek po premii) obniżają wynik o ok. 1,2 pp każdy; reszta nie wpływa. Hipotezy: (a) w bazie drogie akcje (kursy do 300 tys. zł) nie miały popytu botów, a po splitach mają; (b) wykup córek po premii wpuszcza gotówkę do akcjonariuszy, którzy ją reinwestują. Niczego nie stroiłem „na ślepo” — do ustalenia w 0.16.1 G0 większą próbą (≥ 30 gier na wariant) i ewentualna korekta trendu (np. łagodniejszy mnożnik wchłaniania: `1 + 0,5 × presja` zamiast `1 + 2 × presja`).
3. **Marża ważona** zmienia się w obie strony o kilka pp między grami (10,7–23,1% w bazie) — wynik jest w szumie, nie wskazuje wpływu zmian.
4. **Orzeł Telekom:** przyczyny (stała kolejność wielkości ośmiu gigantów na starcie i brak hamulca dla największej spółki: Jednorożec dawał +5,5…7% przychodów na kwartał) naprawione, ale cel „górne 3 w ≤ 30% gier” jest nieosiągalny przy ośmiu gigantach walczących o trzy miejsca (losowo ≈ 37% każdy) — **do decyzji użytkownika:** zmniejszyć przewagę gigantów na starcie (lista: ORT 3,6 mld, BOR 3,0, KUP 2,3, NRB 2,0, BEW 1,9, CTX 1,85, UNP 1,5, HOR 1,1 mld zł wobec ≤ 100 mln zł reszty rynku) albo przyjąć cel „żaden gigant > 60% gier”.
5. **Sufit łączny 150** jest osiągany (do 146 zwykłych spółek w 20 latach) — skutek dużej liczby członków rynków internetowych (do 29) i córek; limit krajowy 110 działa, wycofań z P5 nie było potrzeba (0).

## Odstępstwa od planu i otwarte sprawy

1. **P5 „rosną wymagania debiutu”:** nie dodano osobnych wymagań (kapitalizacja, zysk); dotychczasowe hamulce (−70% szans debiutu, twardy sufit 110, kolejka startupów, droższe finansowanie) zostają, a nowe są: wycofanie najsłabszych, blokada pełnych wydzieleń, szybsze wchłanianie córek. Przy limicie 110 w przebiegach wycofania nie wystąpiły.
2. **P6 limit różnorodności:** zaimplementowano wersję z tabeli „Jak sprawdzimy” (niepowiązane **klastry** sektorów, najwyżej 2; Technologia i Gaming to jeden klaster), a nie „3 segmenty w niepowiązanych sektorach” z opisu części — tamto dopuszczałoby spółkę Technologia + Nieruchomości + Gaming. Konfiturex Tech (Technologia + Gaming + Nieruchomości) pozostaje możliwy (2 klastry), ale tworzą go już tylko powiązane sektory; etykieta sektora głównego jest liczona z największego segmentu (to nie był błąd licznika).
3. **P7 programy socjalne** wpływają na klasy (rodziny: do −0,05 pp biednych na kwartał), edukację (oświata: do +8 pkt celu) i populację (zdrowie: +0,02% na kwartał); nie mają osobnych „urzędów” (0.19.1). Zadowolenie klas z 0.13 nie ma osobnej miary w kodzie — użyto struktury klas.
4. **Lombard i Wrona** dostały popyt z populacji; wcześniejsze wywołania (boty w tarapatach, fundusze) bez zmian.
5. **Wygląd:** nowe elementy (komunikat „Dywidenda zbyt mała”, znacznik splitu, panele klientów lombardu) użyły istniejących komponentów 0.14.5, bez nowych okien modalnych i bez koloru jako jedynego nośnika; zlecenie dla czatu designu (okno historii notowań, okno ogłoszenia splitu, mapa spółek jako drzewo genealogiczne) pozostaje.
6. **Niezmierzone:** czas kroku (nieporównywalne obciążenie); rozmiar zapisu gracza przy ×1 (mierzono tylko przebiegi ×200); wpływ splitu na zachowanie botów (popyt na wcześniej drogie akcje); zakres klas „zadowolenie”.
7. **Do ustalenia:** szum GIG/marży — kolejne kontrole (0.16.1 G0) powinny używać ≥ 30 gier na wariant.

## Lista commitów (od `af66955`)

Patrz `git log af66955..HEAD` (P0: narzędzia, sonda skarbu, raport; P1: błędy 1, 2, 5, 6, 7a — po jednym commicie; P2; P3; P4a, P4b, P4c oraz poprawki: pętla kwartalna, indeksy łańcuchowe, strojenie 50%; P5; P6 i poprawki: dominacja ORT, losowe giganty; P7a–d; P8).
