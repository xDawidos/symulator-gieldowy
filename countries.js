// =================================================================================
// 0.16.2 G5: PLATFORMA RYNKU ZAGRANICZNEGO
// Kraj dołączony do giełdy ma operatora (prowizja), własną stopę, nastrój (`marketRegimes[kraj]` skorelowany z PL), limit spółek
// (1,5 × liczba startowa) i spółki w wersji uproszczonej: cena w walucie kraju, bez bilansu i pracowników (jak obcy giganci z gdr.js).
// Definicje krajów (`COUNTRY_DEFS`, dane w countries_data.js) są w kodzie, nie w zapisie — zapisujemy tylko kraje, które dołączyły,
// i dynamikę ich spółek (cena, krótka historia, posiadacze). Obcy emitent żyje w `foreignIssuers` (gdr.js), `kind: 'share'`.
// Zasada niezmiennika: posiadacze (gracz, boty) ≤ float; pakiet państwa jest poza floatem. Zwrot z dywidend jest w cenie (zwrot całkowity).
// =================================================================================

const COUNTRY_RULES = {
    shares: 10_000_000,        // liczba akcji zwykłej spółki (giganci: giantShares)
    giantShares: 30_000_000,
    statePct: 0.5,             // pakiet obcego państwa (poza wolnym obrotem)
    limitMult: 1.5,            // limit spółek kraju = 1,5 × liczba startowa
    historyWeeks: 13,          // zapis uproszczony: 25% długości historii GDR (52 tyg.)
    volScale: 0.24,            // zmienność roczna × beta sektora
    driftYear: 0.08,           // dryf roczny przy zerowej premii (zwrot całkowity)
    premiumDrift: 0.6,         // dryf roczny na jednostkę premii rynku
    rateDrift: 1.5,            // wrażliwość wyceny na odchylenie stopy kraju od średniej × rateSens sektora
    premiumEase: 0.08,         // tygodniowy ruch premii do celu
    fxRateEffect: 0.5,         // wpływ odchylenia stopy kraju na średnią kursu (log na rok na 1 p.p. odchylenia = 0,005)
    commission: 0.006,         // prowizja z biletem
    debutChance: 0.05,         // na kwartał, mnożona przez koniunkturę kraju
    sectorEase: 0.15           // tygodniowy ruch premii sektorowej szoku
};

/** Definicje krajów (countries_data.js): { id, name, currency, region, rho, rateMean, operator, labour, companies: [...] }. */
const COUNTRY_DEFS = {};

let countryState = {};        // kraj → { id, joinedQ, rate, treasury, lastDebutQ, by }
let homeFeed = { last: null, sd: 0.02 }; // GIG jako wspólny czynnik rynków (ostatnia wartość i zmienność tygodniowa)

function resetCountriesState() {
    countryState = {};
    homeFeed = { last: null, sd: 0.02 };
    for (const id of Object.keys(marketRegimes || {})) if (id !== 'home') delete marketRegimes[id];
    if (typeof resetTicketsState === 'function') resetTicketsState(); // boty zostają w aiCompetitors (zapis tablicy); nowa gra: resetForeignBots() w startNewCareer
}

function getCountryDef(id) { return COUNTRY_DEFS[id] || null; }
function getJoinedCountries() { return Object.keys(countryState); }
function isCountryJoined(id) { return Boolean(countryState[id]); }
function getCountryLimit(id) { const def = COUNTRY_DEFS[id]; return def ? Math.ceil(def.companies.length * COUNTRY_RULES.limitMult) : 0; }
function getCountryIssuers(id) { return getForeignIssuerList().filter(i => i.kind === 'share' && i.country === id); }

/** Symbol spółki zagranicznej w jej kraju, np. PLT.US (kwit na giganta jeszcze niedołączonego kraju: ID.GDR). */
function getShareSymbol(issuer) { return issuer.kind === 'share' ? `${issuer.id}.${issuer.country}` : `${issuer.id}.GDR`; }

function getSectorBeta(sector) { return (typeof SECTORS === 'object' && SECTORS[sector]?.profile?.beta) || 1; }
function getSectorRateSens(sector) { return (typeof SECTORS === 'object' && SECTORS[sector]?.profile?.rateSens) ?? 0.7; }

/** Sektory spółki: [[sektor, udział]]; drugi sektor ma 30%. */
function normalizeCompanySectors(sectors) {
    const list = Array.isArray(sectors) ? sectors : [sectors];
    return list.length > 1 ? [[list[0], 0.7], [list[1], 0.3]] : [[list[0], 1]];
}

/** Wypełnia pola statyczne emitenta z definicji (nie zapisujemy ich — wracają z kodu). */
function applyCompanyDef(issuer, countryDef, c) {
    issuer.name = c.name; issuer.country = countryDef.id; issuer.currency = countryDef.currency;
    issuer.sector = Array.isArray(c.sector) ? c.sector[0] : c.sector;
    issuer.sectors = normalizeCompanySectors(c.sector);
    issuer.subsector = c.subsector || null; issuer.niche = c.niche || null;
    issuer.kind = 'share'; issuer.state = c.kind === 'state'; issuer.giant = c.kind === 'giant';
    issuer.special = c.special || null; issuer.vol = c.vol || 1; issuer.desc = c.desc || '';
    issuer.shares = c.kind === 'giant' ? COUNTRY_RULES.giantShares : COUNTRY_RULES.shares;
    issuer.statePack = issuer.state ? Math.round(issuer.shares * COUNTRY_RULES.statePct) : 0;
    issuer.float = issuer.shares - issuer.statePack;
    return issuer;
}

function createCountryIssuer(countryDef, c) {
    const existing = foreignIssuers[c.id];
    const issuer = existing || { id: c.id, price: c.price, holders: {}, history: [c.price], listedQ: macro.quarter, sp: 0 };
    applyCompanyDef(issuer, countryDef, c);
    if (!existing) foreignIssuers[c.id] = issuer;
    issuer.ema = issuer.ema || issuer.price;
    issuer.sp = issuer.sp || 0;
    return issuer;
}

// ---------------------------------------------------------------------------------
// Nastrój kraju, stopa, dołączenie
// ---------------------------------------------------------------------------------

function createCountryRegime(id) {
    const def = COUNTRY_DEFS[id], home = getMarketRegime('home');
    const indep = (MARKET_PHASES.bull.premium[0] + MARKET_PHASES.bull.premium[1]) / 2;
    return { market: id, phase: 'bull', quartersInPhase: 1, phaseLength: 7, indep, premium: def.rho * (home.premium || 0), premiumTarget: def.rho * (home.premiumTarget || 0) + (1 - def.rho) * indep, history: [] };
}

