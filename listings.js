// listings.js — 0.15.6 „Giełdy wejścia”: wymogi wejścia i utrzymania na GPW, rynek NewHorizons (NH, państwowy operator)
// i giełda prywatna (PRV). Rynki NH i PRV są wpisane w MARKET_OPERATOR_DEFS (finance.js, flaga `entry`), nie mają spółki-operatora,
// nie liczą się do limitu spółek krajowych (GPW), ale liczą się do łącznego sufitu (LISTING_TOTAL_CAP).
// Stan spółki (pola opcjonalne, zapis v15): market, marketSinceQ, belowReqQ. Progi z diagnozy plany/raporty/diagnoza_0.15.6.md.

const LISTING_REQUIREMENTS = {
    GPW: { cap: 80000, freeFloat: 0.30, profit: true },
    NH:  { cap: 24000, freeFloat: 0.20, profit: true, innovativeExempt: true },
    PRV: { cap: 5000,  freeFloat: 0.10, profit: false }
};
const LISTING_INNOVATIVE_SECTORS = ['Technologia', 'Medycyna', 'Badania', 'Gaming'];
const LISTING_MULT_FROM = 100;          // spółek krajowych: do tylu mnożnik wymogów GPW = 1,0
const LISTING_MULT_TO = 125;            // …a od tylu = LISTING_MULT_MAX (liniowo pomiędzy)
const LISTING_MULT_MAX = 1.5;
const LISTING_RETAIN_FACTOR = 0.5;      // utrzymanie na GPW: kapitalizacja ≥ 50% wymogu wejścia (z mnożnikiem)
const LISTING_BELOW_QUARTERS = 4;       // tyle kwartałów poniżej wymogu przed zejściem na NH
const LISTING_DEMOTE_PER_QUARTER = 2;   // najwyżej tyle zejść na kwartał (bez nagłego odpływu z GPW)
const LISTING_DEMOTE_PRICE_EFFECT = -0.05;
const NH_CAPACITY = 40;                 // spółek na NH (bez startupów)

/** Mnożnik wymogów GPW: 1,0 do 100 spółek krajowych, liniowo do 1,5 przy ≥ 125. */
function getListingRequirementMultiplier() {
    const domestic = typeof getListedCompanyCount === 'function' ? getListedCompanyCount() : 0;
    return 1 + (LISTING_MULT_MAX - 1) * Math.max(0, Math.min(1, (domestic - LISTING_MULT_FROM) / (LISTING_MULT_TO - LISTING_MULT_FROM)));
}

/** Wymogi wejścia na rynek (GPW z mnożnikiem; NH i PRV stałe). */
function getListingRequirements(marketId) {
    const base = LISTING_REQUIREMENTS[marketId] || LISTING_REQUIREMENTS.PRV;
    const mult = marketId === 'GPW' ? getListingRequirementMultiplier() : 1;
    return { ...base, cap: base.cap * mult, freeFloat: Math.min(0.5, base.freeFloat * mult), mult };
}

function isInnovativeCompany(stock) {
    return (stock?.sector || []).some(sector => LISTING_INNOVATIVE_SECTORS.includes(sector));
}

/** Czy spółka spełnia wymogi wejścia na rynek; `failed` wymienia niespełnione (cap, freeFloat, profit). Debiut startupu nie ma historii zysków (profit pomijany). */
function meetsListingRequirements(stock, marketId, { debut = false } = {}) {
    const req = getListingRequirements(marketId);
    const failed = [];
    if (getMarketCapValue(stock) < req.cap) failed.push('cap');
    const total = Math.max(1, Number(stock.totalShares) || 0);
    if (typeof getFreeFloatShares === 'function' && getFreeFloatShares(stock) / total < req.freeFloat) failed.push('freeFloat');
    if (req.profit && !(req.innovativeExempt && isInnovativeCompany(stock)) && !debut && (Number(stock.quarterlyEarnings) || 0) <= 0) failed.push('profit');
    return { ok: failed.length === 0, failed, req };
}

function getEntryMarketCount(marketId) {
    return stocks.filter(s => getStockMarket(s) === marketId && !s.isBankrupt && !s.assetType).length;
}

function hasEntryMarketSlot(marketId) {
    const capacity = marketId === 'NH' ? NH_CAPACITY : marketId === 'PRV' ? Math.max(3, Math.floor(PRV_SHARE_CAP * getTotalCompanyCount())) : Infinity;
    return getEntryMarketCount(marketId) < capacity && hasFreeTotalListingSlot();
}

