# Nowe spółki 0.17 „Surowce i transport” — PROPOZYCJA do akceptacji (2026-11-01)

Status: **propozycja z poprawkami nazw użytkownika (2026-11-01)** (S0b punkt 5). Po akceptacji wchodzi w S2 (wydobywcze, rolne) i S4 (transport). Symbole sprawdzone: wszystkie wolne w `companies.js` i `countries_data.js`.

**Razem: 23 nowe spółki** (PL 8, zagranica 15) + przypisanie surowców do 14 istniejących spółek + przeniesienie 6 kolei państwowych do podsektora „Lądowy”.

Punkt wyjścia: w PL **nie ma żadnej spółki transportowej** (sektor „Transport i logistyka” mają tylko startupy z generatora nazw), za granicą tylko koleje państwowe w sektorze „Usługi” (DBF, AMR, CKO, RDF, IKP, CKN w „Budowlany”), JDL Jedwabn Logistyka i ABL Autobahn Logistik (Budowlany). Surowce: ropa TOB (US), NRG (IN); gaz GPR (FR); węgiel KWM (PL), WGI (IN); stal TKS (DE), SSA (SE); uran PUR; miedź MLD.

Kolumny: **produkt** = przychód rośnie z ceną surowca; **wsad** = koszt rośnie z ceną surowca (udział kosztu × zmiana ceny, S2). Transport: rodzaj wg S4 (Morski — tani, wolny; Lotniczy-cargo — drogi, szybki; Lądowy — kolej i ciężarówki). Rodzaj „state” = spółka państwowa (Skarb Państwa ma pakiet).

## Polska (8) — w `companies.js`, poziom giełdy wynika z ceny

| Symbol | Nazwa | Sektor / podsektor | Rodzaj | Cena (zł) | Produkt / wsad | Opis |
|---|---|---|---|---|---|---|
| PES | PetroState | Energia / Rafinerie | state, gigant | 120 | wsad: ropa; produkt: paliwa (marża rafineryjna) | Narodowy koncern paliwowy; stacje w każdej gminie i wiecznie „przejściowe” ceny. |
| NAG | NatGaz | Energia / Gaz | state | 55 | produkt: gaz | Wydobycie i import gazu; kontrakty długoterminowe ze wschodu „do renegocjacji”. |
| ZST | Złoty Stok | Przemysł / Wydobycie | normal, zmienna | 14 | produkt: złoto | Mała kopalnia złota na Dolnym Śląsku; więcej geologów niż złota. |
| SLS | Słodki Spichlerz | Żywność / Rolnictwo | normal | 32 | produkt: zboże | Skup i eksport zboża; dotacje partii rolniczej. |
| GRT | GrubyTransport | Transport i logistyka / Morski | state, flagowa | 48 | wsad: ropa (paliwo statków) | Narodowy armator z Gdańska; masowce tak pojemne jak nazwa. |
| CFL | CargoFLY | Transport i logistyka / Lotniczy-cargo | state, flagowa | 26 | wsad: ropa (paliwo lotnicze) | Państwowe cargo lotnicze; dostawa szybka, rachunek za paliwo jeszcze szybszy. |
| PKC | PKP Cargo | Transport i logistyka / Lądowy (kolej) | state | 18 | wsad: energia (od 0.17.2), węgiel | Kolej towarowa; przepustowość zależy od torów (S5). |
| TIR | Tir-Pol Spedycja | Transport i logistyka / Lądowy (ciężarówki) | normal | 40 | wsad: ropa (diesel) | Największa flota ciężarówek w kraju; elastyczna, wrażliwa na paliwo. |

## Zagranica (15) — w `countries_data.js`, ceny w walucie kraju

