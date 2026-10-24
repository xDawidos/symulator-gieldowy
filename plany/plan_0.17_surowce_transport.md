# Plan 0.17 „Surowce i transport” (szkic zakresu, po 0.16 „Giełda międzynarodowa”; po nim 0.17.1 „Wielkie testy rozgrywki i balans”, 0.17.2 „Energia i środowisko”, potem 0.18 „Łańcuchy produkcyjne”)

Cel: gra dostaje ceny surowców, giełdę towarową i transport. Surowce są wsadem i produktem spółek; transport wpływa na koszty i czas dostaw. To **warstwa pod 0.18** (łańcuchy produkcyjne) — bez niej łańcuch nie ma czego przenosić.

Czego uczy:
- **Cykl surowcowy:** ceny surowców zależą od popytu przemysłu i zbrojeń, podaży i geopolityki.
- **Kontrakty terminowe:** dźwignia, depozyt, zapadalność; contango i backwardation w prostej formie.
- **Koszty wsadu:** kto zyskuje i traci na wzroście ceny ropy, miedzi, zboża.
- **Logistyka:** fracht morski (tani, wolny), lotniczy (drogi, szybki), lądowy (elastyczny); wąskie gardła.

Kolejność: S0 → S1 → … → S7. **Commit po każdej części.** UI z komponentów 0.14.5; projekt wyglądu zleca się czatowi designu.

**Zależności:** 0.16 (kraje otwarte: surowce mają kraje producentów; waluta USD; **silnik depozytu `marginEngine` z forexu G21**, który tu obsługuje kontrakty). Zapis: pola opcjonalne w v16.

**Wielkość orientacyjna:** L (ok. 8 części, ok. 35 testów; nowe spółki ok. 25; zapis ≤ +4%).

---

## Punkt wyjścia (do sprawdzenia w kodzie przed S0)

- Sektory: Energia (OZE, Energetyka jądrowa), Chemia, Przemysł, Transport i logistyka (Lotnictwo, Logistyka), Budowlany, Obronność, Żywność; spółki surowcowe PL (Kopalnie Węgla Mine, Miedź Ludowa, Siarkobrzeg, Państwowy Uran, Stocznia Morska).
- Szoki makro w `core.js` (`MACRO_SHOCK_EVENTS`: szok naftowy) — tylko efekty kursowe; kryzysowa linia naftowa 1973 w `crises.js` działa przez szoki sektorowe.
- Przetargi budowlane i PPP: `city.js`; interwencje państwa z 0.15.3 bez zamówień PPP (odstępstwo 6 z kontroli 0.15.3).
- Silnik depozytu: dopiero w 0.16.4 (G21).

## Części

| Część | Zakres | Uwagi |
|---|---|---|
| **S0** | Pomiar po 0.16 (zapis, czas kroku, GIG, marże; baza 0.17); doprecyzowanie danych | raport `raporty/baza_0.17.md` |
| **S1** | **Rejestr surowców** (złoto, ropa, srebro, uran, miedź i metale przemysłowe, zboże, kawa, bawełna, gaz): cena w USD, proces powracający do średniej + sezon + wpływ nastroju i linii, wpływ globalnego popytu przemysłu i zbrojeń | cena „kwartalna” w uproszczeniu; bez dziennej mikrostruktury |
| **S2** | **Spółki i koszty:** spółki wydobywcze (przychód ∝ cena surowca), przemysł i chemia (koszt wsadu = udział kosztu × zmiana ceny), **średnia odchyłek marż = 0** (zasada 0.13: marżę wyznacza profil sektora) | kalibracja „średnio zero” jest warunkiem wejścia |
| **S3** | **Giełda towarowa:** kontrakty terminowe (zapadalność 1–4 kw.), depozyt i margin call (`marginEngine`), boty spekulacyjne i hedgujące (spółki zabezpieczają wsad) | limit dźwigni funduszu wspólny z forexem |
| **S4** | **Transport:** podsektory w Transporcie i logistyce (Morski, Lotniczy-cargo, Lądowy: kolej i ciężarówki); spółki (1–2 na kraj; flagowe państwowe w PL i USA: np. morska, POP, DHXL); **indeks frachtu** (cena + czas dostawy wg rodzaju) | bez nowego sektora, tylko podsektory |
| **S5** | **Infrastruktura publiczna:** porty morskie, tory, autostrady, lotniska (np. Chopin Industry Airport, Wałęsa Shipment) przez przetargi `city.js`; przepustowość podnosi tempo transportu; **zamówienia PPP** dopisane do interwencji państwa 0.15.3 | domyka odstępstwo 6 z 0.15.3 |
| **S6** | **Zbrojenia a surowce:** obronność zużywa metale i elektronikę; poziom bezpieczeństwa państwa | opcjonalnie, jeśli S2 spełni kalibrację |
| **S7** | Interfejs, Akademia (np. „Kontrakt terminowy”, „Contango”, „Fracht”), zapis, kontrola, raport `raporty/kontrola_0.17.md` | |

## Jak sprawdzimy (orientacyjnie)

| Miara | Cel |
|---|---|
| Średnia odchyłek marż sektorów po S2 | 0 ± 0,3 pp; GIG ±1 pp względem bazy 0.17 |
| Cena surowca w widełkach | 100% kroków; zmienność roczna 15–40% wg surowca |
| Spekulacja „kup nisko, sprzedaj wysoko” na kontraktach | ≤ lokata + 6 pp/rok |
| Margin call | zamknięcie przy kapitale pozycji < 50% depozytu; 0 ujemnej gotówki |
| Zapis / czas kroku | ≤ +4% / ≤ +10% |
| Niezmienniki, wyjątki JS | 0 |

## Główne ryzyka

- **Przesunięcie marż wszystkich sektorów** (koszt wsadu) → kalibracja „średnio zero”, przebiegi ×200 przed commitem S2.
- **Dźwignia gracza** (kontrakty + forex) → wspólny limit dźwigni.
- **Zbyt wiele surowców = szum**: zaczynamy od 9; w razie potrzeby 6.
- **Zależność od forexu** (silnik depozytu): jeśli 0.16.4 się opóźni, S3 przesuwamy na koniec.

## Decyzje do podjęcia przed S1

1. Liczba surowców (9 z listy czy 6 na start)?
2. Czy kontrakty są dostępne od razu, czy po odblokowaniu umiejętności („Mistrz Opcji” z roadmapy)?
3. Czy zbrojenia i bezpieczeństwo państwa (S6) wchodzą już tu, czy zostają na 0.19?

## Zlecenie dla czatu designu (przed S3)

1. Okno giełdy towarowej (lista surowców z ceną i zmianą, wykres, kontrakty, depozyt słowem i liczbą).
2. Indeks frachtu w oknie „Rynek” albo w zakładce Miasto (porty, tory, lotniska).
3. Ikony surowców i rodzajów transportu (SVG).
4. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.
