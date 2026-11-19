# 26. Ocena w wierszu spółki i w karcie spółki obcej (E0a; ekran 17) — DO AKCEPTACJI

Makieta: [makiety/26_ocena_w_wierszu.html](makiety/26_ocena_w_wierszu.html) (samodzielna). Plan: 0.18.7 E0a „Ocena widoczna dla gracza”.

## Co pokazuje / markup
| Część | Co pokazuje | Markup / ARIA |
|---|---|---|
| Znacznik w wierszu | przy nazwie spółki mała ramka z oceną (A, A+, AA, AAA), **tylko ocena publiczna (≥ A)**. Poniżej A znacznika nie ma (oceny poniżej A są ukryte, seria 6.4) | `span.rt.g-*` z `title` i tekstem dla czytnika „: ocena audytora” (`.sr`) |
| Kolor (poprawka 2026-11-19) | A i A+ niebieski (`--blue-400`), AA morski (`--teal-400`), AAA fioletowy (`--violet-400`); zawsze z literami. Bez zieleni i czerwieni (kurs) i bez bursztynu (R4) | `.rt.g-A/.g-Ap/.g-AA/.g-AAA` (`--rt-c`) |
| Kilku audytorów (poprawka 2026-11-19) | znacznik pokazuje ocenę główną i liczbę ocen („AA ×3”); czytnik: „ocena audytora, główna z 3” | `.rt .cnt[aria-hidden]` |
| Kafelek „Oceny” w karcie spółki (krajowej i obcej) | ocena główna dużą czcionką + „ocena główna z 3 audytorów” + lista: audytor, jego ocena w kolorze, ważność. Audytor może mieć własną skalę, np. punkty 0–100 („90/100”, z podpowiedzią „90 odpowiada AA”) | `.kpi.is-rating`, `ul.rl[aria-label] > li` |
| Bez oceny publicznej | samo „Brak oceny publicznej”, bez wyjaśnienia (poprawka 2026-11-19) | `.kpi.is-none` |

Telefon: znacznik zostaje (przed tagiem branży, który się chowa), nazwa skraca się wielokropkiem.

## Do decyzji w planie (czat planowania, E0a)
- **Kilku audytorów na spółkę** (prośba użytkownika 2026-11-19): każdy audytor wystawia własną ocenę, ważną 4 kwartały. Propozycja: **ocena główna = środkowa (mediana) z ważnych ocen**; ona liczy się do bramek poziomów (Platynowa A, Rubinowa A+, Szmaragdowa AA). Przy dwóch ocenach: niższa.
- **Skala punktowa** jednego z audytorów (0–100): przeliczana na litery do oceny głównej, np. 95–100 AAA, 88–94 AA, 80–87 A. Do kalibracji.
- Dziś `getPublicRating` zwraca jedną ocenę; potrzebna lista ocen na spółkę.

## Dane
`getPublicRating(stock)` (`listings.js:619`, `publicFrom: 'A'`); audytor i data ważności z tego samego wpisu oceny. Spółki obce: ta sama funkcja, gdy rynek kraju ma oceny (E0a, „krajowe osobno, obce osobno” dotyczy progów, nie ocen).

## Prompt dla czatu kodu
> Według `plany/design/26_ocena_w_wierszu.md` i makiety `plany/design/makiety/26_ocena_w_wierszu.html`: znacznik `.rt` z oceną publiczną (≥ A) w wierszu listy spółek obok nazwy (z tekstem dla czytnika), kolory `.rt.g-A/.g-Ap/.g-AA/.g-AAA`, przy kilku audytorach „×N”; kafelek „Oceny” w karcie spółki krajowej i obcej (ocena główna + lista audytorów z oceną i ważnością, także skala punktowa; bez oceny: „Brak oceny publicznej”). Najpierw decyzja planu o ocenie głównej przy kilku audytorach. Testy: spółka z oceną BBB nie ma znacznika; spółka z A ma; przy 3 ocenach znacznik pokazuje medianę i „×3”; karta obca pokazuje kafelek.
