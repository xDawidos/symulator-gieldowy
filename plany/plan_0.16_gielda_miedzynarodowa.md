# Plan 0.16 „Giełda międzynarodowa” (po 0.15.3 „Wielkie Kryzysy”; mapa całości: `plan_0.13-0.16_mapa.md`; audyt: `raporty/audyt_planow_0.16.x.md`)

Cel: nasza giełda wychodzi za granicę, w czterech podwersjach, każda z własnym pomiarem i commitami.

| Podwersja | Tytuł | Co dostaje gracz | Części |
|---|---|---|---|
| **0.16.1** | Waluty i kantor | waluty, kantor, ryzyko walutowe; zagraniczni giganci jako kwity depozytowe (GDR) i zagraniczne przejęcia; zapis v16 | G0–G4 |
| **0.16.2** | Pierwsze rynki | Niemcy, USA, Czechy jako pełne rynki; lotnisko i bilety; boty zagraniczne; zarażanie kryzysów między krajami | G5–G10 |
| **0.16.3** | Europa i połączone giełdy | Szwecja, Szwajcaria, Francja; przejęcia i łączenie giełd (wariant B); wspólnota europejska; spółki specjalne; prezesi krajowi; nowe boty (Graham, Wilk); nadzór za granicą | G11–G17 |
| **0.16.4** | Azja i forex | Japonia, Chiny, Indie, Tajwan; PanDa Bank; boty azjatyckie; forex z dźwignią; kontrola końcowa 0.16 | G18–G22 |

Czego to uczy:
- **Ryzyko walutowe:** zysk z akcji zagranicznej może zjeść kurs waluty; spread kantoru; kwity depozytowe (ADR/GDR).
- **Forex, dźwignia i depozyt zabezpieczający** (margin call).
- **Przewagi narodowe:** dlaczego Niemcy mają motoryzację i chemię, Tajwan półprzewodniki, a Szwajcaria banki.
- **Zarażanie kryzysów i korelacja rynków:** kryzys z jednego kraju dochodzi do innych z opóźnieniem.
- **Konsolidacja giełd:** co oznacza dla prowizji, płynności i inwestorów.

Kolejność: G0 → G1 → … → G22 (podwersje po kolei). **Commit po każdej części** (część z kilkoma krokami — commit po każdym kroku). Przebieg ×200 po każdej podwersji; stan wyjściowy porównujemy z **bazą 0.16 z G0**.

UI z komponentów 0.14.5. **Projekt wyglądu zlecamy czatowi designu** (zlecenia na końcu).

**Zależność:** po 0.15.3 i po 0.15.4–0.15.6 (poprawki z gry, Budownictwo i banki, Giełdy wejścia — baza G0 mierzona dopiero po nich) (stan nastroju jest per rynek: `marketRegimes`; silnik linii kryzysu `crisisLine` i `sectorShocks[]` z `crises.js`). Korzysta z segmentów (0.14 T1), podsektorów (T2), nisz (T3), spin-offów (T4), spółek zależnych (T6), pracowników (0.13), progu wezwania i KNF (0.15.1) oraz kampanii i mandatów (0.15.2).

**Odrzucone lub odłożone z szkicu** (szczegóły w `raporty/audyt_planow_0.16.x.md`):
- giełda towarowa, transport, łańcuchy produkcyjne → **0.17** i **0.18**; cła, WTO, embarga → **0.19**;
- podwójne notowanie i córki zagraniczne → **0.20** (w 0.16 tylko GDR jako instrument pochodny);
- powrót CFD i krótkiej sprzedaży akcji — nadal nie; **forex ma pozycje krótkie tylko w parach walutowych** (jedyny wyjątek, bez wpływu na akcje).

---

## Punkt wyjścia (stan kodu po 0.15.3)

| Element | Gdzie | Stan |
|---|---|---|
| Kraje startowe | `START_COUNTRIES` (`player.js`) | PL, DE, CZ, SE, CH, US, JP, CN, IN; poza PL zablokowane, z `passCost`. **Tajwan i Francja do dopisania** (G11, G18) |
| Operatorzy rynków | `finance.js` (markets) | GPW, XTD, PLU5, uśpiony EURONEXT (`dormantForever`); prowizje, opłaty za notowanie i inwestowanie w spółki członkowskie |
| Sektor Gaming | `core.js`, `companies.js` | profil i technologie, **ani jednej spółki** |
| Akcje w obrocie | `getTrackedHeldShares`, `getAvailableShares`, `checkWorldInvariants` | niezmiennik „akcje w obrocie = suma posiadaczy” musi objąć obce waluty i nowych posiadaczy |
| Limity spółek | 0.13.1 | krajowe luźno ok. 110 (111–115 w porządku), łącznie 150; **spółki zagraniczne poza nimi**, własny limit na kraj |
| Nastrój i fazy | `marketRegimes` (0.15) | per rynek; gotowe do dopisania rynków zagranicznych |
| Linie kryzysu | `crises.js` (0.15.3) | 5 linii, `crisisLine`, `sectorShocks[]`; **bez pola kraju** — zarażanie to G9 |
| Pracownicy | 0.13 | model dla kraju startowego; zagranica ze **stałym profilem kraju** (tabela w załączniku B) |
| Parabank | 0.11, 0.11.5 | PanDa Bank używa tej mechaniki |
| Próg wezwania, KNF | 0.15.1 | tylko kraj startowy; za granicą G16 |
| Zapis | 0.14.3 | IndexedDB (`gz`) + kopia `lz16`; 3,26 MB po 20 latach w 0.14 (bez limitu twardego, ale koszt czasu zapisu); **cel przyrostu ≤ 3% na część** |
| Testy | `tests/tests.html` | 596/596 |

---

# Podwersja 0.16.1 „Waluty i kantor”

Zapis **v16** (migracja v15 → v16: waluty i kantor, bez krajów).

## G0. Pomiar bazowy i domknięcie 0.15

Przed jakąkolwiek zmianą rynku. Zmiany w kodzie tylko w G0b–G0c i w sondach; wszystko opisane w raporcie `raporty/baza_0.16.md`.

- **G0a Sondy** w `tests/przebiegi.html` (niezmierzone z kontroli 0.15.2 i 0.15.3):
  - **bajty zapisu** wg sekcji i **na spółkę** (historia cen i świec, dzienniki, segmenty, newsy, rejestry, klienci); czas zapisu i wczytania; czas kroku (s/kw. przy ×200);
  - upadki w linii wg dźwigni (czy ≥ 70% z górnych 25%); wynik sektorów zyskujących względem GIG w linii; kierunek stóp w linii; 5 gier na każdą linię (zrobiono 3);
  - preset **`gracz-aktywny`**: kupuje akcje (w tym defensywne i wzrostowe), robi kampanie emisyjne w Hossie i w Bessie, używa IR i VIP-ów — mierzy bessę z lock-upem, misje IR, VIP i mandaty.
- **G0b Dryf liczby udziałów (`fundusz-gig`, 20 lat; decyzja 2026-10-25: diagnoza i pułap):**
  - rozbicie napływu na źródła: organiczny, kampanie, VIP, dopłaty, rynek wtórny;
  - **pułap napływu organicznego malejący z wielkością funduszu** (pojemność strategii): napływ netto ≤ X% NAV rocznie, X malejące z NAV; wartość z pomiaru;
  - cel: udziały ±3%/rok w 20 latach przy `fundusz-gig`, zaufanie 45–55; bez zmiany dla gier ≤ 6,5 roku.
- **G0c Mandaty:** po pomiarze z `gracz-aktywny` kalibracja progów (cel: naruszenia ≤ 30% przy graczu naprawdę kupującym akcje danego typu).
- **G0d Odstępstwa 0.15.3 do rozstrzygnięcia:** „debiuty startupów 3× rzadziej w bańce internetowej” i „dźwignia botów w Czarnym czwartku” — dokończyć albo skreślić z planu 0.15.3 (decyzja w raporcie, bez budowy dużych rzeczy).
- **G0e Baza 0.16:** 20 + 20 gier × 6,5 roku (bez presetu i `fundusz-gig`) + 10 × 20 lat: GIG, marża, zapis, czas kroku, ostrzeżenia. **Liczby z raportu są wzorcem dla wszystkich kolejnych pomiarów 0.16.**
- **Testy:** przepięte pod nowe liczby; test pułapu napływu.
- **Commity:** G0a (sondy i raport pomiarowy), G0b, G0c (jeśli potrzebne), G0e (raport bazowy).

