# Kontrola 0.16.3 „Europa i połączone giełdy”

Stan: G11–G15 zrobione, G16 (UI, zapis, Akademia) wpięte w G12/G15, testy 798/798 (`node plany/design/narzedzia/run_tests.mjs`).

## Zrobione
- G11: Szwecja, Szwajcaria, Francja (spółki, operatorzy SSE/SWX/CAC, rho), start w FR i TW.
- G12: połączenia giełd (merged / intl / taken), szansa 1% × 2 co kwartał do 32%, od Q8, odstęp 2 kw.; wariant B (opłata ×1,5, spadek 5–15%); ×3 po lotnisku albo porcie; wspólnota europejska (≥3 z DE/CZ/SE/CH/FR).
- G13: spółki specjalne i prezesi krajów (puszka, vintage, żaby, kakao, Waschmabank + Swiss Leaks).
- G14: boty Gutzwiller, Wiking, europejski, Bayer; polskie boty Graham i Wilk (pump and dump) na własnej logice.
- G15: nadzór i progi wezwania 66/75/90%, limit zakupu gracza i botów, karta kraju z nadzorem.
- Dodatkowo (zgłoszenia z gry): Rybołówstwo, cykle sektorów za umiejętnością, nerf pieniędzy prywatnych, Włoska Giełda.

## Pominięte i problemy
- Do 0.16.6 (decyzja): gotówka Waschmabanku poza nadzorem; obowiązkowe wezwanie i kary przy progu; kupowanie walut przez Bayera; dźwignia Wilka; złota akcja (Gutzwiller „władza korony”).
- Usunięte decyzją: „siła inwestorów mniejszościowych”.
- Wariant B: waluta rozliczenia to tylko opis fabularny.
- Spółki państwowe zostają na GPW (połączenia nie przenoszą polskich spółek).

## Niezmierzone
- Symulacja `przebiegi` (3 gry): zawiesiła się na kw. 13/27 w przebiegu 1 (wcześniej 20 gier też), przerwana — brak liczb o częstości zdarzeń, wpływie GIG, rozmiarze zapisu i czasie kroku.
- Brak sprawdzenia wizualnego UI i weryfikacji w przeglądarce (tylko testy).
- Zawieszenie symulacji do zbadania (czy to pętla w nowym kodzie, czy narzędzie).

## Uzupełnienie liczbami (0.16.4, 12 gier × 27 kw.)
- Przebiegi nie zawieszają się (przyczyna: okno połączenia pauzowało grę; naprawione w 0.16.4). Przy 10 krajach: połączenia giełd 2–4 na grę (intl 14, merged 16, taken 6 w 12 grach), wspólnota europejska 12/12.
- Zapis krajów ≈ 30 tys. znaków (max 32 tys.); czas kroku 1362 ms/kw. z krajami vs 1231 bez; niezmienniki 0 naruszeń.
- Wpływ na GIG: −2,9 pp (kraje-10 vs bez krajów, 8,8% vs 11,7%), powtórzone; ponad cel ±1 pp, przyczyna nieustalona — szczegóły w kontrola_0.16.4.md.
