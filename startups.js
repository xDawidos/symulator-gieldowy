// startups.js — Inkubator startupów (etap F2)
//
// Inwestuje wyłącznie fundusz (gotówka klientów), łącznie do 10% aktywów funduszu (inwestycje
// bezpośrednie + wpłaty do puli). Wycena w NAV po zainwestowanej kwocie aż do IPO. Przy IPO udziały
// wszystkich inwestorów są normalizowane (80% akcji dla inwestorów, 20% wolny obrót), więc nigdy
// nie przekraczają 100%. Odradzanie inkubatora w czasie gry (maintainStartupCount co tydzień).

const STARTUP_FUND_LIMIT = 0.10;
const STARTUP_INVESTORS_SHARE = 0.80;

// =================================================================================
// LIMIT FUNDUSZU
// =================================================================================

function getFundStartupExposure() {
    let exposure = 0;
    for (const holding of Object.values(playerPortfolio)) {
        if (holding.assetType === 'Startup') exposure += Number(holding.investedAmount) || 0;
    }
    return exposure + (Number(investmentPool?.playerStakes?.player) || 0);
}

function getFundStartupCapacity() {
    return Math.max(0, getFundAssets() * STARTUP_FUND_LIMIT - getFundStartupExposure());
}

/** Sprawdza limit i gotówkę funduszu; komunikat dla gracza przy odmowie. */
function canFundInvestInStartups(amount, silent = false) {
    const fail = message => { if (!silent && typeof showToast === 'function') showToast(message, 'error'); return false; };
    if (!FEATURE_FLAGS.startups) return fail('Inkubator jest nieczynny.');
    if (!(amount > 0)) return fail('Wpisz poprawną kwotę.');
    if (amount > playerCash) return fail('Za mało gotówki funduszu.');
    if (amount > getFundStartupCapacity() + 1e-6) {
        return fail(`Limit startupów: ${(STARTUP_FUND_LIMIT * 100).toFixed(0)}% aktywów funduszu (wolne: ${getFundStartupCapacity().toFixed(0)} zł).`);
    }
    return true;
}

function addFundStartupStake(startup, amount) {
    const holding = playerPortfolio[startup.symbol] || { investedAmount: 0, assetType: 'Startup', isInsured: false };
    holding.investedAmount += amount;
    playerPortfolio[startup.symbol] = holding;
    if (!startup.investors) startup.investors = {};
    startup.investors['Fundusz'] = (startup.investors['Fundusz'] || 0) + amount;
}

// =================================================================================
// INWESTYCJE FUNDUSZU
// =================================================================================

function investInStartup(symbol, amount) {
    if (!(Number(amount) > 0)) amount = document.getElementById(`invest-amount-${symbol}`)?.valueAsNumber;
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.assetType !== 'Startup') return false;
    if (startup.stage !== 'funding' && startup.stage !== 'overfunding') {
        showToast(`${startup.name} jest już w fazie rozwoju i nie przyjmuje inwestycji.`, 'default');
        return false;
    }
    if (!canFundInvestInStartups(amount)) return false;

    playerCash -= amount;
    if (startup.stage === 'funding') {
        startup.currentFunding += amount;
        startup.successChance = Math.min(1, startup.successChance + amount / startup.fundingGoal * 0.05);
        logEvent(`🚀 Fundusz inwestuje ${amount.toFixed(2)} zł w ${startup.name} (faza finansowania).`, 'review');
    } else {
        startup.ipoPriceBonus += amount;
        logEvent(`🚀 Fundusz dopłaca ${amount.toFixed(2)} zł do ${startup.name} przed debiutem (wyższa wycena IPO).`, 'review');
    }
    addFundStartupStake(startup, amount);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    if (typeof displayStartups === 'function') displayStartups(getCurrentStartupInputValues());
    return true;
}

/** Ratunek w etapie komplikacji: wpłata liczy się jako inwestycja; zebranie kwoty = debiut. */
function playerRescuesStartup(symbol, amount) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.stage !== 'financial_complications') return false;
    amount = Math.min(Number(amount), startup.rescueGoal - startup.rescueCurrent);
    if (!canFundInvestInStartups(amount)) return false;

    playerCash -= amount;
    startup.rescueCurrent += amount;
    addFundStartupStake(startup, amount);
    logEvent(`🚑 Fundusz dofinansowuje ${startup.name} kwotą ${amount.toFixed(2)} zł.`, 'review');
    checkStartupRescue(startup);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

function checkStartupRescue(startup) {
    if (startup.stage !== 'financial_complications' || startup.rescueCurrent < startup.rescueGoal) return false;
    logEvent(`[START-UP] ✅ ${startup.name} zebrał środki ratunkowe i wchodzi na giełdę.`, 'review');
    handleSuccessfulIPO(startup, getRandomInRange(1, 5));
    return true;
}

