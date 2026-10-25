// =================================================================================
// subcontractors.js: 0.15.5 B2–B3. Podwykonawcy budów: rejestr 12 specjalności (cena, jakość, moc, reputacja),
// aukcja 3–5 ofert przy zleceniu, limit udziału jednego podwykonawcy u generalnego wykonawcy, powstawanie i upadek firm,
// przejęcia pionowe (podwykonawca jako prywatna spółka zależna: transfer zysku, usamodzielnienie, wchłonięcie).
// Podwykonawcy to firmy prywatne i nienotowane — nie wchodzą na listę spółek giełdowych ani do żadnego limitu spółek.
// =================================================================================

const SUBCONTRACTOR_SPECIALTIES = {
    foundations: 'Fundamenty', steel: 'Konstrukcje stalowe', installations: 'Instalacje', electrical: 'Elektryka',
    roofs: 'Dachy', finishing: 'Wykończenia', roads: 'Drogowe', bridges: 'Mosty',
    it_cabling: 'Okablowanie IT', energy: 'Energetyka', survey: 'Geodezja', industrial: 'Industrial'
};
// Specjalności z dawnych zapisów i startowej listy 7 podwykonawców.
const SUBCONTRACTOR_LEGACY = { technology: 'it_cabling', general: 'installations', office: 'finishing', industrial: 'industrial', residential: 'foundations' };

const SUBCONTRACTOR_RULES = {
    minPerSpecialty: 3, maxPerSpecialty: 8,
    auctionMin: 3, auctionMax: 5,
    maxShare: 0.5, shareMinHires: 3, shareWindowQuarters: 8,   // jeden podwykonawca ≤ 50% zleceń generalnego w oknie 8 kw.
    startupChance: 0.05, failChance: 0.012, idleQuarters: 12,
    crossSpecialtyPenalty: 25,                                 // punkty kary za podwykonawcę spoza potrzebnej specjalności
    startHireChance: 0.30,                                     // generalny wykonawca AI zatrudnia podwykonawcę już przy starcie budowy
    groupMaxShare: 0.40,                                       // jedna grupa ≤ 40% podwykonawców specjalności
    groupPriceTolerance: 0.15,                                 // zlecenie od grupy nie omija aukcji, gdy cena grupy > rynkowa + 15%
    groupPreference: 12,                                       // premia punktowa dla podwykonawcy z grupy zleceniodawcy (pierwszeństwo)
    acquireChance: 0.05, acquireCooldownQuarters: 12, acquireMultiple: [6, 10], acquireMinProfit: 30000,
    transferShare: [0.3, 0.7], absorbAfterQuarters: 8, absorbChance: 0.10, inHouseBonusMax: 0.10
};

let subcontractLog = [];   // zlecenia podwykonawcom z ostatnich 8 kw.: { q, builder, spec, specialty }

const SUBCONTRACTOR_NAME_PARTS = {
    a: ['Bud', 'Tech', 'Pol', 'Max', 'Pro', 'Eko', 'Mega', 'Inter', 'Alfa', 'Omega', 'Nowo', 'Super', 'Ekspert', 'Solid', 'Prime', 'Wektor', 'Orion', 'Rzemiosło'],
    b: {
        foundations: ['Fundament', 'Pale', 'Geotech', 'Grunt'], steel: ['Stal', 'Konstrukt', 'Spaw', 'Szkielet'], installations: ['Instal', 'Hydro', 'Termo', 'Klima'],
        electrical: ['Elektro', 'Volt', 'Prąd', 'Kabel'], roofs: ['Dach', 'Pokrycia', 'Więźba', 'Blacha'], finishing: ['Wykończ', 'Gips', 'Malar', 'Podłoga'],
        roads: ['Droga', 'Asfalt', 'Nawierzchnia', 'Trasa'], bridges: ['Most', 'Wiadukt', 'Przęsło', 'Estakada'], it_cabling: ['Sieć', 'Światłowód', 'Data', 'Okablowanie'],
        energy: ['Energo', 'Turbina', 'Fotowolt', 'Sieć Mocy'], survey: ['Geodeta', 'Pomiar', 'Mapa', 'Teodolit'], industrial: ['Industrial', 'Hala', 'Przemysł', 'Linia']
    }
};

