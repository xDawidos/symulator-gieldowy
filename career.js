// career.js — Kariera w korporacji (etap C)
//
// Korporacja: budżet z opłat za zarządzanie, boty-zarządcy z własnymi funduszami, ocena zarządu
// co 4 okresy (awanse, zamiany miejsc, degradacje), analitycy, nadzór i konsolidacja funduszy,
// współpraca z wielkimi inwestorami i prezesami spółek, przejęcia firm zarządzających
// (fundusze zewnętrzne = holdingi) na modelu M&A oraz warunki zwycięstwa.

const BOARD_REVIEW_EVERY_PERIODS = 4;
const POSITION_LIMITS = { projectLead: 2, board: 3, ceo: 1 };
const PROMOTION_SCORE = 60;
const WEAK_SCORE = 35;
const VICTORY_TAKEOVERS_REQUIRED = 3;
const EXTERNAL_FIRM_VALUE_PER_AUM = 0.01;       // cena firmy zarządzającej jako % aktywów jej funduszu
const CORPORATION_MANDATE_ASSETS = 2000000;     // mandaty instytucjonalne korporacji — stałe źródło opłat do budżetu
const MEETING_COST = 50;                        // spotkanie z inwestorem (portfel prywatny)
const CEO_LUNCH_COST = 30;                      // lunch z prezesem spółki

const MANAGER_PERSONALITIES = {
    aggressive: { label: 'Agresywny', style: 'momentum', cashTarget: 0.05, positionSize: 0.30 },
    cautious:   { label: 'Ostrożny',  style: 'value',    cashTarget: 0.40, positionSize: 0.12 },
    dividend:   { label: 'Dywidendowy', style: 'dividend', cashTarget: 0.20, positionSize: 0.18 },
    value:      { label: 'Wartościowy', style: 'value',  cashTarget: 0.15, positionSize: 0.20 },
    momentum:   { label: 'Momentum',  style: 'momentum', cashTarget: 0.10, positionSize: 0.22 }
};

const MANAGER_NAMES = ['Kamil Wróbel', 'Natalia Sowa', 'Igor Kruk', 'Julia Lis', 'Oskar Bąk', 'Weronika Czapla', 'Filip Jeż'];

const ANALYST_TYPES = {
    company: { label: 'Analityk spółki', description: 'Wycena godziwa i prognoza EPS w oknie spółki.', hireCost: 150, salary: 20 },
    sector:  { label: 'Analityk sektora', description: 'Wrażliwość sektora na cykl i średnie C/Z.', hireCost: 120, salary: 15 },
    earnings:{ label: 'Analityk wyników', description: 'Szansa pozytywnej niespodzianki w raporcie.', hireCost: 180, salary: 25 }
};

let corporation = null;

// =================================================================================
// KORPORACJA I ZARZĄDCY
// =================================================================================

function getPositionIndex(positionId) {
    return Math.max(0, CAREER_POSITIONS.findIndex(position => position.id === positionId));
}

function createBotFund(startCash) {
    return { cash: startCash, portfolio: {}, units: startCash / 10, trust: 55, periods: [], current: null };
}

function getBotFundNav(fund) {
    let value = Math.max(0, fund.cash);
    for (const symbol in fund.portfolio) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) value += stock.price * fund.portfolio[symbol].shares;
    }
    return fund.units > 0 ? value / fund.units : 0;
}

function getBotFundAssets(fund) {
    return getBotFundNav(fund) * fund.units;
}

function beginBotFundPeriod(fund) {
    const nav = getBotFundNav(fund);
    fund.current = { startNav: nav, startBenchmark: getBenchmarkValue(), peakNav: nav, maxDrawdown: 0, weeklyNavs: [nav] };
}

function createCorporation() {
    const names = [...MANAGER_NAMES].sort(() => Math.random() - 0.5);
    const personalities = Object.keys(MANAGER_PERSONALITIES);
    const count = getRandomIntInRange(3, 5);
    const managers = [];

    for (let i = 0; i < count; i++) {
        // Część botów startuje wyżej — jest kogo przeskakiwać.
        const positionId = i === 0 ? 'board' : i === 1 ? 'senior' : i === 2 ? 'manager' : 'junior';
        const manager = {
            id: `mgr_${i + 1}`,
            name: names[i],
            positionId,
            personality: personalities[i % personalities.length],
            boardReputation: getRandomIntInRange(40, 70),
            weakReviews: 0,
            lastScore: null,
            fund: createBotFund(getRandomIntInRange(8, 30) * 1000)
        };
        beginBotFundPeriod(manager.fund);
        managers.push(manager);
    }

    // Cele dominacji: 3 losowe spośród 4 najmniejszych funduszy zewnętrznych (osiągalne z budżetu).
    const externalSymbols = getExternalRivalFunds()
        .sort((a, b) => getExternalFundValue(a) * a.totalShares - getExternalFundValue(b) * b.totalShares)
        .slice(0, VICTORY_TAKEOVERS_REQUIRED + 1)
        .map(stock => stock.symbol)
        .sort(() => Math.random() - 0.5);

    corporation = {
        version: 1,
        name: playerProfile?.corporation || 'Korporacja Inwestycyjna',
        budget: 50000,
        mandateAssets: CORPORATION_MANDATE_ASSETS,
        managers,
        boardReputation: 50,           // reputacja gracza w zarządzie
        playerWeakReviews: 0,
        lastPlayerScore: null,
        reviews: [],
        analysts: [],
        supervisedManagerId: null,
        acquiredFunds: [],
        takeoverTargets: externalSymbols.slice(0, VICTORY_TAKEOVERS_REQUIRED),
        lastMeetings: {},              // id inwestora / symbol spółki → numer okresu
        milestones: {},
        victory: null
    };

    syncCeoTitle();
    return corporation;
}

