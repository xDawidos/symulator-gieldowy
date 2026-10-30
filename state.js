// =================================================================================
// state.js: Państwo i miasto: budżet miasta, PPP, prywatyzacje, projekty specjalne, nadzór (policja, KNF), mafia, afery.
// Złączone pliki: city.js, projects.js, oversight.js, mafia.js, scandals.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## city.js
// #################################################################################

// city.js — Miasto, burmistrz, wybory, festyn i państwo (etap E1)
//
// Burmistrz ma politykę (infrastruktura / biznes / spółki miejskie) i poparcie. Polityki działają:
// przetargi budowlane finansowane dotacją miasta, niższy podatek i program wsparcia biznesu,
// częstsze IPO spółek miejskich. Wybory co 4 lata gry z kampanią (darowizny botów i gracza),
// festyn raz w roku. Państwo: prywatyzacja (oferta dla funduszu) i kary antymonopolowe.

const MAYOR_POLICIES = {
    infrastructure: { label: 'Infrastruktura', description: 'Miasto finansuje inwestycje budowlane spółek (przetargi), rośnie infrastruktura.', taxModifier: 0 },
    business:       { label: 'Biznes', description: 'Niższy podatek miejski dla spółek i program wsparcia lokalnych firm.', taxModifier: -0.01 },
    municipal:      { label: 'Spółki miejskie', description: 'Więcej pieniędzy i częstsze debiuty giełdowe spółek miejskich.', taxModifier: 0.005 }
};
const MAYOR_NAMES = ['Anna Rybka', 'Tomasz Mazur', 'Ewa Kowal', 'Piotr Grabowski', 'Magdalena Lis', 'Robert Zając', 'Joanna Wilk', 'Marek Szulc'];
const CITY_ATTRACTIONS = [
    { name: 'Koncert gwiazdy', cost: 40000 },
    { name: 'Wesołe miasteczko', cost: 25000 },
    { name: 'Pokaz fajerwerków', cost: 15000 },
    { name: 'Strefa food trucków', cost: 8000 },
    { name: 'Turniej sportowy', cost: 12000 }
];
const FESTIVAL_BOOST_SECTORS = ['Turystyka', 'Usługi'];
const PLAYER_DONATION_COMPLIANCE_LIMIT = 500;

let privatizationOffer = null;
const CITY_UNLOCK_DONATION = 1000; // odblokowanie obligacji komunalnych i festynu (wcześniej 10 000 — nierealne przy 100 PLN od babci)

// =================================================================================
// INICJALIZACJA I MIGRACJA
// =================================================================================

/** Uzupełnia obiekt miasta o pola etapu E1 (nowa gra i stare zapisy). */
function ensureCityModel() {
    if (!city.mayor) city.mayor = {};
    const mayor = city.mayor;
    if (!MAYOR_POLICIES[mayor.policy]) mayor.policy = 'infrastructure';
    if (!mayor.name || mayor.name === 'Prezydent Startowy') mayor.name = getRandomElement(MAYOR_NAMES);
    if (!Number.isFinite(mayor.support)) mayor.support = 55;
    if (!Number.isFinite(mayor.electionYear)) mayor.electionYear = 4;
    mayor.taxModifier = MAYOR_POLICIES[mayor.policy].taxModifier;
    if (!Array.isArray(city.availableAttractions)) city.availableAttractions = CITY_ATTRACTIONS.map(item => ({ ...item }));
    if (city.election === undefined) city.election = null;
    if (!Number.isFinite(city.playerDonatedAmount)) city.playerDonatedAmount = 0;
}

/** Nowa gra: model miasta i pierwszy festyn po pół roku gry. */
function initCityModel() {
    ensureCityModel();
    if (!festival) nextFestivalCountdown = BASE_DELAYS.quarterly * 2;
}

// =================================================================================
// DAROWIZNY
// =================================================================================

let cityInvestment = {
    donatedAmount: 0,        // wpłaty wszystkich
    playerHasUnlocked: false,
    aiHasUnlocked: false
};

/** Darowizna gracza na rozwój miasta — z portfela prywatnego (fundusz nie robi darowizn). */
function donateToCity(amount) {
    if (!(amount > 0)) { showToast('Wpisz poprawną kwotę.', 'error'); return false; }
    if (playerWallet.cash < amount) { showToast('Za mało środków w portfelu prywatnym.', 'error'); return false; }

    playerWallet.cash -= amount;
    city.budget += amount;
    city.playerDonatedAmount += amount;
    cityInvestment.donatedAmount += amount;
    city.mayor.support = Math.min(100, city.mayor.support + amount / 1000);
    recordPayment('player-wallet', 'external:miasto', amount, 'Darowizna na miasto');
    logEvent(`🏙️ Przekazujesz ${formatZl(amount, 2)} na rozwój miasta. Twój wkład: ${formatZl(city.playerDonatedAmount, 2)}.`, 'city');

    if (!city.playerHasUnlocked && city.playerDonatedAmount >= CITY_UNLOCK_DONATION) {
        city.playerHasUnlocked = true;
        cityInvestment.playerHasUnlocked = true;
        logEvent('🎉 Twój wkład w rozwój miasta odblokował obligacje komunalne i wydarzenia miejskie!', 'city');
    }
    if (typeof updateCityModalContent === 'function') updateCityModalContent();
    if (typeof displayCash === 'function') displayCash();
    return true;
}

function aiDonateToCity(ai, amount) {
    if (ai.cash < amount) return;
    ai.cash -= amount;
    city.budget += amount;
    cityInvestment.donatedAmount += amount;
    if (!cityInvestment.aiHasUnlocked && cityInvestment.donatedAmount >= 10000) {
        cityInvestment.aiHasUnlocked = true;
        logEvent('🎉 Wkład inwestorów w rozwój miasta odblokował obligacje komunalne!', 'city');
    }
}

// =================================================================================
// GOSPODARKA MIASTA I POLITYKI (co rok gry)
// =================================================================================

function runCityEconomy() {
    ensureCityModel();
    const expenses = city.baseExpenses + city.infrastructureLevel * 10000;
    const citizenTax = city.population * 25;
    let stateGrant = 0;
    if (governmentTreasury > 10000000) {
        stateGrant = governmentTreasury * 0.01;
        governmentTreasury -= stateGrant;
        logEvent(`🏛️ Rząd przekazał ${formatZl(stateGrant, 0)} dotacji dla miasta ${city.name}.`, 'state');
    }
    city.budget += citizenTax + stateGrant - expenses;

    runMayorPolicy();

    const growth = getRandomInRange(0.01, 0.02) + (city.infrastructureLevel - 1) * 0.01;
    city.population += Math.floor(city.population * growth);

    // Poparcie: budżet na plusie i rozwój pomagają, dziura budżetowa szkodzi; powolny powrót do 50.
    const mayor = city.mayor;
    mayor.support += (city.budget > 0 ? 3 : -8) + (city.infrastructureLevel - 1) * 5 + (50 - mayor.support) * 0.1;
    mayor.support = Math.max(5, Math.min(95, mayor.support));

    logEvent(`🏙️ Roczne rozliczenie miasta ${city.name}: budżet ${formatZl(city.budget, 0)}, mieszkańców ${city.population.toLocaleString('pl-PL')}, poparcie burmistrza ${mayor.support.toFixed(0)}%.`, 'city');
}

function runMayorPolicy() {
    const policy = city.mayor.policy;
    city.mayor.taxModifier = MAYOR_POLICIES[policy].taxModifier;

    if (policy === 'infrastructure') {
        city.infrastructureLevel += 0.05;
        commissionCityTender();
    } else if (policy === 'business') {
        // Program wsparcia lokalnego biznesu: kilka spółek dostaje dotację i lepszy sentyment.
        const candidates = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.isStateOwned);
        for (let i = 0; i < 3 && candidates.length; i++) {
            const stock = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
            const grant = Math.min(20000, Math.max(0, city.budget * 0.02));
            if (grant > 0) {
                city.budget -= grant;
                adjustCompanyCash(stock, grant);
                adjustBalanceSheet(stock, { assets: grant, retainedEarnings: grant });
                recordPayment('external:miasto', stock, grant, 'Program wsparcia biznesu');
            }
            applyPriceEffect(stock.symbol, 0.02, 'positive', 'company');
            logEvent(`🏙️ Program wsparcia biznesu: ${stock.name} otrzymuje ${formatZl(grant, 0)} dotacji od miasta.`, 'city');
        }
    } else if (policy === 'municipal') {
        municipalCompanies.forEach(company => { company.budget += 10000; });
        if (typeof runMunicipalCompanyLogic === 'function') runMunicipalCompanyLogic(); // dodatkowa szansa na IPO
    }
}

/**
 * Miasto zleca inwestycję budowlaną: dotacja dla spółki (najchętniej państwowej lub z sektora usług
 * publicznych), która ogłasza przetarg istniejącą ścieżką startCompanyInvestment.
 */
function commissionCityTender() {
    const eligibleOptions = stock => getInvestmentCatalogForCompany(stock)
        .filter(item => CONSTRUCTION_KINDS.includes(item.kind) && (Number(stock.departments?.development?.level) || 0) >= item.minDevLevel);
    const candidates = stocks
        .filter(s => !s.assetType && !s.isBankrupt && !(s.sector || []).includes('Budowlany'))
        .map(stock => ({ stock, options: eligibleOptions(stock) }))
        .filter(item => item.options.length > 0)
        .sort((a, b) => Number(!!b.stock.isStateOwned) - Number(!!a.stock.isStateOwned) || Math.random() - 0.5);

    for (const { stock, options } of candidates.slice(0, 6)) {

        const investment = getRandomElement(options);
        const spec = getConstructionSpec(investment.id);
        const grant = Math.round(spec.cost * 1.3);
        if (city.budget < grant) return null;

        city.budget -= grant;
        adjustCompanyCash(stock, grant);
        adjustBalanceSheet(stock, { assets: grant, retainedEarnings: grant });
        const result = startCompanyInvestment(stock, investment.id, 'owner');
        if (result.ok) {
            recordPayment('external:miasto', stock, grant, `Dotacja miejska: ${spec.name}`);
            logEvent(`🏙️ Burmistrz ${city.mayor.name} zleca przez ${stock.name} inwestycję „${spec.name}” (dotacja ${formatZl(grant, 0)}) — przetarg dla firm budowlanych.`, 'city');
            return stock.symbol;
        }
        // Nie udało się ogłosić przetargu — dotacja wraca do miasta.
        adjustCompanyCash(stock, -grant);
        adjustBalanceSheet(stock, { assets: -grant, retainedEarnings: -grant });
        city.budget += grant;
    }
    return null;
}

// =================================================================================
// WYBORY (co 4 lata gry; kampania w ostatnim roku)
// =================================================================================

function processCityYearly() {
    ensureCityModel();
    runCityEconomy();
    if (typeof runMunicipalCompanyLogic === 'function') runMunicipalCompanyLogic();

    city.mayor.electionYear--;
    if (city.mayor.electionYear === 1 && !city.election) startElectionCampaign();
    if (city.mayor.electionYear <= 0) {
        if (!city.election) startElectionCampaign();
        triggerMayoralElection();
        city.mayor.electionYear = 4;
    }
    runStatePensionProgram(); // mandaty Państwowego Programu Emerytalnego (raz w roku gry)
}

function startElectionCampaign() {
    const others = Object.keys(MAYOR_POLICIES).filter(policy => policy !== city.mayor.policy).sort(() => Math.random() - 0.5);
    const usedNames = new Set([city.mayor.name]);
    const challenger = policy => {
        const name = getRandomElement(MAYOR_NAMES.filter(item => !usedNames.has(item)));
        usedNames.add(name);
        return { id: `cand_${policy}`, name, policy, base: getRandomInRange(35, 60), donations: 0, playerDonations: 0 };
    };

    city.election = {
        candidates: [
            { id: 'incumbent', name: city.mayor.name, policy: city.mayor.policy, base: city.mayor.support, donations: 0, playerDonations: 0, incumbent: true },
            ...others.slice(0, getRandomIntInRange(1, 2)).map(challenger)
        ]
    };
    logEvent(`🗳️ Rusza kampania przed wyborami na prezydenta miasta: ${city.election.candidates.map(c => `${c.name} (${MAYOR_POLICIES[c.policy].label})`).join(', ')}.`, 'city');
}

/** Siła kampanii: poparcie bazowe + darowizny (malejące korzyści). */
function getCandidateScore(candidate) {
    return candidate.base + 8 * Math.log10(1 + (candidate.donations || 0) / 100);
}

function donateToCampaign(candidateId, amount) {
    const candidate = city.election?.candidates.find(c => c.id === candidateId);
    if (!candidate) return false;
    if (!(amount > 0) || playerWallet.cash < amount) { showToast('Za mało środków w portfelu prywatnym.', 'error'); return false; }

    playerWallet.cash -= amount;
    candidate.donations += amount;
    candidate.playerDonations += amount;
    recordPayment('player-wallet', 'external:kampania', amount, `Darowizna na kampanię: ${candidate.name}`);
    if (amount >= PLAYER_DONATION_COMPLIANCE_LIMIT) {
        playerWallet.complianceRisk = (playerWallet.complianceRisk || 0) + 1;
        logEvent(`⚠️ Duża darowizna na kampanię polityczną zwraca uwagę działu compliance.`, 'warning');
    }
    logEvent(`🗳️ Wspierasz kampanię: ${candidate.name} (${formatZl(amount, 0)}).`, 'city');
    return true;
}

function aiCampaignDonations() {
    if (!city.election) return;
    for (const ai of aiCompetitors) {
        if (!['whale', 'banker', 'pro_investor', 'calm'].includes(ai.personality) || ai.cash < 5000 || Math.random() > 0.5) continue;
        // Inwestorzy wolą politykę prorynkową, bankier i spokojni — stabilnego urzędującego.
        const preferred = ai.personality === 'whale' || ai.personality === 'pro_investor'
            ? city.election.candidates.find(c => c.policy === 'business')
            : city.election.candidates.find(c => c.incumbent);
        const candidate = preferred || getRandomElement(city.election.candidates);
        const amount = Math.min(ai.cash * 0.02, 20000);
        ai.cash -= amount;
        candidate.donations += amount;
    }
}

function triggerMayoralElection(forcedWinnerId = null) {
    if (!city.election) startElectionCampaign();
    aiCampaignDonations();

    const candidates = city.election.candidates;
    const scores = candidates.map(c => ({ candidate: c, score: getCandidateScore(c) + getRandomInRange(-8, 8) }));
    scores.sort((a, b) => b.score - a.score);
    const winner = forcedWinnerId ? candidates.find(c => c.id === forcedWinnerId) : scores[0].candidate;
    const total = scores.reduce((sum, item) => sum + Math.max(1, item.score), 0);

    const changed = winner.policy !== city.mayor.policy || winner.name !== city.mayor.name;
    city.mayor.name = winner.name;
    city.mayor.policy = winner.policy;
    city.mayor.taxModifier = MAYOR_POLICIES[winner.policy].taxModifier;
    city.mayor.support = Math.max(40, Math.min(80, winner.base));
    city.lastElection = scores.map(item => ({ name: item.candidate.name, policy: item.candidate.policy, share: Math.max(1, item.score) / total }));
    city.election = null;

    const results = city.lastElection.map(r => `${r.name} ${(r.share * 100).toFixed(0)}%`).join(', ');
    logEvent(`🗳️ Wybory na prezydenta miasta wygrywa ${winner.name} (${MAYOR_POLICIES[winner.policy].label})${changed ? '' : ' — reelekcja'}. Wyniki: ${results}.`, 'city');

    if (winner.playerDonations > 0) {
        changeReputationWithMayor(winner.playerDonations);
    }
    return winner;
}

/** Wsparcie zwycięzcy: miasto chętniej współpracuje — dotacja dla jednej spółki z portfela funduszu. */
function changeReputationWithMayor(amount) {
    const held = Object.keys(playerPortfolio).map(symbol => stocks.find(s => s.symbol === symbol)).filter(s => s && !s.assetType);
    if (!held.length) return;
    const stock = getRandomElement(held);
    changeReputation('player', stock.symbol, Math.min(10, amount / 100));
    logEvent(`🤝 Nowy prezydent pamięta Twoje wsparcie — relacje z ${stock.name} się poprawiają.`, 'city');
}

// =================================================================================
// FESTYN (raz w roku gry)
// =================================================================================

/** Co kwartał: start festynu, gdy minęło odliczanie (raz w roku). */
function processCityQuarterly() {
    ensureCityModel();
    if (!festival && nextFestivalCountdown <= 0) updateCity();
    if (ensurePpp().offers.length < 2) generatePppOffer(); // nowy projekt PPP co kwartał
}

function updateCity() {
    ensureCityModel();
    const taxRevenue = city.population * 10;
    city.budget += taxRevenue;
    startFestival();
    if (festival) city.mayor.support = Math.min(95, city.mayor.support + 3 * festival.tier);
}

/** Po festynie: sektory turystyczne i usługowe dostają chwilowy impuls. */
function applyFestivalSectorBoost(successScore) {
    const strength = successScore > 100 ? 0.03 : 0.015;
    stocks
        .filter(s => !s.assetType && !s.isBankrupt && (s.sector || []).some(sector => FESTIVAL_BOOST_SECTORS.includes(sector)))
        .forEach(stock => applyPriceEffect(stock.symbol, strength, 'positive', 'company'));
    city.mayor.support = Math.min(95, city.mayor.support + (successScore > 100 ? 5 : 1));
}

// =================================================================================
// PAŃSTWO: PRYWATYZACJA I ANTYMONOPOL
// =================================================================================

/** Państwo sprzedaje część udziałów spółki państwowej z dyskontem; zapisy przez tydzień gry. */
function triggerStatePrivatizationEvent() {
    if (privatizationOffer) return null;
    const candidates = stocks.filter(s => s.isStateOwned && !s.isBankrupt && !s.assetType && (s.stateOwnershipPct || 0) > 0.4);
    if (!candidates.length) return null;

    const stock = getRandomElement(candidates);
    const pct = Math.min((stock.stateOwnershipPct || 0) - 0.3, getRandomInRange(0.10, 0.20));
    const shares = Math.floor(stock.totalShares * pct);
    if (shares <= 0) return null;

    privatizationOffer = {
        symbol: stock.symbol,
        shares,
        remaining: shares,
        price: Math.round(stock.price * (1 - getRandomInRange(0.05, 0.10)) * 100) / 100,
        maxFundShare: 0.3,
        fundShares: 0,
        remainingMs: BASE_DELAYS.weekly
    };
    logEvent(`🏛️ PRYWATYZACJA: Skarb Państwa sprzedaje ${shares.toLocaleString('pl-PL')} akcji ${stock.name} po ${formatZl(privatizationOffer.price, 2)} (dyskonto do rynku). Zapisy przez tydzień.`, 'state');
    addMail({
        sender: CORPORATION_SENDER,
        subject: `Oferta prywatyzacyjna: ${stock.name}`,
        body: `Skarb Państwa sprzedaje akcje ${stock.name} po ${formatZl(privatizationOffer.price, 2)}. Fundusz może kupić do 30% oferty. Zapisy przez tydzień gry.`,
        importance: 3, symbol: stock.symbol, action: { type: 'privatization', symbol: stock.symbol }
    });
    return privatizationOffer;
}

function subscribePrivatization(quantity) {
    const offer = privatizationOffer;
    const stock = offer && stocks.find(s => s.symbol === offer.symbol);
    if (!stock) { showToast('Brak aktywnej oferty prywatyzacyjnej.', 'default'); return false; }
    if (!canAccessExchange(stock.exchange)) { showToast('Twoje stanowisko nie daje dostępu do tej giełdy.', 'warning'); return false; }

    const limit = Math.floor(offer.shares * offer.maxFundShare) - offer.fundShares;
    quantity = Math.min(Math.floor(quantity), limit, offer.remaining, Math.floor(playerCash / offer.price));
    if (!(quantity > 0)) { showToast('Nie można zapisać się na tyle akcji (limit, gotówka funduszu).', 'error'); return false; }

    const cost = quantity * offer.price;
    playerCash -= cost;
    governmentTreasury += cost;
    recordPayment('player-fund', 'external:skarb-panstwa', cost, `Prywatyzacja ${stock.symbol}`);
    transferStateShares(stock, quantity);

    const holding = playerPortfolio[stock.symbol] || { shares: 0, avgPrice: 0, assetType: 'stock' };
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + quantity);
    holding.shares += quantity;
    playerPortfolio[stock.symbol] = holding;

    offer.remaining -= quantity;
    offer.fundShares += quantity;
    logEvent(`🏛️ Fundusz kupuje ${quantity} akcji ${stock.name} w prywatyzacji za ${formatZl(cost, 2)}.`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

/** Akcje przechodzą od państwa (poza wolnym obrotem) do inwestora — trafiają do obrotu jako posiadane. */
function transferStateShares(stock, quantity) {
    stock.stateOwnershipPct = Math.max(0, (stock.stateOwnershipPct || 0) - quantity / stock.totalShares);
    stock.sharesHeld += quantity;
    if (stock.isStateOwned && stock.stateOwnershipPct < 0.5) {
        stock.isStateOwned = false;
        logEvent(`🏛️ ${stock.name} przestaje być spółką kontrolowaną przez państwo.`, 'state');
    }
}

/** Co tydzień: koniec zapisów — resztę biorą boty, niesprzedane akcje zostają u państwa. */
function processPrivatizationWeekly(deltaMs = BASE_DELAYS.weekly) {
    const offer = privatizationOffer;
    if (!offer) return;
    offer.remainingMs -= deltaMs;
    if (offer.remainingMs > 0) return;

    const stock = stocks.find(s => s.symbol === offer.symbol);
    privatizationOffer = null;
    if (!stock) return;

    let sold = offer.fundShares;
    if (!(offer.price > 0)) return; // zabezpieczenie: bez prawidłowej ceny boty nie kupują
    for (const ai of aiCompetitors.filter(ai => ai.personality !== 'market_maker' && Number.isFinite(ai.cash) && ai.cash > 0).sort(() => Math.random() - 0.5)) {
        if (offer.remaining <= 0) break;
        const quantity = Math.min(offer.remaining, Math.floor(ai.cash * 0.1 / offer.price));
        if (quantity <= 0) continue;
        const cost = quantity * offer.price;
        ai.cash -= cost;
        governmentTreasury += cost;
        const holding = ai.portfolio[stock.symbol] || { shares: 0, avgPrice: 0 };
        holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + quantity);
        holding.shares += quantity;
        ai.portfolio[stock.symbol] = holding;
        transferStateShares(stock, quantity);
        offer.remaining -= quantity;
        sold += quantity;
    }
    logEvent(`🏛️ Prywatyzacja ${stock.name} zakończona: sprzedano ${sold.toLocaleString('pl-PL')} z ${offer.shares.toLocaleString('pl-PL')} akcji.`, 'state');
}

