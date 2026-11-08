// =================================================================================
// 0.17.2: ENERGIA I ŚRODOWISKO — moc, miks i cena prądu, budowa bloków, zlecenia, blackout
// =================================================================================
// Stan kraju w `society.energy`, moc spółki w `stock.power = { type, capacity }`. Moc startowa wynika z przychodu segmentu
// Energia, zużycie startowe to moc / startReserve. Zużycie rośnie z PKB (firmy) i ludnością (domy), moc tylko z ukończonych
// bloków, budynków energetycznych i projektów państwa. Odbiorcy widzą odchylenie ceny od jej średniej z 8 kw., więc wsad
// „prąd” działa jak wsad surowców: średnio zero, bez trwałego obniżania marż.

const ENERGY_TYPES = {
    coal:    { name: 'Węgiel', cost: 0.90, fuel: 'coal', fuelShare: 0.50, capitalShare: 0.15, emission: 1 },
    gas:     { name: 'Gaz', cost: 1.05, fuel: 'gas', fuelShare: 0.55, capitalShare: 0.15, emission: 0.5 },
    nuclear: { name: 'Atom', cost: 1.15, fuel: 'uranium', fuelShare: 0.10, capitalShare: 0.60, emission: 0.05 },
    oze:     { name: 'OZE', cost: 1.10, fuel: null, fuelShare: 0, capitalShare: 0.70, emission: 0.02 }
};
const ENERGY_TYPE_IDS = Object.keys(ENERGY_TYPES);
const ENERGY_SUBSECTOR_TYPE = { 'Energetyka węglowa': 'coal', 'Energetyka gazowa': 'gas', 'Energetyka jądrowa': 'nuclear', 'OZE': 'oze' };
const ENERGY_NO_POWER_SUBSECTORS = ['Rafinerie', 'Gaz'];
// Wsad „prąd” w kosztach odbiorców, część dawnego wsadu węgla i gazu.
const POWER_INPUTS = { 'Przemysł': 0.06, 'Chemia': 0.06, 'Motoryzacja': 0.04, 'Budowlany': 0.03 };
const POWER_INPUT_SYMBOLS = { PKC: 0.05 };
const ENERGY_RULES = {
    startCapacity: 30000, startReserve: 1.12, householdShare: 0.25, histQuarters: 8,
    startMix: { coal: 0.55, gas: 0.15, nuclear: 0, oze: 0.30 }, // udział typu w mocy startowej; w typie moc dzieli przychód segmentu
    rateCost: 8,                 // +1 pp stopy to +8% kosztu kapitałowej części ceny
    shortagePremium: 1.5, pass: 0.6, producerPrice: 0.5, producerUtil: 0.5,
    targetReserve: 1.08, buildChance: 0.25, blockShare: 0.03, blockOwnMax: 0.30, blockCostQuarters: 6, minCashShare: 0.3,
    buildQuarters: { coal: [6, 10], gas: [4, 8], oze: [3, 6] },
    catalogPower: { energy_plant: 0.010, wind_farm: 0.006, solar_park: 0.004 }, // udział mocy kraju z budynku z katalogu
    blackoutAt: 0.06, blackoutChance: 0.25, blackoutCooldown: 8, blackoutCut: 0.03, blackoutMood: 3,
    municipalAfter: 6, municipalMax: 3, municipalBudget: 150000, municipalShare: 0.02,
    stateProjectAt: 1.02, stateProjectChance: 0.15,
    contractCost: 0.25, depositChance: 0.45, depositFactor: [1.08, 1.20], depositQuarters: [8, 16], siteCost: 0.8, siteTime: 0.75,
    techCost: 0.95, techGain: 0.03, techMax: 3, aiContractChance: 0.012
};
const ENERGY_CONTRACTS = {
    deposit: { name: 'Poszukiwanie nowych złóż', specialty: 'geology', quarters: [2, 4] },
    site:    { name: 'Szukanie działki pod inwestycję', specialty: 'geology', quarters: [1, 2] },
    tech:    { name: 'Inwestowanie w najnowsze technologie', specialty: 'energy', quarters: [4, 4] }
};
const DEPOSIT_COMMODITIES = ['oil', 'coal', 'gas'];
// 0.17.2 E3: ustawy. Polityka: bonus wybranego typu. Dostawcy: limit ceny albo dopłata budżetu.
const ENERGY_POLICY_TYPES = [null, 'coal', 'gas', 'nuclear', 'oze'];
const ENERGY_LAW_RULES = { policyMargin: 0.005, policyStability: 0.99, mixedCap: 1.15, statePrice: 0.92 };

// Projekty państwa: przetargi jak infrastruktura S5, moc trafia do państwowej spółki tego typu.
Object.assign(INFRA_TYPES, {
    plant_coal: { name: 'Elektrownia węglowa', energy: 'coal', mode: null, gain: 0, power: 0.04, cost: 3_000_000, quarters: [8, 12], limit: 1 },
    plant_gas:  { name: 'Elektrownia gazowa', energy: 'gas', mode: null, gain: 0, power: 0.04, cost: 2_400_000, quarters: [6, 10], limit: 3 },
    plant_oze:  { name: 'Farma OZE', energy: 'oze', mode: null, gain: 0, power: 0.03, cost: 2_000_000, quarters: [4, 8], limit: 4 },
    plant_nuclear: { name: 'Elektrownia jądrowa', energy: 'nuclear', mode: null, gain: 0, power: 0.06, cost: 6_000_000, quarters: [12, 16], limit: 1 }
});

const getEnergyPolicyType = () => ENERGY_POLICY_TYPES[Number(society?.laws?.energyPolicy) || 0] || null;
/** Mnożnik zmienności po raporcie: spółka typu wspieranego ustawą jest nieco stabilniejsza. */
function getEnergyPolicyStability(stock) {
    return stock?.power && stock.power.type === getEnergyPolicyType() ? ENERGY_LAW_RULES.policyStability : 1;
}
/** Cena po ustawie „Dostawcy energii”: prywatna rynkowa, mieszana z limitem, państwowa niższa i z limitem. Reszta to dopłata budżetu. */
function applyEnergySuppliers(raw) {
    const level = Number(society?.laws?.energySuppliers ?? SOCIAL_LAWS.energySuppliers.start);
    if (level === 0) return raw;
    return level === 1 ? Math.min(raw, ENERGY_LAW_RULES.mixedCap) : Math.min(raw, ENERGY_LAW_RULES.mixedCap) * ENERGY_LAW_RULES.statePrice;
}
/** Dopłata budżetu przy cenie poniżej rynkowej: część przychodów producentów prądu. */
function settleEnergySubsidy(e, raw) {
    const gap = raw > 0 ? Math.max(0, 1 - e.price / raw) : 0;
    const revenue = stocks.reduce((sum, stock) => sum + (stock.power && !stock.isBankrupt ? getStockRevenue(stock) * (getPowerSegment(stock)?.share || 0) : 0), 0);
    const amount = Math.round(gap * revenue);
    e.subsidy = amount;
    if (amount > 0) { governmentTreasury -= amount; society.budget.extraSpending = (Number(society.budget.extraSpending) || 0) + amount; }
    return amount;
}

function createEnergyState() {
    return { v: 1, scale: 0, demand0: 0, activity: 1, pop0: 0, rate0: 0, price0: 0, fuel0: {}, price: 1, hist: [], demand: 0, capacity: 0, util0: 1 / ENERGY_RULES.startReserve,
        pool: {}, ledger: {}, shortQ: 0, blackoutQ: -99, blackoutUntil: -1, municipal: 0, stats: { blackouts: 0, blocks: 0, municipal: 0, projects: 0, contracts: 0, deposits: 0 } };
}

function getEnergyQuarter() { return typeof macro === 'object' && macro ? macro.quarter : 0; }
function hasEnergyState() { return typeof society === 'object' && society?.energy?.v > 0; }

/** Segment produkujący prąd: Energia poza rafineriami i wydobyciem gazu. */
function getPowerSegment(stock) {
    if (!stock || stock.isBankStock) return null;
    return getStockSegments(stock).find(seg => seg.sector === 'Energia' && !ENERGY_NO_POWER_SUBSECTORS.includes(seg.subsector)) || null;
}
function getPowerTypeForStock(stock) {
    return ENERGY_SUBSECTOR_TYPE[getPowerSegment(stock)?.subsector] || 'coal';
}
function getStockRevenue(stock) { return Number(stock?.fundamentals?.revenue) || 0; }

