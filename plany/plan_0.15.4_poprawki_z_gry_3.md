# Plan 0.15.4 „Poprawki z gry 3” (po 0.15.3 „Wielkie Kryzysy”, przed 0.15.5 i 0.16.1)

Źródło: zgłoszenia z gry z 2026-10-25 (`pomysly_na_kolejne_wersje.md`, sekcja 9.1). **Przetargi, podwykonawcy i Budimix → 0.15.5**, giełdy wejścia i urząd antymonopolowy → 0.15.6. Plan pisany bez czytania kodu: **każdy błąd najpierw odtwarzamy** (P0), a potem naprawiamy; hipotezy przyczyn są do sprawdzenia.

Cel: gra przestaje mylić licznikami i nie zamraża ekranu, limit spółek jest przestrzegany, kursy nie uciekają do milionów ani groszy, a diagnozy dziwnych zjawisk (Orzeł Telekom, Konfiturex Tech) są znane.

Kolejność: P0 → P1 → … → P8. **Commit po każdej części.** UI z komponentów 0.14.5; projekt wyglądu zlecamy czatowi designu tylko tam, gdzie piszemy. Zapis v15 bez zmiany numeru (pola opcjonalne) — **zmiana numeru wersji zapisu dopiero v16 w 0.16.1**.

---

## Punkt wyjścia

| Zgłoszenie | Hipoteza (do sprawdzenia) |
|---|---|
| 1 licznik 10 vs 7 spółek turystycznych | licznik liczy podsektory, spółki zależne albo spółki bez notowania |
| 2 przycisk dywidendy zamraża ekran w zakładkach „wszystkie”, śmieciowa, brązowa | nakładka modalna otwierana bez zamknięcia (brak błędu w konsoli) |
| 3 dywidenda < 1 gr/akcję | brak progu minimalnej dywidendy (EcoLube 0,0077 zł) |
| 4 wykres liniowy przy > 1 s | próbkowanie historii według czasu rzeczywistego zamiast gry (po 0.14 T0 zegar gry niezależny od prędkości) |
| 5 grupy kategorii blokują zakładki | filtr grup z 0.14 T1c nie przepuszcza kliknięcia w zakładkę (np. Przemysł i surowce) |
| 6 historia notowań przycina liczby | szerokość kolumny, format liczb po polsku (0.14.5 P1) |
| 7 zmiana tygodniowa zasłania kurs; kurs 4 mln zł albo 15 gr | brak splitu i konsolidacji akcji |
| 8 liczba spółek do 180 | spółki zależne, wydzielenia, miejskie, startupy lub emisje omijają limit „luźny ok. 110 (111–115 w porządku)” |
| 10 Orzeł Telekom najmocniejszy w 3 grach | efekt przetargów (0.15.5) albo kooperacji / koncernu |
| 11 Konfiturex Tech: Technologia, Nieruchomości, Gaming, a w grupie Technologia/Półprzewodniki | pivot i rozszerzenia (0.14 T3) bez limitu różnorodności; sektor główny nie aktualizowany |
| 12 lombard pusty, Wrona słabo | brak popytu lub dopływu gotówki |
| 14 „warunki rynkowe” | niejasna mechanika dla gracza |
| 15 „miasto Gdańsk”, wszystkie spółki miejskie na giełdzie | nazwa i reguła debiutu |
| 16 państwo bez wydatków | skarb rośnie; brak urzędów i programów |

## P0. Odtworzenie, sondy i narzędzia deweloperskie

- **Odtworzenie** błędów 1–7 i 14 w przeglądarce, 8 i 10–12 w przebiegach ×200. Wynik: tabela „przyczyna, plik, krok naprawy” w raporcie `raporty/diagnoza_0.15.4.md`.
- **Narzędzia deweloperskie** (`tests/przebiegi.html`, debug): wykres **liczby spółek w czasie** (krajowe, zależne, miejskie, startupy; powstające i znikające), wykres **średniej ceny za spółkę wg branży** (z sortowaniem), licznik spółek wg źródła (debiut, wydzielenie, córka, miejska).
- **Sondy:** udział Orzeł Telekom w przetargach i kapitalizacji; liczba segmentów spółek; popyt w lombardzie i u Wrony.
- **Commit P0** (narzędzia osobno od raportu).

## P1. Interfejs: licznik, dywidenda, grupy, historia, zmiana tygodniowa

