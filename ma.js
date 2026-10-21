// =================================================================================
// ma.js: Ład korporacyjny: fuzje i przejęcia, obrony, walne zgromadzenia, rada nadzorcza, aktywizm.
// Złączone pliki: ma.js, governance.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## ma.js
// #################################################################################

// ma.js — Fuzje i przejęcia, akcjonariat (etap G)
//
// G2: obrony (pigułka, Biały Rycerz, Pac-Man, negocjacje), wrogie przejęcia z decyzją funduszu,
// emisja ratunkowa z nowymi akcjonariuszami.
// G1: jeden licznik procesu (prowadzi inicjator), etap ≈ 1 kwartał, komplikacje jako dane
// (przeżywają zapis), decyzje AI wg osobowości, walidacja LBO, kara antymonopolowa.
// Wspólny rejestr akcjonariuszy (fundusz, konto prywatne, boty, fundusze botów, holdingi, banki,
// państwo, insiderzy) — używany przez obrony, wrogie przejęcia i walne zgromadzenia.

const MA_STAGE_PROGRESS = 100;            // postęp na kwartał (≈ 1 etap / kwartał)
const MA_POISON_PILL_SLOWDOWN = 0.6;
const MA_MINI_EVENT_CHANCE = 0.15;
const MA_COMPLICATION_CHANCE = 0.18;
const MA_MAJOR_COMPLICATION_AT = 2;
const LBO_MAX_DEBT_TO_ASSETS = 0.8;

// =================================================================================
// AKCJONARIAT
// =================================================================================

/** Lista posiadaczy akcji spółki (pakiety ≥ 1 akcji). */
function getShareholders(stock) {
    const list = [];
    const add = (id, name, kind, shares, entity = null) => { if (shares >= 1) list.push({ id, name, kind, shares, pct: shares / stock.totalShares, entity }); };
    const symbol = stock.symbol;

    add('player', playerProfile?.fundName || 'Twój fundusz', 'player', playerPortfolio[symbol]?.shares || 0);
    add('wallet', 'Twoje konto prywatne', 'wallet', playerWallet?.portfolio?.[symbol]?.shares || 0);
    for (const ai of aiCompetitors) add(ai.id, ai.isMafia ? 'Akcjonariusz nieujawniony' : ai.isGuard ? `🛡️ ${ai.name} (fundusz)` : ai.name, 'ai', ai.portfolio?.[symbol]?.shares || 0, ai); // Bruno Gato ukryty; Gwardia to fundusz
    for (const manager of corporation?.managers || []) add(manager.id, `Fundusz ${manager.name}`, 'botFund', manager.fund.portfolio?.[symbol]?.shares || 0, manager);
    for (const owner of stocks) {
        const quantity = owner.holdingPortfolio?.[symbol]?.quantity || 0;
        if (quantity > 0 && owner.symbol !== symbol) add(owner.symbol, owner.name, 'holding', quantity, owner);
        const stake = owner.equityStakes?.[symbol] || 0;
        if (stake > 0) add(`${owner.symbol}:stake`, owner.name, 'company', stake, owner);
    }
    for (const bank of commercialBanks) add(bank.id, bank.name, 'bank', bank.stockPortfolio?.[symbol]?.shares || 0, bank);
    for (const etf of etfs) add(`etf:${etf.symbol}`, etf.name, 'etf', etf.holdings?.[symbol] || 0, etf);
    if (stock.isStateOwned || stock.stateOwnershipPct > 0) add('state', 'Skarb Państwa', 'state', Math.floor(stock.totalShares * (stock.stateOwnershipPct || 0)));
    add('city', 'Miasto', 'city', Number(stock.cityShares) || 0);
    add('insiders', 'Zarząd i pracownicy', 'insiders', Number(stock.insiderShares) || 0);
    return list.sort((a, b) => b.shares - a.shares);
}

/** Akcjonariusz kontrolujący (> 50%) albo null. */
function findMajorityShareholder(stock) {
    const top = getShareholders(stock)[0];
    return top && top.pct > 0.5 ? top : null;
}

function getFundStakePct(stock) {
    return (playerPortfolio[stock.symbol]?.shares || 0) / Math.max(1, stock.totalShares);
}

// =================================================================================
// PROCES M&A
// =================================================================================

/** Kopia stanu procesu u partnera (cel widzi to samo, ale nie prowadzi procesu). */
function syncPartnerProcess(stock, partner) {
    if (!partner?.mergerProcess || !stock.mergerProcess) return;
    Object.assign(partner.mergerProcess, stock.mergerProcess, { partnerSymbol: stock.symbol });
}

function advanceMergerProcess(stock) {
    if (!stock.mergerProcess) return;
    if (stock.mergerProcess.type === 'fundTakeover') return advanceFundTakeover(stock); // career.js
    const process = stock.mergerProcess;

    // Proces prowadzi wyłącznie inicjator — cel tylko odzwierciedla stan.
    if (process.initiatorSymbol && process.initiatorSymbol !== stock.symbol) return;

    const partner = stocks.find(s => s.symbol === process.partnerSymbol);
    if (!partner || partner.isBankrupt) {
        cancelMerger(stock, 'Partner przestał istnieć lub zbankrutował.');
        if (partner) cancelMerger(partner, 'Partner przestał istnieć lub zbankrutował.');
        return;
    }

    // Stare zapisy: decyzja z funkcjami nie przetrwała — wygeneruj ją ponownie.
    if (process.decisionRequired && !process.decisionRequired.kind) process.decisionRequired = null;
    if (process.decisionRequired) {
        resolvePendingComplication(stock, partner);
        return;
    }

    let speed = MA_STAGE_PROGRESS;
    if (process.defenseActive === 'poisonPill') {
        speed *= MA_POISON_PILL_SLOWDOWN;
        process.costs += Math.round(getMarketCapValue(partner) * 0.002);
        if (Math.random() < getAggressorRetreatChance(stock)) {
            logEvent(`[M&A] 🏳️ ${stock.name} wycofuje się z przejęcia ${partner.name} z powodu „Zatrutej Pigułki”.`, 'company');
            cancelMerger(stock, 'Agresor wycofał ofertę.');
            cancelMerger(partner, 'Agresor wycofał ofertę.');
            return;
        }
    }
    // Sprzeciw akcjonariuszy (głos funduszu przeciw) — co kwartał szansa wycofania agresora.
    if (process.opposition && process.stage < 6 && Math.random() < process.opposition * 0.5) {
        logEvent(`[M&A] 🗳️ ${stock.name} wycofuje ofertę za ${partner.name} — akcjonariusze są przeciw.`, 'company');
        cancelMerger(stock, 'Sprzeciw akcjonariuszy celu.');
        cancelMerger(partner, 'Sprzeciw akcjonariuszy celu.');
        return;
    }
    process.progress = Math.min(100, process.progress + speed);

    const roll = Math.random();
    if (roll < MA_MINI_EVENT_CHANCE) {
        triggerMergerMiniEvent(stock, partner, process);
    } else if (roll < MA_MINI_EVENT_CHANCE + MA_COMPLICATION_CHANCE) {
        process.complications++;
        process.statusMessage = `Etap ${process.stage}: komplikacja nr ${process.complications} 🔴`;
        if (process.complications >= MA_MAJOR_COMPLICATION_AT) {
            handleMajorComplication(stock, partner, process);
            syncPartnerProcess(stock, partner);
            return;
        }
    }

    if (process.progress >= 100) {
        process.stage++;
        process.progress = 0;
        process.complications = 0;
        if (!runMergerStage(stock, partner, process)) return;
    }
    syncPartnerProcess(stock, partner);
    if (typeof displayStocks === 'function') displayStocks(getCurrentInputValues());
}

function getMarketCapValue(stock) {
    return (Number(stock.price) || 0) * (Number(stock.totalShares) || 0);
}

/** Szansa wycofania agresora co kwartał przy pigułce — zależna od osobowości właściciela inicjatora. */
function getAggressorRetreatChance(initiator) {
    const owner = findMajorityShareholder(initiator);
    const personality = owner?.entity?.personality;
    if (personality === 'reckless' || personality === 'yolo_trader') return 0.05;
    if (personality === 'calm' || personality === 'dividend_chaser') return 0.3;
    return 0.15;
}

