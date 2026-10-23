# Kontrola 0.15.1 „Sztuka przejęć” (2026-10-21)

- **Kod:** gałąź `claude/funny-villani-16217c`, części M0–M10 od `07b688e` do `9209c0a` (na 0.15.0.1 = `01bf512`…`9ce625c`).
- **Plan:** `plany/plan_0.15.1_przejecia.md` (z dopisanymi M9 i M10, decyzje użytkownika 2026-10-21). Pomiar bazowy: `raporty/pomiar_0.15.1.md`.
- **Testy:** `tests/tests.html` **538/538** (nowa grupa „0.15.1”, 25 testów; poprawione: pigułka G2 — koszt od kapitalizacji po ogłoszeniu).
- **Przebiegi** `tests/przebiegi.html`, ×200:
  - runda 1 (`ef728fa`): 20 × 6,5 roku bez presetu, 20 × 6,5 roku `wiekszosciowiec`, 5 × 20 lat, 10 × 6,5 roku `wydzielenia` (kontrola T4);
  - runda 2 (`9209c0a`, po poprawkach i strojeniu): 10 + 10 × 6,5 roku, 5 × 20 lat;
  - czas kroku: 3 + 3 gry równolegle, 0.15.0.1 vs 0.15.1.

## Zmiany

| Część | Commit | Co |
|---|---|---|
| M0 | `07b688e`, `13ef011`, `3839432`, `a93b862` | Sondy przejęć, sonda `arbitraz`, preset `wiekszosciowiec` (+ poprawka: okna decyzji nie pauzują przebiegu), raport bazowy, sondy M3/M6/M9 |
| M1 | `4bb56b6` | Arbitraż fuzji: skok kursu celu do ceny oferty minus spread (3% + wrogie/obrona 4 pp + LBO 3 pp + antymonopol 4 pp + 0,5 pp za etap, ≤ 15%), powrót do kotwicy w procesie, zerwanie ±5% ceny sprzed oferty, reakcja inicjatora, bez ×1,1 w etapie 5, linia w karcie spółki, 2 hasła Akademii |
| M2 | `3a05bc9`, `ef728fa`, `9209c0a` | Oferty kupna dla większościowca (≥ 33%; fundusz i boty): okno oferty wg zaakceptowanego układu, rozmowy wstępne, kontroferta do 3 rund z urażeniem i wrogim wezwaniem, aukcja z doradcą, transakcja 3 kw. z arbitrażem; cena maksymalna ≤ kurs × 1,6 i ≤ oferta wstępna + 5–20 pp |
| M10 | `8306375` | Mapa rodowa spółek w trybie deweloperskim (dziennik ≤ 600 wpisów, drzewo matka → córki → wnuczki) |
| M3 | `37b7498`, `82215bb` | Ukryte zobowiązania (12% spółek z długiem, ujawnienie: audyt 70%, samoistnie 2%/kw., badanie kupującego 60%); badanie kupującego (oszustwo 70%: obniżka 15–30% albo zerwanie; audyt przed sprzedażą: połowa obniżki, bez zerwania; decyzja funduszu w mailu) |
| M4 | `9afe45c` | Odkup pakietów od botów, funduszy kolegów i zarządu w liście akcjonariuszy: cena rezerwowa, rozmowa i propozycja raz na kwartał, kontroferta, urażenie, transfer poza rynkiem, odejście prezesa |
| M5 | `c592215`, `6712d51` | Ustawa „Próg wezwania” (66/75/90/99%, partie, limit KNF); drabina KNF (ostrzeżenie → kara 2% → nakaz wezwania albo odsprzedaży) |
| M6 | `f69ed66` | Wartość firmy i test utraty wartości co 4 kw. (odpis 25% / 50%, bez gotówki); **naprawa księgowania przejęć** (zapłata zmniejsza aktywa, kapitał − koszty, przychody i segmenty celu przechodzą do kupującego — wcześniej przejęty biznes znikał) |
| M9 | `7a929ed` | Drabina pakietów spółka → spółka (25 / 50 / próg ustawy / 99%), podkupowanie, rangi (Platynowa+, Złota z ograniczeniem), „Marionetka &lt;matka&gt;”, „Mistrz marionetek”, KNF kontroluje koncerny |
| M7 | `36343d2` | 6 osiągnięć (Sprzedane z premią, Aukcjoner, Czyste księgi, Arbitrażysta, Pakiet po pakiecie, ukryta Klątwa zwycięzcy); 15 haseł Akademii w M1–M6 |
| M8 | `7ded314`, `9209c0a` | Poprawki i strojenie (niżej) |

