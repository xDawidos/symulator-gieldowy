console.log('[diag] player.js loaded');

let playerCash = 10000000.00;
let playerXP = 0;
let playerPortfolio = {};
let playerCommercialLoans = [];
let playerCommercialDeposits = [];
let playerCompany = null;
let workPassiveProgress = 0;
let investmentPool = {
    totalFunds: 0,
    contributors: {}, // Przechowuje wkłady, np. { 'player': 5000, 'ai1': 2000 }
    playerStakes: {},
    investmentTimer: 90000, // Czas do następnej inwestycji (1 minuta)
    INVESTMENT_INTERVAL: 90000 // Stały interwał
};
let playerHasTBillAccess = false;
let city = {
    name: "Miasto",
    population: getRandomIntInRange(25000, 45000), // Startowa populacja
    budget: 1000000, // Startowy budżet miasta
    infrastructureLevel: 1.0, // Mnożnik (1.0 = 100%)
    baseExpenses: 50000, // Stałe wydatki (policja, szkoły) na rok
    mayor: {
        name: "Prezydent Startowy",
        policy: 'balanced', // 'infrastructure', 'business', 'municipal'
        taxModifier: 0, // np. 0.01 lub -0.01
        electionYear: 4 // Wybory co 4 lata (16 kwartałów)
    },
    // Flagi odblokowania przez gracza (ze starego obiektu)
    playerDonatedAmount: 0,
    playerHasUnlocked: false
};
let festival = null;
let playerDeposit = 0;
let nextFestivalCountdown = 0; 
let activeModifiers = [];
let blackPRRiskCounter = 0; 
const BASE_SKILL_COST = 100;
const SKILL_COST_INCREASE_FACTOR = 0.75;
const EMPLOYEE_BASE_SALARY = 100; // Bazowy tygodniowy koszt pracownika
const EQUIPMENT_TYPES = { // Definicje typów sprzętu (można rozbudować)
    'basic_chair': { name: "Ergonomiczne Krzesło", purchaseCost: 300, runningCostMin: 5, runningCostMax: 15, moraleBoost: 0.5, bonusType: 'comfort', bonusValue: 0.01 }, // Np. lekko zmniejsza spadek morale
    'good_computer': { name: "Dobry Komputer", purchaseCost: 1500, runningCostMin: 15, runningCostMax: 40, moraleBoost: 1.0, bonusType: 'performance', bonusValue: 0.03 }, // Np. lekko zwiększa wydajność
    'coffee_machine': { name: "Ekspres do Kawy", purchaseCost: 800, runningCostMin: 20, runningCostMax: 50, moraleBoost: 1.5, bonusType: 'morale_regen', bonusValue: 0.02 } // Np. lekko zwiększa regenerację morale
};

const FESTIVAL_STALL_LEVELS = [
    { level: 1, name: "Miejsce", cost: 1000 },
    { level: 2, name: "Stolik promujący", cost: 1000 },
    { level: 3, name: "Stoisko", cost: 1000 },
    { level: 4, name: "Obszar", cost: 1000 },
    { level: 5, name: "Cała sekcja", cost: 1000 }
];

const PROMOTION_ACTIONS = {
    flyers: { name: "Ulotki", cost: 200, interest: 5 },
    contest: { name: "Konkurs z nagrodami", cost: 500, interest: 10 },
    kids: { name: "Atrakcje dla dzieci", cost: 1000, interest: 10 },
    merch: { name: "Merch festiwalowy", cost: 1200, interest: 12 }
};

// Ustawienia gracza
let playerChartSettings = { type: 'candlestick', lineInterval: 1000, candleInterval: 15000 };
let playerAutoInvest = { isEnabled: false, amount: 100, interval: 30000, timer: 30000 };
let playerStartupAutoInvest = {};
let playerLoan = { amount: 0, weeklyPayment: 0, missedPayments: 0 };
let activePlayerBankBonuses = [];

// --- Umiejętności ---
const skills = {

    'adblock': {
        name: 'AdBlock 🚫',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 1000, description: 'Wyłącza wyskakujące okienka reklamowe w interfejsie gry.' }
        ]
    },

    'work': {
        name: 'Praca ✍️',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 100, description: 'Odblokowuje panel Pracy, gdzie możesz wykonywać proste zadania za pieniądze.' },
            { level: 2, cost: 250, description: 'Zadania stają się łatwiejsze, a nagroda wzrasta do 200 PLN.' },
            { level: 3, cost: 600, description: 'Odblokowuje pracę pasywną (100 PLN co 90 sek.)' },
            { level: 4, cost: 1200, name: 'Własna Firma', description: 'Zakładasz własną firmę! Rozwijaj ją, zatrudniaj pracowników i wprowadź na giełdę.' }
        ]
    },

    'analyticalMind': {
        name: 'Analityczny Umysł 🧠',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 250, description: 'Odblokowuje wgląd w ukryty wskaźnik "Stabilności Zarządu" w opisie spółki.' },
            { level: 2, cost: 600, description: 'Odkrywa plany firmy, pokazując jej "Kolejny Ruch Strategiczny".' },
            { level: 3, cost: 1400, description: 'Daje dostęp do kluczowej oceny "Kompetencji Prezesa", pokazującej jego realne umiejętności zarządcze.' }
        ]
    },
    'ironNerves': {
        name: 'Żelazne Nerwy 🧘',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 250, description: 'Negatywne zdarzenia rynkowe mają o 5% mniejszy wpływ na Twoje akcje.' },
            { level: 2, cost: 600, description: 'Redukcja negatywnych zdarzeń wzrasta do 12%.' },
            { level: 3, cost: 1400, description: 'Redukcja negatywnych zdarzeń wynosi 20%, a dodatkowo zyskujesz niewielką odporność na panikę rynkową (WNR ma na Ciebie mniejszy wpływ).' }
        ]
    },
    'sharkCharisma': {
        name: 'Charyzma Rekina 🦈',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 300, description: 'Otrzymujesz o 0.5% lepszą cenę przy każdej transakcji kupna i sprzedaży.' },
            { level: 2, cost: 750, description: 'Bonus do ceny transakcji wzrasta do 1%.' },
            { level: 3, cost: 1600, description: 'Bonus do ceny transakcji wzrasta do 1.5%, a dodatkowo Twoje transakcje generują o 10% więcej XP.' }

        ]
    },
    'hardNegotiator': {
        name: 'Twardy Negocjator 💼',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 300, description: 'Zmniejsza oprocentowanie naliczane od zaciągniętych pożyczek o 10%.' },
            { level: 2, cost: 700, description: 'Redukcja oprocentowania pożyczek wzrasta do 20%.' },
            { level: 3, cost: 1500, description: 'Redukcja oprocentowania wynosi 25%, a dodatkowo Twój maksymalny limit kredytowy jest o 10% wyższy.' }

        ]
    },
    'bankMagnet': {
        name: 'Bankowy Magnes 🧲',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 450, description: 'Zwiększa oprocentowanie depozytów bankowych o 10%.' },
            { level: 2, cost: 900, description: 'Bonus do oprocentowania depozytów wzrasta do 20%.' },
            { level: 3, cost: 1800, description: 'Bonus do oprocentowania wynosi 25%, a dodatkowo otrzymujesz cotygodniowy bonus XP za utrzymywanie dużego depozytu (powyżej 100 000 PLN).' }

        ]
    },
    'dividendAnalyst': {
        name: 'Analityk Dywidend 🧐',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 300, description: 'Odblokowuje Panel Dywidend, pokazujący, które firmy wkrótce wypłacą dywidendę.' },
            { level: 2, cost: 700, description: 'Panel Dywidend pokazuje teraz dokładny czas pozostały do wypłaty.' },
            { level: 3, cost: 1500, description: 'Panel Dywidend pokazuje teraz szacowaną wysokość dywidendy na akcję.' }
        ]
    },
    'financialAnalyst': {
        name: 'Analityk Finansowy 🧐',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 500, description: 'Odblokowuje wgląd w ostatnie raporty finansowe spółek w tabeli rynku.' }
        ]
    },
    'etfExpert': {
        name: 'Ekspert Rynków Globalnych 🌍',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 300, description: 'Odblokowuje dostęp do handlu funduszami ETF.' },
            { level: 2, cost: 1000, description: 'Jeszcze nie dodano' },// dodaje etf top 5 i 15 i 10 oprócz 5 pierwszych, największych spółek
            { level: 3, cost: 1800, description: 'jeszcze nie dodano' } //dodaj możliwość tworzenia własnego etf
        ]
    },
    'insiderAccess': {
        name: 'Dostęp Poufny 💼',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 150, description: 'Otrzymujesz 10% szans na ofertę prywatnej emisji akcji po cenie niższej o 10%.' },
            { level: 2, cost: 400, name: 'Nagięcia na giełdzie', description: 'W ofercie prywatnej możesz zadeklarować chęć kupna o 10% więcej akcji, niż wynika z Twojego udziału.' },
            { level: 3, cost: 1000, name: 'Twardy negocjator', description: 'Cena akcji w ofercie prywatnej jest niższa o dodatkowe 15%.' }
        ]
    },
    'sanEscobar': {
        name: 'Znajomości w San Escobar 🌴',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 2000, description: 'Obniża podatek od dywidend, zysków kapitałowych i miejski o 5% wartości podatku.' },
            { level: 2, cost: 8000, name: 'Firma w Raju', description: 'Całkowicie usuwa podatek dochodowy od Twojej firmy (jeśli ją posiadasz) i obniża podatek od bogactwa o 3 punkty procentowe (np. z 25% na 22%).' },
            { level: 3, cost: 25000, name: 'Obywatel Wyspy', description: 'Usuwa dwa najwyższe progi podatku od bogactwa (35% i 50%), a najniższy próg (25%) obniża do 5%.' },
            { level: 4, cost: 100000, name: 'Przepisanie Majątku', description: 'Całkowite usunięcie wszystkich podatków! UWAGA: Istnieje roczne ryzyko kontroli skarbowej, która może wyzerować poziomy tej umiejętności!' }
        ],
        // Dodajemy flagę do śledzenia ryzyka kontroli
        hasRiskActive: false
    },
    'sixthSense': {
        name: 'Szósty Zmysł 💡',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 200, description: 'Niewielka szansa na otrzymanie prywatnego "przeczucia" o przyszłych wynikach losowej firmy.' },
            { level: 2, cost: 500, description: 'Twoje "przeczucia" wskazują teraz, czy nadchodzące wydarzenie będzie pozytywne, czy negatywne.' }
        ]
    },

    'indexAnalystLvl1': {
        name: 'Analityk Indeksowy 📈',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 150, description: 'Odblokowuje podgląd podstawowych indeksów giełdowych (GIG, TIG5, SIG20) na pulpicie.' },
            { level: 2, cost: 350, description: 'Odblokowuje możliwość handlu jednostkami głównych indeksów giełdowych.', requires: { skillId: 'indexAnalystLvl1', level: 1 } },
            { level: 3, cost: 550, description: 'Odblokowuje "Wskaźnik Niestabilności Rynku" (WNR).', requires: { skillId: 'indexAnalystLvl1', level: 2 } }
        ]
    },
    'nepotism': {
        name: 'Nepotyzm 🤝',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 1200, description: 'Pozwala Ci inwestować w strategiczne Spółki Skarbu Państwa.' }
        ]
    },
    'startupInvestor': {
        name: 'Anioł Biznesu 👼',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 800, description: 'Odblokowuje dostęp do "Inkubatora Start-upów", pozwalając na inwestowanie w ryzykowne, młode firmy.' },
            { level: 2, cost: 1500, description: 'Twoje doświadczenie i wsparcie zapewniają każdemu start-upowi, w który zainwestujesz, stały bonus +5% do szansy na sukces.' },
            { level: 3, cost: 3000, description: 'Twoja intuicja pozwala Ci z 15% szansą natychmiast wykryć, że dany start-up to oszustwo.' },
            { level: 4, cost: 5000, description: 'BFG – odblokowuje możliwość wykupienia "ubezpieczenia" dla inwestycji w start-up. W razie porażki odzyskasz 75% zainwestowanych środków.' },
            { level: 5, cost: 7500, description: '(Prywatyzacja) Możliwość kupienia start-upu na wyłączność. Gwarantuje to sukces projektu, ale jego szansa na porażkę zamienia się w ryzyko dodatkowych kosztów lub opóźnień.' },
            { level: 6, cost: 10000, description: 'Twoja zdolność do wykrywania oszustw wzrasta do 50%.' }
        ]
    },

      'charisma': {
        name: 'Charyzma 🌟',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 400, description: 'Twoja reputacja Cię wyprzedza. Negatywne efekty zdarzeń losowych i Twoich działań (jak wymuszona dywidenda) są zmniejszone o 15%.' },
            { level: 2, cost: 900, description: 'Twój bazowy poziom reputacji we wszystkich spółkach startuje od 10 (zamiast 0). Reputacja nigdy nie spadnie poniżej 10.' },
            { level: 3, cost: 2000, description: 'Twoje datki na rzecz spółek (poprawiające reputację) są o 25% bardziej efektywne.' },
            { level: 4, cost: 4500, description: 'Mistrz dyplomacji. Redukcja negatywnych efektów (z Poziomu 1) wzrasta do 50%.' },
            { level: 5, cost: 10000, description: 'Ikona Biznesu. Jeśli posiadasz ponad 70% akcji w spółce, Twoja reputacja w niej nigdy nie spadnie poniżej Neutralnej (0), nawet jeśli normalnie wynosiłaby 10 (z Poziomu 2).' }
        ]
    },

    // ZMIANA OD KOLEGI: Dodano nową umiejętność "Księgowy"
    'accountant': {
        name: 'Księgowy 🧐',
        unlockedLevel: 0,
        levels: [
            {
                level: 1,
                cost: 600, // Przykładowy koszt XP
                description: 'Odblokowuje możliwość wglądu w podstawowe finanse ("faktury") spółki za opłatą 2000 PLN. Dostęp może być zablokowany przy negatywnych relacjach.'
            },
            {
                level: 2,
                cost: 1500, // Przykładowy koszt XP
                description: 'Wgląd w finanse jest darmowy dla spółek, w których posiadasz ponad 50% akcji.'
            },
            {
                level: 3,
                cost: 3500, // Przykładowy koszt XP
                description: 'Twoje doświadczenie pozwala Ci wykrywać anomalie. Zyskujesz 15% szans przy każdym wglądzie w finanse na wykrycie nieprawidłowości (co może zapobiec negatywnemu zdarzeniu) lub ukrytego potencjału (co może dać mały bonus).'
            }
        ]
    },

    'mediaManipulation': {
        name: 'Wpływ na Media 📰',
        unlockedLevel: 0,
        levels: [
            { 
                level: 1, 
                cost: 3000, 
                description: 'Odblokowuje możliwość kupowania artykułów sponsorowanych (Pozytywny PR) w gazecie "Puls Rynku" dla spółek, w których masz większość.' 
            },
            { 
                level: 2, 
                cost: 7000, 
                description: 'Odblokowuje "Czarny PR" - możliwość szkalowania konkurencji (ryzykowne).', 
                requires: { skillId: 'mediaManipulation', level: 1 } 
            }
        ]
    }
    
};

function isSkillUnlocked(skillId) {
    return skills[skillId] && skills[skillId].unlockedLevel > 0;
}

function getSkillLevel(skillId) {
    return skills[skillId] ? skills[skillId].unlockedLevel : 0;
}

function getNextSkillLevelInfo(skillId) {
    const skill = skills[skillId];
    if (!skill) return null;
    const currentLevel = skill.unlockedLevel;
    return skill.levels.find(l => l.level === currentLevel + 1);
}

// --- Funkcje Gracza ---

