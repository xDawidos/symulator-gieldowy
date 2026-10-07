// save.js - Zapis i wczytanie stanu gry (localStorage)
//
// Format v3 (v2 + cykl koniunktury, fundamenty spółek, struktura własności):
//  - kontrakty, oferty i projekty przechowują identyfikatory spółek (symbol), a nie kopie obiektów,
//  - każda referencja do spółki zagnieżdżona w innych danych jest zapisywana jako { __stockRef: SYMBOL },
//  - po wczytaniu referencje są ponownie łączone z właściwymi spółkami, a zajęte moce wykonawcze
//    odtwarzane z aktywnych projektów,
//  - liczniki czasu symulacji (elapsedGameMs, remainingGameMs itd.) są zapisane wprost,
//  - czas offline: brak postępu po zamknięciu gry (symulacja rusza od stanu z chwili zapisu).
//
// Zapisy v1 (z kopiami obiektów klienta i wykonawcy) są oznaczone jako niezgodne i nie są wczytywane.

// v4: nowy koncept (gracz = zarządca funduszu). Zapisy v1–v3 (prywatny inwestor) są niezgodne.
const GAME_SAVE_KEY = 'gra_inwestycyjna_dawid_save_v4';
const LEGACY_SAVE_KEYS = ['gra_inwestycyjna_dawid_save_v2', 'gra_inwestycyjna_dawid_save_v1'];
// v5: korporacja (zarządcy, oceny, analitycy, przejęcia). Zapis v4 migruje — korporacja tworzy się przy wczytaniu.
const SAVE_FORMAT_VERSION = 5;
const SUPPORTED_SAVE_VERSIONS = [4, 5];

let lastSaveReport = null;
let saveDisabledUntilReload = false;

function serializeWithStockRefs(value, rootStocks) {
    const stockSet = new Set(stocks);

    return JSON.parse(JSON.stringify(value, function (key, item) {
        if (item && typeof item === 'object' && stockSet.has(item) && this !== rootStocks) {
            return { __stockRef: item.symbol };
        }
        return item;
    }));
}

function resolveStockRefs(value, bySymbol, missing) {
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) value[i] = resolveStockRefs(value[i], bySymbol, missing);
        return value;
    }

    if (value && typeof value === 'object') {
        if (typeof value.__stockRef === 'string' && Object.keys(value).length === 1) {
            const found = bySymbol.get(value.__stockRef) || null;
            if (!found) missing.add(value.__stockRef);
            return found;
        }

        for (const key of Object.keys(value)) value[key] = resolveStockRefs(value[key], bySymbol, missing);
    }

    return value;
}

function serializeTenderForSave(tender) {
    const plainBid = bid => bid && {
        ...bid,
        bidder: undefined,
        bidderSymbol: getEntityKey(bid.bidder)
    };

    return {
        ...tender,
        clientCompany: undefined,
        clientSymbol: getEntityKey(tender.clientCompany),
        bids: (tender.bids || []).map(plainBid),
        winner: plainBid(tender.winner) || null
    };
}

function serializeProjectForSave(project) {
    return {
        ...project,
        tender: undefined,
        tenderId: project.tender?.id || null,
        builder: undefined,
        builderSymbol: getEntityKey(project.builder)
    };
}

// Historia cen do wykresów jest największą częścią stanu; w zapisie trzymamy jej końcówkę,
// żeby zmieścić się w limicie localStorage (~5 MB).
const SAVED_LINE_HISTORY_POINTS = 120;

function serializeStocksForSave() {
    const serialized = serializeWithStockRefs(stocks, stocks);
    for (const company of serialized) {
        if (Array.isArray(company.lineHistory) && company.lineHistory.length > SAVED_LINE_HISTORY_POINTS) {
            company.lineHistory = company.lineHistory.slice(-SAVED_LINE_HISTORY_POINTS);
        }
    }
    return serialized;
}