- Licznik spółek według tego, co pokazuje lista (błąd 1) — jedno źródło liczby dla filtra i nagłówka.
- Przycisk dywidendy nie zamraża ekranu (błąd 2): test, że okno można zamknąć z każdej zakładki rynku.
- Zakładki działają przy zaznaczonych grupach (błąd 5).
- Okno historii notowań nie przycina liczb (błąd 6).
- Zmiana tygodniowa nie zasłania kursu (błąd 7a).
- **Testy** UI w `tests/tests.html` tam, gdzie się da; reszta kontrola w przeglądarce. **Commit P1** (krok na błąd).

## P2. Wykres liniowy

- Próbkowanie według **czasu gry**, nie sekund rzeczywistych; przy każdej prędkości (×1…×200) wykres pokazuje przebieg ceny z punktami co tydzień gry.
- Test: seria cen z szumem → wykres nie jest prostą linią przy ×50. **Commit P2.**

## P3. Minimalna dywidenda i wyjaśnienie warunków rynkowych

- **Dywidenda minimalna:** poniżej progu (propozycja 0,01 zł na akcję lub 0,1% kursu) spółka nie wypłaca; przycisk nieaktywny z podpisem „dywidenda zbyt mała”.
- **Warunki rynkowe:** sprawdzić, jak liczą się w kodzie i jak spółki z nich korzystają; wynik w raporcie. W UI dopisek słowem „co to znaczy” oraz hasło Akademii. **Commit P3.**

## P4. Podział i skup akcji (split, reverse split)

- **Split** (np. 2:1, 5:1, 10:1) spółka ogłasza, gdy kurs jest bardzo wysoki; **konsolidacja** (reverse split, np. 1:5, 1:10), gdy kurs jest bardzo niski. Progi i szansa do strojenia (propozycja: split od 1000 zł, konsolidacja poniżej 1 zł; szansa 20%/kw. po przekroczeniu progu).
- **Niezmienniki:** liczba akcji u wszystkich posiadaczy (gracz, boty, fundusze, ETF, spółki zależne), zlecenia, kampanie, gwarancje, zastaw, historia cen i świec (korekta wstecz, wykres bez skoku); wartość pozycji bez zmian.
- **Niezmiennik „akcje w obrocie = suma posiadaczy”** sprawdzany po każdym splicie.
- Dla gracza: powiadomienie, wpis w pasku newsów, hasło Akademii („Split i reverse split”).
- **Testy:** split, konsolidacja, ułamki akcji (zaokrąglenie z dopłatą w gotówce), zapis, wartość pozycji. **Commit P4** (P4a split, P4b konsolidacja, P4c UI).

## P5. Limit liczby spółek

- **Diagnoza:** skąd 180 (źródła z P0), wykres w czasie.
- **Polityka zaostrzania:** gdy krajowe > 110 — rosną wymagania debiutu (kapitalizacja, zysk), blokada nowych spin-offów (carve-out zostaje do 115), wymuszone wycofanie najsłabszych (delisting z wykupem), wcześniejsze wchłonięcia córek. Zasady „luźne ok. 110, 111–115 w porządku” zostają; **cel: nigdy > 125 przez dłużej niż 4 kw.** Dalsze zaostrzenie wejść na GPW — 0.15.6.
- **Testy:** kontrola limitu w 20 latach, delisting bez ujemnej gotówki i bez „duchów posiadaczy”. **Commit P5.**

## P6. Orzeł Telekom i Konfiturex Tech

- **Orzeł Telekom:** diagnoza (przetargi, kooperacje, koncern, premia sektora); naprawa przyczyny w tej części, jeśli leży poza przetargami (przetargi → 0.15.5). Cel: spółka z górnych 3 w kapitalizacji w ≤ 30% gier 20-letnich (żadna spółka nie dominuje w > 30%).
- **Ekspansja i etykieta:** limit różnorodności (spółka ma najwyżej N segmentów w niepowiązanych sektorach — propozycja 3; kolejna ekspansja wymaga powiązania lub dyskonta konglomeratu), **sektor główny przeliczany po zmianie segmentów** (Konfiturex Tech nie może być w grupie Technologia, jeśli większość przychodu to nieruchomości). **Commit P6.**

## P7. Lombard, Wrona, miejskie spółki, wydatki państwa