/** Fundusze zewnętrzne (rywale): holdingi poza czasopismami. */
function getExternalRivalFunds() {
    return getExternalFunds();
}

function getExternalFirmName(stock) {
    return stock.managedByCorporation ? `${stock.name} (Twoja korporacja)` : `${stock.name} Asset Management`;
}

function getExternalFirmValuation(stock) {
    return Math.round(getExternalFundValue(stock) * stock.totalShares * EXTERNAL_FIRM_VALUE_PER_AUM);
}

function syncCeoTitle() {
    if (corporation && playerProfile) corporation.name = playerProfile.corporation;
}

// =================================================================================
// HANDEL BOTÓW-ZARZĄDCÓW (raz na tydzień gry)
// =================================================================================

function scoreStockForManager(stock, style) {
    const f = stock.fundamentals;
    if (!f || !(f.fairValue > 0) || stock.isTradeLocked) return -Infinity;
    const gap = f.fairValue / stock.price - 1;
    const history = stock.lineHistory || [];
    const past = history.length > 30 ? history[history.length - 30].price : stock.price;
    const momentum = stock.price / past - 1;
    const dividendYield = (stock.lastDividend?.yield || 0) + (stock.dividendPayoutRatio || 0) * 0.02;

    if (style === 'value') return gap;
    if (style === 'momentum') return momentum * 3 + gap * 0.3;
    if (style === 'dividend') return dividendYield * 10 + gap * 0.5;
    return gap;
}

function botBuy(fund, stock, value) {
    const quantity = Math.min(Math.floor(value / stock.price), getAvailableShares(stock));
    if (!(quantity > 0)) return 0;
    const cost = quantity * stock.price;
    if (cost > fund.cash) return 0;

    fund.cash -= cost;
    stock.sharesHeld += quantity;
    const holding = fund.portfolio[stock.symbol] || { shares: 0, avgPrice: 0 };
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + quantity);
    holding.shares += quantity;
    fund.portfolio[stock.symbol] = holding;
    applyTradeImpact(stock, quantity, 1);
    return cost;
}

function botSell(fund, stock, quantity) {
    const holding = fund.portfolio[stock.symbol];
    if (!holding) return 0;
    quantity = Math.min(quantity, holding.shares);
    if (!(quantity > 0) || stock.isTradeLocked) return 0;

    const proceeds = quantity * stock.price;
    fund.cash += proceeds;
    holding.shares -= quantity;
    stock.sharesHeld -= quantity;
    applyTradeImpact(stock, quantity, -1);
    if (holding.shares <= 0) delete fund.portfolio[stock.symbol];
    return proceeds;
}

function runManagerTrading(manager) {
    const fund = manager.fund;
    const def = MANAGER_PERSONALITIES[manager.personality];
    const accessLevel = CAREER_POSITIONS[getPositionIndex(manager.positionId)].exchangeAccessLevel;
    const candidates = stocks.filter(stock =>
        !stock.assetType && !stock.isBankStock && !stock.isBankrupt &&
        (exchanges[stock.exchange]?.level ?? 9) <= accessLevel
    );

    // Sprzedaż: pozycje, które przestały pasować do strategii.
    for (const symbol of Object.keys(fund.portfolio)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (!stock) { delete fund.portfolio[symbol]; continue; }
        if (scoreStockForManager(stock, def.style) < -0.05) botSell(fund, stock, fund.portfolio[symbol].shares);
    }

    // Kupno: najlepsze kandydatury, z zachowaniem docelowej gotówki.
    const assets = getBotFundAssets(fund);
    const ranked = candidates
        .map(stock => ({ stock, score: scoreStockForManager(stock, def.style) }))
        .filter(item => item.score > 0.05)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    for (const { stock } of ranked) {
        const spare = fund.cash - assets * def.cashTarget;
        if (spare <= 0) break;
        const held = (fund.portfolio[stock.symbol]?.shares || 0) * stock.price;
        const room = assets * def.positionSize - held;
        if (room > stock.price) botBuy(fund, stock, Math.min(spare, room));
    }
}

