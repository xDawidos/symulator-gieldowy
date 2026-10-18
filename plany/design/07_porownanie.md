# 0.14.5 Redesign — krok 7: porównanie przed / po

Data: 2026-10-19 · zrzuty „przed”: [zrzuty/przed/](zrzuty/przed/) (krok 1, 2026-10-17) · zrzuty „po”: [zrzuty/po7/](zrzuty/po7/) (ten krok) · lista błędów i poprawek: [07_poprawki.md](07_poprawki.md).

Ten sam zestaw ekranów i rozmiarów co w kroku 1: desktop 1440×900 i mobile 390×844 (zrzuty z panelu skalowane do szerokości 800 px; mobile w 2×). Stan gry: zapis deweloperski, rok 1 kw. 2, 300 ticków rynku, pauza. Skill `design-critique` nie był dostępny — ocena ręczna według struktury z kroku 1 (pierwsze wrażenie → hierarchia → czytelność → spójność → użyteczność).

Decyzje użytkownika w kroku 7:
- poprawki z przeglądu **zapisane** w `07_poprawki.md` (nie wdrażane w tym kroku);
- porządki w CSS: **tylko raport** ([martwy_css.md](martwy_css.md), generator `narzedzia/martwy_css.py`);
- 10 starych PNG inwestycji i pole `icon` w danych **usunięte** (ikony biorą się z `id` inwestycji).

## Pomiary przed → po (1440×900, ciemny motyw)
| Miara | Przed (krok 1–2) | Po (krok 7) |
|---|---|---|
| Wysokość paska górnego | 270 px (30% ekranu) | 60 px |
| Pasek górny na telefonie (390 px) | ok. 600 px, przyklejony | 109 px |
| Średnia wysokość wiersza spółki | 91 px (maks. 142) | 43 px |
| Spółki widoczne naraz (pulpit, po przewinięciu do tabeli) | 2–3 | ok. 20 |
| Spółki widoczne bez przewijania (pulpit od góry) | 0 | 4 — filtry zajmują ok. 5 rzędów (poprawka P3) |
| Paski przewijania | 2 obok siebie | 1 strona + panel funduszu |
| Teksty poniżej AA | 3 grupy (ciemny), 9 (jasny) | 0 (tylko ciemny motyw) |
| Cele kliknięcia < 24 px | 99 | 2 (pola wyboru z etykietą — wyjątek WCAG) |
| Elementy tylko dla myszy | 9 grup | 0 (także znaczniki wykresu) |
| Okna z `role="dialog"` | 5 z 41 | wszystkie |
| Emoji w kodzie widoku `ui.js` | 202 | 33 (same treści) |
| Grafika rastrowa w interfejsie | 16 PNG (12 w użyciu, jasne kafelki) | 0 — 120 ikon SVG |
| `displayStocks` (148 wierszy) | 24,8 ms | 23,8 ms (pomiar z kroku 5; kroki 6–7 go nie zmieniały) |
| Reguły w `style.css` | — | 1317, w tym 177 martwych (18 KB z 172 KB) — raport |
| Testy | 457/457 | 457/457 |