/** Urząd antymonopolowy: monopolista może dostać karę (szansa i wysokość zależą od poziomu urzędu). */
function applyAntitrustPenalties() {
    const office = antitrustOffice;
    const penalized = [];
    for (const stock of stocks.filter(s => s.isMonopolist && !s.isBankrupt && !s.isStateOwned)) {
        if (Math.random() >= office.analysisCapacity) continue;
        const rate = 0.02 + office.accuracy * 0.05;
        const fine = Math.round(Math.max(0, stock.cash) * rate);
        if (fine <= 0) continue;
        adjustCompanyCash(stock, -fine);
        adjustBalanceSheet(stock, { assets: -fine, retainedEarnings: -fine });
        governmentTreasury += fine;
        recordPayment(stock, 'external:skarb-panstwa', fine, 'Kara antymonopolowa');
        applyPriceEffect(stock.symbol, -0.03, 'negative', 'company');
        logEvent(`⚖️ Urząd antymonopolowy nakłada na ${stock.name} karę ${formatZl(fine, 0)} za nadużywanie pozycji monopolisty.`, 'state');
        penalized.push(stock.symbol);
    }
    return penalized;
}

// =================================================================================
// PARTNERSTWO PUBLICZNO-PRYWATNE (etap F3): fundusz współfinansuje projekty miasta
// Odsetki co tydzień z budżetu miasta, kapitał w terminie; brak środków = zaległość,
// po 2 przedłużeniach niewypłacalność (odzysk 60%). Łącznie do 15% aktywów funduszu.
// =================================================================================

const PPP_PROJECT_TYPES = [
    { name: 'Parking wielopoziomowy', icon: '🅿️' },
    { name: 'Spalarnia odpadów', icon: '♻️' },
    { name: 'Linia tramwajowa', icon: '🚋' },
    { name: 'Basen miejski', icon: '🏊' },
    { name: 'Termomodernizacja szkół', icon: '🏫' },
    { name: 'Farma fotowoltaiczna', icon: '☀️' }
];
const PPP_FUND_LIMIT = 0.15;
const PPP_OFFER_WEEKS = 6;
const PPP_RECOVERY = 0.6;

function ensurePpp() {
    if (!city.ppp) city.ppp = { offers: [], nextId: 1 };
    if (!playerFund) return city.ppp;
    if (!playerFund.ppp) playerFund.ppp = [];
    return city.ppp;
}

/** Ryzyko projektu: słaby budżet i niskie poparcie burmistrza podnoszą oprocentowanie i ryzyko. */
function getCityCreditRisk() {
    const budgetRisk = city.budget > 500000 ? 0 : city.budget > 0 ? 0.03 : 0.08;
    const supportRisk = Math.max(0, (50 - (city.mayor?.support || 50)) / 500);
    return Math.min(0.15, budgetRisk + supportRisk);
}

function generatePppOffer() {
    const ppp = ensurePpp();
    const type = getRandomElement(PPP_PROJECT_TYPES);
    const risk = getCityCreditRisk();
    const offer = {
        id: `ppp_${ppp.nextId++}`,
        name: type.name,
        icon: type.icon,
        total: Math.round(getRandomInRange(15000, 60000) / 500) * 500,
        raised: 0,
        rate: 0.05 + risk + getRandomInRange(0, 0.02),
        termWeeks: getRandomIntInRange(12, 24),
        weeksLeft: PPP_OFFER_WEEKS,
        risk
    };
    ppp.offers.push(offer);
    logEvent(`🏙️ Miasto ogłasza projekt PPP: ${offer.icon} ${offer.name} — ${formatZl(offer.total, 0)}, ${(offer.rate * 100).toFixed(1)}% rocznie, ${offer.termWeeks} tyg.`, 'city');
    return offer;
}

function getFundPppValue() {
    return (playerFund?.ppp || []).reduce((sum, stake) => sum + stake.principal + (stake.unpaid || 0), 0);
}

function getFundPppCapacity() {
    return Math.max(0, getFundAssets() * PPP_FUND_LIMIT - getFundPppValue());
}

function investInPpp(offerId, amount) {
    const ppp = ensurePpp();
    const offer = ppp.offers.find(item => item.id === offerId);
    amount = Math.floor(Number(amount));
    if (!offer) { showToast('Oferta PPP nieaktualna.', 'error'); return null; }
    amount = Math.min(amount, offer.total - offer.raised);
    if (!(amount >= 100)) { showToast(`Minimalny udział: ${formatZl(100, 0)}.`, 'error'); return null; }
    if (amount > playerCash) { showToast('Za mało gotówki funduszu.', 'error'); return null; }
    if (amount > getFundPppCapacity() + 1e-6) { showToast(`Limit PPP: ${(PPP_FUND_LIMIT * 100).toFixed(0)}% aktywów funduszu.`, 'error'); return null; }

    playerCash -= amount;
    city.budget += amount;
    offer.raised += amount;
    const stake = { id: `${offer.id}_${playerFund.ppp.length + 1}`, name: offer.name, icon: offer.icon, principal: amount, rate: offer.rate, weeksLeft: offer.termWeeks, termWeeks: offer.termWeeks, unpaid: 0, extensions: 0 };
    playerFund.ppp.push(stake);
    recordPayment('player-fund', 'external:miasto', amount, `PPP: ${offer.name}`);
    if (typeof noteCorporateGoal === 'function') noteCorporateGoal('project');
    logEvent(`🤝 Fundusz współfinansuje projekt miejski ${offer.icon} ${offer.name}: ${formatZl(amount, 0)} na ${offer.termWeeks} tyg.`, 'review');
    if (offer.raised >= offer.total) ppp.offers = ppp.offers.filter(item => item !== offer);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return stake;
}

// B4: zdarzenia PPP — wcześniejszy wykup z premią, propozycja restrukturyzacji.
const PPP_EARLY_BUYOUT_PREMIUM = 0.03;

/** Zwraca true, gdy udział zniknął (wykup). */
function processPppEvents(stake) {
    if (city.budget > stake.principal * 4 && stake.weeksLeft > 8 && Math.random() < 0.01) {
        const paid = stake.principal * (1 + PPP_EARLY_BUYOUT_PREMIUM);
        city.budget -= paid;
        playerCash += paid;
        playerFund.ppp = playerFund.ppp.filter(item => item !== stake);
        addMail({ sender: CORPORATION_SENDER, subject: `🏙️ Wcześniejszy wykup PPP: ${stake.name}`, body: `Miasto ma nadwyżkę i wykupuje udział funduszu przed terminem: ${formatZl(paid, 0)} (nominał + ${(PPP_EARLY_BUYOUT_PREMIUM * 100).toFixed(0)}% premii).`, importance: 2 });
        return true;
    }
    if (!stake.restructure && city.budget < stake.principal && stake.weeksLeft <= 8 && Math.random() < 0.25) {
        stake.restructure = 'pending';
        addMail({ sender: CORPORATION_SENDER, subject: `🏙️ Miasto prosi o restrukturyzację PPP: ${stake.name}`, body: `Budżet miasta nie wystarczy na spłatę ${formatZl(stake.principal, 0)}. Propozycja: przesunięcie spłaty o pół roku i oprocentowanie +1 pkt proc. Odmowa: miasto szuka pomocy w Skarbie Państwa — jeśli jej nie dostanie, grozi niewypłacalność (odzysk ${(PPP_RECOVERY * 100).toFixed(0)}%).`, importance: 3, action: { type: 'pppRestructure', stakeId: stake.id } });
    }
    return false;
}

function respondPppRestructure(stakeId, accept) {
    const stake = (playerFund?.ppp || []).find(item => item.id === stakeId);
    if (!stake || stake.restructure !== 'pending') { showToast('Ta propozycja jest nieaktualna.', 'default'); return false; }
    if (accept) {
        stake.restructure = 'accepted';
        stake.weeksLeft += 26;
        stake.rate += 0.01;
        stake.extensions = 0;
        logEvent(`🤝 Fundusz zgadza się na restrukturyzację PPP ${stake.name}: spłata za ${stake.weeksLeft} tyg., ${(stake.rate * 100).toFixed(1)}% rocznie.`, 'review');
    } else {
        stake.restructure = 'refused';
        const help = Math.min(Math.max(0, governmentTreasury), stake.principal);
        if (Math.random() < 0.5 && help >= stake.principal) {
            governmentTreasury -= help;
            city.budget += help;
            logEvent(`🏛️ Skarb Państwa ratuje miasto — PPP ${stake.name} zostanie spłacone w terminie.`, 'review');
        } else {
            stake.extensions = 2; // bez dalszych przesunięć
            logEvent(`⚠️ Fundusz odmawia restrukturyzacji PPP ${stake.name}; miasto nie dostaje pomocy — spłata zagrożona.`, 'review');
        }
    }
    return true;
}

/** Co tydzień: odsetki i spłaty PPP z budżetu miasta, wygasanie ofert. */
function processPppWeekly() {
    const ppp = ensurePpp();
    for (const offer of [...ppp.offers]) {
        offer.weeksLeft--;
        if (offer.weeksLeft <= 0) ppp.offers = ppp.offers.filter(item => item !== offer); // resztę miasto finansuje samo
    }
    if (!playerFund) return;
    for (const stake of [...playerFund.ppp]) {
        const interest = stake.principal * stake.rate / FUND_WEEKS_PER_YEAR + (stake.unpaid || 0);
        if (city.budget >= interest) {
            city.budget -= interest;
            playerCash += interest;
            if (stake.unpaid > 0) logEvent(`🏙️ Miasto nadrabia zaległe odsetki PPP ${stake.name}.`, 'review');
            stake.unpaid = 0;
        } else {
            if (!stake.unpaid) logEvent(`⚠️ Miasto opóźnia odsetki PPP ${stake.icon} ${stake.name} — odsetki narastają.`, 'review');
            stake.unpaid = interest;
        }
        if (processPppEvents(stake)) continue;
        stake.weeksLeft--;
        if (stake.weeksLeft > 0) continue;

        if (city.budget >= stake.principal) {
            city.budget -= stake.principal;
            playerCash += stake.principal;
            playerFund.ppp = playerFund.ppp.filter(item => item !== stake);
            logEvent(`🏙️ Miasto spłaca udział funduszu w PPP ${stake.icon} ${stake.name}: ${formatZl(stake.principal, 0)}.`, 'review');
        } else if (stake.extensions < 2) {
            stake.extensions++;
            stake.weeksLeft = 4;
            logEvent(`⚠️ Miasto przesuwa spłatę PPP ${stake.name} o 4 tygodnie (brak środków w budżecie).`, 'city');
        } else {
            const recovery = stake.principal * PPP_RECOVERY;
            playerCash += recovery;
            playerFund.ppp = playerFund.ppp.filter(item => item !== stake);
            logEvent(`💥 Miasto nie spłaca PPP ${stake.name} — fundusz odzyskuje ${recovery.toFixed(0)} z ${formatZl(stake.principal, 0)}.`, 'review');
        }
    }
}

// =================================================================================
// PAŃSTWOWY PROGRAM EMERYTALNY (etap F3): raz w roku mandaty dla 3 najlepszych funduszy
// =================================================================================

let statePension = { history: [], lastRanking: [] };

/** Ranking kwalifikacji: wynik vs GIG z 4 okresów, zaufanie klientów. */
function getPensionRanking() {
    if (typeof getJuMarketFunds !== 'function') return [];
    return getJuMarketFunds()
        .map(fund => ({ id: fund.id, name: fund.name, kind: fund.kind, score: fund.ret * 100 + (fund.trust - 50) / 5, assets: fund.assets, nav: fund.nav }))
        .sort((a, b) => b.score - a.score);
}

function runStatePensionProgram() {
    const ranking = getPensionRanking();
    statePension.lastRanking = ranking.slice(0, 8).map(({ id, name, kind, score }) => ({ id, name, kind, score }));
    const winners = ranking.slice(0, 3);
    if (!winners.length) return [];
    const grants = [];
    for (const [index, fund] of winners.entries()) {
        const base = Math.min(governmentTreasury * 0.004, 20000) * (1 - index * 0.25);
        if (fund.kind === 'player') {
            const amount = Math.min(base, getFundAssets() * 0.15);
            if (amount < 100) continue;
            governmentTreasury -= amount;
            addOutsideSubscription('institution', 'Państwowy Program Emerytalny', amount);
            grants.push({ name: fund.name, amount });
            logEvent(`🏛️ Państwowy Program Emerytalny powierza Twojemu funduszowi ${formatZl(amount, 0)} (miejsce ${index + 1} w rankingu).`, 'review');
        } else if (fund.kind === 'bot') {
            const manager = corporation.managers.find(item => item.id === fund.id);
            if (!manager) continue;
            const amount = Math.min(base, getBotFundAssets(manager.fund) * 0.15);
            governmentTreasury -= amount;
            manager.fund.cash += amount;
            manager.fund.units += amount / Math.max(0.01, getBotFundNav(manager.fund) || fund.nav);
            grants.push({ name: fund.name, amount });
        } else {
            grants.push({ name: fund.name, amount: base });
            governmentTreasury -= base;
        }
    }
    statePension.history.unshift({ year: (statePension.history[0]?.year || 0) + 1, grants });
    if (statePension.history.length > 5) statePension.history.length = 5;
    logEvent(`🏛️ Program Emerytalny: mandaty dla ${grants.map(g => g.name).join(', ')}.`, 'state');
    return grants;
}

// #################################################################################
// ## projects.js
// #################################################################################

// projects.js — Konsorcja i projekty specjalne miasta (wersja 0.10.2, część M6)
//
// 11 megaprojektów — każdy do zrealizowania tylko raz. Konsorcjum: do 5 spółek finansujących
// (+ wykonawca budowlany). Projekt przechodzi etapy z G4 (projekt → budowa → weryfikacja), a po
// ukończeniu uczestnicy dostają małe, stałe bonusy proporcjonalne do wkładu (wzrost przychodów,
// wycena, kondycja). Po przejęciu uczestnika bonus przechodzi na spółkę przejmującą.
// Projekty czasowe: tańsze, z mniejszymi bonusami, do rozpoczęcia tylko w terminie, bonus działa
// najwyżej 5 lat gry (20 kwartałów). Spółka, w której fundusz jest większościowcem, może dołączyć
// do konsorcjum w fazie zapisów.

const MAX_CONSORTIUM_MEMBERS = 5;
const CONSORTIUM_SIGNUP_QUARTERS = 1;
const BUILDER_SHARE = 0.1;                 // wykonawca dokłada 10% i dostaje część bonusu
const MAX_TIMED_BONUS_QUARTERS = 20;       // 5 lat gry
const MAX_ACTIVE_PROJECTS = 2;
const MAX_MEMBER_SHARE = 0.6;              // jedna spółka finansuje najwyżej 60% — konsorcjum ma ≥ 2 uczestników

const MEGA_PROJECTS = [
    { id: 'stadium',    name: 'Stadion Narodowy',              icon: '🏟️', cost: 30e6, quarters: 6, sectors: ['Usługi', 'Turystyka', 'Media'],        bonus: { growth: 0.006, valuation: 0.03, health: 0.3 } },
    { id: 'airport',    name: 'Port lotniczy',                 icon: '✈️', cost: 60e6, quarters: 8, sectors: ['Transport i logistyka', 'Turystyka'], bonus: { growth: 0.010, valuation: 0.05, health: 0.4 } },
    { id: 'nuclear',    name: 'Elektrownia jądrowa',           icon: '☢️', cost: 80e6, quarters: 10, sectors: ['Energia', 'Przemysł'],                 bonus: { growth: 0.010, valuation: 0.06, health: 0.6 } },
    { id: 'metro',      name: 'Metro',                         icon: '🚇', cost: 50e6, quarters: 8, sectors: ['Transport i logistyka', 'Nieruchomości'],          bonus: { growth: 0.008, valuation: 0.04, health: 0.3 } },
    { id: 'seaport',    name: 'Port morski',                   icon: '⚓', cost: 45e6, quarters: 7, sectors: ['Transport i logistyka', 'Przemysł'],   bonus: { growth: 0.008, valuation: 0.04, health: 0.4 } },
    { id: 'research',   name: 'Centrum badawcze',              icon: '🔬', cost: 25e6, quarters: 5, sectors: ['Badania', 'Medycyna', 'Technologia'],  bonus: { growth: 0.006, valuation: 0.05, health: 0.3 } },
    { id: 'bridge',     name: 'Most nad rzeką',                icon: '🌉', cost: 20e6, quarters: 5, sectors: ['Transport i logistyka', 'Budowlany'],  bonus: { growth: 0.004, valuation: 0.02, health: 0.2 } },
    { id: 'hospital',   name: 'Szpital kliniczny',             icon: '🏥', cost: 35e6, quarters: 6, sectors: ['Medycyna', 'Usługi'],                  bonus: { growth: 0.006, valuation: 0.04, health: 0.4 } },
    { id: 'techcampus', name: 'Kampus technologiczny',         icon: '💻', cost: 40e6, quarters: 6, sectors: ['Technologia', 'Gaming', 'Badania'],    bonus: { growth: 0.009, valuation: 0.05, health: 0.3 } },
    { id: 'expo',       name: 'Centrum wystawiennicze',        icon: '🏛️', cost: 22e6, quarters: 5, sectors: ['Usługi', 'Media', 'Dobra konsumpcyjne'], bonus: { growth: 0.005, valuation: 0.03, health: 0.2 } },
    { id: 'offshore',   name: 'Morska farma wiatrowa',         icon: '🌬️', cost: 55e6, quarters: 8, sectors: ['Energia', 'Chemia'],                   bonus: { growth: 0.009, valuation: 0.05, health: 0.4 } }
];

const TIMED_PROJECT_TEMPLATES = [
    { id: 'games',    name: 'Igrzyska akademickie',     icon: '🏅', cost: 6e6, quarters: 3, sectors: ['Usługi', 'Turystyka', 'Media'], bonus: { growth: 0.003, valuation: 0.01, health: 0.1 } },
    { id: 'climate',  name: 'Szczyt klimatyczny',       icon: '🌍', cost: 4e6, quarters: 2, sectors: ['Energia', 'Chemia', 'Usługi'],  bonus: { growth: 0.002, valuation: 0.015, health: 0.1 } },
    { id: 'techfest', name: 'Festiwal technologii',     icon: '🤖', cost: 5e6, quarters: 2, sectors: ['Technologia', 'Gaming'],        bonus: { growth: 0.003, valuation: 0.015, health: 0.1 } },
    { id: 'station',  name: 'Remont dworca głównego',   icon: '🚉', cost: 8e6, quarters: 3, sectors: ['Transport i logistyka', 'Budowlany'],       bonus: { growth: 0.003, valuation: 0.01, health: 0.15 } },
    { id: 'culture',  name: 'Europejska Stolica Kultury', icon: '🎭', cost: 7e6, quarters: 3, sectors: ['Media', 'Turystyka', 'Usługi'], bonus: { growth: 0.003, valuation: 0.02, health: 0.1 } },
    { id: 'floodwall', name: 'Wały przeciwpowodziowe',  icon: '🌊', cost: 5e6, quarters: 2, sectors: ['Budowlany', 'Nieruchomości'],   bonus: { growth: 0.002, valuation: 0.01, health: 0.2 } }
];

let specialProjects = createSpecialProjects();

function createSpecialProjects() {
    return { completed: [], active: [], timedOffers: [], bonds: [], nextId: 1 };
}

function ensureSpecialProjects() {
    specialProjects = { ...createSpecialProjects(), ...(specialProjects || {}) };
    return specialProjects;
}

function getProjectQuarter() {
    return typeof macro === 'object' ? macro.quarter : 0;
}

function isMegaProjectTaken(id) {
    return specialProjects.completed.some(p => !p.timed && p.templateId === id) || specialProjects.active.some(p => !p.timed && p.templateId === id);
}

// =================================================================================
// BONUSY SPÓŁEK
// =================================================================================

function getActiveSpecialBonuses(stock) {
    const quarter = getProjectQuarter();
    return (stock?.specialBonuses || []).filter(b => !b.until || b.until > quarter);
}

/** Dodatek do kwartalnego wzrostu przychodów (computeQuarterResults). */
function getSpecialProjectGrowth(stock) {
    return getActiveSpecialBonuses(stock).reduce((sum, b) => sum + b.growth, 0);
}

/** Mnożnik wyceny (getValuationMultiplier). */
function getSpecialProjectValuation(stock) {
    return 1 + getActiveSpecialBonuses(stock).reduce((sum, b) => sum + b.valuation, 0);
}

/** Przejęcie: bonusy celu przechodzą na spółkę przejmującą. */
function transferSpecialBonuses(from, to) {
    if (!from?.specialBonuses?.length || !to) return;
    if (!Array.isArray(to.specialBonuses)) to.specialBonuses = [];
    for (const bonus of from.specialBonuses) to.specialBonuses.push({ ...bonus, inheritedFrom: from.symbol });
    for (const project of specialProjects.completed) {
        for (const member of project.participants) if (member.symbol === from.symbol) member.heldBy = to.symbol;
    }
    logEvent(`🏗️ ${to.name} przejmuje bonusy projektów specjalnych ${from.name}.`, 'company');
    from.specialBonuses = [];
}

// =================================================================================
// KONSORCJA
// =================================================================================

