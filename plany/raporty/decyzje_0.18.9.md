# Decyzje 0.18.9 ESG i etyka

Plan: `plany/plan_0.18.9_esg.md`. Diagnoza: `raporty/diagnoza_esg_0.18.9.md`. Praca autonomiczna: odstępstwa od planu stroję i rozstrzygam sam, sprawy diametralnie zmieniające grę idą do sekcji „Do decyzji użytkownika”. Serie: g0 (bez zmian w grze), g1 (G1), g4 (G1–G4), g5 (G1–G5); każda 24 gry × 6,5 roku i 10 × 20 lat, bez presetu, bez UI.

| # | Część | Decyzja | Uzasadnienie |
|---|---|---|---|
| H1 | G0 | Progi liter A ≥ 70, B ≥ 60, C ≥ 42, D < 42 (plan 75 / 55 / 35) dla filarów i wyniku łącznego. Po g0: 68 / 58 / 42; po g4 A 70 (A publiczne 30% po 20 latach); po g5 B 60 (C publiczne 16–24%) | Na progach z planu 70% spółek w B |
| H2 | G0 | E spółek bez emisji: baza według sektora (Technologia 72 … Transport 45), nie stałe 65. G: cechy prezesa poza trzema z wyzysku (od −12 do +6) | Bez tego E i G prawie bez rozrzutu |
| H3 | G1 | Pokrycie: Złota co rok, Srebrna z szansą 50% na rok (plan: Złota 50%). Deklaracja uczciwa 12% / 6% na kw. przy A / B, greenwashing 0,15% na kw. (×(1 + presja), ×2 przy spadku kursu o > 20% w roku), wycofanie uczciwej deklaracji po spadku do C/D 40% na kw. Szum oceny: 20% szans na ±1 literę; audytor zwiedziony deklaracją 15% (+1 litera) | g1: pokrycie 28%, greenwashing 14% deklaracji |
| H4 | G1 | Cena odniesienia dla „spadku kursu” to jedna liczba (`stock.esgPx`, cena z początku roku), nie historia | Najmniejszy zapis |
| H5 | G1 | Spółki zależne w ocenie liczone jak inne; „współpraca z nieetycznymi” = matka albo zależna z D (−10 do G). Partner z przetargu pominięty: podwykonawcy to specjaliści, nie spółki z oceną | Brak oceny ESG u podwykonawców |
| H6 | G2 | Zmiana użytkownika 2026-11-23: ESG nie jest przypięte do aud2. Na starcie losowy `noEsg` (nigdy nie bada ESG) i 2 losowych z ESG; co rok każdy inny dołącza z szansą 10%, do 5 (wpis w Gazecie). Stan w `ratingState.esgAuditors`, `.noEsg`, `.esgJoin`; stare zapisy: aud2 + jeden losowy, `noEsg` spośród pozostałych | Polecenie koordynatora |
| H7 | G2 | Ryzyko ESG w ocenie kredytowej: A +1 zawsze, C −1 z szansą 50%, D −2, D w G −2 (plan: A +1 z 50%, C −1). g4 na liczbach z planu: średnio −0,28 stopnia; g5: −0,13 | Bramka 0 ± 0,2 stopnia |
| H8 | G3 | Cztery cechy jako pospolite; pary etyk–ignorant i ekolog–konserwatysta wykluczone przy losowaniu. Etyk: bez wyzysku, bez greenwashingu, płace +1%, G +8; ignorant: ESG i projekty ×0,3, greenwashing pod presją ×2, G −8; ekolog: ESG i projekty E ×3, elektrownie jako OZE; konserwatysta: ESG ×0,3, elektrownie bez zmiany źródła, kurs o 3% spokojniejszy. „Wsad energii droższy o 2%” u ekologa pominięty: gra nie ma kosztu energii jako wsadu spółek; koszt ekologa niosą ścieżka ESG i projekty | Test: każda cecha u 4–8% nowych prezesów |
| H9 | G4 | Ulepszenie eko: decyzja przy zakończeniu inwestycji produkcyjnej (11 pozycji z `INVESTMENT_CATALOG`), dopłata 20% kosztu, `ecoCut` +5% (do `ecoMax`). Bot z szansą 40% × cechy × (1 + presja); gracz w UI (makieta 36). Nie przy starcie, bo budowy idą przez przetargi | Jedno miejsce wywołania (`finishInvestment`) |
| H10 | G4 | Projekty ESG: 9 pozycji, przyrost filaru do 20 pkt na filar (`stock.esgBonus`). Bot: szansa 2,5% na rok × (1 + presja) × 1,5 przy deklaracji, wybór najwyższego „przyrost × waga filaru × cechy / koszt” (najsłabszy filar ×2), potem cechy prezesa (ekolog i etyk zawsze, zwykły co drugi raz, ignorant rzadko), gotówka ≥ 2 × koszt. g4 na 6% na rok: 45% spółek z projektem po 20 latach; g5: 25% | Cel 10–25% |
| H11 | G5 | Popyt ESG: A +1%, B 0, C −1%, D −2% rocznie, co kwartał 1/4, bezpośrednio w kursie (jak wpływ zlecenia botów), średnia ważona kapitalizacją ocenionych = 0. Plan (+1,5 / −1,5 / −3) dawał różnicę zwrotu A–D ok. 7 pp rocznie (z efektem selekcji). Bez skalowania przez `getInstitutionEffectiveness` | Cel 2–5 pp; mniej kodu |

