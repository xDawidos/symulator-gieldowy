// scandals.js — Afery (wersja 0.11.3 „Ciemna Strefa”)
//
// Parabanki (3 scenariusze w stylu Amber Gold): bank otwiera się z kuszącą ofertą (wysokie lokaty dla funduszu,
// tanie kredyty bez badania zdolności, akcje z rabatem), kurs jego akcji rośnie. Gdy zbierze dość pieniędzy:
// dziennikarskie śledztwo (pilna wiadomość) → notowania zawieszone, kurs 0,01 zł → śledztwo policji → kurs
// odblokowany na wycenie likwidacyjnej (5–15% szczytu) → prezes ucieka, spółka znika. Lokaty w parabanku NIE są
// objęte gwarancją: fundusz odzyskuje 10–30%, traci zaufanie klientów, a duża lokata to wpis compliance.
// KNF może wcześniej wpisać parabank na listę ostrzeżeń publicznych.
// Wojny PR: dwie spółki z tej samej branży o podobnej kapitalizacji; KNF przeciwdziała czarnemu PR.

const PARABANK_SCENARIOS = [
    { id: 'gold',   name: 'Bursztynowy Kruszec Finanse', bankName: 'Bursztynowy Kruszec',   margin: 0.14, loanCut: 0.02, target: 6, desc: 'lokaty „zabezpieczone złotem”' },
    { id: 'piggy',  name: 'Złota Skarbonka S.A.',        bankName: 'Złota Skarbonka',        margin: 0.12, loanCut: 0.03, target: 5, desc: 'najwyższe lokaty w kraju' },
    { id: 'quick',  name: 'Szybka Kasa Plus S.A.',       bankName: 'Szybka Kasa Plus',       margin: 0.10, loanCut: 0.05, target: 5, desc: 'kredyty bez BIK w 15 minut' }
];
const PARABANK_SPAWN_CHANCE = 0.08;
const PARABANK_LOAN_LIMIT = 0.3;
const PARABANK_LOAN_QUARTERLY_RATE = 0.3;      // ≈ 2,3% tygodniowo
const PR_WAR_CHANCE = 0.12;

let scandals = createScandals();

function createScandals() {
    return { parabanks: [], usedScenarios: [], prWars: [], nextId: 1 };
}

function ensureScandals() {
    scandals = { ...createScandals(), ...(scandals || {}) };
    return scandals;
}

// =================================================================================
// PILNE WIADOMOŚCI
// =================================================================================

let breakingNewsTimer = null;

/** Pasek pilnych wiadomości (u góry ekranu, ~5 s) + mail z gazety. */
function showBreakingNews(text, mail = true) {
    const bar = document.getElementById('breaking-news');
    if (bar) {
        bar.innerHTML = `<strong>🔴 PILNE</strong> ${escapeHtml(text)}`;
        bar.hidden = false;
        clearTimeout(breakingNewsTimer);
        breakingNewsTimer = setTimeout(() => { bar.hidden = true; }, 5000);
    }
    if (mail && typeof addMail === 'function') addMail({ sender: 'OBSER', subject: `🔴 PILNE: ${text.slice(0, 100)}`, body: text, importance: 3 });
}

// =================================================================================
// PARABANKI
// =================================================================================

function getParabankFor(bankId) {
    return scandals.parabanks.find(p => p.bankId === bankId) || null;
}

function spawnParabank() {
    const scenario = PARABANK_SCENARIOS.find(s => !scandals.usedScenarios.includes(s.id));
    if (!scenario) return null;
    scandals.usedScenarios.push(scenario.id);
    const bank = {
        id: `para_${scenario.id}`, name: scenario.bankName, type: BANK_TYPES.INTERNET, isActive: true, isParabank: true,
        cash: 500_000, initialCapital: 500_000, reserveRatio: 0, baseInterestRateMargin: scenario.margin,
        stockPortfolio: {}, loanPortfolio: {}, startupInvestments: {}, depositPortfolio: {}
    };
    commercialBanks.push(bank);
    if (typeof updateInterestRates === 'function') updateInterestRates();
    const stock = createListedCompany({ name: scenario.name, symbol: uniqueSymbol(scenario.bankName.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase()), sector: ['Finanse'], price: getRandomInRange(20, 40), totalShares: 50000, exchange: 'BRONZE' });
    stock.isParabankStock = true;
    stocks.push(stock);
    const parabank = { id: `pb${scandals.nextId++}`, scenario: scenario.id, bankId: bank.id, symbol: stock.symbol, phase: 'open', quarters: 0, raised: 0, peakPrice: stock.price, knfWarned: false, collapseQuarter: null };
    scandals.parabanks.push(parabank);
    logEvent(`🏦 Nowy gracz na rynku: ${scenario.bankName} — ${scenario.desc}. Akcje ${stock.name} debiutują na Rynku Brązowym.`, 'market');
    addMail({ sender: 'PULS', subject: `🎁 ${scenario.bankName}: oferta, jakiej nie było`, body: `${scenario.bankName} kusi: ${scenario.desc}. Lokata dla funduszy nawet ${(getFundDepositRate(bank, 16) * 100).toFixed(1)}% rocznie. Akcje banku dla inwestorów instytucjonalnych z rabatem 10%.`, importance: 2, symbol: stock.symbol });
    return parabank;
}

