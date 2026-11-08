// =================================================================================
// 0.17.2 E2, E10: widoki energetyki wg plany/design/11_energia_0.17.2.md (klasy .en-*, wzorce gry)
// =================================================================================

const ENERGY_ICONS = { coal: 'surowiec-coal', gas: 'surowiec-gas', nuclear: 'atom', oze: 'wiatrak' };
const ENERGY_BASE_PRICE = 400; // PLN/MWh przy cenie 1 i poziomie cen 1
const ENERGY_BLOCK_NAMES = { coal: 'Blok węglowy', gas: 'Blok gazowy', oze: 'Farma OZE' };
const POLLUTION_WORDS = ['bardzo niskie', 'niskie', 'umiarkowane', 'wysokie', 'krytyczne'];
const LIFE_WORDS = ['bardzo niski', 'niski', 'przeciętny', 'wysoki', 'bardzo wysoki'];
const OPINION_WORDS = ['bardzo nieprzychylna', 'nieprzychylna', 'neutralna', 'przychylna', 'bardzo przychylna'];
const UEIE_LEVELS = [['Bez limitów', 'brak pomiaru'], ['Pomiar kraju', 'bez limitów'], ['Pomiar spółek', 'limit, kara'], ['Częstsze kontrole', 'ścieżka ESG'], ['Dokładny pomiar', 'wyższe kary'], ['Pełny nadzór', 'najwyższa skuteczność']];
const LIFE_ICONS = { consumption: 'koszyk', health: 'serce', safety: 'tarcza', education: 'akademia', information: 'news' };
const LIFE_WEAK = { consumption: 'niskie płace albo słabe zadowolenie', health: 'obniża zanieczyszczenie', safety: 'słabe służby albo obronność', education: 'mało nauki', information: 'korupcja i skandale' };

const formatGw = mw => (Number(mw) || 0) < 1000 ? `${formatNumberPl(Number(mw) || 0, 0)} MW` : `${formatNumberPl((Number(mw) || 0) / 1000, 1)} GW`; // 0.17.1 U4: mały blok w MW, nie „0,0 GW”
const scoreWord = (value, words) => words[Math.min(words.length - 1, Math.floor(clampValue(value, 0, 99.99) / 20))];
const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);
const signed = (value, digits = 0) => `${value >= 0 ? '▲ +' : '▼ −'}${formatNumberPl(Math.abs(value), digits)}`;
const getEnergyPricePln = (price = society.energy.price) => Math.round(price * ENERGY_BASE_PRICE * (Number(society.priceLevel) || 1));
const getTypePricePln = (type, e = society.energy) => Math.round(getEnergyTypeCost(type, e) / e.price0 * ENERGY_BASE_PRICE * (Number(society.priceLevel) || 1));

/** Stan bilansu do plakietki i alertu. */
function getEnergyBalanceState(e = society.energy) {
    const quarter = getEnergyQuarter();
    if (e.blackoutUntil >= quarter) return { id: 'blackout', label: 'Blackout', badge: 'down', icon: 'blackout' };
    if (getEnergyShortage(e) > 0) return { id: 'short', label: 'Niedobór', badge: 'warn', icon: 'alert' };
    if (getEnergyReserve(e) < 1.02) return { id: 'even', label: 'Równowaga', badge: 'neutral', icon: 'waga' };
    return { id: 'surplus', label: 'Nadwyżka', badge: 'up', icon: 'ok' };
}

