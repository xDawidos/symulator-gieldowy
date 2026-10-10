// mafia.js — Mafia (wersja 0.11.2 „Ciemna Strefa”)
//
// Mafia działa w tle od początku (boty-ryzykanci), ale wydarzenia wobec gracza zaczynają się dopiero po jego
// pierwszym kontakcie („Zadzwoń do przyjaciela” w Szarej strefie). Usługi opłaca fundusz: pożyczka, sabotaż,
// cynk o przekręcie, ochrona (haracz), wejściówka na giełdę elitarną. Odmowa lub niezapłacony haracz = ataki.
// Wpływy mafii (0–1000) w 5 etapach: Szara strefa → Układ → Ośmiornica → Państwo w państwie → Kryzys.
// Kasa mafii to osobny zasób. Od wyższych etapów: spółki-przykrywki, ludzie mafii w zarządach (skimming),
// ratowanie bankrutów za udziały, propozycje nie do odrzucenia. Bruno „Elegant” Gato — bot z ukrytymi pakietami.
// Porażka grozi tylko współpracującemu graczowi (wyrok z oversight.js albo przejęcie funduszu przy 1000 pkt).

const MAFIA_STAGES = [
    { min: 0,   name: 'Szara strefa',        icon: '🌫️' },
    { min: 50,  name: 'Układ',               icon: '🤝' },
    { min: 150, name: 'Ośmiornica',          icon: '🐙' },
    { min: 300, name: 'Państwo w państwie',  icon: '🏴' },
    { min: 600, name: 'Kryzys',              icon: '🔥' }
];
const MAFIA_MAX_INFLUENCE = 1000;
const MAFIA_LOAN_LIMIT = 0.2;            // pożyczka do 20% aktywów funduszu
const MAFIA_LOAN_QUARTERLY_RATE = 0.12;  // ≈ 1% tygodniowo — „preferencyjnie”, dopóki płacisz w terminie
const MAFIA_PROTECTION_FEE = 0.01;       // ochrona: 1% aktywów funduszu na kwartał
const MAFIA_DEFEAT_TIES = 5;
const MAFIA_DEFEAT_INFLUENCE = 950;      // „pełna kontrola” (policja co kwartał trochę ją osłabia)
const FRONT_COMPANY_NAMES = ['Całkowicie Legalna Firma', 'Pralnia Pod Mostem', 'Transport Nocny', 'Hurtownia Owoców Egzotycznych', 'Kantor u Zbyszka'];

let mafia = createMafia();

function createMafia() {
    return {
        contacted: false,
        cash: 5_000_000,
        influence: 0,
        ties: { player: 0 },
        loan: null,            // { owed, dueQuarter }
        protection: false,
        demand: null,          // { type: 'haracz' | 'offer' | 'favor', amount, symbol, shares, price, quarter }
        pumps: [],             // { symbol, quarter, success }
        acquired: {},          // akcje zdobyte przez mafię (do rekwizycji): symbol → liczba
        brunoId: null,
        caponeSymbol: null,
        crisisQuarters: 0,
        defeated: false
    };
}

function ensureMafia() {
    const fresh = createMafia();
    mafia = { ...fresh, ...(mafia || {}) };
    mafia.ties = { ...fresh.ties, ...(mafia.ties || {}) };
    if (!Array.isArray(mafia.pumps)) mafia.pumps = [];
    return mafia;
}

function getMafiaStage() {
    return [...MAFIA_STAGES].reverse().find(stage => mafia.influence >= stage.min);
}

function getMafiaStageIndex() {
    return MAFIA_STAGES.indexOf(getMafiaStage());
}

function addMafiaInfluence(points) {
    mafia.influence = clampValue(mafia.influence + points, 0, MAFIA_MAX_INFLUENCE);
}

function getBruno() {
    return mafia.brunoId ? aiCompetitors.find(ai => ai.id === mafia.brunoId) : null;
}

function isMafiaImmune(stock) {
    return hasCeoTrait(stock, 'niezalezny') || stock?.sector?.includes('Obronność');
}

// =================================================================================
// KONTAKT I BRUNO „ELEGANT” GATO
// =================================================================================

function contactMafia() {
    ensureMafia();
    if (mafia.contacted) return true;
    mafia.contacted = true;
    mafia.ties.player = Math.max(mafia.ties.player, 1);
    addMafiaInfluence(10);
    spawnBruno();
    addMail({ sender: CORPORATION_SENDER, subject: '📞 Ktoś oddzwonił z zastrzeżonego numeru', body: '„Słyszałem, że szukasz przyjaciół. Pan Gato chętnie pomoże. Pamiętaj tylko: przysługi się oddaje.”', importance: 3 });
    logEvent('🕶️ Na rynku pojawia się Bruno „Elegant” Gato. Nikt nie wie, ile ma pieniędzy.', 'market');
    return true;
}

