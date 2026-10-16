# Mapa prac: od domknięcia 0.13 do 0.16

Jeden spójny porządek prac na wersje 0.13 → 0.16. Szczegóły są w planach źródłowych:
- `plan_0.13_spoleczenstwo.md`;
- `plan_0.14_struktura_spolek.md`;
- `plan_0.15_hossa_bessa.md`;
- `plan_0.16_gielda_miedzynarodowa.md` (dawniej 0.15; przesunięta 2026-10-14);
- `raporty/weryfikacja_0.13.1.md`.

Stan na 2026-10-13: etap A (domknięcie 0.13 i 0.13.1) zrobiony na gałęzi worktree (commity `ee91a58`, `2ab2c4e`, `441d5d5` i raport), do scalenia z `zmiany-AI`.

## Stan

| Wersja | Część | Stan |
|---|---|---|
| 0.13 | S1–S6 (kraj, pracownicy, rynek pracy, związki, ustawy, spięcie z grą) | ✅ kod: `77fdeb0`, `cf0d161`, `62478bb`, 21 testów. ✅ pomiar A2 (`441d5d5`): wszystkie miary w celu; po strojeniu Oszczędna +2,6 pp. ⚠️ otwarte: rozrzut TSR Wyzysku nie jest największy |
| 0.13.1 | B1–B13, D1/D2 (rynki internetowe, miękki limit), P1–P3 (sufity, „duchy posiadaczy”), decyzje 1–2, B5 | ✅ kod, testy 317/317. ✅ weryfikacja pełna (`raporty/weryfikacja_0.13.1.md`): OK z uwagami; decyzje balansu (zaufanie vs GIG, lokaty spółek) wdrożone |
| 0.14 | T0 (prędkości ×100/×200) | ✅ `117feec` |
| 0.14 | T1 (rejestr sektorów, segmenty, filtry) | ✅ `7af0d0b` (T1a+T1b), `5dcb464` (T1c), zapis v14; testy 330/330; zapis +0,005%, marża +0,35 pp, GIG +1,2 pp przy tych samych warunkach (szum) |
| 0.14 | T2 (podsektory, badania kliniczne, blok jądrowy, KNF) + decyzja 11 | ✅ `89a810d`…`1329525`; testy 345/345; 20+20 przebiegów ×200 vs T1: GIG 17,9 vs 17,8%, marża 24,45 vs 24,38%; badania kliniczne 3,9/przebieg, KNF 1,8, budowy bloków 0,15; zapis +0,03% |
| 0.14 | T3 (rozszerzenia, podsektory, nisze, pivot, dyskonto konglomeratu, decyzje) + decyzja 12 | ✅ `1859e47`…`7816984`; testy 364/364; 20+20 przebiegów ×200 vs T2: GIG 18,2 vs 18,6%, marża 25,1 vs 25,4%; rozszerzenia 3,7/rok, pivoty 1,5/rok, spółki z ≥ 2 segmentami 28%, budowy bloków 1,4/przebieg; zapis +0,1–0,24% |
| 0.14.1 | R0–R6 (pula startupów: rozliczenie, NAV, wypłata, panel; portfel prywatny; widok spółek giełda → poziom → sektor) | ✅ `9789f8d`…`e876a20` (scalone `a31cccb`); testy 398/398; 3+3 przebiegi ×200 vs T3: GIG śr. 1398 vs 1449 (szum), marża 0,281 vs 0,265, ostrzeżenia puli 0, zapis +0,3%. R5: premia 0,60, cel za cel min(5% budżetu; 1% aktywów × mnożnik; 3000 zł); ⚠️ cele R5 dla niższych stanowisk niespełnione (mały fundusz w symulacji), u CEO cele korporacji do 64% wpływów — wracamy w 0.15 H1 |
| 0.14.2 | P1 (instytuty: kurs z zysków, licencje √technologii), P2 (emisja ratunkowa per spółka) | ✅ `5a9108d`, `b98864d`, `e876a20`; instytuty po 3. roku 0,7–1,0× wartości godziwej, kurs ×13 w 12 lat; P2 odtworzone i naprawione (test „zapłata = przyrost akcji”) |
| 0.14.2 | P3–P10 (córki, nazwy, bank inwestycyjny, inwestycje wg sektora, pasek newsów, zwijane sekcje i fazy, wycena spółek specjalnych, ujemna gotówka) | ✅ `33a927b`…`271c339`; testy 423/423; 10+10 przebiegów ×200 vs `a31cccb` + 20 lat: ostrzeżenia bezpiecznika 0, ujemna gotówka 149 → 0, córki 100% unikalnych nazw / 81% w innym sektorze, DejwCorp ≤ 1, bank ≤ 12 pozycji i 0 poniżej 0,5%, dymki ≤ 3/min (0 ponad limit), zapis +0,1%. ⚠️ GIG 19,4 vs 17,3%/rok (+2,1 pp, ok. 1,6σ), marża 27,8 vs 24,4% (+3,4 pp, ok. 2σ) — skutek P9/P6/P10, do obserwacji; instytuty w 1.–2. roku ok. 0,25–0,3× |
| 0.14 | T4 (spin-off i carve-out) | ✅ `1019d33`, `1b89b4f`; testy 428/428; 10 przebiegów ×200: wydzielenia 1–3 na przebieg (śr. 2,1; carve-out 5/21), niezmiennik akcji 0 naruszeń, krajowe ≤ 87 / łącznie ≤ 104, GIG 19,0%, marża 27,7%, zapis +0,5%. ⚠️ suma matka + córka 2 kw. po wydzieleniu +14,8% (mediana +10,8%) vs cel 3–8% — zawiera wzrost rynku z 2 kw.; dolna granica 2 wydzieleń/przebieg nie zawsze (2× po 1) |
| 0.14 | T4 strojenie (decyzja 13) | ✅ szansa 5,25%/kw., pomiar ponad GIG (`gigBefore`/`gig2q` w `spinoffLog`); 10 przebiegów ×200: wydzielenia 2,8 na przebieg (1–5; 1 przebieg z 1), carve-out 8/28; suma matka + córka 2 kw. po vs przed zapowiedzią **ponad GIG −2,5% (mediana −4,1%, σ ok. 19 pp, błąd średniej ±3,7)**, bez korekty +14,8% (mediana +12,6%); skok przy zapowiedzi bez zmian (wynik nie jest powyżej celu); niezmienniki 0, ujemna gotówka 0, bezpiecznik 0, krajowe ≤ 88 / łącznie ≤ 106, GIG 18,4%, marża 26,5% |
| 0.14.2 | P11 (płynny pasek newsów), P12 (limit emisji JU przy niskim zaufaniu) | ✅ `d541d6e` (+ `6d0a53a` testy niezależne od widoczności karty), `697cd77`; testy 433/433. P11: kontrola w grze ×1 i ×50 — 0 skoków, ok. 1 px na klatkę, kolejka ≤ 15. P12 kontrola B5 (fundusz-gig, 10×200): zaufanie śr. 56,2 (przed P12 53,6), JU −7,4%/rok (przed P12 −4,7%, σ 11) — różnica w szumie; ⚠️ cel „JU ±3%/rok” nie był spełniony już przed P12 |
| 0.14 | T5 (koncerny 🏢, kooperacje, podmioty powiązane, skarga do KNF, karta „Grupa” z SOTP, 3 hasła Akademii) | ✅ testy 441/441 (8 nowych); 20 przebiegów ×200 vs 20 bez T5 (`697cd77` + strojenie T4): GIG 20,8 ± 0,8 vs 19,0 ± 0,7% (+1,8 pp, ok. 1,7σ), marża 27,2 vs 26,8%; kooperacje aktywne śr. z ostatnich 2 lat 6,4 (na koniec 2–16, śr. 7,5), zawarte 9,6 / zerwane 0,8 / wygasłe 0,9 / szoki kontrahenta 0,8 na przebieg; flaga podmiotów powiązanych 0–1 (tylko przy wspólnym właścicielu botów); niezmienniki 0, ujemna gotówka 0, bezpiecznik 0; krajowe ≤ 92 / łącznie ≤ 114; zapis 2,14 vs 2,16 MB. Strojenie: szansa kooperacji 0,25 → 0,5, przedłużenie 0,4 → 0,6, status koncernu do górnych 20%. ⚠️ koncerny śr. 2,4 (na koniec 0–5) vs cel 3–8 — pierwsze dopiero w 1.–5. roku (mało spółek z ≥ 3 segmentami w górnych 10%); ⚠️ znaczek 🏢 zamiast 🏛️ (🏛️ = Skarb Państwa, decyzja użytkownika) |
| 0.14 | T4 diagnoza efektu wydzielenia (decyzja 13) | ✅ raport `raporty/wydzielenia_0.14_T4.md`: wartość ginęła w carve-oucie (−17% ponad GIG; spin-off +9%) — wycena matki pomijała pakiet 51–80% w notowanej córce. Poprawka: wartość godziwa + rynkowa wartość pakietów w notowanych spółkach zależnych. Po poprawce 71 wymuszonych wydzieleń (preset `wydzielenia`, 20×200): **+5,0% ± 2,6 ponad GIG** (spin-off +5,1%, carve-out +4,9%), razem z 21 naturalnymi ok. +6,7% ± 2,3; GIG 20,4% (bez zmian), niezmienniki 0. ⚠️ od zapowiedzi do wydzielenia matka oddaje ok. 2–3% (dyskonto znika z wyceny dopiero przy wydzieleniu) — w celu, nie ruszane |
| 0.14 | Koncerny → 3–6 (decyzja 14) | ✅ próg kapitalizacji koncernu górne 10% → 15% (histereza 20% → 25%); 10 przebiegów ×200: koncerny na koniec śr. 3,7 (2–5), śr. z ostatnich 2 lat 3,0 (cel 3–6 ✅, dolna granica); kooperacje aktywne 7,5 (na koniec 4–15); GIG 18,9 ± 0,9%, marża 27,5%; niezmienniki 0, ujemna gotówka 0, bezpiecznik 0. Drugiego kroku luzowania nie było potrzeba |
| 0.14 | T6 (spółki zależne) + koncern od górnych 20% (decyzja 14, krok 2) | ✅ `ad1c213`; testy 447/447 (6 nowych). Transfer zysku 30–70%, pożyczka wewnątrzgrupowa (flaga przy nierynkowym oprocentowaniu), córki koncernów na BRONZE, usamodzielnienie (oferta wtórna / spin-off reszty), wchłonięcie ≥ 90% z przymusowym wykupem, sprzedaż pakietu kontrolnego z wezwaniem, karta „Grupa”, 3 hasła Akademii. Na przebieg: nowe córki 3,6 (cel 1–3 ⚠️), wchłonięcia 1,9, usamodzielnienia 1,5, sprzedaże 1,1 ✅ |
| 0.14 | Koncern: nowy warunek struktury (decyzja użytkownika po kontroli) | ✅ ≥ 2 segmenty, w tym niepowiązany z głównym (zamiast ≥ 3 segmentów), albo ≥ 2 córki; próg znów górne 15% (histereza 25%). 10×200: koncerny śr. z 2 lat 3,5, na koniec 4,0 (3–7) ✅, od 1. kwartału; kooperacje 9,1; GIG 20,8 ± 1,2%, marża 26,3%; liczniki błędów 0. ⚠️ nowe córki koncernów 6,5 i wchłonięcia 4,4 na przebieg — strojenie w kolejnym commicie |
| 0.14 | Strojenie T6 po nowym warunku koncernu | ✅ nowa córka koncernu 12% → 4%/kw. 10×200: nowe córki 2,2, wchłonięcia 1,8, usamodzielnienia 1,3, sprzedaże 1,4 ✅; kooperacje 8,5; GIG 22,2 ± 1,7%, marża 26,5%; liczniki błędów 0. ⚠️ koncerny wróciły do 2,7 (na koniec 2,5) — liczba koncernów zależy od liczby córek; do decyzji: próg 20% albo zakładanie córek ok. 7% |
| 0.14 | Decyzja 15.1: dywidenda córki dla wszystkich akcjonariuszy | ✅ `a7471d9`; testy 448/448; 10×200: GIG 19,8 ± 1,0%, marża 26,1%, liczniki błędów 0; koncerny 3,9 (te same ustawienia co `586ee8e`, gdzie wyszło 2,7 — rozrzut serii) |
| 0.14 | Decyzja 15.2: koncern także przy ≥ 2 segmentach i ≥ 1 córce | ✅ `db121a1`; testy 448/448; 10×200: koncerny śr. z 2 lat 4,7, na koniec 5,0 ✅ (3–6); kooperacje 12,8; nowe córki 3,3, wchłonięcia 2,2; GIG 19,6 ± 1,3%, marża 27,5%; liczniki błędów 0 |
| 0.14 | Decyzja 15.3: mniej córek koncernów, więcej rozszerzeń | ✅ `63d40a1`; testy 448/448; 10×200: nowe córki 2,2, wchłonięcia 1,6, usamodzielnienia 1,2, sprzedaże 1,0 ✅; koncerny 4,3 (na koniec 5,1) ✅; kooperacje 11,2 ✅; rozszerzenia 4,0/rok, pivoty 1,2/rok; GIG 21,0 ± 0,9%, marża 28,5%; liczniki błędów 0. ⚠️ spółki z ≥ 2 segmentami nadal 22% (cel 25–45%) — szansa i skuteczność rozszerzeń tego nie zmieniają, przyczyna do diagnozy |
| 0.14 | Kontrola końcowa (`raporty/kontrola_0.14.md`) | ✅ 10×200 vs przed T1 i vs `8fdbf63`: GIG 20,2 vs 18,2 vs 20,2% (+2,0 pp vs przed T1, na granicy), marża 28,2 vs 26,3 vs 27,5%; niezmienniki, ujemna gotówka, bezpiecznik: 0; zapis 2,16 MB (+1,7% vs `8fdbf63`). 20 lat: wszystko 0, krajowe ≤ 110, łącznie ≤ 146; ⚠️ zapis 3,26 MB. ⚠️ koncerny 2,8–3,4 (granica 3–6), spółki z ≥ 2 segmentami 22% (cel 25–45%), efekt wydzielenia z naturalnych przebiegów +0,5% ± 3,5 (wymuszone +5,0% ± 2,6) |
| 0.15 | Hossa i bessa (H0–H6) | ⬜ plan, nie zaczęte |
| 0.16 | Giełda międzynarodowa G0–G8 (dawniej 0.15) | ⬜ szkic, nie zaczęte |

