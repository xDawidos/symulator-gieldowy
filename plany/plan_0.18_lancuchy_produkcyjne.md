# Plan 0.18 „Łańcuchy produkcyjne” (szkic zakresu, po 0.17 „Surowce i transport”; przed 0.19 „Handel światowy”)

Cel: gospodarka gry ma **pełny graf ogniw** (decyzja użytkownika 2026-10-25): wydobycie → hutnictwo → fabryka → spedycja → dystrybucja → konsumpcja. Załamanie jednego ogniwa (strajk w kopalni, blokada portu, brak paliwa) wywołuje szok podażowy w kolejnych.

Czego uczy:
- **Łańcuch wartości:** skąd bierze się cena samochodu, statku, chleba.
- **Szok podażowy i efekt byka (bullwhip):** drobne zakłócenie na początku łańcucha rośnie na końcu.
- **Zapasy i magazyny:** bufor kontra koszt trzymania.
- **Substytucja i badania (R&D):** kompozyty zamiast stali, automatyzacja zamiast pracy.
- **Konsumpcja:** potrzeby, zachcianki, dobra luksusowe — popyt reaguje inaczej na recesję.

**Wielkość orientacyjna:** XL, dlatego **dwie wersje**: **0.18.1 Pilotaż** (3 łańcuchy) i **0.18.2 Pełny graf** (po bramce). **Commit po każdej części.** UI z komponentów 0.14.5.

**Zależności:** 0.17 (surowce, fracht, infrastruktura); 0.16 (kraje producentów, waluty); 0.15.3 (szoki podażowe jako **6. linia kryzysu** w `crises.js`); 0.14 (segmenty i podsektory: ogniwa to podsektory/segmenty, nie osobny typ spółki); 0.13 (strajki). Zapis: pola opcjonalne v16.

---

## Zasady projektu (wnioski z audytu)

- **Graf jako odchylenie, nie zastąpienie.** Marżę sektora nadal wyznacza profil (zasada 0.13). Graf dodaje **odchylenie od profilu o średniej zero w czasie** (zapasy i opóźnienia przesuwają marże, ale długoterminowo nie). Bez tego zmieniłby balans wszystkich sektorów.
- **Poziom szczegółu ogniwa = podsektor lub segment.** Nie śledzimy partii towaru; ogniwo ma przepustowość, zapas i cenę.
- **Zasięg krajowy i międzynarodowy**: krawędzie grafu mają kraj i rodzaj transportu (0.17), więc cła w 0.19 działają na te same krawędzie.
- **Bramka po pilotażu:** po 0.18.1 pomiar balansu (GIG, marże, czas kroku, zapis). Jeśli odchylenie marż ≠ 0 albo czas kroku > celu — pełny graf nie rusza, dopóki nie zostanie dostrojony.

## 0.18.1 Pilotaż: 3 łańcuchy

| Część | Zakres |
|---|---|
| **L0** | Pomiar po 0.17 (baza 0.18); decyzje do podjęcia przed L1 |
| **L1** | **Model grafu:** węzły (ogniwa: wydobycie, hutnictwo, fabryka, spedycja, dystrybucja, konsumpcja), krawędzie (kraj, transport, przepustowość, czas), zapas i cena na ogniwie; rejestr `CHAINS` w kodzie, **stan dynamiczny w zapisie** (kilka liczb na ogniwo) |
| **L2** | **Trzy łańcuchy:** (1) ruda → metal → samochody, samoloty, statki, tabor; (2) ropa i gaz → chemia i paliwa → transport; (3) zboże → przetwórstwo → żywność. Wpływ na przychód i koszt segmentów, odchylenia marż o średniej zero |
| **L3** | **Szok podażowy jako 6. linia kryzysu** (np. blokada cieśniny, strajk portowy): etapy jak w 0.15.3, tracą ogniwa za szokiem, zyskują dostawcy z innych krajów; wspólny budżet częstości linii |
| **L4** | **Interfejs:** karta łańcucha (status ogniw słowem i liczbą), wiersz w karcie spółki („ogniwo, zapas, wystawienie na szok”); Akademia („Łańcuch wartości”, „Efekt byka”) |
| **L5** | **Kontrola 0.18.1**, raport `raporty/kontrola_0.18.1.md`, **bramka** |