## G1. Porządki spółek (nowe gry)

Zmiany tylko w nowych grach; stare zapisy zachowują swoje spółki. Lista w załączniku A.
- Znacznik pochodzenia spółki: `PL` (tylko przy starcie w Polsce) albo `UNI` (zawsze).
- Zmiany nazw (Miejskie Ziemniaki, Bałtycka Energia), usunięcia (KolenBreg, Firma Tłusta Pucha, Luksusowe Spinacze, Boazeria Organiczna, DarAwansu, Six Hand).
- **Bank Żywności → bank** (sektor Bankowość, nazwa **Bank Rolno-Spożywczy** — propozycja przyjęta domyślnie).
- **Gaming:** nowe spółki DVD Project Black, WayPlay (PL).
- Testy odwołujące się do usuniętych symboli przepiąć na inne spółki, bez zmiany sensu testu.
- **Commit G1.**

## G2. Waluty i kantor (fundament; największe ryzyko regresji)

Waluty i widełki — załącznik F.
- **G2a Rejestr walut** `CURRENCIES` (PLN, EUR, USD, CHF, SEK, CZK, CNY, JPY, INR, TWD), kursy: ruch powracający do średniej w twardych widełkach, **średnia dryfuje wolno** (±10%/rok w widełkach), szum, wpływ różnicy stóp (do G5 stała), krachów i linii (walutowe „bezpieczne przystanie” CHF, JPY, USD zyskują, słabsze tracą). **Commit.**
- **G2b `toPln(amount, currency)` wszędzie** (NAV, kapitalizacja, ETF, ranking, podatki, niezmienniki, ocena zarządu). Przy samym PLN wynik **identyczny** (test: ten sam stan → ten sam NAV; ×200 z ziarnem, jeśli przebiegi mają ziarno). **Commit.**
- **G2c `cashByCurrency`:** gracz (fundusz), boty, fundusze botów. Zysk kursowy opodatkowany jak zysk kapitałowy. **Commit.**
- **G2d Kantor:** kupno i sprzedaż z marżą 1–2% (mniejszą dla dużych kwot), dostępny od startu, spekulacja walutami, wykres kursu. **Zabezpieczenie przed pewnym zyskiem:** strategia „kup w dolnych 20% widełek, sprzedaj w górnych 20%” musi dawać ≤ lokata + 4 pp rocznie (miara). **Commit.**
- **Testy:** NAV z akcjami w EUR, potem zmiana kursu → NAV zmienia się tylko o efekt walutowy; spread; tożsamość przy samym PLN; podatek; zapis i wczytanie; kursy w widełkach (10 000 kroków).

## G3. Kwity depozytowe (GDR) i „Gigant wkracza na scenę”

**GDR jako instrument pochodny (decyzja 2026-10-25).** Pełne podwójne notowanie i córki zagraniczne dopiero w 0.20.
- **Dane:** ok. 10 gigantów zagranicznych (z tabel załącznika B, oznaczonych „gigant”): definicja jedna, **instancja tworzona przy pierwszej potrzebie** (GDR albo dołączenie kraju w 0.16.2). Obcy emitent w wersji **uproszczonej** (cena w swojej walucie wg profilu sektora i kraju, bez pracowników i segmentów).
- **GDR:** symbol `XXX.GDR`, cena = cena obca × kurs × (1 ± spread depozytowy 0,5%), pula kwitów jako własny float (1:1 w depozycie; zasada niezmiennika: posiadacze GDR = float). Przy dołączeniu kraju (G6) konwersja kwitów 1:1 w akcje.
- **Wydarzenie** (pauza gry, okno z wynikiem; ok. raz na 2 lata, ≤ 1 na rok): (a) **notowanie GDR giganta** (domyślnie 70%) albo (b) **zagraniczne przejęcie** spółki kraju startowego przez istniejący proces M&A z obcym inicjatorem (`ma.js`; arbitraż i próg wezwania z 0.15.1 działają bez zmian; akcjonariusze dostają gotówkę w PLN po kursie).
- **Testy:** cena GDR vs cena obca × kurs; niezmiennik z GDR; wydarzenie (częstość, ≤ 1/rok); przejęcie obce: rozliczenie w PLN, brak ujemnej gotówki; zapis.
- **Commit G3** (G3a GDR, G3b przejęcie obce).

## G4. Interfejs, zapis v16, Akademia i kontrola 0.16.1

- **Interfejs:** okno kantoru z wykresem; zakładka „Obce” (GDR, filtr po kraju i walucie); karta spółki: kraj, waluta, cena w walucie i w PLN; okno wydarzenia „Gigant wkracza na scenę”.
- **Zapis v16:** kursy, `cashByCurrency`, GDR i float, szansa wydarzenia; migracja v15 → v16. **Przyrost ≤ 3%.**
- **Akademia:** „Ryzyko walutowe”, „Spread”, „ADR/GDR”.
- **Kontrola:** pomiar według tabeli „Jak sprawdzimy”, raport `raporty/kontrola_0.16.1.md`, wiersz w mapie. **Commit G4** (+ commit raportu).

---

# Podwersja 0.16.2 „Pierwsze rynki”

Pola opcjonalne w v16 (bez zmiany numeru zapisu).

## G5. Platforma rynku zagranicznego

- **`COUNTRY_DEFS` w kodzie** (spółki, profil, operator, prowizje) — **nie w zapisie**. Zapisujemy tylko kraje, które dołączyły, i ich spółki w wersji uproszczonej.
- **Operator rynku** jak GPW (prowizja, opłata za notowanie), spółki kraju w osobnej zakładce rynku z flagą i walutą.
- **Limity:** 1,5 × liczba startowa kraju; poza krajowymi ok. 110 i łącznymi 150; upadłości, przejęcia i wchłonięcia córek zwalniają miejsce; spin-off ponad limit tylko jako carve-out.
- **Profil kraju dla pracowników** (model 0.13, stały profil: prawa pracownicze, szansa związku, szara strefa — załącznik B). Marży nie zmienia. Klasy, ustawy, partie, migracja tylko w kraju startowym.
- **Stopa kraju:** prosty proces powracający do średniej (bez banku centralnego, partii i budżetu), wpływa na kurs (G2a) i `rateSens` wycen spółek kraju.
- **Nastrój per rynek:** `marketRegimes[kraj]` skorelowany z krajem startowym (wzór w G9).
- **Zapis uproszczony (część ograniczeń, decyzja 2026-10-25):** historia cen spółek zagranicznych 25% długości, bez pól wyliczalnych, krótsze newsy; cel ≤ 6 KB na spółkę. Po pomiarze w G6 **jeśli za dużo — kolejny poziom redukcji** (co 4. punkt historii; jeden rodzaj dziennika).
- **Niezmienniki** akcji w obrocie dla obcych walut i nowych posiadaczy; spółki państwowe: pakiet poza wolnym obrotem, dywidendy do „skarbu kraju X” (licznik tylko do wglądu), obce państwo nie korzysta z `governmentTreasury`.
- **Testy:** limity, niezmienniki, zapis lite, profil kraju w modelu pracowników.
- **Commit G5.**

## G6. Trzy kraje: Niemcy, USA, Czechy

