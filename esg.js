// =================================================================================
// 0.18.9 ESG I ETYKA (bez DOM). Plan: plany/plan_0.18.9_esg.md.
// Ocena rzeczywista: trzy filary E, S, G w punktach 0–100, wynik łączny 0,4 E + 0,3 S + 0,3 G, litery A–D.
// Filar z D obniża wynik łączny o co najmniej jedną literę (duży zarzut nie znika w średniej).
// =================================================================================
const ESG_RULES = {
    grades: [['A', 70], ['B', 60], ['C', 42], ['D', -Infinity]], // G0 (diagnoza_esg_0.18.9.md): plan 75/55/35 dawał B 70%; progi z histogramów serii g0; A 68 → 70 po g4 (A publiczne 30%), B 58 → 60 po g5 (C publiczne 16–24%, cel 25–40%)
    weights: { e: 0.4, s: 0.3, g: 0.3 },
    // E spółek bez emisji: baza według sektora (praca biurowa i laboratoria czystsze niż transport, turystyka i rolnictwo)
    cleanBySector: { 'Technologia': 72, 'Badania': 72, 'Medycyna': 68, 'Gaming': 70, 'Media': 68, 'Finanse': 64, 'Bankowość': 64, 'Pożyczki konsumenckie': 60, 'Usługi': 60, 'Nieruchomości': 58, 'Turystyka': 50, 'Transport i logistyka': 45, 'Żywność': 52, 'Dobra konsumpcyjne': 55, 'Obronność': 48 },
    e: { clean: 60, cleanCut: 30, base: 60, slope: 40, heat: 8, legacy: 15, minBase: 0.05 },
    s: { noWorkforce: 60, satBase: 30, satMult: 0.5, grey: 150, caught: 25, caughtQ: 8, strike: 10, exploit: 10, social: 10 },
    // G: cechy prezesa (poza EXPLOIT_CEO_TRAITS, które dają −20)
    gTraits: { sklonny_do_korupcji: -8, skompromitowany: -12, cwaniak: -5, wladca_marionetek: -8, mistrz_marionetek: -8, ulubieniec_rzadu: -5, rekin: -4, ksiegowy: 5, stoik: 5, filar_w_branzy: 5, legenda: 6, niezalezny: 6, oddany: 3, emerytowany_policjant: 5, lojalny_pracownikom: 4, etyk: 8, ignorant: -8 },
    g: { base: 62, exploitCeo: 20, bribe: 30, bribeQ: 8, knf: 15, tender: 10, lowFloat: 0.15, lowFloatCut: 5, linkedD: 10 }
};
const ESG_GRADE_ORDER = ['A', 'B', 'C', 'D'];
const esgGrade = points => ESG_RULES.grades.find(([, min]) => points >= min)[0];
/** G3: mnożnik szansy na ścieżkę ESG i projekty środowiskowe według cech prezesa. */
const getCeoEsgFactor = stock => hasCeoTrait(stock, 'ekolog') ? 3 : hasCeoTrait(stock, 'ignorant') || hasCeoTrait(stock, 'konserwatysta') ? 0.3 : 1;
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
    if (stock.esgPenalty && q - stock.esgPenalty.q < ESG_REG_RULES.gCutQ) g -= ESG_REG_RULES.gCut; // G9: kara za greenwashing
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

// ---------------------------------------------------------------------------------
// G1: ocena publiczna, pokrycie, deklaracje i greenwashing.
// Ocena publiczna: losowy audytor z ESG (G2) z szumem ±1 litera, ważna 4 kw.; bez ważnej oceny → null („brak oceny”).
// Pokrycie: Platynowa i elitarne zawsze, Złota co rok, Srebrna z szansą 30% na rok (G1: plan Złota 50% dawał pokrycie 28%), niższe tylko przy deklaracji.
// Deklaracja: uczciwie przy rzeczywistym A/B; greenwashing przy C/D (presja U7, spadek kursu); audytor daje się zwieść z szansą 15%.
// ---------------------------------------------------------------------------------
const ESG_PUBLIC_RULES = {
    validQ: 4, noise: 0.2, fooled: 0.15, pillarNoise: 5,
    goldYear: 1, silverYear: 0.5, topTiers: ['PLATINUM', 'RUBY', 'EMERALD', 'DIAMOND'],
    claim: { A: 0.12, B: 0.06 }, green: 0.0015, greenPressure: 1, greenDrop: 2, dropFrom: -0.2, withdraw: 0.4
};
const ESG_TIERS = ['JUNK', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'RUBY', 'EMERALD', 'DIAMOND']; // krajowe poziomy (ESG krajowe w 0.18.9)
const esgShift = (grade, d) => ESG_GRADE_ORDER[Math.max(0, Math.min(3, ESG_GRADE_ORDER.indexOf(grade) + d))];
const esgRound = v => Math.round(clampEsg(v));
/** Audyt ESG: zapisuje ocenę publiczną (`stock.esgRating`). */
function auditEsg(stock, auditor = pickEsgAuditor()) {
    const t = getEsgTrue(stock); if (!t || !auditor) return null;
    const r = ESG_PUBLIC_RULES, q = esgQuarter(), n = () => (Math.random() * 2 - 1) * r.pillarNoise;
    let grade = t.grade;
    if (Math.random() < r.noise) grade = esgShift(grade, Math.random() < 0.5 ? -1 : 1);
    const fooled = Boolean(stock.ethicsClaim) && ['C', 'D'].includes(t.grade) && Math.random() < r.fooled;
    if (fooled) grade = esgShift(grade, -1);
    stock.esgRating = { grade, e: esgRound(t.e + n()), s: esgRound(t.s + n()), g: esgRound(t.g + n()), q, until: q + r.validQ, auditor, ...(fooled ? { fooled: true } : {}) };
    return stock.esgRating;
}
/** Ocena publiczna (litera) albo null. */
function getEsgRating(stock) {
    if (!stock || stock.assetType) return null;
    const r = stock.esgRating;
    return r && esgQuarter() < r.until ? r.grade : null;
}
const isEsgGreenwashing = stock => Boolean(stock?.ethicsClaim) && ['C', 'D'].includes(getEsgTrue(stock)?.grade);
function needsEsgAudit(stock) {
    if (getEsgRating(stock)) return false;
    if (ESG_PUBLIC_RULES.topTiers.includes(stock.exchange) || stock.ethicsClaim) return true;
    const year = stock.exchange === 'GOLD' ? ESG_PUBLIC_RULES.goldYear : stock.exchange === 'SILVER' ? ESG_PUBLIC_RULES.silverYear : 0;
    return year > 0 && Math.random() < 1 - Math.pow(1 - year, 0.25);
}
/** Zmiana kursu od początku roku (`stock.esgPx`: cena z kwartału podzielnego przez 4). */
function getEsgPriceDrop(stock) { const px = Number(stock.esgPx); return px > 0 ? stock.price / px - 1 : 0; }
/** Deklaracje etyki: uczciwe przy A/B, greenwashing przy C/D; wycofanie po spadku oceny rzeczywistej. */
function updateEthicsClaim(stock) {
    const r = ESG_PUBLIC_RULES, t = getEsgTrue(stock); if (!t) return;
    if (stock.ethicsClaim) {
        if (['C', 'D'].includes(t.grade) && !stock.ethicsClaim.green && Math.random() < r.withdraw) delete stock.ethicsClaim;
        return;
    }
    if (r.claim[t.grade]) { if (Math.random() < r.claim[t.grade]) stock.ethicsClaim = { q: esgQuarter() }; return; }
    if (hasCeoTrait(stock, 'etyk')) return; // G3: etyk nie udaje
    const ign = hasCeoTrait(stock, 'ignorant') ? 2 : 1;
    const p = typeof getEcoPressure === 'function' ? getEcoPressure() / 100 : 0, drop = getEsgPriceDrop(stock) < r.dropFrom ? r.greenDrop : 1;
    if (Math.random() < r.green * (1 + r.greenPressure * ign * p) * drop) stock.ethicsClaim = { q: esgQuarter(), green: true };
}
/** Co kwartał: deklaracje i audyty ESG (pokrycie). */
function processEsgQuarterly() {
    if (esgQuarter() % 4 === 0 && esgQuarter() > 0) processEsgAuditorsYearly(); // G2
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt || stock.isBankStock || !ESG_TIERS.includes(stock.exchange)) continue;
        updateEthicsClaim(stock);
        processEsgProjects(stock);
        if (esgQuarter() % 4 === 0 || !stock.esgPx) stock.esgPx = +Number(stock.price).toPrecision(4);
        if (needsEsgAudit(stock)) auditEsg(stock);
    }
    applyEsgDemandQuarterly(); // G5
    if (typeof playerFund === 'object' && playerFund) processEthicalFundQuarterly(); // G6
    processRateUStudies(); // G7
    processEsgRegulationQuarterly(); // G9
}

