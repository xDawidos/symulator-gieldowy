// etf.js — ETF-y z prawdziwym portfelem (wersja 0.10.2, część M3)
//
// Każdy ETF ma emitenta (bank inwestycyjny / internetowy albo GPW), strategię z losowymi zasadami
// (sektor, maks. udział jednej spółki, tylko płacący dywidendę, tylko giełda złota+, tylko spółki
// państwowe, tylko arystokraci, REIT-y, holdingi), portfel prawdziwych akcji kupionych na rynku
// (widoczny w akcjonariacie spółek) i cenę = wartość aktywów netto / liczba jednostek.
// Co kwartał przegląda skład (rebalancing). Co roku sprawdza cel wzrostu (5–12%): gdy go nie dowozi,
// zmienia sposób ważenia. Banki tworzą nowe ETF-y; małe ETF-y banków są zamykane.

const ETF_CASH_BUFFER = 0.03;
const ETF_START_UNITS = 10000;
const ETF_MAX_COUNT = 22;
const ETF_CLOSE_NAV = 150000;
const ETF_MIN_SHARES = 5000;
const ETF_MAX_TRADE_PCT = 0.05; // jednorazowo najwyżej 5% akcji spółki
const ETF_WEIGHTINGS = { cap: 'wg kapitalizacji', equal: 'równe wagi', value: 'niedowartościowane' };

const ETF_TEMPLATES = [
    { key: 'Technologia', label: 'Tech', rules: { sectors: ['Technologia', 'Gaming', 'Badania'] } },
    { key: 'Bankowość', label: 'Banki', rules: { sectors: ['Bankowość', 'Bankowość Komercyjna', 'Finanse'] } },
    { key: 'Przemysł', label: 'Przemysł', rules: { sectors: ['Przemysł', 'Chemia'] } },
    { key: 'Energia', label: 'Energia', rules: { sectors: ['Energia'] } },
    { key: 'Nieruchomości', label: 'Nieruchomości', rules: { sectors: ['Nieruchomości', 'Budowlany'] } },
    { key: 'Medycyna', label: 'Zdrowie', rules: { sectors: ['Medycyna'] } },
    { key: 'Konsument', label: 'Konsument', rules: { sectors: ['Dobra konsumpcyjne', 'Żywność', 'Turystyka'] } },
    { key: 'Usługi', label: 'Usługi', rules: { sectors: ['Usługi', 'Logistyka', 'Transport', 'Media'] } },
    { key: 'Dywidendowy', label: 'Dywidendowy', rules: { dividendOnly: true } },
    { key: 'Arystokraci', label: 'Arystokratów', rules: { aristocratsOnly: true } },
    { key: 'Złoty', label: 'Blue Chip', rules: { minExchangeLevel: 3 } },
    { key: 'Państwowy', label: 'Skarbu Państwa', rules: { stateOnly: true } },
    { key: 'REIT', label: 'REIT', rules: { assetType: 'REIT' } },
    { key: 'Holding', label: 'Holdingów', rules: { assetType: 'Holding' } }
];

// Startowy zestaw (symbole zachowane z poprzednich wersji tam, gdzie się da).
const ETF_START_SET = [
    ['TSX', 'Technologia'], ['FSX', 'Bankowość'], ['PSX', 'Przemysł'], ['ESX', 'Energia'], ['NSX', 'Nieruchomości'],
    ['MHX', 'Medycyna'], ['DKX', 'Konsument'], ['USX', 'Usługi'], ['DVX', 'Dywidendowy'], ['ARX', 'Arystokraci'],
    ['BCX', 'Złoty'], ['SPX', 'Państwowy'], ['RTX', 'REIT'], ['HDX', 'Holding']
];

function getEtfIssuers() {
    return commercialBanks.filter(bank => bank.isActive && [BANK_TYPES.INVESTMENT, BANK_TYPES.INTERNET].includes(bank.type));
}

function randomEtfRules(template) {
    const rules = { sectors: [], assetType: null, maxWeight: getRandomInRange(0.1, 0.25), dividendOnly: false, minExchangeLevel: 0, stateOnly: false, aristocratsOnly: false, ...template.rules };
    // Losowe dodatkowe zasady — każdy ETF jest trochę inny.
    if (!rules.dividendOnly && !rules.assetType && Math.random() < 0.2) rules.dividendOnly = true;
    if (!rules.minExchangeLevel && !rules.assetType && Math.random() < 0.15) rules.minExchangeLevel = 2;
    return rules;
}

