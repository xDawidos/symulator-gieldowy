// listings.js — 0.15.6 „Giełdy wejścia”: wymogi wejścia i utrzymania na GPW, rynek NewHorizons (NH, państwowy operator)
// i giełda prywatna (PRV). Rynki NH i PRV są wpisane w MARKET_OPERATOR_DEFS (finance.js, flaga `entry`), nie mają spółki-operatora,
// nie liczą się do limitu spółek krajowych (GPW), ale liczą się do łącznego sufitu (LISTING_TOTAL_CAP).
// Stan spółki (pola opcjonalne, zapis v15): market, marketSinceQ, belowReqQ. Progi z diagnozy plany/raporty/diagnoza_0.15.6.md.

const LISTING_REQUIREMENTS = {
    GPW: { cap: 100000, freeFloat: 0.30, profit: true },
    NH:  { cap: 24000, freeFloat: 0.20, profit: true, innovativeExempt: true },
    PRV: { cap: 5000,  freeFloat: 0.10, profit: false }
};
const LISTING_INNOVATIVE_SECTORS = ['Technologia', 'Medycyna', 'Badania', 'Gaming'];
const LISTING_MULT_FROM = 100;          // spółek krajowych: do tylu mnożnik wymogów GPW = 1,0
const LISTING_MULT_TO = 125;            // …a od tylu = LISTING_MULT_MAX (liniowo pomiędzy)
const LISTING_MULT_MAX = 1.5;
const LISTING_RETAIN_FACTOR = 0.5;      // utrzymanie na GPW: kapitalizacja ≥ 50% wymogu wejścia (z mnożnikiem)
const LISTING_BELOW_QUARTERS = 4;       // tyle kwartałów poniżej wymogu przed zejściem na NH
const LISTING_DEMOTE_PER_QUARTER = 2;   // najwyżej tyle zejść na kwartał (bez nagłego odpływu z GPW)
const LISTING_DEMOTE_PRICE_EFFECT = -0.05;
const NH_CAPACITY = 40;                 // spółek na NH (bez startupów)

/** Mnożnik wymogów GPW: 1,0 do 100 spółek krajowych, liniowo do 1,5 przy ≥ 125. */
function getListingRequirementMultiplier() {
    const domestic = typeof getListedCompanyCount === 'function' ? getListedCompanyCount() : 0;
    return 1 + (LISTING_MULT_MAX - 1) * Math.max(0, Math.min(1, (domestic - LISTING_MULT_FROM) / (LISTING_MULT_TO - LISTING_MULT_FROM)));
}

/** Wymogi wejścia na rynek (GPW z mnożnikiem; NH i PRV stałe). */
function getListingRequirements(marketId) {
    const base = LISTING_REQUIREMENTS[marketId] || LISTING_REQUIREMENTS.PRV;
    const mult = marketId === 'GPW' ? getListingRequirementMultiplier() : 1;
    return { ...base, cap: base.cap * mult, freeFloat: Math.min(0.5, base.freeFloat * mult), mult };
}

function isInnovativeCompany(stock) {
    return (stock?.sector || []).some(sector => LISTING_INNOVATIVE_SECTORS.includes(sector));
}

/** Czy spółka spełnia wymogi wejścia na rynek; `failed` wymienia niespełnione (cap, freeFloat, profit). Debiut startupu nie ma historii zysków (profit pomijany). */
function meetsListingRequirements(stock, marketId, { debut = false } = {}) {
    const req = getListingRequirements(marketId);
    const failed = [];
    if (getMarketCapValue(stock) < req.cap) failed.push('cap');
    const total = Math.max(1, Number(stock.totalShares) || 0);
    if (typeof getFreeFloatShares === 'function' && getFreeFloatShares(stock) / total < req.freeFloat) failed.push('freeFloat');
    if (req.profit && !(req.innovativeExempt && isInnovativeCompany(stock)) && !debut && (Number(stock.quarterlyEarnings) || 0) <= 0) failed.push('profit');
    return { ok: failed.length === 0, failed, req };
}

function getEntryMarketCount(marketId) {
    return stocks.filter(s => getStockMarket(s) === marketId && !s.isBankrupt && !s.assetType).length;
}

function hasEntryMarketSlot(marketId) {
    const capacity = marketId === 'NH' ? NH_CAPACITY : marketId === 'PRV' ? Math.max(3, Math.floor(PRV_SHARE_CAP * getTotalCompanyCount())) : Infinity;
    return getEntryMarketCount(marketId) < capacity && hasFreeTotalListingSlot();
}

