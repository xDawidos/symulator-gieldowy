# Kontrola 0.18.7 — Progresja i onboarding (E4)

Gałąź `zmiany-AI`. Plan: `plany/plan_0.18.6_porzadki_dluga_gra.md` (sekcja 0.18.7). Decyzje: `raporty/decyzje_0.18.7.md` (F1–F12, U10–U12). Baza: o45c (kod końcowy 0.18.6, 25 gier × 6,5 roku i 20 gier × 20 lat).

E1 (odblokowania) przeniesione do wersji 1.0 decyzją użytkownika z 2026-11-18. **UI E0 wdrożone według makiet 25–27 (commit 12c834d), które czekają jeszcze na akceptację użytkownika (U10).**

Seria końcowa: e0h + e0x (kod po strojeniu progów, migawki po a847ea6 z progami Brązowa 0,015 i Platynowa 80): 25 gier × 6,5 roku i 34 gry × 20 lat, bez UI. Kontrola zawieszeń: e0y (25 × 20 lat, z zabezpieczeniem kroku kwartału). Testy: 1117/1117.

## Części

| Część | Commity | Co zrobione |
|---|---|---|
| E2 | 98c6086 | `tasks.js`: Pierwsze kroki, Od zarządu, Rynek (z jawnych faktów o GIG), Mechaniki; limity 2 i 3; lista w TeamedUP!, karta 3 przypiętych w panelu funduszu |
| E3 | 3c190cb | Barometr Rynku (5 wskaźników, bez nazwy fazy, z szumem), Tied i mail Pulsu Rynku, wiarygodność z prenumeraty |
| E4 (nagrody) | 1a42f27 | „Podnieś wartość spółki” 300 → 200 PLN; sonda rozkładu poziomów w przebiegach |
| E0a–E0d | 2f490d2 | poziomy bez kursu, elitarne z warunków, wydarzenia zmian poziomu, KNF zmienia zasady |
| E0 UI + strojenie | a847ea6, ten commit | makiety 25–27; strojenie e0f → e0g → e0h (F5, F7); zabezpieczenie kroku kwartału (F12) |

## Bramka 0.18.7

| Miara | Cel | Wynik | Ocena |
|---|---|---|---|
| Rozkład poziomów (E0a): Śmieciowa / Brązowa / Srebrna / Złota | 10 / 33 / 32 / 18% ±3 pp | 12,9 / 30,0 / 32,9 / 15,1% | Brązowa i Złota na granicy (−3,0 / −2,9 pp), reszta OK |
| Platynowa | 5–10% | 3,8% sama; z elitarnymi 9,1% | poza celem, jeśli liczyć samą → U11 |
| Rubinowa 3–6 spółek od 3. roku (E0b) | ≥ 90% kwartałów | 91% | OK |
| Szmaragdowa 1–3 spółki | ≥ 90% kwartałów | 68% (e0f 30%, e0g 56%) | poza celem → U11 |
| Diamentowa dokładnie 1 | ≥ 90% kwartałów | 100% | OK |
| Diamentowa zmienia właściciela | 1–4 razy na 20 lat | średnio 1,74; 6 z 34 gier bez zmiany (e0f: 16,8) | OK (0 zmian w 18% gier) |
| Wiadomości o zmianach poziomu (E0c) | ≤ 6 na kwartał | 6 + zbiorcza (test), 1 wpis Gazety na kwartał | OK |
| Zmiany zasad KNF (E0d) | 1–4 na 20 lat | średnio 2,00 (0 w 2 grach, 5 w 1 grze) | OK |
| Debiuty (E0d) | ±20% wobec bazy | 6,5 roku 0%, 20 lat −0,1% | OK |
| Średnia odchyłek marż sektorów | 0 ± 0,3 pp | 6,5 roku +0,34 pp (SE 0,25); 20 lat +0,21 pp (SE 0,35) | 6,5 roku o włos poza (1,4 SE, szum) |
| GIG 6,5 roku | ±0,3 pp | 10,67% → 10,50% (−0,17 pp, SE 1,25) | OK |
| GIG 20 lat | ±0,3 pp wobec bazy; cel użytkownika 10–13% (U1) | 11,96% → 10,31% (−1,65 pp, SE 0,48) | poza „±0,3 pp”, w celu 10–13% → U12 |
| Nagrody z zadań (E2) | ≤ 1 500 PLN na 6,5 roku | pułap 1 410 PLN (rachunek); boty w serii: śr. 5 PLN | OK |
| E2–E3 bez wpływu na balans (e4 vs e4base, 25 gier) | marże i GIG w szumie | marże +0,21 pp, GIG +1,74 pp (SE 1,31), zapis +2,6% | OK |
| Zapis | bez dużego wzrostu | +1,7% (6,5 roku), +2,1% (20 lat) | OK |
| Niezmienniki, ujemna gotówka, błędy JS, po wczytaniu | 0 | 0 we wszystkich ukończonych grach | OK |
| Zawieszenia przebiegu | 0 | 2 na 82 gry 20-letnie z E0 (kw. 63 i 71), 0 na 185 wcześniejszych → zabezpieczenie F12; e0x + e0y: 0 na 50 | OK po F12, przyczyna niewyjaśniona |