function getEnergyFuelPrice(id) {
    if (typeof commodityState !== 'object' || !commodityState || !COMMODITY_DEFS[id]) return 1;
    return Number(commodityState.prices?.[id]) || COMMODITY_DEFS[id].mean;
}
function getEnergyBaseRate() { return Number(centralBank?.baseInterestRate) || 0.05; }

/** Koszt typu: stała baza, paliwo względem ceny startowej, część kapitałowa względem stopy startowej. */
function getEnergyTypeCost(type, e = society.energy) {
    const def = ENERGY_TYPES[type];
    const fuel = def.fuel && e.fuel0[def.fuel] > 0 ? getEnergyFuelPrice(def.fuel) / e.fuel0[def.fuel] - 1 : 0;
    const rate = getEnergyBaseRate() - (e.rate0 || 0);
    return def.cost * Math.max(0.3, 1 + def.fuelShare * fuel + def.capitalShare * rate * ENERGY_RULES.rateCost);
}

function getEnergyMix(e = society.energy) {
    const mix = Object.fromEntries(ENERGY_TYPE_IDS.map(type => [type, Number(e.pool?.[type]) || 0]));
    for (const stock of stocks) {
        if (stock.isBankrupt || !stock.power) continue;
        mix[stock.power.type] += Number(stock.power.capacity) || 0;
        for (const type in stock.power.other || {}) mix[type] += stock.power.other[type];
    }
    if (typeof municipalCompanies !== 'undefined') for (const company of municipalCompanies) if (company.power) mix[company.power.type] += company.power.capacity;
    return mix;
}
function getEnergyCapacity(e = society.energy) { return Object.values(getEnergyMix(e)).reduce((sum, value) => sum + value, 0); }

function getRawEnergyPrice(e) {
    const mix = getEnergyMix(e), total = Object.values(mix).reduce((sum, value) => sum + value, 0);
    return total > 0 ? ENERGY_TYPE_IDS.reduce((sum, type) => sum + mix[type] / total * getEnergyTypeCost(type, e), 0) : 1;
}

/** Stan startowy: miks kraju z startMix (startCapacity MW), w typie moc według przychodu segmentu Energia. Typ bez spółek trafia do puli. */
function initEnergyState() {
    const e = createEnergyState();
    const producers = stocks.filter(stock => !stock.isBankrupt && !stock.assetType && getPowerSegment(stock));
    const output = stock => getStockRevenue(stock) * getPowerSegment(stock).share;
    const total = producers.reduce((sum, stock) => sum + output(stock), 0);
    e.scale = total > 0 ? ENERGY_RULES.startCapacity / total : 0;
    for (const type of ENERGY_TYPE_IDS) {
        const target = ENERGY_RULES.startCapacity * ENERGY_RULES.startMix[type], list = producers.filter(stock => getPowerTypeForStock(stock) === type);
        const sum = list.reduce((acc, stock) => acc + output(stock), 0);
        for (const stock of list) stock.power = { type, capacity: sum > 0 ? Math.round(target * output(stock) / sum) : 0 };
        if (!(sum > 0) && target > 0) e.pool[type] = target;
    }
    e.demand0 = ENERGY_RULES.startCapacity / ENERGY_RULES.startReserve;
    e.demand = e.demand0;
    e.pop0 = Number(society.population) || 1;
    e.rate0 = getEnergyBaseRate();
    for (const type of ENERGY_TYPE_IDS) if (ENERGY_TYPES[type].fuel) e.fuel0[ENERGY_TYPES[type].fuel] = getEnergyFuelPrice(ENERGY_TYPES[type].fuel);
    e.price0 = 1;
    e.price0 = getRawEnergyPrice(e);
    e.capacity = getEnergyCapacity(e);
    e.hist = [1];
    society.energy = e;
    return e;
}
function ensureEnergy() {
    if (!society.energy || !(society.energy.v > 0)) return initEnergyState();
    return society.energy;
}

/** Moc spółek, które zniknęły (upadłość, przejęcie), zostaje w kraju jako pula, a nowe spółki energetyczne dostają moc z przychodu. */
function syncPowerProducers(e) {
    const seen = new Set();
    for (const stock of stocks) {
        if (stock.isBankrupt) continue;
        if (stock.power) seen.add(stock.symbol);
        else if (!stock.assetType && getPowerSegment(stock) && e.scale > 0) {
            const type = getPowerTypeForStock(stock);
            stock.power = { type, capacity: type === 'nuclear' ? 0 : Math.round(getStockRevenue(stock) * getPowerSegment(stock).share * e.scale) };
            seen.add(stock.symbol);
        }
    }
    for (const symbol of Object.keys(e.ledger)) {
        if (seen.has(symbol)) continue;
        const entry = e.ledger[symbol];
        e.pool[entry[0]] = (Number(e.pool[entry[0]]) || 0) + entry[1];
        delete e.ledger[symbol];
    }
    for (const stock of stocks) if (!stock.isBankrupt && stock.power) e.ledger[stock.symbol] = [stock.power.type, (Number(stock.power.capacity) || 0)];
}

function getEnergyDemand(e) {
    const household = (Number(society.population) || e.pop0) / e.pop0;
    return e.demand0 * ((1 - ENERGY_RULES.householdShare) * e.activity + ENERGY_RULES.householdShare * household) * (1 - getSmartGridCut());
}
function getEnergyTrend(e = society.energy) { return e.hist.length ? e.hist.reduce((sum, value) => sum + value, 0) / e.hist.length : 1; }
function getEnergyShortage(e = society.energy) { return e.capacity > 0 ? Math.max(0, e.demand / e.capacity - 1) : 0; }
function getEnergyReserve(e = society.energy) { return e.demand > 0 ? e.capacity / e.demand : 1; }
function getEnergyBuilding(e = society.energy) {
    return stocks.reduce((sum, stock) => sum + (stock.isBankrupt ? 0 : Number(stock.power?.build?.add) || 0), 0)
        + (society.infra?.projects || []).filter(p => INFRA_TYPES[p.type]?.energy && (p.status === 'tender' || p.status === 'build')).reduce((sum, p) => sum + INFRA_TYPES[p.type].power * e.capacity, 0);
}

function publishEnergyNews(text, subject, importance = 1) {
    logSociety(text);
    if (typeof addMail === 'function') addMail({ sender: getRandomElement(['PULS', 'FLESZ', 'OBSER']), subject, body: text, importance });
    if (typeof addTiedPost === 'function' && typeof mailbox === 'object' && stocks.some(stock => stock.symbol === 'PULS')) addTiedPost({ symbol: 'PULS', text, kind: 'note' });
}

/** Wpływ prądu na kwartał spółki (getCommodityResultAdj): producent zarabia na cenie i wykorzystaniu mocy, odbiorca płaci odchylenie ceny. */
function getPowerResultAdj(stock) {
    if (!hasEnergyState() || stock?.kind === 'share') return { revenueFactor: 1, marginAdj: 0 };
    const e = society.energy, deviation = e.price / getEnergyTrend(e) - 1;
    let revenueFactor = 1, marginAdj = 0;
    if (stock.power) {
        const share = getPowerSegment(stock)?.share || 0, utilization = Math.min(1, e.capacity > 0 ? e.demand / e.capacity : 1) / e.util0 - 1;
        revenueFactor += share * (ENERGY_RULES.producerPrice * deviation + ENERGY_RULES.producerUtil * utilization);
        if (stock.power.type === getEnergyPolicyType()) marginAdj += ENERGY_LAW_RULES.policyMargin;
    }
    const input = POWER_INPUT_SYMBOLS[stock.symbol] ?? getStockSegments(stock).reduce((sum, seg) => sum + (POWER_INPUTS[seg.sector] || 0) * seg.share, 0);
    if (input > 0) {
        marginAdj -= input * deviation * (1 - ENERGY_RULES.pass);
        if (e.blackoutUntil >= getEnergyQuarter()) revenueFactor -= ENERGY_RULES.blackoutCut;
    }
    if (stock.deposit && stock.deposit.untilQ > getEnergyQuarter()) revenueFactor *= stock.deposit.factor;
    const emission = getStockEmissionFactor(stock);
    if (emission > 0) { marginAdj -= getClimateFee() * emission; revenueFactor *= 1 - getPollutionProductionCut(e); }
    revenueFactor *= getOpinionRevenueFactor(stock, e);
    if (e.acidUntil >= getEnergyQuarter() && getStockSegments(stock).some(seg => seg.subsector === 'Rolnictwo')) revenueFactor -= ENERGY_EVENT_RULES.acidCut;
    return { revenueFactor, marginAdj };
}

