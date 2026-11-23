# Diagnoza ESG 0.18.9 (G0)

Plan: `plany/plan_0.18.9_esg.md`. Kod: `esg.js` (`getEsgTrue`, bez wpływu na grę), sonda `T.esg` w `tests/przebiegi.html` (co 4 kw.: litery łączne i filarów, średnie, histogramy co 5 pkt, obniżenia przez filar D, E < 60, szara strefa). Seria g0: 24 gry × 6,5 roku i 10 × 20 lat bez presetu, na kodzie 0.18.8 z samą sondą. 0 błędów, 0 niezmienników. Liczone spółki krajowe notowane bez REIT i spółek zależnych (`isCountedListedCompany`), 63–69 na grę.

## Model (punkty 0–100)

- **E:** spółki z emisjami: 60 + 40 × (1 − emisyjność / średnia sektora), po `ecoCut`; spółki bez emisji: baza według sektora (Technologia 72, Medycyna 68, Finanse 64, Usługi 60, Turystyka 50, Transport 45, Obronność 48 itd.) + 30 × `ecoCut`; −8 za jednostkę `ecoHeat` (U9); stare `esg = true` +15.
- **S:** 30 + 0,5 × zadowolenie pracowników − 200 × udział szarej strefy; złapanie na szarej strefie −25 przez 8 kw.; strajk −10; polityka `exploit` −10, `social` +10; spółka bez zatrudnienia 60.
- **G:** 62; cechy `EXPLOIT_CEO_TRAITS` −20, inne cechy prezesa od −12 (skompromitowany) do +6 (legenda, niezależny); ujawnione przekupstwo audytora −30 przez 8 kw.; zakaz KNF −15; sprawa wezwania KNF −10; wolny obrót < 15% −5; spółka matka albo zależna z D −10.
- Wynik łączny 0,4 E + 0,3 S + 0,3 G; filar z D obniża łączny o jedną literę.

Odstępstwo od planu: spółki bez emisji startują od bazy sektora zamiast stałych 65, a G uwzględnia cechy prezesa poza trzema z wyzysku. Bez tego E i G prawie nie miały rozrzutu (G: 85% w B przy każdym progu).

## Wynik na progach z planu (A ≥ 75, B ≥ 55, C ≥ 35)

| Moment | A | B | C | D | Średnio E / S / G |
|---|---|---|---|---|---|
| 6,5 roku | 4,4% | 70,2% | 14,9% | 10,5% | 61,2 / 55,1 / 60,8 |
| 20 lat | 5,1% | 73,3% | 9,8% | 11,8% | 64,2 / 59,2 / 60,7 |

Cel G11: A 10–25%, B 30–45%, C 25–40%, D 5–15%. Rozkład za wąski: 80–90% spółek ma wynik 50–70 pkt. Całe D pochodzi z obniżenia przez filar D (głównie S: szara strefa w Budownictwie, Usługach i Turystyce, wyzysk).

Inne liczby: E < 60 (emisje ponad średnią sektora) 34% spółek po 6,5 roku, 28% po 20 latach; szara strefa > 0 u 65–72% (wzorce sektorów mają 2–8% szarej strefy od startu). S rośnie z czasem (A 4% → 19%), bo zadowolenie pracowników dryfuje w górę.

## Dobór progów

Z histogramów wyniku łącznego (co 5 pkt) policzone udziały dla kilku zestawów progów (przed obniżeniem przez filar D):

| Progi A / B / C | 6,5 roku A/B/C/D | 20 lat A/B/C/D |
|---|---|---|
| 75 / 55 / 35 (plan) | 4 / 71 / 24 / 1 | 5 / 75 / 20 / 0 |
| 66 / 57 / 44 | 18 / 46 / 34 / 3 | 32 / 42 / 23 / 4 |
| **68 / 58 / 42 (wybrane)** | 13 / 45 / 39 / 3 | 23 / 47 / 26 / 5 |
| 70 / 58 / 42 | 7 / 50 / 40 / 3 | 14 / 56 / 27 / 3 |

Wybrane **A ≥ 68, B ≥ 58, C ≥ 42, D < 42** dla filarów i wyniku łącznego (ta sama skala, jak w planie). Obniżenie przez filar D (S < 42 u ok. 14–18% spółek) dokłada D, więc szacunek po obniżeniu: A 12–22%, B 38–45%, C 25–35%, D 10–15%. Sprawdzi to seria G1 na pełnym modelu; drobne przesunięcia progów w G1, większe dopiero w G11.

## Elitarne (stan 0.18.8 w tej serii)

Rubinowa 3–6 w 83% kwartałów od 3. roku, Szmaragdowa 1–3 w 85%, Diamentowa 1 w 100% (cel ≥ 90%, 95%). Sonda warunków Szmaragdowej z 0.18.8 (seria em): z ok. 10 spółek puli ocenę A+ ma 8,7, kapitalizację 7,9, dywidendę 4 kw. 2,4 (po zmianie na 2 kw. dywidenda przestała być jedynym hamulcem). Rubinowa traci spółki, bo spełniające warunki Szmaragdowej przechodzą wyżej. Rozbicie warunków Rubinowej (ocena, zysk 8 kw., kapitalizacja) dodane do sondy (`T.tiers[].ru`) — liczby w serii G1, strojenie w G10 po G2 i G9.

## Zanieczyszczenie

Seria g0 (bez zmian w grze): 61,7 po 20 latach (SE 7,6; 10 gier). Baza bramki „bez pogorszenia” zostaje z 0.18.8 (≤ ok. 66,8).
