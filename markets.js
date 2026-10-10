// markets.js — Spółki rynkowe i maklerzy (wersja 0.10.2, część M5)
//
// GPW to główny operator: notowana spółka, na której są wszystkie dotychczasowe spółki. XTD i PLU5
// rodzą się jako startupy — bardzo drogie, rozwijają się powoli, ale mogą nagle zyskać sponsora, który
// wchodzi na giełdę jako „członek rynku XTD”. Gdy operator zadebiutuje, na jego rynek wchodzi 5–10
// nowych spółek z istniejących sektorów. Euronext jest widoczny, ale nieaktywny.
// Operatorzy pobierają prowizję od transakcji na swoim rynku i opłatę za notowanie, inwestują w swoje
// spółki członkowskie i podpisują umowy na wyłączność. Zamknięcie operatora usuwa jego spółki z widoku
// gracza — posiadacze akcji są rozliczani po ostatniej cenie.

const MARKET_OPERATOR_DEFS = {
    GPW:      { name: 'Giełda Papierów Wartościowych', short: 'GPW', commission: 0.003, color: '#1f6feb', main: true },
    XTD:      { name: 'XTD Markets', short: 'XTD', commission: 0.002, color: '#8957e5' },
    PLU5:     { name: 'PLU5 Exchange', short: 'PLU5', commission: 0.0015, color: '#d29922' },
    EURONEXT: { name: 'Euronext', short: 'Euronext', commission: 0.0025, color: '#3fb950', dormantForever: true }
};
const OPERATOR_STARTUP_GOAL = [300000, 600000];  // bardzo drogie startupy
const OPERATOR_STARTUP_SLOWDOWN = 0.25;         // rozwój 4× wolniej niż zwykły startup
const OPERATOR_SPONSOR_CHANCE = 0.12;           // co kwartał w fazie startupu
const OPERATOR_SPAWN_CHANCE = 0.1;              // co kwartał, od 4. kwartału gry
const OPERATOR_LISTING_FEE = 0.0002;            // opłata za notowanie: % kapitalizacji członka na kwartał
const OPERATOR_EXCLUSIVITY_CHANCE = 0.1;
const LISTING_FEE_FACTOR = { GPW: 1, XTD: 0.7, PLU5: 0.5, EURONEXT: 1 }; // B4: tańsze rynki alternatywne
const LISTING_MOVE_PRICE_EFFECT = { GPW: 0.02, XTD: -0.03, PLU5: -0.03 };  // mniej inwestorów = niższa wycena

const MEMBER_NAME_PREFIXES = ['Nova', 'Prime', 'Delta', 'Orion', 'Vega', 'Atlas', 'Zenit', 'Polar', 'Astra', 'Kappa', 'Sigma', 'Aurora', 'Vistula', 'Baltica'];

let marketOperators = null;

function createMarketOperators() {
    const operators = {};
    for (const [id, def] of Object.entries(MARKET_OPERATOR_DEFS)) {
        operators[id] = { id, status: def.main ? 'active' : def.dormantForever ? 'inactive' : 'dormant', symbol: null, startupSymbol: null, sponsors: [], members: 0, commissionsTotal: 0 };
    }
    return operators;
}

function getStockMarket(stock) {
    return stock?.market || 'GPW';
}

function getMarketLabel(id) {
    return MARKET_OPERATOR_DEFS[id]?.short || id;
}

/** Nowa gra (i migracja): stan operatorów + notowana spółka GPW. */
function initMarketOperators() {
    marketOperators = createMarketOperators();
    let gpw = stocks.find(s => s.marketOperator === 'GPW');
    if (!gpw) {
        gpw = createListedCompany({ name: MARKET_OPERATOR_DEFS.GPW.name, symbol: uniqueSymbol('GPW'), sector: ['Finanse'], price: getRandomInRange(110, 160), totalShares: 400000, exchange: 'SILVER' });
        gpw.marketOperator = 'GPW';
        stocks.push(gpw);
    }
    marketOperators.GPW.symbol = gpw.symbol;
    return marketOperators;
}