| Kraj | Symbol | Nazwa | Sektor / podsektor | Rodzaj | Cena | Produkt / wsad | Opis |
|---|---|---|---|---|---|---|---|
| DE | HKR | Happy-Kag Reederei | Transport i logistyka / Morski | normal | 140 € | wsad: ropa | Kontenerowce z Hamburga; wskaźnik frachtu morskiego dla Europy. |
| DE | DHX | DHXL Express | Transport i logistyka / Lotniczy-cargo | normal | 45 € | wsad: ropa | Paczki ekspresowe na cały świat; żółte samoloty, czerwone faktury. |
| US | POP | POP Service | Transport i logistyka / Lotniczy-cargo | state, flagowa | 85 $ | wsad: ropa | Federalna poczta lotnicza; „Postal Overnight Priority”. |
| US | JDM | JackobDaniels Middling | Żywność / Rolnictwo | normal | 60 $ | produkt: zboże | Handel zbożem z Midwestu; hedguje wsad na giełdzie towarowej. |
| US | NGR | Nevada Gold Rush | Przemysł / Wydobycie | normal, zmienna | 30 $ | produkt: złoto | Kopalnia złota; rośnie w kryzysach. |
| US | GTG | GothamGas | Energia / Gaz | normal, zmienna | 22 $ | produkt: gaz, ropa | Gaz łupkowy; szybko zwiększa i tnie wydobycie. |
| CZ | DOL | DolyCoast | Przemysł / Wydobycie | normal | 180 Kč | produkt: węgiel | Kopalnie węgla kamiennego na Śląsku Cieszyńskim. |
| SE | KJM | Kiruna Järnmalm | Przemysł / Wydobycie | state | 95 kr | produkt: metale (ruda żelaza) | Państwowa kopalnia rudy za kołem podbiegunowym; miasto przesuwa się dla kopalni. |
| CH | GLK | Glenkorek Trading | Przemysł / Handel surowcami | normal | 55 CHF | produkt: metale, węgiel, ropa (marża handlowa) | Szwajcarski pośrednik surowcowy; zarabia na każdej zmianie ceny. Wzór bota hedgującego (S3). |
| FR | CMA | Compagnie Maritime | Transport i logistyka / Morski | normal | 70 € | wsad: ropa | Armator z Marsylii; „przypłynie, gdy przypłynie”. |
| JP | KML | Kaiun Maru Lines | Transport i logistyka / Morski | normal | 3 200 ¥ | wsad: ropa | Japoński armator; tankowce i masowce. |
| TW | EVG | Evergiven Marine | Transport i logistyka / Morski | normal | 210 NT$ | wsad: ropa | Kontenerowce; zdarzenie „statek utknął w kanale” (wąskie gardło, S4). |
| CN | TBN | TybetNaft | Energia / Rafinerie | state, gigant | 7 ¥ | wsad: ropa | Państwowa rafineria i chemia; największy importer ropy. |
| CN | UOW | Ujgurski Obóz Wydobywczy | Przemysł / Wydobycie | state | 25 ¥ | produkt: metale | Metale ziem rzadkich; eksport jako narzędzie polityki (zbrojenia S6). |
| IN | BHO | BharatOn | Żywność / Rolnictwo | state | 240 ₹ | produkt: zboże | Państwowy skup zboża; ceny minimalne dla rolników. |

## Istniejące spółki: przypisanie surowców (bez zmiany sektora)

| Symbol | Nazwa | Produkt | Wsad |
|---|---|---|---|
| KWM | Kopalnie Węgla Mine | węgiel | — |
| MLD | Miedź Ludowa | metale | — |
| PUR | Państwowy Uran | uran | — |
| SIK | Siarkobrzeg | — | gaz |
| MEF | Meferox | — | ropa |
| ECL | EcoLube | — | ropa |
| KUP | KrzeUraFos4 | — | gaz (nawozy) |
| ESA, TRN | Elektrownia SA, Tauron | — | węgiel (TRN także uran) |
| TOB | Texas Oil & Barbecue | ropa | — |
| NRG | Narodowa Ropa i Gaz Indii | ropa, gaz | — |
| GPR | Gaz de Provence | gaz | — |
| WGI | Węgiel Indii | węgiel | — |
| TKS, SSA | Thyssen-Krupps Stahl, Surströmming Stålverk | — | metale, węgiel (koks) |
| LND | Lindwurm Gase | — | gaz |

Obronność (S6): wsad „metale” dla spółek `special: 'defense'` dopisuje S6, nie ta lista.

## Istniejące koleje → podsektor „Lądowy” (Transport i logistyka)

DBF Deutsche Bahnhof, AMR AmeriRail, CKO České Koleje, RDF Rail de France, IKP Indyjskie Koleje Państwowe (z „Usługi”), CKN Chińska Kolej Narodowa (z „Budowlany”). JDL Jedwabn Logistyka → „Logistyka”. ABL Autobahn Logistik zostaje w „Budowlany” (buduje autostrady; w S5 wykonawca przetargów).

## Poza listą (świadomie)

- **Chopin Industry Airport** (lotnisko) — infrastruktura S5 przez przetargi `city.js`, nie spółka giełdowa.
- **Srebro, kawa, bawełna** — spółki dopiero w 0.18 razem z surowcami.
- **Producenci środków transportu** (stocznie, samoloty, tabor) — STM, ABS, LAE już są; nowe w 0.18.

## Do decyzji

1. Nazwy i żarty w opisach (każdą można skreślić lub zmienić).
2. ✅ PES i TBN jako giganci (państwowe, decyzja 2026-11-01).
3. Wpływ na limit spółek kraju: limit rośnie z liczbą definicji (`getCountryLimit`), więc CZ (10 → 11) i reszta bez ręcznych poprawek.
