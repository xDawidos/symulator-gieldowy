// =================================================================================
// 0.17 S1: SUROWCE — rejestr 7 surowców, cena w USD co tydzień, zdarzenia surowcowe, zapis (pole opcjonalne `commodities`)
// =================================================================================
// Ceny są egzogeniczne (rynek światowy): nie zależą od gracza ani botów. Model tygodniowy:
//   ln X ← ln X + θ_t·(ln M − ln X) + σ/√(rok gry)·ε,  θ_t = 1 − (1 − θ)^(1/WEEKS_PER_QUARTER),  P = X · sezon(tydzień)
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

function commodityQuarterInYear(q = macro.quarter) { return ((q % 4) + 4) % 4 + 1; } // kalendarz gry: formatQuarterDate (campaigns.js)

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
    const t = commodityQuarterInYear(q) - 1 + Math.min(1, weekInQ / WEEKS_PER_QUARTER) - 0.5, i = Math.floor(t), f = t - i;
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
        const thetaW = 1 - Math.pow(1 - def.theta, 1 / WEEKS_PER_QUARTER);
        let x = Math.log(st.prices[id] / getCommoditySeason(id, macro.quarter, st.qN));
        x += thetaW * (Math.log(getCommodityTarget(id)) - x) + def.sigma / Math.sqrt(WEEKS_PER_YEAR) * gaussianRandom();
        const [lo, hi] = getCommodityBand(id);
        const p = Math.min(hi, Math.max(lo, Math.exp(x) * getCommoditySeason(id, macro.quarter, st.qN + 1)));
        st.prices[id] = p;
        const h = st.hist[id]; h.push(p); if (h.length > COMMODITY_RULES.historyWeeks) h.shift();
        st.qSum[id] = (st.qSum[id] || 0) + p;
    }
    st.qN++;
    if (typeof stepFreight === 'function') stepFreight(); // 0.17 S4: indeks frachtu (po cenie ropy)
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
    noteCommodityDeviationRun(); // S2: przed zamknięciem średniej
    for (const id of COMMODITY_IDS) {
        const avg = st.qN ? st.qSum[id] / st.qN : st.prices[id];
        st.qHist[id].push(avg); if (st.qHist[id].length > COMMODITY_RULES.historyQuarters) st.qHist[id].shift();
        st.qSum[id] = 0;
    }
    st.qN = 0;
    if (typeof processFreightQuarterly === 'function') processFreightQuarterly(); // 0.17 S4
    if (typeof rebalanceCommodityBasket === 'function' && st.funds) rebalanceCommodityBasket(); // S3
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
    return { s: st.startQ, w: st.w, p: map(id => st.prices[id]), h: map(id => st.hist[id].map(rs)), q: map(id => st.qHist[id].map(rs)), qs: map(id => r(st.qSum[id] || 0)), qn: st.qN, e: st.events, d: st.lastDroughtQ, r: st.run, f: st.funds, b: st.bots, fr: typeof getFreightSnapshot === 'function' ? getFreightSnapshot() : undefined }; // f, b: S3 (ETC/ETF, kontrakty botów); fr: S4 (fracht)
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
    if (snap.f && typeof snap.f === 'object' && snap.f.bq) st.funds = { etcF: Number(snap.f.etcF) || 1, bF: Number(snap.f.bF) || 1, bq: Object.fromEntries(COMMODITY_IDS.map(id => [id, Number(snap.f.bq[id]) > 0 ? Number(snap.f.bq[id]) : COMMODITY_DEFS[id].mean])), units: Object.fromEntries(Object.entries(snap.f.units || {}).filter(([k, u]) => (k === 'basket' || COMMODITY_DEFS[k]) && Number(u) > 0).map(([k, u]) => [k, Number(u)])) };
    if (snap.b && typeof snap.b === 'object') st.bots = snap.b;
    if (typeof applyFreightSnapshot === 'function') applyFreightSnapshot(snap.fr); // 0.17 S4
    if (snap.r && typeof snap.r === 'object') st.run = Object.fromEntries(Object.entries(snap.r).filter(([k, v]) => COMMODITY_DEFS[k] && Number.isFinite(v?.n)).map(([k, v]) => [k, { sign: Math.sign(Number(v.sign) || 0), n: v.n }]));
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
    if (typeof checkFreightInvariants === 'function') problems.push(...checkFreightInvariants()); // 0.17 S4
    if (typeof checkInfraInvariants === 'function') problems.push(...checkInfraInvariants()); // 0.17 S5
    return problems;
}

