# Kontrola 0.18.1 „Pilotaż łańcuchów”

Gałąź `zmiany-AI`, od 113080c (P0) do 129bb57 (P4) i commitu P5. Baza: P0 (`baza_0.18.md`). Decyzje D11–D25 w `decyzje_0.18.md`. Serie bez gracza, `--noui`, po 5 naraz, uruchamiane z migawki kodu (zmiany w kopii roboczej nie wpływają na trwającą serię).

## Części

| Część | Commit | Co zrobione | Bramka |
|---|---|---|---|
| P0 | 113080c | baza: 50 × 6,5 roku, 20 × 20 lat, 20 × kraje-stopniowo, czas z UI; sonda `PROBE_018` | liczby zapisane |
| P1 | 1ac208a | `goods.js` (rejestr), 7 podsektorów, Hutpol i Motopol, metale → żelazo i miedź (zapis v25, migracja) | marże −0,02 pp, GIG −0,09 pp: OK |
| P2 | 389a603 | `chains.js` w trybie cichym, panel Państwo → Łańcuchy | b w 0,8–1,25 w 97,6% obserwacji, ceny w 0,7–1,4 w 99,9%: OK |
| P3 | 18b4034 | łańcuchy włączone, sprzężenie z kontraktami ±15%, popyt przemysłu per kraj | marże −0,01 pp, GIG −0,12 pp, sektory pilotażu w ±1 pp (D23): OK |
| P4 | 129bb57 | linia `supply` (3 warianty), propagacja niedoboru, baner kryzysu dla 6 linii | w średniej (D25) |
| P5 | (commit P5) | testy panelu, wiersza w karcie spółki i haseł Akademii | — |

Testy: **1078/1078** (stan po P5).

## Bramka pilotażu (P6, seria kontrolna)

| Miara | Cel | Wynik | Ocena |
|---|---|---|---|
| Średnia odchyłek marż sektorów (25 gier vs P0 50) | 0 ± 0,3 pp | +0,05 pp (SE 0,21) | OK |
| GIG 6,5 roku | ±1 pp wobec P0 (11,11%) | 10,45% (−0,66 pp, SE 1,02) | OK |
| GIG 20 lat | nie gorszy niż 12,4% / baza (D11) | 12,67% (SE 0,36) wobec bazy 12,81% | OK (cel 8–11% to G8) |
| Szok podażowy w dół łańcucha | +3–15% w Zarażaniu, powrót 4–8 kw. | średnio +7,1%, 9/20 gier w przedziale, powrót 1–12 kw. | w średniej (D25) |
| Zyskujące sektory w linii `supply` | ≥ GIG + 5 pp w ≥ 70% gier | średnio +6,6 pp, 45% gier | poniżej (D25) |
| Linie kryzysu | 1–2 na 20 lat | 0,75 (baza P0 też 0,75; 0.17.1: 1,1); szansa 0,015 → 0,021 nic nie zmienia (0,70) — D33 | poniżej, dziedziczone |
| Czas kroku z UI (po kolei, te same warunki) | ≤ +15% wobec P0 | P0 1618, P3 1647 (+1,8%), P6 1686 ms/kw. (+4,2%) | OK |
| Zapis | ≤ +4% | +1,0% (sekcja łańcuchów 0,7%) | OK |
| Niezmienniki, błędy JS, ujemna gotówka, po wczytaniu | 0 | 0 we wszystkich seriach (P1–P6, 205 gier) | OK |
| `kraje-stopniowo` (10 gier) | — | GIG 8,7%, 0 błędów | OK |
| Preset `kryzys` (20 gier, 6 linii po kolei) | — | GIG 10,6%, linie: naftowa 4, pandemia 4, supply 4, dotcom 1, czarny czwartek 1 | OK |

**Uwaga o pomiarze czasu:** pierwszy pomiar P0 (1392 ms/kw.) był robiony przy lżej obciążonej maszynie; drugi raz P0 dał 1618 ms/kw. Porównanie wersji robię tylko z pomiarów w tych samych warunkach (po kolei, jeden po drugim).

## Makiety

- Państwo → Łańcuchy i wiersz w karcie spółki: według `13_lancuch_018.html` (sprawdzone na zrzucie z podglądu gry: kafle w kolumnach, krawędzie, szczegóły ogniwa, pasek liczb).
- Baner kryzysu (ekran 22): makiety jeszcze nie było; zrobiony z tokenów i komponentów `alert`. **Czeka na zgodność z makietą.**
- Giełda towarowa: żelazo i miedź zamiast metali, bez komunikatu „pozycja podzielona” w oknie (jest ostrzeżenie w raporcie wczytania). Czeka na zgodność z makietą ekranu 6.

## Co nie zostało sprawdzone

- Gra ręczna (tryb autonomiczny); UI sprawdzone na podglądzie i testami.
- Bramka „wynik identyczny jak P1 przy tym samym ziarnie” sprawdzona konstrukcyjnie (D21).
- Zyskujące sektory w linii `supply` poniżej celu w części gier (D25).
