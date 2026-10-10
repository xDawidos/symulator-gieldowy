// relations.js — Relacje gracza z botami i zakładka „Firma” (wersja 0.10.2, część M4)
//
// Każdy bot — inwestor giełdowy (aiCompetitors) i kolega z korporacji (corporation.managers) — ma relację
// z graczem w skali −100…100. Reguły:
//   • wymuszenie dywidendy w spółce, gdzie bot ma > 1% akcji: −0,25 pkt za każdy % jego akcji;
//   • działanie na szkodę spółki, w której bot jest większościowcem (zrzut pakietu, wrogie przejęcie): −10;
//   • współpraca: prezent, wsparcie kursu (zakup pakietu), datek dla jego spółki — relacja rośnie;
//   • nadzór i konsolidacja funduszu kolegi, przeskoczenie go w ocenie zarządu — relacja spada.
// Relacje powoli wracają do zera. Wrogi bot (< −40) szydzi w mailach, wzmacnia pozycję w spółkach gracza,
// próbuje przejąć jego spółki i rozsiewa plotki. Przyjazny (> 40) nie przeszkadza, daje rady i pozytywne
// maile, czasem sprzedaje pakiet z rabatem.

const RELATION_HOSTILE = -40;
const RELATION_FRIENDLY = 40;
const RELATION_DECAY = 0.05;            // co kwartał 5% drogi do zera
const RELATION_LOG_LIMIT = 30;
const GIFT_RELATION_PER_100 = 1;        // +1 pkt za 100 zł prezentu
const GIFT_MAX_GAIN = 15;
const BOT_BLOCK_DISCOUNT = 0.05;

let botRelations = createBotRelations();

function createBotRelations() {
    return { values: {}, log: [], lastGift: {}, blockOffer: null };
}

function ensureBotRelations() {
    botRelations = { ...createBotRelations(), ...(botRelations || {}) };
    if (!Array.isArray(botRelations.log)) botRelations.log = [];
    return botRelations;
}

// =================================================================================
// UCZESTNICY I WARTOŚCI
// =================================================================================

/** Wszystkie osoby, z którymi gracz ma relacje: inwestorzy giełdowi i koledzy z firmy. */
function getRelationPeople() {
    const investors = aiCompetitors.filter(ai => ai.personality !== 'market_maker' && !ai.isMafia)
        .map(ai => ({ id: ai.id, name: ai.name, kind: 'investor', entity: ai }));
    const colleagues = (corporation?.managers || []).map(manager => ({ id: manager.id, name: manager.name, kind: 'colleague', entity: manager }));
    return [...colleagues, ...investors];
}

function findRelationPerson(id) {
    return getRelationPeople().find(person => person.id === id) || null;
}

function getRelation(id) {
    return Number(botRelations.values?.[id]) || 0;
}

function getRelationMood(value) {
    if (value <= -70) return { label: 'wróg', icon: '😡', cls: 'text-down' };
    if (value <= RELATION_HOSTILE) return { label: 'nieprzychylny', icon: '😠', cls: 'text-down' };
    if (value < -10) return { label: 'chłodny', icon: '😒', cls: 'text-muted' };
    if (value <= 10) return { label: 'neutralny', icon: '😐', cls: 'text-muted' };
    if (value < RELATION_FRIENDLY) return { label: 'życzliwy', icon: '🙂', cls: 'text-info' };
    if (value < 70) return { label: 'przyjazny', icon: '😊', cls: 'text-up' };
    return { label: 'sojusznik', icon: '🤝', cls: 'text-up' };
}

/** Zmiana relacji z wpisem do historii. */
function changeRelation(id, delta, reason) {
    ensureBotRelations();
    const person = findRelationPerson(id);
    if (!person || !Number.isFinite(delta) || Math.abs(delta) < 0.01) return 0;
    const before = getRelation(id);
    const after = Math.max(-100, Math.min(100, before + delta));
    botRelations.values[id] = after;
    botRelations.log.unshift({ id, name: person.name, delta: after - before, reason, at: typeof getMailClockMs === 'function' ? getMailClockMs() : Date.now() });
    botRelations.log.length = Math.min(botRelations.log.length, RELATION_LOG_LIMIT);
    return after - before;
}

/** Bot-inwestor z większością (> 50%) w spółce albo null. */
function getMajorityBot(stock) {
    const owner = findMajorityShareholder(stock);
    return owner?.kind === 'ai' ? owner.entity : null;
}

