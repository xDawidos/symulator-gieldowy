console.log('[diag] player.js loaded');

// Gotówka i portfel FUNDUSZU zarządzanego przez gracza (ustawiane w fund.js → startNewCareer).
// Prywatne pieniądze gracza: playerWallet (fund.js).
let playerCash = 0;
let playerPortfolio = {};
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
let nextFestivalCountdown = 0; 
let activeModifiers = [];
const BASE_SKILL_COST = 100;
const SKILL_COST_INCREASE_FACTOR = 0.75;

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

// --- Umiejętności ---
const skills = {

    'adblock': {
        name: 'Filtr antyspamowy 🚫',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 1000, description: 'Reklamy spółek trafiają do folderu Spam w skrzynce mailowej.' },
            { level: 2, cost: 3000, description: 'Także spam czasopism (promocje, ankiety) trafia do folderu Spam.' }
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
            { level: 1, cost: 500, description: 'Skaner spółek (filtry: C/Z względem sektora, C/WK, dywidenda, zadłużenie, kondycja), wycena porównawcza z C/Z sektora i fazy cyklu spółek w tabeli rynku.' },
            { level: 2, cost: 1500, description: 'Skaner: ROE, marża i wzrost zysku rok do roku. Wycena trzema metodami: C/Z sektora, wartość księgowa (C/WK sektora) i model dywidend Gordona.' },
            { level: 3, cost: 3000, description: 'Konsensus analityków: prognoza zysku przed raportem i wynik vs konsensus po raporcie. Skaner pokazuje potencjał do wartości godziwej.' }
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
            { level: 1, cost: 1500, description: 'Niewielka szansa na otrzymanie prywatnego "przeczucia" o przyszłych wynikach losowej firmy.' },
            { level: 2, cost: 4000, description: 'Twoje "przeczucia" wskazują teraz, czy nadchodzące wydarzenie będzie pozytywne, czy negatywne.' }
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
        name: 'Księgowy → Audytor 🧐',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 600, description: 'Rachunek zysków i strat w karcie spółki (8 kwartałów: przychody → EBITDA → amortyzacja → odsetki → podatek → zysk). Obniża podatki prywatne o 2%.' },
            { level: 2, cost: 1500, description: 'Bilans: gotówka, należności, kapitał własny, zobowiązania, dług netto.' },
            { level: 3, cost: 3000, description: 'Przepływy pieniężne: gotówka z działalności vs zysk netto — czy zysk jest „prawdziwy”.' },
            { level: 4, cost: 5000, description: 'Czerwone flagi kreatywnej księgowości w karcie spółki, na liście i w skanerze.' },
            { level: 5, cost: 8000, description: 'Audytor: zlecasz audyt spółki (koszt z funduszu) — wynik w kolejnym kwartale.' }
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

