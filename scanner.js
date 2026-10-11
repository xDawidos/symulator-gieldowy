// =================================================================================
// 0.12 N2: SKANER SPÓŁEK, METODY WYCENY, KONSENSUS ANALITYKÓW
// Szkolenie „Analityk Finansowy”:
//   1 — skaner + wycena porównawcza (C/Z sektora),
//   2 — ROE, marża, wzrost zysku; wycena z C/WK sektora i modelem dywidend (Gordona),
//   3 — konsensus przed raportem i wynik vs konsensus, potencjał do wyceny w skanerze.
// =================================================================================

const SCANNER_PRESETS = {
    value:    { label: '💎 Tanie wartościowe', filters: { peBelowSector: true, pbMax: 1.5, debtMax: 60 } },
    dividend: { label: '💰 Dywidendowe', filters: { dyMin: 4, debtMax: 70, healthMin: 0 } },
    growth:   { label: '🚀 Wzrostowe', filters: { growthMin: 10, healthMin: 1 } },
    safe:     { label: '🛡️ Bezpieczne', filters: { debtMax: 40, healthMin: 2 } }
};

const SCANNER_DEFAULT_FILTERS = { sector: 'all', peBelowSector: false, pbMax: '', dyMin: '', debtMax: '', growthMin: '', healthMin: '', accessibleOnly: true };

let scannerView = { filters: { ...SCANNER_DEFAULT_FILTERS }, sort: 'cap', dir: -1 };

function getAnalystLevel() {
    return getSkillLevel('financialAnalyst');
}

// ---------------------------------------------------------------------------------
// METODY WYCENY
// ---------------------------------------------------------------------------------

/** Wycena kilkoma metodami: { pe, book, gordon } (zł/akcję albo null). */
function getValuationMethods(stock) {
    const m = getCompanyMetrics(stock);
    const f = stock.fundamentals;
    if (!m || !f) return null;
    const med = getSectorMedians(stock.sector?.[0]) || {};
    const pe = m.eps > 0 && med.pe ? m.eps * med.pe : null;
    const book = f.bookValuePerShare > 0 && med.pb ? f.bookValuePerShare * med.pb : null;
    // Model Gordona: D1 / (r − g); r = stopa bazowa + 5 pkt premii za ryzyko akcji, g ≤ r − 2 pkt.
    const dps = stock.price * (m.dy || 0);
    const r = Math.max(0.04, (Number(centralBank?.baseInterestRate) || 0.05) + 0.05);
    const g = Math.max(-0.02, Math.min(r - 0.02, m.growth !== null ? m.growth * 0.5 : 0.02));
    const gordon = dps > 0 ? dps * (1 + g) / (r - g) : null;
    return { pe, book, gordon, r, g };
}

// ---------------------------------------------------------------------------------
// SKANER
// ---------------------------------------------------------------------------------

function num(value) {
    const n = parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

/** Wiersze skanera po filtrach i sortowaniu. */
function runScanner(filters = scannerView.filters, sort = scannerView.sort, dir = scannerView.dir) {
    const rows = [];
    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt) continue;
        if (filters.sector !== 'all' && !stock.sector?.includes(filters.sector)) continue;
        if (filters.accessibleOnly && !canAccessExchange(stock.exchange)) continue;
        const m = getCompanyMetrics(stock);
        if (!m) continue;
        const med = getSectorMedians(stock.sector?.[0]) || {};
        if (filters.peBelowSector && !(m.pe && med.pe && m.pe < med.pe)) continue;
        if (num(filters.pbMax) !== null && !(m.pb && m.pb <= num(filters.pbMax))) continue;
        if (num(filters.dyMin) !== null && !(m.dy * 100 >= num(filters.dyMin))) continue;
        if (num(filters.debtMax) !== null && !(m.debt !== null && m.debt * 100 <= num(filters.debtMax))) continue;
        if (num(filters.growthMin) !== null && !(m.growth !== null && m.growth * 100 >= num(filters.growthMin))) continue;
        if (num(filters.healthMin) !== null && !(m.health >= num(filters.healthMin))) continue;
        rows.push({ stock, m, med, upside: m.fair ? m.fair / stock.price - 1 : null });
    }
    const key = row => sort === 'name' ? row.stock.name : sort === 'upside' ? row.upside : row.m[sort];
    rows.sort((a, b) => {
        const va = key(a), vb = key(b);
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        return typeof va === 'string' ? va.localeCompare(vb, 'pl') * dir : (va - vb) * dir;
    });
    return rows;
}

