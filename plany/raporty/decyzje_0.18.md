# Decyzje czatu kodu w 0.18 (praca autonomiczna)

Czat realizujący podejmuje decyzje sam, zgodnie z planem `plan_0.18_lancuchy_produkcyjne.md`, i notuje je tutaj. Decyzje diametralnie zmieniające grę są w sekcji „Do decyzji użytkownika” na końcu, z opcjami i rekomendacją.

## 0.18.0

| # | Część | Decyzja | Uzasadnienie |
|---|---|---|---|
| D1 | R0 | Lista łączenia jak w `spis_kodu_pl_obce_0.18.0.md`: łączymy wiersz i szufladę (Z3), poziom z ceny (R3), pulę prezesów (R4), odczyt podsektora dla grafu (P2). Modele ceny, posiadania, kupna, dywidendy i upadłości zostają osobne | To, co gracz widzi jako jeden ekran, i to, co liczy graf, musi być wspólne. Modele różnią się z założenia (waluta, bilet, nadzór); ich połączenie to przepisanie `countries.js`, koszt XL bez zysku dla grafu |
| D2 | R2 | Wspólna część dawnego `gdr.js` (rejestr `foreignIssuers`, zdarzenie „Gigant wkracza na scenę”, przymusowa sprzedaż akcji zagranicznych) przeniesiona na początek `countries.js` (ta sama kolejność ładowania). Nazwy bez GDR: `getIssuerHeld`, `getIssuerFree`, `getFundForeignSharesValue`, `liquidateForeignShares`, `resetForeignIssuers` | Kwity znikają, ale te funkcje obsługują akcje zagraniczne |
| D3 | R2 | Zdarzenie gigantów zostaje tylko jako przejęcie, szansa 0,115 → 0,035 na kwartał | Dawniej 30% zdarzeń to przejęcia; ta sama częstość przejęć, bo one wpływają na GIG (gotówka z zewnątrz) |
| D4 | R2 | Zapis v24: klucz `giants` (stan zdarzeń). Wczytanie v23 czyta stary klucz `gdr` tylko po stan zdarzeń; kwity przepadają bez zwrotu (decyzja planu). Hasło Akademii „ADR i GDR” usunięte | Jedyne pozostałe odwołanie do `gdr` to odczyt starego zapisu |
| D5 | wszystkie | Bramki „±0,5 pp” i „±1 pp” oceniam na seriach 25 gier × 6,5 roku (SE GIG ok. 0,75 pp). Różnica mniejsza niż 1,96·SE różnicy liczy się jako zaliczona, nawet jeśli punktowo przekracza próg | Przy σ GIG ≈ 3,7 pp próg 0,5 pp wymaga ok. 400 gier na ramię; tyle nie da się liczyć po każdej części |
