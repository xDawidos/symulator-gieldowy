// Sektorowe chipsy
function setSectorChip(el, sector) {
    document.querySelectorAll('.sector-chip').forEach(c => c.classList.remove('active'));
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
    const sectorCount = {};
    active.forEach(s => { sectorCount[s.sector] = (sectorCount[s.sector] || 0) + 1; });
    const top = Object.entries(sectorCount).sort((a,b) => b[1] - a[1])[0];
    const tsEl = document.getElementById('mkpi-top-sector');
    if (tsEl && top) tsEl.textContent = top[0] + ' (' + top[1] + ')';
}

// Topbar KPI
function updateTopbarKPIs() {
    const fmt = new Intl.NumberFormat('pl-PL', {minimumFractionDigits:2, maximumFractionDigits:2});
    if (typeof playerCash !== 'undefined') {
        const v = fmt.format(playerCash);
        ['cash','cash-portfolio'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = v + ' PLN';
        });
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

// XP bar
function updateXPBar() {
    if (typeof playerXP === 'undefined') return;
    const xpLevel = 1000;
    const pct = Math.min(100, (playerXP % xpLevel) / xpLevel * 100);
    const fill = document.getElementById('xp-bar-fill');
    if (fill) fill.style.width = pct + '%';
    const el = document.getElementById('player-xp');
    if (el) el.textContent = Math.floor(playerXP) + ' XP (Poz. ' + Math.floor(playerXP/xpLevel) + ')';
}

// Drawer w tabeli
function toggleStockDrawer(symbol) {
    const drawerId = 'drawer-' + symbol;
    const existing = document.getElementById(drawerId);
    if (existing) {
        if (existing.classList.contains('open')) {
            existing.classList.remove('open');
            existing.style.display = 'none';
        } else {
            existing.classList.add('open');
            existing.style.display = '';
        }
        return;
    }
    const row = document.querySelector('#stock-table-body tr[data-symbol="' + symbol + '"]');
    if (!row) return;
    const cols = row.querySelectorAll('td').length || 7;
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
            <input type="number" id="dqty-${symbol}" min="1" value="1">
            <span class="chip-max" onclick="setDrawerMax('${symbol}')">MAX</span>
          </div>
        </div>
        <div class="stock-drawer-actions-row">
          <button class="btn-buy"
            onclick="buyStock('${symbol}',document.getElementById('dqty-${symbol}').value)">Kup</button>
          <button class="btn-sell"
            onclick="sellStock('${symbol}',document.getElementById('dqty-${symbol}').value)">Sprzedaj</button>
          <button class="btn-ghost-icon" title="Wykres"
            onclick="openPriceChartModal('${symbol}')">📈</button>
          <button class="btn-ghost-icon" title="Raport"
            onclick="openCompanyReport && openCompanyReport('${symbol}')">📊</button>
        </div>
      </div>
    </div>`;
    dr.appendChild(td);
    row.after(dr);
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