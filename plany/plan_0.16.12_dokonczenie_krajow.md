# Plan 0.16.12 „Dokończenie krajów” (szkic zakresu; po 0.16.11, przed 0.16.10 scenką i 0.17.x)

Źródło: decyzje użytkownika z 2026-10-30 po zamknięciu 0.16.x: strajki obcych, partie i społeczeństwo kraju startowego (K3/S0d), listy firm USA i Czech oraz kalibracja krajów spoza PL **przechodzą do 0.19.2/0.19.3+**; licencja tekstury globusa nie jest już śledzona jako otwarty punkt. Do zrobienia teraz: spółki zależne (wersja okrojona), walne zgromadzenia i reszta otwartych punktów z 0.16.9 i 0.16.11.

## Zakres

### D1. Spółki zależne spółek zagranicznych (okrojone)
- Spółka zagraniczna może mieć **najwyżej jedną spółkę córkę i dwie spółki zależne** (łącznie ≤ 3 podmioty powiązane), z kapitałem od matki, własnym segmentem i nazwą; reuse logiki `foundSubsidiary`/`pickSubsidiaryName` z `finance.js` (nazwy: długi człon matki skraca się do 3 liter, np. „Polenergy”; bez polskich znaków w skrócie). Limity giełdy kraju (F3 z 0.16.8) liczą córkę.
- Bez drzewa grup, bez wspólnych raportów skonsolidowanych poza istniejącym mechanizmem krajowym; wydzielenia (`spin-off`) obcych — poza zakresem.

### D2. Walne zgromadzenia spółek zagranicznych
- Walne dla spółek zagranicznych na tym samym kodzie co krajowe (głosowania, progi z `COUNTRY_DEFS[…].oversight.callThreshold`, próg wezwania 66/75/90%); wpływ udziału funduszu i botów; wyniki: zmiana prezesa, dywidenda, emisja, wynagrodzenia. Zgodnie z decyzją 0.16.3: pełna drabina KNF-podobna (wezwanie, kara, odsprzedaż) jako rozszerzenie dzisiejszej odsprzedaży po przekroczeniu progu.

### D3. Przejęcia między spółkami zagranicznymi i przejęcia obcych przez gracza i boty
- M&A obcych na wspólnym kodzie `ma.js`/`resolveMerger` (bot–bot, gracz–obca, obca–krajowa), z premią, kapitałem w walucie i limitami listing slot; spółki państwowe wyłączone (decyzja 5 z 0.16.6).

### D4. Resztki polskiego rynku macierzystego po starcie spoza PL (uproszczona mechanika)
- Nagłówek giełdy macierzystej z danych kraju (DAX/WSE/…), nie „GPW”; etykiety spółek uniwersalnych („Polska · PLN” → kraj i waluta rynku macierzystego); ok. 300 literałów „PLN/zł” w mailach, Akademii, `index.html`, wiadomościach (jedno miejsce formatowania waluty bazowej, teksty z walutą z `playerProfile.baseCurrency`); migawki i opisy w Akademii.
- Marża końcowa +1,6 pp po 0.16.9: seria „baza kontra baza” i wyjaśnienie (szum czy skutek).

### D5. Kontrola
- Testy grupy „0.16.12”; przebiegi ≥ 12 gier ×200 dla PL i DE (GIG ±1 pp względem 0.16.11, czas kroku i zapis w budżecie, niezmienniki 0, brak zawieszeń); raport `kontrola_0.16.12.md` z „Pominięte i problemy”.

## Poza zakresem (przeniesione do 0.19.2/0.19.3+)
Strajki i rynek pracy obcych; partie, wybory i społeczeństwo kraju startowego (K3/S0d); listy firm i kalibracja USA i Czech; własne instytucje, Landy, flavour krajów.