function ensureMarketOperators() {
    if (!marketOperators || !marketOperators.GPW) initMarketOperators();
    for (const id of Object.keys(MARKET_OPERATOR_DEFS)) if (!marketOperators[id]) marketOperators[id] = createMarketOperators()[id];
    return marketOperators;
}

function uniqueSymbol(base) {
    let symbol = base;
    while (stocks.some(s => s.symbol === symbol) || (typeof etfs !== 'undefined' && etfs.some(e => e.symbol === symbol))) symbol += 'X';
    return symbol;
}

// =================================================================================
// NOWE SPÓŁKI (sponsor, członkowie nowego rynku)
// =================================================================================

/** Zwykła notowana spółka zbudowana jak debiutant ze startupu (pełna inicjalizacja). */
function createListedCompany({ name, symbol, sector, price, totalShares, exchange = 'BRONZE', market = 'GPW' }) {
    const base = generateNewStartup();
    const stock = {
        ...base,
        name: name || base.name,
        symbol: symbol || base.symbol,
        sector: sector || base.sector,
        exchange,
        market,
        price,
        totalShares,
        maxShares: totalShares,
        sharesHeld: 0,
        insiderShares: 0,
        financialHealth: getRandomIntInRange(0, 3),
        volatilityFactor: getRandomInRange(0.8, 1.8),
        reputation: { player: 0 }
    };
    delete stock.assetType;
    ['fundingGoal', 'currentFunding', 'developmentProgress', 'successChance', 'stage', 'isScam', 'isWhiteCrow', 'investors', 'ipoPriceBonus', 'overfundingEndTime'].forEach(key => delete stock[key]);
    const equity = price * totalShares;
    stock.balanceSheet = { assets: equity * 1.2, liabilities: equity * 0.2, shareCapital: equity * 0.3, retainedEarnings: equity * 0.7 };
    stock.cash = equity * getRandomInRange(0.05, 0.12);
    stock.quarterlyEarnings = 0;
    if (typeof initializeDepartments === 'function') initializeDepartments(stock);
    if (typeof initializeDescriptionParts === 'function') initializeDescriptionParts(stock);
    if (typeof initializeResearchForStock === 'function') initializeResearchForStock(stock);
    if (typeof generateCEO === 'function') generateCEO(stock);
    initializeFundamentals(stock, true);
    setCompanyDividendPolicy(stock, getRandomElement(['Growth', 'Balanced']));
    return stock;
}

function spawnMarketMember(operatorId, reason) {
    const sectors = Object.keys(SECTOR_PROFILES).filter(s => !['Bankowość', 'Bankowość Komercyjna'].includes(s));
    const sector = [getRandomElement(sectors)];
    const base = generateNewStartup();
    // Generator startupów nie zna wszystkich sektorów — wtedy nazwa „marka + sektor”.
    const name = base.name.startsWith('DejwCorp') || !base.sector?.includes(sector[0])
        ? `${getRandomElement(MEMBER_NAME_PREFIXES)} ${sector[0]}` : base.name;
    const symbol = uniqueSymbol((name.normalize('NFD').replace(/[^A-Za-z ]/g, '').split(' ').map(w => w.slice(0, 2)).join('').toUpperCase() || 'NEW').slice(0, 4));
    const stock = createListedCompany({
        name, symbol, sector,
        price: getRandomInRange(25, 70), totalShares: getRandomIntInRange(20, 80) * 1000, exchange: 'BRONZE', market: operatorId
    });
    stocks.push(stock);
    logEvent(`🏛️ ${stock.name} (${stock.symbol}) wchodzi na giełdę jako członek rynku ${getMarketLabel(operatorId)}${reason ? ` — ${reason}` : ''}.`, 'market');
    return stock;
}

