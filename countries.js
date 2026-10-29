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
    limitMult: 1.5,            // limit spółek kraju bez wskaźnika wielkości (kraj testowy) — patrz getCountryLimit
    limitMultRange: [1.2, 2.0], // 0.16.8 F3: mnożnik liczby startowej rośnie z wielkością rynku (logarytmicznie od najmniejszego do największego)
    sizeIndex: { US: 10, CN: 8, JP: 4, DE: 3.5, IN: 3, FR: 2.5, TW: 1.5, CH: 1.2, SE: 1, CZ: 0.6 }, // względna wielkość (PKB / kapitalizacja giełdy), jedno miejsce parametrów
    sectorShareCap: 0.4,       // 0.16.8 F3: debiut nie może zwiększyć udziału jednego sektora głównego powyżej 40% spółek giełdy
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
    if (typeof resetLinksState === 'function') resetLinksState();
    for (const id of Object.keys(marketRegimes || {})) if (id !== 'home') delete marketRegimes[id];
    if (typeof resetTicketsState === 'function') resetTicketsState(); // boty zostają w aiCompetitors (zapis tablicy); nowa gra: resetForeignBots() w startNewCareer
}

function getCountryDef(id) { return COUNTRY_DEFS[id] || null; }
/** 0.16.3 G15: próg wezwania kraju (66/75/90% głosów) i nadzór (odpowiednik KNF). Przekroczenie progu wymagałoby wezwania na resztę akcji. */
function getCallThreshold(id) { return COUNTRY_DEFS[id]?.oversight?.callThreshold ?? 0.66; }
function getOversight(id) { return COUNTRY_DEFS[id]?.oversight || { name: 'nadzór', callThreshold: 0.66, level: 1 }; }
function getJoinedCountries() { return Object.keys(countryState); }
function isCountryJoined(id) { return Boolean(countryState[id]); }
/** Limit spółek giełdy kraju: liczba startowa × mnożnik zależny od wielkości kraju (US najwyższy, CZ najniższy); kraj bez wskaźnika (testowy) dostaje stały 1,5. */
function getCountryLimitMult(id) {
    const size = COUNTRY_RULES.sizeIndex[id], [lo, hi] = COUNTRY_RULES.limitMultRange, sizes = Object.values(COUNTRY_RULES.sizeIndex), min = Math.min(...sizes), max = Math.max(...sizes);
    return size ? lo + (hi - lo) * Math.log(size / min) / Math.log(max / min) : COUNTRY_RULES.limitMult;
}
function getCountryLimit(id) { const def = COUNTRY_DEFS[id]; return def ? Math.ceil(def.companies.length * getCountryLimitMult(id)) : 0; }
/** Spółka obca znika z giełdy (np. ucieczka prezesa parabanku): posiadacze dostają gotówkę po podanej cenie (gracz w PLN, boty w walucie spółki). */
function delistForeignIssuer(issuer, price) {
    for (const [holder, qty] of Object.entries(issuer.holders || {})) {
        const gross = Number(qty) * price;
        if (!(gross > 0)) continue;
        if (holder === 'player') playerCash += toPln(gross, issuer.currency);
        else { const bot = aiCompetitors.find(b => b.id === holder); if (bot) addCurrencyCash(bot, issuer.currency, gross); }
    }
    delete foreignIssuers[issuer.id];
}
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
    if (typeof ensureForeignCompany === 'function') ensureForeignCompany(issuer); // 0.16.7: pełny model spółki (foreign_companies.js)
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
    countryState[id] = { id, joinedQ: macro.quarter, rate: def.rateMean, treasury: 0, lastDebutQ: macro.quarter, by, link: null };
    marketRegimes[id] = createCountryRegime(id);
    for (const c of def.companies) createCountryIssuer(def, c);
    if (typeof spawnForeignBotsFor === 'function') spawnForeignBotsFor(id);
    if (id === 'CN' && typeof spawnPandaParabank === 'function') spawnPandaParabank(); // 0.16.4 G19: PanDa Bank na mechanice parabanku z 0.11
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

/** Cechy prezesów krajowych (companies.js, pole `fx`); spółki zagraniczne dostają jedną z dwóch cech kraju, stałą dla symbolu. */
const COUNTRY_CEO_TRAITS = {
    DE: ['ordnung_muss_sein', 'ingenieur'], SE: ['lagom', 'fika'], CH: ['tajemnica_bankowa', 'neutralnosc'],
    FR: ['savoir_vivre', 'greve_generale'], CZ: ['svejk', 'piwny_dyplomata'], US: ['move_fast', 'shareholder_value'],
    JP: ['kaizen', 'keiretsu'], CN: ['plan_piecioletni', 'kopiuj_wklej'], IN: ['jugaad', 'outsourcing'], TW: ['krzemowa_tarcza', 'pracoholik']
};
function getIssuerCeoTrait(issuer) {
    const list = COUNTRY_CEO_TRAITS[issuer.country];
    if (!list || issuer.state) return null; // spółki państwowe prowadzi urzędnik
    let hash = 0;
    for (const ch of String(issuer.id)) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
    return list[hash % list.length];
}