/** Co tydzień: handel, opłaty do budżetu, napływy/odpływy klientów botów wg zaufania. */
function processCorporationWeekly() {
    if (!corporation) return;

    for (const manager of corporation.managers) {
        const fund = manager.fund;
        runManagerTrading(manager);

        // Opłata za zarządzanie → budżet korporacji (minus udział zarządcy, który opuszcza model).
        const fee = Math.min(fund.cash, getBotFundAssets(fund) * MANAGEMENT_FEE_ANNUAL / FUND_WEEKS_PER_YEAR);
        if (fee > 0) {
            fund.cash -= fee;
            const share = fee * CAREER_POSITIONS[getPositionIndex(manager.positionId)].feeShare;
            corporation.budget += fee - share;
            if (corporation.supervisedManagerId === manager.id) {
                // Nadzór kierownika projektu: gracz dostaje udział także z nadzorowanego funduszu.
                const playerShare = fee * getPlayerPosition().feeShare * 0.5;
                corporation.budget -= playerShare;
                playerWallet.cash += playerShare;
            }
        }

        // Zaufanie i przepływy klientów (uproszczony model klientów botów).
        const nav = getBotFundNav(fund);
        const excess = getPeriodReturn(fund.current.startNav, nav) - getPeriodReturn(fund.current.startBenchmark, getBenchmarkValue());
        fund.trust = Math.max(0, Math.min(100, fund.trust + (50 + excess * 400 - fund.trust) * 0.25));
        const flow = getBotFundAssets(fund) * (fund.trust - 50) / 50 * 0.01;
        if (flow > 0) {
            fund.cash += flow;
            fund.units += flow / nav;
        } else if (flow < 0) {
            const payout = Math.min(-flow, fund.cash);
            fund.cash -= payout;
            fund.units -= payout / nav;
        }
        fund.current.weeklyNavs.push(getBotFundNav(fund));
    }

    // Mandaty instytucjonalne i fundusze przejęte przez korporację płacą opłaty do budżetu.
    corporation.budget += (corporation.mandateAssets ?? CORPORATION_MANDATE_ASSETS) * MANAGEMENT_FEE_ANNUAL / FUND_WEEKS_PER_YEAR;
    for (const symbol of corporation.acquiredFunds) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) corporation.budget += getExternalFundValue(stock) * stock.totalShares * MANAGEMENT_FEE_ANNUAL / FUND_WEEKS_PER_YEAR;
    }

    processInvestorInterest();
    processCorporateSubscriptions();
}

/** Tik: obsunięcie funduszy botów. */
function updateCorporationTick() {
    if (!corporation) return;
    for (const manager of corporation.managers) {
        const current = manager.fund.current;
        const nav = getBotFundNav(manager.fund);
        if (nav > current.peakNav) current.peakNav = nav;
        if (current.peakNav > 0) current.maxDrawdown = Math.max(current.maxDrawdown, 1 - nav / current.peakNav);
    }
}

/** Wywoływane przy zamknięciu okresu funduszu gracza. */
function closeCorporationPeriod(playerPeriod) {
    if (!corporation) return;

    for (const manager of corporation.managers) {
        const fund = manager.fund;
        const current = fund.current;
        const nav = getBotFundNav(fund);
        const weekly = [];
        for (let i = 1; i < current.weeklyNavs.length; i++) weekly.push(getPeriodReturn(current.weeklyNavs[i - 1], current.weeklyNavs[i]));

        fund.periods.push({
            number: playerPeriod.number,
            fundReturn: getPeriodReturn(current.startNav, nav),
            benchmarkReturn: playerPeriod.benchmarkReturn,
            volatility: standardDeviation(weekly),
            maxDrawdown: current.maxDrawdown,
            trustEnd: fund.trust
        });
        if (fund.periods.length > 12) fund.periods.shift();
        beginBotFundPeriod(fund);
    }

    checkMilestones(playerPeriod);
    if (playerPeriod.number % BOARD_REVIEW_EVERY_PERIODS === 0) runBoardEvaluation();
}

// =================================================================================
// OCENA ZARZĄDU (co 4 okresy)
// =================================================================================

/** Wynik oceny 0–100: nadwyżka nad GIG, stabilność, zaufanie, pozycja, compliance. Bez wielkości funduszu. */
function computeEvaluationScore(periods, trust, rankBonus = 0, complianceHits = 0) {
    const recent = periods.slice(-BOARD_REVIEW_EVERY_PERIODS);
    if (recent.length === 0) return 50;
    const avg = key => recent.reduce((sum, period) => sum + (Number(period[key]) || 0), 0) / recent.length;
    const excess = avg('fundReturn') - avg('benchmarkReturn');
    const score = 50 + excess * 800 - avg('volatility') * 300 - avg('maxDrawdown') * 100 + (trust - 50) * 0.3 + rankBonus - complianceHits * 5;
    return Math.max(0, Math.min(100, score));
}

