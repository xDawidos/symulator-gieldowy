# Plan 0.15.1 „Kryzysy” (szkic, po 0.15 „Hossa i bessa”, przed 0.16)

> **Szkic ze zgłoszenia użytkownika (2026-10-18, planowanie 0.15).** Przed budową potrzebny pełny plan z audytem i decyzjami, jak dla 0.15.

Cel: oprócz ogólnego krachu z 0.15 (H4) rynek przechodzi czasem **linie zdarzeń** wzorowane na prawdziwych kryzysach. Każda ma swoją przyczynę, sektory, które tracą, sektory, które zyskują, i spółki, które upadają. Gracz uczy się, że każdy kryzys jest inny: inna przyczyna, inni przegrani i wygrani, inna reakcja państwa i banku centralnego, inne tempo odbicia.

## Punkt wyjścia (po 0.15)

- **Silnik krachu z 0.15 H4** ma pole `marketCrash.theme` (w 0.15 zawsze `null`) i funkcję szoku sektorowego `applySectorShock(sektor, premia, kwartały)` — premia sektora działa tą samą drogą co bańki (H3), według udziału segmentu.
- Do wykorzystania:
  - bezpieczniki, nadzwyczajne cięcie stóp i KNF (H4);
  - gasnące gwiazdy (H1b) jako wzór „upadku” spółki;
  - nacjonalizacja i ratunek banków (0.11, 0.13.1);
  - szok inflacji w makro (`macro.shocks.inflation`);
  - osiągnięcia (H6b).

## Linie kryzysów (scenariusze)

Nazwy po polsku, w grze bez dat; w Akademii z prawdziwą historią.

| Linia | Wzór historyczny | Iskra | Tracą | Zyskują | Upadają | Reakcja instytucji | Odbicie |
|---|---|---|---|---|---|---|---|
| 🏦 **Kryzys bankowy** | 2008 (Lehman Brothers) | pęknięcie bańki na Nieruchomościach, bank z największą dźwignią traci płynność | Bankowość, Finanse, Nieruchomości, Budowlany | obligacje skarbowe, defensywne (Żywność, Medycyna) | 1–2 banki lub parabank z najwyższą dźwignią; deweloperzy z długiem | bank centralny tnie mocno, ratunek lub nacjonalizacja banków, gwarancje depozytów | wolne, 6–10 kw. |
| 💻 **Bańka internetowa** | 2000–2001 (dot-com) | bańka w Technologii / Sztucznej inteligencji / Gamingu pęka razem z rynkiem | Technologia, Gaming, Media, Fintech, startupy | „stara gospodarka”: Energia, Żywność, Dobra konsumpcyjne (rotacja do wartości) | spółki technologiczne ze stratą i startupy bez gotówki | umiarkowane cięcia stóp | szybkie dla rynku, bardzo wolne dla technologii (8–12 kw.) |
| 🛢️ **Szok naftowy** | 1973 (embargo) | skok cen paliw (zdarzenie geopolityczne) | Transport i logistyka, Lotnictwo, Turystyka, Chemia, Przemysł | Energia (paliwa, wydobycie), OZE | przewoźnicy i linie lotnicze z długiem | **stagflacja:** inflacja w górę, bank centralny **podnosi** stopy mimo recesji | 4–8 kw. |
| 🖤 **Czarny czwartek** | 24.10.1929 (Wall Street; zgłoszenie użytkownika: „1933” — rok najgłębszego dna Wielkiego Kryzysu) | krach całego rynku po euforii z kredytem na akcje | cały rynek (−40…−60%), banki (panika i wycofywanie depozytów) | gotówka i obligacje skarbowe | wiele słabych spółek i banków | początkowo błędy (bank centralny zwleka), potem program państwa | bardzo wolne, 10–16 kw. |
| 🦠 **Pandemia** | 2020 (COVID-19; zgłoszenie użytkownika: „2022”) | zdarzenie zdrowotne, lockdown | Turystyka, Usługi, Lotnictwo, Transport, Rozrywka, Nieruchomości komercyjne | Medycyna (Farmaceutyki, Sprzęt medyczny, Biotechnologia), Technologia, Gaming, Żywność | turystyka i usługi z długiem | stopy w dół do minimum, programy pomocowe rządu | szybkie odbicie w kształcie V (2–4 kw.) |

## Mechanika (do rozpisania w pełnym planie)

- **Linia zdarzeń**, 6–16 kw., etapy: zapowiedź (sygnały) → wybuch → zarażanie → interwencja → dno → odbicie. Każdy etap to wiadomości w pasku i poczcie oraz szoki sektorowe przez `applySectorShock`.
- **Częstość:** około 1 linia na 8–12 lat gry; z puli 5 scenariuszy bez powtórzeń, dopóki są niewykorzystane. Linia zastępuje ogólny krach (nie dokłada się do niego).
- **Upadki:** wybór spółek po kondycji, długu i udziale segmentu w sektorach tracących (nie losowo). Uczy, że w kryzysie upadają zadłużeni.
- **Wygrani:** premia sektora dodatnia na czas linii, a w części spółek także wzrost przychodów (np. Medycyna w pandemii).
- **Akademia:** po haśle na każdą linię, z prawdziwą historią (daty, przyczyny, skutki).
- **Osiągnięcia kryzysów** (do zakładki CV i szkolenia z 0.15), np.:
  - „Przetrwałem kryzys bankowy”;
  - „Bańka mnie nie dopadła”;
  - „Stagflacja? Nie tym razem”;
  - „Wielki Kryzys w portfelu”;
  - „Lockdown na plusie”;
  - „Kolekcjoner kryzysów” (wszystkie 5).
- **Do decyzji w pełnym planie:**
  - czy gracz może włączyć linię na start nowej gry (dawny pomysł „scenariusz Wielki Kryzys”);
  - jak linie łączą się z 0.16 (zarażanie między krajami).
