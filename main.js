// =================================================================================
// main.js: Zapis gry i pętla główna (start, timery, przetwarzanie tygodni i kwartałów).
// Złączone pliki: save.js, main.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## save.js
// #################################################################################

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
// v6: skrzynka mailowa, burmistrz i kampania, festyn, oferta prywatyzacyjna. v4/v5 migrują przy wczytaniu.
// v7: obligacje i oferty (czas gry, kupony), depozyty i księgi banków, zastawy funduszy, giełdy elitarne.
// v8: klienci z charakterami i rynek wtórny JU (migracja typów klientów przy wczytaniu).
// v13: społeczeństwo i rynek pracy (society, stock.workforce, trzecia partia). Starsze zapisy: kraj od zera,
// zatrudnienie według giełdy, polityka według cech prezesa, związki tylko w spółkach państwowych (30%).
const SAVE_FORMAT_VERSION = 13;
const SUPPORTED_SAVE_VERSIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

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
// żeby zmieścić się w limicie localStorage (~5 MB). Liczby historii są zaokrąglane (cena do 0,0001 zł,
// wyniki do 7 cyfr znaczących), a tryb kompaktowy (gdy zwykły zapis przekroczy limit) skraca historie mocniej.
const SAVED_LINE_HISTORY_POINTS = 90;
const SAVED_CANDLES = 40;
const SAVED_LINE_HISTORY_POINTS_COMPACT = 40;
const SAVE_SIZE_TARGET = 3_000_000; // znaków — zapas względem limitu localStorage

function roundPrice(value) {
    return Number.isFinite(value) ? Math.round(value * 1e4) / 1e4 : value;
}

function roundSignificant(value, digits = 7) {
    return typeof value === 'number' && Number.isFinite(value) && value !== 0 ? Number(value.toPrecision(digits)) : value;
}

function compactPricePoints(points) {
    return points.map(point => {
        if (!point || typeof point !== 'object') return point;
        const copy = { ...point };
        for (const key of ['price', 'open', 'high', 'low', 'close']) if (key in copy) copy[key] = roundPrice(copy[key]);
        return copy;
    });
}

function serializeStocksForSave(compact = false) {
    const serialized = serializeWithStockRefs(stocks, stocks);
    const linePoints = compact ? SAVED_LINE_HISTORY_POINTS_COMPACT : SAVED_LINE_HISTORY_POINTS;
    for (const company of serialized) {
        if (Array.isArray(company.lineHistory)) company.lineHistory = compactPricePoints(company.lineHistory.slice(-linePoints));
        if (Array.isArray(company.candlestickHistory)) company.candlestickHistory = compactPricePoints(company.candlestickHistory.slice(compact ? -15 : -SAVED_CANDLES));
        if (Array.isArray(company.fundamentals?.history)) {
            company.fundamentals.history = company.fundamentals.history.map(quarter => Object.fromEntries(Object.entries(quarter).map(([key, value]) => [key, roundSignificant(value)])));
        }
        if (Array.isArray(company.research?.ledger)) {
            company.research.ledger = company.research.ledger.filter((entry, index, list) => !entry.recognized || index >= list.length - (compact ? 2 : RESEARCH_LEDGER_KEEP_RECOGNIZED));
        }
        if (compact) {
            if (Array.isArray(company.chartEvents)) company.chartEvents = company.chartEvents.slice(-5);
            if (Array.isArray(company.governance?.history)) company.governance.history = company.governance.history.slice(0, 1);
        }
    }
    return serialized;
}

/** Obligacje kupione w jednej transakcji to identyczne rekordy — w zapisie łączymy je w grupy z licznikiem. */
function compactBondsForSave(bonds) {
    const groups = new Map();
    for (const bond of bonds) {
        const { id, ...rest } = bond;
        const key = JSON.stringify(rest);
        const group = groups.get(key);
        if (group) group.__count++;
        else groups.set(key, { ...rest, id, __count: 1 });
    }
    return [...groups.values()];
}

function expandSavedBonds(saved) {
    const result = [];
    for (const bond of saved) {
        const count = Math.max(1, Math.floor(Number(bond.__count) || 1));
        const { __count, ...rest } = bond;
        for (let i = 0; i < count; i++) result.push(i === 0 ? rest : { ...rest, id: nextSimulationId('bond') });
    }
    return result;
}

