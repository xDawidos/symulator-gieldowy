# 0.14.5 Redesign — krok 4: teksty (UX copy)

Data: 2026-10-18 · podstawa: [01_ocena.md](01_ocena.md) (N1, W1, W3), [03_system.md](03_system.md).
Skill `ux-copy` nie był dostępny w tej sesji — przegląd ręczny: 112 przycisków i ok. 90 nagłówków z `index.html`, ok. 320 komunikatów `showToast` (z czego ok. 300 w plikach logiki), ok. 45 pustych stanów, okna potwierdzeń.
**Zmiany wdrażam w kroku 5.** Ten dokument to słownik, zasady i tabela „było → jest”.

## Decyzje użytkownika
| Pytanie | Decyzja |
|---|---|
| Waluta | **PLN** wszędzie (dziś 66× „PLN” i 34× „zł”). Format: `14 040,25 PLN` |
| Pieniądze gracza poza funduszem | **konto prywatne** (zamiast: Moje pieniądze, Prywatne, portfel prywatny, prywatne pieniądze) |
| Nazwa gry | **Capital Quest** (wybór spośród „Capital Quest” i „TradeX” — patrz niżej) |
| Teksty w plikach logiki (player.js, state.js, companies.js…) | **wolno zmieniać same napisy**; każda taka zmiana w osobnym commicie „teksty w logice”, testy 457/457 |
| Skrót „JU” (jednostki uczestnictwa) | **udział w funduszu** („udziały funduszu”, „NAV / udział”) — w całym interfejsie; identyfikatory `ju*` w kodzie zostają |
| Emoji w interfejsie | **zastąpione prostymi ikonami SVG** (jak w makiecie): menu, przyciski, zakładki, nagłówki, chipy i podnagłówki **sektorów** (17 ikon sektorów — krok 6), dymki; giełdy = kwadrat w kolorze rangi |
| Znak logo | **według szkicu użytkownika** (owalne Q przecięte linią wykresu ze strzałką w górę) |

## Nazwa i logo: Capital Quest
**Dlaczego Capital Quest, a nie TradeX:** gra to droga kariery (od młodszego zarządcy do szczytu rankingu funduszy, z Babcią, awansami i Akademią) — „Quest” mówi o wyprawie i postępie, „Capital” o kapitale i funduszu. „TradeX” brzmi jak aplikacja brokerska do samego handlu i ta nazwa jest już używana przez kilka firm z branży finansowej. Przed publikacją gry warto sprawdzić, czy „Capital Quest” nie jest zastrzeżonym znakiem towarowym w Twojej kategorii.

**Logo** (Figma „02 System”, ramka `22:281`; pliki w `img/logo/`):
- **Znak (wg szkicu użytkownika):** owalna litera Q na bursztynowym kafelku; linia wykresu zaczyna się na dole Q, robi szczyt w jego wnętrzu, przecina dolny łuk (przerwy w łuku), schodzi pod literę i wybija długą strzałką w górę — „spadek i odbicie”. Kreska 3,3 w kafelku 40 px, czytelny od 16 px.
- **Logo poziome:** znak + „CAPITAL QUEST” (IBM Plex Sans SemiBold, rozstrzelenie 8%), „QUEST” w bursztynie. Tekst zamieniony na krzywe — nie zależy od czcionek.

| Plik | Rozmiar | Do czego |
|---|---|---|
| `img/logo/capital-quest-znak.svg` | 40×40 (wektor) | menu boczne, ekran startowy, okna |
| `img/logo/capital-quest-logo.svg` | 238×40 | logo na ciemnym tle (gra) |
| `img/logo/capital-quest-logo-jasne-tlo.svg` | 238×40 | jasne tło (dokumenty, strona); „QUEST” `#9E6100` (kontrast ≥3:1) |
| `img/logo/favicon.svg` | 40×40 | ikona karty przeglądarki (`<link rel="icon">` w kroku 5) |

W kroku 5: `<title>` = „Capital Quest — {nazwa funduszu}”, w menu bocznym logo poziome + nazwa funduszu gracza pod spodem, ekran startowy z logo. Numer wersji przenosi się do Ustawień („Capital Quest 0.14.5”).

