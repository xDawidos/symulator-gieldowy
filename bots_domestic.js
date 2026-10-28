// =================================================================================
// bots_domestic.js: 0.16.3 G14b. Dwa polskie boty z własną logiką (bez makeAiDecision): Graham i Wilk.
// Boty mają flagę `customLogic` ('graham' | 'wolf'): runAllAi (main.js) woła runCustomBot zamiast makeAiDecision.
// Graham: cierpliwy inwestor wartości — kupuje ≥ 30% poniżej wartości godziwej, niskie C/Z i C/WK, niski dług, wieloletnie dywidendy;
//         w bessie kupuje chętniej, sprzedaje przy osiągnięciu wartości albo gdy spółka okazuje się pułapką wartości.
// Wilk:   „pump and dump” małych spółek — kupuje w kilku rundach, robi rozgłos w mediach, wyprzedaje na szczycie; ryzyko kontroli KNF.
// =================================================================================

const GRAHAM_RULES = {
    id: 'ai9', name: 'Beniamin „Margines” Grahamski', cash: 12000,
    discount: 0.30, maxPe: 12, maxPb: 1.5, maxDebt: 0.5, minDividendQuarters: 4,
    sellAt: 0.95, trapHealth: -2, spend: 0.25, buyChance: 0.06, bearBuyChance: 0.25
};
const WOLF_RULES = {
    smallCapShare: 0.35, buyRuns: 3, spend: 0.3, startChance: 0.10, hype: [0.06, 0.12], dump: [0.05, 0.10],
    cooldownQ: 4, knfChance: 0.12, knfFine: 0.10, maxStakeShare: 0.4
};

function getGraham() { return aiCompetitors.find(ai => ai.id === GRAHAM_RULES.id) || null; }
function getWolf() { return aiCompetitors.find(ai => ai.customLogic === 'wolf') || null; }

/** Czy spółka spełnia kryteria Grahama: dyskonto do wartości godziwej, tanie wskaźniki, niski dług, wieloletnie dywidendy. */
function isGrahamCandidate(stock) {
    if (!stock || stock.assetType || stock.isBankrupt || stock.isTradeLocked || !(stock.price > 0)) return false;
    const fair = getDisplayedFairValue(stock), f = stock.fundamentals || {};
    if (!(fair > 0) || stock.price > fair * (1 - GRAHAM_RULES.discount)) return false;
    if (!(f.peRatio > 0 && f.peRatio <= GRAHAM_RULES.maxPe)) return false;
    if (f.pbRatio !== null && f.pbRatio !== undefined && f.pbRatio > GRAHAM_RULES.maxPb) return false;
    const bs = stock.balanceSheet || {};
    if ((Number(bs.assets) || 0) > 0 && (Number(bs.liabilities) || 0) / bs.assets > GRAHAM_RULES.maxDebt) return false;
    return (stock.dividendHistory || []).length >= GRAHAM_RULES.minDividendQuarters;
}

function runGrahamBot(ai) {
    for (const [symbol, holding] of Object.entries(ai.portfolio)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (!stock || holding.assetType === 'Startup') continue;
        const fair = getDisplayedFairValue(stock), free = holding.shares - (holding.lockedShares || 0);
        if (free > 0 && ((fair > 0 && stock.price >= fair * GRAHAM_RULES.sellAt) || (Number(stock.financialHealth) || 0) <= GRAHAM_RULES.trapHealth)) {
            aiSellStock(ai, symbol, free); // wartość osiągnięta albo pułapka wartości
            return 'sell';
        }
    }
    const bear = (getMarketRegime('home')?.premium || 0) < 0;
    if (Math.random() >= (bear ? GRAHAM_RULES.bearBuyChance : GRAHAM_RULES.buyChance)) return null; // cierpliwy; w bessie kupuje chętniej
    const candidates = stocks.filter(isGrahamCandidate).sort((a, b) => a.price / getDisplayedFairValue(a) - b.price / getDisplayedFairValue(b));
    const stock = candidates[0];
    if (!stock) return null;
    const qty = Math.floor(ai.cash * GRAHAM_RULES.spend / stock.price);
    if (qty < 1) return null;
    const before = ai.portfolio[stock.symbol]?.shares || 0;
    aiBuyStock(ai, stock.symbol, qty);
    return (ai.portfolio[stock.symbol]?.shares || 0) > before ? 'buy' : null;
}

