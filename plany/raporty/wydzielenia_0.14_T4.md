# Wydzielenia (0.14 T4, decyzja 13): gdzie ginęła wartość

- **Data:** 2026-10-16
- **Zgłoszenie:** po strojeniu T4 (`71f0495`) suma matka + córka 2 kw. po wydzieleniu wyszła **−2,5% ponad GIG** (mediana −4,1%), a cel to +3–8%.
- **Metoda:** `tests/przebiegi.html`, preset `wydzielenia`. Preset wymusza dodatkowe zapowiedzi (8% na kwartał dla spółek spełniających warunki) i zapisuje stan matki i córki: przed i po zapowiedzi, przed i po wydzieleniu, a potem co kwartał przez 2 kw. Do tego wykorzystano wydzielenia naturalne z wcześniejszych serii (`spin.excess` w sondzie).
- **Miara:** (kapitalizacja matki + kapitalizacja córki × część rozdana akcjonariuszom) 2 kw. po wydzieleniu / kapitalizacja matki przed zapowiedzią, minus zmiana GIG w tym samym okresie.

## Rozkład (przed poprawką, 50 wymuszonych wydzieleń)

| Etap | Średnio | Uwagi |
|---|---|---|
| Skok przy zapowiedzi | +6,0% | zgodnie z planem (+3–8%) |
| Od zapowiedzi do wydzielenia, ponad GIG | −2,0% (±1,7) | kurs wraca do wartości godziwej, która do dnia wydzielenia zawiera jeszcze dyskonto konglomeratu |
| Dzień wydzielenia: matka + córka vs matka przed | 0,0% | (a) kurs matki spada dokładnie o wartość rozdanej części; (b) córka startuje z kursem = udział segmentu × kurs matki |
| 2 kw. po wydzieleniu, ponad GIG | −0,8% (±2,1) | (c) bez wyprzedaży przez boty i ETF-y; córka ok. 1,13 × wartości godziwej, tak jak cały rynek |
| Dyskonto konglomeratu matki | 3,2% → 0,2% | (d) znika po wydzieleniu |
| **Łącznie** | **+4,1% (±2,8)** | **spin-off +9,4% (±2,7), carve-out −17,1% (±4,6)** |

Naturalne wydzielenia (bez wymuszania) z serii T4, P12 i T5, n = 121: **+1,5% (±1,7)**, mediana +0,1%. Wymuszone i naturalne dają ten sam obraz: wartość nie ginie w spin-offie, tylko w carve-oucie.

## Przyczyna

Przy carve-oucie matka zachowuje 51–80% akcji córki. Wartość godziwa matki (`updateFundamentalRatios`) liczy się jednak tylko z jej własnego zysku (bez segmentu) i w 25% z księgi. Pakiet w notowanej córce był w wycenie prawie niewidoczny: transfer 50% zysku córki trafia do matki jako gotówka w bilansie, a nie jako zysk. Kurs matki spadał więc przez 2 kw. do zaniżonej wartości godziwej, mniej więcej o wartość pakietu.

## Poprawka

- Wartość godziwa spółki = dotychczasowa wycena + **rynkowa wartość pakietów w notowanych spółkach zależnych** na akcję (`getListedSubsidiaryStakeValue`). To ta sama zasada co suma części na karcie koncernu (T5).
- Przy wydzieleniu lista córek (`syncSubsidiaryLinks`) jest uzupełniana przed przeliczeniem wyceny matki.
- Skoku przy zapowiedzi nie zmieniano.
- Test: po carve-oucie wartość godziwa matki = wycena bez pakietu + wartość pakietu na akcję.

## Wynik po poprawce

| Seria | n wydzieleń | Efekt ponad GIG |
|---|---|---|
| Wymuszone (20 przebiegów ×200) | 71 | **+5,0% (±2,6)**, mediana +4,4%; spin-off +5,1%, carve-out +4,9% |
| Naturalne (10 przebiegów ×200) | 21 | +12,3% (±5,0) |
| Razem | 92 | ok. +6,7% (±2,3) |

Inne miary (10 przebiegów naturalnych): GIG 20,4 ± 1,1%/rok (przed poprawką 20,8 ± 0,8%), marża 27,9%; niezmienniki 0, ujemna gotówka 0, ostrzeżenia bezpiecznika 0.

## Otwarte

- Między zapowiedzią a wydzieleniem kurs matki nadal oddaje ok. 2–3% względem GIG, bo dyskonto konglomeratu znika z wyceny dopiero przy wydzieleniu, a nie już przy zapowiedzi. Wynik mieści się w celu, więc tego nie ruszano. Gdyby trzeba było poprawić: w okresie zapowiedzi liczyć dyskonto bez wydzielanego segmentu (podniesie efekt o ok. 2 pp).
- Błąd średniej ok. ±2,3–2,6 pp, czyli trochę powyżej ~2 pp. Mniejszy błąd wymaga ok. 30 dodatkowych przebiegów z presetem.
