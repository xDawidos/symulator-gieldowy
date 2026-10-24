// campaigns.js — 0.15.2 „Kochaj i zarabiaj”: kalendarz, kampanie emisyjne, transze z lock-upem,
// gwarancja kapitału z kredytem płynnościowym, mandat, grupy inwestorów, analityk IR, VIP.
// Wszystko opcjonalne: bez kampanii, mandatu, IR i VIP-ów gra działa jak w 0.15.1 (stan w playerFund.*, pola dodawane leniwie).
'use strict';

// ---------------------------------------------------------------------------------
// K1. Kalendarz „Rok · kw. · tydz.”
// ---------------------------------------------------------------------------------

function getGameCalendar() {
    const q = typeof macro === 'object' ? Number(macro.quarter) || 0 : 0;
    const week = Math.min(WEEKS_PER_QUARTER, Math.max(1, Number(playerFund?.calWeek) || 1));
    return { year: Math.floor(q / 4) + 1, quarter: (q % 4) + 1, week, absQuarter: q };
}

function formatGameDate(cal = getGameCalendar(), short = false) {
    return short ? `R${cal.year} · K${cal.quarter} · T${cal.week}` : `Rok ${cal.year} · kw. ${cal.quarter} · tydz. ${cal.week}`;
}

/** Termin kwartalny (numer bezwzględny) w tym samym formacie: „Rok 3 · kw. 2”. */
function formatQuarterDate(absQuarter) {
    return `Rok ${Math.floor(absQuarter / 4) + 1} · kw. ${(absQuarter % 4) + 1}`;
}

function advanceFundCalendar() {
    const q = Number(macro?.quarter) || 0;
    if (playerFund.calQuarter !== q) { playerFund.calQuarter = q; playerFund.calWeek = 1; }
    else playerFund.calWeek = Math.min(WEEKS_PER_QUARTER, (Number(playerFund.calWeek) || 1) + 1);
}

function currentQuarter() { return Number(macro?.quarter) || 0; }

// ---------------------------------------------------------------------------------
// Tabele: atrakcyjność warunków (K3–K5), mandaty (K5), grupy (K6)
// ---------------------------------------------------------------------------------

const SUBSCRIPTION_DURATIONS = {
    week:     { weeks: 1, reach: 0.5, label: '1 tydzień' },
    twoWeeks: { weeks: 2, reach: 0.8, label: '2 tygodnie' },
    quarter:  { weeks: 5, reach: 1.2, label: '1 kwartał' }
};
const CAMPAIGN_COST_TARGET = 0.002;   // 0,2% celu płatne na starcie
const CAMPAIGN_COST_RAISED = 0.005;   // 0,5% zebranej kwoty
const CAMPAIGN_TARGET_MIN = 0.05;
const CAMPAIGN_TARGET_MAX = 0.30;
const CAMPAIGN_HISTORY_LIMIT = 8;
const CAMPAIGN_DEMAND_SCALE = 1;      // pokrętło strojenia popytu kampanii (K9)
const LOCK_MAX_YEARS = 3;
const GUARANTEE_PROFIT_SHARE = 0.7;   // klient dostaje 70% zysku ponad cenę wejścia
const GUARANTEE_MAX_SHARE = 0.3;      // transze z gwarancją ≤ 30% udziałów funduszu
const LIQUIDITY_LOAN_LIMIT = 0.2;     // ≤ 20% aktywów
const LIQUIDITY_LOAN_SPREAD = 0.03;
const LIQUIDITY_LOAN_REPAY = 0.1;
const LOCK_TRUST_LOSS_WEEK = 2;       // łączny spadek zaufania od niezadowolonych w lock-upie na tydzień

const LOCK_PATIENT = ['institution', 'investor', 'rich', 'senior', 'officer', 'careful'];
const LOCK_IMPATIENT = ['sly', 'modern', 'fearful'];
const GUARANTEE_LOVERS = { careful: 1.5, fearful: 1.5, senior: 1.5, miser: 1.5, institution: 1.2, sly: 0.7, modern: 0.7 };

function getLockDemandMultiplier(type, years) {
    if (LOCK_PATIENT.includes(type)) return 1 + 0.15 * years;
    if (LOCK_IMPATIENT.includes(type)) return Math.max(0, 1 - 0.3 * years);
    return 1 - 0.1 * years;
}

const MANDATES = {
    sector:    { label: 'Sektorowy',   icon: '🏭', likes: ['investor', 'rich'],                 threshold: 0.25, hint: '≥ 25% aktywów w wybranej grupie sektorów' },
    dividend:  { label: 'Dywidendowy', icon: '💵', likes: ['senior', 'rich', 'miser'],          threshold: 0.03, hint: 'stopa dywidendy portfela ≥ 3%' },
    defensive: { label: 'Defensywny',  icon: '🛡️', likes: ['senior', 'careful', 'officer'],     threshold: 0.50, hint: '≥ 50% akcji w spółkach defensywnych' },
    growth:    { label: 'Wzrostowy',   icon: '🚀', likes: ['modern', 'brave'],                  threshold: 0.40, hint: '≥ 40% akcji w spółkach wzrostowych' },
    safe:      { label: 'Bezpieczny',  icon: '🏦', likes: ['careful', 'fearful', 'institution'], threshold: 0.30, hint: '≥ 30% aktywów w obligacjach i lokatach' }
};

/** Identyfikator mandatu: „defensive” albo „sector:tech”. */
function getMandateDef(id) {
    if (!id) return null;
    const [kind, arg] = String(id).split(':');
    const base = MANDATES[kind];
    if (!base) return null;
    const group = kind === 'sector' ? SECTOR_GROUPS.find(g => g.id === arg) : null;
    if (kind === 'sector' && !group) return null;
    return { ...base, kind, id, label: group ? `${base.label}: ${group.name}` : base.label, group };
}

function getStockSectorGroup(stock) {
    const sector = Array.isArray(stock.sector) ? stock.sector[0] : stock.sector;
    return SECTORS[sector]?.group || null;
}

function getFundSafeAssetsShare() {
    const assets = getFundAssets();
    if (!(assets > 0)) return 0;
    const bonds = typeof getFundBondsValue === 'function' ? getFundBondsValue() : 0;
    const deposits = typeof getFundDepositsValue === 'function' ? getFundDepositsValue() : 0;
    return (bonds + deposits) / assets;
}

function getFundDividendYield() {
    let total = 0, weighted = 0;
    for (const symbol in playerPortfolio) {
        const holding = playerPortfolio[symbol];
        const stock = stocks.find(s => s.symbol === symbol);
        if (!stock || stock.assetType || holding?.assetType === 'Startup') continue;
        const value = getHoldingMarketValue(symbol, holding);
        total += value;
        weighted += value * (Number(stock.lastDividend?.yield) || 0) * 4; // yield z ostatniej wypłaty (kwartalnej) → rocznie
    }
    return total > 0 ? weighted / total : 0;
}

function getFundSectorGroupShare(groupId) {
    const assets = getFundAssets();
    if (!(assets > 0)) return 0;
    let value = 0;
    for (const symbol in playerPortfolio) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock && !stock.assetType && getStockSectorGroup(stock) === groupId) value += getHoldingMarketValue(symbol, playerPortfolio[symbol]);
    }
    return value / assets;
}

function measureMandate(def) {
    switch (def.kind) {
        case 'sector': return getFundSectorGroupShare(def.group.id);
        case 'dividend': return getFundDividendYield();
        case 'defensive': return getFundPortfolioDefensiveShare();
        case 'growth': return getFundPortfolioModernShare();
        case 'safe': return getFundSafeAssetsShare();
    }
    return 0;
}

const INVESTOR_GROUPS = {
    retail:      { label: 'Detaliczni',     icon: '👥', types: ['miser', 'fearful', 'sly', 'careful', 'brave', 'modern', 'ethical', 'senior', 'officer'] },
    institution: { label: 'Instytucjonalni', icon: '🏛️', types: ['institution', 'investor'] },
    wealthy:     { label: 'Zamożni',        icon: '💎', types: ['rich'] }
};

function getInvestorGroupOf(client) {
    if (client.vip) return 'wealthy';
    return Object.keys(INVESTOR_GROUPS).find(id => INVESTOR_GROUPS[id].types.includes(client.type)) || 'retail';
}

// ---------------------------------------------------------------------------------
// K3. Transze i lock-up
// ---------------------------------------------------------------------------------

function getTranches(client) {
    if (!Array.isArray(client.tranches)) client.tranches = [];
    return client.tranches;
}

