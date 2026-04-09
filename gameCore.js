// gameCore.js - Rdzeń silnika gry, stałe i helpery


const BANK_TYPES = {
    INVESTMENT: 'Inwestycyjny',
    CORPORATE: 'Korporacyjny',
    UNIVERSAL: 'Uniwersalny',
    INTERNATIONAL: 'Międzynarodowy',
    COOPERATIVE: 'Spółdzielczy',
    INTERNET: 'Internetowy (e-bank)',
    MORTGAGE: 'Hipoteczny'
};
// Diagnostic
if (typeof window !== 'undefined' && window.console) {
    console.log('[diag] gameCore.js loaded');
}

// --- Zmienne Stanu Gry ---
let isGamePaused = true;
let currentlyDisplayedChartSymbol = null;
let playerAccessLevel = 0; // Poziom dostępu do giełd
let currentSortState = 'none'; // 'none', 'price_asc', 'price_desc'
let isAutoRepayEnabled = true;
let lastWeekStockPrices = {};


// --- Stałe Czasowe ---
const BASE_DELAYS = {
    stockUpdate: 1000, // 1 sekunda
    weekly: 60000,     // 1 minuta
    quarterly: 300000, // 5 minut
    event: 45000       // 45 sekund
};

const SHARE_LIMIT_RANGES = {
    'JUNK': { min: 800, max: 1200 },
    'BRONZE': { min: 8000, max: 12000 },
    'SILVER': { min: 40000, max: 60000 },
    'GOLD': { min: 80000, max: 120000 },
    'PLATINUM': { min: 800000, max: 1200000 }
};

const REPUTATION_LEVELS = {
    TRAGIC: -75,
    NEGATIVE: -16,
    NEUTRAL: 30,
    CORRECT: 49,
    POSITIVE: 89,
    FRIENDLY: 100
};

const PASSIVE_WORK_INTERVAL = 90000;
const PREMIUM_SUBSCRIPTION_COST = 5000;
const PREMIUM_SUBSCRIPTION_DURATION = 1000 * 60 * 60 * 24 * 7; 
const BLACK_PR_BASE_RISK = 0.10; 
const BLACK_PR_RISK_INCREASE = 0.025; 

// --- Funkcje Pomocnicze (Helpers) ---