/** Prywatyzacja (szkolenie „Anioł Biznesu” poz. 5): fundusz przejmuje całość, inni inwestorzy dostają zwrot. */
function privatizeStartup(symbol) {
    if (getSkillLevel('startupInvestor') < 5) { showToast('Prywatyzacja wymaga 5. poziomu szkolenia „Anioł Biznesu”.', 'warning'); return false; }
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.assetType !== 'Startup' || startup.isPrivatized) return false;
    if (startup.stage !== 'funding') { showToast('Prywatyzować można tylko w fazie finansowania.', 'warning'); return false; }

    const price = startup.fundingGoal * 1.2; // 20% premii
    const already = playerPortfolio[symbol]?.investedAmount || 0;
    const cost = price - already;
    if (!canFundInvestInStartups(cost)) return false;

    refundOtherStartupClaims(startup);
    playerCash -= cost;
    startup.isPrivatized = true;
    startup.isScam = false; // pełne badanie due diligence przed wykupem
    startup.originalSuccessChance = startup.successChance;
    startup.successChance = 1;
    startup.currentFunding = startup.fundingGoal;
    startup.investors = { 'Fundusz': price };
    playerPortfolio[symbol] = { investedAmount: price, assetType: 'Startup', isInsured: playerPortfolio[symbol]?.isInsured || false };
    logEvent(`🏢 Fundusz prywatyzuje start-up ${startup.name} za ${cost.toFixed(2)} zł — gwarantowany debiut.`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

/** Zwrot wpłat botów, banków i puli (np. przy prywatyzacji przez fundusz). */
function refundOtherStartupClaims(startup) {
    const symbol = startup.symbol;
    for (const ai of aiCompetitors) {
        const holding = ai.portfolio[symbol];
        if (holding?.investedAmount > 0) { ai.cash += holding.investedAmount; delete ai.portfolio[symbol]; }
    }
    for (const bank of commercialBanks) {
        const amount = bank.startupInvestments?.[symbol];
        if (amount > 0) { bank.cash += amount; delete bank.startupInvestments[symbol]; }
    }
    for (const investment of startup.poolInvestors || []) {
        for (const [id, contribution] of Object.entries(investment.contributors || {})) {
            const share = investment.amount * contribution / Math.max(1e-9, Object.values(investment.contributors).reduce((a, b) => a + b, 0));
            if (id === 'player') playerCash += share;
            else { const ai = aiCompetitors.find(item => item.id === id); if (ai) ai.cash += share; }
            if (investmentPool.playerStakes[id]) investmentPool.playerStakes[id] = Math.max(0, investmentPool.playerStakes[id] - contribution);
        }
    }
    startup.poolInvestors = [];
}

// =================================================================================
// DEBIUT (IPO) — udziały znormalizowane do 100%
// =================================================================================

function collectStartupClaims(startup) {
    const symbol = startup.symbol;
    const claims = [];
    const fundClaim = playerPortfolio[symbol]?.investedAmount || 0;
    if (fundClaim > 0) claims.push({ kind: 'player', amount: fundClaim });
    for (const ai of aiCompetitors) {
        const amount = ai.portfolio[symbol]?.investedAmount || 0;
        if (amount > 0) claims.push({ kind: 'ai', ai, amount });
    }
    for (const investment of startup.poolInvestors || []) {
        const total = Object.values(investment.contributors || {}).reduce((a, b) => a + b, 0);
        if (!(total > 0)) continue;
        for (const [id, contribution] of Object.entries(investment.contributors)) {
            const amount = investment.amount * contribution / total;
            if (id === 'player') claims.push({ kind: 'player', amount, pool: true, contribution });
            else { const ai = aiCompetitors.find(item => item.id === id); if (ai) claims.push({ kind: 'ai', ai, amount, pool: true, contribution, id }); }
        }
    }
    for (const bank of commercialBanks) {
        const amount = bank.startupInvestments?.[symbol] || 0;
        if (amount > 0) claims.push({ kind: 'bank', bank, amount });
    }
    return claims;
}

function handleSuccessfulIPO(startup, successMultiplier) {
    const symbol = startup.symbol;
    const claims = collectStartupClaims(startup);
    const totalClaims = claims.reduce((sum, claim) => sum + claim.amount, 0);
    const base = Math.max(totalClaims, startup.fundingGoal + (startup.ipoPriceBonus || 0));
    const ipoPrice = getRandomInRange(25, 50);
    const totalShares = Math.max(1000, Math.floor(base * successMultiplier / ipoPrice));
    const investorShares = Math.floor(totalShares * STARTUP_INVESTORS_SHARE);
    let sharesHeld = 0;

    // Wyczyść roszczenia startupowe, potem przydziel akcje.
    delete playerPortfolio[symbol];
    aiCompetitors.forEach(ai => { if (ai.portfolio[symbol]?.investedAmount !== undefined) delete ai.portfolio[symbol]; });

    // Udział = wpłata / max(wpłaty, cel zbiórki): mała wpłata to mały udział, niezebrana część trafia do wolnego obrotu.
    const shareBase = Math.max(totalClaims, Number(startup.fundingGoal) || 0);
    for (const claim of claims) {
        const shares = shareBase > 0 ? Math.floor(investorShares * claim.amount / shareBase) : 0;
        if (shares <= 0) continue;
        sharesHeld += shares;
        if (claim.kind === 'player') {
            const holding = playerPortfolio[symbol] || { shares: 0, avgPrice: ipoPrice, assetType: 'stock' };
            holding.shares += shares;
            playerPortfolio[symbol] = holding;
            if (claim.pool) investmentPool.playerStakes.player = Math.max(0, (investmentPool.playerStakes.player || 0) - claim.contribution);
        } else if (claim.kind === 'ai') {
            const holding = claim.ai.portfolio[symbol] || { shares: 0, avgPrice: ipoPrice };
            holding.shares += shares;
            claim.ai.portfolio[symbol] = holding;
            if (claim.pool && investmentPool.playerStakes[claim.id]) investmentPool.playerStakes[claim.id] = Math.max(0, investmentPool.playerStakes[claim.id] - claim.contribution);
        } else if (claim.kind === 'bank') {
            claim.bank.stockPortfolio[symbol] = { shares, avgPrice: ipoPrice };
            delete claim.bank.startupInvestments[symbol];
        }
    }
    // Średnia cena zakupu funduszu = zainwestowana kwota / akcje (realny koszt w NAV).
    const fundClaim = claims.filter(claim => claim.kind === 'player').reduce((sum, claim) => sum + claim.amount, 0);
    if (playerPortfolio[symbol]?.shares > 0) playerPortfolio[symbol].avgPrice = fundClaim / playerPortfolio[symbol].shares;

    startup.assetType = undefined;
    startup.exchange = 'BRONZE';
    startup.price = ipoPrice;
    startup.totalShares = totalShares;
    startup.maxShares = totalShares;
    startup.sharesHeld = Math.min(sharesHeld, totalShares);
    startup.insiderShares = 0;
    startup.financialHealth = getRandomIntInRange(1, 4);
    startup.marketBehavior = { phase: 'ipo_boost', endTime: Date.now() + getRandomIntInRange(8000, 20000) / Math.max(1, currentSpeedMultiplier || 1) }; // czas gry, nie rzeczywisty
    ['fundingGoal', 'currentFunding', 'developmentProgress', 'successChance', 'stage', 'poolInvestors', 'rescueGoal', 'rescueCurrent', 'rescueTimeLeft'].forEach(key => delete startup[key]);

    // Bilans po debiucie: kapitał od inwestorów (bez niego wartość godziwa ≈ 0 i kurs spada do zera).
    const raisedCapital = Math.max(totalClaims, totalShares * ipoPrice * 0.9);
    startup.balanceSheet = { assets: raisedCapital, liabilities: 0, shareCapital: raisedCapital * 0.8, retainedEarnings: raisedCapital * 0.2 };
    startup.cash = totalClaims * 0.5; // połowa wpłat zostaje w kasie, reszta poszła na rozwój (aktywa niematerialne)
    startup.quarterlyEarnings = 0;
    if (typeof initializeDescriptionParts === 'function') initializeDescriptionParts(startup);
    if (typeof initializeResearchForStock === 'function') initializeResearchForStock(startup);
    if (typeof initializeFundamentals === 'function') initializeFundamentals(startup, true);
    if (!startup.reputation) startup.reputation = { player: 0 };

    const fundValue = (playerPortfolio[symbol]?.shares || 0) * ipoPrice;
    logEvent(`🔔 IPO: ${startup.name} debiutuje po ${ipoPrice.toFixed(2)} zł (${totalShares.toLocaleString('pl-PL')} akcji).${fundClaim > 0 ? ` Fundusz: ${fundClaim.toFixed(0)} zł → ${fundValue.toFixed(0)} zł.` : ''}`, 'review');
    if (startup.operatorStartup && typeof activateMarketOperator === 'function') activateMarketOperator(startup); // nowy rynek (markets.js)
    if (fundClaim > 0) playerProfile?.cv.push({ type: 'milestone', text: `Startup ${startup.name}: debiut na giełdzie (${fundClaim.toFixed(0)} → ${fundValue.toFixed(0)} zł).` });
}

/** Upadek startupu: zwroty (ubezpieczenie funduszu 75%), usunięcie; nowy startup pojawi się w czasie gry. */
function removeStartup(startup, refundMin = 0, refundMax = 0) {
    const symbol = startup.symbol;
    const holding = playerPortfolio[symbol];
    if (holding?.investedAmount > 0) {
        const refund = holding.isInsured ? holding.investedAmount * 0.75 : holding.investedAmount * (refundMax > 0 ? getRandomInRange(refundMin, refundMax) : 0);
        if (refund > 0) playerCash += refund;
        logEvent(`📉 Startup ${startup.name} nie debiutuje — fundusz odzyskuje ${refund.toFixed(2)} z ${holding.investedAmount.toFixed(2)} zł${holding.isInsured ? ' (ubezpieczenie)' : ''}.`, 'review');
        playerProfile?.cv.push({ type: 'milestone', text: `Startup ${startup.name}: upadek (odzysk ${refund.toFixed(0)} zł).` });
    }
    for (const ai of aiCompetitors) {
        const aiHolding = ai.portfolio[symbol];
        if (aiHolding?.investedAmount > 0) ai.cash += aiHolding.investedAmount * (refundMax > 0 ? getRandomInRange(refundMin, refundMax) : 0);
        delete ai.portfolio[symbol];
    }
    for (const bank of commercialBanks) if (bank.startupInvestments) delete bank.startupInvestments[symbol];
    delete playerPortfolio[symbol];
    if (startup.operatorStartup && typeof onOperatorStartupRemoved === 'function') onOperatorStartupRemoved(startup); // upadek operatora: sponsorzy znikają
    const index = stocks.findIndex(s => s.symbol === symbol);
    if (index > -1) stocks.splice(index, 1);
}

// =================================================================================
// ZDARZENIA INKUBATORA
// =================================================================================

/** Anioł biznesu z zewnątrz dorzuca środki do startupu w fazie finansowania. */
function triggerStartupFundingEvent() {
    const candidates = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding');
    const startup = getRandomElement(candidates);
    if (!startup) return null;
    const amount = Math.round(startup.fundingGoal * getRandomInRange(0.05, 0.15));
    startup.currentFunding = Math.min(startup.fundingGoal, startup.currentFunding + amount);
    logEvent(`[INKUBATOR] 👼 Anioł biznesu wspiera ${startup.name} kwotą ${amount.toLocaleString('pl-PL')} zł.`, 'market');
    return startup.symbol;
}

const gamingStartupEvents = [
    { text: name => `🎮 Zwiastun gry ${name} bije rekordy wyświetleń!`, progress: 8, chance: 0.04 },
    { text: name => `🐞 Testerzy ${name} znajdują krytyczny błąd — prace się opóźniają.`, progress: -10, chance: -0.03 },
    { text: name => `🏆 ${name} wygrywa nagrodę na targach gier.`, progress: 5, chance: 0.06 },
    { text: name => `💸 Wydawca wycofuje się ze współpracy z ${name}.`, progress: -5, chance: -0.06 }
];

function triggerGamingStartupEvent(startup) {
    const event = getRandomElement(gamingStartupEvents);
    startup.developmentProgress = Math.max(0, Math.min(99, startup.developmentProgress + event.progress));
    startup.successChance = Math.max(0, Math.min(1, startup.successChance + event.chance));
    logEvent(`[INKUBATOR] ${event.text(startup.name)}`, 'company');
}

/** Oferta specjalna startupu dla funduszu (zniżka, bonus udziałów lub wyższa szansa sukcesu). */
function triggerStartupOfferEvent() {
    const startup = getRandomElement(stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding'));
    if (!startup || getFundStartupCapacity() < 500 || typeof openStartupOfferModal !== 'function') return null;
    const offers = [
        { type: 'DISCOUNT', value: 0.1, offerText: `${startup.name} oferuje funduszowi 10% zniżki przy inwestycji w tej rundzie.` },
        { type: 'BONUS_SHARES', value: 0.15, offerText: `${startup.name} proponuje 15% bonusowych udziałów za wejście teraz.` },
        { type: 'SUCCESS_BOOST', value: 0.05, offerText: `${startup.name} pozyskał mentora — inwestycja teraz podniesie szansę sukcesu o 5 pp.` }
    ];
    openStartupOfferModal({ startup, offer: getRandomElement(offers) });
    return startup.symbol;
}