/** Przeniesienie spółki na inny rynek (NH / PRV / GPW) z komunikatem; zwraca true, gdy przeniesiona. */
function moveStockToMarket(stock, marketId, reason, priceEffect = 0) {
    const from = getStockMarket(stock);
    if (from === marketId) return false;
    if (marketId === 'GPW') delete stock.market; else stock.market = marketId;
    stock.marketSinceQ = typeof macro === 'object' ? macro.quarter : 0;
    delete stock.belowReqQ;
    if (priceEffect) applyPriceEffect(stock.symbol, priceEffect, priceEffect > 0 ? 'positive' : 'negative', 'company');
    const text = `🔀 ${stock.name} (${stock.symbol}) przechodzi z ${getMarketLabel(from)} na ${getMarketLabel(marketId)}${reason ? ` — ${reason}` : ''}.`;
    logEvent(text, 'market');
    if (typeof pushNews === 'function') pushNews(text, stock.symbol);
    const held = (playerPortfolio?.[stock.symbol]?.shares || 0) > 0 || (playerWallet?.portfolio?.[stock.symbol]?.shares || 0) > 0;
    if (held && typeof addMail === 'function') addMail({ sender: 'PULS', subject: `🔀 ${stock.name}: zmiana rynku`, body: `${text}\n\nTwoje akcje zostają na koncie; zmienia się rynek notowań, jego wymogi i płynność.`, importance: 2, symbol: stock.symbol });
    return true;
}

/** Kandydat do zejścia z GPW: zwykła spółka krajowa na GPW, której państwo może zmienić rynek. */
function isDemotionCandidate(stock) {
    return getStockMarket(stock) === 'GPW' && hasListingMoveGuards(stock);
}

/** E1: co kwartał — spółki na GPW poniżej progu utrzymania zliczają kwartały; po LISTING_BELOW_QUARTERS schodzą na NH (zamiast upaść); gdy NH pełny — wykup jak przy wycofaniu. */
function processListingMaintenanceQuarterly() {
    const req = getListingRequirements('GPW');
    const floor = req.cap * LISTING_RETAIN_FACTOR;
    const due = [];
    for (const stock of stocks) {
        if (!isDemotionCandidate(stock)) { if (stock.belowReqQ) delete stock.belowReqQ; continue; }
        if (getMarketCapValue(stock) < floor) {
            stock.belowReqQ = (stock.belowReqQ || 0) + 1;
            if (stock.belowReqQ >= LISTING_BELOW_QUARTERS) due.push(stock);
        } else if (stock.belowReqQ) delete stock.belowReqQ;
    }
    due.sort((a, b) => getMarketCapValue(a) - getMarketCapValue(b));
    let moved = 0;
    for (const stock of due.slice(0, LISTING_DEMOTE_PER_QUARTER)) {
        const reason = `kapitalizacja poniżej progu utrzymania (${formatZl(floor, 0)}) od ${stock.belowReqQ} kw.`;
        try {
            if (hasEntryMarketSlot('NH')) { if (moveStockToMarket(stock, 'NH', reason, LISTING_DEMOTE_PRICE_EFFECT)) moved++; }
            else if (delistWithBuyout(stock) !== null) moved++; // NH pełny: wykup po cenie rynkowej, bez „duchów” posiadaczy
        } catch (error) { console.error(`[zejście z GPW] ${stock.symbol}:`, error); }
    }
    return moved;
}

// --- E2: NewHorizons (państwowy operator) — ryzyko, ograniczenia inwestorów, płynność ---
// Zmienność ×1,45 i szansa upadku ×2,5 (środek widełek planu 1,3–1,6 i 2–3), ale co kwartał szansa „przełomu” (większy potencjał wzrostu).
// Ograniczenia: boty wg osobowości, zarządcy botów wg stylu, gracz wg stanowiska (playerAccessLevel). PRV: reguły tej samej tabeli (E3).
const ENTRY_MARKET_RULES = {
    NH:  { volatility: 1.45, failure: 2.5, playerAccess: 2, blockedBots: ['calm', 'banker', 'dividend_chaser'], blockedManagers: ['cautious', 'dividend'] },
    PRV: { volatility: 1.2, failure: 1.5, playerAccess: 3, allowedBots: ['yolo_trader', 'reckless'], allowedManagers: ['aggressive', 'momentum'] }
};
const NH_BREAKTHROUGH_CHANCE = 0.04;    // co kwartał, dla spółki w dobrej kondycji
const NH_BREAKTHROUGH_RANGE = [0.15, 0.40];
const NH_MM_TURNOVER = 0.003;           // minimalny obrót kwartalny = 0,3% kapitalizacji (popyt zastępczy państwa)
const NH_MM_MAX_STOCKS = 15;            // ile spółek na kwartał państwo wspiera

