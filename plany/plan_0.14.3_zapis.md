# Plan 0.14.3 „Zapis bez limitu” (po poprawkach z decyzji 15, przed 0.15)

Cel: długie gry nie dochodzą do limitu przeglądarki. Zapis jest pewny także przy zamknięciu karty, a gracz może trzymać kopię zapasową w pliku i przenieść grę na inny komputer.

**Dlaczego:** gra zapisuje się w `localStorage`. Przeglądarka daje mu ok. 5 MB na stronę, a Chrome liczy znak jako 2 bajty, więc w praktyce mieści się ok. 2,5 mln znaków (`SAVE_SIZE_TARGET = 2_500_000` w `main.js`). Tego limitu nie da się zmienić ani w kodzie, ani w ustawieniach. Po 0.14 zapis ma 3,26 MB po 20 latach gry i schodzi na poziom kompaktowy albo awaryjny (krótsze wykresy, mniej poczty i dziennika). 0.15 i 0.16 dołożą kolejne dane.

**Decyzja użytkownika (2026-10-16):** IndexedDB jako główny zapis, do tego kompresja i eksport/import pliku. Robimy to zaraz po poprawkach z decyzji 15, przed 0.15.

Kolejność: Z1 → Z2 → Z3 → Z4 → Z5. Każda część osobnym commitem, z testami i kontrolą (krótki przebieg ×200 plus zapis po 20 latach gry).

---

## Punkt wyjścia (stan kodu, `main.js`)

- `saveGameState()`:
  - buduje snapshot (`buildSaveSnapshot({ compact })`) i zapisuje go do `localStorage[GAME_SAVE_KEY]`;
  - przy przekroczeniu 2,5 mln znaków albo odmowie przeglądarki schodzi na poziomy `SAVE_COMPACT_LEVELS`: 0 zwykły, 1 kompaktowy, 2 awaryjny;
  - jest wywoływany z autozapisu i z `beforeunload`, zawsze synchronicznie.
- `restoreSavedGame()` czyta `localStorage` przy starcie, a `applySaveSnapshot()` waliduje zapis i migruje wersję.
- `resetSavedGame()` usuwa klucz i blokuje zapis do przeładowania.
- `localStorage` trzyma też drobne ustawienia widoku: zwinięte sekcje, filtry, stan paska.

## Z1. Warstwa przechowywania: IndexedDB z zapasowym `localStorage`

- **Nowy, mały moduł `saveStore`** (w `main.js` albo osobnym pliku), z jednym interfejsem:
  - `saveStore.write(record)`, `saveStore.read()`, `saveStore.clear()` (asynchroniczne, oparte na Promise);
  - **IndexedDB:** baza `gra-inwestycyjna`, magazyn `saves`, klucze `current` i `previous`;
  - **zapas:** `localStorage`, gdy IndexedDB jest niedostępne albo zwraca błąd.
- **Wykrywanie:** przy starcie próbny zapis i odczyt w IndexedDB. Trzeba to sprawdzić także przy grze otwieranej z pliku z dysku (`file://`) w Chrome i w Firefoksie i opisać wynik w raporcie. Jeśli test się nie uda, gra używa `localStorage` (z kompresją z Z2) i pokazuje w ustawieniach „Zapis: pamięć podstawowa”.
- **Trwałość:** `navigator.storage.persist()` przy pierwszym zapisie, żeby przeglądarka nie czyściła danych sama. W panelu zapisu: rozmiar zapisu, przydział (`navigator.storage.estimate()`) i informacja „trwały” albo „może zostać wyczyszczony”.
- **Tryb testów** (`window.__GAME_TEST_MODE__`) używa osobnej bazy (`gra-inwestycyjna-test`) i nigdy nie dotyka zapisu gracza.

## Z2. Kompresja zapisu

- **Biblioteka lz-string** (licencja MIT, ok. 5 KB) dołączona do repozytorium jako plik (np. `lib/lz-string.min.js`), bez pobierania z internetu.
- **Format rekordu:** `{ format: 'lz16', version, savedAt, size, data }`, gdzie `data = LZString.compressToUTF16(JSON.stringify(snapshot))`.
- **Odczyt** rozpoznaje stary format (czysty JSON w `localStorage`) i nowy (`lz16`).
- **Pomiar:** stopień kompresji i czas kompresji i dekompresji dla zapisu po 6,5 i po 20 latach. Cel: kompresja ≥ 4×, a zapis z kompresją ≤ 300 ms dla zapisu po 20 latach na typowym komputerze. Jeśli to za wolno, rozważyć natywne `CompressionStream('gzip')` dla IndexedDB i opisać wybór.

## Z3. Bezpieczny zapis i wczytywanie

- **Zapis atomowy:** w jednej transakcji IndexedDB stary `current` przechodzi do `previous`, a nowy staje się `current`. Przy błędzie zostaje poprzedni zapis.
- **Zamknięcie karty:** IndexedDB działa asynchronicznie, a `beforeunload` może nie zdążyć. Dlatego:
  - zapis także na `visibilitychange` (karta ukryta) i `pagehide`;
  - przy `beforeunload` **synchroniczna kopia awaryjna** w `localStorage`: skompresowany zapis, jeśli zmieści się w 2,4 mln znaków (po kompresji zwykle tak); jeśli nie, poziom kompaktowy.