function calculateNetWorth(entity) {
    let value = (entity === 'player') ? playerCash : entity.cash;
    const portfolio = (entity === 'player') ? playerPortfolio : entity.portfolio;
    for (const symbol in portfolio) {
        const holding = portfolio[symbol];
        if (holding.assetType === 'Startup') {
            value += holding.investedAmount; // Uproszczona wycena startupu
        } else {
            const marketData = stocks.find(s => s.symbol === symbol) || etfs.find(e => e.symbol === symbol) || marketIndexes.find(i => i.id === symbol);
            if (marketData) {
                value += (marketData.price || marketData.value || 0) * holding.shares;
            }
        }
    }
    
    const bonds = (entity === 'player') ? allBonds.filter(b => b.ownerId === 'player') : (entity.tBills || []); 
    
    value += bonds.length * 1000; 

    return value;
}

function buyStock(symbol, quantity) {
    if (isPlayerInDefault && isPlayerInDefault()) return; 
    
    const stockToBuy = stocks.find(stock => stock.symbol === symbol);
    if (!stockToBuy) {
        alert("Błąd systemowy: Nie znaleziono takiej akcji!");
        return;
    }
    if (stockToBuy.isStateOwned && getSkillLevel('nepotism') === 0) {
        alert("Nie masz odpowiednich znajomości, aby inwestować w tę strategiczną spółkę Skarbu Państwa!");
        return;
    }
    if (stockToBuy.isTradeLocked) {
        alert(`Handel akcjami ${stockToBuy.name} jest tymczasowo wstrzymany!`);
        return;
    }

    // Obliczamy dostępne akcje
    let sharesAvailableToBuy;
    if (stockToBuy.isStateOwned) {
        const publicFloat = Math.floor(stockToBuy.totalShares * (1 - stockToBuy.stateOwnershipPct));
        sharesAvailableToBuy = publicFloat - stockToBuy.sharesHeld;
    } else {
        sharesAvailableToBuy = stockToBuy.totalShares - stockToBuy.sharesHeld;
    }

    // Poprawka błędu: używamy poprawnej nazwy zmiennej w warunku
    if (quantity > sharesAvailableToBuy) {
        alert(`Nie ma wystarczającej liczby akcji na rynku! Dostępne: ${sharesAvailableToBuy}`);
        return;
    }

    let totalCost = stockToBuy.price * quantity;
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        if (charismaLevel === 1) charismaBonus = 0.005;
        if (charismaLevel === 2) charismaBonus = 0.01;
        if (charismaLevel === 3) charismaBonus = 0.015;
        totalCost *= (1 - charismaBonus);
    }

    if (playerCash < totalCost) {
        alert("Nie masz wystarczająco gotówki, aby dokonać tego zakupu!");
        return;
    }

    // Transakcja
    playerCash -= totalCost;
    stockToBuy.sharesHeld += quantity;
    
    // Wpływ na cenę
    stockToBuy.price += (quantity * stockToBuy.price) * 0.000005;

    // Logika transakcji
    if (!stockToBuy.playerTransactions) stockToBuy.playerTransactions = [];
    stockToBuy.playerTransactions.push({
        type: 'buy',
        time: Date.now(),
        price: stockToBuy.price,
        quantity: quantity
    });

    if (playerPortfolio[symbol]) {
        const existingHolding = playerPortfolio[symbol];
        const oldTotalValue = existingHolding.avgPrice * existingHolding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        existingHolding.shares += quantity;
        existingHolding.avgPrice = newTotalValue / existingHolding.shares;
    } else {
        playerPortfolio[symbol] = {
            shares: quantity,
            avgPrice: stockToBuy.price,
            assetType: 'stock' // Ważne dla portfolio
        };
    }

    // Reputacja za duży pakiet
    const playerShares = playerPortfolio[symbol]?.shares || 0;
    const ownershipPct = (playerShares / stockToBuy.totalShares) * 100;
    if (ownershipPct > 50) {
        const repGain = Math.floor(quantity / 100) * 0.5;
        if (repGain > 0) {
            changeReputation('player', symbol, repGain);
        }
    }

    displayCash();
    displayStocks(getCurrentInputValues());
    displayPortfolio();
    checkPlayerTierUpgrade();
}


function sellStock(symbol, quantity) {
    const stockToSell = stocks.find(stock => stock.symbol === symbol);
    const holding = playerPortfolio[symbol];

    if (!holding || holding.shares < quantity) {
        alert(`Nie masz wystarczającej liczby akcji ${stockToSell ? stockToSell.name : symbol}.`);
        return;
    }

    if (stockToSell.isTradeLocked) {
        alert(`Handel akcjami ${stockToSell.name} jest tymczasowo wstrzymany!`);
        return;
    }

    let totalGain = stockToSell.price * quantity;
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        if (charismaLevel === 1) charismaBonus = 0.005;
        if (charismaLevel === 2) charismaBonus = 0.01;
        if (charismaLevel === 3) charismaBonus = 0.015;
        totalGain *= (1 + charismaBonus);
    }

    const purchaseValue = holding.avgPrice * quantity; // Koszt zakupu sprzedawanych akcji
    const profit = totalGain - purchaseValue; // Zysk brutto z transakcji

    let taxToPay = 0;
    let xpGained = 0;

    // ---> NOWOŚĆ: Obliczanie podatku i XP <---
    if (profit > 0) {
        let taxRateCapitalGains = TAX_RATES.capitalGains;
        let playerTaxModifier = 1.0;
        const sanEscobarLvl = getSkillLevel('sanEscobar');
        if (sanEscobarLvl >= 1) playerTaxModifier = 0.95;
        if (sanEscobarLvl >= 4) playerTaxModifier = 0.0;

        taxToPay = profit * taxRateCapitalGains * playerTaxModifier;
        governmentTreasury += taxToPay; // Podatek do budżetu

        // XP liczymy od zysku PRZED podatkiem, aby San Escobar nie zmniejszał XP
        xpGained = profit / 100;
        if (getSkillLevel('sharkCharisma') === 3) xpGained *= 1.10;
        if (stockToSell.ceo?.traits?.some(t => t.id === 'patron')) xpGained *= 1.10;
    }
    // ---> KONIEC NOWOŚCI <---

    const totalGainNet = totalGain - taxToPay; // Przychód netto po podatku

    if (xpGained > 0) {
        playerXP += xpGained;
        displayXP();
    }

    playerCash += totalGainNet; // Gracz otrzymuje kwotę netto
    holding.shares -= quantity;
    stockToSell.sharesHeld -= quantity;
    stockToSell.price -= (quantity * stockToSell.price) * 0.000005;

    // Logowanie z informacją o podatku
    logEvent(`Sprzedano ${quantity} szt. ${symbol}. Zysk brutto: ${profit.toFixed(2)} PLN, Podatek: ${taxToPay.toFixed(2)} PLN.`);

    if (holding.shares === 0) {
        stockToSell.playerTransactions = [];
        delete playerPortfolio[symbol];
    }

    displayCash();
    displayStocks(getCurrentInputValues());
    displayPortfolio();
    checkPlayerTierUpgrade();
}

function sellAllShares(symbol) {
    const holding = playerPortfolio[symbol];
    if (!holding || holding.shares <= 0) {
        alert("Nie posiadasz akcji tej spółki.");
        return;
    }
    
    sellStock(symbol, holding.shares);
}

function buyEtf(symbol, quantity) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    if (getSkillLevel('etfExpert') === 0) { // POPRAWKA WARUNKU
        alert("Musisz odblokować umiejętność 'Ekspert Rynków Globalnych', aby handlować funduszami ETF!");
        return;
    }

    const etfToBuy = etfs.find(e => e.symbol === symbol);
    if (!etfToBuy) {
        alert("Błąd systemowy: Nie znaleziono takiego funduszu ETF!");
        return;
    }

    let totalCost = etfToBuy.price * quantity;
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        switch (charismaLevel) {
            case 1: charismaBonus = 0.005; break; // 0.5%
            case 2: charismaBonus = 0.01; break;  // 1.0%
            case 3: charismaBonus = 0.015; break; // 1.5%
        }
        totalCost *= (1 - charismaBonus); // Przy sprzedaży dodajemy bonus
    }

    if (playerCash < totalCost) {
        alert("Nie masz wystarczająco gotówki, aby dokonać tego zakupu!");
        return;
    }

    playerCash -= totalCost;

    if (playerPortfolio[symbol]) {
        const existingHolding = playerPortfolio[symbol];
        const oldTotalValue = existingHolding.avgPrice * existingHolding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        existingHolding.shares += quantity;
        existingHolding.avgPrice = newTotalValue / existingHolding.shares;
    } else {
        playerPortfolio[symbol] = {
            shares: quantity,
            avgPrice: etfToBuy.price,
            assetType: 'etf'
        };
    }

    displayCash();
    displayPortfolio();
    checkPlayerTierUpgrade();
}

function sellEtf(symbol, quantity) {
    const etfToSell = etfs.find(e => e.symbol === symbol);
    const holding = playerPortfolio[symbol];

    // Sprawdzenie umiejętności i podstawowa walidacja
    if (getSkillLevel('etfExpert') === 0) {
        alert("Musisz odblokować umiejętność 'Ekspert Rynków Globalnych', aby handlować funduszami ETF!");
        return;
    }
    if (!etfToSell || !holding || holding.shares < quantity || quantity <= 0) {
        alert(`Nie masz wystarczającej liczby jednostek ${etfToSell ? etfToSell.name : symbol}. Posiadasz: ${holding ? holding.shares : 0}`);
        return;
    }

    let totalGainGross = etfToSell.price * quantity; // Przychód brutto
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        switch (charismaLevel) {
            case 1: charismaBonus = 0.005; break;
            case 2: charismaBonus = 0.01; break;
            case 3: charismaBonus = 0.015; break;
        }
        totalGainGross *= (1 + charismaBonus); // Dodajemy bonus do przychodu brutto
    }

    const purchaseValue = holding.avgPrice * quantity; // Koszt zakupu sprzedawanych jednostek
    const profit = totalGain - purchaseValue;// Zysk brutto

    let taxToPay = 0;
    let xpGained = 0;

    // --- NOWOŚĆ: Obliczanie podatku i XP ---
    if (profit > 0) {
        let taxRateCapitalGains = TAX_RATES.capitalGains;
        let playerTaxModifier = 1.0;
        const sanEscobarLvl = getSkillLevel('sanEscobar');
        if (sanEscobarLvl >= 1) playerTaxModifier = 0.95; // Lvl 1: 5% zniżki
        if (sanEscobarLvl >= 4) playerTaxModifier = 0.0; // Lvl 4: 0% podatku

        taxToPay = profit * taxRateCapitalGains * playerTaxModifier;
        governmentTreasury += taxToPay; // Podatek do budżetu

        // XP liczymy od zysku PRZED podatkiem
        xpGained = profit / 100;
        // Bonus XP z Charyzmy Rekina (jeśli jest)
        if (getSkillLevel('sharkCharisma') === 3) xpGained *= 1.10;
        // W ETFach nie ma cechy 'Patron'
    }
    // --- KONIEC NOWOŚCI ---

    const totalGainNet = totalGain - taxToPay; // Przychód netto po podatku

    if (xpGained > 0) {
        playerXP += xpGained;
        displayXP();
    }

    playerCash += totalGainNet; // Gracz otrzymuje kwotę netto
    holding.shares -= quantity;

    logEvent(`Sprzedano ${quantity} jedn. ETF ${symbol}. Zysk brutto: ${profit.toFixed(2)} PLN, Podatek: ${taxToPay.toFixed(2)} PLN.`);

    if (holding.shares <= 0.001) { // Użyj progu dla bezpieczeństwa
        delete playerPortfolio[symbol];
    }

    displayCash();
    displayPortfolio();
    checkPlayerTierUpgrade(); // Sprawdzenie awansu gracza
}

function buyIndex(indexId, quantity) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    // Sprawdzenie, czy gracz ma odblokowaną umiejętność Poziomu 2
    if (getSkillLevel('indexAnalystLvl1') < 2) {
        alert("Musisz odblokować umiejętność 'Makler Indeksowy' (Analityk Indeksowy poz. 2), aby handlować indeksami!");
        return;
    }

    const indexToBuy = marketIndexes.find(i => i.id === indexId);
    if (!indexToBuy) {
        alert("Błąd systemowy: Nie znaleziono takiego indeksu!");
        return;
    }

    let totalCost = indexToBuy.value * quantity;
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        switch (charismaLevel) {
            case 1: charismaBonus = 0.005; break; // 0.5%
            case 2: charismaBonus = 0.01; break;  // 1.0%
            case 3: charismaBonus = 0.015; break; // 1.5%
        }
        totalCost *= (1 - charismaBonus); // Przy sprzedaży dodajemy bonus
    }

    if (playerCash < totalCost) {
        alert("Nie masz wystarczająco gotówki, aby dokonać tego zakupu!");
        return;
    }

    playerCash -= totalCost;

    // Aktualizacja portfela
    if (playerPortfolio[indexId]) {
        const holding = playerPortfolio[indexId];
        const oldTotalValue = holding.avgPrice * holding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        holding.shares += quantity;
        holding.avgPrice = newTotalValue / holding.shares;
    } else {
        playerPortfolio[indexId] = {
            shares: quantity,
            avgPrice: indexToBuy.value,
            assetType: 'index' // Ważne do identyfikacji w portfelu!
        };
    }

    displayCash();
    displayPortfolio();
}

function sellIndex(indexId, quantity) {
    const indexToSell = marketIndexes.find(i => i.id === indexId);
    const holding = playerPortfolio[indexId];

    // Sprawdzenie umiejętności i podstawowa walidacja
    if (getSkillLevel('indexAnalystLvl1') < 2) { // Wymagany Poziom 2 Analityka Indeksowego
        alert("Musisz odblokować umiejętność 'Makler Indeksowy' (Analityk Indeksowy poz. 2), aby handlować indeksami!");
        return;
    }
    if (!indexToSell || !holding || holding.shares < quantity || quantity <= 0) {
        alert(`Nie masz wystarczającej liczby jednostek ${indexToSell ? indexToSell.name : indexId}. Posiadasz: ${holding ? holding.shares : 0}`);
        return;
    }

    let totalGainGross = indexToSell.value * quantity; // Przychód brutto
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        switch (charismaLevel) {
            case 1: charismaBonus = 0.005; break;
            case 2: charismaBonus = 0.01; break;
            case 3: charismaBonus = 0.015; break;
        }
        totalGainGross *= (1 + charismaBonus); // Dodajemy bonus do przychodu brutto
    }

    const purchaseValue = holding.avgPrice * quantity; // Koszt zakupu sprzedawanych jednostek
    const profit = totalGain - purchaseValue;// Zysk brutto

    let taxToPay = 0;
    let xpGained = 0;

    // --- NOWOŚĆ: Obliczanie podatku i XP ---
    if (profit > 0) {
        let taxRateCapitalGains = TAX_RATES.capitalGains;
        let playerTaxModifier = 1.0;
        const sanEscobarLvl = getSkillLevel('sanEscobar');
        if (sanEscobarLvl >= 1) playerTaxModifier = 0.95; // Lvl 1: 5% zniżki
        if (sanEscobarLvl >= 4) playerTaxModifier = 0.0; // Lvl 4: 0% podatku

        taxToPay = profit * taxRateCapitalGains * playerTaxModifier;
        governmentTreasury += taxToPay; // Podatek do budżetu

        // XP liczymy od zysku PRZED podatkiem
        xpGained = profit / 100;
        // Bonus XP z Charyzmy Rekina (jeśli jest)
        if (getSkillLevel('sharkCharisma') === 3) xpGained *= 1.10;
        // W Indeksach nie ma cechy 'Patron'
    }
    // --- KONIEC NOWOŚCI ---

    const totalGainNet = totalGain - taxToPay;// Przychód netto po podatku

    if (xpGained > 0) {
        playerXP += xpGained;
        displayXP();
    }

    playerCash += totalGainNet; // Gracz otrzymuje kwotę netto
    holding.shares -= quantity;

    logEvent(`Sprzedano ${quantity} jedn. indeksu ${indexId}. Zysk brutto: ${profit.toFixed(2)} PLN, Podatek: ${taxToPay.toFixed(2)} PLN.`);

    if (holding.shares <= 0.001) { // Użyj progu dla bezpieczeństwa
        delete playerPortfolio[indexId];
    }

    displayCash();
    displayPortfolio();
    checkPlayerTierUpgrade(); // Sprawdzenie awansu gracza
}