const SUBCONTRACTOR_CATALOG_NEEDS = [
    [/(bridge)/, ['bridges', 'steel']],
    [/(container_port|cargo_terminal|cruise_terminal)/, ['roads', 'bridges']],
    [/(logistics_hub|distribution_center|fuel_station_network)/, ['roads', 'foundations']],
    [/(energy_plant|wind_farm|solar_park|refinery)/, ['energy', 'electrical']],
    [/(server_room|data_center|chip_factory|tv_studio|broadcasting|esports|research|lab|innovation|testing|aerospace|materials)/, ['it_cabling', 'electrical']],
    [/(skyscraper|financial_tower|bank_headquarters|office_building)/, ['steel', 'installations']],
    [/(mine)/, ['survey', 'foundations']],
    [/(factory|plant|production|industrial|brewery|food_processing|textile|pharma|chemical)/, ['industrial', 'steel']],
    [/(warehouse|dairy_farm)/, ['roofs', 'industrial']],
    [/(hospital|hotel|resort|theme_park|shopping|residential|cinema|casino|ski)/, ['finishing', 'installations']],
    [/(vault|new_branch)/, ['roofs', 'finishing']]
];

/** Specjalności potrzebne do budowy danej pozycji katalogu (pierwsza — główna). */
function getRequiredSubcontractorSpecialties(buildingType) {
    const id = String(buildingType?.id || '');
    for (const [pattern, list] of SUBCONTRACTOR_CATALOG_NEEDS) if (pattern.test(id)) return list;
    return ['foundations', 'roofs'];
}

function getSubcontractorQuarter() {
    return typeof macro === 'object' && macro && Number.isFinite(macro.quarter) ? macro.quarter : 0;
}

function normalizeSubcontractorSpecialty(value) {
    if (SUBCONTRACTOR_SPECIALTIES[value]) return value;
    return SUBCONTRACTOR_LEGACY[value] || 'foundations';
}

/** Uzupełnia pola nowego modelu (także w dawnych zapisach i w uproszczonych podwykonawcach z testów). */
function normalizeSubcontractor(spec) {
    spec.specialty = normalizeSubcontractorSpecialty(spec.specialty);
    if (!Number.isFinite(Number(spec.bonus))) spec.bonus = 0.08;
    if (!Number.isFinite(Number(spec.quality))) spec.quality = Math.max(10, Math.min(95, Math.round(((Number(spec.bonus) - 0.04) / 0.12) * 100)));
    if (!Number.isFinite(Number(spec.priceFactor))) spec.priceFactor = 1;
    if (!Number.isFinite(Number(spec.reputation))) spec.reputation = 50;
    if (!Array.isArray(spec.profits)) spec.profits = [0, 0, 0, 0];
    if (!Number.isFinite(Number(spec.profitQ))) spec.profitQ = 0;
    if (!Number.isFinite(Number(spec.founded))) spec.founded = 0;
    if (!Number.isFinite(Number(spec.lastContractQ))) spec.lastContractQ = spec.founded;
    if (spec.groupSymbol === undefined) spec.groupSymbol = null;
    return spec;
}

function pickSubcontractorName(specialty) {
    const taken = new Set((typeof specialists !== 'undefined' ? specialists : []).map(spec => spec.name));
    for (let i = 0; i < 30; i++) {
        const name = `${getRandomElement(SUBCONTRACTOR_NAME_PARTS.a)}${getRandomElement(SUBCONTRACTOR_NAME_PARTS.b[specialty])}`;
        if (!taken.has(name)) return name;
    }
    return `${getRandomElement(SUBCONTRACTOR_NAME_PARTS.b[specialty])} ${getRandomIntInRange(100, 999)}`;
}

