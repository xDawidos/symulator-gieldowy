# 35. O funduszu (dawniej „Klienci i udziały”) i fundusz etyczny (0.18.9 G6) — zaakceptowane 2026-11-23, poprawki użytkownika 2026-11-23 (do akceptacji)

Makieta: [makiety/35_fundusz_etyczny.html](makiety/35_fundusz_etyczny.html) (samodzielna). Plan: `plany/plan_0.18.9_esg.md`, G6. Poprawka użytkownika 2026-11-23: przełącznik funduszu etycznego ma być w oknie „Klienci i udziały”, które zmienia nazwę na **„O funduszu”** i dostaje nową wersję we wspólnej ramie okien (makieta 19). Decyzja użytkownika: 4 zakładki.

## Okno „O funduszu” (`#clients-modal`, `openJuMarket`)
| Część | Treść | Dane | Markup / ARIA |
|---|---|---|---|
| Nagłówek | emblemat `teczka`, „O funduszu”, jedno zdanie stanu (np. „Fundusz etyczny: limit spółek D przekroczony, popraw do końca R6 kw.3.”) | stan funduszu | `section.wn` w ramie z makiety 19, akcent `--color-section-ju` |
| Pasek liczb | NAV, zaufanie, klienci, wpłaty nowych (tydz.), premia do NAV, obrót udziałami (tydz.) | obecny `ju-ticker` | `.wn-strip` |
| Zakładki | Przegląd, Klienci, Rynek udziałów, Kampanie; licznik przy Przeglądzie, gdy limit jest przekroczony | — | `role=tablist/tab/tabpanel`, strzałki |
| Przegląd | **Fundusz etyczny** (przełącznik i limity, stany niżej), **Opłata za zarządzanie** (pole i „Ustaw”), **Klienci w skrócie** (typ z ikoną, liczba, pasek i liczba średniego zadowolenia) | `playerFund.ethical`, `getPlayerFeeRate`, `playerFund.clients` | `.grid2` (na telefonie jedna kolumna) |
| Klienci | filtry typu (chip z ikoną i liczbą, `aria-pressed`), lista od największego: ikona, imię, typ, udziały i wartość, pasek zadowolenia z liczbą; rozwinięcie: motyw, średni koszt, zysk, historia | `playerFund.clients`, `CLIENT_TYPES` | `button.cl-row[aria-expanded][aria-controls]` |
| Rynek udziałów | tabela funduszy (Twój fundusz bursztynowym znacznikiem, R4), taśma transakcji obok | `getJuMarketFunds`, `juMarket.tape` | tabela, `aside` |
| Kampanie | kampania marketingowa (3 grupy klientów), kampania emisyjna | `MARKETING_TARGETS`, `renderCampaignCards` | `.cardx` |

Ikony typów klientów z `ui.js` (`dataIcon`), bez emoji. Pozycja menu bocznego „Klienci i udziały” zmienia nazwę na „O funduszu”; tak samo teksty, które odsyłają do tego okna (`player.js:2375`, `ui.js:7124`).

## Fundusz etyczny (karta w Przeglądzie)
| Stan | Treść | Markup / ARIA |
|---|---|---|
| Wyłączony | co daje deklaracja (napływ +15%, klienci etyczni 2 × częściej), limity i kwartał na dopasowanie; powód z G6a: udział NAV w spółkach C i D (D podwójnie) wobec progu 15% | `button.sw[role=switch][aria-checked]` z `aria-labelledby` |
| W limitach | „Od R5 kw.3”, skutki, trzy limity: znaczek litery, nazwa, „3,8% z 5%”, pasek z kreską limitu | pasek `role=img` z opisem |
| Przekroczenie | limit z ikoną i kolorem ostrzeżenia; ramka `role=alert`: który limit, termin poprawy, skutek, spółki | to samo ostrzeżenie idzie do TeamedUP! |
| Wyłączanie | potwierdzenie w karcie: zaufanie −3, powrót najwcześniej po 4 kw.; „Wyłącz” i „Zostaw włączony” (fokus na „Zostaw”) | `div[role=group]`, bez modala |

## Panel „Mój fundusz” i szuflada zlecenia
- W panelu bocznym zostaje jedna linia: ikona, stan („Fundusz etyczny: w limitach” / „limit D przekroczony” / „Fundusz nie jest etyczny”) i odnośnik „O funduszu”.
- Szuflada zlecenia: linia `p.lim-warn[role=status]` liczona przy każdej zmianie liczby akcji, z udziałem klasy po zakupie, limitem i liczbą akcji, które jeszcze się mieszczą. Bez blokady przycisku Kup. W limicie linia wyciszona, przy funduszu nieetycznym jej nie ma.

## Prompt dla czatu kodu
> Według `plany/design/35_fundusz_etyczny.md` i makiety `plany/design/makiety/35_fundusz_etyczny.html` (po wdrożeniu G6 planu 0.18.9): przebuduj okno „Klienci i udziały” (`#clients-modal`) na „O funduszu” we wspólnej ramie okien z makiety 19 (nagłówek ze zdaniem stanu, pasek liczb, 4 zakładki ARIA: Przegląd, Klienci, Rynek udziałów, Kampanie), przenosząc obecną treść (opłata, kampanie, tabela funduszy, taśma, lista klientów z filtrami), i zmień nazwę w menu bocznym i tekstach odsyłających. W Przeglądzie dodaj kartę „Fundusz etyczny” z przełącznikiem `role=switch` (`playerFund.ethical`), limitami D 0%, C ≤ 5%, B i bez oceny ≤ 40% NAV z paskami, stanem przekroczenia (`role=alert`, termin, skutek, spółki) i potwierdzeniem wyłączenia w karcie, oraz „Klienci w skrócie”. W panelu „Mój fundusz” zostaw jedną linię stanu z odnośnikiem. W `updateDrawerImpact` dodaj linię `role=status` z udziałem klasy po zakupie i limitem, bez blokady zakupu. Ikony SVG, bez emoji. Testy: okno ma 4 zakładki i tytuł „O funduszu”; przełącznik ustawia `playerFund.ethical`; przy 6% w C karta pokazuje przekroczenie z terminem, a zakładka Przegląd licznik; ostrzeżenie w szufladzie nie blokuje przycisku Kup.
