// crises.js — 0.15.3 „Wielkie Kryzysy”: szoki sektorowe jako stan z czasem trwania (naprawa B5), silnik linii kryzysu
// (Zapowiedź → Wybuch → Zarażanie → Interwencja → Dno → Odbicie), 5 linii historycznych, reakcje banku centralnego i państwa,
// scenariusz na start gry, retrospektywa, Akademia i osiągnięcia. Stan opcjonalny: bez linii gra działa jak w 0.15.2.
'use strict';

// ---------------------------------------------------------------------------------
// W0. Szoki sektorowe (naprawa B5)
// ---------------------------------------------------------------------------------

const SECTOR_PREMIUM_MIN = -0.60;
const SECTOR_PREMIUM_MAX = 1.50;

let sectorShocks = [];   // { id, sector, subsector, target, rampQ, holdQ, fadeQ, startQ, lineId, revenue }
let crisisLine = null;   // { id, stage, stageIdx, qInStage, lens, startQuarter, victims, bankrupted, forced, ... }
let crisisState = createCrisisState();
let nextSectorShockId = 1;

function createCrisisState() {
    return { used: [], history: [], scenario: null, scenarioStartQ: null, lastEventQ: 0, watch: null, signals: 0, spurious: 0, rate: null, recession: 0 };
}

function resetCrises() {
    sectorShocks = [];
    crisisLine = null;
    crisisState = createCrisisState();
}

function crisisSnapshot() {
    return { sectorShocks, crisisLine, crisisState, nextSectorShockId };
}

function applyCrisisSnapshot(snapshot) {
    sectorShocks = Array.isArray(snapshot?.sectorShocks) ? snapshot.sectorShocks : [];
    crisisLine = snapshot?.crisisLine || null;
    crisisState = { ...createCrisisState(), ...(snapshot?.crisisState || {}) };
    nextSectorShockId = Number(snapshot?.nextSectorShockId) || 1;
}

function crisisQuarter() { return Number(macro?.quarter) || 0; }

/** Czas w kwartałach z częścią tygodniową (płynna zmiana premii między kwartałami). */
function crisisTime() {
    const week = Math.min(WEEKS_PER_QUARTER, Math.max(1, Number(playerFund?.calWeek) || 1));
    return crisisQuarter() + (week - 1) / WEEKS_PER_QUARTER;
}

/** Bieżąca wartość premii szoku: narastanie → trwanie → wygasanie liniowe do 0. */
function getSectorShockValue(shock, time = crisisTime()) {
    const t = time - shock.startQ;
    if (t <= 0) return shock.rampQ > 0 ? 0 : shock.target;
    if (t < shock.rampQ) return shock.target * t / shock.rampQ;
    if (t < shock.rampQ + shock.holdQ) return shock.target;
    const fadeT = t - shock.rampQ - shock.holdQ;
    if (fadeT >= shock.fadeQ) return 0;
    return shock.target * (1 - fadeT / shock.fadeQ);
}

function isSectorShockExpired(shock, time = crisisTime()) {
    return time - shock.startQ >= shock.rampQ + shock.holdQ + shock.fadeQ;
}

/** Tworzy szok sektorowy (premia docelowa w ułamku, np. −0,35). Nadpisuje poprzednie wywołanie z tym samym sektorem i linią. */
function addSectorShock(sector, target, options = {}) {
    const shock = {
        id: nextSectorShockId++, sector, subsector: options.subsector || null, target,
        rampQ: Math.max(0, options.rampQ ?? 0), holdQ: Math.max(0, options.holdQ ?? 2), fadeQ: Math.max(0.01, options.fadeQ ?? 1),
        startQ: options.startQ ?? crisisTime(), lineId: options.lineId || null, revenue: options.revenue || 0, country: options.country || null // 0.16.2 G9: premia sektora per kraj (null = Polska)
    };
    sectorShocks.push(shock);
    updateAllSectorPremiums();
    return shock;
}

/** Zgodność z 0.15: applySectorShock(sektor, premia, kwartały) = natychmiastowy szok o zadanym czasie trwania, potem wygasanie. */
function applySectorShock(sector, premiumShock, durationQuarters = 2, options = {}) {
    return addSectorShock(sector, premiumShock, { holdQ: durationQuarters, fadeQ: 1, ...options });
}

/** Premia szoków dla spółki: suma wartości aktywnych szoków × udział segmentu w sektorze (jak bańka). */
function getSectorShockPremium(stock) {
    if (!sectorShocks.length) return 0;
    const time = crisisTime();
    let total = 0;
    for (const shock of sectorShocks) {
        if (shock.country) continue; // szok obcego kraju nie dotyka spółek krajowych
        const share = getCompanyBubbleShare(stock, { sector: shock.sector, subsector: shock.subsector });
        if (share > 0) total += share * getSectorShockValue(shock, time);
    }
    return total;
}

/** Spadek przychodów spółki w kwartale: Σ udział segmentu × przychód linii × (bieżąca premia / premia docelowa). */
function getCrisisRevenueFactor(stock) {
    if (!sectorShocks.length) return 1;
    const time = crisisTime();
    let effect = 0;
    for (const shock of sectorShocks) {
        if (!shock.revenue || !shock.target || shock.country) continue;
        const share = getCompanyBubbleShare(stock, { sector: shock.sector, subsector: shock.subsector });
        if (share > 0) effect += share * shock.revenue * Math.max(0, getSectorShockValue(shock, time) / shock.target);
    }
    return Math.max(0.5, 1 + effect);
}

/** Usuwa wygasłe szoki; wołane co tydzień z pętli kryzysów. */
function pruneSectorShocks() {
    const before = sectorShocks.length;
    const time = crisisTime();
    sectorShocks = sectorShocks.filter(shock => !isSectorShockExpired(shock, time));
    return before - sectorShocks.length;
}

// ---------------------------------------------------------------------------------
// W2. Pięć linii (dane)
// ---------------------------------------------------------------------------------

const CRISIS_STAGES = ['spark', 'burst', 'spread', 'intervention', 'bottom', 'recovery'];
const CRISIS_STAGE_NAMES = { spark: 'Zapowiedź', burst: 'Wybuch', spread: 'Zarażanie', intervention: 'Interwencja', bottom: 'Dno', recovery: 'Odbicie' };
const CRISIS_STAGE_LENGTHS = { spark: [1, 2], burst: [1, 1], spread: [1, 3], intervention: [1, 2], bottom: [1, 2] };
const CRISIS_BASE_CHANCE = 0.01;      // pokrętło 0,5–2% na kwartał
const CRISIS_QUIET_QUARTERS = 12;     // linia najwcześniej po tylu kwartałach bez krachu i linii
const CRISIS_REPLACES_CRASH = 0.40;   // szansa, że wylosowany krach jest linią
const CRISIS_MAX_VICTIMS = 3;

