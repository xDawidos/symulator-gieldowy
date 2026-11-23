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
const ESG_PROJECTS = [
    { id: 'forest', name: 'Nasadzenia leśne', pillar: 'e', cost: 0.008, q: 2, gain: [3, 5], text: 'Tysiące drzew na terenach po zakładach.' },
    { id: 'wastewater', name: 'Oczyszczalnia ścieków', pillar: 'e', cost: 0.025, q: 4, gain: [5, 8], heatCut: 0.5, emitOnly: true, text: 'Mniej zanieczyszczeń i mniej incydentów ekologicznych.' },
    { id: 'solar_roofs', name: 'Panele na dachach zakładów', pillar: 'e', cost: 0.03, q: 4, gain: [3, 5], ecoCut: 0.03, emitOnly: true, text: 'Własny prąd z dachów: niższe emisje.' },
    { id: 'recycling', name: 'Recykling opakowań', pillar: 'e', cost: 0.015, q: 3, gain: [3, 6], text: 'Opakowania wracają do obiegu.' },
    { id: 'community', name: 'Program dla lokalnej społeczności', pillar: 's', cost: 0.008, q: 2, gain: [3, 5], text: 'Remonty szkół i boisk przy zakładach.' },
    { id: 'internships', name: 'Szkolenia i staże', pillar: 's', cost: 0.012, q: 3, gain: [4, 6], satisfaction: 3, text: 'Staże dla absolwentów i kursy dla załogi.' },
    { id: 'foundation', name: 'Fundacja edukacyjna', pillar: 's', cost: 0.02, q: 4, gain: [5, 8], text: 'Stypendia i programy dla szkół.' },
    { id: 'supply_audit', name: 'Audyt łańcucha dostaw', pillar: 'g', cost: 0.008, q: 2, gain: [3, 5], text: 'Sprawdzenie dostawców pod kątem pracy i korupcji.' },
    { id: 'anticorruption', name: 'Program antykorupcyjny', pillar: 'g', cost: 0.012, q: 3, gain: [4, 7], text: 'Kodeks, szkolenia i niezależny kanał zgłoszeń.' }
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
    if (p?.heatCut && stock.ecoHeat) stock.ecoHeat = +(stock.ecoHeat * p.heatCut).toFixed(3);
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
    if (!canEcoUpgrade(stock, project) || (typeof canFundControlAgm === 'function' && canFundControlAgm(stock))) return;
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
    const rated = stocks.filter(s => ESG_TIERS.includes(s.exchange) && !s.isBankrupt && !s.assetType && getEsgRating(s))
        .map(s => ({ stock: s, cap: Math.max(0, s.price * s.totalShares), c: ESG_DEMAND_RULES[getEsgRating(s)] || 0 }));
    const w = rated.reduce((t, x) => t + x.cap, 0); if (!(w > 0)) return [];
    const mean = rated.reduce((t, x) => t + x.cap * x.c, 0) / w;
    return rated.map(x => ({ stock: x.stock, d: (x.c - mean) / 4 }));
}
function applyEsgDemandQuarterly() {
    const shifts = getEsgDemandShifts();
    for (const { stock, d } of shifts) if (d) stock.price = Math.max(0.01, stock.price * (1 + d));
    return shifts;
}
