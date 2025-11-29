// economy.js - Makroekonomia, podatki, rynek obligacji

// --- Zmienne Globalne Ekonomii ---
let governmentTreasury = 1000000; // Skarbiec Państwa
let marketVolatilityIndex = 0; // Wskaźnik zmienności (WNR)
let exchangeCollapseState = {}; // Stan zwinięcia tabel w UI
let currentDebtOffer = null;
// --- Podatki ---
const TAX_RATES = {
    dividend: 0.10,        // 10% od dywidend
    capitalGains: 0.12,    // 12% od zysków kapitałowych
    companyIncome: [       // Podatek dochodowy od firm (progi)
        { threshold: 0, rate: 0.13 },    // 13% do pewnego progu
        { threshold: 50000, rate: 0.26 } // 26% powyżej progu 50k PLN dochodu (tygodniowo/miesięcznie?) - UPROSZCZONE
    ],
    wealthTax: [           // Podatek od bogactwa (progi od wartości netto)
        { threshold: 100000, rate: 0.25 },  // 25% dla 100k - 600k
        { threshold: 600001, rate: 0.35 },  // 35% dla 600k - 1.5M
        { threshold: 1500001, rate: 0.50 } // 50% powyżej 1.5M
    ],
    cityTaxPlayerAI: 0.03, // 3% podatek miejski od gotówki gracza/AI (płacony tygodniowo)
    cityTaxCompany: 0.02   // 2% podatek miejski od gotówki spółek (płacony tygodniowo)
};

// Zmienne czasowe podatków
let WEALTH_TAX_INTERVAL; // = BASE_DELAYS.quarterly * 4; 
let nextWealthTaxTime = 0; 


const CANDLE_INTERVAL = 15 * 1000; 

// --- Bank Centralny i Stopy ---
let centralBank = {
    funds: 100000000,
    baseInterestRate: 0.05, 
    reserveRequirement: 0.10, 
    ceo: null
};
let LOAN_INTEREST_RATE; // = 0.10; 
let DEPOSIT_INTEREST_RATE; //= 0.06; 

// --- Rynek Obligacji i Bonów ---
let stateBondOffer = {
    shortTerm: { available: 0, interest: 0.03 },
    mediumTerm: { available: 0, interestBase: 0.02 },
    longTerm: { available: 0, interestBase: 0.05 }
};
let allBonds = []; // Lista posiadanych obligacji
let activeBonds = []; // Oferty na rynku
let allTBills = []; // Lista bonów skarbowych
let currentTBillAuction = null;

// --- Indeksy ---
let marketIndexes = [
    {
        id: 'GIG',
        name: 'Główny Indeks Giełdowy',
        description: 'Śledzi ogólną kondycję całego rynku na podstawie średniej ceny wszystkich akcji.',
        value: 0,
        change: 0,
        priceHistory: [] // NOWA WŁAŚCIWOŚĆ
    },
    {
        id: 'TIG5',
        name: 'Topowy Indeks Giełdowy 5',
        description: 'Śledzi kondycję 5 spółek o największej kapitalizacji rynkowej (tzw. blue chip).',
        value: 0,
        change: 0,
        priceHistory: [] // NOWA WŁAŚCIWOŚĆ
    },
    {
        id: 'SIG20',
        name: 'Szeroki Indeks Giełdowy 20',
        description: 'Śledzi kondycję 20 największych spółek na giełdzie.',
        value: 0,
        change: 0,
        priceHistory: [] // NOWA WŁAŚCIWOŚĆ
    }
];

const bondIssuers = {
    municipal: [ // Emitenci komunalni
        { name: "Miejskie Wodociągi Gdańsk", risk: 0.1 },
        { name: "Zarząd Transportu Miejskiego", risk: 0.15 },
        { name: "Gdańskie Nieruchomości Komunalne", risk: 0.12 }
        //TODO więcej spółek
    ],
    corporate_non_public: [ // Korporacje pozagiełdowe
        { name: "Północna Grupa Budowlana Sp. z o.o.", risk: 0.6 },
        { name: "Pomorskie Centrum Logistyczne 'Amber'", risk: 0.5 },
        { name: "Stocznia Remontowa 'Neptun'", risk: 0.7 }
        //TODO więcej spółek
    ]
};

// --- Urząd Antymonopolowy ---
let antitrustOffice = {
    level: 0,
    analysisCapacity: 0.1,
    accuracy: 0.2,
    budget: 0
};
const ANTITRUST_UPGRADE_COSTS = [50000, 150000, 500000, 1500000, 5000000];


if (typeof antitrustOffice === 'undefined') {
    let antitrustOffice = {
        level: 0,
        analysisCapacity: 0.1,
        accuracy: 0.2,
        budget: 0
    };
    const ANTITRUST_UPGRADE_COSTS = [50000, 150000, 500000, 1500000, 5000000];
}

// --- FUNKCJE EKONOMICZNE ---

// Aktualizacja stóp procentowych na podstawie Banku Centralnego
function updateInterestRates() {
    // Stopy rynkowe są sumą stopy bazowej BC i stałej marży rynkowej
    LOAN_INTEREST_RATE = centralBank.baseInterestRate + 0.05; // Marża 5% ponad stopę BC
    DEPOSIT_INTEREST_RATE = centralBank.baseInterestRate + 0.01; // Marża 1% ponad stopę BC

    // Upewnij się, że stopy nie spadną poniżej minimum
    LOAN_INTEREST_RATE = Math.max(0.01, LOAN_INTEREST_RATE);
    DEPOSIT_INTEREST_RATE = Math.max(0.005, DEPOSIT_INTEREST_RATE);

    // Aktualizuj oprocentowanie w bankach komercyjnych (teraz bazuje na globalnych stopach)
    commercialBanks.forEach(bank => {
        if (bank.isActive) {
            bank.interestRateLoan = LOAN_INTEREST_RATE + bank.baseInterestRateMargin;
            bank.interestRateDeposit = DEPOSIT_INTEREST_RATE + bank.baseInterestRateMargin * 0.5; // Marża depozytowa niższa
        }
    });
  // Aktualizuj UI Banku Centralnego, jeśli otwarty
    const bankModal = document.getElementById('bank-modal');
    const centralTab = document.getElementById('bank-content-central');
    if (bankModal?.style.display === 'block' && centralTab?.style.display === 'block') {
         const baseRateEl = document.getElementById('bc-base-rate-display');
         if(baseRateEl) baseRateEl.textContent = (centralBank.baseInterestRate * 100).toFixed(1); // Aktualizuj stopę bazową
    }
}