function upgradeHR() {
    if (!playerCompany) return;
    if (playerCompany.hrLevel >= 10) return;

    const cost = 5000 * Math.pow(1.5, playerCompany.hrLevel); // Przykładowy koszt
    
    if (playerCash >= cost) {
        playerCash -= cost;
        playerCompany.hrLevel++;
        logEvent(`🏢 Dział HR ulepszony do poziomu ${playerCompany.hrLevel}.`, 'success');
        displayCash();
        if (typeof openWorkModal === 'function') openWorkModal(); // Odśwież UI
    } else {
        alert("Brak środków na ulepszenie HR.");
    }
}

// ZASTĄP ISTNIEJĄCĄ FUNKCJĘ updateCompanyStatus PONIŻSZĄ WERSJĄ (Z POPRAWKĄ PODATKOWĄ):
function updateCompanyStatus() {
    if (getSkillLevel('work') < 4 || playerCompany === null) return;

    const now = Date.now();
    if (now - playerCompany.lastIncomeTime >= playerCompany.incomeInterval) {
        let incomeBeforeTax = 0;
        let workingEmployeesCount = 0;

        // 1. Oblicz przychód z pracowników
        playerCompany.employees.forEach(employee => {
            if (employee.status === 'working') {
                workingEmployeesCount++;
                const effectivePerformance = employee.performance * (0.8 + employee.morale / 250);
                // Bonusy ze sprzętu
                let equipmentPerformanceBonus = 1.0;
                playerCompany.equipment.forEach(eq => {
                     if (eq.bonusType === 'performance') {
                         equipmentPerformanceBonus += eq.bonusValue * eq.quantity / Math.max(1, playerCompany.employees.length);
                     }
                });
                
                incomeBeforeTax += playerCompany.baseIncomePerEmployee * effectivePerformance * equipmentPerformanceBonus;
            }
        });

        // 2. === POPRAWKA PODATKOWA ===
        let taxToPay = 0;
        const sanEscobarLvl = getSkillLevel('sanEscobar');
        const rates = TAX_RATES.companyIncome; // Pobierz z economy.js

        let taxRate = 0;
        // Sprawdź progi (zakładamy, że rates[1] to wyższy próg)
        if (incomeBeforeTax > rates[1].threshold) {
            taxRate = rates[1].rate;
        } else {
            taxRate = rates[0].rate;
        }

        // Skill Lvl 2 "Firma w Raju" znosi podatek dochodowy firmy
        if (sanEscobarLvl >= 2) {
            taxRate = 0;
        }

        taxToPay = incomeBeforeTax * taxRate;
        governmentTreasury += taxToPay;
        // ===========================

        const incomeAfterTax = incomeBeforeTax - taxToPay;
        playerCash += incomeAfterTax;
        playerCompany.lastIncomeTime = now;
        
        // Zaktualizuj wartość firmy (uproszczona wycena)
        const estimatedAnnualIncome = incomeAfterTax * ( (BASE_DELAYS.quarterly * 4) / playerCompany.incomeInterval );
        playerCompany.value = playerCompany.cashInvested + (estimatedAnnualIncome * 1.5) + (playerCompany.employees.length * 1000);

        logEvent(`🏢 Twoja firma wygenerowała ${incomeAfterTax.toFixed(2)} PLN zysku netto (Podatek: ${taxToPay.toFixed(2)} PLN).`, 'review');
        displayCash();
        
        // Odśwież UI jeśli otwarte
        if (typeof openWorkModal === 'function' && document.getElementById('work-modal').style.display === 'block') {
             // Tu można by wywołać odświeżenie konkretnych elementów
        }
    }
}

function foundPlayerCompany() {
    if (playerCompany === null && getSkillLevel('work') >= 4) { // Sprawdźmy poziom umiejętności
        playerCompany = {
            name: "Twoja Firma", // Można pozwolić graczowi zmienić
            value: 0,
            employees: [], // ---> ZMIANA: Teraz to tablica obiektów <---
            equipment: [], // ---> NOWOŚĆ: Tablica obiektów sprzętu <---
            cashInvested: 0,
            baseIncomePerEmployee: 100, // Zmieniono nazwę dla jasności
            incomeInterval: 90000,
            lastIncomeTime: Date.now(),
            hrLevel: 0 // ---> NOWOŚĆ: Poziom HR <---
        };
        logEvent('🏢 Gratulacje! Założyłeś Własną Firmę!', 'review');
        // Od razu zatrudnijmy pierwszego pracownika (placeholder)
        // hireEmployee('initial'); // Wywołamy to po zdefiniowaniu funkcji
    }
}

function hireEmployee(source = 'manual') { // source może być 'initial' lub 'manual'
    if (!playerCompany) return;

    // Na razie prosty koszt zatrudnienia (później zastąpiony pierwszym wynagrodzeniem)
    const hiringCost = source === 'initial' ? 0 : 500; // Pierwszy pracownik darmowy

    if (source !== 'initial' && playerCash < hiringCost) {
        alert(`Nie stać Cię na zatrudnienie nowego pracownika (koszt: ${hiringCost} PLN).`);
        return;
    }
    if (source !== 'initial') playerCash -= hiringCost;

    const newEmployee = {
        id: Date.now() + Math.random(), // Proste unikalne ID
        name: generateEmployeeName(),
        performance: getRandomInRange(0.75, 1.25), // Wydajność 75% - 125% normy
        salary: EMPLOYEE_BASE_SALARY * (0.8 + Math.random() * 0.4), // Pensja +/- 20% od bazy
        morale: getRandomIntInRange(60, 80), // Startowe morale
        status: 'working', // 'working', 'vacation', 'sick'
        contractType: Math.random() < 0.7 ? 'permanent' : 'mandate', // Domyślnie 70% na stałe
        vacationEnds: 0 // Kiedy kończy się urlop
    };

    playerCompany.employees.push(newEmployee);
    logEvent(`👨‍💼 Zatrudniono nowego pracownika: ${newEmployee.name} (Wydajność: ${Math.round(newEmployee.performance*100)}%).`);
    if (source !== 'initial') displayCash();

    // Odśwież UI firmy
    if (document.getElementById('work-modal')?.style.display === 'block') {
        openWorkModal();
    }
}

function generateEmployeeName() {
    const isFemale = Math.random() < 0.5;
    const firstName = isFemale ? getRandomElement(femaleFirstNames) : getRandomElement(maleFirstNames);
    const lastNameInitial = getRandomElement(ceoLastNames).charAt(0) + ".";
    return `${firstName} ${lastNameInitial}`;
}

/** Funkcja do zatrudniania (na razie uproszczona, bez wyboru kontraktu) */


/** Funkcja do zwalniania pracownika */
function fireEmployee(employeeId, quit = false) { // quit=true oznacza, że sam odchodzi
    if (!playerCompany) return;
    const index = playerCompany.employees.findIndex(emp => emp.id === employeeId);
    if (index === -1) return;

    const firedEmployee = playerCompany.employees.splice(index, 1)[0];

    if (quit) {
        logEvent(`🚶 Pracownik ${firedEmployee.name} odszedł z firmy z powodu niskiego morale.`);
        showToast(`${firedEmployee.name} odchodzi z firmy!`, 'warning');
        // Brak dodatkowych kar za odejście
    } else {
        logEvent(`🔥 Zwolniono pracownika: ${firedEmployee.name}. Pozostali pracownicy są zaniepokojeni.`);
        // Kara do morale dla pozostałych
        applyMoralePenalty(playerCompany.employees, 5); // Np. -5 morale
        // Można dodać koszt odprawy
        const severancePay = firedEmployee.salary * 2; // Np. 2 tygodnie pensji
        if (playerCash >= severancePay) {
            playerCash -= severancePay;
            logEvent(`💸 Wypłacono ${severancePay.toFixed(2)} PLN odprawy dla ${firedEmployee.name}.`);
        } else {
            logEvent(`🚨 Brak środków na pełną odprawę dla ${firedEmployee.name}! Morale spada jeszcze bardziej!`);
            applyMoralePenalty(playerCompany.employees, 5); // Dodatkowa kara
        }
        displayCash();
    }


    // Odśwież UI firmy
    if (document.getElementById('work-modal')?.style.display === 'block') {
        openWorkModal();
    }
}

function buyEquipment(equipmentId, quantity = 1) {
    if (!playerCompany || quantity <= 0) return;
    const equipmentData = EQUIPMENT_TYPES[equipmentId];
    if (!equipmentData) {
        alert("Nieznany typ sprzętu!");
        return;
    }

    // Sprawdzenie limitu: nie więcej sprzętu niż pracowników
    const totalEquipment = playerCompany.equipment.reduce((sum, eq) => sum + eq.quantity, 0);
    if (totalEquipment + quantity > playerCompany.employees.length) {
        alert("Nie możesz mieć więcej sprzętu niż pracowników!");
        return;
    }

    const totalCost = equipmentData.purchaseCost * quantity;
    if (playerCash < totalCost) {
        alert(`Nie masz wystarczająco gotówki! Potrzebujesz ${totalCost.toFixed(2)} PLN.`);
        return;
    }

    playerCash -= totalCost;

    // Dodaj sprzęt do firmy
    const existingEquipment = playerCompany.equipment.find(eq => eq.id === equipmentId);
    if (existingEquipment) {
        existingEquipment.quantity += quantity;
    } else {
        playerCompany.equipment.push({
            id: equipmentId,
            name: equipmentData.name,
            quantity: quantity,
            runningCostMin: equipmentData.runningCostMin,
            runningCostMax: equipmentData.runningCostMax,
            bonusType: equipmentData.bonusType,
            bonusValue: equipmentData.bonusValue,
            moraleBoost: equipmentData.moraleBoost
        });
    }

    logEvent(`🛒 Zakupiono ${quantity} szt. sprzętu "${equipmentData.name}" dla firmy za ${totalCost.toFixed(2)} PLN.`);
    displayCash();
    // Odśwież UI firmy, jeśli otwarte
    if (document.getElementById('work-modal')?.style.display === 'block') {
        openWorkModal();
    }
}

function updateAllEmployeeMorale() {
    if (!playerCompany || playerCompany.employees.length === 0) return;

    const employeeCount = playerCompany.employees.length;
    const totalEquipment = playerCompany.equipment.reduce((sum, eq) => sum + eq.quantity, 0);
    // Stosunek sprzętu do pracowników (idealnie 1 sprzęt na 5 pracowników = 0.2)
    const equipmentRatio = employeeCount > 0 ? totalEquipment / employeeCount : 0;
    const idealRatio = 0.2;
    // Bonus/Kara za sprzęt: od -10 (brak sprzętu) do +10 (dużo sprzętu)
    const equipmentMoraleEffect = (equipmentRatio - idealRatio) * 50;

    // Bonus za sprzęt specjalny (np. ekspres do kawy)
    let specialEquipmentBonus = 0;
    playerCompany.equipment.forEach(eq => {
         if (eq.bonusType === 'morale_regen' || eq.bonusType === 'comfort') {
             specialEquipmentBonus += eq.moraleBoost * eq.quantity;
         }
    });
    // Rozłóż bonus równo na pracowników (ale nie więcej niż +5 na głowę)
    specialEquipmentBonus = Math.min(5, specialEquipmentBonus / employeeCount);


    playerCompany.employees.forEach(employee => {
        let moraleChange = 0;

        // Wpływ sprzętu ogólnego
        moraleChange += equipmentMoraleEffect / 10; // Rozłożony na 10 "tygodni"

        // Wpływ sprzętu specjalnego
        moraleChange += specialEquipmentBonus / 10;

        // Lekki spadek morale z czasem (zmęczenie)
        moraleChange -= 0.5;

        // Losowy czynnik
        moraleChange += getRandomInRange(-0.5, 0.5);

        // Zastosuj zmianę morale
        employee.morale += moraleChange;
        employee.morale = Math.max(0, Math.min(100, employee.morale)); // Ogranicz 0-100

        // Szansa na urlop (jeśli morale < 30) lub chorobowe (jeśli < 15)
        if (employee.status === 'working' && employee.morale < 30 && Math.random() < 0.02) {
             employee.status = 'vacation';
             const vacationDuration = getRandomIntInRange(1, 2) * BASE_DELAYS.weekly / currentSpeedMultiplier; // 1-2 tyg urlopu
             employee.vacationEnds = Date.now() + vacationDuration;
             logEvent(`🏖️ Pracownik ${employee.name} bierze urlop z powodu niskiego morale.`);
        } else if (employee.status === 'working' && employee.morale < 15 && Math.random() < 0.03) {
             employee.status = 'sick';
             const sickDuration = getRandomIntInRange(1, 3) * BASE_DELAYS.weekly / currentSpeedMultiplier; // 1-3 tyg L4
             employee.vacationEnds = Date.now() + sickDuration; // Używamy tego samego pola
             logEvent(`ố Pracownik ${employee.name} idzie na zwolnienie lekarskie.`);
        }

        // Sprawdzenie końca urlopu/chorobowego
        if (employee.status !== 'working' && Date.now() > employee.vacationEnds) {
             logEvent(`✅ Pracownik ${employee.name} wraca do pracy.`);
             employee.status = 'working';
             employee.vacationEnds = 0;
        }

        // Ryzyko odejścia (jeśli morale bardzo niskie)
        if (employee.status === 'working' && employee.morale < 10 && Math.random() < 0.05) {
            fireEmployee(employee.id, true); // true oznacza, że sam odchodzi
            // Pętla forEach może mieć problem, jeśli usuniemy element - lepiej użyć pętli for od końca
        }
    });
}

function updatePassiveWork(deltaTime) {
    if (getSkillLevel('work') >= 3 && workPassiveProgress < PASSIVE_WORK_INTERVAL) {
        workPassiveProgress += deltaTime;
    }
}

function collectPassiveWorkReward() {
    if (workPassiveProgress >= PASSIVE_WORK_INTERVAL) {
        playerCash += 100;
        workPassiveProgress = 0; // Resetuj postęp
        logEvent('✍️ Odebrano pasywny dochód w wysokości 100 PLN.', 'review');
        displayCash();

        // Odśwież widok panelu, jeśli jest otwarty
        if (document.getElementById('work-modal').style.display === 'block') {
            openWorkModal();
        }
    }
}

/** Pomocnicza funkcja do aplikowania kary do morale */
function applyMoralePenalty(employees, penaltyAmount) {
     employees.forEach(emp => {
         emp.morale = Math.max(0, emp.morale - penaltyAmount);
     });
}

function triggerIPO() {
    if (playerCompany.value >= 25000) {
        const companySymbol = playerCompany.name.substring(0, 3).toUpperCase() + "X";
        const newStock = {
            name: playerCompany.name,
            price: playerCompany.value / 1000, // Wartość początkowa akcji
            volatilityFactor: 1.5,
            symbol: companySymbol,
            exchange: 'JUNK', // Debiut na najniższej giełdzie
            totalShares: 1000,
            maxShares: 2000,
            sharesHeld: 800, // 80% akcji jest Twoje
            priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z)
            sector: ['Usługi'],
            financialHealth: 1,
            isTradeLocked: false,
            dividendCooldownUntil: 0
        };

        stocks.push(newStock);
        playerPortfolio[companySymbol] = { shares: 800, avgPrice: newStock.price };

        alert(`GRATULACJE! Twoja firma ${playerCompany.name} (${companySymbol}) weszła na giełdę! Otrzymujesz 80% akcji.`);
        playerCompany = null; // Resetujemy firmę, teraz jest spółką giełdową

        // Zamykamy i odświeżamy widoki
        document.getElementById('work-modal').style.display = 'none';
        updateWorkButtonVisibility();
        displayStocks();
        displayPortfolio();
    }
}


// --- Interakcje z Miastem ---
let cityInvestment = {
    donatedAmount: 0, // Całkowita kwota wpłacona przez WSZYSTKICH
    playerHasUnlocked: false, // Czy GRACZ odblokował?
    aiHasUnlocked: false      // Czy JAKIKOLWIEK BOT odblokował?
};