/** Nowy podwykonawca: jakość 25–90 (lepsi biorą drożej), cena 0,85–1,3 × stawki bazowej. */
function createSubcontractor(specialty, options = {}) {
    const quality = options.quality ?? getRandomIntInRange(25, 90);
    const spec = {
        id: nextSimulationId('spec'),
        name: options.name || pickSubcontractorName(specialty),
        specialty,
        quality,
        bonus: Math.round((0.04 + quality / 100 * 0.12) * 1000) / 1000,
        priceFactor: Math.round((0.85 + quality / 100 * 0.25 + getRandomInRange(-0.08, 0.15)) * 100) / 100,
        reputation: options.reputation ?? 50,
        contractsCompleted: 0, level: 1,
        cash: options.cash ?? getRandomIntInRange(40000, 150000),
        founded: getSubcontractorQuarter(), lastContractQ: getSubcontractorQuarter(),
        groupSymbol: null, profits: [0, 0, 0, 0], profitQ: 0
    };
    specialists.push(spec);
    return spec;
}

function getSubcontractorsBySpecialty(specialty) {
    return specialists.filter(spec => spec.specialty === specialty);
}

/** Rejestr 12 specjalności: dawni podwykonawcy dostają pola nowego modelu, a w każdej specjalności jest co najmniej 3 firmy. */
function ensureSubcontractorRegistry() {
    if (typeof specialists === 'undefined' || !Array.isArray(specialists)) return;
    for (const spec of specialists) normalizeSubcontractor(spec);
    for (const specialty of Object.keys(SUBCONTRACTOR_SPECIALTIES)) {
        let count = getSubcontractorsBySpecialty(specialty).length;
        while (count < SUBCONTRACTOR_RULES.minPerSpecialty) { createSubcontractor(specialty); count++; }
    }
}

function getSubcontractorAnnualProfit(spec) {
    return (spec.profits || []).reduce((sum, value) => sum + (Number(value) || 0), 0) + (Number(spec.profitQ) || 0);
}

/** Udział podwykonawcy w zleceniach generalnego wykonawcy w oknie 8 kw. */
function getSubcontractorShareForBuilder(builder, spec) {
    const from = getSubcontractorQuarter() - SUBCONTRACTOR_RULES.shareWindowQuarters;
    const key = getEntityKey(builder);
    const own = subcontractLog.filter(entry => entry.q > from && entry.builder === key);
    return { own: own.filter(entry => entry.spec === spec.id).length, total: own.length };
}

function isOverSubcontractorShareLimit(builder, spec) {
    const { own, total } = getSubcontractorShareForBuilder(builder, spec);
    return total >= SUBCONTRACTOR_RULES.shareMinHires && (own + 1) / (total + 1) > SUBCONTRACTOR_RULES.maxShare;
}

function getSubcontractorScore(spec, needs) {
    const priceScore = Math.max(0, Math.min(100, 100 * (1.4 - spec.priceFactor) / 0.7));
    const cross = needs.includes(spec.specialty) ? 0 : SUBCONTRACTOR_RULES.crossSpecialtyPenalty;
    return 0.40 * priceScore + 0.35 * spec.quality + 0.25 * spec.reputation - cross;
}

/**
 * Aukcja podwykonawców: generalny wykonawca prosi o oferty 3–5 wolnych firm (najpierw z potrzebnej specjalności),
 * wybiera wg ceny, jakości i reputacji. Firma ponad limitem 50% zleceń odpada, gdy są inne; firma z grupy generalnego
 * ma pierwszeństwo tylko wtedy, gdy jej cena nie przekracza rynkowej o więcej niż 15% (nie omija aukcji).
 * Zwraca { winner, candidates: [{ spec, score, price, group }] } albo null.
 */
