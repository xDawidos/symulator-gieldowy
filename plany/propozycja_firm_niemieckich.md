# Propozycja brakujących firm niemieckich (0.16.11 K1) — DO ZATWIERDZENIA

Status: **propozycja, niewdrożona w kodzie.** Ustalamy nazwy wspólnie z użytkownikiem; po zatwierdzeniu (lub poprawkach) firmy trafią do `countries_data.js` (DE) jako krajowe przy starcie z Niemiec.

Punkt wyjścia: w danych DE jest 14 firm + 3 państwowe (PZW, VWA, STW, BMV, CRH, BYM, MTS, SIE, SPF, DGH, OKT, ABL, MRA, WiS; państwowe DBF, BPS, WAB). Przy starcie z Niemiec rynek macierzysty = 38 firm uniwersalnych (UNI) + zestaw niemiecki. Polski rynek ma 70 firm (38 UNI + 32 PL), więc do parytetu brakuje ok. **35 firm niemieckich** (17 istniejących + 35 = 52; razem z UNI ok. 90 pozycji, jak 92 w Polsce).

Zasady: nazwy-parodie w stylu gry (jak Panzerwafel, Siemenz, BMV Bayerwerke); cena w EUR; „giełda” = poziom z gry (JUNK < BRONZE < SILVER < GOLD < PLATINUM < EMERALD < RUBY); spółki państwowe tylko na giełdzie macierzystej (DAX); sektory z rejestru gry; symbole 3–4 litery, niekolidujące z UNI i istniejącymi DE.

Polskie odpowiedniki (dla orientacji, którego typu spółki brakuje): spółki zwykłe 44 (z tego 32 PL), państwowe 8, uczelnie 3, obronność 4, banki 7 (3 PL), budownictwo 6, holdingi/media 11, REIT 4, startupy 5.

## Spółki zwykłe (JUNK–EMERALD), 17 firm

| Symbol | Nazwa | Sektor | Poziom | Cena € | Uwagi |
|---|---|---|---|---|---|
| KRT | Kartoffelkönig | Żywność | JUNK | 4 | Chipsy i frytki; odpowiednik Miejskich Ziemniaków |
| WUR | Wurstwerk Meister | Żywność | JUNK | 6 | Kiełbasa na wynos |
| PXL | PixelPfusch | Technologia | JUNK | 3 | Studio „prawie gotowych” aplikacji |
| TRB | Trabbi Revival GmbH | Motoryzacja | JUNK | 5 | Odnawia stare auta, zawsze „w przyszłym kwartale” |
| SHN | Schnellheil Prothesen | Medycyna | JUNK | 7 | Protezy ekspresowe |
| BRZ | Brezelbäckerei Kraus | Żywność | BRONZE | 14 | Sieć piekarni, stabilna |
| FRB | Fahrradwerk Brandenburg | Przemysł | BRONZE | 18 | Rowery i e-rowery |
| KUK | Kuckucksuhr Digital | Technologia | BRONZE | 20 | Inteligentne zegary z kukułką |
| RHE | Rheinreisen | Turystyka | BRONZE | 17 | Rejsy po Renie |
| SPI | Spielkonsole Nord | Gaming | SILVER | 32 | Konsole i gry; cykl premier |
| LKO | Lufthansa-Kopie Luftfahrt | Transport i logistyka | SILVER | 28 | Linia lotnicza, wrażliwa na paliwo |
| WND | Windkraft Nordsee | Energia | SILVER | 44 | OZE, dotacje |
| SCH | Schwarzwald Kosmetik | Dobra konsumpcyjne | SILVER | 36 | Marka luksusowa „natury” |
| GLS | Glasbau Thüringen | Przemysł | GOLD | 62 | Szkło techniczne i fasady |
| ELK | Elektronik Köln | Technologia | GOLD | 90 | Sprzęt sieciowy |
| ROB | Roboterwerk Stuttgart | Technologia / Przemysł | PLATINUM | 150 | Roboty przemysłowe |
| QNT | Quantenfabrik Ulm | Technologia | EMERALD | 260 | Komputery kwantowe „do pokazania” |

## Spółki państwowe (tylko na giełdzie macierzystej), 5 firm

| Symbol | Nazwa | Sektor | Poziom | Cena € | Uwagi |
|---|---|---|---|---|---|
| EWB | Energiewerke Bund | Energia | SILVER | 24 | Państwowy koncern energetyczny |
| NTZ | Netzbetreiber Deutschland | Energia / Technologia | GOLD | 30 | Sieci przesyłowe |
| TKB | Telekom Bundeswerk | Technologia | GOLD | 20 | Państwowy operator telekomunikacyjny |
| KUR | Kernkraft Rückbau | Przemysł / Energia | GOLD | 26 | Wygaszanie elektrowni jądrowych (analogia do Państwowego Uranu) |
| FLU | Flughafen Brandenburg-Ewig | Usługi | SILVER | 15 | Lotnisko „w budowie od zawsze” |

