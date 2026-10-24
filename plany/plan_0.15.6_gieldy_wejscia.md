# Plan 0.15.6 „Giełdy wejścia” (po 0.15.5, przed 0.16.1)

Źródło: zgłoszenia z gry 2026-10-25 (`pomysly_na_kolejne_wersje.md`, sekcja 9.2). Plan pisany bez czytania kodu; stan rynków sprawdzamy w E0.

Cel: **wejście na giełdę ma znaczenie.** Główny parkiet (GPW) dostaje wyższe wymagania, NewHorizons staje się rynkiem dla spółek młodych i ryzykownych, a urząd antymonopolowy pilnuje koncentracji. To też **ostateczne domknięcie limitu spółek** po 0.15.4 (gra sama zaostrza politykę).

Czego uczy:
- **Rynki główne i alternatywne** (GPW i NewConnect): wymagania, ryzyko, płynność.
- **Ścieżka spółki:** startup → NewHorizons → główny parkiet (kategorie brąz–platyna) albo prywatna.
- **Nadzór nad koncentracją** (urząd antymonopolowy).

Kolejność: E0 → E1 → … → E7. **Commit po każdej części.** UI z komponentów 0.14.5; wygląd zleca czat designu. Zapis v15, pola opcjonalne.

## Punkt wyjścia (do sprawdzenia w E0)

- Operatorzy rynków w `finance.js`: GPW, XTD, PLU5, uśpiony EURONEXT; NewHorizons działa jako rynek (z zgłoszenia: spółka państwowa); poziomy giełd od śmieciowej do platynowej.
- Startupy (pula, 0.14.1), debiuty, spółki miejskie, kooperacje, koncerny.

## Części

| Część | Zakres |
|---|---|
| **E0** | Pomiar: wymagania debiutu, liczba spółek na rynkach, źródła spółek (z 0.15.4), kto może inwestować w NewHorizons |
| **E1** | **Wymagania wejścia na GPW** (kapitalizacja, zysk, wiek, wolny obrót), rosnące, gdy liczba spółek > 110; ścieżka „zawróć” (delisting do NewHorizons zamiast upadku) |
| **E2** | **NewHorizons:** niższe wymagania, większe ryzyko i zmienność, więcej spółek innowacyjnych i wczesnych; działa jako spółka państwowa (operator); **spółki atomowe tam nie wchodzą** (zasada dla 0.17.2); nie wszystkie boty i fundusze mogą w niej inwestować (reguły osobowości i mandatów) |
| **E3** | **Ścieżka startupów:** dwa progi finansowania (próg na główny parkiet z kategoriami brąz–platyna oraz niższy próg NewHorizons); jeśli się nie uda — niższy próg; przejście z NewHorizons na główny parkiet albo do firm prywatnych |
| **E4** | **Spółki miejskie** startują na NewHorizons (reguła z 0.15.4 P7: część zostaje miejska) |
| **E5** | **Urząd antymonopolowy:** poziomy; przeciwdziała koncentracji (np. 62 z 66 projektów w jednej firmie), kary i nakaz podziału; wzajemne ustalenia z przetargami (0.15.5) |
| **E6** | **Media-córka jako gazeta** (opcjonalnie): spółka zależna w Mediach wysyła graczowi maile, lekko przychylna matce, może kłamać o przeciwnikach; ryzyko zdemaskowania i kary (spójne z „czarnym PR” z 0.7) |
| **E7** | Interfejs, Akademia („Rynek główny i alternatywny”, „Antymonopol”), zapis, **kontrola**, raport `raporty/kontrola_0.15.6.md`, wiersz w mapie |

## Jak sprawdzimy (orientacyjnie)

| Miara | Cel |
|---|---|
| Spółki krajowe | 100–115 na koniec; > 125 nigdy dłużej niż 2 kw. |
| Udział spółek na NewHorizons | 15–30% |
| Startupy, które awansują na główny parkiet | 20–40%; upadki na NewHorizons 2–3× częstsze |
| Interwencje antymonopolowe | 0–2 na 20 lat |
| GIG, marża | ±1 pp / ±0,5 pp względem bazy 0.15.5 |
| Zapis | +≤ 0,3% |
| Niezmienniki, ujemna gotówka, wyjątki JS | 0 |

## Ryzyka

- **Zmiana GIG** (młodsze spółki mniej stabilne, słabe znikają z GPW) → pomiar i strojenie wymagań.
- **Boty omijają NewHorizons** → płynność zbyt niska; minimalny popyt (market maker).
- **Media-córka** wprowadza fałszywe informacje → oznaczenie źródła w mailu, możliwość zdemaskowania.
- **Rozmiar wersji** → E6 opcjonalne, do przesunięcia.

## Decyzje do podjęcia

1. Czy NewHorizons jest operatorem państwowym (jak w zgłoszeniu), czy prywatnym?
2. Czy startup ma jedną ścieżkę (główny parkiet albo NewHorizons), czy obie naraz?
3. Czy E6 (media-córka) wchodzi teraz, czy do osobnej małej wersji?

## Zlecenie dla czatu designu (przed E7)

1. Widok rynków (GPW, NewHorizons) i ścieżki spółki (oś: startup → NewHorizons → parkiet).
2. Karta wymagań debiutu; okno interwencji urzędu antymonopolowego.
3. **Mapa spółek jako drzewo genealogiczne** (jeśli nie zrobiona w 0.15.4).
4. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.
