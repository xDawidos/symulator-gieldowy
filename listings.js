// listings.js — 0.15.6 „Giełdy wejścia”: wymogi wejścia i utrzymania na GPW, rynek NewHorizons (NH, państwowy operator)
// i Włoska Giełda (PRV). Rynki NH i PRV są wpisane w MARKET_OPERATOR_DEFS (finance.js, flaga `entry`), nie mają spółki-operatora,
// nie liczą się do limitu spółek krajowych (GPW), ale liczą się do łącznego sufitu (LISTING_TOTAL_CAP).
// Stan spółki (pola opcjonalne, zapis v15): market, marketSinceQ, belowReqQ. Progi z diagnozy plany/raporty/diagnoza_0.15.6.md.

const LISTING_REQUIREMENTS = {
    GPW: { cap: 90000, freeFloat: 0.30, profit: true },
    NH:  { cap: 24000, freeFloat: 0.20, profit: true, innovativeExempt: true },
    PRV: { cap: 5000,  freeFloat: 0.10, profit: false }
};
const LISTING_INNOVATIVE_SECTORS = ['Technologia', 'Medycyna', 'Badania', 'Gaming'];
const LISTING_MULT_FROM = 100;          // spółek krajowych: do tylu mnożnik wymogów GPW = 1,0
const LISTING_MULT_TO = 125;            // …a od tylu = LISTING_MULT_MAX (liniowo pomiędzy)
const LISTING_MULT_MAX = 1.5;
const LISTING_RETAIN_FACTOR = 0.3;      // utrzymanie na GPW: kapitalizacja ≥ 30% wymogu wejścia (z mnożnikiem)
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
function getListingRequirements(marketId, stock = null) {
    const base = LISTING_REQUIREMENTS[marketId] || LISTING_REQUIREMENTS.PRV;
    const mult = marketId === 'GPW' ? getListingRequirementMultiplier() * (typeof getKnfListingMult === 'function' ? getKnfListingMult(stock) : 1) : 1; // 0.18.7 E0d: × mnożnik KNF
    return { ...base, cap: base.cap * mult, freeFloat: Math.min(0.5, base.freeFloat * mult), mult };
}

function isInnovativeCompany(stock) {
    return (stock?.sector || []).some(sector => LISTING_INNOVATIVE_SECTORS.includes(sector));
}

/** Czy spółka spełnia wymogi wejścia na rynek; `failed` wymienia niespełnione (cap, freeFloat, profit). Debiut startupu nie ma historii zysków (profit pomijany). */
function meetsListingRequirements(stock, marketId, { debut = false } = {}) {
    const req = getListingRequirements(marketId, debut ? null : stock);
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

/** 0.16.6 S2: spółka państwowa nie opuszcza GPW (ani zagranicznego przejęcia); spółki miejskie startują na NH i mogą tylko awansować na GPW. */
function isStateGpwOnly(stock) { return Boolean(stock?.isStateOwned); }

/** Przeniesienie spółki na inny rynek (NH / PRV / GPW) z komunikatem; zwraca true, gdy przeniesiona. */
function moveStockToMarket(stock, marketId, reason, priceEffect = 0) {
    const from = getStockMarket(stock);
    if (from === marketId) return false;
    if (isStateGpwOnly(stock) && marketId !== 'GPW') return false; // 0.16.6 S2
    if (marketId === 'GPW') delete stock.market; else stock.market = marketId;
    stock.marketSinceQ = typeof macro === 'object' ? macro.quarter : 0;
    delete stock.belowReqQ;
    if (marketId === 'NH' && typeof unlockAcademyEntry === 'function' && isStockOwnedByPlayer(stock)) unlockAcademyEntry('rynekGlownyAlternatywny', `${stock.name}: zmiana rynku`);
    if (marketId === 'PRV' && typeof unlockAcademyEntry === 'function' && isStockOwnedByPlayer(stock)) unlockAcademyEntry('gieldaPrywatna', `${stock.name}: Włoska Giełda`);
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
// Zmienność ×1,45 (środek widełek planu 1,3–1,6) i szansa upadku ×3 (góra widełek 2–3: spółki NH i tak są selekcją słabszych, a pomiar 20 lat dał ≈ 1,7× upadków GPW z bazy przy ×2,5), ale co kwartał szansa „przełomu” (większy potencjał wzrostu).
// Ograniczenia: boty wg osobowości, zarządcy botów wg stylu, gracz wg stanowiska (playerAccessLevel). PRV: reguły tej samej tabeli (E3).
const ENTRY_MARKET_RULES = {
    NH:  { volatility: 1.45, failure: 3, playerAccess: 2, blockedBots: ['calm', 'banker', 'dividend_chaser'], blockedManagers: ['cautious', 'dividend'] },
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

/** Czy gracz ma stanowisko dające dostęp do rynku spółki (NH od poziomu 2, Włoska Giełda od 3). */
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
            logEvent(`🚀 ${stock.name} (${stock.symbol}) na NewHorizons notuje przełom: kurs +${formatNumberPl((gain * 100), 0)}%.`, 'market');
        }
        const floor = getMarketCapValue(stock) * NH_MM_TURNOVER;
        if (governmentTreasury > 0 && supported < NH_MM_MAX_STOCKS && (Number(stock.lastTurnover) || 0) < floor) { stock.lastTurnover = floor; supported++; }
    }
    return supported;
}

// --- E3: ścieżka startupu i Włoska Giełda ---
// Debiut: kapitalizacja ≥ wymóg GPW → GPW (gdy brak miejsca: czeka w inkubatorze); ≥ wymóg NH → NH; poniżej → Włoska Giełda.
// NH → po NH_PROMOTE_MIN_AGE kw.: awans na ${getMarketLabel('GPW')} (spełnia wymogi), a słabe spółki: Włoska Giełda albo firma prywatna (wykup).
// Włoska Giełda: szansa startu oszustwa ×5 względem GPW (kwartalnie), wykrycie później (4–10 kw.), mocniejszy spadek po ujawnieniu,
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
const NH_FORK_PRIVATE_SHARE = 0.4;      // z rozwidlenia: firma prywatna (wykup); reszta — Włoska Giełda

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

/** Limit gracza na Włoskiej Giełdzie: tekst odmowy albo null. */
function checkPrivateMarketLimit(stock, value) {
    if (getStockMarket(stock) !== 'PRV') return null;
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('gieldaPrywatna');
    const held = Object.entries(playerPortfolio || {}).reduce((sum, [symbol, holding]) => {
        const other = stocks.find(s => s.symbol === symbol);
        return sum + (other && getStockMarket(other) === 'PRV' ? (holding.shares || 0) * other.price : 0);
    }, 0);
    const nav = typeof getFundAssets === 'function' ? getFundAssets() : 0; // aktywa funduszu (nie NAV na jednostkę)
    if (!(nav > 0) || held + value <= nav * PRV_PLAYER_LIMIT) return null;
    return `Włoska Giełda: wysokie ryzyko oszustwa i słaby nadzór — fundusz może tam trzymać najwyżej ${PRV_PLAYER_LIMIT * 100}% wartości (${formatZl(nav * PRV_PLAYER_LIMIT, 0)}).`;
}