## Uniwersytety i instytuty badawcze, 2 firmy

| Symbol | Nazwa | Sektor | Poziom | Cena € | Uwagi |
|---|---|---|---|---|---|
| FHI | Fraunhofer-Fälschung Institut | Badania | SILVER | 45 | Instytut stosowany, kontrakty z przemysłem |
| TUM | Technische Universität Minsterberg | Badania | SILVER | 38 | Uczelnia techniczna, spin-offy |

## Obronność, 3 firmy

| Symbol | Nazwa | Sektor | Poziom | Cena € | Uwagi |
|---|---|---|---|---|---|
| RHM | Rheinmetall-Rhetorik | Obronność | PLATINUM | 180 | Pojazdy opancerzone; rośnie z wydatkami na obronność |
| LPD | Leopard Dynamik | Obronność | PLATINUM | 160 | Czołgi i serwis |
| HKS | Heckler & Kochanek | Obronność | GOLD | 85 | Broń strzelecka |

## Banki, 4 firmy

| Symbol | Nazwa | Sektor | Poziom | Cena € | Uwagi |
|---|---|---|---|---|---|
| CBK | Commerzbank-Kommerz | Bankowość | SILVER | 18 | Bank komercyjny |
| SPK | Sparkasse Sparsam | Bankowość | BRONZE | 12 | Kasa oszczędnościowa, depozyty |
| VBK | Volksbank Vereinigt | Bankowość | SILVER | 16 | Bank spółdzielczy |
| IBK | Investmentbank Isar | Bankowość | GOLD | 55 | Bank inwestycyjny |

## Budownictwo, 3 firmy

| Symbol | Nazwa | Sektor | Poziom | Cena € | Uwagi |
|---|---|---|---|---|---|
| BAU | Bauhaus-Baumeister | Budowlany | GOLD | 70 | Generalny wykonawca |
| HOC | Hochtief-Höhenflug | Budowlany | PLATINUM | 120 | Wieżowce i mosty |
| SBH | Schnellbau Hessen | Budowlany | BRONZE | 15 | Mały wykonawca, opóźnienia |

## Holdingi, media, finanse, usługi (po 1–2), 4 firmy

| Symbol | Nazwa | Sektor | Poziom | Cena € | Uwagi |
|---|---|---|---|---|---|
| ALZ | Allianz-Alles-Versichert | Finanse | GOLD | 95 | Ubezpieczenia (jak Retax/WRONA, lecz ubezpieczeniowy) |
| BLD | Bildzeitung Boulevard | Media | SILVER | 22 | Tabloid, wpływa na nastroje |
| DBO | Deutsche Börsenhaus Holding | Finanse | SILVER | 50 | Operator giełdy i usług giełdowych |
| FRN | Frankfurter Finanzkontor | Finanse | GOLD | 60 | Holding inwestycyjny |

## REIT-y, 2 firmy

| Symbol | Nazwa | Sektor | Poziom | Cena € | Uwagi |
|---|---|---|---|---|---|
| VON | Vonovia-Wohnheim REIT | Nieruchomości | GOLD | 30 | Mieszkania na wynajem |
| BRO | Bürohochhaus REIT | Nieruchomości | GOLD | 34 | Biurowce Frankfurt/Berlin |

## Startupy (inkubator), uwaga

Polski rynek ma 5 startupów UNI w inkubatorze (LUXL, EVEP, BUDN, SUNO, VIZA) — są wspólne, więc niemieckich osobno nie dodajemy (lokalne nazwy opcjonalnie później).

## Podsumowanie liczb

| Grupa | Firm |
|---|---|
| Spółki zwykłe | 17 |
| Państwowe | 5 |
| Uczelnie/instytuty | 2 |
| Obronność | 3 |
| Banki | 4 |
| Budownictwo | 3 |
| Holdingi/media/finanse | 4 |
| REIT-y | 2 |
| **Razem** | **40** |

(40 zamiast „ok. 35”: wygodnie można skreślić ~5, np. TRB, KUK, FLU, SBH, ALZ.) Po zatwierdzeniu: DE = 17 + 40 = 57 firm, rynek macierzysty przy starcie z DE = 38 UNI + 57 = 95.

## Pytania do użytkownika

1. Czy nazwy-parodie są w porządku (zwłaszcza obronność i banki)? Wskaż do wymiany.
2. Czy skreślamy ~5 firm, żeby zostać blisko 35?
3. Czy niemieckie banki mają stanowić nowe banki komercyjne (bank w grze, z kredytami) czy tylko spółki giełdowe z sektora Bankowość (jak DGH, WAB w danych DE)? Domyślnie: tylko spółki giełdowe.
4. Spółki państwowe: pakiet państwa jak w danych krajów (`COUNTRY_RULES.statePct`).