/** Co kwartał: niezależna faza kraju; cel premii = ρ × premia PL + (1 − ρ) × składnik niezależny. */
function advanceCountryRegime(id) {
    const def = COUNTRY_DEFS[id], regime = marketRegimes[id], home = getMarketRegime('home');
    if (!def || !regime) return;
    regime.quartersInPhase++;
    if (regime.quartersInPhase > regime.phaseLength) {
        const cur = MARKET_PHASES[regime.phase] || MARKET_PHASES.bull;
        const next = typeof cur.next === 'function' ? cur.next() : cur.next;
        const nd = MARKET_PHASES[next] || MARKET_PHASES.bull;
        regime.history.unshift({ q: macro.quarter, phase: regime.phase });
        if (regime.history.length > 8) regime.history.length = 8;
        regime.phase = next; regime.quartersInPhase = 1;
        regime.phaseLength = getRandomIntInRange(nd.length[0], nd.length[1]);
        regime.indep = getRandomInRange(nd.premium[0], nd.premium[1]);
    }
    regime.premiumTarget = def.rho * (home.premiumTarget || 0) + (1 - def.rho) * regime.indep;
    if (typeof getCountryCrisisCap === 'function') { const cap = getCountryCrisisCap(id); if (cap !== null) regime.premiumTarget = Math.min(regime.premiumTarget, cap); }
}

function stepCountryRate(id) {
    const def = COUNTRY_DEFS[id], st = countryState[id];
    st.rate = Math.max(0, Math.min(0.12, st.rate + 0.2 * (def.rateMean - st.rate) + normalFx() * 0.0025));
}

function joinCountry(id, by = 'test') {
    const def = COUNTRY_DEFS[id];
    if (!def || countryState[id]) return null;
    countryState[id] = { id, joinedQ: macro.quarter, rate: def.rateMean, treasury: 0, lastDebutQ: macro.quarter, by };
    marketRegimes[id] = createCountryRegime(id);
    for (const c of def.companies) createCountryIssuer(def, c);
    if (typeof spawnForeignBotsFor === 'function') spawnForeignBotsFor(id);
    if (typeof applySectorShock === 'function') applySectorShock('Turystyka', 0.06, 3, { fadeQ: 4 }); // nowe państwo = nowi turyści (malejąco)
    const text = `Giełda w kraju: ${def.name} dołącza do świata gry (${def.operator.name}, waluta ${def.currency}, ${def.companies.length} spółek).`;
    logEvent(`🌍 ${text}`, 'market');
    if (typeof pushNews === 'function') pushNews(`🌍 ${text}`, null);
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('adrGdr');
    return countryState[id];
}

// ---------------------------------------------------------------------------------
// Ceny spółek zagranicznych (co tydzień)
// ---------------------------------------------------------------------------------

/** Wpływ modyfikatora spółki specjalnej (jeden na spółkę): dryf roczny, mnożnik zmienności, tłumienie spadków. */
function getSpecialEffect(issuer) {
    const r = { drift: 0, volMult: 1, bearDamp: 1 };
    const quarterInYear = ((macro.quarter - 1) % 4) + 1;
    switch (issuer.special) {
        case 'defense': r.drift = 0.04; break;                       // kontrakty rosną z wydatkami na obronność
        case 'premiere': r.bearDamp = 0.6; break;                    // Pear: lojalni klienci, mniejszy spadek w recesji (hit albo flop co rok: applySpecialEvents)
        case 'summer': r.drift = quarterInYear >= 2 && quarterInYear <= 3 ? 0.12 : -0.04; break; // upały podbijają sprzedaż
        case 'volatile': r.volMult = 1.6; break;
    }
    return r;
}

/** Premia szoków sektorowych dla spółki: szok własnego kraju albo szok z PL × powiązanie (większy co do modułu). */
function getCountrySectorPremium(issuer) {
    if (!sectorShocks.length) return 0;
    const link = COUNTRY_DEFS[issuer.country]?.rho || 0;
    const time = crisisTime();
    let own = 0, global = 0;
    for (const shock of sectorShocks) {
        const hit = issuer.sectors.find(([name]) => name === shock.sector);
        if (!hit || (shock.subsector && shock.subsector !== issuer.subsector)) continue;
        const value = hit[1] * getSectorShockValue(shock, time);
        if (shock.country) { if (shock.country === issuer.country) own += value; } else global += value;
    }
    global *= link;
    return Math.abs(own) >= Math.abs(global) ? own : global;
}

function stepCountryIssuer(issuer, def, st, regime, homeZ, countryZ) {
    const beta = issuer.sectors.reduce((s, [name, share]) => s + share * getSectorBeta(name), 0);
    const rateSens = issuer.sectors.reduce((s, [name, share]) => s + share * getSectorRateSens(name), 0);
    const fx = getSpecialEffect(issuer);
    const sigma = COUNTRY_RULES.volScale * beta * issuer.vol * fx.volMult / Math.sqrt(52);
    const premiumDrift = COUNTRY_RULES.premiumDrift * regime.premium * (regime.premium < 0 ? fx.bearDamp : 1);
    const rateDrift = -COUNTRY_RULES.rateDrift * rateSens * (st.rate - def.rateMean);
    const drift = (COUNTRY_RULES.driftYear + premiumDrift + rateDrift + fx.drift) / 52;
    const a = Math.sqrt(0.5) * def.rho, b = Math.sqrt(0.5) * Math.sqrt(1 - def.rho * def.rho), c = Math.sqrt(0.5);
    const shock = sigma * (a * homeZ + b * countryZ + c * normalFx());
    // premia szoków sektorowych: cena dąży do wartości z udziałem szoku (zmiana premii przechodzi w cenę)
    const target = getCountrySectorPremium(issuer);
    const dsp = (target - issuer.sp) * COUNTRY_RULES.sectorEase;
    issuer.sp += dsp;
    const logRet = drift - sigma * sigma / 2 + shock + Math.log(Math.max(0.2, 1 + dsp));
    issuer.price = Math.max(0.05, issuer.price * Math.exp(logRet));
    issuer.price = Math.round(issuer.price * 1000) / 1000;
    issuer.ema += (issuer.price - issuer.ema) / 26;
    issuer.history.push(issuer.price);
    if (issuer.history.length > COUNTRY_RULES.historyWeeks) issuer.history.shift();
}

