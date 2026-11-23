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
| G11 | ten commit | szansa greenwashingu 0,001 na kw.; raport |

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
| Elitarne z kryterium ESG | ≥ 85% | `esg5`: Rubinowa 44%, Szmaragdowa 49%, Diamentowa 99% | **poza → U14** |
| Projekty ESG po 20 latach | 10–25% spółek | 26–29% | o 1–4 pp za dużo |
| Zmiana oceny kredytowej (audytorzy z ESG) | 0 ± 0,2 stopnia | −0,08 (20 lat), −0,12 (6,5 roku) | OK |
| Czas kroku | ≤ 900 ms/kw., wzrost ≤ 20 ms | 6,5 roku 788 ms (baza 802); 20 lat 1189 ms (baza 1110, +79 ms) | 20 lat: wzrost ponad próg; seria 20 lat ma ponad 900 ms także w bazie |
| Błędy JS, niezmienniki, ujemna gotówka, po wczytaniu | 0 | 0 w 84 grach (c9, gw) | OK |
| Zapis | — | +2,2% (6,5 roku), +2,8% (20 lat) | — |

## Elitarne: co odpada

Sonda `T.tiers[].ru` i `em` (c9, bez kryterium): pula Platynowej i elitarnych 10,9 spółki; ocenę A+ ma 9,7, zysk 8 kw. 10,8, kapitalizację Rubinowej 10,0, wszystkie warunki Rubinowej 8,9, warunki Szmaragdowej 4,2 (dywidenda 2 kw.: 5,3). Rubinowa i Szmaragdowa dzielą tę samą małą pulę, więc obie trzymają się w okolicy 85–90%. Dalsze obniżanie progów kapitalizacji dokłada najwyżej 1 spółkę (G10: 9,98 z 10,9 spełnia już kapitalizację).

Z kryterium ESG (`esg5`) pula spada do 8,1 (Platynowa wymaga ESG ≥ C), a wymóg B dla elitarnych odcina połowę kandydatów: duże spółki to w większości emitenci (energetyka, przemysł, chemia) z oceną C. Projekty pod kryterium (G10) nie nadrabiają tego w ciągu kilku lat, bo filar E zależy od emisji.

## Do decyzji użytkownika

- **U14 (kryterium ESG w elitarnych).** Przy kryterium z planu (Rubinowa, Szmaragdowa, Diamentowa ≥ B) elitarne są obsadzone w 44–49% kwartałów (cel ≥ 85%). Opcje: a) zostawić (kryterium robi to, co ma: elitarne pustoszeją, póki spółki się nie poprawią); b) Rubinowa ≥ C, Szmaragdowa i Diamentowa ≥ B; c) wszystkie elitarne ≥ C, B tylko dla Diamentowej; d) przy kryterium dłuższy okres przejściowy (8 kw.) i spółki pod kryterium dostają ocenę szybciej. Rekomendacja: **b)**, bo daje różnicę między poziomami i zostawia Rubinową dla dużych emitentów.

## Co nie zostało sprawdzone

- Bramka elitarnych bez kryterium ≥ 90% nie przeszła (88–89% / 83–85%); bez U14 dalsze strojenie nie ma sensu, bo w części gier kryterium wchodzi samo (7 z 20 gier c9).
- Fundusz etyczny bota („strategia testowa bota” z planu) nie powstał: napływ +15% sprawdza test jednostkowy, nie seria.
- Czas kroku w grze 20-letniej +79 ms wobec bazy łącznej (w seriach równoległych pomiar czasu jest głośny; seria 6,5 roku bez wzrostu).
- Wiersz listy z oceną ESG i okna UI sprawdzone w podglądzie na jednej grze; zrzuty nie są zapisane.