function getRandomIntInRange(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomElement(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
}

// Funkcja pauzy (używana przez UI)
function togglePauseGame() {
    isGamePaused = !isGamePaused;
    const pauseButton = document.getElementById('pause-game-btn');
    if (pauseButton) {
        if (isGamePaused) {
            pauseButton.textContent = '▶️ Wznów';
            pauseButton.style.backgroundColor = '#28a745';
            console.log('--- GRA ZAPAUZOWANA ---');
        } else {
            pauseButton.textContent = '⏸️ Pauza';
            pauseButton.style.backgroundColor = '';
            console.log('--- GRA WZNOWIONA ---');
        }
    }
}

function togglePriceSort() {
    console.log(`Przełączanie sortowania. Obecny stan: ${currentSortState}`); // Log diagnostyczny
    if (currentSortState === 'none') {
        currentSortState = 'price_asc';
    } else if (currentSortState === 'price_asc') {
        currentSortState = 'price_desc';
    } else { // currentSortState === 'price_desc'
        currentSortState = 'none'; // Wróć do domyślnego sortowania wg giełdy
    }
    console.log(`Nowy stan sortowania: ${currentSortState}`); // Log diagnostyczny
    displayStocks(getCurrentInputValues()); // Odśwież tabelę z nowym sortowaniem
}

function initializeGameTimeRelatedVariables() {
    // ---> Inicjalizacja wartości TUTAJ <---
    WEALTH_TAX_INTERVAL = BASE_DELAYS.quarterly * 4;
    nextWealthTaxTime = Date.now() + WEALTH_TAX_INTERVAL; // Ustawienie początkowe
    console.log(`[INIT] WEALTH_TAX_INTERVAL ustawiono na: ${WEALTH_TAX_INTERVAL} ms`);
    // Tutaj można inicjalizować inne zmienne czasowe, jeśli są potrzebne
}

// --- Zmienne dla sektora budowlanego ---
let activeTenders = [];
let constructionProjects = [];
let constructionConsortia = [];

// ============================================
// INICJALIZACJA STATYSTYK BUDOWLANYCH
// ============================================

/**
 * Inicjalizuje constructionStats dla wszystkich spółek budowlanych
 * Wywołane przy starcie gry
 */
function initializeAllConstructionStats() {
    stocks.forEach(stock => {
        if (stock.sector && stock.sector.includes('Budowlany')) {
            initConstructionStats(stock);
        }
    });
    console.log('[Construction] All construction companies initialized with project limits');
}

// --- Funkcje dla przetargów budowlanych ---

function createTender(buildingType, clientCompany, budget, criteriaWeights) {
    const tenderId = 'tender_' + Date.now() + '_' + Math.random();
    const tender = {
        id: tenderId,
        buildingType: buildingType,
        clientCompany: clientCompany,
        budget: budget,
        criteriaWeights: criteriaWeights, // { price, time, experience, prestige, exchangeLevel, isStateOwned } - sum = 1.0
        bids: [],
        status: 'open', // open, closed, awarded, completed, cancelled
        createdAt: Date.now(),
        deadline: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 dni
        awardedAt: null,
        winner: null,
        startDate: null,
        completionDate: null
    };
    activeTenders.push(tender);
    logEvent(`🏗️ Przetarg na ${buildingType.name} ogłoszony przez ${clientCompany.name}!`, 'construction');
    return tenderId;
}

function bidOnTender(tenderId, bidderCompany, bidPrice, bidTime, bidExperience) {
    const tender = activeTenders.find(t => t.id === tenderId);
    if (!tender || tender.status !== 'open') return false;
    
    // Check if bidder has capacity for more projects
    if (bidderCompany.constructionStats &&
        bidderCompany.constructionStats.currentProjects >= bidderCompany.constructionStats.maxProjects) {
        logEvent(`❌ ${bidderCompany.name} osiągnął limit projektów (${bidderCompany.constructionStats.maxProjects}) i nie może składać ofert.`, 'construction');
        return false;
    }
    
    const bid = {
        bidder: bidderCompany,
        price: bidPrice,
        time: bidTime,
        experience: bidExperience,
        submittedAt: Date.now()
    };
    tender.bids.push(bid);
    logEvent(`📝 ${bidderCompany.name} złożyła ofertę na przetarg ${tender.buildingType.name}.`, 'construction');
    return true;
}

function awardTender(tenderId) {
    const tender = activeTenders.find(t => t.id === tenderId);
    if (!tender || tender.status !== 'open') return;
    
    tender.status = 'closed';
    if (tender.bids.length === 0) {
        logEvent(`❌ Przetarg na ${tender.buildingType.name} zakończony bez ofert.`, 'construction');
        return;
    }
    
    let bestBid = null;
    let bestScore = -1;
    
    tender.bids.forEach(bid => {
        const score = calculateBidScore(bid, tender);
        if (score > bestScore) {
            bestScore = score;
            bestBid = bid;
        }
    });
    
    if (bestBid) {
        // Check again if winner still has capacity (might have changed since bidding)
        if (bestBid.bidder.constructionStats &&
            bestBid.bidder.constructionStats.currentProjects >= bestBid.bidder.constructionStats.maxProjects) {
            logEvent(`❌ ${bestBid.bidder.name} osiągnął limit projektów. Przetarg anulowany.`, 'construction');
            tender.status = 'cancelled';
            return;
        }
        
        tender.status = 'awarded';
        tender.winner = bestBid;
        tender.awardedAt = Date.now();
        tender.startDate = Date.now();
        startConstructionProject(tender, bestBid);
        // Zwiększ licznik wygranych przetargów
        bestBid.bidder.constructionStats.wonTenders = (bestBid.bidder.constructionStats.wonTenders || 0) + 1;
        logEvent(`🏆 ${bestBid.bidder.name} wygrała przetarg na ${tender.buildingType.name}!`, 'construction');
    }
}

function calculateBidScore(bid, tender) {
    const weights = tender.criteriaWeights;
    let score = 0;
    
    // Normalize weights to ensure they sum to 1.0
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const norm = totalWeight > 0 ? 1.0 / totalWeight : 1.0;
    
    // Cena: niższa cena lepsza, normalizowana do 0-100
    const priceRatio = bid.price / tender.budget;
    const priceScore = Math.max(0, 100 * (1 - priceRatio)); // 100% if price=0, 0% if price=budget
    score += priceScore * weights.price * norm;
    
    // Czas: krótszy czas lepszy
    const timeRatio = bid.time / tender.buildingType.duration;
    const timeScore = Math.max(0, 100 * (1 - timeRatio)); // 100% if time=0, 0% if time=duration
    score += timeScore * weights.time * norm;
    
    // Doświadczenie: wyższe lepsze (cap at 100)
    const expScore = Math.min(100, bid.experience * 10);
    score += expScore * weights.experience * norm;
    
    // Prestiż: wyższy lepszy (reputation * 10, cap at 100)
    const prestigeScore = Math.min(100, (bid.bidder.reputation || 0) * 10);
    score += prestigeScore * weights.prestige * norm;
    
    // Poziom giełdy: wyższy lepszy
    const exchangeLevels = { 'JUNK': 1, 'BRONZE': 2, 'SILVER': 3, 'GOLD': 4, 'PLATINUM': 5 };
    const exchangeScore = (exchangeLevels[bid.bidder.exchange] || 1) * 20; // 20, 40, 60, 80, 100
    score += exchangeScore * weights.exchangeLevel * norm;
    
    // Państwowość: jeśli klient państwowy, premiuj państwowe firmy
    if (tender.clientCompany.isStateOwned && bid.bidder.isStateOwned) {
        score += 100 * weights.isStateOwned * norm;
    }
    
    return Math.max(0, score); // Ensure non-negative
}

function startConstructionProject(tender, winningBid) {
    const project = {
        id: 'project_' + Date.now(),
        tender: tender,
        builder: winningBid.bidder,
        startTime: Date.now(),
        duration: winningBid.time,
        plannedCompletionDate: Date.now() + winningBid.time * 24 * 60 * 60 * 1000, // planned in ms
        cost: winningBid.price,
        progress: 0,
        status: 'in_progress',
        delays: 0,
        delayReason: null,
        events: []
    };
    constructionProjects.push(project);
    winningBid.bidder.constructionStats.currentProjects++;
    tender.startDate = Date.now();
    logEvent(`🚧 Rozpoczęto budowę ${tender.buildingType.name} przez ${winningBid.bidder.name}.`, 'construction');
}

function processConstructionProjects() {
    constructionProjects.forEach(project => {
        if (project.status === 'in_progress') {
            const elapsed = (Date.now() - project.startTime) / (1000 * 60 * 60 * 24); // dni
            const baseProgress = elapsed / project.duration;
            
            // Experience bonus: 1% per point, capped at 50% (max 500 exp)
            const expBonus = Math.min(0.5, project.builder.constructionStats.experience * 0.01);
            
            // Technology bonuses from researched techs
            let techBonus = 0;
            if (project.builder.research && project.builder.research.unlockedTechs) {
                // Check for construction-specific techs that reduce build time
                const smartConstruction = project.builder.research.unlockedTechs.includes('BUILDING_SMART_CONSTRUCTION_1');
                const prefabTech = project.builder.research.unlockedTechs.includes('BUILDING_PREFAB_1');
                if (smartConstruction) techBonus += 0.01; // +1%
                if (prefabTech) techBonus += 0.005; // +0.5%
            }
            
            const totalBonus = expBonus + techBonus;
            project.progress = Math.min(1, baseProgress * (1 + totalBonus));
            
            // Random events affecting build time
            if (Math.random() < 0.05) { // 5% chance for positive event
                const acceleration = 7; // 1 week acceleration
                project.duration = Math.max(1, project.duration - acceleration);
                project.events.push({
                    type: 'positive',
                    description: 'Przyspieszenie budowy dzięki optymalizacji procesu',
                    time: Date.now()
                });
                logEvent(`⚡ Przyspieszenie budowy ${project.tender.buildingType.name} przez ${project.builder.name}.`, 'construction');
            }
            
            if (Math.random() < 0.05) { // 5% chance for negative event
                const delay = 7 + Math.floor(Math.random() * 7); // 1-2 weeks delay
                project.duration += delay;
                project.events.push({
                    type: 'negative',
                    description: 'Opóźnienie z powodu problemów z zaopatrzeniem',
                    time: Date.now()
                });
                logEvent(`⏳ Dodatkowe opóźnienie w budowie ${project.tender.buildingType.name} przez ${project.builder.name}.`, 'construction');
            }
            
            // Inspection event: 3% chance, pauses progress for 1 week, then result
            if (Math.random() < 0.03 && !project.inspectionPending) {
                project.inspectionPending = true;
                project.inspectionEndTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 1 week
                project.events.push({
                    type: 'inspection',
                    description: 'Inspekcja jakości w toku - budowa wstrzymana na 1 tydzień',
                    time: Date.now()
                });
                logEvent(`🔍 Inspekcja jakości dla ${project.tender.buildingType.name} przez ${project.builder.name}. Budowa wstrzymana.`, 'construction');
            }
            
            // Check if inspection is complete
            if (project.inspectionPending && Date.now() >= project.inspectionEndTime) {
                project.inspectionPending = false;
                const success = Math.random() < 0.7; // 70% success
                if (success) {
                    // Acceleration
                    project.duration = Math.max(1, project.duration - 7);
                    project.events.push({
                        type: 'positive',
                        description: 'Inspekcja pomyślna - przyspieszenie budowy o 1 tydzień',
                        time: Date.now()
                    });
                    logEvent(`✅ Inspekcja pomyślna dla ${project.tender.buildingType.name} - przyspieszenie budowy.`, 'construction');
                } else {
                    // Penalty: 50% financial penalty, 50% delay
                    if (Math.random() < 0.5) {
                        const fine = 0.05 * project.cost;
                        project.builder.cash -= fine;
                        project.events.push({
                            type: 'negative',
                            description: `Inspekcja niepomyślna - kara finansowa ${fine.toLocaleString()}`,
                            time: Date.now()
                        });
                        logEvent(`💰 Kara za niepomyślną inspekcję: ${project.builder.name} płaci ${fine.toLocaleString()}.`, 'construction');
                    } else {
                        project.duration += 14; // 2 weeks delay
                        project.events.push({
                            type: 'negative',
                            description: 'Inspekcja niepomyślna - opóźnienie budowy o 2 tygodnie',
                            time: Date.now()
                        });
                        logEvent(`⏳ Opóźnienie za niepomyślną inspekcję dla ${project.tender.buildingType.name}.`, 'construction');
                    }
                }
            }
            
            // Delay system: base 5% chance per week, reduced by experience
            const baseDelayChance = 0.05;
            const expDelayReduction = project.builder.constructionStats.experience * 0.0005; // 0.05% per exp point
            const delayChance = Math.max(0.01, baseDelayChance - expDelayReduction);
            
            if (Math.random() < delayChance) {
                project.delays++;
                project.duration += 7; // +7 days
                
                // Determine delay reason
                const reasons = [
                    "brak materiałów",
                    "pogoda nie sprzyja",
                    "awaria sprzętu",
                    "problemy z dostawami",
                    "kontrola jakości"
                ];
                project.delayReason = reasons[Math.floor(Math.random() * reasons.length)];
                
                logEvent(`⏳ Opóźnienie w budowie ${project.tender.buildingType.name} (${project.delayReason}) przez ${project.builder.name}.`, 'construction');
            }
            
            if (project.progress >= 1) {
                completeConstructionProject(project);
            }
        }
    });
}

function completeConstructionProject(project) {
    project.status = 'completed';
    project.completionDate = Date.now();
    project.builder.constructionStats.currentProjects--;
    project.builder.constructionStats.experience += 1; // Zwiększ doświadczenie
    
    // Oblicz kary za opóźnienie lub premie za wcześniejsze ukończenie
    const weeksLate = Math.max(0, (project.completionDate - project.plannedCompletionDate) / (7 * 24 * 60 * 60 * 1000));
    const weeksEarly = Math.max(0, (project.plannedCompletionDate - project.completionDate) / (7 * 24 * 60 * 60 * 1000));
    
    let penalty = 0;
    let bonus = 0;
    
    if (weeksLate > 0) {
        penalty = weeksLate * 0.1 * project.cost; // 10% kosztów za każdy tydzień opóźnienia
        project.builder.cash -= penalty;
        logEvent(`💸 Kara za opóźnienie: ${project.builder.name} płaci ${penalty.toLocaleString()} za ${weeksLate.toFixed(1)} tygodni opóźnienia.`, 'construction');
    } else if (weeksEarly > 0) {
        bonus = weeksEarly * 0.05 * project.cost; // 5% kosztów za każdy tydzień wcześniej
        project.builder.cash += bonus;
        logEvent(`🎉 Premia za wcześniejsze ukończenie: ${project.builder.name} otrzymuje ${bonus.toLocaleString()} za ${weeksEarly.toFixed(1)} tygodni wcześniej.`, 'construction');
    }
    
    // Płatność
    const payment = project.cost;
    if (project.tender.clientCompany && project.tender.clientCompany.cash >= payment) {
        project.tender.clientCompany.cash -= payment;
        project.builder.cash += payment;
    } else {
        logEvent(`⚠️ ${project.tender.clientCompany.name} nie ma wystarczającej gotówki na zapłatę!`, 'construction');
    }
    
    // Dodaj budynek do portfela klienta
    if (project.tender.clientCompany) {
        if (!project.tender.clientCompany.portfolio) project.tender.clientCompany.portfolio = {};
        if (!project.tender.clientCompany.portfolio.buildings) project.tender.clientCompany.portfolio.buildings = [];
        project.tender.clientCompany.portfolio.buildings.push({
            type: project.tender.buildingType,
            value: project.tender.buildingType.assetValue,
            income: project.tender.buildingType.incomeBonus,
            maintenance: project.tender.buildingType.maintenance,
            acquiredAt: Date.now()
        });
    }
    
    logEvent(`✅ Ukończono budowę ${project.tender.buildingType.name} dla ${project.tender.clientCompany.name}!`, 'construction');
    
    // Usuń projekt
    constructionProjects = constructionProjects.filter(p => p.id !== project.id);
}

function createConsortium(members, budgetShare) {
    const consortiumId = 'consortium_' + Date.now();
    const consortium = {
        id: consortiumId,
        members: members,
        budgetShare: budgetShare, // { memberId: sharePercentage }
        formedAt: Date.now(),
        projects: []
    };
    constructionConsortia.push(consortium);
    logEvent(`🤝 Utworzono konsorcjum budowlane z ${members.length} członkami.`, 'construction');
    return consortiumId;
}

// ============================================
// NOWA FUNKCJA: Zgłaszanie inwestycji przez firmy niebudowlane
// ============================================

/**
 * Pozwala firmie niebudowlanej zgłosić potrzebę zbudowania budynku poprzez przetarg
 * @param {Object} company - firma zgłaszająca inwestycję
 * @param {Object} buildingType - typ budynku z INVESTMENT_CATALOG
 * @param {number} budget - budżet przetargu (min 120% kosztu budynku)
 * @param {Object} criteriaWeights - wagi kryteriów {price, time, experience, prestige, exchangeLevel, isStateOwned}
 * @returns {string|null} - tender ID jeśli sukces, null jeśli błąd
 */
function requestConstructionTender(company, buildingType, budget, criteriaWeights) {
    // Sprawdź warunki: dev level >= 1, cash >= 1M
    const minDevLevel = 1;
    const minCash = 1000000;
    
    if (!company || company.isBankrupt) {
        logEvent(`❌ Nie można zgłosić przetargu - firma nie istnieje lub jest bankrutem.`, 'construction');
        return null;
    }
    
    // Sprawdź czy firma ma wystarczający poziom rozwoju (sprawdź w stock.data lub innym miejscu)
    // W tej wersji sprawdzamy przez financialHealth jako proxy dla development level
    // W przyszłości dodać pole developmentLevel
    const devLevel = company.financialHealth || 0;
    if (devLevel < minDevLevel) {
        logEvent(`❌ ${company.name} ma za niski poziom rozwoju (wymagany: ${minDevLevel}, ma: ${devLevel}).`, 'construction');
        return null;
    }
    
    if (company.cash < minCash) {
        logEvent(`❌ ${company.name} nie ma wystarczającej gotówki (wymagane: ${minCash.toLocaleString()} PLN, ma: ${company.cash.toLocaleString()} PLN).`, 'construction');
        return null;
    }
    
    // Sprawdź czy budżet jest sensowny (min 120% kosztu budynku)
    const minBudget = buildingType.cost * 1.2;
    if (budget < minBudget) {
        logEvent(`❌ Budżet jest zbyt niski. Minimalny: ${minBudget.toLocaleString()} PLN (120% kosztu).`, 'construction');
        return null;
    }
    
    // Normalizuj wagi kryteriów
    const weights = {
        price: criteriaWeights.price || 0.4,
        time: criteriaWeights.time || 0.3,
        experience: criteriaWeights.experience || 0.2,
        prestige: criteriaWeights.prestige || 0.05,
        exchangeLevel: criteriaWeights.exchangeLevel || 0.03,
        isStateOwned: criteriaWeights.isStateOwned || 0.02
    };
    
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
        logEvent(`⚠️ Suma wag kryteriów to ${totalWeight}, normalizuję do 1.0.`, 'construction');
    }
    
    // Utwórz przetarg
    const tenderId = createTender(buildingType, company, budget, weights);
    
    logEvent(`📋 ${company.name} zgłosił(a) przetarg na ${buildingType.name} z budżetem ${budget.toLocaleString()} PLN.`, 'construction');
    
    return tenderId;
}

