// =================================================================================
// 0.17 S3: GIEŁDA TOWAROWA — kontrakty terminowe na silniku depozytu (forex.js, rynek 'commodities')
// =================================================================================
// Seria kwartalna: kontrakt zapada na koniec kwartału (np. OIL-R3Q2 = Rok 3, kw. 2). Cena kontraktu (USD):
//   F = M^a · P^(1−a) · (1 + (r_USD + c) · T),  a = 1 − (1 − θ)^(kwartały do zapadalności)
// — oczekiwany powrót ceny do średniej jest już w cenie kontraktu (backwardation nad średnią, contango pod), więc
// „kup nisko i czekaj” nie daje darmowego zysku. Wycena i rozliczenie w walucie bazowej po kursie USD.

const COMMODITY_CODES = { gold: 'GOLD', oil: 'OIL', gas: 'GAS', coal: 'COAL', metals: 'MET', grain: 'GRN', uranium: 'URA' };
const COMMODITY_MARKET = {
    leverage: { gold: 10, oil: 5, metals: 5, grain: 5, gas: 3, coal: 3, uranium: 3 },          // decyzja 11
    carry: { gold: 0.005, oil: 0.03, gas: 0.06, coal: 0.02, metals: 0.015, grain: 0.05, uranium: 0.01 }, // koszt przechowania rocznie
    entrySpread: 0.003,
    series: 4,           // 4 zapadalności naprzód
    minWeeksLeft: 2,     // seria bieżącego kwartału znika z oferty na 2 tygodnie przed końcem
    weeksPerQuarter: 13
};

function getCommodityByCode(code) { return Object.keys(COMMODITY_CODES).find(id => COMMODITY_CODES[id] === code) || null; }
function getContractName(id, absQ) { return `${COMMODITY_CODES[id]}-R${Math.floor(absQ / 4) + 1}Q${(absQ % 4) + 1}`; }
function parseContractName(name) {
    const m = /^([A-Z]+)-R(\d+)Q([1-4])$/.exec(String(name));
    const id = m ? getCommodityByCode(m[1]) : null;
    return id ? { id, absQ: (Number(m[2]) - 1) * 4 + Number(m[3]) - 1 } : null;
}
/** Stopa USD: stopa kraju USA (gdy dołączony), inaczej średnia z danych kraju. */
function getUsdRate() { const st = typeof countryState === 'object' ? countryState?.US : null; return Number(st?.rate) || Number(COUNTRY_DEFS?.US?.rateMean) || 0.04; }
/** Tygodnie do zapadalności serii (koniec kwartału absQ). */
function getContractWeeksLeft(absQ) { return Math.max(0, COMMODITY_MARKET.weeksPerQuarter * (absQ - macro.quarter + 1) - ensureCommodityState().qN); }

/** Cena kontraktu w USD (przy T = 0 równa cenie bieżącej). */
function getContractPriceUsd(id, absQ) {
    const P = getCommodityPrice(id), T = getContractWeeksLeft(absQ) / 52;
    if (!(T > 0)) return P;
    const a = 1 - Math.pow(1 - COMMODITY_DEFS[id].theta, T * 4);
    const M = getCommodityTarget(id) * getCommoditySeason(id, absQ, COMMODITY_MARKET.weeksPerQuarter);
    return Math.pow(M, a) * Math.pow(P, 1 - a) * (1 + (getUsdRate() + COMMODITY_MARKET.carry[id]) * T);
}
function getContractStructure(id, absQ) { return getContractPriceUsd(id, absQ) >= getCommodityPrice(id) ? 'contango' : 'backwardation'; }
/** Serie w ofercie: najbliższe 4 zapadalności (bez serii, której zostało < 2 tyg.). */
function getContractSeries() {
    const out = [];
    for (let k = 0; out.length < COMMODITY_MARKET.series; k++) { const q = macro.quarter + k; if (getContractWeeksLeft(q) >= COMMODITY_MARKET.minWeeksLeft) out.push(q); }
    return out;
}

