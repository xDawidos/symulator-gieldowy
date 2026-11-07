// =================================================================================
// 0.17 S5: INFRASTRUKTURA PUBLICZNA — przepustowość kraju, projekty państwa, przetarg „cena > jakość”, PPP
// =================================================================================
// Przepustowość (morski, lotniczy, lądowy) wchodzi do indeksu frachtu S4 jako (1/przepustowość)^k. Zużycie co kwartał
// zależy od ustawy `infrastructure`; projekty ogłasza państwo, zamawiającym jest podmiot „Skarb Państwa (inwestycje)”
// (INFRA_CLIENT): przy umowie wpłaca całą cenę na depozyt z governmentTreasury, do salda budżetu koszt wchodzi w ratach.
// Autostrada: odcinki jako osobne przetargi, oferty pakietowe (rabat 2% za odcinek ponad pierwszy), państwo wybiera
// najtańszy podział. Stan w `society.infra` (zapisywany razem ze społeczeństwem; stary zapis: przepustowość 1,0).

const INFRA_TYPES = {
    // firstBonus: premia dawnego megaprojektu miasta (decyzja 24) przy ukończeniu pierwszego obiektu typu; legacy: id megaprojektu ze starych zapisów
    port:    { name: 'Port morski (rozbudowa terminalu)', mode: 'sea',  gain: 0.15, cost: 3_200_000, quarters: [8, 12], limit: 3, legacy: 'seaport',
               firstBonus: { sectors: ['Transport i logistyka', 'Przemysł'], growth: 0.008, valuation: 0.04, health: 0.4 } },
    airport: { name: 'Lotnisko',                          mode: 'air',  gain: 0.15, cost: 2_800_000, quarters: [8, 12], limit: 2, legacy: 'airport',
               firstBonus: { sectors: ['Transport i logistyka', 'Turystyka'], growth: 0.010, valuation: 0.05, health: 0.4 } },
    rail:    { name: 'Magistrala kolejowa',               mode: 'land', gain: 0.10, cost: 2_000_000, quarters: [6, 10], limit: 4 },
    highway: { name: 'Autostrada',                        mode: 'land', gain: 0.08, cost: 1_600_000, quarters: [4, 8],  limit: 6, segments: [2, 5] }
};
// ustawa „Finansowanie infrastruktury”: wydatki (% wpływów na kwartał), zużycie przepustowości na rok, szansa projektu na rok
const INFRA_LEVELS = [
    { spend: 0,     wear: 0.05,  chance: 0 },
    { spend: 0.01,  wear: 0.035, chance: 0.10 },
    { spend: 0.02,  wear: 0.02,  chance: 0.25 },
    { spend: 0.03,  wear: 0.01,  chance: 0.45 },
    { spend: 0.045, wear: 0.005, chance: 0.70 }
];
const INFRA_RULES = {
    capMin: 0.7,
    timeMult: 1,             // test serii: ×1 (tabela) albo ×1,5
    advanceRate: 0.30,       // zaliczka państwa na start budowy (z depozytu)
    // odbiory co 10% postępu: z zaliczką 30% wypłaty wyprzedzają koszty wykonawcy (przy odbiorach co 25% wykonawca
    // finansował kredytem setki tysięcy przy etapie 75% i na końcu — 1/3 budów zrywana z braku finansowania)
    milestones: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
    weights: { price: 0.6, quality: 0.25, capacity: 0.15, reputation: 0, exchangeLevel: 0, isStateOwned: 0 },
    budgetMult: 1.3,         // budżet przetargu × koszt
    packageDiscount: 0.02,   // rabat za każdy odcinek ponad pierwszy
    bidWeeks: 2,
    joinChance: 0.7,         // szansa, że wykonawca złoży ofertę na autostradę
    pppShare: 0.25, pppSpread: 0.01, pppExtraQuarters: 4,
    carrierBoost: 0.05       // przewoźnicy krajowi: +5% przychodu na +0,15 przepustowości
};
const INFRA_MODES = ['sea', 'air', 'land'];
const INFRA_DAYS_PER_QUARTER = WEEKS_PER_QUARTER * 7;

