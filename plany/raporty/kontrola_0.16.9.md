# Kontrola 0.16.9 „Waluty w funduszu i spółki zagraniczne jak krajowe”

Stan: W3, W1 i W2 (podzbiór) zrobione na gałęzi `claude/impl-0169-b39bd6` (od `712d1e7` = zmiany-AI po 0.16.9/0.16.6 S0), niescalonej. Testy **880/880** (`node plany/design/narzedzia/run_tests.mjs`; 17 nowych: grupy „0.16.9 W3 …”, „0.16.9 W1 …”, w tym W2). Zapis **v20** (v4–v19 nadal się wczytują). Plan: `plan_0.16.9_waluty_w_funduszu.md`, diagnoza W3: `diagnoza_0.16.9.md`.

## Co zrobiono (kolejność W3 → W1 → W2, commit i testy po każdym etapie)

### W3. Spółki zagraniczne jak krajowe (interfejs i poziomy giełd)
- **Poziomy:** pochodna ceny/kapitalizacji w PLN liczona na żądanie (`getForeignTier`, bez pola w zapisie). Kraj połączony → nasze poziomy Śmieciowa…Platynowa (progi `exchanges`), Szmaragd/Rubin wg kapitalizacji w osobnych limitach 3/6 wśród spółek krajów połączonych (Diament jest jeden i krajowy); kraj niepołączony → własne poziomy giełdy kraju („DAX: Giełda Srebrna”). Obce nie dostają premii zmienności elit ani ±3% przy zmianie poziomu (świadomie: nie ruszamy kalibracji kursu obcych).
- **Lista główna:** obce wiersze stoją w grupach poziomów razem z krajowymi (ta sama grupa sektora, sortowanie ceny w PLN, „Kraj” jako klucz wtórny, zwijanie giełdy), wiersz jak krajowy (ikona karty, pasek dostępności, chevron szuflady z Kup/Sprzedaj/Wykres/Karta/Akcjonariat, kłódka gdy `playerAccessLevel` < poziom giełdy). Zniknął blok „kraj” pod listą krajową.
- **Wspólny widok „źródło danych”:** `getCompanyCardSource(symbol)` → spółka krajowa albo `buildForeignCardStock` (kopia przeliczona na PLN w kształcie krajowej, bez zapisu). Karta (nagłówek, kafelki, Finanse, wycena) renderuje się tym samym kodem; Akcjonariat/Zarządzanie/Grupa mają krótkie widoki własne, Zatrudnienie ukryte.
- **Wykres:** `renderChartSVGForStock` rysuje `i.history` (linia tygodniowa w walucie spółki) tym samym kodem osi/siatki/segmentów; okno „Wykres” bez świec i alertów; w Przeglądzie karty obcej wykres 200 px. Historia dywidend `divHistory` (4 ostatnie) daje stopę dywidendy jak u krajowych; skalowana splitem; pole `dh` w zapisie krajów (opcjonalne).

### W1. Gotówka w wielu walutach
Model sald już istniał (0.16.1: `playerCashByCurrency`, NAV przez `getForeignCashPln`, kantor, zakup obcych najpierw z salda w walucie spółki), więc W1 domknęło brakujące:
- **Okno „Gotówka funduszu”** (klik albo Enter/Spacja na pasku gotówki): salda z kursem, wartością w PLN, udziałem i **wynikiem kursowym** (strzałka + procent + kwota względem średniego kursu nabycia), formularz zmiany waluty (z/na, kantor, szacunek odbioru i spreadu przed wykonaniem), zasady słowami.
- **Zmiana waluty** `convertCurrency`: PLN↔obca przez kantor, obca↔obca przez złote (dwa spready), wszystko albo nic (kwoty i limity dostawcy sprawdzane przed ruchem sald), `previewConversion` dla szacunku.
- **Zapis v20:** `currencies.basis` = średni kurs nabycia (kantor: kurs ze spreadem; dywidendy i wpływy ze sprzedaży: kurs środkowy). Migracja v16–v19: kurs bieżący (wynik kursowy liczony od migracji).
- **Decyzja: PLN-owe płatności.** *Obowiązkowe* (umorzenia dla klientów, gwarancje, spłata lombardu — już przez `forceLiquidation`; opłata za zarządzanie — nowe `ensurePlnCash`) → **automatyczne przewalutowanie z ostrzeżeniem w dzienniku** (co, na ile, spread), od największego salda; opłata z zapasem 8 tygodni (jeden spread, jeden wpis). *Dobrowolne* (zakupy akcji krajowych i inne wydatki) → **odmowa** z podpowiedzią „Masz X w walutach — przewalutuj po kliknięciu w gotówkę funduszu” (dotyczy kupna akcji; reszta wydatków bez zmiany komunikatu). Powód: gracz trzymający walutę świadomie nie ma jej tracić na spreadzie przy zwykłym zakupie, ale fundusz nie może nie wypłacić klientom ani „zapomnieć” opłaty.
- **Niezmienniki** (testy): NAV rośnie o saldo × Δkurs / udziały; gotówka całkowita = PLN + waluty × kurs; ujemne salda/PLN zakazane; średni kurs nabycia skończony; wymiany nie zmieniają PLN przy obca↔obca i obniżają NAV dokładnie o spread; odmowa nie rusza sald.
- Pominięte celowo: odsetki/koszt utrzymania sald (plan: „opcjonalnie”).