/** Logika etapu. Zwraca false, gdy proces się zakończył (anulowanie lub finalizacja). */
function runMergerStage(stock, partner, process) {
    switch (process.stage) {
        case 2:
            process.statusMessage = 'Etap 2: negocjacje warunków…';
            return true;
        case 3: {
            process.costs += 5000 + (getMarketCapValue(stock) + getMarketCapValue(partner)) * 0.005;
            process.statusMessage = `Etap 3: strategia i finansowanie (koszty: ${process.costs.toFixed(0)} PLN).`;
            return true;
        }
        case 4:
            process.statusMessage = 'Etap 4: analiza prawna i kontrola antymonopolowa…';
            if (checkAntitrust(stock, partner)) {
                const fine = Math.round(Math.max(0, stock.cash) * (0.01 + (antitrustOffice?.accuracy || 0.2) * 0.04));
                if (fine > 0) {
                    adjustCompanyCash(stock, -fine);
                    adjustBalanceSheet(stock, { assets: -fine, retainedEarnings: -fine });
                    governmentTreasury += fine;
                    logEvent(`⚖️ Urząd antymonopolowy blokuje ${process.type} ${stock.name} → ${partner.name} i nakłada na inicjatora karę ${fine.toLocaleString('pl-PL')} PLN.`, 'state');
                }
                cancelMerger(stock, 'Zablokowane przez urząd antymonopolowy.');
                cancelMerger(partner, 'Zablokowane przez urząd antymonopolowy.');
                return false;
            }
            process.statusMessage = 'Etap 4: analiza prawna zaakceptowana.';
            triggerMergerMiniEvent(stock, partner, process);
            return true;
        case 5:
            process.statusMessage = 'Etap 5: integracja operacyjna…';
            stock.mergerPartnerVisible = true;
            partner.mergerPartnerVisible = true;
            partner.isBeingMerged = true;
            partner.price *= 1.1;
            return true;
        case 6:
            process.statusMessage = 'Etap 6: finalizacja umowy i transfery…';
            partner.canBeTraded = false;
            return true;
        case 7:
            resolveMerger(stock, partner, process);
            return false;
        default:
            process.statusMessage = `Etap ${process.stage}`;
            return true;
    }
}

// =================================================================================
// KOMPLIKACJE (dane zamiast funkcji)
// =================================================================================

const COMPLICATION_OPTIONS = [
    { id: 'cancel', text: 'Anuluj proces (negatywne konsekwencje dla obu firm)' },
    { id: 'expensive', text: 'Kontynuuj mimo wszystko (koszty +25%)' },
    { id: 'stronger', text: 'Wykorzystaj kryzys, by wzmocnić współpracę (30% bonus, 70% anulowanie)' }
];

function handleMajorComplication(stock, partner, process) {
    process.progress = 0;
    process.statusMessage = '🔴 Poważne komplikacje — wymagana decyzja…';
    process.decisionRequired = {
        kind: 'complication',
        question: `Proces ${process.type} między ${stock.name} a ${partner.name} napotkał poważne trudności. Co robimy?`,
        options: COMPLICATION_OPTIONS.map(option => ({ ...option }))
    };
    logEvent(`[M&A] 🔴 Poważne komplikacje w procesie ${stock.name} ↔ ${partner.name} — wymagana decyzja.`, 'warning');
    resolvePendingComplication(stock, partner);
}

/** Kto decyduje: fundusz (> 50% którejś strony) w oknie gry; w innym wypadku od razu właściciel/zarząd. */
function resolvePendingComplication(stock, partner) {
    const process = stock.mergerProcess;
    if (!process?.decisionRequired) return;
    const playerStock = getFundStakePct(stock) > 0.5 ? stock : getFundStakePct(partner) > 0.5 ? partner : null;
    if (playerStock) {
        if (typeof openComplicationModal === 'function') openComplicationModal(playerStock, process.decisionRequired);
        return;
    }
    applyComplicationOption(stock.symbol, chooseComplicationOption(stock));
}

/** Decyzja AI wg osobowości właściciela inicjatora (lub zarządu przy rozproszonym akcjonariacie). */
function chooseComplicationOption(stock) {
    const personality = findMajorityShareholder(stock)?.entity?.personality;
    if (personality === 'reckless' || personality === 'yolo_trader') return 'stronger';
    if (personality === 'calm' || personality === 'dividend_chaser') return Math.random() < 0.6 ? 'cancel' : 'expensive';
    return Math.random() < 0.7 ? 'expensive' : 'cancel';
}

function applyComplicationOption(stockSymbol, optionId) {
    let stock = stocks.find(s => s.symbol === stockSymbol);
    if (!stock?.mergerProcess) return false;
    // Decyzję wykonuje zawsze proces inicjatora.
    const initiator = stocks.find(s => s.symbol === stock.mergerProcess.initiatorSymbol) || stock;
    stock = initiator;
    const process = stock.mergerProcess;
    const partner = stocks.find(s => s.symbol === process.partnerSymbol);
    if (!process?.decisionRequired || !partner) return false;

    process.decisionRequired = null;
    process.complications = 0;
    if (optionId === 'cancel') {
        cancelMerger(stock, 'Anulowano z powodu komplikacji.');
        cancelMerger(partner, 'Anulowano z powodu komplikacji.');
        return true;
    }
    if (optionId === 'expensive') {
        process.costs = (process.costs || 0) * 1.25 + 5000;
        process.statusMessage = 'Kontynuacja mimo wyższych kosztów…';
    } else if (optionId === 'stronger') {
        if (Math.random() < 0.3) {
            triggerMergerMiniEvent(stock, partner, process);
            process.statusMessage = 'Kryzys wzmocnił współpracę!';
        } else {
            cancelMerger(stock, 'Nie udało się przezwyciężyć kryzysu.');
            cancelMerger(partner, 'Nie udało się przezwyciężyć kryzysu.');
            return true;
        }
    }
    syncPartnerProcess(stock, partner);
    return true;
}

function resolveComplicationDecision(stockSymbol, optionId) {
    applyComplicationOption(stockSymbol, optionId);
    if (typeof displayStocks === 'function') displayStocks(getCurrentInputValues());
    const modal = document.getElementById('management-modal');
    if (modal?.style.display === 'block' && typeof openManagementModal === 'function') openManagementModal(stockSymbol);
}

// =================================================================================
// WALIDACJA LBO
// =================================================================================

/** LBO: potrzebny bank-kredytodawca, a zadłużenie po transakcji ≤ 80% aktywów obu spółek. */
function validateLbo(initiator, target, totalCost) {
    const lender = typeof findBestLenderBank === 'function' ? findBestLenderBank(initiator, totalCost) : null;
    if (!lender) return { ok: false, reason: 'żaden bank nie sfinansuje wykupu lewarowanego' };
    const assets = (initiator.balanceSheet?.assets || 0) + (target.balanceSheet?.assets || 0);
    const debt = (initiator.balanceSheet?.liabilities || 0) + (target.balanceSheet?.liabilities || 0) + totalCost;
    if (assets <= 0 || debt / assets > LBO_MAX_DEBT_TO_ASSETS) return { ok: false, reason: `zadłużenie po wykupie przekroczyłoby ${(LBO_MAX_DEBT_TO_ASSETS * 100).toFixed(0)}% aktywów` };
    if ((Number(initiator.financialHealth) || 0) < -1) return { ok: false, reason: 'zbyt słaba kondycja inicjatora' };
    return { ok: true, lender };
}

// =================================================================================
// G2: OBRONY PRZED PRZEJĘCIEM
// =================================================================================

const TAKEOVER_DEFENSES = {
    poisonPill: { label: '🧪 Zatruta pigułka', costPct: 0.05, desc: 'Emisja dla obecnych akcjonariuszy: przejęcie droższe o 20% kapitalizacji, agresor może się wycofać. Kondycja spółki spada.' },
    whiteKnight: { label: '🛡️ Biały Rycerz', costPct: 0.01, desc: 'Przyjazna spółka z sektora składa ofertę z wyższą premią. Agresor podbija albo się wycofuje.' },
    pacMan: { label: '👾 Pac-Man', costPct: 0.01, desc: 'Spółka skupuje 10% akcji agresora (wymaga gotówki ≥ 30% jego kapitalizacji). Agresor broni się albo wycofuje.' },
    negotiate: { label: '🤝 Negocjacje', costPct: 0.005, desc: 'Zarząd żąda premii wyższej o 10–20 pkt proc. Agresor akceptuje albo odchodzi.' }
};
const PAC_MAN_CASH_REQUIREMENT = 0.3;
const PAC_MAN_STAKE = 0.1;

/** Proces przejęcia, w którym spółka jest celem: { process (inicjatora), initiator } albo null. */
function getTakeoverAgainst(target) {
    const own = target?.mergerProcess;
    if (!own || !['przejęcie', 'influenceTakeover'].includes(own.type) || own.initiatorSymbol === target.symbol) return null;
    const initiator = stocks.find(s => s.symbol === own.initiatorSymbol);
    if (!initiator?.mergerProcess) return null;
    return { process: initiator.mergerProcess, initiator };
}

function getDefenseCost(target, type) {
    return Math.round(getMarketCapValue(target) * (TAKEOVER_DEFENSES[type]?.costPct || 0));
}