// ---------------------------------------------------------------------------------
// Budowa bloków spółek
// ---------------------------------------------------------------------------------
function getPowerBlockSize(stock, e = society.energy) {
    const own = Number(stock.power?.capacity) || 0, national = e.capacity * ENERGY_RULES.blockShare;
    return Math.max(1, Math.round(own > 0 ? Math.min(national, own * ENERGY_RULES.blockOwnMax) : national * 0.25)); // mała spółka buduje mały blok, przychód rośnie najwyżej o 30%
}
function getRevenuePerMw(stock, e = society.energy) {
    const own = Number(stock.power?.capacity) || 0, share = getPowerSegment(stock)?.share || 1;
    return own > 0 ? getStockRevenue(stock) * share / own : (e.scale > 0 ? 1 / e.scale : 0);
}
function getPowerBlockCost(stock, add = getPowerBlockSize(stock), e = society.energy) {
    return Math.round(add * getRevenuePerMw(stock, e) * ENERGY_RULES.blockCostQuarters * (stock.power?.site ? ENERGY_RULES.siteCost : 1) * (Number(stock.power?.techCost) || 1));
}

function canStartPowerBlock(stock) {
    return Boolean(stock?.power && !stock.isBankrupt && !stock.power.build && stock.power.type !== 'nuclear');
}
function startPowerBlock(stock, type = stock?.power?.type) {
    if (!canStartPowerBlock(stock) || !ENERGY_RULES.buildQuarters[type]) return null;
    const e = ensureEnergy(), add = getPowerBlockSize(stock, e), cost = getPowerBlockCost(stock, add, e);
    const quarters = Math.max(1, Math.round(getRandomIntInRange(...ENERGY_RULES.buildQuarters[type]) * (stock.power.site ? ENERGY_RULES.siteTime : 1)));
    stock.power.build = { add, cost, spent: 0, quarters, dueQ: getEnergyQuarter() + quarters, type };
    stock.power.site = false;
    logEvent(`⚡ ${stock.name} rozpoczyna budowę bloku ${add} MW (${ENERGY_TYPES[type].name.toLowerCase()}, ok. ${quarters} kw., koszt ${formatZl(cost, 0)}).`, 'company');
    return stock.power.build;
}
function payPowerInstallment(stock) {
    const build = stock.power.build, installment = Math.min(build.cost - build.spent, Math.ceil(build.cost / build.quarters));
    if (!(installment > 0)) return 0;
    ensureCompanyCash(stock, installment, 'Kredyt na ratę budowy bloku energetycznego');
    adjustCompanyCash(stock, -installment); // aktywa bez zmian: gotówka zamienia się w budowę w toku, jak przy bloku jądrowym
    build.spent += installment;
    if (typeof recordPayment === 'function') recordPayment(stock, 'external:budowa_bloku', installment, 'Budowa bloku energetycznego');
    if (typeof coverNegativeCash === 'function') coverNegativeCash(stock);
    return installment;
}
/** Nowa moc spółki: przychód rośnie razem z mocą segmentu. */
function addStockPower(stock, add, type = stock.power.type) {
    const share = getPowerSegment(stock)?.share || 1, own = Number(stock.power.capacity) || 0;
    if (type === stock.power.type) stock.power.capacity = own + add;
    else (stock.power.other = stock.power.other || {})[type] = (Number(stock.power.other?.[type]) || 0) + add;
    if (own > 0 && stock.fundamentals) stock.fundamentals.revenue *= 1 + share * add / own;
    society.energy.stats.blocks++;
}
function finishPowerBlock(stock) {
    const build = stock.power.build;
    stock.power.build = null;
    stock.power.techCost = 1;
    addStockPower(stock, build.add, build.type || stock.power.type);
    logEvent(`⚡ ${stock.name} uruchamia blok ${build.add} MW.`, 'company');
    if (typeof addChartEvent === 'function') addChartEvent(stock, '⚡', `Nowy blok ${build.add} MW`);
    return build.add;
}
function processPowerBuilds(e) {
    const quarter = getEnergyQuarter(), deviation = e.price / getEnergyTrend(e) - 1;
    for (const stock of stocks) {
        if (stock.isBankrupt || !stock.power || stock.power.type === 'nuclear') continue;
        if (stock.power.build) {
            payPowerInstallment(stock);
            if (stock.power.build.dueQ <= quarter) finishPowerBlock(stock);
            continue;
        }
        if (typeof canFundControlAgm === 'function' && canFundControlAgm(stock)) continue; // właściciel decyduje sam
        const reserve = (e.capacity + getEnergyBuilding(e)) / Math.max(1, e.demand);
        const need = clampValue((ENERGY_RULES.targetReserve - reserve) / 0.05, 0, 1);
        const chance = ENERGY_RULES.buildChance * need * (1 + Math.max(0, deviation) * 2);
        const cashOk = (Number(stock.cash) || 0) >= getPowerBlockCost(stock, undefined, e) * ENERGY_RULES.minCashShare;
        if (chance > 0 && cashOk && Math.random() < chance) startPowerBlock(stock);
    }
}
/** Budynek energetyczny z katalogu daje moc spółce (typ spółki, wiatr i słońce zawsze OZE). */
function noteEnergyBuilding(stock, id) {
    const share = ENERGY_RULES.catalogPower[id];
    if (!share || !hasEnergyState()) return 0;
    if (!stock.power) stock.power = { type: id === 'energy_plant' ? getPowerTypeForStock(stock) : 'oze', capacity: 0 };
    const type = id === 'energy_plant' ? stock.power.type : 'oze', add = Math.max(1, Math.round(society.energy.capacity * share));
    addStockPower(stock, add, type);
    return add;
}