/** Przeniesienie spółki na inny rynek (NH / PRV / GPW) z komunikatem; zwraca true, gdy przeniesiona. */
function moveStockToMarket(stock, marketId, reason, priceEffect = 0) {
    const from = getStockMarket(stock);
    if (from === marketId) return false;
    if (marketId === 'GPW') delete stock.market; else stock.market = marketId;
    stock.marketSinceQ = typeof macro === 'object' ? macro.quarter : 0;
    delete stock.belowReqQ;
    if (marketId === 'NH' && typeof unlockAcademyEntry === 'function' && isStockOwnedByPlayer(stock)) unlockAcademyEntry('rynekGlownyAlternatywny', `${stock.name}: zmiana rynku`);
    if (marketId === 'PRV' && typeof unlockAcademyEntry === 'function' && isStockOwnedByPlayer(stock)) unlockAcademyEntry('gieldaPrywatna', `${stock.name}: giełda prywatna`);
    if (priceEffect) applyPriceEffect(stock.symbol, priceEffect, priceEffect > 0 ? 'positive' : 'negative', 'company');
    const text = `🔀 ${stock.name} (${stock.symbol}) przechodzi z ${getMarketLabel(from)} na ${getMarketLabel(marketId)}${reason ? ` — ${reason}` : ''}.`;
    logEvent(text, 'market');
    if (typeof pushNews === 'function') pushNews(text, stock.symbol);
    const held = (playerPortfolio?.[stock.symbol]?.shares || 0) > 0 || (playerWallet?.portfolio?.[stock.symbol]?.shares || 0) > 0;
    if (held && typeof addMail === 'function') addMail({ sender: 'PULS', subject: `🔀 ${stock.name}: zmiana rynku`, body: `${text}\n\nTwoje akcje zostają na koncie; zmienia się rynek notowań, jego wymogi i płynność.`, importance: 2, symbol: stock.symbol });
    return true;
}

/** Kandydat do zejścia z GPW: zwykła spółka krajowa na GPW, której państwo może zmienić rynek. */
function isDemotionCandidate(stock) {
    return getStockMarket(stock) === 'GPW' && hasListingMoveGuards(stock);
}

/** E1: co kwartał — spółki na GPW poniżej progu utrzymania zliczają kwartały; po LISTING_BELOW_QUARTERS schodzą na NH (zamiast upaść); gdy NH pełny — wykup jak przy wycofaniu. */
function processListingMaintenanceQuarterly() {
    const req = getListingRequirements('GPW');
    const floor = req.cap * LISTING_RETAIN_FACTOR;
    const due = [];
    for (const stock of stocks) {
        if (!isDemotionCandidate(stock)) { if (stock.belowReqQ) delete stock.belowReqQ; continue; }
        if (getMarketCapValue(stock) < floor) {
            stock.belowReqQ = (stock.belowReqQ || 0) + 1;
            if (stock.belowReqQ >= LISTING_BELOW_QUARTERS) due.push(stock);
        } else if (stock.belowReqQ) delete stock.belowReqQ;
    }
    due.sort((a, b) => getMarketCapValue(a) - getMarketCapValue(b));
    let moved = 0;
    for (const stock of due.slice(0, LISTING_DEMOTE_PER_QUARTER)) {
        const reason = `kapitalizacja poniżej progu utrzymania (${formatZl(floor, 0)}) od ${stock.belowReqQ} kw.`;
        try {
            if (hasEntryMarketSlot('NH')) { if (moveStockToMarket(stock, 'NH', reason, LISTING_DEMOTE_PRICE_EFFECT)) moved++; }
            else if (delistWithBuyout(stock) !== null) moved++; // NH pełny: wykup po cenie rynkowej, bez „duchów” posiadaczy
        } catch (error) { console.error(`[zejście z GPW] ${stock.symbol}:`, error); }
    }
    return moved;
}

// --- E2: NewHorizons (państwowy operator) — ryzyko, ograniczenia inwestorów, płynność ---
// Zmienność ×1,45 i szansa upadku ×2,5 (środek widełek planu 1,3–1,6 i 2–3), ale co kwartał szansa „przełomu” (większy potencjał wzrostu).
// Ograniczenia: boty wg osobowości, zarządcy botów wg stylu, gracz wg stanowiska (playerAccessLevel). PRV: reguły tej samej tabeli (E3).
const ENTRY_MARKET_RULES = {
    NH:  { volatility: 1.45, failure: 2.5, playerAccess: 2, blockedBots: ['calm', 'banker', 'dividend_chaser'], blockedManagers: ['cautious', 'dividend'] },
    PRV: { volatility: 1.2, failure: 1.5, playerAccess: 3, allowedBots: ['yolo_trader', 'reckless'], allowedManagers: ['aggressive', 'momentum'] }
};
const NH_BREAKTHROUGH_CHANCE = 0.04;    // co kwartał, dla spółki w dobrej kondycji
const NH_BREAKTHROUGH_RANGE = [0.15, 0.40];
const NH_MM_TURNOVER = 0.003;           // minimalny obrót kwartalny = 0,3% kapitalizacji (popyt zastępczy państwa)
const NH_MM_MAX_STOCKS = 15;            // ile spółek na kwartał państwo wspiera

/** Reguły rynku wejścia dla spółki; spółki miejskie (stabilne, nie bankrutują) są z nich wyłączone — notowane na NH, ale bez jego ryzyka i ograniczeń inwestorów. */
function getEntryRules(stock) {
    return stock?.assetType === 'Municipal' ? null : ENTRY_MARKET_RULES[getStockMarket(stock)] || null;
}

function getMarketVolatilityFactor(stock) {
    return getEntryRules(stock)?.volatility || 1;
}

function getMarketFailureFactor(stock) {
    return getEntryRules(stock)?.failure || 1;
}

function isPersonalityAllowed(rules, kind, personality) {
    const allowed = rules[`allowed${kind}`], blocked = rules[`blocked${kind}`];
    if (allowed) return allowed.includes(personality);
    return !(blocked || []).includes(personality);
}

/** Czy bot (osobowość ai.personality) może kupować akcje tej spółki. */
function canBotInvestIn(ai, stock) {
    const rules = getEntryRules(stock);
    return !rules || isPersonalityAllowed(rules, 'Bots', ai?.personality);
}