// Główna funkcja aktualizująca ceny (Symulacja Rynku)
function updateStockPrices() {
    const now = Date.now();
    const marketModifier = 1 + (marketVolatilityIndex - 1) * 0.5;

    stocks.forEach(stock => {
        if (stock.assetType === 'Holding') {
            return; 
        }

        let priceGrowthModifier = 1.0;
        let volatilityModifier = 1.0;
        let isVolatilityCapped = false; 

        // Modyfikatory fazy korporacyjnej (bez zmian)
        switch (stock.corporatePhase) {
            case CORPORATE_PHASES.GROWTH: priceGrowthModifier += 0.015; volatilityModifier += 0.1; break;
            case CORPORATE_PHASES.STABILITY: volatilityModifier -= 0.1; break;
            case CORPORATE_PHASES.DECLINE: priceGrowthModifier -= 0.02; volatilityModifier += 0.15; break;
            case CORPORATE_PHASES.REORGANIZATION: volatilityModifier += 0.2; break;
            case CORPORATE_PHASES.GOLDEN_YEAR: priceGrowthModifier += 0.04; volatilityModifier -= 0.05; break;
            case CORPORATE_PHASES.SHADOW_DESCENT: priceGrowthModifier -= 0.05; volatilityModifier += 0.25; break;
            case CORPORATE_PHASES.INNOVATION_PUSH: priceGrowthModifier += 0.01; volatilityModifier += 0.1; break;
        }

        // Modyfikatory cech CEO (bez zmian)
        if (stock.ceo && stock.ceo.traits) {
            stock.ceo.traits.forEach(trait => {
                switch (trait.id) {
                    case 'wyjadacz': priceGrowthModifier += 0.01; break;
                    case 'rekin': priceGrowthModifier += 0.05; break;
                    case 'filar_w_branzy': priceGrowthModifier += 0.01; break;
                    case 'tyran': priceGrowthModifier -= 0.02; break;
                    case 'rozrzutny': priceGrowthModifier -= 0.02; break;
                    case 'nieudacznik': priceGrowthModifier -= 0.05; volatilityModifier += 0.05; break;
                    case 'biurowy_dron': priceGrowthModifier -= 0.01; break;
                    case 'hobbista': volatilityModifier += 0.02; break;
                    case 'wizjoner': volatilityModifier += 0.05; break;
                    case 'stoik': volatilityModifier *= 0.60; break;
                    case 'pewniak': isVolatilityCapped = true; break;
                    case 'ryzykant': volatilityModifier += 0.10; break;
                    case 'ksiegowy': volatilityModifier *= 0.95; break;
                    case 'lowca_glow': volatilityModifier += 0.15; break;
                }
            });
        }
        
        // ===>>> NOWY BLOK: ZASTOSOWANIE EFEKTÓW M&A (SYNERGIA/DYSSYNERGIA) <<<===
        if (stock.mergerEffect) {
            if (now < stock.mergerEffect.expiryTime) {
                // Jeśli modyfikator jest aktywny, dodaj jego wartość (dodatnią lub ujemną)
                priceGrowthModifier += stock.mergerEffect.effectValue;
            } else {
                // Czas modyfikatora minął, usuń go
                logEvent(`[M&A Efekt] Efekt ${stock.mergerEffect.type} dla ${stock.name} wygasł.`);
                stock.mergerEffect = null;
            }
        }
        // ===>>> KONIEC NOWEGO BLOKU <<<===


        // Inicjalizacja świec (bez zmian)
        if (!stock.currentCandle || !stock.candlestickHistory) {
            stock.candlestickHistory = [];
            stock.lineHistory = [];
            const initialPrice = stock.price > 0 ? stock.price : 0.01;
            stock.currentCandle = { time: now, open: initialPrice, high: initialPrice, low: initialPrice, close: initialPrice };
        }

        // Obliczanie 'change' (bez zmian)
        let change;
        let effectiveVolatility = stock.volatilityFactor * volatilityModifier;
        if (isVolatilityCapped) {
            effectiveVolatility = Math.max(0.5, Math.min(effectiveVolatility, 3.0));
        }
        if (stock.marketBehavior) {
            if (stock.marketBehavior.phase === 'ipo_boost' && now < stock.marketBehavior.endTime) {
                change = (0.01 + Math.random() * 0.02) * effectiveVolatility;
            } else if (now >= stock.marketBehavior.endTime) {
                logEvent(`📈 IPO boost phase for ${stock.name} has ended.`);
                stock.marketBehavior = null; 
                change = (Math.random() - 0.5) * 0.2 * effectiveVolatility * marketModifier; 
            } else {
                 change = (Math.random() - 0.5) * 0.2 * effectiveVolatility * marketModifier;
            }
        }
        else {
            if (stock.activePositiveBoostUntil && now < stock.activePositiveBoostUntil) {
                change = (0.015 + Math.random() * 0.025) * effectiveVolatility;
            } else if (stock.activeNegativeBoostUntil && now < stock.activeNegativeBoostUntil) {
                change = -(0.015 + Math.random() * 0.025) * effectiveVolatility;
            } else {
                if (stock.activePositiveBoostUntil && now >= stock.activePositiveBoostUntil) stock.activePositiveBoostUntil = null;
                if (stock.activeNegativeBoostUntil && now >= stock.activeNegativeBoostUntil) stock.activeNegativeBoostUntil = null;
                change = (Math.random() - 0.5) * 0.2 * effectiveVolatility * marketModifier;
            }
        }

        // Obliczanie 'priceDrift' (bez zmian)
        const currentPriceForDrift = stock.price > 0 ? stock.price : 0.01;
        const priceDrift = currentPriceForDrift * 0.00005 * (priceGrowthModifier - 1.0); 

        // Zastosowanie efektu Monopolisty (bez zmian)
        let finalPriceDrift = priceDrift;
        if (stock.isMonopolist) {
            finalPriceDrift *= 1.5; 
        }

        // Aktualizacja ceny (bez zmian)
        stock.price += change + finalPriceDrift; 
        if (stock.price <= 0) { 
             stock.price = 0.01; 
        }

        // Reszta funkcji (blokada handlu, bankructwo, historia cen, świece, ETFy) bez zmian...
        if (stock.price < 1.00 && !stock.isTradeLocked) {
            if (Math.random() < 0.80) {
                stock.isTradeLocked = true;
                logEvent(`⛔ Trading halted for ${stock.name} (${stock.symbol}) due to low price!`, 'review');
            }
        } else if (stock.price > 1.50 && stock.isTradeLocked) {
            stock.isTradeLocked = false;
            logEvent(`✅ Trading resumed for ${stock.name} (${stock.symbol})!`, 'review');
        }

        if (stock.financialHealth <= -5 && !stock.isBankrupt) {
            let canGoBankrupt = true;
            if (stock.ceo?.traits?.some(t => t.id === 'bogacz')) {
                canGoBankrupt = false;
                if (stock.financialHealth < -4) stock.financialHealth = -4;
            }
        }

        let historyLimitCandles = 15 * 4;
        let historyLimitLine = 15 * 60;
        const mindLevel = getSkillLevel('analyticalMind');
        if (mindLevel === 1) {
            historyLimitCandles = 20 * 4;
            historyLimitLine = 20 * 60;
        } else if (mindLevel >= 2) {
            historyLimitCandles = 25 * 4;
            historyLimitLine = 25 * 60;
        }

        stock.lineHistory.push({ time: now, price: stock.price });
        if (stock.lineHistory.length > historyLimitLine) {
            stock.lineHistory.shift(); 
        }

        const candle = stock.currentCandle;
        if (candle) {
            candle.close = stock.price;
            if (stock.price > candle.high) candle.high = stock.price;
            if (stock.price < candle.low) candle.low = stock.price;

            if (now - candle.time >= CANDLE_INTERVAL) {
                stock.candlestickHistory.push(candle);
                if (stock.candlestickHistory.length > historyLimitCandles) {
                    stock.candlestickHistory.shift(); 
                }
                stock.currentCandle = { time: now, open: stock.price, high: stock.price, low: stock.price, close: stock.price };
            }
        } else {
             stock.currentCandle = { time: now, open: stock.price, high: stock.price, low: stock.price, close: stock.price };
        }
    }); // Koniec stocks.forEach

    // Aktualizacja ETF (bez zmian)
    etfs.forEach(etf => {
        const underlyingStocks = stocks.filter(stock =>
            !stock.assetType && 
            !stock.isBankrupt &&
            stock.sector?.some(s => etf.targetSectors.includes(s))
        );

        if (underlyingStocks.length > 0) {
            const totalValue = underlyingStocks.reduce((sum, stock) => sum + stock.price, 0);
            etf.price = totalValue / underlyingStocks.length;
            etf.priceHistory.push(etf.price);
            if (etf.priceHistory.length > 15) {
                etf.priceHistory.shift();
            }
        }
    }); 
}