function getEvaluationParticipants() {
    const playerPeriods = playerFund?.periods || [];
    let periods = playerPeriods;

    // Kierownik projektu: średnia z własnego i nadzorowanego funduszu.
    const supervised = corporation.managers.find(manager => manager.id === corporation.supervisedManagerId);
    if (supervised) {
        periods = playerPeriods.map((period, index) => {
            const other = supervised.fund.periods[supervised.fund.periods.length - playerPeriods.length + index];
            if (!other) return period;
            return { ...period, fundReturn: (period.fundReturn + other.fundReturn) / 2, volatility: (period.volatility + other.volatility) / 2, maxDrawdown: (period.maxDrawdown + other.maxDrawdown) / 2 };
        });
    }

    const complianceHits = (playerProfile?.cv || []).filter(entry => entry.type === 'compliance' && !entry.reviewed).length;
    return [
        { id: 'player', isPlayer: true, name: playerProfile?.name || 'Ty', positionId: playerProfile.positionId, periods, trust: playerFund?.trust ?? 50, complianceHits },
        ...corporation.managers.map(manager => ({ id: manager.id, manager, name: manager.name, positionId: manager.positionId, periods: manager.fund.periods, trust: manager.fund.trust, complianceHits: 0 }))
    ];
}

function setParticipantPosition(participant, positionId) {
    participant.positionId = positionId;
    if (participant.isPlayer) playerProfile.positionId = positionId;
    else participant.manager.positionId = positionId;
}

function runBoardEvaluation() {
    if (!corporation || !playerProfile) return null;

    const participants = getEvaluationParticipants();
    const byReturn = [...participants].sort((a, b) =>
        b.periods.slice(-4).reduce((s, p) => s + p.fundReturn, 0) - a.periods.slice(-4).reduce((s, p) => s + p.fundReturn, 0));
    const n = participants.length;

    participants.forEach(participant => {
        const rank = byReturn.indexOf(participant);
        const rankBonus = n > 1 ? (n - 1 - rank) / (n - 1) * 10 : 0;
        participant.score = computeEvaluationScore(participant.periods, participant.trust, rankBonus, participant.complianceHits);
        participant.from = participant.positionId;
    });

    applyPositionChanges(participants);

    // Wpisy compliance z tego cyklu zostały uwzględnione.
    (playerProfile.cv || []).forEach(entry => { if (entry.type === 'compliance') entry.reviewed = true; });

    const review = {
        periodNumber: playerFund?.current ? playerFund.current.number - 1 : 0,
        results: participants.map(p => ({ name: p.name, isPlayer: !!p.isPlayer, score: Math.round(p.score), from: p.from, to: p.positionId }))
    };
    corporation.reviews.push(review);
    if (corporation.reviews.length > 10) corporation.reviews.shift();

    const player = participants.find(p => p.isPlayer);
    corporation.lastPlayerScore = player.score;
    corporation.boardReputation = Math.max(0, Math.min(100, corporation.boardReputation + (player.score - 50) * 0.2));

    reportPlayerReview(player);
    syncExchangeAccessWithPosition();
    checkVictory();
    return review;
}

function applyPositionChanges(participants) {
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    const maxIndex = CAREER_POSITIONS.length - 1;

    for (const participant of sorted) {
        const level = getPositionIndex(participant.positionId);

        if (participant.score >= PROMOTION_SCORE && level < maxIndex) {
            const target = CAREER_POSITIONS[level + 1].id;
            const limit = POSITION_LIMITS[target];
            const occupants = participants.filter(p => p !== participant && p.positionId === target);

            if (!limit || occupants.length < limit) {
                setParticipantPosition(participant, target);
            } else {
                // Brak miejsca: zamiana z najsłabszą osobą na tym stanowisku, jeśli wyraźnie lepszy wynik.
                const weakest = occupants.sort((a, b) => a.score - b.score)[0];
                if (weakest && weakest.score < participant.score - 5) {
                    setParticipantPosition(weakest, participant.positionId);
                    setParticipantPosition(participant, target);
                    if (participant.isPlayer && weakest.manager && typeof onColleagueEvent === 'function') onColleagueEvent(weakest.id, 'overtaken');
                }
            }
            resetWeak(participant);
        } else if (participant.score < WEAK_SCORE) {
            const weak = incrementWeak(participant);
            if (weak >= 2 && level > 0) {
                setParticipantPosition(participant, CAREER_POSITIONS[level - 1].id);
                resetWeak(participant);
            }
        } else {
            resetWeak(participant);
        }
    }
}

function incrementWeak(participant) {
    if (participant.isPlayer) return ++corporation.playerWeakReviews;
    return ++participant.manager.weakReviews;
}

function resetWeak(participant) {
    if (participant.isPlayer) corporation.playerWeakReviews = 0;
    else participant.manager.weakReviews = 0;
}