/** Wpływ modyfikatora spółki specjalnej (jeden na spółkę): dryf roczny, mnożnik zmienności, tłumienie spadków. */
function getSpecialEffect(issuer) {
    const r = { drift: 0, volMult: 1, bearDamp: 1 };
    const quarterInYear = ((macro.quarter - 1) % 4) + 1;
    const fx = typeof ceoTraits === 'object' ? ceoTraits[getIssuerCeoTrait(issuer)]?.fx : null; // 0.16.3 G13b: prezes krajowy
    if (fx) { r.drift += fx.growth || 0; r.volMult *= fx.vol || 1; }
    switch (issuer.special) {
        case 'canopening': r.volMult *= 1.2; break;                  // śledź w puszce: skandal albo viral (applySpecialEvents)
        case 'vintage': r.drift += (marketRegimes[issuer.country]?.premium || 0) > 0 ? 0.04 : 0; break; // luksus rośnie w hossie
        case 'frogs': r.drift += quarterInYear >= 2 && quarterInYear <= 3 ? 0.05 : -0.02; break;      // sezon na żabie udka
        case 'cocoa': r.bearDamp = 0.7; r.volMult *= 0.8; break;     // stabilna czekolada
        case 'launder': r.drift += 0.08; r.volMult *= 1.2; break;    // wysoka marża prania (prowizja 10–20%), ryzyko wycieku
        case 'loyal': r.drift += 0.02; r.volMult *= 0.7; r.bearDamp = 0.8; break; // państwowy monopol: stabilna dywidenda
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
    if (issuer.tradeHalted) return; // zawieszone notowania (parabank w śledztwie): kurs stoi
    const beta = issuer.sectors.reduce((s, [name, share]) => s + share * getSectorBeta(name), 0);
    const rateSens = issuer.sectors.reduce((s, [name, share]) => s + share * getSectorRateSens(name), 0);
    const fx = getSpecialEffect(issuer);
    const sigma = COUNTRY_RULES.volScale * beta * issuer.vol * fx.volMult / Math.sqrt(52);
    const premiumDrift = COUNTRY_RULES.premiumDrift * regime.premium * (regime.premium < 0 ? fx.bearDamp : 1);
    const rateDrift = -COUNTRY_RULES.rateDrift * rateSens * (st.rate - def.rateMean);
    const drift = (COUNTRY_RULES.driftYear + premiumDrift + rateDrift + fx.drift - (issuer.divYield || 0)) / 52; // 0.16.7: dywidenda wypłacana osobno, więc dryf ceny o tyle niższy (zwrot całkowity bez zmian)
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
    } else if (issuer.special === 'canopening' && q === 2) { // Surströmming: otwarcie puszki — skandal albo viral
        const viral = Math.random() < 0.5;
        issuer.price = Math.max(0.05, issuer.price * (viral ? 1 + getRandomInRange(0.08, 0.15) : 1 - getRandomInRange(0.10, 0.18)));
        logEvent(`🌍 ${issuer.name}: otwarcie puszki kiszonego śledzia — ${viral ? 'viral w sieci, kurs rośnie' : 'skandal zapachowy, kurs spada'}.`, 'market');
    } else if (issuer.special === 'vintage' && q === 3) { // Maison Champagnerie: winobranie
        const roll = Math.random();
        issuer.vintage = roll < 0.25 ? 'wyśmienite' : roll < 0.8 ? 'przeciętne' : 'słabe';
        issuer.price = Math.max(0.05, issuer.price * (issuer.vintage === 'wyśmienite' ? 1 + getRandomInRange(0.06, 0.12) : issuer.vintage === 'słabe' ? 1 - getRandomInRange(0.05, 0.10) : 1));
        logEvent(`🌍 ${issuer.name}: winobranie ${issuer.vintage}.`, 'market');
    } else if (issuer.special === 'frogs' && q === 1 && Math.random() < 0.3) { // Grenouille: protesty ekologów
        issuer.price = Math.max(0.05, issuer.price * (1 - getRandomInRange(0.03, 0.06)));
        logEvent(`🌍 ${issuer.name}: protesty ekologów przeciw żabim udkom, kurs spada.`, 'market');
    } else if (issuer.special === 'cocoa' && q === 1) { // Matterhornen: cena kakao
        issuer.price = Math.max(0.05, issuer.price * (1 + getRandomInRange(-0.05, 0.04)));
    } else if (issuer.special === 'anime' && q === 2) { // Bakugan TV: sezon anime, eksport kultury — im więcej krajów na giełdzie, tym częstszy hit
        const hit = Math.random() < Math.min(0.8, 0.45 + 0.05 * getJoinedCountries().length);
        issuer.price = Math.max(0.05, issuer.price * (hit ? 1 + getRandomInRange(0.05, 0.12) : 1 - getRandomInRange(0.05, 0.10)));
        logEvent(`🌍 ${issuer.name}: sezon anime — ${hit ? 'hit, kurs rośnie' : 'klapa, kurs spada'}.`, 'market');
    } else if (issuer.special === 'bollywood') { // Bollywood Studios: co kwartał premiera
        const hit = Math.random() < 0.5;
        issuer.price = Math.max(0.05, issuer.price * (hit ? 1 + getRandomInRange(0.02, 0.07) : 1 - getRandomInRange(0.02, 0.06)));
    } else if (issuer.special === 'monsoon' && q === 3) { // Curry Masala: monsun decyduje o zbiorze przypraw
        issuer.price = Math.max(0.05, issuer.price * (Math.random() < 0.6 ? 1 + getRandomInRange(0.02, 0.07) : 1 - getRandomInRange(0.04, 0.09)));
    } else if (issuer.special === 'rareearths' && q === 1 && Math.random() < 0.2) { // Smok Rare Earths: ograniczenia eksportu podbijają ceny metali
        issuer.price = Math.max(0.05, issuer.price * (1 + getRandomInRange(0.08, 0.15)));
        logEvent(`🌍 ${issuer.name}: ograniczenia eksportu metali ziem rzadkich, kurs rośnie.`, 'market');
    } else if (issuer.special === 'sanctions') { // Huiei Telecom: ryzyko sankcji (przerwa 6 kwartałów)
        if (macro.quarter - (issuer.leakQ ?? -99) > 6 && Math.random() < 0.05) {
            issuer.leakQ = macro.quarter;
            issuer.price = Math.max(0.05, issuer.price * (1 - getRandomInRange(0.15, 0.25)));
            const text = `🌍 Sankcje na ${issuer.name}: zakaz sprzedaży sprzętu na rynkach zachodnich, kurs spada o 15–25%.`;
            logEvent(text, 'market');
            if (typeof pushNews === 'function') pushNews(text, null);
        }
    } else if (issuer.special === 'tension') { // KWS: napięcie Chiny–Tajwan — kurs −30%, półprzewodniki w dół na świecie (linia lokalna, nie piąta linia kryzysu)
        if (macro.quarter - (issuer.leakQ ?? -99) > 8 && Math.random() < 0.03) {
            issuer.leakQ = macro.quarter;
            issuer.price = Math.max(0.05, issuer.price * 0.7);
            const text = '🌍 Napięcie Chiny–Tajwan: blokada cieśniny uderza w dostawy chipów. Kurs KWS spada o 30%, półprzewodniki tanieją na całym świecie.';
            logEvent(text, 'market');
            if (typeof pushNews === 'function') pushNews(text, null);
            if (typeof addSectorShock === 'function') for (const country of [null, ...getJoinedCountries()]) addSectorShock('Technologia', -0.08, { subsector: 'Półprzewodniki', holdQ: 2, fadeQ: 3, country });
        }
    } else if (issuer.special === 'launder') { // Waschmabank: prowizja od brudnej gotówki i ryzyko wycieku „Swiss Leaks”
        issuer.price = Math.max(0.05, issuer.price * (1 + getRandomInRange(0.005, 0.015)));
        if (macro.quarter - (issuer.leakQ ?? -99) > 8 && Math.random() < 0.04) {
            issuer.leakQ = macro.quarter;
            issuer.price = Math.max(0.05, issuer.price * (1 - getRandomInRange(0.30, 0.60)));
            if (issuer.id === 'WSM') exposeHiddenCash('Swiss Leaks');
            const text = `🌍 Swiss Leaks: kontrola ujawnia pranie pieniędzy w ${issuer.name}. Kurs spada o 30–60%, bank płaci karę.`;
            logEvent(text, 'market');
            if (typeof pushNews === 'function') pushNews(text, null);
            if (getGdrHeld(issuer) > 0 && typeof addMail === 'function') addMail({ sender: 'PULS', subject: `🌍 ${issuer.name}: Swiss Leaks`, body: `${text}\n\nMasz ${formatNumberPl(getGdrHeld(issuer), 0)} akcji tego banku.`, importance: 3 });
        }
    }
}