function addTranche(client, units, nav, terms) {
    const q = currentQuarter();
    const lockYears = Math.max(0, Math.min(LOCK_MAX_YEARS, Number(terms.lockYears) || 0));
    if (!lockYears && !terms.mandate) return null; // zwykłe udziały nie tworzą transzy
    const tranche = {
        units, issueNav: nav, issueGig: getBenchmarkValue(),
        lockedUntilQ: lockYears ? q + lockYears * 4 : q,
        guaranteed: Boolean(terms.guarantee),
        mandateId: terms.mandate || null,
        mandateUntilQ: terms.mandate ? q + (lockYears ? lockYears * 4 : 8) : null
    };
    getTranches(client).push(tranche);
    return tranche;
}

function isMandateBreached(id) {
    return Boolean(id && playerFund?.mandateState?.[id]?.breached);
}

/** Transza zablokowana: lock-up trwa, a mandat nie został złamany (złamany odblokowuje udziały w ramach bramki). */
function isTrancheLocked(tranche) {
    if (tranche.lockedUntilQ <= currentQuarter()) return false;
    return !isMandateBreached(tranche.mandateId);
}

function getLockedUnits(client) {
    if (!Array.isArray(client.tranches) || !client.tranches.length) return 0;
    const locked = client.tranches.filter(isTrancheLocked).reduce((sum, t) => sum + t.units, 0);
    return Math.min(client.units, locked);
}

/** Udziały, które klient może umorzyć na rynku pierwotnym (poza lock-upem). */
function getRedeemableUnits(client) {
    return Math.max(0, client.units - getLockedUnits(client));
}

/** Po zmianie liczby udziałów klienta: transze nie przekraczają jego udziałów; wygasłe zwykłe znikają. */
function normalizeClientTranches(client) {
    if (!Array.isArray(client.tranches) || !client.tranches.length) return;
    const q = currentQuarter();
    client.tranches = client.tranches.filter(t => t.guaranteed || t.lockedUntilQ > q || (t.mandateId && t.mandateUntilQ > q));
    let excess = client.tranches.reduce((sum, t) => sum + t.units, 0) - client.units;
    for (let i = client.tranches.length - 1; i >= 0 && excess > 0.001; i--) {
        const cut = Math.min(excess, client.tranches[i].units);
        client.tranches[i].units -= cut;
        excess -= cut;
    }
    client.tranches = client.tranches.filter(t => t.units > 0.01);
}

function getGuaranteedUnits() {
    return (playerFund?.clients || []).reduce((sum, c) => sum + getTranches(c).filter(t => t.guaranteed).reduce((s, t) => s + t.units, 0), 0);
}

/** Zobowiązanie z gwarancji: suma max(0, cena wejścia − NAV) × udziały transz z gwarancją. */
function getGuaranteeLiability() {
    const nav = getFundNav();
    return (playerFund?.clients || []).reduce((sum, c) => sum + getTranches(c).filter(t => t.guaranteed).reduce((s, t) => s + Math.max(0, t.issueNav - nav) * t.units, 0), 0);
}

function getLockedFundUnits() {
    return (playerFund?.clients || []).reduce((sum, c) => sum + getLockedUnits(c), 0);
}

// ---------------------------------------------------------------------------------
// K4. Gwarancja kapitału i kredyt płynnościowy
// ---------------------------------------------------------------------------------

function getLiquidityLoanPrincipal() {
    return Number(playerFund?.liquidityLoan?.principal) || 0;
}

function drawLiquidityLoan(need) {
    const netAssets = getFundAssets() - getLiquidityLoanPrincipal(); // limit 20% aktywów bez pożyczonej gotówki
    const limit = Math.max(0, netAssets * LIQUIDITY_LOAN_LIMIT - getLiquidityLoanPrincipal());
    const amount = Math.min(need, limit);
    if (!(amount > 0)) return 0;
    const loan = playerFund.liquidityLoan || (playerFund.liquidityLoan = { principal: 0, drawn: 0, since: currentQuarter() });
    const first = loan.principal <= 0;
    loan.principal += amount;
    loan.drawn += amount;
    recordPayment('external:bank-komercyjny', 'player-fund', amount, 'Kredyt płynnościowy');
    playerCash += amount;
    if (first) {
        playerFund.trust = Math.max(0, playerFund.trust - 5);
        const text = `Fundusz zaciągnął kredyt płynnościowy ${formatZl(amount, 0)} na wypłaty z gwarancji kapitału (stopa bazowa + 3 pp).`;
        logEvent(`🏦 ${text}`, 'review');
        if (typeof addMail === 'function') addMail({ sender: 'KNF', subject: 'Informacja: kredyt płynnościowy funduszu', body: `${text} KNF jedynie odnotowuje fakt — bez kary. Klienci widzą kredyt: zaufanie −5. Kredyt spłaca się samoczynnie (10% kapitału na tydzień), gdy gotówka przekracza 5% aktywów.`, importance: 2 });
    }
    return amount;
}

function settleGuaranteedTranche(client, tranche) {
    const stats = playerFund.guaranteeStats || (playerFund.guaranteeStats = { settled: 0, topups: 0, topupValue: 0, shortfalls: 0 });
    const nav = getFundNav();
    const units = Math.min(tranche.units, client.units);
    tranche.guaranteed = false;
    stats.settled++;
    if (!(nav > 0) || !(units > 0)) return;
    if (nav >= tranche.issueNav) {
        // Udział w zysku 70%: 30% zysku zostaje w funduszu (umarzamy część udziałów klienta, gotówka nie rusza).
        const cancel = (1 - GUARANTEE_PROFIT_SHARE) * (nav - tranche.issueNav) * units / nav;
        client.units -= cancel; tranche.units -= cancel; playerFund.units -= cancel;
        if (tranche.issueGig > 0 && getBenchmarkValue() / tranche.issueGig - 1 <= -0.10) stats.cleanInBear = true; // gwarancja bez dopłaty mimo bessy
        noteClientHistory(client, `Koniec lock-upu z gwarancją: ${formatNumberPl(cancel, 1)} udziałów zostaje w funduszu (udział w zysku ${GUARANTEE_PROFIT_SHARE * 100}%).`);
        return;
    }
    const shortfall = (tranche.issueNav - nav) * units;
    const before = Math.max(0, playerCash);
    if (before < shortfall) forceLiquidation(shortfall - before);
    let paid = Math.min(shortfall, Math.max(0, playerCash));
    playerCash -= paid;
    if (paid < shortfall) {
        const borrowed = drawLiquidityLoan(shortfall - paid);
        const fromLoan = Math.min(borrowed, Math.max(0, playerCash));
        playerCash -= fromLoan;
        paid += fromLoan;
    }
    if (paid > 0) recordPayment('player-fund', 'external:klienci', paid, 'Dopłata z gwarancji kapitału');
    stats.topups++; stats.topupValue += paid;
    if (paid < shortfall - 0.01) {
        stats.shortfalls++;
        playerFund.trust = Math.max(0, playerFund.trust - 15);
        noteClientHistory(client, `Gwarancja kapitału niepełna: dopłata ${formatZl(paid, 0)} z ${formatZl(shortfall, 0)}.`);
        logEvent(`⚠️ Gwarancja kapitału niepełna dla ${client.name}: ${formatZl(paid, 0)} z ${formatZl(shortfall, 0)} — zaufanie −15.`, 'warning');
    } else {
        noteClientHistory(client, `Koniec lock-upu z gwarancją: dopłata ${formatZl(paid, 0)} do ceny wejścia.`);
        logEvent(`🛡️ Gwarancja kapitału: dopłata ${formatZl(paid, 0)} dla ${client.name}.`, 'review');
    }
    if (nav < tranche.issueNav) client.satisfaction = Math.max(0, client.satisfaction - 0.1);
}

function processLiquidityLoanWeekly() {
    const loan = playerFund.liquidityLoan;
    if (!loan || !(loan.principal > 0)) return;
    const rate = (Number(centralBank?.baseInterestRate) || 0.05) + LIQUIDITY_LOAN_SPREAD;
    const interest = Math.min(loan.principal * rate / FUND_WEEKS_PER_YEAR, Math.max(0, playerCash));
    if (interest > 0) { playerCash -= interest; recordPayment('player-fund', 'external:bank-komercyjny', interest, 'Odsetki od kredytu płynnościowego'); loan.interestPaid = (loan.interestPaid || 0) + interest; }
    const spare = playerCash - getFundAssets() * 0.05;
    if (spare > 0) {
        const repay = Math.min(loan.principal, spare, Math.max(loan.principal * LIQUIDITY_LOAN_REPAY, 50));
        playerCash -= repay; loan.principal -= repay;
        recordPayment('player-fund', 'external:bank-komercyjny', repay, 'Spłata kredytu płynnościowego');
        if (loan.principal < 0.01) { loan.principal = 0; logEvent('🏦 Kredyt płynnościowy funduszu spłacony.', 'review'); }
    }
}

