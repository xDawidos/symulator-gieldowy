// =================================================================================
// reits.js: 0.15.5 B5. REIT-y / fundusze nieruchomości. Portfel nieruchomości (wartość, stopa najmu, obłożenie),
// przychód z najmu = wartość × stopa najmu × obłożenie, koszty utrzymania i odsetki od długu (stopa bazowa + marża),
// obowiązkowa wypłata ≥ 80% zysku, dźwignia (LTV) ≤ 60% wartości portfela, wycena = NAV × (1 ± premia) zależna od stóp,
// cyklu i faz rynku, obłożenie zależne od gospodarki i rodzaju portfela; zlecenia budowy u generalnych wykonawców.
// Stan REIT-u w polu stock.reit (opcjonalne w zapisie v15).
// =================================================================================

const REIT_RULES = {
    payoutMin: 0.80, payoutMax: 0.95,     // obowiązkowa wypłata: ≥ 80% zysku jako dywidenda
    ltvMax: 0.60, ltvStart: 0.35, ltvBuild: 0.50,
    maintenanceRate: 0.010,               // koszty utrzymania: 1% wartości portfela rocznie
    rateMargin: 0.02,                     // koszt długu = stopa bazowa + 2 pp
    rateSens: 3.0,                        // wrażliwość premii i wartości portfela na stopy (zwykłe spółki: ok. 1,0)
    neutralRate: 0.04,
    occupancyBase: 0.92, occupancyMin: 0.40, occupancyMax: 0.99, occupancyStep: 0.35,
    cashReserveShare: 0.01,               // rezerwa gotówki: 1% wartości portfela, nadwyżka spłaca dług lub idzie na budowę
    buildChance: 0.15, forcedSaleShare: 0.06, forcedSaleDiscount: 0.05,
    premiumMin: -0.35, premiumMax: 0.25
};

// Rodzaje portfela: stopa najmu, budowa u wykonawców, reakcja obłożenia na recesję / pandemię / ekspansję (w punktach obłożenia).
const REIT_TYPES = {
    mixed:       { label: 'Mieszany',   rentYield: 0.075, build: ['office_building', 'warehouse', 'shopping_center', 'residential_complex'], recession: -0.05, pandemic: -0.08, expansion: 0.01 },
    office:      { label: 'Biura',      rentYield: 0.075, build: ['office_building', 'financial_tower'],                                      recession: -0.06, pandemic: -0.14, expansion: 0.02 },
    retail:      { label: 'Handel',     rentYield: 0.085, build: ['shopping_center'],                                                          recession: -0.07, pandemic: -0.16, expansion: 0.02 },
    warehouse:   { label: 'Magazyny',   rentYield: 0.070, build: ['warehouse', 'distribution_center'],                                         recession: 0.00,  pandemic: 0.03,  expansion: 0.03 },
    health:      { label: 'Zdrowie',    rentYield: 0.065, build: ['hospital'],                                                                 recession: -0.01, pandemic: 0.01,  expansion: 0.00 },
    hospitality: { label: 'Hotele',     rentYield: 0.080, build: ['hotel_chain', 'resort'],                                                    recession: -0.08, pandemic: -0.22, expansion: 0.02 }
};
const REIT_PROFILES = { GRET: 'mixed', UOR: 'office', HOR: 'health', REJS: 'hospitality' };

function isReitStock(stock) {
    return Boolean(stock && stock.assetType === 'REIT');
}

function getReitType(stock) {
    return REIT_TYPES[stock?.reit?.type] || REIT_TYPES.mixed;
}