function donateToCity(amount) {
    if (isNaN(amount) || amount <= 0) {
        alert("Wpisz poprawną kwotę.");
        return;
    }
    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki.");
        return;
    }

    playerCash -= amount;
    cityInvestment.donatedAmount += amount;
    logEvent(`🏙️ Przekazano ${amount.toFixed(2)} PLN na rozwój miasta. Całkowity wkład: ${cityInvestment.donatedAmount.toFixed(2)} PLN.`, 'review');

    if (!cityInvestment.playerHasUnlocked && cityInvestment.donatedAmount >= 10000) { // Sprawdzamy tylko flagę gracza
    cityInvestment.playerHasUnlocked = true; // Ustawiamy TYLKO flagę gracza
    logEvent("🎉 Gratulacje! Twój wkład w rozwój miasta odblokował dostęp do obligacji komunalnych i nowych wydarzeń miejskich!", 'success');
    showToast("Odblokowano inwestycje miejskie!", 'success');
}

    displayCash();
    // Odśwież modal miasta
    updateCityModalContent();
}

function contributeToInvestmentPool(contributorId, amount) {
    // Walidacja dla gracza
    if (contributorId === 'player') {
        if (isPlayerInDefault()) return; // <-- DODANA LINIA
        if (isNaN(amount) || amount <= 0) {
            alert("Proszę wpisać poprawną kwotę.");
            return;
        }
        if (playerCash < amount) {
            alert("Nie masz wystarczająco gotówki!");
            return;
        }
        playerCash -= amount;
        displayCash();
    }
    // Walidacja dla AI
    else if (contributorId.startsWith('ai')) {
        const ai = aiCompetitors.find(a => a.id === contributorId);
        if (!ai || ai.cash < amount) {
            return; // AI nie może wpłacić, jeśli nie ma środków
        }
        ai.cash -= amount;
    }

    investmentPool.totalFunds += amount;
    investmentPool.contributors[contributorId] = (investmentPool.contributors[contributorId] || 0) + amount;
    investmentPool.playerStakes[contributorId] = (investmentPool.playerStakes[contributorId] || 0) + amount;
    console.log(`[PULA] ${contributorId} wpłacił(a) ${amount.toFixed(2)} PLN do puli inwestycyjnej.`, 'market');
}

function processPoolInvestments() {
    if (investmentPool.totalFunds < 1000) {
        return; // Nie inwestuj, jeśli w puli jest za mało środków
    }

    const availableStartups = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding');
    if (availableStartups.length === 0) {
        return; // Brak celów inwestycyjnych
    }

    const targetStartup = getRandomElement(availableStartups);
    const investmentAmount = investmentPool.totalFunds;

    // "Inwestujemy" w imieniu puli
    targetStartup.currentFunding += investmentAmount;
    targetStartup.investors['Pula Inwestycyjna'] = (targetStartup.investors['Pula Inwestycyjna'] || 0) + investmentAmount;
    // Zapisujemy, kto i ile zainwestował w tej rundzie, aby potem poprawnie rozdać akcje
    if (!targetStartup.poolInvestors) {
        targetStartup.poolInvestors = [];
    }
    targetStartup.poolInvestors.push({
        amount: investmentAmount,
        contributors: { ...investmentPool.contributors } // Kopia obecnych współtwórców
    });

    logEvent(`[PULA] 💰 Pula inwestycyjna zainwestowała ${investmentAmount.toFixed(2)} PLN w ${targetStartup.name}!`);

    // Resetujemy pulę
    investmentPool.totalFunds = 0;
    investmentPool.contributors = {};
}



function updateInvestmentPoolTimer(deltaTime) {
    if (investmentPool.investmentTimer > 0) {
        investmentPool.investmentTimer -= deltaTime;
    } else {
        processPoolInvestments();
        investmentPool.investmentTimer = investmentPool.INVESTMENT_INTERVAL; // Reset timera
    }
}

/**
 * Aktualizuje timer auto-inwestowania gracza i zleca wpłatę, jeśli czas minął.
 * @param {number} deltaTime - Czas, który upłynął od ostatniego ticka gry (w ms).
 */
function updateAutoInvestTimer(deltaTime) {
    if (!playerAutoInvest.isEnabled) {
        return; // Funkcja nie robi nic, jeśli auto-inwestowanie jest wyłączone.
    }

    playerAutoInvest.timer -= deltaTime;

    if (playerAutoInvest.timer <= 0) {
        // Czas minął, próbujemy zainwestować.
        if (playerCash >= playerAutoInvest.amount) {
            contributeToInvestmentPool('player', playerAutoInvest.amount);
            logEvent(`[AUTO-INWESTOWANIE] Automatycznie wpłacono ${playerAutoInvest.amount.toFixed(2)} PLN do puli.`);
        } else {
            // Gracz nie ma wystarczająco środków, wyłączamy auto-inwestowanie.
            playerAutoInvest.isEnabled = false;
            logEvent(`[AUTO-INWESTOWANIE] Brak środków! Auto-inwestowanie zostało wyłączone.`, 'review');
            // Opcjonalnie: powiadom gracza alertem
            alert("Brak wystarczających środków na koncie. Twoje auto-inwestowanie w pulę start-upów zostało wstrzymane.");
        }

        // Resetujemy timer na nową wartość z ustawień.
        playerAutoInvest.timer = playerAutoInvest.interval;
    }
}

function takeCommercialLoan(bankId, amount) {
    const bank = commercialBanks.find(b => b.id === bankId);
    if (!bank || !bank.isActive) {
        alert("Wybrany bank jest nieaktywny lub nie istnieje.");
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        alert("Wprowadź poprawną kwotę kredytu.");
        return;
    }
    // Sprawdź, czy gracz nie jest w stanie niewypłacalności (jeśli taka mechanika istnieje)
    if (isPlayerInDefault && isPlayerInDefault()) {
         alert("Nie możesz wziąć kredytu, mając niespłacone zobowiązania!");
         return;
    }

    const netWorth = calculateNetWorth('player');
    const existingLoansTotal = playerCommercialLoans.reduce((sum, loan) => sum + loan.amount, 0);
    // Limit kredytowy: 30% wartości netto minus istniejące kredyty komercyjne
    const maxLoanPossible = netWorth * 0.3 - existingLoansTotal;

    if (amount > maxLoanPossible) {
        alert(`Twój limit kredytowy w bankach komercyjnych wynosi ${Math.max(0, maxLoanPossible).toFixed(0)} PLN. Nie możesz pożyczyć ${amount.toFixed(0)} PLN.`);
        return;
    }
    // Bank też ma limit - nie pożyczy więcej niż np. 20% swojej gotówki na raz
    if (amount > bank.cash * 0.2) {
        alert(`Bank ${bank.name} nie może udzielić tak wysokiego kredytu w tym momencie. Spróbuj mniejszą kwotę.`);
        return;
    }


    


    const interestRate = bank.interestRateLoan;
    // ---> NOWOŚĆ: Sprawdź i zastosuj bonus festynowy <---
    const now = Date.now();
    const activeBonusIndex = activePlayerBankBonuses.findIndex(bonus =>
        bonus.bankId === bankId && bonus.type === 'loan' && now < bonus.expiryTime
    );

    if (activeBonusIndex !== -1) {
        const bonus = activePlayerBankBonuses[activeBonusIndex];
        const originalRate = interestRate;
        interestRate *= (1 - bonus.value); // Zastosuj zniżkę procentową
        logEvent(`[Festyn Bonus] Zastosowano ${Math.round(bonus.value * 100)}% zniżki na oprocentowanie kredytu w ${bank.name}!`);
        showToast(`Zastosowano zniżkę ${Math.round(bonus.value * 100)}% na kredyt!`, 'success');

        // Usuń bonus po wykorzystaniu
        activePlayerBankBonuses.splice(activeBonusIndex, 1);
    }
    const loanDurationWeeks = 26; // Kredyt na pół roku (26 tygodni)
    const maturityDate = Date.now() + (loanDurationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    // Dokładniejsza kalkulacja raty (annuitetowa, uproszczona)
    const weeklyRate = interestRate / 52;
    const weeklyPayment = amount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);

    // Transakcja
    playerCash += amount;
    bank.cash -= amount; // Bank wypłaca środki
    // Zapisz pożyczkę w portfelu banku (kwota początkowa)
    if (!bank.loanPortfolio['player']) bank.loanPortfolio['player'] = [];
    bank.loanPortfolio['player'].push({ id: `loan_${Date.now()}`, initialAmount: amount, remainingAmount: amount, interestRate: interestRate }); // Zapisz finalne oprocentowanie

    const newLoan = {
        id: `loan_${Date.now()}`,
        bankId: bankId,
        bankName: bank.name,
        initialAmount: amount,
        amount: amount, // Kwota pozostała do spłaty
        interestRate: interestRate,
        weeklyPayment: weeklyPayment,
        maturityDate: maturityDate,
        collateral: null
    };
    playerCommercialLoans.push(newLoan);

    logEvent(` Zaciągnięto kredyt ${amount.toFixed(0)} PLN w ${bank.name} na ${loanDurationWeeks} tyg. Rata: ${weeklyPayment.toFixed(2)} PLN/tydz.`, 'review');
    displayCash();
    displayPortfolio(); // Aby odświeżyć listę pasywów
    closeInteractionModal(); // Zamknij modal interakcji
}

function repayCommercialLoan(loanId, amount) {
    const loanIndex = playerCommercialLoans.findIndex(l => l.id === loanId);
    if (loanIndex === -1) {
        alert("Nie znaleziono takiej pożyczki.");
        return;
    }
    const loan = playerCommercialLoans[loanIndex];
    const bank = commercialBanks.find(b => b.id === loan.bankId);

    if (isNaN(amount) || amount <= 0) {
        alert("Wprowadź poprawną kwotę spłaty.");
        return;
    }
    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki.");
        return;
    }

    const amountToRepay = Math.min(amount, loan.amount); // Nie spłacaj więcej niż zostało

    // Transakcja
    playerCash -= amountToRepay;
    loan.amount -= amountToRepay;
    if(bank) {
        bank.cash += amountToRepay; // Bank otrzymuje spłatę
        // Aktualizuj portfel kredytowy banku (znajdź odpowiednią pożyczkę)
        if (bank.loanPortfolio['player']) {
            const bankLoanIndex = bank.loanPortfolio['player'].findIndex(bl => bl.id === loan.id);
            if (bankLoanIndex !== -1) {
                bank.loanPortfolio['player'][bankLoanIndex].remainingAmount -= amountToRepay;
                if (bank.loanPortfolio['player'][bankLoanIndex].remainingAmount <= 0) {
                    bank.loanPortfolio['player'].splice(bankLoanIndex, 1); // Usuń spłaconą pożyczkę z portfela banku
                }
            }
        }
    }

    logEvent(` Spłacono ${amountToRepay.toFixed(2)} PLN kredytu w ${loan.bankName}.`, 'review');

    // Jeśli spłacono całość
    if (loan.amount <= 0.01) { // Użyj małego progu dla błędów zmiennoprzecinkowych
        playerCommercialLoans.splice(loanIndex, 1); // Usuń pożyczkę z listy
        logEvent(` Kredyt w ${loan.bankName} został w całości spłacony!`, 'success');
        showToast(`Kredyt w ${loan.bankName} spłacony!`, 'success');
    }

    displayCash();
    displayPortfolio();
    closeInteractionModal(); // Zamknij modal interakcji (jeśli był otwarty)
    // Jeśli okno kredytów jest otwarte, odśwież je
    if(document.getElementById('commercial-loan-modal')?.style.display === 'block'){
        openCommercialLoanModal(loan.bankId);
    }
}

function makeCommercialDeposit(bankId, amount) {
    const bank = commercialBanks.find(b => b.id === bankId);
    if (!bank || !bank.isActive) {
        alert("Wybrany bank jest nieaktywny lub nie istnieje.");
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        alert("Wprowadź poprawną kwotę depozytu.");
        return;
    }
    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki.");
        return;
    }

    let interestRate = bank.interestRateDeposit;
    const now = Date.now();
    const activeBonusIndex = activePlayerBankBonuses.findIndex(bonus =>
        bonus.bankId === bankId && bonus.type === 'deposit' && now < bonus.expiryTime
    );

    if (activeBonusIndex !== -1) {
        const bonus = activePlayerBankBonuses[activeBonusIndex];
        const originalRate = interestRate;
        interestRate += bonus.value; // Dodaj bonusowy punkt procentowy
        logEvent(`[Festyn Bonus] Zastosowano +${(bonus.value * 100).toFixed(1)}% bonusu do oprocentowania depozytu w ${bank.name}!`);
        showToast(`Zastosowano +${(bonus.value * 100).toFixed(1)}% bonusu do depozytu!`, 'success');

        // Usuń bonus po wykorzystaniu
        activePlayerBankBonuses.splice(activeBonusIndex, 1);
    }

    // Transakcja
    playerCash -= amount;
    bank.cash += amount; // Bank przyjmuje środki
    // Zapisz depozyt w portfelu banku
    if (!bank.depositPortfolio['player']) bank.depositPortfolio['player'] = [];
    bank.depositPortfolio['player'].push({ id: `dep_${Date.now()}`, amount: amount, interestRate: interestRate });


    // Sprawdź, czy gracz ma już depozyt w tym banku (w strukturze gracza)
    const existingDeposit = playerCommercialDeposits.find(d => d.bankId === bankId);
    if (existingDeposit) {
        existingDeposit.amount += amount; // Po prostu zwiększ kwotę
        existingDeposit.interestRate = interestRate; // Zaktualizuj oprocentowanie na wypadek zmiany
    } else {
        const newDeposit = {
            id: `dep_${Date.now()}_player`, // Unikalne ID dla gracza
            bankId: bankId,
            bankName: bank.name,
            amount: amount,
            interestRate: interestRate,
            startDate: Date.now()
        };
        playerCommercialDeposits.push(newDeposit);
    }

    logEvent(` Wpłacono ${amount.toFixed(2)} PLN depozytu do ${bank.name}.`, 'review');
    displayCash();
    displayPortfolio();
    closeInteractionModal();
}

function withdrawCommercialDeposit(depositId, amount) {
    const depositIndex = playerCommercialDeposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) {
        // Jeśli nie znaleziono po ID, spróbuj znaleźć po bankId (na wypadek starej logiki)
        const depositByBank = playerCommercialDeposits.find(d => d.bankId === depositId); // Tu depositId to tak naprawdę bankId
         if(depositByBank){
             depositId = depositByBank.id; // Użyj poprawnego ID
             depositIndex = playerCommercialDeposits.findIndex(d => d.id === depositId);
         } else {
            alert("Nie znaleziono takiego depozytu.");
            return;
         }
    }

    const deposit = playerCommercialDeposits[depositIndex];
    const bank = commercialBanks.find(b => b.id === deposit.bankId);

    if (isNaN(amount) || amount <= 0) {
        alert("Wprowadź poprawną kwotę wypłaty.");
        return;
    }

    const amountToWithdraw = Math.min(amount, deposit.amount);

    if (!bank) {
         console.warn(`Nie znaleziono banku ${deposit.bankId} przy wypłacie depozytu.`);
         // Wypłać graczowi, ale nie aktualizuj banku
    } else if (bank.cash < amountToWithdraw) {
        alert(`Bank ${bank.name} ma chwilowe problemy z płynnością i nie może wypłacić tej kwoty.`);
        return;
    } else {
        // Zaktualizuj bank
        bank.cash -= amountToWithdraw;
        // Znajdź i zmniejsz odpowiedni depozyt w portfelu banku (uproszczone)
        if (bank.depositPortfolio['player']) {
             // W bardziej złożonym systemie znaleźlibyśmy konkretny depozyt po ID
             // Tutaj uproszczenie: odejmujemy od ogólnej puli depozytów gracza w banku
             const totalPlayerDepositsInBank = bank.depositPortfolio['player'].reduce((sum, dep) => sum + dep.amount, 0);
             const newTotal = Math.max(0, totalPlayerDepositsInBank - amountToWithdraw);
             // Aktualizacja - zamiast prostej sumy, usuwamy/zmniejszamy konkretny depozyt
             const bankDepIndex = bank.depositPortfolio['player'].findIndex(dep => dep.id.startsWith('dep_')); // Proste znalezienie
             if(bankDepIndex !== -1){
                 bank.depositPortfolio['player'][bankDepIndex].amount -= amountToWithdraw;
                 if(bank.depositPortfolio['player'][bankDepIndex].amount <= 0) {
                     bank.depositPortfolio['player'].splice(bankDepIndex, 1);
                 }
             }
        }
    }

    // Transakcja dla gracza
    playerCash += amountToWithdraw;
    deposit.amount -= amountToWithdraw;

    logEvent(` Wypłacono ${amountToWithdraw.toFixed(2)} PLN depozytu z ${deposit.bankName}.`, 'review');

    // Jeśli wypłacono całość
    if (deposit.amount <= 0.01) {
        playerCommercialDeposits.splice(depositIndex, 1); // Usuń depozyt z listy gracza
    }

    displayCash();
    displayPortfolio();
    closeInteractionModal();
     // Jeśli okno depozytów jest otwarte, odśwież je
    if(document.getElementById('commercial-deposit-modal')?.style.display === 'block'){
        openCommercialDepositModal(deposit.bankId);
    }
}

