// Sektorowe chipsy
function setSectorChip(el, sector) {
    document.querySelectorAll('.sector-chip:not(.owned-chip)').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const sel = document.getElementById('sector-filter');
    if (sel) {
        sel.value = sector;
        if (typeof displayStocks === 'function')
            displayStocks(typeof getCurrentInputValues === 'function' ? getCurrentInputValues() : {});
    }
}

// Taby poziomów rynku
let currentMarketLevel = 'ALL';

/** Przycisk 📊 w panelu kupna: struktura akcjonariatu (kto ma jaki % udziałów). */
function openCompanyReport(symbol) {
    if (typeof openStockDetailsModal === 'function') openStockDetailsModal(symbol);
}

let openStockDrawerSymbol = null;

function renderStockDrawer(symbol) {
    if (!symbol) return;
    const drawerId = 'drawer-' + symbol;
    if (document.getElementById(drawerId)) return;
    const row = document.querySelector('#stock-table-body tr[data-symbol="' + symbol + '"]');
    if (!row) return;
    const cols = row.querySelectorAll('td').length || 7;
    const stockData = typeof stocks !== 'undefined' ? stocks.find(s => s.symbol === symbol) : null;
    const isCompanyStock = Boolean(stockData && !stockData.assetType);
    const dr = document.createElement('tr');
    dr.id = drawerId;
    dr.className = 'stock-row-drawer open';
    const td = document.createElement('td');
    td.colSpan = cols;
    td.style.padding = '0';
    td.innerHTML = `<div class="stock-drawer-inner">
      <div class="stock-drawer-actions">
        <div class="stock-drawer-actions-row">
          <div class="qty-input-wrapper">
            <input type="text" inputmode="numeric" pattern="[0-9]*" id="dqty-${symbol}" value="1" aria-label="Liczba akcji" oninput="this.value=this.value.replace(/[^0-9]/g, ''); updateDrawerImpact('${symbol}')">
            <span class="chip-max" onclick="setDrawerMax('${symbol}')">MAX</span>
          </div>
        </div>
        <div class="stock-drawer-actions-row">
          <button class="btn-buy"
            onclick="buyStock('${symbol}',document.getElementById('dqty-${symbol}').value)">Kup</button>
          <button class="btn-sell"
            onclick="sellStock('${symbol}',document.getElementById('dqty-${symbol}').value)">Sprzedaj</button>
          <button class="btn-ghost-icon" title="Wykres"
            onclick="showPriceHistoryModal('${symbol}')">📈</button>
          <button class="btn-ghost-icon" title="Akcjonariat — kto ma jaki % udziałów"
            onclick="openCompanyReport('${symbol}')">📊</button>
          ${isCompanyStock ? `<button class="btn-ghost-icon" title="Walne zgromadzenie — akcjonariat, uchwały, głosowanie (większościowiec)"
            onclick="openGovernanceModal('${symbol}')">🗳️</button>
          <button class="btn-ghost-icon" title="Inwestycje spółki"
            onclick="openCompanyInvestments('${symbol}')">🏗️</button>` : ''}
        </div>
        <div class="stock-drawer-impact text-xs" id="dimpact-${symbol}"></div>
      </div>
    </div>`;
    dr.appendChild(td);
    row.after(dr);
    updateDrawerImpact(symbol);
}

/** N5: szacunek kosztu i wpływu zlecenia na kurs (płynność rynku). */
function estimateOrderImpact(stock, quantity) {
    const freeFloat = Math.max(1, typeof getFreeFloatShares === 'function' ? getFreeFloatShares(stock) : stock.totalShares);
    const impact = Math.min(0.02, 0.5 * Math.abs(quantity) / freeFloat);
    const marketId = typeof getStockMarket === 'function' ? getStockMarket(stock) : 'GPW';
    const commission = typeof MARKET_OPERATOR_DEFS !== 'undefined' ? (MARKET_OPERATOR_DEFS[marketId]?.commission || 0) : 0;
    const value = quantity * stock.price;
    return { value, impact, commission: value * commission, freeFloat, available: typeof getAvailableShares === 'function' ? getAvailableShares(stock) : null };
}

function updateDrawerImpact(symbol) {
    const box = document.getElementById('dimpact-' + symbol);
    const stock = typeof stocks !== 'undefined' ? stocks.find(s => s.symbol === symbol) : null;
    if (!box || !stock || stock.assetType) { if (box) box.textContent = ''; return; }
    const quantity = Math.max(0, parseInt(document.getElementById('dqty-' + symbol)?.value, 10) || 0);
    if (!quantity) { box.textContent = ''; return; }
    const e = estimateOrderImpact(stock, quantity);
    box.innerHTML = `Wartość ~${formatZl(e.value, 0)} · prowizja ~${formatZl(e.commission, 2)} · kurs po zleceniu ~${e.impact >= 0.0005 ? `${(e.impact * 100).toFixed(2)}%` : '0%'} w Twoją niekorzyść`
        + `${e.impact >= 0.01 ? ' <span class="text-warn">— duże zlecenie przy małym obrocie (płynność!)</span>' : ''} · w obrocie ${e.freeFloat.toLocaleString('pl-PL')} akcji`;
    if (e.impact >= 0.01 && typeof unlockAcademyEntry === 'function') unlockAcademyEntry('wplyw');
}