/** Debiut krajowy: startup kraju wchodzi na jego giełdę (szansa zależy od koniunktury, do limitu). */
function maybeCountryDebut(id) {
    const def = COUNTRY_DEFS[id], st = countryState[id], regime = marketRegimes[id];
    if (getCountryIssuers(id).length >= getCountryLimit(id)) return null;
    if (macro.quarter - st.lastDebutQ < 4 || Math.random() >= COUNTRY_RULES.debutChance * Math.max(0.2, 1 + regime.premium * 3)) return null;
    const listed = getCountryIssuers(id), mainOf = c => (Array.isArray(c.sector) ? c.sector[0] : c.sector);
    const roomy = def.companies.filter(c => c.kind === 'normal' && listed.filter(i => i.sector === mainOf(c)).length + 1 <= Math.max(2, Math.ceil((listed.length + 1) * COUNTRY_RULES.sectorShareCap))); // limit koncentracji sektora liczony na giełdę kraju
    const base = getRandomElement(roomy);
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
    if (typeof processLinksQuarterly === 'function') processLinksQuarterly();
    processForeignOversightQuarterly();
    processHiddenCashQuarterly();
    for (const id of getJoinedCountries()) {
        const def = COUNTRY_DEFS[id], st = countryState[id];
        advanceCountryRegime(id);
        stepCountryRate(id);
        for (const issuer of getCountryIssuers(id)) {
            applySpecialEvents(issuer);
            if (issuer.state && !issuer.fundamentals) st.treasury += issuer.statePack * issuer.price * 0.005; // dywidenda państwowa ≈ 2%/rok do licznika „skarbu kraju” (tylko wgląd); od 0.16.7 realna dywidenda w foreign_companies.js
        }
        if (typeof processForeignCompaniesQuarterly === 'function') processForeignCompaniesQuarterly(id); // 0.16.7 F2: raporty, dywidendy, splity, prezesi, upadłości
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
    if (typeof checkForeignCompanyInvariants === 'function') problems.push(...checkForeignCompanyInvariants());
    if (typeof checkForeignBotInvariants === 'function') problems.push(...checkForeignBotInvariants());
    if (typeof checkLinkInvariants === 'function') problems.push(...checkLinkInvariants());
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
        if (i.leakQ !== undefined) row.lk = i.leakQ;
        if (i.vintage) row.v = i.vintage;
        if (i.tradeHalted) row.th = 1;
        if (i.oversightResale) row.or = i.oversightResale.until;
        const company = typeof getForeignCompanySnapshot === 'function' ? getForeignCompanySnapshot(i) : undefined;
        if (company) row.c = company; // 0.16.7: bilans, wyniki, dywidenda, prezes
        if (i.generated) row.g = { name: i.name, sector: i.sectors.map(s => s[0]), subsector: i.subsector, country: i.country, currency: i.currency };
        issuers[i.id] = row;
    }
    return {
        state: countryState, issuers, regimes: Object.fromEntries(getJoinedCountries().map(id => [id, marketRegimes[id]])),
        feed: homeFeed, links: typeof getLinksSnapshot === 'function' ? getLinksSnapshot() : undefined, tickets: typeof getTicketsSnapshot === 'function' ? getTicketsSnapshot() : undefined, bots: typeof getForeignBotsSnapshot === 'function' ? getForeignBotsSnapshot() : undefined
    };
}