const usdToBase = usd => usd * (typeof getFxRate === 'function' ? getFxRate('USD') : 1);
registerMarginMarket('commodities', {
    name: 'Giełda towarowa',
    priceOf: inst => { const c = parseContractName(inst); return c ? usdToBase(getContractPriceUsd(c.id, c.absQ)) : null; },
    settleOf: inst => { const c = parseContractName(inst); return c ? usdToBase(getCommodityPrice(c.id)) : null; },
    maxLeverageOf: inst => COMMODITY_MARKET.leverage[parseContractName(inst)?.id] || 1,
    expiresOf: inst => { const c = parseContractName(inst); return c ? (typeof fxWeek === 'number' ? fxWeek : 0) + getContractWeeksLeft(c.absQ) : NaN; },
    holdingCostYear: 0,  // koszt przechowania jest w cenie kontraktu
    entrySpread: COMMODITY_MARKET.entrySpread
});

/** Kontrakty dostępne od razu (tryb testów); od S7 za umiejętnością „Mistrz Opcji”. */
function isCommodityFuturesAvailable() { return Boolean(playerFund); }
function openCommodityContract(id, absQ, side, notional, leverage) {
    if (!isCommodityFuturesAvailable()) return { ok: false, reason: 'Kontrakty otwiera fundusz.' };
    if (!COMMODITY_DEFS[id] || !getContractSeries().includes(absQ)) return { ok: false, reason: 'Tej serii nie ma w ofercie.' };
    const r = openMarginPosition({ market: 'commodities', instrument: getContractName(id, absQ), side, notional, leverage });
    if (r.ok && typeof unlockAcademyEntry === 'function') unlockAcademyEntry('kontraktTerminowy');
    return r;
}
/** „Przedłuż”: zamknięcie po bieżącej cenie i otwarcie tej samej pozycji na następnej serii (spread jak przy otwarciu). */
function rollCommodityContract(posId) {
    const pos = getMarginPositions('commodities').find(p => p.id === posId), c = pos && parseContractName(pos.instrument);
    if (!c) return { ok: false, reason: 'Brak pozycji.' };
    const closed = closeMarginPosition(posId, 'roll');
    if (!closed.ok) return closed;
    const next = getContractSeries().find(q => q > c.absQ) ?? c.absQ + 1;
    const opened = openMarginPosition({ market: 'commodities', instrument: getContractName(c.id, next), side: pos.side, notional: pos.notional, leverage: pos.leverage });
    return opened.ok ? { ok: true, closed, position: opened.position } : { ok: false, reason: `Zamknięto ${pos.instrument}, ale nowej serii nie otwarto: ${opened.reason}`, closed };
}

// =================================================================================
// 0.17 S3: ETC (1 surowiec) i ETF „Koszyk Surowców” — bez dźwigni, osobny portfel (nie tablica `etfs`, która trzyma akcje)
// =================================================================================
// ETC: cena = cena surowca × czynnik opłaty (−0,4%/rok); koszyk: równe wagi 7 surowców, rebalans co kwartał, −0,6%/rok.
// Jednostki w `commodityState.funds` (zapis surowców). Wartość wchodzi do aktywów funduszu i NAV; nie liczy się do limitu dźwigni.
const COMMODITY_FUNDS = { etcFee: 0.004, basketFee: 0.006, spread: 0.002, basketStart: 100 };
const COMMODITY_BASKET_NAME = 'Koszyk Surowców';