function initInfraState() {
    return { cap: { sea: 1, air: 1, land: 1 }, projects: [], next: 1, cash: 0, stats: { announced: 0, done: {}, segs: 0, cancels: 0 } };
}
function ensureInfra() {
    if (!society.infra || typeof society.infra !== 'object') society.infra = initInfraState();
    const inf = society.infra, fresh = initInfraState();
    for (const k of Object.keys(fresh)) if (inf[k] === undefined) inf[k] = fresh[k];
    for (const m of INFRA_MODES) if (!(Number(inf.cap[m]) > 0)) inf.cap[m] = 1;
    return inf;
}

/** Zamawiający projektów państwa. Gotówka (depozyty przed umową, zwroty) w society.infra.cash, więc trafia do zapisu. */
const INFRA_CLIENT = {
    symbol: 'SKARB-INW', name: 'Skarb Państwa (inwestycje)', isStateOwned: true, financialHealth: 0, portfolio: {},
    get cash() { return ensureInfra().cash; },
    set cash(v) { ensureInfra().cash = Number(v) || 0; }
};
function sweepInfraCash() {
    const inf = ensureInfra();
    if (inf.cash) { governmentTreasury += inf.cash; inf.cash = 0; }
}

function getInfraCapacity(mode) { return typeof society === 'object' && society?.infra ? Number(society.infra.cap[mode]) || 1 : 1; }
function getInfraCapUpper(mode) { return 1 + Object.values(INFRA_TYPES).filter(t => t.mode === mode).reduce((s, t) => s + t.limit * t.gain, 0); }
function getInfraLevel() { return INFRA_LEVELS[Number(society?.laws?.infrastructure ?? 2)] || INFRA_LEVELS[2]; }
function countInfraObjects(type) { return ensureInfra().projects.filter(p => p.type === type && p.status !== 'cancelled').length; }
function countInfraDone(type) { return typeof society === 'object' && society?.infra ? society.infra.projects.filter(p => p.type === type && p.status === 'done').length : 0; }
function countInfraActive(type) { return typeof society === 'object' && society?.infra ? society.infra.projects.filter(p => p.type === type && (p.status === 'tender' || p.status === 'build')).length : 0; }
function getInfraOpenTypes() { return Object.keys(INFRA_TYPES).filter(t => countInfraObjects(t) < INFRA_TYPES[t].limit); }
/** Przewoźnicy krajowi: mnożnik przychodu z przepustowości (1 przy 1,0). */
function getInfraCarrierFactor(mode) { return 1 + INFRA_RULES.carrierBoost * (getInfraCapacity(mode) - 1) / 0.15; }

/** Typ projektu: spośród typów poniżej limitu, częściej tam, gdzie przepustowość niższa. */
function pickInfraType() {
    const open = getInfraOpenTypes().filter(t => INFRA_TYPES[t].mode); // 0.17.2: elektrownie państwo ogłasza przy niedoborze mocy
    if (!open.length) return null;
    const w = open.map(t => 1 / Math.pow(getInfraCapacity(INFRA_TYPES[t].mode), 4));
    let r = Math.random() * w.reduce((s, v) => s + v, 0);
    for (let i = 0; i < open.length; i++) { r -= w[i]; if (r <= 0) return open[i]; }
    return open[open.length - 1];
}

function infraSegmentDays(def) { return Math.max(1, Math.round(rangeIntCommodity(def.quarters) * INFRA_DAYS_PER_QUARTER * INFRA_RULES.timeMult)); }