// ---------------------------------------------------------------------------------
// K2. Kampanie emisyjne
// ---------------------------------------------------------------------------------

function getCampaignMaxTargetPct() {
    return Math.min(CAMPAIGN_TARGET_MAX, 0.05 + 0.20 * (playerFund?.trust ?? 0) / 100);
}

/** Atrakcyjność warunków kampanii dla typu klienta (mnożnik popytu). */
function getOfferAttractiveness(type, terms) {
    let value = getLockDemandMultiplier(type, terms.lockYears || 0);
    if (terms.guarantee) value *= GUARANTEE_LOVERS[type] || 1;
    const mandate = getMandateDef(terms.mandate);
    if (mandate?.likes.includes(type)) value *= 1.3;
    return value;
}

function getCampaignDemandMultiplier() {
    const excess = typeof getRecentExcessAnnual === 'function' ? getRecentExcessAnnual() : 0;
    let mult = Math.max(0.5, Math.min(1.5, 1 + 3 * excess)); // ±30% za ±10 pp
    const sentiment = typeof getMarketRegime === 'function' ? getMarketRegime('home')?.sentiment : null;
    if (Number.isFinite(sentiment)) mult *= sentiment < 25 ? 0.7 : sentiment > 75 ? 1.2 : 1;
    return mult * CAMPAIGN_DEMAND_SCALE;
}

function getCampaignBlockReason(terms) {
    if (!playerFund) return 'Brak funduszu.';
    if (playerFund.subscription) return 'Kampania już trwa.';
    const base = getEmissionBlockReason();
    if (base) return base;
    if (!SUBSCRIPTION_DURATIONS[terms.duration]) return 'Wybierz czas trwania kampanii.';
    if (terms.guarantee && !(terms.lockYears >= 1)) return 'Gwarancja kapitału wymaga lock-upu co najmniej 1 rok.';
    if (terms.mandate && !getMandateDef(terms.mandate)) return 'Nieznany mandat.';
    const targetUnits = getCampaignTargetUnits(terms.targetPct);
    if (terms.guarantee && getGuaranteedUnits() + targetUnits > GUARANTEE_MAX_SHARE * (playerFund.units + targetUnits)) return `Transze z gwarancją mogą stanowić najwyżej ${GUARANTEE_MAX_SHARE * 100}% udziałów funduszu.`;
    if (getFundNav() * targetUnits * CAMPAIGN_COST_TARGET > Math.max(0, playerCash)) return 'Brak gotówki na koszt kampanii.';
    return null;
}

function getCampaignTargetUnits(targetPct) {
    const pct = Math.max(CAMPAIGN_TARGET_MIN, Math.min(getCampaignMaxTargetPct(), Number(targetPct) || CAMPAIGN_TARGET_MIN));
    return Math.floor(playerFund.units * pct);
}

function startSubscriptionCampaign(terms) {
    terms = { duration: 'quarter', targetPct: 0.1, lockYears: 0, guarantee: false, mandate: null, ...terms };
    terms.lockYears = Math.max(0, Math.min(LOCK_MAX_YEARS, Math.floor(Number(terms.lockYears) || 0)));
    const blocked = getCampaignBlockReason(terms);
    if (blocked) return { ok: false, reason: blocked };

    const nav = getFundNav();
    const targetUnits = getCampaignTargetUnits(terms.targetPct);
    const dur = SUBSCRIPTION_DURATIONS[terms.duration];
    playerFund.current.emissions++;
    playerFund.subscription = {
        ...terms, targetUnits, raisedUnits: 0, raisedValue: 0, cost: 0, weeksLeft: dur.weeks, startQ: currentQuarter(),
        startDate: formatGameDate(), startNav: nav, newClients: 0, byType: {}
    };
    chargeCampaignCost(nav * targetUnits * CAMPAIGN_COST_TARGET);
    logEvent(`📣 Kampania emisyjna: cel ${formatNumberPl(targetUnits, 0)} udziałów, ${dur.label}, lock-up ${terms.lockYears} lat${terms.guarantee ? ', z gwarancją kapitału' : ''}.`, 'review');
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('runda_subskrypcji');
    return { ok: true };
}

function chargeCampaignCost(fee) {
    const paid = Math.min(fee, Math.max(0, playerCash));
    if (!(paid > 0)) return 0;
    playerCash -= paid;
    recordPayment('player-fund', 'external:agencja-reklamowa', paid, 'Koszt kampanii emisyjnej');
    if (playerFund.subscription) playerFund.subscription.cost += paid;
    return paid;
}

function applySubscriptionUnits(client, units, nav, sub) {
    const value = units * nav;
    client.avgCost = (client.avgCost * client.units + value) / (client.units + units);
    client.units += units;
    addTranche(client, units, nav, sub);
    playerCash += value;
    playerFund.units += units;
    playerFund.current.inflow += value;
    recordPayment('external:klienci', 'player-fund', value, 'Kampania emisyjna');
    noteFundFlow('in', 'campaign', value, units);
    noteClientHistory(client, `Obejmuje ${formatNumberPl(units, 1)} udziałów w kampanii emisyjnej po ${formatNumberPl(nav, 2)} PLN${sub.lockYears ? ` (lock-up ${sub.lockYears} lat)` : ''}.`);
    sub.raisedUnits += units;
    sub.raisedValue += value;
    sub.byType[client.type] = (sub.byType[client.type] || 0) + value;
    chargeCampaignCost(value * CAMPAIGN_COST_RAISED);
    return value;
}

function processSubscriptionWeekly() {
    const sub = playerFund.subscription;
    if (!sub) return;
    const nav = getFundNav();
    if (!(nav > 0)) return finishSubscription();
    const dur = SUBSCRIPTION_DURATIONS[sub.duration];
    const trust = playerFund.trust / 100;
    const globalMult = getCampaignDemandMultiplier();
    const demand = [];
    const sizeFactor = Math.sqrt(Math.max(1, getFundAssets() / 30000)); // nowi klienci wpłacają więcej do większego funduszu

    for (const client of playerFund.clients) {
        if (client.satisfaction <= 0.6 || client.joinedPeriod > playerFund.periodNumber) continue;
        const attract = getOfferAttractiveness(client.type, sub);
        if (attract <= 0) continue;
        if (Math.random() < Math.min(1, trust * dur.reach / dur.weeks * attract)) {
            const def = CLIENT_TYPES[client.type];
            // dokupuje ok. 30% typowej wpłaty albo 12% swojej pozycji (większy fundusz = większe kwoty)
            const holding = client.units * nav * 0.12;
            demand.push({ client, type: client.type, value: Math.max(getRandomInRange(def.size[0], def.size[1]) * 0.3, holding) * attract * globalMult });
        }
    }
    const expectedNew = trust * 4 * dur.reach / dur.weeks * globalMult;
    const newCount = Math.floor(expectedNew + Math.random());
    for (let i = 0; i < newCount; i++) {
        const type = trust > 0.7 && Math.random() < 0.2 ? 'institution' : randomCharacter(playerFund.trust);
        const attract = getOfferAttractiveness(type, sub);
        if (attract <= 0) continue;
        const def = CLIENT_TYPES[type];
        demand.push({ client: null, type, value: getRandomInRange(def.size[0], def.size[1]) * Math.min(2, attract) * sizeFactor });
    }

    const totalValue = demand.reduce((sum, d) => sum + d.value, 0);
    const room = (sub.targetUnits - sub.raisedUnits) * nav;
    const fill = totalValue > 0 ? Math.min(1, room / totalValue) : 0;
    for (const d of demand) {
        const units = d.value * fill / nav;
        if (units < 0.5) continue;
        let client = d.client;
        if (!client) { client = addFundClient(d.type, 0, nav); sub.newClients++; }
        applySubscriptionUnits(client, units, nav, sub);
    }

    sub.weeksLeft--;
    if (sub.weeksLeft <= 0 || sub.raisedUnits >= sub.targetUnits - 0.5) finishSubscription();
}