// ---------------------------------------------------------------------------------
// G2 (zmiana użytkownika 2026-11-23): na starcie jeden losowy audytor nigdy nie bada ESG (`noEsg`), dwóch losowych z pozostałych bada.
// Raz w roku każdy inny audytor bez ESG dołącza z szansą 10% (wpis w Gazecie), najwyżej 5 z ESG. Audytor z ESG przy audycie
// kredytowym wystawia ocenę ESG i dolicza ryzyko ESG. Stan: ratingState.esgAuditors, .noEsg, .esgJoin { id: kwartał }.
const ESG_AUDITOR_RULES = { start: 2, joinYear: 0.1, max: 5 };
const shuffleEsg = list => list.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
/** Losuje audytorów z ESG i `noEsg`; `migrate` (stary zapis bez pól): aud2 z ESG plus jeden losowy, noEsg spośród pozostałych. */
function initEsgAuditors(state, migrate = false) {
    const ids = AUDITORS.map(a => a.id);
    if (Array.isArray(state.esgAuditors) && state.esgAuditors.length && ids.includes(state.noEsg)) { state.esgJoin = state.esgJoin || {}; return state; }
    if (migrate) {
        const other = shuffleEsg(ids.filter(id => id !== 'aud2'));
        state.esgAuditors = ['aud2', other[0]]; state.noEsg = other[1];
    } else {
        const all = shuffleEsg(ids);
        state.noEsg = all[0]; state.esgAuditors = all.slice(1, 1 + ESG_AUDITOR_RULES.start);
    }
    state.esgJoin = state.esgJoin || {};
    return state;
}
const getEsgAuditorIds = () => (typeof ratingState === 'object' && ratingState ? initEsgAuditors(ratingState, true).esgAuditors : []);
const isEsgAuditor = id => getEsgAuditorIds().includes(id);
/** Raz w roku: audytorzy bez ESG (poza noEsg) dołączają z szansą 10%, do 5. */
function processEsgAuditorsYearly() {
    const st = initEsgAuditors(ratingState, true), q = esgQuarter(), joined = [];
    for (const a of shuffleEsg(AUDITORS)) {
        if (st.esgAuditors.length >= ESG_AUDITOR_RULES.max) break;
        if (a.id === st.noEsg || st.esgAuditors.includes(a.id) || Math.random() >= ESG_AUDITOR_RULES.joinYear) continue;
        st.esgAuditors.push(a.id); st.esgJoin[a.id] = q; joined.push(a.id);
        const text = `${a.name} od teraz bada także ESG: przy audycie wystawia ocenę środowiska, społeczeństwa i ładu korporacyjnego.`;
        if (typeof logEvent === 'function') logEvent(text, 'company');
        if (typeof pushNews === 'function') pushNews(text);
    }
    return joined;
}
/** Losowy audytor z ESG (bez zakazu licencji) do corocznego audytu ESG. */
function pickEsgAuditor() {
    const q = esgQuarter(), ids = getEsgAuditorIds().filter(id => !(ratingState?.banned?.[id] > q));
    return ids.length ? ids[Math.floor(Math.random() * ids.length)] : null;
}
// ---------------------------------------------------------------------------------
const ESG_CREDIT_RULES = { A: [1, 1], B: [0, 0], C: [-1, 0.5], D: [-2, 1], gD: -2 }; // g4: plan (A +1 z 50%, C −1) dawał średnio −0,28 stopnia → A zawsze +1, C −1 z 50%
/** Zmiana oceny kredytowej (stopnie) z oceny ESG audytora; D w filarze G zawsze −2. */
function getEsgCreditAdj(esg) {
    if (!esg) return 0;
    const [d, p] = ESG_CREDIT_RULES[esg.grade] || [0, 0];
    const adj = esgGrade(esg.g) === 'D' ? ESG_CREDIT_RULES.gD : d && Math.random() < p ? d : 0;
    if (typeof ratingState === 'object' && ratingState?.stats) { ratingState.stats.esgAdj = (ratingState.stats.esgAdj || 0) + adj; ratingState.stats.esgAdjN = (ratingState.stats.esgAdjN || 0) + 1; }
    return adj;
}