function ensureCommodityFunds() {
    const st = ensureCommodityState();
    if (!st.funds) {
        const bq = Object.fromEntries(COMMODITY_IDS.map(id => [id, COMMODITY_FUNDS.basketStart / COMMODITY_IDS.length / st.prices[id]]));
        st.funds = { etcF: 1, bF: 1, bq, units: {} };
    }
    return st.funds;
}
/** Cena jednostki w USD: ETC surowca albo koszyka ('basket'). */
function getCommodityFundPriceUsd(key) {
    const f = ensureCommodityFunds();
    if (key === 'basket') return COMMODITY_IDS.reduce((s, id) => s + f.bq[id] * getCommodityPrice(id), 0) * f.bF;
    return COMMODITY_DEFS[key] ? getCommodityPrice(key) * f.etcF : NaN;
}
function getCommodityFundPrice(key) { return usdToBase(getCommodityFundPriceUsd(key)); }
function getCommodityFundUnits(key) { return Number(ensureCommodityFunds().units[key]) || 0; }
function getFundCommodityValue() {
    if (!commodityState?.funds) return 0;
    return Object.entries(commodityState.funds.units).reduce((s, [k, u]) => s + (u > 0 ? u * getCommodityFundPrice(k) : 0), 0);
}
function canTradeCommodityFunds() {
    if (!playerFund) return { ok: false, reason: 'ETC i ETF kupuje fundusz.' };
    if (typeof getSkillLevel === 'function' && getSkillLevel('etfExpert') < 1) return { ok: false, reason: "Wymaga umiejętności 'Ekspert Rynków Globalnych'." };
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return { ok: false, reason: 'Handel wstrzymany — zadziałał bezpiecznik giełdowy.' };
    return { ok: true };
}
/** Kupno za kwotę w walucie bazowej (spread 0,2% od kwoty). */
function buyCommodityFund(key, amount) {
    const gate = canTradeCommodityFunds(); if (!gate.ok) return gate;
    amount = Number(amount);
    if (key !== 'basket' && !COMMODITY_DEFS[key]) return { ok: false, reason: 'Nieznany instrument.' };
    if (!(amount >= 100)) return { ok: false, reason: 'Najmniejszy zakup to 100.' };
    if (amount > playerCash + 1e-9) return { ok: false, reason: 'Za mało gotówki.' };
    const units = amount * (1 - COMMODITY_FUNDS.spread) / getCommodityFundPrice(key), f = ensureCommodityFunds();
    playerCash -= amount; f.units[key] = getCommodityFundUnits(key) + units;
    return { ok: true, units };
}
function sellCommodityFund(key, units) {
    const gate = canTradeCommodityFunds(); if (!gate.ok) return gate;
    const held = getCommodityFundUnits(key); units = Math.min(held, Number(units));
    if (!(units > 0)) return { ok: false, reason: 'Brak jednostek.' };
    const cash = units * getCommodityFundPrice(key) * (1 - COMMODITY_FUNDS.spread), f = ensureCommodityFunds();
    playerCash += cash; f.units[key] = held - units; if (f.units[key] < 1e-9) delete f.units[key];
    return { ok: true, cash };
}
/** Co tydzień (po cenach surowców): opłaty ETC i koszyka. */
function stepCommodityMarket() {
    const f = ensureCommodityFunds();
    f.etcF *= Math.pow(1 - COMMODITY_FUNDS.etcFee, 1 / 52);
    f.bF *= Math.pow(1 - COMMODITY_FUNDS.basketFee, 1 / 52);
    if (typeof stepCommodityBots === 'function') stepCommodityBots();
}
/** Co kwartał: rebalans koszyka do równych wag (wartość jednostki bez zmian). */
function rebalanceCommodityBasket() {
    const f = ensureCommodityFunds(), raw = COMMODITY_IDS.reduce((s, id) => s + f.bq[id] * getCommodityPrice(id), 0);
    for (const id of COMMODITY_IDS) f.bq[id] = raw / COMMODITY_IDS.length / getCommodityPrice(id);
}

// =================================================================================
// 0.17 S3: BOTY — spekulanci (2 krajowe boty agresywne, małe pozycje) i pozycje zabezpieczające spółek (tylko podgląd)
// =================================================================================
// Pozycje botów są w `commodityState.bots` (zapis surowców), nie w silniku gracza; ceny nie zależą od botów.
const COMMODITY_BOTS = { personalities: ['reckless', 'yolo_trader'], maxPositions: 2, openChance: 0.06, maxCashShare: 0.05, maxLeverage: 3, trendWeeks: 13, trendBand: 0.05, revertBand: 0.1, minDeposit: 500 };

function ensureCommodityBots() { const st = ensureCommodityState(); return st.bots || (st.bots = { pos: [], stats: { opened: 0, closed: 0, margin: 0, pnl: 0 } }); }
function getCommodityBotList() { return (typeof aiCompetitors !== 'undefined' ? aiCompetitors : []).filter(ai => !ai.isForeignBot && COMMODITY_BOTS.personalities.includes(ai.personality)); }
function getCommodityBotEquity(p) { const price = marginMarkets.commodities.priceOf(p.inst); return Math.max(0, p.deposit + p.side * p.notional * ((price > 0 ? price : p.entry) / p.entry - 1)); }

