# Kontrola 0.18.9 — ESG i etyka (G11)

Gałąź `zmiany-AI`. Plan: `plany/plan_0.18.9_esg.md`. Decyzje: `raporty/decyzje_0.18.9.md` (H1–H18, U14). Diagnoza: `raporty/diagnoza_esg_0.18.9.md`. Makiety 33–36 (zaakceptowane).

Baza: g0 (kod 0.18.8 z samą sondą ESG) i fk (seria końcowa 0.18.8) łącznie: 24 + 25 gier × 6,5 roku, 10 + 15 × 20 lat. Pojedyncza baza g0 wypadła wysoko (marża 20 lat 21,4% wobec 18,8% w fk), więc porównania idą do bazy łącznej.

Seria kontrolna c9 (kod a7b185b): 24 gry × 6,5 roku i 20 × 20 lat bez presetu oraz 10 × 20 lat z presetem `esg5` (UEiE na poziomie 5, kryterium ESG). Seria gw (po zmianie szansy greenwashingu 0,0015 → 0,001 na kw.): 24 × 6,5 roku i 10 × 20 lat. Testy: 1140/1140.

## Części

| Część | Commit | Co zrobione |
|---|---|---|
| G0 | ac1271e | `esg.js`: ocena rzeczywista (filary E/S/G, wynik łączny, filar D obniża literę), sonda ESG, diagnoza |
| G1–G5 | 8c5f70c | ocena publiczna, pokrycie, deklaracje i greenwashing; audytorzy z ESG losowani (`noEsg`, dołączanie do 5) i ryzyko ESG w ocenie kredytowej; cechy etyk / ignorant / ekolog / konserwatysta; projekty ESG i ulepszenie eko; popyt ESG ze średnią zero |
| G4 UI | 82a957b | makieta 36: projekty ESG w oknie Inwestycje spółki, wniosek na walne bez większości, wersja eko w katalogu |
| G6 | a844f30 | makieta 35: klient i fundusz etyczny, okno „O funduszu” z 4 zakładkami, ostrzeżenie limitu w szufladzie zlecenia |
| G7 | 0bd5fea | makieta 33: RateU (ranking 10 + 10 z impulsem, badania u 6 audytorów, Ekologia od poziomu 4) |
| G8 | d4cae07 | makieta 34: znaczek ESG w wierszu listy, skrót w Przeglądzie, blok „Etyka i ESG” w Zarządzaniu |
| G9 | 3491466 | rozporządzenia UEiE (poziom 4), kary za greenwashing, kryterium ESG awansu (poziom 5), preset `esg5` |
| G10 | a7b185b | kolejność przydziału elitarnych, progi Rubinowej (1,6 ×) i Szmaragdowej (2,5 ×), reakcja spółek na kryterium ESG, strojenie po k9 |
| G11 | f7b2bfb | szansa greenwashingu 0,001 na kw.; raport |
| U14 | ten commit | Rubinowa ≥ C, cel Szmaragdowej dla dużych spółek, ponowny audyt przy spełnionej ocenie rzeczywistej, banki poza kryterium; mediana jako przełącznik |

## Bramki G11

