// economy.js - Makroekonomia, podatki, rynek obligacji

// --- Zmienne Globalne Ekonomii ---
let governmentTreasury = 1000000; // Skarbiec Państwa
let marketVolatilityIndex = 0; // Wskaźnik zmienności (WNR)
let exchangeCollapseState = {}; // Stan zwinięcia tabel w UI

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

// =================================================================================
// CYKL KONIUNKTURALNY I PROFILE SEKTORÓW
// Globalny cykl: ożywienie → ekspansja → przegrzanie → recesja (zmiana raz na kwartał).
// Każdy sektor reaguje na cykl z własną siłą (beta) i na stopy procentowe.
// =================================================================================

const COMPANY_INCOME_TAX_RATE = 0.19; // CIT od zysku przed opodatkowaniem (raport kwartalny)

// gdp: realna zmiana PKB w kwartale (ekspansja ≈ 3–4% rocznie). Wpływ na spółki liczy getGdpDriver()
// (audyt A4: wcześniej PKB w ekspansji dochodził do 7% r/r — skala przesunięta do napędu koniunktury).
const ECONOMY_PHASES = {
    recovery:    { name: 'Ożywienie',   gdp: [0.0022, 0.0055], length: [2, 4], peMult: 1.00, mood: 0.2,  next: 'expansion' },
    expansion:   { name: 'Ekspansja',   gdp: [0.0044, 0.0100], length: [3, 6], peMult: 1.10, mood: 0.5,  next: 'overheating' },
    overheating: { name: 'Przegrzanie', gdp: [0.0017, 0.0066], length: [1, 3], peMult: 1.20, mood: 0.3,  next: 'recession' },
    recession:   { name: 'Recesja',     gdp: [-0.0110, -0.0022], length: [2, 4], peMult: 0.85, mood: -0.6, next: 'recovery' }
};
const GDP_DRIVER_SCALE = 1 / 0.55;

/** Napęd koniunktury dla przychodów spółek (dawna skala gdpGrowth). */
function getGdpDriver() {
    return (Number(economyCycle?.gdpGrowth) || 0) * GDP_DRIVER_SCALE;
}

// beta: wrażliwość przychodów i wycen na cykl (1 = przeciętna, <1 defensywna, >1 cykliczna)
// rateSens: wrażliwość wyceny na stopy procentowe; pe: bazowe C/Z; margin: typowa marża EBITDA;
// growth: trend wzrostu przychodów rocznie; ps: typowa kapitalizacja / roczne przychody (kalibracja startowa);
// da: amortyzacja jako część przychodów.
const SECTOR_PROFILES = {
    'Technologia':          { beta: 1.3, rateSens: 1.2, pe: 22, margin: 0.28, growth: 0.08, ps: 3.5, da: 0.05 },
    'Gaming':               { beta: 1.4, rateSens: 1.0, pe: 20, margin: 0.25, growth: 0.07, ps: 3.0, da: 0.06 },
    'Medycyna':             { beta: 0.6, rateSens: 0.6, pe: 20, margin: 0.22, growth: 0.05, ps: 3.0, da: 0.05 },
    'Żywność':              { beta: 0.5, rateSens: 0.4, pe: 15, margin: 0.12, growth: 0.03, ps: 1.0, da: 0.03 },
    'Dobra konsumpcyjne':   { beta: 1.0, rateSens: 0.6, pe: 16, margin: 0.14, growth: 0.04, ps: 1.3, da: 0.03 },
    'Energia':              { beta: 0.8, rateSens: 0.9, pe: 12, margin: 0.25, growth: 0.02, ps: 1.5, da: 0.08 },
    'Chemia':               { beta: 1.2, rateSens: 0.7, pe: 13, margin: 0.16, growth: 0.03, ps: 1.1, da: 0.05 },
    'Przemysł':             { beta: 1.3, rateSens: 0.8, pe: 13, margin: 0.14, growth: 0.03, ps: 1.0, da: 0.05 },
    'Budowlany':            { beta: 1.5, rateSens: 1.3, pe: 11, margin: 0.10, growth: 0.03, ps: 0.7, da: 0.03 },
    'Nieruchomości':        { beta: 1.4, rateSens: 1.6, pe: 14, margin: 0.35, growth: 0.03, ps: 4.0, da: 0.10 },
    'Bankowość':            { beta: 1.1, rateSens: -0.3, pe: 11, margin: 0.40, growth: 0.03, ps: 2.5, da: 0.02 },
    'Bankowość Komercyjna': { beta: 1.1, rateSens: -0.3, pe: 11, margin: 0.40, growth: 0.03, ps: 2.5, da: 0.02 },
    'Finanse':              { beta: 1.3, rateSens: 0.5, pe: 13, margin: 0.30, growth: 0.04, ps: 2.5, da: 0.02 },
    'Finanse Konsumenckie': { beta: 1.2, rateSens: 0.8, pe: 10, margin: 0.30, growth: 0.04, ps: 2.0, da: 0.02 },
    'Usługi':               { beta: 0.9, rateSens: 0.5, pe: 16, margin: 0.15, growth: 0.04, ps: 1.4, da: 0.03 },
    'Turystyka':            { beta: 1.5, rateSens: 0.8, pe: 15, margin: 0.15, growth: 0.04, ps: 1.5, da: 0.06 },
    'Media':                { beta: 1.1, rateSens: 0.6, pe: 14, margin: 0.18, growth: 0.02, ps: 1.8, da: 0.04 },
    'Logistyka':            { beta: 1.2, rateSens: 0.7, pe: 14, margin: 0.12, growth: 0.04, ps: 1.0, da: 0.06 },
    'Transport':            { beta: 1.2, rateSens: 0.7, pe: 13, margin: 0.14, growth: 0.03, ps: 1.0, da: 0.07 },
    'Badania':              { beta: 0.9, rateSens: 0.8, pe: 25, margin: 0.20, growth: 0.07, ps: 4.0, da: 0.05 }
};

