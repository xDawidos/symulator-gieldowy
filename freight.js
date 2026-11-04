// =================================================================================
// 0.17 S4: TRANSPORT — indeks frachtu (baza 100) dla trzech rodzajów, co tydzień
// =================================================================================
//   I = 100 · (ropa/Ś8)^f · popyt^d · (1/przepustowość)^k · zakłócenia · szum
// Popyt: faza cyklu Przemysłu (jak surowce), przepustowość = 1 do S5, szum: log-AR(1) z powrotem 0,25/kw.
// Wpływ na spółki (w getCommodityResultAdj): przewoźnicy — przychód × (Ī/Ś8_I)^0,7; odbiorcy — marża −= udział · (Ī/Ś8_I − 1)
// (koszyk rodzajów). Względem Ś8, więc długoterminowo średnio zero. Stan w commodityState.freight, zapis w polu `commodities.fr`.

const FREIGHT_MODES = {
    sea:  { name: 'Morski', f: 0.3, d: 1.5, k: 0.5, sigma: 0.40, delivery: [4, 6] },
    air:  { name: 'Lotniczy', f: 0.5, d: 0.8, k: 0.3, sigma: 0.20, delivery: [1, 1] },
    land: { name: 'Lądowy', f: 0.3, d: 0.6, k: 0.8, sigma: 0.10, delivery: [1, 2] }
};
const FREIGHT_IDS = Object.keys(FREIGHT_MODES);
const FREIGHT_RULES = { theta: 0.25, carrierExp: 0.7, buyerMix: { sea: 0.4, land: 0.4, air: 0.2 } };
// koszt transportu w marży sektorów-odbiorców (udział kosztów)
const FREIGHT_SECTOR_COST = { 'Przemysł': 0.06, 'Motoryzacja': 0.05, 'Żywność': 0.05, 'Dobra konsumpcyjne': 0.05, 'Chemia': 0.04 };
// zakłócenia: szansa roczna, czas w tygodniach, skok indeksu, opóźnienie dostaw (tyg., informacyjnie)
const FREIGHT_EVENTS = {
    canal: { name: 'Statek utknął w kanale', mode: 'sea', yearly: 0.05, weeks: [4, 8], jump: 0.40, delay: 2,
        text: '🚢 Statek utknął w kanale: kontenerowce stoją w kolejce, fracht morski drożeje. Evergiven Marine traci na giełdzie.' },
    railStrike: { name: 'Strajk kolejarzy', mode: 'land', yearly: 0.05, weeks: [2, 4], jump: 0.15, delay: 1,
        text: '🚆 Strajk kolejarzy: pociągi towarowe stoją, fracht lądowy drożeje, kurs kolei spada.' },
    volcano: { name: 'Pył wulkaniczny', mode: 'air', yearly: 0.03, weeks: [2, 4], jump: 0.30, delay: 1,
        text: '🌋 Pył wulkaniczny nad Europą: samoloty uziemione, fracht lotniczy drożeje.' }
};

function initFreightState() {
    const fr = { z: {}, idx: {}, q: {}, qs: {}, qn: 0, e: [] };
    for (const id of FREIGHT_IDS) { fr.z[id] = 0; fr.idx[id] = 100; fr.q[id] = Array(COMMODITY_RULES.trendQuarters).fill(100); fr.qs[id] = 0; }
    return fr;
}
function ensureFreightState() { const st = ensureCommodityState(); return st.freight || (st.freight = initFreightState()); }

function getFreightDisruption(id) {
    let m = 1;
    for (const ev of ensureFreightState().e) if (FREIGHT_EVENTS[ev.id]?.mode === id) m *= 1 + FREIGHT_EVENTS[ev.id].jump;
    return m;
}
function getFreightCapacity(id) { return typeof getInfraCapacity === 'function' ? getInfraCapacity(id) : 1; } // S5: przepustowość kraju

/** Indeks bez szumu i zakłóceń (do testów i wykładu). */
function getFreightFundamental(id) {
    const def = FREIGHT_MODES[id];
    return 100 * Math.pow(getCommodityPrice('oil') / getCommodityTrend('oil'), def.f) * Math.pow(getCommodityIndustryDemand(), def.d) * Math.pow(1 / getFreightCapacity(id), def.k);
}

