// macro.js — Makroekonomia (wersja 0.10.2, część M1)
//
// Wskaźniki: inflacja, bezrobocie, PKB (r/r) i stopa referencyjna — liczone co kwartał z cyklu koniunktury,
// z bezwładnością. Posiedzenie Banku Centralnego co kwartał (reguła Taylora + charakter prezesa); decyzję
// ogłasza „Gazeta Ekonomiczna” (Obserwator Finansowy) razem z oczekiwaniami analityków na kolejne
// posiedzenie — rynek reaguje na niespodziankę. Każdy sektor ma własny cykl (boom → szczyt → spadek →
// dołek). Wybory co 4 lata zmieniają politykę wobec spółek państwowych. Zdarzenia makro i państwowe
// mają realne skutki i przerwy między powtórzeniami.

const INFLATION_TARGET = 0.025;
const NEUTRAL_REAL_RATE = 0.01;
const NATURAL_UNEMPLOYMENT = 0.06;
const MACRO_HISTORY_LIMIT = 16;
const BC_MAX_STEP = 0.005;
const BC_RATE_LIMITS = [0.005, 0.15];
const RATE_SURPRISE_IMPACT = 2;          // reakcja kursu na niespodziankę (× wrażliwość sektora na stopy)
const ELECTION_INTERVAL_QUARTERS = 16;   // 4 lata gry
const EVENT_COOLDOWN = 6;                // ostatnie zdarzenia nie wracają od razu

const SECTOR_CYCLE_PHASES = {
    boom:    { name: 'Boom',   icon: '🚀', adj: 0.004,  val: 1.08, next: 'peak',    length: [2, 4] },
    peak:    { name: 'Szczyt', icon: '⛰️', adj: 0.001,  val: 1.03, next: 'decline', length: [1, 2] },
    decline: { name: 'Spadek', icon: '📉', adj: -0.004, val: 0.93, next: 'trough',  length: [2, 4] },
    trough:  { name: 'Dołek',  icon: '🕳️', adj: -0.001, val: 0.97, next: 'boom',    length: [1, 3] }
};

const RULING_PARTIES = {
    market: { name: 'Koalicja Rynkowa', privatization: 1.6, nationalization: 0.5, subsidies: 0.7, stateMood: -0.02 },
    state:  { name: 'Blok Państwowy',   privatization: 0.4, nationalization: 1.6, subsidies: 1.5, stateMood: 0.03 }
};

let macro = createMacroState();

function createMacroState() {
    return {
        inflation: 0.03,
        unemployment: NATURAL_UNEMPLOYMENT,
        gdpAnnual: 0.03,
        quarter: 0,
        history: [],
        expectation: { change: 0, label: 'bez zmian' },
        lastDecision: null,
        sectorCycles: createSectorCycles(),
        election: { quartersLeft: getRandomIntInRange(6, 12), ruling: Math.random() < 0.5 ? 'market' : 'state', campaign: false },
        recentEvents: [],
        shocks: { inflation: 0 }
    };
}

function createSectorCycles() {
    const cycles = {};
    const phases = Object.keys(SECTOR_CYCLE_PHASES);
    for (const sector of Object.keys(SECTOR_PROFILES)) {
        const phase = getRandomElement(phases);
        cycles[sector] = { phase, quartersLeft: getRandomIntInRange(...SECTOR_CYCLE_PHASES[phase].length) };
    }
    return cycles;
}

function ensureMacroState() {
    const fresh = createMacroState();
    macro = { ...fresh, ...(macro || {}) };
    macro.sectorCycles = { ...fresh.sectorCycles, ...(macro.sectorCycles || {}) };
    macro.election = { ...fresh.election, ...(macro.election || {}) };
    macro.shocks = { ...fresh.shocks, ...(macro.shocks || {}) };
    if (!Array.isArray(macro.history)) macro.history = [];
    if (!Array.isArray(macro.recentEvents)) macro.recentEvents = [];
    return macro;
}

function getRulingParty() {
    return RULING_PARTIES[macro.election?.ruling] || RULING_PARTIES.market;
}

// =================================================================================
// CYKLE SEKTORÓW
// =================================================================================