## Ekrany przed ↔ po
| Nr | Przed | Po | Ocena |
|---|---|---|---|
| 01 | `01_start_nowa_gra.jpg` | `01_start_nowa_gra.jpg` | ✓ telefon z Babcią w bursztynowej ramce, formularz w jednym stylu z oknami |
| 02–03 | `02_pulpit_gora.jpg`, `03_rynek_filtry_naglowek.jpg` | `02_pulpit_gora.jpg`, `03_…` | ✓ pasek 60 px, menu w grupach, panel funduszu z ramką stanu · ✗ filtry sektorów i giełd ok. 5 rzędów (P3) |
| 04 | `04_tabela_akcji_sektory.jpg` | `04_tabela_akcji_sektory.jpg` | ✓ wiersz 43 px, nazwa w 1 linii, chip zmiany ▲/▼, ikony sektorów, kwadraty giełd |
| 05 | `05_wiersz_handel_rozwiniety.jpg` | `05_wiersz_handel_rozwiniety.jpg` | ✓ panel handlu z podpisanymi narzędziami i kosztem zlecenia |
| 06 | `06_karta_spolki.jpg` | `06_karta_spolki.jpg` | ✓ kafelki KPI, zakładki · ✗ kropka dziesiętna obok przecinka, powtórzona stopa dywidendy (P1) |
| 07–08 | `07_poczta_lista.jpg`, `08_…` | `07_poczta_lista.jpg`, `08_poczta_wiadomosc.jpg` | ✓ 3 kolumny, klawiatura · ✗ tematy ucięte przy pustym podglądzie, wydanie zbiorcze jako jeden akapit (P5) |
| 09 | `09_akademia.jpg` | `09_akademia.jpg` | ✗ stary nagłówek (wyśrodkowany), emoji na liście haseł (P4) |
| 10 | `10_skaner_spolek.jpg` | — | nie zrobiony: skaner wymaga szkolenia Analityk (na zapisie testowym brak) |
| 11 | `11_inkubator_…` | `11_inkubator_pula.jpg` | ✗ stary styl: niebieski nagłówek sekcji, pasek „100.0%” na całą szerokość, luźne pola (P4) |
| 12 | `12_miasto.jpg` | `12_miasto.jpg` | ✓ nowy nagłówek i pasek KPI · ✗ treść powtarza KPI, zapis „A: x \| B: y” (P4) |
| 13 | `13_panstwo_kraj.jpg` | `13_panstwo_kraj.jpg` | ✓ karty z ikonami i mini-wykresami · ✗ „4.50%”, „0.999” (P1) |
| 14 | `14_klienci_rynek_JU_…` | `14_klienci_udzialy.jpg` | ✓ „udziały” zamiast JU, ikony typów klientów · ✗ liczby z kropką w tabeli funduszy (P1) |
| 15 | `15_panel_funduszu_wyniki.jpg` | `15_panel_funduszu_wyniki.jpg` | ✓ zwijane sekcje, wyniki z legendą |
| 16 | `16_okno_decyzji_…` | `16_okno_decyzji_potwierdzenie.jpg` | ✓ tytuł-pytanie, przycisk z nazwą działania |
| 17 | `17_wykres_swiecowy.jpg` | `17_wykres_swiecowy.jpg` | ✓ świeca rosnąca pusta, znaczniki z ikoną · ✗ biały poziomy pasek przewijania, ucięty prawy brzeg (P1) |
| 18 | `18_pasek_newsow.png` | `18_pasek_newsow.png` | ✓ pauza z klawiatury, w jednym pasku z KPI |
| 19, 19b | motyw jasny | — | usunięty (decyzja: tylko ciemny) |
| 20 | `20_waski_panel_800px.jpg` | `20_waski_panel_800px.jpg` | ✓ układ mobilny · ✗ białe natywne paski pod chipami, dwa identyczne ☰ (P1) |
| 21–25 | `21_…` – `25_…` (390 px) | `21_mobile_390_gora.jpg` … `25_mobile_390_tabela.jpg` | ✓ szuflada menu, tabela jako karty, karta spółki na całą szerokość · ✗ pasek KPI ucina 3. i 4. wartość (P1) |
| 26–31 | — (nowe) | `26_bank` … `31_badania_rnd` | okna nieprzejrzane w kroku 5: Bank ✓, Budownictwo ✓ (inne zakładki), Szara strefa / Korporacja / Lombard / R&D ✗ starsze nagłówki i zakładki (P4) |

## Ocena końcowa
**Pierwsze wrażenie.** Pulpit wygląda jak jeden produkt: ciemny terminal z bursztynowym akcentem, gęsta tabela z liczbami w kroju mono, czytelny pasek KPI. Najważniejsze dane (gotówka, NAV, zaufanie, rynek) są widoczne bez szukania. W kroku 1 rynek był pod dwoma paskami i zajmował 3 wiersze.

**Hierarchia.** Pasek → rynek → panel funduszu działa. Słabe miejsce to filtry nad tabelą: 18 chipów sektorów w 5 rzędach i 11 chipów giełd w 2 rzędach spychają tabelę w dół ekranu (P3).

**Czytelność.** Kontrast AA wszędzie, liczby w jednym kroju. Największą niespójnością jest teraz zapis liczb: kwoty PLN i chipy zmian mają przecinek, a wiele okien (Państwo, Klienci, karta spółki, Bank) — kropkę. Czasem oba zapisy są w jednym kafelku (P1).

**Spójność.** Okna z kroku 5 (Bank, Państwo, Miasto, Klienci, Budownictwo, Rynek 0.15) mają wspólny nagłówek z nadtytułem i ikoną. Starsze okna (Akademia, Korporacja, Lombard, Szara strefa, R&D, Wykres, Poczta) mają jeszcze 2 inne style nagłówków i 3 style zakładek (P4).

**Użyteczność.** Klawiatura, fokus, dialogi i znaczniki wykresu działają. Na telefonie pasek KPI ucina wartości. Poczta marnuje miejsce, gdy nic nie jest otwarte (P1, P5).

## Co dalej
- Poprawki P1–P5 z [07_poprawki.md](07_poprawki.md) — do wykonania przez czat kodu albo jako krok 7b (decyzja użytkownika).
- Usunięcie martwych reguł CSS według [martwy_css.md](martwy_css.md) — z porównaniem wyliczonych stylów (procedura w `07_poprawki.md`, P6).
- Figma: import `img/ikony/arkusz.html` i komponentów 0.15 po odnowieniu limitu MCP.