/** Tworzy model portfela: nowa gra (bilans zerowy) startuje z dźwignią 35%, wczytany zapis bierze majątek i dług z bilansu. */
function ensureReitModel(stock) {
    if (!isReitStock(stock) || stock.reit) return stock?.reit || null;
    const type = REIT_PROFILES[stock.symbol] || 'mixed';
    const sheet = stock.balanceSheet || (stock.balanceSheet = { assets: 0, liabilities: 0, shareCapital: 0, retainedEarnings: 0 });
    const cash = Math.max(0, Number(stock.cash) || 0);
    let value, debt;
    if (!(Number(sheet.assets) > 0)) {
        const equity = Math.max(1, stock.price * stock.totalShares);
        value = equity / (1 - REIT_RULES.ltvStart);
        debt = value * REIT_RULES.ltvStart;
        sheet.assets = value + cash; sheet.liabilities = debt;
        sheet.retainedEarnings = sheet.assets - debt - (Number(sheet.shareCapital) || 0);
    } else {
        value = Math.max(1, sheet.assets - cash);
        debt = Math.max(0, Number(sheet.liabilities) || 0);
    }
    stock.reit = {
        type, portfolioValue: Math.round(value), occupancy: REIT_RULES.occupancyBase,
        rentYield: REIT_TYPES[type].rentYield, payoutRatio: Math.round((REIT_RULES.payoutMin + Math.random() * 0.12) * 100) / 100,
        dividendDue: 0, lastRent: 0, lastCosts: 0, lastInterest: 0, lastProfit: 0, lastPaid: 0, lastBase: Number(centralBank?.baseInterestRate) || 0.03,
        paidTotal: 0, profitTotal: 0, buildings: 0, orderTenderId: null, forcedSales: 0
    };
    stock.dividendPerShare = 0;
    return stock.reit;
}

function ensureAllReitModels() {
    for (const stock of stocks) if (isReitStock(stock)) ensureReitModel(stock);
}

function getReitDebt(stock) {
    return Math.max(0, Number(stock?.balanceSheet?.liabilities) || 0);
}

/** LTV: dług do wartości portfela nieruchomości. */
function getReitLtv(stock) {
    const reit = stock?.reit;
    return reit && reit.portfolioValue > 0 ? getReitDebt(stock) / reit.portfolioValue : 0;
}

function getReitNav(stock) {
    return (Number(stock?.balanceSheet?.assets) || 0) - getReitDebt(stock);
}

/** Obłożenie docelowe: baza + wpływ fazy gospodarki, recesji i pandemii zależny od rodzaju portfela. */
function getReitTargetOccupancy(stock) {
    const type = getReitType(stock);
    let target = REIT_RULES.occupancyBase;
    const phase = typeof economyCycle === 'object' && economyCycle ? economyCycle.phase : null;
    if (phase === 'recession') target += type.recession;
    else if (phase === 'expansion' || phase === 'overheating') target += type.expansion;
    if (typeof crisisLine !== 'undefined' && crisisLine && crisisLine.id === 'pandemic' && ['burst', 'spread', 'intervention', 'bottom'].includes(crisisLine.stage)) target += type.pandemic;
    return Math.max(REIT_RULES.occupancyMin, Math.min(REIT_RULES.occupancyMax, target));
}

/** Premia / dyskonto do NAV: stopy (wrażliwość 3×), cykl, faza rynku i kondycja. */
function getReitPremium(stock) {
    const base = Number(centralBank?.baseInterestRate) || REIT_RULES.neutralRate;
    const rateTerm = -REIT_RULES.rateSens * (base - REIT_RULES.neutralRate);
    const phase = typeof economyCycle === 'object' && economyCycle ? economyCycle.phase : null;
    const cycleTerm = phase === 'recession' ? -0.05 : (phase === 'expansion' ? 0.02 : 0);
    const regime = typeof getMarketRegime === 'function' ? (Number(getMarketRegime('home')?.premium) || 0) * 0.5 : 0;
    const health = (Number(stock?.financialHealth) || 0) * 0.02;
    return Math.max(REIT_RULES.premiumMin, Math.min(REIT_RULES.premiumMax, rateTerm + cycleTerm + regime + health));
}

/** Wartość godziwa akcji REIT-u: NAV na akcję × (1 + premia). */
function getReitFairValue(stock) {
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const nav = getReitNav(stock) / shares;
    return nav > 0 ? nav * (1 + getReitPremium(stock)) : null;
}

