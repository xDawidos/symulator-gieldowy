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
    { id: 'airport',    name: 'Port lotniczy',                 icon: '✈️', cost: 60e6, quarters: 8, sectors: ['Transport', 'Logistyka', 'Turystyka'], bonus: { growth: 0.010, valuation: 0.05, health: 0.4 } },
    { id: 'nuclear',    name: 'Elektrownia jądrowa',           icon: '☢️', cost: 80e6, quarters: 10, sectors: ['Energia', 'Przemysł'],                 bonus: { growth: 0.010, valuation: 0.06, health: 0.6 } },
    { id: 'metro',      name: 'Metro',                         icon: '🚇', cost: 50e6, quarters: 8, sectors: ['Transport', 'Nieruchomości'],          bonus: { growth: 0.008, valuation: 0.04, health: 0.3 } },
    { id: 'seaport',    name: 'Port morski',                   icon: '⚓', cost: 45e6, quarters: 7, sectors: ['Logistyka', 'Transport', 'Przemysł'],   bonus: { growth: 0.008, valuation: 0.04, health: 0.4 } },
    { id: 'research',   name: 'Centrum badawcze',              icon: '🔬', cost: 25e6, quarters: 5, sectors: ['Badania', 'Medycyna', 'Technologia'],  bonus: { growth: 0.006, valuation: 0.05, health: 0.3 } },
    { id: 'bridge',     name: 'Most nad rzeką',                icon: '🌉', cost: 20e6, quarters: 5, sectors: ['Transport', 'Logistyka', 'Budowlany'],  bonus: { growth: 0.004, valuation: 0.02, health: 0.2 } },
    { id: 'hospital',   name: 'Szpital kliniczny',             icon: '🏥', cost: 35e6, quarters: 6, sectors: ['Medycyna', 'Usługi'],                  bonus: { growth: 0.006, valuation: 0.04, health: 0.4 } },
    { id: 'techcampus', name: 'Kampus technologiczny',         icon: '💻', cost: 40e6, quarters: 6, sectors: ['Technologia', 'Gaming', 'Badania'],    bonus: { growth: 0.009, valuation: 0.05, health: 0.3 } },
    { id: 'expo',       name: 'Centrum wystawiennicze',        icon: '🏛️', cost: 22e6, quarters: 5, sectors: ['Usługi', 'Media', 'Dobra konsumpcyjne'], bonus: { growth: 0.005, valuation: 0.03, health: 0.2 } },
    { id: 'offshore',   name: 'Morska farma wiatrowa',         icon: '🌬️', cost: 55e6, quarters: 8, sectors: ['Energia', 'Chemia'],                   bonus: { growth: 0.009, valuation: 0.05, health: 0.4 } }
];

const TIMED_PROJECT_TEMPLATES = [
    { id: 'games',    name: 'Igrzyska akademickie',     icon: '🏅', cost: 6e6, quarters: 3, sectors: ['Usługi', 'Turystyka', 'Media'], bonus: { growth: 0.003, valuation: 0.01, health: 0.1 } },
    { id: 'climate',  name: 'Szczyt klimatyczny',       icon: '🌍', cost: 4e6, quarters: 2, sectors: ['Energia', 'Chemia', 'Usługi'],  bonus: { growth: 0.002, valuation: 0.015, health: 0.1 } },
    { id: 'techfest', name: 'Festiwal technologii',     icon: '🤖', cost: 5e6, quarters: 2, sectors: ['Technologia', 'Gaming'],        bonus: { growth: 0.003, valuation: 0.015, health: 0.1 } },
    { id: 'station',  name: 'Remont dworca głównego',   icon: '🚉', cost: 8e6, quarters: 3, sectors: ['Transport', 'Budowlany'],       bonus: { growth: 0.003, valuation: 0.01, health: 0.15 } },
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

function findBuilder(project) {
    const share = project.cost * BUILDER_SHARE;
    return stocks.filter(s => !s.assetType && !s.isBankrupt && s.sector?.includes('Budowlany') && s.cash >= share)
        .sort((a, b) => b.cash - a.cash)[0] || null;
}

/** Kandydaci do konsorcjum: spółki z pasujących sektorów (albo duże), z gotówką na wkład. */
function findConsortiumCandidates(project, exclude = []) {
    const minContribution = project.cost * 0.1;
    return stocks.filter(s => !s.assetType && !s.isBankrupt && !s.mergerProcess && !exclude.includes(s.symbol) && s.cash >= minContribution && !s.sector?.includes('Budowlany'))
        .map(s => ({ stock: s, score: (s.sector?.some(sec => project.sectors.includes(sec)) ? 2 : 1) * s.cash }))
        .sort((a, b) => b.score - a.score).map(c => c.stock);
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
    return `${(value / 1e6).toFixed(1)} mln zł`;
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
}

// =================================================================================
// CO KWARTAŁ
// =================================================================================

function processSpecialProjectsQuarterly() {
    ensureSpecialProjects();
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
    if (!(amount >= 100)) { showToast('Minimalna kwota obligacji: 100 zł.', 'warning'); return false; }
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
            <p class="text-sm">Koszt ${formatProjectMoney(project.cost)} · zebrano ${formatProjectMoney(funding)} · wykonawca: ${escapeHtml(project.builder?.name || '—')}</p>
            <p class="text-xs text-muted">Konsorcjum (${project.participants.length}/${MAX_CONSORTIUM_MEMBERS}): ${project.participants.map(p => `${p.player ? '⭐ ' : ''}${escapeHtml(p.name)}`).join(', ') || '—'}</p>
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
        <p class="bank-lead">Megaprojekty (${MEGA_PROJECTS.length}) można zrealizować tylko raz. Konsorcjum: do ${MAX_CONSORTIUM_MEMBERS} spółek + wykonawca budowlany; bonusy (wzrost przychodów, wycena, kondycja) dzielą się wg wkładu i przechodzą na spółkę przejmującą. Projekty czasowe są tańsze, bonus działa do ${MAX_TIMED_BONUS_QUARTERS / 4} lat gry. Spółka Twojego funduszu (> 50%) może dołączyć w fazie zapisów.</p>
        <h4>W realizacji</h4><div class="bank-grid">${active || '<p class="text-muted">Brak projektów w realizacji.</p>'}</div>
        <h4>Projekty czasowe</h4><div class="bank-grid">${offers || '<p class="text-muted">Brak ogłoszonych projektów czasowych.</p>'}</div>
        <h4>Dostępne megaprojekty</h4><ul class="list-plain text-sm project-list">${available || '<li class="text-muted">Wszystkie megaprojekty zostały podjęte.</li>'}</ul>
        <h4>Zrealizowane</h4><ul class="list-plain text-sm project-list">${completed || '<li class="text-muted">Jeszcze nic.</li>'}</ul>`;
}