Dane z załącznika B (DE 13 + 3 państwowe, US 15 + 4, CZ 8 + 1).
- **G6a Nowe sektory** w `SECTORS`: Motoryzacja (grupa Przemysł i surowce), Alkohole (Konsumpcja; podsektor Piwowarstwo i napoje) — z tabeli załącznika C; banki z tabel dostają sektor **Bankowość** i podsektor, nie Finanse. **Commit.**
- **G6b DE, G6c US, G6d CZ:** spółki z definicji przy dołączeniu, **gigant na wyższym poziomie giełdy**, debiuty krajowe i spin-offy zależne od koniunktury kraju, konwersja GDR 1:1, spółki państwowe. Spółki specjalne tylko **proste** (jeden modyfikator: Palant-YR, Pear, Panzerwafel GmbH, Pivovar Bohemia itd.); ciężkie (Waschmabank, PanDa Bank) w 0.16.3 i 0.16.4. **Commit na kraj.**
- Kraj „dołącza” w tej części przez narzędzie testowe i preset; ścieżki dla gracza — G7.
- **Pomiar rozmiaru:** bajty na spółkę zagraniczną i na kraj (po 6,5 roku z DE, US, CZ). Cel < 6 KB/spółkę; powyżej → druga redukcja z G5.
- **Testy:** dołączenie kraju (spółki, limit, waluta), niezmienniki, tożsamość NAV dla gracza bez walut.

## G7. Lotnisko i bilety

- **Zakładka Miasto:** miasto zleca budowę lotniska przez istniejące przetargi budowlane (zarabiają spółki budowlane).
- **Bilety** (licencje na rynek kraju; ceny z `START_COUNTRIES.passCost`): **każdy inwestor osobno** (gracz za gotówkę funduszu, boty i fundusze botów za swoje). Z biletem inwestor kupuje spółki kraju przez kantor z prowizją np. 0,6% zamiast 0,25%. Każdy sprzedany bilet daje mały bonus Turystyce.
- **Wydarzenie:** bot albo fundusz z innego kraju wchodzi na rynek kraju startowego (nowy posiadacz z gotówką w swojej walucie).
- **Animacja po zakupie** (samolot startuje w chmury, ok. 2 s, pomijalna, wyłączona przy `prefers-reduced-motion`) — **wykonanie przez czat designu**; w kodzie tylko haczyk.
- **Testy:** bilet gracza i bota, brak dostępu bez biletu, prowizja, bonus Turystyki.
- **Commit G7** (G7a lotnisko, G7b bilety i wydarzenie).

## G8. Boty zagraniczne (Niemcy, USA, Czechy)

Michael „Dad” Santos (USA, start w USD, polskie spółki losowo, amerykańskie „idealnie” wg fundamentów), Peter „Lech” Kozel (Czechy, EUR i CZK, 20% na wydatki prywatne), niemiecki wieloryb (stabilne spółki, unika polskich). Pojawiają się dopiero po dołączeniu kraju; gotówka w walutach (G2c).
- **Zabezpieczenia:** żaden bot nie ma ponad 50% żadnej spółki w pierwszym roku po dołączeniu; limit transakcji na kwartał.
- **Testy:** pojawienie się po dołączeniu, gotówka w walutach, limit 50%.
- **Commit G8.** (Intercontinental — G14, po przejęciu giełdy.)

## G9. Korelacja i zarażanie kryzysów między krajami

Z 0.15.3 („zarażanie między krajami → 0.16”).
- **Korelacja nastrojów:** cel premii rynku obcego = ρ × premia PL + (1 − ρ) × niezależny składnik, ρ = 0,6–0,8 (w klasie regionu: Europa 0,8, Ameryka–Europa 0,6, Azja–reszta 0,5). Niezależne fazy zostają.
- **Linie kryzysu:** pole `origin` (kraj). Linia z kraju obcego zaczyna się w ok. 25% przypadków (tylko gdy kraj otwarty) i **dociera do PL** z opóźnieniem 0–2 kw.; linia z PL dociera do krajów otwartych z siłą = powiązanie (region, sektor, waluta) × wystawienie sektora. Szok sektorowy dostaje pole `country` (premia sektora per kraj).
- **Budżet częstości jeden:** linie światowe liczone razem z dotychczasowymi (1%/kw. po ≥ 12 kw. spokoju; 40% krachów zastępuje linia) — **nie osobno per kraj**, żeby nie wrócił dryf premii.
- **Waluty w kryzysie:** CHF, JPY, USD umacniają się, waluty rynków wschodzących osłabiają się.
- **Testy:** opóźnienie i siła zarażenia, linia z zagranicy dociera do PL w ≤ 2 kw., wspólny budżet częstości, zapis w trakcie linii.
- **Commit G9.**

## G10. Interfejs, zapis i kontrola 0.16.2

- **Interfejs:** zakładki rynków z flagami i walutą; karta kraju (nastrój, stopa, waluta, spółki państwowe); sekcja „Kryzys” w oknie „Rynek” z krajami i opóźnieniem zarażenia.
- **Zapis:** dołączone kraje, bilety, szanse wydarzeń; przyrost wg tabeli „Jak sprawdzimy”.
- **Kontrola:** raport `raporty/kontrola_0.16.2.md`, wiersz w mapie. **Commit G10** (+ raport).

---

# Podwersja 0.16.3 „Europa i połączone giełdy”

## G11. Europa: Szwecja, Szwajcaria, Francja

Dane z załącznika B (SE 7 + 2, CH 7 + 1, FR 11 + 2). **Tajwan i Francja dopisane do `START_COUNTRIES`** (bilety). Nowy sektor **Rybołówstwo** (załącznik C), podsektor Słodycze (Żywność). Spółki specjalne proste. Pomiar rozmiaru zapisu. **Commit na kraj.**

## G12. Połączone giełdy

Trzy wydarzenia (liczone w **kwartałach gry**; szansa 1%/kw., podwajana co kwartał do 32%, po wydarzeniu wraca do 1% i 2 kw. przerwy; proporcje 50/30/20):
- **pozytywne:** nasza giełda przejmuje giełdę X;
- **neutralne:** powstaje giełda międzynarodowa z naszą i najwyżej 2 innymi, kolejne dołączają powoli;
- **negatywne (wariant B):** giełda X przejmuje naszą; kraj X dołącza na swoich warunkach (jego waluta rozliczeniowa dla nowych notowań, wyższe opłaty za notowanie), **kurs GPW spada o 5–15% w 2 kwartały** (parametr do strojenia).
- **Skutki dołączenia kraju:** spółki kraju na naszej giełdzie z normalną prowizją i bez biletu, boty kraju, waluta w kantorze, rośnie siła inwestorów mniejszościowych, Turystyka dostaje duży malejący bonus.
- **Wspólnota europejska:** ≥ 3 kraje europejskie (DE, CZ, SE, CH, FR) → bot europejski (G14).
- **Testy:** częstość, przerwa, trzy ścieżki, skutki, zapis. **Commit G12.**

## G13. Spółki specjalne (Europa) i prezesi krajowi

- **Spółki specjalne:** Waschmabank (pranie pieniędzy, kontrola i „Swiss Leaks” 30–60%, gotówka poza nadzorem, złoto tylko jako informacja), Surströmming Stålverk AB („otwarcie puszki”), Maison Champagnerie (winobranie), Grenouille & Fils, Matterhornen — po jednej mechanice (załącznik C).
- **Prezesi krajowi** (załącznik D): po 2 cechy na kraj i 4 polskie; łączymy z istniejącymi (np. `skapiec`), nie dublujemy; Fika i Grève générale działają na model pracowników 0.13.
- **Testy:** każda mechanika specjalna jeden test; cechy prezesów. **Commit na część (G13a, G13b).**

## G14. Boty (Europa) i boty krajowe: Graham i Wilk

- **Boty europejskie:** Gregor „Bankier” Gutzwiller (CH, tylko banki i REIT-y, „neutralność”), „Wiking” (SE), bot europejski (wspólnota), Kacper „Intercontinental” Bayer (po pierwszym przejęciu giełdy przez naszą).
- **Graham** (nazwa w stylu gry np. „Beniamin «Margines» Grahamski”): kupuje ≥ 30% poniżej wartości godziwej, niskie C/Z i C/WK, niski dług, wieloletnie dywidendy; cierpliwy, kupuje w bessie, sprzedaje przy wartości; uczy pułapek wartości.
- **Wilk** (osobna osobowość zamiast `pro_investor`): „pump and dump” małych spółek (kupno, rozgłos w mediach, sprzedaż na szczycie), duże obroty i dźwignia, ryzyko kontroli KNF (ciemna strefa 0.11).
- **Własny pomiar wpływu na GIG:** ±0,5 pp względem bazy; pump and dump nie zmienia średniej premii rynku.
- **Testy:** każdy bot jeden test zachowania; limit udziałów. **Commit G14** (G14a Europa, G14b Graham i Wilk).