function updateMarketVolatilityIndex() {
    if (stocks.length === 0) {
        marketVolatilityIndex = 0;
        return;
    }

    let totalVolatility = 0;
    let validStocksCount = 0;

    // Użyjemy pętli forEach zamiast reduce, aby mieć lepszą kontrolę
    stocks.forEach(stock => {
        // Sprawdzamy, czy volatilityFactor istnieje, jest liczbą i nie jest NaN
        if (typeof stock.volatilityFactor === 'number' && !isNaN(stock.volatilityFactor)) {
            totalVolatility += stock.volatilityFactor;
            validStocksCount++;
        } else {
            // JEŚLI ZNAJDZIEMY PROBLEM, WYŚWIETLAMY BŁĄD W KONSOLI
            console.error("!!! ZNALEZIONO SPÓŁKĘ BEZ POPRAWNEGO 'volatilityFactor':", stock);
        }
    });

    // Obliczamy średnią tylko na podstawie poprawnych danych
    if (validStocksCount > 0) {
        marketVolatilityIndex = totalVolatility / validStocksCount;
    } else {
        marketVolatilityIndex = 0; // Wartość awaryjna, jeśli żadna spółka nie ma poprawnych danych
    }

    // Dodatkowe zabezpieczenie, aby marketVolatilityIndex nigdy nie był NaN
    if (isNaN(marketVolatilityIndex)) {
        console.error("!!! marketVolatilityIndex to wciąż NaN! Resetuję do 0.", { totalVolatility, validStocksCount });
        marketVolatilityIndex = 0;
    }
}

function updateMarketIndexes() {
    // Zabezpieczenie na wypadek, gdyby nie było żadnych spółek
    if (stocks.length === 0) return;

    // --- Obliczanie GIG (Główny Indeks Giełdowy) ---
    // Średnia cena wszystkich akcji w grze.
    const gigIndex = marketIndexes.find(idx => idx.id === 'GIG');
    if (gigIndex) {
        const oldValue = gigIndex.value;
        const totalValue = stocks.reduce((sum, stock) => sum + stock.price, 0);
        const newValue = totalValue / stocks.length;
        gigIndex.value = newValue;
        gigIndex.change = newValue - oldValue;
    }

    // --- Obliczanie TIG5 i SIG20 (na podstawie kapitalizacji rynkowej) ---

    // 1. Stwórz tymczasową tablicę spółek z obliczoną kapitalizacją
    const stocksWithMarketCap = stocks.map(stock => ({
        ...stock,
        marketCap: stock.price * stock.totalShares
    }));

    // 2. Posortuj spółki od największej do najmniejszej pod względem kapitalizacji
    stocksWithMarketCap.sort((a, b) => b.marketCap - a.marketCap);

    // 3. Oblicz TIG5 (Topowy Indeks Giełdowy 5)
    const tig5Index = marketIndexes.find(idx => idx.id === 'TIG5');
    if (tig5Index) {
        const top5 = stocksWithMarketCap.slice(0, 5); // Weź 5 pierwszych spółek z posortowanej listy
        if (top5.length > 0) {
            const oldValue = tig5Index.value;
            const totalValue = top5.reduce((sum, stock) => sum + stock.price, 0);
            const newValue = totalValue / top5.length;
            tig5Index.value = newValue;
            tig5Index.change = newValue - oldValue;
        }
    }

    // 4. Oblicz SIG20 (Szeroki Indeks Giełdowy 20)
    const sig20Index = marketIndexes.find(idx => idx.id === 'SIG20');
    if (sig20Index) {
        const top20 = stocksWithMarketCap.slice(0, 20); // Weź 20 pierwszych spółek
        if (top20.length > 0) {
            const oldValue = sig20Index.value;
            const totalValue = top20.reduce((sum, stock) => sum + stock.price, 0);
            const newValue = totalValue / top20.length;
            sig20Index.value = newValue;
            sig20Index.change = newValue - oldValue;
        }
    }
}

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
    // Dodaj wartość obligacji (prosta estymacja)
    
    // --- 👇 POPRAWIONA LINIA 👇 ---
    // Dodajemy || [], aby zapewnić, że 'bonds' zawsze będzie tablicą, nawet jeśli entity.tBills nie istnieje
    const bonds = (entity === 'player') ? allBonds.filter(b => b.ownerId === 'player') : (entity.tBills || []); 
    
    value += bonds.length * 1000; // Teraz bezpiecznie można użyć .length

    return value;
}

