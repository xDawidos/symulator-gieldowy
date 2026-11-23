# 34. Karta spółki: Etyka i ESG (0.18.9 G8) — zaakceptowane 2026-11-23

Makieta: [makiety/34_karta_esg.html](makiety/34_karta_esg.html) (samodzielna). Plan: `plany/plan_0.18.9_esg.md`, G8. Litery i barwy jak w notce 33.

## Znaczek w wierszu listy spółek
- Po znaczku oceny kredytowej (makieta 26) stoi `ESG` z literą: ocena publiczna albo Twoje badanie. Twoje badanie ma przerywaną ramkę i słowo „Twoje” bursztynem w znaczku.
- Bez oceny nie ma znaczka, jak przy ocenach kredytowych poniżej A.
- Kara za greenwashing w ostatnich 8 kw.: ikona `alert` w kolorze ostrzeżenia z `title` i tekstem dla czytnika („kara za greenwashing R6 kw.1”).
- Gdy jest i ocena publiczna, i Twoje badanie, wiersz pokazuje ocenę publiczną (badanie widać w karcie). Do potwierdzenia: można odwrotnie, jeśli gracz woli swoje dane.

## Blok „Etyka i ESG” w krajowej karcie spółki
| Stan | Treść | Dane |
|---|---|---|
| 1. Ocena publiczna | duży znaczek, słowo, deklaracja („deklaruje etykę” z ikoną liścia albo „bez deklaracji”), audytor, data, ważność, wynik łączny; trzy filary: nazwa, litera, pasek 0–100 z kreskami progów 35, 55 i 75, punkty | `stock.esgRating`, `stock.ethicsClaim` |
| 2. Brak oceny | „brak oceny”, deklaracja, zdanie o pokryciu i odnośnik „Zamów badanie w RateU” (otwiera Internet na zakładce Zamów badanie) | — |
| 3. Twoje badanie różni się od deklaracji | ramka z bursztynowym brzegiem „Twoje badanie” (firma, data, ważność), znaczek, filary; ostrzeżenie z ikoną: deklaracja nie zgadza się z badaniem, ryzyko kary przy rozporządzeniu | `playerProfile.esgStudies[]` |
| 4. Kara za greenwashing | ocena urzędu zamiast audytora, ramka ostrzeżenia: kwartał, wycofana deklaracja, kara w PLN i % przychodu, kurs, G −20 do kwartału | wpis kary z G9 |

Spółki zagraniczne: blok w stanie 2 z dopiskiem „oceny ESG są na razie krajowe” i bez odnośnika do badania. Markup: `section.eb[aria-label="Etyka i ESG"]`, paski `role=img` z pełnym opisem, ostrzeżenia z ikoną i tekstem (nie tylko kolor).

## Prompt dla czatu kodu
> Według `plany/design/34_karta_esg.md` i makiety `plany/design/makiety/34_karta_esg.html` (po wdrożeniu G1, G7 i G9 planu 0.18.9): w wierszu listy spółek dodaj znaczek ESG po znaczku oceny kredytowej (ocena publiczna albo Twoje badanie z przerywaną ramką i słowem „Twoje”, ikona alert przy karze za greenwashing w ostatnich 8 kw.; bez oceny brak znaczka). W `renderCompanyCard` dodaj blok „Etyka i ESG”: znaczek ze słowem, deklaracja, audytor i ważność, trzy filary z paskiem (kreski progów 35/55/75) i punktami; „brak oceny” z odnośnikiem do RateU; ramka „Twoje badanie” z różnicą względem deklaracji; ramka kary za greenwashing. Zagraniczne spółki: „brak oceny, oceny ESG są na razie krajowe”. Użyj wspólnych funkcji znaczków z notki 33. Testy DOM: blok w trzech stanach (ocena, brak oceny, badanie gracza) i stan kary; litera zawsze z tekstem; brak emoji.
