# Kontrola 0.16.1 „Waluty i kantor” (2026-10-27)

- **Kod:** gałąź `claude/impl-0161-1fb89b` (od `d67a8f5` = 0.15.6, nie scalona). Nowe: `currency.js` (waluty, kursy, kantor), `gdr.js` (kwity i wydarzenie „Gigant”), `currency_ui.js` (okno Kantor, zakładka Obce, okno wydarzenia, 3 hasła Akademii); haki w `player.js`, `core.js`, `main.js`, `ui.js`, `companies.js`, `index.html`, `style.css`.
- **Testy:** 729/729 (712 dotychczasowych + 17 nowych w grupie „0.16.1”; dwa stare testy wersji zapisu przepięte na „bieżąca wersja”).
- **Zapis:** v16, migracja v15 → v16 (kursy startowe, bez walut i GDR; ostrzeżenie w raporcie wczytania; test). Przyrost: sekcja `currencies` ≈ 8 tys. znaków + `gdr` < 2 tys. na ≈ 2,2 mln = **≈ 0,4%** (cel ≤ 3%).
- **Wzorzec:** `raporty/baza_0.16.md`. Serie: 20 × 6,5 roku bez presetu (`k65_0161b`), 20 × 6,5 `fundusz-gig` (`k65g_0161b`), 12 × 20 lat `fundusz-gig` (`k20_0161b`).

## Co zrobiono

| Część | Zakres |
|---|---|
| G0 | patrz `baza_0.16.md` (sondy, pułap napływu, mandaty, baza) |
| G1 | usunięte KolenBreg, Firma Tłusta Pucha, Luksusowe Spinacze, Boazeria Organiczna, DarAwansu, Six Hand; Miejskie Ziemniaki, Bałtycka Energia; Bank Żywności → Bank Rolno-Spożywczy (sektor Bankowość); Gaming: DVD Project Black, WayPlay; znacznik pochodzenia PL/UNI (`getCompanyOrigin`, niezapisywany) |
| G2 | 9 walut z widełkami (załącznik F), kurs: powrót do średniej + dryf średniej ±10%/rok + szum + wpływ kryzysu; `toPln/fromPln`; gotówka walutowa gracza (`playerCashByCurrency`) i botów (`cashByCurrency`) wchodzi do NAV i majątku; kantor (spread 2% do 50 tys., 1,5% do 1 mln, 1% powyżej, opłata księgowana); przymusowa płynność sprzedaje najpierw walutę |
| G3 | 14 gigantów z załącznika B (instancja przy pierwszej potrzebie), GDR `XXX.GDR` (cena = obca × kurs ± 0,5%), pula kwitów 1 mln, niezmiennik; wydarzenie (11,5%/kw., przerwa ≥ 4 kw.): 70% GDR, 30% zagraniczne przejęcie spółki krajowej |
| G4 | okno Kantor (kursy, wykres z widełkami, wymiana, spread słowem i liczbą), zakładka Obce (filtr kraj/waluta), okno „Gigant wkracza na scenę” z pauzą, „kraj · waluta” w karcie spółki, hasła „Ryzyko walutowe”, „Spread”, „ADR/GDR” |

## Wyniki (tabela „Jak sprawdzimy”)

| Miara | Cel | Wynik | Stan |
|---|---|---|---|
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 | 0 w 52 grach (+1 ostrzeżenie w 20 latach) | ✅ |
| Testy | 596 + nowe | 729/729 | ✅ |
| GIG 6,5 r. bez presetu vs baza | ±1 pp | 9,7% vs 10,7% (−1,0 pp, w szumie ±1,1) | ⚠ granica |
| GIG 6,5 r. `fundusz-gig` | ±1 pp | 10,1% vs 11,0% (−0,9 pp) | ✅ w szumie |
| GIG 20 lat | ±1 pp | 13,1% vs 13,1% (mediana) | ✅ |
| Marża końcowa | ±0,5 pp | 22,0 vs 22,1; 22,7 vs 22,3; 20,6 vs 21,0 | ✅ |
| Tożsamość NAV przy samym PLN | identyczny | test (pusta gotówka walutowa nie zmienia majątku) | ✅ |
| NAV a ruch kursów | ekspozycja × zmiana ± 0,1 pp | test (+8% EUR) | ✅ |
| Kursy w widełkach | 100% | 10 000 tygodni × 9 walut + długi kryzys; `fxProblems` 0 w 20 grach | ✅ |
| Spekulacja kup nisko / sprzedaj wysoko | ≤ lokata + 4 pp | ≈ 2,4%/rok przy lokacie 3% (symulacja 200 × 20 lat) | ✅ |
| Spread kantoru | 1–2% | 1,0 / 1,5 / 2,0% wg kwoty | ✅ |
| Cena GDR vs obca × kurs | ± 1% | ±0,5% (test) | ✅ |
| Gigant: zdarzenia | 2–4 w 6,5 r., ≤ 1/rok; GDR 60–80% | śr. 1,95 (1–4), odstęp ≥ 4 kw., GDR 74% | ⚠ średnia tuż poniżej 2 |
| Zapis: przyrost | ≤ +3% | ≈ +0,4% | ✅ |
| Czas kroku | +≤ 3% | 1,96 / 1,95 / 1,82 s vs baza 3,2 / 3,1 / 1,86 s — nieporównywalne (inna liczba równoległych przebiegów) | ⚠ niemiarodajne |
| Fundusz = GIG: udziały, zaufanie | ±3%/rok, 45–55 | 9/12 gier w ±3%, zaufanie 45–55 w 4/12 | ⚠ |