const DEFAULT_SECTOR_PROFILE = { beta: 1.0, rateSens: 0.7, pe: 14, margin: 0.15, growth: 0.03, ps: 1.5, da: 0.04 };

/** Profil spółki: średnia profili jej sektorów. */
function getSectorProfile(stock) {
    const sectors = Array.isArray(stock?.sector) ? stock.sector : [];
    const profiles = sectors.map(sector => SECTOR_PROFILES[sector]).filter(Boolean);
    if (profiles.length === 0) return { ...DEFAULT_SECTOR_PROFILE };

    const result = {};
    for (const key of Object.keys(DEFAULT_SECTOR_PROFILE)) {
        result[key] = profiles.reduce((sum, profile) => sum + profile[key], 0) / profiles.length;
    }
    return result;
}

let economyCycle = createEconomyCycle('expansion');

// Nastrój rynku dla górnego paska (ui-update.js); ustawiany z cyklu.
let marketTrend = 'neutral';

function createEconomyCycle(phase = 'expansion') {
    const def = ECONOMY_PHASES[phase];
    return {
        phase,
        quartersInPhase: 0,
        phaseLength: getRandomIntInRange(def.length[0], def.length[1]),
        gdpGrowth: (def.gdp[0] + def.gdp[1]) / 2,   // zmiana PKB w kwartale
        index: 60,                                    // wskaźnik koniunktury 0–100
        history: []                                   // ostatnie kwartały: { phase, gdpGrowth, index }
    };
}

function getEconomyPhaseInfo() {
    return ECONOMY_PHASES[economyCycle.phase] || ECONOMY_PHASES.expansion;
}