/** Buduje obiekt zapisu (bez zapisywania go) — używane przez saveGameState i testy. */
function buildSaveSnapshot() {
    const now = Date.now();
    return {
        version: SAVE_FORMAT_VERSION,
        savedAt: now,
        currentSpeedMultiplier,
        playerCash,
        governmentTreasury,
        stocks: serializeStocksForSave(),
        commercialBanks: serializeWithStockRefs(commercialBanks),
        playerPortfolio: serializeWithStockRefs(playerPortfolio),
        aiCompetitors: serializeWithStockRefs(aiCompetitors),
        city: serializeWithStockRefs(city),
        centralBank: serializeWithStockRefs(centralBank),
        specialists: serializeWithStockRefs(specialists),
        activeTenders: activeTenders.map(serializeTenderForSave),
        constructionProjects: constructionProjects.filter(project => !project.settled).map(serializeProjectForSave),
        paymentJournal: paymentJournal.slice(-100),
        paymentTotals,
        economyCycle,
        playerProfile,
        playerFund,
        corporation,
        playerWallet,
        playerAccessLevel,
        trainings: Object.fromEntries(Object.entries(skills).map(([id, skill]) => [id, skill.unlockedLevel])),
        simulationIdCounter,
        nextWealthTaxRemainingMs: Math.max(0, (Number(nextWealthTaxTime) || now) - now),
        WEALTH_TAX_INTERVAL
    };
}

function saveGameState() {
    if (typeof localStorage === 'undefined') return false;
    if (saveDisabledUntilReload) return false;
    if (typeof window !== 'undefined' && window.__GAME_TEST_MODE__) return false; // testy nie nadpisują zapisu gracza

    try {
        const snapshot = buildSaveSnapshot();
        localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(snapshot));
        lastSaveReport = { ok: true, at: snapshot.savedAt };
        return true;
    } catch (error) {
        console.error('[save] Nie udało się zapisać gry:', error);
        lastSaveReport = { ok: false, error: String(error) };
        return false;
    }
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeCompanyNumbers(company, warnings) {
    if (!isFiniteNumber(company.cash)) {
        warnings.push(`${company.symbol}: nieprawidłowa gotówka (${company.cash}) — ustawiono 0.`);
        company.cash = 0;
    }

    if (company.balanceSheet) {
        for (const key of ['assets', 'liabilities', 'shareCapital', 'retainedEarnings']) {
            if (!isFiniteNumber(company.balanceSheet[key])) {
                warnings.push(`${company.symbol}: nieprawidłowa pozycja bilansu ${key} — ustawiono 0.`);
                company.balanceSheet[key] = 0;
            }
        }
    }
}

/**
 * Waliduje i odtwarza stan z obiektu zapisu. Zwraca raport; przy błędach krytycznych nic nie zmienia.
 */
