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
            assertNear(company.cash - cash0, b.operating + debtFlows, 'gotówka zmienia się tylko o wynik operacyjny (i kredyt)');
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

group('Długa symulacja i balans (etap 6)', () => {
    test('rok gry: wielu zamawiających i wykonawców', () => {
        withSeededRandom(2026, () => {
            const builders = [10, 25, 40, 60].map((exp, i) => makeCompany(`B${i}`, { sector: ['Budowlany'], experience: exp, cash: 400_000 + i * 200_000 }));
            const sectors = ['Technologia', 'Medycyna', 'Energia', 'Żywność', 'Turystyka', 'Logistyka', 'Usługi', 'Przemysł'];
            const clients = sectors.map((sector, i) => makeCompany(`C${i}`, { sector: [sector], cash: 1_500_000 + i * 300_000, devLevel: 3 }));
            resetWorld([...builders, ...clients]);

            const money0 = moneyInModel();
            const mark0 = externalMark();
            const weeks = 20; // rok gry
            const ticksPerWeek = BASE_DELAYS.weekly / BASE_DELAYS.stockUpdate;
            let tendersCreated = 0;
            let maxOpenTenders = 0;
            let stalledTicks = 0;

            for (let week = 0; week < weeks; week++) {
                for (const client of clients) {
                    if (Math.random() < 0.15) {
                        const before = activeTenders.length;
                        startRandomInvestment(client);
                        if (activeTenders.length > before) tendersCreated++;
                    }
                    processActiveInvestments(client);
                }
                for (let t = 0; t < ticksPerWeek; t++) {
                    tick(1);
                    maxOpenTenders = Math.max(maxOpenTenders, activeTenders.filter(x => x.status === 'open').length);
                    stalledTicks += constructionProjects.filter(p => p.delayReason === 'Brak środków wykonawcy.').length;
                }
            }

            assertNear(moneyInModel() - money0, externalNetFlow(mark0), 'zachowanie pieniędzy w całym roku');

            const rows = builders.map(b => {
                const history = b.constructionHistory || [];
                const revenue = history.reduce((s, h) => s + h.revenue, 0);
                const costs = history.reduce((s, h) => s + h.costs, 0);
                return [b.symbol, b.constructionStats.experience, history.filter(h => h.status === 'completed').length,
                    history.filter(h => h.status === 'cancelled').length, Math.round(revenue), Math.round(revenue - costs),
                    revenue > 0 ? `${((revenue - costs) / revenue * 100).toFixed(1)}%` : '—', Math.round(b.constructionCredit || 0)];
            });
            addTable('Wyniki wykonawców po roku gry', ['Spółka', 'Dośw.', 'Ukończone', 'Anulowane', 'Przychód', 'Wynik', 'Marża', 'Kredyt'], rows);
            addTable('Popyt i przepustowość', ['Miara', 'Wartość'], [
                ['Ogłoszone przetargi', tendersCreated],
                ['Maks. otwartych przetargów naraz', maxOpenTenders],
                ['Aktywne budowy na koniec', constructionProjects.length],
                ['Tiki budów wstrzymanych przez brak środków', stalledTicks],
                ['Wpisy w dzienniku płatności (limit 400)', paymentJournal.length],
                ...Object.entries(paymentTotals.byPurpose).sort((a, b) => b[1] - a[1]).slice(0, 8)
                    .map(([purpose, amount]) => [`Przepływ zewnętrzny ${purpose}`, Math.round(amount)]),
                ['Najdłuższa historia kontraktów', Math.max(...builders.map(b => (b.constructionHistory || []).length))]
            ]);

            assert(maxOpenTenders <= CONSTRUCTION_RULES.maxOpenTenders, 'limit otwartych przetargów');
            assert(paymentJournal.length <= PAYMENT_JOURNAL_LIMIT, 'dziennik ograniczony');
            const completed = builders.reduce((s, b) => s + (b.constructionHistory || []).filter(h => h.status === 'completed').length, 0);
            assert(completed > 0, 'w ciągu roku powinny powstać budynki');
            const profitable = rows.filter(r => r[5] > 0).length;
            assert(profitable >= 1, 'przynajmniej jeden wykonawca rentowny');
        });
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
