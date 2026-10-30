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
// v16: waluty i kantor (kursy, gotówka w walutach), kwity depozytowe GDR. Zapis v15 migruje: kursy startowe, bez walut i GDR.
const SAVE_FORMAT_VERSION = 21; // 0.16.11 K2: waluta bazowa konta (playerProfile.baseCurrency; stare zapisy = PLN); 20 = 0.16.9 W1: średni kurs nabycia sald walutowych funduszu (currencies.basis; stare zapisy: bieżący kurs); 19 = 0.16.10: kraj startowy (playerProfile.country; stare zapisy = PL); 18 = 0.16.7: pełne spółki zagraniczne (bilans, wyniki, dywidendy w zapisie krajów); 17 = 0.16.5: Internet (Tied w skrzynce); wcześniej 16 = waluty, kantor, GDR
const SUPPORTED_SAVE_VERSIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

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
const SAVED_CANDLES = 24;
const SAVE_SIZE_TARGET = 2_500_000; // znaków — dawny limit localStorage (~5 MB); od 0.14.3 limity w save_store.js
// Poziomy zapisu: 0 — zwykły, 1 — kompaktowy (zapis > 2,5 MB), 2 — awaryjny (przeglądarka odmówiła miejsca).
const SAVE_COMPACT_LEVELS = [
    { line: SAVED_LINE_HISTORY_POINTS, candles: SAVED_CANDLES, ledger: RESEARCH_LEDGER_KEEP_RECOGNIZED, chartEvents: 20, agm: 4, mails: 100, journal: 100 },
    { line: 40, candles: 15, ledger: 2, chartEvents: 5, agm: 1, mails: 60, journal: 20 },
    { line: 12, candles: 4, ledger: 0, chartEvents: 0, agm: 0, mails: 25, journal: 0 }
];

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

const roundList = list => Array.isArray(list) ? list.map(value => roundSignificant(value)) : list;
const roundRecords = list => Array.isArray(list) ? list.map(item => item && typeof item === 'object' ? Object.fromEntries(Object.entries(item).map(([key, value]) => [key, roundSignificant(value)])) : roundSignificant(item)) : list;

/** 0.14 T1: segmenty w zapisie zwięźle — „sektor|podsektor|udział” rozdzielone „;”; stock.sector wyliczany przy wczytaniu. */
function encodeSegmentsForSave(segments) {
    return segments.map(seg => `${seg.sector}|${seg.subsector || ''}|${Math.round(seg.share * 1e4) / 1e4}${seg.niche ? `|${seg.niche}` : ''}`).join(';'); // T3: nisza jako 4. pole
}

function decodeSavedSegments(text) {
    const segments = String(text).split(';').map(part => {
        const [sector, subsector, share, niche] = part.split('|');
        return niche ? { sector, subsector: subsector || null, share: Number(share), niche } : { sector, subsector: subsector || null, share: Number(share) };
    }).filter(seg => seg.sector && seg.share > 0);
    const total = segments.reduce((sum, seg) => sum + seg.share, 0);
    return total > 0 ? segments.map(seg => ({ ...seg, share: seg.share / total })) : [];
}