function applySaveSnapshot(snapshot) {
    const report = { ok: false, warnings: [], errors: [] };

    if (!snapshot || typeof snapshot !== 'object') {
        report.errors.push('Brak danych zapisu.');
        return report;
    }

    if (!SUPPORTED_SAVE_VERSIONS.includes(snapshot.version)) {
        report.errors.push(`Niezgodna wersja zapisu (${snapshot.version}). Obsługiwane: ${SUPPORTED_SAVE_VERSIONS.join(', ')}.`);
        return report;
    }

    if (!Array.isArray(snapshot.stocks) || snapshot.stocks.length === 0) {
        report.errors.push('Zapis nie zawiera spółek.');
        return report;
    }

    // --- Spółki: duplikaty symboli ---
    const bySymbol = new Map();
    const restoredStocks = [];

    for (const company of snapshot.stocks) {
        if (!company || typeof company.symbol !== 'string') {
            report.warnings.push('Pominięto spółkę bez symbolu.');
            continue;
        }
        if (bySymbol.has(company.symbol)) {
            report.warnings.push(`Duplikat symbolu ${company.symbol} — pominięto kolejną kopię.`);
            continue;
        }
        bySymbol.set(company.symbol, company);
        restoredStocks.push(company);
    }

    const missing = new Set();
    resolveStockRefs(restoredStocks, bySymbol, missing);
    restoredStocks.forEach(company => sanitizeCompanyNumbers(company, report.warnings));

    // --- Przetargi ---
    const tenderIds = new Set();
    const restoredTenders = [];

    for (const raw of Array.isArray(snapshot.activeTenders) ? snapshot.activeTenders : []) {
        if (!raw?.id || tenderIds.has(raw.id)) {
            report.warnings.push(`Pominięto przetarg bez ID lub zduplikowany (${raw?.id}).`);
            continue;
        }
        tenderIds.add(raw.id);

        const tender = { ...raw };
        tender.clientCompany = bySymbol.get(raw.clientSymbol) || null;
        delete tender.clientSymbol;

        tender.bids = (raw.bids || [])
            .map(bid => ({ ...bid, bidder: bySymbol.get(bid.bidderSymbol) || null }))
            .filter(bid => bid.bidder && isFiniteNumber(bid.price) && bid.price > 0);
        tender.bids.forEach(bid => delete bid.bidderSymbol);

        if (raw.winner) {
            tender.winner = { ...raw.winner, bidder: bySymbol.get(raw.winner.bidderSymbol) || null };
            delete tender.winner.bidderSymbol;
        }

        const spec = typeof getConstructionSpec === 'function' ? getConstructionSpec(tender.buildingType?.id) : null;
        if (!spec) {
            tender.status = 'cancelled';
            tender.cancelReason = 'Pozycja katalogu nie jest już inwestycją budowlaną.';
        }

        if (!tender.clientCompany && ['open', 'closed', 'awarded'].includes(tender.status)) {
            tender.status = 'cancelled';
            tender.cancelReason = 'Brak zamawiającego po wczytaniu.';
            report.warnings.push(`Przetarg ${tender.id}: brak zamawiającego.`);
        }

        if (!isFiniteNumber(tender.budget) || tender.budget <= 0) {
            tender.status = 'cancelled';
            tender.cancelReason = 'Nieprawidłowy budżet.';
            report.warnings.push(`Przetarg ${tender.id}: nieprawidłowy budżet.`);
        }

        if (!Array.isArray(tender.evaluatedBy)) tender.evaluatedBy = [];
        restoredTenders.push(tender);
    }

    const tenderById = new Map(restoredTenders.map(tender => [tender.id, tender]));

    // --- Projekty budowlane ---
    const projectIds = new Set();
    const restoredProjects = [];
    const moneyFields = ['price', 'escrowBalance', 'paidToBuilder', 'costsPaid', 'estimatedCost', 'progress', 'elapsedGameMs', 'workRequiredMs', 'deadlineMs'];

    for (const raw of Array.isArray(snapshot.constructionProjects) ? snapshot.constructionProjects : []) {
        if (!raw?.id || projectIds.has(raw.id)) {
            report.warnings.push(`Pominięto projekt bez ID lub zduplikowany (${raw?.id}).`);
            continue;
        }
        projectIds.add(raw.id);

        if (raw.modelVersion !== 3) {
            report.warnings.push(`Projekt ${raw.id}: starszy model — pominięty.`);
            continue;
        }

        const invalid = moneyFields.filter(field => !isFiniteNumber(raw[field]) || raw[field] < 0);
        if (invalid.length > 0) {
            report.warnings.push(`Projekt ${raw.id}: nieprawidłowe pola ${invalid.join(', ')} — pominięty.`);
            continue;
        }

        const tender = tenderById.get(raw.tenderId);
        const builder = bySymbol.get(raw.builderSymbol) || null;
        const client = tender?.clientCompany || null;

        const project = { ...raw, tender, builder };
        delete project.tenderId;
        delete project.builderSymbol;

        if (!tender || !client) {
            report.warnings.push(`Projekt ${raw.id}: brak przetargu lub zamawiającego — depozyt przepada razem ze stroną kontraktu.`);
            continue;
        }

        if (!builder) {
            // Brak wykonawcy: niewykorzystany depozyt wraca do zamawiającego.
            adjustCompanyCash(client, project.escrowBalance);
            report.warnings.push(`Projekt ${raw.id}: brak wykonawcy — zwrócono depozyt ${project.escrowBalance.toFixed(0)} PLN.`);
            tender.status = 'cancelled';
            tender.cancelReason = 'Brak wykonawcy po wczytaniu.';
            continue;
        }

        if (!Array.isArray(project.events)) project.events = [];
        restoredProjects.push(project);
    }

    // Przetarg "awarded" bez projektu nie ma kontynuacji.
    for (const tender of restoredTenders) {
        if (tender.status === 'awarded' && !restoredProjects.some(project => project.tender === tender)) {
            tender.status = 'cancelled';
            tender.cancelReason = tender.cancelReason || 'Brak projektu po wczytaniu.';
        }
    }

    // --- Wszystko poprawne: podmieniamy stan gry ---
    stocks = restoredStocks;

    const resolveOther = value => resolveStockRefs(value, bySymbol, missing);
    if (Array.isArray(snapshot.commercialBanks)) commercialBanks = resolveOther(snapshot.commercialBanks);
    if (snapshot.playerPortfolio) playerPortfolio = resolveOther(snapshot.playerPortfolio);
    // aiCompetitors jest stałą (const) — podmieniamy zawartość tablicy, nie referencję.
    if (Array.isArray(snapshot.aiCompetitors)) aiCompetitors.splice(0, aiCompetitors.length, ...resolveOther(snapshot.aiCompetitors));
    if (snapshot.city) city = resolveOther(snapshot.city);
    if (snapshot.centralBank) centralBank = resolveOther(snapshot.centralBank);
    if (Array.isArray(snapshot.specialists)) specialists = resolveOther(snapshot.specialists);

    if (isFiniteNumber(snapshot.playerCash)) playerCash = snapshot.playerCash;
    else report.warnings.push('Nieprawidłowa gotówka funduszu — pozostawiono wartość startową.');

    // Fundusz gracza, portfel prywatny, profil i szkolenia (v4).
    if (!snapshot.playerFund || !isFiniteNumber(snapshot.playerFund.units) || snapshot.playerFund.units <= 0) {
        report.warnings.push('Zapis bez poprawnego funduszu gracza — utworzono nowy.');
        startNewCareer(snapshot.playerProfile || {});
    } else {
        playerProfile = snapshot.playerProfile;
        playerFund = snapshot.playerFund;
        playerWallet = { ...createPlayerWallet(0), ...(snapshot.playerWallet || {}) };
        if (!isFiniteNumber(playerWallet.cash)) playerWallet.cash = 0;
        playerFund.clients = (playerFund.clients || []).filter(client => isFiniteNumber(client.units) && client.units >= 0);
    }
    for (const [id, level] of Object.entries(snapshot.trainings || {})) {
        if (skills[id] && isFiniteNumber(level)) skills[id].unlockedLevel = level;
    }
    // Korporacja (v5); zapis v4 — tworzymy nową przy zachowaniu funduszu gracza.
    if (snapshot.corporation && Array.isArray(snapshot.corporation.managers)) {
        corporation = snapshot.corporation;
    } else {
        createCorporation();
        report.warnings.push('Zapis bez korporacji — utworzono nową (migracja v4 → v5).');
    }
    syncExchangeAccessWithPosition();

    if (isFiniteNumber(snapshot.governmentTreasury)) governmentTreasury = snapshot.governmentTreasury;
    if (isFiniteNumber(snapshot.currentSpeedMultiplier) && [1, 2, 5].includes(snapshot.currentSpeedMultiplier)) {
        currentSpeedMultiplier = snapshot.currentSpeedMultiplier;
    }

    activeTenders = restoredTenders;
    constructionProjects = restoredProjects;
    constructionConsortia = [];
    paymentJournal = Array.isArray(snapshot.paymentJournal) ? snapshot.paymentJournal : [];
    if (snapshot.paymentTotals && isFiniteNumber(snapshot.paymentTotals.externalIn)) paymentTotals = snapshot.paymentTotals;
    if (isFiniteNumber(snapshot.simulationIdCounter)) {
        simulationIdCounter = Math.max(simulationIdCounter, snapshot.simulationIdCounter);
    }

    if (isFiniteNumber(snapshot.WEALTH_TAX_INTERVAL)) WEALTH_TAX_INTERVAL = snapshot.WEALTH_TAX_INTERVAL;
    if (isFiniteNumber(snapshot.nextWealthTaxRemainingMs)) {
        nextWealthTaxTime = Date.now() + snapshot.nextWealthTaxRemainingMs; // brak upływu czasu offline
    }

    // Koniunktura i model rynku (zapisy v2 nie miały tych danych — migracja).
    if (snapshot.economyCycle && ECONOMY_PHASES[snapshot.economyCycle.phase]) {
        economyCycle = snapshot.economyCycle;
    } else {
        economyCycle = createEconomyCycle('expansion');
        report.warnings.push('Zapis bez cyklu koniunktury — utworzono nowy (migracja v2).');
    }
    updateMarketTrendFromCycle();
    migrateMarketModel(report);

    if (missing.size > 0) report.warnings.push(`Brakujące spółki w referencjach: ${[...missing].join(', ')}.`);

    recountConstructionCapacity();

    report.ok = true;
    return report;
}