### W2. Podzbiór: fundamenty → kurs, sonda, zegar
- **Fundamenty na kurs:** tygodniowy składnik log-zwrotu `FOREIGN_CO.fairPull × luka` (luka = wartość godziwa/kurs − 1, obcięta do −50%…+100%; ×0,88 przy stracie), parytet z krajowymi (`PRICE_MEAN_REVERSION_PER_TICK` 0,0003 × 60 ticków na tydzień = 0,018). Skok po raporcie (±2% × niespodzianka) zostaje. Korelacja z GIG bez zmian (mediana kwartalna 0,64 → 0,67; test G5 przechodzi), czas kroku w budżecie.
- **Sonda** (`foreignStats`, pole `foreign` w wyniku `tests/przebiegi.html`): na grę (24 gry ×27 kw., 10 krajów) raporty 3541, dywidendy 1962 (55% raportów), splity 11,5, konsolidacje 0,1, upadłości 0,0, ratunki 0,0, zmiany prezesa 3,8; spółek na końcu 136; mediana |ln(wartość godziwa/kurs)| = 0,152.
- **Zegar giełd:** sprawdzony klikiem w oknie Kantory24 → Rynki zagraniczne (zrzut: 4 zegary, pas sesji, statusy tekstem), pełne odświeżenie karty ≈ 14 ms; przy prędkościach ≥ ×5 doba gry mija w < 2 s, więc o odczycie decyduje status tekstem, nie wskazówki (×200 istnieje tylko w narzędziu przebiegów).

## Pomiar (2 × 12 gier × 27 kw. ×200, preset `kraje-10`; kod nowy vs baza `712d1e7`, ten sam harness, obie serie równolegle)
| Seria (n = 24) | GIG CAGR śr. ± odch. | z przejęciem naszej giełdy (n) | bez przejęcia (n) | Marża | Zapis (znaki, śr.) | w tym kraje | Czas kroku (śr. ms/kw.) | Niezmienniki / ujemna gotówka / wyjątki JS / problemy krajów |
|---|---|---|---|---|---|---|---|---|
| baza 0.16.9 | 10,1% ± 3,7 (mediana 10,2) | 9,2% (10) | 10,7% (14) | 21,3% | 2,362 mln | 111 tys. | 1557 | 0 / 0 / 0 / 0 |
| 0.16.9 W1–W3 | 10,6% ± 3,7 (mediana 10,3) | 10,5% (12) | 10,7% (12) | 22,9% | 2,387 mln | 114 tys. | 1616 | 0 / 0 / 0 / 0 |

- **GIG: +0,5 pp ± 1,1** (w granicach ±1 pp): bez przejęcia **0,0 pp** (n 14 vs 12), z przejęciem +1,3 pp (n 10 vs 12, rozrzut duży). Pierwsza partia 12 gier dała +1,9 pp ± 1,6, druga −0,9 pp — rozrzut gier (σ ≈ 3,7 pp) przekracza ±1 pp przy < 24 grach; stąd 24 + 24.
- **Czas kroku: +3,8%** (budżet ≤ +15%), **zapis: +1,0%** (budżet ≤ +12%; kraje 111 → 114 tys. znaków: `divHistory`), niezmienniki 0, brak zawieszeń i wyjątków JS.
- **Marża końcowa +1,6 pp** (21,3 → 22,9%, błąd różnicy ≈ 0,7 pp, w obu partiach ten sam znak) — **nie wyjaśniona**: zmiany dotyczą kursów spółek obcych i interfejsu, nie liczą marży spółek krajowych; możliwa ścieżka pośrednia (boty zagraniczne i kryzysy przenoszone), możliwy szum. Do sprawdzenia przy kolejnej serii bazowej (A/A).
- Surowe serie (`k69_base_24.json`, `k69_new_24.json`) i skrypt porównania (`porownaj.mjs`): notatki sesji `serie_0169/`, nie w repozytorium.