function spawnBruno() {
    if (getBruno()) return getBruno();
    const richest = Math.max(...aiCompetitors.map(ai => (typeof calculateNetWorth === 'function' ? calculateNetWorth(ai) : ai.cash) || 0), 100000);
    const bruno = {
        id: 'mafia_bruno', name: 'Bruno „Elegant” Gato', cash: Math.round(Math.max(richest * 1.5, 5_000_000)), portfolio: {}, loans: [],
        personality: 'mafia_boss', isMafia: true, accessLevel: 7, hasTBillAccess: false, tBills: [], creditScore: 100
    };
    aiCompetitors.push(bruno);
    mafia.brunoId = bruno.id;
    return bruno;
}

/** Bruno kupuje „wszystko po trochu”; od Ośmiornicy manipuluje kursem jednego pakietu (z limitem). */
function runBrunoQuarterly() {
    const bruno = getBruno();
    if (!bruno) return;
    const targets = stocks.filter(s => !s.assetType && !s.isBankrupt && !isMafiaImmune(s) && getAvailableShares(s) > 0);
    for (let i = 0; i < 3 && targets.length; i++) {
        const stock = getRandomElement(targets);
        const budget = bruno.cash * 0.04;
        const quantity = Math.floor(Math.min(getAvailableShares(stock), stock.totalShares * getRandomInRange(0.005, 0.02), budget / Math.max(0.01, stock.price)));
        if (quantity > 0) aiBuyStock(bruno, stock.symbol, quantity);
    }
    if (getMafiaStageIndex() >= 2) {
        const held = Object.keys(bruno.portfolio).map(symbol => stocks.find(s => s.symbol === symbol)).filter(Boolean);
        const stock = held.length ? getRandomElement(held) : null;
        const move = (Math.random() < 0.5 ? 1 : -1) * getRandomInRange(0.02, 0.05); // czarny rynek: ruch z limitem
        if (stock) applyPriceEffect(stock.symbol, move, move > 0 ? 'positive' : 'negative', 'market');
    }
}

// =================================================================================
// USŁUGI DLA GRACZA (płaci fundusz)
// =================================================================================

function requireMafiaContact() {
    if (!mafia.contacted) { showToast('Najpierw musisz mieć „przyjaciół”.', 'warning'); return false; }
    if (mafia.defeated || oversight?.convicted) return false;
    return true;
}

function mafiaTrace(suspicion, corruption, influence, cash = 0) {
    getRecord('player').suspicion += suspicion;
    oversight.pendingCorruption += corruption;
    addMafiaInfluence(influence);
    mafia.cash += cash;
    mafia.ties.player++;
}

function mafiaLoan(amount) {
    if (!requireMafiaContact()) return false;
    amount = Math.floor(Number(amount));
    const limit = Math.floor(getFundAssets() * MAFIA_LOAN_LIMIT);
    if (mafia.loan) { showToast('Najpierw spłać poprzednią „pożyczkę”.', 'warning'); return false; }
    if (!(amount > 0) || amount > limit || amount > mafia.cash) { showToast(`Pan Gato pożycza najwyżej ${formatZl(Math.min(limit, mafia.cash), 0)}.`, 'warning'); return false; }
    mafia.cash -= amount;
    playerCash += amount;
    mafia.loan = { owed: amount, dueQuarter: macro.quarter + 2 };
    mafiaTrace(10, 2, 10);
    logEvent(`💼 Fundusz bierze „pożyczkę” ${formatZl(amount, 0)} — termin: 2 kwartały.`, 'review');
    return true;
}

function repayMafiaLoan() {
    if (!mafia.loan) return false;
    const amount = Math.min(playerCash, mafia.loan.owed);
    if (!(amount > 0)) { showToast('Brak gotówki funduszu.', 'error'); return false; }
    playerCash -= amount;
    mafia.cash += amount;
    mafia.loan.owed -= amount;
    if (mafia.loan.owed <= 1) { mafia.loan = null; logEvent('🤝 „Pożyczka” spłacona. Pan Gato jest zadowolony.', 'review'); }
    return true;
}

function getSabotageCost(stock) {
    return Math.round(Math.max(2000, Math.min(getMarketCapValue(stock) * 0.01, getFundAssets() * 0.05)));
}

function mafiaSabotage(symbol) {
    if (!requireMafiaContact()) return false;
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || stock.assetType) return false;
    if (isMafiaImmune(stock)) { showToast('Na tę spółkę mafia nie ma wpływu.', 'warning'); return false; }
    const cost = getSabotageCost(stock);
    if (playerCash < cost) { showToast(`Sabotaż kosztuje ${formatZl(cost, 0)} z funduszu.`, 'error'); return false; }
    playerCash -= cost;
    recordPayment('player-fund', 'external:szara-strefa', cost, 'Usługi ochroniarskie');
    executeSabotage(stock);
    mafiaTrace(25, 3, 15, cost);
    return true;
}