// =================================================================================
// CYKL ŻYCIA OPERATORÓW
// =================================================================================

function spawnOperatorStartup(operator) {
    const def = MARKET_OPERATOR_DEFS[operator.id];
    const startup = generateNewStartup();
    startup.name = def.name;
    startup.symbol = uniqueSymbol(def.short.toUpperCase());
    startup.sector = ['Finanse'];
    startup.fundingGoal = Math.round(getRandomIntInRange(...OPERATOR_STARTUP_GOAL) / 1000) * 1000;
    startup.successChance = getRandomInRange(0.55, 0.75);
    startup.isScam = false;
    startup.operatorStartup = operator.id;
    stocks.push(startup);
    operator.status = 'startup';
    operator.startupSymbol = startup.symbol;
    logEvent(`🚀 W inkubatorze pojawia się ${def.name} — przyszły operator rynku (cel finansowania ${startup.fundingGoal.toLocaleString('pl-PL')} zł).`, 'market');
    return startup;
}

/** Debiut startupu-operatora (wołane z handleSuccessfulIPO). */
function activateMarketOperator(startup) {
    const operator = ensureMarketOperators()[startup.operatorStartup];
    if (!operator) return;
    operator.status = 'active';
    operator.symbol = startup.symbol;
    startup.marketOperator = operator.id;
    startup.market = operator.id;
    const count = getRandomIntInRange(5, 10);
    for (let i = 0; i < count; i++) spawnMarketMember(operator.id, 'otwarcie nowego rynku');
    logEvent(`🏛️ ${MARKET_OPERATOR_DEFS[operator.id].name} debiutuje i otwiera własny rynek: ${count} nowych spółek!`, 'market');
}

/** Upadek startupu-operatora (wołane z removeStartup). */
function onOperatorStartupRemoved(startup) {
    const operator = marketOperators?.[startup.operatorStartup];
    if (operator && operator.status === 'startup') closeMarketOperator(operator, 'startup operatora upadł');
}

/** Wykup wszystkich śledzonych posiadaczy po cenie (bez usuwania spółki). Zwraca wypłaconą kwotę. */
function buyOutAllHolders(stock, price) {
    const symbol = stock.symbol;
    let paid = 0;
    const fund = playerPortfolio[symbol];
    if (fund?.shares > 0) {
        playerCash += fund.shares * price;
        paid += fund.shares * price;
        recordPayment(`external:${symbol}`, 'player-fund', fund.shares * price, `Wykup akcji ${symbol}`);
    }
    delete playerPortfolio[symbol];
    const wallet = playerWallet?.portfolio?.[symbol];
    if (wallet?.shares > 0) { playerWallet.cash += wallet.shares * price; paid += wallet.shares * price; }
    if (playerWallet?.portfolio) delete playerWallet.portfolio[symbol];
    for (const ai of aiCompetitors) {
        if (ai.portfolio?.[symbol]?.shares > 0) { ai.cash += ai.portfolio[symbol].shares * price; paid += ai.portfolio[symbol].shares * price; }
        if (ai.portfolio) delete ai.portfolio[symbol];
    }
    for (const manager of corporation?.managers || []) {
        const held = manager.fund?.portfolio?.[symbol]?.shares || 0;
        if (held > 0) { manager.fund.cash += held * price; paid += held * price; }
        if (manager.fund?.portfolio) delete manager.fund.portfolio[symbol];
    }
    for (const bank of commercialBanks) {
        if (bank.stockPortfolio?.[symbol]?.shares > 0) { bank.cash += bank.stockPortfolio[symbol].shares * price; paid += bank.stockPortfolio[symbol].shares * price; }
        if (bank.stockPortfolio) delete bank.stockPortfolio[symbol];
    }
    for (const owner of stocks) {
        const shares = (owner.holdingPortfolio?.[symbol]?.quantity || 0) + (owner.equityStakes?.[symbol] || 0);
        if (shares > 0) { adjustCompanyCash(owner, shares * price); paid += shares * price; }
        if (owner.holdingPortfolio) delete owner.holdingPortfolio[symbol];
        if (owner.equityStakes) delete owner.equityStakes[symbol];
    }
    if (typeof settleEtfHoldings === 'function') settleEtfHoldings(symbol, price);
    if (stock.cityShares > 0 && typeof city === 'object') { city.budget += stock.cityShares * price; stock.cityShares = 0; }
    stock.sharesHeld = 0;
    return paid;
}

