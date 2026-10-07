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
        playerLoan.missedPayments = 0;
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
        assert(playerFund.clients.some(c => c.type === 'loyal'), 'klient lojalny zostaje');
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
        assert(!getAvailableTrainings().includes('work') && !getAvailableTrainings().includes('startupInvestor'), 'ukryte szkolenia');
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
        Math.random = () => 0.1;
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
        const expected = (ledger.interestIncome + ledger.fees) * (1 - BANK_OPERATING_COST) - ledger.interestExpense - ledger.writeOffs;
        assertNear(getBankQuarterlyEarnings(bankStock), expected, 'wynik banku');
        assert(bank.ledger.interestIncome === 0, 'księga wyzerowana');
        commercialBanks.length = 0;
    });

    test('kredyt spółki: zaległości prowadzą do odpisu', () => {
        const { a } = worldE2();
        const bank = makeBank(a);
        bank.loanPortfolio.AAA = 1_000_000;
        a.cash = 0;
        for (let i = 0; i < LOAN_WRITE_OFF_AFTER; i++) { a.cash = 0; processCompanyBanking(); }
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
            c.totalShares = 1000000; // kapitalizacja 2–3,1 mld (próg Szmaragdu: 1 mld)
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

// --------------------------------------------------------------------------------
// Uruchomienie
// --------------------------------------------------------------------------------

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