function applyCountriesSnapshot(snapshot) {
    resetCountriesState();
    if (!snapshot || typeof snapshot !== 'object') return; // zapis bez krajów
    for (const [id, st] of Object.entries(snapshot.state || {})) {
        const def = COUNTRY_DEFS[id];
        if (!def) continue; // kraj usunięty z kodu: pomijamy
        countryState[id] = { id, joinedQ: Number(st.joinedQ) || 0, rate: Number(st.rate) || def.rateMean, treasury: Number(st.treasury) || 0, lastDebutQ: Number(st.lastDebutQ) || 0, by: st.by || 'test', link: ['merged', 'intl', 'taken'].includes(st.link) ? st.link : null };
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
        if (Number.isFinite(Number(row.lk))) issuer.leakQ = Number(row.lk);
        if (row.v) issuer.vintage = String(row.v);
        if (row.th) issuer.tradeHalted = true;
        if (Number.isFinite(Number(row.or))) issuer.oversightResale = { until: Number(row.or) };
        if (typeof applyForeignCompanySnapshot === 'function') applyForeignCompanySnapshot(issuer, row.c); // zapis v17 (bez `c`): model z ceny
        issuer.holders = {};
        for (const [holder, qty] of Object.entries(row.o || {})) if (Number(qty) > 0) issuer.holders[holder] = Number(qty);
    }
    if (snapshot.feed && typeof snapshot.feed === 'object') homeFeed = { last: Number(snapshot.feed.last) || null, sd: Number(snapshot.feed.sd) || 0.02 };
    if (typeof applyTicketsSnapshot === 'function') applyTicketsSnapshot(snapshot.tickets);
    if (typeof applyLinksSnapshot === 'function') applyLinksSnapshot(snapshot.links);
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
    botChance: 0.25,         // na kwartał i kraj: bot kupuje bilet (po ukończeniu lotniska)
    autoOrderChance: 0.30,   // na kwartał: miasto samo zleca lotnisko (od kwartału autoOrderFromQ)
    autoOrderFromQ: 4,
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
function getCountryCommission(country) {
    const off = typeof getOffHoursSurcharge === 'function' && !countryState[country]?.link ? getOffHoursSurcharge(country) : 0; // 0.16.8 F3b: dopłata poza sesją
    return getCountryBaseCommission(country) + off;
}
function getCountryBaseCommission(country) {
    if (countryState[country]?.link && typeof LINK_RULES === 'object') return LINK_RULES.domesticCommission; // połączone giełdy: prowizja jak krajowa
    return COUNTRY_DEFS[country]?.operator?.commission ?? COUNTRY_RULES.commission;
}
/** Dostęp do zakupu spółek kraju: kraj dołączył i inwestor ma bilet. */
function canTradeCountry(holder, country) { return isCountryJoined(country) && (hasTicket(holder, country) || Boolean(countryState[country]?.link)); } // 0.16.3: kraj połączony z naszą giełdą — bez biletu

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
    const buyers = aiCompetitors.filter(ai => !ai.isMafia && !ai.isGuard && !ai.isForeignBot && ai.personality !== 'market_maker' && ai.cash >= price * 3);
    if (buyers.length) buyTicket(country, getRandomElement(buyers));
}

// --- 0.16.6 S1: wspólny widok posiadaczy akcji zagranicznych (odpowiednik getShareholders dla spółek krajowych) i drabina nadzoru ---

/** Posiadacze spółki zagranicznej: { id, name, kind: 'player' | 'ai', shares, pct }, od największego. */
function getIssuerHolders(issuer) {
    return Object.entries(issuer.holders || {}).filter(([, q]) => Number(q) >= 1).map(([id, q]) => ({
        id, kind: id === 'player' ? 'player' : 'ai', shares: Number(q), pct: Number(q) / issuer.shares,
        name: id === 'player' ? (playerProfile?.fundName || 'Twój fundusz') : (aiCompetitors.find(b => b.id === id)?.name || id)
    })).sort((a, b) => b.shares - a.shares);
}
function getIssuerStake(issuer, holderId) { return (Number(issuer.holders?.[holderId]) || 0) / issuer.shares; }

const FOREIGN_OVERSIGHT = { fine: 0.02, trustLoss: 3, resaleQuarters: 2, resaleLevel: 3 }; // jak KNF_TENDER_FINE / KNF_RESALE_QUARTERS (ma.js)