/** Rozliczenie posiadaczy po ostatniej cenie i zdjęcie spółki z rynku. */
function delistStockAtPrice(stock, price) {
    buyOutAllHolders(stock, price);
    removeStockFromGame(stock.symbol);
}

function closeMarketOperator(operator, reason) {
    if (!operator || operator.status === 'closed' || MARKET_OPERATOR_DEFS[operator.id]?.main) return;
    const members = stocks.filter(s => getStockMarket(s) === operator.id && s.marketOperator !== operator.id);
    for (const stock of members) delistStockAtPrice(stock, stock.price);
    operator.status = 'closed';
    operator.sponsors = [];
    logEvent(`🔒 Rynek ${getMarketLabel(operator.id)} zostaje zamknięty (${reason}). ${members.length} spółek znika z notowań — posiadacze rozliczeni po ostatniej cenie.`, 'market');
}

// =================================================================================
// PROWIZJE I PRZYCHODY
// =================================================================================

function getOperatorStock(operatorId) {
    const operator = marketOperators?.[operatorId];
    return operator?.status === 'active' && operator.symbol ? stocks.find(s => s.symbol === operator.symbol && !s.isBankrupt) : null;
}

/** Prowizja od transakcji na rynku spółki; payer: 'player' albo bot. Zwraca pobraną kwotę. */
function chargeMarketCommission(stock, value, payer) {
    if (!marketOperators || !(value > 0)) return 0;
    const operatorId = getStockMarket(stock);
    const operatorStock = getOperatorStock(operatorId);
    if (!operatorStock || operatorStock === stock) return 0;
    const fee = value * MARKET_OPERATOR_DEFS[operatorId].commission;
    if (payer === 'player') {
        playerCash -= fee;
        recordPayment('player-fund', operatorStock, fee, `Prowizja ${getMarketLabel(operatorId)}`);
    } else if (payer && Number.isFinite(payer.cash)) {
        payer.cash -= fee;
    } else return 0;
    adjustCompanyCash(operatorStock, fee);
    adjustBalanceSheet(operatorStock, { assets: fee, retainedEarnings: fee });
    marketOperators[operatorId].commissionsTotal += fee;
    return fee;
}

// =================================================================================
// CO KWARTAŁ
// =================================================================================

function processMarketsQuarterly() {
    ensureMarketOperators();
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    for (const operator of Object.values(marketOperators)) {
        const def = MARKET_OPERATOR_DEFS[operator.id];
        operator.members = stocks.filter(s => getStockMarket(s) === operator.id && s.marketOperator !== operator.id && !s.assetType).length;

        if (operator.status === 'dormant' && quarter >= 4 && Math.random() < OPERATOR_SPAWN_CHANCE) {
            spawnOperatorStartup(operator);
        } else if (operator.status === 'startup') {
            const startup = stocks.find(s => s.symbol === operator.startupSymbol);
            if (!startup) { closeMarketOperator(operator, 'startup operatora zniknął'); continue; }
            if (Math.random() < OPERATOR_SPONSOR_CHANCE) {
                const sponsor = spawnMarketMember(operator.id, `sponsor ${def.name}`);
                operator.sponsors.push(sponsor.symbol);
                startup.successChance = Math.min(0.95, startup.successChance + 0.05);
            }
        } else if (operator.status === 'active') {
            const operatorStock = getOperatorStock(operator.id);
            if (!operatorStock) { if (!def.main) closeMarketOperator(operator, 'upadek operatora'); continue; }
            collectListingFees(operator, operatorStock);
            investInMembers(operator, operatorStock);
            if (!def.main && Math.random() < OPERATOR_EXCLUSIVITY_CHANCE) signExclusivity(operator, operatorStock);
        }
    }
}