| Kryterium | Widełki | Wynik (c9, gw) | Ocena |
|---|---|---|---|
| Pokrycie oceną publiczną | 40–70% | 6,5 roku 41–43% (c9), 39,5–39,9% (gw); 20 lat 59–61% | OK (6,5 roku na granicy) |
| Oceny publiczne po 20 latach, A / B / C / D | 10–25 / 30–45 / 25–40 / 5–15% | c9: 26 / 36 / 26 / 12; gw: 29 / 37 / 24 / 9 | B, C, D OK; A o 1–4 pp za wysoko |
| Każda klasa niepusta w grze 20 lat | tak | 0 gier bez klasy (c9, gw) | OK |
| Greenwashing | 3–10% deklaracji | gw: 6,5 roku 8,8 / 10,9%, 20 lat 6,5% (c9 przed zmianą: 10–13%) | OK (na granicy po 6,5 roku) |
| Rozporządzenie przy poziomie 4 | 1 na rok | test; `esg5`: co rok, 64 kary w 10 grach × 20 lat | OK |
| Średni wpływ G5 na rynek | 0 ± 0,1% | z budowy 0 (test: suma zmian kapitalizacji 0) | OK |
| Różnica zwrotu A – D (log, rocznie) | 2–5 pp | 20 lat 4,3 pp; 6,5 roku 5,7 pp | OK / na granicy (głównie selekcja: D to spółki w złej kondycji) |
| GIG 20 lat | 10–13% i ± 0,3 pp | c9 + gw: 9,91% (−0,40 pp, SE 0,45); c9: 9,55% | poza celem o 0,1 pp poziomu, w szumie |
| GIG 6,5 roku | ± 0,3 pp | c9 + gw: 9,95% (−0,69 pp, SE 0,81) | w szumie |
| Marże (średnia odchyłek sektorów) | 0 ± 0,3 pp | 6,5 roku −0,23 (SE 0,21) OK; 20 lat +0,77 (SE 0,31) | 20 lat poza (marże wyżej, nie niżej) |
| Marża końcowa (ważona) | ± 0,3 pp | 6,5 roku −0,41 (SE 0,44); 20 lat +0,32 (SE 0,89) | w szumie |
| Zanieczyszczenie 20 lat | ≤ ok. 66,8 | c9 64,4 (SE 4,7, 20 gier); gw 78,3 (SE 7,6, 10 gier); wszystkie serie 0.18.9 razem ok. 66,6 wobec 67,5 w seriach 0.18.8 | OK (bez pogorszenia), rozrzut serii duży |
| Rubinowa 3–6 od 3. roku | ≥ 90% (cel 95%) | c9 88%, gw 89% (bez kryterium ESG, w 7 z 20 gier c9 kryterium weszło) | o 1–2 pp poniżej |
| Szmaragdowa 1–3 | ≥ 90% (cel 95%) | c9 85%, gw 83% | poniżej |
| Diamentowa 1 | ≥ 95% | 100% | OK |
| Elitarne z kryterium ESG | ≥ 85% (akceptowalne ≥ 75%) | c9 `esg5`: Rubinowa 44%, Szmaragdowa 49%; po U14 (p14): Rubinowa 74%, Szmaragdowa 62%, Diamentowa 100% | Rubinowa o 1 pp pod progiem akceptowalnym, Szmaragdowa poniżej (sekcja U14); projekty ESG 24–33% (cel 10–25%) |
| Projekty ESG po 20 latach | 10–25% spółek | 26–29% | o 1–4 pp za dużo |
| Zmiana oceny kredytowej (audytorzy z ESG) | 0 ± 0,2 stopnia | −0,08 (20 lat), −0,12 (6,5 roku) | OK |
| Czas kroku | ≤ 900 ms/kw., wzrost ≤ 20 ms | 6,5 roku 788 ms (baza 802); 20 lat 1189 ms (baza 1110, +79 ms) | 20 lat: wzrost ponad próg; seria 20 lat ma ponad 900 ms także w bazie |
| Błędy JS, niezmienniki, ujemna gotówka, po wczytaniu | 0 | 0 w 84 grach (c9, gw) | OK |
| Zapis | — | +2,2% (6,5 roku), +2,8% (20 lat) | — |

## Elitarne: co odpada

Sonda `T.tiers[].ru` i `em` (c9, bez kryterium): pula Platynowej i elitarnych 10,9 spółki; ocenę A+ ma 9,7, zysk 8 kw. 10,8, kapitalizację Rubinowej 10,0, wszystkie warunki Rubinowej 8,9, warunki Szmaragdowej 4,2 (dywidenda 2 kw.: 5,3). Rubinowa i Szmaragdowa dzielą tę samą małą pulę, więc obie trzymają się w okolicy 85–90%. Dalsze obniżanie progów kapitalizacji dokłada najwyżej 1 spółkę (G10: 9,98 z 10,9 spełnia już kapitalizację).

Z kryterium ESG (`esg5`) pula spada do 8,1 (Platynowa wymaga ESG ≥ C), a wymóg B dla elitarnych odcina połowę kandydatów: duże spółki to w większości emitenci (energetyka, przemysł, chemia) z oceną C. Projekty pod kryterium (G10) nie nadrabiają tego w ciągu kilku lat, bo filar E zależy od emisji.

## U14: kryterium ESG w elitarnych (decyzja 2026-11-23)

Polecenie użytkownika: sprawdzić, dlaczego duzi emitenci mają głównie C i co skłoni spółki do ESG; jeśli nie zadziała, Rubinowa ≥ C. Dodatek: wariant oceny łącznej jako mediany liter filarów (filar D ogranicza do B).