// =================================================================================
// 0.17 S2: SPÓŁKI I KOSZTY WSADU
// =================================================================================
// Produkt: przychód kwartału × (1 + w·((P̄q/Ś8)^0,6 − 1)); wsad: marża −= udział·(r_ef − 1)·(1 − przerzucenie), gdzie
// r_ef = (1 − h)·P̄q/Ś8 + h·P̄(q−4)/Ś8 (zabezpieczenie h po cenie sprzed 4 kw.), przerzucenie 0 → 60% w 4 kw. trwania odchylenia.
// Wszystko względem Ś8, więc długoterminowo średnio zero. Przypisania są w kodzie (symbol domowy / id spółki kraju), nie w zapisie.

const COMMODITY_IMPACT = { productExp: 0.6, passMax: 0.6, passQuarters: 4, hedgeRange: [0.3, 0.7], hedgeState: 0.3, hedgeLagQ: 4, strikeCut: 0.2 };

// `lag: 1` — produkt liczony po średniej poprzedniego kwartału (rafinerie, handel: marża przy zmianie ceny, nie na poziomie)
const COMMODITY_ASSIGNMENTS = {
    // Polska (nowe w S2 i istniejące)
    PES: { product: { oil: 0.6 }, lag: 1, input: { oil: 0.6 } },
    NAG: { product: { gas: 1 }, input: {} },
    ZST: { product: { gold: 1 }, input: {} },
    SLS: { product: { grain: 1 }, input: {} },
    KWM: { product: { coal: 1 }, input: {} },
    MLD: { product: { metals: 1 }, input: {} },
    PUR: { product: { uranium: 1 }, input: {} },
    SIK: { input: { gas: 0.15 } },
    MEF: { product: { oil: 0.6 }, lag: 1, input: { oil: 0.6 } },
    ECL: { input: { oil: 0.25 } },
    KUP: { input: { gas: 0.3 } },
    ESA: { input: { coal: 0.35 } },
    TRN: { input: { coal: 0.3, uranium: 0.1 } },
    // zagranica (countries_data.js)
    TOB: { product: { oil: 1 }, input: {} },
    NRG: { product: { oil: 0.5, gas: 0.5 }, input: {} },
    GPR: { product: { gas: 1 }, input: {} },
    WGI: { product: { coal: 1 }, input: {} },
    TKS: { input: { metals: 0.3, coal: 0.1 } },
    SSA: { input: { metals: 0.3, coal: 0.1 } },
    LND: { input: { gas: 0.3 } },
    JDM: { product: { grain: 1 }, input: {} },
    NGR: { product: { gold: 1 }, input: {} },
    GTG: { product: { gas: 0.6, oil: 0.4 }, input: {} },
    DOL: { product: { coal: 1 }, input: {} },
    KJM: { product: { metals: 1 }, input: {} },
    GLK: { product: { metals: 0.2, coal: 0.1, oil: 0.1 }, lag: 1, input: { metals: 0.2, coal: 0.1, oil: 0.1 } },
    TBN: { product: { oil: 0.6 }, lag: 1, input: { oil: 0.6 } },
    UOW: { product: { metals: 1 }, input: {} },
    BHO: { product: { grain: 1 }, input: {} },
    PKC: { input: { coal: 0.10 } } // 0.17 S4: kolej (energia od 0.17.2)
};

// wsad domyślny: sektor → udziały; podsektor nadpisuje (pusty obiekt = brak wsadu). Rolnictwo: produkt zboże.
const COMMODITY_SECTOR_INPUTS = {
    'Chemia': { oil: 0.25, gas: 0.15 },
    'Przemysł': { metals: 0.25, coal: 0.05 },
    'Motoryzacja': { metals: 0.15, oil: 0.05 },
    'Energia': { coal: 0.35, gas: 0.15 },
    'Transport i logistyka': { oil: 0.20 },
    'Żywność': { grain: 0.20 },
    'Budowlany': { metals: 0.10 },
    'Obronność': { metals: 0.15 }
};
const COMMODITY_SUBSECTOR_INPUTS = { 'OZE': {}, 'Energetyka jądrowa': { uranium: 0.20 }, 'Lotnictwo': { oil: 0.30 }, 'Rolnictwo': {} };
const COMMODITY_SUBSECTOR_PRODUCTS = { 'Rolnictwo': { grain: 1 } };

function getCommoditySegments(stock) {
    if (stock?.kind === 'share' && Array.isArray(stock.sectors)) return stock.sectors.map(([sector, share], n) => ({ sector, share, subsector: n === 0 ? stock.subsector : null }));
    return typeof getStockSegments === 'function' ? getStockSegments(stock) : [];
}
function getCommodityKey(stock) { return stock?.kind === 'share' ? stock.id : stock?.symbol; }

