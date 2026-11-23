// =================================================================================
// 0.18.9 ESG I ETYKA (bez DOM). Plan: plany/plan_0.18.9_esg.md.
// Ocena rzeczywista: trzy filary E, S, G w punktach 0–100, wynik łączny 0,4 E + 0,3 S + 0,3 G, litery A–D.
// Filar z D obniża wynik łączny o co najmniej jedną literę (duży zarzut nie znika w średniej).
// =================================================================================
const ESG_RULES = {
    grades: [['A', 68], ['B', 58], ['C', 42], ['D', -Infinity]], // G0 (diagnoza_esg_0.18.9.md): plan 75/55/35 dawał B 70%; progi z histogramów serii g0
    weights: { e: 0.4, s: 0.3, g: 0.3 },
    // E spółek bez emisji: baza według sektora (praca biurowa i laboratoria czystsze niż transport, turystyka i rolnictwo)
    cleanBySector: { 'Technologia': 72, 'Badania': 72, 'Medycyna': 68, 'Gaming': 70, 'Media': 68, 'Finanse': 64, 'Bankowość': 64, 'Pożyczki konsumenckie': 60, 'Usługi': 60, 'Nieruchomości': 58, 'Turystyka': 50, 'Transport i logistyka': 45, 'Żywność': 52, 'Dobra konsumpcyjne': 55, 'Obronność': 48 },
    e: { clean: 60, cleanCut: 30, base: 60, slope: 40, heat: 8, legacy: 15, minBase: 0.05 },
    s: { noWorkforce: 60, satBase: 30, satMult: 0.5, grey: 200, caught: 25, caughtQ: 8, strike: 10, exploit: 10, social: 10 },
    // G: cechy prezesa (poza EXPLOIT_CEO_TRAITS, które dają −20)
    gTraits: { sklonny_do_korupcji: -8, skompromitowany: -12, cwaniak: -5, wladca_marionetek: -8, mistrz_marionetek: -8, ulubieniec_rzadu: -5, rekin: -4, ksiegowy: 5, stoik: 5, filar_w_branzy: 5, legenda: 6, niezalezny: 6, oddany: 3, emerytowany_policjant: 5, lojalny_pracownikom: 4 },
    g: { base: 62, exploitCeo: 20, bribe: 30, bribeQ: 8, knf: 15, tender: 10, lowFloat: 0.15, lowFloatCut: 5, linkedD: 10 }
};
const ESG_GRADE_ORDER = ['A', 'B', 'C', 'D'];
const esgGrade = points => ESG_RULES.grades.find(([, min]) => points >= min)[0];
const esgQuarter = () => typeof macro === 'object' && macro ? macro.quarter : 0;
const clampEsg = v => Math.max(0, Math.min(100, v));

