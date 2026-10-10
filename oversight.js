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
    debt:      { label: 'Umorzenie długu za łapówkę', icon: '🧾', risk: 25, corruption: 6, desc: 'Urzędnik „gubi” część zobowiązań spółki, w której fundusz ma większość.' },
    underTable:{ label: 'Pakiet „pod stołem”', icon: '🤝', risk: 20, corruption: 4, desc: 'Sprzedaż pakietu botowi poza rynkiem z premią 10%.' },
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
        convicted: false
    };
}

function ensureOversight() {
    const fresh = createOversight();
    oversight = { ...fresh, ...(oversight || {}) };
    oversight.police = { ...fresh.police, ...(oversight.police || {}) };
    oversight.knf = { ...fresh.knf, ...(oversight.knf || {}) };
    if (!Array.isArray(oversight.history)) oversight.history = [];
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
        return true;
    }
    return false;
}

/** Dotacja gracza z konta prywatnego (nie zmniejsza podejrzeń — to nie jest „odpust”). */
function donateToInstitution(kind, amount) {
    const institution = oversight[kind];
    amount = Math.floor(Number(amount));
    if (!institution || !(amount >= 100)) { showToast('Dotacja: minimum 100 zł.', 'warning'); return false; }
    if (playerWallet.cash < amount) { showToast('Za mało pieniędzy w portfelu prywatnym.', 'error'); return false; }
    playerWallet.cash -= amount;
    recordPayment('player-wallet', 'external:skarb-panstwa', amount, `Dotacja: ${kind === 'police' ? 'Policja' : 'KNF'}`);
    const upgraded = fundInstitution(institution, amount);
    showToast(upgraded ? `${kind === 'police' ? 'Policja' : 'KNF'} awansuje na poziom ${institution.level}!` : 'Dziękujemy za wsparcie.', 'success');
    return true;
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
function commitCorruptAct(serviceId, extraCost = 0) {
    const service = GREY_SERVICES[serviceId];
    const cost = getGreyServiceCost(serviceId) + extraCost;
    if (playerCash < cost) { showToast(`Za mało gotówki funduszu (${formatZl(cost, 0)}).`, 'error'); return false; }
    playerCash -= cost;
    recordPayment('player-fund', 'external:szara-strefa', cost, 'Usługa doradcza');
    getRecord('player').suspicion += service.risk;
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
    const writeOff = Math.round(Math.max(0, stock.balanceSheet?.liabilities || 0) * 0.3);
    if (writeOff <= 0) { showToast('Spółka nie ma zobowiązań.', 'default'); return false; }
    if (!commitCorruptAct('debt', Math.round(writeOff * 0.05))) return false;
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
    const price = stock.price * 1.1;
    const value = quantity * price;
    const buyer = aiCompetitors.filter(ai => ai.personality !== 'market_maker' && ai.cash >= value).sort((a, b) => b.cash - a.cash)[0];
    if (!buyer) { showToast('Nikt nie ma tyle gotówki na taki pakiet.', 'warning'); return false; }
    if (!commitCorruptAct('underTable')) return false;
    buyer.cash -= value;
    const target = buyer.portfolio[symbol] || (buyer.portfolio[symbol] = { shares: 0, avgPrice: 0 });
    target.avgPrice = (target.avgPrice * target.shares + value) / (target.shares + quantity);
    target.shares += quantity;
    holding.shares -= quantity; // sharesHeld bez zmian — akcje zmieniają właściciela
    if (holding.shares <= 0) delete playerPortfolio[symbol];
    playerCash += value;
    getRecord('player').illegalGains += quantity * stock.price * 0.1;
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
    const assets = typeof getFundAssets === 'function' ? getFundAssets() : 0;
    return clampValue(Math.log10(Math.max(1, assets)) / 7, 0.1, 1); // 10 mln zł → pełna uwaga
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
    const assets = ai ? ai.cash : getFundAssets();
    const fine = Math.round(Math.max(500, assets * STRIKE_FINES[Math.min(record.strikes, STRIKE_FINES.length) - 1]));
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
    const share = STATE_INSTITUTION_FUNDING * (typeof getRulingParty === 'function' && getRulingParty() === RULING_PARTIES.state ? 1.3 : 1);
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
        const pKnf = knf * knfFactor * record.suspicion / 200;
        if (record.suspicion > 0 && Math.random() < Math.min(0.85, pPolice)) punishEntity(id, 'Policja');
        else if (record.suspicion > 0 && Math.random() < Math.min(0.85, pKnf)) punishEntity(id, 'KNF');
        record.suspicion = Math.max(0, record.suspicion * 0.85);
    }
    // Rutynowa kontrola KNF dużego funduszu: czysta = zaufanie klientów rośnie.
    if (playerFund && Math.random() < 0.1 * getKnfAttention() && (getRecord('player').suspicion < 5)) {
        playerFund.trust = Math.min(100, playerFund.trust + 2);
        logEvent('✅ Rutynowa kontrola KNF w Twoim funduszu: bez zastrzeżeń. Klienci to doceniają.', 'review');
    }

    // Korupcja: nowe czyny, walka instytucji, powrót do poziomu bazowego.
    oversight.corruption = clampValue(oversight.corruption + oversight.pendingCorruption - (police + knf) * 3 + (CORRUPTION_BASE - oversight.corruption) * 0.1, 0, 100); // testy ogólne: bez gracza ~15–25
    oversight.pendingCorruption = 0;
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
            <div class="bank-ticker-item"><span>Wpływy mafii</span><strong>${typeof getMafiaStage === 'function' ? `${getMafiaStage().icon} ${getMafiaStage().name}` : '—'}</strong></div>
        </div>
        <div class="oversight-gauge"><span style="width:${oversight.corruption}%"></span></div>
        <div class="bank-grid mt-3">
            ${card('police', 'Policja', '🚓', 'Ściga korupcję i (wkrótce) mafię. Przy wysokiej korupcji sama staje się skorumpowana i działa gorzej.')}
            ${card('knf', 'Komisja Nadzoru Finansowego', '🏦', 'Kontroluje fundusze — im większy fundusz, tym częściej. Czysta kontrola podnosi zaufanie klientów.')}
        </div>
        ${oversight.corruption >= BRIBE_CORRUPTION_THRESHOLD ? `<p class="text-sm mt-3">💼 Przy tej korupcji komendant „bywa wyrozumiały”: <button class="btn-danger" onclick="bribePolice(); updateStateModalContent();">Łapówka (${formatZl(Math.max(2000, getFundAssets() * 0.01), 0)} z funduszu)</button> — spokój na ${BRIBE_IMMUNITY_QUARTERS} kw.</p>` : ''}
        <h4>Wojny PR</h4>
        ${typeof renderPrWars === 'function' ? renderPrWars() : ''}
        <h4>Ostatnie wykrycia</h4>
        <ul class="list-plain text-sm">${oversight.history.map(h => `<li>⚖️ ${escapeHtml(h.institution)}: ${escapeHtml(h.name)} — przewinienie nr ${h.strike}, kara ${formatZl(h.fine, 0)}</li>`).join('') || '<li class="text-muted">Brak.</li>'}</ul>`;
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
        return `<article class="grey-card"><h4>${s.icon} ${s.label}</h4><p class="text-sm text-muted">${s.desc}</p>
            <p class="text-xs">Koszt od ${formatZl(getGreyServiceCost(id), 0)} z funduszu · ryzyko: ${s.risk >= 25 ? 'wysokie' : 'średnie'}</p>
            <div class="bank-card-form">${form}<button class="btn-danger" onclick="${action}; renderGreyZone(); if (typeof displayCash === 'function') displayCash();">Zleć</button></div></article>`;
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