function isPlayerInDefault() {
    if (playerLoan.missedPayments >= 3) {
        alert("Transakcja zablokowana! Masz 3 lub więcej pominiętych rat kredytu. Spłać część długu ręcznie w banku, aby odblokować inwestycje.");
        return true;
    }
    return false;
}

function takeLoan() {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const loanAmountInput = document.getElementById('loan-amount');
    const amount = parseFloat(loanAmountInput.value);

    if (isNaN(amount) || amount <= 0) {
        alert("Proszę wpisać poprawną, dodatnią kwotę pożyczki.");
        return;
    }

    if (playerLoan.amount > 0) {
        alert("Musisz najpierw spłacić obecną pożyczkę, zanim weźmiesz kolejną!");
        return;
    }

    const totalPortfolioValue = playerCash + getStocksValue();
    let loanLimit = totalPortfolioValue * 0.5;
    if (getSkillLevel('hardNegotiator') === 3) {
        loanLimit *= 1.10; // Zwiększenie limitu o 10% na 3 poziomie
    } processWeeklyInterest

    if (amount > loanLimit) {
        alert(`Nie możesz pożyczyć tyle pieniędzy! Twój maksymalny limit kredytowy to ${Math.max(0, loanLimit).toFixed(2)} PLN.`);
        return;
    }

    playerCash += amount;
    playerLoan.amount = amount;
    // Rata tygodniowa to 2% pożyczonej kwoty + odsetki (zmieniono z 5% na 2% dla lepszego balansu)
    playerLoan.weeklyPayment = (amount * 0.02) + (amount * (LOAN_INTEREST_RATE / 52));
    playerLoan.missedPayments = 0;

    loanAmountInput.value = '';
    logEvent(`🏦 Wzięto pożyczkę w wysokości ${amount.toFixed(2)} PLN. Twoja tygodniowa rata wynosi ${playerLoan.weeklyPayment.toFixed(2)} PLN.`, 'market');
    displayCash();
    openBankModal();
}
function repayLoan() {
    const loanAmountInput = document.getElementById('loan-amount');
    const amount = parseFloat(loanAmountInput.value);

    if (isNaN(amount) || amount <= 0) {
        alert("Proszę wpisać poprawną, dodatnią kwotę do spłaty.");
        return;
    }

    const amountToRepay = Math.min(amount, playerLoan.amount);

    if (amountToRepay > playerCash) {
        alert("Nie masz wystarczająco gotówki, aby spłacić tę kwotę.");
        return;
    }

    playerCash -= amountToRepay;
    playerLoan.amount -= amountToRepay;

    // Po spłacie części długu, rata powinna zostać przeliczona
    if (playerLoan.amount > 0) {
        playerLoan.weeklyPayment = (playerLoan.amount * 0.02) + (playerLoan.amount * (LOAN_INTEREST_RATE / 52));
    } else {
        // Jeśli pożyczka spłacona w całości, resetujemy system
        playerLoan.amount = 0;
        playerLoan.weeklyPayment = 0;
        playerLoan.missedPayments = 0;
        logEvent(`🎉 Gratulacje! Pożyczka została w całości spłacona!`, 'review');
    }

    loanAmountInput.value = '';

    // --- NOWY BLOK: Resetowanie licznika kar ---
    // Jeśli gracz dokonał jakiejkolwiek ręcznej spłaty, resetujemy licznik pominiętych rat
    if (amountToRepay > 0 && playerLoan.missedPayments > 0) {
        playerLoan.missedPayments = 0;
        logEvent(`✅ KONTO ODBLOKOWANE! Ręczna spłata kredytu przywróciła Twoją wiarygodność. Możesz znowu inwestować.`, 'success');
        showToast("Konto inwestycyjne odblokowane!", 'success');
    }
    // --- KONIEC NOWEGO BLOKU ---

    displayCash();
    openBankModal();
}

function processLoanRepayment() {
    if (playerLoan.amount <= 0) {
        return; // Nie rób nic, jeśli nie ma pożyczki
    }

    // Odsetki naliczają się co tydzień od pozostałej kwoty
    let currentLoanInterestRate = LOAN_INTEREST_RATE;
    const negotiatorLevel = getSkillLevel('hardNegotiator');
    if (negotiatorLevel > 0) {
        let interestModifier = 1.0;
        switch (negotiatorLevel) {
            case 1: interestModifier = 0.90; break; // 10% zniżki
            case 2: interestModifier = 0.80; break; // 20% zniżki
            case 3: interestModifier = 0.75; break; // 25% zniżki
        }
        currentLoanInterestRate *= interestModifier;
    }
    const weeklyInterest = playerLoan.amount * (currentLoanInterestRate / 52);
    playerLoan.amount += weeklyInterest;
    logEvent(`🏦 Naliczono odsetki od kredytu w wysokości ${weeklyInterest.toFixed(2)} PLN.`, 'market');

    // Spłata raty tylko jeśli auto-spłata jest włączona
    if (isAutoRepayEnabled) {
        if (playerCash >= playerLoan.weeklyPayment) {
            // Gracz ma pieniądze, pobieramy ratę
            const amountPaid = Math.min(playerLoan.amount, playerLoan.weeklyPayment); // Nie spłacaj więcej niż zostało długu
            playerCash -= amountPaid;
            playerLoan.amount -= amountPaid;
            logEvent(`🏦 Automatycznie spłacono ratę kredytu w wysokości ${amountPaid.toFixed(2)} PLN.`, 'market');

            if (playerLoan.amount <= 0) {
                playerLoan.amount = 0;
                playerLoan.weeklyPayment = 0;
                playerLoan.missedPayments = 0;
                logEvent(`🎉 Gratulacje! Pożyczka została w całości spłacona!`, 'review');
            } else {
                // Przelicz ratę po spłacie
                playerLoan.weeklyPayment = (playerLoan.amount * 0.02) + (playerLoan.amount * (LOAN_INTEREST_RATE / 52));
            }
        } else {
            // --- POCZĄTEK POPRAWKI: NOWA LOGIKA KARY ---
            // Gracz nie ma pieniędzy na spłatę
            playerLoan.missedPayments++;

            // Zamiast psuć OPROCENTOWANIE, doliczamy jednorazową opłatę karną
            const penaltyFee = playerLoan.weeklyPayment * 0.25; // Kara 25% wartości pominiętej raty
            playerLoan.amount += penaltyFee; // Opłata karna jest dodawana do głównego długu

            logEvent(`🚨 OSTRZEŻENIE! Brak środków na spłatę raty! Doliczono opłatę karną: ${penaltyFee.toFixed(2)} PLN. Liczba pominiętych rat: ${playerLoan.missedPayments}.`, 'review');

            // Konsekwencje (Blokada + Zajęcie depozytu)
            if (playerLoan.missedPayments >= 3) {
                logEvent(`❌ KONTO ZABLOKOWANE! Z powodu 3 pominiętych rat, możliwość inwestowania została wstrzymana!`, 'error');

                // Bank automatycznie spróbuje pobrać środki z depozytu, jeśli są dostępne
                if (playerDeposit > 0) {
                    const amountToSeize = Math.min(playerDeposit, playerLoan.amount);
                    playerDeposit -= amountToSeize;
                    playerLoan.amount -= amountToSeize;
                    logEvent(`🏦 BANK ZAJĄŁ TWOJĄ LOKATĘ! Wpłata ${amountToSeize.toFixed(2)} PLN z depozytu na poczet długu!`, 'review');

                    // Sprawdźmy, czy to wystarczyło do "spłaty" zaległej raty
                    if (amountToSeize >= playerLoan.weeklyPayment) {
                        playerLoan.missedPayments = 0; // Wyzeruj licznik, jeśli lokata pokryła zaległości
                        logEvent(`✅ KONTO ODBLOKOWANE! Lokata pokryła zaległości. Możesz znowu inwestować.`, 'success');
                    }
                }
            }
            // --- KONIEC POPRAWKI ---
        }
    }

    displayCash();
    if (document.getElementById('bank-modal').style.display === 'block') {
        openBankModal();
    }
}

function makeDeposit() {
    const depositAmountInput = document.getElementById('deposit-amount');
    const amount = parseFloat(depositAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert("Proszę wpisać poprawną, dodatnią kwotę depozytu.");
        return;
    }
    if (amount > playerCash) {
        alert("Nie masz wystarczająco gotówki, aby złożyć taki depozyt.");
        return;
    }
    playerCash -= amount;
    playerDeposit += amount;
    depositAmountInput.value = '';
    displayCash();
    openBankModal();
}

function withdrawDeposit() {
    const depositAmountInput = document.getElementById('deposit-amount');
    const amount = parseFloat(depositAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert("Proszę wpisać poprawną, dodatnią kwotę do wypłaty.");
        return;
    }
    if (amount > playerDeposit) {
        alert(`Nie możesz wypłacić więcej, niż masz na depozycie. Dostępne środki: ${playerDeposit.toFixed(2)} PLN.`);
        return;
    }
    playerDeposit -= amount;
    playerCash += amount;
    depositAmountInput.value = '';
    displayCash();
    openBankModal();
}

function processWeeklyInterest() {
    updateInterestRates(); 

    if (playerDeposit > 0) {
        let currentDepositRate = DEPOSIT_INTEREST_RATE;
        const magnetLevel = getSkillLevel('bankMagnet');

        if (magnetLevel > 0) {
            let depositBonus = 1.0;
            switch (magnetLevel) {
                case 1: depositBonus = 1.10; break; // +10%
                case 2: depositBonus = 1.20; break; // +20%
                case 3: depositBonus = 1.25; break; // +25%
            }
            currentDepositRate *= depositBonus;
        }

        const weeklyDepositRate = currentDepositRate / 52;
        const depositInterest = playerDeposit * weeklyDepositRate;
        playerCash += depositInterest;

        const interestMessage = `Naliczono odsetki od depozytu: ${depositInterest.toFixed(2)} PLN.`;
        logEvent(`🏦 ${interestMessage}`, 'market');

        // Bonus XP za 3 poziom umiejętności
        if (magnetLevel === 3 && playerDeposit >= 100000) {
            const xpBonus = 50; // Przykładowa stała wartość bonusu
            playerXP += xpBonus;
            logEvent(`🧲 Otrzymujesz ${xpBonus} XP bonusu od Bankowego Magnesu za utrzymanie dużego depozytu!`, 'review');
            displayXP(); // Aktualizujemy interfejs
        }
    }

    displayCash();
}

function chargeAccountingFee(paymentAmount, entityId) {
    // Znajdź wszystkie aktywne firmy księgowe (na wypadek, gdyby było ich więcej)
    const accountingCompanies = stocks.filter(s => s.assetType === 'Accounting' && !s.isBankrupt);
    if (accountingCompanies.length === 0) {
        return; // Brak firm księgowych, brak prowizji
    }

    // Prowizja to np. 0.5% od kwoty raty
    const feeRate = 0.005; // 0.5%
    const totalFee = paymentAmount * feeRate;

    // 1. Pobierz prowizję od płacącego
    if (entityId === 'player') {
        if (playerCash >= totalFee) {
            playerCash -= totalFee; // Pobierz od gracza
        } else {
            return; // Gracza nie stać na prowizję, pomiń
        }
    } else {
        const ai = aiCompetitors.find(a => a.id === entityId);
        if (ai && ai.cash >= totalFee) {
            ai.cash -= totalFee; // Pobierz od AI
        } else {
            return; // Bota nie stać na prowizję, pomiń
        }
    }
    
    // 2. Rozdziel prowizję po równo między wszystkie aktywne firmy księgowe
    const feePerCompany = totalFee / accountingCompanies.length;
    accountingCompanies.forEach(company => {
        // Dodaj zysk bezpośrednio do gotówki firmy księgowej
        company.cash += feePerCompany; 
        
        // Zaktualizuj licznik zysków kwartalnych (dla raportów)
        // (Zakładamy, że `quarterlyEarnings` jest resetowane w `processFinancialReports`)
        company.quarterlyEarnings += feePerCompany;
        
        // Zaktualizuj bilans
        if (company.balanceSheet) {
            company.balanceSheet.assets += feePerCompany; // Gotówka to aktywa
            company.balanceSheet.retainedEarnings += feePerCompany; // Zysk zwiększa kapitał
        }
        // Zaktualizuj bank, w którym firma ma konto
        if (company.bankAccountId) {
            const bank = commercialBanks.find(b => b.id === company.bankAccountId);
            if (bank) bank.cash += feePerCompany;
        }
    });

    // 3. Loguj tylko dla gracza (aby nie spamować konsoli botami)
    if (entityId === 'player' && totalFee > 0.01) {
        logEvent(`🧾 Zapłacono ${totalFee.toFixed(2)} PLN prowizji księgowej za automatyczną spłatę raty.`, 'review');
    }
}

function buySkill(skillId) {
    const nextLevelInfo = getNextSkillLevelInfo(skillId);
    if (!nextLevelInfo) return;

    // --- POCZĄTEK POPRAWKI: Sprawdzanie wymagań przed zakupem ---
    const requirement = nextLevelInfo.requires;
    const requirementMet = requirement ? getSkillLevel(requirement.skillId) >= requirement.level : true;

    if (!requirementMet) {
        alert("Nie spełniasz wymagań, aby odblokować tę umiejętność!");
        return;
    }
    // --- KONIEC POPRAWKI ---

    if (playerXP >= nextLevelInfo.cost) {
        playerXP -= nextLevelInfo.cost;
        skills[skillId].unlockedLevel++;
        if (skillId === 'work' && skills[skillId].unlockedLevel === 4) {
            foundPlayerCompany();
        }
        displayXP();
        renderSkillsPanel();
    } else {
        alert("Za mało punktów doświadczenia (XP)!");
    }
}

function getStocksValue() {
    let totalValue = 0;
    for (const symbol in playerPortfolio) {
        const holding = playerPortfolio[symbol];
        const marketData = stocks.find(s => s.symbol === symbol);
        if (marketData) {
            totalValue += marketData.price * holding.shares;
        }
    }
    return totalValue;
}



function checkPlayerTierUpgrade() {
    let newAccessLevel = playerAccessLevel;
    const totalPortfolioValue = playerCash + getStocksValue();
    if (totalPortfolioValue >= 35000 && playerAccessLevel < 1) {
        newAccessLevel = 1;
    }
    if (totalPortfolioValue >= 150000 && playerAccessLevel < 2) {
        newAccessLevel = 2;
    }
    if (totalPortfolioValue >= 310000 && playerAccessLevel < 3) {
        newAccessLevel = 3;
    }
    if (totalPortfolioValue >= 750000 && playerAccessLevel < 4) {
        newAccessLevel = 4;
    }
    for (const symbol in playerPortfolio) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) {
            const stockExchangeLevel = exchanges[stock.exchange].level;
            if (stockExchangeLevel > newAccessLevel) {
                newAccessLevel = stockExchangeLevel;
            }
        }
    }
    if (newAccessLevel > playerAccessLevel) {
        playerAccessLevel = newAccessLevel;
        const newExchange = Object.values(exchanges).find(e => e.level === newAccessLevel);
        const message = `🎉 GRATULACJE! Uzyskano dostęp do: ${newExchange.name}`;
        displayEventMessage(message, 30, null, 'review');
    }
}