/**
 * Zamyka przetargi, których deadline minął
 */
function closeExpiredTenders() {
    const now = Date.now();
    let closedCount = 0;
    
    activeTenders.forEach(tender => {
        if (tender.status === 'open' && tender.deadline < now) {
            tender.status = 'closed';
            logEvent(`⏰ Przetarg na ${tender.buildingType.name} zakończony - minął deadline.`, 'construction');
            closedCount++;
            
            // Automatycznie wybierz zwycięzcę jeśli są oferty
            if (tender.bids.length > 0) {
                awardTender(tender.id);
            }
        }
    });
    
    if (closedCount > 0) {
        console.log(`[Tenders] Closed ${closedCount} expired tenders`);
    }
}

/**
 * Sprawdza, czy spółka budowlana może złożyć ofertę (nie przekroczyła limitu projektów)
 * @param {Object} company - spółka budowlana
 * @returns {boolean}
 */
function canCompanyBid(company) {
    if (!company.constructionStats) return false;
    return company.constructionStats.currentProjects < company.constructionStats.maxProjects;
}

/**
 * Inicjalizuje maxProjects dla spółek budowlanych (wywołane przy tworzeniu spółki)
 * @param {Object} company - obiekt spółki
 */
function initConstructionStats(company) {
    if (company.sector && company.sector.includes('Budowlany')) {
        if (!company.constructionStats) {
            company.constructionStats = {};
        }
        // Limit projektów na podstawie doświadczenia: max 5
        const experience = company.constructionStats.experience || 0;
        company.constructionStats.maxProjects = Math.min(5, Math.floor(experience / 10) + 1);
        company.constructionStats.currentProjects = 0;
        company.constructionStats.wonTenders = company.constructionStats.wonTenders || 0;
        // Doświadczenie startowe: losowe 0-20 jeśli nie ustawione
        if (company.constructionStats.experience === undefined) {
            company.constructionStats.experience = getRandomIntInRange(0, 20);
            company.constructionStats.maxProjects = Math.min(5, Math.floor(company.constructionStats.experience / 10) + 1);
        }
    }
}

