# Plan 0.15.3 „Wielkie Kryzysy” (po 0.15.2 „Kochaj i zarabiaj”, przed 0.16 „Giełda międzynarodowa”)

Cel: oprócz ogólnego krachu z 0.15 (H4) rynek czasem przechodzi **linię kryzysu** wzorowaną na prawdziwym kryzysie. Każda linia ma:
- przyczynę i sygnały ostrzegawcze;
- sektory, które tracą, i sektory, które zyskują;
- spółki, które upadają;
- własną reakcję banku centralnego i państwa;
- własne tempo odbicia.

Czego to uczy:
- **Każdy kryzys jest inny:** inna przyczyna, inni przegrani i wygrani, inne tempo odbicia (V, U, L).
- **W kryzysie upadają zadłużeni:** dźwignia, płynność i kondycja decydują, kto przetrwa.
- **Polityka pieniężna i fiskalna:** cięcia stóp, ratowanie banków, pomoc sektorom. Stagflacja, w której bank centralny podnosi stopy w recesji.
- **Rotacja sektorowa i dywersyfikacja:** w kryzysie zyskują inne branże niż w hossie.
- **Historia rynków:** 1929, 1973, 2000, 2008, 2020 (Akademia z prawdziwą historią).

Kolejność: W0 → W1 → W2 → W3 → W4 → W5 → W6 → W7. **Commit po każdej części** (część z kilkoma krokami — commit po każdym kroku).

UI z komponentów 0.14.5. **Projekt wyglądu zlecamy czatowi designu.**

---

## Punkt wyjścia (stan kodu po 0.15.0.1)

| Element | Gdzie | Stan |
|---|---|---|
| Krach ogólny | `core.js` `triggerMarketCrash`, `processMarketCrashWeekly`, `checkMarketCrashQuarterly` | od 0.15.0.1: tylko po wzrostach, 2,5%/kw., dno premii −35%; pole `marketCrash.theme` zawsze `null` |
| Szok sektorowy | `core.js` `applySectorShock` | **wadliwy (B5):** dodaje premię na stałe, a `updateAllSectorPremiums` nadpisuje `stock.sectorPremium` przy kolejnej aktualizacji; `durationQuarters` nieużywane |
| Premia sektora | `updateAllSectorPremiums` | liczy tylko bańkę (H3) wg udziału segmentu |
| Małe szoki makro | `core.js` `MACRO_SHOCK_EVENTS` | m.in. szok naftowy (inflacja +1 pp), fala grypy, kryzys walutowy — jednorazowe efekty kursowe |
| Bank centralny | `reactCentralBankToCrash`, `runCentralBankAI` | nadzwyczajne cięcie 50 pb po krachu |
| Państwo | nacjonalizacje (`events.js`), skarb (`governmentTreasury`), dotacje wg partii | — |
| Bezpieczniki, KNF | 0.15 H4b, 0.15.0.1 C1 | na zegarze gry |
| Gasnące gwiazdy | 0.15 H1b | wzór „upadku” spółki |
| Osiągnięcia, Akademia | 0.15 H6 | rejestr `ACHIEVEMENTS`, hasła |
| Sektory | `SECTORS` (`core.js`) | m.in. Bankowość, Finanse (Fintech, Pożyczki konsumenckie), Nieruchomości, Budowlany, Technologia (Półprzewodniki, SI), Gaming, Media, Turystyka, Transport i logistyka (Lotnictwo, Logistyka), Energia (OZE, Energetyka jądrowa), Chemia, Przemysł, Żywność, Medycyna (Biotechnologia, Sprzęt medyczny), Dobra konsumpcyjne, Usługi, Obronność |

---

## W0. Pomiar i naprawa szoku sektorowego (B5)

- **Sondy** w `tests/przebiegi.html`: premia sektora wg sektorów co kwartał; linie (start, etap, koniec); upadki w linii; stopy i inflacja w linii; GIG i fundusz w linii.
- **B5:** `applySectorShock(sektor, premia, kwartały, opcje)` tworzy wpis w `sectorShocks[]`:
  - pola: sektor, premia docelowa, czas narastania, czas trwania, czas wygasania, `lineId`;
  - `updateAllSectorPremiums` sumuje bańkę i wszystkie aktywne szoki według udziału segmentu (jak bańka);
  - łączny limit premii sektora −60%…+150%;
  - wygasanie liniowe do 0.
- **Testy:** szok trwa zadany czas i wygasa; suma z bańką; działa według udziału segmentu; przeżywa zapis.
- **Commit W0.**

## W1. Silnik linii kryzysu

- **Stan** `crisisLine = { id, stage, quartersInStage, startQuarter, affected[], bankrupted[], forced }`.
- **Etapy:**