/** Czy zarządca bota (manager.personality: aggressive, cautious, …) może kupować akcje tej spółki. */
function canManagerInvestIn(manager, stock) {
    const rules = getEntryRules(stock);
    return !rules || isPersonalityAllowed(rules, 'Managers', manager?.personality);
}

/** Czy gracz ma stanowisko dające dostęp do rynku spółki (NH od poziomu 2, giełda prywatna od 3). */
function canPlayerTradeMarket(stock) {
    const rules = getEntryRules(stock);
    return !rules || playerAccessLevel >= rules.playerAccess;
}

/** E2: co kwartał na NH — „przełomy” zdrowych spółek i minimalny obrót (market maker państwa: popyt zastępczy w limicie spółek i tylko przy dodatnim skarbie). */
function processNewHorizonsQuarterly() {
    let supported = 0;
    for (const stock of stocks) {
        if (getStockMarket(stock) !== 'NH' || stock.isBankrupt || stock.assetType) continue;
        if ((Number(stock.financialHealth) || 0) >= 1 && Math.random() < NH_BREAKTHROUGH_CHANCE) {
            const gain = getRandomInRange(...NH_BREAKTHROUGH_RANGE);
            applyPriceEffect(stock.symbol, gain, 'positive', 'company');
            logEvent(`🚀 ${stock.name} (${stock.symbol}) na NewHorizons notuje przełom: kurs +${(gain * 100).toFixed(0)}%.`, 'market');
        }
        const floor = getMarketCapValue(stock) * NH_MM_TURNOVER;
        if (governmentTreasury > 0 && supported < NH_MM_MAX_STOCKS && (Number(stock.lastTurnover) || 0) < floor) { stock.lastTurnover = floor; supported++; }
    }
    return supported;
}

// --- E3: ścieżka startupu i giełda prywatna ---
// Debiut: kapitalizacja ≥ wymóg GPW → GPW (gdy brak miejsca: czeka w inkubatorze); ≥ wymóg NH → NH; poniżej → giełda prywatna.
// NH → po NH_PROMOTE_MIN_AGE kw.: awans na GPW (spełnia wymogi), a słabe spółki: giełda prywatna albo firma prywatna (wykup).
// Giełda prywatna: szansa startu oszustwa ×5 względem GPW (kwartalnie), wykrycie później (4–10 kw.), mocniejszy spadek po ujawnieniu,
// upadek ×1,5 (ENTRY_MARKET_RULES), pojemność ≤ 10% spółek, gracz najwyżej 20% wartości funduszu.
const LISTING_RULES = { debutRouting: true };   // testy starsze od 0.15.6 wyłączają w resetWorld (debiut zawsze na GPW)
const PRV_SHARE_CAP = 0.10;
const PRV_FRAUD_FACTOR = 5;
const PRV_DETECTION_RANGE = [4, 10];
const PRV_REVEAL_PENALTY = 0.15;
const PRV_PLAYER_LIMIT = 0.20;
const NH_PROMOTE_MIN_AGE = 8;           // kwartały na NH przed awansem / rozwidleniem
const NH_PROMOTE_CHANCE = 0.35;         // co kwartał dla spółki spełniającej wymogi GPW
const NH_FORK_CHANCE = 0.15;            // co kwartał dla słabej spółki NH
const NH_FORK_PRIVATE_SHARE = 0.4;      // z rozwidlenia: firma prywatna (wykup); reszta — giełda prywatna

function isDebutRoutingActive() {
    return LISTING_RULES.debutRouting;
}

/** Rynek debiutu startupu o danej kapitalizacji; null = czeka w inkubatorze (brak miejsca). */
function chooseDebutMarket(cap) {
    if (cap >= getListingRequirements('GPW').cap) return hasFreeListingSlot() ? 'GPW' : null;
    if (cap >= getListingRequirements('NH').cap) return hasEntryMarketSlot('NH') ? 'NH' : null;
    return hasEntryMarketSlot('PRV') ? 'PRV' : null;
}

function getMarketFraudFactor(stock) {
    return getStockMarket(stock) === 'PRV' ? PRV_FRAUD_FACTOR : 1;
}

function getFraudDetectionRange(stock) {
    return getStockMarket(stock) === 'PRV' ? PRV_DETECTION_RANGE : [3, 7];
}

function getMarketRevealPenalty(stock) {
    return getStockMarket(stock) === 'PRV' ? PRV_REVEAL_PENALTY : 0;
}

/** Limit gracza na giełdzie prywatnej: tekst odmowy albo null. */
function checkPrivateMarketLimit(stock, value) {
    if (getStockMarket(stock) !== 'PRV') return null;
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('gieldaPrywatna');
    const held = Object.entries(playerPortfolio || {}).reduce((sum, [symbol, holding]) => {
        const other = stocks.find(s => s.symbol === symbol);
        return sum + (other && getStockMarket(other) === 'PRV' ? (holding.shares || 0) * other.price : 0);
    }, 0);
    const nav = typeof getFundAssets === 'function' ? getFundAssets() : 0; // aktywa funduszu (nie NAV na jednostkę)
    if (!(nav > 0) || held + value <= nav * PRV_PLAYER_LIMIT) return null;
    return `Giełda prywatna: wysokie ryzyko oszustwa i słaby nadzór — fundusz może tam trzymać najwyżej ${PRV_PLAYER_LIMIT * 100}% wartości (${formatZl(nav * PRV_PLAYER_LIMIT, 0)}).`;
}