// ---------------------------------------------------------------------------------
// Zlecenia: złoża, działka, technologie
// ---------------------------------------------------------------------------------
function getDepositCommodity(stock) {
    const product = getStockCommodityProfile(stock).product;
    return DEPOSIT_COMMODITIES.find(id => product[id] > 0) || null;
}
function canOrderEnergyContract(stock, kind) {
    if (!stock || stock.isBankrupt || stock.energyOrder || !ENERGY_CONTRACTS[kind]) return false;
    if (kind === 'deposit') return Boolean(getDepositCommodity(stock)) && !(stock.deposit?.untilQ > getEnergyQuarter());
    if (kind === 'site') return Boolean(stock.power) && !stock.power.site;
    return (stock.power?.type === 'oze' || stock.power?.type === 'nuclear') && (Number(stock.power.techs) || 0) < ENERGY_RULES.techMax;
}
function getEnergyContractCost(stock) { return Math.round(getStockRevenue(stock) * ENERGY_RULES.contractCost); }
/** Wykonawca: najlepsza firma z 3 najtańszych ofert. */
function pickEnergyContractor(kind) {
    const specialty = ENERGY_CONTRACTS[kind].specialty;
    ensureSubcontractorRegistry();
    return [...getSubcontractorsBySpecialty(specialty)].sort((a, b) => a.priceFactor - b.priceFactor).slice(0, 3).sort((a, b) => b.quality - a.quality)[0] || null;
}
function orderEnergyContract(stock, kind) {
    if (!canOrderEnergyContract(stock, kind)) return null;
    const def = ENERGY_CONTRACTS[kind], contractor = pickEnergyContractor(kind), cost = getEnergyContractCost(stock);
    ensureCompanyCash(stock, cost, `Kredyt na zlecenie: ${def.name}`);
    adjustCompanyCash(stock, -cost);
    adjustBalanceSheet(stock, { assets: -cost, retainedEarnings: -cost });
    if (kind === 'tech' && typeof recordResearchExpense === 'function') recordResearchExpense(stock, { amount: cost, techId: 'energy_tech' });
    if (contractor) { contractor.cash = (Number(contractor.cash) || 0) + cost; contractor.hires = (Number(contractor.hires) || 0) + 1; contractor.contractsCompleted = (Number(contractor.contractsCompleted) || 0) + 1; }
    if (typeof coverNegativeCash === 'function') coverNegativeCash(stock);
    stock.energyOrder = { kind, dueQ: getEnergyQuarter() + getRandomIntInRange(...def.quarters) };
    ensureEnergy().stats.contracts++;
    return stock.energyOrder;
}
function settleEnergyContract(stock, roll = Math.random()) {
    const order = stock.energyOrder, quarter = getEnergyQuarter();
    stock.energyOrder = null;
    if (order.kind === 'site') { if (stock.power) stock.power.site = true; stock.energyResult = { ok: true, text: 'działka gotowa, następna budowa tańsza i krótsza.' }; return true; }
    if (order.kind === 'tech') {
        if (stock.power) {
            stock.power.techs = (Number(stock.power.techs) || 0) + 1;
            const add = Math.round((Number(stock.power.capacity) || 0) * ENERGY_RULES.techGain);
            const more = add > 0 && roll < 0.5; // wynik: +3% mocy albo tańszy następny blok
            if (more) addStockPower(stock, add);
            else stock.power.techCost = ENERGY_RULES.techCost;
            stock.energyResult = { ok: true, text: more ? 'sprawność +3%.' : 'następny blok tańszy o 5%.' };
        }
        return true;
    }
    if (roll >= ENERGY_RULES.depositChance) { stock.energyResult = { ok: false, text: 'geolog nie znalazł złoża.' }; logEvent(`🪨 ${stock.name}: geolodzy nie znaleźli nowego złoża.`, 'company'); return false; }
    stock.deposit = { factor: +getRandomInRange(...ENERGY_RULES.depositFactor).toFixed(3), untilQ: quarter + getRandomIntInRange(...ENERGY_RULES.depositQuarters) };
    society.energy.stats.deposits++;
    stock.energyResult = { ok: true, text: `złoże znalezione, produkcja +${Math.round((stock.deposit.factor - 1) * 100)}% do kw. ${stock.deposit.untilQ}.` };
    logEvent(`🪨 ${stock.name}: nowe złoże, wyższa produkcja na czas eksploatacji.`, 'company');
    return true;
}
function processEnergyContracts() {
    const quarter = getEnergyQuarter();
    for (const stock of stocks) {
        if (stock.isBankrupt || stock.assetType) continue;
        if (stock.energyOrder) { if (stock.energyOrder.dueQ <= quarter) settleEnergyContract(stock); continue; }
        if (stock.deposit && stock.deposit.untilQ <= quarter) stock.deposit = null;
        if (!stock.power && !COMMODITY_ASSIGNMENTS[stock.symbol]?.product) continue;
        if (Math.random() >= ENERGY_RULES.aiContractChance || (typeof canFundControlAgm === 'function' && canFundControlAgm(stock))) continue;
        const kind = getRandomElement(Object.keys(ENERGY_CONTRACTS));
        if ((Number(stock.cash) || 0) >= getEnergyContractCost(stock) * 2) orderEnergyContract(stock, kind);
    }
}

// ---------------------------------------------------------------------------------
// Projekty państwa, spółki miejskie, blackout
// ---------------------------------------------------------------------------------
function addStatePower(type, add) {
    const owner = stocks.filter(stock => !stock.isBankrupt && stock.power?.type === type && stock.isStateOwned).sort((a, b) => b.power.capacity - a.power.capacity)[0];
    if (owner) addStockPower(owner, add);
    else { society.energy.pool[type] = (Number(society.energy.pool[type]) || 0) + add; society.energy.stats.blocks++; }
    return owner || null;
}
function onEnergyProjectCompleted(def) {
    const e = ensureEnergy(), add = Math.round(e.capacity * def.power);
    addStatePower(def.energy, add);
    e.stats.projects++;
    return add;
}
function maybeAnnounceEnergyProject(e) {
    if ((e.capacity + getEnergyBuilding(e)) / Math.max(1, e.demand) >= ENERGY_RULES.stateProjectAt || Math.random() >= ENERGY_RULES.stateProjectChance) return null;
    if ((Number(society.budget?.deficitQuarters) || 0) > 0) return null;
    const open = getInfraOpenTypes().filter(type => INFRA_TYPES[type].energy && (type !== 'plant_nuclear' || getEnergyPolicyType() === 'nuclear'));
    return open.length ? announceInfraProject(getRandomElement(open), 'niedobór mocy') : null;
}
function maybeSpawnMunicipalEnergy(e) {
    e.shortQ = getEnergyShortage(e) > 0 ? e.shortQ + 1 : 0;
    if (e.shortQ < ENERGY_RULES.municipalAfter || e.municipal >= ENERGY_RULES.municipalMax || typeof municipalCompanies === 'undefined') return null;
    e.shortQ = 0;
    const n = ++e.municipal, type = getRandomElement(['gas', 'oze']);
    const company = {
        willList: true, id: `mun_EN${n}`, name: `Elektrownia Miejska ${n}`, type: 'Energia', budget: ENERGY_RULES.municipalBudget, baseIncome: ENERGY_RULES.municipalBudget * 0.1,
        power: { type, capacity: Math.round(e.capacity * ENERGY_RULES.municipalShare) }
    };
    municipalCompanies.push(company);
    e.stats.municipal++;
    publishEnergyNews(`⚡ Miasto zakłada spółkę ${company.name}, bo zużycie prądu od dawna przekracza moc kraju.`, `⚡ Nowa spółka energetyczna: ${company.name}`);
    return company;
}
function triggerBlackout(e, quarter = getEnergyQuarter()) {
    e.blackoutQ = quarter;
    e.blackoutUntil = quarter + 1;
    e.stats.blackouts++;
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('cenaPradu', 'Blackout');
    for (const stock of stocks) if (stock.workforce) stock.workforce.satisfaction = clampValue(stock.workforce.satisfaction - ENERGY_RULES.blackoutMood, 0, 100);
    publishEnergyNews('🔌 Blackout: zużycie przekroczyło moc kraju, fabryki stoją, a ludzie są wściekli.', '🔌 Blackout w kraju', 2);
}
function maybeBlackout(e) {
    const quarter = getEnergyQuarter();
    if (getEnergyShortage(e) >= ENERGY_RULES.blackoutAt + getBatteryMargin() && quarter - e.blackoutQ >= ENERGY_RULES.blackoutCooldown && Math.random() < ENERGY_RULES.blackoutChance) triggerBlackout(e, quarter);
}

// ---------------------------------------------------------------------------------
// E4: Urząd Energii i Ekologii. E5: zanieczyszczenia, opłata, limity, zdarzenia
// ---------------------------------------------------------------------------------
const SECTOR_EMISSIONS = { 'Chemia': 0.7, 'Przemysł': 0.6, 'Motoryzacja': 0.3, 'Budowlany': 0.2, 'Energia': 0.5 };
const POLLUTION_RULES = {
    start: 40, keep: 0.9, healthyLevel: 40, populationLoss: 0.0002, productionFrom: 80, productionCut: 0.02
};
const CLIMATE_FEES = [0, 0.006, 0.012, 0.018, 0.025];   // opłata: część przychodu przy emisyjności 1 (decyzja użytkownika, pkt 8)
const ENERGY_OFFICE_RULES = {
    // poziomy: 0 bez limitów, 1 pomiar kraju, 2 pomiar spółek i limit z karą, 3 częstsze kontrole i ESG, 4 dokładny pomiar i wyższe kary, 5 pełny nadzór
    limits: [Infinity, Infinity, 1.1, 0.9, 0.75, 0.6],
    checks: [0, 0, 0.12, 0.2, 0.25, 0.3], fines: [0, 0, 0.02, 0.02, 0.03, 0.03],
    pollutionTight: 400, budgetShare: 0.15, greenBudgetShare: 0.30, countryLevel: 1, companyLevel: 2,
    measureStep: [1, 1, 0.1, 0.05, 0.01, 0.01], esgLevel: 3, esgCost: 1, esgCut: 0.25, aiEsgChance: 0.003, ecoMax: 0.7
};
const ENERGY_EVENTS = {
    smog: { minPollution: 50, chance: 0.12, texts: ['🌫️ Smog nad miastami: szkoły odwołują lekcje, a przychodnie są pełne.', '🌫️ Alarm smogowy trzeci dzień z rzędu. Mieszkańcy pytają, kto za to odpowiada.', '🌫️ Gęsty smog zatrzymał lotnisko i zamknął przedszkola.'] },
    protest: { minPollution: 45, chance: 0.07, texts: ['📢 Protest pod bramą {name}: mieszkańcy żądają ograniczenia emisji.', '📢 Blokada dojazdu do zakładu {name}. Ekolodzy i sąsiedzi idą razem.', '📢 Marsz przeciw {name} przeszedł przez centrum miasta.'] },
    failure: { minPollution: 0, chance: 0.05, texts: ['⚠️ Awaria w elektrowni {name}: część mocy wypadła z sieci.', '⚠️ {name}: pożar transformatora, blok stoi.', '⚠️ {name}: awaryjne wyłączenie bloku po usterce turbiny.'] },
    acidRain: { minPollution: 60, chance: 0.06, texts: ['🌧️ Kwaśne deszcze niszczą uprawy, a rolnicy liczą straty.', '🌧️ Rolnicy alarmują: kwaśne deszcze obniżają plony.'] },
    scandal: { minPollution: 35, chance: 0.04, texts: ['🕵️ Skandal ekologiczny: {name} miała ukrywać prawdziwe emisje.', '🕵️ Dziennikarze ujawniają nielegalny zrzut ścieków spółki {name}.', '🕵️ {name} pod lupą po ujawnieniu sfałszowanych pomiarów emisji.'] }
};
const ENERGY_EVENT_RULES = { smogMood: 1, protestPrice: -0.02, failureQuarters: 2, failureShare: 0.5, failurePrice: -0.03, acidCut: 0.05, acidQuarters: 2, scandalPrice: -0.04 };