/** Tygodniowy krok krajów dołączonych: wspólny czynnik z GIG, nastrój kraju, stopa → kurs, ceny spółek. */
function stepCountries() {
    const joined = getJoinedCountries();
    const gig = typeof getGigIndexValue === 'function' ? getGigIndexValue() : 1000;
    let homeZ = 0;
    if (homeFeed.last > 0) {
        const ret = Math.log(gig / homeFeed.last);
        homeFeed.sd = Math.max(0.012, 0.97 * homeFeed.sd + 0.03 * Math.abs(ret) * 1.25);
        homeZ = Math.max(-5, Math.min(5, ret / homeFeed.sd));
    }
    homeFeed.last = gig;
    for (const id of joined) {
        const def = COUNTRY_DEFS[id], st = countryState[id], regime = marketRegimes[id];
        if (!def || !st || !regime) continue;
        regime.premium += (regime.premiumTarget - regime.premium) * COUNTRY_RULES.premiumEase;
        const countryZ = normalFx();
        if (fxMeans[def.currency]) fxMeans[def.currency] *= Math.exp((st.rate - def.rateMean) * COUNTRY_RULES.fxRateEffect / 52); // wyższa stopa = mocniejsza waluta
        for (const issuer of getCountryIssuers(id)) stepCountryIssuer(issuer, def, st, regime, homeZ, countryZ);
    }
}

// ---------------------------------------------------------------------------------
// Co kwartał: nastrój, stopa, spółki państwowe, spółki specjalne, debiuty
// ---------------------------------------------------------------------------------

function applySpecialEvents(issuer) {
    const q = ((macro.quarter - 1) % 4) + 1;
    if (issuer.special === 'premiere' && q === 3) { // Pear: premiera modelu — hit albo flop
        const hit = Math.random() < 0.6;
        issuer.price = Math.max(0.05, issuer.price * (hit ? 1 + getRandomInRange(0.06, 0.14) : 1 - getRandomInRange(0.05, 0.12)));
        logEvent(`🌍 ${issuer.name}: premiera nowego modelu — ${hit ? 'hit, kurs rośnie' : 'flop, kurs spada'}.`, 'market');
    } else if (issuer.special === 'season' && q === 4) { // sezon filmowy / telewizyjny
        const hit = Math.random() < 0.5;
        issuer.price = Math.max(0.05, issuer.price * (hit ? 1 + getRandomInRange(0.04, 0.10) : 1 - getRandomInRange(0.04, 0.10)));
    }
}

/** Debiut krajowy: startup kraju wchodzi na jego giełdę (szansa zależy od koniunktury, do limitu). */
function maybeCountryDebut(id) {
    const def = COUNTRY_DEFS[id], st = countryState[id], regime = marketRegimes[id];
    if (getCountryIssuers(id).length >= getCountryLimit(id)) return null;
    if (macro.quarter - st.lastDebutQ < 4 || Math.random() >= COUNTRY_RULES.debutChance * Math.max(0.2, 1 + regime.premium * 3)) return null;
    const base = getRandomElement(def.companies.filter(c => c.kind === 'normal'));
    if (!base) return null;
    const sector = Array.isArray(base.sector) ? base.sector[0] : base.sector;
    let name = null;
    try { name = typeof generateCompanyName === 'function' ? generateCompanyName(sector, base.subsector || null) : null; } catch (e) { name = null; }
    const idStr = `D${macro.quarter}${id}${getCountryIssuers(id).length}`;
    const price = Math.round(fromPln(getRandomInRange(15, 60), def.currency) * 100) / 100 || 10;
    const c = { id: idStr, name: name || `Debiut ${idStr}`, sector: base.sector, subsector: base.subsector, kind: 'normal', price: Math.max(0.5, price), generated: true };
    const issuer = createCountryIssuer(def, c);
    issuer.generated = true;
    st.lastDebutQ = macro.quarter;
    logEvent(`🌍 ${def.name}: debiut ${issuer.name} (${getShareSymbol(issuer)}).`, 'market');
    return issuer;
}

function processCountriesQuarterly() {
    if (typeof processAirportQuarterly === 'function') processAirportQuarterly();
    for (const id of getJoinedCountries()) {
        const def = COUNTRY_DEFS[id], st = countryState[id];
        advanceCountryRegime(id);
        stepCountryRate(id);
        for (const issuer of getCountryIssuers(id)) {
            applySpecialEvents(issuer);
            if (issuer.state) st.treasury += issuer.statePack * issuer.price * 0.005; // dywidenda państwowa ≈ 2%/rok do licznika „skarbu kraju” (tylko wgląd)
        }
        maybeCountryDebut(id);
        if (typeof processForeignBotsQuarterly === 'function') processForeignBotsQuarterly(id);
    }
}

// ---------------------------------------------------------------------------------
// Handel gracza (tylko z biletem), niezmienniki, zapis
// ---------------------------------------------------------------------------------

function getIssuerSymbolOrNull(id) { return foreignIssuers[id] || null; }

function checkCountryInvariants() {
    const problems = [];
    for (const id of getJoinedCountries()) {
        const n = getCountryIssuers(id).length, limit = getCountryLimit(id);
        if (n > limit) problems.push(`kraj ${id}: ${n} spółek > limit ${limit}`);
        if (!COUNTRY_DEFS[id]) problems.push(`kraj ${id} bez definicji`);
        const r = fxRates?.[COUNTRY_DEFS[id]?.currency];
        if (r !== undefined && !(r > 0)) problems.push(`kraj ${id}: kurs ${r}`);
    }
    for (const issuer of getForeignIssuerList()) {
        if (issuer.kind !== 'share') continue;
        if (!countryState[issuer.country]) problems.push(`spółka ${issuer.id} w kraju niedołączonym ${issuer.country}`);
        if (issuer.state && getGdrFree(issuer) < -1e-6) problems.push(`pakiet państwa ${issuer.id} naruszony`);
    }
    if (typeof checkForeignBotInvariants === 'function') problems.push(...checkForeignBotInvariants());
    return problems;
}

