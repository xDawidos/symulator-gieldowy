// fund-ui.js — interfejs funduszu gracza (etap B): panel funduszu, wykres okresów, rywale,
// klienci, konto prywatne, CV ze szkoleniami i scenka startowa.

function formatZl(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return number.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' zł';
}

function formatPct(value, digits = 2) {
    const number = Number(value) * 100;
    if (!Number.isFinite(number)) return '—';
    return `${number >= 0 ? '+' : ''}${number.toFixed(digits)}%`;
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// =================================================================================
// PANEL FUNDUSZU
// =================================================================================

function displayFundPanel() {
    if (!playerFund) return;

    const title = document.getElementById('fund-panel-title');
    if (title) title.textContent = `💼 ${playerProfile?.fundName || 'Mój fundusz'}`;

    document.getElementById('account-btn-fund')?.classList.toggle('active', activeTradingAccount === 'fund');
    document.getElementById('account-btn-private')?.classList.toggle('active', activeTradingAccount === 'private');

    renderFundSummary();
    renderFundPeriodsChart();
    renderFundRivalsTable();
    renderFundClients();
    renderPrivatePanel();
}

function renderFundSummary() {
    const container = document.getElementById('fund-summary');
    if (!container) return;

    const current = playerFund.current;
    const nav = getFundNav();
    const periodProgress = Math.min(1, current.elapsedMs / FUND_PERIOD_MS);
    const periodReturn = getPeriodReturn(current.startNav, nav);
    const benchmarkReturn = getPeriodReturn(current.startBenchmark, getBenchmarkValue());
    const trust = Math.round(playerFund.trust);
    const trustClass = trust >= 60 ? 'good' : trust >= 40 ? 'mid' : 'bad';

    container.innerHTML = `
        <div class="fund-kpis">
            <div><span>NAV / JU</span><strong>${nav.toFixed(4)} zł</strong></div>
            <div><span>Liczba JU</span><strong>${playerFund.units.toFixed(1)}</strong></div>
            <div><span>Klienci</span><strong>${playerFund.clients.length}</strong></div>
            <div><span>Stanowisko</span><strong>${escapeHtml(getPlayerPosition().name)}</strong></div>
        </div>
        <div class="fund-trust">
            <span>Zaufanie klientów: <strong>${trust}/100</strong></span>
            <div class="fund-trust-bar"><div class="fund-trust-fill ${trustClass}" style="width:${trust}%"></div></div>
        </div>
        <div class="fund-period-line">
            Okres ${current.number}: ${formatPct(periodReturn)} vs GIG ${formatPct(benchmarkReturn)}
            · emisje ${current.emissions}/${MAX_EMISSIONS_PER_PERIOD}
            · obsunięcie ${(current.maxDrawdown * 100).toFixed(1)}%
        </div>
        <div class="fund-period-progress" title="Postęp okresu oceny (15 min gry)">
            <div style="width:${(periodProgress * 100).toFixed(1)}%"></div>
        </div>`;
}

/** Wykres słupkowy: 4 ostatnie okresy + bieżący — fundusz vs GIG vs średnia funduszy zewnętrznych. */
function renderFundPeriodsChart() {
    const container = document.getElementById('fund-periods-chart');
    if (!container) return;

    const current = playerFund.current;
    const rivalsNow = getExternalFunds().filter(fund => current.startRivals[fund.symbol] > 0)
        .map(fund => getPeriodReturn(current.startRivals[fund.symbol], getExternalFundValue(fund)));

    const rows = playerFund.periods.slice(-FUND_PERIODS_SHOWN).map(period => ({
        label: `Okres ${period.number}`,
        fund: period.fundReturn,
        benchmark: period.benchmarkReturn,
        rivals: period.rivals.length ? period.rivals.reduce((sum, rival) => sum + rival.return, 0) / period.rivals.length : 0
    }));
    rows.push({
        label: `Teraz`,
        fund: getPeriodReturn(current.startNav, getFundNav()),
        benchmark: getPeriodReturn(current.startBenchmark, getBenchmarkValue()),
        rivals: rivalsNow.length ? rivalsNow.reduce((sum, value) => sum + value, 0) / rivalsNow.length : 0,
        partial: true
    });

    const series = [
        { key: 'fund', label: 'Twój fundusz', color: '#22C55E' },
        { key: 'benchmark', label: 'GIG', color: '#38BDF8' },
        { key: 'rivals', label: 'Fundusze zewnętrzne (śr.)', color: '#F59E0B' }
    ];

    const width = 320;
    const height = 150;
    const pad = { top: 10, bottom: 22, left: 34, right: 6 };
    const values = rows.flatMap(row => series.map(item => row[item.key]));
    const maxAbs = Math.max(0.01, ...values.map(Math.abs));
    const plotH = height - pad.top - pad.bottom;
    const zeroY = pad.top + plotH / 2;
    const groupW = (width - pad.left - pad.right) / rows.length;
    const barW = Math.max(4, groupW / (series.length + 1));

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Stopy zwrotu w ostatnich okresach">`;
    svg += `<line x1="${pad.left}" x2="${width - pad.right}" y1="${zeroY}" y2="${zeroY}" stroke="currentColor" stroke-opacity="0.35"/>`;
    svg += `<text x="${pad.left - 4}" y="${pad.top + 8}" font-size="8" text-anchor="end" fill="currentColor">${formatPct(maxAbs, 1)}</text>`;
    svg += `<text x="${pad.left - 4}" y="${height - pad.bottom}" font-size="8" text-anchor="end" fill="currentColor">${formatPct(-maxAbs, 1)}</text>`;

    rows.forEach((row, index) => {
        const groupX = pad.left + index * groupW + barW / 2;
        series.forEach((item, seriesIndex) => {
            const value = row[item.key];
            const h = Math.abs(value) / maxAbs * (plotH / 2);
            const x = groupX + seriesIndex * barW;
            const y = value >= 0 ? zeroY - h : zeroY;
            svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 1).toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" fill="${item.color}" fill-opacity="${row.partial ? 0.55 : 1}"><title>${row.label} — ${item.label}: ${formatPct(value)}</title></rect>`;
        });
        svg += `<text x="${(pad.left + index * groupW + groupW / 2).toFixed(1)}" y="${height - 8}" font-size="8" text-anchor="middle" fill="currentColor">${row.label}</text>`;
    });
    svg += '</svg>';

    const legend = series.map(item => `<span><i style="background:${item.color}"></i>${item.label}</span>`).join('');
    container.innerHTML = svg + `<div class="fund-legend">${legend}</div>`;
}

