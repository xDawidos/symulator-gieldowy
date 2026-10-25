// =================================================================================
// splits.js: 0.15.4 P4. Podział akcji (split) i konsolidacja (reverse split).
// Spółka z kursem od 1000 zł dzieli akcje (2:1…1000:1), spółka z kursem poniżej 1 zł je skupia (1:2…1:100);
// szansa 20% na kwartał po przekroczeniu progu. Wartość pozycji, historia kursów i dywidend nie zmieniają się —
// zmienia się liczba akcji (i kurs odwrotnie): u wszystkich posiadaczy, w zastawach, zleceniach i wykresach.
// =================================================================================

const SPLIT_PRICE = 1000;              // od tego kursu spółka może ogłosić split
const REVERSE_SPLIT_PRICE = 1;         // poniżej tego kursu — konsolidację
const SPLIT_CHANCE = 0.20;             // na kwartał po przekroczeniu progu
const SPLIT_URGENT_CHANCE = 0.50;      // gdy kurs dobił do 3000 zł albo spadł poniżej 0,50 zł (cel: 99% spółek w 1–3000 zł)
const SPLIT_URGENT_ABOVE = 3000;
const REVERSE_URGENT_BELOW = 0.5;
const SPLIT_RATIOS = [2, 3, 5, 10, 20, 50, 100, 200, 500, 1000];
const REVERSE_RATIOS = [2, 3, 5, 10, 20, 50, 100];
const SPLIT_TARGET_MAX_PRICE = 700;    // po splicie kurs nie powinien przekraczać tej wartości
const REVERSE_TARGET_MIN_PRICE = 3;    // po konsolidacji kurs powinien wynieść co najmniej tyle
const SPLIT_COOLDOWN_QUARTERS = 8;
// Przełączniki (debug / pomiary): wyłączenie rodzaju zmiany nie zmienia reszty gry.
const SPLIT_SETTINGS = { split: true, reverse: true };
const SPLIT_LOG_LIMIT = 60;
let splitLog = [];                     // { symbol, name, quarter, kind, ratio, priceBefore, priceAfter, fractionCash }

/** Szansa na kwartał: 20% po przekroczeniu progu, 50% przy kursie ≥ 3000 zł albo < 0,50 zł. */
function getSplitChance(price) {
    return Number(price) >= SPLIT_URGENT_ABOVE || Number(price) < REVERSE_URGENT_BELOW ? SPLIT_URGENT_CHANCE : SPLIT_CHANCE;
}

function getSplitQuarter() {
    return typeof macro === 'object' && macro ? Number(macro.quarter) || 0 : 0;
}

/** Wybiera rodzaj i krotność zmiany dla kursu: { kind: 'split' | 'reverse', ratio } albo null (kurs w normie). */
function getSplitProposal(price) {
    const p = Number(price) || 0;
    if (p >= SPLIT_PRICE) return !SPLIT_SETTINGS.split ? null : { kind: 'split', ratio: SPLIT_RATIOS.find(r => p / r <= SPLIT_TARGET_MAX_PRICE) || SPLIT_RATIOS[SPLIT_RATIOS.length - 1] };
    if (p > 0 && p < REVERSE_SPLIT_PRICE) return !SPLIT_SETTINGS.reverse ? null : { kind: 'reverse', ratio: REVERSE_RATIOS.find(r => p * r >= REVERSE_TARGET_MIN_PRICE) || REVERSE_RATIOS[REVERSE_RATIOS.length - 1] };
    return null;
}

/** Czy spółka może teraz zmienić liczbę akcji (bez fuzji, wezwania, wydzielenia, walnego z uchwałami, ofert na jej akcje). */
function canChangeShareCount(stock) {
    if (!stock || stock.isBankrupt || stock.assetType === 'Startup' || stock.tradeHalted) return false;
    if (!(Number(stock.totalShares) > 0) || !(Number(stock.price) > 0)) return false;
    if (stock.mergerProcess || stock.tender || stock.spinoff) return false;
    if (stock.governance?.pendingAgm?.items?.length) return false;
    if (typeof rescueOffers === 'object' && rescueOffers?.[stock.symbol]) return false;
    if (typeof privatizationOffer === 'object' && privatizationOffer?.symbol === stock.symbol) return false;
    if (typeof currentCollateralAuction === 'object' && currentCollateralAuction?.stockSymbol === stock.symbol) return false;
    if (getSplitQuarter() - (Number(stock.lastSplitQuarter) || -99) < SPLIT_COOLDOWN_QUARTERS) return false;
    return true;
}