function runSubcontractorAuction(project) {
    const builder = project.builder;
    const needs = getRequiredSubcontractorSpecialties(project.tender?.buildingType);
    const free = specialists.filter(spec => !spec.busyProjectId).map(normalizeSubcontractor);
    if (!free.length) return null;

    const matching = free.filter(spec => needs.includes(spec.specialty) && spec.groupSymbol !== getEntityKey(builder)).sort(() => Math.random() - 0.5);
    const others = free.filter(spec => !needs.includes(spec.specialty) && spec.groupSymbol !== getEntityKey(builder)).sort(() => Math.random() - 0.5);
    const size = getRandomIntInRange(SUBCONTRACTOR_RULES.auctionMin, SUBCONTRACTOR_RULES.auctionMax);
    const invited = matching.slice(0, size);
    for (const spec of others) if (invited.length < SUBCONTRACTOR_RULES.auctionMin) invited.push(spec);
    // Firmy z grupy generalnego wykonawcy zawsze biorą udział w aukcji (mają prawo złożyć ofertę).
    const own = free.filter(spec => spec.groupSymbol === getEntityKey(builder) && needs.includes(spec.specialty));
    const bestMarketPrice = Math.min(...invited.map(spec => spec.priceFactor), Infinity);

    const candidates = [...invited, ...own].map(spec => {
        const inGroup = spec.groupSymbol === getEntityKey(builder);
        let score = getSubcontractorScore(spec, needs);
        if (inGroup && spec.priceFactor <= bestMarketPrice * (1 + SUBCONTRACTOR_RULES.groupPriceTolerance)) score += SUBCONTRACTOR_RULES.groupPreference;
        return { spec, score, price: spec.priceFactor, group: inGroup };
    });
    if (!candidates.length) return null;

    const withinLimit = candidates.filter(entry => !isOverSubcontractorShareLimit(builder, entry.spec));
    const pool = withinLimit.length ? withinLimit : candidates;
    pool.sort((a, b) => b.score - a.score);
    return { winner: pool[0].spec, candidates: candidates.sort((a, b) => b.score - a.score) };
}

function noteSubcontractorHire(project, spec) {
    const quarter = getSubcontractorQuarter();
    const from = quarter - SUBCONTRACTOR_RULES.shareWindowQuarters;
    subcontractLog = subcontractLog.filter(entry => entry.q > from);
    subcontractLog.push({ q: quarter, builder: getEntityKey(project.builder), spec: spec.id, specialty: spec.specialty });
    spec.lastContractQ = quarter;
}

/** Generalny wykonawca AI zatrudnia podwykonawcę już przy starcie budowy (część projektów), bo ma na to gotówkę. */
function maybeHireSubcontractorAtStart(project) {
    const builder = project?.builder;
    if (!builder || builder.isPlayer || Math.random() >= SUBCONTRACTOR_RULES.startHireChance) return false;
    return hireSubcontractorForProject(project);
}

/** Wynik zlecenia dla podwykonawcy: reputacja i zysk kwartalny (ok. 35% opłaty). */
function noteSubcontractorResult(spec, completed) {
    normalizeSubcontractor(spec);
    spec.reputation = Math.max(0, Math.min(100, spec.reputation + (completed ? 1.5 : -3)));
}

// ---------------------------------------------------------------------------------
// Przejęcia pionowe (B3)
// ---------------------------------------------------------------------------------

function getSubcontractorGroupCount(specialty, groupSymbol) {
    const list = getSubcontractorsBySpecialty(specialty);
    return { group: list.filter(spec => spec.groupSymbol === groupSymbol).length, total: list.length };
}

/** Czy grupa może przejąć kolejnego podwykonawcę specjalności (po przejęciu ≤ 40% firm tej specjalności). */
function canGroupAcquireSpecialty(groupSymbol, specialty) {
    const { group, total } = getSubcontractorGroupCount(specialty, groupSymbol);
    return (group + 1) / total <= SUBCONTRACTOR_RULES.groupMaxShare;
}

function getSubcontractorPrice(spec) {
    const multiple = getRandomInRange(SUBCONTRACTOR_RULES.acquireMultiple[0], SUBCONTRACTOR_RULES.acquireMultiple[1]);
    return Math.round(multiple * Math.max(SUBCONTRACTOR_RULES.acquireMinProfit, getSubcontractorAnnualProfit(spec)));
}

/**
 * Spółka budowlana przejmuje podwykonawcę (cena 6–10 × roczny zysk) jako prywatną spółkę zależną.
 * Gotówka zamienia się w udziały (aktywa bez zmian); sprzedający jest poza modelem. Nie powstaje żadna spółka giełdowa.
 */