// 0.15.5 B1: specjalność wykonawcy = sektory, w których realizuje megaprojekty (własne sektory poza Budowlanym + losowe z puli projektów).
const MEGA_RECENT_PROJECTS = 10;           // okno „ostatnich” projektów dla rozkładu udziału w konsorcjach

function getBuilderSpecialties(stock) {
    if (!Array.isArray(stock.constructionSpecialties) || !stock.constructionSpecialties.length) {
        const pool = [...new Set([...MEGA_PROJECTS, ...TIMED_PROJECT_TEMPLATES].flatMap(p => p.sectors.map(name => canonicalSectorName(name))))];
        const own = (stock.sector || []).filter(sec => sec !== 'Budowlany');
        const extra = pool.filter(sec => !own.includes(sec)).sort(() => Math.random() - 0.5).slice(0, Math.max(2, 3 - own.length));
        stock.constructionSpecialties = [...own, ...extra].slice(0, 4);
    }
    return stock.constructionSpecialties;
}

function isSectorMatch(sectors, project) {
    return (sectors || []).some(sec => project.sectors.some(name => canonicalSectorName(name) === sec));
}

/** Ile razy spółka była w konsorcjum wśród ostatnich projektów (hamulec dominacji jednej spółki). */
function getMegaParticipationCount(symbol) {
    const recent = [...specialProjects.active, ...specialProjects.completed.slice(0, MEGA_RECENT_PROJECTS)];
    return recent.filter(p => (p.participants || []).some(m => m.symbol === symbol || m.heldBy === symbol)).length;
}

/** Wykonawca z właściwą specjalnością (gdy żaden nie pasuje — którykolwiek), losowany z wagą pierwiastka z gotówki. */
function findBuilder(project) {
    const share = project.cost * BUILDER_SHARE;
    const pool = stocks.filter(s => !s.assetType && !s.isBankrupt && s.sector?.includes('Budowlany') && s.cash >= share);
    const matching = pool.filter(s => isSectorMatch(getBuilderSpecialties(s), project));
    const list = matching.length ? matching : pool;
    return list.map(s => ({ stock: s, score: Math.sqrt(Math.max(1, s.cash)) * (0.6 + Math.random() * 0.8) / (1 + getMegaParticipationCount(s.symbol)) }))
        .sort((a, b) => b.score - a.score)[0]?.stock || null;
}

/** Kandydaci do konsorcjum: spółki z pasującym sektorem (spoza dopasowanych tylko gdy brakuje uczestników), z gotówką na wkład. */
function findConsortiumCandidates(project, exclude = []) {
    const minContribution = project.cost * 0.1;
    const ranked = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.mergerProcess && !exclude.includes(s.symbol) && s.cash >= minContribution && !s.sector?.includes('Budowlany'))
        .map(s => ({ stock: s, match: isSectorMatch((typeof getStockSegments === 'function' ? getStockSegments(s) : []).map(seg => seg.sector).concat(s.sector || []), project), score: 0 }));
    for (const c of ranked) c.score = (c.match ? 4 : 1) * Math.sqrt(c.stock.cash) * (0.6 + Math.random() * 0.8) / (1 + getMegaParticipationCount(c.stock.symbol));
    ranked.sort((a, b) => b.score - a.score);
    const matching = ranked.filter(c => c.match);
    return (matching.length >= 2 ? matching : ranked).map(c => c.stock);
}

/** Nowy projekt w fazie zapisów (konsorcjum AI + miejsce dla spółki funduszu). */
function createProject(def, { timed = false, deadline = null } = {}) {
    const project = {
        id: `sp${specialProjects.nextId++}`, templateId: def.id, name: def.name, icon: def.icon, timed,
        cost: def.cost, quarters: def.quarters, sectors: def.sectors, bonus: def.bonus,
        status: 'signup', signupLeft: CONSORTIUM_SIGNUP_QUARTERS, progress: 0, deadline,
        participants: [], builder: null
    };
    // Boty dobierają uczestników (max 4 — jedno miejsce zostaje na zapisy).
    let remaining = project.cost * (1 - BUILDER_SHARE);
    for (const stock of findConsortiumCandidates(project).slice(0, 4)) {
        if (remaining <= 0) break;
        const contribution = Math.min(remaining, stock.cash * 0.3, project.cost * MAX_MEMBER_SHARE);
        if (contribution < project.cost * 0.05) continue;
        project.participants.push({ symbol: stock.symbol, name: stock.name, amount: Math.round(contribution), player: false });
        remaining -= contribution;
    }
    specialProjects.active.push(project);
    logEvent(`🏗️ Miasto ogłasza ${timed ? 'projekt czasowy' : 'megaprojekt'} ${def.icon} ${def.name} (${formatProjectMoney(def.cost)}). Konsorcjum: ${project.participants.map(p => p.name).join(', ') || 'szuka uczestników'}.`, 'city');
    return project;
}

function formatProjectMoney(value) {
    return `${(value / getBaseScale() / 1e6).toFixed(1).replace('.', ',')} mln ${getBaseCurrency()}`;
}

function getProjectFunding(project) {
    return project.participants.reduce((sum, p) => sum + p.amount, 0);
}

/** Spółka funduszu (większość > 50%) dołącza do konsorcjum w fazie zapisów. */
function joinConsortium(projectId, symbol, amount) {
    const project = specialProjects.active.find(p => p.id === projectId);
    const stock = stocks.find(s => s.symbol === symbol);
    amount = Math.floor(Number(amount));
    if (!project || project.status !== 'signup') { showToast('Zapisy do tego konsorcjum są zamknięte.', 'warning'); return false; }
    if (!stock || getFundStakePct(stock) <= 0.5) { showToast('Do konsorcjum zapisujesz spółkę, w której fundusz jest większościowcem.', 'warning'); return false; }
    if (project.participants.some(p => p.symbol === symbol)) { showToast('Ta spółka już jest w konsorcjum.', 'default'); return false; }
    if (project.participants.length >= MAX_CONSORTIUM_MEMBERS) { showToast(`Konsorcjum ma już ${MAX_CONSORTIUM_MEMBERS} spółek.`, 'warning'); return false; }
    if (!(amount >= project.cost * 0.05)) { showToast(`Minimalny wkład: ${formatProjectMoney(project.cost * 0.05)}.`, 'warning'); return false; }
    if (stock.cash < amount) { showToast(`${stock.name} nie ma tyle gotówki.`, 'error'); return false; }
    project.participants.push({ symbol, name: stock.name, amount, player: true });
    if (typeof noteCorporateGoal === 'function') noteCorporateGoal('project');
    logEvent(`🏗️ ${stock.name} (spółka Twojego funduszu) dołącza do konsorcjum ${project.name} z wkładem ${formatProjectMoney(amount)}.`, 'review');
    return true;
}

/** Start budowy: wpłaty uczestników (gotówka → inwestycja w aktywach), wykonawca. */
function startProjectBuild(project) {
    const builder = findBuilder(project);
    const needed = project.cost * (1 - BUILDER_SHARE) - getProjectBondTotal(project);
    const funding = project.participants.filter(p => stocks.some(s => s.symbol === p.symbol && s.cash >= p.amount)).reduce((sum, p) => sum + p.amount, 0);
    if (!builder || funding < needed * 0.999) return false;
    // Skalowanie wkładów do kosztu (nadwyżka nie jest pobierana).
    const scale = needed / funding;
    for (const member of project.participants) {
        const stock = stocks.find(s => s.symbol === member.symbol);
        if (!stock || stock.cash < member.amount) { member.amount = 0; continue; }
        member.amount = Math.round(member.amount * scale);
        adjustCompanyCash(stock, -member.amount); // aktywa bez zmian: gotówka → udział w projekcie
    }
    project.participants = project.participants.filter(p => p.amount > 0);
    const builderShare = project.cost * BUILDER_SHARE;
    adjustCompanyCash(builder, -builderShare);
    project.builder = { symbol: builder.symbol, name: builder.name, amount: builderShare };
    // Wykonawca: marża 8% od wpłat konsorcjum jako przychód (reszta to koszty materiałów i podwykonawców).
    const margin = getProjectFunding(project) * 0.08;
    adjustCompanyCash(builder, margin);
    adjustBalanceSheet(builder, { assets: margin, retainedEarnings: margin });
    project.status = 'building';
    logEvent(`🏗️ Rusza budowa: ${project.icon} ${project.name}. Wykonawca: ${builder.name}. Konsorcjum: ${project.participants.map(p => p.name).join(', ')}.`, 'city');
    return true;
}

function completeProject(project) {
    const quarter = getProjectQuarter();
    redeemProjectBonds(project, true);
    const total = getProjectFunding(project) + (project.builder?.amount || 0);
    const until = project.timed ? quarter + Math.min(MAX_TIMED_BONUS_QUARTERS, project.bonusQuarters || MAX_TIMED_BONUS_QUARTERS) : null;
    const members = [...project.participants, ...(project.builder ? [{ ...project.builder, builder: true }] : [])];
    for (const member of members) {
        const stock = stocks.find(s => s.symbol === member.symbol);
        if (!stock) continue;
        const share = member.amount / Math.max(1, total);
        const scale = Math.min(1, share * 2.5); // większy wkład = większy bonus (połowa udziału daje pełny bonus)
        if (!Array.isArray(stock.specialBonuses)) stock.specialBonuses = [];
        stock.specialBonuses.push({ projectId: project.id, name: project.name, icon: project.icon, growth: project.bonus.growth * scale, valuation: project.bonus.valuation * scale, until });
        stock.financialHealth = Math.min(5, (Number(stock.financialHealth) || 0) + project.bonus.health * scale);
        member.share = share;
    }
    project.status = 'completed';
    project.completedQuarter = quarter;
    specialProjects.active = specialProjects.active.filter(p => p !== project);
    specialProjects.completed.unshift(project);
    logEvent(`🎉 Ukończono ${project.icon} ${project.name}! Bonusy dla: ${members.map(m => m.name).join(', ')}${project.timed ? ` (do ${MAX_TIMED_BONUS_QUARTERS / 4} lat)` : ''}.`, 'city');
    createSuperprojectCompany(project);
}

// 0.16.6 S2: szpital, kampus i centrum wystawiennicze po ukończeniu stają się spółkami państwowymi na GPW (bez IPO).
// Są liczone do spółek krajowych, ale powstają także przy pełnym limicie (3 spółki w całej grze).
const SUPERPROJECT_COMPANIES = {
    hospital:   { symbol: 'SZK', name: 'Szpital Kliniczny SA' },
    techcampus: { symbol: 'KTE', name: 'Kampus Technologiczny SA' },
    expo:       { symbol: 'CWE', name: 'Centrum Wystawiennicze SA' }
};
const SUPERPROJECT_SHARES = 100000;
const SUPERPROJECT_STATE_SHARE = 0.8;

function createSuperprojectCompany(project) {
    const def = project.timed ? null : SUPERPROJECT_COMPANIES[project.templateId];
    if (!def || stocks.some(s => s.symbol === def.symbol)) return null;
    const mega = MEGA_PROJECTS.find(p => p.id === project.templateId);
    const stock = {
        name: def.name, symbol: def.symbol, exchange: 'SILVER',
        price: Math.max(1, mega.cost / SUPERPROJECT_SHARES), volatilityFactor: 0.5,
        totalShares: SUPERPROJECT_SHARES, maxShares: SUPERPROJECT_SHARES, sharesHeld: 0, insiderShares: 0,
        sector: mega.sectors.slice(), financialHealth: 2, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0,
        isStateOwned: true, stateOwnershipPct: SUPERPROJECT_STATE_SHARE, eventResistance: 0.7, stateOfferCooldownUntil: 0,
        dividendPolicy: 'Balanced', dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000), lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null,
        balanceSheet: { assets: 0, liabilities: 0, shareCapital: 0, retainedEarnings: 0 }, quarterlyEarnings: 0, cash: 0,
        priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null },
        superproject: mega.id
    };
    initializeBalanceSheetForStock(stock);
    initializeDescriptionParts(stock);
    generateCEO(stock);
    initializeDepartments(stock);
    assignBankToCompany(stock);
    stocks.push(stock);
    initializeFundamentals(stock, true);
    logEvent(`🏛️ ${mega.icon} ${def.name} (${def.symbol}) — spółka państwowa z ukończonego projektu — debiutuje na GPW (Skarb Państwa ${Math.round(SUPERPROJECT_STATE_SHARE * 100)}%).`, 'city');
    return stock;
}

// =================================================================================
// CO KWARTAŁ
// =================================================================================

function processSpecialProjectsQuarterly() {
    ensureSpecialProjects();
    if (typeof processMarketStabilityProjectQuarterly === 'function') {
        processMarketStabilityProjectQuarterly();
    }
    const quarter = getProjectQuarter();

    for (const project of [...specialProjects.active]) {
        if (project.status === 'signup') {
            project.signupLeft--;
            if (project.signupLeft > 0) continue;
            if (project.timed && project.deadline !== null && quarter + project.quarters > project.deadline) {
                expireProject(project, 'nie zdążono zebrać konsorcjum przed terminem');
            } else if (!startProjectBuild(project)) {
                // Szukamy dalej (do terminu lub 4 kwartały dla megaprojektu).
                project.signupLeft = 1;
                project.waited = (project.waited || 0) + 1;
                topUpConsortium(project);
                if (project.waited >= 4) expireProject(project, 'zabrakło finansowania');
            }
        } else if (project.status === 'building') {
            payProjectBondInterest(project);
            project.progress = Math.min(1, project.progress + 1 / project.quarters);
            if (project.progress >= 1) completeProject(project);
        }
    }

    // Oferty czasowe: wygasają po terminie.
    specialProjects.timedOffers = specialProjects.timedOffers.filter(offer => offer.deadline > quarter);

    // Nowe megaprojekty i projekty czasowe.
    if (specialProjects.active.length < MAX_ACTIVE_PROJECTS && Math.random() < 0.2) {
        const free = MEGA_PROJECTS.filter(p => !isMegaProjectTaken(p.id));
        if (free.length) createProject(getRandomElement(free));
    }
    if (specialProjects.timedOffers.length < 2 && Math.random() < 0.25) {
        const busy = [...specialProjects.timedOffers.map(o => o.templateId), ...specialProjects.active.filter(p => p.timed).map(p => p.templateId)];
        const template = getRandomElement(TIMED_PROJECT_TEMPLATES.filter(t => !busy.includes(t.id)));
        if (template) {
            const deadline = quarter + getRandomIntInRange(6, 10);
            specialProjects.timedOffers.push({ templateId: template.id, deadline, bonusQuarters: getRandomIntInRange(8, MAX_TIMED_BONUS_QUARTERS) });
            logEvent(`⏳ Miasto ogłasza projekt czasowy ${template.icon} ${template.name} — realizacja do ${deadline - quarter} kwartałów.`, 'city');
        }
    }
    // Boty biorą projekty czasowe.
    for (const offer of [...specialProjects.timedOffers]) {
        if (specialProjects.active.length >= MAX_ACTIVE_PROJECTS + 1 || Math.random() > 0.35) continue;
        const template = TIMED_PROJECT_TEMPLATES.find(t => t.id === offer.templateId);
        const project = createProject(template, { timed: true, deadline: offer.deadline });
        project.bonusQuarters = offer.bonusQuarters;
        specialProjects.timedOffers = specialProjects.timedOffers.filter(o => o !== offer);
    }
}

function topUpConsortium(project) {
    const funding = getProjectFunding(project);
    let remaining = project.cost * (1 - BUILDER_SHARE) - funding;
    if (remaining <= 0 || project.participants.length >= MAX_CONSORTIUM_MEMBERS) return;
    for (const stock of findConsortiumCandidates(project, project.participants.map(p => p.symbol))) {
        if (remaining <= 0 || project.participants.length >= MAX_CONSORTIUM_MEMBERS) break;
        const contribution = Math.min(remaining, stock.cash * 0.3, project.cost * MAX_MEMBER_SHARE);
        if (contribution < project.cost * 0.05) continue;
        project.participants.push({ symbol: stock.symbol, name: stock.name, amount: Math.round(contribution), player: false });
        remaining -= contribution;
    }
}

function expireProject(project, reason) {
    specialProjects.active = specialProjects.active.filter(p => p !== project);
    redeemProjectBonds(project, false);
    logEvent(`❌ Projekt ${project.icon} ${project.name} nie dojdzie do skutku (${reason}).`, 'city');
}

/** Gracz zgłasza projekt czasowy ze swoją spółką (większość) jako liderem konsorcjum. */
function launchTimedProject(templateId, symbol, amount) {
    const offer = specialProjects.timedOffers.find(o => o.templateId === templateId);
    const template = TIMED_PROJECT_TEMPLATES.find(t => t.id === templateId);
    if (!offer || !template) { showToast('Ta oferta wygasła.', 'warning'); return false; }
    const project = createProject(template, { timed: true, deadline: offer.deadline });
    project.bonusQuarters = offer.bonusQuarters;
    specialProjects.timedOffers = specialProjects.timedOffers.filter(o => o !== offer);
    if (!joinConsortium(project.id, symbol, amount)) {
        if (!project.participants.length) expireProject(project, 'brak uczestników');
        return false;
    }
    return true;
}

// =================================================================================
// WIDOK: zakładka „Projekty specjalne” w oknie Miasta
// =================================================================================

// =================================================================================
// OBLIGACJE PROJEKTOWE (B3): fundusz bez większości finansuje część projektu długiem
// =================================================================================

const PROJECT_BOND_RATE = 0.07;          // rocznie, wypłacane co kwartał przez konsorcjum
const PROJECT_BOND_PREMIUM = 0.05;       // premia przy ukończeniu
const PROJECT_BOND_MAX_SHARE = 0.2;      // obligacje do 20% kosztu projektu
const PROJECT_BOND_FUND_LIMIT = 0.1;     // fundusz: najwyżej 10% aktywów w obligacjach projektowych

function getProjectBonds() {
    ensureSpecialProjects();
    if (!Array.isArray(specialProjects.bonds)) specialProjects.bonds = [];
    return specialProjects.bonds;
}

function getProjectBondTotal(project) {
    return getProjectBonds().filter(bond => bond.projectId === project.id).reduce((sum, bond) => sum + bond.principal, 0);
}

function getFundProjectBondsValue() {
    return typeof specialProjects === 'object' && specialProjects ? getProjectBonds().reduce((sum, bond) => sum + bond.principal, 0) : 0;
}

/** Konsorcjum płaci proporcjonalnie do wkładów; zwraca kwotę faktycznie zapłaconą. */
function chargeConsortium(project, amount) {
    const total = getProjectFunding(project);
    let paid = 0;
    for (const member of project.participants) {
        const stock = stocks.find(s => s.symbol === member.symbol);
        if (!stock || stock.isBankrupt || total <= 0) continue;
        const due = amount * member.amount / total;
        const pay = Math.max(0, Math.min(due, stock.cash));
        if (pay <= 0) continue;
        adjustCompanyCash(stock, -pay);
        adjustBalanceSheet(stock, { assets: -pay, retainedEarnings: -pay });
        paid += pay;
    }
    return paid;
}

function buyProjectBond(projectId, amount) {
    const project = specialProjects.active.find(p => p.id === projectId);
    amount = Math.floor(Number(amount));
    if (!project) { showToast('Projekt nie jest już realizowany.', 'warning'); return false; }
    const room = project.cost * PROJECT_BOND_MAX_SHARE - getProjectBondTotal(project);
    const fundRoom = getFundAssets() * PROJECT_BOND_FUND_LIMIT - getFundProjectBondsValue();
    if (!(amount >= 100)) { showToast(`Minimalna kwota obligacji: ${formatZl(100, 0)}.`, 'warning'); return false; }
    if (amount > room) { showToast(`Emisja obligacji tego projektu: zostało ${formatZl(Math.max(0, room), 0)}.`, 'warning'); return false; }
    if (amount > fundRoom) { showToast(`Limit funduszu (10% aktywów): zostało ${formatZl(Math.max(0, fundRoom), 0)}.`, 'warning'); return false; }
    if (playerCash < amount) { showToast('Za mało gotówki funduszu.', 'error'); return false; }
    playerCash -= amount;
    recordPayment('player-fund', 'external:konsorcjum', amount, `Obligacje projektowe: ${project.name}`);
    getProjectBonds().push({ projectId: project.id, name: project.name, icon: project.icon, principal: amount, quarter: getProjectQuarter(), interestPaid: 0 });
    if (typeof noteCorporateGoal === 'function') noteCorporateGoal('project');
    logEvent(`📜 Fundusz kupuje obligacje projektowe ${project.icon} ${project.name} za ${formatZl(amount, 0)} (${(PROJECT_BOND_RATE * 100).toFixed(0)}% rocznie + ${(PROJECT_BOND_PREMIUM * 100).toFixed(0)}% premii przy ukończeniu).`, 'review');
    return true;
}

/** Odsetki co kwartał w trakcie budowy; brak gotówki konsorcjum = odsetki przepadają. */
function payProjectBondInterest(project) {
    for (const bond of getProjectBonds().filter(b => b.projectId === project.id)) {
        const paid = chargeConsortium(project, bond.principal * PROJECT_BOND_RATE / 4);
        if (paid > 0) { playerCash += paid; bond.interestPaid += paid; recordPayment('external:konsorcjum', 'player-fund', paid, `Odsetki: obligacje ${project.name}`); }
    }
}

/** Wykup: przy ukończeniu nominał + premia od konsorcjum; projekt upadły w trakcie budowy = odzysk 50%, przed budową = zwrot całości. */
function redeemProjectBonds(project, completed) {
    const bonds = getProjectBonds().filter(b => b.projectId === project.id);
    if (!bonds.length) return;
    let returned = 0, principal = 0;
    for (const bond of bonds) {
        principal += bond.principal;
        if (completed) returned += chargeConsortium(project, bond.principal * (1 + PROJECT_BOND_PREMIUM));
        else returned += project.status === 'building' ? bond.principal * 0.5 : bond.principal;
    }
    playerCash += returned;
    if (returned > 0) recordPayment('external:konsorcjum', 'player-fund', returned, `Wykup obligacji: ${project.name}`);
    const remaining = getProjectBonds().filter(b => b.projectId !== project.id); // ensureSpecialProjects podmienia obiekt
    specialProjects.bonds = remaining;
    logEvent(`📜 Obligacje projektowe ${project.icon} ${project.name}: wykup ${formatZl(returned, 0)} (nominał ${formatZl(principal, 0)})${returned < principal ? ' — strata funduszu' : ''}.`, 'review');
}

