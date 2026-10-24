# Kontrola 0.15.3 „Wielkie Kryzysy” (2026-10-24)

- **Kod:** gałąź `claude/funny-villani-16217c` (po 0.15.2), części W0–W6 w commicie `24d73c6`, strojenie i sondy w commicie z tym raportem. Nowy moduł `crises.js`; haki w `core.js`, `companies.js`, `main.js`, `ui.js`, `index.html`.
- **Plan:** `plany/plan_0.15.3_kryzysy.md`.
- **Testy:** `tests/tests.html` — nowa grupa „0.15.3” (26 testów); razem z 0.15.2 **596/596**. Dwa testy krachów z 0.15.0.1 (C5b) liczą krachy bez zastępowania ich linią (stub `maybeReplaceCrashWithCrisisLine`).
- **Przebiegi** (×200): presety `kryzys-banking|dotcom|oil|black|pandemic` (scenariusz startowy W4 na bazie `fundusz-gig`, 3 gry × 10–11 lat na linię), 8 gier × 6,5 roku i 3 × 20 lat bez presetu, 3 × 20 lat `fundusz-gig`. Licznik sygnałów (`crisisState.signals`) i zwykłych szoków makro tego samego typu (`spurious`).

## Co zrobiono

| Część | Zakres |
|---|---|
| W0 | **Naprawa B5:** `sectorShocks[]` (premia docelowa, narastanie, trwanie, wygasanie liniowe), suma z bańką w `updateAllSectorPremiums`, limit −60%…+150%, udział segmentu (konglomerat mniej wystawiony), spadek przychodów sektora w linii w kwartale (`getCrisisRevenueFactor`), przeżywa zapis. `applySectorShock` zachowuje stary podpis |
| W1 | silnik `crisisLine`: Zapowiedź (z sygnałem) → Wybuch → Zarażanie → Interwencja → Dno → Odbicie; częstość 1%/kw. po ≥ 12 kw. bez krachu i linii (licząc od startu gry), 40% wylosowanych krachów zastępuje linia (bez Zapowiedzi), linie bez powtórzeń, w linii bez nowych krachów i baniek; upadki 1–3 (ranking dźwignia 50% + kondycja 30% + wystawienie 20%, bez spółek Skarbu Państwa; sygnał: kondycja −3,5 przy Wybuchu; co najmniej jeden upadek albo ratunek do Dna) |
| W2 | 5 linii: kryzys bankowy (2008), bańka internetowa (2000), szok naftowy (1973), Czarny czwartek (1929), pandemia (2020) — sektory tracące i zyskujące z premiami i przychodami, krach z tematem (Czarny czwartek: dno premii −40…−60% poza dnem −35%, pułap premii −25% malejący przez Odbicie = kształt L), Recesja wymuszona na czas Zarażania i Interwencji, inflacja +2…+4 pp w szoku naftowym |
| W3 | stopy wg linii (`getCrisisRateChange` w posiedzeniu RPP): cięcia, **podwyżki w stagflacji (1973)**, zwłoka 2 kw. potem cięcia (1929), pandemia do 0,5%; ratunek banku z budżetu państwa (dokapitalizowanie z kasy skarbu, gdy skarb wystarcza), dopłaty/programy dla Transportu, Budowlanego, Turystyki i Usług ze skarbu (skarb może wejść w deficyt), maile NBP |
| W4 | lista „Kryzys w grze” na ekranie startu (Losowo / jedna z 5 linii w kw. 5–16, potem linie losowe), wpis w CV |
| W5 | nagłówek w pasku newsów na każdym etapie, mail z retrospektywą, sekcja „Kryzys” w oknie „Rynek” (etap jako oś, sektory z premiami, reakcje), wiersz „Wystawienie na kryzys” w karcie spółki (tylko w trakcie linii) |
| W6 | 8 haseł Akademii (5 linii + Stagflacja, Kształty odbicia, Ratowanie banków), 6 osiągnięć |

## Wyniki