- **Lombard i Wrona:** pomiar popytu; strojenie napływu klientów i oprocentowania, żeby zakładka nie była pusta (cel: średnio ≥ 5 aktywnych pozycji lombardu, Wrona z portfelem > 0 w ≥ 80% gier).
- **Spółki miejskie:** nazwa „miasto” zamiast „miasto Gdańsk”; nie wszystkie wchodzą na giełdę (część zostaje miejska; cel: 30–60% na giełdzie; szczegóły rozstrzyga 0.15.6, w którym startują na NewHorizons).
- **Wydatki państwa:** pomiar skarbu; strojenie (niższe wpływy albo nowe wydatki). **Decyzja użytkownika:** nowe urzędy i programy socjalne w tej wersji, czy osobno (propozycja: strojenie tutaj, urzędy w Polityce 2 — 0.19.1). **Commit P7** (krok na element).

## P8. Kontrola końcowa

Pomiar z „Jak sprawdzimy”, raport `raporty/kontrola_0.15.4.md`, wiersz w mapie. **Commit P8.**

---

## Zlecenie dla czatu designu (przed P1 i P4)

1. Okno historii notowań z poprawnym formatem liczb; układ karty spółki z kursem i zmianą tygodniową bez zasłaniania.
2. Komunikat „dywidenda zbyt mała” i okno ogłoszenia splitu/konsolidacji.
3. **Mapa spółek jako drzewo genealogiczne** z liniami (zgłoszenie): osobne zlecenie, bez blokowania wersji.
4. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.

## Zapis gry i testy

- Pola opcjonalne w v15: znacznik splitu w historii (czynnik skali), progi dywidendy; przyrost < 0,05%.
- Testy (nowa grupa „0.15.4”, ok. 25): wymienione w częściach; niezmienniki po 20 latach; zapis i wczytanie po splicie.

## Jak sprawdzimy

Przebiegi ×200: 20 gier × 6,5 roku bez presetu, 20 × 6,5 roku z `fundusz-gig`, 10 × 20 lat. Porównanie z bazą 0.15.3 (kontrole 0.15.2 i 0.15.3).

| Miara | Cel |
|---|---|
| Spółki krajowe | ≤ 115 na koniec; > 125 nie dłużej niż 4 kw. |
| Kurs akcji | 99% spółek w 1–3000 zł (po P4); wartość pozycji po splicie bez zmian |
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 |
| Dywidenda | brak wypłat poniżej progu |
| Orzeł Telekom | górne 3 w ≤ 30% gier 20-letnich |
| Spółki z segmentami w ≥ 3 niepowiązanych sektorach | 0 |
| Lombard, Wrona | wg P7 |
| GIG, marża | ±1 pp / ±0,5 pp względem bazy |
| Czas kroku / zapis | +≤ 2% / +≤ 0,05% |

## Ryzyka

- **Split i niezmiennik akcji:** wielu posiadaczy, ETF, zastaw — osobne testy i commity; wyłączony przełącznik debug.
- **Zaostrzanie limitu zmieni GIG** (usuwa słabe spółki) → pomiar ±1 pp, wycofanie z wykupem po rynkowej cenie.
- **Naprawa „niewidocznych” błędów UI** bez odtworzenia: P0 jest warunkiem.
- **Za dużo naraz** → podział na kroki i commity; P7 można przesunąć do 0.15.5.

## Decyzje do podjęcia

1. Progi splitu i konsolidacji (propozycja 1000 zł / 1 zł).
2. Próg minimalnej dywidendy (propozycja 0,01 zł lub 0,1% kursu).
3. Limit różnorodności segmentów (propozycja 3 niepowiązane).
4. Wydatki państwa: strojenie teraz, nowe urzędy w 0.19.1.

## Prompt dla czatu implementującego P0

```
Wdrażasz część P0 planu 0.15.4 „Poprawki z gry 3” (gałąź zmiany-AI, nowa gałąź robocza).
Przeczytaj: plany/plan_0.15.4_poprawki_z_gry_3.md, plany/pomysly_na_kolejne_wersje.md (sekcja 9.1),
plany/raporty/kontrola_0.15.3.md. Kod: companies.js, core.js, ui.js, main.js, ma.js, city.js, tests/przebiegi.html, tests/tests.html.
Zakres P0: odtworzyć błędy 1–7 i 14 w przeglądarce, 8 i 10–12 w przebiegach ×200; dodać narzędzia deweloperskie (wykres liczby spółek w czasie,
wykres średniej ceny wg branż, licznik spółek wg źródła); sondy (Orzeł Telekom, segmenty, lombard i Wrona); napisać plany/raporty/diagnoza_0.15.4.md
(przyczyna, plik, krok naprawy). Niczego nie naprawiaj w P0 poza narzędziami. Testy 596/596 muszą przechodzić. Commity po polsku, osobno narzędzia i raport.
```