function renderEnergyMixCard(e) {
    const mix = getEnergyMix(e), total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
    const share = type => mix[type] / total * 100;
    const label = ENERGY_TYPE_IDS.map(type => `${ENERGY_TYPES[type].name.toLowerCase()} ${formatNumberPl(share(type), 0)}%`).join(', ');
    const segments = ENERGY_TYPE_IDS.filter(type => mix[type] > 0).map(type => `<span class="en-t-${type}" style="flex:${share(type).toFixed(1)}">${share(type) >= 8 ? ENERGY_TYPES[type].name : ''}</span>`).join('');
    const legend = ENERGY_TYPE_IDS.map(type => `<li class="en-t-${type}">${uiIcon(ENERGY_ICONS[type], 16)}<span>${ENERGY_TYPES[type].name}</span><b>${formatNumberPl(share(type), 0)}%</b><small>${formatGw(mix[type])}</small></li>`).join('');
    return `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('prad', 20)}</span><div><h4>Miks energetyczny</h4><span class="bank-card-type">udział w mocy kraju</span></div></header>
        <div class="en-mix" role="img" aria-label="Miks: ${label}">${segments}</div><ul class="en-legend">${legend}</ul></article>`;
}
function renderEnergyBalanceCard(e) {
    const state = getEnergyBalanceState(e), use = e.capacity > 0 ? e.demand / e.capacity * 100 : 0, reserve = Math.round(100 - use);
    const note = state.id === 'short' ? `niedobór ${formatGw(e.demand - e.capacity)}` : state.id === 'blackout' ? `zużycie ${formatNumberPl(use, 0)}% mocy` : `rezerwa ${reserve}%`;
    const meter = renderLimitMeter(Math.min(110, use) / 110 * 100, 100 / 110 * 100, `Zużycie ${formatNumberPl(use, 0)}% mocy, kreska na 100% mocy`, use > 100).replace('limit-meter', 'limit-meter en-wide');
    return `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('waga', 20)}</span><div><h4>Bilans prądu</h4><span class="bank-card-type">zużycie wobec mocy</span></div></header>
        <div class="en-state"><span class="badge badge--${state.badge}">${uiIcon(state.icon, 12)} ${state.label}</span> ${note}</div>${meter}
        <p class="text-sm">Zużycie ${formatNumberPl(use, 0)}% mocy. Kreska: cała moc kraju.</p>
        <p class="text-sm text-muted">Niedobór pokrywa tylko budowa nowych bloków albo wyższa cena. Handlu prądem z innymi krajami nie ma.</p></article>`;
}
function renderEnergyPriceCard(e) {
    const mix = getEnergyMix(e), total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
    const rows = ENERGY_TYPE_IDS.map(type => `<tr><td>${ENERGY_TYPES[type].name}</td><td class="text-right">${formatNumberPl(mix[type] / total * 100, 0)}%</td><td class="text-right">${formatNumberPl(getTypePricePln(type, e), 0)} PLN</td></tr>`).join('');
    const suppliers = Number(society.laws.energySuppliers), texts = ['cena rynkowa', 'cena z limitem', 'cena niższa, dopłaca budżet'];
    return `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('moneta', 20)}</span><div><h4>Cena prądu</h4><span class="bank-card-type">udział × koszt typu</span></div></header>
        <table class="asset-mini-table w-full"><tbody>${rows}</tbody></table>
        <p class="text-sm">Ustawa „Dostawcy energii”: <strong>${escapeHtml(SOCIAL_LAWS.energySuppliers.levels[suppliers].toLowerCase())}</strong>, ${texts[suppliers]}.</p></article>`;
}
/** Wiersze budów: spółki, atom i projekty państwa. */
function getEnergyBuildRows() {
    const quarter = getEnergyQuarter(), rows = [];
    for (const stock of stocks) {
        if (stock.isBankrupt) continue;
        const build = stock.power?.build;
        if (build) {
            const done = build.quarters - Math.max(0, build.dueQ - quarter);
            rows.push({ type: build.type || stock.power.type, title: stock.name, text: `budowa, kw. ${done} z ${build.quarters} · +${formatGw(build.add)}`, progress: done / build.quarters * 100, badge: 'Budowa', tone: 'accent' });
        }
        const block = stock.nuclearBlock;
        if (block && block.stage !== 'operating') {
            const done = block.quarters - Math.max(0, block.dueQuarter - quarter), wait = block.stage === 'approval';
            rows.push({ type: 'nuclear', title: `${stock.name}, blok ${(Number(stock.nuclearUnits) || 0) + 1}`, text: wait ? 'czeka na zgodę UEiE' : `budowa, kw. ${Math.max(0, done)} z ${block.quarters}`, progress: wait ? 100 : done / block.quarters * 100, badge: wait ? 'Czeka na zgodę' : 'Budowa', tone: wait ? 'warn' : 'accent' });
        }
    }
    for (const project of society.infra?.projects || []) {
        const def = INFRA_TYPES[project.type];
        if (!def?.energy || (project.status !== 'tender' && project.status !== 'build')) continue;
        rows.push({ type: def.energy, title: `Projekt państwowy: ${def.name.toLowerCase()}`, text: `limit typu: ${countInfraObjects(project.type)} z ${def.limit}`, badge: project.status === 'tender' ? 'Przetarg' : 'Budowa', tone: project.status === 'tender' ? 'neutral' : 'accent' });
    }
    return rows;
}
function renderEnergyBuildCard() {
    const rows = getEnergyBuildRows();
    const list = rows.length ? `<ul class="en-rows">${rows.map(row => `<li class="en-t-${row.type}">${uiIcon(ENERGY_ICONS[row.type], 16)}<span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.text)}</small></span><span class="badge badge--${row.tone}">${row.badge}</span>${Number.isFinite(row.progress) ? renderLimitMeter(row.progress, null, `Postęp ${Math.round(row.progress)}%`) : ''}</li>`).join('')}</ul>`
        : '<p class="text-sm text-muted">Żadna spółka nie buduje teraz nowych bloków. Budowy ruszają przy niedoborze mocy i wysokiej cenie prądu.</p>';
    return `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('blok', 20)}</span><div><h4>Bloki w budowie</h4><span class="bank-card-type">spółki i państwo</span></div></header>${list}</article>`;
}
function getEmissionShare(stock, e = society.energy) { return e.emissions > 0 ? getStockEmissions(stock) / e.emissions : 0; }
function renderPollutionCard(e) {
    const level = getEnergyOfficeLevel(), head = (type) => `<header class="bank-card-head"><span class="bank-card-icon">${uiIcon('emisje', 20)}</span><div><h4>Zanieczyszczenie</h4><span class="bank-card-type">UEiE poziom ${level} · ${type}</span></div></header>`;
    if (!canSeeCountryEmissions()) return `<article class="bank-card">${head('brak pomiaru')}<p class="notice-inline">${uiIcon('info', 14)}<span>Urząd nie mierzy emisji i nie ma limitów. Pomiar pojawi się od poziomu 1.</span></p></article>`;
    const value = e.pollution, word = scoreWord(value, POLLUTION_WORDS), high = value >= 60, change = value - (Number(e.pollutionLast) ?? value);
    const limit = level >= ENERGY_OFFICE_RULES.companyLevel ? `Limit emisyjności spółki: ${formatNumberPl(getEmissionLimit(e), 2)}.` : 'Limitów jeszcze nie ma.';
    const top = (typeof isDebugMode === 'function' && isDebugMode()) || level >= ENERGY_OFFICE_RULES.companyLevel
        ? `<h5 class="mb-1">Najwięksi emitenci</h5><ul class="en-rows">${stocks.filter(stock => !stock.isBankrupt && getStockEmissions(stock) > 0).sort((a, b) => getStockEmissions(b) - getStockEmissions(a)).slice(0, 3).map(stock => `<li>${uiIcon(stock.power ? ENERGY_ICONS[stock.power.type] : 'emisje', 16)}<span>${escapeHtml(stock.name)}</span><strong>${formatNumberPl(getEmissionShare(stock, e) * 100, 0)}%</strong></li>`).join('')}</ul>` : '';
    const debug = !level ? `<p class="notice-inline is-warn">${uiIcon('alert', 14)}<span>Tryb debug: emisje widoczne mimo braku pomiaru.</span></p>` : '';
    return `<article class="bank-card">${head(level >= 4 ? 'pomiar dokładny' : 'pomiar')}${debug}
        <div class="en-state"><span class="en-value">${Math.round(value)}<small> /100</small></span><span class="badge badge--${high ? 'warn' : 'neutral'}">${high ? uiIcon('alert', 12) : ''} ${capitalize(word)}</span> ${signed(change)} w kwartale</div>
        ${renderLimitMeter(value, null, `Zanieczyszczenie ${Math.round(value)} na 100`, high).replace('limit-meter', 'limit-meter en-wide')}
        <p class="text-sm">${limit} Polityka klimatyczna: ${escapeHtml(SOCIAL_LAWS.climatePolicy.levels[Number(society.laws.climatePolicy)].toLowerCase())}, opłata ${formatNumberPl(getClimateFee() * 100, 1)}% przychodów × emisje.</p>${top}</article>`;
}
function renderLifeCard(e) {
    const factors = getLifeFactors(e), life = Number(e.life) || 0, hist = e.lifeHist || [], change = hist.length > 1 ? hist[hist.length - 1] - hist[hist.length - 2] : 0;
    const hideHealth = !getEnergyOfficeLevel() && !(typeof isDebugMode === 'function' && isDebugMode());
    const rows = LIFE_RULES.factors.map(id => {
        const value = factors[id], name = LIFE_NAMES[id];
        if (id === 'health' && hideHealth) return `<li>${uiIcon(LIFE_ICONS[id], 16)}<span>${name}</span><strong class="en-num">brak pomiaru</strong><small>Pojawi się od poziomu 1 UEiE.</small></li>`;
        const weak = value < 50;
        return `<li${weak ? ' class="is-warn"' : ''}>${uiIcon(LIFE_ICONS[id], 16)}<span>${name}</span><strong class="en-num">${Math.round(value)}</strong>${renderLimitMeter(value, null, `${Math.round(value)} na 100${weak ? `, ${LIFE_WEAK[id]}` : ''}`, weak)}${weak ? `<small>${LIFE_WEAK[id]}</small>` : ''}</li>`;
    }).join('');
    const word = scoreWord(life, LIFE_WORDS);
    return `<article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('poziom-zycia', 20)}</span><div><h4>Poziom życia</h4><span class="bank-card-type">5 czynników po 20%</span></div></header>
        <div class="en-state"><span class="en-value">${Math.round(life)}<small> /100</small></span><span class="badge badge--${life >= 60 ? 'up' : life < 40 ? 'warn' : 'neutral'}">${capitalize(word)}</span> ${signed(change)} w kwartale</div>
        <ul class="en-factors">${rows}</ul></article>`;
}
function renderEnergyAlerts(e) {
    const state = getEnergyBalanceState(e), alerts = [];
    if (state.id === 'blackout') alerts.push(['blackout', 'Blackout.', 'Przemysł traci przychody, zadowolenie spada. Skutki trwają do końca kwartału.']);
    else if (state.id === 'short') alerts.push(['alert', `Niedobór mocy: ${formatGw(e.demand - e.capacity)}.`, `Zużycie ${formatNumberPl(e.demand / e.capacity * 100, 0)}% mocy. Cena prądu rośnie, a przy większym niedoborze grozi blackout.`]);
    if (canSeeCountryEmissions() && e.pollution >= 80) alerts.push(['emisje', `Zanieczyszczenie krytyczne: ${Math.round(e.pollution)}/100.`, `Spada poziom życia i przyrost ludności, a produkcja spółek jest niższa o ${formatNumberPl(getPollutionProductionCut(e) * 100, 1)}%.`]);
    return alerts.map(([icon, title, text]) => `<p class="alert alert--warn">${uiIcon(icon, 18)}<span><strong>${title}</strong> ${text}</span></p>`).join('');
}
/** Państwo → Energia. */
function renderEnergyPanel() {
    if (!hasEnergyState()) return '<p class="text-sm text-muted">Dane pojawią się po pierwszym kwartale gry.</p>';
    const e = society.energy, balance = e.capacity - e.demand, hist = e.hist, last = hist.length > 1 ? hist[hist.length - 1] / hist[hist.length - 2] - 1 : 0;
    const showPollution = canSeeCountryEmissions();
    return `<div class="bank-ticker">
            <div class="bank-ticker-item"><span>Moc kraju</span><strong>${formatGw(e.capacity)}</strong></div>
            <div class="bank-ticker-item"><span>Zużycie</span><strong>${formatGw(e.demand)}</strong></div>
            <div class="bank-ticker-item"><span>Bilans</span><strong class="${balance >= 0 ? 'text-up' : 'text-down'}">${balance >= 0 ? '▲ +' : '▼ −'}${formatGw(Math.abs(balance))}</strong></div>
            <div class="bank-ticker-item"><span>Cena prądu</span><strong>${formatNumberPl(getEnergyPricePln(), 0)} PLN/MWh</strong><small class="text-muted">${signed(last * 100)}% w kwartale</small></div>
            <div class="bank-ticker-item"><span>Zanieczyszczenie</span><strong>${showPollution ? `${Math.round(e.pollution)}/100` : 'brak pomiaru'}</strong></div>
            <div class="bank-ticker-item"><span>Poziom życia</span><strong>${Math.round(e.life || 0)}/100</strong></div>
        </div>
        ${renderEnergyAlerts(e)}
        <div class="bank-grid mt-3">${renderEnergyMixCard(e)}${renderEnergyBalanceCard(e)}${renderEnergyPriceCard(e)}</div>
        <div class="bank-grid mt-3">${renderEnergyBuildCard()}${renderPollutionCard(e)}${renderLifeCard(e)}</div>`;
}

