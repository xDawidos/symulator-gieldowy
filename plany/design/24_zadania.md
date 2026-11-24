# 24. Zadania w TeamedUP! i przypinanie do panelu funduszu (2026-11-14)

Makieta: [makiety/24_zadania.html](makiety/24_zadania.html) (samodzielna). Uwaga użytkownika do makiety 22: panel z 22 pokazuje, jak ma wyglądać okno z zadaniami; zadania standardowo są w TeamedUP!, a można je przypiąć do panelu. Więcej zadań tematycznych: na bessę, hossę i zadania uczące mechanik (np. zwiększenie wartości). Logikę dopisuje czat planowania do 0.18.7.

## Układ
- **TeamedUP! → Zadania i oceny** = pełna lista (zastępuje dzisiejsze `renderTeamedTasks`; targety okresu i cele zarządu wchodzą jako kategoria „Od zarządu”, oceny zarządu zostają pod listą).
- **Panel funduszu → „Zadania”** = najwyżej 3 przypięte (karta z makiety 22, nagłówek „Zadania”).

## Kategorie
| Kategoria | Kolor krawędzi (nie bursztyn, R4; zawsze z ikoną i nazwą) | Kiedy się pojawia | Przykłady z makiety |
|---|---|---|---|
| Pierwsze kroki | neutralny (`--color-text-secondary`), ikona `start` | od startu, znika po wykonaniu wszystkich | Miej akcje 3 spółek; Przeczytaj zadanie od szefa |
| Od zarządu | niebieski (`--blue-400`), ikona `zarzad` | jak dziś (targety okresu, cele zarządu) | Wynik okresu powyżej GIG (+12 pkt oceny) |
| Rynek | morski (`--teal-400`), ikona `wykres` | przy dużych ruchach GIG: spadek ≥ 20% od szczytu, 18 mies. wzrostów, krach, bezpiecznik | Kup tanio w spadkach (do odbicia GIG o 10%); Zabezpiecz zyski (≥ 15% w gotówce lub obligacjach) |
| Mechaniki | fiolet (`--violet-400`), ikona `akademia` | gdy gracz ma to, czego zadanie uczy (np. ≥ 20% spółki → zadanie o wartości spółki), powiązane z kursem w Akademii | Podnieś wartość spółki o 10% (WZA, dywidendy); Pierwsza lokata na 13 tygodni |

**Zadania rynkowe a ukryta faza (decyzja z 23):** zadania „Rynek” uruchamiają **jawne fakty** (GIG wobec szczytu, czas wzrostów, krach), a nie wewnętrzna faza. Tekst opisuje fakt („GIG jest 22% poniżej szczytu”), bez nazwy fazy. Gracz z „Analityk indeksu” L4 widzi dodatkowo nazwę fazy w podpisie. Faza nie wycieka przez zadania.

## Karta zadania
| Część | Treść | Markup / ARIA |
|---|---|---|
| Kategoria | ikona + nazwa w kolorze kategorii, lewa krawędź 3 px | `li.task.c-start/.c-board/.c-market/.c-mech` (`--cat-c`) |
| Tytuł i opis | co zrobić, stan teraz; „Uczy: …” (mechanika, kurs Akademii) | `h4`, `p > small` |
| Postęp | pasek neutralny + liczby („2 000 / 5 000 PLN”, „1 z 3”) | `i[role=progressbar][aria-valuenow][aria-valuetext]` |
| Nagroda | PLN na konto prywatne bursztynem (Twoje) albo „+12 pkt oceny” jasnym tekstem | `.reward`, `.reward.is-pts` |
| Termin | „bez terminu”, „do końca roku”, „do odbicia GIG o 10%”; poniżej 7 dni ostrzeżenie z ikoną | `.exp`, `.exp.is-soon` |
| Przypnij | przełącznik; przy komplecie wyłączony z opisem „Przypięte 3 z 3. Odepnij jedno, żeby przypiąć inne” | `button.pin[aria-pressed]`, `disabled` + `aria-describedby="pin-full"` |

Nad listą: filtr kategorii (`fieldset` + `legend` ukryta wizualnie + radia, liczba zadań przy każdej) i licznik przypiętych (3 kropki + tekst). Grupy z nagłówkiem i zdaniem, kiedy zadania się pojawiają. Komunikat o przypięciu i odpięciu: `div[role=status][aria-live=polite]`.

## Panel przypiętych (panel funduszu)
| Część | Markup / ARIA |
|---|---|
| Nagłówek „Zadania · 2 z 3 przypiętych”, zwijanie | `button.pt-head[aria-expanded][aria-controls]` |
| Zadanie: tytuł, nagroda, odepnij (×), postęp, termin; krawędź w kolorze kategorii | `li.pt-item.c-*`, `button.pt-unpin[aria-label="Odepnij: …"]` |
| Pusty | „Nic nie jest przypięte. Wybierz zadanie w TeamedUP! i kliknij Przypnij.” | `.pt-empty` (wzór `renderEmptyState`) |
| Stopka | „Wszystkie: 7” + link „Otwórz TeamedUP!” | `.pt-foot` |

## Zasady (dla czatu planowania, 0.18.7)
- Limit przypiętych: **3**. Na starcie gra sama przypina 3 pierwsze zadania z Pierwszych kroków i dopina kolejne w wolne miejsce; inne kategorie przypina tylko gracz.
- Wykonane zadanie: nagroda od razu, karta 1 kwartał w liście jako wykonana, potem do historii; z panelu znika (miejsce się zwalnia).
- Wygasłe zadanie: znika bez kary; zadania rynkowe wygasają, gdy fakt minie (np. odbicie GIG).
- Jednocześnie aktywne najwyżej 2 zadania „Rynek” i 3 „Mechaniki”, żeby lista nie rosła.
- Nagrody startowe (do strojenia w przebiegach): Pierwsze kroki 50 PLN, Mechaniki 50–300 PLN, Rynek 100–150 PLN; Od zarządu jak dziś (punkty oceny i premia).
- Stan w zapisie: `playerProfile.tasks = { active: [...], pinned: [id…], done: [...] }`; stare zapisy: Pierwsze kroki pominięte.
- Telefon: TeamedUP! w ramie z makiety 19 (lista zamiast bocznego menu), panel przypiętych w szufladzie funduszu (makieta 18).

## Prompt dla czatu kodu
> Wdroż makietę `plany/design/makiety/24_zadania.html` według `plany/design/24_zadania.md` po dopisaniu logiki do planu 0.18.7. TeamedUP! → Zadania i oceny: lista z kategoriami (Pierwsze kroki, Od zarządu, Rynek, Mechaniki), filtr `fieldset` z radiami, karta zadania z postępem (`role=progressbar`, `aria-valuetext`), nagrodą, terminem i przyciskiem `Przypnij` (`aria-pressed`, limit 3, `disabled` + `aria-describedby` przy komplecie). Panel funduszu: karta „Zadania” z przypiętymi (makieta 22 + 24), `Odepnij` z `aria-label`, stan pusty. Komunikaty przypięcia i nagród w `aria-live=polite`. Zadania „Rynek” uruchamiane jawnymi faktami GIG, bez nazwy fazy przed L4. Testy: limit 3; auto-przypinanie tylko Pierwszych kroków; zadanie rynkowe nie zawiera nazwy fazy bez L4; stary zapis bez Pierwszych kroków.