/** Zapis uproszczony: tylko dynamika (cena, krótka historia, posiadacze); definicja wraca z kodu. Spółki z debiutu (generated) mają pełny opis. */
function getCountriesSnapshot() {
    if (!getJoinedCountries().length && !(typeof hasTicketData === 'function' && hasTicketData())) return undefined;
    const issuers = {};
    for (const i of getForeignIssuerList()) {
        if (i.kind !== 'share') continue;
        const row = { p: i.price, h: i.history.slice(-COUNTRY_RULES.historyWeeks), q: i.listedQ, sp: Math.round(i.sp * 1e4) / 1e4, e: Math.round(i.ema * 1e3) / 1e3 };
        if (Object.keys(i.holders).length) row.o = i.holders;
        if (i.generated) row.g = { name: i.name, sector: i.sectors.map(s => s[0]), subsector: i.subsector, country: i.country, currency: i.currency };
        issuers[i.id] = row;
    }
    return {
        state: countryState, issuers, regimes: Object.fromEntries(getJoinedCountries().map(id => [id, marketRegimes[id]])),
        feed: homeFeed, tickets: typeof getTicketsSnapshot === 'function' ? getTicketsSnapshot() : undefined, bots: typeof getForeignBotsSnapshot === 'function' ? getForeignBotsSnapshot() : undefined
    };
}

function applyCountriesSnapshot(snapshot) {
    resetCountriesState();
    if (!snapshot || typeof snapshot !== 'object') return; // zapis bez krajów
    for (const [id, st] of Object.entries(snapshot.state || {})) {
        const def = COUNTRY_DEFS[id];
        if (!def) continue; // kraj usunięty z kodu: pomijamy
        countryState[id] = { id, joinedQ: Number(st.joinedQ) || 0, rate: Number(st.rate) || def.rateMean, treasury: Number(st.treasury) || 0, lastDebutQ: Number(st.lastDebutQ) || 0, by: st.by || 'test' };
        const raw = snapshot.regimes?.[id];
        marketRegimes[id] = raw && typeof raw === 'object' ? { ...createCountryRegime(id), ...raw } : createCountryRegime(id);
        for (const c of def.companies) createCountryIssuer(def, c);
    }
    for (const [id, row] of Object.entries(snapshot.issuers || {})) {
        let issuer = foreignIssuers[id];
        if (!issuer && row.g && countryState[row.g.country]) {
            const def = COUNTRY_DEFS[row.g.country];
            issuer = createCountryIssuer(def, { id, name: row.g.name, sector: row.g.sector, subsector: row.g.subsector, kind: 'normal', price: Number(row.p) || 10 });
            issuer.generated = true;
        }
        if (!issuer) continue;
        if (Number(row.p) > 0) issuer.price = Number(row.p);
        issuer.history = Array.isArray(row.h) ? row.h.map(Number).filter(Number.isFinite) : [issuer.price];
        issuer.listedQ = Number(row.q) || 0; issuer.sp = Number(row.sp) || 0; issuer.ema = Number(row.e) > 0 ? Number(row.e) : issuer.price;
        issuer.holders = {};
        for (const [holder, qty] of Object.entries(row.o || {})) if (Number(qty) > 0) issuer.holders[holder] = Number(qty);
    }
    if (snapshot.feed && typeof snapshot.feed === 'object') homeFeed = { last: Number(snapshot.feed.last) || null, sd: Number(snapshot.feed.sd) || 0.02 };
    if (typeof applyTicketsSnapshot === 'function') applyTicketsSnapshot(snapshot.tickets);
}


// =================================================================================
// 0.16.2 G7: LOTNISKO I BILETY
// Warstwa danych (bez DOM): lotnisko, bilety, dostęp do rynku, handel akcjami zagranicznymi. Wyświetlanie jest osobno (countries_ui.js:
// `renderAirportWindow`), żeby w 0.16.5 przenieść je na stronę „Ferie i wakacje” w Internecie bez zmian w logice.
// Lotnisko to megaprojekt „Port lotniczy” (state.js): miasto ogłasza go przez istniejący mechanizm, a wykonawcą jest spółka budowlana.
// Bilet = licencja na rynek kraju, każdy inwestor osobno (gracz z gotówki funduszu, boty z własnej gotówki). Kupno spółek kraju przez
// kantor z prowizją 0,6% (zamiast 0,25% na rynku krajowym). Pierwszy bilet do kraju niedołączonego otwiera jego giełdę.
// =================================================================================

const TICKET_RULES = {
    rate: 0.05,              // cena biletu = 5% przepustki kraju (START_COUNTRIES.passCost), nie mniej niż 1000 zł
    min: 1000,
    tourismBonus: 0.015,     // premia Turystyki za sprzedany bilet (malejąca w 2 kw.)
    botChance: 0.10,         // na kwartał i kraj: bot kupuje bilet (po ukończeniu lotniska)
    autoOrderChance: 0.12,   // na kwartał: miasto samo zleca lotnisko (od kwartału autoOrderFromQ)
    autoOrderFromQ: 8,
    joinCooldownQ: 2         // odstęp między otwarciami krajów
};

let foreignTickets = {};     // posiadacz ('player' | id bota) → [kraje]
let airportState = { orderedQ: null, forced: false, lastJoinQ: -99 };

function resetTicketsState() { foreignTickets = {}; airportState = { orderedQ: null, forced: false, lastJoinQ: -99 }; }
function hasTicketData() { return Object.keys(foreignTickets).length > 0 || airportState.orderedQ !== null || airportState.forced; }
function getTicketsSnapshot() { return { t: foreignTickets, a: airportState }; }
function applyTicketsSnapshot(snapshot) {
    resetTicketsState();
    if (!snapshot || typeof snapshot !== 'object') return;
    for (const [holder, list] of Object.entries(snapshot.t || {})) if (Array.isArray(list)) foreignTickets[holder] = list.filter(c => COUNTRY_DEFS[c]);
    const a = snapshot.a || {};
    airportState = { orderedQ: a.orderedQ ?? null, forced: Boolean(a.forced), lastJoinQ: Number(a.lastJoinQ) || -99 };
}

function isAirportBuilt() {
    return airportState.forced || (typeof specialProjects === 'object' && Boolean(specialProjects?.completed?.some(p => !p.timed && p.templateId === 'airport')));
}
function isAirportInProgress() { return typeof specialProjects === 'object' && Boolean(specialProjects?.active?.some(p => !p.timed && p.templateId === 'airport')); }