function getBotStakePct(ai, stock) {
    return (ai.portfolio?.[stock.symbol]?.shares || 0) / Math.max(1, stock.totalShares);
}

// =================================================================================
// REGUŁY (wołane z akcji gracza)
// =================================================================================

/** Wymuszenie dywidendy: −0,25 pkt za każdy % akcji bota (> 1%). */
function onPlayerForcedDividend(stock) {
    for (const ai of aiCompetitors) {
        const pct = getBotStakePct(ai, stock) * 100;
        if (pct > 1) changeRelation(ai.id, -0.25 * pct, `wymuszona dywidenda w ${stock.name}`);
    }
}

/** Handel funduszu: zrzut ≥ 1% akcji spółki bota szkodzi, zakup ≥ 0,5% wspiera jej kurs. */
function onFundTrade(stock, quantity, side) {
    const bot = getMajorityBot(stock);
    if (!bot) return;
    const pct = quantity / Math.max(1, stock.totalShares);
    if (side === 'sell' && pct >= 0.01) changeRelation(bot.id, -10, `zrzut pakietu ${stock.name}`);
    else if (side === 'buy' && pct >= 0.005) changeRelation(bot.id, 3, `wsparcie kursu ${stock.name}`);
}

/** Datek funduszu dla spółki bota. */
function onPlayerDonation(stock, amount) {
    const bot = getMajorityBot(stock);
    if (bot) changeRelation(bot.id, Math.min(10, amount / 500), `datek dla ${stock.name}`);
}

/** Spółka gracza (większość) atakuje spółkę bota — wrogie przejęcie to czyn na szkodę. */
function onTakeoverStartedRelations(initiator, target) {
    const bot = getMajorityBot(target);
    const playerControls = findMajorityShareholder(initiator)?.kind === 'player';
    if (bot && playerControls) changeRelation(bot.id, -10, `wrogie przejęcie ${target.name}`);
}

/** Koledzy z firmy: nadzór, konsolidacja, przeskoczenie w ocenie. */
function onColleagueEvent(managerId, kind) {
    const deltas = { supervise: -15, consolidate: -25, overtaken: -10 };
    const reasons = { supervise: 'przejęcie nadzoru nad jego funduszem', consolidate: 'konsolidacja jego funduszu', overtaken: 'zamiana stanowisk w ocenie zarządu' };
    if (deltas[kind]) changeRelation(managerId, deltas[kind], reasons[kind]);
}

/** Prezent z portfela prywatnego (współpraca). */
function giveGiftToBot(id, amount) {
    const person = findRelationPerson(id);
    amount = Math.floor(Number(amount));
    if (!person) return false;
    if (!(amount >= 100)) { showToast('Prezent: minimum 100 zł.', 'warning'); return false; }
    if (playerWallet.cash < amount) { showToast('Za mało pieniędzy w portfelu prywatnym.', 'error'); return false; }
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    if (botRelations.lastGift[id] === quarter) { showToast(`${person.name} dostał już prezent w tym kwartale.`, 'warning'); return false; }
    // B1: charaktery i malejący efekt — przyjaźni nie da się po prostu kupić.
    const personality = person.entity.personality;
    if (personality === 'calm') { showToast(`${person.name} grzecznie odmawia przyjęcia prezentu.`, 'default'); return false; }
    if (['whale', 'pro_investor'].includes(personality) && amount < 1000) { showToast(`${person.name} nie zauważa tak drobnych gestów (minimum 1000 zł).`, 'default'); return false; }
    playerWallet.cash -= amount;
    if (person.kind === 'investor') person.entity.cash += amount;
    else person.entity.fund.cash += amount;
    recordPayment('player-wallet', `external:${person.id}`, amount, `Prezent dla ${person.name}`);
    botRelations.lastGift[id] = quarter;
    botRelations.giftCount = botRelations.giftCount || {};
    const count = botRelations.giftCount[id] = (botRelations.giftCount[id] || 0) + 1;
    const raw = Math.min(GIFT_MAX_GAIN, amount / 100 * GIFT_RELATION_PER_100) * Math.pow(0.5, count - 1);
    const room = Math.max(0, 60 - getRelation(id)); // samymi prezentami najwyżej do 60
    const gain = changeRelation(id, Math.min(raw, room), 'prezent');
    showToast(`${person.name}: relacja ${gain >= 0 ? '+' : ''}${gain.toFixed(1)}.`, 'success');
    return true;
}