function getStockSectorCycles(stock) {
    return (Array.isArray(stock?.sector) ? stock.sector : []).map(sector => macro.sectorCycles?.[sector]).filter(Boolean);
}

/** Dodatek do kwartalnego wzrostu przychodów z fazy sektora. */
function getSectorCycleAdj(stock) {
    const cycles = getStockSectorCycles(stock);
    if (!cycles.length) return 0;
    return cycles.reduce((sum, cycle) => sum + SECTOR_CYCLE_PHASES[cycle.phase].adj, 0) / cycles.length;
}

/** Mnożnik wyceny z fazy sektora (boom drożej, spadek taniej). */
function getSectorValuationFactor(stock) {
    const cycles = getStockSectorCycles(stock);
    if (!cycles.length) return 1;
    return cycles.reduce((sum, cycle) => sum + SECTOR_CYCLE_PHASES[cycle.phase].val, 0) / cycles.length;
}

function advanceSectorCycles() {
    for (const [sector, cycle] of Object.entries(macro.sectorCycles)) {
        cycle.quartersLeft--;
        if (cycle.quartersLeft > 0) continue;
        // Recesja przyspiesza wejście w spadek, ekspansja — w boom.
        let next = SECTOR_CYCLE_PHASES[cycle.phase].next;
        if (economyCycle.phase === 'recession' && next === 'boom' && Math.random() < 0.5) next = 'trough';
        cycle.phase = next;
        cycle.quartersLeft = getRandomIntInRange(...SECTOR_CYCLE_PHASES[next].length);
        if (next === 'boom' || next === 'decline') {
            logEvent(`${SECTOR_CYCLE_PHASES[next].icon} Sektor ${sector}: ${next === 'boom' ? 'zaczyna się boom' : 'koniunktura słabnie'}.`, 'market');
        }
    }
}

// =================================================================================
// WSKAŹNIKI (co kwartał, po advanceEconomyCycle)
// =================================================================================

function advanceMacroQuarter() {
    ensureMacroState();
    macro.quarter++;
    const gdpQuarter = Number(economyCycle?.gdpGrowth) || 0;
    macro.gdpAnnual = gdpQuarter * 4;

    // Inflacja: koniunktura (popyt), stopy (realna stopa ponad neutralną schładza), szoki — z bezwładnością.
    const realRateGap = (Number(centralBank.baseInterestRate) || 0.05) - (macro.inflation + NEUTRAL_REAL_RATE);
    const pressure = INFLATION_TARGET + ((Number(economyCycle.index) || 50) - 50) / 50 * 0.02 - realRateGap * 0.3 + macro.shocks.inflation;
    macro.inflation = clampValue(macro.inflation * 0.7 + pressure * 0.3 + gaussianRandom() * 0.002, -0.01, 0.15);
    macro.shocks.inflation *= 0.5;

    // Bezrobocie: prawo Okuna + powrót do naturalnej stopy.
    macro.unemployment = clampValue(macro.unemployment - (macro.gdpAnnual - 0.025) * 0.3 + (NATURAL_UNEMPLOYMENT - macro.unemployment) * 0.1 + gaussianRandom() * 0.002, 0.02, 0.2);

    advanceSectorCycles();
    advanceElectionCycle();

    macro.history.push({ inflation: macro.inflation, unemployment: macro.unemployment, gdp: macro.gdpAnnual, rate: centralBank.baseInterestRate });
    if (macro.history.length > MACRO_HISTORY_LIMIT) macro.history.shift();
}

