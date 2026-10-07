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
    { id: 'projectLead', name: 'Kierownik projektu', feeShare: 0.30, bonusMult: 2.0, exchangeAccessLevel: 4 },
    { id: 'board',       name: 'Członek zarządu',    feeShare: 0.35, bonusMult: 2.5, exchangeAccessLevel: 4 },
    { id: 'ceo',         name: 'CEO',                feeShare: 0.40, bonusMult: 3.0, exchangeAccessLevel: 4 }
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

// Charaktery klientów: cierpliwość (wolniej odchodzą), awersja do zmienności, pogoń za wynikami,
// lojalność (szansa, że w ogóle rozważą odejście), typowa wpłata (zł).
const CLIENT_TYPES = {
    retiree:     { label: 'Emeryt',     icon: '👴', patience: 0.8, volAversion: 1.6, chase: 0.3, loyalty: 0.5, size: [300, 1200] },
    saver:       { label: 'Ciułacz',    icon: '🐷', patience: 0.6, volAversion: 1.0, chase: 0.6, loyalty: 0.4, size: [200, 800] },
    speculator:  { label: 'Spekulant',  icon: '🎲', patience: 0.2, volAversion: 0.3, chase: 1.6, loyalty: 0.1, size: [300, 1500] },
    loyal:       { label: 'Lojalny',    icon: '💙', patience: 1.0, volAversion: 0.5, chase: 0.2, loyalty: 0.95, size: [50, 300] },
    institution: { label: 'Instytucja', icon: '🏛️', patience: 0.5, volAversion: 0.8, chase: 1.0, loyalty: 0.3, size: [2000, 6000], comparesRivals: true },
    investor:    { label: 'Inwestor',   icon: '🐋', patience: 0.6, volAversion: 0.6, chase: 1.2, loyalty: 0.4, size: [2000, 10000], comparesRivals: true }
};

const CLIENT_FIRST_NAMES = ['Anna', 'Piotr', 'Maria', 'Tomasz', 'Ewa', 'Jan', 'Kasia', 'Marek', 'Zofia', 'Adam', 'Halina', 'Krzysztof', 'Agata', 'Paweł', 'Irena'];
const CLIENT_LAST_INITIALS = ['K.', 'N.', 'W.', 'Z.', 'L.', 'M.', 'S.', 'B.', 'D.', 'P.'];
const INSTITUTION_NAMES = ['Fundacja Rozwoju', 'Kasa Zapomogowa „Promyk”', 'Spółdzielnia Mieszkaniowa „Zacisze”', 'Fundusz Emerytalny Gminy', 'Stowarzyszenie Kupców'];

// Mechaniki wyłączone w etapie B (kod zostaje do decyzji w etapie D/E).
const FEATURE_FLAGS = {
    playerCompany: false,   // własna firma gracza i praca pasywna
    minigames: false,       // zamrożone
    privateLoans: false,    // prywatne kredyty, depozyty, hipoteka gracza
    startups: false,        // inkubator, pula, oferty startupów
};

// Szkolenia ukryte (mechaniki wyłączone w etapie B).
const HIDDEN_TRAININGS = ['work', 'startupInvestor'];

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

function getFundBondsValue() {
    return allBonds.filter(bond => bond.ownerId === 'player').reduce((sum, bond) => sum + (Number(bond.faceValue) || 1000), 0);
}

function getFundAssets() {
    return Math.max(0, Number(playerCash) || 0) + getFundPortfolioValue() + getFundBondsValue();
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
    playerXP = 0;
    playerWallet = createPlayerWallet(GRANDMA_POCKET_MONEY);
    activeTradingAccount = 'fund';

    playerFund = createPlayerFund();
    const nav = FUND_START_CASH / FUND_START_UNITS;

    // Kilkunastu startowych klientów; JU rozdzielone wg typowej wpłaty.
    const count = getRandomIntInRange(12, 15);
    const types = ['loyal', 'retiree', 'retiree', 'saver', 'saver', 'saver', 'speculator', 'speculator', 'institution'];
    const weights = [];
    for (let i = 0; i < count; i++) {
        const type = i < types.length ? types[i] : getRandomElement(['saver', 'retiree', 'speculator']);
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
        addFundClient(item.type, units, nav);
    });

    beginFundPeriod();
    syncExchangeAccessWithPosition();
    if (typeof createCorporation === 'function') createCorporation();
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

function closeFundPeriod() {
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

    return Math.max(0, Math.min(100, score));
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

    processClientDecisions();
    maybeTriggerForcedEmission();

    if (typeof processCorporationWeekly === 'function') {
        processCorporationWeekly();
        payAnalystSalaries();
    }
}