// --- PODATKI (Poprawiona funkcja Wealth Tax) ---
function processWealthTax() {
    // Tworzymy listę wszystkich podmiotów do opodatkowania (Gracz + AI)
    const entities = [
        { id: 'player', name: 'Ty (Gracz)', cash: playerCash, portfolio: playerPortfolio, skills: skills },
        ...aiCompetitors.filter(ai => ai.skillPoints !== undefined) // Tylko boty z systemem umiejętności
    ];

    entities.forEach(entity => {
        // Oblicz wartość netto (gotówka + akcje + obligacje)
        // calculateNetWorth jest zdefiniowana w gameLogic.js
        const netWorth = calculateNetWorth(entity.id === 'player' ? 'player' : entity); 
        
        let taxRate = 0;
        let applicableThreshold = 0;

        // Znajdź odpowiedni próg podatkowy iterując od najwyższego
        // TAX_RATES musi być zdefiniowane w zasięgu globalnym (jest w gameLogic.js)
        for (let i = TAX_RATES.wealthTax.length - 1; i >= 0; i--) {
            if (netWorth >= TAX_RATES.wealthTax[i].threshold) {
                taxRate = TAX_RATES.wealthTax[i].rate;
                applicableThreshold = TAX_RATES.wealthTax[i].threshold;
                break;
            }
        }

        // Jeśli naliczono podatek (taxRate > 0), sprawdzamy ulgi
        if (taxRate > 0) {
            // --- Obsługa umiejętności San Escobar ---
            let baseRateReduction = 0; // Redukcja punktów procentowych (np. 0.03)
            
            // Pobierz poziom umiejętności (dla gracza lub AI)
            const entitySkills = entity.id === 'player' ? skills : (entity.unlockedSkills || {});
            const sanEscobarLvl = entity.id === 'player' ? getSkillLevel('sanEscobar') : (entitySkills['sanEscobar'] || 0);

            if (sanEscobarLvl >= 4) { 
                // Lvl 4: Całkowite zwolnienie z podatku
                taxRate = 0;
            } else if (sanEscobarLvl === 3) { 
                // Lvl 3: Usunięcie progów 35% i 50%, obniżenie progu 25% do 5%
                // TAX_RATES.wealthTax[1] to próg 600k (35%)
                if (applicableThreshold >= TAX_RATES.wealthTax[1].threshold) {
                    taxRate = 0; // Zniesienie podatku dla wysokich progów
                } else if (applicableThreshold === TAX_RATES.wealthTax[0].threshold) {
                    taxRate = 0.05; // Obniżenie najniższego progu do 5%
                }
            } else if (sanEscobarLvl === 2) { 
                // Lvl 2: Obniżenie o 3 punkty procentowe (np. z 25% na 22%)
                baseRateReduction = 0.03;
            }
            // Lvl 1: Nie wpływa na podatek od majątku (tylko na dywidendy/zyski)

            // Zastosuj redukcję punktową (dla Lvl 2)
            taxRate = Math.max(0, taxRate - baseRateReduction);

            // --- Finalizacja płatności ---
            if (taxRate > 0) {
                const taxToPay = netWorth * taxRate;
                governmentTreasury += taxToPay; // Środki trafiają do budżetu państwa

                if (entity.id === 'player') {
                    playerCash -= taxToPay;
                    logEvent(`💸 Zapłacono roczny podatek od bogactwa: ${taxToPay.toFixed(2)} PLN (${(taxRate * 100).toFixed(0)}% od ${netWorth.toFixed(2)} PLN).`, 'review');
                    displayCash();
                } else {
                    entity.cash -= taxToPay;
                    console.log(`[AI Podatki] ${entity.name} zapłacił ${taxToPay.toFixed(2)} PLN podatku od bogactwa.`);
                }
            } else if (entity.id === 'player' && sanEscobarLvl >= 3) {
                 // Informacja dla gracza, że uniknął podatku dzięki umiejętności
                 logEvent(`🌴 Dzięki znajomościom w San Escobar uniknąłeś rocznego podatku od bogactwa!`, 'success');
            }
        }
    });

    // Ustawienie czasu następnego podatku
    // currentSpeedMultiplier musi być dostępne globalnie (jest w main.js)
    nextWealthTaxTime = Date.now() + WEALTH_TAX_INTERVAL / currentSpeedMultiplier; 
}

function processCityAndCitizenTaxes() {
    let totalTaxCollected = 0;

    // Podatek od Gracza
    let playerTaxModifier = 1.0;
    const playerSanEscobarLvl = getSkillLevel('sanEscobar');
    if (playerSanEscobarLvl >= 1) playerTaxModifier = 0.95;
    if (playerSanEscobarLvl >= 4) playerTaxModifier = 0.0;
    const playerCityTax = playerCash * TAX_RATES.cityTaxPlayerAI * playerTaxModifier;
    if (playerCityTax > 0) {
        playerCash -= playerCityTax;
        totalTaxCollected += playerCityTax;
    }

    // Podatek od AI
    aiCompetitors.forEach(ai => {
        // Pomijamy boty bez gotówki lub bez systemu umiejętności
        if (!ai.cash || ai.cash <= 0 || ai.skillPoints === undefined) return;

        let aiTaxModifier = 1.0;
        const aiSanEscobarLvl = ai.unlockedSkills ? (ai.unlockedSkills['sanEscobar'] || 0) : 0;
        if (aiSanEscobarLvl >= 1) aiTaxModifier = 0.95;
        if (aiSanEscobarLvl >= 4) aiTaxModifier = 0.0;

        const aiCityTax = ai.cash * TAX_RATES.cityTaxPlayerAI * aiTaxModifier;
        if (aiCityTax > 0) {
            ai.cash -= aiCityTax;
            totalTaxCollected += aiCityTax;
        }
    });

    // Podatek od Spółek
    stocks.forEach(stock => {
        // Płacą tylko aktywne spółki giełdowe (nie startupy, reity, itp.)
        if (!stock.assetType && !stock.isBankrupt && stock.cash > 0) {
            // Umiejętność San Escobar NIE wpływa na podatek spółek
            const companyCityTax = stock.cash * TAX_RATES.cityTaxCompany;
            if (companyCityTax > 0) {
                stock.cash -= companyCityTax;
                totalTaxCollected += companyCityTax;
                // Aktualizuj gotówkę banku, jeśli firma ma konto
                if (stock.bankAccountId) {
                    const bank = commercialBanks.find(b => b.id === stock.bankAccountId);
                    if (bank) bank.cash -= companyCityTax; // Bank traci gotówkę firmy
                }
            }
        }
    });

    // Podatek od "Obywateli" (symulacja)
    // Prosty model: stała kwota + rosnąca z populacją miasta
    const citizenBaseTax = 5000;
    const citizenPopulationTax = city.population * 0.1; // Np. 0.1 PLN od mieszkańca tygodniowo
    const citizenTax = citizenBaseTax + citizenPopulationTax;
    totalTaxCollected += citizenTax;

    // Dodaj zebrane podatki do skarbca państwa
    governmentTreasury += totalTaxCollected;

    // Loguj tylko dla gracza
    if (playerCityTax > 0 && playerSanEscobarLvl < 4) { // Nie loguj, jeśli gracz nie płaci
        logEvent(`🏛️ Zapłacono tygodniowy podatek miejski: ${playerCityTax.toFixed(2)} PLN.`);
    }
}