function renderProjectStages(project) {
    const info = getInvestmentStageInfo({ progress: project.progress, totalDuration: 1 });
    return renderStageBar(info.segments, info.current.label);
}

function renderProjectBondForm(project) {
    if (!playerFund) return '';
    const own = getProjectBonds().filter(b => b.projectId === project.id).reduce((sum, b) => sum + b.principal, 0);
    const room = Math.max(0, Math.min(project.cost * PROJECT_BOND_MAX_SHARE - getProjectBondTotal(project), getFundAssets() * PROJECT_BOND_FUND_LIMIT - getFundProjectBondsValue()));
    return `<p class="text-xs text-muted">📜 Obligacje projektowe: ${(PROJECT_BOND_RATE * 100).toFixed(0)}% rocznie od konsorcjum, +${(PROJECT_BOND_PREMIUM * 100).toFixed(0)}% przy ukończeniu, upadek w budowie = odzysk 50%.${own ? ` Twoje: ${formatZl(own, 0)}.` : ''}</p>
        ${room >= 100 ? `<div class="bank-card-form"><input type="text" inputmode="numeric" id="bond-amt-${project.id}" value="${Math.floor(room)}" aria-label="Kwota obligacji">
        <button class="btn-secondary" onclick="buyProjectBond('${project.id}', parseFloat(document.getElementById('bond-amt-${project.id}').value)); renderCitySpecialProjects();">Kup obligacje (fundusz)</button></div>` : ''}`;
}

// =================================================================================
// MEGAPROJEKT: NARODOWY SYSTEM STABILIZACJI RYNKU (SMSR)
// =================================================================================

const MARKET_STABILITY_LEVEL_TARGETS = [50e6, 150e6, 350e6]; // Lvl 1: 50M, Lvl 2: 150M, Lvl 3: 350M PLN
const MARKET_STABILITY_STATE_MAX_SHARE = 0.50; // Państwo może sfinansować maksymalnie 50% danego poziomu

let marketStabilityProject = createMarketStabilityProject();

function createMarketStabilityProject() {
    return {
        id: 'smsr',
        name: 'Narodowe Centrum Stabilizacji Rynku (SMSR)',
        icon: '🛡️',
        level: 0, // 0 = zbiórka na lvl 1, 1 = wczesne ostrzeganie (opóźnione), 2 = radar live, 3 = tarcza prewencyjna
        maxLevel: 3,
        levelCosts: [...MARKET_STABILITY_LEVEL_TARGETS],
        contributions: {
            state: 0,
            otherFunds: 0,
            player: 0
        },
        shieldActive: true,
        delayedWarnings: []
    };
}

function ensureMarketStabilityProject() {
    if (!marketStabilityProject || typeof marketStabilityProject !== 'object') {
        marketStabilityProject = createMarketStabilityProject();
    }
    if (!Array.isArray(marketStabilityProject.levelCosts)) {
        marketStabilityProject.levelCosts = [...MARKET_STABILITY_LEVEL_TARGETS];
    }
    if (!marketStabilityProject.contributions || typeof marketStabilityProject.contributions !== 'object') {
        marketStabilityProject.contributions = { state: 0, otherFunds: 0, player: 0 };
    }
    if (typeof marketStabilityProject.shieldActive !== 'boolean') {
        marketStabilityProject.shieldActive = true;
    }
    if (!Array.isArray(marketStabilityProject.delayedWarnings)) {
        marketStabilityProject.delayedWarnings = [];
    }
    return marketStabilityProject;
}

function getMarketStabilityProject() {
    return ensureMarketStabilityProject();
}

function isMarketStabilityProjectUnlocked(lvl) {
    const p = getMarketStabilityProject();
    return p.level >= lvl;
}

function toggleMarketStabilityShield() {
    const p = getMarketStabilityProject();
    if (p.level < 3) return false;
    p.shieldActive = !p.shieldActive;
    if (typeof logEvent === 'function') {
        logEvent(`🛡️ Tarcza Antybańkowa SMSR została ${p.shieldActive ? 'WŁĄCZONA' : 'WYŁĄCZONA'}.`, 'city');
    }
    if (typeof showToast === 'function') {
        showToast(`Tarcza Antybańkowa: ${p.shieldActive ? 'WŁĄCZONA' : 'WYŁĄCZONA'}`, 'info');
    }
    if (typeof renderCitySpecialProjects === 'function') {
        renderCitySpecialProjects();
    }
    return p.shieldActive;
}

function advanceMarketStabilityLevel() {
    const p = getMarketStabilityProject();
    if (p.level >= p.maxLevel) return;
    p.level++;
    const titles = [
        '',
        'Poziom 1: Wczesne Ostrzeganie (z opóźnieniem)',
        'Poziom 2: Radar i Identyfikacja w Czasie Rzeczywistym',
        'Poziom 3: Tarcza Antybańkowa (Prewencja i Stabilizacja Rynku)'
    ];
    if (typeof logEvent === 'function') {
        logEvent(`🏛️🎉 MEGAPROJEKT: Narodowe Centrum Stabilizacji Rynku osiągnęło ${titles[p.level]}!`, 'city');
    }
    if (typeof showToast === 'function') {
        showToast(`🏛️ Awans Megaprojektu SMSR na Poziom ${p.level}!`, 'success');
    }
}

function contributeToMarketStabilityProject(amount) {
    const p = getMarketStabilityProject();
    if (p.level >= p.maxLevel) {
        if (typeof showToast === 'function') showToast('Megaprojekt osiągnął już maksymalny (3) poziom.', 'info');
        return false;
    }
    amount = Math.floor(Number(amount));
    if (!Number.isFinite(amount) || amount <= 0) {
        if (typeof showToast === 'function') showToast('Wprowadź prawidłową kwotę wpłaty.', 'warning');
        return false;
    }
    if (typeof playerCash === 'undefined' || playerCash < amount) {
        if (typeof showToast === 'function') showToast('Brak wystarczającej gotówki w funduszu gracza.', 'error');
        return false;
    }

    const currentTarget = p.levelCosts[p.level];
    const totalCollected = p.contributions.state + p.contributions.otherFunds + p.contributions.player;
    const remaining = Math.max(0, currentTarget - totalCollected);
    const actualContribution = Math.min(amount, remaining);

    if (actualContribution <= 0) {
        if (typeof showToast === 'function') showToast('Bieżący poziom jest już w pełni sfinansowany.', 'info');
        return false;
    }

    playerCash -= actualContribution;
    p.contributions.player += actualContribution;

    if (typeof recordPayment === 'function') {
        recordPayment('player-fund', 'external:smsr', actualContribution, 'Wpłata na Megaprojekt SMSR');
    }
    if (typeof logEvent === 'function') {
        logEvent(`🏛️ Wpłacono ${formatProjectMoney(actualContribution)} z funduszu gracza na Megaprojekt SMSR. Łączny wkład gracza: ${formatProjectMoney(p.contributions.player)}.`, 'city');
    }
    if (typeof showToast === 'function') {
        showToast(`Wpłacono ${formatProjectMoney(actualContribution)} na Megaprojekt SMSR.`, 'success');
    }

    const newTotal = p.contributions.state + p.contributions.otherFunds + p.contributions.player;
    if (newTotal >= currentTarget - 1) {
        advanceMarketStabilityLevel();
    }

    if (typeof renderCitySpecialProjects === 'function') {
        renderCitySpecialProjects();
    }
    return true;
}

function processMarketStabilityProjectQuarterly() {
    const p = getMarketStabilityProject();
    const quarter = typeof macro === 'object' && Number.isFinite(macro.quarter) ? macro.quarter : 0;

    // 1. Zbiórka kwartalna od państwa i innych funduszy
    if (p.level < p.maxLevel) {
        const currentTarget = p.levelCosts[p.level];
        const stateLimit = currentTarget * MARKET_STABILITY_STATE_MAX_SHARE;

        // Państwo dokłada kwartalnie część (1.5M do 3.0M), nie przekraczając 50% limitu danego poziomu
        if (p.contributions.state < stateLimit) {
            const stateRoom = stateLimit - p.contributions.state;
            const stateTranche = Math.min(stateRoom, 1500000 + Math.random() * 1500000);
            p.contributions.state += Math.round(stateTranche);
        }

        // Inne fundusze (zewnętrzne holdingi / AI) wspierają stabilność rynku
        const totalNow = p.contributions.state + p.contributions.otherFunds + p.contributions.player;
        const remainingToTarget = currentTarget - totalNow;
        if (remainingToTarget > 0) {
            // 35% reszty w kwartale zbiegało do celu asymptotycznie (pasek 100%, a poziom nie wskakiwał): resztę poniżej 1000 zł dopłacają od razu
            const otherTranche = remainingToTarget < 1000 ? remainingToTarget : Math.min(remainingToTarget * 0.35, 400000 + Math.random() * 800000);
            p.contributions.otherFunds += Math.ceil(otherTranche);
        }

        const updatedTotal = p.contributions.state + p.contributions.otherFunds + p.contributions.player;
        if (updatedTotal >= currentTarget - 1) {
            advanceMarketStabilityLevel();
        }
    }

    // 2. Obsługa opóźnionych ostrzeżeń dla Poziomu 1
    if (p.delayedWarnings.length > 0) {
        const due = p.delayedWarnings.filter(w => w.targetQuarter <= quarter);
        p.delayedWarnings = p.delayedWarnings.filter(w => w.targetQuarter > quarter);
        for (const warn of due) {
            if (p.level >= 1) {
                if (typeof logEvent === 'function') {
                    logEvent(`⚠️ [SMSR Poziom 1 - Raport Opóźniony]: Agregacja danych z ubiegłego kwartału wskazuje na uformowanie się bańki spekulacyjnej w sektorze ${warn.name}! Wyceny są oderwane od fundamentów.`, 'market');
                }
                if (typeof addMail === 'function') {
                    addMail({
                        sender: 'KNF',
                        subject: `⚠️ [SMSR Lvl 1] Raport opóźniony: Ryzyko bańki w sektorze ${warn.name}`,
                        body: `Narodowe Centrum Stabilizacji Rynku (SMSR) z opóźnieniem analitycznym przekazuje raport: w sektorze ${warn.name} odnotowano napływ kapitału spekulacyjnego. Zgromadzone dane historyczne sugerują wysokie ryzyko przegrzania rynku.`,
                        importance: 2
                    });
                }
            }
        }
    }
}

function getBubbleTypeName(type) {
    if (type === 'rally') return 'Krótki rajd (agresywny)';
    if (type === 'extended') return 'Rozwleczona (mania wieloletnia)';
    return 'Klasyczna';
}

function getBubbleRiskInfo(bubble) {
    if (!bubble || bubble.phase !== 'inflating') {
        if (bubble?.phase === 'popping') return { label: 'PĘKA! (Krach trwa)', badgeCls: 'badge--down' };
        if (bubble?.phase === 'recovering') return { label: 'Stabilizacja (Recovery)', badgeCls: 'badge--info' };
        return { label: 'Brak ryzyka', badgeCls: 'badge--flat' };
    }
    if (bubble.premium < 0.22) return { label: 'Minimalne (<22% bezpieczne)', badgeCls: 'badge--flat' };
    if (bubble.type === 'rally') {
        if (bubble.premium > 0.40 || bubble.quarters >= 3) return { label: 'Krytyczne (~60-80%)', badgeCls: 'badge--down' };
        return { label: 'Wysokie (~35%)', badgeCls: 'badge--warn' };
    }
    if (bubble.type === 'extended') {
        if (bubble.premium > 0.70 || bubble.quarters >= 8) return { label: 'Ekstremalne (~50-70%)', badgeCls: 'badge--down' };
        if (bubble.premium > 0.45) return { label: 'Podwyższone (~25-35%)', badgeCls: 'badge--warn' };
        return { label: 'Umiarkowane (~10-15%)', badgeCls: 'badge--flat' };
    }
    // classic
    if (bubble.premium > 0.40 || bubble.quarters >= 5) return { label: 'Wysokie (~40-60%)', badgeCls: 'badge--down' };
    return { label: 'Średnie (~20-30%)', badgeCls: 'badge--warn' };
}

function renderMarketStabilityProjectCard() {
    ensureMarketStabilityProject();
    const p = marketStabilityProject;
    const currentTarget = p.level < p.maxLevel ? p.levelCosts[p.level] : p.levelCosts[p.maxLevel - 1];
    const totalCollected = p.contributions.state + p.contributions.otherFunds + p.contributions.player;
    const progressPct = p.level >= p.maxLevel ? 100 : Math.min(100, Math.round((totalCollected / currentTarget) * 100));

    const statePct = Math.min(100, (p.contributions.state / currentTarget) * 100);
    const otherPct = Math.min(100, (p.contributions.otherFunds / currentTarget) * 100);
    const playerPct = Math.min(100, (p.contributions.player / currentTarget) * 100);

    const levelDescriptions = [
        { lvl: 1, name: 'Wczesne Ostrzeganie (z opóźnieniem)', desc: 'Raporty analityczne z opóźnieniem 1 kwartału ostrzegające przed uformowaną bańką.' },
        { lvl: 2, name: 'Radar w Czasie Rzeczywistym', desc: 'Precyzyjna identyfikacja sektora bańki, typu, tempa wzrostu premii i ryzyka krachu.' },
        { lvl: 3, name: 'Tarcza Antybańkowa (Prewencja)', desc: 'Aktywne interwencje makroostrożnościowe gaszące bańki w zarodku i stabilizujące rynek.' }
    ];

    const perksHtml = levelDescriptions.map(item => {
        const isUnlocked = p.level >= item.lvl;
        const icon = isUnlocked ? '✅' : '🔒';
        const cls = isUnlocked ? 'text-up' : 'text-muted';
        return `<div class="smsr-perk ${isUnlocked ? 'smsr-perk--active' : ''}" style="padding: 6px 10px; border: 1px solid ${isUnlocked ? 'rgba(16, 185, 129, 0.4)' : '#333'}; border-radius: 4px; background: ${isUnlocked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0,0,0,0.15)'};">
            <strong>${icon} Lvl ${item.lvl}: ${item.name}</strong>
            <p class="text-xs ${cls}" style="margin: 3px 0 0 0;">${item.desc}</p>
        </div>`;
    }).join('');

    const bubble = typeof getActiveSectorBubble === 'function' ? getActiveSectorBubble() : null;
    let liveStatusHtml = '';
    if (p.level >= 2) {
        if (bubble && bubble.phase !== 'none') {
            const riskInfo = getBubbleRiskInfo(bubble);
            liveStatusHtml = `<div class="bank-section" style="background: rgba(255, 75, 75, 0.12); border-left: 3px solid var(--color-down); padding: 8px 12px; margin-top: 10px; border-radius: 4px;">
                <strong style="color: var(--color-down);">🔥 RADAR SMSR (Czas Rzeczywisty):</strong>
                <p class="text-sm" style="margin: 4px 0 0 0;">
                    Sektor: <strong>${escapeHtml(bubble.name)}</strong> | Typ: <strong>${getBubbleTypeName(bubble.type)}</strong> | Premia: <strong>+${(bubble.premium * 100).toFixed(1)}%</strong> | Faza: <strong>${bubble.phase}</strong><br>
                    Ryzyko pęknięcia w nast. kwartale: <span class="badge ${riskInfo.badgeCls}">${riskInfo.label}</span>
                    ${bubble.spilloverSector ? ` · 🌐 Rozlanie na: <strong>${escapeHtml(bubble.spilloverSector.name)}</strong> (+${(bubble.premium * 50).toFixed(1)}%)` : ''}
                </p>
            </div>`;
        } else {
            liveStatusHtml = `<div class="bank-section" style="background: rgba(75, 200, 100, 0.1); border-left: 3px solid var(--color-up); padding: 6px 12px; margin-top: 10px; border-radius: 4px;">
                <span class="text-sm" style="color: var(--color-up);">📡 Radar SMSR: Wszystkie sektory stabilne — brak anomalii spekulacyjnych.</span>
            </div>`;
        }
    } else if (p.level === 1) {
        liveStatusHtml = `<div class="bank-section" style="background: rgba(255, 200, 50, 0.1); border-left: 3px solid #f59e0b; padding: 6px 12px; margin-top: 10px; border-radius: 4px;">
            <span class="text-sm">⚠️ Tryb Lvl 1: Wczesne Ostrzeganie (raporty generowane z opóźnieniem 1 kwartału).</span>
        </div>`;
    }

    const neededFromPlayer = Math.max(0, currentTarget - totalCollected);
    const playerCashVal = typeof playerCash !== 'undefined' ? playerCash : 0;
    const canContribute = p.level < p.maxLevel && neededFromPlayer > 0 && playerCashVal > 0;

    const donationForm = canContribute ? `
        <div class="bank-card-form" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
            <input type="number" id="smsr-player-amount" value="${Math.min(playerCashVal, Math.min(5000000, neededFromPlayer))}" min="10000" step="100000" style="max-width: 160px;" aria-label="Kwota wpłaty na SMSR">
            <button class="btn-primary" onclick="contributeToMarketStabilityProject(document.getElementById('smsr-player-amount').value); renderCitySpecialProjects();">Wpłać na megaprojekt</button>
            <button class="btn-secondary text-xs" onclick="contributeToMarketStabilityProject(1000000); renderCitySpecialProjects();">+1 mln</button>
            <button class="btn-secondary text-xs" onclick="contributeToMarketStabilityProject(5000000); renderCitySpecialProjects();">+5 mln</button>
            <button class="btn-secondary text-xs" onclick="contributeToMarketStabilityProject(25000000); renderCitySpecialProjects();">+25 mln</button>
            <button class="btn-secondary text-xs" onclick="contributeToMarketStabilityProject(${neededFromPlayer}); renderCitySpecialProjects();">Dopłać resztę</button>
        </div>
    ` : (p.level >= p.maxLevel ? `<p class="text-sm text-up" style="margin-top: 8px;">🎉 Megaprojekt w pełni ukończony! Wszystkie funkcje tarczy aktywne.</p>` : `<p class="text-xs text-muted" style="margin-top: 8px;">Oczekiwanie na kwartalne dotacje lub zasilenie konta funduszu.</p>`);

    const shieldToggle = p.level >= 3 ? `
        <div style="margin-top: 10px; padding: 8px 12px; background: var(--bg-surface-elevated, #242428); border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>Tarcza Antybańkowa:</strong>
                <span class="${p.shieldActive ? 'text-up' : 'text-down'}">${p.shieldActive ? 'AKTYWNA (blokuje bańki i krachy)' : 'WYŁĄCZONA (zezwala na bańki)'}</span>
            </div>
            <button class="${p.shieldActive ? 'btn-secondary' : 'btn-primary'}" onclick="toggleMarketStabilityShield();">${p.shieldActive ? 'Wyłącz tarczę' : 'Włącz tarczę'}</button>
        </div>
    ` : '';

    return `<article class="bank-card project-card smsr-card" style="border: 2px solid #3b82f6; background: linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, rgba(0,0,0,0.2) 100%); margin-bottom: 20px;">
        <header class="bank-card-head">
            <span class="bank-card-icon" style="font-size: 2rem;">🛡️</span>
            <div>
                <h3 style="margin: 0; color: #60a5fa;">Narodowe Centrum Stabilizacji Rynku (SMSR)</h3>
                <span class="bank-card-type" style="color: #93c5fd;">Strategiczny megaprojekt państwowo-prywatny · Poziom ${p.level} / ${p.maxLevel}</span>
            </div>
        </header>

        <p class="text-sm" style="margin: 8px 0;">
            Wspólna strategiczna inicjatywa Państwa (KNF/NBP), Funduszu Gracza oraz Innych Funduszy Inwestycyjnych mająca na celu eliminację ryzyka systemowego i przeciwdziałanie bańkom spekulacyjnym.
            Państwo pokrywa <strong>maksymalnie 50%</strong> budżetu każdego etapu.
        </p>

        <div class="smsr-perks-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0;">
            ${perksHtml}
        </div>

        ${liveStatusHtml}
        ${shieldToggle}

        <div style="margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                <span>Budżet etapu: <strong>${formatProjectMoney(totalCollected)}</strong> / ${formatProjectMoney(currentTarget)} (${progressPct}%)</span>
                <span>Brakuje: <strong>${formatProjectMoney(neededFromPlayer)}</strong></span>
            </div>
            <div style="height: 12px; background: #333; border-radius: 6px; overflow: hidden; display: flex;">
                <div style="width: ${statePct}%; background: #3b82f6;" title="Państwo: ${formatProjectMoney(p.contributions.state)}"></div>
                <div style="width: ${otherPct}%; background: #a855f7;" title="Inne fundusze: ${formatProjectMoney(p.contributions.otherFunds)}"></div>
                <div style="width: ${playerPct}%; background: #10b981;" title="Gracz: ${formatProjectMoney(p.contributions.player)}"></div>
            </div>
            <div style="display: flex; gap: 15px; font-size: 0.75rem; margin-top: 4px; color: #aaa;">
                <span>🔵 Państwo: ${formatProjectMoney(p.contributions.state)} (max 50%)</span>
                <span>🟣 Inne fundusze: ${formatProjectMoney(p.contributions.otherFunds)}</span>
                <span>🟢 Twój fundusz: ${formatProjectMoney(p.contributions.player)}</span>
            </div>
        </div>

        ${donationForm}
    </article>`;
}