## Pominięte i problemy

1. **Boty nie handlują walutą ani GDR** — pole `cashByCurrency` i wycena są, ale nikt nie kupuje (boty zagraniczne dopiero w 0.16.2). Fundusze botów pominięte.
2. **GDR kupuje tylko gracz;** brak dywidend zagranicznych emitentów, brak GDR w ETF-ach, rankingu i zastawie; kwity nie wchodzą do mandatów. Zagraniczne przejęcie to natychmiastowy wykup wszystkich akcjonariuszy z premią 25–45% (bez procesu M&A z `ma.js`, arbitrażu i progu wezwania — plan zakładał ich użycie). Cel przejęcia ma te same zabezpieczenia co wycofanie z giełdy; płatność księgowana jako wpływ z zewnątrz.
3. **`toPln` tylko tam, gdzie jest obca wartość:** NAV, majątek podmiotu, niezmienniki. Kapitalizacja, ETF, podatki — bez zmian, bo wszystkie spółki są w PLN. Podatek od zysku kursowego: fundusz nie płaci podatku od zysków (jak przy akcjach), obciążają go klienci przy umorzeniu; brak podatku dla konta prywatnego (kantor tylko dla funduszu).
4. **Bank Rolno-Spożywczy** to tylko zmiana nazwy i sektora (bez księgi banku, depozytów, typu banku). Znacznik PL/UNI nic jeszcze nie wyłącza.
5. **Częstość „Gigant”:** średnia 1,95 w 6,5 roku (cel 2–4); szansa 11,5%/kw. do ewentualnego podniesienia. Ceny obcych gigantów: model uproszczony (dryf 8%/rok, −20% w bessie, zmienność wg beta sektora), bez korelacji z krajem pochodzenia.
6. **Interfejs bez czatu designu** (zlecenie 1 z planu): wygląd z komponentów 0.14.5, ikony SVG ze sprite'a, brak flag krajów i ikon walut (kody tekstowe); okno kantora sprawdzone ręcznie w przeglądarce, bez testów DOM. Wydarzenie pauzuje grę; w przebiegach pauza jest blokowana.
7. **Pułap napływu (G0b):** zaufanie 45–55 w 4/12 gier; odziedziczony wysoki GIG 20 lat (13–14%) nadal nie naprawiony.
8. **Niezmierzone:** czas kroku (obciążenie maszyny), czas zapisu/wczytania, liczba gigantów w 20 latach (seria 20-letnia bez sondy), zapis gracza przy ×1, G0a: upadki w liniach wg dźwigni, sektory w linii, stopy, misje IR/VIP (zob. `baza_0.16.md`).
9. **G2 i G0b w jednym commicie** zamiast osobnych G2a–G2d (zmiana weszła razem, testy po całości).

## Zmiany po uwagach użytkownika (2026-10-27)