/** Skaluje wartości „na akcję” w liście liczb albo rekordów (pola price, open, high, low, close, eps, dps). */
function scalePerShareList(list, divisor, keys = []) {
    if (!Array.isArray(list)) return;
    list.forEach((item, i) => {
        if (typeof item === 'number') list[i] = item / divisor;
        else if (item && typeof item === 'object') for (const key of keys) if (Number.isFinite(item[key])) item[key] /= divisor;
    });
}

/**
 * Zmienia liczbę akcji spółki: factor > 1 to split (kurs / factor), factor < 1 to konsolidacja (kurs / factor, czyli w górę).
 * Każdy posiadacz dostaje floor(akcje × factor); ułamki (tylko konsolidacja) spółka wypłaca gotówką po nowym kursie.
 * Wartość pozycji = akcje × kurs zostaje bez zmian (z dokładnością do ułamka akcji).
 */
function applyShareCountChange(stock, factor, { quarter = getSplitQuarter(), kind = factor > 1 ? 'split' : 'reverse' } = {}) {
    if (!stock || !(factor > 0) || factor === 1) return null;
    const symbol = stock.symbol, divisor = factor;
    const priceBefore = stock.price, priceAfter = priceBefore / divisor;
    const credits = [];                 // { cash, pay(amount) } — wypłaty za ułamki akcji
    const floorShares = x => Math.floor(x + 1e-9);

    /** Przelicza jeden pakiet; zwraca nową liczbę akcji (0 → pakiet do usunięcia). */
    const rescale = (holding, sharesKey, priceKey, pay) => {
        const exact = (Number(holding[sharesKey]) || 0) * factor;
        const shares = floorShares(exact);
        const fraction = Math.max(0, exact - shares);
        holding[sharesKey] = shares;
        if (priceKey && Number.isFinite(holding[priceKey])) holding[priceKey] /= divisor;
        if (Number.isFinite(holding.lockedShares)) holding.lockedShares = Math.min(shares, floorShares(holding.lockedShares * factor));
        if (fraction > 0 && pay) credits.push({ cash: fraction * priceAfter, pay });
        return shares;
    };
    const rescalePortfolio = (portfolio, pay) => {
        const holding = portfolio?.[symbol];
        if (!holding) return;
        if (rescale(holding, 'shares', 'avgPrice', pay) <= 0) delete portfolio[symbol];
    };

    // 1. Posiadacze akcji
    rescalePortfolio(playerPortfolio, cash => { playerCash += cash; });
    if (playerWallet?.portfolio) rescalePortfolio(playerWallet.portfolio, cash => { playerWallet.cash += cash; });
    for (const ai of aiCompetitors) rescalePortfolio(ai.portfolio, cash => { ai.cash += cash; });
    for (const manager of corporation?.managers || []) if (manager.fund) rescalePortfolio(manager.fund.portfolio, cash => { manager.fund.cash += cash; });
    for (const bank of commercialBanks) {
        rescalePortfolio(bank.stockPortfolio, cash => { bank.cash += cash; });
        if (bank.resaleOffer?.symbol === symbol) { bank.resaleOffer.shares = floorShares(bank.resaleOffer.shares * factor); bank.resaleOffer.price /= divisor; }
        for (const loans of Object.values(bank.loanPortfolio || {})) if (Array.isArray(loans)) for (const loan of loans) if (loan.collateral?.symbol === symbol) loan.collateral.quantity = floorShares(loan.collateral.quantity * factor); // wartości liczbowe (LBO) pomijamy
    }
    for (const owner of stocks) {
        if (owner === stock) continue;
        const payOwner = cash => { adjustCompanyCash(owner, cash); adjustBalanceSheet(owner, { assets: cash, retainedEarnings: cash }); };
        const hp = owner.holdingPortfolio?.[symbol];
        if (hp && rescale(hp, 'quantity', 'purchasePrice', payOwner) <= 0) delete owner.holdingPortfolio[symbol];
        if (owner.equityStakes?.[symbol]) {
            const stake = { shares: owner.equityStakes[symbol] };
            if (rescale(stake, 'shares', null, payOwner) > 0) owner.equityStakes[symbol] = stake.shares; else delete owner.equityStakes[symbol];
        }
    }
    if (typeof etfs !== 'undefined') for (const etf of etfs) {
        if (!(etf.holdings?.[symbol] > 0)) continue;
        const holding = { shares: etf.holdings[symbol] };
        if (rescale(holding, 'shares', null, cash => { etf.cash += cash; }) > 0) etf.holdings[symbol] = holding.shares; else delete etf.holdings[symbol];
    }
    // Pakiety własne spółki, insiderów i miasta (pakiet państwa to udział procentowy — bez zmian)
    stock.totalShares = floorShares(stock.totalShares * factor);
    if (Number.isFinite(stock.maxShares)) stock.maxShares = Math.max(stock.totalShares, floorShares(stock.maxShares * factor));
    for (const key of ['insiderShares', 'treasuryShares']) if (Number.isFinite(stock[key])) stock[key] = floorShares(stock[key] * factor);
    if (stock.cityShares > 0) {
        const exact = stock.cityShares * factor;
        stock.cityShares = floorShares(exact);
        if (exact - stock.cityShares > 0 && typeof city === 'object') credits.push({ cash: (exact - stock.cityShares) * priceAfter, pay: cash => { city.budget += cash; } });
    }

    // 2. Zastawy, zabezpieczenia kredytów, aukcja zastawu
    const loanLists = [playerFund?.pawnLoans, ...(corporation?.managers || []).map(m => m.fund?.pawnLoans)];
    for (const list of loanLists) for (const loan of list || []) if (loan.symbol === symbol) loan.shares = floorShares(loan.shares * factor);
    for (const ai of aiCompetitors) for (const loan of ai.loans || []) if (loan.collateral?.symbol === symbol) loan.collateral.quantity = floorShares(loan.collateral.quantity * factor);
    if (typeof currentCollateralAuction === 'object' && currentCollateralAuction?.stockSymbol === symbol) {
        currentCollateralAuction.quantity = floorShares(currentCollateralAuction.quantity * factor);
        if (Number.isFinite(currentCollateralAuction.minPrice)) currentCollateralAuction.minPrice /= divisor;
    }

    // 3. Wartości na akcję: kurs, historia cen i świec (korekta wstecz — wykres bez skoku), alerty, transakcje gracza
    stock.price = priceAfter;
    for (const index of typeof marketIndexes !== 'undefined' ? marketIndexes : []) if (index.lastPrices?.[symbol] > 0) index.lastPrices[symbol] /= divisor; // indeksy łańcuchowe: zwrot spółki bez skoku
    scalePerShareList(stock.lineHistory, divisor, ['price']);
    scalePerShareList(stock.candlestickHistory, divisor, ['open', 'high', 'low', 'close']);
    if (stock.currentCandle) scalePerShareList([stock.currentCandle], divisor, ['open', 'high', 'low', 'close']);
    scalePerShareList(stock.priceHistory, divisor);
    scalePerShareList(stock.weeklyCloses, divisor);
    if (stock.priceAlerts) for (const key of ['buy', 'sell']) if (Number.isFinite(stock.priceAlerts[key])) stock.priceAlerts[key] /= divisor;
    for (const tx of stock.playerTransactions || []) { if (Number.isFinite(tx.price)) tx.price /= divisor; if (Number.isFinite(tx.quantity)) tx.quantity = floorShares(tx.quantity * factor); }
    if (typeof lastWeekStockPrices === 'object' && Number.isFinite(lastWeekStockPrices?.[symbol])) lastWeekStockPrices[symbol] /= divisor;
    if (stock.marketStar) for (const key of ['anchorPrice', 'peakPrice', 'troughPrice']) if (Number.isFinite(stock.marketStar[key])) stock.marketStar[key] /= divisor;
    if (stock.stakeCampaign && Number.isFinite(stock.stakeCampaign.maxPrice)) stock.stakeCampaign.maxPrice /= divisor;

    // 4. Wskaźniki i dywidendy na akcję (sumy, C/Z i stopy dywidendy bez zmian)
    const f = stock.fundamentals;
    if (f) {
        for (const key of ['fairValue', 'expectedEps', 'lastEps', 'epsTtm', 'salesPerShare', 'bookValuePerShare']) if (Number.isFinite(f[key])) f[key] /= divisor;
        scalePerShareList(f.history, divisor, ['eps']);
    }
    for (const key of ['estimatedDividend', 'lastDeclaredDps', 'dividendPerShare']) if (Number.isFinite(stock[key])) stock[key] /= divisor;
    if (stock.pendingDividend && Number.isFinite(stock.pendingDividend.dps)) stock.pendingDividend.dps /= divisor;
    if (stock.lastDividend && Number.isFinite(stock.lastDividend.dps)) stock.lastDividend.dps /= divisor;
    scalePerShareList(stock.dividendHistory, divisor, ['dps']);

    // 5. Wypłata za ułamki akcji z gotówki spółki (tylko konsolidacja)
    const owed = credits.reduce((sum, c) => sum + c.cash, 0);
    const paid = Math.min(owed, Math.max(0, Number(stock.cash) || 0));
    if (paid > 0 && owed > 0) {
        adjustCompanyCash(stock, -paid);
        adjustBalanceSheet(stock, { assets: -paid, retainedEarnings: -paid });
        recordPayment(stock, 'external:akcjonariusze', paid, kind === 'reverse' ? 'Wypłata za ułamki akcji po konsolidacji' : 'Wypłata za ułamki akcji po splicie');
        const ratio = paid / owed;
        for (const credit of credits) credit.pay(credit.cash * ratio);
    }

    // 6. Akcje w obrocie = suma posiadaczy (audyt A1)
    stock.sharesHeld = Math.min(getTrackedHeldShares(stock), Math.max(0, getFreeFloatShares(stock)));
    stock.lastSplitQuarter = quarter;
    if (!Array.isArray(stock.splitHistory)) stock.splitHistory = [];
    stock.splitHistory.push({ q: quarter, f: Math.round(factor * 1e6) / 1e6 }); // czynnik skali liczby akcji (opcjonalne pole zapisu v15)
    if (stock.splitHistory.length > 6) stock.splitHistory.shift();

    const entry = { symbol, name: stock.name, quarter, kind, ratio: factor > 1 ? factor : 1 / factor, priceBefore, priceAfter, fractionCash: paid };
    splitLog.push(entry);
    if (splitLog.length > SPLIT_LOG_LIMIT) splitLog.shift();
    return entry;
}

