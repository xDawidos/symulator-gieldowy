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