function clampValue(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// =================================================================================
// POSIEDZENIE BANKU CENTRALNEGO
// =================================================================================

function getBcTraits() {
    return (centralBank.ceo?.traits || []).map(t => t.name);
}

/** Stopa docelowa wg reguły Taylora i charakteru prezesa. */
function getTaylorRate() {
    const traits = getBcTraits();
    let target = macro.inflation + NEUTRAL_REAL_RATE + 0.5 * (macro.inflation - INFLATION_TARGET) - 0.5 * (macro.unemployment - NATURAL_UNEMPLOYMENT);
    if (traits.includes('Jastrząb')) target += 0.005;
    if (traits.includes('Gołąb')) target -= 0.005;
    return clampValue(target, ...BC_RATE_LIMITS);
}

function roundRateStep(value) {
    return Math.round(value / 0.0025) * 0.0025;
}

/** Zmiana stopy, którą BC wybierze przy danym celu (bez losowości). */
function getPlannedRateChange(target) {
    const traits = getBcTraits();
    const step = traits.includes('Stabilizator') ? BC_MAX_STEP / 2 : BC_MAX_STEP;
    const gap = target - centralBank.baseInterestRate;
    if (Math.abs(gap) < 0.002) return 0;
    return roundRateStep(clampValue(gap, -step, step));
}

function describeRateChange(change) {
    if (change > 0) return `podwyżka o ${(change * 100).toFixed(2)} pkt proc.`;
    if (change < 0) return `obniżka o ${(-change * 100).toFixed(2)} pkt proc.`;
    return 'bez zmian';
}

/** Co kwartał: decyzja o stopach, reakcja rynku na niespodziankę, wydanie gazety. */
function runCentralBankMeeting() {
    ensureMacroState();
    const traits = getBcTraits();
    let change = getPlannedRateChange(getTaylorRate());
    let surpriseNote = '';
    if (traits.includes('Partyjniak') && Math.random() < 0.25) {
        change = roundRateStep(getRandomInRange(-BC_MAX_STEP, BC_MAX_STEP));
        surpriseNote = ' Decyzja zaskoczyła ekonomistów — komentatorzy mówią o naciskach politycznych.';
    }
    const before = centralBank.baseInterestRate;
    centralBank.baseInterestRate = clampValue(before + change, ...BC_RATE_LIMITS);
    change = centralBank.baseInterestRate - before;
    updateInterestRates();

    const expected = macro.expectation?.change || 0;
    const surprise = change - expected;
    if (Math.abs(surprise) >= 0.001) applyRateSurprise(surprise);

    macro.lastDecision = { change, rate: centralBank.baseInterestRate, expected, surprise, quarter: macro.quarter };

    // Oczekiwania analityków na następne posiedzenie (z szumem — nie zawsze trafne).
    const forecast = roundRateStep(clampValue(getPlannedRateChange(getTaylorRate()) + gaussianRandom() * 0.002, -BC_MAX_STEP, BC_MAX_STEP));
    macro.expectation = { change: forecast, label: describeRateChange(forecast) };

    publishRateDecision(change, expected, surpriseNote);
}

/** Niespodzianka: podwyżka ponad oczekiwania przecenia rynek (mocniej sektory wrażliwe na stopy). */
function applyRateSurprise(surprise) {
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt) continue;
        const sens = getSectorProfile(stock).rateSens;
        const effect = clampValue(-surprise * RATE_SURPRISE_IMPACT * sens * 10, -0.04, 0.04);
        if (Math.abs(effect) >= 0.002) applyPriceEffect(stock.symbol, effect, effect > 0 ? 'positive' : 'negative', 'market');
    }
}

function publishRateDecision(change, expected, note = '') {
    const rate = (centralBank.baseInterestRate * 100).toFixed(2);
    const verb = change > 0 ? 'podnosi' : change < 0 ? 'obniża' : 'utrzymuje';
    const surprise = Math.abs(change - expected) >= 0.001 ? ' To niespodzianka dla rynku!' : ' Decyzja zgodna z oczekiwaniami.';
    const body = `Bank Centralny ${verb} stopę referencyjną ${change ? 'do' : 'na poziomie'} ${rate}% (${describeRateChange(change)}; oczekiwano: ${describeRateChange(expected)}).${surprise}${note} `
        + `Inflacja ${(macro.inflation * 100).toFixed(1)}% (cel ${(INFLATION_TARGET * 100).toFixed(1)}%), bezrobocie ${(macro.unemployment * 100).toFixed(1)}%, PKB ${(macro.gdpAnnual * 100).toFixed(1)}% r/r. `
        + `Kredyty od ${(LOAN_INTEREST_RATE * 100).toFixed(2)}%, depozyty ${(DEPOSIT_INTEREST_RATE * 100).toFixed(2)}%. `
        + `Analitycy na kolejne posiedzenie oczekują: ${macro.expectation.label}.`;
    const subject = `📰 Gazeta Ekonomiczna: BC ${verb} stopy${change ? ` do ${rate}%` : ` (${rate}%)`}`;
    addMacroLog(`🏛️ ${subject.replace('📰 Gazeta Ekonomiczna: ', '')}`);
    if (typeof addMail === 'function') addMail({ sender: 'OBSER', subject, body, importance: change !== 0 || Math.abs(change - expected) >= 0.001 ? 3 : 2 });
    if (change !== 0) showToast(`Bank Centralny: ${describeRateChange(change)} (${rate}%)`, 'default', 6000);
}