## Zasady pisania
1. **Głos:** rzeczowy, życzliwy, na „ty” (jak dziś). Zaimki „Twój/Twoja” zostają z wielkiej litery (konwencja gry, listy Babci).
2. **Wielkie litery tylko na początku** (zasada polska): „Rynek akcji”, „Centrum bankowe”, „Złóż ofertę”. Nazwy własne bez zmian (Bank Centralny, Skarb Państwa, Giełda Śmieciowa, Akademia).
3. **Bez krzyczących wersalików i wykrzykników** w tytułach i komunikatach. Ważność oddaje kolor/ikona (Alert Down), nie „!!!”. Wersaliki tylko jako styl `text/label` (etykiety, kolumny) — wpisane normalnie, zamieniane przez CSS.
4. **Przyciski = czasownik + obiekt:** „Wyemituj udziały”, „Zapisz grę”, „Ustaw opłatę”. Jedno słowo tylko, gdy kontekst jest oczywisty („Kup”, „Sprzedaj”, „Anuluj”).
5. **Komunikat błędu = co się stało + ile brakuje / co zrobić:** „Za mało gotówki funduszu: potrzeba 1 250,00 PLN, masz 980,40 PLN.” Bez „Wystąpił błąd”, bez „!”.
6. **Potwierdzenie = pytanie + skutek + przycisk z nazwą działania:** „Zacząć nową grę? Obecny zapis zostanie usunięty i nie da się go przywrócić.” → [Anuluj] [Usuń zapis i zacznij]. Nigdy „OK/Potwierdź” przy nieodwracalnych.
7. **Puste stany mówią, kiedy coś się pojawi albo co zrobić:** zamiast „Brak danych.” → „Wykres pojawi się po pierwszych notowaniach (ok. 15 s gry).”
8. **Wielokropek** to znak `…`, nie trzy kropki. Cudzysłów polski „…”. Minus `−` (U+2212) w liczbach ujemnych.
9. **Emoji → ikony:** w całym interfejsie (menu, przyciski, zakładki, nagłówki paneli i okien, chipy i podnagłówki sektorów, dymki powiadomień, znaczniki) emoji zastępują proste ikony SVG w jednym stylu (24×24, kreska 1,8, kolor tekstu) — 30 ikon interfejsu jest już w Figmie, 17 ikon sektorów dojdzie w kroku 6. Giełdy: kwadrat w kolorze rangi (`--exchange-*`) zamiast 🗑️🥉🥈🥇💎. Emoji zostają tylko wewnątrz treści fabularnych pisanych jak wiadomość (list Babci, treść maili, newsy).
10. **Bez angielskich wtrąceń, gdy jest polskie słowo:** „start-up” zostaje (termin), „preset” → „zapisany filtr”, „Auto” → „automat”, „Quiz” → „test”. Skróty branżowe zostają z rozwinięciem w dymku: NAV, GIG, ETF, IPO, M&A (→ „Fuzje i przejęcia”), PPP, LBO, C/Z, C/WK, ROE. Skrót „JU” znika (→ „udział”).
11. **Teksty techniczne nigdy dla gracza:** komunikaty o brakujących funkcjach i elementach DOM idą do `console.warn`, nie na ekran.

