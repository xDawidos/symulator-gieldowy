# Zaległości designu 0.15.x, 0.16 i 0.17: co zrobione, co zostało

Data: 2026-11-04 · gałąź `claude/design-zaleglosci-017-aa9292` (od `zmiany-AI` 256376c, niescalona) · zrzuty: `zrzuty/z017/`.

## Etap 1. Stare commity 0.15.x (`claude/design-015x-f2218c`)
| Commit | Sens dziś | Jak przeniesiony |
|---|---|---|
| `e17a0d1` kalendarz, ikona przy wystawieniu | tak | cherry-pick bez konfliktu |
| `ccf5fc1` ikony linii kryzysu | tak | cherry-pick; później przeniesione do głównego bloku `UI_ICON_PATHS`, by trafiły do `img/ikony/` |
| `ea599b3` formularz kampanii, chipy, IR, VIP | tak | ręcznie: zostaje oferta klienta 0.16.1; `campPreview` jako zwykła funkcja; przywrócone informacje o 0,5% od zebranej kwoty i limicie 30% transzy, które stary commit gubił |
| `4f0677e` mail VIP | tak | ręcznie (jeden wiersz) |
| `8fb2c3f` sekcja Kryzys | tak | ręcznie, w `renderCrisisSectionBase` (kraje 0.16.2 zostają osobno) |

Bez zmian logiki. Testy: 954 → 955.

## Etap 2. Okna z 0.16
| Element | Zmiana |
|---|---|
| Karta kraju | 4 kafelki (nastrój, stopa, kurs, powiązanie) + lista faktów `.country-facts` zamiast 11 wyśrodkowanych pól |
| Zegar giełd | status poza osią (wcześniej pasek Nowego Jorku wchodził na słowo „zamknięta”), otwarta sesja na zielono i słowem, `00:00` nie jest ucięte |
| Połączone giełdy | lista `.link-list`; wariant B jako `alert--warn` |
| Forex | pola z etykietą nad polem (`.fx-form`), stan pozycji: ikona, liczba, słowo, miernik z kreską 70%; „(zł)” → waluta bazowa |
| Kantor, tabele | kwoty się nie łamią; na telefonie tabela przewija się w poziomie |
| Kryzys z krajami | zapowiedź zarażenia jako `alert--warn`, usunięta podwójna kropka |
| Animacja lotu | `playTicketFlight` rysuje `ticket-flight`: 2 s, klik lub Esc/Enter/Spacja pomija, wyłączona przy `prefers-reduced-motion`, bez pauzy i fokusu |
| Bez zmian | Ferie i wakacje (projekt ze Stitcha 0.16.5), okno wydarzenia połączenia, Obce (GDR), lotnisko w Mieście (zwykła `bank-card`) |

Testy: 956.

**Flagi:** usunięte z całego interfejsu (decyzja użytkownika 2026-11-04): tabele, zakładki krajów, kantor, Ferie, wybór kraju startowego i pinezki globusa. Zostały nazwy krajów i ikony walut; `flagIcon`, `FLAG_MARKUP` i `CURRENCY_FLAG` skasowane, `flags.js` trzyma już tylko ikony walut. Karta kraju ma w nagłówku ikonę `rynek`.

## Etap 3. Projekt 0.17
Zrobione: projekt [09_ui_0.17.md](09_ui_0.17.md), makieta [makiety/09_ui_017.html](makiety/09_ui_017.html), CSS (blok „0.17”), 11 ikon (7 surowców, 3 transportu, „Mistrz Opcji”) w `ui.js` i `img/ikony/`, ikony transportu w sekcji frachtu. Testy: 957.

## Etap 4. Wdrożenie 0.17 po scaleniu S7
Gałąź wciągnęła `zmiany-AI` 6d432e2 (scalenie lokalne, `origin/zmiany-AI` jest starsze). Konflikt w `renderCountryCard` rozwiązany: wiersz „Bezpieczeństwo państwa” jest na liście `.country-facts`. S7 nie wprowadziło flag ani emoji.

Wdrożone wg [09_ui_0.17.md](09_ui_0.17.md): giełda towarowa (lista, serie, formularz, blokady, pozycje, karty ETC i ETF), karty frachtu, wiersz bezpieczeństwa, kroki ustawy, przetarg autostrady, pusty stan Ulubionych, ikona „Mistrza Opcji”. Linie budżetu z S7 (infrastruktura, obronność, bezpieczeństwo) zostały bez zmian, wyglądają poprawnie. Testy: 961. Zrzuty: `zrzuty/z017/w1`–`w12`.

Odstępstwa od projektu:
- Oś ustawy stoi pod całym panelem Państwa, nie w karcie „Ustawy”: 5 kroków nie mieści się w wąskiej kolumnie, nazwy się ucinały.
- 8 kart ETC i ETF zamiast dwóch z makiety, bo każdy instrument ma własne pole kwoty i przyciski.
- „(wolne: N)” przy slotach widać tylko, gdy gracz ma firmę budowlaną.

## Co zostało
1. **Emoji w kodzie danych** (`icon` w `CRISIS_LINES`, hasła Akademii, `infrastructure.js`, ikony ustaw w `SOCIAL_LAWS`) zostają. W tabeli ustaw `law.icon` jest wypisywany wprost, więc na ekranie to emoji, w tym 🛣️ przy ustawie infrastruktury z S5.
2. **Nazwa `flags.js`:** plik trzyma już tylko ikony walut.