/** Miasto zleca budowę lotniska (megaprojekt z wykonawcą budowlanym). Zwraca { ok, reason }. */
function orderAirport() {
    if (isAirportBuilt()) return { ok: false, reason: 'Lotnisko już stoi.' };
    if (isAirportInProgress()) return { ok: false, reason: 'Lotnisko jest w budowie.' };
    if (typeof ensureSpecialProjects === 'function') ensureSpecialProjects();
    if (specialProjects.active.length >= MAX_ACTIVE_PROJECTS) return { ok: false, reason: 'Miasto prowadzi już maksymalną liczbę megaprojektów.' };
    const def = MEGA_PROJECTS.find(p => p.id === 'airport');
    if (!def || isMegaProjectTaken('airport')) return { ok: false, reason: 'Lotnisko nie jest dostępne.' };
    createProject(def);
    airportState.orderedQ = macro.quarter;
    return { ok: true };
}

function getTicketPrice(country) {
    const pass = START_COUNTRIES.find(c => c.id === country)?.passCost || 0;
    return Math.max(TICKET_RULES.min, Math.round(pass * TICKET_RULES.rate / 100) * 100);
}
function hasTicket(holder, country) { return Boolean(foreignTickets[holder]?.includes(country)); }
function getCountryCommission(country) { return COUNTRY_DEFS[country]?.operator?.commission ?? COUNTRY_RULES.commission; }
/** Dostęp do zakupu spółek kraju: kraj dołączył i inwestor ma bilet. */
function canTradeCountry(holder, country) { return isCountryJoined(country) && hasTicket(holder, country); }

/** Bilet dla gracza (holder 'player', gotówka funduszu) albo bota (obiekt z `cash`). Pierwszy bilet do nowego kraju otwiera jego giełdę. */
function buyTicket(country, holder = 'player') {
    const def = COUNTRY_DEFS[country], isPlayer = holder === 'player';
    const id = isPlayer ? 'player' : holder?.id;
    if (!def) return { ok: false, reason: 'Nieznany kraj.' };
    if (!isAirportBuilt()) return { ok: false, reason: 'Bilety sprzedaje dopiero lotnisko — miasto musi je wybudować.' };
    if (hasTicket(id, country)) return { ok: false, reason: 'Masz już bilet na ten rynek.' };
    const price = getTicketPrice(country);
    if (isPlayer) {
        if (typeof playerFund !== 'object' || !playerFund) return { ok: false, reason: 'Bilet kupuje fundusz.' };
        if (price > playerCash + 1e-9) return { ok: false, reason: `Za mało gotówki funduszu (bilet ${formatNumberPl(price, 0)} zł).` };
        playerCash -= price;
        recordPayment('player-fund', 'external:linie-lotnicze', price, `Bilet: rynek ${def.name}`);
    } else {
        if (!holder || !(holder.cash >= price)) return { ok: false, reason: 'Za mało gotówki inwestora.' };
        holder.cash -= price;
        recordPayment(holder, 'external:linie-lotnicze', price, `Bilet: rynek ${def.name}`);
    }
    (foreignTickets[id] = foreignTickets[id] || []).push(country);
    const opened = !isCountryJoined(country);
    if (opened) { joinCountry(country, id); airportState.lastJoinQ = macro.quarter; }
    if (typeof applySectorShock === 'function') applySectorShock('Turystyka', TICKET_RULES.tourismBonus, 2, { fadeQ: 2 });
    if (isPlayer && typeof onTicketPurchased === 'function') onTicketPurchased(country, opened); // haczyk animacji lotu (countries_ui.js)
    return { ok: true, price, opened };
}

/** Co kwartał: miasto samo zleca lotnisko; po jego ukończeniu boty kupują bilety i otwierają kolejne kraje. */
function processAirportQuarterly() {
    const q = macro.quarter;
    if (!isAirportBuilt() && !isAirportInProgress() && q >= TICKET_RULES.autoOrderFromQ && Math.random() < TICKET_RULES.autoOrderChance) orderAirport();
    if (!isAirportBuilt() || q - airportState.lastJoinQ < TICKET_RULES.joinCooldownQ) return;
    const closed = Object.keys(COUNTRY_DEFS).filter(id => !isCountryJoined(id));
    if (!closed.length || Math.random() >= TICKET_RULES.botChance * closed.length) return;
    const country = getRandomElement(closed), price = getTicketPrice(country);
    const buyers = aiCompetitors.filter(ai => !ai.isMafia && !ai.isGuard && !ai.isForeignBot && ai.personality !== 'market_maker' && ai.cash >= price * 8);
    if (buyers.length) buyTicket(country, getRandomElement(buyers));
}

// --- Handel akcjami zagranicznymi (gracz) ---

function buyForeignShares(issuerId, quantity) {
    const issuer = foreignIssuers[issuerId];
    quantity = Math.floor(Number(quantity));
    if (!issuer || issuer.kind !== 'share') return { ok: false, reason: 'Ta spółka nie jest notowana na rynku zagranicznym.' };
    if (!(quantity > 0)) return { ok: false, reason: 'Podaj liczbę akcji.' };
    if (typeof playerFund !== 'object' || !playerFund) return { ok: false, reason: 'Akcje kupuje fundusz.' };
    const def = COUNTRY_DEFS[issuer.country];
    if (!canTradeCountry('player', issuer.country)) return { ok: false, reason: `Brak biletu na rynek: ${def?.name || issuer.country}. Bilet kupisz na lotnisku.` };
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return { ok: false, reason: 'Handel wstrzymany — zadziałał bezpiecznik giełdowy.' };
    if (quantity > getGdrFree(issuer)) return { ok: false, reason: 'Nie ma tylu akcji w wolnym obrocie.' };
    const cur = issuer.currency, valueLocal = quantity * issuer.price, midPln = toPln(valueLocal, cur);
    const commissionPln = midPln * getCountryCommission(issuer.country);
    const have = getCurrencyCash('player', cur), useLocal = Math.min(have, valueLocal), restLocal = valueLocal - useLocal;
    let restPln = 0, spreadCost = 0;
    if (restLocal > 1e-9) { const q = getKantorQuote(cur, toPln(restLocal, cur), 'buy'); restPln = restLocal * q.rate; spreadCost = restPln - restLocal * q.mid; }
    const total = restPln + commissionPln;
    if (total > playerCash + 1e-9) return { ok: false, reason: 'Za mało gotówki funduszu.' };
    playerCash -= total;
    if (useLocal > 0) { playerCashByCurrency[cur] = have - useLocal; if (playerCashByCurrency[cur] < 1e-9) delete playerCashByCurrency[cur]; }
    issuer.holders.player = getGdrHeld(issuer) + quantity;
    if (spreadCost > 0) recordPayment('player-fund', 'external:kantor', spreadCost, 'Kantor: spread przy zakupie akcji zagranicznych');
    if (commissionPln > 0) recordPayment('player-fund', `external:${def.operator.id}`, commissionPln, `Prowizja: ${def.operator.name}`);
    return { ok: true, cost: total, commissionPln, spreadCost };
}