## Słownik (jedna nazwa na jedno pojęcie)
| Pojęcie | Używamy | Nie używamy |
|---|---|---|
| fundusz gracza | **fundusz** („Twój fundusz”, nazwa własna np. „Fundusz Pierwszy Krok”) | portfel funduszu, mój fundusz (w nagłówku panelu: „Fundusz”) |
| pieniądze gracza poza funduszem | **konto prywatne** | moje pieniądze, prywatne, portfel prywatny, prywatne pieniądze |
| gotówka funduszu | **gotówka funduszu** | środki funduszu, pieniądze funduszu |
| jednostka uczestnictwa (dawne JU) | **udział w funduszu**, l.mn. **udziały funduszu**; w tabelach „udziały” (dymek: „udział w funduszu — część funduszu należąca do klienta; jego wartość to NAV / udział”) | JU, jednostki, certyfikaty |
| wartość udziału | **NAV / udział** (dymek: „wartość aktywów netto przypadająca na jeden udział”) | NAV / JU, wycena JU, cena JU |
| udział w spółce (np. 46% akcji) | **pakiet akcji** / **% akcji** („Fundusz ma 46% akcji”) — żeby nie mylić z udziałami funduszu | udział w spółce |
| rynek wtórny JU | **rynek wtórny udziałów**; okno w menu: **„Klienci i udziały”** | rynek JU |
| indeks giełdy | **GIG** (dymek: „Główny Indeks Giełdowy — średni wynik rynku”) | indeks, benchmark (w tekście: „wynik GIG”) |
| emisja nowych udziałów | **emisja udziałów**, przycisk **„Wyemituj udziały”**; „emisja ciągła” | Emisja JU, dodruk |
| okres rozliczeniowy funduszu | **okres** (4 okresy = wyniki) | runda, etap |
| czas gry | **tydzień gry**, **kwartał**, **rok** | tura, cykl |
| poziom giełdy | **giełda** + nazwa: Giełda Śmieciowa, Brązowa, Srebrna, Złota, Platynowa, Rubinowa, Szmaragdowa, Diamentowa, Internetowa | rynek (dla poziomu), liga |
| spółka zależna | **spółka zależna** (pod **spółką matką**) | córka, podmiot zależny |
| sektor / podsektor | **sektor**, **podsektor** | branża, kategoria, nisza (w UI) |
| zaufanie klientów | **zaufanie klientów** (0–100) | reputacja funduszu |
| opłata | **opłata za zarządzanie** (% rocznie) | prowizja, fee |
| kariera | **stanowisko** (Młodszy zarządca…), **awans** | ranga, poziom |
| nauka | **Akademia** (hasła, testy), **CV i szkolenia** (umiejętności) | Quiz, kurs |
| start-upy | **Giełda NewHorizons** (nazwa własna), **inkubator**, **pula start-upów** | Pula Inwestycyjna Start-upów |
| przejęcie | **przejęcie**, **wrogie przejęcie**, **fuzja**; sekcja **„Fuzje i przejęcia”** | M&A (w tytule) |
| zapis gry | **zapis**, **zapisz grę**, **eksportuj zapis (plik .json)**, **wczytaj zapis** | save, backup |

## Format liczb (jeden formatter w warstwie widoku)
| Wielkość | Format | Przykład |
|---|---|---|
| kwota | spacja tysięcy (twarda), przecinek, 2 miejsca, „PLN” | `14 040,25 PLN` |
| kwota w tabeli kursów | jak wyżej (cena akcji) | `1,82 PLN` |
| duża kwota (≥ 1 mln) w kartach i newsach | 1 miejsce + skrót | `3,5 mln PLN`, `1,2 mld PLN` |
| kwota bez groszy (koszty, limity) | bez części ułamkowej | `150 000 PLN` |
| NAV / udział | 4 miejsca | `9,9481 PLN` |
| liczba udziałów | 1 miejsce, etykieta „Udziały” | `Udziały: 1 411,3` |
| procent zmiany | znak zawsze, minus `−`, 2 miejsca, bez spacji | `+2,10%`, `−7,20%`, `0,00%` |
| procent udziału / stopy | 1 miejsce (lub 2 przy stopach < 1%) | `46,0%`, `0,80%` |
| wskaźnik (C/Z, C/WK) | 1–2 miejsca, przecinek | `8,3`, `1,78` |
| liczba akcji | spacja tysięcy | `4 410` |
| czas | „tydz. 12 · rok 1”, „za 68 s” | — |

Dziś działa kilka formaterów naraz (`formatZl` w ui.js:5408, `formatPlnShort` w player.js:3742, `formatProjectMoney`, `formatConstructionMoney`) i 65× `toFixed()` w ui.js. W kroku 5 powstaje jeden zestaw w ui.js (`formatPLN`, `formatPct`, `formatNav`, `formatCount`, oparty na `Intl.NumberFormat('pl-PL')`), a stare funkcje wołają nowy (nazwy zostają — testy). Uwaga: „PLN” to też symbol spółki w testach — zamiany „zł”→„PLN” tylko w napisach z kwotą, nie globalnie.

## Było → jest