### Błędy znalezione w kontroli

- **Pusta kopia działów u córki** (`7ded314`): córka z wydzielenia albo założona przez koncern dostawała kopię działów matki — pustą, gdy matka ich jeszcze nie miała. Wyjątek przerywał co tydzień logikę wszystkich kolejnych spółek (5 przypadków w grach 20-letnich; M9 tworzy więcej córek). Naprawa działów w `runCorporateLogic`, test.
- **Ujemna gotówka przy kuponie i wykupie obligacji spółki** (`7ded314`): PIX w 0.15.0.1, WZM w rundzie 1. Brak gotówki pokrywa kredyt (`ensureCompanyCash`).

## Wyniki celów

| Miara | Cel | Runda 1 | Runda 2 (po strojeniu) | Stan |
|---|---|---|---|---|
| Przejęcia botów na grę | jak w M0 ±30% (5,4) | 6,0 | 4,9 | ✅ |
| Spread przy ogłoszeniu (mediana) | 4–10% | 13% | 9,7–10,4% | ✅ na granicy |
| Zerwane przejęcia | 10–25% | 12% / 7% / 17% (20 lat) | 3% / 6,5% / 22% | ⚠️ duży rozrzut |
| Sonda `arbitraz`: ponad GIG na transakcję | +1…+4% | +7,5% / −4% / +12% | −6% / −10% / −12% | ❌ |
| Sonda `arbitraz`: transakcje ze stratą | ≥ 15% | 10% / 7% / 20% | 3% / 8% / 19% | ⚠️ |
| Oferty dla większościowca | 1–3 na kontrolowaną spółkę | 0,78 | 0,7 | ❌ (przyjęta oferta kończy posiadanie) |
| Premia przyjętej oferty | 20–45% | 51% | **30%** | ✅ |
| Kontroferta na górnej granicy przedziału | +5…+15 pp | +31 pp | **+12 pp** | ✅ |
| Urażenie przy żądaniu > 115% ceny maks. | ≥ 50% | test: 30 / 60 / 80% wg nastawienia | — | ✅ (średnio 57%) |
| Ukryte zobowiązania (udział spółek) | 10–15% | — | ok. 7–9% (tylko spółki z długiem) | ⚠️ |
| Ukryte zobowiązania ujawnione w 20 lat | ≥ 60% | — | 78% | ✅ |
| Badanie kupującego: oszustwo wykryte | 60–80% | test: 70% | — | ✅ |
| Audyt przed sprzedażą zmniejsza obniżkę | ≥ 40% | test: 50% | — | ✅ |
| Odkup pakietów: zgoda przy cenie ≥ rezerwowej / urażenie < 85% | ≥ 95% / 100% | test: 100% / 100% | — | ✅ |
| Próg wezwania zmieniony | ≥ 50% gier 20-letnich; nigdy ponad limit KNF | — | 5 z 5 gier; limit z założenia (test) | ✅ |
| Spójność bilansów | 0 spółek z różnicą > 0,1% | — | 0–1 na grę (5 z 25 gier) | ⚠️ (przyczyna niesprawdzona) |
| Odpisy wartości firmy w 3 lata | 20–40% przejęć | — | 28% / 14% / 21% | ✅ |
| Podkupowania M9 | 2–5 na rok | — | 1,1 / 1,2 / 1,5 | ⚠️ |
| Koncerny (cel T5 3–6) | bez przekroczenia | 5 (6,5 roku); 5–11 (20 lat) | ok. 5,5 / 8–10 (20 lat) | ❌ w grach 20-letnich |
| GIG względem 0.15.0.1 | ±0,5 pp | 10,5% (0.15.0.1: 11,4%) | 11,4% / 20 lat 10,7% (0.15.0.1: 12,5%) | ✅ / ⚠️ w 20 latach (rozrzut) |
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 | 1 / 4 / 5 (20 lat) | **0 / 0 / 0** | ✅ |
| Zapis | bez strat | 55/55 | 25/25 | ✅ |
| Czas kroku | +≤ 2% | — | 2,86 → 2,88 s/kw. (+1%) | ✅ |
| Wydzielenia (T4) | bez błędów | 2–6 na grę, 0 błędów | — | ✅ |