function reportPlayerReview(player) {
    const fromIndex = getPositionIndex(player.from);
    const toIndex = getPositionIndex(player.positionId);
    const position = CAREER_POSITIONS[toIndex].name;
    let text;

    if (toIndex > fromIndex) {
        text = `🎉 Ocena zarządu: ${Math.round(player.score)}/100 — AWANS na stanowisko: ${position}!`;
        playerProfile.cv.push({ type: 'promotion', text: `Awans na stanowisko: ${position} (ocena ${Math.round(player.score)}/100).` });
        corporation.milestones.firstPromotion = corporation.milestones.firstPromotion || Date.now();
    } else if (toIndex < fromIndex) {
        text = `📉 Ocena zarządu: ${Math.round(player.score)}/100 — degradacja na stanowisko: ${position}.`;
        playerProfile.cv.push({ type: 'demotion', text: `Degradacja na stanowisko: ${position}.` });
    } else if (player.score < WEAK_SCORE) {
        text = `⚠️ Ocena zarządu: ${Math.round(player.score)}/100 — ostrzeżenie. Druga słaba ocena z rzędu oznacza degradację${fromIndex === 0 ? ' i utratę premii' : ''}.`;
        if (fromIndex === 0 && corporation.playerWeakReviews >= 2) playerFund.bonusSuspendedUntilPeriod = (playerFund.current?.number || 0) + BOARD_REVIEW_EVERY_PERIODS;
    } else {
        text = `📋 Ocena zarządu: ${Math.round(player.score)}/100 — stanowisko bez zmian (${position}).`;
    }

    logEvent(text, 'review');
    if (typeof showToast === 'function') showToast(text, toIndex > fromIndex ? 'success' : toIndex < fromIndex ? 'error' : 'default', 7000);
}

// =================================================================================
// ANALITYCY (od starszego zarządcy)
// =================================================================================

function canHireAnalysts() {
    return getPositionIndex(playerProfile?.positionId) >= getPositionIndex('senior');
}

function hireAnalyst(type) {
    const def = ANALYST_TYPES[type];
    if (!corporation || !def) return false;
    if (!canHireAnalysts()) { showToast('Analityków zatrudnia się od stanowiska Starszy zarządca.', 'warning'); return false; }
    if (corporation.analysts.some(analyst => analyst.type === type)) { showToast('Masz już takiego analityka.', 'default'); return false; }
    if (playerWallet.cash < def.hireCost) { showToast(`Zatrudnienie kosztuje ${def.hireCost} zł.`, 'error'); return false; }

    playerWallet.cash -= def.hireCost;
    const stars = getRandomIntInRange(1, 5);
    corporation.analysts.push({ type, stars, salary: def.salary * (0.6 + stars * 0.2) });
    logEvent(`🧑‍💼 Zatrudniono: ${def.label} (${'★'.repeat(stars)}).`, 'review');
    return true;
}

function payAnalystSalaries() {
    if (!corporation) return;
    for (const analyst of [...corporation.analysts]) {
        if (playerWallet.cash >= analyst.salary) {
            playerWallet.cash -= analyst.salary;
        } else {
            corporation.analysts = corporation.analysts.filter(item => item !== analyst);
            logEvent(`👋 ${ANALYST_TYPES[analyst.type].label} odchodzi — brak środków na pensję.`, 'review');
        }
    }
}

function getAnalyst(type) {
    return corporation?.analysts.find(analyst => analyst.type === type) || null;
}

/** Wgląd analityków dla spółki (szum zależny od gwiazdek). */
function getAnalystInsights(stock) {
    const insights = [];
    const noise = stars => 1 + gaussianRandom() * (6 - stars) * 0.02;
    const f = stock.fundamentals;

    const company = getAnalyst('company');
    if (company && f) {
        insights.push(`Analityk spółki (${'★'.repeat(company.stars)}): wartość godziwa ≈ ${(f.fairValue * noise(company.stars)).toFixed(2)} zł, prognoza EPS na kwartał ≈ ${(f.expectedEps * noise(company.stars)).toFixed(3)} zł.`);
    }
    const sector = getAnalyst('sector');
    if (sector) {
        const profile = getSectorProfile(stock);
        insights.push(`Analityk sektora (${'★'.repeat(sector.stars)}): wrażliwość na cykl ${profile.beta.toFixed(1)}, typowe C/Z ${profile.pe.toFixed(0)}, faza: ${getEconomyPhaseInfo().name}.`);
    }
    const earnings = getAnalyst('earnings');
    if (earnings && f) {
        const trend = (Number(stock.financialHealth) || 0) * 0.08 + getSectorProfile(stock).beta * getGdpDriver() * 20;
        const chance = Math.max(0.05, Math.min(0.95, 0.5 + trend + gaussianRandom() * (6 - earnings.stars) * 0.03));
        insights.push(`Analityk wyników (${'★'.repeat(earnings.stars)}): szansa pozytywnej niespodzianki ≈ ${(chance * 100).toFixed(0)}%.`);
    }
    return insights;
}