/**
 * Generuje losowe przetargi przez AI (spółki niebudowlane)
 * Wywoływane co jakiś czas w głównej pętli
 */
function generateAITenders() {
    const aiCompanies = stocks.filter(s =>
        !s.isBankrupt &&
        !s.sector.includes('Budowlany') && // Tylko niebudowlane
        s.financialHealth >= 1 && // Dev level 1+
        s.cash >= 1000000 // Min 1M cash
    );
    
    if (aiCompanies.length === 0) return;
    
    // Losuj 1-2 firmy do zgłoszenia przetargu (10% szansy na tick)
    if (Math.random() < 0.1) {
        const numTenders = getRandomIntInRange(1, 2);
        for (let i = 0; i < numTenders; i++) {
            const company = getRandomElement(aiCompanies);
            if (!company) continue;
            
            // Sprawdź czy firma ma dostępne budynki w katalogu
            const availableBuildings = INVESTMENT_CATALOG[company.sector[0]] || INVESTMENT_CATALOG['general'];
            if (availableBuildings.length === 0) continue;
            
            // Wybierz losowy budynek
            const buildingType = getRandomElement(availableBuildings);
            
            // Sprawdź czy firma ma wystarczająco gotówki
            if (company.cash < buildingType.cost * 1.2) continue;
            
            // Ustal budżet: 120-150% kosztu
            const budget = buildingType.cost * (1.2 + Math.random() * 0.3);
            
            // Ustal wagi kryteriów (losowe, ale sumują się do 1)
            const priceWeight = 0.3 + Math.random() * 0.3; // 30-60%
            const timeWeight = 0.2 + Math.random() * 0.3;  // 20-50%
            const expWeight = Math.max(0, 1 - priceWeight - timeWeight - 0.1); // Reszta na doświadczenie
            const prestigeWeight = 0.02 + Math.random() * 0.08;
            const exchangeWeight = 0.01 + Math.random() * 0.04;
            const stateWeight = company.isStateOwned ? 0.05 : 0.01;
            
            // Normalizuj
            const total = priceWeight + timeWeight + expWeight + prestigeWeight + exchangeWeight + stateWeight;
            
            const criteriaWeights = {
                price: priceWeight / total,
                time: timeWeight / total,
                experience: expWeight / total,
                prestige: prestigeWeight / total,
                exchangeLevel: exchangeWeight / total,
                isStateOwned: stateWeight / total
            };
            
            requestConstructionTender(company, buildingType, budget, criteriaWeights);
        }
    }
}

