# Audyt planów serii 0.16.x i kolejnych (2026-10-25)

Planowanie wersji 0.16 „Giełda międzynarodowa” (4 podwersje) oraz 0.17–0.21.

- **Stan:** po 0.15.3 (testy 596/596), kontrole `raporty/kontrola_0.15.2.md` i `kontrola_0.15.3.md`.
- **Źródła:** wyłącznie pliki planistyczne: `plan_0.16_gielda_miedzynarodowa.md` (szkic i zgłoszenia), `pomysly_na_kolejne_wersje.md`, `roadmap.txt`, `plan_0.13-0.16_mapa.md`, `plan_0.15.3_kryzysy.md`, `audyt_planow_0.15.x.md`. **Kod nie był czytany** — stan kodu opieram na tabelach „Punkt wyjścia” w tych planach i raportach; przed każdą częścią implementujący czat sprawdza go w kodzie.
- **Metoda (jak w audycie 0.15.x):** zbiórka pomysłów → audyt krytyczny → ocena designu → decyzja użytkownika.

---

## 1. Zbiórka pomysłów (wszystko, co trafia do 0.16+)

| # | Pomysł | Źródło | Rozmiar |
|---|---|---|---|
| 1 | Waluty, kantor, ryzyko walutowe | szkic G1 | M |
| 2 | Rynki i spółki zagraniczne (10 krajów, ok. 127 spółek) | szkic G2 | XL |
| 3 | Otwieranie regionów: Gigant, lotnisko i bilety, łączenie giełd | szkic G3 | L |
| 4 | Nowe sektory i spółki specjalne, Waschmabank, PanDa Bank | szkic G4 | L |
| 5 | Prezesi krajowi, boty zagraniczne | G5, G6 | M |
| 6 | Forex z dźwignią | G7 | M |
| 7 | Zarażanie kryzysów między krajami | decyzja 0.15.3 | M |
| 8 | Próg wezwania i nadzór za granicą | zgłoszenie z 0.15.1 M5 | S |
| 9 | Porządki w spółkach polskich (G0 szkicu) | szkic | S |
| 10 | Giełda towarowa (9 surowców; na start 6 — decyzja 2026-10-25) | zgłoszenia | L |
| 11 | Transport morski, lotniczy, lądowy; porty i lotniska; Logistyka | zgłoszenia | L |
| 12 | Łańcuchy produkcyjne (wydobycie → huta → fabryka → spedycja → konsumpcja) | zgłoszenia | XL |
| 13 | Cła, WTO, doktryny handlowe, embarga, unie celne | zgłoszenia | L |
| 14 | Podwójne notowanie | zgłoszenie | M |
| 15 | Córki zagraniczne (zmiana limitu córek) | zgłoszenie | M |
| 16 | Bot Graham (inwestor wartościowy), bardziej odrębny „Wilk” | zgłoszenia | M |
| 17 | Rynek pracy 2 (inkubator, podkupowanie inwestorów) | pomysły, mapa | M |
| 18 | Przejęcia od strony kupującego | audyt 0.15.x | M |
| 19 | Otwarte sprawy kontroli 0.15.2/0.15.3 | raporty | S |

## 2. Audyt krytyczny

### 2.1. Co już istnieje (nie budować od zera)

| Szkic mówi | Stan |
|---|---|
| PanDa Bank to nowy parabank | **jest parabank** (0.11, 0.11.5) — tylko dane spółki |
| Podsektory i nisze (Półprzewodniki, Farmaceutyki, TV, Wywiad) | **są** (0.14 T2, T3); 0.16 dopisuje tylko Przemysł ciężki, Słodycze, Herbata, Piwowarstwo, Premium |
| Transport i logistyka z Lotnictwem i Logistyką | **jest** w rejestrze `SECTORS` (0.14 T1a); brakuje morskiego i lądowego, więc 0.17 dopisuje podsektory zamiast nowego sektora |
| Szoki sektorowe jako stan, 5 linii, scenariusz startowy | **jest** (0.15.3): zarażanie krajów i szoki podażowe to rozszerzenie `crisisLine` i `sectorShocks[]`, a nie nowy silnik |
| Przejęcia z obcym inicjatorem | silnik `ma.js` (7 etapów, arbitraż, próg wezwania 0.15.1) — wystarczy obcy inicjator |
| Przetargi budowlane (lotnisko, porty) | **są** (`city.js`, PPP) |
| Podkupowanie specjalistów i prezesów | **jest** (0.13 S3) — Rynek pracy 2 rozszerza, nie powtarza |
| Stan nastroju per rynek | **jest** (`marketRegimes`) |
| Gaming | profil i technologie są, **spółek brak** |
| Kraje startowe | `START_COUNTRIES` ma 9 krajów, **brak Tajwanu i Francji** |