/** Nadzór: oś poziomów UEiE. */
function renderEnergyOfficeLevels() {
    const now = getEnergyOfficeLevel();
    const steps = UEIE_LEVELS.map(([name, note], i) => `<li class="${i === now ? 'current' : i < now ? 'done' : ''}"${i === now ? ' aria-current="step"' : ''}><span class="crisis-step-no">${i}</span>${name}${i === now ? ' <em>(teraz)</em>' : ''}<small>${note}</small></li>`).join('');
    return `<div class="crisis-section mt-3"><h4 class="bank-section-title">Poziomy urzędu</h4><ol class="crisis-axis en-levels" aria-label="Poziomy UEiE">${steps}</ol></div>`;
}
/** Kraj: oś polityki klimatycznej. */
function renderClimateLawSteps() {
    const law = SOCIAL_LAWS.climatePolicy, now = Number(society.laws.climatePolicy);
    const steps = law.levels.map((name, i) => `<li class="${i === now ? 'current' : i < now ? 'done' : ''}"${i === now ? ' aria-current="step"' : ''}><span class="crisis-step-no">${i + 1}</span>${escapeHtml(name)}${i === now ? ' <em>(teraz)</em>' : ''}<small>opłata ${formatNumberPl(CLIMATE_FEES[i] * 100, 1)}%</small></li>`).join('');
    return `<div class="crisis-section mt-3"><h4 class="bank-section-title">${escapeHtml(law.name)}</h4><ol class="crisis-axis law-steps" aria-label="Poziomy ustawy">${steps}</ol></div>`;
}
/** Kraj: linie budżetu. */
function renderEnergyBudgetLines() {
    if (!hasEnergyState()) return '';
    const e = society.energy;
    return `<div><dt>OZE z opłat za emisje</dt><dd>${formatZl(society.budget.energyFund || 0, 0)}</dd></div>
        <div><dt>Opłaty za emisje</dt><dd>${formatZl(e.feeQuarter || 0, 0)}</dd></div>
        ${e.subsidy > 0 ? `<div><dt>Dopłata do ceny prądu</dt><dd>${formatZl(e.subsidy, 0)}</dd></div>` : ''}`;
}
/** Karta kraju startowego: poziom życia i opinia. */
function renderEnergyCountryFacts() {
    if (!hasEnergyState() || !society.energy.life) return '';
    const e = society.energy, life = e.life, opinion = e.opinion ?? OPINION_RULES.start, effect = (opinion - OPINION_RULES.start) / OPINION_RULES.start * OPINION_RULES.maxEffect * 100;
    return `<div><dt>Poziom życia</dt><dd>${uiIcon('poziom-zycia', 14)} ${scoreWord(life, LIFE_WORDS)} (${Math.round(life)}/100)${renderLimitMeter(life, null, `Poziom życia ${Math.round(life)} na 100`)}</dd></div>
        <div><dt>Opinia publiczna</dt><dd>${uiIcon('megafon', 14)} ${scoreWord(opinion, OPINION_WORDS)} (${Math.round(opinion)}/100), przychody spółek konsumenckich ${effect >= 0 ? '+' : '−'}${formatNumberPl(Math.abs(effect), 1)}%</dd></div>`;
}
/** Okno „Rynek”: kafelki Opinii i ceny prądu. */
function renderEnergyMarketCards() {
    if (!hasEnergyState()) return '';
    const e = society.energy, opinion = e.opinion ?? OPINION_RULES.start, effect = (opinion - OPINION_RULES.start) / OPINION_RULES.start * OPINION_RULES.maxEffect * 100;
    const hist = e.hist, last = hist.length > 1 ? hist[hist.length - 1] / hist[hist.length - 2] - 1 : 0, balance = e.capacity - e.demand;
    return `<div><h4 class="bank-section-title">Energia i nastroje</h4><div class="freight-cards">
        <div class="freight-card"><span class="freight-card-head">${uiIcon('megafon', 16)} Opinia publiczna</span><strong>${Math.round(opinion)}/100</strong><small>${effect >= 0 ? '▲' : '▼'} ${scoreWord(opinion, OPINION_WORDS)} · Dobra konsumpcyjne, Media, Turystyka ${effect >= 0 ? '+' : '−'}${formatNumberPl(Math.abs(effect), 1)}%</small>${renderLimitMeter(opinion, null, `Opinia publiczna ${Math.round(opinion)} na 100`)}</div>
        <div class="freight-card"><span class="freight-card-head">${uiIcon('prad', 16)} Cena prądu</span><strong>${formatNumberPl(getEnergyPricePln(), 0)} PLN/MWh</strong><small>${signed(last * 100)}% w kwartale · bilans ${balance >= 0 ? '+' : '−'}${formatGw(Math.abs(balance))}</small></div>
    </div></div>`;
}