function acquireSubcontractor(builder, spec, price = null) {
    if (!builder || builder.isBankrupt || !isConstructionCompany(builder) || !spec || spec.groupSymbol || spec.busyProjectId) return false;
    if (!canGroupAcquireSpecialty(getEntityKey(builder), spec.specialty)) return false;
    const cost = Math.round(price ?? getSubcontractorPrice(spec));
    if (!(cost > 0) || (Number(builder.cash) || 0) < cost * 1.5) return false;

    adjustCompanyCash(builder, -cost);
    recordPayment(builder, 'external:wlasciciele_podwykonawcow', cost, 'Przejęcie podwykonawcy ' + spec.name);
    spec.groupSymbol = getEntityKey(builder);
    spec.groupSince = getSubcontractorQuarter();
    spec.transferShare = Math.round(getRandomInRange(SUBCONTRACTOR_RULES.transferShare[0], SUBCONTRACTOR_RULES.transferShare[1]) * 100) / 100;
    builder.lastSubcontractorAcquisitionQ = getSubcontractorQuarter();
    if (!Array.isArray(subcontractorDeals)) subcontractorDeals = [];
    subcontractorDeals.push({ q: getSubcontractorQuarter(), builder: spec.groupSymbol, spec: spec.id, name: spec.name, specialty: spec.specialty, price: cost });
    if (subcontractorDeals.length > 40) subcontractorDeals.splice(0, subcontractorDeals.length - 40);
    logEvent(`🏗️ ${builder.name} przejmuje podwykonawcę ${spec.name} (${SUBCONTRACTOR_SPECIALTIES[spec.specialty]}) za ${cost.toLocaleString('pl-PL')} PLN — prywatna spółka zależna.`, 'company');
    return true;
}

let subcontractorDeals = [];   // ostatnie przejęcia pionowe (do 40): { q, builder, spec, name, specialty, price }
let subcontractorAcquisitionCount = 0;

function tryAiVerticalAcquisition() {
    const quarter = getSubcontractorQuarter();
    const builders = stocks.filter(company => isConstructionCompany(company) && !company.isBankrupt && !company.isPlayer && !company.isStateOwned &&
        (quarter - (Number(company.lastSubcontractorAcquisitionQ) || -999)) >= SUBCONTRACTOR_RULES.acquireCooldownQuarters);
    if (!builders.length) return false;
    const builder = getRandomElement(builders);
    // Specjalność: ta, której generalny wykonawca używa najczęściej (inaczej losowa z potrzebnych budowom).
    const key = getEntityKey(builder);
    const used = {};
    for (const entry of subcontractLog) if (entry.builder === key) used[entry.specialty] = (used[entry.specialty] || 0) + 1;
    const favourite = Object.entries(used).sort((a, b) => b[1] - a[1])[0]?.[0];
    const specialty = favourite || getRandomElement(Object.keys(SUBCONTRACTOR_SPECIALTIES));
    const targets = getSubcontractorsBySpecialty(specialty).filter(spec => !spec.groupSymbol && !spec.busyProjectId);
    if (!targets.length || !canGroupAcquireSpecialty(key, specialty)) return false;
    const target = getRandomElement(targets);
    const done = acquireSubcontractor(builder, target);
    if (done) subcontractorAcquisitionCount++;
    return done;
}

/** Zysk podwykonawcy z grupy trafia częściowo do spółki matki (transfer 30–70% zysku kwartalnego). */
function transferSubcontractorProfit(spec, parent, profit) {
    const amount = Math.min(Math.max(0, Number(spec.cash) || 0), Math.max(0, profit) * (Number(spec.transferShare) || 0.5));
    if (!(amount > 0)) return 0;
    spec.cash -= amount;
    adjustCompanyCash(parent, amount);
    adjustBalanceSheet(parent, { assets: amount, retainedEarnings: amount });
    postPeriodEntry(parent, `sub_${spec.id}_${getSubcontractorQuarter()}`, { otherIncome: amount });
    recordPayment(`specialist:${spec.id}`, parent, amount, 'Transfer zysku podwykonawcy do grupy');
    return amount;
}