**Etap A zrobiony (A1–A4) razem z 3 decyzjami balansu; 0.14 T1–T3 zrobione.** Zostało: poprawki 0.14.1 i 0.14.2 + 3 części 0.14 (T4–T6) + 7 etapów 0.15 + 9 etapów 0.16.

---

## Etap A — domknięcie 0.13 i 0.13.1 (przed 0.14 T1) — ✅ zrobione 2026-10-13

Wyniki: A1, A3, A4 w `raporty/weryfikacja_0.13.1.md`; A2 w `plan_0.13_spoleczenstwo.md` („Wyniki pomiaru”). Stanowisko przebiegów: `tests/przebiegi.html`.

### A1. Długi przebieg weryfikacyjny (×200, z zapisem i wczytaniem w połowie)
Z raportu 0.13.1, punkt „Niesprawdzone” 1:
- `checkWorldInvariants()` puste, w szczególności brak „akcje w obrocie ≠ posiadacze” (wcześniej GIEB, PLX, WZM, CZB);
- spółki krajowe **≤ 115** (decyzja: limit luźny ok. 110; 111–115 w porządku), zwykłe ≤ 150;
- rozmiar zapisu stabilny (ok. 2,1–2,5 MB), bez błędów zapisu.

### A2. Pomiar 0.13 według planu (tabela „Jak sprawdzimy” w `plan_0.13_spoleczenstwo.md`)
- GIG ±2 pp względem 0.12; marże przy polityce Standardowej ±1 pp;
- populacja +1…+6%; klasa biedna 12–30%;
- związki zakładowe w 15–35% spółek, związki sektorowe 1–3, strajki 2–6 na rok;
- TSR polityk kadrowych w ±3 pp/rok, a Wyzysk z największym rozrzutem;
- Ludowcy wygrywają 20–40% wyborów; każda ustawa zmieniona w ≥ 70% przebiegów;
- ≤ 3 nowe maile na kwartał; czas kroku +≤ 10%.

