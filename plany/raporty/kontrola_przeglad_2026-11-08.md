# Kontrola: poprawki z przeglądu interfejsu 2026-11-08

Lista: `plany/design/12_przeglad_2026-11-08.md`, sekcja „Do kodu”, punkty 1–13. Gałąź `claude/impl-017-s0b-891539`, baza zmiany-AI ef5a243. Testy 1055/1055. Nie scalone.

| Pkt | Co zrobione | Sprawdzone |
|---|---|---|
| 1 | Menu paska bez inline `onclick`, obsługa przez `addEventListener` po załadowaniu `ui.js`. | w grze: przycisk bez `onclick`, menu się otwiera |
| 2 | `getBankLabel`: „Bank X”, a bez podwójnego słowa, gdy nazwa zaczyna się od „Bank”. 19 komunikatów. | test, w grze 0 „Bank Bank” |
| 3 | `nameAcc` w `exchanges` i `getExchangeAcc`: „wchodzi na Giełdę Szmaragdową”, także spadek, awans, spin-off, carve-out, IPO córki. | test |
| 4 | Nazwy: Quick Business Finance, Krajoznawstwo Obce, Wynajem Szpitali, Kopalnie Węgla, Krupiewicz Group S.A., Wrona, Lombardex S.A. Tickery GBK (Galeria Bankowa) i KRUP (Krupiewicz) zamiast BKINV2 i BKCORP2; KRG był zajęty (Krecik Group, CZ). Migracja w `migrateLegacyBankSymbols`: pełne wartości w cudzysłowie w całym zapisie, więc portfel, historia, obietnice i posty Tied przechodzą na nowe symbole i nazwy. | test migracji, w grze nowe nazwy |
| 5 | Depozyt startowy bota: bez banku detalicznego trafia do dowolnego aktywnego banku. | testy |
| 6 | Wartości paska ukryte (`is-loading`) do końca `initializeGame`. | w grze: klasa zdjęta po starcie |
| 7 | `is-compact` na `.topbar` po przewinięciu o 40 px przy ≤ 640 px (`passive`), zdjęte przy powrocie. Zostaje sama gotówka (CSS z designu). | 375 px: na górze bez, po przewinięciu tylko gotówka |
| 8 | Na ≤ 640 px chipy sektorów, opcje i giełdy w bloku `#market-filters` zwiniętym za przyciskiem „Filtry (n)”; n liczy aktywne filtry. Desktop bez zmian. | 375 px: zwinięte, „Filtry (1)” po wyborze giełdy |
| 9 | „Mój fundusz” obok „Filtry (n)”: przewija do panelu i zamyka filtry. | 375 px |
| 10 | Grupy sektorów od 2 spółek; sektory z 1 spółką trafiają do wspólnej grupy „Pozostałe” na końcu giełdy. | w grze |
| 11 | „Najsilniejszy sektor” ukryty do pierwszej zmiany kursów. | w grze: ukryty na starcie |
| 12 | Globus: nazwa tylko przy wybranym kraju, pozostałe pinezki jako kropki; pinezki krajów „wkrótce” bez kliknięcia i przygaszone. | test; globusa 3D nie oglądałem |
| 13 | „Pomiń pisanie” w rozmowie z szefem dla każdego gracza, widoczny, gdy szef pisze; kończy pisanie do pytania o nazwę funduszu. | test |

## Odstępstwa i niezrobione

- **Pkt 9:** przycisk stoi w wierszu nad listą obok „Filtry (n)”, a nie w dolnym pasku ani jako pływający. Wiersz używa istniejących `btn-secondary btn-sm` i `btn-row`, a pływający przycisk wymagałby nowego wyglądu. Nowy CSS to tylko pokazanie paska i zwinięcie filtrów przy ≤ 640 px.
- **Pkt 10:** gdy na giełdzie jest tylko jedna spółka bez pary, grupa „Pozostałe” ma nagłówek z liczbą 1 (np. Giełda Platynowa). Bez nagłówka ta spółka wyglądałaby na część poprzedniej grupy.
- **Pkt 12, placeholder z obrysem kraju** przy wczytywaniu 3 MB: nie zrobiony. Obrysy są w tym samym pliku `data/kraje.js`, który się wczytuje, więc placeholder potrzebowałby osobnego, lekkiego pliku z obrysami albo grafiki od designu. Zostaje napis „Wczytywanie globusa (ok. 3 MB)…”.
- **Pkt 6:** ukrywam tylko wartości paska górnego; inne panele przy starcie mają zwykłe „—”.
- **Podgląd:** porty 8765 i 8777 zajmują serwery spoza tej gałęzi, więc w `.claude/launch.json` doszła konfiguracja `gra-kod` na porcie 8781.
- Globusa 3D i scenki z szefem nie przeszedłem w grze do końca; zrzutów brak, bo panel aplikacji był ukryty (sprawdzenie przez DOM).

## Internet i prawa kolumna (zlecenie z 2026-11-08)

- **Pauza:** otwarcie Internetu zatrzymuje czas gry przez `togglePauseGame`. Zamknięcie przywraca stan sprzed otwarcia, a pauza ustawiona wcześniej zostaje. Przejścia między stronami w otwartym oknie pauzy nie ruszają. Zamykają: krzyżyk (`closeInternet`), kliknięcie w tło i inne drogi (obserwator stylu okna).
- **Okno:** na desktopie 70% × 70% ekranu (1280×800: 896×560, 49% powierzchni), przewijanie w `.net-body`. Tło to istniejąca zasłona modali (`.modal-backdrop`), bez nowych tokenów. Na telefonie bez zmian, pełny ekran.
- **Prawa kolumna:** bez sekcji „Klienci funduszu” i „Lombard (zastaw akcji)”. Usunięte `renderFundClients` i domyślny kontener `renderPawnPanel`, który rysuje teraz tylko stronę Lombard.
- **Zobowiązania:** bez przycisków „Lombard” i „Windykator”.
- **Windykacja:** nowa strona `windykacja` w ulubionych (ikona `umowa`, kolor amber). `openDebtCollectorPanel()` otwiera tę stronę, stare okno `debtcollector-modal` usunięte.
- **Testy:** pauza (otwarcie, przejścia, zamknięcie, pauza sprzed otwarcia), windykacja (ulubione, strona, brak starego okna i sekcji kolumny). 1057/1057.
- **Sprawdzone w grze:** 1280 px (okno 49% ekranu, tło, kliknięcie w tło zamyka i wznawia czas) i 375 px (pełny ekran, bez poziomego przewijania). Zrzuty: `zrzuty_2026-11-08/internet_desktop_1280.jpg` i `internet_375.jpg`.