/** Sygnał bota: trend 13-tygodniowy, a bez trendu powrót do średniej. 1 = długa, −1 = krótka, 0 = nic. */
function getCommodityBotSignal(id) {
    const h = ensureCommodityState().hist[id], P = getCommodityPrice(id), past = h[h.length - 1 - COMMODITY_BOTS.trendWeeks];
    if (past > 0 && Math.abs(P / past - 1) > COMMODITY_BOTS.trendBand) return Math.sign(P / past - 1);
    const dev = P / getCommodityTarget(id) - 1;
    return dev > COMMODITY_BOTS.revertBand ? -1 : dev < -COMMODITY_BOTS.revertBand ? 1 : 0;
}
function closeCommodityBotPosition(b, p, reason) {
    const equity = reason === 'expiry' ? Math.max(0, p.deposit + p.side * p.notional * (marginMarkets.commodities.settleOf(p.inst) / p.entry - 1)) : getCommodityBotEquity(p);
    const bot = aiCompetitors.find(ai => ai.id === p.bot);
    if (bot) bot.cash += equity;
    b.pos = b.pos.filter(x => x !== p);
    b.stats.closed++; if (reason === 'margin') b.stats.margin++;
    b.stats.pnl += equity - p.deposit - p.spread;
}
function stepCommodityBots() {
    const b = ensureCommodityBots();
    for (const p of b.pos.slice()) {
        const c = parseContractName(p.inst);
        if (!c || !aiCompetitors.some(ai => ai.id === p.bot)) { b.pos = b.pos.filter(x => x !== p); continue; }
        if (getContractWeeksLeft(c.absQ) <= 0 || macro.quarter > c.absQ) closeCommodityBotPosition(b, p, 'expiry');
        else if (getCommodityBotEquity(p) < MARGIN_RULES.closeBelow * p.deposit) closeCommodityBotPosition(b, p, 'margin');
    }
    for (const bot of getCommodityBotList()) {
        if (b.pos.filter(p => p.bot === bot.id).length >= COMMODITY_BOTS.maxPositions || !(Math.random() < COMMODITY_BOTS.openChance)) continue;
        const id = getRandomElement(COMMODITY_IDS), side = getCommodityBotSignal(id);
        const deposit = Math.floor((Number(bot.cash) || 0) * COMMODITY_BOTS.maxCashShare * getRandomInRange(0.3, 1));
        if (!side || !(deposit >= COMMODITY_BOTS.minDeposit)) continue;
        const absQ = getRandomElement(getContractSeries().slice(0, 3)), inst = getContractName(id, absQ);
        const lev = 1 + Math.floor(Math.random() * Math.min(COMMODITY_BOTS.maxLeverage, COMMODITY_MARKET.leverage[id])), notional = deposit * lev;
        const spread = notional * COMMODITY_MARKET.entrySpread, entry = marginMarkets.commodities.priceOf(inst);
        if (!(entry > 0) || deposit + spread > bot.cash) continue;
        bot.cash -= deposit + spread;
        b.pos.push({ bot: bot.id, inst, side, notional, lev, deposit, spread, entry });
        b.stats.opened++;
    }
}

/** Pozycje zabezpieczające spółek krajowych (h z S2, tylko informacja): wartość = h × udział wsadu × przychód kwartału. */
function getCompanyHedgePositions(limit = 12) {
    const out = [];
    for (const s of stocks) {
        if (s.assetType || s.isBankrupt || !s.fundamentals) continue;
        const prof = getStockCommodityProfile(s), h = getStockCommodityHedge(s), rev = Number(s.fundamentals.revenue) || 0;
        for (const [id, share] of Object.entries(prof.input)) if (share > 0 && rev > 0) out.push({ symbol: s.symbol, name: s.name, id, h, value: h * share * rev, series: getContractName(id, macro.quarter + 3) });
    }
    return out.sort((a, b) => b.value - a.value).slice(0, limit);
}