/** Uzupełnia fundamenty, strukturę własności i strategie dywidendowe spółek ze starszych zapisów. */
function migrateMarketModel(report) {
    let migrated = 0;
    for (const stock of stocks) {
        if (!stock.fundamentals && stock.balanceSheet && stock.assetType !== 'Startup') {
            initializeFundamentals(stock, true);
            migrated++;
        }
        initializeOwnership(stock);
        if (stock.assetType !== 'REIT' && !Number.isFinite(stock.dividendPayoutRatio)) {
            setCompanyDividendPolicy(stock, stock.dividendPolicy);
        }
    }
    if (migrated > 0 && report) report.warnings.push(`Uzupełniono fundamenty ${migrated} spółek (migracja v2).`);
}

/** Wczytuje zapis przy starcie gry. Zwraca true, jeśli stan został odtworzony. */
function restoreSavedGame() {
    if (typeof localStorage === 'undefined') return false;

    const legacy = LEGACY_SAVE_KEYS.find(key => localStorage.getItem(key));
    const raw = localStorage.getItem(GAME_SAVE_KEY);

    if (!raw) {
        if (legacy) {
            console.warn('[save] Znaleziono zapis ze starszej wersji gry (prywatny inwestor). Jest niezgodny z nowym konceptem zarządcy funduszu — rozpoczynam nową grę. Stary zapis pozostaje nietknięty.');
            logEvent('💾 Zapis ze starszej wersji gry jest niezgodny z nowym konceptem (zarządca funduszu) — rozpoczęto nową grę.', 'review');
        }
        return false;
    }

    try {
        const report = applySaveSnapshot(JSON.parse(raw));
        lastSaveReport = report;

        if (!report.ok) {
            console.error('[save] Zapis odrzucony:', report.errors);
            logEvent(`💾 Nie wczytano zapisu: ${report.errors.join(' ')}`, 'review');
            return false;
        }

        if (report.warnings.length > 0) console.warn('[save] Ostrzeżenia przy wczytywaniu:', report.warnings);

        isGamePaused = true; // po wczytaniu gra startuje zapauzowana
        logEvent('💾 Wczytano zapis gry. Gra jest zapauzowana.', 'review');
        console.log('[save] Stan gry został wczytany z localStorage.');
        return true;
    } catch (error) {
        console.error('[save] Nie udało się wczytać zapisu gry:', error);
        return false;
    }
}

/** Usuwa bieżący zapis (np. z konsoli: resetSavedGame()). */
/** Przycisk „Zapisz” w górnym pasku. */
function saveGame() {
    const ok = saveGameState();
    if (typeof showToast === 'function') showToast(ok ? 'Gra zapisana.' : 'Nie udało się zapisać gry.', ok ? 'success' : 'error');
}

/** Przycisk „Reset” w górnym pasku: usuwa zapis i zaczyna nową grę. */
function resetGame() {
    if (!confirm('Rozpocząć nową grę? Obecny zapis zostanie usunięty.')) return;
    resetSavedGame();
    location.reload();
}

function resetSavedGame() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(GAME_SAVE_KEY);
    saveDisabledUntilReload = true; // zapis przy zamknięciu strony nie odtworzy usuniętego stanu
    console.log('[save] Zapis usunięty. Odśwież stronę, aby rozpocząć nową grę.');
}
