# Plan Rozwoju: Sektor Budowlany z Systemem Przetargów

## 📋 Podsumowanie
Rozszerzenie istniejącego systemu budowlanego o pełny cykl przetargów, katalog inwestycji dla wszystkich sektorów, oraz mechanikę limitów, opóźnień i badań.

---

## 🎯 Cel Główny
Stworzyć dynamiczny sektor budowlany, gdzie:
- Spółki niebudowlane mogą zgłaszać potrzeby budowlane (fabryki, magazyny, biura)
- Spółki budowlane składają oferty w przetargach
- Wybór wykonawcy opiera się na weighted kryteriach (cena, czas, doświadczenie, prestiż, poziom giełdy, państwowość)
- Realizacja budowy z limitami, opóźnieniami i bonusami doświadczenia

---

## 📊 Analiza Istniejącego Kodu

### Co już działa:
1. **Podstawowy system przetargów** w `gameCore.js`:
   - `createTender()` - tworzy przetarg
   - `bidOnTender()` - składanie ofert
   - `awardTender()` - wybór zwycięzcy
   - `calculateBidScore()` - oblicza punkty (już ma cena, czas, doświadczenie, prestiż, poziom giełdy, państwowość)
   - `startConstructionProject()` - rozpoczyna budowę
   - `processConstructionProjects()` - aktualizuje postęp
   - `completeConstructionProject()` - finalizuje

2. **Katalog inwestycji** w `companies.js` (`INVESTMENT_CATALOG`):
   - Ogólne inwestycje (marketing, sprzęt, filie)
   - Sektorowe budynki (Przemysł, Technologia, Medycyna, Energia, Budowlany, itd.)
   - Każdy budynek ma: cost, duration, assetValue, incomeBonus, healthBonus, maintenance

3. **Statystyki budowlane** w spółkach:
   - `constructionStats`: { experience, maxProjects, currentProjects }
   - Doświadczenie zwiększa się po ukończeniu budowy
   - Bonus do szybkości już istnieje: `experience * 0.01`

4. **UI** w `ui.js` i `index.html`:
   - Modal sektora budowlanego (`openConstructionSectorModal()`)
   - Wyświetlanie aktywnych przetargów i projektów
   - Konsorcja budowlane

5. **Integracja** w `main.js`:
   - `processConstructionProjects()` wywoływane w głównej pętli
   - `processConstructionConsortia()` wywoływane

---

## 🛠️ Wymagane Ulepszenia

### 1. **Rozszerzyć Katalog Inwestycji** ✅ Częściowo gotowe
**Plik:** `companies.js` - `INVESTMENT_CATALOG`

**Aktualne sektory z budynkami:**
- Przemysł: fabryka, szyb wydobywczy
- Technologia: serwerownia, fabryka chipów, centrum rozwoju
- Medycyna: laboratorium, szpital, fabryka leków
- Energia: elektrownia, farma wiatrowa, park słoneczny
- Logistyka: centrum logistyczne, dystrybucyjne, magazyn automatyczny
- Budowlany: biurowiec, hala, osiedle, centrum handlowe, park przemysłowy, wieżowiec
- Gaming: studio, arena eSport, lab VR
- Turystyka: łańcuch hoteli, kurort, park rozrywki, terminal promowy
- Żywność: zakład przetwórstwa, farma mleczna, browar
- Dobra konsumpcyjne: zakład produkcyjny, fabryka tekstyliów, linia montażu elektroniki
- Usługi: centrum usługowe, call center, biuro konsultingowe
- Badania: obiekt badawczy, laboratorium innowacji, centrum testowe

**Nowe budynki do dodania (propozycje):**
- **Bankowość**: siedziba banku, centrum danych finansowych, safe deposit vault
- **Finanse**: wieża finansowa, centrum tradingowe
- **Chemia**: zakład chemiczny, laboratorium R&D, rafineria
- **Energia** (rozszerzenie): elektrownia jądrowa, farma geotermalna
- **Media**: studio telewizyjne, centrum nadawcze, redakcja
- **Transport**: stacja kolejowa, port kontenerowy, lotnisko cargo

**Działanie:** Dodać nowe typy budynków do odpowiednich sektorów w `INVESTMENT_CATALOG`.

---

### 2. **Ulepszyć System Przetargów** ✅ Częściowo gotowy

**Plik:** `gameCore.js` - `calculateBidScore()`

