# Decyzje 0.18.6 Porządki

Plan: `plany/plan_0.18.6_porzadki_dluga_gra.md` (sekcja 0.18.6). Decyzje użytkownika U1–U8: `decyzje_0.18.md`. Praca autonomiczna; sprawy zmieniające grę na końcu w sekcji „Do decyzji użytkownika”.

| # | Część | Decyzja | Uzasadnienie |
|---|---|---|---|
| E1 | O0 | Spis (`raporty/spis_0.18.6.md`) zrobiony narzędziem `spis_formatow.mjs` z klasyfikacją tekst / svg / obliczenie / log / dane. Plan prosi o pokazanie spisu przed O1; zgodnie z briefem pracy autonomicznej idę dalej, a spis jest w raporcie kontroli | Spis nie zmienia gry; O1 dotyczy debug, nie formatów |
| E2 | O1 | `debug.js` ładowany zawsze (gra, testy): 10 funkcji z `ui.js`, 4 z `core.js`, blok `#debug-tools` budowany w JS i wstawiany do `.debug-settings` tylko przy włączonym trybie (po wyłączeniu nie ma go w DOM). W `ui.js` zostają `isDebugMode`, `isIntroSkipEnabled` i `checkWorldInvariants` (czyta je kod gry i testy). `renderGenealogyDebug` zostaje w `companies.js` (czyta dane genealogii). Etykiety: „konto prywatne” zamiast „prywatnie”, waluta z `getBaseCurrency()` | Plan O1 |
