// =================================================================================
// player.js: Gracz: szkolenia, handel, fundusz (NAV, okresy), kariera w korporacji, klienci i rynek JU.
// Złączone pliki: player.js, fund.js, career.js, clients.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## player.js
// #################################################################################

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

    // 0.13.1 (B2): koszt z prowizją operatora rynku liczony przed transakcją — zakup nigdy nie daje ujemnej gotówki.
    const quote = getBuyQuote(stockToBuy, quantity, 'fund');
    const totalCost = quote.cost;
    if (playerCash < quote.total) {
        showToast(`Nie masz wystarczająco gotówki: ${formatZl(quote.total)} z prowizją, maksymalnie ${getMaxBuyQuantity(stockToBuy, 'fund')} akcji.`);
        return;
    }
    const tradeValue = stockToBuy.price * quantity; // podstawa prowizji: cena przed wpływem zlecenia

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
    if (typeof chargeMarketCommission === 'function') chargeMarketCommission(stockToBuy, tradeValue, 'player'); // prowizja operatora rynku (ujęta w quote)

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

    const availableStartups = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding' && getStartupFundingGap(s) >= 1);
    if (availableStartups.length === 0) {
        return; // Brak celów inwestycyjnych
    }

    const targetStartup = getRandomElement(availableStartups);
    // 0.13.1 (B6): pula dokłada najwyżej brakującą kwotę celu; reszta zostaje w puli (proporcjonalnie do wkładów).
    const investmentAmount = Math.min(investmentPool.totalFunds, getStartupFundingGap(targetStartup));
    const investedShare = investmentAmount / investmentPool.totalFunds;
    const invested = Object.fromEntries(Object.entries(investmentPool.contributors).map(([id, amount]) => [id, amount * investedShare]));

    // "Inwestujemy" w imieniu puli
    targetStartup.currentFunding += investmentAmount;
    targetStartup.investors['Pula Inwestycyjna'] = (targetStartup.investors['Pula Inwestycyjna'] || 0) + investmentAmount;
    // Zapisujemy, kto i ile zainwestował w tej rundzie, aby potem poprawnie rozdać akcje
    if (!targetStartup.poolInvestors) {
        targetStartup.poolInvestors = [];
    }
    targetStartup.poolInvestors.push({
        amount: investmentAmount,
        contributors: invested // wkłady użyte w tej rundzie
    });

    logEvent(`[PULA] 💰 Pula inwestycyjna zainwestowała ${investmentAmount.toFixed(2)} PLN w ${targetStartup.name}${investedShare < 1 ? ` (brakowało tyle do celu; w puli zostaje ${(investmentPool.totalFunds - investmentAmount).toFixed(2)} PLN)` : ''}!`);

    // Pomniejszamy pulę o zainwestowaną część.
    investmentPool.totalFunds -= investmentAmount;
    for (const id of Object.keys(investmentPool.contributors)) {
        investmentPool.contributors[id] -= invested[id];
        if (investmentPool.contributors[id] < 0.01) delete investmentPool.contributors[id];
    }
    if (investmentPool.totalFunds < 0.01) { investmentPool.totalFunds = 0; investmentPool.contributors = {}; }
}

/** Brakująca kwota do celu zbiórki startupu. */
function getStartupFundingGap(startup) {
    return Math.max(0, (Number(startup?.fundingGoal) || 0) - (Number(startup?.currentFunding) || 0));
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

// #################################################################################
// ## fund.js
// #################################################################################

// fund.js — Fundusz gracza (etap B)
//
// Gracz jest zarządcą funduszu. Gotówka i portfel FUNDUSZU to dotychczasowe `playerCash`
// i `playerPortfolio` — dzięki temu handel, korona 👑 (>50%), dywidendy i wykresy działają dla
// funduszu bez przepisywania. Prywatne pieniądze gracza są w `playerWallet`.
//
// Pojęcia:
//  - JU (jednostki uczestnictwa), NAV = aktywa funduszu / liczba JU,
//  - klienci z charakterami decydują o umorzeniach (stopniowo) i o zapisach w emisjach,
//  - zaufanie (0–100) wynika z wyników 4 ostatnich okresów (15 min gry) vs benchmark GIG,
//  - opłata za zarządzanie (2% rocznie) trafia do korporacji; gracz dostaje udział zależny od stanowiska,
//  - premia za wyniki na koniec okresu za nadwyżkę nad benchmarkiem.

const FUND_PERIOD_MS = BASE_DELAYS.quarterly * 3;      // okres oceny = 3 kwartały = 15 min gry
const FUND_PERIODS_SHOWN = 4;                          // wykres: 4 okresy = 1 godzina gry
const FUND_START_CASH = 10000;
const FUND_START_UNITS = 1000;
const GRANDMA_POCKET_MONEY = 100;
// Rok gry trwa 20 minut, więc „roczna” opłata 2% zabierałaby 1,5% na każdy 15-minutowy okres.
// 0,8% rocznie ≈ 0,6% na okres.
const MANAGEMENT_FEE_ANNUAL = 0.008;
const FUND_WEEKS_PER_YEAR = 20;                        // rok gry = 4 kwartały × 5 tygodni
const CLIENT_GAINS_TAX = 0.19;                         // podatek klienta od zysku przy umorzeniu
const MAX_EMISSIONS_PER_PERIOD = 2;
const MAX_WEEKLY_REDEMPTION_SHARE = 0.15;              // odpływ w tygodniu maks. 15% JU
const TRAINING_COST_FACTOR = 0.25;                     // dawne XP → złotówki
const PRIVATE_GAINS_TAX = 0.19;

const CAREER_POSITIONS = [
    { id: 'junior',      name: 'Młodszy zarządca',   feeShare: 0.15, bonusMult: 1.0, exchangeAccessLevel: 2 },
    { id: 'manager',     name: 'Zarządca funduszu',  feeShare: 0.20, bonusMult: 1.3, exchangeAccessLevel: 3 },
    { id: 'senior',      name: 'Starszy zarządca',   feeShare: 0.25, bonusMult: 1.6, exchangeAccessLevel: 3 },
    { id: 'projectLead', name: 'Kierownik projektu', feeShare: 0.30, bonusMult: 2.0, exchangeAccessLevel: 5 },
    { id: 'board',       name: 'Członek zarządu',    feeShare: 0.35, bonusMult: 2.5, exchangeAccessLevel: 6 },
    { id: 'ceo',         name: 'CEO',                feeShare: 0.40, bonusMult: 3.0, exchangeAccessLevel: 7 }
];

// Kraje: na start dostępna tylko Polska; pozostałe jako przyszłe „przepustki” (mechanizm, bez treści).
const START_COUNTRIES = [
    { id: 'PL', name: 'Polska', flag: '🇵🇱', available: true },
    { id: 'DE', name: 'Niemcy', flag: '🇩🇪', available: false, passCost: 50000 },
    { id: 'CZ', name: 'Czechy', flag: '🇨🇿', available: false, passCost: 20000 },
    { id: 'SE', name: 'Szwecja', flag: '🇸🇪', available: false, passCost: 40000 },
    { id: 'CH', name: 'Szwajcaria', flag: '🇨🇭', available: false, passCost: 60000 },
    { id: 'US', name: 'USA', flag: '🇺🇸', available: false, passCost: 150000 },
    { id: 'JP', name: 'Japonia', flag: '🇯🇵', available: false, passCost: 100000 },
    { id: 'CN', name: 'Chiny', flag: '🇨🇳', available: false, passCost: 100000 },
    { id: 'IN', name: 'Indie', flag: '🇮🇳', available: false, passCost: 80000 }
];

// Charaktery klientów (etap F1, logika w clients.js): cierpliwość, awersja do zmienności, pogoń za wynikiem,
// lojalność, typowa wpłata (zł), skłonność do dokupowania (buyBias), do sprzedaży na rynku wtórnym
// (secondaryBias), wrażliwość na opłaty, wymagane zaufanie (trustNeed: +/− do progu 55) i panika (umarza całość).
const CLIENT_TYPES = {
    sly:         { key: 'sly',         label: 'Spryciarz',  icon: '🦊', patience: 0.25, volAversion: 0.4, chase: 1.6, loyalty: 0.1, size: [300, 1500],  buyBias: 0.6, secondaryBias: 1.3, feeSensitivity: 0.3, trustNeed: 0,   panic: false },
    careful:     { key: 'careful',     label: 'Ostrożny',   icon: '🛡️', patience: 0.75, volAversion: 1.6, chase: 0.3, loyalty: 0.5, size: [300, 1200],  buyBias: 0.4, secondaryBias: 0.7, feeSensitivity: 0.3, trustNeed: 5,   panic: false },
    fearful:     { key: 'fearful',     label: 'Strachliwy', icon: '😨', patience: 0.3,  volAversion: 2.2, chase: 0.6, loyalty: 0.2, size: [200, 800],   buyBias: 0.3, secondaryBias: 1.0, feeSensitivity: 0.2, trustNeed: 12,  panic: true },
    brave:       { key: 'brave',       label: 'Odważny',    icon: '🦁', patience: 0.85, volAversion: 0.3, chase: 1.0, loyalty: 0.6, size: [400, 1600],  buyBias: 1.2, secondaryBias: 0.4, feeSensitivity: 0.2, trustNeed: -10, panic: false },
    rich:        { key: 'rich',        label: 'Bogaty',     icon: '💎', patience: 0.8,  volAversion: 0.8, chase: 0.8, loyalty: 0.5, size: [2500, 9000], buyBias: 0.9, secondaryBias: 0.6, feeSensitivity: 0.2, trustNeed: 0,   panic: false },
    miser:       { key: 'miser',       label: 'Sknera',     icon: '🪙', patience: 0.6,  volAversion: 1.0, chase: 0.6, loyalty: 0.4, size: [150, 700],   buyBias: 0.3, secondaryBias: 0.9, feeSensitivity: 1.5, trustNeed: 5,   panic: false },
    institution: { key: 'institution', label: 'Instytucja', icon: '🏛️', patience: 0.5,  volAversion: 0.8, chase: 1.0, loyalty: 0.3, size: [2000, 6000], buyBias: 0.5, secondaryBias: 0.5, feeSensitivity: 0.5, trustNeed: 0,   panic: false, comparesRivals: true },
    investor:    { key: 'investor',    label: 'Inwestor',   icon: '🐋', patience: 0.6,  volAversion: 0.6, chase: 1.2, loyalty: 0.4, size: [2000, 10000], buyBias: 0.7, secondaryBias: 0.8, feeSensitivity: 0.4, trustNeed: 0,  panic: false, comparesRivals: true },
    // 0.13: odchodzi, gdy spółki z udziałem funduszu > 10% mają niezadowoloną załogę albo szarą strefę (litera S w ESG).
    ethical:     { key: 'ethical',     label: 'Etyczny',    icon: '🌱', patience: 0.6,  volAversion: 0.8, chase: 0.6, loyalty: 0.5, size: [500, 2500],  buyBias: 0.6, secondaryBias: 0.6, feeSensitivity: 0.3, trustNeed: 0,   panic: false, ethical: true }
};

const CLIENT_FIRST_NAMES = ['Anna', 'Piotr', 'Maria', 'Tomasz', 'Ewa', 'Jan', 'Kasia', 'Marek', 'Zofia', 'Adam', 'Halina', 'Krzysztof', 'Agata', 'Paweł', 'Irena'];
const CLIENT_LAST_INITIALS = ['K.', 'N.', 'W.', 'Z.', 'L.', 'M.', 'S.', 'B.', 'D.', 'P.'];
const INSTITUTION_NAMES = ['Fundacja Rozwoju', 'Kasa Zapomogowa „Promyk”', 'Spółdzielnia Mieszkaniowa „Zacisze”', 'Fundusz Emerytalny Gminy', 'Stowarzyszenie Kupców'];

// Startupy: inwestuje tylko fundusz, do 10% aktywów (startups.js).
const FEATURE_FLAGS = {
    startups: true
};

// Szkolenia ukryte (mechaniki wyłączone w etapie B).
const HIDDEN_TRAININGS = ['mediaManipulation']; // PR zostaje tylko dla botów

let playerProfile = null;      // { name, corporation, fundName, country, positionId, startedAt, cv: [] }
let playerFund = null;         // stan funduszu (patrz createPlayerFund)
let playerWallet = createPlayerWallet(0);
let activeTradingAccount = 'fund';  // 'fund' | 'private'

function createPlayerWallet(cash) {
    return { cash, portfolio: {}, fundUnits: 0, fundUnitsCost: 0, complianceRisk: 0, fines: 0 };
}

// =================================================================================
// STANOWISKO I DOSTĘP DO GIEŁD
// =================================================================================

function getPlayerPosition() {
    const id = playerProfile?.positionId || 'junior';
    return CAREER_POSITIONS.find(position => position.id === id) || CAREER_POSITIONS[0];
}

/** Dostęp do giełd wynika ze stanowiska (Śmieciowa/Brązowa/Srebrna na start). */
function syncExchangeAccessWithPosition() {
    playerAccessLevel = getPlayerPosition().exchangeAccessLevel;
}

function canAccessExchange(exchangeKey) {
    const level = exchanges[exchangeKey]?.level ?? 99;
    return level <= playerAccessLevel;
}

// =================================================================================
// WYCENA FUNDUSZU
// =================================================================================

function getHoldingMarketValue(symbol, holding) {
    if (!holding || holding.assetType === 'Startup') return Number(holding?.investedAmount) || 0;
    const market = stocks.find(s => s.symbol === symbol) || etfs.find(e => e.symbol === symbol) || marketIndexes.find(i => i.id === symbol);
    return (Number(market?.price ?? market?.value) || 0) * (Number(holding.shares) || 0);
}

function getFundPortfolioValue() {
    let value = 0;
    for (const symbol in playerPortfolio) value += getHoldingMarketValue(symbol, playerPortfolio[symbol]);
    return value;
}

function getFundAssets() {
    const deposits = typeof getFundDepositsValue === 'function' ? getFundDepositsValue() : 0; // lokaty (finance.js)
    const ppp = typeof getFundPppValue === 'function' ? getFundPppValue() : 0;                 // projekty miejskie (city.js)
    const bridge = typeof getFundBridgeLoansValue === 'function' ? getFundBridgeLoansValue() : 0; // pożyczki pomostowe (finance.js)
    const projectBonds = typeof getFundProjectBondsValue === 'function' ? getFundProjectBondsValue() : 0; // obligacje projektowe (projects.js)
    return Math.max(0, Number(playerCash) || 0) + getFundPortfolioValue() + getFundBondsValue() + deposits + ppp + bridge + projectBonds;
}

function getFundNav() {
    if (!playerFund || !(playerFund.units > 0)) return 0;
    return getFundAssets() / playerFund.units;
}

function getBenchmarkValue() {
    return Number(marketIndexes.find(index => index.id === 'GIG')?.value) || 0;
}

/** Fundusze zewnętrzne: holdingi wyceniane jak NAV (pełni rywale w etapie C). */
// Holdingi-czasopisma zostają czasopismami (etap E: źródła maili), pozostałe holdingi to fundusze zewnętrzne.
const MEDIA_HOLDINGS = ['PULS', 'FLESZ', 'OBSER'];

function getExternalFunds() {
    return stocks.filter(stock => stock.assetType === 'Holding' && !stock.isBankrupt && !MEDIA_HOLDINGS.includes(stock.symbol));
}

/** NAV na akcję holdingu: (gotówka + wartość portfela) / liczba akcji — bez szumu ceny giełdowej. */
function getExternalFundValue(fund) {
    let value = Math.max(0, Number(fund.cash) || 0);
    for (const symbol in fund.holdingPortfolio || {}) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) value += stock.price * (Number(fund.holdingPortfolio[symbol].quantity) || 0);
    }
    return fund.totalShares > 0 ? value / fund.totalShares : 0;
}

// =================================================================================
// NOWY START KARIERY
// =================================================================================