/** Co tydzień (na końcu stepCommodities): szum, zakłócenia, nowy indeks. */
function stepFreight() {
    const fr = ensureFreightState(), w = ensureCommodityState().w;
    fr.e = fr.e.filter(ev => ev.until > w);
    for (const [key, def] of Object.entries(FREIGHT_EVENTS)) if (!fr.e.some(ev => ev.id === key) && Math.random() < def.yearly / WEEKS_PER_YEAR) startFreightEvent(key);
    const thetaW = 1 - Math.pow(1 - FREIGHT_RULES.theta, 1 / WEEKS_PER_QUARTER);
    for (const id of FREIGHT_IDS) {
        fr.z[id] = fr.z[id] * (1 - thetaW) + FREIGHT_MODES[id].sigma / Math.sqrt(WEEKS_PER_YEAR) * gaussianRandom();
        fr.idx[id] = getFreightFundamental(id) * getFreightDisruption(id) * Math.exp(fr.z[id]);
        fr.qs[id] += fr.idx[id];
    }
    fr.qn++;
}

function startFreightEvent(key) {
    const def = FREIGHT_EVENTS[key], fr = ensureFreightState();
    if (!def) return null;
    const ev = { id: key, until: ensureCommodityState().w + rangeIntCommodity(def.weeks) };
    fr.e.push(ev);
    if (key === 'canal' && typeof foreignIssuers === 'object' && foreignIssuers?.EVG) foreignIssuers.EVG.price = Math.max(0.05, foreignIssuers.EVG.price * 0.92);
    if (key === 'railStrike' && typeof applyPriceEffect === 'function' && typeof stocks !== 'undefined') {
        for (const s of stocks) if (!s.assetType && !s.isBankrupt && s.isStateOwned && getStockSegments(s).some(seg => seg.subsector === 'Lądowy')) applyPriceEffect(s.symbol, -0.03, 'negative', 'market');
    }
    if (typeof logEvent === 'function') logEvent(def.text, 'macro');
    if (typeof pushNews === 'function') pushNews(def.text, null);
    return ev;
}

/** Przy zamknięciu kwartału (processCommoditiesQuarterly): średnia kwartału do Ś8_I. */
function processFreightQuarterly() {
    const fr = ensureFreightState();
    for (const id of FREIGHT_IDS) {
        fr.q[id].push(fr.qn ? fr.qs[id] / fr.qn : fr.idx[id]);
        if (fr.q[id].length > COMMODITY_RULES.trendQuarters) fr.q[id].shift();
        fr.qs[id] = 0;
    }
    fr.qn = 0;
}

function getFreightIndex(id) { return ensureFreightState().idx[id]; }
function getFreightQuarterAvg(id) { const fr = ensureFreightState(); return fr.qn ? fr.qs[id] / fr.qn : fr.idx[id]; }
function getFreightTrend(id) { const a = ensureFreightState().q[id]; return a.reduce((s, v) => s + v, 0) / a.length; }
function getFreightTrendRatio(id) { return getFreightQuarterAvg(id) / getFreightTrend(id); }
/** Czas dostawy (tygodnie, tylko informacja; łańcuchy dostaw od 0.18). */
function getFreightDelivery(id) {
    const [a, b] = FREIGHT_MODES[id].delivery;
    const delay = ensureFreightState().e.reduce((s, ev) => s + (FREIGHT_EVENTS[ev.id]?.mode === id ? FREIGHT_EVENTS[ev.id].delay : 0), 0);
    return [a + delay, b + delay];
}

/** Wpływ frachtu na kwartał spółki: { revenueFactor (mnożnik), marginAdj }. */
function getFreightResultAdj(stock) {
    if (!commodityState?.freight) return { revenueFactor: 1, marginAdj: 0 };
    let revenue = 0, margin = 0;
    const buyerRatio = Object.entries(FREIGHT_RULES.buyerMix).reduce((s, [id, w]) => s + w * getFreightTrendRatio(id), 0);
    for (const seg of getCommoditySegments(stock)) {
        const mode = getSubsectorDef(seg.sector, seg.subsector)?.freight;
        // S5: przewoźnicy krajowi (spółki PL, bez `kind`) +5% wolumenu na +0,15 przepustowości kraju
        const home = !stock.kind && typeof getInfraCarrierFactor === 'function' ? getInfraCarrierFactor(mode) : 1;
        if (mode) revenue += seg.share * (Math.pow(getFreightTrendRatio(mode), FREIGHT_RULES.carrierExp) * home - 1);
        const cost = FREIGHT_SECTOR_COST[seg.sector];
        if (cost) margin -= seg.share * cost * (buyerRatio - 1);
    }
    return { revenueFactor: 1 + revenue, marginAdj: margin };
}