// ---------------------------------------------------------------------------------
// G4: droga do etyki. (a) ścieżka ESG (energy.js) zostaje; (b) ulepszenie eko po zakończeniu inwestycji produkcyjnej
// (+20% kosztu pozycji, ecoCut +5%, razem do ecoMax); (c) brak szarej strefy działa przez filar S;
// (d) projekty ESG: filar, koszt jako udział rocznego przychodu, czas, przyrost filaru (stock.esgBonus, do 20 na filar).
// ---------------------------------------------------------------------------------
// Liczby z makiety 36 (zaakceptowana 2026-11-23); kalibracja w G11. Ikony z UI_ICON_PATHS.
const ESG_PROJECTS = [
    { id: 'forest', name: 'Nasadzenia leśne', pillar: 'e', cost: 0.005, q: 2, gain: [4, 4], icon: 'lisc', text: 'Las wokół zakładów.' },
    { id: 'wastewater', name: 'Oczyszczalnia ścieków', pillar: 'e', cost: 0.02, q: 4, gain: [8, 8], incidentMult: 0.7, emitOnly: true, icon: 'emisje', text: 'Własna oczyszczalnia przy fabryce.', extra: 'incydenty ekologiczne o 30% rzadsze' },
    { id: 'solar_roofs', name: 'Panele na dachach zakładów', pillar: 'e', cost: 0.03, q: 3, gain: [6, 6], ecoCut: 0.03, emitOnly: true, icon: 'slonce', text: 'Energia ze słońca na własne potrzeby.', extra: 'emisje niższe o 3 pp' },
    { id: 'recycling', name: 'Recykling opakowań', pillar: 'e', cost: 0.01, q: 2, gain: [5, 5], icon: 'odswiez', text: 'Zwrot i przerób opakowań.' },
    { id: 'community', name: 'Program dla lokalnej społeczności', pillar: 's', cost: 0.005, q: 2, gain: [5, 5], icon: 'serce', text: 'Dofinansowanie szkół i klubów.' },
    { id: 'internships', name: 'Szkolenia i staże', pillar: 's', cost: 0.01, q: 4, gain: [6, 6], satisfaction: 3, icon: 'pracownik', text: 'Staże i kursy dla pracowników.', extra: 'zadowolenie pracowników +3' },
    { id: 'foundation', name: 'Fundacja edukacyjna', pillar: 's', cost: 0.015, q: 4, gain: [8, 8], icon: 'akademia', text: 'Stypendia w regionie.' },
    { id: 'supply_audit', name: 'Audyt łańcucha dostaw', pillar: 'g', cost: 0.008, q: 2, gain: [6, 6], icon: 'lancuch', text: 'Sprawdzenie dostawców i partnerów.', extra: 'ujawnia powiązania ze spółkami D' },
    { id: 'anticorruption', name: 'Program antykorupcyjny', pillar: 'g', cost: 0.01, q: 3, gain: [10, 10], icon: 'waga', text: 'Procedury, szkolenia, sygnaliści.' }
];
const ESG_PROJECT_RULES = { maxBonus: 20, yearChance: 0.025, pressure: 1, claimBoost: 1.5, cashFloor: 2, keepDone: 3, ecoUpgradeShare: 0.2, ecoUpgradeCut: 0.05, ecoUpgradeChance: 0.4 }; // g4: 6%/rok dawało 45% spółek z projektem po 20 latach (cel 10–25%)
const ECO_UPGRADE_IDS = ['new_factory', 'new_mine', 'chip_factory', 'pharma_factory', 'energy_plant', 'food_processing_plant', 'production_facility', 'textile_factory', 'electronics_assembly', 'brewery', 'industrial_park'];
const getEsgProject = id => ESG_PROJECTS.find(p => p.id === id) || null;
const getEsgProjectCost = (stock, p) => Math.max(10000, Math.round(getStockRevenue(stock) * p.cost));
const isEsgEmitter = stock => getStockSegments(stock).some(seg => (SECTOR_EMISSIONS[seg.sector] || 0) > 0);
/** Mnożnik cech prezesa dla filaru projektu (G3): ekolog E ×3, etyk S i G ×2, ignorant ×0,3. */
function getCeoProjectFactor(stock, pillar) {
    if (hasCeoTrait(stock, 'ignorant')) return 0.3;
    if (pillar === 'e') return getCeoEsgFactor(stock);
    return hasCeoTrait(stock, 'etyk') ? 2 : 1;
}
function canStartEsgProject(stock, p) {
    if (!stock || !p || stock.isBankrupt || stock.assetType || stock.isBankStock) return false;
    if ((stock.esgProjects || []).some(x => x.id === p.id && !x.done)) return false;
    if (p.emitOnly && !isEsgEmitter(stock)) return false;
    return (Number(stock.esgBonus?.[p.pillar]) || 0) < ESG_PROJECT_RULES.maxBonus;
}
/** Projekt dla bota: najwyższy „zysk z oceny ESG / koszt” (bez losowania). Zysk = przyrost × waga filaru × cechy prezesa, ×2 dla najsłabszego filaru. */
function pickEsgProject(stock) {
    const t = getEsgTrue(stock); if (!t) return null;
    const weakest = ['e', 's', 'g'].sort((a, b) => t[a] - t[b])[0];
    return ESG_PROJECTS.filter(p => canStartEsgProject(stock, p))
        .map(p => ({ p, v: (p.gain[0] + p.gain[1]) / 2 * ESG_RULES.weights[p.pillar] * getCeoProjectFactor(stock, p.pillar) * (p.pillar === weakest ? 2 : 1) / getEsgProjectCost(stock, p) }))
        .sort((a, b) => b.v - a.v)[0]?.p || null;
}
function payEsgCost(stock, cost, label) {
    if (typeof ensureCompanyCash === 'function') ensureCompanyCash(stock, cost, `Kredyt: ${label}`);
    adjustCompanyCash(stock, -cost);
    if (typeof adjustBalanceSheet === 'function') adjustBalanceSheet(stock, { assets: -cost, retainedEarnings: -cost });
    if (typeof coverNegativeCash === 'function') coverNegativeCash(stock);
    if (typeof recordPayment === 'function') recordPayment(stock, 'external:dostawcy_inwestycji', cost, label);
}
/** Start projektu ESG (bot albo większościowiec). Zwraca wpis projektu albo null. */
function startEsgProject(stock, id, by = 'ai') {
    const p = getEsgProject(id); if (!canStartEsgProject(stock, p)) return null;
    const cost = getEsgProjectCost(stock, p), q = esgQuarter();
    payEsgCost(stock, cost, `Projekt ESG: ${p.name}`);
    const gain = Math.round(p.gain[0] + Math.random() * (p.gain[1] - p.gain[0]));
    const entry = { id: p.id, pillar: p.pillar, gain, cost, q, until: q + p.q, by };
    (stock.esgProjects = stock.esgProjects || []).push(entry);
    if (typeof logEvent === 'function') logEvent(`${stock.name} rozpoczyna projekt ESG: ${p.name} (${formatZl(cost, 0)}, ${p.q} kw.).`, 'company');
    return entry;
}
function finishEsgProject(stock, entry) {
    const p = getEsgProject(entry.id); entry.done = true;
    const b = stock.esgBonus = stock.esgBonus || {};
    b[entry.pillar] = Math.min(ESG_PROJECT_RULES.maxBonus, (Number(b[entry.pillar]) || 0) + entry.gain);
    if (p?.ecoCut) { stock.ecoCut = (Number(stock.ecoCut) || 0) + p.ecoCut; if (typeof clearEmissionCache === 'function') clearEmissionCache(); }
    if (p?.incidentMult) stock.ecoIncidentMult = p.incidentMult;
    if (p?.id === 'supply_audit' && typeof logEvent === 'function') { const bad = stocks.filter(x => x !== stock && (x.symbol === stock.isSubsidiaryOf || x.isSubsidiaryOf === stock.symbol) && getEsgBase(x).grade === 'D'); if (bad.length) logEvent(`${stock.name}: audyt łańcucha dostaw ujawnia powiązania ze spółkami ocenianymi na D (${bad.map(x => x.symbol).join(', ')}).`, 'company'); }
    if (p?.satisfaction && stock.workforce) stock.workforce.satisfaction = Math.min(100, (Number(stock.workforce.satisfaction) || 0) + p.satisfaction);
    stock.esgProjectsDone = (Number(stock.esgProjectsDone) || 0) + 1;
}
/** Co kwartał: kończy projekty, boty zaczynają nowe (szansa roczna × presja × deklaracja, potem cechy prezesa). */
function processEsgProjects(stock) {
    const q = esgQuarter(), list = stock.esgProjects;
    if (list?.length) {
        for (const x of list) if (!x.done && q >= x.until) finishEsgProject(stock, x);
        const done = list.filter(x => x.done);
        if (done.length > ESG_PROJECT_RULES.keepDone) stock.esgProjects = list.filter(x => !x.done || done.indexOf(x) >= done.length - ESG_PROJECT_RULES.keepDone);
    }
    if (typeof canFundControlAgm === 'function' && canFundControlAgm(stock)) return; // spółką gracza steruje gracz
    if ((stock.esgProjects || []).some(x => !x.done)) return;
    const r = ESG_PROJECT_RULES, p = typeof getEcoPressure === 'function' ? getEcoPressure() / 100 : 0;
    const chance = (1 - Math.pow(1 - r.yearChance, 0.25)) * (1 + r.pressure * p) * (stock.ethicsClaim ? r.claimBoost : 1);
    if (Math.random() >= chance) return;
    const pick = pickEsgProject(stock); if (!pick) return;
    if (Math.random() >= Math.min(1, getCeoProjectFactor(stock, pick.pillar) / 2)) return; // cechy prezesa: ekolog i etyk zawsze, zwykły co drugi raz, ignorant rzadko
    if ((Number(stock.cash) || 0) < getEsgProjectCost(stock, pick) * r.cashFloor) return;
    startEsgProject(stock, pick.id);
}
/** (b) Ulepszenie eko: wołane z finishInvestment; bot decyduje od razu, gracz w UI (makieta 36). */
function canEcoUpgrade(stock, project) { return Boolean(stock && project && ECO_UPGRADE_IDS.includes(project.id) && !project.ecoDone && getStockEcoCut(stock) < ENERGY_OFFICE_RULES.ecoMax); }
function ecoUpgradeInvestment(stock, project) {
    if (!canEcoUpgrade(stock, project)) return false;
    const item = typeof getCatalogEntryById === 'function' ? getCatalogEntryById(project.id) : null;
    const cost = Math.round((Number(project.cost) || Number(item?.cost) || 0) * ESG_PROJECT_RULES.ecoUpgradeShare);
    if (!(cost > 0)) return false;
    payEsgCost(stock, cost, `Ulepszenie eko: ${project.name || item?.name || project.id}`);
    stock.ecoCut = (Number(stock.ecoCut) || 0) + ESG_PROJECT_RULES.ecoUpgradeCut; project.ecoDone = true;
    stock.ecoUpgrades = (Number(stock.ecoUpgrades) || 0) + 1;
    if (typeof clearEmissionCache === 'function') clearEmissionCache();
    return true;
}
function onInvestmentFinishedEsg(stock, project) {
    if (!canEcoUpgrade(stock, project)) return;
    const own = stock.ecoOrders || [];
    if (own.includes(project.id)) { stock.ecoOrders = own.filter(id => id !== project.id); if (!stock.ecoOrders.length) delete stock.ecoOrders; ecoUpgradeInvestment(stock, project); return; } // wersja eko zamówiona przez gracza (makieta 36)
    if (typeof canFundControlAgm === 'function' && canFundControlAgm(stock)) return;
    const p = typeof getEcoPressure === 'function' ? getEcoPressure() / 100 : 0;
    if (Math.random() < ESG_PROJECT_RULES.ecoUpgradeChance * getCeoProjectFactor(stock, 'e') * (1 + p)) ecoUpgradeInvestment(stock, project);
}

