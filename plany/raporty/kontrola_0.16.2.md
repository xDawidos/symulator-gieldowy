# Kontrola 0.16.2 „Pierwsze rynki” (2026-10-28)

- **Kod:** gałąź `claude/impl-0162-254f7c` (od `e37ffb1` = 0.16.1 + plan 0.16.5, nie scalona, nie wypchnięta). Nowe moduły: `countries.js` (platforma, tickety, boty, zarażanie), `countries_data.js` (DE, US, CZ), `countries_ui.js` (lotnisko, zakładka Rynki); haki w `core.js`, `crises.js`, `currency.js`, `currency_ui.js`, `gdr.js`, `main.js`, `player.js`, `ui.js`, `index.html`, `tests/*`.
- **Testy:** 766/766 (733 dotychczasowych + 33 nowych w grupie „0.16.2”). Zmiany w starych testach: liczba sektorów 18 → 20 (dwa asserty) i test Komendanta Jakuba (zależał od przypadkowego stanu bota po wcześniejszych testach; dostał czysty start).
- **Zapis:** v16, pole opcjonalne `countries` (kraje, uproszczone spółki, posiadacze, nastroje, bilety, lotnisko); boty zagraniczne zapisują się razem z `aiCompetitors`; linia w drodze (`pendingImport`) w `crisisState`. Numer wersji bez zmian; zapis bez pola wczytuje się bez krajów (test).
- **Pomiar:** `tests/przebiegi.html` ×200, presety `kraje` i `kraje-gig` (DE, US, CZ otwarte od startu), sonda `countries` (kraje, indeks kraju, korelacja kwartalna z GIG, bajty zapisu, pochodzenie linii, boty), skrypt `plany/design/narzedzia/podsumuj_kraje.mjs`. Surowe serie (po 2,6–3,7 MB, poza repozytorium): `side-session-notes/local_e077a0e4-463c-4058-b6a4-76362763461e/serie_0162/` (`*_0162.json` obecny kod, `b65g*_0161.json` baza 0.16.1).

## Co zrobiono

| Część | Zakres | Commit |
|---|---|---|
| G5 | Platforma: `COUNTRY_DEFS` w kodzie, operator i prowizja, stopa kraju (powrót do średniej, wpływ na kurs i wycenę), `marketRegimes[kraj]` skorelowane z PL, limit 1,5 × liczba startowa, zapis uproszczony (cena, 13 punktów historii, posiadacze), pakiet państwa poza floatem i licznik skarbu kraju, zamiana GDR giganta 1:1 w akcję, niezmienniki | `99de2c2` |
| G6a | Sektory Motoryzacja (Przemysł i surowce) i Alkohole (Konsumpcja, podsektor Piwowarstwo i napoje): profil, nazwy, elastyczność popytu | `4f05707` |
| G6b–d | Niemcy 13 + 3, USA 15 + 4, Czechy 8 + 1 (załącznik B), modyfikatory spółek specjalnych (obronność, Pear, lato, zmienność, sezon), banki w sektorze Bankowość | `0973a2c`, `fb32cbb`, `2b16a61` |
| G7 | Lotnisko = megaprojekt „Port lotniczy” (miasto zleca, wykonawca budowlany); bilet każdego inwestora osobno, od 1000 zł (5% przepustki), prowizja 0,6%; kupno przez gotówkę walutową, potem kantor; pierwszy bilet otwiera giełdę kraju; bonus dla Turystyki; zakładka Lotnisko w oknie Miasto | `4b6c6c0` |
| G8 | Santos (USA), Kozel (Czechy, 20% rezerwy), niemiecki wieloryb: gotówka w walutach, limit 50% w 1. roku, 4 transakcje na kwartał, wejście Santosa na rynek PL | `df80147` |
| G9 | Linia kryzysu z polem `origin`: ok. 25% zaczyna się w kraju otwartym, do PL dociera po 0–2 kw.; linia z PL dociera do krajów (ρ × sektor, cel premii); szok sektorowy z polem `country`; jeden budżet częstości; sekcja Kryzys z krajami | `4b68659`, poprawka testu |
| G10 | Zakładka Rynki zagraniczne w Kantorze (zakładki krajów z flagą i walutą, karta kraju), sondy w przebiegach, strojenie szans otwierania krajów, ten raport | ten commit i poprzednie |

**Rozdzielenie pod 0.16.5:** logika biletów i dostępu (`getTicketPrice`, `hasTicket`, `canTradeCountry`, `buyTicket`, `buyForeignShares`) jest w `countries.js` bez DOM; wyświetlanie to osobna funkcja `renderAirportWindow(idKontenera)` w `countries_ui.js` (dziś zakładka Miasto → Lotnisko). Strona „Ferie i wakacje” wywoła tę samą funkcję; haczyk animacji to zdarzenie `ticket-flight`. Okno kantora (kursy) jest osobno, więc przejdzie do „Kantory24”.

## Wyniki (tabela „Jak sprawdzimy”)