function finishSubscription() {
    const sub = playerFund.subscription;
    if (!sub) return;
    delete playerFund.subscription;
    const fillPct = sub.targetUnits > 0 ? sub.raisedUnits / sub.targetUnits : 0;
    const entry = { startQ: sub.startQ, endQ: currentQuarter(), duration: sub.duration, targetUnits: sub.targetUnits, raisedUnits: sub.raisedUnits, raisedValue: sub.raisedValue, cost: sub.cost, lockYears: sub.lockYears, guarantee: sub.guarantee, mandate: sub.mandate, newClients: sub.newClients, fill: fillPct };
    (playerFund.campaignHistory || (playerFund.campaignHistory = [])).unshift(entry);
    if (playerFund.campaignHistory.length > CAMPAIGN_HISTORY_LIMIT) playerFund.campaignHistory.length = CAMPAIGN_HISTORY_LIMIT;
    const totals = playerFund.campaignTotals || (playerFund.campaignTotals = { count: 0, fillSum: 0, raised: 0, cost: 0, byDuration: {} });
    totals.count++; totals.fillSum += fillPct; totals.raised += sub.raisedValue; totals.cost += sub.cost;
    const bd = totals.byDuration[sub.duration] || (totals.byDuration[sub.duration] = { count: 0, fillSum: 0 });
    bd.count++; bd.fillSum += fillPct;

    const types = Object.entries(sub.byType).sort((a, b) => b[1] - a[1]).map(([type, value]) => `${CLIENT_TYPES[type]?.label || type}: ${formatZl(value, 0)}`).join(', ') || 'brak wpłat';
    const text = `Kampania emisyjna zakończona: zebrano ${formatNumberPl(sub.raisedUnits, 1)} z ${formatNumberPl(sub.targetUnits, 0)} udziałów (${(fillPct * 100).toFixed(0)}% celu, ${formatZl(sub.raisedValue, 0)}).`;
    logEvent(`📣 ${text}`, 'review');
    if (typeof pushNews === 'function') pushNews(`${text.split(':')[0]}: ${(fillPct * 100).toFixed(0)}% celu`);
    if (typeof addMail === 'function') addMail({
        sender: 'Dział obsługi klienta', subject: 'Raport kampanii emisyjnej',
        body: `${text} Nowi klienci: ${sub.newClients}. Wpłaty według typów: ${types}. Koszt kampanii: ${formatZl(sub.cost, 0)} (0,2% celu + 0,5% zebranej kwoty). Warunki: ${SUBSCRIPTION_DURATIONS[sub.duration].label}, lock-up ${sub.lockYears} lat${sub.guarantee ? ', gwarancja kapitału' : ''}${sub.mandate ? `, mandat ${getMandateDef(sub.mandate)?.label}` : ''}. Start: ${sub.startDate}.`,
        importance: 2
    });
    if (fillPct >= 0.99 && typeof unlockAchievement === 'function') unlockAchievement('full_subscription');
}

// ---------------------------------------------------------------------------------
// K3/K4/K5. Tydzień transz, mandaty
// ---------------------------------------------------------------------------------

function processTranchesWeekly() {
    const q = currentQuarter();
    const nextExit = { units: 0, clients: 0 };
    for (const client of playerFund.clients) {
        const tranches = getTranches(client);
        if (!tranches.length) continue;
        for (const t of [...tranches]) {
            if (t.guaranteed && t.lockedUntilQ <= q) settleGuaranteedTranche(client, t);
            else if (t.lockedUntilQ === q + 1) { nextExit.units += t.units; nextExit.clients++; }
        }
        normalizeClientTranches(client);
    }
    if (nextExit.units > 0.5 && playerFund.lockNoticeQ !== q) {
        playerFund.lockNoticeQ = q;
        const text = `${formatNumberPl(nextExit.units, 0)} udziałów (${nextExit.clients} klientów) wychodzi z lock-upu w przyszłym kwartale — przygotuj gotówkę.`;
        logEvent(`🔓 ${text}`, 'review');
        if (typeof addMail === 'function') addMail({ sender: 'Dział obsługi klienta', subject: 'Udziały wychodzą z lock-upu', body: `${text} Termin: ${formatQuarterDate(q + 1)}.`, importance: 2 });
    }
}

function sampleMandatesWeekly() {
    const samples = playerFund.mandateSamples || (playerFund.mandateSamples = {});
    const active = new Set();
    for (const client of playerFund.clients) for (const t of getTranches(client)) if (t.mandateId && t.mandateUntilQ > currentQuarter()) active.add(t.mandateId);
    for (const id of active) {
        const def = getMandateDef(id);
        if (!def) continue;
        const s = samples[id] || (samples[id] = { sum: 0, n: 0 });
        s.sum += measureMandate(def); s.n++;
    }
}

/** Początek kwartału: średnia z kwartału vs próg mandatu; 2 kwartały naruszenia pod rząd = złamany mandat. */
function evaluateMandatesQuarterly() {
    const samples = playerFund.mandateSamples || {};
    const state = playerFund.mandateState || (playerFund.mandateState = {});
    const q = currentQuarter();
    for (const id of Object.keys(samples)) {
        const def = getMandateDef(id), s = samples[id];
        if (!def || !s.n) continue;
        const avg = s.sum / s.n;
        const st = state[id] || (state[id] = { violations: 0, breached: false, quarters: 0, bad: 0 });
        st.quarters++; st.last = avg;
        if (avg < def.threshold) { st.violations++; st.bad++; } else st.violations = 0;
        if (st.violations >= 2 && !st.breached) {
            st.breached = true;
            playerFund.trust = Math.max(0, playerFund.trust - 10);
            const text = `Mandat „${def.label}” złamany: ${def.hint} nie jest spełnione dwa kwartały z rzędu. Klienci z tym mandatem mogą umorzyć także udziały w lock-upie (zaufanie −10).`;
            logEvent(`📜 ${text}`, 'warning');
            if (typeof addMail === 'function') addMail({ sender: 'Dział obsługi klienta', subject: 'Złamany mandat inwestycyjny', body: text, importance: 3 });
            if (typeof pushNews === 'function') pushNews(`Fundusz złamał mandat „${def.label}”`);
        }
    }
    playerFund.mandateSamples = {};
    // Mandat bez żywych transz wygasa (stan do pomiaru zostaje w mandateStats).
    for (const id of Object.keys(state)) {
        const alive = playerFund.clients.some(c => getTranches(c).some(t => t.mandateId === id && t.mandateUntilQ > q));
        if (!alive) {
            const stats = playerFund.mandateStats || (playerFund.mandateStats = { total: 0, breached: 0, kept: 0 });
            stats.total++;
            if (state[id].breached) stats.breached++; else { stats.kept++; if (state[id].quarters >= 4 && typeof unlockAchievement === 'function') unlockAchievement('promise_kept'); }
            delete state[id];
        }
    }
}

/** Klienci z złamanym mandatem wychodzą (przez bramkę umorzeń), przyczyna „📜 złamany mandat”. */
function processMandateBreachExits() {
    for (const client of [...playerFund.clients]) {
        const breached = getTranches(client).filter(t => isMandateBreached(t.mandateId) && t.lockedUntilQ > currentQuarter());
        if (!breached.length || Math.random() > 0.2) continue;
        const want = Math.min(breached.reduce((s, t) => s + t.units, 0), getRedeemableUnits(client));
        const units = passRedemptionGate(client, want);
        if (!(units > 0)) continue;
        const paid = redeemClientUnits(client, units);
        noteFundFlow('out', 'mandate', paid, units);
        noteClientHistory(client, `Złamany mandat — umarza ${formatNumberPl(units, 1)} udziałów (${formatZl(paid, 0)}).`);
        normalizeClientTranches(client);
    }
}

/** Zmiana mandatu transz: zaufanie −5. */
function changeMandate(oldId, newId) {
    if (!playerFund || !getMandateDef(newId) || oldId === newId) return false;
    let changed = 0;
    for (const client of playerFund.clients) for (const t of getTranches(client)) if (t.mandateId === oldId) { t.mandateId = newId; changed++; }
    if (!changed) return false;
    playerFund.trust = Math.max(0, playerFund.trust - 5);
    if (playerFund.mandateState) delete playerFund.mandateState[oldId];
    logEvent(`📜 Zmiana mandatu ${getMandateDef(oldId)?.label || oldId} → ${getMandateDef(newId).label}: zaufanie −5.`, 'review');
    return true;
}

// ---------------------------------------------------------------------------------
// K6. Grupy inwestorów i analityk IR
// ---------------------------------------------------------------------------------