function createPlayerFund() {
    return {
        version: 1,
        units: FUND_START_UNITS,
        trust: 55,
        clients: [],
        nextClientId: 1,
        periods: [],
        periodNumber: 1,
        current: null,
        navHistory: [],
        feesPaidTotal: 0,
        tradeLog: [],       // ostatnie transakcje funduszu (compliance)
        clockMs: 0          // czas gry funduszu
    };
}

function randomClientName(type) {
    if (type === 'institution') return getRandomElement(INSTITUTION_NAMES);
    return `${getRandomElement(CLIENT_FIRST_NAMES)} ${getRandomElement(CLIENT_LAST_INITIALS)}`;
}

function addFundClient(type, units, nav) {
    const client = {
        id: playerFund.nextClientId++,
        name: randomClientName(type),
        type,
        units,
        avgCost: nav,
        satisfaction: getRandomInRange(0.55, 0.75),
        joinedPeriod: playerFund.periodNumber
    };
    playerFund.clients.push(client);
    if (typeof ensureClientProfile === 'function') ensureClientProfile(client);
    return client;
}

/**
 * Nowa kariera: profil gracza, fundusz 10 000 zł / 1000 JU od kilkunastu klientów,
 * 100 zł kieszonkowego od babci w portfelu prywatnym.
 */
function startNewCareer(profile = {}) {
    playerProfile = {
        name: profile.name || 'Gracz',
        corporation: profile.corporation || 'Korporacja Inwestycyjna',
        fundName: profile.fundName || 'Fundusz Start',
        country: profile.country || 'PL',
        positionId: 'junior',
        startedAt: Date.now(),
        cv: [{ type: 'start', text: `Zatrudnienie w ${profile.corporation || 'korporacji'} jako Młodszy zarządca.` }]
    };

    playerCash = FUND_START_CASH;
    for (const symbol of Object.keys(playerPortfolio)) delete playerPortfolio[symbol];
    playerWallet = createPlayerWallet(GRANDMA_POCKET_MONEY);
    activeTradingAccount = 'fund';

    playerFund = createPlayerFund();
    const nav = FUND_START_CASH / FUND_START_UNITS;

    // Kilkunastu startowych klientów; JU rozdzielone wg typowej wpłaty.
    const count = getRandomIntInRange(12, 15);
    const types = ['brave', 'careful', 'careful', 'miser', 'miser', 'fearful', 'sly', 'sly', 'rich', 'institution'];
    const weights = [];
    for (let i = 0; i < count; i++) {
        const type = i < types.length ? types[i] : getRandomElement(['careful', 'miser', 'fearful', 'sly', 'brave']);
        const def = CLIENT_TYPES[type];
        weights.push({ type, weight: getRandomInRange(def.size[0], def.size[1]) });
    }
    const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
    let assigned = 0;
    weights.forEach((item, index) => {
        const units = index === weights.length - 1
            ? FUND_START_UNITS - assigned
            : Math.max(1, Math.round(FUND_START_UNITS * item.weight / totalWeight));
        assigned += units;
        const client = addFundClient(item.type, units, nav);
        if (index === 0) client.loyal = true; // pierwszy klient — wierny znajomy rodziny, prawie nigdy nie odchodzi
    });

    beginFundPeriod();
    syncExchangeAccessWithPosition();
    if (typeof createCorporation === 'function') createCorporation();
    if (typeof createJuMarket === 'function') juMarket = createJuMarket();
    if (typeof createMailbox === 'function') {
        mailbox = createMailbox();
        addMail({ sender: 'corporation', subject: `Witamy w ${playerProfile.corporation}!`, body: `Od dziś zarządzasz funduszem „${playerProfile.fundName}”. Wyniki oceniamy co 4 okresy. Wiadomości z rynku przysyłają czasopisma — prenumeraty ustawisz w zakładce Subskrypcje.`, importance: 2 });
    }

    logEvent(`💼 ${playerProfile.name} zostaje młodszym zarządcą funduszu „${playerProfile.fundName}” (${FUND_START_CASH.toLocaleString('pl-PL')} zł, ${FUND_START_UNITS} JU, ${playerFund.clients.length} klientów).`, 'review');
}

// =================================================================================
// OKRESY, ZAUFANIE, OPŁATY, KLIENCI
// =================================================================================

function beginFundPeriod() {
    const nav = getFundNav();
    playerFund.current = {
        number: playerFund.periodNumber,
        elapsedMs: 0,
        startNav: nav,
        startBenchmark: getBenchmarkValue(),
        startRivals: Object.fromEntries(getExternalFunds().map(fund => [fund.symbol, getExternalFundValue(fund)])),
        peakNav: nav,
        maxDrawdown: 0,
        weeklyNavs: [nav],
        emissions: 0,
        inflow: 0,
        outflow: 0,
        forcedSales: 0
    };
}

/** Tik funduszu (co sekundę gry). */
function updateFund(deltaMs) {
    if (!playerFund || isGamePaused) return;
    const delta = Number(deltaMs) || 0;
    playerFund.clockMs += delta;

    const current = playerFund.current;
    current.elapsedMs += delta;

    const nav = getFundNav();
    if (nav > current.peakNav) current.peakNav = nav;
    if (current.peakNav > 0) current.maxDrawdown = Math.max(current.maxDrawdown, 1 - nav / current.peakNav);

    if (typeof updateCorporationTick === 'function') updateCorporationTick();
    if (current.elapsedMs >= FUND_PERIOD_MS) closeFundPeriod();
}

function getPeriodReturn(startValue, endValue) {
    return startValue > 0 ? endValue / startValue - 1 : 0;
}

