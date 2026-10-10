// defense.js — Zbrojeniówka i Gwardia (wersja 0.11.4 „Ciemna Strefa”)
//
// Sektor „Obronność”: 4 spółki na Giełdzie Złotej i Platynowej. Targi zbrojeniowe raz w roku gry
// (nagroda „Innowacja roku”), kontrakty państwowe zależne od partii rządzącej, drobny bonus od siły policji,
// spółki w świetnej kondycji dotują policję. Mafia ich nie kupuje (isMafiaImmune). Prezesi tych spółek
// mogą mieć cechy: Emerytowany policjant, Generał, Były wojskowy.
// Fundusz „Gwardia”: bot, który nie współpracuje z mafią, lubi zbrojeniówkę i klasyczne sektory; jego duże
// pakiety chronią spółki przed ludźmi mafii w zarządach. Bez dochodu „z powietrza”.

const DEFENSE_SECTOR = 'Obronność';
const DEFENSE_COMPANIES = [
    { name: 'Polska Zbrojownia', symbol: 'PZB', exchange: 'PLATINUM', price: [1800, 2600] },
    { name: 'Orzeł Defence', symbol: 'ORZD', exchange: 'PLATINUM', price: [1600, 2200] },
    { name: 'Grom Systems', symbol: 'GROM', exchange: 'GOLD', price: [600, 1200] },
    { name: 'Husaria Arms', symbol: 'HUSA', exchange: 'GOLD', price: [450, 900] }
];
const DEFENSE_CEO_TRAITS = ['emerytowany_policjant', 'general', 'byly_wojskowy'];
const GUARD_LIKED_SECTORS = [DEFENSE_SECTOR, 'Energia', 'Przemysł', 'Bankowość', 'Żywność', 'Transport'];
const GUARD_DISLIKED_SECTORS = ['Technologia', 'Gaming', 'Badania'];

function isDefenseCompany(stock) {
    return Boolean(stock?.sector?.includes(DEFENSE_SECTOR));
}

/** Cecha „mundurowa” dla prezesa spółki zbrojeniowej (40% szans). */
function maybeGiveDefenseTrait(stock) {
    if (!stock?.ceo || Math.random() > 0.4) return;
    const id = getRandomElement(DEFENSE_CEO_TRAITS);
    if (stock.ceo.traits?.some(t => t.id === id)) return;
    stock.ceo.traits = [...(stock.ceo.traits || []), { id, name: ceoTraits[id].name, rarity: 'hidden' }];
}

/** Nowa gra i migracja: 4 spółki zbrojeniowe + fundusz Gwardia. */
function initDefenseSector() {
    for (const def of DEFENSE_COMPANIES) {
        if (stocks.some(s => s.defenseId === def.symbol)) continue;
        const stock = createListedCompany({ name: def.name, symbol: uniqueSymbol(def.symbol), sector: [DEFENSE_SECTOR], price: getRandomInRange(...def.price), totalShares: getRandomIntInRange(150, 300) * 1000, exchange: def.exchange });
        stock.defenseId = def.symbol;
        stock.financialHealth = getRandomIntInRange(1, 3);
        maybeGiveDefenseTrait(stock);
        stocks.push(stock);
    }
    spawnGuardFund();
}

function getGuardFund() {
    return aiCompetitors.find(ai => ai.isGuard) || null;
}

function spawnGuardFund() {
    if (getGuardFund()) return getGuardFund();
    const richest = Math.max(...aiCompetitors.filter(ai => !ai.isMafia).map(ai => ai.cash || 0), 100000);
    const guard = { id: 'guard_fund', name: 'Fundusz „Gwardia”', cash: Math.round(richest * 1.2), portfolio: {}, loans: [], personality: 'guard', isGuard: true, accessLevel: 7, hasTBillAccess: false, tBills: [], creditScore: 100 };
    aiCompetitors.push(guard);
    return guard;
}