| Etap | Długość | Co się dzieje |
|---|---|---|
| Zapowiedź | 1–2 kw. | sygnały: mały szok makro tego samego typu (istniejące `MACRO_SHOCK_EVENTS`), wiadomości w pasku, pogorszenie danych sektora |
| Wybuch | 1 kw. | krach z tematem (`marketCrash.theme = id`) albo szok sektorowy (dla linii bez krachu całego rynku), bezpieczniki |
| Zarażanie | 1–3 kw. | szoki w kolejnych sektorach, spadek przychodów sektorów tracących, upadki |
| Interwencja | 1–2 kw. | reakcja banku centralnego i państwa wg linii |
| Dno | 1–2 kw. | szoki osiągają minimum, nastrój „Kapitulacja” albo „Bessa” |
| Odbicie | wg linii (2–16 kw.) | szoki wygasają w tempie linii; sektory zyskujące wracają do 0 |

- **Częstość:** 1%/kw. (pokrętło 0,5–2%), gdy przez ≥ 12 kw. nie było krachu ani linii, plus linie zamiast krachu (niżej).
  - Razem średnio ok. 1,2 linii na 20 lat; w grze 6,5-letniej ok. 25–40%.
  - Linie bez powtórzeń, dopóki są niewykorzystane.
- **Linia zastępuje krach:** w kwartale, w którym wylosowano krach z 0.15.0.1, jest 40% szans, że zamiast niego zaczyna się linia (etap Wybuch bez Zapowiedzi). Łączna liczba wstrząsów zostaje podobna.
- **Fałszywe alarmy:** małe szoki makro zostają jak dziś. Tylko część z nich jest Zapowiedzią linii, więc sygnał nigdy nie daje pewności (cel: ≥ 50% sygnałów bez linii).
- **Upadki:** 1–3 spółki na linię. Ranking po dźwigni (zobowiązania / aktywa), kondycji i udziale segmentu w sektorach tracących. Upadłość przez istniejącą ścieżkę bankructwa; bez spółek Skarbu Państwa (zamiast upadku — ratunek, W3).
- **Testy:** przejścia etapów; częstość (10 000 losowań); linia zamiast krachu; ranking upadków; brak powtórzeń.
- **Commit W1.**

## W2. Pięć linii (dane)

Nazwy po polsku, w grze bez dat; w Akademii z prawdziwą historią. Premie to cele szoku sektorowego (W0); „przychody” — dodatkowa zmiana trendu przychodów sektora na czas linii.

| Linia | Wzór | Iskra (Zapowiedź) | Tracą | Zyskują | Upadają | Odbicie |
|---|---|---|---|---|---|---|
| 🏦 **Kryzys bankowy** | 2008 | bańka na Nieruchomościach albo mały szok „housing”; bank o najwyższej dźwigni traci płynność | Bankowość −35%, Finanse −40% (Pożyczki konsumenckie −50%), Nieruchomości −40%, Budowlany −35%; przychody −10…−20%/rok | Żywność +5%, Medycyna +5%; obligacje skarbowe (stopy w dół) | 1–2 banki lub parabank o najwyższej dźwigni, deweloperzy z długiem | 6–10 kw. (U) |
| 💻 **Bańka internetowa** | 2000–2001 | bańka w Technologii, SI, Gamingu lub Fintechu ≥ 2 kw. | Technologia −45% (SI −55%, Półprzewodniki −45%), Gaming −40%, Media −25%, Fintech −50%; startupy debiutują 3× rzadziej | Energia +5%, Żywność +5%, Dobra konsumpcyjne +5% (rotacja do wartości) | spółki technologiczne ze stratą i startupy bez gotówki | rynek 4–6 kw., Technologia 8–12 kw. |
| 🛢️ **Szok naftowy** | 1973 | mały szok „oil”; zdarzenie geopolityczne | Transport i logistyka −30% (Lotnictwo −45%), Turystyka −35%, Chemia −25%, Przemysł −20%; przychody −8…−15%/rok | Energia +20% (bez OZE), OZE +15%, Obronność +10% | przewoźnicy i linie lotnicze z długiem | 4–8 kw. |
| 🖤 **Czarny czwartek** | 1929 | Euforia z dźwignią botów > 40% i premią rynku > +25% | cały rynek: krach −40…−60% premii (wyjątek od dna −35%); Bankowość −30% (panika, wycofywanie depozytów); przychody całej gospodarki −10%/rok | gotówka, obligacje skarbowe | wiele słabych spółek (do 3) i 1 bank | 10–16 kw. (L, potem powolne U) |
| 🦠 **Pandemia** | 2020 | mały szok „pandemic” | Turystyka −50%, Usługi −25%, Lotnictwo −50%, Media (Rozrywka) −30%, Nieruchomości (bez Magazynów) −20%; przychody tych sektorów −30% przez 2 kw. | Medycyna +20% (Biotechnologia +35%, Sprzęt medyczny +25%), Technologia +15%, Gaming +20%, Żywność +10%, Magazyny +15% | turystyka i usługi z długiem | 2–4 kw. (V) |