function getMarketVolatilityFactor(stock) {
    return ENTRY_MARKET_RULES[getStockMarket(stock)]?.volatility || 1;
}

function getMarketFailureFactor(stock) {
    return ENTRY_MARKET_RULES[getStockMarket(stock)]?.failure || 1;
}

function isPersonalityAllowed(rules, kind, personality) {
    const allowed = rules[`allowed${kind}`], blocked = rules[`blocked${kind}`];
    if (allowed) return allowed.includes(personality);
    return !(blocked || []).includes(personality);
}

/** Czy bot (osobowość ai.personality) może kupować akcje tej spółki. */
function canBotInvestIn(ai, stock) {
    const rules = ENTRY_MARKET_RULES[getStockMarket(stock)];
    return !rules || isPersonalityAllowed(rules, 'Bots', ai?.personality);
}

/** Czy zarządca bota (manager.personality: aggressive, cautious, …) może kupować akcje tej spółki. */
function canManagerInvestIn(manager, stock) {
    const rules = ENTRY_MARKET_RULES[getStockMarket(stock)];
    return !rules || isPersonalityAllowed(rules, 'Managers', manager?.personality);
}

/** Czy gracz ma stanowisko dające dostęp do rynku spółki (NH od poziomu 2, giełda prywatna od 3). */
function canPlayerTradeMarket(stock) {
    const rules = ENTRY_MARKET_RULES[getStockMarket(stock)];
    return !rules || playerAccessLevel >= rules.playerAccess;
}

/** E2: co kwartał na NH — „przełomy” zdrowych spółek i minimalny obrót (market maker państwa: popyt zastępczy w limicie spółek i tylko przy dodatnim skarbie). */
function processNewHorizonsQuarterly() {
    let supported = 0;
    for (const stock of stocks) {
        if (getStockMarket(stock) !== 'NH' || stock.isBankrupt || stock.assetType) continue;
        if ((Number(stock.financialHealth) || 0) >= 1 && Math.random() < NH_BREAKTHROUGH_CHANCE) {
            const gain = getRandomInRange(...NH_BREAKTHROUGH_RANGE);
            applyPriceEffect(stock.symbol, gain, 'positive', 'company');
            logEvent(`🚀 ${stock.name} (${stock.symbol}) na NewHorizons notuje przełom: kurs +${(gain * 100).toFixed(0)}%.`, 'market');
        }
        const floor = getMarketCapValue(stock) * NH_MM_TURNOVER;
        if (governmentTreasury > 0 && supported < NH_MM_MAX_STOCKS && (Number(stock.lastTurnover) || 0) < floor) { stock.lastTurnover = floor; supported++; }
    }
    return supported;
}

// --- E3: ścieżka startupu i giełda prywatna ---
// Debiut: kapitalizacja ≥ wymóg GPW → GPW (gdy brak miejsca: czeka w inkubatorze); ≥ wymóg NH → NH; poniżej → giełda prywatna.
// NH → po NH_PROMOTE_MIN_AGE kw.: awans na GPW (spełnia wymogi), a słabe spółki: giełda prywatna albo firma prywatna (wykup).
// Giełda prywatna: szansa startu oszustwa ×5 względem GPW (kwartalnie), wykrycie później (4–10 kw.), mocniejszy spadek po ujawnieniu,
// upadek ×1,5 (ENTRY_MARKET_RULES), pojemność ≤ 10% spółek, gracz najwyżej 20% wartości funduszu.
const LISTING_RULES = { debutRouting: true };   // testy starsze od 0.15.6 wyłączają w resetWorld (debiut zawsze na GPW)
const PRV_SHARE_CAP = 0.10;
const PRV_FRAUD_FACTOR = 5;
const PRV_DETECTION_RANGE = [4, 10];
const PRV_REVEAL_PENALTY = 0.15;
const PRV_PLAYER_LIMIT = 0.20;
const NH_PROMOTE_MIN_AGE = 8;           // kwartały na NH przed awansem / rozwidleniem
const NH_PROMOTE_CHANCE = 0.35;         // co kwartał dla spółki spełniającej wymogi GPW
const NH_FORK_CHANCE = 0.25;            // co kwartał dla słabej spółki NH
const NH_FORK_PRIVATE_SHARE = 0.4;      // z rozwidlenia: firma prywatna (wykup); reszta — giełda prywatna

