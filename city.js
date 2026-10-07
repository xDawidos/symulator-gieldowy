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
    logEvent(`🏙️ Przekazujesz ${amount.toFixed(2)} zł na rozwój miasta. Twój wkład: ${city.playerDonatedAmount.toFixed(2)} zł.`, 'city');

    if (!city.playerHasUnlocked && city.playerDonatedAmount >= 10000) {
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
        logEvent(`🏛️ Rząd przekazał ${stateGrant.toFixed(0)} zł dotacji dla miasta ${city.name}.`, 'state');
    }
    city.budget += citizenTax + stateGrant - expenses;

    runMayorPolicy();

    const growth = getRandomInRange(0.01, 0.02) + (city.infrastructureLevel - 1) * 0.01;
    city.population += Math.floor(city.population * growth);

    // Poparcie: budżet na plusie i rozwój pomagają, dziura budżetowa szkodzi; powolny powrót do 50.
    const mayor = city.mayor;
    mayor.support += (city.budget > 0 ? 3 : -8) + (city.infrastructureLevel - 1) * 5 + (50 - mayor.support) * 0.1;
    mayor.support = Math.max(5, Math.min(95, mayor.support));

    logEvent(`🏙️ Roczne rozliczenie miasta ${city.name}: budżet ${city.budget.toFixed(0)} zł, mieszkańców ${city.population.toLocaleString('pl-PL')}, poparcie burmistrza ${mayor.support.toFixed(0)}%.`, 'city');
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
            logEvent(`🏙️ Program wsparcia biznesu: ${stock.name} otrzymuje ${grant.toFixed(0)} zł dotacji od miasta.`, 'city');
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
            logEvent(`🏙️ Burmistrz ${city.mayor.name} zleca przez ${stock.name} inwestycję „${spec.name}” (dotacja ${grant.toLocaleString('pl-PL')} zł) — przetarg dla firm budowlanych.`, 'city');
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
    logEvent(`🗳️ Wspierasz kampanię: ${candidate.name} (${amount.toFixed(0)} zł).`, 'city');
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
    logEvent(`🏛️ PRYWATYZACJA: Skarb Państwa sprzedaje ${shares.toLocaleString('pl-PL')} akcji ${stock.name} po ${privatizationOffer.price.toFixed(2)} zł (dyskonto do rynku). Zapisy przez tydzień.`, 'state');
    addMail({
        sender: CORPORATION_SENDER,
        subject: `Oferta prywatyzacyjna: ${stock.name}`,
        body: `Skarb Państwa sprzedaje akcje ${stock.name} po ${privatizationOffer.price.toFixed(2)} zł. Fundusz może kupić do 30% oferty. Zapisy przez tydzień gry.`,
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
    logEvent(`🏛️ Fundusz kupuje ${quantity} akcji ${stock.name} w prywatyzacji za ${cost.toFixed(2)} zł.`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

/** Akcje przechodzą od państwa do kupującego (sharesHeld bez zmian — były już poza wolnym obrotem). */
function transferStateShares(stock, quantity) {
    stock.stateOwnershipPct = Math.max(0, (stock.stateOwnershipPct || 0) - quantity / stock.totalShares);
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
    for (const ai of aiCompetitors.filter(ai => ai.personality !== 'market_maker').sort(() => Math.random() - 0.5)) {
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
        logEvent(`⚖️ Urząd antymonopolowy nakłada na ${stock.name} karę ${fine.toLocaleString('pl-PL')} zł za nadużywanie pozycji monopolisty.`, 'state');
        penalized.push(stock.symbol);
    }
    return penalized;
}
