# Plan 0.19.2 „Multikulturalizm” (szkic zakresu; po 0.19.1 „Polityka 2”, korzysta z 0.16.11 „Świat startowy”)

Źródło: zgłoszenie użytkownika z 2026-10-29. „Flavour” = **własny charakter każdego państwa**: nie tylko inne firmy i waluta, ale własne mechaniki, instytucje, społeczeństwo, wygląd i zasady rozgrywki. Polska przestaje być jedynym krajem z pełnym „smakiem”, a Niemcy (potem USA, Czechy, kolejne) dostają własną wersję gry. Wcześniejszy szkic tej wersji (sama przychylność polityczna po wyborach) zostaje jednym z elementów (pkt 6).

## Cel

Start w innym kraju ma być inną grą, a nie polską grą z inną walutą. Każde państwo ma własną administrację, firmy, badania, projekty, obywateli, partie, wydarzenia, nazwy, wygląd i drobne zasady rozgrywki.

## Zakres roboczy (po jednym kraju naraz: Niemcy jako wzór, potem USA, Czechy, reszta)

1. **Własna administracja zamiast zakładki „Państwo”:** w Niemczech zakładka **Landy** (Bundesländer); spółki państwowe i miejskie stają się spółkami landów (`Landesunternehmen`), z podatkami, dotacjami i skarbem na poziomie landu i federacji. W USA stany, w Czechach kraje; Polska zachowuje państwo i miasta. Dane i zakładka z konfiguracji kraju (`COUNTRY_DEFS`), wspólny silnik.
2. **Więcej własnych firm i projektów:** każdy kraj ma pełniejszy zestaw spółek (częściowo z 0.16.11), **własne spółki miejskie** (np. wodociągi, komunikacja, szpitale miejskie), **własne ośrodki badań** (instytuty, uniwersytety, programy badawcze z regionalnym charakterem) i **specjalne projekty/superprojekty kraju** (jak szpital, kampus, centrum wystawiennicze z 0.16.6 S2).
3. **Rozbudowa mechanik sektorowych:** inwentaryzacja sektorów, które nie mają własnej mechaniki specjalnej (dziś m.in. Żywność, Usługi, Dobra konsumpcyjne, Alkohole — do potwierdzenia), i nadanie im mechanik, najlepiej z odmianą krajową (np. piwowarstwo i Reinheitsgebot w Niemczech).
4. **Społeczeństwo i polityka kraju:** własni obywatele (klasy, migracja, postawy), **własny system partyjny** (liczba partii, programy, koalicje, wybory), **wydarzenia krajowe** (święta, strajki, afery, kryzysy), **nazwy** dyrektorów, prezesów i polityków w stylu kraju, **inne boty startowe** (w Niemczech np. własny Graham i Wilk). Wspólne z S0d z 0.16.6.
5. **Motyw graficzny i zasady rozgrywki:** lekko inny motyw kolorystyczny kraju (nadal ciemny, kolor nigdy jedynym nośnikiem; zmienione akcenty, nagłówki, ikony, tło) oraz **lekko inne zasady**, np. Niemcy: **ład korporacyjny** — brak mafii od startu (odblokowanie później), ale spółki rzadziej są przekrętami i oszustwami; USA: wyższe ryzyko i premia, silniejsze lobbing i rynek kapitałowy; Czechy: małe, otwarte, wrażliwe na kurs i sąsiadów.
6. **Przychylność polityczna per kraj:** wspólny model `countryFavor[kraj]` zamiast jednej polskiej `macro.election.favor` (`core.js` ~5026–5092, po wyborach ±1 na 8 kwartałów wg darowizn); źródła: darowizny, lobbing, relacje (0.17.3), nepotyzm (0.19.1); skutki: przetargi i zlecenia państwowe, ceny przejęć spółek państwowych, pobłażliwość nadzoru (BaFin, SEC), ryzyko afery.
7. **Nowe instytucje dla wszystkich państw:** wspólne instytucje (np. banki rozwoju, fundusze emerytalne, agencje nadzoru i antymonopolowe, izby handlowe) dostępne w każdym kraju w wersji z lokalną nazwą i parametrami; ich lista do ustalenia z użytkownikiem.
8. **Greenfield i brownfield oraz poziomy obecności w miejsce przejmowania giełdy:** zamiast obecnej mechaniki „przejęcie giełdy zagranicznej” (0.16.3 wariant B) inwestycje typu **greenfield** (budowa od zera: biuro, fabryka, oddział funduszu) i **brownfield** (przejęcie lub rozbudowa istniejącego), a obecność w kraju ma **poziomy** (brak, biuro, oddział, spółka zależna, pełna obecność) odblokowujące kolejne możliwości (handel, instytucje, politykę, spółki krajowe). Wymaga decyzji, co z istniejącym połączeniem giełd (zachować jako najwyższy poziom?).

## Podział na wersje (decyzja użytkownika 2026-10-29)

- **0.19.2 = wspólny silnik „flavour”:** konfiguracja kraju (`COUNTRY_DEFS`) rozszerzona o administrację (Landy/stany/kraje), motyw, zasady kraju, instytucje, poziomy obecności greenfield/brownfield (pkt 8) i przychylność per kraj (pkt 6), z Polską jako pierwszą implementacją na wspólnym silniku. Bez pełnej treści innych krajów.
- **Każdy kraj ma własną wersję po 0.19.2:** 0.19.3 Niemcy (wzór: Landy, ład korporacyjny, firmy, badania, partie, wydarzenia, nazwy, boty, motyw), 0.19.4 USA, 0.19.5 Czechy, dalej Szwecja, Szwajcaria, Francja, Japonia, Chiny, Indie, Tajwan (kolejność do ustalenia). Każda wersja z pomiarem GIG ±1 pp i czasu kroku.
- **Do czasu tych wersji gra zostaje przy uproszczonej mechanice krajów:** kraj startowy z 0.16.6/0.16.11 (firmy krajowe i uniwersalne, waluta konta, giełda macierzysta), połączone giełdy i bilety z 0.16.2–0.16.3, stały profil społeczeństwa z 0.19.1 decyzja 1/4. Bez Landów, własnych partii i instytucji kraju.

## Zależności

- Po 0.16.11 (zestawy firm i waluta kraju startowego) i 0.19.1 (Polityka 2, uproszczone symulacje państw). Pkt 8 dotyka 0.16.3 (połączone giełdy), bilety/lotniska z 0.16.2 i `foreign_companies.js`.

## Otwarte pytania

1. Czy motyw graficzny kraju zmienia tylko akcenty, czy także tło i ikonografię? (Domyślnie: akcenty, nagłówek i tło; ikony wspólne.)
2. Jak głęboko Landy: osobne skarby i budżety każdego landu, czy jeden poziom „Land” z kilkoma przykładami (np. 3–4 landy)? Domyślnie 3–4 landy reprezentatywne.
3. Pkt 8: co z istniejącymi połączonymi giełdami i biletami? Domyślnie poziomy obecności rozszerzają je, a bilet jest warunkiem pierwszego poziomu.
4. Nowe instytucje (pkt 7): które? Do ustalenia razem.
5. Czy opinia publiczna kraju o funduszu (poza polityczną przychylnością) ma być osobnym wskaźnikiem? Domyślnie tak.