/** Kto płaci za obronę: fundus gracza, bot albo sama spółka. */
function getDefensePayer(entityId, target) {
    if (entityId === 'player') return { name: playerProfile?.fundName || 'Fundusz', cash: playerCash, pay: amount => { playerCash -= amount; recordPayment('player-fund', 'external:doradcy_ma', amount, `Obrona ${target.symbol}`); } };
    const ai = aiCompetitors.find(a => a.id === entityId);
    if (ai) return { name: ai.name, cash: ai.cash, pay: amount => { ai.cash -= amount; } };
    return {
        name: target.name, cash: target.cash, pay: amount => {
            adjustCompanyCash(target, -amount);
            adjustBalanceSheet(target, { assets: -amount, retainedEarnings: -amount });
            recordPayment(target, 'external:doradcy_ma', amount, 'Obrona przed przejęciem');
        }
    };
}

/** Czy obrona jest dostępna: { ok, reason, cost }. */
function canUseDefense(target, type, entityId = 'player') {
    const pair = getTakeoverAgainst(target);
    if (!pair) return { ok: false, reason: 'spółka nie jest celem przejęcia' };
    if (pair.process.defenseActive && pair.process.defenseActive !== 'none') return { ok: false, reason: 'obrona już użyta' };
    if (!TAKEOVER_DEFENSES[type]) return { ok: false, reason: 'nieznana obrona' };
    const cost = getDefenseCost(target, type);
    if (getDefensePayer(entityId, target).cash < cost) return { ok: false, reason: 'brak gotówki', cost };
    if (type === 'pacMan' && target.cash < getMarketCapValue(pair.initiator) * PAC_MAN_CASH_REQUIREMENT) return { ok: false, reason: 'spółka ma za mało gotówki na kontratak', cost };
    return { ok: true, cost };
}

/** Szansa, że agresor przyjmie warunki (podbicie, wyższa premia) — wg osobowości właściciela. */
function getAggressorPersistence(initiator) {
    const personality = findMajorityShareholder(initiator)?.entity?.personality;
    if (personality === 'reckless' || personality === 'yolo_trader') return 0.7;
    if (personality === 'whale') return 0.6;
    if (personality === 'pro_investor') return 0.45;
    if (personality === 'calm' || personality === 'dividend_chaser') return 0.25;
    return 0.45;
}

function raiseTakeoverOffer(initiator, target, process, extra) {
    const offer = process.offerDetails;
    offer.premium = (offer.premium || 0) + extra;
    offer.buyoutPricePerShare *= (1 + extra);
    offer.totalCost = offer.buyoutPricePerShare * target.totalShares - (offer.prepaid || 0);
}

function syncTakeover(initiator, target) {
    if (initiator.mergerProcess && target.mergerProcess) syncPartnerProcess(initiator, target);
}

function abortTakeover(initiator, target, reason) {
    cancelMerger(initiator, reason);
    if (target.mergerProcess) cancelMerger(target, reason);
}

/**
 * Aktywuje obronę spółki-celu. entityId: 'player' (fundusz z większością), id bota albo 'company' (zarząd).
 * Zwraca true, gdy obrona została użyta.
 */
function activateDefenseMechanism(symbol, defenseType, entityId = 'player') {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    const notify = (text, type = 'warning') => { if (entityId === 'player') showToast(text, type); };
    if (!pair) { notify('Spółka nie jest celem przejęcia.'); return false; }
    if (entityId === 'player' && getFundStakePct(target) <= 0.5) { notify('Obronę uruchamia akcjonariusz większościowy (> 50%).'); return false; }
    const check = canUseDefense(target, defenseType, entityId);
    if (!check.ok) { notify(`Nie można użyć obrony: ${check.reason}.`); return false; }

    const { process, initiator } = pair;
    const payer = getDefensePayer(entityId, target);
    if (check.cost > 0) payer.pay(check.cost);
    process.defenseActive = defenseType;
    process.defenseBy = payer.name;

    switch (defenseType) {
        case 'poisonPill':
            target.financialHealth = Math.max(-5, (Number(target.financialHealth) || 0) - 0.5);
            logEvent(`🧪 ${target.name} aktywuje „Zatrutą Pigułkę” przeciw ${initiator.name} (koszt ${check.cost.toLocaleString('pl-PL')} PLN, płaci: ${payer.name}).`, 'review');
            break;
        case 'negotiate':
            runTakeoverNegotiation(initiator, target, process);
            break;
        case 'whiteKnight':
            runWhiteKnight(initiator, target, process);
            break;
        case 'pacMan':
            runPacMan(initiator, target, process);
            break;
    }
    syncTakeover(initiator, target);
    if (entityId === 'player') {
        if (typeof displayCash === 'function') displayCash();
        refreshTakeoverViews(symbol);
    }
    return true;
}

function runTakeoverNegotiation(initiator, target, process) {
    const demand = 0.1 + Math.random() * 0.1;
    const newTotal = process.offerDetails.buyoutPricePerShare * (1 + demand) * target.totalShares;
    const affordable = process.financing !== 'cash' || initiator.cash >= newTotal;
    if (affordable && Math.random() < getAggressorPersistence(initiator) + 0.2) {
        raiseTakeoverOffer(initiator, target, process, demand);
        logEvent(`🤝 ${initiator.name} przyjmuje żądania ${target.name}: premia rośnie o ${(demand * 100).toFixed(0)} pkt proc. (cena ${process.offerDetails.buyoutPricePerShare.toFixed(2)} PLN).`, 'review');
    } else {
        logEvent(`🤝 ${initiator.name} odrzuca żądania ${target.name} i wycofuje ofertę.`, 'review');
        abortTakeover(initiator, target, 'Agresor odrzucił żądania wyższej premii.');
    }
}

function findWhiteKnight(initiator, target, premium) {
    const cost = target.price * (1 + premium) * target.totalShares;
    return stocks.filter(s => s !== target && s !== initiator && !s.assetType && !s.mergerProcess && !s.isBankrupt
        && !s.isSubsidiaryOf && s.sector?.some(sector => target.sector?.includes(sector))
        && s.cash >= cost * 1.15 && !checkAntitrust(s, target))
        .sort((a, b) => getMarketCapValue(b) - getMarketCapValue(a))[0] || null;
}

function runWhiteKnight(initiator, target, process) {
    const knightPremium = (process.offerDetails.premium || 0.2) + 0.1;
    const knight = findWhiteKnight(initiator, target, knightPremium);
    if (!knight) {
        logEvent(`🛡️ ${target.name} szuka „Białego Rycerza”, ale żadna spółka z sektora nie może złożyć oferty.`, 'review');
        return;
    }
    const counter = 0.15;
    const counterTotal = process.offerDetails.buyoutPricePerShare * (1 + counter) * target.totalShares;
    if ((process.financing !== 'cash' || initiator.cash >= counterTotal) && Math.random() < getAggressorPersistence(initiator)) {
        raiseTakeoverOffer(initiator, target, process, counter);
        logEvent(`🛡️ ${knight.name} staje do walki o ${target.name}, ale ${initiator.name} podbija ofertę o ${(counter * 100).toFixed(0)}% — Rycerz rezygnuje.`, 'review');
        return;
    }
    abortTakeover(initiator, target, `Wygrała przyjazna oferta ${knight.name}.`);
    logEvent(`🛡️ Biały Rycerz: ${knight.name} przejmuje inicjatywę i składa przyjazną ofertę za ${target.name} (premia ${(knightPremium * 100).toFixed(0)}%).`, 'review');
    initiateMergerProcess(knight, target, 'przejęcie', 'cash', knightPremium, { friendly: true });
}

function runPacMan(initiator, target, process) {
    const stakeCost = getMarketCapValue(initiator) * PAC_MAN_STAKE;
    const shares = Math.min(getAvailableShares(initiator), Math.floor(stakeCost / Math.max(0.01, initiator.price)));
    const paid = shares * initiator.price;
    if (shares > 0) {
        adjustCompanyCash(target, -paid); // gotówka → akcje agresora (aktywa bez zmian)
        initiator.sharesHeld += shares;
        if (!target.equityStakes) target.equityStakes = {};
        target.equityStakes[initiator.symbol] = (target.equityStakes[initiator.symbol] || 0) + shares;
        applyTradeImpact(initiator, shares, 1);
    }
    logEvent(`👾 Pac-Man: ${target.name} skupuje ${shares.toLocaleString('pl-PL')} akcji agresora ${initiator.name}!`, 'review');
    if (Math.random() > getAggressorPersistence(initiator) * 0.7) {
        abortTakeover(initiator, target, 'Kontratak Pac-Man — agresor musi bronić się sam.');
    } else {
        process.costs += Math.round(getMarketCapValue(target) * 0.05);
        logEvent(`👾 ${initiator.name} nie ustępuje mimo kontrataku — koszty przejęcia rosną.`, 'review');
    }
}