function releaseSubcontractorFromGroup(spec, reason) {
    const parent = spec.groupSymbol;
    spec.groupSymbol = null;
    spec.groupSince = null;
    logEvent(`🏗️ Podwykonawca ${spec.name} usamodzielnia się (${reason}).`, 'company');
    return parent;
}

/** Wchłonięcie: podwykonawca z grupy staje się działem generalnego wykonawcy (stały bonus tempa), kasa wraca do matki. */
function absorbSubcontractor(spec, parent) {
    const cash = Math.max(0, Number(spec.cash) || 0);
    if (cash > 0) {
        adjustCompanyCash(parent, cash);
        adjustBalanceSheet(parent, { assets: cash, retainedEarnings: cash });
        recordPayment(`specialist:${spec.id}`, parent, cash, 'Wchłonięcie podwykonawcy: przejęcie kasy');
    }
    const stats = parent.constructionStats;
    if (stats) stats.inHouseBonus = Math.min(SUBCONTRACTOR_RULES.inHouseBonusMax, (Number(stats.inHouseBonus) || 0) + spec.bonus * 0.5);
    specialists = specialists.filter(item => item.id !== spec.id);
    logEvent(`🏗️ ${parent.name} wchłania podwykonawcę ${spec.name} do swojej struktury.`, 'company');
}

// ---------------------------------------------------------------------------------
// Co kwartał: zyski, grupy, powstawanie i upadek podwykonawców
// ---------------------------------------------------------------------------------

function processSubcontractorsQuarterly() {
    if (typeof specialists === 'undefined' || !Array.isArray(specialists)) return;
    ensureSubcontractorRegistry();
    const quarter = getSubcontractorQuarter();
    const rules = SUBCONTRACTOR_RULES;

    for (const spec of [...specialists]) {
        const profit = Number(spec.profitQ) || 0;
        spec.profits.push(profit);
        if (spec.profits.length > 4) spec.profits.shift();
        spec.profitQ = 0;
        if (!spec.groupSymbol) continue;

        const parent = stocks.find(stock => getEntityKey(stock) === spec.groupSymbol);
        if (!parent || parent.isBankrupt) { releaseSubcontractorFromGroup(spec, 'matka upadła'); continue; }
        transferSubcontractorProfit(spec, parent, profit);
        if (!spec.busyProjectId && quarter - (Number(spec.groupSince) || quarter) >= rules.absorbAfterQuarters && Math.random() < rules.absorbChance) absorbSubcontractor(spec, parent);
    }

    // Upadek: firmy bez zleceń od 3 lat albo ze złą reputacją; w specjalności zostaje co najmniej minimum.
    for (const spec of [...specialists]) {
        if (spec.busyProjectId || spec.groupSymbol) continue;
        if (getSubcontractorsBySpecialty(spec.specialty).length <= rules.minPerSpecialty) continue;
        const idle = quarter - (Number(spec.lastContractQ) || 0) >= rules.idleQuarters;
        const chance = rules.failChance * (idle ? 3 : 1) * (spec.reputation < 30 ? 2 : 1);
        if (Math.random() < chance) {
            specialists = specialists.filter(item => item.id !== spec.id);
            logEvent(`🏗️ Upada firma podwykonawcza ${spec.name} (${SUBCONTRACTOR_SPECIALTIES[spec.specialty]}).`, 'company');
        }
    }

    // Powstawanie: startupy rzemieślnicze w specjalnościach poniżej maksimum; poniżej minimum zawsze.
    for (const specialty of Object.keys(SUBCONTRACTOR_SPECIALTIES)) {
        const count = getSubcontractorsBySpecialty(specialty).length;
        if (count < rules.minPerSpecialty || (count < rules.maxPerSpecialty && Math.random() < rules.startupChance)) {
            const spec = createSubcontractor(specialty);
            if (count >= rules.minPerSpecialty) logEvent(`🏗️ Nowa firma podwykonawcza: ${spec.name} (${SUBCONTRACTOR_SPECIALTIES[specialty]}).`, 'company');
        }
    }

    if (Math.random() < rules.acquireChance) tryAiVerticalAcquisition();
}
