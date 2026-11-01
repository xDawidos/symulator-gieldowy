// =================================================================================
// 0.17 S1: SUROWCE — rejestr 7 surowców, cena w USD co tydzień, zdarzenia surowcowe, zapis (pole opcjonalne `commodities`)
// =================================================================================
// Ceny są egzogeniczne (rynek światowy): nie zależą od gracza ani botów. Model tygodniowy:
//   ln X ← ln X + θ_t·(ln M − ln X) + σ/√52·ε,  θ_t = 1 − (1 − θ)^(1/13),  P = X · sezon(tydzień)
//   M = średnia · inflacja USD · (1 + β_p·(popyt − 1)) · (1 + β_z·(zbrojenia − 1)) · nastrój · szoki
// Sezon mnoży cenę wprost (płynnie między środkami kwartałów): w celu M przy θ = 0,25/kw. zostałoby z niego ok. ±2% (S1, kalibracja).
// Szok przesuwa ln M na czas zdarzenia i jednorazowo podbija cenę o połowę szoku. Wpływ na spółki (S2) liczy się
// względem średniej kroczącej 8 kwartałów (`getCommodityTrendRatio`), więc długoterminowo znosi się do zera.

const COMMODITY_DEFS = {
    gold:    { name: 'Złoto', unit: 'uncja', mean: 2000, sigma: 0.15, theta: 0.05, season: null, betaP: -0.2, betaZ: 0.1, band: [0.5, 2.0], mood: false },
    oil:     { name: 'Ropa', unit: 'baryłka', mean: 75, sigma: 0.35, theta: 0.15, season: [0, 0, 0.03, 0], betaP: 1.0, betaZ: 0.2, band: [0.4, 2.5], mood: true },
    gas:     { name: 'Gaz', unit: 'MMBtu', mean: 3.5, sigma: 0.40, theta: 0.25, season: [0.12, -0.06, -0.12, 0.06], betaP: 0.8, betaZ: 0.1, band: [0.4, 3.0], mood: false },
    coal:    { name: 'Węgiel', unit: 'tona', mean: 120, sigma: 0.30, theta: 0.15, season: [0.06, 0, -0.06, 0], betaP: 0.9, betaZ: 0.1, band: [0.4, 2.5], mood: true },
    metals:  { name: 'Metale przemysłowe', unit: 'indeks', mean: 100, sigma: 0.25, theta: 0.10, season: null, betaP: 1.3, betaZ: 0.5, band: [0.5, 2.0], mood: true },
    grain:   { name: 'Zboże', unit: 'buszel', mean: 6, sigma: 0.25, theta: 0.20, season: [0, 0.05, -0.08, 0], betaP: 0.2, betaZ: 0, band: [0.5, 2.0], mood: false },
    uranium: { name: 'Uran', unit: 'funt', mean: 60, sigma: 0.30, theta: 0.08, season: null, betaP: 0.3, betaZ: 0.1, band: [0.4, 2.5], mood: false }
};
const COMMODITY_IDS = Object.keys(COMMODITY_DEFS);

const COMMODITY_RULES = {
    inflationYear: 0.02,     // inflacja USD w celu M
    moodShift: 0.03,         // hossa/euforia +3%, bessa/kapitulacja −3% (ropa, metale, węgiel)
    historyWeeks: 104,       // historia tygodniowa (wykres)
    historyQuarters: 80,     // starsza historia: średnie kwartalne
    trendQuarters: 8,        // średnia krocząca Ś8 (S2)
    cyclePhaseDemand: { boom: 1.15, peak: 1.05, decline: 0.85, trough: 0.95 } // popyt przemysłu z fazy cyklu sektora Przemysł
};