const CRISIS_LINES = {
    banking: {
        id: 'banking', name: 'Kryzys bankowy', icon: '🏦', year: 2008, recoveryQ: [6, 10], shape: 'U',
        spark: { macro: 'housing', news: 'Analitycy ostrzegają: kredyty hipoteczne rosną szybciej niż zarobki, a banki oddają je coraz słabszym klientom.' },
        lose: [
            { sector: 'Bankowość', premium: -0.35, revenue: -0.12 }, { sector: 'Finanse', premium: -0.40, revenue: -0.15 },
            { sector: 'Finanse', subsector: 'Pożyczki konsumenckie', premium: -0.10, revenue: -0.05 },
            { sector: 'Nieruchomości', premium: -0.40, revenue: -0.15 }, { sector: 'Budowlany', premium: -0.35, revenue: -0.18 }
        ],
        gain: [{ sector: 'Żywność', premium: 0.05 }, { sector: 'Medycyna', premium: 0.05 }],
        crash: { drop: [-0.20, -0.30], weeks: 3 }, recession: true, inflation: 0,
        rate: { kind: 'cut', total: [-0.01, -0.02], quarters: 2 }, state: 'bankRescue',
        victims: { sectors: ['Bankowość', 'Finanse', 'Nieruchomości', 'Budowlany'], banks: true },
        news: { burst: 'Bank {victim} wstrzymuje wypłaty. Klienci ustawiają się w kolejkach, kursy banków lecą w dół.', spread: 'Kryzys zaufania rozlewa się: banki przestają pożyczać sobie nawzajem pieniądze.', intervention: 'Rząd i bank centralny ogłaszają pakiet ratunkowy dla banków oraz gwarancje depozytów.', bottom: 'Rynek szuka dna: banki oczyszczają bilanse, ale kredyt wciąż jest drogi.', recovery: 'Sektor finansowy odbudowuje zaufanie. Kredyt wraca, choć wolniej niż po zwykłym spowolnieniu.' },
        eligible: regime => ['bull', 'euphoria', 'distribution'].includes(regime.phase)
    },
    dotcom: {
        id: 'dotcom', name: 'Bańka internetowa', icon: '💻', year: 2000, recoveryQ: [8, 12], shape: 'U',
        spark: { macro: 'techboom', news: 'Spółki technologiczne wyceniane są na wielokrotności przychodów, których jeszcze nie mają. Ostrożni analitycy mówią o bańce.' },
        lose: [
            { sector: 'Technologia', premium: -0.45, revenue: -0.10 }, { sector: 'Technologia', subsector: 'Sztuczna inteligencja', premium: -0.10 },
            { sector: 'Technologia', subsector: 'Półprzewodniki', premium: 0 }, { sector: 'Gaming', premium: -0.40, revenue: -0.08 },
            { sector: 'Media', premium: -0.25 }, { sector: 'Finanse', subsector: 'Fintech', premium: -0.50 }
        ],
        gain: [{ sector: 'Energia', premium: 0.05 }, { sector: 'Żywność', premium: 0.05 }, { sector: 'Dobra konsumpcyjne', premium: 0.05 }],
        crash: { drop: [-0.16, -0.24], weeks: 3 }, recession: false, inflation: 0,
        rate: { kind: 'cut', total: [-0.005, -0.01], quarters: 2 }, state: null,
        victims: { sectors: ['Technologia', 'Gaming', 'Media'], subsectors: [['Finanse', 'Fintech']], banks: false },
        news: { burst: 'Indeks spółek technologicznych traci w tydzień kilkanaście procent. Inwestorzy wycofują się z firm bez zysków.', spread: 'Pękająca bańka zaraża Gaming i Media; startupom brakuje gotówki, a fundusze venture zamykają kurek.', intervention: 'Bank centralny obniża stopy, by złagodzić wyprzedaż akcji.', bottom: 'Technologia znalazła dno: przeżyją spółki z zyskami i gotówką.', recovery: 'Rynek wraca do wartości; technologia odbija wolniej niż reszta.' },
        eligible: regime => ['bull', 'euphoria', 'distribution'].includes(regime.phase) && (activeSectorBubble ? ['Technologia', 'Gaming', 'Finanse'].includes(activeSectorBubble.sector) : regime.premium > 0.1)
    },
    oil: {
        id: 'oil', name: 'Szok naftowy', icon: '🛢️', year: 1973, recoveryQ: [4, 8], shape: 'U',
        spark: { macro: 'oil', news: 'Napięcie na Bliskim Wschodzie: ropa drożeje, a odbiorcy paliw szykują się na wyższe rachunki.' },
        lose: [
            { sector: 'Transport i logistyka', premium: -0.30, revenue: -0.10 }, { sector: 'Transport i logistyka', subsector: 'Lotnictwo', premium: -0.15, revenue: -0.08 },
            { sector: 'Turystyka', premium: -0.35, revenue: -0.12 }, { sector: 'Chemia', premium: -0.25, revenue: -0.08 }, { sector: 'Przemysł', premium: -0.20, revenue: -0.08 }
        ],
        gain: [{ sector: 'Energia', premium: 0.20 }, { sector: 'Energia', subsector: 'OZE', premium: -0.05 }, { sector: 'Obronność', premium: 0.10 }],
        crash: { drop: [-0.08, -0.12], weeks: 2 }, recession: true, inflation: [0.02, 0.04],
        rate: { kind: 'hike', total: [0.01, 0.02], quarters: 2 }, state: 'fuelSubsidy',
        victims: { sectors: ['Transport i logistyka', 'Turystyka'], banks: false },
        news: { burst: 'Embargo naftowe: ropa drożeje o połowę, paliwa i bilety lotnicze drożeją z dnia na dzień.', spread: 'Drogie paliwo uderza w przewoźników, turystykę i przemysł. Inflacja przyspiesza mimo osłabienia gospodarki.', intervention: 'Bank centralny podnosi stopy, by walczyć z inflacją, choć gospodarka jest w recesji. Rząd dopłaca do paliw dla transportu.', bottom: 'Ceny ropy przestają rosnąć; firmy dostosowują się do droższej energii.', recovery: 'Gospodarka uczy się żyć z droższą energią; inflacja powoli słabnie.' },
        eligible: regime => !['bear', 'capitulation'].includes(regime.phase)
    },
    black: {
        id: 'black', name: 'Czarny czwartek', icon: '🖤', year: 1929, recoveryQ: [10, 16], shape: 'L',
        spark: { macro: null, news: 'Komisja nadzoru ostrzega: dźwignia funduszy i pożyczki na zakup akcji sięgają rekordów, a wyceny odleciały od zysków.' },
        lose: [
            { sector: 'Bankowość', premium: -0.30, revenue: -0.10 }, { sector: 'Finanse', premium: -0.25, revenue: -0.10 }, { sector: 'Przemysł', premium: -0.20, revenue: -0.10 },
            { sector: 'Budowlany', premium: -0.20, revenue: -0.10 }, { sector: 'Nieruchomości', premium: -0.20, revenue: -0.08 }
        ],
        gain: [],
        crash: { bottom: [-0.40, -0.60], weeks: 4, floor: -0.60 }, premiumCap: -0.25, recession: true, inflation: 0,
        rate: { kind: 'cut', total: [-0.015, -0.025], quarters: 3, delay: 2 }, state: 'publicWorks',
        victims: { sectors: ['Bankowość', 'Finanse', 'Przemysł', 'Budowlany'], banks: true, extra: 1 },
        news: { burst: 'Czarny czwartek na giełdzie: indeks traci w kilka dni więcej niż przez ostatnie lata. Inwestorzy sprzedają wszystko.', spread: 'Panika po krachu wycofuje depozyty z banków; spółki tracą zamówienia, a kredyt wysycha.', intervention: 'Bank centralny zwlekał z reakcją — dopiero teraz tnie stopy. Rząd ogłasza program robót publicznych.', bottom: 'Gospodarka jest na dnie. Giełda wciąż nie dowierza, że zaczyna się odbicie.', recovery: 'Powolne odbicie: na odbudowę po krachu potrzeba lat, nie kwartałów.' },
        eligible: regime => regime.phase === 'euphoria' && regime.premium > 0.25
    },
    pandemic: {
        id: 'pandemic', name: 'Pandemia', icon: '🦠', year: 2020, recoveryQ: [2, 4], shape: 'V',
        spark: { macro: 'pandemic', news: 'Nowy wirus w wielu krajach naraz: epidemiolodzy ostrzegają przed szybkim rozprzestrzenianiem.' },
        lose: [
            { sector: 'Turystyka', premium: -0.50, revenue: -0.30 }, { sector: 'Usługi', premium: -0.25, revenue: -0.20 },
            { sector: 'Transport i logistyka', subsector: 'Lotnictwo', premium: -0.50, revenue: -0.30 }, { sector: 'Media', premium: -0.30, revenue: -0.10 },
            { sector: 'Nieruchomości', premium: -0.20, revenue: -0.10 }
        ],
        gain: [
            { sector: 'Medycyna', premium: 0.20 }, { sector: 'Medycyna', subsector: 'Biotechnologia', premium: 0.15 }, { sector: 'Medycyna', subsector: 'Sprzęt medyczny', premium: 0.05 },
            { sector: 'Technologia', premium: 0.15 }, { sector: 'Gaming', premium: 0.20 }, { sector: 'Żywność', premium: 0.10 },
            { sector: 'Nieruchomości', subsector: 'Magazyny', premium: 0.35 }
        ],
        crash: { drop: [-0.20, -0.25], weeks: 2 }, recession: true, inflation: 0,
        rate: { kind: 'cut', total: [-0.02, -0.03], quarters: 1, floor: 0.005 }, state: 'relief',
        victims: { sectors: ['Turystyka', 'Usługi'], banks: false },
        news: { burst: 'Lockdown w wielu krajach: turystyka i usługi stają z dnia na dzień, a giełda gwałtownie traci.', spread: 'Restauracje, hotele i linie lotnicze liczą straty; rośnie popyt na leki, internet i gry.', intervention: 'Bank centralny tnie stopy do minimum, rząd ogłasza programy pomocowe dla turystyki i usług.', bottom: 'Obostrzenia powoli znikają; rynek patrzy już poza epidemię.', recovery: 'Szybkie odbicie w kształcie litery V — poza turystyką, która wraca wolniej.' },
        eligible: regime => !['bear', 'capitulation'].includes(regime.phase)
    }
};

