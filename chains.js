// =================================================================================
// 0.18.1 P2–P4: BILANS DÓBR (łańcuchy produkcyjne). Czysty moduł: bez DOM i window, wejście to lista jednostek, wynik to stan.
// =================================================================================
// Jednostka = podsektor × kraj (klucz „Sektor/Podsektor|KRAJ”). Aktywność x to indeks łańcuchowy: przychód tych samych spółek kwartał do kwartału
// (wejście i wyjście spółki nie daje skoku). Co kwartał: popyt D_g = Σ A[g][u]·x_u (dobra K: × (1 + rozbudowa)),
// podaż S_g = Σ B[g][u]·min(x_u, c_u)·adj_g, zapas c w kwartałach popytu (cel 0,5), bilans b = (S + import − eksport)/D + (c − c*)/τ (0–3),
// cena wewnętrzna P = P0·b^(−ε) w widełkach 0,5–2 (wygładzona).
// A i B kalibruje pierwszy kwartał (przychody bazowe), więc na starcie b = 1 dla każdego dobra i kraju. Handel: niedobór pokrywa
// nadwyżka innych krajów do limitu przepustowości importu; zdolność producentów nadąża za strukturalnym popytem świata (adj, ok. 30% luki na kwartał,
// bez szoków), więc odchylenia biorą się z szoków i krótkich wahań, a ich średnia w czasie jest zero.
// Tryb cichy (P2): wynik trafia tylko do sondy i zapisu. Włączony (P3): czynnik `factor[jednostka]` zmienia przychód i marżę spółek.

const CHAIN_RULES = {
    eps: 0.5,                 // elastyczność ceny wobec bilansu
    theta: 0.5,               // wygładzenie ceny (część drogi do celu na kwartał)
    priceBand: [0.5, 2.0],
    cover: 0.5,               // cel zapasu w kwartałach popytu
    tau: 2,                   // kwartały rozładowania odchylenia zapasu
    stockCapMult: 3,          // pojemność magazynu: × cel (reszta przepada)
    importHeadroom: 0.5,      // limit importu: (udział importu na starcie + 50%) × bieżący popyt × przepustowość kraju
    trendW: 0.25,             // trend aktywności (EMA) dla zdolności „ponad trend” (capSlack); P2: zdolność świata = bieżący popyt strukturalny (dostosowanie przez cenę i przez trend dawało stały dryf)
    adaptBand: [0.3, 3],
    capSlack: 1.15,           // zdolność ponad trend aktywności
    xBand: [0.2, 5],
    growthBand: [0.6, 1.6],  // zmiana indeksu aktywności w kwartale
    bBand: [0, 3],
    kExpansion: 0.1, kExpansionBand: [-0.3, 0.3], // dobra K: popyt rośnie z rozbudową odbiorców
    historyQ: 40,
    contractExp: -0.3, contractBand: [0.85, 1.15], // sprzężenie z kontraktem: (b_świat)^(−0,3)
    productExp: 0.6,          // producent: przychód × (P/P0)^0,6
    costPass: 0.3,            // odbiorca przerzuca 30% wzrostu kosztu wsadu na ceny
    shortagePass: 0.6,        // niedobór obniża aktywność odbiorcy o (1 − b) × udział wsadu × 0,6
    priorityShortage: 0.3,    // obronność i państwo: niedobór działa w 30%
    outputSplit: { 'Energia/Rafinerie': { fuel: 0.7, chem: 0.3 }, 'Motoryzacja': { cars: 0.7, trucks: 0.3 } }
};
let CHAINS_ACTIVE = true;    // 0.18.1 P3: wpływ na spółki włączony (false = tryb cichy z P2, do porównań)

let chainState = null;       // stan (zapis: pole opcjonalne `chains`)

function resetChainState() { chainState = null; }

