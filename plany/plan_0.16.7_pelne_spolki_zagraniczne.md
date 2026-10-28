# Plan 0.16.7 „Pełne spółki zagraniczne” (szkic zakresu; po 0.16.6)

Źródło: decyzja użytkownika z 2026-10-28: spółki zagraniczne nie mogą być uproszczone, mają działać jak spółki z giełdy bazowej. Dziś (0.16.2–0.16.4) leżą poza `stocks`, bez bilansu i dywidend, zapis ≈ 210 B na spółkę. Szkic: przed startem przeczytać `countries*.js`, `companies.js`, `stocks`-pętlę kroku i `state.js`.

## Cel

Spółka zagraniczna ma tę samą mechanikę co krajowa: bilans i wyniki, raporty, dywidendy, splity (0.15.4), sektory i cykl koniunktury, prezes, kupowanie przez fundusze i boty, wpływ kryzysów. Różni ją tylko kraj: waluta (`toPln`), godziny sesji, podatek, regulacje, profil gospodarki.

## Zakres

### F0. Inwentaryzacja i decyzja o architekturze (raport przed kodem)
- Co dziś robi spółka krajowa w kroku kwartału (lista funkcji z grafu: `companies.js`, `reports`, dywidendy, splity, prezesi, przejęcia) i które z tych funkcji zakładają jedną giełdę/PLN.
- Wariant A: jedna wspólna lista spółek z polem `country`/`market` (spółka zagraniczna to zwykła spółka z rynkiem). Wariant B: osobne listy z tą samą funkcją kroku. Rekomendacja robocza: A (jedno źródło prawdy), o ile `toPln` i wspólne API posiadaczy (zob. 0.16.6 S1.2) to udźwigną.
- Pomiar kosztu: czas kroku i zapis przy N spółek krajowych + M zagranicznych.

### F1. Wspólny model spółki
- Spółki z DE/US/CZ/SE/CH/FR/Azji migrują do pełnego modelu; stary uproszczony zapis zostaje tylko do migracji (zapis v17).
- Waluta spółki, kurs i `toPln` w bilansie i dywidendzie; podatek u źródła; godziny sesji zachowane.

### F2. Mechaniki na pełnych spółkach
- Raporty, dywidendy, splity, prezesi (0.16.3 G15), kryzysy (kontagion z 0.16.2), spółki specjalne, urzędy nadzoru kraju, przejęcia (boty i gracz) — wszystko na wspólnym kodzie, bez gałęzi „zagraniczna”.
- Spółki państwowe nadal tylko na GPW (decyzja 5 z 0.16.6).

### F3. Limity spółek
- Limit spółek na giełdę zagraniczną podnieść względem dzisiejszego (docelowo zbliżony do krajowego, z ewentualnym łagodnym podniesieniem bazy kosztem pomiaru), parametry w jednym miejscu; limit różnorodności sektorów (0.15.4) liczony na giełdę.

### F4. Wydajność i zapis
- Budżet: czas kroku ≤ +X% względem 0.16.4, zapis ≤ +Y% (liczby ustalić w F0). Jeśli budżet przekroczony: aktualizacja spółek zagranicznych co kwartał z leniwym przeliczaniem nieobserwowanych.

### F5. Testy i kontrola
- Testy: parytet (ta sama spółka w kraju A i B daje te same ścieżki z dokładnością do kursu), migracja zapisu, niezmienniki, brak zawieszeń.
- Przebiegi ×200: GIG ±1 pp względem bazy po 0.16.6, zapis i czas kroku w budżecie. Raport `kontrola_0.16.7.md`.

## Ryzyka i otwarte pytania

1. To największa zmiana po 0.16.2 — prawdopodobny podział na F0–F2 (0.16.7) i F3–F5 (0.16.8).
2. Przy N×M spółek rośnie czas kroku; zawieszanie przebiegów z 0.16.3 musi być wyjaśnione wcześniej (zadanie sesji 0.16.4).
3. Zależność od 0.16.6 S0 (kraj startowy): ujednolicenie spółek krajowych i zagranicznych ułatwia S0 — rozważyć wykonanie F0–F1 przed S0.