/**
 * Wynik kwartalny REIT-u (wołane z raportu kwartalnego zamiast dawnego wzoru 1,5% aktywów).
 * Aktualizuje obłożenie i wycenę portfela (stopy, inflacja), ustala dywidendę do wypłaty (≥ 80% zysku) i dźwignię.
 */
function computeReitQuarter(stock) {
    const reit = ensureReitModel(stock);
    const rules = REIT_RULES;
    const base = Number(centralBank?.baseInterestRate) || rules.neutralRate;

    // Obłożenie dąży do docelowego (najemcy reagują z opóźnieniem).
    const occupancyBefore = reit.occupancy;
    reit.occupancy += (getReitTargetOccupancy(stock) - reit.occupancy) * rules.occupancyStep;

    // Wycena portfela: 0,5 inflacji, −3 × zmiana stóp (REIT wrażliwy na stopy), obłożenie.
    const inflation = Number(macro?.inflation) || 0.03;
    const revaluation = reit.portfolioValue * Math.max(-0.12, Math.min(0.08,
        inflation * 0.5 / 4 - rules.rateSens * (base - reit.lastBase) + 0.3 * (reit.occupancy - occupancyBefore)));
    reit.lastBase = base;
    reit.portfolioValue = Math.max(1, reit.portfolioValue + revaluation);
    adjustBalanceSheet(stock, { assets: revaluation, retainedEarnings: revaluation });

    const rent = reit.portfolioValue * reit.rentYield / 4 * reit.occupancy;
    const costs = reit.portfolioValue * rules.maintenanceRate / 4;
    const interest = getReitDebt(stock) * (base + rules.rateMargin) / 4;
    const profit = rent - costs - interest;
    Object.assign(reit, { lastRent: rent, lastCosts: costs, lastInterest: interest, lastProfit: profit });
    reit.profitTotal += profit;

    // Obowiązek wypłaty: co najmniej 80% zysku (w praktyce 80–95% wg polityki spółki).
    reit.payoutRatio = Math.max(rules.payoutMin, Math.min(rules.payoutMax, Number(reit.payoutRatio) || rules.payoutMin));
    reit.dividendDue = profit > 0 ? profit * reit.payoutRatio : 0;
    return profit;
}

/** Wypłata dywidendy REIT-u z kasy spółki (zamiast dawnej wypłaty z niczego): raz na kwartał, od razu po raporcie (wołane z raportu). */
function processReitDividend(stock) {
    const reit = ensureReitModel(stock);
    if (!reit || !(reit.dividendDue > 0)) return 0;
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const due = Math.min(reit.dividendDue, Math.max(0, Number(stock.cash) || 0));
    reit.dividendDue = 0;
    if (!(due > 0)) return 0;
    const paid = payCompanyDividend(stock, due / shares, 'Dywidenda REIT');
    reit.lastPaid = paid;
    reit.paidTotal += paid;
    stock.dividendPerShare = paid / shares;
    stock.estimatedDividend = stock.dividendPerShare;
    return paid;
}

/** Zbyt wysoka dźwignia (LTV > 60%) wymusza sprzedaż części portfela ze zniżką i spłatę długu. */
function enforceReitLtv(stock) {
    const reit = stock.reit;
    let sales = 0;
    while (reit && getReitLtv(stock) > REIT_RULES.ltvMax && sales < 8) {
        const sold = reit.portfolioValue * REIT_RULES.forcedSaleShare;
        const proceeds = sold * (1 - REIT_RULES.forcedSaleDiscount);
        reit.portfolioValue -= sold;
        // kupujący płaci gotówką (zniżka to strata w wyniku), całość wpływów spłaca dług
        adjustCompanyCash(stock, proceeds);
        recordPayment('external:kupujacy_nieruchomosci', stock, proceeds, 'Wymuszona sprzedaż nieruchomości');
        adjustBalanceSheet(stock, { assets: proceeds - sold, retainedEarnings: -(sold - proceeds) });
        repayCompanyDebt(stock, Math.min(getReitDebt(stock), proceeds));
        reit.forcedSales++;
        sales++;
    }
    if (sales > 0) logEvent(`🏢 ${stock.name} sprzedaje część portfela (${sales}×), by obniżyć dźwignię poniżej ${(REIT_RULES.ltvMax * 100).toFixed(0)}% LTV.`, 'market');
    return sales;
}