const CRISIS_LINE_ORDER = ['banking', 'dotcom', 'oil', 'black', 'pandemic'];

// ---------------------------------------------------------------------------------
// W1. Silnik linii
// ---------------------------------------------------------------------------------

function rangeInt(range) { return getRandomIntInRange(range[0], range[1]); }
function rangeFloat(range) { return range[0] + Math.random() * (range[1] - range[0]); }

function getCrisisStageName(line = crisisLine) {
    return line ? CRISIS_STAGE_NAMES[line.stage] : null;
}

function isCrisisActive() { return Boolean(crisisLine); }

/** Kwartały od ostatniego krachu, linii albo szoku (spokój wymagany przed nową linią). */
function getQuietQuarters() {
    const crashQ = marketCrash?.startQuarter ?? -99;
    return crisisQuarter() - Math.max(crashQ, crisisState.lastEventQ);
}

function getEligibleCrisisLines(regime = getMarketRegime('home')) {
    if (!regime) return [];
    return CRISIS_LINE_ORDER.filter(id => !crisisState.used.includes(id) && CRISIS_LINES[id].eligible(regime));
}

/** Rozpoczyna linię: Zapowiedź (z sygnałem) albo od razu Wybuch (zamiast krachu). */
function startCrisisLine(id, options = {}) {
    const def = CRISIS_LINES[id];
    if (!def || crisisLine || crisisState.pendingImport) return null;
    if (!options.arrived && !options.forced && typeof startForeignOriginCrisis === 'function') { // 0.16.2 G9: ok. 25% linii zaczyna się za granicą
        const pending = startForeignOriginCrisis(id, options);
        if (pending) return pending;
    }
    const lens = {
        spark: options.skipSpark ? 0 : rangeInt(CRISIS_STAGE_LENGTHS.spark), burst: 1, spread: rangeInt(CRISIS_STAGE_LENGTHS.spread),
        intervention: rangeInt(CRISIS_STAGE_LENGTHS.intervention), bottom: rangeInt(CRISIS_STAGE_LENGTHS.bottom), recovery: rangeInt(def.recoveryQ)
    };
    crisisLine = {
        id, stage: 'spark', qInStage: 0, startQuarter: crisisQuarter(), origin: options.origin || 'PL', lens, victims: [], bankrupted: [], rescued: [], forced: Boolean(options.forced),
        gigStart: getGigIndexValue(), gigMin: getGigIndexValue(), fundStart: playerFund ? getFundNav() : 0, trustStart: playerFund?.trust ?? 0,
        positionStart: playerProfile?.positionId || null, techShare: 0, rateStart: Number(centralBank?.baseInterestRate) || 0, fundMin: playerFund ? getFundNav() : 0, positiveStages: 0, stagesSeen: 0
    };
    crisisState.lastEventQ = crisisQuarter();
    if (!crisisState.used.includes(id)) crisisState.used.push(id);
    if (options.skipSpark) enterCrisisStage('burst'); else enterCrisisStage('spark');
    return crisisLine;
}

function crisisHeadline(stage) {
    const def = CRISIS_LINES[crisisLine.id];
    const victim = crisisLine.victims.map(symbol => stocks.find(s => s.symbol === symbol)).find(s => s && s.isBankStock)?.name
        || stocks.find(s => s.symbol === crisisLine.victims[0])?.name || 'jeden z dużych banków';
    const text = (stage === 'spark' ? def.spark.news : def.news[stage])?.replace('{victim}', victim);
    if (!text) return;
    logEvent(`${def.icon} ${CRISIS_STAGE_NAMES[stage]}: ${text}`, 'macro');
    if (typeof pushNews === 'function') pushNews(`${def.icon} ${def.name} — ${CRISIS_STAGE_NAMES[stage]}: ${text}`);
}

