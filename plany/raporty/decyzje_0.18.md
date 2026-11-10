# Decyzje czatu kodu w 0.18 (praca autonomiczna)

Czat realizujący podejmuje decyzje sam, zgodnie z planem `plan_0.18_lancuchy_produkcyjne.md`, i notuje je tutaj. Decyzje diametralnie zmieniające grę są w sekcji „Do decyzji użytkownika” na końcu, z opcjami i rekomendacją.

## 0.18.0

| # | Część | Decyzja | Uzasadnienie |
|---|---|---|---|
| D1 | R0 | Lista łączenia jak w `spis_kodu_pl_obce_0.18.0.md`: łączymy wiersz i szufladę (Z3), poziom z ceny (R3), pulę prezesów (R4), odczyt podsektora dla grafu (P2). Modele ceny, posiadania, kupna, dywidendy i upadłości zostają osobne | To, co gracz widzi jako jeden ekran, i to, co liczy graf, musi być wspólne. Modele różnią się z założenia (waluta, bilet, nadzór); ich połączenie to przepisanie `countries.js`, koszt XL bez zysku dla grafu |