/** Wpis do dziennika zdarzeń bez osobnego maila (mail wysyła gazeta). */
function addMacroLog(text) {
    eventLog.unshift({ text, category: 'state' });
    if (eventLog.length > MAX_LOG_ENTRIES) eventLog.pop();
}

/** Nowe runCentralBankAI: posiedzenie, rezerwy, wsparcie spółek państwowych. */
function runCentralBankAI() {
    if (!centralBank.ceo) generateCentralBankGovernor();
    runCentralBankMeeting();

    const traits = getBcTraits();
    let reserveChange = economyCycle.phase === 'overheating' ? 0.01 : economyCycle.phase === 'recession' ? -0.01 : 0;
    if (traits.includes('Regulator')) reserveChange += 0.005;
    if (traits.includes('Deregulator')) reserveChange -= 0.005;
    if (traits.includes('Stabilizator')) reserveChange *= 0.2;
    if (Math.abs(reserveChange) > 0.001 && Math.random() < 0.3) {
        centralBank.reserveRequirement = clampValue(centralBank.reserveRequirement + reserveChange, 0.05, 0.25);
        addMacroLog(`🏛️ Bank Centralny zmienia stopę rezerw obowiązkowych na ${(centralBank.reserveRequirement * 100).toFixed(0)}%.`);
    }
    if (Math.random() < Math.min(1, getRulingParty().subsidies * 0.5)) fundStateOwnedCompanies(); // dotacje zależą od partii rządzącej
}

// =================================================================================
// WYBORY I SPÓŁKI PAŃSTWOWE
// =================================================================================

function advanceElectionCycle() {
    const election = macro.election;
    election.quartersLeft--;
    if (election.quartersLeft === 1 && !election.campaign) {
        election.campaign = true;
        logEvent(`🗳️ Rusza kampania przed wyborami parlamentarnymi. Rządzi ${getRulingParty().name} — spółki państwowe pod lupą.`, 'state');
        return;
    }
    if (election.quartersLeft > 0) return;

    // Zła koniunktura i wysoka inflacja szkodzą rządzącym.
    const badTimes = economyCycle.phase === 'recession' || macro.inflation > 0.05 || macro.unemployment > 0.09;
    const change = Math.random() < (badTimes ? 0.7 : 0.35);
    const previous = election.ruling;
    if (change) election.ruling = previous === 'market' ? 'state' : 'market';
    election.campaign = false;
    election.quartersLeft = ELECTION_INTERVAL_QUARTERS;
    const party = getRulingParty();
    logEvent(`🗳️ WYBORY: ${change ? `zmiana władzy — wygrywa ${party.name}` : `${party.name} utrzymuje władzę`}. ${party === RULING_PARTIES.state ? 'Więcej dotacji i nacjonalizacji.' : 'Kurs na prywatyzację i mniej dotacji.'}`, 'state');
    if (change) {
        for (const stock of stocks.filter(s => s.isStateOwned && !s.isBankrupt)) {
            applyPriceEffect(stock.symbol, party.stateMood * 2, party.stateMood > 0 ? 'positive' : 'negative', 'market');
        }
    }
}

