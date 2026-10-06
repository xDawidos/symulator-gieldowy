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