function describeEtfRules(etf) {
    const r = etf.rules;
    const parts = [];
    if (r.sectors?.length) parts.push(r.sectors.join(', '));
    if (r.assetType) parts.push(r.assetType === 'REIT' ? 'tylko REIT-y' : 'tylko holdingi');
    if (r.dividendOnly) parts.push('tylko płacący dywidendę');
    if (r.aristocratsOnly) parts.push('tylko arystokraci');
    if (r.stateOnly) parts.push('tylko spółki państwowe');
    if (r.minExchangeLevel) parts.push(`giełda: ${Object.values(exchanges).find(e => e.level === r.minExchangeLevel)?.name || r.minExchangeLevel}+`);
    parts.push(`maks. ${(r.maxWeight * 100).toFixed(0)}% na spółkę`);
    parts.push(ETF_WEIGHTINGS[etf.weighting]);
    return parts.join(' · ');
}

function createEtf({ symbol, templateKey, issuer = null, seed }) {
    const template = ETF_TEMPLATES.find(t => t.key === templateKey) || ETF_TEMPLATES[0];
    const issuerName = issuer?.name || 'GPW';
    const etf = {
        symbol,
        name: `${issuerName} ${template.label} ETF`,
        template: template.key,
        issuerId: issuer?.id || null,
        issuerName,
        rules: randomEtfRules(template),
        weighting: getRandomElement(Object.keys(ETF_WEIGHTINGS)),
        holdings: {},
        cash: seed,
        units: ETF_START_UNITS,
        price: seed / ETF_START_UNITS,
        priceHistory: [],
        yearTarget: getRandomInRange(0.05, 0.12),
        yearStartPrice: seed / ETF_START_UNITS,
        quartersInYear: 0,
        ageQuarters: 0,
        lastResult: null
    };
    etf.description = `Emitent: ${issuerName}. Zasady: ${describeEtfRules(etf)}.`;
    return etf;
}

/** Nowa gra (i migracja starszych zapisów): startowy zestaw ETF-ów z portfelami. */
function initializeEtfs() {
    etfs.length = 0;
    const issuers = getEtfIssuers();
    for (const [symbol, templateKey] of ETF_START_SET) {
        const issuer = Math.random() < 0.6 && issuers.length ? getRandomElement(issuers) : null;
        const etf = createEtf({ symbol, templateKey, issuer, seed: getRandomIntInRange(5, 20) * 100000 });
        etfs.push(etf);
        rebalanceEtf(etf, true);
        updateEtfPrice(etf);
    }
}

// =================================================================================
// SKŁAD I WYCENA
// =================================================================================

function isEtfEligible(etf, stock) {
    const r = etf.rules;
    if (!stock || stock.isBankrupt || stock.canBeTraded === false || stock.exchange === 'INCUBATOR' || !(stock.price > 0)) return false;
    // Ostrożność: bez małych emisji i cen oderwanych od wartości godziwej.
    if ((stock.totalShares || 0) < ETF_MIN_SHARES) return false;
    const fair = Number(stock.fundamentals?.fairValue);
    if (fair > 0 && (stock.price > fair * 4 || stock.price < fair / 4)) return false;
    if (r.assetType ? stock.assetType !== r.assetType : Boolean(stock.assetType)) return false;
    if (r.sectors?.length && !stock.sector?.some(sector => r.sectors.includes(sector))) return false;
    if (r.dividendOnly && !(stock.assetType === 'REIT' || (stock.dividendHistory || []).length > 0 || stock.dividendPolicy && stock.dividendPolicy !== 'Growth')) return false;
    if (r.aristocratsOnly && !stock.isDividendAristocrat) return false;
    if (r.stateOnly && !stock.isStateOwned) return false;
    if (r.minExchangeLevel && (exchanges[stock.exchange]?.level || 0) < r.minExchangeLevel) return false;
    return true;
}

function getEtfUniverse(etf) {
    let universe = stocks.filter(stock => isEtfEligible(etf, stock));
    // Arystokratów jeszcze nie ma — tymczasowo płacący dywidendę.
    if (!universe.length && etf.rules.aristocratsOnly) universe = stocks.filter(stock => isEtfEligible({ ...etf, rules: { ...etf.rules, aristocratsOnly: false, dividendOnly: true } }, stock));
    return universe;
}