const STATE_COMPANY_EVENTS = [
    { id: 'st_subsidy', type: 'positive', text: 'Rząd dokapitalizowuje spółki Skarbu Państwa w ramach programu modernizacji.', price: 0.04, cashPct: 0.01 },
    { id: 'st_contract', type: 'positive', text: 'Spółki państwowe wygrywają duży kontrakt zagraniczny.', price: 0.05, health: 0.3 },
    { id: 'st_orders', type: 'positive', text: 'Agencje rządowe zwiększają zamówienia w spółkach państwowych.', price: 0.03, health: 0.2 },
    { id: 'st_noprivatization', type: 'positive', text: 'Skarb Państwa zapowiada, że nie sprzeda kluczowych spółek — inwestorzy odetchnęli.', price: 0.02 },
    { id: 'st_defense', type: 'positive', text: 'Program zbrojeniowy: państwowy przemysł dostaje wieloletnie zamówienia.', price: 0.05, sectors: ['Przemysł', 'Energia'] },
    { id: 'st_audit', type: 'negative', text: 'Najwyższa Izba Kontroli zapowiada audyt w spółkach Skarbu Państwa.', price: -0.03 },
    { id: 'st_politics', type: 'negative', text: 'Spory w rządzie i karuzela kadrowa w spółkach państwowych.', price: -0.04, health: -0.2 },
    { id: 'st_tax', type: 'negative', text: 'Rząd nakłada na spółki państwowe specjalną daninę na cele społeczne.', price: -0.03, cashPct: -0.01 },
    { id: 'st_dividend', type: 'negative', text: 'Skarb Państwa żąda dywidendy specjalnej, by załatać budżet.', price: -0.02, cashPct: -0.015 },
    { id: 'st_rating', type: 'negative', text: 'Agencje ratingowe obniżają perspektywę spółek państwowych.', price: -0.04 }
];

/** Zdarzenie spółek państwowych (pozytywne częściej, gdy rządzi Blok Państwowy). */
function triggerStateCompanyEventCycle() {
    const companies = stocks.filter(s => s.isStateOwned && !s.isBankrupt && !s.assetType);
    if (!companies.length) return null;
    const positiveChance = 0.5 + getRulingParty().stateMood * 5 + (macro.election.campaign ? 0.1 : 0);
    const event = pickMacroEvent(STATE_COMPANY_EVENTS.filter(e => (e.type === 'positive') === (Math.random() < positiveChance)));
    if (!event) return null;
    const targets = event.sectors ? companies.filter(s => s.sector?.some(sec => event.sectors.includes(sec))) : companies;
    for (const stock of targets.length ? targets : companies) {
        applyPriceEffect(stock.symbol, event.price * getRandomInRange(0.7, 1.3), event.type, 'market');
        if (event.health) stock.financialHealth = clampValue((Number(stock.financialHealth) || 0) + event.health, -5, 5);
        if (event.cashPct) {
            const amount = Math.round(getMarketCapValue(stock) * Math.abs(event.cashPct));
            if (event.cashPct > 0 && governmentTreasury >= amount) {
                governmentTreasury -= amount;
                adjustCompanyCash(stock, amount);
                adjustBalanceSheet(stock, { assets: amount, retainedEarnings: amount });
            } else if (event.cashPct < 0) {
                const paid = Math.min(amount, Math.max(0, stock.cash));
                adjustCompanyCash(stock, -paid);
                adjustBalanceSheet(stock, { assets: -paid, retainedEarnings: -paid });
                governmentTreasury += paid;
            }
        }
    }
    logEvent(`🏛️ ${event.text}`, 'state');
    return event;
}

// =================================================================================
// SZOKI MAKRO
// =================================================================================