/** Obrona wybrana wg osobowości bota (albo cechy prezesa przy decyzji zarządu). */
function chooseDefenseForPersonality(personality, target, entityId) {
    const prefs = {
        whale: ['pacMan', 'whiteKnight', 'poisonPill'],
        pro_investor: ['whiteKnight', 'negotiate', 'poisonPill'],
        calm: ['negotiate', 'whiteKnight'],
        dividend_chaser: ['negotiate', 'poisonPill'],
        reckless: ['poisonPill', 'pacMan'],
        yolo_trader: ['poisonPill', 'negotiate'],
        banker: ['whiteKnight', 'negotiate']
    }[personality] || ['poisonPill', 'negotiate'];
    return prefs.find(type => canUseDefense(target, type, entityId).ok) || 'negotiate';
}

// =================================================================================
// G2: WROGIE PRZEJĘCIA I DECYZJA FUNDUSZU
// =================================================================================

/** Wołane przez initiateMergerProcess po starcie przejęcia. */
function onTakeoverStarted(initiator, target, options = {}) {
    const process = initiator.mergerProcess;
    process.hostile = !options.friendly;
    syncTakeover(initiator, target);
    if (typeof addChartEvent === 'function') addChartEvent(target, '🤝', `${options.friendly ? 'Oferta przejęcia' : 'Wrogie przejęcie'}: ${initiator.name}`);
    if (typeof onTakeoverStartedRelations === 'function') onTakeoverStartedRelations(initiator, target);
    if (getFundStakePct(target) >= 0.2 && playerFund) notifyFundOfTakeover(initiator, target);

    const owner = findMajorityShareholder(target);
    if (options.friendly || owner?.kind === 'player' || owner?.kind === 'ai') return; // gracz w oknie, bot w swojej turze
    if (Math.random() < 0.3) {
        const loyalCeo = target.ceo?.traits?.some(t => t.id === 'oddany');
        activateDefenseMechanism(target.symbol, chooseDefenseForPersonality(loyalCeo ? 'reckless' : 'pro_investor', target, 'company'), 'company');
    }
}

function notifyFundOfTakeover(initiator, target) {
    const process = initiator.mergerProcess;
    process.fundDecision = 'pending';
    syncTakeover(initiator, target);
    const pct = getFundStakePct(target);
    addMail({
        sender: CORPORATION_SENDER,
        subject: `🚨 Wezwanie: ${initiator.name} chce przejąć ${target.name}`,
        body: `${initiator.name} oferuje ${process.offerDetails.buyoutPricePerShare.toFixed(2)} PLN za akcję ${target.name} (premia ${((process.offerDetails.premium || 0) * 100).toFixed(0)}%). Fundusz ma ${(pct * 100).toFixed(1)}% akcji — zdecyduj: sprzedaż po cenie oferty albo głos przeciw${pct > 0.5 ? ', a jako większościowy akcjonariusz także obrona' : ''}.`,
        importance: 3, symbol: target.symbol, action: { type: 'takeover', symbol: target.symbol }
    });
    // U1: decyzja o przejęciu wyskakuje na ekranie i pauzuje grę (wyjątek od zasady „bez okien”).
    if (document.getElementById('takeover-modal') && typeof openTakeoverModal === 'function') {
        if (typeof isGamePaused !== 'undefined' && !isGamePaused && typeof togglePauseGame === 'function') togglePauseGame();
        openTakeoverModal(target.symbol);
        showToast(`🚨 Wrogie przejęcie ${target.name}! Gra wstrzymana do Twojej decyzji.`, 'warning', 7000);
    } else {
        showToast(`🚨 Wrogie przejęcie ${target.name}! Decyzja funduszu w poczcie.`, 'warning', 7000);
    }
}

// =================================================================================
// U1: NEGOCJACJE W RUNDACH (osobny panel; fundusz z większością)
// =================================================================================

const NEGOTIATION_MAX_ROUNDS = 3;

/** Szansa przyjęcia żądania: charakter właściciela agresora, wysokość żądania, zmęczenie rundami. */
function getNegotiationAcceptChance(initiator, demand, round = 1) {
    return Math.max(0.05, Math.min(0.95, getAggressorPersistence(initiator) + 0.25 - demand * 2.5 - (round - 1) * 0.1));
}

function startPlayerNegotiation(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    if (!pair) { showToast('Spółka nie jest celem przejęcia.', 'warning'); return false; }
    if (getFundStakePct(target) <= 0.5) { showToast('Negocjuje akcjonariusz większościowy (> 50%).', 'warning'); return false; }
    const check = canUseDefense(target, 'negotiate', 'player');
    if (!check.ok) { showToast(`Nie można negocjować: ${check.reason}.`, 'warning'); return false; }
    getDefensePayer('player', target).pay(check.cost);
    pair.process.defenseActive = 'negotiate';
    pair.process.defenseBy = playerProfile?.fundName || 'Fundusz';
    pair.process.negotiation = { round: 1, counter: null, open: true, history: [] };
    syncTakeover(pair.initiator, target);
    logEvent(`🤝 ${target.name} rozpoczyna negocjacje z ${pair.initiator.name} (doradcy: ${formatZl(check.cost, 0)}).`, 'review');
    return true;
}

/** Runda: fundusz żąda podniesienia premii o `demand` (np. 0,15 = 15 pkt proc.). */
function negotiationDemand(symbol, demand) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    const neg = pair?.process.negotiation;
    demand = Number(demand);
    if (!neg?.open) { showToast('Negocjacje są zakończone.', 'default'); return null; }
    if (!(demand >= 0.02 && demand <= 0.5)) { showToast('Żądanie: od 2 do 50 pkt proc. premii.', 'warning'); return null; }
    const { initiator, process } = pair;
    const newTotal = process.offerDetails.buyoutPricePerShare * (1 + demand) * target.totalShares;
    const affordable = process.financing !== 'cash' || initiator.cash >= newTotal;
    const chance = affordable ? getNegotiationAcceptChance(initiator, demand, neg.round) : 0;
    let result;
    if (Math.random() < chance) {
        raiseTakeoverOffer(initiator, target, process, demand);
        neg.open = false;
        result = 'accepted';
        logEvent(`🤝 ${initiator.name} przyjmuje żądanie: premia +${(demand * 100).toFixed(0)} pkt proc. (cena ${process.offerDetails.buyoutPricePerShare.toFixed(2)} PLN).`, 'review');
    } else if (neg.round < NEGOTIATION_MAX_ROUNDS && affordable && Math.random() < 0.6) {
        neg.counter = Math.round(demand * getRandomInRange(0.3, 0.6) * 100) / 100;
        result = 'counter';
    } else {
        neg.open = false;
        result = 'walkout';
        logEvent(`🤝 ${initiator.name} zrywa negocjacje i wycofuje ofertę za ${target.name}.`, 'review');
        abortTakeover(initiator, target, 'Agresor zerwał negocjacje.');
    }
    neg.history.push({ round: neg.round, demand, result, counter: neg.counter });
    neg.round++;
    return result;
}

function negotiationAcceptCounter(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    const neg = pair?.process.negotiation;
    if (!neg?.open || !(neg.counter > 0)) return false;
    raiseTakeoverOffer(pair.initiator, target, pair.process, neg.counter);
    neg.open = false;
    neg.history.push({ round: neg.round, result: 'counterAccepted', counter: neg.counter });
    logEvent(`🤝 Porozumienie: ${pair.initiator.name} podnosi premię za ${target.name} o ${(neg.counter * 100).toFixed(0)} pkt proc.`, 'review');
    return true;
}

function negotiationEnd(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const neg = target && getTakeoverAgainst(target)?.process.negotiation;
    if (neg) neg.open = false;
    return true;
}

/** Fundusz sprzedaje (niezablokowane) akcje celu agresorowi po cenie oferty. */
function sellFundSharesToAggressor(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    const holding = playerPortfolio[symbol];
    if (!pair || !holding) { showToast('Oferta przejęcia nie jest już aktualna.', 'default'); return false; }
    const { initiator, process } = pair;
    const shares = Math.floor(holding.shares - (holding.lockedShares || 0));
    const price = process.offerDetails.buyoutPricePerShare;
    const amount = shares * price;
    if (!(shares > 0)) { showToast('Brak akcji do sprzedaży (zastaw).', 'warning'); return false; }
    if (initiator.cash < amount) { showToast(`${initiator.name} nie ma gotówki na odkup pakietu.`, 'error'); return false; }

    adjustCompanyCash(initiator, -amount); // gotówka → akcje celu (aktywa bez zmian)
    if (!initiator.equityStakes) initiator.equityStakes = {};
    initiator.equityStakes[symbol] = (initiator.equityStakes[symbol] || 0) + shares;
    playerCash += amount;
    const profit = (price - holding.avgPrice) * shares;
    holding.shares -= shares;
    if (holding.shares <= 0) delete playerPortfolio[symbol];
    recordPayment(initiator, 'player-fund', amount, `Odkup akcji ${symbol} w przejęciu`);
    process.offerDetails.prepaid = (process.offerDetails.prepaid || 0) + amount;
    process.offerDetails.totalCost = Math.max(0, process.offerDetails.totalCost - amount);
    process.fundDecision = 'sold';
    syncTakeover(initiator, target);
    logEvent(`💰 Fundusz sprzedaje ${shares.toLocaleString('pl-PL')} akcji ${target.name} spółce ${initiator.name} po ${price.toFixed(2)} PLN (wynik ${profit >= 0 ? '+' : ''}${profit.toFixed(0)} PLN).`, 'review');
    showToast(`Sprzedano pakiet ${symbol} za ${formatZl(amount, 0)}.`, 'success');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    refreshTakeoverViews(symbol);
    return true;
}