function buyExchangeLicense() {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const nextLevel = playerAccessLevel + 1;
    const nextExchange = Object.values(exchanges).find(e => e.level === nextLevel);
    if (!nextExchange) {
        alert("Błąd: Nie ma kolejnego poziomu do odblokowania.");
        return;
    }
    const cost = nextExchange.licenseCost;
    if (playerCash >= cost) {
        playerCash -= cost;
        playerAccessLevel++;
        const message = `✅ Zakupiono licencję! Uzyskano dostęp do: ${newExchange.name}`;
        logEvent(message, 'market');
        displayCash();
        displayStocks(getCurrentInputValues());
        openBankModal();
    } else {
        alert("Nie masz wystarczająco gotówki, aby kupić tę licencję.");
    }
}

function checkSanEscobarRisk() {
    const playerLvl = getSkillLevel('sanEscobar');
    // Użyj flagi hasRiskActive, aby kontrola zdarzała się tylko raz w roku
    if (playerLvl === 4 && !skills.sanEscobar.hasRiskActive) {
        skills.sanEscobar.hasRiskActive = true; // Oznacz, że ryzyko jest aktywne w tym roku
        if (Math.random() < 0.15) { // 15% szans na kontrolę
            logEvent(`🚨 KONTROLA SKARBOWA! Twoje machinacje w San Escobar zostały wykryte! Tracisz wszystkie poziomy tej umiejętności!`, 'error');
            showToast("Kontrola Skarbowa! Utracono znajomości w San Escobar!", 'error', 8000);
            // Wyzeruj poziom umiejętności
            skills.sanEscobar.unlockedLevel = 0;
            // Odśwież widok umiejętności, jeśli jest otwarty
            if (document.getElementById('skills-modal')?.style.display === 'block') {
                renderSkillsPanel();
            }
        }
    } else if (playerLvl < 4) {
        // Zresetuj flagę ryzyka, jeśli gracz spadł poniżej Lvl 4
        skills.sanEscobar.hasRiskActive = false;
    }
    // Resetuj flagę ryzyka na początku nowego roku (można to zrobić też np. w triggerYearlyCeoEvents)
    // Na razie zrobimy to po prostu przy kolejnym sprawdzeniu, jeśli gracz ma Lvl 4
    if (playerLvl === 4 && Date.now() > nextWealthTaxTime) { // Użyj nextWealthTaxTime jako znacznika początku roku
         skills.sanEscobar.hasRiskActive = false;
    }
}

function aiDonateToCity(ai, amount) {
    if (ai.cash < amount) return;

    ai.cash -= amount;
    cityInvestment.donatedAmount += amount;
    console.log(`[AI] ${ai.name} przekazał ${amount.toFixed(2)} PLN na rozwój miasta.`);

    if (!cityInvestment.aiHasUnlocked && cityInvestment.donatedAmount >= 10000) { // Sprawdzamy tylko flagę AI
    cityInvestment.aiHasUnlocked = true; // Ustawiamy TYLKO flagę AI
    console.log(`!!! BOT ${ai.name} ODBLOKOWAŁ MIASTO (dla AI) !!!`, cityInvestment.donatedAmount);
    logEvent("🎉 Wkład inwestorów w rozwój miasta odblokował dostęp do obligacji komunalnych!", 'success');
    // showToast nie jest potrzebny dla AI
    }
}

function updateCity() {
    const taxRevenue = city.population * 10;
    city.budget += taxRevenue;
    city.population += Math.floor(city.population * getRandomInRange(0.01, 0.025)); // Naturalny przyrost
    logEvent(`🏙️ Miasto zebrało ${taxRevenue.toFixed(0)} PLN z podatków. Nowy budżet: ${city.budget.toFixed(0)} PLN.`, 'review');
    
    startFestival();
}

function startFestival() {
    if (festival) return; // Nie uruchamiaj, jeśli już trwa

    let tier, name, durationMs;
    // Miesiąc w grze to jeden kwartał
    const festivalMonthDuration = BASE_DELAYS.quarterly; 

    if (city.budget < 100000) {
        tier = 1; name = "Festyn Osiedlowy"; durationMs = festivalMonthDuration / 2; // Krótszy, 2.5 min
    } else if (city.budget < 500000) {
        tier = 2; name = "Festiwal Miejski"; durationMs = festivalMonthDuration; // Pełny miesiąc, 5 min
    } else {
        tier = 3; name = "Wydarzenie Narodowe"; durationMs = festivalMonthDuration * 1.5; // Dłuższy, 7.5 min
    }

    const budgetForAttractions = city.budget * 0.8;
    let spentOnAttractions = 0;
    const attractions = [getRandomElement(city.availableAttractions).name];
    
    city.availableAttractions.forEach(attr => {
        if (spentOnAttractions + attr.cost < budgetForAttractions && Math.random() > 0.5) {
            attractions.push(attr.name);
            spentOnAttractions += attr.cost;
        }
    });
    city.budget -= spentOnAttractions;

    festival = {
        isActive: true,
        name: name,
        tier: tier,
        endTime: Date.now() + (durationMs / currentSpeedMultiplier),
        globalInterest: getRandomIntInRange(20, 50) + (tier * 10),
        attractions: attractions,
        participants: [] // Lista stoisk, na razie pusta
    };


    
    // --- POCZĄTEK NOWEJ LOGIKI ---

    // 1. Miasto zawsze dołącza do festynu
    festival.participants.push({
        ownerId: 'city',
        promotionTarget: { type: 'city' },
        level: 1,
        interest: 15 + (tier * 5) // Miasto ma startowy bonus do zainteresowania
    });

    // 2. Losowe spółki giełdowe dołączają
    const potentialCompanies = stocks.filter(s => !s.assetType && !s.isBankrupt);
    const numberOfCompanies = getRandomIntInRange(4, 7); // Do festynu dołączy od 1 do 3 spółek

    for (let i = 0; i < numberOfCompanies; i++) {
        if (potentialCompanies.length === 0) break;
        
        const company = getRandomElement(potentialCompanies);
        // Usuń wybraną spółkę z puli, aby się nie powtórzyła
        potentialCompanies.splice(potentialCompanies.indexOf(company), 1); 

        festival.participants.push({
            ownerId: company.symbol, // Używamy symbolu jako ID
            promotionTarget: { type: 'company', id: company.symbol },
            level: 1,
            interest: getRandomIntInRange(5, 15)
        });
    }

   const activeBanks = commercialBanks.filter(b => b.isActive);
    const numberOfBanks = getRandomIntInRange(1, 3); // Do festynu dołączy od 1 do 3 aktywnych banków
    const shuffledBanks = activeBanks.sort(() => 0.5 - Math.random()); // Pomieszaj banki

    for (let i = 0; i < Math.min(numberOfBanks, shuffledBanks.length); i++) {
         const bank = shuffledBanks[i];
         const bankStock = stocks.find(s => s.isBankStock && s.bankData.id === bank.id); // Znajdź akcje banku
         festival.participants.push({
            ownerId: bank.id, // Używamy ID banku jako identyfikatora uczestnika
            ownerName: bank.name, // Dodajemy nazwę dla łatwiejszego wyświetlania
            isBank: true, // Flaga oznaczająca bank
            promotionTarget: { type: 'bank_promo', id: bank.id, stockSymbol: bankStock ? bankStock.symbol : null }, // Cel promocji banku
            level: 1,
            interest: getRandomIntInRange(8, 18) // Banki startują z nieco większym zainteresowaniem
        });
        console.log(`[Festyn] Bank ${bank.name} dołącza do festynu.`);
    }

    nextFestivalCountdown = 0;
    logEvent(`🎉 Rozpoczyna się ${name}! Wydarzenie potrwa miesiąc czasu gry.`, 'success');
    showToast(`🎉 Rozpoczyna się ${name}!`, 'success', 7000);
}

function updateFestival() {
    if (!festival || !festival.isActive) return; // Jeśli nie ma festynu, wyjdź

    // --- Sprawdzenie końca festynu ---
    if (Date.now() > festival.endTime) {
        endFestival();
        return; // Festyn się skończył, zakończ funkcję
    }

    // --- Losowe zdarzenia globalne (np. pogoda) ---
    if (Math.random() < 0.01) { // Szansa na pozytywne zdarzenie pogodowe
        const change = getRandomIntInRange(5, 15);
        festival.globalInterest += change;
        logEvent(`☀️ Dobra pogoda i pozytywna atmosfera! Zainteresowanie festynem rośnie o ${change} punktów.`, 'review');
    } else if (Math.random() < 0.005) { // Mniejsza szansa na negatywne zdarzenie pogodowe
        const change = getRandomIntInRange(5, 15);
        festival.globalInterest -= change;
        logEvent(`🌧️ Nagłe załamanie pogody! Zainteresowanie festynem spada o ${change} punktów.`, 'review');
    }

    // --- Logika działań Miasta i Spółek Giełdowych ---
    festival.participants.forEach(participant => {
        // Upewnij się, że participant i ownerId istnieją
        if (!participant || !participant.ownerId) {
            console.warn("[Festival Update] Znaleziono nieprawidłowego uczestnika:", participant);
            return; // Pomiń tego uczestnika
        }

        const isCity = participant.ownerId === 'city';
        const isPlayer = participant.ownerId === 'player';
        // --- 👇 POPRAWIONY WARUNEK isCompany 👇 ---
        // Sprawdź, czy ownerId jest stringiem PRZED użyciem startsWith
        const isAI = typeof participant.ownerId === 'string' && participant.ownerId.startsWith('ai');
        const isBank = participant.isBank === true;
        const isCompany = !isCity && !isPlayer && !isAI && !isBank; // Jeśli to nie miasto, gracz ani AI, to musi być spółka
        // --- 👆 KONIEC POPRAWKI isCompany 👆 ---


        if (isCity || isCompany || isBank) {
            // Mają szansę na wykonanie akcji w każdej turze
            if (Math.random() < 0.05) { // 5% szansy na akcję
                const actionRoll = Math.random();

                // 30% szans na ulepszenie stoiska (jeśli to możliwe)
                if (actionRoll < 0.3) {
                    const nextLevel = FESTIVAL_STALL_LEVELS[participant.level]; // Poziom zaczyna się od 1, indeks od 0
                    if (nextLevel) { // Sprawdź, czy istnieje następny poziom
                        if (isCity && city.budget >= nextLevel.cost) {
                            city.budget -= nextLevel.cost;
                            participant.level++;
                            participant.interest += 15; // Bonus za ulepszenie (mniejszy niż dla gracza)
                        } else if (isCompany) {
                            // Prosta symulacja budżetu spółki na festyn
                            if (Math.random() > 0.4) { // 60% szans, że spółkę "stać"
                                participant.level++;
                                participant.interest += 15;
                            }
                        }
                    }
                }
                // 70% szans na promocję stoiska
                else {
                    const promoKeys = Object.keys(PROMOTION_ACTIONS);
                    const randomPromoKey = getRandomElement(promoKeys);
                    const promo = PROMOTION_ACTIONS[randomPromoKey];

                    if (isCity && city.budget >= promo.cost) {
                        city.budget -= promo.cost;
                        participant.interest += promo.interest * 0.8; // Mniejszy efekt promocji
                    } else if (isCompany) {
                        // Prosta symulacja decyzji o promocji
                        if (Math.random() > 0.3) { // 70% szans, że firma zdecyduje się na promocję
                            participant.interest += promo.interest * 0.8;
                        }
                    }
                }
            }
        }
    });
    // --- KONIEC Logiki działań Miasta i Spółek Giełdowych ---

    // --- NOWY BLOK: Losowe zdarzenie dla gracza ---
    // (Ta funkcja nie była zdefiniowana w żadnym pliku, zostawiam wywołanie)
     if (festival.participants.some(p => p.ownerId === 'player')) {
             triggerFestivalPlayerEvent(); // Ta funkcja wylosuje odpowiedni event (stary lub nowy bankowy)
        
     }
    // --- KONIEC NOWEGO BLOKU ---

} 

function endFestival() {
    if (!festival) return;

    logEvent(`🏁 ${festival.name} dobiegł końca! Czas na podsumowanie.`, 'review');
    festival.participants.sort((a, b) => b.interest - a.interest);

    // Wyświetl tabelę wyników
    openFestivalResultsModal(festival.participants, festival.name);

    festival.participants.forEach((participant, index) => {
        let bonusMultiplier = 0;
        if (index === 0) bonusMultiplier = 1.0;
        else if (index === 1) bonusMultiplier = 0.5;
        else if (index === 2) bonusMultiplier = 0.1;
        if (bonusMultiplier > 0) applyFestivalBonus(participant, bonusMultiplier);
    });

    const successScore = festival.globalInterest + (festival.participants.length * 5) + (festival.attractions.length * 10);
    if (successScore > 100) {
        const populationGrowth = Math.floor(city.population * (successScore / 5000));
        city.population += populationGrowth;
        logEvent(`✅ Udany festyn przyciągnął ${populationGrowth} nowych mieszkańców!`, 'success');
        const marketMaker = aiCompetitors.find(ai => ai.personality === 'market_maker');
        if (marketMaker) {
            marketMaker.marketMakerBoost.isActive = true;
            marketMaker.marketMakerBoost.expiryTime = Date.now() + (5 * 60 * 1000 / currentSpeedMultiplier); // Bonus na 5 minut
            marketMaker.marketMakerBoost.cashBonus = 50000 * festival.tier; // Bonusowa gotówka zależna od rangi festynu
            marketMaker.cash += marketMaker.marketMakerBoost.cashBonus;

            logEvent('📈 Udany festyn zwiększył zainteresowanie giełdą! Inwestorzy Mniejszościowi stają się bardziej aktywni.', 'review');
            showToast('Zainteresowanie giełdą wzrosło!', 'success');
        }
    }

    festival = null;
    nextFestivalCountdown = BASE_DELAYS.quarterly * 4; // Ustaw odliczanie na rok

    updateCityModalContent();
}

function playerJoinFestival(promotionTarget) {
    if (!cityInvestment.playerHasUnlocked) {
        alert("Musisz najpierw odblokować inwestycje miejskie (wpłać 10,000 PLN), aby wziąć udział w festynie!");
        return; // Zakończ funkcję, jeśli miasto nie jest odblokowane dla gracza
    }
    if (!festival || !festival.isActive || playerCash < FESTIVAL_STALL_LEVELS[0].cost) return;

    playerCash -= FESTIVAL_STALL_LEVELS[0].cost;
    festival.participants.push({
        ownerId: 'player',
        promotionTarget: promotionTarget,
        level: 1,
        interest: 10 // Startowe zainteresowanie
    });
    
    logEvent("Wystawiasz swoje stoisko na festynie!", 'review');
    openCityInvestmentModal(); // Odśwież widok
}

function playerUpgradeStall() {
    const participant = festival.participants.find(p => p.ownerId === 'player');
    const nextLevel = FESTIVAL_STALL_LEVELS[participant.level];
    if (!participant || !nextLevel || playerCash < nextLevel.cost) return;

    playerCash -= nextLevel.cost;
    participant.level++;
    participant.interest += 20; // Bonus za ulepszenie
    openCityInvestmentModal();
}

function playerPromoteStall(promoType) {
    const participant = festival.participants.find(p => p.ownerId === 'player');
    const action = PROMOTION_ACTIONS[promoType];
    if (!participant || !action || playerCash < action.cost) return;

    playerCash -= action.cost;
    participant.interest += action.interest;
    openCityInvestmentModal();
}

function playerPromoteEvent() {
    if (!festival || playerCash < 500) return;
    playerCash -= 500;
    festival.globalInterest += 10;
    openCityInvestmentModal();
}

