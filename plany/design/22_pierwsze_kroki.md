# 22. Pierwsze kroki, stany puste, pola z etykietą (usprawnienia UI i UX, 2026-11-13)

Makieta: [makiety/22_pierwsze_kroki.html](makiety/22_pierwsze_kroki.html) (samodzielna). Zgłoszenie użytkownika „usprawnienia UI i UX”, punkty 1 i 2.

## Decyzje użytkownika (2026-11-13)
- **Górny pasek bez zmian** (zostaje makieta 18 i commit ac65dae): NAV, gotówka funduszu, zaufanie. Konto prywatne tylko w panelu funduszu. Wiersz `.topbar-kpi[hidden]` z kontem można usunąć z `index.html`.
- **Faza rynku bez zmian:** chip w pasku tylko z „Analityk indeksu” L4 (`updateMoodKpi`). Stopy bazowej w pasku nie dodajemy (pasek ma zostać lekki; stopa jest w oknie Banku, makieta 21).
- **Pierwsze kroki:** 4 zadania po 50 PLN na konto prywatne, razem 200 PLN.

## 1. Panel przypiętych zadań (panel funduszu)

**Korekta 2026-11-14 (uwaga użytkownika):** karta z tej makiety to **ogólny panel przypiętych zadań**, a nie tylko „Pierwsze kroki”. Pełna lista zadań jest w TeamedUP! → Zadania i oceny, z kategoriami Pierwsze kroki, Od zarządu, Rynek i Mechaniki. Gracz przypina do panelu najwyżej 3 zadania. Na starcie gra sama przypina 3 pierwsze zadania z Pierwszych kroków, a gdy jedno się wykona, w wolne miejsce wchodzi następne (tylko ta kategoria przypina się sama). Projekt listy i przypinania: [24_zadania.md](24_zadania.md). Tabela niżej opisuje zachowanie karty (zwijanie, postęp, komunikat o nagrodzie, stan ukończony); wygląd pojedynczego przypiętego zadania (kategoria, postęp, nagroda, termin, „Odepnij”) jest w makiecie 24. Nagłówek karty to „Zadania” zamiast „Pierwsze kroki”.

| Część | Co pokazuje | Markup / ARIA |
|---|---|---|
| Karta | Nad księgą funduszu. Nagłówek „Pierwsze kroki” + pasek postępu (neutralny, R4) + strzałka zwijania | `section.fs[aria-labelledby]`, `button.fs-head[aria-expanded][aria-controls]`, `.fs-meter[role=progressbar][aria-valuenow][aria-valuemin=0][aria-valuemax=4]` |
| Zadania | 1. Kup pierwsze akcje. 2. Miej akcje 3 spółek. 3. Załóż lokatę w banku. 4. Przeczytaj zadanie od szefa (TeamedUP!). Przy każdym podpowiedź, nagroda „+50 PLN” bursztynem (pieniądze gracza) i przycisk przejścia („Pokaż rynek”, „Otwórz Bank”, „Otwórz TeamedUP!”) | `ol.fs-list`, `li.fs-item(.is-done)`, `.fs-box` (ptaszek SVG), `.fs-reward`, `button.fs-go`; dla czytnika „, wykonane” w `.sr-only` |
| Po wykonaniu | Ptaszek, szary tekst, nagroda szara; komunikat dla czytnika „Zadanie wykonane: …, plus 50 PLN na konto prywatne” | `div[role=status][aria-live=polite]` w panelu (jeden na panel) |
| Stopka | „2 z 4, nagrody na konto prywatne”, „Ukryj listę” (ukrywa do końca gry, przywrócenie w Ustawieniach) | `.fs-foot` |
| Ukończone | Jedna linia „Pierwsze kroki ukończone +200 PLN”, znika po końcu kwartału | `section.fs.is-complete` |

Zachowanie: nie blokuje gry, nie zatrzymuje czasu, nie ma okien. Zwinięcie i ukrycie są w zapisie (`playerProfile.firstSteps = { done: [..], collapsed, hidden }`). Stare zapisy: lista ukryta (gracz już gra). Zadania sprawdza się po każdej transakcji i przy otwarciu okna (bez pętli co tick). Nagroda idzie przez tę samą funkcję co inne wpływy na konto prywatne, z wpisem w historii konta.