// Zdarzenia losowane co kwartał (szansa roczna / 4). `shocks`: [surowiec, [min, max]] — przesunięcie celu M (np. 0.3 = +30%).
const COMMODITY_EVENTS = {
    embargo: { name: 'Embargo i blokada cieśniny', yearly: 0.04, quarters: [2, 4], shocks: [['oil', [0.30, 0.60]], ['gas', [0.20, 0.40]]],
        text: '⛴️ Embargo i blokada cieśniny: tankowce stoją, ropa i gaz gwałtownie drożeją.' },
    strike: { name: 'Strajk w kopalniach', yearly: 0.06, quarters: [1, 2], shocks: null, // węgiel albo metale, losowane przy starcie
        text: '⛏️ Strajk w kopalniach: wydobycie stoi, {name} drożeje.' },
    harvest: { name: 'Rekordowe zbiory', yearly: 0.08, quarters: [2, 2], shocks: [['grain', [-0.25, -0.15]]],
        text: '🌾 Rekordowe zbiory: silosy pełne, zboże tanieje.' },
    reactor: { name: 'Awaria reaktora za granicą', yearly: 0.02, quarters: [4, 6], shocks: [['uranium', [-0.30, -0.30]]],
        text: '☢️ Awaria reaktora za granicą: kraje wstrzymują budowę elektrowni jądrowych, uran tanieje.' },
    goldFlight: { name: 'Ucieczka do złota', yearly: 0, quarters: [2, 4], shocks: [['gold', [0.10, 0.20]], ['oil', [-0.10, -0.10]], ['metals', [-0.10, -0.10]]], // start linii kryzysu
        text: '🪙 Ucieczka do złota: inwestorzy szukają bezpiecznej przystani, surowce przemysłowe tanieją.' },
    // spięte z istniejącymi szokami makro (core.js MACRO_SHOCK_EVENTS; szok naftowy także jako iskra linii 1973)
    oilShock: { name: 'Szok naftowy', yearly: 0, quarters: [3, 3], shocks: [['oil', [0.40, 0.40]]], text: null },
    drought: { name: 'Susza', yearly: 0, quarters: [2, 2], shocks: [['grain', [0.20, 0.20]]], text: null },
    energyPrices: { name: 'Spadek cen energii', yearly: 0, quarters: [2, 2], shocks: [['gas', [-0.15, -0.15]], ['coal', [-0.15, -0.15]]], text: null }
};
const COMMODITY_MACRO_LINKS = { oil: 'oilShock', drought: 'drought', energyprices: 'energyPrices' };
const COMMODITY_GOLD_CRISES = ['banking', 'black', 'pandemic'];

let commodityState = null; // { startQ, w, prices, hist, qHist, qSum, qN, events: [{ id, until, shocks: {id: s}, product? }], lastDroughtQ }

function commodityQuarterInYear(q = macro.quarter) { return ((q - 1) % 4 + 4) % 4 + 1; }

function initCommodityState() {
    const q = typeof macro === 'object' ? macro.quarter : 0;
    commodityState = { startQ: q, w: 0, prices: {}, hist: {}, qHist: {}, qSum: {}, qN: 0, events: [], lastDroughtQ: -99 };
    for (const id of COMMODITY_IDS) {
        const p = COMMODITY_DEFS[id].mean;
        commodityState.prices[id] = p;
        commodityState.hist[id] = [p];
        commodityState.qHist[id] = Array(COMMODITY_RULES.trendQuarters).fill(p); // Ś8 startuje od średniej: wpływ na spółki zaczyna się od zera
        commodityState.qSum[id] = 0;
    }
    return commodityState;
}
function ensureCommodityState() { return commodityState || initCommodityState(); }

function getCommodityPrice(id) { return ensureCommodityState().prices[id]; }

/** Popyt przemysłu: faza cyklu sektora Przemysł kraju startowego (0,85…1,15). */
function getCommodityIndustryDemand() {
    // shortcut: tylko cykl kraju startowego (kraje dołączone nie mają własnych cykli sektorów); uśrednić, gdy dostaną `sectorCycles`
    const phase = typeof macro === 'object' ? macro?.sectorCycles?.['Przemysł']?.phase : null;
    return COMMODITY_RULES.cyclePhaseDemand[phase] ?? 1;
}
/** Zbrojenia: średni udział wydatków obronnych / 2,5% — do czasu S6 stale 1. */
function getCommodityArmsDemand() { return typeof getGlobalDefenseIndex === 'function' ? getGlobalDefenseIndex() : 1; }

function getCommodityShock(id) {
    let s = 1;
    for (const ev of ensureCommodityState().events) if (ev.shocks[id]) s *= 1 + ev.shocks[id];
    return s;
}

/** Mnożnik sezonu: interpolacja liniowa między środkami kwartałów (pozycja w roku z bieżącego kwartału i tygodnia kwartału). */
function getCommoditySeason(id, q = macro.quarter, weekInQ = ensureCommodityState().qN) {
    const s = COMMODITY_DEFS[id].season;
    if (!s) return 1;
    const t = commodityQuarterInYear(q) - 1 + Math.min(1, weekInQ / 13) - 0.5, i = Math.floor(t), f = t - i;
    return 1 + s[(i + 4) % 4] * (1 - f) + s[(i + 5) % 4] * f;
}