const getEnergyOfficeLevel = () => Number(oversight?.energy?.level) || 0;
function getClimateFee() { return CLIMATE_FEES[Number(society?.laws?.climatePolicy ?? SOCIAL_LAWS.climatePolicy.start)] || 0; }
function getStockEcoCut(stock) { return Math.min(ENERGY_OFFICE_RULES.ecoMax, (Number(stock?.ecoCut) || 0) + getStockTechCut(stock)); }
/** Emisyjność spółki: średnia sektorów, prąd według typu elektrowni, po obniżkach (technologie, ESG). */
function getStockEmissionFactor(stock) {
    if (!stock || stock.assetType || stock.isBankStock) return 0;
    const factor = getStockSegments(stock).reduce((sum, seg) => {
        const power = seg.sector === 'Energia' && stock.power && !ENERGY_NO_POWER_SUBSECTORS.includes(seg.subsector);
        return sum + (power ? ENERGY_TYPES[stock.power.type].emission : SECTOR_EMISSIONS[seg.sector] || 0) * seg.share;
    }, 0);
    return factor * (1 - getStockEcoCut(stock));
}
/** Emisje kwartału: produkcja (przychód w cenach startowych) × emisyjność. */
function getStockEmissions(stock) { return getStockRevenue(stock) / (Number(society.priceLevel) || 1) * getStockEmissionFactor(stock); }
/** Emisje spółki w widokach: od poziomu 2 (debug zawsze), wyższy poziom mierzy dokładniej. */
function getMeasuredEmissionFactor(stock) {
    const debug = typeof isDebugMode === 'function' && isDebugMode(), level = getEnergyOfficeLevel();
    if (!debug && level < ENERGY_OFFICE_RULES.companyLevel) return null;
    const step = debug ? 0.01 : ENERGY_OFFICE_RULES.measureStep[level];
    return Math.round(getStockEmissionFactor(stock) / step) * step;
}
const canSeeCountryEmissions = () => (typeof isDebugMode === 'function' && isDebugMode()) || getEnergyOfficeLevel() >= ENERGY_OFFICE_RULES.countryLevel;
function getEmissionLimit(e = society.energy) {
    return ENERGY_OFFICE_RULES.limits[getEnergyOfficeLevel()] * (1 - (Number(e?.pollution) || 0) / ENERGY_OFFICE_RULES.pollutionTight);
}
function getPollutionProductionCut(e = society.energy) {
    return Math.max(0, (Number(e?.pollution) || 0) - POLLUTION_RULES.productionFrom) / (100 - POLLUTION_RULES.productionFrom) * POLLUTION_RULES.productionCut;
}

/** Wskaźnik P = 0,9 × P + emisje / norma. Norma z pierwszego kwartału, tak by przy stałych emisjach P wynosiło 40. */
function processPollution(e) {
    const emissions = stocks.reduce((sum, stock) => sum + (stock.isBankrupt ? 0 : getStockEmissions(stock)), 0);
    if (!(e.norm > 0)) {
        e.norm = emissions > 0 ? emissions * (1 - POLLUTION_RULES.keep) * 100 / POLLUTION_RULES.start / 10 : 1;
        e.pollution = POLLUTION_RULES.start;
    }
    e.emissions = Math.round(emissions);
    e.pollutionLast = e.pollution;
    e.pollution = +clampValue(POLLUTION_RULES.keep * e.pollution + emissions / e.norm / 10, 0, 100).toFixed(2);
    if (e.pollution > POLLUTION_RULES.healthyLevel) society.population = Math.round(society.population * (1 - (e.pollution - POLLUTION_RULES.healthyLevel) / 60 * POLLUTION_RULES.populationLoss));
    return e.pollution;
}
/** Opłata za emisje zbierana z marż (getPowerResultAdj) trafia do funduszu energii, część do urzędu. */
function collectClimateFee(e) {
    const fee = getClimateFee();
    const amount = fee > 0 ? stocks.reduce((sum, stock) => sum + (stock.isBankrupt ? 0 : getStockRevenue(stock) * getStockEmissionFactor(stock) * fee), 0) : 0;
    e.feeQuarter = Math.round(amount);
    const greens = macro?.election?.ruling === 'green' || macro?.election?.coalition?.partner === 'green';
    const office = amount * (greens ? ENERGY_OFFICE_RULES.greenBudgetShare : ENERGY_OFFICE_RULES.budgetShare);
    if (office > 0) fundInstitution(oversight.energy, office);
    e.fund = (Number(e.fund) || 0) + amount - office;
    return amount;
}
/** Kontrola urzędu: spółka ponad limitem płaci karę, jej szansa rośnie ze skutecznością urzędu. */
function processEnergyOffice(e) {
    const level = getEnergyOfficeLevel();
    if (level < ENERGY_OFFICE_RULES.companyLevel) return 0;
    const limit = getEmissionLimit(e), chance = getInstitutionEffectiveness(oversight.energy) * ENERGY_OFFICE_RULES.checks[level];
    let fines = 0;
    for (const stock of stocks) {
        if (stock.isBankrupt || stock.assetType) continue;
        const factor = getStockEmissionFactor(stock);
        if (factor <= limit || Math.random() >= chance) continue;
        const fine = Math.round(getStockRevenue(stock) * ENERGY_OFFICE_RULES.fines[level] * Math.min(1, (factor - limit) / limit));
        if (!(fine > 0)) continue;
        ensureCompanyCash(stock, fine, 'Kredyt na karę za emisje');
        adjustCompanyCash(stock, -fine);
        adjustBalanceSheet(stock, { assets: -fine, retainedEarnings: -fine });
        if (typeof coverNegativeCash === 'function') coverNegativeCash(stock);
        e.fund = (Number(e.fund) || 0) + fine;
        e.stats.fines = (e.stats.fines || 0) + 1;
        fines += fine;
        logEvent(`🏛️ Urząd Energii i Ekologii: kara ${formatZl(fine, 0)} dla ${stock.name} za przekroczenie limitu emisji.`, 'company');
    }
    return fines;
}
function canOrderEsg(stock) {
    return Boolean(stock && !stock.isBankrupt && !stock.assetType && !stock.esg && getEnergyOfficeLevel() >= ENERGY_OFFICE_RULES.esgLevel && getStockEmissionFactor(stock) > 0);
}
/** Ścieżka ESG: jednorazowy koszt i trwale niższe emisje, także po spadku poziomu urzędu. */
function orderEsg(stock) {
    if (!canOrderEsg(stock)) return false;
    const cost = Math.round(getStockRevenue(stock) * ENERGY_OFFICE_RULES.esgCost);
    ensureCompanyCash(stock, cost, 'Kredyt na program ESG');
    adjustCompanyCash(stock, -cost);
    adjustBalanceSheet(stock, { assets: -cost, retainedEarnings: -cost });
    if (typeof coverNegativeCash === 'function') coverNegativeCash(stock);
    stock.ecoCut = (Number(stock.ecoCut) || 0) + ENERGY_OFFICE_RULES.esgCut;
    stock.esg = true;
    society.energy.stats.esg = (society.energy.stats.esg || 0) + 1;
    if (typeof unlockAcademyEntry === 'function' && isPlayerHolding(stock)) unlockAcademyEntry('esg', stock.name);
    logEvent(`🌿 ${stock.name} wchodzi na ścieżkę ESG: wyższe koszty dziś, niższe emisje na stałe.`, 'company');
    return true;
}
function processAiEsg(e) {
    for (const stock of stocks) {
        if (!canOrderEsg(stock) || getStockEmissionFactor(stock) <= getEmissionLimit(e)) continue;
        if (Math.random() < ENERGY_OFFICE_RULES.aiEsgChance && (Number(stock.cash) || 0) > getStockRevenue(stock) && !(typeof canFundControlAgm === 'function' && canFundControlAgm(stock))) orderEsg(stock);
    }
}