function serializeStocksForSave(level = 0) {
    const limits = SAVE_COMPACT_LEVELS[Math.max(0, Math.min(2, Number(level) || 0))];
    const serialized = serializeWithStockRefs(stocks, stocks);
    for (const company of serialized) {
        if (Array.isArray(company.segments) && company.segments.length) {
            company.seg = encodeSegmentsForSave(company.segments);
            delete company.segments;
            delete company.sector; // wyliczany z segmentów
        }
        if (company.isBankrupt) {
            // Upadła spółka: tylko dane do listy i statystyk — bez historii wykresów i raportów.
            company.lineHistory = []; company.candlestickHistory = []; company.chartEvents = []; company.priceHistory = [];
            if (company.fundamentals) company.fundamentals.history = (company.fundamentals.history || []).slice(-1);
            if (company.research) company.research.ledger = [];
            if (company.governance) company.governance.history = [];
            continue;
        }
        if (Array.isArray(company.lineHistory)) company.lineHistory = compactPricePoints(company.lineHistory.slice(-limits.line));
        if (Array.isArray(company.candlestickHistory)) company.candlestickHistory = compactPricePoints(company.candlestickHistory.slice(-limits.candles));
        if (Array.isArray(company.priceHistory)) company.priceHistory = roundList(company.priceHistory.slice(-limits.line));
        if (Array.isArray(company.fundamentals?.history)) company.fundamentals.history = roundRecords(company.fundamentals.history); // ≤ 8 kwartałów
        for (const key of ['weeklyCloses', 'dividendHistory', 'researchCostHistory']) if (Array.isArray(company[key])) company[key] = roundRecords(company[key]);
        if (company.workforce) {
            company.workforce.greySavings = roundList(company.workforce.greySavings);
            for (const key of ['payMult', 'productivity', 'productivityBonus', 'satisfaction', 'wagePremium', 'rotation', 'lastLaborIndex', 'greyExtraSaving']) company.workforce[key] = roundSignificant(company.workforce[key]);
        }
        if (Array.isArray(company.research?.ledger)) {
            company.research.ledger = company.research.ledger.filter((entry, index, list) => !entry.recognized || index >= list.length - limits.ledger);
        }
        if (Array.isArray(company.chartEvents)) company.chartEvents = limits.chartEvents ? company.chartEvents.slice(-limits.chartEvents) : [];
        if (Array.isArray(company.governance?.history)) company.governance.history = company.governance.history.slice(0, limits.agm);
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

/** Buduje obiekt zapisu (bez zapisywania go) — używane przez saveGameState i testy. compact: 0 / 1 / 2 (lub true = 1). */
function buildSaveSnapshot({ compact = 0 } = {}) {
    const now = Date.now();
    const level = compact === true ? 1 : Math.max(0, Math.min(2, Number(compact) || 0));
    const limits = SAVE_COMPACT_LEVELS[level];
    return {
        version: SAVE_FORMAT_VERSION,
        savedAt: now,
        compact: level,
        currentSpeedMultiplier: SAVED_SPEEDS.includes(currentSpeedMultiplier) ? currentSpeedMultiplier : 1, // T0: prędkości testowe nie trafiają do zapisu
        playerCash,
        governmentTreasury,
        stocks: serializeStocksForSave(level),
        commercialBanks: serializeWithStockRefs(commercialBanks),
        playerPortfolio: serializeWithStockRefs(playerPortfolio),
        aiCompetitors: serializeWithStockRefs(aiCompetitors),
        city: serializeWithStockRefs(city),
        centralBank: serializeWithStockRefs(centralBank),
        specialists: typeof serializeSubcontractors === 'function' ? serializeSubcontractors() : serializeWithStockRefs(specialists), // 0.15.5 B6: wersja skrócona
        constructionAwardLog, // 0.15.5 B1: okno wygranych przetargów (pole opcjonalne)
        gdr: typeof getGdrSnapshot === 'function' ? getGdrSnapshot() : undefined, // 0.16.1 G3: kwity depozytowe i zdarzenia
        countries: typeof getCountriesSnapshot === 'function' ? getCountriesSnapshot() : undefined, // 0.16.2 G5: dołączone kraje (pole opcjonalne v16)
        currencies: typeof getCurrencySnapshot === 'function' ? getCurrencySnapshot() : undefined, // 0.16.1 G2: kursy, gotówka w walutach (v16)
        forex: typeof getForexSnapshot === 'function' ? getForexSnapshot() : undefined, // 0.16.4 G21: pozycje z depozytem (pole opcjonalne v16)
        antitrustOffice, antitrustLog, // 0.15.6 E5: poziom urzędu antymonopolowego i interwencje (pola opcjonalne)
        subcontractLog, subcontractorDeals, subcontractorAcquisitionCount, // 0.15.5 B2–B3: okno zleceń podwykonawców, przejęcia pionowe (pola opcjonalne)
        activeTenders: activeTenders.filter(tender => ['open', 'closed', 'awarded'].includes(tender.status)).map(serializeTenderForSave), // zakończone przetargi nie trafiają do zapisu
        constructionProjects: constructionProjects.filter(project => !project.settled).map(serializeProjectForSave),
        paymentJournal: limits.journal ? paymentJournal.slice(-limits.journal) : [],
        paymentTotals,
        economyCycle,
        marketRegimes,
        marketCrash: typeof marketCrash !== 'undefined' ? marketCrash : null,
        marketHalt: typeof marketHalt !== 'undefined' ? marketHalt : null,
        crises: typeof crisisSnapshot === 'function' ? crisisSnapshot() : null, // 0.15.3
        buyoutState: typeof buyoutState !== 'undefined' ? buyoutState : null, // 0.15.1 M2
        genealogyLog: typeof genealogyLog !== 'undefined' ? genealogyLog : [], // 0.15.1 M10
        blockDealState: typeof blockDealState !== 'undefined' ? blockDealState : null, // 0.15.1 M4
        sectorBubble: activeSectorBubble,
        sectorBubbleCooldown: sectorBubbleCooldown,
        macro,
        society,
        etfs: serializeEtfs(),
        botRelations,
        marketOperators,
        specialProjects,
        marketStabilityProject: typeof getMarketStabilityProject === 'function' ? getMarketStabilityProject() : marketStabilityProject,
        oversight,
        mafia,
        scandals,
        playerProfile,
        playerFund,
        corporation,
        mailbox: { ...mailbox, messages: mailbox.messages.slice(0, limits.mails), digest: level ? [] : mailbox.digest },
        juMarket,
        investmentPool,
        statePension,
        bridgeLoanOffers,
        rescueOffers: Object.fromEntries(Object.entries(rescueOffers).filter(([, offer]) => !offer.closed)), // 0.14.2 P2: oferty per spółka
        usedCompanyNames, dejwCorpUsed, // 0.14.2 P4: unikalne nazwy spółek, „DejwCorp” najwyżej raz
        spinoffLog, // 0.14 T4: ostatnie wydzielenia (do 20)
        cooperations, cooperationLog, // 0.14 T5: kooperacje (trwające i ostatnie zakończone)
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

let saveWarningShown = false;

/** Jednorazowe ostrzeżenie dla gracza (zamiast błędu w konsoli przy każdym autozapisie). */
function warnSaveOnce(message) {
    if (saveWarningShown) return;
    saveWarningShown = true;
    if (typeof showToast === 'function') showToast(message, 'warning', 10000);
}

// 0.14.3: zapis w IndexedDB (save_store.js) z kompresją lz16; localStorage tylko jako zapas i kopia awaryjna.
let preloadedSaveCandidates = null;   // kandydaci z IndexedDB i localStorage (wczytani przed startem gry)
let saveMigrationPending = false;     // wczytano stary zapis (czysty JSON w localStorage) — zamiana po pierwszym udanym zapisie
let lastSaveRecord = null;
let restoredSaveSource = null;

function getSaveBackend() {
    return typeof saveStore === 'object' && saveStore.backend ? saveStore.backend : (typeof localStorage !== 'undefined' ? 'localStorage' : 'none');
}

/** Snapshot i JSON na najniższym poziomie, który mieści się w limicie znaków przed kompresją. */
function buildSaveJson(rawLimit) {
    for (let level = 0; level < SAVE_COMPACT_LEVELS.length; level++) {
        const snapshot = buildSaveSnapshot({ compact: level });
        const json = JSON.stringify(snapshot);
        if (json.length <= rawLimit || level === SAVE_COMPACT_LEVELS.length - 1) return { snapshot, json, level };
    }
    return null;
}

/** Snapshot i rekord lz16 na najniższym możliwym poziomie (limit znaków przed kompresją albo po niej). */
function buildSaveRecord({ rawLimit = SAVE_IDB_RAW_LIMIT, packedLimit = Infinity } = {}) {
    let record = null;
    for (let level = 0; level < SAVE_COMPACT_LEVELS.length; level++) {
        const snapshot = buildSaveSnapshot({ compact: level });
        const json = JSON.stringify(snapshot);
        if (json.length > rawLimit && level < SAVE_COMPACT_LEVELS.length - 1) continue;
        record = encodeSaveRecord(snapshot, level, json);
        if (JSON.stringify(record).length <= packedLimit || level === SAVE_COMPACT_LEVELS.length - 1) return record;
    }
    return record;
}

function saveGameState() {
    if (typeof localStorage === 'undefined') return false;
    if (saveDisabledUntilReload) return false;
    if (typeof window !== 'undefined' && (window.__GAME_TEST_MODE__ || window.__SIM_NO_SAVE__)) return false; // testy i przebiegi nie nadpisują zapisu gracza

    const backend = getSaveBackend();
    try {
        if (backend === 'indexeddb') {
            const t0 = performance.now();
            const { snapshot, json, level } = buildSaveJson(SAVE_IDB_RAW_LIMIT);
            const buildMs = performance.now() - t0;
            if (saveStore.persisted === null) saveStore.requestPersistence();
            const encode = canGzipSave() ? encodeSaveRecordGz(snapshot, level, json) : Promise.resolve(encodeSaveRecord(snapshot, level, json));
            encode.then(record => saveStore.write(record).then(result => ({ record, result }))).then(({ record, result }) => {
                lastSaveReport = result.ok
                    ? { ok: true, at: record.savedAt, size: record.size, compressed: record.compressed, format: record.format, compact: record.level, backend, compressMs: record.compressMs, buildMs: Math.round(buildMs), totalMs: Math.round(performance.now() - t0) }
                    : { ok: false, error: result.error, backend };
                if (!result.ok) { warnSaveOnce('⚠️ Nie udało się zapisać gry w pamięci przeglądarki — zapisz kopię do pliku (Ustawienia → Zapis).'); return; }
                if (saveMigrationPending || isLegacyLocalSave()) finishSaveMigration(encodeSaveRecord(snapshot, level, json)); // raz: kopia lz16 zamiast starego JSON
                if (record.level === 2) warnSaveOnce('⚠️ Zapis gry jest bardzo duży — zapisano wersję awaryjną (krótsze wykresy i historia).');
            }).catch(error => { lastSaveReport = { ok: false, error: String(error), backend }; });
            return true;
        }
        // Zapas: localStorage (po kompresji; poziomy kompaktowe tylko gdy rekord nie mieści się w limicie).
        const record = buildSaveRecord({ rawLimit: Infinity, packedLimit: SAVE_LOCAL_LIMIT });
        localStorage.removeItem(GAME_SAVE_KEY); // stary zapis zwalnia miejsce dla nowego
        writeLocalRecord(GAME_SAVE_KEY, record);
        lastSaveRecord = record;
        lastSaveReport = { ok: true, at: record.savedAt, size: record.size, compressed: record.compressed, compact: record.level, backend: 'localStorage', compressMs: record.compressMs };
        if (record.level === 2) warnSaveOnce('⚠️ Zapis gry jest bardzo duży — zapisano wersję awaryjną (krótsze wykresy i historia).');
        return true;
    } catch (error) {
        lastSaveReport = { ok: false, error: String(error), backend };
        if (!saveWarningShown) console.error('[save] Nie udało się zapisać gry:', error);
        warnSaveOnce('⚠️ Nie udało się zapisać gry — przeglądarka nie ma miejsca. Zapisz kopię do pliku (Ustawienia → Zapis).');
        return false;
    }
}

/** Migracja: po pierwszym udanym zapisie do IndexedDB stary czysty JSON w localStorage zamienia się w skompresowaną kopię. */
function finishSaveMigration(record, key = GAME_SAVE_KEY) {
    if (!saveMigrationPending && !isLegacyLocalSave(key)) return false;
    try { writeLocalRecord(key, record); saveMigrationPending = false; return true; } catch (error) { return false; } // za duży — kopia awaryjna przy zamknięciu karty
}

function isLegacyLocalSave(key = GAME_SAVE_KEY) {
    try {
        const raw = localStorage.getItem(key);
        return Boolean(raw) && !raw.startsWith(`{"format":"${SAVE_RECORD_FORMAT}"`);
    } catch (error) { return false; }
}

/** Zamknięcie karty: synchroniczna, skompresowana kopia awaryjna w localStorage (IndexedDB może nie zdążyć). */
let lastEmergencyCopyAt = 0;

function saveEmergencyCopy() {
    if (saveDisabledUntilReload || typeof localStorage === 'undefined') return false;
    if (Date.now() - lastEmergencyCopyAt < 2000) return true; // pagehide i beforeunload przychodzą zwykle razem
    lastEmergencyCopyAt = Date.now();
    if (typeof window !== 'undefined' && (window.__GAME_TEST_MODE__ || window.__SIM_NO_SAVE__)) return false;
    if (getSaveBackend() !== 'indexeddb') return saveGameState();
    saveGameState(); // asynchronicznie do IndexedDB (jeśli zdąży)
    try {
        const record = buildSaveRecord({ rawLimit: Infinity, packedLimit: SAVE_LOCAL_LIMIT }); // lz16 synchronicznie (ok. 1 s przy 20 latach gry)
        writeLocalRecord(GAME_SAVE_KEY, record);
        lastSaveRecord = record;
        return true;
    } catch (error) {
        return false;
    }
}

/** Przed startem gry: wykrycie miejsca zapisu i odczyt kandydatów (IndexedDB current/previous + localStorage). */
async function preloadSavedGames() {
    if (typeof saveStore !== 'object') return;
    await saveStore.detect();
    let idb = { current: null, previous: null };
    try { idb = await saveStore.read(); } catch (error) { console.warn('[save] Odczyt IndexedDB nieudany:', error); }
    let localRaw = null;
    try { localRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(GAME_SAVE_KEY) : null; } catch (error) { /* brak dostępu */ }
    preloadedSaveCandidates = await collectSaveCandidatesAsync(idb, localRaw);
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeCompanyNumbers(company, warnings) {
    if (company.assetType === 'Startup' && company.cash === undefined) {
        company.cash = 0; // startup nie ma gotówki (wycena po wpłatach) — bez ostrzeżenia w konsoli
    } else if (!isFiniteNumber(company.cash)) {
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

/** Wczytanie zapisu: spółki bez duplikatów symboli, segmenty v14. */
function restoreSavedStocks(snapshot, report) {
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
        if (typeof company.seg === 'string') { // v14: segmenty zwięźle, sektor z segmentów
            company.segments = decodeSavedSegments(company.seg);
            company.sector = getSectorsFromSegments(company.segments);
            delete company.seg;
        }
        restoredStocks.push(company);
    }
    return { bySymbol, restoredStocks };
}

/** Wczytanie zapisu: przetargi z referencjami do spółek; błędne anulowane. */
function restoreSavedTenders(snapshot, bySymbol, report) {
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
    return restoredTenders;
}

/** Wczytanie zapisu: projekty budowlane (model 3) z przetargiem i wykonawcą. */
function restoreSavedProjects(snapshot, bySymbol, tenderById, report) {
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
    return restoredProjects;
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

    snapshot = migrateLegacyBankSymbols(snapshot); // 0.16.11 K0: BKINV1/BKINV3/BKCORP3 → SPR/RPK/BPIG
    if (!Array.isArray(snapshot.stocks) || snapshot.stocks.length === 0) {
        report.errors.push('Zapis nie zawiera spółek.');
        return report;
    }

    // --- Spółki: duplikaty symboli ---
    const { bySymbol, restoredStocks } = restoreSavedStocks(snapshot, report);

    const missing = new Set();
    resolveStockRefs(restoredStocks, bySymbol, missing);
    restoredStocks.forEach(company => sanitizeCompanyNumbers(company, report.warnings));

    // --- Przetargi ---
    const restoredTenders = restoreSavedTenders(snapshot, bySymbol, report);

    const tenderById = new Map(restoredTenders.map(tender => [tender.id, tender]));

    // --- Projekty budowlane ---
    const restoredProjects = restoreSavedProjects(snapshot, bySymbol, tenderById, report);

    // Przetarg "awarded" bez projektu nie ma kontynuacji.
    for (const tender of restoredTenders) {
        if (tender.status === 'awarded' && !restoredProjects.some(project => project.tender === tender)) {
            tender.status = 'cancelled';
            tender.cancelReason = tender.cancelReason || 'Brak projektu po wczytaniu.';
        }
    }

    // --- Wszystko poprawne: podmieniamy stan gry ---
    stocks = restoredStocks;
    // v14 (0.14 T1): jedna migracja — najpierw stare nazwy sektorów (Bankowość Komercyjna, Finanse Konsumenckie,
    // Międzynarodowy, Logistyka, Transport), potem segmenty z równymi udziałami; specjalizacje holdingów po nowemu.
    const migratedSectors = ensureAllStockSegments();
    stocks.forEach(stock => { if (Array.isArray(stock.specializationSectors)) stock.specializationSectors = [...new Set(stock.specializationSectors.map(canonicalSectorName).filter(Boolean))]; });
    if (migratedSectors && (snapshot.version || 0) < 14) report.warnings.push(`Sektory i segmenty ${migratedSectors} spółek według rejestru 0.14 (migracja v14).`);

    const resolveOther = value => resolveStockRefs(value, bySymbol, missing);
    if (Array.isArray(snapshot.commercialBanks)) commercialBanks = resolveOther(snapshot.commercialBanks);
    if (snapshot.playerPortfolio) playerPortfolio = resolveOther(snapshot.playerPortfolio);
    // aiCompetitors jest stałą (const) — podmieniamy zawartość tablicy, nie referencję.
    if (Array.isArray(snapshot.aiCompetitors)) aiCompetitors.splice(0, aiCompetitors.length, ...resolveOther(snapshot.aiCompetitors));
    if (snapshot.city) city = resolveOther(snapshot.city);
    if (snapshot.centralBank) centralBank = resolveOther(snapshot.centralBank);
    const savedSpecialists = typeof deserializeSubcontractors === 'function' ? deserializeSubcontractors(snapshot.specialists) : snapshot.specialists;
    if (Array.isArray(savedSpecialists)) specialists = resolveOther(savedSpecialists);
    subcontractLog = Array.isArray(snapshot.subcontractLog) ? snapshot.subcontractLog.filter(e => e && Number.isFinite(e.q) && typeof e.spec === 'string') : []; // 0.15.5 B2
    subcontractorDeals = Array.isArray(snapshot.subcontractorDeals) ? snapshot.subcontractorDeals : [];
    subcontractorAcquisitionCount = Number(snapshot.subcontractorAcquisitionCount) || 0;
    ensureSubcontractorRegistry(); // 0.15.5 B2: rejestr 12 specjalności budowany z istniejących danych (zapisy starsze mają 7 podwykonawców)
    ensureAllReitModels(); // 0.15.5 B5: REIT-y ze starszego zapisu dostają portfel z bilansu
    if (snapshot.version < 16) report.warnings.push('Dodano waluty i kantor (migracja v16): kursy startowe, brak walut i kwitów depozytowych.');
    if (snapshot.version < 17) report.warnings.push('Poczta to teraz TeamedUP!, a wiadomości od inwestorów i spółek czytasz w Tied (migracja v17): żadna wiadomość nie zginęła.');
    if (snapshot.version < 18) report.warnings.push('Spółki zagraniczne mają teraz bilans, raporty, dywidendy i prezesów (migracja v18): modele zbudowano z bieżących cen, wcześniejsza historia wyników nie istniała.');
    if (playerProfile && !START_PLAYABLE.includes(playerProfile.country)) playerProfile.country = 'PL'; // v19: brak kraju startowego w starszym zapisie = Polska
    if (playerProfile && playerProfile.country !== 'PL' && !isCountryJoined(playerProfile.country)) joinCountry(playerProfile.country, 'start');
    if (playerFund) delete playerFund.openSubscriptions; // 0.16.1: emisja ciągła wycofana także w starszych zapisach
    if (typeof ensureLaunchedIndexes === 'function') ensureLaunchedIndexes(); // 0.16.1: SIG40/BSIG80 z decyzji Banku Centralnego
    if (typeof applyGdrSnapshot === 'function') applyGdrSnapshot(snapshot.gdr);
    if (typeof applyCountriesSnapshot === 'function') applyCountriesSnapshot(snapshot.countries); // 0.16.2 G5
    if (typeof applyCurrencySnapshot === 'function') applyCurrencySnapshot(snapshot.currencies); // 0.16.1 G2: v15 → kursy startowe, bez walut
    if (typeof applyForexSnapshot === 'function') applyForexSnapshot(snapshot.forex); // 0.16.4 G21
    if (snapshot.antitrustOffice && typeof snapshot.antitrustOffice === 'object') Object.assign(antitrustOffice, snapshot.antitrustOffice); // 0.15.6 E5: poziom urzędu (dawniej nie zapisywany)
    antitrustLog = Array.isArray(snapshot.antitrustLog) ? snapshot.antitrustLog.filter(e => e && typeof e.symbol === 'string') : [];
    constructionAwardLog = Array.isArray(snapshot.constructionAwardLog) ? snapshot.constructionAwardLog.filter(e => e && typeof e.sym === 'string' && Number.isFinite(e.q)) : []; // 0.15.5 B1

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
    if (playerProfile && !BASE_SCALES[playerProfile.baseCurrency]) playerProfile.baseCurrency = 'PLN'; // v21: brak waluty bazowej w starszym zapisie = złoty
    if (typeof syncBaseCurrency === 'function') syncBaseCurrency();
    // Korporacja (v5); zapis v4 — tworzymy nową przy zachowaniu funduszu gracza.
    // Skrzynka, miasto i państwo (v6); starsze zapisy dostają pustą skrzynkę i burmistrza.
    if (snapshot.mailbox && Array.isArray(snapshot.mailbox.messages)) {
        mailbox = { ...createMailbox(), ...snapshot.mailbox };
        if (!Array.isArray(mailbox.tied)) mailbox.tied = [];
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
    if (!investmentPool.ledgerSince && typeof startPoolLedgerFromFacts === 'function') startPoolLedgerFromFacts(); // 0.14.1 R0: księga puli od teraz
    if (typeof migratePoolStakesToFacts === 'function') migratePoolStakesToFacts(); // 0.14.1 R1: martwy wkład w pulę → fakty (bez zwrotu wstecz)
    if (typeof migrateResearchInstituteValuation === 'function') migrateResearchInstituteValuation(); // 0.14.2 P1: kosmiczne ceny instytutów → rewizja
    if (typeof migrateValuationOutliers === 'function') migrateValuationOutliers(); // 0.14.2 P9: banki, REIT-y, usługi finansowe, spółki ze stratą
    if (typeof syncSubsidiaryLinks === 'function') syncSubsidiaryLinks(); // 0.14.2 P3: córki z faktów, wchłonięte spółki osobno
    statePension = snapshot.statePension && Array.isArray(snapshot.statePension.history) ? snapshot.statePension : { history: [], lastRanking: [] };
    bridgeLoanOffers = Array.isArray(snapshot.bridgeLoanOffers) ? snapshot.bridgeLoanOffers : [];
    // 0.14.2 P2: oferty emisji ratunkowej per spółka (stare zapisy: jedna oferta `rescueOffer`)
    usedCompanyNames = Array.isArray(snapshot.usedCompanyNames) ? snapshot.usedCompanyNames : stocks.map(s => s.name); // 0.14.2 P4
    dejwCorpUsed = Boolean(snapshot.dejwCorpUsed) || stocks.some(s => /^DejwCorp/.test(s.name));
    spinoffLog = Array.isArray(snapshot.spinoffLog) ? snapshot.spinoffLog : []; // 0.14 T4
    cooperations = Array.isArray(snapshot.cooperations) ? snapshot.cooperations : []; // 0.14 T5 (pole opcjonalne)
    cooperationLog = Array.isArray(snapshot.cooperationLog) ? snapshot.cooperationLog : [];
    rescueOffers = {};
    for (const offer of [...Object.values(snapshot.rescueOffers || {}), snapshot.rescueOffer].filter(o => o?.symbol && !o.closed)) rescueOffers[offer.symbol] = offer;

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
    if (isFiniteNumber(snapshot.currentSpeedMultiplier) && SAVED_SPEEDS.includes(snapshot.currentSpeedMultiplier)) {
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
    marketStabilityProject = snapshot.marketStabilityProject && typeof snapshot.marketStabilityProject === 'object' ? snapshot.marketStabilityProject : createMarketStabilityProject();
    ensureMarketStabilityProject();
    oversight = snapshot.oversight && typeof snapshot.oversight === 'object' ? snapshot.oversight : createOversight(); // v11: nadzór
    ensureOversight();
    mafia = snapshot.mafia && typeof snapshot.mafia === 'object' ? snapshot.mafia : createMafia(); // v11: mafia
    ensureMafia();
    scandals = snapshot.scandals && typeof snapshot.scandals === 'object' ? snapshot.scandals : createScandals(); // v11: afery
    ensureScandals();
    ensureMacroState();
    const startSubsectors = applyStartSubsectors(); // 0.14 T2: zapis sprzed T2 — podsektory z tabeli startowej raz
    if (startSubsectors) report.warnings.push(`Podsektory ${startSubsectors} spółek startowych (migracja 0.14 T2).`);
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
    if (snapshot.marketRegimes && snapshot.marketRegimes.home) {
        marketRegimes = snapshot.marketRegimes;
    } else {
        initMarketRegimes();
    }
    if (typeof marketCrash !== 'undefined' && snapshot.marketCrash) {
        marketCrash = snapshot.marketCrash;
    } else if (typeof createMarketCrashState === 'function') {
        marketCrash = createMarketCrashState();
    }
    if (typeof blockDealState !== 'undefined') blockDealState = snapshot.blockDealState?.talks ? snapshot.blockDealState : createBlockDealState(); // 0.15.1 M4
    if (typeof genealogyLog !== 'undefined') genealogyLog = Array.isArray(snapshot.genealogyLog) ? snapshot.genealogyLog : []; // 0.15.1 M10
    if (typeof buyoutState !== 'undefined') buyoutState = snapshot.buyoutState?.offers ? snapshot.buyoutState : createBuyoutState(); // 0.15.1 M2
    if (typeof marketHalt !== 'undefined' && snapshot.marketHalt) {
        marketHalt = snapshot.marketHalt;
        normalizeMarketHaltAfterLoad();
    } else if (typeof createMarketHaltState === 'function') {
        marketHalt = createMarketHaltState();
    }
    if (typeof applyCrisisSnapshot === 'function') applyCrisisSnapshot(snapshot.crises); // 0.15.3: brak pola = brak linii (migracja)
    activeSectorBubble = snapshot.sectorBubble || null;
    sectorBubbleCooldown = Number(snapshot.sectorBubbleCooldown) || 0;
    if ((snapshot.version || 0) < 15) {
        const phaseKey = (economyCycle?.phase === 'expansion' || economyCycle?.phase === 'overheating') ? 'bull' :
            economyCycle?.phase === 'recovery' ? 'accumulation' :
            economyCycle?.phase === 'recession' ? 'bear' : 'bull';
        if (typeof initMarketRegimes === 'function') initMarketRegimes(phaseKey);
        const gigVal = typeof getGigIndexValue === 'function' ? getGigIndexValue() : 1000;
        const reg = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
        if (reg) {
            reg.premium = 0;
            reg.shownPhase = phaseKey;
            reg.gigPeak = gigVal;
            reg.gigTrough = gigVal;
        }
        activeSectorBubble = null;
        sectorBubbleCooldown = 4;
        if (playerProfile) playerProfile.achievements = {};
        if (skills.indexAnalystLvl1) {
            skills.indexAnalystLvl1.unlockedLevel = Math.min(3, skills.indexAnalystLvl1.unlockedLevel || 0);
        }
        report.warnings.push('Cykl rynku, nastroje i osiągnięcia zaktualizowane do wersji 0.15 (migracja v15).');
    } else {
        if (typeof snapshot.knfLeverageCoolingQuarters === 'number') {
            knfLeverageCoolingQuarters = snapshot.knfLeverageCoolingQuarters;
        }
    }
    if (typeof updateAllSectorPremiums === 'function') updateAllSectorPremiums();
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
    ghostTrimSource = 'load'; // A3: przycięcia przy wczytaniu starego zapisu liczone osobno
    let reconciled;
    try { reconciled = reconcileSharesHeld(); } finally { ghostTrimSource = 'game'; } // audyt A1: akcje w obrocie = suma posiadaczy
    if (reconciled) report.warnings.push(`Uzgodniono akcje w obrocie w ${reconciled} spółkach (audyt A1).`);

    syncGameChartClock(); // 0.15.4 P2: zegar osi wykresów nie cofa się za zapisane punkty
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

/** Wczytuje zapis przy starcie gry: najnowszy poprawny z IndexedDB (current, previous) i localStorage. */
function restoreSavedGame() {
    if (typeof localStorage === 'undefined') return false;

    const legacy = LEGACY_SAVE_KEYS.find(key => localStorage.getItem(key));
    const candidates = preloadedSaveCandidates || collectSaveCandidates(null, localStorage.getItem(GAME_SAVE_KEY));

    if (!candidates.length) {
        if (legacy) {
            console.warn('[save] Znaleziono zapis ze starszej wersji gry (prywatny inwestor). Jest niezgodny z nowym konceptem zarządcy funduszu — rozpoczynam nową grę. Stary zapis pozostaje nietknięty.');
            logEvent('💾 Zapis ze starszej wersji gry jest niezgodny z nowym konceptem (zarządca funduszu) — rozpoczęto nową grę.', 'review');
        }
        return false;
    }

    const rejected = [];
    for (const candidate of candidates) {
        if (!candidate.snapshot) { rejected.push(`${candidate.source}: uszkodzony`); continue; }
        try {
            const report = applySaveSnapshot(candidate.snapshot);
            lastSaveReport = { ...report, source: candidate.source };
            if (!report.ok) { rejected.push(`${candidate.source}: ${report.errors.join(' ')}`); continue; }
            if (report.warnings.length > 0) console.warn('[save] Ostrzeżenia przy wczytywaniu:', report.warnings);
            restoredSaveSource = candidate.source;
            saveMigrationPending = candidate.legacy;
            isGamePaused = true; // po wczytaniu gra startuje zapauzowana
            if (rejected.length) logEvent(`💾 Najnowszy zapis był uszkodzony (${rejected.join('; ')}) — wczytano wcześniejszy.`, 'review');
            logEvent('💾 Wczytano zapis gry. Gra jest zapauzowana.', 'review');
            console.log(`[save] Stan gry wczytany (${candidate.source}).`);
            return true;
        } catch (error) {
            rejected.push(`${candidate.source}: ${String(error)}`);
        }
    }
    console.error('[save] Żaden zapis nie nadaje się do wczytania:', rejected);
    logEvent(`💾 Nie wczytano zapisu: ${rejected.join('; ')}`, 'review');
    return false;
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
    resetSavedGame().finally(() => location.reload());
}

/** Usuwa zapis ze wszystkich miejsc (IndexedDB current i previous, kopia w localStorage); blokuje zapis do przeładowania. */
async function resetSavedGame(key = GAME_SAVE_KEY) {
    saveDisabledUntilReload = true; // zapis przy zamknięciu strony nie odtworzy usuniętego stanu
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    try { if (typeof saveStore === 'object' && saveStore.backend === 'indexeddb') await saveStore.clear(); } catch (error) { console.warn('[save] Czyszczenie IndexedDB nieudane:', error); }
    console.log('[save] Zapis usunięty. Odśwież stronę, aby rozpocząć nową grę.');
}


// =================================================================================
// 0.14.3 Z4: EKSPORT I IMPORT ZAPISU (plik .json)
// =================================================================================

function getSaveGameDateLabel(snapshot) {
    const q = Math.max(0, Number(snapshot?.macro?.quarter) || 0);
    return `rok${Math.floor(q / 4) + 1}-kw${(q % 4) + 1}`;
}

function getSaveFileName(snapshot) {
    const fund = String(snapshot?.playerProfile?.fundName || 'fundusz').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L')
        .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'fundusz';
    return `gra-inwestycyjna_${fund}_${getSaveGameDateLabel(snapshot)}.json`;
}

/** Szybka walidacja bez zmiany stanu gry (wersja, spółki, fundusz) — przed potwierdzeniem importu. */
function validateSaveSnapshot(snapshot) {
    const errors = [];
    if (!snapshot || typeof snapshot !== 'object') return ['To nie jest zapis gry.'];
    if (!SUPPORTED_SAVE_VERSIONS.includes(snapshot.version)) errors.push(`Niezgodna wersja zapisu (${snapshot.version ?? 'brak'}). Obsługiwane: ${SUPPORTED_SAVE_VERSIONS.join(', ')}.`);
    if (!Array.isArray(snapshot.stocks) || snapshot.stocks.length === 0) errors.push('Zapis nie zawiera spółek.');
    else if (snapshot.stocks.some(company => !company || typeof company.symbol !== 'string')) errors.push('Zapis zawiera spółki bez symbolu.');
    if (!snapshot.macro || typeof snapshot.macro !== 'object') errors.push('Zapis nie zawiera stanu gospodarki.');
    return errors;
}

/** „💾 Eksportuj zapis”: czytelny JSON (bez kompresji) do pobrania. */
function exportSaveFile() {
    if (typeof document === 'undefined') return null;
    const snapshot = buildSaveSnapshot({ compact: 0 });
    const blob = new Blob([JSON.stringify(snapshot, null, 1)], { type: 'application/json' });
    const name = getSaveFileName(snapshot);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (typeof showToast === 'function') showToast(`Zapis wyeksportowany: ${name} (${(blob.size / 1e6).toFixed(1)} MB).`, 'success');
    return name;
}

/**
 * Import z tekstu pliku (JSON albo rekord lz16): walidacja → potwierdzenie → zapis jako bieżący → przeładowanie.
 * Uszkodzony albo obcy plik niczego nie nadpisuje. options: { confirmFn, reload, key } (testy: bez przeładowania, klucz testowy).
 */
async function importSaveText(text, options = {}) {
    const { confirmFn = typeof confirm === 'function' ? confirm : () => false, reload = true, key = GAME_SAVE_KEY } = options;
    const snapshot = decodeSaveRecord(text);
    const errors = snapshot ? validateSaveSnapshot(snapshot) : ['Plik nie jest zapisem gry (uszkodzony albo obcy format).'];
    if (errors.length) {
        if (typeof showToast === 'function') showToast(`Nie wczytano pliku: ${errors.join(' ')}`, 'error', 8000);
        return { ok: false, errors };
    }
    const label = `${snapshot.playerProfile?.fundName || 'fundusz'}, ${getSaveGameDateLabel(snapshot)}`;
    if (!confirmFn(`Zastąpić bieżącą grę zapisem z pliku (${label})? Obecny stan zostanie zastąpiony — zrób wcześniej eksport, jeśli chcesz go zachować.`)) return { ok: false, cancelled: true };
    snapshot.savedAt = Date.now(); // najnowszy — przy wczytaniu wygrywa z poprzednim zapisem (który zostaje jako „previous”)
    try {
        if (getSaveBackend() === 'indexeddb') {
            const record = canGzipSave() ? await encodeSaveRecordGz(snapshot, 0) : encodeSaveRecord(snapshot, 0);
            const result = await saveStore.write(record);
            if (!result.ok) throw new Error(result.error);
            try { writeLocalRecord(key, encodeSaveRecord(snapshot, 0)); } catch (error) { localStorage.removeItem(key); } // kopia awaryjna nie może być starsza od importu
        } else {
            writeLocalRecord(key, encodeSaveRecord(snapshot, 0));
        }
    } catch (error) {
        if (typeof showToast === 'function') showToast(`Nie udało się zapisać importu: ${error.message || error}`, 'error', 8000);
        return { ok: false, errors: [String(error)] };
    }
    saveDisabledUntilReload = true; // bieżąca gra nie nadpisze importu przy zamknięciu strony
    if (reload && typeof location !== 'undefined') location.reload();
    return { ok: true, label };
}

/** „📂 Wczytaj z pliku”: plik wybrany przez gracza. */
function importSaveFile(input) {
    const file = input?.files?.[0];
    if (!file) return;
    file.text().then(text => importSaveText(text)).finally(() => { input.value = ''; });
}

// =================================================================================
// 0.14.3 Z5: PANEL ZAPISU (Ustawienia)
// =================================================================================

const SAVE_LEVEL_LABELS = ['zwykły', 'kompaktowy', 'awaryjny'];

function formatSaveBytes(value) {
    if (!(value > 0)) return '—';
    return value >= 1e6 ? `${(value / 1e6).toLocaleString('pl-PL', { maximumFractionDigits: 2 })} MB` : `${Math.round(value / 1e3).toLocaleString('pl-PL')} KB`;
}

function renderSavePanel() {
    const box = typeof document !== 'undefined' ? document.getElementById('save-panel') : null;
    if (!box) return;
    const backend = getSaveBackend();
    const report = lastSaveReport && lastSaveReport.at ? lastSaveReport : null;
    const where = backend === 'indexeddb' ? 'IndexedDB (pamięć bez limitu 5 MB)' : backend === 'localStorage' ? 'pamięć podstawowa (localStorage, do ok. 2,4 mln znaków)' : 'brak — gra się nie zapisuje';
    const packed = report ? (report.format === 'gz' ? formatSaveBytes(report.compressed) : `${formatSaveBytes(report.compressed * 2)} (lz16)`) : '—';
    const persisted = saveStore.persisted === true ? 'trwały' : saveStore.persisted === false ? 'może zostać wyczyszczony przez przeglądarkę' : 'nieznany';
    box.innerHTML = `
        <h4 class="mt-0">💾 Zapis gry</h4>
        <p class="text-sm m-0">Gdzie: <strong>${where}</strong>${saveStore.detectError ? ` <span class="text-muted">(${escapeHtml(saveStore.detectError)})</span>` : ''}</p>
        <p class="text-sm m-0">Rozmiar: ${report ? `${formatSaveBytes(report.size)} przed kompresją → <strong>${packed}</strong>` : 'jeszcze nie zapisano w tej sesji'}</p>
        <p class="text-sm m-0">Ostatni zapis: ${report ? new Date(report.at).toLocaleTimeString('pl-PL') : '—'} · poziom: ${report ? SAVE_LEVEL_LABELS[report.compact] || '—' : '—'} · ${persisted}</p>
        <p class="text-sm m-0" id="save-estimate">Przydział przeglądarki: …</p>
        <div class="d-flex gap-2 flex-wrap mt-2 justify-center">
            <button class="btn-secondary" onclick="saveGame(); setTimeout(renderSavePanel, 500)">Zapisz teraz</button>
            <button class="btn-secondary" onclick="exportSaveFile()">💾 Eksportuj zapis</button>
            <label class="btn-secondary">📂 Wczytaj z pliku<input type="file" accept=".json,application/json" hidden onchange="importSaveFile(this)"></label>
        </div>
        <p class="text-xs text-muted">Eksport to czytelny plik JSON — kopia zapasowa albo przeniesienie gry na inny komputer.</p>`;
    saveStore.estimate().then(estimate => {
        const el = document.getElementById('save-estimate');
        if (el) el.textContent = estimate ? `Przydział przeglądarki: zajęte ${formatSaveBytes(estimate.usage)} z ${formatSaveBytes(estimate.quota)}.` : 'Przydział przeglądarki: brak danych.';
    });
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
let debugStockTick = null; // T0: krok logiki gry dla testów symulacyjnych (bez odświeżania interfejsu)
let uiRefreshTick = 0;
let researchInstituteTick = 0; // instytuty badawcze: co 10 tików gry

// Zapis i wczytanie gry: save.js

// Podstawowe opóźnienia w milisekundach


/**
 * Zatrzymuje wszystkie aktywne pętle gry. Niezbędne przy zmianie prędkości.
 */
function clearIntervals() {
    for (const key in gameTimers) {
        if (gameTimers[key]) {
            if (typeof gameTimers[key] !== 'object') clearInterval(gameTimers[key]); // obiekty = pętle zegara gry
            gameTimers[key] = null;
        }
    }
    if (typeof gameScheduler !== 'undefined') { // pętle zegara gry (T0): zapamiętujemy fazę na wypadek zmiany prędkości
        gameScheduler.jobs.forEach((job, index) => { gameScheduler.phase[index] = { periodMs: job.periodMs, nextAt: job.nextAt }; });
        gameScheduler.jobs = [];
    }
    console.log("Wszystkie pętle gry zostały zatrzymane.");
}

// T0 (plan 0.14): prędkości testowe ×100 i ×200 (przyciski debug). Nie trafiają do zapisu — wczytana gra
// wraca do prędkości z listy SAVED_SPEEDS (applySaveSnapshot).
const TEST_SPEEDS = [100, 200];
const SAVED_SPEEDS = [1, 2, 5];
const MAX_AUTOSAVE_SPEED = 50;
const MIN_TICK_INTERVAL_MS = 10;
const MAX_TICK_CATCHUP = 30; // najwięcej kroków logiki w jednym wywołaniu pętli (bez „spirali” przy zawieszeniu karty)

/** Ile tików rynku wykonać w jednym wywołaniu, żeby interwał nie spadł poniżej MIN_TICK_INTERVAL_MS. */
function getTickStepsPerCall(speedMultiplier) {
    return Math.max(1, Math.ceil(MIN_TICK_INTERVAL_MS * speedMultiplier / BASE_DELAYS.stockUpdate)); // ×50: 1, ×100: 1 (10 ms), ×200: 2
}

/**
 * T0: zegar gry. Wszystkie pętle gry (tydzień, kwartał, zdarzenia, obligacje…) są wyzwalane przez tiki rynku
 * (1 tik = 1 s gry), a nie przez osobne timery przeglądarki. Kwartał to zawsze 300 tików, tydzień 60 — przy każdej
 * prędkości ta sama kolejność zdarzeń. Gdy komputer nie nadąża (×200, kilka kart), gra biegnie wolniej, ale spójnie.
 */
const gameScheduler = { clockMs: 0, jobs: [], phase: {} };

/** Rejestruje pętlę gry: realDelay = okres gry / prędkość (jak dawne setInterval), zwraca identyfikator. */
function setGameInterval(fn, realDelay) {
    const periodMs = Math.max(1, Math.round(realDelay * (currentSpeedMultiplier || 1)));
    const index = gameScheduler.jobs.length;
    const saved = gameScheduler.phase[index]; // zmiana prędkości nie zeruje postępu tygodnia ani kwartału
    const nextAt = saved && saved.periodMs === periodMs ? saved.nextAt : gameScheduler.clockMs + periodMs;
    const job = { fn, periodMs, nextAt, id: `job${index}_${periodMs}` };
    gameScheduler.jobs.push(job);
    return job;
}

/** Wołane po logice każdego tiku: przesuwa zegar gry i uruchamia pętle, którym minął okres. */
function runGameScheduler(deltaMs) {
    gameScheduler.clockMs += deltaMs;
    for (const job of gameScheduler.jobs) {
        while (gameScheduler.clockMs >= job.nextAt) {
            job.nextAt += job.periodMs;
            job.fn();
        }
    }
}

/** Pomiar rzeczywistej prędkości: kwartały gry na minutę czasu rzeczywistego (ostatnie kwartały). */
const gameSpeedStats = { quarterTimes: [] };
function noteQuarterForSpeedStats() {
    gameSpeedStats.quarterTimes.push(performance.now());
    if (gameSpeedStats.quarterTimes.length > 6) gameSpeedStats.quarterTimes.shift();
}

function getMeasuredGameSpeed() {
    const times = gameSpeedStats.quarterTimes;
    if (times.length < 2) return null;
    const msPerQuarter = (times[times.length - 1] - times[0]) / (times.length - 1);
    return { quartersPerMinute: 60000 / msPerQuarter, effectiveMultiplier: BASE_DELAYS.quarterly / msPerQuarter };
}

/** Jeden krok logiki giełdy (skipUi: bez odświeżania interfejsu). */
function runStockTick(skipUi, speedMultiplier, tickSteps) {

        if (!skipUi) document.querySelectorAll('#stock-table-body tr').forEach(row => {
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


        researchInstituteTick = (researchInstituteTick + 1) % 10;
        if (researchInstituteTick === 0) { // co 10 tików gry (wcześniej Date.now() % 10 — zależne od zegara, w przebiegach testowych co tik)
            updateResearchInstitutes(); // 0.14.2 P1: mechanika „sąsiadów w tablicy” usunięta
        }

        // --- AKTUALIZACJA LOGIKI GRY ---
        const gameTimeDelta = BASE_DELAYS.stockUpdate; // Każdy tick to zawsze 1 sekunda CZASU GRY
        cleanupBankruptStocks(currentSpeedMultiplier);
        updateStockPrices();
        updateMarketIndexes(); // GIG/SIG20/SIG40/BSIG80 — benchmark funduszu (wcześniej nigdy nie był liczony)
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
        if (currentTBillAuction && getAuctionNow() > currentTBillAuction.endTime) {
            resolveTBillAuction(); // Rozstrzygnij aukcję
        }
        if (currentCollateralAuction && getAuctionNow() > currentCollateralAuction.endTime) {
            resolveCollateralAuction(); // wcześniej nikt jej nie rozstrzygał — aukcja wisiała w nieskończoność
        }
        processCeoActions(gameTimeDelta);
        runAllAi(); // Zawiera AI banków z bazy main.js
        checkPriceAlerts();
        checkResearchChoiceTimers(gameTimeDelta);
        updateResearchAutoRetry(gameTimeDelta);
        updateResearchProgress(gameTimeDelta);
        processConstructionProjects(gameTimeDelta);
        updateTenderSystem(gameTimeDelta); // zawiera też oferty AI
        if (!skipUi) updateConstructionSectorUI(); // T0: UI raz na wywołanie pętli

        // Przy prędkościach debug (×10, ×50) odświeżamy interfejs rzadziej — logika gry liczy się co tik.
        runGameScheduler(gameTimeDelta); // T0: tydzień, kwartał, zdarzenia — według zegara gry
        if (skipUi) return; // T0: dodatkowe kroki logiki w jednym wywołaniu — interfejs raz na wywołanie
        uiRefreshTick++;
        if (speedMultiplier >= 10 && uiRefreshTick % Math.max(1, Math.round(speedMultiplier / (5 * tickSteps))) !== 0) return;

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
            const stockToUpdate = typeof getCompanyCardSource === 'function' ? getCompanyCardSource(currentlyDisplayedChartSymbol) : stocks.find(s => s.symbol === currentlyDisplayedChartSymbol);
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

}

/** Pętla tygodniowa gry. */
function runWeeklyTick() {
        if (isGamePaused) return;

        // ===>>> NOWE WYWOŁANIE SKANERA WINDYKATORA <<<===
        if (typeof runDebtCollectorAI === 'function') {
            runDebtCollectorAI(); //
        }
        // ===>>> NOWE WYWOŁANIE SKANERA LOMBARDU <<<===
        if (typeof runPawnShopAI === 'function') {
            runPawnShopAI(); //
        }
        if (typeof processPawnClientsWeekly === 'function') processPawnClientsWeekly(); // 0.15.4 P7: klienci indywidualni lombardu
        if (typeof processConsumerLoansWeekly === 'function') processConsumerLoansWeekly(); // 0.15.4 P7: pożyczki konsumenckie Wrony

        if (typeof runCorporateLogic === 'function') {
        runCorporateLogic(); // Obsługa działów i inwestycji
    }

        processCompanyBanking(); //
        processBankStartupSponsorship(); //


        if (typeof recordWeeklyCloses === 'function') recordWeeklyCloses(); // U2: zmiana tygodniowa w tabeli spółek
        if (typeof updateMarketIndexWeights === 'function') updateMarketIndexWeights(); // 0.15 H1a: przeliczenie wag kapitalizacji indeksów
        if (typeof updateMarketSentimentWeekly === 'function') updateMarketSentimentWeekly(); // 0.15 H2a: wskaźnik Strachu i Chciwości
        // 0.15 H4: Postęp krachu rynkowego i reset punktu odniesienia bezpiecznika giełdowego
        if (typeof processMarketCrashWeekly === 'function') processMarketCrashWeekly();
        if (typeof processCrisesWeekly === 'function') processCrisesWeekly(); // 0.15.3: płynna zmiana premii szoków sektorowych
        if (typeof resetMarketHaltWeekly === 'function') resetMarketHaltWeekly(marketIndexes.find(idx => idx.id === 'GIG')?.value);
        if (typeof checkAcademyTriggers === 'function') checkAcademyTriggers(); // N1: hasła Akademii przy pierwszym kontakcie
        if (typeof checkMentorTasks === 'function') checkMentorTasks();
        if (typeof checkAchievements === 'function') checkAchievements(); // N4: zadania mentora i certyfikaty

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

}

/** Pętla kwartalna gry. */
function runQuarterlyTick() {
        if (isGamePaused) return;
        noteQuarterForSpeedStats();
        reviewCompanyPlacements();
        ensureAllStockSegments(); // 0.14 T1a: nowe i zmienione spółki — sektory z rejestru, segmenty
        processEliteExchangesQuarterly(); // Rubin / Szmaragd / Diament, spółki zależne (finance.js)
        payBondCoupons(); // kupony kwartalne (finance.js)
        processPublicInvestmentFunding(); // BC → spółki państwowe, miasto → spółki miejskie (investments.js)
        processGovernanceQuarter(); // walne zgromadzenia (governance.js)
        if (typeof processBuyoutOffersQuarterly === 'function') processBuyoutOffersQuarterly(); // 0.15.1 M2: oferty kupna dla większościowców
        if (typeof processTenderOversightQuarterly === 'function') processTenderOversightQuarterly(); // 0.15.1 M5: KNF i próg wezwania
        if (typeof processGoodwillImpairmentQuarterly === 'function') processGoodwillImpairmentQuarterly(); // 0.15.1 M6: test utraty wartości
        if (typeof processStakeCampaignsQuarterly === 'function') processStakeCampaignsQuarterly(); // 0.15.1 M9: pakiety spółka → spółka
        processEtfsQuarterly(); // rebalancing, cele roczne, nowe i zamykane ETF-y (etf.js)
        processRelationsQuarterly(); // relacje z botami: wrogowie i przyjaciele (relations.js)
        processMarketsQuarterly(); // operatorzy rynków i maklerzy (markets.js)
        sendPoolQuarterReport(); // 0.14.1 R1: zbiorczy raport rozliczeń puli (tylko gdy były)
        maybeInstituteCompetitionEvent(); // 0.14.2 P1: rzadka konkurencja instytutów (bez dymku)
        expireRescueOffers(); // 0.14.2 P2: oferty emisji ratunkowej bez decyzji wygasają
        processStrategyQuarterly(); // 0.14 T3: rozszerzenia, podsektory, nisze, pivoty (strategy.js)
        processSpinoffsQuarterly(); // 0.14 T4: plotki, zapowiedzi i wydzielenia spółek córek
        processCooperationsQuarterly(); // 0.14 T5: koncerny, kooperacje, skargi do KNF
        processSubsidiariesQuarterly(); // 0.14 T6: spółki zależne (pożyczki, usamodzielnienie, wchłonięcie, sprzedaż pakietu)
        processSubsectorMechanicsQuarterly(); // 0.14 T2: badania kliniczne, bloki jądrowe, kontrole KNF (subsectors.js)
        processSpecialProjectsQuarterly(); // konsorcja i projekty specjalne (projects.js)
        if (typeof processSubcontractorsQuarterly === 'function') processSubcontractorsQuarterly(); // 0.15.5 B2–B3: podwykonawcy (subcontractors.js)
        if (typeof processReitsQuarterly === 'function') processReitsQuarterly(); // 0.15.5 B5: dźwignia REIT-ów, rezerwa gotówki, zlecenia budowy (reits.js)
        if (typeof processBankRiskQuarterly === 'function') processBankRiskQuarterly(); // 0.15.5 B4: ekspozycje banków, odpisy w kryzysie bankowym (finance.js)
        if (typeof processSplitsQuarterly === 'function') processSplitsQuarterly(); // 0.15.4 P4: split i konsolidacja akcji (splits.js)
        reconcileSharesHeld(); // audyt A1: akcje w obrocie = suma posiadaczy
        processOversightQuarterly(); // korupcja, policja, KNF (oversight.js)
        processMafiaQuarterly(); // mafia, Bruno Gato, porachunki (mafia.js)
        processScandalsQuarterly(); // parabanki i wojny PR (scandals.js)
        processDefenseQuarterly(); // zbrojeniówka i fundusz Gwardia (defense.js)
        if (typeof processAccountingQuarterly === 'function') processAccountingQuarterly(); // N3: kreatywna księgowość, audyty (accounting.js)
        if (typeof advanceMarketRegimeQuarterly === 'function') advanceMarketRegimeQuarterly(); // 0.15 H2a: fazy rynku
        if (typeof advanceSectorBubblesQuarterly === 'function') advanceSectorBubblesQuarterly(); // 0.15 H3: bańki sektorowe
        if (typeof processCrisesQuarterly === 'function') processCrisesQuarterly(); // 0.15.3: etapy linii kryzysu, nowa linia, scenariusz startowy
        if (typeof checkMarketCrashQuarterly === 'function') checkMarketCrashQuarterly(); // 0.15 H4: sprawdzanie warunków krachu rynkowego
        advanceEconomyCycle(); // nowa faza koniunktury przed raportami
        advanceMacroQuarter(); // inflacja, bezrobocie, cykle sektorów, wybory (macro.js)
        processCityQuarterly(); // festyn raz w roku (city.js)
        applyCrowdingPressureToWeak(); // D2: nasycony rynek — słabe spółki tanieją szybciej
        if (typeof processIndexLaunchQuarterly === 'function') processIndexLaunchQuarterly(); // 0.16.1: Bank Centralny uruchamia SIG40 i BSIG80
        if (typeof processGiantEventQuarterly === 'function') processGiantEventQuarterly(); // 0.16.1 G3: „Gigant wkracza na scenę” (gdr.js)
        if (typeof processCountriesQuarterly === 'function') processCountriesQuarterly(); // 0.16.2 G5: rynki zagraniczne, bilety, boty (countries.js)
        if (typeof processListingsQuarterly === 'function') processListingsQuarterly(); // 0.15.6: wymogi utrzymania, rynki NH i prywatny (listings.js)
        if (typeof enforceListingLimitQuarterly === 'function') enforceListingLimitQuarterly(); // 0.15.4 P5: powyżej 115 spółek krajowych wymuszone wycofanie najsłabszych
        processAwaitingListings(); // P1: startupy czekające na wolne miejsce na giełdzie
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

}

/** Pętla roczna gry. */
function runYearlyTick() {
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
    gameTimers.mortgageCheck = setGameInterval(() => {
        if (isGamePaused) return;
        checkMortgageDefaults();
    }, BASE_DELAYS.weekly / speedMultiplier); // Sprawdzaj co tydzień

    gameTimers.autoSave = setInterval(() => {
        if (typeof saveGameState === 'function') {
            saveGameState();
        }
    }, 60000 / Math.min(speedMultiplier, MAX_AUTOSAVE_SPEED)); // T0: przy ×100/×200 autozapis nie częściej niż przy ×50

    // Pętla sprawdzania zapadalności bonów skarbowych
    gameTimers.tBillMaturityCheck = setGameInterval(() => {
        if (isGamePaused) return;
        checkTBillMaturities();
    }, 5000 / speedMultiplier);

    // Główna pętla gry (aktualizacje co sekundę czasu gry). T0: przy prędkościach testowych (> ×50) kilka tików
    // w jednym wywołaniu zamiast interwału krótszego niż ~10 ms (przeglądarka nie nadążyłaby z timerami).
    const tickSteps = getTickStepsPerCall(speedMultiplier);
    const stockTick = (skipUi = false) => runStockTick(skipUi, speedMultiplier, tickSteps);
    // T0: doganianie czasu — tyle kroków logiki, ile sekund gry upłynęło od ostatniego wywołania (najwyżej
    // MAX_TICK_CATCHUP), żeby kwartał zawsze miał ~300 tików także przy ×50/×100/×200, gdy przeglądarka nie nadąża.
    debugStockTick = stockTick; // testy symulacyjne: tiki logiki bez timerów przeglądarki
    let lastTickAt = performance.now();
    let tickBacklog = 0;
    gameTimers.stockUpdate = setInterval(() => {
        const now = performance.now();
        tickBacklog += (now - lastTickAt) * speedMultiplier / BASE_DELAYS.stockUpdate;
        lastTickAt = now;
        const steps = Math.max(1, Math.min(MAX_TICK_CATCHUP, Math.floor(tickBacklog)));
        tickBacklog = Math.max(0, Math.min(tickBacklog - steps, MAX_TICK_CATCHUP));
        if (isGamePaused) { tickBacklog = 0; stockTick(); return; }
        for (let step = 0; step < steps; step++) stockTick(step < steps - 1);
    }, BASE_DELAYS.stockUpdate * tickSteps / speedMultiplier);

    // Pętla tygodniowa (z bazy main.js - bankowość komercyjna)
    gameTimers.weekly = setGameInterval(runWeeklyTick, BASE_DELAYS.weekly / speedMultiplier);

    // Pętla kwartalna (z bazy main.js - zawiera AI Banku Centralnego)
    gameTimers.quarterly = setGameInterval(runQuarterlyTick, BASE_DELAYS.quarterly / speedMultiplier);

    // Pętla reputacji (powolny powrót do zera)
    gameTimers.reputationDecay = setGameInterval(() => {
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
    gameTimers.event = setGameInterval(() => {
        if (isGamePaused) return;
        triggerMainMarketEventCycle();
    }, BASE_DELAYS.event / speedMultiplier);

    // Pętle dla obligacji (z bazy main.js)
    gameTimers.stateBondIssuance = setGameInterval(() => {
        if (isGamePaused) return;
        issueStateBonds();
    }, 15 * 60 * 1000 / speedMultiplier); // 15 minut

    gameTimers.otherBondIssuance = setGameInterval(() => {
        if (isGamePaused) return;
        issueNewBondOffer();
    }, 40 * 1000 / speedMultiplier); // Co 40 sekund

    gameTimers.bondMaturityCheck = setGameInterval(() => {
        if (isGamePaused) return;
        checkBondMaturities(5000); // 5 s czasu gry
    }, 5000 / speedMultiplier); // Co 5 sekund

    // Pętle dla zdarzeń CEO, półrocznych i rocznych
    gameTimers.ceoEvent = setGameInterval(() => {
        if (isGamePaused) return;
        triggerCeoEvent();
    }, BASE_DELAYS.quarterly * 2 / speedMultiplier); // Co 2 kwartały

    gameTimers.semiAnnual = setGameInterval(() => {
        if (isGamePaused) return;
        triggerSemiAnnualEvents();
    }, BASE_DELAYS.quarterly * 2 / speedMultiplier); // Co pół roku

    gameTimers.yearly = setGameInterval(runYearlyTick, BASE_DELAYS.quarterly * 4 / speedMultiplier); // Co rok
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
        pauseButton.textContent = 'Wznów';
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
        // 0.16.10 S0: osobny ekran wyboru kraju (globus albo lista), potem scenka: SMS od babci + profil gracza (gra stoi na pauzie)
        if (typeof showCountryGlobe === 'function' && !(isDebugMode() && isIntroSkipEnabled())) showCountryGlobe(id => { setStartCountry(id); showIntroScene(); });
        else showIntroScene();
    }

    // Uruchomienie pętli gry — jedyne miejsce tworzenia timerów (setGameSpeed czyści poprzednie
    // — nie tworzymy ich nigdzie indziej).
    setGameSpeed(restoredFromSave ? currentSpeedMultiplier : 1);
    if (typeof localStorage !== 'undefined') {
        // 0.14.3 Z3: IndexedDB jest asynchroniczne — zapis także przy ukryciu karty, a przy zamknięciu synchroniczna kopia awaryjna.
        window.addEventListener('beforeunload', saveEmergencyCopy);
        window.addEventListener('pagehide', saveEmergencyCopy);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveGameState(); });
    }
}

/** Tworzy nowy świat gry (banki, spółki budowlane, startupy, bilanse, R&D...). */
function createNewWorld() {
    // Inicjalizacja banków komercyjnych (ta funkcja teraz ustawia isActive dla banków startowych)
    initializeCommercialBanks(); // Tworzy banki, może ustawić isActiveFromStart
    generateCentralBankGovernor();
    initializeConstructionCompanies();
    initializeAllConstructionStats(); // Inicjalizuje maxProjects i currentProjects dla spółek budowlanych
    ensureSubcontractorRegistry(); // 0.15.5 B2: rejestr podwykonawców (12 specjalności, min. 3 w każdej)
    
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
    if (typeof initMarketRegimes === 'function') initMarketRegimes();
    if (typeof createMarketCrashState === 'function') marketCrash = createMarketCrashState();
    if (typeof createMarketHaltState === 'function') marketHalt = createMarketHaltState();
    if (typeof resetCrises === 'function') resetCrises(); // 0.15.3
    if (typeof randomizeStartingGiants === 'function') randomizeStartingGiants(); // 0.15.4 P6: losowa kolejność wielkości gigantów na starcie
    ensureAllReitModels(); // 0.15.5 B5: portfele nieruchomości REIT-ów po utworzeniu bilansów (nowa gra: dźwignia startowa 35%)
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
    marketStabilityProject = createMarketStabilityProject();
    ensureAllStockSegments(); // 0.14 T1a: sektory z rejestru i segmenty (przed ETF-ami i zatrudnieniem)
    applyStartSubsectors(); // 0.14 T2: podsektory spółek startowych (tabela)
    startPoolLedgerFromFacts(); // 0.14.1 R0: księga puli inwestycyjnej od startu gry
    migrateResearchInstituteValuation(); // 0.14.2 P1: instytuty wyceniane z zysków od startu
    usedCompanyNames = stocks.map(stock => stock.name); dejwCorpUsed = stocks.some(stock => /^DejwCorp/.test(stock.name)); // 0.14.2 P4
    spinoffLog = []; // 0.14 T4
    cooperations = []; cooperationLog = []; // 0.14 T5
    investmentPool.stakesMigrated = true;
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


        // 0.14.3: najpierw odczyt zapisów z IndexedDB (asynchronicznie); przebiegi testowe startują od razu (bez zapisu).
        if (window.__SIM_NO_SAVE__ || typeof preloadSavedGames !== 'function') initializeGame();
        else preloadSavedGames().catch(error => console.warn('[save] Wstępny odczyt zapisów nieudany:', error)).finally(() => {
            try { initializeGame(); } catch (e) { console.error('[loader] Błąd podczas wywoływania initializeGame():', e); alert('Wystąpił krytyczny błąd podczas inicjalizacji gry. Sprawdź konsolę deweloperską (F12).'); }
        });

    } catch (e) {
        console.error('[loader] Błąd podczas wywoływania initializeGame():', e);
        alert("Wystąpił krytyczny błąd podczas inicjalizacji gry. Sprawdź konsolę deweloperską (F12).");
    }
});

// Funkcja uruchamiająca AI (z bazy main.js - zawiera AI banków inwestycyjnych)
function runAllAi() {
    aiCompetitors.forEach(ai => {
        if (ai.isMafia || ai.isGuard || ai.isForeignBot) return; // Bruno Gato (mafia.js), Gwardia (defense.js) i boty zagraniczne (countries.js) mają własną logikę
        if (ai.customLogic) { if (Math.random() < 0.15) { runCustomBot(ai); checkAiTierUpgrade(ai); } return; } // 0.16.3 G14b: Graham i Wilk (bots_domestic.js)
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