function renderCitySpecialProjects() {
    const container = document.getElementById('city-content-special');
    if (!container || container.contains(document.activeElement)) return;
    ensureSpecialProjects();
    const quarter = getProjectQuarter();
    const myCompanies = stocks.filter(s => !s.assetType && !s.isBankrupt && getFundStakePct(s) > 0.5);
    const companySelect = id => myCompanies.length
        ? `<select id="${id}" aria-label="Spółka funduszu">${myCompanies.map(s => `<option value="${s.symbol}">${escapeHtml(s.name)} (gotówka ${formatProjectMoney(s.cash)})</option>`).join('')}</select>`
        : '';

    const active = specialProjects.active.map(project => {
        const funding = getProjectFunding(project);
        const join = project.status === 'signup' && myCompanies.length && project.participants.length < MAX_CONSORTIUM_MEMBERS
            ? `<div class="bank-card-form">${companySelect(`join-co-${project.id}`)}
                <input type="text" inputmode="numeric" id="join-amt-${project.id}" value="${Math.round(project.cost * 0.1)}" aria-label="Wkład">
                <button onclick="joinConsortium('${project.id}', document.getElementById('join-co-${project.id}').value, parseFloat(document.getElementById('join-amt-${project.id}').value)); renderCitySpecialProjects();">Dołącz do konsorcjum</button></div>` : '';
        return `<article class="bank-card project-card">
            <header class="bank-card-head"><span class="bank-card-icon">${project.icon}</span><div><h4>${escapeHtml(project.name)}</h4>
                <span class="bank-card-type">${project.timed ? `czasowy · termin za ${Math.max(0, project.deadline - quarter)} kw.` : 'megaprojekt'} · ${project.status === 'signup' ? 'zapisy do konsorcjum' : 'w budowie'}</span></div></header>
            ${project.status === 'building' ? renderProjectStages(project) : ''}
            <p class="text-sm">Koszt ${formatProjectMoney(project.cost)} · zebrano ${formatProjectMoney(funding)} · wykonawca: ${escapeHtml(project.builder?.name || '—')}${project.builder ? ` (specjalność: ${escapeHtml((getBuilderSpecialties(stocks.find(s => s.symbol === project.builder.symbol) || {}) || []).join(', ') || '—')})` : ''}</p>
            <p class="text-xs text-muted">Konsorcjum (${project.participants.length}/${MAX_CONSORTIUM_MEMBERS}; każdy uczestnik ≤ ${Math.round(MAX_MEMBER_SHARE * 100)}% kosztu): ${project.participants.map(p => `${p.player ? '⭐ ' : ''}${escapeHtml(p.name)} ${Math.round(p.amount / Math.max(1, project.cost) * 100)}%`).join(', ') || '—'}</p>
            ${join}
            ${renderProjectBondForm(project)}
        </article>`;
    }).join('');

    const offers = specialProjects.timedOffers.map(offer => {
        const t = TIMED_PROJECT_TEMPLATES.find(x => x.id === offer.templateId);
        return `<article class="bank-card project-card"><header class="bank-card-head"><span class="bank-card-icon">${t.icon}</span><div><h4>${escapeHtml(t.name)}</h4>
            <span class="bank-card-type">czasowy · zgłoszenia jeszcze ${Math.max(0, offer.deadline - quarter)} kw. · bonus do ${offer.bonusQuarters} kw.</span></div></header>
            <p class="text-sm">Koszt ${formatProjectMoney(t.cost)} · budowa ${t.quarters} kw. · bonus: przychody +${(t.bonus.growth * 100).toFixed(1)} pkt proc./kw., wycena +${(t.bonus.valuation * 100).toFixed(1)}%</p>
            ${myCompanies.length ? `<div class="bank-card-form">${companySelect(`timed-co-${t.id}`)}<input type="text" inputmode="numeric" id="timed-amt-${t.id}" value="${Math.round(t.cost * 0.3)}" aria-label="Wkład">
            <button onclick="launchTimedProject('${t.id}', document.getElementById('timed-co-${t.id}').value, parseFloat(document.getElementById('timed-amt-${t.id}').value)); renderCitySpecialProjects();">Zgłoś konsorcjum</button></div>` : ''}
        </article>`;
    }).join('');

    const available = MEGA_PROJECTS.filter(p => !isMegaProjectTaken(p.id)).map(p => `<li>${p.icon} <strong>${escapeHtml(p.name)}</strong> — ${formatProjectMoney(p.cost)}, ${p.quarters} kw.; sektory: ${p.sectors.join(', ')}; bonus: przychody +${(p.bonus.growth * 100).toFixed(1)} pkt proc./kw., wycena +${(p.bonus.valuation * 100).toFixed(0)}%</li>`).join('');

    const completed = specialProjects.completed.map(project => `<li>${project.icon} <strong>${escapeHtml(project.name)}</strong>${project.timed ? ' (czasowy)' : ''} — ${project.participants.map(p => `${escapeHtml(p.name)}${p.heldBy ? ` → ${escapeHtml(p.heldBy)}` : ''} ${p.share ? `(${(p.share * 100).toFixed(0)}%)` : ''}`).join(', ')}${project.builder ? `; wykonawca ${escapeHtml(project.builder.name)}` : ''}</li>`).join('');

    container.innerHTML = `
        ${renderMarketStabilityProjectCard()}
        <p class="bank-lead">Megaprojekty (${MEGA_PROJECTS.length}) można zrealizować tylko raz. Konsorcjum: do ${MAX_CONSORTIUM_MEMBERS} spółek + wykonawca budowlany; bonusy (wzrost przychodów, wycena, kondycja) dzielą się wg wkładu i przechodzą na spółkę przejmującą. Projekty czasowe są tańsze, bonus działa do ${MAX_TIMED_BONUS_QUARTERS / 4} lat gry. Spółka Twojego funduszu (> 50%) może dołączyć w fazie zapisów.</p>
        <h4>W realizacji</h4><div class="bank-grid">${active || '<p class="text-muted">Brak projektów w realizacji.</p>'}</div>
        <h4>Projekty czasowe</h4><div class="bank-grid">${offers || '<p class="text-muted">Brak ogłoszonych projektów czasowych.</p>'}</div>
        <h4>Dostępne megaprojekty</h4><ul class="list-plain text-sm project-list">${available || '<li class="text-muted">Wszystkie megaprojekty zostały podjęte.</li>'}</ul>
        <h4>Zrealizowane</h4><ul class="list-plain text-sm project-list">${completed || '<li class="text-muted">Jeszcze nic.</li>'}</ul>`;
}

// #################################################################################
// ## oversight.js
// #################################################################################

// oversight.js — Nadzór i korupcja (wersja 0.11.1 „Ciemna Strefa”)
//
// Wskaźnik korupcji 0–100 (wspólny): rośnie od korupcyjnych czynów gracza, botów i prezesów, spada dzięki
// skutecznej policji i KNF. Wysoka korupcja zwiększa zmienność rynku i częstotliwość afer, a osłabia instytucje.
// Szara strefa: usługi korupcyjne opłacane z funduszu (decyzja projektu). Każdy czyn podnosi podejrzenia;
// policja i KNF co kwartał prowadzą śledztwa. Drabina kar: mandat → wyższy mandat → rekwizycja i blokada
// handlu → ostatnie ostrzeżenie → wyrok (porażka). Wykrycie gracza: zaufanie klientów, wpis compliance w CV
// (ocena zarządu), mandat z funduszu. Rosnąca uwaga: duży fundusz = częstsze kontrole KNF.

const CORRUPTION_BASE = 10;
const INSTITUTION_LEVEL_COSTS = [1e6, 3e6, 8e6, 20e6, 50e6];
const STATE_INSTITUTION_FUNDING = 0.002;       // co kwartał część Skarbu Państwa na policję i KNF
const BRIBE_CORRUPTION_THRESHOLD = 40;
const BRIBE_IMMUNITY_QUARTERS = 2;
const CONVICTION_STRIKES = 5;
const STRIKE_FINES = [0.02, 0.05, 0.08, 0.10];  // % aktywów funduszu

const GREY_SERVICES = {
    leak:      { label: 'Przeciek z Banku Centralnego', icon: '📨', risk: 15, corruption: 3, desc: 'Urzędnik zdradza planowaną decyzję o stopach przed posiedzeniem (zwykle trafnie).' },
    debt:      { label: 'Umorzenie długu za łapówkę', icon: '🧾', risk: 25, corruption: 6, desc: 'Urzędnik „gubi” do 15% zobowiązań spółki funduszu (najwyżej 5% aktywów funduszu). Powtórka w ciągu roku — podwójne ryzyko.' },
    underTable:{ label: 'Pakiet „pod stołem”', icon: '🤝', risk: 20, corruption: 4, desc: 'Raz na kwartał: pakiet dla bota poza rynkiem z premią 10% (4% przy dużym pakiecie). Im większy pakiet, tym większe ryzyko.' },
    tender:    { label: 'Ustawiony przetarg', icon: '🏗️', risk: 25, corruption: 5, desc: 'Spółka budowlana funduszu dostaje zawyżony kontrakt miejski.' }
};

let oversight = createOversight();

function createOversight() {
    return {
        corruption: CORRUPTION_BASE,
        pendingCorruption: 0,
        police: { level: 0, budget: 0 },
        knf: { level: 0, budget: 0 },
        records: {},          // id → { strikes, suspicion, immuneUntil, blockedUntil, illegalGains }
        history: [],          // ostatnie wykrycia (do panelu)
        hidden: { balance: 0 }, // 0.16.6 S1: rachunek w Waschmabanku (countries.js)
        convicted: false
    };
}

function ensureOversight() {
    const fresh = createOversight();
    oversight = { ...fresh, ...(oversight || {}) };
    oversight.police = { ...fresh.police, ...(oversight.police || {}) };
    oversight.knf = { ...fresh.knf, ...(oversight.knf || {}) };
    if (!Array.isArray(oversight.history)) oversight.history = [];
    oversight.hidden = { ...fresh.hidden, ...(oversight.hidden || {}) };
    return oversight;
}

function getRecord(id) {
    if (!oversight.records[id]) oversight.records[id] = { strikes: 0, suspicion: 0, immuneUntil: -1, blockedUntil: -1, illegalGains: 0 };
    return oversight.records[id];
}

function getOversightQuarter() {
    return typeof macro === 'object' ? macro.quarter : 0;
}

// =================================================================================
// INSTYTUCJE
// =================================================================================

/** Skuteczność 0,05–0,95: poziom, budżet i korupcja (skorumpowana policja działa gorzej). */
function getInstitutionEffectiveness(institution) {
    const base = 0.3 + institution.level * 0.1 + Math.min(0.1, institution.budget / 2e7);
    return clampValue(base - oversight.corruption / 200, 0.05, 0.95);
}

function fundInstitution(institution, amount) {
    institution.budget += amount;
    while (institution.level < INSTITUTION_LEVEL_COSTS.length && institution.budget >= INSTITUTION_LEVEL_COSTS[institution.level]) {
        institution.budget -= INSTITUTION_LEVEL_COSTS[institution.level];
        institution.level++;
        if (typeof checkPoliceChiefSpawn === 'function') checkPoliceChiefSpawn();
        return true;
    }
    return false;
}

/** Dotacja gracza z konta prywatnego (nie zmniejsza podejrzeń — to nie jest „odpust”). */
function donateToInstitution(kind, amount) {
    const institution = oversight[kind];
    amount = Math.floor(Number(amount));
    if (!institution || !(amount >= 100)) { showToast(`Dotacja: minimum ${formatZl(100, 0)}.`, 'warning'); return false; }
    if (playerWallet.cash < amount) { showToast('Za mało pieniędzy w portfelu prywatnym.', 'error'); return false; }
    playerWallet.cash -= amount;
    oversight.decentScore = (Number(oversight.decentScore) || 0) + amount;
    recordPayment('player-wallet', 'external:skarb-panstwa', amount, `Dotacja: ${kind === 'police' ? 'Policja' : 'KNF'}`);
    const upgraded = fundInstitution(institution, amount);
    showToast(upgraded ? `${kind === 'police' ? 'Policja' : 'KNF'} awansuje na poziom ${institution.level}!` : 'Dziękujemy za wsparcie.', 'success');
    return true;
}

/** B3: reputacja „przyzwoitego funduszu” z dotacji (wygasa ok. 10% na kwartał). */
function getDecentFundThreshold() {
    return Math.max(5000, (typeof getFundAssets === 'function' ? getFundAssets() : 0) * 0.005);
}

function isDecentFund() {
    return (Number(oversight?.decentScore) || 0) >= getDecentFundThreshold();
}

/** Łapówka dla policji (od korupcji 40): spokój od śledztw, ale korupcja rośnie i bywa ujawniona. */
function bribePolice() {
    if (oversight.corruption < BRIBE_CORRUPTION_THRESHOLD) { showToast('Przy tak niskiej korupcji nikt nie weźmie łapówki.', 'warning'); return false; }
    const cost = Math.round(Math.max(2000, getFundAssets() * 0.01));
    if (playerCash < cost) { showToast(`Łapówka kosztuje ${formatZl(cost, 0)} z funduszu.`, 'error'); return false; }
    playerCash -= cost;
    recordPayment('player-fund', 'external:szara-strefa', cost, 'Wydatek nieopisany');
    const record = getRecord('player');
    record.immuneUntil = getOversightQuarter() + BRIBE_IMMUNITY_QUARTERS;
    record.suspicion += 10; // ślad w księgach zostaje
    oversight.pendingCorruption += 5;
    logEvent(`🤫 „Rozmowa” z komendantem — policja przez ${BRIBE_IMMUNITY_QUARTERS} kw. nie interesuje się funduszem.`, 'review');
    if (typeof displayCash === 'function') displayCash();
    return true;
}

// =================================================================================
// SZARA STREFA (usługi korupcyjne z funduszu)
// =================================================================================

function getGreyServiceCost(id) {
    const assets = typeof getFundAssets === 'function' ? getFundAssets() : 0;
    return Math.round(Math.max(1000, assets * ({ leak: 0.003, debt: 0.004, underTable: 0.002, tender: 0.004 }[id] || 0.003)));
}

/** Wspólna część każdej usługi: opłata z funduszu, podejrzenia, korupcja. */
function commitCorruptAct(serviceId, extraCost = 0, riskMultiplier = 1, extraRisk = 0) {
    const service = GREY_SERVICES[serviceId];
    const cost = getGreyServiceCost(serviceId) + extraCost;
    if (playerCash < cost) { showToast(`Za mało gotówki funduszu (${formatZl(cost, 0)}).`, 'error'); return false; }
    playerCash -= cost;
    recordPayment('player-fund', 'external:szara-strefa', cost, 'Usługa doradcza');
    getRecord('player').suspicion += service.risk * riskMultiplier + extraRisk;
    oversight.pendingCorruption += service.corruption;
    return true;
}

function greyLeak() {
    if (!commitCorruptAct('leak')) return false;
    const planned = getPlannedRateChange(getTaylorRate());
    const reliable = Math.random() < 0.85;
    const told = reliable ? planned : roundRateStep(clampValue(planned + (Math.random() < 0.5 ? 0.0025 : -0.0025), -BC_MAX_STEP, BC_MAX_STEP));
    addMail({ sender: CORPORATION_SENDER, subject: '📨 Prywatna wiadomość (nie odpowiadaj)', body: `„Na najbliższym posiedzeniu: ${describeRateChange(told)}. Rynek oczekuje: ${macro.expectation?.label || '—'}. Ta wiadomość nie istnieje.”`, importance: 3 });
    showToast('Przeciek w poczcie.', 'default');
    return true;
}

function greyDebtWriteOff(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || getFundStakePct(stock) <= 0.5) { showToast('Tylko spółka, w której fundusz ma większość.', 'warning'); return false; }
    // B1: najwyżej 15% zobowiązań i 5% aktywów funduszu; łapówka 10%; powtórka w ciągu roku = podwójne ryzyko.
    const writeOff = Math.round(Math.min(Math.max(0, stock.balanceSheet?.liabilities || 0) * 0.15, getFundAssets() * 0.05));
    if (writeOff <= 0) { showToast('Spółka nie ma zobowiązań.', 'default'); return false; }
    const repeat = Number.isFinite(stock.debtWriteOffQuarter) && getOversightQuarter() - stock.debtWriteOffQuarter < 4;
    if (!commitCorruptAct('debt', Math.round(writeOff * 0.1), repeat ? 2 : 1)) return false;
    stock.debtWriteOffQuarter = getOversightQuarter();
    adjustBalanceSheet(stock, { liabilities: -writeOff, retainedEarnings: writeOff });
    getRecord('player').illegalGains += writeOff * getFundStakePct(stock);
    logEvent(`🧾 ${stock.name}: część zobowiązań (${formatZl(writeOff, 0)}) „zaginęła” w urzędzie.`, 'company');
    return true;
}

function greyUnderTable(symbol, quantity) {
    const stock = stocks.find(s => s.symbol === symbol);
    const holding = playerPortfolio[symbol];
    quantity = Math.floor(Number(quantity));
    if (!stock || !holding || !(quantity > 0) || holding.shares - (holding.lockedShares || 0) < quantity) { showToast('Za mało akcji do sprzedaży.', 'warning'); return false; }
    // B1: raz na kwartał; premia 10% (4% przy pakiecie ≥ 10% aktywów); ryzyko rośnie z wielkością pakietu.
    const record = getRecord('player');
    if (record.lastUnderTable === getOversightQuarter()) { showToast('Jeden taki „interes” na kwartał — kupcy się płoszą.', 'warning'); return false; }
    const share = quantity * stock.price / Math.max(1, getFundAssets());
    const premium = share >= 0.1 ? 0.04 : 0.1;
    const price = stock.price * (1 + premium);
    const value = quantity * price;
    const buyer = aiCompetitors.filter(ai => ai.personality !== 'market_maker' && !ai.isMafia && !ai.isGuard && ai.cash >= value).sort((a, b) => b.cash - a.cash)[0];
    if (!buyer) { showToast('Nikt nie ma tyle gotówki na taki pakiet.', 'warning'); return false; }
    if (!commitCorruptAct('underTable', 0, 1, Math.floor(share * 100))) return false;
    record.lastUnderTable = getOversightQuarter();
    buyer.cash -= value;
    const target = buyer.portfolio[symbol] || (buyer.portfolio[symbol] = { shares: 0, avgPrice: 0 });
    target.avgPrice = (target.avgPrice * target.shares + value) / (target.shares + quantity);
    target.shares += quantity;
    holding.shares -= quantity; // sharesHeld bez zmian — akcje zmieniają właściciela
    if (holding.shares <= 0) delete playerPortfolio[symbol];
    playerCash += value;
    getRecord('player').illegalGains += quantity * stock.price * premium;
    logEvent(`🤝 Fundusz przekazuje ${quantity.toLocaleString('pl-PL')} akcji ${stock.name} „poza rynkiem” (kupujący: ${buyer.name}).`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

function greyTender(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || getFundStakePct(stock) <= 0.5 || !stock.sector?.includes('Budowlany')) { showToast('Tylko spółka budowlana, w której fundusz ma większość.', 'warning'); return false; }
    const contract = Math.round(Math.min(city.budget * 0.05, getMarketCapValue(stock) * 0.03));
    if (contract <= 0) { showToast('Miasto nie ma budżetu na kontrakty.', 'warning'); return false; }
    if (!commitCorruptAct('tender')) return false;
    city.budget -= contract;
    adjustCompanyCash(stock, contract);
    adjustBalanceSheet(stock, { assets: contract, retainedEarnings: contract });
    getRecord('player').illegalGains += contract * getFundStakePct(stock);
    logEvent(`🏗️ ${stock.name} wygrywa miejski przetarg za ${formatZl(contract, 0)} — konkurenci mówią o „ustawce”.`, 'city');
    return true;
}

// =================================================================================
// ŚLEDZTWA I KARY
// =================================================================================

function getKnfAttention() {
    const assets = typeof getFundAssets === 'function' ? getFundAssets() - (typeof getHiddenBalance === 'function' ? getHiddenBalance() : 0) : 0;
    return clampValue(Math.log10(Math.max(1, assets)) / 7, 0.1, 1); // 10 mln PLN → pełna uwaga
}

function isTradingBlocked(id = 'player') {
    return (oversight.records[id]?.blockedUntil ?? -1) >= getOversightQuarter();
}

/** Wykrycie: drabina kar. Zwraca numer przewinienia. */
function punishEntity(id, institutionName) {
    const record = getRecord(id);
    record.strikes++;
    record.suspicion = Math.round(record.suspicion * 0.3);
    const quarter = getOversightQuarter();
    const ai = id === 'player' ? null : aiCompetitors.find(a => a.id === id);
    const name = ai ? ai.name : 'Twój fundusz';
    const assets = ai ? ai.cash : getFundAssets() - (typeof getHiddenBalance === 'function' ? getHiddenBalance() : 0); // KNF nie widzi rachunku w Waschmabanku
    const fine = Math.round(Math.max(500, assets * STRIKE_FINES[Math.min(record.strikes, STRIKE_FINES.length) - 1]) * (!ai && isDecentFund() ? 0.75 : 1));
    let seized = 0;

    if (ai) {
        const paid = Math.min(Math.max(0, ai.cash), fine);
        ai.cash -= paid;
        governmentTreasury += paid;
    } else {
        const paid = Math.min(Math.max(0, playerCash), fine);
        playerCash -= paid;
        governmentTreasury += paid;
        recordPayment('player-fund', 'external:skarb-panstwa', paid, `Kara: ${institutionName}`);
        if (record.strikes >= 3) {
            if (typeof seizeMafiaAssets === 'function') seizeMafiaAssets(); // akcje zdobyte przez mafię → aukcja policyjna
            seized = Math.min(Math.max(0, playerCash), record.illegalGains);
            playerCash -= seized;
            governmentTreasury += seized;
            record.illegalGains = 0;
            record.blockedUntil = quarter + 1;
        }
        playerFund.trust = Math.max(0, playerFund.trust - 8 - record.strikes * 2);
        playerProfile?.cv.push({ type: 'compliance', text: `${institutionName}: przewinienie nr ${record.strikes}, kara ${formatZl(paid, 0)}${seized ? `, rekwizycja ${formatZl(seized, 0)}` : ''}.` });
        const warning = record.strikes === CONVICTION_STRIKES - 1 ? ' OSTATNIE OSTRZEŻENIE: kolejne wykrycie oznacza wyrok.' : '';
        addMail({ sender: CORPORATION_SENDER, subject: `🚨 ${institutionName}: wykryto nieprawidłowości w funduszu`, body: `Przewinienie nr ${record.strikes}. Kara ${formatZl(paid, 0)} z funduszu${seized ? `, rekwizycja nielegalnych zysków ${formatZl(seized, 0)} i blokada handlu do końca przyszłego kwartału` : ''}. Zarząd korporacji i klienci zostali poinformowani.${warning}`, importance: 3 });
        showToast(`${institutionName}: wykrycie nr ${record.strikes}!${warning}`, 'error', 8000);
        if (record.strikes >= CONVICTION_STRIKES) convictPlayer();
    }
    oversight.history.unshift({ quarter, name, institution: institutionName, strike: record.strikes, fine });
    oversight.history.length = Math.min(oversight.history.length, 12);
    logEvent(`⚖️ ${institutionName}: ${name} ukarany (przewinienie nr ${record.strikes}, kara ${formatZl(fine, 0)}).`, 'state');
    return record.strikes;
}

function convictPlayer() {
    oversight.convicted = true;
    if (typeof isGamePaused !== 'undefined' && !isGamePaused && typeof togglePauseGame === 'function') togglePauseGame();
    const overlay = document.getElementById('defeat-overlay');
    if (overlay) overlay.hidden = false;
    logEvent('⛓️ WYROK: zostałeś skazany za udział w zorganizowanej grupie przestępczej.', 'error');
}

/** Co kwartał: finansowanie instytucji, śledztwa, czyny botów i prezesów, dynamika korupcji. */
function processOversightQuarterly() {
    ensureOversight();
    const quarter = getOversightQuarter();
    // Państwo finansuje instytucje (więcej przy rządzie „państwowym”).
    const share = STATE_INSTITUTION_FUNDING * (typeof getRulingParty === 'function' && (macro.election?.ruling === 'state' || macro.election?.coalition?.partner === 'state') ? 1.3 : 1);
    for (const institution of [oversight.police, oversight.knf]) {
        const amount = Math.max(0, governmentTreasury) * share / 2;
        governmentTreasury -= amount;
        fundInstitution(institution, amount);
    }

    // Boty-ryzykanci i skorumpowani prezesi.
    for (const ai of aiCompetitors) {
        if (!['reckless', 'yolo_trader', 'whale'].includes(ai.personality) || Math.random() > 0.15) continue;
        getRecord(ai.id).suspicion += 20;
        oversight.pendingCorruption += 2;
    }
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt) continue;
        if (hasCeoTrait(stock, 'skorumpowany')) oversight.pendingCorruption += 0.5;
        if (hasCeoTrait(stock, 'sklonny_do_korupcji') && Math.random() < 0.1) oversight.pendingCorruption += 0.5;
    }

    // Śledztwa: policja i KNF.
    const police = getInstitutionEffectiveness(oversight.police);
    const knf = getInstitutionEffectiveness(oversight.knf);
    for (const [id, record] of Object.entries(oversight.records)) {
        if (id === 'player' && oversight.convicted) continue;
        const knfFactor = id === 'player' ? getKnfAttention() : 0.5;
        const pPolice = record.immuneUntil >= quarter ? 0 : police * record.suspicion / 150;
        const favor = id === 'player' && typeof getPoliticalFavor === 'function' ? getPoliticalFavor() : 0;
        const pKnf = knf * knfFactor * record.suspicion / 200 * (1 - 0.3 * favor);
        if (record.suspicion > 0 && Math.random() < Math.min(0.85, pPolice)) punishEntity(id, 'Policja');
        else if (record.suspicion > 0 && Math.random() < Math.min(0.85, pKnf)) punishEntity(id, 'KNF');
        record.suspicion = Math.max(0, record.suspicion * 0.85);
    }
    // Rutynowa kontrola KNF dużego funduszu: czysta = zaufanie klientów rośnie.
    const decent = isDecentFund();
    if (playerFund && Math.random() < (decent ? 0.2 : 0.1) * getKnfAttention() && (getRecord('player').suspicion < (decent ? 15 : 5))) {
        playerFund.trust = Math.min(100, playerFund.trust + 2);
        logEvent('✅ Rutynowa kontrola KNF w Twoim funduszu: bez zastrzeżeń. Klienci to doceniają.', 'review');
    }

    // Korupcja: nowe czyny, walka instytucji, powrót do poziomu bazowego.
    oversight.corruption = clampValue(oversight.corruption + oversight.pendingCorruption - (police + knf) * 3 + (CORRUPTION_BASE - oversight.corruption) * 0.1, 0, 100); // testy ogólne: bez gracza ~15–25
    oversight.pendingCorruption = 0;
    oversight.decentScore = (Number(oversight.decentScore) || 0) * 0.9;
}

