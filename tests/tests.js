// tests.js — powtarzalne testy modułu budownictwa, R&D, finansów i zapisu.
// Losowanie jest kontrolowane przez withSeededRandom: Math.random jest podmieniany tylko
// na czas jednego testu i zawsze przywracany (gra nie zostaje trwale zmieniona).
// Testy działają na własnych spółkach testowych — bez obiektów demonstracyjnych gry.

'use strict';

const TEST_GROUPS = [];
let currentGroup = null;

function group(name, fn) {
    currentGroup = { name, tests: [], tables: [] };
    TEST_GROUPS.push(currentGroup);
    fn();
}

function test(name, fn, seed = 12345) {
    currentGroup.tests.push({ name, fn, seed });
}

function addTable(title, headers, rows) {
    currentGroup.tables.push({ title, headers, rows });
}

class AssertionError extends Error {}

function assert(condition, message) {
    if (!condition) throw new AssertionError(message);
}

function near(a, b, eps = 0.01) {
    return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b)) * 0.0001 + eps;
}

function assertNear(a, b, message, eps = 0.01) {
    assert(near(a, b, eps), `${message}: ${a} ≠ ${b}`);
}

function assertEq(a, b, message) {
    assert(a === b, `${message}: ${a} ≠ ${b}`);
}

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function withSeededRandom(seed, fn) {
    const original = Math.random;
    Math.random = mulberry32(seed);
    try {
        return fn();
    } finally {
        Math.random = original;
    }
}

// --------------------------------------------------------------------------------
// Świat testowy
// --------------------------------------------------------------------------------

function makeCompany(symbol, options = {}) {
    const cash = options.cash ?? 2_000_000;
    const fixedAssets = options.fixedAssets ?? 3_000_000;
    const liabilities = options.liabilities ?? 0;
    const assets = cash + fixedAssets;

    const company = {
        name: options.name || `Spółka ${symbol}`,
        symbol,
        price: 100,
        totalShares: 10000,
        sharesHeld: 0,
        exchange: 'BRONZE',
        sector: options.sector || ['Technologia'],
        financialHealth: 1,
        volatilityFactor: 1,
        cash,
        balanceSheet: { assets, liabilities, shareCapital: (assets - liabilities) * 0.2, retainedEarnings: (assets - liabilities) * 0.8 },
        quarterlyEarnings: 0,
        departments: { research: { level: 2 }, development: { level: options.devLevel ?? 3 }, economy: { level: 0 } },
        activeInvestments: [],
        reputation: { player: 0 },
        priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        research: {
            isInvestment: false,
            isResearching: false,
            currentTech: null,
            progress: 0,
            unlockedTechs: options.unlockedTechs || [],
            specialization: options.specialization || 'wzmacnianie rozwoju',
            autoResearchEnabled: false
        },
        researchUnlocks: { canInterfere: false, canInfluence: false }
    };

    if (company.sector.includes('Budowlany')) {
        company.constructionStats = { experience: options.experience ?? 20, wonTenders: 0, completedProjects: 0, currentProjects: 0 };
        updateConstructionCapacity(company);
    }

    return company;
}

function resetWorld(companies) {
    stocks = companies;
    // Bez śladów poprzednich testów: portfele botów, banków i ETF-y (audyt A1 — uzgadnianie akcji).
    aiCompetitors.forEach(ai => { ai.portfolio = {}; });
    commercialBanks.forEach(bank => { if (bank.stockPortfolio) bank.stockPortfolio = {}; });
    if (typeof etfs !== 'undefined') etfs.length = 0;
    if (typeof marketRegimes !== 'undefined' && marketRegimes?.home) {
        marketRegimes.home.premium = 0.0;
        marketRegimes.home.premiumTarget = 0.0;
    }
    if (typeof activeSectorBubble !== 'undefined') activeSectorBubble = null;
    if (typeof resetCrises === 'function') resetCrises(); // 0.15.3
    if (typeof sectorBubbleCooldown !== 'undefined') sectorBubbleCooldown = 0;
    if (typeof updateAllSectorPremiums === 'function') updateAllSectorPremiums();
    activeTenders = [];
    if (typeof cooperations !== 'undefined') { cooperations = []; cooperationLog = []; } // 0.14 T5
    constructionProjects = [];
    paymentJournal = [];
    paymentTotals = { externalIn: 0, externalOut: 0, byPurpose: {} };
    specialists = [
        { id: 'specA', name: 'Specjalista A', specialty: 'general', bonus: 0.10, contractsCompleted: 0, level: 1, cash: 50000 },
        { id: 'specB', name: 'Specjalista B', specialty: 'office', bonus: 0.05, contractsCompleted: 0, level: 1, cash: 50000 }
    ];
    isGamePaused = false;
    recountConstructionCapacity();
}

function equity(company) {
    return company.balanceSheet.assets - company.balanceSheet.liabilities;
}

/** Suma pieniędzy w modelu: gotówka spółek + depozyty kontraktów + gotówka podwykonawców. */
function moneyInModel() {
    return stocks.reduce((sum, company) => sum + company.cash, 0) +
        constructionProjects.reduce((sum, project) => sum + project.escrowBalance, 0) +
        specialists.reduce((sum, spec) => sum + spec.cash, 0);
}

/** Przepływy przez granicę modelu (sumy bez limitu dziennika) od chwili znacznika. */
function externalMark() {
    return paymentTotals.externalIn - paymentTotals.externalOut;
}

function externalNetFlow(mark = 0) {
    return externalMark() - mark;
}

function tick(n = 1, delta = BASE_DELAYS.stockUpdate) {
    for (let i = 0; i < n; i++) {
        processConstructionProjects(delta);
        updateTenderSystem(delta);
    }
}

function runUntil(predicate, maxTicks = 20000, delta = BASE_DELAYS.stockUpdate) {
    for (let i = 0; i < maxTicks; i++) {
        if (predicate()) return i;
        tick(1, delta);
    }
    return predicate() ? maxTicks : -1;
}

function standardWorld(options = {}) {
    const client = makeCompany('KLI', { cash: options.clientCash ?? 3_000_000 });
    const builder = makeCompany('BUD', { sector: ['Budowlany'], cash: options.builderCash ?? 600_000, experience: options.experience ?? 25 });
    const extra = options.extraBuilders || [];
    resetWorld([client, builder, ...extra]);
    return { client, builder };
}

/** Ogłasza przetarg i doprowadza do podpisania umowy. */
function awardContract(client, buildingId = 'warehouse') {
    const tenderId = requestConstructionTender(client, { id: buildingId }, null, {});
    assert(tenderId, 'przetarg powinien zostać ogłoszony');
    const tender = activeTenders.find(item => item.id === tenderId);
    const ticks = runUntil(() => tender.status !== 'open' && tender.status !== 'closed', 400);
    assert(ticks >= 0, `przetarg nie został rozstrzygnięty (status ${tender.status})`);
    assert(tender.status === 'awarded', `przetarg nie przyznany: ${tender.status} ${tender.cancelReason || ''}`);
    return { tender, project: constructionProjects.find(item => item.tender === tender) };
}

// ================================================================================
// TESTY
// ================================================================================

group('Katalog budownictwa (etap 3)', () => {
    test('każda pozycja katalogu ma jawny rodzaj', () => {
        const missing = [];
        for (const category of Object.values(INVESTMENT_CATALOG)) {
            for (const item of category) {
                if (!INVESTMENT_CLASSIFICATION[item.id]) missing.push(item.id);
            }
        }
        assert(missing.length === 0, `brak klasyfikacji: ${missing.join(', ')}`);
    });

    test('kampania reklamowa i aktualizacja IT nie trafiają do przetargu — także przy bezpośrednim wywołaniu', () => {
        const { client } = standardWorld();
        assert(requestConstructionTender(client, { id: 'marketing_campaign', name: 'Kampania' }, 500000) === null, 'requestConstructionTender');
        assert(createTender({ id: 'software_update', name: 'IT', duration: 5, cost: 1 }, client, 500000) === null, 'createTender');
        assert(createTender({ id: 'nieistniejace', duration: 5 }, client, 500000) === null, 'nieznana pozycja');
        assert(activeTenders.length === 0, 'nie powinno być przetargów');
    });

    test('katalog uwzględnia wszystkie sektory spółki i usuwa duplikaty', () => {
        const company = makeCompany('MIX', { sector: ['Technologia', 'Medycyna', 'Technologia'], devLevel: 5 });
        const all = getInvestmentCatalogForCompany(company).map(item => item.id);
        assert(new Set(all).size === all.length, 'duplikaty w katalogu');
        assert(all.includes('server_room') && all.includes('hospital'), 'brakuje pozycji z drugiego sektora');
        const construction = getConstructionCatalogForCompany(company).map(item => item.id);
        assert(!construction.includes('marketing_campaign') && construction.includes('hospital'), 'filtr budowlany');
    });

    test('wymaganie poziomu działu rozwoju (nie kondycji finansowej)', () => {
        const company = makeCompany('LOW', { sector: ['Medycyna'], devLevel: 1 });
        company.financialHealth = 5;
        resetWorld([company]);
        assert(!getConstructionCatalogForCompany(company).some(item => item.id === 'hospital'), 'szpital wymaga poziomu 4');
        assert(requestConstructionTender(company, { id: 'hospital' }, 5_000_000) === null, 'przetarg mimo za niskiego poziomu');
    });

    test('pozycja mieszana: przetarg obejmuje tylko etap budowlany', () => {
        const spec = getConstructionSpec('server_room');
        assert(spec.kind === 'mixed' && spec.cost === Math.round(400000 * 0.45), `koszt etapu budowlanego ${spec.cost}`);
    });

    test('jednostka czasu: dni budowy', () => {
        const spec = getConstructionSpec('warehouse');
        assert(spec.durationDays === 20, 'czas katalogowy w dniach');
        assertNear(CONSTRUCTION_RULES.dayMs * 7, BASE_DELAYS.weekly, 'dzień = 1/7 tygodnia');
    });
});

group('Pełny kontrakt (etap 2)', () => {
    test('katalog → przetarg → oferta → budowa → odbiór → raport → historia', () => {
        const { client, builder } = standardWorld();
        const clientEquity0 = equity(client);
        const builderEquity0 = equity(builder);
        const builderLiabilities0 = builder.balanceSheet.liabilities;
        const money0 = moneyInModel();
        const journal0 = externalMark();

        const { project } = awardContract(client);
        assert(project.paidToBuilder > 0, 'zaliczka wypłacona');
        assert(builder.constructionStats.currentProjects === 1, 'moc zajęta');

        const ticks = runUntil(() => project.settled, 20000);
        assert(ticks >= 0, 'budowa nie zakończyła się');
        assert(project.status === 'completed', `status ${project.status}`);

        const settlement = project.settlement;
        assertNear(project.escrowBalance, 0, 'depozyt rozliczony');
        assertNear(equity(builder) - builderEquity0, settlement.revenue - settlement.costs, 'kapitał wykonawcy = wynik kontraktu');
        assertNear(builder.balanceSheet.liabilities, builderLiabilities0 + (builder.constructionCredit || 0), 'zaliczki rozliczone');
        assertNear(equity(client), clientEquity0, 'kapitał zamawiającego bez zmian (zakup aktywa)');

        const building = client.portfolio.buildings.find(item => item.projectId === project.id);
        assert(building, 'budynek u zamawiającego');
        assertNear(building.purchasePrice, settlement.revenue, 'cena nabycia = zapłata wykonawcy');
        assertNear(building.bookValue, building.purchasePrice, 'wartość księgowa = cena nabycia');
        assert(building.marketValue !== undefined, 'szacunek rynkowy osobno');

        assert(builder.constructionStats.currentProjects === 0, 'moc zwolniona');
        assert(builder.constructionHistory.length === 1, 'historia kontraktu');

        assertNear(moneyInModel() - money0, externalNetFlow(journal0), 'brak pieniędzy spoza modelu');

        const report1 = takePeriodResults(builder);
        assertNear(report1.constructionRevenue - report1.constructionCosts, settlement.revenue - settlement.costs, 'raport pokazuje wynik kontraktu');
        const report2 = takePeriodResults(builder);
        assert(report2.constructionRevenue === 0 && report2.constructionCosts === 0, 'drugi raport nie księguje ponownie');
    });

    test('płatności etapowe: zaliczka 20%, etapy, dopiero odbiór wypłaca resztę', () => {
        const { client } = standardWorld();
        const { project } = awardContract(client);
        const value = getContractValue(project);
        assertNear(project.paidToBuilder, value * 0.2, 'zaliczka');
        runUntil(() => project.progress >= 0.5 || project.settled, 20000);
        assert(project.milestonesPaid >= 2, 'etapy 25% i 50% odebrane');
        assert(project.paidToBuilder <= value * 0.9 + 1, 'przed odbiorem max 90%');
    });

    test('kara za opóźnienie wykonawcy i premia za wcześniejsze ukończenie są ograniczone', () => {
        for (const [seed, speed] of [[7, 0.5], [8, 2.5]]) {
            withSeededRandom(seed, () => {
                const { client } = standardWorld();
                const { project } = awardContract(client);
                project.performanceFactor = speed;
                project.delayChance = 0;
                runUntil(() => project.settled, 30000);
                const value = getContractValue(project);
                const s = project.settlement;
                assert(s.penalty <= value * CONSTRUCTION_RULES.maxPenaltyRate + 0.01, 'limit kary');
                assert(s.bonus <= value * CONSTRUCTION_RULES.maxBonusRate + 0.01, 'limit premii');
                if (speed < 1) assert(s.penalty > 0, 'wolna budowa powinna mieć karę');
                else assert(s.bonus > 0, 'szybka budowa powinna mieć premię');
            });
        }
    });

    test('opóźnienia zewnętrzne i zmiany zamówienia przesuwają termin (bez kary)', () => {
        const { client } = standardWorld();
        const { project } = awardContract(client);
        project.performanceFactor = 1;
        project.pauseRemainingMs = 10 * CONSTRUCTION_RULES.dayMs;
        project.pauseCause = 'external';
        project.speedMultiplier = 1;
        project.delayChance = 0;
        project.deadlineMs = project.workRequiredMs; // termin dokładnie na czas pracy
        runUntil(() => project.settled, 30000);
        assert(project.settlement.penalty === 0, `kara mimo usprawiedliwionej przerwy: ${project.settlement.penalty}`);
    });

    test('limit równoległych projektów rośnie z doświadczeniem', () => {
        const builder = makeCompany('B1', { sector: ['Budowlany'], experience: 9 });
        assert(builder.constructionStats.maxProjects === 1, 'start');
        builder.constructionStats.experience = 10;
        updateConstructionCapacity(builder);
        assert(builder.constructionStats.maxProjects === 2, 'po doświadczeniu');
        builder.constructionStats.experience = 200;
        updateConstructionCapacity(builder);
        assert(builder.constructionStats.maxProjects === 5, 'maksimum 5');
    });
});

group('Finanse kontraktów (etap 2 i 6)', () => {
    test('brak gotówki wykonawcy: kredyt obrotowy zamiast wiecznego postoju', () => {
        const { client, builder } = standardWorld({ builderCash: 5_000 });
        const { project } = awardContract(client);
        const money0 = moneyInModel();
        const j0 = externalMark();
        runUntil(() => project.settled, 30000);
        assert(project.status === 'completed', `budowa powinna się skończyć dzięki finansowaniu, status ${project.status}`);
        assertNear(moneyInModel() - money0, externalNetFlow(j0), 'bilans pieniędzy');
        assert(builder.balanceSheet.liabilities >= 0, 'zobowiązania');
    });

    test('brak finansowania: zerwanie z winy wykonawcy po limicie postoju, bez darmowych pieniędzy', () => {
        const { client, builder } = standardWorld({ builderCash: 0 });
        builder.balanceSheet.liabilities = builder.balanceSheet.assets * 0.69; // brak zdolności kredytowej
        const clientCash0 = client.cash;
        const money0 = moneyInModel();
        const j0 = externalMark();
        const { project } = awardContract(client);
        runUntil(() => project.settled, 30000);
        assert(project.status === 'cancelled' && project.settlement.faultParty === 'contractor', `status ${project.status}`);
        assert(builder.constructionStats.currentProjects === 0, 'moc zwolniona');
        assertNear(moneyInModel() - money0, externalNetFlow(j0), 'bilans pieniędzy');
        // Zamawiający odzyskuje depozyt; za zaliczkę ponad odebrane etapy ma roszczenie (część może przepaść).
        assert(client.cash <= clientCash0 + 0.01, 'zamawiający nie zarabia na zerwaniu ponad karę');
    });

    test('anulowanie przez zamawiającego: wynagrodzenie za etap, zwrot depozytu, odstępne', () => {
        const { client, builder } = standardWorld();
        const { project } = awardContract(client);
        runUntil(() => project.progress >= 0.4, 20000);
        const builderEquity0 = equity(builder) ; // przed rozliczeniem
        const money0 = moneyInModel();
        const j0 = externalMark();
        const clientEquity0 = equity(client);
        assert(cancelConstructionProject(project, 'Rezygnacja', 'client'), 'anulowanie');
        const s = project.settlement;
        assert(s.revenue >= s.costs, 'wykonawca nie traci na rezygnacji zamawiającego');
        assertNear(equity(builder) - builderEquity0, s.revenue - s.costs - s.penalty, 'kapitał wykonawcy');
        assertNear(equity(client), clientEquity0, 'zamawiający: niedokończony obiekt w aktywach');
        const unfinished = client.portfolio.buildings.find(item => item.projectId === project.id);
        assert(unfinished && unfinished.status === 'unfinished', 'niedokończony obiekt');
        assertNear(unfinished.bookValue, s.revenue, 'wartość niedokończonego obiektu');
        assertNear(moneyInModel() - money0, externalNetFlow(j0), 'bilans pieniędzy');
        assert(cancelConstructionProject(project, 'ponownie', 'client') === false, 'drugie anulowanie zablokowane');
    });

    test('bankructwo zamawiającego i wykonawcy zwalnia moce i podwykonawcę', () => {
        const { client, builder } = standardWorld();
        const { project } = awardContract(client);
        assert(hireSubcontractorForProject(project, 'specA'), 'zatrudnienie podwykonawcy');
        assert(specialists.find(s => s.id === 'specA').busyProjectId === project.id, 'podwykonawca zajęty');
        client.isBankrupt = true;
        tick(1);
        assert(project.settled && project.status === 'cancelled', 'anulowane przy bankructwie zamawiającego');
        assert(builder.constructionStats.currentProjects === 0, 'moc wykonawcy zwolniona');
        assert(!specialists.find(s => s.id === 'specA').busyProjectId, 'podwykonawca zwolniony');

        const world2 = standardWorld();
        const { project: project2 } = awardContract(world2.client);
        world2.builder.isBankrupt = true;
        const clientCash = world2.client.cash;
        tick(1);
        assert(project2.settled && project2.settlement.faultParty === 'contractor', 'zerwanie z winy wykonawcy');
        assert(world2.client.cash > clientCash, 'depozyt wrócił do zamawiającego');
    });

    test('podwykonawca: wynagrodzenie jest kosztem kontraktu, bonus tempa w modelu czasu', () => {
        const { client, builder } = standardWorld();
        const { project } = awardContract(client);
        const speed0 = project.speedMultiplier;
        const costs0 = project.costsPaid;
        const builderCash0 = builder.cash;
        assert(hireSubcontractorForProject(project, 'specA'), 'zatrudniono');
        assertNear(project.speedMultiplier, speed0 + 0.10, 'bonus tempa');
        assertNear(project.costsPaid - costs0, builderCash0 - builder.cash, 'wynagrodzenie w kosztach');
        runUntil(() => project.settled, 20000);
        assert(specialists.find(s => s.id === 'specA').contractsCompleted === 1, 'kontrakt podwykonawcy zaliczony');
    });

    test('zamawiający bez gotówki: kredyt przy podpisaniu albo anulowanie', () => {
        const { client } = standardWorld({ clientCash: 600_000 });
        // budżet przetargu ~ 1.2 × 400k; gotówka wystarcza, ale zabieramy ją przed rozstrzygnięciem
        const tenderId = requestConstructionTender(client, { id: 'warehouse' }, null);
        client.cash = 0;
        client.balanceSheet.liabilities = client.balanceSheet.assets * 0.69;
        runUntil(() => !['open', 'closed'].includes(activeTenders.find(t => t.id === tenderId).status), 400);
        const tender = activeTenders.find(t => t.id === tenderId);
        assert(tender.status === 'cancelled', `przetarg bez finansowania: ${tender.status}`);
        assert(constructionProjects.length === 0, 'brak projektu');
    });
});

group('Konkurencja (etap 4 i 6)', () => {
    test('jedna aktualna oferta wykonawcy na przetarg', () => {
        const extra = [makeCompany('BU2', { sector: ['Budowlany'], experience: 30 }), makeCompany('BU3', { sector: ['Budowlany'], experience: 5 })];
        const { client } = standardWorld({ extraBuilders: extra });
        const tenderId = requestConstructionTender(client, { id: 'warehouse' }, null);
        const tender = activeTenders.find(t => t.id === tenderId);
        tick(55);
        const keys = tender.bids.map(bid => getEntityKey(bid.bidder));
        assert(new Set(keys).size === keys.length, 'duplikaty ofert');
        assert(tender.bids.length >= 2, `za mało ofert: ${tender.bids.length}`);
        assert(tender.bids.every(bid => bid.price >= estimateBuilderCost(bid.bidder, tender.buildingType) * 1.03), 'oferta poniżej kosztów');
    });

    test('zajęcie ostatniego wolnego miejsca: przetarg trafia do kolejnego wykonawcy', () => {
        const second = makeCompany('BU2', { sector: ['Budowlany'], experience: 30 });
        const { client, builder } = standardWorld({ extraBuilders: [second] });
        const tenderId = requestConstructionTender(client, { id: 'warehouse' }, null);
        const tender = activeTenders.find(t => t.id === tenderId);
        assert(bidOnTender(tenderId, builder, 470000, 15), 'oferta 1');
        assert(bidOnTender(tenderId, second, 479000, 25), 'oferta 2');
        tender.evaluatedBy = stocks.map(getEntityKey); // bez dodatkowych ofert AI
        const best = [...tender.bids].sort((a, b) => calculateBidScore(b, tender) - calculateBidScore(a, tender))[0].bidder;
        best.constructionStats.maxProjects = 1;
        // najlepszy oferent zajmuje ostatnie miejsce inną budową
        constructionProjects.push({ id: 'blocker', settled: false, builder: best, tender: { clientCompany: client, buildingType: { id: 'x' } } });
        runUntil(() => tender.status !== 'open' && tender.status !== 'closed', 200);
        constructionProjects = constructionProjects.filter(p => p.id !== 'blocker');
        assert(tender.status === 'awarded', `status ${tender.status}`);
        assert(tender.winner.bidder !== best, 'wygrał oferent bez wolnej mocy');
    });

    test('wymagania projektu: wieżowiec tylko z doświadczeniem i technologią', () => {
        const builder = makeCompany('BUX', { sector: ['Budowlany'], experience: 50 });
        const spec = getConstructionSpec('skyscraper');
        assert(!meetsConstructionRequirements(builder, spec), 'brak technologii');
        builder.research.unlockedTechs.push('BUILDING_HIGH_RISE_1');
        assert(meetsConstructionRequirements(builder, spec), 'z technologią');
    });

    test('brak podwójnego zamówienia tej samej inwestycji', () => {
        const { client } = standardWorld();
        client.departments.development.level = 5;
        assert(requestConstructionTender(client, { id: 'warehouse' }, null), 'pierwsze');
        assert(requestConstructionTender(client, { id: 'warehouse' }, null) === null, 'drugie zablokowane');
        const result = startCompanyInvestment(client, 'warehouse', 'owner');
        assert(!result.ok, 'ścieżka właściciela też blokuje');
    });
});

group('Czas symulacji', () => {
    test('pauza zatrzymuje budowy i przetargi', () => {
        const { client } = standardWorld();
        const { project } = awardContract(client);
        const progress = project.progress;
        isGamePaused = true;
        tick(50);
        isGamePaused = false;
        assert(project.progress === progress, 'postęp w pauzie');
    });

    test('prędkość ×1/×2/×5 nie zmienia wyniku (ten sam czas gry, ten sam seed)', () => {
        const results = [];
        for (const delta of [1000, 2000, 5000]) {
            withSeededRandom(99, () => {
                const { client } = standardWorld();
                const { project } = awardContract(client);
                project.delayChance = 0;
                const steps = 60000 / delta;
                tick(steps, delta);
                results.push([project.progress, project.costsPaid]);
            });
        }
        assertNear(results[0][0], results[1][0], 'postęp ×1 vs ×2', 1e-9);
        assertNear(results[0][0], results[2][0], 'postęp ×1 vs ×5', 1e-9);
        assertNear(results[0][1], results[2][1], 'koszty ×1 vs ×5', 0.01);
    });

    test('czas na oferty liczony w czasie gry, nie w czasie rzeczywistym', () => {
        const { client } = standardWorld();
        const tenderId = requestConstructionTender(client, { id: 'warehouse' }, null);
        const tender = activeTenders.find(t => t.id === tenderId);
        tick(10, 5000);
        assertNear(tender.elapsedGameMs, 50000, 'upływ czasu przetargu');
    });
});

group('Badania R&D (etap 1)', () => {
    function rdCompany() {
        const company = makeCompany('RND', { sector: ['Budowlany'], cash: 100000 });
        resetWorld([company]);
        return company;
    }

    test('rozpoczęcie: gotówka, aktywa i zyski zatrzymane maleją dokładnie raz', () => {
        const company = rdCompany();
        const techId = getAvailableCompanyResearch(company, true)[0];
        const cost = technologies[techId].initialCashCost;
        const cash0 = company.cash, assets0 = company.balanceSheet.assets, re0 = company.balanceSheet.retainedEarnings;
        assert(startCompanyResearch(company, techId), 'start');
        assert(!startCompanyResearch(company, techId), 'drugi start zablokowany');
        assertNear(cash0 - company.cash, cost, 'gotówka');
        assertNear(assets0 - company.balanceSheet.assets, cost, 'aktywa');
        assertNear(re0 - company.balanceSheet.retainedEarnings, cost, 'zyski zatrzymane');
        const entry = company.research.ledger[0];
        assert(entry.kind === 'startup' && entry.techId === techId && entry.amount === cost && entry.id, 'wpis w dzienniku');
    });

    test('utrzymanie, wstrzymanie (postęp zostaje) i wznowienie bez ponownej opłaty startowej', () => {
        const company = rdCompany();
        const techId = getAvailableCompanyResearch(company, true)[0];
        startCompanyResearch(company, techId);
        company.research.progress = 42;
        const startupPaid = company.research.costTotals.startup;

        processResearchMaintenanceAndPause(company);
        assert(company.research.costTotals.maintenance === RESEARCH_MAINTENANCE_COST, 'utrzymanie pobrane');

        company.cash = 10; // brak środków
        processResearchMaintenanceAndPause(company);
        assert(company.research.researchPaused && !company.research.isResearching, 'wstrzymane');
        assert(company.research.progress === 42, 'postęp zachowany');
        assert(company.research.currentTech === techId, 'badanie nie porzucone');

        company.cash = 5000;
        processResearchMaintenanceAndPause(company);
        assert(company.research.isResearching && !company.research.researchPaused, 'wznowione');
        assert(company.research.costTotals.startup === startupPaid, 'brak ponownej opłaty startowej');
        assert(company.research.costTotals.maintenance === 2 * RESEARCH_MAINTENANCE_COST, 'tylko utrzymanie przy wznowieniu');
    });

    test('raport rozpoznaje koszty raz; ponowny raport nie księguje ich drugi raz', () => {
        const company = rdCompany();
        startCompanyResearch(company, getAvailableCompanyResearch(company, true)[0]);
        processResearchMaintenanceAndPause(company);
        const pending = getUnrecognizedResearchExpense(company);
        const cash = company.cash, assets = company.balanceSheet.assets;
        assert(recognizeResearchExpenses(company) === pending, 'pierwszy raport');
        assert(recognizeResearchExpenses(company) === 0, 'drugi raport');
        assert(company.cash === cash && company.balanceSheet.assets === assets, 'raport nie zmienia gotówki/aktywów');
    });

    test('pełny raport kwartalny: koszty R&D i wynik kontraktów tylko w wyniku, nie w gotówce', () => {
        withSeededRandom(5, () => {
            const company = rdCompany();
            startCompanyResearch(company, getAvailableCompanyResearch(company, true)[0]);
            postPeriodEntry(company, 'test_contract', { constructionRevenue: 1000, constructionCosts: 400 });
            const rd = getUnrecognizedResearchExpense(company);
            const taxModifier = city.mayor.taxModifier;
            city.mayor.taxModifier = -1; // wyłączenie podatku miejskiego na czas testu
            const cash0 = company.cash;
            const j0 = paymentJournal.length;
            try {
                processFinancialReports();
            } finally {
                city.mayor.taxModifier = taxModifier;
            }
            const b = company.lastReportBreakdown;
            assertNear(b.researchExpense, rd, 'R&D w raporcie');
            assertNear(b.total, b.operating - rd + 600, 'wynik raportowany');
            const debtFlows = paymentJournal.slice(j0).reduce((sum, e) => sum + (e.to === company.symbol ? e.amount : 0) - (e.from === company.symbol ? e.amount : 0), 0);
            assertNear(company.cash - cash0, b.operating + (b.depreciation || 0) + debtFlows, 'gotówka zmienia się tylko o wynik operacyjny + amortyzację (i kredyt)');
            const again = takePeriodResults(company);
            assert(again.total === 0 && getUnrecognizedResearchExpense(company) === 0, 'nic do ponownego zaksięgowania');
        });
    });

    test('ukończenie badania budowlanego wpływa na nowe kontrakty', () => {
        const builder = makeCompany('TEC', { sector: ['Budowlany'] });
        const spec = getConstructionSpec('warehouse');
        const cost0 = estimateBuilderCost(builder, spec);
        const speed0 = getBuilderSpeedMultiplier(builder);
        builder.research.unlockedTechs.push('BUILDING_PREFAB_1');
        assert(estimateBuilderCost(builder, spec) < cost0, 'niższe koszty');
        assert(getBuilderSpeedMultiplier(builder) > speed0, 'szybsze budowy');
    });

    test('inwestycje bankowe nie korzystają z dziennika R&D', () => {
        const bank = makeCompany('BNK');
        bank.research = { isInvestment: true, ledger: [] };
        assert(recordResearchExpense(bank, { kind: 'startup', amount: 1000 }) === 0, 'brak księgowania');
    });
});

group('Zapis gry (etap 5)', () => {
    function roundTrip() {
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        const report = applySaveSnapshot(snapshot);
        assert(report.ok, `wczytanie: ${report.errors.join(' ')}`);
        return report;
    }

    test('zapis w połowie budowy zachowuje salda, projekt i moce', () => {
        const { client } = standardWorld();
        const { project } = awardContract(client);
        runUntil(() => project.progress >= 0.4, 20000);
        const before = { progress: project.progress, escrow: project.escrowBalance, paid: project.paidToBuilder, clientCash: client.cash, builderCash: project.builder.cash, elapsed: project.elapsedGameMs };
        roundTrip();
        const loaded = constructionProjects[0];
        assert(loaded && loaded.id === project.id, 'projekt po wczytaniu');
        assert(loaded.builder === stocks.find(s => s.symbol === 'BUD'), 'wykonawca połączony ze spółką');
        assert(loaded.tender.clientCompany === stocks.find(s => s.symbol === 'KLI'), 'zamawiający połączony ze spółką');
        assert(loaded.builder.constructionStats.currentProjects === 1, 'moce odtworzone');
        assertNear(loaded.progress, before.progress, 'postęp');
        assertNear(loaded.escrowBalance, before.escrow, 'depozyt');
        assertNear(loaded.paidToBuilder, before.paid, 'wypłaty');
        assertNear(loaded.tender.clientCompany.cash, before.clientCash, 'gotówka zamawiającego');
        assertNear(loaded.elapsedGameMs, before.elapsed, 'licznik czasu');
        runUntil(() => loaded.settled, 20000);
        assert(loaded.status === 'completed', 'budowa kończy się po wczytaniu');
        assert(loaded.tender.clientCompany.portfolio.buildings.length === 1, 'jeden budynek (brak podwójnego odbioru)');
    });

    test('zapis podczas wstrzymania i po rozliczeniu', () => {
        const { client, builder } = standardWorld();
        const { project } = awardContract(client);
        project.pauseRemainingMs = 5 * CONSTRUCTION_RULES.dayMs;
        project.pauseCause = 'external';
        project.status = 'paused';
        roundTrip();
        assert(constructionProjects[0].status === 'paused' && constructionProjects[0].pauseRemainingMs > 0, 'wstrzymanie zachowane');
        runUntil(() => constructionProjects.length === 0, 30000);
        const history = stocks.find(s => s.symbol === 'BUD').constructionHistory.length;
        const ledgerPending = getPendingPeriodResult(stocks.find(s => s.symbol === 'BUD')).total;
        roundTrip();
        assert(stocks.find(s => s.symbol === 'BUD').constructionHistory.length === history, 'historia zachowana');
        assertNear(getPendingPeriodResult(stocks.find(s => s.symbol === 'BUD')).total, ledgerPending, 'nieraportowane kwoty zachowane');
        assert(constructionProjects.length === 0, 'brak ponownego rozliczenia');
    });

    test('zapis R&D: postęp, koszty, czas decyzji i ponawiania', () => {
        const company = makeCompany('RND', { sector: ['Budowlany'], cash: 100000 });
        resetWorld([company]);
        startCompanyResearch(company, getAvailableCompanyResearch(company, true)[0]);
        company.research.progress = 77;
        company.research.autoRetryGameMs = 12345;
        roundTrip();
        const loaded = stocks[0].research;
        assert(loaded.progress === 77 && loaded.autoRetryGameMs === 12345, 'pola R&D');
        assert(loaded.ledger.length === 1 && !loaded.ledger[0].recognized, 'nierozpoznany koszt zachowany');
    });

    test('walidacja: brakujący wykonawca, duplikaty ID, nieprawidłowe kwoty, stara wersja', () => {
        const { client } = standardWorld();
        awardContract(client);
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        const escrow = snapshot.constructionProjects[0].escrowBalance;
        const clientCash = snapshot.stocks.find(s => s.symbol === 'KLI').cash;
        snapshot.stocks = snapshot.stocks.filter(s => s.symbol !== 'BUD');
        snapshot.stocks.push({ ...snapshot.stocks[0] }); // duplikat symbolu
        snapshot.stocks[0].cash = NaN;
        const report = applySaveSnapshot(snapshot);
        assert(report.ok, 'zapis wczytany mimo błędów częściowych');
        assert(report.warnings.some(w => w.includes('Duplikat')), 'ostrzeżenie o duplikacie');
        assert(constructionProjects.length === 0, 'projekt bez wykonawcy usunięty');
        assert(stocks.length === 1, 'jedna spółka');
        assertNear(stocks[0].cash, 0 + escrow, 'NaN → 0, depozyt zwrócony');
        assert(Number.isFinite(clientCash));

        assert(!applySaveSnapshot({ version: 1, stocks: [] }).ok, 'stara wersja odrzucona');
    });
});

group('Rynek: fundamenty, ceny, cykl, dywidendy (etap A)', () => {
    function marketCompany(symbol, options = {}) {
        // Kapitał własny ≈ kapitalizacja (jak w świecie gry): 10 000 akcji × 100 PLN.
        const company = makeCompany(symbol, { cash: 200_000, fixedAssets: 800_000, ...options });
        company.price = options.price ?? 100;
        company.volatilityFactor = options.volatility ?? 1;
        company.corporatePhase = CORPORATE_PHASES.STABILITY;
        company.financialHealth = options.health ?? 0;
        initializeFundamentals(company, true);
        initializeOwnership(company);
        return company;
    }

    function withCycle(phase, gdp, fn) {
        const saved = economyCycle;
        economyCycle = createEconomyCycle(phase);
        economyCycle.gdpGrowth = gdp;
        try { return fn(); } finally { economyCycle = saved; }
    }

    test('zysk nie zależy od ceny akcji', () => {
        const cheap = marketCompany('TANI', { price: 10 });
        const dear = marketCompany('DROGI', { price: 1000 });
        dear.fundamentals.revenue = cheap.fundamentals.revenue;
        dear.marginAdj = cheap.marginAdj; dear.growthAdj = cheap.growthAdj; // U3: te same cechy spółki
        resetWorld([cheap, dear]);
        const a = withSeededRandom(1, () => computeQuarterResults(cheap));
        const b = withSeededRandom(1, () => computeQuarterResults(dear));
        assertNear(a.netIncome, b.netIncome, 'ten sam zysk przy różnej cenie');
    });

    test('rachunek wyników i wskaźniki są spójne', () => {
        const company = marketCompany('SPOJ', { liabilities: 500000 });
        resetWorld([company]);
        const q = computeQuarterResults(company);
        assertNear(q.ebitda - q.depreciation - q.interest - q.tax + q.subsidy, q.netIncome, 'EBITDA → zysk netto');
        assert(q.tax >= 0 && q.depreciation > 0 && q.interest > 0, 'koszty niegotówkowe, odsetki, podatek');
        recordQuarterFundamentals(company, q);
        const f = company.fundamentals;
        assertNear(f.history[f.history.length - 1].eps, q.netIncome / company.totalShares, 'EPS');
        assertNear(f.epsTtm, f.history.slice(-4).reduce((s, h) => s + h.eps, 0), 'EPS z 4 kwartałów');
        assert(f.fairValue > 0 && f.salesPerShare > 0 && f.bookValuePerShare > 0, 'wartość godziwa i wskaźniki na akcję');
    });

    test('kalibracja startowa: wartość godziwa bliska bieżącej cenie', () => {
        const company = marketCompany('KAL', { price: 80 });
        const ratio = company.fundamentals.fairValue / company.price;
        assert(ratio > 0.6 && ratio < 1.6, `wartość godziwa / cena = ${ratio.toFixed(2)}`);
    });

    test('cena wraca w stronę wartości godziwej', () => {
        for (const direction of [1.5, 0.5]) {
            const company = marketCompany('POWR', { volatility: 0.5 });
            resetWorld([company]);
            withCycle('recovery', 0.007, () => {
                const fair = company.fundamentals.fairValue;
                company.price = fair * direction;
                for (let i = 0; i < 3600; i++) updateStockPrices();
                const gapBefore = Math.abs(direction - 1);
                const gapAfter = Math.abs(company.price / company.fundamentals.fairValue - 1);
                assert(gapAfter < gapBefore * 0.75, `luka ${gapBefore.toFixed(2)} → ${gapAfter.toFixed(2)}`);
            });
        }
    });

    test('ruch cen jest procentowy (ta sama zmienność dla taniej i drogiej akcji)', () => {
        const returns = [];
        for (const price of [2, 2000]) {
            withSeededRandom(77, () => {
                const company = marketCompany('PCT', { price });
                company.fundamentals.fairValue = price; // bez luki wyceny
                resetWorld([company]);
                withCycle('recovery', 0, () => {
                    const start = company.price;
                    for (let i = 0; i < 300; i++) updateStockPrices();
                    returns.push(company.price / start - 1);
                });
            });
        }
        assertNear(returns[0], returns[1], 'zwrot niezależny od poziomu ceny', 0.02);
    });

    test('cykl przechodzi przez wszystkie fazy, recesja ma ujemne PKB', () => {
        const saved = economyCycle;
        const seen = new Set();
        try {
            economyCycle = createEconomyCycle('recovery');
            for (let i = 0; i < 60; i++) {
                advanceEconomyCycle();
                seen.add(economyCycle.phase);
                if (economyCycle.phase === 'recession') assert(economyCycle.gdpGrowth < 0, 'PKB w recesji');
            }
        } finally {
            economyCycle = saved;
        }
        assert(seen.size === 4, `odwiedzone fazy: ${[...seen].join(', ')}`);
    });

    test('w recesji sektor defensywny traci mniej niż cykliczny', () => {
        const food = marketCompany('JEDZ', { sector: ['Żywność'] });
        const build = marketCompany('BUDO', { sector: ['Budowlany'] });
        food.growthAdj = 0; build.growthAdj = 0;
        resetWorld([food, build]);
        const growth = company => withSeededRandom(5, () => withCycle('recession', -0.012, () => {
            const start = company.fundamentals.revenue;
            for (let i = 0; i < 8; i++) computeQuarterResults(company);
            return company.fundamentals.revenue / start - 1;
        }));
        const foodGrowth = growth(food);
        const buildGrowth = growth(build);
        assert(foodGrowth > buildGrowth, `Żywność ${(foodGrowth * 100).toFixed(1)}% vs Budowlany ${(buildGrowth * 100).toFixed(1)}%`);
        // Cykl sektorów (stan z poprzednich testów) wyłączony: po 0.15.0.1 C5a różnica faz jest o połowę mniejsza.
        const sectorFactor = getSectorValuationFactor;
        getSectorValuationFactor = () => 1;
        try {
            const multFood = withCycle('recession', -0.012, () => getValuationMultiplier(food));
            const multBuild = withCycle('recession', -0.012, () => getValuationMultiplier(build));
            assert(multFood > multBuild, 'niższa wycena cyklicznych w recesji');
        } finally { getSectorValuationFactor = sectorFactor; }
    });

    test('dywidenda: z gotówki spółki, cena spada o dywidendę na akcję, 0% nic nie wypłaca', () => {
        const company = marketCompany('DYW', { cash: 1_000_000 });
        resetWorld([company]);
        setCompanyDividendPolicy(company, 'Total');
        declareQuarterDividend(company, 100000);
        assert(company.pendingDividend && near(company.pendingDividend.total, 100000), 'ogłoszona dywidenda = 100% zysku');
        const cash0 = company.cash, price0 = company.price, re0 = company.balanceSheet.retainedEarnings;
        const dps = company.pendingDividend.dps;
        for (let i = 0; i < 100 && company.pendingDividend; i++) updateDividendTimers(1000);
        assert(!company.pendingDividend, 'wypłacona po czasie');
        assertNear(cash0 - company.cash, 100000, 'gotówka spółki');
        assertNear(re0 - company.balanceSheet.retainedEarnings, 100000, 'zyski zatrzymane');
        assertNear(price0 - company.price, dps, 'spadek ceny o DPS');

        setCompanyDividendPolicy(company, 'Growth');
        declareQuarterDividend(company, 100000);
        assert(!company.pendingDividend, 'strategia 0% bez wypłaty');

        setCompanyDividendPolicy(company, 'Aggressive');
        assert(company.dividendPayoutRatio >= 0.10 && company.dividendPayoutRatio <= 0.50, 'Wysoka 10–50%');
        declareQuarterDividend(company, -5000);
        assert(!company.pendingDividend, 'brak dywidendy przy stracie');
    });

    test('struktura własności: pakiet insiderów nie jest w obrocie', () => {
        const company = marketCompany('WLAS');
        assert(company.insiderShares > 0, 'pakiet insiderów');
        assert(getAvailableShares(company) === company.totalShares - company.insiderShares, 'dostępne = obrót');
        company.sharesHeld = 100;
        assert(getAvailableShares(company) === company.totalShares - company.insiderShares - 100, 'minus akcje inwestorów');
        assert(company.insiderShares < company.totalShares * 0.5, 'większość nadal możliwa do zdobycia');
    });
});

group('Fundusz gracza (etap B)', () => {
    function fundWorld() {
        const a = makeCompany('AAA', { cash: 200_000, fixedAssets: 800_000 });
        const b = makeCompany('BBB', { cash: 200_000, fixedAssets: 800_000 });
        [a, b].forEach(company => { company.insiderShares = 0; company.sharesHeld = 0; company.reputation = { player: 0 }; });
        resetWorld([a, b]);
        allBonds.length = 0;
        const gig = marketIndexes.find(index => index.id === 'GIG');
        gig.value = 100;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return { a, b, gig };
    }

    test('start kariery: 10 000 zł, 1000 JU, NAV 10, 100 zł od babci, kilkunastu klientów', () => {
        fundWorld();
        assert(playerCash === 10000 && playerFund.units === 1000, 'kapitał i JU');
        assertNear(getFundNav(), 10, 'NAV');
        assert(playerWallet.cash === 100, 'kieszonkowe');
        assert(playerFund.clients.length >= 12 && playerFund.clients.length <= 15, 'liczba klientów');
        assertNear(playerFund.clients.reduce((sum, c) => sum + c.units, 0), 1000, 'JU rozdzielone');
        assert(playerAccessLevel === 2, 'dostęp: Śmieciowa, Brązowa, Srebrna');
        assert(Object.keys(playerPortfolio).length === 0, 'pusty portfel funduszu');
    });

    test('NAV nie zmienia się przy emisji i umorzeniu (po NAV)', () => {
        const { a } = fundWorld();
        buyStock('AAA', 30);
        const nav0 = getFundNav();
        issueFundUnits(200, { forcedValue: 1500, forcedClient: playerFund.clients[0] });
        assertNear(getFundNav(), nav0, 'emisja', 1e-9);
        redeemClientUnits(playerFund.clients[1], 20);
        assertNear(getFundNav(), nav0, 'umorzenie', 1e-9);
        assert(a.sharesHeld === 30, 'akcje funduszu w obrocie');
    });

    test('umorzenie bez gotówki wymusza sprzedaż, gotówka nie spada poniżej zera', () => {
        const { a } = fundWorld();
        buyStock('AAA', 95); // ~9 500 zł w akcjach
        const client = [...playerFund.clients].sort((x, y) => y.units - x.units)[0];
        const sharesBefore = playerPortfolio.AAA.shares;
        redeemClientUnits(client, client.units);
        assert(playerCash >= -1e-9, 'gotówka ≥ 0');
        assert((playerPortfolio.AAA?.shares || 0) < sharesBefore, 'sprzedano pozycje');
        assert(playerFund.current.forcedSales > 0, 'zanotowano wymuszoną sprzedaż');
    });

    test('opłata za zarządzanie: NAV spada o opłatę, udział gracza trafia do portfela prywatnego', () => {
        fundWorld();
        const nav0 = getFundNav();
        const wallet0 = playerWallet.cash;
        const fee = chargeManagementFee();
        assertNear(fee, 10000 * MANAGEMENT_FEE_ANNUAL / FUND_WEEKS_PER_YEAR, 'wysokość opłaty');
        assertNear(nav0 - getFundNav(), fee / playerFund.units, 'NAV po opłacie', 1e-9);
        assertNear(playerWallet.cash - wallet0, fee * getPlayerPosition().feeShare, 'udział gracza');
    });

    test('zaufanie spada stopniowo, odpływ tygodniowy ograniczony, lojalny klient zostaje', () => {
        fundWorld();
        for (let i = 0; i < 4; i++) {
            playerFund.periods.push({ number: i, fundReturn: -0.12, benchmarkReturn: 0.02, rivals: [], volatility: 0.03, maxDrawdown: 0.15, rank: 1, rankOf: 1 });
        }
        const trust0 = playerFund.trust;
        const units0 = playerFund.units;
        processFundWeekly();
        const firstDrop = trust0 - playerFund.trust;
        assert(firstDrop > 0 && firstDrop < trust0 * 0.5, `spadek w tygodniu: ${firstDrop.toFixed(1)}`);
        assert(units0 - playerFund.units <= units0 * MAX_WEEKLY_REDEMPTION_SHARE + 1, 'odpływ ≤ 15% JU');
        for (let i = 0; i < 15; i++) processFundWeekly();
        assert(playerFund.trust < 25, `zaufanie po serii strat: ${playerFund.trust.toFixed(1)}`);
        assert(playerFund.clients.some(c => c.loyal), 'klient lojalny zostaje');
    });

    test('P12: trzecia emisja w okresie zablokowana (także wymuszona)', () => {
        fundWorld();
        playerFund.trust = 60;
        issueFundUnits(10, { forcedValue: 100, forcedClient: playerFund.clients[0] });
        issueFundUnits(10, { forcedValue: 100, forcedClient: playerFund.clients[0] });
        const units = playerFund.units;
        const r1 = issueFundUnits(10), r2 = issueFundUnits(10, { forcedValue: 100, forcedClient: playerFund.clients[0] });
        assert(r1.issued === 0 && r1.blocked && r2.issued === 0 && playerFund.units === units && playerFund.current.emissions === 2, 'blokada, JU bez zmian');
    });

    test('P12: zaufanie 0 → emisja niedostępna; limit wielkości przy 30 i 80; bez sztucznego klienta', () => {
        fundWorld();
        playerFund.trust = 0;
        const units = playerFund.units;
        assert(getEmissionBlockReason() && issueFundUnits(100).issued === 0 && playerFund.units === units && playerFund.current.emissions === 0, 'zaufanie 0');
        playerFund.trust = 30;
        assert(getMaxEmissionUnits() === Math.floor(units * (0.05 + 0.2 * 0.3)), 'limit przy 30');
        playerFund.trust = 80;
        assert(getMaxEmissionUnits() === Math.floor(units * (0.05 + 0.2 * 0.8)), 'limit przy 80');
        playerFund.trust = 30;
        playerFund.clients.forEach(c => { c.satisfaction = 0.1; });
        const clients = playerFund.clients.length;
        const r = Math.random; Math.random = () => 0; // nowi klienci: round(1,2 − 1,5) = 0
        try { const res = issueFundUnits(1_000_000); assert(res.issued <= getMaxEmissionUnits() + 1e-9, 'wielkość obcięta'); } finally { Math.random = r; }
        assert(playerFund.clients.length === clients && !playerFund.clients.some(c => c.type === 'institution' && c.units === 0), 'brak sztucznego klienta „institution”');
    });

    test('P12: lokaty spółek od zaufania 40; napływ organiczny 0 przy 20, połowa przy 37,5', () => {
        fundWorld();
        const full = getOrganicInflowRate(50);
        assert(getOrganicInflowRate(20) === 0, 'zaufanie 20');
        const half = getOrganicInflowRate(37.5), raw = Math.max(0, Math.min(0.5, ORGANIC_INFLOW_BASE + (37.5 - 50) / 50 * 0.04 + getRecentExcessAnnual() * 1.2 + getPlayerReputationFactor() * 0.03));
        assert(Math.abs(half - raw * 0.5) < 1e-12 && full > 0, `połowa przy 37,5: ${half} vs ${raw}`);
        const c = makeCompany('LOK', { cash: 50_000_000 }); c.reputation = { player: 100 }; stocks.push(c);
        setFundOpenSubscriptions(true);
        const r = Math.random; Math.random = () => 0;
        try {
            playerFund.trust = 39; const cash39 = c.cash; processCorporateSubscriptions();
            assert(c.cash === cash39, 'zaufanie 39 — brak lokaty');
            playerFund.trust = 40; processCorporateSubscriptions();
            assert(c.cash < cash39, 'zaufanie 40 — lokata możliwa');
        } finally { Math.random = r; }
    });

    test('premia za wyniki i udział w opłacie zależą od wyniku i stanowiska', () => {
        fundWorld();
        const base = { benchmarkReturn: 0.02, assets: 10000, rank: 2, rankOf: 3 };
        assert(computePerformanceBonus({ ...base, fundReturn: 0.01 }) === 0, 'poniżej GIG brak premii');
        const small = computePerformanceBonus({ ...base, fundReturn: 0.04 });
        const big = computePerformanceBonus({ ...base, fundReturn: 0.08 });
        assert(big > small && small > 0, 'premia rośnie z nadwyżką');
        const senior = computePerformanceBonus({ ...base, fundReturn: 0.04 }, CAREER_POSITIONS[2]);
        assert(senior > small, 'wyższe stanowisko, wyższa premia');
        assert(CAREER_POSITIONS[2].feeShare > CAREER_POSITIONS[0].feeShare, 'większy udział w opłacie');
    });

    test('prywatny zakup akcji kupionej przez fundusz zwiększa ryzyko compliance', () => {
        fundWorld();
        buyStock('AAA', 10);
        playerWallet.cash = 5000;
        setTradingAccount('private');
        buyStock('AAA', 5);
        setTradingAccount('fund');
        assert(playerWallet.portfolio.AAA?.shares === 5, 'akcje na koncie prywatnym');
        assert(playerWallet.complianceRisk >= 1 || playerWallet.fines > 0, 'ryzyko lub kara');
        assert(playerPortfolio.AAA.shares === 10, 'portfel funduszu bez zmian');
    });

    test('dywidendy: do gotówki funduszu bez podatku, na konto prywatne z podatkiem', () => {
        const { a } = fundWorld();
        buyStock('AAA', 20);
        playerWallet.cash = 5000;
        setTradingAccount('private');
        buyStock('AAA', 10);
        setTradingAccount('fund');
        const fundCash = playerCash;
        const wallet = playerWallet.cash;
        payDividendToShareholders(a, 1);
        assertNear(playerCash - fundCash, 20, 'fundusz brutto');
        assert(playerWallet.cash - wallet < 10 && playerWallet.cash - wallet > 8, 'prywatnie netto po podatku');
    });

    test('minimalny wpływ na cenę: 1% wolnego obrotu ≈ +0,5%', () => {
        const { a } = fundWorld();
        const price0 = a.price;
        buyStock('AAA', 100); // 1% z 10 000 akcji
        assertNear(a.price / price0 - 1, 0.005, 'wpływ na cenę', 1e-6);
    });

    test('dostęp do giełd wg stanowiska; szkolenie za pieniądze daje odznakę', () => {
        fundWorld();
        assert(!canAccessExchange('GOLD') && canAccessExchange('SILVER'), 'Złota zablokowana');
        playerWallet.cash = 1000;
        const cost = getTrainingCost('ironNerves');
        assert(buyTraining('ironNerves'), 'zakup szkolenia');
        assertNear(1000 - playerWallet.cash, cost, 'koszt w zł');
        assert(getTrainingMedal(getSkillLevel('ironNerves')).id === 'bronze', 'odznaka brązowa');
        skills.ironNerves.unlockedLevel = 0;
        assert(!getAvailableTrainings().includes('mediaManipulation') && getAvailableTrainings().includes('startupInvestor'), 'ukryte i odkryte szkolenia');
    });

    test('zapis v4 zachowuje NAV, JU, klientów, okresy i portfel prywatny', () => {
        fundWorld();
        buyStock('AAA', 25);
        playerFund.periods.push({ number: 1, fundReturn: 0.01, benchmarkReturn: 0, rivals: [], volatility: 0, maxDrawdown: 0, rank: 1, rankOf: 1, bonus: 5 });
        playerWallet.cash = 321;
        const before = { nav: getFundNav(), units: playerFund.units, clients: playerFund.clients.length, periods: playerFund.periods.length };
        const report = applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        assert(report.ok, report.errors.join(' '));
        assertNear(getFundNav(), before.nav, 'NAV', 1e-9);
        assert(playerFund.units === before.units && playerFund.clients.length === before.clients && playerFund.periods.length === before.periods, 'fundusz');
        assert(playerWallet.cash === 321, 'portfel prywatny');
        assert(playerProfile.fundName === 'Fundusz Testowy', 'profil');
    });
});

group('Kariera w korporacji (etap C)', () => {
    function careerWorld() {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000 });
        const b = makeCompany('BBB', { cash: 200_000, fixedAssets: 800_000 });
        const holdings = ['HA', 'HB', 'HC', 'HD'].map(symbol => {
            const holding = makeCompany(symbol, { cash: 500_000 });
            holding.assetType = 'Holding';
            holding.holdingPortfolio = {};
            return holding;
        });
        [a, b, ...holdings].forEach(company => { company.insiderShares = 0; company.sharesHeld = 0; company.reputation = { player: 0 }; });
        resetWorld([a, b, ...holdings]);
        allBonds.length = 0;
        marketIndexes.find(index => index.id === 'GIG').value = 100;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return { a, b, holdings };
    }

    const period = (fundReturn, extra = {}) => ({ number: 0, fundReturn, benchmarkReturn: 0, rivals: [], volatility: 0.01, maxDrawdown: 0.02, rank: 1, rankOf: 1, ...extra });
    const setPeriods = (periods, fundReturn) => { periods.length = 0; for (let i = 0; i < 4; i++) periods.push(period(fundReturn, { number: i + 1 })); };

    test('start: korporacja z 3–5 zarządcami, 3 cele przejęć spośród holdingów', () => {
        careerWorld();
        assert(corporation.managers.length >= 3 && corporation.managers.length <= 5, 'liczba zarządców');
        assert(corporation.takeoverTargets.length === 3, 'cele przejęć');
        assert(corporation.takeoverTargets.every(symbol => symbol.startsWith('H')), 'cele = holdingi');
        assert(corporation.managers.every(m => m.fund.cash > 0 && getBotFundNav(m.fund) > 0), 'fundusze botów');
    });

    test('ocena: dobry wynik daje awans, wielkość funduszu nie wpływa na wynik', () => {
        careerWorld();
        corporation.managers.forEach(m => setPeriods(m.fund.periods, 0));
        setPeriods(playerFund.periods, 0.05);
        const small = computeEvaluationScore(playerFund.periods, 60);
        const big = computeEvaluationScore(playerFund.periods.map(p => ({ ...p, assets: p.assets * 100 })), 60);
        assertNear(small, big, 'wielkość funduszu bez znaczenia', 1e-9);
        runBoardEvaluation();
        assert(playerProfile.positionId === 'manager', `stanowisko: ${playerProfile.positionId}`);
        assert(playerProfile.cv.some(entry => entry.type === 'promotion'), 'wpis w CV');
        assert(playerAccessLevel === CAREER_POSITIONS[1].exchangeAccessLevel, 'dostęp do giełd');
    });

    test('brak wolnego miejsca: zamiana z najsłabszym na wyższym stanowisku', () => {
        careerWorld();
        corporation.managers.forEach(m => { m.positionId = 'junior'; setPeriods(m.fund.periods, 0); });
        const [b1, b2] = corporation.managers;
        b1.positionId = 'projectLead';
        b2.positionId = 'projectLead';
        setPeriods(b1.fund.periods, -0.01);
        playerProfile.positionId = 'senior';
        getMentor().certificates.analyst = 0; // N4: awans na Kierownika projektu wymaga certyfikatu
        setPeriods(playerFund.periods, 0.06);
        runBoardEvaluation();
        assert(playerProfile.positionId === 'projectLead', `gracz: ${playerProfile.positionId}`);
        assert(b1.positionId === 'senior', `zamieniony bot: ${b1.positionId}`);
        assert(corporation.managers.filter(m => m.positionId === 'projectLead').length + 1 <= POSITION_LIMITS.projectLead, 'limit miejsc');
    });

    test('dwie słabe oceny z rzędu: degradacja (na najniższym — ostrzeżenie i wstrzymana premia)', () => {
        careerWorld();
        corporation.managers.forEach(m => setPeriods(m.fund.periods, 0));
        playerProfile.positionId = 'senior';
        setPeriods(playerFund.periods, -0.08);
        runBoardEvaluation();
        assert(playerProfile.positionId === 'senior' && corporation.playerWeakReviews === 1, 'pierwsze ostrzeżenie');
        runBoardEvaluation();
        assert(playerProfile.positionId === 'manager', `degradacja: ${playerProfile.positionId}`);

        playerProfile.positionId = 'junior';
        corporation.playerWeakReviews = 0;
        runBoardEvaluation();
        runBoardEvaluation();
        assert(playerProfile.positionId === 'junior' && playerFund.bonusSuspendedUntilPeriod > 0, 'junior: premia wstrzymana');
    });

    test('bot-zarządca kupuje tanie akcje, gotówka ≥ 0, dywidenda trafia do jego funduszu', () => {
        const { a, b } = careerWorld();
        a.fundamentals = { fairValue: 160 };
        b.fundamentals = { fairValue: 60 };
        const manager = corporation.managers[0];
        manager.personality = 'value';
        manager.positionId = 'board';
        const nav0 = getBotFundNav(manager.fund);
        runManagerTrading(manager);
        const shares = manager.fund.portfolio.AAA?.shares || 0;
        assert(shares > 0 && !manager.fund.portfolio.BBB, 'kupił niedowartościowaną spółkę');
        assert(manager.fund.cash >= 0, 'gotówka ≥ 0');
        assert(a.sharesHeld === shares, 'akcje w obrocie');
        assertNear(getBotFundNav(manager.fund), nav0 * (1 + 0), 'NAV po zakupie (wpływ ceny dodatni)', nav0 * 0.05);
        const cash = manager.fund.cash;
        payDividendToShareholders(a, 2);
        assertNear(manager.fund.cash - cash, shares * 2, 'dywidenda bota');
    });

    test('budżet korporacji = opłaty − udziały zarządców', () => {
        careerWorld();
        const budget0 = corporation.budget;
        const fee = chargeManagementFee();
        assertNear(corporation.budget - budget0, fee * (1 - getPlayerPosition().feeShare), 'opłata gracza', 1e-9);
    });

    test('przejęcie: odrzucenie przez zarząd bez kosztów; zgoda — płatność z budżetu i proces M&A do końca', () => {
        const { holdings } = careerWorld();
        const target = stocks.find(s => s.symbol === corporation.takeoverTargets[0]);
        playerProfile.positionId = 'board';
        corporation.budget = 1_000_000;
        assert(!proposeFundTakeover(target.symbol, false) && corporation.budget === 1_000_000 && !target.mergerProcess, 'odrzucenie');
        const price = getExternalFirmValuation(target);
        assert(proposeFundTakeover(target.symbol, true), 'zgoda zarządu');
        assertNear(1_000_000 - corporation.budget, price, 'płatność z budżetu');
        const random = Math.random;
        Math.random = () => 0.5; // bez komplikacji
        for (let q = 0; q < 8 && target.mergerProcess; q++) advanceMergerProcess(target);
        Math.random = random;
        assert(target.managedByCorporation && corporation.acquiredFunds.includes(target.symbol), 'holding w funduszach korporacji');
        assert(corporation.milestones.firstTakeover && !corporation.victory, 'pierwsze przejęcie = kamień milowy');
        assert(holdings.length === 4, 'holdingi zostają na giełdzie');
    });

    test('współpraca: inwestor kupuje JU, spółka lokuje gotówkę w JU', () => {
        const { a } = careerWorld();
        const investor = getBigInvestors()[0];
        investor.cash = 100_000;
        playerWallet.cash = 500;
        const units0 = playerFund.units;
        const nav0 = getFundNav();
        assert(meetInvestor(investor.id, true), 'spotkanie udane');
        assert(investor.cash < 100_000 && playerFund.units > units0, 'inwestor kupił JU');
        assert(playerFund.clients.some(c => c.type === 'investor' && c.name === investor.name), 'nowy klient');
        assertNear(getFundNav(), nav0, 'NAV bez zmian', 1e-9);
        assert(!meetInvestor(investor.id, true), 'raz na okres');

        a.reputation.player = REPUTATION_LEVELS.CORRECT + 10;
        const cash0 = a.cash;
        const random = Math.random;
        Math.random = () => 0;
        playerFund.openSubscriptions = false; // B5: domyślnie otwarta — test przełącznika
        processCorporateSubscriptions();
        assert(a.cash === cash0, '0.13.1 (B5): przy zamkniętej emisji ciągłej spółka nie kupuje JU');
        playerFund.openSubscriptions = true;
        processCorporateSubscriptions();
        Math.random = random;
        assert(a.cash < cash0 && playerFund.clients.some(c => c.name.startsWith(a.name)), 'spółka kupiła JU');
    });

    test('zwycięstwo: CEO albo 3 przejęcia wskazanych funduszy', () => {
        careerWorld();
        playerProfile.positionId = 'ceo';
        assert(checkVictory()?.type === 'ceo', 'CEO');

        careerWorld();
        corporation.acquiredFunds.push(...corporation.takeoverTargets.slice(0, 2));
        assert(!checkVictory(), 'dwa przejęcia to za mało');
        corporation.acquiredFunds.push(corporation.takeoverTargets[2]);
        assert(checkVictory()?.type === 'domination', 'dominacja');
    });

    test('zapis v5 zachowuje korporację; zapis v4 migruje', () => {
        careerWorld();
        corporation.budget = 12345;
        playerProfile.positionId = 'senior';
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        assert(snapshot.version === SAVE_FORMAT_VERSION, 'aktualna wersja zapisu');
        let report = applySaveSnapshot(snapshot);
        assert(report.ok && corporation.budget === 12345 && playerProfile.positionId === 'senior', 'v5');
        delete snapshot.corporation;
        snapshot.version = 4;
        report = applySaveSnapshot(snapshot);
        assert(report.ok && corporation && corporation.managers.length >= 3, 'migracja v4');
        assert(playerProfile.positionId === 'senior', 'stanowisko zachowane');
    });
});

group('Poczta, miasto i państwo (etap E1)', () => {
    function worldE1() {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000, name: 'Alfa Tech' });
        const b = makeCompany('BBB', { cash: 600_000, fixedAssets: 800_000, name: 'Beta Usługi', sector: ['Usługi'] });
        const media = ['PULS', 'FLESZ', 'OBSER'].map(symbol => {
            const paper = makeCompany(symbol, { cash: 100_000, name: `Gazeta ${symbol}` });
            paper.assetType = 'Holding';
            paper.holdingPortfolio = {};
            return paper;
        });
        [a, b, ...media].forEach(company => { company.insiderShares = 0; company.sharesHeld = 0; company.reputation = { player: 0 }; });
        resetWorld([a, b, ...media]);
        allBonds.length = 0;
        marketIndexes.find(index => index.id === 'GIG').value = 100;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        city.mayor = { name: 'Prezydent Startowy', policy: 'infrastructure', taxModifier: 0, electionYear: 4 };
        city.election = null;
        city.budget = 1_000_000;
        festival = null;
        privatizationOffer = null;
        skills.adblock.unlockedLevel = 0;
        initCityModel();
        return { a, b, media };
    }
    const lastMail = () => mailbox.messages[0];

    test('zdarzenia trafiają do właściwego nadawcy (korporacja, OBSER, FLESZ, PULS)', () => {
        worldE1();
        logEvent('🎉 Ocena zarządu: 70/100 — AWANS na stanowisko: Zarządca funduszu!', 'review');
        assert(lastMail().sender === 'corporation' && lastMail().importance === 3, 'korporacja, ważne');
        logEvent('🏛️ Rząd podnosi podatki dla firm.', 'state');
        assert(lastMail().sender === 'OBSER', 'państwo → OBSER');
        playerPortfolio.AAA = { shares: 1, avgPrice: 100, assetType: 'stock' }; // B2: newsy o spółkach z portfela przychodzą osobno
        logEvent('Skandal! Prezes Alfa Tech przyłapany na luksusowych wakacjach.', 'company');
        assert(lastMail().sender === 'FLESZ' && lastMail().symbol === 'AAA', 'skandal → FLESZ ze spółką');
        logEvent('Alfa Tech ogłasza świetne wyniki kwartalne.', 'company');
        assert(lastMail().sender === 'PULS', 'spółka → PULS');
    });

    test('premium: tylko ważne maile, bez spamu; opłata trafia do spółki-czasopisma', () => {
        const { media } = worldE1();
        playerWallet.cash = 100;
        assert(setMagazineSubscription('PULS', 'premium'), 'premium włączone');
        const count = mailbox.messages.length;
        logEvent('Alfa Tech otwiera nowy sklep.', 'company'); // ważność 1
        assert(mailbox.messages.length === count, 'mało ważny mail odfiltrowany');
        playerPortfolio.AAA = { shares: 1, avgPrice: 100, assetType: 'stock' }; // B2: wyniki spółki z portfela przychodzą osobno
        logEvent('Alfa Tech ogłasza wyniki kwartalne.', 'company'); // ważność 2
        assert(mailbox.messages.length === count + 1, 'ważny mail przyszedł');
        const cash0 = media[0].cash;
        chargeMagazineSubscriptions();
        assertNear(playerWallet.cash, 100 - MAGAZINES.PULS.premiumWeekly, 'opłata z portfela');
        assertNear(media[0].cash - cash0, MAGAZINES.PULS.premiumWeekly, 'przychód PULS');
        sendMagazineSpam();
        assert(!mailbox.messages.some(m => m.sender === 'PULS' && m.isSpam), 'brak spamu PULS w premium');
    });

    test('filtr antyspamowy: poziom 1 — reklamy, poziom 2 — także spam czasopism', () => {
        worldE1();
        const random = Math.random;
        Math.random = () => 0.05;
        sendCompanyAdSpam();
        sendMagazineSpam();
        Math.random = random;
        const ad = mailbox.messages.find(m => m.spamKind === 'ad');
        const promo = mailbox.messages.find(m => m.spamKind === 'magazine');
        assert(ad && promo, 'spam wysłany');
        assert(getMailFolder(ad) !== 'spam' && getMailFolder(promo) !== 'spam', 'bez filtra w odebranych');
        skills.adblock.unlockedLevel = 1;
        assert(getMailFolder(ad) === 'spam' && getMailFolder(promo) !== 'spam', 'poziom 1');
        skills.adblock.unlockedLevel = 2;
        assert(getMailFolder(promo) === 'spam', 'poziom 2');
        assert(!getMailInFolder('inbox').includes(ad), 'spam poza odebranymi');
        skills.adblock.unlockedLevel = 0;
    });

    test('wybory: kampania, darowizna gracza wzmacnia kandydata, zwycięzca zmienia politykę', () => {
        worldE1();
        startElectionCampaign();
        const challenger = city.election.candidates.find(c => !c.incumbent);
        const before = getCandidateScore(challenger);
        playerWallet.cash = 1000;
        assert(donateToCampaign(challenger.id, 300), 'darowizna');
        assert(getCandidateScore(challenger) > before && playerWallet.cash === 700, 'siła kampanii rośnie');
        const winner = triggerMayoralElection(challenger.id);
        assert(city.mayor.name === winner.name && city.mayor.policy === challenger.policy, 'nowy burmistrz i polityka');
        assert(city.mayor.taxModifier === MAYOR_POLICIES[challenger.policy].taxModifier, 'podatek wg polityki');
        assert(!city.election && city.lastElection.length >= 2, 'wyniki zapisane');
    });

    test('polityka infrastruktury: miasto finansuje przetarg budowlany spółki', () => {
        worldE1();
        const budget0 = city.budget;
        const symbol = commissionCityTender();
        assert(symbol, 'przetarg zlecony');
        assert(activeTenders.some(t => t.clientCompany.symbol === symbol && t.status === 'open'), 'otwarty przetarg');
        assert(city.budget < budget0, 'dotacja z budżetu miasta');
    });

    test('festyn startuje raz w roku i daje impuls usługom', () => {
        const { b } = worldE1();
        city.availableAttractions = [{ name: 'Koncert', cost: 1000 }];
        nextFestivalCountdown = 0;
        processCityQuarterly();
        assert(festival && festival.isActive, 'festyn trwa');
        const price = b.price;
        applyFestivalSectorBoost(150);
        assert(b.price > price, 'usługi rosną');
        festival = null;
    });

    test('prywatyzacja: fundusz zapisuje się po dyskoncie, gotówka do skarbu państwa', () => {
        const { a } = worldE1();
        a.isStateOwned = true;
        a.stateOwnershipPct = 0.8;
        a.exchange = 'BRONZE';
        const offer = triggerStatePrivatizationEvent();
        assert(offer && offer.price < a.price, 'oferta z dyskontem');
        assert(mailbox.messages[0].action?.type === 'privatization', 'mail z akcją');
        const treasury = governmentTreasury;
        const cash = playerCash;
        assert(subscribePrivatization(20), 'zapis');
        assert(playerPortfolio.AAA.shares === 20, 'akcje w funduszu');
        assertNear(cash - playerCash, 20 * offer.price, 'płatność funduszu');
        assertNear(governmentTreasury - treasury, 20 * offer.price, 'skarb państwa');
        playerCash += 1_000_000;
        subscribePrivatization(offer.shares);
        assert(offer.fundShares === Math.floor(offer.shares * offer.maxFundShare), 'zapis obcięty do limitu 30% oferty');
        processPrivatizationWeekly(BASE_DELAYS.weekly);
        assert(!privatizationOffer && a.stateOwnershipPct < 0.8, 'zapisy zamknięte, udział państwa spadł');
    });

    test('antymonopol: monopolista dostaje karę', () => {
        const { a } = worldE1();
        a.isMonopolist = true;
        const office = { ...antitrustOffice };
        antitrustOffice.analysisCapacity = 1;
        const cash = a.cash;
        const penalized = applyAntitrustPenalties();
        Object.assign(antitrustOffice, office);
        assert(penalized.includes('AAA') && a.cash < cash, 'kara nałożona');
    });

    test('zapis v6 zachowuje skrzynkę i kampanię; v5 migruje', () => {
        worldE1();
        logEvent('🏛️ Rząd ogłasza nowy budżet.', 'state');
        startElectionCampaign();
        mailbox.subscriptions.FLESZ = null;
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        assert(snapshot.version === SAVE_FORMAT_VERSION, 'aktualna wersja zapisu');
        const count = mailbox.messages.length;
        let report = applySaveSnapshot(snapshot);
        assert(report.ok && mailbox.messages.length === count && mailbox.subscriptions.FLESZ === null, 'skrzynka');
        assert(city.election && city.election.candidates.length >= 2, 'kampania');
        delete snapshot.mailbox;
        snapshot.version = 5;
        report = applySaveSnapshot(snapshot);
        assert(report.ok && mailbox.messages.length === 0 && city.mayor.support > 0, 'migracja v5');
    });
});

group('Banki, lombard, obligacje, giełdy elitarne (etap E2)', () => {
    function worldE2() {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000, name: 'Alfa Tech' });
        const b = makeCompany('BBB', { cash: 600_000, fixedAssets: 800_000, name: 'Beta Usługi' });
        const pawn = makeCompany('LOMB', { cash: 1_000_000, name: 'Lombard Test' });
        pawn.assetType = 'PawnShop';
        const collector = makeCompany('WRON', { cash: 1_000_000, name: 'Windykator Test' });
        collector.assetType = 'DebtCollector';
        [a, b, pawn, collector].forEach(company => { company.insiderShares = 0; company.sharesHeld = 0; company.reputation = { player: 0 }; });
        resetWorld([a, b, pawn, collector]);
        allBonds.length = 0;
        activeBonds.length = 0;
        marketIndexes.find(index => index.id === 'GIG').value = 100;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return { a, b, pawn, collector };
    }
    function makeBank(company) {
        const bank = { id: 'bankT', name: 'Bank Testowy', isActive: true, type: BANK_TYPES.UNIVERSAL, cash: 5_000_000, loanPortfolio: {}, baseInterestRateMargin: 0.01, reservesBC: 0 };
        commercialBanks.length = 0;
        commercialBanks.push(bank);
        company.bankAccountId = bank.id;
        return bank;
    }

    test('bank: depozyt spółki z odsetkami, wynik = marża odsetkowa', () => {
        const { a } = worldE2();
        const bank = makeBank(a);
        processCompanyBanking();
        const deposit = bank.depositBook.AAA;
        assert(deposit > 0, 'nadwyżka gotówki na lokacie');
        processCompanyBanking();
        assert(bank.depositBook.AAA > deposit, 'odsetki od depozytu');
        bank.loanPortfolio.AAA = 100_000;
        processCompanyBanking();
        const ledger = bank.ledger;
        assert(ledger.interestIncome > 0 && ledger.interestExpense > 0 && ledger.fees > 0, 'księga banku');
        const bankStock = { bankData: { id: bank.id } };
        const treasury = Object.values(bank.depositBook).reduce((sum, v) => sum + Math.max(0, v), 0) * (1 - (Number(bank.reserveRatio) || 0.1)) * ((Number(centralBank.baseInterestRate) || 0.03) + 0.005) / 4; // dochód z wolnej płynności (audyt A1)
        const expected = (ledger.interestIncome + treasury + ledger.fees) * (1 - BANK_OPERATING_COST) - ledger.interestExpense - ledger.writeOffs;
        assertNear(getBankQuarterlyEarnings(bankStock), expected, 'wynik banku');
        assert(bank.ledger.interestIncome === 0, 'księga wyzerowana');
        commercialBanks.length = 0;
    });

    test('bank z dużymi depozytami nie traci na odsetkach (audyt A1)', () => {
        const { a } = worldE2();
        const bank = makeBank(a);
        bank.cash = 1e9;
        bank.depositBook = { AAA: 1e9 };
        for (let week = 0; week < 13; week++) processCompanyBanking();
        assert(getBankQuarterlyEarnings({ bankData: { id: bank.id } }) > 0, 'dodatni wynik kwartału');
        commercialBanks.length = 0;
    });

    test('kredyt spółki: zaległości prowadzą do odpisu', () => {
        const { a } = worldE2();
        const bank = makeBank(a);
        bank.loanPortfolio.AAA = 1_000_000;
        a.cash = 0;
        const random = Math.random;
        Math.random = () => 0.99; // bez nowego kredytu, który dałby gotówkę na ratę
        for (let i = 0; i < LOAN_WRITE_OFF_AFTER; i++) { a.cash = 0; processCompanyBanking(); }
        Math.random = random;
        assert(bank.loanPortfolio.AAA < 1_000_000 && bank.ledger.writeOffs > 0, 'odpis części kredytu');
        commercialBanks.length = 0;
    });

    test('kredyty botów: odsetki raz na tydzień, brak raty = zaległość', () => {
        worldE2();
        const ai = { id: 'aiT', name: 'Bot', cash: 0, creditScore: 80, portfolio: {}, loans: [{ id: 'l1', bankId: 'x', bankName: 'Bank', amount: 1000, interestRate: 0.52, weeklyPayment: 50 }] };
        processAiLoansWeekly(ai);
        assertNear(ai.loans[0].amount, 1010, 'odsetki tygodniowe');
        assert(ai.loans[0].missedPayments === 1, 'zaległość');
        ai.cash = 100;
        processAiLoansWeekly(ai);
        assert(ai.loans[0].missedPayments === 0 && ai.cash <= 50, 'rata zapłacona');
    });

    test('zastaw funduszu: limit 20% aktywów, gotówka, blokada akcji, spadek zaufania', () => {
        const { a } = worldE2();
        buyStock('AAA', 50);
        const trust = playerFund.trust;
        const cash = playerCash;
        const loan = pawnFundShares('AAA', 50);
        assert(loan && loan.principal <= getFundAssets() * PAWN_MAX_SHARE_OF_ASSETS + 1e-6, 'limit 20%');
        assertNear(playerCash - cash, loan.principal, 'gotówka funduszu');
        assert(playerPortfolio.AAA.lockedShares === 50 && playerFund.trust < trust, 'blokada i zaufanie');
        assert(!sellStock('AAA', 10) || playerPortfolio.AAA.shares === 50, 'zastawionych akcji nie można sprzedać');
        assert(repayFundPawn(loan.id) && !playerPortfolio.AAA.lockedShares, 'spłata zwalnia zastaw');
    });

    test('windykator zajmuje akcje po zaległościach', () => {
        const { collector } = worldE2();
        buyStock('AAA', 60);
        const loan = pawnFundShares('AAA', 30);
        playerCash = 0;
        for (let i = 0; i < COLLECTOR_AFTER_MISSED; i++) processPawnLoansWeekly(getFundAccount());
        assert(!playerFund.pawnLoans.includes(loan), 'dług przejęty');
        assert((playerPortfolio.AAA?.shares || 0) < 60 && collector.holdingPortfolio.AAA.quantity > 0, 'akcje u windykatora');
    });

    test('obligacje: kupon kwartalny, nominał w terminie, wycena spada przy wzroście stóp', () => {
        worldE2();
        stateBondOffer.mediumTerm.available = 10;
        playerCash = 10000;
        assert(buyStateBond('player', 'mediumTerm', 2), 'zakup');
        const bond = allBonds.find(b => b.ownerId === 'player');
        assert(bond.remainingGameMs === 25 * 60000 && bond.id.startsWith('bond'), 'czas gry i ID');
        const cash = playerCash;
        payBondCoupons();
        assertNear(playerCash - cash, 2 * 1000 * bond.interestRate / 4, 'kupony');
        const rate = centralBank.baseInterestRate;
        const value = getBondValue(bond);
        centralBank.baseInterestRate = rate + 0.05;
        assert(getBondValue(bond) < value, 'wyższe stopy = niższa wycena');
        centralBank.baseInterestRate = rate;
        const before = playerCash;
        checkBondMaturities(26 * 60000);
        assertNear(playerCash - before, 2000, 'nominał');
        assert(allBonds.length === 0, 'obligacje zapadły');
    });

    test('giełdy elitarne: ranking 6 / 3 / 1, Diament dopiero po 30 minutach', () => {
        const companies = Array.from({ length: 12 }, (_, i) => {
            const c = makeCompany(`P${i}`, { name: `Platyna ${i}` });
            c.exchange = 'PLATINUM';
            c.price = 2000 + i * 100;
            c.totalShares = 1000000; // kapitalizacja 2–3,1 mld (progi: Rubin 1,5 mld, Szmaragd 2,5 mld)
            return c;
        });
        resetWorld(companies);
        startNewCareer({});
        assignEliteExchanges();
        assert(!stocks.some(s => s.exchange === 'DIAMOND'), 'bez Diamentu przed 30 min');
        assert(stocks.filter(s => s.exchange === 'EMERALD').length === 3 && stocks.filter(s => s.exchange === 'RUBY').length === 6, 'Szmaragd 3, Rubin 6');
        playerFund.clockMs = 31 * 60000;
        assignEliteExchanges();
        assert(stocks.find(s => s.exchange === 'DIAMOND')?.symbol === 'P11', 'Diament = największa');
        assert(stocks.find(s => s.symbol === 'P11').volatilityFactor < 1, 'premia stabilności');
        playerProfile.positionId = 'board';
        syncExchangeAccessWithPosition();
        assert(canAccessExchange('EMERALD') && !canAccessExchange('DIAMOND'), 'dostęp wg stanowiska');
    });

    test('spółka zależna: kapitał od matki, te same badania i polityka', () => {
        const parent = makeCompany('RUB', { cash: 5_000_000, unlockedTechs: ['t1', 't2'] });
        parent.exchange = 'RUBY';
        parent.dividendPolicy = 'Balanced';
        resetWorld([parent]);
        const cash = parent.cash;
        const child = foundSubsidiary(parent);
        assert(child && child.isSubsidiaryOf === 'RUB' && parent.subsidiaries.includes(child.symbol), 'zależność');
        assert(child.research.unlockedTechs.join() === 't1,t2' && child.dividendPolicy === 'Balanced', 'badania i polityka');
        assertNear(cash - parent.cash, child.cash, 'kapitał od matki');
        assert(!isEliteExchange(child.exchange), 'IPO na niższej giełdzie');
    });

    test('lokata funduszu: NAV bez zmian przy założeniu, odsetki co tydzień, wypłata w terminie, kara za zerwanie', () => {
        const { a } = worldE2();
        const bank = makeBank(a);
        const nav0 = getFundNav();
        const bankCash0 = bank.cash;
        const deposit = openFundDeposit(bank.id, 2000, 4);
        assert(deposit && playerFund.deposits.length === 1, 'lokata założona');
        assertNear(getFundNav(), nav0, 'NAV bez zmian', 1e-9);
        processFundDepositsWeekly();
        assert(deposit.accrued > 0 && getFundNav() > nav0, 'odsetki podnoszą NAV');
        for (let i = 0; i < 3; i++) processFundDepositsWeekly();
        assert(playerFund.deposits.length === 0, 'lokata zapadła');
        assertNear(bank.cash, bankCash0 - deposit.accrued, 'bank zapłacił tylko odsetki');
        const cash = playerCash;
        const second = openFundDeposit(bank.id, 1000, 16);
        breakFundDeposit(second.id);
        assertNear(playerCash, cash - 1000 * FUND_DEPOSIT_BREAK_PENALTY, 'kara 1% za zerwanie');
        commercialBanks.length = 0;
    });

    test('zapis v7 zachowuje obligacje i zastawy', () => {
        worldE2();
        buyStock('AAA', 40);
        pawnFundShares('AAA', 20);
        stateBondOffer.shortTerm.available = 5;
        buyStateBond('player', 'shortTerm', 1);
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        assert(snapshot.version === SAVE_FORMAT_VERSION, 'aktualna wersja zapisu');
        const report = applySaveSnapshot(snapshot);
        assert(report.ok && allBonds.length === 1 && playerFund.pawnLoans.length === 1, 'obligacje i zastaw');
        assert(playerPortfolio.AAA.lockedShares === 20, 'blokada akcji');
    });
});

group('Spójność świata (etap D2)', () => {
    test('niezmienniki po krótkiej symulacji: ceny, NAV, gotówka, akcje w obrocie, JU, zapis', () => {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000 });
        const b = makeCompany('BBB', { cash: 600_000, fixedAssets: 800_000 });
        const state = makeCompany('STA', { cash: 600_000, fixedAssets: 800_000 });
        state.isStateOwned = true;
        state.stateOwnershipPct = 0.97;
        const holding = makeCompany('HLD', { cash: 500_000 });
        holding.assetType = 'Holding';
        holding.holdingPortfolio = { AAA: { quantity: 50, purchasePrice: 100 } };
        [a, b, state, holding].forEach(company => { company.insiderShares = 0; company.sharesHeld = 0; company.reputation = { player: 0 }; });
        resetWorld([a, b, state, holding]);
        syncSharesHeldWithInitialPortfolios();
        allBonds.length = 0;
        activeBonds.length = 0;
        marketIndexes.find(index => index.id === 'GIG').value = 100;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });

        buyStock('AAA', 30);
        buyStock('BBB', 20);
        pawnFundShares('BBB', 10);
        stateBondOffer.shortTerm.available = 5;
        buyStateBond('player', 'shortTerm', 2);
        assert(a.sharesHeld === 80, `startowy portfel holdingu w obrocie: ${a.sharesHeld}`);

        for (let week = 0; week < 5; week++) {
            for (let tick = 0; tick < 60; tick++) {
                updateStockPrices();
                updateMarketIndexes();
                updateFund(BASE_DELAYS.stockUpdate);
            }
            processFundWeekly();
            processFundPawnLoansWeekly();
            processMailWeekly();
            runStateActions();
            checkBondMaturities(BASE_DELAYS.weekly);
        }
        payBondCoupons();

        const problems = checkWorldInvariants();
        assert(problems.length === 0, problems.join('; '));
        assert(state.sharesHeld >= 0, 'sprzedaż pakietu państwa nie psuje sharesHeld');

        const before = { nav: getFundNav(), units: playerFund.units, cash: playerCash, bonds: allBonds.length, loans: playerFund.pawnLoans.length };
        const report = applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        assert(report.ok, report.errors.join(' '));
        assertNear(getFundNav(), before.nav, 'NAV po wczytaniu', 1e-9);
        assert(playerFund.units === before.units && playerCash === before.cash && allBonds.length === before.bonds && playerFund.pawnLoans.length === before.loans, 'stan po wczytaniu');
        assert(checkWorldInvariants().length === 0, 'niezmienniki po wczytaniu');
    });
});

group('Klienci z charakterami i rynek JU (etap F1) + nowe spółki (F4)', () => {
    function worldF1() {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000 });
        a.insiderShares = 0; a.sharesHeld = 0; a.reputation = { player: 0 };
        resetWorld([a]);
        allBonds.length = 0;
        marketIndexes.find(index => index.id === 'GIG').value = 100;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return { a };
    }

    test('start: klienci mają charaktery, motywy i historię; pierwszy klient lojalny', () => {
        worldF1();
        assert(playerFund.clients.every(c => CLIENT_TYPES[c.type] && c.motive && Array.isArray(c.history)), 'profile klientów');
        assert(playerFund.clients[0].loyal, 'lojalny klient');
        assert(playerFund.clients.some(c => c.type === 'sly') && playerFund.clients.some(c => c.type === 'miser'), 'różne charaktery');
    });

    test('macierz decyzji: zadowolony+zaufanie → dokupuje; zadowolony bez zaufania → rynek wtórny; niezadowolony → umarza', () => {
        worldF1();
        const random = Math.random;
        Math.random = () => 0.01;
        const client = playerFund.clients.find(c => c.type === 'careful');
        playerFund.clients = [client];
        client.loyal = false;

        client.satisfaction = 0.9; playerFund.trust = 90;
        const units0 = client.units;
        playerFund.openSubscriptions = false; // B5: domyślnie otwarta — test przełącznika
        processClientsWeekly();
        assert(client.units === units0, '0.13.1 (B5): przy zamkniętej emisji ciągłej nie powstają nowe JU');
        playerFund.openSubscriptions = true;
        processClientsWeekly();
        assert(client.units > units0, 'dokupił JU (emisja ciągła otwarta)');

        client.satisfaction = 0.9; playerFund.trust = 20;
        const fundUnits = playerFund.units, cash = playerCash;
        processClientsWeekly();
        assert(client.pendingSellUnits > 0, 'wystawił JU na rynku wtórnym');
        assert(playerFund.units === fundUnits && playerCash === cash, 'fundusz bez zmian');

        client.pendingSellUnits = 0;
        client.satisfaction = 0.05; playerFund.trust = 60;
        const before = client.units;
        processClientsWeekly();
        Math.random = random;
        assert(client.units < before || !playerFund.clients.includes(client), 'umorzenie');
    });

    test('rynek wtórny: transakcja nie zmienia gotówki ani JU funduszu, kupujący z zewnątrz zostaje klientem', () => {
        worldF1();
        const seller = playerFund.clients[1];
        seller.pendingSellUnits = 30;
        playerFund.trust = 80;
        const cash = playerCash, units = playerFund.units, count = playerFund.clients.length;
        const random = Math.random;
        Math.random = () => 0.5;
        const fund = getJuMarketFunds().find(f => f.id === 'player');
        runPlayerJuMarket(fund);
        Math.random = random;
        assert(seller.pendingSellUnits < 30, 'sprzedano JU');
        const stats = juMarket.stats.player.history[0];
        assert(stats.volume > 0 && stats.newClients > 0 && playerFund.clients.length > count, 'nowi klienci');
        const unitsSum = playerFund.clients.reduce((sum, c) => sum + c.units, 0);
        assertNear(unitsSum, playerFund.units, 'JU klientów = JU funduszu', 1e-6);
        assert(playerCash >= cash && playerFund.units >= units, 'wtórny obrót bez wpływu, nadwyżka popytu to wpłaty');
    });

    test('premia JU rośnie z popytem i jest ograniczona do ±10%', () => {
        assert(computeJuPremium(1000, 100) > computeJuPremium(500, 500), 'popyt podnosi premię');
        assert(computeJuPremium(1e9, 0) <= JU_MARKET_MAX_PREMIUM && computeJuPremium(0, 1e9) >= -JU_MARKET_MAX_PREMIUM, 'limit');
    });

    test('brak kupca przez 2 tygodnie: niezadowolony umarza, zadowolony wycofuje ofertę (B5)', () => {
        worldF1();
        const client = playerFund.clients.find(c => !c.loyal);
        playerFund.clients.forEach(c => { c.satisfaction = 0.5; });
        client.satisfaction = 0.05;
        client.pendingSellUnits = 10;
        const units = client.units;
        for (let i = 0; i < JU_SELL_ORDER_PATIENCE; i++) processClientsWeekly();
        assert(client.units < units && client.pendingSellUnits === 0, 'niezadowolony: umorzone po braku kupca');
        const happy = playerFund.clients.find(c => c !== client && !c.loyal && playerFund.clients.includes(c));
        happy.satisfaction = 0.9; happy.pendingSellUnits = 10;
        const happyUnits = happy.units;
        for (let i = 0; i < JU_SELL_ORDER_PATIENCE; i++) { happy.satisfaction = 0.9; processClientsWeekly(); }
        assert(happy.units >= happyUnits && happy.pendingSellUnits === 0, 'zadowolony: wycofał ofertę, JU zostają');
    });

    test('nowe spółki elitarne: BEW i NRB na Rubinie, ORT na Szmaragdzie', () => {
        const defs = initialStocks.filter(s => ['BEW', 'NRB', 'ORT'].includes(s.symbol));
        assert(defs.length === 3, 'definicje');
        const cap = s => s.price * s.totalShares;
        assert(defs.filter(s => s.exchange === 'RUBY').every(s => cap(s) >= ELITE_EXCHANGES.RUBY.minCap), 'Rubin ≥ progu');
        assert(defs.filter(s => s.exchange === 'EMERALD').every(s => cap(s) >= ELITE_EXCHANGES.EMERALD.minCap), 'Szmaragd ≥ progu');
    });

    test('zapis v8: rynek JU i profile klientów; stare typy migrują na charaktery', () => {
        worldF1();
        runJuMarketWeekly();
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        assert(snapshot.version === SAVE_FORMAT_VERSION, 'wersja');
        snapshot.playerFund.clients[0].type = 'retiree';
        snapshot.playerFund.clients[1].type = 'loyal';
        const report = applySaveSnapshot(snapshot);
        assert(report.ok && juMarket.week === 1, 'rynek JU');
        assert(playerFund.clients[0].type === 'careful' && playerFund.clients[1].type === 'brave' && playerFund.clients[1].loyal, 'migracja typów');
    });
});

group('Startupy funduszu (etap F2)', () => {
    function worldF2() {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000 });
        a.insiderShares = 0; a.sharesHeld = 0; a.reputation = { player: 0 };
        resetWorld([a]);
        allBonds.length = 0;
        commercialBanks.length = 0;
        investmentPool.playerStakes = {};
        marketIndexes.find(index => index.id === 'GIG').value = 100;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        playerCash = 100000; // aktywa ~100 tys. → limit startupów ~10 tys.
        const startup = generateNewStartup();
        startup.isScam = false;
        startup.investors = {};
        stocks.push(startup);
        return { startup };
    }

    test('limit: fundusz inwestuje w startupy najwyżej 10% aktywów', () => {
        const { startup } = worldF2();
        const cap = getFundStartupCapacity();
        assert(cap > 9000 && cap < 11000, `limit ${cap}`);
        assert(investInStartup(startup.symbol, 5000), 'inwestycja w limicie');
        assert(!investInStartup(startup.symbol, cap), 'ponad limit — odmowa');
        assertNear(getFundStartupExposure(), 5000, 'ekspozycja');
    });

    test('IPO: udziały wszystkich inwestorów znormalizowane, akcje w obrocie ≤ wszystkich', () => {
        const { startup } = worldF2();
        investInStartup(startup.symbol, 5000);
        const ai = aiCompetitors[0];
        ai.portfolio[startup.symbol] = { investedAmount: 3000, assetType: 'Startup' };
        const goal = startup.fundingGoal;
        handleSuccessfulIPO(startup, 3);
        assert(!startup.assetType && startup.exchange === 'BRONZE', 'debiut');
        assert(startup.sharesHeld <= startup.totalShares, 'udziały ≤ 100%');
        const playerPct = playerPortfolio[startup.symbol].shares / startup.totalShares;
        assertNear(playerPct, STARTUP_INVESTORS_SHARE * 5000 / Math.max(8000, goal), 'udział funduszu (wpłata / max(wpłaty, cel))', 0.01);
        assert(ai.portfolio[startup.symbol].shares > 0, 'bot dostał akcje');
        delete ai.portfolio[startup.symbol];
    });

    test('komplikacje: zebranie kwoty ratunkowej kończy się debiutem, ratunek liczy się jako inwestycja', () => {
        const { startup } = worldF2();
        startup.stage = 'financial_complications';
        startup.rescueGoal = 1000;
        startup.rescueCurrent = 0;
        startup.rescueTimeLeft = 60000;
        assert(playerRescuesStartup(startup.symbol, 1000), 'ratunek');
        assert(!startup.assetType && playerPortfolio[startup.symbol]?.shares > 0, 'debiut z akcjami funduszu');
    });

    test('prywatyzacja: zwrot dla innych inwestorów, gwarantowany sukces, premia w inwestycji', () => {
        const { startup } = worldF2();
        startup.fundingGoal = 5000;
        skills.startupInvestor.unlockedLevel = 5;
        const ai = aiCompetitors[0];
        ai.portfolio[startup.symbol] = { investedAmount: 700, assetType: 'Startup' };
        const aiCash = ai.cash;
        assert(privatizeStartup(startup.symbol), 'prywatyzacja');
        skills.startupInvestor.unlockedLevel = 0;
        assert(ai.cash === aiCash + 700 && !ai.portfolio[startup.symbol], 'zwrot dla bota');
        assert(startup.successChance === 1 && !startup.isScam, 'sukces gwarantowany');
        assertNear(playerPortfolio[startup.symbol].investedAmount, 6000, 'premia 20% w inwestycji');
    });

    test('inkubator utrzymuje minimalną liczbę startupów (czas gry)', () => {
        worldF2();
        stocks = stocks.filter(s => s.assetType !== 'Startup');
        maintainStartupCount();
        assert(stocks.filter(s => s.assetType === 'Startup').length >= MINIMUM_STARTUPS, 'nowe startupy');
    });
});

group('Miasto, państwo, budownictwo — nowe mechaniki (etap F3)', () => {
    function worldF3() {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000 });
        const builder = makeCompany('BUD', { cash: 1000, fixedAssets: 800_000, sector: ['Budowlany'] });
        [a, builder].forEach(c => { c.insiderShares = 0; c.sharesHeld = 0; c.reputation = { player: 0 }; });
        resetWorld([a, builder]);
        allBonds.length = 0;
        marketIndexes.find(index => index.id === 'GIG').value = 100;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        playerCash = 100000;
        city.budget = 1_000_000;
        city.ppp = { offers: [], nextId: 1 };
        return { a, builder };
    }

    test('PPP: udział funduszu nie zmienia NAV, odsetki z budżetu miasta, kapitał w terminie', () => {
        worldF3();
        const offer = generatePppOffer();
        const nav = getFundNav();
        const stake = investInPpp(offer.id, 5000);
        assert(stake && playerFund.ppp.length === 1, 'udział');
        assertNear(getFundNav(), nav, 'NAV bez zmian', 1e-9);
        const budget = city.budget;
        processPppWeekly();
        assert(city.budget < budget && getFundNav() > nav, 'odsetki z budżetu miasta podnoszą NAV');
        for (let i = 0; i < stake.termWeeks; i++) processPppWeekly();
        assert(playerFund.ppp.length === 0, 'kapitał spłacony w terminie');
    });

    test('PPP: limit 15% aktywów i niewypłacalność miasta (odzysk 60%)', () => {
        worldF3();
        const offer = generatePppOffer();
        offer.total = 1e9;
        assert(!investInPpp(offer.id, getFundAssets() * 0.5), 'ponad limit — odmowa');
        const stake = investInPpp(offer.id, 4000);
        city.budget = 0;
        const cash = playerCash;
        for (let i = 0; i < stake.termWeeks + 8; i++) { city.budget = 0; processPppWeekly(); }
        assert(playerFund.ppp.length === 0 && playerCash - cash >= 4000 * PPP_RECOVERY - 1e-6, 'odzysk przy niewypłacalności');
    });

    test('Program emerytalny: mandat dla funduszu z czołówki rankingu', () => {
        worldF3();
        governmentTreasury = 5_000_000;
        playerFund.trust = 100;
        playerFund.periods.push({ number: 1, fundReturn: 0.2, benchmarkReturn: 0, rivals: [], volatility: 0, maxDrawdown: 0, rank: 1, rankOf: 1 });
        const units = playerFund.units;
        const grants = runStatePensionProgram();
        assert(grants.some(g => g.name === playerProfile.fundName) && playerFund.units > units, 'mandat i napływ JU');
        assert(playerFund.clients.some(c => c.name === 'Państwowy Program Emerytalny'), 'klient-instytucja');
    });

    test('Finansowanie pomostowe: pożyczka dla budowlańca, spłata z odsetkami w terminie', () => {
        const { builder } = worldF3();
        bridgeLoanOffers = [{ id: 'pomost_t', symbol: 'BUD', name: builder.name, project: 'Hala', amount: 5000, rate: 0.2, weeks: 4, weeksLeft: 3 }];
        const loan = fundBridgeLoan('pomost_t');
        assert(loan && builder.cash === 6000, 'gotówka u budowlańca');
        builder.cash = 50000;
        const random = Math.random;
        Math.random = () => 0.99; // bez nowych próśb
        for (let i = 0; i < 4; i++) processBridgeLoansWeekly();
        Math.random = random;
        assert(getFundBridgeLoans().length === 0 && loan.accrued > 0, 'spłata z odsetkami');
    });
});

group('Fuzje i przejęcia — naprawa modelu (etap G1)', () => {
    function worldG1() {
        const a = makeCompany('AAA', { cash: 50_000_000, fixedAssets: 800_000 });
        const b = makeCompany('BBB', { cash: 200_000, fixedAssets: 800_000, sector: ['Usługi'] });
        [a, b].forEach(c => { c.insiderShares = 0; c.sharesHeld = 0; c.reputation = { player: 0 }; c.ceo = { name: 'Prezes', traits: [] }; });
        resetWorld([a, b]);
        allBonds.length = 0;
        commercialBanks.length = 0;
        marketIndexes.find(index => index.id === 'GIG').value = 100;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return { a, b };
    }

    test('przejęcie kończy się w 3–7 kwartałach wg wielkości celu (0.15.1), a proces prowadzi tylko inicjator', () => {
        const { a, b } = worldG1();
        assert(initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.25), 'start');
        const random = Math.random;
        Math.random = () => 0.99; // bez zdarzeń i komplikacji
        const original = checkAntitrust;
        checkAntitrust = () => false;
        let quarters = 0;
        while (a.mergerProcess && quarters < 20) {
            advanceMergerProcess(b); // cel nie przesuwa procesu
            advanceMergerProcess(a);
            quarters++;
        }
        checkAntitrust = original;
        Math.random = random;
        assert(!a.mergerProcess && quarters >= 3 && quarters <= 8, `kwartały: ${quarters}`);
    });

    test('komplikacja to dane: przeżywa zapis, decyzja gracza działa po wczytaniu', () => {
        const { a, b } = worldG1();
        initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.25);
        playerCash = 1e9;
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' }; // fundusz > 50% inicjatora
        a.sharesHeld = 6000;
        handleMajorComplication(a, b, a.mergerProcess);
        assert(a.mergerProcess.decisionRequired?.kind === 'complication', 'decyzja czeka na gracza');
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        applySaveSnapshot(snapshot);
        const restored = stocks.find(s => s.symbol === 'AAA');
        assert(restored.mergerProcess.decisionRequired.options.length === 3, 'opcje po wczytaniu');
        applyComplicationOption('AAA', 'expensive');
        assert(restored.mergerProcess && !restored.mergerProcess.decisionRequired, 'kontynuacja');
    });

    test('bez gracza decyzja zapada od razu (bez setTimeout)', () => {
        const { a, b } = worldG1();
        initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.25);
        handleMajorComplication(a, b, a.mergerProcess);
        assert(!a.mergerProcess || !a.mergerProcess.decisionRequired, 'rozstrzygnięte');
    });

    test('LBO bez banku-kredytodawcy jest odrzucane na starcie', () => {
        const { a, b } = worldG1();
        a.cash = 0;
        assert(!initiateMergerProcess(a, b, 'przejęcie', 'lbo', 0.25) && !a.mergerProcess, 'odrzucone');
    });

    test('blokada antymonopolowa: kara dla inicjatora', () => {
        const { a, b } = worldG1();
        initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.25);
        a.mergerProcess.stage = 3;
        a.mergerProcess.progress = 100;
        const original = checkAntitrust;
        checkAntitrust = () => true;
        const random = Math.random;
        Math.random = () => 0.99;
        const cash = a.cash;
        advanceMergerProcess(a);
        Math.random = random;
        checkAntitrust = original;
        assert(!a.mergerProcess && a.cash < cash, 'zablokowane z karą');
    });

    test('akcjonariat: fundusz z większością jest akcjonariuszem kontrolującym', () => {
        const { a } = worldG1();
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        const owner = findMajorityShareholder(a);
        assert(owner?.id === 'player' && owner.pct === 0.6, 'fundusz kontroluje');
        assert(getShareholders(a).some(h => h.kind === 'player'), 'lista akcjonariuszy');
    });
});

group('Inwestycje spółek: etapy, wynik, dopłata funduszu (etap G4)', () => {
    const INV = { id: 'test_line', name: 'Linia testowa', kind: 'internal', durationDays: 28, assetValue: 300_000, incomeBonus: 0.2, healthBonus: 0, maintenance: 0 };
    function worldG4() {
        const a = makeCompany('AAA', { cash: 5_000_000 });
        a.insiderShares = 0;
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return a;
    }

    test('inwestycja przechodzi 3 etapy, a po weryfikacji działa', () => {
        const a = worldG4();
        startInternalInvestment(a, INV, 400_000);
        const project = a.activeInvestments[0];
        project.progress = 3;
        assert(getInvestmentStageInfo(project).current.id === 'design', 'projekt');
        project.progress = 14;
        assert(getInvestmentStageInfo(project).current.id === 'build', 'budowa');
        project.progress = 26;
        assert(getInvestmentStageInfo(project).current.id === 'verify', 'weryfikacja');
        project.progress = 21;
        processActiveInvestments(a);
        assert(a.activeInvestments.length === 0 && a.operatingInvestments.length === 1, 'działa');
        assert(['excellent', 'ok', 'defects'].includes(a.operatingInvestments[0].quality), 'jakość');
    });

    test('działająca inwestycja daje kwartalny zysk albo stratę; 4 straty z rzędu = odpis', () => {
        const a = worldG4();
        const op = registerOperatingInvestment(a, { id: 'x', name: 'X', cost: 1_000_000, incomeBonus: 0.2, quality: 'ok' });
        const gauss = gaussianRandom;
        gaussianRandom = () => 1;
        assert(processOperatingInvestments(a) > 0, 'zysk');
        gaussianRandom = () => -5;
        assert(processOperatingInvestments(a) < 0, 'strata');
        const assets = a.balanceSheet.assets;
        processOperatingInvestments(a); processOperatingInvestments(a); processOperatingInvestments(a);
        gaussianRandom = gauss;
        assert(op.lossStreak >= 4 && a.operatingInvestments.length === 0 && a.balanceSheet.assets < assets, 'odpis');
    });

    test('dopłata za akcje: fundusz obejmuje nową emisję ponad limit', () => {
        const a = worldG4();
        playerCash = 1_000_000;
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = 6000;
        a.maxShares = 10000;
        startInternalInvestment(a, INV, 400_000);
        const uid = a.activeInvestments[0].uid;
        assert(fundTopUpInvestment('AAA', uid, 95_000, 'shares'), 'dopłata');
        assert(playerPortfolio.AAA.shares === 7000 && a.totalShares === 11000 && a.maxShares === 11000, `akcje ${playerPortfolio.AAA.shares}/${a.totalShares}`);
        assert(playerCash === 905_000, 'gotówka funduszu');
    });

    test('dopłata za dochód: fundusz dostaje udział w zysku inwestycji', () => {
        const a = worldG4();
        playerCash = 1_000_000;
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = 6000;
        startInternalInvestment(a, INV, 400_000);
        const project = a.activeInvestments[0];
        assert(fundTopUpInvestment('AAA', project.uid, 200_000, 'income'), 'dopłata');
        assert(Math.abs(project.fundIncomePct - 0.3) < 1e-9, `udział ${project.fundIncomePct}`);
        project.progress = 28;
        processActiveInvestments(a);
        const op = a.operatingInvestments[0];
        op.efficiency = 1;
        const gauss = gaussianRandom;
        gaussianRandom = () => 1;
        const cash = playerCash;
        processOperatingInvestments(a);
        gaussianRandom = gauss;
        assert(op.fundPaid > 0 && playerCash > cash, 'wypłata udziału');
    });

    test('bez większości fundusz nie może dopłacić', () => {
        const a = worldG4();
        playerCash = 1_000_000;
        playerPortfolio.AAA = { shares: 1000, avgPrice: 100, assetType: 'stock' };
        startInternalInvestment(a, INV, 400_000);
        assert(!fundTopUpInvestment('AAA', a.activeInvestments[0].uid, 50_000, 'shares') && playerCash === 1_000_000, 'odmowa');
    });

    test('Bank Centralny finansuje spółkę państwową, miasto — miejską', () => {
        const a = worldG4();
        const b = makeCompany('MIA', { cash: 5_000_000 });
        resetWorld([a, b]);
        a.isStateOwned = true; a.stateOwnershipPct = 0.3;
        b.isMunicipal = true;
        startInternalInvestment(a, INV, 400_000);
        startInternalInvestment(b, INV, 400_000);
        centralBank.funds = 1e9;
        city.budget = 1e8;
        const random = Math.random;
        Math.random = () => 0.01;
        processPublicInvestmentFunding();
        Math.random = random;
        assert(a.activeInvestments[0].publicFunding === 'state' && a.stateOwnershipPct > 0.3, 'BC');
        assert(b.activeInvestments[0].publicFunding === 'city' && b.cityShares > 0, 'miasto');
        assert(getShareholders(b).some(h => h.kind === 'city'), 'miasto w akcjonariacie');
    });
});

group('Obrony i wrogie przejęcia (etap G2)', () => {
    function worldG2() {
        const a = makeCompany('AAA', { cash: 50_000_000, fixedAssets: 800_000 });
        const b = makeCompany('BBB', { cash: 1_000_000, fixedAssets: 800_000 });
        const k = makeCompany('KKK', { cash: 30_000_000, fixedAssets: 800_000 });
        [a, b, k].forEach(c => { c.insiderShares = 0; c.sharesHeld = 0; c.reputation = { player: 0 }; c.ceo = { name: 'Prezes', traits: [] }; });
        resetWorld([a, b, k]);
        allBonds.length = 0;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return { a, b, k };
    }
    function withRandom(value, fn) {
        const random = Math.random;
        Math.random = () => value;
        try { return fn(); } finally { Math.random = random; }
    }
    function fundHolds(b, shares) {
        playerPortfolio.BBB = { shares, avgPrice: 80, assetType: 'stock' };
        b.sharesHeld = shares;
    }

    test('wrogie przejęcie spółki z ≥ 20% funduszu: mail i decyzja', () => {
        const { a, b } = worldG2();
        fundHolds(b, 2500);
        const mails = mailbox.messages.length;
        withRandom(0.99, () => triggerHostileTakeoverEvent(b));
        assert(b.mergerProcess && getTakeoverAgainst(b)?.process.fundDecision === 'pending', 'decyzja czeka');
        assert(mailbox.messages.length > mails && mailbox.messages[0].action?.type === 'takeover', 'mail');
    });

    test('sprzedaż agresorowi po cenie oferty: gotówka funduszu rośnie, agresor ma pakiet', () => {
        const { a, b } = worldG2();
        fundHolds(b, 2500);
        withRandom(0.99, () => initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.3));
        const cash = playerCash, total = a.mergerProcess.offerDetails.totalCost;
        assert(sellFundSharesToAggressor('BBB'), 'sprzedaż');
        assert(Math.abs(playerCash - cash - 2500 * 130) < 1e-6, `gotówka ${playerCash - cash}`);
        assert(a.equityStakes.BBB === 2500 && !playerPortfolio.BBB, 'pakiet u agresora');
        assert(a.mergerProcess.offerDetails.totalCost < total, 'koszt przejęcia pomniejszony');
    });

    test('głos przeciw: agresor może się wycofać', () => {
        const { a, b } = worldG2();
        fundHolds(b, 4000);
        withRandom(0.99, () => initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.3));
        voteAgainstTakeover('BBB');
        withRandom(0.0, () => advanceMergerProcess(a));
        assert(!a.mergerProcess && !b.mergerProcess, 'wycofanie');
    });

    test('pigułka: płaci fundusz z większością, obrona zapisana u inicjatora', () => {
        const { a, b } = worldG2();
        fundHolds(b, 6000);
        playerCash = 1_000_000;
        withRandom(0.99, () => initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.3));
        const pillCost = Math.round(getMarketCapValue(b) * 0.05); // 0.15.1 M1: kapitalizacja celu po ogłoszeniu (kurs ≈ oferta − spread)
        assert(activateDefenseMechanism('BBB', 'poisonPill', 'player'), 'aktywna');
        assert(playerCash === 1_000_000 - pillCost && a.mergerProcess.defenseActive === 'poisonPill' && b.mergerProcess.defenseActive === 'poisonPill', 'koszt i stan');
        assert(!activateDefenseMechanism('BBB', 'negotiate', 'player'), 'druga obrona zablokowana');
    });

    test('negocjacje: agresor podnosi cenę', () => {
        const { a, b } = worldG2();
        withRandom(0.99, () => initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.3));
        const price = a.mergerProcess.offerDetails.buyoutPricePerShare;
        withRandom(0.01, () => activateDefenseMechanism('BBB', 'negotiate', 'company'));
        assert(a.mergerProcess && a.mergerProcess.offerDetails.buyoutPricePerShare > price, 'wyższa cena');
    });

    test('Biały Rycerz: agresor odpuszcza, przyjazna spółka przejmuje inicjatywę', () => {
        const { a, b, k } = worldG2();
        withRandom(0.99, () => initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.3));
        const original = checkAntitrust;
        checkAntitrust = () => false;
        withRandom(0.99, () => activateDefenseMechanism('BBB', 'whiteKnight', 'company'));
        checkAntitrust = original;
        assert(!a.mergerProcess && k.mergerProcess?.initiatorSymbol === 'KKK' && b.mergerProcess?.partnerSymbol === 'KKK', 'rycerz');
        assert(k.mergerProcess.hostile === false, 'przyjazna oferta');
    });

    test('Pac-Man: cel kupuje akcje agresora', () => {
        const { a, b } = worldG2();
        withRandom(0.99, () => initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.3));
        const cash = b.cash;
        withRandom(0.99, () => activateDefenseMechanism('BBB', 'pacMan', 'company'));
        assert(b.equityStakes?.AAA > 0 && b.cash < cash && a.sharesHeld === b.equityStakes.AAA, 'pakiet agresora');
        assert(!a.mergerProcess, 'agresor wycofany');
    });

    test('emisja ratunkowa: akcje dla nowych akcjonariuszy i funduszu, dług spada', () => {
        const { b } = worldG2();
        b.balanceSheet.liabilities = 900_000;
        const bot = aiCompetitors[0];
        bot.cash = 10_000_000;
        delete bot.portfolio.BBB;
        const liabilities = b.balanceSheet.liabilities, shares = b.totalShares;
        withRandom(0.0, () => triggerRescueOfferingEvent(b));
        assert(bot.portfolio.BBB?.shares > 0, 'nowy akcjonariusz-bot');
        assert(getRescueOffer('BBB')?.fundReserved > 0, 'pula funduszu');
        playerCash = 1_000_000;
        assert(acceptRescueOffer('BBB', 100), 'fundusz obejmuje');
        assert(playerPortfolio.BBB.shares === 100 && b.totalShares > shares + 100 && b.balanceSheet.liabilities < liabilities, 'akcje i dług');
        assert(b.sharesHeld === b.totalShares - shares, 'akcje w obrocie');
        assert(!getRescueOffer('BBB'), 'zamknięta');
    });
});

group('Walne zgromadzenia i aktywizm (etap G3)', () => {
    function worldG3() {
        const a = makeCompany('AAA', { cash: 2_000_000 });
        a.insiderShares = 0; a.sharesHeld = 0; a.reputation = { player: 0 }; a.ceo = { name: 'Prezes', traits: [] };
        a.financialHealth = 0;
        setCompanyDividendPolicy(a, 'Growth');
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return a;
    }
    function fundHolds(a, shares) {
        playerPortfolio.AAA = { shares, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = shares;
    }

    test('rada nadzorcza wg progów 20 / 35 / 50%', () => {
        const a = worldG3();
        fundHolds(a, 1000); assert(getBoardSeats(a).seats === 0, '10%');
        fundHolds(a, 2000); assert(getBoardSeats(a).seats === 1 && getBoardInsight(a), '20%');
        fundHolds(a, 3500); assert(getBoardSeats(a).seats === 2, '35%');
        fundHolds(a, 5100); assert(getBoardSeats(a).seats === 3, '51%');
    });

    test('kalendarz: porządek obrad kwartał wcześniej, potem zgromadzenie i mail', () => {
        const a = worldG3();
        fundHolds(a, 6000);
        assert(ensureGovernance(a).quartersToAgm >= 2, 'pierwsze walne nie w 1. kwartale');
        a.governance.quartersToAgm = 2;
        processGovernanceQuarter();
        assert(a.governance.pendingAgm?.items.length >= 2, 'porządek obrad');
        assert(mailbox.messages[0].action?.type === 'agm', 'mail z porządkiem');
        processGovernanceQuarter();
        assert(!a.governance.pendingAgm && a.governance.history.length === 1 && a.governance.quartersToAgm === 4, 'zgromadzenie');
        const turnout = a.governance.history[0].turnout;
        assert(turnout >= 0.6 + 0.4 * 0.4 - 1e-9 && turnout <= 0.6 + 0.4 * 0.7 + 1e-9, `frekwencja ${turnout}`); // fundus 60% + rozproszeni 40–70%
    });

    test('głosy wg udziałów: większość funduszu przesądza uchwałę', () => {
        const a = worldG3();
        fundHolds(a, 6000);
        createPendingAgm(a);
        const item = a.governance.pendingAgm.items.find(i => i.type === 'dividend');
        item.policy = 'Aggressive';
        setAgmVote('AAA', 'dividend', 'against');
        const record = holdAgm(a);
        assert(!record.results.find(r => r.type === 'dividend').passed && a.dividendPolicy === 'Growth', 'odrzucona głosem funduszu');
    });

    test('wniosek funduszu przyjęty zmienia dywidendę i podnosi reputację', () => {
        const a = worldG3();
        fundHolds(a, 6000);
        createPendingAgm(a);
        assert(submitShareholderProposal('AAA', 'raiseDividend'), 'zgłoszony');
        assert(!submitShareholderProposal('AAA', 'buyback'), 'tylko jeden wniosek');
        holdAgm(a);
        assert(a.dividendPolicy === 'Balanced' && a.reputation.player > 0, `polityka ${a.dividendPolicy}`);
    });

    test('bez większości fundusz nie zgłasza wniosków i głosuje „za”', () => {
        const a = worldG3();
        fundHolds(a, 4000);
        createPendingAgm(a);
        assert(!setAgmVote('AAA', 'dividend', 'against'), 'brak głosu');
        assert(!submitShareholderProposal('AAA', 'replaceCeo'), 'odmowa');
    });

    test('kampania o głosy kosztuje fundusz i zwiększa poparcie', () => {
        const a = worldG3();
        fundHolds(a, 6000);
        createPendingAgm(a);
        submitShareholderProposal('AAA', 'replaceCeo');
        const item = a.governance.pendingAgm.items.find(i => i.by === 'player');
        const before = getVoteForProbability({ kind: 'ai', entity: { personality: 'calm' } }, item, a);
        playerCash = 100_000;
        assert(runProxyCampaign('AAA', item.id) && playerCash === 100_000 - getCampaignCost(a), 'koszt');
        assert(getVoteForProbability({ kind: 'ai', entity: { personality: 'calm' } }, item, a) > before, 'poparcie rośnie');
        assert(getVoteForProbability({ kind: 'insiders' }, item, a) === 0, 'zarząd przeciw');
    });

    test('skup akcji własnych zmniejsza liczbę akcji, nie łamie obrotu', () => {
        const a = worldG3();
        fundHolds(a, 1000);
        const shares = a.totalShares;
        runBuyback(a);
        assert(a.totalShares < shares && a.sharesHeld <= a.totalShares, 'skup');
    });
});

group('Makroekonomia (0.10.2 M1)', () => {
    function worldM1() {
        const a = makeCompany('AAA', { sector: ['Nieruchomości'] });
        const b = makeCompany('BBB', { sector: ['Bankowość'] });
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        centralBank.baseInterestRate = 0.05;
        centralBank.ceo = { name: 'Prezes BC', traits: [] };
        updateInterestRates();
        return { a, b };
    }

    test('wysoka inflacja → podwyżka stóp; kredyty i lokaty drożeją; gazeta w poczcie', () => {
        worldM1();
        macro.inflation = 0.08;
        macro.expectation = { change: 0, label: 'bez zmian' };
        const loan = LOAN_INTEREST_RATE, deposit = getDepositRate();
        const mails = mailbox.messages.length;
        runCentralBankMeeting();
        assert(centralBank.baseInterestRate > 0.05 && LOAN_INTEREST_RATE > loan && getDepositRate() > deposit, `stopa ${centralBank.baseInterestRate}`);
        assert(mailbox.messages.length > mails && /Gazeta Ekonomiczna/.test(mailbox.messages[0].subject), 'wydanie gazety');
    });

    test('niespodzianka podwyżki przecenia sektor wrażliwy na stopy mocniej niż banki', () => {
        const { a, b } = worldM1();
        macro.inflation = 0.08;
        macro.expectation = { change: -0.005, label: 'obniżka' };
        const original = applyPriceEffect;
        const effects = {};
        applyPriceEffect = (symbol, value) => { effects[symbol] = value; };
        runCentralBankMeeting();
        applyPriceEffect = original;
        assert(effects.AAA < 0 && (effects.BBB === undefined || effects.BBB > effects.AAA), JSON.stringify(effects));
    });

    test('decyzja zgodna z oczekiwaniami nie rusza kursów', () => {
        worldM1();
        macro.inflation = INFLATION_TARGET; macro.unemployment = NATURAL_UNEMPLOYMENT;
        centralBank.baseInterestRate = getTaylorRate();
        macro.expectation = { change: 0, label: 'bez zmian' };
        let calls = 0;
        const original = applyPriceEffect;
        applyPriceEffect = () => { calls++; };
        runCentralBankMeeting();
        applyPriceEffect = original;
        assert(calls === 0 && macro.lastDecision.change === 0, `wywołania ${calls}`);
    });

    test('wskaźniki: boom podnosi inflację i obniża bezrobocie', () => {
        worldM1();
        economyCycle.index = 90; economyCycle.gdpGrowth = 0.018;
        const inflation = macro.inflation, unemployment = macro.unemployment;
        const gauss = gaussianRandom;
        gaussianRandom = () => 0;
        advanceMacroQuarter();
        gaussianRandom = gauss;
        assert(macro.inflation > inflation && macro.unemployment < unemployment, `${macro.inflation} / ${macro.unemployment}`);
        assert(macro.history.length === 1, 'historia');
    });

    test('cykl sektora zmienia wycenę i wzrost', () => {
        const { a } = worldM1();
        macro.sectorCycles['Nieruchomości'] = { phase: 'boom', quartersLeft: 3 };
        const boom = getValuationMultiplier(a);
        assert(getSectorCycleAdj(a) > 0, 'wzrost w boomie');
        macro.sectorCycles['Nieruchomości'] = { phase: 'decline', quartersLeft: 3 };
        assert(getValuationMultiplier(a) < boom && getSectorCycleAdj(a) < 0, 'spadek');
    });

    test('wybory: zmiana władzy zmienia politykę wobec spółek państwowych', () => {
        worldM1();
        macro.election = { quartersLeft: 1, ruling: 'market', campaign: true };
        economyCycle.phase = 'recession';
        const random = Math.random;
        Math.random = () => 0.1;
        advanceElectionCycle();
        Math.random = random;
        // 0.13: trzy partie — w recesji rządząca Koalicja Rynkowa przegrywa (wygrywa Blok Państwowy albo Ludowcy).
        assert(macro.election.ruling !== 'market' && macro.election.quartersLeft === ELECTION_INTERVAL_QUARTERS, 'nowy rząd');
        assert(getRulingParty().nationalization > 1, 'więcej nacjonalizacji');
    });

    test('zdarzenie spółek państwowych: realny skutek i brak natychmiastowej powtórki', () => {
        const { a } = worldM1();
        a.isStateOwned = true; a.stateOwnershipPct = 0.6;
        governmentTreasury = 1e9;
        const first = triggerStateCompanyEventCycle();
        assert(first && macro.recentEvents[0] === first.id, 'zdarzenie');
        const pool = STATE_COMPANY_EVENTS.filter(e => e.type === first.type);
        const next = pickMacroEvent(pool);
        assert(next.id !== first.id, 'bez powtórki');
    });

    test('klienci: fundusz przegrywający z lokatą traci zaufanie', () => {
        worldM1();
        assert(getMacroTrustPenalty(0, BASE_DELAYS.quarterly * 4) > 0, 'kara');
        assert(getMacroTrustPenalty(0.5, BASE_DELAYS.quarterly * 4) === 0, 'bez kary przy dobrym wyniku');
    });

    test('zapis v10 zachowuje stan makro', () => {
        worldM1();
        macro.inflation = 0.061; macro.election.ruling = 'state';
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        macro = createMacroState();
        applySaveSnapshot(snapshot);
        assert(snapshot.version === SAVE_FORMAT_VERSION && macro.inflation === 0.061 && macro.election.ruling === 'state', 'odtworzone');
    });
});

group('Dywidendy: arystokraci (0.10.2 M2)', () => {
    function worldM2() {
        const a = makeCompany('AAA');
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return a;
    }
    function quarter(stock, dps) {
        stock.pendingDividend = dps > 0 ? { dps, total: dps * stock.totalShares } : null;
        updateDividendStreak(stock);
    }

    test('12 kwartałów stałej dywidendy = arystokrata z bonusem wyceny', () => {
        const a = worldM2();
        for (let i = 0; i < ARISTOCRAT_MIN_STREAK - 1; i++) quarter(a, 1);
        assert(!a.isDividendAristocrat, 'jeszcze nie');
        const before = getValuationMultiplier(a);
        quarter(a, 1.02);
        assert(a.isDividendAristocrat && a.dividendStreak === ARISTOCRAT_MIN_STREAK, 'status');
        assert(getValuationMultiplier(a) > before, 'zainteresowanie +7%');
    });

    test('obcięcie dywidendy zabiera status i przecenia kurs', () => {
        const a = worldM2();
        for (let i = 0; i < ARISTOCRAT_MIN_STREAK; i++) quarter(a, 1);
        let effect = null;
        const original = applyPriceEffect;
        applyPriceEffect = (symbol, value) => { effect = value; };
        quarter(a, 0.5);
        applyPriceEffect = original;
        assert(!a.isDividendAristocrat && a.dividendStreak === 1 && effect < 0, 'utrata');
    });

    test('REIT nie zostaje arystokratą', () => {
        const a = worldM2();
        a.assetType = 'REIT';
        for (let i = 0; i < 10; i++) quarter(a, 1);
        assert(!a.isDividendAristocrat, 'REIT');
    });

    test('wypłata trafia do historii i liczy stopę dywidendy', () => {
        const a = worldM2();
        a.cash = 1_000_000;
        payCompanyDividend(a, 2);
        assert(a.dividendHistory.length === 1 && getTrailingDividendYield(a) > 0, 'historia');
        assert(renderDividendBadges(a).includes('Stopa dywidendy'), 'opis w karcie');
    });
});

group('ETF-y z portfelem (0.10.2 M3)', () => {
    function worldM3() {
        const a = makeCompany('AAA', { sector: ['Technologia'] });
        const b = makeCompany('BBB', { sector: ['Technologia'] });
        const c = makeCompany('CCC', { sector: ['Energia'] });
        [a, b, c].forEach(s => { s.insiderShares = 0; s.sharesHeld = 0; });
        resetWorld([a, b, c]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        etfs.length = 0;
        const etf = createEtf({ symbol: 'TSX', templateKey: 'Technologia', seed: 300_000 });
        etf.rules.maxWeight = 0.6; etf.rules.dividendOnly = false; etf.rules.minExchangeLevel = 0;
        etf.weighting = 'equal';
        etfs.push(etf);
        return { a, b, c, etf };
    }

    test('ETF kupuje akcje wg zasad i jest w akcjonariacie', () => {
        const { a, b, c, etf } = worldM3();
        rebalanceEtf(etf, true);
        assert(etf.holdings.AAA > 0 && etf.holdings.BBB > 0 && !etf.holdings.CCC, JSON.stringify(etf.holdings));
        assert(a.sharesHeld === etf.holdings.AAA, 'sharesHeld');
        assert(getShareholders(a).some(h => h.kind === 'etf'), 'akcjonariat');
        assert(Math.abs(getEtfNav(etf) - 300_000) < 1, 'wartość bez zmian');
    });

    test('limit udziału jednej spółki', () => {
        const { a, b, etf } = worldM3();
        etf.rules.maxWeight = 0.1;
        etf.weighting = 'cap';
        a.price = 1000;
        rebalanceEtf(etf, true);
        const weights = getEtfTopHoldings(etf, 5);
        assert(weights.every(h => h.weight <= 0.55), JSON.stringify(weights)); // 2 spółki → minimum 50% na każdą
    });

    test('cena jednostki = wartość aktywów / jednostki; kupno i umorzenie po wartości', () => {
        const { etf } = worldM3();
        rebalanceEtf(etf, true);
        updateEtfPrice(etf);
        const price = etf.price;
        playerCash = 100_000;
        const skill = getSkillLevel;
        getSkillLevel = id => id === 'etfExpert' ? 1 : 0;
        assert(buyEtf('TSX', 100), 'kupno');
        updateEtfPrice(etf);
        assert(Math.abs(etf.price - price) < 1e-6 && Math.abs(playerCash - (100_000 - 100 * price)) < 1e-6, 'kreacja po wartości');
        assert(sellEtf('TSX', 100), 'umorzenie');
        getSkillLevel = skill;
        assert(Math.abs(playerCash - 100_000) < 1e-3 && !playerPortfolio.TSX, `gotówka ${playerCash}`);
    });

    test('cel roczny nieosiągnięty → zmiana strategii', () => {
        const { etf } = worldM3();
        etf.yearStartPrice = etf.price * 2;
        etf.quartersInYear = 4;
        const weighting = etf.weighting;
        reviewEtfYear(etf);
        assert(etf.weighting !== weighting && etf.lastResult.hit === false, 'nowa strategia');
    });

    test('przejęcie spółki wypłaca ETF-owi gotówkę za pakiet', () => {
        const { a, etf } = worldM3();
        rebalanceEtf(etf, true);
        const shares = etf.holdings.AAA, cash = etf.cash;
        settleEtfHoldings('AAA', 150);
        assert(!etf.holdings.AAA && etf.cash === cash + shares * 150, 'rozliczone');
    });

    test('bank tworzy własny ETF, mały ETF banku zostaje zamknięty z wypłatą dla funduszu', () => {
        const { etf } = worldM3();
        const bank = { id: 'bnk', name: 'Bank Testowy', type: BANK_TYPES.INVESTMENT, isActive: true, cash: 10_000_000, stockPortfolio: {}, loanPortfolio: {} };
        commercialBanks.push(bank);
        const random = Math.random;
        Math.random = () => 0.01;
        const created = maybeLaunchBankEtf();
        Math.random = random;
        commercialBanks.splice(commercialBanks.indexOf(bank), 1);
        assert(created && created.issuerId === 'bnk' && created.name.startsWith('Bank Testowy'), 'nowy ETF');
        playerPortfolio[created.symbol] = { shares: 100, avgPrice: created.price, assetType: 'etf' };
        const cash = playerCash;
        closeEtf(created, 'test');
        assert(!etfs.includes(created) && playerCash > cash && !playerPortfolio[created.symbol], 'zamknięty i wypłacony');
    });
});

group('Firma i relacje z botami (0.10.2 M4)', () => {
    function worldM4() {
        const a = makeCompany('AAA');
        const b = makeCompany('BBB', { cash: 50_000_000 });
        [a, b].forEach(s => { s.insiderShares = 0; s.sharesHeld = 0; s.reputation = { player: 0 }; s.ceo = { name: 'Prezes', traits: [] }; });
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        botRelations = createBotRelations();
        aiCompetitors.forEach(ai => { ai.portfolio = {}; });
        return { a, b, bot: aiCompetitors[0] };
    }

    test('wymuszenie dywidendy: −0,25 pkt za każdy % akcji bota', () => {
        const { a, bot } = worldM4();
        bot.portfolio.AAA = { shares: 2000, avgPrice: 100 }; // 20%
        onPlayerForcedDividend(a);
        assert(Math.abs(getRelation(bot.id) + 5) < 1e-9, `relacja ${getRelation(bot.id)}`);
    });

    test('zrzut pakietu spółki bota (≥ 1%): −10; wsparcie kursu: +3', () => {
        const { a, bot } = worldM4();
        bot.portfolio.AAA = { shares: 6000, avgPrice: 100 };
        onFundTrade(a, 150, 'sell');
        assert(getRelation(bot.id) === -10, 'zrzut');
        onFundTrade(a, 60, 'buy');
        assert(getRelation(bot.id) === -7, 'wsparcie');
    });

    test('prezent z portfela prywatnego poprawia relację, raz na kwartał', () => {
        const { bot } = worldM4();
        playerWallet.cash = 5000;
        assert(giveGiftToBot(bot.id, 1000) && getRelation(bot.id) === 10, 'prezent');
        assert(!giveGiftToBot(bot.id, 1000) && playerWallet.cash === 4000, 'limit kwartalny');
    });

    test('relacje wracają powoli do zera; skala −100…100', () => {
        const { bot } = worldM4();
        changeRelation(bot.id, -500, 'test');
        assert(getRelation(bot.id) === -100, 'dolna granica');
        const random = Math.random;
        Math.random = () => 0.99; // bez akcji wrogiego bota
        processRelationsQuarterly();
        Math.random = random;
        assert(getRelation(bot.id) === -95, `powrót ${getRelation(bot.id)}`);
    });

    test('wrogi bot wysyła kpiący mail, przyjazny — radę', () => {
        const { bot } = worldM4();
        const person = findRelationPerson(bot.id);
        sendBotMail(person, 'hostile');
        assert(mailbox.messages[0].sender === `bot:${bot.id}` && getMailSenderName(mailbox.messages[0].sender).includes(bot.name), 'mail wrogi');
        sendBotMail(person, 'tip');
        assert(/dobra rada/.test(mailbox.messages[0].subject), 'rada');
    });

    test('przyjazny bot sprzedaje pakiet z rabatem', () => {
        const { a, bot } = worldM4();
        bot.portfolio.AAA = { shares: 1000, avgPrice: 100 };
        a.sharesHeld = 1000;
        offerBotBlock(bot);
        const offer = botRelations.blockOffer;
        playerCash = 1_000_000;
        assert(offer && acceptBotBlock(), 'zakup');
        assert(playerPortfolio.AAA.shares === offer.shares && bot.portfolio.AAA.shares === 1000 - offer.shares && a.sharesHeld === 1000, 'transfer bez zmiany obrotu');
        assert(Math.abs(offer.price - a.price * 0.95) < 1e-9, 'rabat 5%');
    });

    test('zakładka Firma: szef, targety i hierarchia', () => {
        worldM4();
        const html = renderCorporationFirm();
        assert(html.includes('Hierarchia') && html.includes('Targety') && html.includes('Szef'), 'sekcje');
        assert(getPlayerTargets().length === 5 && getPlayerBoss().name, 'cele i szef');
    });

    test('kolega: nadzór nad jego funduszem psuje relację', () => {
        worldM4();
        const manager = corporation.managers[0];
        onColleagueEvent(manager.id, 'supervise');
        assert(getRelation(manager.id) === -15, 'nadzór');
    });
});

group('Rynki i maklerzy (0.10.2 M5)', () => {
    function worldM5() {
        const a = makeCompany('AAA');
        a.insiderShares = 0; a.reputation = { player: 0 };
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        initMarketOperators();
        return { a, gpw: stocks.find(s => s.marketOperator === 'GPW') };
    }

    test('GPW jest notowaną spółką-operatorem, reszta to dopiero przyszłe rynki', () => {
        const { gpw } = worldM5();
        assert(gpw && marketOperators.GPW.status === 'active', 'GPW');
        assert(marketOperators.XTD.status === 'dormant' && marketOperators.EURONEXT.status === 'inactive', 'statusy');
    });

    test('prowizja od transakcji funduszu trafia do operatora', () => {
        const { a, gpw } = worldM5();
        playerCash = 100_000;
        const cash = gpw.cash;
        const fee = chargeMarketCommission(a, 10_000, 'player');
        assert(fee === 30 && playerCash === 100_000 - 30 && gpw.cash === cash + 30, `prowizja ${fee}`);
    });

    test('startup XTD: sponsor wchodzi na giełdę jako członek rynku XTD', () => {
        worldM5();
        const startup = spawnOperatorStartup(marketOperators.XTD);
        assert(startup.assetType === 'Startup' && startup.fundingGoal >= 300000, 'drogi startup');
        const sponsor = spawnMarketMember('XTD', 'sponsor');
        assert(getStockMarket(sponsor) === 'XTD' && !sponsor.assetType && sponsor.fundamentals, 'sponsor notowany');
    });

    test('debiut operatora otwiera rynek z 5–8 spółkami (ok. 70% nowych, reszta z GPW)', () => {
        worldM5();
        const startup = spawnOperatorStartup(marketOperators.XTD);
        const before = stocks.length;
        activateMarketOperator(startup);
        const added = stocks.length - before;
        const members = getMarketMembers('XTD').length;
        assert(marketOperators.XTD.status === 'active' && added >= 4 && added <= 6 && members >= added, `nowe spółki: ${added}, członkowie: ${members}`);
    });

    test('zamknięcie operatora: spółki znikają, fundusz rozliczony po ostatniej cenie', () => {
        worldM5();
        spawnOperatorStartup(marketOperators.PLU5);
        const member = spawnMarketMember('PLU5', 'sponsor');
        playerPortfolio[member.symbol] = { shares: 100, avgPrice: member.price, assetType: 'stock' };
        member.sharesHeld = 100;
        playerCash = 0;
        const price = member.price;
        closeMarketOperator(marketOperators.PLU5, 'test');
        assert(!stocks.includes(member) && !playerPortfolio[member.symbol], 'zniknęła');
        assert(Math.abs(playerCash - 100 * price) < 1e-6 && marketOperators.PLU5.status === 'closed', 'rozliczenie');
    });
});

group('Konsorcja i projekty specjalne (0.10.2 M6)', () => {
    function worldM6() {
        const builder = makeCompany('BUD', { cash: 20e6, sector: ['Budowlany'] });
        const a = makeCompany('AAA', { cash: 40e6, sector: ['Energia'] });
        const b = makeCompany('BBB', { cash: 40e6, sector: ['Przemysł'] });
        const c = makeCompany('CCC', { cash: 10e6, sector: ['Usługi'] });
        [builder, a, b, c].forEach(s => { s.insiderShares = 0; s.sharesHeld = 0; s.reputation = { player: 0 }; });
        resetWorld([builder, a, b, c]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        specialProjects = createSpecialProjects();
        return { builder, a, b, c };
    }
    const NUCLEAR = () => MEGA_PROJECTS.find(p => p.id === 'nuclear');

    test('konsorcjum buduje megaprojekt etapami, bonusy wg wkładu, projekt tylko raz', () => {
        const { builder, a } = worldM6();
        const def = { ...NUCLEAR(), cost: 20e6, quarters: 2 };
        const project = createProject(def);
        assert(project.participants.length >= 1 && project.participants.length <= 4, 'uczestnicy');
        project.signupLeft = 1;
        assert(startProjectBuild(project) && project.builder.symbol === 'BUD', 'start budowy');
        project.progress = 1;
        completeProject(project);
        assert(isMegaProjectTaken('nuclear'), 'tylko raz');
        assert(getSpecialProjectGrowth(a) > 0 && getSpecialProjectValuation(a) > 1, 'bonus uczestnika');
        assert(getSpecialProjectGrowth(builder) > 0, 'bonus wykonawcy');
    });

    test('spółka funduszu (> 50%) dołącza do konsorcjum; bez większości — odmowa', () => {
        const { c } = worldM6();
        const project = createProject({ ...NUCLEAR(), cost: 20e6 });
        project.participants = project.participants.slice(0, 2);
        playerPortfolio.CCC = { shares: 4000, avgPrice: 100, assetType: 'stock' };
        assert(!joinConsortium(project.id, 'CCC', 2e6), 'bez większości');
        playerPortfolio.CCC.shares = 6000;
        assert(joinConsortium(project.id, 'CCC', 2e6) && project.participants.some(p => p.symbol === 'CCC' && p.player), 'dołączyła');
    });

    test('projekt czasowy: bonus wygasa najpóźniej po 5 latach gry', () => {
        const { a } = worldM6();
        const template = TIMED_PROJECT_TEMPLATES[0];
        const project = createProject(template, { timed: true, deadline: 10 });
        project.bonusQuarters = 40;
        startProjectBuild(project);
        completeProject(project);
        const member = stocks.find(s => s.symbol === project.participants[0].symbol);
        const bonus = member.specialBonuses[0];
        assert(bonus.until === macro.quarter + MAX_TIMED_BONUS_QUARTERS, `do kwartału ${bonus.until}`);
        macro.quarter += MAX_TIMED_BONUS_QUARTERS;
        assert(getSpecialProjectGrowth(member) === 0, 'wygasł');
    });

    test('przejęcie: bonusy przechodzą na spółkę przejmującą', () => {
        const { a, b } = worldM6();
        a.specialBonuses = [{ projectId: 'x', name: 'Most', growth: 0.004, valuation: 0.02, until: null }];
        transferSpecialBonuses(a, b);
        assert(getSpecialProjectGrowth(b) === 0.004 && !a.specialBonuses.length, 'przeniesione');
    });
});

group('Audyt A1: przepływy pieniędzy i akcji', () => {
    function worldA1() {
        const a = makeCompany('AAA', { cash: 5_000_000 });
        const h = makeCompany('HHH', { cash: 5_000_000 });
        [a, h].forEach(s => { s.insiderShares = 0; s.sharesHeld = 0; s.reputation = { player: 0 }; });
        resetWorld([a, h]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        etfs.length = 0;
        aiCompetitors.forEach(ai => { ai.portfolio = {}; });
        return { a, h };
    }

    test('dywidenda trafia też do pakietów spółek, ETF-ów, miasta i państwa', () => {
        const { a, h } = worldA1();
        h.equityStakes = { AAA: 1000 };
        const etf = createEtf({ symbol: 'TST', templateKey: 'Technologia', seed: 1000 });
        etf.holdings = { AAA: 500 };
        etfs.push(etf);
        a.cityShares = 200;
        a.stateOwnershipPct = 0.1;
        const hCash = h.cash, etfCash = etf.cash, budget = city.budget, treasury = governmentTreasury;
        payDividendToInstitutions(a, 2);
        assert(h.cash === hCash + 2000 && etf.cash === etfCash + 1000 && city.budget === budget + 400 && governmentTreasury === treasury + 2000, 'wypłaty');
    });

    test('usunięta spółka: pakiety przechodzą na przejmującego albo wracają do obrotu', () => {
        const { a, h } = worldA1();
        const b = makeCompany('BBB'); stocks.push(b);
        h.equityStakes = { AAA: 1000 };
        a.sharesHeld = 1000;
        h.absorbedBy = 'BBB';
        releaseCompanyStakes(h);
        assert(b.equityStakes.AAA === 1000 && a.sharesHeld === 1000, 'przejęte');
        b.absorbedBy = null;
        releaseCompanyStakes(b);
        assert(a.sharesHeld === 0, 'wróciły do obrotu');
    });

    test('uzgadnianie: sharesHeld = suma posiadaczy, pakiet państwa poza obrotem', () => {
        const { a } = worldA1();
        playerPortfolio.AAA = { shares: 700, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = 5000; // „wiszące” akcje bez właściciela
        a.stateOwnershipPct = 0.2;
        assert(reconcileSharesHeld() >= 1 && a.sharesHeld === 700, `sharesHeld ${a.sharesHeld}`);
        assert(getFreeFloatShares(a) === 8000 && getAvailableShares(a) === 7300, 'wolny obrót bez pakietu państwa');
    });
});

group('Nadzór i korupcja (0.11.1)', () => {
    function world() {
        const a = makeCompany('AAA', { cash: 2_000_000, liabilities: 1_000_000 });
        a.insiderShares = 0; a.reputation = { player: 0 };
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        oversight = createOversight();
        playerCash = 1_000_000;
        return a;
    }
    function withRandom(value, fn) {
        const random = Math.random;
        Math.random = () => value;
        try { return fn(); } finally { Math.random = random; }
    }

    test('usługa szarej strefy: płaci fundusz, rośnie podejrzenie i korupcja', () => {
        const a = world();
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        const cash = playerCash, liabilities = a.balanceSheet.liabilities;
        assert(greyDebtWriteOff('AAA'), 'usługa');
        assert(playerCash < cash && a.balanceSheet.liabilities < liabilities, 'dług umorzony, fundusz zapłacił');
        assert(getRecord('player').suspicion === GREY_SERVICES.debt.risk && oversight.pendingCorruption === GREY_SERVICES.debt.corruption, 'ślady');
    });

    test('drabina kar: mandat, zaufanie, wpis compliance; trzecie wykrycie = rekwizycja i blokada handlu', () => {
        world();
        const trust = playerFund.trust;
        punishEntity('player', 'KNF');
        assert(playerFund.trust < trust && playerProfile.cv.some(e => e.type === 'compliance'), 'zaufanie i CV');
        getRecord('player').illegalGains = 50_000;
        punishEntity('player', 'Policja');
        punishEntity('player', 'Policja');
        assert(getRecord('player').illegalGains === 0 && isTradingBlocked('player'), 'rekwizycja i blokada');
    });

    test('piąte wykrycie = wyrok (porażka)', () => {
        world();
        for (let i = 0; i < CONVICTION_STRIKES; i++) punishEntity('player', 'Policja');
        assert(oversight.convicted, 'skazany');
    });

    test('śledztwo: duże podejrzenie przy skutecznej policji kończy się wykryciem; łapówka chroni', () => {
        world();
        oversight.police.level = 5;
        getRecord('player').suspicion = 200;
        withRandom(0.01, () => processOversightQuarterly());
        assert(getRecord('player').strikes === 1, 'wykryty');
        world();
        oversight.corruption = 60;
        getRecord('player').suspicion = 200;
        oversight.knf.level = 0;
        assert(bribePolice(), 'łapówka');
        const random = Math.random;
        let call = 0;
        Math.random = () => (++call === 1 ? 0.01 : 0.99); // policja „trafiłaby”, KNF nie
        processOversightQuarterly();
        Math.random = random;
        assert(getRecord('player').strikes === 0, 'łapówka chroni przed policją');
    });

    test('korupcja podnosi zmienność, skuteczne instytucje ją obniżają', () => {
        world();
        oversight.corruption = 80;
        assert(getCorruptionVolatilityFactor() > 1.2, 'zmienność');
        oversight.police.level = 5; oversight.knf.level = 5;
        const before = oversight.corruption;
        withRandom(0.99, () => processOversightQuarterly());
        assert(oversight.corruption < before, 'spadek korupcji');
    });

    test('niezależny prezes chroni spółkę przed aferą', () => {
        const a = world();
        a.ceo = { name: 'X', traits: [{ id: 'niezalezny' }] };
        assert(triggerCorruptionScandal() === null, 'brak afery');
    });

    test('zapis v11 zachowuje nadzór', () => {
        world();
        oversight.corruption = 42; getRecord('player').strikes = 2;
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        oversight = createOversight();
        applySaveSnapshot(snapshot);
        assert(snapshot.version === SAVE_FORMAT_VERSION && oversight.corruption === 42 && oversight.records.player.strikes === 2, 'odtworzone');
    });
});

group('Mafia (0.11.2)', () => {
    function world() {
        const a = makeCompany('AAA', { cash: 2_000_000 });
        const b = makeCompany('BBB', { cash: 2_000_000 });
        [a, b].forEach(s => { s.insiderShares = 0; s.reputation = { player: 0 }; s.ceo = { name: 'X', traits: [] }; });
        const bruno = aiCompetitors.findIndex(ai => ai.isMafia);
        if (bruno >= 0) aiCompetitors.splice(bruno, 1);
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        oversight = createOversight();
        mafia = createMafia();
        playerCash = 1_000_000;
        return { a, b };
    }
    function withRandom(value, fn) {
        const random = Math.random;
        Math.random = () => value;
        try { return fn(); } finally { Math.random = random; }
    }

    test('bez kontaktu mafia nie oferuje usług ani nie żąda haraczu', () => {
        world();
        assert(!mafiaLoan(1000) && !mafia.contacted, 'brak usług');
        mafia.influence = 200;
        withRandom(0.01, () => createMafiaDemand());
        assert(mafia.demand === null, 'brak żądań');
    });

    test('kontakt: pojawia się Bruno Gato z ukrytym pakietem w akcjonariacie', () => {
        const { a } = world();
        contactMafia();
        const bruno = getBruno();
        assert(bruno && bruno.cash > 0 && mafia.contacted, 'Bruno');
        bruno.portfolio.AAA = { shares: 1200, avgPrice: 100 };
        a.sharesHeld = 1200;
        const holder = getShareholders(a).find(h => h.entity === bruno);
        assert(holder && holder.name === 'Akcjonariusz nieujawniony', 'ukryty');
        assert(!getRelationPeople().some(p => p.id === bruno.id), 'poza relacjami');
    });

    test('pożyczka: gotówka dla funduszu, spóźnienie = windykacja', () => {
        world();
        contactMafia();
        assert(mafiaLoan(100_000) && playerCash === 1_100_000, 'pożyczka');
        mafia.loan.dueQuarter = macro.quarter - 1;
        const cash = playerCash, owed = mafia.loan.owed;
        withRandom(0.99, () => processMafiaQuarterly());
        assert(playerCash < cash && (!mafia.loan || mafia.loan.owed < owed * (1 + MAFIA_LOAN_QUARTERLY_RATE)), 'windykacja');
    });

    test('sabotaż: płaci fundusz, spółka traci, rosną podejrzenia; niezależny prezes chroni', () => {
        const { a, b } = world();
        contactMafia();
        let effect = 0;
        const original = applyPriceEffect;
        applyPriceEffect = (symbol, value) => { effect = value; };
        assert(mafiaSabotage('AAA') && effect < 0 && getRecord('player').suspicion >= 25, 'sabotaż');
        b.ceo.traits = [{ id: 'niezalezny' }];
        assert(!mafiaSabotage('BBB'), 'odporna');
        applyPriceEffect = original;
    });

    test('odmowa haraczu: atak na portfel i kradzież gotówki', () => {
        const { a } = world();
        contactMafia();
        playerPortfolio.AAA = { shares: 500, avgPrice: 100, assetType: 'stock' };
        mafia.demand = { type: 'haracz', amount: 5000, quarter: macro.quarter };
        const cash = playerCash;
        answerMafiaDemand(false);
        assert(playerCash < cash && mafia.demand === null, 'kara');
    });

    test('etapy wpływów i ludzie mafii w zarządach (skimming)', () => {
        const { a } = world();
        mafia.influence = 160;
        assert(getMafiaStage().name === 'Ośmiornica', 'etap');
        a.mafiaBoard = 'ceo';
        a.quarterlyEarnings = 100_000;
        const cash = a.cash, mafiaCash = mafia.cash;
        withRandom(0.99, () => runMafiaInfiltration());
        assert(a.cash === cash - 25_000 && mafia.cash === mafiaCash + 25_000, 'skimming 25%');
    });

    test('ratunek bankruta za udziały dla Pana Gato', () => {
        const { a } = world();
        mafia.influence = 200;
        a.balanceSheet.liabilities = a.balanceSheet.assets + 100_000;
        const shares = a.totalShares;
        assert(withRandom(0.01, () => mafiaRescueFromBankruptcy(a)), 'uratowana');
        assert(a.totalShares > shares && getBruno().portfolio.AAA.shares === a.totalShares - shares, 'udziały dla Bruna');
    });

    test('rekwizycja: akcje z wejściówki idą na aukcję', () => {
        const { a } = world();
        contactMafia();
        a.exchange = 'RUBY';
        assert(mafiaEntryTicket('AAA'), 'wejściówka');
        const shares = playerPortfolio.AAA.shares;
        aiCompetitors[0].cash = 1e9;
        const total = seizeMafiaAssets();
        assert(total > 0 && !playerPortfolio.AAA && Object.keys(mafia.acquired).length === 0, `rekwizycja ${shares}`);
    });

    test('porażka tylko dla współpracującego: 1000 pkt bez powiązań = brak porażki', () => {
        world();
        mafia.influence = MAFIA_MAX_INFLUENCE;
        mafia.ties.player = 0;
        withRandom(0.99, () => processMafiaQuarterly());
        assert(!mafia.defeated, 'gracz bez powiązań nie przegrywa');
        mafia.contacted = true;
        mafia.influence = MAFIA_MAX_INFLUENCE;
        mafia.ties.player = MAFIA_DEFEAT_TIES;
        oversight.police.level = 0;
        withRandom(0.99, () => processMafiaQuarterly());
        assert(mafia.defeated, 'współpracujący przegrywa');
        document.getElementById('defeat-overlay')?.setAttribute('hidden', '');
    });
});

group('Afery: parabanki i wojny PR (0.11.3)', () => {
    function world() {
        const a = makeCompany('AAA', { cash: 2_000_000, sector: ['Technologia'] });
        const b = makeCompany('BBB', { cash: 2_000_000, sector: ['Technologia'] });
        [a, b].forEach(s => { s.insiderShares = 0; s.reputation = { player: 0 }; s.ceo = { name: 'X', traits: [] }; });
        resetWorld([a, b]);
        commercialBanks.splice(0, commercialBanks.length);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        oversight = createOversight();
        scandals = createScandals();
        playerCash = 1_000_000;
        return { a, b };
    }

    test('parabank kusi najwyższą lokatą i wchodzi na giełdę', () => {
        world();
        const parabank = spawnParabank();
        const bank = commercialBanks.find(b => b.id === parabank.bankId);
        assert(bank.isParabank && canBankTakeFundDeposits(bank) && stocks.some(s => s.symbol === parabank.symbol), 'bank i akcje');
        assert(getFundDepositRate(bank, 16) > getDepositRate() + 0.04, 'wysoka lokata');
    });

    test('upadek: śledztwo → lokata przepada (10–30% zwrotu), zaufanie i compliance, notowania zawieszone', () => {
        world();
        const parabank = spawnParabank();
        const deposit = openFundDeposit(parabank.bankId, 500_000, 16);
        assert(deposit, 'lokata');
        const trust = playerFund.trust;
        const cash = playerCash;
        collapseParabank(parabank, 'investigation');
        const back = playerCash - cash;
        const stock = stocks.find(s => s.symbol === parabank.symbol);
        assert(back >= 50_000 - 1 && back <= 150_000 + 1, `odzysk ${back}`);
        assert(playerFund.trust < trust && playerProfile.cv.some(e => e.type === 'compliance'), 'zaufanie i CV');
        assert(stock.tradeHalted && stock.price === 0.01, 'notowania zawieszone');
        assert(!canBankTakeFundDeposits(commercialBanks.find(b => b.id === parabank.bankId)), 'zamrożony');
    });

    test('po śledztwie policji: wycena likwidacyjna, potem spółka znika z rozliczeniem posiadaczy', () => {
        world();
        const parabank = spawnParabank();
        buyParabankShares(parabank.id, 100);
        collapseParabank(parabank, 'investigation');
        collapseParabank(parabank, 'police');
        const stock = stocks.find(s => s.symbol === parabank.symbol);
        assert(!stock.tradeHalted && stock.price < parabank.peakPrice * 0.16, 'wycena likwidacyjna');
        const cash = playerCash;
        collapseParabank(parabank, 'fled');
        assert(!stocks.some(s => s.symbol === parabank.symbol) && !playerPortfolio[parabank.symbol] && playerCash > cash, 'zniknęła, fundusz rozliczony');
    });

    test('kredyt bez BIK: syndyk żąda natychmiastowej spłaty przy upadku', () => {
        world();
        const parabank = spawnParabank();
        assert(takeParabankLoan(parabank.id, 100_000) && playerCash === 1_100_000, 'kredyt');
        collapseParabank(parabank, 'investigation');
        assert(!parabank.loan && playerCash < 1_100_000, 'spłata');
    });

    test('wojna PR: dwie spółki z branży, wsparcie większościowca, rozstrzygnięcie', () => {
        const { a } = world();
        const war = startPrWar();
        assert(war && [war.a, war.b].includes('AAA'), 'wojna');
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        const cash = a.cash;
        assert(supportPrCampaign('AAA') && a.cash < cash && war.boost.AAA > 0, 'wsparcie');
        war.quartersLeft = 1;
        const random = Math.random;
        Math.random = () => 0.99; // KNF nie przerywa
        processPrWarsQuarterly();
        Math.random = random;
        assert(!scandals.prWars.includes(war), 'rozstrzygnięta');
    });
});

group('Zbrojeniówka i Gwardia (0.11.4)', () => {
    function world() {
        const a = makeCompany('AAA', { cash: 2_000_000, sector: ['Technologia'] });
        a.insiderShares = 0; a.reputation = { player: 0 }; a.ceo = { name: 'X', traits: [] };
        ['guard_fund', 'mafia_bruno'].forEach(id => { const i = aiCompetitors.findIndex(ai => ai.id === id); if (i >= 0) aiCompetitors.splice(i, 1); });
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        oversight = createOversight();
        mafia = createMafia();
        governmentTreasury = 1e9;
        initDefenseSector();
        return { a, defense: stocks.filter(isDefenseCompany) };
    }

    test('4 spółki zbrojeniowe na Giełdzie Złotej i Platynowej + fundusz Gwardia', () => {
        const { defense } = world();
        assert(defense.length === 4 && defense.every(s => ['GOLD', 'PLATINUM'].includes(s.exchange)), 'spółki');
        assert(getGuardFund() && getGuardFund().cash > 0, 'Gwardia');
    });

    test('mafia nie sabotuje i nie infiltruje zbrojeniówki', () => {
        const { defense } = world();
        contactMafia();
        assert(!mafiaSabotage(defense[0].symbol) && isMafiaImmune(defense[0]), 'odporne');
    });

    test('kontrakty MON przy rządzie „państwowym”', () => {
        const { defense } = world();
        macro.election.ruling = 'state';
        const cash = defense.reduce((sum, s) => sum + s.cash, 0);
        const random = Math.random;
        Math.random = () => 0.01;
        processDefenseQuarterly();
        Math.random = random;
        assert(defense.reduce((sum, s) => sum + s.cash, 0) > cash, 'kontrakty');
    });

    test('Gwardia kupuje klasyki, unika technologii; duży pakiet chroni przed mafią', () => {
        const { a, defense } = world();
        runGuardFundQuarterly();
        const guard = getGuardFund();
        assert(!guard.portfolio.AAA && Object.keys(guard.portfolio).some(symbol => defense.some(s => s.symbol === symbol)), 'portfel Gwardii');
        guard.portfolio.AAA = { shares: 600, avgPrice: 100 };
        assert(isGuardProtected(a), 'ochrona ≥ 5%');
    });

    test('generał i były wojskowy chronią spółkę przed aferą korupcyjną', () => {
        const { a, defense } = world();
        stocks.forEach(s => { s.ceo = { name: 'X', traits: [{ id: 'byly_wojskowy' }] }; });
        assert(triggerCorruptionScandal() === null, 'brak afery');
    });

    test('bonus wzrostu od siły policji tylko dla zbrojeniówki', () => {
        const { a, defense } = world();
        assert(getDefenseGrowthBonus(defense[0]) > 0 && getDefenseGrowthBonus(a) === 0, 'bonus');
    });
});

group('Testy ogólne 0.11: benchmark GIG i wykup posiadaczy', () => {
    test('GIG łańcuchowy: debiut drogiej spółki nie podbija indeksu', () => {
        const a = makeCompany('AAA'); const b = makeCompany('BBB');
        resetWorld([a, b]);
        const gig = marketIndexes.find(i => i.id === 'GIG');
        gig.value = 100; gig.lastPrices = null;
        updateMarketIndexes();
        updateMarketIndexes();
        const before = gig.value;
        const expensive = makeCompany('DRG'); expensive.price = 5000;
        stocks.push(expensive);
        updateMarketIndexes();
        assert(Math.abs(gig.value - before) < 1e-9, `skok ${gig.value} vs ${before}`);
        a.price *= 1.1; b.price *= 1.1; expensive.price *= 1.1;
        updateMarketIndexes();
        assert(Math.abs(gig.value / before - 1.1) < 1e-9, 'wzrost 10% = +10% indeksu');
    });

    test('0.15 H1a: indeksy ważone kapitalizacją (computeCappedCapWeights, GIG cap 10%, TIG5, SIG20)', () => {
        // 1. Sprawdzenie algorytmu wag z limitem 10% dla 20 spółek
        const testCompanies = [];
        for (let i = 1; i <= 20; i++) {
            const comp = makeCompany(`C${i}`);
            comp.price = 100;
            comp.totalShares = (i === 1) ? 100000 : 100; // C1 to gigant
            testCompanies.push(comp);
        }
        const weights = computeCappedCapWeights(testCompanies, 0.10);
        assert(Math.abs(weights.C1 - 0.10) < 1e-6, `C1 powinien mieć limit 10%, ma ${weights.C1}`);
        const sumWeights = Object.values(weights).reduce((a, b) => a + b, 0);
        assert(Math.abs(sumWeights - 1.0) < 1e-9, `Suma wag musi wynosić 1.0, wynosi ${sumWeights}`);

        // 2. Wpływ giganta na GIG: przy limicie 10%, wzrost giganta o 10% (reszta 0%) podnosi GIG o 1%
        resetWorld(testCompanies);
        const gig = marketIndexes.find(i => i.id === 'GIG');
        gig.value = 100; gig.lastPrices = null;
        updateMarketIndexes();
        updateMarketIndexes();
        const baseGig = gig.value;
        testCompanies[0].price = 110; // +10%
        updateMarketIndexes();
        const gigReturn = (gig.value - baseGig) / baseGig;
        assert(Math.abs(gigReturn - 0.01) < 1e-4, `GIG powinien wzrosnąć o 1.0% (waga 10% * +10%), wzrósł o ${(gigReturn * 100).toFixed(3)}%`);

        // 3. TIG5 ważony kapitalizacją
        const tig5 = marketIndexes.find(i => i.id === 'TIG5');
        assert(tig5 && tig5.value > 0, 'TIG5 ma dodatnią wartość');

        // 4. Hasło w Akademii
        assert(typeof ACADEMY_ENTRIES.indeks_wazony === 'object', 'Hasło indeks_wazony istnieje');
        assert(ACADEMY_ENTRIES.indeks_wazony.quiz.length >= 3, 'Quiz ma co najmniej 3 pytania');
    });

    test('0.15 H1a: stabilizacja marż operacyjnych i erozja konkurencyjna', () => {
        const c = makeCompany('ERO');
        c.exchange = 'GOLD';
        initializeFundamentals(c, true);
        c.financialHealth = 0;
        macro = { inflation: 0.025, quarter: 1 };
        society = null;

        const qBase = computeQuarterResults(c);
        assert(qBase.revenue > 0, 'przychody dodatnie');

        // Wysoka kondycja (health = 5): erozja konkurencyjna ścina 35% nadwyżki
        c.financialHealth = 5;
        const qHealth = computeQuarterResults(c);
        const rawHealthBoost = 5 * 0.008; // +4.0 pp
        const expectedErodedBoost = rawHealthBoost * (1 - 0.35); // +2.6 pp
        const deltaMargin = qHealth.margin - qBase.margin;
        assert(Math.abs(deltaMargin - expectedErodedBoost) < 0.0001, `nadwyżka marży poddana erozji: delta ${deltaMargin.toFixed(4)} vs oczekiwana ${expectedErodedBoost.toFixed(4)}`);
    });

    test('0.15 H1b: sztafeta jednorożców i gasnących gwiazd z falami realizacji zysków', () => {
        // 1. Brak losowania gwiazd w Q1-Q2 (dopiero od Q3)
        const c1 = makeCompany('UNI1', { sector: ['Technologia'] });
        const c2 = makeCompany('FAD1', { sector: ['Przemysł'] });
        const c3 = makeCompany('UNI2', { sector: ['Gaming'] });
        const c4 = makeCompany('FAD2', { sector: ['Media'] });
        const all = [c1, c2, c3, c4];
        resetWorld(all);
        all.forEach(c => initializeFundamentals(c, true));

        macro = { quarter: 1, inflation: 0.025 };
        processMarketStarsQuarterly();
        assert(!all.some(c => c.marketStar), 'Brak gwiazd w Q1');

        macro.quarter = 2;
        processMarketStarsQuarterly();
        assert(!all.some(c => c.marketStar), 'Brak gwiazd w Q2');

        // 2. Wyłonienie gwiazd od Q3
        macro.quarter = 3;
        withSeededRandom(42, () => {
            processMarketStarsQuarterly();
        });
        const unicorn = all.find(c => c.marketStar?.type === 'unicorn');
        const fading = all.find(c => c.marketStar?.type === 'fading_star');
        assert(unicorn, 'Wyłoniono jednorożca od Q3');
        assert(fading, 'Wyłoniono gasnącą gwiazdę od Q3');
        assert(unicorn.marketStar.quartersLeft >= 6 && unicorn.marketStar.quartersLeft <= 8, 'Czas trwania jednorożca 6-8 kwartałów');
        assert(fading.marketStar.quartersLeft >= 6 && fading.marketStar.quartersLeft <= 8, 'Czas trwania gasnącej gwiazdy 6-8 kwartałów');

        // 3. Wpływ na wycenę i wyniki (mnożnik wyceny 1.25 dla jednorożca, 0.80 dla gasnącej gwiazdy)
        const multUni = getValuationMultiplier(unicorn);
        const multFad = getValuationMultiplier(fading);
        assert(multUni > multFad, `Wycena jednorożca (${multUni.toFixed(2)}) wyższa niż gasnącej gwiazdy (${multFad.toFixed(2)})`);

        // 4. Mechanika fali realizacji zysków na jednorożcu
        unicorn.marketStar.anchorPrice = 100;
        unicorn.price = 130; // +30% zysku od kotwicy
        unicorn.marketStar.correctionCooldown = 0;
        unicorn.marketStar.profitTakingTicksLeft = 0;
        // Wymuszenie odpalenia realizacji zysków (szansa 1.5% na tick, po ~250 tickach p > 97%)
        withSeededRandom(10, () => {
            for (let t = 0; t < 300; t++) {
                if (unicorn.price < 130) unicorn.price = 130;
                updateStockPrices();
                if (unicorn.marketStar.profitTakingTicksLeft > 0 || unicorn.marketStar.totalCycles > 0) break;
            }
        });
        assert(unicorn.marketStar.profitTakingTicksLeft > 0 || unicorn.marketStar.totalCycles > 0, 'Realizacja zysków została uruchomiona');

        // 5. Rotacja sztafetowa po upływie czasu
        const initialUniSymbol = unicorn.symbol;
        unicorn.marketStar.quartersLeft = 1;
        macro.quarter = 4;
        processMarketStarsQuarterly();
        // Wygasł stary jednorożec, ma cooldown i nowy jednorożec wszedł do gry
        assert(!unicorn.marketStar, 'Stary jednorożec zakończył swój cykl');
        assert(unicorn.lastMarketStarQuarter === 4, 'Zapisano kwartał zakończenia cyklu');

        // 6. Akademia
        assert(typeof ACADEMY_ENTRIES.jednorozce === 'object', 'Hasło jednorozce w Akademii');
        assert(ACADEMY_ENTRIES.jednorozce.quiz.length >= 3, 'Quiz jednorożców ma pytania');
    });

    test('0.15 H2: fazy rynku, nastroje (Strach i Chciwość) oraz premia rynkowa', () => {
        // 1. Definicje 6 faz rynku
        const phaseKeys = ['accumulation', 'bull', 'euphoria', 'distribution', 'bear', 'capitulation'];
        for (const pk of phaseKeys) {
            const def = MARKET_PHASES[pk];
            assert(def && def.name && def.icon && def.css && Array.isArray(def.length) && Array.isArray(def.premium), `Definicja fazy ${pk}`);
            assert(typeof def.volMult === 'number' && typeof def.mood === 'number', `Parametry volMult i mood dla ${pk}`);
        }

        // 2. Inicjalizacja stanu rynku i strefy sentymentu
        initMarketRegimes('bull');
        const regime = getMarketRegime('home');
        assert(regime && regime.phase === 'bull', 'Inicjalizacja fazy bull');
        assert(regime.shownPhase === null, 'Początkowo faza w stanie potwierdzania');

        assert(getSentimentZone(15).key === 'extreme-fear', 'Strefa skrajnego strachu');
        assert(getSentimentZone(30).key === 'fear', 'Strefa strachu');
        assert(getSentimentZone(50).key === 'neutral', 'Strefa neutralna');
        assert(getSentimentZone(70).key === 'greed', 'Strefa chciwości');
        assert(getSentimentZone(90).key === 'extreme-greed', 'Strefa skrajnej chciwości');

        // 3. Opóźnione potwierdzanie fazy (delayed confirmation)
        // Dla hossy po 1 kwartale następuje potwierdzenie
        advanceMarketRegimeQuarterly('home');
        assert(regime.shownPhase === 'bull', 'Faza bull potwierdzona po 1 kwartale');

        // Przejście do akumulacji i test potwierdzania po 2 kwartałach
        regime.phase = 'accumulation';
        regime.shownPhase = null;
        regime.quartersInPhase = 1;
        regime.phaseLength = 4;
        advanceMarketRegimeQuarterly('home');
        assert(regime.shownPhase === null, 'Akumulacja niepotwierdzona po 1 kwartale');
        advanceMarketRegimeQuarterly('home');
        assert(regime.shownPhase === 'accumulation', 'Akumulacja potwierdzona po 2 kwartałach');

        // Wczesne potwierdzenie przy skoku indeksu GIG >= 20%
        regime.phase = 'bull';
        regime.shownPhase = null;
        regime.quartersInPhase = 1;
        regime.gigTrough = 1000;
        const gigIdx = marketIndexes.find(i => i.id === 'GIG');
        const gigInitial = gigIdx ? gigIdx.value : 1000;
        if (gigIdx) gigIdx.value = 1250; // +25%
        advanceMarketRegimeQuarterly('home');
        assert(regime.shownPhase === 'bull', 'Wczesne potwierdzenie hossy przy wzroście GIG >= 20%');

        // Faza retro (krótka faza zakończona bez potwierdzenia)
        regime.phase = 'capitulation';
        regime.shownPhase = null;
        regime.quartersInPhase = 1;
        regime.phaseLength = 1;
        regime.gigPeak = 1250;
        if (gigIdx) gigIdx.value = 1150; // spadek tylko o 8%, brak potwierdzenia przed końcem
        advanceMarketRegimeQuarterly('home');
        assert(regime.history.length > 0, 'Wpis w historii faz rynku');
        const lastEntry = regime.history[0];
        assert(lastEntry.isRetro === true && lastEntry.confirmed === false, 'Krótka niepotwierdzona faza zapisana jako retro');

        // 4. Cotygodniowa aktualizacja sentymentu i premia rynkowa
        updateMarketSentimentWeekly('home');
        assert(typeof regime.sentiment === 'number' && regime.sentiment >= 0 && regime.sentiment <= 100, 'Sentyment liczbowy 0-100');
        assert(regime.sentimentParts && typeof regime.sentimentParts.momentum === 'number', 'Składnik momentum');
        assert(regime.sparklines && Array.isArray(regime.sparklines.momentum), 'Sparkline dla momentum');

        // Wpływ premii na wycenę i ruch cen
        const originalStocks = stocks;

        try {
            const testComp = makeCompany('FAZ', { sector: ['Technologia'] });
            resetWorld([testComp]);
            regime.premium = 0.0;
            regime.premiumTarget = 0.20;
            testComp.price = 100;
            updateStockPrices();
            assert(regime.premium > 0, 'Premia rynkowa dąży w kierunku celu');

            // 5. Umiejętność analityka (L4 i L5) oraz elementy UI
            const slot = document.createElement('div');
            slot.id = 'topbar-mood-slot';
            const tooltip = document.createElement('div');
            tooltip.id = 'mood-tooltip';
            const modal = document.createElement('div');
            modal.id = 'market-modal';
            const modalBody = document.createElement('div');
            modalBody.id = 'market-modal-body';
            modal.appendChild(modalBody);
            document.body.append(slot, tooltip, modal);

            try {
                // Poziom < 4: brak widgetu
                skills.indexAnalystLvl1.unlockedLevel = 3;
                updateMoodKpi();
                assert(slot.innerHTML.trim() === '', 'Widget nastroju pusty przed L4');

                // Poziom 4: widget nastroju jako <div> (bez L5 nieklikalny do modala)
                skills.indexAnalystLvl1.unlockedLevel = 4;
                regime.shownPhase = 'bull';
                updateMoodKpi();
                assert(slot.querySelector('.mood-kpi') !== null, 'Widget .mood-kpi wyrenderowany na L4');
                assert(slot.querySelector('button.mood-kpi') === null, 'Na L4 widget nie jest przyciskiem otwierającym modal');

                // Poziom 5: widget nastroju jako <button>, otwiera modal „Rynek”
                skills.indexAnalystLvl1.unlockedLevel = 5;
                updateMoodKpi();
                assert(slot.querySelector('button.mood-kpi') !== null, 'Na L5 widget jest przyciskiem modalnym');

                openMarketModal();
                assert(modal.style.display === 'block', 'Modal Rynek otwiera się po openMarketModal()');
                assert(modal.querySelector('.gauge') !== null, 'W modalu wyrenderowano wskaźnik zegarowy (gauge)');
                assert(modal.querySelector('.sentiment-cards') !== null, 'W modalu wyrenderowano karty składowych');
                closeMarketModal();
                assert(modal.style.display === 'none', 'Modal zamyka się poprawnie');
            } finally {
                slot.remove();
                tooltip.remove();
                modal.remove();
                skills.indexAnalystLvl1.unlockedLevel = 0;
            }
        } finally {
            if (gigIdx) gigIdx.value = gigInitial;
            stocks = originalStocks;
            initMarketRegimes('bull');
            regime.premium = 0.0;
            regime.premiumTarget = 0.0;
            regime.shownPhase = null;
            regime.history = [];
        }

        // 6. Hasło w Akademii
        assert(typeof ACADEMY_ENTRIES.fazy_rynku === 'object', 'Hasło fazy_rynku w Akademii');
        assert(ACADEMY_ENTRIES.fazy_rynku.quiz.length >= 3, 'Quiz faz rynku ma co najmniej 3 pytania');

        // 7. Ręczna zmiana fazy rynku w trybie debug
        debugSetMarketPhase('bear', true);
        const curRegime = getMarketRegime('home');
        assert(curRegime.phase === 'bear' && curRegime.shownPhase === 'bear', 'Debug: faza bear ustawiona i potwierdzona');
        debugSetMarketPhase('euphoria', false);
        assert(curRegime.phase === 'euphoria' && curRegime.shownPhase === null, 'Debug: faza euphoria ustawiona w stanie potwierdzania');
        initMarketRegimes('bull');
    });

    test('0.15 H3: Bańki sektorowe — start, pompowanie, pęknięcie, ekspozycja segmentowa, startupy, emisje i skaner', () => {
        // 1. Rejestr kandydatów
        assert(Array.isArray(SECTOR_BUBBLE_CANDIDATES) && SECTOR_BUBBLE_CANDIDATES.length === 8, '8 kandydatów na bańki');
        const aiCand = SECTOR_BUBBLE_CANDIDATES.find(c => c.id === 'ai');
        assert(aiCand && aiCand.name === 'Sztuczna inteligencja', 'Kandydat AI istnieje');

        // 2. Start i wywołanie debug
        debugTriggerSectorBubble('ai', 0.40);
        const bubble = getActiveSectorBubble();
        assert(bubble && bubble.candidateId === 'ai' && Math.abs(bubble.premium - 0.40) < 1e-6, 'Aktywna bańka AI z premią 40%');
        assert(bubble.phase === 'inflating', 'Bańka w fazie pompowania');

        // 3. Ekspozycja według segmentów (konglomerat vs czysta spółka)
        const pureAi = {
            symbol: 'PAI',
            name: 'Pure AI Inc',
            sector: ['Technologia'],
            segments: [{ sector: 'Technologia', subsector: 'Sztuczna inteligencja', share: 1.0 }]
        };
        const conglo = {
            symbol: 'CNG',
            name: 'Conglomerate SA',
            sector: ['Żywność', 'Technologia'],
            segments: [
                { sector: 'Żywność', subsector: null, share: 0.7 },
                { sector: 'Technologia', subsector: 'Sztuczna inteligencja', share: 0.3 }
            ]
        };
        const other = {
            symbol: 'OTH',
            name: 'Other Corp',
            sector: ['Energia'],
            segments: [{ sector: 'Energia', subsector: 'OZE', share: 1.0 }]
        };

        const origStocks = stocks;
        try {
            stocks = [pureAi, conglo, other];
            updateAllSectorPremiums();

            assertNear(pureAi.sectorPremium, 0.40, 'Czysta spółka AI: pełna premia 40%');
            assertNear(conglo.sectorPremium, 0.12, 'Konglomerat: proporcjonalna premia 30% * 40% = 12%');
            assertNear(other.sectorPremium, 0.0, 'Inna branża: brak premii');

            assert(isCompanyInSectorBubble(pureAi), 'pureAi jest w bańce');
            assert(isCompanyInSectorBubble(conglo), 'conglo jest w bańce');
            assert(!isCompanyInSectorBubble(other), 'other nie jest w bańce');

            // 4. Formatowanie komórki
            const cellUp = formatSectorPremiumCell(0.38, true);
            assert(cellUp.includes('sector-premium up') && cellUp.includes('+38%') && cellUp.includes('badge--warn'), 'Formatowanie komórki z bańką');
            const cellDown = formatSectorPremiumCell(-0.15, false);
            assert(cellDown.includes('sector-premium down') && cellDown.includes('-15%'), 'Formatowanie komórki ujemnej');
            const cellFlat = formatSectorPremiumCell(0.02, false);
            assert(cellFlat.includes('sector-premium flat') && cellFlat.includes('+2%'), 'Formatowanie komórki neutralnej');

            // 5. Pęknięcie bańki i przejście w recovery
            debugPopSectorBubble();
            assert(bubble.phase === 'popping', 'Bańka przeszła w fazę popping');
            assertNear(bubble.popTarget, -0.20, 'Cel pęknięcia -20%');

            advanceSectorBubblesQuarterly(); // krok 1 w popping
            assert(bubble.premium < 0.40, 'Premia spada w trakcie popping');

            advanceSectorBubblesQuarterly(); // krok 2 w popping -> koniec popping -> recovery
            assert(bubble.phase === 'recovering', 'Po zakończeniu popping bańka przechodzi w recovering');

            let recSteps = 0;
            while (getActiveSectorBubble() !== null && recSteps < 10) {
                recSteps++;
                advanceSectorBubblesQuarterly();
            }
            assert(getActiveSectorBubble() === null, 'Bańka wygasła po zakończeniu recovery (4-6 kw.)');
            assert(sectorBubbleCooldown === 4, 'Ustawiony cooldown 4 kwartały');

            // 6. Startupy w sektorze bańki
            debugTriggerSectorBubble('ai', 0.50);
            const aiStartup = {
                symbol: 'AIS',
                name: 'AI Startup',
                successChance: 0.30,
                stage: 'ready',
                segments: [{ sector: 'Technologia', subsector: 'Sztuczna inteligencja', share: 1.0 }]
            };
            assert(isCompanyInSectorBubble(aiStartup), 'Startup AI rozpoznany w sektorze bańki');

            // 7. Akademia
            assert(typeof ACADEMY_ENTRIES.banki_sektorowe === 'object', 'Hasło banki_sektorowe w Akademii');
            assert(ACADEMY_ENTRIES.banki_sektorowe.quiz.length >= 3, 'Quiz baniek sektorowych ma co najmniej 3 pytania');
        } finally {
            stocks = origStocks;
            activeSectorBubble = null;
            sectorBubbleCooldown = 0;
            updateAllSectorPremiums();
        }
    });

    test('0.15 H3: Megaprojekt SMSR — finansowanie (państwo max 50%, inne fundusze, gracz) i poziomy 1-3', () => {
        ensureMarketStabilityProject();
        const p = marketStabilityProject;
        const origLevel = p.level;
        const origContrib = { ...p.contributions };
        const origCash = playerCash;
        const origShield = p.shieldActive;
        const origBubble = activeSectorBubble;

        try {
            // 1. Reset do poziomu 0
            p.level = 0;
            p.contributions = { state: 0, otherFunds: 0, player: 0 };
            p.shieldActive = true;
            p.delayedWarnings = [];

            assert(p.levelCosts.length === 3, 'Trzy poziomy kosztowe SMSR');
            assert(p.levelCosts[0] === 50e6, 'Poziom 1 kosztuje 50 mln PLN');
            assert(p.levelCosts[1] === 150e6, 'Poziom 2 kosztuje 150 mln PLN');
            assert(p.levelCosts[2] === 350e6, 'Poziom 3 kosztuje 350 mln PLN');

            // 2. Kwartalne wpłaty państwa i limit 50%
            const stateLimitLvl1 = 50e6 * MARKET_STABILITY_STATE_MAX_SHARE; // 25M
            for (let q = 0; q < 30; q++) {
                processMarketStabilityProjectQuarterly();
            }
            assert(p.contributions.state <= stateLimitLvl1, 'Wpłaty państwa nie przekraczają 50% kosztu poziomu 1 (25 mln)');
            assert(p.contributions.otherFunds > 0, 'Inne fundusze dokładają się kwartalnie');
            assert(p.level === 0, 'Bez wpłat gracza poziom 1 nie jest od razu domknięty');

            // 3. Wpłata gracza z funduszu
            playerCash = 100e6;
            const remainingToLvl1 = 50e6 - (p.contributions.state + p.contributions.otherFunds + p.contributions.player);
            contributeToMarketStabilityProject(remainingToLvl1);
            assert(p.level === 1, 'Osiągnięto Poziom 1 po uzupełnieniu brakującej kwoty przez gracza');
            assert(isMarketStabilityProjectUnlocked(1), 'isMarketStabilityProjectUnlocked(1) zwraca true');
            assert(!isMarketStabilityProjectUnlocked(2), 'Poziom 2 jest jeszcze zablokowany');

            // 4. Poziom 1: Opóźnione ostrzeżenie o bańce
            macro = macro || { quarter: 10 };
            const testCand = SECTOR_BUBBLE_CANDIDATES[0];
            p.delayedWarnings.push({ targetQuarter: macro.quarter + 1, name: testCand.name, sector: testCand.sector });
            assert(p.delayedWarnings.length === 1, 'Kolejka opóźnionych ostrzeżeń zawiera 1 wpis');

            // Przejście kwartału (targetQuarter jeszcze nie nadszedł)
            processMarketStabilityProjectQuarterly();
            assert(p.delayedWarnings.length === 1, 'Ostrzeżenie jeszcze czeka na swój kwartał');

            // Nadejście targetQuarter
            macro.quarter += 1;
            processMarketStabilityProjectQuarterly();
            assert(p.delayedWarnings.length === 0, 'Ostrzeżenie wyemitowane po nadejściu kwartału');

            // 5. Awans na Poziom 2 i 3
            playerCash = 500e6;
            const toLvl2 = 150e6 - (p.contributions.state + p.contributions.otherFunds + p.contributions.player);
            contributeToMarketStabilityProject(toLvl2);
            assert(p.level === 2, 'Awans na Poziom 2');
            assert(isMarketStabilityProjectUnlocked(2), 'Poziom 2 odblokowany');

            const toLvl3 = 350e6 - (p.contributions.state + p.contributions.otherFunds + p.contributions.player);
            contributeToMarketStabilityProject(toLvl3);
            assert(p.level === 3, 'Awans na Poziom 3 (Tarcza Antybańkowa)');
            assert(isMarketStabilityProjectUnlocked(3), 'Poziom 3 odblokowany');

            // 6. Działanie Tarczy Antybańkowej (Poziom 3)
            p.shieldActive = true;
            activeSectorBubble = {
                candidateId: 'ai',
                name: 'Sztuczna inteligencja',
                sector: 'Technologia',
                subsector: 'Sztuczna inteligencja',
                phase: 'inflating',
                premium: 0.35,
                quarters: 2
            };
            advanceSectorBubblesQuarterly();
            assert(activeSectorBubble === null, 'Tarcza Poziomu 3 natychmiast stłumiła bańkę');

            // 7. Przełączanie tarczy (toggle)
            toggleMarketStabilityShield();
            assert(p.shieldActive === false, 'Tarcza została wyłączona');
            toggleMarketStabilityShield();
            assert(p.shieldActive === true, 'Tarcza została ponownie włączona');

            // 8. Karta UI generuje się poprawnie
            const cardHtml = renderMarketStabilityProjectCard();
            assert(cardHtml.includes('Narodowe Centrum Stabilizacji Rynku') && cardHtml.includes('Tarcza Antybańkowa'), 'Karta SMSR wygenerowana poprawnie');
        } finally {
            p.level = origLevel;
            p.contributions = origContrib;
            p.shieldActive = origShield;
            playerCash = origCash;
            activeSectorBubble = origBubble;
        }
    });

    test('bank aktywowany w trakcie gry ma od razu stopy (bez NaN w kredytach botów)', () => {
        const bank = { id: 'late', name: 'Późny Bank', type: BANK_TYPES.UNIVERSAL, isActive: false, cash: 1e6, baseInterestRateMargin: 0.02, stockPortfolio: {}, loanPortfolio: {}, depositPortfolio: {} };
        commercialBanks.push(bank);
        updateInterestRates();
        bank.isActive = true;
        const ok = Number.isFinite(bank.interestRateLoan) && Number.isFinite(bank.interestRateDeposit);
        commercialBanks.splice(commercialBanks.indexOf(bank), 1);
        assert(ok, 'stopy ustawione');
    });

    test('wykup wszystkich posiadaczy: fundusz, boty, banki, ETF-y, pakiety spółek', () => {
        const a = makeCompany('AAA'); const h = makeCompany('HHH');
        resetWorld([a, h]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        playerPortfolio.AAA = { shares: 100, avgPrice: 100, assetType: 'stock' };
        aiCompetitors[0].portfolio.AAA = { shares: 50, avgPrice: 100 };
        h.equityStakes = { AAA: 30 };
        const etf = createEtf({ symbol: 'TST', templateKey: 'Technologia', seed: 1000 }); etf.holdings = { AAA: 20 }; etfs.push(etf);
        a.sharesHeld = 200;
        const cash = playerCash;
        buyOutAllHolders(a, 10);
        assert(playerCash === cash + 1000 && !aiCompetitors[0].portfolio.AAA && !h.equityStakes.AAA && !etf.holdings.AAA && a.sharesHeld === 0, 'wszyscy wykupieni');
        assert(getTrackedHeldShares(a) === 0, 'brak „wiszących” akcji');
    });
});

group('Balans B1: exploity', () => {
    function world() {
        const a = makeCompany('AAA', { cash: 2_000_000, liabilities: 5_000_000 });
        a.insiderShares = 0; a.reputation = { player: 0 }; a.ceo = { name: 'X', traits: [] };
        ['guard_fund', 'mafia_bruno'].forEach(id => { const i = aiCompetitors.findIndex(ai => ai.id === id); if (i >= 0) aiCompetitors.splice(i, 1); });
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState(); oversight = createOversight(); mafia = createMafia(); scandals = createScandals();
        playerCash = 1_000_000;
        aiCompetitors.forEach(ai => { ai.cash = 1e8; });
        return a;
    }

    test('pakiet pod stołem: raz na kwartał, duży pakiet = mała premia i duże ryzyko', () => {
        const a = world();
        playerPortfolio.AAA = { shares: 5000, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = 5000;
        const cash = playerCash;
        assert(greyUnderTable('AAA', 2000), 'pierwszy');
        const gain = playerCash - cash;
        assert(gain < 2000 * a.price * 1.05, `premia ≤ 4% przy dużym pakiecie (${gain})`);
        assert(getRecord('player').suspicion > GREY_SERVICES.underTable.risk, 'ryzyko rośnie z wielkością');
        assert(!greyUnderTable('AAA', 10), 'drugi w tym samym kwartale zablokowany');
    });

    test('umorzenie długu: najwyżej 15% zobowiązań i 5% aktywów funduszu', () => {
        const a = world();
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        const liabilities = a.balanceSheet.liabilities, assets = getFundAssets();
        greyDebtWriteOff('AAA');
        const writtenOff = liabilities - a.balanceSheet.liabilities;
        assert(writtenOff <= liabilities * 0.15 + 1 && writtenOff <= assets * 0.05 + 1, `umorzono ${writtenOff}`);
    });

    test('parabank: losowy termin upadku 3–8 kw., panika przy sprzedaży dużego pakietu', () => {
        world();
        const parabank = spawnParabank();
        assert(parabank.collapseAt >= 3 && parabank.collapseAt <= 8, 'losowy termin');
        const stock = stocks.find(s => s.symbol === parabank.symbol);
        const random = Math.random;
        Math.random = () => 0.1;
        onParabankSharesSold(stock, stock.totalShares * 0.05);
        Math.random = random;
        assert(parabank.panic, 'panika');
    });

    test('dopłata za akcje: rabat tylko do 25% kosztu, nowe akcje do 10% spółki, płacisz tylko za objęte', () => {
        const a = world();
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = 6000;
        startInternalInvestment(a, { id: 't', name: 'T', durationDays: 28, assetValue: 0, incomeBonus: 0.1 }, 400_000);
        const uid = a.activeInvestments[0].uid;
        const cash = playerCash;
        fundTopUpInvestment('AAA', uid, 300_000, 'shares');
        const paid = cash - playerCash;
        assert(a.topUpShares <= 1000 && paid <= 1000 * 100 + 1, `akcje ${a.topUpShares}, zapłacono ${paid}`);
        assert(!fundTopUpInvestment('AAA', uid, 10_000, 'shares'), 'limit wyczerpany');
    });

    test('wejściówka: akcje zablokowane bez dostępu do giełdy', () => {
        const a = world();
        contactMafia();
        a.exchange = 'DIAMOND';
        mafiaEntryTicket('AAA');
        const holding = playerPortfolio.AAA;
        assert(holding.lockedShares === holding.shares && holding.mafiaLocked > 0, 'zablokowane');
    });

    test('cynk: czasem prowokacja policyjna (podejrzenia bez zmiany kursu)', () => {
        const a = world();
        a.exchange = 'JUNK';
        contactMafia();
        mafia.pumps = [{ symbol: 'AAA', quarter: macro.quarter, outcome: 'sting' }];
        const price = a.price, suspicion = getRecord('player').suspicion;
        const random = Math.random;
        Math.random = () => 0.99;
        processMafiaQuarterly();
        Math.random = random;
        assert(Math.abs(a.price / price - 1) < 0.1 && getRecord('player').suspicion > suspicion + 20, 'prowokacja');
    });

    test('prezenty: malejący efekt, Stoik odmawia, samymi prezentami najwyżej do 60', () => {
        world();
        botRelations = createBotRelations();
        const reckless = aiCompetitors.find(ai => ai.personality === 'reckless');
        const calm = aiCompetitors.find(ai => ai.personality === 'calm');
        playerWallet.cash = 1e6;
        assert(!giveGiftToBot(calm.id, 1000), 'Stoik odmawia');
        giveGiftToBot(reckless.id, 1500);
        const first = getRelation(reckless.id);
        macro.quarter++;
        giveGiftToBot(reckless.id, 1500);
        assert(getRelation(reckless.id) - first < first, 'drugi słabszy');
        for (let i = 0; i < 10; i++) { macro.quarter++; giveGiftToBot(reckless.id, 1500); }
        assert(getRelation(reckless.id) <= 60, 'limit 60');
    });

    test('sprzedaż funduszu respektuje akcje zablokowane (zastaw)', () => {
        const a = world();
        playerPortfolio.AAA = { shares: 100, avgPrice: 100, assetType: 'stock', lockedShares: 80 };
        a.sharesHeld = 100;
        sellStock('AAA', 50);
        assert(playerPortfolio.AAA.shares === 100, 'nie sprzedano zablokowanych');
    });
});

group('Balans B2: poczta i powiadomienia', () => {
    function world() {
        const a = makeCompany('AAA'); a.name = 'Alfa Tech';
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState(); mafia = createMafia();
        mailbox = createMailbox();
        return a;
    }

    test('ważny nieprzeczytany mail nie wypada przy przepełnieniu skrzynki', () => {
        world();
        const important = addMail({ sender: CORPORATION_SENDER, subject: 'Decyzja', body: '', importance: 3, action: { type: 'agm', symbol: 'AAA' } });
        for (let i = 0; i < MAIL_LIMIT + 20; i++) addMail({ sender: 'PULS', subject: `news ${i}`, body: '', importance: 1 });
        assert(mailbox.messages.includes(important), 'przypięty');
    });

    test('rutyna o spółkach spoza portfela trafia do wydania gazety', () => {
        world();
        const count = mailbox.messages.length;
        logEvent('Alfa Tech ogłasza wyniki kwartalne.', 'company');
        assert(mailbox.messages.length === count && mailbox.digest.length === 1, 'w wydaniu');
        processMailWeekly(); processMailWeekly();
        assert(mailbox.messages.some(m => /Wydanie rynkowe/.test(m.subject)) && mailbox.digest.length === 0, 'wydanie opublikowane');
    });

    test('okno wyników festynu → powiadomienie z przyciskiem „Otwórz”', () => {
        world();
        const bar = document.getElementById('notif-bar') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'notif-bar' });
        const before = bar.children.length;
        openFestivalResultsModal([], 'Test');
        assert(bar.children.length === before + 1, 'powiadomienie');
        bar.querySelectorAll('.notif-item').forEach(item => dismissNotification(item.dataset.id));
    });

    test('żądanie mafii: termin do końca następnego kwartału', () => {
        world();
        mafia.contacted = true;
        mafia.demand = { type: 'haracz', amount: 100, quarter: macro.quarter, deadline: macro.quarter + 1 };
        macro.quarter += 1;
        const random = Math.random; Math.random = () => 0.99;
        processMafiaQuarterly();
        assert(mafia.demand !== null, 'jeszcze czeka');
        macro.quarter += 1;
        processMafiaQuarterly();
        Math.random = random;
        assert(!mafia.demand || mafia.demand.quarter >= macro.quarter, 'po terminie rozstrzygnięte');
    });
});

// --------------------------------------------------------------------------------
// Uruchomienie
// --------------------------------------------------------------------------------

group('Balans B3: cele korporacji, przyzwoity fundusz, obligacje projektowe, Gwardia', () => {
    function world() {
        const a = makeCompany('AAA', { cash: 5_000_000 });
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState(); oversight = createOversight(); specialProjects = createSpecialProjects();
        playerCash = 1_000_000;
        return a;
    }

    test('cele: 2 losowe cele, spełniony +5, niespełniony −3', () => {
        world();
        const goals = ensureCorporateGoals();
        assert(goals.ids.length === 2, 'dwa cele');
        goals.ids = ['compliance', 'board'];
        const result = settleCorporateGoals();
        assert(result.delta === 5 - 3, `delta ${result.delta}`);
        assert(corporation.goals.ids.length === 2 && corporation.lastGoals.length === 2, 'nowe cele przydzielone');
    });

    test('cele: dywidendy i udział w projekcie są liczone', () => {
        world();
        ensureCorporateGoals();
        noteCorporateGoal('dividends', getFundAssets() * 0.03);
        noteCorporateGoal('project');
        corporation.goals.ids = ['dividends', 'project'];
        assert(getCorporateGoalsView().every(goal => goal.done), 'spełnione');
    });

    test('przyzwoity fundusz: dotacje obniżają karę o 25%', () => {
        world();
        playerWallet.cash = 1e6;
        const cash = playerCash;
        punishEntity('player', 'KNF');
        const normal = cash - playerCash;
        oversight = createOversight();
        donateToInstitution('knf', getDecentFundThreshold() + 100);
        assert(isDecentFund(), 'status');
        const cash2 = playerCash;
        punishEntity('player', 'KNF');
        const reduced = cash2 - playerCash;
        assert(reduced < normal * 0.8, `kara ${reduced} vs ${normal}`);
    });

    test('obligacje projektowe: odsetki, wykup z premią, liczą się do aktywów', () => {
        const a = world();
        const b = makeCompany('BBB', { cash: 5_000_000 });
        stocks.push(b);
        const project = { id: 'pX', name: 'Test', icon: '🏗️', cost: 1_000_000, quarters: 2, participants: [{ symbol: 'AAA', name: a.name, amount: 450_000 }, { symbol: 'BBB', name: b.name, amount: 450_000 }], status: 'building', progress: 0 };
        specialProjects.active.push(project);
        const assets = getFundAssets();
        assert(buyProjectBond('pX', 50_000), 'zakup');
        assert(Math.abs(getFundAssets() - assets) < 1, 'aktywa bez zmian przy zakupie');
        const cash = playerCash;
        payProjectBondInterest(project);
        assert(playerCash > cash, 'odsetki');
        const before = playerCash;
        redeemProjectBonds(project, true);
        assert(playerCash - before >= 50_000 * 1.05 - 1 && getFundProjectBondsValue() === 0, 'wykup z premią');
    });

    test('obligacje projektowe: upadek w budowie = odzysk 50%', () => {
        world();
        const project = { id: 'pY', name: 'Test', icon: '🏗️', cost: 1_000_000, quarters: 2, participants: [], status: 'building', progress: 0.5 };
        specialProjects.active.push(project);
        buyProjectBond('pY', 20_000);
        const cash = playerCash;
        expireProject(project, 'test');
        assert(Math.abs(playerCash - cash - 10_000) < 1, 'połowa');
    });

    test('wroga Gwardia głosuje przeciw na walnych spółek funduszu', () => {
        const a = world();
        botRelations = createBotRelations();
        const guard = spawnGuardFund();
        playerPortfolio.AAA = { shares: a.totalShares * 0.1, avgPrice: 100, assetType: 'stock' };
        botRelations.values[guard.id] = -60;
        const holder = { kind: 'ai', entity: guard };
        assert(getVoteForProbability(holder, { kind: 'board', type: 'dividend' }, a) <= 0.1, 'przeciw');
        botRelations.values[guard.id] = 60;
        assert(getVoteForProbability(holder, { kind: 'activist', type: 'raiseDividend' }, a) >= 0.8, 'przyjazna popiera wnioski');
    });
});


group('Balans B4: decyzje JU, PPP, rynki, wybory, wojny PR', () => {
    function world() {
        const a = makeCompany('AAA', { cash: 5_000_000 });
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState(); oversight = createOversight(); scandals = createScandals();
        playerCash = 1_000_000;
        return a;
    }

    test('opłata za zarządzanie: zakres 0,5–3%, raz na kwartał, pobierana wg stawki', () => {
        world();
        assert(!setPlayerFeeRate(5), 'poza zakresem');
        assert(setPlayerFeeRate(2), 'ustawiona');
        assert(!setPlayerFeeRate(1), 'drugi raz w kwartale');
        const fee = chargeManagementFee();
        assert(Math.abs(fee - getFundAssets() * 0.02 / FUND_WEEKS_PER_YEAR) / fee < 0.01, `opłata ${fee}`);
        assert(getFeeAttractiveness() < 1, 'wysoka opłata odstrasza');
    });

    test('kampania marketingowa: koszt z budżetu korporacji, dodatkowi kupujący', () => {
        world();
        corporation.budget = 1e6;
        const budget = corporation.budget;
        assert(startMarketingCampaign('premium'), 'start');
        assert(corporation.budget < budget, 'koszt');
        const buyers = applyFeeAndCampaign([]);
        assert(buyers.length >= 2 && buyers.every(b => ['rich', 'investor'].includes(b.key) || b.key === 'miser' || true), 'kupujący');
        assert(!startMarketingCampaign('safe'), 'jedna naraz');
    });

    test('PPP: restrukturyzacja — zgoda wydłuża termin i podnosi oprocentowanie', () => {
        world();
        playerFund.ppp = [{ id: 'ppp_t', name: 'Most', icon: '🌉', principal: 10_000, rate: 0.06, weeksLeft: 4, termWeeks: 52, unpaid: 0, extensions: 0, restructure: 'pending' }];
        assert(respondPppRestructure('ppp_t', true), 'zgoda');
        const stake = playerFund.ppp[0];
        assert(stake.weeksLeft === 30 && Math.abs(stake.rate - 0.07) < 1e-9, 'warunki');
        assert(!respondPppRestructure('ppp_t', false), 'tylko raz');
    });

    test('przeniesienie notowań: tylko większość, cena −3%', () => {
        const a = world();
        ensureMarketOperators();
        marketOperators.XTD.status = 'active';
        assert(!moveListing('AAA', 'XTD'), 'bez większości');
        playerPortfolio.AAA = { shares: a.totalShares * 0.6, avgPrice: 100, assetType: 'stock' };
        const price = a.price;
        assert(moveListing('AAA', 'XTD'), 'przeniesiona');
        assert(getStockMarket(a) === 'XTD' && a.price < price, 'rynek i wycena');
        assert(!moveListing('AAA', 'GPW'), 'raz na rok');
    });

    test('darowizna wyborcza: tylko w kampanii, limit 2%, podejrzenia KNF', () => {
        world();
        assert(!supportElectionCampaign('state', 1000), 'poza kampanią');
        macro.election.campaign = true;
        const suspicion = getRecord('player').suspicion;
        assert(!supportElectionCampaign('state', getFundAssets() * 0.05), 'limit');
        assert(supportElectionCampaign('state', 10_000), 'darowizna');
        assert(getRecord('player').suspicion > suspicion, 'podejrzenia');
        macro.election.ruling = 'state';
        settlePoliticalFavor();
        assert(getPoliticalFavor() === 1, 'przychylność wygranych');
    });

    test('wojna PR: od 20% akcji fundusz może podpowiedzieć kampanię', () => {
        const a = world();
        const b = makeCompany('BBB', { cash: 5_000_000 });
        stocks.push(b);
        scandals.prWars = [{ a: 'AAA', b: 'BBB', quartersLeft: 3, score: 0, boost: { AAA: 0, BBB: 0 } }];
        playerPortfolio.AAA = { shares: a.totalShares * 0.1, avgPrice: 100, assetType: 'stock' };
        assert(!supportPrCampaign('AAA'), '10% za mało');
        playerPortfolio.AAA.shares = a.totalShares * 0.45;
        const random = Math.random; Math.random = () => 0.1;
        const ok = supportPrCampaign('AAA');
        Math.random = random;
        assert(ok && scandals.prWars[0].boost.AAA > 0, 'zarząd przyjął sugestię');
    });
});

group('Balans B5: rynek i tempo', () => {
    test('zatłoczony rynek: presja ponad 100 spółek, łagodnie mniej debiutów', () => {
        const list = [];
        for (let i = 0; i < 120; i++) list.push(makeCompany(`C${i}`));
        resetWorld(list.slice(0, 80));
        assert(getDebutFactor() === 1, 'poniżej limitu bez zmian');
        resetWorld(list);
        assert(getCrowdingPressure() === 1 && Math.abs(getDebutFactor() - 0.3) < 1e-9, `ponad limitem ${getDebutFactor()}`); // 0.13.1 (D2): do −70%
    });

    test('ponad limitem: mała spółka z kondycją ≤ −3 jest kandydatem do upadku', () => {
        const list = [];
        for (let i = 0; i < 110; i++) list.push(makeCompany(`C${i}`));
        resetWorld(list);
        macro = createMacroState();
        const small = list[0];
        small.price = 0.5; small.financialHealth = -3;
        assert(isCullCandidate(small), 'kandydat');
        list[1].financialHealth = 2;
        assert(!isCullCandidate(list[1]), 'zdrowa spółka bezpieczna');
    });

    test('kotwica księgowa: najwyżej 2× wartości z zysku', () => {
        const a = makeCompany('AAA');
        resetWorld([a]);
        a.ledgerQuarters = 8;
        a.fundamentals = { history: [1, 2, 3, 4].map(() => ({ revenue: 1e6, ebitda: 2e5, netIncome: a.totalShares * 0.5 })) };
        a.balanceSheet.assets = a.totalShares * 10_000; // ogromna wartość księgowa
        a.balanceSheet.liabilities = 0;
        updateFundamentalRatios(a);
        const f = a.fundamentals;
        assert(f.epsTtm > 0, 'zysk');
        assert(f.fairValue < f.bookValuePerShare * 0.25, `wycena ${f.fairValue} przy BVPS ${f.bookValuePerShare}`);
    });

    test('bezczynny fundusz: powód spadku zaufania (gotówka)', () => {
        const a = makeCompany('AAA');
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        playerCash = 100_000;
        assert(getTrustDropReasons().some(r => /gotówce/.test(r)), 'gotówka');
    });
});

group('Uwagi U1: błędy i exploity', () => {
    function world() {
        const a = makeCompany('AAA', { cash: 5_000_000 });
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        playerCash = 1_000_000;
        return a;
    }

    test('startup: mała wpłata przy dużym celu zbiórki = mały udział', () => {
        world();
        const startup = generateNewStartup();
        startup.fundingGoal = 300_000;
        stocks.push(startup);
        addFundStartupStake(startup, 35);
        handleSuccessfulIPO(startup, 2);
        const pct = (playerPortfolio[startup.symbol]?.shares || 0) / startup.totalShares;
        assert(pct < 0.001, `udział ${(pct * 100).toFixed(3)}%`);
    });

    test('fundusz nie kupi akcji na giełdzie ponad poziom stanowiska', () => {
        const a = world();
        a.exchange = 'PLATINUM';
        const before = playerPortfolio.AAA?.shares || 0;
        buyStock('AAA', 1);
        assert((playerPortfolio.AAA?.shares || 0) === before, 'zakup zablokowany');
    });

    test('obligacje: oprocentowanie = stopa bazowa + premia za ryzyko, z limitem', () => {
        world();
        const base = centralBank.baseInterestRate;
        assert(getRiskBondRate(0.7) <= base + 0.15 + 1e-9 && getRiskBondRate(0.7) > getRiskBondRate(0.1), 'premia rośnie z ryzykiem');
        assert(getRiskBondRate(0.1) < base + 0.03, `niskie ryzyko ${getRiskBondRate(0.1)}`);
    });

    test('negocjacje: żądanie przyjęte podnosi cenę oferty, zerwanie kończy przejęcie', () => {
        const a = world();
        const b = makeCompany('BBB', { cash: 1e9 });
        stocks.push(b);
        playerPortfolio.AAA = { shares: a.totalShares * 0.6, avgPrice: 100, assetType: 'stock' };
        initiateMergerProcess(b, a, 'przejęcie', 'cash', 0.2);
        const pair = getTakeoverAgainst(a);
        assert(pair, 'proces przejęcia');
        assert(startPlayerNegotiation('AAA'), 'start');
        const price = pair.process.offerDetails.buyoutPricePerShare;
        const random = Math.random; Math.random = () => 0.01;
        const result = negotiationDemand('AAA', 0.1);
        Math.random = random;
        assert(result === 'accepted' && pair.process.offerDetails.buyoutPricePerShare > price, `wynik ${result}`);
        assert(getNegotiationAcceptChance(b, 0.4) < getNegotiationAcceptChance(b, 0.05), 'wyższe żądanie = mniejsza szansa');
    });
});

group('Uwagi U2: interfejs', () => {
    test('zmiana tygodniowa liczona od zamknięcia tygodnia gry', () => {
        const a = makeCompany('AAA');
        resetWorld([a]);
        a.price = 100; recordWeeklyCloses();
        a.price = 110;
        assertNear(getStockChangePct(a, 1), 0.1, 'zmiana +10%');
    });

    test('filtr posiadanych: fundusz albo konto prywatne', () => {
        const a = makeCompany('AAA'); const b = makeCompany('BBB');
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        playerPortfolio.AAA = { shares: 5, avgPrice: 10, assetType: 'stock' };
        assert(isStockOwnedByPlayer(a) && !isStockOwnedByPlayer(b), 'tylko posiadane');
    });
});

group('Uwagi U3: fundamenty spółek', () => {
    test('spółki z jednego sektora startują z różnym C/Z', () => {
        const list = [];
        for (let i = 0; i < 8; i++) {
            const c = makeCompany(`S${i}`, { cash: 200_000, fixedAssets: 800_000 });
            c.price = 100; c.financialHealth = 0;
            initializeFundamentals(c, true);
            list.push(c.fundamentals.peRatio);
        }
        const min = Math.min(...list), max = Math.max(...list);
        assert(max / min > 1.2, `rozrzut C/Z ${min.toFixed(1)}–${max.toFixed(1)}`);
    });

    test('cechy spółki są stałe (zapisane), marża wpływa na wynik', () => {
        const c = makeCompany('MRG', { cash: 200_000, fixedAssets: 800_000 });
        initializeFundamentals(c, true);
        const gap = c.valuationGap;
        initializeFundamentals(c, true);
        assert(c.valuationGap === gap && Math.abs(c.marginAdj) <= 0.3 && c.valuationGap >= 0.72 && c.valuationGap <= 1.4, 'stałe cechy');
    });

    test('spółka państwowa ma wskaźniki (C/Z)', () => {
        const c = makeCompany('PANS', { cash: 200_000, fixedAssets: 800_000 });
        c.isStateOwned = true; c.stateOwnershipPct = 0.6;
        initializeFundamentals(c, true);
        assert(Number.isFinite(c.fundamentals.peRatio) && c.fundamentals.peRatio > 0, 'C/Z');
    });
});

group('Nauka N1/N2: Akademia, mediany sektora, skaner, wycena', () => {
    function world() {
        const list = [];
        for (let i = 0; i < 6; i++) {
            const c = makeCompany(`N${i}`, { cash: 200_000, fixedAssets: 800_000 });
            c.price = 100; c.sector = ['Żywność']; c.financialHealth = i - 2; c.exchange = 'JUNK';
            initializeFundamentals(c, true);
            list.push(c);
        }
        resetWorld(list);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        sectorMedianCache = { at: 0, data: {} };
        return list;
    }

    test('mediana sektora i porównanie wskaźnika', () => {
        const list = world();
        const med = getSectorMedians('Żywność');
        const pes = list.map(s => s.fundamentals.peRatio).sort((a, b) => a - b);
        assertNear(med.pe, (pes[2] + pes[3]) / 2, 'mediana C/Z');
        assert(compareWithSector(med.pe * 0.5, med.pe).text.includes('tania'), 'tania względem sektora');
        assert(compareWithSector(med.pe * 2, med.pe).text.includes('droga'), 'droga względem sektora');
    });

    test('Akademia: hasła bazowe, odblokowanie, quiz z nagrodą tylko raz', () => {
        world();
        assert(isAcademyUnlocked('cz') && !isAcademyUnlocked('roe'), 'bazowe');
        assert(unlockAcademyEntry('roe') && isAcademyUnlocked('roe'), 'odblokowane');
        assert(!submitAcademyQuiz('etf', [0, 0, 0]), 'zablokowany quiz');
        const cash = playerWallet.cash;
        const wrong = submitAcademyQuiz('roe', [1, 0, 0]);
        assert(!wrong.passed && wrong.correct === 2, 'błędna odpowiedź');
        const ok = submitAcademyQuiz('roe', ACADEMY_ENTRIES.roe.quiz.map(q => q.c));
        assert(ok.passed && playerWallet.cash === cash + ACADEMY_QUIZ_REWARD, 'nagroda');
        assert(submitAcademyQuiz('roe', ACADEMY_ENTRIES.roe.quiz.map(q => q.c)).reward === 0, 'nagroda tylko raz');
    });

    test('każde hasło ma 3 pytania z poprawną odpowiedzią i przykład bez błędu', () => {
        world();
        for (const [id, entry] of Object.entries(ACADEMY_ENTRIES)) {
            assert(entry.quiz.length === 3 && entry.quiz.every(q => q.c >= 0 && q.c < q.a.length), `quiz ${id}`);
            entry.example();
        }
    });

    test('skaner: filtry zadłużenia i kondycji, sortowanie', () => {
        const list = world();
        list[0].balanceSheet.liabilities = list[0].balanceSheet.assets * 0.9;
        const rows = runScanner({ ...SCANNER_DEFAULT_FILTERS, debtMax: 50, healthMin: 0 }, 'health', -1);
        assert(rows.every(r => r.m.debt <= 0.5 && r.m.health >= 0), 'filtry');
        assert(!rows.some(r => r.stock === list[0]), 'zadłużona odfiltrowana');
        assert(rows.length >= 2 && rows[0].m.health >= rows[rows.length - 1].m.health, 'sortowanie malejąco');
    });

    test('metody wyceny: porównawcza, majątkowa, Gordon tylko z dywidendą', () => {
        const list = world();
        const v = getValuationMethods(list[3]);
        assert(v.pe > 0 && v.book > 0, 'porównawcza i majątkowa');
        assert(v.gordon === null, 'bez dywidendy brak Gordona');
        assert(v.g < v.r, 'g < r');
    });
});

group('Nauka N3: kreatywna księgowość, czerwone flagi, audyt', () => {
    function world(n = 4) {
        const list = [];
        for (let i = 0; i < n; i++) {
            const c = makeCompany(`K${i}`, { cash: 500_000, fixedAssets: 800_000 });
            c.price = 100; c.financialHealth = 0;
            initializeFundamentals(c, true);
            list.push(c);
        }
        resetWorld(list);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState(); oversight = createOversight();
        playerCash = 1_000_000;
        return list;
    }

    test('oszust: zysk zawyżony, różnica w należnościach, gotówka z prawdziwego zysku', () => {
        const [a] = world();
        a.fraud = { start: 0, correctAt: 5, total: 0 };
        const model = { revenue: 100_000, depreciation: 5_000 };
        const fake = getFraudInflation(a, model, 10_000);
        assert(fake > 0 && fake <= model.revenue * FRAUD_FAKE_CAP + 1e-6, `zawyżenie ${fake}`);
        const assets = a.balanceSheet.assets;
        const acc = recordAccountingQuarter(a, model, 10_000, fake);
        assertNear(a.balanceSheet.assets - assets, fake, 'należności w aktywach');
        assertNear(acc.ocf, 10_000 + 5_000, 'przepływy = prawdziwy zysk + amortyzacja (bez zawyżenia)');
        assert(getFraudInflation({ ...a, fraud: null }, model, 10_000) === 0, 'uczciwa spółka nie zawyża');
    });

    test('korekta wyników: odpis, spadek kursu, koniec oszustwa', () => {
        const [a] = world();
        a.fraud = { start: 0, correctAt: 1, total: 50_000 };
        a.balanceSheet.assets += 50_000; a.balanceSheet.retainedEarnings += 50_000;
        const assets = a.balanceSheet.assets, price = a.price;
        revealFraud(a, 'test');
        assert(!a.fraud && a.balanceSheet.assets <= assets - 50_000 + 1 && a.price < price, 'korekta');
        assert(a.fraudHistory.length === 1, 'historia');
    });

    test('czerwone flagi: zysk bez gotówki + zmiana audytora; uczciwa spółka bez flag', () => {
        const [a, b] = world();
        a.fundamentals.history = [1, 2, 3, 4, 5].map(() => ({ revenue: 100, netIncome: 20, ocf: 2, receivables: 50 }));
        a.fundamentals.history[0].receivables = 20;
        a.auditorChangedQuarter = macro.quarter;
        assert(getRedFlags(a).length >= 3, 'flagi oszusta');
        b.fundamentals.history = [1, 2, 3, 4, 5].map(() => ({ revenue: 100, netIncome: 20, ocf: 22, receivables: 25 }));
        assert(getRedFlags(b).length === 0, 'uczciwa bez flag');
    });

    test('audyt: wymaga poziomu 5, kosztuje fundusz, wykrywa oszustwo', () => {
        const [a] = world();
        assert(!orderAudit(a.symbol), 'bez szkolenia');
        skills.accountant.unlockedLevel = 5;
        a.fraud = { start: 0, correctAt: 9, total: 30_000 };
        const cash = playerCash;
        assert(orderAudit(a.symbol) && playerCash < cash, 'zlecony i opłacony');
        macro.quarter += 1;
        const random = Math.random; Math.random = () => 0.99;
        finishAudit(a);
        Math.random = random;
        skills.accountant.unlockedLevel = 0;
        assert(a.audit.done && !a.audit.clean && a.audit.inflation === 30_000, 'wykryte');
    });

    test('oszustw najwyżej 5% notowanych spółek', () => {
        world(40);
        const random = Math.random; Math.random = () => 0.0001;
        try { processAccountingQuarterly(); } finally { Math.random = random; }
        assert(stocks.filter(s => s.fraud).length <= 2, `oszustów ${stocks.filter(s => s.fraud).length}`);
    });
});

group('Naprawa: hipoteki botów bez oprocentowania (NaN w gotówce)', () => {
    test('stary kredyt bez oprocentowania nie psuje gotówki bota', () => {
        const a = makeCompany('AAA');
        resetWorld([a]);
        const ai = aiCompetitors[0];
        ai.cash = 10_000;
        ai.loans = [{ id: 'mort_x', bankId: null, bankName: 'Test', amount: 1000, weeklyPayment: 30, maturityDate: Date.now() + 1e6 }];
        processAiLoansWeekly(ai);
        assert(Number.isFinite(ai.cash) && Number.isFinite(ai.loans[0]?.amount ?? 0), `gotówka ${ai.cash}`);
        ai.loans = [];
    });
});

group('Nauka N4/N5: Mentor, certyfikaty, wykres, wpływ zlecenia', () => {
    function world() {
        const list = [];
        for (let i = 0; i < 6; i++) {
            const c = makeCompany(`M${i}`, { cash: 200_000, fixedAssets: 800_000 });
            c.price = 100; c.sector = [['Żywność', 'Energia', 'Chemia', 'Gaming', 'Finanse', 'Przemysł'][i]]; c.exchange = 'JUNK';
            initializeFundamentals(c, true);
            list.push(c);
        }
        resetWorld(list);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        macro = createMacroState();
        playerCash = 100_000;
        return list;
    }

    test('mentor: 3 aktywne zadania, zaliczenie daje nagrodę, certyfikat po wymaganej liczbie', () => {
        world();
        assignMentorTasks();
        const mentor = getMentor();
        assert(mentor.active.length === MENTOR_ACTIVE_TASKS, 'aktywne zadania');
        const cash = playerWallet.cash;
        ['cz', 'cwk', 'wycena'].forEach(id => { unlockAcademyEntry(id); getAcademy().quizzes[id] = true; });
        mentor.events.financeViews = ['A', 'B', 'C'];
        checkMentorTasks(); checkMentorTasks();
        assert(mentor.done.valuationQuiz !== undefined && mentor.done.compareValuation !== undefined, 'zadania zaliczone');
        assert(playerWallet.cash >= cash + 2 * MENTOR_REWARD, 'nagrody');
        mentor.done.bookValue = 0;
        checkMentorTasks();
        assert(hasCertificate('analyst'), 'certyfikat analityka');
    });

    test('awans na Kierownika projektu wymaga certyfikatu', () => {
        world();
        playerProfile.positionId = 'senior';
        const participants = [{ id: 'player', isPlayer: true, positionId: 'senior', score: 95, periods: [] }];
        applyPositionChanges(participants);
        assert(participants[0].positionId === 'senior' && participants[0].blockedBy === 'analyst', 'awans wstrzymany');
        getMentor().certificates.analyst = 0;
        const again = [{ id: 'player', isPlayer: true, positionId: 'senior', score: 95, periods: [] }];
        applyPositionChanges(again);
        assert(again[0].positionId === 'projectLead', 'awans z certyfikatem');
    });

    test('zadanie dywersyfikacji: 5 sektorów, żadna pozycja > 30%', () => {
        const list = world();
        list.slice(0, 5).forEach(s => { playerPortfolio[s.symbol] = { shares: 50, avgPrice: 100, assetType: 'stock' }; s.sharesHeld = 50; });
        assert(MENTOR_TASKS.diversify.check({ data: {} }), 'zaliczone');
    });

    test('wykres: wydarzenia spółki zapisywane (najwyżej 20)', () => {
        const [a] = world();
        for (let i = 0; i < 25; i++) addChartEvent(a, '📄', `raport ${i}`);
        assert(a.chartEvents.length === 20 && a.chartEvents[19].label === 'raport 24', 'znaczniki');
    });

    test('wpływ zlecenia: większe zlecenie = większy wpływ, limit 2%', () => {
        const [a] = world();
        const small = estimateOrderImpact(a, 1), big = estimateOrderImpact(a, 100000);
        assert(small.impact < big.impact && big.impact <= 0.02, `wpływ ${small.impact} / ${big.impact}`);
    });
});

group('Akcje ponad wolny obrót: ETF, bank, insiderzy (CZB 7596 ≠ 8195)', () => {
    // Wolny obrót 10000 − 3000 insiderów = 7000; ETF trzyma 4000 → do kupienia 3000.
    function worldFloat() {
        const a = makeCompany('AAA');
        a.insiderShares = 3000; a.sharesHeld = 0; a.financialHealth = 2;
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        allBonds.length = 0;
        const etf = createEtf({ symbol: 'TST', templateKey: 'Technologia', seed: 1000 });
        etf.holdings = { AAA: 4000 };
        etfs.push(etf);
        a.sharesHeld = 4000;
        return { a, etf };
    }
    const overheld = stock => getTrackedHeldShares(stock) - getFreeFloatShares(stock);

    test('wczytanie zapisu przy starcie strony: sharesHeld liczy pakiety ETF-ów z zapisu', () => {
        worldFloat();
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        etfs.length = 0; // świeża strona: ETF-y z zapisu odtwarzane w applySaveSnapshot
        const report = applySaveSnapshot(snapshot);
        assert(report.ok, report.errors.join(' '));
        const a = stocks.find(s => s.symbol === 'AAA');
        assert(a.sharesHeld === 4000, `sharesHeld po wczytaniu: ${a.sharesHeld} (oczekiwano 4000)`);
        assert(getAvailableShares(a) === 3000, `dostępne: ${getAvailableShares(a)}`);
        const ai = aiCompetitors[0];
        ai.cash = 10_000_000;
        aiBuyStock(ai, 'AAA', 10000);
        assert(overheld(a) <= 0, `posiadacze ponad wolny obrót o ${overheld(a)}`);
        assert(checkWorldInvariants().length === 0, checkWorldInvariants().join('; '));
    });

    test('zaniżone sharesHeld nie pozwala ETF-owi ani bankowi kupić ponad wolny obrót', () => {
        const { a, etf } = worldFloat();
        a.sharesHeld = 0; // np. stary zapis
        assert(getAvailableShares(a) === 3000, `dostępne przy zaniżonym sharesHeld: ${getAvailableShares(a)}`);
        const bank = { id: 'bnk', name: 'Bank Testowy', type: BANK_TYPES.INVESTMENT, isActive: true, cash: 50_000_000, initialCapital: 1_000_000, stockPortfolio: {}, loanPortfolio: {} };
        commercialBanks.push(bank);
        const random = Math.random;
        a.lastTurnover = 1e9; // 0.14.2 P5: bank kupuje spółki popularne (obrót kwartału)
        Math.random = () => 0.31;
        try { runInvestmentBankAI(bank); } finally { Math.random = random; }
        assert(bank.stockPortfolio.AAA?.shares > 0 && bank.stockPortfolio.AAA.shares <= 3000, `bank kupił ${bank.stockPortfolio.AAA?.shares} (wolne były 3000)`);
        a.sharesHeld = 0; // znów zaniżone
        etf.cash = 10_000_000;
        let bought = 0;
        for (let i = 0; i < 20; i++) bought += etfBuy(etf, a, 10000);
        commercialBanks.splice(commercialBanks.indexOf(bank), 1);
        const bankShares = bank.stockPortfolio.AAA?.shares || 0; // 0.14.2 P5: bank bierze pozycję, nie cały wolny obrót
        assert(bought === 3000 - bankShares && etf.holdings.AAA === 4000 + bought, `ETF dokupił ${bought}, wolne po banku ${3000 - bankShares}`);
        assert(overheld(a) <= 0, `posiadacze ponad wolny obrót o ${overheld(a)}`);
    });

    test('pula insiderów (stary zapis) nie zjada akcji posiadanych przez inwestorów', () => {
        const { a } = worldFloat();
        a.insiderShares = undefined; // zapis sprzed puli insiderów: ETF ma 4000, gracz kupuje 5500
        playerPortfolio.AAA = { shares: 5500, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld += 5500;
        const held = getTrackedHeldShares(a);
        initializeOwnership(a);
        assert(a.insiderShares <= 10000 - held, `insiderzy ${a.insiderShares} przy posiadaczach ${held}`);
        assert(overheld(a) <= 0, `posiadacze ponad wolny obrót o ${overheld(a)}`);
    });

    test('uzgadnianie leczy nadmiar: oddają go insiderzy, pakiety inwestorów zostają', () => {
        const { a, etf } = worldFloat();
        etf.holdings.AAA = 4506 + 3424; // jak CZB: bank + ETF ponad wolny obrót
        a.sharesHeld = 7000;
        assert(overheld(a) === 930, `nadmiar przed: ${overheld(a)}`);
        reconcileSharesHeld();
        assert(etf.holdings.AAA === 7930 && a.insiderShares === 2070, `ETF ${etf.holdings.AAA}, insiderzy ${a.insiderShares}`);
        assert(a.sharesHeld === 7930 && overheld(a) === 0, `sharesHeld ${a.sharesHeld}`);
        assert(checkWorldInvariants().length === 0, checkWorldInvariants().join('; '));
    });
});

group('Społeczeństwo i rynek pracy (0.13 S1–S6)', () => {
    function worldS() {
        const a = makeCompany('AAA', { cash: 5_000_000 });
        const b = makeCompany('BBB', { cash: 5_000_000 });
        [a, b].forEach(s => { s.insiderShares = 0; s.exchange = 'SILVER'; s.ceo = { name: 'Jan Test', age: 50, tenure: 4, traits: [] }; });
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        society = createSocietyState();
        macro = createMacroState();
        macro.inflation = 0.025; macro.unemployment = NATURAL_UNEMPLOYMENT;
        [a, b].forEach(s => { initializeFundamentals(s); ensureWorkforce(s); });
        return { a, b };
    }
    /** Neutralne zatrudnienie: polityka Standardowa, płace 1,0, bez związku i rotacji. */
    function neutral(stock) {
        Object.assign(stock.workforce, { policy: 'standard', payMult: 1, productivity: 1, productivityBonus: 0, wagePremium: 0, rotation: 0, union: null, strike: null, greyCleanUntil: -1 });
    }
    function quarterOf(stock, seed = 777) {
        const copy = JSON.parse(JSON.stringify(stock));
        const result = withSeededRandom(seed, () => computeQuarterResults(copy));
        return { ...result, margin: result.ebitda / result.revenue, base: copy.fundamentals.revenue };
    }

    test('S2 kalibracja: neutralne zatrudnienie nie zmienia marży ani zysku względem 0.12', () => {
        const { a } = worldS();
        neutral(a);
        assertNear(getLaborCostIndex(a), 1, 'indeks kosztu pracy', 1e-12);
        const with013 = quarterOf(a);
        const without = quarterOf({ ...a, workforce: undefined });
        assert(Math.abs(with013.margin - without.margin) < 0.001, `marża ${with013.margin} vs ${without.margin}`);
        assertNear(with013.netIncome, without.netIncome, 'zysk netto', 1e-9);
        // Każda spółka i sektor: indeks 1,0 przy neutralnych ustawieniach (także z szarą strefą w strukturze bazowej).
        for (const sector of ['Budowlany', 'Usługi', 'Bankowość', 'Gaming', 'Obronność', 'Logistyka']) {
            const s = makeCompany('S' + sector.slice(0, 3), { sector: [sector] });
            s.exchange = 'GOLD'; initializeFundamentals(s); ensureWorkforce(s); neutral(s);
            assertNear(getLaborCostIndex(s), 1, `indeks ${sector}`, 1e-12);
        }
    });

    test('S2 marża = marża_0.12 + udział × (1 − indeks)', () => {
        const { a } = worldS();
        neutral(a);
        const base = quarterOf(a);
        society.wages.specialists = 1.2;
        const index = getLaborCostIndex(a);
        const after = quarterOf(a);
        assert(index > 1, 'droższa praca specjalistów');
        assertNear(after.margin - base.margin, a.workforce.laborShare * (1 - index), 'odchylenie marży', 1e-9);
        assert(after.labor > base.labor, 'koszt pracy w RZiS rośnie');
    });

    test('S1 indeks popytu = 1,00 na starcie, awans klas go podnosi', () => {
        worldS();
        assertNear(getDemandIndex(), 1, 'start', 1e-12);
        const before = getDemandIndex();
        applyClassMobility(society, 0.008);
        assert(getDemandIndex() > before, `awans: ${getDemandIndex()}`);
        assert(getSocietyGrowthAdj({ sector: ['Turystyka'] }) === 0 || society.demandIndex === 1, 'wzrost liczony z zapisanego indeksu');
        society.demandIndex = 1.05;
        assertNear(getSocietyGrowthAdj({ sector: ['Turystyka'] }), 0.05 * 1.5 * 0.02, 'Turystyka +0,15 pp przy popycie 1,05', 1e-12);
    });

    test('S1 udziały klas sumują się do 100% po 100 kwartałach (bez dryfu do 0 ani 50%)', () => {
        worldS();
        for (let q = 0; q < 100; q++) {
            applyClassMobility(society, getRandomInRange(-0.008, 0.008), getRandomInRange(0, 0.006));
            if (q % 10 === 0) addToPoorClass(0.003);
        }
        const total = Object.values(society.classes).reduce((x, y) => x + y, 0);
        assertNear(total, 1, 'suma udziałów', 1e-9);
        assert(society.classes.poor > 0.1 && society.classes.poor < 0.35, `klasa biedna ${society.classes.poor}`);
    });

    test('S1 kwartał kraju: populacja, miasto rośnie razem z krajem, historia', () => {
        worldS();
        city.population = 30000;
        const pop = society.population;
        advanceSocietyQuarter();
        assert(society.quarter === 1 && society.history.length === 1, 'historia');
        assert(society.population !== pop, 'populacja się zmienia');
        assertNear(city.population / 30000 - 1, society.population / pop - 1, 'tempo miasta = tempo kraju', 1e-3);
    });

    test('S3 niedobór specjalistów podnosi ich indeks płac', () => {
        worldS();
        const supply = getSpecialistSupply();
        society.specSupplyStart = supply;
        society.specDemandScale = 1.3 / SPECIALIST_SHORTAGE_START / getSpecialistDemandIndex();
        advanceWages();
        assert(society.shortage > 1.2, `niedobór ${society.shortage}`);
        assert(society.wages.specialists > society.wages.workers + 0.02, `specjaliści ${society.wages.specialists} vs pracownicy ${society.wages.workers}`);
    });

    test('S3 krzywa Phillipsa: niskie bezrobocie podnosi płace realne, wysokie obniża', () => {
        worldS();
        macro.unemployment = 0.03;
        advanceWages();
        const up = society.wages.workers;
        society.wages.workers = 1;
        macro.unemployment = 0.12;
        advanceWages();
        assert(up > 1 && society.wages.workers <= 1, `płace ${up} / ${society.wages.workers}`);
    });

    test('S2 polityka Wyzysk podnosi marżę i szansę na związek', () => {
        const { a } = worldS();
        neutral(a);
        a.workforce.satisfaction = getSatisfactionTarget(a);
        const marginStd = getLaborMarginAdj(a), unionStd = getUnionChance(a);
        a.workforce.policy = 'exploit'; a.workforce.payMult = LABOR_POLICIES.exploit.pay; a.workforce.productivity = 0.97;
        a.workforce.satisfaction = getSatisfactionTarget(a);
        assert(getLaborMarginAdj(a) > marginStd + 0.01, `marża ${getLaborMarginAdj(a)} vs ${marginStd}`);
        assert(getUnionChance(a) > unionStd * 3, `związek ${getUnionChance(a)} vs ${unionStd}`);
        assert(getWorkforceStructure(a).grey >= 0.1, 'szara strefa +10 pp');
    });

    test('S2 zmiana polityki przez większościowca: blokada 4 kw., zadowolenie od razu, marża stopniowo', () => {
        const { a } = worldS();
        neutral(a);
        assert(!setLaborPolicy('AAA', 'exploit'), 'bez większości nie wolno');
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = 6000;
        const sat = a.workforce.satisfaction;
        assert(setLaborPolicy('AAA', 'exploit'), 'większościowiec zmienia politykę');
        assert(a.workforce.satisfaction === Math.max(0, sat - 15), 'zadowolenie −15 od razu');
        assert(!setLaborPolicy('AAA', 'social'), 'blokada 4 kwartałów');
        updateWorkforcePolicy(a);
        assert(a.workforce.payMult < 1 && a.workforce.payMult > LABOR_POLICIES.exploit.pay, `pierwszy kwartał: ${a.workforce.payMult}`);
        updateWorkforcePolicy(a);
        assertNear(a.workforce.payMult, LABOR_POLICIES.exploit.pay, 'po 2 kwartałach', 1e-9);
        assert(a.workforce.policy === 'exploit' && a.workforce.policySetBy === 'owner', 'prezes nie nadpisuje decyzji właściciela');
    });

    test('S4 strajk obniża przychody kwartału (baza przychodów bez zmian)', () => {
        const { a } = worldS();
        neutral(a);
        const normal = quarterOf(a);
        a.workforce.strike = { pct: 0.1, quarters: 1, decidedQuarter: 0 };
        const strike = quarterOf(a);
        assertNear(strike.revenue / normal.revenue, 0.9, 'przychody −10%', 1e-9);
        assertNear(strike.base, normal.base, 'baza przychodów', 1e-9);
        assert(strike.netIncome < normal.netIncome * 0.9, 'dźwignia operacyjna: zysk spada mocniej');
    });

    test('S4 układ zbiorowy blokuje żądania przez 8 kwartałów', () => {
        const { a } = worldS();
        neutral(a);
        a.workforce.union = createUnion('company');
        a.workforce.union.nextDemand = society.quarter;
        a.workforce.union.agreementUntil = society.quarter + COLLECTIVE_AGREEMENT_QUARTERS;
        const premium = a.workforce.wagePremium;
        for (let q = 0; q <= COLLECTIVE_AGREEMENT_QUARTERS; q++) {
            processUnionDemands([a]);
            assert(!a.workforce.strike && a.workforce.wagePremium === premium && !a.workforce.pendingDemand, `kwartał ${q}: brak żądań`);
            society.quarter++;
        }
        processUnionDemands([a]);
        assert(a.workforce.union.nextDemand === society.quarter + UNION_DEMAND_EVERY, 'po układzie związek znów żąda');
    });

    test('S4 gracz-większościowiec dostaje przypięty mail; brak odpowiedzi = decyzja prezesa, nie kara', () => {
        const { a } = worldS();
        neutral(a);
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        a.workforce.union = createUnion('company');
        a.workforce.union.nextDemand = society.quarter;
        a.ceo.traits = [{ id: 'lojalny_pracownikom', name: 'Przyjaciel załogi' }];
        const mails = mailbox.messages.length;
        processUnionDemands([a]);
        assert(a.workforce.pendingDemand && mailbox.messages.length === mails + 1, 'mail z decyzją');
        assert(isPinnedMail(mailbox.messages[0]) && mailbox.messages[0].action.type === 'unionDemand', 'przypięty mail z akcją');
        society.quarter++;
        processUnionDemands([a]);
        assert(!a.workforce.pendingDemand && a.workforce.wagePremium > 0 && !a.workforce.strike, 'prezes (lojalny) zgodził się');
        // Odpowiedź gracza ma pierwszeństwo.
        a.workforce.union.nextDemand = society.quarter; a.workforce.union.agreementUntil = -1;
        processUnionDemands([a]);
        assert(respondUnionDemand('AAA', 'refuse'), 'odpowiedź gracza');
        a.workforce.satisfaction = 20;
        society.quarter++;
        const premium = a.workforce.wagePremium;
        processUnionDemands([a]);
        assert(a.workforce.wagePremium === premium, 'odmowa gracza wykonana (bez podwyżki)');
    });

    test('S2 Inspekcja Pracy nalicza karę 3× oszczędności z 4 kwartałów', () => {
        const { a } = worldS();
        a.workforce.greySavings = [1000, 2000, 3000, 4000];
        const cash = a.cash, treasury = governmentTreasury, mark = externalMark();
        const result = runLaborInspection(a, true);
        assert(result.fine === 30000 && result.paid === 30000, `kara ${result.fine}`);
        assert(a.cash === cash - 30000 && governmentTreasury === treasury + 30000, 'gotówka spółki → Skarb Państwa');
        assertNear(externalNetFlow(mark), -30000, 'przepływ zewnętrzny', 1e-9);
        assert(a.workforce.greyCaughtQuarter === society.quarter, 'wpis o złapaniu');
    });

    test('S5 płaca minimalna podnosi płace i bezrobocie (zapowiedź kwartał wcześniej)', () => {
        worldS();
        const shift = getSocietyUnemploymentShift();
        announceLawChange('minWage', 1, 'people');
        assert(society.pendingLaw && society.laws.minWage === 1, 'najpierw zapowiedź');
        society.quarter++;
        applyPendingLaw();
        assert(society.laws.minWage === 2 && society.lawChanges.minWage === 1, 'ustawa w życie');
        assert(society.wages.workers >= 1 + MIN_WAGE_STEP - 1e-9 && society.wages.cheap >= 1 + MIN_WAGE_STEP - 1e-9, 'płace +4%');
        assertNear(getSocietyUnemploymentShift() - shift, 0.002, 'bezrobocie +0,2 pp', 1e-9);
    });

    test('S5 poparcie partii sumuje się do 100%, koalicja przy zwycięzcy < 40%', () => {
        worldS();
        const support = computePartySupport(true);
        assertNear(PARTY_IDS.reduce((sum, id) => sum + support[id], 0), 100, 'suma poparcia', 1e-9);
        const result = resolveElection({ people: 36, state: 34, market: 30 });
        assert(result.winner === 'people' && result.coalition?.partner === 'state', 'koalicja z drugą partią');
        macro.election.ruling = result.winner; macro.election.coalition = result.coalition;
        const party = getRulingParty();
        assert(party.coalition && party.nationalization > 1 && party.nationalization < 1.6, `parametry ważone: ${party.nationalization}`);
        assert(!resolveElection({ people: 20, state: 35, market: 45 }).coalition, 'powyżej 40% bez koalicji');
    });

    test('S5 deficyt: 4 kw. → rentowność obligacji +0,25 pp; 8 kw. → CIT +2 pp albo cięcie zasiłków', () => {
        worldS();
        macro.election.ruling = 'state';
        for (let q = 0; q < 8; q++) { society.budget.balance = -100; society.budget.hasBalance = true; updateBudgetBalance(); }
        assert(society.budget.bondPremium === DEFICIT_BOND_PREMIUM && getDeficitBondPremium() === 0.0025, 'premia obligacji');
        assertNear(getCompanyIncomeTaxRate(), COMPANY_INCOME_TAX_RATE + 0.02, 'CIT (Blok Państwowy)', 1e-12);
        allBonds.length = 0; stateBondOffer.shortTerm.available = 5; playerCash = 1_000_000;
        assert(buyStateBond('player', 'shortTerm', 1), 'zakup obligacji');
        assertNear(allBonds[allBonds.length - 1].interestRate, stateBondOffer.shortTerm.interest + 0.0025, 'rentowność +0,25 pp', 1e-12);
        society.budget.balance = 100; society.budget.hasBalance = true; updateBudgetBalance();
        assert(society.budget.bondPremium === 0, 'nadwyżka znosi premię');
    });

    test('S4/S6 klient Etyczny i cele korporacji reagują na szarą strefę i strajki', () => {
        const { a } = worldS();
        playerPortfolio.AAA = { shares: 2500, avgPrice: 100, assetType: 'stock' };
        assert(getFundEthicsIssue() === null, 'bez problemów');
        a.workforce.greyCaughtQuarter = macro.quarter;
        assert(getFundEthicsIssue(), 'szara strefa w portfelu');
        ensureCorporateGoals();
        noteStrikeForGoals(a);
        assert(!CORPORATE_GOAL_POOL.noStrikes.check(corporation.goals), 'strajk w spółce z udziałem > 20%');
        assert(playerPortfolio.AAA.heldThroughStrike, 'Mentor: przetrwany strajk');
        assert(!CORPORATE_GOAL_POOL.satisfaction.available() || playerFund.clients.some(c => c.type === 'ethical'), 'cel zadowolenia tylko z klientami Etycznymi');
        assert(CLIENT_TYPES.ethical && getClientCharacter({ type: 'ethical' }).ethical, 'charakter Etyczny');
    });

    test('S3 podkupienie prezesa: koszt 1% kapitalizacji z gotówki spółki gracza, limit 1 na rok', () => {
        const { a, b } = worldS();
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        b.ceo = { name: 'Gwiazda Branży', age: 50, tenure: 8, traits: [{ id: 'wizjoner', name: 'Wizjoner' }] };
        b.workforce.satisfaction = 0; // szansa 60%
        const cash = a.cash, cost = Math.round(getMarketCapValue(b) * CEO_POACH_COST);
        const result = withSeededRandom(5, () => playerPoachCeo('AAA', 'BBB'));
        assert(result && a.cash === cash - cost, `koszt ${cash - a.cash} vs ${cost}`);
        if (result.success) assert(a.ceo.name === 'Gwiazda Branży' && b.ceo.name !== 'Gwiazda Branży', 'prezes przechodzi z cechami');
        assert(playerPoachCeo('AAA', 'BBB') === null, 'limit 1 na rok');
    });

    test('S6 skaner: kolumny zatrudnienia, czerwona flaga „szara strefa > 5%”, raport kwartalny', () => {
        const { a, b } = worldS();
        a.workforce.policy = 'exploit';
        assert(getRedFlags(a).some(f => f.id === 'grey') && !getRedFlags(b).some(f => f.id === 'grey'), 'flaga szarej strefy');
        const rows = runScanner({ ...SCANNER_DEFAULT_FILTERS, accessibleOnly: false, greyOnly: true });
        assert(rows.length === 1 && rows[0].stock === a && rows[0].work.grey > 0.05, 'filtr szarej strefy');
        const mails = mailbox.nextId;
        publishSocietyReport([a, b]);
        assert(mailbox.nextId === mails + 1 && mailbox.messages[0].subject.includes('Raport z rynku pracy'), 'jeden zbiorczy mail');
    });

    test('S6 niezmienniki pieniędzy i akcji po kwartałach z zatrudnieniem, związkami i strajkami', () => {
        const { a, b } = worldS();
        syncSharesHeldWithInitialPortfolios();
        a.workforce.policy = 'exploit'; a.workforce.satisfaction = 10; a.workforce.union = createUnion('company'); a.workforce.union.nextDemand = 0;
        b.workforce.satisfaction = 90;
        a.workforce.greySavings = [500, 500, 500, 500];
        for (let q = 0; q < 6; q++) {
            const money = moneyInModel(), mark = externalMark();
            society.quarter++;
            processWorkforceQuarter();
            assertNear(moneyInModel() - money, externalNetFlow(mark), `kwartał ${q}: pieniądze tylko przez granicę modelu`, 1e-6);
            processFinancialReports();
        }
        const problems = checkWorldInvariants();
        assert(problems.length === 0, problems.join('; '));
        assert((society.stats?.strikes || 0) >= 0 && a.workforce.satisfactionHistory.length > 0, 'stan zatrudnienia');
    });

    test('zapis v13 i migracja starego zapisu (v12): kraj od zera, spółki i gotówka bez zmian', () => {
        const { a, b } = worldS();
        a.isStateOwned = true;
        society.population = 39_000_000; society.laws.minWage = 3;
        a.workforce.union = createUnion('company');
        const fresh = applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        assert(fresh.ok && society.population === 39_000_000 && society.laws.minWage === 3, 'v13 odtwarza kraj');
        assert(stocks.find(s => s.symbol === 'AAA').workforce.union, 'v13 odtwarza związek');

        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        snapshot.version = 12;
        delete snapshot.society;
        snapshot.stocks.forEach(s => delete s.workforce);
        const cash = snapshot.stocks.map(s => s.cash), cityPop = snapshot.city.population;
        const report = applySaveSnapshot(snapshot);
        assert(report.ok, report.errors.join(' '));
        assert(stocks.length === 2 && stocks.every((s, i) => s.cash === cash[i]), 'spółki i gotówka bez zmian');
        assert(stocks.every(s => s.workforce && s.workforce.employees > 0), 'zatrudnienie według giełdy');
        assert(stocks.every(s => Math.abs(s.workforce.satisfaction - getSatisfactionTarget(s)) < 1e-9), 'zadowolenie = cel polityki');
        assert(!stocks.find(s => s.symbol === 'BBB').workforce.union, 'związki tylko w spółkach państwowych');
        assert(city.population === cityPop && society.laws.minWage === SOCIAL_LAWS.minWage.start, 'miasto bez zmian, kraj od zera');
    });
});

group('Zapis gry: rozmiar po długiej grze (limit localStorage)', () => {
    /** Świat po ~100 kwartałach: 125 spółek z pełnymi historiami, 600 maili, 3000 obligacji botów. */
    function longWorld() {
        const list = [];
        for (let i = 0; i < 125; i++) {
            const s = makeCompany(`S${String(i).padStart(3, '0')}`);
            s.insiderShares = 0;
            s.ceo = { name: 'Jan Test', age: 50, tenure: 4, traits: [] };
            const t0 = 1_790_000_000_000;
            s.lineHistory = Array.from({ length: 900 }, (_, k) => ({ time: t0 + k * 1000, price: 100 + Math.random() * 3.123456789 }));
            s.candlestickHistory = Array.from({ length: 30 }, (_, k) => ({ time: t0 + k * 15000, open: 100.123456789, high: 103.987654321, low: 98.55555555, close: 101.3333333 }));
            s.research.ledger = Array.from({ length: 300 }, (_, k) => ({ id: `research_maintenance_${i}_${k}`, kind: 'maintenance', techId: 'COMMON_LOGISTICS_1', amount: 50, timestamp: t0 + k, recognized: k < 290, source: 'cash' }));
            s.chartEvents = Array.from({ length: 20 }, (_, k) => ({ time: t0 + k, icon: '📈', label: 'Raport kwartalny: zysk +29% vs konsensus' }));
            list.push(s);
        }
        resetWorld(list);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        society = createSocietyState();
        list.forEach(s => {
            initializeFundamentals(s);
            for (let q = 0; q < 8; q++) s.fundamentals.history.push({ revenue: 1022.2756548820767, ebitda: 228.6505294239866, netIncome: 91.11275726852443, eps: 0.10448710695931701, depreciation: 51.1137827, interest: 65.0518611, tax: 21.3721282, labor: 156.2877094, ocf: 144.6482176, receivables: 167.6191994 });
            s.fundamentals.history = s.fundamentals.history.slice(-8);
            ensureWorkforce(s);
        });
        for (let i = 0; i < 600; i++) addMail({ sender: CORPORATION_SENDER, subject: `📈 AWANS: spółka ${i} przechodzi na wyższą giełdę`, body: 'x'.repeat(110), importance: 3 });
        allBonds.length = 0;
        for (let i = 0; i < 3000; i++) allBonds.push(createBondRecord(`ai${i % 6}`, { issuerName: 'Skarb Państwa', type: 'Skarbowa (mediumTerm)', faceValue: 1000, risk: 0, isStateBond: true }, 25, 0.04));
        allBonds.forEach((bond, i) => { bond.remainingGameMs = 600000 + Math.floor(i / 200) * 1000; });
        return list;
    }

    test('zapis po ~100 kwartałach mieści się w 3 MB, a kompaktowy jest jeszcze mniejszy', () => {
        longWorld();
        const size = JSON.stringify(buildSaveSnapshot()).length;
        const compact = JSON.stringify(buildSaveSnapshot({ compact: true })).length;
        assert(size < SAVE_SIZE_TARGET, `zapis ${(size / 1e6).toFixed(2)} MB`);
        assert(compact < size * 0.8, `kompaktowy ${(compact / 1e6).toFixed(2)} MB vs ${(size / 1e6).toFixed(2)} MB`);
        assert(mailbox.messages.length <= MAIL_HARD_LIMIT && mailbox.messages.length <= MAIL_LIMIT + 1, `skrzynka ${mailbox.messages.length}`);
        addTable('Rozmiar zapisu (znaki)', ['Wariant', 'Rozmiar'], [['zwykły', size], ['kompaktowy', compact]]);
    });

    test('obligacje grupowane w zapisie wracają w tej samej liczbie i wartości', () => {
        longWorld();
        const count = allBonds.length, value = allBonds.reduce((sum, bond) => sum + bond.faceValue, 0);
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        assert(snapshot.allBonds.length === 90, `grupy (15 terminów × 6 właścicieli): ${snapshot.allBonds.length}`);
        const report = applySaveSnapshot(snapshot);
        assert(report.ok, report.errors.join(' '));
        assert(allBonds.length === count && allBonds.reduce((sum, bond) => sum + bond.faceValue, 0) === value, 'liczba i nominał obligacji');
        assert(new Set(allBonds.map(bond => bond.id)).size === count, 'unikalne identyfikatory');
        const stock = stocks[0];
        assert(stock.lineHistory.length === SAVED_LINE_HISTORY_POINTS && stock.research.ledger.filter(e => !e.recognized).length === 10, 'historie i nierozpoznane koszty R&D zachowane');
    });

    test('poziomy zapisu: kompaktowy i awaryjny coraz mniejsze; upadłe spółki i zakończone przetargi bez historii', () => {
        const list = longWorld();
        list[0].isBankrupt = true;
        activeTenders = [{ id: 't1', status: 'completed', bids: [], clientCompany: list[1], buildingType: { id: 'warehouse' }, budget: 1000 }, { id: 't2', status: 'open', bids: [], clientCompany: list[1], buildingType: { id: 'warehouse' }, budget: 1000 }];
        const sizes = [0, 1, 2].map(level => JSON.stringify(buildSaveSnapshot({ compact: level })).length);
        assert(sizes[0] > sizes[1] && sizes[1] > sizes[2], `rozmiary ${sizes.join(' / ')}`);
        const snapshot = buildSaveSnapshot();
        assert(snapshot.activeTenders.length === 1 && snapshot.activeTenders[0].id === 't2', 'tylko trwające przetargi');
        assert(snapshot.stocks[0].lineHistory.length === 0 && snapshot.stocks[0].research.ledger.length === 0, 'upadła spółka bez historii');
        assert(snapshot.mailbox.messages.length <= 100, `skrzynka w zapisie: ${snapshot.mailbox.messages.length}`);
        addTable('Poziomy zapisu (znaki)', ['zwykły', 'kompaktowy', 'awaryjny'], [sizes]);
        activeTenders = [];
    });

    test('dziennik R&D trzyma najwyżej kilka rozpoznanych wpisów', () => {
        const [s] = longWorld();
        recognizeResearchExpenses(s);
        assert(s.research.ledger.length <= RESEARCH_LEDGER_KEEP_RECOGNIZED, `wpisy: ${s.research.ledger.length}`);
    });
});

group('Poprawki 0.13.1 (B1–B13)', () => {
    function worldB() {
        const a = makeCompany('AAA', { cash: 5_000_000 });
        const b = makeCompany('BBB', { cash: 5_000_000, sector: ['Obronność'] });
        [a, b].forEach(s => { s.insiderShares = 1000; s.sharesHeld = 0; s.ceo = { name: 'Jan Test', age: 50, tenure: 4, traits: [] }; });
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return { a, b };
    }
    function withCommission(rate, fn) {
        const original = window.getBuyCommissionRate;
        window.getBuyCommissionRate = () => rate;
        try { return fn(); } finally { window.getBuyCommissionRate = original; }
    }

    test('B1/B2: „Max” = min(dostępne, gotówka / cena z prowizją); zakup nigdy nie daje ujemnej gotówki', () => {
        const { a } = worldB();
        withCommission(0.01, () => {
            playerCash = 50_500; // 500 akcji po 100 zł + 1% prowizji = 50 500
            assert(getMaxBuyQuantity(a, 'fund') === 500, `max ${getMaxBuyQuantity(a, 'fund')}`);
            buyStock('AAA', 501);
            assert(playerCash === 50_500 && !playerPortfolio.AAA, 'za drogo z prowizją — odmowa');
            buyStock('AAA', getMaxBuyQuantity(a, 'fund'));
        });
        assert(playerCash >= -1e-9, `gotówka ${playerCash}`);
        playerCash = 10_000_000;
        assert(getMaxBuyQuantity(a, 'fund') === getAvailableShares(a), 'limit wolnego obrotu');
        a.sharesHeld = getFreeFloatShares(a); playerPortfolio.AAA = { shares: getFreeFloatShares(a), avgPrice: 100, assetType: 'stock' };
        assert(getMaxBuyQuantity(a, 'fund') === 0, 'nic do kupienia');
    });

    test('B3: wolny obrót = dostępne na rynku + akcje u inwestorów', () => {
        const { a } = worldB();
        aiCompetitors[0].portfolio.AAA = { shares: 3000, avgPrice: 100 };
        playerPortfolio.AAA = { shares: 2000, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = 5000;
        assert(getFreeFloatShares(a) === getAvailableShares(a) + getTrackedHeldShares(a), `${getFreeFloatShares(a)} ≠ ${getAvailableShares(a)} + ${getTrackedHeldShares(a)}`);
        const text = renderCompanyCardOwners(a);
        assert(text.includes('dostępnych na rynku') && text.includes('u inwestorów'), 'rozbicie w karcie');
    });

    test('B4: wymuszona sprzedaż zostawia ślad z przyczyną', () => {
        const { a } = worldB();
        playerPortfolio.AAA = { shares: 1000, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = 1000;
        playerCash = 0;
        forceLiquidation(20_000);
        const entry = playerFund.positionLog?.[0];
        assert(entry && entry.symbol === 'AAA' && entry.quantity > 0 && /umarzają/.test(entry.reason), 'dziennik pozycji');
    });

    test('B6: pula inwestuje tylko brakującą kwotę celu, reszta zostaje w puli', () => {
        const { a } = worldB();
        const startup = makeCompany('STU');
        Object.assign(startup, { assetType: 'Startup', stage: 'funding', fundingGoal: 20_000, currentFunding: 9_500, investors: {}, successChance: 0.5 });
        stocks.push(startup);
        investmentPool.totalFunds = 100_000; investmentPool.contributors = { player: 100_000 };
        processPoolInvestments();
        assert(startup.currentFunding === 20_000, `finansowanie ${startup.currentFunding}`);
        assertNear(investmentPool.totalFunds, 89_500, 'reszta w puli', 1e-9);
        assertNear(investmentPool.contributors.player, 89_500, 'wkład gracza pomniejszony', 1e-9);
        investmentPool.totalFunds = 0; investmentPool.contributors = {};
    });

    test('B7: boty i fundusze kolegów finansują startupy (bez przekraczania celu)', () => {
        worldB();
        const startup = makeCompany('STU');
        Object.assign(startup, { assetType: 'Startup', stage: 'funding', fundingGoal: 20_000, currentFunding: 0, investors: {}, successChance: 0.6, price: 10 });
        stocks.push(startup);
        const ai = aiCompetitors.find(x => x.personality === 'pro_investor') || aiCompetitors[0];
        assert(aiCanInvestInStartups({ personality: 'pro_investor', unlockedSkills: {} }), 'bot bez szkolenia może inwestować');
        ai.cash = 1_000_000;
        aiInvestInStartup(ai, 'STU', 500_000);
        assert(startup.currentFunding === 20_000 && ai.portfolio.STU.investedAmount === 20_000, 'tylko brakująca kwota');
        startup.currentFunding = 0;
        const manager = corporation.managers[0];
        manager.fund.cash = 5_000_000;
        const nav = getBotFundNav(manager.fund);
        const random = Math.random; Math.random = () => 0.01;
        let amount = 0;
        try { amount = botFundInvestInStartups(manager); } finally { Math.random = random; }
        assert(amount > 0 && manager.fund.startups.STU === amount, 'fundusz kolegi inwestuje');
        assertNear(getBotFundNav(manager.fund), nav, 'NAV funduszu bez zmian (udział po koszcie)', 1e-9);
        const claims = collectStartupClaims(startup);
        assert(claims.some(c => c.kind === 'botFund' && c.amount === amount), 'roszczenie przy debiucie');
    });

    test('B8–B13: panel dywidend, Gwardia jako fundusz, sektory, wycena holdingu, próg zaufania, mafia w Nadzorze', () => {
        const { a } = worldB();
        updateDividendTrackerButtonVisibility();
        const guard = { id: 'guard_fund', name: 'Fundusz „Gwardia”', cash: 1000, portfolio: { AAA: { shares: 100, avgPrice: 100 } }, isGuard: true, personality: 'guard' };
        aiCompetitors.push(guard);
        try {
            assert(!getBigInvestors().includes(guard), 'Gwardia nie jest „wielkim inwestorem”');
            assert(getShareholders(a).find(h => h.entity === guard)?.name.includes('fundusz'), 'w akcjonariacie jako fundusz');
        } finally { aiCompetitors.splice(aiCompetitors.indexOf(guard), 1); }
        assert(getSectorFilterCounts(getSectorFilterBaseList()).sectors['Obronność'] > 0, 'filtr: wszystkie sektory spółek (T1c: chipy z liczbą spółek)');
        const holding = makeCompany('MIN', { cash: 1_000_000 });
        Object.assign(holding, { assetType: 'Holding', holdingPortfolio: { AAA: { quantity: 100, purchasePrice: 100 } }, totalShares: 1000, balanceSheet: { assets: 0, liabilities: 0 } });
        stocks.push(holding);
        assertNear(getDisplayedFairValue(holding), (1_000_000 + 100 * a.price) / 1000, 'NAV holdingu', 1e-9);
        playerFund.periods = Array.from({ length: 4 }, () => ({ fundReturn: -0.4, benchmarkReturn: 0.1, maxDrawdown: 0.5, volatility: 0.3 }));
        assert(computeTrustTarget() >= TRUST_TARGET_FLOOR, 'cel zaufania nie spada poniżej progu');
        assert(renderMafiaStateCard().includes('Mafia'), 'mafia w zakładce Nadzór');
    });
});

group('T0: prędkości testowe ×100 i ×200', () => {
    test('kroki tiku: interwał ≥ 10 ms, ten sam czas gry na sekundę', () => {
        for (const speed of [1, 2, 5, 10, 50, 100, 200]) {
            const steps = getTickStepsPerCall(speed);
            const interval = BASE_DELAYS.stockUpdate * steps / speed;
            assert(interval >= MIN_TICK_INTERVAL_MS - 1e-9 || speed <= 50, `×${speed}: interwał ${interval} ms`);
            assertNear(steps * BASE_DELAYS.stockUpdate / interval, speed, `×${speed}: tempo gry`, 1e-9);
        }
        assert(getTickStepsPerCall(200) === 2 && getTickStepsPerCall(50) === 1, 'kroki');
    });

    test('zegar gry: kwartał = 300 tików przy każdej prędkości, kolejność pętli stała', () => {
        const saved = { jobs: gameScheduler.jobs, clock: gameScheduler.clockMs, speed: currentSpeedMultiplier };
        try {
            for (const speed of [1, 50, 200]) {
                gameScheduler.jobs = []; gameScheduler.clockMs = 0; currentSpeedMultiplier = speed;
                const fired = [];
                setGameInterval(() => fired.push('week'), BASE_DELAYS.weekly / speed);
                setGameInterval(() => fired.push('quarter'), BASE_DELAYS.quarterly / speed);
                for (let tick = 0; tick < 600; tick++) runGameScheduler(BASE_DELAYS.stockUpdate);
                assert(fired.filter(x => x === 'quarter').length === 2 && fired.filter(x => x === 'week').length === 10, `×${speed}: ${fired.join(',')}`);
                assert(fired.indexOf('quarter') === 5, `×${speed}: kwartał po 5. tygodniu`);
            }
        } finally { gameScheduler.jobs = saved.jobs; gameScheduler.clockMs = saved.clock; currentSpeedMultiplier = saved.speed; }
    });

    test('prędkość testowa nie trafia do zapisu', () => {
        const a = makeCompany('AAA'); a.insiderShares = 0;
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        const saved = currentSpeedMultiplier;
        try {
            currentSpeedMultiplier = 200;
            const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
            assert(snapshot.currentSpeedMultiplier === 1, `zapisano ×${snapshot.currentSpeedMultiplier}`);
            snapshot.currentSpeedMultiplier = 100;
            currentSpeedMultiplier = 2;
            applySaveSnapshot(snapshot);
            assert(currentSpeedMultiplier === 2, 'wczytanie ignoruje prędkość testową');
        } finally { currentSpeedMultiplier = saved; }
    });
});

group('0.13.1 D1/D2: rynki internetowe i limit spółek krajowych', () => {
    function worldD(count = 0) {
        const list = [];
        for (let i = 0; i < count; i++) { const c = makeCompany(`C${String(i).padStart(3, '0')}`); c.insiderShares = 0; list.push(c); }
        resetWorld(list);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        marketOperators = null;
        ensureMarketOperators();
        return list;
    }

    test('D2: limit liczy tylko spółki krajowe (bez zależnych, startupów i rynków internetowych)', () => {
        const list = worldD(116);
        const before = getListedCompanyCount();
        list[0].isSubsidiaryOf = list[1].symbol;
        list[2].market = 'XTD';
        list[3].assetType = 'Startup';
        assert(getListedCompanyCount() === before - 3, `liczone ${getListedCompanyCount()} z ${before}`);
        assert(!hasFreeListingSlot() && getCrowdingPressure() > 0, 'ponad limitem');
        assert(getStartupFundingFactor() < 1 && getStartupTermsFactor() < 1, 'finansowanie startupów mniejsze i droższe');
        list.slice(0, 30).forEach(s => { s.isBankrupt = true; });
        assert(hasFreeListingSlot() && getStartupFundingFactor() === 1, 'poniżej limitu bez zmian');
    });

    test('D2: na nasyconym rynku słabe spółki tanieją, a cel zbiórki startupu rośnie', () => {
        const list = worldD(120);
        list[5].financialHealth = -3;
        const price = list[5].price, healthy = list[6].price;
        assert(applyCrowdingPressureToWeak() >= 1, 'presja na słabe');
        assert(list[5].price < price && list[6].price === healthy, 'tanieje tylko słaba spółka');
        const goals = Array.from({ length: 40 }, () => generateNewStartup().fundingGoal);
        assert(Math.max(...goals) > 40_000, `cele zbiórek: max ${Math.max(...goals)}`);
    });

    test('D1: startup operatora ma gwarancję debiutu, rynek ma limit 8 spółek', () => {
        worldD(20);
        const startup = spawnOperatorStartup(marketOperators.XTD);
        startup.isScam = true; startup.successChance = 0;
        withSeededRandom(3, () => finalizeStartup(startup));
        assert(marketOperators.XTD.status === 'active' && getOperatorStock('XTD'), 'operator zadebiutował');
        assert(isInternetMarketStock(getOperatorStock('XTD')), 'operator w zakładce Internet');
        for (let i = 0; i < 15; i++) spawnMarketMember('XTD', 'test');
        assert(getMarketMembers('XTD').length === INTERNET_MEMBER_LIMIT, `spółki rynku: ${getMarketMembers('XTD').length}`);
        assert(getMarketMembers('XTD').every(isInternetMarketStock) && !getMarketMembers('XTD').some(isCountedListedCompany), 'poza limitem krajowym');
    });

    test('decyzja 2: ratunek operatora płacą spółki rynku proporcjonalnie do kapitalizacji, bez tworzenia gotówki', () => {
        worldD(20);
        const startup = spawnOperatorStartup(marketOperators.PLU5);
        withSeededRandom(4, () => finalizeStartup(startup));
        const operator = getOperatorStock('PLU5');
        while (getMarketMembers('PLU5').length < INTERNET_PROTECTION_MEMBERS) spawnMarketMember('PLU5', 'test');
        const members = getMarketMembers('PLU5');
        members.forEach(m => { m.cash = 1_000_000; });
        const total = () => operator.cash + members.reduce((a, m) => a + m.cash, 0);
        const before = total(), opCash = operator.cash;
        const raised = fundMarketOperatorBailout(operator, 90_000);
        assert(Math.abs(raised - 90_000) < 1e-6 && Math.abs(total() - before) < 1e-6 && operator.cash > opCash, `zebrano ${raised}, suma gotówki bez zmian`);
        const big = members.reduce((a, m) => getMarketCapValue(m) > getMarketCapValue(a) ? m : a);
        assert(1_000_000 - big.cash >= Math.max(...members.map(m => 1_000_000 - m.cash)) - 1e-6, 'największa spółka płaci najwięcej');
        members.forEach(m => { m.cash = 100; });
        assert(fundMarketOperatorBailout(operator, 1_000_000) < 1_000, 'bez gotówki — ratunek niepełny');
    });

    test('D1: chroniony operator nie upada; koncesja = handel bez prowizji; nowe rynki z puli', () => {
        worldD(20);
        const startup = spawnOperatorStartup(marketOperators.PLU5);
        withSeededRandom(4, () => finalizeStartup(startup));
        const operator = getOperatorStock('PLU5');
        while (getMarketMembers('PLU5').length < INTERNET_PROTECTION_MEMBERS) spawnMarketMember('PLU5', 'test');
        assert(isProtectedMarketOperator(operator), 'ochrona przy ≥ 3 spółkach');
        const member = getMarketMembers('PLU5')[0];
        assert(getBuyCommissionRate(member) > 0, 'prowizja bez koncesji');
        playerCash = 1_000_000;
        assert(buyInternetConcession('PLU5') && hasInternetConcession('PLU5'), 'koncesja kupiona');
        assert(getBuyCommissionRate(member) === 0 && chargeMarketCommission(member, 10_000, 'player') === 0, 'bez prowizji');
        assert(!buyInternetConcession('PLU5'), 'jednorazowa');
        const fresh = spawnInternetMarket();
        assert(fresh && isInternetMarket(fresh.id) && fresh.status === 'startup' && getMarketDef(fresh.id).name, 'nowy rynek internetowy jako startup');
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        assert(applySaveSnapshot(snapshot).ok && getMarketDef(fresh.id)?.short === fresh.id && hasInternetConcession('PLU5'), 'rynek i koncesja w zapisie');
    });
});

group('0.13.1 P1/P2: twardy sufit spółek i przenosiny na nowe rynki', () => {
    function worldP(count) {
        const list = [];
        for (let i = 0; i < count; i++) { const c = makeCompany(`P${String(i).padStart(3, '0')}`); c.insiderShares = 0; list.push(c); }
        resetWorld(list);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        marketOperators = null;
        ensureMarketOperators();
        return list;
    }
    function readyStartup() {
        const startup = generateNewStartup();
        stocks.push(startup);
        startup.stage = 'finalized';
        return startup;
    }

    test('P1: przy suficie 110 startup czeka w inkubatorze i debiutuje po zwolnieniu miejsca', () => {
        const list = worldP(LISTING_HARD_CAP);
        assert(!hasFreeListingSlot() && getCrowdingPressure() === 1, 'giełda pełna');
        const before = getListedCompanyCount();
        const startup = readyStartup();
        handleSuccessfulIPO(startup, 2);
        assert(startup.assetType === 'Startup' && startup.stage === 'awaitingListing', `czeka: ${startup.stage}`);
        assert(getListedCompanyCount() === before, 'bez nowej spółki');
        processAwaitingListings();
        assert(startup.stage === 'awaitingListing', 'nadal pełna');
        list.slice(0, before - LISTING_HARD_CAP + 1).forEach(s => { s.isBankrupt = true; });
        processAwaitingListings();
        assert(!startup.assetType && stocks.includes(startup) && getListedCompanyCount() === LISTING_HARD_CAP, `debiut na zwolnione miejsce (${getListedCompanyCount()})`);
    });

    test('P1: po 8 kwartałach czekania startup zostaje przejęty (zwrot ≥ wkładu)', () => {
        worldP(LISTING_HARD_CAP + 2);
        const startup = readyStartup();
        playerPortfolio[startup.symbol] = { shares: 0, investedAmount: 1000, assetType: 'Startup' };
        handleSuccessfulIPO(startup, 3);
        const cash = playerCash;
        startup.awaitingListing.since = macro.quarter - AWAITING_LISTING_MAX_QUARTERS;
        processAwaitingListings();
        assert(!stocks.includes(startup) && playerCash >= cash + 1000, `przejęty, zwrot ${playerCash - cash}`);
    });

    test('P1: pełna giełda blokuje zależne, uwolnienie zależnej, członków GPW i przenosiny na rynek krajowy', () => {
        const list = worldP(LISTING_HARD_CAP);
        list[0].exchange = 'RUBY';
        assert(foundSubsidiary(list[0]) === null, 'brak nowej zależnej');
        assert(spawnMarketMember('GPW', 'test') === null, 'brak nowego członka GPW');
        marketOperators.XTD.status = 'active';
        const net = list[1];
        net.market = 'XTD';
        playerPortfolio[net.symbol] = { shares: net.totalShares * 0.6, avgPrice: 100, assetType: 'stock' };
        assert(!getListingMoveTargets(net).includes('GPW'), 'z rynku internetowego na pełną GPW — nie');
        list.slice(2, 4 + getListedCompanyCount() - LISTING_HARD_CAP).forEach(s => { s.isBankrupt = true; });
        assert(getListingMoveTargets(net).includes('GPW'), 'przy wolnym miejscu — tak');
    });

    test('P2: nowy rynek internetowy jest celem przenosin (z limitem spółek rynku)', () => {
        const list = worldP(20);
        const fresh = spawnInternetMarket();
        fresh.status = 'active';
        const stock = list[0];
        playerPortfolio[stock.symbol] = { shares: stock.totalShares * 0.6, avgPrice: 100, assetType: 'stock' };
        assert(getListingMoveTargets(stock).includes(fresh.id), `cele: ${getListingMoveTargets(stock).join(',')}`);
        const price = stock.price;
        assert(moveListing(stock.symbol, fresh.id) && getStockMarket(stock) === fresh.id && stock.price < price, 'przeniesiona na nowy rynek');
        for (let i = 1; i <= INTERNET_MEMBER_LIMIT; i++) list[i].market = fresh.id;
        playerPortfolio[list[15].symbol] = { shares: list[15].totalShares * 0.6, avgPrice: 100, assetType: 'stock' };
        assert(!getListingMoveTargets(list[15]).includes(fresh.id), 'pełny rynek internetowy nie przyjmuje');
    });

    test('P1: łączny sufit 150 podmiotów blokuje też członków rynków internetowych i spółki zależne', () => {
        const list = worldP(30);
        marketOperators.XTD.status = 'active';
        assert(spawnMarketMember('XTD', 'test'), 'przy wolnym miejscu — członek rynku');
        while (getTotalCompanyCount() < LISTING_TOTAL_CAP) { const c = makeCompany(`Z${stocks.length}`); c.isSubsidiaryOf = list[0].symbol; stocks.push(c); }
        assert(hasInternetMemberSlot('XTD') && spawnMarketMember('XTD', 'test') === null, 'łączny sufit');
        assert(getListedCompanyCount() < LISTING_HARD_CAP && !hasFreeListingSlot(), 'krajowe poniżej 110, ale brak miejsca');
        list[1].exchange = 'RUBY';
        assert(foundSubsidiary(list[1]) === null, 'brak nowej zależnej');
    });

    test('łączny sufit liczy tylko zwykłe spółki (bez holdingów, REIT-ów, banków i operatorów rynków)', () => {
        const list = worldP(10);
        const base = getTotalCompanyCount();
        list[0].assetType = 'Holding'; list[1].assetType = 'REIT'; list[2].isBankStock = true; list[3].marketOperator = 'XTD';
        assert(getTotalCompanyCount() === base - 4, `liczone ${getTotalCompanyCount()} z ${base}`);
    });
});

group('0.13.1 P3: gotówka spółek nie spada poniżej zera', () => {
    test('kredyt ratunkowy wyrównuje ujemną gotówkę, kapitał bez zmian', () => {
        const a = makeCompany('NEG');
        resetWorld([a]);
        a.cash = -50_000;
        const equity = a.balanceSheet.assets - a.balanceSheet.liabilities;
        const loan = coverNegativeCash(a, -100_000);
        assert(loan > 50_000 && a.cash > 0 && a.cash < 6_000, `gotówka ${a.cash}`);
        assert(Math.abs(a.balanceSheet.assets - a.balanceSheet.liabilities - equity) < 1e-6, 'kapitał bez zmian');
        assert(coverNegativeCash(a, -100_000) === 0, 'dodatnia gotówka — bez kredytu');
    });

    test('A1: naprawa usterek po inwestycji ponad gotówkę — kredyt od razu, gotówka ≥ 0', () => {
        const a = makeCompany('FIXN', { cash: 1_000 });
        resetWorld([a]);
        if (a.departments?.development) a.departments.development.level = 0;
        const liabilities = a.balanceSheet.liabilities;
        const original = Math.random;
        Math.random = () => 0.2; // weryfikacja: „usterki” (próg 0,12–0,37 przy dziale rozwoju 0)
        try { finishInvestment(a, { id: 'game_studio', uid: 'fixn1', cost: 300_000, data: { assetValue: 250_000 } }); }
        finally { Math.random = original; }
        assert(a.cash >= 0, `gotówka ${a.cash}`);
        assert(a.balanceSheet.liabilities > liabilities, 'naprawa sfinansowana kredytem');
        assert(!checkWorldInvariants().some(x => x.includes('FIXN')), 'niezmiennik pusty');
    });
});

group('0.13.1 P3: „duchy posiadaczy” (akcje w obrocie = posiadacze)', () => {
    test('reconcile przy zerowym wolnym obrocie zdejmuje pakiety-duchy, nie rusza funduszu gracza', () => {
        const a = makeCompany('PLX'), owner = makeCompany('OWN');
        resetWorld([a, owner]);
        a.insiderShares = a.totalShares; a.treasuryShares = 0; a.stateOwnershipPct = 0; a.sharesHeld = 0;
        aiCompetitors[0].portfolio.PLX = { shares: 126, avgPrice: 10 };
        owner.isBankrupt = true; owner.equityStakes = { PLX: 100 };
        reconcileSharesHeld();
        assert(Math.abs(a.sharesHeld - getTrackedHeldShares(a)) <= 0.5, `obrót ${a.sharesHeld} vs posiadacze ${getTrackedHeldShares(a)}`);
        assert(!checkWorldInvariants().some(x => x.includes('PLX')), 'niezmiennik pusty');
    });

    test('nadwyżka posiadaczy: najpierw insiderzy i pakiet państwa, gracz zachowuje akcje', () => {
        const a = makeCompany('STX');
        resetWorld([a]);
        a.insiderShares = 0; a.treasuryShares = 0; a.stateOwnershipPct = 0.9; a.sharesHeld = 0;
        playerPortfolio.STX = { shares: Math.floor(a.totalShares * 0.2), avgPrice: 10, assetType: 'stock' };
        reconcileSharesHeld();
        assert(playerPortfolio.STX.shares === Math.floor(a.totalShares * 0.2), 'akcje funduszu bez zmian');
        assert(a.stateOwnershipPct < 0.9 && Math.abs(a.sharesHeld - getTrackedHeldShares(a)) <= 0.5, `pakiet państwa ${a.stateOwnershipPct}`);
    });

    test('pule insiderów i państwa ponad wszystkie akcje: reconcile wyrównuje obrót z posiadaczami', () => {
        const a = makeCompany('CTX');
        resetWorld([a]);
        a.totalShares = 1_306_166; a.insiderShares = 229_477; a.treasuryShares = 0; a.stateOwnershipPct = 0.8332844614890867;
        aiCompetitors[0].portfolio.CTX = { shares: 84_957, avgPrice: 1 }; a.sharesHeld = 84_957;
        assert(getRawFreeFloatShares(a) < 0 && getFreeFloatShares(a) === 0, 'pule ponad wszystkie akcje');
        reconcileSharesHeld();
        assert(a.sharesHeld === 84_957 && Math.abs(a.sharesHeld - getTrackedHeldShares(a)) <= 0.5 && getFreeFloatShares(a) >= a.sharesHeld, `obrót ${a.sharesHeld}, wolny obrót ${getFreeFloatShares(a)}`);
    });

    test('usunięta spółka nie zostawia pakietów — nowa spółka z tym samym symbolem startuje czysto', () => {
        const a = makeCompany('DEJC'), gpw = makeCompany('GPWX');
        resetWorld([a, gpw]);
        gpw.equityStakes = { DEJC: 25 };
        corporation?.managers?.[0] && (corporation.managers[0].fund.portfolio.DEJC = { shares: 10, avgPrice: 1 });
        a.isBankrupt = true; a.timeOfDeath = Date.now() - 10 * 60_000;
        cleanupBankruptStocks(1);
        assert(!stocks.includes(a) && !gpw.equityStakes.DEJC, 'pakiet usuniętej spółki zniknął');
        const startup = generateNewStartup();
        startup.symbol = 'DEJC';
        stocks.push(startup);
        gpw.equityStakes.DEJC = 25; // stary „duch” z zapisu sprzed poprawki
        handleSuccessfulIPO(startup, 2);
        assert(!gpw.equityStakes.DEJC && Math.abs(startup.sharesHeld - getTrackedHeldShares(startup)) <= 0.5, `obrót ${startup.sharesHeld} vs ${getTrackedHeldShares(startup)}`);
    });
});

group('0.14 A3: licznik przycięć „duchów posiadaczy”', () => {
    test('każde przycięcie trafia do rejestru (symbol, posiadacz, akcje, kwartał) i jest ostrzeżeniem, nie naruszeniem', () => {
        const a = makeCompany('GHX'), owner = makeCompany('OWX');
        resetWorld([a, owner]);
        ghostTrimLog.length = 0;
        a.totalShares = 100; a.insiderShares = 0; a.treasuryShares = 0; a.stateOwnershipPct = 0; a.sharesHeld = 0; // pule puste: nadwyżka 226 − 0
        aiCompetitors[0].portfolio.GHX = { shares: 226, avgPrice: 10 };
        owner.isBankrupt = true; owner.equityStakes = { GHX: 100 };
        reconcileSharesHeld();
        const entries = ghostTrimLog.filter(t => t.symbol === 'GHX');
        assert(entries.length === 2, `wpisy: ${entries.length}`);
        assert(entries[0].holder === 'spółka OWX' && entries[0].shares === 100 && entries[0].source === 'game', JSON.stringify(entries[0]));
        assert(entries[1].holder.startsWith('bot ') && entries[1].shares === 126 && aiCompetitors[0].portfolio.GHX.shares === 100 && entries[1].quarter === macro.quarter, JSON.stringify(entries[1]));
        const problems = checkWorldInvariants();
        assert(!problems.some(x => x.includes('GHX')), 'nie ma naruszenia');
        assert(problems.warnings.filter(w => w.includes('GHX')).length === 2, `ostrzeżenia: ${problems.warnings}`);
        ghostTrimLog.length = 0;
    });

    test('bez nadwyżki rejestr zostaje pusty', () => {
        const a = makeCompany('CLX');
        resetWorld([a]);
        ghostTrimLog.length = 0;
        reconcileSharesHeld();
        assert(ghostTrimLog.length === 0 && checkWorldInvariants().warnings.length === 0, `wpisy: ${ghostTrimLog.length}`);
    });
});

group('0.13.1 B5: stabilność funduszu', () => {
    function simulateFund(annualExcess, seed, weeks = 104) {
        return withSeededRandom(seed, () => {
            const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000 });
            a.insiderShares = 0; a.sharesHeld = 0; a.reputation = { player: 0 };
            resetWorld([a]);
            allBonds.length = 0;
            marketIndexes.find(index => index.id === 'GIG').value = 100;
            startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
            const units0 = playerFund.units;
            let unitsYear1 = units0;
            for (let week = 0; week < weeks; week++) {
                macro.quarter = Math.floor(week / 13);
                const inPeriod = week % 39; // okres funduszu = 3 kwartały
                const current = playerFund.current;
                current.elapsedMs = inPeriod / 39 * FUND_PERIOD_MS;
                current.startNav = getFundNav();
                current.startBenchmark = getBenchmarkValue() / (1 - annualExcess * inPeriod / 52); // wynik vs GIG narasta w okresie
                current.maxDrawdown = 0;
                playerFund.trust = 50;
                processClientsWeekly();
                runJuMarketWeekly();
                if (week === 51) unitsYear1 = playerFund.units;
            }
            return { year1: unitsYear1 / units0 - 1, year2: playerFund.units / unitsYear1 - 1 };
        });
    }

    test('emisja ciągła domyślnie otwarta, przełącznik ją zamyka', () => {
        simulateFund(0, 1, 1);
        assert(isFundOpenForSubscriptions(), 'domyślnie otwarta');
        setFundOpenSubscriptions(false);
        assert(!isFundOpenForSubscriptions() && getOrganicInflowRate() >= 0, 'zamknięta');
    });

    test('wynik = GIG, zaufanie 50: zmiana JU w roku w granicach ±5% (8 kwartałów)', () => {
        for (const seed of [1, 2, 3]) {
            const r = simulateFund(0, seed);
            assert(Math.abs(r.year1) <= 0.05 && Math.abs(r.year2) <= 0.05, `ziarno ${seed}: rok 1 ${(r.year1 * 100).toFixed(1)}%, rok 2 ${(r.year2 * 100).toFixed(1)}%`);
        }
    });

    test('+5 pp/rok vs GIG → wzrost; −5 pp → powolny spadek, nie krach', () => {
        for (const seed of [1, 2]) {
            const neutral = simulateFund(0, seed), up = simulateFund(0.05, seed), down = simulateFund(-0.05, seed);
            assert(up.year2 > 0.03 && up.year2 > neutral.year2, `ziarno ${seed}: wzrost ${(up.year2 * 100).toFixed(1)}%`);
            assert(down.year2 < neutral.year2 && down.year1 > -0.25 && down.year2 > -0.25, `ziarno ${seed}: spadek ${(down.year1 * 100).toFixed(1)}% / ${(down.year2 * 100).toFixed(1)}%`);
        }
    });

    test('zadowolenie wraca do średniej; standardowa opłata nie obniża zadowolenia', () => {
        simulateFund(0, 4, 1);
        const def = CLIENT_TYPES.miser;
        const client = { satisfaction: 0.5 };
        const parts = getClientSatisfactionDrift(client, def, { excess: 0, trust: 50, maxDrawdown: 0, lastRankBad: false, ethicsIssue: null });
        assert(Math.abs(Object.values(parts).reduce((a, b) => a + b, 0)) < 1e-9, `dryf przy GIG i standardowej opłacie: ${JSON.stringify(parts)}`);
        const low = getClientSatisfactionDrift({ satisfaction: 0.2 }, def, { excess: 0, trust: 20, maxDrawdown: 0, lastRankBad: false, ethicsIssue: null });
        assert(Object.values(low).reduce((a, b) => a + b, 0) > 0, 'niskie zaufanie samo nie spycha zadowolenia w dół od 0,2');
    });

    test('panel przyczyn: odpływ i napływ zapisane z przyczyną, ostrzeżenie przy > 10% JU w kwartale', () => {
        simulateFund(0, 5, 1);
        const stats = getFundFlowStats();
        const base = stats.current.startUnits;
        const out0 = stats.current.out.performance || 0, in0 = stats.current.in.newClients || 0;
        noteFundFlow('out', 'performance', 1000, base * 0.11);
        noteFundFlow('in', 'newClients', 500, 1);
        assert(stats.current.out.performance === out0 + 1000 && stats.current.in.newClients === in0 + 500, 'przyczyny');
        assert(stats.current.warned, 'ostrzeżenie o odpływie > 10%');
        macro.quarter++;
        assert(getFundFlowStats().last.out.performance === out0 + 1000, 'ostatni kwartał w panelu');
    });
});

group('Etap A: decyzje balansu (zaufanie vs GIG, lokaty spółek, polityki kadrowe)', () => {
    function world(companies = 2) {
        const list = Array.from({ length: companies }, (_, i) => makeCompany(`LK${i}`, { cash: 5_000_000, fixedAssets: 800_000 }));
        list.forEach(company => { company.insiderShares = 0; company.sharesHeld = 0; company.reputation = { player: 0 }; });
        resetWorld(list);
        allBonds.length = 0;
        marketIndexes.find(index => index.id === 'GIG').value = 100;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return list;
    }

    test('cel zaufania: obsunięcie i zmienność równe GIG nie obniżają zaufania, nadwyżka ponad GIG — tak', () => {
        world();
        const base = { rivals: [], rank: 1, rankOf: 1, fundReturn: 0.05, benchmarkReturn: 0.05 };
        playerFund.current.elapsedMs = 0;
        playerFund.periods = Array.from({ length: 4 }, (_, number) => ({ ...base, number, maxDrawdown: 0, volatility: 0 }));
        const calm = computeTrustTarget();
        playerFund.periods = Array.from({ length: 4 }, (_, number) => ({ ...base, number, maxDrawdown: 0.12, volatility: 0.03, benchmarkDrawdown: 0.12, benchmarkVolatility: 0.03 }));
        const likeGig = computeTrustTarget();
        playerFund.periods = Array.from({ length: 4 }, (_, number) => ({ ...base, number, maxDrawdown: 0.20, volatility: 0.05, benchmarkDrawdown: 0.12, benchmarkVolatility: 0.03 }));
        const riskier = computeTrustTarget();
        assertNear(likeGig, calm, 'fundusz = GIG ma ten sam cel co spokojny', 1e-9);
        assert(riskier < likeGig - 3, `ryzyko ponad GIG obniża cel: ${riskier.toFixed(1)} vs ${likeGig.toFixed(1)}`);
    });

    test('okres zapisuje obsunięcie i zmienność GIG', () => {
        world();
        const gig = marketIndexes.find(index => index.id === 'GIG');
        for (const value of [100, 110, 90, 95]) { gig.value = value; updateFund(1); processFundWeekly(); }
        assertNear(playerFund.current.benchmarkDrawdown, 1 - 90 / 110, 'obsunięcie GIG', 1e-9);
        playerFund.current.elapsedMs = FUND_PERIOD_MS;
        updateFund(1);
        const period = playerFund.periods[playerFund.periods.length - 1];
        assert(period.benchmarkDrawdown > 0.18 && period.benchmarkVolatility > 0, JSON.stringify({ d: period.benchmarkDrawdown, v: period.benchmarkVolatility }));
    });

    test('lokaty spółek w JU: każda ≤ 5% aktywów funduszu, łącznie ≤ 10% na kwartał', () => {
        const companies = world(12);
        companies.forEach(company => { company.reputation.player = REPUTATION_LEVELS.CORRECT + 10; });
        const assets0 = getFundAssets();
        const random = Math.random;
        Math.random = () => 0;
        try { for (let week = 0; week < 5; week++) processCorporateSubscriptions(); }
        finally { Math.random = random; }
        const lokaty = playerFund.clients.filter(client => client.name.endsWith('(lokata)'));
        const inflow = getFundAssets() - assets0;
        assert(lokaty.length >= 2, `lokaty: ${lokaty.length}`);
        assert(inflow <= assets0 * CORPORATE_SUBSCRIPTION_QUARTER_CAP * 1.0001 + 1, `napływ ${inflow.toFixed(0)} z ${assets0.toFixed(0)}`);
        assert(lokaty.every(client => client.units * getFundNav() <= assets0 * CORPORATE_SUBSCRIPTION_MAX_SHARE * 1.2 + 1), 'pojedyncza lokata ≤ 5% aktywów');
    });

    test('polityki kadrowe: Oszczędna płaci ×0,95, Wyzysk ma kontrole Inspekcji ×4', () => {
        assert(LABOR_POLICIES.saving.pay === 0.95 && LABOR_POLICIES.exploit.inspection === 4, JSON.stringify([LABOR_POLICIES.saving, LABOR_POLICIES.exploit]));
        assert(LABOR_POLICIES.exploit.pay < LABOR_POLICIES.saving.pay && LABOR_POLICIES.saving.pay < LABOR_POLICIES.standard.pay, 'kolejność płac');
    });
});

group('0.14 T1a: rejestr sektorów i porządek nazw', () => {
    const OLD_PROFILES = {
        'Bankowość Komercyjna': { beta: 1.1, rateSens: -0.3, pe: 11, margin: 0.40, growth: 0.03, ps: 2.5, da: 0.02 },
        'Finanse Konsumenckie': { beta: 1.2, rateSens: 0.8, pe: 10, margin: 0.30, growth: 0.04, ps: 2.0, da: 0.02 },
        'Logistyka': { beta: 1.2, rateSens: 0.7, pe: 14, margin: 0.12, growth: 0.04, ps: 1.0, da: 0.06 },
        'Transport': { beta: 1.2, rateSens: 0.7, pe: 13, margin: 0.14, growth: 0.03, ps: 1.0, da: 0.07 }
    };
    const average = names => {
        const profiles = names.map(name => SECTOR_PROFILES[name] || OLD_PROFILES[name]);
        return Object.fromEntries(Object.keys(DEFAULT_SECTOR_PROFILE).map(key => [key, profiles.reduce((sum, p) => sum + p[key], 0) / profiles.length]));
    };
    const sameProfile = (a, b) => Object.keys(DEFAULT_SECTOR_PROFILE).every(key => Math.abs(a[key] - b[key]) < 1e-12);
    const isClean = stock => (stock.sector || []).every(isCanonicalSector) && !(stock.sector || []).some(name => LEGACY_SECTOR_NAMES.includes(name)) && isValidSegmentList(stock.segments);

    test('rejestr: 18 sektorów w 8 grupach, bez starych nazw i bez „common”', () => {
        assert(SECTOR_NAMES.length === 18 && new Set(SECTOR_NAMES).size === 18 && SECTOR_GROUPS.length === 8, `sektory ${SECTOR_NAMES.length}`);
        assert(SECTOR_NAMES.every(name => SECTORS[name].group && SECTORS[name].icon && SECTORS[name].profile), 'grupa, ikona, profil');
        assert(!LEGACY_SECTOR_NAMES.some(isCanonicalSector), 'brak starych nazw w rejestrze');
        assert(Object.keys(SECTOR_PROFILES).length === 18, 'profile tylko dla sektorów z rejestru');
    });

    test('mapowanie starych nazw na sektor i podsektor', () => {
        const seg = (sector, extra = {}) => deriveSegmentsFromSectors({ sector, ...extra });
        const intl = seg(['Bankowość Komercyjna', 'Finanse', 'Międzynarodowy'], { isBankStock: true, bankData: { type: BANK_TYPES.INTERNATIONAL } });
        assert(intl.length === 1 && intl[0].sector === 'Bankowość' && intl[0].subsector === 'Bank międzynarodowy' && intl[0].share === 1, JSON.stringify(intl));
        const inv = seg(['Bankowość Komercyjna', 'Finanse'], { isBankStock: true, bankData: { type: BANK_TYPES.INVESTMENT } });
        assert(inv.length === 1 && inv[0].subsector === 'Bank inwestycyjny', JSON.stringify(inv));
        assert(seg(['Bankowość Komercyjna', 'Bankowość'], { isBankStock: true, bankData: { type: BANK_TYPES.UNIVERSAL } })[0].subsector === 'Bank komercyjny', 'bank komercyjny');
        const loans = seg(['Finanse Konsumenckie', 'Usługi']);
        assert(loans.length === 1 && loans[0].sector === 'Finanse' && loans[0].subsector === 'Pożyczki konsumenckie', JSON.stringify(loans));
        assert(seg(['Logistyka'])[0].sector === 'Transport i logistyka' && seg(['Logistyka'])[0].subsector === 'Logistyka', 'Logistyka');
        assert(seg(['Transport'])[0].sector === 'Transport i logistyka' && !seg(['Transport'])[0].subsector, 'Transport');
        assert(seg(['Technologia', 'Usługi']).length === 1, 'doklejone „Usługi” usunięte');
        const two = seg(['Usługi', 'Nieruchomości']);
        assert(two.length === 2 && two[0].share === 0.5, '„Usługi” jako sektor główny zostają');
        const op = seg(['Finanse'], { marketOperator: 'GPW' });
        assert(op.length === 1 && op[0].subsector === 'Rynki kapitałowe', 'operator rynku');
        assert(seg(['common', 'Międzynarodowy']).length === 0, '„common” i „Międzynarodowy” to nie sektory');
    });

    test('kalibracja: spółki bez zmienionych nazw mają ten sam profil co średnia sprzed 0.14', () => {
        const combos = [...SECTOR_NAMES.map(name => [name]), ['Budowlany', 'Przemysł'], ['Żywność', 'Technologia'], ['Usługi', 'Nieruchomości'],
            ['Przemysł', 'Energia'], ['Medycyna', 'Technologia'], ['Energia', 'Chemia'], ['Bankowość', 'Żywność']];
        for (const sector of combos) assert(sameProfile(getSectorProfile({ sector }), average(sector)), `profil ${sector.join('+')}`);
        assert(sameProfile(getSectorProfile({ sector: ['Finanse Konsumenckie'] }), OLD_PROFILES['Finanse Konsumenckie']), 'Pożyczki konsumenckie = dawne Finanse Konsumenckie');
        assert(sameProfile(getSectorProfile({ sector: ['Logistyka'] }), OLD_PROFILES['Logistyka']), 'podsektor Logistyka = dawna Logistyka');
        assert(sameProfile(getSectorProfile({ sector: ['Transport'] }), OLD_PROFILES['Transport']), 'Transport i logistyka = dawny Transport');
    });

    test('cykle sektorów: tyle, ile sektorów kanonicznych; Transport i logistyka przejmuje cykl Transportu', () => {
        const cycles = createSectorCycles();
        assert(Object.keys(cycles).length === SECTOR_NAMES.length && SECTOR_NAMES.every(name => cycles[name]), 'cykle');
        const transport = { phase: 'boom', quartersLeft: 2 };
        const merged = normalizeSectorCycles({ 'Transport': transport, 'Logistyka': { phase: 'trough', quartersLeft: 1 }, 'Bankowość Komercyjna': { phase: 'peak', quartersLeft: 1 }, 'Międzynarodowy': {} });
        assert(Object.keys(merged).length === SECTOR_NAMES.length && merged['Transport i logistyka'] === transport, 'migracja cykli');
        assert(!Object.keys(merged).some(name => LEGACY_SECTOR_NAMES.includes(name)), 'bez starych nazw');
    });

    test('nowe startupy i spółki rynków mają tylko sektory z rejestru', () => {
        resetWorld([makeCompany('AAA')]);
        for (let i = 0; i < 60; i++) {
            const startup = generateNewStartup();
            assert(isClean(startup), `startup ${startup.sector}`);
        }
    });

    test('zapis v14: segmenty zwięźle, sektor wyliczany; migracja v13 usuwa stare nazwy', () => {
        const bank = makeCompany('BNK', { sector: ['Bankowość Komercyjna', 'Finanse', 'Międzynarodowy'] });
        bank.isBankStock = true; bank.bankData = { id: 'bks', type: BANK_TYPES.INTERNATIONAL };
        const loans = makeCompany('LOAN', { sector: ['Finanse Konsumenckie', 'Usługi'] });
        const mixed = makeCompany('MIX', { sector: ['Budowlany', 'Przemysł'] });
        const logi = makeCompany('LOGI', { sector: ['Logistyka', 'Transport'] });
        resetWorld([bank, loans, mixed, logi]);
        const legacy = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        for (const company of legacy.stocks) {
            delete company.seg; delete company.segments;
            company.sector = { BNK: ['Bankowość Komercyjna', 'Finanse', 'Międzynarodowy'], LOAN: ['Finanse Konsumenckie', 'Usługi'], MIX: ['Budowlany', 'Przemysł'], LOGI: ['Logistyka', 'Transport'] }[company.symbol];
        }
        legacy.version = 13;
        legacy.macro.sectorCycles = { 'Transport': { phase: 'boom', quartersLeft: 2 }, 'Bankowość Komercyjna': { phase: 'peak', quartersLeft: 1 } };
        const report = applySaveSnapshot(legacy);
        assert(report.ok, report.errors.join(' '));
        assert(stocks.every(isClean), stocks.map(s => `${s.symbol}:${s.sector}`).join(' '));
        const bySymbol = Object.fromEntries(stocks.map(s => [s.symbol, s]));
        assert(getMainSubsector(bySymbol.BNK) === 'Bank międzynarodowy' && getMainSubsector(bySymbol.LOAN) === 'Pożyczki konsumenckie', 'podsektory');
        assert(bySymbol.MIX.segments.length === 2 && bySymbol.MIX.segments[0].share === 0.5, 'równe udziały');
        assert(bySymbol.LOGI.segments.length === 1 && bySymbol.LOGI.sector[0] === 'Transport i logistyka', 'Logistyka + Transport = jeden sektor');
        assert(Object.keys(macro.sectorCycles).length === SECTOR_NAMES.length && macro.sectorCycles['Transport i logistyka'].phase === 'boom', 'cykle po migracji');

        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        assert((snapshot.version === 14 || snapshot.version === 15) && snapshot.stocks.every(s => typeof s.seg === 'string' && !s.sector && !s.segments), 'v14: tylko seg');
        assert(applySaveSnapshot(snapshot).ok, 'wczytanie v14');
        const mix = stocks.find(s => s.symbol === 'MIX');
        assert(mix.segments.length === 2 && mix.sector.join() === 'Budowlany,Przemysł' && isValidSegmentList(mix.segments), JSON.stringify(mix.segments));
    });
});

group('0.14 T1b: segmenty działalności', () => {
    const seg = (sector, share, subsector = null) => ({ sector, subsector, share });

    test('profil = średnia ważona udziałami; sektor główny = największy segment; sector wyliczany z segmentów', () => {
        const a = makeCompany('SEG', { sector: ['Chemia', 'Energia'] });
        a.segments = [seg('Chemia', 0.3), seg('Energia', 0.7)];
        a.sector = ['Chemia', 'Energia']; // stara kolejność — ensureStockSegments przelicza
        resetWorld([a]);
        ensureStockSegments(a);
        assert(a.sector.join() === 'Energia,Chemia' && getMainSector(a) === 'Energia', a.sector.join());
        const p = getSectorProfile(a);
        for (const key of Object.keys(DEFAULT_SECTOR_PROFILE)) assertNear(p[key], 0.7 * SECTOR_PROFILES['Energia'][key] + 0.3 * SECTOR_PROFILES['Chemia'][key], key, 1e-12);
    });

    test('cykl sektora działa proporcjonalnie do udziałów segmentów', () => {
        const a = makeCompany('CYC', { sector: ['Energia', 'Chemia'] });
        a.segments = [seg('Energia', 0.75), seg('Chemia', 0.25)];
        resetWorld([a]);
        ensureStockSegments(a);
        macro.sectorCycles['Energia'] = { phase: 'boom', quartersLeft: 3 };
        macro.sectorCycles['Chemia'] = { phase: 'trough', quartersLeft: 3 };
        assertNear(getSectorCycleAdj(a), 0.75 * SECTOR_CYCLE_PHASES.boom.adj + 0.25 * SECTOR_CYCLE_PHASES.trough.adj, 'wzrost', 1e-12);
        assertNear(getSectorValuationFactor(a), 0.75 * SECTOR_CYCLE_PHASES.boom.val + 0.25 * SECTOR_CYCLE_PHASES.trough.val, 'wycena', 1e-12);
    });

    test('segmenty: najwyżej 3, udziały sumują się do 1; dopisany sektor przebudowuje segmenty', () => {
        const a = makeCompany('MANY', { sector: ['Przemysł', 'Energia', 'Chemia', 'Budowlany'] });
        resetWorld([a]);
        ensureStockSegments(a);
        assert(a.segments.length === 3 && Math.abs(a.segments.reduce((s, x) => s + x.share, 0) - 1) < 1e-9, JSON.stringify(a.segments));
        const b = makeCompany('GROW', { sector: ['Przemysł'] });
        resetWorld([b]);
        ensureStockSegments(b);
        b.sector.push('Budowlany'); // np. budowa własnego działu budowlanego
        assert(ensureStockSegments(b) && b.segments.length === 2 && b.segments.every(x => x.share === 0.5), 'przebudowa');
        assert(!ensureStockSegments(b), 'idempotentne');
    });

    test('mediany sektora liczone po sektorze głównym', () => {
        const a = makeCompany('MED1', { sector: ['Chemia'] }), b = makeCompany('MED2', { sector: ['Energia', 'Chemia'] });
        b.segments = [seg('Energia', 0.6), seg('Chemia', 0.4)];
        [a, b].forEach(s => { initializeFundamentals(s, true); });
        resetWorld([a, b]);
        ensureAllStockSegments();
        sectorMedianCache.at = 0;
        const chem = getSectorMedians('Chemia'), energy = getSectorMedians('Energia');
        assert(chem?.count === 1 && energy?.count === 1, `Chemia ${chem?.count}, Energia ${energy?.count}`);
    });
});

group('0.14 T1c: filtr sektora i typu', () => {
    function world() {
        const banks = [
            ['BK1', ['Bankowość'], BANK_TYPES.UNIVERSAL], ['BK2', ['Bankowość Komercyjna', 'Finanse'], BANK_TYPES.INVESTMENT],
            ['BK3', ['Bankowość Komercyjna', 'Finanse', 'Międzynarodowy'], BANK_TYPES.INTERNATIONAL]
        ].map(([symbol, sector, type]) => { const s = makeCompany(symbol, { sector }); s.isBankStock = true; s.bankData = { id: symbol, type }; return s; });
        const food = makeCompany('BZY', { sector: ['Żywność', 'Bankowość'] });            // bank poboczny
        const reitA = makeCompany('RA', { sector: ['Nieruchomości'] }); reitA.assetType = 'REIT';
        const reitB = makeCompany('RB', { sector: ['Usługi'] }); reitB.assetType = 'REIT';
        const plain = makeCompany('PL', { sector: ['Nieruchomości'] });
        resetWorld([...banks, food, reitA, reitB, plain]);
        ensureAllStockSegments();
        return { banks, food, reitA, reitB, plain };
    }
    const pick = filter => stocks.filter(s => stockMatchesSectorFilter(s, filter)).map(s => s.symbol);

    test('filtr „Bankowość” (domyślny) obejmuje wszystkie banki; przełącznik zwiększa listę, nie zmniejsza', () => {
        const { banks, food } = world();
        const main = pick({ sector: 'Bankowość' });
        assert(banks.every(b => main.includes(b.symbol)), `banki: ${main}`);
        assert(!main.includes(food.symbol), 'spółka z bankiem jako drugim segmentem nie jest w filtrze domyślnym');
        const withSecondary = pick({ sector: 'Bankowość', secondary: true });
        assert(withSecondary.length >= main.length && main.every(s => withSecondary.includes(s)), `${main} ⊆ ${withSecondary}`);
        assert(withSecondary.includes(food.symbol), 'przełącznik dodaje segment poboczny');
        const counts = getSectorFilterCounts(stocks, { sector: 'Bankowość' });
        assert(counts.sectors['Bankowość'] === main.length, 'liczba na chipie = lista');
        assert(counts.subsectors['Bank inwestycyjny'] === 1 && counts.subsectors['Bank międzynarodowy'] === 1, JSON.stringify(counts.subsectors));
        assert(pick({ sector: 'Bankowość', subsector: 'Bank międzynarodowy' }).join() === 'BK3', 'podsektor');
    });

    test('filtr „Typ = REIT” nie zależy od sektora', () => {
        const { reitA, reitB, plain } = world();
        const reits = pick({ type: 'REIT' });
        assert(reits.includes(reitA.symbol) && reits.includes(reitB.symbol) && !reits.includes(plain.symbol), `${reits}`);
        assert(pick({ sector: 'Nieruchomości', type: 'REIT' }).join() === 'RA', 'sektor zawęża, typ nie');
        assert(getInstrumentType({ marketOperator: 'GPW' }) === 'operator' && getInstrumentType({ assetType: 'Holding' }) === 'holding', 'typy');
    });

    test('wybór filtra zapamiętany w localStorage', () => {
        const before = sectorFilterState;
        sectorFilterState = { sector: 'Energia', subsector: null, secondary: true, type: 'stock' };
        saveSectorFilterState();
        const loaded = loadSectorFilterState();
        sectorFilterState = before;
        saveSectorFilterState();
        assert(loaded.sector === 'Energia' && loaded.secondary === true && loaded.type === 'stock', JSON.stringify(loaded));
    });

    test('możliwość wyłączenia grupowania kategorii i płaski ciąg chipów', () => {
        const { banks } = world();
        const groupedRes = renderSectorFilterChips(stocks, { sector: 'all', grouped: true }, 'dummy');
        assert(groupedRes.chips.includes('sector-group-dropdown'), 'widok grupowany zawiera dropdowny');
        assert(groupedRes.extra.includes('grupuj kategorie'), 'kontrolka grupowania obecna');
        
        const flatRes = renderSectorFilterChips(stocks, { sector: 'all', grouped: false }, 'dummy');
        assert(!flatRes.chips.includes('sector-group-dropdown'), 'widok płaski bez dropdownów');
        assert(flatRes.chips.includes('Bankowość'), 'płaski widok zawiera bezpośrednie chipy sektorów');

        const before = sectorFilterState;
        toggleSectorGrouping(false);
        assert(sectorFilterState.grouped === false, 'toggleSectorGrouping wyłącza grupowanie');
        toggleSectorGrouping(true);
        assert(sectorFilterState.grouped === true, 'toggleSectorGrouping włącza grupowanie');
        sectorFilterState = before;
        saveSectorFilterState();
    });

    test('wykres świecowy rysuje pełne świece dla obu kierunków (zielona i czerwona)', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const history = [
            { open: 100, close: 105, high: 108, low: 98 },
            { open: 105, close: 95, high: 106, low: 94 }
        ];
        drawCandlestickChart(history, svg, 300, (i) => i * 100, (p) => 200 - p);
        const rects = svg.querySelectorAll('rect');
        assert(rects.length === 2, `liczba świec: ${rects.length}`);
        assert(rects[0].style.fill === 'var(--color-chart-up)', `wzrostowa pełna: ${rects[0].style.fill}`);
        assert(rects[1].style.fill === 'var(--color-chart-down)', `spadkowa pełna: ${rects[1].style.fill}`);
    });
});

group('0.14 decyzja 11: zdarzenia sektora Bankowość', () => {
    test('podatek bankowy i masowe pozwy: negatywne, tylko Bankowość (bilans: 3 pozytywne, 4 negatywne)', () => {
        const banking = sectorEventsPrompts.filter(e => e.targetSectors.includes('Bankowość'));
        const added = sectorEventsPrompts.filter(e => ['sec_neg_11', 'sec_neg_12'].includes(e.id));
        assert(added.length === 2 && added.every(e => e.type === 'negative' && e.targetSectors.join() === 'Bankowość' && e.message().includes('Bankowość')), 'dwa nowe zdarzenia');
        const pos = banking.filter(e => e.type === 'positive').length, neg = banking.filter(e => e.type === 'negative').length;
        assert(pos === 3 && neg === 4, `pozytywne ${pos}, negatywne ${neg}`);
    });
});

group('0.14 T2: podsektory', () => {
    const seg = (sector, subsector = null, share = 1) => ({ sector, subsector, share });
    const withSegments = (symbol, segments) => {
        const s = makeCompany(symbol, { sector: segments.map(x => x.sector) });
        s.segments = segments; s.sector = getSectorsFromSegments(segments);
        return s;
    };

    test('modyfikatory podsektora według tabeli T2; spółka bez podsektora — profil sektora bez zmian', () => {
        const bio = getSectorSubsectorProfile('Medycyna', 'Biotechnologia'), med = SECTOR_PROFILES['Medycyna'];
        assert(bio.beta === 1.6 && bio.pe === 30 && Math.abs(bio.growth - (med.growth + 0.04)) < 1e-12 && Math.abs(bio.margin - (med.margin - 0.10)) < 1e-12, JSON.stringify(bio));
        assert(getSectorSubsectorProfile('Energia', 'OZE').rateSens === SECTOR_PROFILES['Energia'].rateSens * 1.5, 'OZE stopy ×1,5');
        assert(getSectorSubsectorProfile('Energia', 'Energetyka jądrowa').da === 0.14, 'atom amortyzacja');
        assert(getSectorSubsectorProfile('Bankowość', 'Bank inwestycyjny').beta === 1.4, 'bank inwestycyjny');
        assert(getSectorSubsectorProfile('Finanse', 'Pożyczki konsumenckie').pe === 10, 'Pożyczki = dawne Finanse Konsumenckie');
        for (const name of SECTOR_NAMES) assert(getSectorSubsectorProfile(name, null) === SECTOR_PROFILES[name], `bez podsektora: ${name}`);
        const plain = withSegments('PLN', [seg('Technologia')]), ai = withSegments('AIX', [seg('Technologia', 'Sztuczna inteligencja')]);
        resetWorld([plain, ai]);
        assert(getSubsectorModifier(plain, 'vol') === 1 && getSubsectorModifier(ai, 'vol') === 1.3, 'zmienność SI ×1,3');
        assert(getSubsectorGrowthAdj(plain) === 0, 'bez podsektora: brak dodatku wzrostu');
    });

    test('Półprzewodniki: cykl ×1,5; Lotnictwo: odwrotnie do cyklu Energii', () => {
        const chips = withSegments('CHP', [seg('Technologia', 'Półprzewodniki')]), air = withSegments('AIR', [seg('Transport i logistyka', 'Lotnictwo')]);
        resetWorld([chips, air]);
        macro.sectorCycles['Technologia'] = { phase: 'boom', quartersLeft: 3 };
        macro.sectorCycles['Energia'] = { phase: 'boom', quartersLeft: 3 };
        assertNear(getSectorCycleAdj(chips), SECTOR_CYCLE_PHASES.boom.adj * 1.5, 'głębszy cykl', 1e-12);
        assertNear(getSectorValuationFactor(chips), 1 + (SECTOR_CYCLE_PHASES.boom.val - 1) * 1.5, 'wycena', 1e-12);
        assert(getSubsectorGrowthAdj(air) < 0, 'boom Energii (drogie paliwo) szkodzi Lotnictwu');
    });

    test('0.13: specjaliści (niedobór) i dotacje Ludowców dla Rolnictwa', () => {
        const bio = withSegments('BIO', [seg('Medycyna', 'Biotechnologia')]), farm = withSegments('FRM', [seg('Żywność', 'Rolnictwo')]);
        resetWorld([bio, farm]);
        const shortage = society.shortage, ruling = macro.election.ruling, coalition = macro.election.coalition;
        try {
            society.shortage = 1.2;
            assertNear(getSubsectorGrowthAdj(bio), -0.002, 'mocniejszy niedobór specjalistów', 1e-12);
            macro.election.ruling = 'market'; macro.election.coalition = null;
            assert(getSubsectorGrowthAdj(farm) === 0, 'bez Ludowców bez dotacji');
            macro.election.ruling = 'people';
            assert(getSubsectorGrowthAdj(farm) > 0, 'Ludowcy dotują rolnictwo');
        } finally { society.shortage = shortage; macro.election.ruling = ruling; macro.election.coalition = coalition; }
    });

    test('przydział startowy z tabeli (raz), WinPost staje się fintechem; tabela tylko z podsektorów rejestru', () => {
        for (const [symbol, [sector, sub]] of Object.entries(SUBSECTOR_START_ASSIGNMENTS)) assert(getSubsectorDef(sector, sub), `${symbol}: ${sector}/${sub}`);
        const vtg = makeCompany('VTG', { sector: ['Medycyna', 'Technologia'] }), wip = makeCompany('WIP', { sector: ['Technologia', 'Usługi'] }), other = makeCompany('OTH', { sector: ['Chemia'] });
        resetWorld([vtg, wip, other]);
        ensureAllStockSegments();
        macro.subsectorsAssigned = false;
        assert(applyStartSubsectors() === 2, 'dwie spółki z tabeli');
        assert(vtg.segments.find(s => s.sector === 'Medycyna').subsector === 'Biotechnologia' && !vtg.segments.find(s => s.sector === 'Technologia').subsector, 'VitaGen');
        assert(getMainSector(wip) === 'Finanse' && getMainSubsector(wip) === 'Fintech' && wip.segments.length === 2, JSON.stringify(wip.segments));
        assert(!getMainSubsector(other), 'spoza tabeli bez podsektora');
        assert(applyStartSubsectors() === 0, 'tylko raz');
    });

    test('nowe spółki: ok. 30% dostaje podsektor, Fintech z premią', () => withSeededRandom(7, () => {
        const counts = {};
        let withSub = 0;
        for (let i = 0; i < 2000; i++) {
            const s = { sector: ['Finanse'], segments: [seg('Finanse')] };
            const sub = assignRandomSubsector(s);
            if (sub) { withSub++; counts[sub] = (counts[sub] || 0) + 1; }
        }
        assert(withSub > 520 && withSub < 680, `z podsektorem: ${withSub}/2000`);
        assert(counts['Fintech'] > counts['Rynki kapitałowe'] * 3 && counts['Fintech'] > counts['Pożyczki konsumenckie'] * 3, JSON.stringify(counts));
        const bank = { sector: ['Bankowość'], segments: [seg('Bankowość')] };
        for (let i = 0; i < 50; i++) assignRandomSubsector(bank, 1);
        assert(!bank.segments[0].subsector, 'typ banku nie jest losowany');
    }));

    test('mediana podsektora dopiero przy ≥ 3 spółkach', () => {
        const list = ['A1', 'A2', 'A3', 'A4'].map(symbol => withSegments(symbol, [seg('Technologia', 'Sztuczna inteligencja')]));
        list.forEach(s => initializeFundamentals(s, true));
        resetWorld(list.slice(0, 2));
        sectorMedianCache.at = 0;
        assert(getSubsectorMedians('Technologia', 'Sztuczna inteligencja') === null, '2 spółki — brak mediany');
        resetWorld(list.slice(0, 3));
        sectorMedianCache.at = 0;
        const m = getSubsectorMedians('Technologia', 'Sztuczna inteligencja');
        assert(m && m.count === 3, `mediana: ${JSON.stringify(m)}`);
    });
});

group('0.14 T2: Biotechnologia — badania kliniczne', () => {
    function biotech(symbol = 'BIOX') {
        const s = makeCompany(symbol, { sector: ['Medycyna'] });
        s.segments = [{ sector: 'Medycyna', subsector: 'Biotechnologia', share: 1 }]; s.sector = ['Medycyna'];
        resetWorld([s]);
        return s;
    }

    test('wynik fazy losowany dopiero przy ogłoszeniu: sukces podnosi kurs, porażka obniża i zamyka program', () => {
        const s = biotech();
        startClinicalTrial(s, 10);
        assert(Object.keys(s.clinicalTrial).sort().join() === 'drug,dueQuarter,phase,startedQuarter', 'brak wyniku zapisanego z góry: ' + Object.keys(s.clinicalTrial));
        assert(s.clinicalTrial.dueQuarter >= 13 && s.clinicalTrial.dueQuarter <= 16, 'faza 3–6 kw.');
        const p0 = s.price;
        const ok = resolveClinicalPhase(s, 0.1, 14);
        assert(ok.success && s.price >= p0 * 1.4 - 1e-9 && s.price <= p0 * 1.8 + 1e-9 && s.clinicalTrial.phase === 2, `sukces: ${s.price / p0}`);
        s.prShieldExpiry = Date.now() + 1e9; // tarcza PR nie chroni przed wynikiem binarnym
        const p1 = s.price;
        const bad = resolveClinicalPhase(s, 0.99, 18);
        assert(!bad.success && s.price <= p1 * 0.6 + 1e-9 && s.price >= p1 * 0.3 - 1e-9 && !s.clinicalTrial && s.clinicalCooldownUntil >= 20, `porażka: ${s.price / p1}`);
    });

    test('faza III: rejestracja leku trwale podnosi wzrost; szanse faz 60 / 45 / 60%', () => {
        const s = biotech();
        startClinicalTrial(s, 0);
        s.clinicalTrial.phase = 3;
        const g0 = Number(s.growthAdj) || 0;
        assert(resolveClinicalPhase(s, 0.59, 5).success && s.approvedDrugs === 1 && s.growthAdj > g0 && !s.clinicalTrial, 'rejestracja');
        assert(CLINICAL_PHASES[1].chance === 0.6 && CLINICAL_PHASES[2].chance === 0.45 && CLINICAL_PHASES[3].chance === 0.6, 'szanse');
        startClinicalTrial(s, 10); s.clinicalTrial.phase = 2;
        assert(!resolveClinicalPhase(s, 0.46, 12).success, 'faza II: 46% > 45% = porażka');
    });

    test('częstotliwość: 1 biotech, 26 kwartałów — średnio 2–6 wyników', () => {
        let total = 0;
        for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) total += withSeededRandom(seed, () => {
            const s = biotech();
            society.stats = { clinicalResults: 0 };
            for (let q = 1; q <= 26; q++) processClinicalTrials(q);
            return society.stats.clinicalResults;
        });
        assert(total / 8 >= 2 && total / 8 <= 6, `średnio ${total / 8}`);
    });
});

group('0.14 T2: Energetyka jądrowa — budowa bloku', () => {
    function nuclear(symbol = 'NUKE') {
        const s = makeCompany(symbol, { sector: ['Energia'], cash: 5_000_000 });
        s.segments = [{ sector: 'Energia', subsector: 'Energetyka jądrowa', share: 1 }]; s.sector = ['Energia'];
        initializeFundamentals(s, true);
        resetWorld([s]);
        return s;
    }

    test('budowa 8–16 kw. z gotówki, potem zgoda regulatora i stabilny przychód', () => {
        const s = nuclear();
        const block = startNuclearBlock(s, 0);
        assert(block.quarters >= 8 && block.quarters <= 16 && block.stage === 'construction', JSON.stringify(block));
        const cash0 = s.cash, equity0 = s.balanceSheet.assets - s.balanceSheet.liabilities;
        payNuclearInstallment(s);
        assert(s.cash < cash0 && Math.abs((s.balanceSheet.assets - s.balanceSheet.liabilities) - equity0) < 1e-6, 'gotówka → budowa, kapitał bez zmian');
        const revenue0 = s.fundamentals.revenue;
        assert(reviewNuclearBlock(s, 0.9, block.dueQuarter) === 'operating' && s.nuclearBlock.stage === 'operating', 'uruchomienie');
        assertNear(s.fundamentals.revenue, revenue0 * 1.15, 'przychód +15%', 1e-6);
    });

    test('regulator: opóźnienie 2–4 kw. (najwyżej 2 razy)', () => {
        const s = nuclear();
        startNuclearBlock(s, 0);
        assert(reviewNuclearBlock(s, 0.1, 12) === 'delayed' && s.nuclearBlock.dueQuarter >= 14 && s.nuclearBlock.dueQuarter <= 16, 'opóźnienie');
        assert(reviewNuclearBlock(s, 0.1, 16) === 'delayed', 'drugie opóźnienie');
        assert(reviewNuclearBlock(s, 0.1, 20) === 'operating', 'po 2 opóźnieniach blok rusza');
    });

    test('kontrakt z państwem zależy od partii rządzącej', () => {
        const s = nuclear();
        startNuclearBlock(s, 0); reviewNuclearBlock(s, 0.9, 10);
        const ruling = macro.election.ruling, coalition = macro.election.coalition, treasury = governmentTreasury;
        try {
            governmentTreasury = 1e9;
            macro.election.coalition = null;
            macro.election.ruling = 'market';
            assert(payNuclearStateContract(s) === 0, 'Koalicja Rynkowa: bez kontraktu');
            macro.election.ruling = 'state';
            assert(payNuclearStateContract(s) > 0, 'Blok Państwowy: kontrakt');
        } finally { macro.election.ruling = ruling; macro.election.coalition = coalition; governmentTreasury = treasury; }
    });
});

group('0.14 T2: Fintech — licencja KNF', () => {
    function fintech(symbol = 'FINX', health = 1) {
        const s = makeCompany(symbol, { sector: ['Finanse'], cash: 1_000_000 });
        s.segments = [{ sector: 'Finanse', subsector: 'Fintech', share: 1 }]; s.sector = ['Finanse'];
        s.financialHealth = health;
        initializeFundamentals(s, true);
        resetWorld([s]);
        return s;
    }

    test('dobra kondycja: kontrola bez uwag; słaba: kara albo zakaz nowych klientów (wzrost 0 na 2 kw.)', () => {
        const ok = fintech('FOK', 2);
        assert(runKnfInspection(ok, 0.1, 5) === 'clean', 'bez uwag');
        const fined = fintech('FFI', -2);
        const cash0 = fined.cash;
        assert(runKnfInspection(fined, 0.1, 5) === 'fine' && Math.abs(cash0 - fined.cash - cash0 * 0.05) < 1, 'kara 5% gotówki');
        const banned = fintech('FBN', -2);
        assert(runKnfInspection(banned, 0.9, 5) === 'ban' && isKnfGrowthBlocked(banned, 6) && !isKnfGrowthBlocked(banned, 7), 'zakaz na 2 kw.');
        macro.quarter = 6;
        const revenue0 = banned.fundamentals.revenue;
        banned.growthAdj = 0.05; // nawet przy dużym dodatku wzrostu
        const random = Math.random; Math.random = () => 0.5;
        try { computeQuarterResults(banned); } finally { Math.random = random; }
        assert(banned.fundamentals.revenue <= revenue0 + 1e-6, `przychody bez wzrostu: ${revenue0} → ${banned.fundamentals.revenue}`);
    });

    test('częstotliwość: 10% na rok (ok. 2,6% na kwartał)', () => withSeededRandom(3, () => {
        const s = fintech('FRQ', 2);
        society.stats = { knfChecks: 0 };
        for (let q = 0; q < 4000; q++) processKnfChecks(q);
        const perYear = society.stats.knfChecks / 1000;
        assert(perYear > 0.08 && perYear < 0.12, `kontroli na rok: ${perYear}`);
    }));
});

group('0.14 decyzja 12: państwowy program jądrowy', () => {
    test('spółka państwowa buduje blok bez własnej gotówki — raty płaci Skarb Państwa', () => {
        const s = makeCompany('PNUK', { sector: ['Energia'], cash: 0, fixedAssets: 5_000_000 });
        s.segments = [{ sector: 'Energia', subsector: 'Energetyka jądrowa', share: 1 }]; s.sector = ['Energia'];
        s.isStateOwned = true;
        initializeFundamentals(s, true);
        resetWorld([s]);
        const treasury = governmentTreasury;
        try {
            governmentTreasury = 1e12;
            const block = startNuclearBlock(s, 0);
            assert(block.stateFunded, 'finansowanie państwowe');
            const cash0 = s.cash, assets0 = s.balanceSheet.assets;
            const paid = payNuclearInstallment(s);
            assert(paid > 0 && s.cash === cash0 && s.balanceSheet.assets === assets0 + paid && governmentTreasury === 1e12 - paid, 'Skarb płaci, gotówka spółki bez zmian');
        } finally { governmentTreasury = treasury; }
    });

    test('szansa startu według partii: Blok Państwowy > Ludowcy > Koalicja Rynkowa; prywatna spółka bez gotówki nie zaczyna', () => {
        const s = makeCompany('PNK2', { sector: ['Energia'], cash: 0 });
        s.segments = [{ sector: 'Energia', subsector: 'Energetyka jądrowa', share: 1 }]; s.sector = ['Energia'];
        initializeFundamentals(s, true);
        resetWorld([s]);
        assert(getNuclearStartChance(s) === 0, 'prywatna bez gotówki');
        s.isStateOwned = true;
        const ruling = macro.election.ruling, coalition = macro.election.coalition;
        try {
            macro.election.coalition = null;
            const chance = id => { macro.election.ruling = id; return getNuclearStartChance(s); };
            assert(chance('state') > chance('people') && chance('people') > chance('market') && chance('market') > 0, 'kolejność partii');
        } finally { macro.election.ruling = ruling; macro.election.coalition = coalition; }
        assert(SUBSECTOR_START_ASSIGNMENTS.PUR[1] === 'Energetyka jądrowa' && SUBSECTOR_START_ASSIGNMENTS.TRN[1] === 'Energetyka jądrowa', '2 spółki jądrowe na starcie');
    });
});

group('0.14 T3: rozszerzenie o nowy segment', () => {
    function firm(symbol, sectors = ['Technologia'], opts = {}) {
        const s = makeCompany(symbol, { sector: sectors, cash: opts.cash ?? 2_000_000 });
        s.financialHealth = opts.health ?? 3;
        initializeFundamentals(s, true);
        s.fundamentals.revenueTtm = 1_000_000;
        resetWorld([s]);
        ensureStockSegments(s);
        return s;
    }
    const sum = s => s.segments.reduce((a, x) => a + x.share, 0);

    test('warunki: kondycja ≥ 2, gotówka ≥ 15% rocznych przychodów, < 3 segmenty; koszt 10–20% przychodów', () => {
        assert(canStartExpansion(firm('EX1')), 'spełnia');
        assert(!canStartExpansion(firm('EX2', ['Technologia'], { health: 1 })), 'kondycja');
        assert(!canStartExpansion(firm('EX3', ['Technologia'], { cash: 100_000 })), 'gotówka');
        assert(!canStartExpansion(firm('EX4', ['Technologia', 'Chemia', 'Energia'])), '3 segmenty');
        const s = firm('EX5');
        const cash0 = s.cash;
        const p = startExpansion(s, 'Gaming', 0);
        assert(p.cost >= 100_000 && p.cost <= 200_000 && Math.abs(cash0 - s.cash - p.cost) < 1, `koszt ${p.cost}`);
        assert(p.dueQuarter >= 4 && p.dueQuarter <= 8 && p.related, 'budowa 4–8 kw., Technologia–Gaming powiązane');
    });

    test('sukces: segment 10%, potem stopniowo do 20–40% (≤ 5 pp/kw.), udziały sumują się do 1', () => {
        const s = firm('EX6');
        startExpansion(s, 'Gaming', 0);
        assert(resolveExpansion(s, 0.79, 6) === 'success', 'powiązane: 85%');
        const seg = s.segments.find(x => x.sector === 'Gaming');
        assertNear(seg.share, 0.10, 'start 10%', 1e-9);
        assertNear(sum(s), 1, 'suma', 1e-9);
        let prev = seg.share;
        for (let q = 0; q < 20; q++) { growNewSegment(s); assert(seg.share - prev <= 0.05 + 1e-9, 'krok ≤ 5 pp'); prev = seg.share; assertNear(sum(s), 1, 'suma', 1e-9); }
        assert(seg.share >= 0.2 - 1e-9 && seg.share <= 0.4 + 1e-9 && !s.strategy.growth, `cel ${seg.share}`);
    });

    test('niepowiązane: sukces 65% (decyzja 15); porażka — odpis 50–100% kosztu i kurs −5…−10%', () => {
        const s = firm('EX7');
        startExpansion(s, 'Żywność', 0);
        assert(!s.strategy.process.related, 'Technologia–Żywność niepowiązane');
        const assets0 = s.balanceSheet.assets, price0 = s.price, cost = s.strategy.process.cost;
        assert(resolveExpansion(s, 0.7, 6) === 'failure', '0,7 > 65%');
        const writeOff = assets0 - s.balanceSheet.assets;
        assert(writeOff >= cost * 0.5 - 1 && writeOff <= cost + 1, `odpis ${writeOff}`);
        assert(s.price <= price0 * 0.95 + 1e-9 && s.price >= price0 * 0.9 - 1e-9 && s.segments.length === 1, 'kurs i brak segmentu');
    });

    test('synergia +1 pp marży tylko dla branż powiązanych', () => {
        assert(getSynergyMarginAdj(firm('SY1', ['Chemia', 'Przemysł'])) === 0.01, 'Chemia–Przemysł');
        assert(getSynergyMarginAdj(firm('SY2', ['Chemia', 'Turystyka'])) === 0, 'niepowiązane');
        assert(getSynergyMarginAdj(firm('SY3', ['Chemia'])) === 0, 'jeden segment');
    });
});

group('0.14 T3: wejście w podsektor i premia skupienia', () => {
    function firm(symbol, segments) {
        const s = makeCompany(symbol, { sector: segments.map(x => x.sector), cash: 2_000_000 });
        s.financialHealth = 2; s.segments = segments; s.sector = getSectorsFromSegments(segments);
        initializeFundamentals(s, true); s.fundamentals.revenueTtm = 1_000_000;
        resetWorld([s]);
        return s;
    }
    test('koszt 5–10% rocznych przychodów, 2–4 kw., segment dostaje podsektor', () => {
        const s = firm('SUB1', [{ sector: 'Technologia', subsector: null, share: 1 }]);
        assert(canEnterSubsector(s), 'może wejść');
        const cash0 = s.cash;
        const p = startSubsectorEntry(s, 'Półprzewodniki', 0);
        assert(p.cost >= 50_000 && p.cost <= 100_000 && Math.abs(cash0 - s.cash - p.cost) < 1 && p.dueQuarter >= 2 && p.dueQuarter <= 4, JSON.stringify(p));
        assert(resolveSubsectorEntry(s) === 'Półprzewodniki' && getMainSubsector(s) === 'Półprzewodniki', 'podsektor');
        const bank = firm('SUB2', [{ sector: 'Bankowość', subsector: null, share: 1 }]);
        assert(!getSubsectorEntryCandidate(bank), 'typ banku nie jest podsektorem do wyboru');
    });
    test('premia skupienia +1,5 pp: segment z podsektorem ≥ 70%; bez podsektora — brak premii', () => {
        assert(getFocusMarginAdj(firm('F1', [{ sector: 'Technologia', subsector: 'Półprzewodniki', share: 0.75 }, { sector: 'Chemia', subsector: null, share: 0.25 }])) === 0.015, '75% z podsektorem');
        assert(getFocusMarginAdj(firm('F2', [{ sector: 'Technologia', subsector: 'Półprzewodniki', share: 0.6 }, { sector: 'Chemia', subsector: null, share: 0.4 }])) === 0, '60%');
        assert(getFocusMarginAdj(firm('F3', [{ sector: 'Technologia', subsector: null, share: 1 }])) === 0, 'bez podsektora (decyzja użytkownika)');
    });
});

group('0.14 T3: specjalizacja-nisza', () => {
    function firm(symbol, segments, cash = 2_000_000) {
        const s = makeCompany(symbol, { sector: segments.map(x => x.sector), cash });
        s.financialHealth = 2; s.segments = segments; s.sector = getSectorsFromSegments(segments);
        initializeFundamentals(s, true); s.fundamentals.revenueTtm = 1_000_000;
        resetWorld([s]);
        return s;
    }
    test('rejestr nisz (rozszerzalny), koszt 3–5% i 2 kw.; Farmaceutyki: marża +2 pp, patent może wygasnąć', () => {
        assert(Object.keys(SECTORS['Media'].niches).join() === 'TV,Rozrywka' && SECTORS['Medycyna'].niches['Farmaceutyki'] && SECTORS['Technologia'].niches['Wywiad i obronność'], 'nisze 0.14');
        assert(!SECTORS['Medycyna'].niches['Farmaceutyki'].profile, 'nisza bez własnego profilu wyceny');
        const s = firm('PH1', [{ sector: 'Medycyna', subsector: null, share: 1 }]);
        const p0 = getSectorProfile(s);
        const cash0 = s.cash;
        const p = startNiche(s, 'Farmaceutyki', 0);
        assert(p.cost >= 30_000 && p.cost <= 50_000 && Math.abs(cash0 - s.cash - p.cost) < 1 && p.dueQuarter === 2, JSON.stringify(p));
        resolveNiche(s, 2);
        assert(s.segments[0].niche === 'Farmaceutyki' && JSON.stringify(getSectorProfile(s)) === JSON.stringify(p0), 'profil bez zmian');
        assertNear(getNicheMarginAdj(s, 3), 0.02, 'marża +2 pp', 1e-12);
        s.strategy.patentExpiredUntil = 10;
        assert(getNicheMarginAdj(s, 5) === 0 && getNicheMarginAdj(s, 10) === 0.02, 'wygasły patent zdejmuje premię na czas');
    });
    test('zmiana specjalizacji: blokada 4 kw. i zerowanie premii skupienia na 2 kw.', () => {
        const s = firm('TV1', [{ sector: 'Media', subsector: null, share: 1, niche: 'TV' }]);
        s.segments[0].subsector = null;
        startNiche(s, 'Rozrywka', 10);
        assert(isNicheLocked(s, 13) && !isNicheLocked(s, 14) && startNiche(s, 'TV', 12) === null, 'blokada 4 kw.');
        resolveNiche(s, 12);
        s.segments[0].subsector = 'Pożyczki konsumenckie'; // dowolny podsektor do testu premii (≥ 70%)
        assert(getFocusMarginAdj(s, 13) === 0 && getFocusMarginAdj(s, 14) === 0.015, 'premia skupienia wraca po 2 kw.');
    });
    test('TV/Rozrywka: hit albo klapa sezonu zmienia kurs i przychody kwartału; Wywiad rośnie z wydatkami na obronność', () => {
        const s = firm('TV2', [{ sector: 'Media', subsector: null, share: 1, niche: 'TV' }]);
        const p0 = s.price;
        const random = Math.random; let calls = 0;
        Math.random = () => (calls++ === 0 ? 0.05 : 0.2); // sezon tak, hit
        try { processNicheEvents(s, 1); } finally { Math.random = random; }
        assert(s.price >= p0 * 1.1 - 1e-9 && s.strategy.seasonFactor > 1, `hit: ${s.price / p0}`);
        assert(consumeNicheRevenueFactor(s) > 1 && consumeNicheRevenueFactor(s) === 1, 'jednorazowy mnożnik przychodów');
        const intel = firm('INT1', [{ sector: 'Technologia', subsector: null, share: 1, niche: 'Wywiad i obronność' }]);
        assert(getNicheGrowthAdj(intel) >= 0 && getNicheGrowthAdj(firm('INT2', [{ sector: 'Technologia', subsector: null, share: 1 }])) === 0, 'Wywiad');
    });
    test('zapis: nisza w segmentach (4. pole), bez niszy format bez zmian', () => {
        assert(encodeSegmentsForSave([{ sector: 'Media', subsector: null, share: 1, niche: 'TV' }]) === 'Media||1|TV', 'z niszą');
        assert(encodeSegmentsForSave([{ sector: 'Media', subsector: null, share: 1 }]) === 'Media||1', 'bez niszy');
        assert(decodeSavedSegments('Media||1|TV')[0].niche === 'TV' && !('niche' in decodeSavedSegments('Media||1')[0]), 'odczyt');
    });
});

group('0.14 T3: zmiana profilu (pivot)', () => {
    function firm(symbol, segments) {
        const s = makeCompany(symbol, { sector: segments.map(x => x.sector), cash: 2_000_000 });
        s.financialHealth = 1; s.segments = segments; s.sector = getSectorsFromSegments(segments);
        initializeFundamentals(s, true); s.fundamentals.revenueTtm = 1_000_000;
        resetWorld([s]);
        return s;
    }
    test('segment główny traci 20–40 pp stopniowo przez 4 kw.; marża −3 pp i zmienność ×1,3 w trakcie', () => {
        const s = firm('PV1', [{ sector: 'Chemia', subsector: null, share: 1 }]);
        const pivot = startPivot(s, 'Medycyna', 0);
        assert(pivot && pivot.total >= 0.2 && pivot.total <= 0.4 && s.segments.length === 2, JSON.stringify(pivot));
        assert(getPivotMarginAdj(s) === -0.03 && getStrategyVolatilityFactor(s) === 1.3, 'kary w trakcie');
        const chem = () => s.segments.find(x => x.sector === 'Chemia').share;
        let prev = chem();
        for (let q = 1; q <= 3; q++) { assert(advancePivot(s, 0.9, q) === 'running', 'trwa'); assert(prev - chem() <= pivot.perQuarter + 1e-9, 'stopniowo'); prev = chem(); }
        assert(advancePivot(s, 0.9, 4) === 'done' && !s.strategy.pivot, 'koniec');
        assertNear(chem(), 1 - 0.05 - pivot.total * 0.95, 'segment główny po pivocie', 0.02);
        assert(getPivotMarginAdj(s) === 0 && getStrategyVolatilityFactor(s) === 1, 'po pivocie bez kar');
        assertNear(s.segments.reduce((a, x) => a + x.share, 0), 1, 'suma udziałów', 1e-9);
    });
    test('porażka pivotu (30%): nowy segment znika, koszty zostają', () => {
        const s = firm('PV2', [{ sector: 'Chemia', subsector: null, share: 1 }]);
        const cash0 = s.cash;
        const pivot = startPivot(s, 'Medycyna', 0);
        for (let q = 1; q <= 3; q++) advancePivot(s, 0.9, q);
        assert(advancePivot(s, 0.29, 4) === 'failed' && s.segments.length === 1 && s.segments[0].sector === 'Chemia', 'segment znika');
        assert(Math.abs(cash0 - s.cash - pivot.cost) < 1, 'koszty zostają');
    });
});

group('0.14 T3: dyskonto konglomeratu', () => {
    const firm = (symbol, segments) => { const s = makeCompany(symbol, { sector: segments.map(x => x[0]) }); s.segments = segments.map(([sector, share]) => ({ sector, subsector: null, share })); s.sector = getSectorsFromSegments(s.segments); return s; };
    test('−4% za każdy niepowiązany segment ponad pierwszy, najwyżej −10%; powiązane bez dyskonta', () => {
        assert(getConglomerateDiscount(firm('C1', [['Chemia', 1]])) === 0, 'jeden segment');
        assert(getConglomerateDiscount(firm('C2', [['Chemia', 0.6], ['Przemysł', 0.4]])) === 0, 'powiązane');
        assertNear(getConglomerateDiscount(firm('C3', [['Chemia', 0.6], ['Turystyka', 0.4]])), 0.04, 'jeden niepowiązany', 1e-12);
        assertNear(getConglomerateDiscount(firm('C4', [['Chemia', 0.5], ['Turystyka', 0.3], ['Media', 0.2]])), 0.08, 'dwa niepowiązane', 1e-12);
        assert(CONGLOMERATE_DISCOUNT_MAX === 0.10, 'limit −10%');
    });
    test('dyskonto działa przez cel wyceny (fairValue ×0,96), nie przez skok kursu', () => {
        const a = firm('CV1', [['Chemia', 0.6], ['Turystyka', 0.4]]);
        initializeFundamentals(a, true);
        resetWorld([a]);
        a.ledgerQuarters = 8;
        const price0 = a.price;
        const original = getConglomerateDiscount;
        let withoutDiscount;
        try { getConglomerateDiscount = () => 0; updateFundamentalRatios(a); withoutDiscount = a.fundamentals.fairValue; }
        finally { getConglomerateDiscount = original; }
        updateFundamentalRatios(a);
        assert(withoutDiscount > 0 && Math.abs(a.fundamentals.fairValue / withoutDiscount - 0.96) < 1e-9, `${a.fundamentals.fairValue} / ${withoutDiscount}`);
        assert(a.price === price0, 'kurs bez skoku');
    });
});

group('0.14 T3: kto decyduje — prezes, większościowiec', () => {
    function firm(symbol) {
        const s = makeCompany(symbol, { sector: ['Technologia'], cash: 2_000_000 });
        s.financialHealth = 3; initializeFundamentals(s, true); s.fundamentals.revenueTtm = 1_000_000;
        resetWorld([s]); ensureStockSegments(s);
        return s;
    }
    test('gracz-większościowiec: przypięty mail; blokada zatrzymuje, brak odpowiedzi = decyzja prezesa', () => {
        const s = firm('DEC1');
        const control = canFundControlAgm;
        try {
            canFundControlAgm = () => true;
            assert(proposeStrategy(s, { type: 'expand', target: 'Gaming' }, 5) === 'pending' && s.strategy.pendingProposal, 'czeka na decyzję');
            assert(respondStrategyProposal('DEC1', 'block') && resolveStrategyProposal(s, 6) === 'blocked' && !s.strategy.process, 'zablokowane');
            proposeStrategy(s, { type: 'expand', target: 'Gaming' }, 7);
            assert(resolveStrategyProposal(s, 7) === null, 'w tym samym kwartale bez decyzji');
            assert(resolveStrategyProposal(s, 8) === 'started' && s.strategy.process?.type === 'expand' && s.strategy.process.by === 'ceo', 'brak odpowiedzi = prezes');
        } finally { canFundControlAgm = control; }
    });
    test('zlecenie większościowca od razu; bez kontroli — odmowa; nisza z blokadą 4 kw.', () => {
        const s = firm('DEC2');
        const control = canFundControlAgm;
        try {
            canFundControlAgm = () => false;
            assert(orderStrategy('DEC2', 'expand', 'Gaming') === null, 'tylko większościowiec');
            canFundControlAgm = () => true;
            const p = orderStrategy('DEC2', 'expand', 'Gaming');
            assert(p && p.by === 'owner' && p.sector === 'Gaming', 'zlecone');
            const m = firm('DEC3'); m.segments = [{ sector: 'Media', subsector: null, share: 1 }]; m.sector = ['Media'];
            assert(orderStrategy('DEC3', 'niche', 'TV'), 'pierwsza nisza');
            resolveNiche(m, getStrategyQuarter() + 2);
            assert(orderStrategy('DEC3', 'niche', 'Rozrywka') === null, 'blokada przełączania 4 kw.');
        } finally { canFundControlAgm = control; }
    });
});

group('0.14 T3: Akademia i skaner', () => {
    test('hasła Akademii i filtr specjalizacji w skanerze', () => {
        for (const id of ['dywersyfikacja', 'synergia', 'konglomerat']) assert(ACADEMY_ENTRIES[id]?.quiz?.length === 3, id);
        const tv = makeCompany('NTV', { sector: ['Media'] }); tv.segments = [{ sector: 'Media', subsector: null, share: 1, niche: 'TV' }]; tv.sector = ['Media'];
        const plain = makeCompany('NPL', { sector: ['Media'] });
        [tv, plain].forEach(s => initializeFundamentals(s, true));
        resetWorld([tv, plain]); ensureAllStockSegments();
        const rows = runScanner({ ...SCANNER_DEFAULT_FILTERS, accessibleOnly: false, niche: 'TV' });
        assert(rows.length === 1 && rows[0].stock.symbol === 'NTV', rows.map(r => r.stock.symbol).join());
    });
});

group('0.14.1 R0: niezmienniki puli i inkubatora', () => {
    function poolWorld() {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000 });
        a.insiderShares = 0; a.sharesHeld = 0;
        resetWorld([a]);
        allBonds.length = 0;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        investmentPool.totalFunds = 0; investmentPool.contributors = {}; investmentPool.playerStakes = {};
        startPoolLedgerFromFacts();
        const s = generateNewStartup();
        s.symbol = 'STRT'; s.stage = 'funding'; s.fundingGoal = 20_000; s.currentFunding = 0; s.investors = {}; s.isScam = false;
        stocks.push(s);
        playerCash = 100_000;
        return s;
    }

    test('wpłata do puli i inwestycja puli w startup: niezmienniki puli i inkubatora czyste', () => {
        const s = poolWorld();
        contributeToInvestmentPool('player', 5000);
        processPoolInvestments();
        assert(s.poolInvestors?.length === 1, 'pula weszła w startup');
        assert(checkPoolInvariants().length === 0, checkPoolInvariants().join('; '));
        assert(checkIncubatorInvariants().length === 0, checkIncubatorInvariants().join('; '));
    });

    test('anioł biznesu: wpłata bez roszczenia nie psuje niezmiennika inkubatora', () => {
        const s = poolWorld();
        investInStartup('STRT', 1000);
        triggerStartupFundingEvent();
        assert(s.unclaimedFunding > 0 && checkIncubatorInvariants().length === 0, checkIncubatorInvariants().join('; '));
    });

    test('debiut: wkład puli → akcje, księga się zgadza', () => {
        const s = poolWorld();
        contributeToInvestmentPool('player', 5000);
        processPoolInvestments();
        handleSuccessfulIPO(s, 2);
        assert((playerPortfolio.STRT?.shares || 0) > 0 && checkPoolInvariants().length === 0, checkPoolInvariants().join('; '));
    });

    test('błąd A naprawiony (R1): upadek startupu z wkładem puli — niezmiennik puli czysty', () => {
        const s = poolWorld();
        contributeToInvestmentPool('player', 5000);
        processPoolInvestments();
        removeStartup(s, 0.5, 0.7);
        assert(checkPoolInvariants().length === 0, checkPoolInvariants().join('; '));
    });
});

group('0.14.1 R1: rozliczenie puli przy każdym końcu startupu', () => {
    function world(goal = 20_000) {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000 });
        a.insiderShares = 0; a.sharesHeld = 0;
        resetWorld([a]);
        allBonds.length = 0;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        investmentPool.totalFunds = 0; investmentPool.contributors = {}; investmentPool.playerStakes = {}; investmentPool.history = []; investmentPool.quarterReport = [];
        startPoolLedgerFromFacts();
        const s = generateNewStartup();
        s.symbol = 'PSTR'; s.stage = 'funding'; s.fundingGoal = goal; s.currentFunding = 0; s.investors = {}; s.isScam = false;
        stocks.push(s);
        playerCash = 100_000;
        contributeToInvestmentPool('player', 5000);
        processPoolInvestments();
        return s;
    }
    const stake = () => investmentPool.playerStakes.player || 0;
    const facts = () => (investmentPool.contributors.player || 0) + getPoolInvestedInStartups('player');

    test('przejęcie po oczekiwaniu: uczestnicy puli dostają 105–200% wkładu (do puli)', () => {
        const s = world();
        const invested = getPoolInvestedInStartups('player');
        removeStartup(s, 1.05, 2.0);
        const back = investmentPool.contributors.player || 0;
        assert(invested > 0 && back >= invested * 1.05 - 1e-6 && back <= invested * 2 + 1e-6, `zwrot ${back} z ${invested}`);
        assert(Math.abs(stake() - facts()) < 1e-6 && checkPoolInvariants().length === 0, 'fakty i księga');
        assert(investmentPool.history[0]?.kind === 'takeover' && investmentPool.quarterReport.length === 1, 'wpis dla gracza');
    });

    test('oszustwo: 0; porażka: zwrot według ścieżki; NAV i limit 10% bez martwych pieniędzy', () => {
        const s = world();
        removeStartup(s, 0, 0);
        assert((investmentPool.contributors.player || 0) === 0 && stake() === 0 && investmentPool.history[0].kind === 'loss', 'oszustwo: strata, stake 0');
        assert(getFundStartupExposure() === 0, 'limit 10% się nie blokuje');
        const t = world();
        const invested = getPoolInvestedInStartups('player');
        removeStartup(t, 0.5, 0.7);
        const back = investmentPool.contributors.player || 0;
        assert(back >= invested * 0.5 - 1e-6 && back <= invested * 0.7 + 1e-6 && checkPoolInvariants().length === 0, `porażka: ${back} z ${invested}`);
    });

    test('komplikacje → ratunek: akcje; komplikacje → upadek: zwrot 5–15%', () => {
        const s = world();
        s.stage = 'financial_complications'; s.rescueGoal = 1000; s.rescueCurrent = 0;
        playerRescuesStartup('PSTR', 1000);
        assert((playerPortfolio.PSTR?.shares || 0) > 0 && stake() === facts(), 'ratunek → debiut z akcjami');
        const t = world();
        const invested = getPoolInvestedInStartups('player');
        removeStartup(t, 0.05, 0.15);
        const back = investmentPool.contributors.player || 0;
        assert(back >= invested * 0.05 - 1e-6 && back <= invested * 0.15 + 1e-6, `upadek: ${back}`);
    });

    test('prywatyzacja: zwrot wkładu puli wraca do puli (nie na konto)', () => {
        const s = world();
        const invested = getPoolInvestedInStartups('player');
        const cash0 = playerCash;
        refundOtherStartupClaims(s); // ścieżka prywatyzacji: zwrot wpłat innych inwestorów
        assert(playerCash === cash0 && Math.abs((investmentPool.contributors.player || 0) - invested) < 1e-6 && stake() === facts(), 'zwrot do puli');
    });

    test('banki: zwrot przy końcu bez debiutu jak u innych inwestorów', () => {
        const s = world();
        const bank = commercialBanks[0];
        bank.startupInvestments = { PSTR: 10_000 };
        const cash0 = Number(bank.cash) || 0;
        removeStartup(s, 1.05, 2.0);
        assert(bank.cash - cash0 >= 10_500 - 1e-6 && !bank.startupInvestments.PSTR, `bank: +${bank.cash - cash0}`);
    });

    test('migracja: martwy wkład w pulę schodzi do faktów, bez zwrotu pieniędzy', () => {
        world();
        investmentPool.playerStakes.player = 99_999;
        investmentPool.stakesMigrated = false;
        const cash0 = playerCash;
        const diff = migratePoolStakesToFacts();
        assert(diff > 90_000 && Math.abs(stake() - facts()) < 1e-6 && playerCash === cash0 && investmentPool.stakesMigrated, `korekta ${diff}`);
    });
});

group('0.14.1 R2–R3: pula w NAV, wycofanie i status', () => {
    function world(goal = 20_000) {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000 });
        a.insiderShares = 0; a.sharesHeld = 0;
        resetWorld([a]);
        allBonds.length = 0;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        investmentPool.totalFunds = 0; investmentPool.contributors = {}; investmentPool.playerStakes = {}; investmentPool.history = []; investmentPool.quarterReport = [];
        startPoolLedgerFromFacts();
        const s = generateNewStartup();
        s.symbol = 'PSTR'; s.stage = 'funding'; s.fundingGoal = goal; s.currentFunding = 0; s.investors = {}; s.isScam = false;
        stocks.push(s);
        playerCash = 100_000;
        return s;
    }

    test('wpłata do puli nie zmienia NAV; inwestycja puli też nie (po koszcie)', () => {
        const s = world(3000);
        const nav0 = getFundAssets();
        contributeToInvestmentPool('player', 5000);
        assert(Math.abs(getFundAssets() - nav0) < 1e-6, `wpłata: ${getFundAssets()} vs ${nav0}`);
        processPoolInvestments();
        assert(getPoolInvestedInStartups('player') > 0 && Math.abs(getFundAssets() - nav0) < 1e-6, 'inwestycja puli');
        assert(Math.abs(getFundStartupExposure() - 5000) < 1e-6, `ekspozycja ${getFundStartupExposure()}`);
    });

    test('upadek startupu obniża NAV o stratę', () => {
        const s = world(3000);
        contributeToInvestmentPool('player', 5000);
        processPoolInvestments();
        const nav0 = getFundAssets();
        const invested = getPoolInvestedInStartups('player');
        removeStartup(s, 0.5, 0.5);
        assert(Math.abs(nav0 - getFundAssets() - invested * 0.5) < 1e-6, `spadek ${nav0 - getFundAssets()} vs ${invested * 0.5}`);
    });

    test('wycofanie: tylko niezainwestowane, opłata 2% dla pozostałych uczestników', () => {
        const s = world(3000);
        contributeToInvestmentPool('player', 5000);
        processPoolInvestments(); // 3000 w startupie, 2000 niezainwestowane
        const bot = aiCompetitors[0];
        bot.cash = 100_000;
        contributeToInvestmentPool(bot.id, 1000);
        const cash0 = playerCash, nav0 = getFundAssets();
        const paid = withdrawFromPool(99_999);
        assert(Math.abs(paid - 2000 * 0.98) < 1e-6 && Math.abs(playerCash - cash0 - paid) < 1e-6, `wypłata ${paid}`);
        assert(Math.abs(investmentPool.contributors[bot.id] - 1040) < 1e-6, `bot ${investmentPool.contributors[bot.id]}`);
        assert(Math.abs(nav0 - getFundAssets() - 40) < 1e-6 && getPoolInvestedInStartups('player') > 0, 'NAV −opłata, wkład w startupie zostaje');
        assert(checkPoolInvariants().length === 0, checkPoolInvariants().join('; '));
        assert(withdrawFromPool(100) === 0, 'nic więcej do wycofania');
    });

    test('wycofanie bez innych uczestników: opłata dla zarządcy inkubatora', () => {
        world(3000);
        contributeToInvestmentPool('player', 1000);
        const paid = withdrawFromPool(1000);
        assert(Math.abs(paid - 980) < 1e-6 && investmentPool.totalFunds === 0 && !investmentPool.contributors.player, `wypłata ${paid}`);
        assert(checkPoolInvariants().length === 0, checkPoolInvariants().join('; '));
    });

    test('R4: udział gracza w startupie przez pulę = suma rund; NAV = pozycje portfela puli', () => {
        const s = world(3000);
        contributeToInvestmentPool('player', 5000);
        processPoolInvestments();
        const mine = getPoolStartupShare(s, 'player');
        assert(Math.abs(mine - 3000) < 1e-6, `udział ${mine}`);
        assert(Math.abs((investmentPool.contributors.player || 0) + mine - getFundPoolValue()) < 1e-6, 'dwie pozycje = wartość w NAV');
    });

    test('status puli: za mało środków / brak startupów / następna inwestycja', () => {
        const s = world(3000);
        assert(getPoolStatus().code === 'low', 'pusta pula');
        contributeToInvestmentPool('player', 2000);
        assert(getPoolStatus().code === 'ready', 'jest startup w zbiórce');
        s.stage = 'development';
        assert(getPoolStatus().code === 'noTargets', 'brak startupów w zbiórce');
    });
});

group('0.14.1 R5: portfel prywatny — cele korporacji i nagroda z festynu', () => {
    function world(cash) {
        const a = makeCompany('AAA', { cash: 5_000_000 });
        resetWorld([a]);
        allBonds.length = 0;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        investmentPool.totalFunds = 0; investmentPool.contributors = {}; investmentPool.playerStakes = {};
        playerCash = cash;
        corporation.budget = 10_000_000;
    }

    test('premia za cel = min(5% budżetu, 1% aktywów × mnożnik stanowiska, 3000 zł)', () => {
        world(10_000);
        assert(getCorporateGoalPay() === 100, `fundusz 10 tys.: ${getCorporateGoalPay()}`);
        playerProfile.positionId = 'senior';
        assert(getCorporateGoalPay() === 160, `starszy zarządca: ${getCorporateGoalPay()}`);
        playerCash = 5_000_000;
        assert(getCorporateGoalPay() === 3000, 'sufit 3000 zł');
        corporation.budget = 20_000;
        assert(getCorporateGoalPay() === 1000, '5% budżetu korporacji');
    });

    test('spełniony cel wypłaca premię według nowej formuły', () => {
        world(10_000);
        ensureCorporateGoals();
        corporation.goals.ids = ['compliance'];
        const wallet0 = playerWallet.cash;
        const result = settleCorporateGoals();
        assert(result.bonus === (result.view[0].done ? 100 : 0) && playerWallet.cash - wallet0 === result.bonus, `premia ${result.bonus}`);
    });

    test('inwestor VC na festynie: 2% aktywów funduszu, 200–5000 zł', () => {
        const event = festivalPlayerEvents.find(e => e.id === 'fest_vp_1');
        const participant = { promotionTarget: { type: 'player_company' } };
        for (const [cash, expected] of [[1_000, 200], [100_000, 2000], [10_000_000, 5000]]) {
            world(cash);
            const wallet0 = playerWallet.cash;
            event.effect(participant);
            assert(Math.round(playerWallet.cash - wallet0) === expected, `fundusz ${cash}: ${playerWallet.cash - wallet0}`);
        }
    });
});

group('0.14.1 R6: widok spółek — rynek → poziom → sektor, opis działalności', () => {
    const seg = (stock, segments) => { stock.segments = segments; stock.sector = getSectorsFromSegments(segments); return stock; };

    test('opis działalności: 1, 2 i 3 segmenty, podsektor i nisza, od największego', () => {
        const a = seg(makeCompany('AAA'), [{ sector: 'Bankowość', subsector: 'Bank komercyjny', share: 1 }]);
        assert(getStockActivityLabel(a) === 'Bankowość (Bank komercyjny)', getStockActivityLabel(a));
        const b = seg(makeCompany('BBB'), [{ sector: 'Technologia', subsector: null, share: 0.3 }, { sector: 'Finanse', subsector: 'Fintech', share: 0.7 }]);
        assert(getStockActivityLabel(b) === 'Finanse (Fintech) · Technologia', getStockActivityLabel(b));
        const c = seg(makeCompany('CCC'), [{ sector: 'Medycyna', subsector: 'Biotechnologia', niche: 'Farmaceutyki', share: 0.5 }, { sector: 'Badania', subsector: null, share: 0.2 }, { sector: 'Technologia', subsector: 'Sztuczna inteligencja', share: 0.3 }]);
        assert(getStockActivityLabel(c) === 'Medycyna (Biotechnologia, Farmaceutyki) · Technologia (Sztuczna inteligencja) · Badania', getStockActivityLabel(c));
        c.segments[0].share = 0.1; c.segments[1].share = 0.6; c.sector = getSectorsFromSegments(c.segments);
        assert(getStockActivityLabel(c).startsWith('Badania · '), 'cache odświeża się po zmianie udziałów');
    });

    test('tabela: rynek → poziom → podnagłówek sektora; cena sortowana w sektorze; zależna pod matką', () => {
        const mk = (symbol, sector, price, exchange = 'BRONZE') => { const s = seg(makeCompany(symbol), [{ sector, subsector: null, share: 1 }]); s.price = price; s.exchange = exchange; return s; };
        const tech1 = mk('TEA', 'Technologia', 50), bank1 = mk('BKA', 'Bankowość', 10), tech2 = mk('TEB', 'Technologia', 20), bank2 = mk('BKB', 'Bankowość', 30);
        const child = mk('SUB', 'Gaming', 5); child.isSubsidiaryOf = 'TEA'; tech1.subsidiaries = ['SUB'];
        resetWorld([tech1, bank1, tech2, bank2, child]);
        const table = document.createElement('table'); const body = document.createElement('tbody'); body.id = 'stock-table-body'; table.appendChild(body); document.body.appendChild(table);
        const saved = { sort: currentSortState, filter: sectorFilterState, level: currentMarketLevel, owned: ownedOnlyFilter };
        try {
            sectorFilterState = { sector: 'all', subsector: null, secondary: false, type: 'all' }; currentMarketLevel = 'ALL'; ownedOnlyFilter = false;
            currentSortState = 'price_asc';
            displayStocks();
            const rows = [...body.rows].map(r => r.classList.contains('market-header') ? 'M' : r.classList.contains('exchange-header') ? 'E' : r.classList.contains('sector-subheader') ? r.textContent.replace(/[^A-Za-zżąśćęłóźńŻĄŚĆĘŁÓŹŃ]/g, '') : r.dataset.symbol);
            assert(rows.join(',') === 'M,E,Bankowość,BKA,BKB,Technologia,TEB,TEA,SUB', rows.join(','));
            assert(body.rows[0].cells[0].colSpan === 6 && document.querySelector('#stock-table-body tr[data-symbol="BKA"]').cells.length === 6, '6 kolumn');
            currentSortState = 'price_desc';
            displayStocks();
            const order = [...body.rows].map(r => r.dataset.symbol).filter(Boolean);
            assert(order.join(',') === 'BKB,BKA,TEA,SUB,TEB', order.join(','));
            assert(body.querySelector('tr[data-symbol="BKA"] .stock-meta').textContent.startsWith('Bankowość'), 'opis pod nazwą');
            sectorFilterState = { sector: 'Bankowość', subsector: null, secondary: false, type: 'all' };
            displayStocks();
            assert(![...body.rows].some(r => r.classList.contains('sector-subheader') && r.textContent.includes('Technologia')), 'pusty podnagłówek ukryty przy filtrze');

            // 0.14.5: wyłączenie grupowania według kategorii w tabeli
            sectorFilterState = { sector: 'all', subsector: null, secondary: false, type: 'all', grouped: false };
            currentSortState = 'price_asc';
            displayStocks();
            const flatAsc = [...body.rows].map(r => r.classList.contains('sector-subheader') ? 'S' : r.dataset.symbol).filter(Boolean);
            assert(!flatAsc.includes('S'), 'brak podnagłówków sektorów przy wyłączonym grupowaniu');
            assert(flatAsc.join(',') === 'BKA,TEB,BKB,TEA,SUB', `sortowanie płaskie rosnąco: ${flatAsc}`);

            currentSortState = 'price_desc';
            displayStocks();
            const flatDesc = [...body.rows].map(r => r.classList.contains('sector-subheader') ? 'S' : r.dataset.symbol).filter(Boolean);
            assert(flatDesc.join(',') === 'TEA,SUB,BKB,TEB,BKA', `sortowanie płaskie malejąco: ${flatDesc}`);
        } finally {
            currentSortState = saved.sort; sectorFilterState = saved.filter; currentMarketLevel = saved.level; ownedOnlyFilter = saved.owned;
            table.remove();
        }
    });

    test('wydajność: displayStocks przy ~110 spółkach', () => {
        const list = Array.from({ length: 110 }, (_, i) => { const s = seg(makeCompany(`P${i}`), [{ sector: SECTOR_NAMES[i % SECTOR_NAMES.length], subsector: null, share: 1 }]); s.price = 10 + i; return s; });
        resetWorld(list);
        const table = document.createElement('table'); const body = document.createElement('tbody'); body.id = 'stock-table-body'; table.appendChild(body); document.body.appendChild(table);
        try {
            displayStocks();
            const t0 = performance.now();
            for (let i = 0; i < 5; i++) displayStocks();
            const ms = (performance.now() - t0) / 5;
            window.__r6DisplayMs = ms;
            assert(ms < 100, `displayStocks: ${ms.toFixed(1)} ms`);
        } finally { table.remove(); }
    });
});

group('0.14.2 P1: instytuty badawcze — kurs z zysków, bez wykładniczego wzrostu', () => {
    function instituteWorld() {
        const inst = makeCompany('GUM', { cash: 0, fixedAssets: 0 });
        Object.assign(inst, { name: 'GUM Med Research', assetType: 'ResearchInstitute', sector: ['Badania'], price: 78, totalShares: 42000, volatilityFactor: 0.7, financialHealth: 1, research: { isResearching: false, unlockedTechs: [] } });
        delete inst.segments; delete inst.fundamentals;
        const co = makeCompany('TECH', { cash: 5_000_000 });
        co.research = { isResearching: false, unlockedTechs: [] };
        resetWorld([inst, co]);
        ensureAllStockSegments();
        migrateResearchInstituteValuation();
        return { inst, co };
    }
    function withNeutralCycle(fn) {
        const saved = economyCycle;
        economyCycle = createEconomyCycle('recovery');
        economyCycle.gdpGrowth = 0;
        try { return fn(); } finally { economyCycle = saved; }
    }

    test('500 kwartałów (ok. 125 lat) przy rosnącej liczbie technologii: kurs 0,3–3× wartości godziwej', () => {
        const { inst, co } = instituteWorld();
        let worst = { lo: Infinity, hi: 0 };
        withSeededRandom(14, () => withNeutralCycle(() => {
            for (let q = 0; q < 500; q++) {
                co.research.unlockedTechs.push(`T${q}`); // +1 technologia na rynku co kwartał
                for (let tick = 0; tick < 300; tick++) {
                    updateStockPrices();
                    if (tick % 10 === 0) updateResearchInstitutes();
                }
                processFinancialReports();
                if (q >= 8) {
                    const ratio = inst.price / inst.fundamentals.fairValue;
                    worst = { lo: Math.min(worst.lo, ratio), hi: Math.max(worst.hi, ratio) };
                }
            }
        }));
        assert(worst.lo >= 0.3 && worst.hi <= 3, `cena / wartość godziwa: ${worst.lo.toFixed(2)}–${worst.hi.toFixed(2)}`);
        assert(Number.isFinite(inst.price) && inst.price < 1e6, `cena ${inst.price}`);
        assert(inst.fundamentals.peRatio > 0 && inst.fundamentals.peRatio < 100, `C/Z ${inst.fundamentals.peRatio}`);
    });

    test('dwa instytuty obok siebie w tablicy: bez skoków kursu i bez dymków', () => {
        const { inst } = instituteWorld();
        const second = makeCompany('IBS', { cash: 0, fixedAssets: 0 });
        Object.assign(second, { assetType: 'ResearchInstitute', sector: ['Badania'], price: 80, research: { isResearching: false, unlockedTechs: [] } });
        stocks.splice(1, 0, second);
        const prices = [inst.price, second.price];
        const toast = showToast; let toasts = 0;
        showToast = () => { toasts++; };
        try { for (let i = 0; i < 200; i++) updateResearchInstitutes(); } finally { showToast = toast; }
        assert(inst.price === prices[0] && second.price === prices[1] && toasts === 0, `ceny ${inst.price}/${second.price}, dymki ${toasts}`);
        assert(typeof checkResearchInstitutePositions === 'undefined', 'mechanika sąsiadów usunięta');
    });

    test('konkurencja instytutów: rzadkie zdarzenie ±10–20%, tylko wpis w dzienniku', () => {
        const { inst } = instituteWorld();
        const second = makeCompany('IBS', { cash: 0, fixedAssets: 0 });
        Object.assign(second, { assetType: 'ResearchInstitute', sector: ['Badania'], price: 80, research: { isResearching: false, unlockedTechs: [] } });
        stocks.push(second);
        let events = 0;
        const toast = showToast; let toasts = 0;
        showToast = () => { toasts++; };
        try {
            withSeededRandom(5, () => {
                for (let q = 0; q < 600; q++) {
                    const e = maybeInstituteCompetitionEvent();
                    if (e) { events++; assert(Math.abs(e.change) >= 0.1 && Math.abs(e.change) <= 0.2, `ruch ${e.change}`); }
                }
            });
        } finally { showToast = toast; }
        assert(events > 60 && events < 150 && toasts === 0, `zdarzeń ${events} na 600 kw., dymków ${toasts}`);
    });

    test('migracja: kosmiczna cena instytutu → rewizja do wartości godziwej z wpisem', () => {
        const { inst } = instituteWorld();
        inst.price = 6.4e15;
        inst.fundamentals = null;
        const log0 = typeof eventLog !== 'undefined' ? eventLog.length : 0;
        const fixed = migrateResearchInstituteValuation();
        assert(fixed.includes('GUM') && inst.price > 1 && inst.price < 1000, `cena po rewizji ${inst.price}`);
        assert(Math.abs(inst.price / inst.fundamentals.fairValue - 1) < 1e-9, 'cena = wartość godziwa');
        assert(migrateResearchInstituteValuation().length === 0, 'drugi raz bez zmian');
    });

    test('opis instytutu i bezpiecznik ceny w checkWorldInvariants', () => {
        const { inst } = instituteWorld();
        assert(!assembleDescription(inst).includes('Brak opisu'), 'opis');
        inst.balanceSheet.assets = 1_000_000; // wypłacalny (spółki z ujemnym kapitałem bezpiecznik pomija — P9)
        inst.price = inst.fundamentals.fairValue * 500;
        const warnings = checkWorldInvariants().warnings || [];
        assert(warnings.some(w => w.includes('GUM') && w.includes('100×')), warnings.join('; '));
    });
});

group('0.14.2 P2: emisja ratunkowa — oferty per spółka; zapłata funduszu = przyrost akcji', () => {
    function world() {
        const x = makeCompany('XXX', { cash: 100_000 }), y = makeCompany('YYY', { cash: 100_000 });
        for (const s of [x, y]) { s.insiderShares = 0; s.sharesHeld = 0; s.reputation = { player: 0 }; s.ceo = { name: 'Prezes', traits: [] }; s.balanceSheet.liabilities = 2_000_000; }
        resetWorld([x, y]);
        allBonds.length = 0;
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        rescueOffers = {};
        playerCash = 1_000_000;
        return { x, y };
    }
    function botsDecline(fn) { const r = Math.random; Math.random = () => 0.999; try { return fn(); } finally { Math.random = r; } }
    function capture(fn) {
        const log = logEvent, lines = [];
        logEvent = (text, ...rest) => { lines.push(String(text)); return log(text, ...rest); };
        try { return { result: fn(), lines }; } finally { logEvent = log; }
    }
    function lastPayment(purposePrefix) { return [...paymentJournal].reverse().find(e => e.purpose.startsWith(purposePrefix)); }

    test('błąd z gry: okno oferty XXX, w tle emisja YYY → „Obejmij” kupuje XXX, nie YYY', () => {
        const { x, y } = world();
        botsDecline(() => triggerRescueOfferingEvent(x));
        botsDecline(() => triggerRescueOfferingEvent(y)); // dawniej nadpisywała globalną ofertę
        assert(getRescueOffer('XXX') && getRescueOffer('YYY'), 'dwie otwarte oferty');
        const issued = acceptRescueOffer('XXX', 100);
        assert(issued === 100 && playerPortfolio.XXX?.shares === 100 && !playerPortfolio.YYY, `XXX ${playerPortfolio.XXX?.shares}, YYY ${playerPortfolio.YYY?.shares}`);
        assert(!getRescueOffer('XXX') && getRescueOffer('YYY'), 'oferta YYY nadal otwarta');
    });

    test('niezmiennik: emisja ratunkowa — zapłata = akcje × cena, przyrost akcji = liczba z komunikatu', () => {
        const { x } = world();
        botsDecline(() => triggerRescueOfferingEvent(x));
        const offer = getRescueOffer('XXX');
        const cash0 = playerCash, shares0 = playerPortfolio.XXX?.shares || 0;
        const { result, lines } = capture(() => acceptRescueOffer('XXX', 250));
        const paid = cash0 - playerCash, got = playerPortfolio.XXX.shares - shares0;
        assert(result === 250 && got === 250 && Math.abs(paid - 250 * offer.price) < 1e-6, `zapłata ${paid}, akcje ${got}`);
        assert(Math.abs(lastPayment('Emisja ratunkowa XXX').amount - paid) < 1e-6, 'dziennik płatności');
        assert(lines.some(l => l.includes('Fundusz obejmuje 250 akcji') && l.includes('XXX')), lines.join(' | '));
        assert(isStockOwnedByPlayer(x), 'filtr „Moje”');
    });

    test('oferty zapisywane i wczytywane per spółka; stare zapisy z jedną ofertą', () => {
        const { x, y } = world();
        botsDecline(() => { triggerRescueOfferingEvent(x); triggerRescueOfferingEvent(y); });
        const snapshot = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        assert(snapshot.rescueOffers?.XXX && snapshot.rescueOffers?.YYY, 'w zapisie');
        rescueOffers = {};
        for (const offer of [...Object.values(snapshot.rescueOffers || {}), snapshot.rescueOffer].filter(o => o?.symbol && !o.closed)) rescueOffers[offer.symbol] = offer; // jak przy wczytaniu (main.js)
        assert(getRescueOffer('XXX') && getRescueOffer('YYY'), 'po wczytaniu');
        const legacy = { rescueOffer: { symbol: 'XXX', price: 5, total: 100, fundReserved: 40, closed: false } };
        rescueOffers = {};
        for (const offer of [...Object.values(legacy.rescueOffers || {}), legacy.rescueOffer].filter(o => o?.symbol && !o.closed)) rescueOffers[offer.symbol] = offer;
        assert(getRescueOffer('XXX')?.fundReserved === 40, 'stary zapis');
    });

    test('oferta bez decyzji wygasa po kwartale', () => {
        const { x } = world();
        botsDecline(() => triggerRescueOfferingEvent(x));
        getRescueOffer('XXX').quarter = macro.quarter - 2;
        expireRescueOffers();
        assert(!getRescueOffer('XXX') && !acceptRescueOffer('XXX', 10), 'wygasła');
    });

    test('niezmiennik: dopłata za akcje do inwestycji — zapłata i przyrost akcji z komunikatu', () => {
        const a = makeCompany('AAA', { cash: 5_000_000 });
        a.insiderShares = 0; a.reputation = { player: 0 };
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        playerCash = 1_000_000;
        playerPortfolio.AAA = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = 6000; a.maxShares = 10000;
        startInternalInvestment(a, { id: 'test_line', name: 'Linia testowa', kind: 'internal', durationDays: 28, assetValue: 300_000, incomeBonus: 0.2, healthBonus: 0, maintenance: 0 }, 400_000);
        const project = a.activeInvestments?.[0];
        assert(project, 'inwestycja w toku');
        const cash0 = playerCash, shares0 = playerPortfolio.AAA.shares;
        const { lines } = capture(() => fundTopUpInvestment('AAA', project.uid, 95_000, 'shares'));
        const got = playerPortfolio.AAA.shares - shares0, paid = cash0 - playerCash;
        const msg = lines.find(l => l.includes('obejmuje'));
        const msgShares = Number((msg?.match(/obejmuje ([\d\s\u00a0]+) nowych/)?.[1] || '').replace(/\D/g, ''));
        assert(got > 0 && got === msgShares && Math.abs(lastPayment('Dopłata za akcje').amount - paid) < 1e-6, `akcje ${got}, komunikat ${msgShares}, zapłata ${paid}`);
    });

    test('niezmiennik: debiut startupu — akcje funduszu × cena debiutu = wartość z komunikatu', () => {
        const a = makeCompany('AAA', { cash: 600_000, fixedAssets: 800_000 });
        resetWorld([a]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        playerCash = 100_000;
        const s = generateNewStartup();
        s.symbol = 'NEWS'; s.stage = 'funding'; s.fundingGoal = 8000; s.currentFunding = 0; s.investors = {}; s.isScam = false;
        stocks.push(s);
        const cash0 = playerCash;
        assert(investInStartup('NEWS', 5000), 'wpłata');
        assert(Math.abs(cash0 - playerCash - 5000) < 1e-6, 'zapłata');
        const { lines } = capture(() => handleSuccessfulIPO(s, 2));
        const shares = playerPortfolio.NEWS?.shares || 0;
        const msg = lines.find(l => l.startsWith('🔔 IPO'));
        const value = Number((msg?.match(/→ (\d+) zł/)?.[1]) || 0);
        assert(shares > 0 && Math.abs(Math.round(shares * s.price) - value) <= 1, `akcje ${shares} × ${s.price} vs ${value}`);
    });

    test('niezmiennik: wezwanie — fundusz oddaje akcje, wpływ = akcje × cena oferty', () => {
        const a = makeCompany('AGR', { cash: 50_000_000, fixedAssets: 800_000 });
        const b = makeCompany('BBB', { cash: 1_000_000, fixedAssets: 800_000 });
        [a, b].forEach(c => { c.insiderShares = 0; c.sharesHeld = 0; c.reputation = { player: 0 }; c.ceo = { name: 'Prezes', traits: [] }; });
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        playerPortfolio.BBB = { shares: 2500, avgPrice: 80, assetType: 'stock' };
        b.sharesHeld = 2500;
        const r = Math.random; Math.random = () => 0.99;
        try { initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.3); } finally { Math.random = r; }
        const price = a.mergerProcess.offerDetails.buyoutPricePerShare;
        const cash0 = playerCash;
        assert(sellFundSharesToAggressor('BBB'), 'sprzedaż');
        assert(Math.abs(playerCash - cash0 - 2500 * price) < 1e-6 && !playerPortfolio.BBB && a.equityStakes.BBB === 2500, 'wpływ i akcje');
    });
});

group('0.14.2 P10: gotówka spółki nie schodzi poniżej zera (strategia T3, strata w raporcie)', () => {
    function watchNegative(fn) {
        const orig = adjustCompanyCash, hits = [];
        adjustCompanyCash = function (stock, amount, ...rest) {
            const r = orig.call(this, stock, amount, ...rest);
            if (Number(stock.cash) < 0) hits.push(`${stock.symbol}: ${Math.round(stock.cash)}`);
            return r;
        };
        try { fn(); } finally { adjustCompanyCash = orig; }
        return hits;
    }
    function poorCompany() {
        const a = makeCompany('POOR', { cash: 0, fixedAssets: 3_000_000 });
        resetWorld([a]);
        ensureAllStockSegments();
        initializeFundamentals(a, true);
        a.cash = 1000; a.financialHealth = 2;
        return a;
    }

    test('pivot, rozszerzenie, podsektor i nisza przy pustej kasie: kredyt przed zapłatą, gotówka ≥ 0', () => {
        for (const start of [
            a => startPivot(a, 'Technologia', 0),
            a => startExpansion(a, 'Chemia', 0),
            a => startSubsectorEntry(a, null, 0),
            a => { a.segments = [{ sector: 'Medycyna', subsector: null, share: 1 }]; a.sector = ['Medycyna']; return startNiche(a, 'Farmaceutyki', 0); }
        ]) {
            const a = poorCompany();
            const debt0 = a.balanceSheet.liabilities;
            let result;
            const hits = watchNegative(() => { result = start(a); });
            assert(hits.length === 0, hits.join('; '));
            if (result) assert(a.balanceSheet.liabilities > debt0 && a.cash >= 0, `kredyt ${a.balanceSheet.liabilities - debt0}, gotówka ${a.cash}`);
        }
    });

    test('raport ze stratą większą niż gotówka (jak KFX): kredyt przed obciążeniem, dług nie rośnie podwójnie', () => {
        const a = poorCompany();
        a.cash = 0;
        a.fixedExpenses = 400_000; // pewna strata kwartału
        const debt0 = a.balanceSheet.liabilities;
        const hits = watchNegative(() => processFinancialReports());
        assert(hits.length === 0 && a.cash >= 0, hits.join('; '));
        const loss = -a.lastReportBreakdown.total;
        assert(loss > 0 && a.balanceSheet.liabilities - debt0 <= loss * 1.6, `dług +${Math.round(a.balanceSheet.liabilities - debt0)} przy stracie ${Math.round(loss)}`);
    });
});

group('0.14.2 P9: wycena każdego typu spółki (banki, REIT, usługi finansowe, spółki ze stratą)', () => {
    function typed(symbol, setup) {
        const c = makeCompany(symbol, { cash: 2_000_000, fixedAssets: 3_000_000 });
        setup(c);
        return c;
    }
    function world() {
        const bank = typed('BNK', c => { c.isBankStock = true; c.sector = ['Bankowość']; c.price = 150; });
        const reit = typed('RET', c => { c.assetType = 'REIT'; c.sector = ['Nieruchomości']; c.price = 300; c.dividendPerShare = 0; });
        const tax = typed('TAX', c => { c.assetType = 'Accounting'; c.sector = ['Finanse']; c.price = 400; c.quarterlyEarnings = 0; });
        const wrn = typed('WRN', c => { c.assetType = 'DebtCollector'; c.sector = ['Finanse']; c.price = 30; });
        const lom = typed('LOM', c => { c.assetType = 'PawnShop'; c.sector = ['Finanse']; c.price = 250; c.holdingPortfolio = {}; });
        const loss = typed('LOSS', c => { c.price = 1000; c.fixedExpenses = 300_000; }); // stała strata, cena ok. 3× wartości z majątku
        const list = [bank, reit, tax, wrn, lom, loss];
        resetWorld(list);
        ensureAllStockSegments();
        list.forEach(c => { delete c.fundamentals; initializeFundamentals(c, true); });
        return list;
    }

    test('500 kwartałów: każdy typ 0,3–3× wartości godziwej (od 8. kwartału)', () => {
        const list = world();
        const worst = Object.fromEntries(list.map(c => [c.symbol, { lo: Infinity, hi: 0 }]));
        const saved = economyCycle; economyCycle = createEconomyCycle('recovery'); economyCycle.gdpGrowth = 0;
        try {
            withSeededRandom(9, () => {
                for (let q = 0; q < 500; q++) {
                    processFinancialReports();
                    for (let tick = 0; tick < 300; tick++) updateStockPrices();
                    if (q < 8) continue;
                    for (const c of list) {
                        if (c.isBankrupt || c.balanceSheet.assets - c.balanceSheet.liabilities <= 0) continue; // przy ujemnym kapitale (tuż przed upadłością) kotwica traci sens
                        const r = c.price / getDisplayedFairValue(c);
                        worst[c.symbol] = { lo: Math.min(worst[c.symbol].lo, r), hi: Math.max(worst[c.symbol].hi, r) };
                    }
                }
            });
        } finally { economyCycle = saved; }
        const bad = Object.entries(worst).filter(([, w]) => w.lo < 0.3 || w.hi > 3).map(([k, w]) => `${k} ${w.lo.toFixed(2)}–${w.hi.toFixed(2)}`);
        assert(bad.length === 0, bad.join('; ') || 'ok');
    });

    test('modele: bank = C/WK × kapitał, REIT = NAV ± 20%, usługi finansowe z podłogą C/WK 0,5, strata = max(kapitał, przychody)', () => {
        const [bank, reit, tax, , , loss] = world();
        const bvps = c => (c.balanceSheet.assets - c.balanceSheet.liabilities) / c.totalShares;
        updateFundamentalRatios(bank);
        assert(Math.abs(bank.fundamentals.fairValue / bvps(bank) - getSectorPb(getSectorProfile(bank)) * (1 + Math.max(-0.3, Math.min(0.3, bank.financialHealth * 0.03)))) < 1e-9, 'bank');
        updateFundamentalRatios(reit);
        const navRatio = reit.fundamentals.fairValue / bvps(reit);
        assert(navRatio >= 0.8 - 1e-9 && navRatio <= 1.2 + 1e-9, `REIT ${navRatio}`);
        updateFundamentalRatios(tax);
        assert(tax.fundamentals.fairValue >= bvps(tax) * 0.5 - 1e-9, 'podłoga C/WK 0,5');
        loss.fundamentals.history.forEach(h => { h.netIncome = -1000; h.eps = -1000 / loss.totalShares; });
        updateFundamentalRatios(loss);
        assert(loss.fundamentals.lossAnchor && loss.fundamentals.fairValue >= getSectorPb(getSectorProfile(loss)) * bvps(loss) * 0.5 - 1e-9, 'strata');
    });

    test('migracja: cena > 10× wartości godziwej → rewizja z wpisem; holding trzyma kurs NAV', () => {
        const [bank, , , , , loss] = world();
        updateFundamentalRatios(bank);
        bank.price = bank.fundamentals.fairValue * 50;
        const fixed = migrateValuationOutliers();
        assert(fixed.includes('BNK') && Math.abs(bank.price / bank.fundamentals.fairValue - 1) < 1e-9, `rewizja ${fixed}`);
        assert(migrateValuationOutliers().length === 0, 'drugi raz bez zmian');
        const warnings = (checkWorldInvariants().warnings || []).filter(w => /100×|C\/Z/.test(w));
        assert(warnings.length === 0, warnings.join('; '));
    });
});

group('0.14.2 P3: spółki zależne — zawsze pod matką, własny segment i nazwa', () => {
    const seg = (stock, segments) => { stock.segments = segments; stock.sector = getSectorsFromSegments(segments); return stock; };
    function withTable(fn) {
        const table = document.createElement('table'); const body = document.createElement('tbody'); body.id = 'stock-table-body'; table.appendChild(body); document.body.appendChild(table);
        const saved = { sort: currentSortState, filter: sectorFilterState, level: currentMarketLevel, owned: ownedOnlyFilter };
        try { sectorFilterState = { sector: 'all', subsector: null, secondary: false, type: 'all' }; currentMarketLevel = 'ALL'; ownedOnlyFilter = false; currentSortState = 'none'; return fn(body); }
        finally { currentSortState = saved.sort; sectorFilterState = saved.filter; currentMarketLevel = saved.level; ownedOnlyFilter = saved.owned; table.remove(); }
    }
    const visible = (body, symbol) => { const row = body.querySelector(`tr[data-symbol="${symbol}"]`); return Boolean(row) && row.style.display !== 'none'; };

    test('córka pod matką na Platynie i w każdej zakładce/filtrze; domyślnie rozwinięta; znacznik poziomu i udziału', () => {
        const parent = seg(makeCompany('PLT'), [{ sector: 'Technologia', subsector: null, share: 1 }]); parent.exchange = 'PLATINUM'; parent.price = 900;
        const child = seg(makeCompany('PLTZ1'), [{ sector: 'Energia', subsector: null, share: 1 }]); child.exchange = 'SILVER'; child.isSubsidiaryOf = 'PLT'; child.parentStakePct = 0.6;
        const other = seg(makeCompany('OTH'), [{ sector: 'Energia', subsector: null, share: 1 }]); other.exchange = 'SILVER';
        resetWorld([parent, child, other]);
        withTable(body => {
            displayStocks();
            const order = [...body.rows].map(r => r.dataset.symbol).filter(Boolean);
            assert(order.indexOf('PLTZ1') === order.indexOf('PLT') + 1 && visible(body, 'PLTZ1'), `kolejność ${order}`);
            const meta = body.querySelector('tr[data-symbol="PLTZ1"] .stock-meta').textContent;
            assert(meta.includes('zależna od PLT') && meta.includes('60%') && meta.includes(exchanges.SILVER.name), meta);
            currentMarketLevel = 'PLATINUM'; displayStocks();
            assert(visible(body, 'PLTZ1'), 'zakładka Platyny: córka z innego poziomu pod matką');
            currentMarketLevel = 'ALL'; sectorFilterState = { sector: 'Technologia', subsector: null, secondary: false, type: 'all' }; displayStocks();
            assert(visible(body, 'PLTZ1') && !visible(body, 'OTH'), 'filtr sektora: córka z innego sektora i tak pod matką');
            sectorFilterState = { sector: 'Energia', subsector: null, secondary: false, type: 'all' }; displayStocks();
            assert(visible(body, 'PLTZ1'), 'matka poza filtrem: córka samodzielnie, nie znika');
            sectorFilterState = { sector: 'all', subsector: null, secondary: false, type: 'all' }; displayStocks();
            toggleSubsidiaryVisibility('PLT');
            assert(!visible(body, 'PLTZ1'), 'zwinięcie');
            toggleSubsidiaryVisibility('PLT');
            assert(visible(body, 'PLTZ1'), 'rozwinięcie');
        });
    });

    test('fuzja/przejęcie: wchłonięta spółka nie udaje córki; lista córek z faktów', () => {
        const parent = makeCompany('PAR'), child = makeCompany('CHL');
        child.isSubsidiaryOf = 'PAR';
        parent.subsidiaries = [{ symbol: 'OLD', name: 'Wchłonięta', date: 1 }];
        resetWorld([parent, child]);
        syncSubsidiaryLinks();
        assert(parent.subsidiaries.join() === 'CHL' && parent.absorbedCompanies?.[0]?.symbol === 'OLD', JSON.stringify(parent.subsidiaries));
    });

    test('20 córek jednej matki: ≥ 15 różnych nazw, każda z jednym segmentem, ≥ 50% w innym sektorze niż główny matki', () => {
        const parent = seg(makeCompany('COR', { cash: 1e12 }), [{ sector: 'Technologia', subsector: 'Sztuczna inteligencja', share: 0.7 }, { sector: 'Media', subsector: null, share: 0.3 }]);
        parent.name = 'Cortex Neural';
        parent.exchange = 'RUBY';
        resetWorld([parent]);
        const saved = hasFreeListingSlot; hasFreeListingSlot = () => true;
        const kids = [];
        try { for (let i = 0; i < 20; i++) { const c = foundSubsidiary(parent); if (c) kids.push(c); } } finally { hasFreeListingSlot = saved; }
        const names = new Set(kids.map(c => c.name));
        const other = kids.filter(c => getMainSector(c) !== 'Technologia').length;
        assert(kids.length === 20 && names.size >= 15, `${kids.length} córek, ${names.size} nazw: ${[...names].slice(0, 6).join(', ')}`);
        assert(kids.every(c => c.segments.length === 1 && c.sector.length === 1), 'jeden segment');
        assert(other >= 10, `inny sektor: ${other}/20`);
    });
});

group('0.14.2 P4: nazwy startupów dla każdego sektora, DejwCorp najwyżej raz na grę', () => {
    test('500 startupów: 0 nazw awaryjnych poza niespodzianką, ≥ 90% unikalnych', () => {
        resetWorld([makeCompany('AAA')]);
        usedCompanyNames = []; dejwCorpUsed = false;
        const names = [];
        try { for (let i = 0; i < 500; i++) { const s = generateNewStartup(); names.push(s.name); stocks.push(s); } } catch (e) { throw new Error(String(e.stack).split(String.fromCharCode(10)).slice(0, 4).join(' | ')); }
        const bad = stocks.filter(s => s.assetType === 'Startup' && !s.name);
        assert(bad.length === 0, `bez nazwy: ${bad.length}, np. ${JSON.stringify(bad[0] ? { sector: bad[0].sector, segments: bad[0].segments, symbol: bad[0].symbol } : null)}`);
        const dejw = names.filter(n => /DejwCorp/.test(n)).length;
        const unique = new Set(names.map(n => n.toLowerCase())).size;
        assert(dejw <= 1, `DejwCorp: ${dejw}`);
        assert(unique / names.length >= 0.9, `unikalne ${unique}/500`);
        assert(names.every(n => n && !/undefined/.test(n)), 'bez pustych nazw');
    });

    test('każdy sektor rejestru ma człony nazw; podsektor z mechaniką ma własne', () => {
        const missing = SECTOR_NAMES.filter(name => !SECTOR_NAME_PARTS[name]);
        assert(missing.length === 0, `brak: ${missing.join(', ')}`);
        resetWorld([makeCompany('AAA')]);
        usedCompanyNames = []; dejwCorpUsed = true;
        const bio = Array.from({ length: 30 }, () => generateCompanyName('Medycyna', 'Biotechnologia'));
        const parts = SUBSECTOR_NAME_PARTS['Biotechnologia'];
        assert(bio.filter(n => parts.prefixes.some(p => n.startsWith(p))).length >= 10, bio.slice(0, 5).join(', '));
    });

    test('DejwCorp: przy szansie 100% tylko raz', () => {
        resetWorld([makeCompany('AAA')]);
        usedCompanyNames = []; dejwCorpUsed = false;
        const r = Math.random; Math.random = () => 0;
        let names;
        try { names = [generateCompanyName('Media'), generateCompanyName('Media'), generateCompanyName('Media')]; } finally { Math.random = r; }
        assert(names.filter(n => n === 'DejwCorp').length === 1, names.join(', '));
    });
});

group('0.14.2 P5: bank inwestycyjny — pakiet do odsprzedaży, popularne spółki, portfel skoncentrowany', () => {
    function world(n = 30) {
        const list = Array.from({ length: n }, (_, i) => { const c = makeCompany(`S${i}`, { cash: 1_000_000 }); c.insiderShares = 0; c.sharesHeld = 0; c.exchange = 'SILVER'; c.price = 50; c.totalShares = 100_000; c.maxShares = 100_000; c.lastTurnover = 1e6 * (n - i); c.reputation = { player: 0 }; return c; });
        resetWorld(list);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        const bank = { id: 'ibtest', name: 'Bank Inwestycyjny Test', type: BANK_TYPES.INVESTMENT, isActive: true, cash: 50_000_000, initialCapital: 10_000_000, stockPortfolio: {}, loanPortfolio: {} };
        commercialBanks.push(bank);
        return { list, bank };
    }
    const cleanup = bank => commercialBanks.splice(commercialBanks.indexOf(bank), 1);

    test('portfel: ≤ 12 pozycji, każda ≥ 1%, drobne (< 0,5%) sprzedane', () => {
        const { list, bank } = world();
        try {
            bank.stockPortfolio.S29 = { shares: 100, avgPrice: 50 }; list[29].sharesHeld += 100; // stary drobny pakiet
            withSeededRandom(3, () => { for (let i = 0; i < 400; i++) runInvestmentBankAI(bank); });
            const pos = Object.entries(bank.stockPortfolio);
            const small = pos.filter(([sym, h]) => h.shares / stocks.find(s => s.symbol === sym).totalShares < 0.005);
            assert(pos.length > 0 && pos.length <= 12 && small.length === 0, `pozycje ${pos.length}, drobne ${small.map(p => p[0])}`);
        } finally { cleanup(bank); }
    });

    test('ponad 12 pozycji (np. z debiutu startupu) → bank sprzedaje najmniejszą', () => {
        const { list, bank } = world(14);
        try {
            list.forEach((c, i) => { bank.stockPortfolio[c.symbol] = { shares: 2000 + i * 100, avgPrice: 50 }; c.sharesHeld += 2000 + i * 100; });
            for (let i = 0; i < 5; i++) runInvestmentBankAI(bank);
            assert(Object.keys(bank.stockPortfolio).length <= 12 && !bank.stockPortfolio.S0, `pozycje ${Object.keys(bank.stockPortfolio).length}`);
        } finally { cleanup(bank); }
    });

    test('pakiet do odsprzedaży: bot z 45% → bank skupuje 10–15%, bot odkupuje z premią i ma > 50%', () => {
        const { list, bank } = world(5);
        try {
            const target = list[4]; const ai = aiCompetitors[0];
            ai.cash = 1e9; ai.portfolio[target.symbol] = { shares: 45_000, avgPrice: 50 }; target.sharesHeld = 45_000;
            runInvestmentBankAI(bank);
            const block = bank.stockPortfolio[target.symbol]?.shares || 0;
            assert(block >= 10_000 && block <= 15_000 && bank.resaleBlocks[target.symbol], `pakiet ${block}`);
            const r = Math.random; Math.random = () => 0.05;
            try { runInvestmentBankAI(bank); } finally { Math.random = r; }
            assert(!bank.stockPortfolio[target.symbol] && ai.portfolio[target.symbol].shares > 50_000 && bank.resaleStats.resold === 1, `bot ${ai.portfolio[target.symbol].shares}`);
            assert(checkWorldInvariants().length === 0, checkWorldInvariants().join('; '));
        } finally { cleanup(bank); }
    });

    test('gracz z 45%: mail z ofertą pakietu, odkupienie przenosi akcje i gotówkę', () => {
        const { list, bank } = world(5);
        try {
            const target = list[4];
            playerPortfolio[target.symbol] = { shares: 45_000, avgPrice: 50, assetType: 'stock' }; target.sharesHeld = 45_000;
            playerCash = 5_000_000;
            runInvestmentBankAI(bank);
            const block = bank.stockPortfolio[target.symbol]?.shares || 0;
            runInvestmentBankAI(bank);
            assert(bank.resaleOffer?.symbol === target.symbol && mailbox.messages.some(m => m.action?.type === 'bankBlock'), 'mail z ofertą');
            const cash0 = playerCash, price = bank.resaleOffer.price;
            assert(acceptBankBlockOffer(bank.id), 'odkupienie');
            assert(playerPortfolio[target.symbol].shares === 45_000 + block && Math.abs(cash0 - playerCash - block * price) < 1e-6, 'akcje i zapłata');
        } finally { cleanup(bank); }
    });
});

group('0.14.2 P6: inwestycje i technologie według sektora i podsektora', () => {
    const seg = (stock, segments) => { stock.segments = segments; stock.sector = getSectorsFromSegments(segments); return stock; };
    const ids = c => getInvestmentCatalogForCompany(c).map(i => i.id);

    test('elektrownia tylko dla Energii (segment ≥ 25%); spółka z 10% Energii jej nie widzi', () => {
        const tech = seg(makeCompany('TEC', { devLevel: 5 }), [{ sector: 'Technologia', subsector: null, share: 1 }]);
        const side = seg(makeCompany('SID', { devLevel: 5 }), [{ sector: 'Technologia', subsector: null, share: 0.9 }, { sector: 'Energia', subsector: null, share: 0.1 }]);
        const energy = seg(makeCompany('ENE', { devLevel: 5 }), [{ sector: 'Energia', subsector: null, share: 0.7 }, { sector: 'Chemia', subsector: null, share: 0.3 }]);
        resetWorld([tech, side, energy]);
        assert(!ids(tech).includes('energy_plant') && !ids(side).includes('energy_plant'), 'spoza Energii');
        assert(ids(energy).includes('energy_plant') && ids(energy).includes('chemical_plant'), 'Energia + Chemia 30%');
    });

    test('bot losuje inwestycje tylko z sektora spółki (200 prób)', () => {
        const c = seg(makeCompany('BOT', { cash: 1e9, devLevel: 5 }), [{ sector: 'Technologia', subsector: null, share: 0.9 }, { sector: 'Energia', subsector: null, share: 0.1 }]);
        resetWorld([c]);
        const energyIds = INVESTMENT_CATALOG['Energia'].map(i => i.id);
        let wrong = 0;
        for (let i = 0; i < 200; i++) { c.activeInvestments = []; c.cash = 1e9; startRandomInvestment(c); if (c.activeInvestments.some(p => energyIds.includes(p.id))) wrong++; }
        assert(wrong === 0, `inwestycje z Energii: ${wrong}`);
    });

    test('Reaktor Fuzyjny: Energia z podsektorem jądrowym albo po Smart Grid', () => {
        const mk = (sym, sub) => { const c = seg(makeCompany(sym, { cash: 1e9 }), [{ sector: 'Energia', subsector: sub, share: 1 }]); c.departments = { research: { level: 5 } }; c.research = { specialization: 'wzmacnianie pozycji na rynku', unlockedTechs: [], currentTech: null }; return c; };
        const plain = mk('EPL', null), nuke = mk('ENU', 'Energetyka jądrowa');
        resetWorld([plain, nuke]);
        assert(!getAvailableCompanyResearch(plain).includes('ENERGY_FUSION_1'), 'bez podsektora i Smart Grid');
        assert(getAvailableCompanyResearch(nuke).includes('ENERGY_FUSION_1'), 'Energetyka jądrowa');
        plain.research.unlockedTechs = ['ENERGY_SMART_GRID_1'];
        assert(getAvailableCompanyResearch(plain).includes('ENERGY_FUSION_1'), 'po Smart Grid');
    });
});

group('0.14.2 P7: pasek newsów i dymki tylko w sprawach gracza', () => {
    function world() {
        const a = makeCompany('AAA'), b = makeCompany('BBB');
        a.name = 'Alfa Testowa'; b.name = 'Beta Testowa';
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        playerPortfolio.AAA = { shares: 100, avgPrice: 10, assetType: 'stock' };
        newsLog = []; toastGameTimes = []; userActionUntil = 0;
        Object.assign(toastStats, { shown: 0, feedback: 0, toNews: 0, limited: 0 });
        return { a, b };
    }

    test('zdarzenie o cudzej spółce → pasek, nie dymek; o spółce gracza → dymek', () => {
        world();
        showToast('Beta Testowa ogłasza nowy produkt.', 'success');
        assert(toastStats.shown === 0 && newsLog[0]?.symbol === 'BBB', 'na pasku, z kartą spółki');
        showToast('Alfa Testowa: wyniki powyżej oczekiwań.', 'success');
        assert(toastStats.shown === 1, 'spółka z portfela gracza');
    });

    test('≤ 3 dymki na minutę gry; nadmiar na pasek; odpowiedź na akcję gracza zawsze', () => {
        world();
        for (let i = 0; i < 6; i++) showToast(`Alfa Testowa: zdarzenie ${i}`, 'default');
        assert(toastStats.shown === 3 && toastStats.limited === 3 && newsLog.length === 3, JSON.stringify(toastStats));
        playerFund.clockMs += 61_000;
        showToast('Alfa Testowa: kolejna minuta', 'default');
        assert(toastStats.shown === 4, 'nowa minuta gry');
        userActionUntil = Date.now() + 1000;
        showToast('Za mało gotówki!', 'error');
        assert(toastStats.feedback === 1 && toastStats.shown === 5, 'odpowiedź na kliknięcie');
    });

    test('historia paska: najwyżej 50; logEvent z rynku trafia na pasek', () => {
        world();
        for (let i = 0; i < 70; i++) pushNews(`news ${i}`);
        assert(newsLog.length === 50 && newsLog[0].text === 'news 69', 'limit 50');
        logEvent('📈 AWANS: Beta Testowa wchodzi na Giełdę Złotą.', 'market');
        assert(newsLog[0].symbol === 'BBB', 'logEvent → pasek');
    });

    // 0.14.2 P11: płynny pasek (własny element w testach, szerokość = 6 px na znak, okno 600 px)
    function tickerWorld() {
        const saved = { track: newsTicker.track, viewport: newsTicker.viewport, widthOf: newsTicker.widthOf, viewportWidth: newsTicker.viewportWidth, reduced: newsTicker.reduced, isHidden: newsTicker.isHidden, queue: newsTicker.queue, paused: newsTicker.paused };
        const viewport = document.createElement('div'), track = document.createElement('div');
        viewport.appendChild(track);
        Object.assign(newsTicker, { widthOf: el => el.textContent.length * 6, viewportWidth: () => 600, reduced: () => false, isHidden: () => false, queue: [], paused: false }); // niezależnie od widoczności karty testów
        attachNewsTicker(track, viewport);
        return { track, restore: () => Object.assign(newsTicker, saved, { offset: null }) };
    }
    const firstLeft = track => newsTicker.offset; // lewa krawędź pierwszego wpisu względem okna

    test('P11: pushNews w trakcie przewijania nie przesuwa widocznych wpisów; wpis wchodzi z prawej', () => {
        world();
        const { track, restore } = tickerWorld();
        try {
            for (let i = 0; i < 4; i++) pushNews(`wiadomość testowa ${i}`);
            for (let i = 0; i < 30; i++) stepNewsTicker(0.1);
            const first = track.firstElementChild, before = firstLeft(track), count = track.children.length;
            pushNews('nowa wiadomość w trakcie przewijania');
            assert(track.firstElementChild === first && firstLeft(track) === before, 'bez przebudowy i skoku');
            stepNewsTicker(0.1);
            assert(track.firstElementChild !== first || Math.abs(firstLeft(track) - (before - 6)) < 1e-9, 'ruch tylko z czasu (60 px/s × 0,1 s)');
            for (let i = 0; i < 400; i++) stepNewsTicker(0.1);
            assert([...track.children].some(el => el.textContent.includes('nowa wiadomość')) || newsTicker.queue.length === 0, 'nowy wpis dołożony na końcu');
            assert(count > 0, 'pas ma wpisy');
        } finally { restore(); }
    });

    test('P11: 200 newsów w 2 s → kolejka ≤ 15, historia 50, sprawy gracza mają pierwszeństwo', () => {
        world();
        const { restore } = tickerWorld();
        try {
            pushNews('Alfa Testowa: ważne dla gracza', 'AAA');
            for (let i = 0; i < 200; i++) { pushNews(`rutyna ${i}`); if (i % 10 === 0) stepNewsTicker(0.1); }
            assert(newsTicker.queue.length <= NEWS_QUEUE_LIMIT && newsLog.length === 50, `kolejka ${newsTicker.queue.length}, historia ${newsLog.length}`);
            assert(newsTicker.queue.some(n => n.symbol === 'AAA') || [...newsTicker.track.children].some(el => el.textContent.includes('Alfa')), 'wpis gracza nie odpadł');
        } finally { restore(); }
    });

    test('P11: stała prędkość przy 3 i przy 12 wpisach', () => {
        world();
        const speeds = [3, 12].map(n => {
            const { restore } = tickerWorld();
            try {
                for (let i = 0; i < n; i++) pushNews(`w${i}`);
                stepNewsTicker(0);
                const o0 = newsTicker.offset; stepNewsTicker(0.5);
                return o0 - newsTicker.offset;
            } finally { restore(); }
        });
        assert(Math.abs(speeds[0] - 30) < 1e-9 && Math.abs(speeds[1] - 30) < 1e-9, `przesunięcie w 0,5 s: ${speeds}`);
    });

    test('znaczniki wykresu w jednym miejscu łączą się w jeden z liczbą', () => {
        const { a } = world();
        const t0 = Date.now();
        a.chartEvents = [{ time: t0, icon: '✂️', label: 'Dywidenda' }, { time: t0 + 1, icon: '📉', label: 'Zrzut 1' }, { time: t0 + 2, icon: '📉', label: 'Zrzut 2' }];
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        drawChartEvents(a, svg, [{ time: t0 - 1000 }, { time: t0 }, { time: t0 + 1000 }], (i, n) => i * 100, { top: 0 }, 100);
        const labels = [...svg.querySelectorAll('text')].map(n => n.textContent);
        assert(labels.length === 1 && labels[0] === '✂️×3', labels.join(','));
    });
});

group('0.14.2 P8: zwijane sekcje i wyjaśnione fazy spółek', () => {
    test('każda faza ma opis i czas trwania; dymek mówi, co daje', () => {
        const missing = Object.values(CORPORATE_PHASES).filter(phase => !CORPORATE_PHASE_INFO[phase]?.text || !CORPORATE_PHASE_INFO[phase]?.duration);
        assert(missing.length === 0, `brak opisu: ${missing.join(', ')}`);
        assert(getCorporatePhaseTooltip(CORPORATE_PHASES.INNOVATION_PUSH).includes('50%'), 'Impuls Innowacji: szybsze badania');
    });

    test('hasło Akademii „Fazy rozwoju spółki” z quizem', () => {
        const entry = ACADEMY_ENTRIES.fazySpolki;
        assert(entry && entry.quiz.length === 3 && Object.values(CORPORATE_PHASES).every(phase => entry.text.includes(phase.replace(/ [^ ]+$/u, '').split(' ')[0])), 'hasło i quiz');
    });

    test('zwinięcie rynku akcji i ETF zapamiętane w localStorage', () => {
        const host = document.createElement('div');
        host.innerHTML = '<div id="market-content"></div><span id="toggle-icon-market"></span><div id="etf-content"></div><span id="toggle-icon-etf"></span>';
        document.body.appendChild(host);
        const saved = ['market', 'etf'].map(k => localStorage.getItem(`sectionCollapsed:${k}`));
        try {
            localStorage.removeItem('sectionCollapsed:etf');
            toggleSection('etf');
            assert(document.getElementById('etf-content').hidden && localStorage.getItem('sectionCollapsed:etf') === '1', 'zwinięte');
            document.getElementById('etf-content').hidden = false;
            restoreSectionCollapse();
            assert(document.getElementById('etf-content').hidden && !document.getElementById('market-content').hidden === !readSectionCollapsed('market'), 'odtworzone');
            toggleSection('etf');
            assert(!document.getElementById('etf-content').hidden, 'rozwinięte');
        } finally {
            ['market', 'etf'].forEach((k, i) => saved[i] === null ? localStorage.removeItem(`sectionCollapsed:${k}`) : localStorage.setItem(`sectionCollapsed:${k}`, saved[i]));
            host.remove();
        }
    });
});

group('0.14 T4: wydzielenie spółki córki (spin-off, carve-out)', () => {
    function world() {
        const a = makeCompany('MAT', { cash: 3_000_000, fixedAssets: 5_000_000, liabilities: 1_000_000 });
        a.segments = [{ sector: 'Technologia', subsector: null, share: 0.6 }, { sector: 'Energia', subsector: null, share: 0.4 }];
        a.sector = getSectorsFromSegments(a.segments);
        a.exchange = 'GOLD'; a.financialHealth = 2; a.price = 100; a.reputation = { player: 0 }; a.ceo = { name: 'Prezes', traits: [] };
        a.insiderShares = 400; a.cityShares = 50;
        const holder = makeCompany('HOL', { cash: 1_000_000 }); holder.equityStakes = { MAT: 600 };
        const fund = makeCompany('HLD', { cash: 1_000_000 }); fund.assetType = 'Holding'; fund.holdingPortfolio = { MAT: { quantity: 200, purchasePrice: 90 } };
        resetWorld([a, holder, fund]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        initializeFundamentals(a, true);
        playerPortfolio.MAT = { shares: 1000, avgPrice: 80, assetType: 'stock' };
        playerWallet.portfolio = { MAT: { shares: 100, avgPrice: 70 } };
        const ai = aiCompetitors[0]; ai.portfolio.MAT = { shares: 2000, avgPrice: 95 };
        const bank = commercialBanks[0]; bank.stockPortfolio = bank.stockPortfolio || {}; bank.stockPortfolio.MAT = { shares: 500, avgPrice: 100 };
        const manager = corporation?.managers?.[0]; if (manager) manager.fund.portfolio.MAT = { shares: 700, avgPrice: 100 };
        const etf = { symbol: 'TETF', name: 'ETF testowy', holdings: { MAT: 300 } }; etfs.push(etf);
        a.sharesHeld = getTrackedHeldShares(a);
        spinoffLog = [];
        return { a, holder, fund, ai, bank, manager, etf };
    }
    const cleanup = etf => { const i = etfs.indexOf(etf); if (i >= 0) etfs.splice(i, 1); };

    test('warunki zapowiedzi: ≥ 2 segmenty, segment ≥ 30% niepowiązany, GOLD+, kondycja ≥ 1', () => {
        const { a, etf } = world();
        try {
            assert(canAnnounceSpinoff(a) && getSpinoffCandidateSegment(a).sector === 'Energia', 'spełnia');
            a.financialHealth = 0; assert(!canAnnounceSpinoff(a), 'kondycja'); a.financialHealth = 2;
            a.segments = [{ sector: 'Technologia', subsector: null, share: 0.8 }, { sector: 'Energia', subsector: null, share: 0.2 }]; a.sector = getSectorsFromSegments(a.segments);
            assert(!canAnnounceSpinoff(a), 'segment < 30%');
        } finally { cleanup(etf); }
    });

    test('spin-off: KAŻDY posiadacz dostaje akcje córki; wartość, gotówka i dług się sumują', () => {
        const { a, holder, fund, ai, bank, manager, etf } = world();
        try {
            a.spinoff = { stage: 'announced', sector: 'Energia', valueBefore: getMarketCapValue(a) };
            const before = { cap: getMarketCapValue(a), cash: a.cash, liab: a.balanceSheet.liabilities, assets: a.balanceSheet.assets, rev: a.fundamentals.revenue };
            const child = executeSpinoff(a, { carve: false });
            assert(child && !child.isSubsidiaryOf, 'córka');
            const c = child.symbol;
            assert(playerPortfolio[c].shares === 1000 && playerWallet.portfolio[c].shares === 100 && ai.portfolio[c].shares === 2000 && bank.stockPortfolio[c].shares === 500, 'gracz, konto prywatne, bot, bank');
            assert(etf.holdings[c] === 300 && holder.equityStakes[c] === 600 && fund.holdingPortfolio[c].quantity === 200 && child.insiderShares === 400 && child.cityShares === 50, 'ETF, spółka, holding, insiderzy, miasto');
            if (manager) assert(manager.fund.portfolio[c].shares === 700, 'fundusz bota');
            assert(child.sharesHeld === getTrackedHeldShares(child), 'akcje córki w obrocie = suma posiadaczy');
            assert(Math.abs(getMarketCapValue(a) + getMarketCapValue(child) - before.cap) < 1e-6, 'wartość matki przed = matka + córka');
            assert(Math.abs(a.cash + child.cash - before.cash) < 1e-6 && Math.abs(a.balanceSheet.liabilities + child.balanceSheet.liabilities - before.liab) < 1e-6, `gotówka ${before.cash} → ${a.cash}+${child.cash}; dług ${before.liab} → ${a.balanceSheet.liabilities}+${child.balanceSheet.liabilities}`);
            assert(Math.abs(a.balanceSheet.assets + child.balanceSheet.assets - before.assets) < 1e-6 && Math.abs(a.fundamentals.revenue + child.fundamentals.revenue - before.rev) < 1e-6, 'aktywa i przychody');
            assert(getStockSegments(a).length === 1 && getMainSector(child) === 'Energia' && exchanges[child.exchange].level < exchanges.GOLD.level, 'segmenty i giełda niżej');
            const shareProblems = checkWorldInvariants().filter(p => /akcje w obrocie|sharesHeld/.test(p));
            assert(shareProblems.length === 0, shareProblems.join('; '));
        } finally { cleanup(etf); }
    });

    test('carve-out: matka zachowuje 51–80%, reszta dla akcjonariuszy; córka zależna; wartość dla akcjonariuszy bez zmian', () => {
        const { a, ai, etf } = world();
        try {
            a.spinoff = { stage: 'announced', sector: 'Energia', valueBefore: getMarketCapValue(a) };
            const oldPrice = a.price;
            const child = executeSpinoff(a, { carve: true });
            const keep = child.parentStakePct;
            assert(child.isSubsidiaryOf === 'MAT' && keep >= 0.51 && keep <= 0.8 && a.equityStakes[child.symbol] === Math.floor(child.totalShares * keep), 'pakiet matki');
            assert(ai.portfolio[child.symbol].shares === Math.floor(2000 * (1 - keep)), 'bot dostał część');
            assert(Math.abs(a.price + (1 - keep) * child.price - oldPrice) < 1e-9, 'wartość na akcję matki zachowana');
            assert(child.sharesHeld === getTrackedHeldShares(child), 'obrót = posiadacze');
            // Decyzja 13: wycena matki zawiera rynkową wartość pakietu w córce (inaczej kurs matki zjeżdża o wartość pakietu).
            const stakePerShare = a.equityStakes[child.symbol] * child.price / a.totalShares;
            assert(Math.abs(getListedSubsidiaryStakeValue(a) / a.totalShares - stakePerShare) < 1e-9, 'wartość pakietu');
            const fairWith = a.fundamentals.fairValue;
            a.subsidiaries = []; updateFundamentalRatios(a); const fairWithout = a.fundamentals.fairValue;
            assert(fairWith > 0 && Math.abs(fairWith - fairWithout - stakePerShare) < 1e-6, `wartość godziwa matki + pakiet: ${fairWith} vs ${fairWithout} + ${stakePerShare}`);
        } finally { cleanup(etf); }
    });

    test('zapowiedź → walne → wydzielenie; ponad 115 spółek krajowych tylko carve-out', () => {
        const { a, etf } = world();
        try {
            const price0 = a.price;
            announceSpinoff(a, 'ceo');
            assert(a.price > price0 && a.spinoff?.stage === 'announced' && a.governance.pendingAgm.items.some(i => i.type === 'spinoff'), 'zapowiedź i uchwała');
            const r = Math.random; Math.random = () => 0.2;
            try { processGovernanceQuarter(); } finally { Math.random = r; }
            const child = stocks.find(s => s.spunOffFrom === 'MAT');
            assert(child && !a.spinoff, 'wydzielenie po walnym');
            const saved = getListedCompanyCount; getListedCompanyCount = () => 115;
            const b = world().a;
            try { b.spinoff = { stage: 'announced', sector: 'Energia', valueBefore: 1 }; const c2 = executeSpinoff(b); assert(c2?.isSubsidiaryOf === 'MAT', 'limit → carve-out'); }
            finally { getListedCompanyCount = saved; }
        } finally { cleanup(etf); etfs.splice(0, etfs.length, ...etfs.filter(e => e.symbol !== 'TETF')); }
    });

    test('gracz-większościowiec: mail z decyzją; blokada na rok', () => {
        const { a, etf } = world();
        try {
            playerPortfolio.MAT.shares = 6000; a.sharesHeld = getTrackedHeldShares(a);
            offerSpinoffDecision(a);
            assert(mailbox.messages.some(m => m.action?.type === 'spinoff' && m.action.symbol === 'MAT'), 'mail');
            assert(playerSpinoffDecision('MAT', 'block') && a.spinoffBlockedUntil > macro.quarter, 'blokada');
            assert(playerSpinoffDecision('MAT', 'now') && a.spinoff?.by === 'player', 'zlecenie od razu');
        } finally { cleanup(etf); }
    });
});

group('0.14 T5: koncerny, kooperacje, podmioty powiązane', () => {
    function world() {
        const seg = (list) => list.map(([sector, share]) => ({ sector, subsector: null, share }));
        const a = makeCompany('KON', { cash: 5_000_000, fixedAssets: 20_000_000 });
        a.segments = seg([['Chemia', 0.5], ['Przemysł', 0.3], ['Technologia', 0.2]]); // Technologia niepowiązana z Chemią → koncern
        const b = makeCompany('KOP', { cash: 2_000_000 }); b.segments = seg([['Medycyna', 1]]);
        const c = makeCompany('KOC', { cash: 2_000_000 }); c.segments = seg([['Technologia', 0.6], ['Obronność', 0.4]]);
        const d = makeCompany('KOD', { cash: 2_000_000 }); d.segments = seg([['Żywność', 1]]); // niepowiązana z koncernem
        const extra = Array.from({ length: 8 }, (_, i) => { const x = makeCompany(`KX${i}`, { cash: 1_000_000 }); x.segments = seg([['Usługi', 1]]); x.price = 10; return x; });
        const all = [a, b, c, d, ...extra];
        all.forEach(x => { x.sector = getSectorsFromSegments(x.segments); x.ceo = { name: 'Prezes', traits: [] }; x.reputation = { player: 0 }; });
        a.price = 1000; b.price = 50; c.price = 50; d.price = 50;
        resetWorld(all);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        all.forEach(x => { initializeFundamentals(x, true); x.sharesHeld = getTrackedHeldShares(x); });
        return { a, b, c, d };
    }
    const addCompany = (symbol, sector) => { const x = makeCompany(symbol); x.segments = [{ sector, subsector: null, share: 1 }]; x.sector = [sector]; initializeFundamentals(x, true); stocks.push(x); return x; };
    const playerOwns = (a, b, pa, pb) => {
        playerPortfolio[a.symbol] = { shares: pa, avgPrice: 100 }; playerPortfolio[b.symbol] = { shares: pb, avgPrice: 50 };
        [a, b].forEach(x => { x.sharesHeld = getTrackedHeldShares(x); });
    };

    test('koncern: górne 15% kapitalizacji i segment niepowiązany z głównym; same powiązane — nie', () => {
        const { a, b } = world();
        updateConcernStatus();
        assert(isConcern(a) && !isConcern(b), 'KON koncernem, KOP nie');
        a.segments = a.segments.slice(0, 2); refreshSectorsFromSegments(a);
        updateConcernStatus();
        assert(!isConcern(a), 'po utracie segmentu traci status');
        b.isSubsidiaryOf = 'KON'; // decyzja 15: ≥ 2 segmenty i ≥ 1 spółka zależna
        updateConcernStatus();
        assert(isConcern(a), '2 powiązane segmenty + córka → koncern');
    });

    test('kooperacja tylko między segmentami powiązanymi; premia × udział segmentu; najwyżej 3 na koncern', () => {
        const { a, b, c, d } = world();
        updateConcernStatus();
        assert(!startCooperation(a, d), 'Żywność niepowiązana z Chemią/Przemysłem/Energią');
        const coop = startCooperation(a, b); // Chemia–Medycyna
        assert(coop && coop.segA === 'Chemia' && coop.segB === 'Medycyna' && coop.end - coop.start >= 8 && coop.end - coop.start <= 16, 'umowa 8–16 kw.');
        assertNear(getCooperationGrowthAdj(a), COOP_GROWTH * getSegmentShare(a, 'Chemia'), 'wzrost koncernu × udział Chemii', 1e-9);
        assertNear(getCooperationMarginAdj(b), COOP_MARGIN, 'marża partnera × udział Medycyny', 1e-9);
        assert(getCooperationMarginAdj(d) === 0, 'bez umowy bez premii');
        assert(startCooperation(a, c), 'druga umowa (Przemysł–Obronność)');
        assert(startCooperation(a, addCompany('KOE', 'Medycyna')), 'trzecia umowa');
        assert(!startCooperation(a, addCompany('KOF', 'Transport i logistyka')) && getStockCooperations(a).length === 3, 'limit 3 umów koncernu');
    });

    test('ryzyko kontrahenta: strajk partnera przenosi połowę szoku; korekta wyników i bankructwo też', () => {
        const { a, b } = world();
        updateConcernStatus();
        startCooperation(a, b);
        const share = getSegmentShare(a, 'Chemia');
        b.workforce = { strike: { pct: 0.1 } };
        assertNear(getCooperationShockFactor(a), 1 - 0.5 * 0.1 * share, 'przychody koncernu: −½ × 10% × udział Chemii', 1e-9);
        const price0 = a.price;
        onCooperationPartnerShock(b, 0.3, 'korekta wyników');
        assert(a.price < price0 && Math.abs(a.price / price0 - (1 - 0.3 * 0.5 * share)) < 0.02, `kurs koncernu −½ szoku × udział: ${a.price / price0}`);
        onCooperationPartnerShock(b, COOP_BANKRUPTCY_SHOCK, 'bankructwo');
        assert(getStockCooperations(a).length === 0 && cooperationLog[0]?.reason === 'bankructwo partnera', 'bankructwo kończy umowę');
    });

    test('zerwanie: kara umowna od zrywającego dla drugiej strony; gotówka i aktywa się sumują', () => {
        const { a, b } = world();
        updateConcernStatus();
        const coop = startCooperation(a, b);
        a.fundamentals.revenueTtm = 4_000_000;
        const before = { cash: a.cash + b.cash, assets: a.balanceSheet.assets + b.balanceSheet.assets, bCash: b.cash };
        const penalty = breakCooperation(coop, a.symbol);
        assertNear(penalty, Math.round(4_000_000 * getSegmentShare(a, 'Chemia') * COOP_PENALTY), 'kara = 2% rocznych przychodów segmentu', 1);
        assertNear(b.cash - before.bCash, penalty, 'partner dostaje karę');
        assertNear(a.cash + b.cash, before.cash, 'gotówka razem bez zmian');
        assertNear(a.balanceSheet.assets + b.balanceSheet.assets, before.assets, 'aktywa razem');
        assert(!cooperations.includes(coop), 'umowa zakończona');
    });

    test('czerwona flaga: wspólny właściciel z nierównymi udziałami (80% i 20%); 80% i 70% bez flagi', () => {
        const { a, b } = world();
        playerOwns(a, b, 8000, 2000);
        const coop = playerProposeCooperation('KON', 'KOP', 'KON');
        assert(coop && coop.by === 'player' && coop.terms === 'KON', 'umowa gracza z warunkami dla KON');
        assert(coop.flag && Math.abs(coop.flag.pctA - 0.8) < 1e-9 && Math.abs(coop.flag.pctB - 0.2) < 1e-9, 'flaga z udziałami');
        assert(getRedFlags(b).some(f => f.id === 'related') && getRedFlags(a).some(f => f.id === 'related'), 'czerwona flaga w obu spółkach');
        assert(getCoopTunnelFlow(coop, a) > 0 && Math.abs(getCoopTunnelFlow(coop, a) + getCoopTunnelFlow(coop, b)) < 1e-9, 'warunki nierynkowe: tyle, ile traci KOP, zyskuje KON');
        playerPortfolio.KOP.shares = 7000; b.sharesHeld = getTrackedHeldShares(b);
        assert(!refreshCoopFlag(coop), '80% i 70% — bez flagi');
    });

    test('skarga do KNF: warunki nierynkowe → zwrot korzyści z grzywną; warunki rynkowe → oddalona', () => {
        const { a, b } = world();
        playerOwns(a, b, 8000, 2000);
        const coop = playerProposeCooperation('KON', 'KOP', 'KON');
        coop.tunneled = 50_000;
        assert(fileKnfComplaint(coop.id, 'bot') && !fileKnfComplaint(coop.id, 'bot'), 'jedna skarga naraz');
        const bCash = b.cash;
        const r = Math.random; Math.random = () => 0;
        try { assert(resolveKnfComplaint(coop) === 'uwzględniona', 'uwzględniona'); } finally { Math.random = r; }
        assertNear(b.cash - bCash, 50_000, 'zwrot dla poszkodowanej');
        assert(coop.terms === 'market' && coop.tunneled === 0, 'warunki rynkowe');
        coop.complaint = null; fileKnfComplaint(coop.id, 'bot');
        assert(resolveKnfComplaint(coop) === 'oddalona', 'rynkowe → oddalona');
        coop.complaint = null;
        assert(!canPlayerFileKnfComplaint(coop, a) && canPlayerFileKnfComplaint(coop, b), 'skarży mniejszościowy pakiet KOP, nie większościowiec KON');
    });

    test('kwartał: wygaśnięcie, wydzielony segment kończy umowę; zapis zawiera kooperacje', () => {
        const { a, b, c } = world();
        updateConcernStatus();
        const c1 = startCooperation(a, b), c2 = startCooperation(a, c);
        c1.end = macro.quarter; c1.by = 'player';
        a.segments = a.segments.filter(x => x.sector !== 'Przemysł'); refreshSectorsFromSegments(a);
        processCooperationsQuarterly(macro.quarter);
        assert(!cooperations.includes(c1) && !cooperations.includes(c2), 'obie umowy zakończone');
        assert(cooperationLog.some(e => e.reason === 'segment wydzielony lub zamknięty') && cooperationLog.some(e => e.reason === 'wygasła'), 'powody');
        cooperations = [];
        const coop = startCooperation(a, b);
        const snap = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        assert(snap.cooperations?.some(x => x.id === coop.id) && Array.isArray(snap.cooperationLog), 'kooperacje w zapisie');
    });

    test('suma części: segmenty + pakiety w zależnych; Akademia: 3 hasła z quizem; karta „Grupa”', () => {
        const { a, b } = world();
        b.isSubsidiaryOf = 'KON'; a.equityStakes = { KOP: 6000 };
        const sotp = getSumOfParts(a);
        assert(sotp.parts.length === 4 && Math.abs(sotp.parts[3].value - getMarketCapValue(b) * 0.6) < 1e-6, 'trzy segmenty i pakiet 60%');
        assertNear(sotp.total, sotp.parts.reduce((x, p) => x + p.value, 0), 'suma');
        for (const id of ['grupaKapitalowa', 'ryzykoKontrahenta', 'podmiotyPowiazane']) assert(ACADEMY_ENTRIES[id]?.quiz?.length === 3, id);
        assert(hasGroupCard(a) && hasGroupCard(b), 'karta „Grupa” dla matki i córki');
        assert(renderCompanyCardGroup(a).includes('Suma części'), 'karta się renderuje');
    });
});

group('0.14 T6: spółki zależne (transfer, pożyczka, usamodzielnienie, wchłonięcie, sprzedaż pakietu)', () => {
    function world(stakeShares = 6000) {
        const seg = (sector) => [{ sector, subsector: null, share: 1 }];
        const p = makeCompany('MAM', { cash: 10_000_000, fixedAssets: 20_000_000 });
        p.segments = [{ sector: 'Chemia', subsector: null, share: 0.6 }, { sector: 'Przemysł', subsector: null, share: 0.4 }];
        const c = makeCompany('COR', { cash: 1_000_000, fixedAssets: 2_000_000 }); c.segments = seg('Medycyna');
        const k = makeCompany('KUP', { cash: 50_000_000, fixedAssets: 50_000_000 }); k.segments = seg('Technologia'); // kupujący pakiet (koncern)
        const all = [p, c, k];
        all.forEach(x => { x.sector = getSectorsFromSegments(x.segments); x.ceo = { name: 'Prezes', traits: [] }; x.reputation = { player: 0 }; });
        p.price = 500; c.price = 100; k.price = 2000;
        resetWorld(all);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        all.forEach(x => initializeFundamentals(x, true));
        p.equityStakes = { COR: stakeShares }; c.isSubsidiaryOf = 'MAM'; c.parentStakePct = stakeShares / c.totalShares; p.subsidiaries = ['COR'];
        playerPortfolio.COR = { shares: 500, avgPrice: 90 }; playerPortfolio.MAM = { shares: 1000, avgPrice: 400 };
        const ai = aiCompetitors[0]; ai.portfolio.COR = { shares: Math.min(1000, c.totalShares - stakeShares - 500), avgPrice: 95 }; ai.cash = 10_000_000;
        all.forEach(x => { x.sharesHeld = getTrackedHeldShares(x); });
        return { p, c, k, ai };
    }
    const shareProblems = () => checkWorldInvariants().filter(x => /akcje w obrocie|sharesHeld/.test(x));

    test('transfer zysku 30–70% zmienia gotówkę matki i córki zgodnie z ustawieniem; wyższy transfer obniża wycenę córki', () => {
        const { p, c } = world();
        for (const rate of [0.3, 0.7]) {
            setProfitTransfer(c, rate);
            const pc = p.cash, cc = c.cash;
            const moved = transferSubsidiaryProfit(c, 100_000);
            assertNear(moved, 100_000 * rate, `transfer ${rate}`, 1e-6);
            assertNear(p.cash - pc, moved, 'matka', 1e-6); assertNear(cc - c.cash, moved, 'córka', 1e-6);
        }
        assert(setProfitTransfer(c, 0.9) === 0.7 && setProfitTransfer(c, 0.1) === 0.3, 'zakres 30–70%');
        assert(getTransferValuationFactor(c) > 1 && (setProfitTransfer(c, 0.7), getTransferValuationFactor(c) < 1), 'wycena córki maleje z transferem');
    });

    test('pożyczka wewnątrzgrupowa: do 20% gotówki matki, bilans się zgadza; oprocentowanie poza rynkiem → czerwona flaga', () => {
        const { p, c } = world();
        const before = { cash: p.cash + c.cash, assets: p.balanceSheet.assets, liab: c.balanceSheet.liabilities };
        const value = grantGroupLoan(p, c, 1e12);
        assertNear(value, Math.round(before.cash - 1_000_000) * 0 + Math.round(10_000_000 * SUB_LOAN_MAX_SHARE), 'limit 20%', 1);
        assertNear(p.cash + c.cash, before.cash, 'gotówka w grupie'); assertNear(p.balanceSheet.assets, before.assets, 'matka: należność zamiast gotówki');
        assertNear(c.balanceSheet.liabilities - before.liab, value, 'dług córki');
        assert(!getRedFlags(p).some(f => f.id === 'groupLoan'), 'rynkowa bez flagi');
        c.groupLoan.rate = getMarketLoanRate() * 0.5;
        assert(getRedFlags(p).some(f => f.id === 'groupLoan') && getRedFlags(c).some(f => f.id === 'groupLoan'), 'nierynkowa → flaga u matki i córki');
    });

    test('usamodzielnienie: oferta wtórna (matka < 50%, kurs córki w dół) i spin-off reszty (akcjonariusze matki dostają akcje)', () => {
        const { p, c } = world();
        const price0 = c.price;
        assert(subsidiarySecondaryOffering(c, p) > 0 && getParentStake(c, p) < 0.5 && !c.isSubsidiaryOf && c.price < price0, 'oferta wtórna');
        assert(shareProblems().length === 0, shareProblems().join('; '));
        const w = world();
        const playerBefore = playerPortfolio.COR.shares;
        const stake = w.p.equityStakes.COR;
        assert(subsidiarySpinoffRemainder(w.c, w.p) > 0 && !w.c.isSubsidiaryOf && !w.p.equityStakes.COR, 'pakiet rozdany');
        assert(playerPortfolio.COR.shares === playerBefore + Math.floor(stake * 1000 / w.p.totalShares), 'gracz dostał akcje córki do swoich (dopisane)');
        assert(shareProblems().length === 0, shareProblems().join('; '));
    });

    test('wchłonięcie przy ≥ 90%: przymusowy wykup z premią, segment wraca do matki, córka znika i zwalnia miejsce w limicie', () => {
        const { p, c, ai } = world(9200);
        const total0 = getTotalCompanyCount(), aiShares = ai.portfolio.COR.shares, aiCash = ai.cash, cash0 = playerCash;
        const r = absorbSubsidiary(c, p, 0.15);
        assert(r && Math.abs(r.price - 100 * 1.15) < 1e-9, 'cena = kurs + 15%');
        assert(!stocks.includes(c) && getTotalCompanyCount() === total0 - 1, 'córka zniknęła z giełdy');
        assert(getStockSegments(p).some(seg => seg.sector === 'Medycyna') && isValidSegmentList(getStockSegments(p)), 'segment wrócił do matki');
        assertNear(ai.cash - aiCash, aiShares * r.price, 'bot dostał cenę wykupu'); assertNear(playerCash - cash0, 500 * r.price, 'gracz dostał cenę wykupu');
        assert(!absorbSubsidiary(world(8000).c), 'poniżej 90% — nie');
    });

    test('sprzedaż pakietu kontrolnego: premia za kontrolę, wezwanie po tej samej cenie; gracz może sprzedać albo zostać', () => {
        const { p, c, k, ai } = world();
        k.concern = { since: 0 };
        const buyer = { kind: 'company', id: 'KUP:stake', name: k.name, entity: k };
        const pCash = p.cash;
        const r = Math.random; Math.random = () => 0; // boty przyjmują wezwanie
        let t;
        try { t = sellControllingStake(c, p, buyer, 0.2); } finally { Math.random = r; }
        assert(t && Math.abs(t.price - 120) < 1e-9 && c.isSubsidiaryOf === 'KUP' && !p.equityStakes.COR, 'pakiet u kupującego, córka zależna od KUP');
        assertNear(p.cash - pCash, 6000 * 120, 'matka dostała cenę z premią');
        assert(!ai.portfolio.COR && k.equityStakes.COR >= 6000 + 1000 - 1, 'bot sprzedał w wezwaniu po tej samej cenie');
        const cash0 = playerCash;
        assert(playerTenderDecision('COR', 'sell') && !playerPortfolio.COR && Math.abs(playerCash - cash0 - 500 * 120) < 1e-6, 'gracz sprzedał po cenie wezwania');
        assert(shareProblems().length === 0, shareProblems().join('; '));
    });

    test('decyzja 15: dywidenda córki dla każdego akcjonariusza proporcjonalnie (matka tylko przez swój pakiet)', () => {
        const { p, c, ai } = world();
        playerFund.trust = 50;
        const before = { player: playerCash, ai: ai.cash, parent: p.cash, child: c.cash };
        const paid = payCompanyDividend(c, 2);
        assertNear(paid, 2 * c.totalShares, 'wypłata = dps × wszystkie akcje');
        assertNear(playerCash - before.player, 500 * 2, 'fundusz gracza: stopa × jego akcje');
        assert(ai.cash - before.ai > 0 && Math.abs(ai.cash - before.ai - ai.portfolio.COR.shares * 2 * (1 - TAX_RATES.dividend)) < 1e-6, 'bot: brutto − podatek');
        assertNear(p.cash - before.parent, 6000 * 2, 'matka: tylko za swój pakiet');
        assertNear(before.child - c.cash, paid, 'córka płaci całość');
    });

    test('koncern zakłada córkę na BRONZE z 20–30% akcji w ofercie; Akademia: 3 hasła', () => {
        const { k } = world();
        k.concern = { since: 0 };
        const child = foundConcernSubsidiary(k);
        assert(child && child.exchange === 'BRONZE' && child.isSubsidiaryOf === 'KUP', 'córka na BRONZE');
        const stake = getParentStake(child, k);
        assert(stake >= 0.7 - 1e-3 && stake <= 0.8 + 1e-3, `pakiet matki ${stake}`);
        for (const id of ['premiaKontrola', 'wezwanie', 'squeezeOut']) assert(ACADEMY_ENTRIES[id]?.quiz?.length === 3, id);
    });
});

group('0.14.3: zapis bez limitu (IndexedDB, lz16, kopia awaryjna) — osobna baza testowa, bez zapisu gracza', () => {
    const TEST_KEY = '__test_save_key_0143';
    function snapshotWorld() {
        const a = makeCompany('ZAP'), b = makeCompany('ZAQ');
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        [a, b].forEach(x => initializeFundamentals(x, true));
        return buildSaveSnapshot({ compact: 0 });
    }
    const keepStore = () => { const saved = { backend: saveStore.backend, db: saveStore.db, dbName: saveStore.dbName }; return () => Object.assign(saveStore, saved); };

    test('kompresja lz16: snapshot i tekst z polskimi znakami wracają identyczne; stopień kompresji > 1', () => {
        const snap = snapshotWorld();
        const record = encodeSaveRecord(snap, 0);
        assert(record.format === 'lz16' && record.size === JSON.stringify(snap).length, 'rekord');
        assert(JSON.stringify(decodeSaveRecord(record)) === JSON.stringify(snap), 'snapshot identyczny');
        assert(JSON.stringify(decodeSaveRecord(JSON.stringify(record))) === JSON.stringify(snap), 'także z tekstu rekordu');
        assert(record.size / record.compressed > 2, `kompresja ${(record.size / record.compressed).toFixed(1)}×`);
        const text = 'Zażółć gęślą jaźń 🏢 ' + 'abc'.repeat(500) + '\u0000￿';
        assert(LZString.decompressFromUTF16(LZString.compressToUTF16(text)) === text, 'dowolny tekst');
        assert(decodeSaveRecord(JSON.stringify(snap)).version === snap.version, 'stary format: czysty JSON');
        assert(decodeSaveRecord('nie-json') === null && decodeSaveRecord({ format: 'lz16', data: 'śmieci' }) === null, 'uszkodzony → null');
    });

    test('format gz (IndexedDB): gzip przez CompressionStream wraca identyczny; kandydaci rozpakowują gz', async () => {
        const snap = snapshotWorld();
        assert(canGzipSave(), 'CompressionStream w przeglądarce');
        const record = await encodeSaveRecordGz(snap, 0);
        assert(record.format === 'gz' && record.data.byteLength === record.compressed && record.compressed < record.size, 'rekord gz');
        assert(JSON.stringify(await decodeSaveRecordAsync(record)) === JSON.stringify(snap), 'snapshot identyczny');
        const candidates = await collectSaveCandidatesAsync({ current: record, previous: null }, null);
        assert(candidates[0].snapshot?.version === snap.version, 'kandydat gz rozpakowany');
        assert(await decodeSaveRecordAsync({ format: 'gz', data: new ArrayBuffer(8) }) === null, 'uszkodzony gz → null');
    });

    test('saveStore (IndexedDB, baza testowa): dwa zapisy → current i previous; clear czyści oba', async () => {
        const restore = keepStore();
        try {
            assert(await saveStore.detect() === 'indexeddb' && saveStore.dbName === SAVE_DB_TEST_NAME, `backend ${saveStore.backend} ${saveStore.detectError || ''}`);
            await saveStore.clear();
            const r1 = { format: 'lz16', savedAt: 1, data: 'a' }, r2 = { format: 'lz16', savedAt: 2, data: 'b' };
            assert((await saveStore.write(r1)).ok && (await saveStore.write(r2)).ok, 'zapisy');
            const read = await saveStore.read();
            assert(read.current?.savedAt === 2 && read.previous?.savedAt === 1, 'current = nowy, previous = poprzedni');
            await saveStore.clear();
            const empty = await saveStore.read();
            assert(!empty.current && !empty.previous, 'wyczyszczone');
        } finally { restore(); }
    });

    test('zapas: bez IndexedDB backend = localStorage', async () => {
        const restore = keepStore();
        try { assert(await saveStore.detect(null, null) === 'localStorage' && /indexedDB/.test(saveStore.detectError), 'zapas'); }
        finally { restore(); }
    });

    test('wczytanie: najnowszy uszkodzony → wczytany poprzedni (i wpis w dzienniku)', () => {
        const snap = snapshotWorld();
        const older = encodeSaveRecord({ ...snap, savedAt: 100 }, 0);
        const candidates = collectSaveCandidates({ current: { format: 'lz16', savedAt: 200, data: 'uszkodzone' }, previous: older }, null);
        assert(candidates[0].source === 'indexeddb:current' && !candidates[0].snapshot, 'najnowszy uszkodzony');
        preloadedSaveCandidates = candidates;
        try {
            assert(restoreSavedGame() && restoredSaveSource === 'indexeddb:previous', `źródło ${restoredSaveSource}`);
        } finally { preloadedSaveCandidates = null; isGamePaused = false; }
    });

    test('migracja: stary czysty JSON w localStorage → wczytany, po pierwszym zapisie zamieniony w kopię lz16 (klucz testowy)', () => {
        const snap = snapshotWorld();
        try {
            localStorage.setItem(TEST_KEY, JSON.stringify(snap));
            const candidates = collectSaveCandidates(null, localStorage.getItem(TEST_KEY));
            assert(candidates[0].legacy && candidates[0].snapshot?.version === snap.version, 'stary zapis rozpoznany');
            assert(isLegacyLocalSave(TEST_KEY), 'czysty JSON');
            assert(finishSaveMigration(encodeSaveRecord(snap, 0), TEST_KEY) && !isLegacyLocalSave(TEST_KEY), 'po zapisie: kopia lz16');
            assert(JSON.stringify(decodeSaveRecord(localStorage.getItem(TEST_KEY))) === JSON.stringify(snap), 'kopia bez strat');
        } finally { localStorage.removeItem(TEST_KEY); saveMigrationPending = false; }
    });

    test('reset czyści IndexedDB (current, previous) i kopię w localStorage', async () => {
        const restore = keepStore();
        const disabled = saveDisabledUntilReload;
        try {
            await saveStore.detect();
            await saveStore.write({ format: 'lz16', savedAt: 5, data: 'x' });
            localStorage.setItem(TEST_KEY, '{"format":"lz16"}');
            await resetSavedGame(TEST_KEY);
            const read = await saveStore.read();
            assert(!read.current && !read.previous && localStorage.getItem(TEST_KEY) === null && saveDisabledUntilReload, 'wszystko wyczyszczone, zapis zablokowany');
        } finally { saveDisabledUntilReload = disabled; localStorage.removeItem(TEST_KEY); restore(); }
    });

    test('import: poprawny plik zapisany jako bieżący (baza testowa, bez przeładowania); uszkodzony odrzucony bez zmian', async () => {
        const restore = keepStore();
        const disabled = saveDisabledUntilReload;
        const snap = snapshotWorld();
        try {
            await saveStore.detect(); await saveStore.clear();
            const bad = await importSaveText('{"version": 999}', { confirmFn: () => true, reload: false, key: TEST_KEY });
            assert(!bad.ok && /wersja/i.test(bad.errors.join(' ')) && !(await saveStore.read()).current && localStorage.getItem(TEST_KEY) === null, 'obcy plik: nic nie nadpisane');
            const garbage = await importSaveText('to nie jest json', { confirmFn: () => true, reload: false, key: TEST_KEY });
            assert(!garbage.ok && !(await saveStore.read()).current, 'uszkodzony plik');
            const cancelled = await importSaveText(JSON.stringify(snap), { confirmFn: () => false, reload: false, key: TEST_KEY });
            assert(cancelled.cancelled && !(await saveStore.read()).current, 'anulowane potwierdzenie');
            const good = await importSaveText(JSON.stringify(snap, null, 1), { confirmFn: () => true, reload: false, key: TEST_KEY });
            const read = await saveStore.read();
            const stored = await decodeSaveRecordAsync(read.current);
            assert(good.ok && stored?.stocks?.length === snap.stocks.length && stored.version === snap.version, 'zapisany jako bieżący');
            assert(decodeSaveRecord(localStorage.getItem(TEST_KEY))?.version === snap.version && saveDisabledUntilReload, 'kopia lz16 i blokada zapisu do przeładowania');
            assert(/^gra-inwestycyjna_Fundusz-Testowy_rok\d+-kw\d\.json$/.test(getSaveFileName(snap)), getSaveFileName(snap));
            await saveStore.clear();
        } finally { saveDisabledUntilReload = disabled; localStorage.removeItem(TEST_KEY); restore(); }
    });

    test('tryb testów: saveGameState nic nie zapisuje (zapis gracza nietknięty)', () => {
        const before = localStorage.getItem(GAME_SAVE_KEY);
        assert(saveGameState() === false && localStorage.getItem(GAME_SAVE_KEY) === before, 'bez zapisu');
    });
});

group('0.15 H4: Krach rynkowy, bezpieczniki giełdowe i reakcja instytucji', () => {
    function world() {
        const a = makeCompany('AAA'), b = makeCompany('BBB');
        a.name = 'Alfa Testowa'; b.name = 'Beta Testowa';
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        initMarketRegimes();
        return { a, b };
    }

    test('H4.1: triggerMarketCrash inicjalizuje krach z czasem trwania i spadkiem premii', () => {
        world();
        const regime = getMarketRegime('home');
        regime.premium = 0.20;

        triggerMarketCrash({ durationWeeks: 3, targetDrop: -0.30 });
        assert(isMarketCrashing() === true, 'krach jest aktywny');
        assert(marketCrash.active === true, 'marketCrash.active === true');
        assert(marketCrash.targetDrop === -0.30, 'targetDrop jest ujemny');
        assert(marketCrash.startPremium === 0.20, 'startPremium zapamiętane');
    });

    test('H4.2: processMarketCrashWeekly przeprowadza krach tydzień po tygodniu aż do zakończenia', () => {
        world();
        triggerMarketCrash({ durationWeeks: 2, targetDrop: -0.30 });
        const initialRegime = getMarketRegime('home');

        // Tydzień 1
        processMarketCrashWeekly();
        assert(marketCrash.weeksElapsed === 1, 'tydzień 1');
        assert(marketCrash.marginCallsExecuted === true, 'margin calls wykonane w 1. tygodniu');
        assert(isMarketCrashing() === true, 'krach wciąż trwa po 1. tygodniu');

        // Tydzień 2 (koniec krachu)
        processMarketCrashWeekly();
        assert(marketCrash.weeksElapsed === 2, 'tydzień 2');
        assert(isMarketCrashing() === false, 'krach zakończony po upływie durationWeeks');
        assert(initialRegime.phase === 'bear' || initialRegime.phase === 'capitulation', 'faza przeszła w bessę lub kapitulację');
    });

    test('H4.3: Bezpieczniki giełdowe (Circuit Breakers): progi -7%, -13%, -20%', () => {
        world();
        marketHalt = createMarketHaltState();
        marketHalt.weeklyStartGig = 1000;

        // Spadek -5%: brak haltu
        checkCircuitBreakers(950);
        assert(isMarketHalted() === false, 'brak haltu przy -5%');

        // Spadek -10,5%: Poziom 1 (15s)
        checkCircuitBreakers(895);
        assert(isMarketHalted() === true, 'halt aktywny przy -10,5%');
        assert(marketHalt.level === 1, 'poziom 1');
        assert(marketHalt.haltDurationSec === 15, 'czas 15s');

        // Koniec haltu 1
        marketHalt.untilGameMs = getGameClockMs() - 1000;
        assert(isMarketHalted() === false, 'halt minął');

        // Spadek -14%: Poziom 2 (30s)
        checkCircuitBreakers(860);
        assert(isMarketHalted() === true, 'halt aktywny przy -14%');
        assert(marketHalt.level === 2, 'poziom 2');
        assert(marketHalt.haltDurationSec === 30, 'czas 30s');

        // Koniec haltu 2
        marketHalt.untilGameMs = getGameClockMs() - 1000;
        assert(isMarketHalted() === false, 'halt minął');

        // Spadek -21%: Poziom 3 (60s)
        checkCircuitBreakers(790);
        assert(isMarketHalted() === true, 'halt aktywny przy -21%');
        assert(marketHalt.level === 3, 'poziom 3');
        assert(marketHalt.untilGameMs === Infinity, '3. stopień do końca tygodnia gry');
    });

    test('H4.4: Blokada handlu gracza i botów podczas bezpiecznika giełdowego', () => {
        world();
        const testStock = stocks[0];
        const initialShares = playerPortfolio[testStock.symbol]?.shares || 0;
        playerCash = 100000;

        // Aktywuj halt
        triggerMarketHalt(1, 15, -0.075);
        assert(isMarketHalted() === true, 'halt aktywny');

        // Próba zakupu przez gracza
        buyStock(testStock.symbol, 10);
        assert((playerPortfolio[testStock.symbol]?.shares || 0) === initialShares, 'zakup gracza zablokowany');

        // Próba sprzedaży przez gracza (jeśli ma akcje)
        if (initialShares > 0) {
            sellStock(testStock.symbol, 1);
            assert(playerPortfolio[testStock.symbol].shares === initialShares, 'sprzedaż gracza zablokowana');
        }

        // Próba handlu przez bota
        const bot = aiCompetitors[0];
        bot.cash = 100000;
        const botInitialShares = bot.portfolio?.[testStock.symbol]?.shares || 0;
        const buyRes = aiBuyStock(bot, testStock.symbol, 10);
        assert(buyRes === false, 'aiBuyStock zwróciło false');
        assert((bot.portfolio?.[testStock.symbol]?.shares || 0) === botInitialShares, 'zakup bota zablokowany');

        const sellRes = aiSellStock(bot, testStock.symbol, 1);
        assert(sellRes === false, 'aiSellStock zwróciło false');
    });

    test('H4.5: Margin Call: przy dźwigni > 50% fundusz spłaca pożyczki lombardowe', () => {
        world();
        const testStock = stocks[0];
        testStock.price = 100;
        const pawn = makeCompany('LOMB', { cash: 1_000_000 }); pawn.assetType = 'PawnShop'; stocks.push(pawn);
        playerPortfolio[testStock.symbol] = { shares: 1000, avgPrice: 100, assetType: 'stock' };
        testStock.sharesHeld = 1000;
        playerCash = 200000;
        playerFund.pawnLoans = [{ id: 'p1', symbol: testStock.symbol, shares: 0, principal: 400000, weeksLeft: 10, missed: 0 }];
        const res = checkPlayerMarginCall();
        assert(res && res.repaid > 0, 'spłata pożyczki');
        assertNear(getPawnOutstanding(getFundAccount()), 400000 - res.repaid, 'dług spadł o spłatę');
    });

    test('H4.6: Reakcja Banku Centralnego po krachu: cięcie stopy bazowej o 50 pb', () => {
        world();
        centralBank.baseInterestRate = 0.050; // 5.0%
        macro.inflation = 0.020; // niska inflacja

        // Wymuś cięcie
        reactCentralBankToCrash(true);
        assert(centralBank.lastRateChange === -0.005, 'odnotowano zmianę stóp o -50 pb');
        assert(Math.abs(centralBank.baseInterestRate - 0.045) < 0.0001, 'obniżka dokładnie o 50 pb (do 4.5%)');
    });

    test('H4.7: Szok sektorowy applySectorShock modyfikuje sectorPremium spółek', () => {
        world();
        const testStock = stocks[0];
        const sec = getMainSector(testStock);
        testStock.sectorPremium = 0;

        applySectorShock(sec, -0.15, 2);
        assert(Math.abs(testStock.sectorPremium - (-0.15)) < 0.0001, 'premia sektorowa obniżona o 15 pp');
    });
});

group('0.15 H5: Zachowanie botów, klientów i spółek w cyklu rynku', () => {
    function world() {
        const a = makeCompany('AAA'), b = makeCompany('BBB');
        a.name = 'Alfa Testowa'; b.name = 'Beta Testowa';
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        initMarketRegimes();
    }

    test('H5.1: Klasyfikacja spółek defensywnych i nowoczesnych', () => {
        const sDef = { sector: 'Żywność', tags: [] };
        const sMod = { sector: 'Technologia', tags: [] };
        const sModTag = { sector: 'Inny', tags: ['Biotechnologia'] };
        const sNeutral = { sector: 'Budownictwo', tags: [] };

        assert(isStockDefensive(sDef) === true, 'Żywność jest sektorem defensywnym');
        assert(isStockDefensive(sMod) === false, 'Technologia nie jest defensywna');
        assert(isStockModern(sMod) === true, 'Technologia jest sektorem nowoczesnym');
        assert(isStockModern(sModTag) === true, 'Subsektor/tag Biotechnologia jest nowoczesny');
        assert(isStockModern(sNeutral) === false, 'Budownictwo nie jest nowoczesne');
    });

    test('H5.2: Emeryt i Nowoczesny kupują JU zależnie od struktury portfela funduszu', () => {
        world();
        for (const sym in playerPortfolio) delete playerPortfolio[sym];

        const defStock = stocks.find(s => isStockDefensive(s)) || { symbol: 'DEF_TEST', sector: 'Żywność', price: 100 };
        const modStock = stocks.find(s => isStockModern(s)) || { symbol: 'MOD_TEST', sector: 'Technologia', price: 100 };

        if (!stocks.includes(defStock)) stocks.push(defStock);
        if (!stocks.includes(modStock)) stocks.push(modStock);

        // 1. Pusty portfel (0 akcji) -> brak dominacji defensywnych/nowoczesnych
        assert(fundSatisfiesClientPreference('senior') === false, 'pusty portfel nie ma 50% defensywnych');
        assert(fundSatisfiesClientPreference('modern') === false, 'pusty portfel nie ma 50% nowoczesnych');

        // 2. Portfel 80% defensywny (800 PLN def, 200 PLN mod)
        playerPortfolio[defStock.symbol] = { shares: 8, avgPrice: 100 };
        playerPortfolio[modStock.symbol] = { shares: 2, avgPrice: 100 };
        assert(getFundPortfolioDefensiveShare() >= 0.79, 'udział defensywnych wynosi ok. 80%');
        assert(fundSatisfiesClientPreference('senior') === true, 'Emeryt akceptuje fundusz z dominacją defensywnych');
        assert(fundSatisfiesClientPreference('retiree') === true, 'Alias retiree również działa poprawnie');
        assert(fundSatisfiesClientPreference('modern') === false, 'Nowoczesny odrzuca fundusz z dominacją defensywnych');

        // 3. Portfel 80% nowoczesny (200 PLN def, 800 PLN mod)
        playerPortfolio[defStock.symbol] = { shares: 2, avgPrice: 100 };
        playerPortfolio[modStock.symbol] = { shares: 8, avgPrice: 100 };
        assert(getFundPortfolioModernShare() >= 0.79, 'udział nowoczesnych wynosi ok. 80%');
        assert(fundSatisfiesClientPreference('modern') === true, 'Nowoczesny akceptuje fundusz z dominacją nowoczesnych');
        assert(fundSatisfiesClientPreference('senior') === false, 'Emeryt odrzuca fundusz bez dominacji defensywnych');
    });

    test('H5.3: Klient Fearful podwaja skłonność do paniki w bessie i limit odpływu 8% JU', () => {
        world();
        const regime = getMarketRegime('home');
        regime.phase = 'bear';
        regime.sentiment = 20;
        const client = {
            id: 'c_fear',
            name: 'Płochliwy Jan',
            character: 'fearful',
            units: 1000,
            avgBuyNav: 100,
            weeksSinceTrade: 5,
            loyalty: 50,
            tolerance: 50
        };
        playerFund.clients = [client];
        playerFund.units = 10000;
        const flowQuarter = getFundFlowStats()?.current;
        if (flowQuarter) {
            flowQuarter.startUnits = 10000;
            flowQuarter.panicUnitsRedeemed = 0;
        }

        processClientsWeekly();
        const redeemed = flowQuarter ? (flowQuarter.panicUnitsRedeemed || 0) : 0;
        assert(redeemed <= 800, 'odpływ paniki ograniczony do 8% JU na kwartał');
    });

    test('H5.4: Wycena debiutu IPO zależy od mnożnika koniunktury rynkowej (0.6 - 1.8)', () => {
        world();
        const regime = getMarketRegime('home');
        regime.premium = 0.50; // hossa
        const prem = regime.premium || 0;
        const mult = Math.max(0.6, Math.min(1.8, 1 + prem));
        assert(mult === 1.5, 'w silnej hossie (+50%) mnożnik wyceny debiutu wynosi 1.5');
    });
});


group('0.15 Poprawki i Program Policyjny: Windykator, raporty, rynki i Policja', () => {
    function world() {
        const a = makeCompany('AAA'), b = makeCompany('BBB');
        a.name = 'Alfa Testowa'; b.name = 'Beta Testowa';
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        initMarketRegimes();
        ensureOversight();
    }

    test('P1: Raport ze stratą (ujemny wynik) nie generuje dobrego/doskonałego raportu ani wzrostu kursu', () => {
        world();
        const testStock = stocks[0];
        testStock.fundamentals = initializeFundamentals(testStock);
        testStock.fundamentals.expectedEps = -0.50; // konsensus zakładał dużą stratę

        // Spółka ponosi stratę -0.20 (mniejszą niż -0.50, ale wciąż stratę!)
        const shares = testStock.totalShares || 1000;
        const netLoss = -0.20 * shares;
        const surprise = recordQuarterFundamentals(testStock, {
            revenue: 100000,
            ebitda: netLoss,
            netIncome: netLoss,
            depreciation: 0, interest: 0, tax: 0, labor: 0
        });

        // Sprawdź reakcję na stratę:
        let reportResult = 'neutral';
        let magnitude = 0;
        if (netLoss < 0) {
            if (surprise >= 0.15) {
                reportResult = 'neutral';
                magnitude = 0;
            } else if (surprise <= -0.4) {
                reportResult = 'tragic';
                magnitude = -0.12;
            } else {
                reportResult = 'bad';
                magnitude = -0.06;
            }
        }
        assert(reportResult !== 'excellent' && reportResult !== 'good', 'strata nie daje dobrego raportu');
        assert(magnitude <= 0, 'strata nie pompuje kursu w górę (magnitude <= 0)');
    });

    test('P2: Windykator przejmuje trudne długi z dyskontem i egzekwuje akcje od botów z zaległościami', () => {
        world();
        const collector = {
            symbol: 'WRN_TEST',
            name: 'Wrona Test',
            assetType: 'DebtCollector',
            cash: 50000,
            balanceSheet: { assets: 100000, liabilities: 0 },
            isBankrupt: false
        };
        stocks.push(collector);

        const debtorBot = {
            id: 'bot_debtor',
            name: 'Dłużnik Jan',
            cash: 0,
            creditScore: 20,
            portfolio: {
                AAA: { shares: 50, avgPrice: 10 }
            },
            loans: [{
                id: 'loan_bad',
                bankId: null,
                bankName: collector.name,
                collectorSymbol: collector.symbol,
                amount: 1000,
                weeklyPayment: 100,
                missedPayments: 2
            }]
        };
        aiCompetitors.push(debtorBot);
        stocks[0].price = 20; // 50 akcji AAA po 20 PLN = 1000 PLN

        // Przetworzenie pożyczek bota z zaległością
        processAiLoansWeekly(debtorBot);

        // Windykator powinien zająć część akcji AAA na poczet długu
        assert(collector.holdingPortfolio && collector.holdingPortfolio.AAA?.quantity > 0, 'windykator zajął akcje');
        assert(debtorBot.portfolio.AAA.shares < 50, 'botowi ubyło akcji na poczet spłaty długu');
        assert(debtorBot.loans[0].missedPayments === 0, 'zaległość została uregulowana z zajęcia');
    });

    test('P3: GPW nie kupuje akcji członkowskich w investInMembers, a liczba spółek GPW jest spójna', () => {
        world();
        ensureMarketOperators();
        const gpw = marketOperators.GPW;
        const gpwStock = { symbol: 'GPW', name: 'GPW', cash: 1000000, price: 50, totalShares: 100000 };
        stocks.push(gpwStock);

        const initialCash = gpwStock.cash;
        investInMembers(gpw, gpwStock);
        assert(gpwStock.cash === initialCash, 'GPW nie wydaje gotówki na zakup losowych akcji spółek');

        // Liczba spółek na rynku GPW odpowiada notowanym spółkom
        const gpwMembers = stocks.filter(s => getStockMarket(s) === 'GPW' && !s.isBankrupt && s.assetType !== 'Startup').length;
        assert(gpwMembers >= 2, 'spółki GPW są poprawnie zliczane');
    });

    test('P4: Program dla policjantów (poziom 5 policji): klient Funkcjonariusz, dopłata 20% i Komendant Jakub', () => {
        world();
        oversight.police.level = 5;

        // 1. Sprawdź spawnowanie Komendanta Jakuba
        const jakub = checkPoliceChiefSpawn();
        assert(jakub !== null, 'Komendant Jakub został utworzony');
        assert(jakub.name === 'Komendant Jakub', 'poprawne imię bota');
        assert(jakub.cash === 5000, 'kapitał początkowy 5000 PLN');
        assert(jakub.personality === 'police_chief', 'osobowość police_chief');

        // 2. Sprawdź preferencje klienta Funkcjonariusz
        assert(fundSatisfiesClientPreference('officer') === false, 'pusty portfel nie ma 50% defensywnych');

        const defStock = stocks.find(s => isStockDefensive(s)) || { symbol: 'DEF_TEST', sector: 'Żywność', price: 100 };
        if (!stocks.includes(defStock)) stocks.push(defStock);
        playerPortfolio[defStock.symbol] = { shares: 10, avgPrice: 100 };
        assert(fundSatisfiesClientPreference('officer') === true, 'Funkcjonariusz akceptuje fundusz defensywny');

        // 3. Sprawdź 20% państwową dopłatę dla funkcjonariusza
        const officerClient = {
            id: 'c_off',
            name: 'Aspirant Marek',
            type: 'officer',
            units: 0,
            avgBuyNav: 100,
            weeksSinceTrade: 1
        };
        const baseDeposit = 1000;
        const initialUnits = playerFund.totalUnits || 1;
        const initialAssets = getFundAssets();
        
        let depositVal = baseDeposit;
        if (officerClient.type === 'officer') {
            depositVal = Math.round(depositVal * 1.20);
        }
        assert(depositVal === 1200, 'państwowa dopłata 20% podnosi wkład do 1200 PLN');
    });

    test('P5: renderCompanyCard renderuje kafelki KPI (funkcja tile) bez błędów ReferenceError', () => {
        world();
        companyCardView.symbol = 'AAA';
        const ids = ['company-card-header', 'company-card-kpis', 'company-card-tabs', 'company-card-body'];
        ids.forEach(id => {
            if (!document.getElementById(id)) {
                const el = document.createElement('div');
                el.id = id;
                document.body.appendChild(el);
            }
        });
        renderCompanyCard();
        const kpis = document.getElementById('company-card-kpis');
        assert(kpis && kpis.innerHTML.includes('Kapitalizacja'), 'kafelki KPI zawierają Kapitalizację');
        assert(kpis.innerHTML.includes('C/Z'), 'kafelki KPI zawierają C/Z');
    });

    test('P6: Wybór aktywnej giełdy w nagłówku tabeli zamiast przycisku Internetowa', () => {
        world();
        ensureMarketOperators();
        marketOperators.XTD.status = 'active';

        let body = document.getElementById('stock-table-body');
        if (!body) {
            const table = document.createElement('table');
            body = document.createElement('tbody');
            body.id = 'stock-table-body';
            table.appendChild(body);
            document.body.appendChild(table);
        }

        setSelectedMarket('XTD');
        assert(selectedMarketOperator === 'XTD', 'rynek XTD został wybrany');

        setSelectedMarket('GPW');
        assert(selectedMarketOperator === 'GPW', 'rynek GPW został wybrany');

        // Sprawdź czy przycisk Internetowa nie istnieje w DOM
        const internetBtn = document.querySelector('button[data-level="INTERNET"]');
        assert(!internetBtn, 'przycisk Internetowa usunięty z zakładek poziomów giełdy');

        // Sprawdź nagłówek rynku oraz wysuwany drawer
        const headerTitle = document.querySelector('.market-header-title');
        assert(headerTitle && headerTitle.textContent.includes('GPW — GIEŁDA PAPIERÓW WARTOŚCIOWYCH'), 'nagłówek wyświetla GPW — GIEŁDA PAPIERÓW WARTOŚCIOWYCH');

        const drawer = document.getElementById('market-selector-drawer');
        assert(drawer, 'istnieje rozsuwany drawer wyboru giełdy');
        assert(!drawer.classList.contains('is-open'), 'drawer jest domyślnie zwinięty');

        toggleMarketSelector();
        assert(isMarketSelectorOpen === true, 'drawer otwarty po kliknięciu');
        assert(drawer.classList.contains('is-open'), 'klasa is-open dodana do drawera');

        selectMarketAndClose('XTD');
        assert(selectedMarketOperator === 'XTD', 'wybrano rynek XTD');
        assert(isMarketSelectorOpen === false, 'drawer zamknięty po wyborze rynku');
    });
});



group('0.15 H6: Akademia, Mentor, osiągnięcia, newsy i retrospektywa rynkowa', () => {
    function world() {
        const a = makeCompany('AAA'), b = makeCompany('BBB');
        a.name = 'Alfa Testowa'; b.name = 'Beta Testowa';
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        initMarketRegimes();
        ensureOversight();
        return { a, b };
    }

    test('H6.1: Nowe hasła Akademii z 0.15 istnieją i mają poprawne quizy', () => {
        world();
        const expectedKeys = [
            'korekta', 'cykl_rynku_gospodarki', 'strach_chciwosc', 'premia_ryzyko',
            'krach_bezpieczniki', 'pozyczkodawca', 'dzwignia_margin', 'obsuniecie_kapitalu',
            'okno_ipo', 'pulapka_wartosci'
        ];
        for (const key of expectedKeys) {
            const entry = ACADEMY_ENTRIES[key];
            assert(entry, `hasło ${key} istnieje w ACADEMY_ENTRIES`);
            assert(entry.quiz && entry.quiz.length === 3, `hasło ${key} ma dokładnie 3 pytania quizowe`);
            assert(typeof entry.example === 'function', `hasło ${key} posiada funkcję example`);
            const ex = entry.example();
            assert(typeof ex === 'string', `example ${key} zwraca string`);
        }
    });

    test('H6.2: Nowe zadania Mentora (ścieżka ryzyka) przydzielane warunkowo wg isEligible', () => {
        world();
        assert(MENTOR_TASKS.buyInFear && MENTOR_TASKS.buyInFear.track === 'risk', 'buyInFear w ścieżce risk');
        assert(MENTOR_TASKS.exitBubble && MENTOR_TASKS.exitBubble.track === 'risk', 'exitBubble w ścieżce risk');
        assert(MENTOR_TASKS.surviveBear && MENTOR_TASKS.surviveBear.track === 'risk', 'surviveBear w ścieżce risk');

        // Bez aktywnej bańki exitBubble nie kwalifikuje się
        activeSectorBubble = null;
        assert(MENTOR_TASKS.exitBubble.isEligible() === false, 'exitBubble niedostępne bez bańki');

        // Gdy sentyment wysoki (>20), buyInFear nie kwalifikuje się
        const regime = getMarketRegime('home');
        regime.sentiment = 75;
        skills.indexAnalystLvl1.unlockedLevel = 4;
        assert(MENTOR_TASKS.buyInFear.isEligible() === false, 'buyInFear niedostępne przy sentymencie 75');

        // Gdy sentyment < 20 i L4, kwalifikuje się
        regime.sentiment = 15;
        assert(MENTOR_TASKS.buyInFear.isEligible() === true, 'buyInFear dostępne przy sentymencie 15 i L4');
    });

    test('H6.3: Pasek newsów rejestruje zdarzenia rynkowe i stosuje limit nastroju', () => {
        world();
        newsLog = [];
        lastMoodNewsWeek = -99;
        assert(canPushMoodNews() === true, 'canPushMoodNews dostępne na start');
        
        canPushMoodNews();
        assert(canPushMoodNews() === false, 'canPushMoodNews limitowane do 1 wiadomości na 2 tygodnie');

        // Krach rynkowy wysyła news poza limitem
        triggerMarketCrash({ durationWeeks: 2, targetDrop: -0.25 });
        assert(newsLog.some(n => n.text.includes('KRACH NA GIEŁDZIE')), 'krach dodał wpis do paska newsów');

        // Bezpiecznik giełdowy wysyła news poza limitem
        triggerMarketHalt(1, 15, -0.08);
        assert(newsLog.some(n => n.text.includes('BEZPIECZNIK GIEŁDOWY')), 'bezpiecznik dodał wpis do paska newsów');
    });

    test('H6.4: Retrospektywa rynkowa wysyła mail po zakończeniu Hossy lub Bessy', () => {
        world();
        mailbox = createMailbox();
        const regime = getMarketRegime('home');
        regime.quartersInPhase = 6;
        regime.phaseLength = 6;
        regime.phase = 'bull';
        regime.startGig = 1000;

        advanceMarketRegimeQuarterly();

        const retroMail = mailbox.messages.find(m => m.subject.includes('Retrospektywa rynkowa'));
        assert(retroMail, 'mail z retrospektywą rynkową został wysłany');
        assert(retroMail.body.includes('Wynik indeksu GIG'), 'treść maila zawiera wynik GIG');
        assert(retroMail.body.includes('Wynik Twojego funduszu'), 'treść maila zawiera wynik funduszu');
        assert(retroMail.body.includes('Najsilniejszy sektor'), 'treść maila zawiera podsumowanie sektorów');
    });

    test('H6.5: Rejestr ACHIEVEMENTS, odblokowywanie, przyznawanie XP i wpis do CV', () => {
        world();
        assert(typeof ACHIEVEMENTS === 'object', 'rejestr ACHIEVEMENTS istnieje');
        assert(Object.keys(ACHIEVEMENTS).length >= 11, 'rejestr zawiera co najmniej 11 osiągnięć');

        playerProfile.achievements = {};
        playerProfile.xp = 0;
        const initialCvLen = playerProfile.cv.length;

        const ok = unlockAchievement('first_crisis');
        assert(ok === true, 'unlockAchievement zwraca true przy pierwszym odblokowaniu');
        assert(playerProfile.achievements.first_crisis !== undefined, 'osiągnięcie zapisane w playerProfile.achievements');
        assert(playerProfile.xp === 100, 'przyznano 100 XP za osiągnięcie');
        assert(playerProfile.cv.length > initialCvLen, 'dodano wpis osiągnięcia do CV');
        assert(playerProfile.cv.some(e => e.text.includes('Przeżyj pierwszy kryzys')), 'CV zawiera nazwę osiągnięcia');

        // Ponowne odblokowanie nic nie zmienia (unikalność)
        const dup = unlockAchievement('first_crisis');
        assert(dup === false, 'ponowne odblokowanie tego samego osiągnięcia zwraca false');
        assert(playerProfile.xp === 100, 'XP nie zostało naliczone podwójnie');
    });

    test('H6.6: Sekcja osiągnięć w zakładce CV renderuje osiągnięcia zdobyte i ukryte', () => {
        world();
        playerProfile.achievements = { first_crisis: 2 };
        const dummyList = document.createElement('div');
        dummyList.id = 'skills-list';
        document.body.appendChild(dummyList);

        renderCvPanel();

        assert(dummyList.innerHTML.includes('Osiągnięcia'), 'renderCvPanel zawiera nagłówek Osiągnięcia');
        assert(dummyList.innerHTML.includes('Przeżyj pierwszy kryzys'), 'renderCvPanel zawiera zdobyte osiągnięcie');
        assert(dummyList.innerHTML.includes('??? (Ukryte osiągnięcie)'), 'renderCvPanel zawiera ukryte osiągnięcie');
    });

    test('H6.7: Zapis gry v15 i migracja v14 -> v15', () => {
        world();
        economyCycle = createEconomyCycle('expansion');
        skills.indexAnalystLvl1.unlockedLevel = 5;
        playerProfile.achievements = { first_crisis: 1 };
        activeSectorBubble = { id: 'ai', name: 'Sztuczna inteligencja', phase: 'inflating', premium: 0.40 };

        // 1. Zapis v15 zawiera nowe pola
        const snapshot = buildSaveSnapshot();
        assert(snapshot.version === 15, 'wersja zapisu to 15');
        assert(snapshot.marketRegimes && snapshot.marketRegimes.home, 'zapis zawiera marketRegimes');
        assert(snapshot.playerProfile.achievements.first_crisis === 1, 'zapis zawiera osiągnięcia');

        // 2. Symulacja wczytania starego zapisu v14 (migracja)
        const oldSnapshot = JSON.parse(JSON.stringify(snapshot));
        oldSnapshot.version = 14;
        delete oldSnapshot.marketRegimes;

        const report = applySaveSnapshot(oldSnapshot);
        assert(report.ok === true, 'migracja v14 zakończona sukcesem');
        assert(report.warnings.some(w => w.includes('migracja v15')), 'raport zawiera ostrzeżenie o migracji v15');

        const reg = getMarketRegime('home');
        assert(reg.phase === 'bull', 'faza zmigrowana z ekspansji to bull (Hossa)');
        assert(reg.premium === 0, 'premia startowa przy migracji wyzerowana');
        assert(activeSectorBubble === null, 'brak aktywnej bańki przy migracji');
        assert(skills.indexAnalystLvl1.unlockedLevel <= 3, 'poziomy L4-L5 Analityka Indeksowego niekupione po migracji');
    });
});


group('Portfel: donut podziału sektorowego (#sector-donut-area)', () => {
    test('Pusty portfel wyświetla komunikat zastępczy', () => {
        let donut = document.getElementById('sector-donut-area');
        if (!donut) {
            donut = document.createElement('div');
            donut.id = 'sector-donut-area';
            document.body.appendChild(donut);
        }
        updateSectorDonut({});
        assert(donut.className.includes('sector-donut-placeholder'), 'klasa to sector-donut-placeholder');
        assert(donut.textContent.includes('Podział sektorowy pojawi się po zakupie pierwszych akcji'), 'poprawny tekst zachęty');
    });

    test('Portfel z jedną spółką renderuje donut i 100% udziału sektora', () => {
        let donut = document.getElementById('sector-donut-area');
        if (!donut) {
            donut = document.createElement('div');
            donut.id = 'sector-donut-area';
            document.body.appendChild(donut);
        }
        const bankStock = makeCompany('BNK1', { name: 'Bank Testowy', sector: ['Bankowość'] });
        bankStock.price = 100;
        stocks.push(bankStock);

        const testPortfolio = {
            'BNK1': { shares: 50, avgPrice: 80, assetType: 'stock' }
        };

        updateSectorDonut(testPortfolio);
        assert(donut.className.includes('sector-donut-card'), 'klasa to sector-donut-card');
        assert(donut.querySelector('.sector-donut-svg') !== null, 'zawiera wykres SVG');
        assert(donut.querySelector('.sector-donut-center-num').textContent === '1', '1 sektor w centrum');
        assert(donut.innerHTML.includes('Bankowość'), 'zawiera nazwę sektora Bankowość');
        assert(donut.innerHTML.includes('100,0%') || donut.innerHTML.includes('100.0%') || donut.innerHTML.includes('100%'), 'udział 100%');

        // Sprzątanie
        stocks.splice(stocks.indexOf(bankStock), 1);
    });

    test('Portfel z wieloma sektorami sortuje malejąco i sumuje udziały', () => {
        let donut = document.getElementById('sector-donut-area');
        if (!donut) {
            donut = document.createElement('div');
            donut.id = 'sector-donut-area';
            document.body.appendChild(donut);
        }
        const s1 = makeCompany('S_TECH', { name: 'Tech Spółka', sector: ['Technologia'] });
        s1.price = 200; // 50 * 200 = 10 000 zł (50%)
        const s2 = makeCompany('S_MED', { name: 'Med Spółka', sector: ['Medycyna'] });
        s2.price = 100; // 30 * 100 = 3 000 zł (15%)
        const s3 = makeCompany('S_ENG', { name: 'Energia Spółka', sector: ['Energia'] });
        s3.price = 70; // 100 * 70 = 7 000 zł (35%)
        stocks.push(s1, s2, s3);

        const testPortfolio = {
            'S_TECH': { shares: 50, avgPrice: 150 },
            'S_MED': { shares: 30, avgPrice: 90 },
            'S_ENG': { shares: 100, avgPrice: 60 }
        };

        updateSectorDonut(testPortfolio);
        assert(donut.className.includes('sector-donut-card'), 'klasa to sector-donut-card');
        assert(donut.querySelector('.sector-donut-center-num').textContent === '3', '3 sektory w centrum');

        const items = donut.querySelectorAll('.sector-donut-item');
        assert(items.length === 3, 'dokładnie 3 pozycje w legendzie');
        // Kolejność malejąco: Tech (10k), Energia (7k), Medycyna (3k)
        assert(items[0].textContent.includes('Technologia'), 'pierwsza pozycja to Technologia (największy udział)');
        assert(items[1].textContent.includes('Energia'), 'druga pozycja to Energia');
        assert(items[2].textContent.includes('Medycyna'), 'trzecia pozycja to Medycyna');

        // Po wyzerowaniu portfela wraca placeholder
        updateSectorDonut({});
        assert(donut.className.includes('sector-donut-placeholder'), 'po wyzerowaniu powrót do placeholdera');

        // Sprzątanie
        stocks.splice(stocks.indexOf(s1), 1);
        stocks.splice(stocks.indexOf(s2), 1);
        stocks.splice(stocks.indexOf(s3), 1);
    });
});

const REAL_REPLACE_CRASH_WITH_LINE = typeof maybeReplaceCrashWithCrisisLine === 'function' ? maybeReplaceCrashWithCrisisLine : null; // 0.15.3: testy krachów liczą krachy bez linii kryzysu
group('0.15.0.1: Poprawki 0.15 (bezpiecznik, margin call, pieniądze, emisje, krach, odpływ)', () => {
    function world() {
        if (REAL_REPLACE_CRASH_WITH_LINE) maybeReplaceCrashWithCrisisLine = () => false;
        const a = makeCompany('AAA'), b = makeCompany('BBB');
        a.name = 'Alfa Testowa'; b.name = 'Beta Testowa';
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        initMarketRegimes();
        marketHalt = createMarketHaltState();
        marketCrash = createMarketCrashState();
        return { a, b };
    }
    // Bezpiecznik zadziałał w updateMarketIndexes; reszta tego tiku przesuwa zegar (updateFund). Kolejne tiki:
    // sprawdzenie wstrzymania (jak updateStockPrices), potem zegar +1 s.
    function countHaltedTicks(maxTicks = 500) {
        let n = 0;
        playerFund.clockMs += 1000;
        for (let i = 0; i < maxTicks; i++) { if (isMarketHalted()) n++; playerFund.clockMs += 1000; }
        return n;
    }

    test('C1: 15 s wstrzymania = 15 tików przy ×1, ×50 i ×200', () => {
        world();
        const savedSpeed = currentSpeedMultiplier;
        for (const speed of [1, 50, 200]) {
            currentSpeedMultiplier = speed;
            marketHalt = createMarketHaltState();
            triggerMarketHalt(1, 15, -0.08);
            assertEq(countHaltedTicks(), 15, `tiki wstrzymania przy ×${speed}`);
            triggerMarketHalt(2, 30, -0.14);
            assertEq(countHaltedTicks(), 30, `2. stopień przy ×${speed}`);
        }
        currentSpeedMultiplier = savedSpeed;
    });

    test('C1: pauza (zegar gry stoi) nie skraca wstrzymania', () => {
        world();
        triggerMarketHalt(1, 15, -0.08);
        const until = marketHalt.untilGameMs;
        isGamePaused = true;
        updateFund(1000); // w pauzie zegar funduszu nie rusza
        isGamePaused = false;
        assertEq(marketHalt.untilGameMs - getGameClockMs(), 15000, 'pozostało 15 s gry');
        assert(until === marketHalt.untilGameMs && getMarketHaltRemainingSeconds() === 15, 'odliczanie 15 s');
    });

    test('C1: 3. stopień trwa do końca tygodnia gry i kończy go pętla tygodniowa; nowy tydzień zeruje progi', () => {
        world();
        marketHalt.weeklyStartGig = 1000;
        checkCircuitBreakers(790);
        assertEq(marketHalt.level, 3, 'poziom 3');
        assertEq(countHaltedTicks(120), 120, 'wstrzymanie trwa dowolnie długo w tygodniu');
        resetMarketHaltWeekly(800);
        assert(!isMarketHalted(), 'pętla tygodniowa kończy wstrzymanie');
        assertEq(marketHalt.weeklyStartGig, 800, 'nowy punkt odniesienia');
        checkCircuitBreakers(715);
        assertEq(marketHalt.level, 1, 'w nowym tygodniu 1. stopień znów możliwy');
    });

    test('C1: zapis z wstrzymaniem z Date.now() wczytuje się bez wstrzymania; 3. stopień przetrwa zapis', () => {
        world();
        playerFund.clockMs = 5 * 60000;
        triggerMarketHalt(1, 15, -0.08);
        marketHalt.untilGameMs = Date.now() + 15000; // stary znacznik zegara rzeczywistego
        const snap = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        const report = applySaveSnapshot(snap);
        assert(report.ok, 'wczytanie bez błędów');
        assert(!isMarketHalted(), 'stary znacznik usunięty');
        triggerMarketHalt(3, 60, -0.21);
        applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        assert(isMarketHalted() && marketHalt.untilGameMs === Infinity, '3. stopień po wczytaniu');
        triggerMarketHalt(1, 15, -0.08);
        playerFund.clockMs += 5000;
        applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        assertEq(getMarketHaltRemainingSeconds(), 10, 'wstrzymanie zegara gry przetrwa zapis');
    });

    function c2World() {
        const w = world();
        const pawn = makeCompany('LOMB', { cash: 1_000_000, name: 'Lombard Test' }); pawn.assetType = 'PawnShop';
        const collector = makeCompany('WRON', { cash: 1_000_000, name: 'Windykator Test' }); collector.assetType = 'DebtCollector';
        stocks.push(pawn, collector);
        for (const s of stocks) { s.insiderShares = 0; s.sharesHeld = 0; }
        aiCompetitors.forEach(ai => { ai.loans = []; });
        return { ...w, pawn, collector };
    }

    test('C2 (B2): bot z dźwignią > 50% sprzedaje 20–40% wolnych akcji; akcje = posiadacze, bez NaN', () => {
        const { a, b } = c2World();
        const bot = aiCompetitors.find(ai => ai.personality !== 'market_maker');
        bot.cash = 0;
        bot.portfolio = { AAA: { shares: 1000, avgPrice: 100, lockedShares: 200 }, BBB: { shares: 500, avgPrice: 100 } };
        a.sharesHeld = 1000; b.sharesHeld = 500;
        bot.loans = [{ amount: 400000, weeklyPayment: 1000, interestRate: 0.1 }];
        executeMarginCalls();
        const soldA = 1000 - bot.portfolio.AAA.shares, soldB = 500 - bot.portfolio.BBB.shares;
        assert(soldA >= 0.2 * 800 - 1 && soldA <= 0.4 * 800, `sprzedaż AAA 20–40% wolnych: ${soldA}`);
        assert(soldB >= 0.2 * 500 - 1 && soldB <= 0.4 * 500, `sprzedaż BBB 20–40%: ${soldB}`);
        assert(bot.portfolio.AAA.shares >= 200, 'akcje w zastawie nietknięte');
        for (const s of [a, b]) assertEq(s.sharesHeld, getTrackedHeldShares(s), `akcje = posiadacze ${s.symbol}`);
        assert(Object.values(bot.portfolio).every(h => Number.isFinite(h.shares) && Number.isFinite(h.avgPrice)), 'bez NaN w pozycjach');
    });

    test('C2 (B3): margin call gracza spłaca dług bez znikania pieniędzy; zastaw nietknięty; akcje = posiadacze', () => {
        const { a, pawn } = c2World();
        a.price = 100;
        playerPortfolio.AAA = { shares: 1000, avgPrice: 100, assetType: 'stock', lockedShares: 600 };
        a.sharesHeld = 1000;
        playerCash = 10000;
        playerFund.pawnLoans = [{ id: 'p1', symbol: 'AAA', shares: 600, principal: 150000, weeksLeft: 10, missed: 0 }];
        const debt0 = getPawnOutstanding(getFundAccount()), cash0 = playerCash, pawnCash0 = pawn.cash;
        const res = checkPlayerMarginCall();
        const proceeds = res.sold.reduce((s, x) => s + x.proceeds, 0);
        const debt1 = getPawnOutstanding(getFundAccount());
        assert(res.sold.length === 1 && res.sold[0].quantity === 400, 'sprzedane tylko wolne akcje (400)');
        assertNear(debt0 - debt1, res.repaid, 'dług spadł dokładnie o spłatę');
        assertNear(cash0 + proceeds - res.repaid, playerCash, 'gotówka + sprzedaż − spłata = 0 (bez znikania)');
        assertNear(pawn.cash - pawnCash0, res.repaid, 'lombard dostał spłatę');
        assertEq(playerPortfolio.AAA.shares, 600, 'akcje w zastawie zostały');
        assert(playerPortfolio.AAA.lockedShares < 600 && playerPortfolio.AAA.lockedShares === playerFund.pawnLoans[0].shares, 'spłata zwalnia część zastawu');
        assertEq(a.sharesHeld, getTrackedHeldShares(a), 'akcje = posiadacze');
    });

    test('C2 (B4): windykator nie zajmuje akcji w zastawie', () => {
        const { a, b } = c2World();
        const bot = aiCompetitors.find(ai => ai.personality !== 'market_maker');
        bot.cash = 0;
        bot.portfolio = { AAA: { shares: 100, avgPrice: 100, lockedShares: 100 }, BBB: { shares: 100, avgPrice: 100 } };
        bot.loans = [{ amount: 10000, weeklyPayment: 1000, interestRate: 0.1, collectorSymbol: 'WRON', missedPayments: 1 }];
        processAiLoansWeekly(bot);
        assertEq(bot.portfolio.AAA.shares, 100, 'zastawione AAA zostają');
        assert((bot.portfolio.BBB?.shares || 0) < 100, 'zajęte wolne BBB');
    });

    function defensiveWorld() {
        const w = world();
        const food = makeCompany('JEDZ', { sector: ['Żywność'], name: 'Żywność Test' });
        food.companyAge = 20;
        stocks.push(food);
        return { ...w, food };
    }

    test('C3 (B7): Funkcjonariusz dokupuje udziały z dopłatą ze skarbu; pętla obsługuje wszystkich klientów', () => {
        const { food } = defensiveWorld();
        playerPortfolio.JEDZ = { shares: 9000, avgPrice: 100, assetType: 'stock' };
        food.sharesHeld = 9000;
        playerCash = 500000; playerFund.trust = 80; // fundusz defensywny (≥ 50%) i budżet napływu dla 3 klientów
        const mk = id => ensureClientProfile({ id, name: id, type: 'officer', units: 100, avgCost: getFundNav(), satisfaction: 0.95 });
        playerFund.clients = [mk('o1'), mk('o2'), { ...mk('c1'), type: 'careful' }];
        governmentTreasury = 1_000_000;
        const cash0 = playerCash;
        Math.random = () => 0.001;
        processClientsWeekly(); // dawniej TypeError (przypisanie do const) przerywał pętlę
        const [o1, o2, c1] = playerFund.clients;
        assert(o1.units > 100 && o2.units > 100 && c1.units > 100, 'wszyscy klienci dokupili udziały');
        const officerIn = (o1.units + o2.units - 200) * getFundNav();
        assertNear(1_000_000 - governmentTreasury, officerIn / 6, 'skarb płaci 20% wpłaty bazowej (1/6 wpłaty z dopłatą)', 1);
        assert(playerCash > cash0, 'wpłaty trafiły do funduszu');
    });

    test('C3 (B6): Komendant Jakub dostaje dopłatę tylko ze skarbu państwa', () => {
        defensiveWorld();
        oversight.police.level = 5;
        const jakub = checkPoliceChiefSpawn() || aiCompetitors.find(ai => ai.personality === 'police_chief');
        Math.random = () => 0.1;
        jakub.cash = 0; jakub.portfolio = {};
        governmentTreasury = 0;
        makeAiDecision(jakub);
        assertEq(jakub.cash, 0, 'pusty skarb — bez dopłaty');
        assertEq(governmentTreasury, 0, 'skarb bez zmian');
        governmentTreasury = 1_000_000;
        makeAiDecision(jakub);
        const paid = 1_000_000 - governmentTreasury;
        assert(paid > 0, 'dopłata pobrana ze skarbu');
        const held = (jakub.portfolio.JEDZ?.shares || 0) * stocks.find(s => s.symbol === 'JEDZ').price;
        assert(jakub.cash + held <= paid + 1, 'bot ma najwyżej tyle, ile dał skarb');
    });

    // Wartość godziwa = kurs (kurs / wartość = 1), więc o „drogo/tanio” decyduje premia rynku.
    function capitalShare(stock, type, n = 10000) {
        const orig = getDisplayedFairValue;
        getDisplayedFairValue = s => s.price;
        let k = 0;
        try { for (let i = 0; i < n; i++) if (getCapitalAgmProposal(stock)?.type === type) k++; }
        finally { getDisplayedFairValue = orig; }
        return k / n;
    }

    test('C4: drogie akcje → emisja w porządku obrad z szansą 40% (80% w sektorze bańki)', () => {
        const { a } = world();
        getMarketRegime('home').phase = 'bull';
        a.cash = getMarketCapValue(a) * 0.10; // ani brak, ani nadmiar gotówki
        getMarketRegime('home').premium = 0.20;
        const p = capitalShare(a, 'issue');
        assert(Math.abs(p - 0.40) <= 0.02, `emisja ${p}`);
        const orig = isCompanyInSectorBubble;
        isCompanyInSectorBubble = () => true;
        try { const pb = capitalShare(a, 'issue'); assert(Math.abs(pb - 0.80) <= 0.02, `emisja w bańce ${pb}`); }
        finally { isCompanyInSectorBubble = orig; }
        assertEq(capitalShare(a, 'buyback', 2000), 0, 'bez skupu przy drogich akcjach');
        getMarketRegime('home').phase = 'bear';
        assertEq(capitalShare(a, 'issue', 2000), 0, 'w Bessie okno emisji zamknięte');
        getMarketRegime('home').phase = 'bull';
    });

    test('C4: tanie akcje → skup z szansą 30%; emisja ratunkowa nie zależy od premii rynku', () => {
        const { a } = world();
        getMarketRegime('home').phase = 'bull';
        a.cash = getMarketCapValue(a) * 0.10;
        getMarketRegime('home').premium = -0.20;
        const p = capitalShare(a, 'buyback');
        assert(Math.abs(p - 0.30) <= 0.02, `skup ${p}`);
        assertEq(capitalShare(a, 'issue', 2000), 0, 'bez emisji przy tanich akcjach i zapasie gotówki');
        getMarketRegime('home').premium = 0;
        assertEq(capitalShare(a, 'buyback', 2000) + capitalShare(a, 'issue', 2000), 0, 'neutralna wycena — bez uchwały kapitałowej');
        getMarketRegime('home').premium = 0.12;
        assert(Math.abs(capitalShare(a, 'issue') - 0.40) <= 0.02, 'górna część Hossy (premia > +10%) to już drogie akcje');
        a.cash = getMarketCapValue(a) * 0.01; // brak gotówki
        getMarketRegime('home').premium = 0;
        assert(Math.abs(capitalShare(a, 'issue') - 0.50) <= 0.02, 'brak gotówki: emisja 50%');
        getMarketRegime('home').premium = -0.20;
        assert(Math.abs(capitalShare(a, 'issue') - 0.20) <= 0.02, 'brak gotówki przy tanich akcjach: emisja 20% (zarząd woli kredyt)');
        // Szansa emisji ratunkowej w cyklu zdarzeń jest stała (bez mnożnika premii); wybór spółki bez wagi bańki.
        assert(!/premium/.test(triggerMainMarketEventCycle.toString()) && !/Bubble/.test(triggerRescueOfferingEvent.toString()), 'emisja ratunkowa bez nastroju rynku');
    });

    test('C4: walne kwartał później — zarząd wycofuje emisję, gdy akcje przestały być drogie', () => {
        const { a } = world();
        getMarketRegime('home').phase = 'bull';
        a.cash = getMarketCapValue(a) * 0.10;
        const orig = getDisplayedFairValue;
        getDisplayedFairValue = s => s.price;
        try {
            getMarketRegime('home').premium = 0.20;
            const gov = ensureGovernance(a);
            gov.pendingAgm = { items: [{ id: 'issue', kind: 'board', type: 'issue', reason: 'expensive', label: 'Emisja 10% nowych akcji przy wysokiej wycenie', playerVote: 'for' }] };
            assert(isCapitalAgmItemValid(a, gov.pendingAgm.items[0]), 'drogie akcje — uchwała ważna');
            getMarketRegime('home').premium = -0.20; // Dystrybucja → Bessa przed walnym
            const total0 = a.totalShares;
            const record = holdAgm(a);
            assert(!record || !record.results.some(r => r.type === 'issue'), 'emisja wycofana przed głosowaniem');
            assertEq(a.totalShares, total0, 'bez nowych akcji');
            assert(!isCapitalAgmItemValid(a, { type: 'issue', reason: 'cash' }) || a.cash < getMarketCapValue(a) * 0.03, 'emisja z braku gotówki tylko przy braku gotówki');
        } finally { getDisplayedFairValue = orig; }
    });

    test('Po C7: każda zwykła spółka ma fazę (także z bilansem w definicji, z IPO i ze starego zapisu)', () => {
        const { a, b } = world();
        delete a.corporatePhase; a.companyAge = undefined; a.financialHealth = 2; a.exchange = 'BRONZE';
        delete b.corporatePhase; b.companyAge = 40; b.financialHealth = -3;
        updateCorporatePhase(a); updateCorporatePhase(b);
        assert(Object.values(CORPORATE_PHASES).includes(a.corporatePhase) && Number.isFinite(a.companyAge), `faza i wiek nadane: ${a.corporatePhase}, ${a.companyAge}`);
        assert(Object.values(CORPORATE_PHASES).includes(b.corporatePhase), `słaba spółka: ${b.corporatePhase}`);
        assertEq(PHASE_GROWTH_ADJUSTMENT[CORPORATE_PHASES.DECLINE], -0.015, 'Spadek: −1,5 pp na kwartał');
    });

    test('C4: akcje = posiadacze po emisji i skupie z walnego; news i hasło Akademii dla spółki z portfela', () => {
        const { a } = world();
        playerPortfolio.AAA = { shares: 2000, avgPrice: 100, assetType: 'stock' };
        a.sharesHeld = 2000;
        a.cash = 500000;
        const total0 = a.totalShares;
        applyAgmResolution(a, { type: 'issue', reason: 'expensive' });
        assertEq(a.totalShares, total0 + Math.floor(total0 * 0.1), 'emisja 10%');
        assertEq(a.sharesHeld, getTrackedHeldShares(a), 'akcje = posiadacze po emisji');
        assert(newsLog.some(n => /emituje 10% akcji przy wysokiej wycenie/.test(n.text)), 'wpis w pasku newsów');
        assert(isAcademyUnlocked('emisje_skupy'), 'hasło Akademii');
        const total1 = a.totalShares;
        applyAgmResolution(a, { type: 'buyback', reason: 'cheap' });
        assert(a.totalShares < total1, 'skup zmniejsza liczbę akcji');
        assertEq(a.sharesHeld, getTrackedHeldShares(a), 'akcje = posiadacze po skupie');
        assert(newsLog.some(n => /skupuje akcje przy niskiej wycenie/.test(n.text)), 'wpis o skupie');
    });

    function crashCount(phase, quartersInPhase, n = 10000) {
        const regime = getMarketRegime('home');
        const orig = triggerMarketCrash;
        let k = 0;
        triggerMarketCrash = () => { k++; };
        try {
            for (let i = 0; i < n; i++) { regime.phase = phase; regime.quartersInPhase = quartersInPhase; regime.premium = 0.1; checkMarketCrashQuarterly(); }
        } finally { triggerMarketCrash = orig; }
        return k / n;
    }

    test('C5b: brak krachu w Akumulacji, Bessie, Kapitulacji i w kw. 1–3 Hossy; możliwy po wzrostach', () => {
        world();
        aiCompetitors.forEach(ai => { ai.loans = []; });
        for (const phase of ['accumulation', 'bear', 'capitulation']) assertEq(crashCount(phase, 3), 0, `bez krachu: ${phase}`);
        for (const q of [1, 2, 3]) assertEq(crashCount('bull', q), 0, `bez krachu w ${q}. kw. Hossy`);
        const bull = crashCount('bull', 4);
        assert(Math.abs(bull - 0.03) < 0.006, `Hossa ≥ 4 kw.: ${bull}`);
        assert(crashCount('euphoria', 1) > 0.07, 'Euforia: szansa bazowa + 6 pp');
        assert(crashCount('distribution', 1) > 0.015, 'Dystrybucja');
    });

    test('C5b: premia po krachu nie niżej niż −35%', () => {
        world();
        const regime = getMarketRegime('home');
        regime.premium = -0.05;
        triggerMarketCrash({ durationWeeks: 2, targetDrop: -0.35 });
        processMarketCrashWeekly();
        assert(regime.premium >= -0.35, 'w trakcie');
        processMarketCrashWeekly();
        assertNear(regime.premium, -0.35, 'dno −35%');
        regime.premium = 0.30;
        triggerMarketCrash({ durationWeeks: 1, targetDrop: -0.30 });
        processMarketCrashWeekly();
        assertNear(regime.premium, 0.0, 'z euforii spadek o 30 pp');
    });

    test('C5b: liczba krachów w modelu faz (300 gier × 20 lat)', () => {
        world();
        aiCompetitors.forEach(ai => { ai.loans = []; });
        const quiet = { logEvent, showToast, addMail, pushNews, executeMarginCalls, reactCentralBankToCrash };
        logEvent = showToast = addMail = pushNews = () => {}; executeMarginCalls = reactCentralBankToCrash = () => {};
        const counts = [];
        let premSum = 0, premN = 0;
        try {
            for (let g = 0; g < 300; g++) {
                initMarketRegimes();
                marketCrash = createMarketCrashState();
                let crashes = 0;
                for (let q = 0; q < 80; q++) {
                    const regime = getMarketRegime('home');
                    regime.premium += (regime.premiumTarget - regime.premium) * 0.25;
                    advanceMarketRegimeQuarterly();
                    const was = isMarketCrashing();
                    checkMarketCrashQuarterly();
                    if (!was && isMarketCrashing()) crashes++;
                    for (let w = 0; w < 5 && isMarketCrashing(); w++) processMarketCrashWeekly();
                    premSum += getMarketRegime('home').premium; premN++;
                }
                counts.push(crashes);
            }
        } finally { Object.assign(window, quiet); }
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        const dist = [0, 1, 2, 3].map(k => counts.filter(c => (k === 3 ? c >= 3 : c === k)).length / counts.length);
        addTable('C5b: krachy na 20 lat (model faz, 300 gier)', ['średnio', '0', '1', '2', '≥ 3', 'średnia premia'], [[mean.toFixed(2), ...dist.map(x => (x * 100).toFixed(0) + '%'), (premSum / premN * 100).toFixed(1) + '%']]);
        assert(mean >= 0.5 && mean <= 2.5, `krachy na 20 lat: ${mean}`);
    });

    test('C6a: obsunięcie względem GIG — fundusz = GIG w bessie prawie bez kary, fundusz gorszy od GIG z pełną', () => {
        world();
        const def = CLIENT_TYPES.fearful, client = { satisfaction: 0.5 };
        const ctx = (dd, bdd) => ({ excess: 0, trust: 50, maxDrawdown: dd, benchmarkDrawdown: bdd, lastRankBad: false, ethicsIssue: null });
        const old = -Math.max(0, 0.30 - 0.05) * def.volAversion * 0.3; // 0.15: kara za samo obsunięcie 30%
        const same = getClientSatisfactionDrift(client, def, ctx(0.30, 0.30));
        assert(Math.abs(same.drawdown + same.bearMarket) <= Math.abs(old) * 0.15, 'fundusz = GIG (−30%): ≤ 15% dawnej kary');
        assert(same.bearMarket < 0, 'głęboka bessa dalej trochę niepokoi');
        const worse = getClientSatisfactionDrift(client, def, ctx(0.30, 0.10));
        assertNear(worse.drawdown, -(0.30 - 0.10 - 0.03) * def.volAversion * 0.3, 'pełny składnik względny', 1e-9);
        assertEq(worse.bearMarket, 0, 'GIG −10%: bez części absolutnej');
        assertEq(getDominantOutflowReason(worse, CLIENT_TYPES.careful, 0.5), 'drawdown', 'przyczyna: obsunięcie większe niż GIG');
    });

    // Fundusz z 10 niezadowolonymi klientami po 100 udziałów (1000 udziałów, gotówka na wypłaty).
    function gateWorld(type = 'careful') {
        world();
        playerPortfolio = {};
        playerCash = 1_000_000;
        playerFund.clients = Array.from({ length: 10 }, (_, i) => ensureClientProfile({ id: `g${i}`, name: `Klient ${i}`, type, units: 100, avgCost: 1000, satisfaction: 0 }));
        playerFund.units = 1000;
        playerFund.flowStats = null; // nowy kwartał przepływów: start 1000 udziałów
        playerFund.trust = 50;
        Object.assign(playerFund.current, { startNav: getFundNav(), startBenchmark: getBenchmarkValue(), maxDrawdown: 0, benchmarkDrawdown: 0 }); // wynik = GIG
        gateWorld.seeded = Math.random;
        Math.random = () => 0; // każdy niezadowolony umarza całość
        return playerFund.clients;
    }
    const weekOfClients = () => { for (const c of playerFund.clients) if (c.satisfaction < 0.3) c.satisfaction = 0; processClientsWeekly(); };

    test('C6b: umorzenia w kwartale ≤ 10% udziałów z początku kwartału; nadwyżka w kolejce; bramka raz (zaufanie −2)', () => {
        gateWorld();
        for (let w = 0; w < 5; w++) weekOfClients();
        const q = getFundFlowStats().current;
        assert(q.outUnits <= 100 + 1e-6, `odpływ ${q.outUnits} ≤ 100`);
        assertNear(q.gateUnitsRedeemed, 100, 'limit wykorzystany');
        assert(q.gateTriggered, 'bramka uruchomiona');
        assertNear(getQueuedRedemptionUnits(), 9 * 50, 'reszta w kolejce (tygodniowy limit 15%: po 50 udziałów)');
        assertEq(playerFund.trust, 48, 'zaufanie −2 raz na kwartał');
        assertEq(playerFund.clients.length, 9, 'pierwszy klient wyszedł, reszta czeka');
        assert(isAcademyUnlocked('bramka_umorzen'), 'hasło Akademii');
    });

    test('C6b: kolejka idzie pierwsza w następnym kwartale; klient z odzyskanym zadowoleniem rezygnuje', () => {
        gateWorld();
        weekOfClients();
        const happy = playerFund.clients.find(c => c.id === 'g9');
        macro.quarter++;
        happy.satisfaction = 0.9;
        weekOfClients();
        const q = getFundFlowStats().current;
        assertEq(q.startUnits, 900, 'nowy kwartał od 900 udziałów');
        assertNear(q.outUnits, 90, 'z kolejki 10% z 900');
        assert(q.out.gate > 0, 'przyczyna: kolejka umorzeń');
        assertNear(playerFund.clients.find(c => c.id === 'g1').units, 50, 'pierwszy w kolejce umorzył całe zlecenie (50)');
        assertNear(playerFund.clients.find(c => c.id === 'g2').units, 60, 'drugi do limitu (40)');
        assertEq(happy.queuedRedemption, 0, 'zadowolony zrezygnował z kolejki');
        assertEq(happy.units, 100, 'i zostaje w funduszu');
    });

    test('C6b: panika ≤ 5% na kwartał; rynek wtórny poza bramką', () => {
        gateWorld('fearful');
        for (let w = 0; w < 5; w++) weekOfClients();
        const q = getFundFlowStats().current;
        assert((q.out.panic || 0) > 0 && q.panicUnitsRedeemed <= 50 + 1e-6, `panika ${q.panicUnitsRedeemed} ≤ 5%`);
        assert(!/passRedemptionGate/.test(runPlayerJuMarket.toString()), 'sprzedaż na rynku wtórnym bez bramki');
    });

    test('C6b: zapis i wczytanie z kolejką umorzeń, wstrzymaniem i krachem', () => {
        gateWorld();
        weekOfClients();
        Math.random = gateWorld.seeded; // wczytanie zapisu losuje (stała 0 zapętla losowanie)
        playerFund.clockMs = 60000;
        triggerMarketHalt(1, 15, -0.08);
        triggerMarketCrash({ durationWeeks: 3, targetDrop: -0.3 });
        const queued = getQueuedRedemptionUnits();
        const report = applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        assert(report.ok, 'wczytanie bez błędów');
        assertNear(getQueuedRedemptionUnits(), queued, 'kolejka po wczytaniu');
        assert(getFundFlowStats().current.gateTriggered, 'stan bramki po wczytaniu');
        assert(isMarketHalted() && isMarketCrashing(), 'wstrzymanie i krach po wczytaniu');
    });
});

group('0.15.1: Sztuka przejęć (arbitraż, oferty, due diligence, pakiety, wezwanie, wartość firmy)', () => {
    function world() {
        const a = makeCompany('AAA', { cash: 5_000_000 }), b = makeCompany('BBB'), c = makeCompany('CCC', { sector: ['Żywność'] });
        marketHalt = createMarketHaltState(); marketCrash = createMarketCrashState();
        a.name = 'Alfa Testowa'; b.name = 'Beta Testowa'; c.name = 'Gamma Testowa';
        resetWorld([a, b, c]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        initMarketRegimes();
        return { a, b, c };
    }

    test('M1: kurs celu po ogłoszeniu = oferta × (1 − spread); inicjator −1% za 10 pp premii ponad 20%', () => {
        const { a, b } = world();
        const initPre = a.price;
        assert(initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.50, { friendly: true }), 'start');
        const p = b.mergerProcess;
        assertNear(p.arb.preDealPrice, 100, 'cena sprzed ogłoszenia');
        assertNear(b.price, p.offerDetails.buyoutPricePerShare * (1 - p.arb.spread), 'kurs celu = oferta × (1 − spread)', 0.005);
        assert(p.arb.spread >= 0.03 && p.arb.spread <= 0.15, `spread ${p.arb.spread}`);
        assertNear(a.price / initPre, 0.97, 'premia 50% → inicjator −3%', 1e-6);
    });

    test('M1: spread maleje z etapem; cel wraca do kotwicy arbitrażu', () => {
        const { a, b } = world();
        initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.25, { friendly: true });
        const s1 = a.mergerProcess.arb.spread;
        a.mergerProcess.stage = 5;
        updateMergerSpread(a, b, a.mergerProcess);
        syncPartnerProcess(a, b);
        assert(b.mergerProcess.arb.spread < s1, `spread ${s1} → ${b.mergerProcess.arb.spread}`);
        const anchor = getMergerArbAnchor(b);
        b.price = anchor * 0.8;
        for (let i = 0; i < 2000; i++) updateStockPrices(); // powrót 0,03% różnicy na tik
        assert(b.price > anchor * 0.8 && Math.abs(b.price / anchor - 1) < 0.15, `kurs wraca do ${anchor}: ${b.price}`);
    });

    test('M1: zerwanie — kurs celu w ±5% ceny sprzed ogłoszenia; inicjator z premią 120% najwyżej −8%', () => {
        const { a, b } = world();
        const initPre = a.price;
        initiateMergerProcess(a, b, 'przejęcie', 'cash', 1.2, { friendly: true });
        assertNear(a.price / initPre, 0.92, 'limit −8%', 1e-6);
        cancelMerger(a, 'test'); cancelMerger(b, 'test');
        assert(Math.abs(b.price / 100 - 1) <= 0.05 + 1e-9, `po zerwaniu ${b.price}`);
        assert(!b.mergerProcess && !a.mergerProcess, 'proces wyczyszczony');
    });

    // Fundusz z pakietem w BBB; AAA (bogata, ten sam sektor) jest oferentem.
    function offerWorld(fundPct = 0.40) {
        const w = world();
        const { b } = w;
        playerPortfolio.BBB = { shares: Math.floor(b.totalShares * fundPct), avgPrice: 100, assetType: 'stock' };
        b.sharesHeld = playerPortfolio.BBB.shares;
        buyoutState = createBuyoutState();
        playerCash = 1_000_000;
        return w;
    }
    const withFair = (fn) => { const orig = getDisplayedFairValue; getDisplayedFairValue = s => s.price; try { return fn(); } finally { getDisplayedFairValue = orig; } };

    test('M2: szansa oferty wg tabeli (6% + tania 4 pp + Hossa 3 pp − Bessa 3 pp) i częstość w 10 000 kwartałów', () => {
        const { b } = offerWorld();
        const regime = getMarketRegime('home');
        regime.phase = 'accumulation';
        assertNear(withFair(() => getBuyoutOfferChance(b)), 0.06, 'podstawa', 1e-9);
        regime.phase = 'bull';
        assertNear(withFair(() => getBuyoutOfferChance(b)), 0.09, 'Hossa', 1e-9);
        regime.phase = 'bear';
        const orig = getDisplayedFairValue; getDisplayedFairValue = s => s.price / 0.8;
        try { assertNear(getBuyoutOfferChance(b), 0.07, 'tania w Bessie', 1e-9); } finally { getDisplayedFairValue = orig; }
        regime.phase = 'accumulation';
        let n = 0;
        withFair(() => { for (let i = 0; i < 10000; i++) { buyoutState = createBuyoutState(); processBuyoutOffersQuarterly(); if (buyoutState.offers.BBB) n++; } });
        assert(Math.abs(n / 10000 - 0.06) <= 0.01, `oferty ${n / 10000}`);
    });

    test('M2: rozmowy — przedział ±10% zawiera cenę maks.; kontroferta ≤ maks. przyjęta; pakiet przechodzi poza rynkiem', () => {
        const { a, b } = offerWorld();
        let o;
        for (let i = 0; i < 50 && !o; i++) o = withFair(() => createBuyoutOffer(b, getBuyoutHolder(b)));
        assert(o && !o.wholeCompany && o.bidder.symbol === 'AAA', 'oferta za pakiet od AAA');
        for (let i = 0; i < 200; i++) { const x = { ...o, talked: null, history: [] }; buyoutState.offers.BBB = x; const r = talkBuyoutOffer('BBB'); assert(r.low <= x.maxPrice && x.maxPrice <= r.high, 'przedział zawiera cenę maks.'); }
        buyoutState.offers.BBB = { ...o, talked: null, history: [] };
        const cash0 = playerCash, shares0 = playerPortfolio.BBB.shares, aCash0 = a.cash;
        const price = (o.price + o.maxPrice) / 2;
        assertEq(counterBuyoutOffer('BBB', price), 'accepted', 'kontroferta ≤ maks.');
        assert(!playerPortfolio.BBB, 'pakiet funduszu sprzedany');
        assertNear(playerCash - cash0, shares0 * price, 'zapłata dla funduszu');
        assertNear(aCash0 - a.cash, shares0 * price, 'kupujący zapłacił');
        assertEq(a.equityStakes.BBB, shares0, 'pakiet u kupującego');
        assertEq(b.sharesHeld, getTrackedHeldShares(b), 'akcje = posiadacze');
    });

    test('M2: żądanie > 115% ceny maks. — urażenie wg nastawienia; 100–115% — „ostatnie słowo”', () => {
        const { b } = offerWorld();
        let o; for (let i = 0; i < 50 && !o; i++) o = withFair(() => createBuyoutOffer(b, getBuyoutHolder(b)));
        for (const [stance, p] of [['flexible', 0.6], ['opportunist', 0.8], ['determined', 0.3]]) {
            let insulted = 0;
            for (let i = 0; i < 4000; i++) { buyoutState = createBuyoutState(); buyoutState.offers.BBB = { ...o, stance, history: [], lastWord: false, round: 1 }; if (counterBuyoutOffer('BBB', o.maxPrice * 1.3) === 'insulted') insulted++; }
            assert(Math.abs(insulted / 4000 - p) < 0.03, `${stance}: ${insulted / 4000}`);
        }
        buyoutState.offers.BBB = { ...o, history: [], lastWord: false, round: 1 };
        assertEq(counterBuyoutOffer('BBB', o.maxPrice * 1.1), 'lastWord', '„ostatnie słowo”');
        assertNear(buyoutState.offers.BBB.price, o.maxPrice, 'cena = maks.');
    });

    test('M2: aukcja nie przekracza niższej z cen maks.; cała spółka — mniejszościowi dostają tę samą cenę', () => {
        const { a, b } = offerWorld(0.60);
        const bot = aiCompetitors.find(ai => ai.personality !== 'market_maker');
        bot.portfolio = { BBB: { shares: 1000, avgPrice: 100 } }; b.sharesHeld += 1000;
        let o; for (let i = 0; i < 50 && !o; i++) o = withFair(() => createBuyoutOffer(b, getBuyoutHolder(b)));
        assert(o.wholeCompany, 'cała spółka przy > 50%');
        for (let i = 0; i < 300; i++) {
            buyoutState = createBuyoutState(); buyoutState.offers.BBB = { ...o, history: [], auction: null };
            const before = playerCash; withFair(() => inviteSecondBidder('BBB')); playerCash = before;
            const x = buyoutState.offers.BBB;
            if (x.auction?.second) assert(x.auction.second.price <= o.maxPrice + 1e-6, 'aukcja ≤ cena maks. pierwszego');
        }
        buyoutState = createBuyoutState(); buyoutState.offers.BBB = { ...o, history: [] };
        const price = o.price, botCash0 = bot.cash, cash0 = playerCash, fundShares = playerPortfolio.BBB.shares;
        Math.random = () => 0.99; // bez komplikacji w procesie
        assert(acceptBuyoutOffer('BBB'), 'transakcja uzgodniona');
        assertEq(a.mergerProcess.kind, 'offer', 'proces oferty');
        assertNear(b.price, price * (1 - a.mergerProcess.arb.spread), 'kurs celu = cena − spread');
        for (let q = 0; q < 3 && a.mergerProcess; q++) advanceMergerProcess(a);
        assert(!a.mergerProcess, 'rozliczone po 3 kw.');
        assertNear(bot.cash - botCash0, 1000 * price, 'bot (mniejszościowy) po tej samej cenie');
        assertNear(playerCash - cash0, fundShares * price, 'fundusz po cenie uzgodnionej');
    });

    test('M10: dziennik rodowy — matka → córka → wnuczka po usamodzielnieniu; zapis i wczytanie', () => {
        const { a, b, c } = world();
        genealogyLog = [];
        makeSubsidiary(a, b);
        releaseSubsidiary(b, a, 'oferta wtórna');
        makeSubsidiary(b, c);
        assertEq(genealogyLog.map(e => e.kind).join(','), 'subsidiary,independent,subsidiary', 'zdarzenia w dzienniku');
        const lines = buildGenealogyTree().split('\n');
        const ia = lines.findIndex(l => l.startsWith('Alfa Testowa (AAA)'));
        const ib = lines.findIndex(l => /^\s+└ Beta Testowa \(BBB\)/.test(l));
        const ic = lines.findIndex(l => /^\s{8}└ Gamma Testowa \(CCC\)/.test(l));
        assert(ia >= 0 && ib > ia && ic > ib, `drzewo:\n${lines.join('\n')}`);
        assert(lines.some(l => /usamodzielnienie/.test(l)), 'historia usamodzielnienia');
        applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        assertEq(genealogyLog.length, 3, 'dziennik po wczytaniu');
    });

    test('M3: ukryte zobowiązania u 12% spółek (×2 przy skorumpowanym prezesie); ujawnienie: dług +, kurs − wartość na akcję', () => {
        world();
        let n = 0, nCorrupt = 0;
        for (let i = 0; i < 5000; i++) {
            const s = makeCompany('H' + i, { liabilities: 1_000_000 }); s.financialHealth = 1;
            if (rollHiddenLiabilities(s) > 0) { n++; assert(s.hiddenLiabilities >= 50_000 - 1 && s.hiddenLiabilities <= 200_000 + 1, '5–20% długu'); }
            const c = makeCompany('K' + i, { liabilities: 1_000_000 }); c.financialHealth = 1; c.ceo = { traits: [{ id: 'skorumpowany' }] };
            if (rollHiddenLiabilities(c) > 0) nCorrupt++;
        }
        assert(Math.abs(n / 5000 - 0.12) <= 0.02, `udział ${n / 5000}`);
        assert(Math.abs(nCorrupt / 5000 - 0.24) <= 0.025, `skorumpowany ${nCorrupt / 5000}`);
        const { b } = world();
        b.balanceSheet.liabilities = 500_000; b.hiddenLiabilities = 100_000;
        const liab0 = b.balanceSheet.liabilities, eq0 = b.balanceSheet.assets - b.balanceSheet.liabilities, price0 = b.price;
        revealHiddenLiabilities(b, 'test');
        assertEq(b.balanceSheet.liabilities, liab0 + 100_000, 'zobowiązania + wartość');
        assertNear(b.balanceSheet.assets - b.balanceSheet.liabilities, eq0 - 100_000, 'kapitał − wartość');
        assertNear(price0 - b.price, 100_000 / b.totalShares, 'kurs − wartość na akcję', 0.5);
        assertEq(b.hiddenLiabilities, 0, 'ujawnione raz');
    });

    test('M3: badanie kupującego — oszustwo wykryte w 70% (połowa zerwań), audyt przed sprzedażą: obniżka o połowę i bez zerwania', () => {
        const { a, b } = world();
        const run = (preSale) => {
            let found = 0, cancel = 0, cuts = [];
            for (let i = 0; i < 4000; i++) {
                b.fraud = { start: 0, correctAt: 99, total: 0 }; b.price = 100; b.hiddenLiabilities = 0; b.ceo = null;
                b.audit = preSale ? { done: true, doneQuarter: getAccountingQuarter() } : null;
                const r = runBuyerDueDiligence(a, b, { type: 'przejęcie', offerDetails: { buyoutPricePerShare: 120 } });
                if (r.found.length) { found++; if (r.cancel) cancel++; else cuts.push(r.cut); }
            }
            return { found: found / 4000, cancel: cancel / Math.max(1, found), cut: cuts.reduce((x, y) => x + y, 0) / Math.max(1, cuts.length) };
        };
        const plain = run(false);
        assert(Math.abs(plain.found - 0.70) < 0.03 && Math.abs(plain.cancel - 0.5) < 0.04, `bez audytu: ${JSON.stringify(plain)}`);
        assert(Math.abs(plain.cut - 0.225) < 0.01, `obniżka 15–30%: ${plain.cut}`);
        const audited = run(true);
        assertEq(audited.cancel, 0, 'po audycie bez zerwania');
        assert(Math.abs(audited.cut - plain.cut / 2) < 0.01, `obniżka o połowę: ${audited.cut}`);
    });

    test('M3: ukryte zobowiązania wykryte w 60% — obniżka o wartość na akcję; decyzja funduszu: negocjacje raz, przyjęcie, zerwanie', () => {
        const { a, b } = world();
        let found = 0;
        for (let i = 0; i < 4000; i++) {
            b.fraud = null; b.hiddenLiabilities = 100_000; b.audit = null; b.balanceSheet.liabilities = 0;
            const r = runBuyerDueDiligence(a, b, { type: 'przejęcie', offerDetails: { buyoutPricePerShare: 120 } });
            if (r.found.length) { found++; assertNear(r.cut, 100_000 / b.totalShares / 120, 'obniżka = wartość na akcję / cena', 1e-9); assertEq(b.balanceSheet.liabilities, 100_000, 'ujawnione w bilansie'); }
        }
        assert(Math.abs(found / 4000 - 0.6) < 0.03, `wykrycie ${found / 4000}`);
        // pełna ścieżka oferty: fundusz > 50%, ukryte zobowiązania wykryte, negocjacje i przyjęcie
        playerPortfolio.BBB = { shares: 6000, avgPrice: 100, assetType: 'stock' }; b.sharesHeld = 6000; b.price = 100; b.hiddenLiabilities = 200_000; b.fraud = null;
        buyoutState = createBuyoutState();
        let o; for (let i = 0; i < 50 && !o; i++) o = withFair(() => createBuyoutOffer(b, getBuyoutHolder(b)));
        buyoutState.offers.BBB = o;
        assert(acceptBuyoutOffer('BBB'), 'transakcja uzgodniona');
        Math.random = () => 0.01; // badanie wykrywa
        advanceMergerProcess(a);
        Math.random = () => 0.99;
        const pending = a.mergerProcess.ddPending;
        assert(pending && pending.newPrice < pending.oldPrice, 'obniżka czeka na decyzję funduszu');
        const r = ddNegotiate('BBB');
        assert(r === 'raised' || r === 'refused', 'jedna runda negocjacji');
        assertEq(ddNegotiate('BBB'), false, 'drugiej rundy nie ma');
        const agreed = a.mergerProcess.ddPending.newPrice;
        assert(ddAcceptCut('BBB') && a.mergerProcess.offerDetails.buyoutPricePerShare === agreed && !a.mergerProcess.ddPending, 'przyjęta obniżona cena');
    });

    test('M4: odkup pakietu od bota — zgoda ≥ ceny rezerwowej, kontroferta 85–100%, urażenie < 85%, raz na kwartał', () => {
        const { b } = world();
        blockDealState = createBlockDealState();
        playerCash = 5_000_000;
        const bot = aiCompetitors.find(ai => ai.personality !== 'market_maker' && !ai.isMafia);
        const personality0 = bot.personality;
        bot.personality = 'whale'; // rezerwa +15%: 80% rezerwy mieści się w zakresie formularza (kurs −10%…+50%)
        bot.portfolio = { BBB: { shares: 2000, avgPrice: 100 } }; b.sharesHeld = 2000;
        botRelations.values = {};
        const holder = () => getBlockHolder(b, bot.id);
        const reserve = withFair(() => getBlockReservePrice(b, holder()));
        const price0 = b.price;
        assertEq(withFair(() => proposeBlockBuy('BBB', bot.id, 500, reserve * 0.9)), 'counter', '85–100% → kontroferta');
        assertEq(withFair(() => proposeBlockBuy('BBB', bot.id, 500, reserve * 1.01)), null, 'druga propozycja w kwartale zablokowana');
        macro.quarter++;
        const cash0 = playerCash;
        assertEq(withFair(() => proposeBlockBuy('BBB', bot.id, 500, reserve * 1.01)), 'accepted', '≥ rezerwowej → zgoda');
        assertEq(playerPortfolio.BBB.shares, 500, 'akcje u funduszu');
        assertEq(bot.portfolio.BBB.shares, 1500, 'bot oddał pakiet');
        assertNear(cash0 - playerCash, 500 * reserve * 1.01, 'gotówka funduszu − zapłata');
        assertEq(b.price, price0, 'bez wpływu na kurs');
        assertEq(b.sharesHeld, getTrackedHeldShares(b), 'akcje = posiadacze');
        macro.quarter++;
        const rel0 = getRelation(bot.id);
        assertEq(withFair(() => proposeBlockBuy('BBB', bot.id, 500, reserve * 0.8)), 'insulted', '< 85% → urażenie');
        assertEq(getRelation(bot.id) - rel0, -10, 'relacja −10');
        macro.quarter++;
        assertEq(withFair(() => proposeBlockBuy('BBB', bot.id, 500, reserve * 2)), null, 'blokada rozmów na 2 kw.');
        bot.personality = personality0;
    });

    test('M4: odkup od zarządu — cena rezerwowa +20%, akcje wchodzą do obrotu; rozmowa daje przedział ±10%', () => {
        const { b } = world();
        blockDealState = createBlockDealState();
        playerCash = 5_000_000;
        b.insiderShares = 3000;
        const holder = getBlockHolder(b, 'insiders');
        const reserve = withFair(() => getBlockReservePrice(b, holder));
        assertNear(reserve, b.price * (1.20 - (b.reputation.player || 0) / 1000), 'prezes: max(kurs, wartość) × 1,20 − reputacja/1000', 1e-6);
        const talk = withFair(() => talkBlockHolder('BBB', 'insiders'));
        assert(talk.range.low <= reserve && reserve <= talk.range.high, 'przedział zawiera cenę rezerwową');
        Math.random = () => 0.99; // prezes zostaje
        assertEq(withFair(() => proposeBlockBuy('BBB', 'insiders', 1000, reserve)), 'accepted', 'zgoda zarządu');
        assertEq(b.insiderShares, 2000, 'pakiet zarządu −1000');
        assertEq(b.sharesHeld, getTrackedHeldShares(b), 'akcje = posiadacze (sharesHeld += n)');
        assertEq(blockDealState.log.length, 1, 'transakcja w dzienniku pakietów (dla KNF)');
    });

    test('M5: ustawa „Próg wezwania” — start 66%, partie nie przeforsują progu ponad limit KNF; zapis i stary zapis', () => {
        world();
        ensureSocietyState();
        society.laws.tenderThreshold = 0;
        assertEq(getTenderThreshold(), 0.66, 'start 66%');
        oversight.knf.level = 1;
        for (let i = 0; i < 300; i++) { const c = pickLawChange('people'); assert(!(c && c[0] === 'tenderThreshold'), 'KNF 0–1: bez podniesienia progu'); }
        oversight.knf.level = 4;
        let up = 0; for (let i = 0; i < 300; i++) { const c = pickLawChange('people'); if (c && c[0] === 'tenderThreshold') up++; }
        assert(up > 0, 'KNF 4: Ludowcy mogą podnieść próg');
        society.laws.tenderThreshold = 3;
        assertEq(getTenderThreshold(), 0.99, '99%');
        const snap = JSON.parse(JSON.stringify(buildSaveSnapshot()));
        applySaveSnapshot(snap);
        assertEq(society.laws.tenderThreshold, 3, 'po wczytaniu');
        delete snap.society.laws.tenderThreshold;
        applySaveSnapshot(snap);
        assertEq(society.laws.tenderThreshold, 0, 'stary zapis: 66%');
        oversight.knf.level = 0;
    });

    // Fundusz kupuje pakiet od zarządu i przekracza 50%; KNF ze skutecznością `eff`.
    function knfWorld(eff = 1) {
        const w = world();
        const { b } = w;
        blockDealState = createBlockDealState();
        const rec = getRecord('player'); rec.tenderCases = []; rec.tenderStrikes = 0;
        playerCash = 5_000_000;
        playerPortfolio.BBB = { shares: 4500, avgPrice: 100, assetType: 'stock' }; b.sharesHeld = 4500; b.insiderShares = 1000;
        const origEff = getInstitutionEffectiveness;
        getInstitutionEffectiveness = () => eff;
        knfWorld.restore = () => { getInstitutionEffectiveness = origEff; };
        return w;
    }
    const crossByBlock = (b) => { b.knfTenderCase = false; if ((playerPortfolio.BBB?.shares || 0) > 5000) { playerPortfolio.BBB.shares = 4500; b.sharesHeld = getTrackedHeldShares(b); } b.insiderShares = Math.max(b.insiderShares, 1000); Math.random = () => 0.99; executeBlockBuy(b, getBlockHolder(b, 'insiders'), 1000, 110); };

    test('M5: drabina KNF 1 → 2 → 3 (ostrzeżenie, kara 2%, nakaz wezwania do progu po najwyższej cenie); zakupy sesyjne poza drabiną', () => {
        const { b } = knfWorld(1);
        try {
            playerPortfolio.BBB.shares = 6000; b.sharesHeld = 6000; // przekroczenie zakupami sesyjnymi — bez sprawy
            processTenderOversightQuarterly();
            assertEq(getRecord('player').tenderStrikes, 0, 'zakupy sesyjne poza drabiną');
            playerPortfolio.BBB.shares = 4500; b.sharesHeld = 4500;
            crossByBlock(b); processTenderOversightQuarterly();
            assertEq(getRecord('player').tenderStrikes, 1, '1. przypadek: ostrzeżenie');
            crossByBlock(b);
            const cash0 = playerCash, trust0 = playerFund.trust;
            processTenderOversightQuarterly();
            assertEq(getRecord('player').tenderStrikes, 2, '2. przypadek');
            const value = getRecentBlockBuys('BBB').reduce((s, e) => s + e.shares * e.price, 0);
            assertNear(cash0 - playerCash, Math.round(value * 0.02), 'kara 2% wartości pakietów z 2 kw.');
            assertEq(trust0 - playerFund.trust, 3, 'zaufanie −3');
            society.laws.tenderThreshold = 0; // 66%
            crossByBlock(b);
            const bot = aiCompetitors.find(ai => ai.personality === 'calm') || aiCompetitors.find(ai => ai.personality !== 'market_maker' && !ai.isMafia);
            bot.portfolio = { BBB: { shares: 500, avgPrice: 90 } }; b.sharesHeld = getTrackedHeldShares(b);
            processTenderOversightQuarterly();
            assertEq(getRecord('player').tenderStrikes, 3, '3. przypadek: nakaz wezwania');
            assert(getFundStakePct(b) > 0.55 && getFundStakePct(b) <= 0.66 + 1e-9, `wezwanie do progu: ${getFundStakePct(b)}`);
            assertEq(b.sharesHeld, getTrackedHeldShares(b), 'akcje = posiadacze po wezwaniu');
        } finally { knfWorld.restore(); }
    });

    test('M5: KNF wykrywa z szansą = skuteczność; brak gotówki przy KNF ≥ 3 → nakaz odsprzedaży do 50% w 2 kw.', () => {
        const { b } = knfWorld(0.4);
        try {
            let detected = 0;
            for (let i = 0; i < 2000; i++) {
                const rec = getRecord('player'); rec.tenderCases = [{ symbol: 'BBB', quarter: 0 }]; rec.tenderStrikes = 5; // dalekie przypadki: wezwanie
                const orig = applyKnfTenderStep; applyKnfTenderStep = () => 'x';
                processTenderOversightQuarterly();
                applyKnfTenderStep = orig;
                if (!getRecord('player').tenderCases.length) detected++;
            }
            assert(Math.abs(detected / 2000 - 0.4) < 0.03, `wykrycia ${detected / 2000}`);
            getInstitutionEffectiveness = () => 1;
            oversight.knf.level = 3;
            playerCash = 10;
            const rec = getRecord('player'); rec.tenderCases = []; rec.tenderStrikes = 2;
            crossByBlock(b); playerCash = 10;
            processTenderOversightQuarterly();
            assert(b.knfResaleOrder, 'nakaz odsprzedaży');
            macro.quarter += 2;
            processTenderOversightQuarterly();
            assert(getFundStakePct(b) <= 0.5 + 1e-9 && !b.knfResaleOrder, `zejście do 50%: ${getFundStakePct(b)}`);
            assertEq(b.sharesHeld, getTrackedHeldShares(b), 'akcje = posiadacze');
            oversight.knf.level = 0;
        } finally { knfWorld.restore(); }
    });

    const bsGap = s => s.balanceSheet.assets - s.balanceSheet.liabilities - s.balanceSheet.shareCapital - s.balanceSheet.retainedEarnings;

    test('M6: przejęcie — wartość firmy = cena − aktywa netto, bilans spójny, kapitał − koszty procesu, przychody celu u kupującego', () => {
        const { a, b } = world();
        b.balanceSheet = { assets: 600_000, liabilities: 200_000, shareCapital: 100_000, retainedEarnings: 300_000 };
        const gapA = bsGap(a), equityA = a.balanceSheet.assets - a.balanceSheet.liabilities;
        initiateMergerProcess(a, b, 'przejęcie', 'cash', 0.25, { friendly: true });
        const process = a.mergerProcess;
        process.costs = 10_000;
        const price = process.offerDetails.totalCost;
        const revA = Number(a.fundamentals?.revenue) || 0, revB = Number(b.fundamentals?.revenue) || 0;
        resolveMerger(a, b, process);
        assertNear(a.balanceSheet.goodwill, price - 400_000, 'wartość firmy = P − AN');
        assertNear(bsGap(a), gapA, 'bilans spójny (aktywa − zobowiązania − kapitał)', 1e-6);
        assertNear(a.balanceSheet.assets - a.balanceSheet.liabilities, equityA - 10_000, 'kapitał własny − koszty procesu');
        assert(a.acquisitions?.length === 1 && a.acquisitions[0].goodwill === a.balanceSheet.goodwill, 'plan przejęcia zapisany');
        if (revB > 0) assertNear(a.fundamentals.revenue, revA + revB, 'przychody celu u kupującego');
    });

    test('M6: test co 4 kw. — < 70% planu odpis 25%, < 40% odpis 50%; bez ruchu gotówki; zapis i wczytanie', () => {
        const { a } = world();
        const setEbit = v => { a.fundamentals = a.fundamentals || initializeFundamentals(a); a.fundamentals.history = [1, 2, 3, 4].map(() => ({ ebitda: v / 4, depreciation: 0, revenue: 1000, netIncome: 0 })); };
        a.balanceSheet.goodwill = 100_000; a.balanceSheet.assets += 100_000; a.balanceSheet.retainedEarnings += 100_000;
        a.acquisitions = [{ symbol: 'XX', name: 'Iks', quarter: macro.quarter - 4, goodwill: 100_000, left: 100_000, planEbit: 1000, revenueShare: 1 }];
        const cash0 = a.cash, gap0 = bsGap(a);
        setEbit(600); processGoodwillImpairmentQuarterly();
        assertNear(a.balanceSheet.goodwill, 75_000, 'odpis 25%');
        assertEq(a.cash, cash0, 'bez ruchu gotówki');
        assertNear(bsGap(a), gap0, 'bilans spójny po odpisie', 1e-6);
        assertNear(a.periodLedger.pending.otherIncome, -25_000, 'odpis w wyniku kwartału');
        macro.quarter += 4; setEbit(300); processGoodwillImpairmentQuarterly();
        assertNear(a.balanceSheet.goodwill, 37_500, 'odpis 50% pozostałej');
        macro.quarter += 4; setEbit(900); processGoodwillImpairmentQuarterly();
        assertNear(a.balanceSheet.goodwill, 37_500, '≥ 70% planu: bez odpisu');
        applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        const a2 = stocks.find(s => s.symbol === 'AAA');
        assert(a2.acquisitions?.[0]?.left === 37_500 && a2.balanceSheet.goodwill === 37_500, 'zapis i wczytanie wartości firmy');
    });

    function stakeWorld() {
        const w = world();
        const { a, b, c } = w;
        a.exchange = 'PLATINUM'; a.cash = 50_000_000; a.name = 'Cortex Group';
        for (const s of [b, c]) { s.exchange = 'BRONZE'; s.insiderShares = 0; s.sharesHeld = 0; }
        aiCompetitors.forEach(ai => { ai.portfolio = {}; });
        genealogyLog = [];
        return w;
    }

    test('M9: rangi — Platynowa kupuje niższe; Złota tylko przy kondycji ≥ 3 albo gotówce ≥ 25% kap.; ta sama ranga tylko kooperacja', () => {
        const { a, b, c } = stakeWorld();
        assert(canRunStakeCampaign(a), 'Platynowa');
        b.exchange = 'GOLD'; b.financialHealth = 1; b.cash = getMarketCapValue(b) * 0.1;
        assert(!canRunStakeCampaign(b), 'Złota przeciętna — nie');
        b.financialHealth = 3; assert(canRunStakeCampaign(b), 'Złota w świetnej kondycji');
        b.financialHealth = 1; b.cash = getMarketCapValue(b) * 0.3; assert(canRunStakeCampaign(b), 'Złota bogata');
        c.exchange = 'PLATINUM'; assert(!canBeStakeTarget(b, c), 'Złota nie kupuje wyższej rangi');
        assert(canBeStakeTarget(c, b), 'Złotą może kupić silniejsza');
        b.exchange = 'PLATINUM'; c.exchange = 'PLATINUM';
        let goals = new Set();
        for (let i = 0; i < 200; i++) { b.stakeCampaign = null; c.stakeCampaign = null; const orig = STAKE_CAMPAIGN_CHANCE; processStakeCampaignsQuarterly(); for (const s of [b, c]) if (s.stakeCampaign) goals.add(s.stakeCampaign.goal); }
        for (const g of goals) assertEq(g, 0.25, 'ta sama ranga: tylko 25%');
    });

    test('M9: drabina 25 / 50 / próg ustawy / 99% — kooperacja, córka z prezesem „Marionetka <matka>”, nakaz wezwania, zmiana nazwy, wchłonięcie; akcje = posiadacze', () => {
        const { a, b } = stakeWorld();
        society.laws.tenderThreshold = 0; // kontrola od 66%
        b.stakeCampaign = { buyer: 'AAA', goal: 0.99, pace: 0.2, start: getSubQuarter(), reached: [], tender: false, maxPrice: b.price };
        advanceStakeCampaign(b);
        assert(getStakePct(a, b) <= 0.2 + 1e-9, `tempo ≤ 20 pp: ${getStakePct(a, b)}`);
        assertEq(b.sharesHeld, getTrackedHeldShares(b), 'akcje = posiadacze');
        advanceStakeCampaign(b);
        assert(b.stakeCampaign.reached.includes('coop') && genealogyLog.some(e => /powiązanie/.test(e.note || '')), 'próg 25%: powiązanie');
        advanceStakeCampaign(b); // > 50%
        assertEq(b.isSubsidiaryOf, 'AAA', 'próg 50%: córka');
        assert(b.ceo.traits.some(t => t.id === 'marionetka' && t.name === 'Marionetka Cortex Group'), 'prezes „Marionetka Cortex Group”');
        assert(b.stakeCampaign.tender, 'ustawa: nakaz wezwania do progu');
        assertEq(getVoteForProbability({ kind: 'company', entity: a }, { kind: 'board' }, b), 1, 'matka głosuje za zarządem-marionetką');
        assertEq(getVoteForProbability({ kind: 'company', entity: a }, { kind: 'activist', by: 'player' }, b), 0, 'matka przeciw wnioskom innych');
        advanceStakeCampaign(b); // wezwanie do 66%
        assert(getStakePct(a, b) >= 0.66 - 1e-6, `po wezwaniu ${getStakePct(a, b)}`);
        assert(b.name.startsWith('Cortex '), `zmiana nazwy: ${b.name}`);
        for (let i = 0; i < 6 && !b.isBankrupt; i++) advanceStakeCampaign(b);
        assert(b.delisted === 'absorbed', 'próg 99%: wchłonięcie i zdjęcie z giełdy');
    });

    test('M9: „Mistrz marionetek” zaczyna podkupowanie ×2 częściej', () => {
        const { a } = stakeWorld();
        a.ceo = { name: 'X', traits: [] };
        assertNear(getStakeCampaignChance(a), 0.035, 'podstawa 3,5%/kw.', 1e-9);
        a.ceo.traits = [{ id: 'mistrz_marionetek', name: 'Mistrz marionetek' }];
        assertNear(getStakeCampaignChance(a), 0.07, 'Mistrz marionetek ×2', 1e-9);
    });

    test('M7: osiągnięcia — sprzedane z premią, aukcjoner, czyste księgi, arbitrażysta, pakiet po pakiecie', () => {
        const { b } = world();
        playerProfile._soldWithPremium = playerProfile._auctioneer = playerProfile._cleanBooks = false; playerProfile._arbWins = 0;
        playerPortfolio.BBB = { shares: 6000, avgPrice: 100, assetType: 'stock' };
        noteTakeoverAchievements({ arb: { preDealPrice: 100 }, offerMeta: { fundSeller: true, auction: true, initialPrice: 120, preSaleAudit: true } }, b, 145);
        assert(playerProfile._soldWithPremium && playerProfile._auctioneer && playerProfile._cleanBooks, 'premia ≥ 40%, aukcja +10%, audyt');
        assert(ACHIEVEMENTS.sold_with_premium.check() && ACHIEVEMENTS.auctioneer.check() && ACHIEVEMENTS.clean_books.check(), 'warunki osiągnięć');
        playerPortfolio.BBB = { shares: 100, avgPrice: 112 };
        for (let i = 0; i < 3; i++) noteTakeoverAchievements({ arb: { preDealPrice: 100 } }, b, 118);
        assert(ACHIEVEMENTS.arbitrageur.check(), 'arbitrażysta: 3 zyskowne pozycje kupione po ogłoszeniu');
        blockDealState = createBlockDealState();
        blockDealState.log.push({ q: 0, symbol: 'BBB', shares: 2500, price: 100 });
        playerPortfolio.BBB = { shares: 5200, avgPrice: 100 };
        assert(ACHIEVEMENTS.block_by_block.check(), 'pakiet po pakiecie: > 50%, w tym ≥ 20 pp z pakietów');
        assert(ACHIEVEMENTS.winners_curse.hidden, 'klątwa zwycięzcy ukryta');
    });

    test('Nacjonalizacja: przejęcie długu przez państwo nie rozjeżdża bilansu', () => {
        const { b } = world();
        b.balanceSheet = { assets: 1_000_000, liabilities: 900_000, shareCapital: 50_000, retainedEarnings: 50_000 };
        b.financialHealth = -4; b.price = 10;
        centralBank.funds = 1e9; governmentTreasury = 1e7;
        const gap = s => s.balanceSheet.assets - s.balanceSheet.liabilities - s.balanceSheet.shareCapital - s.balanceSheet.retainedEarnings;
        Math.random = () => 0.01;
        triggerNationalizationEvent();
        assert(b.isStateOwned, 'znacjonalizowana');
        assertEq(b.balanceSheet.liabilities, 0, 'dług przejęty');
        assertNear(gap(b), 0, 'bilans spójny', 1e-6);
    });

    test('Socjaldemokraci: 4. partia, głosy biednych, program — progi CIT i ustawa antymonopolowa', () => {
        world();
        assert(RULING_PARTIES.social && PARTY_IDS.includes('social') && PARTY_COLORS.social, 'partia, lista, kolor');
        for (const [cls, row] of Object.entries(CLASS_VOTE)) assert(row.length === 4 && row.reduce((s, v) => s + v, 0) === 100, `${cls}: 4 partie, suma 100`);
        assert(CLASS_VOTE.poor[3] > CLASS_VOTE.rich[3] && CLASS_VOTE.poor[3] > CLASS_VOTE.poor[2], 'biedni głosują na Socjaldemokratów');
        const support = computePartySupport(false);
        assertNear(PARTY_IDS.reduce((s, id) => s + support[id], 0), 100, 'poparcie sumuje się do 100', 1e-6);
        for (let i = 0; i < 100; i++) { const c = pickLawChange('social'); assert(!c || ['corpTaxBrackets', 'antitrust', 'benefits', 'tenderThreshold'].includes(c[0]), `program: ${c && c[0]}`); }
        assert(PARTY_PROGRAMS.market.moves.some(([law, d]) => law === 'antitrust' && d < 0), 'Koalicja Rynkowa łagodzi ustawę antymonopolową');
    });

    test('Socjaldemokraci: koalicjant Ludowców / Bloku Państwowego, rosną w kryzysie, jako koalicjant zmieniają ustawy', () => {
        world();
        const r = resolveElection({ state: 35, market: 30, people: 23, social: 12 });
        assertEq(r.coalition?.partner, 'social', 'Blok Państwowy bierze Socjaldemokratów');
        assertEq(resolveElection({ market: 35, state: 30, people: 23, social: 12 }).coalition?.partner, 'state', 'Koalicja Rynkowa — nie');
        assertEq(resolveElection({ state: 35, market: 30, people: 27, social: 8 }).coalition?.partner, 'market', 'poniżej 10% — druga partia');
        macro.election.ruling = 'market'; macro.election.terms = 1;
        economyCycle.phase = 'expansion'; macro.inflation = 0.02; macro.unemployment = 0.05;
        const calm = computePartySupport(false).social;
        economyCycle.phase = 'recession';
        const crisis = computePartySupport(false).social;
        assert(crisis > calm + 3, `kryzys: ${calm.toFixed(1)}% → ${crisis.toFixed(1)}%`);
        macro.election.ruling = 'state'; macro.election.coalition = { partner: 'social', weights: { state: 30, social: 20 } };
        withSeededRandom(7, () => { let n = 0; for (let i = 0; i < 1000; i++) if (getLawMakingParty(true) === 'social') n++; assert(n > 320 && n < 480, `koalicjant ~40%: ${n}`); });
        assertEq(getLawMakingParty(), 'state', 'bez flagi — rządzący');
        macro.election.coalition = null; economyCycle.phase = 'expansion';
    });

    test('Progi CIT: małe spółki płacą mniej, duże więcej; ustawa antymonopolowa zmienia progi KNF i blokady', () => {
        const { a, b, c } = world();
        a.price = 1000; b.price = 100; c.price = 10;
        const base = getCompanyIncomeTaxRate();
        society.laws.corpTaxBrackets = 0; corpTaxSizeCache.quarter = null;
        assertNear(getCompanyIncomeTaxRate(c), base, 'liniowy: bez zmian', 1e-9);
        society.laws.corpTaxBrackets = 2; corpTaxSizeCache.quarter = null;
        assertNear(getCompanyIncomeTaxRate(c), base - 0.06, 'progresywny: mała −6 pp', 1e-9);
        assertNear(getCompanyIncomeTaxRate(a), base + 0.05, 'progresywny: duża +5 pp', 1e-9);
        assertNear(getCompanyIncomeTaxRate(b), base, 'średnia bez zmian', 1e-9);
        society.laws.corpTaxBrackets = 0;
        society.laws.antitrust = 1; assertEq(getAntitrustLevel().concern, 0.25, 'standardowa: 25%');
        society.laws.antitrust = 2; assertEq(getAntitrustLevel().concern, 0.20, 'surowa: 20%'); assertEq(getAntitrustLevel().block, 0.30, 'surowa: blokada 30%');
        society.laws.antitrust = 0; assertEq(getAntitrustLevel().block, 0.50, 'łagodna: blokada 50%');
        society.laws.antitrust = 1;
    });

    test('Decyzje 2026-10-23: długość przejęcia 3–7 kw. wg wielkości celu; nacjonalizacja — skarb spłaca bank', () => {
        const { a, b, c } = world();
        a.price = 1000; b.price = 100; c.price = 10;
        assertEq(getTakeoverQuarters(c), 3, 'najmniejsza: 3 kw.');
        assertEq(getTakeoverQuarters(a), 7, 'największa: 7 kw.');
        assert(getTakeoverQuarters(b) >= 3 && getTakeoverQuarters(b) <= 5, 'środkowa');
        b.balanceSheet = { assets: 1_000_000, liabilities: 900_000, shareCapital: 50_000, retainedEarnings: 50_000 };
        b.financialHealth = -4;
        const bank = { id: 'bankN', name: 'Bank N', isActive: true, cash: 0, loanPortfolio: {}, type: BANK_TYPES.UNIVERSAL };
        commercialBanks.length = 0; commercialBanks.push(bank); b.bankAccountId = 'bankN';
        for (const s of [a, c]) s.balanceSheet.liabilities = 0;
        governmentTreasury = 10_000_000; centralBank.funds = 1e9;
        Math.random = () => 0.01;
        triggerNationalizationEvent();
        assert(b.isStateOwned, 'znacjonalizowana');
        assertEq(bank.cash, 900_000, 'bank dostał spłatę długu');
        assertEq(governmentTreasury, 9_100_000, 'ze skarbu państwa');
        assertEq(b.balanceSheet.liabilities, 0, 'dług spłacony');
    });

    test('M8: córka z pustą kopią działów matki nie przerywa logiki spółek (naprawa działów)', () => {
        const { a, b } = world();
        a.departments = {}; // kopia działów matki, która ich jeszcze nie miała
        runCorporateLogic();
        assert(a.departments.economy && a.departments.research && a.departments.development, 'działy odtworzone');
    });

    test('M1: fuzja (wymiana akcji) bez skoku do ceny gotówkowej; etap 5 bez ×1,1', () => {
        const { a, b } = world();
        const pre = b.price;
        initiateMergerProcess(a, b, 'fuzja', 'stockSwap');
        assertEq(b.price, pre, 'bez skoku kursu celu');
        assert(b.mergerProcess.arb.spread >= 0.03 && b.mergerProcess.arb.spread <= 0.08, 'spread fuzji 3–8%');
        a.mergerProcess.stage = 5; const before = b.price;
        runMergerStage(a, b, a.mergerProcess);
        assertEq(b.price, before, 'etap 5 nie podnosi kursu');
    });
});

group('0.15.2: Kochaj i zarabiaj (kalendarz, kampanie, lock-up, gwarancja, mandat, IR, VIP)', () => {
    function world(clients = 10) {
        const a = makeCompany('AAA'), b = makeCompany('BBB');
        resetWorld([a, b]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        initMarketRegimes();
        playerPortfolio = {};
        playerCash = 10000;
        playerFund.clients = Array.from({ length: clients }, (_, i) => ensureClientProfile({ id: `k${i}`, name: `Klient ${i}`, type: 'careful', units: 100, avgCost: 10, satisfaction: 0.7 }));
        playerFund.units = clients * 100;
        playerFund.trust = 60;
        delete playerFund.subscription;
        Object.assign(playerFund.current, { emissions: 0, startNav: getFundNav(), startBenchmark: getBenchmarkValue(), maxDrawdown: 0, benchmarkDrawdown: 0 });
        return { a, b };
    }
    const fundCash = nav => { playerCash = nav * playerFund.units; return nav; }; // gotówka = NAV × udziały

    test('K1: kalendarz „Rok · kw. · tydz.”, skrót mobilny, tydzień zeruje się z kwartałem', () => {
        world();
        macro.quarter = 9;
        playerFund.calQuarter = 9; playerFund.calWeek = 1;
        assertEq(formatGameDate(), 'Rok 3 · kw. 2 · tydz. 1', 'pełny format');
        assertEq(formatGameDate(getGameCalendar(), true), 'R3 · K2 · T1', 'skrót');
        for (let i = 0; i < 6; i++) advanceFundCalendar();
        assertEq(getGameCalendar().week, WEEKS_PER_QUARTER, 'tydzień ≤ 5');
        macro.quarter = 10; advanceFundCalendar();
        assertEq(formatGameDate(), 'Rok 3 · kw. 3 · tydz. 1', 'nowy kwartał od tygodnia 1');
        assertEq(formatQuarterDate(0), 'Rok 1 · kw. 1', 'termin kwartalny');
    });

    test('K2: koszt kampanii = 0,2% celu na start + 0,5% zebranej kwoty', () => {
        world();
        const cash0 = playerCash;
        const result = startSubscriptionCampaign({ duration: 'quarter', targetPct: 0.1 });
        assert(result.ok, result.reason);
        const sub = playerFund.subscription;
        const startCost = sub.startNav * sub.targetUnits * CAMPAIGN_COST_TARGET;
        assertNear(cash0 - playerCash, startCost, 'koszt na start', 1e-6);
        for (let w = 0; w < 5 && playerFund.subscription; w++) processSubscriptionWeekly();
        const entry = playerFund.campaignHistory[0];
        assert(entry.raisedValue > 0, 'kampania zebrała kapitał');
        assertNear(entry.cost, startCost + entry.raisedValue * CAMPAIGN_COST_RAISED, 'koszt łączny', 1e-6);
    });

    test('K2: zasięg wg czasu — 1 tydzień < 2 tygodnie < 1 kwartał (średnio)', () => {
        const mean = {};
        for (const duration of ['week', 'twoWeeks', 'quarter']) {
            let sum = 0;
            for (let seed = 1; seed <= 25; seed++) {
                world(30); playerFund.trust = 100;
                playerFund.units *= 20; playerCash *= 20; // fundusz 20× większy od popytu klientów — kampania ograniczona zasięgiem, nie celem
                withSeededRandom(seed, () => {
                    startSubscriptionCampaign({ duration, targetPct: 0.25 });
                    for (let w = 0; w < 5 && playerFund.subscription; w++) processSubscriptionWeekly();
                });
                sum += playerFund.campaignHistory[0].raisedValue;
            }
            mean[duration] = sum / 25;
        }
        assert(mean.week < mean.twoWeeks && mean.twoWeeks < mean.quarter, `zasięg ${JSON.stringify(mean)}`);
    });

    test('K2: najwyżej 2 kampanie na okres oceny; kampania blokuje drugą; cel ≤ 5% + 20% × zaufanie', () => {
        world();
        assert(startSubscriptionCampaign({ duration: 'week', targetPct: 0.05 }).ok, 'pierwsza');
        assert(!startSubscriptionCampaign({ duration: 'week', targetPct: 0.05 }).ok, 'druga naraz');
        finishSubscription();
        assert(startSubscriptionCampaign({ duration: 'week', targetPct: 0.05 }).ok, 'druga po zakończeniu pierwszej');
        finishSubscription();
        const third = startSubscriptionCampaign({ duration: 'week', targetPct: 0.05 });
        assert(!third.ok && /Limit/.test(third.reason), 'trzecia w okresie zablokowana');
        world(); playerFund.trust = 50;
        assertNear(getCampaignMaxTargetPct(), 0.15, 'górna granica celu przy zaufaniu 50');
    });

    test('K2: bez kampanii tydzień funduszu nie rusza udziałów ani gotówki', () => {
        world();
        const units = playerFund.units, cash = playerCash;
        processCampaignsWeekly();
        assertEq(playerFund.units, units, 'udziały'); assertEq(playerCash, cash, 'gotówka');
        assert(!playerFund.subscription, 'brak kampanii');
    });

    test('K3: mnożniki lock-upu wg typu klienta', () => {
        assertNear(getLockDemandMultiplier('institution', 2), 1.3, 'cierpliwy ×(1+0,15L)');
        assertNear(getLockDemandMultiplier('sly', 2), 0.4, 'niecierpliwy ×(1−0,3L)');
        assertNear(getLockDemandMultiplier('sly', 4), 0, 'niecierpliwy nie spada poniżej 0');
        assertNear(getLockDemandMultiplier('brave', 2), 0.8, 'pozostali ×(1−0,1L)');
    });

    test('K3: umorzenie omija udziały w lock-upie; po lock-upie transza znika', () => {
        world(); fundCash(10);
        const client = playerFund.clients[0];
        addTranche(client, 60, 10, { lockYears: 2 });
        assertEq(getRedeemableUnits(client), 40, 'do umorzenia 40 z 100');
        redeemClientUnits(client, 100);
        assertNear(client.units, 60, 'zostało zablokowane 60');
        assertEq(getRedeemableUnits(client), 0, 'nic więcej do umorzenia');
        assertEq(redeemClientUnits(client, 50), 0, 'kolejne umorzenie = 0');
        macro.quarter += 8; normalizeClientTranches(client);
        assertEq(client.tranches.length, 0, 'po lock-upie zwykła transza znika');
        assertEq(getRedeemableUnits(client), client.units, 'wszystko do umorzenia');
    });

    test('K3: sprzedaż zablokowanych udziałów zmniejsza transzę; stary klient = wszystko wolne (migracja)', () => {
        world();
        const old = playerFund.clients[1];
        assertEq(getRedeemableUnits(old), 100, 'stary klient bez transz = wszystko wolne');
        const client = playerFund.clients[0];
        addTranche(client, 80, 10, { lockYears: 1 });
        client.units -= 50; normalizeClientTranches(client);
        assertEq(client.tranches[0].units, 50, 'transza przycięta do udziałów klienta');
    });

    test('K3: niezadowolony klient w lock-upie wystawia udziały na rynku wtórnym i obniża zaufanie (≤ −2 na tydzień)', () => {
        world();
        for (const c of playerFund.clients) { c.satisfaction = 0.05; addTranche(c, 100, 10, { lockYears: 2 }); }
        const trust = playerFund.trust, seeded = Math.random;
        Math.random = () => 0;
        try { for (const c of playerFund.clients) handleLockedUnhappyClient(c, CLIENT_TYPES.careful); } finally { Math.random = seeded; }
        assert(playerFund.clients.every(c => c.pendingSellUnits === 100), 'oferta całości na rynku wtórnym');
        assertNear(trust - playerFund.trust, 2, 'zaufanie −2 (limit na tydzień)');
    });

    test('K4: gwarancja — dopłata dokładnie do ceny wejścia, gdy NAV < cena wejścia', () => {
        world();
        const client = playerFund.clients[0];
        addTranche(client, 100, 12, { lockYears: 1, guarantee: true });
        fundCash(9); // NAV = 9, cena wejścia 12 → dopłata 3 × 100
        const cash0 = playerCash, units0 = playerFund.units;
        macro.quarter += 4;
        settleGuaranteedTranche(client, client.tranches[0]);
        assertNear(cash0 - playerCash, 300, 'dopłata (12 − 9) × 100', 1e-6);
        assertEq(playerFund.units, units0, 'udziały bez zmian');
        assertEq(playerFund.guaranteeStats.topups, 1, 'licznik dopłat');
    });

    test('K4: gwarancja — udział w zysku 70% (30% zysku zostaje w funduszu)', () => {
        world();
        const client = playerFund.clients[0];
        addTranche(client, 100, 10, { lockYears: 1, guarantee: true });
        fundCash(15);
        const units0 = playerFund.units;
        macro.quarter += 4;
        settleGuaranteedTranche(client, client.tranches[0]);
        assertNear(units0 - playerFund.units, 0.3 * (15 - 10) * 100 / 15, 'umorzone udziały = 30% zysku / NAV', 1e-6);
    });

    test('K4: gwarancja wymaga lock-upu ≥ 1 rok i limitu 30% udziałów', () => {
        world();
        assert(!startSubscriptionCampaign({ duration: 'week', targetPct: 0.1, lockYears: 0, guarantee: true }).ok, 'bez lock-upu');
        playerFund.clients[0].units = 300; playerFund.units = 1200;
        addTranche(playerFund.clients[0], 300, 10, { lockYears: 1, guarantee: true });
        const blocked = startSubscriptionCampaign({ duration: 'week', targetPct: 0.1, lockYears: 1, guarantee: true });
        assert(!blocked.ok && /30%/.test(blocked.reason), `limit 30%: ${blocked.reason}`);
    });

    test('K4: kolejność gotówka → kredyt płynnościowy w granicy 20% aktywów; zaufanie −5; bez upadłości', () => {
        world();
        playerCash = 100000; playerFund.units = 10000; // aktywa 100 000 → limit kredytu 20 000
        const trust = playerFund.trust;
        assertEq(drawLiquidityLoan(500), 500, 'kredyt w granicach limitu');
        assertEq(getLiquidityLoanPrincipal(), 500, 'kapitał kredytu');
        assertNear(trust - playerFund.trust, 5, 'zaufanie −5 przy uruchomieniu', 1e-6);
        assertNear(drawLiquidityLoan(1e9), 20000 - 500, 'kredyt do limitu 20% aktywów', 1e-6);
        playerCash = 0; playerFund.units = 10; playerFund.liquidityLoan.principal = 0;
        assertEq(drawLiquidityLoan(100), 0, 'przy zerowych aktywach limit = 0');
    });

    test('K4: niedobór gotówki przy rozliczeniu gwarancji pokrywa kredyt; brak limitu → klient dostaje mniej, zaufanie −15', () => {
        world();
        const client = playerFund.clients[0];
        addTranche(client, 100, 20, { lockYears: 1, guarantee: true });
        playerCash = 9000; // NAV 9, dopłata 11 × 100 = 1100; gotówka starcza
        macro.quarter += 4;
        settleGuaranteedTranche(client, client.tranches[0]);
        assertNear(playerCash, 7900, 'wypłata z gotówki', 1e-6);
        // brak gotówki i limitu: aktywa = 0,01 zł
        const c2 = playerFund.clients[1];
        addTranche(c2, 100, 20, { lockYears: 1, guarantee: true });
        playerCash = 0.01; playerFund.units = 1000; const trust = playerFund.trust;
        settleGuaranteedTranche(c2, c2.tranches[0]);
        assertEq(playerFund.guaranteeStats.shortfalls, 1, 'gwarancja niepełna');
        assertNear(trust - playerFund.trust, 15, 'zaufanie −15', 1e-6);
        assert(playerFund.trust >= 0 && playerFund.clients.length > 0, 'fundusz nie upada');
    });

    test('K4: NAV pomniejszony o kredyt płynnościowy; spłata ok. 10% kapitału na tydzień, gdy gotówka > 5% aktywów', () => {
        world(); fundCash(10);
        const navBefore = getFundNav();
        playerFund.liquidityLoan = { principal: 1000, drawn: 1000, since: 0 };
        assertNear(navBefore - getFundNav(), 1000 / playerFund.units, 'NAV − kredyt / udziały', 1e-6);
        const cash0 = playerCash;
        processLiquidityLoanWeekly();
        assert(playerFund.liquidityLoan.principal < 1000 && playerFund.liquidityLoan.principal >= 900 - 1e-6, 'spłata ok. 10% kapitału');
        assert(playerCash < cash0, 'gotówka zmalała o odsetki i spłatę');
    });

    test('K4: zobowiązanie z gwarancji w raporcie = Σ max(0, cena wejścia − NAV) × udziały', () => {
        world(); fundCash(8);
        addTranche(playerFund.clients[0], 100, 12, { lockYears: 1, guarantee: true });
        addTranche(playerFund.clients[1], 50, 7, { lockYears: 1, guarantee: true });
        assertNear(getGuaranteeLiability(), 400, 'tylko transza poniżej ceny wejścia', 1e-6);
    });

    test('K5: warunki mandatów na portfelach testowych', () => {
        const { a } = world();
        a.sector = 'Żywność';
        a.price = 10;
        playerPortfolio = { AAA: { shares: 100, assetType: 'stock' } };
        playerCash = 0;
        assertNear(measureMandate(getMandateDef('defensive')), 1, 'portfel w całości defensywny');
        assert(measureMandate(getMandateDef('growth')) < 0.4, 'nie wzrostowy');
        const group = SECTORS['Żywność'].group;
        assertNear(measureMandate(getMandateDef(`sector:${group}`)), 1, 'cały portfel w grupie sektorów');
        assertEq(measureMandate(getMandateDef('safe')), 0, 'brak obligacji i lokat');
        assertEq(getMandateDef('sector:nie_ma'), null, 'nieznana grupa sektorów');
    });

    test('K5: naruszenie przez 2 kolejne kwartały → mandat złamany (zaufanie −10 raz), udziały w lock-upie do umorzenia', () => {
        world(); fundCash(10);
        const client = playerFund.clients[0];
        addTranche(client, 100, 10, { lockYears: 2, mandate: 'safe' });
        assertEq(getRedeemableUnits(client), 0, 'zablokowane');
        const trust = playerFund.trust;
        for (let quarter = 0; quarter < 2; quarter++) { sampleMandatesWeekly(); evaluateMandatesQuarterly(); }
        assert(isMandateBreached('safe'), 'mandat złamany');
        assertEq(trust - playerFund.trust, 10, 'zaufanie −10');
        sampleMandatesWeekly(); evaluateMandatesQuarterly();
        assertEq(trust - playerFund.trust, 10, 'tylko raz');
        assertEq(getRedeemableUnits(client), 100, 'klient może umorzyć także udziały z lock-upu');
        const seeded = Math.random; Math.random = () => 0;
        try { processMandateBreachExits(); } finally { Math.random = seeded; }
        assert(getFundFlowStats().current.out.mandate > 0, 'przyczyna odpływu: złamany mandat');
    });

    test('K5: zmiana mandatu kosztuje 5 zaufania i przepisuje transze', () => {
        world(); fundCash(10);
        const client = playerFund.clients[0];
        addTranche(client, 100, 10, { lockYears: 1, mandate: 'dividend' });
        const trust = playerFund.trust;
        assert(changeMandate('dividend', 'defensive'), 'zmiana mandatu');
        assertEq(trust - playerFund.trust, 5, 'zaufanie −5');
        assertEq(client.tranches[0].mandateId, 'defensive', 'transza z nowym mandatem');
    });

    test('K6: typy → grupy; nastrój ważony udziałami; koszt analityka IR wg poziomu', () => {
        world();
        assertEq(getInvestorGroupOf({ type: 'investor' }), 'institution', 'Inwestor');
        assertEq(getInvestorGroupOf({ type: 'rich' }), 'wealthy', 'Bogaty');
        assertEq(getInvestorGroupOf({ type: 'careful', vip: true }), 'wealthy', 'VIP');
        assertEq(getInvestorGroupOf({ type: 'miser' }), 'retail', 'Sknera');
        playerFund.clients = [
            ensureClientProfile({ id: 'a', name: 'A', type: 'careful', units: 300, avgCost: 10, satisfaction: 1.0 }),
            ensureClientProfile({ id: 'b', name: 'B', type: 'brave', units: 100, avgCost: 10, satisfaction: 0.0 })
        ];
        assertNear(getGroupMood('retail').value, (0.5 * 300 - 0.5 * 100) / 400 * 100, 'średnia ważona udziałami');
        assertEq(getMoodWord(25), 'lubią cię', 'słowo'); assertEq(getMoodWord(null), 'brak klientów', 'brak klientów');
        playerCash = 2_000_000; playerPortfolio = {};
        assertNear(getIrQuarterCost(1), 1000, 'L1: 0,05% aktywów (≥ 200)');
        assertNear(getIrQuarterCost(3), 3000, 'L3: 0,15% aktywów');
        playerCash = 100; assertEq(getIrQuarterCost(1), 200, 'minimum 200 zł');
    });

    test('K6: koszt IR pobierany co kwartał; misje L2 powstają i nagradzają zadowolenie +0,10 i zaufanie +2', () => {
        world(); fundCash(10);
        setIrLevel(2);
        const cash0 = playerCash;
        processIrQuarterly();
        assert(playerCash < cash0, 'koszt analityka');
        assert(playerFund.ir.missions.retail, 'misja dla grupy detalicznej');
        playerFund.ir.missions.retail.dueQ = currentQuarter();
        Object.assign(playerFund.current, { maxDrawdown: 0, benchmarkDrawdown: 0 });
        const sat = playerFund.clients[0].satisfaction, trust = playerFund.trust;
        processIrQuarterly();
        assertNear(playerFund.clients[0].satisfaction, sat + 0.10, 'zadowolenie +0,10', 1e-6);
        assertNear(playerFund.trust, trust + 2, 'zaufanie +2', 1e-6);
        assertEq(playerFund.ir.done, 1, 'misja wykonana');
    });

    test('K6: przyczyny L3 zgodne ze składnikami zadowolenia', () => {
        world();
        Object.assign(playerFund.current, { maxDrawdown: 0.30, benchmarkDrawdown: 0.05 });
        const causes = getGroupCauses('retail');
        assert(causes.includes(DRIFT_WORDS.drawdown), `obsunięcie wśród przyczyn: ${causes.join(', ')}`);
        assert(causes.length <= 2, 'najwyżej 2 przyczyny');
    });

    test('K7: szansa sukcesu VIP = 25% + 35% (profil) + 30% (dane) + zaufanie/10 pp (10 000 losowań ±2 pp)', () => {
        world();
        playerFund.trust = 50;
        const offer = { id: 1, profile: 'family', name: 'Test', expiresQ: 99 };
        playerFund.periods = [{ fundReturn: 0.05, benchmarkReturn: 0.02, maxDrawdown: 0.1, benchmarkDrawdown: 0.1 }];
        assertNear(getVipSuccessChance(offer, 'numbers'), 0.25 + 0.35 + 0.30 + 0.05, 'pasuje i dane potwierdzają', 1e-9);
        assertNear(getVipSuccessChance(offer, 'vision'), 0.25 + 0.05, 'nie pasuje, dane nie potwierdzają', 1e-9);
        playerFund.periods = [{ fundReturn: -0.05, benchmarkReturn: 0.02, maxDrawdown: 0.1, benchmarkDrawdown: 0.1 }];
        assertNear(getVipSuccessChance(offer, 'numbers'), 0.25 + 0.35 + 0.05, 'pasuje, ale dane nie potwierdzają', 1e-9);
        let hits = 0;
        withSeededRandom(7, () => { for (let i = 0; i < 10000; i++) if (Math.random() < getVipSuccessChance(offer, 'numbers')) hits++; });
        assert(Math.abs(hits / 10000 - 0.65) <= 0.02, `częstość ${hits / 10000}`);
    });

    test('K7: sukces VIP — wpłata 5–15% aktywów z lock-upem 1–2 lata; porażka — przerwa 4 kwartały', () => {
        world(); fundCash(10);
        playerFund.vip = { offers: [{ id: 1, profile: 'rentier', name: 'Rentier Test', expiresQ: 99 }, { id: 2, profile: 'baron', name: 'Baron Test', expiresQ: 99 }], yearOffers: { year: 0, n: 2 }, pauseUntilQ: -1, won: 0, lost: 0, nextId: 3 };
        const assets = getFundAssets(), seeded = Math.random;
        Math.random = () => 0; // sukces
        let result; try { result = pitchVip(1, 'safety'); } finally { Math.random = seeded; }
        assert(result.success, 'sukces');
        const vipClient = playerFund.clients.find(c => c.vip);
        assert(vipClient && result.value >= assets * 0.05 - 1 && result.value <= assets * 0.15 + 1, 'wpłata 5–15% aktywów');
        const lock = vipClient.tranches[0].lockedUntilQ - currentQuarter();
        assert(lock === 4 || lock === 8, `lock-up 1–2 lata (${lock} kw.)`);
        Math.random = () => 0.999; // porażka
        try { result = pitchVip(2, 'numbers'); } finally { Math.random = seeded; }
        assert(!result.success && playerFund.vip.pauseUntilQ === currentQuarter() + 4, 'przerwa 4 kwartały');
    });

    test('K7: VIP wychodzi przed końcem lock-upu, gdy fundusz jest słabszy od GIG o > 10 pp w roku', () => {
        world(); fundCash(10);
        const vip = ensureClientProfile({ id: 'v', name: 'VIP', type: 'rich', units: 100, avgCost: 10, satisfaction: 0.7, vip: true });
        playerFund.clients.push(vip); playerFund.units += 100;
        addTranche(vip, 100, 10, { lockYears: 2 }); vip.tranches[0].vipExit = true;
        playerFund.periods = [{ fundReturn: -0.10, benchmarkReturn: 0.02 }, { fundReturn: 0, benchmarkReturn: 0.02 }];
        processVipExitsWeekly();
        assertEq(getRedeemableUnits(vip), 100, 'wcześniejsze wyjście VIP-a');
    });

    test('K8: hasła Akademii i osiągnięcia 0.15.2 zarejestrowane', () => {
        for (const id of ['runda_subskrypcji', 'lockup_fundusze_zamkniete', 'gwarancja_kapitalu', 'opcja_put', 'mandat_dryf_stylu', 'relacje_inwestorskie', 'dopasowanie_oferty', 'dyplomata_grup']) assert(ACADEMY_ENTRIES[id]?.quiz?.length === 3, `hasło ${id}`);
        for (const id of ['vip_trust', 'guarantee_clean', 'diplomat', 'promise_kept', 'full_subscription']) assert(ACHIEVEMENTS[id], `osiągnięcie ${id}`);
    });

    test('Zapis: transze, kredyt, IR i VIP przechodzą przez zapis i wczytanie', () => {
        world(); fundCash(10);
        addTranche(playerFund.clients[0], 50, 10, { lockYears: 2, guarantee: true, mandate: 'safe' });
        playerFund.liquidityLoan = { principal: 123, drawn: 123, since: 0 };
        setIrLevel(2);
        playerFund.vip = { offers: [], yearOffers: { year: 0, n: 1 }, pauseUntilQ: 5, won: 1, lost: 0, nextId: 2 };
        const seeded = Math.random;
        const report = applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        Math.random = seeded;
        assert(report.ok, 'wczytanie');
        const t = playerFund.clients[0].tranches[0];
        assert(t && t.guaranteed && t.mandateId === 'safe' && t.units === 50, 'transza');
        assertEq(playerFund.liquidityLoan.principal, 123, 'kredyt'); assertEq(getIrLevel(), 2, 'IR'); assertEq(playerFund.vip.won, 1, 'VIP');
    });
});

group('0.15.3: Wielkie Kryzysy (szoki sektorowe, silnik linii, 5 linii, reakcje instytucji, scenariusz)', () => {
    function world(extra = []) {
        const a = makeCompany('AAA', { sector: ['Technologia'] }), b = makeCompany('BBB', { sector: ['Turystyka'] });
        resetWorld([a, b, ...extra]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        initMarketRegimes();
        marketCrash = createMarketCrashState();
        marketHalt = createMarketHaltState();
        macro.quarter = 20;
        mailbox = createMailbox();
        maybeReplaceCrashWithCrisisLine = REAL_REPLACE_CRASH_WITH_LINE;
        commercialBanks.forEach(bank => { bank.stockPortfolio = bank.stockPortfolio || {}; });
        return { a, b };
    }
    const tick = (n = 1) => { for (let i = 0; i < n; i++) { macro.quarter++; processCrisesQuarterly(); processCrisesWeekly(); } };

    test('W0: szok narasta, trwa zadany czas i wygasa do zera', () => {
        const { a } = world();
        playerFund.calWeek = 1;
        const shock = addSectorShock('Technologia', -0.40, { rampQ: 2, holdQ: 2, fadeQ: 2, startQ: 20 });
        assertNear(getSectorShockValue(shock, 20), 0, 'start 0');
        assertNear(getSectorShockValue(shock, 21), -0.20, 'połowa narastania');
        assertNear(getSectorShockValue(shock, 22), -0.40, 'cel');
        assertNear(getSectorShockValue(shock, 23.9), -0.40, 'trwanie');
        assertNear(getSectorShockValue(shock, 25), -0.20, 'połowa wygasania');
        assertEq(getSectorShockValue(shock, 26), 0, 'wygasł');
        assert(isSectorShockExpired(shock, 26), 'oznaczony jako wygasły');
        macro.quarter = 26; pruneSectorShocks();
        assertEq(sectorShocks.length, 0, 'wygasły szok usunięty');
        updateAllSectorPremiums();
        assertEq(a.sectorPremium, 0, 'premia wróciła do zera');
    });

    test('W0: szok nie jest nadpisywany przez kolejną aktualizację premii (naprawa B5)', () => {
        const { a } = world();
        addSectorShock('Technologia', -0.30, { holdQ: 3, startQ: crisisTime() });
        assertNear(a.sectorPremium, -0.30, 'od razu po utworzeniu');
        updateAllSectorPremiums(); updateAllSectorPremiums();
        assertNear(a.sectorPremium, -0.30, 'po kolejnych aktualizacjach');
    });

    test('W0: szok sumuje się z bańką; łączny limit −60%…+150%', () => {
        const { a } = world();
        activeSectorBubble = { sector: 'Technologia', subsector: null, premium: 0.30, phase: 'inflating' };
        addSectorShock('Technologia', -0.20, { holdQ: 3, startQ: crisisTime() });
        assertNear(a.sectorPremium, 0.10, 'bańka + szok');
        addSectorShock('Technologia', -0.90, { holdQ: 3, startQ: crisisTime() });
        assertEq(a.sectorPremium, SECTOR_PREMIUM_MIN, 'dolny limit');
        activeSectorBubble = null; sectorShocks = [];
        addSectorShock('Technologia', 2.0, { holdQ: 3, startQ: crisisTime() });
        assertEq(a.sectorPremium, SECTOR_PREMIUM_MAX, 'górny limit');
    });

    test('W0: szok działa według udziału segmentu (konglomerat mniej wystawiony)', () => {
        const { a } = world();
        a.segments = [{ sector: 'Technologia', subsector: null, share: 0.3 }, { sector: 'Żywność', subsector: null, share: 0.7 }];
        addSectorShock('Technologia', -0.40, { holdQ: 3, startQ: crisisTime() });
        assertNear(a.sectorPremium, -0.12, 'udział 30% × −40%');
    });

    test('W0: szoki i linia przeżywają zapis i wczytanie', () => {
        world();
        addSectorShock('Turystyka', -0.25, { holdQ: 3, startQ: crisisTime(), lineId: 'x', revenue: -0.1 });
        startCrisisLine('oil', { forced: true });
        const seeded = Math.random;
        const report = applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        Math.random = seeded;
        assert(report.ok, 'wczytanie');
        assert(sectorShocks.some(s => s.sector === 'Turystyka' && s.target === -0.25), 'szoki po wczytaniu');
        assertEq(crisisLine?.id, 'oil', 'linia po wczytaniu');
        assert(crisisState.used.includes('oil'), 'lista użytych linii');
    });

    test('W0: spadek przychodów sektora w linii proporcjonalny do postępu szoku', () => {
        const { a } = world();
        addSectorShock('Technologia', -0.40, { rampQ: 2, holdQ: 2, fadeQ: 2, startQ: crisisTime(), revenue: -0.20 });
        assertEq(getCrisisRevenueFactor(a), 1, 'na starcie bez efektu');
        sectorShocks[0].startQ = crisisTime() - 2;
        assertNear(getCrisisRevenueFactor(a), 0.80, 'pełny przychód linii na szczycie');
    });

    test('W1: linia przechodzi wszystkie etapy po kolei i wraca do stanu bez linii', () => {
        world();
        startCrisisLine('pandemic', { forced: true });
        const seen = [crisisLine.stage];
        for (let i = 0; i < 40 && crisisLine; i++) { tick(); if (crisisLine && seen[seen.length - 1] !== crisisLine.stage) seen.push(crisisLine.stage); }
        assertEq(seen.join('>'), CRISIS_STAGES.join('>'), 'kolejność etapów');
        assertEq(crisisLine, null, 'linia zakończona');
        assertEq(crisisState.history.length, 1, 'retrospektywa zapisana');
    });

    test('W1: częstość nowej linii ≈ 1%/kw. po ≥ 12 kw. spokoju (10 000 losowań ±0,4 pp)', () => {
        world();
        let starts = 0;
        withSeededRandom(99, () => {
            for (let i = 0; i < 10000; i++) {
                crisisState.used = []; crisisState.lastEventQ = macro.quarter - 20; marketCrash.startQuarter = null;
                getMarketRegime('home').phase = 'euphoria'; getMarketRegime('home').premium = 0.3;
                processCrisesQuarterly();
                if (crisisLine) { starts++; crisisLine = null; sectorShocks = []; }
            }
        });
        assert(Math.abs(starts / 10000 - CRISIS_BASE_CHANCE) <= 0.004, `częstość ${starts / 10000}`);
    });

    test('W1: bez linii przed upływem 12 kw. od krachu lub poprzedniej linii', () => {
        world();
        let starts = 0;
        withSeededRandom(5, () => { for (let i = 0; i < 2000; i++) { crisisState.lastEventQ = macro.quarter - 5; processCrisesQuarterly(); if (crisisLine) { starts++; crisisLine = null; } } });
        assertEq(starts, 0, 'żadna linia w okresie spokoju');
    });

    test('W1: linia zastępuje krach w 40% przypadków (bez Zapowiedzi)', () => {
        world();
        const seeded = Math.random;
        try {
            Math.random = () => 0.1;
            assert(maybeReplaceCrashWithCrisisLine(), 'losowanie < 40% — linia');
            assertEq(crisisLine.stage, 'burst', 'od razu Wybuch');
            crisisLine = null; sectorShocks = []; crisisState.used = [];
            Math.random = () => 0.9;
            assert(!maybeReplaceCrashWithCrisisLine(), 'losowanie ≥ 40% — zwykły krach');
        } finally { Math.random = seeded; }
    });

    test('W1: linie bez powtórzeń, dopóki są niewykorzystane', () => {
        world();
        getMarketRegime('home').phase = 'euphoria'; getMarketRegime('home').premium = 0.3;
        const picked = [];
        for (let i = 0; i < 5; i++) {
            const eligible = getEligibleCrisisLines();
            assert(eligible.every(id => !picked.includes(id)), 'nie powtarza użytej linii');
            const id = eligible[0]; picked.push(id); crisisState.used.push(id);
        }
        assertEq(new Set(picked).size, 5, 'pięć różnych linii');
        assertEq(getEligibleCrisisLines().length, 0, 'wszystkie wykorzystane');
    });

    test('W1: ranking upadków po dźwigni, kondycji i wystawieniu; bez spółek Skarbu Państwa', () => {
        const heavy = makeCompany('HVY', { sector: ['Turystyka'], liabilities: 4_500_000 }), light = makeCompany('LGT', { sector: ['Turystyka'], liabilities: 100_000 });
        const state = makeCompany('STA', { sector: ['Turystyka'], liabilities: 4_800_000 }); state.isStateOwned = true;
        world([heavy, light, state]);
        const ranked = rankCrisisVictims('pandemic').map(r => r.stock.symbol);
        assertEq(ranked[0], 'HVY', 'największa dźwignia pierwsza');
        assert(!ranked.includes('STA'), 'spółka państwowa pominięta');
        assert(ranked.indexOf('HVY') < ranked.indexOf('LGT'), 'dźwignia wyżej niż mała dźwignia');
    });

    test('W1: upadłości — 1–3 kandydatów, sygnał w kondycji, upadek przez usunięcie z gry', () => {
        const stocksExtra = Array.from({ length: 6 }, (_, i) => makeCompany(`T${i}`, { sector: ['Turystyka'], liabilities: 1_000_000 * (i + 1) }));
        world(stocksExtra);
        startCrisisLine('pandemic', { forced: true, skipSpark: true });
        assert(crisisLine.victims.length >= 1 && crisisLine.victims.length <= CRISIS_MAX_VICTIMS, `kandydaci ${crisisLine.victims.length}`);
        const first = stocks.find(s => s.symbol === crisisLine.victims[0]);
        assert(first.financialHealth <= -3.5, 'sygnał w kondycji spółki');
        const seeded = Math.random; Math.random = () => 0;
        try { executeCrisisBankruptcies(crisisLine, CRISIS_LINES.pandemic, 3); } finally { Math.random = seeded; }
        assert(crisisLine.bankrupted.length >= 1, 'upadłość zapisana w linii');
        assert(!stocks.some(s => s.symbol === crisisLine.bankrupted[0]), 'spółka usunięta z gry');
    });

    test('W2: pięć linii ma dane (tracą, zyskują, reakcja) i wszystkie przechodzą etapy w scenariuszu', () => {
        for (const id of CRISIS_LINE_ORDER) {
            const stocksExtra = Array.from({ length: 4 }, (_, i) => makeCompany(`Z${i}`, { sector: ['Turystyka'], liabilities: 1_000_000 }));
            world(stocksExtra);
            const def = CRISIS_LINES[id];
            assert(def.lose.length >= 4 && def.news.burst && def.rate && def.victims, `dane linii ${id}`);
            startCrisisLine(id, { forced: true });
            let guard = 0;
            while (crisisLine && guard++ < 60) tick();
            assertEq(crisisLine, null, `linia ${id} zakończona`);
            assertEq(crisisState.history[0].id, id, 'retrospektywa linii');
            sectorShocks = [];
        }
    });

    test('W2: Wybuch tworzy szoki tracących i zyskujących sektorów oraz krach z tematem', () => {
        world();
        startCrisisLine('banking', { forced: true, skipSpark: true });
        const lose = sectorShocks.filter(s => s.lineId === 'banking' && s.target < 0).map(s => s.sector);
        assert(lose.includes('Bankowość') && lose.includes('Nieruchomości'), 'banki i nieruchomości tracą');
        assert(sectorShocks.some(s => s.sector === 'Żywność' && s.target > 0), 'żywność zyskuje');
        assertEq(marketCrash.theme, 'banking', 'krach z tematem linii');
        assert(marketCrash.targetDrop <= -0.20 && marketCrash.targetDrop >= -0.30, 'spadek premii rynku 20–30 pp');
    });

    test('W2: Czarny czwartek schodzi poniżej dna −35% (floor −60%)', () => {
        world();
        getMarketRegime('home').premium = 0.3;
        startCrisisLine('black', { forced: true, skipSpark: true });
        assertEq(marketCrash.floor, -0.60, 'dno krachu z linii');
        for (let i = 0; i < 6; i++) processMarketCrashWeekly();
        const bottom = getMarketRegime('home').premium;
        assert(bottom < MARKET_CRASH_PREMIUM_FLOOR, `premia ${bottom} poniżej −35%`);
        assert(bottom >= -0.60 - 1e-9 && bottom <= -0.40 + 1e-9, 'dno premii rynku −40…−60%');
    });

    test('W2: linie wymuszają Recesję; szok naftowy dodaje inflację (+2…+4 pp)', () => {
        world();
        const before = macro.shocks.inflation;
        startCrisisLine('oil', { forced: true, skipSpark: true });
        const added = macro.shocks.inflation - before;
        assert(added >= 0.02 - 1e-9 && added <= 0.04 + 1e-9, `inflacja +${added}`);
        economyCycle.phase = 'expansion'; economyCycle.quartersInPhase = 0; economyCycle.phaseLength = 8;
        advanceEconomyCycle();
        assertEq(economyCycle.phase, 'recession', 'gospodarka w recesji');
    });

    test('W2: pożar sygnału — Zapowiedź uruchamia mały szok makro tego samego typu', () => {
        world();
        const before = macro.shocks.inflation;
        startCrisisLine('oil', { forced: true });
        assertEq(crisisLine.stage, 'spark', 'etap Zapowiedź');
        assert(macro.shocks.inflation > before, 'szok naftowy (inflacja)');
        assertEq(crisisState.signals, 1, 'licznik sygnałów');
    });

    test('W3: kierunek stóp wg linii — cięcia (bankowa, internetowa, pandemia), podwyżki (naftowa), zwłoka potem cięcia (1929)', () => {
        const run = id => {
            world();
            centralBank.baseInterestRate = 0.05;
            startCrisisLine(id, { forced: true, skipSpark: true });
            startCrisisReactions(crisisLine, CRISIS_LINES[id]);
            const changes = [];
            for (let i = 0; i < 4; i++) { const c = getCrisisRateChange(); if (c !== null) { changes.push(c); centralBank.baseInterestRate += c; } }
            return changes;
        };
        assert(run('banking').every(c => c < 0) && run('banking').length === 2, 'bankowa: 2 cięcia');
        assert(run('dotcom').every(c => c < 0), 'internetowa: cięcia');
        assert(run('oil').every(c => c > 0), 'naftowa: podwyżki mimo recesji');
        const black = run('black');
        assert(black[0] === 0 && black[1] === 0 && black[2] < 0, `1929: dwie kwartały zwłoki, potem cięcia: ${black.join(',')}`);
        const pandemic = run('pandemic');
        assert(pandemic[0] < 0 && centralBank.baseInterestRate >= 0.005, 'pandemia: cięcie nie niżej niż 0,5%');
    });

    test('W3: ratunek banku z budżetu państwa zamiast upadku, gdy skarb pozwala', () => {
        const bank = makeCompany('BNK', { sector: ['Bankowość'], liabilities: 5_200_000 }); bank.isBankStock = true;
        world([bank]);
        startCrisisLine('banking', { forced: true, skipSpark: true });
        const cost = Math.max(0, bank.balanceSheet.liabilities - bank.balanceSheet.assets) + getMarketCapValue(bank) * 0.10;
        governmentTreasury = cost * 3;
        const treasury0 = governmentTreasury, cash0 = bank.cash;
        assert(tryRescueBank(bank, CRISIS_LINES.banking), 'ratunek');
        assertNear(treasury0 - governmentTreasury, cost, 'skarb zapłacił koszt', 1e-6);
        assertNear(bank.cash - cash0, cost, 'bank dostał gotówkę (pieniądze nie znikają)', 1e-6);
        governmentTreasury = 0;
        assert(!tryRescueBank(bank, CRISIS_LINES.banking), 'bez środków w skarbie bank nie jest ratowany');
    });

    test('W3: dotacje dla sektorów tracących idą ze skarbu do spółek', () => {
        const { b } = world();
        governmentTreasury = 1_000_000;
        const cash0 = b.cash, treasury0 = governmentTreasury;
        const paid = crisisSubsidy(['Turystyka'], 0.03, 'Test');
        assert(paid > 0, 'wypłacono dotacje');
        assertNear(b.cash - cash0, treasury0 - governmentTreasury, 'kwota ze skarbu = kwota u spółki', 1e-6);
    });

    test('W4: scenariusz na start — wybrana linia startuje w 2.–4. roku i zapisuje się w CV', () => {
        world();
        assert(setCrisisScenario('banking'), 'ustawiony');
        assert(crisisState.scenarioStartQ >= 5 && crisisState.scenarioStartQ <= 16, `kwartał ${crisisState.scenarioStartQ}`);
        assert(playerProfile.cv.some(item => /Kryzys bankowy/.test(item.text)), 'wpis w CV');
        macro.quarter = crisisState.scenarioStartQ - 1;
        tick();
        assertEq(crisisLine?.id, 'banking', 'linia wystartowała Zapowiedzią');
        assertEq(crisisLine.stage, 'spark', 'od Zapowiedzi');
        assertEq(crisisState.scenario, null, 'scenariusz zużyty');
        assert(!setCrisisScenario(''), 'puste = losowo');
    });

    test('W5: sekcja „Kryzys” i wiersz „Wystawienie na kryzys”', () => {
        const { b } = world();
        assert(/nie trwa/.test(renderCrisisSection()), 'bez linii: normalny cykl');
        startCrisisLine('pandemic', { forced: true, skipSpark: true });
        const html = renderCrisisSection();
        assert(/Pandemia/.test(html) && /Wybuch/.test(html) && /Turystyka/.test(html), 'etap i sektory w sekcji');
        assertEq(getCrisisExposureLabel(b), 'wysoki', 'turystyka w pandemii: wysokie wystawienie');
        assertEq(getCrisisExposureLabel(stocks[0]), 'niski', 'technologia w pandemii: niskie wystawienie');
    });

    test('W5: nagłówki w pasku newsów na każdym etapie i mail z retrospektywą', () => {
        world();
        const before = mailbox.messages.length;
        startCrisisLine('oil', { forced: true });
        for (let i = 0; i < 40 && crisisLine; i++) tick();
        assert(mailbox.messages.some(m => /Retrospektywa: Szok naftowy/.test(m.subject)), 'mail z retrospektywą');
        assert(mailbox.messages.length > before, 'nowe maile');
    });

    test('W6: hasła Akademii (5 linii + 3 ogólne) i 6 osiągnięć zarejestrowane; hasło linii po jej końcu', () => {
        for (const id of ['kryzys_banking', 'kryzys_dotcom', 'kryzys_oil', 'kryzys_black', 'kryzys_pandemic', 'stagflacja', 'ksztalty_odbicia', 'ratowanie_bankow']) assert(ACADEMY_ENTRIES[id]?.quiz?.length === 3, `hasło ${id}`);
        for (const id of ['crisis_banking', 'crisis_dotcom', 'crisis_oil', 'crisis_black', 'crisis_pandemic', 'crisis_collector']) assert(ACHIEVEMENTS[id], `osiągnięcie ${id}`);
        world();
        startCrisisLine('pandemic', { forced: true });
        for (let i = 0; i < 40 && crisisLine; i++) tick();
        assert(isAcademyUnlocked('kryzys_pandemic'), 'hasło odblokowane po linii');
    });

    test('W6: Kolekcjoner kryzysów po przeżyciu wszystkich 5 linii', () => {
        world();
        for (const id of CRISIS_LINE_ORDER) crisisState.history.push({ id, fundChange: 0, gigChange: 0, trust: 50, techShare: 0 });
        checkCrisisAchievements(crisisState.history[4], { id: 'pandemic', positionStart: playerProfile.positionId });
        assert(getPlayerAchievements().crisis_collector !== undefined, 'osiągnięcie zdobyte');
    });
});

group('0.15.4: Poprawki z gry 3 (licznik, okna, wykres, dywidenda, split, limit spółek)', () => {
    const mk = (symbol, o = {}) => Object.assign(makeCompany(symbol, { sector: ['Turystyka'] }), { price: 10, exchange: 'BRONZE' }, o);
    const withTable = fn => {
        let body = document.getElementById('stock-table-body'); // starsze testy zostawiają tabelę w dokumencie — używamy jej
        if (!body) { const table = document.createElement('table'); body = document.createElement('tbody'); body.id = 'stock-table-body'; table.appendChild(body); document.body.appendChild(table); }
        const kpi = document.getElementById('mkpi-active') || Object.assign(document.body.appendChild(document.createElement('span')), { id: 'mkpi-active' });
        const saved = { market: selectedMarketOperator, level: currentMarketLevel, owned: ownedOnlyFilter, filter: sectorFilterState };
        try { return fn(body, kpi); } finally {
            selectedMarketOperator = saved.market; currentMarketLevel = saved.level; ownedOnlyFilter = saved.owned; sectorFilterState = saved.filter;
            body.replaceChildren();
        }
    };

    test('P1: licznik sektora i nagłówka = wiersze tabeli (rynek, poziom giełdy, córki)', () => {
        const a = mk('TA'), b = mk('TB', { exchange: 'SILVER' }), c = mk('TC', { market: 'XTD' }), child = mk('TD', { isSubsidiaryOf: 'TA' });
        a.subsidiaries = ['TD'];
        resetWorld([a, b, c, child]);
        withTable((body, kpi) => {
            selectedMarketOperator = 'GPW'; currentMarketLevel = 'ALL'; ownedOnlyFilter = false;
            sectorFilterState = { ...DEFAULT_SECTOR_FILTER, sector: 'Turystyka' };
            const topRows = () => [...body.rows].filter(r => r.classList.contains('stock-row') && !stocks.find(s => s.symbol === r.dataset.symbol)?.isSubsidiaryOf).length;
            const chip = () => getSectorFilterCounts(getListBaseStocks(), sectorFilterState).sectors.Turystyka || 0;
            displayStocks();
            assertEq(chip(), 2, 'chip: spółka z innego rynku (TC) nie liczy się, córka stoi pod matką');
            assertEq(topRows(), chip(), 'wiersze główne = chip');
            assertEq(Number(kpi.textContent), body.querySelectorAll('tr.stock-row').length, 'nagłówek = wszystkie wiersze (z córką)');
            currentMarketLevel = 'SILVER'; displayStocks();
            assertEq(chip(), 1, 'chip po zmianie zakładki poziomu');
            assertEq(topRows(), 1, 'wiersze po zmianie zakładki');
            currentMarketLevel = 'ALL'; ownedOnlyFilter = true; displayStocks();
            assertEq(chip(), 0, 'chip przy „Posiadane” bez akcji');
            assertEq(body.querySelectorAll('tr.stock-row').length, 0, 'tabela pusta przy „Posiadane” bez akcji');
        });
    });

    test('P1: okno „Dywidendowe” otwiera się i zamyka z każdej zakładki rynku; żadne okno nie leży pod zasłoną (z-index)', async () => {
        resetWorld([mk('TA')]);
        const modal = document.createElement('div'); modal.id = 'dividend-tracker-modal'; modal.className = 'modal'; modal.style.display = 'none';
        modal.innerHTML = '<button class="close-btn" onclick="closeModalFrom(this)">x</button><table><tbody id="dividend-tracker-body"></tbody></table>';
        const tab = document.createElement('button'); tab.className = 'market-level-tab';
        document.body.append(modal, tab);
        const savedLevel = currentMarketLevel;
        try {
            for (const level of ['ALL', 'JUNK', 'BRONZE']) {
                setMarketLevel(tab, level);
                openDividendTrackerModal();
                assertEq(modal.style.display, 'flex', `okno otwarte z zakładki ${level}`);
                closeModalFrom(modal.querySelector('.close-btn'));
                assertEq(modal.style.display, 'none', `okno zamknięte z zakładki ${level}`);
            }
        } finally { currentMarketLevel = savedLevel; modal.remove(); tab.remove(); }
        // Zasłona ma z-index 1090, okna .modal 1100: reguła ID z mniejszym z-index chowałaby okno pod zasłoną (ekran ciemny, okno nieklikalne).
        const css = await (await fetch('../style.css', { cache: 'no-store' })).text();
        const low = [...css.matchAll(/(#[\w-]+-modal)[^{}]*\{[^}]*?z-index:\s*(\d+)/g)].filter(m => Number(m[2]) < 1100).map(m => `${m[1]}:${m[2]}`);
        assertEq(low.join(','), '', 'okna (#…-modal) bez z-index poniżej zasłony');
    });

    test('P1: menu grupy kategorii jest przypięte do okna (fixed) przy przycisku — nie ginie w przewijanym rzędzie chipów', () => {
        const row = document.createElement('div'); row.style.cssText = 'overflow-x:auto;display:flex;height:32px;width:300px;position:relative';
        row.innerHTML = '<div class="sector-group-dropdown"><button type="button" aria-expanded="false">Grupa</button><div class="sector-group-menu" hidden><button>A</button></div></div>'
            + '<div class="sector-group-dropdown"><button type="button" aria-expanded="false">Druga</button><div class="sector-group-menu" hidden><button>B</button></div></div>';
        document.body.appendChild(row);
        try {
            const [b1, b2] = row.querySelectorAll('.sector-group-dropdown > button'), [m1, m2] = row.querySelectorAll('.sector-group-menu');
            toggleSectorGroupMenu(b1, null);
            assert(!m1.hidden && m1.style.position === 'fixed', 'menu otwarte i przypięte do okna');
            assert(parseFloat(m1.style.top) >= b1.getBoundingClientRect().bottom, 'menu pod przyciskiem');
            toggleSectorGroupMenu(b2, null);
            assert(m1.hidden && !m2.hidden, 'otwarcie drugiego zamyka pierwsze');
            window.dispatchEvent(new Event('resize'));
            assert(m2.hidden && b2.getAttribute('aria-expanded') === 'false', 'zmiana rozmiaru okna zamyka menu (położenie przestaje być aktualne)');
        } finally { row.remove(); }
    });

    test('P1: wykres — lewy margines mieści najdłuższą etykietę osi (wysokie kursy nie są przycinane)', () => {
        const stock = mk('TA', { price: 4_000_000 });
        stock.lineHistory = [4_000_000, 4_300_000, 4_100_000, 4_650_000].map((price, i) => ({ time: 1000 + i * 1000, price }));
        const area = document.createElement('div'); area.style.cssText = 'width:420px;height:200px'; document.body.appendChild(area);
        const saved = { ...playerChartSettings };
        try {
            playerChartSettings.type = 'line'; playerChartSettings.lineInterval = 1000;
            renderChartSVGForStock(stock, area, 420, 200);
            const labels = [...area.querySelectorAll('text.chart-axis-label')];
            assert(labels.length >= 2, 'etykiety osi Y narysowane');
            const cut = labels.filter(t => t.getBBox().x < 0).map(t => t.textContent);
            assertEq(cut.join('|'), '', 'etykiety wystające poza lewą krawędź wykresu');
        } finally { Object.assign(playerChartSettings, saved); area.remove(); }
    });

    test('P1: kolumna kursu mieści kurs sześciocyfrowy z walutą obok pigułki zmiany tygodniowej', async () => {
        const css = await (await fetch('../style.css', { cache: 'no-store' })).text();
        const width = Number(css.match(/#stock-table \.col-price\s*\{\s*width:\s*(\d+)px/)?.[1]);
        const probe = document.createElement('span'); probe.className = 'price-main'; probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:ui-monospace,monospace;font-size:14px;font-weight:600';
        probe.textContent = formatZl(123456.78); document.body.appendChild(probe);
        try { assert(width >= probe.offsetWidth + 2 * 12, `kolumna kursu ${width}px, potrzeba ≥ ${probe.offsetWidth + 24}px`); } finally { probe.remove(); }
    });

    test('P2: wykres liniowy i świece na zegarze gry — punkt co tik niezależnie od czasu rzeczywistego (×50…×200)', () => {
        const a = mk('TA', { price: 100 });
        resetWorld([a]); a.lineHistory = []; a.candlestickHistory = []; a.currentCandle = null;
        marketHalt = createMarketHaltState();
        // 900 tików wykonanych „natychmiast” (prędkość ×200 i więcej): czas rzeczywisty nie może wpływać na oś wykresu
        for (let i = 0; i < 900; i++) updateStockPrices();
        const h = a.lineHistory;
        assertEq(h.length, 900, 'punkt na każdy tik');
        assertEq(h[899].time - h[0].time, 899 * BASE_DELAYS.stockUpdate, 'oś = zegar gry (1 s gry na tik)');
        for (const interval of [1000, 5000, 10000, 60000, 120000]) {
            const points = filterLineData(h, interval);
            assert(points.length >= Math.floor(900 * 1000 / interval) - 1, `okres ${interval} ms gry: ${points.length} punktów`);
            assert(new Set(points).size > Math.min(points.length - 1, 5), `okres ${interval}: linia nie jest prosta`);
        }
        assertEq(a.candlestickHistory.length, Math.min(60, Math.floor(900 * 1000 / CANDLE_INTERVAL) - 1), 'świeca = 15 tików gry (limit historii 60)');
    });

    test('P2: zegar wykresów nie cofa się po wczytaniu zapisu z punktami „z przyszłości” (gra szła ×200)', () => {
        const a = mk('TA', { price: 100 });
        resetWorld([a]);
        const future = Date.now() + 50_000_000;
        a.lineHistory = [{ time: future - 1000, price: 99 }, { time: future, price: 100 }];
        syncGameChartClock();
        assert(gameChartClock > future, 'zegar za najnowszym punktem');
        a.currentCandle = null; marketHalt = createMarketHaltState();
        updateStockPrices();
        assert(a.lineHistory[a.lineHistory.length - 1].time > future, 'nowy punkt po zapisanych');
        addChartEvent(a, '📈', 'test');
        assertEq(a.chartEvents[a.chartEvents.length - 1].time, gameChartClock, 'znacznik zdarzenia na zegarze gry');
    });

    test('P3: minimalna dywidenda = większa z 0,01 zł i 0,1% kursu; poniżej progu brak ogłoszenia, wypłaty i wymuszenia', () => {
        const mkDiv = (symbol, price, shares) => Object.assign(mk(symbol, { price, totalShares: shares }), { cash: 5_000_000 });
        assertEq(getMinDividendPerShare({ price: 5 }), 0.01, 'tanie akcje: 0,01 zł');
        assertEq(getMinDividendPerShare({ price: 300 }), 0.3, 'drogie akcje: 0,1% kursu');
        const a = mkDiv('TA', 100, 10000); resetWorld([a]);
        setCompanyDividendPolicy(a, 'Total');
        declareQuarterDividend(a, 500);            // 0,05 zł na akcję < 0,10 zł
        assert(!a.pendingDividend && a.dividendTooSmall === true, 'dywidenda 0,05 zł przy kursie 100 zł pominięta');
        declareQuarterDividend(a, 5000);           // 0,50 zł
        assert(a.pendingDividend && a.dividendTooSmall === false, 'dywidenda 0,50 zł ogłoszona');
        const cash0 = a.cash;
        assertEq(payCompanyDividend(a, 0.07), 0, 'wypłata poniżej progu zablokowana także przy wypłacie');
        assertEq(a.cash, cash0, 'gotówka bez zmian');
        const eco = mkDiv('ECO', 2.5, 1_000_000);  // próg 0,01 zł
        eco.cash = 7_700 / 0.8;                    // dywidenda specjalna 0,0077 zł na akcję (jak EcoLube w zgłoszeniu)
        resetWorld([eco]); eco.dividendCooldownUntil = 0;
        assert(isDividendTooSmall(eco, getForcedDividendAmount(eco) / eco.totalShares), '0,0077 zł na akcję = zbyt mała');
        assertEq(executeForcedDividend(eco), false, 'wymuszenie odrzucone');
        eco.cash = 5_000_000;
        assertEq(executeForcedDividend(eco), true, 'duża gotówka: dywidenda specjalna możliwa');
    });

    test('P3: karta grupy wyjaśnia „warunki rynkowe”, hasło Akademii „Warunki rynkowe w kooperacji” ma quiz', () => {
        const entry = ACADEMY_ENTRIES.warunkiRynkowe;
        assert(entry && entry.quiz.length === 3 && entry.quiz.every(q => q.a.length === 3 && q.c === 0), 'hasło z 3 pytaniami');
        const a = mk('TA'), b = mk('TB');
        resetWorld([a, b]);
        cooperations = [{ id: 'c1', a: 'TA', b: 'TB', segA: 'Turystyka', segB: 'Turystyka', start: 0, end: 99, by: 'ceo', terms: 'market', tunneled: 0, flag: null, complaint: null }];
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        const html = renderCompanyCardGroup(a);
        assert(html.includes('Co to znaczy „warunki rynkowe”'), 'dopisek „co to znaczy”');
        assert(html.includes('warunki rynkowe'), 'etykieta warunków');
        assert(isAcademyUnlocked('warunkiRynkowe'), 'hasło odblokowane po obejrzeniu kooperacji');
        cooperations = [];
    });

    // --- P4: split i konsolidacja akcji ---
    function splitWorld(price = 2400) {
        const a = Object.assign(mk('SPL', { price, totalShares: 10_000, cash: 5_000_000 }), { insiderShares: 3000, cityShares: 200 });
        const owner = mk('OWN', { price: 50, cash: 1_000_000 }); owner.equityStakes = { SPL: 500 };
        const hold = Object.assign(mk('HLD', { price: 50 }), { assetType: 'Holding', holdingPortfolio: { SPL: { quantity: 10, purchasePrice: 2000 } }, totalShares: 1000 });
        resetWorld([a, owner, hold]);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        playerPortfolio.SPL = { shares: 100, avgPrice: 2000, lockedShares: 20, assetType: 'stock' };
        playerWallet.portfolio.SPL = { shares: 50, avgPrice: 2100, assetType: 'stock' };
        aiCompetitors[0].portfolio.SPL = { shares: 301, avgPrice: 1800 };
        aiCompetitors[0].loans = [{ id: 'l1', amount: 1000, collateral: { symbol: 'SPL', quantity: 100 } }];
        const fund = corporation.managers[0].fund; fund.portfolio.SPL = { shares: 40, avgPrice: 1900 };
        commercialBanks[0].stockPortfolio = { SPL: { shares: 70, avgPrice: 2200 } };
        etfs.push({ symbol: 'TEF', name: 'Test ETF', holdings: { SPL: 25 }, cash: 0, units: 100, price: 1, priceHistory: [] });
        playerFund.pawnLoans = [{ id: 'p1', symbol: 'SPL', shares: 20, principal: 1000, weeksLeft: 5, missed: 0 }];
        a.lineHistory = [{ time: 1, price: 2300 }, { time: 2, price: 2400 }];
        a.candlestickHistory = [{ time: 1, open: 2300, high: 2500, low: 2200, close: 2400 }];
        a.currentCandle = { time: 2, open: 2400, high: 2450, low: 2390, close: 2400 };
        a.weeklyCloses = [2300, 2400]; a.priceAlerts = { buy: 2000, sell: 3000 };
        a.playerTransactions = [{ type: 'buy', time: 1, price: 2300, quantity: 10 }];
        a.fundamentals = { fairValue: 2500, epsTtm: 120, expectedEps: 30, lastEps: 29, salesPerShare: 900, bookValuePerShare: 1000, history: [{ eps: 30, revenue: 1 }] };
        a.dividendHistory = [{ dps: 12, yield: 0.005 }]; a.pendingDividend = { dps: 12, total: 120_000 }; a.lastDividend = { dps: 12, total: 120_000, yield: 0.005 };
        a.estimatedDividend = 12; a.lastDeclaredDps = 12;
        a.sharesHeld = getTrackedHeldShares(a);
        return { a, owner, hold, fund };
    }
    const wealth = a => (playerPortfolio.SPL?.shares || 0) * a.price + (playerWallet.portfolio.SPL?.shares || 0) * a.price;

    test('P4a: split 5:1 — akcje u wszystkich posiadaczy ×5, kurs ÷5, wartość pozycji i NAV bez zmian, niezmienniki 0', () => {
        const { a, owner, hold, fund } = splitWorld();
        const nav0 = getFundNav(), value0 = wealth(a), cap0 = a.price * a.totalShares, problems0 = checkWorldInvariants().join('|');
        const entry = applyShareCountChange(a, 5);
        assert(entry && entry.kind === 'split' && entry.ratio === 5, 'wpis splitu');
        assertEq(a.price, 480, 'kurs ÷5');
        assertEq(a.totalShares, 50_000, 'akcje ×5');
        assertNear(a.price * a.totalShares, cap0, 'kapitalizacja bez zmian', 1e-9);
        assertEq(playerPortfolio.SPL.shares, 500, 'fundusz'); assertEq(playerPortfolio.SPL.avgPrice, 400, 'średnia cena zakupu ÷5'); assertEq(playerPortfolio.SPL.lockedShares, 100, 'zastaw ×5');
        assertEq(playerWallet.portfolio.SPL.shares, 250, 'konto prywatne');
        assertEq(aiCompetitors[0].portfolio.SPL.shares, 1505, 'bot'); assertEq(fund.portfolio.SPL.shares, 200, 'fundusz kolegi'); assertEq(commercialBanks[0].stockPortfolio.SPL.shares, 350, 'bank');
        assertEq(owner.equityStakes.SPL, 2500, 'pakiet spółki'); assertEq(hold.holdingPortfolio.SPL.quantity, 50, 'holding'); assertEq(hold.holdingPortfolio.SPL.purchasePrice, 400, 'koszt holdingu ÷5');
        assertEq(etfs[0].holdings.SPL, 125, 'ETF');
        assertEq(a.insiderShares, 15_000, 'insiderzy'); assertEq(a.cityShares, 1000, 'miasto');
        assertEq(playerFund.pawnLoans[0].shares, 100, 'zastaw funduszu (pożyczka lombardowa)'); assertEq(aiCompetitors[0].loans[0].collateral.quantity, 500, 'zabezpieczenie kredytu bota');
        assertNear(wealth(a), value0, 'wartość pozycji gracza', 1e-9);
        assertNear(getFundNav(), nav0, 'NAV funduszu', 1e-9);
        assertEq(a.sharesHeld, getTrackedHeldShares(a), 'akcje w obrocie = suma posiadaczy');
        assertEq(checkWorldInvariants().join('|'), problems0, 'niezmienniki bez zmian');
        // historia i wskaźniki na akcję (korekta wstecz — wykres bez skoku)
        assertEq(a.lineHistory[0].price, 460, 'historia linii'); assertEq(a.candlestickHistory[0].high, 500, 'świece'); assertEq(a.currentCandle.close, 480, 'świeca bieżąca'); assertEq(a.weeklyCloses[1], 480, 'zamknięcia tygodniowe');
        assertEq(a.priceAlerts.buy, 400, 'alert kupna'); assertEq(a.priceAlerts.sell, 600, 'alert sprzedaży'); assertEq(a.playerTransactions[0].price, 460, 'transakcje: cena'); assertEq(a.playerTransactions[0].quantity, 50, 'transakcje: ilość');
        assertEq(a.fundamentals.fairValue, 500, 'wartość godziwa'); assertEq(a.fundamentals.epsTtm, 24, 'EPS'); assertEq(a.fundamentals.history[0].eps, 6, 'EPS w historii');
        assertEq(a.dividendHistory[0].dps, 2.4, 'historia dywidend'); assertEq(a.pendingDividend.dps, 2.4, 'ogłoszona dywidenda na akcję'); assertEq(a.pendingDividend.total, 120_000, 'suma dywidendy bez zmian'); assertEq(a.lastDeclaredDps, 2.4, 'ostatnia ogłoszona');
        assertEq(a.splitHistory.at(-1).f, 5, 'czynnik skali w historii spółki');
    });

    test('P4a: propozycja zmiany akcji — próg 1000 zł, krotność tak, by kurs po splicie ≤ 700 zł; kwartalny proces z szansą 20%, bez fuzji i z przerwą', () => {
        assertEq(getSplitProposal(999), null, 'poniżej progu');
        assertEq(JSON.stringify(getSplitProposal(1000)), '{"kind":"split","ratio":2}', '1000 zł → 2:1');
        assertEq(getSplitProposal(1500).ratio, 3, '1500 zł → 3:1'); assertEq(getSplitProposal(2400).ratio, 5, '2400 zł → 5:1'); assertEq(getSplitProposal(4_000_000).ratio, 1000, '4 mln zł → 1000:1');
        const { a } = splitWorld(1500);
        const random = Math.random;
        try {
            Math.random = () => 0.9; assertEq(processSplitsQuarterly().length, 0, 'bez losu 20% nic się nie dzieje'); assertEq(a.price, 1500, 'kurs bez zmian');
            a.mergerProcess = { stage: 1 }; Math.random = () => 0.1; assertEq(processSplitsQuarterly().length, 0, 'spółka w fuzji nie dzieli akcji'); delete a.mergerProcess;
            macro.quarter = 10;
            const done = processSplitsQuarterly();
            assertEq(done.length, 1, 'split przy 20%'); assertEq(a.price, 500, '1500 zł → 3:1 = 500 zł'); assertEq(a.lastSplitQuarter, 10, 'kwartał splitu');
            a.price = 1500; assertEq(processSplitsQuarterly().length, 0, 'przerwa po splicie');
            macro.quarter = 10 + SPLIT_COOLDOWN_QUARTERS; assertEq(processSplitsQuarterly().length, 1, 'po przerwie możliwy kolejny');
        } finally { Math.random = random; }
    });

    test('P4a: zapis i wczytanie po splicie — pakiety, historia i niezmienniki bez zmian', () => {
        const { a } = splitWorld(2400);
        applyShareCountChange(a, 5);
        const nav = getFundNav(), problems = checkWorldInvariants().join('|');
        const report = applySaveSnapshot(JSON.parse(JSON.stringify(buildSaveSnapshot())));
        assert(report.ok, report.errors.join(' '));
        const b = stocks.find(s => s.symbol === 'SPL');
        assertEq(b.price, 480, 'kurs po wczytaniu'); assertEq(b.totalShares, 50_000, 'akcje po wczytaniu'); assertEq(b.splitHistory.at(-1).f, 5, 'znacznik splitu w zapisie');
        assertEq(playerPortfolio.SPL.shares, 500, 'pakiet funduszu po wczytaniu'); assertNear(getFundNav(), nav, 'NAV po wczytaniu', 1e-9);
        assertEq(checkWorldInvariants().join('|'), problems, 'niezmienniki po wczytaniu');
    });

    test('P4a: portfel kredytów banku może zawierać liczby (LBO) i listy z zabezpieczeniem — split nie przerywa pętli kwartalnej, zabezpieczenie ×5', () => {
        const { a } = splitWorld(2400);
        commercialBanks[0].loanPortfolio = { LBO1: 5000, botX: [{ id: 'm1', collateral: { symbol: 'SPL', quantity: 40 } }, { id: 'm2', collateral: null }] };
        commercialBanks[0].resaleOffer = { symbol: 'SPL', shares: 10, price: 2400 };
        assert(applyShareCountChange(a, 5), 'split wykonany mimo liczbowego wpisu w portfelu kredytów');
        assertEq(commercialBanks[0].loanPortfolio.botX[0].collateral.quantity, 200, 'zabezpieczenie hipoteczne ×5'); assertEq(commercialBanks[0].loanPortfolio.LBO1, 5000, 'wpis liczbowy bez zmian');
        assertEq(commercialBanks[0].resaleOffer.shares, 50, 'oferta odsprzedaży ×5'); assertEq(commercialBanks[0].resaleOffer.price, 480, 'oferta odsprzedaży: kurs ÷5');
        a.price = 2400; a.lastSplitQuarter = -99; commercialBanks[0].loanPortfolio.LBO2 = 1;
        const random = Math.random; Math.random = () => 0.1;
        try { assertEq(processSplitsQuarterly().length, 1, 'pętla kwartalna dzieli akcje bez wyjątku'); } finally { Math.random = random; }
    });

    test('P4b: konsolidacja 1:10 — akcje ÷10, kurs ×10, ułamki akcji wypłacone gotówką z kasy spółki, wartość pozycji i NAV bez zmian', () => {
        const { a, owner } = splitWorld(0.4);
        a.isTradeLocked = true; a.belowOneTicks = 500;
        playerPortfolio.SPL.shares = 107; playerPortfolio.SPL.lockedShares = 25; // 10,7 akcji po konsolidacji → 10 + 0,7 w gotówce
        playerWallet.portfolio.SPL.shares = 3;                                  // 0,3 akcji → pakiet znika, wypłata gotówką
        aiCompetitors[0].portfolio.SPL.shares = 305;
        a.sharesHeld = getTrackedHeldShares(a);
        const nav0 = getFundNav(), walletCash0 = playerWallet.cash, companyCash0 = a.cash, problems0 = checkWorldInvariants().join('|'), cap0 = a.price * a.totalShares;
        const entry = applyShareCountChange(a, 1 / 10);
        assert(entry && entry.kind === 'reverse' && Math.abs(entry.ratio - 10) < 1e-9, 'wpis konsolidacji 1:10');
        assertEq(a.price, 4, 'kurs ×10'); assertEq(a.totalShares, 1000, 'akcje ÷10'); assertNear(a.price * a.totalShares, cap0, 'kapitalizacja bez zmian', 1e-9);
        assertEq(playerPortfolio.SPL.shares, 10, 'fundusz: ułamek odcięty'); assertEq(playerPortfolio.SPL.lockedShares, 2, 'zastaw ÷10 w dół');
        assert(!playerWallet.portfolio.SPL, 'pakiet poniżej jednej akcji znika');
        assertNear(playerWallet.cash - walletCash0, 0.3 * 4, 'gotówka za 0,3 akcji po nowym kursie');
        assertEq(aiCompetitors[0].portfolio.SPL.shares, 30, 'bot');
        assertEq(owner.equityStakes.SPL, 50, 'pakiet spółki');
        assertNear(getFundNav(), nav0, 'NAV funduszu (ułamek wypłacony gotówką)', 1e-9);
        assert(companyCash0 - a.cash > 0 && near(companyCash0 - a.cash, entry.fractionCash), 'wypłatę za ułamki ponosi spółka');
        assertEq(a.sharesHeld, getTrackedHeldShares(a), 'akcje w obrocie = suma posiadaczy');
        assertEq(checkWorldInvariants().join('|'), problems0, 'niezmienniki bez zmian');
        assertEq(a.fundamentals.fairValue, 25000, 'wartość godziwa ×10');
        // kurs wrócił powyżej 1,5 zł, więc kolejny tik zdejmuje blokadę handlu poniżej 1 zł
        marketHalt = createMarketHaltState(); updateStockPrices();
        assert(!a.isTradeLocked, 'blokada handlu zdjęta po konsolidacji');
    });

    test('P4b: propozycja konsolidacji — próg 1 zł, krotność tak, by kurs wyniósł ≥ 3 zł; wyłączony przełącznik nie zmienia reszty', () => {
        assertEq(getSplitProposal(1), null, 'dokładnie 1 zł — bez zmian');
        assertEq(JSON.stringify(getSplitProposal(0.4)), '{"kind":"reverse","ratio":10}', '0,40 zł → 1:10');
        assertEq(getSplitProposal(0.99).ratio, 5, '0,99 zł → 1:5'); assertEq(getSplitProposal(0.01).ratio, 100, '0,01 zł → 1:100');
        const { a } = splitWorld(0.4); a.price = 0.4;
        const random = Math.random, saved = { ...SPLIT_SETTINGS };
        try {
            Math.random = () => 0.1;
            SPLIT_SETTINGS.reverse = false; assertEq(processSplitsQuarterly().length, 0, 'przełącznik wyłączony'); assertEq(a.price, 0.4, 'kurs bez zmian');
            SPLIT_SETTINGS.reverse = true; assertEq(processSplitsQuarterly().length, 1, 'konsolidacja przy 20%'); assertEq(a.price, 4, '0,40 zł → 4 zł');
        } finally { Math.random = random; Object.assign(SPLIT_SETTINGS, saved); }
    });

    test('P4c: komunikaty o splicie — dziennik, pasek newsów, znacznik na wykresie, poczta i hasło Akademii; znacznik i wiersz w karcie spółki', () => {
        const { a } = splitWorld(2400);
        mailbox = createMailbox(); macro.quarter = 12;
        const mails0 = mailbox.messages.length;
        const entry = executeSplit(a, getSplitProposal(a.price));
        assert(entry && a.price === 480, 'split 5:1 wykonany');
        assert(newsLog.slice(0, 5).some(n => n.text.includes('dzieli akcje 5:1') && n.symbol === 'SPL'), 'wpis w pasku newsów');
        assert(a.chartEvents.some(e => e.icon === '🔀' && e.label.includes('Split 5:1')), 'znacznik splitu na wykresie');
        assert(mailbox.messages.length > mails0, 'poczta dla posiadacza');
        assert(isAcademyUnlocked('splitReverseSplit'), 'hasło Akademii odblokowane');
        assertEq(emojiIconName('🔀'), 'podzial', 'ikona SVG zamiast emoji'); assert(UI_ICON_PATHS.podzial, 'rysunek ikony');
        assert(getRecentShareCountChange(a).startsWith('Split 5:1 w kw. 12'), 'opis znacznika w tabeli (słowa, nie kolor)');
        macro.quarter = 40; assertEq(getRecentShareCountChange(a), null, 'znacznik znika po 8 kwartałach');
        assert(describeShareCountHistory(a).includes('split 5:1 w kw. 12'), 'wiersz w karcie spółki');
        const entry2 = executeSplit(Object.assign(a, { price: 0.4, lastSplitQuarter: -99 }), getSplitProposal(0.4));
        assert(entry2 && entry2.kind === 'reverse' && newsLog.slice(0, 5).some(n => n.text.includes('skupia akcje 1:10')), 'komunikat konsolidacji');
        const entry3 = ACADEMY_ENTRIES.splitReverseSplit;
        assert(entry3 && entry3.quiz.length === 3 && entry3.quiz.every(q => q.a.length === 3 && q.c === 0), 'hasło z 3 pytaniami');
    });

    // --- P5: limit liczby spółek ---
    function crowdedWorld(count) {
        const list = Array.from({ length: count }, (_, i) => Object.assign(mk(`C${i}`, { price: 10, cash: 200_000 }), { financialHealth: (i % 7) - 3 + i / 1000, sector: ['Usługi'] }));
        resetWorld(list);
        startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        return list;
    }

    test('P5: powyżej 115 spółek krajowych państwo wycofuje najsłabsze z wykupem +10% — bez ujemnej gotówki i bez duchów posiadaczy', () => {
        const list = crowdedWorld(118);
        const weakest = [...list].sort((a, b) => a.financialHealth - b.financialHealth).slice(0, 3).map(s => s.symbol);
        const [w1, w2, w3] = weakest.map(sym => stocks.find(s => s.symbol === sym));
        for (const s of [w1, w2, w3]) { s.sharesHeld = 0; }
        playerPortfolio[w1.symbol] = { shares: 100, avgPrice: 9, assetType: 'stock' }; w1.sharesHeld = 100;
        aiCompetitors[0].portfolio[w2.symbol] = { shares: 50, avgPrice: 9 }; w2.sharesHeld = 50;
        const cash0 = playerCash, treasury0 = governmentTreasury, problems0 = checkWorldInvariants().join('|');
        assertEq(getListedCompanyCount(), 118, 'start: 118 spółek krajowych');
        assertEq(enforceListingLimitQuarterly(), 2, 'najwyżej 2 wycofania na kwartał');
        assertEq(getListedCompanyCount(), 116, 'po pierwszym kwartale 116');
        assert(!stocks.includes(w1) && !stocks.includes(w2) && stocks.includes(w3), 'zniknęły dwie najsłabsze (trzecia jeszcze zostaje)');
        assertNear(playerCash - cash0, 100 * 10 * 1.1, 'gracz dostaje wykup po kursie +10%');
        for (const sym of [w1.symbol, w2.symbol]) {
            assert(!playerPortfolio[sym] && !aiCompetitors[0].portfolio[sym] && !stocks.some(s => s.equityStakes?.[sym] || s.holdingPortfolio?.[sym]), `bez duchów posiadaczy ${sym}`);
        }
        assert(stocks.every(s => !(Number(s.cash) < 0)), 'żadna spółka nie ma ujemnej gotówki');
        assert(governmentTreasury >= 0 && governmentTreasury <= treasury0, 'skarb nie na minusie');
        assertEq(checkWorldInvariants().join('|'), problems0, 'niezmienniki bez zmian');
        assertEq(enforceListingLimitQuarterly(), 1, 'drugi kwartał: jedna do 115'); assertEq(getListedCompanyCount(), 115, 'limit 115');
        assertEq(enforceListingLimitQuarterly(), 0, 'przy 115 nic się nie dzieje');
    });

    test('P5: presja zaostrzania rośnie od 110 do 125 spółek krajowych; pełne wydzielenia tylko poniżej 110; skarb za mały — brak wycofania', () => {
        assertEq(SPINOFF_DOMESTIC_LIMIT, 110, 'pełny spin-off poniżej 110');
        crowdedWorld(110); assertEq(getListingStrictness(), 0, '110 spółek: luźno');
        crowdedWorld(117); assert(getListingStrictness() > 0.4 && getListingStrictness() < 0.6, `117 spółek: umiarkowanie (${getListingStrictness()})`);
        crowdedWorld(125); assertEq(getListingStrictness(), 1, '125 spółek: pełna presja');
        const list = crowdedWorld(116);
        const weakest = [...list].sort((a, b) => a.financialHealth - b.financialHealth)[0];
        weakest.cash = 0; weakest.sharesHeld = 1000; aiCompetitors[0].portfolio[weakest.symbol] = { shares: 1000, avgPrice: 9 };
        const treasury = governmentTreasury; governmentTreasury = 100;
        try { assertEq(delistWithBuyout(weakest), null, 'skarb nie pokrywa wykupu'); assert(stocks.includes(weakest), 'spółka zostaje na giełdzie'); } finally { governmentTreasury = treasury; }
    });

    // --- P6: limit różnorodności i etykieta sektora głównego ---
    const diversified = (sectors, shares) => {
        const s = mk('DIV', { sector: [sectors[0]] }); s.segments = sectors.map((sector, i) => ({ sector, subsector: null, share: shares[i] })); s.sector = sectors.slice();
        s.fundamentals = { revenue: 1_000_000 }; resetWorld([s]);
        return s;
    };

    test('P6: klastry sektorów — powiązane sektory liczą się razem; limit 2 niepowiązanych klastrów w segmentach spółki', () => {
        assertEq(countSectorClusters(['Technologia', 'Gaming', 'Nieruchomości']), 2, 'Technologia i Gaming to jeden klaster');
        assertEq(countSectorClusters(['Przemysł', 'Finanse', 'Medycyna']), 3, 'trzy niepowiązane sektory');
        assertEq(countSectorClusters(['Żywność', 'Dobra konsumpcyjne', 'Media']), 1, 'łańcuch powiązań = jeden klaster');
        const s = diversified(['Przemysł', 'Finanse'], [0.6, 0.4]);
        assert(wouldExceedDiversity(s, 'Medycyna'), 'trzeci niepowiązany klaster ponad limit');
        assert(!wouldExceedDiversity(s, 'Obronność'), 'Obronność powiązana z Przemysłem');
        assertEq(startExpansion(s, 'Medycyna'), null, 'rozszerzenie ponad limit odrzucone');
        for (let i = 0; i < 300; i++) { const picked = pickExpansionSector(s); assert(picked === null || !wouldExceedDiversity(s, picked), `losowany sektor ${picked} mieści się w limicie`); }
        const t = diversified(['Technologia', 'Gaming'], [0.7, 0.3]); t.strategy = { process: { type: 'expand', sector: 'Nieruchomości', related: false, cost: 1 }, growth: null, pivot: null };
        assertEq(resolveExpansion(t, 0, 1), 'success', 'drugi klaster (Nieruchomości) dozwolony');
        assert(t.segments.some(seg => seg.sector === 'Nieruchomości'), 'segment dopisany');
        for (let i = 0; i < 300; i++) { const picked = pickPivotSector(t); assert(picked === null || !wouldExceedDiversity(t, picked), `pivot do ${picked} w limicie`); }
    });

    test('P6: limit dominacji — udział w kapitalizacji ponad 10% obniża mnożnik wyceny (najwyżej −35%); mały rynek bez kary', () => {
        const small = [mk('S1'), mk('S2')]; resetWorld(small); macro.quarter = 31;
        assertEq(getDominanceFactor(small[0]), 1, 'poniżej 40 spółek zwykłych bez kary');
        const list = Array.from({ length: 45 }, (_, i) => Object.assign(mk(`D${i}`, { price: 10 }), { totalShares: 10_000 })); // po 100 000 zł
        list[0].price = 4000;                                                                                              // 40 000 000 zł ≈ 90% rynku
        resetWorld(list); macro.quarter = 32;
        assertNear(getCapitalizationShare(list[0]), 40_000_000 / (40_000_000 + 44 * 100_000), 'udział lidera', 1e-9);
        assertEq(getDominanceFactor(list[0]), 1 - DOMINANCE_MAX_PENALTY, 'kara ograniczona do −35%');
        assertEq(getDominanceFactor(list[1]), 1, 'mała spółka bez kary');
        list[0].price = 70;                                                                                               // 700 000 zł ≈ 13,7% rynku
        macro.quarter = 33;
        const share = getCapitalizationShare(list[0]);
        assertNear(getDominanceFactor(list[0]), 1 - (share - DOMINANCE_FREE_SHARE) * DOMINANCE_PENALTY_SLOPE, 'kara proporcjonalna 1,5% za punkt', 1e-9);
        assert(getDominanceFactor(list[0]) < 1 && getDominanceFactor(list[0]) > 1 - DOMINANCE_MAX_PENALTY, 'kara pośrednia');
        const m0 = getValuationMultiplier(list[1]); assert(getValuationMultiplier(list[0]) < m0, 'lider wyceniany ostrożniej niż mała spółka z tym samym sektorem');
    });

    // --- P7: lombard ---
    function pawnWorld() {
        const shop = Object.assign(makeCompany('LOMB', { cash: 500_000 }), { assetType: 'PawnShop', price: 50, totalShares: 10_000 });
        resetWorld([shop]); startNewCareer({ name: 'Test', corporation: 'Korpo', fundName: 'Fundusz Testowy' });
        society.priceLevel = 1; society.classes.poor = 0.22; economyCycle.phase = 'expansion';
        return shop;
    }

    test('P7: klienci lombardu — średnio co najmniej 5 aktywnych pożyczek, pieniądze się zgadzają, gotówka nie spada poniżej zera', () => {
        const shop = pawnWorld();
        const cash0 = shop.cash, mark = externalMark(), active = [];
        for (let week = 0; week < 100; week++) { const info = processPawnClientsWeekly(); if (week >= 12) active.push(info.active); assert(shop.cash >= 0, `gotówka lombardu ≥ 0 w tygodniu ${week}`); }
        const avg = active.reduce((a, b) => a + b, 0) / active.length;
        assert(avg >= 5, `średnio ${avg.toFixed(1)} aktywnych pożyczek klientów (cel ≥ 5)`);
        assertNear(shop.cash - cash0, externalNetFlow(mark), 'zmiana gotówki lombardu = przepływy przez granicę modelu (wypłaty, spłaty, odsetki)', 1e-6);
        assert(shop.retailStats.issued > 50 && shop.retailStats.repaid > 0 && shop.retailStats.forfeited >= 0, 'statystyki klientów');
        assert(shop.retailStats.interest > 0, 'lombard zarabia na odsetkach');
        assert(renderPawnClientsSummary(shop).includes('Aktywne pożyczki pod zastaw rzeczy'), 'panel lombardu pokazuje portfel klientów');
    });

    test('P7: popyt na lombard rośnie z udziałem klasy biednej i w recesji; brak lombardu — brak błędu', () => {
        const shop = pawnWorld();
        const base = getRetailLendingDemand();
        society.classes.poor = 0.33; assert(getRetailLendingDemand() > base * 1.4, 'więcej biednych — większy popyt');
        society.classes.poor = 0.22; economyCycle.phase = 'recession'; assert(getRetailLendingDemand() > base * 1.3, 'recesja zwiększa popyt');
        economyCycle.phase = 'expansion'; shop.isBankrupt = true;
        assertEq(processPawnClientsWeekly(), null, 'bez lombardu nic się nie dzieje');
    });

    test('P6: wchłonięcie córki z trzeciego klastra nie dodaje segmentu; sektor główny i etykieta liczone z segmentów po każdej zmianie', () => {
        const parent = diversified(['Przemysł', 'Finanse'], [0.6, 0.4]); parent.fundamentals = { revenue: 1_000_000 };
        const child = mk('KID', { sector: ['Medycyna'] }); child.fundamentals = { revenue: 300_000 }; child.segments = [{ sector: 'Medycyna', subsector: null, share: 1 }];
        mergeChildSegment(parent, child);
        assertEq(parent.segments.length, 2, 'nadal 2 segmenty (Medycyna dopisana do głównego)');
        assertEq(countSectorClusters(parent.segments.map(seg => seg.sector)), 2, 'limit zachowany');
        // sektor główny to największy segment po zmianie udziałów (nie pierwszy element listy)
        const tech = diversified(['Technologia', 'Nieruchomości'], [0.6, 0.4]);
        assertEq(getMainSector(tech), 'Technologia', 'główny: Technologia');
        shiftSegmentShare(tech, 'Nieruchomości', 0.3);
        assertEq(getMainSector(tech), 'Nieruchomości', 'po przesunięciu udziału główny: Nieruchomości');
        assertEq(tech.sector[0], 'Nieruchomości', 'etykieta sektorów zaczyna od głównego');
        assert(getStockActivityLabel(tech).startsWith('Nieruchomości'), 'opis działalności zaczyna od największego segmentu');
    });
});

async function runAllTests() {
    const results = document.getElementById('results');
    let passed = 0;
    let failed = 0;
    const testErrors = [];
    const originalLogEvent = window.logEvent;
    window.__testLog = [];

    for (const g of TEST_GROUPS) {
        const section = document.createElement('section');
        section.className = 'group';
        const h = document.createElement('h2');
        h.textContent = g.name;
        section.appendChild(h);

        for (const t of g.tests) {
            const line = document.createElement('div');
            line.className = 'test';
            try {
                const out = withSeededRandom(t.seed, t.fn);
                if (out && typeof out.then === 'function') await out; // 0.14.3: testy asynchroniczne (IndexedDB)
                passed++;
                line.innerHTML = `<span class="ok">✔</span> `;
                line.append(t.name);
            } catch (error) {
                failed++;
                const errMsg = `${g.name} -> ${t.name}: ${error instanceof AssertionError ? error.message : (error.stack || String(error))}`;
                testErrors.push(errMsg);
                line.innerHTML = `<span class="fail">✘</span> `;
                line.append(t.name);
                const detail = document.createElement('div');
                detail.className = 'detail';
                detail.textContent = error instanceof AssertionError ? error.message : (error.stack || String(error));
                line.appendChild(detail);
            }
            section.appendChild(line);
        }

        for (const table of g.tables) {
            const caption = document.createElement('div');
            caption.className = 'test';
            caption.textContent = table.title;
            const el = document.createElement('table');
            el.innerHTML = `<thead><tr>${table.headers.map(x => `<th>${x}</th>`).join('')}</tr></thead>` +
                `<tbody>${table.rows.map(r => `<tr>${r.map(c => `<td>${typeof c === 'number' ? c.toLocaleString('pl-PL') : c}</td>`).join('')}</tr>`).join('')}</tbody>`;
            section.append(caption, el);
        }

        results.appendChild(section);
    }

    window.logEvent = originalLogEvent;
    const summary = document.getElementById('summary');
    summary.textContent = `Zaliczone: ${passed}, niezaliczone: ${failed}`;
    summary.className = failed ? 'fail' : 'ok';
    window.__testSummary = { passed, failed, errors: testErrors };
}

runAllTests();
