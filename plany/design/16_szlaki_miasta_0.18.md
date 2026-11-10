# Projekt UI 0.18 / 0.19.2: mapa szlaków i miasta

Data: 2026-11-10 · zlecenie: `plany/plan_0.18_lancuchy_produkcyjne.md` (L10 „Mapa szlaków”, zlecenie dla designu pkt 3) i `plany/plan_seria_0.18_towary_ipo_miasta.md` (sekcja 7: Miasta 2, 0.19.2) · makieta: [makiety/16_szlaki_miasta_018.html](makiety/16_szlaki_miasta_018.html), klikalna · CSS: blok „Szlaki i miasta” w [makiety/018.css](makiety/018.css).

Markup powstaje z tablic `COUNTRIES` (pozycje schematyczne), `ROUTES` i `CITIES`. Funkcje `routeSvg`, `renderMap`, `countryPanel` i `cityPanel` są wzorem dla kodu. Liczby i nazwy są przykładowe.

## Decyzje użytkownika (2026-11-10)
1. **Forma:** schematyczna mapa SVG 2D (jak plan metra, bez konturów państw). Bez globusa 3D.
2. **Miejsce:** Państwo → Łańcuchy, trzeci widok przełącznika **„Łańcuchy / Dobra / Szlaki”**.
3. **Miasta na tej samej mapie:** kliknięcie kraju rozwija koło kraju i pokazuje w nim kropki miast. Kliknięcie kropki pokazuje dane miasta pod mapą. Okno „Miasto” zostaje, a przycisk „Otwórz okno Miasto” otwiera je dla wybranego miasta.

## Co pokazuje
| Element | Dane | Markup / komponent |
|---|---|---|
| Filtr i liczby | transport (wszystkie, morskie, lotnicze, lądowe); szlaki aktywne, utrudnione (z powodem), wstrzymane | `.sector-chips`, `.bank-ticker` |
| Kraj | koło z kodem; `aria-label`: nazwa, liczba szlaków i ile z problemem | `g.ct` (`tabindex`, `role="button"`, `aria-expanded`) |
| Kraj „wkrótce” (R13) | SE, CH, FR, JP, TW, CN, IN: koło przerywane, tło `sunken`, kod szarym tekstem, jak na globusie wyboru kraju. Szlaki i handel widać, klik pokazuje tylko kartę szlaków z dopiskiem „kraj wkrótce”, bez miast. W legendzie „przerywane: kraj wkrótce”. Lista z `COUNTRIES[].soon` w grze | `.ct.is-soon`, `.ct.is-soon.is-picked`, `.ct-soon-mark` |
| Szlak | linia kraj–kraj: morski łukiem, lotniczy wyższym łukiem (najwyżej 70 px), lądowy prosto. Stan: aktywny (szara ciągła), utrudniony (bursztynowa, kreski, słowo), wstrzymany (czerwone kropki, „× wstrzymany”). Na środku kółko z ikoną transportu | `path.rt.is-hamp / .is-stop`, `g.rt-mark` |
| Rozwinięty kraj | koło rośnie (r 78), reszta mapy przygasa (35%), kropki miast z nazwami. Na telefonie mapa przewija się tak, żeby kraj był na środku | `.ct.is-open`, `.rt-map.has-open`, `g.city` |
| Karta kraju | szlaki kraju z partnerem, transportem, powodem albo przepustowością, stanem słowem | `.bank-card`, `.en-rows`, `.rt-status` |
| Karty miasta (3) | **miasto:** ludność, klasa średnia, zadowolenie, podatek lokalny, budżet, infrastruktura 4 × 0–100 (drogi, kolej, energia, łącza; poniżej 50 `is-warn` z powodem). **Pojemność i życie:** zajęta pojemność z kreską 100% i skutki przekroczenia; uczelnia (1 na miasto), galerie handlowe (REIT `retail`, giełdowe i miejskie), zanieczyszczenie. **Oddziały spółek:** spółka, rodzaj (siedziba, oddział, terminal), zatrudnienie, „Twoja” | `.rt-side` (siatka kart), `.cc-kpis`, `.en-factors`, `limit-meter`, `.en-rows`, `btn-secondary` |
| Lista szlaków | ta sama treść co mapa (dla czytnika i telefonu): najpierw wstrzymane, potem utrudnione | `asset-mini-table` |

## Zasady
- Stan szlaku zawsze ma styl linii, słowo i ikonę. Kolor tylko wspiera.
- Pozycje krajów są schematyczne i stałe (tabela w kodzie UI). Krawędzie szlaków pochodzą z grafu (kraj, transport z 0.17, przepustowość, stan), więc cła z 0.19/0.20 trafią na te same linie.
- Mapa rysuje się tylko przy otwartym widoku (zasada ×200).
- Dane miast za granicą widać, gdy gracz ma tam spółkę albo oddział (propozycja do potwierdzenia w planie).

## Stany puste i szczególne
| Stan | Treść |
|---|---|
| Nic nie wybrano | „Kliknij kraj na mapie, żeby zobaczyć jego miasta i szlaki.” |
| Kraj bez miast (przed 0.19.2) | karta kraju bez listy miast, koło się nie rozwija |
| Miasto obce bez dostępu | `notice-inline` z `klodka` |
| Wszystko aktywne | `notice-inline` z `ok` |

## Prompt dla czatu kodu (L10, później 0.19.2)
> Wdróż widok „Szlaki” wg `plany/design/16_szlaki_miasta_0.18.md` i makiety `plany/design/makiety/16_szlaki_miasta_018.html` (CSS w bloku 0.18). W zakładce Łańcuchy trzeci przycisk przełącznika i `renderRoutesMap()` ze stałymi pozycjami krajów i krawędziami z grafu (`routeSvg` jak w makiecie). Pod mapą `renderRouteCountryCard(id)` i tabela szlaków. Miasta (0.19.2): kropki w rozwiniętym kraju i `renderCityCards(city)` (3 karty), przycisk otwiera istniejące okno Miasto dla danego miasta. Klawiatura: Enter i Spacja na kraju i mieście. Testy: 3 stany szlaku (klasa i słowo), `aria-expanded` kraju, kolejność listy (wstrzymane pierwsze), łuk ≤ 70 px. Sprawdź przy 1280 i 390 px, commit po polsku.