// --- Obligacje Skarbowe ---
function issueStateBonds() {
    stateBondOffer.shortTerm.available = getRandomIntInRange(50, 200);
    stateBondOffer.mediumTerm.available = getRandomIntInRange(30, 150);
    stateBondOffer.longTerm.available = getRandomIntInRange(20, 100);

    // Rzadki event modyfikujący oprocentowanie
    if (Math.random() < 0.1) { // 10% szans
        const change = Math.random() < 0.5 ? 0.005 : -0.005;
        stateBondOffer.mediumTerm.interestBase += change;
        stateBondOffer.longTerm.interestBase += change;
        logEvent(`🏛️ Bank Centralny koryguje oprocentowanie obligacji o ${change > 0 ? '+' : ''}${(change * 100).toFixed(1)}%!`, 'market');
    }

    logEvent("🏛️ Bank Centralny wyemitował nową serię obligacji skarbowych.", 'market');
    // Jeśli gracz ma otwarty modal banku, odśwież go
    if (document.getElementById('bank-modal').style.display === 'block') {
        openBankModal();
    }
}

function issueNewBondOffer() {
    if (activeBonds.length >= 10) return; // Ograniczenie liczby aktywnych ofert

    const roll = Math.random();
    let issuer, type, interest, risk, duration;

   if (roll < 0.15 && (cityInvestment.playerHasUnlocked || cityInvestment.aiHasUnlocked)) {
        // Obligacja komunalna (rzadka i tylko po odblokowaniu)
        issuer = getRandomElement(bondIssuers.municipal);
        type = 'Komunalna';
        risk = issuer.risk;
        duration = getRandomIntInRange(15, 35); // krótsze
        interest = 0.03 + (duration / 100) + (risk * 2); // Niskie oprocentowanie
    } else if (roll < 0.60) {
        // Obligacja korporacyjna spółki giełdowej
        const publicCompany = getRandomElement(stocks.filter(s => !s.assetType));
        if (!publicCompany) return;
        issuer = { name: publicCompany.name, risk: publicCompany.volatilityFactor / 10 };
        type = 'Korporacyjna (Giełdowa)';
        risk = issuer.risk;
        duration = getRandomIntInRange(10, 50);
        interest = 0.04 + (duration / 80) + (risk * 3);
    } else {
        // Obligacja korporacyjna spółki pozagiełdowej (ryzykowna)
        issuer = getRandomElement(bondIssuers.corporate_non_public);
        type = 'Korporacyjna (Pozagiełdowa)';
        risk = issuer.risk;
        duration = getRandomIntInRange(20, 50);
        interest = 0.06 + (duration / 60) + (risk * 4);
    }

    const newBond = {
        id: `bond_${Date.now()}_${Math.random()}`,
        issuerName: issuer.name,
        type: type,
        interestRate: interest,
        durationMinutes: duration,
        risk: risk,
        faceValue: 1000, // Wartość nominalna
        available: getRandomIntInRange(50, 500)
    };
    
    activeBonds.push(newBond);
    logEvent(`📰 Nowa emisja obligacji (${newBond.type}) od ${newBond.issuerName}!`, 'market');
}

function buyStateBond(buyer, type, quantity) {
    const offer = stateBondOffer[type];
    if (quantity <= 0 || isNaN(quantity)) return;

    if (quantity > offer.available) {
        if (buyer === 'player') alert("Nie ma wystarczającej liczby dostępnych obligacji tej serii.");
        return;
    }

    const totalCost = 1000 * quantity;
    const buyerCash = (buyer === 'player') ? playerCash : buyer.cash;

    if (buyerCash < totalCost) {
        if (buyer === 'player') alert("Nie masz wystarczająco gotówki.");
        return;
    }

    if (buyer === 'player') {
        playerCash -= totalCost;
    } else {
        buyer.cash -= totalCost;
    }
    offer.available -= quantity;

    let interestRate, durationMinutes;
    if (type === 'shortTerm') {
        interestRate = offer.interest;
        durationMinutes = 10;
    } else {
        const inflationProxy = marketVolatilityIndex / 100; 
        interestRate = inflationProxy + offer.interestBase;
        durationMinutes = (type === 'mediumTerm') ? 25 : 45;
    }

    const maturityDate = Date.now() + (durationMinutes * 60 * 1000 / currentSpeedMultiplier);
    const ownerId = (buyer === 'player') ? 'player' : buyer.id;

    for (let i = 0; i < quantity; i++) {
        allBonds.push({
            id: `bond_${Date.now()}_${i}`,
            ownerId: ownerId, // Nowe pole identyfikujące właściciela
            issuerName: 'Skarb Państwa',
            type: `Skarbowa (${type})`,
            purchasePrice: 1000,
            faceValue: 1000,
            interestRate: interestRate,
            maturityDate: maturityDate,
            isStateBond: true
        });
    }

    if (ownerId === 'player') {
        logEvent(`Zakupiono ${quantity} szt. obligacji skarbowych.`, 'review');
        displayCash();
        openBankModal();
    } else {
        console.log(`[AI] ${buyer.name} kupił ${quantity} szt. obligacji skarbowych.`);
    }
}

