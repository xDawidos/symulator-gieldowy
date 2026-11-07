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
    rateCost: 8,                 // +1 pp stopy to +8% kosztu kapitałowej części ceny
    shortagePremium: 1.5, pass: 0.6, producerPrice: 0.5, producerUtil: 0.5,
    targetReserve: 1.08, buildChance: 0.25, blockShare: 0.03, blockOwnMax: 0.30, blockCostQuarters: 6, minCashShare: 0.3,
    buildQuarters: { coal: [6, 10], gas: [4, 8], oze: [3, 6] },
    catalogPower: { energy_plant: 0.010, wind_farm: 0.006, solar_park: 0.004 }, // udział mocy kraju z budynku z katalogu
    blackoutAt: 0.06, blackoutChance: 0.25, blackoutCooldown: 8, blackoutCut: 0.03, blackoutMood: 3,
    municipalAfter: 6, municipalMax: 3, municipalBudget: 150000, municipalShare: 0.02,
    stateProjectAt: 1.02, stateProjectChance: 0.15,
    contractCost: 0.25, depositChance: 0.45, depositFactor: [1.08, 1.20], depositQuarters: [8, 16], siteCost: 0.8, siteTime: 0.75,
    techCost: 0.9, techGain: 0.03, aiContractChance: 0.012
};
const ENERGY_CONTRACTS = {
    deposit: { name: 'Poszukiwanie nowych złóż', specialty: 'geology', quarters: [2, 4] },
    site:    { name: 'Szukanie działki pod inwestycję', specialty: 'geology', quarters: [1, 2] },
    tech:    { name: 'Inwestowanie w najnowsze technologie', specialty: null, quarters: [2, 4] }
};
const DEPOSIT_COMMODITIES = ['oil', 'coal', 'gas'];
// 0.17.2 E3: ustawy. Polityka: bonus wybranego typu. Dostawcy: limit ceny albo dopłata budżetu.
const ENERGY_POLICY_TYPES = [null, 'coal', 'gas', 'nuclear', 'oze'];
const ENERGY_LAW_RULES = { policyMargin: 0.005, policyStability: 0.99, mixedCap: 1.15, statePrice: 0.92 };

// Projekty państwa: przetargi jak infrastruktura S5, moc trafia do państwowej spółki tego typu.
Object.assign(INFRA_TYPES, {
    plant_coal: { name: 'Elektrownia węglowa', energy: 'coal', mode: null, gain: 0, power: 0.04, cost: 3_000_000, quarters: [8, 12], limit: 1 },
    plant_gas:  { name: 'Elektrownia gazowa', energy: 'gas', mode: null, gain: 0, power: 0.04, cost: 2_400_000, quarters: [6, 10], limit: 3 },
    plant_oze:  { name: 'Farma OZE', energy: 'oze', mode: null, gain: 0, power: 0.03, cost: 2_000_000, quarters: [4, 8], limit: 4 }
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
        if (stock.power.oze) mix.oze += stock.power.oze;
    }
    if (typeof municipalCompanies !== 'undefined') for (const company of municipalCompanies) if (company.power) mix[company.power.type] += company.power.capacity;
    return mix;
}
function getEnergyCapacity(e = society.energy) { return Object.values(getEnergyMix(e)).reduce((sum, value) => sum + value, 0); }

function getRawEnergyPrice(e) {
    const mix = getEnergyMix(e), total = Object.values(mix).reduce((sum, value) => sum + value, 0);
    return total > 0 ? ENERGY_TYPE_IDS.reduce((sum, type) => sum + mix[type] / total * getEnergyTypeCost(type, e), 0) : 1;
}

/** Stan startowy: moc spółek z przychodu segmentu Energia, skala tak, by kraj miał startCapacity MW. */
function initEnergyState() {
    const e = createEnergyState();
    const producers = stocks.filter(stock => !stock.isBankrupt && !stock.assetType && getPowerSegment(stock));
    const output = stock => getPowerTypeForStock(stock) === 'nuclear' ? 0 : getStockRevenue(stock) * getPowerSegment(stock).share;
    const total = producers.reduce((sum, stock) => sum + output(stock), 0);
    e.scale = total > 0 ? ENERGY_RULES.startCapacity / total : 0;
    for (const stock of producers) stock.power = { type: getPowerTypeForStock(stock), capacity: Math.round(output(stock) * e.scale) };
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
    return e.demand0 * ((1 - ENERGY_RULES.householdShare) * e.activity + ENERGY_RULES.householdShare * household);
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
    return { revenueFactor, marginAdj };
}

