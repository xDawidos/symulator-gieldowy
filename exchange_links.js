// =================================================================================
// exchange_links.js: 0.16.3 G12. Połączone giełdy (warstwa danych, bez DOM — okno wydarzenia jest w countries_ui.js).
// Raz na jakiś czas (liczone w kwartałach gry) wydarza się jedno z trzech połączeń naszej giełdy z giełdą kraju X:
//   pozytywne (50%): nasza giełda przejmuje giełdę X          — kraj X dołącza na naszych warunkach (link 'merged')
//   neutralne (30%): powstaje giełda międzynarodowa           — nasza + X + najwyżej 2 inne, kolejne dołączają powoli (link 'intl')
//   negatywne (20%): giełda X przejmuje naszą (wariant B)     — kraj X dołącza na swoich warunkach (link 'taken'): wyższe opłaty
//                                                               za notowanie na GPW, kurs GPW spada o 5–15% w 2 kwartały
// Skutki dołączenia kraju przez połączenie: handel jego spółkami bez biletu i z prowizją krajową, boty kraju, waluta w kantorze,
// duży malejący bonus Turystyki. Trzy kraje europejskie (DE, CZ, SE, CH, FR) razem tworzą wspólnotę europejską (bot europejski, G14).
// Szansa startuje od 1%, podwaja się co kwartał do 32%, po wydarzeniu wraca do 1% i jest 2 kwartały przerwy. Zdarzenia od 8. kwartału.
// =================================================================================

const LINK_RULES = {
    startChance: 0.01, maxChance: 0.32, gapQ: 2, fromQ: 8,
    weights: { merged: 0.5, intl: 0.3, taken: 0.2 },
    slowJoinChance: 0.12,           // na kwartał: giełda międzynarodowa przyjmuje kolejny kraj
    maxIntlAtStart: 2,              // z nami i krajem X najwyżej 2 inne
    domesticCommission: 0.0025,     // prowizja spółek połączonego kraju (jak na rynku krajowym)
    listingFeeMult: 1.5,            // wariant B: GPW pobiera wyższe opłaty za notowanie
    dropRange: [0.05, 0.15], dropQuarters: 2,
    tourismBonus: 0.10,
    communityMin: 3,
    europe: ['DE', 'CZ', 'SE', 'CH', 'FR']
};

let exchangeLinks = createLinksState();
let linkEventLog = [];                  // do wglądu w oknie giełd (nie zapisujemy; historia wydarzeń jest w exchangeLinks.history)

function createLinksState() {
    return { chance: LINK_RULES.startChance, lastQ: -99, history: [], intl: null, takenBy: null, community: false };
}

function resetLinksState() { exchangeLinks = createLinksState(); linkEventLog = []; }

function isCountryLinked(id) { return Boolean(countryState[id]?.link); }
function getLinkedCountries() { return getJoinedCountries().filter(isCountryLinked); }
function getLinkCandidates() { return Object.keys(COUNTRY_DEFS).filter(id => !isCountryLinked(id)); }
function countEuropeanJoined() { return LINK_RULES.europe.filter(id => isCountryJoined(id)).length; }
function isEuropeanCommunity() { return Boolean(exchangeLinks.community); }
/** Wariant B: GPW pobiera od notowanych spółek podwyższone opłaty (mnożnik do opłaty z finance.js). */
function getListingFeeBoost() { return exchangeLinks.takenBy ? LINK_RULES.listingFeeMult : 1; }

/** Podpina kraj do naszej giełdy (kraj niedołączony najpierw dołącza). Zwraca true, gdy kraj jest teraz połączony. */
function linkCountry(id, kind) {
    if (!COUNTRY_DEFS[id] || isCountryLinked(id)) return false;
    if (!isCountryJoined(id)) joinCountry(id, `link:${kind}`);
    if (!isCountryJoined(id)) return false;
    countryState[id].link = kind;
    if (typeof applySectorShock === 'function') applySectorShock('Turystyka', LINK_RULES.tourismBonus, 2, { fadeQ: 4 });
    return true;
}

/** Spadek kursów GPW (wariant B): premia wszystkich sektorów w dół o 5–15%, wygaszana w 2 kwartały. */
function applyTakeoverDrop() {
    const drop = getRandomInRange(...LINK_RULES.dropRange);
    if (typeof addSectorShock === 'function') for (const sector of SECTOR_NAMES) addSectorShock(sector, -drop, { holdQ: 1, fadeQ: LINK_RULES.dropQuarters });
    return drop;
}

/** Ostatnio podpięty kraj (ostatni w kolejności dołączenia z flagą link). */
function countryLastLinked() { return getLinkedCountries().sort((a, b) => countryState[a].joinedQ - countryState[b].joinedQ || (a < b ? -1 : 1)).pop(); }

function pickLinkKind() {
    let roll = Math.random();
    for (const [kind, weight] of Object.entries(LINK_RULES.weights)) { roll -= weight; if (roll <= 0) return kind; }
    return 'merged';
}