/** Fundusz głosuje przeciw: co kwartał szansa, że agresor się wycofa (rośnie z udziałem funduszu). */
function voteAgainstTakeover(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    if (!pair) { showToast('Oferta przejęcia nie jest już aktualna.', 'default'); return false; }
    pair.process.fundDecision = 'against';
    pair.process.opposition = Math.min(0.8, getFundStakePct(target) * 0.8);
    syncTakeover(pair.initiator, target);
    logEvent(`🗳️ Fundusz głosuje przeciw przejęciu ${target.name} przez ${pair.initiator.name}.`, 'review');
    refreshTakeoverViews(symbol);
    return true;
}

/** Losowe wrogie przejęcie przez spółkę kontrolowaną przez bota lub zarząd (czasem w spółce funduszu). */
function triggerHostileTakeoverEvent(forcedTarget = null) {
    const free = s => !s.assetType && !s.mergerProcess && !s.isBankrupt && !s.isSubsidiaryOf && s.canBeTraded !== false;
    const initiators = stocks.filter(s => free(s) && !['player', 'wallet'].includes(findMajorityShareholder(s)?.kind) && s.cash > 0);
    if (!initiators.length) return null;
    const initiator = getRandomElement(initiators);
    const premium = 0.15 + Math.random() * 0.25;
    const affordable = stocks.filter(s => free(s) && s !== initiator && !s.isStateOwned && getMarketCapValue(s) * (1 + premium) <= initiator.cash);
    // Przyjazny bot-właściciel nie atakuje spółek, w których fundusz ma duży udział (relations.js).
    const ownerBot = findMajorityShareholder(initiator)?.kind === 'ai' ? findMajorityShareholder(initiator).entity : null;
    const spareFund = ownerBot && typeof getRelation === 'function' && getRelation(ownerBot.id) >= RELATION_FRIENDLY;
    const fundTargets = spareFund ? [] : affordable.filter(s => getFundStakePct(s) >= 0.2);
    const pool = spareFund ? affordable.filter(s => getFundStakePct(s) < 0.2) : affordable;
    const target = forcedTarget || (fundTargets.length && Math.random() < 0.5 ? getRandomElement(fundTargets) : getRandomElement(pool));
    if (!target) return null;
    logEvent(`🚨 WROGIE PRZEJĘCIE: ${initiator.name} ogłasza ofertę za ${target.name} (premia ${(premium * 100).toFixed(0)}%).`, 'market');
    return initiateMergerProcess(initiator, target, 'przejęcie', 'cash', premium) ? { initiator, target } : null;
}

function refreshTakeoverViews(symbol) {
    const modal = document.getElementById('takeover-modal');
    if (modal && modal.style.display === 'block') openTakeoverModal(symbol);
    const management = document.getElementById('management-modal');
    if (management && management.style.display === 'block' && typeof openManagementModal === 'function') openManagementModal(symbol);
}

// =================================================================================
// G2: EMISJA RATUNKOWA
// =================================================================================

// 0.14.2 P2: oferty per spółka (dawniej jedna globalna oferta — nowa emisja innej spółki podmieniała ofertę
// w otwartym oknie, więc „Obejmij” kupował akcje innej spółki niż na ekranie).
let rescueOffers = {};
const RESCUE_OFFER_QUARTERS = 1; // oferta dla funduszu ważna do końca następnego kwartału

function getRescueOffer(symbol) {
    const offer = rescueOffers[symbol];
    return offer && !offer.closed ? offer : null;
}

/** Nowe akcje z emisji ratunkowej: pieniądze spłacają dług, kupujący (także nowi) dostają akcje. */
function issueRescueShares(stock, buyer, shares, price) {
    shares = Math.floor(shares);
    const amount = shares * price;
    if (!(shares > 0)) return 0;
    if (buyer === 'player') {
        if (playerCash < amount) return 0;
        playerCash -= amount;
        const holding = playerPortfolio[stock.symbol] || (playerPortfolio[stock.symbol] = { shares: 0, avgPrice: 0, assetType: 'stock' });
        holding.avgPrice = (holding.avgPrice * holding.shares + amount) / (holding.shares + shares);
        holding.shares += shares;
        recordPayment('player-fund', stock, amount, `Emisja ratunkowa ${stock.symbol}`);
    } else {
        if (buyer.cash < amount) return 0;
        buyer.cash -= amount;
        const holding = buyer.portfolio[stock.symbol] || (buyer.portfolio[stock.symbol] = { shares: 0, avgPrice: 0 });
        holding.avgPrice = (holding.avgPrice * holding.shares + amount) / (holding.shares + shares);
        holding.shares += shares;
    }
    stock.maxShares = Math.max(Number(stock.maxShares) || 0, stock.totalShares) + shares;
    stock.totalShares += shares;
    stock.sharesHeld += shares;
    adjustCompanyCash(stock, amount);
    const repay = Math.min(amount, Math.max(0, stock.balanceSheet?.liabilities || 0));
    if (repay > 0) adjustCompanyCash(stock, -repay);
    adjustBalanceSheet(stock, { assets: amount - repay, liabilities: -repay });
    if (stock.balanceSheet) stock.balanceSheet.shareCapital = (Number(stock.balanceSheet.shareCapital) || 0) + amount;
    stock.rescueRaised = (stock.rescueRaised || 0) + amount;
    return shares;
}

/** Bot decyduje wg osobowości, ile akcji obejmie (także jako nowy akcjonariusz). */
function aiDecideOnRescueOffer(ai, offer, shares) {
    const chance = { calm: 0.5, pro_investor: 0.7, whale: 0.6, yolo_trader: 0.8, reckless: 0.8, dividend_chaser: 0.4 }[ai.personality] ?? 0.5;
    const holder = (ai.portfolio[offer.symbol]?.shares || 0) > 0;
    if (Math.random() > chance + (holder ? 0.2 : 0)) return 0;
    const stock = stocks.find(s => s.symbol === offer.symbol);
    const affordable = Math.floor(ai.cash * 0.2 / offer.price);
    return stock ? issueRescueShares(stock, ai, Math.min(shares, affordable), offer.price) : 0;
}

function triggerRescueOfferingEvent(forcedTarget = null) {
    const candidates = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.mergerProcess && s.balanceSheet
        && s.balanceSheet.liabilities > getMarketCapValue(s) * 0.3);
    let stock = forcedTarget;
    if (!stock && candidates.length > 0) {
        stock = getRandomElement(candidates); // 0.15.0.1 C4: ratunek zadłużonych, bez wagi bańki (emisje w cyklu idą przez walne)
    }
    if (!stock) return null;
    const price = stock.price * (1 - getRandomInRange(0.15, 0.25));
    const total = Math.floor(Math.min(stock.balanceSheet.liabilities * 0.5 / price, stock.totalShares * 0.3));
    if (!(price > 0) || total <= 0) return null;

    if (getRescueOffer(stock.symbol)) finalizeRescueOffering(stock); // poprzednia emisja tej spółki zamknięta przed nową
    const offer = { symbol: stock.symbol, price, total, remaining: total, fundReserved: 0, closed: false, quarter: typeof macro === 'object' ? macro.quarter : 0 };
    logEvent(`📢 EMISJA RATUNKOWA: ${stock.name} oferuje ${total.toLocaleString('pl-PL')} nowych akcji po ${price.toFixed(2)} PLN, aby spłacić długi.`, 'market');

    // Fundusz: pula zarezerwowana (do 40%) — gracz decyduje w oknie/poczcie.
    const fundEligible = playerFund && canAccessExchange(stock.exchange);
    if (fundEligible) offer.fundReserved = Math.floor(total * 0.4);
    let forBots = total - offer.fundReserved;
    for (const ai of [...aiCompetitors].sort(() => Math.random() - 0.5)) {
        if (forBots <= 0) break;
        const bought = aiDecideOnRescueOffer(ai, offer, Math.ceil(forBots * getRandomInRange(0.2, 0.6)));
        if (bought > 0) logEvent(`[AI] ${ai.name} obejmuje ${bought.toLocaleString('pl-PL')} akcji z emisji ratunkowej ${stock.symbol}.`, 'market');
        forBots -= bought;
    }

    if (offer.fundReserved > 0) {
        rescueOffers[stock.symbol] = offer;
        addMail({
            sender: CORPORATION_SENDER,
            subject: `Emisja ratunkowa: ${stock.name}`,
            body: `${stock.name} oferuje funduszowi do ${offer.fundReserved.toLocaleString('pl-PL')} nowych akcji po ${price.toFixed(2)} PLN (dyskonto do rynku). Pieniądze idą na spłatę długu.`,
            importance: 2, symbol: stock.symbol, action: { type: 'rescue', symbol: stock.symbol }
        });
        if ((playerPortfolio[stock.symbol]?.shares || 0) > 0) openRescueOfferingModal(stock.symbol);
    } else {
        finalizeRescueOffering(stock);
    }
    return offer;
}