Serie: 20 × 6,5 roku bez presetu (`k65n_0162`; wcześniejsza próba przed strojeniem `k65_0162`: GIG 11,1%), 20 × 6,5 `kraje-gig` (dwa powtórzenia `k65kg_0162`, `k65kg2_0162`), 10 × 20 lat `kraje-gig` (`k20kg_0162`) i `fundusz-gig` z naturalnym dołączaniem krajów (`k20n_0162`), kontrola: ten sam test na kodzie 0.16.1 (`b65g_0161`, `b65g2_0161`, osobny worktree) i na obecnym kodzie bez krajów (`k65g_0162`).

| Miara | Cel | Wynik | Stan |
|---|---|---|---|
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 | 0 w 140 grach obecnego kodu (+1 ostrzeżenie „pieniądze znikąd” w jednej z 20 gier 20-letnich, jak w 0.16.1; w serii bazowej 0.16.1 jedna gra z ujemną gotówką) | ✅ |
| Testy | 733 + nowe | 766/766 | ✅ |
| GIG 6,5 r. bez presetu | ±1 pp | 11,0% (0.16.1 raportowało 9,7%) | ⚠ w szumie (patrz niżej) |
| GIG 6,5 r. z krajami (`kraje-gig`) | ±1 pp | 13,2% i 9,6% w dwóch seriach; baza 0.16.1 w tych samych warunkach 10,6% i 13,2%; obecny kod bez krajów 9,4% | ⚠ w szumie (rozrzut median dwóch serii tej samej konfiguracji: 3,6 pp) |
| GIG 20 lat | ±1 pp | 13,6% (`kraje-gig`) i 14,0% (bez presetu krajów, naturalne dołączanie) vs 13,1% w 0.16.1; odziedziczone 13–14% | ✅ |
| Marża końcowa | ±0,5 pp | 6,5 r.: 21,8 (bez presetu), 23,0 i 22,0 (`kraje-gig`) vs 22,1; 20 lat: 21,5 i 21,7 vs 21,0 | ⚠ jedna seria +0,9 pp, druga w normie |
| Korelacja kwartalna z GIG | 0,5–0,8 | 6,5 r.: DE 0,78, US 0,70, CZ 0,76 (kraje od startu); 20 lat: DE 0,77, US 0,60, CZ 0,68 | ✅ |
| Średnia premia rynku obcego (20 lat) | −3…+3% | test 12 × 20 lat: w granicach; w przebiegach 20-letnich koniec −3,8% (pojedynczy odczyt) | ⚠ |
| Linia z zagranicy dociera do PL w ≤ 2 kw. | 100% | test 240 prób: 100%; w 20 latach opóźnienia 1, 2, 0 | ✅ |
| Linie światowe razem | 1–2 na 20 lat | 7 i 10 linii w dwóch seriach po 10 gier 20-letnich (0,7 i 1,0 na grę), w tym 3 i 4 zagraniczne (43% i 40%, próba mała; test: ok. 25%) | ⚠ dolna granica celu (budżet 0.15.3 bez zmian) |
| Boty zagraniczne | ≤ 50% spółki w 1. roku | 0 naruszeń; limit w teście i niezmienniku (maks. 60% później) | ✅ |
| Zapis: 6,5 r. z 3 krajami | < 3 MB | mediana 2,29 MB (znaki JSON) | ✅ |
| Zapis: kraje | ≤ 6 KB na spółkę | 9,4 KB na 45 spółek po 6,5 r. (ok. 210 B na spółkę); 11,9 KB po 20 latach | ✅ |
| Zapis: 20 lat z 3 krajami | ≤ +15% | 3,74–3,75 MB w znakach; część krajów (11,9 KB) to 0,3% — baza 20 lat na tym samym kodzie bez krajów niezmierzona | ✅ (przyrost krajów), ⚠ (brak bazy) |
| Czas kroku (3 kraje) | +≤ 12% | 1320 i 1241 ms vs 1198 i 1201 ms (kod 0.16.1, równolegle) = +10% i +3%; 20 lat: 1613 / 1690 ms | ✅ (maszyna obciążona, rząd wielkości) |
| Dołączone kraje w 6,5 roku | 2–4, nie wszystkie od razu | bez presetu (po strojeniu): średnio 1,3, rozkład 0/1/2/3 = 5/7/5/3; lotnisko stoi w 18/20; mediana pierwszego otwarcia kw. 22. W 20 latach: 3 kraje w 10/10 grach (mediana kw. 25 dla ostatniego) | ⚠ w 6,5 roku mediana 1 (cel 2–4) |
| Fundusz = GIG: udziały, zaufanie | ±3%/rok, 45–55 | `kraje-gig`: udziały −7,6% / zaufanie 58 (6,5 r.), −5,3% / 59 (20 lat) — dryf odziedziczony | ⚠ |