// ---------------------------------------------------------------------------------
// G5: popyt inwestorów według oceny publicznej (A +1,5%, B 0, C −1,5%, D −3% rocznie, co kwartał 1/4).
// Średnia zero: składnik liczony względem średniej ważonej kapitalizacją ocenionych spółek, więc nie przesuwa GIG.
// Spółki bez oceny: 0. Kurs zmienia się bezpośrednio (jak wpływ zlecenia botów w ai.js), bez wydarzenia.
// ---------------------------------------------------------------------------------
const ESG_DEMAND_RULES = { A: 0.01, B: 0, C: -0.01, D: -0.02 }; // g5: plan (+1,5 / −1,5 / −3%) dawał różnicę zwrotu A–D ok. 7 pp rocznie (cel 2–5)
/** Kwartalne zmiany kursu z popytu ESG: [{ stock, d }]; suma d × kapitalizacja = 0. */
function getEsgDemandShifts() {
    const { top, bottom } = getRateURanking(), impulse = s => top.includes(s) ? ESG_RATEU_RULES.topImpulse : bottom.includes(s) ? ESG_RATEU_RULES.bottomImpulse : 0; // G7: publikacja RateU (część składnika G5, nie dodatek)
    const rated = stocks.filter(s => ESG_TIERS.includes(s.exchange) && !s.isBankrupt && !s.assetType && getEsgRating(s))
        .map(s => ({ stock: s, cap: Math.max(0, s.price * s.totalShares), c: (ESG_DEMAND_RULES[getEsgRating(s)] || 0) / 4 + impulse(s) }));
    const w = rated.reduce((t, x) => t + x.cap, 0); if (!(w > 0)) return [];
    const mean = rated.reduce((t, x) => t + x.cap * x.c, 0) / w;
    return rated.map(x => ({ stock: x.stock, d: x.c - mean }));
}
function applyEsgDemandQuarterly() {
    const shifts = getEsgDemandShifts();
    for (const { stock, d } of shifts) if (d) stock.price = Math.max(0.01, stock.price * (1 + d));
    return shifts;
}

