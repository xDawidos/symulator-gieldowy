# 0.14.3 „Zapis bez limitu” — raport

- **Data:** 2026-10-17
- **Commity:** `7701cda` (Z1–Z3), `1279222` (Z4), `a533506` (Z5); gałąź `claude/busy-burnell-81b619`, bez pusha.
- **Testy:** 457/457 (9 nowych, w tym asynchroniczne na osobnej bazie `gra-inwestycyjna-test`; testy nie dotykają zapisu gracza ani klucza `localStorage` gracza).

## Co zrobione

- **Z1 `save_store.js`:** IndexedDB (baza `gra-inwestycyjna`, magazyn `saves`, klucze `current` i `previous`) z próbnym zapisem i odczytem przy starcie; zapas `localStorage`, gdy IndexedDB nie działa; `navigator.storage.persist()` przy pierwszym zapisie i `estimate()` w panelu; tryb testów zawsze na bazie testowej. Gra startuje po wstępnym odczycie zapisów (asynchronicznie); przebiegi testowe (`__SIM_NO_SAVE__`) startują od razu i niczego nie zapisują.
- **Z2 kompresja:** `lib/lz-string.min.js` (MIT, w repozytorium, warianty UTF16) → format `lz16` dla `localStorage`. Dla IndexedDB format **`gz`** (natywny `CompressionStream`), bo lz-string okazał się za wolny (tabela niżej) — plan dopuszczał tę zamianę. Odczyt rozpoznaje `gz`, `lz16` i stary czysty JSON.
- **Z3 bezpieczeństwo:** zapis atomowy (`current` → `previous` w jednej transakcji), bez nakładania zapisów (najnowszy czeka); zapis przy `visibilitychange` (ukrycie karty); przy `pagehide`/`beforeunload` synchroniczna kopia `lz16` w `localStorage` (raz na 2 s). Wczytanie wybiera najnowszy poprawny spośród `current`, `previous` i kopii z `localStorage`; uszkodzony najnowszy → poprzedni i wpis w dzienniku. Migracja: stary JSON wczytany, zamieniony w kopię `lz16` dopiero po pierwszym udanym zapisie do IndexedDB. Reset czyści IndexedDB i `localStorage`, blokada zapisu do przeładowania zostaje.
- **Z4 eksport/import:** „💾 Eksport” w górnym pasku i w panelu — czytelny JSON `gra-inwestycyjna_<fundusz>_<rokN-kwM>.json`. Import (JSON albo `lz16`): walidacja bez zmiany stanu, potwierdzenie, zapis jako bieżący (poprzedni zostaje w `previous`), przeładowanie; uszkodzony albo obcy plik niczego nie nadpisuje.
- **Z5 panel zapisu** (Ustawienia): gdzie, rozmiar przed i po kompresji, czas i poziom ostatniego zapisu, trwałość, przydział przeglądarki, przyciski Zapisz / Eksportuj / Wczytaj z pliku.

## Jak sprawdzimy — wyniki

| Miara | Wynik | Cel |
|---|---|---|
| Zapis po 20 latach gry (80 kw., 3,34 mln znaków) | **poziom zwykły**, wczytanie bez strat (JSON identyczny), niezmienniki po wczytaniu 0 | ✅ |
| Stopień kompresji | `gz` **4,9×** (bajty UTF-8: 3,37 MB → 683 KB); `lz16` 7,2–7,6× (znaki) | ≥ 4× ✅ |
| Czas zapisu (20 lat) | kompresja `gz` **68 ms** (odczyt 42 ms); z budową snapshotu (280 ms, jak przed 0.14.3) razem ok. 350 ms | ≤ 300 ms ⚠️ — sama kompresja w celu, budowa snapshotu przekracza; pomiar przy 3 kartach liczących naraz |
| Czas zapisu (6,5 roku, 10 przebiegów) | budowa 154–230 ms + `gz` 35–51 ms | ✅ |
| `lz16` (kopia awaryjna przy zamknięciu) | 20 lat: 1287 ms kompresji, 177 ms odczytu; 6,5 roku: 0,7–0,9 s; mieści się w `localStorage` | — (synchronicznie tylko przy zamknięciu karty) |
| Zamknięcie karty → ponowne otwarcie | przeładowanie w trakcie gry bez ręcznego zapisu: identyczny stan (NAV, gotówka, kursy, kwartał), źródło: kopia awaryjna | ✅ |
| Eksport → import | identyczne NAV, gotówka, jednostki, akcje, kursy i data; gra zapauzowana, źródło `indexeddb:current` | ✅ |
| Gra z dysku (`file://`) | **niesprawdzone**: panel przeglądarki w aplikacji pokazuje pliki `file://` tylko statycznie (bez skryptów), Firefoksa tu nie ma. Gdy IndexedDB nie zadziała, gra używa `localStorage` z kompresją `lz16` (panel pokaże „pamięć podstawowa”) | ⚠️ do ręcznego sprawdzenia |
| Regresja gry (10 × 6,5 roku) | GIG 20,5 ± 1,3%, marża 26,8%, niezmienniki 0, ujemna gotówka 0, bezpiecznik 0 | ✅ |

## Odbiega od planu

- Z1–Z3 w jednym commicie: warstwa przechowywania, kompresja i bezpieczne wczytywanie to jedna ścieżka (asynchroniczny zapis bez kopii przy zamknięciu tracił dane).
- IndexedDB zapisuje w formacie `gz` (natywny gzip), nie `lz16` — lz-string potrzebował ok. 1,1–1,3 s na 3 MB. `lz16` zostaje dla `localStorage` (kopia awaryjna i zapas), bo tam potrzebny jest tekst i zapis synchroniczny.
- Kopia awaryjna przy zamknięciu karty trwa ok. 1,3 s po 20 latach gry (kompresja `lz16` synchronicznie). Gdy przeglądarka przerwie ją wcześniej, zostaje zapis z ukrycia karty (`visibilitychange`) albo ostatni autozapis.
- `navigator.storage.persist()` w przeglądarce testowej zwrócił „nie” (Chrome przyznaje trwałość wg zaangażowania strony); panel pokazuje to graczowi.
- Import z pliku jest w panelu zapisu (Ustawienia); w górnym pasku jest tylko eksport.