/** Akcje parabanku dla funduszu z rabatem 10% (faza otwarcia). */
function buyParabankShares(parabankId, quantity) {
    const parabank = scandals.parabanks.find(p => p.id === parabankId);
    const stock = parabank && stocks.find(s => s.symbol === parabank.symbol);
    quantity = Math.floor(Number(quantity));
    if (!stock || parabank.phase !== 'open') { showToast('Oferta nieaktualna.', 'warning'); return false; }
    quantity = Math.min(quantity, getAvailableShares(stock));
    const cost = quantity * stock.price * 0.9;
    if (!(quantity > 0) || playerCash < cost) { showToast('Za mało gotówki albo akcji w ofercie.', 'error'); return false; }
    playerCash -= cost;
    const holding = playerPortfolio[stock.symbol] || (playerPortfolio[stock.symbol] = { shares: 0, avgPrice: 0, assetType: 'stock' });
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + quantity);
    holding.shares += quantity;
    stock.sharesHeld += quantity;
    adjustCompanyCash(stock, cost);
    parabank.raised += cost;
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

/** Kredyt dla funduszu bez badania zdolności — bardzo wysoki procent. */
function takeParabankLoan(parabankId, amount) {
    const parabank = scandals.parabanks.find(p => p.id === parabankId);
    const bank = parabank && commercialBanks.find(b => b.id === parabank.bankId);
    amount = Math.floor(Number(amount));
    if (!bank || parabank.phase !== 'open') { showToast('Oferta nieaktualna.', 'warning'); return false; }
    if (parabank.loan) { showToast('Najpierw spłać poprzedni kredyt.', 'warning'); return false; }
    if (!(amount > 0) || amount > getFundAssets() * PARABANK_LOAN_LIMIT) { showToast(`Limit: ${formatZl(getFundAssets() * PARABANK_LOAN_LIMIT, 0)}.`, 'warning'); return false; }
    playerCash += amount;
    parabank.loan = { owed: amount };
    logEvent(`💸 Fundusz bierze kredyt w ${bank.name}: ${formatZl(amount, 0)} (ok. 2,3% tygodniowo).`, 'review');
    return true;
}

function repayParabankLoan(parabankId) {
    const parabank = scandals.parabanks.find(p => p.id === parabankId);
    if (!parabank?.loan) return false;
    const paid = Math.min(Math.max(0, playerCash), parabank.loan.owed);
    playerCash -= paid;
    parabank.loan.owed -= paid;
    if (parabank.loan.owed <= 1) parabank.loan = null;
    return true;
}

function processParabanksQuarterly() {
    for (const parabank of scandals.parabanks) {
        const scenario = PARABANK_SCENARIOS.find(s => s.id === parabank.scenario);
        const bank = commercialBanks.find(b => b.id === parabank.bankId);
        const stock = stocks.find(s => s.symbol === parabank.symbol);
        parabank.quarters++;
        if (parabank.loan) parabank.loan.owed *= 1 + PARABANK_LOAN_QUARTERLY_RATE;

        if (parabank.phase === 'open') {
            // Boty wpłacają, kurs rośnie na fali entuzjazmu.
            for (const ai of aiCompetitors.filter(a => !a.isMafia && ['reckless', 'yolo_trader', 'dividend_chaser'].includes(a.personality))) {
                const amount = Math.max(0, ai.cash) * getRandomInRange(0.02, 0.06);
                ai.cash -= amount;
                parabank.raised += amount;
                if (bank) bank.cash += amount;
                parabank.botLosses = (parabank.botLosses || 0) + amount;
            }
            if (stock) {
                stock.price *= getRandomInRange(1.08, 1.2);
                parabank.peakPrice = Math.max(parabank.peakPrice, stock.price);
            }
            if (!parabank.knfWarned && Math.random() < getInstitutionEffectiveness(oversight.knf) * 0.35) {
                parabank.knfWarned = true;
                addMail({ sender: 'OBSER', subject: `⚠️ KNF: ${scenario.bankName} na liście ostrzeżeń publicznych`, body: `Komisja Nadzoru Finansowego ostrzega: ${scenario.bankName} nie ma licencji bankowej, a lokaty nie są objęte gwarancją. Uważaj.`, importance: 3, symbol: parabank.symbol });
            }
            if (parabank.quarters >= scenario.target) collapseParabank(parabank, 'investigation');
        } else if (parabank.phase === 'investigation') {
            collapseParabank(parabank, 'police');
        } else if (parabank.phase === 'police') {
            collapseParabank(parabank, 'fled');
        }
    }
    scandals.parabanks = scandals.parabanks.filter(p => p.phase !== 'gone');
}