function manageConsortiumShares(consortiumId, newShares) {
    const consortium = constructionConsortia.find(c => c.id === consortiumId);
    if (consortium) {
        consortium.budgetShare = newShares;
        logEvent(`📊 Zaktualizowano udziały w konsorcjum ${consortiumId}.`, 'construction');
    }
}

// ============================================
// AI BIDDING AND AUTOMATION
// ============================================

/**
 * AI budowlane składają oferty na otwarte przetargi
 * Wywoływane co jakiś czas
 */
function generateAIBids() {
    const aiBuilders = stocks.filter(s =>
        !s.isBankrupt &&
        s.sector.includes('Budowlany') &&
        s.constructionStats &&
        canCompanyBid(s) // Ma dostępne projekty
    );
    
    if (aiBuilders.length === 0) return;
    
    // Dla każdego otwartego przetargu
    activeTenders.forEach(tender => {
        if (tender.status !== 'open') return;
        
        // Sprawdź czy to przetarg klienta AI (nie gracza)
        if (tender.clientCompany.isPlayer) return;
        
        // Szansa na złożenie oferty przez AI (30% na tick)
        if (Math.random() < 0.3) {
            // Wybierz losowego budowlańca
            const builder = getRandomElement(aiBuilders);
            if (!builder || !canCompanyBid(builder)) return;
            
            // Oblicz ofertę
            const building = tender.buildingType;
            
            // Cena: 80-110% kosztów, ale minimum 90% kosztów i nie więcej niż budżet
            const priceFactor = 0.8 + Math.random() * 0.3;
            const minPrice = building.cost * 0.9;
            const maxPrice = Math.min(tender.budget, building.cost * priceFactor);
            const bidPrice = Math.max(minPrice, maxPrice);
            
            // Czas: 80-120% standardowego czasu (doświadczenie skraca czas)
            const timeFactor = 0.8 + Math.random() * 0.4;
            const bidTime = Math.max(10, Math.floor(building.duration * timeFactor));
            
            // Doświadczenie: użyj rzeczywistego doświadczenia firmy
            const bidExperience = builder.constructionStats.experience;
            
            // Złóż ofertę
            bidOnTender(tender.id, builder, bidPrice, bidTime, bidExperience);
        }
    });
}

/**
 * Automatycznie wybiera zwycięzcę po deadline przetargu
 * (Jeśli nie zrobiono tego wcześniej)
 */
function autoAwardExpiredTenders() {
    activeTenders.forEach(tender => {
        if (tender.status === 'closed' && tender.bids.length > 0 && !tender.winner) {
            // Jeśli zamknięty ale nie przyznany, wybierz zwycięzcę
            awardTender(tender.id);
        }
    });
}

/**
 * Sprawdza i aktualizuje status przetargów (do wywołania w pętli)
 */
function updateTenderSystem() {
    closeExpiredTenders();
    autoAwardExpiredTenders();
    // Można dodać inne funkcje aktualizacji
}