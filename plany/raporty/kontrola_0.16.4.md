# Kontrola 0.16.4 „Azja i forex”

Stan: G18–G22 zrobione + PanDa na mechanice parabanku z 0.11 + E6 (opłaty giełd, profile, NH) na prośbę z gry. Testy 820/820 (`node plany/design/narzedzia/run_tests.mjs`). Gałąź `claude/impl-0162-254f7c`, niescalona.

## Zrobione
- **Zawieszanie przebiegów (błąd, naprawiony):** okno połączenia giełd pauzowało grę, a przebieg bez gracza go nie zamykał (kw. 13/27 stało w nieskończoność). Harness wznawia grę i przerywa przebieg błędem po braku postępu; test regresyjny pauzy.
- **G18:** JP 13+3, TW 5+1, CN 13+4, IN 10+4; podsektory Przemysł ciężki i Herbata; giganci Araska i TikTak (kwity); napięcie Chiny–Tajwan (KWS −30%, półprzewodniki −8% na świecie; 3%/kw., przerwa 8 kw.).
- **G19:** spółki specjalne (Bakugan, Bollywood, Curry Masala, Smok, Huiei – sankcje), **PanDa Bank na mechanice parabanku z 0.11** (bank z lokatami i kredytem, fazy: otwarcie → śledztwo z zawieszeniem notowań → policja → ucieczka, rozliczenie posiadaczy), 8 cech prezesów azjatyckich.
- **G20:** boty Tygrys (technologia) i Konfucjusz (handel akcjami japońskimi tylko z Tygrysem, transakcje bot–bot).
- **G21:** forex i `marginEngine` (depozyt = wartość/dźwignia ≤ 1:10, swap 3%/rok od pożyczonej części, spread 0,2%, margin call < 70%, zamknięcie < 50%, strata ≤ depozyt, limit funduszu 3× aktywa); silnik niezależny od rynku (0.17: wystarczy `registerMarginMarket`).
- **G22:** zakładka Forex w kantorze (sprawdzona w przeglądarce, konsola bez błędów), hasło Akademii „Dźwignia i margin call”.
- **E6 (z gry):** minimalna opłata za notowanie (GPW 1000 zł/kw., giełdy prywatne 100, NH 0); losowe profile giełd prywatnych (60% giełd; 7 wariantów); pole `country: 'PL'`; spółki NH same decydują o awansie na GPW (cecha „zostaję” ~40%, zysk i gotówka ≥ 4 tys. zł, większościowiec gracz decyduje sam). **PRV (Włoska Giełda) bez opłaty minimalnej** — nie ma operatora, a ryzyko oszustw ×5 już ją obciąża (decyzja sesji „Reszta wersji 0.16.x”; opis na karcie giełdy).

## Pomiary (przebiegi ×200, 12 gier × 27 kw. na serię, ostateczny kod)
| Seria | GIG CAGR średnia ± odch. (mediana) | Marża | Zapis (znaki) | Czas kroku | Niezmienniki / ujemna gotówka / wyjątki |
|---|---|---|---|---|---|
| `none` (bez krajów) | 11,7% ± 3,9 (11,7) | 21,9% | 2,22 mln | 1231 ms/kw. | 0 / 0 / 0 |
| `kraje-10` (10 krajów + forex od startu) | **8,8% ± 3,0 (7,5)** | 21,6% | 2,28 mln (w tym kraje ≈ 30 tys.) | 1362 ms/kw. | 0 / 0 / 0 |
Wcześniejsze serie (k64_none 12,6 ± 5,1; k64_10 9,3 ± 3,4) były liczone na kodzie zmienianym w trakcie przebiegów — tylko jako potwierdzenie kierunku. Bazy: 0.16 = 10,1 ± 3,6 (20 gier), 0.16.2 bez krajów 11,0 ± 3,9.
- **Wpływ na GIG: −2,9 pp (kraje-10 vs none), powtórzony dwukrotnie (−3,3 i −2,9).** To jest ponad cel ±1 pp. Przyczyny nie rozstrzygnięto.
- **Częstość zdarzeń (kraje-10, 12 gier):** połączenia giełd 2–4 na grę (łącznie intl 14, merged 16, taken 6), wspólnota europejska w 12/12; PanDa — upadek i zniknięcie w 12/12 gier w ciągu 6,5 roku; napięcie KWS 0–1 na grę (ok. 8 z 12 gier); sankcje Huiei w ok. 9 z 12; margin calle 0–2 na grę (łącznie 6), forex: 3–5 pozycji otwartych i 1–3 odmów na grę (odmowy: limit/gotówka, nie zbadane); Tygrys ≈ 53–123 tys. zł, Konfucjusz ≈ 25–75 tys. zł.
- **Zarażanie kryzysów:** 2 linie na 12 gier z krajami, zagranicznych 0.
- Zapis krajów: mediana 30 tys. znaków (max 32 tys.). Niezmienniki krajów, forexu i świata: 0 naruszeń.