/** E3: co kwartał — spółki NH po 8 kw.: awans na GPW albo (słabe) giełda prywatna / firma prywatna. */
function processNhPathQuarterly() {
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    const result = { promoted: 0, toPrivateMarket: 0, wentPrivate: 0 };
    for (const stock of stocks.slice()) {
        if (getStockMarket(stock) !== 'NH' || !hasListingMoveGuards(stock, true)) continue;
        if (stock.marketSinceQ === undefined) stock.marketSinceQ = quarter;
        if (quarter - stock.marketSinceQ < NH_PROMOTE_MIN_AGE) continue;
        if (meetsListingRequirements(stock, 'GPW').ok) {
            if (hasFreeListingSlot() && Math.random() < NH_PROMOTE_CHANCE && moveStockToMarket(stock, 'GPW', 'awans na główny parkiet: spełnia wymogi GPW', 0.03)) result.promoted++;
            continue;
        }
        const weak = getMarketCapValue(stock) < getListingRequirements('NH').cap * LISTING_RETAIN_FACTOR || (Number(stock.financialHealth) || 0) <= 0;
        if (!weak || Math.random() >= NH_FORK_CHANCE) continue;
        if (Math.random() >= NH_FORK_PRIVATE_SHARE && hasEntryMarketSlot('PRV')) {
            if (moveStockToMarket(stock, 'PRV', 'słaba spółka szuka łagodniejszych wymogów (większe ryzyko oszustwa)', -0.03)) result.toPrivateMarket++;
        } else if (delistWithBuyout(stock, 'wychodzi z giełdy i zostaje firmą prywatną') !== null) result.wentPrivate++;
    }
    return result;
}

/** E4: spółki miejskie na NH awansują na GPW po 8 kw., gdy spełniają wymogi (wolny obrót ≥ 30% wymaga sprzedaży pakietu przez miasto, więc zdarza się rzadko). */
function processMunicipalPromotionQuarterly() {
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    let promoted = 0;
    for (const stock of stocks.slice()) {
        if (stock.assetType !== 'Municipal' || stock.isBankrupt || getStockMarket(stock) !== 'NH') continue;
        if (stock.marketSinceQ === undefined) stock.marketSinceQ = quarter;
        if (quarter - stock.marketSinceQ < NH_PROMOTE_MIN_AGE || !meetsListingRequirements(stock, 'GPW').ok) continue;
        if (Math.random() < NH_PROMOTE_CHANCE && moveStockToMarket(stock, 'GPW', 'spółka miejska awansuje na główny parkiet', 0.03)) promoted++;
    }
    return promoted;
}

// --- E5: urząd antymonopolowy zależny od poziomu (antitrustOffice.level 0–5, rozwijany wydatkami państwa) ---
// Wskaźniki spółki: udział w przychodach sektora głównego (HHI wg kapitalizacji nie nadaje się — jedna spółka ma ≈ 99% kapitalizacji sektora, diagnoza E0),
// udział w przetargach (okno 8 kw. z 0.15.5) i w kapitalizacji rynku. Interwencje tylko w skrajnych przypadkach, najwyżej jedna na kwartał:
// (udział w sektorze liczy się dopiero od 5 spółek i po wzroście o ≥ 15 pp: giganci mają dominację od początku gry)
// 2 kwartały ponad progiem → kara (2–5% rocznych przychodów, nie więcej niż połowa gotówki) → po 4 kw. nadal ponad progiem: nakaz podziału
// (wymuszone wydzielenie segmentu, wartość dla posiadaczy zachowana) albo, gdy podziału nie da się zrobić, zakaz przejęć na 12 kw.
const ANTITRUST_TIERS = [
    null,                                                           // poziom 0: urząd nie interweniuje
    { sector: 0.70, tender: 0.65, cap: 0.45, fine: 0.02 },
    { sector: 0.60, tender: 0.55, cap: 0.38, fine: 0.035 },
    { sector: 0.50, tender: 0.50, cap: 0.32, fine: 0.05 }
];
const ANTITRUST_MERGER_FACTOR = [1, 0.95, 0.90, 0.85, 0.80, 0.75];   // mnożnik progu blokady fuzji z ustawy antymonopolowej wg poziomu urzędu
const ANTITRUST_MIN_PEERS = 5;          // udział w sektorze liczy się od 5 spółek (w małym sektorze lider ma z natury większość)
const ANTITRUST_GROWTH = 0.15;           // udział w sektorze liczy się, gdy wzrósł o ≥ 15 pp w stosunku do stanu sprzed ANTITRUST_BASE_QUARTERS (giganci mają dominację od startu gry — to nie nadużycie)
const ANTITRUST_BASE_QUARTERS = 8;
const ANTITRUST_WATCH_QUARTERS = 2;
const ANTITRUST_ORDER_AFTER = 4;
const ANTITRUST_BAN_QUARTERS = 12;
const ANTITRUST_CLEAN_RESET = 8;
let antitrustLog = [];

function getAntitrustTier() {
    return ANTITRUST_TIERS[Math.min(3, Math.max(0, Number(antitrustOffice?.level) || 0))];
}

