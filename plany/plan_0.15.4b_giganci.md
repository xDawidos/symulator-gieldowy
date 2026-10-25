# Plan 0.15.4b „Giganci na starcie” (osobno od 0.15.4; przed 0.16.1 G0)

Źródło: kontrola 0.15.4 (`raporty/kontrola_0.15.4.md`, uwaga 4): cel „Orzeł Telekom w górnej 3 w ≤ 30% gier 20-letnich, żadna spółka > 30%” jest nieosiągalny, dopóki o trzy miejsca walczy osiem gigantów. Po 0.15.4: ORT 6/10 gier, BOR 4/10, BEW 4/10 (baza: 8/11, 7/11, 6/11).

## Punkt wyjścia (dane z `initialStocks`)
Kapitalizacje startowe (mld zł): ORT 3,6 · BOR 3,0 · KUP 2,3 · NRB 2,0 · BEW 1,9 · CTX 1,85 · UNP 1,5 · HOR 1,1. Reszta rynku ≤ 0,1 mld (BKS 100 mln, SKP 95 mln…). Osiem gigantów = 15–40× większe od dziewiątej spółki, więc górna trójka to zawsze ich podzbiór; losowa kolejność (0.15.4: czynnik 0,6–1,6) i hamulce wzrostu skróciły dominację, ale nie dały miejsca spółkom spoza ósemki.

## Cel i miary
- Żaden gigant w górnej 3 na końcu w > 40% gier 20-letnich (przy 8 + rosnących challengerach: oczekiwane ≈ 25–35%).
- Co najmniej 1 spółka spoza dzisiejszej ósemki w górnej 3 w ≥ 30% gier.
- GIG ±1 pp i marża ±0,5 pp względem bazy 0.15.3 **na ≥ 30 grach 20-letnich** (szum jest ±2 pp przy 10 grach); spółki w 1–3000 zł ≥ 99%.

## Warianty (do wyboru przez użytkownika po pomiarze P0)
A. **Spłaszczenie startu:** kapitalizacje gigantów × 0,35–0,6 (np. ORT 1,6 mld), losowo ±30%; wolne miejsce zajmują spółki z drugiego szczebla (Złota/Platynowa). Zmienia GIG na starcie (wagi ograniczone do 10%, więc mało).
B. **Podniesienie drugiego szczebla:** 8–10 spółek ze Złotej/Platynowej × 3–5 do 0,3–0,5 mld, giganci bez zmian; liczba giełd elitarnych bez zmian.
C. **Mieszany (zalecany do pomiaru):** giganci × 0,6, drugi szczebel × 2,5, losowa kolejność jak w 0.15.4.
D. **Tylko hamulce:** zaostrzyć hamulec wzrostu (0,15 → 0,25 pp/pp) i próg 10% → 8%; bez zmiany startu (najmniej inwazyjny, ale nie rozwiązuje ósemki).

## Części
- **G0 Pomiar:** presety w `tests/przebiegi.html`, które mnożą kapitalizacje startowe (parametry A–D); 30 gier 20-letnich na wariant, rozkład górnej 3 na końcu i w czasie, GIG, marża, liczba debiutów/wydzieleń. Raport `raporty/pomiar_giganci_0.15.4b.md`.
- **G1 Dane startowe:** zmiana `initialStocks` (ceny, liczba akcji) i `randomizeStartingGiants` wg wybranego wariantu; test: rozkład kapitalizacji, kolejność, wpisy w `exchanges` (giełdy elitarne przydzielane wg rankingu).
- **G2 Kalibracja:** kalibracja fundamentów (`initializeFundamentals`) dla nowych cen; dopasowanie wag GIG (cap 10%); sprawdzenie GIG ±1 pp na 30 grach.
- **G3 Kontrola:** pomiar końcowy, wiersz w mapie, zapis v15 bez zmiany (zmieniają się tylko dane nowej gry; stare zapisy bez zmian).

## Ryzyka
- GIG i trend (cel 8–10% z 0.15 H1a; po 0.15.4 po 20 latach ≈ 13,8%): zmiana startu przesunie wagi indeksu; mierzyć na ≥ 30 grach.
- Przypisanie giełd elitarnych (Rubin/Szmaragd/Diament wg rankingu): mniejsze giganty mogą zmienić tempo awansów gracza — sprawdzić progi dostępu.
- Testy zakładają stałe symbole (`ORT`, `NRB`, `BEW` w `initialStocks`): zmieniać ceny i akcje, nie symbole.

## Decyzje do podjęcia
1. Wariant (A/B/C/D) — rekomendacja: C po pomiarze G0.
2. Czy zmiana dotyczy tylko nowych gier (tak, zalecane).
