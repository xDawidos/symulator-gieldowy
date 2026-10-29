# Diagnoza 0.16.6 S0a — miejsca zakładające Polskę jako kraj startowy

Stan: gałąź `claude/impl-0166-s0-a31600` (po 0.16.9). Inwentaryzacja grepem po kodzie i czytanie punktów wejścia (`startNewCareer`, `completeIntroScene`, `countries.js`, `currency.js`).

## Wynik inwentaryzacji

| Obszar | Miejsca zakładające PL | Ocena kosztu uogólnienia |
|---|---|---|
| Waluta bazowa | `toPln`/`fromPln` (≈30 użyć w kodzie), literały „PLN”/„zł” ≈ 300 wystąpień w 25 plikach (`companies.js` 143, `ui.js` 81, `player.js` 67, `learning.js` 48, `core.js` 45…), `formatZl` jest jedynym formaterem kwot, ale literały w opisach i mailach go omijają | Kurs `fxRates` jest wyceniany w PLN (zł za 1 jednostkę), cały NAV, ranking, niezmienniki i limity (progi stanowisk, przepustki w `START_COUNTRIES`) są w PLN. Prawdziwa waluta bazowa = przepisanie wyceny i ~300 napisów. **XL** |
| Giełda „GPW” | 105 wystąpień (`listings.js` 42, `finance.js` 21, `ui.js` 16, `learning.js` 6…): rynki NewHorizons/GPW/Prywatna, awans/zejście, `marketRegimes.home`, GIG/SIG20 | Rynek macierzysty to cały silnik (≈100 spółek z `companies.js`, ~13 tys. linii). Jego zamiana na DAX/Wall Street = nowy zestaw spółek krajowych w pełnym modelu. **XL** |
| Spółki startowe i boty krajowe | `companies.js`, `ai.js`, `bots_domestic.js` — polskie nazwy, KNF, polscy prezesi (`ceoTraits`) | Zależne od rynku macierzystego. **XL** |
| Społeczeństwo (0.13), partie, ustawy, urzędy, migracja | `state.js`, `events.js`, `campaigns.js`, `crises.js` — klasy, 6 partii, KNF/CBA/UOKiK, stopy NBP; krajowe `labour` w `COUNTRY_DEFS` jest tylko profilem informacyjnym | Pełne społeczeństwo dla DE/US/CZ to nowy zestaw danych i testów (jak 0.13). **XL**, odrębna wersja |
| Kryzysy (0.15.3) | `crises.js`: źródło kryzysu = rynek macierzysty; „kraj startowy jako źródło” wymaga kraju z pełnym modelem | **L** (po S0d) |
| UI | „PLN”, „konto prywatne”, flaga PL w nagłówku, `START_COUNTRIES` (ekran startu: lista z kłódkami) | Ekran startu jest jedynym miejscem wyboru; zmiana waluty wyświetlania byłaby niespójna z literałami |

Obserwacja kluczowa: `playerProfile.country` i `START_COUNTRIES` już istnieją (dziś zawsze `'PL'`, reszta „wkrótce”), a dołączanie krajów (`joinCountry`, bilety, kantor, boty zagraniczne, GDR) jest gotowe z 0.16.2–0.16.9 i działa dla każdego kraju z `COUNTRY_DEFS`.

## Decyzja: podział zakresu

Zbyt wiele założeń (powyżej: 4 obszary XL), więc zgodnie z poleceniem:

- **S0 (ta wersja, 0.16.10)** = wybór kraju startowego + globus + **kraj startowy jako parametr dla krajów z pełnymi danymi giełdowymi: PL, DE, US, CZ** (lista w jednym miejscu: `START_PLAYABLE`). Efekty wybranego kraju (poza PL), wszystkie zbudowane na gotowych mechanizmach:
  1. giełda kraju jest dołączona od pierwszego dnia (`joinCountry(id, 'start')`), spółki, operator, nadzór i boty zagraniczne kraju działają;
  2. gracz (i tylko gracz) handluje na giełdzie kraju startowego **bez biletu** (rynek „domowy”, prowizja operatora kraju);
  3. profil kraju (`labour`, nadzór, stopa) jest widoczny na karcie kraju; w poczcie powitalnej kraj startowy jest wymieniony;
  4. zapis v19: `playerProfile.country`; stare zapisy = Polska.
- **Waluta konta (decyzja):** jednostką rozliczeniową gry pozostaje **PLN** dla każdego kraju startowego (NAV, ranking, czynsze, limity). Waluta kraju startowego jest dla gracza walutą „własną”: kantor bez opłaty za dostęp, a karta kraju i okno rynku pokazują ceny w tej walucie z przelicznikiem. Powód: bezpieczeństwo niezmienników (wszystko wycenia `toPln`) i zero literałów do przepisania; GIG dla PL bez zmian z założenia (ścieżka PL nie dotyka nowego kodu).
- **S0d (osobna wersja, nie zrobiona tu):** prawdziwy rynek macierzysty i społeczeństwo kraju startowego innego niż PL (GPW → DAX/WSE jako rynek „home”, klasy, partie, ustawy, urzędy, migracja, kryzysy z kraju startowego, waluta bazowa). To oddzielny, duży projekt (≈ koszt 0.13 + 0.15.4); do planu jako 0.17.x.

## Koszt (szacunek po decyzji)

S0b ≈ S (kilka funkcji w `countries.js`, `ui.js`, `main.js`), S0c ≈ M–L (nowy plik `country_picker.js` + CSS, ładowanie biblioteki 1 MB + tekstur 2 MB na żądanie), pomiar ≈ M.