/** Próg blokady fuzji: próg z ustawy antymonopolowej × mnożnik poziomu urzędu (poziom 0 = dotychczasowy). */
function getMergerBlockThreshold() {
    const law = typeof getAntitrustLevel === 'function' ? getAntitrustLevel().block : 0.40;
    return law * (ANTITRUST_MERGER_FACTOR[Math.min(5, Math.max(0, Number(antitrustOffice?.level) || 0))] ?? 1);
}

function isUnderAntitrustBan(stock) {
    return (Number(stock?.antitrustBanUntilQ) || 0) > (typeof macro === 'object' ? macro.quarter : 0);
}

/** Wskaźniki koncentracji zwykłych spółek: udział w przychodach sektora głównego, w kapitalizacji i w przetargach. */
function getConcentrationMetrics() {
    const ordinary = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.isSubsidiaryOf && !s.marketOperator && !s.isStateOwned);
    const revenueOf = s => Math.max(0, Number(s.fundamentals?.revenueTtm) || Number(s.fundamentals?.revenue) || 0);
    const sectorOf = s => getMainSector(s) || (s.sector || [])[0];
    const sectorTotals = {}, sectorCounts = {}, capTotal = ordinary.reduce((sum, s) => sum + getMarketCapValue(s), 0);
    for (const s of ordinary) { const sector = sectorOf(s); sectorTotals[sector] = (sectorTotals[sector] || 0) + revenueOf(s); sectorCounts[sector] = (sectorCounts[sector] || 0) + 1; }
    const awards = {}; let awardTotal = 0;
    for (const entry of constructionAwardLog || []) { awards[entry.sym] = (awards[entry.sym] || 0) + 1; awardTotal++; }
    const metrics = new Map();
    for (const s of ordinary) {
        const sector = sectorOf(s);
        metrics.set(s.symbol, {
            sector: sectorCounts[sector] >= ANTITRUST_MIN_PEERS && sectorTotals[sector] > 0 ? revenueOf(s) / sectorTotals[sector] : 0,
            cap: capTotal > 0 ? getMarketCapValue(s) / capTotal : 0,
            tender: awardTotal >= 8 ? (awards[typeof getEntityKey === 'function' ? getEntityKey(s) : s.symbol] || 0) / awardTotal : 0
        });
    }
    return metrics;
}

function noteAntitrust(stock, kind, amount, text) {
    antitrustLog.push({ quarter: typeof macro === 'object' ? macro.quarter : 0, symbol: stock.symbol, kind, amount: Math.round(amount || 0) });
    if (antitrustLog.length > 60) antitrustLog.shift();
    logEvent(text, 'state');
    if (typeof pushNews === 'function') pushNews(text, stock.symbol);
    const held = (playerPortfolio?.[stock.symbol]?.shares || 0) > 0 || (playerWallet?.portfolio?.[stock.symbol]?.shares || 0) > 0;
    if (held && typeof unlockAcademyEntry === 'function') unlockAcademyEntry('antymonopol', `${stock.name}: interwencja urzędu`);
    if (held && typeof addMail === 'function') addMail({ sender: 'PULS', subject: `⚖️ ${stock.name}: interwencja Urzędu Antymonopolowego`, body: text, importance: 2, symbol: stock.symbol });
}

function antitrustFine(stock, tier) {
    const annual = Math.max(0, Number(stock.fundamentals?.revenueTtm) || Number(stock.fundamentals?.revenue) || 0);
    const fine = Math.min(annual * tier.fine, Math.max(0, Number(stock.cash) || 0) * 0.5);
    if (fine > 0) {
        adjustCompanyCash(stock, -fine);
        adjustBalanceSheet(stock, { assets: -fine, retainedEarnings: -fine });
        governmentTreasury += fine;
        recordPayment(stock, 'external:skarb-panstwa', fine, 'Kara antymonopolowa');
        applyPriceEffect(stock.symbol, -0.03, 'negative', 'company');
    }
    noteAntitrust(stock, 'fine', fine, `⚖️ Urząd Antymonopolowy karze ${stock.name} (${stock.symbol}) za dominację na rynku: ${formatZl(fine, 0)} (${(tier.fine * 100).toFixed(1)}% rocznych przychodów).`);
    return fine;
}

/** Nakaz podziału: wymuszone wydzielenie segmentu (wartość dla posiadaczy zachowana); gdy się nie da — zakaz przejęć. */
function antitrustOrder(stock) {
    const segment = typeof getSpinoffCandidateSegment === 'function' ? getSpinoffCandidateSegment(stock) : null;
    if (segment && !stock.spinoff) {
        stock.spinoff = { stage: 'announced', sector: segment.sector, subsector: segment.subsector || null, by: 'antitrust', announcedQuarter: typeof getSpinoffQuarter === 'function' ? getSpinoffQuarter() : 0, valueBefore: getMarketCapValue(stock), gigBefore: typeof getGigValue === 'function' ? getGigValue() : 0 };
        const child = executeSpinoff(stock, { carve: false });
        if (child) { noteAntitrust(stock, 'split', getMarketCapValue(child), `⚖️ Urząd Antymonopolowy nakazuje podział ${stock.name}: działalność ${segment.sector} wydziela się do nowej spółki ${child.name} (${child.symbol}). Akcjonariusze dostają jej akcje.`); return 'split'; }
        stock.spinoff = null;
    }
    stock.antitrustBanUntilQ = (typeof macro === 'object' ? macro.quarter : 0) + ANTITRUST_BAN_QUARTERS;
    noteAntitrust(stock, 'ban', 0, `⚖️ Urząd Antymonopolowy zakazuje ${stock.name} (${stock.symbol}) przejęć na ${ANTITRUST_BAN_QUARTERS} kw. — spółki nie da się podzielić.`);
    return 'ban';
}