**Diagnoza** (serie d14 i n14 z sondą puli: spółki z Platynowej i elitarnych z kapitalizacją ≥ 1,6 × progu Platynowej; banki wyłączone od n14). Emitenci nie trzymają się w C z budowy: E porównuje emisyjność spółki ze średnią sektora (spółka na średniej ma E 60, filar C, ale wynik łączny 60–61 przy S i G ok. 61), a energetyka, chemia i przemysł w puli mają głównie B. W C siedzą Obronność (baza E 48), Budowlany, Usługi i część Nieruchomości. Bez kryterium rzeczywiste ≥ B ma 58% puli, z kryterium (esg5) 75%. Spółce w C do progu B brakuje średnio 4 pkt wyniku łącznego, czyli 1–2 projekty (koszt 0,5–3% rocznego przychodu, 2–4 kw.). Ścieżka ESG kosztuje roczny przychód i prawie nikt jej nie wybiera (1–4% puli). Dwie przyczyny w motywacji: (1) duża spółka z Platynowej mierzyła się z progiem Platynowej (C), więc nie reagowała na wymóg B elitarnych; (2) spółka z oceną publiczną zaniżoną przez szum (±1 litera z 20%) czekała 4 kw. na nowy audyt. Banki nie mają oceny ESG, więc na Platynowej nie przechodziły kryterium.

**Warianty** (20 lat, 10 gier z `esg5`, 6 bez presetu, kwartały od 3. roku):

| Wariant | Rubinowa z kryterium | Szmaragdowa z kryterium | Rubinowa / Szmaragdowa bez presetu | Oceny rzeczywiste A / B / C / D (20 lat, esg5) | Projekty ESG |
|---|---|---|---|---|---|
| c9 (przed U14, elitarne ≥ B) | 44% | 49% | 88 / 85% | — | 26–29% |
| d14 (to samo, nowa sonda) | 60% | 58% | 83 / 74% | — | — |
| n14 wynik ważony + motywacja | 70% | 60% | 79 / 84% | 21 / 37 / 30 / 12 | 28–31% |
| n14 mediana + motywacja | 73% | 64% | 82 / 79% | 23 / 44 / 33 / 0,3 | 24–34% |
| **p14: wynik ważony + motywacja + Rubinowa ≥ C** | **74%** | **62%** | **85 / 82%** | 24 / 35 / 26 / 15 | 24–33% |

Mediana daje tylko +3–4 pp w elitarnych, a klasa D prawie znika (0,3–0,5% spółek, w 8 z 10 gier esg5 brak D), bo D wymaga dwóch filarów D. Bez limitu do B mediana zostawia D, ale wtedy filar D nie obniża oceny łącznej (A A D → A), czyli wraca problem, przed którym chronił limit. Wybór: wynik ważony.

**Wynik p14** (44 gry: 24 × 6,5 roku bez presetu, 10 × 20 lat bez presetu, 10 × 20 lat esg5): Rubinowa z kryterium 74% (o 1 pp pod progiem akceptowalnym 75%; 8 pierwszych gier: 78%), Szmaragdowa 62% (poniżej). Bez kryterium bez zmian w szumie wobec c9. Oceny publiczne po 20 latach bez presetu: A 20,5 / B 43,8 / C 22,7 / D 13,0%, pokrycie 55%. Zmiana oceny kredytowej −0,11 stopnia. Marże i GIG wobec bazy g0 + fk: 6,5 roku średnia odchyłek sektorów −0,04 pp (OK), GIG +0,59 pp (SE 1,03); 20 lat GIG −0,67 pp (SE 0,57), marża końcowa −1,17 pp (SE 1,10), wskaźnik zysków −1,14 pp (SE 0,44; łącznie z c9 i gw −0,12 pp, SE 0,37, więc szum serii). Zanieczyszczenie bez zmian (ta sama ścieżka, projekty w szumie). Czas kroku w p14 wyższy (971 / 1573 ms), bo seria szła 8 naraz obok testów; c9 bez zmian kodu w pętli.

Szmaragdową (62%) ograniczają przede wszystkim warunki spoza ESG: z 8,4 spółek w puli dywidendę przez 2 kw. i kapitalizację 2,5 × ma 3,4, a ESG ≥ B odcina z tego jeszcze ok. 20%. Dalsze obniżanie wymogu ESG dla Szmaragdowej poza decyzją użytkownika, więc zostaje B.

## Co nie zostało sprawdzone

- Bramka elitarnych bez kryterium ≥ 90% nie przeszła (c9 88–89% / 83–85%, p14 85 / 82%); w części gier kryterium wchodzi samo (7 z 20 c9, 3 z 10 p14).
- Rubinowa z kryterium 74% (próg akceptowalny 75%), Szmaragdowa 62% (cel ≥ 85%, akceptowalne ≥ 75%).
- Fundusz etyczny bota („strategia testowa bota” z planu) nie powstał: napływ +15% sprawdza test jednostkowy, nie seria.
- Czas kroku w grze 20-letniej +79 ms wobec bazy łącznej (w seriach równoległych pomiar czasu jest głośny; seria 6,5 roku bez wzrostu).
- Wiersz listy z oceną ESG i okna UI sprawdzone w podglądzie na jednej grze; zrzuty nie są zapisane.
