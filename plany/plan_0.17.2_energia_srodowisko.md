# Plan 0.17.2 „Energia i środowisko” (szkic zakresu, po 0.17.1; przed 0.18 „Łańcuchy produkcyjne”)

Źródło: zgłoszenia z gry 2026-10-25 (`pomysly_na_kolejne_wersje.md`, sekcja 9.2). Szkic bez czytania kodu; stan sektora Energia sprawdzamy w pierwszej części.

Cel: sektor Energia dostaje własną mechanikę, a gra — wymiar ekologiczny i społeczny.

Czego uczy:
- **Miks energetyczny:** OZE, atom, węgiel — koszty, stabilność, polityka.
- **Zanieczyszczenia i regulacje:** opłaty, limity, kary, zielone inwestycje.
- **Transformacja energetyczna** i jej koszty dla przemysłu.
- **Opinia publiczna** jako czynnik dla sektorów B2C.

**Wielkość orientacyjna:** L. **Zależności:** 0.17 (surowce: energia jako surowiec i handel energią), 0.16 (kraje), 0.15.6 (spółki atomowe poza NewHorizons), 0.13 (partie i ustawy w kraju startowym), 0.14 T2 (energetyka jądrowa jako podsektor).

## Zakres (kolejność orientacyjna)

| Część | Zakres |
|---|---|
| **N0** | Pomiar sektora Energia, baza 0.17.2 |
| **N1** | **Podsektory:** OZE, atom, węgiel; partia wybiera typ energii, wybrany typ dostaje delikatny bonus do stabilności i zarobków |
| **N2** | **Energia jako surowiec:** spółki zużywają energię jako wsad produkcji (spójnie z 0.17); inwestycje energetyczne (nowe elektrownie) zwiększają produkcję; handel energią między państwami |
| **N3** | **Urząd Energii i Ekologii (UEiE):** poziomy rozwoju, kontrola rozwoju i zużycia, limity i kary |
| **N4** | **Zanieczyszczenia:** emitują Przemysł, Chemia, Energia; wpływ na poziom życia i przyrost populacji; opłata od zanieczyszczeń i limity państwa; negatywne eventy (kary, protesty) i „zielone” inwestycje |
| **N5** | **OZE i atom z udziałem państwa:** OZE finansowane z nowego wydatku państwa (zwiększa przychody spółek OZE); **energia atomowa** odblokowana po subsydiach OZE, spółka państwowa od poziomu platynowego, nie na NewHorizons; superprojekty OZE/atom z dofinansowaniem; prywatyzacja; nowy podwykonawca od energetyki |
| **N6** | **Opinia publiczna:** globalny wskaźnik nastrojów dla sektorów B2C (Dobra konsumpcyjne, Media, Turystyka), kształtowany przez PR, skandale, ekologię, politykę |
| **N7** | **Technologie i R&D ekologiczne:** redukcja emisji, recykling; dotacje, ulgi, wymogi regulacji |
| **N8** | Interfejs, Akademia, zapis, kontrola, raport `raporty/kontrola_0.17.2.md` |

## Główne ryzyka

- **Zmiana marż Energii i Przemysłu** (koszt energii i emisji) → kalibracja „średnio zero”, jak w 0.17.
- **Zbyt wiele nowych wskaźników** (zanieczyszczenie, opinia, populacja) → minimalny zestaw w UI.
- **Polityka** (partie wybierają typ energii) wymaga stanu partii z 0.13; za granicą stały profil.

## Decyzje do podjęcia przed N1

1. Czy poziom życia i przyrost populacji z zanieczyszczeń wchodzą (zmiana modelu 0.13), czy tylko opinia publiczna?
2. Czy handel energią między państwami wchodzi tu, czy w 0.19 (Handel światowy)?
3. Czy opinia publiczna (N6) jest osobnym KPI w pasku, czy tylko modyfikatorem?

## Zlecenie dla czatu designu (przed N8)

1. Zakładka energii: miks (OZE, atom, węgiel), produkcja i zużycie, UEiE (poziom, kary).
2. Wskaźniki: zanieczyszczenia, opinia publiczna.
3. Ikony typów energii (SVG).
4. Wymogi 0.14.5: kolor nigdy jedynym nośnikiem; bez nowych okien modalnych.