const IR_LEVELS = [
    { level: 0, label: 'Brak analityka', pct: 0, min: 0 },
    { level: 1, label: 'Analityk IR', pct: 0.0005, min: 200, gives: 'nastroje 3 grup inwestorów' },
    { level: 2, label: 'Analityk IR (1. podwyżka)', pct: 0.0010, min: 400, gives: 'nastroje + misje grup' },
    { level: 3, label: 'Analityk IR (2. podwyżka)', pct: 0.0015, min: 600, gives: 'nastroje + misje + przyczyny' }
];

function getIrLevel() { return Number(playerFund?.ir?.level) || 0; }

function getIrQuarterCost(level = getIrLevel()) {
    const def = IR_LEVELS[level];
    return def && level > 0 ? Math.max(def.min, getFundAssets() * def.pct) : 0;
}

function setIrLevel(level) {
    if (!playerFund || !IR_LEVELS[level]) return false;
    const ir = playerFund.ir || (playerFund.ir = { level: 0, missions: {}, lastMissionQ: {}, done: 0, failed: 0, costPaid: 0 });
    ir.level = level;
    if (level < 2) ir.missions = {};
    logEvent(level ? `🗂️ Fundusz zatrudnia: ${IR_LEVELS[level].label} (koszt ${formatZl(getIrQuarterCost(level), 0)} na kwartał).` : '🗂️ Fundusz rozwiązuje umowę z analitykiem IR.', 'review');
    if (level && typeof unlockAcademyEntry === 'function') unlockAcademyEntry('relacje_inwestorskie');
    return true;
}

function getGroupMood(groupId) {
    let sum = 0, weight = 0, count = 0;
    for (const client of playerFund.clients) {
        if (getInvestorGroupOf(client) !== groupId) continue;
        sum += (client.satisfaction - 0.5) * 100 * client.units;
        weight += client.units; count++;
    }
    return { value: weight > 0 ? sum / weight : null, count };
}

function getMoodWord(value) {
    if (value === null) return 'brak klientów';
    if (value >= 20) return 'lubią cię';
    if (value >= 5) return 'zadowoleni';
    if (value > -5) return 'obojętni';
    if (value > -20) return 'krytyczni';
    return 'wrogo nastawieni';
}

const DRIFT_WORDS = { performance: 'wynik gorszy od GIG', trust: 'niskie zaufanie', drawdown: 'obsunięcie większe niż GIG', bearMarket: 'głęboka bessa', fees: 'opłaty', ethics: 'etyka spółek', reversion: 'brak nowych powodów do zadowolenia' };

/** L3: dwa najbardziej ujemne składniki zadowolenia grupy (wg getClientSatisfactionDrift). */
function getGroupCauses(groupId) {
    const current = playerFund.current, nav = getFundNav();
    const lastPeriod = playerFund.periods[playerFund.periods.length - 1];
    const ctx = {
        excess: getPeriodReturn(current.startNav, nav) - getPeriodReturn(current.startBenchmark, getBenchmarkValue()),
        trust: playerFund.trust, maxDrawdown: current.maxDrawdown, benchmarkDrawdown: current.benchmarkDrawdown,
        lastRankBad: Boolean(lastPeriod && lastPeriod.rankOf > 1 && lastPeriod.rank === lastPeriod.rankOf),
        ethicsIssue: typeof getFundEthicsIssue === 'function' ? getFundEthicsIssue() : null
    };
    const totals = {};
    let weight = 0;
    for (const client of playerFund.clients) {
        if (getInvestorGroupOf(client) !== groupId) continue;
        const parts = getClientSatisfactionDrift(client, getClientCharacter(client), ctx);
        for (const [key, value] of Object.entries(parts)) totals[key] = (totals[key] || 0) + value * client.units;
        weight += client.units;
    }
    if (!weight) return [];
    return Object.entries(totals).filter(([key, v]) => key !== 'reversion' && v / weight < -1e-6).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([key]) => DRIFT_WORDS[key]);
}

const IR_MISSIONS = {
    retail: { text: 'Obsunięcie funduszu nie większe niż GIG + 3 pp, opłata nie wyższa niż standardowa', check: () => (playerFund.current.maxDrawdown - (playerFund.current.benchmarkDrawdown || 0)) <= 0.03 && getPlayerFeeRate() <= MANAGEMENT_FEE_ANNUAL + 1e-9 },
    institution: { text: 'Wynik w kwartale co najmniej taki jak GIG, żadna spółka powyżej 10% aktywów', check: () => {
        const c = playerFund.current;
        const excess = getPeriodReturn(c.startNav, getFundNav()) - getPeriodReturn(c.startBenchmark, getBenchmarkValue());
        const assets = getFundAssets();
        const concentrated = Object.keys(playerPortfolio).some(s => getHoldingMarketValue(s, playerPortfolio[s]) > 0.1 * assets);
        return excess >= 0 && !concentrated;
    } },
    wealthy: { text: 'Stopa dywidendy portfela co najmniej 3% i co najmniej 15% w obligacjach i lokatach', check: () => getFundDividendYield() >= 0.03 && getFundSafeAssetsShare() >= 0.15 }
};
const IR_MISSION_QUARTERS = 2;
const IR_MISSION_PAUSE = 2;

function processIrQuarterly() {
    const ir = playerFund.ir;
    if (!ir || ir.level < 1) return;
    const q = currentQuarter();
    const cost = Math.min(getIrQuarterCost(), Math.max(0, playerCash));
    if (cost > 0) { playerCash -= cost; ir.costPaid += cost; recordPayment('player-fund', 'external:analityk-ir', cost, 'Analityk relacji inwestorskich'); }
    if (ir.level < 2) return;
    for (const groupId of Object.keys(INVESTOR_GROUPS)) {
        const mission = ir.missions[groupId];
        if (mission && q >= mission.dueQ) {
            const ok = IR_MISSIONS[groupId].check();
            ir.done += ok ? 1 : 0; ir.failed += ok ? 0 : 1;
            delete ir.missions[groupId];
            ir.lastMissionQ[groupId] = q;
            if (ok) {
                for (const client of playerFund.clients) if (getInvestorGroupOf(client) === groupId) client.satisfaction = Math.min(1, client.satisfaction + 0.10);
                playerFund.trust = Math.min(100, playerFund.trust + 2);
            }
            const text = `Misja grupy „${INVESTOR_GROUPS[groupId].label}” ${ok ? 'wykonana: zadowolenie grupy +0,10, zaufanie +2' : 'niewykonana (bez kary)'}.`;
            logEvent(`🗂️ ${text}`, 'review');
        } else if (!mission && q - (ir.lastMissionQ[groupId] ?? -99) >= IR_MISSION_PAUSE && getGroupMood(groupId).count > 0) {
            ir.missions[groupId] = { dueQ: q + IR_MISSION_QUARTERS, text: IR_MISSIONS[groupId].text };
        }
    }
    if (typeof checkDiplomatAchievement === 'function') checkDiplomatAchievement();
}

// ---------------------------------------------------------------------------------
// K7. Inwestorzy VIP
// ---------------------------------------------------------------------------------

const VIP_PROFILES = [
    { id: 'rentier',   name: 'Rentier',          icon: '🧓', likes: 'safety',  blurb: 'ceni spokój i ochronę kapitału' },
    { id: 'techshark', name: 'Rekin technologii', icon: '🦈', likes: 'vision',  blurb: 'szuka wzrostu i dużej wizji' },
    { id: 'family',    name: 'Family office',     icon: '🗄️', likes: 'numbers', blurb: 'liczy tylko wyniki ponad rynek' },
    { id: 'baron',     name: 'Baron dywidend',    icon: '🎩', likes: 'safety',  blurb: 'żyje z dywidend i obligacji' }
];
const VIP_ARGUMENTS = {
    numbers: { label: 'Liczby', hint: 'nadwyżka nad GIG z ostatnich 4 okresów > 0' },
    safety:  { label: 'Bezpieczeństwo', hint: 'obsunięcie ≤ GIG w ostatnim roku i ≥ 15% w obligacjach lub lokatach' },
    vision:  { label: 'Wizja', hint: '≥ 30% akcji w spółkach wzrostowych i wynik funduszu ≥ GIG' }
};
const VIP_BASE_CHANCE = 0.25, VIP_MATCH_BONUS = 0.35, VIP_DATA_BONUS = 0.30;
const VIP_OFFER_CHANCE = 0.10, VIP_MAX_PER_YEAR = 2, VIP_PAUSE_Q = 4;