function collectListingFees(operator, operatorStock) {
    for (const stock of stocks.filter(s => getStockMarket(s) === operator.id && s !== operatorStock && !s.assetType && !s.isBankrupt)) {
        const fee = Math.min(Math.max(0, stock.cash) * 0.05, getMarketCapValue(stock) * OPERATOR_LISTING_FEE * (LISTING_FEE_FACTOR[operator.id] ?? 1));
        if (!(fee > 0)) continue;
        adjustCompanyCash(stock, -fee);
        adjustBalanceSheet(stock, { assets: -fee, retainedEarnings: -fee });
        adjustCompanyCash(operatorStock, fee);
        adjustBalanceSheet(operatorStock, { assets: fee, retainedEarnings: fee });
    }
}

/** Operator inwestuje część gotówki w spółki swojego rynku (pakiety liczone w obrocie). */
function investInMembers(operator, operatorStock) {
    const members = stocks.filter(s => getStockMarket(s) === operator.id && s !== operatorStock && !s.assetType && !s.isBankrupt);
    if (!members.length || operatorStock.cash <= 0) return;
    const target = getRandomElement(members);
    const budget = operatorStock.cash * 0.05;
    const quantity = Math.floor(Math.min(getAvailableShares(target), budget / Math.max(0.01, target.price), target.totalShares * 0.02));
    if (quantity <= 0) return;
    const cost = quantity * target.price;
    adjustCompanyCash(operatorStock, -cost); // gotówka → akcje (aktywa bez zmian)
    target.sharesHeld += quantity;
    if (!operatorStock.equityStakes) operatorStock.equityStakes = {};
    operatorStock.equityStakes[target.symbol] = (operatorStock.equityStakes[target.symbol] || 0) + quantity;
}

/** Umowa na wyłączność: spółka z GPW przechodzi na rynek operatora (premia za podpis). */
function signExclusivity(operator, operatorStock) {
    const candidates = stocks.filter(s => getStockMarket(s) === 'GPW' && !s.marketOperator && !s.assetType && !s.isBankrupt && !s.isStateOwned
        && ['BRONZE', 'SILVER'].includes(s.exchange));
    if (!candidates.length) return null;
    const stock = getRandomElement(candidates);
    const bonus = Math.min(operatorStock.cash * 0.1, getMarketCapValue(stock) * 0.005);
    if (bonus > 0) {
        adjustCompanyCash(operatorStock, -bonus);
        adjustBalanceSheet(operatorStock, { assets: -bonus, retainedEarnings: -bonus });
        adjustCompanyCash(stock, bonus);
        adjustBalanceSheet(stock, { assets: bonus, retainedEarnings: bonus });
    }
    stock.market = operator.id;
    logEvent(`✍️ ${stock.name} podpisuje umowę na wyłączność z ${MARKET_OPERATOR_DEFS[operator.id].name} i przechodzi na rynek ${getMarketLabel(operator.id)}.`, 'market');
    return stock;
}

// =================================================================================
// B4: PRZENIESIENIE NOTOWAŃ SPÓŁKI FUNDUSZU (większość > 50%)
// =================================================================================

function getListingMoveTargets(stock) {
    if (!stock || stock.assetType || stock.marketOperator || stock.isStateOwned || getFundStakePct(stock) <= 0.5) return [];
    ensureMarketOperators();
    return Object.keys(LISTING_MOVE_PRICE_EFFECT).filter(id => id !== getStockMarket(stock) && marketOperators[id]?.status === 'active');
}