- Linie działają na spółki przez **udział segmentu** (konglomerat mniej wystawiony).
- **Gospodarka:** linie bankowa, Czarny czwartek i pandemia wymuszają Recesję (`economyCycle`) na czas Zarażania; szok naftowy — Recesję z inflacją +2…+4 pp (`macro.shocks.inflation`).
- **Commit W2** (krok na linię albo 2 kroki: dane i efekty gospodarki).

## W3. Reakcje banku centralnego i państwa

| Linia | Bank centralny | Państwo |
|---|---|---|
| Kryzys bankowy | cięcia 100–200 pb w 2 kw. | ratunek banków: nacjonalizacja albo dokapitalizowanie z `governmentTreasury` (banki krajowe zamiast upadku, jeśli skarb pozwala); gwarancje depozytów |
| Bańka internetowa | cięcia 50–100 pb | — |
| Szok naftowy | **podwyżki** 100–200 pb mimo Recesji (stagflacja) | dopłaty do paliw dla Transportu (z budżetu, wg partii) |
| Czarny czwartek | najpierw **zwłoka** (2 kw. bez cięć — błąd z 1929), potem cięcia 150–250 pb | program robót publicznych (zamówienia dla Budowlanego, PPP z `city.js`) od etapu Interwencji |
| Pandemia | cięcia do minimum (0,5%) w 1 kw. | programy pomocowe: dotacje dla Turystyki i Usług (wg partii), skarb w deficyt |

- Działamy przez istniejące mechanizmy: stopy (`centralBank.baseInterestRate` → wyceny przez `rateSens`, lokaty, kredyty), skarb, dotacje, nacjonalizacje.
- Wiadomości: pasek newsów i mail banku centralnego (wzorzec istniejących).
- **Testy:** kierunek stóp wg linii; ratunek banku zamiast upadku przy wystarczającym skarbie; dotacje z budżetu (bez pieniędzy znikąd).
- **Commit W3.**

## W4. Scenariusz na start gry (decyzja użytkownika)

- Ekran startu nowej gry: lista **„Kryzys w grze”**:
  - „Losowo” (domyślnie);
  - jedna z 5 linii — zaczyna się Zapowiedzią w losowym kwartale 2.–4. roku (kw. 5–16), a potem linie losowe działają jak zwykle.
- Wybór widać w CV („Scenariusz: Kryzys bankowy”) i w retrospektywie.
- Bez wpływu na trudność oceny zarządu (ocena względem GIG).
- **Commit W4.**

## W5. Co widzi gracz

- **Dla wszystkich:**
  - nagłówki w pasku newsów na każdym etapie (np. „Bank X wstrzymuje wypłaty”, „Rząd ogłasza program ratunkowy”);
  - mail z retrospektywą po końcu linii: wynik GIG, funduszu i sektorów, upadki, reakcja instytucji, link do hasła Akademii.
- **Analityk Indeksowy L5** (okno „Rynek”): sekcja „Kryzys” z etapem, sektorami tracącymi i zyskującymi (z premiami) i reakcjami instytucji.
- **Karta spółki:** wiersz „Wystawienie na kryzys: wysoki / średni / niski” (udział segmentów w sektorach tracących) — tylko w trakcie linii.
- **Commit W5.**

## W6. Akademia i osiągnięcia

- **Akademia:** 5 haseł z prawdziwą historią (daty, przyczyny, skutki, reakcje) i 3 ogólne: „Stagflacja”, „Kształty odbicia: V, U, L”, „Ratowanie banków i pokusa nadużycia”.
- **Osiągnięcia** (zakładka CV i szkolenia, XP bez pieniędzy):

| | Osiągnięcie | Warunek |
|---|---|---|
| 🏦 | Przetrwałem kryzys bankowy | koniec linii z zaufaniem ≥ 30 i funduszem ≥ GIG w linii |
| 💻 | Bańka mnie nie dopadła | w Wybuchu bańki internetowej ≤ 10% aktywów w Technologii |
| 🛢️ | Stagflacja? Nie tym razem | w szoku naftowym fundusz ≥ GIG + 5 pp |
| 🖤 | Wielki Kryzys w portfelu | przetrwaj Czarny czwartek bez utraty stanowiska |
| 🦠 | Lockdown na plusie | dodatni wynik funduszu w etapach Wybuch–Dno pandemii |
| 🗂️ | Kolekcjoner kryzysów | przeżyj wszystkie 5 linii |

- **Commit W6.**

## W7. Kontrola końcowa

Pomiar z „Jak sprawdzimy”, raport `raporty/kontrola_0.15.3.md`, wiersz w mapie. **Commit W7.**