// ---------------------------------------------------------------------------------
// G4 (makieta 36): gracz z większością zleca projekt od razu; z głosami, ale bez większości, zgłasza go jako uchwałę na walnym.
// ---------------------------------------------------------------------------------
const ESG_WORD = { A: 'etyczna', B: 'pojedyncze zarzuty', C: 'nieetyczna', D: 'duże zarzuty' };
const ESG_PILLAR_NAMES = { e: 'Środowisko', s: 'Społeczeństwo', g: 'Ład korporacyjny' };
const getEsgProjectSize = pts => pts >= 9 ? 'duży' : pts >= 5 ? 'średni' : 'mały';
/** Projekty ESG zgłoszone przez fundusz na walne (czekają na głosowanie). */
function getEsgAgmProposals(stock) {
    const gov = stock?.governance; if (!gov) return [];
    return [...(gov.proposals || []), ...(gov.pendingAgm?.items || [])].filter(x => x.type === 'esgProject').map(x => x.projectId);
}
function orderEsgProjectByPlayer(symbol, id) {
    const stock = stocks.find(s => s.symbol === symbol), p = getEsgProject(id);
    if (!stock || !p) return { ok: false, message: 'Nieznany projekt.' };
    if (!canStartEsgProject(stock, p)) return { ok: false, message: 'Ten projekt jest już w toku albo filar ma pełny wzrost.' };
    if (canFundControlAgm(stock)) {
        const entry = startEsgProject(stock, id, 'player');
        return entry ? { ok: true, message: `Zlecono: ${p.name}.` } : { ok: false, message: 'Nie udało się zlecić projektu.' };
    }
    if (!(getFundStakePct(stock) > 0)) return { ok: false, message: 'Projekt może zgłosić tylko akcjonariusz.' };
    if (getEsgAgmProposals(stock).includes(id)) return { ok: false, message: 'Ten projekt jest już zgłoszony na walne.' };
    const gov = ensureGovernance(stock), item = { id: `p-esg-${id}`, kind: 'activist', type: 'esgProject', projectId: id, by: 'player', label: `Wniosek funduszu: projekt ESG „${p.name}”`, playerVote: 'for' };
    if (gov.pendingAgm) gov.pendingAgm.items.push(item); else gov.proposals.push({ type: 'esgProject', projectId: id });
    if (typeof logEvent === 'function') logEvent(`Fundusz zgłasza na walne ${stock.name} projekt ESG: ${p.name}.`, 'review');
    return { ok: true, message: `Zgłoszono na walne: ${p.name}.` };
}

// ---------------------------------------------------------------------------------
// G6: klient etyczny i fundusz etyczny (makieta 35).
// (a) Trzeci powód niezadowolenia klientów etycznych: udział NAV w spółkach C i D (ocena publiczna albo Twoje badanie) > 15%, D liczy się podwójnie.
// (b) Fundusz etyczny (`playerFund.ethical`): napływ +15%, klienci etyczni 2 × częściej, ich zadowolenie +0,02 na kwartał.
//     Limity: D 0%, C ≤ 5% NAV, B i bez oceny ≤ 40% NAV. Przekroczenie: wiadomość, kwartał na poprawę, potem zaufanie −5 i odejścia klientów etycznych.
//     Wycofanie deklaracji: zaufanie −3, powrót najwcześniej po 4 kw.
// ---------------------------------------------------------------------------------
const ESG_FUND_RULES = { issueShare: 0.15, inflow: 0.15, clientWeight: 2, satQ: 0.02, limits: { D: 0, C: 0.05, B: 0.40 }, graceQ: 1, breachTrust: 5, breachSat: 0.25, withdrawTrust: 3, rejoinQ: 4 };
/** Litera spółki z punktu widzenia funduszu: Twoje badanie (G7) przed oceną publiczną. */
function getFundEsgGrade(stock) {
    const study = typeof getPlayerEsgStudy === 'function' ? getPlayerEsgStudy(stock) : null;
    return study?.esg?.grade || getEsgRating(stock) || null;
}
/** Udział NAV w akcjach według klasy ESG: { A, B, C, D, none, list: { C: [symbole], ... } }. */
function getFundEsgShares(extra = null) {
    const nav = typeof getFundAssets === 'function' ? getFundAssets() : 0, out = { A: 0, B: 0, C: 0, D: 0, none: 0, list: { A: [], B: [], C: [], D: [], none: [] } };
    if (!(nav > 0)) return out;
    const add = (stock, value) => { const g = getFundEsgGrade(stock) || 'none'; out[g] += value / nav; if (!out.list[g].includes(stock.symbol)) out.list[g].push(stock.symbol); };
    for (const [sym, pos] of Object.entries(typeof playerPortfolio === 'object' ? playerPortfolio : {})) {
        const st = stocks.find(x => x.symbol === sym); if (!st || st.assetType || !(pos?.shares > 0)) continue;
        add(st, pos.shares * st.price);
    }
    if (extra?.stock && extra.value > 0) add(extra.stock, extra.value);
    return out;
}
/** Powód niezadowolenia klientów etycznych z udziału C i D (null, gdy w normie). */
function getFundEsgIssue() {
    const sh = getFundEsgShares(), bad = sh.C + 2 * sh.D;
    return bad > ESG_FUND_RULES.issueShare ? `${formatNumberPl(bad * 100, 0)}% NAV w spółkach nieetycznych (C i D, D liczone podwójnie)` : null;
}
const isFundEthical = () => Boolean(playerFund?.ethical?.on);
/** Przekroczone limity funduszu etycznego: [{ cls, share, limit, symbols }]; B liczy też spółki bez oceny. */
function getEthicalFundBreaches(shares = getFundEsgShares()) {
    const L = ESG_FUND_RULES.limits, eps = 1e-9;
    return [['D', shares.D, L.D, shares.list.D], ['C', shares.C, L.C, shares.list.C], ['B', shares.B + shares.none, L.B, [...shares.list.B, ...shares.list.none]]]
        .filter(([, v, l]) => v > l + eps).map(([cls, share, limit, symbols]) => ({ cls, share, limit, symbols }));
}
function canSetFundEthical(on) {
    if (!playerFund) return { ok: false, message: 'Brak funduszu.' };
    const e = playerFund.ethical || {};
    if (on && e.on) return { ok: false, message: 'Fundusz jest już etyczny.' };
    if (on && Number.isFinite(e.offUntil) && esgQuarter() < e.offUntil) return { ok: false, message: `Powrót do deklaracji najwcześniej w ${formatQuarterDate(e.offUntil)}.` };
    if (!on && !e.on) return { ok: false, message: 'Fundusz nie jest etyczny.' };
    return { ok: true };
}
function setFundEthical(on) {
    const c = canSetFundEthical(on); if (!c.ok) return c;
    const q = esgQuarter();
    if (on) playerFund.ethical = { on: true, since: q, breachSince: null };
    else { playerFund.ethical = { on: false, offUntil: q + ESG_FUND_RULES.rejoinQ }; playerFund.trust = Math.max(0, (Number(playerFund.trust) || 0) - ESG_FUND_RULES.withdrawTrust); }
    if (typeof logEvent === 'function') logEvent(on ? 'Fundusz ogłasza się etycznym: limity spółek C i D w portfelu.' : 'Fundusz wycofuje deklarację etyczną. Zaufanie klientów spada.', 'review');
    return { ok: true, message: on ? 'Fundusz jest etyczny.' : 'Deklaracja wycofana.' };
}
/** Co kwartał: limity funduszu etycznego (ostrzeżenie, kwartał na poprawę, potem kara). */
function processEthicalFundQuarterly() {
    if (!isFundEthical()) return null;
    const e = playerFund.ethical, q = esgQuarter(), br = getEthicalFundBreaches();
    if (!br.length) { e.breachSince = null; return null; }
    const text = br.map(b => `${b.cls}: ${formatNumberPl(b.share * 100, 1)}% NAV (limit ${formatNumberPl(b.limit * 100, 0)}%)`).join(', ');
    if (e.breachSince == null) {
        e.breachSince = q;
        if (typeof addMail === 'function') addMail({ sender: 'Dział zgodności', subject: 'Fundusz etyczny: limit przekroczony', body: `Przekroczony limit ${text}. Masz kwartał na poprawę (do końca ${formatQuarterDate(q + ESG_FUND_RULES.graceQ)}). Potem zaufanie spada, a klienci etyczni odchodzą.`, importance: 2, symbol: br[0].symbols[0] });
        return 'warning';
    }
    if (q - e.breachSince < ESG_FUND_RULES.graceQ) return 'grace';
    playerFund.trust = Math.max(0, (Number(playerFund.trust) || 0) - ESG_FUND_RULES.breachTrust);
    for (const c of playerFund.clients || []) if (c.type === 'ethical') { c.satisfaction = Math.max(0, c.satisfaction - ESG_FUND_RULES.breachSat); if (typeof noteClientHistory === 'function') noteClientHistory(c, `Fundusz etyczny łamie limit (${text}).`); }
    e.breachSince = q;
    if (typeof logEvent === 'function') logEvent(`Fundusz etyczny dalej łamie limit (${text}): zaufanie −${ESG_FUND_RULES.breachTrust}, klienci etyczni odchodzą.`, 'review');
    return 'penalty';
}
/** Linia ostrzeżenia w szufladzie zlecenia (bez blokady zakupu): '' gdy fundusz nie jest etyczny albo zakup mieści się w limicie. */
function getEthicalOrderWarning(stock, qty) {
    if (!isFundEthical() || !stock || !(qty > 0)) return null;
    const g = getFundEsgGrade(stock) || 'none', cls = g === 'none' ? 'B' : g, limit = ESG_FUND_RULES.limits[cls];
    if (limit == null) return null;
    const sh = getFundEsgShares({ stock, value: qty * stock.price }), share = cls === 'B' ? sh.B + sh.none : sh[cls];
    const nav = getFundAssets(), now = getFundEsgShares(), nowShare = cls === 'B' ? now.B + now.none : now[cls];
    const room = Math.max(0, Math.floor((limit - nowShare) * nav / Math.max(0.01, stock.price)));
    return { cls, share, limit, over: share > limit + 1e-9, room, graded: g !== 'none' };
}