**Obecne kryteria (już zaimplementowane):**
- `price` - niższa cena = wyższy wynik
- `time` - krótszy czas = wyższy wynik
- `experience` - wyższe doświadczenie = wyższy wynik
- `prestige` - wyższa reputacja = wyższy wynik
- `exchangeLevel` - wyższy poziom giełdy = wyższy wynik
- `isStateOwned` - jeśli klient państwowy, premiuje spółki państwowe

**Wymagane poprawki:**
- Upewnić się, że wszystkie wagi z `criteriaWeights` sumują się do 1.0
- Dodać logikę, że dla spółek państwowych jako klientów, waga `isStateOwned` może być zwiększana
- Możliwość dynamicznego dostosowywania wag przez klienta (np. priorytet: cena 50%, czas 30%, doświadczenie 20%)

**Działanie:** Zweryfikować i ewentualnie poprawić `calculateBidScore()`.

---

### 3. **Dodać Limit Równoległych Budów** ✅ Częściowo gotowy

**Plik:** `gameCore.js` - `startConstructionProject()`

**Obecnie:** `winningBid.bidder.constructionStats.currentProjects++` - zwiększa licznik

**Brakuje:**
- Sprawdzenia przed rozpoczęciem budowy: `if (currentProjects >= maxProjects) => odrzuć ofertę`
- Inicjalizacji `maxProjects` przy tworzeniu spółki budowlanej (domyślnie np. 2-3, można zwiększać przez badania/technologie)
- Możliwość rozbudowy limitu przez inwestycje (np. "Centrum Zarządzania Projektami")

**Działanie:**
- Dodać `maxProjects` do `constructionStats` przy inicjalizacji spółek budowlanych
- Dodać sprawdzenie w `bidOnTender()` lub `awardTender()` przed `startConstructionProject()`
- Zablokować składanie ofert, jeśli limit osiągnięty (w UI pokazać komunikat)

---

### 4. **Bonus do Szybkości Budowy** ✅ Gotowe

**Plik:** `gameCore.js` - `processConstructionProjects()`

**Obecnie:** `const experienceBonus = project.builder.constructionStats.experience * 0.01;`

**Propozycja ulepszenia:**
- Zmienić na `experience * 0.015` dla lepszej skalowalności
- Dodać bonus z technologii (np. "Inteligentne Budownictwo" daje dodatkowy +0.01)
- Maksymalny bonus ograniczyć do np. 50% (experience cap na 333 pkt)

**Działanie:** Dostroić formułę bonusu doświadczenia.

---

### 5. **System Opóźnień** ✅ Częściowo gotowy

**Plik:** `gameCore.js` - `processConstructionProjects()`

**Obecnie:** `if (Math.random() < 0.05) { // 5% szans }`

**Ulepszenia:**
- Doświadczenie zmniejsza szansę opóźnienia: `0.05 - (experience * 0.0005)` (min 1%)
- Technologie (np. "Optymalizacja Logistyki") dają dodatkowe redukcje
- Opóźnienie może być większe dla budynków z wyższą złożonością
- Dodawać komunikat z przyczyną: "brak materiałów", "pogoda", "awaria sprzętu"

**Działanie:** Ulepszyć mechanikę opóźnień.

---

### 6. **Zgłaszanie Inwestycji przez Spółki Niebudowlane** ❌ Brakujące

**Wymagania:** dev level 1+, min cash 1M PLN

**Nowe funkcje:**
- `requestConstructionTender(company, buildingType, budget, criteria)` - zgłoszenie przetargu przez firmę
- Sprawdzenie warunków: `company.financialHealth >= 1 && company.cash >= 1000000`
- Automatyczne generowanie przetargu w systemie

**UI:**
- Dodać zakładkę/panel "Zgłoś Inwestycję" w modal sektora budowlanego
- Formularz: wybór typu budynku, budżet, wagi kryteriów (suwaki)
- Lista zgłoszeń (status: otwarty, oferty, wybrany wykonawca, w realizacji, ukończony)

**Działanie:** Stworzyć funkcje zgłaszania i UI.

---

### 7. **Badania dla Spółek Budowlanych** ✅ Częściowo gotowe

**Plik:** `technologies.js` - sektor 'Budowlany'