### GIG 20 lat: skąd −1,65 pp

Rozbicie dwiema seriami kontrolnymi po 25 gier × 20 lat:

| Seria | Kod | GIG 20 lat |
|---|---|---|
| o45c | baza 0.18.6 | 11,96% (SE 0,39) |
| onf | baza bez efektów kursowych dawnych awansów (+3…+8%) i spadków | 11,40% (SE 0,38) |
| enf | E0 bez efektów kursowych zmian poziomu | 10,55% (SE 0,32) |
| e0h + e0x | E0 końcowe | 10,31% (SE 0,29) |

1. Ok. −0,6 pp: dawny poziom z kursu przy rosnących cenach dawał prawie same awanse z premią +3…+8%, czyli stały dopływ do indeksu. Plan E0c chce efektów średnio zero, więc ten dopływ znika z założenia.
2. Ok. −0,85 pp: inny rozkład poziomów w długiej grze (dawniej spółki przez 20 lat wędrowały w górę razem z kursem, teraz rozkład jest stały). Od poziomu zależą m.in. dostęp botów (`accessLevel`), cele przejęć (`level < 3`) i polityka dywidend przy awansie z Śmieciowej.
3. Ok. −0,25 pp: nowe efekty kursowe zmian poziomu (w granicach szumu).

Wynik mieści się w celu użytkownika 10–13% (U1), blisko dolnej granicy. Bez zmiany zasad nie da się przywrócić poprzedniego poziomu → U12.

### Zawieszenia przebiegu (F12)

W 2 grach 20-letnich z kodem E0 (enf kw. 71, e0h kw. 63) licznik kwartałów przestał rosnąć: krok kwartalny rzucał wyjątek przed `advanceMacroQuarter`, za każdym razem od nowa. Kod E0 działa w tej części kroku (`reviewCompanyPlacements`, `processEliteExchangesQuarterly`). Statycznie nie znalazłem przyczyny; 25 kolejnych gier (e0x) przeszło bez zawieszenia. Zabezpieczenie: oba kroki w `runQuarterStep` (błąd do konsoli i do `quarterStepErrors`, kwartał przechodzi dalej); sonda przebiegów zapisuje `p018.qerr`, a komunikat zawieszenia zawiera ostatnie błędy z pętli zegara.

e0y (25 × 20 lat z zabezpieczeniem): 0 zawieszeń, `qerr` pusty we wszystkich grach, GIG 20 lat 10,51% (SE 0,33). Łącznie po e0h: 0 zawieszeń na 50 gier; przyczyna pozostaje niewyjaśniona (rzadka, ok. 1 na 40 gier), zabezpieczenie i diagnostyka zostają.

## Zrzuty i sprawdzenia w podglądzie

Sprawdzone w grze (podgląd 1366 px): podpowiedź Platynowej po najechaniu (ikona, „Wymagana ocena A”, zdanie bez liczb) nad wierszami, nie przesuwa układu; znacznik „AA” w linii opisu spółki; płytka Diamentowej z „1 miejsce”; 15 znaczników oceny na liście w świeżej grze. Mail Gazety, Domu Maklerskiego i KNF sprawdzone testami (treść, brak emoji, brak liczb przy poziomach).

## Co dalej

- U10 (akceptacja makiet 25–27), U11 (Szmaragdowa i Platynowa), U12 (GIG 20 lat) — `decyzje_0.18.7.md`.
- Jeśli `qerr` w kolejnych seriach pokaże błąd z kroku kwartału, poprawić przyczynę (zabezpieczenie tylko ją ukrywa przed graczem).