function checkVipArgument(argument) {
    const periods = playerFund.periods.slice(-4);
    switch (argument) {
        case 'numbers': return periods.length > 0 && periods.reduce((s, p) => s + p.fundReturn - p.benchmarkReturn, 0) > 0;
        case 'safety': {
            const recent = periods.slice(-2);
            const calmer = recent.length > 0 && recent.every(p => (Number(p.maxDrawdown) || 0) <= (Number(p.benchmarkDrawdown) || 0) + 1e-9);
            return calmer && getFundSafeAssetsShare() >= 0.15;
        }
        case 'vision': return getFundPortfolioModernShare() >= 0.30 && (periods.length ? periods.slice(-1)[0].fundReturn >= periods.slice(-1)[0].benchmarkReturn : false);
    }
    return false;
}

function getVipSuccessChance(offer, argument) {
    const profile = VIP_PROFILES.find(p => p.id === offer.profile);
    return Math.min(0.95, VIP_BASE_CHANCE + (profile?.likes === argument ? VIP_MATCH_BONUS : 0) + (checkVipArgument(argument) ? VIP_DATA_BONUS : 0) + playerFund.trust / 1000);
}

function maybeCreateVipOffer() {
    const q = currentQuarter(), year = Math.floor(q / 4);
    const vip = playerFund.vip || (playerFund.vip = { offers: [], yearOffers: { year, n: 0 }, pauseUntilQ: -1, won: 0, lost: 0, nextId: 1 });
    if (vip.yearOffers.year !== year) vip.yearOffers = { year, n: 0 };
    vip.offers = vip.offers.filter(o => o.expiresQ > q);
    if (vip.offers.length || vip.yearOffers.n >= VIP_MAX_PER_YEAR || q < vip.pauseUntilQ) return null;
    if (playerFund.trust < 50 || getFundAssets() < 50000 || Math.random() >= VIP_OFFER_CHANCE) return null;
    const profile = getRandomElement(VIP_PROFILES);
    const offer = { id: vip.nextId++, profile: profile.id, name: `${profile.name} ${randomClientPersonName()}`, expiresQ: q + 2 };
    vip.offers.push(offer);
    vip.yearOffers.n++;
    if (typeof addMail === 'function') addMail({
        sender: 'Dział obsługi klienta', subject: `Inwestor VIP: ${offer.name}`,
        body: `${profile.icon} ${offer.name} ${profile.blurb} i rozważa wpłatę do funduszu (5–15% NAV, lock-up 1–2 lata). Wybierz argument — gra sprawdzi go na danych funduszu. Oferta ważna do ${formatQuarterDate(q + 2)}.`,
        importance: 3, action: { type: 'vip', vipId: offer.id }
    });
    return offer;
}

function pitchVip(offerId, argument) {
    const vip = playerFund?.vip;
    const offer = vip?.offers.find(o => o.id === offerId);
    if (!offer || !VIP_ARGUMENTS[argument]) return { ok: false };
    const chance = getVipSuccessChance(offer, argument);
    vip.offers = vip.offers.filter(o => o !== offer);
    const q = currentQuarter();
    if (Math.random() >= chance) {
        vip.lost++; vip.pauseUntilQ = q + VIP_PAUSE_Q;
        logEvent(`💎 ${offer.name} odrzuca ofertę (argument: ${VIP_ARGUMENTS[argument].label}). Kolejny VIP najwcześniej ${formatQuarterDate(q + VIP_PAUSE_Q)}.`, 'review');
        return { ok: true, success: false, chance };
    }
    const nav = getFundNav();
    const value = getFundAssets() * getRandomInRange(0.05, 0.15);
    const units = value / nav;
    const client = addFundClient('rich', 0, nav);
    client.name = offer.name; client.vip = true; client.satisfaction = 0.75;
    applySubscriptionUnits(client, units, nav, { lockYears: getRandomIntInRange(1, 2), guarantee: false, mandate: null, byType: {}, raisedUnits: 0, raisedValue: 0, cost: 0 });
    getTranches(client).forEach(t => { t.vipExit = true; });
    vip.won++;
    logEvent(`💎 ${offer.name} wpłaca ${formatZl(value, 0)} (lock-up do ${formatQuarterDate(getTranches(client)[0].lockedUntilQ)}).`, 'review');
    if (typeof pushNews === 'function') pushNews(`${offer.name} dołącza do funduszu (${formatZl(value, 0)})`);
    if (vip.won >= 3 && typeof unlockAchievement === 'function') unlockAchievement('vip_trust');
    return { ok: true, success: true, chance, value };
}

/** VIP może wyjść przed końcem lock-upu, gdy fundusz jest słabszy od GIG o > 10 pp w roku (umowa indywidualna). */
function processVipExitsWeekly() {
    const periods = playerFund.periods.slice(-4);
    if (!periods.length) return;
    const gap = periods.reduce((s, p) => s + p.fundReturn - p.benchmarkReturn, 0);
    if (gap > -0.10) return;
    for (const client of playerFund.clients) {
        if (!client.vip) continue;
        for (const t of getTranches(client)) if (t.vipExit && t.lockedUntilQ > currentQuarter()) { t.lockedUntilQ = currentQuarter(); noteClientHistory(client, 'Wynik gorszy od GIG o ponad 10 pp — VIP korzysta z umowy o wcześniejszym wyjściu.'); }
    }
}

// ---------------------------------------------------------------------------------
// Pętla tygodniowa i kwartalna
// ---------------------------------------------------------------------------------

function onFundQuarterStart() {
    evaluateMandatesQuarterly();
    processIrQuarterly();
    maybeCreateVipOffer();
}

function processCampaignsWeekly() {
    if (!playerFund) return;
    advanceFundCalendar();
    const q = currentQuarter();
    if (playerFund.campaignQuarter !== q) {
        const first = playerFund.campaignQuarter === undefined;
        playerFund.campaignQuarter = q;
        if (!first) onFundQuarterStart();
    }
    playerFund.lockTrustLossWeek = 0;
    processSubscriptionWeekly();
    processTranchesWeekly();
    sampleMandatesWeekly();
    processLiquidityLoanWeekly();
    processMandateBreachExits();
    processVipExitsWeekly();
}

/** Niezadowolony klient z zablokowanymi udziałami: wystawia je na rynku wtórnym i obniża zaufanie (−0,5, łącznie ≤ −2 na tydzień). */
function handleLockedUnhappyClient(client, def) {
    if (getLockedUnits(client) <= 0.5 || client.pendingSellUnits > 0) return false;
    if (Math.random() >= Math.min(1, (1 - def.patience) * 0.8 * 1.5)) return false;
    client.pendingSellUnits = getLockedUnits(client);
    client.pendingSellWeeks = 0;
    noteClientHistory(client, `Niezadowolony, ale udziały są w lock-upie — wystawia ${formatNumberPl(client.pendingSellUnits, 1)} udziałów na rynku wtórnym.`);
    if ((playerFund.lockTrustLossWeek || 0) < LOCK_TRUST_LOSS_WEEK) {
        playerFund.trust = Math.max(0, playerFund.trust - 0.5);
        playerFund.lockTrustLossWeek = (playerFund.lockTrustLossWeek || 0) + 0.5;
    }
    return true;
}

// ---------------------------------------------------------------------------------
// Akademia i osiągnięcia (K8)
// ---------------------------------------------------------------------------------