function isDebutRoutingActive() {
    return LISTING_RULES.debutRouting;
}

/** Rynek debiutu startupu o danej kapitalizacji; null = czeka w inkubatorze (brak miejsca). */
function chooseDebutMarket(cap) {
    if (cap >= getListingRequirements('GPW').cap) return hasFreeListingSlot() ? 'GPW' : null;
    if (cap >= getListingRequirements('NH').cap) return hasEntryMarketSlot('NH') ? 'NH' : null;
    return hasEntryMarketSlot('PRV') ? 'PRV' : null;
}

function getMarketFraudFactor(stock) {
    return getStockMarket(stock) === 'PRV' ? PRV_FRAUD_FACTOR : 1;
}

function getFraudDetectionRange(stock) {
    return getStockMarket(stock) === 'PRV' ? PRV_DETECTION_RANGE : [3, 7];
}

function getMarketRevealPenalty(stock) {
    return getStockMarket(stock) === 'PRV' ? PRV_REVEAL_PENALTY : 0;
}

/** Limit gracza na giełdzie prywatnej: tekst odmowy albo null. */
function checkPrivateMarketLimit(stock, value) {
    if (getStockMarket(stock) !== 'PRV') return null;
    const held = Object.entries(playerPortfolio || {}).reduce((sum, [symbol, holding]) => {
        const other = stocks.find(s => s.symbol === symbol);
        return sum + (other && getStockMarket(other) === 'PRV' ? (holding.shares || 0) * other.price : 0);
    }, 0);
    const nav = typeof getFundAssets === 'function' ? getFundAssets() : 0; // aktywa funduszu (nie NAV na jednostkę)
    if (!(nav > 0) || held + value <= nav * PRV_PLAYER_LIMIT) return null;
    return `Giełda prywatna: wysokie ryzyko oszustwa i słaby nadzór — fundusz może tam trzymać najwyżej ${PRV_PLAYER_LIMIT * 100}% wartości (${formatZl(nav * PRV_PLAYER_LIMIT, 0)}).`;
}

/** E3: co kwartał — spółki NH po 8 kw.: awans na GPW albo (słabe) giełda prywatna / firma prywatna. */
function processNhPathQuarterly() {
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    const result = { promoted: 0, toPrivateMarket: 0, wentPrivate: 0 };
    for (const stock of stocks.slice()) {
        if (getStockMarket(stock) !== 'NH' || !hasListingMoveGuards(stock, true)) continue;
        if (stock.marketSinceQ === undefined) stock.marketSinceQ = quarter;
        if (quarter - stock.marketSinceQ < NH_PROMOTE_MIN_AGE) continue;
        if (meetsListingRequirements(stock, 'GPW').ok) {
            if (hasFreeListingSlot() && Math.random() < NH_PROMOTE_CHANCE && moveStockToMarket(stock, 'GPW', 'awans na główny parkiet: spełnia wymogi GPW', 0.03)) result.promoted++;
            continue;
        }
        const weak = getMarketCapValue(stock) < getListingRequirements('NH').cap * LISTING_RETAIN_FACTOR || (Number(stock.financialHealth) || 0) <= 0;
        if (!weak || Math.random() >= NH_FORK_CHANCE) continue;
        if (Math.random() >= NH_FORK_PRIVATE_SHARE && hasEntryMarketSlot('PRV')) {
            if (moveStockToMarket(stock, 'PRV', 'słaba spółka szuka łagodniejszych wymogów (większe ryzyko oszustwa)', -0.03)) result.toPrivateMarket++;
        } else if (delistWithBuyout(stock, 'wychodzi z giełdy i zostaje firmą prywatną') !== null) result.wentPrivate++;
    }
    return result;
}

/** Jeden kwartalny punkt wejścia modułu (main.js). */
function processListingsQuarterly() {
    processListingMaintenanceQuarterly();
    processNhPathQuarterly();
    processNewHorizonsQuarterly();
}