/** „5:1” albo „1:10” z czynnika zmiany liczby akcji. */
function formatSplitRatio(factor) {
    return factor >= 1 ? `${Math.round(factor)}:1` : `1:${Math.round(1 / factor)}`;
}

/** Zmiana liczby akcji z ostatnich 8 kwartałów (opis do znacznika w tabeli) albo null. */
function getRecentShareCountChange(stock) {
    const last = stock?.splitHistory?.[stock.splitHistory.length - 1];
    if (!last || getSplitQuarter() - last.q > 8) return null;
    return `${last.f >= 1 ? 'Split' : 'Konsolidacja akcji'} ${formatSplitRatio(last.f)} w kw. ${last.q} — liczba akcji i kurs zmienione, wartość posiadanych akcji bez zmian`;
}

/** Zdanie do karty spółki: wszystkie zmiany liczby akcji (z zapisu spółki). */
function describeShareCountHistory(stock) {
    const list = stock?.splitHistory;
    if (!list?.length) return '';
    return `<p class="text-sm"><strong>Podział akcji:</strong> ${list.map(h => `${h.f >= 1 ? 'split' : 'konsolidacja'} ${formatSplitRatio(h.f)} w kw. ${h.q}`).join(', ')} — wykres, wskaźniki i dywidendy na akcję przeliczone wstecz, wartość posiadanych akcji bez zmian.</p>`;
}