function getEtfTargetWeights(etf, universe) {
    const raw = universe.map(stock => {
        if (etf.weighting === 'equal') return 1;
        if (etf.weighting === 'value') {
            const fair = Number(stock.fundamentals?.fairValue) || stock.price;
            return Math.max(0.2, Math.min(3, fair / stock.price)) * Math.sqrt(stock.price * stock.totalShares);
        }
        return stock.price * stock.totalShares;
    });
    let weights = normalizeWeights(raw);
    // Limit udziału jednej spółki — nadwyżkę rozdziel na pozostałe (kilka przejść).
    const cap = Math.max(etf.rules.maxWeight, 1 / Math.max(1, universe.length));
    for (let pass = 0; pass < 5; pass++) {
        const over = weights.reduce((sum, w) => sum + Math.max(0, w - cap), 0);
        if (over < 1e-9) break;
        const free = weights.reduce((sum, w) => sum + (w < cap ? w : 0), 0) || 1;
        weights = weights.map(w => w >= cap ? cap : w + over * w / free);
    }
    return weights;
}

function normalizeWeights(values) {
    const total = values.reduce((sum, v) => sum + v, 0) || 1;
    return values.map(v => v / total);
}

function getEtfNav(etf) {
    let value = Math.max(0, Number(etf.cash) || 0);
    for (const [symbol, shares] of Object.entries(etf.holdings)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) value += shares * stock.price;
    }
    return value;
}

function updateEtfPrice(etf) {
    etf.price = Math.max(0.01, getEtfNav(etf) / Math.max(1, etf.units));
    etf.priceHistory.push(etf.price);
    if (etf.priceHistory.length > 15) etf.priceHistory.shift();
}

/** Wołane co tik (economy.js) zamiast średniej cen sektora. */
function updateEtfPrices() {
    etfs.forEach(updateEtfPrice);
}

function etfSell(etf, stock, shares) {
    shares = Math.min(shares, etf.holdings[stock.symbol] || 0);
    if (!(shares > 0)) return 0;
    etf.holdings[stock.symbol] -= shares;
    if (etf.holdings[stock.symbol] <= 0) delete etf.holdings[stock.symbol];
    stock.sharesHeld = Math.max(0, stock.sharesHeld - shares);
    etf.cash += shares * stock.price;
    if (!etf.silentTrades) applyTradeImpact(stock, shares, -1);
    return shares;
}

function etfBuy(etf, stock, shares) {
    shares = Math.floor(Math.min(shares, getAvailableShares(stock), etf.cash / stock.price, stock.totalShares * ETF_MAX_TRADE_PCT));
    if (!(shares > 0)) return 0;
    etf.holdings[stock.symbol] = (etf.holdings[stock.symbol] || 0) + shares;
    stock.sharesHeld += shares;
    etf.cash -= shares * stock.price;
    if (!etf.silentTrades) applyTradeImpact(stock, shares, 1);
    return shares;
}

/** Przegląd składu: sprzedaj nadwyżki i spółki spoza zasad, dokup braki. */
function rebalanceEtf(etf, silent = false) {
    etf.silentTrades = silent;
    const universe = getEtfUniverse(etf);
    const weights = getEtfTargetWeights(etf, universe);
    const investable = getEtfNav(etf) * (1 - ETF_CASH_BUFFER);
    const targets = new Map(universe.map((stock, i) => [stock.symbol, Math.floor(investable * weights[i] / stock.price)]));

    for (const symbol of Object.keys(etf.holdings)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (!stock) { delete etf.holdings[symbol]; continue; }
        const excess = etf.holdings[symbol] - (targets.get(symbol) || 0);
        if (excess > 0) etfSell(etf, stock, excess);
    }
    for (const stock of universe) {
        const missing = (targets.get(stock.symbol) || 0) - (etf.holdings[stock.symbol] || 0);
        if (missing > 0) etfBuy(etf, stock, missing);
    }
    etf.silentTrades = false;
}

/** Sprzedaż akcji proporcjonalnie, by mieć gotówkę na umorzenie jednostek. */
function raiseEtfCash(etf, amount) {
    const nav = getEtfNav(etf);
    if (etf.cash >= amount || nav <= 0) return;
    const fraction = Math.min(1, (amount - etf.cash) / Math.max(1, nav - etf.cash) * 1.02);
    for (const [symbol, shares] of Object.entries(etf.holdings)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) etfSell(etf, stock, Math.ceil(shares * fraction));
    }
}