### 2.2. Za duże

- **Szkic 0.16 to ok. 22 części, 127 spółek, 10 walut, 10 botów, forex, lotnisko, trzy rodzaje łączenia giełd.** Jedna wersja nie da się przetestować ani zmierzyć (zapis, czas kroku, GIG).
  - **Rozwiązanie:** 4 podwersje, każda z własnym pomiarem, w kolejności rosnącego ryzyka: waluty i kantor (bez nowych krajów) → 3 kraje → Europa i łączenie giełd → Azja i forex.
- **Pełny graf łańcuchów produkcyjnych** (zgłoszenie 12) to model zapasów i przepływów dla wszystkich sektorów, większy niż 0.16. **Decyzja użytkownika: pełny graf.** Realizacja: osobna wersja 0.18 w dwóch krokach (pilotaż 3 łańcuchów i bramka, potem reszta).
- **Zgłoszenia 10–13 razem** to dwie wersje (surowce i transport; łańcuchy; handel) — trzy wersje (0.17, 0.18, 0.19).

### 2.3. Wzajemnie się wykluczają lub nakładają

| Para | Konflikt | Rozstrzygnięcie |
|---|---|---|
| **Kwit GDR (Gigant, G3)** vs **podwójne notowanie (zgłoszenie 14)** | dwa sposoby na „spółka na dwóch giełdach”; podwójne notowanie wymaga jednej puli akcji z dwoma kursami (ryzyko niezmiennika akcji w obrocie) | GDR jako **instrument pochodny** (float 1:1) w 0.16.1; pełne podwójne notowanie w 0.20 |
| **Córki zagraniczne (15)** vs **limit kraju 1,5 × startowa** | córka za granicą liczy się do limitu obcego kraju, a spin-off ponad limit tylko jako carve-out | decyzja w 0.20, po otwarciu rynków |
| **Wariant B (obca giełda przejmuje naszą)** vs **limity i waluta rozliczeniowa** | zmienia walutę nowych notowań | wariant B dopiero w 0.16.3, kiedy waluty i kraje są zmierzone |
| **Zarażanie krajów** vs **budżet częstości linii z 0.15.3** | kraje mogłyby mnożyć linie i przywrócić dryf premii | **jeden budżet** linii światowych (1%/kw. po ≥ 12 kw. spokoju, 40% krachów); nie osobno per kraj |
| **Forex z pozycjami krótkimi** vs **odrzucone CFD i krótka sprzedaż** | spójność reguł gry | krótkie pozycje **tylko w parach walutowych**; akcji nie dotyczy |
| **Przejęcia obce (G3b)** vs **limit krajowy 110** | obcy inicjator zmniejsza liczbę spółek krajowych | to zwalnia miejsce (dozwolone), nie psuje limitu |
| **Bilety dla botów** vs **boty zagraniczne** | bot dostaje dostęp do rynku dopiero po bilecie | bot kupuje bilet wg reguły (gotówka ≥ 3 × cena) — G7, G8 |
| **Sektor Alkohole (nowy) vs istniejące „Żywność”** | podsektor Piwowarstwo w Żywności (0.14) czy w Alkoholach | podsektor Piwowarstwo i napoje w Alkoholach (załącznik C planu 0.16), Słodycze i Herbata w Żywności |

### 2.4. Ryzyka dla balansu i rozmiaru

| Ryzyko | Skala | Zabezpieczenie |
|---|---|---|
| **Regresja wyceny przez `toPln`** | największe ryzyko całej serii (NAV, ranking, podatki, niezmienniki) | G2b przed każdą obcą walutą, test tożsamości, osobny commit |
| **Rozmiar zapisu** | dziś ≈ 15 KB na spółkę (do potwierdzenia w G0); 127 spółek = ok. +1,9 MB, czyli 3 kraje ≈ +9% na kraj bez ograniczeń | zapis uproszczony (historia 25%, bez pól wyliczalnych; cel ≤ 6 KB/spółkę), definicje w kodzie, kraje w transzach, **druga redukcja po pomiarze** (decyzja użytkownika: część ograniczeń od razu, potem test) |
| **Czas kroku** | 1,4–3,2 s/kw. przy ×200 dziś; 10 krajów to ok. 2× spółek | mniej częste aktualizacje małych spółek zagranicznych; cele: +12% / +25% / +40% |
| **Dryf premii** | zarażanie i korelacja mogą obniżać średnią | wspólny budżet linii; cel −3…+3% w kontroli |
| **Pewny zysk z kantoru** | powrót do średniej w widełkach to przewidywalny zysk | dryf średniej, szum, spread; miara „kup nisko / sprzedaj wysoko” ≤ lokata + 4 pp |
| **Fundusz = GIG** | dryf udziałów +9…10%/rok w 20 latach (odziedziczony) | G0b: diagnoza i pułap napływu; bez tego pomiary 0.16.x byłyby zanieczyszczone |
| **Pełny graf ogniw (0.18)** | zmienia marże wszystkich sektorów; sprzeczność z zasadą 0.13 „marżę wyznacza profil sektora” | graf jako **odchylenie o średniej zero** od profilu, pilotaż 3 łańcuchów, bramka |
| **Opóźnienie z kodu i testów** | ok. 25–45 testów na podwersję | grupy testów na podwersję, ×200 zamiast ×1 |