---

## Zlecenie dla czatu designu (przed W4–W5)

1. Sekcja „Kryzys” w oknie „Rynek” (etap jako oś z podpisami, sektory z premiami słowem i liczbą, reakcje instytucji).
2. Lista „Kryzys w grze” na ekranie startu.
3. Wiersz „Wystawienie na kryzys” w karcie spółki.
4. Ikony linii (SVG zamiast emoji, decyzja użytkownika) w pasku newsów, Akademii i osiągnięciach.
5. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.

## Zapis gry i testy

- **Zapis v15 bez zmiany numeru** (pola opcjonalne):
  - `crisisLine`, `sectorShocks[]`, lista użytych linii;
  - scenariusz startowy;
  - przyrost < 0,05%.
- **Migracja:** brak linii; `sectorShocks` puste.
- **Testy** (nowa grupa „0.15.3”, ok. 25): wymienione w częściach, do tego:
  - każda linia przechodzi wszystkie etapy w scenariuszu testowym;
  - niezmienniki po 20 latach;
  - zapis i wczytanie w każdym etapie.

## Jak sprawdzimy

Przebiegi ×200: **20 gier × 6,5 roku bez presetu, 20 × 6,5 roku z `fundusz-gig`, 10 × 20 lat**, a do tego **5 gier na każdą linię** wymuszoną scenariuszem (W4).

| Miara | Cel |
|---|---|
| Linie | 1–2 na 20 lat; ≥ 1 w 25–45% gier 6,5-letnich |
| Krachy + linie (wstrząsy) | 1–3 na 20 lat |
| Średnia premia rynku ważona czasem (20 lat) | −3…+3% (jak w 0.15.0.1) |
| Spadek GIG od szczytu w linii | bankowa 30–50%, internetowa 20–40%, naftowa 15–30%, Czarny czwartek 40–60%, pandemia 20–35% |
| Czas do odzyskania szczytu GIG | pandemia ≤ 6 kw.; Czarny czwartek ≥ 12 kw. |
| Sektory zyskujące | wynik ≥ GIG + 10 pp w linii w ≥ 70% gier |
| Upadki w linii | 1–3; ≥ 70% to spółki z górnych 25% dźwigni |
| Sygnały bez linii (fałszywe alarmy) | ≥ 50% |
| Stopy wg linii | kierunek zgodny z tabelą W3 w 100% gier |
| Fundusz = GIG: udziały, zaufanie | jak w 0.15.0.1 (±3%/rok, 45–55) |
| Niezmienniki, ujemna gotówka, wyjątki JS, pieniądze znikąd | 0 |
| Czas kroku / zapis | +≤ 2% / +≤ 0,05% |

## Ryzyka

- **Powrót dryfu premii.** Linie mogłyby obniżyć średnią premię jak krach przed 0.15.0.1. Zabezpieczenie: linia zastępuje krach (40% krachów), częstość tylko po ≥ 12 kw. spokoju, cel premii −3…+3% w W7.
- **Linie za przewidywalne** (Zapowiedź = pewny sygnał). Zabezpieczenie: małe szoki makro zostają, ≥ 50% sygnałów bez linii.
- **Upadki spółek gracza — frustracja.** Zabezpieczenie: ranking po dźwigni (widoczna w karcie spółki), wiersz „Wystawienie na kryzys”, retrospektywa.
- **Czarny czwartek za brutalny** (premia do −60%). Zabezpieczenie: tylko po Euforii z dźwignią; bezpieczniki; bramka umorzeń z 0.15.0.1 ogranicza odpływ.
- **Kolizja z bańkami (H3) i szokami makro.** Zabezpieczenie: wspólny stan szoków sektorowych (W0); w linii nie startuje nowa bańka.
- **Za dużo wiadomości.** Etapy po 1 nagłówku; reszta w retrospektywie.

## Decyzje (podjęte)

2026-10-19 (wariant C): 5 linii (1929, 1973, 2000, 2008, 2020), asymetria branżowa, interwencje państwa.

2026-10-20 (planowanie 0.15.x, `raporty/audyt_planow_0.15.x.md`):
1. **Scenariusz na start gry:** tak, opcjonalnie („Losowo” domyślnie albo wybrana linia w 2.–4. roku).
2. **Naprawa B5** (szok sektorowy jako stan z czasem trwania) jako pierwsza część 0.15.3.
3. **Linia zastępuje krach** (40% krachów) i startuje tylko po ≥ 12 kw. spokoju; cel średniej premii −3…+3% obowiązuje dalej.
4. **Fałszywe alarmy:** istniejące małe szoki makro zostają jako sygnały bez linii (≥ 50%).
5. **Zarażanie linii kryzysów między krajami** — w 0.16 (dopisane do zgłoszeń w `plan_0.16_gielda_miedzynarodowa.md`).