/** Sprzedaż: wpływ w walucie spółki (minus prowizja); złotówki zdobędziesz w kantorze. */
function sellForeignShares(issuerId, quantity) {
    const issuer = foreignIssuers[issuerId];
    quantity = Math.floor(Number(quantity));
    if (!issuer || issuer.kind !== 'share' || !(quantity > 0)) return { ok: false, reason: 'Podaj liczbę akcji.' };
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return { ok: false, reason: 'Handel wstrzymany — zadziałał bezpiecznik giełdowy.' };
    const held = getGdrHeld(issuer);
    if (quantity > held) return { ok: false, reason: 'Za mało akcji.' };
    const def = COUNTRY_DEFS[issuer.country], gross = quantity * issuer.price, fee = gross * getCountryCommission(issuer.country);
    issuer.holders.player = held - quantity;
    if (issuer.holders.player <= 0) delete issuer.holders.player;
    addCurrencyCash('player', issuer.currency, gross - fee);
    recordPayment('player-fund', `external:${def.operator.id}`, toPln(fee, issuer.currency), `Prowizja: ${def.operator.name}`);
    return { ok: true, proceeds: gross - fee, currency: issuer.currency };
}


// =================================================================================
// 0.16.2 G8: BOTY ZAGRANICZNE (Niemcy, USA, Czechy)
// Pojawiają się dopiero po dołączeniu kraju. To wpisy w `aiCompetitors` z flagą `isForeignBot` (zapis, ranking i posiadacze jak u innych botów),
// ale bez `makeAiDecision`: handlują własną, krótką logiką raz na kwartał, gotówka jest w walutach (`cashByCurrency`, G2c).
// Zabezpieczenia: najwyżej BOT_RULES.tradesPerQuarter transakcji na kwartał; w 1. roku po dołączeniu kraju żaden bot nie ma ponad 50% spółki.
// Michael „Dad” Santos dodatkowo „wchodzi na rynek” kraju startowego (G7b): kupuje losowo polskie spółki po kursie kantoru.
// =================================================================================

const FOREIGN_BOTS = [
    { id: 'fb_santos', name: 'Michael „Dad” Santos', country: 'US', style: 'ideal', cash: { USD: 12000 }, enterHome: true },
    { id: 'fb_kozel', name: 'Peter „Lech” Kozel', country: 'CZ', style: 'czech', cash: { EUR: 4000, CZK: 80000 }, reserve: 0.2, favorite: 'PIV', also: ['DE'] },
    { id: 'fb_vogel', name: 'Heinrich „Wieloryb” Vogel', country: 'DE', style: 'stable', cash: { EUR: 15000 }, avoidHome: true }
];

const BOT_RULES = {
    tradesPerQuarter: 4,        // limit transakcji na kwartał
    maxStakeFirstYear: 0.5,     // najwyżej 50% spółki w 1. roku po dołączeniu kraju
    maxStake: 0.6,
    firstYearQuarters: 4,
    spendShare: 0.3,            // część gotówki na jedną transakcję
    takeProfit: 1.25,           // sprzedaż połowy pozycji przy zysku 25%
    homeEntryDelay: [1, 3],     // kwartały od dołączenia kraju do wejścia bota na rynek PL
    conversionSpread: 0.015
};

function getForeignBots() { return aiCompetitors.filter(ai => ai.isForeignBot); }

function resetForeignBots() {
    for (let i = aiCompetitors.length - 1; i >= 0; i--) if (aiCompetitors[i].isForeignBot) aiCompetitors.splice(i, 1);
}

function spawnForeignBotsFor(country) {
    for (const def of FOREIGN_BOTS.filter(b => b.country === country)) {
        if (aiCompetitors.some(ai => ai.id === def.id)) continue;
        const bot = {
            id: def.id, name: def.name, cash: 0, portfolio: {}, loans: [], personality: `foreign_${def.style}`, isForeignBot: true, homeCountry: country,
            accessLevel: 1, hasTBillAccess: false, tBills: [], skillPoints: 0, unlockedSkills: {}, creditScore: 100,
            cashByCurrency: { ...def.cash }, fx: { joinQ: macro.quarter, trades: 0, tradesQ: -1, cost: {}, enteredHome: false, entryQ: def.enterHome ? macro.quarter + getRandomIntInRange(...BOT_RULES.homeEntryDelay) : null }
        };
        bot.fx.reservePln = getForeignCashPln(bot) * (def.reserve || 0);
        aiCompetitors.push(bot);
        (foreignTickets[bot.id] = foreignTickets[bot.id] || []).push(country); // własny rynek bez biletu
        logEvent(`🌍 Na giełdzie ${COUNTRY_DEFS[country].name} pojawia się inwestor ${bot.name}.`, 'market');
    }
}

/** Wartość akcji zagranicznych podmiotu (id bota) w złotych — do majątku i rankingu. */
function getForeignSharesValue(holderId) {
    let total = 0;
    for (const issuer of getForeignIssuerList()) { const q = Number(issuer.holders?.[holderId]) || 0; if (q) total += q * toPln(issuer.price, issuer.currency); }
    return total;
}

/** Płatność bota w walucie: najpierw ta sama waluta, potem inne (po kursie z narzutem). Zwraca false, gdy brak środków. */
function botPay(bot, currency, amountLocal) {
    const bag = bot.cashByCurrency || (bot.cashByCurrency = {});
    let need = amountLocal;
    const own = Math.min(Number(bag[currency]) || 0, need);
    const needPlnLeft = toPln(need - own, currency) * (1 + BOT_RULES.conversionSpread);
    let others = 0;
    for (const code of Object.keys(bag)) if (code !== currency) others += toPln(bag[code], code);
    if (needPlnLeft > others + 1e-9) return false;
    bag[currency] = (Number(bag[currency]) || 0) - own; need -= own;
    let pln = need > 1e-9 ? toPln(need, currency) * (1 + BOT_RULES.conversionSpread) : 0;
    for (const code of Object.keys(bag)) {
        if (pln <= 1e-9) break;
        if (code === currency) continue;
        const take = Math.min(toPln(bag[code], code), pln);
        bag[code] -= fromPln(take, code); pln -= take;
    }
    for (const code of Object.keys(bag)) if (!(bag[code] > 1e-9)) delete bag[code];
    return true;
}