### Marka, pasek górny, menu
| Miejsce | Było | Jest |
|---|---|---|
| `<title>`, index.html:6 | Stock Market Trader Game | Capital Quest — {nazwa funduszu} |
| menu, index.html:16–17 | Stock Market Trader Game / panel główny | [logo Capital Quest] / {nazwa funduszu} |
| pasek, index.html:98–99 | Stock Market Trader Game / wersja 0.12 nauka | (usunięte; wersja w Ustawieniach: „Capital Quest 0.14.5”) |
| pasek KPI, index.html:116 | Moje pieniądze | Konto prywatne |
| pasek KPI | Gotówka funduszu | Gotówka funduszu (bez zmian) |
| pasek | — | Tydz. 12 · rok 1 (nowe) |
| pasek, index.html:139 | Wznów / Pauza | Wznów / Pauza (bez zmian; skrót: Spacja w dymku) |
| pasek → menu ☰, index.html:140 | Zapisz | Zapisz grę |
| pasek → menu ☰, index.html:141 | 💾 Eksport | Eksportuj zapis (.json) |
| pasek → menu ☰, index.html:142 | Reset | Nowa gra… |
| pasek, index.html:143 | 📊 Rynek (otwiera Bank) | (usunięte — Bank jest w menu) |
| menu | 🎓 CV i szkolenia | CV i Akademia |
| menu | 📧 Poczta | Poczta |
| menu | 👥 Klienci i rynek JU | Klienci i udziały |
| menu | 🕶️ Szara strefa | Szara strefa |
| menu: grupy | — | Świat · Moja firma · Ja |
| ustawienia, index.html:415 | Zmień motyw | (usunięte — tylko ciemny motyw) |

### Pulpit: rynek i fundusz
| Miejsce | Było | Jest |
|---|---|---|
| index.html:204 | Rynek Akcji ▼ | Rynek akcji (+ przycisk zwijania z ikoną) |
| index.html:204 | 🔎 Skaner spółek (zablokowany wygląda jak aktywny) | Skaner spółek · gdy zablokowany: ikona kłódki + dymek „Odblokujesz szkoleniem Analityk finansowy” |
| chipy giełd | ♻ Śmieciowa, 🥉 Brązowa… 🌐 Internet, 💰 Dywidendy | ■ Śmieciowa, ■ Brązowa… ■ Internetowa (kwadrat w kolorze rangi), Dywidendowe |
| chipy sektorów | 🏦 Bankowość 7 · 🍞 Żywność 9 … i gołe 💰🛒🏭🏥 grup | [ikona sektora] Bankowość 7 · [ikona] Żywność 9 …; grupy jako etykieta tekstowa „Finanse:” |
| kolumny tabeli | Spółka / Cena PLN / Zmiana tydz. / Wolumen / dostępne / Moje akcje / Akcja | Spółka / Kurs / Zmiana tydz. / Dostępne akcje / Moje / (bez nagłówka) |
| podnagłówek sektora | ─ 🍞 Żywność ─ | [ikona sektora] ŻYWNOŚĆ 3 |
| nagłówek giełdy | Giełda Śmieciowa 🗑️ ▼ | Giełda Śmieciowa · 9 spółek [▾] |
| nagłówek | 🏛️ GPW — Giełda Papierów Wartościowych | GPW — Giełda Papierów Wartościowych |
| przycisk „i” | i | (ikona karty) · aria-label „Karta spółki {nazwa}” |
| przycisk ▼ | ▼ (title: Kup / Sprzedaj / Wykres) | (ikona) · aria-label „Handel: {nazwa}” |
| handel | MAX | Maks. |
| handel, ikony 📈📊🏦🏗️ | bez podpisów | Wykres · Finanse · Zarządzanie · Inwestycje (podpisy pod ikonami) |
| index.html:156 | Giełda NewHorizons🚀 ▼ | Giełda NewHorizons (start-upy) |
| index.html:161 | Pula Inwestycyjna Start-upów 🏊 | Pula start-upów |
| index.html:176 | 🤖 Ustawienia Auto | Automat inwestycji |
| index.html:183 | Brak wpłat. | Nikt jeszcze nie wpłacił. Pierwsza wpłata od 1 000 PLN uruchamia inwestycje. |
| pula | Wycofaj z puli | Wypłać z puli |
| panel funduszu | 💼 Fundusz Pierwszy Krok · LIVE | Fundusz Pierwszy Krok · Na żywo |
| panel funduszu, index.html:304 | 🏦 Fundusz / 🧍 Prywatne | Fundusz / Konto prywatne |
| panel funduszu, index.html:311 | 📥 Emisja JU | Wyemituj udziały |
| pasek KPI, panel funduszu | NAV / JU · Liczba JU | NAV / udział · Udziały |
| okno JU | Klienci i rynek JU · Fundusze na rynku wtórnym · Wpłaty nowych (tydz.) · Premia JU funduszu · Wolumen JU (tydz.) | Klienci i udziały · Fundusze na rynku wtórnym udziałów · Nowe wpłaty (tydz.) · Premia do NAV · Obrót udziałami (tydz.) |
| okno JU | Cena JU vs NAV | Cena udziału vs NAV |
| panel funduszu | Emisja ciągła (wpłaty klientów bez mojej emisji) | Emisja ciągła — klienci sami dokupują udziały |
| panel funduszu | Dlaczego klienci odchodzą / przychodzą | Skąd przychodzą i dlaczego odchodzą klienci |
| panel funduszu | ⚠️ Zaufanie spada: 100% aktywów leży w gotówce — fundusz nie inwestuje pieniędzy klientów | [Alert Warn] **Zaufanie spada** · Cała gotówka leży bez ruchu — klienci płacą za zarządzanie, którego nie ma. Kup akcje albo obligacje. |
| panel funduszu | Wyniki: 4 ostatnie okresy | Wyniki: 4 ostatnie okresy (bez zmian) |
| panel funduszu | Porównanie z rywalami pojawi się po pierwszym okresie (15 min gry). | Porównanie z rywalami pojawi się po pierwszym okresie (ok. 15 min gry). |
| panel funduszu | Kariera w korporacji | Kariera |