/** Jednostki wejścia: [{ key, country, revenue, prev (przychód tej spółki kwartał wcześniej), products: { dobro: przychód } }] → mapa „key|kraj”. Agreguje segmenty spółek. */
function aggregateChainUnits(rows) {
    const units = new Map();
    for (const r of rows) {
        if (!(r.revenue > 0)) continue;
        const id = `${r.key}|${r.country}`;
        const u = units.get(id) || { id, key: r.key, country: r.country, revenue: 0, products: {}, priority: false, linkNow: 0, linkPrev: 0 };
        u.revenue += r.revenue;
        if (r.prev > 0) { u.linkNow += r.revenue; u.linkPrev += r.prev; } // indeks łańcuchowy: tylko spółki z przychodem w obu kwartałach
        for (const [g, v] of Object.entries(r.products || {})) u.products[g] = (u.products[g] || 0) + v;
        if (r.priority) u.priority = true;
        units.set(id, u);
    }
    return units;
}

/** Czy jednostka należy do grupy odbiorców `k` (najbardziej szczegółowa grupa dobra wygrywa). */
function chainGroupOf(good, unitKey) {
    const keys = Object.keys(good.use).filter(k => k !== '*' && k !== '#');
    if (keys.includes(unitKey)) return unitKey;
    const sector = unitKey.split('/')[0];
    return keys.includes(sector) ? sector : null;
}

/** Udział produkcji dobra w przychodzie jednostki (dobra bez kontraktu: z listy producentów; z kontraktem: z profilu surowcowego spółek). */
function chainOutputWeight(good, unit) {
    if (good.contract) return unit.revenue > 0 ? (unit.products[good.id] || 0) / unit.revenue : 0;
    const key = good.producers.includes(unit.key) ? unit.key : null; // producent bez podsektora („Motoryzacja”) to tylko spółki bez podsektora
    if (!key) return 0;
    const split = CHAIN_RULES.outputSplit[key];
    if (split) return split[good.id] || 0;
    const n = GOODS.filter(g => g.active && !g.contract && g.producers.includes(key)).length;
    return n ? 1 / n : 0;
}

/** Kalibracja: przychody bazowe (pierwszy kwartał albo pierwszy kwartał jednostki) → A, B. Na starcie S = D na świecie, a import bazowy domyka kraje. */
function calibrateChains(st, units) {
    const goods = getActiveGoods(), countries = [...new Set([...units.values()].map(u => u.country))].sort();
    for (const u of units.values()) if (!(st.base[u.id] > 0)) st.base[u.id] = u.revenue;
    const list = [...units.values()].filter(u => st.base[u.id] > 0).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const totalByCountry = {}; for (const u of list) totalByCountry[u.country] = (totalByCountry[u.country] || 0) + st.base[u.id];
    const worldTotal = Object.values(totalByCountry).reduce((a, b) => a + b, 0) || 1;
    const G = goods.length, U = list.length, C = countries.length;
    const A = new Float32Array(G * U), B = new Float32Array(G * U), Aext = new Float32Array(G * C);
    goods.forEach((g, gi) => {
        let supply = 0;
        list.forEach((u, ui) => { const w = chainOutputWeight(g, { ...u, revenue: u.revenue }); B[gi * U + ui] = w * st.base[u.id]; supply += B[gi * U + ui]; });
        if (!(supply > 0)) return; // dobro bez producenta w grze: bez bilansu
        const groupTotal = {};
        list.forEach(u => { const k = chainGroupOf(g, u.key); if (k) groupTotal[k] = (groupTotal[k] || 0) + st.base[u.id]; });
        let ext = (g.use['*'] || 0) + (g.use['#'] || 0); // reszta gospodarki i obywatele: według wielkości kraju
        for (const [k, share] of Object.entries(g.use)) if (k !== '*' && k !== '#' && !(groupTotal[k] > 0)) ext += share; // odbiorcy, których nie ma w grze
        list.forEach((u, ui) => { const k = chainGroupOf(g, u.key); if (k && groupTotal[k] > 0) A[gi * U + ui] = g.use[k] * supply * st.base[u.id] / groupTotal[k]; });
        countries.forEach((c, ci) => { Aext[gi * C + ci] = ext * supply * (totalByCountry[c] || 0) / worldTotal; });
    });
    st.cal = { goods: goods.map(g => g.id), units: list.map(u => u.id), countries, A, B, Aext, unitKey: list.map(u => u.key), unitCountry: list.map(u => countries.indexOf(u.country)) };
    st.unitSet = list.map(u => u.id).join(',');
}