function enterCrisisStage(stage) {
    const line = crisisLine, def = CRISIS_LINES[line.id];
    line.stage = stage;
    line.qInStage = 0;
    line.stagesSeen++;
    switch (stage) {
        case 'spark': {
            crisisState.signals++;
            if (def.spark.macro) fireMacroShockById(def.spark.macro, true);
            break;
        }
        case 'burst': {
            line.burstQ = crisisQuarter();
            crisisState.watch = { level: getGigIndexValue(), burstQ: crisisQuarter(), below: false, lineId: line.id };
            line.techShare = typeof getFundSectorGroupShare === 'function' ? getFundSectorGroupShare('tech') : 0;
            line.gigStart = getGigIndexValue();
            line.fundStart = playerFund ? getFundNav() : 0;
            line.gigMin = line.gigStart; line.fundMin = line.fundStart;
            createLineShocks(line, def);
            if (def.crash) {
                const regimePremium = getMarketRegime('home')?.premium || 0;
                const drop = def.crash.bottom ? rangeFloat(def.crash.bottom) - regimePremium : rangeFloat(def.crash.drop); // 1929: dno premii na poziomie −40…−60%
                if (!marketCrash.active) triggerMarketCrash({ theme: def.id, targetDrop: drop, durationWeeks: def.crash.weeks, floor: def.crash.floor });
                else marketCrash.theme = def.id;
            }
            if (def.recession) crisisState.recession = line.lens.spread + line.lens.intervention + 1;
            if (def.inflation) macro.shocks.inflation += Array.isArray(def.inflation) ? rangeFloat(def.inflation) : def.inflation;
            pickCrisisVictims(line, def);
            break;
        }
        case 'spread':
            executeCrisisBankruptcies(line, def, 1);
            break;
        case 'intervention':
            startCrisisReactions(line, def);
            break;
        case 'bottom':
            executeCrisisBankruptcies(line, def, 1);
            if (!line.bankrupted.length && !line.rescued.length) { // plan: 1–3 upadki na linię
                const worst = rankCrisisVictims(line.id)[0]?.stock;
                if (worst) { if (worst.isBankStock && def.state === 'bankRescue' && tryRescueBank(worst, def)) line.rescued.push(worst.symbol); else { bankruptStockInCrisis(worst); line.bankrupted.push(worst.symbol); } }
            }
            break;
        case 'recovery':
            break;
    }
    crisisHeadline(stage);
}

function createLineShocks(line, def) {
    const rampQ = 1 + line.lens.spread;
    const holdQ = line.lens.intervention + line.lens.bottom;
    const fadeQ = line.lens.recovery;
    for (const item of [...def.lose, ...def.gain]) {
        if (!item.premium && !item.revenue) continue;
        const shock = addSectorShock(item.sector, item.premium || 0, { subsector: item.subsector, rampQ, holdQ, fadeQ, lineId: def.id, revenue: item.revenue || 0, startQ: crisisTime() });
        line.shockIds = line.shockIds || [];
        line.shockIds.push(shock.id);
    }
}

/** Wskaźnik wystawienia spółki na linię: udział segmentów w sektorach tracących (0…1). */
function getCrisisExposure(stock, lineId = crisisLine?.id) {
    const def = CRISIS_LINES[lineId];
    if (!def || !stock) return 0;
    let exposure = 0;
    for (const item of def.lose) {
        if (!(item.premium < 0)) continue;
        const share = getCompanyBubbleShare(stock, { sector: item.sector, subsector: item.subsector });
        exposure = Math.max(exposure, share);
    }
    return Math.min(1, exposure);
}

function getCrisisExposureLabel(stock) {
    const exposure = getCrisisExposure(stock);
    return exposure >= 0.6 ? 'wysoki' : exposure >= 0.25 ? 'średni' : 'niski';
}

function getStockLeverage(stock) {
    const sheet = stock.balanceSheet || {};
    return (Number(sheet.liabilities) || 0) / Math.max(1, Number(sheet.assets) || 1);
}

/** Ranking kandydatów na upadek: dźwignia, kondycja i wystawienie na linię (bez spółek Skarbu Państwa). */
function rankCrisisVictims(lineId) {
    const candidates = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.isStateOwned && s.balanceSheet && getCrisisExposure(s, lineId) > 0.3);
    return candidates
        .map(stock => ({ stock, score: 0.5 * Math.min(1.5, getStockLeverage(stock)) + 0.3 * Math.max(0, Math.min(1, -(Number(stock.financialHealth) || 0) / 5)) + 0.2 * getCrisisExposure(stock, lineId) }))
        .sort((a, b) => b.score - a.score);
}

function pickCrisisVictims(line, def) {
    const ranked = rankCrisisVictims(line.id);
    const count = getRandomIntInRange(1, CRISIS_MAX_VICTIMS);
    const top = ranked.slice(0, Math.max(count + 2, Math.ceil(ranked.length * 0.25)));
    const chosen = [];
    while (chosen.length < count && top.length) chosen.push(top.splice(Math.floor(Math.random() * Math.min(top.length, count + 2)), 1)[0].stock);
    if (def.victims.banks) { // bank o najwyższej dźwigni traci płynność
        const bank = ranked.filter(r => r.stock.isBankStock || getMainSector(r.stock) === 'Bankowość').find(r => !chosen.includes(r.stock));
        if (bank && !chosen.includes(bank.stock)) chosen.unshift(bank.stock);
    }
    line.victims = chosen.slice(0, CRISIS_MAX_VICTIMS).map(s => s.symbol);
    for (const symbol of line.victims) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) stock.financialHealth = Math.min(Number(stock.financialHealth) || 0, -3.5); // sygnał widoczny w kondycji spółki
    }
}

/** Upadłość przez istniejącą ścieżkę (usunięcie z gry); spółki Skarbu Państwa dostają ratunek zamiast upadku. */
function bankruptStockInCrisis(stock) {
    noteGenealogy('bankrupt', null, stock);
    logEvent(`🔥 BANKRUCTWO! Spółka ${stock.name} (${stock.symbol}) ogłasza upadłość w czasie kryzysu!`, 'review');
    if (typeof onAcademyEvent === 'function') onAcademyEvent('bankruptcy', stock);
    if (typeof onCooperationPartnerShock === 'function') onCooperationPartnerShock(stock, COOP_BANKRUPTCY_SHOCK, 'bankructwo');
    removeStockFromGame(stock.symbol);
    stock.isBankrupt = true;
    stock.timeOfDeath = Date.now();
}

function executeCrisisBankruptcies(line, def, maxCount) {
    let done = 0;
    for (const symbol of [...line.victims]) {
        if (done >= maxCount) break;
        const stock = stocks.find(s => s.symbol === symbol);
        line.victims = line.victims.filter(s => s !== symbol);
        if (!stock || stock.isBankrupt) continue;
        if (stock.isStateOwned || (def.state === 'bankRescue' && stock.isBankStock && tryRescueBank(stock, def))) { line.rescued.push(symbol); continue; }
        if (Math.random() < 0.85) { bankruptStockInCrisis(stock); line.bankrupted.push(symbol); done++; }
    }
}

