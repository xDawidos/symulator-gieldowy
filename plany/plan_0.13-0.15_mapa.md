# Mapa prac: od domknięcia 0.13 do 0.15

Jeden spójny porządek prac na wersje 0.13 → 0.15. Szczegóły są w planach źródłowych:
- `plan_0.13_spoleczenstwo.md`;
- `plan_0.14_struktura_spolek.md`;
- `plan_0.15_gielda_miedzynarodowa.md`;
- `raporty/weryfikacja_0.13.1_czesciowa.md`.

Stan na 2026-10-12: gałąź robocza `zmiany-AI` jest zsynchronizowana z `main` (`7cfe6cd`, PR #7).

## Stan

| Wersja | Część | Stan |
|---|---|---|
| 0.13 | S1–S6 (kraj, pracownicy, rynek pracy, związki, ustawy, spięcie z grą) | ✅ kod: `77fdeb0`, `cf0d161`, `62478bb`, 21 testów. ❌ brak pomiaru według „Jak sprawdzimy” |
| 0.13.1 | B1–B13, D1/D2 (rynki internetowe, miękki limit), P1–P3 (sufity, „duchy posiadaczy”), decyzje 1–2, B5 | ✅ kod, testy 310/310. ⚠️ weryfikacja częściowa (długi przebieg przerwany) |
| 0.14 | T0 (prędkości ×100/×200) | ✅ `117feec` |
| 0.14 | T1–T6 | ⬜ nie zaczęte (T6 dopisane 2026-10-12) |
| 0.15 | G0–G8 | ⬜ szkic, nie zaczęte |

**Zostało: 4 zadania domknięcia (etap A) + 6 części 0.14 + 9 etapów 0.15 = 19 pozycji.** Etap A to głównie weryfikacja, z jedną małą zmianą w kodzie (A3).

---

## Etap A — domknięcie 0.13 i 0.13.1 (przed 0.14 T1)

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
| T2 | 12 podsektorów, 3 z własną mechaniką (Biotechnologia, Energetyka jądrowa, Fintech) | 0.15 dopisuje: Przemysł ciężki, Słodycze, Herbata, Piwowarstwo |
| T3 | rozszerzenie, wejście w podsektor, **specjalizacja-nisza**, pivot, dyskonto konglomeratu | „specjalizacja” = etykieta bez profilu (TV, Rozrywka, Farmaceutyki, Wywiad); 0.15 dopisuje Premium |
| T4 | spin-off i carve-out | **wymaga A1**; spin-off do 115 spółek krajowych, powyżej tylko carve-out |
| T5 | koncerny, kooperacje, ochrona przed tunelowaniem | kooperacje przenoszą strajki z 0.13 |
| T6 | spółki zależne: transfer 30–70%, usamodzielnienie, wchłonięcie przy ≥ 90%, sprzedaż z wezwaniem | przeniesione z `pomysly_na_kolejne_wersje.md`; wchłonięcia zwalniają miejsca w limicie |

## Etap C — 0.15 „Giełda międzynarodowa” (G0 → G8)

G0 porządki spółek → G1 waluty i kantor → G2 rynki i spółki zagraniczne → G3 otwieranie regionów → G4 sektory i spółki specjalne → G5 cechy prezesów → G6 boty zagraniczne → G7 forex → G8 interfejs, zapis, testy.

Ustalenia spójności (wpisane do planu 0.15):
- **Limity:** spółki zagraniczne mają osobny limit na kraj (1,5 × liczba startowa) i nie liczą się do krajowych ok. 110 ani do łącznych 150.
- **Pracownicy:** spółki zagraniczne korzystają z modelu 0.13 ze **stałym profilem kraju** (prawa pracownicze, szansa związku, szara strefa). Klasy, ustawy i partie są tylko w kraju startowym. Cechy prezesów „Fika” i „Grève générale” działają na ten model.
- **Nowe sektory** (Motoryzacja, Rybołówstwo, Alkohole) dostają strukturę zatrudnienia, koszt pracy, elastyczność popytu i branże powiązane (tabela w G4).
- **Wydarzenia giełdowe** liczone w kwartałach gry: 1% na kwartał, podwajane do 32%, przerwa 2 kwartały.
- **PanDa Bank** korzysta z istniejącego parabanku z 0.11 i 0.11.5.
- **Kategorie w 0.15:** banki z tabel G2 (np. Deutsche Goldhaus, UBZ, PanDa Bank, Waschmabank) dostają sektor **Bankowość** i podsektor, a nie `Finanse`. Nowe sektory (Motoryzacja, Rybołówstwo, Alkohole) trafiają do rejestru `SECTORS` z T1a: Motoryzacja do grupy Przemysł i surowce, Rybołówstwo i Alkohole do Konsumpcji.
- **Wersje zapisu:** 0.13 = v13, 0.14 = v14, 0.15 = v15.
- **Do potwierdzenia przed G0/G2** (lista „Do potwierdzenia” w planie 0.15): spółki państwowe, nazwa Banku Żywności, nazwa spółki z croissantami, nazwy rynków.

## Po 0.15

- „Rynek pracy 2” z `pomysly_na_kolejne_wersje.md`: pracownicy zakładają firmy, które trafiają do inkubatora, oraz podkupowanie prywatnych inwestorów. Podkupowanie specjalistów i prezesów już istnieje (0.13 S3), więc RP2 je rozszerza, a nie powtarza.

## Decyzje (podjęte 2026-10-12)

1. Limit spółek krajowych jest luźny, ok. 110; 111–115 jest w porządku.
2. Spin-off do 115 spółek krajowych, powyżej tylko carve-out.
3. Spółki zależne trafiają do 0.14 jako T6.
4. Spółki zagraniczne mają osobny limit na kraj (1,5 × liczba startowa), poza limitami krajowymi.
5. Pracownicy za granicą: model 0.13 i stały profil kraju.
6. Pojęcia: podsektor ma profil wyceny, a specjalizacja to nisza z jednym modyfikatorem.
7. Porządek kategorii i filtrów to 0.14 T1a/T1c: dwa sektory finansowe z podsektorami, „Transport i logistyka”, filtr domyślnie po sektorze głównym z przełącznikiem.