/** Przesuwa cykl o jeden kwartał (pętla kwartalna, przed raportami spółek). */
function advanceEconomyCycle() {
    const cycle = economyCycle;
    cycle.quartersInPhase++;

    if (cycle.quartersInPhase >= cycle.phaseLength) {
        const previous = cycle.phase;
        cycle.phase = ECONOMY_PHASES[previous].next;
        cycle.quartersInPhase = 0;
        const def = ECONOMY_PHASES[cycle.phase];
        cycle.phaseLength = getRandomIntInRange(def.length[0], def.length[1]);

        logEvent(`📊 KONIUNKTURA: gospodarka wchodzi w fazę „${def.name}” (wcześniej: ${ECONOMY_PHASES[previous].name}).`, 'market');
    }

    const def = getEconomyPhaseInfo();
    cycle.gdpGrowth = getRandomInRange(def.gdp[0], def.gdp[1]);

    // Wskaźnik koniunktury: wygładzona reakcja na PKB (0 = głęboka recesja, 100 = boom).
    const target = Math.max(0, Math.min(100, 50 + getGdpDriver() * 2500));
    cycle.index = Math.round(cycle.index * 0.5 + target * 0.5);

    cycle.history.push({ phase: cycle.phase, gdpGrowth: cycle.gdpGrowth, index: cycle.index });
    if (cycle.history.length > 16) cycle.history.shift();

    updateMarketTrendFromCycle();
}

function updateMarketTrendFromCycle() {
    const index = economyCycle.index;
    if (index >= 75) marketTrend = 'bullish_strong';
    else if (index >= 58) marketTrend = 'bullish_moderate';
    else if (index >= 42) marketTrend = 'neutral';
    else if (index >= 25) marketTrend = 'bearish_moderate';
    else marketTrend = 'bearish_strong';
}

/** Mnożnik C/Z dla spółki: faza cyklu (wg bety sektora) i poziom stóp procentowych. */
function getValuationMultiplier(stock) {
    const profile = getSectorProfile(stock);
    const phaseMult = getEconomyPhaseInfo().peMult;
    const cycleMult = 1 + profile.beta * (phaseMult - 1);
    const baseRate = Number(centralBank?.baseInterestRate) || 0.05;
    const rateMult = 1 - profile.rateSens * (baseRate - 0.05) * 4;
    const sectorMult = typeof getSectorValuationFactor === 'function' ? getSectorValuationFactor(stock) : 1; // cykl sektora (macro.js)
    const interest = typeof getAristocratValuationFactor === 'function' ? getAristocratValuationFactor(stock) : 1; // zainteresowanie arystokratą
    const projects = typeof getSpecialProjectValuation === 'function' ? getSpecialProjectValuation(stock) : 1; // projekty specjalne
    return Math.max(0.4, Math.min(1.8, cycleMult * rateMult * sectorMult * interest * projects));
}

/** Szansa na zdarzenie pozytywne zależnie od fazy (eventy rynkowe). */
function getCyclePositiveEventBias() {
    // Łagodna przewaga: zdarzenia rynkowe są częste (co 45 s gry) i silne (3–8%), więc mocniejsze
    // przechylenie wypychałoby ceny daleko od wartości godziwej. Recesja ~0.46, ekspansja ~0.53.
    return 0.5 + getEconomyPhaseInfo().mood * 0.06;
}

/** Apetyt spółek na nowe inwestycje (mnożnik szansy). */
function getCycleInvestmentAppetite() {
    switch (economyCycle.phase) {
        case 'recession': return 0.5;
        case 'recovery': return 0.9;
        case 'expansion': return 1.3;
        case 'overheating': return 1.1;
        default: return 1;
    }
}

// Zmienne czasowe podatków
let WEALTH_TAX_INTERVAL; // = BASE_DELAYS.quarterly * 4; 
let nextWealthTaxTime = 0; 


const CANDLE_INTERVAL = 15 * 1000; 