function hasCeoTrait(stock, id) {
    return Boolean(stock?.ceo?.traits?.some(t => t.id === id));
}

/** Afera korupcyjna w cyklu zdarzeń (częściej przy wysokiej korupcji i skorumpowanych prezesach). */
function triggerCorruptionScandal() {
    const pool = stocks.filter(s => !s.assetType && !s.isBankrupt && !['niezalezny', 'general', 'byly_wojskowy'].some(id => hasCeoTrait(s, id)));
    if (!pool.length) return null;
    const weighted = pool.filter(s => hasCeoTrait(s, 'skorumpowany') || hasCeoTrait(s, 'sklonny_do_korupcji'));
    const stock = getRandomElement(weighted.length && Math.random() < 0.7 ? weighted : pool);
    applyPriceEffect(stock.symbol, -getRandomInRange(0.04, 0.08), 'negative', 'company');
    stock.financialHealth = Math.max(-5, (Number(stock.financialHealth) || 0) - 0.3);
    logEvent(`🕵️ Afera korupcyjna w ${stock.name}: prokuratura bada kontrakty spółki.`, 'company');
    return stock;
}

/** Mnożnik zmienności rynku od korupcji (najwyżej +40%). */
function getCorruptionVolatilityFactor() {
    return 1 + Math.min(0.4, (oversight?.corruption || 0) / 250);
}

// =================================================================================
// WIDOKI
// =================================================================================

function getSuspicionLabel(value) {
    if (value < 10) return { label: 'czysto', cls: 'text-up' };
    if (value < 30) return { label: 'niskie', cls: 'text-info' };
    if (value < 60) return { label: 'średnie', cls: 'text-warn' };
    return { label: 'wysokie', cls: 'text-down' };
}

function renderOversightPanel() {
    ensureOversight();
    const record = getRecord('player');
    const suspicion = getSuspicionLabel(record.suspicion);
    const card = (kind, name, icon, text) => {
        const institution = oversight[kind];
        const next = INSTITUTION_LEVEL_COSTS[institution.level];
        return `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${icon}</span><div><h4>${name}</h4><span class="bank-card-type">poziom ${institution.level}/5 · skuteczność ${(getInstitutionEffectiveness(institution) * 100).toFixed(0)}%</span></div></header>
            <p class="text-sm">${text}</p>
            <div class="inv-stages"><div class="inv-stage" style="flex:1"><span class="inv-stage-fill" style="width:${next ? Math.min(100, institution.budget / next * 100).toFixed(0) : 100}%"></span><span class="inv-stage-label">${next ? `do poziomu ${institution.level + 1}: ${formatZl(institution.budget, 0)} / ${formatZl(next, 0)}` : 'poziom maksymalny'}</span></div></div>
            <div class="bank-card-form"><input type="text" inputmode="numeric" id="donate-${kind}" value="500" aria-label="Kwota dotacji">
            <button class="btn-secondary" onclick="donateToInstitution('${kind}', parseFloat(document.getElementById('donate-${kind}').value)); updateStateModalContent();">Dotacja (portfel prywatny)</button></div></article>`;
    };
    return `
        <div class="bank-ticker">
            <div class="bank-ticker-item"><span>Korupcja</span><strong class="${oversight.corruption >= 50 ? 'text-down' : oversight.corruption >= 30 ? 'text-warn' : ''}">${oversight.corruption.toFixed(0)}/100</strong></div>
            <div class="bank-ticker-item"><span>Uwaga KNF wobec funduszu</span><strong>${(getKnfAttention() * 100).toFixed(0)}%</strong></div>
            <div class="bank-ticker-item"><span>Podejrzenia wobec funduszu</span><strong class="${suspicion.cls}">${suspicion.label}</strong></div>
            <div class="bank-ticker-item"><span>Przewinienia</span><strong>${record.strikes}/${CONVICTION_STRIKES}</strong></div>
            <div class="bank-ticker-item" title="Dotacje dla policji i KNF: kary niższe o 25%, kontrole KNF częściej kończą się czysto. Nie zmniejszają podejrzeń."><span>Przyzwoity fundusz</span><strong class="${isDecentFund() ? 'text-up' : ''}">${isDecentFund() ? '✅ tak' : `${formatZl(oversight.decentScore || 0, 0)} / ${formatZl(getDecentFundThreshold(), 0)}`}</strong></div>
            <div class="bank-ticker-item"><span>Wpływy mafii</span><strong>${typeof getMafiaStage === 'function' ? `${getMafiaStage().icon} ${getMafiaStage().name}` : '—'}</strong></div>
        </div>
        <div class="oversight-gauge"><span style="width:${oversight.corruption}%"></span></div>
        <div class="bank-grid mt-3">
            ${card('police', 'Policja', '🚓', 'Ściga korupcję i mafię: co kwartał zbija wpływy mafii, zatrzymuje jej ludzi w zarządach spółek, rekwiruje akcje zdobyte z pomocą „przyjaciół” i ściga fundusze, które z nimi współpracują. Przy wysokiej korupcji sama staje się skorumpowana i działa gorzej.' + (oversight.police.level >= 5 ? ' 🌟 <strong>Program dla policjantów (poz. 5)</strong>: funkcjonariusze kupują JU funduszy defensywnych z dopłatą 20%, zwiększają obrót mniejszościowy, a na rynku inwestuje Komendant Jakub.' : ''))}
            ${card('knf', 'Komisja Nadzoru Finansowego', '🏦', 'Kontroluje fundusze — im większy fundusz, tym częściej. Czysta kontrola podnosi zaufanie klientów.')}
            ${renderMafiaStateCard()}
        </div>
        ${oversight.corruption >= BRIBE_CORRUPTION_THRESHOLD ? `<p class="text-sm mt-3">💼 Przy tej korupcji komendant „bywa wyrozumiały”: <button class="btn-danger" onclick="bribePolice(); updateStateModalContent();">Łapówka (${formatZl(Math.max(2000, getFundAssets() * 0.01), 0)} z funduszu)</button> — spokój na ${BRIBE_IMMUNITY_QUARTERS} kw.</p>` : ''}
        <h4>Wojny PR</h4>
        ${typeof renderPrWars === 'function' ? renderPrWars() : ''}
        <h4>Ostatnie wykrycia</h4>
        <ul class="list-plain text-sm">${oversight.history.map(h => `<li>⚖️ ${escapeHtml(h.institution)}: ${escapeHtml(h.name)} — przewinienie nr ${h.strike}, kara ${formatZl(h.fine, 0)}</li>`).join('') || '<li class="text-muted">Brak.</li>'}</ul>`;
}

/** 0.13.1 (B13): mafia widoczna w zakładce Nadzór (szczegóły i usługi w „Szarej strefie”). */
function renderMafiaStateCard() {
    if (typeof mafia !== 'object' || typeof getMafiaStage !== 'function') return '';
    const stage = getMafiaStage();
    const infiltrated = stocks.filter(s => s.mafiaBoard && !s.isBankrupt).length;
    return `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">🕶️</span><div><h4>Mafia</h4><span class="bank-card-type">${stage.icon} ${escapeHtml(stage.name)} · wpływy ${Math.round(mafia.influence || 0)}/${MAFIA_MAX_INFLUENCE}</span></div></header>
        <p class="text-sm">Działa w tle od początku gry: przy wyższych wpływach przejmuje spółki-przykrywki i wprowadza ludzi do zarządów (${infiltrated} ${infiltrated === 1 ? 'spółka' : 'spółek'} z ich człowiekiem). Gracza dotyka dopiero po kontakcie z „przyjaciółmi” w Szarej strefie.</p>
        <button class="btn-secondary" onclick="openGreyZone()">🕶️ Szara strefa</button></article>`;
}

function openGreyZone() {
    const modal = document.getElementById('grey-zone-modal');
    if (!modal) return;
    renderGreyZone();
    modal.style.display = 'block';
}

function renderGreyZone() {
    const body = document.getElementById('grey-zone-body');
    if (!body) return;
    const record = getRecord('player');
    const suspicion = getSuspicionLabel(record.suspicion);
    const myCompanies = stocks.filter(s => !s.assetType && !s.isBankrupt && getFundStakePct(s) > 0.5);
    const myBuilders = myCompanies.filter(s => s.sector?.includes('Budowlany'));
    const holdings = Object.entries(playerPortfolio).filter(([, h]) => h.assetType === 'stock' && h.shares > 0);
    const select = (id, list, label) => list.length ? `<select id="${id}" aria-label="${label}">${list.map(([value, text]) => `<option value="${value}">${escapeHtml(text)}</option>`).join('')}</select>` : '<span class="text-xs text-muted">brak spółek</span>';
    const service = (id, form, action) => {
        const s = GREY_SERVICES[id];
        const icon = typeof uiIcon === 'function' ? uiIcon(id === 'leak' ? 'news' : id === 'debt' ? 'raport' : id === 'underTable' ? 'teczka' : 'budownictwo', 16) : s.icon;
        return `<article class="grey-card"><h4>${icon} ${escapeHtml(s.label)}</h4><p class="text-sm text-muted">${escapeHtml(s.desc)}</p>
            <p class="text-xs">Koszt od ${formatZl(getGreyServiceCost(id), 0)} z funduszu · ryzyko: ${s.risk >= 25 ? 'wysokie' : 'średnie'}</p>
            <div class="bank-card-form">${form}<button class="btn-secondary" onclick="${action}; renderGreyZone(); if (typeof displayCash === 'function') displayCash();">Zleć</button></div></article>`;
    };
    body.innerHTML = `
        <p class="bank-lead">Usługi „ze szarej strefy” płaci fundusz. Każda zwiększa korupcję i podejrzenia wobec funduszu. Wykrycie: kara z funduszu, spadek zaufania klientów, wpis compliance w CV (ocena zarządu), a przy powtórkach rekwizycja i blokada handlu. ${CONVICTION_STRIKES}. wykrycie = wyrok.</p>
        <div class="bank-ticker"><div class="bank-ticker-item"><span>Podejrzenia</span><strong class="${suspicion.cls}">${suspicion.label}</strong></div>
            <div class="bank-ticker-item"><span>Przewinienia</span><strong>${record.strikes}/${CONVICTION_STRIKES}</strong></div>
            <div class="bank-ticker-item"><span>Korupcja w kraju</span><strong>${oversight.corruption.toFixed(0)}/100</strong></div></div>
        <div class="grey-grid">
            ${service('leak', '', 'greyLeak()')}
            ${service('debt', select('grey-debt', myCompanies.map(s => [s.symbol, `${s.name} (dług ${formatZl(s.balanceSheet?.liabilities || 0, 0)})`]), 'Spółka'), "greyDebtWriteOff(document.getElementById('grey-debt')?.value)")}
            ${service('underTable', select('grey-under', holdings.map(([symbol, h]) => [symbol, `${symbol} (${h.shares.toLocaleString('pl-PL')} akcji)`]), 'Pakiet') + '<input type="text" inputmode="numeric" id="grey-under-qty" value="100" aria-label="Liczba akcji">', "greyUnderTable(document.getElementById('grey-under')?.value, parseInt(document.getElementById('grey-under-qty').value, 10))")}
            ${service('tender', select('grey-tender', myBuilders.map(s => [s.symbol, s.name]), 'Spółka budowlana'), "greyTender(document.getElementById('grey-tender')?.value)")}
        </div>
        ${typeof renderMafiaSection === 'function' ? renderMafiaSection() : ''}`;
}

function showDefeatScreen() {
    const overlay = document.getElementById('defeat-overlay');
    if (overlay) overlay.hidden = false;
}

// #################################################################################
// ## mafia.js
// #################################################################################

// mafia.js — Mafia (wersja 0.11.2 „Ciemna Strefa”)
//
// Mafia działa w tle od początku (boty-ryzykanci), ale wydarzenia wobec gracza zaczynają się dopiero po jego
// pierwszym kontakcie („Zadzwoń do przyjaciela” w Szarej strefie). Usługi opłaca fundusz: pożyczka, sabotaż,
// cynk o przekręcie, ochrona (haracz), wejściówka na giełdę elitarną. Odmowa lub niezapłacony haracz = ataki.
// Wpływy mafii (0–1000) w 5 etapach: Szara strefa → Układ → Ośmiornica → Państwo w państwie → Kryzys.
// Kasa mafii to osobny zasób. Od wyższych etapów: spółki-przykrywki, ludzie mafii w zarządach (skimming),
// ratowanie bankrutów za udziały, propozycje nie do odrzucenia. Bruno „Elegant” Gato — bot z ukrytymi pakietami.
// Porażka grozi tylko współpracującemu graczowi (wyrok z oversight.js albo przejęcie funduszu przy 1000 pkt).

const MAFIA_STAGES = [
    { min: 0,   name: 'Szara strefa',        icon: '🌫️' },
    { min: 50,  name: 'Układ',               icon: '🤝' },
    { min: 150, name: 'Ośmiornica',          icon: '🐙' },
    { min: 300, name: 'Państwo w państwie',  icon: '🏴' },
    { min: 600, name: 'Kryzys',              icon: '🔥' }
];
const MAFIA_MAX_INFLUENCE = 1000;
const MAFIA_LOAN_LIMIT = 0.2;            // pożyczka do 20% aktywów funduszu
const MAFIA_LOAN_QUARTERLY_RATE = 0.12;  // ≈ 1% tygodniowo — „preferencyjnie”, dopóki płacisz w terminie
const MAFIA_PROTECTION_FEE = 0.01;       // ochrona: 1% aktywów funduszu na kwartał
const MAFIA_DEFEAT_TIES = 5;
const MAFIA_DEFEAT_INFLUENCE = 950;      // „pełna kontrola” (policja co kwartał trochę ją osłabia)
const FRONT_COMPANY_NAMES = ['Całkowicie Legalna Firma', 'Pralnia Pod Mostem', 'Transport Nocny', 'Hurtownia Owoców Egzotycznych', 'Kantor u Zbyszka'];

let mafia = createMafia();

function createMafia() {
    return {
        contacted: false,
        cash: 5_000_000,
        influence: 0,
        ties: { player: 0 },
        loan: null,            // { owed, dueQuarter }
        protection: false,
        demand: null,          // { type: 'haracz' | 'offer' | 'favor', amount, symbol, shares, price, quarter }
        pumps: [],             // { symbol, quarter, success }
        acquired: {},          // akcje zdobyte przez mafię (do rekwizycji): symbol → liczba
        brunoId: null,
        caponeSymbol: null,
        crisisQuarters: 0,
        defeated: false
    };
}

function ensureMafia() {
    const fresh = createMafia();
    mafia = { ...fresh, ...(mafia || {}) };
    mafia.ties = { ...fresh.ties, ...(mafia.ties || {}) };
    if (!Array.isArray(mafia.pumps)) mafia.pumps = [];
    return mafia;
}

function getMafiaStage() {
    if (!Number.isFinite(mafia.influence)) mafia.influence = 0; // zabezpieczenie przed NaN (przerwałoby kwartał)
    return [...MAFIA_STAGES].reverse().find(stage => mafia.influence >= stage.min) || MAFIA_STAGES[0];
}

function getMafiaStageIndex() {
    return MAFIA_STAGES.indexOf(getMafiaStage());
}

function addMafiaInfluence(points) {
    if (!Number.isFinite(points)) return;
    if (!Number.isFinite(mafia.cash)) mafia.cash = 0;
    mafia.influence = clampValue((Number.isFinite(mafia.influence) ? mafia.influence : 0) + points, 0, MAFIA_MAX_INFLUENCE);
}

function getBruno() {
    return mafia.brunoId ? aiCompetitors.find(ai => ai.id === mafia.brunoId) : null;
}

function isMafiaImmune(stock) {
    return hasCeoTrait(stock, 'niezalezny') || stock?.sector?.includes('Obronność');
}

// =================================================================================
// KONTAKT I BRUNO „ELEGANT” GATO
// =================================================================================

function contactMafia() {
    ensureMafia();
    if (mafia.contacted) return true;
    mafia.contacted = true;
    mafia.ties.player = Math.max(mafia.ties.player, 1);
    addMafiaInfluence(10);
    spawnBruno();
    addMail({ sender: CORPORATION_SENDER, subject: '📞 Ktoś oddzwonił z zastrzeżonego numeru', body: '„Słyszałem, że szukasz przyjaciół. Pan Gato chętnie pomoże. Pamiętaj tylko: przysługi się oddaje.”', importance: 3 });
    logEvent('🕶️ Na rynku pojawia się Bruno „Elegant” Gato. Nikt nie wie, ile ma pieniędzy.', 'market');
    return true;
}

function spawnBruno() {
    if (getBruno()) return getBruno();
    const richest = Math.max(...aiCompetitors.map(ai => (typeof calculateNetWorth === 'function' ? calculateNetWorth(ai) : ai.cash) || 0), 100000);
    const bruno = {
        id: 'mafia_bruno', name: 'Bruno „Elegant” Gato', cash: Math.round(Math.max(richest * 1.5, 5_000_000)), portfolio: {}, loans: [],
        personality: 'mafia_boss', isMafia: true, accessLevel: 7, hasTBillAccess: false, tBills: [], creditScore: 100
    };
    aiCompetitors.push(bruno);
    mafia.brunoId = bruno.id;
    return bruno;
}