if (typeof ACADEMY_ENTRIES === 'object') {
    const q3 = (q, a, c = 0) => ({ q, a, c });
    Object.assign(ACADEMY_ENTRIES, {
        runda_subskrypcji: { title: 'Runda subskrypcji i koszt kapitału', icon: '📣',
            text: 'Fundusz może zbierać kapitał w kampanii: przez tydzień, dwa tygodnie albo kwartał oferuje nowe udziały po NAV. Dłuższa kampania sięga dalej, ale kapitał kosztuje — płacisz 0,2% celu na starcie i 0,5% zebranej kwoty. Popyt zależy od wyników względem GIG i od nastroju rynku: w euforii zbierzesz więcej, w panice prawie nic.',
            example: () => { const t = playerFund?.campaignTotals; return t?.count ? `Dotąd kampanie zebrały średnio ${(t.fillSum / t.count * 100).toFixed(0)}% celu.` : 'Nie prowadzono jeszcze kampanii.'; },
            quiz: [q3('Ile kosztuje kampania emisyjna?', ['0,2% celu + 0,5% zebranej kwoty', 'Nic', 'Połowę zebranej kwoty']), q3('Kiedy kampania zbiera najwięcej?', ['Gdy wyniki są lepsze od GIG i rynek jest w euforii', 'W panice', 'Zawsze tyle samo']), q3('Co daje dłuższa kampania?', ['Większy zasięg popytu', 'Niższy koszt', 'Gwarancję zysku'])] },
        lockup_fundusze_zamkniete: { title: 'Lock-up i fundusze zamknięte', icon: '🔒',
            text: 'Lock-up to okres, w którym klient nie może umorzyć udziałów. Daje funduszowi stabilność (nie musi sprzedawać akcji w panice), ale zniechęca niecierpliwych inwestorów, a przyciąga cierpliwych. Zablokowane udziały można sprzedać innemu inwestorowi na rynku wtórnym. Tak działają fundusze zamknięte (FIZ).',
            example: () => `Zablokowane udziały: ${formatNumberPl(typeof getLockedFundUnits === 'function' ? getLockedFundUnits() : 0, 0)}.`,
            quiz: [q3('Kto lubi długi lock-up?', ['Instytucje i inwestorzy długoterminowi', 'Spryciarze', 'Nikt']), q3('Co może zrobić klient z udziałami w lock-upie?', ['Sprzedać je na rynku wtórnym', 'Umorzyć od razu', 'Nic'], 0), q3('Dlaczego fundusze stosują lock-up?', ['By nie sprzedawać aktywów w panice', 'By płacić wyższe podatki', 'Dla ozdoby'])] },
        gwarancja_kapitalu: { title: 'Gwarancja kapitału i jej koszt', icon: '🛡️',
            text: 'Gwarancja kapitału obiecuje klientowi zwrot ceny wejścia na koniec lock-upu, nawet gdy fundusz stracił. Za to klient oddaje 30% zysku. Dla funduszu to wystawiona opcja sprzedaży (put): w hossie zarabia drobny udział, w bessie dopłaca z gotówki, a gdy jej brakuje — z kredytu płynnościowego.',
            example: () => `Zobowiązanie z gwarancji: ${formatZl(typeof getGuaranteeLiability === 'function' ? getGuaranteeLiability() : 0, 0)}.`,
            quiz: [q3('Kto ponosi stratę przy gwarancji kapitału?', ['Fundusz (dopłaca różnicę)', 'Klient', 'Państwo']), q3('Jaką część zysku zatrzymuje klient z gwarancją?', ['70%', '100%', '0%']), q3('Z czego fundusz pokrywa brak gotówki na dopłatę?', ['Z kredytu płynnościowego', 'Z budżetu gracza', 'Z niczego'])] },
        opcja_put: { title: 'Opcja sprzedaży (put) w prostych słowach', icon: '↘️',
            text: 'Opcja put to prawo sprzedaży po ustalonej cenie. Wystawca opcji dostaje opłatę z góry, ale płaci, gdy cena spada poniżej ustalonej. Gwarancja kapitału to ukryty put: klient ma prawo odzyskać cenę wejścia, a fundusz ponosi ryzyko spadku.',
            example: () => 'Gwarancja 100% ceny wejścia = put z ceną wykonania równą cenie wejścia.',
            quiz: [q3('Kto płaci, gdy cena spada poniżej ceny wykonania puta?', ['Wystawca opcji', 'Posiadacz opcji', 'Giełda']), q3('Co dostaje wystawca puta?', ['Opłatę z góry', 'Nic', 'Akcje za darmo']), q3('Gwarancja kapitału to dla funduszu…', ['wystawiony put', 'kupiony put', 'dywidenda'])] },
        mandat_dryf_stylu: { title: 'Mandat inwestycyjny i dryf stylu', icon: '📜',
            text: 'Mandat to obietnica wobec klientów, jak fundusz będzie inwestować (np. defensywnie albo dywidendowo). Przyciąga pasujących inwestorów, ale zobowiązuje. Dryf stylu — odejście od obietnicy — po dwóch kwartałach łamie mandat: spada zaufanie, a klienci mogą wyjść nawet z lock-upu.',
            example: () => { const s = playerFund?.mandateStats; return s?.total ? `Mandaty: ${s.kept} dotrzymanych, ${s.breached} złamanych.` : 'Nie masz jeszcze mandatów.'; },
            quiz: [q3('Po ilu kwartałach naruszenia mandat jest złamany?', ['Po dwóch kolejnych', 'Po jednym', 'Nigdy']), q3('Co traci fundusz po złamaniu mandatu?', ['Zaufanie klientów', 'Licencję', 'Nic']), q3('Co to dryf stylu?', ['Odejście od deklarowanego stylu inwestowania', 'Zmiana nazwy', 'Podniesienie opłaty'])] },
        relacje_inwestorskie: { title: 'Relacje inwestorskie (IR)', icon: '🗂️',
            text: 'Relacje inwestorskie to komunikacja z akcjonariuszami i klientami. Różne grupy chcą czego innego: detaliczni — spokoju, instytucje — wyników względem rynku, zamożni — dochodu z dywidend. Analityk IR pokazuje nastroje grup, daje misje i wyjaśnia przyczyny niezadowolenia. Komunikacja działa tylko wtedy, gdy opiera się na prawdziwych danych.',
            example: () => `Poziom analityka IR: ${typeof getIrLevel === 'function' ? getIrLevel() : 0}.`,
            quiz: [q3('Czego najbardziej chcą instytucje?', ['Wyniku co najmniej takiego jak rynek', 'Wysokich opłat', 'Mandatu sektorowego'], 0), q3('Co daje analityk IR na poziomie 3?', ['Przyczyny niezadowolenia grup', 'Gwarancję wyników', 'Niższe podatki']), q3('Czy misja niewykonana jest karana?', ['Nie', 'Tak, grzywną', 'Tak, utratą klientów'])] },
        dopasowanie_oferty: { title: 'Dopasowanie oferty do inwestora', icon: '💎',
            text: 'Duzi inwestorzy (VIP) mają profile: jeden ceni bezpieczeństwo, inny wzrost, inny liczby. Przekonuje ich argument, który pasuje do profilu i który potwierdzają dane funduszu. Argument niepoparty danymi nie przekona nikogo na dłużej — a oferta, której nie da się spełnić, kosztuje reputację.',
            example: () => { const v = playerFund?.vip; return v ? `VIP-ów pozyskanych: ${v.won}, odrzuconych: ${v.lost}.` : 'Nie było jeszcze ofert VIP.'; },
            quiz: [q3('Co zwiększa szansę przekonania VIP-a?', ['Argument pasujący do profilu i poparty danymi', 'Głośna reklama', 'Niższa opłata'], 0), q3('Co dzieje się po odmowie VIP-a?', ['Przerwa 4 kwartały dla tego typu ofert', 'Kara KNF', 'Utrata klientów']), q3('Jaki argument sprawdza nadwyżka nad GIG?', ['Liczby', 'Wizja', 'Bezpieczeństwo'])] },
        dyplomata_grup: { title: 'Segmentacja klientów', icon: '👥',
            text: 'Klienci funduszu dzielą się na trzy grupy: detalicznych, instytucjonalnych i zamożnych. Nastrój grupy to średnie zadowolenie jej klientów ważone liczbą udziałów. Dobrze jest znać nastroje wszystkich grup, bo odpływ jednej z nich może wywołać kolejkę umorzeń.',
            example: () => 'Zadowolenie klientów liczone jest w skali −50…+50.',
            quiz: [q3('Do jakiej grupy należy Bogaty?', ['Zamożni', 'Detaliczni', 'Instytucjonalni']), q3('Jak liczymy nastrój grupy?', ['Średnie zadowolenie ważone udziałami', 'Liczba klientów', 'Wartość wpłat'], 0), q3('Dlaczego warto znać nastroje grup?', ['By przewidzieć odpływ', 'By płacić mniej podatków', 'Bez powodu'])] }
    });
}

if (typeof ACHIEVEMENTS === 'object') {
    Object.assign(ACHIEVEMENTS, {
        vip_trust: { id: 'vip_trust', icon: '💎', title: 'Zaufanie VIP-ów', desc: 'Pozyskaj 3 inwestorów VIP.', xp: 150, hidden: false, check: () => (playerFund?.vip?.won || 0) >= 3 },
        guarantee_clean: { id: 'guarantee_clean', icon: '🛡️', title: 'Gwarancja bez pudła', desc: 'Zakończ lock-up transzy z gwarancją bez dopłaty w bessie (GIG ≤ −10% w czasie lock-upu).', xp: 200, hidden: false, check: () => Boolean(playerFund?.guaranteeStats?.cleanInBear) },
        diplomat: { id: 'diplomat', icon: '🤝', title: 'Dyplomata rynkowy', desc: 'Wszystkie 3 grupy inwestorów „lubią cię” (≥ +20) jednocześnie.', xp: 150, hidden: false, check: () => Boolean(playerFund?.ir?.diplomat) },
        promise_kept: { id: 'promise_kept', icon: '🎯', title: 'Słowo dotrzymane', desc: 'Mandat bez naruszenia przez cały okres (co najmniej 4 kwartały).', xp: 150, hidden: false, check: () => false },
        full_subscription: { id: 'full_subscription', icon: '📈', title: 'Pełna subskrypcja', desc: 'Kampania emisyjna zbiera ≥ 100% celu.', xp: 100, hidden: false, check: () => false }
    });
}

