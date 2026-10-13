// =================================================================================
// core.js: Rdzeń symulacji: stałe i stan gry, czas, ekonomia (cykl, bank centralny, indeksy), makro (inflacja, stopy, wybory).
// Złączone pliki: gameCore.js, economy.js, macro.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## gameCore.js
// #################################################################################

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
let blackPRRiskCounter = 0; // każdy czarny PR botów zwiększa szansę wykrycia kolejnych

// --- Funkcje Pomocnicze (Helpers) ---

function getRandomIntInRange(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

/** Losowanie z rozkładu normalnego N(0, 1) (Box–Muller). */
function gaussianRandom() {
    let u = 0;
    while (u === 0) u = Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
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
            pauseButton.classList.add('is-paused');
            console.log('--- GRA ZAPAUZOWANA ---');
        } else {
            pauseButton.textContent = '⏸️ Pauza';
            pauseButton.classList.remove('is-paused');
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


// =================================================================================
// WSPÓLNE ROZLICZENIA PIENIĘŻNE
// Każda zmiana gotówki spółki przechodzi przez adjustCompanyCash, żeby saldo
// rachunku w banku komercyjnym zawsze poruszało się razem z gotówką spółki.
// Każda płatność modułu budowlanego i R&D trafia do dziennika płatności.
// Odbiorcy spoza modelu (dostawcy, usługodawcy) mają prefiks "external:".
// =================================================================================

let paymentJournal = [];
// Sumy przepływów przez granicę modelu (bez limitu), wg celu płatności.
let paymentTotals = { externalIn: 0, externalOut: 0, byPurpose: {} };
let simulationIdCounter = 0;
const PAYMENT_JOURNAL_LIMIT = 400;

function nextSimulationId(prefix = 'id') {
    simulationIdCounter++;
    return `${prefix}_${Date.now().toString(36)}_${simulationIdCounter}`;
}

function getEntityKey(entity) {
    if (!entity) return 'unknown';
    if (typeof entity === 'string') return entity;
    return entity.symbol || entity.id || entity.name || 'unknown';
}

function getCompanyBank(company) {
    if (!company?.bankAccountId || typeof commercialBanks === 'undefined') return null;
    return commercialBanks.find(bank => bank.id === company.bankAccountId) || null;
}

function adjustCompanyCash(company, delta) {
    const amount = Number(delta);
    if (!company || !Number.isFinite(amount) || amount === 0) return 0;

    company.cash = (Number(company.cash) || 0) + amount;

    const bank = getCompanyBank(company);
    if (bank) bank.cash = (Number(bank.cash) || 0) + amount;

    return amount;
}

function adjustBalanceSheet(company, changes = {}) {
    if (!company?.balanceSheet) return;
    const sheet = company.balanceSheet;

    for (const key of ['assets', 'liabilities', 'retainedEarnings']) {
        const value = Number(changes[key]);
        if (Number.isFinite(value) && value !== 0) {
            sheet[key] = (Number(sheet[key]) || 0) + value;
        }
    }
}

function recordPayment(from, to, amount, purpose, reference = null) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return null;

    const entry = {
        id: nextSimulationId('pay'),
        from: getEntityKey(from),
        to: getEntityKey(to),
        amount: value,
        purpose: String(purpose || 'brak opisu'),
        reference,
        external: String(getEntityKey(from)).startsWith('external:') ||
            String(getEntityKey(to)).startsWith('external:'),
        at: Date.now()
    };

    const fromExternal = entry.from.startsWith('external:');
    const toExternal = entry.to.startsWith('external:');
    if (fromExternal !== toExternal) {
        if (fromExternal) paymentTotals.externalIn += value;
        else paymentTotals.externalOut += value;
        const key = `${fromExternal ? 'in' : 'out'}: ${entry.purpose.split(':')[0]}`;
        paymentTotals.byPurpose[key] = (paymentTotals.byPurpose[key] || 0) + value;
    }

    paymentJournal.push(entry);
    if (paymentJournal.length > PAYMENT_JOURNAL_LIMIT) {
        paymentJournal.splice(0, paymentJournal.length - PAYMENT_JOURNAL_LIMIT);
    }

    return entry;
}

/** Przelew gotówki między dwiema spółkami (bez zmiany kapitału — o tym decyduje wywołujący). */
function transferCompanyCash(from, to, amount, purpose, reference = null) {
    const value = Number(amount);
    if (!from || !to || !Number.isFinite(value) || value <= 0) return 0;

    adjustCompanyCash(from, -value);
    adjustCompanyCash(to, value);
    recordPayment(from, to, value, purpose, reference);

    return value;
}

// =================================================================================
// WYNIK OKRESU (pozycje już rozliczone w gotówce/bilansie, czekające na raport)
// Raport kwartalny tylko je odczytuje — nie zmienia ponownie gotówki ani aktywów.
// =================================================================================

function ensurePeriodLedger(company) {
    if (!company) return null;

    if (!company.periodLedger || typeof company.periodLedger !== 'object') {
        company.periodLedger = {
            version: 1,
            pending: {
                constructionRevenue: 0,
                constructionCosts: 0,
                propertyIncome: 0,
                investmentExpense: 0,
                otherIncome: 0
            },
            postedIds: [],
            reportNumber: 0,
            lastReport: null
        };
    }

    return company.periodLedger;
}

function postPeriodEntry(company, entryId, values = {}) {
    const ledger = ensurePeriodLedger(company);
    if (!ledger || !entryId) return false;

    if (ledger.postedIds.includes(entryId)) return false;

    for (const [key, raw] of Object.entries(values)) {
        const value = Number(raw);
        if (!Number.isFinite(value) || !(key in ledger.pending)) continue;
        ledger.pending[key] += value;
    }

    ledger.postedIds.push(entryId);
    if (ledger.postedIds.length > 300) ledger.postedIds.splice(0, ledger.postedIds.length - 300);

    return true;
}

function getPendingPeriodResult(company) {
    const pending = company?.periodLedger?.pending;
    if (!pending) {
        return { constructionRevenue: 0, constructionCosts: 0, propertyIncome: 0, investmentExpense: 0, otherIncome: 0, total: 0 };
    }

    const result = { ...pending };
    result.total =
        pending.constructionRevenue - pending.constructionCosts +
        pending.propertyIncome - pending.investmentExpense + pending.otherIncome;

    return result;
}

/** Zabiera pozycje okresu do raportu i zeruje je — drugi raport ich nie zobaczy. */
function takePeriodResults(company) {
    const ledger = ensurePeriodLedger(company);
    const result = getPendingPeriodResult(company);

    for (const key of Object.keys(ledger.pending)) ledger.pending[key] = 0;

    return result;
}

// --- Zmienne dla sektora budowlanego ---
let activeTenders = [];
let constructionProjects = [];
// Konsorcja są tymczasowo wyłączone (brak modelu podziału kosztów i odpowiedzialności).
let constructionConsortia = [];

const CONSTRUCTION_RULES = {
    dayMs: BASE_DELAYS.weekly / 7,          // 1 dzień budowy = 1/7 tygodnia gry
    advanceRate: 0.20,                       // zaliczka przy podpisaniu umowy
    milestones: [0.25, 0.50, 0.75],          // etapy odbioru
    retentionRate: 0.10,                     // część płatna dopiero przy odbiorze końcowym
    penaltyPerDayRate: 0.005,                // kara umowna za dzień opóźnienia wykonawcy
    maxPenaltyRate: 0.10,
    bonusPerDayRate: 0.0025,                 // premia za każdy dzień przed terminem
    maxBonusRate: 0.03,
    bonusThreshold: 0.05,                    // premia dopiero przy ukończeniu >= 5% przed terminem
    breakupFeeRate: 0.05,                    // odstępne przy zerwaniu przez zamawiającego
    contractorFaultPenaltyRate: 0.05,        // kara przy zerwaniu z winy wykonawcy
    maxFundingStallMs: BASE_DELAYS.weekly * 6,
    maxBuilderLeverage: 0.70,                // limit zadłużenia do aktywów przy kredycie obrotowym
    maxOpenTenders: 8,
    maxTendersPerClient: 1,
    bidEvaluationChancePerTick: 0.12,
    changeOrderChancePerWeek: 0.03,
    subcontractorFeeRate: 0.08
};

const CONSTRUCTION_DELAY_REASONS = [
    { text: 'Awaria sprzętu', cause: 'contractor' },
    { text: 'Poprawki po kontroli jakości', cause: 'contractor' },
    { text: 'Niekorzystna pogoda', cause: 'external' },
    { text: 'Problemy z dostawami', cause: 'external' },
    { text: 'Brak materiałów na rynku', cause: 'external' }
];

// ============================================
// INICJALIZACJA STATYSTYK BUDOWLANYCH
// ============================================

function getConstructionCapacityForExperience(experience) {
    return Math.min(5, Math.floor(Math.max(0, Number(experience) || 0) / 10) + 1);
}

function updateConstructionCapacity(company) {
    if (!company?.constructionStats) return;
    company.constructionStats.maxProjects =
        getConstructionCapacityForExperience(company.constructionStats.experience);
}

function isConstructionCompany(company) {
    return Boolean(
        company &&
        Array.isArray(company.sector) &&
        company.sector.includes('Budowlany')
    );
}

/**
 * Inicjalizuje maxProjects dla spółek budowlanych. Nie zeruje istniejących danych.
 */
function initConstructionStats(company) {
    if (!isConstructionCompany(company)) return;

    if (!company.constructionStats) company.constructionStats = {};
    const stats = company.constructionStats;

    if (!Number.isFinite(Number(stats.experience))) {
        stats.experience = getRandomIntInRange(0, 20);
    }

    stats.wonTenders = Number(stats.wonTenders) || 0;
    stats.completedProjects = Number(stats.completedProjects) || 0;
    updateConstructionCapacity(company);
    stats.currentProjects = getActiveProjectsForBuilder(company).length;
}

function initializeAllConstructionStats() {
    stocks.forEach(initConstructionStats);
    console.log('[Construction] Limity projektów spółek budowlanych zainicjalizowane.');
}

function getActiveProjectsForBuilder(company) {
    return constructionProjects.filter(project =>
        !project.settled &&
        (project.builder === company ||
            (company?.symbol && project.builder?.symbol === company.symbol))
    );
}

function getOpenBidsForBuilder(company) {
    const key = getEntityKey(company);
    return activeTenders.filter(tender =>
        tender.status === 'open' &&
        (tender.bids || []).some(bid => getEntityKey(bid.bidder) === key)
    );
}

/** Odtwarza zajęte moce z aktywnych projektów (po wczytaniu i po każdej zmianie). */
function recountConstructionCapacity() {
    for (const company of stocks) {
        if (!company?.constructionStats) continue;
        updateConstructionCapacity(company);
        company.constructionStats.currentProjects = getActiveProjectsForBuilder(company).length;
    }

    if (typeof specialists !== 'undefined' && Array.isArray(specialists)) {
        for (const spec of specialists) {
            const busy = constructionProjects.find(project =>
                !project.settled && project.subcontractor?.id === spec.id
            );
            spec.busyProjectId = busy ? busy.id : null;
        }
    }
}

function canCompanyBid(company) {
    if (!company || company.isBankrupt || !isConstructionCompany(company)) return false;

    const stats = company.constructionStats;
    if (!stats) return false;

    const maxProjects = Number(stats.maxProjects);
    if (!Number.isInteger(maxProjects) || maxProjects < 1) return false;

    return getActiveProjectsForBuilder(company).length < maxProjects;
}

/** Wymagania projektu wobec wykonawcy (doświadczenie i technologie). */
function meetsConstructionRequirements(company, buildingSpec) {
    const requirements = buildingSpec?.requirements || {};
    const experience = Number(company?.constructionStats?.experience) || 0;

    if (experience < (Number(requirements.minExperience) || 0)) return false;

    const unlocked = company?.research?.unlockedTechs || [];
    if (requirements.requiredTech && !unlocked.includes(requirements.requiredTech)) return false;

    return true;
}

// ============================================
// PRZETARGI
// ============================================

const DEFAULT_TENDER_WEIGHTS = {
    price: 0.40,
    time: 0.30,
    experience: 0.20,
    prestige: 0.05,
    exchangeLevel: 0.03,
    isStateOwned: 0.02
};

function normalizeTenderWeights(criteriaWeights = {}) {
    const weights = {};
    for (const key of Object.keys(DEFAULT_TENDER_WEIGHTS)) {
        const value = Number(criteriaWeights?.[key] ?? DEFAULT_TENDER_WEIGHTS[key]);
        weights[key] = Number.isFinite(value) && value >= 0 ? value : DEFAULT_TENDER_WEIGHTS[key];
    }
    return weights;
}

/** Losowe wagi kryteriów zamawiającego AI (różni zamawiający cenią różne rzeczy). */
function randomTenderWeights(client) {
    return normalizeTenderWeights({
        price: getRandomInRange(0.35, 0.65),
        time: getRandomInRange(0.15, 0.35),
        experience: getRandomInRange(0.05, 0.20),
        prestige: getRandomInRange(0.02, 0.08),
        exchangeLevel: getRandomInRange(0.01, 0.04),
        isStateOwned: client?.isStateOwned ? 0.05 : 0.01
    });
}

function hasOpenConstructionOrder(client, buildingId) {
    const key = getEntityKey(client);

    const tenderOpen = activeTenders.some(tender =>
        ['open', 'closed'].includes(tender.status) &&
        getEntityKey(tender.clientCompany) === key &&
        tender.buildingType?.id === buildingId
    );

    const projectOpen = constructionProjects.some(project =>
        !project.settled &&
        getEntityKey(project.tender?.clientCompany) === key &&
        project.tender?.buildingType?.id === buildingId
    );

    return tenderOpen || projectOpen;
}

function countOpenOrdersForClient(client) {
    const key = getEntityKey(client);
    return activeTenders.filter(tender =>
        ['open', 'closed'].includes(tender.status) &&
        getEntityKey(tender.clientCompany) === key
    ).length;
}

function createTender(
    buildingType,
    clientCompany,
    budget,
    criteriaWeights = {},
    biddingDurationMs = BASE_DELAYS.weekly
) {
    const amount = Number(budget);
    const duration = Number(biddingDurationMs);

    // Przetarg budowlany wyłącznie dla pozycji katalogu wymagających robót budowlanych.
    const spec = typeof getConstructionSpec === 'function'
        ? getConstructionSpec(buildingType?.id)
        : null;

    if (
        !spec ||
        !clientCompany ||
        clientCompany.isBankrupt ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !Number.isFinite(duration) ||
        duration <= 0 ||
        hasOpenConstructionOrder(clientCompany, spec.id)
    ) {
        return null;
    }

    const tender = {
        id: nextSimulationId('tender'),
        timerVersion: 2,
        buildingType: spec,
        clientCompany,
        budget: amount,
        criteriaWeights: normalizeTenderWeights(criteriaWeights),
        bids: [],
        evaluatedBy: [],
        status: 'open',
        createdAt: Date.now(),
        biddingDurationMs: duration,
        remainingGameMs: duration,
        elapsedGameMs: 0,
        closedAt: null,
        awardedAt: null,
        winner: null,
        projectId: null,
        startDate: null,
        completionDate: null,
        cancelReason: null
    };

    activeTenders.push(tender);

    logEvent(
        `Ogłoszono przetarg: ${spec.name}, zamawiający: ${clientCompany.name}, ` +
        `budżet: ${amount.toLocaleString('pl-PL')} PLN. ` +
        `Przyjmowanie ofert: ${Math.ceil(duration / 1000)} s symulacji.`,
        'construction'
    );

    return tender.id;
}

function bidOnTender(tenderId, bidderCompany, bidPrice, bidTime) {
    const tender = activeTenders.find(t => t.id === tenderId);

    if (
        !tender ||
        tender.status !== 'open' ||
        tender.timerVersion !== 2 ||
        !(tender.remainingGameMs > 0) ||
        !canCompanyBid(bidderCompany) ||
        !meetsConstructionRequirements(bidderCompany, tender.buildingType)
    ) {
        return false;
    }

    const client = tender.clientCompany;
    const bidderKey = getEntityKey(bidderCompany);

    if (!client || client.isBankrupt || bidderKey === getEntityKey(client)) return false;

    const price = Number(bidPrice);
    const time = Number(bidTime);
    const budget = Number(tender.budget);

    if (
        !Number.isFinite(price) || price <= 0 ||
        !Number.isFinite(time) || time <= 0 ||
        !Number.isFinite(budget) || price > budget
    ) {
        return false;
    }

    if (!Array.isArray(tender.bids)) tender.bids = [];

    const existingIndex = tender.bids.findIndex(bid => getEntityKey(bid.bidder) === bidderKey);
    const previous = existingIndex >= 0 ? tender.bids[existingIndex] : null;
    const now = Date.now();

    const bid = {
        bidder: bidderCompany,
        price,
        time: Math.max(1, Math.round(time)),
        experience: Math.max(0, Number(bidderCompany.constructionStats.experience) || 0),
        submittedAt: previous?.submittedAt ?? now,
        submittedGameMs: previous?.submittedGameMs ?? tender.elapsedGameMs,
        updatedAt: now,
        updatedGameMs: tender.elapsedGameMs
    };

    // Jedna aktualna oferta wykonawcy na przetarg.
    if (existingIndex >= 0) {
        tender.bids[existingIndex] = bid;
    } else {
        tender.bids.push(bid);
    }

    logEvent(
        `${existingIndex >= 0 ? 'Aktualizacja oferty' : 'Nowa oferta'}: ` +
        `${bidderCompany.name} — ${tender.buildingType.name}, ` +
        `${price.toLocaleString('pl-PL')} PLN, ${bid.time} dni budowy.`,
        'construction'
    );

    return true;
}

function calculateBidScore(bid, tender) {
    if (!bid?.bidder || !tender?.buildingType) return 0;

    const price = Number(bid.price);
    const time = Number(bid.time);
    const budget = Number(tender.budget);
    const baseDuration = Number(tender.buildingType.durationDays ?? tender.buildingType.duration);

    if (
        !(price > 0) || !(time > 0) || !(budget > 0) || !(baseDuration > 0) || price > budget
    ) {
        return 0;
    }

    const clamp = value => Math.max(0, Math.min(100, value));
    const weights = normalizeTenderWeights(tender.criteriaWeights);
    let totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);

    if (totalWeight <= 0) {
        Object.assign(weights, DEFAULT_TENDER_WEIGHTS);
        totalWeight = 1;
    }

    const experience = Math.max(0, Number(bid.bidder.constructionStats?.experience) || 0);
    const reputation = clamp(Number(bid.bidder.constructionReputation ?? 50) || 50);
    const exchangeLevels = { JUNK: 1, BRONZE: 2, SILVER: 3, GOLD: 4, PLATINUM: 5 };

    const clientPublic = Boolean(tender.clientCompany?.isStateOwned || tender.clientCompany?.assetType === 'Municipal');
    const bidderPublic = Boolean(bid.bidder.isStateOwned || bid.bidder.assetType === 'Municipal');

    const scores = {
        price: clamp(100 * (1 - price / budget)),
        // Oferta czasu porównywana z katalogowym czasem budowy (1.5x katalogu = 0 pkt).
        time: clamp(100 * (1.5 - time / baseDuration) / 1.5),
        // Malejące korzyści z doświadczenia: 10 pkt ≈ 22, 40 pkt ≈ 63, 80 pkt ≈ 86.
        experience: clamp(100 * (1 - Math.exp(-experience / 40))),
        prestige: reputation,
        exchangeLevel: (exchangeLevels[bid.bidder.exchange] || 1) * 20,
        isStateOwned: clientPublic && bidderPublic ? 100 : 0
    };

    const score = Object.keys(weights).reduce((sum, key) => sum + scores[key] * weights[key], 0) / totalWeight;
    return clamp(score);
}