Wynik trzeba dopisać do planu 0.13 jako sekcję „Wyniki pomiaru”. Odchylenia stroimy w liczbach z planu; nowych mechanik nie dodajemy.

### A3. Licznik przycięć `trimGhostHolders` (mała zmiana w kodzie)
Uwaga z raportu: przycinanie może maskować prawdziwe błędy.
- Każde przycięcie zapisujemy w liczniku: symbol, posiadacz, liczba akcji, kwartał.
- Licznik jest widoczny w `checkWorldInvariants()` jako ostrzeżenie (nie błąd).
- Wpis w logu także poza trybem debug.
- **Cel w A1:** 0 przycięć poza wczytaniem starego zapisu.

### A4. B5 i decyzja 2 w praktyce
Z raportu, „Niesprawdzone” 2–3:
- kalibracja liczby JU względem GIG (wynik = GIG daje +1–2% JU rocznie);
- panel „Dlaczego klienci odchodzą / przychodzą” i powiadomienie przy zmianie > 10% JU w kwartale;
- emisja ciągła: przełącznik i domyślny stan;
- ratunek operatora rynku internetowego przez spółki członkowskie (≤ 30% ich gotówki) w interfejsie i w długiej grze.

**Decyzja 1 z raportu** (sufit krajowy bywa 111): zamknięta — limit jest luźny, 111–115 w porządku. Kod zostaje bez zmian.