/** Państwo ogłasza projekt (przetarg albo przetargi odcinków) i ofertę PPP na 25% kosztu. */
function announceInfraProject(type = pickInfraType(), reason = '') {
    const def = INFRA_TYPES[type];
    if (!def || countInfraObjects(type) >= def.limit) return null;
    const inf = ensureInfra();
    const n = def.segments ? rangeIntCommodity(def.segments) : 1;
    const segs = Array.from({ length: n }, (_, i) => ({
        n: i + 1, cost: Math.round(def.cost / n * (n > 1 ? getRandomInRange(0.9, 1.1) : 1)), days: infraSegmentDays(def), status: 'wait'
    }));
    const p = { id: `infra_${inf.next++}`, type, status: 'tender', cost: segs.reduce((s, x) => s + x.cost, 0), ppp: 0, segs, q: macro.quarter };
    inf.projects.push(p);
    inf.stats.announced++;
    openInfraTenders(p);
    createInfraPppOffer(p);
    logSociety(`🏗️ Państwo ogłasza projekt: ${def.name}${n > 1 ? ` (${n} odcinków)` : ''} — ${formatZl(p.cost, 0)}${reason ? ` (${reason})` : ''}. Przetarg „cena > jakość” dla firm budowlanych.`);
    return p;
}

function openInfraTenders(p) {
    for (const seg of p.segs) if (seg.status === 'wait') { seg.tenderId = createInfraTender(p, seg); seg.status = 'tender'; }
}

function createInfraTender(p, seg) {
    const def = INFRA_TYPES[p.type], highway = p.type === 'highway';
    const duration = BASE_DELAYS.weekly * INFRA_RULES.bidWeeks;
    const spec = {
        id: `infra_${p.type}`, name: highway ? `${def.name} — odcinek ${seg.n}/${p.segs.length}` : def.name, kind: 'construction',
        cost: seg.cost, catalogCost: seg.cost, constructionShare: 1, durationDays: seg.days, duration: seg.days, estimatedMarketValue: seg.cost,
        incomeBonus: 0, maintenance: 0, healthBonus: 0, minDevLevel: 0, requirements: {}
    };
    const tender = {
        id: nextSimulationId('tender'), timerVersion: 2, buildingType: spec, clientCompany: INFRA_CLIENT,
        budget: Math.round(seg.cost * INFRA_RULES.budgetMult), criteriaWeights: normalizeTenderWeights(INFRA_RULES.weights),
        bids: [], evaluatedBy: [], status: 'open', createdAt: Date.now(), biddingDurationMs: duration, remainingGameMs: duration, elapsedGameMs: 0,
        closedAt: null, awardedAt: null, winner: null, projectId: null, startDate: null, completionDate: null, cancelReason: null,
        infra: { pid: p.id, seg: seg.n, highway }, advanceRate: INFRA_RULES.advanceRate, milestones: INFRA_RULES.milestones
    };
    activeTenders.push(tender);
    return tender.id;
}

function findInfraSegment(tender) {
    const p = tender?.infra && ensureInfra().projects.find(x => x.id === tender.infra.pid);
    return p ? { p, seg: p.segs.find(s => s.n === tender.infra.seg) } : {};
}

/** Umowa na odcinek: depozyt ze skarbu, start budowy (zaliczka 30% z depozytu), raty do budżetu. */
function startInfraSegment(tender, bid) {
    const { p, seg } = findInfraSegment(tender);
    if (!p || !seg) return false;
    INFRA_CLIENT.cash += bid.price; governmentTreasury -= bid.price;
    tender.status = 'closed';
    const ok = startConstructionProject(tender, bid);
    sweepInfraCash();
    if (!ok) return false;
    tender.awardedAt = Date.now(); tender.awardedGameMs = tender.elapsedGameMs;
    const stats = bid.bidder.constructionStats;
    stats.wonTenders = (Number(stats.wonTenders) || 0) + 1;
    noteTenderAward(bid.bidder);
    onInfraSegmentStarted(p, seg, tender, bid);
    return true;
}
function onInfraSegmentStarted(p, seg, tender, bid) {
    seg.status = 'build'; seg.price = Number(bid.price); seg.builder = getEntityKey(bid.bidder); seg.projectId = tender.projectId;
    seg.instN = Math.max(1, Math.round(Number(bid.time) / INFRA_DAYS_PER_QUARTER)); seg.instLeft = seg.instN;
    if (p.status === 'tender') p.status = 'build';
}