function updateFestivalCountdown(deltaTime) {
    if (nextFestivalCountdown > 0) {
        nextFestivalCountdown -= deltaTime;
    }
}

function applyActiveModifiers() {
    const now = Date.now();
    activeModifiers = activeModifiers.filter(mod => now < mod.expiryTime); // Usuń przestarzałe

    activeModifiers.forEach(mod => {
        switch (mod.target.type) {
            case 'self':
                // Co jakiś czas lekko podbijaj reputację gracza
                if (Math.random() < 0.05) {
                    stocks.forEach(s => changeReputation('player', s.symbol, 1 * mod.multiplier));
                }
                break;
            case 'company':
                const stock = stocks.find(s => s.symbol === mod.target.id);
                if (stock) {
                    // Lekki, stały "dryf" ceny w górę
                    stock.price *= (1 + 0.00001 * mod.multiplier);
                }
                break;
            case 'player_company':
                if (playerCompany) {
                    // Bonus do generowanej wartości
                    playerCompany.value += 0.1 * mod.multiplier;
                }
                break;
        }
    });
}

function applyFestivalBonus(participant, multiplier) {
    const ownerName = participant.ownerId === 'player' ? 'Twoje stoisko' : aiCompetitors.find(a => a.id === participant.ownerId)?.name || 'Stoisko';
    const effectDuration = BASE_DELAYS.quarterly * 4; // Efekt trwa rok
    
    const modifier = {
        source: 'Festival',
        multiplier: multiplier,
        expiryTime: Date.now() + (effectDuration / currentSpeedMultiplier),
        target: participant.promotionTarget
    };

    activeModifiers.push(modifier);

    // --- POCZĄTEK NOWEJ LOGIKI ---
    // Dodatkowy, mały bonus do reputacji dla zwycięzcy, jeśli jest nim gracz
    if (participant.ownerId === 'player' && multiplier === 1.0) {
        stocks.forEach(s => {
            if (!s.assetType) { // Bonus nie dotyczy startupów, REITów etc.
                changeReputation('player', s.symbol, 2);
            }
        });
        logEvent('🏆 Zwycięstwo w festynie poprawia Twoją reputację w oczach biznesu (+2 do relacji)!', 'review');
    }
    // --- KONIEC NOWEJ LOGIKI ---

    switch (participant.promotionTarget.type) {
        case 'self':
            logEvent(`🏆 ${ownerName} zdobywa roczny bonus do reputacji!`, 'review');
            break;
        case 'company':
            const stock = stocks.find(s => s.symbol === participant.promotionTarget.id);
            if (stock) logEvent(`🏆 Stoisko ${stock.name} zdobywa roczny bonus do zainteresowania inwestorów!`, 'review');
            break;
        case 'player_company':
             if (playerCompany) logEvent(`🏆 Twoja firma zdobywa roczny bonus do generowanej wartości!`, 'review');
            break;
        case 'city':
            const budgetBoost = 1000 * multiplier; // Bonus do budżetu jest natychmiastowy
            city.budget += budgetBoost;
            logEvent(`🏆 Stoisko miasta przynosi ${budgetBoost.toFixed(0)} PLN do budżetu.`, 'review');
            break;
    }
}

function acceptDebtOffer() {
    if (!currentDebtOffer) return;
    const { collectorSymbol, loanId, newInterestRate } = currentDebtOffer;
    
    const collectorStock = stocks.find(s => s.symbol === collectorSymbol);
    const loan = playerCommercialLoans.find(l => l.id === loanId);

    if (collectorStock && loan) {
        executeDebtTransfer(collectorStock, 'player', loan, newInterestRate);
    }
    currentDebtOffer = null; // Wyczyść ofertę
}

function declineDebtOffer() {
    if (!currentDebtOffer) return;
    logEvent("Odrzucono ofertę przejęcia długu przez windykatora.", 'review');
    currentDebtOffer = null; // Wyczyść ofertę
}

function acceptPawnOffer() {
    if (!currentPawnOffer) return;
    const { pawnShopSymbol, targetStockSymbol, quantity, loanAmount, newInterestRate, durationWeeks } = currentPawnOffer;
    
    const pawnShop = stocks.find(s => s.symbol === pawnShopSymbol);
    const targetStock = stocks.find(s => s.symbol === targetStockSymbol);

    if (pawnShop && targetStock && playerPortfolio[targetStockSymbol]) {
        executePawnLoan('player', pawnShop, targetStock, quantity, loanAmount, newInterestRate, durationWeeks);
    }
    currentPawnOffer = null; // Wyczyść ofertę
}


function declinePawnOffer() {
    if (!currentPawnOffer) return;
    logEvent("Odrzucono ofertę pożyczki lombardowej.", 'review');
    currentPawnOffer = null; // Wyczyść ofertę
    closePawnOfferModal(); // Upewnij się, że modal jest zamknięty
}

function playerBuyPositivePR() {
    const skillLvl = getSkillLevel('mediaManipulation');
    if (skillLvl < 1) return; // Sprawdzenie umiejętności
    const cost = 10000;

    if (playerCash < cost) {
        showToast("Brak środków na artykuł sponsorowany! (Wymagane 10 000 PLN)", 'error');
        return;
    }
    
    const select = document.getElementById('positive-pr-select');
    if (!select || !select.value) {
        showToast("Wybierz spółkę, którą chcesz promować.", 'warning');
        return;
    }
    const symbol = select.value;
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    // Transakcja
    playerCash -= cost;
    displayCash();
    
    // Efekt
    logEvent(`📰 Sfinansowałeś pozytywny artykuł o ${stock.name}. Wizerunek firmy ociepla się.`, 'review');
    showToast(`Artykuł o ${stock.name} został opublikowany!`, 'success');
    
    // 1. Mały, natychmiastowy boost do ceny
    applyPriceEffect(stock.symbol, 0.03, 'positive', 'review'); // 3% boost
    
    // 2. Tarcza PR na 1 kwartał (czas gry)
    stock.prShieldExpiry = Date.now() + (BASE_DELAYS.quarterly / currentSpeedMultiplier); 
    logEvent(`🛡️ ${stock.name} uzyskuje "Tarczę PR" na 1 kwartał.`, 'company');
}


function playerBuyBlackPR() {
    const skillLvl = getSkillLevel('mediaManipulation');
    if (skillLvl < 2) return; // Wymagany Lvl 2
    const cost = 25000;

    if (playerCash < cost) {
        showToast("Brak środków na Czarny PR! (Wymagane 25 000 PLN)", 'error');
        return;
    }

    const select = document.getElementById('black-pr-select');
    if (!select || !select.value) {
        showToast("Wybierz spółkę, którą chcesz zaatakować.", 'warning');
        return;
    }
    const targetSymbol = select.value;
    const targetStock = stocks.find(s => s.symbol === targetSymbol);
    if (!targetStock) return;

    // Transakcja
    playerCash -= cost;
    displayCash();
    blackPRRiskCounter++; // Zwiększ globalny licznik ryzyka

    logEvent(`📰 Ktoś opłacił negatywną kampanię PR przeciwko ${targetStock.name}...`, 'market');
    
    // 1. Sprawdzenie ryzyka wykrycia
    const currentRisk = BLACK_PR_BASE_RISK + (blackPRRiskCounter * BLACK_PR_RISK_INCREASE);
    if (Math.random() < currentRisk) {
        // WYKRYTO!
        logEvent(`🚨 ŚLEDZTWO DZIENNIKARSKIE! Wykryto, że to Ty stałeś za atakiem na ${targetStock.name}! Twoja reputacja legła w gruzach.`, 'error');
        showToast(`ZOSTAŁEŚ PRZYŁAPANY! Twoja reputacja ucierpiała!`, 'error', 7000);
        
        // Zastosuj uniwersalną karę do reputacji
        stocks.forEach(s => {
            if (s.reputation && s.reputation['player'] !== undefined) {
                changeReputation('player', s.symbol, -25); // Duży cios
            }
        });
        // Odśwież UI gazety, aby pokazać nowe, wyższe ryzyko
        if (document.getElementById('newspaper-modal').style.display === 'flex') {
            openNewspaperModal();
        }
        return; // Atak nie dochodzi do skutku
    }

    // 2. Niewykryty - Losowanie wyniku ataku
    const outcomeRoll = Math.random();
    if (outcomeRoll < 0.05) { // 5% szans - Duży Negatywny Event
        logEvent(`🔥 Skandal w ${targetStock.name}! Wypłynęły druzgocące informacje.`, 'company');
        showToast(`Wybuchł skandal w ${targetStock.name}!`, 'warning');
        applyPriceEffect(targetSymbol, -0.15, 'negative', 'company'); // -15% uderzenie
    } else if (outcomeRoll < 0.15) { // 10% szans - Obrona (0.05 + 0.10)
        logEvent(`🛡️ ${targetStock.name} skutecznie dementuje plotki. Atak PR nie powiódł się.`, 'company');
        showToast(`Atak PR na ${targetStock.name} nie powiódł się.`, 'default');
    } else { // 85% szans - Mały Negatywny Event
        logEvent(`📉 Pojawiły się niepokojące plotki na temat ${targetStock.name}.`, 'company');
        applyPriceEffect(targetSymbol, -0.05, 'negative', 'company'); // -5% uderzenie
    }
    
    // Odśwież UI gazety, aby pokazać nowe, wyższe ryzyko
    if (document.getElementById('newspaper-modal').style.display === 'flex') {
        openNewspaperModal();
    }
}

// === SYSTEM REKLAM ===

let adPopupTimerId = null;
let isAdPopupVisible = false;
const AD_POPUP_INTERVAL_BASE = 120000; // Bazowy czas między reklamami (2 minuty)
const AD_POPUP_INITIAL_DELAY = 45000; // Pierwsza reklama po 45 sekundach

/**
 * Planuje pokazanie następnego okienka reklamowego.
 * Czas jest modyfikowany przez liczbę aktywnych banków.
 */
function scheduleAdPopup() {
    // Sprawdź, czy AdBlock jest aktywny
    if (getSkillLevel('adblock') > 0) {
        // console.log("[AdBlock] Reklamy zablokowane.");
        if (adPopupTimerId) clearTimeout(adPopupTimerId); // Anuluj ewentualny timer
        adPopupTimerId = null;
        return;
    }

    // Anuluj poprzedni timer, jeśli istniał
    if (adPopupTimerId) {
        clearTimeout(adPopupTimerId);
    }

    // Oblicz czas do następnej reklamy
    const activeBanksCount = commercialBanks.filter(b => b.isActive).length;
    // Im więcej banków, tym krótszy odstęp (ale nie mniej niż 30s)
    const intervalMultiplier = Math.max(0.25, 1 / Math.max(1, activeBanksCount));
    const randomFactor = getRandomInRange(0.8, 1.2); // Dodaj trochę losowości
    const nextInterval = AD_POPUP_INTERVAL_BASE * intervalMultiplier * randomFactor;
    const finalInterval = Math.max(30000, nextInterval); // Minimum 30 sekund

    // console.log(`[Reklama] Następna za ${Math.round(finalInterval / (1000 * currentSpeedMultiplier))}s czasu rzeczywistego.`);

    // Ustaw timer (uwzględniając prędkość gry)
    adPopupTimerId = setTimeout(showAdPopup, finalInterval / currentSpeedMultiplier);
}

/**
 * Generuje treść reklamy i wyświetla okienko.
 */
function showAdPopup() {
    // Ponownie sprawdź AdBlock i czy okienko już nie jest widoczne
    if (getSkillLevel('adblock') > 0 || isAdPopupVisible) {
        return;
    }

    const popupElement = document.getElementById('ad-popup');
    const contentElement = document.getElementById('ad-content');
    if (!popupElement || !contentElement) return;

    // Wygeneruj treść reklamy
    const adHtml = generateAdContent();
    contentElement.innerHTML = adHtml;

    // Pokaż okienko
    popupElement.style.display = 'block';
    isAdPopupVisible = true;
    adPopupTimerId = null; // Zresetuj ID timera, bo okienko jest już pokazane
}

/**
 * Zamyka okienko reklamowe i planuje pokazanie następnego.
 */
function closeAdPopup() {
    const popupElement = document.getElementById('ad-popup');
    if (popupElement) {
        popupElement.style.display = 'none';
    }
    isAdPopupVisible = false;

    // Zaplanuj następne pokazanie
    scheduleAdPopup();
}

/**
 * Generuje losową treść reklamy (banku lub spółki).
 * @returns {string} - HTML treści reklamy.
 */
function generateAdContent() {
    const activeBanks = commercialBanks.filter(b => b.isActive);
    const regularStocks = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.isBankStock);

    // 80% szans na reklamę banku, jeśli są aktywne banki
    if (activeBanks.length > 0 && Math.random() < 0.8) {
        const bank = getRandomElement(activeBanks);
        const rand = Math.random();
        if (rand < 0.5 && bank.interestRateDeposit > 0.01) { // Reklama lokaty
            return `
                <p>Zmęczony ryzykiem? 😴 Otwórz lokatę w <strong>${bank.name}</strong>!</p>
                <p>Gwarantowane <strong>${(bank.interestRateDeposit * 100).toFixed(1)}%</strong> rocznie!</p>
                <p style="font-size: 11px; text-align: center; margin-top: 8px;">Promocja ograniczona czasowo!</p>
            `;
        } else if (bank.interestRateLoan < 0.15) { // Reklama kredytu (jeśli nie jest super drogi)
             return `
                <p>Brakuje Ci środków na inwestycje? 💰</p>
                <p>Szybki kredyt w <strong>${bank.name}</strong> na <strong>${(bank.interestRateLoan * 100).toFixed(1)}%</strong>!</p>
                <p style="font-size: 11px; text-align: center; margin-top: 8px;">Sprawdź naszą ofertę!</p>
            `;
        }
        // Fallback, jeśli powyższe warunki nie pasują
         return `<p><strong>${bank.name}</strong> - Twój partner w finansach. Oferujemy konta, kredyty i depozyty. Odwiedź nas!</p>`;

    } else if (regularStocks.length > 0) {
        // Reklama zwykłej spółki
        const stock = getRandomElement(regularStocks);
        const messages = [
            `Nie przegap okazji! Akcje <strong>${stock.name} (${stock.symbol})</strong> mogą wkrótce wystrzelić! 🚀 Kup teraz!`,
            `Analitycy mówią: KUPUJ! <strong>${stock.name} (${stock.symbol})</strong> to solidna inwestycja na przyszłość.`,
            `Potencjał wzrostu w <strong>${stock.name} (${stock.symbol})</strong>! Zainwestuj, zanim zrobią to inni!`,
            `Ostatnie sztuki <strong>${stock.name} (${stock.symbol})</strong> w tej cenie! Popyt rośnie, nie zwlekaj!`
        ];
        return `<p>${getRandomElement(messages)}</p>`;
    } else {
        // Reklama zapasowa
        return "<p>Zainwestuj mądrze! Dywersyfikuj swój portfel.</p>";
    }
}

function donateToCompany(symbol, amount, donorId = 'player') {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    let entity, cash;
    if (donorId === 'player') {
        entity = { name: 'Gracz' };
        cash = playerCash;
    } else {
        entity = aiCompetitors.find(ai => ai.id === donorId);
        cash = entity.cash;
    }

    if (cash < amount) {
        if (donorId === 'player') alert("Nie masz wystarczająco gotówki na taki datek!");
        return;
    }

    // Odjęcie gotówki
    if (donorId === 'player') playerCash -= amount;
    else entity.cash -= amount;

    // Obliczenie przyrostu reputacji
    const currentRep = stock.reputation[donorId];
    let repGainPer100 = 1;
    if (currentRep < REPUTATION_LEVELS.TRAGIC) repGainPer100 = 0.25;
    else if (currentRep < REPUTATION_LEVELS.NEGATIVE) repGainPer100 = 0.5;

    let totalRepGain = (amount / 100) * repGainPer100;


    if (donorId === 'player' && getSkillLevel('charisma') >= 3) {
        totalRepGain *= 1.25;
    }
    // --- KONIEC NOWEGO BLOKU ---

    changeReputation(donorId, symbol, totalRepGain);

    logEvent(`🤝 ${entity.name} przekazał datek w wysokości ${amount.toFixed(2)} PLN na rzecz ${stock.name}, poprawiając relacje.`);
    if (donorId === 'player') {
        displayCash();
        openManagementModal(symbol); // Odśwież widok
    }
}

