# Plan 0.17.1 „Wielkie testy rozgrywki i balans” (po 0.17 „Surowce i transport”, przed 0.17.2 i 0.18)

Cel: po zamknięciu serii 0.15.4–0.17 (nowe rynki, waluty, surowce, transport, forex, kontrakty) **sprawdzamy całą grę naraz**, zanim dojdą łańcuchy produkcyjne i energia. Wersja nie dodaje mechanik — tylko mierzy, stroi i naprawia.

Czego uczy projekt: że kolejne warstwy (waluty, kraje, towary, dźwignia) razem nie psują gry, którą każda osobno zmierzono.

Kolejność: T0 → T1 → … → T7. **Commit po każdej części.** Zmiany w kodzie tylko jako strojenie i poprawki znalezionych błędów.

## Zakres pomiaru (decyzja 2026-10-25)

**Duża seria przebiegów + presety graczy + scenariusze ręczne.**

### Duża seria (×200)

- **50 gier × 6,5 roku** bez presetu i **20 gier × 20 lat**; dodatkowo **`fundusz-gig`** (20 × 6,5 roku, 5 × 20 lat).
- Wszystkie miary z kontroli końcowych 0.15.x i 0.16 (GIG, marża, zapis, czas kroku, niezmienniki, premia rynku, linie kryzysu, kraje, boty).

### Presety graczy

| Preset | Co robi | Co sprawdza |
|---|---|---|
| `bierny` | nie gra | baza: GIG, spółki, limity |
| `fundusz-gig` | fundusz równy indeksowi | udziały, zaufanie, napływ (G0b z 0.16.1) |
| `gracz-aktywny` | kupuje akcje, kampanie, IR, VIP | mandaty, lock-up, relacje |
| `dźwignia` | forex i zastaw z maksymalną dźwignią | margin call, ujemna gotówka, upadek funduszu |
| `forex-towary` | handel walutami i kontraktami towarowymi | pewny zysk (exploit), podatek, depozyt |
| `kryzys` | scenariusze 5 linii + zarażanie krajów + szok podażowy | spadki GIG, odbicie, upadki, zachowanie funduszu |
| `kraje` | dołączenie wszystkich krajów w 1.–3. roku | rozmiar zapisu, czas kroku, boty zagraniczne |
| `wejscia` | debiuty na NewHorizons i GPW, przetargi | limit spółek, koncentracja |

### Scenariusze do ręcznego zagrania (godzina gry ×1, karta obserwacji)

1. Start nowej gry → pierwszy kantor i spekulacja walutami.
2. Gigant wkracza na scenę (GDR) → zakup kwitów.
3. Lotnisko, bilet na rynek DE, zakup spółki zagranicznej.
4. Kryzys bankowy z zarażaniem kraju obcego.
5. Kontrakt towarowy z dźwignią i margin call.
6. Wydarzenie połączenia giełd (wariant B).
7. Zapis i wczytanie w trakcie linii kryzysu.

**Karta obserwacji:** krok, czego oczekiwałem, co się stało, zrzut, ocena (błąd / dziwne / dobre). Wynik zbiera się do `raporty/gra_reczna_0.17.1.md`.

## Części

| Część | Zakres |
|---|---|
| **T0** | Przygotowanie: nowe presety i sondy w `tests/przebiegi.html`, lista miar, karta obserwacji |
| **T1** | Duża seria bez presetu i `fundusz-gig`; porównanie z bazami 0.15.3, 0.16 i 0.17 |
| **T2** | Presety `dźwignia`, `forex-towary`, `kryzys`, `kraje`, `wejscia`, `gracz-aktywny` |
| **T3** | Gra ręczna: scenariusze 1–7 z karty obserwacji |
| **T4** | **Lista strojeń i błędów** (raport `raporty/balans_0.17.1.md`): priorytet, przyczyna, koszt; decyzje użytkownika |
| **T5** | Strojenie i poprawki (po commicie na pozycję; po każdej mini-pomiar ×200) |
| **T6** | Powtórna seria po strojeniu |
| **T7** | Raport końcowy `raporty/kontrola_0.17.1.md`, wiersz w mapie; decyzja o wejściu 0.17.2 / 0.18 |

## Jak sprawdzimy

| Miara | Cel |
|---|---|
| Niezmienniki, ujemna gotówka, wyjątki JS, pieniądze znikąd | 0 we wszystkich seriach |
| GIG (20 lat) | mediana 8–11%/rok |
| Średnia premia rynku (20 lat) | −3…+3% |
| Fundusz = GIG | udziały ±3%/rok, zaufanie 45–55 |
| Pewny zysk (kantor, forex, kontrakty) | ≤ lokata + 4–6 pp/rok dla strategii mechanicznych |
| Dźwignia | brak upadku funduszu bez zlecenia przy dźwigni ≤ 1:3; margin call zgodnie z regułą |
| Zapis (6,5 roku z 3–4 krajami) | < 3 MB; czas zapisu i wczytania w celach z 0.14.3 |
| Czas kroku | w limitach planów 0.16.x i 0.17 |
| Linie kryzysu | 1–2 na 20 lat; kierunki stóp i zarażanie zgodnie z planami |
| Spółki krajowe | ≤ 115; > 125 nigdy dłużej niż 2 kw. |
| Gra ręczna | 0 błędów blokujących w 7 scenariuszach |

## Ryzyka

- **Odkrycie zbyt dużej liczby problemów** → T4 priorytetyzuje; mniejsze trafiają do 0.17.2 lub osobnej poprawki.
- **Strojenie jednego elementu psuje inny** → mini-pomiar po każdej zmianie, wspólna baza.
- **Czas na serie** (50 × 6,5 roku, 20 × 20 lat) → uruchamianie w tle, wyniki do pliku.

## Decyzje (podjęte 2026-10-25)

1. **Wersja zamyka się po liście strojeń zaakceptowanej przez użytkownika;** mniejsze odchylenia mogą przejść do 0.17.2.
2. **Gra ręczna jest obowiązkowa** przed 0.17.2 (0 błędów blokujących w 7 scenariuszach).
3. Do T7 należy sprawdzenie, że kontrakty towarowe są zamknięte za umiejętnością „Mistrz Opcji” (decyzja 0.17).

## Zlecenie dla czatu designu

Brak nowych ekranów. Jeśli gra ręczna ujawni problemy czytelności — zgłoszenia do osobnej tury 0.17.2.