/** Rozstrzygnięcie (z autoAwardExpiredTenders): port, lotnisko, magistrala — zwykły ranking; autostrada — podział odcinków. */
function awardInfraTender(tender) {
    const { p, seg } = findInfraSegment(tender);
    if (!p || !seg) return cancelTender(tender, 'Projekt infrastruktury nie istnieje.');
    if (!tender.infra.highway) {
        INFRA_CLIENT.cash += tender.budget; governmentTreasury -= tender.budget; // depozyt pokrywa każdą poprawną ofertę
        const ok = awardTender(tender.id);
        sweepInfraCash();
        if (ok && tender.winner) onInfraSegmentStarted(p, seg, tender, tender.winner);
        else if (tender.status === 'cancelled') seg.status = 'wait'; // wraca do przetargu w następnym kwartale
        return ok;
    }
    const tenders = p.segs.filter(s => s.status === 'tender').map(s => activeTenders.find(t => t.id === s.tenderId)).filter(Boolean);
    if (tenders.some(t => t.status === 'open' && t.remainingGameMs > 0)) return false; // czekamy na wszystkie odcinki
    const offers = makeHighwayOffers(tenders);
    const plan = allocateHighwaySegments(tenders, offers);
    const parts = [];
    for (const t of tenders) {
        const a = plan.get(t.id), s = p.segs.find(x => x.n === t.infra.seg);
        if (a) {
            t.bids = [a];
            if (startInfraSegment(t, a)) { parts.push({ n: s.n, name: a.bidder.name, price: a.price }); continue; }
        }
        cancelTender(t, 'Brak oferty na odcinek — wraca do przetargu w następnym kwartale.');
        s.status = 'wait';
    }
    if (parts.length) {
        logEvent(`🛣️ Autostrada (${p.segs.length} odcinków): ${describeHighwayAward(parts)}.`, 'construction');
    }
    return parts.length > 0;
}

/** „odcinki 1–2 — ABL, odcinek 3 — Nordbud; łącznie X”: dziennik i pasek odcinków w oknie przetargu. */
function describeHighwayAward(parts) {
    const groups = [];
    for (const x of [...parts].sort((a, b) => a.n - b.n)) {
        const last = groups[groups.length - 1];
        if (last && last.name === x.name && last.to === x.n - 1) last.to = x.n; else groups.push({ from: x.n, to: x.n, name: x.name });
    }
    const total = parts.reduce((s, x) => s + x.price, 0);
    return `${groups.map(g => `${g.from === g.to ? `odcinek ${g.from}` : `odcinki ${g.from}–${g.to}`} — ${g.name}`).join(', ')}; łącznie ${formatZl(total, 0)}`;
}
/** Okno przetargu: wszystkie odcinki autostrady, ten wyróżniony tłem i słowem. */
function renderHighwayStrip(tender) {
    const { p, seg: here } = findInfraSegment(tender);
    if (!p || !here) return '';
    const builderName = s => stocks.find(c => getEntityKey(c) === s.builder)?.name || s.builder;
    const cells = p.segs.map(s => {
        if (s.status === 'done') return `<span role="listitem" class="is-won"><b>Odcinek ${s.n}</b>${escapeHtml(builderName(s))} · gotowy</span>`;
        if (s.status === 'build') {
            const pct = Math.round((Number(constructionProjects.find(x => x.id === s.projectId)?.progress) || 0) * 100);
            return `<span role="listitem" class="is-won"><b>Odcinek ${s.n}</b>${escapeHtml(builderName(s))} · w budowie ${pct}%${renderLimitMeter(pct, null, `Postęp ${pct}%`)}</span>`;
        }
        return s === here ? `<span role="listitem" class="is-here"><b>Odcinek ${s.n}</b>przetarg (ten)</span>` : `<span role="listitem"><b>Odcinek ${s.n}</b>przetarg</span>`;
    }).join('');
    const player = stocks.find(c => c.isPlayer && isConstructionCompany(c) && c.constructionStats);
    const free = player ? Math.max(0, Number(player.constructionStats.maxProjects) - getActiveProjectsForBuilder(player).length - getOpenBidsForBuilder(player).length) : null;
    const won = p.segs.filter(s => s.price > 0 && s.status !== 'tender').map(s => ({ n: s.n, name: builderName(s), price: s.price }));
    return `<h5>Autostrada: odcinek ${here.n} z ${p.segs.length}</h5>
        <div class="hw-strip" role="list" aria-label="Odcinki autostrady">${cells}</div>
        <p class="notice-inline">${uiIcon('info', 14)}<span>Oferta na kilka odcinków: ${Math.round(INFRA_RULES.packageDiscount * 100)}% rabatu za każdy odcinek ponad pierwszy. Każdy odcinek zajmuje 1 slot firmy${free === null ? '' : ` (wolne: ${free})`}.</span></p>
        ${won.length ? `<p class="text-sm">Rozstrzygnięcie: ${escapeHtml(describeHighwayAward(won))}.</p>` : ''}`;
}