/** Cel M(t) bez szumu i sezonu (USD). */
function getCommodityTarget(id) {
    const def = COMMODITY_DEFS[id], st = ensureCommodityState();
    const years = Math.max(0, (macro.quarter - st.startQ) / 4);
    let m = def.mean * Math.pow(1 + COMMODITY_RULES.inflationYear, years);
    m *= 1 + def.betaP * (getCommodityIndustryDemand() - 1);
    m *= 1 + def.betaZ * (getCommodityArmsDemand() - 1);
    if (def.mood && typeof getMarketRegime === 'function') {
        const phase = getMarketRegime('home')?.phase;
        if (phase === 'bull' || phase === 'euphoria') m *= 1 + COMMODITY_RULES.moodShift;
        else if (phase === 'bear' || phase === 'capitulation') m *= 1 - COMMODITY_RULES.moodShift;
    }
    return m * getCommodityShock(id);
}
/** Widełki ceny: × średnia z inflacją (bez sezonu i szoków). */
function getCommodityBand(id) {
    const def = COMMODITY_DEFS[id], st = ensureCommodityState();
    const base = def.mean * Math.pow(1 + COMMODITY_RULES.inflationYear, Math.max(0, (macro.quarter - st.startQ) / 4));
    return [base * def.band[0], base * def.band[1]];
}

/** Co tydzień gry (processFundWeekly): nowe ceny i historia. */
function stepCommodities() {
    const st = ensureCommodityState();
    st.w++;
    for (const id of COMMODITY_IDS) {
        const def = COMMODITY_DEFS[id];
        const thetaW = 1 - Math.pow(1 - def.theta, 1 / 13);
        let x = Math.log(st.prices[id] / getCommoditySeason(id, macro.quarter, st.qN));
        x += thetaW * (Math.log(getCommodityTarget(id)) - x) + def.sigma / Math.sqrt(52) * gaussianRandom();
        const [lo, hi] = getCommodityBand(id);
        const p = Math.min(hi, Math.max(lo, Math.exp(x) * getCommoditySeason(id, macro.quarter, st.qN + 1)));
        st.prices[id] = p;
        const h = st.hist[id]; h.push(p); if (h.length > COMMODITY_RULES.historyWeeks) h.shift();
        st.qSum[id] = (st.qSum[id] || 0) + p;
    }
    st.qN++;
}

/** Średnia ceny w bieżącym kwartale (P̄q); przed pierwszym tygodniem — cena bieżąca. */
function getCommodityQuarterAvg(id) { const st = ensureCommodityState(); return st.qN ? st.qSum[id] / st.qN : st.prices[id]; }
/** Średnia krocząca 8 zamkniętych kwartałów (Ś8). */
function getCommodityTrend(id) { const a = ensureCommodityState().qHist[id].slice(-COMMODITY_RULES.trendQuarters); return a.reduce((s, v) => s + v, 0) / a.length; }
/** P̄q / Ś8 — wejście dla wyników spółek (S2). */
function getCommodityTrendRatio(id) { return getCommodityQuarterAvg(id) / getCommodityTrend(id); }

function startCommodityEvent(key, opts = {}) {
    const def = COMMODITY_EVENTS[key], st = ensureCommodityState();
    if (!def) return null;
    let shocks = def.shocks, extra = {};
    if (key === 'strike') { const product = Math.random() < 0.5 ? 'coal' : 'metals'; shocks = [[product, [0.15, 0.25]]]; extra.product = product; }
    const ev = { id: key, until: macro.quarter + rangeIntCommodity(def.quarters), shocks: {}, ...extra };
    for (const [id, [a, b]] of shocks) {
        const s = a + Math.random() * (b - a);
        ev.shocks[id] = s;
        const [lo, hi] = getCommodityBand(id);
        st.prices[id] = Math.min(hi, Math.max(lo, st.prices[id] * Math.sqrt(1 + s))); // jednorazowy skok o połowę szoku (w logarytmie)
    }
    st.events.push(ev);
    if (key === 'drought') st.lastDroughtQ = macro.quarter;
    if (key === 'reactor' && typeof applyPriceEffect === 'function') {
        for (const stock of stocks) if (!stock.assetType && !stock.isBankrupt && getStockSegments(stock).some(seg => seg.subsector === 'Energetyka jądrowa')) applyPriceEffect(stock.symbol, -0.05, 'negative', 'market');
    }
    const text = def.text && !opts.silent ? def.text.replace('{name}', COMMODITY_DEFS[extra.product]?.name.toLowerCase() || '') : null;
    if (text && typeof logEvent === 'function') logEvent(text, 'macro');
    if (text && typeof pushNews === 'function') pushNews(text, null);
    return ev;
}
function rangeIntCommodity([a, b]) { return a + Math.floor(Math.random() * (b - a + 1)); }
function getActiveCommodityEvents() { return ensureCommodityState().events; }