function openScanner() {
    if (getAnalystLevel() < 1) {
        showToast('Skaner spółek odblokujesz szkoleniem „Analityk Finansowy” (CV i szkolenia).', 'warning', 6000);
        return;
    }
    let modal = document.getElementById('scanner-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'scanner-modal';
        modal.className = 'modal modal-xl';
        modal.innerHTML = '<button class="close-btn" onclick="closeModalFrom(this)" aria-label="Zamknij">&times;</button><h2 class="mt-0">🔎 Skaner spółek</h2><div id="scanner-filters"></div><div id="scanner-results"></div>';
        document.body.appendChild(modal);
    }
    renderScannerFilters();
    renderScannerResults();
    modal.style.display = 'block';
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('wycena');
}

function setScannerFilter(key, value) {
    scannerView.filters[key] = value;
    renderScannerResults();
}

function applyScannerPreset(id) {
    const preset = SCANNER_PRESETS[id] || (playerProfile?.scannerPresets || []).find(p => p.name === id);
    if (!preset) return;
    scannerView.filters = { ...SCANNER_DEFAULT_FILTERS, ...(preset.filters || {}) };
    renderScannerFilters();
    renderScannerResults();
}

function saveScannerPreset() {
    const name = (document.getElementById('scanner-preset-name')?.value || '').trim().slice(0, 30);
    if (!name || !playerProfile) { showToast('Podaj nazwę presetu.', 'warning'); return; }
    if (!Array.isArray(playerProfile.scannerPresets)) playerProfile.scannerPresets = [];
    playerProfile.scannerPresets = playerProfile.scannerPresets.filter(p => p.name !== name);
    playerProfile.scannerPresets.push({ name, filters: { ...scannerView.filters } });
    if (playerProfile.scannerPresets.length > 8) playerProfile.scannerPresets.shift();
    showToast(`Zapisano preset „${name}”.`, 'success');
    renderScannerFilters();
}

function setScannerSort(key) {
    if (scannerView.sort === key) scannerView.dir *= -1;
    else { scannerView.sort = key; scannerView.dir = key === 'name' || key === 'pe' || key === 'pb' || key === 'debt' ? 1 : -1; }
    renderScannerResults();
}