/** Bruno kupuje „wszystko po trochu”; od Ośmiornicy manipuluje kursem jednego pakietu (z limitem). */
function runBrunoQuarterly() {
    const bruno = getBruno();
    if (!bruno) return;
    const targets = stocks.filter(s => !s.assetType && !s.isBankrupt && !isMafiaImmune(s) && getAvailableShares(s) > 0);
    for (let i = 0; i < 3 && targets.length; i++) {
        const stock = getRandomElement(targets);
        const budget = bruno.cash * 0.04;
        const quantity = Math.floor(Math.min(getAvailableShares(stock), stock.totalShares * getRandomInRange(0.005, 0.02), budget / Math.max(0.01, stock.price)));
        if (quantity > 0) aiBuyStock(bruno, stock.symbol, quantity);
    }
    if (getMafiaStageIndex() >= 2) {
        const held = Object.keys(bruno.portfolio).map(symbol => stocks.find(s => s.symbol === symbol)).filter(Boolean);
        const stock = held.length ? getRandomElement(held) : null;
        const move = (Math.random() < 0.5 ? 1 : -1) * getRandomInRange(0.02, 0.05); // czarny rynek: ruch z limitem
        if (stock) applyPriceEffect(stock.symbol, move, move > 0 ? 'positive' : 'negative', 'market');
    }
}

// =================================================================================
// USŁUGI DLA GRACZA (płaci fundusz)
// =================================================================================

function requireMafiaContact() {
    if (!mafia.contacted) { showToast('Najpierw musisz mieć „przyjaciół”.', 'warning'); return false; }
    if (mafia.defeated || oversight?.convicted) return false;
    return true;
}

function mafiaTrace(suspicion, corruption, influence, cash = 0) {
    getRecord('player').suspicion += suspicion;
    oversight.pendingCorruption += corruption;
    addMafiaInfluence(influence);
    mafia.cash += cash;
    mafia.ties.player++;
}

function mafiaLoan(amount) {
    if (!requireMafiaContact()) return false;
    amount = Math.floor(Number(amount));
    const limit = Math.floor(getFundAssets() * MAFIA_LOAN_LIMIT);
    if (mafia.loan) { showToast('Najpierw spłać poprzednią „pożyczkę”.', 'warning'); return false; }
    if (!(amount > 0) || amount > limit || amount > mafia.cash) { showToast(`Pan Gato pożycza najwyżej ${formatZl(Math.min(limit, mafia.cash), 0)}.`, 'warning'); return false; }
    mafia.cash -= amount;
    playerCash += amount;
    mafia.loan = { owed: amount, dueQuarter: macro.quarter + 2 };
    mafiaTrace(10, 2, 10);
    logEvent(`💼 Fundusz bierze „pożyczkę” ${formatZl(amount, 0)} — termin: 2 kwartały.`, 'review');
    return true;
}

function repayMafiaLoan() {
    if (!mafia.loan) return false;
    const amount = Math.min(playerCash, mafia.loan.owed);
    if (!(amount > 0)) { showToast('Brak gotówki funduszu.', 'error'); return false; }
    playerCash -= amount;
    mafia.cash += amount;
    mafia.loan.owed -= amount;
    if (mafia.loan.owed <= 1) { mafia.loan = null; logEvent('🤝 „Pożyczka” spłacona. Pan Gato jest zadowolony.', 'review'); }
    return true;
}

function getSabotageCost(stock) {
    return Math.round(Math.max(2000, Math.min(getMarketCapValue(stock) * 0.01, getFundAssets() * 0.05)));
}

function mafiaSabotage(symbol) {
    if (!requireMafiaContact()) return false;
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || stock.assetType) return false;
    if (isMafiaImmune(stock)) { showToast('Na tę spółkę mafia nie ma wpływu.', 'warning'); return false; }
    const cost = getSabotageCost(stock);
    if (playerCash < cost) { showToast(`Sabotaż kosztuje ${formatZl(cost, 0)} z funduszu.`, 'error'); return false; }
    playerCash -= cost;
    recordPayment('player-fund', 'external:szara-strefa', cost, 'Usługi ochroniarskie');
    executeSabotage(stock);
    mafiaTrace(25, 3, 15, cost);
    return true;
}

function executeSabotage(stock) {
    const events = ['pożar w magazynie', 'awaria linii produkcyjnej', 'wyciek danych klientów', 'zatrucie w stołówce zakładowej', 'strajk „z niewiadomych przyczyn”'];
    applyPriceEffect(stock.symbol, -getRandomInRange(0.05, 0.1), 'negative', 'company');
    stock.financialHealth = Math.max(-5, (Number(stock.financialHealth) || 0) - 0.5);
    logEvent(`🔥 ${stock.name}: ${getRandomElement(events)}. Kurs spada.`, 'company');
}

function mafiaTip() {
    if (!requireMafiaContact()) return false;
    const cost = Math.round(Math.max(1500, getFundAssets() * 0.003));
    const pool = stocks.filter(s => !s.assetType && !s.isBankrupt && ['JUNK', 'BRONZE'].includes(s.exchange) && !mafia.pumps.some(p => p.symbol === s.symbol));
    if (!pool.length) { showToast('Na śmieciówce nic się nie kroi.', 'default'); return false; }
    if (playerCash < cost) { showToast(`Cynk kosztuje ${formatZl(cost, 0)}.`, 'error'); return false; }
    playerCash -= cost;
    const stock = getRandomElement(pool);
    const roll = Math.random(); // B1: 50% sukces, 35% porażka, 15% prowokacja policyjna
    mafia.pumps.push({ symbol: stock.symbol, quarter: macro.quarter + 1, outcome: roll < 0.5 ? 'success' : roll < 0.85 ? 'fail' : 'sting' });
    mafiaTrace(20, 2, 10, cost);
    addMail({ sender: CORPORATION_SENDER, subject: '🤫 Cynk', body: `„${stock.name} (${stock.symbol}). W przyszłym kwartale coś się wydarzy. Ja nic nie mówiłem.”`, importance: 3, symbol: stock.symbol });
    return true;
}

function toggleMafiaProtection() {
    if (!requireMafiaContact()) return false;
    mafia.protection = !mafia.protection;
    if (mafia.protection) mafia.ties.player++;
    showToast(mafia.protection ? 'Ochrona wykupiona — haracz pobierany co kwartał.' : 'Rezygnujesz z „ochrony”. Uważaj na siebie.', mafia.protection ? 'success' : 'warning');
    return true;
}