/** Zlecenie budowy u generalnych wykonawców (przetarg budowlany): REIT jest zamawiającym. */
function orderReitBuilding(stock) {
    const reit = stock.reit;
    if (!reit || stock.isBankrupt || reit.orderTenderId && activeTenders.some(t => t.id === reit.orderTenderId && ['open', 'closed', 'awarded'].includes(t.status))) return null;
    const type = getReitType(stock);
    const id = getRandomElement(type.build);
    const spec = typeof getConstructionSpec === 'function' ? getConstructionSpec(id) : null;
    if (!spec) return null;
    const budget = Math.round(spec.cost * getRandomInRange(1.2, 1.45));
    // Finansowanie: gotówka ponad rezerwę, reszta długiem — po zamówieniu LTV ≤ 50% (z zapasem do 60%).
    const cash = Math.max(0, Number(stock.cash) || 0);
    const newDebt = Math.max(0, budget - cash);
    if ((getReitDebt(stock) + newDebt) / (reit.portfolioValue + budget) > REIT_RULES.ltvBuild) return null;
    if (typeof canFinanceAmount === 'function' && !canFinanceAmount(stock, budget)) return null;
    const tenderId = createTender(spec, stock, budget, typeof randomTenderWeights === 'function' ? randomTenderWeights(stock) : {});
    if (tenderId) {
        reit.orderTenderId = tenderId;
        logEvent(`🏢 ${stock.name} zamawia budowę: ${spec.name} (przetarg, budżet ${budget.toLocaleString('pl-PL')} PLN).`, 'company');
    }
    return tenderId;
}

/** Hak z odbioru budowy: ukończony obiekt zwiększa portfel REIT-u (aktywa bez zmian — depozyt zamienił się w nieruchomość). */
function onReitBuildingCompleted(client, project, purchasePrice) {
    if (!isReitStock(client) || !client.reit) return;
    const reit = client.reit;
    const added = Number(purchasePrice) || 0;
    const total = reit.portfolioValue + added;
    reit.rentYield = (reit.rentYield * reit.portfolioValue + getReitType(client).rentYield * added) / Math.max(1, total);
    reit.portfolioValue = total;
    reit.buildings++;
    reit.orderTenderId = null;
    logEvent(`🏢 ${client.name} odbiera nową nieruchomość: ${project.tender.buildingType.name} (portfel ${Math.round(total).toLocaleString('pl-PL')} PLN).`, 'company');
}

/** Co kwartał: dźwignia, rezerwa gotówki (nadwyżka spłaca dług), nowe zamówienia budowy. */
function processReitsQuarterly() {
    for (const stock of stocks) {
        if (!isReitStock(stock) || stock.isBankrupt) continue;
        const reit = ensureReitModel(stock);
        enforceReitLtv(stock);
        // Nadwyżka gotówki ponad rezerwę: połowa spłaca dług (obniża LTV), reszta czeka na zamówienia.
        const reserve = reit.portfolioValue * REIT_RULES.cashReserveShare;
        const excess = Math.max(0, (Number(stock.cash) || 0) - reserve);
        if (excess > 0 && getReitDebt(stock) > 0) repayCompanyDebt(stock, excess * 0.5);
        if (Math.random() < REIT_RULES.buildChance && getReitLtv(stock) < REIT_RULES.ltvBuild) orderReitBuilding(stock);
    }
}

/** Dla interfejsu i pomiarów: roczna stopa dywidendy (ostatnia wypłata × 4 / kurs). */
function getReitDividendYield(stock) {
    const reit = stock?.reit;
    if (!reit || !(stock.price > 0)) return 0;
    return (reit.lastPaid / Math.max(1, stock.totalShares)) * 4 / stock.price;
}