**Obecne technologie:**
- Budownictwo Prefabrykowane
- Ekologiczne Materiały
- Inteligentne Budownictwo
- Technologie Podziemne
- Wieżowce
- Budownictwo Sejsmiczne
- Renowacja Zabytków
- Zielone Budynki
- Megaprojekty

**Działanie:** Technologie już istnieją, tylko upewnić się, że są dostępne dla spółek budowlanych.

---

### 8. **Rozszerzyć Katalog o Budynki dla Nowych Sektorów** ✅ Częściowo gotowe

**Sektory bez budynków lub z małą liczbą:**
- **Bankowość**: siedziba banku, centrum danych, oddział, bankomatowy hall
- **Finanse**: wieża finansowa, centrum tradingowe, data center
- **Chemia**: zakład produkcyjny, rafineria, laboratorium chemiczne
- **Media**: studio, centrum nadawcze, kin complex
- **Transport**: terminal, magazyn logistyczny, stacja benzynowa

**Działanie:** Dodać nowe budynki do `INVESTMENT_CATALOG` dla brakujących sektorów.

---

### 9. **Zaktualizować UI** ❌ Brakujące

**Plik:** `ui.js` - `openConstructionSectorModal()`

**Obecnie:** Wyświetla tylko listę aktywnych przetargów i projektów

**Nowe elementy:**
1. **Zakładka "Zgłoś Inwestycję"**:
   - Dropdown: wybór typu budynku (z `INVESTMENT_CATALOG[sektor]`)
   - Input: budżet (minimalny to koszt budynku × 1.2)
   - Sliders dla wag kryteriów:
     - Cena (0-100%)
     - Czas realizacji (0-100%)
     - Doświadczenie (0-100%)
     - Prestiż (0-100%)
     - Poziom giełdy (0-100%)
     - Państwowość (0-100%)
   - Przycisk "Ogłoś Przetarg"

2. **Zakładka "Aktywne Przetargi"** (obecna):
   - Tabela z: klient, budynek, budżet, deadline, liczba ofert, status
   - Możliwość wyboru zwycięzcy przez klienta (jeśli to UI klienta) lub tylko podgląd

3. **Zakładka "Moje Oferty"** (dla spółek budowlanych):
   - Lista ofert złożonych przez gracza
   - Możliwość wycofania oferty (jeśli jeszcze otwarte)

4. **Zakładka "Projekty w Realizacji"**:
   - Lista budów z postępem, czasem pozostałym, wykonawcą
   - Możliwość "wsparcia" (dotacja) - przyspieszenie za pieniądze

5. **Zakładka "Konsorcja"** (obecna):
   - Informacje o aktywnych konsorcjach

**Działanie:** Przerobić modal na zakładki, dodać formularz zgłoszenia.

---

### 10. **Zintegrować z Główną Pętlą Gry** ✅ Częściowo gotowe

**Plik:** `main.js` - główna pętla

**Obecnie wywoływane:**
- `processConstructionProjects()` - co tydzień
- `processConstructionConsortia()` - co tydzień

**Brakuje:**
- Automatycznego zamykania przetargów po deadline
- Automatycznego wyboru zwycięzcy po zamknięciu przetargu
- Generowania przetargów przez AI (spółki niebudowlane AI)
- Sprawdzania, czy spółki budowlane nie przekroczyły limitów przed składaniem ofert

**Działanie:** Dodać brakujące funkcje do pętli.

---

### 11. **Przetestować i Zbalansować** ⏳

**Zadania testowe:**
1. Utworzyć przetarg przez firmę niebudowlaną (spełniającą warunki)
2. Sprawdzić, czy spółki budowlane otrzymują powiadomienie/więc widzą przetarg
3. Złożyć oferty z różnymi parametrami
4. Zakończyć przetarg i sprawdzić, czy wybrany wykonawca ma najwięcej punktów
5. Uruchomić budowę i śledzić postęp z/bez opóźnień
6. Sprawdzić limity równoległych projektów
7. Przetestować bonus doświadczenia na szybkość
8. Sprawdzić ukończenie budowy i dodanie budynku do portfela klienta
9. Przetestować konsorcja (opcjonalnie)

**Balansowanie:**
- Czas budowy: fabryka 40 tygodni, biurowiec 30, hala 20
- Koszty utrzymania: 1-2% wartości budynku/tydzień
- Opóźnienia: 5% szans/tydzień, redukowane przez doświadczenie
- Doświadczenie: +1 za budowę, max 500 (cap)
- Limity projektów: start 2, max 5 przez badania