// ---------------------------------------------------------------------------------
// Budowa bloków spółek
// ---------------------------------------------------------------------------------
function getPowerBlockSize(stock, e = society.energy) {
    const own = Number(stock.power?.capacity) || 0, national = e.capacity * ENERGY_RULES.blockShare;
    return Math.max(1, Math.round(own > 0 ? Math.min(national, Math.max(own * ENERGY_RULES.blockOwnMax, national * 0.25)) : national));
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
function startPowerBlock(stock) {
    if (!canStartPowerBlock(stock)) return null;
    const e = ensureEnergy(), add = getPowerBlockSize(stock, e), cost = getPowerBlockCost(stock, add, e);
    const quarters = Math.max(1, Math.round(getRandomIntInRange(...ENERGY_RULES.buildQuarters[stock.power.type]) * (stock.power.site ? ENERGY_RULES.siteTime : 1)));
    stock.power.build = { add, cost, spent: 0, quarters, dueQ: getEnergyQuarter() + quarters };
    stock.power.site = false;
    logEvent(`⚡ ${stock.name} rozpoczyna budowę bloku ${add} MW (${ENERGY_TYPES[stock.power.type].name.toLowerCase()}, ok. ${quarters} kw., koszt ${formatZl(cost, 0)}).`, 'company');
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
    else stock.power.oze = (Number(stock.power.oze) || 0) + add;
    if (own > 0 && stock.fundamentals) stock.fundamentals.revenue *= 1 + share * add / own;
    society.energy.stats.blocks++;
}
function finishPowerBlock(stock) {
    const build = stock.power.build;
    stock.power.build = null;
    addStockPower(stock, build.add);
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
    return stock.power?.type === 'oze' || stock.power?.type === 'nuclear';
}
function getEnergyContractCost(stock) { return Math.round(getStockRevenue(stock) * ENERGY_RULES.contractCost); }
/** Geolog: najlepsza firma z 3 najtańszych ofert. Technologie płatne do instytutu badawczego (istniejący system R&D). */
function pickEnergyContractor(kind) {
    const specialty = ENERGY_CONTRACTS[kind].specialty;
    if (!specialty) return stocks.find(stock => stock.assetType === 'ResearchInstitute' && !stock.isBankrupt) || null;
    ensureSubcontractorRegistry();
    return [...getSubcontractorsBySpecialty(specialty)].sort((a, b) => a.priceFactor - b.priceFactor).slice(0, 3).sort((a, b) => b.quality - a.quality)[0] || null;
}
function orderEnergyContract(stock, kind) {
    if (!canOrderEnergyContract(stock, kind)) return null;
    const def = ENERGY_CONTRACTS[kind], contractor = pickEnergyContractor(kind), cost = getEnergyContractCost(stock);
    ensureCompanyCash(stock, cost, `Kredyt na zlecenie: ${def.name}`);
    adjustCompanyCash(stock, -cost);
    adjustBalanceSheet(stock, { assets: -cost, retainedEarnings: -cost });
    if (contractor?.symbol) { adjustCompanyCash(contractor, cost); adjustBalanceSheet(contractor, { assets: cost, retainedEarnings: cost }); }
    else if (contractor) { contractor.cash = (Number(contractor.cash) || 0) + cost; contractor.hires = (Number(contractor.hires) || 0) + 1; contractor.contractsCompleted = (Number(contractor.contractsCompleted) || 0) + 1; }
    if (typeof coverNegativeCash === 'function') coverNegativeCash(stock);
    stock.energyOrder = { kind, dueQ: getEnergyQuarter() + getRandomIntInRange(...def.quarters) };
    ensureEnergy().stats.contracts++;
    return stock.energyOrder;
}
function settleEnergyContract(stock, roll = Math.random()) {
    const order = stock.energyOrder, quarter = getEnergyQuarter();
    stock.energyOrder = null;
    if (order.kind === 'site') { if (stock.power) stock.power.site = true; return true; }
    if (order.kind === 'tech') {
        if (stock.power) {
            stock.power.techCost = (Number(stock.power.techCost) || 1) * ENERGY_RULES.techCost;
            const add = Math.round((Number(stock.power.capacity) || 0) * ENERGY_RULES.techGain);
            if (add > 0) addStockPower(stock, add);
        }
        return true;
    }
    if (roll >= ENERGY_RULES.depositChance) { if (typeof logEvent === 'function') logEvent(`🪨 ${stock.name}: geolodzy nie znaleźli nowego złoża.`, 'company'); return false; }
    stock.deposit = { factor: +getRandomInRange(...ENERGY_RULES.depositFactor).toFixed(3), untilQ: quarter + getRandomIntInRange(...ENERGY_RULES.depositQuarters) };
    society.energy.stats.deposits++;
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
    const open = getInfraOpenTypes().filter(type => INFRA_TYPES[type].energy);
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
    for (const stock of stocks) if (stock.workforce) stock.workforce.satisfaction = clampValue(stock.workforce.satisfaction - ENERGY_RULES.blackoutMood, 0, 100);
    publishEnergyNews('🔌 Blackout: zużycie przekroczyło moc kraju, fabryki stoją, a ludzie są wściekli.', '🔌 Blackout w kraju', 2);
}
function maybeBlackout(e) {
    const quarter = getEnergyQuarter();
    if (getEnergyShortage(e) >= ENERGY_RULES.blackoutAt && quarter - e.blackoutQ >= ENERGY_RULES.blackoutCooldown && Math.random() < ENERGY_RULES.blackoutChance) triggerBlackout(e, quarter);
}

/** Kwartał energetyki: zużycie, moc, cena, budowy, zlecenia, nowe spółki, blackout. */
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
    return e;
}