function getEsgE(stock) {
    const r = ESG_RULES.e, segs = typeof getStockSegments === 'function' ? getStockSegments(stock) : [];
    const base = segs.reduce((t, seg) => {
        const power = seg.sector === 'Energia' && stock.power && !ENERGY_NO_POWER_SUBSECTORS.includes(seg.subsector);
        return t + seg.share * (power ? SECTOR_EMISSIONS.Energia : SECTOR_EMISSIONS[seg.sector] || 0);
    }, 0);
    const own = typeof getStockEmissionFactor === 'function' ? getStockEmissionFactor(stock) : 0;
    const cleanBase = () => { const t = segs.reduce((a, seg) => a + seg.share, 0) || 1; return segs.reduce((a, seg) => a + seg.share * (ESG_RULES.cleanBySector[seg.subsector] ?? ESG_RULES.cleanBySector[seg.sector] ?? r.clean), 0) / t || r.clean; };
    let e = base < r.minBase ? cleanBase() + r.cleanCut * getStockEcoCut(stock) : r.base + r.slope * (1 - own / base);
    e -= r.heat * (Number(stock.ecoHeat) || 0);
    if (stock.esg) e += r.legacy; // migracja: stara ścieżka ESG
    return clampEsg(e + (Number(stock.esgBonus?.e) || 0));
}
function getEsgS(stock) {
    const r = ESG_RULES.s, wf = stock.workforce;
    if (!wf) return clampEsg(r.noWorkforce + (Number(stock.esgBonus?.s) || 0));
    const q = typeof getWorkforceQuarter === 'function' ? getWorkforceQuarter() : esgQuarter();
    let s = r.satBase + r.satMult * (Number(wf.satisfaction) || 0) - r.grey * (typeof getGreyShare === 'function' ? getGreyShare(stock) : 0);
    if (wf.greyCaughtQuarter != null && q - wf.greyCaughtQuarter < r.caughtQ) s -= r.caught;
    if (wf.strike) s -= r.strike;
    if (wf.policy === 'exploit') s -= r.exploit; else if (wf.policy === 'social') s += r.social;
    return clampEsg(s + (Number(stock.esgBonus?.s) || 0));
}
function getEsgGBase(stock) {
    const r = ESG_RULES.g, q = esgQuarter();
    let g = r.base;
    const traits = stock.ceo?.traits || [];
    if (traits.some(t => EXPLOIT_CEO_TRAITS.includes(t.id))) g -= r.exploitCeo;
    for (const t of traits) g += ESG_RULES.gTraits[t.id] || 0;
    if (typeof getRatings === 'function' && getRatings(stock).some(x => x.revealed && q - (Number(x.until) || 0) < r.bribeQ)) g -= r.bribe;
    if ((Number(stock.knfBanUntil) || -1) > q) g -= r.knf;
    if (stock.knfTenderCase) g -= r.tender;
    const ff = typeof getFreeFloatShares === 'function' && stock.totalShares > 0 ? getFreeFloatShares(stock) / stock.totalShares : 1;
    if (ff < r.lowFloat) g -= r.lowFloatCut;
    return clampEsg(g + (Number(stock.esgBonus?.g) || 0));
}
function combineEsg(e, s, g) {
    const w = ESG_RULES.weights, score = w.e * e + w.s * s + w.g * g;
    let grade = esgGrade(score);
    if ([e, s, g].some(v => esgGrade(v) === 'D') && grade !== 'D') grade = ESG_GRADE_ORDER[Math.min(3, ESG_GRADE_ORDER.indexOf(grade) + 1)];
    return { score, grade };
}

// shortcut: pamięć na kwartał; zmiany w trakcie kwartału działają od następnego (jak emissionCache)
let esgCache = { quarter: null, base: new WeakMap(), full: new WeakMap() };
function clearEsgCache() { esgCache = { quarter: null, base: new WeakMap(), full: new WeakMap() }; }
function esgCacheFor() { const q = esgQuarter(); if (esgCache.quarter !== q) esgCache = { quarter: q, base: new WeakMap(), full: new WeakMap() }; return esgCache; }
/** Ocena bez powiązań (do kary „współpraca z nieetycznymi” bez rekurencji). */
function getEsgBase(stock) {
    const c = esgCacheFor(); let v = c.base.get(stock);
    if (!v) { const e = getEsgE(stock), s = getEsgS(stock), g = getEsgGBase(stock); v = { e, s, g, ...combineEsg(e, s, g) }; c.base.set(stock, v); }
    return v;
}
/** Ocena rzeczywista: filary, wynik łączny i litery; powiązania (matka, zależne) z D obniżają G. */
function getEsgTrue(stock) {
    if (!stock || stock.assetType || stock.isBankStock) return null;
    const c = esgCacheFor(); let v = c.full.get(stock);
    if (v) return v;
    const b = getEsgBase(stock);
    const linked = stocks.filter(x => x !== stock && !x.assetType && !x.isBankrupt && (x.symbol === stock.isSubsidiaryOf || x.isSubsidiaryOf === stock.symbol));
    const g = linked.some(x => getEsgBase(x).grade === 'D') ? clampEsg(b.g - ESG_RULES.g.linkedD) : b.g;
    v = { e: b.e, s: b.s, g, ...combineEsg(b.e, b.s, g), eg: esgGrade(b.e), sg: esgGrade(b.s), gg: esgGrade(g) };
    c.full.set(stock, v);
    return v;
}