## Odstępstwa i otwarte sprawy

1. **Arbitraż poniżej GIG.** Przejęcia botów trwają ok. 7 kwartałów, a GIG rośnie ok. 11%/rok — w czasie transakcji ok. 15%. Spread, który pokryje ten koszt, przekroczy cel 4–10%. Cele „spread 4–10%” i „+1…+4% ponad GIG” wzajemnie się wykluczają przy obecnej długości procesu. **Do decyzji:** krótszy proces przejęć botów (np. 4 etapy) albo liczenie sondy względem lokaty (stopa bazowa) zamiast GIG.
2. **Koncerny w grach 20-letnich 8–10** (cel T5 3–6). M9 i córki T6 dokładają koncerny; kontrola KNF (30% sektora / 10% rynku) działa rzadko. **Do decyzji:** próg KNF 20% sektora albo częstsze osłabianie koncernów.
3. **Podkupowania 1,1–1,5 na rok** (cel 2–5) — szansa 3%/kw. na uprawnioną spółkę. Pokrętło: 4–5%/kw. (ale to zwiększy koncerny — patrz 2).
4. **Oferty dla większościowca ok. 0,7 na spółkę** — cel 1–3 jest nieosiągalny z założenia, gdy przyjęcie kończy posiadanie spółki (polityka sondy przyjmuje każdą ofertę).
5. **Zerwania 3–22%** — duży rozrzut między rundami; średnio w celu.
6. **Ukryte zobowiązania u 7–9% spółek** — reguła działa tylko dla spółek z długiem (5–20% długu).
7. **Rozjechane bilanse 0–1 na grę** — przyczyna niesprawdzona (może być starsza niż 0.15.1; sonda `bsGap` dodana w M8).
8. **Zmiany względem planu:**
   - sprzedaż pakietu 33–50% rozlicza się od razu (plan: 3 kw.);
   - M3 i M9 w jednym commicie każda (plan: commit po każdym kroku);
   - nakaz wezwania dla spółek (M9) — od razu do progu ustawy po najwyższej cenie, bez kar;
   - spread 0,5 pp za etap (plan: 1 pp) i cena maksymalna oferenta ≤ oferta + 5–20 pp (plan: bez limitu) — strojenie wg pomiaru;
   - przejęcie przenosi przychody, historię wyników i segmenty celu do kupującego (naprawa — wcześniej przejęty biznes znikał).
9. **Nie sprawdzone:** przyrost zapisu w liczbach (zapis 2,13–2,20 mln znaków w grach 6,5-letnich, jak w 0.15.0.1, bez osobnego porównania); okno oferty, formularz odkupu i ustawa w oknie „Państwo” sprawdzone renderowaniem w testach, bez klikania w pełnej grze.

## Uzupełnienie (2026-10-23): przyczyna rozjazdów bilansu i przeklikanie okien

**Rozjazdy bilansu** — przebieg diagnostyczny (3 × 10 lat) ze śledzeniem każdego zapisu do pól bilansu:
- jedyna przyczyna: `triggerNationalizationEvent` — państwo przejmuje dług spółki (zobowiązania = 0), a kapitał się nie zmienia (KFX, PIX); błąd sprzed 0.15.1, nie ma związku z przejęciami;
- naprawa `87e0ef9`: przejęcie długu księgowane jako dokapitalizowanie (kapitał zakładowy + dług); test.

