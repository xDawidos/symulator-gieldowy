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
    for (const ai of aiCompetitors) add(ai.id, ai.name, 'ai', ai.portfolio?.[symbol]?.shares || 0, ai);
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
            process.statusMessage = `Etap 3: strategia i finansowanie (koszty: ${process.costs.toFixed(0)} zł).`;
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
                    logEvent(`⚖️ Urząd antymonopolowy blokuje ${process.type} ${stock.name} → ${partner.name} i nakłada na inicjatora karę ${fine.toLocaleString('pl-PL')} zł.`, 'state');
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
            logEvent(`🧪 ${target.name} aktywuje „Zatrutą Pigułkę” przeciw ${initiator.name} (koszt ${check.cost.toLocaleString('pl-PL')} zł, płaci: ${payer.name}).`, 'review');
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
        logEvent(`🤝 ${initiator.name} przyjmuje żądania ${target.name}: premia rośnie o ${(demand * 100).toFixed(0)} pkt proc. (cena ${process.offerDetails.buyoutPricePerShare.toFixed(2)} zł).`, 'review');
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
        body: `${initiator.name} oferuje ${process.offerDetails.buyoutPricePerShare.toFixed(2)} zł za akcję ${target.name} (premia ${((process.offerDetails.premium || 0) * 100).toFixed(0)}%). Fundusz ma ${(pct * 100).toFixed(1)}% akcji — zdecyduj: sprzedaż po cenie oferty albo głos przeciw${pct > 0.5 ? ', a jako większościowy akcjonariusz także obrona' : ''}.`,
        importance: 3, symbol: target.symbol, action: { type: 'takeover', symbol: target.symbol }
    });
    showToast(`🚨 Wrogie przejęcie ${target.name}! Decyzja funduszu w poczcie.`, 'warning', 7000);
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
    logEvent(`💰 Fundusz sprzedaje ${shares.toLocaleString('pl-PL')} akcji ${target.name} spółce ${initiator.name} po ${price.toFixed(2)} zł (wynik ${profit >= 0 ? '+' : ''}${profit.toFixed(0)} zł).`, 'review');
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
    const fundTargets = affordable.filter(s => getFundStakePct(s) >= 0.2);
    const target = forcedTarget || (fundTargets.length && Math.random() < 0.5 ? getRandomElement(fundTargets) : getRandomElement(affordable));
    if (!target) return null;
    logEvent(`🚨 WROGIE PRZEJĘCIE: ${initiator.name} ogłasza ofertę za ${target.name} (premia ${(premium * 100).toFixed(0)}%).`, 'market');
    return initiateMergerProcess(initiator, target, 'przejęcie', 'cash', premium) ? { initiator, target } : null;
}

function triggerMergerAndAcquisitionEvent() {
    return triggerHostileTakeoverEvent();
}

/** Właściciel-bot przyjął ofertę: startuje przyjazne przejęcie po cenie oferty. */
function handleTakeoverAcceptance(acquirer, target, buyoutPrice) {
    const premium = Math.max(0, buyoutPrice / Math.max(0.01, target.price) - 1);
    return initiateMergerProcess(acquirer, target, 'przejęcie', 'cash', premium, { friendly: true });
}

function handleTakeoverRejection(acquirer, target) {
    logEvent(`🛡️ Właściciel ${target.name} odrzuca ofertę ${acquirer.name}.`, 'review');
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

let rescueOffer = null;

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
    const stock = forcedTarget || (candidates.length ? getRandomElement(candidates) : null);
    if (!stock) return null;
    const price = stock.price * (1 - getRandomInRange(0.15, 0.25));
    const total = Math.floor(Math.min(stock.balanceSheet.liabilities * 0.5 / price, stock.totalShares * 0.3));
    if (!(price > 0) || total <= 0) return null;

    const offer = { symbol: stock.symbol, price, total, remaining: total, fundReserved: 0, closed: false };
    logEvent(`📢 EMISJA RATUNKOWA: ${stock.name} oferuje ${total.toLocaleString('pl-PL')} nowych akcji po ${price.toFixed(2)} zł, aby spłacić długi.`, 'market');

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
        rescueOffer = offer;
        addMail({
            sender: CORPORATION_SENDER,
            subject: `Emisja ratunkowa: ${stock.name}`,
            body: `${stock.name} oferuje funduszowi do ${offer.fundReserved.toLocaleString('pl-PL')} nowych akcji po ${price.toFixed(2)} zł (dyskonto do rynku). Pieniądze idą na spłatę długu.`,
            importance: 2, symbol: stock.symbol, action: { type: 'rescue', symbol: stock.symbol }
        });
        if ((playerPortfolio[stock.symbol]?.shares || 0) > 0) openRescueOfferingModal();
    } else {
        finalizeRescueOffering(stock);
    }
    return offer;
}

function acceptRescueOffer(quantity) {
    const offer = rescueOffer;
    const stock = offer && !offer.closed && stocks.find(s => s.symbol === offer.symbol);
    if (!stock) { showToast('Oferta emisji ratunkowej jest zamknięta.', 'default'); return false; }
    quantity = Math.min(Math.floor(Number(quantity) || 0), offer.fundReserved);
    if (!(quantity > 0)) { showToast('Podaj liczbę akcji.', 'warning'); return false; }
    if (playerCash < quantity * offer.price) { showToast('Za mało gotówki funduszu.', 'error'); return false; }
    issueRescueShares(stock, 'player', quantity, offer.price);
    logEvent(`📢 Fundusz obejmuje ${quantity.toLocaleString('pl-PL')} akcji z emisji ratunkowej ${stock.name}.`, 'review');
    changeReputation('player', stock.symbol, 10);
    finalizeRescueOffering(stock);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    closeRescueOfferingModal();
    return true;
}

function declineRescueOffer() {
    const stock = rescueOffer && stocks.find(s => s.symbol === rescueOffer.symbol);
    if (stock && !rescueOffer.closed) {
        if ((playerPortfolio[stock.symbol]?.shares || 0) > 0) changeReputation('player', stock.symbol, -5);
        finalizeRescueOffering(stock);
    }
    closeRescueOfferingModal();
}

function finalizeRescueOffering(stock) {
    if (rescueOffer?.symbol === stock.symbol) rescueOffer.closed = true;
    const raised = stock.rescueRaised || 0;
    stock.rescueRaised = 0;
    if (raised > 0) stock.financialHealth = Math.min(5, (Number(stock.financialHealth) || 0) + 0.5);
    logEvent(`📢 Emisja ratunkowa ${stock.name} zamknięta: zebrano ${raised.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł na spłatę długu.`, 'review');
}
