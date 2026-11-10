# Projekt UI 0.18: bilans dóbr (widok „Dobra”)

Data: 2026-11-10 · zlecenie: `plany/plan_seria_0.18_towary_ipo_miasta.md` (sekcje 2, 4, 5) · makieta: [makiety/14_bilans_018.html](makiety/14_bilans_018.html) · CSS: blok „Bilans dóbr” w [makiety/018.css](makiety/018.css) · wcześniej: [13_lancuch_0.18.md](13_lancuch_0.18.md).

Markup makiety powstaje z tablicy `GOODS` (jeden wiersz to jedno dobro na wybranym rynku). Funkcje `row`, `chart` i `shares` są wzorem dla kodu. Liczby są przykładowe.

## Decyzje użytkownika (2026-11-10)
1. **Miejsce:** Państwo → Łańcuchy, przełącznik **„Łańcuchy / Dobra”** (`.speed-segmented`). Bez osobnej zakładki.
2. **Układ:** tabela pogrupowana po klasie M, P, K, Z, L. Nagłówek grupy ma literę klasy i liczbę dóbr w niedoborze.
3. **Rozwinięcie wiersza** (pod wierszem, bez okna): wykres ceny i bilansu z 40 kw.; producenci i odbiorcy (udziały); dla dóbr K flota i amortyzacja. Sprzęgnięcia z giełdą nie pokazujemy.

## Co pokazuje
| Element | Dane | Markup / komponent |
|---|---|---|
| Pasek widoku | przełącznik widoku; filtr: wszystkie, niedobór i gorzej, z kontraktem (z licznikami); rynek: Świat albo kraj | `.gd-view-bar`, `.speed-segmented`, `.sector-chips`, `<select>` |
| Pasek liczb | dobra w niedoborze (najgorsze), indeks cen wewnętrznych (start = 100), import w kwartale w PLN | `.bank-ticker` |
| Wiersz dobra | ikona, nazwa, uwaga (współprodukt, klasa wg kraju), „kontrakt”; status i pokrycie; podaż (z importem) i popyt jako dwa paski z liczbami; zapas w kw. (kreska = cel 0,5); cena wewnętrzna (indeks 50–200); zmiana w kwartale ▲▼; import jako % podaży | `tr.gd-row` (`tabindex="0"`, `aria-expanded`, `aria-label`), `badge`, `.gd-sd`, `limit-meter`, `badge--info` „kontrakt” |
| Wykres 40 kw. | słupki bilansu wokół b = 1 (w górę: nadwyżka, w dół: niedobór), linia ceny ze skalą z prawej, legenda słowami | `svg.gd-chart` + `.gd-chart-key`, `role="img"` z opisem trendu w `aria-label` |
| Producenci i odbiorcy | spółki i import z udziałem; odbiorcy z tabeli sekcji 4; priorytet obronności przy niedoborze; „Pokaż w łańcuchu” | `.gd-shares` z `limit-meter`, `btn-secondary` |
| Flota (tylko K) | zasób kraju i średni wiek, zużycie δ na kw., zakupy wobec potrzeby, popyt: odtworzenie albo rozbudowa; ostrzeżenie, gdy zakupy < zużycia | `.gd-fleet` z `.cc-kpi`, `.gd-shares`, `notice-inline.is-warn` |

**Zasady danych:** status liczy się z `b = (podaż krajowa + import) / popyt`. Ropa w Polsce jest więc „Równowaga” przy 85% importu. Gdyby liczyć bez importu, wyszłoby błędnie „Przerwane”. Kolor zmiany ceny: wzrost kosztu jest `text-down` (strata dla odbiorców), spadek jest `text-up`. Dobra bez zapasu (prąd) mają „bez zapasu”. Kawy nie ma w tabeli, bo ma tylko kontrakt. Herbata siedzi w grupie według kraju (w Polsce L).

## Telefon (≤ 640 px)
Widać kolumny: dobro, stan i cena. Podaż i popyt, zapas, zmiana i import są w rozwinięciu. Tabela ma `table-layout: fixed`, rozwinięcie idzie w jedną kolumnę. Sprawdzone przy 375 px, bez przewijania strony w poziomie.

## Stany puste i szczególne
| Stan | Treść |
|---|---|
| Przed pierwszym kwartałem | „Dane pojawią się po pierwszym kwartale gry.” |
| Filtr „Niedobór” bez wyników | „Żadne dobro nie ma teraz niedoboru.” + „Pokaż wszystkie” |
| Krótka historia | „Historia ma dopiero N kwartałów. Wykres pokaże do 40.” |
| Współprodukt | „Srebro powstaje przy wydobyciu miedzi: podaż rośnie i spada razem z nią.” |

## Prompt dla czatu kodu
> Wdróż widok „Dobra” wg `plany/design/14_bilans_0.18.md` i makiety `plany/design/makiety/14_bilans_018.html` (CSS w bloku 0.18 z `018.css`, już przeniesionym przy L4). W zakładce Łańcuchy dodaj przełącznik „Łańcuchy / Dobra” i `renderGoodsTable(market)` z wierszami z rejestru dóbr i stanu bilansu. Rozwinięcie: `renderGoodDetail(good)` z wykresem 40 kw. (wzór `chart` w makiecie), udziałami i flotą dla klasy K. Status licz z podaży razem z importem. Filtry i wybrany rynek trzymaj w stanie UI, nie w zapisie. Testy: grupowanie po klasie (5 grup), status ropy z importem ≠ „Przerwane”, brak kawy w tabeli, sekcja floty tylko dla K. Sprawdź przy 1280 i 390 px, commit po polsku.
