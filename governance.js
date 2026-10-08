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
    const proposedPolicy = order[Math.max(0, Math.min(order.length - 1, current + (health >= 2 ? 1 : health <= -2 ? -1 : 0)))];
    items.push({ id: 'dividend', kind: 'board', type: 'dividend', policy: proposedPolicy, label: `Polityka dywidendy: ${DIVIDEND_POLICIES[proposedPolicy].label}` });
    items.push({ id: 'discharge', kind: 'board', type: 'discharge', label: `Absolutorium dla prezesa ${stock.ceo?.name || ''}`.trim() });
    if (stock.cash > getMarketCapValue(stock) * 0.15 && Math.random() < 0.5) items.push({ id: 'buyback', kind: 'board', type: 'buyback', label: 'Program skupu akcji własnych' });
    else if (stock.cash < getMarketCapValue(stock) * 0.03 && Math.random() < 0.5) items.push({ id: 'issue', kind: 'board', type: 'issue', label: 'Emisja 10% nowych akcji' });

    for (const proposal of gov.proposals) {
        items.push({ id: `p-${proposal.type}`, kind: 'activist', type: proposal.type, by: 'player', label: `Wniosek funduszu: ${ACTIVIST_PROPOSALS[proposal.type].label}` });
    }
    gov.proposals = [];
    for (const item of items) item.playerVote = 'for'; // domyślnie „za wnioskiem”
    return items;
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
            return runBuyback(stock);
        case 'issue':
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