/** Gwardia: kupuje zbrojeniówkę i klasyki, sprzedaje nowoczesne sektory. */
function runGuardFundQuarterly() {
    const guard = getGuardFund();
    if (!guard) return;
    for (const [symbol, holding] of Object.entries(guard.portfolio)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock && stock.sector?.some(sec => GUARD_DISLIKED_SECTORS.includes(sec)) && holding.shares > 0) aiSellStock(guard, symbol, holding.shares);
    }
    const liked = stocks.filter(s => !s.assetType && !s.isBankrupt && s.sector?.some(sec => GUARD_LIKED_SECTORS.includes(sec)) && !s.sector?.some(sec => GUARD_DISLIKED_SECTORS.includes(sec)) && getAvailableShares(s) > 0);
    const picks = [...liked.filter(isDefenseCompany), ...liked.sort(() => Math.random() - 0.5)].slice(0, 3);
    for (const stock of picks) {
        const quantity = Math.floor(Math.min(getAvailableShares(stock), stock.totalShares * 0.01, guard.cash * 0.05 / Math.max(0.01, stock.price)));
        if (quantity > 0) aiBuyStock(guard, stock.symbol, quantity);
    }
}

/** Duży pakiet Gwardii (≥ 5%) chroni spółkę przed ludźmi mafii. */
function isGuardProtected(stock) {
    const guard = getGuardFund();
    return Boolean(guard && (guard.portfolio[stock.symbol]?.shares || 0) / Math.max(1, stock.totalShares) >= 0.05);
}

// =================================================================================
// CO KWARTAŁ
// =================================================================================

function processDefenseQuarterly() {
    const companies = stocks.filter(s => isDefenseCompany(s) && !s.isBankrupt);
    const police = typeof getInstitutionEffectiveness === 'function' ? getInstitutionEffectiveness(oversight.police) : 0.3;

    // Kontrakty państwowe: częściej przy rządzie „państwowym” i w kampanii wyborczej.
    const stateParty = typeof getRulingParty === 'function' && getRulingParty() === RULING_PARTIES.state;
    for (const stock of companies) {
        if (Math.random() < (stateParty ? 0.3 : 0.15) + (macro.election?.campaign ? 0.1 : 0)) {
            const contract = Math.round(Math.min(Math.max(0, governmentTreasury) * 0.002, getMarketCapValue(stock) * 0.02));
            if (contract > 0) {
                governmentTreasury -= contract;
                adjustCompanyCash(stock, contract);
                adjustBalanceSheet(stock, { assets: contract, retainedEarnings: contract });
                logEvent(`🛡️ ${stock.name} podpisuje kontrakt z MON na ${formatZl(contract, 0)}.`, 'state');
            }
        }
        // Spółka w świetnej kondycji dotuje policję.
        const earnings = Number(stock.quarterlyEarnings) || 0;
        if (earnings > 0 && stock.financialHealth >= 3 && Math.random() < 0.2 && typeof fundInstitution === 'function') {
            const donation = Math.min(Math.max(0, stock.cash) * 0.05, earnings * 0.01);
            adjustCompanyCash(stock, -donation);
            adjustBalanceSheet(stock, { assets: -donation, retainedEarnings: -donation });
            fundInstitution(oversight.police, donation);
            logEvent(`🚓 ${stock.name} przekazuje ${formatZl(donation, 0)} na wyposażenie policji.`, 'state');
        }
        // Cechy prezesów wpływają na korupcję i mafię.
        if (hasCeoTrait(stock, 'emerytowany_policjant')) { oversight.corruption = Math.max(0, oversight.corruption - 1); if (typeof addMafiaInfluence === 'function') addMafiaInfluence(-2); }
        if (hasCeoTrait(stock, 'general') && typeof addMafiaInfluence === 'function') addMafiaInfluence(-3);
        if (!stock.ceo?.traits?.some(t => DEFENSE_CEO_TRAITS.includes(t.id)) && Math.random() < 0.05) maybeGiveDefenseTrait(stock);
    }

    // Targi zbrojeniowe raz w roku gry.
    if (companies.length && macro.quarter % 4 === 2) {
        const winner = getRandomElement(companies);
        for (const stock of companies) applyPriceEffect(stock.symbol, stock === winner ? 0.06 : 0.01, 'positive', 'company');
        logEvent(`🎖️ Targi zbrojeniowe: nagrodę „Innowacja roku” zdobywa ${winner.name}!`, 'company');
    }
    runGuardFundQuarterly();
    if (!getGuardFund()) spawnGuardFund();
    if (companies.length < DEFENSE_COMPANIES.length) initDefenseSector(); // odtwarza brakujące (np. po bankructwie — nowy gracz w branży)
}

/** Bonus wzrostu spółek zbrojeniowych od siły policji (computeQuarterResults). */
function getDefenseGrowthBonus(stock) {
    if (!isDefenseCompany(stock) || typeof getInstitutionEffectiveness !== 'function') return 0;
    return getInstitutionEffectiveness(oversight.police) * 0.004;
}