## Pominięte i problemy
- **GIG −2,9 pp z krajami** (powyżej celu ±1 pp): podejrzani — spadek giełd po wariancie B (6 „taken” w 12 grach, −5…−15% na wszystkie sektory), wejście Santosa na rynek PL, zarażanie; nie izolowane. Wymaga decyzji, czy badać (np. presety bez „taken” i bez Santosa).
- Preset `kraje-10` otwiera 10 krajów od startu (obciążenie i zapis), czego naturalna gra nie robi — wpływ na GIG w naturalnej grze będzie mniejszy.
- Seria 12 gier: błąd średniej ≈ 1,1 pp na serię; brak serii 20-letnich i `fundusz-gig`.
- Forex: 1–3 odmowy otwarcia na grę w presecie (przyczyna nie zbadana: limit 3× aktywa, gotówka albo wstrzymany handel); swap uproszczony (stała stopa, bez różnicy stóp krajów); brak zleceń stop/limit.
- Progi wezwania i nadzór azjatyckich krajów (FSA 75%, CSRC 66%, SEBI 66%, FSC 75%) wymyślone przez sesję — plan ich nie podaje.
- Spółki państwowe Azji zostają na swoich giełdach; polskich spółek państwowych żadna zmiana nie przenosi.
- Do 0.16.6 (bez zmian): Waschmabank poza nadzorem, wezwanie/kary przy progu, Bayer kupujący waluty, dźwignia Wilka, złota akcja Gutzwillera.
- E6: filtr „kraje” jest dziś pusty (wszystkie spółki mają PL); opłata minimalna płacona najwyżej do wysokości gotówki spółki (bez zaległości i wycofania za długi); wpływ E6 na GIG osobno nie mierzony.
- Zawieszenie notowań PanDa przeżywa zapis, ale parabank w fazie otwarcia po wczytaniu zależy od istnienia spółki PND (po ucieczce — pole `phase: 'gone'`).

## Dochodzenie: spadek GIG z krajami (12 gier × 27 kw. na serię)
| Seria | GIG średnia ± odch. |
|---|---|
| `none` (bez krajów) | 11,7% ± 3,9 (powtórka 12,6 ± 5,1) |
| `kraje-10` (10 od startu) | 8,8% ± 3,0 (powtórka 9,3 ± 3,4) |
| `kraje-10-izol` (bez „taken” i bez wejścia Santosa) | 10,2% ± 4,8 |
| `kraje-stopniowo` (co 2 kw. od 2., jak w grze; „taken” w 11/12 gier) | 8,2% ± 4,8 |
- Spadek **nie jest artefaktem presetu** (stopniowe otwieranie daje 8,2%). Przejęcie naszej giełdy przez obcą (wariant B: −5…−15% na wszystkie sektory, zamierzone w planie) tłumaczy ok. 1,5–2 pp; reszta (Santos, zarażanie) mieści się w szumie serii (błąd średniej ≈ 1,4 pp) — nie rozdzielona. CAGR liczony od końca do końca jest wrażliwy na moment spadku.
- Reguły nie zmieniono: łagodzenie wariantu B to zmiana projektu z planu — czeka na decyzję (łagodniejszy spadek 3–8% / zostawić jako zamierzony koszt / seria 24 gier).
- **PanDa 12/12:** zgodne z mechaniką parabanku z 0.11 (upadek zawsze, termin ukryty 3–8 kw.); przy Chinach scenariusz jest przewidywalny. Opcja: szansa przetrwania (np. 30%) — czeka na decyzję.
- **Odmowy forexu:** powód ustalony — „najmniejsza pozycja to 1000 zł”: fundusz w symulacji ma 2–2,5 tys. zł aktywów, więc 40% to < 1000 zł. Artefakt presetu, nie błąd.