const MACRO_SHOCK_EVENTS = [
    { id: 'oil', type: 'negative', text: '🛢️ Szok naftowy: ropa drożeje o 40%. Inflacja przyspiesza, transport i turystyka tracą, energetyka zyskuje.', inflation: 0.01, effects: { Energia: 0.06, Transport: -0.07, Turystyka: -0.06, Logistyka: -0.05, '*': -0.01 } },
    { id: 'currency', type: 'negative', text: '💱 Kryzys walutowy: złoty traci na wartości. Importerzy pod presją, eksporterzy korzystają.', inflation: 0.008, effects: { Przemysł: 0.03, Chemia: 0.02, 'Dobra konsumpcyjne': -0.05, '*': -0.01 } },
    { id: 'techboom', type: 'positive', text: '💻 Boom technologiczny: fundusze venture zalewają branżę pieniędzmi.', effects: { Technologia: 0.08, Gaming: 0.06, Badania: 0.05, '*': 0.01 } },
    { id: 'drought', type: 'negative', text: '🌵 Susza: słabe zbiory podbijają ceny żywności.', inflation: 0.004, effects: { Żywność: -0.06, Chemia: 0.02 } },
    { id: 'pandemic', type: 'negative', text: '🦠 Nowa fala grypy: ludzie zostają w domach. Medycyna zyskuje, turystyka i usługi tracą.', effects: { Medycyna: 0.07, Turystyka: -0.08, Usługi: -0.04, '*': -0.01 } },
    { id: 'export', type: 'positive', text: '🚢 Rekordowy eksport: zagraniczne zamówienia napędzają przemysł i logistykę.', effects: { Przemysł: 0.05, Logistyka: 0.05, Transport: 0.03, '*': 0.01 } },
    { id: 'housing', type: 'positive', text: '🏠 Rządowy program mieszkaniowy: rekordowy popyt na kredyty i mieszkania.', effects: { Nieruchomości: 0.06, Budowlany: 0.06, Bankowość: 0.03, '*': 0.01 } },
    { id: 'energyprices', type: 'positive', text: '⚡ Spadek cen energii: koszty firm maleją, inflacja hamuje.', inflation: -0.006, effects: { Energia: -0.04, Przemysł: 0.03, Chemia: 0.03, '*': 0.01 } }
];

/** Losuje zdarzenie, które nie wystąpiło niedawno. */
function pickMacroEvent(pool) {
    const fresh = pool.filter(event => !macro.recentEvents.includes(event.id));
    const event = getRandomElement(fresh.length ? fresh : pool);
    if (!event) return null;
    macro.recentEvents.unshift(event.id);
    macro.recentEvents.length = Math.min(macro.recentEvents.length, EVENT_COOLDOWN);
    return event;
}

function triggerMacroShockEvent() {
    const wantPositive = Math.random() < getCyclePositiveEventBias();
    const event = pickMacroEvent(MACRO_SHOCK_EVENTS.filter(e => (e.type === 'positive') === wantPositive));
    if (!event) return null;
    if (event.inflation) macro.shocks.inflation += event.inflation;
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt) continue;
        const sectorEffects = (stock.sector || []).map(sector => event.effects[sector]).filter(v => v !== undefined);
        const effect = sectorEffects.length ? Math.max(...sectorEffects.map(Math.abs)) * Math.sign(sectorEffects[0]) : event.effects['*'];
        if (effect) applyPriceEffect(stock.symbol, effect * getRandomInRange(0.8, 1.2), effect > 0 ? 'positive' : 'negative', 'market');
    }
    logEvent(event.text, 'state');
    return event;
}

/** Szkolenie „Szósty zmysł”: przeczucie, który sektor wchodzi w boom lub spadek. */
function triggerSixthSenseEvent() {
    const turning = Object.entries(macro.sectorCycles).filter(([, cycle]) => cycle.quartersLeft <= 1 && ['trough', 'peak'].includes(cycle.phase));
    if (!turning.length) return;
    const [sector, cycle] = getRandomElement(turning);
    showToast(`🔮 Szósty zmysł: sektor ${sector} ${cycle.phase === 'trough' ? 'wkrótce odbije' : 'jest blisko szczytu'}…`, 'default', 8000);
}

// =================================================================================
// ZAUFANIE KLIENTÓW: wynik vs lokata i inflacja
// =================================================================================

/** Kara do zaufania, gdy fundusz przegrywa z lokatą lub inflacją w bieżącym okresie. */
function getMacroTrustPenalty(fundReturn, elapsedMs) {
    const years = Math.max(0, elapsedMs) / (BASE_DELAYS.quarterly * 4);
    if (years <= 0.05) return 0;
    const hurdle = Math.max(getDepositRate(), macro.inflation) * years;
    const shortfall = hurdle - fundReturn;
    return shortfall > 0 ? Math.min(15, shortfall * 300) : 0;
}