function renderFundRivalsTable() {
    const container = document.getElementById('fund-rivals-table');
    if (!container) return;

    const last = playerFund.periods[playerFund.periods.length - 1];
    if (!last) {
        container.innerHTML = '<p class="fund-muted">Porównanie z rywalami pojawi się po pierwszym okresie (15 min gry).</p>';
        return;
    }

    const rows = [
        { name: `💼 ${playerProfile?.fundName || 'Twój fundusz'}`, ret: last.fundReturn, extra: `zmienność ${(last.volatility * 100).toFixed(2)}%, obsunięcie ${(last.maxDrawdown * 100).toFixed(1)}%`, mine: true },
        { name: '📈 GIG (benchmark)', ret: last.benchmarkReturn, extra: '' },
        ...last.rivals.map(rival => ({ name: rival.name, ret: rival.return, extra: '' }))
    ].sort((a, b) => b.ret - a.ret);

    container.innerHTML = `
        <table class="asset-mini-table fund-rivals">
            <caption>Okres ${last.number}: miejsce ${last.rank}/${last.rankOf}, premia ${formatZl(last.bonus)}</caption>
            <thead><tr><th>Fundusz</th><th>Zwrot</th></tr></thead>
            <tbody>${rows.map(row => `
                <tr class="${row.mine ? 'mine' : ''}" title="${escapeHtml(row.extra)}">
                    <td>${escapeHtml(row.name)}</td>
                    <td class="${row.ret >= 0 ? 'profit' : 'loss'}">${formatPct(row.ret)}</td>
                </tr>`).join('')}</tbody>
        </table>`;
}

function renderFundClients() {
    const container = document.getElementById('fund-clients-list');
    if (!container) return;
    const nav = getFundNav();

    const clients = [...playerFund.clients].sort((a, b) => b.units - a.units);
    container.innerHTML = `
        <table class="asset-mini-table">
            <thead><tr><th>Klient</th><th>Wartość</th><th>Zadowolenie</th></tr></thead>
            <tbody>${clients.map(client => {
                const def = CLIENT_TYPES[client.type] || CLIENT_TYPES.saver;
                const sat = Math.round(client.satisfaction * 100);
                return `<tr>
                    <td title="${def.label}">${def.icon} ${escapeHtml(client.name)}</td>
                    <td>${formatZl(client.units * nav, 0)}</td>
                    <td class="${sat >= 55 ? 'profit' : sat < 35 ? 'loss' : ''}">${sat}%</td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
}