/** Kolejne etapy upadku parabanku. */
function collapseParabank(parabank, phase) {
    const scenario = PARABANK_SCENARIOS.find(s => s.id === parabank.scenario);
    const bank = commercialBanks.find(b => b.id === parabank.bankId);
    const stock = stocks.find(s => s.symbol === parabank.symbol);
    parabank.phase = phase;

    if (phase === 'investigation') {
        if (bank) bank.frozen = true;
        if (stock) { stock.price = 0.01; stock.isTradeLocked = true; stock.tradeHalted = true; }
        showBreakingNews(`Dziennikarskie śledztwo w sprawie ${scenario.bankName}! Notowania zawieszone, wypłaty wstrzymane.`);
        settleParabankDeposits(parabank, 0.2);
        // Kredyt z parabanku: syndyk żąda natychmiastowej spłaty.
        if (parabank.loan) {
            const paid = Math.min(Math.max(0, playerCash), parabank.loan.owed);
            playerCash -= paid;
            parabank.loan = null;
            addMail({ sender: CORPORATION_SENDER, subject: `🧾 Syndyk ${scenario.bankName}: natychmiastowa spłata kredytu`, body: `Syndyk ściąga kredyt funduszu (${formatZl(paid, 0)}).`, importance: 3 });
        }
    } else if (phase === 'police') {
        showBreakingNews(`Policja prowadzi śledztwo w sprawie ${scenario.bankName}. Zarząd zatrzymany?`, false);
        logEvent(`🚓 Policja prowadzi śledztwo w sprawie ${scenario.bankName}.`, 'state');
        if (stock) {
            stock.price = Math.max(0.01, parabank.peakPrice * getRandomInRange(0.05, 0.15)); // wycena likwidacyjna
            stock.isTradeLocked = false;
            stock.tradeHalted = false;
        }
    } else if (phase === 'fled') {
        showBreakingNews(`Prezes ${scenario.bankName} uciekł za granicę z pieniędzmi klientów.`);
        if (stock) delistStockAtPrice(stock, stock.price);
        if (bank) { bank.isActive = false; bank.cash = 0; }
        parabank.phase = 'gone';
    }
}

/** Lokaty funduszu w parabanku: bez gwarancji — odzysk 10–30%, zaufanie i compliance. */
function settleParabankDeposits(parabank, recoveryBase) {
    let lost = 0, recovered = 0;
    for (const deposit of [...getFundDeposits()].filter(d => d.bankId === parabank.bankId)) {
        const value = deposit.principal + deposit.accrued;
        const back = value * clampValue(recoveryBase + getRandomInRange(-0.1, 0.1), 0.1, 0.3);
        playerCash += back;
        recovered += back;
        lost += value - back;
        getFundDeposits().splice(getFundDeposits().indexOf(deposit), 1);
    }
    if (lost <= 0 || !playerFund) return;
    const share = lost / Math.max(1, getFundAssets() + lost);
    playerFund.trust = Math.max(0, playerFund.trust - Math.min(15, 3 + share * 60));
    if (share > 0.05) playerProfile?.cv.push({ type: 'compliance', text: `Lokata w parabanku: strata ${formatZl(lost, 0)} (${(share * 100).toFixed(1)}% aktywów).` });
    addMail({ sender: CORPORATION_SENDER, subject: '💥 Lokata funduszu w parabanku przepadła', body: `Odzyskano ${formatZl(recovered, 0)}, strata ${formatZl(lost, 0)}. Klienci pytają, kto podjął tę decyzję.${share > 0.05 ? ' Zarząd korporacji wszczyna postępowanie wyjaśniające (wpis compliance).' : ''}`, importance: 3 });
}