// ---------------------------------------------------------------------------------
// G7: RateU (rateu.pl). Ranking 10 + 10 według oceny publicznej (co kwartał impuls w składniku G5: +1% / −1,5%),
// badania na zlecenie funduszu u 6 audytorów (zmiana użytkownika 2026-11-23): Wielka Trójka ±3 pkt i cena ×1,5,
// mali ±8 pkt i ×0,7; cena bazowa 0,02% kapitalizacji w widełkach 15 000–300 000 PLN. Audytor z ESG: E, S, G, wynik łączny
// i zgodność deklaracji; bez ESG: prywatna ocena kredytowa. Wynik po 1 kw., ważny 4 kw., limit 4 na kwartał łącznie.
// Ekologia od poziomu UEiE 4: 10 pro- i 10 antyekologicznych według filaru E.
// ---------------------------------------------------------------------------------
const ESG_RATEU_RULES = { n: 10, topImpulse: 0.01, bottomImpulse: -0.015, priceShare: 0.0002, priceMin: 15000, priceMax: 300000, bigMult: 1.5, smallMult: 0.7, bigNoise: 3, smallNoise: 8, perQ: 4, readyQ: 1, validQ: 4, ecoLevel: 4 };
const getEsgScoreOf = r => Number.isFinite(r?.e) ? ESG_RULES.weights.e * r.e + ESG_RULES.weights.s * r.s + ESG_RULES.weights.g * r.g : ({ A: 80, B: 65, C: 50, D: 30 }[r?.grade] ?? 0);
/** Ranking RateU: spółki z ważną oceną publiczną, od najlepszej. */
function getRateURanking() {
    const list = stocks.filter(s => ESG_TIERS.includes(s.exchange) && !s.isBankrupt && !s.assetType && getEsgRating(s))
        .sort((a, b) => getEsgScoreOf(b.esgRating) - getEsgScoreOf(a.esgRating));
    const n = Math.min(ESG_RATEU_RULES.n, Math.floor(list.length / 2));
    return { all: list, top: list.slice(0, n), bottom: list.slice(-n).reverse() };
}
const getEsgStudies = () => (typeof playerProfile === 'object' && playerProfile ? (playerProfile.esgStudies = playerProfile.esgStudies || []) : []);
/** Twoje badanie spółki: gotowe i ważne (null, gdy brak). `any` = także zlecone, jeszcze bez wyniku. */
function getPlayerEsgStudy(stock, any = false) {
    const q = esgQuarter();
    return getEsgStudies().filter(x => x.symbol === stock?.symbol && q < x.until && (any || q >= x.ready)).sort((a, b) => b.q - a.q)[0] || null;
}
function getRateUOfferPrice(stock, auditor) {
    const r = ESG_RATEU_RULES, base = Math.min(r.priceMax, Math.max(r.priceMin, r.priceShare * Math.max(0, stock.price * stock.totalShares)));
    return Math.round(base * (auditor.big ? r.bigMult : r.smallMult));
}
/** Oferty 6 audytorów dla spółki. `esg`: 'esg' | 'new' (dołączył w ostatnim roku) | 'none'. */
function getRateUOffers(stock) {
    const q = esgQuarter(), join = ratingState?.esgJoin || {};
    return AUDITORS.filter(a => !(ratingState?.banned?.[a.id] > q)).map(a => ({ auditor: a, price: getRateUOfferPrice(stock, a), noise: a.big ? ESG_RATEU_RULES.bigNoise : ESG_RATEU_RULES.smallNoise, esg: !isEsgAuditor(a.id) ? 'none' : (join[a.id] != null && q - join[a.id] < 4 ? 'new' : 'esg') }));
}
const getRateUStudiesThisQuarter = () => getEsgStudies().filter(x => x.q === esgQuarter()).length;
function canOrderRateUStudy(stock, auditorId) {
    const a = AUDITORS.find(x => x.id === auditorId);
    if (!stock || stock.assetType || !ESG_TIERS.includes(stock.exchange)) return { ok: false, reason: 'Badamy tylko spółki krajowe.' };
    if (!a || ratingState?.banned?.[a.id] > esgQuarter()) return { ok: false, reason: 'Ten audytor nie przyjmuje zleceń.' };
    if (getPlayerEsgStudy(stock, true)) return { ok: false, reason: 'Masz już badanie tej spółki.' };
    if (getRateUStudiesThisQuarter() >= ESG_RATEU_RULES.perQ) return { ok: false, reason: `Limit ${ESG_RATEU_RULES.perQ} badań na kwartał wykorzystany.` };
    const price = getRateUOfferPrice(stock, a);
    if (price > playerCash + 1e-9) return { ok: false, reason: `Za mało gotówki funduszu (${formatZl(price, 0)}).` };
    return { ok: true, price, auditor: a };
}
function orderRateUStudy(symbol, auditorId) {
    const stock = stocks.find(x => x.symbol === symbol), c = canOrderRateUStudy(stock, auditorId);
    if (!c.ok) return c;
    playerCash -= c.price;
    if (typeof recordPayment === 'function') recordPayment('player-fund', `external:${c.auditor.id}`, c.price, `Badanie spółki ${stock.symbol} (RateU, ${c.auditor.name})`);
    const q = esgQuarter(), study = { symbol, auditor: c.auditor.id, esgAudit: isEsgAuditor(c.auditor.id), q, ready: q + ESG_RATEU_RULES.readyQ, until: q + ESG_RATEU_RULES.readyQ + ESG_RATEU_RULES.validQ, cost: c.price };
    getEsgStudies().push(study);
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('esg', stock.name);
    return { ok: true, study, message: `Zlecono badanie ${stock.name} u ${c.auditor.name}: wynik w ${formatQuarterDate(study.ready)}.` };
}
/** Wynik badania (liczony, gdy minie kwartał). */
function resolveRateUStudy(study) {
    const stock = stocks.find(x => x.symbol === study.symbol), a = AUDITORS.find(x => x.id === study.auditor);
    if (!stock || !a) { study.until = esgQuarter(); return; }
    if (study.esgAudit) {
        const t = getEsgTrue(stock), n = a.big ? ESG_RATEU_RULES.bigNoise : ESG_RATEU_RULES.smallNoise, r = () => (Math.random() * 2 - 1) * n;
        const e = esgRound(t.e + r()), sv = esgRound(t.s + r()), g = esgRound(t.g + r());
        study.esg = { e, s: sv, g, ...combineEsg(e, sv, g) }; study.esg.score = Math.round(study.esg.score);
        if (stock.ethicsClaim) study.claim = ['A', 'B'].includes(t.grade) ? 'ok' : 'green';
    } else {
        let idx = getTrueRatingIndex(stock); if (Math.random() < a.noise) idx += Math.random() < 0.5 ? -1 : 1;
        study.credit = RATING_GRADES[Math.max(0, Math.min(RATING_GRADES.length - 1, idx))];
    }
    study.done = true;
}
function processRateUStudies() {
    const q = esgQuarter(), list = getEsgStudies();
    for (const x of list) if (!x.done && q >= x.ready) resolveRateUStudy(x);
    if (typeof playerProfile === 'object' && playerProfile) playerProfile.esgStudies = list.filter(x => q < x.until + 4).slice(-24); // wygasłe znikają po roku
}
/** Zapis wyniku ESG w skali audytora: punkty 0–100, litery A–D, gwiazdki 4★ = A … 1★ = D, klasy I = A … IV = D (makieta 33). */
function formatEsgInScale(auditorId, grade, points) {
    const scale = AUDITORS.find(a => a.id === auditorId)?.scale || 'letters', i = ESG_GRADE_ORDER.indexOf(grade);
    if (scale === 'points') return `${Math.round(points)}/100`;
    if (scale === 'stars') return `${4 - i}★`;
    if (scale === 'classes') return `klasa ${['I', 'II', 'III', 'IV'][i]}`;
    return grade;
}
/** Ekologia: 10 pro- i 10 antyekologicznych według filaru E (rzeczywistego), z emisjami wobec średniej sektora. */
function getRateUEcology() {
    const list = stocks.filter(s => ESG_TIERS.includes(s.exchange) && !s.isBankrupt && !s.assetType && !s.isBankStock).map(s => ({ stock: s, e: getEsgTrue(s)?.e ?? 0 })).sort((a, b) => b.e - a.e);
    const n = Math.min(ESG_RATEU_RULES.n, Math.floor(list.length / 2));
    const rel = s => { const segs = getStockSegments(s), base = segs.reduce((t, seg) => t + seg.share * (SECTOR_EMISSIONS[seg.sector] || 0), 0); return base > 0.05 ? getStockEmissionFactor(s) / base : null; };
    return { pro: list.slice(0, n).map(x => ({ ...x, rel: rel(x.stock) })), anti: list.slice(-n).reverse().map(x => ({ ...x, rel: rel(x.stock) })) };
}
const isRateUEcologyOpen = () => (typeof getEnergyOfficeLevel === 'function' ? getEnergyOfficeLevel() : 0) >= ESG_RATEU_RULES.ecoLevel;