## 2. Stan pusty `renderEmptyState` (= O2 z planu 0.18.6)
Jeden komponent, cztery warianty:
| Wariant | Przykład | Markup |
|---|---|---|
| Brak danych | „Portfel jest pusty.” + co zrobić + „Pokaż rynek” | `div.empty` (ikona `svg[aria-hidden]`, `b` tytuł, `p` zdanie, opcjonalny `button.act`) |
| Przed pierwszą sesją | „Kursy pojawią się po pierwszej sesji.” + „Rozpocznij grę” (przycisk główny bursztynem, to akcja gracza) | `div.empty.is-wait`, `button.act.is-primary` |
| Zablokowane (D3) | „Aukcje bonów odblokujesz później.” + warunek + postęp „Aktywa 32 400 / 50 000 PLN” | `div.empty.is-locked`, `.prog > i[role=img][aria-label]` |
| W tabeli | „Brak aktywnych aukcji. Następna aukcja bonów: tydzień 3 tego kwartału.” | `tr.empty-row > td[colspan] > div.empty`, tabela z `caption` (może być `.sr-only`) |

Ramka przerywana = „tu będzie treść”; ciągła na ciemniejszym tle = „zablokowane”. Bez `role=status`: stan pusty jest stały, nie jest komunikatem.

## 3. Pola z etykietą
Reguła: każdy `<select>` ma **widoczny** `<label for>` nad sobą (12 px, `--color-text-muted`), podpowiedź w `small` przez `aria-describedby`. Grupa przycisków wyboru (branże) to `fieldset` + `legend` z radiami (`input[type=radio]` ukryty wizualnie, chip jako `span`). Sam `aria-label` zostaje tylko tam, gdzie etykieta stoi obok jako tekst w tym samym wierszu.

Do poprawy w `index.html` (brak etykiety albo etykieta wskazuje inne pole):
| Pole | Dziś | Po |
|---|---|---|
| `#candle-chart-interval-select` | bez etykiety (`label` „Okres:” wskazuje tylko pole liniowe) | `label for` „Świeca wykresu” |
| `#line-chart-interval-select` | „Okres:” | „Okres wykresu liniowego” |
| `#sell-shares-stock-select` | akapit „Wybierz spółkę…” zamiast `label` | `label for` „Spółka do sprzedaży” + podpowiedź |
| `#policy-select` | nagłówek h4, bez etykiety | `label for` „Polityka dywidendowa” |
| `#rd-specialization-select` | bez etykiety | `label for` „Specjalizacja badań” |
| `#sector-filter` (ukryty, zgodność JS) | — | zostaje ukryty; widoczne chipy branż jako `fieldset/legend` z radiami |

Pola generowane w JS mają dziś `aria-label` (sprawdzone w ui.js, state.js, currency_ui.js i in.); te w formularzach z kilkoma polami (aukcje, lokaty, wnioski WZA) dostają widoczne `label`.

## Nakładanie się z planem 0.18.6 i „Długa gra”
| Ta makieta | Plan | Jak spiąć |
|---|---|---|
| Stan pusty (4 warianty) | **O2** `renderEmptyState({ icon, title, text, action })` | Ten sam komponent; makieta daje wygląd i warianty. Teksty według `design/04_teksty.md`. Wariant „W tabeli” dopisać do spisu O0 |
| Wariant „Zablokowane” | **D3** (kłódka i warunek, ekran 3 z listy designu) | Ten sam wygląd co zakładka zablokowana. Do czasu D3 wariant nieużywany |
| Pierwsze kroki | **D3** (stopniowe odblokowywanie) | Zadania wskazują tylko rzeczy otwarte od startu (rynek, Bank, TeamedUP!), więc działają przed i po D3. Bank w D3 jest od startu |
| Pierwsze kroki | TeamedUP! → Zadania i oceny (cele od szefa) | Zadanie 4 prowadzi do celów szefa; lista nie dubluje celów, tylko uczy, gdzie są |
| Pola z etykietą | **O3** (formatowanie) — brak | Niezależne; można w tej samej wersji 0.18.6 |

## Prompt dla czatu kodu
> Wdroż makietę `plany/design/makiety/22_pierwsze_kroki.html` według `plany/design/22_pierwsze_kroki.md`. (1) Pierwsze kroki w panelu funduszu: 4 zadania, +50 PLN na konto prywatne za każde, stan w zapisie (`playerProfile.firstSteps`), stare zapisy z listą ukrytą, ARIA jak w tabeli notki (`aria-expanded`, `role=progressbar`, `aria-live=polite`). (2) `renderEmptyState` w 4 wariantach jako część O2 z planu 0.18.6 (jeśli O2 jeszcze nie weszło, zrób komponent tutaj i podłącz najpierw: portfel, pozycje, aukcje, poczta). (3) Widoczne etykiety dla pól z tabeli notki. Pasek górny bez zmian, usuń tylko ukryty wiersz konta prywatnego z `index.html`. Testy: nagroda wpada raz na zadanie; wczytanie starego zapisu nie pokazuje listy; każdy `select` w `index.html` ma etykietę (`labels.length` albo `aria-label`).