/** Krok drabiny po kupnie ponad próg wezwania: 1 — ostrzeżenie, 2 — kara (2% wartości nadwyżki), ≥ 3 — nakaz odsprzedaży do progu w 2 kw. Licznik wspólny z KNF (getTenderRecord). */
function applyForeignOversightStep(issuer, overValuePln) {
    const rec = getTenderRecord(), strike = (rec.tenderStrikes = (Number(rec.tenderStrikes) || 0) + 1);
    const o = getOversight(issuer.country), thr = Math.round(o.callThreshold * 100), sym = getGdrSymbol(issuer);
    let step, body;
    if (strike === 1) {
        step = 'warning';
        body = `Fundusz przekroczył próg wezwania ${thr}% w ${issuer.name} (${sym}) bez ogłoszenia wezwania. Następne takie przekroczenie skończy się karą, a kolejne nakazem odsprzedaży do progu.`;
    } else if (strike === 2) {
        step = 'fine';
        const fine = Math.min(Math.max(0, playerCash), Math.round(overValuePln * FOREIGN_OVERSIGHT.fine));
        playerCash -= fine; governmentTreasury += fine;
        if (fine > 0) recordPayment('player-fund', 'external:skarb-panstwa', fine, `Kara ${o.name}: przekroczenie progu wezwania ${sym}`);
        playerFund.trust = Math.max(0, playerFund.trust - FOREIGN_OVERSIGHT.trustLoss);
        body = `Kolejne przekroczenie progu ${thr}% w ${issuer.name}: kara ${formatZl(fine, 0)} (2% wartości nadwyżki). Klienci funduszu tracą zaufanie (−${FOREIGN_OVERSIGHT.trustLoss}).`;
    } else {
        step = 'resale';
        issuer.oversightResale = { until: macro.quarter + FOREIGN_OVERSIGHT.resaleQuarters };
        body = `Fundusz ma zejść poniżej progu ${thr}% w ${issuer.name} w ciągu ${FOREIGN_OVERSIGHT.resaleQuarters} kw. — inaczej ${o.name} sprzeda nadwyżkę na rynku.`;
    }
    if (typeof addMail === 'function') addMail({ sender: o.name, subject: `⚠️ ${o.name}: próg wezwania ${issuer.name}`, body, importance: 3 });
    logEvent(`⚖️ ${o.name}: ${body}`, 'review');
    return step;
}

/** Co kwartał: nakaz odsprzedaży wygasł — nadwyżka ponad próg sprzedana przez nadzór (przez zwykłą sprzedaż, z prowizją). */
function processForeignOversightQuarterly() {
    for (const issuer of getForeignIssuerList()) {
        const order = issuer.oversightResale;
        if (!order) continue;
        const excess = getGdrHeld(issuer) - Math.floor(getCallThreshold(issuer.country) * issuer.shares);
        if (excess <= 0) { delete issuer.oversightResale; continue; }
        if (macro.quarter < order.until) continue;
        const r = sellForeignShares(issuer.id, excess);
        delete issuer.oversightResale;
        const text = `⚖️ ${getOversight(issuer.country).name} sprzedaje nadwyżkę ${formatNumberPl(excess, 0)} akcji ${issuer.name} ponad próg wezwania${r.ok ? '' : ' (sprzedaż nieudana)'}.`;
        logEvent(text, 'review');
        if (typeof addMail === 'function') addMail({ sender: getOversight(issuer.country).name, subject: `⚖️ Nakaz odsprzedaży: ${issuer.name}`, body: text, importance: 3 });
    }
}

// --- 0.16.6 S1: gotówka w Waschmabanku poza kontrolą nadzoru ---
// Decyzja: ukryta gotówka JEST w majątku (NAV, jednostki, ocena klientów i raporty widzą ją w całości — nie ma „cichej” zmiany NAV);
// wpłata kosztuje 5% (widoczna w historii płatności), wypłata 1%. Poza zasięgiem jest tylko egzekucja: kary, rekwizycja nielegalnych zysków i
// podstawa kary KNF liczą wyłącznie gotówkę na koncie funduszu. Cena: co kwartał ryzyko wykrycia (rośnie z uwagą KNF), a „Swiss Leaks” w Waschmabanku
// ujawnia rachunek: konfiskata całości, przewinienie nr +1 i utrata zaufania klientów.
const HIDDEN_CASH_RULES = { depositFee: 0.05, withdrawFee: 0.01, min: 1000, detectChance: 0.03, exposeTrustLoss: 10 };

function getHiddenBalance() { return Math.max(0, Number(oversight?.hidden?.balance) || 0); }
function canUseWaschmabank() { return Boolean(playerFund && foreignIssuers.WSM && foreignIssuers.WSM.kind === 'share'); }

/** Wpłata z gotówki funduszu na rachunek w Waschmabanku. Zwraca { ok, hidden, fee } albo { ok: false, reason }. */
function hideCash(amount) {
    amount = Number(amount);
    if (!canUseWaschmabank()) return { ok: false, reason: 'Waschmabank działa dopiero po otwarciu giełdy szwajcarskiej.' };
    if (!(amount >= HIDDEN_CASH_RULES.min)) return { ok: false, reason: `Minimalna wpłata: ${formatZl(HIDDEN_CASH_RULES.min, 0)}.` };
    if (amount > playerCash + 1e-9) return { ok: false, reason: 'Za mało gotówki funduszu.' };
    ensureOversight();
    const fee = amount * HIDDEN_CASH_RULES.depositFee;
    playerCash -= amount;
    oversight.hidden.balance = getHiddenBalance() + amount - fee;
    recordPayment('player-fund', 'external:waschmabank', fee, 'Waschmabank: prowizja od wpłaty');
    logEvent(`🏦 Wpłata ${formatZl(amount, 0)} na rachunek w Waschmabanku (prowizja ${formatZl(fee, 0)}). Środki liczą się do majątku funduszu, ale nadzór ich nie widzi.`, 'state');
    return { ok: true, hidden: oversight.hidden.balance, fee };
}

/** Wypłata na konto funduszu (prowizja 1%). */
function unhideCash(amount) {
    amount = Math.min(Number(amount), getHiddenBalance());
    if (!(amount > 0)) return { ok: false, reason: 'Brak środków na rachunku w Waschmabanku.' };
    const fee = amount * HIDDEN_CASH_RULES.withdrawFee;
    oversight.hidden.balance = getHiddenBalance() - amount;
    playerCash += amount - fee;
    recordPayment('player-fund', 'external:waschmabank', fee, 'Waschmabank: prowizja od wypłaty');
    return { ok: true, received: amount - fee, fee };
}