function closeExpiredTenders() {
    if (isGamePaused) return;

    for (const tender of activeTenders) {
        if (tender.timerVersion !== 2 || tender.status !== 'open' || tender.remainingGameMs > 0) continue;

        tender.remainingGameMs = 0;
        tender.status = 'closed';
        tender.closedAt = Date.now();

        logEvent(`Zakończono przyjmowanie ofert na ${tender.buildingType?.name || tender.id}.`, 'construction');
    }
}

function cancelTender(tender, reason) {
    tender.status = 'cancelled';
    tender.cancelReason = reason;
    tender.winner = null;
    logEvent(`Anulowano przetarg na ${tender.buildingType?.name || tender.id}: ${reason}`, 'construction');
    return false;
}

function awardTender(tenderId) {
    if (isGamePaused) return false;

    const tender = activeTenders.find(t => t.id === tenderId);

    if (
        !tender ||
        tender.timerVersion !== 2 ||
        !['open', 'closed'].includes(tender.status) ||
        tender.winner ||
        tender.projectId ||
        tender.remainingGameMs > 0
    ) {
        return false;
    }

    tender.status = 'closed';

    const client = tender.clientCompany;
    const budget = Number(tender.budget);

    if (!client || client.isBankrupt || !(budget > 0) || !(tender.buildingType?.durationDays > 0)) {
        return cancelTender(tender, 'Nieprawidłowe zamówienie lub zamawiający.');
    }

    const clientKey = getEntityKey(client);
    const ranked = (Array.isArray(tender.bids) ? tender.bids : [])
        .filter(bid =>
            bid?.bidder &&
            getEntityKey(bid.bidder) !== clientKey &&
            Number(bid.price) > 0 &&
            Number(bid.price) <= budget &&
            Number(bid.time) > 0
        )
        .sort((a, b) => {
            const difference = calculateBidScore(b, tender) - calculateBidScore(a, tender);
            if (Math.abs(difference) > 0.000001) return difference;
            const priceDifference = Number(a.price) - Number(b.price);
            if (priceDifference !== 0) return priceDifference;
            return (Number(a.submittedGameMs) || 0) - (Number(b.submittedGameMs) || 0);
        });

    if (ranked.length === 0) {
        return cancelTender(tender, 'Brak poprawnych ofert.');
    }

    // Jeśli najlepszy wykonawca zajął w międzyczasie ostatnie wolne miejsce,
    // zamawiający przechodzi do kolejnej oferty w rankingu.
    for (const bid of ranked) {
        if (!canCompanyBid(bid.bidder) || !meetsConstructionRequirements(bid.bidder, tender.buildingType)) {
            continue;
        }

        const price = Number(bid.price);

        if ((Number(client.cash) || 0) < price) {
            // Brakującą kwotę zamawiający pożycza w swoim banku (gotówka i dług rosną razem).
            const financed = typeof financeInvestment === 'function'
                ? financeInvestment(client, price)
                : false;

            if (!financed) {
                return cancelTender(tender, 'Zamawiający nie ma środków ani zdolności kredytowej na kontrakt.');
            }
        }

        if (!startConstructionProject(tender, bid)) continue;

        tender.awardedAt = Date.now();
        tender.awardedGameMs = tender.elapsedGameMs;
        tender.cancelReason = null;

        const stats = bid.bidder.constructionStats;
        stats.wonTenders = (Number(stats.wonTenders) || 0) + 1;

        logEvent(
            `${bid.bidder.name} wygrywa przetarg na ${tender.buildingType.name} za ` +
            `${price.toLocaleString('pl-PL')} PLN.`,
            'construction'
        );

        return true;
    }

    return cancelTender(tender, 'Żaden oferent nie ma już wolnych mocy wykonawczych.');
}

function autoAwardExpiredTenders() {
    if (isGamePaused) return;

    for (const tender of [...activeTenders]) {
        if (
            tender.timerVersion === 2 &&
            tender.status === 'closed' &&
            !tender.winner &&
            !tender.projectId &&
            tender.remainingGameMs <= 0
        ) {
            awardTender(tender.id);
        }
    }
}

/** Usuwa z listy rozstrzygnięte przetargi starsze niż ostatnie 40 (ogranicza narastanie danych). */
function pruneFinishedTenders() {
    const finished = activeTenders.filter(tender => ['cancelled', 'completed'].includes(tender.status));
    if (finished.length <= 40) return;

    const toRemove = new Set(finished.slice(0, finished.length - 40).map(tender => tender.id));
    activeTenders = activeTenders.filter(tender => !toRemove.has(tender.id));
}

function updateTenderSystem(deltaTime = 0) {
    if (isGamePaused) return;

    const delta = Number(deltaTime);
    if (!Number.isFinite(delta) || delta < 0) return;

    for (const tender of activeTenders) {
        if (tender.timerVersion !== 2 || tender.status !== 'open' || !(tender.remainingGameMs >= 0)) continue;

        const consumed = Math.min(delta, tender.remainingGameMs);
        tender.remainingGameMs -= consumed;
        tender.elapsedGameMs = (Number(tender.elapsedGameMs) || 0) + consumed;
    }

    generateAIBids();
    closeExpiredTenders();
    autoAwardExpiredTenders();
    pruneFinishedTenders();
}

// ============================================
// OFERTY AI
// ============================================

function estimateBuilderCost(builder, buildingSpec) {
    const bonuses = getConstructionTechnologyBonuses(builder);
    return Number(buildingSpec.cost) * 0.85 * (1 - bonuses.costReduction);
}

function getBuilderSpeedMultiplier(builder) {
    const experience = Math.max(0, Number(builder?.constructionStats?.experience) || 0);
    const bonuses = getConstructionTechnologyBonuses(builder);
    return 1 + Math.min(0.15, experience * 0.0025) + bonuses.speedBonus;
}

/**
 * Każdy wolny wykonawca rozważa każdy otwarty przetarg raz. Może złożyć
 * jedną ofertę, jeśli ma wolne moce (aktywne projekty + otwarte oferty)
 * i spełnia wymagania projektu.
 */
function generateAIBids() {
    const builders = stocks.filter(company =>
        !company.isBankrupt &&
        !company.isPlayer &&
        company.constructionStats &&
        canCompanyBid(company)
    );

    if (builders.length === 0) return;

    for (const tender of activeTenders) {
        if (tender.status !== 'open' || tender.clientCompany?.isPlayer) continue;
        if (!Array.isArray(tender.evaluatedBy)) tender.evaluatedBy = [];

        for (const builder of builders) {
            const key = getEntityKey(builder);
            if (tender.evaluatedBy.includes(key) || key === getEntityKey(tender.clientCompany)) continue;
            if (Math.random() > CONSTRUCTION_RULES.bidEvaluationChancePerTick) continue;

            tender.evaluatedBy.push(key);

            const load = getActiveProjectsForBuilder(builder).length + getOpenBidsForBuilder(builder).length;
            if (load >= builder.constructionStats.maxProjects) continue;
            if (!meetsConstructionRequirements(builder, tender.buildingType)) continue;

            const estimatedCost = estimateBuilderCost(builder, tender.buildingType);
            const experience = Number(builder.constructionStats.experience) || 0;
            const activeCount = getActiveProjectsForBuilder(builder).length;
            // Doświadczone firmy liczą sobie premię, a zajęty wykonawca wycenia drożej —
            // praca rozkłada się na rynek, a doświadczenie nie gwarantuje wygranej.
            const margin = getRandomInRange(1.06, 1.30) + Math.min(0.06, experience * 0.001) + activeCount * 0.10;
            const price = Math.min(Number(tender.budget), estimatedCost * margin);

            // Wykonawca nie składa oferty poniżej kosztów.
            if (price < estimatedCost * 1.03) continue;

            const days = Math.max(
                1,
                Math.round(tender.buildingType.durationDays * getRandomInRange(0.95, 1.25) / getBuilderSpeedMultiplier(builder))
            );

            bidOnTender(tender.id, builder, Math.round(price), days);
        }
    }
}

// ============================================
// REALIZACJA KONTRAKTU
// ============================================

function getContractValue(project) {
    return (Number(project.price) || 0) + (Number(project.changeOrderAmount) || 0);
}

function getMilestonePaymentTarget(project, milestone) {
    const rules = CONSTRUCTION_RULES;
    const workShare = 1 - rules.advanceRate - rules.retentionRate;
    return getContractValue(project) * (rules.advanceRate + workShare * milestone);
}

/** Wypłata z depozytu (escrow) zamawiającego do wykonawcy. Wykonawca księguje ją jako zaliczkę (zobowiązanie). */
function releaseEscrowToBuilder(project, amount, purpose) {
    const value = Math.min(Number(amount) || 0, Number(project.escrowBalance) || 0);
    if (value <= 0) return 0;

    const builder = project.builder;
    const client = project.tender.clientCompany;

    project.escrowBalance -= value;
    project.paidToBuilder += value;

    adjustCompanyCash(builder, value);
    adjustBalanceSheet(builder, { assets: value, liabilities: value });
    recordPayment(client, builder, value, purpose, project.id);

    return value;
}

function payDueMilestones(project) {
    const milestones = CONSTRUCTION_RULES.milestones;

    while (
        project.milestonesPaid < milestones.length &&
        project.progress >= milestones[project.milestonesPaid] - 0.0000001
    ) {
        const milestone = milestones[project.milestonesPaid];
        const due = getMilestonePaymentTarget(project, milestone) - project.paidToBuilder;

        project.milestonesPaid++;
        project.acceptedShare = milestone;

        if (due > 0) {
            releaseEscrowToBuilder(project, due, `Płatność za etap ${Math.round(milestone * 100)}%`);
        }

        project.events.push({
            type: 'milestone',
            description: `Odebrano etap ${Math.round(milestone * 100)}%`,
            gameTimeMs: project.elapsedGameMs
        });
    }
}

/** Kredyt obrotowy wykonawcy — finansowanie kosztów budowy ponad zaliczki. */
function drawConstructionCredit(builder, amount, project) {
    const value = Number(amount);
    if (!(value > 0) || !builder?.balanceSheet) return false;

    const sheet = builder.balanceSheet;
    const assets = Math.max(1, Number(sheet.assets) || 0);
    const liabilities = Number(sheet.liabilities) || 0;

    if ((liabilities + value) / assets > CONSTRUCTION_RULES.maxBuilderLeverage) return false;

    const bank = getCompanyBank(builder);
    if (bank) bank.cash = (Number(bank.cash) || 0) - value; // bank udziela kredytu ze swoich środków

    adjustCompanyCash(builder, value);
    adjustBalanceSheet(builder, { assets: value, liabilities: value });
    builder.constructionCredit = (Number(builder.constructionCredit) || 0) + value;
    recordPayment(bank ? bank.id : 'external:bank_credit', builder, value, 'Kredyt obrotowy na budowę', project?.id);

    return true;
}

function repayConstructionCredit(builder) {
    const credit = Number(builder?.constructionCredit) || 0;
    const cash = Number(builder?.cash) || 0;
    const repayment = Math.min(credit, cash * 0.8);

    if (!(repayment > 0)) return 0;

    adjustCompanyCash(builder, -repayment);
    const bank = getCompanyBank(builder);
    if (bank) bank.cash = (Number(bank.cash) || 0) + repayment;

    adjustBalanceSheet(builder, { assets: -repayment, liabilities: -repayment });
    builder.constructionCredit = credit - repayment;
    recordPayment(builder, bank ? bank.id : 'external:bank_credit', repayment, 'Spłata kredytu obrotowego');

    return repayment;
}

function startConstructionProject(tender, winningBid) {
    const client = tender?.clientCompany;
    const builder = winningBid?.bidder;
    const building = tender?.buildingType;

    if (!client || !builder || !building) return false;
    if (constructionProjects.some(project => project.tender?.id === tender.id)) return false;

    const price = Number(winningBid.price);
    const durationDays = Number(winningBid.time);

    if (
        !canCompanyBid(builder) ||
        client.isBankrupt ||
        !(price > 0) ||
        !(durationDays > 0) ||
        !((Number(client.cash) || 0) >= price) ||
        !Number.isFinite(Number(builder.cash))
    ) {
        return false;
    }

    const dayMs = CONSTRUCTION_RULES.dayMs;
    const technologyBonuses = getConstructionTechnologyBonuses(builder);
    const experience = Math.max(0, Number(builder.constructionStats.experience) || 0);
    const estimatedCost = estimateBuilderCost(builder, building);

    // Doświadczenie zawęża rozrzut wykonania, ale nie gwarantuje sukcesu.
    const spread = Math.max(0.06, 0.15 - experience * 0.001);
    const performanceFactor = getRandomInRange(1 - spread, 1 + spread * 0.6);

    const project = {
        id: nextSimulationId('project'),
        modelVersion: 3,
        tender,
        builder,
        startTime: Date.now(),
        duration: durationDays,
        workRequiredMs: building.durationDays * dayMs,
        deadlineMs: durationDays * dayMs,
        plannedDurationMs: durationDays * dayMs,
        dayMs,
        technologyBonuses: { ...technologyBonuses },
        speedMultiplier: getBuilderSpeedMultiplier(builder),
        performanceFactor,
        delayChance: Math.max(0.01, (0.06 - experience * 0.0005) * (1 - technologyBonuses.delayReduction)),
        elapsedGameMs: 0,
        eventAccumulatorMs: 0,
        pauseRemainingMs: 0,
        pauseCause: null,
        excusedDelayMs: 0,
        contractorDelayMs: 0,
        fundingStallMs: 0,
        progress: 0,
        price,
        cost: price,
        changeOrderAmount: 0,
        escrowBalance: 0,
        depositedByClient: 0,
        paidToBuilder: 0,
        milestonesPaid: 0,
        acceptedShare: 0,
        estimatedCost,
        costsPaid: 0,
        subcontractor: null,
        status: 'in_progress',
        delays: 0,
        delayReason: null,
        events: [],
        settled: false,
        settlement: null
    };

    // Zamawiający wpłaca pełną cenę na depozyt (escrow). W bilansie zamawiającego
    // to zamiana gotówki na należność z umowy — aktywa się nie zmieniają.
    adjustCompanyCash(client, -price);
    project.escrowBalance = price;
    project.depositedByClient = price;
    recordPayment(client, `escrow:${project.id}`, price, 'Wpłata na depozyt kontraktu', project.id);

    constructionProjects.push(project);
    builder.constructionStats.currentProjects = getActiveProjectsForBuilder(builder).length;

    tender.status = 'awarded';
    tender.winner = winningBid;
    tender.projectId = project.id;
    tender.startDate = project.startTime;

    // Zaliczka dla wykonawcy.
    releaseEscrowToBuilder(project, price * CONSTRUCTION_RULES.advanceRate, 'Zaliczka przy podpisaniu umowy');

    logEvent(
        `${builder.name} rozpoczyna budowę ${building.name} (termin: ${durationDays} dni budowy). ` +
        `Zaliczka ${(price * CONSTRUCTION_RULES.advanceRate).toFixed(0)} PLN, ` +
        `planowane koszty ${estimatedCost.toFixed(0)} PLN.`,
        'construction'
    );

    return true;
}

function releaseSubcontractor(project, completed) {
    if (!project.subcontractor || typeof specialists === 'undefined') return;

    const spec = specialists.find(item => item.id === project.subcontractor.id);
    if (spec) {
        spec.busyProjectId = null;
        if (completed) {
            spec.contractsCompleted = (Number(spec.contractsCompleted) || 0) + 1;
            spec.level = 1 + Math.floor(spec.contractsCompleted / 5);
        }
    }
}

function hireSubcontractorForProject(project, specId = null) {
    if (!project || project.settled || project.subcontractor || typeof specialists === 'undefined') return false;

    const free = specialists.filter(spec => !spec.busyProjectId);
    const spec = specId
        ? free.find(item => item.id === specId)
        : free.sort((a, b) => b.bonus - a.bonus)[0];

    if (!spec) return false;

    const remainingCost = Math.max(0, project.estimatedCost - project.costsPaid);
    const fee = Math.max(1000, remainingCost * CONSTRUCTION_RULES.subcontractorFeeRate);

    if ((Number(project.builder.cash) || 0) < fee * 1.5) return false;

    // Wynagrodzenie podwykonawcy jest kosztem kontraktu (produkcja w toku).
    adjustCompanyCash(project.builder, -fee);
    spec.cash = (Number(spec.cash) || 0) + fee;
    recordPayment(project.builder, `specialist:${spec.id}`, fee, 'Wynagrodzenie podwykonawcy', project.id);

    project.costsPaid += fee;
    project.speedMultiplier += Number(spec.bonus) || 0;
    project.subcontractor = { id: spec.id, name: spec.name, fee, bonus: Number(spec.bonus) || 0 };
    spec.busyProjectId = project.id;

    project.events.push({ type: 'subcontractor', description: `Zatrudniono podwykonawcę ${spec.name}`, gameTimeMs: project.elapsedGameMs });
    logEvent(`${project.builder.name} zatrudnia podwykonawcę ${spec.name} przy ${project.tender.buildingType.name} (${fee.toFixed(0)} PLN).`, 'construction');

    return true;
}

