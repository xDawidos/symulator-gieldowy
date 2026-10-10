// investments.js — Inwestycje spółek (etap G4)
//
// Każda inwestycja przechodzi etapy: projekt → budowa → weryfikacja, potem działa. Weryfikacja ocenia
// jakość (wydajność). Działająca inwestycja co kwartał dokłada do wyniku spółki zysk lub stratę
// (oczekiwany zwrot × wydajność × koniunktura sektora + losowość); po 4 stratnych kwartałach z rzędu
// zarząd ją wygasza. Większościowy akcjonariusz (fundusz) może dopłacić do inwestycji w toku
// w zamian za nowe akcje albo udział w jej zyskach. Bank Centralny dofinansowuje spółki państwowe,
// miasto — spółki miejskie (w zamian za akcje).

const INVESTMENT_STAGES = [
    { id: 'design', label: 'Projekt', share: 0.2 },
    { id: 'build', label: 'Budowa', share: 0.6 },
    { id: 'verify', label: 'Weryfikacja', share: 0.2 }
];
const INVESTMENT_QUALITY = {
    excellent: { label: 'wzorowa', icon: '🏅', efficiency: 1.1 },
    ok: { label: 'poprawna', icon: '✅', efficiency: 1.0 },
    defects: { label: 'usterki', icon: '⚠️', efficiency: 0.85 }
};
const INVESTMENT_LOSS_STREAK_LIMIT = 4;
const FUND_TOPUP_DISCOUNT = 0.05;
const FUND_INCOME_MAX_SHARE = 0.6;

// =================================================================================
// ETAPY I JAKOŚĆ
// =================================================================================

/** Etap inwestycji wewnętrznej z postępu (dni realizacji). */
function getInvestmentStageInfo(project) {
    const fraction = Math.max(0, Math.min(1, (Number(project.progress) || 0) / Math.max(1, Number(project.totalDuration) || 1)));
    let start = 0;
    const segments = INVESTMENT_STAGES.map(stage => {
        const fill = Math.max(0, Math.min(1, (fraction - start) / stage.share));
        start += stage.share;
        return { ...stage, fill };
    });
    const current = segments.find(segment => segment.fill < 1) || segments[segments.length - 1];
    return { fraction, segments, current };
}

/** Ocena weryfikacji: dział rozwoju i opóźnienia budowy wpływają na jakość. */
function rollVerificationQuality(stock, delays = 0) {
    const dev = Number(stock.departments?.development?.level) || 0;
    const pExcellent = Math.min(0.5, 0.12 + dev * 0.05);
    const pDefects = Math.max(0.05, 0.25 - dev * 0.04 + delays * 0.08);
    const roll = Math.random();
    if (roll < pExcellent) return 'excellent';
    if (roll < pExcellent + pDefects) return 'defects';
    return 'ok';
}

/** Oczekiwany roczny zwrot z kosztu (6% bazowo + premia z katalogu). */
function getExpectedAnnualRoi(incomeBonus) {
    return 0.06 + Math.max(0, Number(incomeBonus) || 0) * 0.6;
}

function registerOperatingInvestment(stock, { id, name, cost, incomeBonus, quality = 'ok', fundIncomePct = 0, fundInvested = 0, lifeQuarters = null }) {
    if (!Array.isArray(stock.operatingInvestments)) stock.operatingInvestments = [];
    const def = INVESTMENT_QUALITY[quality] || INVESTMENT_QUALITY.ok;
    const operating = {
        uid: nextSimulationId('op'),
        id, name,
        cost: Math.max(0, Number(cost) || 0),
        roi: getExpectedAnnualRoi(incomeBonus),
        quality,
        efficiency: def.efficiency,
        quarters: 0,
        lastResult: 0,
        totalResult: 0,
        lossStreak: 0,
        fundIncomePct: Math.min(FUND_INCOME_MAX_SHARE, Math.max(0, fundIncomePct)),
        fundInvested,
        fundPaid: 0,
        lifeQuarters // kampanie i szkolenia (bez majątku) działają ograniczony czas
    };
    stock.operatingInvestments.push(operating);
    logEvent(`🔍 ${stock.name}: weryfikacja „${name}” — jakość ${def.icon} ${def.label}. Inwestycja zaczyna działać.`, 'company');
    return operating;
}

// =================================================================================
// WYNIK KWARTALNY DZIAŁAJĄCYCH INWESTYCJI (wołane z computeQuarterResults)
// =================================================================================

