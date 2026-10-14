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
| 0.14 | T4–T6 | ⬜ nie zaczęte (T6 dopisane 2026-10-12) |
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
- **Rozmiar zapisu:** w bardzo długiej grze (od ok. 40 lat gry) zapis dochodzi do 2,5 MB, a 0.14 (segmenty) i 0.16 (spółki zagraniczne) go powiększą. W T1 obowiązuje cel przyrostu ≤ 3%. Przed 0.15 G2 potrzebny jest pomiar zapisu z 3–4 dołączonymi krajami (cel < 3 MB z planu 0.15).
- **Polityki kadrowe:** Wyzysk nie ma największego rozrzutu wyników (cel z 0.13). Do ponownego pomiaru dłuższą serią; ewentualne strojenie (np. większa zmienność kar Inspekcji i strajków przy Wyzysku) po decyzji użytkownika.
- **Obserwacja:** koszty fuzji w `ma.js` (`initiator.cash -= process.costs`) bez sprawdzenia gotówki to możliwe źródło jednorazowej ujemnej gotówki (PROL). Zlecone przy 0.14 T1.

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