### Okna
| Miejsce | Było | Jest |
|---|---|---|
| karta spółki: zakładki | 📋 Przegląd · 📊 Finanse · 👥 Akcjonariat · 🏛️ Zarządzanie · 👷 Zatrudnienie | [ikona] Przegląd · [ikona] Finanse · [ikona] Akcjonariat · [ikona] Zarządzanie · [ikona] Zatrudnienie |
| karta spółki | Kondycja 0.0 · przeciętna | Kondycja 0,0 · przeciętna |
| karta spółki | +0.00% tydz. | +0,00% w tygodniu |
| wykres, index.html:433 | Historia Cen: Konfiturex (KFX) | Wykres: Konfiturex (KFX) |
| wykres, index.html:437 | Typ wykresu: / Interwał: | Wykres: [Świece][Linia] · Okres: [15 s ▾] |
| wykres, ui.js:579 | Brak danych do narysowania wykresu. | Wykres pojawi się po pierwszych notowaniach (ok. 15 s gry). |
| index.html:477 | Centrum Bankowe | Centrum bankowe |
| index.html:502 | Złóż Ofertę | Złóż ofertę |
| index.html:516 | Cena za szt. (max 999.99): | Cena za akcję (maks. 999,99 PLN) |
| index.html:517 | Twoja oferta... | Twoja oferta… |
| index.html:524 | AUKCJA AKCJI Z HIPOTEKI! | Aukcja akcji z hipoteki |
| index.html:509 | 🔔 Aukcja Bonów Skarbowych! (Wykup: 1000 PLN) | Aukcja bonów skarbowych · wykup 1 000 PLN |
| index.html:579–581 | Panel Główny · Spółki Miejskie · Firmy Prywatne | Przegląd · Spółki miejskie · Firmy prywatne |
| miasto | Obecny Zarząd (wybory za 4 lata) | Obecny zarząd · wybory za 4 lata |
| miasto | Ranking Stoisk na Żywo / Cel Promocji | Ranking stoisk na żywo / Cel promocji |
| index.html:648 | 💡 Szósty Zmysł 💡 | Szósty zmysł |
| zarządzanie, index.html:700 | Wymuś Wypłatę (4% wartości akcji) | Wymuś dywidendę specjalną (4% wartości akcji) |
| zarządzanie, index.html:726 | Zmień Bank | Zmień bank |
| zarządzanie, index.html:742 | Otwórz Panel Badań | Otwórz badania i rozwój |
| zarządzanie, index.html:747 | Zobacz Finanse | Pokaż finanse |
| zarządzanie, index.html:760 | 🚨 JESTEŚ CELEM PRZEJĘCIA! 🚨 | [Alert Down] Twoja spółka jest celem przejęcia |
| zarządzanie | 🤝 Fuzje i Przejęcia · Rozpocznij proces M&A | Fuzje i przejęcia · Rozpocznij przejęcie lub fuzję |
| B+R, index.html:874… | Odblokuj (1000 PLN) | Odblokuj · 1 000 PLN |
| index.html:824 | Ranking Inwestorów | Ranking inwestorów |
| index.html:840 | Częstotliwość (co ile sekund): | Co ile sekund |
| index.html:898 | Kwota (PLN) | Kwota (PLN) (bez zmian) |
| index.html:930 | Otrzymałeś Ofertę Specjalną! | Oferta specjalna |
| index.html:944 | Ustaw Alerty Cenowe | Alerty cenowe |
| index.html:1014 | Szczegóły Finansowe | Szczegóły finansowe |
| index.html:1025 | Wybierz Cel dla: Nazwa Spółki | Wybierz cel przejęcia dla: {spółka} |
| index.html:1043 | 🔴 Poważne Komplikacje! | Poważne komplikacje |
| index.html:1047 | Opcja 1 / Opcja 2 / Opcja 3 | {treść opcji z danych zdarzenia} (szablonowe „Opcja N” tylko gdy brak treści) |
| okna: przycisk zamknięcia | × (czerwone kółko) | ikona × w IconButton · aria-label „Zamknij” |
| potwierdzenie | Potwierdzenie / Anuluj / Potwierdź | {pytanie} / Anuluj / {nazwa działania}, np. „Sprzedaj wszystkie” |
| potwierdzenie, main.js:772 | confirm(): „Rozpocząć nową grę? Obecny zapis zostanie usunięty.” | okno gry: **Zacząć nową grę?** Obecny zapis zostanie usunięty i nie da się go przywrócić. Jeśli chcesz go zachować, najpierw wyeksportuj zapis. [Anuluj] [Usuń zapis i zacznij] |
| potwierdzenia przejęć | Czy na pewno chcesz zainicjować WROGIE PRZEJĘCIE … Płatność w GOTÓWCE. | **Wrogie przejęcie {cel}?** {inicjator} zapłaci gotówką {kwota}. [Anuluj] [Rozpocznij przejęcie] |
| potwierdzenia | Czy chcesz zapłacić 500 PLN za jednorazowy wgląd w finanse X? | **Kupić wgląd w finanse {spółka}?** Jednorazowo 500 PLN z gotówki funduszu. [Anuluj] [Kup wgląd] |