## 0.18.2 Pełny graf (po bramce)

| Część | Zakres |
|---|---|
| **L6** | Pozostałe łańcuchy: elektronika i półprzewodniki, energia i sieci, lekarstwa, budownictwo (cement, stal, beton), włókiennictwo i luksus, zbrojenia |
| **L7** | **Zapasy i magazyny:** infrastruktura magazynowa (spółki i inwestycje), pojemność hal i terminali przeładunkowych, koszt trzymania, bufor w szoku |
| **L8** | **Konsumpcja:** hierarchia dóbr (potrzeby, zachcianki, luksus, dodatki); popyt w recesji i w hossie; wpływ klasy społecznej (0.13) |
| **L9** | **Substytucja i R&D:** technologie (0.13) zmieniają współczynniki wsadu (kompozyty zamiast stali, automatyzacja zamiast pracy) |
| **L10** | **Mapa szlaków** (graficzna: status połączeń morskich, lotniczych, lądowych między państwami; to zadanie głównie dla designu) |
| **L11** | Kontrola końcowa, raport `raporty/kontrola_0.18.md` |

## Jak sprawdzimy (orientacyjnie)

| Miara | Cel |
|---|---|
| Średnia odchyłek marż sektorów po pilotażu | 0 ± 0,3 pp; GIG ±1 pp względem bazy |
| Szok podażowy | cena w dół łańcucha rośnie o 3–15% w Zarażaniu, wraca w 4–8 kw. |
| Szok podażowy w budżecie linii | razem 1–2 linie na 20 lat (jak w 0.15.3) |
| Czas kroku / zapis | ≤ +15% / ≤ +4% (0.18.1); ≤ +25% / ≤ +8% (0.18.2) |
| Niezmienniki, wyjątki JS, ujemna gotówka | 0 |
| Linie wskazujące „kto zyskuje” | zyskujące sektory ≥ GIG + 5 pp w ≥ 70% gier z linią |

## Główne ryzyka

- **Zmiana balansu wszystkich sektorów** → odchylenie o średniej zero, bramka, przebiegi ×200 przed każdym commitem.
- **Rozmiar zapisu i czas kroku** (graf dla 10 krajów) → ogniwa na poziomie podsektora, stan w kilku liczbach, aktualizacja co kwartał.
- **Złożoność dla gracza** → w interfejsie tylko status i wystawienie; szczegóły w karcie łańcucha.
- **Zbyt duża wersja** → podział 0.18.1/0.18.2 i bramka.

## Decyzje (podjęte 2026-10-25)

1. **Pilotaż 0.18.1:** metal i motoryzacja, ropa i paliwa, zboże i żywność (6 surowców z 0.17 wystarcza).
2. **Szok podażowy jako 6. linia kryzysu z własnymi etapami** jak w 0.15.3, wspólny budżet częstości linii.

## Decyzje jeszcze otwarte

1. Czy hierarchia dóbr konsumpcyjnych (L8) zostaje w 0.18.2, czy idzie do osobnej wersji?

## Zlecenie dla czatu designu (przed L4 i L10)

1. Karta łańcucha: ogniwa jako oś lub graf z podpisami, status słowem i liczbą, zapas i przepustowość.
2. Wiersz w karcie spółki: ogniwo, zapas, wystawienie na szok.
3. **Mapa szlaków** (L10): państwa i połączenia, status słowem (aktywny, utrudniony, wstrzymany), nie samym kolorem.
4. Ikony ogniw i rodzajów transportu (SVG).
5. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.