---

## 📅 Kolejność Implementacji

### Faza 1: Rozszerzenie Katalogu (1-2 godziny)
1. Dodać nowe budynki do `INVESTMENT_CATALOG` w `companies.js`
2. Dodać ikony (jeśli brak) lub użyć istniejących

### Faza 2: Mechanika Przetargów (2-3 godziny)
3. Poprawić `calculateBidScore()` - dodać dynamiczne wagi
4. Dodać sprawdzenie limitów projektów w `awardTender()`
5. Ulepszyć `processConstructionProjects()` - lepszy system opóźnień i bonusów

### Faza 3: Zgłaszanie Inwestycji (3-4 godziny)
6. Stworzyć funkcję `requestConstructionTender()` w `gameCore.js`
7. Dodać warunki: dev level 1+, cash >= 1M
8. Stworzyć UI w `ui.js` - formularz zgłoszenia
9. Dodać zakładki w modal sektora budowlanego

### Faza 4: Integracja i AI (2-3 godziny)
10. Dodać automatyczne zamykanie przetargów po deadline
11. Dodać generowanie przetargów przez AI (funkcja w `ai.js`)
12. Dodać sprawdzanie limitów przed składaniem ofert przez AI

### Faza 13: Testowanie i Balans (1-2 godziny)
13. Ręczne przetestowanie wszystkich scenariuszy
14. Dostrojenie parametrów (koszty, czasy, szanse)

**Łączny szacowany czas:** 9-14 godzin implementacji

---

## 🔧 Kluczowe Funkcje do Implementacji

### Nowe Funkcje (gameCore.js):
```javascript
function requestConstructionTender(company, buildingType, budget, criteriaWeights) { }
function closeExpiredTenders() { }
function canCompanyBid(tender, company) { } // sprawdza limity
function generateAITenders() { } // AI zgłasza przetargi
```

### Modyfikacje Istniejących:
- `calculateBidScore()` - doprecyzować normalizację punktów
- `awardTender()` - dodać check `maxProjects`
- `processConstructionProjects()` - ulepszyć opóźnienia i bonusy
- `startConstructionProject()` - dodać check limitów

### UI (ui.js):
- `openConstructionSectorModal()` - przebudować na zakładki
- `renderTenderForm()` - formularz zgłoszenia
- `renderMyTenders()` - przetargi zgłoszone przez gracza
- `renderMyBids()` - oferty złożone przez gracza
- `updateTenderListings()` - odświeżanie list

---

## 📈 Dane do Przechowywania

### Nowe pola w obiektach:

**Spółka (stock):**
```javascript
constructionStats: {
    experience: 0,        // już jest
    maxProjects: 2,       // NOWE - limit projektów
    currentProjects: 0    // już jest
}
```

**Przetarg (tender):**
```javascript
{
    id: 'tender_...',
    buildingType: {...},
    clientCompany: company,
    budget: 1000000,
    criteriaWeights: { price: 0.4, time: 0.3, experience: 0.2, prestige: 0.05, exchangeLevel: 0.03, isStateOwned: 0.02 },
    bids: [],
    status: 'open', // 'open', 'closed', 'awarded', 'completed', 'cancelled'
    createdAt: Date.now(),
    deadline: Date.now() + 7 days,
    awardedAt: null,    // NEW
    winner: null,       // NEW
    startDate: null,    // NEW
    completionDate: null // NEW
}
```

**Projekt (constructionProjects):**
```javascript
{
    id: 'project_...',
    tender: tender,
    builder: company,
    startTime: Date.now(),
    duration: 30, // dni
    cost: 500000,
    progress: 0,
    status: 'in_progress',
    delays: 0,
    delayReason: null // NEW
}
```

---

## 🎨 UI - Struktura Modal