function executeSabotage(stock) {
    const events = ['pożar w magazynie', 'awaria linii produkcyjnej', 'wyciek danych klientów', 'zatrucie w stołówce zakładowej', 'strajk „z niewiadomych przyczyn”'];
    applyPriceEffect(stock.symbol, -getRandomInRange(0.05, 0.1), 'negative', 'company');
    stock.financialHealth = Math.max(-5, (Number(stock.financialHealth) || 0) - 0.5);
    logEvent(`🔥 ${stock.name}: ${getRandomElement(events)}. Kurs spada.`, 'company');
}

function mafiaTip() {
    if (!requireMafiaContact()) return false;
    const cost = Math.round(Math.max(1500, getFundAssets() * 0.003));
    const pool = stocks.filter(s => !s.assetType && !s.isBankrupt && ['JUNK', 'BRONZE'].includes(s.exchange) && !mafia.pumps.some(p => p.symbol === s.symbol));
    if (!pool.length) { showToast('Na śmieciówce nic się nie kroi.', 'default'); return false; }
    if (playerCash < cost) { showToast(`Cynk kosztuje ${formatZl(cost, 0)}.`, 'error'); return false; }
    playerCash -= cost;
    const stock = getRandomElement(pool);
    const roll = Math.random(); // B1: 50% sukces, 35% porażka, 15% prowokacja policyjna
    mafia.pumps.push({ symbol: stock.symbol, quarter: macro.quarter + 1, outcome: roll < 0.5 ? 'success' : roll < 0.85 ? 'fail' : 'sting' });
    mafiaTrace(20, 2, 10, cost);
    addMail({ sender: CORPORATION_SENDER, subject: '🤫 Cynk', body: `„${stock.name} (${stock.symbol}). W przyszłym kwartale coś się wydarzy. Ja nic nie mówiłem.”`, importance: 3, symbol: stock.symbol });
    return true;
}

function toggleMafiaProtection() {
    if (!requireMafiaContact()) return false;
    mafia.protection = !mafia.protection;
    if (mafia.protection) mafia.ties.player++;
    showToast(mafia.protection ? 'Ochrona wykupiona — haracz pobierany co kwartał.' : 'Rezygnujesz z „ochrony”. Uważaj na siebie.', mafia.protection ? 'success' : 'warning');
    return true;
}