function getProjectedRemainingMs(project) {
    const rate = project.speedMultiplier * project.performanceFactor;
    return project.workRequiredMs * (1 - project.progress) / Math.max(0.1, rate);
}

function getProjectTimeLeftMs(project) {
    return project.deadlineMs + project.excusedDelayMs - project.elapsedGameMs;
}

function runWeeklyProjectEvents(project) {
    const builder = project.builder;
    const client = project.tender.clientCompany;

    // Opóźnienie losowe: wykonawca, czynniki zewnętrzne.
    if (Math.random() < project.delayChance) {
        const reason = getRandomElement(CONSTRUCTION_DELAY_REASONS);
        const delayDays = getRandomIntInRange(1, 3);

        project.pauseRemainingMs = delayDays * project.dayMs;
        project.pauseCause = reason.cause;
        project.delays++;
        project.delayReason = reason.text;
        project.status = 'paused';

        project.events.push({ type: 'delay', cause: reason.cause, description: reason.text, delayDays, gameTimeMs: project.elapsedGameMs });
        logEvent(`${project.tender.buildingType.name}: ${reason.text}. Przerwa: ${delayDays} dni budowy.`, 'construction');
        return;
    }

    // Zmiana zamówienia przez zamawiającego — dopłata do depozytu i przedłużenie terminu.
    if (project.progress < 0.8 && Math.random() < CONSTRUCTION_RULES.changeOrderChancePerWeek) {
        const share = getRandomInRange(0.03, 0.08);
        const extra = Math.round(project.price * share);

        if ((Number(client.cash) || 0) >= extra) {
            adjustCompanyCash(client, -extra);
            project.escrowBalance += extra;
            project.depositedByClient += extra;
            project.changeOrderAmount += extra;
            project.estimatedCost += extra * 0.85;

            const extraWork = project.workRequiredMs * share;
            project.workRequiredMs += extraWork;
            project.excusedDelayMs += extraWork;

            recordPayment(client, `escrow:${project.id}`, extra, 'Dopłata za zmianę zamówienia', project.id);
            project.events.push({ type: 'change_order', cause: 'client', description: `Zmiana zamówienia (+${extra} PLN)`, gameTimeMs: project.elapsedGameMs });
            logEvent(`${client.name} zmienia zakres ${project.tender.buildingType.name}: +${extra.toLocaleString('pl-PL')} PLN, termin wydłużony.`, 'construction');
            return;
        }
    }

    // Wykonawca AI ratuje termin podwykonawcą.
    if (!project.subcontractor && !builder.isPlayer && getProjectedRemainingMs(project) > getProjectTimeLeftMs(project)) {
        hireSubcontractorForProject(project);
    }
}

function processConstructionProjects(deltaTime = BASE_DELAYS.stockUpdate) {
    if (isGamePaused) return;

    const delta = Number(deltaTime);
    if (!Number.isFinite(delta) || delta <= 0) return;

    for (const project of [...constructionProjects]) {
        if (project.modelVersion !== 3 || project.settled) continue;

        const builder = project.builder;
        const client = project.tender?.clientCompany;

        if (!client || client.isBankrupt) {
            cancelConstructionProject(project, 'Bankructwo lub brak zamawiającego.', 'client');
            continue;
        }

        if (!builder || builder.isBankrupt) {
            cancelConstructionProject(project, 'Bankructwo lub brak wykonawcy.', 'contractor');
            continue;
        }

        let remaining = delta;

        while (remaining > 0 && !project.settled) {
            const step = Math.min(remaining, BASE_DELAYS.stockUpdate);
            remaining -= step;
            project.elapsedGameMs += step;

            project.eventAccumulatorMs += step;
            if (project.eventAccumulatorMs >= BASE_DELAYS.weekly) {
                project.eventAccumulatorMs -= BASE_DELAYS.weekly;
                if (project.pauseRemainingMs <= 0) runWeeklyProjectEvents(project);
            }

            if (project.pauseRemainingMs > 0) {
                project.pauseRemainingMs = Math.max(0, project.pauseRemainingMs - step);
                if (project.pauseCause === 'contractor') project.contractorDelayMs += step;
                else project.excusedDelayMs += step;

                project.status = 'paused';

                if (project.pauseRemainingMs === 0) {
                    project.status = 'in_progress';
                    project.delayReason = null;
                    project.pauseCause = null;
                }
                continue;
            }

            const desiredProgress = Math.min(
                1 - project.progress,
                step * project.speedMultiplier * project.performanceFactor / project.workRequiredMs
            );

            const remainingCost = Math.max(0, project.estimatedCost - project.costsPaid);
            const desiredCost = Math.min(remainingCost, desiredProgress * project.estimatedCost);
            const cash = Number(builder.cash) || 0;

            if (desiredCost > cash + 0.000001) {
                // Najpierw próba kredytu obrotowego na kilka dni pracy.
                const chunk = Math.max(desiredCost - cash, project.estimatedCost * 0.10);
                if (!drawConstructionCredit(builder, Math.min(chunk, remainingCost), project)) {
                    if (project.delayReason !== 'Brak środków wykonawcy.') {
                        logEvent(`${builder.name} wstrzymuje budowę ${project.tender.buildingType.name}: brak środków i finansowania.`, 'construction');
                    }

                    project.status = 'paused';
                    project.delayReason = 'Brak środków wykonawcy.';
                    project.contractorDelayMs += step;
                    project.fundingStallMs += step;

                    if (project.fundingStallMs >= CONSTRUCTION_RULES.maxFundingStallMs) {
                        cancelConstructionProject(project, 'Wykonawca nie zdołał sfinansować budowy.', 'contractor');
                    }
                    continue;
                }
            }

            project.status = 'in_progress';
            if (project.delayReason === 'Brak środków wykonawcy.') project.delayReason = null;

            // Koszty budowy: gotówka -> produkcja w toku (aktywa bez zmian).
            if (desiredCost > 0) {
                adjustCompanyCash(builder, -desiredCost);
                recordPayment(builder, 'external:dostawcy_i_robocizna', desiredCost, 'Koszty budowy', project.id);
                project.costsPaid += desiredCost;
            }

            project.progress = Math.min(1, project.progress + desiredProgress);
            payDueMilestones(project);

            if (project.progress >= 1 - 0.000000001) {
                project.progress = 1;
                completeConstructionProject(project);
                break;
            }
        }
    }
}

function addBuildingToClient(client, project, values) {
    if (!client.portfolio) client.portfolio = {};
    if (!Array.isArray(client.portfolio.buildings)) client.portfolio.buildings = [];

    const spec = project.tender.buildingType;
    const record = {
        id: `building_${project.id}`,
        projectId: project.id,
        catalogId: spec.id,
        type: { id: spec.id, name: spec.name, kind: spec.kind },
        status: values.status,
        purchasePrice: values.purchasePrice,      // ile zamawiający faktycznie zapłacił
        bookValue: values.purchasePrice,          // wartość księgowa (koszt nabycia)
        marketValue: values.marketValue,          // szacunek rynkowy (nie wpływa na bilans)
        value: values.purchasePrice,              // zgodność ze starszym kodem: = wartość księgowa
        income: values.status === 'completed' ? Math.max(0, Number(spec.incomeBonus) || 0) : 0,
        maintenance: values.status === 'completed' ? Math.max(0, Number(spec.maintenance) || 0) : 0,
        acquiredAt: Date.now()
    };

    client.portfolio.buildings.push(record);
    // Budynek bez etapu wyposażenia działa od razu po odbiorze; jakość z weryfikacji (opóźnienia budowy).
    if (values.status === 'completed' && spec.kind !== 'mixed' && typeof registerOperatingInvestment === 'function') {
        registerOperatingInvestment(client, {
            id: spec.id, name: spec.name, cost: values.purchasePrice, incomeBonus: spec.incomeBonus,
            quality: rollVerificationQuality(client, project.delays || 0)
        });
    }
    return record;
}

function finishBuilderContract(project, revenue, extraCosts = 0) {
    const builder = project.builder;
    const costs = project.costsPaid + extraCosts;

    postPeriodEntry(builder, `contract_${project.id}`, {
        constructionRevenue: revenue,
        constructionCosts: costs
    });

    if (!Array.isArray(builder.constructionHistory)) builder.constructionHistory = [];
    if (!builder.constructionHistory.some(entry => entry.projectId === project.id)) {
        builder.constructionHistory.push({
            projectId: project.id,
            buildingName: project.tender.buildingType.name,
            clientName: project.tender.clientCompany?.name || 'Brak danych',
            status: project.status,
            revenue,
            costs,
            profit: revenue - costs,
            delays: project.delays || 0,
            penalty: project.settlement?.penalty || 0,
            bonus: project.settlement?.bonus || 0,
            elapsedGameMs: project.elapsedGameMs,
            completedAt: Date.now(),
            reason: project.cancelReason || ''
        });

        if (builder.constructionHistory.length > 60) {
            builder.constructionHistory.splice(0, builder.constructionHistory.length - 60);
        }
    }

    repayConstructionCredit(builder);
}

function completeConstructionProject(project) {
    if (!project || project.modelVersion !== 3 || project.settled || project.progress < 1) return false;

    const client = project.tender?.clientCompany;
    const builder = project.builder;
    if (!client || !builder) return false;

    const rules = CONSTRUCTION_RULES;
    const value = getContractValue(project);
    const dayMs = project.dayMs;
    const lateMs = project.elapsedGameMs - (project.deadlineMs + project.excusedDelayMs);

    let penalty = 0;
    let bonus = 0;

    if (lateMs > 0) {
        penalty = Math.min(value * rules.maxPenaltyRate, value * rules.penaltyPerDayRate * (lateMs / dayMs));
    } else if (-lateMs > project.deadlineMs * rules.bonusThreshold) {
        bonus = Math.min(value * rules.maxBonusRate, value * rules.bonusPerDayRate * (-lateMs / dayMs));
        if ((Number(client.cash) || 0) < bonus) bonus = 0; // zamawiającego nie stać na premię
    }

    project.settled = true;
    project.status = 'completed';
    project.completionDate = Date.now();

    const finalDue = Math.max(0, value - project.paidToBuilder - penalty);
    const advancesBefore = project.paidToBuilder;

    // Płatność końcowa z depozytu, kara wraca do zamawiającego jako pomniejszenie ceny.
    const finalPaid = Math.min(finalDue, project.escrowBalance);
    project.escrowBalance -= finalPaid;
    project.paidToBuilder += finalPaid;
    adjustCompanyCash(builder, finalPaid);
    recordPayment(client, builder, finalPaid, 'Płatność końcowa po odbiorze', project.id);

    const refund = project.escrowBalance;
    if (refund > 0) {
        adjustCompanyCash(client, refund);
        recordPayment(`escrow:${project.id}`, client, refund, penalty > 0 ? 'Kara umowna (potrącenie)' : 'Zwrot niewykorzystanego depozytu', project.id);
        project.escrowBalance = 0;
    }

    if (bonus > 0) {
        transferCompanyCash(client, builder, bonus, 'Premia za ukończenie przed terminem', project.id);
    }

    const revenue = project.paidToBuilder + bonus;

    // Bilans wykonawcy: rozliczenie zaliczek, zdjęcie produkcji w toku, wynik kontraktu.
    adjustBalanceSheet(builder, {
        liabilities: -advancesBefore,
        assets: finalPaid + bonus - project.costsPaid,
        retainedEarnings: revenue - project.costsPaid
    });

    // Bilans zamawiającego bez zmian: depozyt zamienia się w budynek wg ceny nabycia.
    const purchasePrice = revenue;
    addBuildingToClient(client, project, {
        status: 'completed',
        purchasePrice,
        marketValue: Number(project.tender.buildingType.estimatedMarketValue) || purchasePrice
    });

    if (Number(project.tender.buildingType.healthBonus) > 0) {
        client.financialHealth = Math.min(5, (Number(client.financialHealth) || 0) + Number(project.tender.buildingType.healthBonus) * 0.5);
    }

    project.settlement = { type: 'completed', value, penalty, bonus, revenue, costs: project.costsPaid, purchasePrice };
    project.profit = revenue - project.costsPaid;

    const stats = builder.constructionStats;
    stats.experience = (Number(stats.experience) || 0) + 1;
    stats.completedProjects = (Number(stats.completedProjects) || 0) + 1;
    updateConstructionCapacity(builder);

    releaseSubcontractor(project, true);
    finishBuilderContract(project, revenue);

    project.tender.status = 'completed';
    project.tender.completionDate = project.completionDate;

    constructionProjects = constructionProjects.filter(item => item.id !== project.id);
    stats.currentProjects = getActiveProjectsForBuilder(builder).length;

    if (typeof onConstructionCompleted === 'function') onConstructionCompleted(client, project);

    logEvent(
        `Odebrano ${project.tender.buildingType.name} dla ${client.name}. ${builder.name}: ` +
        `przychód ${revenue.toFixed(0)} PLN, koszty ${project.costsPaid.toFixed(0)} PLN` +
        (penalty > 0 ? `, kara ${penalty.toFixed(0)} PLN` : '') +
        (bonus > 0 ? `, premia ${bonus.toFixed(0)} PLN` : '') + '.',
        'construction'
    );

    return true;
}

/**
 * Anulowanie kontraktu.
 * faultParty: 'client' (zamawiający rezygnuje lub upada), 'contractor' (wina wykonawcy),
 *             'none' (okoliczności niezależne od stron).
 */
function cancelConstructionProject(project, reason = 'Anulowanie', faultParty = 'none') {
    if (!project || project.modelVersion !== 3 || project.settled) return false;

    const client = project.tender?.clientCompany;
    const builder = project.builder;
    if (!client || !builder) return false;

    const rules = CONSTRUCTION_RULES;
    const value = getContractValue(project);
    const earned = value * project.acceptedShare;   // wartość odebranych etapów
    const advancesBefore = project.paidToBuilder;

    let due = 0;            // dopłata z depozytu dla wykonawcy
    let refundOwed = 0;     // zwrot nadpłaty przez wykonawcę
    let refundCollected = 0;
    let penaltyOwed = 0;
    let penaltyCollected = 0;

    if (faultParty === 'contractor') {
        refundOwed = Math.max(0, project.paidToBuilder - earned);
        penaltyOwed = builder.isBankrupt ? 0 : value * rules.contractorFaultPenaltyRate;
    } else {
        // Wynagrodzenie za odebrane etapy, zwrot kosztów poniesionych ponad etapy,
        // a przy winie zamawiającego także odstępne od niewykonanej części.
        const breakup = faultParty === 'client' ? value * (1 - project.progress) * rules.breakupFeeRate : 0;
        const entitlement = Math.max(earned, project.costsPaid) + breakup;
        due = Math.max(0, entitlement - project.paidToBuilder);
    }

    project.settled = true;
    project.status = 'cancelled';
    project.cancelReason = String(reason);
    project.completionDate = Date.now();

    if (due > 0) {
        const paid = Math.min(due, project.escrowBalance);
        project.escrowBalance -= paid;
        project.paidToBuilder += paid;
        adjustCompanyCash(builder, paid);
        recordPayment(client, builder, paid, 'Rozliczenie anulowanego kontraktu', project.id);
        due = paid;
    }

    if (refundOwed > 0) {
        refundCollected = Math.min(refundOwed, Math.max(0, Number(builder.cash) || 0));
        if (refundCollected > 0) transferCompanyCash(builder, client, refundCollected, 'Zwrot nadpłaty po zerwaniu umowy', project.id);
        project.paidToBuilder -= refundCollected;
    }

    if (penaltyOwed > 0) {
        penaltyCollected = Math.min(penaltyOwed, Math.max(0, Number(builder.cash) || 0));
        if (penaltyCollected > 0) transferCompanyCash(builder, client, penaltyCollected, 'Kara za zerwanie umowy z winy wykonawcy', project.id);
    }

    const escrowRefund = project.escrowBalance;
    if (escrowRefund > 0) {
        adjustCompanyCash(client, escrowRefund);
        recordPayment(`escrow:${project.id}`, client, escrowRefund, 'Zwrot niewykorzystanego depozytu', project.id);
        project.escrowBalance = 0;
    }

    // Wykonawca: rozliczenie zaliczek i odpisanie produkcji w toku.
    const revenue = project.paidToBuilder;
    adjustBalanceSheet(builder, {
        liabilities: -advancesBefore,
        assets: due - refundCollected - penaltyCollected - project.costsPaid,
        retainedEarnings: revenue - penaltyCollected - project.costsPaid
    });

    // Zamawiający: niedokończona inwestycja wg kwoty zatrzymanej przez wykonawcę,
    // nieściągnięta nadpłata to strata, otrzymana kara to przychód.
    const uncollected = refundOwed - refundCollected;
    const unfinishedValue = Math.max(0, revenue - uncollected);
    adjustBalanceSheet(client, {
        assets: penaltyCollected - uncollected,
        retainedEarnings: penaltyCollected - uncollected
    });

    if (penaltyCollected - uncollected !== 0) {
        postPeriodEntry(client, `contract_client_${project.id}`, { otherIncome: penaltyCollected - uncollected });
    }

    if (unfinishedValue > 0) {
        addBuildingToClient(client, project, { status: 'unfinished', purchasePrice: unfinishedValue, marketValue: unfinishedValue * 0.6 });
    }

    project.settlement = {
        type: 'cancelled', faultParty, value, earned, due, refundOwed, refundCollected,
        penalty: penaltyCollected, escrowRefund, revenue, costs: project.costsPaid
    };
    project.profit = revenue - penaltyCollected - project.costsPaid;

    releaseSubcontractor(project, false);
    finishBuilderContract(project, revenue, penaltyCollected);

    project.tender.status = 'cancelled';
    project.tender.cancelReason = project.cancelReason;
    project.tender.completionDate = project.completionDate;

    constructionProjects = constructionProjects.filter(item => item.id !== project.id);
    if (builder.constructionStats) builder.constructionStats.currentProjects = getActiveProjectsForBuilder(builder).length;

    logEvent(
        `Anulowano budowę ${project.tender.buildingType.name}. ${project.cancelReason} ` +
        `Zwrot dla ${client.name}: ${(escrowRefund + refundCollected).toFixed(0)} PLN. ` +
        `Wykonawca zatrzymuje ${revenue.toFixed(0)} PLN przy kosztach ${project.costsPaid.toFixed(0)} PLN.`,
        'construction'
    );

    return true;
}

