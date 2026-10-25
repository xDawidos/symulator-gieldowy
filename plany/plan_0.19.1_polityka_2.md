# Plan 0.19.1 „Polityka 2” (szkic zakresu, po 0.19 „Handel światowy”)

Źródło: zgłoszenia z gry 2026-10-25 (`pomysly_na_kolejne_wersje.md`, sekcja 9.2) oraz notatki wersji 0.11 z `roadmap.txt`. **Pierwszy krok: sprawdzić, co z listy już działa w 0.11–0.13** (partie, populacja, ustawy, sponsoring, lobbing) i skreślić duplikaty.

Cel: polityka dotyczy wszystkich otwartych krajów, partie się zmieniają, a gracz ma więcej narzędzi wpływu.

## Zakres

| Część | Zakres |
|---|---|
| **O0** | Inwentaryzacja istniejących mechanik; baza 0.19.1 |
| **O1** | **Eventy dla państw obcych** (prezydent idiota, zamknięcie granicy, ucieczka ludzi, dofinansowania i inne), zgodnie ze stałym profilem kraju (0.16) |
| **O2** | **Partie:** nowe i zmieniające się z czasem (populistyczna, liberalna, zieloni, centrum, socjaldemokracja, libertariańska, anarchistyczna, komunistyczna, technokraci); 6 partii w kraju startowym, 4 w innych; **6 eventów na typ partii**; program polityczny i ekonomiczny wpływa na ceny akcji, spółki państwowe, bank i handel |
| **O3** | **Sponsoring** wyborów (+5% za każdy) i lobbing sektorowy (np. podatek cukrowy → Żywność); więcej polityk wzmacniających i osłabiających spółki państwa |
| **O4** | **Nepotyzm poziomy 2–4:** zasugerowanie spółce państwowej sprzedaży akcji funduszowi gracza; poufne informacje o ruchach rządu (6. zmysł na spółkach państwowych nie działa); sugerowanie inwestycji |
| **O5** | **Nowe urzędy** (programy socjalne już w 0.15.4 P7), spójne z doktrynami handlowymi z 0.19 |
| **O6** | Interfejs, Akademia, zapis, kontrola, raport `raporty/kontrola_0.19.1.md` |

**Wielkość:** L. **Zależności:** 0.19 (doktryny handlowe zależne od partii), 0.16 (kraje), 0.13 (partie i ustawy), 0.17.2 (energia: partia wybiera typ energii).

## Główne ryzyka

- **Balans polityki a kalibracja GIG** (eventy zmieniają ceny) → pomiar ±1 pp.
- **Zakres zbliżony do wersji 0.13** — przed budową inwentaryzacja, żeby nie powielać.
- **Za dużo eventów** → limit ≤ 3 maile na kwartał (miara z 0.13).

## Decyzje (podjęte 2026-10-25)

1. **Partie w krajach obcych: stały profil z eventami** i zmianami programu (bez pełnej symulacji wyborów).
2. **Programy socjalne wchodzą wcześniej, w 0.15.4 P7;** tu zostają nowe urzędy (O5).

## Decyzje jeszcze otwarte

1. Który z poziomów Nepotyzmu (O4) wchodzi pierwszy?

## Zlecenie dla czatu designu

1. Karta kraju z partią rządzącą i programem; panel sponsoringu i lobbingu.
2. Poziomy Nepotyzmu w drzewku umiejętności.
3. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem.
