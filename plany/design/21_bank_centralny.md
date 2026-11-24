# 21. Bank Centralny z wykresem stopy i inflacji (R13, O9)

Makieta: [makiety/21_bank_centralny.html](makiety/21_bank_centralny.html). Okno Bank w ramie z [19_okna.md](19_okna.md), zakładka „Bank Centralny”.

## Problem
Dziś zakładka to jedno zdanie („Stopa bazowa: X%”), karta prezesa i oferta dla Skarbu Państwa. Gracz nie widzi, skąd się bierze stopa ani dokąd idzie, chociaż gra to liczy (reguła Taylora, oczekiwania analityków).

## Co pokazuje / markup
| Część | Co pokazuje | Dane | Markup |
|---|---|---|---|
| Nagłówek | „Inflacja 4,1%, cel 2,5%. Analitycy czekają na podwyżkę stopy o 0,50 pkt proc. na najbliższym posiedzeniu.” | `macro.inflation`, `INFLATION_TARGET`, `macro.expectation.label` | `.wn-head p` |
| Pasek liczb | Bez zmian (`renderBankTicker`). Pieniądze funduszu bursztynem (R4) | | `.wn-strip b.is-mine` |
| Decyzja | Stopa dużą liczbą i „bez zmian od 2 posiedzeń” | `centralBank.baseInterestRate`, liczba kwartałów bez zmian z `macro.history` | `.cb-decision`, `.cb-rate` |
| Wykres | 16 kwartałów (`MACRO_HISTORY_LIMIT`): stopa jako schodki, inflacja jako linia, cel 2,5% przerywaną linią z pasem 1,5–3,5%. Wartości na prawym końcu. Najechanie albo Tab na kwartał: dymek z obiema liczbami | `macro.history[].rate`, `.inflation` | `svg.cb-chart`, `.rate`, `.infl`, `.tgt`, `.band`, `rect.hit` + `g.tip` |
| Następne posiedzenie | Oczekiwanie analityków i jedno zdanie, co robi niespodzianka | `macro.expectation` | `.cb-next` |
| Skąd bierze się stopa | Rozkład `getTaylorRate()`: inflacja + 1,00 + ½·(inflacja − cel) − ½·(bezrobocie − 6%) ± 0,5 za cechę prezesa = stopa docelowa. Zdanie: zmiana najwyżej o 0,50 pkt na posiedzenie | `NEUTRAL_REAL_RATE`, `NATURAL_UNEMPLOYMENT`, `getBcTraits()`, `BC_MAX_STEP` | `dl.cb-rule`, `.sum` |
| Prezes | Imię, cechy jako chipy z opisem w `title` | `centralBank.ceo` | `.cb-ceo`, `.cb-traits` |
| Ostatnie decyzje | 4 ostatnie kwartały: zmiana ze strzałką, bez koloru (podwyżka nie jest „dobra” ani „zła”) | różnice w `macro.history[].rate` | `.cb-history` |

Oferta dla Skarbu Państwa zostaje pod spodem bez zmian.

**Podczas linii kryzysu** (`getCrisisRateChange()` nie jest null) rozkład reguły zastępuje zdanie: „Kryzys: bank tnie stopy niezależnie od reguły” i etap kryzysu.

## Otwarte
- **Kolor okna Banku.** `--color-section-bank` to dziś bursztyn, a po R4 bursztyn znaczy „Twoje”. Makieta używa neutralnego `--ink-300`. Decyzja użytkownika: neutralny albo inny kolor sekcji.
- O9 dopuszczało połączenie z Państwo → Makro. Proponuję zostawić w Banku: tu gracz decyduje o lokatach i obligacjach, a Makro może linkować „Szczegóły stóp → Bank”.

## Prompt dla czatu kodu
> Rozbuduj zakładkę „Bank Centralny” okna Bank według `plany/design/21_bank_centralny.md` i makiety `plany/design/makiety/21_bank_centralny.html`. Dodaj: decyzję (stopa i liczba posiedzeń bez zmian), wykres SVG z `macro.history` (stopa jako schodki, inflacja jako linia, cel `INFLATION_TARGET` z pasem ±1 pkt, dymek na najechanie i fokus), oczekiwanie analityków z `macro.expectation`, rozkład `getTaylorRate()` na składniki (wydziel funkcję zwracającą składniki, żeby UI i reguła liczyły to samo), kartę prezesa z cechami i 4 ostatnie decyzje. Podczas kryzysu zamiast rozkładu pokaż zdanie o kryzysie. Testy: suma składników = `getTaylorRate()` (przed obcięciem do `BC_RATE_LIMITS`), wykres ma tyle punktów co `macro.history`, stan pusty przy historii krótszej niż 2 kwartały („Wykres pojawi się po drugim kwartale.”).