/** Wykonuje wydarzenie wybranego rodzaju; zwraca wpis { q, kind, country, members, drop } albo null (brak kandydata). */
function runLinkEvent(kind = pickLinkKind(), country = null) {
    const candidates = getLinkCandidates();
    if (!candidates.length) return null;
    const x = country && candidates.includes(country) ? country : getRandomElement(candidates);
    const entry = { q: macro.quarter, kind, country: x, members: [x], drop: 0 };
    if (!linkCountry(x, kind)) return null;
    const name = COUNTRY_DEFS[x].name, ex = COUNTRY_DEFS[x].operator.name;
    let text;
    if (kind === 'merged') {
        if (typeof spawnBayerBot === 'function' && !aiCompetitors.some(b => b.id === 'fb_bayer')) spawnBayerBot(x); // pierwsze przejęcie giełdy przez naszą
        text = `Nasza giełda przejmuje giełdę ${ex}: spółki kraju ${name} są u nas notowane bez biletu, z prowizją krajową.`;
    } else if (kind === 'intl') {
        for (let i = getRandomIntInRange(0, LINK_RULES.maxIntlAtStart); i > 0; i--) {
            const rest = getLinkCandidates();
            if (rest.length && linkCountry(getRandomElement(rest), 'intl')) entry.members.push(countryLastLinked());
        }
        exchangeLinks.intl = { members: ['PL', ...entry.members], startedQ: macro.quarter };
        text = `Powstaje giełda międzynarodowa: Polska, ${entry.members.map(m => COUNTRY_DEFS[m].name).join(', ')}. Kolejne kraje mogą dołączać powoli.`;
    } else {
        entry.drop = applyTakeoverDrop();
        exchangeLinks.takenBy = x;
        text = `Giełda ${ex} przejmuje naszą (wariant B). Kraj ${name} dołącza na swoich warunkach: wyższe opłaty za notowanie, kurs GPW spada o ok. ${Math.round(entry.drop * 100)}% w ${LINK_RULES.dropQuarters} kwartały.`;
    }
    entry.text = text;
    exchangeLinks.history.push({ q: entry.q, kind, country: x, members: entry.members, drop: Math.round(entry.drop * 1000) / 1000 });
    if (exchangeLinks.history.length > 12) exchangeLinks.history.shift();
    linkEventLog.push(entry);
    logEvent(`🌍 Połączone giełdy: ${text}`, 'market');
    if (typeof pushNews === 'function') pushNews(`🌍 ${text}`, null);
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('konsolidacjaGield');
    checkEuropeanCommunity();
    if (typeof onLinkEvent === 'function') onLinkEvent(entry);
    return entry;
}

/** Wspólnota europejska: ≥ 3 kraje europejskie na giełdzie → pojawia się bot europejski (G14). */
function checkEuropeanCommunity() {
    if (exchangeLinks.community || countEuropeanJoined() < LINK_RULES.communityMin) return false;
    exchangeLinks.community = true;
    logEvent('🇪🇺 Powstaje wspólnota europejska giełd — na rynek wchodzi europejski hazardzista.', 'market');
    if (typeof pushNews === 'function') pushNews('🇪🇺 Wspólnota europejska giełd', null);
    if (typeof spawnEuropeanBot === 'function') spawnEuropeanBot();
    return true;
}

/** Co kwartał: szansa na wydarzenie (1% → podwajana do 32%), powolne dołączanie do giełdy międzynarodowej, wspólnota. */
function processLinksQuarterly() {
    const q = macro.quarter;
    checkEuropeanCommunity();
    if (exchangeLinks.intl && Math.random() < LINK_RULES.slowJoinChance) {
        const candidates = getLinkCandidates();
        if (candidates.length) {
            const id = getRandomElement(candidates);
            if (linkCountry(id, 'intl')) {
                exchangeLinks.intl.members.push(id);
                logEvent(`🌍 Giełda międzynarodowa przyjmuje kolejny kraj: ${COUNTRY_DEFS[id].name}.`, 'market');
                checkEuropeanCommunity();
            }
        }
    }
    if (q < LINK_RULES.fromQ || q - exchangeLinks.lastQ <= LINK_RULES.gapQ) return null;
    if (Math.random() < exchangeLinks.chance) {
        const entry = runLinkEvent();
        if (entry) { exchangeLinks.chance = LINK_RULES.startChance; exchangeLinks.lastQ = q; return entry; }
    }
    exchangeLinks.chance = Math.min(LINK_RULES.maxChance, exchangeLinks.chance * 2);
    return null;
}

function checkLinkInvariants() {
    const problems = [];
    for (const id of getLinkedCountries()) if (!COUNTRY_DEFS[id]) problems.push(`połączony kraj ${id} bez definicji`);
    if (exchangeLinks.takenBy && !isCountryLinked(exchangeLinks.takenBy)) problems.push(`przejmujący ${exchangeLinks.takenBy} nie jest połączony`);
    if (exchangeLinks.intl) for (const m of exchangeLinks.intl.members) if (m !== 'PL' && !isCountryLinked(m)) problems.push(`członek giełdy międzynarodowej ${m} nie jest połączony`);
    if (!(exchangeLinks.chance >= LINK_RULES.startChance - 1e-12 && exchangeLinks.chance <= LINK_RULES.maxChance + 1e-12)) problems.push(`szansa połączenia ${exchangeLinks.chance}`);
    return problems;
}

function getLinksSnapshot() { return JSON.parse(JSON.stringify(exchangeLinks)); }
function applyLinksSnapshot(snapshot) {
    exchangeLinks = createLinksState();
    if (!snapshot || typeof snapshot !== 'object') return;
    exchangeLinks.chance = Math.min(LINK_RULES.maxChance, Math.max(LINK_RULES.startChance, Number(snapshot.chance) || LINK_RULES.startChance));
    exchangeLinks.lastQ = Number.isFinite(Number(snapshot.lastQ)) ? Number(snapshot.lastQ) : -99;
    exchangeLinks.history = Array.isArray(snapshot.history) ? snapshot.history.slice(-12) : [];
    exchangeLinks.intl = snapshot.intl && Array.isArray(snapshot.intl.members) ? { members: snapshot.intl.members.filter(m => m === 'PL' || COUNTRY_DEFS[m]), startedQ: Number(snapshot.intl.startedQ) || 0 } : null;
    exchangeLinks.takenBy = snapshot.takenBy && COUNTRY_DEFS[snapshot.takenBy] ? snapshot.takenBy : null;
    exchangeLinks.community = Boolean(snapshot.community);
}