function ensureChainGood(st, gid, C, prevCountries) {
    let s = st.g[gid];
    if (!s || s.P.length !== C) {
        const old = s;
        if (old?.P?.length && prevCountries) old.byCountry = Object.fromEntries(prevCountries.map((c, ci) => [c, { P: old.P[ci], adj: old.adj[ci], z: old.z[ci] }])); // dołączył kraj: stan pozostałych zostaje
        s = { fresh: new Uint8Array(C).fill(1), S: new Float32Array(C), D: new Float32Array(C), I: new Float32Array(C), E: new Float32Array(C), z: new Float32Array(C), zV0: new Float32Array(C), zV: new Float32Array(C), b: new Float32Array(C).fill(1), P: new Float32Array(C).fill(1), adj: new Float32Array(C).fill(1), D0: new Float32Array(C), S0: new Float32Array(C), served: new Float32Array(C), waste: new Float32Array(C), bw: 1 };
        if (old?.byCountry) for (const [c, v] of Object.entries(old.byCountry)) { const ci = st.cal.countries.indexOf(c); if (ci >= 0) { s.P[ci] = v.P; s.adj[ci] = v.adj; s.z[ci] = v.z; s.fresh[ci] = 0; } }
        st.g[gid] = s;
    }
    return s;
}

/**
 * Krok kwartału. `rows`: jednostki (aggregateChainUnits), `opts`: { q, capacity: (kraj) → mnożnik importu, shocks: { „key|kraj”: mnożnik zdolności } }.
 * Zwraca stan (`chainState`). Bez efektów ubocznych poza stanem.
 */
