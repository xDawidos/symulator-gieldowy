# Balans 0.17.1: lista strojeń i błędów (T4)

Źródła: duża seria T1 i presety T2 (`kontrola_0.17.1.md`), gra ręczna T3 (`gra_reczna_0.17.1.md`). Do akceptacji użytkownika. Przed decyzją nic nie stroję, poza oczywistymi błędami.

## Naprawione od razu (oczywiste błędy)

| # | Błąd | Przyczyna | Poprawka |
|---|---|---|---|
| B1 | JU klientów ≠ JU funduszu (`dzwignia`, 1 gra z 20) | przy umorzeniu bez gotówki resztka udziałów < 0,5 znikała razem z klientem | klient znika dopiero bez udziałów (a109f50, test) |
| B2 | GIG po wczytaniu zapisu liczy się od zera (gra ręczna: 2874 → 611) | poziomów indeksów nie było w zapisie, a okres funduszu porównywał się ze starym poziomem, więc indeks w okresie wychodził ok. −79% | poziomy indeksów w zapisie, stary zapis bierze poziom z tygodni okresu funduszu (4ea994d, test) |

## Strojenia do decyzji

| # | Priorytet | Co | Pomiar | Przyczyna | Koszt |
|---|---|---|---|---|---|
| S1 | wysoki | Fundusz = GIG: udziały | −5,8%/rok (6,5 roku), −3,4%/rok (20 lat); w ±3% tylko 4/20 gier. Zaufanie: mediana 45, w 45–55 tylko 5/20 | w 0.16 było +1,1%/rok, więc to pogorszenie z 0.16.x–0.17.x; przyczyny nie szukałem (napływ, odpływ, zaufanie) | średni: diagnoza przepływów klientów i 2 serie po 20 gier |
| S2 | średni | GIG 20 lat | 13,5% (cel 8–11%), bez zmian od 0.16.1 | odziedziczone od 0.15.1 (w 0.15.3: 11,4%); w długiej grze wyceny rosną szybciej niż zyski | duży: diagnoza i serie 20-letnie (ok. 30 min każda) |
| S3 | średni | Koalicja Rynkowa | 64–70% wygranych, reelekcja 13–39% (baza 0.17.2: 20%) | wagi klas (`CLASS_VOTE`): klasa średnia i wyższe głosują na nią w 42–78% | mały w kodzie (wagi albo większa kara za kadencje), potem seria, bo partie zmieniają ustawy |
| S4 | średni | Zanieczyszczenie w długiej grze | 48–52 po 6,5 roku (cel ok. 55: OK), ale 61–72 po 20 latach, maks. 99,9; smog 5 razy na 20 lat | elastyczność 3,3 liczona od emisji pierwszego kwartału; emisje rosną przez całą grę | mały: górny cel albo wygaszanie elastyczności, seria 20-letnia |
| S5 | niski | KrzeUraFos4 (Chemia) | 46% emisji kraju na starcie, więcej niż Tauron (35%) | emisje przemysłu idą za przychodem, a to największa spółka emitująca | mały: emisyjność według podsektora albo limit udziału jednej spółki |
| S6 | niski | Dźwignia ≤ 1:3 | niezmierzona: preset `dzwignia` używa 1:10 (upadków 0, 3,25 margin call na grę) | cel planu dotyczy 1:3 | mały: druga seria presetu przy 1:3 |

**Spełnione bez strojenia:** niezmienniki i błędy JS 0 (poza B1), premia rynku 20 lat −1,6%, linie kryzysu 1,1 na 20 lat, spółki krajowe maks. 89, pewny zysk +2,2 pp ponad lokatę, zapis z 10 krajami 2,59 mln znaków, prąd i blackouty, wpłaty z obietnic 3,4% aktywów.

## Teksty i spójność widoków (z gry ręcznej)

| # | Priorytet | Uwaga | Koszt |
|---|---|---|---|
| U1 | średni | Okno giganta: „Kupisz je w oknie Kantor → Obce”, a jest Internet → Kantory24 → Obce | 1 linia |
| U2 | średni | Rynki zagraniczne otwierają się na kraju bez biletu (Szwajcaria), „Kup” wyłączone bez wyjaśnienia | mały |
| U3 | średni | Komunikat „nie daje dostępu do rynku PRV”: kod zamiast nazwy rynku | 1 linia |
| U4 | niski | Sekcja Energia: „Elektrownie Elektrownia SA”, „170 tona”, blok 18 MW jako „+0,0 GW” | mały |
| U5 | niski | Tabela towarów: kolumna „Dźwignia 1:10”, formularz dla gazu najwyżej 1:3 | mały |
| U6 | niski | Liczby z kropką: „BC podnosi stopy do 1.02%”, „opłaty ×1.5”; kierunek nagłówka o stopach do sprawdzenia | mały |
| U7 | niski | Okno Państwa: pasek „Stopa bazowa 1,62%”, karta „Stopa referencyjna 1,02%”; niepotwierdzone | do sprawdzenia |
| U8 | niski | W trakcie scenki startowej lecą powiadomienia o badaniach spółek i inwestycjach banków | mały |
| U9 | do sprawdzenia | Zarażenie kryzysem bankowym: premie DE/CH/CZ/JP −11…−13% przy −6% w kraju źródłowym | diagnoza |

## Propozycja kolejności (T5)

1. U1–U3 i U4–U6 (teksty, bez wpływu na balans, bez serii).
2. S1 (fundusz = GIG), bo to sedno gry, z mini-pomiarem.
3. S3 i S4 razem w jednej serii (partie i środowisko się łączą przez Zielonych).
4. S5, S6.
5. S2 zostawić na 0.18.0 albo osobną diagnozę, bo jest odziedziczone i kosztowne.

## Sprawdzenie U5, U7, U9 (T5)

| # | Wynik | Co dalej |
|---|---|---|
| U5 | nie błąd: dźwignia zależy od towaru (`COMMODITY_MARKET.leverage`: złoto 1:10, gaz 1:3); tabela pokazuje dźwignię towaru, formularz też | bez zmian |
| U7 | nie błąd: pasek i karta czytają tę samą `centralBank.baseInterestRate` w jednym odświeżeniu; na zrzucie były dwa różne odświeżenia (stopa zmieniła się w kryzysie) | bez zmian |
| U9 | strojenie, nie błąd: premia za granicą dąży do `rho × cel kraju źródłowego + (1 − rho) × własna`, a w kraju źródłowym premia dopiero idzie do celu (wygładzenie). Za granicą skok przychodzi od razu, więc chwilowo jest głębszy niż u źródła | propozycja: za granicą brać bieżącą premię kraju źródłowego (`home.premium`) zamiast jego celu (`countries.js:177, 195`); do decyzji, bez serii w 0.17.1 |
