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
    if (typeof resetTicketsState === 'function') resetTicketsState();
    if (typeof resetForeignBots === 'function') resetForeignBots();
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
        case 'loyal': r.bearDamp = 0.6; break;                       // lojalni klienci: mniejszy spadek w recesji
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
