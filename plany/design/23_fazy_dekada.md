# 23. Fazy rynku, bezpiecznik, podsumowanie dekady (usprawnienia UI i UX, 2026-11-13)

Makieta: [makiety/23_fazy_dekada.html](makiety/23_fazy_dekada.html) (samodzielna). Zgłoszenie użytkownika „usprawnienia UI i UX”, punkt 3.

## Decyzje użytkownika (2026-11-13)
- **Faza rynku zostaje ukryta do „Analityk indeksu” L4.** Akcent fazy działa tylko wtedy, gdy gracz widzi fazę. Wcześniej świat daje sygnały: wpisy na Tied i maile firm informacyjnych.
- **Podsumowanie dekady = wiadomość od firmy informacyjnej w TeamedUP!**, bez nowego okna (zgodne z zasadą „bez nowych okien modalnych”).
- Bursztyn tylko dla rzeczy gracza (R4). Kolor nigdy sam: faza zawsze słowem i ikoną.

## 1. Akcent fazy rynku
| Element | Co robi | CSS |
|---|---|---|
| Atrybut | `.app-main[data-phase="bull"…]` ustawiany w `updateMoodKpi()` **tylko przy L4** i tylko dla fazy pokazanej (`regime.shownPhase`). Bez L4 albo w trakcie potwierdzania: atrybutu nie ma | — |
| Zmienne | `--phase-c` = `--color-phase-*` (tokeny już są), `--phase-soft` = 12% koloru, `--phase-line` = 70% | `[data-phase=…] { --phase-c: … }` |
| Chip w pasku | ikona fazy + nazwa + „1 kw.” (od kiedy), ramka i tło w kolorze fazy | `.phase-chip` (zastępuje obecny chip w `#topbar-mood-slot`) |
| Krawędź rynku | 2 px u góry panelu rynku w kolorze fazy; jedyna zmiana na powierzchni ekranu | `.ms-market { box-shadow: inset 0 2px 0 var(--phase-line, transparent) }` |
| Bessa, Kapitulacja | wykresy z 7 sesji przygaszone (opacity .75), kolory zielony/czerwony bez zmian | `[data-phase=bear] .spark` |
| Ruch | Euforia: powolny połysk chipa (4 s). Zmiana fazy: jedno podświetlenie chipa 0,9 s (`.is-changed`, zdjąć po animacji). Oba tylko przy `prefers-reduced-motion: no-preference` | `@keyframes phase-shine`, `phase-ring` |

Euforia używa `--color-phase-euphoria` (yellow-300), nie bursztynu `--amber-400`; różnicę niesie też słowo i ikona.

## 2. Bezpiecznik giełdowy
Zastępuje `#circuit-breaker-banner` (dziś: emoji 🚨, wersaliki, pulsujące czerwone tło).
| Część | Treść | Markup / ARIA |
|---|---|---|
| Kontener | czerwona lewa krawędź 4 px, tło 9% czerwieni, bez pulsowania | `section.cb[role=alert][aria-labelledby][aria-describedby]`, sticky pod paskiem jak dziś |
| Tytuł | „Handel wstrzymany: bezpiecznik giełdowy” + poziom jako 3 kreski | `h3#cb-t`, `.cb-lv[role=img][aria-label="poziom 2 z 3"]` |
| Opis | spadek GIG od początku tygodnia, co z zleceniami, co przy kolejnym progu (−10% → 15 s, −13% → 30 s, −20% → 60 s) | `p#cb-d` |
| Licznik | duża liczba sekund + pasek kurczący się do zera | `.cb-time[aria-hidden=true]`, `.cb-bar` (`--left` w %) — licznik nie jest czytany co sekundę |
| Wejście | jedno przesunięcie 0,5 s przy pojawieniu się (`.is-new`), wyłączone przy ograniczonym ruchu | `@keyframes cb-in` |

Ikona `blokada` ze sprite'a zamiast emoji. Tekst z `updateCircuitBreakerUI()` bez wersalików.