---

## Etap B — 0.14 „Struktura spółek” (T1 → T6)

| Część | Zakres | Uwagi spójności |
|---|---|---|
| T1 | **T1a porządek kategorii** (rejestr `SECTORS`, mapowanie dubli: Bankowość Komercyjna → Bankowość, Finanse Konsumenckie → Finanse, Międzynarodowy → podsektor, Logistyka + Transport → Transport i logistyka), **T1b segmenty** z udziałami, **T1c filtry** (grupy, sektor główny + przełącznik, podsektory, filtr „Typ”) | fundament dla T2–T6 i dla spółek zagranicznych z 0.15; jedna migracja zapisu |
| T2 | 12 podsektorów, 3 z własną mechaniką (Biotechnologia, Energetyka jądrowa, Fintech) | 0.16 dopisuje: Przemysł ciężki, Słodycze, Herbata, Piwowarstwo |
| T3 | rozszerzenie, wejście w podsektor, **specjalizacja-nisza**, pivot, dyskonto konglomeratu | „specjalizacja” = etykieta bez profilu (TV, Rozrywka, Farmaceutyki, Wywiad); 0.15 dopisuje Premium |
| T4 | spin-off i carve-out | **wymaga A1**; spin-off do 115 spółek krajowych, powyżej tylko carve-out |
| T5 | koncerny, kooperacje, ochrona przed tunelowaniem | kooperacje przenoszą strajki z 0.13 |
| T6 | spółki zależne: transfer 30–70%, usamodzielnienie, wchłonięcie przy ≥ 90%, sprzedaż z wezwaniem | przeniesione z `pomysly_na_kolejne_wersje.md`; wchłonięcia zwalniają miejsca w limicie |
| **0.14.1** | **Poprawki z gry** (`plan_0.14.1_startupy.md`): R0–R4 rynek startupów (audyt przepływów, rozliczenie puli przy każdym końcu startupu, pula w NAV, wypłata z puli z opłatą 2%, panel puli); R5 portfel prywatny (cele korporacji obcięte, pomiar i strojenie źródeł); R6 widok spółek (rynek → poziom → sektor, działalność pod nazwą) | **po T3, przed T4**; zgłoszenie użytkownika: wpłata do puli bez akcji |
| **0.14.2** | **Poprawki z gry 2** (`plan_0.14.2_poprawki_z_gry_2.md`): P1 instytuty badawcze (kurs rósł wykładniczo — krytyczne), P2 emisja ratunkowa bez akcji (krytyczne), P3 spółki zależne (widoczność pod matką, nazwy, inny sektor), P4 nazwy startupów (DejwCorp), P5 bank inwestycyjny, P6 inwestycje wg sektora (atom), P7 pasek newsów zamiast zalewu dymków, P8 zwijane rynki i fazy spółek | po 0.14.1, przed T4 |
| **0.14.3** | **Zapis bez limitu** (`plan_0.14.3_zapis.md`): IndexedDB jako główny zapis, kompresja lz-string, zapis atomowy i kopia awaryjna przy zamknięciu karty, eksport/import pliku, panel zapisu | po poprawkach z decyzji 15 (0.14), przed 0.15 |