function processOperatingInvestments(stock) {
    if (!Array.isArray(stock.operatingInvestments) || !stock.operatingInvestments.length) return 0;
    const profile = getSectorProfile(stock);
    const cycle = 1 + profile.beta * getGdpDriver() * 10;
    let total = 0;

    for (const operating of [...stock.operatingInvestments]) {
        const expected = operating.cost * operating.roi / 4;
        let result = expected * operating.efficiency * cycle + gaussianRandom() * expected * 0.9;
        operating.quarters++;

        // Udział funduszu w zysku (dopłata „za dochód”).
        if (result > 0 && operating.fundIncomePct > 0 && playerFund) {
            const payout = result * operating.fundIncomePct;
            result -= payout;
            playerCash += payout;
            operating.fundPaid += payout;
            recordPayment(stock, 'player-fund', payout, `Udział w zysku: ${operating.name}`);
        }

        operating.lastResult = result;
        operating.totalResult += result;
        operating.lossStreak = result < 0 ? operating.lossStreak + 1 : 0;
        total += result;

        if (operating.lifeQuarters && operating.quarters >= operating.lifeQuarters) {
            stock.operatingInvestments = stock.operatingInvestments.filter(item => item !== operating);
            logEvent(`⏹️ ${stock.name}: „${operating.name}” zakończyła działanie (łączny wynik ${Math.round(operating.totalResult).toLocaleString('pl-PL')} zł).`, 'company');
        } else if (operating.lossStreak >= INVESTMENT_LOSS_STREAK_LIMIT) {
            const writeOff = Math.round(operating.cost * 0.4);
            adjustBalanceSheet(stock, { assets: -writeOff, retainedEarnings: -writeOff });
            stock.operatingInvestments = stock.operatingInvestments.filter(item => item !== operating);
            logEvent(`📉 ${stock.name} wygasza nierentowną inwestycję „${operating.name}” (odpis ${writeOff.toLocaleString('pl-PL')} zł).`, 'company');
        }
    }
    return total;
}

// =================================================================================
// DOPŁATA FUNDUSZU (większościowy akcjonariusz)
// =================================================================================

function canFundTopUp(stock) {
    return playerFund && getFundStakePct(stock) > 0.5;
}

/**
 * Dopłata funduszu do inwestycji w toku.
 * mode 'shares' — nowa emisja dla funduszu po cenie rynkowej −5% (także ponad limit akcji);
 * mode 'income' — udział w zysku tej inwestycji (do 60%, proporcjonalnie do dopłaty).
 */