## 3. Podsumowanie dekady w TeamedUP!
| Część | Treść | Dane (D6, `history.js`) |
|---|---|---|
| Kontakt na liście | „Kronika Rynku”, tag „Firma informacyjna”, temat „Dekada 1 (rok 1–10): podsumowanie”, kropka nieprzeczytanej | nowy nadawca w `getTeamedMessages()` (typ `info`) |
| Nagłówek wiadomości | „Dekada 1: rok 1–10” | numer dekady |
| Wynik | NAV / udział start → koniec (bursztynem: Twój fundusz), fundusz %, GIG %, różnica w pkt | raport D6 |
| Komórki | najlepsza spółka dekady, Twoja najlepsza pozycja, rynek (GIG, inflacja), kryzysy, Twoja kariera | raport D6 |
| **Miasto** | w 0.18.x **brak komórki** (siatka `auto-fit` sama się zamyka); od 0.19.2 komórka „Wkład w Miasto” | miejsce zostawione komentarzem w makiecie |
| Przycisk | „Pełny raport: Ranking → Historia” | zakładka z D6 |

Wiadomość to `article[aria-labelledby]`; brak `role=alert`, bo nic się nie dzieje „teraz”. Powiadomienie jak przy każdej wiadomości TeamedUP! (licznik na przycisku w pasku bocznym).

## 4. Wskazówki o fazie (bez L4)
| Kanał | Przykład | Zasada |
|---|---|---|
| Tied (wpis analityka) | „Trzeci debiut w tym miesiącu i każdy z nadsubskrypcją… Tak wyglądały ostatnie miesiące przed każdym szczytem.” | objawy, nie nazwa fazy; wiarygodność autora (3 kreski + słowo) |
| Poczta → Subskrypcje (firma informacyjna) | „Barometr Rynku: 3 z 5 wskaźników jak przed szczytem.” | wskaźniki z danych gry (wyceny, napływy, debiuty, obroty); im lepsza subskrypcja, tym wyższa wiarygodność |

Wskazówka może się mylić (szum jak w `macro.expectation`), dlatego wiarygodność. Generowanie: przy zmianie `regime.phase` i losowo raz na kilka tygodni, z opóźnieniem względem prawdziwej fazy. Gracz z L4 nadal je dostaje (to też treść świata).

## Nakładanie się z planem 0.18.6 i „Długa gra”
| Ta makieta | Plan | Jak spiąć |
|---|---|---|
| Podsumowanie dekady | **D6** (raport dekady do poczty i Ranking → Historia) | Ta sama treść; zmiana kanału: zamiast poczty **TeamedUP!** (decyzja użytkownika). Pełny raport w Historia bez zmian. Ekran 6 z listy designu = ta makieta + zakładka Historia (do zrobienia) |
| Kryzysy w dekadzie | **D5** (czarne łabędzie) | komórka „Kryzysy” liczy też łabędzie |
| Miasto | 0.19.2 | komórka dochodzi w 0.19.2 |
| Wskazówki o fazie | — (nowe) | brak w planie; do dopisania przez czat planu (np. jako punkt Długiej gry albo 0.18.6) |
| Akcent fazy, bezpiecznik | — (nowe) | brak w planie; małe, można w 0.18.6 |

## Prompt dla czatu kodu
> Wdroż makietę `plany/design/makiety/23_fazy_dekada.html` według `plany/design/23_fazy_dekada.md`. (1) Akcent fazy: `data-phase` na `.app-main` ustawiany w `updateMoodKpi()` tylko przy L4 i pokazanej fazie, zmienne `--phase-c/--phase-soft/--phase-line` z tokenów `--color-phase-*`, chip `.phase-chip`, krawędź panelu rynku, ruch tylko przy `prefers-reduced-motion: no-preference`. (2) Bezpiecznik: nowy markup `#circuit-breaker-banner` (`role=alert`, `aria-labelledby/-describedby`, licznik `aria-hidden`), ikona zamiast emoji, bez pulsowania. (3) Podsumowanie dekady jako wiadomość TeamedUP! od „Kronika Rynku” (część D6; jeśli D6 jeszcze nie weszło, odłóż). (4) Wskazówki o fazie: wpisy Tied i maile subskrypcji z wiarygodnością — najpierw uzgodnij z czatem planu. Testy: bez L4 brak `data-phase`; z L4 atrybut = `shownPhase`; bezpiecznik nie ma emoji ani wersalików; przy `reduce` brak animacji (sprawdzenie stylu obliczonego).