/** Fundusz obejmuje akcje z emisji ratunkowej spółki `symbol` (zawsze tej z maila/okna, nie „bieżącej” oferty). */
function acceptRescueOffer(symbol, quantity) {
    const offer = getRescueOffer(symbol);
    const stock = offer && stocks.find(s => s.symbol === symbol);
    if (!stock) { showToast('Oferta emisji ratunkowej jest zamknięta.', 'default'); return false; }
    quantity = Math.min(Math.floor(Number(quantity) || 0), offer.fundReserved);
    if (!(quantity > 0)) { showToast('Podaj liczbę akcji.', 'warning'); return false; }
    if (playerCash < quantity * offer.price) { showToast('Za mało gotówki funduszu.', 'error'); return false; }
    const before = playerPortfolio[symbol]?.shares || 0;
    const issued = issueRescueShares(stock, 'player', quantity, offer.price);
    if (!(issued > 0) || (playerPortfolio[symbol]?.shares || 0) - before !== issued) { showToast('Nie udało się objąć akcji.', 'error'); return false; }
    logEvent(`📢 Fundusz obejmuje ${issued.toLocaleString('pl-PL')} akcji ${stock.name} (${symbol}) z emisji ratunkowej po ${formatZl(offer.price)} — razem ${formatZl(issued * offer.price, 0)}.`, 'review');
    changeReputation('player', stock.symbol, 10);
    finalizeRescueOffering(stock);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    if (typeof displayStocks === 'function' && typeof getCurrentInputValues === 'function') displayStocks(getCurrentInputValues()); // filtr „Moje”
    closeRescueOfferingModal();
    return issued;
}

function declineRescueOffer(symbol) {
    const offer = getRescueOffer(symbol);
    const stock = offer && stocks.find(s => s.symbol === symbol);
    if (stock) {
        if ((playerPortfolio[stock.symbol]?.shares || 0) > 0) changeReputation('player', stock.symbol, -5);
        finalizeRescueOffering(stock);
    }
    closeRescueOfferingModal();
}

/** Co kwartał: oferty bez decyzji wygasają po RESCUE_OFFER_QUARTERS (emisja zamknięta bez funduszu). */
function expireRescueOffers() {
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    for (const [symbol, offer] of Object.entries(rescueOffers)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (!stock || stock.isBankrupt) { delete rescueOffers[symbol]; continue; }
        if (!offer.closed && quarter - (offer.quarter || 0) > RESCUE_OFFER_QUARTERS) {
            logEvent(`📢 Oferta emisji ratunkowej ${stock.name} dla funduszu wygasła bez decyzji.`, 'review');
            finalizeRescueOffering(stock);
        }
    }
}

function finalizeRescueOffering(stock) {
    if (rescueOffers[stock.symbol]) { rescueOffers[stock.symbol].closed = true; delete rescueOffers[stock.symbol]; }
    const raised = stock.rescueRaised || 0;
    stock.rescueRaised = 0;
    if (raised > 0) stock.financialHealth = Math.min(5, (Number(stock.financialHealth) || 0) + 0.5);
    logEvent(`📢 Emisja ratunkowa ${stock.name} zamknięta: zebrano ${raised.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN na spłatę długu.`, 'review');
}

// #################################################################################
// ## governance.js
// #################################################################################

// governance.js — Fundusz jako aktywny akcjonariusz (etap G3)
//
// Każda spółka ma walne zgromadzenie raz w roku gry (terminy rozłożone po kwartałach). Kwartał przed
// terminem powstaje porządek obrad; fundusz z udziałem ≥ 5% dostaje mail i ustawia głosy w oknie
// „Walne zgromadzenia”. Głosy liczone wg akcji; rozproszeni akcjonariusze głosują przy frekwencji 40–70%.
// Udział gracza (mail, głos, wnioski, kampanie) tylko jako większościowiec (> 50%); poniżej fundusz
// głosuje „za” w tle. Rada nadzorcza: ≥ 20% → 1 miejsce, ≥ 35% → 2, > 50% → większość (wgląd).

const AGM_CONTROL_THRESHOLD = 0.5; // gracz bierze udział w walnym tylko jako większościowiec

function canFundControlAgm(stock) {
    return Boolean(playerFund) && getFundStakePct(stock) > AGM_CONTROL_THRESHOLD;
}
const AGM_HISTORY_LIMIT = 4;
const ACTIVIST_PROPOSALS = {
    raiseDividend: { label: 'Wyższa dywidenda', desc: 'Polityka dywidendy o stopień wyżej.' },
    replaceCeo: { label: 'Zmiana prezesa', desc: 'Odwołanie prezesa i powołanie nowego.' },
    buyback: { label: 'Skup akcji własnych', desc: 'Spółka skupuje do 10% gotówki w akcjach z rynku.' },
    sellCompany: { label: 'Sprzedaż spółki', desc: 'Zarząd szuka nabywcy (przyjazne przejęcie z premią).' }
};

// =================================================================================
// STAN I RADA NADZORCZA
// =================================================================================

function ensureGovernance(stock) {
    if (!stock.governance) {
        stock.governance = { quartersToAgm: 2 + Math.floor(Math.random() * 4), // pierwsze walne nie w 1. kwartale
            pendingAgm: null, proposals: [], history: [] };
    }
    return stock.governance;
}

function isGovernedCompany(stock) {
    return stock && !stock.assetType && !stock.isBankrupt && stock.totalShares > 0;
}

/** Miejsca funduszu w radzie nadzorczej wg udziału. */
function getBoardSeats(stock) {
    const pct = getFundStakePct(stock);
    if (pct > 0.5) return { seats: 3, label: 'większość rady (3/5)' };
    if (pct >= 0.35) return { seats: 2, label: '2 miejsca w radzie' };
    if (pct >= 0.2) return { seats: 1, label: '1 miejsce w radzie' };
    return { seats: 0, label: 'brak miejsc' };
}

/** Wgląd członka rady: prognoza wyniku i plany inwestycyjne. */
function getBoardInsight(stock) {
    if (getBoardSeats(stock).seats < 1) return null;
    const last = Number(stock.quarterlyEarnings) || 0;
    const health = Number(stock.financialHealth) || 0;
    const forecast = last * (1 + health * 0.04) + (stock.operatingInvestments || []).reduce((sum, op) => sum + op.cost * op.roi / 4 * op.efficiency, 0) * 0.5;
    const plans = [
        ...(stock.activeInvestments || []).map(item => `w toku: ${item.name}`),
        ...(typeof getInvestmentCatalogForCompany === 'function'
            ? getInvestmentCatalogForCompany(stock).filter(inv => inv.minDevLevel <= (stock.departments?.development?.level || 0) && !hasCompanyInvestmentInProgress(stock, inv.id)).slice(0, 2).map(inv => `rozważa: ${inv.name}`)
            : [])
    ];
    return { forecast, plans };
}

// =================================================================================
// PORZĄDEK OBRAD
// =================================================================================

function buildAgmAgenda(stock) {
    const gov = ensureGovernance(stock);
    const health = Number(stock.financialHealth) || 0;
    const items = [];
    const order = DIVIDEND_POLICY_ORDER;
    const current = Math.max(0, order.indexOf(stock.dividendPolicy || 'Growth'));
    // Zarząd proponuje politykę dopasowaną do kondycji (audyt A4: stałe „+1” prowadziło do dryfu wypłat w górę).
    // „Pełna (100%)” zostaje tylko tam, gdzie już obowiązuje i spółka jest w świetnej kondycji.
    const target = health >= 3 ? 'Aggressive' : health >= 1 ? 'Balanced' : health <= -1 ? 'Growth' : order[current];
    const keepTotal = order[current] === 'Total' && health >= 3;
    const step = Math.sign(order.indexOf(target) - current); // najwyżej o jeden stopień na walnym
    const proposedPolicy = keepTotal ? 'Total' : order[Math.max(0, Math.min(order.length - 1, current + step))];
    items.push({ id: 'dividend', kind: 'board', type: 'dividend', policy: proposedPolicy, label: `Polityka dywidendy: ${DIVIDEND_POLICIES[proposedPolicy].label}` });
    items.push({ id: 'discharge', kind: 'board', type: 'discharge', label: `Absolutorium dla prezesa ${stock.ceo?.name || ''}`.trim() });
    const capital = getCapitalAgmProposal(stock);
    if (capital) items.push(capital);

    for (const proposal of gov.proposals) {
        items.push({ id: `p-${proposal.type}`, kind: 'activist', type: proposal.type, by: 'player', label: `Wniosek funduszu: ${ACTIVIST_PROPOSALS[proposal.type].label}` });
    }
    gov.proposals = [];
    for (const item of items) item.playerVote = 'for'; // domyślnie „za wnioskiem”
    return items;
}