/** E5: co kwartał — spółki ponad progiem poziomu urzędu; najwyżej jedna interwencja na kwartał. Zwraca opis interwencji albo null. */
function processAntitrustQuarterly() {
    const tier = getAntitrustTier();
    if (!tier) return null;
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    const metrics = getConcentrationMetrics();
    let done = null;
    for (const stock of stocks.slice()) {
        const m = metrics.get(stock.symbol);
        if (!m) continue;
        const base = stock.sectorBase;
        const grew = m.sector - (base ? base.v : m.sector) >= ANTITRUST_GROWTH;
        const over = (m.sector >= tier.sector && grew) || m.tender >= tier.tender || m.cap >= tier.cap;
        let rec = stock.antitrust;
        if (!rec && m.sector > 0 && (!base || quarter - base.q >= ANTITRUST_BASE_QUARTERS)) stock.sectorBase = { q: quarter, v: Math.round(m.sector * 1000) / 1000 };
        if (!over) { if (rec && ++rec.clean >= ANTITRUST_CLEAN_RESET) delete stock.antitrust; continue; }
        if (!rec) rec = stock.antitrust = { watch: 0, stage: 0, clean: 0 };
        rec.clean = 0; rec.watch++;
        if (done) continue;
        if (rec.stage === 0 && rec.watch >= ANTITRUST_WATCH_QUARTERS) { antitrustFine(stock, tier); rec.stage = 1; rec.fineQ = quarter; done = { symbol: stock.symbol, kind: 'fine' }; }
        else if (rec.stage === 1 && quarter - rec.fineQ >= ANTITRUST_ORDER_AFTER) { done = { symbol: stock.symbol, kind: antitrustOrder(stock) }; rec.stage = 2; rec.orderQ = quarter; }
    }
    return done;
}

// --- E6: spółka zależna w Mediach jako gazeta matki ---
// Gazeta wysyła graczowi maile o matce (przychylnie, czasem podkolorowane) i o jej konkurentach (czasem nieprawdziwe zarzuty).
// Każdy mail ma oznaczone źródło i wiarygodność gazety. Kłamstwa wychodzą na jaw (częściej przy skutecznym KNF): kara dla gazety,
// kurs matki w dół, wiarygodność gazety maleje (kłamstwo = czarny PR z 0.7, tu bez udziału gracza).
const MEDIA_MAIL_CHANCE = 0.4;          // kwartalna szansa maila od danej gazety
const MEDIA_MAILS_PER_QUARTER = 2;      // limit maili od wszystkich gazet na kwartał (bez zalewu skrzynki)
const MEDIA_PARENT_SHARE = 0.65;        // reszta maili dotyczy konkurentów matki
const MEDIA_PARENT_LIE_CHANCE = 0.35;
const MEDIA_RIVAL_LIE_CHANCE = 0.5;
const MEDIA_EXPOSE_CHANCE = 0.15;       // szansa na kwartał × (1 + skuteczność KNF)
const MEDIA_CRED_START = 0.8;
const MEDIA_CRED_LOSS = 0.2;
const MEDIA_CRED_MIN = 0.1;
const MEDIA_FINE_RATE = 0.02;           // kara dla gazety: 2% kapitalizacji, najwyżej 30% gotówki

function isMediaDaughter(stock) {
    return Boolean(stock && stock.isSubsidiaryOf && !stock.isBankrupt && !stock.assetType && (stock.sector || []).includes('Media'));
}

function getMediaCredibility(stock) {
    return Number.isFinite(stock?.mediaCred) ? stock.mediaCred : MEDIA_CRED_START;
}

/** Zdemaskowanie kłamstwa gazety: kara, spadek kursu matki, utrata wiarygodności. */
function exposeMediaLie(daughter, parent) {
    const lie = daughter.mediaLie;
    daughter.mediaLie = null;
    const fine = Math.min(getMarketCapValue(daughter) * MEDIA_FINE_RATE, Math.max(0, Number(daughter.cash) || 0) * 0.3);
    if (fine > 0) {
        adjustCompanyCash(daughter, -fine);
        adjustBalanceSheet(daughter, { assets: -fine, retainedEarnings: -fine });
        governmentTreasury += fine;
        recordPayment(daughter, 'external:skarb-panstwa', fine, 'Kara za wprowadzające w błąd publikacje');
    }
    daughter.mediaCred = Math.max(MEDIA_CRED_MIN, getMediaCredibility(daughter) - MEDIA_CRED_LOSS);
    applyPriceEffect(parent.symbol, -0.03, 'negative', 'company');
    const rival = lie?.rival && stocks.find(s => s.symbol === lie.rival);
    if (rival) applyPriceEffect(rival.symbol, 0.01, 'positive', 'company'); // sprostowanie
    const text = `📰 ZDEMASKOWANO: gazeta ${daughter.name} (spółka zależna ${parent.name}) publikowała nieprawdziwe informacje${rival ? ` o ${rival.name}` : ""}. Kara ${formatZl(fine, 0)}, wiarygodność gazety spada do ${(daughter.mediaCred * 100).toFixed(0)}%, kurs ${parent.name} −3%.`;
    logEvent(text, 'company');
    if (typeof addMail === 'function') addMail({ sender: 'PULS', subject: `📰 Zdemaskowano gazetę ${daughter.name}`, body: text, importance: 2, symbol: parent.symbol });
    return fine;
}