function fillEnergyText(text, stock) { return text.replace('{name}', stock?.name || 'spółki'); }
function pickPolluter() {
    const top = stocks.filter(stock => !stock.isBankrupt && !stock.assetType && getStockEmissionFactor(stock) > 0.3).sort((a, b) => getStockEmissions(b) - getStockEmissions(a)).slice(0, 6);
    return top.length ? getRandomElement(top) : null;
}
/** Zdarzenia: najwyżej jedno na kwartał. */
function runEnergyEvent(id, e = society.energy) {
    const def = ENERGY_EVENTS[id], rules = ENERGY_EVENT_RULES, quarter = getEnergyQuarter();
    let stock = null;
    if (id === 'smog') { for (const item of stocks) if (item.workforce) item.workforce.satisfaction = clampValue(item.workforce.satisfaction - rules.smogMood, 0, 100); }
    else if (id === 'protest' || id === 'scandal') {
        stock = pickPolluter();
        if (!stock) return null;
        applyPriceEffect(stock.symbol, id === 'protest' ? rules.protestPrice : rules.scandalPrice, 'negative', 'company');
    } else if (id === 'failure') {
        const list = stocks.filter(item => !item.isBankrupt && item.power?.capacity > 0 && !item.power.outage);
        if (!list.length) return null;
        stock = getRandomElement(list);
        stock.power.outage = { until: quarter + rules.failureQuarters, lost: Math.round(stock.power.capacity * rules.failureShare) };
        stock.power.capacity -= stock.power.outage.lost;
        applyPriceEffect(stock.symbol, rules.failurePrice, 'negative', 'company');
    } else if (id === 'acidRain') e.acidUntil = quarter + rules.acidQuarters;
    e.stats.events = e.stats.events || {};
    e.stats.events[id] = (e.stats.events[id] || 0) + 1;
    publishEnergyNews(fillEnergyText(getRandomElement(def.texts), stock), `${def.texts[0].split(' ')[0]} ${stock?.name || 'Środowisko'}`, id === 'scandal' ? 2 : 1);
    if (typeof noteEnergyOpinion === 'function') noteEnergyOpinion(id);
    return { id, stock };
}
function processEnergyEvents(e) {
    const quarter = getEnergyQuarter();
    for (const stock of stocks) {
        const outage = stock.power?.outage;
        if (outage && outage.until <= quarter) { stock.power.capacity += outage.lost; stock.power.outage = null; }
    }
    if (e.pollution >= ENERGY_EVENTS.smog.minPollution && typeof unlockAcademyEntry === 'function') unlockAcademyEntry('emisjeLimity', 'Wysokie zanieczyszczenie');
    const open = Object.keys(ENERGY_EVENTS).filter(id => e.pollution >= ENERGY_EVENTS[id].minPollution).sort(() => Math.random() - 0.5);
    for (const id of open) if (Math.random() < ENERGY_EVENTS[id].chance) return runEnergyEvent(id, e);
    return null;
}

// ---------------------------------------------------------------------------------
// E6: poziom życia. E7: OZE i atom. E8: opinia publiczna. E9: technologie
// ---------------------------------------------------------------------------------
const LIFE_RULES = { factors: ['consumption', 'health', 'safety', 'education', 'information'], attractiveness: 0.1, population: 0.00001, vote: 0.3, voteMax: 3 };
const LIFE_NAMES = { consumption: 'Konsumpcja i zadowolenie', health: 'Zdrowie', safety: 'Bezpieczeństwo', education: 'Edukacja i nauka', information: 'Informacja' };
const countSectorStocks = sector => stocks.filter(stock => !stock.isBankrupt && !stock.assetType && getStockSegments(stock).some(seg => seg.sector === sector)).length;
/** 5 czynników 0–100 z istniejących wskaźników kraju. */
function getLifeFactors(e = society.energy) {
    const satisfaction = typeof getAverageSatisfaction === 'function' ? getAverageSatisfaction() : 60;
    const wage = typeof getAverageWageIndex === 'function' ? getAverageWageIndex() : 1;
    const budget = society.budget, healthFunding = clampValue((Number(budget.programs?.health) || 0) / Math.max(1, (Number(budget.taxBase) || 0) * SOCIAL_PROGRAM_FULL * 0.3), 0, 1);
    const pollution = Number(e?.pollution) || POLLUTION_RULES.start, police = typeof oversight === 'object' && oversight?.police ? oversight.police.level : 0;
    const security = typeof getHomeSecurityLevel === 'function' ? getHomeSecurityLevel() : 50, techs = stocks.reduce((sum, stock) => sum + Object.values(stock.research?.completedInvestments || {}).reduce((a, b) => a + (Number(b) || 0), 0), 0);
    return {
        consumption: clampValue(0.5 * satisfaction + 20 * wage + 15 * (Number(society.demandIndex) || 1), 0, 100),
        health: clampValue(45 + 25 * healthFunding + 1.2 * Math.min(10, countSectorStocks('Medycyna')) - 0.5 * (pollution - POLLUTION_RULES.start), 0, 100),
        safety: clampValue(0.8 * security + 4 * police, 0, 100),
        education: clampValue(0.6 * (Number(society.education) || 50) + 1.5 * Math.min(8, countSectorStocks('Badania')) + Math.min(10, techs / Math.max(1, stocks.length) * 2), 0, 100),
        information: clampValue(50 + 1.5 * Math.min(10, countSectorStocks('Media')) + 3 * Math.min(4, stocks.filter(stock => !stock.isBankrupt && getStockSegments(stock).some(seg => seg.subsector === 'Telekomunikacja')).length) - (Number(oversight?.corruption) || 0) / 5 - Math.min(10, Number(e?.stats?.events?.scandal) || 0), 0, 100)
    };
}
function getLifeQuality(e = society.energy) {
    const factors = getLifeFactors(e);
    return LIFE_RULES.factors.reduce((sum, id) => sum + factors[id], 0) / LIFE_RULES.factors.length;
}
function processLifeQuality(e) {
    const value = getLifeQuality(e);
    if (!(e.life0 > 0)) e.life0 = +value.toFixed(2);
    e.life = +value.toFixed(2);
    e.lifeHist = [...(e.lifeHist || []), e.life].slice(-5);
    society.population = Math.round(society.population * (1 + (e.life - e.life0) * LIFE_RULES.population));
}
/** Wkład w atrakcyjność kraju: odchylenie od poziomu startowego, więc na starcie migracja bez zmian. */
function getLifeAttractiveness() { return hasEnergyState() && society.energy.life0 > 0 ? (society.energy.life - society.energy.life0) * LIFE_RULES.attractiveness : 0; }
/** Nastroje wyborcze: rząd zyskuje albo traci na zmianie poziomu życia w ostatnim roku. */
function getLifeVoteAdj() {
    const hist = society.energy?.lifeHist;
    return hist?.length > 1 ? clampValue((hist[hist.length - 1] - hist[0]) * LIFE_RULES.vote, -LIFE_RULES.voteMax, LIFE_RULES.voteMax) : 0;
}