function moveListing(symbol, marketId) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!getListingMoveTargets(stock).includes(marketId)) { showToast('Przeniesienie notowań niemożliwe (wymaga większości i aktywnego rynku).', 'warning'); return false; }
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    if (stock.listingMovedQuarter !== undefined && quarter - stock.listingMovedQuarter < 4) { showToast('Notowania można przenieść raz na rok gry.', 'warning'); return false; }
    const cost = Math.round(getMarketCapValue(stock) * 0.003);
    if (stock.cash < cost) { showToast(`${stock.name} nie ma gotówki na przeniesienie (${formatZl(cost, 0)}).`, 'error'); return false; }
    adjustCompanyCash(stock, -cost);
    adjustBalanceSheet(stock, { assets: -cost, retainedEarnings: -cost });
    const from = getStockMarket(stock);
    stock.market = marketId;
    stock.listingMovedQuarter = quarter;
    const effect = LISTING_MOVE_PRICE_EFFECT[marketId];
    applyPriceEffect(symbol, effect, effect >= 0 ? 'positive' : 'negative', 'company');
    logEvent(`🔀 ${stock.name} przenosi notowania z ${getMarketLabel(from)} na ${getMarketLabel(marketId)} (prowizja ${(MARKET_OPERATOR_DEFS[marketId].commission * 100).toFixed(2)}%, opłata za notowanie ×${LISTING_FEE_FACTOR[marketId]}).`, 'market');
    return true;
}

// =================================================================================
// WIDOK: zakładka „Rynki” w oknie Państwa
// =================================================================================

function renderMarketsPanel() {
    ensureMarketOperators();
    const statusLabel = { active: '🟢 aktywny', startup: '🧪 startup w inkubatorze', dormant: '⏳ jeszcze nie istnieje', closed: '🔒 zamknięty', inactive: '⏸️ nieaktywny — wkrótce' };
    return `<p class="bank-lead">Operatorzy rynków pobierają prowizję od każdej transakcji na swoim rynku (płaci też fundusz) i opłatę za notowanie, inwestują w spółki członkowskie i podpisują umowy na wyłączność. Zamknięcie operatora zdejmuje jego spółki z notowań — posiadacze są rozliczani po ostatniej cenie.</p>
        <div class="bank-grid">${Object.values(marketOperators).filter(operator => operator.status === 'active').map(operator => { // tylko rynki notowane na giełdzie
            const def = MARKET_OPERATOR_DEFS[operator.id];
            const stock = operator.symbol ? stocks.find(s => s.symbol === operator.symbol) : null;
            const startup = operator.startupSymbol ? stocks.find(s => s.symbol === operator.startupSymbol && s.assetType === 'Startup') : null;
            return `<article class="bank-card market-card" style="border-top: 3px solid ${def.color}">
                <header class="bank-card-head"><span class="bank-card-icon">🏛️</span><div><h4>${escapeHtml(def.name)}</h4><span class="bank-card-type">${statusLabel[operator.status] || operator.status}</span></div></header>
                <dl class="bank-card-rates">
                    <div><dt>Prowizja</dt><dd>${(def.commission * 100).toFixed(2)}%</dd></div>
                    <div><dt>Spółki</dt><dd>${operator.members}</dd></div>
                    <div><dt>Kurs operatora</dt><dd>${stock ? formatZl(stock.price) : '—'}</dd></div>
                </dl>
                ${startup ? `<p class="text-sm">Finansowanie startupu: ${formatZl(startup.currentFunding, 0)} / ${formatZl(startup.fundingGoal, 0)} · sponsorzy: ${operator.sponsors.length}</p>` : ''}
                ${operator.commissionsTotal > 0 ? `<p class="text-xs text-muted">Prowizje łącznie: ${formatZl(operator.commissionsTotal, 0)}</p>` : ''}
            </article>`;
        }).join('')}</div>`;
}
