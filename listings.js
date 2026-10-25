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
    return getEntryMarketCount(marketId) < (marketId === 'NH' ? NH_CAPACITY : Infinity) && hasFreeTotalListingSlot();
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

/** Jeden kwartalny punkt wejścia modułu (main.js). */
function processListingsQuarterly() {
    processListingMaintenanceQuarterly();
}