/** E3: co kwartał — spółki NH po 8 kw.: awans na GPW albo (słabe) Włoska Giełda / firma prywatna. */
function processNhPathQuarterly() {
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    const result = { promoted: 0, toPrivateMarket: 0, wentPrivate: 0 };
    for (const stock of stocks.slice()) {
        if (getStockMarket(stock) !== 'NH' || !hasListingMoveGuards(stock, true)) continue;
        if (stock.marketSinceQ === undefined) stock.marketSinceQ = quarter;
        if (quarter - stock.marketSinceQ < NH_PROMOTE_MIN_AGE) continue;
        if (meetsListingRequirements(stock, 'GPW').ok) {
            if (wantsGpwListing(stock) && hasFreeListingSlot() && Math.random() < NH_PROMOTE_CHANCE && moveStockToMarket(stock, 'GPW', 'awans na główny parkiet: spełnia wymogi GPW', 0.03)) result.promoted++;
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

// --- E6 (0.16.4): minimalna opłata za notowanie, profile giełd prywatnych, zostawanie na NewHorizons ---
// Każda spółka płaci giełdzie co kwartał: procent kapitalizacji (finance.js), ale nie mniej niż minimum rynku. NH = 0 (państwowy operator, bez opłat).
const MARKET_MIN_FEE = { GPW: 1000, NH: 0, PRV: 0, other: 100 }; // PRV (Włoska Giełda): bez opłaty — nie ma operatora, a ryzyko oszustw ×5 już ją obciąża
const MARKET_PROFILE_CHANCE = 0.6;      // giełda internetowa dostaje profil z tą szansą (reszta przyjmuje każdą spółkę)
const NH_STAY_CHANCE = 0.4;             // część spółek NH nie chce na GPW (stała cecha spółki, losowana raz)
const NH_PROMOTE_FEE_MULT = 4;          // awans na GPW: zysk kwartalny i gotówka ≥ 4 × minimalna opłata GPW
const MARKET_PROFILES = [
    { id: 'defensive', label: 'tylko spółki defensywne', sectors: ['Żywność', 'Medycyna', 'Obronność', 'Energia', 'Usługi'] },
    { id: 'tech', label: 'tylko technologia', sectors: ['Technologia'] },
    { id: 'modern', label: 'tylko technologia i gaming', sectors: ['Technologia', 'Gaming'] },
    { id: 'consumer', label: 'tylko konsumpcja', sectors: ['Żywność', 'Alkohole', 'Dobra konsumpcyjne', 'Turystyka'] },
    { id: 'cap1m', label: 'kapitalizacja od 1 mln PLN', minCap: 1_000_000 },
    { id: 'cap300k', label: 'kapitalizacja od 300 tys. PLN', minCap: 300_000 },
    { id: 'poland', label: 'tylko spółki z Polski', countries: ['PL'] }
];

function getStockCountry(stock) { return stock?.country || 'PL'; }

function getMarketMinFee(marketId) { return MARKET_MIN_FEE[marketId] ?? MARKET_MIN_FEE.other; }

function getMarketProfile(marketId) {
    const id = marketOperators?.[marketId]?.profile;
    return id ? MARKET_PROFILES.find(p => p.id === id) || null : null;
}

/** Losowy profil dla nowej giełdy internetowej albo null (nie każda giełda ma profil). */
function pickMarketProfileId() {
    return Math.random() < MARKET_PROFILE_CHANCE ? getRandomElement(MARKET_PROFILES).id : null;
}

/** Czy giełda przyjmie spółkę (bez profilu, rynki bez operatora i sam operator: tak). */
function marketAccepts(marketId, stock) {
    const profile = getMarketProfile(marketId);
    if (!profile || stock?.marketOperator) return true;
    if (profile.sectors && !(stock.sector || []).some(sec => profile.sectors.includes(sec))) return false;
    if (profile.minCap && getMarketCapValue(stock) < profile.minCap) return false;
    if (profile.countries && !profile.countries.includes(getStockCountry(stock))) return false;
    return true;
}

function describeMarketProfile(marketId) { return getMarketProfile(marketId)?.label || 'bez ograniczeń'; }

/** Spółka NH sama decyduje o awansie: nie chce GPW (cecha `nhStay`), jej gracz-większościowiec decyduje sam albo nie stać jej na opłatę GPW. */
function wantsGpwListing(stock) {
    if (stock.nhStay === undefined) stock.nhStay = Math.random() < NH_STAY_CHANCE;
    if (stock.nhStay) return false;
    if (typeof getFundStakePct === 'function' && getFundStakePct(stock) > 0.5) return false;
    const need = MARKET_MIN_FEE.GPW * NH_PROMOTE_FEE_MULT;
    return (Number(stock.quarterlyEarnings) || 0) >= need && (Number(stock.cash) || 0) >= need;
}

// --- E5: urząd antymonopolowy zależny od poziomu (antitrustOffice.level 0–5, rozwijany wydatkami państwa) ---
// Wskaźniki spółki: udział w przychodach sektora głównego (HHI wg kapitalizacji nie nadaje się — jedna spółka ma ≈ 99% kapitalizacji sektora, diagnoza E0),
// udział w przetargach (okno 8 kw. z 0.15.5) i w kapitalizacji rynku. Interwencje tylko w skrajnych przypadkach, najwyżej jedna na kwartał:
// (udział w sektorze liczy się dopiero od 5 spółek i po wzroście o ≥ 25 pp: giganci mają dominację od początku gry)
// 2 kwartały ponad progiem → kara (2–5% rocznych przychodów, nie więcej niż połowa gotówki) → po 4 kw. nadal ponad progiem: nakaz podziału
// (wymuszone wydzielenie segmentu, wartość dla posiadaczy zachowana) albo, gdy podziału nie da się zrobić, zakaz przejęć na 12 kw.
const ANTITRUST_TIERS = [
    null,                                                           // poziom 0: urząd nie interweniuje
    { sector: 0.85, tender: 0.65, cap: 0.50, fine: 0.02 },
    { sector: 0.80, tender: 0.55, cap: 0.45, fine: 0.035 },
    { sector: 0.75, tender: 0.50, cap: 0.40, fine: 0.05 }
];
const ANTITRUST_MERGER_FACTOR = [1, 0.95, 0.90, 0.85, 0.80, 0.75];   // mnożnik progu blokady fuzji z ustawy antymonopolowej wg poziomu urzędu
const ANTITRUST_MIN_PEERS = 5;          // udział w sektorze liczy się od 5 spółek (w małym sektorze lider ma z natury większość)
const ANTITRUST_GROWTH = 0.25;           // udział w sektorze liczy się, gdy wzrósł o ≥ 25 pp w stosunku do stanu sprzed ANTITRUST_BASE_QUARTERS (giganci mają dominację od startu gry — to nie nadużycie)
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
    noteAntitrust(stock, 'fine', fine, `⚖️ Urząd Antymonopolowy karze ${stock.name} (${stock.symbol}) za dominację na rynku: ${formatZl(fine, 0)} (${formatNumberPl((tier.fine * 100), 1)}% rocznych przychodów).`);
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
    const text = `📰 ZDEMASKOWANO: gazeta ${daughter.name} (spółka zależna ${parent.name}) publikowała nieprawdziwe informacje${rival ? ` o ${rival.name}` : ""}. Kara ${formatZl(fine, 0)}, wiarygodność gazety spada do ${formatNumberPl((daughter.mediaCred * 100), 0)}%, kurs ${parent.name} −3%.`;
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
    const body = `Źródło: gazeta ${daughter.name}, spółka zależna ${parent.name} — redakcja może być przychylna właścicielowi. Wiarygodność źródła: ${formatNumberPl((cred * 100), 0)}%.\n\n${claim}`;
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
    if (id === 'PRV') return 'Włoska Giełda · ryzyko oszustwa';
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
    const noRows = `<li class="empty-li">${renderEmptyState({ icon: 'waga', title: 'Brak interwencji.', text: 'Urząd antymonopolowy wkracza, gdy spółka albo grupa zbyt mocno dominuje na rynku.' })}</li>`; // 0.18.6 O2
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
        <ol class="list-plain text-sm"><li>Start-up w inkubatorze (pula) → debiut: kapitalizacja co najmniej ${money(gpw.cap)} → <strong>główny parkiet ${getMarketLabel('GPW')}</strong>; mniej, ale co najmniej ${money(nh.cap)} → <strong>NewHorizons</strong>.</li>
        <li>Z NewHorizons po ${NH_PROMOTE_MIN_AGE} kw.: awans na GPW (spełnia wymogi), a słaba spółka — <strong>Włoska Giełda</strong> albo wyjście z giełdy jako firma prywatna.</li>
        <li>GPW: spółka poniżej ${pct(LISTING_RETAIN_FACTOR)} wymogu kapitalizacji przez ${LISTING_BELOW_QUARTERS} kw. schodzi na NewHorizons zamiast upadać.</li></ol>
        <div class="bank-grid">${card("rynek", "GPW", "główny parkiet", [["Kapitalizacja", "≥ " + money(gpw.cap)], ["Wolny obrót", "≥ " + pct(gpw.freeFloat)], ["Zysk", profit(gpw)], ["Mnożnik wymogów", "×" + gpw.mult.toFixed(2)]], "Wymogi rosną, gdy rynek jest zatłoczony: ×1,0 do 100 spółek krajowych, ×1,5 przy 125. Ryzyko: standardowe.")}
        ${card("rakieta", "NewHorizons", "rynek wejścia, państwowy operator", [["Kapitalizacja", "≥ " + money(nh.cap)], ["Wolny obrót", "≥ " + pct(nh.freeFloat)], ["Zysk", profit(nh, true)], ["Spółek", String(getEntryMarketCount("NH")) + "/" + NH_CAPACITY]], "Ryzyko podwyższone: zmienność ×" + ENTRY_MARKET_RULES.NH.volatility + ", upadki ×" + ENTRY_MARKET_RULES.NH.failure + ", ale zdarzają się przełomy. Nie inwestują tu ostrożne boty i fundusze; płynność podtrzymuje państwo.")}
        ${card("alert", "Włoska Giełda", "rynek wejścia, ryzyko oszustwa bardzo wysokie", [["Kapitalizacja", "≥ " + money(prv.cap)], ["Wolny obrót", "≥ " + pct(prv.freeFloat)], ["Zysk", profit(prv)], ["Spółek", String(getEntryMarketCount("PRV"))]], "Oszustwa ok. " + PRV_FRAUD_FACTOR + "× częstsze niż na GPW, wykrywane później (" + PRV_DETECTION_RANGE.join("–") + " kw.). Fundusz może tu trzymać najwyżej " + Math.round(PRV_PLAYER_LIMIT * 100) + "% wartości.")}</div>`;
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


// =================================================================================
// 0.18.4 A2: AUDYT I OCENA AAA–D. Audytorzy (Wielka Trójka i małe firmy) to usługa B2B poza giełdą. Ocena ważna 4 kw., szum ±1 stopień
// (Wielka Trójka myli się rzadziej), przekupstwo zawyża ocenę o 2 stopnie; ujawnienie = spadek kursu, kara, utrata licencji audytora, śledztwo.
// Spółki ujawniają tylko oceny ≥ A (błąd selekcji: „brak oceny” często znaczy słaba). Ocena jest bramką awansu na Złotą (≥ BBB) i Platynową (≥ A).
// =================================================================================
const RATING_GRADES = ['D', 'C', 'CCC', 'B', 'BB', 'BBB', 'A', 'A+', 'AA', 'AAA']; // 0.18.7 E0b: A+ (próg Rubinowej)
const RATING_RULES = { validQ: 4, randomPerQ: 2, publicFrom: 'A', bribeChance: 0.03, bribeBoost: 2, revealChance: 0.25, revealDrop: -0.15, fineShare: 0.02, licenseLossQ: 8 };
const AUDITORS = [
    { id: 'aud1', name: 'Biegły & Wspólnicy', big: true, noise: 0.10, scale: 'letters' }, { id: 'aud2', name: 'Bilans Global', big: true, noise: 0.10, scale: 'points' }, { id: 'aud3', name: 'Audyt Centralny', big: true, noise: 0.12, scale: 'stars' },
    { id: 'aud4', name: 'Saldo Plus', big: false, noise: 0.30, scale: 'letters' }, { id: 'aud5', name: 'Rachunek s.c.', big: false, noise: 0.35, scale: 'classes' }, { id: 'aud6', name: 'Księgi Rzetelne', big: false, noise: 0.30, scale: 'points' }
];
// 0.18.7 E5 (makieta 26): skale audytorów — tylko zapis przy wyświetlaniu; gra liczy na RATING_GRADES (indeks 0 = D … 9 = AAA).
// `tip`: przeliczenie w podpowiedzi (część publiczna, od A); A+ to stopień pośredni (punkty 84–87, 3½ gwiazdki, klasa III+).
const RATING_SCALES = {
    letters: { name: 'Skala literowa', tip: 'AAA, AA, A+, A, BBB… Litery jak na skali wspólnej.', marks: RATING_GRADES },
    points: { name: 'Skala punktowa 0–100', tip: '95–100 = AAA, 88–94 = AA, 84–87 = A+, 80–83 = A, poniżej 80 niepubliczna.', marks: ['10', '30', '45', '55', '65', '75', '82', '86', '91', '97'], floors: [0, 25, 40, 50, 60, 70, 80, 84, 88, 95], suffix: '/100' }, // odczyt: przedział od `floors`
    stars: { name: 'Gwiazdki 1–5', tip: '5 gwiazdek = AAA, 4 = AA, 3½ = A+, 3 = A, mniej niepubliczna.', marks: ['0', '½', '1', '1½', '2', '2½', '3', '3½', '4', '5'], suffix: '★' },
    classes: { name: 'Klasy I–V', tip: 'Klasa I = AAA, II = AA, III+ = A+, III = A, IV i V niepubliczne.', marks: ['V−', 'V', 'V+', 'IV−', 'IV', 'IV+', 'III', 'III+', 'II', 'I'], prefix: 'klasa ' }
};
const getAuditorScale = id => RATING_SCALES[getAuditor(id)?.scale] || RATING_SCALES.letters;
const getAuditor = id => AUDITORS.find(a => a.id === id) || null;
/** Ocena w zapisie audytora (np. „90/100”, „4½★”, „klasa I b”). */
function formatAuditorGrade(grade, auditorId) {
    const sc = RATING_SCALES[getAuditor(auditorId)?.scale] || RATING_SCALES.letters, i = ratingIndex(grade);
    return i < 0 ? String(grade) : `${sc.prefix || ''}${sc.marks[i]}${sc.suffix || ''}`;
}
/** Odwrotnie: zapis audytora → ocena na skali wspólnej (punkty: przedział). */
function parseAuditorGrade(text, auditorId) {
    const sc = RATING_SCALES[getAuditor(auditorId)?.scale] || RATING_SCALES.letters;
    const raw = String(text).replace(sc.prefix || '', '').replace(sc.suffix || '', '').trim();
    if (sc.floors) { const v = Number(raw); if (!Number.isFinite(v)) return null; let i = 0; sc.floors.forEach((f, k) => { if (v >= f) i = k; }); return RATING_GRADES[i]; }
    const i = sc.marks.indexOf(raw); return i < 0 ? null : RATING_GRADES[i];
}
/** Podpowiedź porównawcza: „90/100 u Bilans Global ≈ AA”. */
function ratingCompareText(r) { const a = getAuditor(r.auditor); return a?.scale && a.scale !== 'letters' ? `${formatAuditorGrade(r.grade, r.auditor)} u ${a.name} ≈ ${r.grade}` : `${r.grade} u ${a?.name || 'audytora'}`; }
const GATE_BY_TIER = { PLATINUM: 'A' }; // 0.18.7 E0a: ocena tylko od Platynowej (wcześniej Złota ≥ BBB)
let ratingState = { banned: {}, log: [], stats: { audits: 0, bribes: 0, reveals: 0 } };
function resetRatings() { ratingState = { banned: {}, log: [], stats: { audits: 0, bribes: 0, reveals: 0 } }; if (typeof initEsgAuditors === 'function') initEsgAuditors(ratingState); } // 0.18.9 G2: audytorzy z ESG losowani na starcie
function ratingIndex(grade) { return RATING_GRADES.indexOf(grade); }
/** Ocena „prawdziwa” z fundamentów: kondycja, marża, zadłużenie (spółka bez historii: z kondycji). */
function getTrueRatingIndex(stock) {
    const health = Number(stock.financialHealth) || 0, f = stock.fundamentals;
    const h = f?.history?.[f.history.length - 1], margin = h && h.revenue > 0 ? h.ebitda / h.revenue : 0.15;
    const debt = stock.balanceSheet?.assets > 0 ? (stock.balanceSheet.liabilities || 0) / stock.balanceSheet.assets : 0.3;
    const score = 4 + health * 0.6 + (margin - 0.15) * 12 - (debt - 0.35) * 5;
    return Math.max(0, Math.min(RATING_GRADES.length - 1, Math.round(score)));
}
function pickAuditor(stock, renew = false) {
    const q = typeof macro === 'object' ? macro.quarter : 0, list = AUDITORS.filter(a => !(ratingState.banned[a.id] > q));
    if (renew) { const own = list.find(a => getRatings(stock).some(r => r.auditor === a.id)); if (own) return own; } // 0.18.7 E5: audyt zlecony odnawia ocenę u dotychczasowego audytora
    const big = list.filter(a => a.big), wantBig = (stock.price * stock.totalShares) > 2_000_000 || Math.random() < 0.4;
    const pool = wantBig && big.length ? big : list;
    return pool[Math.floor(Math.random() * pool.length)] || AUDITORS[0];
}
/** Audyt spółki: nowa ocena na 4 kw. Zwraca ocenę. */
function auditStock(stock, renew = false) {
    if (!stock || stock.assetType === 'REIT') return null;
    const q = typeof macro === 'object' ? macro.quarter : 0, auditor = pickAuditor(stock, renew);
    let idx = getTrueRatingIndex(stock);
    if (Math.random() < auditor.noise) idx += Math.random() < 0.5 ? -1 : 1;
    const corruption = typeof oversight === 'object' ? Number(oversight?.corruption) || 0 : 0;
    const bribed = !auditor.big && Math.random() < RATING_RULES.bribeChance * (1 + corruption / 50); // w kraju z dużą korupcją przekupstwo częstsze
    if (bribed) { idx += RATING_RULES.bribeBoost; ratingState.stats.bribes++; }
    if (typeof isEsgAuditor === 'function' && isEsgAuditor(auditor.id)) idx += getEsgCreditAdj(auditEsg(stock, auditor.id)); // 0.18.9 G2: audytor z ESG dolicza ryzyko ESG
    idx = Math.max(0, Math.min(RATING_GRADES.length - 1, idx));
    const rating = { grade: RATING_GRADES[idx], q, until: q + RATING_RULES.validQ, auditor: auditor.id, bribed: bribed || undefined };
    stock.ratings = [rating, ...getRatings(stock).filter(r => r.auditor !== auditor.id && r.until > q)]; // 0.18.7 E5: nowa ocena zastępuje tylko ocenę tego audytora; wygasłe znikają
    ratingState.stats.audits++;
    return rating.grade;
}
/** 0.18.7 E5: lista ocen spółki (stary zapis: `stock.rating` staje się pierwszym elementem). */
function getRatings(stock) {
    if (!stock) return [];
    if (stock.rating) { stock.ratings = [stock.rating, ...(stock.ratings || []).filter(r => r.auditor !== stock.rating.auditor)]; delete stock.rating; }
    return stock.ratings || (stock.ratings = []);
}
function getValidRatings(stock, q = (typeof macro === 'object' ? macro.quarter : 0)) { return getRatings(stock).filter(r => r.until > q); }
/** Ocena wiążąca (bramki poziomów, elitarne): najniższa ważna — konserwatywnie, jak u regulatorów (0.18.7 E5). */
function getValidRating(stock, q = (typeof macro === 'object' ? macro.quarter : 0)) { return getValidRatings(stock, q).reduce((lo, r) => (!lo || ratingIndex(r.grade) < ratingIndex(lo.grade) ? r : lo), null); }
/** Oceny publiczne: tylko ≥ A (spółki nie chwalą się słabszymi), od najlepszej. */
function getPublicRatings(stock) { return getValidRatings(stock).filter(r => ratingIndex(r.grade) >= ratingIndex(RATING_RULES.publicFrom)).sort((a, b) => ratingIndex(b.grade) - ratingIndex(a.grade)); }
/** Ocena główna (wiersz listy, karta): środkowa z ocen publicznych (przy parzystej liczbie niższa ze środkowych), inaczej null („brak oceny”). Makieta 26. */
function getPublicRating(stock) { const list = getPublicRatings(stock); return list[Math.floor(list.length / 2)] || null; }
/** Bramka awansu: czy spółka może wejść na poziom `tier` (bez oceny albo za niska → zostaje). */
function meetsRatingGate(stock, tier) {
    const need = GATE_BY_TIER[tier];
    if (!need) return true;
    const r = getValidRating(stock);
    return Boolean(r && ratingIndex(r.grade) >= ratingIndex(need));
}
/** Ujawnienie przekupstwa: spadek kursu, kara dla spółki, audytor traci licencję na 8 kw., wpis o śledztwie policji. Unieważnia tylko tę ocenę (0.18.7 E5). */
function revealBribedRating(stock, rating = getRatings(stock).find(r => r.bribed && !r.revealed)) {
    if (!rating) return;
    const q = typeof macro === 'object' ? macro.quarter : 0, aud = getAuditor(rating.auditor);
    rating.revealed = true; rating.until = q; ratingState.banned[rating.auditor] = q + RATING_RULES.licenseLossQ; ratingState.stats.reveals++;
    if (typeof applyPriceEffect === 'function') applyPriceEffect(stock.symbol, RATING_RULES.revealDrop, 'negative', 'company');
    const fine = Math.round(stock.price * stock.totalShares * RATING_RULES.fineShare);
    // 0.18.5: jak kara UEiE — najpierw kredyt (ensureCompanyCash), bez chwilowo ujemnej gotówki
    if (typeof adjustCompanyCash === 'function') { if (typeof ensureCompanyCash === 'function') ensureCompanyCash(stock, fine, 'Kredyt na karę za przekupiony audyt'); adjustCompanyCash(stock, -fine); if (typeof adjustBalanceSheet === 'function') adjustBalanceSheet(stock, { assets: -fine, retainedEarnings: -fine }); if (typeof coverNegativeCash === 'function') coverNegativeCash(stock); }
    if (typeof recordPayment === 'function') recordPayment(stock, 'external:skarb-panstwa', fine, 'Kara za przekupiony audyt');
    const text = `Afera audytowa: ${aud?.name || 'audytor'} zawyżył ocenę ${stock.name} po łapówce. Spółka płaci karę, audytor traci licencję, sprawą zajmuje się policja.`;
    if (typeof logEvent === 'function') logEvent(text, 'company');
    if (typeof pushNews === 'function') pushNews(text, stock.symbol);
    ratingState.log.push({ q, symbol: stock.symbol, auditor: rating.auditor }); if (ratingState.log.length > 20) ratingState.log.shift();
}
/** Co kwartał: 2 losowe audyty, audyt spółek czekających na awans, możliwe ujawnienie przekupstwa. */
function processRatingsQuarterly() {
    const list = stocks.filter(s => !s.assetType && !s.isBankrupt);
    for (const s of list.filter(s => s.awaitingAudit)) { auditStock(s, true); delete s.awaitingAudit; }
    for (let i = 0; i < RATING_RULES.randomPerQ && list.length; i++) auditStock(list[Math.floor(Math.random() * list.length)]);
    for (const s of list) for (const r of getValidRatings(s)) if (r.bribed && !r.revealed && Math.random() < RATING_RULES.revealChance) revealBribedRating(s, r);
}
function getRatingSnapshot() { return ratingState; }
function applyRatingSnapshot(snap) { resetRatings(); if (snap && typeof snap === 'object') { ratingState = { banned: snap.banned || {}, log: Array.isArray(snap.log) ? snap.log.slice(-20) : [], stats: { audits: 0, bribes: 0, reveals: 0, ...(snap.stats || {}) }, esgAuditors: snap.esgAuditors, noEsg: snap.noEsg, esgJoin: snap.esgJoin || {} }; if (typeof initEsgAuditors === 'function') initEsgAuditors(ratingState, true); } }

// =================================================================================
// 0.18.4 A3: NOWE IPO — audyt → opiekun emisji (bank inwestycyjny, prowizja 3–7%) → cena emisyjna z dyskontem 5–15% → „pop” w hossie;
// w bessie słaba emisja jest wycofywana (spółka czeka kwartał). Wołane z handleSuccessfulIPO (companies.js).
// =================================================================================
const IPO_RULES = { feeRange: [0.03, 0.07], discountRange: [0.05, 0.15], popRange: [0.03, 0.12], withdrawChance: 0.5 };
let ipoStats = { ipos: 0, withdrawn: 0, fees: 0 };
function shouldWithdrawIpo(startup) {
    const phase = typeof getMarketRegime === 'function' ? getMarketRegime('home')?.phase : null;
    return ['bear', 'capitulation'].includes(phase) && (Number(startup.successChance) || 0.5) < 0.6 && Math.random() < IPO_RULES.withdrawChance;
}
function applyIpoProcess(startup, raised) {
    const grade = auditStock(startup), gi = ratingIndex(grade);
    const banks = typeof commercialBanks === 'object' ? commercialBanks.filter(b => b.isActive && !b.isParabank && b.type === BANK_TYPES.INVESTMENT) : [];
    const bank = banks.length ? banks[Math.floor(Math.random() * banks.length)] : null;
    const fee = Math.round(Math.max(0, raised) * (IPO_RULES.feeRange[0] + Math.random() * (IPO_RULES.feeRange[1] - IPO_RULES.feeRange[0])) * 0.25); // prowizja od części oferowanej (ok. ¼ akcji)
    if (bank && fee > 0 && typeof adjustCompanyCash === 'function') { adjustCompanyCash(startup, -fee); if (typeof adjustBalanceSheet === 'function') adjustBalanceSheet(startup, { assets: -fee, retainedEarnings: -fee }); bank.cash = (Number(bank.cash) || 0) + fee; if (typeof recordPayment === 'function') recordPayment(startup, bank.id, fee, 'Prowizja opiekuna emisji (IPO)'); ipoStats.fees += fee; }
    const phase = typeof getMarketRegime === 'function' ? getMarketRegime('home')?.phase : null;
    const bear = ['bear', 'capitulation'].includes(phase), hot = ['euphoria', 'bull'].includes(phase);
    const [dl, dh] = IPO_RULES.discountRange, discount = Math.min(dh, Math.max(dl, 0.10 - (gi - 5) * 0.015 + (bear ? 0.04 : 0)));
    const pop = hot ? IPO_RULES.popRange[0] + Math.random() * (IPO_RULES.popRange[1] - IPO_RULES.popRange[0]) : 0;
    startup.price = Math.max(0.01, startup.price * (1 - discount) * (1 + pop));
    startup.ipo = { grade, underwriter: bank?.id || null, fee, discount: Math.round(discount * 1000) / 1000, pop: Math.round(pop * 1000) / 1000 };
    ipoStats.ipos++;
    return startup.ipo;
}

// =================================================================================
// 0.18.4 A4 (Z13): HISTORIA LICZBY SPÓŁEK NA GIEŁDACH (łącznie, według poziomu) — co kwartał, do wykresu i eksportu CSV.
// =================================================================================
let listingHistory = [];
function recordListingHistoryQuarterly() {
    const q = typeof macro === 'object' ? macro.quarter : 0, by = {};
    const list = stocks.filter(s => !s.assetType && !s.isBankrupt);
    for (const s of list) by[s.exchange] = (by[s.exchange] || 0) + 1;
    const foreign = typeof getHomeListedIssuers === 'function' ? getHomeListedIssuers().length : 0;
    listingHistory.push({ q, total: list.length, foreign, by });
    if (listingHistory.length > 120) listingHistory.shift();
}
function getListingHistoryCsv() {
    const tiers = Object.keys(exchanges);
    const head = ['kwartał', 'łącznie', 'obce_na_liście', ...tiers].join(';');
    return [head, ...listingHistory.map(r => [r.q, r.total, r.foreign, ...tiers.map(t => r.by[t] || 0)].join(';'))].join('\n');
}


// =================================================================================
// 0.18.6 O7 (U5): ZAPISY FUNDUSZU GRACZA NA IPO. Udany startup z inkubatora otwiera zapisy na 3 tygodnie gry (stage 'ipoOffer').
// Zapis blokuje gotówkę funduszu (liczy się do NAV); przy debiucie przydział z wolnego obrotu, redukowany proporcjonalnie do popytu
// reszty rynku; nadwyżka wraca. Debiut odłożony (pełna giełda, wycofanie) = pełny zwrot. Pułap: próg wezwania (getTenderThreshold).
// =================================================================================
const IPO_OFFER_RULES = { weeks: 3, demand: [0.6, 3.0], hotDemand: 1.5 };
function openIpoOffer(startup, multiplier) {
    if (!startup || startup.operatorStartup) return false;
    startup.stage = 'ipoOffer';
    startup.ipoOffer = { weeksLeft: IPO_OFFER_RULES.weeks, multiplier, amount: 0, since: typeof macro === 'object' ? macro.quarter : 0 };
    logEvent(`${startup.name}: zapisy na akcje w debiucie potrwają ${IPO_OFFER_RULES.weeks} tygodnie. Fundusz może złożyć zapis w inkubatorze (Internet → Startupy).`, 'market');
    return true;
}
/** Gotówka zablokowana w zapisach (składnik aktywów funduszu, getFundAssets). */
function getFundIpoLockedValue() { return stocks.reduce((sum, s) => sum + (s.stage === 'ipoOffer' ? Number(s.ipoOffer?.amount) || 0 : 0), 0); }
function subscribeIpo(symbol, amount) {
    const startup = stocks.find(s => s.symbol === symbol && s.stage === 'ipoOffer');
    amount = Math.floor(Number(amount));
    if (!startup || !playerFund) return { ok: false, reason: 'Zapisy na tę spółkę są zamknięte.' };
    if (!(amount > 0)) return { ok: false, reason: 'Podaj kwotę zapisu.' };
    if (amount > playerCash) return { ok: false, reason: `Za mało gotówki funduszu (wolne ${formatZl(playerCash, 0)}).` };
    if (typeof canAccessExchange === 'function' && !canAccessExchange('BRONZE', startup)) return { ok: false, reason: 'Debiut jest na Giełdzie Brązowej, do której Twoje stanowisko nie daje dostępu.' };
    playerCash -= amount;
    startup.ipoOffer.amount += amount;
    if (playerProfile?.tasks) playerProfile.tasks.ipoSubscribed = true; // 0.18.7 E2: zadanie „Złóż zapis na IPO”
    return { ok: true, amount: startup.ipoOffer.amount };
}
function subscribeIpoFromUi(symbol) {
    const input = document.getElementById(`ipo-sub-${symbol}`);
    const r = subscribeIpo(symbol, Number(input?.value) * (typeof getBaseScale === 'function' ? getBaseScale() : 1));
    if (typeof showToast === 'function') showToast(r.ok ? `Zapis przyjęty: ${formatZl(r.amount, 0)} zablokowane do przydziału.` : r.reason, r.ok ? 'success' : 'warning');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    if (typeof displayStartups === 'function') displayStartups();
}
/** Przydział po debiucie. `others` = popyt reszty rynku w akcjach (test go podaje, gra losuje). Zwraca { shares, cost, refund }. */
function settleIpoSubscription(startup, amount, others = null) {
    const price = Number(startup.price) || 0, free = Math.max(0, (startup.totalShares || 0) - (startup.sharesHeld || 0));
    const wanted = price > 0 ? Math.floor(amount / price) : 0;
    if (others === null) {
        const phase = typeof getMarketRegime === 'function' ? getMarketRegime('home')?.phase : null;
        others = Math.round(free * getRandomInRange(...IPO_OFFER_RULES.demand) * (['bull', 'euphoria'].includes(phase) ? IPO_OFFER_RULES.hotDemand : 1));
    }
    const ratio = wanted + others > 0 ? Math.min(1, free / (wanted + others)) : 0;
    const held = playerPortfolio[startup.symbol]?.shares || 0;
    const cap = typeof getTenderThreshold === 'function' ? Math.max(0, Math.floor(startup.totalShares * getTenderThreshold()) - 1 - held) : Infinity;
    const shares = Math.max(0, Math.min(Math.floor(wanted * ratio), cap, free));
    const cost = shares * price, refund = amount - cost;
    playerCash += refund;
    if (shares > 0) {
        const h = playerPortfolio[startup.symbol] || { shares: 0, avgPrice: price, assetType: 'stock' };
        h.avgPrice = (h.avgPrice * h.shares + cost) / (h.shares + shares); h.shares += shares;
        playerPortfolio[startup.symbol] = h;
        startup.sharesHeld += shares;
        startup.cash = (Number(startup.cash) || 0) + cost;
    }
    return { shares, cost, refund, ratio };
}
function refundIpoSubscription(startup, why) {
    const amount = Number(startup.ipoOffer?.amount) || 0;
    if (amount > 0) {
        playerCash += amount;
        if (typeof addMail === 'function') addMail({ sender: 'Dom Maklerski', subject: `Zwrot zapisu: ${startup.name}`, body: `${why} Zapis ${formatZl(amount, 0)} wraca w całości na rachunek funduszu.`, importance: 2, symbol: startup.symbol });
    }
    delete startup.ipoOffer;
}
/** Co tydzień: koniec zapisów → debiut i przydział albo zwrot, gdy debiut się nie odbył. */
function processIpoOffersWeekly() {
    for (const startup of stocks.filter(s => s.assetType === 'Startup' && s.stage === 'ipoOffer')) {
        const offer = startup.ipoOffer || (startup.ipoOffer = { weeksLeft: 0, multiplier: 1.5, amount: 0 });
        if (--offer.weeksLeft > 0) continue;
        startup.stage = 'development';
        handleSuccessfulIPO(startup, offer.multiplier);
        if (startup.assetType === 'Startup') { refundIpoSubscription(startup, `Debiut ${startup.name} został odłożony.`); continue; }
        const amount = Number(offer.amount) || 0;
        delete startup.ipoOffer;
        if (!(amount > 0)) continue;
        const r = settleIpoSubscription(startup, amount);
        if (typeof addMail === 'function') addMail({ sender: 'Dom Maklerski', subject: `Przydział akcji: ${startup.name}`, body: `Debiut po ${formatZl(startup.price, 2)}. Zapis ${formatZl(amount, 0)}: przydział ${formatShares(r.shares)} (${formatNumberPl(r.ratio * 100, 0)}% zapisu po redukcji) za ${formatZl(r.cost, 0)}, zwrot ${formatZl(r.refund, 0)}.`, importance: 2, symbol: startup.symbol });
        if (typeof logFundTrade === 'function' && r.shares > 0) logFundTrade(startup.symbol, 'buy');
    }
}


// =================================================================================
// 0.18.7 E0a: POZIOMY GIEŁD BEZ KURSU (kryteria użytkownika 2026-11-18). Kapitalizacja względem mediany rynku (krajowe i obce
// osobno) + free float + zysk netto z 4 kw.; Platynowa wymaga ważnej oceny ≥ A (twarda bramka). Zmiana poziomu najwyżej
// co 2 kwartały (warunek spełniony 2 przeglądy z rzędu); utrata oceny na Platynowej = spadek od razu. Split nie zmienia poziomu.
// =================================================================================
// Kalibracja (seria e0a i gra w roku 6): kwantyle kapitalizacji / mediana — 10%: 0,01, 43%: 0,42, 75%: 8, 93%: 124 (rozkład bardzo skośny);
// progi startowe planu 0,3 / 0,9 / 2,2 / 5 dawały Śmieciową 35% i Platynową z elitarnymi 22%.
const TIER_RULES = { BRONZE: 0.015, SILVER: 0.45, GOLD: 8, PLATINUM: 80, ffSilver: 0.15, ffGold: 0.20, lossQ: 4, junkLossCap: 1.0, confirmQ: 2 };
const TIER_HINTS = {
    JUNK: 'Dostęp zależy od wielkości i zysków spółki.', BRONZE: 'Dostęp zależy od wielkości i zysków spółki.', SILVER: 'Dostęp zależy od wielkości i zysków spółki.', GOLD: 'Dostęp zależy od wielkości i zysków spółki.',
    PLATINUM: 'Dostęp od oceny A. Decydują też wielkość, płynność i zyski spółki.',
    RUBY: 'Dostęp od oceny A+ i stałych zysków.', EMERALD: 'Dostęp od oceny A+ i regularnej dywidendy.', DIAMOND: 'Tylko najlepsza spółka rynku.'
};
let tierMedianCache = { q: null, home: 0, foreign: 0 };
function medianOf(values) { const v = values.filter(x => x > 0).sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : 0; }
/** Mediana kapitalizacji (PLN) spółek krajowych albo obcych z naszej listy; liczona raz na kwartał. */
function getTierMedianCap(kind = 'home') {
    const q = typeof macro === 'object' ? macro.quarter : 0;
    if (tierMedianCache.q !== q) {
        const home = stocks.filter(s => !s.assetType && !s.isBankrupt && s.price > 0).map(s => s.price * (s.totalShares || 0));
        const foreign = typeof getHomeListedIssuers === 'function' ? getHomeListedIssuers().map(i => toPln(i.price * i.shares, i.currency)) : [];
        tierMedianCache = { q, home: medianOf(home), foreign: medianOf(foreign) };
    }
    return tierMedianCache[kind] || 0;
}
function getNetIncome4q(stock) {
    const h = stock?.fundamentals?.history || [];
    return h.length >= 4 ? h.slice(-4).reduce((s, x) => s + (Number(x.netIncome) || 0), 0) : null;
}
function hasLossStreak(stock, n = TIER_RULES.lossQ) { const h = stock?.fundamentals?.history || []; return h.length >= n && h.slice(-n).every(x => (Number(x.netIncome) || 0) < 0); }
/** Poziom docelowy z reguły (bez kursu). `foreign`: spółka obca z naszej listy (bez oceny audytora — Platynowa z wielkości i zysku). */
function getTierTargetKey(stock, foreign = false) {
    const med = getTierMedianCap(foreign ? 'foreign' : 'home');
    if (!(med > 0)) return stock.exchange && exchanges[stock.exchange] && !exchanges[stock.exchange].rankBased ? stock.exchange : 'BRONZE';
    const cap = foreign ? toPln(stock.price * stock.shares, stock.currency) : stock.price * (stock.totalShares || 0), m = cap / med;
    const ff = !foreign && stock.totalShares > 0 ? getFreeFloatShares(stock) / stock.totalShares : 1, ni = getNetIncome4q(stock);
    if (m < TIER_RULES.BRONZE || (hasLossStreak(stock) && m < TIER_RULES.junkLossCap)) return 'JUNK';
    const goldOk = ff >= TIER_RULES.ffGold && (ni === null || ni > 0);
    const sh = 1 + (foreign || typeof getKnfTierShift !== 'function' ? 0 : getKnfTierShift(stock)); // 0.18.7 E0d: KNF przesuwa progi Złotej i Platynowej
    if (m >= TIER_RULES.PLATINUM * sh && goldOk && (foreign || meetsRatingGate(stock, 'PLATINUM'))) return 'PLATINUM';
    if (m >= TIER_RULES.GOLD * sh && goldOk) return 'GOLD';
    if (m >= TIER_RULES.SILVER && ff >= TIER_RULES.ffSilver) return 'SILVER';
    return 'BRONZE';
}
/** Spełnia wszystko na Platynową poza oceną (kandydat do audytu). */
function isPlatinumCandidate(stock) {
    const med = getTierMedianCap('home'), ni = getNetIncome4q(stock);
    return med > 0 && stock.price * (stock.totalShares || 0) / med >= TIER_RULES.PLATINUM && stock.totalShares > 0 && getFreeFloatShares(stock) / stock.totalShares >= TIER_RULES.ffGold && (ni === null || ni > 0);
}
/**
 * Przegląd kwartalny: poziom docelowy z potwierdzeniem przez 2 przeglądy; utrata oceny na Platynowej → spadek od razu.
 * Zwraca klucz nowego poziomu albo null (bez zmiany). Kandydaci na Platynową bez ważnej oceny zamawiają audyt.
 */
function decideTierChange(stock) {
    const current = stock.exchange;
    if ((isPlatinumCandidate(stock) || stock.exchange === 'PLATINUM' || exchanges[stock.exchange]?.rankBased) && !getValidRating(stock, (typeof macro === 'object' ? macro.quarter : 0) + 1)) stock.awaitingAudit = true; // audyt, zanim ocena wygaśnie (kandydaci, Platynowa i elitarne)
    const target = getTierTargetKey(stock);
    if (exchanges[current]?.rankBased) { if (target === 'PLATINUM') { delete stock.tierPending; return null; } }
    if (target === current) { delete stock.tierPending; return null; }
    const ratingLoss = (current === 'PLATINUM' || exchanges[current]?.rankBased) && !meetsRatingGate(stock, 'PLATINUM');
    if (!ratingLoss) {
        stock.tierPending = stock.tierPending?.target === target ? { target, n: stock.tierPending.n + 1 } : { target, n: 1 };
        if (stock.tierPending.n < TIER_RULES.confirmQ) return null;
    }
    delete stock.tierPending;
    return target;
}


// =================================================================================
// 0.18.7 E0c: WYDARZENIA PRZY ZMIANACH POZIOMU — awans, spadek, nowa Diamentowa, utrata Diamentowej. Kurs: awans +2…+4%
// (napływ funduszy indeksowych), spadek −2…−4%, Diamentowa ±5%. Najwyżej 6 wiadomości na kwartał, reszta zbiorczo. Wpis analityka
// na Tied (najwyżej 2 na kwartał), mail do gracza, gdy fundusz albo konto prywatne ma akcje. Bez emoji.
// =================================================================================
const TIER_EVENT_RULES = { maxNews: 6, maxTied: 2, up: [0.02, 0.04], down: [-0.04, -0.02], diamond: 0.05 };
let tierEventBuffer = [];
function noteTierChange(stock, from, to, extra = '') {
    const up = (exchanges[to]?.level ?? 0) > (exchanges[from]?.level ?? 0);
    const kind = to === 'DIAMOND' ? 'diamond-in' : from === 'DIAMOND' ? 'diamond-out' : up ? 'up' : 'down';
    const effect = kind === 'diamond-in' ? TIER_EVENT_RULES.diamond : kind === 'diamond-out' ? -TIER_EVENT_RULES.diamond : getRandomInRange(...(up ? TIER_EVENT_RULES.up : TIER_EVENT_RULES.down));
    if (typeof applyPriceEffect === 'function') applyPriceEffect(stock.symbol, effect, effect > 0 ? 'positive' : 'negative', 'review');
    tierEventBuffer.push({ stock, from, to, kind, extra });
}
function tierChangeText(e) {
    const where = getExchangeAcc(e.to);
    if (e.kind === 'diamond-in') return `${e.stock.name} zostaje spółką Diamentową — najlepszą spółką rynku.${e.extra}`;
    if (e.kind === 'diamond-out') return `${e.stock.name} traci miejsce na Giełdzie Diamentowej i przechodzi na ${where}.${e.extra}`;
    return e.kind === 'up' ? `Awans: ${e.stock.name} przechodzi na ${where}. Fundusze indeksowe dokupują akcje.${e.extra}` : `Spadek: ${e.stock.name} przechodzi na ${where}. Fundusze indeksowe sprzedają akcje.${e.extra}`;
}
/** Koniec przeglądu kwartalnego: wiadomości (≤ 6, reszta zbiorczo), Tied, poczta gracza. */
function flushTierEvents() {
    if (!tierEventBuffer.length) return 0;
    const list = tierEventBuffer.sort((a, b) => (b.kind.startsWith('diamond') ? 2 : 0) - (a.kind.startsWith('diamond') ? 2 : 0) || (exchanges[b.to]?.level ?? 0) - (exchanges[a.to]?.level ?? 0));
    tierEventBuffer = [];
    const heldOf = s => (typeof playerPortfolio === 'object' ? playerPortfolio[s.symbol]?.shares || 0 : 0) + (typeof playerWallet === 'object' ? playerWallet?.portfolio?.[s.symbol]?.shares || 0 : 0);
    if (typeof addMail === 'function') { // makieta 27: jeden wpis Gazety Ekonomicznej na kwartał (≤ 6 opisanych zmian, reszta zbiorczo)
        const lines = list.slice(0, TIER_EVENT_RULES.maxNews).map(e => `• ${tierChangeText(e)}${heldOf(e.stock) ? ` Masz ${formatShares(heldOf(e.stock))}.` : ''}`);
        if (list.length > TIER_EVENT_RULES.maxNews) lines.push(`• Kolejne ${list.length - TIER_EVENT_RULES.maxNews} spółek zmieniło poziom.`);
        addMail({ sender: 'OBSER', subject: `Gazeta Ekonomiczna: przegląd poziomów giełd — ${list.length} ${list.length === 1 ? 'zmiana' : list.length < 5 ? 'zmiany' : 'zmian'}`, body: lines.join('\n'), importance: 1 });
    }
    list.slice(0, TIER_EVENT_RULES.maxNews).forEach(e => logEvent(tierChangeText(e), 'market'));
    if (list.length > TIER_EVENT_RULES.maxNews) logEvent(`Kolejne ${list.length - TIER_EVENT_RULES.maxNews} ${list.length - TIER_EVENT_RULES.maxNews === 1 ? 'spółka zmieniła' : 'spółki zmieniły'} poziom giełdy w tym kwartale.`, 'market');
    if (typeof addTiedPost === 'function') list.filter(e => e.kind !== 'down').slice(0, TIER_EVENT_RULES.maxTied).forEach(e => addTiedPost({ author: getRandomElement(['Marta Wilk', 'Paweł Sowa', 'Ewa Kruk', 'Adam Lis']), role: 'Analityk', symbol: e.stock.symbol, kind: 'opinion', text: `${tierChangeText(e)} Zmiana poziomu zwykle przesuwa popyt funduszy indeksowych na kilka tygodni.` }));
    for (const e of list) {
        const held = (typeof playerPortfolio === 'object' && playerPortfolio[e.stock.symbol]?.shares > 0) || (typeof playerWallet === 'object' && playerWallet?.portfolio?.[e.stock.symbol]?.shares > 0);
        if (held && typeof addMail === 'function') addMail({ sender: 'Dom Maklerski', subject: `Zmiana poziomu: ${e.stock.name}`, body: `${tierChangeText(e)} Masz ${formatShares(heldOf(e.stock))}. Czego się spodziewać: fundusze indeksowe zwykle ${e.kind === 'down' || e.kind === 'diamond-out' ? 'sprzedają' : 'kupują'} przez 1–2 tygodnie; kurs może się zmienić, ale nie musi.`, importance: 2, symbol: e.stock.symbol });
    }
    return list.length;
}


// =================================================================================
// 0.18.7 E0d: KNF ZMIENIA ZASADY WEJŚCIA. Drugi mnożnik wymogów GPW (`knfRules.mult`) i przesunięcie progów Złotej i Platynowej.
// Zapowiedź kwartał wcześniej; spółki już notowane mają 4 kwartały przejściowe. Najwyżej jedna zmiana na 2 lata; siła zależy
// od skuteczności KNF. Zaostrzenie: afera ratingowa, krach, przepełniony rynek; poluzowanie: długa hossa, mało debiutów.
// =================================================================================
const KNF_RULE_RULES = { minGapQ: 8, transitionQ: 4, chance: 0.25, step: [0.10, 0.20], multMin: 0.8, multMax: 1.4, bullQ: 8, lowDebuts: 2 };
function createKnfRules() { return { mult: 1, prevMult: 1, shift: 0, prevShift: 0, pending: null, lastChangeQ: -99, effectiveQ: -99, history: [] }; }
let knfRules = createKnfRules();
const knfQ = () => (typeof macro === 'object' ? Number(macro.quarter) || 0 : 0);
const inKnfTransition = stock => knfQ() < knfRules.effectiveQ + KNF_RULE_RULES.transitionQ && (stock?.marketSinceQ ?? -99) < knfRules.effectiveQ;
/** Mnożnik wymogów GPW od KNF; spółka notowana przed zmianą ma okres przejściowy (łagodniejszy z obu). */
function getKnfListingMult(stock = null) { return stock && inKnfTransition(stock) ? Math.min(knfRules.mult, knfRules.prevMult) : knfRules.mult; }
/** Przesunięcie progów Złotej i Platynowej (ułamek progu kapitalizacji); okres przejściowy jak wyżej. */
function getKnfTierShift(stock = null) { return stock && inKnfTransition(stock) ? Math.min(knfRules.shift, knfRules.prevShift) : knfRules.shift; }
function getKnfEffectiveness() { return typeof getInstitutionEffectiveness === 'function' && typeof oversight === 'object' && oversight?.knf ? getInstitutionEffectiveness(oversight.knf) : 0.5; }
function knfRuleReason() {
    const q = knfQ();
    if ((ratingState?.log || []).some(e => e.q >= q - 2)) return { dir: 1, why: 'po aferze ratingowej' };
    if ((typeof marketCrash === 'object' && marketCrash?.active) || (marketCrash?.startQuarter ?? -99) >= q - 2) return { dir: 1, why: 'po krachu na giełdzie' };
    if (typeof getListedCompanyCount === 'function' && getListedCompanyCount() >= LISTING_MULT_TO) return { dir: 1, why: 'przy przepełnionym rynku' };
    const r = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
    if (r && ['bull', 'euphoria'].includes(r.phase) && (r.quartersInPhase || 0) >= KNF_RULE_RULES.bullQ) return { dir: -1, why: 'w długiej hossie' };
    const debuts = stocks.filter(s => !s.assetType && Number(s.marketSinceQ) >= q - 4).length;
    if (q >= 8 && debuts <= KNF_RULE_RULES.lowDebuts) return { dir: -1, why: 'przy małej liczbie debiutów' };
    return null;
}
function announceKnfRuleChange(dir, why) {
    const step = (KNF_RULE_RULES.step[0] + (KNF_RULE_RULES.step[1] - KNF_RULE_RULES.step[0]) * getKnfEffectiveness()) * dir;
    const mult = Math.max(KNF_RULE_RULES.multMin, Math.min(KNF_RULE_RULES.multMax, knfRules.mult * (1 + step)));
    const shift = Math.max(-0.2, Math.min(0.4, knfRules.shift + step));
    if (Math.abs(mult - knfRules.mult) < 1e-6 && Math.abs(shift - knfRules.shift) < 1e-6) return null;
    knfRules.pending = { dir, why, mult, shift, effectiveQ: knfQ() + 1 };
    const q = knfQ(), now = getListingRequirements('GPW'), ratio = mult / knfRules.mult;
    const text = `KNF ${dir > 0 ? 'zaostrza' : 'łagodzi'} zasady wejścia na GPW ${why}. Obowiązują od ${formatQuarterDate(q + 1)}, spółki już notowane mają okres przejściowy do ${formatQuarterDate(q + 1 + KNF_RULE_RULES.transitionQ)}.`;
    if (typeof logEvent === 'function') logEvent(`KNF ${dir > 0 ? 'zaostrza' : 'łagodzi'} zasady wejścia od ${formatQuarterDate(q + 1)}.`, 'market');
    if (typeof addMail === 'function') addMail({ sender: 'KNF', subject: `Zmiana zasad wejścia na GPW`, importance: 2, // makieta 27: oś czasu + co się zmienia (GPW z liczbami, poziomy bez liczb)
        body: `${text}\nOś czasu: ogłoszenie ${formatQuarterDate(q)} → obowiązuje od ${formatQuarterDate(q + 1)} → koniec okresu przejściowego ${formatQuarterDate(q + 1 + KNF_RULE_RULES.transitionQ)}.\nCo się zmienia:\n• GPW, kapitalizacja: ${formatZl(now.cap, 0)} → ${formatZl(now.cap * ratio, 0)}\n• GPW, free float: ${formatNumberPl(now.freeFloat * 100, 0)}% → ${formatNumberPl(Math.min(0.5, now.freeFloat * ratio) * 100, 0)}%\n• Złota i Platynowa: ${dir > 0 ? 'wyższy' : 'niższy'} próg wielkości` });
    return knfRules.pending;
}
/** Co kwartał: wejście w życie zapowiedzi albo nowa zapowiedź (najwyżej raz na 2 lata). */
function processKnfRulesQuarterly() {
    const q = knfQ(), p = knfRules.pending;
    if (p && q >= p.effectiveQ) {
        knfRules = { ...knfRules, prevMult: knfRules.mult, prevShift: knfRules.shift, mult: p.mult, shift: p.shift, pending: null, lastChangeQ: q, effectiveQ: q, history: [...knfRules.history, { q, dir: p.dir, why: p.why }].slice(-10) };
        return 'applied';
    }
    if (p || q - knfRules.lastChangeQ < KNF_RULE_RULES.minGapQ || Math.random() >= KNF_RULE_RULES.chance) return null;
    const reason = knfRuleReason();
    return reason ? announceKnfRuleChange(reason.dir, reason.why) : null;
}
function getKnfRulesSnapshot() { return knfRules; }
function applyKnfRulesSnapshot(snap) { knfRules = { ...createKnfRules(), ...(snap && typeof snap === 'object' ? snap : {}) }; }
/** Państwo → Nadzór: obowiązujące wymogi GPW (jawne), bez progów poziomów. */
function renderKnfRulesCard() {
    const req = getListingRequirements('GPW'), last = knfRules.history[knfRules.history.length - 1], p = knfRules.pending;
    return `<article class="bank-card mt-3"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('waga', 20)}</span><div><h4>Zasady wejścia na GPW (KNF)</h4><span class="bank-card-type">wymogi wejścia i utrzymania</span></div></header>
        <dl class="bank-card-rates"><div><dt>Kapitalizacja</dt><dd>od ${formatZl(req.cap, 0)}</dd></div><div><dt>Free float</dt><dd>od ${formatNumberPl(req.freeFloat * 100, 0)}%</dd></div><div><dt>Zysk</dt><dd>${req.profit ? 'wymagany (poza spółkami innowacyjnymi)' : 'nie'}</dd></div></dl>
        <p class="text-sm text-muted">${p ? `Zapowiedź: KNF ${p.dir > 0 ? 'zaostrzy' : 'złagodzi'} zasady od kw. ${p.effectiveQ} (${escapeHtml(p.why)}).` : last ? `Ostatnia zmiana w kw. ${last.q}: ${last.dir > 0 ? 'zaostrzenie' : 'poluzowanie'} ${escapeHtml(last.why)}.` : 'Zasady bez zmian od startu gry.'} Progi wyższych poziomów giełdy nie są jawne.</p></article>`;
}