// =================================================================================
// WOJNY PR
// =================================================================================

function startPrWar() {
    const busy = new Set(scandals.prWars.flatMap(w => [w.a, w.b]));
    const pool = stocks.filter(s => !s.assetType && !s.isBankrupt && !busy.has(s.symbol));
    for (let attempt = 0; attempt < 20; attempt++) {
        const a = getRandomElement(pool);
        const rivals = pool.filter(b => b !== a && b.sector?.some(sec => a.sector?.includes(sec)) && getMarketCapValue(b) / Math.max(1, getMarketCapValue(a)) > 0.7 && getMarketCapValue(b) / Math.max(1, getMarketCapValue(a)) < 1.4);
        if (!a || !rivals.length) continue;
        const b = getRandomElement(rivals);
        const war = { a: a.symbol, b: b.symbol, quartersLeft: getRandomIntInRange(2, 4), score: 0, boost: { [a.symbol]: 0, [b.symbol]: 0 } };
        scandals.prWars.push(war);
        logEvent(`📢 Wojna PR: ${a.name} kontra ${b.name}. Media pełne „ujawnionych dokumentów”.`, 'company');
        for (const stock of [a, b]) {
            if (getFundStakePct(stock) > 0.5) addMail({ sender: CORPORATION_SENDER, subject: `📢 Wojna PR: ${stock.name} jest stroną`, body: 'Jako większościowiec możesz wesprzeć kampanię (z gotówki spółki) albo zaproponować rozejm — w oknie Państwa → Nadzór.', importance: 2, symbol: stock.symbol });
        }
        return war;
    }
    return null;
}

/** Gracz (większość) wspiera kampanię swojej spółki — 1% kapitalizacji z gotówki spółki. */
function supportPrCampaign(symbol) {
    const war = scandals.prWars.find(w => w.a === symbol || w.b === symbol);
    const stock = stocks.find(s => s.symbol === symbol);
    if (!war || !stock || getFundStakePct(stock) <= 0.5) return false;
    const cost = Math.round(getMarketCapValue(stock) * 0.01);
    if (stock.cash < cost) { showToast('Spółka nie ma gotówki na kampanię.', 'error'); return false; }
    adjustCompanyCash(stock, -cost);
    adjustBalanceSheet(stock, { assets: -cost, retainedEarnings: -cost });
    war.boost[symbol] += 0.3;
    if (typeof getRecord === 'function') getRecord('player').suspicion += 5; // czarny PR bywa na granicy prawa
    showToast(`Kampania ${stock.name} nabiera rozpędu.`, 'success');
    return true;
}

function proposePrTruce(symbol) {
    const war = scandals.prWars.find(w => w.a === symbol || w.b === symbol);
    if (!war) return false;
    scandals.prWars = scandals.prWars.filter(w => w !== war);
    for (const s of [war.a, war.b]) applyPriceEffect(s, -0.01, 'negative', 'company');
    logEvent(`🕊️ Rozejm w wojnie PR ${war.a} – ${war.b}.`, 'company');
    return true;
}

function processPrWarsQuarterly() {
    const knf = getInstitutionEffectiveness(oversight.knf);
    for (const war of [...scandals.prWars]) {
        const a = stocks.find(s => s.symbol === war.a);
        const b = stocks.find(s => s.symbol === war.b);
        if (!a || !b) { scandals.prWars = scandals.prWars.filter(w => w !== war); continue; }
        for (const stock of [a, b]) {
            const cost = Math.min(Math.max(0, stock.cash) * 0.05, getMarketCapValue(stock) * 0.005);
            adjustCompanyCash(stock, -cost);
            adjustBalanceSheet(stock, { assets: -cost, retainedEarnings: -cost });
        }
        const round = gaussianRandom() + (war.boost[war.a] - war.boost[war.b]);
        war.score += round;
        applyPriceEffect(war.a, clampValue(round * 0.02, -0.03, 0.03), round >= 0 ? 'positive' : 'negative', 'company');
        applyPriceEffect(war.b, clampValue(-round * 0.02, -0.03, 0.03), round <= 0 ? 'positive' : 'negative', 'company');
        war.quartersLeft--;
        if (Math.random() < knf * 0.25) {
            for (const stock of [a, b]) {
                const fine = Math.round(Math.max(0, stock.cash) * 0.01);
                adjustCompanyCash(stock, -fine);
                adjustBalanceSheet(stock, { assets: -fine, retainedEarnings: -fine });
                governmentTreasury += fine;
            }
            logEvent(`⚖️ KNF przerywa wojnę PR ${a.name} – ${b.name} i nakłada kary za czarny PR.`, 'state');
            scandals.prWars = scandals.prWars.filter(w => w !== war);
        } else if (war.quartersLeft <= 0) {
            const [winner, loser] = war.score >= 0 ? [a, b] : [b, a];
            applyPriceEffect(winner.symbol, 0.05, 'positive', 'company');
            applyPriceEffect(loser.symbol, -0.05, 'negative', 'company');
            logEvent(`🏆 Wojnę PR wygrywa ${winner.name}; ${loser.name} traci wizerunek.`, 'company');
            scandals.prWars = scandals.prWars.filter(w => w !== war);
        }
    }
    if (scandals.prWars.length < 2 && Math.random() < PR_WAR_CHANCE) startPrWar();
}