/** 0.15.0.1 C4: wycena akcji spółki na tle rynku — drogie (premia rynku > +10% albo kurs ≥ 1,3 × wartości godziwej) lub tanie. */
function getShareValuationMood(stock) {
    const regime = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
    const premium = Number(regime?.premium) || 0;
    const bearish = regime?.phase === 'bear' || regime?.phase === 'capitulation'; // okno emisji zamknięte
    const fair = typeof getDisplayedFairValue === 'function' ? getDisplayedFairValue(stock) : null;
    const ratio = fair > 0 ? stock.price / fair : 1;
    // W Bessie i Kapitulacji okno emisji jest zamknięte (premia goni cel z opóźnieniem, więc sama premia nie wystarcza).
    return { expensive: !bearish && (premium > 0.10 || ratio >= 1.3), cheap: premium < -0.15 || ratio <= 0.75, bearish };
}

/**
 * Uchwała kapitałowa zarządu (najwyżej jedna na walne): emisja przy braku gotówki (rzadziej, gdy akcje tanie) albo drogich akcjach
 * (×2 w sektorze bańki), skup przy nadmiarze gotówki (gdy akcje nie są drogie) albo tanich akcjach.
 */
function getCapitalAgmProposal(stock) {
    const cap = getMarketCapValue(stock);
    const { expensive, cheap, bearish } = getShareValuationMood(stock);
    const issue = reason => ({ id: 'issue', kind: 'board', type: 'issue', reason, label: reason === 'expensive' ? 'Emisja 10% nowych akcji przy wysokiej wycenie' : 'Emisja 10% nowych akcji' });
    const buyback = reason => ({ id: 'buyback', kind: 'board', type: 'buyback', reason, label: reason === 'cheap' ? 'Program skupu akcji własnych przy niskiej wycenie' : 'Program skupu akcji własnych' });
    if (stock.cash < cap * 0.03 && Math.random() < (cheap || bearish ? 0.2 : 0.5)) return issue('cash'); // przy tanich akcjach zarząd woli kredyt niż emisję
    if (expensive && Math.random() < (typeof isCompanyInSectorBubble === 'function' && isCompanyInSectorBubble(stock) ? 0.6 : 0.3)) return issue('expensive');
    if (stock.cash > cap * 0.15 && !expensive && Math.random() < 0.3) return buyback('cash'); // 0.15.0.1: 50% → 30% (rozwodnienie rynku ≈ 0 przy 50%)
    if (cheap && stock.cash > cap * 0.05 && Math.random() < 0.4) return buyback('cheap');
    return null;
}

/** Walne kwartał po porządku obrad: czy powód uchwały kapitałowej nadal obowiązuje (inaczej zarząd ją wycofuje). */
function isCapitalAgmItemValid(stock, item) {
    if (!['issue', 'buyback'].includes(item.type) || !item.reason || item.by) return true;
    const cap = getMarketCapValue(stock);
    const { expensive, cheap, bearish } = getShareValuationMood(stock);
    if (item.reason === 'expensive') return expensive;
    if (item.reason === 'cheap') return cheap && stock.cash > cap * 0.05;
    if (item.type === 'issue') return stock.cash < cap * 0.03 && !cheap && !bearish; // przy tanich akcjach / w bessie zarząd woli kredyt
    return stock.cash > cap * 0.15 && !expensive;
}

/** Emisja przy wysokiej / skup przy niskiej wycenie w spółce z portfela: wpis w pasku newsów i hasło Akademii. */
function noteCapitalCycleResolution(stock, item) {
    if (!['expensive', 'cheap'].includes(item.reason) || !((playerPortfolio?.[stock.symbol]?.shares || 0) > 0)) return;
    if (typeof pushNews === 'function') pushNews(item.type === 'issue' ? `${stock.name} emituje 10% akcji przy wysokiej wycenie` : `${stock.name} skupuje akcje przy niskiej wycenie`, stock.symbol);
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('emisje_skupy');
}

function createPendingAgm(stock) {
    const gov = ensureGovernance(stock);
    gov.pendingAgm = { items: buildAgmAgenda(stock) };
    if (canFundControlAgm(stock)) {
        addMail({
            sender: CORPORATION_SENDER,
            subject: `🗳️ Walne zgromadzenie ${stock.name} w przyszłym kwartale`,
            body: `Porządek obrad: ${gov.pendingAgm.items.map(item => item.label).join('; ')}. Fundusz ma ${(getFundStakePct(stock) * 100).toFixed(1)}% głosów — ustaw głosy przed terminem (domyślnie „za”).`,
            importance: 2, symbol: stock.symbol, action: { type: 'agm', symbol: stock.symbol }
        });
    }
}

// =================================================================================
// GŁOSOWANIE
// =================================================================================

/** Prawdopodobieństwo głosu „za” danego akcjonariusza w danej sprawie. */
function getVoteForProbability(holder, item, stock) {
    const health = Number(stock.financialHealth) || 0;
    const clamp = value => Math.max(0.02, Math.min(0.98, value));
    // B3: Gwardia głosuje według relacji z graczem w spółkach z udziałem funduszu.
    if (holder.entity?.isGuard && typeof getRelation === 'function' && getFundStakePct(stock) >= 0.05) {
        const relation = getRelation(holder.entity.id);
        if (relation <= RELATION_HOSTILE) return item.kind === 'board' ? 0.1 : 0.02;
        if (relation >= RELATION_FRIENDLY && item.kind === 'activist') return 0.85;
    }
    if (item.kind === 'board') {
        if (holder.kind === 'insiders') return 1;
        if (holder.kind === 'state' || holder.kind === 'city') return 0.9;
        let p = 0.55 + health * 0.08;
        const personality = holder.entity?.personality;
        if (item.type === 'dividend' && personality === 'dividend_chaser') p += 0.25;
        if (item.type === 'issue') p -= 0.15;
        return clamp(p);
    }
    // Wnioski akcjonariuszy (aktywizm)
    if (holder.kind === 'insiders') return 0;
    if ((holder.kind === 'state' || holder.kind === 'city') && item.type === 'sellCompany') return 0;
    let p = 0.3 - health * 0.06;
    if (item.type === 'raiseDividend' && holder.entity?.personality === 'dividend_chaser') p += 0.3;
    if (item.type === 'replaceCeo' && stock.ceo?.traits?.some(t => t.id === 'oddany')) p -= 0.1;
    if (item.campaign) p += 0.2 + Math.max(-0.1, Math.min(0.2, (stock.reputation?.player || 0) / 250));
    return clamp(p);
}

/** Liczy głosy w jednej sprawie; zwraca { for, against, abstain, passed }. */
function tallyAgmItem(stock, item, holders, retailVoting) {
    const votes = { for: 0, against: 0, abstain: 0 };
    for (const holder of holders) {
        if (holder.kind === 'wallet') { votes.abstain += holder.shares; continue; }
        let choice;
        if (holder.kind === 'player') choice = canFundControlAgm(stock) ? item.playerVote || 'for' : 'for';
        else {
            const roll = Math.random();
            choice = roll < 0.05 ? 'abstain' : roll < 0.05 + 0.95 * getVoteForProbability(holder, item, stock) ? 'for' : 'against';
        }
        votes[choice] += holder.shares;
    }
    const pRetail = getVoteForProbability({ kind: 'retail' }, item, stock);
    votes.for += retailVoting * pRetail;
    votes.against += retailVoting * (1 - pRetail);
    return { ...votes, passed: votes.for > votes.against };
}