## Etap C′ — 0.15 „Hossa i bessa” (H0 → H6)

Plan: `plan_0.15_hossa_bessa.md`. Po 0.14 (T4–T6), przed giełdą międzynarodową: rynek ma być zrównoważony (GIG ok. 7–9% rocznie), zanim dojdą waluty i rynki zagraniczne.

## Etap C — 0.16 „Giełda międzynarodowa” (G0 → G8, dawniej 0.15)

G0 porządki spółek → G1 waluty i kantor → G2 rynki i spółki zagraniczne → G3 otwieranie regionów → G4 sektory i spółki specjalne → G5 cechy prezesów → G6 boty zagraniczne → G7 forex → G8 interfejs, zapis, testy.

Ustalenia spójności (wpisane do planu 0.16):
- **Limity:** spółki zagraniczne mają osobny limit na kraj (1,5 × liczba startowa) i nie liczą się do krajowych ok. 110 ani do łącznych 150.
- **Pracownicy:** spółki zagraniczne korzystają z modelu 0.13 ze **stałym profilem kraju** (prawa pracownicze, szansa związku, szara strefa). Klasy, ustawy i partie są tylko w kraju startowym. Cechy prezesów „Fika” i „Grève générale” działają na ten model.
- **Nowe sektory** (Motoryzacja, Rybołówstwo, Alkohole) dostają strukturę zatrudnienia, koszt pracy, elastyczność popytu i branże powiązane (tabela w G4).
- **Wydarzenia giełdowe** liczone w kwartałach gry: 1% na kwartał, podwajane do 32%, przerwa 2 kwartały.
- **PanDa Bank** korzysta z istniejącego parabanku z 0.11 i 0.11.5.
- **Kategorie w 0.16:** banki z tabel G2 (np. Deutsche Goldhaus, UBZ, PanDa Bank, Waschmabank) dostają sektor **Bankowość** i podsektor, a nie `Finanse`. Nowe sektory (Motoryzacja, Rybołówstwo, Alkohole) trafiają do rejestru `SECTORS` z T1a: Motoryzacja do grupy Przemysł i surowce, Rybołówstwo i Alkohole do Konsumpcji.
- **Wersje zapisu:** 0.13 = v13, 0.14 = v14, 0.15 = v15, 0.16 = v16.
- **Do potwierdzenia przed G0/G2** (lista „Do potwierdzenia” w planie 0.16): spółki państwowe, nazwa Banku Żywności, nazwa spółki z croissantami, nazwy rynków.

