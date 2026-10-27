# Plan 0.17.3 „Rozmowy” (szkic zakresu; po 0.17.2, przed 0.18)

Źródło: zgłoszenie użytkownika z 2026-10-27, jako rozszerzenie 0.15.2 „Kochaj i zarabiaj” (VIP, grupy inwestorów, IR) i 0.14 (prezesi spółek). Plan szkicowy: przed startem przeczytać kod 0.15.2 (`campaigns.js`: `pitchVip`, `getVipSuccessChance`, `getGroupMood`) i walne zgromadzenie (`initiateCeoChange` w `ui.js`).

## Cel

Rozmowy z prezesami (CEO) i inwestorami stają się krótką **minigrą wyboru**: rozmówca ma „charakter”, gracz wybiera jedną z opcji, a skutek zależy od charakteru **i od dotychczasowych relacji**. Zamiast jednego wzoru szansy (VIP: 25% + 35% + 30% + zaufanie/10 pp) gracz czyta rozmówcę.

## Zakres

### R0. Wspólny silnik rozmowy
- Rozmówca: `{ id, rodzaj (ceo | inwestor | bot), charakter, relacja }`. Charaktery (do ustalenia, start): *Rachmistrz* (liczby), *Zachowawczy* (bezpieczeństwo), *Ambitny* (wzrost), *Lojalista* (relacja), *Sceptyk* (dowody).
- Rozmowa = 2–3 tury; w każdej 3–4 opcje (ton: liczby, wizja, bezpieczeństwo, relacja, presja). Każda opcja ma modyfikator zależny od charakteru (dobra / neutralna / zła) przesunięty relacją (dobra relacja łagodzi złą opcję, zła ją wzmacnia).
- Wynik: nastrój rozmówcy (−2…+2) → skutek mechaniczny; relacja zmienia się o małą wartość. Bez losowości po wyborze (tylko losowanie charakteru i oferty), żeby wybór był czytelny. Podpowiedzi słowem (np. „mówi o liczbach”, „unika ryzyka”), nie kolorem.
- Jedna funkcja `resolveTalk(partner, choices)` i dane w tabeli; testy na każdą parę charakter × opcja (macierz).

### R1. Rozmowy z CEO
- Zastąpić przycisk walnego zgromadzenia (`initiateCeoChange`) rozmową: przekonać prezesa do dywidendy, buy-backu, zmiany strategii, ekspansji albo go odwołać.
- Skutki: zmiana polityki dywidendowej / skupu / segmentów spółki (przez istniejące funkcje spółki), relacja z prezesem, cooldown w czasie gry (nie `Date.now()`).
- Dostęp wg udziału gracza w spółce (próg do ustalenia).

### R2. Rozmowy z inwestorami
- VIP z 0.15.2: 3 argumenty zastąpić rozmową (R0) z zachowaniem skutków (wpłata 5–15% z lock-upem, wyjście przy słabym wyniku).
- Grupy inwestorów i IR: misje IR jako rozmowy z przedstawicielem grupy.

### R3. Boty kupują jednostki uczestnictwa
- Gracz proponuje botowi zakup jednostek swojego funduszu **po cenie innej niż NAV** (lekki rabat lub premia do NAV).
- Reakcja zależy od charakteru bota i relacji: dobra relacja → bot kupi po zawyżonej cenie, ale **relacja spada** (i odwrotnie: rabat buduje relację, kosztuje fundusz); zła relacja → odmowa.
- Skutki: napływ gotówki do funduszu, nowe jednostki bota (bot jest klientem z `units`), zmiana relacji, wpis w historii przepływów; granice: limit wielkości transakcji i zakaz zawyżania powyżej progu (np. +10% NAV), by nie dało się „drukować pieniędzy”.
- Niezmiennik: NAV na jednostkę nie spada przy sprzedaży po cenie ≥ NAV; przy rabacie koszt widoczny dla gracza.

### R4. Interfejs i dostępność
- Okno rozmowy z istniejących komponentów 0.14.5, bez nowego modala (karta w oknie spółki / poczty); ikony SVG; stan rozmowy czytelny słowem; kolor nie jest jedynym nośnikiem.
- Projekt wyglądu: czat designu (okno rozmowy, pasek nastroju).

### R5. Akademia, testy, kontrola
- Hasła Akademii („Charaktery rozmówców”, „Cena emisji a relacje”). Grupa testów „0.17.3” (macierz charakter × opcja, relacje, bot kupuje po cenie, niezmienniki funduszu, zapis).
- Przebiegi ×200: częstość sukcesu rozmów (cel 40–70% dla gracza dobierającego opcje wg charakteru, ~25% dla losowego wyboru), brak dźwigni na nieskończoną gotówkę z botów.

## Zależności i ryzyka

- Korzysta z kodu 0.15.2 (VIP, IR, grupy) i relacji botów z 0.10.2 (`relacje z botami`); sprawdzić zgodność z `getGroupMood`.
- Ryzyko: przesada w mikrozarządzaniu (rozmowa co tydzień) → limit rozmów (np. 1 na rozmówcę na kwartał gry) i powiadomienia zbiorcze.
- Zapis: nowe pola relacji i historii rozmów opcjonalne; numer wersji zapisu wg wersji w czasie wdrożenia.

## Otwarte pytania

1. Czy relacje z CEO i botami to jedna skala (−100…+100), czy osobne?
2. Czy rozmowa ma mieć limit czasu rzeczywistego, czy tylko gry (zalecane: gry)?
3. Czy minigra ma być obowiązkowa, czy można wybrać „szybką” (stary wzór procentowy) dla gracza, który nie chce grać?