function checkDiplomatAchievement() {
    if (!playerFund?.ir) return;
    const moods = Object.keys(INVESTOR_GROUPS).map(id => getGroupMood(id));
    if (moods.every(m => m.value !== null && m.value >= 20)) playerFund.ir.diplomat = true;
}

// ---------------------------------------------------------------------------------
// Interfejs: karty w oknie rynku udziałów (renderowane z renderJuDecisions)
// ---------------------------------------------------------------------------------

function renderCampaignCards() {
    if (!playerFund) return '';
    const sub = playerFund.subscription;
    const icon = (name, size = 20) => (typeof uiIcon === 'function' ? uiIcon(name, size) : '');
    const q = currentQuarter();

    const mandateOptions = ['<option value="">brak</option>',
        ...Object.keys(MANDATES).filter(k => k !== 'sector').map(k => `<option value="${k}">${MANDATES[k].icon} ${MANDATES[k].label}</option>`),
        ...SECTOR_GROUPS.map(g => `<option value="sector:${g.id}">${MANDATES.sector.icon} Sektorowy: ${escapeHtml(g.name)}</option>`)].join('');
    const durationOptions = Object.entries(SUBSCRIPTION_DURATIONS).map(([id, d]) => `<option value="${id}">${d.label}</option>`).join('');
    const maxPct = Math.round(getCampaignMaxTargetPct() * 100);

    const campaignBody = sub
        ? `<p class="text-sm">Trwa: cel ${formatNumberPl(sub.targetUnits, 0)} udziałów, zebrano ${formatNumberPl(sub.raisedUnits, 1)} (${(sub.raisedUnits / Math.max(1, sub.targetUnits) * 100).toFixed(0)}%), zostało ${sub.weeksLeft} tyg. Start: ${escapeHtml(sub.startDate)}.</p>`
        : `<p class="text-sm">Koszt: 0,2% celu na start i 0,5% zebranej kwoty. Udziały z lock-upem nie wrócą do Ciebie przed terminem (bramka umorzeń nadal działa). Kampania liczy się jako emisja (${playerFund.current.emissions}/${MAX_EMISSIONS_PER_PERIOD} w okresie).</p>
           <div class="bank-card-form" style="flex-wrap:wrap; gap:6px">
             <label>Czas <select id="camp-duration">${durationOptions}</select></label>
             <label>Cel % NAV <input type="number" id="camp-target" min="5" max="${maxPct}" value="${Math.min(10, maxPct)}" style="width:64px"></label>
             <label>Lock-up <select id="camp-lock"><option value="0">brak</option><option value="1">1 rok</option><option value="2">2 lata</option><option value="3">3 lata</option></select></label>
             <label><input type="checkbox" id="camp-guarantee"> Gwarancja kapitału</label>
             <label>Mandat <select id="camp-mandate">${mandateOptions}</select></label>
             <button onclick="handleStartCampaign()">Rozpocznij kampanię</button>
           </div><p class="text-xs text-muted" id="camp-info">${escapeHtml(getCampaignBlockReason({ duration: 'quarter', targetPct: 0.1, lockYears: 0 }) || 'Gwarancja wymaga lock-upu ≥ 1 rok; transze z gwarancją ≤ 30% udziałów.')}</p>`;

    const lockedUnits = getLockedFundUnits(), liability = getGuaranteeLiability(), loan = getLiquidityLoanPrincipal();
    const history = (playerFund.campaignHistory || []).slice(0, 3).map(h => `<li class="text-xs">${formatQuarterDate(h.startQ)}: ${(h.fill * 100).toFixed(0)}% celu, ${formatZl(h.raisedValue, 0)}, koszt ${formatZl(h.cost, 0)}, lock-up ${h.lockYears} lat</li>`).join('');
    const campaignCard = `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${icon('megafon')}</span><div><h4>Kampania emisyjna</h4><span class="bank-card-type">${formatGameDate()}</span></div></header>
        ${campaignBody}
        <p class="text-sm">Udziały w lock-upie: <strong>${formatNumberPl(lockedUnits, 0)}</strong> · zobowiązanie z gwarancji: <strong>${formatZl(liability, 0)}</strong>${loan > 0 ? ` · kredyt płynnościowy: <strong>${formatZl(loan, 0)}</strong>` : ''}</p>
        ${history ? `<ul class="list-plain">${history}</ul>` : ''}</article>`;

    const ir = playerFund.ir, level = getIrLevel();
    const groupRows = Object.entries(INVESTOR_GROUPS).map(([id, g]) => {
        if (level < 1) return `<li class="text-sm">${g.icon} ${g.label}: <span class="text-muted">wymaga analityka IR</span></li>`;
        const mood = getGroupMood(id);
        const mission = level >= 2 ? ir.missions?.[id] : null;
        const causes = level >= 3 ? getGroupCauses(id) : [];
        return `<li class="text-sm">${g.icon} <strong>${g.label}</strong>: ${mood.value === null ? '—' : `${mood.value >= 0 ? '+' : ''}${mood.value.toFixed(0)}`} · ${getMoodWord(mood.value)}${mission ? `<br><span class="text-xs">Misja do ${formatQuarterDate(mission.dueQ)}: ${escapeHtml(mission.text)}</span>` : ''}${causes.length ? `<br><span class="text-xs text-muted">Powody: ${causes.join(', ')}</span>` : ''}</li>`;
    }).join('');
    const irButtons = IR_LEVELS.map(l => `<button class="${l.level === level ? '' : 'btn-secondary'}" onclick="setIrLevel(${l.level}); renderJuMarket();">${l.level === 0 ? 'Brak' : 'L' + l.level}</button>`).join('');
    const irCard = `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${icon('teczka')}</span><div><h4>Relacje inwestorskie</h4><span class="bank-card-type">${level ? `${IR_LEVELS[level].label} · ${formatZl(getIrQuarterCost(), 0)} na kwartał` : 'bez analityka'}</span></div></header>
        <ul class="list-plain">${groupRows}</ul>
        <div class="bank-card-form">${irButtons}</div>
        <p class="text-xs text-muted">L1: nastroje grup · L2: misje · L3: przyczyny. Koszt 0,05 / 0,10 / 0,15% aktywów na kwartał.</p></article>`;

    const vip = playerFund.vip;
    const offers = (vip?.offers || []).filter(o => o.expiresQ > q).map(o => {
        const p = VIP_PROFILES.find(x => x.id === o.profile);
        return `<p class="text-sm">${p?.icon || ''} <strong>${escapeHtml(o.name)}</strong> (do ${formatQuarterDate(o.expiresQ)}): ${Object.entries(VIP_ARGUMENTS).map(([k, a]) => `<button class="btn-secondary btn-sm" title="${escapeHtml(a.hint)}" onclick="pitchVip(${o.id}, '${k}'); renderJuMarket();">${a.label}</button>`).join(' ')}</p>`;
    }).join('');
    const vipCard = (vip && (offers || vip.won || vip.lost)) ? `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${icon('diament')}</span><div><h4>Inwestorzy VIP</h4><span class="bank-card-type">pozyskani ${vip.won} · odrzuceni ${vip.lost}</span></div></header>${offers || '<p class="text-sm text-muted">Brak aktywnych ofert.</p>'}</article>` : '';
    return campaignCard + irCard + vipCard;
}

function handleStartCampaign() {
    const val = id => document.getElementById(id);
    const result = startSubscriptionCampaign({
        duration: val('camp-duration')?.value, targetPct: (Number(val('camp-target')?.value) || 10) / 100,
        lockYears: Number(val('camp-lock')?.value) || 0, guarantee: Boolean(val('camp-guarantee')?.checked), mandate: val('camp-mandate')?.value || null
    });
    showToast(result.ok ? 'Kampania emisyjna rozpoczęta.' : result.reason, result.ok ? 'success' : 'warning');
    if (typeof renderJuMarket === 'function') renderJuMarket();
    if (typeof refreshFundViews === 'function') refreshFundViews();
}