/** Ratunek banku z budżetu państwa (dokapitalizowanie), gdy skarb pozwala; inaczej bank upada. */
function tryRescueBank(stock, def) {
    const sheet = stock.balanceSheet;
    const cost = Math.max(0, (Number(sheet.liabilities) || 0) - (Number(sheet.assets) || 0)) + getMarketCapValue(stock) * 0.10;
    if (!(cost > 0) || governmentTreasury < cost) return false;
    governmentTreasury -= cost;
    adjustCompanyCash(stock, cost);
    adjustBalanceSheet(stock, { assets: cost, retainedEarnings: cost });
    recordPayment('external:skarb-panstwa', stock, cost, 'Dokapitalizowanie banku w kryzysie');
    stock.financialHealth = Math.max(Number(stock.financialHealth) || 0, -1);
    logEvent(`🏛️ Państwo dokapitalizowuje bank ${stock.name} (${formatZl(cost, 0)}) zamiast dopuścić do upadku.`, 'macro');
    return true;
}

// --- sygnały: małe szoki makro ---

function fireMacroShockById(id, asSignal) {
    const event = MACRO_SHOCK_EVENTS.find(e => e.id === id);
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

/** Zwykły szok makro tego samego typu co iskra linii = sygnał bez linii (fałszywy alarm); licznik do pomiaru. */
function noteMacroShockForCrises(event) {
    if (['oil', 'pandemic', 'housing', 'techboom'].includes(event.id)) crisisState.spurious++;
}

/** Podsumowanie do przebiegów symulacyjnych (tests/przebiegi.html). */
function crisisSummary() {
    return { history: crisisState.history, used: crisisState.used, signals: crisisState.signals, spurious: crisisState.spurious, active: crisisLine ? { id: crisisLine.id, stage: crisisLine.stage } : null, shocks: sectorShocks.length };
}

// --- reakcje banku centralnego i państwa (W3) ---

function startCrisisReactions(line, def) {
    const rate = def.rate;
    if (rate) {
        const total = rangeFloat(rate.total);
        crisisState.rate = { lineId: def.id, perQuarter: total / rate.quarters, quartersLeft: rate.quarters, delay: rate.delay || 0, floor: rate.floor ?? 0.005, total: 0, kind: rate.kind };
    }
    const handlers = { fuelSubsidy: () => crisisSubsidy(['Transport i logistyka'], 0.03, 'Dopłaty do paliw'), publicWorks: () => crisisSubsidy(['Budowlany'], 0.03, 'Program robót publicznych'),
        relief: () => crisisSubsidy(['Turystyka', 'Usługi'], 0.03, 'Program pomocowy'), bankRescue: () => rescueDistressedBanks() };
    if (def.state && handlers[def.state]) handlers[def.state]();
    if (typeof addMail === 'function') addMail({
        sender: 'NBP', subject: `${def.icon} ${def.name}: reakcja państwa i banku centralnego`,
        body: `Etap „Interwencja”. Bank centralny ${rate ? (rate.kind === 'hike' ? 'podnosi stopy mimo recesji (walka z inflacją)' : rate.delay ? `po zwłoce ${rate.delay} kw. obniża stopy` : 'obniża stopy') : 'utrzymuje stopy'}; państwo uruchamia pomoc dla dotkniętych sektorów.`,
        importance: 2
    });
}

function rescueDistressedBanks() {
    for (const stock of stocks) {
        if (stock.isBankStock && !stock.isBankrupt && !stock.isStateOwned && (Number(stock.financialHealth) || 0) <= -3 && crisisLine.victims.includes(stock.symbol)) {
            if (tryRescueBank(stock, CRISIS_LINES.banking)) { crisisLine.rescued.push(stock.symbol); crisisLine.victims = crisisLine.victims.filter(s => s !== stock.symbol); }
        }
    }
}

/** Dopłaty z budżetu dla dotkniętych sektorów: gotówka spółek ze skarbu (skarb może wejść w deficyt). */
function crisisSubsidy(sectors, pctOfCap, label) {
    let total = 0;
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt || !stock.balanceSheet) continue;
        if (!sectors.some(sector => getCompanyBubbleShare(stock, { sector }) > 0.3)) continue;
        const amount = getMarketCapValue(stock) * pctOfCap * getCompanyBubbleShare(stock, { sector: sectors.find(s => getCompanyBubbleShare(stock, { sector: s }) > 0.3) });
        if (!(amount > 0)) continue;
        governmentTreasury -= amount;
        adjustCompanyCash(stock, amount);
        adjustBalanceSheet(stock, { assets: amount, retainedEarnings: amount });
        recordPayment('external:skarb-panstwa', stock, amount, label);
        total += amount;
    }
    if (total > 0) logEvent(`🏛️ ${label}: państwo przekazuje ${formatZl(total, 0)} spółkom z dotkniętych sektorów (skarb ${formatZl(governmentTreasury, 0)}).`, 'macro');
    return total;
}

/** Wołane z runCentralBankMeeting: wymuszona zmiana stopy w czasie interwencji linii (albo null). */
function getCrisisRateChange() {
    const policy = crisisState.rate;
    if (!policy || policy.quartersLeft <= 0) return null;
    if (policy.delay > 0) { policy.delay--; return 0; } // zwłoka (1929): bank centralny nie reaguje
    policy.quartersLeft--;
    const before = Number(centralBank.baseInterestRate) || 0.05;
    const next = policy.kind === 'hike' ? before + policy.perQuarter : Math.max(policy.floor, before + policy.perQuarter);
    policy.total += next - before;
    if (policy.quartersLeft <= 0) { crisisState.lastRate = { ...policy }; crisisState.rate = null; }
    return next - before;
}

/** Wołane z advanceEconomyCycle: linie wymuszają Recesję na czas Zarażania i Interwencji. */
function crisisForcesRecession() {
    if (crisisState.recession > 0) { crisisState.recession--; return true; }
    return false;
}

// --- pętla kwartalna i tygodniowa ---

function nextCrisisStage(line) {
    const index = CRISIS_STAGES.indexOf(line.stage);
    return CRISIS_STAGES[index + 1] || null;
}

function stageLength(line, stage) {
    return stage === 'recovery' ? line.lens.recovery : line.lens[stage];
}

/** Co tydzień: aktualizacja premii (płynna zmiana szoków), sprzątanie wygasłych, minimum GIG i funduszu w linii. */
function processCrisesWeekly() {
    if (sectorShocks.length) { pruneSectorShocks(); updateAllSectorPremiums(); }
    const watch = crisisState.watch;
    if (watch) { // czas do odzyskania poziomu GIG sprzed Wybuchu
        const gig = getGigIndexValue();
        if (gig < watch.level * 0.95) watch.below = true;
        if (watch.below && gig >= watch.level) {
            const quarters = crisisQuarter() - watch.burstQ;
            const entry = crisisState.history.find(h => h.id === watch.lineId && h.burstQ === watch.burstQ);
            if (entry) entry.quartersToRecover = quarters; else if (crisisLine) crisisLine.recoverQ = quarters;
            crisisState.watch = null;
        } else if (crisisQuarter() - watch.burstQ > 60) crisisState.watch = null;
    }
    if (crisisLine) {
        sectorBubbleCooldown = Math.max(sectorBubbleCooldown, 2); // w linii nie startuje nowa bańka
        const cap = CRISIS_LINES[crisisLine.id].premiumCap;
        const regime = getMarketRegime('home');
        if (cap && regime && ['intervention', 'bottom', 'recovery'].includes(crisisLine.stage) && !marketCrash.active) { // kształt L: wolny powrót premii rynku
            const progress = crisisLine.stage === 'recovery' ? Math.min(1, (crisisLine.qInStage + 0.5) / crisisLine.lens.recovery) : 0;
            regime.premiumTarget = Math.min(regime.premiumTarget, cap * (1 - progress));
        }
        crisisLine.gigMin = Math.min(crisisLine.gigMin, getGigIndexValue());
        if (playerFund) crisisLine.fundMin = Math.min(crisisLine.fundMin, getFundNav());
    }
}