// --- Zapis (pole `fr` w `commodities`) ---
function getFreightSnapshot() {
    const fr = commodityState?.freight;
    if (!fr) return undefined;
    const r = x => Math.round(x * 1e3) / 1e3, map = f => Object.fromEntries(FREIGHT_IDS.map(id => [id, f(id)]));
    return { z: map(id => r(fr.z[id])), i: map(id => r(fr.idx[id])), q: map(id => fr.q[id].map(r)), qs: map(id => r(fr.qs[id])), qn: fr.qn, e: fr.e };
}
function applyFreightSnapshot(snap) {
    const st = ensureCommodityState();
    st.freight = initFreightState(); // stary zapis bez pola: indeks od 100
    if (!snap || typeof snap !== 'object') return;
    const fr = st.freight, num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
    for (const id of FREIGHT_IDS) {
        fr.z[id] = num(snap.z?.[id], 0);
        if (Number(snap.i?.[id]) > 0) fr.idx[id] = Number(snap.i[id]);
        const q = (snap.q?.[id] || []).map(Number).filter(v => v > 0); if (q.length) fr.q[id] = q.slice(-COMMODITY_RULES.trendQuarters);
        fr.qs[id] = Math.max(0, num(snap.qs?.[id], 0));
    }
    fr.qn = Math.max(0, num(snap.qn, 0));
    fr.e = (Array.isArray(snap.e) ? snap.e : []).filter(ev => FREIGHT_EVENTS[ev?.id] && Number.isFinite(ev.until)).map(ev => ({ id: ev.id, until: ev.until }));
}
function checkFreightInvariants() {
    const fr = commodityState?.freight;
    if (!fr) return [];
    return FREIGHT_IDS.filter(id => !(fr.idx[id] > 0) || !Number.isFinite(fr.idx[id])).map(id => `fracht ${id}: indeks ${fr.idx[id]}`);
}

// --- Okno „Rynek”: karty frachtu ---
function renderFreightSection() {
    if (typeof commodityState === 'undefined' || !commodityState) return '';
    ensureFreightState();
    const pct = x => `${x >= 0 ? '▲ +' : '▼ −'}${formatNumberPl(Math.abs(x) * 100, 0)}%`;
    const items = FREIGHT_IDS.map(id => {
        const v = getFreightIndex(id), dev = getFreightTrendRatio(id) - 1, [a, b] = getFreightDelivery(id);
        const ev = ensureFreightState().e.find(e => FREIGHT_EVENTS[e.id].mode === id);
        const cap = getFreightCapacity(id), upper = getInfraCapUpper(id), capText = `${formatNumberPl(cap, 2)} z ${formatNumberPl(upper, 2)}`;
        return `<div class="freight-card">
            <span class="freight-card-head">${uiIcon(`transport-${id}`, 16)} Fracht ${escapeHtml(FREIGHT_MODES[id].name.toLowerCase())}</span>
            <strong>${formatNumberPl(v, 0)}</strong>
            <small>${pct(dev)} vs średnia 8 kw. · dostawa ${a === b ? a : `${a}–${b}`} tyg.</small>
            ${renderLimitMeter(cap / upper * 100, null, `Przepustowość ${capText}`)}
            <small>przepustowość ${capText}</small>
            ${ev ? `<span class="badge badge--warn">${escapeHtml(FREIGHT_EVENTS[ev.id].name)}</span>` : ''}
        </div>`;
    }).join('');
    const oilDev = getCommodityPrice('oil') / getCommodityTrend('oil') - 1;
    return `<div>
        <h4 class="bank-section-title">Indeks frachtu (baza 100)</h4>
        <div class="freight-cards">${items}
            <div class="freight-card"><span class="freight-card-head">${uiIcon('surowiec-oil', 16)} Ropa (paliwo)</span><strong>${formatNumberPl(getCommodityPrice('oil'), 1)} USD</strong><small>${pct(oilDev)} vs średnia 8 kw.</small></div>
        </div>
    </div>`;
}