function standardDeviation(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

/** B5: powody spadku zaufania (bezczynny lub słaby fundusz). */
function getTrustDropReasons() {
    if (!playerFund) return [];
    const current = playerFund.current;
    const fundReturn = getPeriodReturn(current.startNav, getFundNav());
    const benchmark = getPeriodReturn(current.startBenchmark, getBenchmarkValue());
    const years = current.elapsedMs / (BASE_DELAYS.quarterly * 4);
    const hurdle = Math.max(getDepositRate(), macro?.inflation || 0) * years;
    const cashShare = Math.max(0, playerCash) / Math.max(1, getFundAssets());
    const reasons = [];
    if (years > 0.1 && fundReturn < benchmark - 0.005) reasons.push(`wynik ${(fundReturn * 100).toFixed(1)}% przegrywa z GIG (${(benchmark * 100).toFixed(1)}%)`);
    if (years > 0.1 && fundReturn < hurdle) reasons.push(`wynik poniżej lokaty i inflacji (${(hurdle * 100).toFixed(1)}%) — klienci pytają, za co płacą opłatę`);
    if (cashShare > 0.6) reasons.push(`${(cashShare * 100).toFixed(0)}% aktywów leży w gotówce — fundusz nie inwestuje pieniędzy klientów`);
    return reasons;
}

function closeFundPeriod() {
    const reasons = getTrustDropReasons();
    const trustBefore = playerFund.periods[playerFund.periods.length - 1]?.trustEnd ?? 50;
    const current = playerFund.current;
    const nav = getFundNav();
    const weeklyReturns = [];
    for (let i = 1; i < current.weeklyNavs.length; i++) weeklyReturns.push(getPeriodReturn(current.weeklyNavs[i - 1], current.weeklyNavs[i]));

    const rivals = getExternalFunds()
        .filter(fund => current.startRivals[fund.symbol] > 0)
        .map(fund => ({ symbol: fund.symbol, name: fund.name, return: getPeriodReturn(current.startRivals[fund.symbol], getExternalFundValue(fund)) }));

    const period = {
        number: current.number,
        fundReturn: getPeriodReturn(current.startNav, nav),
        benchmarkReturn: getPeriodReturn(current.startBenchmark, getBenchmarkValue()),
        rivals,
        volatility: standardDeviation(weeklyReturns),
        maxDrawdown: current.maxDrawdown,
        inflow: current.inflow,
        outflow: current.outflow,
        emissions: current.emissions,
        forcedSales: current.forcedSales,
        startNav: current.startNav,
        endNav: nav,
        assets: getFundAssets(),
        clients: playerFund.clients.length
    };

    const better = rivals.filter(rival => rival.return > period.fundReturn).length;
    period.rank = better + 1;
    period.rankOf = rivals.length + 1;

    period.bonus = payPerformanceBonus(period);
    period.trustEnd = playerFund.trust;

    playerFund.periods.push(period);
    if (playerFund.periods.length > 12) playerFund.periods.shift();
    if (reasons.length && playerFund.trust < trustBefore - 2 && typeof addMail === 'function') {
        addMail({ sender: CORPORATION_SENDER, subject: '📉 Klienci tracą zaufanie do funduszu', body: `Zaufanie spadło z ${trustBefore.toFixed(0)} do ${playerFund.trust.toFixed(0)}. Klienci odchodzą, bo: ${reasons.join('; ')}. Zarząd oczekuje aktywnego zarządzania.`, importance: 2 });
    }

    const excess = (period.fundReturn - period.benchmarkReturn) * 100;
    logEvent(
        `📊 Koniec okresu ${period.number}: fundusz ${(period.fundReturn * 100).toFixed(2)}% vs GIG ${(period.benchmarkReturn * 100).toFixed(2)}% ` +
        `(${excess >= 0 ? '+' : ''}${excess.toFixed(2)} pp), miejsce ${period.rank}/${period.rankOf}, premia ${period.bonus.toFixed(2)} zł.`,
        'review'
    );
    if (typeof showToast === 'function') showToast(`Koniec okresu ${period.number}: premia ${period.bonus.toFixed(2)} zł`, period.bonus > 0 ? 'success' : 'default', 5000);

    playerFund.periodNumber++;
    beginFundPeriod();
    if (typeof closeCorporationPeriod === 'function') closeCorporationPeriod(period);
}

/** Premia za wyniki: tylko za nadwyżkę nad benchmarkiem; rośnie z pozycją w rankingu i stanowiskiem. */
function computePerformanceBonus(period, position = getPlayerPosition()) {
    const excess = period.fundReturn - period.benchmarkReturn;
    if (!(excess > 0)) return 0;
    const rankBonus = period.rankOf > 1 && period.rank === 1 ? 1.25 : 1;
    return excess * period.assets * 0.20 * position.bonusMult * rankBonus;
}

function payPerformanceBonus(period) {
    // Po drugiej słabej ocenie zarządu na najniższym stanowisku premia jest wstrzymana.
    if (playerFund.bonusSuspendedUntilPeriod > period.number) return 0;
    const bonus = computePerformanceBonus(period);
    if (bonus > 0) {
        playerWallet.cash += bonus;
        recordPayment('external:korporacja', 'player-wallet', bonus, 'Premia za wyniki');
    }
    return bonus;
}

/** Docelowe zaufanie: wyniki 4 ostatnich okresów (i bieżącego) vs GIG, zmienność, obsunięcie, emisje. */
const TRUST_TARGET_FLOOR = 15;      // 0.13.1 (B12): dolny próg celu zaufania
const TRUST_GAIN_BONUS_MAX = 10;    // dodatni wynik okresu (+150 pkt × zwrot, do +10)
const TRUST_CALM_BONUS = 5;         // okres bez wymuszonej sprzedaży i z obsunięciem < 5%

function computeTrustTarget() {
    const periods = playerFund.periods.slice(-FUND_PERIODS_SHOWN);
    const current = playerFund.current;
    const partial = {
        fundReturn: getPeriodReturn(current.startNav, getFundNav()),
        benchmarkReturn: getPeriodReturn(current.startBenchmark, getBenchmarkValue()),
        maxDrawdown: current.maxDrawdown,
        volatility: 0,
        weight: Math.min(1, current.elapsedMs / FUND_PERIOD_MS)
    };

    let score = 50;
    let weightSum = 0;
    const all = [...periods.map((period, index) => ({ ...period, weight: 0.5 + index * 0.25 })), partial];
    for (const period of all) {
        const excess = period.fundReturn - period.benchmarkReturn;
        const contribution = excess * 400 - period.maxDrawdown * 60 - period.volatility * 200;
        score += contribution * period.weight;
        weightSum += period.weight;
    }
    if (weightSum > 1) score = 50 + (score - 50) / Math.sqrt(weightSum);

    const extraEmissions = Math.max(0, current.emissions - MAX_EMISSIONS_PER_PERIOD);
    score -= extraEmissions * 8;
    // Klienci porównują wynik z lokatą i inflacją (macro.js).
    if (typeof getMacroTrustPenalty === 'function') score -= getMacroTrustPenalty(partial.fundReturn, current.elapsedMs);
    // 0.13.1 (B12): droga powrotu — zysk w bieżącym okresie (nawet poniżej GIG) i spokojny czas odbudowują zaufanie,
    // a cel nigdy nie spada poniżej progu, z którego da się wyjść dobrymi wynikami.
    score += Math.min(TRUST_GAIN_BONUS_MAX, Math.max(0, partial.fundReturn) * 150);
    if (current.forcedSales === 0 && current.maxDrawdown < 0.05) score += TRUST_CALM_BONUS * partial.weight;

    return Math.max(TRUST_TARGET_FLOOR, Math.min(100, score));
}

/** Co tydzień gry: opłata za zarządzanie, zaufanie, decyzje klientów, zdarzenia. */
function processFundWeekly() {
    if (!playerFund) return;

    chargeManagementFee();

    // Zaufanie zmienia się stopniowo (25% drogi do celu na tydzień).
    const target = computeTrustTarget();
    playerFund.trust += (target - playerFund.trust) * 0.25;

    playerFund.current.weeklyNavs.push(getFundNav());
    playerFund.navHistory.push({ clockMs: playerFund.clockMs, nav: getFundNav() });
    if (playerFund.navHistory.length > 80) playerFund.navHistory.shift();

    if (typeof processClientsWeekly === 'function') processClientsWeekly(); // charaktery klientów (clients.js)
    maybeTriggerForcedEmission();
    if (typeof runJuMarketWeekly === 'function') runJuMarketWeekly(); // rynek wtórny JU (clients.js)

    if (typeof processCorporationWeekly === 'function') {
        processCorporationWeekly();
        payAnalystSalaries();
    }
}

// B4: gracz ustala opłatę za zarządzanie (0,5–3% rocznie).
const FEE_RATE_MIN = 0.005;
const FEE_RATE_MAX = 0.03;

function getPlayerFeeRate() {
    return Math.max(FEE_RATE_MIN, Math.min(FEE_RATE_MAX, Number(playerFund?.feeRate) || MANAGEMENT_FEE_ANNUAL));
}

/** Atrakcyjność opłaty dla nowych klientów: 1 przy standardzie 0,8%, mniej przy wyższej. */
function getFeeAttractiveness() {
    return Math.max(0.3, Math.min(1.6, MANAGEMENT_FEE_ANNUAL / getPlayerFeeRate()));
}

/** Zmiana opłaty (w % rocznie), najwyżej raz na kwartał. */
function setPlayerFeeRate(percent) {
    if (!playerFund) return false;
    const rate = Number(percent) / 100;
    if (!(rate >= FEE_RATE_MIN - 1e-9 && rate <= FEE_RATE_MAX + 1e-9)) { showToast('Opłata: od 0,5% do 3% rocznie.', 'warning'); return false; }
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    if (playerFund.feeChangedQuarter === quarter) { showToast('Opłatę można zmienić raz na kwartał.', 'warning'); return false; }
    const previous = getPlayerFeeRate();
    playerFund.feeRate = rate;
    playerFund.feeChangedQuarter = quarter;
    logEvent(`💼 Fundusz zmienia opłatę za zarządzanie: ${(previous * 100).toFixed(2)}% → ${(rate * 100).toFixed(2)}% rocznie.`, 'review');
    showToast(rate < previous ? 'Niższa opłata przyciągnie klientów, ale budżet korporacji będzie mniejszy.' : 'Wyższa opłata zasili budżet, ale odstraszy klientów wrażliwych na koszty.', 'default', 6000);
    return true;
}

function chargeManagementFee() {
    const assets = getFundAssets();
    const fee = Math.min(Math.max(0, playerCash), assets * getPlayerFeeRate() / FUND_WEEKS_PER_YEAR);
    if (!(fee > 0)) return 0;

    playerCash -= fee;
    playerFund.feesPaidTotal += fee;
    recordPayment('player-fund', 'external:korporacja', fee, 'Opłata za zarządzanie');

    const share = fee * getPlayerPosition().feeShare;
    playerWallet.cash += share;
    recordPayment('external:korporacja', 'player-wallet', share, 'Udział w opłacie za zarządzanie');
    if (typeof corporation !== 'undefined' && corporation) corporation.budget += fee - share;
    return fee;
}

/** Umorzenie JU klienta po NAV. Przy braku gotówki fundusz sprzedaje pozycje. */
function redeemClientUnits(client, units) {
    if (!(units > 0) || client.units <= 0) return 0;
    units = Math.min(units, client.units);
    if (client.units - units < 0.5) units = client.units; // bez resztek: klient odchodzi z całością (JU klientów = JU funduszu)

    const nav = getFundNav();
    const value = units * nav;

    if (playerCash < value) forceLiquidation(value - playerCash);
    const paid = Math.min(value, Math.max(0, playerCash));
    const paidUnits = nav > 0 ? paid / nav : 0;

    playerCash -= paid;
    playerFund.units -= paidUnits;
    client.units -= paidUnits;
    playerFund.current.outflow += paid;
    recordPayment('player-fund', 'external:klienci', paid, 'Umorzenie JU');

    // Klient płaci podatek od zysku — to obniża jego wypłatę netto, nie NAV.
    const gain = Math.max(0, (nav - client.avgCost) * paidUnits);
    const tax = gain * CLIENT_GAINS_TAX;

    if (client.units < 0.5) {
        playerFund.clients = playerFund.clients.filter(item => item.id !== client.id);
        logEvent(`👋 ${client.name} (${(CLIENT_TYPES[client.type] || CLIENT_TYPES.careful).label}) wycofuje wszystkie środki: ${paid.toFixed(2)} zł (podatek klienta ${tax.toFixed(2)} zł).`, 'review');
    } else {
        logEvent(`📤 ${client.name} umarza ${paidUnits.toFixed(1)} JU (${paid.toFixed(2)} zł).`, 'review');
    }
    return paid;
}

/**
 * 0.13.1 (B4): każde zmniejszenie pozycji funduszu bez ręcznej sprzedaży (umorzenia, zastaw, konfiskata,
 * wykup, bankructwo, fuzja) zostawia ślad z przyczyną: dziennik pozycji, wpis w poczcie korporacji, powiadomienie.
 */
function notePlayerPositionLoss(symbol, quantity, reason, value = null) {
    if (!(quantity > 0)) return;
    if (playerFund) {
        if (!Array.isArray(playerFund.positionLog)) playerFund.positionLog = [];
        playerFund.positionLog.unshift({ symbol, quantity: Math.round(quantity), reason, value, quarter: typeof macro === 'object' ? macro.quarter : 0 });
        if (playerFund.positionLog.length > 30) playerFund.positionLog.length = 30;
    }
    const text = `📉 Twoje akcje ${symbol}: −${Math.round(quantity).toLocaleString('pl-PL')} szt. bez Twojej decyzji — ${reason}${value ? ` (${formatZl(value, 0)})` : ''}.`;
    logEvent(text, 'warning');
    if (typeof pushNotification === 'function') pushNotification(text, null);
}

/**
 * 0.13.1 (B5): emisja ciągła (wpłaty klientów po NAV poza emisją gracza) tylko za zgodą gracza.
 * Domyślnie zamknięta — liczba JU rośnie wyłącznie przez emisję gracza i zakup JU z konta prywatnego.
 */
function isFundOpenForSubscriptions() {
    return Boolean(playerFund?.openSubscriptions);
}

function setFundOpenSubscriptions(open) {
    if (!playerFund) return false;
    playerFund.openSubscriptions = Boolean(open);
    showToast(open ? '📥 Emisja ciągła otwarta: zadowoleni i nowi klienci mogą dokupować JU po NAV.' : '🔒 Emisja ciągła zamknięta: nowe JU tylko przez Twoją emisję.', 'default', 5000);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

/** Wymuszona sprzedaż: największe pozycje, z dodatkową stratą na cenie i spadkiem zaufania. */
function forceLiquidation(amountNeeded) {
    let needed = amountNeeded;
    const positions = Object.entries(playerPortfolio)
        .filter(([, holding]) => holding.assetType === 'stock' || !holding.assetType)
        .map(([symbol, holding]) => ({ symbol, holding, stock: stocks.find(s => s.symbol === symbol) }))
        .filter(item => item.stock && !item.stock.isTradeLocked)
        .sort((a, b) => b.stock.price * b.holding.shares - a.stock.price * a.holding.shares);

    for (const { symbol, holding, stock } of positions) {
        if (needed <= 0) break;
        const salePrice = stock.price * 0.99; // sprzedaż pod presją
        const free = holding.shares - (holding.lockedShares || 0); // akcje w zastawie zostają
        if (free <= 0) continue;
        const quantity = Math.min(free, Math.ceil(needed / salePrice));
        const proceeds = quantity * salePrice;

        playerCash += proceeds;
        holding.shares -= quantity;
        stock.sharesHeld -= quantity;
        applyTradeImpact(stock, quantity, -1);
        if (holding.shares <= 0) delete playerPortfolio[symbol];
        needed -= proceeds;

        playerFund.current.forcedSales++;
        notePlayerPositionLoss(symbol, quantity, 'wymuszona sprzedaż: klienci umarzają JU, a w funduszu brakuje gotówki (trzymaj zapas gotówki)', proceeds);
    }

    if (playerFund.current.forcedSales > 0) playerFund.trust = Math.max(0, playerFund.trust - 2);
}

// =================================================================================
// EMISJE JU
// =================================================================================

/**
 * Emisja: gracz oferuje JU po bieżącym NAV. Zapisują się zadowoleni klienci i nowi klienci
 * (zależnie od zaufania). Niesprzedane JU nie powstają. Ponad 2 emisje w okresie obniżają zaufanie.
 */
function issueFundUnits(requestedUnits, options = {}) {
    if (!playerFund) return { issued: 0 };
    const requested = Math.floor(Number(requestedUnits) || 0);
    if (!(requested > 0)) return { issued: 0 };

    const nav = getFundNav();
    const current = playerFund.current;
    current.emissions++;

    if (current.emissions > MAX_EMISSIONS_PER_PERIOD) {
        playerFund.trust = Math.max(0, playerFund.trust - 4);
        logEvent(`⚠️ Kolejna emisja w tym okresie — obecni klienci obawiają się rozwodnienia. Zaufanie spada.`, 'review');
    }

    const trust = playerFund.trust / 100;
    let demandValue = options.forcedValue || 0;

    if (!options.forcedValue) {
        for (const client of playerFund.clients) {
            if (client.satisfaction > 0.6 && Math.random() < trust) {
                const def = CLIENT_TYPES[client.type];
                demandValue += getRandomInRange(def.size[0], def.size[1]) * 0.3;
            }
        }
    }

    const newClients = [];
    const newClientCount = options.forcedValue ? 0 : Math.max(0, Math.round(trust * 4 + getRandomInRange(-1, 1.5)));
    for (let i = 0; i < newClientCount; i++) {
        const type = trust > 0.7 && Math.random() < 0.2 ? 'institution' : randomCharacter(playerFund.trust);
        const def = CLIENT_TYPES[type];
        newClients.push({ type, value: getRandomInRange(def.size[0], def.size[1]) });
        demandValue += newClients[newClients.length - 1].value;
    }

    const issuedUnits = Math.min(requested, demandValue / nav);
    if (!(issuedUnits > 0)) {
        logEvent(`📭 Emisja ${requested} JU: brak chętnych.`, 'review');
        return { issued: 0, raised: 0 };
    }

    const fillRatio = issuedUnits / (demandValue / nav);
    let raised = 0;

    // Rozdział: najpierw nowi klienci, potem obecni (proporcjonalnie do zapotrzebowania).
    for (const item of newClients) {
        const units = item.value / nav * fillRatio;
        if (units < 0.5) continue;
        addFundClient(item.type, units, nav);
        raised += units * nav;
    }

    const existingUnits = issuedUnits - raised / nav;
    if (existingUnits > 0) {
        const buyers = playerFund.clients.filter(client => client.satisfaction > 0.6 && client.joinedPeriod <= playerFund.periodNumber);
        const target = options.forcedClient || (buyers.length > 0 ? null : addFundClient('institution', 0, nav));
        const list = target ? [target] : buyers;
        const per = existingUnits / list.length;
        for (const client of list) {
            const cost = client.avgCost * client.units + per * nav;
            client.units += per;
            client.avgCost = client.units > 0 ? cost / client.units : nav;
        }
        raised += existingUnits * nav;
    }

    playerCash += raised;
    playerFund.units += raised / nav;
    current.inflow += raised;
    recordPayment('external:klienci', 'player-fund', raised, 'Emisja JU');

    logEvent(`📥 Emisja: sprzedano ${(raised / nav).toFixed(1)} z ${requested} JU po ${nav.toFixed(2)} zł (${raised.toFixed(2)} zł, nowych klientów: ${newClients.length}).`, 'review');
    return { issued: raised / nav, raised, newClients: newClients.length };
}

/** Zdarzenie: duży klient chce wejść — emisja wymuszona (liczy się do limitu emisji). */
function maybeTriggerForcedEmission() {
    if (Math.random() > 0.03 || playerFund.trust < 40) return;
    const nav = getFundNav();
    const value = getFundAssets() * getRandomInRange(0.1, 0.3);
    const client = addFundClient('institution', 0, nav);
    logEvent(`🏛️ ${client.name} chce zainwestować ${value.toFixed(0)} zł — zarząd nakazuje przeprowadzić emisję.`, 'review');
    issueFundUnits(Math.ceil(value / nav), { forcedValue: value, forcedClient: client });
}

// =================================================================================
// HANDEL: WPŁYW NA CENĘ, KONTO PRYWATNE, COMPLIANCE
// =================================================================================

/** Minimalny wpływ transakcji na cenę: 0,5 × udział w wolnym obrocie, maks. 2%. */
function applyTradeImpact(stock, quantity, direction) {
    const freeFloat = Math.max(1, typeof getFreeFloatShares === 'function' ? getFreeFloatShares(stock) : stock.totalShares);
    const pct = Math.min(0.02, 0.5 * Math.abs(quantity) / freeFloat);
    stock.price = Math.max(0.01, stock.price * (1 + Math.sign(direction) * pct));
}

function logFundTrade(symbol, side) {
    if (!playerFund) return;
    playerFund.tradeLog.push({ symbol, side, clockMs: playerFund.clockMs });
    if (playerFund.tradeLog.length > 50) playerFund.tradeLog.shift();
}

function setTradingAccount(account) {
    activeTradingAccount = account === 'private' ? 'private' : 'fund';
    if (typeof displayFundPanel === 'function') displayFundPanel();
    if (typeof displayPortfolio === 'function') displayPortfolio();
    if (typeof displayStocks === 'function' && typeof getCurrentInputValues === 'function') displayStocks(getCurrentInputValues()); // kolumna „Posiadane” wg konta
    showToast(account === 'private' ? '🧍 Handlujesz z konta prywatnego (Twoje pieniądze).' : '💼 Handlujesz z konta funduszu (pieniądze klientów).', 'default', 3500);
}

function getPrivateTaxModifier() {
    let modifier = 1.0;
    const sanEscobar = getSkillLevel('sanEscobar');
    if (sanEscobar >= 1) modifier = 0.95;
    if (sanEscobar >= 4) modifier = 0;
    const accountant = getSkillLevel('accountant');
    if (accountant > 0) modifier *= 0.98; // N3: stała obniżka 2%
    return modifier;
}

/** Front-running: prywatny zakup akcji, którą fundusz kupił w tym samym tygodniu gry. */
function checkCompliance(symbol) {
    if (!playerFund) return;
    const suspicious = playerFund.tradeLog.some(trade =>
        trade.symbol === symbol && trade.side === 'buy' && playerFund.clockMs - trade.clockMs <= BASE_DELAYS.weekly
    );
    if (!suspicious) return;

    playerWallet.complianceRisk++;
    if (typeof getRecord === 'function') getRecord('player').suspicion += 5; // KNF też widzi front-running
    if (Math.random() < Math.min(0.9, 0.15 * playerWallet.complianceRisk)) {
        const fine = Math.max(50, playerWallet.cash * 0.10);
        const paid = Math.min(playerWallet.cash, fine);
        playerWallet.cash -= paid;
        playerWallet.fines += paid;
        playerWallet.complianceRisk = 0;
        playerFund.trust = Math.max(0, playerFund.trust - 5);
        playerProfile?.cv.push({ type: 'compliance', text: `Kontrola compliance: front-running na ${symbol}, kara ${paid.toFixed(2)} zł.` });
        logEvent(`🚨 COMPLIANCE: wykryto prywatne transakcje przed transakcjami funduszu (${symbol}). Kara ${paid.toFixed(2)} zł, wpis w CV.`, 'error');
        if (typeof showToast === 'function') showToast('Kontrola compliance! Kara i wpis w CV.', 'error', 6000);
    }
}

/** Rabat „Charyzma rekina” przy zakupach funduszu. */
function getCharismaDiscount() {
    return [0, 0.005, 0.01, 0.015][getSkillLevel('sharkCharisma')] || 0;
}

/** Stawka prowizji operatora rynku dla zakupu przez fundusz (0, gdy rynek nie pobiera). */
function getBuyCommissionRate(stock) {
    if (typeof marketOperators === 'undefined' || !marketOperators || typeof getStockMarket !== 'function' || typeof getOperatorStock !== 'function') return 0;
    const operatorId = getStockMarket(stock);
    const operatorStock = getOperatorStock(operatorId);
    if (!operatorStock || operatorStock === stock) return 0;
    return Number(MARKET_OPERATOR_DEFS[operatorId]?.commission) || 0;
}

/** 0.13.1 (B1/B2): pełny koszt zakupu — cena (z rabatem), prowizja, razem. */
function getBuyQuote(stock, quantity, account = activeTradingAccount) {
    const value = (Number(stock?.price) || 0) * Math.max(0, quantity);
    if (account === 'private') return { cost: value, fee: 0, total: value };
    const cost = value * (1 - getCharismaDiscount());
    const fee = value * getBuyCommissionRate(stock);
    return { cost, fee, total: cost + fee };
}

/** Największa liczba akcji do kupienia: min(dostępne w obrocie, gotówka / koszt jednej akcji z prowizją). */
function getMaxBuyQuantity(stock, account = activeTradingAccount) {
    if (!stock || !(stock.price > 0)) return 0;
    const cash = account === 'private' ? Number(playerWallet?.cash) || 0 : Number(playerCash) || 0;
    const unit = getBuyQuote(stock, 1, account).total;
    const byCash = unit > 0 ? Math.floor(cash / unit + 1e-9) : 0;
    let quantity = Math.max(0, Math.min(getAvailableShares(stock), byCash));
    while (quantity > 0 && getBuyQuote(stock, quantity, account).total > cash) quantity--; // zaokrąglenia
    return quantity;
}

function buyStockPrivate(symbol, quantity) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || stock.isTradeLocked) { showToast('Handel tą akcją jest niedostępny.', 'warning'); return false; }
    if (!canAccessExchange(stock.exchange)) { showToast('Twoje stanowisko nie daje dostępu do tej giełdy.', 'warning'); return false; }
    if (quantity > getAvailableShares(stock)) { showToast(`Za mało akcji na rynku (dostępne: ${getAvailableShares(stock)}).`, 'warning'); return false; }

    const cost = stock.price * quantity;
    if (playerWallet.cash < cost) { showToast('Za mało prywatnych pieniędzy.', 'error'); return false; }

    playerWallet.cash -= cost;
    stock.sharesHeld += quantity;
    const holding = playerWallet.portfolio[symbol] || { shares: 0, avgPrice: 0, assetType: 'stock' };
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + quantity);
    holding.shares += quantity;
    playerWallet.portfolio[symbol] = holding;
    applyTradeImpact(stock, quantity, 1);

    checkCompliance(symbol);
    logEvent(`🧍 Prywatnie kupiono ${quantity} szt. ${symbol} za ${cost.toFixed(2)} zł.`, 'review');
    refreshFundViews();
    return true;
}