// =================================================================================
// NADZÓR I KONSOLIDACJA (od kierownika projektu)
// =================================================================================

function canSuperviseFunds() {
    return getPositionIndex(playerProfile?.positionId) >= getPositionIndex('projectLead');
}

function superviseManagerFund(managerId) {
    if (!canSuperviseFunds()) { showToast('Nadzór nad drugim funduszem od stanowiska Kierownik projektu.', 'warning'); return false; }
    const manager = corporation.managers.find(item => item.id === managerId);
    if (!manager || getPositionIndex(manager.positionId) >= getPositionIndex(playerProfile.positionId)) {
        showToast('Możesz nadzorować tylko fundusz osoby na niższym stanowisku.', 'warning');
        return false;
    }
    corporation.supervisedManagerId = managerId;
    onColleagueEvent(managerId, 'supervise');
    logEvent(`👔 Przejmujesz nadzór nad funduszem: ${manager.name}.`, 'review');
    return true;
}

/** Konsolidacja nadzorowanego funduszu z funduszem gracza — za zgodą zarządu. */
function consolidateSupervisedFund(forceApproval = null) {
    const manager = corporation?.managers.find(item => item.id === corporation.supervisedManagerId);
    if (!manager) { showToast('Najpierw przejmij nadzór nad funduszem.', 'warning'); return false; }

    const approval = forceApproval ?? (Math.random() < 0.3 + corporation.boardReputation / 150);
    if (!approval) {
        corporation.boardReputation = Math.max(0, corporation.boardReputation - 3);
        logEvent(`🗳️ Zarząd odrzuca konsolidację funduszu ${manager.name}.`, 'review');
        return false;
    }

    const fund = manager.fund;
    const value = getBotFundAssets(fund);
    const nav = getFundNav();

    playerCash += fund.cash;
    for (const [symbol, holding] of Object.entries(fund.portfolio)) {
        const target = playerPortfolio[symbol] || { shares: 0, avgPrice: 0, assetType: 'stock' };
        target.avgPrice = (target.avgPrice * target.shares + holding.avgPrice * holding.shares) / (target.shares + holding.shares);
        target.shares += holding.shares; // sharesHeld bez zmian — akcje tylko zmieniają fundusz
        playerPortfolio[symbol] = target;
    }

    const units = value / nav;
    playerFund.units += units;
    const client = addFundClient('institution', units, nav);
    client.name = `Klienci funduszu ${manager.name}`;

    onColleagueEvent(manager.id, 'consolidate');
    corporation.managers = corporation.managers.filter(item => item !== manager);
    corporation.supervisedManagerId = null;
    playerProfile.cv.push({ type: 'milestone', text: `Konsolidacja funduszu ${manager.name} (${value.toFixed(0)} zł).` });
    logEvent(`🔗 Zarząd zatwierdza konsolidację: fundusz ${manager.name} (${value.toFixed(0)} zł) dołącza do Twojego.`, 'review');
    return true;
}

// =================================================================================
// WSPÓŁPRACA: WIELCY INWESTORZY I PREZESI SPÓŁEK
// =================================================================================

function getBigInvestors() {
    return aiCompetitors.filter(ai => ai.personality !== 'market_maker');
}

function getLastPeriodExcess() {
    const last = playerFund?.periods[playerFund.periods.length - 1];
    return last ? last.fundReturn - last.benchmarkReturn : 0;
}

/** Nowy klient z zewnątrz kupuje JU po NAV (bez liczenia jako emisja gracza). */
function addOutsideSubscription(type, name, value) {
    const nav = getFundNav();
    if (!(value > 0) || !(nav > 0)) return null;
    const units = value / nav;
    playerCash += value;
    playerFund.units += units;
    playerFund.current.inflow += value;
    const client = addFundClient(type, units, nav);
    client.name = name;
    return client;
}

function meetInvestor(investorId, forceSuccess = null) {
    const investor = aiCompetitors.find(ai => ai.id === investorId);
    if (!investor || !playerFund || !corporation) return false;
    const period = playerFund.current.number;
    if (corporation.lastMeetings[investorId] === period) { showToast('W tym okresie już spotkałeś się z tym inwestorem.', 'default'); return false; }
    if (playerWallet.cash < MEETING_COST) { showToast(`Spotkanie kosztuje ${MEETING_COST} zł.`, 'error'); return false; }

    playerWallet.cash -= MEETING_COST;
    corporation.lastMeetings[investorId] = period;

    const affinity = { calm: 0.1, dividend_chaser: 0.1, pro_investor: 0.05, whale: 0.05, banker: 0.0, reckless: -0.05, yolo_trader: -0.1 }[investor.personality] || 0;
    const chance = Math.max(0.05, Math.min(0.9, 0.2 + (playerFund.trust - 50) / 100 + getLastPeriodExcess() * 5 + affinity));
    const success = forceSuccess ?? (Math.random() < chance);

    if (!success) {
        logEvent(`☕ Spotkanie z ${investor.name}: na razie nie jest zainteresowany Twoim funduszem.`, 'review');
        return false;
    }

    const amount = Math.max(0, Math.min(investor.cash * getRandomInRange(0.05, 0.15), getFundAssets() * 0.5));
    if (!(amount > 1)) return false;
    investor.cash -= amount;
    addOutsideSubscription('investor', investor.name, amount);
    logEvent(`🤝 ${investor.name} kupuje JU Twojego funduszu za ${amount.toFixed(0)} zł!`, 'review');
    return true;
}