## Otwarte sprawy (z raportu `weryfikacja_0.13.1.md`, do zaplanowania)

- **Rynek za byczy** → **zaplanowane jako 0.15 „Hossa i bessa”** (decyzja 2026-10-14): GIG rośnie ok. 17% rocznie w 0.12 i 0.13, a komentarz B5 w `companies.js` zakłada cel 7–9%. Problem znany od testów 0.11. Wymaga osobnego planu balansu rynku; kandydat na krótką wersję między 0.14 a 0.15 albo część G0.
- **Rozmiar zapisu** → **0.14.3 „Zapis bez limitu”** (IndexedDB + kompresja + plik; decyzja 2026-10-16), a 0.16 G−1 zostaje jako optymalizacja czasu zapisu; po 0.14: 3,26 MB po 20 latach: w bardzo długiej grze (od ok. 40 lat gry) zapis dochodzi do 2,5 MB, a 0.14 (segmenty) i 0.16 (spółki zagraniczne) go powiększą. W T1 obowiązuje cel przyrostu ≤ 3%. Przed 0.15 G2 potrzebny jest pomiar zapisu z 3–4 dołączonymi krajami (cel < 3 MB z planu 0.15).
- **Polityki kadrowe:** Wyzysk nie ma największego rozrzutu wyników (cel z 0.13). Do ponownego pomiaru dłuższą serią; ewentualne strojenie (np. większa zmienność kar Inspekcji i strajków przy Wyzysku) po decyzji użytkownika.
- **Obserwacja:** koszty fuzji w `ma.js` (`initiator.cash -= process.costs`) bez sprawdzenia gotówki to możliwe źródło jednorazowej ujemnej gotówki (PROL). ✅ Zamknięte w 0.14.2 P10 (`06d4c42`: kredyt przed kosztami fuzji).
- **GIG i marża po 0.14.2 → 0.15 H0** (decyzja 2026-10-15: bez korekty, obserwacja): GIG 19,4 vs 17,3%/rok, marża 26,5 vs 24,4% (20 vs 10 przebiegów ×200). Atrybucja (`raporty/kontrola_0.14.2.md`): bez P9 GIG 17,4% (−2 pp, ok. 1,4σ), ale ani kotwica banków, ani spółek ze stratą osobno tego nie robi; marża bez winnej części (każda < 1 pp). W 0.15 H0 powtórzyć na większej próbie (≥ 20 przebiegów na wariant), zanim zaczniemy strojenie rynku.