function sellStockPrivate(symbol, quantity) {
    const stock = stocks.find(s => s.symbol === symbol);
    const holding = playerWallet.portfolio[symbol];
    if (!stock || !holding || holding.shares < quantity) { alert('Nie masz tylu akcji na koncie prywatnym.'); return false; }
    if (stock.isTradeLocked) { alert('Handel tą akcją jest wstrzymany.'); return false; }

    const proceeds = stock.price * quantity;
    const profit = proceeds - holding.avgPrice * quantity;
    const tax = profit > 0 ? profit * PRIVATE_GAINS_TAX * getPrivateTaxModifier() : 0;
    governmentTreasury += tax;

    playerWallet.cash += proceeds - tax;
    holding.shares -= quantity;
    stock.sharesHeld -= quantity;
    applyTradeImpact(stock, quantity, -1);
    if (holding.shares <= 0) delete playerWallet.portfolio[symbol];

    logEvent(`🧍 Prywatnie sprzedano ${quantity} szt. ${symbol}: ${proceeds.toFixed(2)} zł (podatek ${tax.toFixed(2)} zł).`, 'review');
    refreshFundViews();
    return true;
}

/** Gracz prywatnie kupuje JU własnego funduszu po NAV (bez wpływu na limit emisji). */
function buyOwnFundUnits(amount) {
    const value = Math.min(Number(amount) || 0, playerWallet.cash);
    const nav = getFundNav();
    if (!playerFund || !(value > 0) || !(nav > 0)) return 0;

    const units = value / nav;
    playerWallet.cash -= value;
    playerWallet.fundUnits += units;
    playerWallet.fundUnitsCost += value;
    playerCash += value;
    playerFund.units += units;
    recordPayment('player-wallet', 'player-fund', value, 'Zakup JU własnego funduszu');
    refreshFundViews();
    return units;
}

function sellOwnFundUnits(units) {
    const count = Math.min(Number(units) || 0, playerWallet.fundUnits);
    const nav = getFundNav();
    if (!playerFund || !(count > 0)) return 0;

    const value = count * nav;
    if (playerCash < value) forceLiquidation(value - playerCash);
    const paid = Math.min(value, playerCash);
    const costBasis = playerWallet.fundUnitsCost * (count / playerWallet.fundUnits);
    const tax = Math.max(0, paid - costBasis) * PRIVATE_GAINS_TAX * getPrivateTaxModifier();

    playerCash -= paid;
    playerFund.units -= paid / nav;
    playerWallet.fundUnits -= paid / nav;
    playerWallet.fundUnitsCost -= costBasis;
    playerWallet.cash += paid - tax;
    governmentTreasury += tax;
    recordPayment('player-fund', 'player-wallet', paid, 'Umorzenie JU gracza');
    refreshFundViews();
    return paid;
}

// =================================================================================
// SZKOLENIA I CV (zamiast XP i drzewka umiejętności)
// =================================================================================

function getTrainingCost(skillId) {
    const next = getNextSkillLevelInfo(skillId);
    return next ? Math.round(next.cost * TRAINING_COST_FACTOR) : null;
}

function getTrainingMedal(level) {
    if (level >= 3) return { id: 'gold', label: 'Złoto', icon: '🥇' };
    if (level === 2) return { id: 'silver', label: 'Srebro', icon: '🥈' };
    if (level === 1) return { id: 'bronze', label: 'Brąz', icon: '🥉' };
    return null;
}

function getAvailableTrainings() {
    return Object.keys(skills).filter(id => !HIDDEN_TRAININGS.includes(id));
}

function buyTraining(skillId) {
    const skill = skills[skillId];
    const next = getNextSkillLevelInfo(skillId);
    if (!skill || !next || HIDDEN_TRAININGS.includes(skillId)) return false;

    if (next.requires && getSkillLevel(next.requires.skillId) < next.requires.level) {
        showToast('Najpierw ukończ wymagane wcześniejsze szkolenie.', 'warning');
        return false;
    }

    const cost = getTrainingCost(skillId);
    if (playerWallet.cash < cost) {
        showToast(`Szkolenie kosztuje ${cost} zł — masz ${playerWallet.cash.toFixed(2)} zł.`, 'error');
        return false;
    }

    playerWallet.cash -= cost;
    recordPayment('player-wallet', 'external:szkolenia', cost, `Szkolenie: ${skill.name}`);
    skill.unlockedLevel++;
    const medal = getTrainingMedal(skill.unlockedLevel);
    playerProfile?.cv.push({ type: 'training', text: `${skill.name} — poziom ${skill.unlockedLevel}${medal ? ` (${medal.label})` : ''}` });
    logEvent(`🎓 Ukończono szkolenie: ${skill.name} (poziom ${skill.unlockedLevel}).`, 'review');
    if (typeof updateDividendTrackerButtonVisibility === 'function') updateDividendTrackerButtonVisibility(); // przycisk panelu dywidend

    if (typeof renderCvPanel === 'function') renderCvPanel();
    refreshFundViews();
    return true;
}

function refreshFundViews() {
    if (typeof displayCash === 'function') displayCash();
    if (typeof displayPortfolio === 'function') displayPortfolio();
    if (typeof displayFundPanel === 'function') displayFundPanel();
}

// #################################################################################
// ## career.js
// #################################################################################

// career.js — Kariera w korporacji (etap C)
//
// Korporacja: budżet z opłat za zarządzanie, boty-zarządcy z własnymi funduszami, ocena zarządu
// co 4 okresy (awanse, zamiany miejsc, degradacje), analitycy, nadzór i konsolidacja funduszy,
// współpraca z wielkimi inwestorami i prezesami spółek, przejęcia firm zarządzających
// (fundusze zewnętrzne = holdingi) na modelu M&A oraz warunki zwycięstwa.

const BOARD_REVIEW_EVERY_PERIODS = 4;
const POSITION_LIMITS = { projectLead: 2, board: 3, ceo: 1 };
const PROMOTION_SCORE = 60;
const WEAK_SCORE = 35;
const VICTORY_TAKEOVERS_REQUIRED = 3;
const EXTERNAL_FIRM_VALUE_PER_AUM = 0.01;       // cena firmy zarządzającej jako % aktywów jej funduszu
const CORPORATION_MANDATE_ASSETS = 2000000;     // mandaty instytucjonalne korporacji — stałe źródło opłat do budżetu
const MEETING_COST = 50;                        // spotkanie z inwestorem (portfel prywatny)
const CEO_LUNCH_COST = 30;                      // lunch z prezesem spółki

const MANAGER_PERSONALITIES = {
    aggressive: { label: 'Agresywny', style: 'momentum', cashTarget: 0.05, positionSize: 0.30 },
    cautious:   { label: 'Ostrożny',  style: 'value',    cashTarget: 0.40, positionSize: 0.12 },
    dividend:   { label: 'Dywidendowy', style: 'dividend', cashTarget: 0.20, positionSize: 0.18 },
    value:      { label: 'Wartościowy', style: 'value',  cashTarget: 0.15, positionSize: 0.20 },
    momentum:   { label: 'Momentum',  style: 'momentum', cashTarget: 0.10, positionSize: 0.22 }
};

const MANAGER_NAMES = ['Kamil Wróbel', 'Natalia Sowa', 'Igor Kruk', 'Julia Lis', 'Oskar Bąk', 'Weronika Czapla', 'Filip Jeż'];

const ANALYST_TYPES = {
    company: { label: 'Analityk spółki', description: 'Wycena godziwa i prognoza EPS w oknie spółki.', hireCost: 150, salary: 20 },
    sector:  { label: 'Analityk sektora', description: 'Wrażliwość sektora na cykl i średnie C/Z.', hireCost: 120, salary: 15 },
    earnings:{ label: 'Analityk wyników', description: 'Szansa pozytywnej niespodzianki w raporcie.', hireCost: 180, salary: 25 }
};

let corporation = null;

// =================================================================================
// KORPORACJA I ZARZĄDCY
// =================================================================================

function getPositionIndex(positionId) {
    return Math.max(0, CAREER_POSITIONS.findIndex(position => position.id === positionId));
}

function createBotFund(startCash) {
    return { cash: startCash, portfolio: {}, units: startCash / 10, trust: 55, periods: [], current: null };
}

function getBotFundNav(fund) {
    let value = Math.max(0, fund.cash);
    for (const amount of Object.values(fund.startups || {})) value += Number(amount) || 0; // 0.13.1 (B7): udziały w startupach po koszcie
    for (const symbol in fund.portfolio) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) value += stock.price * fund.portfolio[symbol].shares;
    }
    return fund.units > 0 ? value / fund.units : 0;
}

function getBotFundAssets(fund) {
    return getBotFundNav(fund) * fund.units;
}

function beginBotFundPeriod(fund) {
    const nav = getBotFundNav(fund);
    fund.current = { startNav: nav, startBenchmark: getBenchmarkValue(), peakNav: nav, maxDrawdown: 0, weeklyNavs: [nav] };
}

function createCorporation() {
    const names = [...MANAGER_NAMES].sort(() => Math.random() - 0.5);
    const personalities = Object.keys(MANAGER_PERSONALITIES);
    const count = getRandomIntInRange(3, 5);
    const managers = [];

    for (let i = 0; i < count; i++) {
        // Część botów startuje wyżej — jest kogo przeskakiwać.
        const positionId = i === 0 ? 'board' : i === 1 ? 'senior' : i === 2 ? 'manager' : 'junior';
        const manager = {
            id: `mgr_${i + 1}`,
            name: names[i],
            positionId,
            personality: personalities[i % personalities.length],
            boardReputation: getRandomIntInRange(40, 70),
            weakReviews: 0,
            lastScore: null,
            fund: createBotFund(getRandomIntInRange(8, 30) * 1000)
        };
        beginBotFundPeriod(manager.fund);
        managers.push(manager);
    }

    // Cele dominacji: 3 losowe spośród 4 najmniejszych funduszy zewnętrznych (osiągalne z budżetu).
    const externalSymbols = getExternalRivalFunds()
        .sort((a, b) => getExternalFundValue(a) * a.totalShares - getExternalFundValue(b) * b.totalShares)
        .slice(0, VICTORY_TAKEOVERS_REQUIRED + 1)
        .map(stock => stock.symbol)
        .sort(() => Math.random() - 0.5);

    corporation = {
        version: 1,
        name: playerProfile?.corporation || 'Korporacja Inwestycyjna',
        budget: 50000,
        mandateAssets: CORPORATION_MANDATE_ASSETS,
        managers,
        boardReputation: 50,           // reputacja gracza w zarządzie
        playerWeakReviews: 0,
        lastPlayerScore: null,
        reviews: [],
        analysts: [],
        supervisedManagerId: null,
        acquiredFunds: [],
        takeoverTargets: externalSymbols.slice(0, VICTORY_TAKEOVERS_REQUIRED),
        lastMeetings: {},              // id inwestora / symbol spółki → numer okresu
        milestones: {},
        victory: null
    };

    syncCeoTitle();
    return corporation;
}

/** Fundusze zewnętrzne (rywale): holdingi poza czasopismami. */
function getExternalRivalFunds() {
    return getExternalFunds();
}

function getExternalFirmName(stock) {
    return stock.managedByCorporation ? `${stock.name} (Twoja korporacja)` : `${stock.name} Asset Management`;
}

function getExternalFirmValuation(stock) {
    return Math.round(getExternalFundValue(stock) * stock.totalShares * EXTERNAL_FIRM_VALUE_PER_AUM);
}

function syncCeoTitle() {
    if (corporation && playerProfile) corporation.name = playerProfile.corporation;
}

// =================================================================================
// HANDEL BOTÓW-ZARZĄDCÓW (raz na tydzień gry)
// =================================================================================

function scoreStockForManager(stock, style) {
    const f = stock.fundamentals;
    if (!f || !(f.fairValue > 0) || stock.isTradeLocked) return -Infinity;
    const gap = f.fairValue / stock.price - 1;
    const history = stock.lineHistory || [];
    const past = history.length > 30 ? history[history.length - 30].price : stock.price;
    const momentum = stock.price / past - 1;
    const dividendYield = (stock.lastDividend?.yield || 0) + (stock.dividendPayoutRatio || 0) * 0.02;

    if (style === 'value') return gap;
    if (style === 'momentum') return momentum * 3 + gap * 0.3;
    if (style === 'dividend') return dividendYield * 10 + gap * 0.5;
    return gap;
}

function botBuy(fund, stock, value) {
    const quantity = Math.min(Math.floor(value / stock.price), getAvailableShares(stock));
    if (!(quantity > 0)) return 0;
    const cost = quantity * stock.price;
    if (cost > fund.cash) return 0;

    fund.cash -= cost;
    stock.sharesHeld += quantity;
    const holding = fund.portfolio[stock.symbol] || { shares: 0, avgPrice: 0 };
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + quantity);
    holding.shares += quantity;
    fund.portfolio[stock.symbol] = holding;
    applyTradeImpact(stock, quantity, 1);
    return cost;
}

function botSell(fund, stock, quantity) {
    const holding = fund.portfolio[stock.symbol];
    if (!holding) return 0;
    quantity = Math.min(quantity, holding.shares);
    if (!(quantity > 0) || stock.isTradeLocked) return 0;

    const proceeds = quantity * stock.price;
    fund.cash += proceeds;
    holding.shares -= quantity;
    stock.sharesHeld -= quantity;
    applyTradeImpact(stock, quantity, -1);
    if (holding.shares <= 0) delete fund.portfolio[stock.symbol];
    return proceeds;
}

function runManagerTrading(manager) {
    const fund = manager.fund;
    const def = MANAGER_PERSONALITIES[manager.personality];
    const accessLevel = CAREER_POSITIONS[getPositionIndex(manager.positionId)].exchangeAccessLevel;
    const candidates = stocks.filter(stock =>
        !stock.assetType && !stock.isBankStock && !stock.isBankrupt &&
        (exchanges[stock.exchange]?.level ?? 9) <= accessLevel
    );

    // Sprzedaż: pozycje, które przestały pasować do strategii.
    for (const symbol of Object.keys(fund.portfolio)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (!stock) { delete fund.portfolio[symbol]; continue; }
        if (scoreStockForManager(stock, def.style) < -0.05) botSell(fund, stock, fund.portfolio[symbol].shares);
    }

    // Kupno: najlepsze kandydatury, z zachowaniem docelowej gotówki.
    const assets = getBotFundAssets(fund);
    const ranked = candidates
        .map(stock => ({ stock, score: scoreStockForManager(stock, def.style) }))
        .filter(item => item.score > 0.05)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    for (const { stock } of ranked) {
        const spare = fund.cash - assets * def.cashTarget;
        if (spare <= 0) break;
        const held = (fund.portfolio[stock.symbol]?.shares || 0) * stock.price;
        const room = assets * def.positionSize - held;
        if (room > stock.price) botBuy(fund, stock, Math.min(spare, room));
    }
}

/** Co tydzień: handel, opłaty do budżetu, napływy/odpływy klientów botów wg zaufania. */
/** 0.13.1 (B7): fundusze kolegów finansują startupy (do 1% aktywów, najwyżej brakującą kwotę celu). */
function botFundInvestInStartups(manager) {
    const fund = manager.fund;
    if (!(Math.random() < 0.08)) return 0;
    const candidates = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding' && getStartupFundingGap(s) >= 100);
    const startup = candidates.sort((a, b) => (b.successChance || 0) - (a.successChance || 0))[Math.floor(Math.random() * Math.min(3, candidates.length))];
    if (!startup) return 0;
    const amount = Math.floor(Math.min(getStartupFundingGap(startup), getBotFundAssets(fund) * 0.01, fund.cash * 0.2));
    if (!(amount >= 100)) return 0;
    fund.cash -= amount;
    if (!fund.startups) fund.startups = {};
    fund.startups[startup.symbol] = (fund.startups[startup.symbol] || 0) + amount;
    startup.currentFunding += amount;
    const label = `Fundusz ${manager.name}`;
    startup.investors[label] = (startup.investors[label] || 0) + amount;
    startup.successChance = Math.min(1, (startup.successChance || 0) + amount / Math.max(1, startup.fundingGoal) * 0.05);
    return amount;
}