function stepChains(rows, opts = {}) {
    const t0 = typeof performance === 'object' ? performance.now() : 0;
    const units = aggregateChainUnits(rows);
    const st = chainState || (chainState = { q: null, base: {}, xPrev: {}, xTrend: {}, lastRev: {}, g: {}, hist: {}, factor: {}, quarters: 0, ms: 0 });
    st.lastRev = st.lastRev || {};
    const ids = [...units.keys()].filter(id => st.base[id] > 0 || units.get(id).revenue > 0).sort().join(',');
    const recal = !st.cal || ids !== st.unitSet, prevCountries = st.cal?.countries;
    if (recal) calibrateChains(st, units);
    const cal = st.cal, U = cal.units.length, C = cal.countries.length, R = CHAIN_RULES;
    const x = new Float32Array(U), cap = new Float32Array(U), dx = new Float32Array(U), tr = new Float32Array(U);
    const actCountry = new Float64Array(C), wCountry = new Float64Array(C), actTrend = new Float64Array(C);
    for (let ui = 0; ui < U; ui++) {
        const id = cal.units[ui], u = units.get(id), base = st.base[id];
        const prevX = st.xPrev[id] ?? 1, last = st.lastRev[id];
        const growth = !u ? 1 : u.linkPrev > 0 ? u.linkNow / u.linkPrev : last > 0 ? u.revenue / last : 1; // bez `prev` w wierszach: przychód jednostki wobec poprzedniego kwartału
        const xi = Math.min(R.xBand[1], Math.max(R.xBand[0], prevX * Math.min(R.growthBand[1], Math.max(R.growthBand[0], growth))));
        if (u) st.lastRev[id] = u.revenue;
        void base;
        x[ui] = xi;
        const trend = st.xTrend[id] ?? xi;
        tr[ui] = trend * (1 - R.trendW) + xi * R.trendW;
        dx[ui] = xi - (st.xPrev[id] ?? xi);
        const inputShort = st.factor?.[id]?.short || 0; // P4: niedobór wsadu w poprzednim kwartale ogranicza zdolność ogniwa (skutek idzie w dół łańcucha z opóźnieniem)
        cap[ui] = (opts.shocks?.[id] ?? opts.shocks?.[`${cal.unitKey[ui]}|*`] ?? 1) * (1 - inputShort) * Math.max(xi, trend) * R.capSlack;
        actCountry[cal.unitCountry[ui]] += xi * base; actTrend[cal.unitCountry[ui]] += tr[ui] * base; wCountry[cal.unitCountry[ui]] += base;
    }
    for (let ci = 0; ci < C; ci++) { actCountry[ci] = wCountry[ci] > 0 ? actCountry[ci] / wCountry[ci] : 1; actTrend[ci] = wCountry[ci] > 0 ? actTrend[ci] / wCountry[ci] : 1; }
    const goods = cal.goods;
    for (let gi = 0; gi < goods.length; gi++) {
        const gid = goods[gi], good = GOOD_BY_ID[gid], s = ensureChainGood(st, gid, C, prevCountries);
        s.S.fill(0); s.D.fill(0);
        let kMult = 1, sTr = 0, dTr = 0, dK = 0;
        for (let ui = 0; ui < U; ui++) {
            const a = cal.A[gi * U + ui], b = cal.B[gi * U + ui], ci = cal.unitCountry[ui];
            if (a) {
                if (good.cls === 'K') kMult = 1 + Math.min(R.kExpansionBand[1], Math.max(R.kExpansionBand[0], R.kExpansion * dx[ui] / good.delta));
                s.D[ci] += a * x[ui] * (good.cls === 'K' ? kMult : 1);
                dTr += a * x[ui]; dK += a * x[ui] * (good.cls === 'K' ? kMult : 1);
            }
            if (b) { s.S[ci] += b * Math.min(x[ui], cap[ui]); sTr += b * x[ui]; } // zdolność bez szoku
        }
        if (good.cls === 'K' && dTr > 0) { const ratio = dK / dTr; s.kEma = s.kEma == null ? ratio : s.kEma * (1 - R.trendW) + ratio * R.trendW; dTr *= s.kEma; } // stała rozbudowa wchodzi w zdolność, skok rozbudowy (efekt byka) — nie
        for (let ci = 0; ci < C; ci++) dTr += cal.Aext[gi * C + ci] * actCountry[ci];
        const adjW = sTr > 0 ? Math.min(R.adaptBand[1], Math.max(R.adaptBand[0], dTr / sTr)) : 1; // zdolność świata = popyt bez szoków i bez rozbudowy (jedna wartość na dobro): odchylenia tylko z szoków, rozbudowy i handlu
        for (let ci = 0; ci < C; ci++) {
            s.D[ci] += cal.Aext[gi * C + ci] * actCountry[ci];
            s.adj[ci] = adjW; s.S[ci] *= adjW;
            if (recal) { s.S0[ci] = s.S[ci] / Math.max(1e-9, s.adj[ci]); s.D0[ci] = s.D[ci]; }
            if (s.fresh[ci]) s.z[ci] = R.cover; // nowe dobro albo kraj (bez stanu z zapisu): zapas = cel (z w kwartałach popytu)
        }
        // handel: świat dzieli niedobór proporcjonalnie (wspólne pokrycie f), kraj z deficytem importuje do limitu przepustowości (porty, szok)
        let availW = 0, demandW = 0;
        for (let ci = 0; ci < C; ci++) { availW += s.S[ci] + (s.z[ci] - R.cover) / R.tau * s.D[ci]; demandW += s.D[ci]; }
        const f = demandW > 0 ? Math.min(1, Math.max(0, availW / demandW)) : 1;
        let surplus = 0, deficit = 0;
        const pos = new Float64Array(C), want = new Float64Array(C);
        for (let ci = 0; ci < C; ci++) {
            const release = (s.z[ci] - R.cover) / R.tau * s.D[ci];
            pos[ci] = s.S[ci] + release - f * s.D[ci]; // nadwyżka ponad udział kraju w pokryciu świata
            if (pos[ci] > 0) surplus += pos[ci];
            else {
                const baseShare = s.D0[ci] > 0 ? Math.max(0, 1 - s.S0[ci] / s.D0[ci]) : 0, capM = opts.capacity ? opts.capacity(cal.countries[ci]) : 1, limit = s.D[ci] * (baseShare * capM + R.importHeadroom * Math.max(0, Math.min(capM, 2 * capM - 1))); // udział importu jak na starcie + zapas przepustowości; szok portów tnie oba
                want[ci] = Math.min(-pos[ci], limit); deficit += want[ci];
            }
        }
        const fill = deficit > 0 ? Math.min(1, surplus / deficit) : 0, exportShare = surplus > 0 ? Math.min(1, deficit / surplus) : 0;
        let sumS = 0, sumD = 0, sumRel = 0;
        for (let ci = 0; ci < C; ci++) {
            s.I[ci] = pos[ci] < 0 ? want[ci] * fill : 0;
            s.E[ci] = pos[ci] > 0 ? pos[ci] * exportShare : 0;
            const D = s.D[ci], avail = s.S[ci] + s.I[ci] - s.E[ci], zV = s.z[ci] * D, release = (s.z[ci] - R.cover) / R.tau * D; // zapas w wartości przy bieżącym popycie
            s.b[ci] = D > 0 ? Math.min(R.bBand[1], Math.max(R.bBand[0], (avail + release) / D)) : 1;
            const served = Math.min(D, Math.max(0, avail + zV));
            let z = zV + avail - served, waste = 0;
            const zcap = R.stockCapMult * R.cover * D;
            if (z > zcap) { waste = z - zcap; z = zcap; }
            s.served[ci] = served; s.waste[ci] = waste; s.zV0[ci] = zV; s.zV[ci] = Math.max(0, z); s.z[ci] = D > 0 ? Math.max(0, z) / D : R.cover;
            const target = Math.min(R.priceBand[1], Math.max(R.priceBand[0], Math.pow(Math.max(1e-3, s.b[ci]), -R.eps)));
            s.P[ci] = s.fresh[ci] ? 1 : s.P[ci] + R.theta * (target - s.P[ci]);
            s.fresh[ci] = 0;
            sumS += s.S[ci]; sumD += D; sumRel += release;
        }
        s.bw = sumD > 0 ? (sumS + sumRel) / sumD : 1;
        const h = st.hist[gid] || (st.hist[gid] = {});
        for (let ci = 0; ci < C; ci++) { const c = cal.countries[ci], arr = h[c] || (h[c] = []); arr.push(Math.round(s.P[ci] * 1000) / 1000); if (arr.length > R.historyQ) arr.shift(); }
    }
    for (let ui = 0; ui < U; ui++) { const id = cal.units[ui]; st.xPrev[id] = x[ui]; st.xTrend[id] = tr[ui]; }
    st.factor = computeChainFactors(st, units);
    st.q = opts.q ?? st.q; st.quarters++;
    st.ms = typeof performance === 'object' ? performance.now() - t0 : 0;
    return st;
}