// ---------------------------------------------------------------------------------
// Karta spółki
// ---------------------------------------------------------------------------------
function renderCompanyEnergyKpi(stock) {
    if (!hasEnergyState() || stock.assetType) return '';
    const e = society.energy, tiles = [], measured = getMeasuredEmissionFactor(stock), emits = getStockEmissionFactor(stock) > 0;
    if (stock.power) tiles.push(['Moc', `${uiIcon(ENERGY_ICONS[stock.power.type], 14)} ${formatGw(stock.power.capacity)}, ${ENERGY_TYPES[stock.power.type].name.toLowerCase()}`]);
    if (measured !== null && emits) {
        tiles.push(['Emisje', `${formatNumberPl(getEmissionShare(stock, e) * 100, 1)}% kraju`]);
        const limit = getEmissionLimit(e);
        if (Number.isFinite(limit)) tiles.push(['Limit UEiE', measured > limit ? `${uiIcon('alert', 14)} ponad limit` : `${uiIcon('ok', 14)} w limicie`]);
    }
    if (stock.esg) tiles.push(['ESG', `${uiIcon('lisc', 14)} w drodze`]);
    return tiles.length ? `<div class="en-gauges">${tiles.map(([label, value]) => `<div class="cc-kpi"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>` : '';
}
function renderPowerBlocks(stock) {
    const power = stock.power, quarter = getEnergyQuarter();
    if (power.type === 'nuclear') {
        const units = Number(stock.nuclearUnits) || 0, block = stock.nuclearBlock, list = [];
        for (let i = 1; i <= units; i++) list.push(`<div class="en-block is-run"><div class="en-block-top">${uiIcon('blok', 16)}<strong>Blok ${i}</strong><span class="badge badge--up">${uiIcon('ok', 12)} Działa</span></div><small>przychód +${Math.round(NUCLEAR_BLOCK_BOOSTS[Math.min(i, 3) - 1] * 100)}%</small></div>`);
        if (block && block.stage !== 'operating') {
            const n = units + 1, wait = block.stage === 'approval', done = block.quarters - Math.max(0, block.dueQuarter - quarter), boost = Math.round(NUCLEAR_BLOCK_BOOSTS[Math.min(n, 3) - 1] * 100);
            list.push(wait ? `<div class="en-block is-wait"><div class="en-block-top">${uiIcon('zegar', 16)}<strong>Blok ${n}</strong><span class="badge badge--warn">${uiIcon('alert', 12)} Czeka na zgodę</span></div><small>UEiE wstrzymuje uruchomienie: ${block.delays} z ${NUCLEAR_MAX_DELAYS} możliwych opóźnień.</small></div>`
                : `<div class="en-block is-build"><div class="en-block-top">${uiIcon('blok', 16)}<strong>Blok ${n}</strong><span class="badge badge--accent">${uiIcon('zegar', 12)} Budowa</span></div>${renderLimitMeter(done / block.quarters * 100, null, `Postęp budowy ${Math.round(done / block.quarters * 100)}%`)}<small>kw. ${Math.max(0, done)} z ${block.quarters} · zapłacono ${formatZl(block.spent, 0)} z ${formatZl(block.cost, 0)} · po budowie: zgoda UEiE, przychód +${boost}%</small></div>`);
        }
        const next = units + (block && block.stage !== 'operating' ? 1 : 0) + 1;
        if (next <= ENERGY_STATE_RULES.nuclearMaxBlocks) list.push(`<div class="en-block is-locked"><div class="en-block-top">${uiIcon('klodka', 16)}<strong>Blok ${next}</strong><span class="badge badge--neutral">Zablokowany</span></div><small>${next > 1 ? `Wymaga działającego bloku ${next - 1}.` : 'Zależy od decyzji spółki i państwa.'} Przychód +${Math.round(NUCLEAR_BLOCK_BOOSTS[Math.min(next, 3) - 1] * 100)}%.</small></div>`);
        return list.join('');
    }
    const list = [`<div class="en-block is-run"><div class="en-block-top">${uiIcon('blok', 16)}<strong>Działające elektrownie</strong><span class="badge badge--${power.outage ? 'down' : 'up'}">${power.outage ? 'Awaria' : `${uiIcon('ok', 12)} Działa`}</span></div><small>${formatGw(power.capacity)}${power.outage ? ` · moc −${formatGw(power.outage.lost)} do kw. ${power.outage.until}` : ''}</small></div>`];
    if (power.build) {
        const build = power.build, done = build.quarters - Math.max(0, build.dueQ - quarter);
        list.push(`<div class="en-block is-build"><div class="en-block-top">${uiIcon('blok', 16)}<strong>${ENERGY_BLOCK_NAMES[build.type || power.type]}</strong><span class="badge badge--accent">${uiIcon('zegar', 12)} Budowa</span></div>${renderLimitMeter(done / build.quarters * 100, null, `Postęp budowy ${Math.round(done / build.quarters * 100)}%`)}<small>kw. ${done} z ${build.quarters} · +${formatGw(build.add)} · zapłacono ${formatZl(build.spent, 0)} z ${formatZl(build.cost, 0)}</small></div>`);
    }
    return list.join('');
}
function renderPowerBuildForm(stock, owner) {
    if (!owner || stock.power?.type === 'nuclear' || !stock.power) return '';
    if (stock.power.build) return '<p class="notice-inline">' + uiIcon('klodka', 14) + '<span>Następny blok po ukończeniu tego.</span></p>';
    const cost = getPowerBlockCost(stock), missing = Math.ceil(cost * ENERGY_RULES.minCashShare - (Number(stock.cash) || 0));
    return `<div class="btn-row"><select id="energy-block-${stock.symbol}" aria-label="Typ bloku">${Object.keys(ENERGY_BLOCK_NAMES).map(type => `<option value="${type}"${type === stock.power.type ? ' selected' : ''}>${ENERGY_BLOCK_NAMES[type]}</option>`).join('')}</select>
        <button class="btn-secondary"${missing > 0 ? ' disabled' : ''} onclick="orderOwnerPowerBlock('${stock.symbol}', document.getElementById('energy-block-${stock.symbol}').value); renderCompanyCard();">${uiIcon('blok', 14)} Zbuduj blok (${formatZl(cost, 0)})</button></div>
        ${missing > 0 ? `<p class="notice-inline is-warn">${uiIcon('alert', 14)}<span>Za mało gotówki w spółce: brakuje ${formatZl(missing, 0)}.</span></p>` : ''}`;
}
const ENERGY_ORDER_TEXT = {
    deposit: { icon: 'geolog', title: 'Poszukiwanie nowych złóż', text: 'Geolog szuka surowca. Wynik jest losowy: większa produkcja na czas złoża albo nic.' },
    site: { icon: 'dzialka', title: 'Szukanie działki', text: 'Niższy koszt i krótszy czas następnej budowy.' },
    tech: { icon: 'badania', title: 'Najnowsze technologie', text: 'Tylko dla OZE i atomu. Daje tańszą moc albo wyższą sprawność.' }
};
function renderEnergyOrder(stock, kind, owner) {
    const info = ENERGY_ORDER_TEXT[kind], def = ENERGY_CONTRACTS[kind], order = stock.energyOrder, head = `<h5>${uiIcon(info.icon, 16)} ${info.title}</h5><p>${info.text}</p>`;
    if (order?.kind === kind) {
        const left = Math.max(0, order.dueQ - getEnergyQuarter());
        return `<article class="en-order">${head}<dl><div><dt>Stan</dt><dd>w toku, ${left} kw. do końca</dd></div></dl></article>`;
    }
    if (kind === 'tech' && !['oze', 'nuclear'].includes(stock.power?.type)) return `<article class="en-order">${head}<p class="notice-inline">${uiIcon('klodka', 14)}<span>Zlecenie jest dla OZE i atomu.</span></p></article>`;
    if (kind === 'tech' && (Number(stock.power.techs) || 0) >= ENERGY_RULES.techMax) return `<article class="en-order">${head}<p class="notice-inline">${uiIcon('klodka', 14)}<span>Wykorzystano ${ENERGY_RULES.techMax} z ${ENERGY_RULES.techMax} zleceń.</span></p></article>`;
    if (kind === 'site' && stock.power?.site) return `<article class="en-order">${head}<p class="notice-inline">${uiIcon('ok', 14)}<span>Działka gotowa. Obowiązuje do startu następnej budowy.</span></p></article>`;
    const [a, b] = def.quarters, can = canOrderEnergyContract(stock, kind), contractor = pickEnergyContractor(kind);
    return `<article class="en-order">${head}<dl><div><dt>Koszt</dt><dd>${formatZl(getEnergyContractCost(stock), 0)}</dd></div><div><dt>Czas</dt><dd>${a === b ? a : `${a}–${b}`} kw.</dd></div><div><dt>Wykonawca</dt><dd>${escapeHtml(contractor?.name || 'brak')}</dd></div></dl>
        ${owner ? `<div class="btn-row"><button class="btn-secondary"${can ? '' : ' disabled'} onclick="orderOwnerEnergyContract('${stock.symbol}', '${kind}'); renderCompanyCard();">Zleć</button></div>` : ''}</article>`;
}
function renderEnergyEsg(stock, owner) {
    if (getStockEmissionFactor(stock) <= 0) return '';
    if (stock.esg) return `<div class="en-order mt-2"><h5>${uiIcon('lisc', 16)} Ścieżka ESG</h5><p>Spółka jest na ścieżce: emisje niższe o ${Math.round(ENERGY_OFFICE_RULES.esgCut * 100)}%.</p></div>`;
    const level = getEnergyOfficeLevel(), open = level >= ENERGY_OFFICE_RULES.esgLevel, cost = Math.round(getStockRevenue(stock) * ENERGY_OFFICE_RULES.esgCost);
    return `<div class="en-order mt-2"><h5>${uiIcon('lisc', 16)} Ścieżka ESG</h5><p>Jednorazowy koszt ${formatZl(cost, 0)}, potem emisje spółki niższe o ${Math.round(ENERGY_OFFICE_RULES.esgCut * 100)}%.</p>
        ${owner ? `<div class="btn-row"><button class="btn-secondary"${open ? '' : ' disabled'} onclick="orderOwnerEsg('${stock.symbol}'); renderCompanyCard();">Wejdź na ścieżkę ESG</button></div>` : ''}
        ${open ? '' : `<p class="notice-inline">${uiIcon('klodka', 14)}<span>Dostępna od poziomu ${ENERGY_OFFICE_RULES.esgLevel} UEiE, teraz poziom ${level}.</span></p>`}</div>`;
}
/** Zarządzanie: sekcja Energia, tylko dla spółek z mocą albo wydobyciem surowca energetycznego. */
function renderEnergyManage(stock) {
    if (!hasEnergyState() || stock.assetType) return '';
    const deposit = getDepositCommodity(stock), power = stock.power;
    if (!power && !deposit) return '';
    const e = society.energy, owner = typeof canFundControlAgm === 'function' && canFundControlAgm(stock), stake = typeof getFundStakePct === 'function' ? getFundStakePct(stock) : 0;
    const type = power?.type, subtitle = power ? `energetyka: ${ENERGY_TYPES[type].name.toLowerCase()}` : 'wydobycie surowca';
    const fuel = power && ENERGY_TYPES[type].fuel;
    const kpi = power ? `<div class="en-gauges"><div class="cc-kpi"><span>Moc</span><strong>${formatGw(power.capacity)}</strong></div>
        <div class="cc-kpi"><span>Udział w kraju</span><strong>${formatNumberPl(power.capacity / Math.max(1, e.capacity) * 100, 1)}%</strong></div>
        ${fuel ? `<div class="cc-kpi"><span>Wsad: ${escapeHtml(COMMODITY_DEFS[fuel].name.toLowerCase())}</span><strong>${formatNumberPl(getEnergyFuelPrice(fuel), 0)} USD za ${escapeHtml(COMMODITY_DEFS[fuel].unit || 'jednostkę')}</strong></div>` : ''}
        <div class="cc-kpi"><span>Koszt prądu</span><strong>${formatNumberPl(getTypePricePln(type, e), 0)} PLN/MWh</strong></div></div>` : '';
    const measured = getMeasuredEmissionFactor(stock), limit = getEmissionLimit(e);
    const over = measured !== null && Number.isFinite(limit) && measured > limit ? `<p class="alert alert--warn">${uiIcon('alert', 18)}<span><strong>Ponad limit UEiE.</strong> Grozi kara do ${formatZl(Math.round(getStockRevenue(stock) * ENERGY_OFFICE_RULES.fines[getEnergyOfficeLevel()]), 0)}. Niżej zejdziesz przez technologie albo ESG.</span></p>` : '';
    const contract = type === 'nuclear' ? `<p class="text-sm mt-2">Kontrakt zależy od ustaw: Polityka energetyczna <strong>${escapeHtml(SOCIAL_LAWS.energyPolicy.levels[Number(society.laws.energyPolicy)].toLowerCase())}</strong>, Dostawcy energii <strong>${escapeHtml(SOCIAL_LAWS.energySuppliers.levels[Number(society.laws.energySuppliers)].toLowerCase())}</strong>.</p>` : '';
    const state = stock.isStateOwned && type === 'nuclear' ? `<p class="notice-inline">${uiIcon('panstwo', 14)}<span>Raty budowy finansuje Skarb Państwa. Prywatyzacja możliwa później.</span></p>` : '';
    const kinds = [...(deposit ? ['deposit'] : []), ...(power ? ['site', 'tech'] : [])];
    const result = stock.energyResult ? `<p class="text-sm">${uiIcon(stock.energyResult.ok ? 'ok' : 'zamknij', 14)} Ostatnie zlecenie: ${escapeHtml(stock.energyResult.text)}</p>` : '';
    return `<div class="bank-card mt-3"><header class="bank-card-head"><span class="bank-card-icon${type ? ` en-t-${type}` : ''}">${uiIcon(type ? ENERGY_ICONS[type] : 'geolog', 20)}</span><div><h4>Energia: ${escapeHtml(stock.name)}</h4><span class="bank-card-type">${subtitle}</span></div></header>
        ${kpi}${over}${power ? renderPowerBlocks(stock) : ''}${contract}${state}${renderPowerBuildForm(stock, owner)}${renderEnergyEsg(stock, owner)}
        <h4 class="bank-section-title mt-3">Zlecenia dla podwykonawców</h4><div class="en-orders">${kinds.map(kind => renderEnergyOrder(stock, kind, owner)).join('')}</div>${result}
        ${owner ? '' : `<p class="text-sm text-muted">Zlecać może tylko większościowy akcjonariusz. Teraz masz ${formatNumberPl(stake * 100, 0)}%.</p>`}</div>`;
}
