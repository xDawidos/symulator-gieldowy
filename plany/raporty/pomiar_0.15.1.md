# Pomiar bazowy 0.15.1 „Sztuka przejęć” (M0, 2026-10-21)

- **Kod:** `13ef011` = 0.15.0.1 po decyzjach użytkownika (`9ce625c`) + sondy M0 (bez zmian zachowania gry).
- **Przebiegi** `tests/przebiegi.html`, ×200:
  - 10 gier × 6,5 roku bez presetu (`m0np`);
  - 3 gry × 6,5 roku z presetem `wiekszosciowiec` (`m0b2`) — fundusz ma na starcie 52% akcji 2 spółek średniej kapitalizacji.
- **Sondy M0:** przejęcia (start, zerwanie z przyczyną, rozliczenie), premia, kurs celu przed / przy ogłoszeniu / co kwartał / na końcu, sonda `arbitraz` (wirtualny zakup celu 12 tików po ogłoszeniu do rozliczenia albo zerwania, wynik vs GIG), udziały funduszu ≥ 33% i > 50%.

## Wyniki

| Miara | Bez presetu (10 gier) | `wiekszosciowiec` (3 gry) |
|---|---|---|
| Przejęcia rozpoczęte na grę | **5,4** | 5,3 |
| Rozliczone / zerwane / w toku na koniec | 34 / 3 / 17 | 12 / 1 / 3 |
| Zerwane (z zakończonych) | **8%** (pigułka 1, antymonopol 2) | 8% |
| Premia oferty (mediana) | 30% | 34% |
| Skok kursu celu przy ogłoszeniu (mediana) | **0%** (kurs nie reagował na ofertę) | 0% |
| „Spread” dzień po ogłoszeniu (1 − kurs / oferta, mediana) | 24% (to w praktyce cała premia) | 26% |
| Kurs inicjatora przy ogłoszeniu (mediana) | −0,6% | −0,9% |
| Sonda `arbitraz`: wynik ponad GIG na transakcję | **+15,1%** | +20,2% |
| Sonda `arbitraz`: transakcje ze stratą | **2,7%** | 0% |
| Przejęcia spółek z udziałem funduszu ≥ 20% | 0 | — |

## Wnioski dla M1–M2

1. **Arbitraż był pewnym zyskiem**: kurs celu nie reagował na ogłoszenie, w etapie 5 skakał o 10%, a na końcu akcje wykupywano po cenie oferty. Kupno każdego celu po ogłoszeniu dawało średnio +15–20% ponad GIG prawie bez ryzyka (2,7% strat). M1 ma to zamienić w spread z ryzykiem.
2. **Zerwań jest mało (8%)** — cel planu 10–25%; M3 (badanie kupującego) dokłada zerwania przy oszustwach.
3. **Przejęcia trwają długo** (ok. 7 kwartałów, w toku na koniec gry 17 z 54) — przy GIG ok. 11%/rok czas trwania transakcji ma duży koszt alternatywny dla arbitrażysty.
4. **Preset `wiekszosciowiec`** zatrzymywał grę: okno wezwania (fundusz ≥ 20% celu) pauzuje grę, a w przebiegu nikt go nie zamyka. Poprawka sondy `13ef011`: w przebiegu okna decyzji nie pauzują, komplikacje rozstrzygane automatycznie („kontynuuj mimo wszystko”).
