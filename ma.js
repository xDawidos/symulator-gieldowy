// ma.js — Fuzje i przejęcia, akcjonariat (etap G)
//
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
    if (stock.isStateOwned || stock.stateOwnershipPct > 0) add('state', 'Skarb Państwa', 'state', Math.floor(stock.totalShares * (stock.stateOwnershipPct || 0)));
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