/** Czynnik jednostki: { rev, margin, short } — producent zyskuje z ceny (bez dóbr z kontraktem: ich cenę liczy giełda towarowa), odbiorca płaci i traci przy niedoborze. */
function computeChainFactors(st, units) {
    const cal = st.cal, U = cal.units.length, R = CHAIN_RULES, out = {};
    for (let ui = 0; ui < U; ui++) {
        const key = cal.unitKey[ui], ci = cal.unitCountry[ui], u = units.get(cal.units[ui]);
        let rev = 0, margin = 0, short = 0;
        const recipeKey = matchChainKey(CHAIN_RECIPES, key), recipe = recipeKey ? CHAIN_RECIPES[recipeKey] : null;
        cal.goods.forEach((gid, gi) => {
            const good = GOOD_BY_ID[gid], s = st.g[gid];
            if (!s || good.contract) return;
            const P = s.P[ci];
            const w = cal.B[gi * U + ui] / Math.max(1e-9, st.base[cal.units[ui]]);
            if (w > 0) rev += w * (Math.pow(P, R.productExp) - 1);
            const share = recipe?.[gid] || 0;
            if (share > 0) {
                margin -= share * (P - 1) * (1 - R.costPass);
                if (good.cls !== 'K') short += share * Math.max(0, 1 - s.b[ci]) * R.shortagePass * (u?.priority ? R.priorityShortage : 1); // P3: brak dobra K przesuwa inwestycję (tylko cena), nie tnie bieżącej produkcji
            }
        });
        out[cal.units[ui]] = { rev, margin, short };
    }
    return out;
}