// =================================================================================
// CO KWARTAŁ: powrót do zera, zachowanie wrogich i przyjaznych botów, maile
// =================================================================================

function processRelationsQuarterly() {
    ensureBotRelations();
    botRelations.blockOffer = null; // oferta pakietu ważna do końca kwartału
    for (const id of Object.keys(botRelations.values)) {
        botRelations.values[id] *= 1 - RELATION_DECAY;
        if (Math.abs(botRelations.values[id]) < 0.5) delete botRelations.values[id];
    }
    if (!playerFund) return;
    for (const person of getRelationPeople()) {
        const value = getRelation(person.id);
        if (value <= RELATION_HOSTILE) runHostileBot(person, value);
        else if (value >= RELATION_FRIENDLY) runFriendlyBot(person, value);
    }
}

/** Spółki, w których fundusz ma udziały (najpierw większościowe). */
function getPlayerCompanies() {
    return stocks.filter(s => !s.assetType && !s.isBankrupt && (playerPortfolio[s.symbol]?.shares || 0) > 0)
        .sort((a, b) => getFundStakePct(b) - getFundStakePct(a));
}

function runHostileBot(person, value) {
    const roll = Math.random();
    if (roll < 0.35) sendBotMail(person, 'hostile');
    if (person.kind !== 'investor') return;
    const ai = person.entity;
    const companies = getPlayerCompanies();
    if (!companies.length) return;

    // Wzmacnia pozycję w spółkach, gdzie gracz ma udziały.
    if (Math.random() < 0.5) {
        const target = getRandomElement(companies.slice(0, 5));
        const quantity = Math.floor(Math.min(getAvailableShares(target), ai.cash * 0.2 / Math.max(0.01, target.price)));
        if (quantity > 0) {
            aiBuyStock(ai, target.symbol, quantity);
            logEvent(`😠 ${ai.name} skupuje akcje ${target.name}, by osłabić pozycję Twojego funduszu.`, 'review');
        }
    }
    // Próba przejęcia spółki gracza przez spółkę kontrolowaną przez bota.
    const playerMajority = companies.filter(s => getFundStakePct(s) > 0.5 && !s.mergerProcess);
    const botCompanies = stocks.filter(s => !s.assetType && !s.mergerProcess && !s.isBankrupt && getMajorityBot(s) === ai);
    if (playerMajority.length && botCompanies.length && Math.random() < (value <= -70 ? 0.4 : 0.15)) {
        const target = getRandomElement(playerMajority);
        const initiator = botCompanies.sort((a, b) => b.cash - a.cash)[0];
        if (initiator.cash >= getMarketCapValue(target) * 1.3) {
            logEvent(`⚔️ ${ai.name} przez ${initiator.name} rusza na Twoją spółkę ${target.name}!`, 'review');
            initiateMergerProcess(initiator, target, 'przejęcie', 'cash', 0.2);
        }
    }
    // Plotki przez „gazetę anty-gracz”.
    if (value <= -60 && Math.random() < 0.25) {
        const target = companies[0];
        applyPriceEffect(target.symbol, -0.03, 'negative', 'company');
        logEvent(`🗞️ Plotka: „${target.name} ukrywa straty” — źródło podobno blisko ${ai.name}. Kurs ${target.name} spada.`, 'company');
    }
}

function runFriendlyBot(person, value) {
    if (Math.random() < 0.3) sendBotMail(person, Math.random() < 0.6 ? 'tip' : 'friendly');
    if (person.kind === 'investor' && value >= 60 && !botRelations.blockOffer && Math.random() < 0.2) offerBotBlock(person.entity);
}

// =================================================================================
// MAILE BOTÓW
// =================================================================================

function getBotSender(person) {
    return `bot:${person.id}`;
}

function getBotTip() {
    const undervalued = stocks.filter(s => !s.assetType && !s.isBankrupt && s.fundamentals?.fairValue > s.price * 1.3 && s.fundamentals.fairValue < s.price * 4)
        .sort((a, b) => b.fundamentals.fairValue / b.price - a.fundamentals.fairValue / a.price)[0];
    if (undervalued && Math.random() < 0.6) {
        return { text: `Przyjrzyj się ${undervalued.name} (${undervalued.symbol}). Moim zdaniem rynek wycenia ją dużo poniżej wartości — kupuję po cichu.`, symbol: undervalued.symbol };
    }
    const turning = Object.entries(macro?.sectorCycles || {}).find(([, cycle]) => cycle.phase === 'trough' && cycle.quartersLeft <= 1);
    if (turning) return { text: `Słyszę od ludzi z branży, że sektor ${turning[0]} lada moment odbije. Warto mieć tam pozycję.`, symbol: null };
    return { text: 'Na rynku nic pewnego, ale trzymaj trochę gotówki — przed posiedzeniem BC bywa nerwowo.', symbol: null };
}