/** Buduje obiekt zapisu (bez zapisywania go) — używane przez saveGameState i testy. compact: mniejszy zapis awaryjny. */
function buildSaveSnapshot({ compact = false } = {}) {
    const now = Date.now();
    return {
        version: SAVE_FORMAT_VERSION,
        savedAt: now,
        compact,
        currentSpeedMultiplier,
        playerCash,
        governmentTreasury,
        stocks: serializeStocksForSave(compact),
        commercialBanks: serializeWithStockRefs(commercialBanks),
        playerPortfolio: serializeWithStockRefs(playerPortfolio),
        aiCompetitors: serializeWithStockRefs(aiCompetitors),
        city: serializeWithStockRefs(city),
        centralBank: serializeWithStockRefs(centralBank),
        specialists: serializeWithStockRefs(specialists),
        activeTenders: activeTenders.map(serializeTenderForSave),
        constructionProjects: constructionProjects.filter(project => !project.settled).map(serializeProjectForSave),
        paymentJournal: paymentJournal.slice(compact ? -20 : -100),
        paymentTotals,
        economyCycle,
        macro,
        society,
        etfs: serializeEtfs(),
        botRelations,
        marketOperators,
        specialProjects,
        oversight,
        mafia,
        scandals,
        playerProfile,
        playerFund,
        corporation,
        mailbox: compact ? { ...mailbox, messages: mailbox.messages.slice(0, 60), digest: [] } : mailbox,
        juMarket,
        investmentPool,
        statePension,
        bridgeLoanOffers,
        rescueOffer,
        allBonds: compactBondsForSave(allBonds),
        activeBonds,
        cityInvestment,
        privatizationOffer,
        nextFestivalCountdown,
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
        let snapshot = buildSaveSnapshot();
        let text = JSON.stringify(snapshot);
        // Zapis za duży (albo przeglądarka odmawia): wersja kompaktowa z krótszymi historiami.
        if (text.length > SAVE_SIZE_TARGET) { snapshot = buildSaveSnapshot({ compact: true }); text = JSON.stringify(snapshot); }
        try {
            localStorage.setItem(GAME_SAVE_KEY, text);
        } catch (quotaError) {
            if (snapshot.compact) throw quotaError;
            snapshot = buildSaveSnapshot({ compact: true });
            text = JSON.stringify(snapshot);
            localStorage.removeItem(GAME_SAVE_KEY); // stary zapis zwalnia miejsce dla nowego
            localStorage.setItem(GAME_SAVE_KEY, text);
        }
        lastSaveReport = { ok: true, at: snapshot.savedAt, size: text.length, compact: snapshot.compact };
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
    // Skrzynka, miasto i państwo (v6); starsze zapisy dostają pustą skrzynkę i burmistrza.
    if (snapshot.mailbox && Array.isArray(snapshot.mailbox.messages)) {
        mailbox = { ...createMailbox(), ...snapshot.mailbox };
    } else {
        mailbox = createMailbox();
        report.warnings.push('Zapis bez skrzynki mailowej — utworzono nową (migracja do v6).');
    }
    if (snapshot.cityInvestment) cityInvestment = { ...cityInvestment, ...snapshot.cityInvestment };
    privatizationOffer = snapshot.privatizationOffer || null;
    festival = null; // trwający festyn (czas rzeczywisty) nie przetrwa wczytania
    nextFestivalCountdown = isFiniteNumber(snapshot.nextFestivalCountdown) ? snapshot.nextFestivalCountdown : BASE_DELAYS.quarterly * 2;
    ensureCityModel();

    // Rynek JU i profile klientów (v8); starsze zapisy: migracja typów na charaktery.
    juMarket = snapshot.juMarket && Array.isArray(snapshot.juMarket.tape) ? { ...createJuMarket(), ...snapshot.juMarket } : createJuMarket();
    if (playerFund) playerFund.clients.forEach(ensureClientProfile);
    if (snapshot.investmentPool && typeof snapshot.investmentPool === 'object') Object.assign(investmentPool, snapshot.investmentPool);
    statePension = snapshot.statePension && Array.isArray(snapshot.statePension.history) ? snapshot.statePension : { history: [], lastRanking: [] };
    bridgeLoanOffers = Array.isArray(snapshot.bridgeLoanOffers) ? snapshot.bridgeLoanOffers : [];
    rescueOffer = snapshot.rescueOffer && !snapshot.rescueOffer.closed ? snapshot.rescueOffer : null; // oferta emisji ratunkowej dla funduszu

    // Obligacje (v7; wcześniej nie były zapisywane). Stare rekordy bez czasu gry migruje checkBondMaturities.
    allBonds.length = 0;
    activeBonds.length = 0;
    if (Array.isArray(snapshot.allBonds)) allBonds.push(...expandSavedBonds(snapshot.allBonds.filter(bond => bond && isFiniteNumber(bond.faceValue)))); // zapis: grupy obligacji z licznikiem
    if (Array.isArray(snapshot.activeBonds)) activeBonds.push(...snapshot.activeBonds);

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
    macro = snapshot.macro && typeof snapshot.macro === 'object' ? snapshot.macro : createMacroState(); // v10: makro
    botRelations = snapshot.botRelations && typeof snapshot.botRelations === 'object' ? snapshot.botRelations : createBotRelations(); // v10: relacje
    ensureBotRelations();
    marketOperators = snapshot.marketOperators && typeof snapshot.marketOperators === 'object' ? snapshot.marketOperators : null; // v10: operatorzy rynków
    specialProjects = snapshot.specialProjects && typeof snapshot.specialProjects === 'object' ? snapshot.specialProjects : createSpecialProjects(); // v10: projekty specjalne
    ensureSpecialProjects();
    oversight = snapshot.oversight && typeof snapshot.oversight === 'object' ? snapshot.oversight : createOversight(); // v11: nadzór
    ensureOversight();
    mafia = snapshot.mafia && typeof snapshot.mafia === 'object' ? snapshot.mafia : createMafia(); // v11: mafia
    ensureMafia();
    scandals = snapshot.scandals && typeof snapshot.scandals === 'object' ? snapshot.scandals : createScandals(); // v11: afery
    ensureScandals();
    ensureMacroState();
    // v13: kraj i zatrudnienie (starsze zapisy: kraj od zera, populacja miasta bez zmian).
    society = snapshot.society && typeof snapshot.society === 'object' ? snapshot.society : createSocietyState();
    ensureSocietyState();
    if (!snapshot.society) report.warnings.push('Zapis bez danych kraju — utworzono społeczeństwo i zatrudnienie w spółkach (migracja v13).');
    stocks.forEach(stock => { if (typeof ensureWorkforce === 'function') ensureWorkforce(stock); });
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

    ensureMarketOperators(); // starsze zapisy: GPW jako notowana spółka
    if ((snapshot.version || 0) < 12 && !stocks.some(s => s.defenseId)) initDefenseSector(); // v12: zbrojeniówka i Gwardia w starszych zapisach
    // v10: ETF-y z portfelami (starsze zapisy dostają nowy zestaw)
    if (!restoreEtfs(snapshot.etfs)) report.warnings.push('Utworzono nowe ETF-y z portfelami (migracja v10).');
    // Uzgodnienie dopiero po odtworzeniu ETF-ów: wcześniej liczyło pakiety ETF-ów sprzed wczytania (przy starcie
    // strony — żadne), zaniżało sharesHeld, a zawyżone getAvailableShares pozwalało kupić ponad wolny obrót.
    const reconciled = reconcileSharesHeld(); // audyt A1: akcje w obrocie = suma posiadaczy
    if (reconciled) report.warnings.push(`Uzgodniono akcje w obrocie w ${reconciled} spółkach (audyt A1).`);

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
        if (!Array.isArray(stock.operatingInvestments)) stock.operatingInvestments = []; // v9: działające inwestycje
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

// #################################################################################
// ## main.js
// #################################################################################

// main.js (Połączony)

// Obiekt do przechowywania ID interwałów, aby można je było czyścić
const gameTimers = {
    stockUpdate: null,
    weekly: null,
    quarterly: null,
    event: null,
    ceoEvent: null,
    semiAnnual: null,
    yearly: null,
    reputationDecay: null,
    tBillMaturityCheck: null,
    mortgageCheck: null, // Z bazy main.js
    stateBondIssuance: null, // Z bazy main.js
    otherBondIssuance: null, // Z bazy main.js
    bondMaturityCheck: null,  // Z bazy main.js
    autoSave: null
};

// Zmienna przechowująca aktualną prędkość gry
let currentSpeedMultiplier = 1;
let uiRefreshTick = 0;

// Zapis i wczytanie gry: save.js

// Podstawowe opóźnienia w milisekundach


/**
 * Zatrzymuje wszystkie aktywne pętle gry. Niezbędne przy zmianie prędkości.
 */
function clearIntervals() {
    for (const key in gameTimers) {
        if (gameTimers[key]) {
            clearInterval(gameTimers[key]);
            gameTimers[key] = null;
        }
    }
    console.log("Wszystkie pętle gry zostały zatrzymane.");
}

/**
 * Ustawia nową prędkość gry, czyszcząc stare pętle i tworząc nowe.
 * @param {number} speedMultiplier - Mnożnik prędkości (np. 1, 2, 5).
 */
function setGameSpeed(speedMultiplier) {
    clearIntervals(); // Zatrzymaj wszystkie istniejące pętle
    currentSpeedMultiplier = speedMultiplier; // Ustaw nowy mnożnik

    // Zaktualizuj wygląd przycisków prędkości
    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.speed-btn[data-speed="${speedMultiplier}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    console.log(`Ustawiono prędkość gry na x${speedMultiplier}`);

    // --- URUCHOMIENIE NOWYCH PĘTLI Z NOWĄ PRĘDKOŚCIĄ ---

    // Pętla sprawdzania niespłaconych hipotek (z bazy main.js)
    gameTimers.mortgageCheck = setInterval(() => {
        if (isGamePaused) return;
        checkMortgageDefaults();
    }, BASE_DELAYS.weekly / speedMultiplier); // Sprawdzaj co tydzień

    gameTimers.autoSave = setInterval(() => {
        if (typeof saveGameState === 'function') {
            saveGameState();
        }
    }, 60000 / speedMultiplier);

    // Pętla sprawdzania zapadalności bonów skarbowych
    gameTimers.tBillMaturityCheck = setInterval(() => {
        if (isGamePaused) return;
        checkTBillMaturities();
    }, 5000 / speedMultiplier);

    // Główna pętla gry (aktualizacje co sekundę czasu gry)
    gameTimers.stockUpdate = setInterval(() => {

        document.querySelectorAll('#stock-table-body tr').forEach(row => {
    const symbol = row.dataset.symbol;
    if (!symbol) return;
    
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock && stock.mergerProcess) {
        // Złap pasek postępu i jego etykietę wewnątrz tego wiersza
        const progressBar = row.querySelector('progress');
        const statusTexts = row.querySelectorAll('span'); 
        
        if (progressBar) {
            progressBar.value = stock.mergerProcess.progress;
            
            // Aktualizacja kolorów w zależności od statusu
            if (stock.mergerProcess.decisionRequired) {
                progressBar.classList.add('decision');
            } else if (stock.mergerProcess.complications > 0) {
                progressBar.classList.add('complication');
                progressBar.classList.remove('decision');
            } else {
                progressBar.classList.remove('decision', 'complication');
            }
        }
        
        // Zaktualizuj tekst z aktualnym etapem (znajdujemy właściwy span po dopasowaniu tekstu)
        statusTexts.forEach(span => {
            if (span.textContent.includes('Etap:')) {
                span.textContent = `Etap: ${stock.mergerProcess.stage}/7`;
            }
        });
    }
});


        if (isGamePaused) {
            return; // Jeśli gra jest zapauzowana, nie wykonuj żadnych akcji
        }

        stocks.forEach(stock => {
            if (stock.prShieldExpiry && Date.now() > stock.prShieldExpiry) {
                stock.prShieldExpiry = null;
                logEvent(`🛡️ Tarcza PR dla ${stock.name} wygasła.`, 'company');
            }
        });

        if (document.getElementById('state-modal').style.display === 'block') {
             // Sprawdź czy funkcja istnieje przed wywołaniem
            if (typeof updateStateModalContent === 'function') {
                updateStateModalContent();
            }
        }

        // --- ZAPAMIĘTYWANIE STANU INTERFEJSU ---
        const activeElement = document.activeElement;
        const isActiveInputElement = activeElement && (activeElement.id.startsWith('quantity-') || activeElement.id.startsWith('invest-amount-'));
        const activeElementId = isActiveInputElement ? activeElement.id : null;
        const selectionStart = isActiveInputElement ? activeElement.selectionStart : null;
        const selectionEnd = isActiveInputElement ? activeElement.selectionEnd : null;
        const currentMarketInputs = getCurrentInputValues();
        const currentStartupInputs = getCurrentStartupInputValues();


        if (Date.now() % 10 < 1) { // Prosty sposób na uruchamianie co 10 ticków
            updateResearchInstitutes();
            checkResearchInstitutePositions();
        }

        // --- AKTUALIZACJA LOGIKI GRY ---
        const gameTimeDelta = BASE_DELAYS.stockUpdate; // Każdy tick to zawsze 1 sekunda CZASU GRY
        cleanupBankruptStocks(currentSpeedMultiplier);
        updateStockPrices();
        updateMarketIndexes(); // GIG/TIG5/SIG20 — benchmark funduszu (wcześniej nigdy nie był liczony)
        updateHoldingCompanies();
        if (FEATURE_FLAGS.startups) {
            updateStartups(gameTimeDelta);
            updateInvestmentPoolTimer(gameTimeDelta);
            updateAutoInvestTimer(gameTimeDelta);
            updateStartupAutoInvestTimers(gameTimeDelta);
        }
        checkTBillAccess();
        updateMarketVolatilityIndex();
        updateDividendTimers(gameTimeDelta);
        updateFund(gameTimeDelta); // NAV, obsunięcie, zamykanie okresów funduszu
        updateFestival(gameTimeDelta); // Aktualizacja festynu (czas gry)
        updateFestivalCountdown(gameTimeDelta); // Odliczanie do festynu
        applyActiveModifiers(); // Aplikowanie rocznych bonusów
        if (currentTBillAuction && Date.now() > currentTBillAuction.endTime) {
            resolveTBillAuction(); // Rozstrzygnij aukcję
        }
        processCeoActions(gameTimeDelta);
        runAllAi(); // Zawiera AI banków z bazy main.js
        checkPriceAlerts();
        checkResearchChoiceTimers(gameTimeDelta);
        updateResearchAutoRetry(gameTimeDelta);
        updateResearchProgress(gameTimeDelta);
        processConstructionProjects(gameTimeDelta);
        updateTenderSystem(gameTimeDelta); // zawiera też oferty AI
        updateConstructionSectorUI();

        // Przy prędkościach debug (×10, ×50) odświeżamy interfejs rzadziej — logika gry liczy się co tik.
        uiRefreshTick++;
        if (speedMultiplier >= 10 && uiRefreshTick % Math.round(speedMultiplier / 5) !== 0) return;

        // --- ODŚWIEŻANIE INTERFEJSU ---
        displayStocks(currentMarketInputs);
        displayStartups(currentStartupInputs);
        displayEtfs();
        displayPortfolio();
        displayFundPanel();
        displayMarketIndexes();
        displayInvestmentPool();
        updateCityModalContent(); // Aktualizacja okna miasta (tylko gdy otwarte)

        // --- POCZĄTEK BLOKU (DODANE Z main2.js) ---
        // Odświeżanie rynku obligacji w banku
        const bankModalForBonds = document.getElementById('bank-modal'); // Używamy innej nazwy zmiennej
        const bondsTabContent = document.getElementById('bank-content-bonds');
        // Sprawdź, czy modal banku jest widoczny ORAZ czy zakładka obligacji jest aktywna
        if (bankModalForBonds && bankModalForBonds.style.display === 'block' && bondsTabContent && bondsTabContent.style.display === 'block') {
            // Sprawdź, czy funkcja renderująca istnieje przed jej wywołaniem
            if (typeof renderBondMarketInBank === 'function') {
                renderBondMarketInBank();
            } else {
                console.warn("Funkcja renderBondMarketInBank nie została znaleziona."); // Opcjonalny log ostrzegawczy
            }
        }
        // --- KONIEC BLOKU (DODANE Z main2.js) ---

        // Odświeżanie otwartych modali
        if (document.getElementById('leaderboard-modal').style.display === 'block') {
            displayLeaderboard();
        }
        updateResearchChoiceTimerUI();
        if (document.getElementById('management-modal').style.display === 'block') {
            const symbol = document.getElementById('management-modal').dataset.currentSymbol;
            if (symbol) {
                const stock = stocks.find(s => s.symbol === symbol);
                if (stock && stock.research && stock.research.isResearching && stock.research.currentTech) {
                    const tech = technologies[stock.research.currentTech];
                    const progressPercent = (stock.research.progress / tech.cost) * 100;
                    document.getElementById('rd-progress-bar').value = progressPercent;
                }
                // Dynamiczna aktualizacja pasków postępu budów zamówionych przez spółkę
                const deptContent = document.getElementById('mgmt-content-depts');
                if (stock && deptContent && deptContent.style.display !== 'none') {
                    deptContent.querySelectorAll('progress[data-order-ref]').forEach(bar => {
                        const project = constructionProjects.find(item => item.id === bar.dataset.orderRef);
                        if (project) bar.value = project.progress;
                    });
                }
                // Dynamiczna aktualizacja cooldownu CEO
                const fireCeoCooldownInfo = document.getElementById('fire-ceo-cooldown-info');
                if (stock && stock.ceo && stock.ceo.fireCooldown && Date.now() < stock.ceo.fireCooldown) {
                    const remainingTime = Math.ceil((stock.ceo.fireCooldown - Date.now()) / 1000);
                    fireCeoCooldownInfo.textContent = `Następne zgromadzenie możliwe za: ${remainingTime} s`;
                } else if (stock && fireCeoCooldownInfo && fireCeoCooldownInfo.textContent !== '') {
                    fireCeoCooldownInfo.textContent = '';
                }
            }
        }
        // Odświeżanie modala banku (z bazy main.js - zawiera aukcje zabezpieczeń)
        if (document.getElementById('bank-modal').style.display === 'block') {
            // Dynamiczna aktualizacja cooldownu oferty państwowej
            const select = document.getElementById('state-company-select');
            const cooldownLabel = document.getElementById('state-offer-cooldown');
            if (select && cooldownLabel && select.value) {
                const symbol = select.value;
                const stock = stocks.find(s => s.symbol === symbol);
                if (stock && stock.stateOfferCooldownUntil && Date.now() < stock.stateOfferCooldownUntil) {
                    const remainingTime = Math.ceil((stock.stateOfferCooldownUntil - Date.now()) / 1000);
                    cooldownLabel.textContent = `Następna oferta dla tej spółki możliwa za: ${remainingTime}s`;
                    document.getElementById('state-offer-controls').style.opacity = '0.5';
                } else if (stock && cooldownLabel.textContent.startsWith('Następna oferta')) {
                    cooldownLabel.textContent = '';
                    document.getElementById('state-offer-controls').style.opacity = '1';
                }
            }

            // Zawsze odświeżaj sekcje aukcji, jeśli jest widoczna zakładka Banku Centralnego
            if (document.getElementById('bank-content-central').style.display === 'block') {
                updateTBillAuctionSection();
                updateCollateralAuctionSection(); // Z bazy main.js
            }
            // Odświeżanie rynku obligacji jest teraz obsługiwane przez dodany blok z main2.js
            // if (document.getElementById('bank-content-bonds').style.display === 'block') {
            //     renderBondMarketInBank(); // Ten if jest już wyżej
            // }
        }
        if (document.getElementById('dividend-tracker-modal').style.display === 'flex') {
            renderDividendTrackerContent();
        }

        // Odświeżanie wykresu, jeśli jest otwarty
        if (currentlyDisplayedChartSymbol) {
            const stockToUpdate = stocks.find(s => s.symbol === currentlyDisplayedChartSymbol);
            const modal = document.getElementById('price-chart-modal');
            if (stockToUpdate && modal && modal.style.display === 'block') {
                const svgArea = document.getElementById('chart-svg-area');
                if (svgArea) {
                    const svgWidth = svgArea.offsetWidth > 0 ? svgArea.offsetWidth : 360;
                    const svgHeight = svgArea.offsetHeight > 0 ? svgArea.offsetHeight : 180;
                    renderChartSVGForStock(stockToUpdate, svgArea, svgWidth, svgHeight);
                }
            }
        }

        // --- PRZYWRACANIE FOKUSU ---
        if (activeElementId) {
            const elementToFocus = document.getElementById(activeElementId);
            if (elementToFocus) {
                elementToFocus.focus();
                // Przywróć pozycję kursora, jeśli była zapamiętana
                if (selectionStart !== null && selectionEnd !== null) {
                    try { // Użyj try-catch na wypadek, gdyby element nie obsługiwał selection
                        elementToFocus.setSelectionRange(selectionStart, selectionEnd);
                    } catch (e) {
                        // Ignoruj błąd, jeśli nie można ustawić zaznaczenia
                    }
                }
            }
        }

    }, BASE_DELAYS.stockUpdate / speedMultiplier);

    // Pętla tygodniowa (z bazy main.js - bankowość komercyjna)
gameTimers.weekly = setInterval(() => {
        if (isGamePaused) return;

        // ===>>> NOWE WYWOŁANIE SKANERA WINDYKATORA <<<===
        if (typeof runDebtCollectorAI === 'function') {
            runDebtCollectorAI(); //
        }
        // ===>>> NOWE WYWOŁANIE SKANERA LOMBARDU <<<===
        if (typeof runPawnShopAI === 'function') {
            runPawnShopAI(); //
        }

        if (typeof runCorporateLogic === 'function') {
        runCorporateLogic(); // Obsługa działów i inwestycji
    }

        processCompanyBanking(); //
        processBankStartupSponsorship(); //


        if (typeof recordWeeklyCloses === 'function') recordWeeklyCloses(); // U2: zmiana tygodniowa w tabeli spółek
        if (typeof checkAcademyTriggers === 'function') checkAcademyTriggers(); // N1: hasła Akademii przy pierwszym kontakcie
        if (typeof checkMentorTasks === 'function') checkMentorTasks(); // N4: zadania mentora i certyfikaty

        // Fundusz gracza: opłata za zarządzanie, zaufanie, decyzje klientów
        processFundWeekly();
        processFundPawnLoansWeekly(); // zastawy funduszy w lombardzie (finance.js)
        processFundDepositsWeekly(); // lokaty terminowe funduszu (finance.js)
        maintainStartupCount(); // inkubator: nowe startupy w czasie gry (startups.js)
        processPppWeekly(); // projekty miejskie PPP (city.js)
        processBridgeLoansWeekly(); // finansowanie pomostowe budów (finance.js)
        aiCompetitors.forEach(processAiLoansWeekly); // raty i odsetki kredytów botów raz na tydzień
        processMailWeekly();          // prenumeraty, spam, plotki (mail.js)
        processPrivatizationWeekly(); // zapisy na akcje w prywatyzacji (city.js)



        // Utrzymanie standardowego R&D oraz wznowienia inwestycji bankowych (osobne systemy).
        stocks.forEach(stock => {
            if (stock.isBankStock) {
                processBankInvestmentResume(stock);
            } else if (!stock.assetType && stock.research) {
                processResearchMaintenanceAndPause(stock);
            }
        });
        
        // Podatki miejskie (bez zmian)
        if (typeof processCityAndCitizenTaxes === 'function') { //
            processCityAndCitizenTaxes(); //
        }

        // Zamówienia budowlane AI powstają w runCorporateLogic (jedna ścieżka inwestycji),
        // a oferty wykonawców w updateTenderSystem (pętla główna). Konsorcja są wyłączone.

        // Przetwarzanie dochodów z nieruchomości
        if (typeof processBuildingIncome === 'function') {
            processBuildingIncome();
        }

        if (playerCash > 0) displayCash(); //

    }, BASE_DELAYS.weekly / speedMultiplier);

    // Pętla kwartalna (z bazy main.js - zawiera AI Banku Centralnego)
    gameTimers.quarterly = setInterval(() => {
        if (isGamePaused) return;
        reviewCompanyPlacements();
        processEliteExchangesQuarterly(); // Rubin / Szmaragd / Diament, spółki zależne (finance.js)
        payBondCoupons(); // kupony kwartalne (finance.js)
        processPublicInvestmentFunding(); // BC → spółki państwowe, miasto → spółki miejskie (investments.js)
        processGovernanceQuarter(); // walne zgromadzenia (governance.js)
        processEtfsQuarterly(); // rebalancing, cele roczne, nowe i zamykane ETF-y (etf.js)
        processRelationsQuarterly(); // relacje z botami: wrogowie i przyjaciele (relations.js)
        processMarketsQuarterly(); // operatorzy rynków i maklerzy (markets.js)
        processSpecialProjectsQuarterly(); // konsorcja i projekty specjalne (projects.js)
        reconcileSharesHeld(); // audyt A1: akcje w obrocie = suma posiadaczy
        processOversightQuarterly(); // korupcja, policja, KNF (oversight.js)
        processMafiaQuarterly(); // mafia, Bruno Gato, porachunki (mafia.js)
        processScandalsQuarterly(); // parabanki i wojny PR (scandals.js)
        processDefenseQuarterly(); // zbrojeniówka i fundusz Gwardia (defense.js)
        if (typeof processAccountingQuarterly === 'function') processAccountingQuarterly(); // N3: kreatywna księgowość, audyty (accounting.js)
        advanceEconomyCycle(); // nowa faza koniunktury przed raportami
        advanceMacroQuarter(); // inflacja, bezrobocie, cykle sektorów, wybory (macro.js)
        processCityQuarterly(); // festyn raz w roku (city.js)
        processWorkforceQuarter(); // 0.13: zatrudnienie, zadowolenie, związki i strajki przed raportami (workforce.js)
        processFinancialReports(); // zawiera koszty R&D, wynik kontraktów, pozycje okresu i dywidendy
        updateInfluence();
        updateCeoTenureAndAge(); // Zmieniona nazwa, ale to samo
        updateAnalyticalProperties();
        runCentralBankAI(); // posiedzenie BC, gazeta, rezerwy, dotacje (macro.js)
        aiCompetitors.forEach(ai => {
            // Sprawdź, czy to "prawdziwy" bot (nie market maker) i czy funkcja istnieje
            if (ai.skillPoints !== undefined && typeof aiUseMediaInfluence === 'function') { 
                aiUseMediaInfluence(ai);
            }
        });
        stocks.forEach(stock => {
            if (typeof updateCorporatePhase === 'function') {
                updateCorporatePhase(stock);
            }
            // ===>>> AKTUALIZACJA PROCESÓW M&A (JEŚLI TRWAJĄ) <<<===
            if (stock.mergerProcess && typeof advanceMergerProcess === 'function') {
                advanceMergerProcess(stock);
            }
        });
        if (typeof updateInfluence === 'function') {
             updateInfluence();
        }
        
        // ===>>> SPRAWDZENIE NOWYCH M&A PRZEZ AI <<<===
        if (typeof checkForPotentialMA === 'function') {
            checkForPotentialMA();
        }
        
        // ===>>> SPRAWDZENIE STATUSU MONOPOLISTY <<<===
        if (typeof checkMonopolyStatus === 'function') {
             checkMonopolyStatus();
        }

        if (typeof runPrivateCompanyLogic === 'function') {
            runPrivateCompanyLogic(); // Logika rozwoju firm prywatnych
        }

    }, BASE_DELAYS.quarterly / speedMultiplier);

    // Pętla reputacji (powolny powrót do zera)
    gameTimers.reputationDecay = setInterval(() => {
        if (isGamePaused) return;
        stocks.forEach(stock => {
            if (stock.reputation) {
                for (const entityId in stock.reputation) {
                    const currentRep = stock.reputation[entityId];
                    if (currentRep > 0) {
                        changeReputation(entityId, stock.symbol, -5);
                        if (stock.reputation[entityId] < 0) stock.reputation[entityId] = 0;
                    } else if (currentRep < 0) {
                        changeReputation(entityId, stock.symbol, 5);
                        if (stock.reputation[entityId] > 0) stock.reputation[entityId] = 0;
                    }
                }
            }
        });
    }, 180000 / speedMultiplier); // 3 minuty czasu gry

    // Pętla wydarzeń losowych
    gameTimers.event = setInterval(() => {
        if (isGamePaused) return;
        triggerMainMarketEventCycle();
    }, BASE_DELAYS.event / speedMultiplier);

    // Pętle dla obligacji (z bazy main.js)
    gameTimers.stateBondIssuance = setInterval(() => {
        if (isGamePaused) return;
        issueStateBonds();
    }, 15 * 60 * 1000 / speedMultiplier); // 15 minut

    gameTimers.otherBondIssuance = setInterval(() => {
        if (isGamePaused) return;
        issueNewBondOffer();
    }, 40 * 1000 / speedMultiplier); // Co 40 sekund

    gameTimers.bondMaturityCheck = setInterval(() => {
        if (isGamePaused) return;
        checkBondMaturities(5000); // 5 s czasu gry
    }, 5000 / speedMultiplier); // Co 5 sekund

    // Pętle dla zdarzeń CEO, półrocznych i rocznych
    gameTimers.ceoEvent = setInterval(() => {
        if (isGamePaused) return;
        triggerCeoEvent();
    }, BASE_DELAYS.quarterly * 2 / speedMultiplier); // Co 2 kwartały

    gameTimers.semiAnnual = setInterval(() => {
        if (isGamePaused) return;
        triggerSemiAnnualEvents();
    }, BASE_DELAYS.quarterly * 2 / speedMultiplier); // Co pół roku

    gameTimers.yearly = setInterval(() => {
        if (isGamePaused) return;
        updateCeoTenureAndAge();
        triggerYearlyCeoEvents();
        if (Date.now() >= nextWealthTaxTime) {
         if (typeof processWealthTax === 'function') {
             processWealthTax();
         } else {
             console.error("Funkcja processWealthTax nie została znaleziona!");
         }
    }

    checkSanEscobarRisk();

    if (typeof aiUpgradeAntitrustOffice === 'function') {
            aiUpgradeAntitrustOffice(); // Państwo (AI) decyduje o ulepszeniu urzędu
        }


    if (Math.random() < 0.3) {
        if (typeof triggerGovernmentSpendingEvent === 'function') {
            triggerGovernmentSpendingEvent();
        } else {
            console.error("Funkcja triggerGovernmentSpendingEvent nie została znaleziona!");
        }
    }

        processCityYearly(); // gospodarka miasta, polityka burmistrza, spółki miejskie, kampania i wybory (city.js)
    }, BASE_DELAYS.quarterly * 4 / speedMultiplier); // Co rok
}

// Funkcja inicjalizująca grę
function initializeGame() {
    console.log("--- Funkcja initializeGame() została wywołana ---"); // Log startowy
    if (typeof applyInitialTheme === 'function') {
        applyInitialTheme(); // Stosuje motyw (ciemny/jasny)
    } else {
        console.warn("applyInitialTheme not available, skipping theme application");
    }

    // Wczytaj zapisany stan zwinięcia panelu startupów
    const savedStartupCollapseState = localStorage.getItem('startupPanelCollapsed');
    if (savedStartupCollapseState !== null) {
        if (typeof startupPanelCollapsed !== 'undefined') {
            startupPanelCollapsed = JSON.parse(savedStartupCollapseState);
        } else {
            // console.warn("Zmienna startupPanelCollapsed nie jest dostępna globalnie w main.js"); // Usunięty log diagnostyczny
        }
    }

    // Wczytanie zapisu (save.js). Przy udanym wczytaniu NIE tworzymy nowego świata,
    // więc nie ma ponownej inicjalizacji, kasowania postępu ani kosztów startowych.
    const restoredFromSave = typeof restoreSavedGame === 'function' ? restoreSavedGame() : false;

    if (!restoredFromSave) {
        createNewWorld();
        // Fundusz startowy z domyślnym profilem; scenka startowa uzupełnia imię i nazwy.
        startNewCareer({});
    }

    // Mechaniki wyłączone w etapie B: ukrycie ich paneli.
    if (!FEATURE_FLAGS.startups) {
        const incubator = document.getElementById('startup-incubator-panel');
        if (incubator) incubator.style.display = 'none';
    }

    // Ustawienie UI
    const startupPanel = document.getElementById('startup-incubator-panel');
    const startupIcon = document.getElementById('toggle-icon-startup');
    if (startupPanel && startupIcon) {
        let isCollapsed = false;
        if (typeof startupPanelCollapsed !== 'undefined') {
            isCollapsed = startupPanelCollapsed;
        }
        if (isCollapsed) {
            startupPanel.classList.add('collapsed');
            startupIcon.textContent = '▶';
        } else {
            startupPanel.classList.remove('collapsed');
            startupIcon.textContent = '▼';
        }
    }

    console.log("[initializeGame] Końcowa inicjalizacja UI..."); // Log informacyjny
    if (typeof setupAutoInvestModal === 'function') {
        setupAutoInvestModal();
    } else {
        console.warn('[initializeGame] setupAutoInvestModal nie jest dostępna.');
    }

     if (typeof setupAutoInvestModal === 'function') setupAutoInvestModal();
    if (typeof displayCash === 'function') displayCash();
    if (typeof displayPortfolio === 'function') displayPortfolio();
    if (typeof displayXP === 'function') displayXP();
    if (typeof displayMarketIndexes === 'function') displayMarketIndexes();
    if (typeof updateDividendTrackerButtonVisibility === 'function') updateDividendTrackerButtonVisibility();

    const pauseButton = document.getElementById('pause-game-btn');
    if (isGamePaused && pauseButton) {
        pauseButton.textContent = '▶️ Wznów';
        pauseButton.classList.add('is-paused');
    }

    updateInterestRates();

    // Wyświetlenie początkowego stanu rynku
    displayStocks();
    displayStartups();
    displayEtfs();

   if (restoredFromSave) {
        // Liczniki czasu zostały odtworzone z zapisu.
    } else if (typeof initializeGameTimeRelatedVariables === 'function') {
        initializeGameTimeRelatedVariables();
    } else {
        console.error("Funkcja initializeGameTimeRelatedVariables nie została znaleziona w gameLogic.js!");
         // Awaryjne ustawienie, jeśli funkcja nie istnieje
        if(typeof BASE_DELAYS !== 'undefined' && typeof BASE_DELAYS.quarterly !== 'undefined') {
             WEALTH_TAX_INTERVAL = BASE_DELAYS.quarterly * 4; // Zdefiniuj WEALTH_TAX_INTERVAL globalnie (mniej idealne)
             nextWealthTaxTime = Date.now() + WEALTH_TAX_INTERVAL;
        } else {
            console.error("BASE_DELAYS lub BASE_DELAYS.quarterly nie jest zdefiniowane!");
        }
    }

    if (!restoredFromSave && typeof showIntroScene === 'function') {
        showIntroScene(); // SMS od babci + profil gracza (gra stoi na pauzie)
    }

    // Uruchomienie pętli gry — jedyne miejsce tworzenia timerów (setGameSpeed czyści poprzednie
    // — nie tworzymy ich nigdzie indziej).
    setGameSpeed(restoredFromSave ? currentSpeedMultiplier : 1);
    if (typeof localStorage !== 'undefined') {
        window.addEventListener('beforeunload', saveGameState);
    }
}

/** Tworzy nowy świat gry (banki, spółki budowlane, startupy, bilanse, R&D...). */
function createNewWorld() {
    // Inicjalizacja banków komercyjnych (ta funkcja teraz ustawia isActive dla banków startowych)
    initializeCommercialBanks(); // Tworzy banki, może ustawić isActiveFromStart
    generateCentralBankGovernor();
    initializeConstructionCompanies();
    initializeAllConstructionStats(); // Inicjalizuje maxProjects i currentProjects dla spółek budowlanych
    
    let activatedBankIds = []; // Tablica do śledzenia ID aktywowanych banków
    let activatedBanksCount = 0; // Licznik aktywowanych banków

    // --- Krok 1: Resetuj isActive dla wszystkich banków ---
    // Zapewnia, że nasza logika wyboru ma pierwszeństwo przed flagą isActiveFromStart
    commercialBanks.forEach(bank => bank.isActive = false);

    // --- Krok 2: Aktywuj JEDEN bank inwestycyjny ---
    const investmentBanks = commercialBanks.filter(b => b.type === BANK_TYPES.INVESTMENT);
    if (investmentBanks.length > 0) {
        const chosenInv = getRandomElement(investmentBanks);
        chosenInv.isActive = true;
        activatedBankIds.push(chosenInv.id);
        activatedBanksCount++;
        
    } else {
        console.warn("! Brak banków inwestycyjnych do aktywacji.");
    }

    // --- Krok 3: Aktywuj JEDEN bank korporacyjny (inny niż już aktywowany) ---
    const corporateBanks = commercialBanks.filter(b => b.type === BANK_TYPES.CORPORATE && !activatedBankIds.includes(b.id));
    if (corporateBanks.length > 0) {
        const chosenCorp = getRandomElement(corporateBanks);
        chosenCorp.isActive = true;
        activatedBankIds.push(chosenCorp.id);
        activatedBanksCount++;
        
    } else {
        console.warn("! Brak dostępnych *nieaktywowanych* banków korporacyjnych do aktywacji.");
    }

    // --- Krok 4: Aktywuj DWA inne, losowe banki (inne niż już aktywowane) ---
    const remainingInactiveBanks = commercialBanks.filter(b => !activatedBankIds.includes(b.id));
    const neededRandomBanks = 4 - activatedBanksCount; // Ile jeszcze brakuje do 4

    for (let i = 0; i < neededRandomBanks && remainingInactiveBanks.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * remainingInactiveBanks.length);
        const chosenOther = remainingInactiveBanks.splice(randomIndex, 1)[0]; // Wybierz i usuń z puli
        chosenOther.isActive = true;
        activatedBankIds.push(chosenOther.id);
        activatedBanksCount++;
        console.log(`- [Aktywacja OK] Losowy bank ${i + 1}: ${chosenOther.name} (ID: ${chosenOther.id}, Typ: ${chosenOther.type})`);
    }

    if (activatedBanksCount < 4) {
        console.warn(`! Nie udało się aktywować 4 banków, aktywnych jest tylko ${activatedBanksCount}. Sprawdź definicje banków.`);
    }

    // Tworzenie początkowych start-upów, jeśli ich brakuje
    const existingStartups = Array.isArray(stocks) ? stocks.filter(s => s.assetType === 'Startup').length : 0;
    if (existingStartups < 5) {
        const genFn = (typeof generateNewStartup === 'function') ? generateNewStartup : (typeof window !== 'undefined' && typeof window.generateNewStartup === 'function') ? window.generateNewStartup : null;
        if (genFn) {
            const toCreate = 5 - existingStartups;
            for (let i = 0; i < toCreate; i++) {
                try {
                    stocks.push(genFn());
                } catch (err) {
                    console.error('Błąd podczas generowania start-upu:', err); // Zachowany błąd
                }
            }
        } else {
            console.warn('generateNewStartup nie jest dostępna — pomijam tworzenie dodatkowych start-upów.'); // Zachowane ostrzeżenie
        }
    }

    // Inicjalizacja opisów R&D Instytutów
    let availableResearchDescriptions = [];
    if (typeof researchInstituteDescriptions !== 'undefined' && Array.isArray(researchInstituteDescriptions)) {
        availableResearchDescriptions = [...researchInstituteDescriptions];
    } else {
        console.warn("Zmienna researchInstituteDescriptions nie jest zdefiniowana lub nie jest tablicą."); // Zachowane ostrzeżenie
    }
    // (Pętla inicjalizująca opisy Instytutów - zakładam, że jest w innej części kodu lub była w usuniętym fragmencie)

    // --- Dodawanie aktywnych banków do giełdy ---
    console.log("[START GRY] Dodawanie aktywnych banków na giełdę...");
    let banksAddedToStocks = 0;
    commercialBanks.forEach(bank => {
        if (bank.isActive) { // Dodajemy tylko te, które TERAZ oznaczyliśmy jako aktywne
            let bankStock = stocks.find(s => s.isBankStock && s.bankData && s.bankData.id === bank.id);

            if (bankStock) {
                banksAddedToStocks++;
            } else if (typeof createBankStockObject === 'function') {
                bankStock = createBankStockObject(bank, 'SILVER');
                if (bankStock) {
                    const existingStockWithSymbol = stocks.find(s => s.symbol === bankStock.symbol);
                    if (!existingStockWithSymbol) {
                        stocks.push(bankStock);
                        banksAddedToStocks++;
                    } else {
                         if(existingStockWithSymbol.bankData && existingStockWithSymbol.bankData.id === bank.id) {
                            console.warn(`! Próbowano dodać bank ${bank.name} (${bankStock.symbol}), ale już istnieje w 'stocks'.`);
                        } else {
                             console.error(`!!! KRYTYCZNY BŁĄD: Wygenerowano zduplikowany symbol ${bankStock.symbol} dla różnych banków (${bank.name} vs ${existingStockWithSymbol.name})!`);
                        }
                    }
                } else {
                     console.error(`! createBankStockObject zwrócił null dla banku ${bank.name}`);
                }
            } else {
                console.error("! Funkcja createBankStockObject nie jest dostępna!");
            }
        }
    });
    console.log(`[initializeGame] Zakończono dodawanie banków. ${banksAddedToStocks} banków jest teraz w 'stocks'. Całkowita liczba banków w 'stocks': ${stocks.filter(s=>s.isBankStock).length}`);
    console.log("[initializeGame] Inicjalizacja startowych depozytów AI...");
    aiCompetitors.forEach(ai => {
        if (ai.initialDeposit && ai.initialDeposit > 0) {
            // Znajdź odpowiedni, aktywny bank dla depozytu (np. uniwersalny lub internetowy)
            const eligibleBanks = commercialBanks.filter(b =>
                b.isActive &&
                (b.type === BANK_TYPES.UNIVERSAL || b.type === BANK_TYPES.INTERNET || b.type === BANK_TYPES.COOPERATIVE) // Banki detaliczne
            );
            if (eligibleBanks.length > 0) {
                const chosenBank = getRandomElement(eligibleBanks);
                const depositAmount = ai.initialDeposit;

                // Sprawdź, czy bank ma tyle kapitału (na wszelki wypadek)
                // W tym przypadku AI wpłaca, więc bankowi przybywa, ale zachowajmy spójność
                if (ai.cash >= depositAmount) { // AI musi mieć środki na depozyt
                    ai.cash -= depositAmount; // Odejmij z gotówki AI
                    chosenBank.cash += depositAmount; // Dodaj do gotówki banku

                    // Zapisz depozyt w portfelu banku
                    if (!chosenBank.depositPortfolio[ai.id]) chosenBank.depositPortfolio[ai.id] = [];
                    chosenBank.depositPortfolio[ai.id].push({
                        id: `dep_init_${ai.id}_${Date.now()}`,
                        amount: depositAmount,
                        interestRate: chosenBank.interestRateDeposit // Użyj aktualnej stopy banku
                    });

                    // Opcjonalnie: Zapisz depozyt u AI (jeśli dodano pole ai.deposits)
                     if (ai.deposits) {
                         ai.deposits.push({
                            id: `dep_init_${ai.id}_${Date.now()}`,
                            bankId: chosenBank.id,
                            bankName: chosenBank.name,
                            amount: depositAmount,
                            interestRate: chosenBank.interestRateDeposit,
                            startDate: Date.now()
                         });
                     }
                    console.log(`- Bankier ${ai.name} umieścił startowy depozyt ${depositAmount} PLN w ${chosenBank.name}.`);
                } else {
                    console.warn(`! Bankier ${ai.name} nie miał wystarczająco gotówki (${ai.cash}) na startowy depozyt (${depositAmount}).`);
                }
            } else {
                console.warn(`! Nie znaleziono odpowiedniego banku dla startowego depozytu AI ${ai.name}.`);
            }
        }
    });

    // Przypisywanie kont bankowych spółkom
    console.log("[START GRY] Przypisywanie kont bankowych spółkom..."); // Log informacyjny
    const activeCorpAndUniBanks = commercialBanks.filter(b => b.isActive && (b.type === BANK_TYPES.CORPORATE || b.type === BANK_TYPES.UNIVERSAL));
    console.log("[START GRY] Przypisywanie kont bankowych spółkom...");
    stocks.forEach(stock => {
        // Używamy funkcji z companies.js
        if (typeof assignBankToCompany === 'function') {
            assignBankToCompany(stock);
        }
        
        // ZMIANA: Inicjalizacja działów dla WSZYSTKICH odpowiednich spółek na starcie
        if (typeof initializeDepartments === 'function') {
            initializeDepartments(stock);
        }
    });

    // Końcowa inicjalizacja danych dla wszystkich spółek w 'stocks'
    console.log("[initializeGame] Końcowa inicjalizacja bilansów, CEO, R&D itp. dla wszystkich spółek w 'stocks'..."); // Log informacyjny
    stocks.forEach(stock => {
        if (!stock.balanceSheet && !stock.assetType) {
             initializeBalanceSheetForStock(stock);
        }
        if (stock.cash === undefined) {
             stock.cash = stock.balanceSheet ? stock.balanceSheet.assets * getRandomInRange(0.01, 0.05) : 0;
        }
        if (!stock.ceo && !stock.assetType) generateCEO(stock);
        if (!stock.descriptionParts && !stock.description && !stock.assetType) initializeDescriptionParts(stock);
        if (!stock.analytical && !stock.assetType) initializeAnalyticalProperties(stock);
        if (!stock.research && !stock.assetType) initializeResearchForStock(stock);
        if (stock.playerHasFinancialAccess === undefined) stock.playerHasFinancialAccess = false;
        if (!stock.assetType && !stock.isBankStock) { // Tylko dla zwykłych spółek
            stock.influence = {
                exerted: {}, 
                received: {}, 
                totalReceived: 0 
            };
        } else {
            stock.influence = null; 
        }
    });

    // Koniunktura startowa, fundamenty spółek (kalibracja przychodów do obecnych wycen)
    // i struktura własności (pakiety insiderów).
    economyCycle = createEconomyCycle(getRandomElement(['recovery', 'expansion']));
    macro = createMacroState(); // wskaźniki makro, cykle sektorów, wybory (macro.js)
    botRelations = createBotRelations(); // relacje z botami (relations.js)
    oversight = createOversight(); // korupcja i nadzór (oversight.js)
    mafia = createMafia(); // mafia (mafia.js)
    scandals = createScandals(); // afery (scandals.js)
    updateMarketTrendFromCycle();
    stocks.forEach(stock => {
        if (stock.balanceSheet && stock.assetType !== 'Startup') initializeFundamentals(stock, true);
        initializeOwnership(stock);
    });

    // Inicjalizacja systemów globalnych
    initializeReputation();
    initializeHoldingPortfolios();
    assignInitialDividendPolicies();
    if (typeof initializeDividendEstimates === 'function') {
        initializeDividendEstimates();
    } else {
        console.warn('initializeDividendEstimates nie jest dostępna — pomijam inicjalizację estymat dywidend.'); // Zachowane ostrzeżenie
    }
    initializeCityCompanies();
    initCityModel();
    // Holdingi bez ceny startowej (wyliczanej z NAV dopiero przy pierwszym ticku) dostają cenę = NAV.
    stocks.filter(stock => stock.assetType === 'Holding' && !(stock.price > 0)).forEach(stock => { stock.price = Math.max(0.01, getExternalFundValue(stock)); });
    assignEliteExchanges(); // giełdy Rubinowa i Szmaragdowa od startu (Diamentowa po 30 min gry)
    maintainStartupCount(); // inkubator startuje z kilkoma startupami
    initMarketOperators(); // GPW i przyszli operatorzy rynków (markets.js)
    initDefenseSector(); // spółki zbrojeniowe i fundusz Gwardia (defense.js)
    specialProjects = createSpecialProjects(); // projekty specjalne miasta (projects.js)
    initializeEtfs(); // ETF-y z portfelami prawdziwych akcji (etf.js)
    console.log("[M&A Init] Inicjalizacja nastawienia mediów...");
    const mediaCompanies = stocks.filter(s => s.specializationSectors?.includes('Media'));
    if (mediaCompanies.length >= 2) {
        const shuffledMedia = mediaCompanies.sort(() => 0.5 - Math.random());
        shuffledMedia[0].stance = 'pro-player';
        shuffledMedia[1].stance = 'anti-player';
        console.log(`[M&A Init] Gazeta PRO-gracz: ${shuffledMedia[0].symbol}, Gazeta ANTI-gracz: ${shuffledMedia[1].symbol}`);
    }
}

// Uruchom grę po załadowaniu strony (z bazy main.js - zawiera zależność od banków komercyjnych)
// W trybie testów (tests/tests.html) gra nie startuje automatycznie.
if (typeof window !== 'undefined' && !window.__GAME_TEST_MODE__) window.addEventListener('load', () => {
    console.log('[loader] Zdarzenie "load" strony wystąpiło. Uruchamiam initializeGame().');
    try {
        // Podstawowe sprawdzenie, czy kluczowe funkcje z innych plików istnieją
        if (typeof initializeCommercialBanks !== 'function' ||
            typeof generateNewStartup !== 'function' ||
            typeof assembleDescription !== 'function' ||
            typeof createBankStockObject !== 'function') { // Sprawdzenie nowej funkcji
            console.error('[loader] Krytyczne funkcje z innych plików nie są dostępne! Sprawdź kolejność i zawartość skryptów w HTML.');
            alert("Błąd ładowania gry! Niezbędne funkcje nie zostały znalezione. Sprawdź konsolę deweloperską (F12).");
            return; // Nie kontynuuj, jeśli brakuje podstaw
        }

        // Sprawdzenie istnienia kluczowych stałych z gameLogic.js
        // Upewnij się, że BASE_DELAYS jest zdefiniowane w gameLogic.js
        if (typeof BANK_TYPES === 'undefined' ||
            typeof ALL_COMMERCIAL_BANKS_DEFINITIONS === 'undefined' ||
            typeof BASE_DELAYS === 'undefined') {
             console.error('[loader] Krytyczne stałe z gameLogic.js nie są dostępne! Sprawdź definicje na początku gameLogic.js.');
             alert("Błąd ładowania gry! Niezbędne stałe nie zostały znalezione. Sprawdź konsolę deweloperską (F12).");
             return;
        }


        initializeGame(); // Wywołaj inicjalizację bezpośrednio

    } catch (e) {
        console.error('[loader] Błąd podczas wywoływania initializeGame():', e);
        alert("Wystąpił krytyczny błąd podczas inicjalizacji gry. Sprawdź konsolę deweloperską (F12).");
    }
});

// Funkcja uruchamiająca AI (z bazy main.js - zawiera AI banków inwestycyjnych)
function runAllAi() {
    aiCompetitors.forEach(ai => {
        if (ai.isMafia || ai.isGuard) return; // Bruno Gato (mafia.js) i Gwardia (defense.js) mają własną logikę
        if (Math.random() < 0.15) {
            makeAiDecision(ai);
            checkAiTierUpgrade(ai);
        }
    });
    // AI dla banków inwestycyjnych (z bazy main.js)
    commercialBanks.forEach(bank => {
        if (bank.type === BANK_TYPES.INVESTMENT && bank.isActive) {
            if (Math.random() < 0.10) {
                runInvestmentBankAI(bank);
            }
        }
        // W przyszłości dodamy tu logikę AI dla innych typów banków
    });
    if (Math.random() < 0.02) {
        runStateActions();
    }
}