/** Wypłata awaryjna pod umorzenia / margin call (w forceLiquidation, po obcej gotówce i GDR). Zwraca wpływ netto. */
function liquidateHiddenCash(amountPln) {
    const gross = Math.min(getHiddenBalance(), amountPln / (1 - HIDDEN_CASH_RULES.withdrawFee));
    return gross > 0 ? (unhideCash(gross).received || 0) : 0;
}

/** Wykrycie rachunku: konfiskata całości, przewinienie, utrata zaufania. */
function exposeHiddenCash(reason) {
    const balance = getHiddenBalance();
    if (!(balance > 0)) return false;
    oversight.hidden.balance = 0;
    governmentTreasury += balance;
    recordPayment('player-fund', 'external:skarb-panstwa', balance, 'Konfiskata rachunku w Waschmabanku');
    playerFund.trust = Math.max(0, playerFund.trust - HIDDEN_CASH_RULES.exposeTrustLoss);
    const text = `Ujawniono ukryty rachunek funduszu w Waschmabanku (${reason}): konfiskata ${formatZl(balance, 0)}, utrata zaufania klientów.`;
    logEvent(`🕵️ ${text}`, 'error');
    if (typeof pushNews === 'function') pushNews(`🕵️ Afera: ${text}`, null);
    if (typeof addMail === 'function') addMail({ sender: 'PULS', subject: '🕵️ Afera: ukryty rachunek funduszu', body: text, importance: 3 });
    if (typeof punishEntity === 'function') punishEntity('player', 'KNF');
    return true;
}

function processHiddenCashQuarterly() {
    if (getHiddenBalance() <= 0) return;
    if (Math.random() < HIDDEN_CASH_RULES.detectChance * getKnfAttention()) exposeHiddenCash('kontrola przepływów');
}

function checkHiddenCashInvariants() {
    const b = oversight?.hidden?.balance;
    return b === undefined || (Number.isFinite(b) && b >= 0) ? [] : [`rachunek w Waschmabanku: ${b}`];
}

// --- Handel akcjami zagranicznymi (gracz) ---

/** opts.overThreshold: gracz świadomie przekracza próg wezwania (drabina nadzoru: ostrzeżenie → kara → nakaz odsprzedaży). */
function buyForeignShares(issuerId, quantity, opts = {}) {
    const issuer = foreignIssuers[issuerId];
    quantity = Math.floor(Number(quantity));
    if (!issuer || issuer.kind !== 'share') return { ok: false, reason: 'Ta spółka nie jest notowana na rynku zagranicznym.' };
    if (!(quantity > 0)) return { ok: false, reason: 'Podaj liczbę akcji.' };
    if (typeof playerFund !== 'object' || !playerFund) return { ok: false, reason: 'Akcje kupuje fundusz.' };
    const def = COUNTRY_DEFS[issuer.country];
    if (!canTradeCountry('player', issuer.country)) return { ok: false, reason: `Brak biletu na rynek: ${def?.name || issuer.country}. Bilet kupisz na lotnisku.` };
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return { ok: false, reason: 'Handel wstrzymany — zadziałał bezpiecznik giełdowy.' };
    if (issuer.tradeHalted) return { ok: false, reason: 'Notowania spółki są zawieszone.' };
    if (quantity > getGdrFree(issuer)) return { ok: false, reason: 'Nie ma tylu akcji w wolnym obrocie.' };
    const room = Math.floor(getCallThreshold(issuer.country) * issuer.shares) - getGdrHeld(issuer); // drabina nadzoru (G15): bez wezwania nie przekroczysz progu
    const over = quantity > room;
    if (over && !opts.overThreshold) {
        const o = getOversight(issuer.country);
        return { ok: false, needsConfirm: true, room: Math.max(0, room), reason: `Próg wezwania w kraju ${def.name} to ${Math.round(o.callThreshold * 100)}% (nadzór: ${o.name}). Możesz dokupić najwyżej ${Math.max(0, room).toLocaleString('pl-PL')} akcji.` };
    }
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
    if (over) applyForeignOversightStep(issuer, toPln((quantity - Math.max(0, room)) * issuer.price, cur));
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
    if (issuer.tradeHalted) return { ok: false, reason: 'Notowania spółki są zawieszone.' };
    const held = getGdrHeld(issuer);
    if (quantity > held) return { ok: false, reason: 'Za mało akcji.' };
    const def = COUNTRY_DEFS[issuer.country], gross = quantity * issuer.price, fee = gross * getCountryCommission(issuer.country);
    issuer.holders.player = held - quantity;
    if (typeof onParabankSharesSold === 'function') onParabankSharesSold({ symbol: issuer.id, name: issuer.name, totalShares: issuer.shares }, quantity); // panika w parabanku (0.11 B1)
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
    { id: 'fb_vogel', name: 'Heinrich „Wieloryb” Vogel', country: 'DE', style: 'stable', cash: { EUR: 15000 }, avoidHome: true },
    // 0.16.3 G14a: Szwajcaria — tylko banki, „neutralność” (nie sprzedaje w panice, w bessie dokupuje), rezerwa w CHF, lubi Waschmabank
    { id: 'fb_gutz', name: 'Gregor „Bankier” Gutzwiller', country: 'CH', style: 'banker', cash: { CHF: 15000 }, reserve: 0.3, favorite: 'WSM' },
    // Szwecja — agresywny, kupuje cokolwiek (także w innych krajach, do których ma dostęp)
    { id: 'fb_wiking', name: 'Olaf „Wiking” Bergstrom', country: 'SE', style: 'viking', cash: { SEK: 40000, EUR: 2000 }, spend: 0.45 },
    // 0.16.4 G20: Azja — Tygrys (agresywny, technologia) i Konfucjusz (rynek japoński, akcjami handluje tylko z Tygrysem)
    { id: 'fb_tygrys', name: 'Li „Tygrys” Wei', country: 'CN', style: 'tiger', cash: { CNY: 70000, USD: 3000 }, spend: 0.5 },
    { id: 'fb_konfucjusz', name: 'Hiroshi „Konfucjusz” Tanaka', country: 'JP', style: 'confucius', cash: { JPY: 1000000 }, spend: 0.3 },
    // Dynamiczne (bez kraju startowego): wspólnota europejska i pierwsze przejęcie giełdy przez naszą
    { id: 'fb_euro', name: 'Jean-Pierre „Ruletka” Bonvivant', country: null, style: 'gambler', cash: { EUR: 20000 }, spend: 0.5, dynamic: true },
    { id: 'fb_bayer', name: 'Kacper „Intercontinental” Bayer', country: null, style: 'abroad', cash: { EUR: 8000, USD: 6000, CHF: 4000 }, dynamic: true }
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
    for (const def of FOREIGN_BOTS.filter(b => b.country === country)) spawnForeignBot(def, country);
}