function getHostileLine(person) {
    const fundReturn = playerFund ? getPeriodReturn(playerFund.current.startNav, getFundNav()) : 0;
    const benchmark = playerFund ? getPeriodReturn(playerFund.current.startBenchmark, getBenchmarkValue()) : 0;
    const lines = [
        `Wynik ${(fundReturn * 100).toFixed(1)}% przy GIG ${(benchmark * 100).toFixed(1)}%? Gratuluję — moja babcia z lokatą ma lepiej.`,
        'Widziałem Twoje ostatnie transakcje. Kupujesz drogo, sprzedajesz tanio — to jakaś nowa strategia?',
        'Twoi klienci już pytają mnie o przeniesienie środków. Mam dla nich miejsce.',
        'Zarządzanie funduszem to nie loteria. Choć patrząc na Twój portfel, chyba myślisz inaczej.',
        'Kwestionuję każdą Twoją decyzję na ostatnim walnym. I zapamiętam to przy następnym.',
        'Nie martw się, jak zbankrutujesz, odkupię Twoje pakiety za grosze.'
    ];
    return getRandomElement(lines);
}

function sendBotMail(person, kind) {
    if (typeof addMail !== 'function') return null;
    if (kind === 'hostile') {
        return addMail({ sender: getBotSender(person), subject: `😠 ${person.name}: ${getRandomElement(['słówko o Twoich wynikach', 'serio?', 'kilka uwag', 'do zarządzającego'])}`, body: getHostileLine(person), importance: 1 });
    }
    if (kind === 'tip') {
        const tip = getBotTip();
        return addMail({ sender: getBotSender(person), subject: `💡 ${person.name}: dobra rada`, body: tip.text, importance: 2, symbol: tip.symbol });
    }
    return addMail({ sender: getBotSender(person), subject: `🙂 ${person.name}`, body: getRandomElement([
        'Dobra robota w tym kwartale. Rynek zauważa Twój fundusz.',
        'Jeśli będziesz potrzebować partnera przy większym pakiecie — daj znać.',
        'Szacunek za ostatnie decyzje. Nie wchodzę Ci w drogę.'
    ]), importance: 1 });
}

// =================================================================================
// PAKIET Z RABATEM OD PRZYJAZNEGO BOTA
// =================================================================================

function offerBotBlock(ai) {
    const holdings = Object.entries(ai.portfolio || {})
        .map(([symbol, holding]) => ({ stock: stocks.find(s => s.symbol === symbol), shares: holding.shares }))
        .filter(item => item.stock && !item.stock.assetType && !item.stock.isBankrupt && item.shares > 0 && canAccessExchange(item.stock.exchange));
    if (!holdings.length) return null;
    const pick = getRandomElement(holdings);
    const shares = Math.max(1, Math.floor(Math.min(pick.shares * 0.5, pick.stock.totalShares * 0.03)));
    const price = pick.stock.price * (1 - BOT_BLOCK_DISCOUNT);
    botRelations.blockOffer = { aiId: ai.id, symbol: pick.stock.symbol, shares, price };
    addMail({
        sender: `bot:${ai.id}`, subject: `🤝 ${ai.name}: pakiet ${pick.stock.symbol} dla Ciebie`,
        body: `Mogę odstąpić Twojemu funduszowi ${shares.toLocaleString('pl-PL')} akcji ${pick.stock.name} po ${price.toFixed(2)} zł (${(BOT_BLOCK_DISCOUNT * 100).toFixed(0)}% poniżej rynku). Oferta ważna do końca kwartału.`,
        importance: 2, symbol: pick.stock.symbol, action: { type: 'botBlock', symbol: pick.stock.symbol }
    });
    return botRelations.blockOffer;
}