function chargeManagementFee() {
    const assets = getFundAssets();
    const fee = Math.min(Math.max(0, playerCash), assets * MANAGEMENT_FEE_ANNUAL / FUND_WEEKS_PER_YEAR);
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

function processClientDecisions() {
    const nav = getFundNav();
    const current = playerFund.current;
    const recentReturn = getPeriodReturn(current.startNav, nav) - getPeriodReturn(current.startBenchmark, getBenchmarkValue());
    const lastPeriod = playerFund.periods[playerFund.periods.length - 1];
    const lastRankBad = lastPeriod && lastPeriod.rankOf > 1 && lastPeriod.rank === lastPeriod.rankOf;

    let budget = Math.floor(playerFund.units * MAX_WEEKLY_REDEMPTION_SHARE);

    for (const client of [...playerFund.clients]) {
        if (budget <= 0) break;
        const def = CLIENT_TYPES[client.type] || CLIENT_TYPES.saver;

        // Zadowolenie: zaufanie, ostatnie wyniki (pogoń za wynikiem), obsunięcie (awersja do zmienności).
        const drift = (playerFund.trust - 50) / 50 * 0.04 +
            recentReturn * def.chase * 0.8 -
            current.maxDrawdown * def.volAversion * 0.3 -
            (def.comparesRivals && lastRankBad ? 0.05 : 0);
        client.satisfaction = Math.max(0, Math.min(1, client.satisfaction + drift));

        if (Math.random() < def.loyalty) continue;

        const redeemChance = Math.max(0, (0.40 - client.satisfaction)) * (1 - def.patience) * 0.7;
        if (Math.random() >= redeemChance) continue;

        const fraction = client.satisfaction < 0.15 ? 1 : getRandomInRange(0.2, def.chase > 1 ? 1 : 0.5);
        const units = Math.min(budget, Math.max(1, Math.round(client.units * fraction)));
        redeemClientUnits(client, units);
        budget -= units;
    }
}

/** Umorzenie JU klienta po NAV. Przy braku gotówki fundusz sprzedaje pozycje. */
function redeemClientUnits(client, units) {
    if (!(units > 0) || client.units <= 0) return 0;
    units = Math.min(units, client.units);

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
        logEvent(`👋 ${client.name} (${CLIENT_TYPES[client.type].label}) wycofuje wszystkie środki: ${paid.toFixed(2)} zł (podatek klienta ${tax.toFixed(2)} zł).`, 'review');
    } else {
        logEvent(`📤 ${client.name} umarza ${paidUnits.toFixed(1)} JU (${paid.toFixed(2)} zł).`, 'review');
    }
    return paid;
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
        const quantity = Math.min(holding.shares, Math.ceil(needed / salePrice));
        const proceeds = quantity * salePrice;

        playerCash += proceeds;
        holding.shares -= quantity;
        stock.sharesHeld -= quantity;
        applyTradeImpact(stock, quantity, -1);
        if (holding.shares <= 0) delete playerPortfolio[symbol];
        needed -= proceeds;

        playerFund.current.forcedSales++;
        logEvent(`⚠️ Wymuszona sprzedaż ${quantity} szt. ${symbol} na umorzenia klientów.`, 'review');
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
        const type = trust > 0.7 && Math.random() < 0.2 ? 'institution' : getRandomElement(['saver', 'saver', 'retiree', 'speculator']);
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
}

function getPrivateTaxModifier() {
    let modifier = 1.0;
    const sanEscobar = getSkillLevel('sanEscobar');
    if (sanEscobar >= 1) modifier = 0.95;
    if (sanEscobar >= 4) modifier = 0;
    const accountant = getSkillLevel('accountant');
    if (accountant > 0) modifier *= Math.max(0.9, 1 - accountant * 0.02);
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

function buyStockPrivate(symbol, quantity) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || stock.isTradeLocked) { alert('Handel tą akcją jest niedostępny.'); return false; }
    if (!canAccessExchange(stock.exchange)) { alert('Twoje stanowisko nie daje dostępu do tej giełdy.'); return false; }
    if (quantity > getAvailableShares(stock)) { alert(`Za mało akcji na rynku (dostępne: ${getAvailableShares(stock)}).`); return false; }

    const cost = stock.price * quantity;
    if (playerWallet.cash < cost) { alert('Za mało prywatnych pieniędzy.'); return false; }

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

    if (typeof renderCvPanel === 'function') renderCvPanel();
    refreshFundViews();
    return true;
}

function refreshFundViews() {
    if (typeof displayCash === 'function') displayCash();
    if (typeof displayPortfolio === 'function') displayPortfolio();
    if (typeof displayFundPanel === 'function') displayFundPanel();
}