/** Profil surowcowy spółki: { product: {id: w}, input: {id: udział}, lag }. Przypisanie z tabeli albo wsad (i produkt rolnictwa) z segmentów. */
function getStockCommodityProfile(stock) {
    // shortcut: tabela po symbolu/id — nowa spółka z wolnym już symbolem z tabeli dziedziczy profil; dodać znacznik pochodzenia, gdyby to wystąpiło
    const own = stock && !stock.generated && !stock.assetType ? COMMODITY_ASSIGNMENTS[getCommodityKey(stock)] : null;
    if (own) return { product: own.product || {}, input: own.input || {}, lag: own.lag || 0 };
    const product = {}, input = {};
    for (const seg of getCommoditySegments(stock)) {
        const inp = (seg.subsector && COMMODITY_SUBSECTOR_INPUTS[seg.subsector]) || COMMODITY_SECTOR_INPUTS[seg.sector] || {};
        for (const [id, w] of Object.entries(inp)) input[id] = (input[id] || 0) + w * seg.share;
        for (const [id, w] of Object.entries(COMMODITY_SUBSECTOR_PRODUCTS[seg.subsector] || {})) product[id] = (product[id] || 0) + w * seg.share;
    }
    return { product, input, lag: 0 };
}

/** Udział zabezpieczonego wsadu h: państwowe 0,3, pozostałe 0,3–0,7 stałe dla spółki (z symbolu, bez pola w zapisie). */
function getStockCommodityHedge(stock) {
    if (Number.isFinite(stock?.hedge)) return stock.hedge;
    if (stock?.isStateOwned || stock?.state) return COMMODITY_IMPACT.hedgeState;
    const key = String(getCommodityKey(stock) || '');
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 1000;
    const [a, b] = COMMODITY_IMPACT.hedgeRange;
    return a + (b - a) * h / 999;
}

/** Średnia kwartału sprzed k zamkniętych kwartałów (k = 0: bieżący) względem Ś8. */
function getCommodityRatioLag(id, k = 0) {
    if (!k) return getCommodityTrendRatio(id);
    const q = ensureCommodityState().qHist[id];
    return (q[q.length - k] ?? q[0]) / getCommodityTrend(id);
}
/** Przerzucenie kosztów na ceny: 0 → 60% liniowo przez 4 kw. odchylenia w tę samą stronę (zamknięte kwartały). */
function getCommodityPassThrough(id) {
    const run = ensureCommodityState().run?.[id], sign = Math.sign(getCommodityTrendRatio(id) - 1);
    const n = run && run.sign === sign && sign !== 0 ? run.n : 0;
    return COMMODITY_IMPACT.passMax * Math.min(1, n / COMMODITY_IMPACT.passQuarters);
}
/** Przy zamknięciu kwartału: długość serii odchylenia (ten sam stosunek, który widziały raporty spółek). */
function noteCommodityDeviationRun() {
    const st = ensureCommodityState();
    st.run = st.run || {};
    for (const id of COMMODITY_IDS) {
        const sign = Math.sign(getCommodityTrendRatio(id) - 1), cur = st.run[id];
        st.run[id] = cur && cur.sign === sign ? { sign, n: cur.n + 1 } : { sign, n: 1 };
    }
}

/** Wpływ surowców na kwartał spółki (computeQuarterResults): { revenueFactor, marginAdj }. */
function getCommodityResultAdj(stock) {
    if (!commodityState) return { revenueFactor: 1, marginAdj: 0 };
    const prof = getStockCommodityProfile(stock);
    let revenueFactor = 1, marginAdj = 0;
    for (const [id, w] of Object.entries(prof.product)) {
        if (!COMMODITY_DEFS[id] || !w) continue;
        revenueFactor += w * (Math.pow(getCommodityRatioLag(id, prof.lag), COMMODITY_IMPACT.productExp) - 1);
        if (stock.kind !== 'share' && commodityState.events.some(ev => ev.id === 'strike' && ev.product === id)) revenueFactor -= w * COMMODITY_IMPACT.strikeCut; // strajk: spółki kraju startowego
    }
    const h = Object.keys(prof.input).length ? getStockCommodityHedge(stock) : 0;
    for (const [id, share] of Object.entries(prof.input)) {
        if (!COMMODITY_DEFS[id] || !share) continue;
        const r = (1 - h) * getCommodityTrendRatio(id) + h * getCommodityRatioLag(id, COMMODITY_IMPACT.hedgeLagQ);
        marginAdj -= share * (r - 1) * (1 - getCommodityPassThrough(id));
    }
    const freight = typeof getFreightResultAdj === 'function' ? getFreightResultAdj(stock) : { revenueFactor: 1, marginAdj: 0 }; // 0.17 S4: przewoźnicy i koszt transportu
    return { revenueFactor: Math.max(0.2, revenueFactor * freight.revenueFactor), marginAdj: marginAdj + freight.marginAdj };
}