/** Co kwartał: przejścia etapów, nowa linia (po spokoju), scenariusz startowy. */
function processCrisesQuarterly() {
    const q = crisisQuarter();
    if (typeof processImportedCrisis === 'function' && processImportedCrisis()) return; // 0.16.2 G9: linia z zagranicy dociera do Polski
    if (crisisLine) {
        const line = crisisLine;
        line.qInStage++;
        if (line.stage === 'bottom' || line.stage === 'spread' || line.stage === 'intervention') { if (line.victims.length && Math.random() < 0.5) executeCrisisBankruptcies(line, CRISIS_LINES[line.id], 1); }
        if (playerFund && getFundNav() > line.fundStart * 0.0) { /* wynik funduszu liczony w retrospektywie */ }
        if (line.qInStage >= stageLength(line, line.stage)) {
            const next = nextCrisisStage(line);
            if (next) enterCrisisStage(next); else finishCrisisLine();
        }
        return;
    }
    if (crisisState.scenario && crisisState.scenarioStartQ !== null && q >= crisisState.scenarioStartQ) {
        const id = crisisState.scenario;
        crisisState.scenario = null; crisisState.scenarioStartQ = null;
        startCrisisLine(id, { forced: true });
        return;
    }
    if (getQuietQuarters() >= CRISIS_QUIET_QUARTERS && !marketCrash?.active && Math.random() < CRISIS_BASE_CHANCE) {
        const eligible = getEligibleCrisisLines();
        if (eligible.length) startCrisisLine(getRandomElement(eligible));
    }
}

/** Z checkMarketCrashQuarterly: 40% wylosowanych krachów jest linią (bez Zapowiedzi). Zwraca true, gdy linia zastąpiła krach. */
function maybeReplaceCrashWithCrisisLine() {
    if (crisisLine || crisisState.pendingImport || Math.random() >= CRISIS_REPLACES_CRASH) return false;
    const eligible = getEligibleCrisisLines();
    if (!eligible.length) return false;
    return Boolean(startCrisisLine(getRandomElement(eligible), { skipSpark: true }));
}

function finishCrisisLine() {
    const line = crisisLine, def = CRISIS_LINES[line.id];
    const gigNow = getGigIndexValue();
    const fundNow = playerFund ? getFundNav() : 0;
    const gigDrop = line.gigStart > 0 ? line.gigMin / line.gigStart - 1 : 0;
    const gigChange = line.gigStart > 0 ? gigNow / line.gigStart - 1 : 0;
    const fundChange = line.fundStart > 0 ? fundNow / line.fundStart - 1 : 0;
    const result = { id: line.id, startQ: line.startQuarter, endQ: crisisQuarter(), burstQ: line.burstQ, gigDrop, gigChange, fundChange, bankrupted: [...line.bankrupted], rescued: [...line.rescued], techShare: line.techShare, trust: playerFund?.trust ?? 0, forced: line.forced, quartersToRecover: line.recoverQ ?? null };
    crisisState.history.push(result);
    crisisState.lastEventQ = crisisQuarter();
    if (typeof addMail === 'function') {
        const names = [...line.bankrupted, ...line.rescued].map(symbol => symbol).join(', ');
        addMail({
            sender: 'Redakcja PULS', subject: `${def.icon} Retrospektywa: ${def.name}`,
            body: `${def.name} dobiegła końca (${formatQuarterDate(line.startQuarter)} – ${formatQuarterDate(crisisQuarter())}). GIG spadł od szczytu o ${(Math.abs(gigDrop) * 100).toFixed(0)}%, a w całej linii zmienił się o ${(gigChange * 100).toFixed(0)}%. Twój fundusz: ${(fundChange * 100).toFixed(0)}% (zaufanie ${Math.round(playerFund?.trust ?? 0)}). Upadłości: ${line.bankrupted.length}${line.rescued.length ? `, ratunki państwa: ${line.rescued.length}` : ''}${names ? ` (${names})` : ''}. Wzór historyczny: ${def.year}. Zobacz hasło Akademii „${def.name}”.`,
            importance: 2
        });
    }
    logEvent(`${def.icon} ${def.name} dobiegła końca. Rynek wraca do normy.`, 'macro');
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry(`kryzys_${def.id}`);
    checkCrisisAchievements(result, line);
    crisisLine = null;
}

function checkCrisisAchievements(result, line) {
    if (!playerProfile || typeof unlockAchievement !== 'function') return;
    const gigVsFund = result.fundChange >= result.gigChange;
    if (line.id === 'banking' && result.trust >= 30 && gigVsFund) unlockAchievement('crisis_banking');
    if (line.id === 'dotcom' && result.techShare <= 0.10) unlockAchievement('crisis_dotcom');
    if (line.id === 'oil' && result.fundChange >= result.gigChange + 0.05) unlockAchievement('crisis_oil');
    const rank = id => CAREER_POSITIONS.findIndex(p => p.id === id);
    if (line.id === 'black' && rank(playerProfile.positionId) >= rank(line.positionStart)) unlockAchievement('crisis_black'); // bez utraty stanowiska
    if (line.id === 'pandemic' && result.fundChange > 0) unlockAchievement('crisis_pandemic');
    if (CRISIS_LINE_ORDER.every(id => crisisState.history.some(h => h.id === id))) unlockAchievement('crisis_collector');
}

// ---------------------------------------------------------------------------------
// W4. Scenariusz na start gry
// ---------------------------------------------------------------------------------

function setCrisisScenario(lineId) {
    if (!CRISIS_LINES[lineId]) { crisisState.scenario = null; crisisState.scenarioStartQ = null; return false; }
    crisisState.scenario = lineId;
    crisisState.scenarioStartQ = getRandomIntInRange(5, 16); // 2.–4. rok gry
    if (playerProfile) {
        playerProfile.scenario = lineId;
        playerProfile.cv.push({ type: 'scenario', text: `Scenariusz: ${CRISIS_LINES[lineId].name}` });
    }
    return true;
}

// ---------------------------------------------------------------------------------
// Akademia i osiągnięcia (W6)
// ---------------------------------------------------------------------------------