const ENERGY_STATE_RULES = { ozeShare: 0.5, nuclearPower: 0.06, nuclearMaxBlocks: 4, nuclearNextChance: 0.5, atomAfterQuarters: 16, atomChance: 0.05, atomStatePct: 0.8, atomPrice: 1700, atomShares: 1000000 };
const NUCLEAR_BLOCK_BOOSTS = [0.15, 0.10, 0.05];
/** Fundusz energii płaci spółkom OZE według mocy. Wpływy i wydatek to opłaty za emisje, więc saldo budżetu się nie zmienia. */
function payOzeSubsidies(e) {
    society.budget.energyFund = 0;
    const list = stocks.filter(stock => !stock.isBankrupt && (stock.power?.type === 'oze' || stock.power?.other?.oze > 0));
    const capacity = stock => (stock.power.type === 'oze' ? stock.power.capacity : 0) + (Number(stock.power.other?.oze) || 0);
    const total = list.reduce((sum, stock) => sum + capacity(stock), 0), pot = (Number(e.fund) || 0) * ENERGY_STATE_RULES.ozeShare;
    if (!(total > 0) || !(pot >= 1)) return 0;
    for (const stock of list) {
        const amount = Math.round(pot * capacity(stock) / total);
        if (!(amount > 0)) continue;
        adjustCompanyCash(stock, amount);
        adjustBalanceSheet(stock, { assets: amount, retainedEarnings: amount });
        if (typeof recordPayment === 'function') recordPayment('external:skarb-panstwa', stock, amount, 'Dopłata do OZE z opłat za emisje');
    }
    e.fund -= pot;
    e.ozeSpent = (Number(e.ozeSpent) || 0) + pot;
    e.ozeQuarters = (Number(e.ozeQuarters) || 0) + 1;
    society.budget.energyFund = Math.round(pot);
    return pot;
}
/** Nowy blok działa: moc kraju rośnie o stały udział, przychód liczy mechanika atomu. */
function addNuclearPower(stock) {
    const e = ensureEnergy(), add = Math.max(1, Math.round(e.capacity * ENERGY_STATE_RULES.nuclearPower));
    stock.power = stock.power || { type: 'nuclear', capacity: 0 };
    if (stock.power.type === 'nuclear') stock.power.capacity += add;
    else e.pool.nuclear = (Number(e.pool.nuclear) || 0) + add;
    e.stats.blocks++;
    return add;
}
/** Kontrakt z państwem: partia, a do tego ustawy „Polityka energetyczna” i „Dostawcy energii”. */
function getNuclearContractFactor(partyFactor) {
    const suppliers = Number(society?.laws?.energySuppliers ?? 1);
    return Math.max(0, partyFactor + (getEnergyPolicyType() === 'nuclear' ? 0.5 : 0) + (suppliers === 2 ? 0.25 : suppliers === 0 ? -0.25 : 0));
}
/** Państwowa spółka atomowa: po latach dopłat do OZE, od razu na Platynowej, bez NewHorizons. Prywatyzacja zwykłą ścieżką spółek państwowych. */
function maybeFoundStateAtom(e, roll = Math.random()) {
    if (e.stateAtom || (Number(e.ozeQuarters) || 0) < ENERGY_STATE_RULES.atomAfterQuarters || roll >= ENERGY_STATE_RULES.atomChance || typeof createListedCompany !== 'function') return null;
    const stock = createListedCompany({ name: 'Narodowy Atom', symbol: uniqueSymbol('NAT'), sector: ['Energia'], price: ENERGY_STATE_RULES.atomPrice, totalShares: ENERGY_STATE_RULES.atomShares, exchange: 'PLATINUM', market: 'GPW' });
    stock.segments = [{ sector: 'Energia', share: 1, subsector: 'Energetyka jądrowa' }];
    Object.assign(stock, { isStateOwned: true, stateOwnershipPct: ENERGY_STATE_RULES.atomStatePct, volatilityFactor: 0.7, power: { type: 'nuclear', capacity: 0 } });
    initializeFundamentals(stock, true);
    stocks.push(stock);
    e.stateAtom = stock.symbol;
    publishEnergyNews(`☢️ Państwo zakłada spółkę ${stock.name} i wprowadza ją wprost na Giełdę Platynową. Pierwszy blok to dopiero początek drogi.`, `☢️ ${stock.name} na Giełdzie Platynowej`, 2);
    return stock;
}

const OPINION_RULES = { start: 50, pull: 0.1, climateStep: 3, pollutionWeight: 0.2, certWeight: 0.3, maxEffect: 0.02, sectors: ['Dobra konsumpcyjne', 'Media', 'Turystyka'] };
const OPINION_EVENTS = { smog: -2, protest: -1, failure: -1, acidRain: -1, scandal: -4 };
function noteEnergyOpinion(id) {
    const e = society.energy;
    e.opinion = clampValue((e.opinion ?? OPINION_RULES.start) + (OPINION_EVENTS[id] || 0), 0, 100);
}
function processOpinion(e) {
    const climate = Number(society.laws?.climatePolicy ?? 1) - SOCIAL_LAWS.climatePolicy.start;
    const certificates = stocks.filter(stock => !stock.isBankrupt && stock.research?.completedInvestments?.COMMON_ECO_1 > 0).length;
    const target = OPINION_RULES.start + climate * OPINION_RULES.climateStep - (e.pollution - POLLUTION_RULES.start) * OPINION_RULES.pollutionWeight + Math.min(5, certificates * OPINION_RULES.certWeight);
    const value = e.opinion ?? OPINION_RULES.start;
    e.opinion = +clampValue(value + (target - value) * OPINION_RULES.pull, 0, 100).toFixed(2);
}
function getOpinionRevenueFactor(stock, e = society.energy) {
    const share = getStockSegments(stock).reduce((sum, seg) => sum + (OPINION_RULES.sectors.includes(seg.sector) ? seg.share : 0), 0);
    return share > 0 ? 1 + share * OPINION_RULES.maxEffect * ((e.opinion ?? OPINION_RULES.start) - OPINION_RULES.start) / OPINION_RULES.start : 1;
}

// Technologie bez nowego katalogu: istniejące pozycje `technologies` obniżają emisje, zużycie albo próg blackoutu.
const ENERGY_TECH_EFFECTS = { CHEM_CO2_CAPTURE_1: 0.15, BUILDING_GREEN_MATERIALS_1: 0.10, COMMON_ECO_1: 0.05, ENERGY_ALGAE_1: 0.05 };
const ENERGY_TECH_RULES = { smartGrid: 0.02, smartGridMax: 0.06, battery: 0.01, batteryMax: 0.03 };
const hasStockTech = (stock, id) => (Number(stock?.research?.completedInvestments?.[id]) || 0) > 0;
function getStockTechCut(stock) {
    if (!stock?.research?.completedInvestments) return 0;
    let cut = 0;
    for (const id in ENERGY_TECH_EFFECTS) if (hasStockTech(stock, id)) cut += ENERGY_TECH_EFFECTS[id];
    return cut;
}
const countTechOwners = id => stocks.filter(stock => !stock.isBankrupt && hasStockTech(stock, id)).length;
const getSmartGridCut = () => Math.min(ENERGY_TECH_RULES.smartGridMax, countTechOwners('ENERGY_SMART_GRID_1') * ENERGY_TECH_RULES.smartGrid);
const getBatteryMargin = () => Math.min(ENERGY_TECH_RULES.batteryMax, countTechOwners('ENERGY_BATTERY_1') * ENERGY_TECH_RULES.battery);

/** Kwartał energetyki: zużycie, moc, cena, budowy, zlecenia, nowe spółki, blackout, zanieczyszczenia, poziom życia, opinia. */
function processEnergyQuarterly() {
    if (typeof society !== 'object' || !society || !stocks?.length) return null;
    const e = ensureEnergy();
    syncPowerProducers(e);
    e.activity *= 1 + (Number(economyCycle?.gdpGrowth) || 0);
    e.demand = getEnergyDemand(e);
    e.capacity = getEnergyCapacity(e);
    const raw = getRawEnergyPrice(e) / e.price0 * (1 + ENERGY_RULES.shortagePremium * getEnergyShortage(e));
    e.price = +applyEnergySuppliers(raw).toFixed(4);
    settleEnergySubsidy(e, raw);
    e.hist.push(e.price);
    if (e.hist.length > ENERGY_RULES.histQuarters) e.hist.shift();
    processPowerBuilds(e);
    processEnergyContracts();
    maybeAnnounceEnergyProject(e);
    maybeSpawnMunicipalEnergy(e);
    maybeBlackout(e);
    processPollution(e);
    collectClimateFee(e);
    processEnergyOffice(e);
    processAiEsg(e);
    processEnergyEvents(e);
    payOzeSubsidies(e);
    maybeFoundStateAtom(e);
    processOpinion(e);
    processLifeQuality(e);
    if (typeof unlockAcademyEntry === 'function' && stocks.some(stock => stock.power && isPlayerHolding(stock))) unlockAcademyEntry('miksEnergetyczny', 'Spółka energetyczna w portfelu');
    return e;
}