function acceptBotBlock() {
    const offer = botRelations.blockOffer;
    const ai = offer && aiCompetitors.find(a => a.id === offer.aiId);
    const stock = offer && stocks.find(s => s.symbol === offer.symbol);
    const holding = ai?.portfolio?.[offer?.symbol];
    if (!offer || !ai || !stock || !holding || holding.shares < offer.shares) { showToast('Oferta pakietu jest nieaktualna.', 'default'); botRelations.blockOffer = null; return false; }
    const cost = offer.shares * offer.price;
    if (playerCash < cost) { showToast('Za mało gotówki funduszu.', 'error'); return false; }
    playerCash -= cost;
    ai.cash += cost;
    holding.shares -= offer.shares;
    if (holding.shares <= 0) delete ai.portfolio[offer.symbol];
    const target = playerPortfolio[offer.symbol] || (playerPortfolio[offer.symbol] = { shares: 0, avgPrice: 0, assetType: 'stock' });
    target.avgPrice = (target.avgPrice * target.shares + cost) / (target.shares + offer.shares);
    target.shares += offer.shares; // sharesHeld bez zmian — akcje zmieniają właściciela
    recordPayment('player-fund', `external:${ai.id}`, cost, `Pakiet ${offer.symbol} od ${ai.name}`);
    changeRelation(ai.id, 3, `zakup pakietu ${offer.symbol}`);
    logEvent(`🤝 Fundusz odkupuje od ${ai.name} ${offer.shares.toLocaleString('pl-PL')} akcji ${stock.name} z rabatem.`, 'review');
    botRelations.blockOffer = null;
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

// =================================================================================
// ZAKŁADKA „FIRMA”: hierarchia, szef, targety
// =================================================================================

/** Bezpośredni przełożony: najniżej postawiona osoba powyżej gracza. */
function getPlayerBoss() {
    const myLevel = getPositionIndex(playerProfile.positionId);
    const above = (corporation?.managers || []).filter(m => getPositionIndex(m.positionId) > myLevel)
        .sort((a, b) => getPositionIndex(a.positionId) - getPositionIndex(b.positionId));
    if (above.length) return { kind: 'colleague', id: above[0].id, name: above[0].name, positionId: above[0].positionId, opinion: getRelation(above[0].id) * 0.6 + (corporation.boardReputation - 50) * 0.8 };
    return { kind: 'board', id: null, name: 'Rada nadzorcza korporacji', positionId: null, opinion: (corporation.boardReputation - 50) * 2 };
}

/** Cele okresu z postępem (0–1). */
function getPlayerTargets() {
    if (!playerFund) return [];
    const fundReturn = getPeriodReturn(playerFund.current.startNav, getFundNav());
    const benchmark = getPeriodReturn(playerFund.current.startBenchmark, getBenchmarkValue());
    const takeovers = getTakeoverProgress();
    const hurdle = Math.max(getDepositRate(), macro?.inflation || 0) * (playerFund.current.elapsedMs / (BASE_DELAYS.quarterly * 4));
    return [
        { label: 'Pobij GIG w tym okresie', value: `${((fundReturn - benchmark) * 100).toFixed(1)} pkt proc.`, progress: Math.max(0, Math.min(1, 0.5 + (fundReturn - benchmark) * 10)), done: fundReturn > benchmark },
        { label: 'Wynik powyżej lokaty i inflacji', value: `${(fundReturn * 100).toFixed(1)}% vs ${(hurdle * 100).toFixed(1)}%`, progress: hurdle > 0 ? Math.max(0, Math.min(1, fundReturn / hurdle)) : 1, done: fundReturn >= hurdle },
        { label: 'Zaufanie klientów ≥ 60', value: `${playerFund.trust.toFixed(0)}/100`, progress: Math.min(1, playerFund.trust / 60), done: playerFund.trust >= 60 },
        { label: `Ocena zarządu ≥ ${PROMOTION_SCORE} (awans)`, value: corporation.lastPlayerScore !== null ? `${Math.round(corporation.lastPlayerScore)}/100` : 'brak oceny', progress: Math.min(1, (corporation.lastPlayerScore || 0) / PROMOTION_SCORE), done: (corporation.lastPlayerScore || 0) >= PROMOTION_SCORE },
        { label: 'Przejęcia firm zarządzających', value: `${takeovers.done}/${takeovers.required}`, progress: takeovers.done / Math.max(1, takeovers.required), done: takeovers.done >= takeovers.required }
    ];
}

function renderRelationBar(value) {
    const left = value < 0 ? 50 + value / 2 : 50;
    const width = Math.abs(value) / 2;
    return `<span class="rel-bar"><span class="rel-bar-fill ${value < 0 ? 'neg' : 'pos'}" style="left:${left}%;width:${width}%"></span></span>`;
}

function renderCorporationFirm() {
    ensureBotRelations();
    const boss = getPlayerBoss();
    const bossMood = getRelationMood(boss.opinion);
    const positions = [...CAREER_POSITIONS].reverse();
    const hierarchy = positions.map(position => {
        const people = [
            ...(playerProfile.positionId === position.id ? [`<strong>${escapeHtml(playerProfile.name)} (Ty)</strong>`] : []),
            ...corporation.managers.filter(m => m.positionId === position.id).map(m => `${getRelationMood(getRelation(m.id)).icon} ${escapeHtml(m.name)}`)
        ];
        return `<div class="firm-level ${playerProfile.positionId === position.id ? 'mine' : ''}"><span class="firm-level-name">${escapeHtml(position.name)}</span><span>${people.join(' · ') || '<span class="text-muted">—</span>'}</span></div>`;
    }).join('');
    const targets = getPlayerTargets().map(t => `
        <li class="firm-target ${t.done ? 'done' : ''}"><span>${t.done ? '✅' : '🎯'} ${escapeHtml(t.label)}</span><strong>${escapeHtml(t.value)}</strong>
        <span class="firm-target-bar"><span style="width:${(t.progress * 100).toFixed(0)}%"></span></span></li>`).join('');
    const relations = getRelationPeople().map(person => {
        const value = getRelation(person.id);
        const mood = getRelationMood(value);
        return `<tr><td>${escapeHtml(person.name)}<span class="text-xs text-muted d-block">${person.kind === 'colleague' ? `kolega · ${escapeHtml(CAREER_POSITIONS[getPositionIndex(person.entity.positionId)].name)}` : 'inwestor giełdowy'}</span></td>
            <td>${renderRelationBar(value)}</td><td class="${mood.cls}">${mood.icon} ${value.toFixed(0)} · ${mood.label}</td>
            <td><div class="d-flex gap-1"><input type="text" inputmode="numeric" class="w-xs" id="gift-${person.id}" value="200" aria-label="Kwota prezentu">
                <button class="btn-xs" onclick="corporationAction(giveGiftToBot, '${person.id}', parseFloat(document.getElementById('gift-${person.id}').value))">🎁</button></div></td></tr>`;
    }).join('');
    const log = botRelations.log.slice(0, 8).map(entry => `<li><span class="${entry.delta >= 0 ? 'text-up' : 'text-down'}">${entry.delta >= 0 ? '+' : ''}${entry.delta.toFixed(1)}</span> ${escapeHtml(entry.name)} — ${escapeHtml(entry.reason)}</li>`).join('');

    return `
        <div class="firm-grid">
            <section><h4>Hierarchia</h4><div class="firm-hierarchy">${hierarchy}</div></section>
            <section>
                <h4>Szef</h4>
                <div class="firm-boss"><strong>${escapeHtml(boss.name)}</strong>${boss.positionId ? `<span class="text-xs text-muted">${escapeHtml(CAREER_POSITIONS[getPositionIndex(boss.positionId)].name)}</span>` : ''}
                    <span class="${bossMood.cls}">${bossMood.icon} ${boss.opinion >= RELATION_FRIENDLY ? 'lubi Cię' : boss.opinion <= RELATION_HOSTILE ? 'nie lubi Cię' : boss.opinion > 10 ? 'ma o Tobie dobre zdanie' : boss.opinion < -10 ? 'ma zastrzeżenia' : 'jest neutralny'} (${boss.opinion.toFixed(0)})</span></div>
                <h4>Targety</h4><ul class="list-plain firm-targets">${targets}</ul>
            </section>
        </div>
        <h4>Relacje (−100…100)</h4>
        <p class="fund-muted">Wymuszanie dywidend, zrzucanie pakietów i ataki na spółki botów psują relacje; prezenty (portfel prywatny, raz na kwartał), wspieranie ich spółek (zakup pakietu, datek) i odkupienie pakietu — poprawiają. Wrodzy boty szydzą, skupują akcje Twoich spółek i próbują je przejąć; przyjaźni dają rady i pakiety z rabatem.</p>
        <table class="asset-mini-table w-full"><thead><tr><th>Osoba</th><th>Relacja</th><th></th><th>Prezent (zł)</th></tr></thead><tbody>${relations}</tbody></table>
        <h4>Ostatnie zmiany</h4><ul class="list-plain text-sm">${log || '<li class="text-muted">Brak zmian.</li>'}</ul>`;
}