### Poczta, Akademia, start
| Miejsce | Było | Jest |
|---|---|---|
| poczta | Oznacz wszystkie jako przeczytane | Oznacz wszystkie jako przeczytane (bez zmian) |
| poczta | Wybierz wiadomość z listy. | Wybierz wiadomość z listy po lewej. |
| poczta | Brak wiadomości w tym folderze. | Ten folder jest pusty. |
| poczta: akcje | ☆ Oznacz gwiazdką · Oznacz jako nieprzeczytane · 🗑 Usuń | Gwiazdka · Nieprzeczytana · Usuń (cichy przycisk, oddzielony) |
| poczta: reklamy | Reklama | Reklama (znacznik Badge Neutral) |
| Akademia | Hasła odblokowujesz, gdy pierwszy raz zetkniesz się z pojęciem. Odblokowane: 7/55 · zaliczone quizy: 0. | Hasła odblokowujesz, gdy pierwszy raz spotkasz pojęcie w grze. Odblokowane: 7 z 55 · zaliczone testy: 0. |
| Akademia | Quiz — za zaliczenie 60 zł · Sprawdź odpowiedzi | Test — za zaliczenie 60 PLN · Sprawdź odpowiedzi |
| Akademia | Moje pieniądze: 103.00 zł | Konto prywatne: 103,00 PLN |
| dymek | 🎓 Quiz zaliczony! +60 zł do portfela. | Test zaliczony: +60,00 PLN na konto prywatne. |
| dymek | Nowe hasła w Akademii (3): „C/WK…” | Nowe hasła w Akademii (3): „C/WK i wartość księgowa”, … [Otwórz] |
| start, formularz | Twoje imię · Nazwa korporacji · Nazwa Twojego funduszu · Kraj startowy | Twoje imię · Nazwa korporacji · Nazwa funduszu · Kraj startowy (zablokowane: „wkrótce”) |
| start | Zaczynam pracę | Zaczynam pracę (bez zmian) |