**GIG — dlaczego „w szumie”.** Trzy powtórzenia tej samej konfiguracji (`fundusz-gig`, 20 × 6,5 r.) dały mediany: kod 0.16.1: 10,6% i 13,2%; `kraje-gig`: 13,2% i 9,6%; `kraje-gig` bez wejścia Santosa na rynek PL: 11,7%. Rozrzut median jednej konfiguracji (3–4 pp) jest większy niż różnice między konfiguracjami, więc nie ma dowodu na wpływ krajów, nowych sektorów ani zakupów Santosa. Pierwsza seria sugerowała +2,6 pp (13,2% wobec 10,6%) — powtórzenie ją odwróciło. Rozstrzygnąć można tylko serią kilkukrotnie dłuższą niż 20 gier.

## Pominięte i problemy

1. **Spółki zagraniczne są uproszczone i nie są w tablicy `stocks`.** Mają cenę w walucie, sektor, krótką historię i posiadaczy — bez bilansu, segmentów, pracowników, dywidend (zwrot w cenie), raportów, upadłości i przejęć. Nie wchodzą do rankingu spółek, kapitalizacji GIG/SIG, ETF-ów, mandatów, zastawu, M&A, progu wezwania i KNF. „Upadłości i wchłonięcia zwalniają miejsce” oraz spin-offy zagranicznych spółek: pominięte; limit 1,5 × działa tylko dla debiutów (nowa spółka z nazwą z generatora, bez opisu).
2. **Profil kraju dla pracowników (załącznik B)** jest tylko danymi (`labour`) i wierszem w karcie kraju. Model pracowników 0.13 nie obejmuje spółek zagranicznych.
3. **Spółki państwowe:** pakiet 50% poza floatem i licznik „skarbu kraju” (2% rocznie od wartości pakietu, tylko wgląd); obce państwo nie korzysta z `governmentTreasury`. Brak prywatyzacji i wpływu państwa na kurs.
4. **„Gigant na wyższym poziomie giełdy”** — bez znaczenia: kraje zagraniczne nie mają poziomów giełdy (to model krajowy).
5. **Spółki specjalne:** tylko opisowe lub proste modyfikatory (dryf, zmienność, premiera Pear co rok, sezon, lato). Obronność (Palant-YR, Panzerwafel, MetallRai, Lotos) ma stały dryf +4%/rok, bez powiązania z wydatkami na obronność. Opisy BMV i „premium” Sternwagen są tekstowe. Waschmabank i PanDa Bank — 0.16.3 i 0.16.4.
6. **Lotnisko** to istniejący megaprojekt miasta (konsorcjum i wykonawca budowlany), nie `createTender`; miasto samo go zleca (30% na kwartał od kwartału 4), ale budowa trwa ≥ 8 kw. plus zapisy, więc w 6,5 roku kraje otwierają się późno (mediana pierwszego otwarcia: kw. 22). **Cena biletu** to 5% przepustki (min 1000 zł), nie sama przepustka; bilet jest bezterminowy (ważność w 0.16.5). Boty krajowe kupują bilety tylko po to, by otwierać kraje; nie handlują zagranicą (wejście na rynek obcy ma tylko gracz i boty zagraniczne).
7. **Wydarzenie „bot z innego kraju wchodzi na rynek kraju startowego”** zrealizowane jako wejście Santosa (1–3 kw. po dołączeniu USA); osobnego funduszu zagranicznego nie ma. Santos kupuje polskie spółki losowo, a jego zakupy podbijają kurs do 2% na transakcję (mechanizm `aiBuyStock`).
8. **Boty:** bez `makeAiDecision`, handel raz na kwartał (≤ 4 transakcje). „Idealnie wg fundamentów” = najtańsza względem własnej średniej (obce spółki nie mają fundamentów). Kozel kupuje DE tylko z biletem (nie kupuje go sam). Majątek bota liczy akcje zagraniczne w `calculateNetWorth`; nie ma raportu bota ani ich relacji z graczem.
9. **Waluty w kryzysie** korzystają z istniejących flag „bezpiecznej przystani” (USD, CHF, JPY); EUR i CZK nie mają osobnej reguły. Opóźnienie zarażenia dotyczy kierunku zagranica → PL; w kierunku PL → zagranica efekt jest od razu (siła ρ).
10. **Interfejs bez czatu designu** (zlecenie 2 z planu): wygląd z komponentów 0.14.5, flagi i ikony walut z `flags.js`; **animacja samolotu niewykonana** — jest tylko zdarzenie `ticket-flight`. Zakładki Rynki i Lotnisko sprawdzone testami DOM (kontrola tekstu, kierunku ▲▼■, braku emoji), **bez wizualnej kontroli w przeglądarce**.
11. **Zmiana rejestru sektorów** (20 zamiast 18) przesuwa losowania w kraju startowym (cykle sektorów, ekspansje segmentów), więc porównania z bazą 0.16 nie są identyczne.
12. **Korelacja** liczona kwartalnie z krótkich serii (kraje dołączają późno); w przebiegach naturalnych wartości bywają wyższe (0,86 przy kilku kwartałach danych).
13. **Niezmierzone:** czas zapisu i wczytania, zapis ×1, baza 20 lat bez krajów na tym samym kodzie, liczba zdarzeń „Gigant” po zmianie, wpływ krajów na ranking botów, zachowanie interfejsu na urządzeniach mobilnych.
