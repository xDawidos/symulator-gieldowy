# 33. RateU (Internet; 0.18.9 G7) — do akceptacji (2026-11-23)

Makieta: [makiety/33_rateu.html](makiety/33_rateu.html) (samodzielna). Plan: `plany/plan_0.18.9_esg.md`, G7. Wspólne style liter ESG są w makietach 33–36 takie same (blok „litery ESG”).

## Litery ESG (wspólne dla 33–36)
- Skala A–D z planu: A „etyczna”, B „pojedyncze zarzuty”, C „nieetyczna”, D „duże zarzuty”. Barwy: A morski, B niebieski, C pomarańczowy, D różany. To barwy spoza zieleni i czerwieni kursu i spoza bursztynu (R4).
- Kolor nie jest jedynym nośnikiem: znaczek łączny ma przedrostek „ESG” i literę, a w karcie także słowo. Filary to kwadraty „E A”, „S C”, „G B” z nazwą filaru w `title` i w tekście dla czytnika.
- Od oceny kredytowej (makieta 26: A niebieski, AA morski, AAA fioletowy) znaczek ESG odróżnia przedrostek „ESG”. Morski i niebieski powtarzają się, ale nigdy bez liter.
- Badanie gracza ma przerywaną ramkę i napis „Twoje” lub „Twoje badanie” bursztynem.

## Co pokazuje strona
| Część | Treść | Dane | Markup / ARIA |
|---|---|---|---|
| Kafelek w ulubionych | „RateU”, chip „Etyka spółek”, ikona `ranking`, odcień morski | nowy wpis w `INTERNET_FAVORITES` (`host: 'rateu.pl'`) | jak `.net-fav` |
| Nagłówek strony | logo, nazwa, jedno zdanie o skali i filarach | — | `section[aria-labelledby]` |
| Zakładki | Ranking, Zamów badanie, Ekologia (z dopiskiem „od poziomu 4”, gdy zablokowana) | — | `role=tablist/tab/tabpanel`, strzałki lewo i prawo, `tabindex=-1` na nieaktywnych |
| Ranking | ramka z datą publikacji, liczbą ocenionych spółek i opisem impulsu (pierwsza dziesiątka około +1%, ostatnia około −1,5%); dwie tabele po 10: miejsce, spółka z tickerem, łącznie, E S G, audytor i data. „masz X% NAV” bursztynem przy spółkach w portfelu | `getEsgRating` (ocena publiczna), `stock.esgRating.{e,s,g,auditor,q}` | `table[aria-labelledby]`; na telefonie bez kolumny audytora |
| Zamów badanie | firma Etos Consulting; wybór spółki (`select`, spółki z badaniem wyłączone z dopiskiem „masz już badanie”); koszt 0,02% kapitalizacji w widełkach 15 000–300 000 PLN, płaci fundusz; termin wyniku (po 1 kw.); ważność 4 kw.; limit „1 z 4 badań”; po wykorzystaniu limitu przycisk wyłączony z powodem | `playerProfile.esgStudies[]`, kapitalizacja, `recordPayment` | `#ru-lim[aria-live=polite]`, `aria-describedby` na wyłączonym przycisku |
| Twoje badania | spółka, zlecone, ważne do; wynik (znaczek „Twoje badanie” i filary) albo „wynik R6 kw.3”; zgodność z deklaracją: „zgodna” albo ostrzeżenie „greenwashing” (ikona alert, kolor ostrzeżenia) | jak wyżej, `stock.ethicsClaim` | tabela |
| Ekologia | poniżej poziomu 4 UEiE: kłódka, opis i skala poziomów urzędu (3 z 5, potrzebny 4); od poziomu 4: 10 proekologicznych i 10 antyekologicznych (filar E z punktami, emisje wobec średniej sektora) | `getEsgTrue().e`, `getSegmentEmission`, poziom UEiE | ten sam tabpanel; `aria-label` zakładki mówi o blokadzie |

Telefon: kolumny tabel jedna pod drugą (`@media (max-width: 900px)`), formularz zamówienia w jednej kolumnie.

## Do planu (czat planowania)
- Test G7 mówi „zakładka Ekologia ukryta poniżej poziomu 4”, a zlecenie designu mówi o stanie zablokowanym z opisem. Makieta pokazuje zakładkę zablokowaną (gracz wie, że istnieje i co ją otwiera). Proponuję zmienić test na „zablokowana z opisem, bez listy”.
- Ponowne zamówienie badania spółki z ważnym badaniem: makieta blokuje (opcja wyłączona). Do potwierdzenia w planie.

## Prompt dla czatu kodu
> Według `plany/design/33_rateu.md` i makiety `plany/design/makiety/33_rateu.html` (po wdrożeniu G1–G5 planu 0.18.9): dodaj RateU jako siódmą stronę Internetu (`INTERNET_FAVORITES`: `id: 'rateu'`, `host: 'rateu.pl'`, ikona `ranking`, ton morski) z sekcją `net-page-rateu`. Strona ma trzy zakładki ARIA (tablist, strzałki): Ranking (2 × 10 według oceny publicznej, łącznie i E S G, audytor i data, „masz X% NAV” przy spółkach w portfelu), Zamów badanie (Etos Consulting, `select` spółek, koszt 0,02% kapitalizacji w widełkach 15 000–300 000 PLN z `recordPayment`, wynik po 1 kw., ważny 4 kw., limit 4 na kwartał, lista Twoich badań ze zgodnością deklaracji) i Ekologia (od poziomu UEiE 4; niżej stan zablokowany z kłódką i poziomem urzędu). Znaczki liter ESG jako wspólna funkcja (np. `esgBadgeHtml(grade, { mine, big })` i `esgPillarsHtml`) z barwami A morski, B niebieski, C pomarańczowy, D różany; zawsze z literą i przedrostkiem ESG, bez emoji. Testy: Ranking 10 + 10; badanie odejmuje opłatę w widełkach i daje wynik po 1 kw.; piąte badanie w kwartale niemożliwe; Ekologia bez listy poniżej poziomu 4; brak emoji.