function botSpendable(bot) { return Math.max(0, getForeignCashPln(bot) - (bot.fx.reservePln || 0)); } // rezerwa na wydatki prywatne (Kozel: 20% początkowego kapitału)

function getBotStake(issuer, bot) { return (Number(issuer.holders?.[bot.id]) || 0) / issuer.shares; }
function botStakeCap(issuer, bot) {
    const joined = countryState[issuer.country]?.joinedQ ?? -99;
    return macro.quarter - joined < BOT_RULES.firstYearQuarters ? BOT_RULES.maxStakeFirstYear : BOT_RULES.maxStake;
}

function botPickTarget(bot, def) {
    const pool = id => getCountryIssuers(id).filter(i => !(i.state && getGdrFree(i) <= 0));
    let candidates = pool(def.country);
    if (def.style === 'czech') {
        const fav = foreignIssuers[def.favorite];
        if (fav && fav.kind === 'share' && Math.random() < 0.5) return fav;
        for (const extra of def.also || []) if (canTradeCountry(bot.id, extra)) candidates = candidates.concat(pool(extra));
    }
    if (def.style === 'stable') candidates = candidates.filter(i => i.sectors.reduce((s, [n, w]) => s + w * getSectorBeta(n), 0) <= 1.0);
    if (!candidates.length) return null;
    if (def.style === 'ideal') return candidates.slice().sort((a, b) => a.price / a.ema - b.price / b.ema)[0]; // „idealnie”: najtańsza względem swojej średniej
    return getRandomElement(candidates);
}

function foreignBotBuy(bot, def) {
    const issuer = botPickTarget(bot, def);
    if (!issuer) return false;
    const budgetPln = botSpendable(bot) * BOT_RULES.spendShare, mid = toPln(issuer.price, issuer.currency);
    const cap = Math.floor(issuer.shares * botStakeCap(issuer, bot)) - (Number(issuer.holders[bot.id]) || 0);
    let qty = Math.min(Math.floor(budgetPln / mid), cap, Math.floor(getGdrFree(issuer)));
    if (!(qty >= 1)) return false;
    const cost = qty * issuer.price * (1 + getCountryCommission(issuer.country));
    if (!botPay(bot, issuer.currency, cost)) return false;
    const held = Number(issuer.holders[bot.id]) || 0, prev = (bot.fx.cost[issuer.id] || issuer.price) * held;
    issuer.holders[bot.id] = held + qty;
    bot.fx.cost[issuer.id] = (prev + qty * issuer.price) / (held + qty);
    return true;
}

function foreignBotSell(bot) {
    const positions = getForeignIssuerList().filter(i => (Number(i.holders[bot.id]) || 0) > 0);
    const winners = positions.filter(i => i.price >= (bot.fx.cost[i.id] || i.price) * BOT_RULES.takeProfit);
    const issuer = winners.length ? getRandomElement(winners) : (positions.length && Math.random() < 0.3 ? getRandomElement(positions) : null);
    if (!issuer) return false;
    const held = issuer.holders[bot.id], qty = Math.max(1, Math.floor(held / 2));
    const gross = qty * issuer.price;
    issuer.holders[bot.id] = held - qty;
    if (issuer.holders[bot.id] <= 0) { delete issuer.holders[bot.id]; delete bot.fx.cost[issuer.id]; }
    addCurrencyCash(bot, issuer.currency, gross * (1 - getCountryCommission(issuer.country)));
    return true;
}

/** Wejście bota na rynek kraju startowego (G7b): kupuje losowe polskie spółki za złote z wymiany walut. */
function botTradeHome(bot, def) {
    const budgetPln = botSpendable(bot) * BOT_RULES.spendShare;
    const pool = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.isTradeLocked && s.price > 0 && s.price < budgetPln && getAvailableShares(s) > 0);
    if (!pool.length) return false;
    const stock = getRandomElement(pool), qty = Math.min(Math.floor(budgetPln / stock.price), Math.floor(stock.totalShares * 0.02), Math.floor(getAvailableShares(stock)));
    if (!(qty >= 1) || (bot.portfolio[stock.symbol]?.shares || 0) + qty > stock.totalShares * (macro.quarter - bot.fx.joinQ < BOT_RULES.firstYearQuarters ? BOT_RULES.maxStakeFirstYear : BOT_RULES.maxStake)) return false;
    const needPln = qty * stock.price * 1.01;
    for (const code of Object.keys(bot.cashByCurrency)) {
        const take = Math.min(toPln(bot.cashByCurrency[code], code), Math.max(0, needPln - bot.cash));
        if (take <= 0) continue;
        bot.cashByCurrency[code] -= fromPln(take, code);
        bot.cash += take * (1 - BOT_RULES.conversionSpread);
    }
    const before = bot.portfolio[stock.symbol]?.shares || 0;
    aiBuyStock(bot, stock.symbol, qty);
    return (bot.portfolio[stock.symbol]?.shares || 0) > before;
}

function runForeignBot(bot) {
    const def = FOREIGN_BOTS.find(b => b.id === bot.id);
    if (!def || !isCountryJoined(bot.homeCountry)) return;
    if (bot.fx.tradesQ !== macro.quarter) { bot.fx.tradesQ = macro.quarter; bot.fx.trades = 0; }
    if (def.enterHome && !bot.fx.enteredHome && bot.fx.entryQ !== null && macro.quarter >= bot.fx.entryQ) {
        bot.fx.enteredHome = true;
        const text = `${bot.name} wchodzi na naszą giełdę z gotówką w ${Object.keys(bot.cashByCurrency).join(' i ')} — kupuje polskie spółki po kursie kantoru.`;
        logEvent(`🌍 ${text}`, 'market');
        if (typeof pushNews === 'function') pushNews(`🌍 ${text}`, null);
    }
    for (let k = 0; k < BOT_RULES.tradesPerQuarter && bot.fx.trades < BOT_RULES.tradesPerQuarter; k++) {
        if (Math.random() < 0.35) continue; // nie każdy kwartał jest aktywny
        const roll = Math.random();
        let done = false;
        if (def.enterHome && bot.fx.enteredHome && roll < 0.35) done = botTradeHome(bot, def);
        else if (roll < 0.8) done = foreignBotBuy(bot, def);
        else done = foreignBotSell(bot);
        if (done) bot.fx.trades++;
    }
}