// ============================================
// ZAMÓWIENIA SPÓŁEK (ZAMAWIAJĄCY)
// ============================================

/**
 * Zgłoszenie przetargu przez spółkę. Jedyna droga zamówienia budowy.
 * @returns {string|null} ID przetargu lub null
 */
function requestConstructionTender(company, buildingType, budget, criteriaWeights = {}) {
    if (!company || company.isBankrupt) return null;

    const spec = typeof getConstructionSpec === 'function' ? getConstructionSpec(buildingType?.id) : null;
    if (!spec) {
        logEvent(`❌ ${company.name}: „${buildingType?.name || 'pozycja'}” nie wymaga robót budowlanych — nie trafia do przetargu.`, 'construction');
        return null;
    }

    const devLevel = Number(company.departments?.development?.level) || 0;
    if (devLevel < spec.minDevLevel) {
        logEvent(`❌ ${company.name}: dział rozwoju poziom ${devLevel}, wymagany ${spec.minDevLevel}.`, 'construction');
        return null;
    }

    if (hasOpenConstructionOrder(company, spec.id)) return null;
    if (countOpenOrdersForClient(company) >= CONSTRUCTION_RULES.maxTendersPerClient) return null;

    const openCount = activeTenders.filter(tender => tender.status === 'open').length;
    if (openCount >= CONSTRUCTION_RULES.maxOpenTenders) return null;

    const minBudget = spec.cost * 1.2;
    const amount = Math.max(Number(budget) || 0, minBudget);

    if (typeof canFinanceAmount === 'function' && !canFinanceAmount(company, amount)) {
        logEvent(`❌ ${company.name} nie ma środków ani zdolności kredytowej na ${spec.name}.`, 'construction');
        return null;
    }

    return createTender(spec, company, Math.round(amount), criteriaWeights);
}

function getConstructionTechnologyBonuses(company) {
    const result = { speedBonus: 0, costReduction: 0, delayReduction: 0 };

    if (!isConstructionCompany(company)) return result;

    const unlocked = Array.isArray(company.research?.unlockedTechs) ? company.research.unlockedTechs : [];

    for (const id of new Set(unlocked)) {
        const tech = technologies[id];
        if (!tech || tech.sector !== 'Budowlany' || !tech.constructionEffects) continue;

        for (const key of Object.keys(result)) {
            const value = Number(tech.constructionEffects[key]);
            if (Number.isFinite(value) && value > 0) result[key] += value;
        }
    }

    result.speedBonus = Math.min(0.30, result.speedBonus);
    result.costReduction = Math.min(0.15, result.costReduction);
    result.delayReduction = Math.min(0.60, result.delayReduction);

    return result;
}

// #################################################################################
// ## economy.js
// #################################################################################

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
// 0.14 T1a: jeden rejestr sektorów — jedyne źródło nazw, ikon, grup, profili i podsektorów
// (profile, cykle, mediany, filtry, skaner, Akademia). Podsektor może nadpisać pola profilu sektora.
const SECTOR_GROUPS = [
    { id: 'finance',  name: 'Finanse',            icon: '💰', sectors: ['Bankowość', 'Finanse'] },
    { id: 'consumer', name: 'Konsumpcja',         icon: '🛒', sectors: ['Żywność', 'Dobra konsumpcyjne', 'Turystyka', 'Media', 'Gaming'] },
    { id: 'industry', name: 'Przemysł i surowce', icon: '🏭', sectors: ['Przemysł', 'Chemia', 'Energia', 'Budowlany', 'Transport i logistyka'] },
    { id: 'health',   name: 'Zdrowie i nauka',    icon: '🏥', sectors: ['Medycyna', 'Badania'] },
    { id: 'tech',     name: 'Technologia',        icon: '💻', sectors: ['Technologia'] },
    { id: 'realty',   name: 'Nieruchomości',      icon: '🏢', sectors: ['Nieruchomości'] },
    { id: 'defense',  name: 'Obronność',          icon: '🛡️', sectors: ['Obronność'] },
    { id: 'services', name: 'Usługi',             icon: '🧰', sectors: ['Usługi'] }
];

const SECTORS = {
    'Bankowość':             { icon: '🏦', profile: { beta: 1.1, rateSens: -0.3, pe: 11, margin: 0.40, growth: 0.03, ps: 2.5, da: 0.02 },
        subsectors: { 'Bank komercyjny': {}, 'Bank inwestycyjny': {}, 'Bank międzynarodowy': {} } },
    'Finanse':               { icon: '💳', profile: { beta: 1.3, rateSens: 0.5, pe: 13, margin: 0.30, growth: 0.04, ps: 2.5, da: 0.02 },
        subsectors: {
            'Pożyczki konsumenckie': { profile: { beta: 1.2, rateSens: 0.8, pe: 10, ps: 2.0 } }, // dawne „Finanse Konsumenckie”
            'Rynki kapitałowe': {}
        } },
    'Żywność':               { icon: '🍞', profile: { beta: 0.5, rateSens: 0.4, pe: 15, margin: 0.12, growth: 0.03, ps: 1.0, da: 0.03 } },
    'Dobra konsumpcyjne':    { icon: '🛍️', profile: { beta: 1.0, rateSens: 0.6, pe: 16, margin: 0.14, growth: 0.04, ps: 1.3, da: 0.03 } },
    'Turystyka':             { icon: '✈️', profile: { beta: 1.5, rateSens: 0.8, pe: 15, margin: 0.15, growth: 0.04, ps: 1.5, da: 0.06 } },
    'Media':                 { icon: '📺', profile: { beta: 1.1, rateSens: 0.6, pe: 14, margin: 0.18, growth: 0.02, ps: 1.8, da: 0.04 } },
    'Gaming':                { icon: '🎮', profile: { beta: 1.4, rateSens: 1.0, pe: 20, margin: 0.25, growth: 0.07, ps: 3.0, da: 0.06 } },
    'Przemysł':              { icon: '🏭', profile: { beta: 1.3, rateSens: 0.8, pe: 13, margin: 0.14, growth: 0.03, ps: 1.0, da: 0.05 } },
    'Chemia':                { icon: '⚗️', profile: { beta: 1.2, rateSens: 0.7, pe: 13, margin: 0.16, growth: 0.03, ps: 1.1, da: 0.05 } },
    'Energia':               { icon: '⚡', profile: { beta: 0.8, rateSens: 0.9, pe: 12, margin: 0.25, growth: 0.02, ps: 1.5, da: 0.08 } },
    'Budowlany':             { icon: '🏗️', profile: { beta: 1.5, rateSens: 1.3, pe: 11, margin: 0.10, growth: 0.03, ps: 0.7, da: 0.03 } },
    'Transport i logistyka': { icon: '🚚', profile: { beta: 1.2, rateSens: 0.7, pe: 13, margin: 0.14, growth: 0.03, ps: 1.0, da: 0.07 }, // dawny „Transport”
        subsectors: { 'Logistyka': { profile: { pe: 14, margin: 0.12, growth: 0.04, da: 0.06 } } } },           // dawna „Logistyka”
    'Medycyna':              { icon: '💊', profile: { beta: 0.6, rateSens: 0.6, pe: 20, margin: 0.22, growth: 0.05, ps: 3.0, da: 0.05 } },
    'Badania':               { icon: '🔬', profile: { beta: 0.9, rateSens: 0.8, pe: 25, margin: 0.20, growth: 0.07, ps: 4.0, da: 0.05 } },
    'Technologia':           { icon: '💻', profile: { beta: 1.3, rateSens: 1.2, pe: 22, margin: 0.28, growth: 0.08, ps: 3.5, da: 0.05 } },
    'Nieruchomości':         { icon: '🏢', profile: { beta: 1.4, rateSens: 1.6, pe: 14, margin: 0.35, growth: 0.03, ps: 4.0, da: 0.10 } },
    'Obronność':             { icon: '🛡️', profile: { beta: 0.5, rateSens: 0.5, pe: 17, margin: 0.20, growth: 0.04, ps: 1.8, da: 0.05 } }, // 0.11.4: defensywna
    'Usługi':                { icon: '🧰', profile: { beta: 0.9, rateSens: 0.5, pe: 16, margin: 0.15, growth: 0.04, ps: 1.4, da: 0.03 } }
};
for (const group of SECTOR_GROUPS) for (const name of group.sectors) SECTORS[name].group = group.id;

/** Kanoniczne sektory w kolejności wyświetlania (według grup). */
const SECTOR_NAMES = SECTOR_GROUPS.flatMap(group => group.sectors);
// Zgodność: profile sektorów jako słownik (generatory, testy).
const SECTOR_PROFILES = Object.fromEntries(SECTOR_NAMES.map(name => [name, SECTORS[name].profile]));

const DEFAULT_SECTOR_PROFILE = { beta: 1.0, rateSens: 0.7, pe: 14, margin: 0.15, growth: 0.03, ps: 1.5, da: 0.04 };

// Stare nazwy (definicje sprzed 0.14 i zapisy ≤ v13) → [sektor, podsektor].
const LEGACY_SECTOR_MAP = {
    'Bankowość Komercyjna': ['Bankowość', 'Bank komercyjny'],
    'Finanse Konsumenckie': ['Finanse', 'Pożyczki konsumenckie'],
    'Logistyka': ['Transport i logistyka', 'Logistyka'],
    'Transport': ['Transport i logistyka', null],
    'Dobra konsumencje': ['Dobra konsumpcyjne', null] // literówka z dawnego generatora startupów
};
const LEGACY_SECTOR_NAMES = ['Bankowość Komercyjna', 'Finanse Konsumenckie', 'Logistyka', 'Transport', 'Międzynarodowy', 'common', 'Dobra konsumencje'];
const MAX_SEGMENTS = 3;

function isCanonicalSector(name) {
    return typeof name === 'string' && Object.prototype.hasOwnProperty.call(SECTORS, name);
}

/** Kanoniczna nazwa sektora dla nazwy z listy (także starej); null, gdy to nie sektor. */
function canonicalSectorName(name) {
    return LEGACY_SECTOR_MAP[name]?.[0] || (isCanonicalSector(name) ? name : null);
}

/** Profil sektora (z podsektorem: nadpisane pola podsektora). */
function getSectorSubsectorProfile(sector, subsector = null) {
    const def = SECTORS[sector];
    if (!def) return null;
    const sub = subsector ? def.subsectors?.[subsector] : null;
    return sub?.profile ? { ...def.profile, ...sub.profile } : def.profile;
}

/** Podsektor banku z jego typu (porządek nazw T1a). */
function getBankSubsector(stock, rawSectors = []) {
    const type = stock?.bankData?.type;
    if (type === BANK_TYPES.INVESTMENT) return 'Bank inwestycyjny';
    if (type === BANK_TYPES.INTERNATIONAL || rawSectors.includes(BANK_TYPES.INTERNATIONAL)) return 'Bank międzynarodowy';
    return stock?.isBankStock || stock?.bankData ? 'Bank komercyjny' : null;
}

/**
 * Segmenty z (dawnej) listy sektorów: mapowanie nazw, bez etykiet niebędących sektorami („Międzynarodowy”, „common”),
 * bez „Usługi” doklejonych na dalszej pozycji, para Bankowość + Finanse = jeden segment Bankowość, podsektor banku
 * z jego typu, operatorzy rynków → Finanse / Rynki kapitałowe. Równe udziały (wynik jak dawna średnia), najwyżej 3.
 */
function deriveSegmentsFromSectors(stock) {
    const raw = (Array.isArray(stock?.sector) ? stock.sector : [stock?.sector]).filter(name => typeof name === 'string' && name);
    const entries = [];
    raw.forEach((name, index) => {
        const mapped = LEGACY_SECTOR_MAP[name] || (isCanonicalSector(name) ? [name, null] : null);
        if (!mapped) return;
        if (mapped[0] === 'Usługi' && index > 0) return;
        const existing = entries.find(entry => entry.sector === mapped[0]);
        if (existing) { if (!existing.subsector && mapped[1]) existing.subsector = mapped[1]; return; }
        entries.push({ sector: mapped[0], subsector: mapped[1] });
    });
    let list = entries.some(entry => entry.sector === 'Bankowość') ? entries.filter(entry => entry.sector !== 'Finanse') : entries;
    const bank = list.find(entry => entry.sector === 'Bankowość');
    if (bank) bank.subsector = getBankSubsector(stock, raw) || bank.subsector; // typ banku przed etykietą „Bankowość Komercyjna”
    if (stock?.marketOperator) {
        list = list.filter(entry => entry.sector === 'Finanse');
        if (!list.length) list.push({ sector: 'Finanse', subsector: null });
        list[0].subsector = 'Rynki kapitałowe';
    }
    list = list.slice(0, MAX_SEGMENTS);
    return list.map(entry => ({ sector: entry.sector, subsector: entry.subsector || null, share: 1 / list.length }));
}

function isValidSegmentList(segments) {
    return Array.isArray(segments) && segments.length > 0 && segments.length <= MAX_SEGMENTS
        && segments.every(seg => isCanonicalSector(seg?.sector) && seg.share > 0)
        && Math.abs(segments.reduce((sum, seg) => sum + seg.share, 0) - 1) < 1e-6;
}

/** Sektory w kolejności udziałów (sektor główny pierwszy). */
function getSectorsFromSegments(segments) {
    return [...segments].sort((a, b) => b.share - a.share).map(seg => seg.sector);
}

function segmentsMatchSectors(stock) {
    const derived = getSectorsFromSegments(stock.segments);
    const current = Array.isArray(stock.sector) ? stock.sector : [];
    return derived.length === current.length && derived.every((sector, i) => sector === current[i]);
}

/** Segmenty spółki (bez zmiany obiektu): zapisane albo wyprowadzone z sektorów. */
function getStockSegments(stock) {
    if (isValidSegmentList(stock?.segments) && segmentsMatchSectors(stock)) return stock.segments;
    const current = Array.isArray(stock?.sector) ? stock.sector : [];
    if (isValidSegmentList(stock?.segments) && current.length === stock.segments.length && stock.segments.every(seg => current.includes(seg.sector))) return stock.segments;
    return deriveSegmentsFromSectors(stock);
}

/** Ustawia stock.segments i wyliczony z nich stock.sector (idempotentne). Zwraca true, gdy coś zmieniono. */
function ensureStockSegments(stock) {
    if (!stock || typeof stock !== 'object') return false;
    if (isValidSegmentList(stock.segments) && segmentsMatchSectors(stock)) return false;
    // Te same sektory w innej kolejności: prawdą są segmenty (udziały), sektor tylko się przelicza.
    const current = Array.isArray(stock.sector) ? stock.sector : [];
    if (isValidSegmentList(stock.segments) && current.length === stock.segments.length && stock.segments.every(seg => current.includes(seg.sector))) {
        stock.sector = getSectorsFromSegments(stock.segments);
        return true;
    }
    const segments = deriveSegmentsFromSectors(stock);
    stock.segments = segments;
    stock.sector = getSectorsFromSegments(segments);
    return true;
}

/** Wszystkie spółki: segmenty i sektory z rejestru (nowa gra, wczytanie, co kwartał). Zwraca liczbę poprawionych. */
function ensureAllStockSegments() {
    if (typeof stocks === 'undefined' || !Array.isArray(stocks)) return 0;
    let changed = 0;
    for (const stock of stocks) if (ensureStockSegments(stock)) changed++;
    return changed;
}

function getMainSegment(stock) {
    const segments = getStockSegments(stock);
    return segments.length ? segments.reduce((best, seg) => seg.share > best.share ? seg : best) : null;
}

/** Sektor główny = segment o największym udziale (zamiast sector[0]). */
function getMainSector(stock) {
    return getMainSegment(stock)?.sector || null;
}

/** Podsektor segmentu głównego. */
function getMainSubsector(stock) {
    return getMainSegment(stock)?.subsector || null;
}

/** Spółka ma segment w danym sektorze (główny albo poboczny). */
function hasSectorSegment(stock, sector) {
    return getStockSegments(stock).some(seg => seg.sector === sector);
}