/** Oferty na autostradę: oferty złożone na pojedyncze odcinki (np. gracza) i pakiety wykonawców AI (1–wolne sloty, ciągłe odcinki). */
function makeHighwayOffers(tenders) {
    const offers = [];
    for (const t of tenders) for (const bid of t.bids || []) offers.push({ bidder: bid.bidder, items: { [t.id]: { price: Number(bid.price), time: Number(bid.time) } } });
    const ids = new Set(tenders.map(t => t.id));
    const builders = stocks.filter(c => !c.isBankrupt && !c.isPlayer && !c.assetType && isConstructionCompany(c) && c.constructionStats && canCompanyBid(c));
    for (const b of builders) {
        if (offers.some(o => o.bidder === b) || Math.random() > INFRA_RULES.joinChance) continue;
        const otherBids = getOpenBidsForBuilder(b).filter(t => !ids.has(t.id)).length;
        const free = Number(b.constructionStats.maxProjects) - getActiveProjectsForBuilder(b).length - otherBids;
        if (free < 1) continue;
        const k = getRandomIntInRange(1, Math.min(free, tenders.length)), start = getRandomIntInRange(0, tenders.length - k);
        const experience = Number(b.constructionStats.experience) || 0, active = getActiveProjectsForBuilder(b).length;
        const items = {};
        for (const t of tenders.slice(start, start + k)) {
            const est = estimateBuilderCost(b, t.buildingType);
            const price = Math.min(Number(t.budget), est * (getRandomInRange(1.06, 1.30) + Math.min(0.06, experience * 0.001) + active * 0.10));
            if (price < est * 1.03) continue;
            items[t.id] = { price: Math.round(price), time: Math.max(1, Math.round(t.buildingType.durationDays * getRandomInRange(0.95, 1.25) / getBuilderSpeedMultiplier(b))) };
        }
        if (Object.keys(items).length) offers.push({ bidder: b, items });
    }
    return offers;
}

/**
 * Najtańszy podział odcinków (pełny przegląd, odcinków ≤ 5): koszt oceniony = cena po rabacie pakietowym ×
 * (1 + (0,25·(1 − jakość) + 0,15·(1 − wolne moce)) / 0,6). Zwraca Map(tenderId → oferta z ceną po rabacie).
 */