function processForeignBotsQuarterly(country) {
    for (const bot of getForeignBots().filter(b => b.homeCountry === country)) runForeignBot(bot);
}

function getForeignBotsSnapshot() { return undefined; } // boty są w aiCompetitors (zapis tablicy), stan w `bot.fx`

function checkForeignBotInvariants() {
    const problems = [];
    for (const bot of getForeignBots()) {
        if (!isCountryJoined(bot.homeCountry)) problems.push(`bot ${bot.name} bez kraju ${bot.homeCountry}`);
        for (const issuer of getForeignIssuerList()) {
            if (issuer.kind === 'share' && getBotStake(issuer, bot) > BOT_RULES.maxStake + 1e-9) problems.push(`bot ${bot.name} ma ${(getBotStake(issuer, bot) * 100).toFixed(0)}% ${issuer.id}`);
        }
    }
    return problems;
}


// =================================================================================
// 0.16.2 G9: KORELACJA I ZARAŻANIE KRYZYSÓW MIĘDZY KRAJAMI
// Korelacja nastrojów: cel premii kraju = ρ × premia PL + (1 − ρ) × składnik niezależny (advanceCountryRegime), a ceny dostają wspólny czynnik z GIG.
// Budżet częstości linii jest jeden (crises.js: 1%/kw. po ≥ 12 kw. spokoju, 40% krachów zastępuje linia): z tych samych losowań ok. 25% linii
// zaczyna się za granicą (tylko w kraju otwartym), a do Polski dociera po 0–2 kw. (`crisisState.pendingImport`, potem zwykła linia z polem `origin`).
// Linia z PL dociera do krajów otwartych: szok sektorowy × ρ (powiązanie) i obniżony cel premii rynku. Szok sektorowy ma pole `country`.
// =================================================================================

const CONTAGION_RULES = {
    foreignOriginChance: 0.25,   // część linii zaczynająca się w kraju obcym (gdy jakiś kraj jest otwarty)
    delayQ: [0, 2],              // opóźnienie dotarcia do Polski
    originPremium: -0.30,        // cel premii rynku kraju, w którym wybuchł kryzys
    homeCap: -0.25,              // cel premii kraju obcego przy linii z PL: homeCap × ρ × waga etapu
    stageWeights: { spark: 0, burst: 1, spread: 1, intervention: 0.7, bottom: 0.5, recovery: 0.2 }
};

/** Linia, która zaczyna się w kraju obcym: szoki w tym kraju od razu, do Polski dociera po `delay` kwartałach. Zwraca { pending } albo null. */
function startForeignOriginCrisis(lineId, options = {}) {
    const open = getJoinedCountries();
    if (!open.length || Math.random() >= CONTAGION_RULES.foreignOriginChance) return null;
    const def = CRISIS_LINES[lineId], origin = getRandomElement(open), q = crisisQuarter();
    const delay = getRandomIntInRange(...CONTAGION_RULES.delayQ);
    crisisState.pendingImport = { id: lineId, origin, startQ: q, arriveQ: q + delay };
    crisisState.lastEventQ = q;
    if (!crisisState.used.includes(lineId)) crisisState.used.push(lineId);
    for (const item of [...def.lose, ...def.gain]) {
        if (!item.premium) continue;
        addSectorShock(item.sector, item.premium, { subsector: item.subsector, rampQ: 1, holdQ: 3, fadeQ: rangeInt(def.recoveryQ), lineId, country: origin, startQ: crisisTime() });
    }
    const regime = marketRegimes[origin];
    if (regime) { regime.phase = 'capitulation'; regime.quartersInPhase = 1; regime.phaseLength = 2; regime.indep = CONTAGION_RULES.originPremium; }
    const place = COUNTRY_DEFS[origin].name;
    const text = `${def.name} wybucha w kraju ${place}${delay ? ` — do Polski dotrze za ok. ${delay} kw.` : ' — Polska odczuwa ją od razu.'}`;
    logEvent(`${def.icon} ${text}`, 'macro');
    if (typeof pushNews === 'function') pushNews(`${def.icon} ${text}`);
    return { pending: true, origin, arriveQ: q + delay };
}

/** Co kwartał: zaczyna linię w Polsce, gdy minęło opóźnienie. Zwraca true, gdy właśnie wystartowała. */
function processImportedCrisis() {
    const p = crisisState.pendingImport;
    if (!p || crisisQuarter() < p.arriveQ) return false;
    crisisState.pendingImport = null;
    const line = startCrisisLine(p.id, { skipSpark: true, arrived: true, origin: p.origin });
    if (line) {
        line.delayQ = p.arriveQ - p.startQ;
        const text = `${CRISIS_LINES[p.id].name} z kraju ${COUNTRY_DEFS[p.origin]?.name || p.origin} dociera do Polski.`;
        logEvent(`${CRISIS_LINES[p.id].icon} ${text}`, 'macro');
    }
    return true;
}

/** Górny cel premii rynku kraju w trakcie kryzysu (null = brak ograniczenia). */
function getCountryCrisisCap(id) {
    const p = crisisState.pendingImport;
    if (p && p.origin === id) return CONTAGION_RULES.originPremium;
    if (!crisisLine) return null;
    const w = CONTAGION_RULES.stageWeights[crisisLine.stage] || 0;
    if (!w) return null;
    if (crisisLine.origin === id) return CONTAGION_RULES.originPremium * w;
    return CONTAGION_RULES.homeCap * (COUNTRY_DEFS[id]?.rho || 0) * w;
}

/** Podsumowanie do interfejsu: kraje otwarte z powiązaniem, opóźnieniem i stanem zarażenia. */
function getContagionSummary() {
    const p = crisisState.pendingImport;
    return {
        pending: p ? { ...p, line: CRISIS_LINES[p.id].name, countryName: COUNTRY_DEFS[p.origin]?.name, delayLeft: Math.max(0, p.arriveQ - crisisQuarter()) } : null,
        origin: crisisLine ? crisisLine.origin || 'PL' : null,
        delayQ: crisisLine?.delayQ ?? null,
        countries: getJoinedCountries().map(id => ({ id, name: COUNTRY_DEFS[id].name, link: COUNTRY_DEFS[id].rho, cap: getCountryCrisisCap(id), premium: marketRegimes[id]?.premium ?? 0 }))
    };
}