// ---------------------------------------------------------------------------------
// G9: UEiE. Poziom 4: raz w roku rozporządzenie ESG (wpis w Gazecie): kontrola deklaracji u 3–6 spółek (losowanie ważone różnicą
// deklaracja–rzeczywistość); greenwashing: kara 1–3% rocznego przychodu, G −20 na 8 kw., kurs −4–8%, ocena publiczna = rzeczywista
// (ocena urzędu), deklaracja wycofana. Poziom 5: szansa 25% na rok, że ESG staje się kryterium awansu (ogłoszenie 1 kw. wcześniej,
// 4 kw. przejściowe dla spółek, które już są na poziomie): Platynowa ≥ C, Rubinowa, Szmaragdowa i Diamentowa ≥ B. Znika, gdy UEiE
// spadnie poniżej 5 (z ogłoszeniem). Stan: society.energy.esgReg = { criterion, pending, effectiveQ, log[] }.
// ---------------------------------------------------------------------------------
const ESG_REG_RULES = { level: 4, checks: [3, 6], fine: [0.01, 0.03], drop: [0.04, 0.08], gCut: 20, gCutQ: 8, criterionLevel: 5, criterionYear: 0.25, transitionQ: 4, logMax: 10, need: { PLATINUM: 'C', RUBY: 'B', EMERALD: 'B', DIAMOND: 'B' } };
function getEsgRegState() {
    const e = typeof society === 'object' && society?.energy ? society.energy : null; if (!e) return { criterion: false, pending: null, effectiveQ: -99, log: [] };
    return e.esgReg || (e.esgReg = { criterion: false, pending: null, effectiveQ: -99, log: [] });
}
const esgRand = (a, b) => a + Math.random() * (b - a);
/** Kara za greenwashing po kontroli UEiE. */
function punishGreenwashing(stock) {
    const t = getEsgTrue(stock), q = esgQuarter(), pct = esgRand(...ESG_REG_RULES.fine), drop = esgRand(...ESG_REG_RULES.drop);
    const fine = Math.max(0, Math.round(getStockRevenue(stock) * pct));
    if (fine > 0) {
        if (typeof ensureCompanyCash === 'function') ensureCompanyCash(stock, fine, 'Kredyt na karę UEiE');
        adjustCompanyCash(stock, -fine);
        if (typeof adjustBalanceSheet === 'function') adjustBalanceSheet(stock, { assets: -fine, retainedEarnings: -fine });
        if (typeof coverNegativeCash === 'function') coverNegativeCash(stock);
        if (typeof recordPayment === 'function') recordPayment(stock, 'external:skarb-panstwa', fine, 'Kara UEiE za greenwashing');
    }
    stock.price = Math.max(0.01, stock.price * (1 - drop));
    delete stock.ethicsClaim;
    stock.esgPenalty = { q, fine, revenuePct: pct, drop, official: true };
    clearEsgCache();
    const v = getEsgTrue(stock);
    stock.esgRating = { grade: v.grade, e: esgRound(v.e), s: esgRound(v.s), g: esgRound(v.g), q, until: q + ESG_PUBLIC_RULES.validQ, auditor: 'UEiE', official: true };
    return { symbol: stock.symbol, fine, drop, grade: t.grade };
}
/** Rozporządzenie ESG (raz w roku przy poziomie ≥ 4). Zwraca wpis dziennika albo null. */
function runEsgRegulation() {
    const claimed = stocks.filter(s => ESG_TIERS.includes(s.exchange) && !s.isBankrupt && !s.assetType && s.ethicsClaim);
    if (!claimed.length) return null;
    const n = Math.min(claimed.length, Math.round(esgRand(ESG_REG_RULES.checks[0], ESG_REG_RULES.checks[1] + 0.999) - 0.5));
    const weight = s => 1 + 3 * Math.max(0, ESG_GRADE_ORDER.indexOf(getEsgTrue(s).grade) - 1); // różnica deklaracja (A/B) – rzeczywistość
    const pool = [...claimed], checked = [];
    while (checked.length < n && pool.length) {
        const total = pool.reduce((t, s) => t + weight(s), 0); let r = Math.random() * total, i = 0;
        for (; i < pool.length - 1; i++) { r -= weight(pool[i]); if (r <= 0) break; }
        checked.push(pool.splice(i, 1)[0]);
    }
    const fined = checked.filter(isEsgGreenwashing).map(punishGreenwashing);
    const q = esgQuarter(), entry = { q, checked: checked.map(s => s.symbol), fined: fined.map(f => f.symbol) };
    const st = getEsgRegState(); st.log = [...st.log, entry].slice(-ESG_REG_RULES.logMax);
    const text = `Rozporządzenie ESG Urzędu Energii i Emisji: kontrola deklaracji etyki w ${checked.length} spółkach. ${fined.length ? `Kary za greenwashing: ${fined.map(f => stocks.find(s => s.symbol === f.symbol)?.name || f.symbol).join(', ')} (kara 1–3% rocznego przychodu, ocena urzędu zamiast deklaracji).` : 'Wszystkie skontrolowane deklaracje są zgodne z rzeczywistością.'}`;
    if (typeof logEvent === 'function') logEvent(text, 'company');
    if (typeof pushNews === 'function') pushNews(text);
    return entry;
}
const isEsgCriterionActive = () => Boolean(getEsgRegState().criterion);
/** Czy spółka spełnia kryterium ESG poziomu (true, gdy kryterium nie obowiązuje albo trwa okres przejściowy dla spółki już na poziomie). */
function meetsEsgGate(stock, tier) {
    const st = getEsgRegState(), need = ESG_REG_RULES.need[tier];
    if (!st.criterion || !need) return true;
    if (stock.exchange === tier && esgQuarter() < st.effectiveQ + ESG_REG_RULES.transitionQ) return true;
    const g = getEsgRating(stock);
    return Boolean(g) && ESG_GRADE_ORDER.indexOf(g) <= ESG_GRADE_ORDER.indexOf(need);
}
/** Co kwartał: rozporządzenie (raz w roku), ogłoszenie i wejście kryterium awansu. */
function processEsgRegulationQuarterly() {
    const q = esgQuarter(), st = getEsgRegState(), level = typeof getEnergyOfficeLevel === 'function' ? getEnergyOfficeLevel() : 0;
    if (st.pending && q >= st.pending.effectiveQ) {
        st.criterion = st.pending.on; st.effectiveQ = q; st.pending = null;
        const text = st.criterion ? 'Od dziś ESG jest kryterium awansu: Platynowa wymaga oceny ESG co najmniej C, Rubinowa, Szmaragdowa i Diamentowa co najmniej B. Spółki, które już są na tych poziomach, mają 4 kwartały na dostosowanie.' : 'ESG przestaje być kryterium awansu na giełdach.';
        if (typeof pushNews === 'function') pushNews(text); if (typeof logEvent === 'function') logEvent(text, 'company');
    }
    if (q % 4 !== 0 || q === 0) return;
    if (level >= ESG_REG_RULES.level) runEsgRegulation();
    if (!st.pending) {
        const announce = on => { st.pending = { on, effectiveQ: q + 1 }; const text = on ? 'UEiE zapowiada: od następnego kwartału ESG będzie kryterium awansu (Platynowa ≥ C, elitarne ≥ B).' : 'UEiE traci uprawnienia: od następnego kwartału ESG przestaje być kryterium awansu.'; if (typeof pushNews === 'function') pushNews(text); if (typeof logEvent === 'function') logEvent(text, 'company'); };
        if (!st.criterion && level >= ESG_REG_RULES.criterionLevel && Math.random() < ESG_REG_RULES.criterionYear) announce(true);
        else if (st.criterion && level < ESG_REG_RULES.criterionLevel) announce(false);
    }
}