function allocateHighwaySegments(tenders, offers) {
    const factor = (offer, t) => {
        const it = offer.items[t.id], sc = getBidCriteriaScores({ bidder: offer.bidder, price: it.price, time: it.time }, t);
        const w = INFRA_RULES.weights;
        return sc ? 1 + (w.quality * (1 - sc.quality / 100) + w.capacity * (1 - sc.capacity / 100)) / w.price : Infinity;
    };
    const f = tenders.map(t => offers.map(o => o.items[t.id] ? factor(o, t) : null));
    let best = null, bestCost = Infinity;
    const pick = Array(tenders.length).fill(-1);
    const cost = () => {
        let sum = 0;
        offers.forEach((o, j) => {
            const mine = pick.map((v, i) => v === j ? i : -1).filter(i => i >= 0);
            const disc = 1 - INFRA_RULES.packageDiscount * Math.max(0, mine.length - 1);
            for (const i of mine) sum += o.items[tenders[i].id].price * disc * f[i][j];
        });
        return sum;
    };
    const walk = i => {
        if (i === tenders.length) { const c = cost(); if (c < bestCost) { bestCost = c; best = [...pick]; } return; }
        const options = offers.map((o, j) => f[i][j] != null && Number.isFinite(f[i][j]) ? j : -1).filter(j => j >= 0);
        if (!options.length) { pick[i] = -1; walk(i + 1); return; }
        for (const j of options) { pick[i] = j; walk(i + 1); }
        pick[i] = -1;
    };
    walk(0);
    const plan = new Map();
    if (!best) return plan;
    offers.forEach((o, j) => {
        const mine = best.map((v, i) => v === j ? i : -1).filter(i => i >= 0);
        const disc = 1 - INFRA_RULES.packageDiscount * Math.max(0, mine.length - 1);
        for (const i of mine) {
            const t = tenders[i], it = o.items[t.id];
            plan.set(t.id, { bidder: o.bidder, price: Math.round(it.price * disc), time: it.time, experience: Number(o.bidder.constructionStats?.experience) || 0, submittedGameMs: t.elapsedGameMs, updatedGameMs: t.elapsedGameMs, submittedAt: Date.now(), updatedAt: Date.now() });
        }
    });
    return plan;
}

/** Odbiór (completeConstructionProject): przepustowość rośnie (autostrada o 0,08/odcinków po każdym odcinku). */
function onInfraProjectCompleted(project) {
    const { p, seg } = findInfraSegment(project.tender);
    if (!p || !seg) return;
    const def = INFRA_TYPES[p.type], inf = ensureInfra();
    seg.status = 'done'; seg.instLeft = 0; inf.stats.segs++;
    if (def.mode) inf.cap[def.mode] = Math.min(getInfraCapUpper(def.mode), inf.cap[def.mode] + def.gain / p.segs.length);
    if (p.segs.every(s => s.status === 'done')) {
        p.status = 'done'; p.doneQ = macro.quarter;
        inf.stats.done[p.type] = (inf.stats.done[p.type] || 0) + 1;
        if (inf.stats.firstQ?.[p.type] === undefined) (inf.stats.firstQ = inf.stats.firstQ || {})[p.type] = macro.quarter;
        if (def.energy) logSociety(`🏗️ Ukończono: ${def.name}, ${onEnergyProjectCompleted(def)} MW nowej mocy.`);
        else logSociety(`🏗️ Ukończono: ${def.name} — przepustowość (${FREIGHT_MODES[def.mode].name.toLowerCase()}) ${formatNumberPl(inf.cap[def.mode], 2)}.`);
        if (def.firstBonus && countInfraDone(p.type) === 1) applyInfraFirstBonus(p, def);
    }
}

/** Premia sektorowa dawnego megaprojektu przy pierwszym lotnisku / porcie S5: spółki krajowe z sektorów premii. */
function applyInfraFirstBonus(p, def) {
    const b = def.firstBonus;
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt || !(stock.sector || []).some(s => b.sectors.includes(s))) continue;
        if (!Array.isArray(stock.specialBonuses)) stock.specialBonuses = [];
        stock.specialBonuses.push({ projectId: p.id, name: def.name, icon: p.type === 'airport' ? '✈️' : '⚓', growth: b.growth, valuation: b.valuation, until: null });
        stock.financialHealth = Math.min(5, (Number(stock.financialHealth) || 0) + b.health);
    }
    logEvent(`🎉 Pierwsze ${p.type === 'airport' ? 'lotnisko' : 'port'} w kraju: spółki z sektorów ${b.sectors.join(', ')} dostają premię (przychody +${(b.growth * 100).toFixed(1)} pkt proc./kw., wycena +${(b.valuation * 100).toFixed(0)}%).`, 'city');
}