if (typeof ACADEMY_ENTRIES === 'object') {
    const quiz = (q, a) => ({ q, a, c: 0 });
    Object.assign(ACADEMY_ENTRIES, {
        kryzys_banking: { title: 'Kryzys bankowy (2008)', icon: '🏦', text: 'W 2008 roku pękła bańka na rynku nieruchomości w USA. Banki, które udzielały kredytów hipotecznych słabym kredytobiorcom i sprzedawały je dalej w pakietach, straciły płynność. Upadł bank Lehman Brothers, a rządy i banki centralne uratowały inne duże banki dokapitalizowaniem i niskimi stopami. Skutek: głęboka recesja, wolne odbicie w kształcie litery U. W grze tracą banki, finanse, nieruchomości i budownictwo; zyskują sektory defensywne.', example: () => 'Najwyższa dźwignia decyduje, kto upada: sprawdź zobowiązania do aktywów w karcie spółki.', quiz: [quiz('Kto najbardziej traci w kryzysie bankowym?', ['Banki, nieruchomości, budownictwo', 'Żywność', 'Medycyna']), quiz('Kto ratował banki w 2008 roku?', ['Państwo i bank centralny', 'Klienci', 'Nikt']), quiz('Jaki kształt miało odbicie?', ['U — powolne', 'V — szybkie', 'Brak odbicia'])] },
        kryzys_dotcom: { title: 'Bańka internetowa (2000)', icon: '💻', text: 'W latach 90. wyceny spółek internetowych rosły wykładniczo, choć wiele z nich nie miało zysków. Wiosną 2000 roku bańka pękła: indeks Nasdaq stracił ponad połowę wartości. Przetrwały spółki z prawdziwym biznesem i gotówką. W grze po pęknięciu bańki tracą technologia, gaming, media i fintech; inwestorzy uciekają do spółek wartościowych.', example: () => 'Sprawdź, jaka część aktywów funduszu leży w technologii, zanim bańka pęknie.', quiz: [quiz('Co odróżniało spółki, które przetrwały?', ['Zyski i gotówka', 'Głośna reklama', 'Nazwa']), quiz('Dokąd uciekali inwestorzy?', ['Do spółek wartościowych', 'Do bańki', 'Do startupów']), quiz('Co to rotacja do wartości?', ['Przenoszenie kapitału do spółek z zyskami', 'Zakup walut', 'Spekulacja'])] },
        kryzys_oil: { title: 'Szok naftowy (1973)', icon: '🛢️', text: 'W 1973 roku kraje arabskie ogłosiły embargo naftowe, a cena ropy poczwórnie wzrosła. Gospodarki Zachodu zwolniły, a inflacja przyspieszyła jednocześnie — to stagflacja. Banki centralne podnosiły stopy mimo recesji. Tracili przewoźnicy, turystyka i przemysł, zyskiwali producenci energii.', example: () => 'W grze podwyżka stóp w recesji to właśnie stagflacja: wyceny spadają mimo „drogiego” pieniądza.', quiz: [quiz('Czym jest stagflacja?', ['Wysoka inflacja przy słabej gospodarce', 'Niska inflacja i wzrost', 'Deflacja']), quiz('Kto zyskuje na drogiej ropie?', ['Producenci energii', 'Linie lotnicze', 'Turystyka']), quiz('Co robi bank centralny w stagflacji?', ['Walczy z inflacją podwyżkami', 'Tnie stopy', 'Nic'])] },
        kryzys_black: { title: 'Czarny czwartek (1929)', icon: '🖤', text: 'W październiku 1929 roku giełda w Nowym Jorku załamała się po latach euforii i zakupów na kredyt. Banki padały, a bank centralny zbyt długo zwlekał z pomocą. Skutkiem była Wielka Depresja: odbicie trwało lata, a rynek odzyskał szczyt dopiero po ćwierć wieku. W grze to najgłębszy i najdłuższy kryzys.', example: () => 'Zwłoka banku centralnego (2 kwartały bez cięć) pogłębia kryzys — zjawisko znane z 1929 roku.', quiz: [quiz('Co poprzedziło krach 1929?', ['Euforia i zakupy na kredyt', 'Niskie ceny', 'Recesja']), quiz('Jaki błąd popełnił bank centralny?', ['Zwlekał z cięciem stóp', 'Obniżył je za szybko', 'Podniósł podatki']), quiz('Jak długo trwało odbicie?', ['Bardzo długo — lata', 'Kilka tygodni', 'Nie było'])] },
        kryzys_pandemic: { title: 'Pandemia (2020)', icon: '🦠', text: 'W marcu 2020 roku epidemia COVID-19 zatrzymała turystykę i usługi. Giełdy spadły o kilkadziesiąt procent w kilka tygodni, ale banki centralne obniżyły stopy do minimum, a rządy ogłosiły programy pomocowe. Odbicie było szybkie (kształt V); zyskały medycyna, technologia i gry.', example: () => 'W grze sektory tracące i zyskujące w pandemii są odwrotne — dywersyfikacja chroni portfel.', quiz: [quiz('Kto zyskuje w pandemii?', ['Medycyna, technologia, gry', 'Turystyka', 'Linie lotnicze']), quiz('Jakie było odbicie?', ['Szybkie, w kształcie V', 'Powolne', 'Brak']), quiz('Co zrobiły banki centralne?', ['Obniżyły stopy do minimum', 'Podniosły stopy', 'Zamknęły rynek'])] },
        stagflacja: { title: 'Stagflacja', icon: '📉', text: 'Stagflacja to połączenie wysokiej inflacji, słabego wzrostu i bezrobocia. Bank centralny staje przed dylematem: podwyżki stóp hamują inflację, ale pogłębiają recesję. Akcje tracą podwójnie: zyski spółek maleją, a wyższe stopy obniżają wyceny.', example: () => 'Stagflację wywołuje w grze szok naftowy: stopy rosną w recesji.', quiz: [quiz('Czym jest stagflacja?', ['Inflacja przy braku wzrostu', 'Deflacja', 'Boom']), quiz('Dlaczego akcje tracą podwójnie?', ['Spadają zyski i rosną stopy', 'Rosną zyski', 'Nie tracą']), quiz('Jaki dylemat ma bank centralny?', ['Inflacja kontra recesja', 'Brak', 'Podatki'])] },
        ksztalty_odbicia: { title: 'Kształty odbicia: V, U, L', icon: '〰️', text: 'Odbicie po kryzysie może mieć kształt V (szybki powrót, np. pandemia), U (dłuższe dno, np. kryzys bankowy) lub L (długa stagnacja, np. Wielki Kryzys). Kształt zależy od przyczyny: kryzysy z zewnątrz są zwykle krótkie, a kryzysy zadłużenia i zaufania długie.', example: () => 'Kryzys pandemii w grze to V, bankowy to U, a Czarny czwartek — L.', quiz: [quiz('Który kryzys miał odbicie V?', ['Pandemia', 'Czarny czwartek', 'Bankowy']), quiz('Które odbicie jest najdłuższe?', ['L', 'V', 'U']), quiz('Od czego zależy kształt?', ['Od przyczyny kryzysu', 'Od pogody', 'Od przypadku'])] },
        ratowanie_bankow: { title: 'Ratowanie banków i pokusa nadużycia', icon: '🛟', text: 'Gdy bank jest zbyt ważny, by upaść, państwo może go uratować. To chroni gospodarkę, ale rodzi pokusę nadużycia: banki liczą na ratunek i podejmują większe ryzyko. Dlatego pomoc zwykle ma warunki, a rządy wolą nacjonalizację lub dokapitalizowanie niż darowiznę.', example: () => 'W grze ratunek banku kosztuje skarb państwa — a gdy skarb jest pusty, bank upada.', quiz: [quiz('Czym jest pokusa nadużycia?', ['Większe ryzyko w nadziei na ratunek', 'Kara', 'Podatek']), quiz('Kto płaci za ratunek banku?', ['Państwo (podatnicy)', 'Nikt', 'Klienci banku']), quiz('Co ogranicza pokusę nadużycia?', ['Warunki pomocy', 'Brak regulacji', 'Premie'])] }
    });
}