/** Co kwartał (main.js): zamyka średnią kwartalną, wygasza zdarzenia, losuje nowe. */
function processCommoditiesQuarterly() {
    const st = ensureCommodityState();
    for (const id of COMMODITY_IDS) {
        const avg = st.qN ? st.qSum[id] / st.qN : st.prices[id];
        st.qHist[id].push(avg); if (st.qHist[id].length > COMMODITY_RULES.historyQuarters) st.qHist[id].shift();
        st.qSum[id] = 0;
    }
    st.qN = 0;
    for (const id of COMMODITY_IDS) { const [lo, hi] = getCommodityBand(id); st.prices[id] = Math.min(hi, Math.max(lo, st.prices[id])); } // widełki rosną z inflacją co kwartał
    st.events = st.events.filter(ev => ev.until > macro.quarter);
    for (const key of ['embargo', 'strike', 'harvest', 'reactor']) {
        const def = COMMODITY_EVENTS[key];
        if (st.events.some(ev => ev.id === key)) continue;
        if (key === 'harvest' && macro.quarter - st.lastDroughtQ < 4) continue; // nie w roku suszy
        let chance = def.yearly / 4;
        if (key === 'embargo') chance *= typeof getHomeSecurityLevel === 'function' ? 1.5 - getHomeSecurityLevel() / 100 : 1; // S6: bezpieczeństwo państwa
        if (Math.random() < chance) startCommodityEvent(key);
    }
}

/** Szok makro z core.js / iskra linii kryzysu: ropa, susza, ceny energii. */
function applyCommodityMacroShock(macroId) { const key = COMMODITY_MACRO_LINKS[macroId]; return key ? startCommodityEvent(key, { silent: true }) : null; }
/** Start linii kryzysu (crises.js): bankowa, czarny czwartek, pandemia → ucieczka do złota. */
function noteCrisisForCommodities(lineId) { return COMMODITY_GOLD_CRISES.includes(lineId) ? startCommodityEvent('goldFlight') : null; }

// --- Zapis (pole opcjonalne `commodities`), niezmienniki ---
function getCommoditiesSnapshot() {
    const st = ensureCommodityState(), r = x => Math.round(x * 1e4) / 1e4, rs = x => Number(x.toPrecision(5));
    const map = f => Object.fromEntries(COMMODITY_IDS.map(id => [id, f(id)]));
    return { s: st.startQ, w: st.w, p: map(id => st.prices[id]), h: map(id => st.hist[id].map(rs)), q: map(id => st.qHist[id].map(rs)), qs: map(id => r(st.qSum[id] || 0)), qn: st.qN, e: st.events, d: st.lastDroughtQ };
}
function applyCommoditiesSnapshot(snap) {
    initCommodityState(); // stary zapis bez pola: ceny średnie
    if (!snap || typeof snap !== 'object' || !snap.p) return;
    const st = commodityState;
    st.startQ = Number.isFinite(snap.s) ? snap.s : st.startQ;
    st.w = Number(snap.w) || 0; st.qN = Number(snap.qn) || 0; st.lastDroughtQ = Number.isFinite(snap.d) ? snap.d : -99;
    for (const id of COMMODITY_IDS) {
        if (Number(snap.p[id]) > 0) st.prices[id] = Number(snap.p[id]);
        const h = (snap.h?.[id] || []).map(Number).filter(v => v > 0); if (h.length) st.hist[id] = h.slice(-COMMODITY_RULES.historyWeeks);
        const q = (snap.q?.[id] || []).map(Number).filter(v => v > 0); if (q.length) st.qHist[id] = q.slice(-COMMODITY_RULES.historyQuarters);
        st.qSum[id] = Number(snap.qs?.[id]) || 0;
    }
    st.events = (Array.isArray(snap.e) ? snap.e : []).filter(ev => COMMODITY_EVENTS[ev?.id] && Number.isFinite(ev.until) && ev.shocks && typeof ev.shocks === 'object')
        .map(ev => ({ id: ev.id, until: ev.until, shocks: Object.fromEntries(Object.entries(ev.shocks).filter(([k, v]) => COMMODITY_DEFS[k] && Number.isFinite(v))), ...(COMMODITY_DEFS[ev.product] ? { product: ev.product } : {}) }));
}
function checkCommodityInvariants() {
    if (!commodityState) return [];
    const problems = [];
    for (const id of COMMODITY_IDS) {
        const p = commodityState.prices[id], [lo, hi] = getCommodityBand(id);
        if (!(p > 0) || !Number.isFinite(p)) problems.push(`surowiec ${id}: cena ${p}`);
        else if (p < lo * (1 - 1e-9) || p > hi * (1 + 1e-9)) problems.push(`surowiec ${id}: cena ${p.toFixed(2)} poza widełkami ${lo.toFixed(2)}–${hi.toFixed(2)}`);
    }
    return problems;
}