**Przeklikanie w pełnej grze** (kopia kodu na osobnym porcie, ekran 1280 × 900): poczta → mail z ofertą → „Otwórz ofertę” → rozmowy wstępne → kontroferta → aukcja → przyjęcie; karta spółki (linia arbitrażu); zakładka „Akcjonariat” → „Zaproponuj odkup” od zarządu (rozmowa, propozycja 500 akcji); mail z wynikiem badania kupującego → „Negocjuj (raz)” → „Przyjmij”; stary mail z nieaktualną ofertą; okno „Państwo” → „Kraj” (ustawa „Próg wezwania” z limitem KNF); ustawienia → mapa rodowa (po rozliczeniu przejęcia: Linapol → Alicante Housing).

Wszystkie ścieżki działają (rozliczenie: fundusz dostał 5 658 akcji × 35,34 PLN po obniżce z badania; wartość firmy u kupującego; rejestr akcji spójny). Znalezione i naprawione (`50b2328`):
1. **okna otwierane z poczty były zasłonięte pocztą** (oferta, a także istniejące: wezwanie, emisja ratunkowa, walne) — poczta zamyka się, gdy otwiera się okno;
2. przedział z rozmów wstępnych schodził poniżej obecnej oferty — teraz nie;
3. „ostatnie słowo” bez podwyżki mówiło „oferent podniósł cenę do” tej samej kwoty — teraz „nie podnosi ceny”;
4. negocjacja po badaniu nie pokazywała wyniku — komunikat;
5. formularz odkupu zwijał się po każdej akcji — zostaje rozwinięty.

Testy: 539/539.

## Uzupełnienie 2 (2026-10-23): decyzje użytkownika — pomiar k1 → k2

k1 = `de57b02` (przejęcia botów 4 kw., KNF 25%); k2 = `6df4a48` (długość przejęcia 3–7 kw. wg wielkości, podkupowania 3,5%, skup 30%, spłata długu przy nacjonalizacji, Socjaldemokraci, progi CIT, ustawa antymonopolowa). 10 gier × 6,5 roku bez preseta, 10 × „większościowiec”, 5 (k2: 4) × 20 lat.

| Miara | k1 zwykłe | k2 zwykłe | k1 większ. | k2 większ. | k1 20 lat | k2 20 lat |
|---|---|---|---|---|---|---|
| Arbitraż vs GIG | +0,9% | +0,7% | −8,4% | −4,9% | +1,7% | −11,7% |
| Podkupowania / grę | 7,6 | 8,4 | 7,4 | 7,1 | 26,4 | 30,5 |
| Przejęcia / grę | 4,7 | 5,1 | 5,1 | 6,2 | 21,8 | 19,3 |
| Udział córek na koniec | 30% | 30% | 29% | 29% | 34% | 38% |
| GIG CAGR | 9,9% | 11,2% | 13,5% | 9,4% | 11,7% | 12,5% |
| Liczba akcji CAGR | +0,06% | −0,06% | +0,15% | +0,09% | −0,23% | +0,21% |
| ms / kwartał | 2253 | 2543 | 2634 | 2574 | 3647 | 3537 |

Wyjątki, niezmienniki, ujemna gotówka, bezpiecznik cen, ostrzeżenia pieniędzy, rozjazd bilansu: 0 we wszystkich grach; zapis OK.

Wnioski:
- rozwodnienie ≈ 0 (skup 30%) ✅; podkupowania ok. 1,3–1,5 na rok (cel 2–5) — nadal poniżej celu;
- arbitraż: lepiej u większościowca, w grach 20-letnich gorzej (duże cele trwają do 7 kw.; mała próba 4 gier, rozrzut duży);
- **Socjaldemokraci nie wygrali ani nie współrządzili w żadnych z 50 wyborów**: poparcie bazowe z klas ok. 13,5% (Rynkowa 37%, Państwowy 28%, Ludowcy 22%), koalicję tworzy druga partia — progi CIT nie zmieniły się ani razu, ustawę antymonopolową łagodziła tylko Koalicja Rynkowa (do „łagodnej” w 16 z 24 gier). Do decyzji użytkownika;
- liczba koncernów nie jest mierzona sondą (brak w `przebiegi.html`).