/** Sprzężenie z kontraktem giełdy towarowej: mnożnik celu M = (b_świat)^(−0,3) w widełkach ±15%. */
function getChainContractFactor(contractId) {
    if (!CHAINS_ACTIVE || !chainState) return 1;
    const good = GOODS.find(g => g.contract === contractId && g.active), s = good ? chainState.g[good.id] : null;
    if (!s) return 1;
    const R = CHAIN_RULES;
    return Math.min(R.contractBand[1], Math.max(R.contractBand[0], Math.pow(Math.max(1e-3, s.bw), R.contractExp)));
}

/** Czynnik dla segmentu spółki (P3): { revenueFactor, marginAdj }; bez stanu albo w trybie cichym — neutralny. */
function getChainFactor(unitKey, country) {
    if (!CHAINS_ACTIVE || !chainState?.factor) return { revenueFactor: 1, marginAdj: 0 };
    const f = chainState.factor[`${unitKey}|${country}`];
    return f ? { revenueFactor: Math.max(0.5, 1 + f.rev - f.short), marginAdj: f.margin } : { revenueFactor: 1, marginAdj: 0 };
}

/** Widok dobra w kraju (UI, sonda): bilans, cena wobec startu, zapas w kwartałach, import i eksport. */
function getChainGoodView(gid, country) {
    const s = chainState?.g?.[gid], ci = chainState?.cal?.countries.indexOf(country);
    if (!s || ci == null || ci < 0) return null;
    return { b: s.b[ci], P: s.P[ci], S: s.S[ci], D: s.D[ci], I: s.I[ci], E: s.E[ci], cover: s.z[ci], bw: s.bw, hist: chainState.hist[gid]?.[country] || [] };
}

/** Zachowanie masy w ostatnim kwartale: S + import − eksport − obsłużony popyt − Δzapas − nadmiar = 0 (zapas w wartości przy popycie kwartału). Największa odchyłka względna. */
function checkChainMass() {
    let worst = 0;
    for (const s of Object.values(chainState?.g || {})) {
        if (!s.zV) continue;
        for (let ci = 0; ci < s.S.length; ci++) {
            const lhs = s.S[ci] + s.I[ci] - s.E[ci] - s.served[ci] - (s.zV[ci] - s.zV0[ci]) - s.waste[ci];
            worst = Math.max(worst, Math.abs(lhs) / Math.max(1e-6, s.D[ci]));
        }
    }
    return worst;
}
function snapshotChainStocks() { return null; } // zgodność: masa liczona wewnątrz kwartału