## G15. Nadzór i progi wezwania za granicą

- Każdy kraj ma **stały próg wezwania** (66/75/90%) i **poziom nadzoru** (odpowiednik KNF) wg profilu; drabina KNF dla transakcji pakietowych obowiązuje w krajach otwartych (0.15.1 M5, M9).
- Boty kupujące pakiety w obcych spółkach podlegają tej drabinie.
- **Testy:** próg i kara wg kraju; pakiet obcej spółki. **Commit G15.**

## G16. Interfejs i zapis 0.16.3

Okno „Giełdy”: stan połączeń i wspólnoty; wydarzenie połączenia (okno z pauzą); karta kraju z nadzorem; Akademia: „Konsolidacja giełd”. Zapis: stan połączeń. **Commit G16.**

## G17. Kontrola 0.16.3

Raport `raporty/kontrola_0.16.3.md`, wiersz w mapie. **Commit G17.**

---

# Podwersja 0.16.4 „Azja i forex”

## G18. Azja: Japonia, Tajwan, Chiny, Indie

Dane z załącznika B (JP 13 + 3, CN 13 + 4, IN 10 + 4, TW 5 + 1). Nowe: **Gaming** (Pokeman; DVD Project Black i WayPlay są od G1), podsektory Przemysł ciężki, Herbata (tylko Chiny), Półprzewodniki (Tajwan). **Napięcie Chiny–Tajwan** (KWS −30%, spadki półprzewodników na świecie; linia lokalna, nie piąta linia kryzysu). Dwie transze: **G18a JP + TW, G18b CN + IN**. Pomiar rozmiaru po każdej.

## G19. Spółki specjalne Azji, PanDa Bank, prezesi

- **PanDa Bank** na istniejącym parabanku (0.11, 0.11.5): wysokie oprocentowanie lokat, rosnące ryzyko upadku, afera.
- Bakugan TV, Bollywood Studios, KWS, Smok Rare Earths, Huiei Telecom (sankcje), Curry Masala — po jednej mechanice.
- Prezesi azjatyccy (załącznik D). **Commit G19.**

## G20. Boty Azji

„Tygrys” (CN, agresywny, technologia), „Konfucjusz” (JP, handluje tylko z Tygrysem — transakcje bot–bot). **Commit G20.**

## G21. Forex

Dostępny po otwarciu drugiego rynku.
- **Pary krzyżowe** (np. EUR/USD), pozycje długie i krótkie, dźwignia do 1:10.
- **Silnik depozytu `marginEngine` ogólny** (depozyt, wskaźnik pokrycia, automatyczne zamknięcie przy kapitale pozycji < 50% depozytu) — **tak zaprojektowany, żeby 0.17 użył go dla kontraktów towarowych**.
- Akademia: „Dźwignia i margin call”.
- **Zabezpieczenie:** limit łącznej dźwigni funduszu, depozyt z gotówki funduszu, brak wpływu na akcje.
- **Testy:** otwarcie i zamknięcie, margin call, swap/koszt utrzymania, niezmienniki gotówki. **Commit G21.**

## G22. Interfejs, zapis i kontrola końcowa 0.16

- Zakładka Forex w kantorze; zlecenia pozycji; Akademia (hasła: „Ryzyko walutowe”, „Spread”, „ADR/GDR”, „Dźwignia i margin call”, „Konsolidacja giełd”).
- **Kontrola końcowa:** 10 krajów, zapis, czas kroku, GIG i fundusz; raport `raporty/kontrola_0.16.md`, wiersz w mapie; decyzja o pozostałych odstępstwach. **Commit G22.**

---

## Zlecenie dla czatu designu

Zlecamy w trzech turach, przed G4, G7 i G12/G16. **Bez projektowania wyglądu w planie.**
1. **(przed G4)** Okno kantoru (kursy, wykres, kupno i sprzedaż, spread słowem i liczbą); zakładka „Obce”; wiersz karty spółki „kraj · waluta · cena w walucie i PLN”; okno wydarzenia „Gigant wkracza na scenę”.
2. **(przed G7)** Zakładki rynków z flagami i walutą; karta kraju; zakładka Miasto: lotnisko, sprzedaż biletów; **animacja samolotu** (SVG/CSS, ok. 2 s, pomijalna, `prefers-reduced-motion`).
3. **(przed G12 i G21)** Okno połączeń giełd; sekcja „Kryzys” z krajami i opóźnieniem; panel forexu (pozycje, depozyt, margin call słowem).
4. **Grafika:** flagi 10 krajów i ikony walut jako SVG; **ikony linii kryzysu 0.15.3 jako SVG zamiast emoji** (zaległość).
5. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych poza wydarzeniami z pauzą gry.

## Zapis gry i testy

- **v16** od 0.16.1; w 0.16.2–0.16.4 pola opcjonalne.
- **Zapisujemy:** kursy walut, `cashByCurrency`, GDR i float, bilety, dołączone kraje (i tylko ich spółki, wersja uproszczona), połączenia giełd, szanse wydarzeń, pozycje forex.
- **Nie zapisujemy:** definicji krajów (w kodzie), spółek krajów, które nie dołączyły.
- **Migracja:** v15 → v16: waluty i kantor, bez krajów i GDR.
- **Testy:** nowa grupa na podwersję (ok. 30 / 40 / 45 / 35), w tym zapis i wczytanie w trakcie wydarzeń i linii, niezmienniki po 20 latach.

## Jak sprawdzimy

Przebiegi ×200: po każdej podwersji **20 gier × 6,5 roku bez presetu, 20 × 6,5 roku z `fundusz-gig`, 10 × 20 lat**; dla kraju dodatkowo 5 gier z dołączeniem wymuszonym presetem. Wszystko względem **bazy 0.16 z G0**.

| Miara | Cel | Kiedy |
|---|---|---|
| Niezmienniki, ujemna gotówka, wyjątki JS, pieniądze znikąd | 0 | zawsze |
| Testy | 596/596 + nowe | zawsze |
| GIG (kraj startowy) i marża względem bazy | ±1 pp / ±0,5 pp | zawsze |
| Tożsamość NAV przy samym PLN po G2b | identyczny | 0.16.1 |
| NAV bez walut a ruch kursów | zmiana 0; z walutą = ekspozycja × zmiana kursu ± 0,1 pp | 0.16.1 |
| Kursy walut w widełkach | 100% kroków | 0.16.1 |
| Spekulacja „kup nisko, sprzedaj wysoko” | ≤ lokata + 4 pp/rok | 0.16.1 |
| Spread kantoru | 1–2% | 0.16.1 |
| Cena GDR vs cena obca × kurs | w granicach spreadu ± 1% | 0.16.1 |
| Gigant: zdarzenia | 2–4 w 6,5 roku, ≤ 1 na rok; GDR 60–80% | 0.16.1 |
| Zapis: przyrost | 0.16.1 ≤ +3%; kraj ≤ +5% (≤ 6 KB na spółkę) | każda |
| Zapis: 6,5 roku z 3–4 krajami | < 3 MB | 0.16.2–0.16.3 |
| Zapis: 20 lat z 3 krajami | ≤ +15% względem bazy | 0.16.2 |
| Czas kroku | 0.16.1 +≤ 3%; 3 kraje +≤ 12%; 6 krajów +≤ 25%; 10 krajów +≤ 40% (po G0 doprecyzować) | każda |
| Dołączone kraje w 6,5 roku | 2–4, nie wszystkie od razu | 0.16.2–0.16.4 |
| Limity | krajowe ≤ 115, zwykłe ≤ 150, kraj ≤ 1,5 × startowa | każda |
| Boty zagraniczne | ≤ 50% żadnej spółki w 1. roku po dołączeniu | 0.16.2–0.16.4 |
| Korelacja GIG PL i kraju obcego | 0,5–0,8 | 0.16.2 |
| Linie światowe (razem) | 1–2 na 20 lat; linia z zagranicy dociera do PL w ≤ 2 kw. w 100% | 0.16.2 |
| Średnia premia rynku (20 lat) | −3…+3% | 0.16.2 |
| Fundusz = GIG: udziały, zaufanie | ±3%/rok, 45–55 (po G0b) | zawsze |
| Połączenia giełd | 50 / 30 / 20% ± 15 pp; wariant B: kurs GPW −5…−15% | 0.16.3 |
| Graham, Wilk | GIG ±0,5 pp; średnia premia bez zmiany | 0.16.3 |
| Forex: margin call | zamknięcie przy kapitale pozycji < 50% depozytu; 0 zamknięć bez zlecenia przy dźwigni ≤ 1:3 | 0.16.4 |