function lunchWithCeo(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !corporation) return false;
    const period = playerFund.current.number;
    if (corporation.lastMeetings[symbol] === period) { showToast('Z tym prezesem spotkałeś się już w tym okresie.', 'default'); return false; }
    if (playerWallet.cash < CEO_LUNCH_COST) { showToast(`Lunch kosztuje ${CEO_LUNCH_COST} zł.`, 'error'); return false; }

    playerWallet.cash -= CEO_LUNCH_COST;
    corporation.lastMeetings[symbol] = period;
    changeReputation('player', symbol, getRandomInRange(3, 8));
    logEvent(`🍽️ Lunch z prezesem ${stock.name}: relacje się poprawiają.`, 'review');
    return true;
}

/** Wielcy inwestorzy sami zgłaszają się do funduszu z dobrymi wynikami. */
function processInvestorInterest() {
    if (!playerFund || playerFund.trust < 60 || getLastPeriodExcess() <= 0) return;
    for (const investor of getBigInvestors()) {
        if (Math.random() > 0.03 || investor.cash < 2000) continue;
        const amount = investor.cash * 0.05;
        investor.cash -= amount;
        addOutsideSubscription('investor', investor.name, amount);
        logEvent(`📈 ${investor.name} sam zgłasza się i kupuje JU za ${amount.toFixed(0)} zł.`, 'review');
    }
}

/** Spółki z dobrą opinią o graczu lokują nadwyżki gotówki w JU funduszu. */
function processCorporateSubscriptions() {
    if (!playerFund) return;
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt || stock.isBankStock) continue;
        const reputation = Number(stock.reputation?.player) || 0;
        if (reputation < REPUTATION_LEVELS.CORRECT || stock.cash < 500000 || Math.random() > 0.03) continue;

        const amount = Math.min(stock.cash * 0.02, getFundAssets() * 0.5);
        if (!(amount > 1)) continue;
        adjustCompanyCash(stock, -amount); // gotówka → inwestycja w JU (aktywa bez zmian)
        recordPayment(stock, 'player-fund', amount, 'Lokata spółki w JU funduszu');
        addOutsideSubscription('institution', `${stock.name} (lokata)`, amount);

        // Konflikt interesów: duży udział funduszu w akcjach tej samej spółki.
        const fundShare = (playerPortfolio[stock.symbol]?.shares || 0) / Math.max(1, stock.totalShares);
        if (fundShare > 0.05) playerWallet.complianceRisk++;

        logEvent(`🏢 ${stock.name} lokuje ${amount.toFixed(0)} zł w JU Twojego funduszu (dobre relacje z prezesem).`, 'review');
    }
}

// =================================================================================
// PRZEJĘCIA FIRM ZARZĄDZAJĄCYCH (model M&A: stock.mergerProcess, typ 'fundTakeover')
// =================================================================================

function canProposeTakeovers() {
    return getPositionIndex(playerProfile?.positionId) >= getPositionIndex('board');
}

/**
 * Wniosek o przejęcie: głosowanie zarządu, potem proces M&A na holdingu docelowym
 * (7 etapów, postęp co kwartał w advanceMergerProcess). Cena rezerwowana z budżetu.
 */
function proposeFundTakeover(symbol, forceApproval = null) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!corporation || !stock || !getExternalRivalFunds().includes(stock)) return false;
    if (!canProposeTakeovers()) { showToast('Przejęcia proponuje się od stanowiska Członek zarządu.', 'warning'); return false; }
    if (stock.managedByCorporation || stock.mergerProcess) { showToast('Ta firma jest już przejęta lub w trakcie procesu.', 'default'); return false; }

    const price = getExternalFirmValuation(stock);
    if (corporation.budget < price) {
        logEvent(`🗳️ Zarząd odrzuca przejęcie ${getExternalFirmName(stock)}: budżet ${corporation.budget.toFixed(0)} zł < cena ${price} zł.`, 'review');
        showToast('Za mały budżet korporacji na to przejęcie.', 'error');
        return false;
    }

    const approval = forceApproval ?? (Math.random() < 0.3 + corporation.boardReputation / 200 + (corporation.lastPlayerScore || 50) / 200);
    if (!approval) {
        corporation.boardReputation = Math.max(0, corporation.boardReputation - 3);
        logEvent(`🗳️ Zarząd głosuje przeciw przejęciu ${getExternalFirmName(stock)}.`, 'review');
        return false;
    }

    corporation.budget -= price;
    stock.mergerProcess = {
        type: 'fundTakeover',
        stage: 1,
        progress: 0,
        partnerSymbol: stock.symbol,
        initiatorSymbol: null,
        complications: 0,
        decisionRequired: null,
        costs: 0,
        reservedBudget: price
    };
    logEvent(`🗳️ Zarząd zatwierdza przejęcie ${getExternalFirmName(stock)} za ${price} zł. Rozpoczyna się proces (7 etapów).`, 'review');
    return true;
}