/** Stare zapisy (decyzja 24): ukończony megaprojekt „Port lotniczy” / „Port morski” = 1 ukończone lotnisko / port S5 (premia została przy megaprojekcie). */
function migrateLegacyInfraMegaProjects() {
    if (typeof specialProjects !== 'object' || !specialProjects?.completed || typeof society !== 'object' || !society) return 0;
    const inf = ensureInfra();
    inf.legacy = inf.legacy || {};
    let n = 0;
    for (const [type, def] of Object.entries(INFRA_TYPES)) {
        if (!def.legacy || inf.legacy[def.legacy] || !specialProjects.completed.some(p => !p.timed && p.templateId === def.legacy)) continue;
        inf.legacy[def.legacy] = true;
        inf.projects.push({ id: `infra_legacy_${def.legacy}`, type, status: 'done', cost: def.cost, ppp: 0, segs: [{ n: 1, cost: def.cost, days: 0, status: 'done' }], q: macro.quarter, legacy: true });
        inf.stats.done[type] = (inf.stats.done[type] || 0) + 1;
        inf.cap[def.mode] = Math.min(getInfraCapUpper(def.mode), inf.cap[def.mode] + def.gain);
        n++;
    }
    return n;
}
/** Zerwana budowa: odcinek autostrady wraca do przetargu, inny projekt przepada (zwalnia limit). */
function onInfraProjectCancelled(project) {
    const { p, seg } = findInfraSegment(project.tender);
    if (!p || !seg) return;
    const inf = ensureInfra();
    inf.stats.cancels++; seg.instLeft = 0;
    const why = String(project.cancelReason || '?').slice(0, 60);
    (inf.stats.cancelWhy = inf.stats.cancelWhy || {})[why] = (inf.stats.cancelWhy[why] || 0) + 1;
    const b = project.builder, sh = b?.balanceSheet || {}; // ostatnie 10 zerwań: stan wykonawcy (diagnostyka serii)
    (inf.stats.cancelLog = inf.stats.cancelLog || []).push({ why, sym: b?.symbol, bankrupt: Boolean(b?.isBankrupt), lev: Math.round((Number(sh.liabilities) || 0) / Math.max(1, Number(sh.assets) || 0) * 100) / 100,
        cash: Math.round(Number(b?.cash) || 0), active: b ? getActiveProjectsForBuilder(b).length : 0, prog: Math.round(project.progress * 100) / 100, price: Math.round(project.price), q: macro.quarter });
    if (inf.stats.cancelLog.length > 10) inf.stats.cancelLog.shift();
    if (p.type === 'highway') seg.status = 'wait';
    else { seg.status = 'cancelled'; p.status = 'cancelled'; }
    sweepInfraCash();
}

/** Linia budżetu (settleSocialBudget): % wpływów z ustawy (wydatek skarbu) + raty projektów w toku (gotówka już w depozycie). */
function settleInfraBudget(revenue) {
    const inf = ensureInfra();
    const upkeep = Math.max(0, Number(revenue) || 0) * getInfraLevel().spend;
    governmentTreasury -= upkeep;
    let installments = 0;
    for (const p of inf.projects) {
        const share = 1 - Math.min(1, p.ppp / Math.max(1, p.cost)); // wpłaty PPP gracza zmniejszają raty państwa
        for (const seg of p.segs) if (seg.status === 'build' && seg.instLeft > 0) { installments += seg.price * share / seg.instN; seg.instLeft--; }
    }
    inf.lastUpkeep = upkeep; inf.lastInstallments = installments;
    return upkeep + installments;
}