function buyOtherBond(buyer, bondId, quantity) {
    const offerIndex = activeBonds.findIndex(b => b.id === bondId);
    if (offerIndex === -1) {
        if (buyer === 'player') alert("Ta oferta jest już nieaktualna.");
        return;
    }
    const offer = activeBonds[offerIndex];
    if (quantity <= 0 || isNaN(quantity)) return;

    if (quantity > offer.available) {
        if (buyer === 'player') alert("Nie ma wystarczającej liczby dostępnych obligacji w tej ofercie.");
        return;
    }

    const totalCost = offer.faceValue * quantity;
    const buyerCash = (buyer === 'player') ? playerCash : buyer.cash;

    if (buyerCash < totalCost) {
        if (buyer === 'player') alert("Nie masz wystarczająco gotówki.");
        return;
    }

    if (buyer === 'player') {
        playerCash -= totalCost;
    } else {
        buyer.cash -= totalCost;
    }
    
    offer.available -= quantity;

    if (offer.isRescueBond && offer.issuerSymbol) {
        const issuingStock = stocks.find(s => s.symbol === offer.issuerSymbol);
        if (issuingStock) {
            issuingStock.cash += totalCost; // Dodaj gotówkę do kasy firmy
            // Uaktualnij bilans firmy
            if (issuingStock.balanceSheet) {
                issuingStock.balanceSheet.assets += totalCost;
                // Można by tu dodać logikę zmniejszania długu, ale prościej jest dodać do aktywów
            }
            logEvent(`💸 ${buyer === 'player' ? 'Twoja inwestycja' : buyer.name} wsparła ${issuingStock.name} kwotą ${totalCost.toFixed(0)} PLN poprzez zakup obligacji ratunkowych.`);
        } else {
             console.warn(`Nie znaleziono spółki ${offer.issuerSymbol} emitującej obligacje ratunkowe ${bondId}`);
             governmentTreasury += totalCost; // Awaryjnie: przekaż do skarbu państwa
        }
    } else {
        // Dla zwykłych obligacji (lub jeśli błąd) - można przekazać do skarbu państwa lub "usunąć"
         governmentTreasury += totalCost;
    }

    if (offer.available <= 0) {
        activeBonds.splice(offerIndex, 1);
    }

    const maturityDate = Date.now() + (offer.durationMinutes * 60 * 1000 / currentSpeedMultiplier);
    const ownerId = (buyer === 'player') ? 'player' : buyer.id;

    for (let i = 0; i < quantity; i++) {
        allBonds.push({
            id: `bond_${Date.now()}_${i}`,
            ownerId: ownerId,
            issuerName: offer.issuerName,
            type: offer.type,
            purchasePrice: offer.faceValue,
            faceValue: offer.faceValue,
            interestRate: offer.interestRate,
            maturityDate: maturityDate,
            risk: offer.risk,
            isStateBond: false
        });
    }
    
    if (ownerId === 'player') {
        logEvent(`Zakupiono ${quantity} szt. obligacji od ${offer.issuerName}.`, 'review');
        displayCash();
        renderBondMarketInBank(); // Odśwież widok
    } else {
        console.log(`[AI] ${buyer.name} kupił ${quantity} szt. obligacji od ${offer.issuerName}.`);
    }
}

function checkBondMaturities() {
    const now = Date.now();
    for (let i = allBonds.length - 1; i >= 0; i--) {
        const bond = allBonds[i];
        if (now >= bond.maturityDate) {
            let payout = 0;
            let didDefault = false;

            if (bond.isStateBond || Math.random() > bond.risk) {
                payout = bond.faceValue * (1 + bond.interestRate);
            } else {
                didDefault = true;
                payout = bond.faceValue * getRandomInRange(0.1, 0.5);
            }
            
            // Znajdź właściciela i wypłać mu pieniądze
            if (bond.ownerId === 'player') {
                playerCash += payout;
                const profit = payout - bond.purchasePrice;
                if (didDefault) {
                    logEvent(`💥 Niewypłacalność! Obligacja od ${bond.issuerName} nie została spłacona w całości! Odzyskano tylko ${payout.toFixed(2)} PLN.`, 'error');
                } else {
                    logEvent(`💰 Obligacja od ${bond.issuerName} dojrzała. Otrzymujesz ${payout.toFixed(2)} PLN (zysk: ${profit.toFixed(2)} PLN).`, 'review');
                }
                displayCash();
                displayPortfolio();
            } else {
                const aiOwner = aiCompetitors.find(ai => ai.id === bond.ownerId);
                if (aiOwner) {
                    aiOwner.cash += payout;
                }
            }

            allBonds.splice(i, 1); // Usuń obligację z globalnej listy
        }
    }
}

function checkTBillAccess() {
    if (!playerHasTBillAccess && calculateNetWorth('player') >= 100000) {
        playerHasTBillAccess = true;
        logEvent("💰 Osiągnięto próg 100,000 PLN wartości netto! Odblokowano dostęp do aukcji bonów skarbowych w Banku Centralnym.", 'success');
        showToast("Odblokowano aukcje bonów skarbowych!", 'success');
        // Odśwież widok banku, jeśli jest otwarty
        if (document.getElementById('bank-modal').style.display === 'block') {
            openBankModal();
        }
    }
    // Sprawdź dostęp dla AI
    aiCompetitors.forEach(ai => {
        if (!ai.hasTBillAccess && calculateNetWorth(ai) >= 100000) {
            ai.hasTBillAccess = true;
            console.log(`[AI] ${ai.name} odblokował dostęp do aukcji bonów skarbowych.`);
        }
    });
}

function placeTBillBid(bidder, quantity, price) {
    if (!currentTBillAuction || Date.now() > currentTBillAuction.endTime) {
        if (bidder === 'player') alert("Aukcja nie jest aktywna.");
        return false;
    }
    if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0 || price >= 1000) {
        if (bidder === 'player') alert("Wprowadź poprawną ilość i cenę (poniżej 1000 PLN).");
        return false;
    }

    const bidderId = (bidder === 'player') ? 'player' : bidder.id;
    const bidderCash = (bidder === 'player') ? playerCash : bidder.cash;
    const totalCost = quantity * price;

    if (bidderCash < totalCost) {
        if (bidder === 'player') alert("Nie masz wystarczająco środków na złożenie tej oferty.");
        return false;
    }

    // Dodaj ofertę do listy
    currentTBillAuction.bids.push({ bidderId, quantity, price });

    if (bidder === 'player') {
        logEvent(`Złożono ofertę zakupu ${quantity} bonów skarbowych po ${price.toFixed(2)} PLN.`, 'review');
        showToast("Oferta złożona!", 'success');
        openBankModal(); // Odśwież widok banku
    } else {
        console.log(`[AI] ${bidder.name} złożył ofertę na ${quantity} bonów po ${price.toFixed(2)} PLN.`);
    }
    return true;
}