### 2.5. Otwarte sprawy z kontroli 0.15.2 i 0.15.3 — gdzie trafiają

| Sprawa | Gdzie |
|---|---|
| Dryf liczby udziałów w 20 latach (`fundusz-gig`) | **G0b** (diagnoza, pułap napływu) |
| Bessa z lock-upem, misje IR, VIP | **G0a** (preset `gracz-aktywny`) |
| Kalibracja mandatów (naruszenia ≤ 30%) | **G0c** |
| Upadki wg dźwigni, sektory zyskujące, stopy w linii, 5 gier na linię | **G0a** |
| Odstępstwa 0.15.3 (debiuty startupów w bańce internetowej, dźwignia botów w Czarnym czwartku) | **G0d** (dokończyć albo skreślić) |
| Ikony linii kryzysu jako SVG | **zlecenie dla czatu designu** (0.16.1, punkt 4), razem z flagami i ikonami walut |
| Karty „Kampania”, „Relacje”, „VIP” (zakładka Relacje) | zostaje w zleceniu designu 0.15.2; bez blokowania 0.16 |
| Interwencje państwa w 0.15.3 uproszczone (bez PPP z `city.js`) | **0.17** (porty i lotniska przez przetargi) |

## 3. Ocena designu (design manager)

- **0.16.1:** jedno okno kantoru, zakładka „Obce” zamiast osobnych tabel, wiersz w karcie spółki. Obciążenie niskie.
- **0.16.2:** zakładki rynków z flagą i walutą (tabela główna jest już za długa), karta kraju, zakładka Miasto z lotniskiem. Obciążenie średnie.
- **0.16.3–0.16.4:** okno połączeń giełd, panel forexu. Okna z pauzą gry tylko dla wydarzeń (Gigant, połączenie giełd).
- **Wymogi 0.14.5:** kolor nigdy jedynym nośnikiem, bez nowych okien modalnych poza wydarzeniami.
- **Grafika:** flagi i ikony walut jako SVG; ikony linii kryzysu (zaległość 0.15.3) i animacja samolotu — zlecenie dla czatu designu.

## 4. Decyzje (użytkownik, 2026-10-25)

| Decyzja | Wybór |
|---|---|
| Podział 0.16 | **4 podwersje** |
| Pierwsze kraje | **DE, US, CZ** |
| Dryf udziałów w 20 latach | **diagnoza i pułap napływu** (cel ±3%/rok zostaje) |
| Kolejność po 0.16 | **0.17 Surowce i transport** |
| GDR i dual listing | **GDR jako instrument pochodny**, dual listing później |
| Łańcuchy produkcyjne | **pełny graf ogniw** (zamiast wersji lekkiej, którą rekomendował planista) |
| Graham i Wilk | **0.16.3, osobna część** |
| Rozmiar zapisu | **część ograniczeń od razu, potem test, w razie potrzeby redukcja** |

**Konsekwencja wyboru pełnego grafu:** wersja 0.18 jest dwustopniowa (pilotaż 3 łańcuchów, potem pozostałe), a handel światowy (cła, WTO, embarga) przechodzi na 0.19, bo taryfy mają sens dopiero na przepływach z grafu.

## 5. Wynik

**Zatwierdzone plany:** `plan_0.16_gielda_miedzynarodowa.md` (G0–G22, cztery podwersje), `plan_0.17_surowce_transport.md`, `plan_0.18_lancuchy_produkcyjne.md`; mapa i lista pomysłów zaktualizowane (0.19 Handel światowy, 0.20 Globalne korporacje, 0.21 Rynek pracy 2 — szkice w mapie).

**Odrzucone lub odłożone** — w `pomysly_na_kolejne_wersje.md`: pełne podwójne notowanie i córki zagraniczne (0.20), przejęcia od strony kupującego (0.20), hierarchia dóbr konsumpcyjnych (0.18 część druga), mapa szlaków (0.18, design).