/** Profil spółki: średnia profili segmentów ważona udziałami (0.14 T1b). */
function getSectorProfile(stock) {
    const weighted = getStockSegments(stock).map(seg => [getSectorSubsectorProfile(seg.sector, seg.subsector), seg.share]).filter(([profile]) => profile);
    if (weighted.length === 0) return { ...DEFAULT_SECTOR_PROFILE };
    const total = weighted.reduce((sum, [, share]) => sum + share, 0);
    const result = {};
    for (const key of Object.keys(DEFAULT_SECTOR_PROFILE)) {
        result[key] = weighted.reduce((sum, [profile, share]) => sum + profile[key] * share, 0) / total;
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
    // Wszystkie banki (także nieaktywne): bank aktywowany w trakcie gry ma od razu poprawne stopy
    // (testy ogólne 0.11: kredyt w takim banku dawał odsetki NaN i gotówkę bota NaN).
    commercialBanks.forEach(bank => {
        const margin = Number(bank.baseInterestRateMargin) || 0;
        bank.interestRateLoan = LOAN_INTEREST_RATE + margin;
        bank.interestRateDeposit = DEPOSIT_INTEREST_RATE + margin * 0.5; // Marża depozytowa niższa
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
        if (stock.tradeHalted) return; // notowania zawieszone (afera, scandals.js)

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
        let effectiveVolatility = stock.volatilityFactor * volatilityModifier * (typeof getCorruptionVolatilityFactor === 'function' ? getCorruptionVolatilityFactor() : 1); // korupcja (0.11)
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
        // B2: blokada dopiero po ~2 tygodniach gry poniżej 1 zł (wcześniej 80% szans co tick).
        stock.belowOneTicks = stock.price < 1.00 ? (stock.belowOneTicks || 0) + 1 : 0;
        if (stock.price < 1.00 && !stock.isTradeLocked && !stock.tradeHalted && stock.belowOneTicks >= 120) {
            stock.isTradeLocked = true;
            logEvent(`⛔ Handel akcjami ${stock.name} (${stock.symbol}) wstrzymany — kurs od dwóch tygodni poniżej 1 zł.`, 'review');
        } else if (stock.price > 1.50 && stock.isTradeLocked && !stock.tradeHalted) {
            stock.isTradeLocked = false;
            logEvent(`✅ Wznowiono handel akcjami ${stock.name} (${stock.symbol}).`, 'review');
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
    // Indeks łańcuchowy: średnia zmiana cen spółek notowanych w obu chwilach (równe wagi).
    // Debiuty, bankructwa i drogie nowe spółki nie zmieniają już indeksu skokowo (testy ogólne 0.11).
    const gigIndex = marketIndexes.find(idx => idx.id === 'GIG');
    if (gigIndex) {
        const oldValue = gigIndex.value;
        const members = stocks.filter(stock => !stock.assetType && !stock.isBankrupt && !stock.tradeHalted && stock.price > 0);
        const last = gigIndex.lastPrices || {};
        const returns = members.filter(stock => last[stock.symbol] > 0).map(stock => Math.max(-0.2, Math.min(0.2, stock.price / last[stock.symbol] - 1)));
        if (!(oldValue > 0)) gigIndex.value = members.reduce((sum, stock) => sum + stock.price, 0) / Math.max(1, members.length);
        else if (returns.length) gigIndex.value = oldValue * (1 + returns.reduce((sum, r) => sum + r, 0) / returns.length);
        gigIndex.lastPrices = Object.fromEntries(members.map(stock => [stock.symbol, stock.price]));
        gigIndex.change = gigIndex.value - oldValue;
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

// #################################################################################
// ## macro.js
// #################################################################################

// macro.js — Makroekonomia (wersja 0.10.2, część M1)
//
// Wskaźniki: inflacja, bezrobocie, PKB (r/r) i stopa referencyjna — liczone co kwartał z cyklu koniunktury,
// z bezwładnością. Posiedzenie Banku Centralnego co kwartał (reguła Taylora + charakter prezesa); decyzję
// ogłasza „Gazeta Ekonomiczna” (Obserwator Finansowy) razem z oczekiwaniami analityków na kolejne
// posiedzenie — rynek reaguje na niespodziankę. Każdy sektor ma własny cykl (boom → szczyt → spadek →
// dołek). Wybory co 4 lata zmieniają politykę wobec spółek państwowych. Zdarzenia makro i państwowe
// mają realne skutki i przerwy między powtórzeniami.

const INFLATION_TARGET = 0.025;
const NEUTRAL_REAL_RATE = 0.01;
const NATURAL_UNEMPLOYMENT = 0.06;
const MACRO_HISTORY_LIMIT = 16;
const BC_MAX_STEP = 0.005;
const BC_RATE_LIMITS = [0.005, 0.15];
const RATE_SURPRISE_IMPACT = 2;          // reakcja kursu na niespodziankę (× wrażliwość sektora na stopy)
const ELECTION_INTERVAL_QUARTERS = 16;   // 4 lata gry
const EVENT_COOLDOWN = 6;                // ostatnie zdarzenia nie wracają od razu

const SECTOR_CYCLE_PHASES = {
    boom:    { name: 'Boom',   icon: '🚀', adj: 0.004,  val: 1.08, next: 'peak',    length: [2, 4] },
    peak:    { name: 'Szczyt', icon: '⛰️', adj: 0.001,  val: 1.03, next: 'decline', length: [1, 2] },
    decline: { name: 'Spadek', icon: '📉', adj: -0.004, val: 0.93, next: 'trough',  length: [2, 4] },
    trough:  { name: 'Dołek',  icon: '🕳️', adj: -0.001, val: 0.97, next: 'boom',    length: [1, 3] }
};

const RULING_PARTIES = {
    market: { name: 'Koalicja Rynkowa', privatization: 1.6, nationalization: 0.5, subsidies: 0.7, stateMood: -0.02 },
    state:  { name: 'Blok Państwowy',   privatization: 0.4, nationalization: 1.6, subsidies: 1.5, stateMood: 0.03 },
    people: { name: 'Ludowcy',          privatization: 0.8, nationalization: 1.0, subsidies: 1.3, stateMood: 0.01 } // 0.13: płaca minimalna, zasiłki, mieszkania
};

let macro = createMacroState();

function createMacroState() {
    return {
        inflation: 0.03,
        unemployment: NATURAL_UNEMPLOYMENT,
        gdpAnnual: 0.03,
        quarter: 0,
        history: [],
        expectation: { change: 0, label: 'bez zmian' },
        lastDecision: null,
        sectorCycles: createSectorCycles(),
        election: { quartersLeft: getRandomIntInRange(6, 12), ruling: Math.random() < 0.5 ? 'market' : 'state', campaign: false, donations: { market: 0, state: 0, people: 0 }, favor: null, coalition: null, support: null },
        recentEvents: [],
        shocks: { inflation: 0 }
    };
}

function createSectorCycles() {
    const cycles = {};
    const phases = Object.keys(SECTOR_CYCLE_PHASES);
    for (const sector of SECTOR_NAMES) {
        const phase = getRandomElement(phases);
        cycles[sector] = { phase, quartersLeft: getRandomIntInRange(...SECTOR_CYCLE_PHASES[phase].length) };
    }
    return cycles;
}

/** T1a: cykle tylko dla sektorów kanonicznych; „Transport i logistyka” przejmuje cykl dawnego Transportu. */
function normalizeSectorCycles(saved, fresh = createSectorCycles()) {
    const source = saved && typeof saved === 'object' ? saved : {};
    const cycles = {};
    for (const sector of SECTOR_NAMES) {
        const legacy = Object.keys(LEGACY_SECTOR_MAP).find(name => LEGACY_SECTOR_MAP[name][0] === sector && !LEGACY_SECTOR_MAP[name][1] && source[name]);
        cycles[sector] = source[sector] || (legacy ? source[legacy] : null) || fresh[sector];
    }
    return cycles;
}

function ensureMacroState() {
    const fresh = createMacroState();
    macro = { ...fresh, ...(macro || {}) };
    macro.sectorCycles = normalizeSectorCycles(macro.sectorCycles, fresh.sectorCycles);
    macro.election = { ...fresh.election, ...(macro.election || {}) };
    macro.election.donations = { market: 0, state: 0, people: 0, ...(macro.election.donations || {}) };
    macro.shocks = { ...fresh.shocks, ...(macro.shocks || {}) };
    if (!Array.isArray(macro.history)) macro.history = [];
    if (!Array.isArray(macro.recentEvents)) macro.recentEvents = [];
    return macro;
}

// =================================================================================
// CYKLE SEKTORÓW
// =================================================================================

/** Cykle segmentów spółki z wagami udziałów (0.14 T1b: cykl działa proporcjonalnie do segmentu). */
function getStockSectorCycles(stock) {
    return getStockSegments(stock).map(seg => ({ cycle: macro.sectorCycles?.[seg.sector], share: seg.share })).filter(item => item.cycle);
}

function weightedCycleValue(stock, key, fallback) {
    const cycles = getStockSectorCycles(stock);
    const total = cycles.reduce((sum, item) => sum + item.share, 0);
    if (!(total > 0)) return fallback;
    return cycles.reduce((sum, item) => sum + SECTOR_CYCLE_PHASES[item.cycle.phase][key] * item.share, 0) / total;
}

/** Dodatek do kwartalnego wzrostu przychodów z fazy sektora. */
function getSectorCycleAdj(stock) {
    return weightedCycleValue(stock, 'adj', 0);
}

/** Mnożnik wyceny z fazy sektora (boom drożej, spadek taniej). */
function getSectorValuationFactor(stock) {
    return weightedCycleValue(stock, 'val', 1);
}

function advanceSectorCycles() {
    for (const [sector, cycle] of Object.entries(macro.sectorCycles)) {
        cycle.quartersLeft--;
        if (cycle.quartersLeft > 0) continue;
        // Recesja przyspiesza wejście w spadek, ekspansja — w boom.
        let next = SECTOR_CYCLE_PHASES[cycle.phase].next;
        if (economyCycle.phase === 'recession' && next === 'boom' && Math.random() < 0.5) next = 'trough';
        cycle.phase = next;
        cycle.quartersLeft = getRandomIntInRange(...SECTOR_CYCLE_PHASES[next].length);
        if (next === 'boom' || next === 'decline') {
            logEvent(`${SECTOR_CYCLE_PHASES[next].icon} Sektor ${sector}: ${next === 'boom' ? 'zaczyna się boom' : 'koniunktura słabnie'}.`, 'market');
        }
    }
}

// =================================================================================
// WSKAŹNIKI (co kwartał, po advanceEconomyCycle)
// =================================================================================

function advanceMacroQuarter() {
    ensureMacroState();
    macro.quarter++;
    const gdpQuarter = Number(economyCycle?.gdpGrowth) || 0;
    macro.gdpAnnual = gdpQuarter * 4;

    // Inflacja: koniunktura (popyt), stopy (realna stopa ponad neutralną schładza), szoki — z bezwładnością.
    const realRateGap = (Number(centralBank.baseInterestRate) || 0.05) - (macro.inflation + NEUTRAL_REAL_RATE);
    const pressure = INFLATION_TARGET + ((Number(economyCycle.index) || 50) - 50) / 50 * 0.02 - realRateGap * 0.3 + macro.shocks.inflation;
    macro.inflation = clampValue(macro.inflation * 0.7 + pressure * 0.3 + gaussianRandom() * 0.002, -0.01, 0.15);
    macro.shocks.inflation *= 0.5;

    // Bezrobocie: prawo Okuna + powrót do naturalnej stopy.
    // 0.13: naturalne bezrobocie przesuwają ustawy i podaż pracy (względem ustawień startowych).
    const naturalRate = NATURAL_UNEMPLOYMENT + (typeof getSocietyUnemploymentShift === 'function' ? getSocietyUnemploymentShift() : 0);
    macro.unemployment = clampValue(macro.unemployment - (macro.gdpAnnual - 0.018) * 0.3 + (naturalRate - macro.unemployment) * 0.2 + gaussianRandom() * 0.002, 0.02, 0.2);

    if (typeof advanceSocietyQuarter === 'function') advanceSocietyQuarter(); // 0.13: kraj, rynek pracy, ustawy (society.js)

    advanceSectorCycles();
    advanceElectionCycle();

    macro.history.push({ inflation: macro.inflation, unemployment: macro.unemployment, gdp: macro.gdpAnnual, rate: centralBank.baseInterestRate });
    if (macro.history.length > MACRO_HISTORY_LIMIT) macro.history.shift();
}

function clampValue(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// =================================================================================
// POSIEDZENIE BANKU CENTRALNEGO
// =================================================================================

function getBcTraits() {
    return (centralBank.ceo?.traits || []).map(t => t.name);
}

/** Stopa docelowa wg reguły Taylora i charakteru prezesa. */
function getTaylorRate() {
    const traits = getBcTraits();
    let target = macro.inflation + NEUTRAL_REAL_RATE + 0.5 * (macro.inflation - INFLATION_TARGET) - 0.5 * (macro.unemployment - NATURAL_UNEMPLOYMENT);
    if (traits.includes('Jastrząb')) target += 0.005;
    if (traits.includes('Gołąb')) target -= 0.005;
    return clampValue(target, ...BC_RATE_LIMITS);
}

function roundRateStep(value) {
    return Math.round(value / 0.0025) * 0.0025;
}

/** Zmiana stopy, którą BC wybierze przy danym celu (bez losowości). */
function getPlannedRateChange(target) {
    const traits = getBcTraits();
    const step = traits.includes('Stabilizator') ? BC_MAX_STEP / 2 : BC_MAX_STEP;
    const gap = target - centralBank.baseInterestRate;
    if (Math.abs(gap) < 0.002) return 0;
    return roundRateStep(clampValue(gap, -step, step));
}

function describeRateChange(change) {
    if (change > 0) return `podwyżka o ${(change * 100).toFixed(2)} pkt proc.`;
    if (change < 0) return `obniżka o ${(-change * 100).toFixed(2)} pkt proc.`;
    return 'bez zmian';
}

/** Co kwartał: decyzja o stopach, reakcja rynku na niespodziankę, wydanie gazety. */
function runCentralBankMeeting() {
    ensureMacroState();
    const traits = getBcTraits();
    let change = getPlannedRateChange(getTaylorRate());
    let surpriseNote = '';
    if (traits.includes('Partyjniak') && Math.random() < 0.25) {
        change = roundRateStep(getRandomInRange(-BC_MAX_STEP, BC_MAX_STEP));
        surpriseNote = ' Decyzja zaskoczyła ekonomistów — komentatorzy mówią o naciskach politycznych.';
    }
    const before = centralBank.baseInterestRate;
    centralBank.baseInterestRate = clampValue(before + change, ...BC_RATE_LIMITS);
    change = centralBank.baseInterestRate - before;
    updateInterestRates();

    const expected = macro.expectation?.change || 0;
    const surprise = change - expected;
    if (Math.abs(surprise) >= 0.001) applyRateSurprise(surprise);

    macro.lastDecision = { change, rate: centralBank.baseInterestRate, expected, surprise, quarter: macro.quarter };

    // Oczekiwania analityków na następne posiedzenie (z szumem — nie zawsze trafne).
    const forecast = roundRateStep(clampValue(getPlannedRateChange(getTaylorRate()) + gaussianRandom() * 0.002, -BC_MAX_STEP, BC_MAX_STEP));
    macro.expectation = { change: forecast, label: describeRateChange(forecast) };

    publishRateDecision(change, expected, surpriseNote);
}

/** Niespodzianka: podwyżka ponad oczekiwania przecenia rynek (mocniej sektory wrażliwe na stopy). */
function applyRateSurprise(surprise) {
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt) continue;
        const sens = getSectorProfile(stock).rateSens;
        const effect = clampValue(-surprise * RATE_SURPRISE_IMPACT * sens * 10, -0.04, 0.04);
        if (Math.abs(effect) >= 0.002) applyPriceEffect(stock.symbol, effect, effect > 0 ? 'positive' : 'negative', 'market');
    }
}

function publishRateDecision(change, expected, note = '') {
    const rate = (centralBank.baseInterestRate * 100).toFixed(2);
    const verb = change > 0 ? 'podnosi' : change < 0 ? 'obniża' : 'utrzymuje';
    const surprise = Math.abs(change - expected) >= 0.001 ? ' To niespodzianka dla rynku!' : ' Decyzja zgodna z oczekiwaniami.';
    const body = `Bank Centralny ${verb} stopę referencyjną ${change ? 'do' : 'na poziomie'} ${rate}% (${describeRateChange(change)}; oczekiwano: ${describeRateChange(expected)}).${surprise}${note} `
        + `Inflacja ${(macro.inflation * 100).toFixed(1)}% (cel ${(INFLATION_TARGET * 100).toFixed(1)}%), bezrobocie ${(macro.unemployment * 100).toFixed(1)}%, PKB ${(macro.gdpAnnual * 100).toFixed(1)}% r/r. `
        + `Kredyty od ${(LOAN_INTEREST_RATE * 100).toFixed(2)}%, depozyty ${(DEPOSIT_INTEREST_RATE * 100).toFixed(2)}%. `
        + `Analitycy na kolejne posiedzenie oczekują: ${macro.expectation.label}.`;
    const subject = `📰 Gazeta Ekonomiczna: BC ${verb} stopy${change ? ` do ${rate}%` : ` (${rate}%)`}`;
    addMacroLog(`🏛️ ${subject.replace('📰 Gazeta Ekonomiczna: ', '')}`);
    if (typeof addMail === 'function') addMail({ sender: 'OBSER', subject, body, importance: change !== 0 || Math.abs(change - expected) >= 0.001 ? 3 : 2 });
    if (change !== 0) showToast(`Bank Centralny: ${describeRateChange(change)} (${rate}%)`, 'default', 6000);
}

/** Wpis do dziennika zdarzeń bez osobnego maila (mail wysyła gazeta). */
function addMacroLog(text) {
    eventLog.unshift({ text, category: 'state' });
    if (eventLog.length > MAX_LOG_ENTRIES) eventLog.pop();
}

/** Nowe runCentralBankAI: posiedzenie, rezerwy, wsparcie spółek państwowych. */
function runCentralBankAI() {
    if (!centralBank.ceo) generateCentralBankGovernor();
    runCentralBankMeeting();

    const traits = getBcTraits();
    let reserveChange = economyCycle.phase === 'overheating' ? 0.01 : economyCycle.phase === 'recession' ? -0.01 : 0;
    if (traits.includes('Regulator')) reserveChange += 0.005;
    if (traits.includes('Deregulator')) reserveChange -= 0.005;
    if (traits.includes('Stabilizator')) reserveChange *= 0.2;
    if (Math.abs(reserveChange) > 0.001 && Math.random() < 0.3) {
        centralBank.reserveRequirement = clampValue(centralBank.reserveRequirement + reserveChange, 0.05, 0.25);
        addMacroLog(`🏛️ Bank Centralny zmienia stopę rezerw obowiązkowych na ${(centralBank.reserveRequirement * 100).toFixed(0)}%.`);
    }
    if (Math.random() < Math.min(1, getRulingParty().subsidies * 0.5)) fundStateOwnedCompanies(); // dotacje zależą od partii rządzącej
}

// =================================================================================
// WYBORY I SPÓŁKI PAŃSTWOWE
// =================================================================================

// B4: fundusz może wesprzeć partię z pieniędzy funduszu (ryzyko KNF i wizerunku).
const ELECTION_DONATION_LIMIT = 0.02;   // łącznie do 2% aktywów funduszu na kampanię
const POLITICAL_FAVOR_QUARTERS = 8;

function getPoliticalFavor() {
    const favor = macro.election?.favor;
    return favor && favor.quartersLeft > 0 ? favor.sign : 0;
}

function supportElectionCampaign(partyId, amount) {
    const election = macro.election;
    amount = Math.floor(Number(amount));
    if (!RULING_PARTIES[partyId] || !playerFund) return false;
    if (!election.campaign) { showToast('Darowizny przyjmowane są tylko w trakcie kampanii.', 'warning'); return false; }
    election.donations = { market: 0, state: 0, people: 0, ...(election.donations || {}) };
    const assets = getFundAssets();
    const given = Object.values(election.donations).reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (!(amount >= 100)) { showToast('Minimalna darowizna: 100 zł.', 'warning'); return false; }
    if (given + amount > assets * ELECTION_DONATION_LIMIT) { showToast(`Limit: 2% aktywów funduszu na kampanię (zostało ${formatZl(Math.max(0, assets * ELECTION_DONATION_LIMIT - given), 0)}).`, 'warning'); return false; }
    if (playerCash < amount) { showToast('Za mało gotówki funduszu.', 'error'); return false; }
    playerCash -= amount;
    recordPayment('player-fund', `external:partia-${partyId}`, amount, `Darowizna: ${RULING_PARTIES[partyId].name}`);
    election.donations[partyId] = (Number(election.donations[partyId]) || 0) + amount;
    const share = amount / Math.max(1, assets);
    if (typeof getRecord === 'function') getRecord('player').suspicion += 5 + share * 1000;
    if (share > 0.005) playerFund.trust = Math.max(0, playerFund.trust - share * 300);
    logEvent(`🗳️ Fundusz przekazuje ${formatZl(amount, 0)} na kampanię: ${RULING_PARTIES[partyId].name}. Media pytają o pieniądze klientów.`, 'review');
    return true;
}

function settlePoliticalFavor() {
    const election = macro.election;
    const d = { market: 0, state: 0, people: 0, ...(election.donations || {}) };
    const total = Object.values(d).reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (total > 0) {
        const backed = Object.keys(d).sort((a, b) => d[b] - d[a])[0];
        const won = backed === election.ruling || backed === election.coalition?.partner;
        election.favor = { sign: won ? 1 : -1, quartersLeft: POLITICAL_FAVOR_QUARTERS };
        addMail({ sender: CORPORATION_SENDER, subject: won ? '🗳️ Wsparta partia wygrała wybory' : '🗳️ Wsparta partia przegrała wybory',
            body: won ? 'Nowa władza pamięta o wsparciu: łagodniejsze kontrole KNF i więcej kontraktów MON dla spółek funduszu przez 2 lata gry.'
                : 'Wygrani pamiętają, kogo wspierał fundusz: KNF przygląda się uważniej, kontrakty MON omijają spółki funduszu przez 2 lata gry.', importance: 2 });
    }
    election.donations = { market: 0, state: 0, people: 0 };
}

/** 0.13: wybory z poparciem liczonym z klas (3 partie), koalicja przy zwycięzcy < 40%. */
function advanceElectionCycle() {
    const election = macro.election;
    if (election.favor?.quartersLeft > 0) election.favor.quartersLeft--;
    election.quartersLeft--;
    if (election.quartersLeft === 1 && !election.campaign) {
        election.campaign = true;
        if (typeof computePartySupport === 'function') election.support = computePartySupport(false); // sondaże
        logEvent(`🗳️ Rusza kampania przed wyborami parlamentarnymi. Rządzi ${getRulingParty().name} — spółki państwowe pod lupą.`, 'state');
        return;
    }
    if (election.quartersLeft > 0) return;

    const previous = election.ruling;
    const result = resolveElection(computePartySupport(true));
    election.terms = result.winner === previous ? (Number(election.terms) || 1) + 1 : 1;
    election.ruling = result.winner;
    election.coalition = result.coalition;
    election.support = result.support;
    election.history = [...(election.history || []), { quarter: macro.quarter, winner: result.winner, coalition: result.coalition?.partner || null }].slice(-8);
    const change = previous !== result.winner;
    election.campaign = false;
    election.quartersLeft = ELECTION_INTERVAL_QUARTERS;
    settlePoliticalFavor();
    if (typeof drawEducationPriority === 'function') drawEducationPriority();
    const party = getRulingParty();
    const results = PARTY_IDS.map(id => `${RULING_PARTIES[id].name} ${result.support[id].toFixed(0)}%`).join(', ');
    logEvent(`🗳️ WYBORY: ${change ? `zmiana władzy — wygrywa ${RULING_PARTIES[result.winner].name}` : `${RULING_PARTIES[result.winner].name} utrzymuje władzę`}${result.coalition ? ` (koalicja z: ${RULING_PARTIES[result.coalition.partner].name})` : ''}. Wyniki: ${results}. ${party.nationalization > 1 ? 'Więcej dotacji i nacjonalizacji.' : 'Kurs na prywatyzację i mniej dotacji.'}`, 'state');
    if (change) {
        for (const stock of stocks.filter(s => s.isStateOwned && !s.isBankrupt)) {
            applyPriceEffect(stock.symbol, party.stateMood * 2, party.stateMood > 0 ? 'positive' : 'negative', 'market');
        }
    }
}

const STATE_COMPANY_EVENTS = [
    { id: 'st_subsidy', type: 'positive', text: 'Rząd dokapitalizowuje spółki Skarbu Państwa w ramach programu modernizacji.', price: 0.04, cashPct: 0.01 },
    { id: 'st_contract', type: 'positive', text: 'Spółki państwowe wygrywają duży kontrakt zagraniczny.', price: 0.05, health: 0.3 },
    { id: 'st_orders', type: 'positive', text: 'Agencje rządowe zwiększają zamówienia w spółkach państwowych.', price: 0.03, health: 0.2 },
    { id: 'st_noprivatization', type: 'positive', text: 'Skarb Państwa zapowiada, że nie sprzeda kluczowych spółek — inwestorzy odetchnęli.', price: 0.02 },
    { id: 'st_defense', type: 'positive', text: 'Program zbrojeniowy: państwowy przemysł dostaje wieloletnie zamówienia.', price: 0.05, sectors: ['Przemysł', 'Energia'] },
    { id: 'st_audit', type: 'negative', text: 'Najwyższa Izba Kontroli zapowiada audyt w spółkach Skarbu Państwa.', price: -0.03 },
    { id: 'st_politics', type: 'negative', text: 'Spory w rządzie i karuzela kadrowa w spółkach państwowych.', price: -0.04, health: -0.2 },
    { id: 'st_tax', type: 'negative', text: 'Rząd nakłada na spółki państwowe specjalną daninę na cele społeczne.', price: -0.03, cashPct: -0.01 },
    { id: 'st_dividend', type: 'negative', text: 'Skarb Państwa żąda dywidendy specjalnej, by załatać budżet.', price: -0.02, cashPct: -0.015 },
    { id: 'st_rating', type: 'negative', text: 'Agencje ratingowe obniżają perspektywę spółek państwowych.', price: -0.04 }
];

/** Zdarzenie spółek państwowych (pozytywne częściej, gdy rządzi Blok Państwowy). */
function triggerStateCompanyEventCycle() {
    const companies = stocks.filter(s => s.isStateOwned && !s.isBankrupt && !s.assetType);
    if (!companies.length) return null;
    const positiveChance = 0.5 + getRulingParty().stateMood * 5 + (macro.election.campaign ? 0.1 : 0);
    const event = pickMacroEvent(STATE_COMPANY_EVENTS.filter(e => (e.type === 'positive') === (Math.random() < positiveChance)));
    if (!event) return null;
    const targets = event.sectors ? companies.filter(s => s.sector?.some(sec => event.sectors.includes(sec))) : companies;
    for (const stock of targets.length ? targets : companies) {
        applyPriceEffect(stock.symbol, event.price * getRandomInRange(0.7, 1.3), event.type, 'market');
        if (event.health) stock.financialHealth = clampValue((Number(stock.financialHealth) || 0) + event.health, -5, 5);
        if (event.cashPct) {
            const amount = Math.round(getMarketCapValue(stock) * Math.abs(event.cashPct));
            if (event.cashPct > 0 && governmentTreasury >= amount) {
                governmentTreasury -= amount;
                adjustCompanyCash(stock, amount);
                adjustBalanceSheet(stock, { assets: amount, retainedEarnings: amount });
            } else if (event.cashPct < 0) {
                const paid = Math.min(amount, Math.max(0, stock.cash));
                adjustCompanyCash(stock, -paid);
                adjustBalanceSheet(stock, { assets: -paid, retainedEarnings: -paid });
                governmentTreasury += paid;
            }
        }
    }
    logEvent(`🏛️ ${event.text}`, 'state');
    return event;
}

// =================================================================================
// SZOKI MAKRO
// =================================================================================

const MACRO_SHOCK_EVENTS = [
    { id: 'oil', type: 'negative', text: '🛢️ Szok naftowy: ropa drożeje o 40%. Inflacja przyspiesza, transport i turystyka tracą, energetyka zyskuje.', inflation: 0.01, effects: { Energia: 0.06, Transport: -0.07, Turystyka: -0.06, Logistyka: -0.05, '*': -0.01 } },
    { id: 'currency', type: 'negative', text: '💱 Kryzys walutowy: złoty traci na wartości. Importerzy pod presją, eksporterzy korzystają.', inflation: 0.008, effects: { Przemysł: 0.03, Chemia: 0.02, 'Dobra konsumpcyjne': -0.05, '*': -0.01 } },
    { id: 'techboom', type: 'positive', text: '💻 Boom technologiczny: fundusze venture zalewają branżę pieniędzmi.', effects: { Technologia: 0.08, Gaming: 0.06, Badania: 0.05, '*': 0.01 } },
    { id: 'drought', type: 'negative', text: '🌵 Susza: słabe zbiory podbijają ceny żywności.', inflation: 0.004, effects: { Żywność: -0.06, Chemia: 0.02 } },
    { id: 'pandemic', type: 'negative', text: '🦠 Nowa fala grypy: ludzie zostają w domach. Medycyna zyskuje, turystyka i usługi tracą.', effects: { Medycyna: 0.07, Turystyka: -0.08, Usługi: -0.04, '*': -0.01 } },
    { id: 'export', type: 'positive', text: '🚢 Rekordowy eksport: zagraniczne zamówienia napędzają przemysł i logistykę.', effects: { Przemysł: 0.05, Logistyka: 0.05, Transport: 0.03, '*': 0.01 } },
    { id: 'housing', type: 'positive', text: '🏠 Rządowy program mieszkaniowy: rekordowy popyt na kredyty i mieszkania.', effects: { Nieruchomości: 0.06, Budowlany: 0.06, Bankowość: 0.03, '*': 0.01 } },
    { id: 'energyprices', type: 'positive', text: '⚡ Spadek cen energii: koszty firm maleją, inflacja hamuje.', inflation: -0.006, effects: { Energia: -0.04, Przemysł: 0.03, Chemia: 0.03, '*': 0.01 } }
];

/** Losuje zdarzenie, które nie wystąpiło niedawno. */
function pickMacroEvent(pool) {
    const fresh = pool.filter(event => !macro.recentEvents.includes(event.id));
    const event = getRandomElement(fresh.length ? fresh : pool);
    if (!event) return null;
    macro.recentEvents.unshift(event.id);
    macro.recentEvents.length = Math.min(macro.recentEvents.length, EVENT_COOLDOWN);
    return event;
}

function triggerMacroShockEvent() {
    const wantPositive = Math.random() < getCyclePositiveEventBias();
    const event = pickMacroEvent(MACRO_SHOCK_EVENTS.filter(e => (e.type === 'positive') === wantPositive));
    if (!event) return null;
    if (event.inflation) macro.shocks.inflation += event.inflation;
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt) continue;
        const sectorEffects = (stock.sector || []).map(sector => event.effects[sector]).filter(v => v !== undefined);
        const effect = sectorEffects.length ? Math.max(...sectorEffects.map(Math.abs)) * Math.sign(sectorEffects[0]) : event.effects['*'];
        if (effect) applyPriceEffect(stock.symbol, effect * getRandomInRange(0.8, 1.2), effect > 0 ? 'positive' : 'negative', 'market');
    }
    logEvent(event.text, 'state');
    return event;
}

/** Szkolenie „Szósty zmysł”: przeczucie, który sektor wchodzi w boom lub spadek. */
function triggerSixthSenseEvent() {
    const turning = Object.entries(macro.sectorCycles).filter(([, cycle]) => cycle.quartersLeft <= 1 && ['trough', 'peak'].includes(cycle.phase));
    if (!turning.length) return;
    const [sector, cycle] = getRandomElement(turning);
    showToast(`🔮 Szósty zmysł: sektor ${sector} ${cycle.phase === 'trough' ? 'wkrótce odbije' : 'jest blisko szczytu'}…`, 'default', 8000);
}

// =================================================================================
// ZAUFANIE KLIENTÓW: wynik vs lokata i inflacja
// =================================================================================

/** Kara do zaufania, gdy fundusz przegrywa z lokatą lub inflacją w bieżącym okresie. */
function getMacroTrustPenalty(fundReturn, elapsedMs) {
    const years = Math.max(0, elapsedMs) / (BASE_DELAYS.quarterly * 4);
    if (years <= 0.05) return 0;
    const hurdle = Math.max(getDepositRate(), macro.inflation) * years;
    const shortfall = hurdle - fundReturn;
    return shortfall > 0 ? Math.min(15, shortfall * 300) : 0;
}

// #################################################################################
// ## society.js
// #################################################################################

// society.js — Społeczeństwo i rynek pracy (wersja 0.13, części S1, S3, S5)
//
// Kraj (miliony mieszkańców) z 6 klasami zamożności, edukacją, migracją i zdarzeniami demograficznymi.
// Struktura klas daje indeks popytu (wzrost przychodów sektorów konsumenckich). Rynek pracy: realne indeksy
// płac 5 grup (krzywa Phillipsa), niedobór specjalistów zależny od edukacji, migracja według atrakcyjności
// kraju. Państwo: ustawy (płaca minimalna, zasiłki, mieszkania socjalne, prawa pracownicze), budżet
// i skutki deficytu, trzy partie (Ludowcy), poparcie liczone z klas i koalicje.
//
// Zasada kalibracji: przy ustawieniach startowych (popyt 1,0, płace 1,0, ustawy na poziomie startowym)
// nic nie zmienia wyników spółek względem 0.12 — nowe systemy tylko odchylają wynik od tej bazy.

const SOCIETY_CLASSES = [
    { id: 'poor',     name: 'Biedna',         start: 0.22, weight: 0.6,  icon: '🥖', sectors: ['Żywność', 'Usługi'] },
    { id: 'lowerMid', name: 'Średnia niższa', start: 0.26, weight: 0.85, icon: '🧺', sectors: ['Żywność', 'Dobra konsumpcyjne'] },
    { id: 'mid',      name: 'Średnia',        start: 0.24, weight: 1.0,  icon: '🏠', sectors: ['Dobra konsumpcyjne', 'Gaming', 'Usługi'] },
    { id: 'upperMid', name: 'Średnia wyższa', start: 0.15, weight: 1.3,  icon: '✈️', sectors: ['Turystyka', 'Gaming', 'Nieruchomości'] },
    { id: 'rich',     name: 'Zamożna',        start: 0.10, weight: 1.8,  icon: '🛥️', sectors: ['Turystyka', 'Nieruchomości', 'Finanse'] },
    { id: 'veryRich', name: 'Bardzo zamożna', start: 0.03, weight: 3.0,  icon: '💎', sectors: ['Nieruchomości', 'Finanse'] }
];

// Elastyczność przychodów sektora względem indeksu popytu (dobra luksusowe > 1, podstawowe < 1).
const DEMAND_ELASTICITY = { 'Turystyka': 1.5, 'Gaming': 1.3, 'Nieruchomości': 1.2, 'Dobra konsumpcyjne': 1.0, 'Usługi': 0.8, 'Media': 0.6, 'Żywność': 0.3 };
const DEMAND_GROWTH_SCALE = 0.02;           // +(popyt − 1) × elastyczność × 2 pp na kwartał
const POPULATION_NATURAL_GROWTH = 0.0005;   // +0,05% na kwartał
const CLASS_MOBILITY_LIMIT = 0.008;         // ±0,8% udziału klasy na kwartał
const CLASS_REVERSION = 0.03;               // pokoleniowa wymiana: powolny powrót do struktury startowej
const EDUCATION_TARGETS = { low: 45, medium: 60, high: 75 };
const EDUCATION_LABELS = { low: 'niski', medium: 'średni', high: 'wysoki' };
const SPECIALIST_SHORTAGE_SECTORS = ['Technologia', 'Badania', 'Medycyna'];
const SOCIETY_HISTORY_LIMIT = 16;

// Grupy zatrudnienia (płace jako indeksy realne — bez inflacji, ta jest już w przychodach).
const WORKFORCE_GROUPS = [
    { id: 'board',       name: 'Dyrekcja i zarząd' },
    { id: 'specialists', name: 'Specjaliści' },
    { id: 'workers',     name: 'Pracownicy' },
    { id: 'cheap',       name: 'Tania siła robocza' },
    { id: 'grey',        name: 'Szara strefa' }
];

// Zdarzenia demograficzne (szansa na rok). Fala emigracji jest wyzwalana przez migrację (S3).
const DEMOGRAPHIC_EVENTS = [
    { id: 'epidemic', chance: 0.04, icon: '🦠', name: 'Epidemia', population: -0.003,
      text: 'Epidemia: szpitale pełne, ludzie zostają w domach. Turystyka traci, medycyna zyskuje.',
      revenue: { 'Turystyka': -0.10, 'Medycyna': 0.05 }, quarters: 2 },
    { id: 'babyBoom', chance: 0.05, icon: '👶', name: 'Wyż demograficzny', populationPerQuarter: 0.002, quarters: 4, education: -1,
      text: 'Wyż demograficzny: rodzi się więcej dzieci. Rośnie popyt na mieszkania, szkoły są przepełnione.',
      growth: { 'Nieruchomości': 0.003 } },
    { id: 'refugees', chance: 0.04, icon: '🧳', name: 'Napływ imigrantów', population: 0.008,
      text: 'Napływ imigrantów i uchodźców: więcej taniej siły roboczej, wyższe wydatki państwa.' },
    { id: 'disaster', chance: 0.03, icon: '🌊', name: 'Klęska żywiołowa', population: -0.001,
      text: 'Klęska żywiołowa: powódź niszczy uprawy i domy. Budowlanka ma pracę przy odbudowie, żywność drożeje.',
      revenue: { 'Budowlany': 0.06, 'Żywność': -0.05 }, quarters: 2 }
];

// Ustawy: poziomy i start (ustawienia startowe = kalibracja 0.12).
const SOCIAL_LAWS = {
    minWage:  { name: 'Płaca minimalna',      icon: '💵', levels: ['brak', 'niska', 'średnia', 'wysoka'], start: 1 },
    benefits: { name: 'Zasiłki',              icon: '🤲', levels: ['brak', 'niskie', 'średnie', 'wysokie'], start: 1 },
    housing:  { name: 'Mieszkania socjalne',  icon: '🏘️', levels: ['brak', 'program', 'duży program'], start: 1 },
    rights:   { name: 'Prawa pracownicze',    icon: '⚖️', levels: ['liberalne', 'standardowe', 'ochronne'], start: 1 }
};
const MIN_WAGE_STEP = 0.04;          // płace pracowników i taniej siły +4% na poziom
const HOUSING_PROGRAM_QUARTERS = 8;
const RIGHTS_SATISFACTION = [0, 5, 10];
const RIGHTS_UNION_MULT = [0.7, 1, 1.5];

// Programy partii: kierunek zmian ustaw i priorytet edukacji.
const PARTY_PROGRAMS = {
    market: { moves: [['minWage', -1], ['benefits', -1], ['housing', -1], ['rights', -1]], education: 'high', deficit: 'cut' },
    state:  { moves: [['rights', 1], ['housing', 1]], education: 'high', deficit: 'cit' },
    people: { moves: [['minWage', 1], ['benefits', 1], ['housing', 1]], education: 'medium', deficit: 'cit' }
};
// Preferencje wyborcze klas: [Ludowcy, Blok Państwowy, Koalicja Rynkowa].
const CLASS_VOTE = { poor: [50, 35, 15], lowerMid: [35, 35, 30], mid: [20, 35, 45], upperMid: [10, 30, 60], rich: [5, 20, 75], veryRich: [5, 15, 80] };
const PARTY_IDS = ['people', 'state', 'market'];
const COALITION_THRESHOLD = 0.40;
const ELECTION_FATIGUE = 5;          // pp na każdą kadencję u władzy
const ELECTION_BAD_TIMES = 10;       // pp przy złej koniunkturze
const PROTEST_TO_PEOPLE = 0.75;      // część odpływu od rządzących, która trafia do Ludowców
const DEFICIT_BOND_QUARTERS = 4;
const DEFICIT_BOND_PREMIUM = 0.0025;
const DEFICIT_ACTION_QUARTERS = 8;
const DEFICIT_CIT_STEP = 0.02;

let society = createSocietyState();

function createSocietyState() {
    const classes = Object.fromEntries(SOCIETY_CLASSES.map(c => [c.id, c.start]));
    const laws = Object.fromEntries(Object.entries(SOCIAL_LAWS).map(([id, law]) => [id, law.start]));
    const state = {
        population: Math.round(getRandomInRange(36e6, 40e6)),
        classes,
        demandIndex: 1,
        education: 55,
        educationPriority: 'medium',
        migration: { last: 0, attractiveness: 55, lowQuarters: 0, emigrationWaves: 0 },
        wages: Object.fromEntries(WORKFORCE_GROUPS.map(g => [g.id, 1])),
        wageHistory: [],
        shortage: 1,
        specDemandScale: null,
        specialistSupplyAdj: 1,
        priceLevel: 1,
        laws,
        pendingLaw: null,
        lawChanges: {},
        lawTimer: getRandomIntInRange(2, 4),
        housingProgram: 0,
        budget: { balance: 0, extraSpending: 0, publicServices: 0, deficitQuarters: 0, socialSpending: 0, greyTaxLoss: 0, bondPremium: 0, citAdd: 0, deficitActed: false },
        events: [],              // aktywne zdarzenia: { id, quartersLeft }
        lastEvent: null,
        support: { people: 27, state: 32, market: 41 },
        quarter: 0,
        history: [],
        report: []               // wpisy do kwartalnego raportu (jeden mail na kwartał)
    };
    state.demandBase = computeRawDemand(state);
    return state;
}

function ensureSocietyState() {
    const fresh = createSocietyState();
    if (!society || typeof society !== 'object') society = fresh;
    society = { ...fresh, ...society };
    society.classes = { ...fresh.classes, ...(society.classes || {}) };
    society.laws = { ...fresh.laws, ...(society.laws || {}) };
    society.wages = { ...fresh.wages, ...(society.wages || {}) };
    society.migration = { ...fresh.migration, ...(society.migration || {}) };
    society.budget = { ...fresh.budget, ...(society.budget || {}) };
    for (const key of ['events', 'history', 'report', 'wageHistory']) if (!Array.isArray(society[key])) society[key] = [];
    if (!society.lawChanges || typeof society.lawChanges !== 'object') society.lawChanges = {};
    if (!(society.demandBase > 0)) society.demandBase = fresh.demandBase;
    return society;
}

// =================================================================================
// S1: KLASY, POPYT, EDUKACJA, DEMOGRAFIA
// =================================================================================

/** Waga konsumpcji klasy (zasiłki podnoszą konsumpcję biednych o 0,1 na poziom ponad start). */
function getClassWeight(cls, state = society) {
    const benefits = (Number(state?.laws?.benefits) || 0) - SOCIAL_LAWS.benefits.start;
    return cls.weight + (cls.id === 'poor' ? 0.1 * benefits : 0);
}

function computeRawDemand(state = society) {
    return SOCIETY_CLASSES.reduce((sum, cls) => sum + (Number(state.classes?.[cls.id]) || 0) * getClassWeight(cls, state), 0);
}

/** Indeks popytu: Σ(udział × waga) / wartość startowa (start = 1,00). */
function getDemandIndex(state = society) {
    if (!state) return 1;
    return computeRawDemand(state) / (state.demandBase || 1);
}

function getSocietySectorList(stock) {
    return Array.isArray(stock?.sector) ? stock.sector : [];
}

/** Dodatek do kwartalnego wzrostu przychodów: popyt (sektory konsumenckie), niedobór specjalistów, wyż. */
function getSocietyGrowthAdj(stock) {
    if (typeof society !== 'object' || !society) return 0;
    const sectors = getSocietySectorList(stock);
    if (!sectors.length) return 0;
    const demand = society.demandIndex - 1;
    const shortage = Math.max(0, (Number(society.shortage) || 1) - 1);
    let total = 0;
    for (const sector of sectors) {
        let adj = demand * (DEMAND_ELASTICITY[sector] || 0) * DEMAND_GROWTH_SCALE;
        if (SPECIALIST_SHORTAGE_SECTORS.includes(sector)) adj -= shortage / 0.1 * 0.001;
        for (const event of society.events) {
            const def = DEMOGRAPHIC_EVENTS.find(e => e.id === event.id);
            if (def?.growth?.[sector]) adj += def.growth[sector];
        }
        if (society.housingProgram > 0 && (sector === 'Budowlany' || sector === 'Nieruchomości')) adj += 0.003;
        total += adj;
    }
    return total / sectors.length;
}

/** Jednorazowy mnożnik przychodów kwartału (epidemia, klęska) — nie zmienia bazy przychodów. */
function getSocietyRevenueFactor(stock) {
    if (typeof society !== 'object' || !society?.events?.length) return 1;
    const sectors = getSocietySectorList(stock);
    if (!sectors.length) return 1;
    let effect = 0;
    for (const event of society.events) {
        const def = DEMOGRAPHIC_EVENTS.find(e => e.id === event.id);
        if (!def?.revenue) continue;
        const values = sectors.map(sector => def.revenue[sector]).filter(v => v !== undefined);
        if (values.length) effect += values.reduce((a, b) => a + b, 0) / sectors.length;
    }
    return Math.max(0.5, 1 + effect);
}

/** Przesuwa udziały klas o jeden szczebel (s > 0 w górę, s < 0 w dół) i dodaje przesunięcia ustaw. */
function applyClassMobility(state, s, poorUp = 0) {
    const ids = SOCIETY_CLASSES.map(c => c.id);
    const shares = ids.map(id => Number(state.classes[id]) || 0);
    const next = [...shares];
    if (s > 0) {
        for (let i = 0; i < shares.length - 1; i++) { const moved = shares[i] * s; next[i] -= moved; next[i + 1] += moved; }
    } else if (s < 0) {
        for (let i = 1; i < shares.length; i++) { const moved = shares[i] * -s; next[i] -= moved; next[i - 1] += moved; }
    }
    if (poorUp > 0) { const moved = next[0] * poorUp; next[0] -= moved; next[1] += moved; }
    // Wymiana pokoleń: powolny powrót do struktury startowej (bez dryfu do 0 albo 50%).
    SOCIETY_CLASSES.forEach((cls, i) => { next[i] += (cls.start - next[i]) * CLASS_REVERSION; });
    const total = next.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    ids.forEach((id, i) => { state.classes[id] = Math.max(0, next[i]) / total; });
}

/** Dopisuje udział do klasy biednej (imigracja) i normalizuje sumę do 100%. */
function addToPoorClass(share) {
    society.classes.poor += Math.max(0, share);
    const total = Object.values(society.classes).reduce((a, b) => a + b, 0) || 1;
    for (const id of Object.keys(society.classes)) society.classes[id] /= total;
}

/** Przesunięcie klas z gospodarki: PKB, bezrobocie, inflacja. */
function getClassMobilityShift() {
    const gdp = Number(macro?.gdpAnnual) || 0;
    const unemployment = Number(macro?.unemployment) || NATURAL_UNEMPLOYMENT;
    const inflation = Number(macro?.inflation) || INFLATION_TARGET;
    return clampValue((gdp - 0.02) * 0.4 - (unemployment - 0.06) * 0.5 - (inflation - INFLATION_TARGET) * 0.2, -CLASS_MOBILITY_LIMIT, CLASS_MOBILITY_LIMIT);
}

/** Wpis do dziennika bez osobnego maila (trafia do kwartalnego raportu kraju). */
function logSociety(text, category = 'state') {
    if (typeof eventLog !== 'undefined') {
        eventLog.unshift({ text, category });
        if (typeof MAX_LOG_ENTRIES !== 'undefined' && eventLog.length > MAX_LOG_ENTRIES) eventLog.pop();
    }
    if (society) {
        society.report.push(text.slice(0, 200));
        if (society.report.length > 20) society.report.shift();
    }
}

function triggerDemographicEvent(def) {
    society.lastEvent = { id: def.id, quarter: society.quarter };
    if (def.population) society.population = Math.round(society.population * (1 + def.population));
    if (def.education) society.education = clampValue(society.education + def.education, 0, 100);
    if (def.quarters) {
        society.events = society.events.filter(e => e.id !== def.id);
        society.events.push({ id: def.id, quartersLeft: def.quarters });
    }
    if (def.id === 'refugees') {
        addToPoorClass(0.004); // imigranci zasilają głównie klasę biedną
        society.wages.cheap = Math.max(0.8, society.wages.cheap - 0.01);
        const cost = Math.round(Math.max(0, (society.budget.taxBase || 0) * 0.1));
        governmentTreasury -= cost;
        society.budget.extraSpending = (Number(society.budget.extraSpending) || 0) + cost;
    }
    if (def.id === 'disaster' && typeof applyPriceEffect === 'function' && typeof stocks !== 'undefined') {
        for (const stock of stocks) {
            if (stock.assetType || stock.isBankrupt) continue;
            if (stock.sector?.includes('Budowlany')) applyPriceEffect(stock.symbol, 0.03, 'positive', 'market');
            else if (stock.sector?.includes('Żywność')) applyPriceEffect(stock.symbol, -0.03, 'negative', 'market');
        }
    }
    logSociety(`${def.icon} ${def.text}`);
}

function processDemographicEvents() {
    society.events.forEach(event => {
        const def = DEMOGRAPHIC_EVENTS.find(e => e.id === event.id);
        if (def?.populationPerQuarter) society.population = Math.round(society.population * (1 + def.populationPerQuarter));
        event.quartersLeft--;
    });
    society.events = society.events.filter(event => event.quartersLeft > 0);
    for (const def of DEMOGRAPHIC_EVENTS) {
        if (society.events.some(e => e.id === def.id)) continue;
        if (Math.random() < def.chance / 4) { triggerDemographicEvent(def); break; } // najwyżej jedno nowe zdarzenie na kwartał
    }
}

/** Edukacja dryfuje ±1 na kwartał w stronę celu wynikającego z priorytetu państwa. */
function advanceEducation() {
    const target = EDUCATION_TARGETS[society.educationPriority] ?? EDUCATION_TARGETS.medium;
    const gap = target - society.education;
    society.education = clampValue(society.education + clampValue(gap, -1, 1) * (Math.abs(gap) < 1 ? 1 : getRandomInRange(0.5, 1)), 0, 100);
}

/** Priorytet edukacji na kadencję: zwykle program partii rządzącej, czasem inaczej. */
function drawEducationPriority() {
    const program = PARTY_PROGRAMS[macro?.election?.ruling]?.education || 'medium';
    society.educationPriority = Math.random() < 0.6 ? program : getRandomElement(Object.keys(EDUCATION_TARGETS));
}

/** Miasto rośnie razem z krajem (tempo krajowe co kwartał; składnik lokalny bez zmian). */
function growCityWithCountry(growthRate) {
    if (typeof city !== 'object' || !city || !Number.isFinite(city.population)) return;
    city.population = Math.max(1000, Math.round(city.population * (1 + growthRate)));
}

/** Co kwartał (z advanceMacroQuarter): demografia, klasy, popyt, rynek pracy, ustawy i budżet. */
function advanceSocietyQuarter() {
    ensureSocietyState();
    society.quarter++;
    society.report = [];
    const before = society.population;
    society.priceLevel *= 1 + (Number(macro?.inflation) || 0) / 4;

    society.population = Math.round(society.population * (1 + POPULATION_NATURAL_GROWTH));
    processDemographicEvents();
    if (typeof advanceLaborMarket === 'function') advanceLaborMarket();      // S3: płace, niedobór, migracja
    if (typeof advanceSocialPolicy === 'function') advanceSocialPolicy();    // S5: ustawy, budżet

    const poorUp = typeof getLawPoorMobility === 'function' ? getLawPoorMobility() : 0;
    applyClassMobility(society, getClassMobilityShift(), poorUp);
    society.demandIndex = getDemandIndex();
    advanceEducation();

    const growth = before > 0 ? society.population / before - 1 : 0;
    society.lastGrowth = growth;
    growCityWithCountry(growth);

    society.history.push({
        quarter: society.quarter, population: society.population, demand: society.demandIndex, education: society.education,
        poor: society.classes.poor, migration: society.migration.last, shortage: society.shortage, wages: { ...society.wages }
    });
    if (society.history.length > SOCIETY_HISTORY_LIMIT) society.history.shift();
}

/** Strukturalna zmiana bezrobocia względem startu (ustawy, podaż pracy) — wołane w advanceMacroQuarter. */
function getSocietyUnemploymentShift() {
    if (typeof society !== 'object' || !society) return 0;
    const laws = society.laws || {};
    const minWage = ((Number(laws.minWage) || 0) - SOCIAL_LAWS.minWage.start) * 0.002;
    const benefits = ((Number(laws.benefits) || 0) - SOCIAL_LAWS.benefits.start) * 0.001;
    const supply = clampValue(((Number(society.lastGrowth) || POPULATION_NATURAL_GROWTH) - POPULATION_NATURAL_GROWTH) * 1, -0.002, 0.002);
    return minWage + benefits + supply;
}

function formatPopulation(value) {
    return `${(value / 1e6).toFixed(2).replace('.', ',')} mln`;
}

// =================================================================================
// S3: RYNEK PRACY — płace (krzywa Phillipsa), niedobór specjalistów, migracja
// =================================================================================

const LABOR_FORCE_SHARE = 0.5;
const WAGE_REVERSION = 0.05;           // realne płace wracają do produktywności (indeks 1,0 lub podłoga płacy minimalnej)
const WAGE_LIMITS = [0.7, 1.6];
const SPECIALIST_SHORTAGE_START = 0.97;
const SPECIALIST_ADAPTATION = 0.1;

function getSpecialistSupply() {
    const education = clampValue(Number(society.education) || 55, 0, 100);
    return society.population * LABOR_FORCE_SHARE * (0.10 + education / 100 * 0.25) * (Number(society.specialistSupplyAdj) || 1);
}

/** Popyt spółek na specjalistów jako indeks względem ich zatrudnienia na starcie (debiuty nie zawyżają popytu). */
function getSpecialistDemandIndex() {
    if (typeof stocks === 'undefined' || typeof getWorkforceGroupCounts !== 'function') return 1;
    let now = 0, start = 0;
    for (const stock of stocks) {
        const wf = stock.workforce;
        if (!wf || stock.isBankrupt || !(wf.employeesStart > 0)) continue;
        now += getWorkforceGroupCounts(stock).specialists;
        start += wf.employeesStart * (wf.base.specialists || 0);
    }
    return start > 0 ? now / start : 1;
}

/**
 * Niedobór = popyt na specjalistów / podaż (oba jako indeksy względem startu; na starcie ~0,97).
 * Podaż zależy od populacji, edukacji i drenażu mózgów. Rynek się dostosowuje (szkolenia, automatyzacja):
 * luka zamyka się o 10% na kwartał, więc trwały niedobór daje dopiero długi spadek edukacji albo emigracja.
 */
function updateSpecialistShortage() {
    const supply = getSpecialistSupply();
    if (!(supply > 0)) return society.shortage;
    if (!(society.specSupplyStart > 0)) society.specSupplyStart = supply;
    if (!(society.specDemandScale > 0)) society.specDemandScale = 1;
    society.shortage = SPECIALIST_SHORTAGE_START * getSpecialistDemandIndex() / (supply / society.specSupplyStart) * society.specDemandScale;
    society.specDemandScale *= 1 + SPECIALIST_ADAPTATION * (SPECIALIST_SHORTAGE_START - society.shortage) / SPECIALIST_SHORTAGE_START;
    return society.shortage;
}

/** Podłoga płac pracowników i taniej siły z płacy minimalnej (względem poziomu startowego). */
function getMinWageFloor() {
    return 1 + MIN_WAGE_STEP * ((Number(society.laws?.minWage) || 0) - SOCIAL_LAWS.minWage.start);
}

function getAverageWageIndex() {
    const weights = { board: 0.03, specialists: 0.25, workers: 0.5, cheap: 0.2, grey: 0.02 };
    return Object.entries(weights).reduce((sum, [id, w]) => sum + (Number(society.wages[id]) || 1) * w, 0);
}

/** Indeksy płac realnych 5 grup: krzywa Phillipsa, niedobór, imigracja, płaca minimalna. */
function advanceWages() {
    const unemployment = Number(macro?.unemployment) || NATURAL_UNEMPLOYMENT;
    const phillips = 0.5 * (NATURAL_UNEMPLOYMENT - unemployment) / 4;   // realnie: inflacja jest już w przychodach
    const floor = getMinWageFloor();
    const shortage = updateSpecialistShortage();
    const immigration = (Number(society.migration.last) || 0) > 0.0015;
    for (const group of WORKFORCE_GROUPS) {
        if (group.id === 'grey') continue;
        let w = Number(society.wages[group.id]) || 1;
        const anchor = group.id === 'workers' || group.id === 'cheap' ? Math.max(1, floor) : 1;
        w += phillips - (w - anchor) * WAGE_REVERSION;
        if (group.id === 'specialists' && shortage > 1) w += clampValue(0.02 * (shortage - 1) / 0.1, 0, 0.03);
        if (group.id === 'cheap' && immigration) w -= 0.005;
        if (group.id === 'workers' || group.id === 'cheap') w = Math.max(w, floor);
        society.wages[group.id] = clampValue(w, ...WAGE_LIMITS);
    }
    society.wages.grey = society.wages.cheap;

    // Sprzężenie z inflacją: realny wzrost płac powyżej 2% rocznie → inflacja +0,1 pp.
    society.wageHistory.push(getAverageWageIndex());
    if (society.wageHistory.length > 5) society.wageHistory.shift();
    const yearAgo = society.wageHistory.length >= 5 ? society.wageHistory[0] : null;
    if (yearAgo && getAverageWageIndex() / yearAgo - 1 > 0.02 && macro?.shocks) macro.shocks.inflation += 0.001;
}

/** Atrakcyjność kraju 0–100: zadowolenie pracowników, realne płace, bezrobocie. */
function getCountryAttractiveness() {
    const satisfaction = typeof getAverageSatisfaction === 'function' ? getAverageSatisfaction() : 60;
    const unemployment = Number(macro?.unemployment) || NATURAL_UNEMPLOYMENT;
    return clampValue(0.4 * satisfaction + 0.3 * 50 * getAverageWageIndex() + 0.3 * (100 - unemployment * 500), 0, 100);
}

function advanceMigration() {
    const m = society.migration;
    const attractiveness = getCountryAttractiveness();
    m.attractiveness = attractiveness;
    const net = Math.round((attractiveness - 50) * 0.00004 * society.population);
    society.population += net;
    m.last = net / Math.max(1, society.population);
    m.lastPeople = net;
    if (net > 0) addToPoorClass(m.last * 0.6); // imigranci: głównie klasa biedna i tania siła robocza
    m.lowQuarters = attractiveness < 40 ? m.lowQuarters + 1 : 0;
    if (m.lowQuarters >= 4) {
        m.lowQuarters = 0;
        m.emigrationWaves = (m.emigrationWaves || 0) + 1;
        society.population = Math.round(society.population * 0.995);
        society.specialistSupplyAdj = Math.max(0.7, (Number(society.specialistSupplyAdj) || 1) * 0.97); // drenaż mózgów
        society.lastEvent = { id: 'emigration', quarter: society.quarter };
        logSociety('✈️ Fala emigracji: kraj od roku traci atrakcyjność, wyjeżdżają głównie specjaliści. Niedobór talentów rośnie.');
        if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('drenaz');
    }
}

function advanceLaborMarket() {
    advanceWages();
    advanceMigration();
}

// =================================================================================
// S5: USTAWY, BUDŻET PAŃSTWA, PARTIE I WYBORY
// =================================================================================

const LAW_ANNOUNCEMENT_EFFECTS = {
    minWage:  { 1: { 'Żywność': -0.015, 'Usługi': -0.02, 'Turystyka': -0.02, 'Budowlany': -0.015 }, '-1': { 'Usługi': 0.01, 'Turystyka': 0.01, 'Budowlany': 0.01 } },
    benefits: { 1: { 'Żywność': 0.015, 'Dobra konsumpcyjne': 0.015 }, '-1': { 'Żywność': -0.01, 'Dobra konsumpcyjne': -0.01 } },
    housing:  { 1: { 'Budowlany': 0.04, 'Nieruchomości': 0.03 }, '-1': { 'Budowlany': -0.03, 'Nieruchomości': -0.02 } },
    rights:   { 1: { 'Przemysł': -0.01, 'Budowlany': -0.01, 'Usługi': -0.01 }, '-1': { 'Przemysł': 0.01, 'Budowlany': 0.01, 'Usługi': 0.01 } }
};

/** Przesunięcia biednych do średniej niższej z ustaw (na kwartał). */
function getLawPoorMobility() {
    const laws = society?.laws || {};
    return 0.002 * (Number(laws.minWage) || 0) + 0.0015 * (Number(laws.housing) || 0);
}

function describeLawLevel(lawId, level = society.laws[lawId]) {
    return SOCIAL_LAWS[lawId]?.levels[level] ?? String(level);
}

/** Partia, która zmienia ustawy (w koalicji — silniejsza). */
function getLawMakingParty() {
    return macro?.election?.ruling || 'market';
}

function pickLawChange(partyId = getLawMakingParty()) {
    const program = PARTY_PROGRAMS[partyId] || PARTY_PROGRAMS.market;
    const options = program.moves.filter(([law, delta]) => {
        const level = Number(society.laws[law]) || 0;
        return level + delta >= 0 && level + delta < SOCIAL_LAWS[law].levels.length;
    });
    return options.length ? getRandomElement(options) : null;
}

/** Zapowiedź zmiany ustawy kwartał wcześniej: rynek reaguje na zapowiedź (dyskontowanie). */
function announceLawChange(law, delta, partyId = getLawMakingParty(), reason = '') {
    const from = Number(society.laws[law]) || 0;
    society.pendingLaw = { law, delta, from, to: from + delta, party: partyId, effectiveQuarter: society.quarter + 1, reason };
    const effects = LAW_ANNOUNCEMENT_EFFECTS[law]?.[delta > 0 ? 1 : '-1'] || {};
    if (typeof stocks !== 'undefined' && typeof applyPriceEffect === 'function') {
        for (const stock of stocks) {
            if (stock.assetType || stock.isBankrupt) continue;
            const values = (stock.sector || []).map(sector => effects[sector]).filter(v => v !== undefined);
            if (values.length) {
                applyPriceEffect(stock.symbol, values[0] * getRandomInRange(0.8, 1.2), values[0] > 0 ? 'positive' : 'negative', 'market');
                if (values[0] > 0 && law === 'housing' && typeof noteMentorEvent === 'function' && typeof playerPortfolio !== 'undefined' && playerPortfolio[stock.symbol]?.shares > 0) noteMentorEvent('lawAnnouncement', stock);
            }
        }
    }
    society.lastAnnouncement = { ...society.pendingLaw, quarter: society.quarter };
    logSociety(`📜 Zapowiedź ustawy: ${SOCIAL_LAWS[law].icon} ${SOCIAL_LAWS[law].name} — ${describeLawLevel(law, from)} → ${describeLawLevel(law, from + delta)} od przyszłego kwartału (${RULING_PARTIES[partyId]?.name || 'rząd'}${reason ? `, ${reason}` : ''}). Rynek dyskontuje zapowiedź.`);
    const affected = Object.keys(effects);
    if (typeof unlockAcademyEntry === 'function' && typeof playerPortfolio !== 'undefined' && stocks.some(s => (playerPortfolio[s.symbol]?.shares || 0) > 0 && s.sector?.some(sec => affected.includes(sec)))) unlockAcademyEntry('zapowiedz');
}

function applyPendingLaw() {
    const pending = society.pendingLaw;
    if (!pending || pending.effectiveQuarter > society.quarter) return null;
    society.pendingLaw = null;
    const law = pending.law;
    society.laws[law] = clampValue(pending.to, 0, SOCIAL_LAWS[law].levels.length - 1);
    society.lawChanges[law] = (society.lawChanges[law] || 0) + 1;
    if (law === 'housing' && pending.delta > 0) society.housingProgram = HOUSING_PROGRAM_QUARTERS;
    if (law === 'housing' && society.laws.housing === 0) society.housingProgram = 0;
    if (law === 'minWage' && pending.delta > 0) {
        const floor = getMinWageFloor();
        for (const id of ['workers', 'cheap']) society.wages[id] = Math.max(society.wages[id], floor);
        society.wages.grey = society.wages.cheap;
        if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('placaMinimalna');
    }
    logSociety(`📜 Weszła w życie ustawa: ${SOCIAL_LAWS[law].icon} ${SOCIAL_LAWS[law].name} — ${describeLawLevel(law)}.`);
    return pending;
}

/** Program mieszkań socjalnych: kontrakty dla budowlanki i deweloperów (istniejący system przetargów). */
function commissionSocialHousing() {
    if (typeof getInvestmentCatalogForCompany !== 'function' || typeof startCompanyInvestment !== 'function') return null;
    const candidates = stocks
        .filter(s => !s.assetType && !s.isBankrupt && (s.sector || []).includes('Nieruchomości'))
        .map(stock => ({ stock, options: getInvestmentCatalogForCompany(stock).filter(item => CONSTRUCTION_KINDS.includes(item.kind) && (Number(stock.departments?.development?.level) || 0) >= item.minDevLevel) }))
        .filter(item => item.options.length)
        .sort((a, b) => Number(!!b.stock.isStateOwned) - Number(!!a.stock.isStateOwned) || Math.random() - 0.5);
    for (const { stock, options } of candidates.slice(0, 4)) {
        const investment = getRandomElement(options);
        const spec = getConstructionSpec(investment.id);
        const grant = Math.round(spec.cost * 1.2);
        if (governmentTreasury < grant * 2) return null;
        governmentTreasury -= grant;
        adjustCompanyCash(stock, grant);
        adjustBalanceSheet(stock, { assets: grant, retainedEarnings: grant });
        const result = startCompanyInvestment(stock, investment.id, 'owner');
        if (result.ok) {
            recordPayment('external:skarb-panstwa', stock, grant, `Program mieszkań socjalnych: ${spec.name}`);
            society.budget.extraSpending = (Number(society.budget.extraSpending) || 0) + grant;
            logSociety(`🏘️ Program mieszkań socjalnych: ${stock.name} zamawia „${spec.name}” (dotacja ${formatZl(grant, 0)}) — przetarg dla firm budowlanych.`);
            return stock.symbol;
        }
        adjustCompanyCash(stock, -grant);
        adjustBalanceSheet(stock, { assets: -grant, retainedEarnings: -grant });
        governmentTreasury += grant;
    }
    return null;
}

/** CIT spółek: 19% + ewentualna podwyżka po długim deficycie. */
function getCompanyIncomeTaxRate() {
    return COMPANY_INCOME_TAX_RATE + (typeof society === 'object' && society ? Number(society.budget?.citAdd) || 0 : 0);
}

/** Premia w rentowności obligacji skarbowych przy utrzymującym się deficycie. */
function getDeficitBondPremium() {
    return typeof society === 'object' && society ? Number(society.budget?.bondPremium) || 0 : 0;
}

/**
 * Budżet kwartału. Gotówka Skarbu Państwa zmienia się tylko o różnice względem startu (zasiłki ponad poziom startowy,
 * ubytek podatków przez szarą strefę, programy mieszkaniowe, imigracja) — reszta jak w 0.12. Saldo budżetu to wpływy
 * (CIT + podatki od pracy) minus wydatki (usługi publiczne podążają za wpływami z opóźnieniem + programy socjalne):
 * w recesji wpływy spadają szybciej niż wydatki, więc pojawia się deficyt.
 */
function settleSocialBudget() {
    const budget = society.budget;
    const cit = Number(budget.citQuarter) || 0;
    budget.taxBase = budget.taxBase > 0 ? budget.taxBase * 0.7 + cit * 0.3 : cit;
    budget.citQuarter = 0;
    const extra = Number(budget.extraSpending) || 0;
    budget.extraSpending = 0;
    const base = Math.max(0, budget.taxBase || 0);
    const poorRatio = (society.classes.poor || 0) / SOCIETY_CLASSES[0].start;
    const benefits = base * 0.1 * (Number(society.laws.benefits) || 0) * poorRatio;
    // Szara strefa: utracone podatki od pracy (część oszczędności spółek).
    const greyExtra = typeof stocks !== 'undefined' ? stocks.reduce((sum, s) => sum + (Number(s.workforce?.greyExtraSaving) || 0), 0) : 0;
    budget.greyTaxLoss = Math.max(0, greyExtra * 0.5);
    const laborTaxesGross = base * 0.1 * SOCIAL_LAWS.benefits.start; // na starcie równoważą zasiłki
    const laborTaxes = laborTaxesGross - budget.greyTaxLoss;
    governmentTreasury += laborTaxes - benefits;
    budget.socialSpending = benefits + extra;
    budget.laborTaxes = laborTaxes;
    if (!(cit > 0)) return;
    const revenue = cit + laborTaxes;
    const baseline = cit + laborTaxesGross;
    if (!(budget.publicServices > 0)) budget.publicServices = baseline * 0.97;
    budget.revenue = revenue;
    budget.spending = budget.publicServices + benefits + extra;
    budget.balance = revenue - budget.spending;
    budget.hasBalance = true;
    budget.publicServices = budget.publicServices * 0.8 + baseline * 0.97 * 0.2; // usługi publiczne: sztywne, z opóźnieniem
}

/** Deficyt: 4 kw. → rentowność obligacji +0,25 pp; 8 kw. → CIT +2 pp albo cięcie ustaw (według partii). */
function updateBudgetBalance() {
    const budget = society.budget;
    if (!budget.hasBalance) return;
    budget.hasBalance = false;
    budget.deficitQuarters = budget.balance < 0 ? budget.deficitQuarters + 1 : 0;
    if (budget.deficitQuarters === 0) { budget.bondPremium = 0; budget.deficitActed = false; }
    if (budget.deficitQuarters >= DEFICIT_BOND_QUARTERS && !budget.bondPremium) {
        budget.bondPremium = DEFICIT_BOND_PREMIUM;
        logSociety(`🏦 Deficyt budżetu od ${budget.deficitQuarters} kwartałów: rentowność obligacji skarbowych rośnie o 0,25 pp.`);
        if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('deficyt');
    }
    if (budget.deficitQuarters >= DEFICIT_ACTION_QUARTERS && !budget.deficitActed) {
        budget.deficitActed = true;
        const party = getLawMakingParty();
        const cut = PARTY_PROGRAMS[party]?.deficit === 'cut' && (Number(society.laws.benefits) || 0) > 0;
        if (cut && !society.pendingLaw) announceLawChange('benefits', -1, party, 'cięcie wydatków po 2 latach deficytu');
        else if (budget.citAdd < DEFICIT_CIT_STEP * 2) {
            budget.citAdd += DEFICIT_CIT_STEP;
            logSociety(`🏦 Dwa lata deficytu: rząd podnosi CIT o 2 pp (do ${((COMPANY_INCOME_TAX_RATE + budget.citAdd) * 100).toFixed(0)}%). Zyski spółek po podatku spadną.`);
        }
    }
}

function advanceSocialPolicy() {
    applyPendingLaw();
    settleSocialBudget();
    if (society.housingProgram > 0) {
        society.housingProgram--;
        if (Math.random() < 0.5 * Math.max(1, Number(society.laws.housing) || 0)) commissionSocialHousing();
    }
    society.lawTimer--;
    if (society.lawTimer <= 0) {
        society.lawTimer = 4;
        const change = !society.pendingLaw && Math.random() < 0.85 ? pickLawChange() : null;
        if (change) announceLawChange(change[0], change[1]);
    }
    updateBudgetBalance();
}

// ---------------------------------------------------------------------------------
// WYBORY: poparcie z klas, darowizny, koalicje
// ---------------------------------------------------------------------------------

/** Poparcie bazowe z klas (w %, suma 100). */
function getClassBasedSupport() {
    const support = { people: 0, state: 0, market: 0 };
    for (const cls of SOCIETY_CLASSES) {
        const share = Number(society?.classes?.[cls.id]) || 0;
        const prefs = CLASS_VOTE[cls.id];
        PARTY_IDS.forEach((id, i) => { support[id] += share * prefs[i]; });
    }
    return support;
}

/** Poparcie partii (w %, suma 100): klasy, zmęczenie władzą, koniunktura, darowizny, szum ±5 pp. */
function computePartySupport(withNoise = true) {
    ensureSocietyState();
    const election = macro.election;
    const support = getClassBasedSupport();
    const ruling = election.ruling;
    // Zmęczenie władzą rośnie z każdą kadencją; zła koniunktura (recesja, inflacja, bezrobocie) szkodzi rządzącym,
    // a głosy protestu zbierają głównie Ludowcy.
    const badTimes = economyCycle.phase === 'recession' || macro.inflation > 0.05 || macro.unemployment > 0.09;
    const penalty = ELECTION_FATIGUE * Math.max(1, Number(election.terms) || 1) + (badTimes ? ELECTION_BAD_TIMES : 0);
    if (support[ruling] !== undefined) {
        support[ruling] -= penalty;
        const others = PARTY_IDS.filter(id => id !== ruling);
        others.forEach(id => { support[id] += penalty * (ruling === 'people' ? 0.5 : id === 'people' ? PROTEST_TO_PEOPLE : 1 - PROTEST_TO_PEOPLE); });
    }
    const donations = election.donations || {};
    const assets = Math.max(1, typeof getFundAssets === 'function' && playerFund ? getFundAssets() : 1);
    PARTY_IDS.forEach(id => { support[id] += Math.min(10, (Number(donations[id]) || 0) / assets * 500); });
    if (withNoise) PARTY_IDS.forEach(id => { support[id] += (Math.random() - 0.5) * 10; });
    PARTY_IDS.forEach(id => { support[id] = Math.max(1, support[id]); });
    const total = PARTY_IDS.reduce((sum, id) => sum + support[id], 0);
    PARTY_IDS.forEach(id => { support[id] = support[id] / total * 100; });
    return support;
}

/** Wynik wyborów: zwycięzca, a przy < 40% koalicja z drugą partią (parametry ważone poparciem). */
function resolveElection(support) {
    const ranked = [...PARTY_IDS].sort((a, b) => support[b] - support[a]);
    const winner = ranked[0];
    const coalition = support[winner] < COALITION_THRESHOLD * 100 ? { partner: ranked[1], weights: { [winner]: support[winner], [ranked[1]]: support[ranked[1]] } } : null;
    return { winner, coalition, support };
}

function getRulingParty() {
    const election = macro?.election;
    const main = RULING_PARTIES[election?.ruling] || RULING_PARTIES.market;
    const coalition = election?.coalition;
    const partner = coalition ? RULING_PARTIES[coalition.partner] : null;
    if (!partner) return main;
    const wMain = Number(coalition.weights?.[election.ruling]) || 1, wPartner = Number(coalition.weights?.[coalition.partner]) || 1;
    const mix = key => (main[key] * wMain + partner[key] * wPartner) / (wMain + wPartner);
    return {
        name: `${main.name} + ${partner.name}`,
        privatization: Math.round(mix('privatization') * 100) / 100,
        nationalization: Math.round(mix('nationalization') * 100) / 100,
        subsidies: Math.round(mix('subsidies') * 100) / 100,
        stateMood: mix('stateMood'),
        coalition: true
    };
}
