# Plan 0.16.6 „Domknięcie 0.16” (szkic zakresu; po 0.16.5, przed porządkami plików)

Źródło: zgłoszenia użytkownika z 2026-10-28 oraz lista rzeczy pominiętych przez sesje wdrażające 0.16.2 i 0.16.3 (raporty `kontrola_0.16.2.md`, `kontrola_0.16.3.md`). Decyzje użytkownika zapisane niżej. Szkic: przed startem przeczytać kod 0.16.2–0.16.5 (`countries*.js`, `gdr.js`, `currency*.js`, `listings.js`, `city.js`).

## Decyzje (2026-10-28)

1. **Siła inwestorów mniejszościowych po dołączeniu kraju — usunięta z planu** (brak konkretnej mechaniki).
2. **„Władza korony” Gutzwillera → złota akcja:** Gutzwiller może raz na kilka lat zablokować przejęcie banku w Szwajcarii (weto); reszta jego cech (banki i REIT-y, rezerwa w CHF, neutralność) bez zmian.
3. **Waluta rozliczeniowa w wariancie B — tylko fabuła** (opis w mailu i Akademii); kara dla GPW (opłaty, spadek 5–15%) już jest.
4. **Połączenia giełd:** szansa zaczyna się od 8. kwartału (`fromQ` w `LINK_RULES`), ale **rośnie wyraźnie po powstaniu lotniska albo portu** (budowa infrastruktury z `city.js`); bez nich szansa niska i rosnąca powoli.
5. **Państwo:** żadne spółki państwowe nie mogą przejść na giełdy inne niż GPW (patrz S2).

## Zakres

### S0. Wybór kraju startowego
- Na ekranie startu gracz wybiera kraj, z którego zaczyna (dziś zawsze Polska). Wybrany kraj ma pełne społeczeństwo (klasy, partie, ustawy, migracja, urzędy), a pozostałe stały profil pracowników.
- Wymaga uogólnienia kodu zakładającego Polskę: PLN jako waluta bazowa i `toPln` (zob. 0.16.1), giełda „GPW”, spółki startowe, boty krajowe, profil społeczeństwa z 0.13, partie z 0.19.1 (6 w kraju startowym, 4 w innych), kryzysy 0.15.3 (kraj startowy jako źródło).
- Zakres szacunkowo L–XL: etap S0a (inwentaryzacja miejsc zakładających Polskę, raport), S0b (zmiana waluty bazowej i giełdy startowej na parametr), S0c (wybór na ekranie startu dla krajów z 0.16: DE, US, CZ i dalsze), S0d (społeczeństwo dla kraju startowego innego niż PL). **Może wymagać podziału na osobną wersję**, jeśli S0a pokaże zbyt wiele założeń.
- Uwaga: UI zachowuje zasady „PLN” z projektu; przy innym kraju startowym waluta konta/konta prywatnego do ustalenia (otwarte pytanie).

### S1. Mechaniki pominięte w 0.16.3 (do wdrożenia lub świadomego usunięcia)
1. **Gotówka w Waschmabanku poza kontrolą nadzoru:** rachunek gracza w banku, zasady ukrycia przed kontrolą 0.11, afera z utratą reputacji, jeśli wyjdzie na jaw. **Ryzyko:** ukryta gotówka zmienia NAV i ocenę funduszu — wymaga osobnych testów niezmienników i decyzji, co widzi KNF i klient; bez regresji rdzenia (NAV, bramka umorzeń, mandaty).
2. **Obowiązkowe wezwanie i kary przy przekroczeniu progu (akcje obce):** dziś tylko twardy limit zakupu do progu. Pełna wersja: drabina KNF z 0.15.1 (wezwanie, kara, odsprzedaż) dla akcji obcych. Akcje obce są w słowniku `holders`, nie w portfelach — **najpierw ujednolicić posiadaczy** (wspólna funkcja posiadania), potem drabina.
3. **Złota akcja Gutzwillera** (decyzja 2): weto przejęcia banku w Szwajcarii, cooldown w czasie gry.
4. **Bayer skupuje waluty:** zakupy na kantorze jako aktywność wpływająca na kurs (mały popyt, ograniczony), widoczna w historii kursu; bez wpływu = nie wdrażać (decyzja na pomiarze: wpływ na kurs ≤ ±1%).
5. **Wilk — dźwignia:** kredyty botów w logice pump-and-dump; wdrożyć, jeśli istnieje kredyt bota (inaczej pominąć; kapitał 10,5 tys. zł, wpływ na rynek niewielki).
6. **Połączenia giełd** wg decyzji 4 (parametry `LINK_RULES`).
7. **Waluta rozliczeniowa wariantu B** — tylko opis (decyzja 3), brak kodu.

### S2. Superprojekty jako spółki państwowe
- **Szpital kliniczny, Kampus technologiczny, Centrum wystawiennicze** (`state.js`, projekty miejskie) po ukończeniu stają się **spółkami państwowymi notowanymi na GPW** (sektory z definicji projektu: Medycyna/Usługi, Technologia/Gaming/Badania, Usługi/Media/Dobra konsumpcyjne), z kapitałem początkowym zbliżonym do kosztu budowy, własnością skarbu państwa i dywidendą do skarbu.
- **Spółki państwowe nie mogą przejść na inne giełdy niż GPW:** blokada przeniesienia notowania (awans/zejście NewHorizons, rynki zagraniczne, giełda prywatna), brak GDR dla nich, zagraniczne przejęcia i wchodzenie na nowe giełdy zablokowane; sprawdzić istniejące spółki państwowe (sektor państwowy z 0.10.2) i objąć je tą samą regułą.
- Testy: ukończenie projektu → nowa spółka GPW; próba przeniesienia → odmowa; niezmiennik liczby spółek krajowych (limit 0.15.4 P5 nie jest łamany; spółki państwowe z superprojektów spoza limitu albo w nim — decyzja przy wdrożeniu).

### S3. Kontrola i raport
- Testy (grupa „0.16.6”), przebiegi ×200 (20 gier × 6,5 roku): GIG ±1 pp względem bazy po 0.16.5, niezmienniki 0, ukryta gotówka nie zmienia NAV w sposób niezgłaszany. Raport `kontrola_0.16.6.md` z sekcją „Pominięte i problemy”, wiersz w mapie.

## Ryzyka i otwarte pytania

1. **S0 (kraj startowy)** to największy punkt i może zająć całą wersję; jeśli tak — rozdzielić na 0.16.6 (S1–S3) i 0.16.7 (S0).
2. Ukryta gotówka (S1.1) i kary KNF (S1.2) to ryzyko regresji w rdzeniu — osobne commity i testy niezmienników.
3. Czy superprojekty mają wchodzić na GPW od razu, czy po IPO (rynek pierwotny)? Domyślnie: od razu, bez IPO.