function renderPrivatePanel() {
    const container = document.getElementById('fund-private-panel');
    if (!container) return;
    const nav = getFundNav();

    const holdings = Object.entries(playerWallet.portfolio).map(([symbol, holding]) => {
        const stock = stocks.find(s => s.symbol === symbol);
        const value = (stock?.price || 0) * holding.shares;
        const pl = value - holding.avgPrice * holding.shares;
        return `<li>${symbol}: ${holding.shares} szt. · ${formatZl(value)} <span class="${pl >= 0 ? 'profit' : 'loss'}">(${pl >= 0 ? '+' : ''}${pl.toFixed(2)})</span></li>`;
    }).join('') || '<li class="fund-muted">Brak prywatnych akcji.</li>';

    container.innerHTML = `
        <p>Moje pieniądze: <strong>${formatZl(playerWallet.cash)}</strong>
           · JU własnego funduszu: <strong>${playerWallet.fundUnits.toFixed(2)}</strong> (${formatZl(playerWallet.fundUnits * nav)})</p>
        <ul class="fund-private-list">${holdings}</ul>
        <div class="fund-emission">
            <input type="number" id="private-ju-amount" min="1" value="50" aria-label="Kwota lub liczba JU">
            <button class="btn-secondary" onclick="buyOwnFundUnits(document.getElementById('private-ju-amount').value)">Kup JU za zł</button>
            <button class="btn-secondary" onclick="sellOwnFundUnits(document.getElementById('private-ju-amount').value)">Umórz JU</button>
        </div>
        <p class="fund-muted">Prywatny handel akcjami: przełącz konto na „Prywatne” i kupuj w tabeli rynku.
           Kupowanie akcji, które fundusz kupił w tym tygodniu, grozi kontrolą compliance.</p>`;
}

function handleFundEmission() {
    const input = document.getElementById('fund-emission-units');
    const units = Math.floor(Number(input?.value) || 0);
    if (!(units > 0)) return;
    const result = issueFundUnits(units);
    showToast(result.issued > 0 ? `Emisja: sprzedano ${result.issued.toFixed(1)} JU (${formatZl(result.raised)})` : 'Emisja: brak chętnych', result.issued > 0 ? 'success' : 'warning');
    refreshFundViews();
}

// =================================================================================
// CV I SZKOLENIA (zastępuje drzewko umiejętności)
// =================================================================================

function renderSkillsPanel() {
    renderCvPanel();
}

function renderCvPanel() {
    const list = document.getElementById('skills-list');
    const money = document.getElementById('skills-modal-xp');
    if (!list) return;
    if (money) money.textContent = playerWallet.cash.toFixed(2);

    const trainings = getAvailableTrainings();
    const completed = trainings.filter(id => getSkillLevel(id) > 0);
    const periods = playerFund?.periods || [];
    const bestExcess = periods.length ? Math.max(...periods.map(p => p.fundReturn - p.benchmarkReturn)) : null;

    const medals = completed.map(id => {
        const medal = getTrainingMedal(getSkillLevel(id));
        return `<span class="cv-medal cv-medal-${medal.id}" title="${escapeHtml(skills[id].name)} — poziom ${getSkillLevel(id)}">${medal.icon} ${escapeHtml(skills[id].name)}</span>`;
    }).join('') || '<span class="fund-muted">Brak ukończonych szkoleń.</span>';

    const history = (playerProfile?.cv || []).slice(-8).reverse()
        .map(entry => `<li class="cv-entry-${entry.type}">${escapeHtml(entry.text)}</li>`).join('');

    const cards = trainings.map(id => {
        const skill = skills[id];
        const level = getSkillLevel(id);
        const next = getNextSkillLevelInfo(id);
        const medal = getTrainingMedal(level);
        const cost = getTrainingCost(id);
        const reqMet = !next?.requires || getSkillLevel(next.requires.skillId) >= next.requires.level;
        const canBuy = next && reqMet && playerWallet.cash >= cost;

        return `<article class="cv-training">
            <h4>${escapeHtml(skill.name)} ${medal ? `<span class="cv-medal cv-medal-${medal.id}">${medal.icon}</span>` : ''}</h4>
            <p class="fund-muted">Poziom ${level}/${skill.levels.length}</p>
            ${next ? `<p>${escapeHtml(next.description || '')}</p>` : '<p><strong>Ukończone w pełni.</strong></p>'}
            ${next ? `<button ${canBuy ? '' : 'disabled'} onclick="buyTraining('${id}')">${reqMet ? `Szkolenie: ${cost} zł` : 'Wymaga wcześniejszego szkolenia'}</button>` : ''}
        </article>`;
    }).join('');

    list.innerHTML = `
        <section class="cv-card">
            <div class="cv-avatar" aria-hidden="true">${escapeHtml((playerProfile?.name || '?').slice(0, 1).toUpperCase())}</div>
            <div>
                <h3>${escapeHtml(playerProfile?.name || 'Gracz')}</h3>
                <p>${escapeHtml(getPlayerPosition().name)} · ${escapeHtml(playerProfile?.corporation || '')}</p>
                <p class="fund-muted">Fundusz: ${escapeHtml(playerProfile?.fundName || '')} · okresów: ${periods.length}
                   ${bestExcess !== null ? `· najlepszy wynik vs GIG: ${formatPct(bestExcess)}` : ''}</p>
            </div>
        </section>
        <h4>Odznaki szkoleń</h4>
        <div class="cv-medals">${medals}</div>
        <h4>Historia zawodowa</h4>
        <ul class="cv-history">${history}</ul>
        <h4>Dostępne szkolenia</h4>
        <div class="cv-trainings">${cards}</div>`;
}