function processCorporationWeekly() {
    if (!corporation) return;

    for (const manager of corporation.managers) {
        const fund = manager.fund;
        runManagerTrading(manager);

        // Opłata za zarządzanie → budżet korporacji (minus udział zarządcy, który opuszcza model).
        const fee = Math.min(fund.cash, getBotFundAssets(fund) * MANAGEMENT_FEE_ANNUAL / FUND_WEEKS_PER_YEAR);
        if (fee > 0) {
            fund.cash -= fee;
            const share = fee * CAREER_POSITIONS[getPositionIndex(manager.positionId)].feeShare;
            corporation.budget += fee - share;
            if (corporation.supervisedManagerId === manager.id) {
                // Nadzór kierownika projektu: gracz dostaje udział także z nadzorowanego funduszu.
                const playerShare = fee * getPlayerPosition().feeShare * 0.5;
                corporation.budget -= playerShare;
                playerWallet.cash += playerShare;
            }
        }

        botFundInvestInStartups(manager);

        // Zaufanie i przepływy klientów (uproszczony model klientów botów).
        const nav = getBotFundNav(fund);
        const excess = getPeriodReturn(fund.current.startNav, nav) - getPeriodReturn(fund.current.startBenchmark, getBenchmarkValue());
        fund.trust = Math.max(0, Math.min(100, fund.trust + (50 + excess * 400 - fund.trust) * 0.25));
        const flow = getBotFundAssets(fund) * (fund.trust - 50) / 50 * 0.01;
        if (flow > 0) {
            fund.cash += flow;
            fund.units += flow / nav;
        } else if (flow < 0) {
            const payout = Math.min(-flow, fund.cash);
            fund.cash -= payout;
            fund.units -= payout / nav;
        }
        fund.current.weeklyNavs.push(getBotFundNav(fund));
    }

    // Mandaty instytucjonalne i fundusze przejęte przez korporację płacą opłaty do budżetu.
    corporation.budget += (corporation.mandateAssets ?? CORPORATION_MANDATE_ASSETS) * MANAGEMENT_FEE_ANNUAL / FUND_WEEKS_PER_YEAR;
    for (const symbol of corporation.acquiredFunds) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) corporation.budget += getExternalFundValue(stock) * stock.totalShares * MANAGEMENT_FEE_ANNUAL / FUND_WEEKS_PER_YEAR;
    }

    processInvestorInterest();
    processCorporateSubscriptions();
}

/** Tik: obsunięcie funduszy botów. */
function updateCorporationTick() {
    if (!corporation) return;
    for (const manager of corporation.managers) {
        const current = manager.fund.current;
        const nav = getBotFundNav(manager.fund);
        if (nav > current.peakNav) current.peakNav = nav;
        if (current.peakNav > 0) current.maxDrawdown = Math.max(current.maxDrawdown, 1 - nav / current.peakNav);
    }
}

/** Wywoływane przy zamknięciu okresu funduszu gracza. */
function closeCorporationPeriod(playerPeriod) {
    if (!corporation) return;

    for (const manager of corporation.managers) {
        const fund = manager.fund;
        const current = fund.current;
        const nav = getBotFundNav(fund);
        const weekly = [];
        for (let i = 1; i < current.weeklyNavs.length; i++) weekly.push(getPeriodReturn(current.weeklyNavs[i - 1], current.weeklyNavs[i]));

        fund.periods.push({
            number: playerPeriod.number,
            fundReturn: getPeriodReturn(current.startNav, nav),
            benchmarkReturn: playerPeriod.benchmarkReturn,
            volatility: standardDeviation(weekly),
            maxDrawdown: current.maxDrawdown,
            trustEnd: fund.trust
        });
        if (fund.periods.length > 12) fund.periods.shift();
        beginBotFundPeriod(fund);
    }

    checkMilestones(playerPeriod);
    ensureCorporateGoals();
    if (playerPeriod.number % BOARD_REVIEW_EVERY_PERIODS === 0) runBoardEvaluation();
}

// =================================================================================
// CELE KORPORACJI (KPI na cykl oceny) — B3
// =================================================================================

const GOAL_MET_BONUS = 5;
const GOAL_MISSED_PENALTY = 3;

function countBoardSeatCompanies() {
    return typeof getBoardSeats === 'function' ? stocks.filter(s => !s.assetType && !s.isBankrupt && getBoardSeats(s).seats >= 1).length : 0;
}

function getUnreviewedComplianceHits() {
    return (playerProfile?.cv || []).filter(entry => entry.type === 'compliance' && !entry.reviewed).length;
}

function getGoalCycleReturn(goals) {
    return goals.startNav > 0 ? getFundNav() / goals.startNav - 1 : 0;
}

function getGoalCycleHurdle(goals) {
    const years = Math.max(0, (macro?.quarter || 0) - goals.quarter) / 4;
    return Math.max(getDepositRate(), macro?.inflation || 0) * years;
}

function getDiversificationStats() {
    const assets = Math.max(1, getFundAssets());
    const positions = stocks.filter(s => !s.assetType && (playerPortfolio[s.symbol]?.shares || 0) > 0)
        .map(s => playerPortfolio[s.symbol].shares * s.price / assets);
    return { count: positions.length, maxShare: positions.length ? Math.max(...positions) : 0 };
}

/** 0.13: powód niezadowolenia klientów Etycznych (null = brak). */
function getFundEthicsIssue() {
    if (typeof stocks === 'undefined') return null;
    const big = stocks.filter(s => s.workforce && !s.isBankrupt && getFundStakePct(s) > 0.1);
    const caught = big.find(s => Number.isFinite(s.workforce.greyCaughtQuarter) && (macro?.quarter ?? 0) - s.workforce.greyCaughtQuarter <= 4);
    if (caught) return `w portfelu jest ${caught.name}, złapana na szarej strefie`;
    if (big.length && typeof getAverageSatisfaction === 'function' && getAverageSatisfaction(big) < 45) return 'spółki z dużym udziałem funduszu źle traktują pracowników';
    return null;
}

/** Średnie zadowolenie pracowników w spółkach portfela (ważone wartością pozycji). */
function getPortfolioSatisfaction() {
    let sum = 0, weight = 0;
    for (const s of stocks) {
        const shares = playerPortfolio[s.symbol]?.shares || 0;
        if (!s.workforce || shares <= 0 || s.isBankrupt) continue;
        sum += s.workforce.satisfaction * shares * s.price;
        weight += shares * s.price;
    }
    return weight > 0 ? sum / weight : null;
}

/** Strajk w spółce z udziałem funduszu > 20% (cel korporacji). */
function noteStrikeForGoals(stock) {
    if (playerPortfolio?.[stock.symbol]?.shares > 0) playerPortfolio[stock.symbol].heldThroughStrike = true; // Mentor: przetrwany strajk
    if (!corporation || getFundStakePct(stock) <= 0.2) return;
    const goals = ensureCorporateGoals();
    if (goals) goals.progress.strike = stock.symbol;
}

const CORPORATE_GOAL_POOL = {
    board: {
        label: 'Miejsce w radzie nadzorczej w 2 spółkach',
        value: () => `${countBoardSeatCompanies()}/2`,
        progress: () => Math.min(1, countBoardSeatCompanies() / 2),
        check: () => countBoardSeatCompanies() >= 2
    },
    project: {
        label: 'Udział w PPP, konsorcjum lub obligacjach projektu',
        value: goals => goals.progress.project || (playerFund?.ppp || []).length ? 'tak' : 'nie',
        progress: goals => goals.progress.project || (playerFund?.ppp || []).length ? 1 : 0,
        check: goals => Boolean(goals.progress.project || (playerFund?.ppp || []).length)
    },
    compliance: {
        label: 'Zero przewinień compliance w cyklu',
        value: () => `${getUnreviewedComplianceHits()} przewinień`,
        progress: () => getUnreviewedComplianceHits() ? 0 : 1,
        check: () => getUnreviewedComplianceHits() === 0
    },
    hurdle: {
        label: 'Wynik cyklu powyżej lokaty i inflacji',
        value: goals => `${(getGoalCycleReturn(goals) * 100).toFixed(1)}% vs ${(getGoalCycleHurdle(goals) * 100).toFixed(1)}%`,
        progress: goals => { const h = getGoalCycleHurdle(goals); return h > 0 ? Math.max(0, Math.min(1, getGoalCycleReturn(goals) / h)) : 1; },
        check: goals => getGoalCycleReturn(goals) >= getGoalCycleHurdle(goals)
    },
    diversify: {
        label: 'Dywersyfikacja: ≥ 6 spółek, żadna > 25% aktywów',
        value: () => { const d = getDiversificationStats(); return `${d.count} spółek, max ${(d.maxShare * 100).toFixed(0)}%`; },
        progress: () => { const d = getDiversificationStats(); return Math.min(1, d.count / 6) * (d.maxShare > 0.25 ? 0.5 : 1); },
        check: () => { const d = getDiversificationStats(); return d.count >= 6 && d.maxShare <= 0.25; }
    },
    noStrikes: {
        label: 'Żadna spółka z udziałem funduszu > 20% nie strajkuje',
        value: goals => goals.progress.strike ? `strajk: ${goals.progress.strike}` : 'brak strajków',
        progress: goals => goals.progress.strike ? 0 : 1,
        check: goals => !goals.progress.strike
    },
    satisfaction: {
        label: 'Średnie zadowolenie pracowników w portfelu ≥ 55',
        available: () => (playerFund?.clients || []).some(client => client.type === 'ethical'),
        value: () => { const v = getPortfolioSatisfaction(); return v === null ? 'brak spółek' : `${v.toFixed(0)}/100`; },
        progress: () => { const v = getPortfolioSatisfaction(); return v === null ? 0 : Math.min(1, v / 55); },
        check: () => (getPortfolioSatisfaction() ?? 0) >= 55
    },
    dividends: {
        label: 'Dywidendy z portfela ≥ 2% aktywów',
        value: goals => `${formatZl(goals.progress.dividends || 0, 0)} / ${formatZl(getFundAssets() * 0.02, 0)}`,
        progress: goals => Math.min(1, (goals.progress.dividends || 0) / Math.max(1, getFundAssets() * 0.02)),
        check: goals => (goals.progress.dividends || 0) >= getFundAssets() * 0.02
    }
};

/** Zarząd przydziela 2 losowe cele na cykl oceny. */
function assignCorporateGoals() {
    const ids = Object.keys(CORPORATE_GOAL_POOL).filter(id => !CORPORATE_GOAL_POOL[id].available || CORPORATE_GOAL_POOL[id].available()).sort(() => Math.random() - 0.5).slice(0, 2);
    corporation.goals = { ids, quarter: macro?.quarter || 0, startNav: playerFund ? getFundNav() : 0, progress: { project: false, dividends: 0 } };
    return corporation.goals;
}

function ensureCorporateGoals() {
    if (!corporation) return null;
    if (!corporation.goals || !Array.isArray(corporation.goals.ids)) assignCorporateGoals();
    if (!(corporation.goals.startNav > 0) && playerFund) corporation.goals.startNav = getFundNav();
    return corporation.goals;
}

/** Zdarzenia liczone do celów: udział w projekcie, dywidendy. */
function noteCorporateGoal(kind, amount = 0) {
    const goals = ensureCorporateGoals();
    if (!goals) return;
    if (kind === 'project') goals.progress.project = true;
    if (kind === 'dividends') goals.progress.dividends = (goals.progress.dividends || 0) + Math.max(0, amount);
}

function getCorporateGoalsView() {
    const goals = ensureCorporateGoals();
    if (!goals) return [];
    return goals.ids.filter(id => CORPORATE_GOAL_POOL[id]).map(id => {
        const goal = CORPORATE_GOAL_POOL[id];
        return { id, label: goal.label, value: goal.value(goals), progress: goal.progress(goals), done: goal.check(goals) };
    });
}

/** Rozliczenie celów przy ocenie: +5 za spełniony, −3 za niespełniony, premia z budżetu korporacji. */
function settleCorporateGoals() {
    const view = getCorporateGoalsView();
    let delta = 0, bonus = 0;
    for (const goal of view) {
        delta += goal.done ? GOAL_MET_BONUS : -GOAL_MISSED_PENALTY;
        if (goal.done) {
            const pay = Math.round(Math.max(0, Math.min(corporation.budget * 0.05, 10000)));
            if (pay > 0) {
                corporation.budget -= pay;
                playerWallet.cash += pay;
                recordPayment('external:korporacja', 'player-wallet', pay, `Premia za cel: ${goal.label}`);
                bonus += pay;
            }
        }
    }
    corporation.lastGoals = view.map(goal => ({ label: goal.label, done: goal.done }));
    assignCorporateGoals();
    return { delta, bonus, view };
}

// =================================================================================
// OCENA ZARZĄDU (co 4 okresy)
// =================================================================================

/** Wynik oceny 0–100: nadwyżka nad GIG, stabilność, zaufanie, pozycja, compliance. Bez wielkości funduszu. */
function computeEvaluationScore(periods, trust, rankBonus = 0, complianceHits = 0) {
    const recent = periods.slice(-BOARD_REVIEW_EVERY_PERIODS);
    if (recent.length === 0) return 50;
    const avg = key => recent.reduce((sum, period) => sum + (Number(period[key]) || 0), 0) / recent.length;
    const excess = avg('fundReturn') - avg('benchmarkReturn');
    const score = 50 + excess * 800 - avg('volatility') * 300 - avg('maxDrawdown') * 100 + (trust - 50) * 0.3 + rankBonus - complianceHits * 5;
    return Math.max(0, Math.min(100, score));
}

function getEvaluationParticipants() {
    const playerPeriods = playerFund?.periods || [];
    let periods = playerPeriods;

    // Kierownik projektu: średnia z własnego i nadzorowanego funduszu.
    const supervised = corporation.managers.find(manager => manager.id === corporation.supervisedManagerId);
    if (supervised) {
        periods = playerPeriods.map((period, index) => {
            const other = supervised.fund.periods[supervised.fund.periods.length - playerPeriods.length + index];
            if (!other) return period;
            return { ...period, fundReturn: (period.fundReturn + other.fundReturn) / 2, volatility: (period.volatility + other.volatility) / 2, maxDrawdown: (period.maxDrawdown + other.maxDrawdown) / 2 };
        });
    }

    const complianceHits = (playerProfile?.cv || []).filter(entry => entry.type === 'compliance' && !entry.reviewed).length;
    return [
        { id: 'player', isPlayer: true, name: playerProfile?.name || 'Ty', positionId: playerProfile.positionId, periods, trust: playerFund?.trust ?? 50, complianceHits },
        ...corporation.managers.map(manager => ({ id: manager.id, manager, name: manager.name, positionId: manager.positionId, periods: manager.fund.periods, trust: manager.fund.trust, complianceHits: 0 }))
    ];
}

function setParticipantPosition(participant, positionId) {
    participant.positionId = positionId;
    if (participant.isPlayer) playerProfile.positionId = positionId;
    else participant.manager.positionId = positionId;
}