| Miara | Cel | Wynik | Stan |
|---|---|---|---|
| Linie na 20 lat | 1–2 | 2 / 1 / 1 (śr. 1,3; 3 gry) | ✅ |
| ≥ 1 linia w grze 6,5-letniej | 25–45% | 3 z 8 gier (38%): jedna zakończona, dwie w toku | ✅ (mała próba) |
| Krachy + linie na 20 lat | 1–3 | 3 / 1 / 2 | ✅ |
| Średnia premia rynku (20 lat, bez presetu) | −3…+3% | −2,4 / −3,1 / +0,5% (przed zmianą 0.15.1: −4,2…−3,4% na `fundusz-gig`) | ✅ (jedna gra tuż poza granicą, w szumie) |
| Spadek GIG: bankowa | 30–50% | −37 / −30 / −36% (i −33%) | ✅ |
| Spadek GIG: internetowa | 20–40% | −33 / −49 / −33% (po strojeniu: krach 16–24 pp zamiast 12–18) | ⚠️ jedna gra −49% |
| Spadek GIG: naftowa | 15–30% | −27 / −13 / −25% (i −31, −19, −14%) | ⚠️ dolna granica |
| Spadek GIG: Czarny czwartek | 40–60% | −56 / −58 / −53% (pułap −20%); −44 / −39 / −50% (pułap −25%) | ✅ |
| Spadek GIG: pandemia | 20–35% | −22 / −31 / −29% (i −21, −25, −25%) | ✅ |
| Czas do odzyskania szczytu GIG | pandemia ≤ 6 kw.; Czarny czwartek ≥ 12 kw. | pandemia 5 / 6 / 6 kw. ✅; Czarny czwartek 15 / 9 / 12 kw. (pułap −25%; wcześniej 6–12) | ⚠️ mediana 12, rozrzut 9–15 |
| Upadki w linii | 1–3 | 0 w jednej grze przed strojeniem; po dodaniu gwarancji do Dna: 1–3 w każdej (bankowa 1–3 + 1 ratunek, internetowa 1–2, naftowa 1–2, Czarny czwartek 1–3, pandemia 1–2 + ratunek spółki państwowej) | ✅ |
| ≥ 70% upadków z górnych 25% dźwigni | ≥ 70% | **niezmierzone w przebiegach** (ranking sprawdzony testem) | ⚠️ |
| Sektory zyskujące ≥ GIG + 10 pp w linii | ≥ 70% gier | **niezmierzone** | ⚠️ |
| Sygnały bez linii (fałszywe alarmy) | ≥ 50% | na 1 sygnał linii przypada 3–16 zwykłych szoków makro tego samego typu (≥ 75%) | ✅ |
| Stopy wg linii | kierunek zgodny w 100% | testy jednostkowe (cięcia / podwyżki / zwłoka); **nie zbierane w przebiegach** | ✅ (test) |
| Fundusz = GIG: udziały, zaufanie | jak w 0.15.0.1 | patrz kontrola 0.15.2: ten sam odziedziczony dryf w 20 latach także na kodzie 0.15.1 | ⚠️ odziedziczone |
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 | 0 / 0 / 0 we wszystkich przebiegach (łącznie ok. 45 gier) | ✅ |
| Zapis i wczytanie (linie w toku) | bez strat | wszystkie `saveCheck` OK (także z linią w toku); test jednostkowy zapisu: linia w etapie Zapowiedź i szoki (nie każdy etap osobno) | ✅ |
| Czas kroku | +≤ 2% | 1,4–3,2 s/kw. bez presetu, bez zmiany względem 0.15.1 | ✅ |

## Odstępstwa od planu i otwarte sprawy

1. **Dźwignia botów w Czarnym czwartku:** plan: „Euforia z dźwignią botów > 40%”; kod wymaga tylko Euforii i premii > +25% (dźwignia botów nie jest dostępna jako prosta miara). Linia i tak jest rzadka: w naturalnych grach nie wystąpiła ani razu (wymaga Euforii z premią > +25%).
2. **Przychody całej gospodarki −10% (1929)** nie jako osobny efekt: tylko spadki przychodów sektorów z tabeli (Bankowość, Finanse, Przemysł, Budowlany, Nieruchomości).
3. **Debiuty startupów 3× rzadziej (bańka internetowa)** nie wdrożone.
4. **Pandemia: Media (Rozrywka)** jako cały sektor Media; wyjątek „Nieruchomości bez Magazynów” — Magazyny dostają osobny, dodatni szok (+35%), co daje saldo ok. +15%.
5. **Ikony linii** to emoji w nagłówkach, mailach i Akademii (plan: SVG zamiast emoji, decyzja użytkownika) — do wykonania przez czat designu razem z nową zakładką; sekcja „Kryzys” jest w oknie „Rynek” wymagającym Analityka Indeksowego L5 (jak w planie), więc niżej-poziomowy gracz widzi tylko nagłówki i mail.
6. **Interwencje państwa** są uproszczone do dopłat z kasy skarbu dla spółek (3% kapitalizacji) i dokapitalizowania banku; nie ma osobnych zamówień PPP z `city.js` (Czarny czwartek: „program robót publicznych” = dopłaty dla Budowlanego).
7. **Pomiar niewykonany:** ranking dźwigni upadłych (≥ 70% z górnych 25%), wyniki sektorów zyskujących, kierunek stóp w przebiegach, 5 gier na każdą linię (zrobione 3), 20 + 20 gier 6,5-letnich (zrobione 8) — ograniczenie czasu; wyniki orientacyjne.
8. **Premia w scenariuszu Czarnego czwartku** to −6…−13% (średnia z 11 lat z linią) — to oczekiwane, bo linia obejmuje 2 lata dna; w naturalnych 20-letnich grach średnia mieści się w celu.
