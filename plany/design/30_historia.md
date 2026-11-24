# 30. Ranking → Historia (0.18.8 D6, ekran 6) — zaakceptowana 2026-11-21

Makieta: [makiety/30_historia.html](makiety/30_historia.html) (samodzielna). Kod dziś: `displayLeaderboard()` z zakładką „history” i `renderDecadeArticle(rep, true)` (`ui.js` ok. 2910–2962), 5125efc bez makiety: wszystkie raporty jeden pod drugim. Wiadomość „Kronika Rynku” w TeamedUP! zostaje jak w makiecie 23 §3.

## Co pokazuje / markup
| Część | Treść | Markup / ARIA |
|---|---|---|
| Nagłówek okna | zdanie stanu: „30 lat gry, 3 dekady w historii. Fundusz wyprzedza GIG w 2 z 3.” | `.wn-head p` (rama z makiety 19) |
| Wykres | słupki parami: Twój fundusz (bursztyn, R4) i GIG (szary) dla każdej dekady, nad parą różnica w pkt (zielona/czerwona z „+/−”) | `svg[role=img][aria-label]` z pełnym opisem liczb |
| Lista dekad | od najnowszej: „Dekada 3”, „rok 21–30, fundusz +77%, GIG +52%”, różnica po prawej; wybrana z paskiem; na końcu „Dekada 4 w toku” (przerywana, nieklikalna) | `nav > ol > li > button.dec[aria-current]` |
| Raport | ten sam `.dk` co wiadomość, w wersji pełnej: wynik, najlepsza i najsłabsza spółka, Twoja najlepsza pozycja, rynek, sektory, kariera, kryzysy i czarne łabędzie (lista z rokiem, łabędź z ikoną), rządy (sekwencja ze strzałkami) | `article.dk`, `.dk-cell.is-wide`, `ul.ev`, `ol.gov`; panel z `aria-live=polite` przy zmianie dekady |
| Pusto | `renderEmptyState` jak dziś: „Historia jeszcze pusta”, pierwsze podsumowanie po 10 latach | — |
| Telefon | wykres i lista nad raportem | `@media (max-width: 760px)` |

Miejsce na „Wkład w Miasto” (0.19.2) zostaje komentarzem w siatce. Nazwy rządów z `RULING_PARTIES`.

## Prompt dla czatu kodu
> Przebuduj zakładkę Ranking → Historia według `plany/design/30_historia.md` i makiety `plany/design/makiety/30_historia.html`: po lewej wykres fundusz vs GIG po dekadach (SVG z `aria-label`) i lista dekad (`button[aria-current]`, ostatnia „w toku”), po prawej jeden raport `renderDecadeArticle(rep, true)` wybranej dekady (domyślnie najnowszej), z kryzysami jako listą z rokiem i rządami jako sekwencją. Testy: przy 3 raportach są 3 przyciski + „w toku”; klik zmienia raport; przy 0 raportów stan pusty.