// =================================================================================
// CO KWARTAŁ
// =================================================================================

function processScandalsQuarterly() {
    ensureScandals();
    processParabanksQuarterly();
    processPrWarsQuarterly();
    const active = scandals.parabanks.some(p => p.phase !== 'gone');
    if (!active && (typeof macro !== 'object' || macro.quarter >= 4) && Math.random() < PARABANK_SPAWN_CHANCE) spawnParabank();
}

// =================================================================================
// WIDOKI
// =================================================================================

/** Dodatek do karty banku: oferty parabanku i ostrzeżenie KNF. */
function renderParabankExtras(bank) {
    const parabank = getParabankFor(bank.id);
    if (!parabank) return '';
    const stock = stocks.find(s => s.symbol === parabank.symbol);
    if (parabank.phase !== 'open') return '<p class="text-down text-sm"><strong>⛔ Wypłaty wstrzymane — trwa śledztwo.</strong></p>';
    return `${parabank.knfWarned ? '<p class="text-down text-sm"><strong>⚠️ KNF: lista ostrzeżeń publicznych — lokaty bez gwarancji.</strong></p>' : '<p class="text-warn text-sm">🎁 Oferta specjalna — najwyższe oprocentowanie na rynku!</p>'}
        <div class="bank-card-form">${stock ? `<input type="text" inputmode="numeric" id="pb-shares-${parabank.id}" value="100" aria-label="Akcje"><button class="btn-secondary" onclick="buyParabankShares('${parabank.id}', parseInt(document.getElementById('pb-shares-${parabank.id}').value, 10)); renderCommercialBanksList();">Akcje −10%</button>` : ''}</div>
        <div class="bank-card-form">${parabank.loan
            ? `<span class="text-sm">Kredyt: ${formatZl(parabank.loan.owed, 0)}</span><button onclick="repayParabankLoan('${parabank.id}'); renderCommercialBanksList();">Spłać</button>`
            : `<input type="text" inputmode="numeric" id="pb-loan-${parabank.id}" value="${Math.floor(getFundAssets() * 0.1)}" aria-label="Kwota kredytu"><button class="btn-danger" onclick="takeParabankLoan('${parabank.id}', parseFloat(document.getElementById('pb-loan-${parabank.id}').value)); renderCommercialBanksList();">Kredyt bez BIK</button>`}</div>`;
}

/** Wojny PR (w zakładce Nadzór): przyciski dla większościowca. */
function renderPrWars() {
    if (!scandals.prWars.length) return '<p class="text-sm text-muted">Brak trwających wojen PR.</p>';
    return `<ul class="list-plain text-sm">${scandals.prWars.map(war => {
        const mine = [war.a, war.b].find(symbol => { const s = stocks.find(x => x.symbol === symbol); return s && getFundStakePct(s) > 0.5; });
        return `<li>📢 ${escapeHtml(war.a)} ⚔️ ${escapeHtml(war.b)} · zostało ${war.quartersLeft} kw. · przewaga: ${war.score >= 0 ? war.a : war.b}
            ${mine ? `<button class="btn-xs" onclick="supportPrCampaign('${mine}'); updateStateModalContent();">Wesprzyj ${escapeHtml(mine)}</button> <button class="btn-xs btn-secondary" onclick="proposePrTruce('${mine}'); updateStateModalContent();">Rozejm</button>` : ''}</li>`;
    }).join('')}</ul>`;
}