// Parametry ruchu cen (na tik = 1 s gry):
// szum ~0,2% × zmienność; powrót do wartości godziwej z półokresem ok. 1 godziny gry;
// nastrój rynku wg fazy cyklu (ekspansja ≈ +0,7% na godzinę dla bety 1).
const PRICE_NOISE_PER_TICK = 0.002;
const PRICE_MEAN_REVERSION_PER_TICK = 0.0003; // audyt A4: kursy nie nadążały za wyceną w cyklu
const MARKET_MOOD_PER_TICK = 0.000004;

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

        // Dywidendowy arystokrata: stabilność i przyrost (dividends.js)
        if (stock.isDividendAristocrat) {
            volatilityModifier -= ARISTOCRAT_BONUS.stability;
            priceGrowthModifier += ARISTOCRAT_BONUS.growth;
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


        // Inicjalizacja świec
        if (!stock.currentCandle || !stock.candlestickHistory) {
            stock.candlestickHistory = [];
            stock.lineHistory = [];
            const initialPrice = stock.price > 0 ? stock.price : 0.01;
            stock.currentCandle = { time: now, open: initialPrice, high: initialPrice, low: initialPrice, close: initialPrice };
        }

        // --- Ruch ceny jako zmiana PROCENTOWA ---
        // Δ% = szum + powrót do wartości godziwej + nastrój rynku + dryf (fazy, CEO, M&A) + boosty
        let effectiveVolatility = stock.volatilityFactor * volatilityModifier;
        if (isVolatilityCapped) {
            effectiveVolatility = Math.max(0.5, Math.min(effectiveVolatility, 3.0));
        }

        const price = stock.price > 0 ? stock.price : 0.01;
        // Szum ograniczony do zmienności 3 (bardzo zmienne spółki śmieciowe nie skaczą o kilkadziesiąt % na minutę).
        const noise = gaussianRandom() * PRICE_NOISE_PER_TICK * Math.min(3, effectiveVolatility) * marketModifier;

        let changePct = noise;

        if (stock.marketBehavior && stock.marketBehavior.phase === 'ipo_boost' && now < stock.marketBehavior.endTime) {
            changePct = getRandomInRange(0.002, 0.005) * Math.min(3, effectiveVolatility);
        } else {
            if (stock.marketBehavior && now >= stock.marketBehavior.endTime) {
                logEvent(`📈 IPO boost phase for ${stock.name} has ended.`);
                stock.marketBehavior = null;
            }

            if (stock.activePositiveBoostUntil && now < stock.activePositiveBoostUntil) {
                changePct = getRandomInRange(0.002, 0.005) * Math.min(3, effectiveVolatility);
            } else if (stock.activeNegativeBoostUntil && now < stock.activeNegativeBoostUntil) {
                changePct = -getRandomInRange(0.002, 0.005) * Math.min(3, effectiveVolatility);
            } else {
                if (stock.activePositiveBoostUntil && now >= stock.activePositiveBoostUntil) stock.activePositiveBoostUntil = null;
                if (stock.activeNegativeBoostUntil && now >= stock.activeNegativeBoostUntil) stock.activeNegativeBoostUntil = null;

                // Powrót do wartości godziwej (tylko spółki z modelem fundamentalnym).
                if (!stock.fundamentals && stock.balanceSheet && hasValuationAnchor(stock)) initializeFundamentals(stock);
                const fairValue = Number(stock.fundamentals?.fairValue);
                if (fairValue > 0) {
                    const gap = Math.max(-0.9, Math.min(3, fairValue / price - 1));
                    changePct += PRICE_MEAN_REVERSION_PER_TICK * gap;
                }

                // Nastrój rynku wg fazy cyklu i bety sektora.
                changePct += MARKET_MOOD_PER_TICK * getEconomyPhaseInfo().mood * getSectorProfile(stock).beta;
            }
        }

        // Dryf z fazy spółki, cech CEO i efektów M&A (wcześniej: 0.00005 × odchylenie modyfikatora).
        let drift = 0.00005 * (priceGrowthModifier - 1.0);
        if (stock.isMonopolist) drift *= 1.5;
        changePct += drift;

        stock.price = price * (1 + Math.max(-0.2, Math.min(0.2, changePct)));
        if (stock.price <= 0.01) {
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

    // ETF-y: cena = wartość portfela / jednostki (etf.js)
    if (typeof updateEtfPrices === 'function') updateEtfPrices();
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

    // Zapisz historię wartości indeksów (do wskaźnika koniunktury)
    marketIndexes.forEach(idx => {
        if (idx.value > 0) {
            idx.priceHistory.push(idx.value);
            if (idx.priceHistory.length > 20) idx.priceHistory.shift();
        }
    });
}

/** Wartość netto: gracz = aktywa funduszu; bot/inny podmiot = gotówka + portfel + obligacje i bony. */
function calculateNetWorth(entity) {
    if (entity === 'player') return typeof playerFund !== 'undefined' && playerFund ? getFundAssets() : (Number(playerCash) || 0);
    let value = Number(entity?.cash) || 0;
    for (const symbol in entity?.portfolio || {}) {
        const holding = entity.portfolio[symbol];
        if (holding.assetType === 'Startup') {
            value += Number(holding.investedAmount) || 0; // uproszczona wycena startupu
            continue;
        }
        const marketData = stocks.find(s => s.symbol === symbol) || etfs.find(e => e.symbol === symbol) || marketIndexes.find(i => i.id === symbol);
        if (marketData) value += (marketData.price || marketData.value || 0) * holding.shares;
    }
    value += allBonds.filter(bond => bond.ownerId === entity.id).reduce((sum, bond) => sum + (typeof getBondValue === 'function' ? getBondValue(bond) : (bond.faceValue || 1000)), 0);
    value += (entity.tBills || []).length * 1000;
    return value;
}

// --- PODATKI (Poprawiona funkcja Wealth Tax) ---
function processWealthTax() {
    // Tworzymy listę wszystkich podmiotów do opodatkowania (Gracz + AI)
    // Gracz zarządza funduszem klientów — podatek od bogactwa go nie obejmuje (etap B).
    const entities = [
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
    // Gotówka funduszu to pieniądze klientów — gracz nie płaci podatku miejskiego od gotówki (etap B).
    const playerCityTax = 0;
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

    // Spółki nie płacą już tygodniowego podatku od gotówki — płacą CIT od zysku przy raporcie
    // kwartalnym (COMPANY_INCOME_TAX_RATE, companies.js → processFinancialReports).

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

    if (typeof applyAntitrustPenalties === 'function') applyAntitrustPenalties(); // city.js
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

// --- Dochody z nieruchomości ---
// Wywoływane co tydzień gry. Rok gry = 4 kwartały × 5 tygodni = 20 tygodni.
// building.income  — roczna stopa dochodu od wartości księgowej,
// building.maintenance — koszt utrzymania na kwartał.
// Wynik trafia do gotówki i bilansu od razu, a do raportu kwartalnego jako pozycja okresu.
const WEEKS_PER_YEAR = 20;
const WEEKS_PER_QUARTER = 5;

function processBuildingIncome() {
    stocks.forEach(company => {
        const buildings = company?.portfolio?.buildings;
        if (!Array.isArray(buildings) || buildings.length === 0 || company.isBankrupt) return;

        let totalIncome = 0;
        let totalMaintenance = 0;

        buildings.forEach(building => {
            if (building.status === 'unfinished') return;
            const bookValue = Number(building.bookValue ?? building.value) || 0;
            totalIncome += bookValue * (Number(building.income) || 0) / WEEKS_PER_YEAR;
            totalMaintenance += (Number(building.maintenance) || 0) / WEEKS_PER_QUARTER;
        });

        const netIncome = totalIncome - totalMaintenance;
        if (Math.abs(netIncome) < 0.01) return;

        if (netIncome < 0 && (Number(company.cash) || 0) < -netIncome) {
            logEvent(`🚨 ${company.name} nie ma środków na utrzymanie nieruchomości! Zdrowie finansowe spada.`, 'error');
            company.financialHealth -= 0.1;
            return;
        }

        adjustCompanyCash(company, netIncome);
        adjustBalanceSheet(company, { assets: netIncome, retainedEarnings: netIncome });
        postPeriodEntry(company, nextSimulationId(`property_${company.symbol}`), { propertyIncome: netIncome });
        recordPayment(
            netIncome > 0 ? 'external:najemcy_i_klienci' : company,
            netIncome > 0 ? company : 'external:utrzymanie_nieruchomosci',
            Math.abs(netIncome),
            netIncome > 0 ? 'Dochód netto z nieruchomości' : 'Utrzymanie nieruchomości'
        );
    });
}
