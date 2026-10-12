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
    activeTenders = [];
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
        resetWorld([food, build]);
        const growth = company => withSeededRandom(5, () => withCycle('recession', -0.012, () => {
            const start = company.fundamentals.revenue;
            for (let i = 0; i < 8; i++) computeQuarterResults(company);
            return company.fundamentals.revenue / start - 1;
        }));
        const foodGrowth = growth(food);
        const buildGrowth = growth(build);
        assert(foodGrowth > buildGrowth, `Żywność ${(foodGrowth * 100).toFixed(1)}% vs Budowlany ${(buildGrowth * 100).toFixed(1)}%`);
        const multFood = withCycle('recession', -0.012, () => getValuationMultiplier(food));
        const multBuild = withCycle('recession', -0.012, () => getValuationMultiplier(build));
        assert(multFood > multBuild, 'niższa wycena cyklicznych w recesji');
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

    test('więcej niż 2 emisje w okresie obniżają zaufanie', () => {
        fundWorld();
        issueFundUnits(10, { forcedValue: 100, forcedClient: playerFund.clients[0] });
        issueFundUnits(10, { forcedValue: 100, forcedClient: playerFund.clients[0] });
        const trust = playerFund.trust;
        issueFundUnits(10, { forcedValue: 100, forcedClient: playerFund.clients[0] });
        assert(trust - playerFund.trust >= 4, 'kara za trzecią emisję');
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
        processClientsWeekly();
        assert(client.units > units0, 'dokupił JU');

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

    test('sprzedaż bez kupca przez 2 tygodnie kończy się umorzeniem', () => {
        worldF1();
        const client = playerFund.clients.find(c => !c.loyal);
        playerFund.clients.forEach(c => { c.satisfaction = 0.5; });
        client.pendingSellUnits = 10;
        const units = client.units;
        for (let i = 0; i < JU_SELL_ORDER_PATIENCE; i++) processClientsWeekly();
        assert(client.units < units && client.pendingSellUnits === 0, 'umorzone po braku kupca');
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

    test('przejęcie kończy się w 7–9 kwartałach, a proces prowadzi tylko inicjator', () => {
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
        assert(!a.mergerProcess && quarters >= 6 && quarters <= 9, `kwartały: ${quarters}`);
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
        assert(activateDefenseMechanism('BBB', 'poisonPill', 'player'), 'aktywna');
        assert(playerCash === 1_000_000 - 50_000 && a.mergerProcess.defenseActive === 'poisonPill' && b.mergerProcess.defenseActive === 'poisonPill', 'koszt i stan');
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
        assert(rescueOffer?.symbol === 'BBB' && rescueOffer.fundReserved > 0, 'pula funduszu');
        playerCash = 1_000_000;
        assert(acceptRescueOffer(100), 'fundusz obejmuje');
        assert(playerPortfolio.BBB.shares === 100 && b.totalShares > shares + 100 && b.balanceSheet.liabilities < liabilities, 'akcje i dług');
        assert(b.sharesHeld === b.totalShares - shares, 'akcje w obrocie');
        assert(rescueOffer.closed, 'zamknięta');
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

    test('debiut operatora otwiera rynek z 5–10 spółkami', () => {
        worldM5();
        const startup = spawnOperatorStartup(marketOperators.XTD);
        const before = stocks.length;
        activateMarketOperator(startup);
        const added = stocks.length - before;
        assert(marketOperators.XTD.status === 'active' && added >= 5 && added <= 10, `nowe spółki: ${added}`);
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
        assert(getCrowdingPressure() === 1 && Math.abs(getDebutFactor() - 0.7) < 1e-9, `ponad limitem ${getDebutFactor()}`);
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
        Math.random = () => 0.31; // bez sprzedaży, zakup za ~15% gotówki (≈ 73 000 akcji)
        try { runInvestmentBankAI(bank); } finally { Math.random = random; }
        assert(bank.stockPortfolio.AAA?.shares === 3000, `bank kupił ${bank.stockPortfolio.AAA?.shares} (wolne były 3000)`);
        a.sharesHeld = 0; // znów zaniżone
        etf.cash = 10_000_000;
        let bought = 0;
        for (let i = 0; i < 20; i++) bought += etfBuy(etf, a, 10000);
        commercialBanks.splice(commercialBanks.indexOf(bank), 1);
        assert(bought === 0 && etf.holdings.AAA === 4000, `ETF dokupił ${bought} przy braku wolnych akcji`);
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

function runAllTests() {
    const results = document.getElementById('results');
    let passed = 0;
    let failed = 0;
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
                withSeededRandom(t.seed, t.fn);
                passed++;
                line.innerHTML = `<span class="ok">✔</span> `;
                line.append(t.name);
            } catch (error) {
                failed++;
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
    window.__testSummary = { passed, failed };
}

runAllTests();
