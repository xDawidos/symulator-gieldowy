# 35. Fundusz etyczny (panel Mój fundusz i szuflada zlecenia; 0.18.9 G6) — do akceptacji (2026-11-23)

Makieta: [makiety/35_fundusz_etyczny.html](makiety/35_fundusz_etyczny.html) (samodzielna). Plan: `plany/plan_0.18.9_esg.md`, G6. Bez nowych okien: przełącznik i potwierdzenie są w panelu, ostrzeżenie w istniejącej szufladzie zlecenia (`stock-drawer-impact`).

## Panel „Mój fundusz” (`#portfolio`, pod `#fund-summary`)
| Stan | Treść | Markup / ARIA |
|---|---|---|
| Wyłączony | przełącznik, co daje deklaracja (napływ +15%, klienci etyczni 2 × częściej), jakie limity i kwartał na dopasowanie; pod spodem powód z G6a: udział NAV w spółkach C i D (D podwójnie) wobec progu 15% | `button.sw[role=switch][aria-checked]` z `aria-labelledby` na nagłówek |
| W limitach | „Od R5 kw.3”, skutki, trzy limity: znaczek litery, nazwa, „3,8% z 5%”, pasek z kreską limitu | pasek `role=img` z opisem; wartość i słowo, nie tylko kolor |
| Przekroczenie | limit z ikoną alert i kolorem ostrzeżenia; ramka `role=alert`: który limit, ile przy limicie, termin poprawy (koniec kwartału, ile tygodni), skutek (zaufanie −5, odejścia klientów etycznych), lista spółek, które łamią limit | to samo ostrzeżenie idzie do TeamedUP! (G6b) |
| Wyłączanie | kliknięcie przełącznika włączonego funduszu nie wyłącza od razu: pod spodem ramka „Wyłączenie deklaracji: zaufanie −3, ponowne włączenie najwcześniej w R7 kw.2” z przyciskami „Wyłącz” i „Zostaw włączony” (fokus na „Zostaw”) | `div[role=group][aria-label]`, bez modala |

Spółki bez oceny liczą się do limitu B (napis „Spółki B i bez oceny”). Ocena do limitów: publiczna albo Twoje badanie (jak w G6a).

## Szuflada zlecenia
- Pod wierszem z wartością zlecenia linia `p.lim-warn[role=status]` liczona przy każdej zmianie liczby akcji: „Fundusz etyczny: spółki C po zakupie 5,5% NAV przy limicie 5%. Zlecenie przejdzie, a potem masz kwartał na poprawę. W limicie zmieści się jeszcze 8 674 akcji.”
- W limicie ta sama linia jest wyciszona („spółki C po zakupie 4,1% NAV z limitu 5%”). Przy funduszu nieetycznym linii nie ma.
- Bez blokady przycisku Kup. Pole liczby ma `aria-describedby` na tę linię.

## Prompt dla czatu kodu
> Według `plany/design/35_fundusz_etyczny.md` i makiety `plany/design/makiety/35_fundusz_etyczny.html` (po wdrożeniu G6 planu 0.18.9): w panelu „Mój fundusz” pod `#fund-summary` dodaj sekcję „Fundusz etyczny” z przełącznikiem `role=switch` (`playerFund.ethical`). Wyłączony: opis korzyści i limitów oraz powód z `getFundEthicsIssue` (udział C i D). Włączony: limity D 0%, C ≤ 5%, B i bez oceny ≤ 40% NAV z paskami i kreską limitu; przekroczenie: ikona i ramka `role=alert` z terminem poprawy, skutkiem i spółkami. Wyłączenie przez potwierdzenie w panelu (zaufanie −3, powrót najwcześniej po 4 kw.), bez modala. W `updateDrawerImpact` dodaj linię `role=status` z udziałem klasy spółki po zakupie, limitem i liczbą akcji mieszczących się w limicie; bez blokady zakupu. Testy: przełącznik ustawia `playerFund.ethical`; przy 6% w C sekcja ma stan przekroczenia z terminem; ostrzeżenie w szufladzie pojawia się tylko przy przekroczeniu po zakupie i nie blokuje przycisku Kup; brak emoji.