## Po 0.16

- „Rynek pracy 2” z `pomysly_na_kolejne_wersje.md`: pracownicy zakładają firmy, które trafiają do inkubatora, oraz podkupowanie prywatnych inwestorów. Podkupowanie specjalistów i prezesów już istnieje (0.13 S3), więc RP2 je rozszerza, a nie powtarza.

## Decyzje (podjęte 2026-10-12)

1. Limit spółek krajowych jest luźny, ok. 110; 111–115 jest w porządku.
2. Spin-off do 115 spółek krajowych, powyżej tylko carve-out.
3. Spółki zależne trafiają do 0.14 jako T6.
4. Spółki zagraniczne mają osobny limit na kraj (1,5 × liczba startowa), poza limitami krajowymi.
5. Pracownicy za granicą: model 0.13 i stały profil kraju.
6. Pojęcia: podsektor ma profil wyceny, a specjalizacja to nisza z jednym modyfikatorem.
7. Porządek kategorii i filtrów to 0.14 T1a/T1c: dwa sektory finansowe z podsektorami, „Transport i logistyka”, filtr domyślnie po sektorze głównym z przełącznikiem.
8. **Hossa i bessa** (2026-10-14): osobna wersja 0.15, przed giełdą międzynarodową, która przechodzi na 0.16. Zakres: nastrój rynku i fazy, bańki i krachy, boty zależne od nastroju (bez krótkiej sprzedaży).