// =================================================================================
// CO KWARTAŁ: REBALANCING, CEL ROCZNY, NOWE I ZAMYKANE ETF-y
// =================================================================================

function processEtfsQuarterly() {
    for (const etf of [...etfs]) {
        etf.ageQuarters++;
        etf.quartersInYear++;
        rebalanceEtf(etf);
        updateEtfPrice(etf);
        if (etf.quartersInYear >= 4) reviewEtfYear(etf);
        if (etf.issuerId && etf.ageQuarters >= 8 && getEtfNav(etf) < ETF_CLOSE_NAV) closeEtf(etf, 'za małe aktywa');
    }
    maybeLaunchBankEtf();
}

function reviewEtfYear(etf) {
    const result = etf.price / Math.max(0.01, etf.yearStartPrice) - 1;
    const hit = result >= etf.yearTarget;
    etf.lastResult = { result, target: etf.yearTarget, hit };
    if (!hit) {
        const previous = etf.weighting;
        etf.weighting = getRandomElement(Object.keys(ETF_WEIGHTINGS).filter(w => w !== previous));
        if (Math.random() < 0.3) etf.rules.maxWeight = Math.max(0.08, Math.min(0.35, etf.rules.maxWeight + getRandomInRange(-0.05, 0.05)));
        etf.description = `Emitent: ${etf.issuerName}. Zasady: ${describeEtfRules(etf)}.`;
        logEvent(`📊 ${etf.name} nie osiągnął celu (${(result * 100).toFixed(1)}% vs ${(etf.yearTarget * 100).toFixed(1)}%) — zmienia strategię na „${ETF_WEIGHTINGS[etf.weighting]}”.`, 'market');
    }
    etf.yearTarget = getRandomInRange(0.05, 0.12);
    etf.yearStartPrice = etf.price;
    etf.quartersInYear = 0;
}

function makeEtfSymbol(issuer) {
    const base = (issuer?.name || 'ETF').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2) || 'EX';
    for (let i = 0; i < 50; i++) {
        const symbol = `${base}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}X`;
        if (!etfs.some(e => e.symbol === symbol) && !stocks.some(s => s.symbol === symbol)) return symbol;
    }
    return `${base}${Date.now() % 1000}`;
}

function maybeLaunchBankEtf() {
    if (etfs.length >= ETF_MAX_COUNT) return null;
    const issuers = getEtfIssuers().filter(bank => bank.cash > 2e6 && etfs.filter(e => e.issuerId === bank.id).length < 3);
    if (!issuers.length || Math.random() > 0.15) return null;
    const issuer = getRandomElement(issuers);
    const seed = Math.round(issuer.cash * 0.05);
    issuer.cash -= seed;
    const etf = createEtf({ symbol: makeEtfSymbol(issuer), templateKey: getRandomElement(ETF_TEMPLATES).key, issuer, seed });
    etfs.push(etf);
    rebalanceEtf(etf);
    updateEtfPrice(etf);
    logEvent(`🆕 ${issuer.name} wprowadza na giełdę ${etf.name} (${etf.symbol}). ${etf.description}`, 'market');
    return etf;
}

/** Likwidacja: sprzedaż akcji, wypłata posiadaczom jednostek (fundusz gracza po cenie jednostki). */
function closeEtf(etf, reason) {
    for (const [symbol, shares] of Object.entries(etf.holdings)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) etfSell(etf, stock, shares);
    }
    const price = etf.cash / Math.max(1, etf.units);
    const holding = playerPortfolio[etf.symbol];
    if (holding) {
        playerCash += holding.shares * price;
        delete playerPortfolio[etf.symbol];
        showToast(`${etf.name} zostaje zamknięty — fundusz dostaje ${formatZl(holding.shares * price, 0)}.`, 'warning', 7000);
    }
    const issuer = commercialBanks.find(b => b.id === etf.issuerId);
    if (issuer) issuer.cash += Math.max(0, etf.cash - (holding ? holding.shares * price : 0)) * 0.5; // część wraca do emitenta (jego wkład)
    etfs.splice(etfs.indexOf(etf), 1);
    logEvent(`🔒 ${etf.name} zostaje zamknięty (${reason}).`, 'market');
}

