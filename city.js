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
const CITY_UNLOCK_DONATION = 1000; // odblokowanie obligacji komunalnych i festynu (wcześniej 10 000 — nierealne przy 100 zł od babci)

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
    logEvent(`🏙️ Miasto ogłasza projekt PPP: ${offer.icon} ${offer.name} — ${offer.total.toLocaleString('pl-PL')} zł, ${(offer.rate * 100).toFixed(1)}% rocznie, ${offer.termWeeks} tyg.`, 'city');
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
    if (!(amount >= 100)) { showToast('Minimalny udział: 100 zł.', 'error'); return null; }
    if (amount > playerCash) { showToast('Za mało gotówki funduszu.', 'error'); return null; }
    if (amount > getFundPppCapacity() + 1e-6) { showToast(`Limit PPP: ${(PPP_FUND_LIMIT * 100).toFixed(0)}% aktywów funduszu.`, 'error'); return null; }

    playerCash -= amount;
    city.budget += amount;
    offer.raised += amount;
    const stake = { id: `${offer.id}_${playerFund.ppp.length + 1}`, name: offer.name, icon: offer.icon, principal: amount, rate: offer.rate, weeksLeft: offer.termWeeks, termWeeks: offer.termWeeks, unpaid: 0, extensions: 0 };
    playerFund.ppp.push(stake);
    recordPayment('player-fund', 'external:miasto', amount, `PPP: ${offer.name}`);
    if (typeof noteCorporateGoal === 'function') noteCorporateGoal('project');
    logEvent(`🤝 Fundusz współfinansuje projekt miejski ${offer.icon} ${offer.name}: ${amount.toLocaleString('pl-PL')} zł na ${offer.termWeeks} tyg.`, 'review');
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
            logEvent(`🏙️ Miasto spłaca udział funduszu w PPP ${stake.icon} ${stake.name}: ${stake.principal.toLocaleString('pl-PL')} zł.`, 'review');
        } else if (stake.extensions < 2) {
            stake.extensions++;
            stake.weeksLeft = 4;
            logEvent(`⚠️ Miasto przesuwa spłatę PPP ${stake.name} o 4 tygodnie (brak środków w budżecie).`, 'city');
        } else {
            const recovery = stake.principal * PPP_RECOVERY;
            playerCash += recovery;
            playerFund.ppp = playerFund.ppp.filter(item => item !== stake);
            logEvent(`💥 Miasto nie spłaca PPP ${stake.name} — fundusz odzyskuje ${recovery.toFixed(0)} z ${stake.principal.toFixed(0)} zł.`, 'review');
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
            logEvent(`🏛️ Państwowy Program Emerytalny powierza Twojemu funduszowi ${amount.toFixed(0)} zł (miejsce ${index + 1} w rankingu).`, 'review');
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