/** Co kwartał (advanceSocialPolicy): zużycie, odcinki bez oferty wracają do przetargu, ogłoszenie projektu. */
function processInfraQuarterly() {
    const inf = ensureInfra(), level = getInfraLevel();
    for (const m of INFRA_MODES) inf.cap[m] = Math.max(INFRA_RULES.capMin, inf.cap[m] - level.wear / 4);
    for (const p of inf.projects) if (p.status === 'tender' || p.status === 'build') openInfraTenders(p);
    sweepInfraCash();
    const chance = level.chance / 4 * ((Number(society.budget?.deficitQuarters) || 0) > 0 ? 0.5 : 1);
    if (Math.random() < chance) announceInfraProject();
    if (inf.projects.length > 40) inf.projects = inf.projects.filter((p, i) => i >= inf.projects.length - 40 || p.status !== 'cancelled'); // ukończone zostają (limit, lotnisko)
}

/** Interwencja 0.15.3 „program robót publicznych”: projekt z listy (poniżej limitu); bez wolnego typu — dopłata jak dotąd. */
function orderPublicWorksProject() {
    const p = announceInfraProject(pickInfraType(), 'program robót publicznych');
    return p || (typeof crisisSubsidy === 'function' ? crisisSubsidy(['Budowlany'], 0.03, 'Program robót publicznych') : null);
}

// --- PPP gracza przy projekcie państwa: spłata ze skarbu, oprocentowanie obligacji skarbowych + 1 pp ---
function createInfraPppOffer(p) {
    if (typeof ensurePpp !== 'function' || typeof city !== 'object' || !city) return null;
    const ppp = ensurePpp(), def = INFRA_TYPES[p.type];
    const rate = (typeof getBondMarketRate === 'function' ? getBondMarketRate({ isStateBond: true }) : 0.04) + (typeof getDeficitBondPremium === 'function' ? getDeficitBondPremium() : 0) + INFRA_RULES.pppSpread;
    const quarters = Math.max(...p.segs.map(s => Math.round(s.days / INFRA_DAYS_PER_QUARTER)));
    const offer = { id: `ppp_${ppp.nextId++}`, name: def.name, icon: '🏗️', total: Math.round(p.cost * INFRA_RULES.pppShare / 500) * 500, raised: 0, rate, termWeeks: (quarters + INFRA_RULES.pppExtraQuarters) * WEEKS_PER_QUARTER, weeksLeft: PPP_OFFER_WEEKS, risk: 0, payer: 'state', infraId: p.id };
    ppp.offers.push(offer);
    return offer;
}
function noteInfraPpp(offer, amount) {
    const p = ensureInfra().projects.find(x => x.id === offer.infraId);
    if (p) p.ppp += amount;
}

function checkInfraInvariants() {
    if (typeof society !== 'object' || !society?.infra) return [];
    return INFRA_MODES.filter(m => { const c = society.infra.cap[m]; return !Number.isFinite(c) || c < INFRA_RULES.capMin - 1e-9 || c > getInfraCapUpper(m) + 1e-9; })
        .map(m => `infrastruktura ${m}: przepustowość ${society.infra.cap[m]}`);
}

/** Państwo → Prawa: poziomy ustawy „Finansowanie infrastruktury” z wydatkami i zużyciem przepustowości. */
function renderInfraLawSteps() {
    const law = SOCIAL_LAWS.infrastructure, now = Number(society.laws.infrastructure);
    const steps = law.levels.map((name, i) => `<li class="${i === now ? 'current' : i < now ? 'done' : ''}"${i === now ? ' aria-current="step"' : ''}><span class="crisis-step-no">${i + 1}</span>${escapeHtml(name)}${i === now ? ' <em>(teraz)</em>' : ''}<small>wydatki ${formatNumberPl(INFRA_LEVELS[i].spend * 100, 1)}% · zużycie ${formatNumberPl(INFRA_LEVELS[i].wear * 100, 1)}%</small></li>`).join('');
    return `<div class="crisis-section mt-3"><h4 class="bank-section-title">${escapeHtml(law.name)}</h4><ol class="crisis-axis law-steps" aria-label="Poziomy ustawy">${steps}</ol></div>`;
}