function holdAgm(stock) {
    const gov = ensureGovernance(stock);
    const agm = gov.pendingAgm;
    gov.pendingAgm = null;
    if (!agm?.items?.length) return null;
    const withdrawn = agm.items.filter(item => !isCapitalAgmItemValid(stock, item));
    if (withdrawn.length) {
        agm.items = agm.items.filter(item => !withdrawn.includes(item));
        logEvent(`🗳️ Zarząd ${stock.name} wycofuje z porządku obrad: ${withdrawn.map(item => item.label).join('; ')} — zmieniła się wycena albo sytuacja spółki.`, 'company');
        if (!agm.items.length) return null;
    }

    const holders = getShareholders(stock);
    const listed = holders.reduce((sum, holder) => sum + holder.shares, 0);
    const retail = Math.max(0, stock.totalShares - listed);
    const turnoutRetail = 0.4 + Math.random() * 0.3;
    const retailVoting = retail * turnoutRetail;
    const turnout = (listed + retailVoting) / stock.totalShares;

    const results = agm.items.map(item => {
        const tally = tallyAgmItem(stock, item, holders, retailVoting);
        const effect = tally.passed ? applyAgmResolution(stock, item) : '';
        return { label: item.label, kind: item.kind, type: item.type, by: item.by || null, playerVote: item.playerVote, ...tally, effect };
    });

    if (stock.spinoff && results.some(r => r.type === 'spinoff' && !r.passed)) { // 0.14 T4: walne odrzuca wydzielenie
        stock.spinoff = null;
        logEvent(`🗳️ Walne ${stock.name} odrzuca wydzielenie spółki córki.`, 'company');
    }
    for (const result of results.filter(r => r.by === 'player')) {
        changeReputation('player', stock.symbol, result.passed ? 8 : -4);
        if (playerFund) playerFund.trust = Math.max(0, Math.min(100, playerFund.trust + (result.passed ? 1 : -0.5)));
    }

    const record = { at: typeof getMailClockMs === 'function' ? getMailClockMs() : Date.now(), turnout, results };
    gov.history.unshift(record);
    gov.history.length = Math.min(gov.history.length, AGM_HISTORY_LIMIT);

    if (canFundControlAgm(stock)) {
        addMail({
            sender: CORPORATION_SENDER,
            subject: `🗳️ Uchwały walnego zgromadzenia ${stock.name}`,
            body: `Frekwencja ${(turnout * 100).toFixed(0)}%. ` + results.map(r => `${r.label}: ${r.passed ? 'PRZYJĘTA' : 'odrzucona'} (za ${(r.for / Math.max(1, r.for + r.against) * 100).toFixed(0)}%)${r.effect ? ` — ${r.effect}` : ''}`).join('; ') + '.',
            importance: 2, symbol: stock.symbol, action: { type: 'agm', symbol: stock.symbol }
        });
    }
    logEvent(`🗳️ Walne zgromadzenie ${stock.name}: ${results.filter(r => r.passed).length}/${results.length} uchwał przyjętych (frekwencja ${(turnout * 100).toFixed(0)}%).`, 'company');
    return record;
}

/** Skutek przyjętej uchwały; zwraca krótki opis. */
function applyAgmResolution(stock, item) {
    switch (item.type) {
        case 'dividend':
            if (item.policy !== stock.dividendPolicy) setCompanyDividendPolicy(stock, item.policy);
            return '';
        case 'discharge':
            return '';
        case 'spinoff': { // 0.14 T4: wydzielenie po uchwale walnego
            const child = typeof executeSpinoff === 'function' ? executeSpinoff(stock) : null;
            return child ? `nowa spółka: ${child.name} (${child.symbol})` : 'wydzielenie odłożone';
        }
        case 'raiseDividend': {
            const order = DIVIDEND_POLICY_ORDER;
            const next = order[Math.min(order.length - 1, Math.max(0, order.indexOf(stock.dividendPolicy || 'Growth')) + 1)];
            setCompanyDividendPolicy(stock, next);
            return `nowa polityka: ${DIVIDEND_POLICIES[next].label}`;
        }
        case 'replaceCeo':
            replaceCeo(stock);
            return `nowy prezes: ${stock.ceo?.name || '—'}`;
        case 'buyback':
            noteCapitalCycleResolution(stock, item);
            return runBuyback(stock);
        case 'issue':
            noteCapitalCycleResolution(stock, item);
            return runAgmIssue(stock);
        case 'sellCompany': {
            const premium = 0.25;
            const buyer = stocks.filter(s => s !== stock && !s.assetType && !s.mergerProcess && !s.isBankrupt && !s.isSubsidiaryOf
                && s.cash >= getMarketCapValue(stock) * (1 + premium) * 1.1).sort((a, b) => b.cash - a.cash)[0];
            if (!buyer || stock.mergerProcess) return 'brak nabywcy';
            initiateMergerProcess(buyer, stock, 'przejęcie', 'cash', premium, { friendly: true });
            return `nabywca: ${buyer.name}`;
        }
    }
    return '';
}

function runBuyback(stock) {
    const shares = Math.floor(Math.min(getAvailableShares(stock), Math.max(0, stock.cash) * 0.1 / Math.max(0.01, stock.price)));
    if (shares <= 0) return 'brak akcji do skupu';
    const cost = shares * stock.price;
    adjustCompanyCash(stock, -cost);
    adjustBalanceSheet(stock, { assets: -cost, retainedEarnings: -cost });
    stock.totalShares -= shares;
    stock.price *= 1.02;
    return `skupiono ${shares.toLocaleString('pl-PL')} akcji`;
}

function runAgmIssue(stock) {
    const shares = Math.floor(stock.totalShares * 0.1);
    const amount = shares * stock.price * 0.95;
    if (shares <= 0) return '';
    stock.maxShares = Math.max(Number(stock.maxShares) || 0, stock.totalShares) + shares;
    stock.totalShares += shares;
    adjustCompanyCash(stock, amount);
    adjustBalanceSheet(stock, { assets: amount });
    if (stock.balanceSheet) stock.balanceSheet.shareCapital = (Number(stock.balanceSheet.shareCapital) || 0) + amount;
    stock.price *= 0.97;
    return `wyemitowano ${shares.toLocaleString('pl-PL')} akcji`;
}

/** Co kwartał (main.js): odliczanie, porządek obrad kwartał wcześniej, potem zgromadzenie. */
function processGovernanceQuarter() {
    for (const stock of stocks) {
        if (!isGovernedCompany(stock)) continue;
        const gov = ensureGovernance(stock);
        gov.quartersToAgm--;
        if (gov.quartersToAgm <= 0) {
            if (!gov.pendingAgm) createPendingAgm(stock);
            holdAgm(stock);
            gov.quartersToAgm = 4;
        } else if (gov.quartersToAgm === 1 && !gov.pendingAgm) {
            createPendingAgm(stock);
        }
    }
}

// =================================================================================
// DECYZJE FUNDUSZU: głos, wniosek, kampania
// =================================================================================

function setAgmVote(symbol, itemId, vote) {
    const stock = stocks.find(s => s.symbol === symbol);
    const item = stock?.governance?.pendingAgm?.items.find(i => i.id === itemId);
    if (!item || !['for', 'against', 'abstain'].includes(vote) || !canFundControlAgm(stock)) return false;
    item.playerVote = vote;
    return true;
}

function submitShareholderProposal(symbol, type) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !ACTIVIST_PROPOSALS[type]) return false;
    if (!canFundControlAgm(stock)) { showToast('Wnioski na walne zgłasza akcjonariusz większościowy (> 50%).', 'warning'); return false; }
    const gov = ensureGovernance(stock);
    const agenda = gov.pendingAgm?.items || [];
    if (agenda.some(i => i.by === 'player') || gov.proposals.length) { showToast('Fundusz zgłosił już wniosek na to zgromadzenie.', 'warning'); return false; }
    const item = { id: `p-${type}`, kind: 'activist', type, by: 'player', label: `Wniosek funduszu: ${ACTIVIST_PROPOSALS[type].label}`, playerVote: 'for' };
    if (gov.pendingAgm) gov.pendingAgm.items.push(item);
    else gov.proposals.push({ type });
    logEvent(`📝 Fundusz zgłasza wniosek do walnego ${stock.name}: ${ACTIVIST_PROPOSALS[type].label}.`, 'review');
    showToast('Wniosek zgłoszony na najbliższe walne.', 'success');
    refreshGovernanceView(symbol);
    return true;
}

function getCampaignCost(stock) {
    return Math.round(Math.max(2000, getMarketCapValue(stock) * 0.002));
}

/** Kampania o głosy dla wniosku funduszu — koszt z funduszu, zwiększa poparcie botów i drobnych. */
function runProxyCampaign(symbol, itemId) {
    const stock = stocks.find(s => s.symbol === symbol);
    const item = stock?.governance?.pendingAgm?.items.find(i => i.id === itemId);
    if (!item || item.by !== 'player' || !canFundControlAgm(stock)) { showToast('Kampanię prowadzi większościowiec dla wniosku funduszu na zaplanowanym walnym.', 'warning'); return false; }
    if (item.campaign) { showToast('Kampania już trwa.', 'default'); return false; }
    const cost = getCampaignCost(stock);
    if (playerCash < cost) { showToast(`Kampania kosztuje ${formatZl(cost, 0)} — za mało gotówki funduszu.`, 'error'); return false; }
    playerCash -= cost;
    recordPayment('player-fund', 'external:doradcy_ma', cost, `Kampania o głosy ${symbol}`);
    item.campaign = true;
    logEvent(`📣 Fundusz prowadzi kampanię o głosy w ${stock.name} (${formatZl(cost, 0)}).`, 'review');
    if (typeof displayCash === 'function') displayCash();
    refreshGovernanceView(symbol);
    return true;
}