function setDividendPolicy(symbol, newPolicy) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
        stock.dividendPolicy = newPolicy;
        logEvent(`👑 Na Twój wniosek, ${stock.name} zmienia politykę dywidendową na: ${newPolicy}.`, 'review');
        // Odśwież widok modala, jeśli jest otwarty
        if (document.getElementById('management-modal').style.display === 'block') {
            openManagementModal(symbol);
        }
    }
}

function investInCompany() {
    const amount = parseFloat(document.getElementById('company-invest-amount').value);
    if (isNaN(amount) || amount <= 0) {
        alert("Wpisz poprawną kwotę.");
        return;
    }
    if (playerCash >= amount) {
        playerCash -= amount;
        playerCompany.cashInvested += amount;
        displayCash();
        document.getElementById('company-invest-amount').value = '';
        openWorkModal(); // Odśwież widok
    } else {
        alert("Nie masz tyle gotówki.");
    }
}

function playerBailsOutCompany(symbol, amount) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !stock.corporateDebt || stock.corporateDebt <= 0) return;

    if (isNaN(amount) || amount <= 0) {
        alert("Proszę wpisać poprawną, dodatnią kwotę.");
        return;
    }

    const amountToRepay = Math.min(amount, stock.corporateDebt); // Nie można spłacić więcej niż wynosi dług

    if (playerCash < amountToRepay) {
        alert("Nie masz wystarczająco gotówki!");
        return;
    }

    // Transakcja
    playerCash -= amountToRepay;
    stock.corporateDebt -= amountToRepay;

    // Nagroda za pomoc
    stock.financialHealth += 1; // Natychmiastowa poprawa kondycji finansowej
    if (stock.financialHealth > 5) stock.financialHealth = 5; // Ograniczenie do max

    const priceBoost = getRandomInRange(0.01, 0.03); // Niewielki wzrost kursu o 1-3%
    applyPriceEffect(symbol, priceBoost, 'positive', 'review');

    logEvent(`💵‼️ Uratowałeś finanse ${stock.name}, wpłacając ${amountToRepay.toFixed(2)} PLN! Kondycja firmy i kurs akcji rosną.`, 'review');

    displayCash();
    // Odświeżamy widok panelu zarządzania, aby pokazać zaktualizowany dług
    openManagementModal(symbol);
}

function playerRescuesStartup(symbol, amount) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.stage !== 'financial_complications') return;
    if (isNaN(amount) || amount <= 0) {
        alert("Wpisz poprawną kwotę dofinansowania.");
        return;
    }
    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki!");
        return;
    }

    playerCash -= amount;
    startup.rescueCurrent += amount;
    logEvent(`[START-UP] hero Dofinansowałeś ${startup.name} kwotą ${amount.toFixed(2)} PLN!`);
    displayCash();

    // Sprawdź, czy cel został osiągnięty
    if (startup.rescueCurrent >= startup.rescueGoal) {
        showToast(`${startup.name} został uratowany! Przygotowuje się do debiutu.`, 'success', 4000);
        logEvent(`[START-UP] ✅ Dzięki wsparciu inwestorów, ${startup.name} wchodzi na giełdę!`);
        
        // Uruchamiamy scenariusz "Debiut bez Echa"
        const successMultiplier = getRandomInRange(1, 5);
        handleSuccessfulIPO(startup, successMultiplier);
    }
}

function makeOfferToState() {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const symbol = document.getElementById('state-company-select').value;
    const quantity = document.getElementById('state-offer-quantity').valueAsNumber;

    if (!symbol) {
        alert("Proszę wybrać spółkę, której akcje chcesz kupić.");
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        alert("Proszę wpisać poprawną, dodatnią liczbę akcji.");
        return;
    }

    const stock = stocks.find(s => s.symbol === symbol);

    if (stock.stateOfferCooldownUntil && Date.now() < stock.stateOfferCooldownUntil) {
        alert("Możesz złożyć kolejną ofertę dla tej spółki dopiero po upływie czasu oczekiwania.");
        return;
    }

    const exchangeLevel = exchanges[stock.exchange].level;
    let premium = 1.10;
    if (exchangeLevel >= 3) premium = 1.25;
    else if (exchangeLevel >= 2) premium = 1.20;
    else if (exchangeLevel >= 1) premium = 1.15;
    
    const offerPrice = stock.price * premium;
    const totalCost = offerPrice * quantity;

    if (playerCash < totalCost) {
        alert(`Nie masz wystarczająco gotówki! Potrzebujesz ${totalCost.toFixed(2)} PLN.`);
        return;
    }

    if (stock.financialHealth >= 4 && Math.random() < 0.5) {
        // --- ZMIANA 1: Alert -> Toast (Odmowa) ---
        showToast("Oferta odrzucona! Państwo nie jest zainteresowane sprzedażą.", 'error', 5000);
        stock.stateOfferCooldownUntil = Date.now() + (120 * 1000 / currentSpeedMultiplier);
        updateStateOfferInfo();
        return;
    }

    const stateShares = Math.floor(stock.totalShares * stock.stateOwnershipPct);
    if (quantity > stateShares) {
        alert(`Państwo nie posiada wystarczającej liczby akcji na sprzedaż. Maksymalna dostępna liczba to ${stateShares}.`);
        return;
    }

    // Transakcja udana
    playerCash -= totalCost;
    playerPortfolio[symbol].shares += quantity;
    
    const newOwnedByState = stateShares - quantity;
    stock.stateOwnershipPct = newOwnedByState / stock.totalShares;

    stock.stateOfferCooldownUntil = Date.now() + (120 * 1000 / currentSpeedMultiplier);

    // --- ZMIANA 2: Alert -> Toast (Akceptacja) ---
    showToast(`Oferta przyjęta! Nabyłeś ${quantity} akcji ${stock.name}.`, 'success', 5000);
    logEvent(`🏛️ Nabyłeś w ofercji specjalnej ${quantity} akcji ${stock.name} od państwa.`, 'review');

    displayCash();
    displayPortfolio();
    updateStateOfferInfo();
}

function clearExpiredBankBonuses() {
    const now = Date.now();
    activePlayerBankBonuses = activePlayerBankBonuses.filter(bonus => now < bonus.expiryTime);
}

function takeMortgageLoan(bankId, collateralSymbol, collateralQuantity, requestedAmount) {
    const bank = commercialBanks.find(b => b.id === bankId && b.type === BANK_TYPES.MORTGAGE);
    const stock = stocks.find(s => s.symbol === collateralSymbol && !s.assetType);
    const holding = playerPortfolio[collateralSymbol];

    if (!bank || !bank.isActive) {
        alert("Wybrany bank jest nieaktywny lub nie obsługuje hipotek."); return;
    }
    if (!stock) {
        alert("Wybrano nieprawidłowe akcje jako zastaw."); return;
    }
    // SCALONO: Poprawiono walidację - sprawdza dostępne akcje (shares - lockedShares)
    const availableShares = holding ? holding.shares - (holding.lockedShares || 0) : 0;
    if (!holding || availableShares < collateralQuantity) {
        alert(`Nie posiadasz wystarczającej liczby *dostępnych* akcji ${collateralSymbol} (dostępne: ${availableShares}).`); return;
    }
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
        alert("Wprowadź poprawną kwotę pożyczki."); return;
    }
    // Sprawdź, czy gracz nie jest w stanie niewypłacalności
    if (isPlayerInDefault && isPlayerInDefault()) {
         alert("Nie możesz wziąć hipoteki, mając niespłacone zobowiązania!");
         return;
    }

    const collateralValue = stock.price * collateralQuantity;
    const maxLoanAmount = collateralValue * 0.5; // Max 50% wartości zastawu

    if (requestedAmount > maxLoanAmount) {
        alert(`Maksymalna kwota pożyczki pod ten zastaw to ${maxLoanAmount.toFixed(0)} PLN.`); return;
    }
    if (requestedAmount > bank.cash * 0.1) { // Bank nie pożyczy więcej niż 10% swojej gotówki na raz
        alert(`Bank ${bank.name} nie może udzielić tak wysokiej hipoteki w tym momencie.`); return;
    }

    // Parametry pożyczki hipotecznej
    const interestRate = bank.interestRateLoan * 1.1; // Hipoteka ma wyższe ryzyko dla banku
    const loanDurationWeeks = 52; // Hipoteka na rok
    const maturityDate = Date.now() + (loanDurationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    const weeklyRate = interestRate / 52;
    const weeklyPayment = requestedAmount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);

    // Transakcja
    playerCash += requestedAmount;
    bank.cash -= requestedAmount;
    if (!bank.loanPortfolio['player']) bank.loanPortfolio['player'] = [];
    bank.loanPortfolio['player'].push({ id: `mort_${Date.now()}`, initialAmount: requestedAmount, remainingAmount: requestedAmount, interestRate: interestRate, collateral: { symbol: collateralSymbol, quantity: collateralQuantity } });


    // Zapisz pożyczkę u gracza
    const newLoan = {
        id: `mort_${Date.now()}`,
        bankId: bankId,
        bankName: bank.name,
        initialAmount: requestedAmount,
        amount: requestedAmount,
        interestRate: interestRate,
        weeklyPayment: weeklyPayment,
        maturityDate: maturityDate,
        collateral: { symbol: collateralSymbol, quantity: collateralQuantity }
    };
    playerCommercialLoans.push(newLoan);

    // Zablokuj zastawione akcje (dodajemy nową właściwość do portfela)
    if (!holding.lockedShares) holding.lockedShares = 0;
    holding.lockedShares += collateralQuantity;

    logEvent(` Zaciągnięto kredyt hipoteczny ${requestedAmount.toFixed(0)} PLN w ${bank.name} pod zastaw ${collateralQuantity} ${collateralSymbol}.`, 'review');
    displayCash();
    displayPortfolio();
    closeInteractionModal();
}

function runCityEconomy() {
    // 1. Oblicz wydatki
    const infrastructureMaintenance = city.infrastructureLevel * 10000;
    const policySpending = 0; // Tu będą koszty polityki burmistrza
    const totalExpenses = city.baseExpenses + infrastructureMaintenance + policySpending;
    city.budget -= totalExpenses;

    // 2. Oblicz przychody
    // (Podatki od spółek giełdowych są dodawane kwartalnie w processFinancialReports)
    const citizenTax = city.population * 25; // 25 PLN/rok od mieszkańca
    const stateGrant = governmentTreasury > 10000000 ? governmentTreasury * 0.01 : 0; // 1% dotacji z budżetu państwa
    
    if (stateGrant > 0) {
        governmentTreasury -= stateGrant;
        logEvent(`🏛️ Rząd przekazał ${stateGrant.toFixed(0)} PLN dotacji dla miasta ${city.name}.`, 'state');
    }
    city.budget += (citizenTax + stateGrant);

    // 3. Zastosuj politykę burmistrza
    switch (city.mayor.policy) {
        case 'infrastructure':
            // Szybki rozwój infrastruktury
            city.infrastructureLevel += 0.05; 
            break;
        case 'business':
            // Program wsparcia biznesu (dodaje nową firmę prywatną)
            if (privateCompanies.length < 20) { // Limit firm
                 const newPrivateCompany = { /* ... (logika tworzenia nowej firmy) ... */ };
                 // privateCompanies.push(newPrivateCompany);
                 logEvent(`🏙️ W mieście powstaje nowa firma prywatna dzięki programowi wsparcia!`, 'city');
            }
            break;
        case 'municipal':
            // Wsparcie spółek miejskich (dodatkowy budżet dla nich)
            municipalCompanies.forEach(comp => comp.budget += 10000);
            break;
    }

    // 4. Wzrost populacji (zależny od infrastruktury)
    const baseGrowth = getRandomInRange(0.01, 0.02); // 1-2% bazowo
    const infraBonus = (city.infrastructureLevel - 1.0) * 0.01; // +1% za każdy 1.0 infra
    city.population += Math.floor(city.population * (baseGrowth + infraBonus));
    
    logEvent(`🏙️ Roczne rozliczenie miasta ${city.name}. Budżet: ${city.budget.toFixed(0)} PLN. Populacja: ${city.population.toLocaleString()}.`, 'review');
}

//TO NA DOLE

if (typeof window !== 'undefined') {
    try {
        window.dispatchEvent(new Event('gameLogicReady'));
        console.log('[diag] gameLogicReady event dispatched');
    } catch (e) {
        console.warn('[diag] Nie udało się rozesłać gameLogicReady:', e);
    }
}

function fundDepartmentUpgrade(symbol, deptType) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !stock.departments) return;
    
    const currentLevel = stock.departments[deptType].level;
    if (currentLevel >= 3) {
        alert("Ten dział osiągnął już maksymalny poziom.");
        return;
    }

    const cost = 50000 * Math.pow(2, currentLevel);
    
    if (playerCash < cost) {
        alert(`Brak środków! Koszt ulepszenia: ${cost} PLN.`);
        return;
    }

    // Transakcja
    playerCash -= cost;
    stock.departments[deptType].level++;
    
    // Bonus
    changeReputation('player', symbol, 15);
    
    logEvent(`🏢 Sfinansowałeś rozwój działu ${deptType} w ${stock.name} do poziomu ${stock.departments[deptType].level}.`, 'review');
    displayCash();
    
    // ===>>> POPRAWKA TUTAJ <<<===
    // Przekazujemy drugi parametr 'depts', aby modal otworzył się na zakładce Działy
    if (typeof openManagementModal === 'function') {
        openManagementModal(symbol, 'depts'); 
    }
}

// Władza Korony: Blokowanie inwestycji
function blockInvestment(symbol, investmentId) {
    const stock = stocks.find(s => s.symbol === symbol);
    // Wymaga >50% udziałów lub Charyzmy lvl 4+
    const isMajority = (playerPortfolio[symbol]?.shares / stock.totalShares) > 0.5;
    const hasCharisma = getSkillLevel('charisma') >= 4;

    if (!isMajority && !hasCharisma) {
        alert("Nie masz wystarczającej władzy, by zablokować tę inwestycję.");
        return;
    }

    const invIndex = stock.activeInvestments.findIndex(inv => inv.id === investmentId);
    if (invIndex > -1) {
        const inv = stock.activeInvestments[invIndex];
        
        // Kara do reputacji (zarząd nie lubi mikrozarządzania)
        changeReputation('player', symbol, -20);
        
        // Zwrot części kosztów (np. 50% odzyskane)
        stock.cash += inv.cost * 0.5;
        
        stock.activeInvestments.splice(invIndex, 1);
        logEvent(`⛔ Zablokowałeś inwestycję "${inv.name}" w ${stock.name}. Odzyskano 50% środków, ale relacje z zarządem ucierpiały.`, 'review');
        
        // Odśwież UI
        if (typeof openManagementModal === 'function') openManagementModal(symbol);
    }
}

function playerBailsOutCompany(symbol, amount) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !stock.balanceSheet) return;

    if (amount <= 0) {
        alert("Kwota spłaty musi być większa od zera.");
        return;
    }
    
    // Zabezpieczenie przed przepłaceniem długu
    if (amount > stock.balanceSheet.liabilities) {
        amount = stock.balanceSheet.liabilities;
    }
    
    // Zabezpieczenie czy gracza stać
    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki na tę spłatę!");
        return;
    }

    // Wykonanie transakcji
    playerCash -= amount;
    stock.balanceSheet.liabilities -= amount;
    
    logEvent(`💸 Z prywatnych środków spłacono ${amount.toFixed(2)} PLN długu spółki ${stock.name}.`, 'company');
    displayCash(); // Odśwież licznik gotówki na górze ekranu
    
    // Odśwież panel zarządzania na bieżąco
    if (typeof openManagementModal === 'function') {
        openManagementModal(symbol, 'main');
    }
}