```
Modal: Sektor Budowlany (800px szerokości)
├── Zakładka 1: Zgłoś Inwestycję
│   ├── Wybór sektora (dropdown)
│   ├── Wybór typu budynku (dynamiczny po sektorze)
│   ├── Podgląd budynku (koszt, czas, przychód)
│   ├── Budżet (input number)
│   ├── Kryteria (6 suwaków z wartościami %)
│   └── Przycisk "Ogłoś Przetarg"
│
├── Zakładka 2: Aktywne Przetargi
│   ├── Tabela: Klient | Budynek | Budżet | Oferty | Deadline | Status
│   └── (dla klienta) Przycisk "Wybierz Wykonawcę"
│
├── Zakładka 3: Moje Oferty (dla spółek budowlanych)
│   ├── Lista ofert złożonych przez gracza
│   └── Możliwość wycofania
│
├── Zakładka 4: Projekty w Realizacji
│   ├── Lista projektów z paskami postępu
│   ├── Czas pozostały
│   └── Opcja "Przyspiesz za X PLN"
│
└── Zakładka 5: Konsorcja
    └── (istniejąca logika)
```

---

## ⚙️ Parametry do Zbalansowania

| Parametr | Wartość Początkowa | Opis |
|----------|-------------------|------|
| `MAX_PROJECTS_DEFAULT` | 2 | Domyślny limit projektów na firmę budowlaną |
| `MAX_PROJECTS_MAX` | 5 | Maksymalny limit po badaniach |
| `EXPERIENCE_PER_PROJECT` | 1 | Doświadczenie za ukończenie |
| `EXPERIENCE_DELAY_REDUCTION` | 0.0005 | Redukcja szansy opóźnienia na punkt doświadczenia |
| `BASE_DELAY_CHANCE` | 0.05 | Bazowa szansa opóźnienia na tydzień (5%) |
| `DELAY_DURATION_DAYS` | 7 | Długość opóźnienia w dniach |
| `TENDER_DURATION_DAYS` | 7 | Czas trwania przetargu |
| `MIN_CLIENT_CASH` | 1000000 | Minimalna gotówka klienta |
| `MIN_CLIENT_DEV_LEVEL` | 1 | Minimalny poziom rozwoju |
| `BID_SCORE_PRICE_WEIGHT` | 0.4 | Domyślna waga ceny |
| `BID_SCORE_TIME_WEIGHT` | 0.3 | Domyślna waga czasu |
| `BID_SCORE_EXP_WEIGHT` | 0.2 | Domyślna waga doświadczenia |
| `BID_SCORE_PRESTIGE_WEIGHT` | 0.05 | Domyślna waga prestiżu |
| `BID_SCORE_EXCHANGE_WEIGHT` | 0.03 | Domyślna waga poziomu giełdy |
| `BID_SCORE_STATE_WEIGHT` | 0.02 | Domyślna waga państwowości |

---

## 🧪 Test Scenarios

1. **Scenario A:** Firma niebudowlana (np. "Żywność") zgłasza budowę fabryki
   - Sprawdź: czy ma dev level 1+ i cash 1M+?
   - Utwórz przetarg
   - Sprawdź, czy spółki budowlane widzą przetarg

2. **Scenario B:** Spółka budowlana składa oferty
   - Sprawdź: czy nie przekracza limitu `maxProjects`?
   - Złóż 3 oferty na 3 różne przetargi
   - Sprawdź, czy czwarta oferta jest blokowana

3. **Scenario C:** Zakończenie przetargu
   - Poczekaj na deadline lub zamknij ręcznie
   - Wybierz zwycięzcę (najwyższy score)
   - Rozpocznij budowę

4. **Scenario D:** Realizacja budowy
   - Śledź postęp co tydzień
   - Sprawdź opóźnienia (5% szans)
   - Sprawdź bonus doświadczenia na szybkość
   - Po ukończeniu: dodaj budynek do portfela, zwiększ doświadczenie

5. **Scenario E:** Konsorcjum (opcjonalnie)
   - Utwórz konsorcjum dwóch spółek budowlanych
   - Złóż ofertę jako konsorcjum
   - Sprawdź synergię i rozpad

---

## 📝 Notatki

- Istniejące funkcje są już częściowo zaimplementowane - trzeba je poprawić/dopracować
- UI w `ui.js` jest rozbudowane, ale brakuje formularza zgłoszenia
- W `companies.js` już są dane spółek budowlanych z `constructionStats`
- W `technologies.js` są technologie dla sektora Budowlany
- W `gameCore.js` już jest pętla przetwarzania projektów w `main.js`

---

## 🚀 Next Steps

1. Zatwierdzić plan z użytkownikiem
2. Rozpocząć implementację Fazy 1 (rozszerzenie katalogu)
3. Testować po każdej fazie
4. Dostosowywać parametry na podstawie testów