function fundTopUpInvestment(symbol, uid, amount, mode) {
    const stock = stocks.find(s => s.symbol === symbol);
    const project = stock?.activeInvestments?.find(item => item.uid === uid);
    amount = Math.floor(Number(amount));
    if (!stock || !project) { showToast('Inwestycja nie jest już w toku.', 'error'); return false; }
    if (!canFundTopUp(stock)) { showToast('Dopłata wymaga większości (> 50%) akcji w funduszu.', 'warning'); return false; }
    if (!(amount >= 100) || amount > playerCash) { showToast('Za mało gotówki funduszu (minimum 100 zł).', 'error'); return false; }
    const remaining = Math.max(0, project.cost - (project.fundTopUp || 0));
    amount = Math.min(amount, remaining);
    if (!(amount > 0)) { showToast('Fundusz sfinansował już całą inwestycję.', 'default'); return false; }

    let newShares = 0;
    if (mode === 'shares') {
        // B1: rabat 5% tylko do 25% kosztu inwestycji; nowe akcje ponad limit najwyżej +10% akcji spółki.
        if (!Number.isFinite(stock.topUpBaseShares)) stock.topUpBaseShares = stock.totalShares; // limit liczony od akcji sprzed pierwszej dopłaty
        const capShares = Math.max(0, Math.floor(stock.topUpBaseShares * 0.1) - (stock.topUpShares || 0));
        if (capShares <= 0) { showToast('Limit nowych akcji z dopłat (10% spółki) wyczerpany — wybierz udział w zysku.', 'warning'); return false; }
        const discountRoom = Math.max(0, project.cost * 0.25 - (project.discountedTopUp || 0));
        const discountPrice = stock.price * (1 - FUND_TOPUP_DISCOUNT);
        const discountedShares = Math.min(capShares, Math.floor(Math.min(amount, discountRoom) / discountPrice));
        const fullShares = Math.min(capShares - discountedShares, Math.floor((amount - discountedShares * discountPrice) / stock.price));
        newShares = discountedShares + Math.max(0, fullShares);
        if (newShares <= 0) { showToast('Kwota za mała na choćby jedną akcję.', 'warning'); return false; }
        amount = Math.round(discountedShares * discountPrice + Math.max(0, fullShares) * stock.price); // płacisz tylko za objęte akcje
        project.discountedTopUp = (project.discountedTopUp || 0) + discountedShares * discountPrice;
    }

    playerCash -= amount;
    adjustCompanyCash(stock, amount);
    project.fundTopUp = (project.fundTopUp || 0) + amount;

    if (mode === 'shares') {
        stock.topUpShares = (stock.topUpShares || 0) + newShares;
        stock.maxShares = Math.max(Number(stock.maxShares) || 0, stock.totalShares) + newShares; // ponad limit emisji
        stock.totalShares += newShares;
        stock.sharesHeld += newShares;
        const holding = playerPortfolio[symbol];
        holding.avgPrice = (holding.avgPrice * holding.shares + amount) / (holding.shares + newShares);
        holding.shares += newShares;
        adjustBalanceSheet(stock, { assets: amount, retainedEarnings: amount });
        recordPayment('player-fund', stock, amount, `Dopłata za akcje: ${project.name}`);
        logEvent(`💼 Fundusz dopłaca ${amount.toLocaleString('pl-PL')} zł do „${project.name}” (${stock.name}) i obejmuje ${newShares.toLocaleString('pl-PL')} nowych akcji.`, 'review');
    } else {
        const pct = Math.min(FUND_INCOME_MAX_SHARE, FUND_INCOME_MAX_SHARE * project.fundTopUp / Math.max(1, project.cost));
        project.fundIncomePct = pct;
        project.fundInvested = (project.fundInvested || 0) + amount;
        adjustBalanceSheet(stock, { assets: amount, liabilities: amount }); // zobowiązanie wobec funduszu (udział w zysku)
        recordPayment('player-fund', stock, amount, `Dopłata za udział w zysku: ${project.name}`);
        logEvent(`💼 Fundusz dopłaca ${amount.toLocaleString('pl-PL')} zł do „${project.name}” (${stock.name}) za ${(pct * 100).toFixed(0)}% zysku tej inwestycji.`, 'review');
    }
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

// =================================================================================
// FINANSOWANIE PUBLICZNE: Bank Centralny → spółki państwowe, miasto → spółki miejskie
// =================================================================================

function issueSharesToPublicOwner(stock, amount, owner) {
    const newShares = Math.floor(amount / Math.max(0.01, stock.price * (1 - FUND_TOPUP_DISCOUNT)));
    if (newShares <= 0) return 0;
    const oldTotal = stock.totalShares;
    stock.totalShares += newShares;
    stock.maxShares = Math.max(Number(stock.maxShares) || 0, oldTotal) + newShares;
    if (owner === 'state') {
        const stateShares = oldTotal * (stock.stateOwnershipPct || 0) + newShares;
        stock.stateOwnershipPct = stateShares / stock.totalShares; // pakiet państwa poza wolnym obrotem
    } else {
        stock.cityShares = (Number(stock.cityShares) || 0) + newShares;
        stock.sharesHeld += newShares; // miasto jako inwestor w obrocie
    }
    adjustCompanyCash(stock, amount);
    adjustBalanceSheet(stock, { assets: amount, retainedEarnings: amount });
    return newShares;
}

/** Co kwartał: dofinansowanie inwestycji w toku spółek państwowych i miejskich. */
function processPublicInvestmentFunding() {
    const recession = ['recession', 'slowdown'].includes(economyCycle?.phase);
    for (const stock of stocks) {
        if (stock.isBankrupt || stock.assetType) continue;
        const project = (stock.activeInvestments || []).find(item => !item.publicFunding);
        if (!project) continue;
        const amount = Math.round(project.cost * 0.4);

        if (stock.isStateOwned && Math.random() < (recession ? 0.6 : 0.3) && centralBank.funds > amount * 5) {
            centralBank.funds -= amount;
            const shares = issueSharesToPublicOwner(stock, amount, 'state');
            project.publicFunding = 'state';
            logEvent(`🏛️ Bank Centralny dofinansowuje „${project.name}” w ${stock.name}: ${amount.toLocaleString('pl-PL')} zł za ${shares.toLocaleString('pl-PL')} akcji.`, 'state');
        } else if (stock.isMunicipal && Math.random() < (city.mayor?.policy === 'municipal' ? 0.6 : 0.25) && city.budget > amount * 3) {
            city.budget -= amount;
            const shares = issueSharesToPublicOwner(stock, amount, 'city');
            project.publicFunding = 'city';
            logEvent(`🏙️ Miasto dofinansowuje „${project.name}” w ${stock.name}: ${amount.toLocaleString('pl-PL')} zł za ${shares.toLocaleString('pl-PL')} akcji.`, 'city');
        }
    }
}