## Ryzyka

| Ryzyko | Zabezpieczenie |
|---|---|
| **Regresja wyceny przez `toPln`** (NAV, ranking, podatki) | G2b przed jakąkolwiek obcą walutą; test tożsamości przy samym PLN; osobny commit |
| **Rozmiar zapisu i czas kroku** | zapis uproszczony, definicje w kodzie, kraje w transzach z pomiarem po każdej; **druga redukcja, jeśli > 6 KB na spółkę**; mniej częste aktualizacje małych spółek zagranicznych |
| **Dryf premii po zarażaniu** | jeden budżet częstości linii; cel średniej premii −3…+3% w kontroli |
| **Niezmiennik akcji w obrocie** (GDR, obce waluty, nowi posiadacze) | float GDR 1:1; testy po każdej części; `checkWorldInvariants` |
| **Pewny zysk z kantoru** (powrót do średniej) | dryf średniej, szum, spread, miara „kup nisko / sprzedaj wysoko” |
| **Boty zagraniczne zdominują spółki** | limit 50% w 1. roku, limit transakcji |
| **Wariant B niszczy grę** (kurs GPW spada) | skromne −5…−15% w 2 kw., brak utraty stanowiska |
| **Forex jako krótka sprzedaż** | tylko pary walutowe; akcji nie dotyczy; limit dźwigni |
| **Duże dane krajów = błędy w nazwach i sektorach** | tabele w załączniku, test spójności (sektor, waluta, kraj) |
| **0.16.3 za duże** | podział po G14; Graham i Wilk można przesunąć do 0.16.4 bez szkody |

## Decyzje (podjęte)

**2026-10-25** (planowanie 0.16.x, `raporty/audyt_planow_0.16.x.md`):
1. **Podział na 4 podwersje:** 0.16.1 Waluty i kantor, 0.16.2 Pierwsze rynki, 0.16.3 Europa i połączone giełdy, 0.16.4 Azja i forex.
2. **Pierwsze kraje:** DE, US, CZ.
3. **Dryf udziałów (`fundusz-gig`, 20 lat):** diagnoza w G0 i pułap napływu organicznego malejący z wielkością funduszu; cel ±3%/rok zostaje.
4. **GDR jako instrument pochodny**; pełne podwójne notowanie i córki zagraniczne w 0.20.
5. **Graham i Wilk:** w 0.16.3, osobna część z własnym pomiarem.
6. **Rozmiar zapisu:** część ograniczeń od razu (wersja uproszczona spółek zagranicznych, definicje w kodzie), pomiar po G5 i G6; **jeśli za dużo — dalsza redukcja**.
7. **Kolejność dalej:** 0.17 Surowce i transport, 0.18 Łańcuchy produkcyjne (**pełny graf ogniw** wybrany przez użytkownika; patrz plan 0.18: pilotaż 3 łańcuchów, bramka, potem reszta), 0.19 Handel światowy, 0.20 Globalne korporacje, 0.21 Rynek pracy 2.
8. **Domyślnie przyjęte propozycje nazw:** Bank Rolno-Spożywczy, Croissanterie Dupont, nazwy rynków DAX, SSE, Wall Street Exchange i robocze dla reszty (do zmiany na życzenie przed G6/G11/G18).

Wcześniejsze decyzje (2026-10-12 … 2026-10-16) — na końcu pliku, w załączniku G.

## Prompt dla czatu implementującego G0

```
Wdrażasz część G0 planu 0.16.1 „Waluty i kantor” (gałąź zmiany-AI, nowa gałąź robocza od niej).
Przeczytaj najpierw: plany/plan_0.16_gielda_miedzynarodowa.md (sekcje „Podwersja 0.16.1” i G0, „Jak sprawdzimy”, „Ryzyka”),
plany/plan_0.13-0.16_mapa.md (tabela stanu), plany/raporty/kontrola_0.15.2.md i kontrola_0.15.3.md (niezmierzone i odziedziczone),
plany/raporty/audyt_planow_0.16.x.md. Kod: player.js (fundusz, klienci, napływ), campaigns.js, crises.js, core.js, companies.js,
tests/przebiegi.html (presety, sondy), tests/tests.html.
Zakres G0: (a) sondy w tests/przebiegi.html: bajty zapisu wg sekcji i na spółkę, czas zapisu/wczytania, czas kroku, upadki wg dźwigni,
sektory zyskujące vs GIG w linii, kierunek stóp w linii, preset „gracz-aktywny” (kupuje akcje, kampanie w Hossie i Bessie, IR, VIP);
(b) rozbicie napływu udziałów w 20 latach przy `fundusz-gig` na źródła i pułap napływu organicznego malejący z NAV (cel ±3%/rok, zaufanie 45–55);
(c) kalibracja progów mandatów po pomiarze (naruszenia ≤ 30%); (d) rozstrzygnięcie dwóch odstępstw 0.15.3; (e) baza 0.16: 20+20 gier × 6,5 roku i 10 × 20 lat (×200),
raport plany/raporty/baza_0.16.md. Nie dodawaj walut ani krajów — to G2 i dalej. Testy 596/596 muszą przechodzić.
Pracuj po 1 commicie na krok (G0a, G0b, G0c, G0e), opisy po polsku, tanie sprawdzenia (przebiegi ×200 zamiast ×1). Na końcu: wiersz w mapie i podsumowanie.
```

---

# Załączniki (dane ze szkicu, bez zmian merytorycznych)

## A. Porządki spółek (G1)

Zmiany obowiązują tylko w nowych grach. Stare zapisy zachowują swoje spółki.

- **Spółki typowo polskie** — tylko przy starcie w Polsce:
  - Miejskie Ziemniaki (dawniej Wieczne Ziemniaki), Konfiturex, Super Makarony;
  - Kopalnie Węgla Mine, Stocznia Morska, Miedź Ludowa, Siarkobrzeg, KrzeUraFos4, Betonex, Annesco;
  - Energa, Tauron, Państwowy Uran, Bałtycka Energia (dawniej Bałtycka Energia Wiatrowa);
  - Orzeł Telekom, Narodowy Operator Cyfrowy;
  - Giereklud, Budipol, Majsterbud, Linapol;
  - Polska Zbrojownia, Orzeł Defence, Grom Systems, Husaria Arms;
  - Bałtyckie Rejsy, Krajoznawsto Obce, Lek-Pol, Uniwersytet Gdański, Czysty Błysk, Pikselowe Marzenia, Błyskawiczna Proteza;
  - **nowe (Gaming):** DVD Project Black, WayPlay.
- **Spółki uniwersalne** — przy każdym starcie, niezależnie od kraju:
  - EcoLube, Elektrownia SA, Alicante Housing, Wolf & Stein Tech., WinPost, Dunder Mifflin, Drużyna Holding, BurgerLand, Beretxol, Plandex, BlueBull, Cyberfood Corp, VitaGen, Meferox, Cyber-Ochrona, WielkiWoltaż, Krawaciarze Inc., Sanitas Szpitale, SuperKonsumpcja!, Universal Projects, Cortex Neural, Nova Robotics, Biurowce Obsługi Rachunkowej;
  - instytuty badawcze GUM Med Research i Instytut Badań Stosowanych;
  - spółki budowlane do przetargów: Budimix, Infrastrukturex, Bractwo Stali, DrogiStal, BobBuild;
  - infrastruktura: banki notowane, holdingi, Lombardex, REIT-y, Fundacja i operator giełdy.
