# Decyzje 0.18.8 Długa gra

Plan: `plany/plan_0.18.6_porzadki_dluga_gra.md` (sekcja 0.18.8). Praca autonomiczna; sprawy zmieniające balans gracza na końcu w sekcji „Do decyzji użytkownika”. Bez bramki balansu dla 50–100 lat (decyzja 2026-11-13), mierzona tylko technika.

| # | Część | Decyzja | Uzasadnienie |
|---|---|---|---|
| G1 | D0 | Sonda `PROBE_LONG` (co 5 lat: zapis według sekcji, pola spółek w pamięci, sterta, fundusz wobec rynku) zawsze w przebiegach; diagnoza z 4 gier × 50 lat w `raporty/diagnoza_dluga_gra.md`. Narzędzie `dluga_gra.mjs` z planu nie powstało — wystarczył jednorazowy skrypt na wynikach (liczby w raporcie) | Mniej kodu; sonda zostaje do kolejnych kontroli |
| G2 | D1 | Jedyna tablica bez limitu, która rośnie z czasem gry, a nie z liczbą spółek: CV gracza → 40 ostatnich wpisów + `cvCounts` według typu, przycinanie co kwartał i przy wczytaniu. Inne rosnące struktury są małe (ok. 6 kB/rok łącznie) albo mają już limit (`genealogyLog` 600, historia kursów, świece, poczta); `specialProjects.completed` zostaje (zbudowane projekty działają dalej). Zapis 50 lat = 1,28 × 20 lat | Bramka D1 spełniona bez dalszych cięć |
| G3 | D2 | Mechanizm skali kapitału wybiera użytkownik po D0 (plan) → U13. Nic nie wdrożone | Plan D2 |
| G4 | D4 | Automaty w Akademii jako zakładka „Automaty” w oknie CV i Akademia (bez nowego okna; ekran 4 listy designu nie ma jeszcze makiety). Odblokowanie: auto-rolowanie lokat i alert sektora po Certyfikacie Zarządzania Ryzykiem, aukcje bonów po Certyfikacie Analityka. Auto-oferta na bony: cena z minimalnej rentowności (nominał 1000, zapadalność ok. kwartału), ilość do % gotówki, oferta dodawana bez komunikatów i odświeżania Banku (jak zlecenie gracza, te same zasady przydziału). Alert koncentracji: mail Domu Maklerskiego z przyciskiem do największej pozycji sektora. Dziennik 20 ostatnich akcji w `playerProfile.automation` | Plan D4; decyzja 2026-11-14: tylko alert |
| G5 | D5 | 5 łabędzi (pandemia, wojna regionalna, upadek waluty, rewolucja technologiczna, krach systemu bankowego). Odstęp 60–100 kw., pierwszy najwcześniej w 40. kw. (w praktyce 15–25 lat). Łabędź uruchamia pierwszą wolną ze swoich linii (jedna linia naraz, bo `crisisLine` jest pojedyncza) i nie zużywa budżetu linii (`used`, `lastEventQ` wracają do stanu sprzed). Skutki: stopy (polityka jak w linii, gdy żadna nie trwa), zaufanie klientów (−12…+6 pkt), szoki sektorów w Polsce i w do 3 dołączonych krajach, fazy ich rynków. Rewolucja technologiczna nie uruchamia linii (pozytywna). Szoków popytu w łańcuchach osobno nie dodałem — robi to linia `supply` (wojna) | Najmniejsza zmiana spójna z liniami; brak w kodzie mechanizmu kilku linii naraz |
| G6 | D5 | Baner: wariant istniejącego banera kryzysu („Czarny łabędź: …”, kraje, linia, czas). Ekran 5 listy designu czeka na makietę | Bez nowych okien |
| G7 | D6 | `history.js` według makiety 23 §3: raport co 40 kw. od startu kariery (kilkadziesiąt liczb, ≤ 2 KB), wiadomość „Kronika Rynku” w TeamedUP! (rola „Firma informacyjna”), zakładka Ranking → Historia z pełnym raportem (sektory, najsłabsza spółka, rządy). „Najlepsza spółka” liczona ze zmiany kapitalizacji (odporna na split). Komórki „Wkład w Miasto” brak (0.19.2) | Makieta 23 §3 (zaakceptowana) |
| G8 | D7 | Raport kontroli jako `raporty/kontrola_0.18.8.md` (prośba czatu planowania), nie `kontrola_dluga_gra.md` z planu | Polecenie 2026-11-19 |

## Do decyzji użytkownika

| # | Sprawa | Opcje | Rekomendacja |
|---|---|---|---|
| U13 | Skala kapitału gracza (D2). Fundusz botów po 50 latach to 8 ppm rynku, ale wpływ zlecenia na kurs ma pułap 2%, więc gracz może tanio skupić dużą część małej spółki; pułap napływu liczony od stałych 60 000 PLN coraz mocniej hamuje fundusz w długiej grze (rynek ×16 w 50 lat) | a) bez zmian; b) poślizg rosnący z udziałem w free floacie (max np. 15%) + szacunek w formularzu (makieta ekranu 7); c) limit udziału w obrocie dnia; d) pułap napływu względem kapitalizacji rynku | b + d (szczegóły: `diagnoza_dluga_gra.md` §3) |

## Decyzja użytkownika 2026-11-21

**U13 → b + d z dopiskiem.**
- b) poślizg rosnący z udziałem zlecenia w free floacie (zamiast pułapu 2%) i szacunek w formularzu zlecenia (ekran 7 listy designu);
- d) pułap napływu klientów względem kapitalizacji rynku zamiast stałych 60 000 PLN;
- dopisek użytkownika: gdy fundusz jest **większościowcem** i sprzedaje większy pakiet (od ok. 5–10% akcji spółki), kurs spada **przez jakiś czas** — powstaje niestabilność, mniejszościowi akcjonariusze panikują (efekt rozłożony na tygodnie, nie jednorazowy poślizg).
Bramka: gra 6,5-letnia GIG i marże ±0,5 pp; test poślizgu według tabeli.