/** Krok procesu przejęcia (wywoływany z advanceMergerProcess co kwartał). */
function advanceFundTakeover(stock) {
    const process = stock.mergerProcess;
    process.progress = Math.min(100, process.progress + 15);
    process.stage = Math.min(7, 1 + Math.floor(process.progress / 15));

    const roll = Math.random();
    if (roll < 0.08) {
        process.complications++;
        const cost = Math.round(process.reservedBudget * 0.05);
        corporation.budget -= cost;
        process.costs += cost;
        logEvent(`⚖️ Komplikacja przy przejęciu ${stock.name}: dodatkowe koszty prawne ${cost} zł.`, 'review');
    } else if (roll < 0.11) {
        corporation.budget += process.reservedBudget;
        stock.mergerProcess = null;
        logEvent(`❌ Przejęcie ${stock.name} upada — zarząd firmy zarządzającej znalazł innego kupca. Środki wracają do budżetu.`, 'review');
        return;
    }

    if (process.progress >= 100) completeFundTakeover(stock);
}

function completeFundTakeover(stock) {
    stock.mergerProcess = null;
    stock.managedByCorporation = true;
    corporation.acquiredFunds.push(stock.symbol);
    corporation.milestones.firstTakeover = corporation.milestones.firstTakeover || Date.now();
    playerProfile.cv.push({ type: 'milestone', text: `Przejęcie firmy zarządzającej: ${stock.name}.` });
    logEvent(`🏆 Przejęto ${stock.name}! Fundusz należy teraz do ${corporation.name}.`, 'review');
    if (typeof showToast === 'function') showToast(`Przejęto ${stock.name}!`, 'success', 7000);
    checkVictory();
}

// =================================================================================
// KAMIENIE MILOWE I ZWYCIĘSTWO
// =================================================================================

function checkMilestones(period) {
    const m = corporation.milestones;
    if (!m.fund100k && getFundAssets() >= 100000) {
        m.fund100k = Date.now();
        playerProfile.cv.push({ type: 'milestone', text: 'Fundusz przekroczył 100 000 zł aktywów.' });
        logEvent('🏅 Kamień milowy: fundusz powyżej 100 000 zł!', 'review');
    }
    const last4 = playerFund.periods.slice(-4);
    if (!m.beatGig4 && last4.length === 4 && last4.every(p => p.fundReturn > p.benchmarkReturn)) {
        m.beatGig4 = Date.now();
        playerProfile.cv.push({ type: 'milestone', text: '4 okresy z rzędu powyżej GIG.' });
        logEvent('🏅 Kamień milowy: 4 okresy z rzędu powyżej GIG!', 'review');
    }
}

function getTakeoverProgress() {
    if (!corporation) return { done: 0, required: VICTORY_TAKEOVERS_REQUIRED };
    const done = corporation.takeoverTargets.filter(symbol => corporation.acquiredFunds.includes(symbol)).length;
    return { done, required: Math.min(VICTORY_TAKEOVERS_REQUIRED, corporation.takeoverTargets.length) };
}

function checkVictory() {
    if (!corporation || corporation.victory) return corporation?.victory || null;
    let type = null;
    if (playerProfile.positionId === 'ceo') type = 'ceo';
    const progress = getTakeoverProgress();
    if (progress.required > 0 && progress.done >= progress.required) type = type || 'domination';

    if (type) {
        corporation.victory = { type, at: Date.now(), periods: playerFund.periods.length, assets: getFundAssets() };
        playerProfile.cv.push({ type: 'milestone', text: type === 'ceo' ? 'ZWYCIĘSTWO: stanowisko CEO.' : 'ZWYCIĘSTWO: dominacja — przejęto wskazane fundusze.' });
        logEvent(type === 'ceo' ? '👑 ZWYCIĘSTWO! Zostajesz CEO korporacji!' : '👑 ZWYCIĘSTWO! Dominacja — przejęto wszystkie wskazane fundusze!', 'review');
        if (typeof showVictoryScreen === 'function') showVictoryScreen(corporation.victory);
    }
    return corporation.victory;
}