function resolveTBillAuction() {
    if (!currentTBillAuction) return;

    logEvent("🔔 Aukcja bonów skarbowych zakończona! Rozpoczyna się alokacja.", 'market');

    let remainingQuantity = currentTBillAuction.quantityAvailable;
    const bids = currentTBillAuction.bids;

    // Sortuj oferty od najwyższej ceny
    bids.sort((a, b) => b.price - a.price);

    // Przydzielaj bony
    for (const bid of bids) {
        if (remainingQuantity <= 0) break;

        const quantityToAllocate = Math.min(bid.quantity, remainingQuantity);
        const totalCost = quantityToAllocate * bid.price;

        let bidderObject = null;
        if (bid.bidderId === 'player') {
            bidderObject = 'player';
        } else {
            bidderObject = aiCompetitors.find(ai => ai.id === bid.bidderId);
        }

        if (!bidderObject) continue;

        const bidderCash = (bidderObject === 'player') ? playerCash : bidderObject.cash;

        // Sprawdź ponownie, czy stać licytanta (mógł wydać pieniądze)
        if (bidderCash >= totalCost) {
            // Pobierz pieniądze
            if (bidderObject === 'player') {
                playerCash -= totalCost;
            } else {
                bidderObject.cash -= totalCost;
            }

            // Dodaj bony do portfela
            const maturityDate = Date.now() + (5 * 60 * 1000 / currentSpeedMultiplier); // 5 minut
            for (let i = 0; i < quantityToAllocate; i++) {
                const newTBill = {
                    id: `tbil_${Date.now()}_${i}`,
                    ownerId: bid.bidderId,
                    purchasePrice: bid.price,
                    maturityDate: maturityDate,
                    isTBill: true
                };
                if (bid.bidderId === 'player') {
                    allTBills.push(newTBill); // Dodaj do globalnej listy, jeśli właścicielem jest gracz
                } else if (bidderObject.tBills) {
                    bidderObject.tBills.push(newTBill); // Dodaj do listy AI
                }
            }

            remainingQuantity -= quantityToAllocate;

            // Poinformuj gracza o wyniku
            if (bid.bidderId === 'player') {
                logEvent(`✅ Przydzielono Ci ${quantityToAllocate} bonów skarbowych po cenie ${bid.price.toFixed(2)} PLN.`, 'success');
                displayCash();
                displayPortfolio();
            } else {
                console.log(`[AI] ${bidderObject.name} wygrał ${quantityToAllocate} bonów po ${bid.price.toFixed(2)} PLN.`);
            }

        } else if (bid.bidderId === 'player') {
            logEvent(`⚠️ Twoja oferta na ${bid.quantity} bonów po ${bid.price.toFixed(2)} PLN została odrzucona z powodu braku środków!`, 'error');
        }
    }

    // Zakończ aukcję
    currentTBillAuction = null;
    logEvent("Alokacja bonów zakończona.", 'market');
    // Odśwież widok banku, jeśli jest otwarty
    if (document.getElementById('bank-modal').style.display === 'block') {
        openBankModal();
    }
}

function checkTBillMaturities() {
    const now = Date.now();
    const faceValue = 1000; // Stała wartość wykupu

    // Sprawdź bony gracza (nadal używamy allBonds)
    for (let i = allBonds.length - 1; i >= 0; i--) {
        const tBill = allBonds[i];
        // SCALONO: Sprawdzamy `isTBill` (z Twojej wersji) ORAZ `ownerId` (z obu wersji)
        if (tBill.isTBill && tBill.ownerId === 'player' && now >= tBill.maturityDate) {
            playerCash += faceValue;
            logEvent(`🪙 Bon skarbowy (zakup: ${tBill.purchasePrice.toFixed(2)} PLN) dojrzał. Otrzymujesz ${faceValue} PLN.`, 'review');
            allBonds.splice(i, 1); // Usuwamy z globalnej listy
            displayCash();
            displayPortfolio();
        }
    }

    // Sprawdź bony AI
    aiCompetitors.forEach(ai => {
        if (!ai.tBills) return; // Pomiń boty bez listy bonów (np. Market Maker)
        for (let i = ai.tBills.length - 1; i >= 0; i--) {
            const tBill = ai.tBills[i];
             // SCALONO: Sprawdzamy `isTBill` (z Twojej wersji)
            if (tBill.isTBill && now >= tBill.maturityDate) {
                ai.cash += faceValue;
                console.log(`[AI] Bon skarbowy ${ai.name} (zakup: ${tBill.purchasePrice.toFixed(2)}) dojrzał. Otrzymuje ${faceValue} PLN.`);
                ai.tBills.splice(i, 1);
            }
        }
    });
}

function runCentralBankAI() {
    // Decyzje podejmowane rzadziej (np. 15% szans co kwartał)
    if (Math.random() > 0.15) return;

    const avgHealth = stocks.filter(s=>!s.assetType).reduce((sum, s) => sum + s.financialHealth, 0) / stocks.filter(s=>!s.assetType).length;
    let interestRateChange = 0;
    let reserveRequirementChange = 0;
    const ceoTraits = centralBank.ceo.traits.map(t => t.name); // Pobierz nazwy cech

    // Analiza rynku
    const isOverheated = marketVolatilityIndex > 1.8 && avgHealth > 1;
    const isSlowdown = marketVolatilityIndex < 0.8 && avgHealth < -0.5;

    // Podstawowa decyzja na podstawie rynku
    if (isOverheated) { interestRateChange = 0.005; reserveRequirementChange = 0.01; }
    else if (isSlowdown) { interestRateChange = -0.005; reserveRequirementChange = -0.01; }

    // Modyfikacje na podstawie cech CEO
    if (ceoTraits.includes("Jastrząb")) interestRateChange += 0.003;
    if (ceoTraits.includes("Gołąb")) interestRateChange -= 0.003;
    if (ceoTraits.includes("Stabilizator")) { interestRateChange *= 0.2; reserveRequirementChange *= 0.2; } // Znacznie mniejsze zmiany
    if (ceoTraits.includes("Regulator")) reserveRequirementChange += 0.005;
    if (ceoTraits.includes("Deregulator")) reserveRequirementChange -= 0.005;
    if (ceoTraits.includes("Partyjniak") && Math.random() < 0.3) { // 30% szans na losową, nieuzasadnioną decyzję
        interestRateChange = getRandomInRange(-0.007, 0.007);
        reserveRequirementChange = getRandomInRange(-0.015, 0.015);
        logEvent("🏛️ Niespodziewana decyzja Prezesa BC! Zmiana polityki monetarnej niezgodna z trendami.", 'warning');
    }

    // Zastosuj zmiany
    if (Math.abs(interestRateChange) > 0.001 || Math.abs(reserveRequirementChange) > 0.001) {
        centralBank.baseInterestRate += interestRateChange;
        centralBank.reserveRequirement += reserveRequirementChange;

        // Ograniczenia
        centralBank.baseInterestRate = Math.max(0.005, Math.min(0.15, centralBank.baseInterestRate));
        centralBank.reserveRequirement = Math.max(0.05, Math.min(0.25, centralBank.reserveRequirement));

        logEvent(`🏛️ Bank Centralny zmienia politykę! Stopa bazowa: ${(centralBank.baseInterestRate * 100).toFixed(1)}%, Rezerwy: ${(centralBank.reserveRequirement * 100).toFixed(0)}%.`, 'market');
        updateInterestRates();
        showToast("Bank Centralny zmienił politykę monetarną!", 'default', 6000);
    }

    fundStateOwnedCompanies();
   
}