function runBoardEvaluation() {
    if (!corporation || !playerProfile) return null;

    const participants = getEvaluationParticipants();
    const byReturn = [...participants].sort((a, b) =>
        b.periods.slice(-4).reduce((s, p) => s + p.fundReturn, 0) - a.periods.slice(-4).reduce((s, p) => s + p.fundReturn, 0));
    const n = participants.length;

    participants.forEach(participant => {
        const rank = byReturn.indexOf(participant);
        const rankBonus = n > 1 ? (n - 1 - rank) / (n - 1) * 10 : 0;
        participant.score = computeEvaluationScore(participant.periods, participant.trust, rankBonus, participant.complianceHits);
        participant.from = participant.positionId;
    });
    const player = participants.find(p => p.isPlayer);
    const goals = settleCorporateGoals();
    player.score = Math.max(0, Math.min(100, player.score + goals.delta));

    applyPositionChanges(participants);

    // Wpisy compliance z tego cyklu zostały uwzględnione.
    (playerProfile.cv || []).forEach(entry => { if (entry.type === 'compliance') entry.reviewed = true; });

    const review = {
        periodNumber: playerFund?.current ? playerFund.current.number - 1 : 0,
        results: participants.map(p => ({ name: p.name, isPlayer: !!p.isPlayer, score: Math.round(p.score), from: p.from, to: p.positionId }))
    };
    corporation.reviews.push(review);
    if (corporation.reviews.length > 10) corporation.reviews.shift();

    corporation.lastPlayerScore = player.score;
    corporation.boardReputation = Math.max(0, Math.min(100, corporation.boardReputation + (player.score - 50) * 0.2));

    reportPlayerReview(player);
    if (goals.view.length) {
        logEvent(`🎯 Cele korporacji: ${goals.view.map(g => `${g.done ? '✅' : '❌'} ${g.label}`).join('; ')} (${goals.delta >= 0 ? '+' : ''}${goals.delta} pkt oceny${goals.bonus ? `, premia ${formatZl(goals.bonus, 0)} do portfela` : ''}). Nowe cele w zakładce Firma.`, 'review');
    }
    syncExchangeAccessWithPosition();
    checkVictory();
    return review;
}

function applyPositionChanges(participants) {
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    const maxIndex = CAREER_POSITIONS.length - 1;

    for (const participant of sorted) {
        const level = getPositionIndex(participant.positionId);

        if (participant.score >= PROMOTION_SCORE && level < maxIndex) {
            const target = CAREER_POSITIONS[level + 1].id;
            // N4: gracz awansuje na wyższe stanowiska tylko z certyfikatem mentora.
            const certificate = participant.isPlayer && typeof getRequiredCertificate === 'function' ? getRequiredCertificate(target) : null;
            if (certificate && !hasCertificate(certificate)) {
                participant.blockedBy = certificate;
                resetWeak(participant);
                continue;
            }
            const limit = POSITION_LIMITS[target];
            const occupants = participants.filter(p => p !== participant && p.positionId === target);

            if (!limit || occupants.length < limit) {
                setParticipantPosition(participant, target);
            } else {
                // Brak miejsca: zamiana z najsłabszą osobą na tym stanowisku, jeśli wyraźnie lepszy wynik.
                const weakest = occupants.sort((a, b) => a.score - b.score)[0];
                if (weakest && weakest.score < participant.score - 5) {
                    setParticipantPosition(weakest, participant.positionId);
                    setParticipantPosition(participant, target);
                    if (participant.isPlayer && weakest.manager && typeof onColleagueEvent === 'function') onColleagueEvent(weakest.id, 'overtaken');
                }
            }
            resetWeak(participant);
        } else if (participant.score < WEAK_SCORE) {
            const weak = incrementWeak(participant);
            if (weak >= 2 && level > 0) {
                setParticipantPosition(participant, CAREER_POSITIONS[level - 1].id);
                resetWeak(participant);
            }
        } else {
            resetWeak(participant);
        }
    }
}

function incrementWeak(participant) {
    if (participant.isPlayer) return ++corporation.playerWeakReviews;
    return ++participant.manager.weakReviews;
}

function resetWeak(participant) {
    if (participant.isPlayer) corporation.playerWeakReviews = 0;
    else participant.manager.weakReviews = 0;
}

function reportPlayerReview(player) {
    const fromIndex = getPositionIndex(player.from);
    const toIndex = getPositionIndex(player.positionId);
    const position = CAREER_POSITIONS[toIndex].name;
    let text;

    if (toIndex > fromIndex) {
        text = `🎉 Ocena zarządu: ${Math.round(player.score)}/100 — AWANS na stanowisko: ${position}!`;
        playerProfile.cv.push({ type: 'promotion', text: `Awans na stanowisko: ${position} (ocena ${Math.round(player.score)}/100).` });
        corporation.milestones.firstPromotion = corporation.milestones.firstPromotion || Date.now();
    } else if (toIndex < fromIndex) {
        text = `📉 Ocena zarządu: ${Math.round(player.score)}/100 — degradacja na stanowisko: ${position}.`;
        playerProfile.cv.push({ type: 'demotion', text: `Degradacja na stanowisko: ${position}.` });
    } else if (player.blockedBy) {
        const track = MENTOR_TRACKS[player.blockedBy];
        text = `📋 Ocena zarządu: ${Math.round(player.score)}/100 — wynik na awans, ale brakuje certyfikatu: ${track.icon} ${track.label} (zadania mentora w CV).`;
    } else if (player.score < WEAK_SCORE) {
        text = `⚠️ Ocena zarządu: ${Math.round(player.score)}/100 — ostrzeżenie. Druga słaba ocena z rzędu oznacza degradację${fromIndex === 0 ? ' i utratę premii' : ''}.`;
        if (fromIndex === 0 && corporation.playerWeakReviews >= 2) playerFund.bonusSuspendedUntilPeriod = (playerFund.current?.number || 0) + BOARD_REVIEW_EVERY_PERIODS;
    } else {
        text = `📋 Ocena zarządu: ${Math.round(player.score)}/100 — stanowisko bez zmian (${position}).`;
    }

    logEvent(text, 'review');
    if (typeof showToast === 'function') showToast(text, toIndex > fromIndex ? 'success' : toIndex < fromIndex ? 'error' : 'default', 7000);
}

// =================================================================================
// ANALITYCY (od starszego zarządcy)
// =================================================================================

function canHireAnalysts() {
    return getPositionIndex(playerProfile?.positionId) >= getPositionIndex('senior');
}

function hireAnalyst(type) {
    const def = ANALYST_TYPES[type];
    if (!corporation || !def) return false;
    if (!canHireAnalysts()) { showToast('Analityków zatrudnia się od stanowiska Starszy zarządca.', 'warning'); return false; }
    if (corporation.analysts.some(analyst => analyst.type === type)) { showToast('Masz już takiego analityka.', 'default'); return false; }
    if (playerWallet.cash < def.hireCost) { showToast(`Zatrudnienie kosztuje ${def.hireCost} zł.`, 'error'); return false; }

    playerWallet.cash -= def.hireCost;
    const stars = getRandomIntInRange(1, 5);
    corporation.analysts.push({ type, stars, salary: def.salary * (0.6 + stars * 0.2) });
    logEvent(`🧑‍💼 Zatrudniono: ${def.label} (${'★'.repeat(stars)}).`, 'review');
    return true;
}

function payAnalystSalaries() {
    if (!corporation) return;
    for (const analyst of [...corporation.analysts]) {
        if (playerWallet.cash >= analyst.salary) {
            playerWallet.cash -= analyst.salary;
        } else {
            corporation.analysts = corporation.analysts.filter(item => item !== analyst);
            logEvent(`👋 ${ANALYST_TYPES[analyst.type].label} odchodzi — brak środków na pensję.`, 'review');
        }
    }
}

function getAnalyst(type) {
    return corporation?.analysts.find(analyst => analyst.type === type) || null;
}

/** Wgląd analityków dla spółki (szum zależny od gwiazdek). */
function getAnalystInsights(stock) {
    const insights = [];
    const noise = stars => 1 + gaussianRandom() * (6 - stars) * 0.02;
    const f = stock.fundamentals;

    const company = getAnalyst('company');
    if (company && (f || stock.assetType)) {
        const fair = typeof getDisplayedFairValue === 'function' ? getDisplayedFairValue(stock) : f?.fairValue;
        const method = f?.fairValue > 0 ? '' : stock.assetType === 'Holding' ? ' (NAV portfela)' : stock.assetType === 'REIT' ? ' (NAV / dywidenda)' : ' (wartość księgowa)';
        insights.push(`Analityk spółki (${'★'.repeat(company.stars)}): wartość godziwa ${fair > 0 ? `≈ ${(fair * noise(company.stars)).toFixed(2)} zł${method}` : 'brak wyceny (brak zysku i majątku netto)'}${f?.expectedEps ? `, prognoza EPS na kwartał ≈ ${(f.expectedEps * noise(company.stars)).toFixed(3)} zł` : ''}.`);
    }
    const sector = getAnalyst('sector');
    if (sector) {
        const profile = getSectorProfile(stock);
        insights.push(`Analityk sektora (${'★'.repeat(sector.stars)}): wrażliwość na cykl ${profile.beta.toFixed(1)}, typowe C/Z ${profile.pe.toFixed(0)}, faza: ${getEconomyPhaseInfo().name}.`);
    }
    const earnings = getAnalyst('earnings');
    if (earnings && f) {
        const trend = (Number(stock.financialHealth) || 0) * 0.08 + getSectorProfile(stock).beta * getGdpDriver() * 20;
        const chance = Math.max(0.05, Math.min(0.95, 0.5 + trend + gaussianRandom() * (6 - earnings.stars) * 0.03));
        insights.push(`Analityk wyników (${'★'.repeat(earnings.stars)}): szansa pozytywnej niespodzianki ≈ ${(chance * 100).toFixed(0)}%.`);
    }
    return insights;
}

// =================================================================================
// NADZÓR I KONSOLIDACJA (od kierownika projektu)
// =================================================================================

function canSuperviseFunds() {
    return getPositionIndex(playerProfile?.positionId) >= getPositionIndex('projectLead');
}

function superviseManagerFund(managerId) {
    if (!canSuperviseFunds()) { showToast('Nadzór nad drugim funduszem od stanowiska Kierownik projektu.', 'warning'); return false; }
    const manager = corporation.managers.find(item => item.id === managerId);
    if (!manager || getPositionIndex(manager.positionId) >= getPositionIndex(playerProfile.positionId)) {
        showToast('Możesz nadzorować tylko fundusz osoby na niższym stanowisku.', 'warning');
        return false;
    }
    corporation.supervisedManagerId = managerId;
    onColleagueEvent(managerId, 'supervise');
    logEvent(`👔 Przejmujesz nadzór nad funduszem: ${manager.name}.`, 'review');
    return true;
}

/** Konsolidacja nadzorowanego funduszu z funduszem gracza — za zgodą zarządu. */
function consolidateSupervisedFund(forceApproval = null) {
    const manager = corporation?.managers.find(item => item.id === corporation.supervisedManagerId);
    if (!manager) { showToast('Najpierw przejmij nadzór nad funduszem.', 'warning'); return false; }

    const approval = forceApproval ?? (Math.random() < 0.3 + corporation.boardReputation / 150);
    if (!approval) {
        corporation.boardReputation = Math.max(0, corporation.boardReputation - 3);
        logEvent(`🗳️ Zarząd odrzuca konsolidację funduszu ${manager.name}.`, 'review');
        return false;
    }

    const fund = manager.fund;
    const value = getBotFundAssets(fund);
    const nav = getFundNav();

    playerCash += fund.cash;
    for (const [symbol, holding] of Object.entries(fund.portfolio)) {
        const target = playerPortfolio[symbol] || { shares: 0, avgPrice: 0, assetType: 'stock' };
        target.avgPrice = (target.avgPrice * target.shares + holding.avgPrice * holding.shares) / (target.shares + holding.shares);
        target.shares += holding.shares; // sharesHeld bez zmian — akcje tylko zmieniają fundusz
        playerPortfolio[symbol] = target;
    }

    const units = value / nav;
    playerFund.units += units;
    const client = addFundClient('institution', units, nav);
    client.name = `Klienci funduszu ${manager.name}`;

    onColleagueEvent(manager.id, 'consolidate');
    corporation.managers = corporation.managers.filter(item => item !== manager);
    corporation.supervisedManagerId = null;
    playerProfile.cv.push({ type: 'milestone', text: `Konsolidacja funduszu ${manager.name} (${value.toFixed(0)} zł).` });
    logEvent(`🔗 Zarząd zatwierdza konsolidację: fundusz ${manager.name} (${value.toFixed(0)} zł) dołącza do Twojego.`, 'review');
    return true;
}

// =================================================================================
// WSPÓŁPRACA: WIELCY INWESTORZY I PREZESI SPÓŁEK
// =================================================================================

function getBigInvestors() {
    return aiCompetitors.filter(ai => ai.personality !== 'market_maker' && !ai.isGuard && !ai.isMafia); // 0.13.1 (B9): Gwardia to fundusz, nie wielki inwestor
}

function getLastPeriodExcess() {
    const last = playerFund?.periods[playerFund.periods.length - 1];
    return last ? last.fundReturn - last.benchmarkReturn : 0;
}

/** Nowy klient z zewnątrz kupuje JU po NAV (bez liczenia jako emisja gracza). */
function addOutsideSubscription(type, name, value) {
    const nav = getFundNav();
    if (!(value > 0) || !(nav > 0)) return null;
    const units = value / nav;
    playerCash += value;
    playerFund.units += units;
    playerFund.current.inflow += value;
    const client = addFundClient(type, units, nav);
    client.name = name;
    return client;
}

function meetInvestor(investorId, forceSuccess = null) {
    const investor = aiCompetitors.find(ai => ai.id === investorId);
    if (!investor || !playerFund || !corporation) return false;
    const period = playerFund.current.number;
    if (corporation.lastMeetings[investorId] === period) { showToast('W tym okresie już spotkałeś się z tym inwestorem.', 'default'); return false; }
    if (playerWallet.cash < MEETING_COST) { showToast(`Spotkanie kosztuje ${MEETING_COST} zł.`, 'error'); return false; }

    playerWallet.cash -= MEETING_COST;
    corporation.lastMeetings[investorId] = period;

    const affinity = { calm: 0.1, dividend_chaser: 0.1, pro_investor: 0.05, whale: 0.05, banker: 0.0, reckless: -0.05, yolo_trader: -0.1 }[investor.personality] || 0;
    const chance = Math.max(0.05, Math.min(0.9, 0.2 + (playerFund.trust - 50) / 100 + getLastPeriodExcess() * 5 + affinity));
    const success = forceSuccess ?? (Math.random() < chance);

    if (!success) {
        logEvent(`☕ Spotkanie z ${investor.name}: na razie nie jest zainteresowany Twoim funduszem.`, 'review');
        return false;
    }

    const amount = Math.max(0, Math.min(investor.cash * getRandomInRange(0.05, 0.15), getFundAssets() * 0.5));
    if (!(amount > 1)) return false;
    investor.cash -= amount;
    addOutsideSubscription('investor', investor.name, amount);
    logEvent(`🤝 ${investor.name} kupuje JU Twojego funduszu za ${amount.toFixed(0)} zł!`, 'review');
    return true;
}

function lunchWithCeo(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !corporation) return false;
    const period = playerFund.current.number;
    if (corporation.lastMeetings[symbol] === period) { showToast('Z tym prezesem spotkałeś się już w tym okresie.', 'default'); return false; }
    if (playerWallet.cash < CEO_LUNCH_COST) { showToast(`Lunch kosztuje ${CEO_LUNCH_COST} zł.`, 'error'); return false; }

    playerWallet.cash -= CEO_LUNCH_COST;
    corporation.lastMeetings[symbol] = period;
    changeReputation('player', symbol, getRandomInRange(3, 8));
    logEvent(`🍽️ Lunch z prezesem ${stock.name}: relacje się poprawiają.`, 'review');
    return true;
}

/** Wielcy inwestorzy sami zgłaszają się do funduszu z dobrymi wynikami. */
function processInvestorInterest() {
    if (!playerFund || !isFundOpenForSubscriptions() || playerFund.trust < 60 || getLastPeriodExcess() <= 0) return; // 0.13.1 (B5)
    for (const investor of getBigInvestors()) {
        if (Math.random() > 0.03 || investor.cash < 2000) continue;
        const amount = investor.cash * 0.05;
        investor.cash -= amount;
        addOutsideSubscription('investor', investor.name, amount);
        logEvent(`📈 ${investor.name} sam zgłasza się i kupuje JU za ${amount.toFixed(0)} zł.`, 'review');
    }
}