/** Spółka znika z gry (przejęcie, bankructwo): pakiety ETF-ów. pricePerShare — wypłata w przejęciu. */
function settleEtfHoldings(symbol, pricePerShare = 0) {
    for (const etf of etfs) {
        const shares = etf.holdings[symbol] || 0;
        if (!shares) continue;
        etf.cash += shares * pricePerShare;
        delete etf.holdings[symbol];
    }
}

// =================================================================================
// HANDEL FUNDUSZU GRACZA (jednostki ETF: kreacja i umorzenie po wartości aktywów)
// =================================================================================

function getEtfCharismaBonus() {
    return [0, 0.005, 0.01, 0.015][Math.min(3, getSkillLevel('sharkCharisma'))] || 0;
}

function buyEtf(symbol, quantity) {
    if (getSkillLevel('etfExpert') === 0) { showToast("Musisz odblokować umiejętność 'Ekspert Rynków Globalnych', aby handlować funduszami ETF!"); return false; }
    const etf = etfs.find(e => e.symbol === symbol);
    quantity = Math.floor(Number(quantity));
    if (!etf || !(quantity > 0)) { showToast('Nieprawidłowe zlecenie ETF.', 'error'); return false; }
    const value = etf.price * quantity;
    const cost = value * (1 - getEtfCharismaBonus());
    if (playerCash < cost) { showToast('Nie masz wystarczająco gotówki, aby dokonać tego zakupu!'); return false; }

    playerCash -= cost;
    etf.units += quantity;
    etf.cash += value; // kreacja jednostek po wartości aktywów (rabat z charyzmy płaci emitent)
    const holding = playerPortfolio[symbol];
    if (holding) {
        holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + quantity);
        holding.shares += quantity;
    } else {
        playerPortfolio[symbol] = { shares: quantity, avgPrice: cost / quantity, assetType: 'etf' };
    }
    displayCash();
    displayPortfolio();
    if (typeof checkPlayerTierUpgrade === 'function') checkPlayerTierUpgrade();
    return true;
}

function sellEtf(symbol, quantity) {
    if (getSkillLevel('etfExpert') === 0) { showToast("Musisz odblokować umiejętność 'Ekspert Rynków Globalnych', aby handlować funduszami ETF!"); return false; }
    const etf = etfs.find(e => e.symbol === symbol);
    const holding = playerPortfolio[symbol];
    quantity = Math.floor(Number(quantity));
    if (!etf || !holding || !(quantity > 0) || holding.shares < quantity) {
        showToast(`Nie masz wystarczającej liczby jednostek ${etf ? etf.name : symbol}. Posiadasz: ${holding ? holding.shares : 0}`);
        return false;
    }
    const value = etf.price * quantity;
    raiseEtfCash(etf, value);
    const paid = Math.min(value, etf.cash);
    etf.cash -= paid;
    etf.units -= quantity;
    const proceeds = paid * (1 + getEtfCharismaBonus());
    const profit = proceeds - holding.avgPrice * quantity;
    playerCash += proceeds;
    holding.shares -= quantity;
    if (holding.shares <= 0) delete playerPortfolio[symbol];
    logEvent(`Fundusz umarza ${quantity} jedn. ${etf.name} (wynik ${profit >= 0 ? '+' : ''}${profit.toFixed(2)} zł).`, 'review');
    displayCash();
    displayPortfolio();
    if (typeof checkPlayerTierUpgrade === 'function') checkPlayerTierUpgrade();
    return true;
}

/** Skład ETF-u (top pozycje z wagami) — do tabeli i okna szczegółów. */
function getEtfTopHoldings(etf, limit = 3) {
    const nav = getEtfNav(etf) || 1;
    return Object.entries(etf.holdings)
        .map(([symbol, shares]) => { const stock = stocks.find(s => s.symbol === symbol); return stock ? { symbol, weight: shares * stock.price / nav } : null; })
        .filter(Boolean).sort((a, b) => b.weight - a.weight).slice(0, limit);
}

// =================================================================================
// ZAPIS
// =================================================================================

function serializeEtfs() {
    return etfs.map(etf => ({ ...etf, silentTrades: undefined }));
}

function restoreEtfs(saved) {
    if (!Array.isArray(saved) || !saved.length || !saved[0].holdings) { initializeEtfs(); return false; }
    etfs.length = 0;
    for (const etf of saved) etfs.push({ ...etf, priceHistory: Array.isArray(etf.priceHistory) ? etf.priceHistory : [] });
    return true;
}