function runWolfBot(ai) {
    const q = macro.quarter, w = ai.wolf || (ai.wolf = { phase: 'idle', symbol: null, runs: 0, cooldownQ: -1 });
    const stock = w.symbol ? stocks.find(s => s.symbol === w.symbol) : null;
    if (w.phase !== 'idle' && (!stock || stock.isBankrupt)) { w.phase = 'idle'; w.symbol = null; return null; }
    if (w.phase === 'idle') {
        if (q < w.cooldownQ || Math.random() >= WOLF_RULES.startChance) return null;
        const pool = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.isTradeLocked && !s.isStateOwned && s.price > 0 && getAvailableShares(s) > 0)
            .sort((a, b) => getMarketCapValue(a) - getMarketCapValue(b));
        const small = pool.slice(0, Math.max(1, Math.floor(pool.length * WOLF_RULES.smallCapShare)));
        const target = small.length ? getRandomElement(small) : null;
        if (!target) return null;
        Object.assign(w, { phase: 'accumulate', symbol: target.symbol, runs: 0 });
        return 'start';
    }
    if (w.phase === 'accumulate') {
        const maxQty = Math.floor(stock.totalShares * WOLF_RULES.maxStakeShare) - (ai.portfolio[w.symbol]?.shares || 0);
        const qty = Math.min(Math.floor(ai.cash * WOLF_RULES.spend / stock.price), maxQty);
        if (qty >= 1) aiBuyStock(ai, w.symbol, qty);
        if (++w.runs >= WOLF_RULES.buyRuns) w.phase = 'hype';
        return 'buy';
    }
    if (w.phase === 'hype') { // rozgłos w mediach: kurs skacze, a Wilk wyprzedaje
        const jump = getRandomInRange(...WOLF_RULES.hype);
        if (typeof pushNews === 'function') pushNews(`📣 Media huczą o ${stock.name}: „okazja życia” — kurs rośnie`, stock.symbol);
        applyPriceEffect(stock.symbol, jump, 'positive', 'market');
        w.phase = 'dump';
        return 'hype';
    }
    if (w.phase === 'dump') {
        const held = ai.portfolio[w.symbol]?.shares || 0, free = held - (ai.portfolio[w.symbol]?.lockedShares || 0);
        if (free > 0) aiSellStock(ai, w.symbol, Math.max(1, Math.ceil(free / 2)));
        if ((ai.portfolio[w.symbol]?.shares || 0) <= (ai.portfolio[w.symbol]?.lockedShares || 0)) {
            applyPriceEffect(w.symbol, -getRandomInRange(...WOLF_RULES.dump), 'negative', 'market'); // po wyprzedaży kurs wraca w dół
            if (Math.random() < WOLF_RULES.knfChance) { // ciemna strefa: kontrola KNF
                const fine = Math.min(ai.cash, ai.cash * WOLF_RULES.knfFine);
                ai.cash -= fine; governmentTreasury += fine;
                logEvent(`🕵️ KNF bada manipulację kursem ${stock.name} — ${ai.name} płaci karę ${fine.toFixed(0)} PLN.`, 'review');
            }
            Object.assign(w, { phase: 'idle', symbol: null, runs: 0, cooldownQ: q + WOLF_RULES.cooldownQ });
            return 'dump';
        }
        return 'sell';
    }
    return null;
}

function runCustomBot(ai) {
    if (ai.customLogic === 'graham') return runGrahamBot(ai);
    if (ai.customLogic === 'wolf') return runWolfBot(ai);
    return null;
}