1. **Flagi i ikony walut:** `flags.js` — flagi 10 krajów i UE oraz ikony 10 walut jako SVG z podpisem (kantor, zakładka Obce, okno wydarzenia); test.
2. **Indeksy:** TIG5 zastąpiony SIG40, dodany BSIG80. Na starcie tylko GIG i SIG20; **Bank Centralny decyduje** o uruchomieniu SIG40 (od 45 spółek) i BSIG80 (od 90 spółek, po SIG40), 25% szansy na kwartał, decyzja zapisana w `centralBank.indexes`. W 8 grach × 20 lat SIG40 powstał w 8, BSIG80 w 1. Interpretacja polecenia „bank centralny decyduje” — do potwierdzenia.
3. **Emisja tylko przez kampanię:** emisja ciągła (organiczny napływ, dopłaty, lokaty spółek, zainteresowanie wielkich inwestorów) wycofana z gry (flaga `openSubscriptions` zostaje wewnętrznie dla testów); przycisk „Kampania emisyjna…” prowadzi do panelu Klienci i udziały. **Emisja wymuszona zamieniona w ofertę dużego klienta**: nie dodaje udziałów, gracz może ją przyjąć (kampania na proponowaną liczbę udziałów, ważna 4 kwartały). Starsze zapisy: flaga czyszczona przy wczytaniu.
4. **Zaufanie:** premia do zaufania za wyprzedzanie innych funduszy w ostatnim okresie (0 w dolnej połowie rankingu, do +8 za 1. miejsce). Punkt odniesienia klienta zależy od typu: emeryt, ostrożny, strachliwy, sknera, funkcjonariusz — zysk w ostatnim czasie (ponad ok. 1,5%), instytucja, inwestor, bogaty — SIG20, reszta — GIG.
5. **Test SIG20 vs GIG** (20 gier × 6,5 roku i 8 × 20 lat, `fundusz-gig`): SIG20 przewyższa GIG we wszystkich grach (średnio 11,2% vs 8,7% w 6,5 roku, 16,0% vs 13,7% w 20 lat). **Wniosek: SIG20 jako wspólny punkt odniesienia utrudniłby wynik** (o ok. 2,5 pp rocznie), więc zostaje GIG dla większości, a SIG20 tylko dla typów „wymagających”.

**Skutek pomiarowy:** w presecie `fundusz-gig` (bez kampanii) udziały teraz tylko maleją przez umorzenia: −8,2%/rok w 6,5 roku (12 gier), **−2,7%/rok w 20 lat (8 gier, zakres −4,3…−0,3%)** przy zaufaniu medianie 54. Liczby bazy z `baza_0.16.md` dotyczące udziałów i zaufania z `fundusz-gig` są przez to nieaktualne (GIG i marża bez zmian: 13,4%, 21,6% w 20 latach). Czy presety mają robić kampanie, żeby fundusz rósł — do decyzji.

**Niesprawdzone:** wpływ premii za ranking i nowych punktów odniesienia na zaufanie przy graczu aktywnie wybierającym akcje (preset `gracz-akcje` bez nowej serii); wygląd oferty dużego klienta w panelu (bez zrzutu); testy: 733/733.

## Banki jako kantory, Kantor Miejski, bank międzynarodowy (2026-10-27)

- **Dostawcy kursów** (`currency.js`): kantor gry (standard) + aktywne banki trzech typów + **Kantor Miejski** (nowa spółka miejska, `willList: false`, nigdy nie wchodzi na giełdę; zysk ze spreadów zasila jej budżet). Każdy ustala własny spread (zakres wg typu) i własne przesunięcie kursu (≤ ±30% spreadu), odświeżane co kwartał (13 tygodni gry); oferty zapisywane w v16 (pole opcjonalne `currencies.offers`).
  - **E-bank** (Internetowy): spread 1,0–1,6%, EUR/USD/CHF/CZK/SEK, limit 300 tys. zł na transakcję.
  - **Bank uniwersalny:** 1,7–2,6%, te same pięć walut, bez limitu.
  - **Bank międzynarodowy:** 0,6–1,1% od 100 tys. zł (poniżej spread ×2), wszystkie 9 walut; **obsługa spółek zagranicznych:** kwity GDR kupione przez niego mają połowę spreadu depozytowego (0,25%); jego spread zasila gotówkę banku.
  - **Kantor Miejski:** 1,2–2,0%, EUR/USD/CZK, limit 30 tys. zł.
  - Banki inwestycyjne, korporacyjne, spółdzielcze i hipoteczne nie mają funkcji kantorowej.
- **Interfejs:** w oknie Kantor wybór kantoru i tabela porównawcza kursów kupna i sprzedaży z oznaczeniem najlepszego słowem; w zakładce Obce wybór pośrednika dla GDR.
- **Testy:** 737/737 (4 nowe): skład i typy dostawców, Kantor Miejski poza giełdą, zakresy spreadów i limity, brak arbitrażu między kantorami, tańszy bank międzynarodowy przy dużej kwocie, księgowanie spreadu do banku i spółki miejskiej, GDR przez bank, zapis i odświeżanie ofert.
- **Pominięte:** typ „międzynarodowy” już istniał (Gildia Handlowa, Bank Klasy Światowej) — dostał funkcje zamiast powstawać jako nowy typ; boty i banki nie handlują same walutą (kursy dostawców to tylko oferta dla gracza); kapitał banków nie jest obciążany kwotą wymiany (tylko dochód ze spreadu); „obsługa spółek z innych państw” ograniczona do GDR (spółki zagraniczne dopiero w 0.16.2); Kantor Miejski dopisany do 8 spółek miejskich (starszy zapis nie zapisuje listy spółek miejskich, więc powstaje przy każdym starcie); brak testów DOM i zrzutu okna w trzech rozdzielczościach.