- **Wczytywanie:** spośród `current`, `previous` i kopii z `localStorage` gra wybiera **najnowszy poprawny** (po `savedAt` i walidacji `applySaveSnapshot`). Gdy najnowszy jest uszkodzony, bierze poprzedni i zapisuje wpis w dzienniku.
- **Poziomy kompaktowe** (`SAVE_COMPACT_LEVELS`) zostają tylko jako zabezpieczenie: w IndexedDB dopiero powyżej 50 mln znaków przed kompresją, a w zapasowym `localStorage` jak dziś (2,5 mln znaków po kompresji).
- **Reset gry** (`resetSavedGame`) czyści IndexedDB (`current` i `previous`) oraz kopię w `localStorage`, a blokada zapisu do przeładowania zostaje.
- **Migracja:** przy pierwszym starcie po aktualizacji, gdy w IndexedDB nie ma zapisu, a w `localStorage` jest stary, gra wczytuje stary zapis. Pierwszy udany zapis trafia do IndexedDB, a stary klucz zamienia się w skompresowaną kopię awaryjną. Nic nie jest kasowane przed pierwszym udanym zapisem do IndexedDB.

## Z4. Eksport i import pliku

- **„💾 Eksportuj zapis”** (górny pasek, menu zapisu): pobiera plik `gra-inwestycyjna_<nazwa funduszu>_<data gry>.json`, w czytelnym JSON-ie (bez kompresji, żeby dało się go podejrzeć).
- **„📂 Wczytaj z pliku”:**
  - wybór pliku, walidacja przez `applySaveSnapshot` (wersja, błędy, ostrzeżenia);
  - potwierdzenie „Zastąpić bieżącą grę?”;
  - po wczytaniu gra startuje zapauzowana, jak dziś.

  Plik może być też w formacie `lz16`, rozpoznawanym automatycznie.
- **Bezpieczeństwo:** import tylko z pliku wybranego przez gracza. Uszkodzony albo obcy plik daje czytelny komunikat i niczego nie nadpisuje.

## Z5. Kontrola i porządki

- Panel zapisu w ustawieniach:
  - gdzie gra jest zapisana (IndexedDB / `localStorage`);
  - rozmiar przed i po kompresji;
  - czas ostatniego zapisu;
  - poziom zapisu (zwykły / kompaktowy / awaryjny);
  - przyciski eksportu i importu.
- Ostrzeżenia o rozmiarze (`warnSaveOnce`) pokazują się tylko, gdy naprawdę grozi utrata danych.
- **Plan 0.16 G−1** (odchudzenie zapisu) przestaje być pilny. Zostaje jako optymalizacja czasu zapisu i wczytywania, z celem ≤ 300 ms zapisu po 20 latach gry przy 3–4 krajach.

---

## Testy (`tests/tests.html`, osobna baza testowa)

- kompresja i dekompresja dają identyczny snapshot (porównanie JSON);
- zapis i odczyt przez `saveStore` w IndexedDB, z `current` i `previous` po dwóch zapisach;
- zapasowy `localStorage`, gdy `indexedDB` jest niedostępne (symulacja);
- wybór najnowszego poprawnego zapisu, gdy `current` jest uszkodzony;
- migracja: stary zapis (czysty JSON w `localStorage`) → wczytany, potem pierwszy zapis w IndexedDB i kopia `lz16`;
- reset czyści oba miejsca;
- import: poprawny plik wczytany, uszkodzony odrzucony bez zmian w stanie gry;
- zapis po 20 latach gry (ok. 3,3 mln znaków przed kompresją) zapisuje się na **poziomie zwykłym** i wczytuje bez strat (niezmienniki świata po wczytaniu);
- testy nigdy nie dotykają zapisu gracza.

## Jak sprawdzimy

| Miara | Cel |
|---|---|
| Zapis po 20 latach gry | poziom zwykły (bez przycinania); wczytanie bez strat, niezmienniki 0 |
| Stopień kompresji | ≥ 4× |
| Czas zapisu z kompresją (20 lat) | ≤ 300 ms |
| Zamknięcie karty w trakcie gry → ponowne otwarcie | stan nie starszy niż ostatni autozapis lub ukrycie karty |
| Gra otwierana z dysku (`file://`): Chrome, Firefox | opisane w raporcie: IndexedDB działa albo zapas `localStorage` z kompresją |
| Eksport → import na czystej przeglądarce | ta sama gra (NAV, gotówka, akcje, data gry) |

## Decyzje (podjęte 2026-10-16)

1. **Rozwiązanie limitu:** IndexedDB jako główny zapis, kompresja, eksport i import pliku; `localStorage` tylko na ustawienia i kopię awaryjną.
2. **Kiedy:** 0.14.3, zaraz po poprawkach z decyzji 15 w planie 0.14, przed 0.15.