/** Spółki z dobrą opinią o graczu lokują nadwyżki gotówki w JU funduszu. */
function processCorporateSubscriptions() {
    if (!playerFund || !isFundOpenForSubscriptions()) return; // 0.13.1 (B5): lokaty spółek w JU tylko przy otwartej emisji
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt || stock.isBankStock) continue;
        const reputation = Number(stock.reputation?.player) || 0;
        if (reputation < REPUTATION_LEVELS.CORRECT || stock.cash < 500000 || Math.random() > 0.03) continue;

        const amount = Math.min(stock.cash * 0.02, getFundAssets() * 0.5);
        if (!(amount > 1)) continue;
        adjustCompanyCash(stock, -amount); // gotówka → inwestycja w JU (aktywa bez zmian)
        recordPayment(stock, 'player-fund', amount, 'Lokata spółki w JU funduszu');
        addOutsideSubscription('institution', `${stock.name} (lokata)`, amount);

        // Konflikt interesów: duży udział funduszu w akcjach tej samej spółki.
        const fundShare = (playerPortfolio[stock.symbol]?.shares || 0) / Math.max(1, stock.totalShares);
        if (fundShare > 0.05) playerWallet.complianceRisk++;

        logEvent(`🏢 ${stock.name} lokuje ${amount.toFixed(0)} zł w JU Twojego funduszu (dobre relacje z prezesem).`, 'review');
    }
}

// =================================================================================
// PRZEJĘCIA FIRM ZARZĄDZAJĄCYCH (model M&A: stock.mergerProcess, typ 'fundTakeover')
// =================================================================================

function canProposeTakeovers() {
    return getPositionIndex(playerProfile?.positionId) >= getPositionIndex('board');
}

/**
 * Wniosek o przejęcie: głosowanie zarządu, potem proces M&A na holdingu docelowym
 * (7 etapów, postęp co kwartał w advanceMergerProcess). Cena rezerwowana z budżetu.
 */
function proposeFundTakeover(symbol, forceApproval = null) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!corporation || !stock || !getExternalRivalFunds().includes(stock)) return false;
    if (!canProposeTakeovers()) { showToast('Przejęcia proponuje się od stanowiska Członek zarządu.', 'warning'); return false; }
    if (stock.managedByCorporation || stock.mergerProcess) { showToast('Ta firma jest już przejęta lub w trakcie procesu.', 'default'); return false; }

    const price = getExternalFirmValuation(stock);
    if (corporation.budget < price) {
        logEvent(`🗳️ Zarząd odrzuca przejęcie ${getExternalFirmName(stock)}: budżet ${corporation.budget.toFixed(0)} zł < cena ${price} zł.`, 'review');
        showToast('Za mały budżet korporacji na to przejęcie.', 'error');
        return false;
    }

    const approval = forceApproval ?? (Math.random() < 0.3 + corporation.boardReputation / 200 + (corporation.lastPlayerScore || 50) / 200);
    if (!approval) {
        corporation.boardReputation = Math.max(0, corporation.boardReputation - 3);
        logEvent(`🗳️ Zarząd głosuje przeciw przejęciu ${getExternalFirmName(stock)}.`, 'review');
        return false;
    }

    corporation.budget -= price;
    stock.mergerProcess = {
        type: 'fundTakeover',
        stage: 1,
        progress: 0,
        partnerSymbol: stock.symbol,
        initiatorSymbol: null,
        complications: 0,
        decisionRequired: null,
        costs: 0,
        reservedBudget: price
    };
    logEvent(`🗳️ Zarząd zatwierdza przejęcie ${getExternalFirmName(stock)} za ${price} zł. Rozpoczyna się proces (7 etapów).`, 'review');
    return true;
}

/** Krok procesu przejęcia (wywoływany z advanceMergerProcess co kwartał). */
function advanceFundTakeover(stock) {
    const process = stock.mergerProcess;
    process.progress = Math.min(100, process.progress + 15);
    process.stage = Math.min(7, 1 + Math.floor(process.progress / 15));

    const roll = Math.random();
    if (roll < 0.08) {
        process.complications++;
        const cost = Math.round(process.reservedBudget * 0.05);
        corporation.budget -= cost;
        process.costs += cost;
        logEvent(`⚖️ Komplikacja przy przejęciu ${stock.name}: dodatkowe koszty prawne ${cost} zł.`, 'review');
    } else if (roll < 0.11) {
        corporation.budget += process.reservedBudget;
        stock.mergerProcess = null;
        logEvent(`❌ Przejęcie ${stock.name} upada — zarząd firmy zarządzającej znalazł innego kupca. Środki wracają do budżetu.`, 'review');
        return;
    }

    if (process.progress >= 100) completeFundTakeover(stock);
}

function completeFundTakeover(stock) {
    stock.mergerProcess = null;
    stock.managedByCorporation = true;
    corporation.acquiredFunds.push(stock.symbol);
    corporation.milestones.firstTakeover = corporation.milestones.firstTakeover || Date.now();
    playerProfile.cv.push({ type: 'milestone', text: `Przejęcie firmy zarządzającej: ${stock.name}.` });
    logEvent(`🏆 Przejęto ${stock.name}! Fundusz należy teraz do ${corporation.name}.`, 'review');
    if (typeof showToast === 'function') showToast(`Przejęto ${stock.name}!`, 'success', 7000);
    checkVictory();
}

// =================================================================================
// KAMIENIE MILOWE I ZWYCIĘSTWO
// =================================================================================

function checkMilestones(period) {
    const m = corporation.milestones;
    if (!m.fund100k && getFundAssets() >= 100000) {
        m.fund100k = Date.now();
        playerProfile.cv.push({ type: 'milestone', text: 'Fundusz przekroczył 100 000 zł aktywów.' });
        logEvent('🏅 Kamień milowy: fundusz powyżej 100 000 zł!', 'review');
    }
    const last4 = playerFund.periods.slice(-4);
    if (!m.beatGig4 && last4.length === 4 && last4.every(p => p.fundReturn > p.benchmarkReturn)) {
        m.beatGig4 = Date.now();
        playerProfile.cv.push({ type: 'milestone', text: '4 okresy z rzędu powyżej GIG.' });
        logEvent('🏅 Kamień milowy: 4 okresy z rzędu powyżej GIG!', 'review');
    }
}

function getTakeoverProgress() {
    if (!corporation) return { done: 0, required: VICTORY_TAKEOVERS_REQUIRED };
    const done = corporation.takeoverTargets.filter(symbol => corporation.acquiredFunds.includes(symbol)).length;
    return { done, required: Math.min(VICTORY_TAKEOVERS_REQUIRED, corporation.takeoverTargets.length) };
}

function checkVictory() {
    if (!corporation || corporation.victory) return corporation?.victory || null;
    let type = null;
    if (playerProfile.positionId === 'ceo') type = 'ceo';
    const progress = getTakeoverProgress();
    if (progress.required > 0 && progress.done >= progress.required) type = type || 'domination';

    if (type) {
        corporation.victory = { type, at: Date.now(), periods: playerFund.periods.length, assets: getFundAssets() };
        playerProfile.cv.push({ type: 'milestone', text: type === 'ceo' ? 'ZWYCIĘSTWO: stanowisko CEO.' : 'ZWYCIĘSTWO: dominacja — przejęto wskazane fundusze.' });
        logEvent(type === 'ceo' ? '👑 ZWYCIĘSTWO! Zostajesz CEO korporacji!' : '👑 ZWYCIĘSTWO! Dominacja — przejęto wszystkie wskazane fundusze!', 'review');
        if (typeof showVictoryScreen === 'function') showVictoryScreen(corporation.victory);
    }
    return corporation.victory;
}

// #################################################################################
// ## clients.js
// #################################################################################

// clients.js — Klienci z charakterami i rynek wtórny jednostek uczestnictwa (etap F1)
//
// Każdy klient funduszu gracza ma charakter (motyw i skłonności). Co tydzień:
//   zadowolony + duże zaufanie  → dokupuje JU (wpłata do funduszu po NAV),
//   zadowolony + małe zaufanie  → wystawia JU na rynku wtórnym (fundusz bez zmian gotówki i JU),
//   niezadowolony               → umarza część lub całość.
// Rynek wtórny obejmuje fundusz gracza, fundusze botów-zarządców i fundusze zewnętrzne (holdingi):
// kupują fikcyjni uczestnicy z zewnątrz (nowi klienci) i klienci innych funduszy szukający okazji.
// Gracz tylko obserwuje — nie handluje na tym rynku.

const CLIENT_CHARACTER_KEYS = ['sly', 'careful', 'fearful', 'brave', 'rich', 'miser'];

// Migracja starych typów (etap B) na charaktery.
const LEGACY_CLIENT_TYPES = { retiree: 'careful', saver: 'miser', speculator: 'sly', loyal: 'brave' };

const JU_MARKET_MAX_PREMIUM = 0.10;
const JU_SELL_ORDER_PATIENCE = 2;          // tygodni bez kupca → umorzenie
const JU_TAPE_LIMIT = 40;
const JU_HISTORY_WEEKS = 8;
const CLIENT_HISTORY_LIMIT = 10;
const MAX_WEEKLY_NEW_MONEY_SHARE = 0.08;   // napływ nowych klientów ≤ 8% aktywów tygodniowo

const CLIENT_MOTIVES = {
    sly: ['Szybki zysk i wyjście na szczycie.', 'Kupuje plotki, sprzedaje fakty.', 'Zawsze szuka premii.'],
    careful: ['Najważniejsze, żeby nie stracić.', 'Odkłada na emeryturę, nie na loterię.', 'Woli 3% pewne niż 30% możliwe.'],
    fearful: ['Każdy spadek to bezsenna noc.', 'Wycofa się przy pierwszej plotce.', 'Patrzy na NAV kilka razy dziennie.'],
    brave: ['Spadki to okazja do zakupu.', 'Gra na długi wzrost.', 'Ufa zarządcy, póki wyniki bronią się same.'],
    rich: ['Lokuje nadwyżki z biznesu.', 'Dywersyfikuje majątek rodzinny.', 'Ma czas i duże kwoty.'],
    miser: ['Liczy każdą złotówkę opłat.', 'Kupuje tylko z rabatem.', 'Opłata za zarządzanie to dla niego zdrada.'],
    institution: ['Mandat inwestycyjny zarządu.', 'Długoterminowa lokata instytucji.'],
    investor: ['Wielki inwestor szukający alfy.', 'Testuje nowego zarządcę.'],
    ethical: ['Nie chce zarabiać na krzywdzie ludzi.', 'Sprawdza, jak spółki traktują pracowników.', 'Inwestuje zgodnie z ESG.']
};
const CLIENT_NAMES = ['Anna', 'Piotr', 'Maria', 'Tomasz', 'Ewa', 'Jan', 'Kasia', 'Marek', 'Zofia', 'Adam', 'Halina', 'Krzysztof', 'Agata', 'Paweł', 'Irena',
    'Bartek', 'Ola', 'Kamil', 'Jadwiga', 'Stefan', 'Iga', 'Mateusz', 'Bożena', 'Rafał', 'Wanda', 'Szymon', 'Natalia', 'Edward', 'Kinga', 'Leon'];

let juMarket = createJuMarket();

function createJuMarket() {
    return {
        week: 0,
        stats: {},            // fundId → { history: [{ week, volume, premium, buyers, sellers, newClients, inflow, outflow }], trust? }
        tape: [],             // ostatnie transakcje i zdarzenia
        bestFundId: null
    };
}

// =================================================================================
// KLIENCI FUNDUSZU GRACZA
// =================================================================================

function getClientCharacter(client) {
    return CLIENT_TYPES[client?.type] || CLIENT_TYPES.careful;
}

function randomCharacter(trust = 50) {
    const weights = { sly: 1.2, careful: 1.4, fearful: 1, brave: 0.8 + trust / 100, rich: 0.3 + trust / 200, miser: 1, ethical: 0.6 };
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [key, weight] of Object.entries(weights)) {
        roll -= weight;
        if (roll <= 0) return key;
    }
    return 'careful';
}

function randomClientPersonName() {
    return `${getRandomElement(CLIENT_NAMES)} ${getRandomElement(CLIENT_LAST_INITIALS)}`;
}

/** Uzupełnia klienta o pola etapu F1 (nowi klienci i migracja starych zapisów). */
function ensureClientProfile(client) {
    if (LEGACY_CLIENT_TYPES[client.type]) {
        if (client.type === 'loyal') client.loyal = true;
        client.type = LEGACY_CLIENT_TYPES[client.type];
    }
    if (!CLIENT_TYPES[client.type]) client.type = 'careful';
    if (!client.motive) client.motive = getRandomElement(CLIENT_MOTIVES[client.type] || CLIENT_MOTIVES.careful);
    if (!Array.isArray(client.history)) client.history = [];
    if (!Number.isFinite(client.pendingSellUnits)) client.pendingSellUnits = 0;
    if (!Number.isFinite(client.pendingSellWeeks)) client.pendingSellWeeks = 0;
    return client;
}

function noteClientHistory(client, text) {
    client.history.unshift({ week: juMarket.week, text });
    if (client.history.length > CLIENT_HISTORY_LIMIT) client.history.length = CLIENT_HISTORY_LIMIT;
}

function pushTape(kind, text) {
    juMarket.tape.unshift({ week: juMarket.week, kind, text });
    if (juMarket.tape.length > JU_TAPE_LIMIT) juMarket.tape.length = JU_TAPE_LIMIT;
}

/** Wpłata klienta do funduszu po NAV (nie liczy się jako emisja gracza). */
function subscribeClient(client, value) {
    const nav = getFundNav();
    if (!(value > 0) || !(nav > 0)) return 0;
    const units = value / nav;
    client.avgCost = (client.avgCost * client.units + value) / (client.units + units);
    client.units += units;
    playerCash += value;
    playerFund.units += units;
    playerFund.current.inflow += value;
    recordPayment('external:klienci', 'player-fund', value, 'Wpłata klienta');
    return units;
}

/** Trust próg zależny od charakteru (strachliwy potrzebuje więcej, odważny mniej). */
function getTrustThreshold(character) {
    return 55 + (character.trustNeed || 0);
}