/** Mail gazety z oznaczeniem źródła; zwraca opis (do testów) albo null. */
function sendMediaMail(daughter, parent) {
    const cred = getMediaCredibility(daughter);
    const rivals = stocks.filter(s => s !== parent && s !== daughter && !s.assetType && !s.isBankrupt && !s.isSubsidiaryOf && getMainSector(s) && getMainSector(s) === getMainSector(parent));
    const aboutRival = rivals.length > 0 && Math.random() >= MEDIA_PARENT_SHARE;
    const rival = aboutRival ? getRandomElement(rivals) : null;
    const lie = Math.random() < (aboutRival ? MEDIA_RIVAL_LIE_CHANCE : MEDIA_PARENT_LIE_CHANCE);
    const earnings = Number(parent.quarterlyEarnings) || 0;
    let subject, claim;
    if (rival) {
        subject = `📰 ${daughter.name}: ${rival.name} — ${lie ? "alarm" : "komentarz"}`;
        claim = lie ? `Według naszych informacji ${rival.name} (${rival.symbol}) ma poważne kłopoty z płynnością, a zarząd ukrywa przed inwestorami problemy z umowami.`
            : `${rival.name} (${rival.symbol}) notuje kurs ${formatZl(rival.price)}; analitycy nie widzą nowych ryzyk.`;
    } else {
        subject = `📰 ${daughter.name}: wyniki ${parent.name}`;
        claim = lie ? `${parent.name} (${parent.symbol}) wchodzi w okres dynamicznego wzrostu — zysk kwartalny ${formatZl(Math.abs(earnings) * 1.35 + 1000, 0)}, wyraźnie ponad oczekiwaniami rynku.`
            : `${parent.name} (${parent.symbol}) zamknęła kwartał z wynikiem ${formatZl(earnings, 0)}; kurs ${formatZl(parent.price)}.`;
    }
    const body = `Źródło: gazeta ${daughter.name}, spółka zależna ${parent.name} — redakcja może być przychylna właścicielowi. Wiarygodność źródła: ${(cred * 100).toFixed(0)}%.\n\n${claim}`;
    if (typeof addMail === 'function') addMail({ sender: daughter.name, subject, body, importance: 1, symbol: (rival || parent).symbol });
    if (lie) {
        daughter.mediaLie = { quarter: typeof macro === 'object' ? macro.quarter : 0, rival: rival?.symbol || null };
        if (rival) applyPriceEffect(rival.symbol, -0.01 * cred, 'negative', 'company'); // nieprawdziwy zarzut lekko obniża kurs konkurenta
    }
    return { daughter: daughter.symbol, about: rival ? rival.symbol : parent.symbol, lie };
}

/** E6: co kwartał — wiarygodne gazety wysyłają maile; wcześniejsze kłamstwa mogą zostać zdemaskowane. */
function processMediaDaughtersQuarterly() {
    const knf = typeof getInstitutionEffectiveness === 'function' && typeof oversight === 'object' ? getInstitutionEffectiveness(oversight.knf) : 0.3;
    let sent = 0, exposed = 0;
    for (const daughter of stocks.filter(isMediaDaughter)) {
        const parent = stocks.find(s => s.symbol === daughter.isSubsidiaryOf && !s.isBankrupt);
        if (!parent) continue;
        if (daughter.mediaLie && Math.random() < MEDIA_EXPOSE_CHANCE * (1 + knf)) { exposeMediaLie(daughter, parent); exposed++; continue; }
        if (sent < MEDIA_MAILS_PER_QUARTER && Math.random() < MEDIA_MAIL_CHANCE && sendMediaMail(daughter, parent)) sent++;
    }
    return { sent, exposed };
}

// --- E7: widoki (komponenty 0.14.5: bank-card, bank-grid, list-plain; ryzyko zawsze słowem, nie samym kolorem; bez nowych okien) ---
const ENTRY_MARKET_NOTES = {
    NH: 'Rynek wejścia (państwowy operator) — ryzyko podwyższone',
    PRV: 'Rynek wejścia — ryzyko oszustwa bardzo wysokie, słaby nadzór'
};

function getEntryMarketNote(id) {
    return ENTRY_MARKET_NOTES[id] || 'Rynek wejścia';
}

/** Krótki znacznik rynku spółki (plakietka i linijka meta): ryzyko słowem. */
function getMarketBadgeText(stock) {
    const id = getStockMarket(stock);
    if (id === 'NH') return stock.assetType === 'Municipal' ? 'rynek NH' : 'rynek NH · ryzyko podwyższone';
    if (id === 'PRV') return 'giełda prywatna · ryzyko oszustwa';
    return `członek rynku ${getMarketLabel(id)}`;
}

const ANTITRUST_KIND_LABELS = { fine: 'kara', split: 'nakaz podziału', ban: 'zakaz przejęć' };

