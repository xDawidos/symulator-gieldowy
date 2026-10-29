# Plan 0.16.9 „Waluty w funduszu i dokończenie spółek zagranicznych” (szkic zakresu; po 0.16.7/0.16.8)

Źródło: zgłoszenia użytkownika z 2026-10-29 oraz sekcja „Pominięte i problemy” z `plany/raporty/kontrola_0.16.7.md`. Szkic: przed startem przeczytać `currency.js`, `currency_ui.js`, `foreign_companies.js`, `countries.js`, `internet.js` (Kantory24) i raport diagnoza_0.16.7.md.

## W1. Gotówka w wielu walutach (pomysł użytkownika)

- Pieniądze przewalutowane w kantorze **zostają w tej walucie na koncie funduszu** i można ich używać do zakupów spółek z danego kraju bez ponownego przewalutowania.
- Interfejs: **kliknięcie w gotówkę funduszu** otwiera widok sald walutowych i zmiany na inną walutę (przewalutowanie po kursie kantoru z 0.16.1/Kantory24, spread i prowizja jak dotąd). Etykiety z kodem waluty tekstem, nie tylko kolorem.
- Zasady do ustalenia przy wdrożeniu (decyzje robocze): wartość NAV liczona w PLN po kursie (`toPln`), więc kurs waluty wpływa na NAV (ryzyko walutowe jest częścią gry); umorzenia, opłaty, podatki i pensje płacone z PLN (brak PLN = automatyczne przewalutowanie z ostrzeżeniem albo odmowa; do wyboru); zakup spółki zagranicznej najpierw z salda w jej walucie, dopiero potem z przewalutowania; odsetki/koszt utrzymania sald walutowych (opcjonalnie).
- Zapis: nowe pole sald walutowych funduszu (v19) z migracją (wszystko w PLN); niezmienniki NAV i gotówki muszą liczyć salda walutowe (testy: suma po kursie = gotówka; ujemne salda zakazane).
- Ryzyko regresji w rdzeniu (NAV, bramka umorzeń, mandaty): osobne commity i testy niezmienników.

## W2. Dokończenie funkcji spółek zagranicznych

Z 0.16.7 pominięto (na wspólnym kodzie z krajowymi spółkami):
1. M&A między spółkami zagranicznymi i przejęcia obcych spółek przez gracza i boty na pełnych zasadach.
2. Spółki zależne i walne zgromadzenia obcych spółek.
3. Strajki i rynek pracy obcych spółek (zależność od 0.21 „Rynek pracy 2”).
4. Wpływ fundamentów na kurs: dziś kurs idzie z modelu zwrotu, a fundamenty tylko skokiem po raporcie (±2%); docelowo jak w spółkach krajowych (z zachowaniem korelacji z GIG i budżetu czasu kroku).
5. Sonda częstości splitów, dywidend i upadłości obcych spółek w `tests/przebiegi.html`.
6. Zegar giełd: sprawdzić w przeglądarce kliknięciem w Kantorze i przy ×200 (czytelność wskazówek).

Powód pominięcia w 0.16.7: koszt czasu kroku i zapisu (wariant A′ zamiast włączenia do `stocks`), ryzyko dla kalibracji GIG i konieczność pomiarów. W 0.16.9 wdrażać etapami z pomiarem budżetu po każdym.

## W3. Spółki zagraniczne jak krajowe w interfejsie i na giełdach (zgłoszenie 2026-10-29)

Zgłoszenie: spółki zagraniczne nie wchodzą na nasze giełdy od śmieciowej do diamentowej (poziomy giełd krajowych), mają inny wygląd niż zwykłe spółki, nie mają wykresów ani zwykłych kart.
- **Giełdy:** spółki zagraniczne notowane są dziś tylko na giełdzie swojego kraju (`foreignIssuers`, dane w `countries_data.js`), poza systemem poziomów (`exchanges`, `ELITE_EXCHANGES`). Docelowo: spółka kraju połączonego (0.16.3) trafia na odpowiedni poziom naszej giełdy wg ceny/kapitalizacji i wymogów (jak krajowe), a spółki kraju niepołączonego są na giełdzie krajowej z własnymi poziomami (np. NASDAQ/NYSE jako wyższe poziomy).
- **Interfejs:** ta sama karta spółki jak dla krajowych (okno z zakładkami Przegląd, Finanse, Akcjonariat, Zarządzanie, Grupa), **wykres ceny** (historia cen istnieje w `i.history`, trzeba podpiąć wspólny komponent wykresu), wskaźniki, prezes, dywidendy, splity.
- **Podejście:** wspólna funkcja widoku spółki przyjmująca „źródło danych” (krajowa z `stocks` lub zagraniczna z `foreignIssuers`) zamiast kopiowania renderowania; najpierw inwentaryzacja różnic w kartach, potem podpinanie po jednej zakładce z testem.

## Kontrola

Testy grupy „0.16.9”, przebiegi ×200 (GIG ±1 pp względem 0.16.7/0.16.8, czas kroku i zapis w budżecie), niezmienniki 0; raport `kontrola_0.16.9.md` z sekcją „Pominięte i problemy”.