/** Co tydzień: zadowolenie i decyzje klientów funduszu gracza. */
function processClientsWeekly() {
    if (!playerFund) return;
    playerFund.clients.forEach(ensureClientProfile);

    const nav = getFundNav();
    const current = playerFund.current;
    const excess = getPeriodReturn(current.startNav, nav) - getPeriodReturn(current.startBenchmark, getBenchmarkValue());
    const lastPeriod = playerFund.periods[playerFund.periods.length - 1];
    const lastRankBad = lastPeriod && lastPeriod.rankOf > 1 && lastPeriod.rank === lastPeriod.rankOf;
    const trust = playerFund.trust;
    let redemptionBudget = Math.floor(playerFund.units * MAX_WEEKLY_REDEMPTION_SHARE);
    let newMoneyBudget = getFundAssets() * MAX_WEEKLY_NEW_MONEY_SHARE;

    const ethicsIssue = typeof getFundEthicsIssue === 'function' ? getFundEthicsIssue() : null;
    for (const client of [...playerFund.clients]) {
        const def = getClientCharacter(client);
        if (def.ethical && ethicsIssue) {
            client.satisfaction = Math.max(0, client.satisfaction - 0.08);
            if (!client.ethicsNoted || client.ethicsNoted !== ethicsIssue) { client.ethicsNoted = ethicsIssue; noteClientHistory(client, `Niepokoi się: ${ethicsIssue}.`); }
        }

        // Zadowolenie: zaufanie, wynik vs GIG (pogoń za wynikiem), obsunięcie, opłaty (sknera), porównanie z rywalami.
        const drift = (trust - 50) / 50 * 0.04
            + excess * def.chase * 0.8
            - current.maxDrawdown * def.volAversion * 0.3
            - (def.feeSensitivity || 0) * 0.01 * getPlayerFeeRate() / MANAGEMENT_FEE_ANNUAL
            - (getPlayerFeeRate() - MANAGEMENT_FEE_ANNUAL) * 0.4
            - (def.comparesRivals && lastRankBad ? 0.05 : 0);
        client.satisfaction = Math.max(0, Math.min(1, client.satisfaction + drift));

        // Sprzedaż czekająca na kupca zbyt długo → klient umarza.
        if (client.pendingSellUnits > 0) {
            client.pendingSellWeeks++;
            if (client.pendingSellWeeks >= JU_SELL_ORDER_PATIENCE && redemptionBudget > 0) {
                const units = Math.min(client.pendingSellUnits, redemptionBudget, client.units);
                const paid = redeemClientUnits(client, units);
                redemptionBudget -= units;
                client.pendingSellUnits = 0;
                client.pendingSellWeeks = 0;
                noteClientHistory(client, `Brak kupca na rynku wtórnym — umorzenie ${units.toFixed(1)} JU (${paid.toFixed(0)} zł).`);
            }
            continue;
        }

        const satisfied = client.satisfaction >= 0.6;
        const unhappy = client.satisfaction < 0.35;
        const highTrust = trust >= getTrustThreshold(def);

        if (unhappy) {
            if (client.loyal && Math.random() < 0.9) continue;
            if (Math.random() >= (1 - def.patience) * 0.8 || redemptionBudget <= 0) continue;
            const fraction = client.satisfaction < 0.15 || def.panic ? 1 : getRandomInRange(0.25, 0.6);
            const units = Math.min(redemptionBudget, Math.max(1, client.units * fraction));
            const paid = redeemClientUnits(client, units);
            redemptionBudget -= units;
            noteClientHistory(client, `Niezadowolony — umarza ${units.toFixed(1)} JU (${paid.toFixed(0)} zł).`);
        } else if (satisfied && highTrust) {
            if (!isFundOpenForSubscriptions() || Math.random() >= def.buyBias * 0.3 || newMoneyBudget <= 0) continue; // 0.13.1 (B5): nowe JU tylko przy otwartej emisji
            const value = Math.min(newMoneyBudget, getRandomInRange(def.size[0], def.size[1]) * 0.4);
            const units = subscribeClient(client, value);
            newMoneyBudget -= value;
            noteClientHistory(client, `Dokupuje ${units.toFixed(1)} JU za ${value.toFixed(0)} zł.`);
            pushTape('topup', `${def.icon} ${client.name} dokupuje ${units.toFixed(1)} JU funduszu ${playerProfile.fundName} (${formatPlnShort(value)}).`);
        } else if (satisfied && !highTrust) {
            if (Math.random() >= def.secondaryBias * 0.35) continue;
            client.pendingSellUnits = client.units * getRandomInRange(0.2, def.key === 'sly' ? 0.6 : 0.45);
            client.pendingSellWeeks = 0;
            noteClientHistory(client, `Zadowolony z wyników, ale nie ufa funduszowi — wystawia ${client.pendingSellUnits.toFixed(1)} JU na rynku wtórnym.`);
        } else if (def.key === 'sly' && (juMarket.stats.player?.history[0]?.premium || 0) > 0.03 && Math.random() < 0.3) {
            client.pendingSellUnits = client.units * getRandomInRange(0.2, 0.5); // realizacja premii
            client.pendingSellWeeks = 0;
            noteClientHistory(client, 'Premia na rynku wtórnym — wystawia część JU, by zrealizować zysk.');
        }
    }
}

function formatPlnShort(value) {
    return `${Math.round(value).toLocaleString('pl-PL')} zł`;
}

// =================================================================================
// RYNEK WTÓRNY JU (raz na tydzień)
// =================================================================================

/** Uczestnicy rynku: fundusz gracza, fundusze botów, fundusze zewnętrzne. */
function getJuMarketFunds() {
    const funds = [];
    if (playerFund) {
        const periods = playerFund.periods.slice(-4);
        funds.push({ id: 'player', name: playerProfile?.fundName || 'Twój fundusz', kind: 'player', nav: getFundNav(), assets: getFundAssets(), trust: playerFund.trust, ret: periods.reduce((s, p) => s + p.fundReturn - p.benchmarkReturn, 0) });
    }
    for (const manager of corporation?.managers || []) {
        const periods = manager.fund.periods.slice(-4);
        funds.push({ id: manager.id, name: `Fundusz ${manager.name.split(' ')[1] || manager.name}`, kind: 'bot', nav: getBotFundNav(manager.fund), assets: getBotFundAssets(manager.fund), trust: manager.fund.trust, ret: periods.reduce((s, p) => s + p.fundReturn - p.benchmarkReturn, 0) });
    }
    for (const stock of typeof getExternalFunds === 'function' ? getExternalFunds() : []) {
        const returns = (playerFund?.periods || []).slice(-4).map(p => (p.rivals.find(r => r.symbol === stock.symbol)?.return ?? 0) - p.benchmarkReturn);
        const ret = returns.reduce((s, r) => s + r, 0);
        funds.push({ id: stock.symbol, name: getExternalFirmName(stock), kind: 'external', nav: getExternalFundValue(stock), assets: getExternalFundValue(stock) * stock.totalShares, trust: Math.max(5, Math.min(95, 50 + ret * 400)), ret });
    }
    return funds;
}

/** Premia/dyskonto do NAV z nierównowagi popytu i podaży (wartości w zł). */
function computeJuPremium(demand, supply) {
    if (demand + supply <= 0) return 0;
    return Math.max(-JU_MARKET_MAX_PREMIUM, Math.min(JU_MARKET_MAX_PREMIUM, (demand - supply) / (demand + supply) * JU_MARKET_MAX_PREMIUM));
}

/** Fikcyjni kupujący z zewnątrz: liczba i kwoty zależą od zaufania i wyniku funduszu. */
function generateOutsideBuyers(fund, scale = 1) {
    const expected = Math.max(0, (fund.trust - 35) / 18 + fund.ret * 20);
    const count = Math.min(8, Math.floor(expected + Math.random()));
    const buyers = [];
    for (let i = 0; i < count; i++) {
        const key = randomCharacter(fund.trust);
        const def = CLIENT_TYPES[key];
        buyers.push({ name: randomClientPersonName(), key, def, value: getRandomInRange(def.size[0], def.size[1]) * scale });
    }
    return buyers;
}

function recordFundWeek(fundId, entry) {
    const stats = juMarket.stats[fundId] || (juMarket.stats[fundId] = { history: [] });
    stats.history.unshift({ week: juMarket.week, ...entry });
    if (stats.history.length > JU_HISTORY_WEEKS) stats.history.length = JU_HISTORY_WEEKS;
}

/** Fundusz gracza: prawdziwe zlecenia klientów + fikcyjni kupujący; nadwyżka popytu wpłaca po NAV. */
function runPlayerJuMarket(fund) {
    const nav = fund.nav;
    const sellers = playerFund.clients.filter(client => client.pendingSellUnits > 0);
    let buyers = applyFeeAndCampaign(generateOutsideBuyers(fund));
    const supplyValue = sellers.reduce((sum, client) => sum + client.pendingSellUnits * nav, 0);
    const demandValue = buyers.reduce((sum, buyer) => sum + buyer.value, 0);
    const premium = computeJuPremium(demandValue, supplyValue);
    const price = nav * (1 + premium);
    let volume = 0, newClients = 0, inflow = 0;

    // Sknera kupuje tylko z dyskontem.
    buyers = buyers.filter(buyer => buyer.key !== 'miser' || premium <= -0.02);

    for (const seller of sellers) {
        while (seller.pendingSellUnits > 0.01 && buyers.length) {
            const buyer = buyers[0];
            const units = Math.min(seller.pendingSellUnits, buyer.value / price);
            if (!(units > 0.01)) { buyers.shift(); continue; }
            seller.pendingSellUnits -= units;
            seller.units -= units;
            buyer.value -= units * price;
            volume += units;

            // Kupujący zostaje klientem funduszu (JU przechodzą między klientami; NAV i gotówka bez zmian).
            let client = buyer.client;
            if (!client) {
                client = addFundClient(buyer.key, 0, price);
                client.name = buyer.name;
                ensureClientProfile(client);
                buyer.client = client;
                newClients++;
                noteClientHistory(client, `Dołącza, kupując JU na rynku wtórnym po ${price.toFixed(2)} zł.`);
            }
            client.avgCost = (client.avgCost * client.units + units * price) / (client.units + units);
            client.units += units;
            const sellerDef = getClientCharacter(seller);
            noteClientHistory(seller, `Sprzedaje ${units.toFixed(1)} JU na rynku wtórnym po ${price.toFixed(2)} zł (${(premium * 100).toFixed(1)}% do NAV).`);
            pushTape('trade', `${sellerDef.icon} ${seller.name} → ${buyer.def.icon} ${client.name}: ${units.toFixed(1)} JU funduszu ${fund.name} po ${price.toFixed(2)} zł (${premium >= 0 ? '+' : ''}${(premium * 100).toFixed(1)}%).`);
            if (buyer.value < price) buyers.shift();
        }
        if (seller.pendingSellUnits <= 0.01) { seller.pendingSellUnits = 0; seller.pendingSellWeeks = 0; }
        if (seller.units < 0.5) redeemClientUnits(seller, seller.units); // resztka umorzona, klient odchodzi
    }

    // Niewykorzystany popyt: nowi klienci wpłacają do funduszu po NAV (gdy zaufanie pozwala).
    let budget = isFundOpenForSubscriptions() ? getFundAssets() * MAX_WEEKLY_NEW_MONEY_SHARE : 0; // 0.13.1 (B5): bez otwartej emisji nie powstają nowe JU
    for (const buyer of buyers) {
        if (fund.trust < 50 || budget <= 0 || buyer.value < nav) continue;
        const value = Math.min(buyer.value, budget);
        let client = buyer.client;
        if (!client) {
            client = addFundClient(buyer.key, 0, nav);
            client.name = buyer.name;
            ensureClientProfile(client);
            newClients++;
            pushTape('new', `🆕 Nowy klient: ${buyer.def.icon} ${client.name} (${buyer.def.label}) wpłaca ${formatPlnShort(value)} do funduszu ${fund.name}.`);
        }
        const units = subscribeClient(client, value);
        noteClientHistory(client, `Wpłaca ${value.toFixed(0)} zł (${units.toFixed(1)} JU po NAV).`);
        inflow += value;
        budget -= value;
    }

    recordFundWeek('player', { volume, premium, buyers: demandValue, sellers: supplyValue, newClients, inflow, clients: playerFund.clients.length, nav });
}

// =================================================================================
// B4: KAMPANIA MARKETINGOWA I OPŁATA A NAPŁYW KLIENTÓW
// =================================================================================

const MARKETING_TARGETS = {
    premium: { label: 'Zamożni klienci', icon: '💎', keys: ['rich', 'investor'] },
    safe:    { label: 'Ostrożni oszczędzający', icon: '🛡️', keys: ['careful', 'fearful', 'miser'] },
    dynamic: { label: 'Dynamiczni inwestorzy', icon: '🦁', keys: ['brave', 'sly'] }
};
const MARKETING_WEEKS = 8;

function getMarketingCost() {
    return Math.round(Math.max(5000, getFundAssets() * 0.01));
}

/** Kampania z budżetu korporacji: przez 8 tygodni dodatkowi kupujący JU z wybranej grupy. */
function startMarketingCampaign(target) {
    const def = MARKETING_TARGETS[target];
    if (!def || !playerFund || !corporation) return false;
    if (playerFund.campaign?.weeksLeft > 0) { showToast('Kampania już trwa.', 'warning'); return false; }
    const cost = getMarketingCost();
    if (corporation.budget < cost) { showToast(`Budżet korporacji nie wystarczy (${formatZl(cost, 0)}).`, 'error'); return false; }
    corporation.budget -= cost;
    recordPayment('external:korporacja', 'external:agencja-reklamowa', cost, `Kampania marketingowa: ${def.label}`);
    playerFund.campaign = { target, weeksLeft: MARKETING_WEEKS };
    logEvent(`📣 Kampania marketingowa funduszu (${def.icon} ${def.label}) za ${formatZl(cost, 0)} z budżetu korporacji.`, 'review');
    return true;
}

/** Opłata odstrasza część kupujących (sknery najbardziej), niska przyciąga dodatkowych; kampania dokłada kupujących. */
function applyFeeAndCampaign(buyers) {
    const attractiveness = typeof getFeeAttractiveness === 'function' ? getFeeAttractiveness() : 1;
    let result = buyers;
    if (attractiveness < 1) {
        result = buyers.filter(buyer => Math.random() < (buyer.key === 'miser' ? attractiveness * attractiveness : attractiveness));
    } else if (attractiveness > 1 && Math.random() < attractiveness - 1) {
        const key = Math.random() < 0.5 ? 'miser' : randomCharacter(playerFund.trust);
        const def = CLIENT_TYPES[key];
        result.push({ name: randomClientPersonName(), key, def, value: getRandomInRange(def.size[0], def.size[1]) });
    }
    const campaign = playerFund.campaign;
    if (campaign?.weeksLeft > 0) {
        campaign.weeksLeft--;
        for (let i = 0; i < 2; i++) {
            const key = getRandomElement(MARKETING_TARGETS[campaign.target]?.keys || ['careful']);
            const def = CLIENT_TYPES[key];
            result.push({ name: randomClientPersonName(), key, def, value: getRandomInRange(def.size[0], def.size[1]) });
        }
    }
    return result;
}

/** Fundusze botów i zewnętrzne: zagregowane zlecenia (bez listy osób), wpisy na taśmie. */
function runSyntheticJuMarket(fund) {
    const unitsTotal = fund.nav > 0 ? fund.assets / fund.nav : 0;
    const supplyShare = Math.max(0, (60 - fund.trust) / 60) * getRandomInRange(0, 0.03) + getRandomInRange(0, 0.004);
    const demandShare = Math.max(0, (fund.trust - 40) / 60) * getRandomInRange(0, 0.03) + Math.max(0, fund.ret) * 0.05 * Math.random();
    const supplyValue = unitsTotal * supplyShare * fund.nav;
    const demandValue = unitsTotal * demandShare * fund.nav;
    const premium = computeJuPremium(demandValue, supplyValue);
    const volume = Math.min(supplyValue, demandValue) / Math.max(0.01, fund.nav);
    const prevClients = juMarket.stats[fund.id]?.history[0]?.clients ?? Math.max(20, Math.round(fund.assets / 3000));
    const newClients = Math.max(0, Math.round((demandValue - supplyValue) / Math.max(500, fund.nav * 50)));
    recordFundWeek(fund.id, { volume, premium, buyers: demandValue, sellers: supplyValue, newClients, inflow: Math.max(0, demandValue - supplyValue), clients: prevClients + newClients, nav: fund.nav });

    if (volume > 0 && Math.random() < 0.5) {
        const seller = CLIENT_TYPES[randomCharacter(100 - fund.trust)];
        const buyer = CLIENT_TYPES[randomCharacter(fund.trust)];
        const units = Math.max(1, Math.round(volume * getRandomInRange(0.05, 0.3)));
        pushTape('trade', `${seller.icon} ${randomClientPersonName()} → ${buyer.icon} ${randomClientPersonName()}: ${units} JU funduszu ${fund.name} (${premium >= 0 ? '+' : ''}${(premium * 100).toFixed(1)}%).`);
    }
}

/** „Popularność” tygodnia: premia + napływ netto względem aktywów (porównywalne między funduszami różnej wielkości). */
function getJuPopularity(fundId, assets) {
    const last = juMarket.stats[fundId]?.history[0];
    if (!last) return -Infinity;
    return last.premium + (last.inflow + last.volume * (last.nav || 0)) / Math.max(1, assets);
}

function runJuMarketWeekly() {
    juMarket.week++;
    const funds = getJuMarketFunds();
    for (const fund of funds) {
        if (fund.kind === 'player') runPlayerJuMarket(fund);
        else runSyntheticJuMarket(fund);
    }
    const best = funds.map(fund => ({ fund, score: getJuPopularity(fund.id, fund.assets) })).sort((a, b) => b.score - a.score)[0];
    juMarket.bestFundId = best?.fund.id || null;
    if (best) pushTape('best', `🏆 Najlepiej sprzedający się fundusz tygodnia: ${best.fund.name}.`);
    if (typeof renderJuMarket === 'function') renderJuMarket();
}