### Komunikaty (dymki `showToast`) — wzorce
| Było (przykłady, pliki) | Jest (wzorzec) |
|---|---|
| Za mało gotówki funduszu. (8×) · Nie masz wystarczająco gotówki! · Nie masz wystarczająco gotówki, aby dokonać tego zakupu! (companies.js:3977, finance.js:1456, player.js:313, ui.js:4280) | Za mało gotówki funduszu: potrzeba {koszt}, jest {gotówka}. |
| Za mało środków w portfelu prywatnym. · Za mało pieniędzy w portfelu prywatnym. · Za mało prywatnych pieniędzy. (state.js:73, ai.js:2289, state.js:1208, player.js:2282) | Za mało pieniędzy na koncie prywatnym: potrzeba {koszt}, jest {saldo}. |
| Musisz odblokować umiejętność … (5×; finance.js:1450, player.js:457, ui.js:4263) | Wymaga szkolenia „{nazwa}” (CV i Akademia). |
| Wpisz poprawną kwotę. | Wpisz kwotę większą od zera. |
| Wystąpił błąd podczas sprzedaży (sprawdź, czy masz wystarczająco *dostępnych* akcji). (companies.js:5202) | Nie udało się sprzedać: wolnych akcji jest {n} (reszta w zastawie lub zablokowana). |
| Oferta nieaktualna. · Oferta przejęcia nie jest już aktualna. | Ta oferta już wygasła. |
| 🔔 ALERT CENOWY: X osiągnął cenę zakupu 2.00 PLN! | Alert cenowy: {spółka} spadła do {cena} — Twój próg zakupu. [Otwórz] |
| 🚨 Wrogie przejęcie X! Gra wstrzymana do Twojej decyzji. | Wrogie przejęcie {spółka}. Gra wstrzymana — zdecyduj w oknie przejęcia. (Toast Down) |
| Twoje stanowisko nie daje dostępu do tej giełdy. | {Giełda} jest dostępna od stanowiska {stanowisko}. |
| Kampania już trwa. | Kampania już trwa — skończy się za {czas}. |
| Zapis wyeksportowany: X (1.2 MB). | Zapis wyeksportowany: {plik} (1,2 MB). |

### Puste stany i teksty techniczne
| Było | Jest |
|---|---|
| Brak danych (13×) | konkretnie: „Dane pojawią się po pierwszym kwartale.” / „Brak notowań — spółka weszła dziś na giełdę.” (zależnie od miejsca) |
| Brak klientów w tej grupie. | Nikt z klientów nie pasuje do tego filtra. |
| Brak inwestorów. | Spółka nie ma jeszcze innych inwestorów. |
| Brak ofert. | Na razie brak ofert — nowe pojawiają się co kwartał. |
| Brak otwartych projektów — miasto ogłasza nowe co kwartał. | (dobre — wzór dla innych) |
| Brak próśb — pojawiają się, gdy budowlańcom brakuje gotówki na kontrakty. | (dobre — wzór dla innych) |
| Brak funkcji renderDepartmentsSection. (ui.js:2086) | (nie pokazywać graczowi — `console.warn`) |
| Brak construction-main. Sekcja przetargów nie została dodana. (ui.js:4843) | (nie pokazywać graczowi — `console.warn`) |

## Wdrożenie w kroku 5 (kolejność)
1. Formatery liczb (jedna funkcja w ui.js, stare jako nakładki) → PLN i przecinki wszędzie w widoku.
2. Marka: tytuł, logo, favicon, usunięcie „wersja 0.12”, menu ☰ (Zapisz grę / Eksportuj zapis / Nowa gra…), okno „Nowa gra” zamiast `confirm()`.
3. Teksty `index.html` (tabele wyżej) przy przebudowie każdego panelu/okna.
4. Komunikaty w ui.js, potem osobny commit „teksty w logice” (player.js, state.js, companies.js, finance.js, ma.js, ai.js, core.js, events.js, learning.js, main.js) — tylko literały napisów; po nim testy 457/457.
5. Puste stany i teksty techniczne.