if (typeof ACHIEVEMENTS === 'object') {
    const entries = {
        crisis_banking: ['🏦', 'Przetrwałem kryzys bankowy', 'Zakończ Kryzys bankowy z zaufaniem ≥ 30 i funduszem nie gorszym od GIG.'],
        crisis_dotcom: ['💻', 'Bańka mnie nie dopadła', 'W Wybuchu bańki internetowej miej ≤ 10% aktywów w Technologii.'],
        crisis_oil: ['🛢️', 'Stagflacja? Nie tym razem', 'W szoku naftowym wynik funduszu ≥ GIG + 5 pp.'],
        crisis_black: ['🖤', 'Wielki Kryzys w portfelu', 'Przetrwaj Czarny czwartek bez utraty stanowiska.'],
        crisis_pandemic: ['🦠', 'Lockdown na plusie', 'Zakończ pandemię z dodatnim wynikiem funduszu.'],
        crisis_collector: ['🗂️', 'Kolekcjoner kryzysów', 'Przeżyj wszystkie 5 linii kryzysu.']
    };
    for (const [id, [icon, title, desc]] of Object.entries(entries)) ACHIEVEMENTS[id] = { id, icon, title, desc, xp: id === 'crisis_collector' ? 300 : 200, hidden: false, check: () => false };
}

// ---------------------------------------------------------------------------------
// W5. Interfejs: sekcja „Kryzys” w oknie „Rynek”
// ---------------------------------------------------------------------------------

function renderCrisisCountries() {
    if (typeof getContagionSummary !== 'function') return '';
    const sum = getContagionSummary();
    if (!sum.countries.length && !sum.pending) return '';
    const pending = sum.pending ? `<p class="text-sm" role="status"><strong>${escapeHtml(sum.pending.line)}</strong> wybuchła w kraju ${escapeHtml(sum.pending.countryName || sum.pending.origin)} i dotrze do Polski ${sum.pending.delayLeft ? `za ${sum.pending.delayLeft} kw.` : 'w tym kwartale'}.</p>` : '';
    const origin = sum.origin && sum.origin !== 'PL' ? `<p class="text-sm">Linia przyszła z kraju ${escapeHtml(COUNTRY_DEFS[sum.origin]?.name || sum.origin)}${sum.delayQ ? ` z opóźnieniem ${sum.delayQ} kw.` : ' bez opóźnienia'}.</p>` : '';
    const rows = sum.countries.map(c => `<tr><td>${flagIcon(c.id, 12)} ${escapeHtml(c.name)}</td><td class="text-right">${formatNumberPl(c.link * 100, 0)}%</td><td class="text-right">${c.premium > 0 ? '▲ +' : c.premium < 0 ? '▼ ' : '■ '}${formatNumberPl(c.premium * 100, 0)}%</td><td>${c.cap === null ? 'brak ograniczenia' : `cel premii ≤ ${formatNumberPl(c.cap * 100, 0)}%`}</td></tr>`).join('');
    return `<div><h4 class="bank-section-title">Zarażanie między krajami</h4>${pending}${origin}${rows ? `<table class="asset-mini-table w-full"><thead><tr><th>Kraj</th><th class="text-right">Powiązanie</th><th class="text-right">Premia rynku</th><th>Stan</th></tr></thead><tbody>${rows}</tbody></table>` : ''}<p class="text-sm text-muted">Kryzys z jednego kraju dochodzi do innych z opóźnieniem 0–2 kw. Siła zależy od powiązania krajów i od tego, czy dany sektor jest w linii.</p></div>`;
}

function renderCrisisSectionBase() {
    const stateRows = (items, sign) => items.filter(i => i.premium).map(i => `<li>${escapeHtml(i.subsector ? `${i.sector} / ${i.subsector}` : i.sector)} <strong class="${sign < 0 ? 'text-down' : 'text-up'}">${i.premium > 0 ? '+' : ''}${Math.round(i.premium * 100)}%</strong> <span class="text-muted">${sign < 0 ? 'traci' : 'zyskuje'}</span></li>`).join('');
    if (!crisisLine) {
        const last = crisisState.history[crisisState.history.length - 1];
        return `<div><h4 class="bank-section-title">Kryzys</h4><p class="text-muted">${last ? `Ostatnia linia: ${CRISIS_LINES[last.id].icon} ${CRISIS_LINES[last.id].name} (${formatQuarterDate(last.startQ)}). ` : ''}Rynek jest w normalnym cyklu — kryzys nie trwa.${crisisState.scenario ? ` Scenariusz: ${CRISIS_LINES[crisisState.scenario].name} (start w ${formatQuarterDate(crisisState.scenarioStartQ)}).` : ''}</p></div>`;
    }
    const def = CRISIS_LINES[crisisLine.id];
    const axis = CRISIS_STAGES.map(stage => `<li class="${stage === crisisLine.stage ? 'current' : ''}" ${stage === crisisLine.stage ? 'aria-current="step"' : ''}>${CRISIS_STAGE_NAMES[stage]}${stage === crisisLine.stage ? ' (teraz)' : ''}</li>`).join('');
    const reaction = crisisState.rate ? `Bank centralny: ${crisisState.rate.kind === 'hike' ? 'podwyżki' : 'cięcia'} stóp w toku.` : (crisisState.lastRate ? `Bank centralny zmienił stopy łącznie o ${(crisisState.lastRate.total * 100).toFixed(1)} pp.` : 'Reakcja banku centralnego jeszcze nie ruszyła.');
    return `<div><h4 class="bank-section-title">Kryzys: ${def.icon} ${escapeHtml(def.name)}</h4>
        <ol class="phase-history" aria-label="Etapy kryzysu">${axis}</ol>
        <div class="market-grid"><ul class="list-plain">${stateRows(def.lose, -1)}</ul><ul class="list-plain">${stateRows(def.gain, 1)}</ul></div>
        <p class="text-sm">${escapeHtml(reaction)} Upadłości: ${crisisLine.bankrupted.length}, ratunki państwa: ${crisisLine.rescued.length}.</p></div>`;
}

function renderCrisisSection() { return renderCrisisSectionBase() + renderCrisisCountries(); } // 0.16.2 G9: sekcja „Kryzys” z krajami i opóźnieniem zarażenia