function closeOpenStockDrawer() {
    if (!openStockDrawerSymbol) return;
    const previousDrawer = document.getElementById('drawer-' + openStockDrawerSymbol);
    if (previousDrawer) previousDrawer.remove();
    openStockDrawerSymbol = null;
}

function toggleStockDrawer(symbol) {
    if (openStockDrawerSymbol === symbol) {
        closeOpenStockDrawer();
        return;
    }
    closeOpenStockDrawer();
    openStockDrawerSymbol = symbol;
    renderStockDrawer(symbol);
}

function setMarketLevel(el, level) {
    currentMarketLevel = level;
    document.querySelectorAll('.market-level-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    if (typeof displayStocks === 'function')
        displayStocks(typeof getCurrentInputValues === 'function' ? getCurrentInputValues() : {});
}

// KPI rynku
function updateMarketKPIs() {
    if (typeof stocks === 'undefined') return;
    const active = stocks.filter(s => !s.isBankrupt && s.price > 0);
    const el = document.getElementById('mkpi-active');
    if (el) el.textContent = active.length;
    const getPct = s => s.previousPrice
        ? ((s.price - s.previousPrice) / s.previousPrice * 100) : 0;
    const sorted = [...active].sort((a, b) => getPct(b) - getPct(a));
    const fmt = v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
    if (sorted.length) {
        const g = sorted[0], l = sorted[sorted.length - 1];
        const gEl = document.getElementById('mkpi-top-gainer');
        const gName = document.getElementById('mkpi-top-gainer-name');
        const lEl = document.getElementById('mkpi-top-loser');
        const lName = document.getElementById('mkpi-top-loser-name');
        if (gEl) gEl.textContent = fmt(getPct(g));
        if (gName) gName.textContent = g.symbol;
        if (lEl) lEl.textContent = fmt(getPct(l));
        if (lName) lName.textContent = l.symbol;
    }
    // Najsilniejszy sektor dnia: średnia zmiana ceny spółek (każda spółka liczy się w każdym swoim sektorze).
    const sectorStats = {};
    active.filter(s => !s.assetType).forEach(s => {
        (Array.isArray(s.sector) ? s.sector : [s.sector]).forEach(sector => {
            const stat = sectorStats[sector] || (sectorStats[sector] = { sum: 0, count: 0 });
            stat.sum += getPct(s);
            stat.count++;
        });
    });
    const best = Object.entries(sectorStats)
        .filter(([, stat]) => stat.count >= 2)
        .map(([sector, stat]) => [sector, stat.sum / stat.count])
        .sort((a, b) => b[1] - a[1])[0];
    const tsEl = document.getElementById('mkpi-top-sector');
    const tsSubEl = document.getElementById('mkpi-top-sector-sub');
    if (tsEl) tsEl.textContent = best ? best[0] : '—';
    if (tsSubEl) tsSubEl.textContent = best ? `średnio ${fmt(best[1])} dziś` : 'brak danych';
}

// Topbar KPI: gotówka funduszu, NAV/JU, prywatne pieniądze gracza
function updateTopbarKPIs() {
    const fmt = new Intl.NumberFormat('pl-PL', {minimumFractionDigits:2, maximumFractionDigits:2});
    if (typeof playerCash !== 'undefined') {
        const v = fmt.format(playerCash);
        const isPrivate = typeof activeTradingAccount !== 'undefined' && activeTradingAccount === 'private';
        ['cash','cash-portfolio'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = (id === 'cash-portfolio' && isPrivate ? fmt.format(playerWallet?.cash || 0) : v) + ' zł';
        });
    }
    if (typeof playerFund !== 'undefined' && playerFund) {
        const navEl = document.getElementById('topbar-portfolio-value');
        if (navEl) navEl.textContent = getFundNav().toFixed(4) + ' zł';
        const walletEl = document.getElementById('topbar-daily-pnl');
        if (walletEl) walletEl.textContent = fmt.format(playerWallet.cash) + ' zł';
    }
    if (typeof currentDay !== 'undefined') {
        const d = document.getElementById('topbar-day');
        if (d) d.textContent = currentDay;
    }
    if (typeof marketTrend !== 'undefined') {
        const map = {
            bullish_strong:'Hossa silna', bullish_moderate:'Hossa umiarkowana',
            neutral:'Rynek neutralny', bearish_moderate:'Bessa umiarkowana', bearish_strong:'Bessa silna'
        };
        const el = document.getElementById('topbar-market-status');
        if (el) {
            el.textContent = map[marketTrend] || marketTrend;
            el.className = 'topbar-market-status' +
                (marketTrend.startsWith('bearish') ? ' bear' :
                 marketTrend === 'neutral' ? ' neutral' : '');
        }
    }
}

// Prywatne pieniądze gracza (XP zastąpione szkoleniami za pieniądze)
function updateXPBar() {
    if (typeof displayXP === 'function') displayXP();
}

function setDrawerMax(symbol) {
    if (typeof playerCash === 'undefined' || typeof stocks === 'undefined') return;
    const s = stocks.find(x => x.symbol === symbol);
    if (!s || s.price <= 0) return;
    const input = document.getElementById('dqty-' + symbol);
    if (input) input.value = Math.max(1, Math.floor(playerCash / s.price));
}

// Auto-odświeżanie co 3s
setInterval(function() {
    updateTopbarKPIs();
    updateMarketKPIs();
    updateXPBar();
}, 3000);
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() { updateTopbarKPIs(); updateMarketKPIs(); updateXPBar(); }, 800);
});