function renderScannerFilters() {
    const box = document.getElementById('scanner-filters');
    if (!box) return;
    const f = scannerView.filters;
    const sectors = [...new Set(stocks.filter(s => !s.assetType && !s.isBankrupt).map(s => s.sector?.[0]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pl'));
    const input = (key, label, placeholder, title) => `<label class="text-sm" title="${escapeHtml(title)}">${label} <input type="text" inputmode="decimal" class="w-xs" value="${escapeHtml(f[key] ?? '')}" placeholder="${placeholder}" oninput="setScannerFilter('${key}', this.value)"></label>`;
    const own = (playerProfile?.scannerPresets || []).map(p => `<button class="btn-xs btn-secondary" onclick="applyScannerPreset('${escapeHtml(p.name).replace(/'/g, '&#39;')}')">⭐ ${escapeHtml(p.name)}</button>`).join('');
    box.innerHTML = `
        <div class="d-flex gap-2 flex-wrap mb-2">${Object.entries(SCANNER_PRESETS).map(([id, p]) => `<button class="btn-xs btn-secondary" onclick="applyScannerPreset('${id}')">${p.label}</button>`).join('')}${own}
            <button class="btn-xs" onclick="scannerView.filters = { ...SCANNER_DEFAULT_FILTERS }; renderScannerFilters(); renderScannerResults();">Wyczyść</button></div>
        <div class="scanner-filters">
            <label class="text-sm">Sektor <select onchange="setScannerFilter('sector', this.value)"><option value="all">wszystkie</option>${sectors.map(s => `<option ${f.sector === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select></label>
            <label class="text-sm" title="C/Z niższe od mediany sektora"><input type="checkbox" ${f.peBelowSector ? 'checked' : ''} onchange="setScannerFilter('peBelowSector', this.checked)"> C/Z poniżej sektora</label>
            ${input('pbMax', 'C/WK ≤', 'np. 1', 'Kurs / wartość księgowa na akcję')}
            ${input('dyMin', 'Dywidenda ≥', '%', 'Stopa dywidendy z ostatniego roku, w %')}
            ${input('debtMax', 'Zadłużenie ≤', '%', 'Zobowiązania / aktywa, w %')}
            ${getAnalystLevel() >= 2 ? input('growthMin', 'Wzrost zysku r/r ≥', '%', 'Zysk z 4 ostatnich kwartałów vs 4 wcześniejszych') : ''}
            ${input('healthMin', 'Kondycja ≥', '−5…5', 'Kondycja finansowa spółki')}
            <label class="text-sm"><input type="checkbox" ${f.accessibleOnly ? 'checked' : ''} onchange="setScannerFilter('accessibleOnly', this.checked)"> tylko dostępne giełdy</label>
        </div>
        <div class="d-flex gap-2 items-center mt-2"><input type="text" id="scanner-preset-name" class="w-md" placeholder="Nazwa własnego presetu"><button class="btn-xs" onclick="saveScannerPreset()">💾 Zapisz filtry</button></div>`;
}

function renderScannerResults() {
    const box = document.getElementById('scanner-results');
    if (!box) return;
    const level = getAnalystLevel();
    const flagsOn = typeof getRedFlags === 'function' && getSkillLevel('accountant') >= 4;
    const rows = runScanner();
    const pct = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(1)}%`;
    const fx = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(1);
    const head = (key, label, title) => `<th class="clickable" title="${escapeHtml(title)}" onclick="setScannerSort('${key}')">${label}${scannerView.sort === key ? (scannerView.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
    const cls = (v, med, lowerBetter) => !Number.isFinite(v) || !Number.isFinite(med) ? '' : (lowerBetter ? v < med * 0.85 : v > med * 1.15) ? 'text-up' : (lowerBetter ? v > med * 1.15 : v < med * 0.85) ? 'text-down' : '';
    box.innerHTML = `
        <p class="text-sm text-muted">Znaleziono: <strong>${rows.length}</strong>. Kolor: na zielono lepiej niż mediana sektora, na czerwono gorzej. Kliknij spółkę, by otworzyć kartę. Banki pomijamy — ich bilans zawiera depozyty klientów, więc C/WK i zadłużenie liczy się inaczej.</p>
        <div class="scanner-table-wrap"><table class="asset-mini-table w-full scanner-table">
            <thead><tr>
                ${head('name', 'Spółka', 'Nazwa')}${head('cap', 'Kapitalizacja', 'Kurs × liczba akcji')}${head('pe', 'C/Z', 'Cena / zysk')}${head('pb', 'C/WK', 'Cena / wartość księgowa')}
                ${head('dy', 'Dywid.', 'Stopa dywidendy')}${head('debt', 'Zadłuż.', 'Zobowiązania / aktywa')}
                ${level >= 2 ? head('roe', 'ROE', 'Zysk / kapitał własny') + head('margin', 'Marża', 'Zysk netto / przychody') + head('growth', 'Zysk r/r', 'Wzrost zysku rok do roku') : ''}
                ${head('health', 'Kondycja', 'Kondycja finansowa')}${level >= 3 ? head('upside', 'Potencjał', 'Wartość godziwa / kurs − 1') : ''}${flagsOn ? '<th title="Czerwone flagi (Księgowy poz. 4)">🚩</th>' : ''}
            </tr></thead>
            <tbody>${rows.slice(0, 120).map(({ stock, m, med, upside }) => `<tr class="clickable" onclick="openDescriptionModal('${stock.symbol}')">
                <td>${escapeHtml(stock.name)} <span class="text-xs text-muted">${escapeHtml(stock.symbol)} · ${escapeHtml(stock.sector?.[0] || '')}</span></td>
                <td class="cell-number">${formatZl(m.cap, 0)}</td>
                <td class="cell-number ${cls(m.pe, med.pe, true)}">${fx(m.pe)}</td>
                <td class="cell-number ${cls(m.pb, med.pb, true)}">${m.pb ? m.pb.toFixed(2) : '—'}</td>
                <td class="cell-number ${cls(m.dy, med.dy, false)}">${pct(m.dy)}</td>
                <td class="cell-number ${cls(m.debt, med.debt, true)}">${pct(m.debt)}</td>
                ${level >= 2 ? `<td class="cell-number ${cls(m.roe, med.roe, false)}">${pct(m.roe)}</td><td class="cell-number ${cls(m.margin, med.margin, false)}">${pct(m.margin)}</td><td class="cell-number ${m.growth > 0 ? 'text-up' : m.growth < 0 ? 'text-down' : ''}">${pct(m.growth)}</td>` : ''}
                <td class="cell-number">${m.health.toFixed(1)}</td>
                ${level >= 3 ? `<td class="cell-number ${upside > 0.15 ? 'text-up' : upside < -0.15 ? 'text-down' : ''}">${pct(upside)}</td>` : ''}
                ${flagsOn ? (() => { const flags = getRedFlags(stock); return `<td class="cell-number ${flags.length >= 2 ? 'text-down' : ''}" title="${escapeHtml(flags.map(f => f.label).join(', '))}">${flags.length || ''}</td>`; })() : ''}
            </tr>`).join('') || '<tr><td colspan="11" class="text-muted">Żadna spółka nie spełnia filtrów.</td></tr>'}</tbody>
        </table></div>`;
}