function generateCentralBankGovernor() {
    const isFemale = Math.random() < 0.3;
    const firstName = isFemale ? getRandomElement(femaleFirstNames) : getRandomElement(maleFirstNames);
    let lastName = getRandomElement(ceoLastNames);
    if (isFemale && lastName.endsWith('ski')) lastName = lastName.slice(0, -1) + 'a';
    else if (isFemale && lastName.endsWith('cki')) lastName = lastName.slice(0, -1) + 'a';

    const age = getRandomIntInRange(50, 70); // Prezesi BC są zwykle starsi
    const tenureQuarters = 0; // Kadencja liczona od teraz

    const governor = {
        name: `${firstName} ${lastName}`,
        age: age,
        tenure: tenureQuarters,
        traits: []
    };

    // Przypisz 1-2 cechy specyficzne dla BC
    const traitsPool = Object.values(centralBankGovernorTraits);
    const numTraits = Math.random() < 0.4 ? 2 : 1; // 40% szans na 2 cechy
    for (let i = 0; i < numTraits; i++) {
        let potentialTraits = traitsPool.filter(t => !governor.traits.some(assigned => assigned.name === t.name));
        if (potentialTraits.length === 0) break;
        // Prost Losowanie (bez rzadkości na razie dla uproszczenia)
        const chosenTrait = getRandomElement(potentialTraits);
        governor.traits.push({ name: chosenTrait.name, description: chosenTrait.description });
    }

    centralBank.ceo = governor;
    console.log(`[BC] Powołano nowego Prezesa Banku Centralnego: ${governor.name}`);
}

function fundStateOwnedCompanies() {
    const ceoTraits = centralBank.ceo.traits.map(t => t.name);
    let fundingChance = 0.1; // Bazowa szansa 10%

    if (ceoTraits.includes("Etatysta")) fundingChance += 0.2; // +20%
    if (ceoTraits.includes("Libertarianin")) fundingChance -= 0.08; // -8%

    if (Math.random() < fundingChance) {
        const stateOwnedCompanies = stocks.filter(s => s.isStateOwned && !s.isBankrupt && s.financialHealth < 1); // Celuj w te potrzebujące wsparcia
        if (stateOwnedCompanies.length === 0) return;

        const targetCompany = getRandomElement(stateOwnedCompanies);
        const fundingAmount = centralBank.funds * getRandomInRange(0.01, 0.03); // Finansowanie 1-3% funduszy BC

        if (centralBank.funds >= fundingAmount) {
            centralBank.funds -= fundingAmount;
            targetCompany.cash += fundingAmount; // Dodaj do gotówki spółki
            // Popraw bilans spółki
            if (targetCompany.balanceSheet) {
                targetCompany.balanceSheet.assets += fundingAmount;
                // Traktujemy to jako "dotację", zwiększa kapitał własny
                targetCompany.balanceSheet.retainedEarnings += fundingAmount;
            }
            targetCompany.financialHealth += 0.5; // Lekka poprawa kondycji
            if(targetCompany.financialHealth > 5) targetCompany.financialHealth = 5;

            logEvent(`🏛️ Bank Centralny zasila ${targetCompany.name} kwotą ${fundingAmount.toFixed(0)} PLN na rozwój!`, 'state');
        } else {
            console.log(`[BC Finansowanie] BC chciał wesprzeć ${targetCompany.name}, ale zabrakło środków.`);
        }
    }
}

function aiUpgradeAntitrustOffice() {
    if (antitrustOffice.level >= 5) {
        return; // Urząd jest już na maksymalnym poziomie
    }

    const upgradeCost = ANTITRUST_UPGRADE_COSTS[antitrustOffice.level];
    
    // Państwo decyduje się na ulepszenie, jeśli ma wystarczająco pieniędzy (np. 5x koszt)
    // i jest na to losowa szansa (np. 40% rocznie)
    if (governmentTreasury > (upgradeCost * 5) && Math.random() < 0.4) {
        
        governmentTreasury -= upgradeCost; // Państwo płaci ze swojego budżetu
        antitrustOffice.level++;

        // Zwiększ parametry urzędu (tak jak robił to gracz)
        antitrustOffice.analysisCapacity += 0.1; 
        antitrustOffice.accuracy += 0.12;       
        antitrustOffice.analysisCapacity = Math.min(1.0, antitrustOffice.analysisCapacity);
        antitrustOffice.accuracy = Math.min(1.0, antitrustOffice.accuracy);

        logEvent(`⚖️ Państwo inwestuje w Urząd Antymonopolowy! Osiągnięto poziom ${antitrustOffice.level}.`, 'state');
        showToast("Urząd Antymonopolowy został ulepszony przez rząd!", 'default');
        
        // Odśwież modal, jeśli gracz go akurat ogląda
        if (document.getElementById('state-modal')?.style.display === 'block') {
            updateStateModalContent();
        }
    }
}

function checkMonopolyStatus() {
    console.log("[Monopol] Sprawdzanie statusu monopolistów...");
    const allSectors = [...new Set(stocks.flatMap(s => s.sector))]; // Zbierz unikalne sektory

    // Najpierw zresetuj status dla wszystkich
    stocks.forEach(s => { if (s.isMonopolist) s.isMonopolist = false; });

    allSectors.forEach(sector => {
        // Znajdź aktywne, nie-zależne spółki w danym sektorze
        const companiesInSector = stocks.filter(s =>
            !s.assetType &&         // Nie specjalny typ
            !s.isBankrupt &&        // Nie bankrut
            !s.isSubsidiaryOf &&    // Nie zależna
            s.sector.includes(sector) // W danym sektorze
        );

        // Jeśli jest DOKŁADNIE jedna taka spółka, oznacz ją jako monopolistę
        if (companiesInSector.length === 1) {
            const monopolist = companiesInSector[0];
            monopolist.isMonopolist = true;
            logEvent(`👑 ${monopolist.name} (${monopolist.symbol}) uzyskał status monopolisty w sektorze ${sector}!`, 'market');
            console.log(`[Monopol] ${monopolist.symbol} jest monopolistą w ${sector}.`);
        }
    });
}

function checkPriceAlerts() {
    stocks.forEach(stock => {
        if (!stock.priceAlerts) return;

        // Sprawdź alert kupna (cena spada poniżej progu)
        if (stock.priceAlerts.buy !== null && stock.price <= stock.priceAlerts.buy) {
            showToast(`🔔 ALERT CENOWY: ${stock.name} osiągnął cenę zakupu ${stock.priceAlerts.buy.toFixed(2)} PLN!`, 'success', 7000);
            stock.priceAlerts.buy = null; // Wyłącz alert po aktywacji
        }

        // Sprawdź alert sprzedaży (cena rośnie powyżej progu)
        if (stock.priceAlerts.sell !== null && stock.price >= stock.priceAlerts.sell) {
            showToast(`🔔 ALERT CENOWY: ${stock.name} osiągnął cenę sprzedaży ${stock.priceAlerts.sell.toFixed(2)} PLN!`, 'error', 7000);
            stock.priceAlerts.sell = null; // Wyłącz alert po aktywacji
        }
    });
}