/** Wejściówka: pakiet spółki z giełdy elitarnej „spod lady” (−15%), bez względu na stanowisko. Później przysługa. */
function mafiaEntryTicket(symbol) {
    if (!requireMafiaContact()) return false;
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !['RUBY', 'EMERALD', 'DIAMOND', 'PLATINUM'].includes(stock.exchange)) { showToast('Wejściówki tylko na najwyższe giełdy.', 'warning'); return false; }
    const quantity = Math.floor(Math.min(getAvailableShares(stock), stock.totalShares * 0.02, playerCash / (stock.price * 0.85)));
    if (!(quantity > 0)) { showToast('Brak akcji albo gotówki.', 'warning'); return false; }
    const cost = quantity * stock.price * 0.85;
    playerCash -= cost;
    const holding = playerPortfolio[symbol] || (playerPortfolio[symbol] = { shares: 0, avgPrice: 0, assetType: 'stock' });
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + quantity);
    holding.shares += quantity;
    // B1: akcje zablokowane, dopóki stanowisko nie daje dostępu do tej giełdy.
    if (!canAccessExchange(stock.exchange)) { holding.lockedShares = (holding.lockedShares || 0) + quantity; holding.mafiaLocked = (holding.mafiaLocked || 0) + quantity; }
    stock.sharesHeld += quantity;
    mafia.acquired[symbol] = (mafia.acquired[symbol] || 0) + quantity;
    mafiaTrace(20 + (typeof isGuardProtected === 'function' && isGuardProtected(stock) ? 15 : 0), 3, 15, cost * 0.05); // Gwardia patrzy na ręce
    mafia.demand = { type: 'favor', amount: Math.round(cost * 0.15), quarter: macro.quarter + 1, deadline: macro.quarter + 2 };
    logEvent(`🎟️ Fundusz dostaje „spod lady” ${quantity.toLocaleString('pl-PL')} akcji ${stock.name}. Pan Gato zapamięta przysługę.`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

// =================================================================================
// ŻĄDANIA MAFII: haracz, przysługa, propozycja nie do odrzucenia
// =================================================================================

function answerMafiaDemand(accept) {
    const demand = mafia.demand;
    if (!demand) return false;
    mafia.demand = null;
    if (!accept) { mafiaPunishPlayer(demand.type === 'offer' ? 2 : 1); return true; }
    if (demand.type === 'offer') {
        const holding = playerPortfolio[demand.symbol];
        const bruno = getBruno();
        const shares = Math.min(holding?.shares || 0, demand.shares);
        if (!holding || !bruno || shares <= 0) return true;
        const value = shares * demand.price;
        bruno.cash -= value;
        playerCash += value;
        holding.shares -= shares;
        if (holding.shares <= 0) delete playerPortfolio[demand.symbol];
        const target = bruno.portfolio[demand.symbol] || (bruno.portfolio[demand.symbol] = { shares: 0, avgPrice: 0 });
        target.avgPrice = (target.avgPrice * target.shares + value) / (target.shares + shares);
        target.shares += shares;
        logEvent(`🤝 Fundusz „sprzedaje” Panu Gato ${shares.toLocaleString('pl-PL')} akcji ${demand.symbol} po zaniżonej cenie.`, 'review');
    } else {
        const paid = Math.min(playerCash, demand.amount);
        playerCash -= paid;
        mafia.cash += paid;
        recordPayment('player-fund', 'external:szara-strefa', paid, demand.type === 'haracz' ? 'Usługi ochroniarskie' : 'Konsulting');
    }
    mafia.ties.player++;
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

/** Kara za odmowę: sabotaż spółki z portfela i „kradzież” części gotówki funduszu. */
function mafiaPunishPlayer(severity = 1) {
    const holdings = Object.keys(playerPortfolio).map(symbol => stocks.find(s => s.symbol === symbol && !s.assetType && !isMafiaImmune(s))).filter(Boolean)
        .sort((a, b) => (playerPortfolio[b.symbol].shares * b.price) - (playerPortfolio[a.symbol].shares * a.price));
    if (holdings.length) executeSabotage(holdings[0]);
    const stolen = Math.round(Math.max(0, playerCash) * 0.01 * severity);
    playerCash -= stolen;
    mafia.cash += stolen;
    addMail({ sender: CORPORATION_SENDER, subject: '⚠️ Nieprzyjemna wizyta', body: `Ktoś „pomylił” przelewy funduszu (strata ${formatZl(stolen, 0)})${holdings.length ? `, a w ${holdings[0].name} doszło do incydentu` : ''}. Pan Gato przypomina, że przyjaciół się nie odrzuca.`, importance: 3 });
}

function createMafiaDemand() {
    if (!mafia.contacted || mafia.demand || mafia.defeated) return;
    const stage = getMafiaStageIndex();
    if (stage >= 3 && mafia.ties.player >= 3 && Math.random() < 0.3) {
        const holdings = Object.entries(playerPortfolio).filter(([symbol, h]) => h.assetType === 'stock' && h.shares > 0 && stocks.some(s => s.symbol === symbol && !isMafiaImmune(s)));
        if (holdings.length) {
            const [symbol, h] = getRandomElement(holdings);
            const stock = stocks.find(s => s.symbol === symbol);
            mafia.demand = { type: 'offer', symbol, shares: Math.ceil(h.shares * 0.5), price: stock.price * 0.8, quarter: macro.quarter, deadline: macro.quarter + 1 };
            addMail({ sender: CORPORATION_SENDER, subject: '🌹 Propozycja nie do odrzucenia', body: `Pan Gato chce odkupić połowę Twojego pakietu ${stock.name} po ${formatZl(stock.price * 0.8)} za akcję. Odmowa będzie… nierozsądna.`, importance: 3 });
            return;
        }
    }
    if (!mafia.protection && (stage >= 1 || mafia.ties.player >= 2) && Math.random() < 0.3) {
        mafia.demand = { type: 'haracz', amount: Math.round(getFundAssets() * MAFIA_PROTECTION_FEE * 1.5), quarter: macro.quarter, deadline: macro.quarter + 1 };
        addMail({ sender: CORPORATION_SENDER, subject: '💰 Opłata za „spokój”', body: `Pan Gato przypomina, że w tej okolicy bywa niebezpiecznie. ${formatZl(mafia.demand.amount, 0)} zapewni funduszowi spokój. Odpowiedz w Szarej strefie do końca przyszłego kwartału.`, importance: 3 });
    }
}

// =================================================================================
// CO KWARTAŁ
// =================================================================================

function processMafiaQuarterly() {
    ensureMafia();
    const quarter = macro.quarter;
    const stageBefore = getMafiaStageIndex();

    // B2: termin do końca następnego kwartału, przypomnienie kwartał przed karą.
    if (mafia.demand) {
        const deadline = mafia.demand.deadline ?? mafia.demand.quarter + 1;
        if (quarter > deadline) answerMafiaDemand(false);
        else if (quarter === deadline && typeof showBreakingNews === 'function') showBreakingNews('Pan Gato czeka na odpowiedź — termin mija w tym kwartale (Szara strefa).', false);
    }

    // Boty współpracujące z mafią; wrogie boty zlecają sabotaż spółek gracza.
    for (const ai of aiCompetitors) {
        if (ai.isMafia || !['reckless', 'yolo_trader', 'whale'].includes(ai.personality) || Math.random() > 0.15) continue;
        addMafiaInfluence(6);
        mafia.cash += Math.max(0, ai.cash) * 0.01;
        ai.cash *= 0.99;
        getRecord(ai.id).suspicion += 15;
        if (playerFund && !mafia.protection && typeof getRelation === 'function' && getRelation(ai.id) <= RELATION_HOSTILE) {
            const target = getPlayerCompanies().find(s => !isMafiaImmune(s));
            if (target) { executeSabotage(target); logEvent(`🕶️ Mówi się, że za incydentem w ${target.name} stoi ${ai.name}.`, 'review'); }
        }
    }

    // Pożyczka: odsetki i windykacja.
    if (mafia.loan) {
        mafia.loan.owed *= 1 + MAFIA_LOAN_QUARTERLY_RATE;
        if (quarter > mafia.loan.dueQuarter) {
            const taken = Math.min(Math.max(0, playerCash) * 0.02 + mafia.loan.owed * 0.1, mafia.loan.owed);
            playerCash -= taken;
            mafia.loan.owed -= taken;
            mafia.cash += taken;
            mafiaPunishPlayer(1);
            if (mafia.loan.owed <= 1) mafia.loan = null;
        }
    }
    // Ochrona: haracz co kwartał.
    if (mafia.protection && playerFund) {
        const fee = Math.round(getFundAssets() * MAFIA_PROTECTION_FEE);
        const paid = Math.min(Math.max(0, playerCash), fee);
        playerCash -= paid;
        mafia.cash += paid;
        getRecord('player').suspicion += 5;
        if (paid < fee) { mafia.protection = false; mafiaPunishPlayer(1); }
    }

    // Cynki: przekręt dochodzi do skutku (albo nie).
    for (const pump of mafia.pumps.filter(p => p.quarter <= quarter)) {
        const stock = stocks.find(s => s.symbol === pump.symbol);
        const outcome = pump.outcome || (pump.success ? 'success' : 'fail');
        if (stock && outcome === 'sting') {
            getRecord('player').suspicion += 30;
            logEvent(`🚓 ${stock.name}: „przekręt” okazał się policyjną prowokacją. Śledczy notują, kto kupował.`, 'state');
        } else if (stock) {
            stock.price *= outcome === 'success' ? getRandomInRange(1.4, 1.8) : getRandomInRange(0.55, 0.7);
            logEvent(outcome === 'success' ? `🚀 ${stock.name}: niespodziewany kontrakt — kurs wystrzelił!` : `💥 ${stock.name}: „inwestor strategiczny” zniknął — kurs się załamał.`, 'company');
        }
    }
    mafia.pumps = mafia.pumps.filter(p => p.quarter > quarter);

    releaseMafiaLockedShares();
    runBrunoQuarterly();
    runMafiaInfiltration();
    spawnFrontCompanies();
    runMafiaFeud();
    createMafiaDemand();
    updateGreyZoneBadge();

    // Policja osłabia mafię; kryzys przy najwyższym etapie.
    const police = getInstitutionEffectiveness(oversight.police);
    addMafiaInfluence(Math.min(5, mafia.cash / 5_000_000) - police * 5); // kasa mafii buduje wpływy, policja je zbija
    if (getMafiaStageIndex() >= 4) {
        mafia.crisisQuarters++;
        oversight.pendingCorruption += 3;
        if (Math.random() < 0.25) {
            stocks.filter(s => !s.assetType && !s.isBankrupt).forEach(s => applyPriceEffect(s.symbol, -0.02, 'negative', 'market'));
            logEvent('🔥 Państwo mafijne: inwestorzy zagraniczni wycofują kapitał.', 'state');
        }
    } else mafia.crisisQuarters = 0;

    const stageAfter = getMafiaStageIndex();
    if (stageAfter !== stageBefore) {
        const stage = MAFIA_STAGES[stageAfter];
        logEvent(`${stage.icon} Wpływy mafii: ${stageAfter > stageBefore ? 'rosną' : 'słabną'} — etap „${stage.name}”.`, 'state');
    }

    // Porażka tylko dla współpracującego gracza.
    if (mafia.contacted && mafia.influence >= MAFIA_DEFEAT_INFLUENCE && mafia.ties.player >= MAFIA_DEFEAT_TIES && !mafia.defeated) {
        mafia.defeated = true;
        const overlay = document.getElementById('defeat-overlay');
        const text = overlay?.querySelector('p');
        if (text) text.textContent = 'Mafia przejęła Twój fundusz. Pan Gato dziękuje za współpracę — od dziś to on podejmuje decyzje.';
        if (typeof isGamePaused !== 'undefined' && !isGamePaused && typeof togglePauseGame === 'function') togglePauseGame();
        if (overlay) overlay.hidden = false;
    }
}

/** Ludzie mafii w zarządach: skimming zysków; policja może ich wykryć. */
function runMafiaInfiltration() {
    const stage = getMafiaStageIndex();
    const police = getInstitutionEffectiveness(oversight.police);
    for (const stock of stocks.filter(s => s.mafiaBoard && !s.isBankrupt)) {
        const profit = Math.max(0, Number(stock.quarterlyEarnings) || 0);
        const skim = Math.min(Math.max(0, stock.cash), profit * (stock.mafiaBoard === 'ceo' ? 0.25 : 0.03));
        if (skim > 0) {
            adjustCompanyCash(stock, -skim);
            adjustBalanceSheet(stock, { assets: -skim, retainedEarnings: -skim });
            mafia.cash += skim;
        }
        if (Math.random() < police * 0.5) {
            logEvent(`🚓 Policja zatrzymuje ${stock.mafiaBoard === 'ceo' ? 'prezesa' : 'członka zarządu'} ${stock.name} powiązanego z mafią!`, 'state');
            if (stock.mafiaBoard === 'ceo' && stock.ceo) stock.ceo.traits = (stock.ceo.traits || []).filter(t => t.id !== 'czlonek_mafii');
            stock.mafiaBoard = null;
            applyPriceEffect(stock.symbol, -0.05, 'negative', 'company');
            addMafiaInfluence(-20);
        } else if (stock.mafiaBoard === 'board' && stage >= 2 && Math.random() < 0.15 && stock.ceo) {
            stock.mafiaBoard = 'ceo';
            stock.ceo.traits = [...(stock.ceo.traits || []), { id: 'czlonek_mafii', name: ceoTraits.czlonek_mafii.name, description: ceoTraits.czlonek_mafii.description }];
        }
    }
    if (stage >= 1 && Math.random() < 0.25) {
        const pool = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.mafiaBoard && !isMafiaImmune(s) && !s.isStateOwned && !(typeof isGuardProtected === 'function' && isGuardProtected(s)));
        const stock = pool.length ? getRandomElement(pool) : null;
        if (stock) { stock.mafiaBoard = 'board'; addMafiaInfluence(5); }
    }
}

/** Spółki-przykrywki na Giełdzie Śmieciowej (pierwsza zawsze „Całkowicie Legalna Firma”). */
function spawnFrontCompanies() {
    const fronts = stocks.filter(s => s.mafiaFront && !s.isBankrupt);
    if (getMafiaStageIndex() < 1 || fronts.length >= 3 || Math.random() > 0.15 * getDebutFactor()) return;
    const name = FRONT_COMPANY_NAMES.find(n => !stocks.some(s => s.name === n)) || `${getRandomElement(MEMBER_NAME_PREFIXES)} Usługi`;
    const stock = createListedCompany({ name, symbol: uniqueSymbol(name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CLF'), sector: ['Usługi'], price: getRandomInRange(2, 8), totalShares: 20000, exchange: 'JUNK' });
    stock.mafiaFront = true;
    stocks.push(stock);
    logEvent(`🏢 Na Giełdzie Śmieciowej debiutuje ${stock.name}. Księgowość „bez zarzutu”.`, 'market');
    if (!mafia.caponeSymbol && fronts.length >= 1) {
        const capone = createListedCompany({ name: 'AI Capone Holding', symbol: uniqueSymbol('CAPO'), sector: ['Usługi'], price: getRandomInRange(3, 9), totalShares: 20000, exchange: 'JUNK' });
        capone.mafiaFront = true;
        capone.rivalMafia = true;
        stocks.push(capone);
        mafia.caponeSymbol = capone.symbol;
        logEvent('🎩 AI Capone Holding wchodzi na rynek. Konkurencja dla „pewnych ludzi”?', 'market');
    }
}

/** Porachunki: AI Capone kontra spółki-przykrywki Pana Gato. */
function runMafiaFeud() {
    const capone = stocks.find(s => s.symbol === mafia.caponeSymbol && !s.isBankrupt);
    const front = stocks.find(s => s.mafiaFront && !s.rivalMafia && !s.isBankrupt);
    if (!capone || !front || Math.random() > 0.2) return;
    const [loser, winner] = Math.random() < 0.5 ? [capone, front] : [front, capone];
    applyPriceEffect(loser.symbol, -0.15, 'negative', 'company');
    applyPriceEffect(winner.symbol, 0.05, 'positive', 'company');
    addMafiaInfluence(-5);
    logEvent(`💣 Porachunki: ${winner.name} kontra ${loser.name}. W nocy spłonęły magazyny ${loser.name}.`, 'company');
}

/** Wzrost spółek-przykrywek z wpływami mafii (computeQuarterResults). */
function getMafiaFrontGrowth(stock) {
    return stock?.mafiaFront ? mafia.influence / MAFIA_MAX_INFLUENCE * 0.03 : 0;
}

/** Ratunek bankruta za udziały dla Pana Gato (od Ośmiornicy, 20%). Zwraca true, gdy uratowano. */
function mafiaRescueFromBankruptcy(stock) {
    if (getMafiaStageIndex() < 2 || isMafiaImmune(stock) || Math.random() > 0.2) return false;
    const bruno = getBruno() || spawnBruno();
    const equity = (stock.balanceSheet?.assets || 0) - (stock.balanceSheet?.liabilities || 0);
    const amount = Math.max(0, -equity) + Math.max(0, getMarketCapValue(stock) * 0.02);
    if (mafia.cash < amount) return false;
    mafia.cash -= amount;
    adjustCompanyCash(stock, amount);
    adjustBalanceSheet(stock, { assets: amount, retainedEarnings: amount });
    stock.financialHealth = 0;
    const shares = Math.floor(stock.totalShares * getRandomInRange(0.01, 0.05));
    stock.maxShares = Math.max(Number(stock.maxShares) || 0, stock.totalShares) + shares;
    stock.totalShares += shares;
    stock.sharesHeld += shares;
    const holding = bruno.portfolio[stock.symbol] || (bruno.portfolio[stock.symbol] = { shares: 0, avgPrice: stock.price });
    holding.shares += shares;
    addMafiaInfluence(10);
    logEvent(`🕶️ ${stock.name} w ostatniej chwili znajduje „inwestora”. Bankructwo zażegnane.`, 'company');
    return true;
}

/** Rekwizycja (3. i kolejne wykrycie): akcje zdobyte przez mafię idą na aukcję — ukarany nie licytuje. */
function seizeMafiaAssets() {
    let total = 0;
    for (const [symbol, quantity] of Object.entries(mafia.acquired)) {
        const holding = playerPortfolio[symbol];
        const stock = stocks.find(s => s.symbol === symbol);
        const shares = Math.min(holding?.shares || 0, quantity);
        if (!stock || shares <= 0) continue;
        holding.shares -= shares;
        if (holding.shares <= 0) delete playerPortfolio[symbol];
        const price = stock.price * 0.9;
        const buyer = aiCompetitors.filter(ai => !ai.isMafia && ai.cash >= shares * price).sort(() => Math.random() - 0.5)[0];
        if (buyer) {
            buyer.cash -= shares * price;
            const target = buyer.portfolio[symbol] || (buyer.portfolio[symbol] = { shares: 0, avgPrice: price });
            target.avgPrice = (target.avgPrice * target.shares + shares * price) / (target.shares + shares);
            target.shares += shares;
            governmentTreasury += shares * price;
        } else {
            stock.sharesHeld = Math.max(0, stock.sharesHeld - shares); // nikt nie kupił — akcje wracają do obrotu
        }
        total += shares * price;
    }
    mafia.acquired = {};
    if (total > 0) logEvent(`🔨 Policyjna aukcja: zarekwirowane akcje funduszu sprzedane za ${formatZl(total, 0)} (fundusz nie mógł licytować).`, 'state');
    return total;
}

// =================================================================================
// WIDOK: sekcja mafii w Szarej strefie
// =================================================================================

function renderMafiaSection() {
    ensureMafia();
    const stage = getMafiaStage();
    if (!mafia.contacted) {
        return `<h3 class="mt-4">🕶️ „Przyjaciele”</h3>
            <p class="text-sm text-muted">Mafia działa w tle (etap: ${stage.icon} ${stage.name}). Dopóki nie zadzwonisz, nie interesuje się Twoim funduszem. Po kontakcie pojawią się usługi — i żądania.</p>
            <button class="btn-danger" onclick="contactMafia(); renderGreyZone();">📞 Zadzwoń do „przyjaciela”</button>`;
    }
    const demand = mafia.demand;
    const demandText = demand ? {
        haracz: `Opłata za „spokój”: ${formatZl(demand.amount, 0)}`,
        favor: `Przysługa za wejściówkę: ${formatZl(demand.amount, 0)}`,
        offer: `Propozycja: połowa pakietu ${demand.symbol} po ${formatZl(demand.price)} za akcję`
    }[demand.type] : '';
    const companies = stocks.filter(s => !s.assetType && !s.isBankrupt && !isMafiaImmune(s));
    const elite = stocks.filter(s => !s.assetType && !s.isBankrupt && ['RUBY', 'EMERALD', 'DIAMOND', 'PLATINUM'].includes(s.exchange));
    const option = list => list.map(s => `<option value="${s.symbol}">${escapeHtml(s.name)} (${s.symbol})</option>`).join('');
    return `<h3 class="mt-4">🕶️ Pan Gato</h3>
        <div class="bank-ticker"><div class="bank-ticker-item"><span>Wpływy mafii</span><strong>${stage.icon} ${stage.name}</strong></div>
            <div class="bank-ticker-item"><span>Twoje powiązania</span><strong class="${mafia.ties.player >= MAFIA_DEFEAT_TIES ? 'text-down' : ''}">${mafia.ties.player}</strong></div>
            <div class="bank-ticker-item"><span>„Pożyczka”</span><strong>${mafia.loan ? `${formatZl(mafia.loan.owed, 0)} (termin: ${Math.max(0, mafia.loan.dueQuarter - macro.quarter)} kw.)` : '—'}</strong></div>
            <div class="bank-ticker-item"><span>Ochrona</span><strong>${mafia.protection ? '🛡️ wykupiona' : 'brak'}</strong></div></div>
        ${demand ? `<div class="mafia-demand"><strong>📩 ${escapeHtml(demandText)}</strong>
            <button onclick="answerMafiaDemand(true); renderGreyZone();">Zgadzam się</button>
            <button class="btn-danger" onclick="answerMafiaDemand(false); renderGreyZone();">Odmawiam</button></div>` : ''}
        <div class="grey-grid">
            <article class="grey-card"><h4>💼 „Pożyczka”</h4><p class="text-sm text-muted">Do ${(MAFIA_LOAN_LIMIT * 100).toFixed(0)}% aktywów funduszu, ~1% tygodniowo, termin 2 kwartały. Spóźnienie = windykacja.</p>
                <div class="bank-card-form">${mafia.loan ? `<button onclick="repayMafiaLoan(); renderGreyZone(); displayCash();">Spłać</button>` : `<input type="text" inputmode="numeric" id="mafia-loan" value="${Math.floor(getFundAssets() * 0.1)}" aria-label="Kwota"><button class="btn-danger" onclick="mafiaLoan(parseFloat(document.getElementById('mafia-loan').value)); renderGreyZone(); displayCash();">Pożycz</button>`}</div></article>
            <article class="grey-card"><h4>🔥 Sabotaż</h4><p class="text-sm text-muted">Bardzo negatywne zdarzenie w wybranej spółce (−5…−10%, kondycja). Nie działa na spółki z niezależnym prezesem.</p>
                <div class="bank-card-form"><select id="mafia-sabotage" aria-label="Spółka">${option(companies)}</select><button class="btn-danger" onclick="mafiaSabotage(document.getElementById('mafia-sabotage').value); renderGreyZone(); displayCash();">Zleć</button></div></article>
            <article class="grey-card"><h4>🤫 Cynk</h4><p class="text-sm text-muted">Przekręt na spółce ze śmieciówki: w przyszłym kwartale kurs +40…80% albo −30…45%. Czasem to policyjna prowokacja.</p>
                <div class="bank-card-form"><button class="btn-danger" onclick="mafiaTip(); renderGreyZone(); displayCash();">Kup cynk</button></div></article>
            <article class="grey-card"><h4>🛡️ Ochrona</h4><p class="text-sm text-muted">${(MAFIA_PROTECTION_FEE * 100).toFixed(0)}% aktywów funduszu na kwartał. Chroni przed żądaniami haraczu i atakami wrogich botów.</p>
                <div class="bank-card-form"><button class="${mafia.protection ? 'btn-secondary' : 'btn-danger'}" onclick="toggleMafiaProtection(); renderGreyZone();">${mafia.protection ? 'Zrezygnuj' : 'Wykup ochronę'}</button></div></article>
            <article class="grey-card"><h4>🎟️ Wejściówka</h4><p class="text-sm text-muted">Do 2% akcji spółki z najwyższych giełd −15%. Sprzedasz je dopiero, gdy stanowisko da dostęp do tej giełdy. Przysługa 15%, akcje podlegają rekwizycji.</p>
                <div class="bank-card-form">${elite.length ? `<select id="mafia-ticket" aria-label="Spółka">${option(elite)}</select><button class="btn-danger" onclick="mafiaEntryTicket(document.getElementById('mafia-ticket').value); renderGreyZone(); displayCash();">Załatw</button>` : '<span class="text-xs text-muted">brak spółek</span>'}</div></article>
        </div>`;
}

/** B1: odblokowanie akcji z wejściówki, gdy stanowisko pozwala już handlować na tej giełdzie. */
function releaseMafiaLockedShares() {
    for (const [symbol, holding] of Object.entries(playerPortfolio)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (!holding.mafiaLocked || !stock || !canAccessExchange(stock.exchange)) continue;
        holding.lockedShares = Math.max(0, (holding.lockedShares || 0) - holding.mafiaLocked);
        holding.mafiaLocked = 0;
    }
}

/** B2: znacznik oczekującego żądania na przycisku „Szara strefa”. */
function updateGreyZoneBadge() {
    const button = document.getElementById('open-grey-btn');
    if (!button) return;
    let badge = button.querySelector('.nav-badge-alert');
    if (mafia?.demand) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge-alert'; button.style.position = 'relative'; button.appendChild(badge); }
        badge.textContent = '1';
    } else if (badge) badge.remove();
}
