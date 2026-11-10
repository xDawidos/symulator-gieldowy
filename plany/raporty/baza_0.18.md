# Baza 0.18 (P0, stan po 0.18.0)

Kod: `zmiany-AI` po c76b303 (0.18.0) + sonda `PROBE_018` w `tests/przebiegi.html` (kod gry bez zmian). Bez gracza, `--noui`, po 5 przebiegów naraz. Surowe wyniki poza repozytorium (`plany/raporty/*.json` jest w `.gitignore`).

| Miara | 6,5 roku (50 gier) | 20 lat (20 gier) | `kraje-stopniowo` (20 gier) |
|---|---|---|---|
| GIG | **11,11%** (mediana 10,84%, SE 0,61) | **12,81%** (mediana 12,52%, SE 0,37) | 10,46% (SE 0,87) |
| Marża końcowa | 22,57% | 20,10% | 22,68% |
| Zapis | 2,47 mln znaków | 3,91 mln | 2,54 mln |
| ms/kw. (`--noui`, 5 naraz) | 1318 | 1992 | 1443 |
| Niezmienniki, ujemna gotówka, błędy JS, po wczytaniu | 0 | 0 | 0 |
| Upadłości / debiuty na grę | 4,8 / 22,6 | — | — |
| Linie kryzysu | 0,06 na 6,5 roku | — | — |
| Format zapisu | v24 | | |

Czas kroku po kolei z UI: **1392 ms/kw.** (zob. „Pomiar czasu”).

**GIG 20 lat:** 12,81% (SE 0,37), czyli w szumie wobec 12,44% z kontroli 0.17.1 T6 i powyżej celu 8–11%. To punkt odniesienia dla bramki P3 („nie gorszy niż 12,4%” czytam jako: nie gorszy niż baza w granicach błędu, D11) i dla strojenia G8.

## Profil wsadu (sonda PROBE_018, kwartał 1, 70 gier)

Udział jednostki w przychodzie wszystkich spółek gry (PLN), marża EBITDA ważona przychodem, udział wsadu surowców z kontraktem (profil 0.17 S2). Wybrane ogniwa pilotażu:

| Jednostka (podsektor × kraj) | Udział w przychodzie | Marża | Wsad surowców | Spółek |
|---|---|---|---|---|
| Chemia, PL | 17,7% | 16,5% | 30,0% | 5,1 |
| Motoryzacja, obce | 1,3% | 12,4% | 20,3% | 2,8 |
| Żywność, obce | 1,1% | 13,5% | 19,7% | 1,0 |
| Chemia, obce | 0,6% | 16,2% | 33,0% | 1,8 |
| Żywność, PL | 0,1% | 13,4% | 17,6% | 6,0 |
| Energia/Rafinerie, PL | 0,01% | 20,8% | 60,0% | 1 |
| Przemysł/Wydobycie, PL | < 0,01% | 16,5% | 0% | 2 |
| Transport i logistyka/Lądowy, PL | < 0,01% | 15,9% | 19,4% | 2 |

**Wniosek dla kalibracji P2:** przychody spółek krajowych różnią się o kilka rzędów wielkości (KrzeUraFos4 ma większy przychód niż wszystkie polskie ogniwa łańcucha metali razem), a spółki zagraniczne wchodzą do gry dopiero z krajami. Dlatego macierze `A` i `B` są liczone **względnie w obrębie dobra**: podaż dobra to suma przychodów producentów, a popyt to udział grupy odbiorców × ta podaż, rozdzielony wewnątrz grupy według przychodów. Bilans nie zależy więc od skali spółek, tylko od zmian ich aktywności.

## Pomiar czasu

6 gier × 6,5 roku po kolei, z rysowaniem interfejsu (×200, bez innych serii w tle): **1392 ms/kw.** (SE 23; gry 1325–1487), zapis 2,42 mln znaków. To punkt odniesienia dla budżetu czasu w 0.18.1 (≤ +15%) i 0.18.2 (≤ +25%).
