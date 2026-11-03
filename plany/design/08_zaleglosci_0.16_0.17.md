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

**Flagi:** nie przywracałem ich tam, gdzie zastąpiła je nazwa kraju (wiersz spółki, okno giganta). Zostały jednak w innych miejscach: zakładki krajów, karta kraju, kantor, Obce, gotówka, Ferie, zarażanie, połączenia, wybór kraju startowego. Do decyzji użytkownika, czy też mają zniknąć.

## Etap 3. Projekt 0.17
Zrobione: projekt [09_ui_0.17.md](09_ui_0.17.md), makieta [makiety/09_ui_017.html](makiety/09_ui_017.html), CSS (blok „0.17”), 11 ikon (7 surowców, 3 transportu, „Mistrz Opcji”) w `ui.js` i `img/ikony/`, ikony transportu w sekcji frachtu. Testy: 957.

## Co zostało
1. **Po scaleniu S7:** wdrożenie okna giełdy towarowej, frachtu, wiersza bezpieczeństwa, ustawy, przetargu autostrady, pustego stanu Ulubionych i ikony „Mistrza Opcji” (prompt w `09_ui_0.17.md`).
2. **Konflikt przy scalaniu:** S7 dopisuje wiersz „Bezpieczeństwo państwa” do starego `<dl>` w `renderCountryCard`, a tu ten `<dl>` zamienił się na `.country-facts`. Wiersz trzeba przenieść na nową listę.
3. **Figma:** bez aktualizacji (import `img/ikony/arkusz.html` i komponentów, gdy serwer zadziała).
4. **Emoji w kodzie danych** (`icon` w `CRISIS_LINES`, hasła Akademii, `infrastructure.js`) zostają; widok sekcji Kryzys używa już `svg`.