/** Bot dynamiczny (bez kraju startowego) o danym id; homeCountry = kraj, w którym „mieszka” (musi być dołączony). */
function spawnDynamicBot(id, homeCountry) {
    const def = FOREIGN_BOTS.find(b => b.id === id);
    return def && homeCountry && isCountryJoined(homeCountry) ? spawnForeignBot(def, homeCountry) : null;
}
/** Wspólnota europejska (G12): bot-hazardzista w pierwszym dołączonym kraju Europy. */
function spawnEuropeanBot() {
    const home = (typeof LINK_RULES === 'object' ? LINK_RULES.europe : ['DE', 'CZ', 'SE', 'CH', 'FR']).find(isCountryJoined);
    return spawnDynamicBot('fb_euro', home);
}
/** Pierwsze przejęcie giełdy przez naszą: Bayer gra tylko spółkami zagranicznymi, w kraju przejętej giełdy. */
function spawnBayerBot(country) { return spawnDynamicBot('fb_bayer', country); }

function spawnForeignBot(def, country) {
    if (aiCompetitors.some(ai => ai.id === def.id)) return null;
    const bot = {
        id: def.id, name: def.name, cash: 0, portfolio: {}, loans: [], personality: `foreign_${def.style}`, isForeignBot: true, homeCountry: country,
        accessLevel: 1, hasTBillAccess: false, tBills: [], skillPoints: 0, unlockedSkills: {}, creditScore: 100,
        cashByCurrency: { ...def.cash }, fx: { joinQ: macro.quarter, trades: 0, tradesQ: -1, cost: {}, enteredHome: false, entryQ: def.enterHome ? macro.quarter + getRandomIntInRange(...BOT_RULES.homeEntryDelay) : null }
    };
    bot.fx.reservePln = getForeignCashPln(bot) * (def.reserve || 0);
    aiCompetitors.push(bot);
    (foreignTickets[bot.id] = foreignTickets[bot.id] || []).push(country); // własny rynek bez biletu
    logEvent(`🌍 Na giełdzie ${COUNTRY_DEFS[country].name} pojawia się inwestor ${bot.name}.`, 'market');
    return bot;
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

function getBotStake(issuer, bot) { return getIssuerStake(issuer, bot.id); }
function botStakeCap(issuer, bot) {
    const joined = countryState[issuer.country]?.joinedQ ?? -99;
    const base = macro.quarter - joined < BOT_RULES.firstYearQuarters ? BOT_RULES.maxStakeFirstYear : BOT_RULES.maxStake;
    return Math.min(base, getCallThreshold(issuer.country) - 0.01); // bot nie przekracza progu wezwania (G15)
}

/** Boty bez ograniczeń kraju dostają dostęp do rynków, które grają (bot nie kupuje biletów). */
function botAccess(bot, country) {
    const list = foreignTickets[bot.id] || (foreignTickets[bot.id] = []);
    if (!list.includes(country)) list.push(country);
    return true;
}

function botPickTarget(bot, def) {
    const pool = id => getCountryIssuers(id).filter(i => !i.tradeHalted && !(i.state && getGdrFree(i) <= 0));
    let candidates = pool(bot.homeCountry);
    if (def.style === 'banker') { // Gutzwiller: tylko banki; Waschmabank z preferencją
        const fav = foreignIssuers[def.favorite];
        if (fav && fav.kind === 'share' && Math.random() < 0.4) return fav;
        candidates = getJoinedCountries().filter(c => canTradeCountry(bot.id, c)).flatMap(pool).filter(i => i.sectors.some(([n]) => n === 'Bankowość'));
    } else if (def.style === 'viking') { // Wiking: kupuje cokolwiek, w każdym kraju, do którego ma dostęp
        for (const c of getJoinedCountries()) if (c !== bot.homeCountry && (countryState[c]?.link || Math.random() < 0.5) && botAccess(bot, c)) candidates = candidates.concat(pool(c));
    } else if (def.style === 'tiger') { // Tygrys: technologia w każdym dostępnym kraju, co czwarty wybór — dowolna spółka japońska (dostawa dla Konfucjusza)
        const all = getJoinedCountries().flatMap(c => botAccess(bot, c) || c === bot.homeCountry ? pool(c) : []);
        const tech = all.filter(i => i.sectors.some(([n]) => n === 'Technologia'));
        const jp = all.filter(i => i.country === 'JP');
        candidates = jp.length && Math.random() < 0.25 ? jp : (tech.length ? tech : candidates);
    } else if (def.style === 'gambler') { // bot europejski: hazard na spółkach krajów europejskich
        candidates = LINK_RULES.europe.filter(isCountryJoined).flatMap(c => botAccess(bot, c) ? pool(c) : []);
    } else if (def.style === 'abroad') { // Bayer: tylko spółki zagraniczne, każdy kraj otwarty
        candidates = getJoinedCountries().flatMap(c => botAccess(bot, c) ? pool(c) : []);
    }
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
    const budgetPln = botSpendable(bot) * (def.spend || BOT_RULES.spendShare), mid = toPln(issuer.price, issuer.currency);
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

/** Konfucjusz (G20): kupuje i sprzedaje akcje japońskie wyłącznie Tygrysowi — transakcja bot–bot po kursie, bez prowizji, z limitem udziału. */
function confuciusTrade(bot) {
    const tiger = aiCompetitors.find(b => b.id === 'fb_tygrys');
    if (!tiger) return false;
    const jpIssuers = getCountryIssuers('JP').filter(i => !i.state);
    const move = (issuer, from, to, qty) => { // przelew akcji i gotówki między botami; false = brak środków
        const gross = qty * issuer.price;
        if (!botPay(to, issuer.currency, gross)) return false;
        addCurrencyCash(from, issuer.currency, gross);
        const held = Number(issuer.holders[to.id]) || 0, prev = (to.fx.cost[issuer.id] || issuer.price) * held;
        issuer.holders[from.id] -= qty; if (issuer.holders[from.id] <= 0) { delete issuer.holders[from.id]; delete from.fx.cost[issuer.id]; }
        issuer.holders[to.id] = held + qty; to.fx.cost[issuer.id] = (prev + qty * issuer.price) / (held + qty);
        return true;
    };
    if (Math.random() < 0.5) { // kupno od Tygrysa
        const sellers = jpIssuers.filter(i => (Number(i.holders[tiger.id]) || 0) > 0);
        if (!sellers.length) return false;
        const issuer = getRandomElement(sellers), mid = toPln(issuer.price, issuer.currency);
        const cap = Math.floor(issuer.shares * botStakeCap(issuer, bot)) - (Number(issuer.holders[bot.id]) || 0);
        const qty = Math.min(Math.floor(botSpendable(bot) * 0.3 / mid), cap, Math.floor(issuer.holders[tiger.id] / 2) || 1);
        return qty >= 1 && qty <= issuer.holders[tiger.id] && move(issuer, tiger, bot, qty);
    }
    const mine = jpIssuers.filter(i => (Number(i.holders[bot.id]) || 0) > 0 && i.price >= (bot.fx.cost[i.id] || i.price) * BOT_RULES.takeProfit);
    if (!mine.length) return false;
    const issuer = getRandomElement(mine), qty = Math.max(1, Math.floor(issuer.holders[bot.id] / 2));
    if ((Number(issuer.holders[tiger.id]) || 0) + qty > issuer.shares * botStakeCap(issuer, tiger)) return false;
    return move(issuer, bot, tiger, qty);
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

/** Bayer (0.16.6 S1): raz na kilka kwartałów zamienia do 15% najcenniejszej waluty na najtańszą względem jej średniej; zamiana lekko przesuwa kursy (≤ ±1%). */
function bayerFxTrade(bot) {
    if (Math.random() >= 0.5) return false;
    const bag = bot.cashByCurrency || {};
    const codes = Object.keys(bag).filter(c => FOREIGN_CURRENCIES.includes(c) && bag[c] > 0).sort((a, b) => toPln(bag[b], b) - toPln(bag[a], a));
    const sell = codes[0], buy = FOREIGN_CURRENCIES.filter(c => c !== sell && fxMeans[c]).sort((a, b) => fxRates[a] / fxMeans[a] - fxRates[b] / fxMeans[b])[0];
    if (!sell || !buy) return false;
    const amountPln = toPln(bag[sell], sell) * 0.15;
    const sold = fromPln(amountPln, sell);
    bag[sell] -= sold;
    bag[buy] = (Number(bag[buy]) || 0) + fromPln(amountPln * (1 - BOT_RULES.conversionSpread), buy);
    applyFxFlow(buy, sell, amountPln);
    bot.fx.fxFlowQ = macro.quarter;
    return true;
}

function runForeignBot(bot) {
    const def = FOREIGN_BOTS.find(b => b.id === bot.id);
    if (!def || !isCountryJoined(bot.homeCountry)) return;
    if (def.style === 'abroad') bayerFxTrade(bot); // przed zakupami akcji; stan konta w walutach liczą testy niezmienników
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
        const premium = marketRegimes[bot.homeCountry]?.premium || 0;
        const buyBelow = def.style === 'gambler' ? 0.55 : def.style === 'banker' && premium < 0 ? 0.95 : 0.8; // hazardzista sprzedaje częściej, Gutzwiller w bessie dokupuje
        if (def.style === 'confucius') done = confuciusTrade(bot);
        else if (def.enterHome && bot.fx.enteredHome && roll < 0.35) done = botTradeHome(bot, def);
        else if (roll < buyBelow) done = foreignBotBuy(bot, def);
        else if (def.style === 'banker' && premium < 0) done = false; // neutralność: nie sprzedaje w panice
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