- **Bank Żywności** staje się bankiem: sektor Bankowość, nowa nazwa do ustalenia (propozycja: „Bank Rolno-Spożywczy”).
- **Usunięte** w nowych grach: KolenBreg, Firma Tłusta Pucha, Luksusowe Spinacze, Boazeria Organiczna, DarAwansu, Six Hand.
- **Testy** odwołujące się do usuniętych symboli trzeba przepiąć na inne spółki, bez zmiany sensu testu.

## B. Kraje, profile i spółki (G5, G6, G11, G18)

- **Profil kraju dla pracowników (0.13):** spółki zagraniczne mają model pracowników, zadowolenia i związków z 0.13. Pełne społeczeństwo (klasy, ustawy, partie, migracja) jest tylko w kraju startowym. Kraj ma **stały profil**, który zmienia cel zadowolenia, szansę na związek i udział szarej strefy. Marży nie zmienia (zasada kalibracji z 0.13: marżę wyznacza profil sektora).

  | Kraj | Płace (indeks wzgl. PL, do wglądu) | Prawa pracownicze | Szansa związku | Szara strefa |
  |---|---|---|---|---|
  | 🇩🇪 Niemcy | 1,6 | ochronne | ×1,2 (współdecydowanie) | 0 |
  | 🇫🇷 Francja | 1,5 | ochronne | ×2,0 (częste strajki) | 0 |
  | 🇸🇪 Szwecja | 1,5 | ochronne | ×1,5, zadowolenie +5 | 0 |
  | 🇨🇭 Szwajcaria | 1,9 | standard | ×0,6 | 0 |
  | 🇺🇸 USA | 1,7 | liberalne | ×0,5 | +2 pp |
  | 🇯🇵 Japonia | 1,3 | standard | ×0,4 (lojalność) | 0 |
  | 🇨🇳 Chiny | 0,6 | liberalne | ×0,2 (związki państwowe) | +5 pp |
  | 🇮🇳 Indie | 0,3 | liberalne | ×0,8 | +10 pp |
  | 🇨🇿 Czechy | 0,9 | standard | ×0,8 | +2 pp |
  | 🇹🇼 Tajwan | 0,9 | standard | ×0,4 | 0 |

- **Limity spółek (decyzja):** spółki zagraniczne **nie liczą się** do krajowego limitu ok. 110 ani do łącznych 150. Każdy kraj ma własny limit: 1,5 × liczba startowa (np. USA 19 → 28 razem z państwowymi). W zapisie są tylko spółki krajów, które dołączyły.
- **Spółki państwowe** (propozycja, 1–4 na kraj, zależnie od wielkości):
  - pakiet obcego państwa jest poza wolnym obrotem (jak `stateOwnershipPct`);
  - obce państwo **nie korzysta** z naszego `governmentTreasury`;
  - dywidendy państwowe trafiają do „skarbu kraju X”, licznika tylko do wglądu.

#### 🇺🇸 USA — 15 + 4 państwowe, USD
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Palant-YR** | Technologia/AI | specjalizacja: szpiegostwo dla obronności; kontrakty wywiadowcze rosną z wydatkami na obronność |
| Glasses | Technologia | gigant (wyszukiwarka, reklama) |
| Amazonka Corp. | Usługi + Technologia | gigant (e-commerce) |
| **Pear** | Technologia + Dobra konsumpcyjne | gigant (smartfony); co rok premiera modelu: hit albo flop; lojalni klienci, czyli mniejszy spadek w recesji |
| Macrohard | Technologia | oprogramowanie |
| FingerPrint | Media + Technologia | social media; specjalizacja Rozrywka |
| Envidia | Technologia/Półprzewodniki | projektant chipów do AI |
| Teslar Motors | Motoryzacja | auta elektryczne, ekologia, wysoka zmienność |
| Lotos Aerospace | Przemysł + Obronność | lotnictwo |
| Wall Street Corp. | Finanse | bank inwestycyjny |
| Texas Oil & Barbecue | Energia | |
| Hollywood Dreams Pictures | Media | specjalizacja Rozrywka |
| Big Pharma Unlimited | Medycyna | specjalizacja Farmaceutyki |
| ChickQueen | Żywność | |
| Coke&Fent | Alkohole/Napoje | |
| *AmeriRail* | Usługi | państwowa (kolej) |
| *US Mail & Parcel* | Usługi | państwowa (poczta) |
| *Tennessee Valley Power* | Energia | państwowa |
| *Fannie & Freddie Mortgage* | Finanse | państwowa (hipoteki) |

#### 🇩🇪 Niemcy (DAX) — 13 + 3 państwowe, EUR
Przewaga: chemia, motoryzacja, medycyna, przemysł.
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Panzerwafel GmbH** | Żywność + Obronność | wafle w racjach wojskowych; rosną z wydatkami na obronność |
| VolksDeutsch Auto | Motoryzacja | gigant |
| Sternwagen AG | Motoryzacja | specjalizacja premium |
| BMV Bayerwerke | Motoryzacja | opis: kierowcy po zakupie auta stają się idiotami |
| Chemiefabrik Rhein AG | Chemia | gigant |
| BayernMunch | Medycyna | specjalizacja Farmaceutyki |
| Medizintechnik Schwarzwald | Medycyna | |
| Siemenz Industrie | Przemysł + Technologia | |
| SPASF Software | Technologia | |
| Deutsche Goldhaus | Finanse | |
| Oktoberbräu Feust | Alkohole/Piwowarstwo | |
| Autobahn Logistik | Budowlany | |
| MetallRai | Przemysł + Obronność | |
| *Deutsche Bahnhof* | Usługi | państwowa (kolej) |
| *Bundespost* | Usługi | państwowa |
| *Wiederaufbaubank* | Finanse | państwowa (bank rozwoju) |

#### 🇯🇵 Japonia — 13 + 3 państwowe, JPY
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Bakugan TV** | Media (specjalizacja TV) | hit albo klapa sezonu anime; rośnie z liczbą krajów na giełdzie (eksport kultury) |
| SushShama | Żywność | |
| Toyotomi Motors | Motoryzacja | gigant |
| Hondaru Motors | Motoryzacja | |
| Sonic Electronics | Technologia + Media | |
| Pokeman | Gaming | |
| Mitsubosh Heavy Industries | Przemysł | |
| Araska Corp. | Przemysł | robotyka, gigant |
| Shinkansen Railways | Usługi | |
| SaKyoto | Alkohole | |
| YellowPharm | Medycyna | specjalizacja Farmaceutyki |
| Howam To Bank | Finanse | |
| Samurai | Obronność | |
| *Nippon Poczta Holding* | Usługi | państwowa |
| *TEPKO Tokio Energia* | Energia | państwowa |
| *Japoński Bank Rozwoju* | Finanse | państwowa |

#### 🇨🇳 Chiny — 13 + 4 państwowe, CNY
| Spółka | Sektor | Uwagi |
|---|---|---|
| Alibaka Group | Technologia + Usługi | gigant |
| Tencentyl | Technologia + Media | gigant |
| Huiei Telecom | Technologia | ryzyko sankcji |
| BuildYourDream Motors | Motoryzacja | auta elektryczne |
| Wielcy Murarze Chińscy | Budowlany | |
| Fabryka Świata Industries | Przemysł | |
| Smok Rare Earths | Przemysł (podsektor: przemysł ciężki) | metale ziem rzadkich |
| RicePlantators | Żywność | start na giełdzie brązowej |
| **PanDa Bank** | Finanse | parabank: wysokie oprocentowanie lokat, ryzyko upadku jak Amber Gold |
| TikTak Media | Media | gigant |
| Jedwabn Logistyka | Usługi | |
| Herbata Yunnan | Żywność (podsektor: herbata, tylko w Chinach) | |
| Daj | Żywność | sprzedaż jaj |
| *Państwowa Sieć Energetyczna* | Energia | państwowa |
| *Chińska Kolej Narodowa* | Budowlany | państwowa |
| *Ludowy Bank Rolny* | Finanse | państwowa |
| *Sinochem Narodowy* | Chemia | państwowa |