// ---------------------------------------------------------------------------------
// Polecenia właściciela (> 50% akcji): blok, zlecenie, ESG
// ---------------------------------------------------------------------------------
function getOwnedEnergyStock(symbol) {
    const stock = stocks.find(item => item.symbol === symbol);
    if (stock && typeof canFundControlAgm === 'function' && canFundControlAgm(stock)) return stock;
    if (typeof showToast === 'function') showToast('Zlecać może tylko większościowy akcjonariusz (> 50%).', 'warning');
    return null;
}
function orderOwnerPowerBlock(symbol, type) {
    const stock = getOwnedEnergyStock(symbol);
    if (!stock) return null;
    if (!canStartPowerBlock(stock)) { if (typeof showToast === 'function') showToast('Poprzedni blok jest jeszcze w budowie.', 'warning'); return null; }
    if ((Number(stock.cash) || 0) < getPowerBlockCost(stock) * ENERGY_RULES.minCashShare) { if (typeof showToast === 'function') showToast('Za mało gotówki na start budowy.', 'warning'); return null; }
    return startPowerBlock(stock, type || stock.power.type);
}
function orderOwnerEnergyContract(symbol, kind) {
    const stock = getOwnedEnergyStock(symbol);
    if (!stock) return null;
    const order = orderEnergyContract(stock, kind);
    if (!order && typeof showToast === 'function') showToast('Tego zlecenia nie można teraz złożyć.', 'warning');
    return order;
}
function orderOwnerEsg(symbol) {
    const stock = getOwnedEnergyStock(symbol);
    return stock ? orderEsg(stock) : false;
}

// ---------------------------------------------------------------------------------
// E10: Akademia
// ---------------------------------------------------------------------------------
Object.assign(ACADEMY_ENTRIES, {
    miksEnergetyczny: {
        title: 'Miks energetyczny', get icon() { return academyIcon('prad'); },
        text: 'Miks to udział każdego typu elektrowni w mocy kraju: węgla, gazu, atomu i OZE. Zmienia się powoli, bo moc rośnie tylko przez nowe bloki, a budowa trwa od roku do kilku lat. Węgiel i gaz drożeją razem z surowcem, atom i OZE zależą głównie od kosztu kapitału, więc miks decyduje, co wstrząśnie ceną prądu.',
        example: () => { if (!hasEnergyState()) return 'Dane pojawią się po pierwszym kwartale gry.'; const mix = getEnergyMix(), total = Object.values(mix).reduce((a, b) => a + b, 0) || 1; return ENERGY_TYPE_IDS.map(type => `${ENERGY_TYPES[type].name} ${Math.round(mix[type] / total * 100)}%`).join(', ') + '.'; },
        quiz: [
            { q: 'Co zmienia miks energetyczny?', a: ['nowe bloki', 'kurs akcji spółek', 'wynik wyborów tego samego dnia'], c: 0 },
            { q: 'Który typ najsilniej reaguje na cenę surowca?', a: ['gaz', 'OZE', 'atom'], c: 0 },
            { q: 'Co najbardziej zwiększa koszt OZE?', a: ['wyższy koszt kapitału', 'droższy węgiel', 'droższy uran'], c: 0 }
        ]
    },
    cenaPradu: {
        title: 'Cena prądu', get icon() { return academyIcon('prad'); },
        text: 'Cena prądu to średnia kosztów typów elektrowni ważona ich udziałem w miksie. Przy niedoborze mocy rośnie jeszcze szybciej, a przy dużym niedoborze grozi blackout. Ustawa „Dostawcy energii” może ją ograniczyć albo obniżyć kosztem budżetu. Przemysł, Chemia, Motoryzacja, Budowlany i kolej płacą za zmianę ceny marżą, a producenci na niej zarabiają.',
        example: () => hasEnergyState() ? `Rezerwa mocy: ${Math.round((getEnergyReserve() - 1) * 100)}%.` : 'Dane pojawią się po pierwszym kwartale gry.',
        quiz: [
            { q: 'Co się dzieje z ceną przy niedoborze mocy?', a: ['rośnie', 'spada', 'nie zmienia się'], c: 0 },
            { q: 'Kto traci marżę, gdy prąd drożeje?', a: ['odbiorcy, np. Przemysł', 'wszystkie spółki po równo', 'tylko banki'], c: 0 },
            { q: 'Kto płaci za niższą cenę przy państwowych dostawcach?', a: ['budżet', 'producenci węgla', 'nikt'], c: 0 }
        ]
    },
    emisjeLimity: {
        title: 'Emisje i limity', get icon() { return academyIcon('emisje'); },
        text: 'Spółki emitują tyle, ile produkują, razy emisyjność sektora i typu elektrowni. Zanieczyszczenie kraju zmienia się wolno, a wysokie obniża zdrowie, przyrost ludności i przy poziomie krytycznym produkcję. Polityka klimatyczna ustala opłatę, a Urząd Energii i Ekologii mierzy emisje i od poziomu 2 pilnuje limitów. Bez pomiaru emisji nie widać, ale nadal działają.',
        example: () => hasEnergyState() && canSeeCountryEmissions() ? `Zanieczyszczenie: ${Math.round(society.energy.pollution)} na 100.` : 'Urząd nie mierzy jeszcze emisji.',
        quiz: [
            { q: 'Od którego poziomu UEiE działają limity?', a: ['od 2', 'od 0', 'od 5'], c: 0 },
            { q: 'Kto płaci opłatę za emisje najwięcej?', a: ['spółka o wysokiej emisyjności', 'każda po równo', 'tylko OZE'], c: 0 },
            { q: 'Na co idzie opłata za emisje?', a: ['na urząd i dopłaty do OZE', 'na dywidendy', 'na podatek dochodowy'], c: 0 }
        ]
    },
    poziomZycia: {
        title: 'Poziom życia', get icon() { return academyIcon('serce'); },
        text: 'Poziom życia to średnia 5 czynników: konsumpcji, zdrowia, bezpieczeństwa, edukacji i informacji. Wyższy przyciąga ludzi do kraju i przyspiesza przyrost ludności. Spadek w ciągu roku szkodzi rządzącym w wyborach. Zdrowie obniża zanieczyszczenie, a podnoszą je usługi publiczne i sektor Medycyna.',
        example: () => hasEnergyState() && society.energy.life ? `Teraz ${Math.round(society.energy.life)} na 100.` : 'Dane pojawią się po pierwszym kwartale gry.',
        quiz: [
            { q: 'Ile czynników tworzy poziom życia?', a: ['5', '2', '10'], c: 0 },
            { q: 'Co wyższy poziom życia robi z migracją?', a: ['przyciąga ludzi', 'wypycha ludzi', 'nic'], c: 0 },
            { q: 'Co obniża czynnik zdrowia?', a: ['zanieczyszczenie', 'wyższy kurs GIG', 'dywidendy'], c: 0 }
        ]
    },
    esg: {
        title: 'ESG', get icon() { return academyIcon('lisc'); },
        text: 'ESG to ścieżka spółki, która płaci raz i na stałe emituje mniej. Otwiera się przy silnym Urzędzie Energii i Ekologii, od poziomu 3. Niższe emisje to mniejsza opłata i mniejsze ryzyko kary, ale koszt przychodzi od razu. Dlatego warto policzyć, czy spółka odzyska te pieniądze w rozsądnym czasie.',
        example: () => { const s = stocks.find(x => x.esg && !x.isBankrupt); return s ? `${s.name} jest na ścieżce ESG.` : 'Żadna spółka nie weszła jeszcze na ścieżkę ESG.'; },
        quiz: [
            { q: 'Kiedy spółka płaci za ESG?', a: ['raz, na początku', 'co kwartał', 'po 10 latach'], c: 0 },
            { q: 'Od którego poziomu UEiE można wejść na ścieżkę?', a: ['od 3', 'od 0', 'od 5'], c: 0 },
            { q: 'Co się dzieje, gdy poziom urzędu później spadnie?', a: ['niższe emisje zostają', 'spółka traci ESG', 'spółka dostaje zwrot'], c: 0 }
        ]
    }
});