function buyStock(symbol, quantity) {
    quantity = Math.floor(Number(quantity));
    if (!(quantity > 0)) return;
    // Konto prywatne gracza (fund.js); domyślnie handluje fundusz (playerCash/playerPortfolio).
    if (typeof activeTradingAccount !== 'undefined' && activeTradingAccount === 'private') return buyStockPrivate(symbol, quantity);
    
    const stockToBuy = stocks.find(stock => stock.symbol === symbol);
    if (!stockToBuy) {
        showToast("Błąd systemowy: Nie znaleziono takiej akcji!");
        return;
    }
    if (stockToBuy.isStateOwned && getSkillLevel('nepotism') === 0) {
        showToast("Nie masz odpowiednich znajomości, aby inwestować w tę strategiczną spółkę Skarbu Państwa!");
        return;
    }
    if (typeof isTradingBlocked === 'function' && isTradingBlocked('player')) { showToast('Blokada handlu nałożona przez organy ścigania.', 'error'); return; }
    if (!canAccessExchange(stockToBuy.exchange)) {
        showToast(`Twoje stanowisko nie daje dostępu do giełdy ${exchanges[stockToBuy.exchange]?.name || stockToBuy.exchange}. Awans otworzy kolejne giełdy.`, 'warning');
        return;
    }
    if (stockToBuy.isTradeLocked) {
        showToast(`Handel akcjami ${stockToBuy.name} jest tymczasowo wstrzymany!`);
        return;
    }

    // Dostępne akcje: wolny obrót (bez pakietu insiderów, państwa i akcji własnych) minus akcje inwestorów
    const sharesAvailableToBuy = getAvailableShares(stockToBuy);

    // Poprawka błędu: używamy poprawnej nazwy zmiennej w warunku
    if (quantity > sharesAvailableToBuy) {
        showToast(`Nie ma wystarczającej liczby akcji na rynku! Dostępne: ${sharesAvailableToBuy}`);
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
        showToast("Nie masz wystarczająco gotówki, aby dokonać tego zakupu!");
        return;
    }

    // Transakcja
    playerCash -= totalCost;
    stockToBuy.sharesHeld += quantity;

    // Minimalny wpływ na cenę (udział w wolnym obrocie) i log transakcji funduszu (compliance)
    applyTradeImpact(stockToBuy, quantity, 1);
    logFundTrade(symbol, 'buy');

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

    if (typeof onFundTrade === 'function') onFundTrade(stockToBuy, quantity, 'buy'); // relacje z botami (relations.js)
    if (typeof chargeMarketCommission === 'function') chargeMarketCommission(stockToBuy, quantity * stockToBuy.price, 'player'); // prowizja operatora rynku

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
    quantity = Math.floor(Number(quantity));
    if (!(quantity > 0)) return;
    if (typeof activeTradingAccount !== 'undefined' && activeTradingAccount === 'private') return sellStockPrivate(symbol, quantity);
    const stockToSell = stocks.find(stock => stock.symbol === symbol);
    const holding = playerPortfolio[symbol];

    if (!holding || holding.shares - (holding.lockedShares || 0) < quantity) {
        showToast(`Nie masz wystarczającej liczby wolnych akcji ${stockToSell ? stockToSell.name : symbol}${holding?.lockedShares ? ` (zablokowane: ${holding.lockedShares})` : ''}.`);
        return;
    }

    if (typeof isTradingBlocked === 'function' && isTradingBlocked('player')) { showToast('Blokada handlu nałożona przez organy ścigania.', 'error'); return; }
    if (stockToSell.isTradeLocked) {
        showToast(`Handel akcjami ${stockToSell.name} jest tymczasowo wstrzymany!`);
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
    if (profit > 0 && typeof playerFund !== 'undefined' && !playerFund) { // fundusz (etap B) nie płaci podatku ani nie zbiera XP
        let taxRateCapitalGains = TAX_RATES.capitalGains;
        let playerTaxModifier = 1.0;
        const sanEscobarLvl = getSkillLevel('sanEscobar');
        if (sanEscobarLvl >= 1) playerTaxModifier = 0.95;
        if (sanEscobarLvl >= 4) playerTaxModifier = 0.0;
        // Księgowy: -2% za każdy poziom (min 90%)
        const accLvl = getSkillLevel('accountant');
        if (accLvl > 0) playerTaxModifier *= 0.98; // N3: stała obniżka 2%

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
        displayXP();
    }

    playerCash += totalGainNet; // Gracz otrzymuje kwotę netto
    holding.shares -= quantity;
    stockToSell.sharesHeld -= quantity;
    applyTradeImpact(stockToSell, quantity, -1);
    logFundTrade(symbol, 'sell');
    if (typeof onFundTrade === 'function') onFundTrade(stockToSell, quantity, 'sell'); // relacje z botami (relations.js)
    if (typeof chargeMarketCommission === 'function') chargeMarketCommission(stockToSell, quantity * stockToSell.price, 'player'); // prowizja operatora rynku
    if (typeof onParabankSharesSold === 'function') onParabankSharesSold(stockToSell, quantity); // panika w parabanku (B1)
    if (typeof noteMentorEvent === 'function') noteMentorEvent('sell', stockToSell); // N4: zadanie „ucieczka przed korektą”

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

function buyIndex(indexId, quantity) {
    // Sprawdzenie, czy gracz ma odblokowaną umiejętność Poziomu 2
    if (getSkillLevel('indexAnalystLvl1') < 2) {
        showToast("Musisz odblokować umiejętność 'Makler Indeksowy' (Analityk Indeksowy poz. 2), aby handlować indeksami!");
        return;
    }

    const indexToBuy = marketIndexes.find(i => i.id === indexId);
    if (!indexToBuy) {
        showToast("Błąd systemowy: Nie znaleziono takiego indeksu!");
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
        showToast("Nie masz wystarczająco gotówki, aby dokonać tego zakupu!");
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
        showToast("Musisz odblokować umiejętność 'Makler Indeksowy' (Analityk Indeksowy poz. 2), aby handlować indeksami!");
        return;
    }
    if (!indexToSell || !holding || holding.shares < quantity || quantity <= 0) {
        showToast(`Nie masz wystarczającej liczby jednostek ${indexToSell ? indexToSell.name : indexId}. Posiadasz: ${holding ? holding.shares : 0}`);
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
    if (profit > 0 && typeof playerFund !== 'undefined' && !playerFund) { // fundusz (etap B) nie płaci podatku ani nie zbiera XP
        let taxRateCapitalGains = TAX_RATES.capitalGains;
        let playerTaxModifier = 1.0;
        const sanEscobarLvl = getSkillLevel('sanEscobar');
        if (sanEscobarLvl >= 1) playerTaxModifier = 0.95; // Lvl 1: 5% zniżki
        if (sanEscobarLvl >= 4) playerTaxModifier = 0.0; // Lvl 4: 0% podatku
        // Księgowy: -2% za każdy poziom (min 90%)
        { const _accLvl = getSkillLevel('accountant'); if (_accLvl > 0) playerTaxModifier *= 0.98; }

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



// Miasto (darowizny, gospodarka, festyn, wybory) — city.js

function contributeToInvestmentPool(contributorId, amount) {
    // Walidacja dla gracza
    if (contributorId === 'player') {
        if (!canFundInvestInStartups(amount)) return; // limit 10% aktywów funduszu
        if (isNaN(amount) || amount <= 0) {
            showToast("Proszę wpisać poprawną kwotę.");
            return;
        }
        if (playerCash < amount) {
            showToast("Nie masz wystarczająco gotówki!");
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
            showToast("Brak wystarczających środków na koncie. Twoje auto-inwestowanie w pulę start-upów zostało wstrzymane.");
        }

        // Resetujemy timer na nową wartość z ustawień.
        playerAutoInvest.timer = playerAutoInvest.interval;
    }
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

/** Dostęp do giełd wynika ze stanowiska w korporacji (fund.js), a nie z wartości portfela. */
function checkPlayerTierUpgrade() {
    if (typeof syncExchangeAccessWithPosition === 'function' && playerProfile) {
        syncExchangeAccessWithPosition();
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
        remainingMs: durationMs, // czas gry
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

function updateFestival(deltaMs = BASE_DELAYS.stockUpdate) {
    if (!festival || !festival.isActive) return; // Jeśli nie ma festynu, wyjdź
    festival.remainingMs = (Number.isFinite(festival.remainingMs) ? festival.remainingMs : 0) - deltaMs;

    // --- Sprawdzenie końca festynu ---
    if (festival.remainingMs <= 0) {
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

    if (typeof applyFestivalSectorBoost === 'function') applyFestivalSectorBoost(successScore);
    festival = null;
    nextFestivalCountdown = BASE_DELAYS.quarterly * 4; // Ustaw odliczanie na rok

    updateCityModalContent();
}

function playerJoinFestival(promotionTarget) {
    // Stoisko i promocje opłaca gracz prywatnie (portfel), nie fundusz klientów.
    if (!cityInvestment.playerHasUnlocked) {
        showToast(`Najpierw odblokuj inwestycje miejskie (darowizna ${CITY_UNLOCK_DONATION} zł z portfela prywatnego).`, 'warning');
        return; // Zakończ funkcję, jeśli miasto nie jest odblokowane dla gracza
    }
    if (!festival || !festival.isActive || playerWallet.cash < FESTIVAL_STALL_LEVELS[0].cost) return;

    playerWallet.cash -= FESTIVAL_STALL_LEVELS[0].cost;
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
    if (!participant || !nextLevel || playerWallet.cash < nextLevel.cost) return;

    playerWallet.cash -= nextLevel.cost;
    participant.level++;
    participant.interest += 20; // Bonus za ulepszenie
    openCityInvestmentModal();
}

function playerPromoteStall(promoType) {
    const participant = festival.participants.find(p => p.ownerId === 'player');
    const action = PROMOTION_ACTIONS[promoType];
    if (!participant || !action || playerWallet.cash < action.cost) return;

    playerWallet.cash -= action.cost;
    participant.interest += action.interest;
    openCityInvestmentModal();
}

function playerPromoteEvent() {
    if (!festival || playerWallet.cash < 500) return;
    playerWallet.cash -= 500;
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
        case 'city':
            const budgetBoost = 1000 * multiplier; // Bonus do budżetu jest natychmiastowy
            city.budget += budgetBoost;
            logEvent(`🏆 Stoisko miasta przynosi ${budgetBoost.toFixed(0)} PLN do budżetu.`, 'review');
            break;
    }
}

// Reklamy → spam w skrzynce mailowej (mail.js)

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
        if (donorId === 'player') showToast("Nie masz wystarczająco gotówki na taki datek!");
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
    if (donorId === 'player' && typeof onPlayerDonation === 'function') onPlayerDonation(stock, amount);

    logEvent(`🤝 ${entity.name} przekazał datek w wysokości ${amount.toFixed(2)} PLN na rzecz ${stock.name}, poprawiając relacje.`);
    if (donorId === 'player') {
        displayCash();
        openManagementModal(symbol); // Odśwież widok
    }
}

function setDividendPolicy(symbol, newPolicy) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
        setCompanyDividendPolicy(stock, newPolicy);
        stock.dividendPolicyLockedByOwner = true; // zarząd nie zmieni strategii narzuconej przez właściciela
        logEvent(`👑 Na Twój wniosek, ${stock.name} zmienia politykę dywidendową na: ${getDividendPolicyLabel(stock.dividendPolicy)}.`, 'review');
        // Odśwież widok modala, jeśli jest otwarty
        if (document.getElementById('management-modal').style.display === 'block') {
            openManagementModal(symbol);
        }
    }
}

function makeOfferToState() {
    const symbol = document.getElementById('state-company-select').value;
    const quantity = document.getElementById('state-offer-quantity').valueAsNumber;

    if (!symbol) {
        showToast("Proszę wybrać spółkę, której akcje chcesz kupić.");
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        showToast("Proszę wpisać poprawną, dodatnią liczbę akcji.");
        return;
    }

    const stock = stocks.find(s => s.symbol === symbol);

    if (stock.stateOfferCooldownUntil && Date.now() < stock.stateOfferCooldownUntil) {
        showToast("Możesz złożyć kolejną ofertę dla tej spółki dopiero po upływie czasu oczekiwania.");
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
        showToast(`Nie masz wystarczająco gotówki! Potrzebujesz ${totalCost.toFixed(2)} PLN.`);
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
        showToast(`Państwo nie posiada wystarczającej liczby akcji na sprzedaż. Maksymalna dostępna liczba to ${stateShares}.`);
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
        showToast("Ten dział osiągnął już maksymalny poziom.");
        return;
    }

    const cost = 50000 * Math.pow(2, currentLevel);
    
    if (playerCash < cost) {
        showToast(`Brak środków! Koszt ulepszenia: ${cost} PLN.`);
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

// blockInvestment: zob. companies.js (jedna implementacja dla inwestycji wewnętrznych i budowlanych).

function playerBailsOutCompany(symbol, amount) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !stock.balanceSheet) return;

    if (amount <= 0) {
        showToast("Kwota spłaty musi być większa od zera.");
        return;
    }
    
    // Zabezpieczenie przed przepłaceniem długu
    if (amount > stock.balanceSheet.liabilities) {
        amount = stock.balanceSheet.liabilities;
    }
    
    // Zabezpieczenie czy gracza stać
    if (playerCash < amount) {
        showToast("Nie masz wystarczająco gotówki na tę spłatę!");
        return;
    }

    // Wykonanie transakcji
    playerCash -= amount;
    stock.balanceSheet.liabilities -= amount;
    
    logEvent(`💸 Ze środków funduszu spłacono ${amount.toFixed(2)} PLN długu spółki ${stock.name}.`, 'company');
    displayCash(); // Odśwież licznik gotówki na górze ekranu
    
    // Odśwież panel zarządzania na bieżąco
    if (typeof openManagementModal === 'function') {
        openManagementModal(symbol, 'main');
    }
}