/** Powiadomienia o zmianie liczby akcji: dziennik, pasek newsów, znacznik na wykresie, poczta, dymek i hasło Akademii dla posiadacza. */
function announceShareCountChange(stock, entry) {
    if (!entry) return;
    const split = entry.kind === 'split', ratio = formatSplitRatio(split ? entry.ratio : 1 / entry.ratio);
    const price = p => `${p < 10 ? p.toFixed(2) : Math.round(p).toLocaleString('pl-PL')} zł`;
    const text = split
        ? `🔀 ${stock.name} (${stock.symbol}) dzieli akcje ${ratio}: kurs ${price(entry.priceBefore)} → ${price(entry.priceAfter)}, akcji ${entry.ratio} razy więcej. Wartość posiadanych akcji bez zmian.`
        : `🔀 ${stock.name} (${stock.symbol}) skupia akcje ${ratio} (konsolidacja): kurs ${price(entry.priceBefore)} → ${price(entry.priceAfter)}, akcji ${Math.round(entry.ratio)} razy mniej. Ułamki akcji spółka wypłaca gotówką; wartość posiadanych akcji bez zmian.`;
    logEvent(text, 'company');
    if (typeof pushNews === 'function') pushNews(text, stock.symbol);
    if (typeof addChartEvent === 'function') addChartEvent(stock, '🔀', split ? `Split ${ratio}: kurs ÷${entry.ratio}` : `Konsolidacja ${ratio}: kurs ×${Math.round(entry.ratio)}`);
    const held = (playerPortfolio?.[stock.symbol]?.shares || 0) > 0 || (playerWallet?.portfolio?.[stock.symbol]?.shares || 0) > 0;
    if (!held) return;
    if (typeof addMail === 'function') addMail({ sender: 'PULS', subject: `🔀 ${stock.name}: ${split ? 'split' : 'konsolidacja akcji'} ${ratio}`, body: `${text}\n\nTwoje pakiety i zlecenia (alerty cenowe, zastaw) przeliczono automatycznie.`, importance: 2, symbol: stock.symbol });
    if (typeof showToast === 'function') showToast(`${stock.name}: ${split ? 'split' : 'konsolidacja akcji'} ${ratio}. Wartość Twoich akcji bez zmian.`, 'default');
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('splitReverseSplit', `${stock.name}: ${split ? 'split' : 'konsolidacja'} ${ratio}`);
}

/** Podział i konsolidacja w jednej nazwie: ratio 5 → split 5:1; ratio 5 z kind 'reverse' → konsolidacja 1:5. */
function executeSplit(stock, proposal) {
    if (!proposal) return null;
    const entry = applyShareCountChange(stock, proposal.kind === 'split' ? proposal.ratio : 1 / proposal.ratio, { kind: proposal.kind });
    announceShareCountChange(stock, entry);
    return entry;
}

/** Co kwartał: spółki z kursem poza przedziałem 1–1000 zł mają 20% szans na zmianę liczby akcji. */
function processSplitsQuarterly() {
    const done = [];
    for (const stock of [...stocks]) {
        const proposal = getSplitProposal(stock.price);
        if (!proposal || !canChangeShareCount(stock) || Math.random() >= getSplitChance(stock.price)) continue;
        try {
            const entry = executeSplit(stock, proposal);
            if (entry) done.push(entry);
        } catch (error) { console.error(`[split] ${stock.symbol}:`, error); } // błąd jednej spółki nie może zatrzymać pętli kwartalnej
    }
    return done;
}
