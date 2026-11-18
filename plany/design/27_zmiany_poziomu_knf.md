# 27. Zmiany poziomów i zasady KNF (E0c, E0d; ekran 18) — DO AKCEPTACJI

Makieta: [makiety/27_zmiany_poziomu_knf.html](makiety/27_zmiany_poziomu_knf.html) (samodzielna). Plan: 0.18.7 E0c i E0d. Bez nowych okien: wszystko w Poczcie, na Tied, w pasku wiadomości i w Państwo → Nadzór.

## E0c: zmiany poziomów
| Kanał | Treść | Markup / ARIA |
|---|---|---|
| **Gazeta Ekonomiczna** (Poczta, jak dziś mail o stopach) | jeden wpis na kwartał „Przegląd poziomów giełd: N zmian”; najwyżej 6 zmian z opisem (spółka, poziom → poziom, jedno zdanie dlaczego), reszta jednym zdaniem; przy spółkach, które masz: „masz 40 akcji” bursztynem | `article.mail[aria-labelledby]`, `.chg.is-up/.is-down/.is-diamond` (ikona `faza-hossa` / `faza-bessa` / `diament` / `blokada` dla spadku po utracie oceny), `.lvl.t-*` (poziom słowem w kolorze metalu), `.mine` |
| **Mail do posiadacza** (Poczta, od biura maklerskiego) | tylko gdy fundusz albo konto prywatne ma akcje; ile masz, dlaczego awans, czego się spodziewać („fundusze indeksowe zwykle kupują przez 1–2 tygodnie; kurs może wzrosnąć, ale nie musi”), przycisk „Pokaż kartę” | `.expect` (ikona `info`), `button` |
| **Tied** | wpis analityka przy Diamentowej i dużych spadkach | wzór wpisu z makiety 23 §4 |
| **Pasek wiadomości** | „Bractwo Stali na Diamentowej”, „Huta Katowice awansuje na Platynową” — ikona i słowo, **bez emoji** (dziś `📈 AWANS` w `finance.js:997`) | `.ticker span` |

## E0d: KNF zmienia zasady
| Część | Treść | Markup / ARIA |
|---|---|---|
| **Mail KNF** | powód (afera ratingowa, krach, hossa), oś czasu: ogłoszenie → obowiązuje od (+1 kw.) → koniec okresu przejściowego (+4 kw.), tabela „Co się zmienia”: wymogi GPW z liczbami (jawne), poziomy giełd **bez liczb** („Złota: wyższy próg wielkości”, „Platynowa: ocena A → A+”) | `ol.tl[aria-label]` (`li.is-done`, `.is-now`), `table.rules` z `caption`, `.was` (przekreślone) + `.new` |
| **Państwo → Nadzór: zasady wejścia** | tabela obowiązujących wymogów GPW i oceny dla Platynowej, zapowiedziane zmiany jako znacznik z zegarem „48 mln od R5 kw.4”, lista wcześniejszych zmian | `section.nadzor`, `.badge` (kolor ostrzeżenia + ikona `zegar`), `ul.hist` |
| **Pasek wiadomości** | „KNF zaostrza zasady wejścia od R5 kw.4” z ikoną `waga` | `.ticker span` |

Telefon: oś czasu staje się pionowa (`@media (max-width: 640px)`).

## Zgodność z wcześniejszymi ustaleniami
- Progi poziomów nie są publiczne (E0a, makieta 18 po poprawce) — w mailu KNF i w Nadzorze tylko kierunek zmiany.
- Bursztyn tylko przy akcjach gracza (R4); kolor metalu zawsze ze słowem.
- „Gazeta Ekonomiczna” to dziś nadawca maili w Poczcie (`core.js:5043`), więc nie ma nowego okna.

## Prompt dla czatu kodu
> Według `plany/design/27_zmiany_poziomu_knf.md` i makiety `plany/design/makiety/27_zmiany_poziomu_knf.html` (E0c, E0d planu 0.18.7): kwartalny wpis Gazety Ekonomicznej o zmianach poziomów (najwyżej 6 z opisem, reszta zbiorczo, `.lvl` dla poziomów, „masz N akcji” przy pozycjach gracza), mail do posiadacza z oczekiwanym efektem, wpis Tied przy Diamentowej, linie w pasku wiadomości bez emoji; mail KNF z osią czasu i tabelą zmian (GPW z liczbami, poziomy bez liczb) oraz sekcja „Zasady wejścia” w Państwo → Nadzór. Testy: maks. 6 opisanych zmian na wpis; brak emoji w tekstach zmian; mail do posiadacza tylko przy akcjach gracza; w mailu KNF brak liczb przy poziomach giełd.