| H12 | G4 UI | Liczby projektów z makiety 36 (koszt 0,5–3% przychodu, przyrost 4–10 pkt). Panele: zamiast „energia o 4% tańsza” emisje −3 pp (gra nie liczy kosztu energii spółek). Wersja eko płatna przy zakończeniu inwestycji (`stock.ecoOrders`). Wniosek bez większości: uchwała `esgProject` na najbliższym walnym, przechodzi większością oddanych głosów (jak inne wnioski) | Makieta 36, decyzja koordynatora (3) |
| H13 | G6 | Okno „O funduszu” w ramie `.wn`; przełącznik funduszu etycznego używa `.sw` z Automatów (zielony), nie bursztynu z makiety. Kara za limit co kwartał, dopóki trwa przekroczenie | Jeden wzór przełącznika w grze |
| H14 | G7 | Impuls publikacji RateU liczony w składniku G5 (średnia zero). Wynik badania u audytora bez ESG: prywatna ocena kredytowa w skali audytora. Ocena urzędu ma audytora „UEiE” | Plan G7, zmiana użytkownika (6 audytorów) |
| H15 | G9 | Losowanie kontroli: waga 1 + 3 × (litera rzeczywista − B), więc C waży 4, D 7. Stan w `society.energy.esgReg` (zapisuje się z energią) | Bez nowego pola zapisu |
| H16 | G10 | Przydział: 1 Szmaragdowa, potem Rubinowa do limitu, potem reszta Szmaragdowej (dawniej Szmaragdowa do 3 jako pierwsza). Rubinowa 1,6 × progu Platynowej, Szmaragdowa 2,5 ×. Spółki z Platynowej i elitarnych poniżej kryterium ESG (obowiązującego albo ogłoszonego): projekt z szansą 60% na kw., nowy audyt 2 kw. po zakończonym projekcie | g9: Rubinowa 73%; k9: Szmaragdowa 83% |
| H17 | G10/G11 | Strojenie po k9 i c9: próg B 62; popyt A +0,5 / C −0,5 / D −1% rocznie; ryzyko w ocenie kredytowej A +1, C −1 z 25%, D −1, D w G −2; wycofanie uczciwej deklaracji 60% na kw.; Srebrna oceniana z szansą 70% na rok; greenwashing 0,1% na kw. | Bramki G11 |
| H18 | G11 | Baza porównań: g0 + fk łącznie (g0 sam wypadł wysoko). Ablacja (aba/abb/abc) pokazała, że spadek marży w g9 to szum, nie skutek ESG | Seria g9 dała marżę 20 lat −2,4 pp, k9 i c9 w szumie |

## Wyniki serii

| Miara | Cel (G11) | g4 (G1–G4) | g5 (G1–G5) |
|---|---|---|---|
| Pokrycie oceną publiczną, 6,5 roku / 20 lat | 40–70% | 38 / 52% | 43 / 62% |
| Oceny publiczne A / B / C / D, 20 lat | 10–25 / 30–45 / 25–40 / 5–15 | 30 / 50 / 12 / 8 | 23 / 53 / 16 / 9 |
| Greenwashing (deklaracje przy rzeczywistym C/D) | 3–10% | 7,0 / 3,6% | 8,1 / 7,7% |
| Spółki z ≥ 1 projektem ESG po 20 latach | 10–25% | 45% | 25% |
| Zmiana oceny kredytowej u audytorów z ESG | 0 ± 0,2 | −0,28 | −0,13 |
| Różnica zwrotu A – D (log, rocznie) | 2–5 pp | — | 6,9 pp |
| GIG 6,5 roku / 20 lat wobec g0 | ± 0,3 pp | +1,07 / +0,28 (SE 1,28 / 0,46) | −1,60 / −0,29 (SE 1,17 / 0,57) |
| Marża końcowa wobec g0 | ± 0,3 pp | −0,57 / −1,48 (SE 0,50 / 1,38) | −0,58 / −1,78 (SE 0,47 / 1,68) |
| Zanieczyszczenie 20 lat | ≤ 66,8 | 67,3 (SE 8,0) | 64,8 (SE 8,2) |
| Błędy JS, niezmienniki | 0 | 0 | 0 |

Po g5 zmienione jeszcze: próg B 60 (za mało C wśród ocen publicznych) i popyt ESG A +1 / C −1 / D −2%. Sprawdzi to seria następnej części. Marża po 6,5 roku −0,58 pp w dwóch seriach z rzędu (1,2 SE) — do obserwacji w G11 (podejrzenie: koszty projektów i płace etyka). Zapis 20 lat +4,7% / +7,1% pochodzi z historii kursów i ładu korporacyjnego (więcej żywych spółek na końcu), nie z pól ESG.

## Do decyzji użytkownika

| # | Sprawa | Opcje | Rekomendacja |
|---|---|---|---|
| U14 | Kryterium ESG w elitarnych (G9): przy wymogu B elitarne obsadzone w 44–49% kwartałów (cel ≥ 85%), bo duże spółki to głównie emitenci z oceną C | a) zostawić; b) Rubinowa ≥ C, Szmaragdowa i Diamentowa ≥ B; c) wszystkie elitarne ≥ C, B tylko Diamentowa; d) dłuższy okres przejściowy (8 kw.) | b) (szczegóły: `kontrola_0.18.9.md`) |