#### 🇫🇷 Francja — 11 + 2 państwowe, EUR
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Maison Champagnerie** | Alkohole | co rok losowa jakość winobrania; luksus rośnie w hossie |
| **Grenouille & Fils** | Żywność | żabie udka; sezonowość, protesty ekologów |
| Luxe Vuitonnet | Dobra konsumpcyjne | gigant luksusu (ubrania) |
| Jetaime | Dobra konsumpcyjne | dom mody |
| Beauté Paris | Chemia + Dobra konsumpcyjne | kosmetyki |
| Airbuss | Przemysł | lotnictwo |
| Gaz de Provence | Energia | |
| Crédit le Krecik | Finanse | |
| Bagieta SA | Żywność + Budowlany | |
| Croissanterie Dupont | Żywność | croissanty (nazwa robocza) |
| Côte d'Azur Resorts | Turystyka | |
| *Électricité Nationale* | Energia | państwowa (atom) |
| *Rail de France* | Usługi | państwowa |

#### 🇮🇳 Indie — 10 + 4 państwowe, INR
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Curry Masala Ltd** | Żywność | ceny przypraw, sezon monsunowy |
| **Bollywood Studios** | Media (specjalizacja TV/film) | co kwartał premiera: hit albo klapa |
| HelloSir! | Technologia | gigant IT (outsourcing) |
| GangesGroup | Medycyna | specjalizacja Farmaceutyki (leki generyczne) |
| Mata Group | Przemysł + Motoryzacja | |
| Relajans Industries | Energia + Przemysł | |
| Bank of Bharat | Finanse | |
| Indian Express | Usługi | |
| Taj Mahal Hotels | Turystyka | |
| Karakorum | Obronność | |
| *Indyjskie Koleje Państwowe* | Usługi | państwowa |
| *Węgiel Indii* | Przemysł | państwowa |
| *Narodowa Ropa i Gaz Indii* | Energia | państwowa |
| *Narodowe Ubezpieczenia Bharat* | Finanse | państwowa |

#### 🇨🇭 Szwajcaria — 7 + 1 państwowa, CHF
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Waschmabank** | Finanse | bank „bez pytań”: pranie pieniędzy mafii (szczegóły w G4); w skarbcu złoto — tylko informacja na karcie spółki, bez nowych możliwości inwestycyjnych |
| **Matterhornen** | Żywność (podsektor: słodycze) | czekolada; ceny kakao, stabilna dywidenda |
| UBZ Bankgesellschaft | Finanse | |
| Rochevartis Pharma | Medycyna | specjalizacja Farmaceutyki, gigant |
| Nestlik | Żywność | gigant |
| Präzision Uhren AG | Dobra konsumpcyjne | zegarki |
| Alpen Ski Resorts | Turystyka | |
| *Alpenpost* | Usługi | państwowa |

#### 🇸🇪 Szwecja (SSE) — 7 + 2 państwowe, SEK
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Surströmming Stålverk AB** | Przemysł + Rybołówstwo | stal (cykliczna) + kiszony śledź (stabilny); zdarzenie „otwarcie puszki”: skandal albo viral |
| IKEJA | Dobra konsumpcyjne | gigant |
| Volvik | Motoryzacja | |
| Spotifaj | Media + Technologia | |
| Ericssen | Technologia | telekomunikacja |
| Saabre Defence | Obronność | |
| Östersjö Fiske AB | Rybołówstwo | |
| *Vattenkraft* | Energia | państwowa |
| *Systemkrogen* | Alkohole | państwowa — monopol na sprzedaż alkoholu; stabilna, wysoka dywidenda dla państwa |

#### 🇨🇿 Czechy — 8 + 1 państwowa, CZK
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Pivovar Bohemia** | Alkohole/Piwowarstwo | ulubiona spółka Kozela; upały w lecie podbijają sprzedaż |
| Ovce Pivo | Alkohole/Piwowarstwo | |
| Škodar Auto | Motoryzacja | |
| ČEP Energie | Energia | |
| Knedlík a.s. | Żywność | |
| Bohemia Sklo | Dobra konsumpcyjne | szkło i kryształy |
| Praha Bank | Finanse | |
| Krecik Group | Media (specjalizacja TV) | |
| *České Koleje* | Usługi | państwowa |

#### 🇹🇼 Tajwan — 5 + 1 państwowa, TWD
| Spółka | Sektor | Uwagi |
|---|---|---|
| **Krzemowa Wyspa Semiconductor (KWS)** | Technologia/Półprzewodniki | gigant; napięcie Chiny–Tajwan: −30% i spadki półprzewodników na świecie; dostawca dla AI |
| Foxkon | Technologia | montaż elektroniki |
| Asuss | Technologia | |
| Formoza Chemia | Chemia | |
| Bubble Tea Taipei | Żywność | |
| *Taipower Formosa* | Energia | państwowa |

**Razem:** 102 spółki prywatne i 25 państwowych. Tworzone są dopiero przy dołączeniu kraju.

#### Rozszerzanie liczby spółek w innych krajach (propozycja)
- **Debiuty krajowe:** po dołączeniu kraju jego startupy debiutują na jego rynku, tak jak polskie startupy. Szansa zależy od koniunktury kraju.
- **Spin-offy z 0.14 (T4):** dotyczą też spółek zagranicznych. Spółka córka zostaje w kraju matki.
- **Limit na kraj:** najwyżej 1,5 × liczba startowa (decyzja; patrz „Limity spółek” wyżej). Upadłości, przejęcia i wchłonięcia córek (0.14 T6) zwalniają miejsce. Spin-off zagranicznej spółki ponad limit kraju jest możliwy tylko jako carve-out.
- **Wydarzenie „Gigant wkracza na scenę”** (G3) może sprowadzić pojedynczą spółkę z kraju, który jeszcze nie dołączył.

## C. Sektory, podsektory i spółki specjalne (G6, G13, G18, G19)

- **Kategorie (0.14 T1a):** w tabelach G2 banki zapisane jako „Finanse” (Wall Street Corp., Deutsche Goldhaus, UBZ Bankgesellschaft, Howam To Bank, PanDa Bank, Waschmabank, Crédit le Krecik, Bank of Bharat, Praha Bank, banki państwowe) dostają sektor **Bankowość** i podsektor (komercyjny, inwestycyjny albo międzynarodowy). Nowe sektory trafiają do rejestru `SECTORS`: Motoryzacja do grupy Przemysł i surowce, Rybołówstwo i Alkohole do Konsumpcji.
- **Nowe sektory:** Motoryzacja, Rybołówstwo, Alkohole (podsektor: Piwowarstwo i napoje). Każdy dostaje profil wyceny oraz dane z 0.13 i 0.14:

  | Sektor | Zarząd / Specjaliści / Pracownicy / Tania siła / Szara strefa (%) | Koszt pracy (% przychodów) | Elastyczność popytu (0.13 S1) | Powiązane branże (0.14 T3) |
  |---|---|---|---|---|
  | Motoryzacja | 3 / 20 / 55 / 20 / 2 | 22 | 1,3 | Przemysł, Technologia |
  | Rybołówstwo | 2 / 5 / 45 / 38 / 10 | 25 | 0,3 | Żywność |
  | Alkohole | 3 / 10 / 55 / 30 / 2 | 18 | 0,4 (defensywne) | Żywność |
- **Turystyka:** gigantyczna premia za każde nowe państwo — przychód i kurs w górę, malejąco w czasie.
- **Podsektory** (mechanizm z 0.14 T2): Półprzewodniki i AI (Technologia), Przemysł ciężki (Przemysł), Słodycze i Herbata (Żywność; Herbata tylko w Chinach).
- **Specjalizacje-nisze** (0.14 T3, bez własnego profilu wyceny): TV i Rozrywka (Media), Farmaceutyki (Medycyna) i Wywiad i obronność (Technologia) są już w 0.14. 0.15 dopisuje Premium (Motoryzacja).
- **Gaming:** pierwsze spółki — DVD Project Black i WayPlay (PL) oraz Pokeman (JP).
- **Waschmabank** — bank „bez pytań”:
  - mafia i Bruno Gato wpłacają brudną gotówkę i odbierają czystą; bank bierze 10–20% prowizji, więc ma bardzo wysoką marżę;
  - co kwartał szansa na kontrolę albo przeciek („Swiss Leaks”): kurs spada o 30–60%, bank płaci karę, prezesowi grozi areszt;
  - gracz może trzymać tam część gotówki poza kontrolą nadzoru (0.11). Jeśli to wyjdzie na jaw: afera i utrata reputacji;
  - złoto w skarbcu to tylko informacja na karcie spółki.