function displayXP() {
    const element = document.getElementById('player-xp');
    if (element) element.textContent = formatZl(playerWallet.cash);
}

// =================================================================================
// SCENKA STARTOWA: SMS OD BABCI
// =================================================================================

const INTRO_SMS = [
    'Cześć Wnusiu! 😊',
    'Słyszałam, że dostałeś pracę w tej wielkiej firmie od pieniędzy. Jestem z Ciebie taka dumna! ❤️',
    'Wysyłam Ci 100 zł kieszonkowego na dobry start. Kup sobie coś mądrego, może jakąś książkę albo kurs.',
    'Tylko nie przepuść wszystkiego od razu! Całuję, Babcia 👵'
];

function showIntroScene() {
    const overlay = document.getElementById('intro-overlay');
    const thread = document.getElementById('intro-sms-thread');
    const form = document.getElementById('intro-form');
    if (!overlay || !thread || !form) return;

    overlay.hidden = false;
    thread.innerHTML = '';
    form.hidden = true;

    let index = 0;
    const typeNext = () => {
        if (index >= INTRO_SMS.length) {
            const transfer = document.createElement('div');
            transfer.className = 'intro-transfer';
            transfer.textContent = `💸 Przelew przychodzący: +${GRANDMA_POCKET_MONEY},00 zł od: Babcia`;
            thread.appendChild(transfer);
            renderIntroCountries();
            form.hidden = false;
            return;
        }
        const bubble = document.createElement('div');
        bubble.className = 'intro-sms typing';
        bubble.textContent = '…';
        thread.appendChild(bubble);
        setTimeout(() => {
            bubble.classList.remove('typing');
            bubble.textContent = INTRO_SMS[index++];
            setTimeout(typeNext, 450);
        }, 700);
    };
    typeNext();
}

function renderIntroCountries() {
    const container = document.getElementById('intro-countries');
    if (!container) return;
    container.innerHTML = START_COUNTRIES.map(country => `
        <button type="button" class="intro-country ${country.available ? 'selected' : 'locked'}" ${country.available ? '' : 'disabled'}
            title="${country.available ? 'Dostępny' : `Przepustka: ${country.passCost.toLocaleString('pl-PL')} zł (wkrótce)`}">
            ${country.flag} ${country.name}${country.available ? '' : ' 🔒'}
        </button>`).join('');
}

function completeIntroScene(event) {
    if (event) event.preventDefault();
    const value = id => (document.getElementById(id)?.value || '').trim();

    playerProfile.name = value('intro-name') || playerProfile.name;
    playerProfile.corporation = value('intro-corporation') || playerProfile.corporation;
    playerProfile.fundName = value('intro-fund') || playerProfile.fundName;
    playerProfile.country = 'PL';
    playerProfile.cv = [{ type: 'start', text: `Zatrudnienie w ${playerProfile.corporation} jako Młodszy zarządca funduszu „${playerProfile.fundName}”.` }];

    document.getElementById('intro-overlay').hidden = true;
    logEvent(`💼 Witaj, ${playerProfile.name}! Zarządzasz funduszem „${playerProfile.fundName}” w ${playerProfile.corporation}. Wznów grę, aby zacząć.`, 'review');
    refreshFundViews();
}
