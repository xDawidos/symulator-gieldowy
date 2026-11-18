# 26. Ocena w wierszu spółki i w karcie spółki obcej (E0a; ekran 17) — DO AKCEPTACJI

Makieta: [makiety/26_ocena_w_wierszu.html](makiety/26_ocena_w_wierszu.html) (samodzielna). Plan: 0.18.7 E0a „Ocena widoczna dla gracza”.

## Co pokazuje / markup
| Część | Co pokazuje | Markup / ARIA |
|---|---|---|
| Znacznik w wierszu | przy nazwie spółki mała ramka z oceną (A, A+, AA, AAA), **tylko ocena publiczna (≥ A)**. Poniżej A znacznika nie ma (oceny poniżej A są ukryte, seria 6.4) | `span.rt(.is-top)` z `title` i tekstem dla czytnika „: ocena audytora” (`.sr`) |
| Kolor | neutralny; AA i AAA mocniejsza ramka (`.is-top`). Bez zieleni i czerwieni (są dla zmian kursu) i bez bursztynu (R4) | — |
| Kafelek „Ocena” w karcie spółki obcej | jak w karcie krajowej (`renderCompanyCard`, `ui.js:4389`): ocena dużą czcionką, „Audyt: [firma], ważna do R6 kw.2” | `.kpi.is-rating > strong[aria-describedby] + small[id]` |
| Bez oceny publicznej | „Brak oceny publicznej” + „Ocena poniżej A albo brak audytu. Publiczne są oceny od A.” | `.kpi.is-none` |

Telefon: znacznik zostaje (przed tagiem branży, który się chowa), nazwa skraca się wielokropkiem.

## Dane
`getPublicRating(stock)` (`listings.js:619`, `publicFrom: 'A'`); audytor i data ważności z tego samego wpisu oceny. Spółki obce: ta sama funkcja, gdy rynek kraju ma oceny (E0a, „krajowe osobno, obce osobno” dotyczy progów, nie ocen).

## Prompt dla czatu kodu
> Według `plany/design/26_ocena_w_wierszu.md` i makiety `plany/design/makiety/26_ocena_w_wierszu.html`: znacznik `.rt` z oceną publiczną (≥ A) w wierszu listy spółek obok nazwy (z tekstem dla czytnika), kafelek „Ocena” w karcie spółki obcej jak w krajowej (ocena, audytor, ważność; bez oceny: zdanie „Brak oceny publicznej”). Testy: spółka z oceną BBB nie ma znacznika; spółka z A ma; karta obca pokazuje kafelek.