## Sprawdzone w przeglądarce (podgląd aplikacji)
Karta spółki obcej (Przegląd z wykresem, Finanse, nagłówek z walutą i krajem) i lista z obcymi wierszami w grupach poziomów (szuflada handlu, kłódka poziomu); okno „Gotówka funduszu” (salda, wynik kursowy, formularz). Szerokość 390 px: bez przewijania poziomego strony, karta czytelna; w oknie sald tabela zmieniona na 4 kolumny (kurs pod saldem). Klawiatura: przycisk karty i pasek gotówki (`role=button`, Enter/Spacja) działają; wiersze sald wybieralne Enterem. Zrzuty wykonane w oknie podglądu (nie zapisane w repozytorium).

## Pominięte i problemy
- **Nie zrobione z W2 (koszt/ryzyko):** (1) M&A między obcymi spółkami i przejęcia obcych na pełnych zasadach `ma.js` (2028 wierszy związanych ze `stocks`; dziś: próg wezwania i drabina nadzoru z 0.16.3/0.16.6); (2) spółki zależne i walne zgromadzenia obcych (karta mówi wprost, że nie działają; zakładka „Grupa” pokazuje spółkę niezależną); (3) strajki i rynek pracy obcych (zależne od 0.21). Wymagają włączenia obcych do `stocks` (wariant A) albo własnych odpowiedników z pomiarem budżetu — osobna wersja.
- **Poziomy obcych bez efektów rynkowych:** brak premii zmienności elit, awansów z ±3% i giełdy elitarnej dla krajów niepołączonych; Szmaragd/Rubin obcych mają własne limity, więc na liście Szmaragdu mogą stać obok krajowych (w pomiarze Szmaragd obcych praktycznie nie występuje: 0,0–0,1 spółki na grę).
- **Karta obca w PLN:** kwoty finansowe w karcie są przeliczone po bieżącym kursie (w nagłówku także cena w walucie spółki); wskaźniki C/Z, C/WK nie zależą od kursu, kwoty tak (wartość godziwa z fundamentów liczona w walucie, potem przeliczona). Widok jest kopią — zmiany w karcie nie wracają do spółki (brak akcji zarządczych).
- **Okno sald:** nie odświeża się samo wraz z kursem (odświeża się po wymianie i ponownym otwarciu); wynik kursowy po migracji v19 liczony od dnia wczytania. Wymiana nie ma ręcznego wyboru „najtańszy kantor” (okno pokazuje wybrany kantor; porównanie jest w Kantory24).
- **Opłata za zarządzanie z zapasem 8 tygodni** przewalutowuje na wyrost (do ok. 8 opłat); nadwyżka zostaje na koncie PLN. Dobrowolne wydatki poza kupnem akcji krajowych nie mają jeszcze podpowiedzi o walutach.
- **Marża +1,6 pp w pomiarze:** zob. wyżej.
- **Przebiegi:** pierwsza próba serii nowego kodu zawisła na „Start…” (szablon w szablonie w moim wpisie sondy w `przebiegi.html`; wykryte po konsoli, poprawione); porty 8801 i podobne były zajęte przez inne sesje (użyto 8869–8871). Pliki serii czytane na żywo: serie szły z osobnych worktree (baza `712d1e7`, nowy kod z commita), więc edycje kodu w trakcie nie wpływały na pomiar.
- **Nie sprawdzone:** zapis do pliku/`localStorage` i wczytanie z klikaniem w menu (cykl `buildSaveSnapshot` → JSON → `validateSaveSnapshot` → `applySaveSnapshot` w działającej aplikacji z saldami EUR/USD, `basis` i `divHistory` obcej spółki: salda, kurs nabycia, gotówka i historia dywidend identyczne, niezmienniki 0, błędów 0); wąski ekran okna sald po zmianie kolumn (zmiana po zrzucie).