/** Fragment karty urzędu antymonopolowego (Państwo → Przegląd): progi bieżącego poziomu i ostatnie interwencje. */
function renderAntitrustInterventions() {
    const tier = getAntitrustTier();
    const pct = v => `${Math.round(v * 100)}%`;
    const thresholds = tier
        ? `Progi interwencji (poziom ${Math.min(3, antitrustOffice.level)}): udział w sektorze ${pct(tier.sector)} po wzroście o ${pct(ANTITRUST_GROWTH)}, w przetargach ${pct(tier.tender)}, w kapitalizacji ${pct(tier.cap)}. Najpierw kara (${pct(tier.fine)} rocznych przychodów), po ${ANTITRUST_ORDER_AFTER} kw. nakaz podziału albo zakaz przejęć.`
        : 'Urząd na poziomie 0 nie interweniuje — rozwija go państwo wydatkami.';
    const rows = antitrustLog.slice(-5).reverse().map(e => `<li>kw. ${e.quarter}: ${escapeHtml(e.symbol)} — ${ANTITRUST_KIND_LABELS[e.kind] || e.kind}${e.amount > 0 ? ` (${formatZl(e.amount, 0)})` : ""}</li>`).join('');
    const noRows = '<li class="text-muted">Brak interwencji.</li>';
    return `<p class="text-sm text-muted">${thresholds}</p><ul class="list-plain text-sm">${rows || noRows}</ul>`;
}

/** Zakładka „Rynki”: ścieżka spółki, wymogi wejścia i ryzyko każdego rynku (karty bank-card). */
function renderListingPathPanel() {
    const gpw = getListingRequirements('GPW'), nh = getListingRequirements('NH'), prv = getListingRequirements('PRV');
    const money = v => formatZl(v, 0), pct = v => `${Math.round(v * 100)}%`;
    const card = (icon, title, type, rows, note) => `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon(icon, 20)}</span><div><h4>${escapeHtml(title)}</h4><span class="bank-card-type">${escapeHtml(type)}</span></div></header>
        <dl class="bank-card-rates">${rows.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl><p class="text-sm">${escapeHtml(note)}</p></article>`;
    const profit = (req, exempt) => req.profit ? (exempt ? 'zysk (bez wymogu dla spółek innowacyjnych)' : 'dodatni zysk') : 'brak wymogu';
    return `<h4 class="mt-3">Ścieżka spółki i wymogi wejścia</h4>
        <ol class="list-plain text-sm"><li>Start-up w inkubatorze (pula) → debiut: kapitalizacja co najmniej ${money(gpw.cap)} → <strong>główny parkiet GPW</strong>; mniej, ale co najmniej ${money(nh.cap)} → <strong>NewHorizons</strong>.</li>
        <li>Z NewHorizons po ${NH_PROMOTE_MIN_AGE} kw.: awans na GPW (spełnia wymogi), a słaba spółka — <strong>giełda prywatna</strong> albo wyjście z giełdy jako firma prywatna.</li>
        <li>GPW: spółka poniżej ${pct(LISTING_RETAIN_FACTOR)} wymogu kapitalizacji przez ${LISTING_BELOW_QUARTERS} kw. schodzi na NewHorizons zamiast upadać.</li></ol>
        <div class="bank-grid">${card("rynek", "GPW", "główny parkiet", [["Kapitalizacja", "≥ " + money(gpw.cap)], ["Wolny obrót", "≥ " + pct(gpw.freeFloat)], ["Zysk", profit(gpw)], ["Mnożnik wymogów", "×" + gpw.mult.toFixed(2)]], "Wymogi rosną, gdy rynek jest zatłoczony: ×1,0 do 100 spółek krajowych, ×1,5 przy 125. Ryzyko: standardowe.")}
        ${card("rakieta", "NewHorizons", "rynek wejścia, państwowy operator", [["Kapitalizacja", "≥ " + money(nh.cap)], ["Wolny obrót", "≥ " + pct(nh.freeFloat)], ["Zysk", profit(nh, true)], ["Spółek", String(getEntryMarketCount("NH")) + "/" + NH_CAPACITY]], "Ryzyko podwyższone: zmienność ×" + ENTRY_MARKET_RULES.NH.volatility + ", upadki ×" + ENTRY_MARKET_RULES.NH.failure + ", ale zdarzają się przełomy. Nie inwestują tu ostrożne boty i fundusze; płynność podtrzymuje państwo.")}
        ${card("alert", "Giełda prywatna", "rynek wejścia, ryzyko oszustwa bardzo wysokie", [["Kapitalizacja", "≥ " + money(prv.cap)], ["Wolny obrót", "≥ " + pct(prv.freeFloat)], ["Zysk", profit(prv)], ["Spółek", String(getEntryMarketCount("PRV"))]], "Oszustwa ok. " + PRV_FRAUD_FACTOR + "× częstsze niż na GPW, wykrywane później (" + PRV_DETECTION_RANGE.join("–") + " kw.). Fundusz może tu trzymać najwyżej " + Math.round(PRV_PLAYER_LIMIT * 100) + "% wartości.")}</div>`;
}

/** Jeden kwartalny punkt wejścia modułu (main.js). */
function processListingsQuarterly() {
    processMediaDaughtersQuarterly();
    processAntitrustQuarterly();
    processListingMaintenanceQuarterly();
    processMunicipalPromotionQuarterly();
    processNhPathQuarterly();
    processNewHorizonsQuarterly();
}