// --- Zapis (pole opcjonalne `chains`): przychody bazowe, aktywność, ceny, zapasy, dostosowanie podaży, 40 kw. historii ceny ---
function getChainsSnapshot() {
    if (!chainState?.cal) return undefined;
    const r = v => Math.round(v * 1e4) / 1e4, cs = chainState.cal.countries;
    const g = {};
    for (const [gid, s] of Object.entries(chainState.g)) g[gid] = Object.fromEntries(cs.map((c, ci) => [c, { P: r(s.P[ci]), adj: r(s.adj[ci]), z: Number(s.z[ci].toPrecision(5)) }]));
    return { v: 2, lr: Object.fromEntries(Object.entries(chainState.lastRev || {}).map(([k, v]) => [k, Number(Number(v).toPrecision(6))])), q: chainState.q, n: chainState.quarters, base: Object.fromEntries(Object.entries(chainState.base).map(([k, v]) => [k, Number(Number(v).toPrecision(6))])), x: Object.fromEntries(Object.entries(chainState.xPrev).map(([k, v]) => [k, r(v)])), t: Object.fromEntries(Object.entries(chainState.xTrend).map(([k, v]) => [k, r(v)])), g, h: chainState.hist };
}
function applyChainsSnapshot(snap) {
    chainState = null;
    if (!snap || typeof snap !== 'object' || !snap.base) return; // stary zapis: stan buduje pierwszy kwartał
    const num = o => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => Number.isFinite(Number(v))).map(([k, v]) => [k, Number(v)]));
    chainState = { q: Number.isFinite(snap.q) ? snap.q : null, base: num(snap.base), xPrev: num(snap.x), xTrend: num(snap.t), lastRev: num(snap.lr), g: {}, hist: {}, factor: {}, quarters: Number(snap.n) || 0, ms: 0 };
    for (const [gid, byC] of Object.entries(snap.g || {})) if (GOOD_BY_ID[gid]) chainState.g[gid] = { byCountry: Object.fromEntries(Object.entries(byC).map(([c, v]) => [c, { P: Number(v.P) || 1, adj: Number(v.adj) || 1, z: snap.v === 2 && Number(v.z) >= 0 ? Number(v.z) : CHAIN_RULES.cover }])), P: [] };
    for (const [gid, byC] of Object.entries(snap.h || {})) if (GOOD_BY_ID[gid] && byC && typeof byC === 'object') chainState.hist[gid] = Object.fromEntries(Object.entries(byC).filter(([, a]) => Array.isArray(a)).map(([c, a]) => [c, a.map(Number).filter(Number.isFinite).slice(-CHAIN_RULES.historyQ)]));
}
function checkChainInvariants() {
    const problems = [];
    for (const [gid, s] of Object.entries(chainState?.g || {})) {
        if (!s.b || !s.P?.length) continue;
        for (let ci = 0; ci < s.P.length; ci++) {
            if (!Number.isFinite(s.P[ci]) || s.P[ci] < CHAIN_RULES.priceBand[0] - 1e-6 || s.P[ci] > CHAIN_RULES.priceBand[1] + 1e-6) problems.push(`łańcuch ${gid}: cena ${s.P[ci]}`);
            if (!Number.isFinite(s.b[ci]) || !(s.z[ci] >= 0)) problems.push(`łańcuch ${gid}: bilans ${s.b[ci]}, zapas ${s.z[ci]}`);
        }
    }
    return problems;
}

/** 0.18.1 P3 (K6): cykl przemysłu krajów obcych z aktywności jednostek (krótki trend wobec wygładzonego) i udział kraju startowego w przemyśle. */
function getChainIndustryCycle(home) {
    if (!CHAINS_ACTIVE || !chainState?.cal) return null;
    let homeBase = 0, all = 0, fx = 0, ft = 0;
    for (const id of chainState.cal.units) {
        const [key, c] = id.split('|');
        if (!/^(Przemysł|Motoryzacja|Chemia)/.test(key)) continue;
        const b = chainState.base[id] || 0; all += b;
        if (c === home) homeBase += b;
        else { fx += b * (chainState.xPrev[id] ?? 1); ft += b * (chainState.xTrend[id] ?? 1); }
    }
    if (!(all > 0)) return null;
    const ratio = ft > 0 ? fx / ft : 1;
    return { homeShare: homeBase / all, foreign: Math.min(1.15, Math.max(0.85, 1 + 1.5 * (ratio - 1))) };
}