- **PanDa Bank (parabank):** używa **istniejącej mechaniki parabanku z 0.11** razem z poprawkami balansu z 0.11.5 (losowy termin upadku, kurs z szumem). Nie budujemy drugiej. Lokaty z wysokim oprocentowaniem przyciągają klientów, co kwartał rośnie ryzyko upadku, a przy upadku inwestorzy i deponenci tracą i wybucha afera.
- **Pozostałe spółki specjalne:** po jednej mechanice, jak w tabelach G2.

## D. Prezesi: cechy krajowe (G13, G19)

**Zagraniczni** (po dwie na kraj; nadawane spółkom danego kraju, czasem także innym):
| Kraj | Cechy |
|---|---|
| 🇩🇪 | Ordnung muss sein (mniejsza zmienność), Ingenieur (badania i rozwój +) |
| 🇸🇪 | Lagom (umiar w ryzyku), Fika (zadowolenie pracowników z 0.13 +) |
| 🇨🇭 | Tajemnica bankowa, Neutralność (odporność na kryzysy) |
| 🇺🇸 | Move fast (wzrost +, zmienność +), Shareholder value (skup akcji własnych) |
| 🇯🇵 | Kaizen (marża rośnie stopniowo), Keiretsu (kooperacje z 0.14 T5) |
| 🇨🇳 | Plan pięcioletni (dotacje państwa), Kopiuj-wklej (tańsze badania, ryzyko sankcji) |
| 🇫🇷 | Savoir-vivre (marża na luksusie +), Grève générale (silniejsze związki z 0.13) |
| 🇮🇳 | Jugaad (niższe koszty), Outsourcing |
| 🇨🇿 | Švejk (przetrwa kryzys, ale rośnie wolno), Piwny dyplomata |
| 🇹🇼 | Krzemowa tarcza (odporność geopolityczna), Pracoholik |

**Polscy prezesi:**
- Janusz biznesu (niższe koszty, niższe zadowolenie załogi);
- Szwagier w ministerstwie (kontrakty państwowe);
- Polak potrafi (szybciej wychodzi z kryzysu);
- Cwaniak (zysk +, ryzyko afery).

Cechy pokrywające się z istniejącymi (np. `skapiec`) łączymy, zamiast dublować.

## E. Boty zagraniczne (G8, G14, G20)

Każdy bot pojawia się dopiero wtedy, gdy jego kraj dołączy do giełdy.

| Bot | Kiedy | Zachowanie |
|---|---|---|
| Kacper „Intercontinental” Bayer | po pierwszym przejęciu giełdy przez naszą | skupuje obce waluty, gra tylko spółkami zagranicznymi |
| Michael „Dad” Santos | USA | start w USD; polskie spółki kupuje losowo, amerykańskie „idealnie” (według fundamentów) |
| Peter „Lech” Kozel | Czechy | głównie spółki czeskie, lubi też europejskie; kupuje w EUR i CZK; 20% środków trzyma na wydatki prywatne |
| „Tygrys” | Chiny | agresywny, celuje w technologię |
| „Konfucjusz” | Japonia | japoński odpowiednik Stoika; skupia się na rynku japońskim; akcjami handluje tylko z Tygrysem (transakcje bot–bot) |
| Gregor „Bankier” Gutzwiller | Szwajcaria | tylko banki i REIT-y; rezerwa w CHF; „neutralność”: nie sprzedaje w panice, dokupuje przy krachach; aktywnie używa władzy korony; lubi Waschmabank |
| „Wiking” | Szwecja | agresywny, kupuje cokolwiek |
| niemiecki wieloryb | Niemcy | duży gracz, tylko stabilne spółki, unika polskich |
| bot europejski (odpowiednik yolo) | wspólnota europejska (≥ 3 kraje europejskie) | hazardzista |

Polski Grzegorz „Bankier” Kacperczyk zostaje bez zmian.

## F. Waluty i widełki kursów (G2)

- **Waluty:** PLN, EUR, USD, CHF, SEK, CZK, CNY, JPY, INR, TWD.
- **Kursy:** losowy ruch powracający do średniej, w twardych widełkach (zł za 1 jednostkę). Na kurs wpływają różnica stóp procentowych (makro 0.10.2), kryzysy i wydarzenia krajowe.

  | Waluta | Widełki | Waluta | Widełki |
  |---|---|---|---|
  | EUR | 3,80–5,50 | CNY | 0,45–0,70 |
  | USD | 3,40–5,00 | JPY | 0,022–0,036 |
  | CHF | 3,90–5,60 | INR | 0,040–0,060 |
  | SEK | 0,32–0,48 | TWD | 0,10–0,16 |
  | CZK | 0,15–0,21 | | |

## G. Wcześniejsze decyzje (2026-10-12 … 2026-10-16)

1. Rynki: DE, CZ, SE, CH, US, JP, CN, IN, TW, FR. Tajwan i Francja dopisane do `START_COUNTRIES`.
2. Bez Colonizera.
3. Przejęcie naszej giełdy działa według wariantu B.
4. Półprzewodniki i AI to podsektory, TV to specjalizacja, Farmaceutyki to specjalizacja Medycyny, a Gaming to istniejący sektor.
5. Kantor i spekulacja walutami od startu. Forex (pary krzyżowe, dźwignia) po otwarciu drugiego rynku.
6. Szwajcarski bot: Gregor „Bankier” Gutzwiller, tylko banki i REIT-y.
7. Waschmabank (pranie pieniędzy, złoto tylko jako informacja), Matterhornen (czekolada).
8. Nazwy: Palant-YR, MetallRai, Bakugan TV, Ovce Pivo, VolksDeutsch Auto, Lotos Aerospace, RicePlantators (Żywność), PanDa Bank (parabank).
9. Spółki polskie: Bałtycka Energia, Miejskie Ziemniaki; Super Makarony, Annesco i BobBuild zostają; Bank Żywności staje się bankiem. Nowe spółki Gaming: DVD Project Black i WayPlay.
10. Otwieranie regionów:
    - wydarzenie „Gigant wkracza na scenę” (pauza gry, GDR albo zagraniczne przejęcie);
    - lotnisko z biletami kupowanymi przez każdego inwestora osobno, z animacją lotu w chmury;
    - wydarzenia giełdowe łączące rynki.

11. **Limity:** spółki zagraniczne mają osobny limit na kraj (1,5 × liczba startowa) i nie liczą się do krajowych ok. 110 ani do łącznych 150.
12. **Pracownicy za granicą:** model 0.13 i stały profil kraju (tabela w G2). Pełne społeczeństwo tylko w kraju startowym.
13. **Wydarzenia giełdowe** liczone w kwartałach gry, nie w minutach.

## H. Zgłoszenia przeniesione do 0.20 (podwójne notowanie, córki zagraniczne)

- **Notowanie na kilku giełdach:** spółka może wejść na giełdę zagraniczną pod tą samą nazwą (podwójne notowanie, cena w walucie rynku po kursie kantoru). Najbliżej G1 (waluty) i G2/G3 (rynki). Do ustalenia:
  - czy to jedna pula akcji z dwoma kursami (arbitraż przez kantor);
  - jak liczy się do limitów kraju.
- **Spółki córki na innych giełdach:** matka może założyć córkę notowaną za granicą (rozszerza 0.14 T6). **Zmienić limit córek:** dziś córki koncernu do 3, a córka zostaje w kraju matki (punkt „Spin-offy z 0.14” w G2). Nowy limit np. 3 krajowe + 1 na każdy otwarty rynek; córka zagraniczna liczy się do limitu kraju, w którym jest notowana.