/** Wejściówka: pakiet spółki z giełdy elitarnej „spod lady” (−15%), bez względu na stanowisko. Później przysługa. */
function mafiaEntryTicket(symbol) {
    if (!requireMafiaContact()) return false;
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !['RUBY', 'EMERALD', 'DIAMOND', 'PLATINUM'].includes(stock.exchange)) { showToast('Wejściówki tylko na najwyższe giełdy.', 'warning'); return false; }
    const quantity = Math.floor(Math.min(getAvailableShares(stock), stock.totalShares * 0.02, playerCash / (stock.price * 0.85)));
    if (!(quantity > 0)) { showToast('Brak akcji albo gotówki.', 'warning'); return false; }
    const cost = quantity * stock.price * 0.85;
    playerCash -= cost;
    const holding = playerPortfolio[symbol] || (playerPortfolio[symbol] = { shares: 0, avgPrice: 0, assetType: 'stock' });
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + quantity);
    holding.shares += quantity;
    // B1: akcje zablokowane, dopóki stanowisko nie daje dostępu do tej giełdy.
    if (!canAccessExchange(stock.exchange)) { holding.lockedShares = (holding.lockedShares || 0) + quantity; holding.mafiaLocked = (holding.mafiaLocked || 0) + quantity; }
    stock.sharesHeld += quantity;
    mafia.acquired[symbol] = (mafia.acquired[symbol] || 0) + quantity;
    mafiaTrace(20 + (typeof isGuardProtected === 'function' && isGuardProtected(stock) ? 15 : 0), 3, 15, cost * 0.05); // Gwardia patrzy na ręce
    mafia.demand = { type: 'favor', amount: Math.round(cost * 0.15), quarter: macro.quarter + 1, deadline: macro.quarter + 2 };
    logEvent(`🎟️ Fundusz dostaje „spod lady” ${quantity.toLocaleString('pl-PL')} akcji ${stock.name}. Pan Gato zapamięta przysługę.`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

// =================================================================================
// ŻĄDANIA MAFII: haracz, przysługa, propozycja nie do odrzucenia
// =================================================================================

function answerMafiaDemand(accept) {
    const demand = mafia.demand;
    if (!demand) return false;
    mafia.demand = null;
    if (!accept) { mafiaPunishPlayer(demand.type === 'offer' ? 2 : 1); return true; }
    if (demand.type === 'offer') {
        const holding = playerPortfolio[demand.symbol];
        const bruno = getBruno();
        const shares = Math.min(holding?.shares || 0, demand.shares);
        if (!holding || !bruno || shares <= 0) return true;
        const value = shares * demand.price;
        bruno.cash -= value;
        playerCash += value;
        holding.shares -= shares;
        if (holding.shares <= 0) delete playerPortfolio[demand.symbol];
        const target = bruno.portfolio[demand.symbol] || (bruno.portfolio[demand.symbol] = { shares: 0, avgPrice: 0 });
        target.avgPrice = (target.avgPrice * target.shares + value) / (target.shares + shares);
        target.shares += shares;
        logEvent(`🤝 Fundusz „sprzedaje” Panu Gato ${shares.toLocaleString('pl-PL')} akcji ${demand.symbol} po zaniżonej cenie.`, 'review');
    } else {
        const paid = Math.min(playerCash, demand.amount);
        playerCash -= paid;
        mafia.cash += paid;
        recordPayment('player-fund', 'external:szara-strefa', paid, demand.type === 'haracz' ? 'Usługi ochroniarskie' : 'Konsulting');
    }
    mafia.ties.player++;
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

/** Kara za odmowę: sabotaż spółki z portfela i „kradzież” części gotówki funduszu. */
function mafiaPunishPlayer(severity = 1) {
    const holdings = Object.keys(playerPortfolio).map(symbol => stocks.find(s => s.symbol === symbol && !s.assetType && !isMafiaImmune(s))).filter(Boolean)
        .sort((a, b) => (playerPortfolio[b.symbol].shares * b.price) - (playerPortfolio[a.symbol].shares * a.price));
    if (holdings.length) executeSabotage(holdings[0]);
    const stolen = Math.round(Math.max(0, playerCash) * 0.01 * severity);
    playerCash -= stolen;
    mafia.cash += stolen;
    addMail({ sender: CORPORATION_SENDER, subject: '⚠️ Nieprzyjemna wizyta', body: `Ktoś „pomylił” przelewy funduszu (strata ${formatZl(stolen, 0)})${holdings.length ? `, a w ${holdings[0].name} doszło do incydentu` : ''}. Pan Gato przypomina, że przyjaciół się nie odrzuca.`, importance: 3 });
}

function createMafiaDemand() {
    if (!mafia.contacted || mafia.demand || mafia.defeated) return;
    const stage = getMafiaStageIndex();
    if (stage >= 3 && mafia.ties.player >= 3 && Math.random() < 0.3) {
        const holdings = Object.entries(playerPortfolio).filter(([symbol, h]) => h.assetType === 'stock' && h.shares > 0 && stocks.some(s => s.symbol === symbol && !isMafiaImmune(s)));
        if (holdings.length) {
            const [symbol, h] = getRandomElement(holdings);
            const stock = stocks.find(s => s.symbol === symbol);
            mafia.demand = { type: 'offer', symbol, shares: Math.ceil(h.shares * 0.5), price: stock.price * 0.8, quarter: macro.quarter, deadline: macro.quarter + 1 };
            addMail({ sender: CORPORATION_SENDER, subject: '🌹 Propozycja nie do odrzucenia', body: `Pan Gato chce odkupić połowę Twojego pakietu ${stock.name} po ${formatZl(stock.price * 0.8)} za akcję. Odmowa będzie… nierozsądna.`, importance: 3 });
            return;
        }
    }
    if (!mafia.protection && (stage >= 1 || mafia.ties.player >= 2) && Math.random() < 0.3) {
        mafia.demand = { type: 'haracz', amount: Math.round(getFundAssets() * MAFIA_PROTECTION_FEE * 1.5), quarter: macro.quarter, deadline: macro.quarter + 1 };
        addMail({ sender: CORPORATION_SENDER, subject: '💰 Opłata za „spokój”', body: `Pan Gato przypomina, że w tej okolicy bywa niebezpiecznie. ${formatZl(mafia.demand.amount, 0)} zapewni funduszowi spokój. Odpowiedz w Szarej strefie do końca przyszłego kwartału.`, importance: 3 });
    }
}

// =================================================================================
// CO KWARTAŁ
// =================================================================================

function processMafiaQuarterly() {
    ensureMafia();
    const quarter = macro.quarter;
    const stageBefore = getMafiaStageIndex();

    // B2: termin do końca następnego kwartału, przypomnienie kwartał przed karą.
    if (mafia.demand) {
        const deadline = mafia.demand.deadline ?? mafia.demand.quarter + 1;
        if (quarter > deadline) answerMafiaDemand(false);
        else if (quarter === deadline && typeof showBreakingNews === 'function') showBreakingNews('Pan Gato czeka na odpowiedź — termin mija w tym kwartale (Szara strefa).', false);
    }

    // Boty współpracujące z mafią; wrogie boty zlecają sabotaż spółek gracza.
    for (const ai of aiCompetitors) {
        if (ai.isMafia || !['reckless', 'yolo_trader', 'whale'].includes(ai.personality) || Math.random() > 0.15) continue;
        addMafiaInfluence(6);
        mafia.cash += Math.max(0, ai.cash) * 0.01;
        ai.cash *= 0.99;
        getRecord(ai.id).suspicion += 15;
        if (playerFund && !mafia.protection && typeof getRelation === 'function' && getRelation(ai.id) <= RELATION_HOSTILE) {
            const target = getPlayerCompanies().find(s => !isMafiaImmune(s));
            if (target) { executeSabotage(target); logEvent(`🕶️ Mówi się, że za incydentem w ${target.name} stoi ${ai.name}.`, 'review'); }
        }
    }

    // Pożyczka: odsetki i windykacja.
    if (mafia.loan) {
        mafia.loan.owed *= 1 + MAFIA_LOAN_QUARTERLY_RATE;
        if (quarter > mafia.loan.dueQuarter) {
            const taken = Math.min(Math.max(0, playerCash) * 0.02 + mafia.loan.owed * 0.1, mafia.loan.owed);
            playerCash -= taken;
            mafia.loan.owed -= taken;
            mafia.cash += taken;
            mafiaPunishPlayer(1);
            if (mafia.loan.owed <= 1) mafia.loan = null;
        }
    }
    // Ochrona: haracz co kwartał.
    if (mafia.protection && playerFund) {
        const fee = Math.round(getFundAssets() * MAFIA_PROTECTION_FEE);
        const paid = Math.min(Math.max(0, playerCash), fee);
        playerCash -= paid;
        mafia.cash += paid;
        getRecord('player').suspicion += 5;
        if (paid < fee) { mafia.protection = false; mafiaPunishPlayer(1); }
    }

    // Cynki: przekręt dochodzi do skutku (albo nie).
    for (const pump of mafia.pumps.filter(p => p.quarter <= quarter)) {
        const stock = stocks.find(s => s.symbol === pump.symbol);
        const outcome = pump.outcome || (pump.success ? 'success' : 'fail');
        if (stock && outcome === 'sting') {
            getRecord('player').suspicion += 30;
            logEvent(`🚓 ${stock.name}: „przekręt” okazał się policyjną prowokacją. Śledczy notują, kto kupował.`, 'state');
        } else if (stock) {
            stock.price *= outcome === 'success' ? getRandomInRange(1.4, 1.8) : getRandomInRange(0.55, 0.7);
            logEvent(outcome === 'success' ? `🚀 ${stock.name}: niespodziewany kontrakt — kurs wystrzelił!` : `💥 ${stock.name}: „inwestor strategiczny” zniknął — kurs się załamał.`, 'company');
        }
    }
    mafia.pumps = mafia.pumps.filter(p => p.quarter > quarter);

    releaseMafiaLockedShares();
    runBrunoQuarterly();
    runMafiaInfiltration();
    spawnFrontCompanies();
    runMafiaFeud();
    createMafiaDemand();
    updateGreyZoneBadge();

    // Policja osłabia mafię; kryzys przy najwyższym etapie.
    const police = getInstitutionEffectiveness(oversight.police);
    addMafiaInfluence(Math.min(5, mafia.cash / 5_000_000) - police * 5); // kasa mafii buduje wpływy, policja je zbija
    if (getMafiaStageIndex() >= 4) {
        mafia.crisisQuarters++;
        oversight.pendingCorruption += 3;
        if (Math.random() < 0.25) {
            stocks.filter(s => !s.assetType && !s.isBankrupt).forEach(s => applyPriceEffect(s.symbol, -0.02, 'negative', 'market'));
            logEvent('🔥 Państwo mafijne: inwestorzy zagraniczni wycofują kapitał.', 'state');
        }
    } else mafia.crisisQuarters = 0;

    const stageAfter = getMafiaStageIndex();
    if (stageAfter !== stageBefore) {
        const stage = MAFIA_STAGES[stageAfter];
        logEvent(`${stage.icon} Wpływy mafii: ${stageAfter > stageBefore ? 'rosną' : 'słabną'} — etap „${stage.name}”.`, 'state');
    }

    // Porażka tylko dla współpracującego gracza.
    if (mafia.contacted && mafia.influence >= MAFIA_DEFEAT_INFLUENCE && mafia.ties.player >= MAFIA_DEFEAT_TIES && !mafia.defeated) {
        mafia.defeated = true;
        const overlay = document.getElementById('defeat-overlay');
        const text = overlay?.querySelector('p');
        if (text) text.textContent = 'Mafia przejęła Twój fundusz. Pan Gato dziękuje za współpracę — od dziś to on podejmuje decyzje.';
        if (typeof isGamePaused !== 'undefined' && !isGamePaused && typeof togglePauseGame === 'function') togglePauseGame();
        if (overlay) overlay.hidden = false;
    }
}

/** Ludzie mafii w zarządach: skimming zysków; policja może ich wykryć. */
function runMafiaInfiltration() {
    const stage = getMafiaStageIndex();
    const police = getInstitutionEffectiveness(oversight.police);
    for (const stock of stocks.filter(s => s.mafiaBoard && !s.isBankrupt)) {
        const profit = Math.max(0, Number(stock.quarterlyEarnings) || 0);
        const skim = Math.min(Math.max(0, stock.cash), profit * (stock.mafiaBoard === 'ceo' ? 0.25 : 0.03));
        if (skim > 0) {
            adjustCompanyCash(stock, -skim);
            adjustBalanceSheet(stock, { assets: -skim, retainedEarnings: -skim });
            mafia.cash += skim;
        }
        if (Math.random() < police * 0.5) {
            logEvent(`🚓 Policja zatrzymuje ${stock.mafiaBoard === 'ceo' ? 'prezesa' : 'członka zarządu'} ${stock.name} powiązanego z mafią!`, 'state');
            if (stock.mafiaBoard === 'ceo' && stock.ceo) stock.ceo.traits = (stock.ceo.traits || []).filter(t => t.id !== 'czlonek_mafii');
            stock.mafiaBoard = null;
            applyPriceEffect(stock.symbol, -0.05, 'negative', 'company');
            addMafiaInfluence(-20);
        } else if (stock.mafiaBoard === 'board' && stage >= 2 && Math.random() < 0.15 && stock.ceo) {
            stock.mafiaBoard = 'ceo';
            stock.ceo.traits = [...(stock.ceo.traits || []), { id: 'czlonek_mafii', name: ceoTraits.czlonek_mafii.name, description: ceoTraits.czlonek_mafii.description }];
        }
    }
    if (stage >= 1 && Math.random() < 0.25) {
        const pool = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.mafiaBoard && !isMafiaImmune(s) && !s.isStateOwned && !(typeof isGuardProtected === 'function' && isGuardProtected(s)));
        const stock = pool.length ? getRandomElement(pool) : null;
        if (stock) { stock.mafiaBoard = 'board'; addMafiaInfluence(5); }
    }
}

/** Spółki-przykrywki na Giełdzie Śmieciowej (pierwsza zawsze „Całkowicie Legalna Firma”). */
function spawnFrontCompanies() {
    const fronts = stocks.filter(s => s.mafiaFront && !s.isBankrupt);
    if (getMafiaStageIndex() < 1 || fronts.length >= 3 || !hasFreeListingSlot() || Math.random() > 0.15 * getDebutFactor()) return; // D2: tylko przy wolnym miejscu
    const name = FRONT_COMPANY_NAMES.find(n => !stocks.some(s => s.name === n)) || `${getRandomElement(MEMBER_NAME_PREFIXES)} Usługi`;
    const stock = createListedCompany({ name, symbol: uniqueSymbol(name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CLF'), sector: ['Usługi'], price: getRandomInRange(2, 8), totalShares: 20000, exchange: 'JUNK' });
    stock.mafiaFront = true;
    stocks.push(stock);
    logEvent(`🏢 Na Giełdzie Śmieciowej debiutuje ${stock.name}. Księgowość „bez zarzutu”.`, 'market');
    if (!mafia.caponeSymbol && fronts.length >= 1) {
        const capone = createListedCompany({ name: 'AI Capone Holding', symbol: uniqueSymbol('CAPO'), sector: ['Usługi'], price: getRandomInRange(3, 9), totalShares: 20000, exchange: 'JUNK' });
        capone.mafiaFront = true;
        capone.rivalMafia = true;
        stocks.push(capone);
        mafia.caponeSymbol = capone.symbol;
        logEvent('🎩 AI Capone Holding wchodzi na rynek. Konkurencja dla „pewnych ludzi”?', 'market');
    }
}

/** Porachunki: AI Capone kontra spółki-przykrywki Pana Gato. */
function runMafiaFeud() {
    const capone = stocks.find(s => s.symbol === mafia.caponeSymbol && !s.isBankrupt);
    const front = stocks.find(s => s.mafiaFront && !s.rivalMafia && !s.isBankrupt);
    if (!capone || !front || Math.random() > 0.2) return;
    const [loser, winner] = Math.random() < 0.5 ? [capone, front] : [front, capone];
    applyPriceEffect(loser.symbol, -0.15, 'negative', 'company');
    applyPriceEffect(winner.symbol, 0.05, 'positive', 'company');
    addMafiaInfluence(-5);
    logEvent(`💣 Porachunki: ${winner.name} kontra ${loser.name}. W nocy spłonęły magazyny ${loser.name}.`, 'company');
}

/** Wzrost spółek-przykrywek z wpływami mafii (computeQuarterResults). */
function getMafiaFrontGrowth(stock) {
    return stock?.mafiaFront ? mafia.influence / MAFIA_MAX_INFLUENCE * 0.03 : 0;
}

/** Ratunek bankruta za udziały dla Pana Gato (od Ośmiornicy, 20%). Zwraca true, gdy uratowano. */
function mafiaRescueFromBankruptcy(stock) {
    if (getMafiaStageIndex() < 2 || isMafiaImmune(stock) || Math.random() > 0.2) return false;
    const bruno = getBruno() || spawnBruno();
    const equity = (stock.balanceSheet?.assets || 0) - (stock.balanceSheet?.liabilities || 0);
    const amount = Math.max(0, -equity) + Math.max(0, getMarketCapValue(stock) * 0.02);
    if (mafia.cash < amount) return false;
    mafia.cash -= amount;
    adjustCompanyCash(stock, amount);
    adjustBalanceSheet(stock, { assets: amount, retainedEarnings: amount });
    stock.financialHealth = 0;
    const shares = Math.floor(stock.totalShares * getRandomInRange(0.01, 0.05));
    stock.maxShares = Math.max(Number(stock.maxShares) || 0, stock.totalShares) + shares;
    stock.totalShares += shares;
    stock.sharesHeld += shares;
    const holding = bruno.portfolio[stock.symbol] || (bruno.portfolio[stock.symbol] = { shares: 0, avgPrice: stock.price });
    holding.shares += shares;
    addMafiaInfluence(10);
    logEvent(`🕶️ ${stock.name} w ostatniej chwili znajduje „inwestora”. Bankructwo zażegnane.`, 'company');
    return true;
}

/** Rekwizycja (3. i kolejne wykrycie): akcje zdobyte przez mafię idą na aukcję — ukarany nie licytuje. */
function seizeMafiaAssets() {
    let total = 0;
    for (const [symbol, quantity] of Object.entries(mafia.acquired)) {
        const holding = playerPortfolio[symbol];
        const stock = stocks.find(s => s.symbol === symbol);
        const shares = Math.min(holding?.shares || 0, quantity);
        if (!stock || shares <= 0) continue;
        holding.shares -= shares;
        if (holding.shares <= 0) delete playerPortfolio[symbol];
        if (typeof notePlayerPositionLoss === 'function') notePlayerPositionLoss(symbol, shares, 'rekwizycja policji (akcje zdobyte przez mafię)');
        const price = stock.price * 0.9;
        const buyer = aiCompetitors.filter(ai => !ai.isMafia && ai.cash >= shares * price).sort(() => Math.random() - 0.5)[0];
        if (buyer) {
            buyer.cash -= shares * price;
            const target = buyer.portfolio[symbol] || (buyer.portfolio[symbol] = { shares: 0, avgPrice: price });
            target.avgPrice = (target.avgPrice * target.shares + shares * price) / (target.shares + shares);
            target.shares += shares;
            governmentTreasury += shares * price;
        } else {
            stock.sharesHeld = Math.max(0, stock.sharesHeld - shares); // nikt nie kupił — akcje wracają do obrotu
        }
        total += shares * price;
    }
    mafia.acquired = {};
    if (total > 0) logEvent(`🔨 Policyjna aukcja: zarekwirowane akcje funduszu sprzedane za ${formatZl(total, 0)} (fundusz nie mógł licytować).`, 'state');
    return total;
}

// =================================================================================
// WIDOK: sekcja mafii w Szarej strefie
// =================================================================================

function renderMafiaSection() {
    ensureMafia();
    const stage = getMafiaStage();
    if (!mafia.contacted) {
        return `<h3 class="mt-4">🕶️ „Przyjaciele”</h3>
            <p class="text-sm text-muted">Mafia działa w tle (etap: ${stage.icon} ${stage.name}). Dopóki nie zadzwonisz, nie interesuje się Twoim funduszem. Po kontakcie pojawią się usługi — i żądania.</p>
            <button class="btn-danger" onclick="contactMafia(); renderGreyZone();">📞 Zadzwoń do „przyjaciela”</button>`;
    }
    const demand = mafia.demand;
    const demandText = demand ? {
        haracz: `Opłata za „spokój”: ${formatZl(demand.amount, 0)}`,
        favor: `Przysługa za wejściówkę: ${formatZl(demand.amount, 0)}`,
        offer: `Propozycja: połowa pakietu ${demand.symbol} po ${formatZl(demand.price)} za akcję`
    }[demand.type] : '';
    const companies = stocks.filter(s => !s.assetType && !s.isBankrupt && !isMafiaImmune(s));
    const elite = stocks.filter(s => !s.assetType && !s.isBankrupt && ['RUBY', 'EMERALD', 'DIAMOND', 'PLATINUM'].includes(s.exchange));
    const unionized = stocks.filter(s => !s.isBankrupt && s.workforce?.union); // 0.13
    const option = list => list.map(s => `<option value="${s.symbol}">${escapeHtml(s.name)} (${s.symbol})</option>`).join('');
    return `<h3 class="mt-4">🕶️ Pan Gato</h3>
        <div class="bank-ticker"><div class="bank-ticker-item"><span>Wpływy mafii</span><strong>${stage.icon} ${stage.name}</strong></div>
            <div class="bank-ticker-item"><span>Twoje powiązania</span><strong class="${mafia.ties.player >= MAFIA_DEFEAT_TIES ? 'text-down' : ''}">${mafia.ties.player}</strong></div>
            <div class="bank-ticker-item"><span>„Pożyczka”</span><strong>${mafia.loan ? `${formatZl(mafia.loan.owed, 0)} (termin: ${Math.max(0, mafia.loan.dueQuarter - macro.quarter)} kw.)` : '—'}</strong></div>
            <div class="bank-ticker-item"><span>Ochrona</span><strong>${mafia.protection ? '🛡️ wykupiona' : 'brak'}</strong></div></div>
        ${demand ? `<div class="mafia-demand"><strong>📩 ${escapeHtml(demandText)}</strong>
            <button onclick="answerMafiaDemand(true); renderGreyZone();">Zgadzam się</button>
            <button class="btn-danger" onclick="answerMafiaDemand(false); renderGreyZone();">Odmawiam</button></div>` : ''}
        <div class="grey-grid">
            <article class="grey-card"><h4>💼 „Pożyczka”</h4><p class="text-sm text-muted">Do ${(MAFIA_LOAN_LIMIT * 100).toFixed(0)}% aktywów funduszu, ~1% tygodniowo, termin 2 kwartały. Spóźnienie = windykacja.</p>
                <div class="bank-card-form">${mafia.loan ? `<button onclick="repayMafiaLoan(); renderGreyZone(); displayCash();">Spłać</button>` : `<input type="text" inputmode="numeric" id="mafia-loan" value="${Math.floor(getFundAssets() * 0.1)}" aria-label="Kwota"><button class="btn-danger" onclick="mafiaLoan(parseFloat(document.getElementById('mafia-loan').value)); renderGreyZone(); displayCash();">Pożycz</button>`}</div></article>
            <article class="grey-card"><h4>🔥 Sabotaż</h4><p class="text-sm text-muted">Bardzo negatywne zdarzenie w wybranej spółce (−5…−10%, kondycja). Nie działa na spółki z niezależnym prezesem.</p>
                <div class="bank-card-form"><select id="mafia-sabotage" aria-label="Spółka">${option(companies)}</select><button class="btn-danger" onclick="mafiaSabotage(document.getElementById('mafia-sabotage').value); renderGreyZone(); displayCash();">Zleć</button></div></article>
            <article class="grey-card"><h4>🤫 Cynk</h4><p class="text-sm text-muted">Przekręt na spółce ze śmieciówki: w przyszłym kwartale kurs +40…80% albo −30…45%. Czasem to policyjna prowokacja.</p>
                <div class="bank-card-form"><button class="btn-danger" onclick="mafiaTip(); renderGreyZone(); displayCash();">Kup cynk</button></div></article>
            <article class="grey-card"><h4>🛡️ Ochrona</h4><p class="text-sm text-muted">${(MAFIA_PROTECTION_FEE * 100).toFixed(0)}% aktywów funduszu na kwartał. Chroni przed żądaniami haraczu i atakami wrogich botów.</p>
                <div class="bank-card-form"><button class="${mafia.protection ? 'btn-secondary' : 'btn-danger'}" onclick="toggleMafiaProtection(); renderGreyZone();">${mafia.protection ? 'Zrezygnuj' : 'Wykup ochronę'}</button></div></article>
            <article class="grey-card"><h4>🪓 „Rozbicie” związku</h4><p class="text-sm text-muted">Związek zakładowy w wybranej spółce „sam się rozwiązuje”. Ryzyko wykrycia ${(UNION_BUST_DETECTION * 100).toFixed(0)}%: strajk generalny w całym sektorze, afera, wpis compliance i spadek zaufania klientów.</p>
                <div class="bank-card-form">${unionized.length ? `<select id="mafia-union" aria-label="Spółka">${option(unionized)}</select><button class="btn-danger" onclick="mafiaBustUnion(document.getElementById('mafia-union').value); renderGreyZone(); displayCash();">Zleć</button>` : '<span class="text-xs text-muted">brak związków zakładowych</span>'}</div></article>
            <article class="grey-card"><h4>🎟️ Wejściówka</h4><p class="text-sm text-muted">Do 2% akcji spółki z najwyższych giełd −15%. Sprzedasz je dopiero, gdy stanowisko da dostęp do tej giełdy. Przysługa 15%, akcje podlegają rekwizycji.</p>
                <div class="bank-card-form">${elite.length ? `<select id="mafia-ticket" aria-label="Spółka">${option(elite)}</select><button class="btn-danger" onclick="mafiaEntryTicket(document.getElementById('mafia-ticket').value); renderGreyZone(); displayCash();">Załatw</button>` : '<span class="text-xs text-muted">brak spółek</span>'}</div></article>
        </div>`;
}

/** B1: odblokowanie akcji z wejściówki, gdy stanowisko pozwala już handlować na tej giełdzie. */
function releaseMafiaLockedShares() {
    for (const [symbol, holding] of Object.entries(playerPortfolio)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (!holding.mafiaLocked || !stock || !canAccessExchange(stock.exchange)) continue;
        holding.lockedShares = Math.max(0, (holding.lockedShares || 0) - holding.mafiaLocked);
        holding.mafiaLocked = 0;
    }
}

/** B2: znacznik oczekującego żądania na przycisku „Szara strefa”. */
function updateGreyZoneBadge() {
    const button = document.getElementById('open-grey-btn');
    if (!button) return;
    let badge = button.querySelector('.nav-badge-alert');
    if (mafia?.demand) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge-alert'; button.style.position = 'relative'; button.appendChild(badge); }
        badge.textContent = '1';
    } else if (badge) badge.remove();
}

// #################################################################################
// ## scandals.js
// #################################################################################

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
    { id: 'quick',  name: 'Szybka Kasa Plus S.A.',       bankName: 'Szybka Kasa Plus',       margin: 0.10, loanCut: 0.05, target: 5, desc: 'kredyty bez BIK w 15 minut' },
    // 0.16.4 G19: PanDa Bank (Chiny) — ta sama mechanika; akcje to spółka zagraniczna (foreignId), a scenariusz startuje z dołączeniem Chin, nie losowo
    { id: 'panda',  name: 'PanDa Bank',                  bankName: 'PanDa Bank',             margin: 0.15, loanCut: 0.02, target: 6, desc: 'lokaty o najwyższym oprocentowaniu w Azji', foreignId: 'PND' }
];
const PARABANK_SPAWN_CHANCE = 0.08;
const PANDA_SURVIVE_CHANCE = 0.3;   // 0.16.4: PanDa Bank (parabank zagraniczny) przeżywa ocenę upadku z tą szansą i działa dalej bez ryzyka upadku
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

/** Akcje parabanku: spółka z `stocks` albo (PanDa Bank) obca spółka z `foreignIssuers`. */
function getParabankStock(parabank) {
    return parabank.foreignId ? (foreignIssuers[parabank.foreignId] || null) : (stocks.find(s => s.symbol === parabank.symbol) || null);
}

/** PanDa Bank: start razem z dołączeniem Chin (raz). */
function spawnPandaParabank() { return spawnParabank(PARABANK_SCENARIOS.find(s => s.id === 'panda')); }

function spawnParabank(forced) {
    const scenario = forced || PARABANK_SCENARIOS.find(s => !s.foreignId && !scandals.usedScenarios.includes(s.id));
    if (!scenario || scandals.usedScenarios.includes(scenario.id)) return null;
    if (scenario.foreignId && !foreignIssuers[scenario.foreignId]) return null;
    scandals.usedScenarios.push(scenario.id);
    const bank = {
        id: `para_${scenario.id}`, name: scenario.bankName, type: BANK_TYPES.INTERNET, isActive: true, isParabank: true,
        cash: 500_000, initialCapital: 500_000, reserveRatio: 0, baseInterestRateMargin: scenario.margin,
        stockPortfolio: {}, loanPortfolio: {}, startupInvestments: {}, depositPortfolio: {}
    };
    commercialBanks.push(bank);
    if (typeof updateInterestRates === 'function') updateInterestRates();
    let stock;
    if (scenario.foreignId) stock = foreignIssuers[scenario.foreignId];
    else {
        stock = createListedCompany({ name: scenario.name, symbol: uniqueSymbol(scenario.bankName.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase()), sector: ['Finanse'], price: getRandomInRange(20, 40), totalShares: 50000, exchange: 'BRONZE' });
        stock.isParabankStock = true;
        stocks.push(stock);
    }
    const symbol = scenario.foreignId || stock.symbol;
    // B1: termin upadku losowy i ukryty (3–8 kw.) — bez „pewnego” zarobku na akcjach.
    const parabank = { id: `pb${scandals.nextId++}`, scenario: scenario.id, bankId: bank.id, symbol, foreignId: scenario.foreignId || undefined, phase: 'open', quarters: 0, raised: 0, peakPrice: stock.price, knfWarned: false, collapseAt: getRandomIntInRange(3, 8) };
    scandals.parabanks.push(parabank);
    logEvent(`🏦 Nowy gracz na rynku: ${scenario.bankName} — ${scenario.desc}. ${scenario.foreignId ? `Akcje ${stock.name} notowane są na giełdzie w Szanghaju.` : `Akcje ${stock.name} debiutują na Rynku Brązowym.`}`, 'market');
    addMail({ sender: 'PULS', subject: `🎁 ${scenario.bankName}: oferta, jakiej nie było`, body: `${scenario.bankName} kusi: ${scenario.desc}. Lokata dla funduszy nawet ${(getFundDepositRate(bank, 16) * 100).toFixed(1)}% rocznie. Akcje banku dla inwestorów instytucjonalnych z rabatem 10%.`, importance: 2, symbol });
    return parabank;
}

/** Akcje parabanku dla funduszu z rabatem 10% (faza otwarcia). */
function buyParabankShares(parabankId, quantity) {
    const parabank = scandals.parabanks.find(p => p.id === parabankId);
    const stock = parabank && getParabankStock(parabank);
    quantity = Math.floor(Number(quantity));
    if (!stock || parabank.phase !== 'open') { showToast('Oferta nieaktualna.', 'warning'); return false; }
    if (parabank.foreignId) { // akcje zagraniczne: zwykły zakup (bilet, prowizja, próg wezwania), potem rabat 10% zwrotem
        const r = buyForeignShares(parabank.foreignId, quantity);
        if (!r.ok) { showToast(r.reason, 'warning'); return false; }
        const rebate = quantity * toPln(stock.price, stock.currency) * 0.1;
        playerCash += rebate; parabank.raised += quantity * toPln(stock.price, stock.currency) - rebate;
        showToast(`Kupiono ${quantity} akcji ${stock.name}; rabat instytucjonalny ${formatZl(rebate, 0)}.`, 'success');
        return true;
    }
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
        const stock = getParabankStock(parabank);
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
                stock.price *= getRandomInRange(0.9, 1.2); // entuzjazm z szumem
                parabank.peakPrice = Math.max(parabank.peakPrice, stock.price);
            }
            if (!parabank.knfWarned && Math.random() < getInstitutionEffectiveness(oversight.knf) * 0.35) {
                parabank.knfWarned = true;
                parabank.collapseAt = Math.max(parabank.quarters + 1, (parabank.collapseAt || scenario.target) - getRandomIntInRange(1, 2)); // ostrzeżenie przyspiesza śledztwo
                addMail({ sender: 'OBSER', subject: `⚠️ KNF: ${scenario.bankName} na liście ostrzeżeń publicznych`, body: `Komisja Nadzoru Finansowego ostrzega: ${scenario.bankName} nie ma licencji bankowej, a lokaty nie są objęte gwarancją. Uważaj.`, importance: 3, symbol: parabank.symbol });
            }
            if (!parabank.survived && (parabank.panic || parabank.quarters >= (parabank.collapseAt || scenario.target))) {
                if (parabank.foreignId && !parabank.survivalRolled) { // jedna ocena: przetrwanie = brak dalszego ryzyka upadku (prostsza wersja)
                    parabank.survivalRolled = true;
                    if (Math.random() < PANDA_SURVIVE_CHANCE) {
                        parabank.survived = true; parabank.panic = false;
                        logEvent(`🏦 ${scenario.bankName} przetrwał kontrole i dalej przyjmuje lokaty.`, 'market');
                    }
                }
                if (!parabank.survived) collapseParabank(parabank, 'investigation');
            }
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
    const stock = getParabankStock(parabank);
    parabank.phase = phase;

    if (phase === 'investigation') {
        if (bank) bank.frozen = true;
        if (stock) { stock.price = 0.01; stock.isTradeLocked = true; stock.tradeHalted = true; if (parabank.foreignId) stock.history.push(stock.price); }
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
        if (stock) { if (parabank.foreignId) delistForeignIssuer(stock, stock.price); else delistStockAtPrice(stock, stock.price); }
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
            if (getFundStakePct(stock) >= PR_WAR_MIN_STAKE) addMail({ sender: CORPORATION_SENDER, subject: `📢 Wojna PR: ${stock.name} jest stroną`, body: 'Od 20% akcji możesz podpowiedzieć zarządowi kampanię (z gotówki spółki); większościowiec może też zaproponować rozejm — w oknie Państwa → Nadzór.', importance: 2, symbol: stock.symbol });
        }
        return war;
    }
    return null;
}

const PR_WAR_MIN_STAKE = 0.2; // B4: od 20% akcji fundusz może podpowiedzieć zarządowi kampanię

/** Gracz wspiera kampanię spółki — 1% kapitalizacji z gotówki spółki. Bez większości zarząd może odmówić. */
function supportPrCampaign(symbol) {
    const war = scandals.prWars.find(w => w.a === symbol || w.b === symbol);
    const stock = stocks.find(s => s.symbol === symbol);
    const stake = stock ? getFundStakePct(stock) : 0;
    if (!war || !stock || stake < PR_WAR_MIN_STAKE) return false;
    const cost = Math.round(getMarketCapValue(stock) * 0.01);
    if (stock.cash < cost) { showToast('Spółka nie ma gotówki na kampanię.', 'error'); return false; }
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    if (stake <= 0.5) {
        if (!war.suggested) war.suggested = {};
        if (war.suggested[symbol] === quarter) { showToast('Zarząd już rozważał Twoją sugestię w tym kwartale.', 'default'); return false; }
        war.suggested[symbol] = quarter;
        if (Math.random() >= stake * 2) { showToast(`Zarząd ${stock.name} nie przyjmuje sugestii (szansa ${(stake * 200).toFixed(0)}%).`, 'warning'); return false; }
    }
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
    if (!active && hasFreeListingSlot() && (typeof macro !== 'object' || macro.quarter >= 4) && Math.random() < PARABANK_SPAWN_CHANCE * getDebutFactor()) spawnParabank(); // D2
}

// =================================================================================
// WIDOKI
// =================================================================================

/** Dodatek do karty banku: oferty parabanku i ostrzeżenie KNF. */
function renderParabankExtras(bank) {
    const parabank = getParabankFor(bank.id);
    if (!parabank) return '';
    const stock = getParabankStock(parabank);
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
        const mine = [war.a, war.b].find(symbol => { const s = stocks.find(x => x.symbol === symbol); return s && getFundStakePct(s) >= PR_WAR_MIN_STAKE; });
        const majority = mine && getFundStakePct(stocks.find(x => x.symbol === mine)) > 0.5;
        return `<li>📢 ${escapeHtml(war.a)} ⚔️ ${escapeHtml(war.b)} · zostało ${war.quartersLeft} kw. · przewaga: ${war.score >= 0 ? war.a : war.b}
            ${mine ? `<button class="btn-xs" onclick="supportPrCampaign('${mine}'); updateStateModalContent();">${majority ? 'Wesprzyj' : 'Podpowiedz kampanię'} ${escapeHtml(mine)}</button>${majority ? ` <button class="btn-xs btn-secondary" onclick="proposePrTruce('${mine}'); updateStateModalContent();">Rozejm</button>` : ''}` : ''}</li>`;
    }).join('')}</ul>`;
}

/** B1: sprzedaż dużego pakietu akcji parabanku w fazie otwarcia może wywołać panikę i wcześniejsze śledztwo. */
function onParabankSharesSold(stock, quantity) {
    const parabank = scandals?.parabanks?.find(p => p.symbol === stock.symbol && p.phase === 'open');
    if (!parabank || quantity / Math.max(1, stock.totalShares || stock.shares) < 0.02 || Math.random() > 0.5) return false;
    parabank.panic = true;
    logEvent(`📉 Duży pakiet ${stock.name} trafia na rynek — klienci banku zaczynają się niepokoić.`, 'market');
    return true;
}
