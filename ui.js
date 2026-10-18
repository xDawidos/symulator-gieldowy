// =================================================================================
// ui.js: Interfejs: odświeżanie widoków, wykresy, okna i panele.
// Złączone pliki: ui-update.js, chart.js, ui.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## ui-update.js
// #################################################################################

// 0.14 T1c: filtr sektora — chipy pogrupowane z liczbą spółek (sektor główny), przełącznik „także segmenty poboczne”,
// podsektory wybranego sektora, osobny filtr „Typ”. Wybór zapamiętany w localStorage (jak inne ustawienia widoku).
const SECTOR_FILTER_KEY = 'gra_inwestycyjna_sector_filter';
let sectorFilterState = loadSectorFilterState();
let sectorFilterSignature = '';

function loadSectorFilterState() {
    try {
        const saved = JSON.parse(localStorage.getItem(SECTOR_FILTER_KEY) || 'null');
        if (saved && typeof saved === 'object') return { ...DEFAULT_SECTOR_FILTER, ...saved };
    } catch (e) { /* brak localStorage */ }
    return { ...DEFAULT_SECTOR_FILTER };
}

function saveSectorFilterState() {
    try { localStorage.setItem(SECTOR_FILTER_KEY, JSON.stringify(sectorFilterState)); } catch (e) { /* brak localStorage */ }
}

/** Zmiana filtra listy spółek (sektor / podsektor / poboczne / typ). */
function setSectorFilter(changes) {
    sectorFilterState = { ...sectorFilterState, ...changes };
    if ('sector' in changes) sectorFilterState.subsector = null; // nowy sektor — podsektory od nowa
    const select = document.getElementById('sector-filter');
    if (select) select.value = sectorFilterState.sector;
    saveSectorFilterState();
    sectorFilterSignature = '';
    if (typeof displayStocks === 'function') displayStocks(typeof getCurrentInputValues === 'function' ? getCurrentInputValues() : {});
}

// Zgodność: stare wywołania z chipów i kodu.
function setSectorChip(el, sector) {
    setSectorFilter({ sector });
}

/** Spółki widoczne w filtrze listy (bez spółek zależnych i upadłych). */
function getSectorFilterBaseList() {
    return (stocks || []).filter(stock => !stock.isBankrupt && !stock.isSubsidiaryOf && stock.assetType !== 'Startup');
}

/**
 * Wspólny renderer chipów (lista spółek i skaner). state: { sector, subsector, secondary, type },
 * onChange: nazwa funkcji globalnej przyjmującej obiekt zmian.
 */
function renderSectorFilterChips(list, state, onChange, options = {}) {
    const { sectors, subsectors } = getSectorFilterCounts(list, state);
    const call = changes => `${onChange}(${escapeHtml(JSON.stringify(changes))})`;
    const chip = (label, active, changes, title = '') => `<button type="button" class="sector-chip${active ? ' active' : ''}" aria-pressed="${active ? 'true' : 'false'}" ${title ? `title="${escapeHtml(title)}"` : ''} onclick="${call(changes)}">${label}</button>`;
    const groups = SECTOR_GROUPS.map(group => {
        const items = group.sectors.filter(name => sectors[name] > 0 || state.sector === name);
        if (!items.length) return '';
        const label = group.sectors.length > 1 ? `<span class="sector-group">${escapeHtml(group.name)}:</span>` : ''; // 0.14.5: grupa jako etykieta tekstowa
        return `${label}${items.map(name => chip(`${sectorIcon(name)}${escapeHtml(name)} <small>${sectors[name] || 0}</small>`, state.sector === name, { sector: name }, `${group.name}: ${name}`)).join('')}`;
    }).join('');
    const subNames = state.sector !== 'all' ? Object.keys(SECTORS[state.sector]?.subsectors || {}).filter(name => subsectors[name] > 0) : [];
    const subRow = subNames.length
        ? `<div class="sector-subchips">${chip('Cały sektor', !state.subsector, { subsector: null })}${subNames.map(name => chip(`${escapeHtml(name)} <small>${subsectors[name]}</small>`, state.subsector === name, { subsector: name })).join('')}</div>` : '';
    const typeOptions = INSTRUMENT_TYPES.filter(t => options.types ? options.types.includes(t.id) : true)
        .map(t => `<option value="${t.id}" ${state.type === t.id ? 'selected' : ''}>${t.label}</option>`).join('');
    const controls = `<div class="sector-filter-controls">
        <label class="text-sm" title="Domyślnie filtr pokazuje spółki, dla których to sektor główny (największy segment). Włączone: także spółki z tym segmentem pobocznym (◐).">
            <input type="checkbox" ${state.secondary ? 'checked' : ''} onchange="${onChange}({ secondary: this.checked })"> także segmenty poboczne</label>
        ${options.hideType ? '' : `<label class="text-sm">Typ <select onchange="${onChange}({ type: this.value })">${typeOptions}</select></label>`}
    </div>`;
    return { chips: chip('Wszystkie', state.sector === 'all', { sector: 'all' }) + groups, extra: subRow + controls };
}

function renderSectorFilters() {
    const chips = document.getElementById('sector-chips');
    const extra = document.getElementById('sector-filter-extra');
    if (!chips || typeof stocks === 'undefined') return;
    const list = getSectorFilterBaseList();
    const { chips: chipHtml, extra: extraHtml } = renderSectorFilterChips(list, sectorFilterState, 'setSectorFilter');
    const signature = chipHtml + extraHtml;
    if (signature === sectorFilterSignature) return;
    sectorFilterSignature = signature;
    chips.querySelectorAll('.sector-chip:not(.owned-chip), .sector-group').forEach(node => node.remove());
    chips.insertAdjacentHTML('beforeend', chipHtml);
    if (extra) extra.innerHTML = extraHtml;
    const select = document.getElementById('sector-filter');
    if (select) select.value = sectorFilterState.sector;
}

// =================================================================================
// 0.14.5 IKONY SVG (zamiast emoji w interfejsie) — te same rysunki co w Figmie „02 System”
// 24×24, kreska 1,8, kolor = currentColor. Bez <title> (tekst niesie etykieta / aria-label).
// =================================================================================
const UI_ICON_PATHS = {
    rynek: 'M4 19V5M4 19h16M8 15l3-4 3 2 5-6',
    bank: 'M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3l9 5H3z',
    panstwo: 'M4 21h16M6 21V11M18 21V11M10 21v-6h4v6M3 11h18L12 4z',
    miasto: 'M3 21h18M5 21V8l5-3v16M10 21V10h9v11M13 13h3M13 16h3',
    budownictwo: 'M3 21h18M6 21V9h12v12M4 9l8-6 8 6M10 13h4v8h-4z',
    firma: 'M4 21V5a1 1 0 0 1 1-1h9v17M14 9h5a1 1 0 0 1 1 1v11M8 8h2M8 12h2M8 16h2M3 21h18',
    klienci: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6',
    lombard: 'M12 3v18M7 7h7.5a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8',
    'szara-strefa': 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    poczta: 'M3 6h18v12H3zM3 7l9 6 9-6',
    akademia: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6',
    ranking: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
    ustawienia: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1',
    kraj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
    pauza: 'M8 5v14M16 5v14',
    start: 'M7 5l12 7-12 7z',
    menu: 'M4 7h16M4 12h16M4 17h16',
    dzwonek: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
    'chevron-down': 'M6 9l6 6 6-6',
    'chevron-right': 'M9 6l6 6-6 6',
    karta: 'M4 5h16v14H4zM8 9h8M8 13h8M8 17h5',
    news: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4',
    alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 11v6M12 7.5v.5',
    zamknij: 'M6 6l12 12M18 6L6 18',
    szukaj: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
    wykres: 'M7 4v16M7 8h-2v8h2M17 4v16M17 6h-2v6h2M12 7v12M12 10h2v5h-2',
    gwiazdka: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    kosz: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    sortuj: 'M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4',
    zapisz: 'M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7',
    korona: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5zM5 19h14',
    flaga: 'M5 21V4M5 4h11l-2 4 2 4H5',
    klodka: 'M6 11h12v10H6zM9 11V8a3 3 0 0 1 6 0v3',
    blokada: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8',
    akcjonariat: 'M12 3a9 9 0 1 0 9 9h-9zM14 3.2V10h6.8A9 9 0 0 0 14 3.2z',
    glosowanie: 'M4 11h16v10H4zM9 11V4h6v7M10 15h4',
    inwestycje: 'M3 21h18M5 21v-6h3v6M10.5 21V9h3v12M16 21v-9h3v9M4 9l6-5 4 3 6-4',
    raport: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
    lider: 'M12 3l3 6 6 .9-4.5 4.3 1 6.3L12 17.5 6.5 20.5l1-6.3L3 9.9 9 9z',
    grupa: 'M3 21V9h7v12M14 21V4h7v17M3 21h18M6 13h1M6 17h1M17 8h1M17 12h1M17 16h1',
    badania: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9'
};

const SECTOR_ICON_PATHS = {
    'Bankowość': UI_ICON_PATHS.bank,
    'Finanse': 'M3 6h18v12H3zM3 10h18M7 15h4',
    'Żywność': 'M6 11a6 4 0 0 1 12 0v8H6zM6 11a3 3 0 0 1 0-6h12a3 3 0 0 1 0 6',
    'Dobra konsumpcyjne': 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
    'Turystyka': 'M4 8h16v11H4zM9 8V5h6v3M9 12v3M15 12v3',
    'Media': 'M3 7h18v12H3zM8 3l4 4 4-4',
    'Gaming': 'M7 9h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.2 2l-1.3-1.5h-5l-1.3 1.5A3 3 0 0 1 3 14v-1a4 4 0 0 1 4-4zM8 11v4M6 13h4M15.5 12.5v.01M17.5 14.5v.01',
    'Przemysł': 'M3 21V10l5 3V10l5 3V10l5 3V5h3v16zM7 17h2M12 17h2M17 17h2',
    'Chemia': UI_ICON_PATHS.badania,
    'Energia': 'M13 2L4 14h7l-1 8 9-12h-7z',
    'Budowlany': 'M3 18h18M5 18v-3a7 7 0 0 1 14 0v3M10 8V5h4v3',
    'Transport i logistyka': 'M2 7h12v9H2zM14 10h4l3 3v3h-7M6 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM17 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    'Medycyna': 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
    'Badania': 'M9 3l4 2-3 6-4-2zM11 11l2 4M5 21h14M8 21a7 7 0 0 1 10-9',
    'Technologia': 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
    'Nieruchomości': 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
    'Obronność': 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    'Usługi': 'M15 4a5 5 0 0 0-4.6 6.9L4 17.3V20h2.7l6.4-6.4A5 5 0 0 0 20 9l-3 3-3-1-1-3 3-3a5 5 0 0 0-1-1z'
};

/** Kolor rangi giełdy (tokens.css: --exchange-*). */
const EXCHANGE_TOKEN = { JUNK: 'junk', BRONZE: 'bronze', SILVER: 'silver', GOLD: 'gold', PLATINUM: 'platinum', RUBY: 'ruby', EMERALD: 'emerald', DIAMOND: 'diamond', INTERNET: 'internet' };

function uiIcon(name, size = 16, extraClass = '') {
    const path = UI_ICON_PATHS[name] || SECTOR_ICON_PATHS[name];
    if (!path) return '';
    return `<svg class="ic${extraClass ? ' ' + extraClass : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
}

/** Ikona jako węzeł DOM (klon z pamięci) — szybciej niż innerHTML w wierszach tabeli odświeżanych co tick. */
const UI_ICON_NODES = {};
function uiIconNode(name, size = 16) {
    const key = name + '@' + size;
    let node = UI_ICON_NODES[key];
    if (!node) {
        const holder = document.createElement('span');
        holder.innerHTML = uiIcon(name, size);
        node = UI_ICON_NODES[key] = holder.firstElementChild;
    }
    return node ? node.cloneNode(true) : document.createTextNode('');
}

function sectorIcon(sector, size = 14) {
    return SECTOR_ICON_PATHS[sector] ? uiIcon(sector, size, 'ic-sector') : '';
}

function exchangeDot(key) {
    return `<span class="exchange-dot" style="--dot: var(--exchange-${EXCHANGE_TOKEN[key] || 'junk'})" aria-hidden="true"></span>`;
}

/** Usuwa emoji z napisów pochodzących z danych (nazwy giełd, faz) — w interfejsie zastępują je ikony. */
function stripEmoji(text) {
    return String(text ?? '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

/** T1b: „🏦 Bankowość · Bank komercyjny” — sektor główny z ikoną i podsektorem. */
function formatMainSectorLabel(stock) {
    const main = getMainSector(stock);
    if (!main) return '—';
    const sub = getMainSubsector(stock);
    return `${main}${sub ? ` · ${sub}` : ''}`.trim(); // 0.14.5: bez emoji (ikonę rysuje widok)
}

/** T2: mediana podsektora obok mediany sektora (gdy podsektor ma ≥ 3 spółki). */
function renderSubsectorMedianLine(stock, sectorMed) {
    const sub = getMainSubsector(stock);
    const subMed = typeof getSubsectorMedians === 'function' ? getSubsectorMedians(getMainSector(stock), sub) : null;
    if (!subMed) return '';
    const fx = v => Number.isFinite(v) ? v.toFixed(1) : '—';
    const pct = v => Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '—';
    return `<p class="text-xs text-muted cc-submed">Mediany: podsektor ${escapeHtml(sub)} (${subMed.count} spółek) — C/Z ${fx(subMed.pe)}, marża ${pct(subMed.margin)}; sektor ${escapeHtml(getMainSector(stock))} — C/Z ${fx(sectorMed?.pe)}, marża ${pct(sectorMed?.margin)}.</p>`;
}

/** T1b: „Struktura przychodów” — pasek segmentów (tylko przy ≥ 2 segmentach), segment główny wyróżniony. */
function renderSegmentBar(stock) {
    const segments = [...getStockSegments(stock)].sort((a, b) => b.share - a.share);
    if (segments.length < 2) return '';
    const parts = segments.map((seg, i) => `<span class="cc-seg${i === 0 ? ' cc-seg-main' : ''}" style="flex:${seg.share}" title="${escapeHtml(`${seg.sector}${seg.subsector ? ` · ${seg.subsector}` : ''}: ${(seg.share * 100).toFixed(0)}% przychodów`)}">${SECTORS[seg.sector]?.icon || ''} ${escapeHtml(seg.sector)} ${(seg.share * 100).toFixed(0)}%</span>`).join('');
    const discount = typeof getConglomerateDiscount === 'function' ? getConglomerateDiscount(stock) : 0;
    const synergy = typeof getSynergyMarginAdj === 'function' && getSynergyMarginAdj(stock) > 0;
    const notes = [discount > 0 ? `<span class="text-down" title="Rynek wycenia spółkę z niepowiązanymi segmentami taniej (−4% za segment, najwyżej −10%).">dyskonto konglomeratu −${(discount * 100).toFixed(0)}%</span>` : '',
        synergy ? '<span class="text-up" title="Segmenty z branż powiązanych: +1 pp marży.">synergia +1 pp marży</span>' : ''].filter(Boolean).join(' · ');
    return `<div class="cc-segments"><span class="text-xs text-muted">Struktura przychodów${notes ? ` · ${notes}` : ''}</span><div class="cc-seg-bar">${parts}</div></div>`;
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
            <button type="button" class="chip-max" onclick="setDrawerMax('${symbol}')">Maks.</button>
          </div>
        </div>
        <div class="stock-drawer-actions-row">
          <button class="btn-buy"
            onclick="buyStock('${symbol}',document.getElementById('dqty-${symbol}').value)">Kup</button>
          <button class="btn-sell"
            onclick="sellStock('${symbol}',document.getElementById('dqty-${symbol}').value)">Sprzedaj</button>
          <span class="drawer-tools">
          <button class="drawer-tool" title="Wykres ceny"
            onclick="showPriceHistoryModal('${symbol}')">${uiIcon('wykres', 16)}<span>Wykres</span></button>
          <button class="drawer-tool" title="Akcjonariat — kto ma jaki % akcji"
            onclick="openCompanyReport('${symbol}')">${uiIcon('akcjonariat', 16)}<span>Akcjonariat</span></button>
          ${isCompanyStock ? `<button class="drawer-tool" title="Walne zgromadzenie — akcjonariat, uchwały, głosowanie (większościowiec)"
            onclick="openGovernanceModal('${symbol}')">${uiIcon('glosowanie', 16)}<span>Walne</span></button>
          <button class="drawer-tool" title="Inwestycje spółki"
            onclick="openCompanyInvestments('${symbol}')">${uiIcon('inwestycje', 16)}<span>Inwestycje</span></button>` : ''}
          </span>
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
    const commission = typeof getBuyCommissionRate === 'function' ? getBuyCommissionRate(stock) : (typeof getMarketDef === 'function' ? (getMarketDef(marketId)?.commission || 0) : 0);
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
    box.innerHTML = `Wartość ~${formatZl(e.value, 0)} · prowizja ~${formatZl(e.commission, 2)} · kurs po zleceniu ~${e.impact >= 0.0005 ? `${formatNumberPl(e.impact * 100)}%` : '0%'} w Twoją niekorzyść`
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
    document.querySelectorAll('.market-level-tab').forEach(t => { t.classList.remove('active'); t.removeAttribute('aria-current'); });
    el.classList.add('active');
    el.setAttribute('aria-current', 'true');
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
    if (tsSubEl) tsSubEl.textContent = best ? formatPct(best[1] / 100) : '';
}

// Topbar KPI: gotówka funduszu, NAV/JU, prywatne pieniądze gracza
function updateTopbarKPIs() {
    const fmt = new Intl.NumberFormat('pl-PL', {minimumFractionDigits:2, maximumFractionDigits:2});
    if (typeof playerCash !== 'undefined') {
        const v = fmt.format(playerCash);
        const isPrivate = typeof activeTradingAccount !== 'undefined' && activeTradingAccount === 'private';
        ['cash','cash-portfolio'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = (id === 'cash-portfolio' && isPrivate ? fmt.format(playerWallet?.cash || 0) : v) + ' PLN';
        });
    }
    if (typeof playerFund !== 'undefined' && playerFund) {
        const navEl = document.getElementById('topbar-portfolio-value');
        if (navEl) navEl.textContent = formatNav(getFundNav());
        const walletEl = document.getElementById('topbar-daily-pnl');
        if (walletEl) walletEl.textContent = formatZl(playerWallet.cash);
        const trustEl = document.getElementById('topbar-trust');
        if (trustEl && Number.isFinite(playerFund.trust)) {
            const trust = Math.round(playerFund.trust);
            trustEl.textContent = `${trust}/100`;
            trustEl.classList.toggle('text-down', trust < 40);
        }
    }
    updateTopbarBrand();
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

/** 0.14.5: nazwa funduszu w menu i w karcie przeglądarki, data gry na pasku. */
function updateTopbarBrand() {
    if (typeof document === 'undefined') return;
    const fundName = (typeof playerProfile !== 'undefined' && playerProfile?.fundName) || '';
    const side = document.getElementById('sidebar-fund-name');
    if (side && fundName && side.textContent !== fundName) side.textContent = fundName;
    const title = fundName ? `Capital Quest — ${fundName}` : 'Capital Quest';
    if (document.getElementById('topbar') && document.title !== title) document.title = title;
    const dateEl = document.getElementById('topbar-date');
    const quarter = typeof macro !== 'undefined' && macro ? Math.max(0, Number(macro.quarter) || 0) : null;
    if (dateEl && Number.isFinite(quarter)) {
        const label = `Rok ${Math.floor(quarter / 4) + 1} · kw. ${(quarter % 4) + 1}`;
        if (dateEl.textContent !== label) dateEl.textContent = label;
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
    // 0.13.1 (B1): max = min(akcje dostępne w obrocie, gotówka / cena z prowizją) — dla aktywnego konta.
    const max = typeof getMaxBuyQuantity === 'function' ? getMaxBuyQuantity(s) : Math.floor(playerCash / s.price);
    if (input) input.value = Math.max(0, max);
    if (max <= 0) showToast(getAvailableShares(s) <= 0 ? 'Brak akcji dostępnych na rynku — wszystkie w wolnym obrocie są u inwestorów.' : 'Za mało gotówki na choćby jedną akcję (z prowizją).', 'warning');
    if (typeof updateDrawerImpact === 'function') updateDrawerImpact(symbol);
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

// #################################################################################
// ## chart.js
// #################################################################################

// --- Funkcje związane z wykresem historii cen ---

/**
 * Agreguje szczegółowe świece (np. 15s) w większe interwały (np. 1m).
 * @param {Array} candles - Tablica obiektów świec do przetworzenia.
 * @param {number} interval - Docelowy interwał w milisekundach.
 * @returns {Array} - Nowa tablica z zagregowanymi świecami.
 */
function aggregateCandles(candles, interval) {
    const baseInterval = 15000;
    if (interval < baseInterval * 1.5 || candles.length === 0) {
        return candles;
    }

    const result = [];
    const groupByKey = {};

    for (const candle of candles) {
        const key = Math.floor(candle.time / interval) * interval;
        if (!groupByKey[key]) {
            groupByKey[key] = {
                time: key,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
            };
        } else {
            groupByKey[key].high = Math.max(groupByKey[key].high, candle.high);
            groupByKey[key].low = Math.min(groupByKey[key].low, candle.low);
            groupByKey[key].close = candle.close;
        }
    }

    for (const key in groupByKey) {
        result.push(groupByKey[key]);
    }
    
    return result;
}

/**
 * Przerzedza dane dla wykresu liniowego na podstawie czasu.
 * @param {Array} lineHistory - Pełna historia cen jako obiekty {time, price}.
 * @param {number} interval - Docelowy interwał w milisekundach.
 * @returns {Array} - Nowa, przefiltrowana tablica cen.
 */
function filterLineData(lineHistory, interval) {
    if (interval <= 1000 || lineHistory.length === 0) {
        return lineHistory.map(p => p.price);
    }
    
    const filtered = [];
    let lastTime = 0;

    for (const point of lineHistory) {
        if (point.time >= lastTime + interval) {
            filtered.push(point.price);
            lastTime = point.time;
        }
    }
    
    if (lineHistory.length > 0) {
        const lastPoint = lineHistory[lineHistory.length - 1];
        if (!filtered.includes(lastPoint.price)) {
            filtered.push(lastPoint.price);
        }
    }

    return filtered.length > 1 ? filtered : lineHistory.map(p => p.price);
}

/**
 * Rysuje kolorowy, segmentowy wykres liniowy.
 */
function drawLineChart(data, svg, getX, getY) {
    const svgNs = "http://www.w3.org/2000/svg";
    if (data.length < 2) return;

    // 0.14.5: kolory z tokenów (style, bo atrybuty SVG nie przyjmują var())
    const colorProfit = 'var(--color-chart-up)';
    const colorLoss = 'var(--color-chart-down)';
    const colorNeutral = 'var(--color-text-muted)';

    for (let i = 1; i < data.length; i++) {
        const prevPrice = data[i - 1];
        const currentPrice = data[i];

        let segmentColor = colorNeutral;
        if (currentPrice > prevPrice) segmentColor = colorProfit;
        else if (currentPrice < prevPrice) segmentColor = colorLoss;

        const x1 = getX(i - 1, data.length);
        const y1 = getY(prevPrice);
        const x2 = getX(i, data.length);
        const y2 = getY(currentPrice);

        if (![x1, y1, x2, y2].some(isNaN)) {
            const line = document.createElementNS(svgNs, "line");
            line.setAttribute("x1", x1.toString());
            line.setAttribute("y1", y1.toString());
            line.setAttribute("x2", x2.toString());
            line.setAttribute("y2", y2.toString());
            line.style.stroke = segmentColor;
            line.setAttribute("stroke-width", "2");
            svg.appendChild(line);
        }
    }
}

/**
 * Rysuje wykres świecowy.
 */
function drawCandlestickChart(history, svg, chartWidth, getX, getY) {
    const svgNs = "http://www.w3.org/2000/svg";
    if (history.length < 1) return;

    const candleWidth = Math.max(2, (chartWidth / history.length) * 0.7);

    history.forEach((candle, index) => {
        if (!candle) return;
        
        const x = getX(index, history.length);
        const yOpen = getY(candle.open);
        const yClose = getY(candle.close);
        const yHigh = getY(candle.high);
        const yLow = getY(candle.low);
        
        const isBullish = candle.close >= candle.open;
        const color = isBullish ? 'var(--color-chart-up)' : 'var(--color-chart-down)';

        const wick = document.createElementNS(svgNs, "line");
        wick.setAttribute("x1", x.toString()); wick.setAttribute("y1", yHigh.toString());
        wick.setAttribute("x2", x.toString()); wick.setAttribute("y2", yLow.toString());
        wick.style.stroke = color; wick.setAttribute("stroke-width", "1");
        svg.appendChild(wick);
        
        const body = document.createElementNS(svgNs, "rect");
        body.setAttribute("x", (x - candleWidth / 2).toString()); body.setAttribute("y", (isBullish ? yClose : yOpen).toString());
        body.setAttribute("width", candleWidth.toString()); body.setAttribute("height", Math.max(1, Math.abs(yOpen - yClose)).toString());
        // świeca rosnąca pusta w środku, malejąca pełna — kierunek widać nie tylko po kolorze
        body.style.fill = isBullish ? 'var(--color-bg-surface)' : color;
        body.style.stroke = color;
        body.setAttribute("stroke-width", "1");
        svg.appendChild(body);
    });
}

/**
 * Oblicza optymalny zakres i krok dla osi Y wykresu.
 */
function calculateNiceYAxisRange(minPrice, maxPrice) {
    let rangeMin = minPrice;
    let rangeMax = maxPrice;
    
    const dataRange = rangeMax - rangeMin;
    const avgPrice = (rangeMax + rangeMin) / 2;
    const minVisibleRange = Math.max(avgPrice * 0.2, 2.0);

    if (dataRange < minVisibleRange) {
        const center = (rangeMax + rangeMin) / 2;
        rangeMin = center - (minVisibleRange / 2);
        rangeMax = center + (minVisibleRange / 2);
    }

    const range = rangeMax - rangeMin;
    if (range <= 0) {
        return { min: Math.floor(minPrice) - 1, max: Math.ceil(maxPrice) + 1, step: 1 };
    }
    const targetTickCount = 4;
    const roughStep = range / (targetTickCount - 1);
    const exponent = Math.floor(Math.log10(roughStep));
    const powerOf10 = Math.pow(10, exponent);
    const magnitude = roughStep / powerOf10;
    let niceMagnitude;
    if (magnitude < 1.5) niceMagnitude = 1;
    else if (magnitude < 3) niceMagnitude = 2;
    else if (magnitude < 7) niceMagnitude = 5;
    else niceMagnitude = 10;
    const niceStep = niceMagnitude * powerOf10;
    const niceMin = Math.floor(rangeMin / niceStep) * niceStep;
    const niceMax = Math.ceil(rangeMax / niceStep) * niceStep;
    const finalStep = niceStep > 0 ? niceStep : 1;
    
    return { min: niceMin, max: (niceMax > niceMin ? niceMax : niceMin + finalStep), step: finalStep };
}

/**
 * Główna funkcja renderująca wykres, która decyduje, jaki typ wykresu narysować.
 */
// N5: wydarzenia spółki (raporty, dywidendy, przejęcia, korekty) jako znaczniki na wykresie.
function addChartEvent(stock, icon, label) {
    if (!stock) return;
    if (!Array.isArray(stock.chartEvents)) stock.chartEvents = [];
    stock.chartEvents.push({ time: Date.now(), icon, label });
    if (stock.chartEvents.length > 20) stock.chartEvents.shift();
}

function drawChartEvents(stock, svg, historyForMapping, getX, padding, chartHeight) {
    const svgNs = "http://www.w3.org/2000/svg";
    const tooltip = document.getElementById('chart-tooltip');
    const first = historyForMapping[0]?.time;
    // 0.14.2 P7: znaczniki w tym samym miejscu wykresu (ten sam punkt albo < 10 px) łączymy w jeden z liczbą i listą w dymku.
    const groups = [];
    for (const event of stock.chartEvents || []) {
        if (!first || event.time < first) continue;
        let index = 0, best = Infinity;
        historyForMapping.forEach((point, i) => { const d = Math.abs((point.time || 0) - event.time); if (d < best) { best = d; index = i; } });
        const x = getX(index, historyForMapping.length);
        const group = groups.find(g => Math.abs(g.x - x) < 10);
        if (group) group.events.push(event); else groups.push({ x, events: [event] });
    }
    for (const group of groups) {
        const x = group.x;
        const event = { icon: group.events.length > 1 ? `${group.events[0].icon}×${group.events.length}` : group.events[0].icon, label: group.events.map(e => `${e.icon} ${e.label}`).join(' · ') };
        const line = document.createElementNS(svgNs, "line");
        line.setAttribute("x1", x); line.setAttribute("x2", x);
        line.setAttribute("y1", padding.top); line.setAttribute("y2", padding.top + chartHeight);
        line.setAttribute("stroke", "#8b949e"); line.setAttribute("stroke-dasharray", "3,3"); line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
        const label = document.createElementNS(svgNs, "text");
        label.setAttribute("x", x); label.setAttribute("y", padding.top + 12);
        label.setAttribute("font-size", "13"); label.setAttribute("text-anchor", "middle");
        label.textContent = event.icon;
        label.style.cursor = "help";
        if (tooltip) {
            label.addEventListener('mouseover', e => { tooltip.textContent = event.label; tooltip.style.display = 'block'; tooltip.style.left = `${e.pageX + 15}px`; tooltip.style.top = `${e.pageY + 15}px`; });
            label.addEventListener('mouseout', () => { tooltip.style.display = 'none'; });
        }
        svg.appendChild(label);
    }
}

function renderChartSVGForStock(stock, svgAreaElement, width, height) {
    svgAreaElement.innerHTML = '';
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.style.display = "block";

    const padding = { top: 10, bottom: 20, left: 45, right: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    let dataToDraw, minPrice, maxPrice, historyForMapping;

    if (playerChartSettings.type === 'candlestick') {
        const fullHistory = (stock.candlestickHistory || []).concat(stock.currentCandle || []);
        dataToDraw = aggregateCandles(fullHistory, playerChartSettings.candleInterval);
        historyForMapping = dataToDraw; // Do mapowania transakcji użyjemy zagregowanych danych
        if (dataToDraw.length === 0) {
            svgAreaElement.innerHTML = `<p style="text-align: center; padding-top: 60px;">Brak danych do narysowania wykresu.</p>`;
            return;
        }
        minPrice = Math.min(...dataToDraw.map(c => c.low));
        maxPrice = Math.max(...dataToDraw.map(c => c.high));
    } else { // 'line'
        historyForMapping = stock.lineHistory || []; // Do mapowania transakcji użyjemy pełnej, surowej historii
        dataToDraw = filterLineData(historyForMapping, playerChartSettings.lineInterval);
        if (dataToDraw.length === 0) {
            svgAreaElement.innerHTML = `<p style="text-align: center; padding-top: 60px;">Brak danych do narysowania wykresu.</p>`;
            return;
        }
        minPrice = Math.min(...dataToDraw);
        maxPrice = Math.max(...dataToDraw);
    }

    const yAxis = calculateNiceYAxisRange(minPrice, maxPrice);
    const getX = (index, historyLength) => padding.left + (index / Math.max(1, historyLength - 1)) * (chartWidth - 20) + 10;
    const getY = (price) => padding.top + chartHeight - ((price - yAxis.min) / Math.max(0.1, yAxis.max - yAxis.min)) * chartHeight;

    // Rysowanie siatki i osi Y
    if (yAxis.step > 0) {
        for (let priceVal = yAxis.min; priceVal <= yAxis.max; priceVal += yAxis.step) {
            if (isNaN(priceVal)) continue;
            const y = getY(priceVal);
            const gridLine = document.createElementNS(svgNs, "line");
            gridLine.setAttribute("x1", padding.left.toString());
            gridLine.setAttribute("y1", y.toString());
            gridLine.setAttribute("x2", (padding.left + chartWidth).toString());
            gridLine.setAttribute("y2", y.toString());
            gridLine.style.stroke = 'var(--color-border-subtle)';
            gridLine.setAttribute("stroke-dasharray", "2,2");
            svg.appendChild(gridLine);
            const textLabel = document.createElementNS(svgNs, "text");
            textLabel.setAttribute("x", (padding.left - 8).toString());
            textLabel.setAttribute("y", (y + 4).toString());
            textLabel.setAttribute("font-size", "11");
            textLabel.setAttribute("text-anchor", "end");
            textLabel.setAttribute("class", "chart-axis-label");
            textLabel.textContent = formatNumberPl(priceVal, 2);
            svg.appendChild(textLabel);
        }
    }
    
    // Wywołaj odpowiednią funkcję rysującą
    if (playerChartSettings.type === 'candlestick') {
        drawCandlestickChart(dataToDraw, svg, chartWidth, getX, getY);
    } else {
        drawLineChart(dataToDraw, svg, getX, getY);
    }
    
    drawChartEvents(stock, svg, historyForMapping, getX, padding, chartHeight); // N5

    // --- SEKCJA RYSOWANIA ZNACZNIKÓW TRANSAKCJI (z niestandardowym dymkiem) ---
    const tooltip = document.getElementById('chart-tooltip');

    (stock.playerTransactions || []).forEach(tx => {
        if (tx.type === 'buy') {
            let closestPointIndex = -1;
            let minTimeDiff = Infinity;

            historyForMapping.forEach((point, index) => {
                const timeDiff = Math.abs((point.time || 0) - tx.time);
                if (timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    closestPointIndex = index;
                }
            });

            if (closestPointIndex !== -1) {
                const x = getX(closestPointIndex, historyForMapping.length);
                const y = getY(tx.price);

                const marker = document.createElementNS(svgNs, "circle");
                marker.setAttribute("cx", x.toString());
                marker.setAttribute("cy", y.toString());
                marker.setAttribute("r", "5");
                marker.setAttribute("fill", "rgba(0, 123, 255, 0.7)");
                marker.setAttribute("stroke", "white");
                marker.setAttribute("stroke-width", "1.5");
                marker.style.cursor = "pointer";
                svg.appendChild(marker);

                marker.addEventListener('mouseover', (event) => {
                    tooltip.innerHTML = `Kupiono: ${tx.quantity} szt. po ${tx.price.toFixed(2)} PLN`;
                    tooltip.style.display = 'block';
                    tooltip.style.left = `${event.pageX + 15}px`;
                    tooltip.style.top = `${event.pageY + 15}px`;
                });

                marker.addEventListener('mousemove', (event) => {
                    tooltip.style.left = `${event.pageX + 15}px`;
                    tooltip.style.top = `${event.pageY + 15}px`;
                });

                marker.addEventListener('mouseout', () => {
                    tooltip.style.display = 'none';
                });
            }
        }
    });
    // --- KONIEC SEKCJI ---
    if (stock.priceAlerts) {
        // Linia alertu zakupu (zielona)
        if (stock.priceAlerts.buy !== null) {
            const y = getY(stock.priceAlerts.buy);
            const line = document.createElementNS(svgNs, "line");
            line.setAttribute("x1", padding.left.toString());
            line.setAttribute("y1", y.toString());
            line.setAttribute("x2", (padding.left + chartWidth).toString());
            line.setAttribute("y2", y.toString());
            line.setAttribute("stroke", "#28a745");
            line.setAttribute("stroke-width", "1.5");
            line.setAttribute("stroke-dasharray", "4,4");
            svg.appendChild(line);
        }
        // Linia alertu sprzedaży (czerwona)
        if (stock.priceAlerts.sell !== null) {
            const y = getY(stock.priceAlerts.sell);
            const line = document.createElementNS(svgNs, "line");
            line.setAttribute("x1", padding.left.toString());
            line.setAttribute("y1", y.toString());
            line.setAttribute("x2", (padding.left + chartWidth).toString());
            line.setAttribute("y2", y.toString());
            line.setAttribute("stroke", "#dc3545");
            line.setAttribute("stroke-width", "1.5");
            line.setAttribute("stroke-dasharray", "4,4");
            svg.appendChild(line);
        }
    }
    
    svgAreaElement.appendChild(svg);
}

// --- Pozostałe funkcje pliku ---

function closePriceChartModal() {
    const modal = document.getElementById('price-chart-modal');
    if (modal) modal.style.display = 'none';
    currentlyDisplayedChartSymbol = null;
}

function renderOwnershipPieChart(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const container = document.getElementById('pie-chart-container');
    const legend = document.getElementById('pie-chart-legend');
    container.innerHTML = '';
    legend.innerHTML = '';

    // 1. Zbieranie danych o akcjonariuszach — 0.13.1 (B3): pełny rejestr (fundusze, boty, banki, ETF-y, holdingi…),
    // a „Na rynku” to akcje naprawdę dostępne do kupienia (getAvailableShares), nie reszta po kilku posiadaczach.
    const KIND_COLORS = { player: '#007bff', wallet: '#3cc9ff', insiders: '#8a63d2', state: '#663399', city: '#20c997', bank: '#198754', etf: '#0dcaf0', botFund: '#b8860b', holding: '#17a2b8', company: '#6610f2' };
    const aiColors = ['#dc3545', '#ffc107', '#28a745', '#6f42c1', '#fd7e14', '#e83e8c'];
    let aiColorIndex = 0;
    const owners = getShareholders(stock).map(holder => ({
        name: holder.kind === 'player' ? `💼 ${holder.name}` : holder.kind === 'wallet' ? '🧍 Ty (prywatnie)' : holder.kind === 'bank' ? `🏦 ${holder.name}` : holder.kind === 'etf' ? `📦 ETF ${holder.name}` : holder.kind === 'insiders' ? '👔 Zarząd i pracownicy' : holder.kind === 'state' ? '🏛️ Skarb Państwa' : holder.name,
        shares: holder.shares,
        color: KIND_COLORS[holder.kind] || aiColors[aiColorIndex++ % aiColors.length]
    }));
    const treasuryShares = Number(stock.treasuryShares) || 0;
    if (treasuryShares > 0) owners.push({ name: '🔁 Akcje własne spółki', shares: treasuryShares, color: '#ff5733' });
    const availableShares = getAvailableShares(stock);
    if (availableShares > 0) owners.push({ name: '🛒 Na rynku (do kupienia)', shares: availableShares, color: '#6c757d' });
    const unlisted = stock.totalShares - owners.reduce((sum, owner) => sum + owner.shares, 0);
    if (unlisted >= 1) owners.push({ name: 'Rozproszeni akcjonariusze', shares: unlisted, color: '#adb5bd' });

    owners.sort((a, b) => b.shares - a.shares);

    // 3. Rysowanie wykresu SVG (bez zmian)
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    // Kliny rysowane grubym obrysem okręgu wychodzą poza koło — przycinamy SVG do koła.
    svg.style.borderRadius = '50%';
    svg.style.overflow = 'hidden';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    container.appendChild(svg);
    
    const radius = 15.9;
    const circumference = 2 * Math.PI * radius;
    let cumulativeAngle = 0;

    owners.forEach(owner => {
        const percentage = owner.shares / Math.max(1, stock.totalShares); // cały akcjonariat (także Skarb Państwa i zarząd)
        if (percentage <= 0) return;

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("r", radius);
        circle.setAttribute("cx", "16");
        circle.setAttribute("cy", "16");
        circle.setAttribute("fill", "transparent");
        circle.setAttribute("stroke", owner.color);
        circle.setAttribute("stroke-width", "32");
        circle.setAttribute("stroke-dasharray", `${percentage * circumference} ${circumference}`);
        circle.setAttribute("transform", `rotate(${cumulativeAngle - 90}, 16, 16)`);
        svg.appendChild(circle);
        
        cumulativeAngle += percentage * 360;

        // 4. Tworzenie legendy (bez zmian)
        const legendItem = document.createElement('div');
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.justifyContent = 'center';
        legendItem.style.marginBottom = '5px';
        
        const colorBox = document.createElement('span');
        colorBox.className = 'pie-legend-color-box';
        colorBox.style.width = '12px';
        colorBox.style.height = '12px';
        colorBox.style.backgroundColor = owner.color;
        colorBox.style.marginRight = '8px';
        colorBox.style.border = '1px solid #333';

        const ownerLabel = document.createElement('span');
        const ownerPercentTotal = (owner.shares / stock.totalShares * 100).toFixed(2);
        ownerLabel.textContent = `${owner.name}: ${owner.shares.toLocaleString('pl-PL')} szt. (${ownerPercentTotal}%)`;
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(ownerLabel);
        legend.appendChild(legendItem);
    });

    // Informacja o udziałach państwa
    if (stock.isStateOwned && (stock.stateOwnershipPct || 0) > 0) {
        const statePercent = (stock.stateOwnershipPct * 100).toFixed(2);
        const legendItem = document.createElement('div');
        legendItem.innerHTML = `<hr><p style="font-weight: bold; margin-bottom: 5px; text-align: center;">🏛️ Skarb Państwa kontroluje ${statePercent}% akcji (poza wolnym obrotem)</p>`;
        legend.appendChild(legendItem);
    }
}

// #################################################################################
// ## ui.js
// #################################################################################

// ui.js (Połączony)
// Funkcje odpowiedzialne za aktualizację i wyświetlanie interfejsu użytkownika

let ownedOnlyFilter = false; // U2: filtr „tylko posiadane” (fundusz lub konto prywatne)
let startupPanelCollapsed = true; // U2: domyślnie zwinięty (stan zapamiętany w localStorage)

function getCurrentInputValues() {
    const values = {};
    stocks.forEach(stock => {
        const inputElement = document.getElementById(`quantity-${stock.symbol}`);
        if (inputElement) {
            values[stock.symbol] = inputElement.value;
        }
    });
    return values;
}

function displayCash() {
    // Gotówka FUNDUSZU (pieniądze klientów); prywatne pieniądze gracza pokazuje displayXP.
    const cashElement = document.getElementById('cash');
    if (cashElement) {
        cashElement.textContent = formatZl(playerCash);
    }
    if (typeof displayXP === 'function') displayXP();
}



const STOCK_TABLE_COLS = 6; // 0.14.1 R6: bez kolumny „Sektor”

function displayStocks(previousInputValues = {}) {
  const liveStockTableBody = document.getElementById('stock-table-body');
  if (!liveStockTableBody) return;

  // Panel kupna (drawer) przenosimy między odświeżeniami tabeli zamiast budować go od nowa:
  // wpisana ilość, kursor i kliknięcia w przyciski nie giną co sekundę.
  const openDrawer = typeof openStockDrawerSymbol !== 'undefined' && openStockDrawerSymbol
    ? document.getElementById(`drawer-${openStockDrawerSymbol}`)
    : null;
  const drawerInput = openDrawer ? openDrawer.querySelector('input') : null;
  const drawerState = drawerInput ? {
    focused: document.activeElement === drawerInput,
    selectionStart: drawerInput.selectionStart,
    selectionEnd: drawerInput.selectionEnd
  } : null;
  if (openDrawer) openDrawer.remove();

  // Nagłówek ceny (strzałki sortowania)
  const priceHeader = document.getElementById('price-header-cell');
  if (priceHeader) {
    // 0.14.5: sortowanie jako przycisk w nagłówku (klawiatura) + aria-sort
    const sortLabel = currentSortState === 'price_asc' ? 'Kurs ▲' : currentSortState === 'price_desc' ? 'Kurs ▼' : 'Kurs';
    const sortAria = currentSortState === 'price_asc' ? 'ascending' : currentSortState === 'price_desc' ? 'descending' : 'none';
    const sortBtn = priceHeader.querySelector('.th-sort');
    if (sortBtn) { if (sortBtn.textContent !== sortLabel) sortBtn.textContent = sortLabel; }
    else priceHeader.textContent = sortLabel;
    priceHeader.setAttribute('aria-sort', sortAria);
  }

  if (typeof renderSectorFilters === 'function') renderSectorFilters();

  // Filtrowanie spółek do wyświetlenia
  // 0.14 T1c: sektor główny (albo także poboczne), podsektor i typ instrumentu.
  // 0.14.2 P3: córki z faktów (isSubsidiaryOf) — zawsze pod widoczną matką, niezależnie od filtra i poziomu giełdy.
  const childrenByParent = new Map();
  for (const stock of stocks) if (stock.isSubsidiaryOf && !stock.isBankrupt) {
    if (!childrenByParent.has(stock.isSubsidiaryOf)) childrenByParent.set(stock.isSubsidiaryOf, []);
    childrenByParent.get(stock.isSubsidiaryOf).push(stock);
  }
  let baseStocksToDisplay = stocks.filter(stock => stockMatchesSectorFilter(stock, sectorFilterState));

  if (ownedOnlyFilter) baseStocksToDisplay = baseStocksToDisplay.filter(isStockOwnedByPlayer);
  // D1: spółki rynków internetowych tylko w zakładce „Internet”.
  const internetTab = typeof currentMarketLevel !== 'undefined' && currentMarketLevel === 'INTERNET';
  if (typeof isInternetMarketStock === 'function') baseStocksToDisplay = baseStocksToDisplay.filter(stock => isInternetMarketStock(stock) === internetTab);

  // 0.14.5: wiersze budujemy w odpiętym tbody (szybciej niż wstawianie do żywej tabeli),
  // na końcu przenosimy je jednym ruchem (replaceChildren) — bez odczytów układu, przewinięcie zostaje.
  const stockTableBody = document.createElement('tbody');
  // Zakładka poziomu rynku (ui-update.js: setMarketLevel) — pokazujemy tylko wybraną giełdę.
  const sortedExchanges = Object.keys(exchanges)
    .filter(key => typeof currentMarketLevel === 'undefined' || currentMarketLevel === 'ALL' || key === currentMarketLevel)
    .sort((a, b) => exchanges[a].level - exchanges[b].level);
  // Córka trafia pod matkę, gdy matka jest w tym widoku; inaczej (matka poza filtrem lub poziomem) stoi samodzielnie.
  const shownParents = new Set(baseStocksToDisplay.filter(stock => !stock.isSubsidiaryOf && (internetTab || sortedExchanges.includes(stock.exchange))).map(stock => stock.symbol));
  baseStocksToDisplay = baseStocksToDisplay.filter(stock => !stock.isSubsidiaryOf || !shownParents.has(stock.isSubsidiaryOf));
  const hasAnalystSkill = getSkillLevel('financialAnalyst') > 0;

  // --- Funkcja pomocnicza do renderowania wiersza ---
  const renderStockRow = (stock, isSubsidiary = false, parentSymbol = null) => {
    const exchangeData = exchanges[stock.exchange];
    const hasAccess = exchangeData ? exchangeData.level <= playerAccessLevel : false;
    const isLocked = stock.isTradeLocked;

    const row = stockTableBody.insertRow();
    row.dataset.symbol = stock.symbol;
    row.classList.add('stock-row');
    row.dataset.level = stock.exchange || 'ALL';
    row.classList.add('clickable');

    row.addEventListener('click', e => {
      if (
        !e.target.closest('button') &&
        !e.target.closest('input') &&
        !e.target.closest('.subsidiary-toggle')
      ) {
        toggleStockDrawer(stock.symbol);
      }
    });

    if (stock.isBankrupt) {
      row.classList.add('bankrupt-row');
      row.title = 'BANKRUCTWO!';
    } else if (isLocked) {
      row.classList.add('locked-row');
      row.title = 'HANDEL WSTRZYMANY';
    } else if (stock.financialHealth <= -4) {
      row.classList.add('warning-row');
      row.title = 'UWAGA: Spółka jest na krawędzi bankructwa!';
    }

    if (isSubsidiary) {
      row.classList.add('subsidiary-row');
      if (parentSymbol) row.classList.add(`subsidiary-of-${parentSymbol}`);
      row.style.display = 'none';
    }

    row.classList.add(`exchange-group-${stock.exchange}`);

    const ownedPortfolio = typeof activeTradingAccount !== 'undefined' && activeTradingAccount === 'private' ? (playerWallet?.portfolio || {}) : playerPortfolio;
    const sharesOwned = ownedPortfolio[stock.symbol]?.shares || 0;
    const playerSharePct =
      stock.totalShares > 0 ? (sharesOwned / stock.totalShares) * 100 : 0;

    const availableShares = getAvailableShares(stock);

    const changePct = getStockChangePct(stock, 1) * 100; // U2: zmiana tygodniowa w czasie gry

    const changeClass = changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat';
    const changeSign = changePct > 0 ? '+' : '';
    const mainSector = getMainSector(stock);
    // T1c: ◐ — spółka widoczna dzięki segmentowi pobocznemu (przełącznik „także segmenty poboczne”).
    const viaSecondary = sectorFilterState.secondary && sectorFilterState.sector !== 'all' && mainSector !== sectorFilterState.sector;
    const activity = getStockActivityLabel(stock); // 0.14.1 R6: działalność pod nazwą zamiast kolumny „Sektor”
    const primarySector = mainSector ? `${viaSecondary ? `◐ ${sectorFilterState.sector} (poboczny) · ` : ''}${activity || mainSector}` : 'Rynek';
    const availabilityPct =
      stock.totalShares > 0
        ? Math.max(
            0,
            Math.min(100, (availableShares / stock.totalShares) * 100)
          )
        : 0;

    const isDisabled =
      !hasAccess || isLocked || stock.isBeingMerged || stock.canBeTraded === false;

    // KOMÓRKA 1: SPÓŁKA
    const nameCell = row.insertCell();
    nameCell.classList.add('stock-company-cell');

    const identityWrap = document.createElement('div');
    identityWrap.className = 'stock-identity';

    const topLine = document.createElement('div');
    topLine.className = 'stock-name-line';
    if (isSubsidiary) topLine.style.paddingLeft = '25px';

    if (!isSubsidiary && (childrenByParent.get(stock.symbol) || []).length > 0) {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      const expanded = stock.isSubsidiaryExpanded !== false; // 0.14.2 P3: domyślnie rozwinięte
      toggleBtn.appendChild(uiIconNode(expanded ? 'chevron-down' : 'chevron-right', 14));
      toggleBtn.setAttribute('aria-expanded', String(expanded));
      toggleBtn.setAttribute('aria-label', `Spółki zależne ${stock.name}`);
      toggleBtn.classList.add('clickable');
      toggleBtn.onclick = e => {
        e.stopPropagation();
        toggleSubsidiaryVisibility(stock.symbol);
      };
      toggleBtn.classList.add('subsidiary-toggle');
      topLine.appendChild(toggleBtn);
    }

    // 0.14.5: znaczniki jako ikony z opisem (zamiast emoji przed nazwą)
    const markers = [];
    if (playerSharePct > 50) markers.push(['korona', 'Masz większość akcji — panel zarządzania', 'accent']);
    if (stock.assetType === 'ResearchInstitute') markers.push(['badania', 'Instytut badawczy', 'info']);
    if (stock.isMonopolist) markers.push(['lider', 'Monopolista w sektorze', 'warn']);
    if (typeof isConcern === 'function' && isConcern(stock)) markers.push(['grupa', 'Koncern: czołówka kapitalizacji i grupa (segmenty niepowiązane, ≥ 2 spółki zależne albo ≥ 2 segmenty i spółka zależna)', 'info']); // 0.14 T5
    if (stock.isStateOwned) markers.push(['panstwo', 'Spółka Skarbu Państwa', 'muted']);
    if (typeof getRedFlags === 'function' && getSkillLevel('accountant') >= 4 && !stock.assetType) {
      const flags = getRedFlags(stock);
      if (flags.length >= 2) markers.push(['flaga', `Czerwone flagi: ${flags.map(f => f.label).join(', ')}`, 'down']);
    }
    if (markers.length) {
      const markerWrap = document.createElement('span');
      markerWrap.className = 'stock-markers';
      markerWrap.innerHTML = markers.map(([icon, label, tone]) => `<span class="stock-marker tone-${tone}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" role="img">${uiIcon(icon, 14)}</span>`).join('');
      topLine.appendChild(markerWrap);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'stock-name';
    nameSpan.textContent = stock.name;
    nameSpan.title = stock.name;
    topLine.appendChild(nameSpan);

    if (sharesOwned > 0) {
      const ownedDot = document.createElement('span');
      ownedDot.className = 'owned-dot';
      ownedDot.title = 'Masz akcje tej spółki';
      topLine.appendChild(ownedDot);
    }

    const infoButton = document.createElement('button');
    infoButton.type = 'button';
    infoButton.appendChild(uiIconNode('karta', 14));
    infoButton.className = 'info-btn';
    infoButton.setAttribute('aria-label', `Karta spółki ${stock.name}`);
    infoButton.title = 'Karta spółki';
    infoButton.onclick = () => openDescriptionModal(stock.symbol);
    topLine.appendChild(infoButton);

    const metaLine = document.createElement('div');
    metaLine.className = 'stock-meta';
    const marketId = typeof getStockMarket === 'function' ? getStockMarket(stock) : 'GPW';
    const parentNote = stock.isSubsidiaryOf ? ` · spółka zależna od ${stock.isSubsidiaryOf}${Number.isFinite(stock.parentStakePct) ? ` (${Math.round(stock.parentStakePct * 100)}%)` : ''} · ${exchanges[stock.exchange]?.name || stock.exchange}` : ''; // 0.14.2 P3
    const spinNote = (stock.spinoff ? ` · zapowiedziane wydzielenie: ${stock.spinoff.sector}` : '') + (stock.spunOffFrom && !stock.isSubsidiaryOf ? ` · wydzielona z ${stock.spunOffFrom}` : '') // 0.14 T4
      + (typeof getStockCooperations === 'function' && getStockCooperations(stock).length ? ` · kooperacje: ${getStockCooperations(stock).length}` : ''); // 0.14 T5
    metaLine.textContent = `${primarySector} · ${stock.symbol}${parentNote}${spinNote}${marketId !== 'GPW' ? ` · członek rynku ${getMarketLabel(marketId)}` : ''}${stock.isDividendAristocrat ? ' · dywidendowy arystokrata' : ''}`;


    identityWrap.appendChild(topLine);
    identityWrap.appendChild(metaLine);

    if (stock.mergerProcess) {
      const process = stock.mergerProcess;
      const mergerStatusContainer = document.createElement('div');
      mergerStatusContainer.classList.add('mt-1');
      mergerStatusContainer.classList.add('w-sm');
      mergerStatusContainer.title = `Proces M&A: ${process.statusMessage}`;

      const statusText = document.createElement('span');
      statusText.textContent = `Etap: ${process.stage}/7`;
      statusText.classList.add('text-xs');
      statusText.style.display = 'block';

      const progressBar = document.createElement('progress');
      progressBar.value = process.progress;
      progressBar.max = 100;
      progressBar.classList.add('w-full');

      if (process.decisionRequired) progressBar.classList.add('decision');
      else if (process.complications > 0)
        progressBar.classList.add('complication');

      mergerStatusContainer.appendChild(statusText);
      mergerStatusContainer.appendChild(progressBar);
      identityWrap.appendChild(mergerStatusContainer);
    }

    nameCell.appendChild(identityWrap);

    // KOMÓRKA 2: CENA
    const priceCell = row.insertCell();
    priceCell.classList.add('cell-number', 'cell-price');
    priceCell.innerHTML = `<div class="price-main">${formatZl(stock.price)}</div>`;

    if (stock.corporatePhase && getSkillLevel('financialAnalyst') >= 1) {
      const phaseBadge = document.createElement('div');
      phaseBadge.classList.add('phase-badge');
      // 0.14.5: ton znacznika z palety zamiast kolorów na sztywno
      const phaseTones = { Wzrost: 'up', Stabilność: 'neutral', Spadek: 'down', Reorganizacja: 'warn', 'Złoty Rok ✨': 'accent', 'Zejście w Cień 👻': 'neutral', 'Impuls Innowacji 💡': 'info' };
      phaseBadge.classList.add('badge', `badge--${phaseTones[stock.corporatePhase] || 'neutral'}`);
      phaseBadge.textContent = stripEmoji(stock.corporatePhase);
      phaseBadge.title = getCorporatePhaseTooltip(stock.corporatePhase); // 0.14.2 P8: co to za faza i co daje
      if (typeof isAcademyUnlocked === 'function' && playerProfile && !isAcademyUnlocked('fazySpolki')) unlockAcademyEntry('fazySpolki');
      priceCell.appendChild(phaseBadge);
    }

    // KOMÓRKA 4: ZMIANA TYGODNIOWA (czas gry)
    const changeCell = row.insertCell();
    changeCell.classList.add('cell-number');
    const changeArrow = changeClass === 'up' ? '▲' : changeClass === 'down' ? '▼' : '■';
    changeCell.innerHTML = `<span class="change-pill ${changeClass}"><span aria-hidden="true">${changeArrow}</span> ${formatPct(changePct / 100)}</span>`;

    // KOMÓRKA 5: WOLUMEN / dostępne
    const availableCell = row.insertCell();
    availableCell.innerHTML = `<div class="availability-cell">
        <span class="availability-value">${availableShares.toLocaleString('pl-PL')}</span>
        <span class="mini-progress" aria-hidden="true"><span class="mini-progress-bar" style="width:${availabilityPct}%"></span></span>
      </div>`;

    // KOMÓRKA 6: Moje akcje
    const ownedCell = row.insertCell();
    ownedCell.classList.add('cell-number');
    ownedCell.innerHTML =
      sharesOwned > 0
        ? `<span class="owned-badge">${sharesOwned.toLocaleString(
            'pl-PL'
          )}</span>`
        : `<span class="owned-zero">0</span>`;

    // KOMÓRKA 7: Akcja
    const actionsCell = row.insertCell();
    actionsCell.classList.add('trade-actions-cell');
    actionsCell.classList.add('text-center');

    if (!hasAccess) {
      const lockSpan = document.createElement('span');
      lockSpan.innerHTML = uiIcon('klodka', 16);
      lockSpan.title = 'Brak dostępu do tej giełdy — awans otworzy kolejne';
      lockSpan.setAttribute('role', 'img');
      lockSpan.setAttribute('aria-label', lockSpan.title);
      lockSpan.classList.add('row-state');
      actionsCell.appendChild(lockSpan);
    } else if (isLocked || stock.isBeingMerged || stock.canBeTraded === false) {
      const stopSpan = document.createElement('span');
      stopSpan.innerHTML = uiIcon('blokada', 16);
      stopSpan.title = 'Handel wstrzymany';
      stopSpan.setAttribute('role', 'img');
      stopSpan.setAttribute('aria-label', 'Handel wstrzymany');
      stopSpan.classList.add('row-state', 'tone-down');
      actionsCell.appendChild(stopSpan);
    } else {
      const drawerBtn = document.createElement('button');
      drawerBtn.type = 'button';
      drawerBtn.className = 'btn-ghost-icon drawer-toggle-btn';
      drawerBtn.dataset.symbol = stock.symbol;
      drawerBtn.title = 'Kup, sprzedaj, wykres';
      drawerBtn.setAttribute('aria-label', `Handel: ${stock.name}`);
      drawerBtn.setAttribute('aria-expanded', String(openStockDrawerSymbol === stock.symbol));
      drawerBtn.appendChild(uiIconNode('chevron-down', 16));
      drawerBtn.onclick = e => {
        e.stopPropagation();
        toggleStockDrawer(stock.symbol);
      };
      actionsCell.appendChild(drawerBtn);
    }

    const hiddenQty = document.createElement('input');
    hiddenQty.type = 'number';
    hiddenQty.id = `quantity-${stock.symbol}`;
    hiddenQty.value =
      previousInputValues[stock.symbol] !== undefined
        ? previousInputValues[stock.symbol]
        : '1';
    hiddenQty.style.display = 'none';
    actionsCell.appendChild(hiddenQty);

    if (hasAnalystSkill) {
      const reportMap = {
        excellent: { tone: 'up', label: 'Doskonały' },
        good: { tone: 'up', label: 'Dobry' },
        neutral: { tone: 'muted', label: 'Neutralny' },
        bad: { tone: 'down', label: 'Zły' },
        tragic: { tone: 'down', label: 'Tragiczny' }
      };
      const rep = reportMap[stock.lastReport];
      if (rep) {
        const repSpan = document.createElement('span');
        repSpan.innerHTML = uiIcon('raport', 14);
        repSpan.title = `Ostatni raport: ${rep.label}`;
        repSpan.setAttribute('role', 'img');
        repSpan.setAttribute('aria-label', repSpan.title);
        repSpan.classList.add('row-icon', `tone-${rep.tone}`);
        actionsCell.appendChild(repSpan);
      }
    }

    const hasDebt = stock.balanceSheet
      ? stock.balanceSheet.liabilities > 0
      : false;
    if (hasDebt && (hasAnalystSkill || playerSharePct > 50)) {
      const debtSpan = document.createElement('span');
      debtSpan.innerHTML = uiIcon('Finanse', 14);
      debtSpan.title = 'Spółka ma zobowiązania';
      debtSpan.setAttribute('role', 'img');
      debtSpan.setAttribute('aria-label', 'Spółka ma zobowiązania');
      debtSpan.classList.add('row-icon', 'tone-muted');
      actionsCell.appendChild(debtSpan);
    }

    if (playerSharePct > 50) {
      const manageButton = document.createElement('button');
      manageButton.type = 'button';
      manageButton.innerHTML = uiIcon('korona', 16);
      manageButton.title = 'Panel zarządzania';
      manageButton.setAttribute('aria-label', `Panel zarządzania: ${stock.name}`);
      manageButton.className = 'btn-ghost-icon tone-accent';
      manageButton.onclick = e => {
        e.stopPropagation();
        openManagementModal(stock.symbol);
      };
      actionsCell.appendChild(manageButton);
    }

    return row;
  };

  // --- D1: zakładka „Internet” — rynki internetowe i ich spółki (rozwijane listy) ---
  if (internetTab) {
    const ids = typeof getInternetMarketIds === 'function' ? getInternetMarketIds().filter(id => ['active', 'startup'].includes(marketOperators[id].status)) : [];
    if (!ids.length) {
      const cell = stockTableBody.insertRow().insertCell();
      cell.colSpan = STOCK_TABLE_COLS;
      cell.className = 'text-muted text-sm';
      cell.textContent = 'Żaden rynek internetowy jeszcze nie działa. XTD, PLU5 i kolejne rynki powstają jako startupy w inkubatorze — mają gwarancję debiutu.';
    }
    for (const id of ids) {
      const operator = marketOperators[id];
      const def = getMarketDef(id) || { name: id, commission: 0, color: '#888' };
      const members = baseStocksToDisplay.filter(stock => getStockMarket(stock) === id && stock.symbol !== operator.symbol);
      const operatorStock = operator.symbol ? baseStocksToDisplay.find(stock => stock.symbol === operator.symbol) : null;
      const key = `net:${id}`;
      const collapsed = Boolean(exchangeCollapseState[key]);
      const concession = typeof hasInternetConcession === 'function' && hasInternetConcession(id);
      const headerRow = stockTableBody.insertRow();
      headerRow.className = 'exchange-header internet-market-header';
      const headerCell = headerRow.insertCell();
      headerCell.colSpan = STOCK_TABLE_COLS;
      headerCell.innerHTML = `<div class="d-flex justify-between items-center gap-2 flex-wrap">
          <h4 class="my-1 clickable exchange-title" onclick="toggleExchangeVisibility('${key}')">${exchangeDot('INTERNET')}${escapeHtml(stripEmoji(def.name))} <span class="exchange-meta">${escapeHtml(def.short || id)} · prowizja ${formatNumberPl((def.commission || 0) * 100)}% · spółki ${getMarketMembers(id).length}/${INTERNET_MEMBER_LIMIT}${operator.status === 'startup' ? ' · operator w inkubatorze' : ''}</span> ${uiIcon(collapsed ? 'chevron-right' : 'chevron-down', 16, 'exchange-chevron')}</h4>
          ${operator.status === 'active' ? (concession ? '<span class="text-up text-sm">Koncesja: handel bez prowizji</span>' : `<button class="btn-secondary btn-sm" onclick="event.stopPropagation(); buyInternetConcession('${id}'); displayStocks(getCurrentInputValues());">Kup koncesję · ${formatZl(getInternetConcessionCost(id), 0)}</button>`) : ''}
        </div>`;
      for (const stock of [operatorStock, ...members].filter(Boolean)) {
        const row = renderStockRow(stock, false);
        if (collapsed) row.style.display = 'none';
      }
    }
  }

  // --- 0.14.1 R6: nagłówek rynku GPW (rynki internetowe mają własne nagłówki w zakładce „Internet”) ---
  if (!internetTab && baseStocksToDisplay.some(stock => sortedExchanges.includes(stock.exchange))) {
    const marketCell = stockTableBody.insertRow();
    marketCell.className = 'exchange-header market-header';
    const cell = marketCell.insertCell();
    cell.colSpan = STOCK_TABLE_COLS;
    cell.innerHTML = '<h4 class="my-1">GPW — Giełda Papierów Wartościowych</h4>';
  }

  // --- Pętla renderująca giełdy ---
  if (!internetTab) sortedExchanges.forEach(exchangeKey => {
    const exchange = exchanges[exchangeKey];
    let stocksOnThisExchange = baseStocksToDisplay.filter(
      stock => stock.exchange === exchangeKey
    );

    // 0.14.1 R6: grupy sektora głównego w kolejności rejestru; sortowanie po cenie wewnątrz grupy.
    const sectorOf = new Map(stocksOnThisExchange.map(stock => [stock, getMainSector(stock)]));
    const priceDir = currentSortState === 'price_asc' ? 1 : currentSortState === 'price_desc' ? -1 : 0;
    stocksOnThisExchange.sort((a, b) =>
      (getSectorDisplayOrder(sectorOf.get(a)) - getSectorDisplayOrder(sectorOf.get(b))) || (priceDir ? (a.price - b.price) * priceDir : 0));

    if (stocksOnThisExchange.length > 0) {
      const headerRow = stockTableBody.insertRow();
      headerRow.className = 'exchange-header';
      headerRow.onclick = () => toggleExchangeVisibility(exchangeKey);
      const headerCell = headerRow.insertCell();
      headerCell.colSpan = STOCK_TABLE_COLS;
      const collapsedEx = Boolean(exchangeCollapseState[exchangeKey]);
      // 0.14.5: kwadrat w kolorze rangi + nazwa bez emoji + liczba spółek; przycisk dla klawiatury
      headerCell.innerHTML = `<h4 class="my-1 exchange-title"><button type="button" class="exchange-toggle" aria-expanded="${!collapsedEx}" onclick="event.stopPropagation(); toggleExchangeVisibility('${exchangeKey}')">${exchangeDot(exchangeKey)}<span class="exchange-name">${escapeHtml(stripEmoji(exchange.name))}</span><span class="exchange-meta">· ${stocksOnThisExchange.length} ${stocksOnThisExchange.length === 1 ? 'spółka' : stocksOnThisExchange.length % 10 >= 2 && stocksOnThisExchange.length % 10 <= 4 && (stocksOnThisExchange.length % 100 < 12 || stocksOnThisExchange.length % 100 > 14) ? 'spółki' : 'spółek'}</span>${uiIcon(collapsedEx ? 'chevron-right' : 'chevron-down', 16, 'exchange-chevron')}</button></h4>`;
    }

    const sectorCounts = new Map();
    for (const s of stocksOnThisExchange) { const key = sectorOf.get(s) || null; sectorCounts.set(key, (sectorCounts.get(key) || 0) + 1); }
    let lastSector;
    stocksOnThisExchange.forEach(stock => {
      const sector = sectorOf.get(stock) || null;
      if (sector !== lastSector) {
        lastSector = sector;
        const subRow = stockTableBody.insertRow();
        subRow.className = 'sector-subheader';
        if (exchangeCollapseState[exchangeKey]) subRow.style.display = 'none';
        const subCell = subRow.insertCell();
        subCell.colSpan = STOCK_TABLE_COLS;
        // 0.14.5: ikona sektora + nazwa + liczba spółek (test: litery = sama nazwa sektora)
        const sectorCount = sectorCounts.get(sector) || 0;
        if (sector && SECTOR_ICON_PATHS[sector]) { const ic = uiIconNode(sector, 14); ic.classList.add('ic-sector'); subCell.appendChild(ic); }
        const nameEl = document.createElement('span'); nameEl.className = 'sector-name'; nameEl.textContent = sector || 'Pozostałe';
        const countEl = document.createElement('span'); countEl.className = 'sector-count'; countEl.textContent = sectorCount;
        subCell.append(nameEl, ' ', countEl);
      }
      const mainRow = renderStockRow(stock, false);
      if (exchangeCollapseState[exchangeKey]) mainRow.style.display = 'none';

      for (const subStock of childrenByParent.get(stock.symbol) || []) { // 0.14.2 P3: córki z faktów, nie z listy matki
        const subRow = renderStockRow(subStock, true, stock.symbol);
        subRow.style.display = exchangeCollapseState[exchangeKey] || stock.isSubsidiaryExpanded === false ? 'none' : '';
      }
    });
  });

  liveStockTableBody.replaceChildren(...stockTableBody.childNodes);

  if (typeof openStockDrawerSymbol !== 'undefined' && openStockDrawerSymbol) {
    const targetRow = document.querySelector(`#stock-table-body tr[data-symbol="${openStockDrawerSymbol}"]`);
    if (targetRow) {
      if (openDrawer) {
        targetRow.after(openDrawer);
      } else {
        renderStockDrawer(openStockDrawerSymbol);
      }
      if (drawerInput && drawerState?.focused) {
        drawerInput.focus();
        try { drawerInput.setSelectionRange(drawerState.selectionStart, drawerState.selectionEnd); } catch (e) { /* brak zaznaczenia */ }
      }
    } else {
      openStockDrawerSymbol = null;
    }
  }
}

function showPriceHistoryModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) { showToast(`Nie znaleziono akcji o symbolu ${symbol}.`); return; }

    currentlyDisplayedChartSymbol = symbol;

    const modal = document.getElementById('price-chart-modal');
    const chartTitle = document.getElementById('chart-title');
    const svgArea = document.getElementById('chart-svg-area');

    // Pobierz kontrolki
    const candlestickBtn = document.getElementById('chart-type-candlestick-btn');
    const lineBtn = document.getElementById('chart-type-line-btn');
    const lineIntervalSelect = document.getElementById('line-chart-interval-select');
    const candleIntervalSelect = document.getElementById('candle-chart-interval-select');
    const openAlertBtn = document.getElementById('open-alert-modal-btn');

    chartTitle.textContent = `Wykres: ${stock.name} (${stock.symbol})`;

    const redrawChart = () => {
        const svgWidth = svgArea.offsetWidth;
        const svgHeight = svgArea.offsetHeight;
        renderChartSVGForStock(stock, svgArea, svgWidth, svgHeight);
    };

    const updateControlsVisibility = () => {
        if (playerChartSettings.type === 'candlestick') {
            lineIntervalSelect.style.display = 'none';
            candleIntervalSelect.style.display = 'inline-block';
        } else {
            lineIntervalSelect.style.display = 'inline-block';
            candleIntervalSelect.style.display = 'none';
        }
        updateChartTypeButtons();

    };

    // Ustaw wartości początkowe
    lineIntervalSelect.value = playerChartSettings.lineInterval;
    candleIntervalSelect.value = playerChartSettings.candleInterval;

    // Przypisz eventy
    candlestickBtn.onclick = () => {
        if (playerChartSettings.type === 'candlestick') return;
        playerChartSettings.type = 'candlestick';
        updateControlsVisibility();
        redrawChart();
    };

    lineBtn.onclick = () => {
        if (playerChartSettings.type === 'line') return;
        playerChartSettings.type = 'line';
        updateControlsVisibility();
        redrawChart();
    };

    lineIntervalSelect.onchange = () => {
        playerChartSettings.lineInterval = parseInt(lineIntervalSelect.value, 10);
        redrawChart();
    };

    candleIntervalSelect.onchange = () => {
        playerChartSettings.candleInterval = parseInt(candleIntervalSelect.value, 10);
        redrawChart();
    };
    openAlertBtn.onclick = () => openPriceAlertModal(symbol);
    // Pokaż modal i narysuj wykres
    modal.style.display = 'block';
    updateControlsVisibility();
    redrawChart();
}

const skillCategoryDefinitions = {
    bear: {
        title: 'Bessa & Obrona',
        description: 'Umiejętności chroniące kapitał podczas spadków, regulacji i ryzyka finansowego.'
    },
    bull: {
        title: 'Hossa & Wzrost',
        description: 'Zwiększaj zyski, dźwignię bankową i śmiałe inwestycje na rynku.'
    },
    balance: {
        title: 'Równowaga & Kontrola',
        description: 'Wsparcie analityczne, zarządzanie ryzykiem i bardziej stabilne decyzje.'
    }
};

// Ta funkcja jest z ui.js (baza), zachowujemy ją, ponieważ obsługuje bankowość komercyjną
/** Pozycje portfela jako wiersze tabeli: fundusz albo konto prywatne (przełącznik kont). */
function displayPortfolio() {
    const body = document.getElementById('my-stocks-list');
    if (!body) return;
    const isPrivate = typeof activeTradingAccount !== 'undefined' && activeTradingAccount === 'private';
    const portfolio = isPrivate ? (playerWallet?.portfolio || {}) : playerPortfolio;
    const fmt = value => formatZl(value, 0);
    const rows = [];
    let totalPL = 0, positionsValue = 0;

    const section = title => rows.push(`<tr class="portfolio-group-row"><td colspan="4">${title}</td></tr>`);
    const row = (name, share, cost, result, cls = '', title = '') =>
        rows.push(`<tr class="${cls}"${title ? ` title="${escapeHtml(title)}"` : ''}><td>${name}</td><td class="cell-number">${share}</td><td class="cell-number">${cost}</td><td class="cell-number">${result}</td></tr>`);

    // Akcje, ETF-y, indeksy, startupy
    const equity = Object.entries(portfolio).filter(([, h]) => h && (h.assetType === 'Startup' ? h.investedAmount > 0 : h.shares > 0));
    if (equity.length) section('Akcje i fundusze');
    for (const [symbol, holding] of equity) {
        if (holding.assetType === 'Startup') {
            const startup = stocks.find(s => s.symbol === symbol);
            positionsValue += holding.investedAmount;
            row(`🚀 ${escapeHtml(startup?.name || symbol)}`, 'startup', fmt(holding.investedAmount), holding.isInsured ? '🛡️ ubezp.' : '—');
            continue;
        }
        let market, price = 0, name = symbol, pct = '';
        if (holding.assetType === 'etf') { market = etfs.find(e => e.symbol === symbol); price = market?.price || 0; name = market?.name || symbol; }
        else if (holding.assetType === 'index') { market = marketIndexes.find(i => i.id === symbol); price = market?.value || 0; name = market?.name || symbol; }
        else {
            market = stocks.find(s => s.symbol === symbol);
            price = market?.price || 0; name = market?.name || symbol;
            if (market?.totalShares > 0) pct = `${(holding.shares / market.totalShares * 100).toFixed(2)}%`;
        }
        if (!market) continue;
        const value = price * holding.shares;
        const pl = value - holding.avgPrice * holding.shares;
        positionsValue += value;
        totalPL += pl;
        const locked = holding.lockedShares > 0 ? ` 🔒${holding.lockedShares}` : '';
        row(`${escapeHtml(name)} <span class="text-xs text-muted">${escapeHtml(symbol)} · ${holding.shares.toLocaleString('pl-PL')} szt.${locked}</span>`,
            pct || '—', holding.avgPrice.toFixed(2),
            `<span class="${pl > 0 ? 'profit' : pl < 0 ? 'loss' : ''}">${pl >= 0 ? '+' : ''}${fmt(pl)}</span><span class="text-xs text-muted d-block">${fmt(value)}</span>`,
            holding.lockedShares > 0 ? 'dimmed' : '', holding.lockedShares > 0 ? `${holding.lockedShares} akcji zablokowanych (zastaw)` : '');
    }

    if (!isPrivate) {
        // Lokaty, PPP, obligacje projektowe, pożyczki pomostowe
        const deposits = typeof getFundDeposits === 'function' ? getFundDeposits() : [];
        const ppp = playerFund?.ppp || [];
        const projectBonds = typeof getProjectBonds === 'function' && typeof specialProjects === 'object' && specialProjects ? getProjectBonds() : [];
        if (deposits.length || ppp.length || projectBonds.length) section('Lokaty i finansowanie projektów');
        for (const d of deposits) row(`🏦 Lokata · ${escapeHtml(d.bankName)}`, `${(d.rate * 100).toFixed(1)}%/r`, fmt(d.principal), `<span class="profit">+${fmt(d.accrued)}</span><span class="text-xs text-muted d-block">${d.weeksLeft} tyg.</span>`);
        for (const st of ppp) row(`${st.icon || '🏙️'} PPP · ${escapeHtml(st.name)}`, `${(st.rate * 100).toFixed(1)}%/r`, fmt(st.principal), `${st.unpaid > 0 ? '<span class="loss">zaległe odsetki</span>' : '—'}<span class="text-xs text-muted d-block">${st.weeksLeft} tyg.</span>`);
        for (const b of projectBonds) row(`📜 Obligacje projektu · ${escapeHtml(b.name)}`, `${(PROJECT_BOND_RATE * 100).toFixed(0)}%/r`, fmt(b.principal), `<span class="profit">+${fmt(b.interestPaid || 0)}</span>`);
        positionsValue += deposits.reduce((sum, d) => sum + d.principal + d.accrued, 0) + ppp.reduce((sum, st) => sum + st.principal, 0) + projectBonds.reduce((sum, b) => sum + b.principal, 0);

        // Obligacje i bony
        const bonds = allBonds.filter(b => b.ownerId === 'player' && !b.isTBill);
        if (bonds.length) {
            section('Obligacje');
            const groups = {};
            for (const bond of bonds) {
                const key = `${bond.issuerName}_${bond.type}`;
                const g = groups[key] || (groups[key] = { name: bond.issuerName, type: bond.type, rate: bond.interestRate, count: 0, value: 0, cost: 0, defaulted: 0, next: Infinity });
                g.count++; g.value += getBondValue(bond); g.cost += bond.purchasePrice || bond.faceValue || 0;
                g.next = Math.min(g.next, Number(bond.remainingGameMs) || 0);
                if (bond.defaulted) g.defaulted++;
            }
            for (const g of Object.values(groups)) {
                positionsValue += g.value;
                row(`📄 ${escapeHtml(g.name)} <span class="text-xs text-muted">${escapeHtml(g.type)} · ${g.count} szt.</span>`, `${(g.rate * 100).toFixed(1)}%/r`, fmt(g.cost),
                    `${g.defaulted ? '<span class="loss">⚠️ niewypłacalny</span>' : fmt(g.value)}<span class="text-xs text-muted d-block">zapada za ~${Math.ceil(g.next / 60000)} min gry</span>`);
            }
        }
        const tBills = allBonds.filter(b => b.ownerId === 'player' && b.isTBill);
        if (tBills.length) { section('Bony skarbowe'); row(`🧾 Bony skarbowe · ${tBills.length} szt.`, '—', '—', '—'); }
        // 0.14.1 R4: dwie pozycje puli, zgodne z NAV (niezainwestowane nominalnie, wkłady w żyjące startupy po koszcie)
        const poolFree = Number(investmentPool?.contributors?.player) || 0;
        const poolInvested = getPoolInvestedInStartups('player');
        if (poolFree + poolInvested > 0) {
            section('Pula inwestycyjna');
            if (poolFree > 0) row('🏊 Pula — niezainwestowane', '—', fmt(poolFree), `${fmt(poolFree)}<span class="text-xs text-muted d-block">do wycofania (opłata 2%)</span>`);
            if (poolInvested > 0) row('🏊 Pula — w startupach', '—', fmt(poolInvested), `${fmt(poolInvested)}<span class="text-xs text-muted d-block">po koszcie, do debiutu lub końca startupu</span>`);
            positionsValue += poolFree + poolInvested;
        }
    }

    body.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="4" class="text-muted">Brak pozycji ${isPrivate ? 'na koncie prywatnym' : 'w funduszu'}.</td></tr>`;

    // Pasywa
    const liabilities = document.getElementById('my-liabilities-list');
    if (liabilities) {
        const loans = isPrivate ? [] : (playerFund?.pawnLoans || []);
        liabilities.innerHTML = loans.length
            ? loans.map(loan => `<li>Lombard: <strong class="loss">${formatZl(loan.principal)}</strong> [zastaw: ${loan.shares} ${escapeHtml(loan.symbol)}] · ${loan.weeksLeft} tyg.</li>`).join('')
            : '<li>Brak zobowiązań.</li>';
    }

    // Nagłówek i kafelki zależnie od konta
    const header = document.getElementById('portfolio-positions-header');
    if (header) header.textContent = isPrivate ? 'Pozycje konta prywatnego' : 'Pozycje funduszu';
    const setKpi = (id, label, value, sub) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = value;
        const card = el.closest('.portfolio-kpi-card');
        if (card) { card.querySelector('.portfolio-kpi-label').textContent = label; card.querySelector('.portfolio-kpi-sub').textContent = sub; }
    };
    const cash = isPrivate ? (playerWallet?.cash || 0) : playerCash;
    const total = isPrivate ? cash + positionsValue : (playerFund ? getFundAssets() : playerCash + positionsValue);
    setKpi('total-portfolio-value', isPrivate ? 'Majątek prywatny' : 'Aktywa funduszu', formatZl(total), isPrivate ? 'Twoje pieniądze' : 'pieniądze klientów');
    setKpi('cash-portfolio', isPrivate ? 'Gotówka prywatna' : 'Gotówka funduszu', formatZl(cash), 'wolne środki');
    const plEl = document.getElementById('total-profit-loss');
    if (plEl) { plEl.textContent = formatZl(totalPL); plEl.className = `portfolio-kpi-value ${totalPL > 0 ? 'profit' : totalPL < 0 ? 'loss' : ''}`; }
}

function displayEventMessage(message, durationSeconds, percentageInfo = null, category = 'market') {
    // Ta funkcja nie musi już niczego wyświetlać na głównym ekranie,
    // jej jedynym zadaniem jest teraz przekazanie eventu do systemu logowania.

    let fullMessage = message;
    if (percentageInfo !== null) {
        const fullMessageWithPercent = `${message} (Zmiana: ${(percentageInfo * 100).toFixed(1)}%!)`;
        logEvent(fullMessageWithPercent, category);
    } else {
        logEvent(message, category);
    }
}

function openSkillsModal() {
    const modal = document.getElementById('skills-modal');
    if (modal) {
        renderSkillsPanel();
        modal.style.display = 'block';
    }
}


// =================================================================================
// U2: ZMIANA TYGODNIOWA, FILTR POSIADANYCH
// =================================================================================

/** Co tydzień gry: cena zamknięcia tygodnia (do 14 tygodni wstecz). */
function recordWeeklyCloses() {
    for (const stock of stocks) {
        if (stock.isBankrupt) continue;
        if (!Array.isArray(stock.weeklyCloses)) stock.weeklyCloses = [];
        stock.weeklyCloses.push(stock.price);
        if (stock.weeklyCloses.length > 14) stock.weeklyCloses.shift();
    }
}

/** Zmiana kursu względem zamknięcia sprzed `weeks` tygodni gry (ułamek). */
function getStockChangePct(stock, weeks = 1) {
    const closes = stock?.weeklyCloses || [];
    const ref = closes[closes.length - weeks];
    return ref > 0 ? stock.price / ref - 1 : 0;
}

function isStockOwnedByPlayer(stock) {
    return (playerPortfolio[stock.symbol]?.shares || 0) > 0 || (playerWallet?.portfolio?.[stock.symbol]?.shares || 0) > 0
        || (playerPortfolio[stock.symbol]?.investedAmount || 0) > 0;
}

function toggleOwnedFilter(chip) {
    ownedOnlyFilter = !ownedOnlyFilter;
    if (chip) { chip.classList.toggle('active', ownedOnlyFilter); chip.setAttribute('aria-pressed', String(ownedOnlyFilter)); }
    displayStocks(getCurrentInputValues());
}

function toggleExchangeVisibility(exchangeKey) {
    exchangeCollapseState[exchangeKey] = !exchangeCollapseState[exchangeKey];
    displayStocks(getCurrentInputValues());
}

/** Ranking funduszy: gracz, zarządcy korporacji i fundusze zewnętrzne — zwrot z 4 okresów, stabilność, zaufanie. */
function getFundRanking() {
    const compound = returns => returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
    const average = (periods, key) => periods.length ? periods.reduce((sum, p) => sum + p[key], 0) / periods.length : 0;
    const playerPeriods = (playerFund?.periods || []).slice(-FUND_PERIODS_SHOWN);
    const rows = [{
        name: `💼 ${playerProfile?.fundName || 'Twój fundusz'}`, owner: `${playerProfile?.name || 'Ty'} · ${getPlayerPosition().name}`,
        ret: compound(playerPeriods.map(p => p.fundReturn)), vol: average(playerPeriods, 'volatility'),
        trust: playerFund?.trust ?? null, assets: playerFund ? getFundAssets() : 0, mine: true
    }];

    for (const manager of corporation?.managers || []) {
        const periods = manager.fund.periods.slice(-FUND_PERIODS_SHOWN);
        rows.push({
            name: `🏢 Fundusz ${manager.name.split(' ')[1] || manager.name}`,
            owner: `${manager.name} · ${CAREER_POSITIONS[getPositionIndex(manager.positionId)].name}`,
            ret: compound(periods.map(p => p.fundReturn)), vol: average(periods, 'volatility'),
            trust: manager.fund.trust, assets: getBotFundAssets(manager.fund)
        });
    }

    // 0.13.1 (B9): Fundusz „Gwardia” w rankingu funduszy (wynik od powstania, bez okresów oceny).
    const guard = typeof getGuardFund === 'function' ? getGuardFund() : aiCompetitors.find(ai => ai.isGuard);
    if (guard) {
        const value = (Number(guard.cash) || 0) + Object.entries(guard.portfolio || {}).reduce((sum, [symbol, holding]) => sum + (stocks.find(s => s.symbol === symbol)?.price || 0) * (holding.shares || 0), 0);
        if (!(guard.startValue > 0)) guard.startValue = value;
        rows.push({ name: `🛡️ ${guard.name}`, owner: 'Fundusz patriotyczny · obronność (wynik od powstania)', ret: guard.startValue > 0 ? value / guard.startValue - 1 : 0, vol: null, trust: null, assets: value });
    }

    for (const fund of getExternalFunds()) {
        const returns = playerPeriods.map(p => p.rivals.find(r => r.symbol === fund.symbol)?.return).filter(Number.isFinite);
        rows.push({
            name: `🌐 ${getExternalFirmName(fund)}`, owner: fund.managedByCorporation ? 'Przejęty przez korporację' : 'Firma zewnętrzna',
            ret: compound(returns), vol: null, trust: null, assets: getExternalFundValue(fund) * fund.totalShares
        });
    }
    return rows.sort((a, b) => b.ret - a.ret);
}

function displayLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    if (!playerFund) { container.innerHTML = '<p class="fund-muted">Brak funduszu.</p>'; return; }

    container.innerHTML = `
        <p class="fund-muted">Zwrot skumulowany z ${FUND_PERIODS_SHOWN} ostatnich okresów. Liczy się wynik, nie wielkość funduszu.</p>
        <table class="asset-mini-table leaderboard-table">
            <thead><tr><th>#</th><th>Fundusz</th><th>Zwrot</th><th>Zmienność</th><th>Zaufanie</th><th>Aktywa</th></tr></thead>
            <tbody>${getFundRanking().map((row, index) => `
                <tr class="${row.mine ? 'mine' : ''}">
                    <td>${index + 1}</td>
                    <td>${escapeHtml(row.name)}<br><small class="fund-muted">${escapeHtml(row.owner)}</small></td>
                    <td class="${row.ret >= 0 ? 'profit' : 'loss'}">${formatPct(row.ret)}</td>
                    <td>${row.vol === null ? '—' : formatPct(row.vol)}</td>
                    <td>${row.trust === null ? '—' : row.trust.toFixed(0)}</td>
                    <td>${formatZl(row.assets, 0)}</td>
                </tr>`).join('')}</tbody>
        </table>`;
}

function openLeaderboardModal() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) {
        displayLeaderboard();
        modal.style.display = 'block';
    }
}

function displayEtfs() {
    const etfSection = document.getElementById('etf-section');
    const etfTableBody = document.getElementById('etf-table-body');
    if (!etfSection || !etfTableBody) return;

    if (getSkillLevel('etfExpert') === 0) { // POPRAWKA WARUNKU
        etfSection.style.display = 'none';
        return;
    }

    etfSection.style.display = 'block';

    etfTableBody.innerHTML = '';

    etfs.forEach(etf => {
        const row = etfTableBody.insertRow();
        row.insertCell().innerHTML = `<strong>${escapeHtml(etf.name)}</strong> (${etf.symbol})<span class="text-xs text-muted d-block">${escapeHtml(describeEtfRules(etf))}</span>`;
        row.insertCell().textContent = etf.price.toFixed(2);
        row.insertCell().textContent = getEtfTopHoldings(etf).map(h => `${h.symbol} ${(h.weight * 100).toFixed(0)}%`).join(', ') || '—';
        row.insertCell().textContent = `${(etf.yearTarget * 100).toFixed(1)}%${etf.lastResult ? (etf.lastResult.hit ? ' ✅' : ' ❌') : ''}`;

        const sharesOwned = playerPortfolio[etf.symbol] ? playerPortfolio[etf.symbol].shares : 0;
        row.insertCell().textContent = sharesOwned;

        const actionsCell = row.insertCell();

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.min = '1';
        quantityInput.value = '1';
        quantityInput.classList.add('w-xs');
        quantityInput.id = `quantity-${etf.symbol}`;
        actionsCell.appendChild(quantityInput);

        const buyButton = document.createElement('button');
        buyButton.textContent = 'Kup';
        buyButton.onclick = () => {
            const quantity = parseInt(quantityInput.value, 10);
            if (quantity > 0) buyEtf(etf.symbol, quantity);
        };
        actionsCell.appendChild(buyButton);

        const sellButton = document.createElement('button');
        sellButton.textContent = 'Sprzedaj';
        sellButton.onclick = () => {
            const quantity = parseInt(quantityInput.value, 10);
            if (quantity > 0) sellEtf(etf.symbol, quantity);
        };
        actionsCell.appendChild(sellButton);
    });
}

function displayMarketIndexes() {
    const indexesPanel = document.getElementById('indexes-panel');
    const indexesContainer = document.getElementById('indexes-container');
    if (!indexesPanel || !indexesContainer) return;

    if (getSkillLevel('indexAnalystLvl1') === 0) { // POPRAWKA WARUNKU
        indexesPanel.style.display = 'none';
        return;
    }

    indexesPanel.style.display = 'block';
    indexesContainer.innerHTML = '';

    const canTradeIndexes = getSkillLevel('indexAnalystLvl1') >= 2;

    // Wyświetlanie głównych indeksów (GIG, TIG5, SIG20)
    marketIndexes.forEach(index => {
        const indexDiv = document.createElement('div');
        indexDiv.className = 'index-item';

        const change = index.change;
        let arrow = '➡️';
        let colorClass = '';

        if (change > 0.01) { arrow = '⬆️'; colorClass = 'profit'; }
        else if (change < -0.01) { arrow = '⬇️'; colorClass = 'loss'; }

        indexDiv.innerHTML = `
            <span class="index-name">${index.name} (${index.id})</span>
            <span class="index-value ${colorClass}">${index.value.toFixed(2)}</span>
            <span class="index-change ${colorClass}">${arrow} ${change.toFixed(2)}</span>
        `;

        if (canTradeIndexes) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'index-actions';
            actionsDiv.innerHTML = `
                <input type="number" min="1" value="1" id="quantity-index-${index.id}">
                <button onclick="buyIndex('${index.id}', document.getElementById('quantity-index-${index.id}').valueAsNumber)">Kup</button>
                <button onclick="sellIndex('${index.id}', document.getElementById('quantity-index-${index.id}').valueAsNumber)">Sprzedaj</button>
            `;
            indexDiv.appendChild(actionsDiv);
        }
        indexesContainer.appendChild(indexDiv);
    });

    // --- NOWA LOGIKA: Wyświetlanie Wskaźnika Niestabilności Rynku (WNR) dla Lvl 3 ---
    if (getSkillLevel('indexAnalystLvl1') >= 3) {
        const vixDiv = document.createElement('div');
        vixDiv.className = 'index-item vix-item'; // Dodatkowa klasa do stylów

        let description = 'Stabilny';
        let color = '#28a745'; // Zielony

        if (marketVolatilityIndex > 1.5) {
            description = 'Niestabilny';
            color = '#dc3545'; // Czerwony
        } else if (marketVolatilityIndex > 0.8) {
            description = 'Zmienny';
            color = '#ffc107'; // Pomarańczowy/żółty
        }

        vixDiv.innerHTML = `
            <span class="index-name">Niestabilność Rynku (WNR)</span>
            <span class="index-value" style="color: ${color};">${marketVolatilityIndex.toFixed(2)}</span>
            <span class="index-change fw-bold" style="color: ${color}">${description}</span>
        `;
        indexesContainer.appendChild(vixDiv);
    }
}

function renderDepartmentsSection(stock, container) {
    // Sprawdź czy sekcja już istnieje, jeśli tak - wyczyść, jeśli nie - stwórz
    let deptSection = document.getElementById('departments-section');
    if (!deptSection) {
        deptSection = document.createElement('div');
        deptSection.id = 'departments-section';
        deptSection.className = 'bank-section';
        container.appendChild(deptSection);
    }
    deptSection.innerHTML = ''; // Reset zawartości
    
    if (!stock.departments) {
        deptSection.innerHTML = '<p>Ta spółka nie posiada struktury działów.</p>';
        return;
    }

    deptSection.innerHTML = `<h4>🏢 Działy i Inwestycje</h4>`;

    // --- 1. KARTY DZIAŁÓW ---
    const deptsDiv = document.createElement('div');
    deptsDiv.style.display = 'flex';
    deptsDiv.classList.add('justify-between');
    deptsDiv.classList.add('mb-3');
    
    const deptNames = { research: "Badania (R&D)", development: "Rozwój (Inv)", economy: "Ekonomia" };
    
    for (const [key, data] of Object.entries(stock.departments)) {
        const deptCard = document.createElement('div');
        deptCard.classList.add('dept-card');
        
        let upgradeBtn = '';
        if (data.level < 3) {
            const cost = 50000 * Math.pow(2, data.level);
            upgradeBtn = `<button onclick="fundDepartmentUpgrade('${stock.symbol}', '${key}')" class="text-xs mt-1 w-full">Ulepsz (${(cost/1000).toFixed(0)}k)</button>`;
        } else {
            upgradeBtn = `<span class="text-xs text-up fw-bold">MAX LEVEL</span>`;
        }

        deptCard.innerHTML = `
            <div class="fw-bold text-sm mb-1">${deptNames[key]}</div>
            <div class="text-lg text-info">Lvl ${data.level}</div>
            ${upgradeBtn}
        `;
        deptsDiv.appendChild(deptCard);
    }
    deptSection.appendChild(deptsDiv);

    // --- 2. INWESTYCJE: w toku (etapy), działające, katalog (investments.js) ---
    renderInvestmentPanel(stock, deptSection, true);
}




function openManagementModal(symbol, defaultTab = 'main') {
    const modal = document.getElementById('management-modal');
    const stock = stocks.find(s => s.symbol === symbol);
    
    // Zabezpieczenie: jeśli modal lub spółka nie istnieje
    if (!modal || !stock) return;

    // Przypisujemy symbol do modala, aby odświeżanie (np. po ulepszeniu działu) wiedziało, kogo dotyczy
    modal.dataset.currentSymbol = symbol;

    // Helper do bezpiecznego ustawiania tekstu (zapobiega błędom, gdy element nie istnieje)
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    safeSetText('management-title', `👑 Panel Zarządzania: ${stock.name}`);

    // --- 1. Dywidenda Specjalna ---
    const dividendBtn = document.getElementById('force-dividend-btn');
    const cooldownInfo = document.getElementById('dividend-cooldown-info');
    
    if (dividendBtn && cooldownInfo) {
        if (stock.dividendCooldownUntil && Date.now() < stock.dividendCooldownUntil) {
            dividendBtn.disabled = true;
            const remainingTime = Math.ceil((stock.dividendCooldownUntil - Date.now()) / 1000);
            cooldownInfo.textContent = `Następna dywidenda dostępna za: ${remainingTime} s.`;
        } else {
            dividendBtn.disabled = false;
            cooldownInfo.textContent = '';
        }
        // Resetujemy onlick, aby nie kumulować eventów
        dividendBtn.onclick = () => forceDividend(symbol);
    }

    // --- 2. Walne Zgromadzenie (CEO) ---
    const fireCeoBtn = document.getElementById('fire-ceo-btn');
    const fireCeoCooldownInfo = document.getElementById('fire-ceo-cooldown-info');
    
    if (fireCeoBtn && fireCeoCooldownInfo) {
        if (stock.ceo && stock.ceo.fireCooldown && Date.now() < stock.ceo.fireCooldown) {
            fireCeoBtn.disabled = true;
            const remainingTime = Math.ceil((stock.ceo.fireCooldown - Date.now()) / 1000);
            fireCeoCooldownInfo.textContent = `Następne zgromadzenie możliwe za: ${remainingTime} s`;
        } else {
            fireCeoBtn.disabled = false;
            fireCeoCooldownInfo.textContent = '';
        }
        fireCeoBtn.onclick = () => initiateCeoChange(symbol);
    }

    // --- 3. Polityka Dywidendowa ---
    const policySelect = document.getElementById('policy-select');
    if (policySelect) {
        policySelect.dataset.symbol = symbol;
        policySelect.value = normalizeDividendPolicy(stock.dividendPolicy);
        // Uwaga: onchange jest zazwyczaj zdefiniowany w HTML, ale upewnij się, że działa
    }

    // --- 4. Wybór Banku ---
    const bankSelect = document.getElementById('bank-select');
    const changeBankBtn = document.getElementById('change-bank-btn');
    
    if (bankSelect && changeBankBtn) {
        bankSelect.innerHTML = '<option value="">-- Brak --</option>';
        const activeBanks = commercialBanks.filter(b => b.isActive && (b.type === 'Korporacyjny' || b.type === 'Uniwersalny'));
        
        activeBanks.forEach(bank => {
            const option = document.createElement('option');
            option.value = bank.id;
            option.textContent = `${bank.name} (Gotówka: ${bank.cash.toLocaleString()} PLN)`;
            if (stock.bankAccountId === bank.id) option.selected = true;
            bankSelect.appendChild(option);
        });
        
        changeBankBtn.onclick = () => changeCompanyBank(symbol, bankSelect.value);
    }

    // --- 5. Zadłużenie (Ratunek) ---
    const debtSection = document.getElementById('debt-management-section');
    if (debtSection) {
        // Sprawdzamy liabilities z bilansu
        if (stock.balanceSheet && stock.balanceSheet.liabilities > 0) {
            safeSetText('corporate-debt-amount', stock.balanceSheet.liabilities.toFixed(2));
            
            const repaymentInput = document.getElementById('debt-repayment-amount');
            if (repaymentInput) repaymentInput.value = '';
            
            const repayBtn = document.getElementById('repay-debt-btn');
            if (repayBtn) {
                repayBtn.onclick = () => {
                    const amount = parseFloat(repaymentInput.value);
                    if (!isNaN(amount)) playerBailsOutCompany(symbol, amount);
                };
            }
            debtSection.style.display = 'block';
        } else {
            debtSection.style.display = 'none';
        }
    }

    // --- 6. Panel Badań (R&D) ---
    const rdSection = document.getElementById('rd-management-section');
    if (rdSection) {
        if (stock.research && stock.research.isResearching && stock.research.currentTech) {
            const tech = technologies[stock.research.currentTech];
            safeSetText('rd-current-tech-name', tech ? tech.name : "Nieznane");
            
            const progressBar = document.getElementById('rd-progress-bar');
            if (progressBar) {
                const cost = tech ? tech.cost : 1;
                const progressPercent = (stock.research.progress / cost) * 100;
                progressBar.value = progressPercent;
            }
            
            const openRdBtn = document.getElementById('open-research-panel-btn');
            if (openRdBtn) openRdBtn.onclick = () => openResearchModal(symbol);
            
            rdSection.style.display = 'block';
        } else {
            rdSection.style.display = 'none';
        }
    }

    // --- 7. Dostęp Finansowy (Księgowy) ---
    const financialSection = document.getElementById('financial-access-section');
    const viewFinancesBtn = document.getElementById('view-finances-btn');
    const financesInfo = document.getElementById('finances-access-info');

    if (financialSection && viewFinancesBtn && financesInfo) {
        const accountantLevel = getSkillLevel('accountant');
        // Gracz ma większość?
        const playerShares = playerPortfolio[symbol] ? playerPortfolio[symbol].shares : 0;
        const isMajorityOwner = (playerShares / stock.totalShares) > 0.5;

        if (accountantLevel > 0) {
            financialSection.style.display = 'block';
            viewFinancesBtn.onclick = () => handleViewFinancesClick(symbol);
            financesInfo.textContent = '';

            if (stock.playerHasFinancialAccess || (accountantLevel >= 2 && isMajorityOwner)) {
                viewFinancesBtn.disabled = false;
                financesInfo.textContent = 'Dostęp aktywny.';
                financesInfo.className = 'text-up';
            } else {
                viewFinancesBtn.disabled = false;
                financesInfo.textContent = 'Wymagana opłata: 2000 PLN.';
                financesInfo.className = 'text-muted';
            }
        } else {
            financialSection.style.display = 'none';
        }
    }

    // --- 8. Reputacja ---
    const repSection = document.getElementById('reputation-management-section');
    if (repSection) {
        if (stock.reputation && stock.reputation['player'] !== undefined) {
            safeSetText('reputation-status', `${stock.reputation['player'].toFixed(1)}`);
            
            const donateBtn = document.getElementById('donate-btn');
            if (donateBtn) {
                donateBtn.onclick = () => {
                    const amount = document.getElementById('donation-amount').valueAsNumber;
                    donateToCompany(symbol, amount);
                };
            }
            repSection.style.display = 'block';
        } else {
            // Fallback dla nowych spółek bez zainicjowanej reputacji
            safeSetText('reputation-status', '0.0');
            repSection.style.display = 'block';
        }
    }

    // --- 9. Wpływy i Naciski ---
    const influenceSection = document.getElementById('influence-section');
    if (influenceSection) {
        if (stock.influence) {
            safeSetText('influence-total-received', stock.influence.totalReceived.toFixed(1));
            
            // Wypełnij listy wpływów
            const exertedListEl = document.getElementById('influence-exerted-list');
            if (exertedListEl) {
                exertedListEl.innerHTML = '';
                const exertedEntries = Object.entries(stock.influence.exerted || {});
                if (exertedEntries.length > 0) {
                    exertedEntries.sort(([, a], [, b]) => b - a);
                    exertedEntries.forEach(([targetSym, val]) => {
                        const li = document.createElement('li');
                        li.textContent = `${targetSym}: ${val.toFixed(1)}`;
                        exertedListEl.appendChild(li);
                    });
                } else {
                    exertedListEl.innerHTML = '<li>Brak</li>';
                }
            }

            const receivedListEl = document.getElementById('influence-received-list');
            if (receivedListEl) {
                receivedListEl.innerHTML = '';
                const receivedEntries = Object.entries(stock.influence.received || {});
                if (receivedEntries.length > 0) {
                    receivedEntries.sort(([, a], [, b]) => b - a);
                    receivedEntries.forEach(([sourceSym, val]) => {
                        const li = document.createElement('li');
                        li.textContent = `${sourceSym}: ${val.toFixed(1)}`;
                        receivedListEl.appendChild(li);
                    });
                } else {
                    receivedListEl.innerHTML = '<li>Brak</li>';
                }
            }
            influenceSection.style.display = 'block';
        } else {
            influenceSection.style.display = 'none';
        }
    }

    // --- 10. Fuzje i Przejęcia (M&A) ---
    const maInitiation = document.getElementById('ma-initiation-section');
    const maDefense = document.getElementById('ma-defense-section');
    
    if (maInitiation && maDefense) {
        if (stock.mergerProcess) {
            maInitiation.style.display = 'none';
            // Jeśli jesteśmy celem ataku
            if ((stock.mergerProcess.type === 'przejęcie' || stock.mergerProcess.type === 'influenceTakeover') && 
                stock.mergerProcess.initiatorSymbol !== symbol) {
                
                maDefense.style.display = 'block';
                safeSetText('ma-defense-info', `Atakuje: ${stock.mergerProcess.initiatorSymbol}`);
                
                const defenseBox = document.getElementById('ma-defense-buttons');
                if (defenseBox) defenseBox.innerHTML = getFundStakePct(stock) > 0.5
                    ? `<div class="defense-grid">${renderDefenseButtons(stock)}</div><button class="mt-2" onclick="openTakeoverModal('${symbol}')">Szczegóły oferty</button>`
                    : '<p class="text-xs text-muted">Obronę uruchamia akcjonariusz większościowy.</p>';
            } else {
                maDefense.style.display = 'none';
            }
        } else {
            maInitiation.style.display = 'block';
            maDefense.style.display = 'none';
            const maBtn = document.getElementById('ma-open-target-modal-btn');
            if (maBtn) maBtn.onclick = () => openMaTargetModal(symbol);
        }
    }

    // === 11. ZAKŁADKA: Działy i Inwestycje ===
    const deptsContent = document.getElementById('mgmt-content-depts');
    if (deptsContent) {
        if (typeof renderDepartmentsSection === 'function') {
            renderDepartmentsSection(stock, deptsContent);
        } else {
            { console.warn('Brak funkcji renderDepartmentsSection'); deptsContent.innerHTML = '<p class="text-muted">Działy spółki są chwilowo niedostępne.</p>'; }
        }
    }

    // Przełączenie na odpowiednią zakładkę (np. po kliknięciu "Ulepsz" chcemy wrócić do działów)
    if (typeof switchManagementTab === 'function') {
        switchManagementTab(defaultTab);
    }

    // Pokaż modal
    modal.style.display = 'block';
}

function switchManagementTab(tabName) {
    // Ukryj wszystkie treści
    document.getElementById('mgmt-content-main').style.display = 'none';
    document.getElementById('mgmt-content-depts').style.display = 'none';
    
    // Odznacz przyciski
    document.getElementById('tab-btn-mgmt-main').classList.remove('active');
    document.getElementById('tab-btn-mgmt-depts').classList.remove('active');
    
    // Pokaż wybraną treść i zaznacz przycisk
    document.getElementById(`mgmt-content-${tabName}`).style.display = 'block';
    document.getElementById(`tab-btn-mgmt-${tabName}`).classList.add('active');
}

// Plik: ui.js
// Ta funkcja jest z ui.js (baza) i obsługuje złożony modal bankowy (z zakładkami)
function openBankModal() {
    const ceoInfo = document.querySelector('#bank-content-central .central-bank-ceo-info');
    if (ceoInfo && centralBank.ceo) {
        const traits = centralBank.ceo.traits.map(trait => `<span class="bank-trait" title="${escapeHtml(trait.description)}">${escapeHtml(trait.name)}</span>`).join('');
        ceoInfo.innerHTML = `<div class="bank-ceo"><span class="bank-ceo-label">Prezes Banku Centralnego</span><strong>${escapeHtml(centralBank.ceo.name)}</strong><div class="bank-traits">${traits}</div></div>`;
    }


    // Aktualizacja sekcji ofert do państwa (z bazy ui.js)
    const stateCompanySelect = document.getElementById('state-company-select');
    const stateOfferSection = document.getElementById('state-offer-section'); // Dodano sprawdzenie
    if (stateCompanySelect && stateOfferSection) { // Sprawdź, czy elementy istnieją
        stateCompanySelect.innerHTML = '<option value="">-- Wybierz --</option>';
        const ownedStateCompanies = stocks.filter(s => s.isStateOwned && playerPortfolio[s.symbol] && playerPortfolio[s.symbol].shares > 0);

        if (ownedStateCompanies.length > 0) {
            ownedStateCompanies.forEach(stock => {
                const option = document.createElement('option');
                option.value = stock.symbol;
                option.textContent = stock.name;
                stateCompanySelect.appendChild(option);
            });
            stateOfferSection.style.display = 'block';
            updateStateOfferInfo();
        } else {
            stateOfferSection.style.display = 'none';
        }
    }


    // Sprawdź dostęp do bonów, zanim pokażesz sekcję aukcji (z bazy ui.js)
    checkTBillAccess();
    updateTBillAuctionSection();
    updateCollateralAuctionSection(); // Funkcja z ui.js

    const baseRateEl = document.getElementById('bc-base-rate-display');
    if (baseRateEl) {
        baseRateEl.textContent = (centralBank.baseInterestRate * 100).toFixed(1);
    }

    renderBankTicker();
    switchBankTab('central'); // Ustaw domyślną zakładkę
    document.getElementById('bank-modal').style.display = 'block';
}


function openStockDetailsModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const modal = document.getElementById('stock-details-modal');
    const title = document.getElementById('details-title');

    title.textContent = `Struktura Akcjonariatu: ${stock.name} (${symbol})`;
    const badges = document.getElementById('details-badges');
    if (badges) badges.innerHTML = renderDividendBadges(stock); // arystokrata, stopa dywidendy, seria (dividends.js)
    renderOwnershipPieChart(symbol); // Wywołujemy naszą funkcję do renderowania wykresu


    const insights = document.getElementById('analyst-insights');
    if (insights) {
        const lines = typeof getAnalystInsights === 'function' ? getAnalystInsights(stock) : [];
        insights.innerHTML = lines.map(line => `<p>🔎 ${escapeHtml(line)}</p>`).join('');
    }

    modal.style.display = 'block';
}


function updateDividendTrackerButtonVisibility() {
    const btn = document.getElementById('open-dividend-tracker-btn');
    if (!btn) return;
    // 0.13.1 (B8): panel zawsze dostępny; szkolenie odkrywa terminy i szacunki ogłoszonych wypłat.
    btn.style.display = 'inline-block';
    btn.title = getSkillLevel('dividendAnalyst') > 0 ? 'Panel Analityka Dywidend' : 'Panel dywidend (szkolenie „Analityk Dywidend” pokaże terminy i szacunki)';
}

function renderDividendTrackerContent() {
    const body = document.getElementById('dividend-tracker-body');
    if (!body) return;

    body.innerHTML = '';
    const skillLvl = getSkillLevel('dividendAnalyst');

    // Bez szkolenia: spółki, które ostatnio wypłaciły dywidendę (stopa z ostatniego roku) + zachęta do szkolenia.
    if (skillLvl < 1) {
        const payers = stocks.filter(s => !s.isBankrupt && !s.assetType && s.lastDividend)
            .map(s => ({ s, dy: typeof getTrailingDividendYield === 'function' ? getTrailingDividendYield(s) : (s.lastDividend.yield || 0) }))
            .sort((a, b) => b.dy - a.dy).slice(0, 15);
        const info = body.insertRow().insertCell();
        info.colSpan = 5;
        info.className = 'text-center text-sm text-muted';
        info.textContent = '🔒 Szkolenie „Analityk Dywidend” (CV i szkolenia) pokaże ogłoszone wypłaty, czas do dnia odcięcia i szacowaną kwotę.';
        payers.forEach(({ s, dy }) => {
            const row = body.insertRow();
            row.insertCell().textContent = s.isDividendAristocrat ? `👑 ${s.name}` : s.name;
            row.insertCell().textContent = getDividendPolicyLabel(s.dividendPolicy);
            row.insertCell().textContent = s.pendingDividend ? 'ogłoszona' : '—';
            row.insertCell().textContent = `ostatnio ${s.lastDividend.dps.toFixed(4)} PLN`;
            row.insertCell().textContent = `${(dy * 100).toFixed(2)}%`;
        });
        if (!payers.length) { const cell = body.insertRow().insertCell(); cell.colSpan = 5; cell.className = 'text-center'; cell.textContent = 'Jeszcze żadna spółka nie wypłaciła dywidendy.'; }
        return;
    }

    // Ogłoszone (oczekujące) dywidendy i REIT-y — najbliższe wypłaty na górze.
    const dividendStocks = stocks
        .filter(s => !s.isBankrupt && (s.pendingDividend || s.assetType === 'REIT'))
        .sort((a, b) => a.dividendTimer - b.dividendTimer);

    if (dividendStocks.length === 0) {
        const row = body.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.textContent = "Teraz żadna spółka nie ma ogłoszonej dywidendy — zarządy ogłaszają je po raportach kwartalnych.";
        cell.classList.add('text-center');
        return;
    }

    dividendStocks.forEach(stock => {
        const row = body.insertRow();
        row.insertCell().textContent = stock.isDividendAristocrat ? `👑 ${stock.name}` : stock.name;
        row.insertCell().textContent = stock.assetType === 'REIT' ? 'REIT (co 2 min)' : getDividendPolicyLabel(stock.dividendPolicy);

        // ⏳ Czas do wypłaty
        const timeLeftCell = row.insertCell();
        if (skillLvl >= 2) {
            if (typeof stock.dividendTimer === "number") {
                timeLeftCell.textContent = `${Math.max(0, Math.floor(stock.dividendTimer / 1000))} s`;
            } else {
                timeLeftCell.textContent = "Brak danych";
            }
        } else {
            timeLeftCell.textContent = "Wkrótce";
        }

        // 💰 Szacowana dywidenda
        const estimateCell = row.insertCell();
        if (skillLvl >= 3) {
            if (typeof stock.estimatedDividend === "number") {
                estimateCell.textContent = `${stock.estimatedDividend.toFixed(4)} PLN`;
            } else {
                estimateCell.textContent = "Brak danych";
            }
        } else {
            estimateCell.textContent = "???";
        }

        // 📈 Stopa dywidendy (dywidenda / cena)
        const yieldCell = row.insertCell();
        const dps = Number(stock.estimatedDividend) || 0;
        yieldCell.textContent = skillLvl >= 3 && stock.price > 0 ? `${(dps / stock.price * 100).toFixed(2)}%` : '???';
    });
}

function openDividendTrackerModal() {
    const modal = document.getElementById('dividend-tracker-modal');
    renderDividendTrackerContent();
    modal.style.display = 'flex'; // ważne! nie 'block', bo w CSS masz flex
}

function displayStartups(previousInputValues = {}) {
    const startupPanel = document.getElementById('startup-incubator-panel');
    const startupTableBody = document.getElementById('startup-table-body');
    if (!startupTableBody || !startupPanel) return;

    // Inkubator: inwestuje fundusz (limit 10% aktywów); szkolenie „Anioł Biznesu” daje tylko bonusy.
    startupPanel.style.display = FEATURE_FLAGS.startups ? 'block' : 'none';
    if (!FEATURE_FLAGS.startups) return;
    const limitInfo = document.getElementById('startup-fund-limit');
    if (limitInfo) limitInfo.textContent = `Fundusz w startupach: ${getFundStartupExposure().toFixed(0)} PLN z limitu ${(getFundAssets() * STARTUP_FUND_LIMIT).toFixed(0)} PLN (${(STARTUP_FUND_LIMIT * 100).toFixed(0)}% aktywów).` + (getCrowdingPressure() > 0 ? ` 🧱 Rynek nasycony (${getListedCompanyCount()}/${LISTING_SOFT_CAP} spółek): finansowanie startupów mniejsze o ${((1 - getStartupFundingFactor()) * 100).toFixed(0)}%, cele zbiórek wyższe.` : '');

    const startups = stocks.filter(s => s.assetType === 'Startup');
    startupTableBody.innerHTML = '';

    startups.forEach(startup => {
        const row = startupTableBody.insertRow();

        // --- POCZĄTEK LOGIKI DLA POZIOMU 3 i 6 ---
        let scamDetectionChance = 0;
        const skillLvl = getSkillLevel('startupInvestor');
        if (skillLvl >= 6) {
            scamDetectionChance = 0.50;
        } else if (skillLvl >= 3) {
            scamDetectionChance = 0.15;
        }

        if (scamDetectionChance > 0 && startup.isScam && !startup.isScamDetected) {
            if (Math.random() < scamDetectionChance) {
                startup.isScamDetected = true;
            }
        }
        // --- KONIEC LOGIKI DLA POZIOMU 3 i 6 ---

        if (startup.isScamDetected) {
            
            row.title = 'UWAGA! Ten start-up to prawdopodobnie oszustwo!';
        }

        // Komórka 1: Nazwa
        const nameCell = row.insertCell();
        let nameHTML = `${startup.name} (${startup.symbol})`;
        if (startup.isPrivatized) {
            nameHTML += ` <span title="Projekt sprywatyzowany. Sukces gwarantowany, ale możliwe komplikacje.">🏢</span>`;
        }
        nameHTML += ` <button onclick="openInvestorsModal('${startup.symbol}')" class="ml-2 btn-xs text-sm">🏆 Ranking</button>`;
        nameCell.innerHTML = nameHTML;

        // Komórka 2: Cel Finansowania
        row.insertCell().textContent = `${startup.fundingGoal.toLocaleString('pl-PL')} PLN`;

        // Komórki 3, 4 i 5
        const fundingCell = row.insertCell();
        const progressCell = row.insertCell();
        const actionsCell = row.insertCell();

        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.placeholder = 'Kwota';
        amountInput.classList.add('w-sm');
        amountInput.id = `invest-amount-${startup.symbol}`;
        amountInput.value = previousInputValues[startup.symbol] || '';
        const investButton = document.createElement('button');

        switch (startup.stage) {
            case 'funding': {
                fundingCell.innerHTML = `${startup.currentFunding.toFixed(2)} PLN <progress value="${startup.currentFunding}" max="${startup.fundingGoal}" class="w-full"></progress>`;
                progressCell.innerHTML = `<progress value="0" max="100" class="w-full"></progress>`;
                investButton.textContent = 'Zainwestuj';
                investButton.onclick = () => {
                    const amount = parseFloat(amountInput.value);
                    investInStartup(startup.symbol, amount);
                };
                if (startup.isScamDetected || startup.isPrivatized) investButton.disabled = true;

                actionsCell.appendChild(amountInput);
                actionsCell.appendChild(investButton);

                // Przycisk Prywatyzacji (Logika Poziomu 5)
                if (skillLvl >= 5 && !startup.isPrivatized) {
                    const privatizeButton = document.createElement('button');
                    privatizeButton.textContent = '🏢 Prywatyzuj';
                    privatizeButton.title = 'Wykup projekt na wyłączność. Gwarantuje to sukces, ale wprowadza ryzyko dodatkowych kosztów lub opóźnień.';
                    privatizeButton.classList.add('ml-1');
                    privatizeButton.onclick = () => privatizeStartup(startup.symbol);
                    actionsCell.appendChild(privatizeButton);
                }

                // Przycisk Auto-inwestycji (ten, który dodawaliśmy ostatnio)
                const autoInvestSettings = playerStartupAutoInvest[startup.symbol];
                const autoInvestButton = document.createElement('button');
                autoInvestButton.textContent = '🔄';
                autoInvestButton.title = 'Ustaw automatyczne inwestowanie';
                autoInvestButton.classList.add('ml-1');
                if (autoInvestSettings && autoInvestSettings.isEnabled) {
                    autoInvestButton.style.borderColor = 'var(--color-up)';
                    autoInvestButton.style.borderWidth = '2px';
                }
                autoInvestButton.onclick = () => openStartupAutoInvestModal(startup.symbol);
                actionsCell.appendChild(autoInvestButton);

                break;
            }

            case 'development':
                fundingCell.innerHTML = `<strong class="text-info">W trakcie rozwoju...</strong>`;

                if (startup.pendingExtraCost) {
                    progressCell.innerHTML = `<span class="text-down fw-bold">WSTRZYMANO</span>`;
                    actionsCell.innerHTML = `<span>Wymaga: ${startup.pendingExtraCost.toFixed(2)} PLN</span>
                                           <button onclick="payExtraStartupCost('${startup.symbol}')">Zapłać</button>`;
                } else if (startup.developmentPausedUntil && Date.now() < startup.developmentPausedUntil) {
                    const timeLeft = Math.ceil((startup.developmentPausedUntil - Date.now()) / 1000);
                    progressCell.innerHTML = `<span class="text-warn">OPÓŹNIENIE (${timeLeft}s)</span>`;
                    actionsCell.innerHTML = 'Prace wstrzmane';
                } else {
                    progressCell.innerHTML = `<progress value="${startup.developmentProgress}" max="100" class="w-full"></progress>`;
                    actionsCell.innerHTML = 'Zablokowane';
                }
                break;

            case 'awaitingListing': { // P1: gotowy do debiutu, giełda pełna
                const waited = (typeof macro === 'object' ? macro.quarter : 0) - (startup.awaitingListing?.since || 0);
                fundingCell.innerHTML = `<strong class="text-warn">⏳ Czeka na miejsce na giełdzie</strong>`;
                progressCell.innerHTML = `<span class="text-sm">${waited}/${AWAITING_LISTING_MAX_QUARTERS} kw. — potem przejęcie przez inwestora</span>`;
                actionsCell.textContent = `Giełda pełna (${getListedCompanyCount()}/${LISTING_HARD_CAP})`;
                break;
            }

            case 'financial_complications':
                const timeLeftFC = Math.max(0, Math.floor(startup.rescueTimeLeft / 1000));
                fundingCell.innerHTML = `
                    <strong class="text-down">Wymagane dofinansowanie!</strong>
                    <progress value="${startup.rescueCurrent}" max="${startup.rescueGoal}" class="w-full"></progress>
                    <span>${startup.rescueCurrent.toLocaleString('pl-PL')} / ${startup.rescueGoal.toLocaleString('pl-PL')} PLN</span>
                `;
                progressCell.innerHTML = `<strong class="text-down">Pozostały czas: ${timeLeftFC}s</strong>`;

                const rescueInput = document.createElement('input');
                rescueInput.type = 'number';
                rescueInput.placeholder = 'Kwota';
                rescueInput.classList.add('w-sm');
                const rescueButton = document.createElement('button');
                rescueButton.textContent = 'Dofinansuj';
                rescueButton.onclick = () => {
                    const amount = parseFloat(rescueInput.value);
                    playerRescuesStartup(startup.symbol, amount);
                };

                // Pokaż przycisk tylko jeśli gracz jest już inwestorem
                if (playerPortfolio[startup.symbol]) {
                    actionsCell.appendChild(rescueInput);
                    actionsCell.appendChild(rescueButton);
                } else {
                    actionsCell.textContent = 'Tylko dla inwestorów';
                }
                break;



            case 'overfunding': {
                const timeLeftOF = Math.max(0, Math.floor(startup.overfundingTimeLeft / 1000));
                fundingCell.innerHTML = `<strong class="text-up">Cel osiągnięty!</strong><br>Czas na bonus: ${timeLeftOF}s`;
                progressCell.innerHTML = `<progress value="0" max="100" class="w-full"></progress>`;
                investButton.textContent = 'Zainwestuj (Bonus)';

                // Tworzenie przycisku auto-inwestycji (ten kod jest poprawny)
                const autoInvestSettings = playerStartupAutoInvest[startup.symbol];
                const autoInvestButton = document.createElement('button');
                autoInvestButton.textContent = '🔄'; // Użyłem sugerowanej przez Ciebie emotki
                autoInvestButton.title = 'Ustaw automatyczne inwestowanie';
                autoInvestButton.classList.add('ml-1');
                if (autoInvestSettings && autoInvestSettings.isEnabled) {
                    autoInvestButton.style.borderColor = 'var(--color-up)'; // Zielona ramka dla aktywnych
                    autoInvestButton.style.borderWidth = '2px';
                }
                autoInvestButton.onclick = () => openStartupAutoInvestModal(startup.symbol); // To też jest potrzebne!

                investButton.onclick = () => {
                    const amount = parseFloat(amountInput.value);
                    investInStartup(startup.symbol, amount);
                };

                if (startup.isScamDetected) investButton.disabled = true;

                // Dodawanie elementów do komórki
                actionsCell.appendChild(amountInput);
                actionsCell.appendChild(investButton);
                actionsCell.appendChild(autoInvestButton);

                break;
            }
        }

        // Ubezpieczenie (Logika Poziomu 4)
        const holding = playerPortfolio[startup.symbol];
        if ((startup.stage === 'funding' || startup.stage === 'overfunding') && skillLvl >= 4 && holding && !holding.isInsured && !startup.isScamDetected) {
            const insuranceButton = document.createElement('button');
            insuranceButton.textContent = '🛡️ Ubezpiecz';
            insuranceButton.title = 'Koszt: 5% Twojej dotychczasowej inwestycji';
            insuranceButton.classList.add('ml-1');
            insuranceButton.onclick = () => buyStartupInsurance(startup.symbol);
            actionsCell.appendChild(insuranceButton);
        }
    });
}

function openInvestorsModal(symbol) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || !startup.investors) return;

    const modal = document.getElementById('investors-modal');
    const title = document.getElementById('investors-modal-title');
    const tableBody = document.getElementById('investors-table-body');

    title.textContent = `Ranking Inwestorów: ${startup.name}`;
    tableBody.innerHTML = ''; // Wyczyść poprzednią zawartość

    // Przekształcamy obiekt inwestorów w tablicę i sortujemy
    const sortedInvestors = Object.entries(startup.investors)
        .sort(([, a], [, b]) => b - a); // Sortuj malejąco po kwocie

    if (sortedInvestors.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Brak inwestorów.</td></tr>';
    } else {
        sortedInvestors.forEach(([name, amount], index) => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = `#${index + 1}`;
            const mine = name === 'Pula Inwestycyjna' ? getPoolStartupShare(startup, 'player') : 0; // 0.14.1 R4
            row.insertCell().textContent = mine > 0 ? `${name} (w tym Ty: ${mine.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN)` : name;
            row.insertCell().textContent = `${amount.toLocaleString('pl-PL')} PLN`;

            if (name === "Ty (Gracz)") {
                row.style.fontWeight = 'bold';
                row.classList.add('player-row'); // Dodaj klasę CSS dla gracza
            }
        });
    }

    modal.style.display = 'block';
}

function getCurrentStartupInputValues() {
    const values = {};
    const startups = stocks.filter(s => s.assetType === 'Startup');
    startups.forEach(startup => {
        const inputElement = document.getElementById(`invest-amount-${startup.symbol}`);
        if (inputElement) {
            values[startup.symbol] = inputElement.value;
        }
    });
    return values;
}

function displayInvestmentPool() {
    const totalFundsEl = document.getElementById('pool-total-funds');
    const timerEl = document.getElementById('pool-timer');
    const contributorsListEl = document.getElementById('pool-contributors-list');

    if (!totalFundsEl) return; // Panel nie istnieje, nic nie rób

    totalFundsEl.textContent = `${investmentPool.totalFunds.toLocaleString('pl-PL')} PLN`;
    timerEl.textContent = `${Math.floor(investmentPool.investmentTimer / 1000)}`;
    const statusEl = document.getElementById('pool-status'); // 0.14.1 R3: dlaczego pieniądze czekają
    if (statusEl) statusEl.textContent = getPoolStatus().text;
    const withdrawBtn = document.getElementById('pool-withdraw-btn');
    if (withdrawBtn) withdrawBtn.disabled = !((investmentPool.contributors.player || 0) > 0);

    contributorsListEl.innerHTML = '';
    const contributors = Object.entries(investmentPool.contributors);

    if (contributors.length === 0) {
        contributorsListEl.textContent = 'Brak wpłat w tej rundzie.';
    } else {
        // Prosta wizualizacja w formie pasków
        contributors.forEach(([id, amount]) => {
            const percentage = (amount / investmentPool.totalFunds) * 100;
            const name = id === 'player' ? 'Ty (Gracz)' : aiCompetitors.find(a => a.id === id)?.name || 'Nieznany AI';

            const barContainer = document.createElement('div');
            barContainer.classList.add('mb-1');
            barContainer.innerHTML = `
                <span>${name}: ${amount.toLocaleString('pl-PL')} PLN</span>
                <div class="w-full bg-muted">
                    <div style="width: ${percentage}%" class="bg-info text-on-accent text-right">
                        ${percentage.toFixed(1)}%
                    </div>
                </div>
            `;
            contributorsListEl.appendChild(barContainer);
        });
    }

    renderPoolDetails(); // 0.14.1 R4

    // Na końcu dodaj tę linię:
    updateAutoInvestStatus();
}

const POOL_STAGE_LABELS = { funding: 'zbiórka', overfunding: 'nadsubskrypcja', development: 'rozwój', awaitingListing: 'czeka na giełdę', financial_complications: 'komplikacje' };
const POOL_KIND_LABELS = { ipo: '📈 debiut', takeover: '🤝 przejęcie', refund: '📉 upadek', loss: '💀 strata', privatized: '🏢 prywatyzacja' };

/** Wkład uczestnika przez pulę w dany startup (suma rund). */
function getPoolStartupShare(startup, id) {
    return (startup.poolInvestors || []).reduce((sum, round) => sum + (Number(round.contributors?.[id]) || 0), 0);
}

/** 0.14.1 R4: panel puli — niezainwestowane, wkłady w startupy, historia rozliczeń. */
function renderPoolDetails() {
    const el = document.getElementById('pool-details');
    if (!el) return;
    const fmtZl = value => `${(Number(value) || 0).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN`;
    const free = Number(investmentPool.contributors?.player) || 0;
    const rows = stocks.filter(s => s.assetType === 'Startup' && (s.poolInvestors || []).length).map(s => {
        const pool = (s.poolInvestors || []).reduce((sum, round) => sum + (Number(round.amount) || 0), 0);
        const mine = getPoolStartupShare(s, 'player');
        return `<tr><td>${escapeHtml(s.name)} (${escapeHtml(s.symbol)})</td><td>${POOL_STAGE_LABELS[s.stage] || escapeHtml(s.stage || '—')}</td><td>${fmtZl(pool)}</td><td>${mine > 0 ? `${fmtZl(mine)} · ${(mine / pool * 100).toFixed(1)}%` : '—'}</td></tr>`;
    });
    const history = (investmentPool.history || []).map(h => `<li><span class="text-muted">kw. ${h.quarter ?? '—'}</span> ${POOL_KIND_LABELS[h.kind] || ''} ${escapeHtml(h.text || '')}</li>`);
    el.innerHTML = `
        <h4>Niezainwestowane</h4>
        <p>Razem: <strong>${fmtZl(investmentPool.totalFunds)}</strong> · Twoje: <strong>${fmtZl(free)}</strong></p>
        <h4>W startupach</h4>
        ${rows.length ? `<table class="w-full text-sm"><thead><tr><th>Startup</th><th>Etap</th><th>Kwota puli</th><th>Twój udział</th></tr></thead><tbody>${rows.join('')}</tbody></table>` : '<p class="text-muted">Pula nie ma teraz wkładów w startupach.</p>'}
        <h4>Ostatnie rozliczenia (Twój udział)</h4>
        ${history.length ? `<ul class="text-sm">${history.join('')}</ul>` : '<p class="text-muted">Brak rozliczeń.</p>'}`;
}

// --- NOWY FRAGMENT - FUNKCJE DLA MODALA AUTO-INWESTOWANIA ---

function updateAutoInvestStatus() {
    const statusEl = document.getElementById('autoinvest-status');
    if (!statusEl) return;

    if (playerAutoInvest.isEnabled) {
        statusEl.innerHTML = `✅ Aktywne: <strong>${playerAutoInvest.amount} PLN</strong> co <strong>${playerAutoInvest.interval / 1000}s</strong>`;
        statusEl.style.color = 'var(--color-up)';
    } else {
        statusEl.textContent = '❌ Nieaktywne';
        statusEl.style.color = 'var(--color-down)';
    }
}

function setupAutoInvestModal() {
    const modal = document.getElementById('autoinvest-modal');
    const openBtn = document.getElementById('open-autoinvest-modal-btn');
    const amountInput = document.getElementById('autoinvest-amount');
    const intervalSlider = document.getElementById('autoinvest-interval');
    const intervalValueSpan = document.getElementById('autoinvest-interval-value');
    const toggleBtn = document.getElementById('toggle-autoinvest-btn');

    if (!modal || !openBtn) return;

    openBtn.onclick = () => {
        // Wypełnij modal aktualnymi danymi
        amountInput.value = playerAutoInvest.amount;
        intervalSlider.value = playerAutoInvest.interval / 1000;
        intervalValueSpan.textContent = `${intervalSlider.value}s`;
        updateToggleButton();
        modal.style.display = 'block';
    };

    amountInput.onchange = () => {
        playerAutoInvest.amount = Math.max(10, amountInput.valueAsNumber); // Minimalna kwota 10
        updateAutoInvestStatus();
    };

    intervalSlider.oninput = () => {
        playerAutoInvest.interval = intervalSlider.value * 1000;
        intervalValueSpan.textContent = `${intervalSlider.value}s`;
        updateAutoInvestStatus();
    };

    toggleBtn.onclick = () => {
        playerAutoInvest.isEnabled = !playerAutoInvest.isEnabled;
        if (playerAutoInvest.isEnabled) {
            // Po włączeniu, zresetuj timer, aby pierwsza wpłata była od razu po ustawionym czasie
            playerAutoInvest.timer = playerAutoInvest.interval;
        }
        updateToggleButton();
        updateAutoInvestStatus();
    };

    function updateToggleButton() {
        if (playerAutoInvest.isEnabled) {
            toggleBtn.textContent = 'Wyłącz Automatyzację';
            toggleBtn.style.backgroundColor = 'var(--color-down)';
        } else {
            toggleBtn.textContent = 'Włącz Automatyzację';
            toggleBtn.style.backgroundColor = 'var(--color-up)';
        }
    }
}

let toastTimer = null;

// =================================================================================
// 0.14.2 P7: PASEK NEWSÓW + DYMKI TYLKO W SPRAWACH GRACZA (≤ 3 na minutę gry)
// =================================================================================
const NEWS_HISTORY_LIMIT = 50;
const NEWS_TICKER_ITEMS = 12;
const TOAST_LIMIT_PER_GAME_MINUTE = 3;
const PLAYER_MATTER_PATTERN = /fundusz|twoj|twój|twoje|twoich|awans|degradac|ocena zarządu|\bkar[aęy]\b|grzywn|przelew|wypłat|konto prywatne|portfel|decyzj|oferta dla|mail/i;
let newsLog = [];
let toastGameTimes = [];
let userActionUntil = 0;
const toastStats = { shown: 0, feedback: 0, toNews: 0, limited: 0 };
if (typeof document !== 'undefined' && document.addEventListener) {
    const markUserAction = () => { userActionUntil = Date.now() + 1500; };
    document.addEventListener('pointerdown', markUserAction, true);
    document.addEventListener('keydown', markUserAction, true);
}

/** Dymek dotyczy gracza: spółka z jego akcjami albo słowa o funduszu, ocenie, karach, przelewach, decyzjach. */
function isPlayerMatter(message) {
    const text = String(message || '');
    const stock = typeof findMentionedStock === 'function' ? findMentionedStock(text) : null;
    if (stock && ((playerPortfolio?.[stock.symbol]?.shares || 0) > 0 || (playerWallet?.portfolio?.[stock.symbol]?.shares || 0) > 0)) return true;
    return PLAYER_MATTER_PATTERN.test(text);
}

// 0.14.2 P11: płynny pasek — kolejka (≤ 15, pierwszeństwo spółek gracza), wpisy dokładane z prawej, ruch w rAF
// ze stałą prędkością (px/s) przez translate3d; wpisy, które wyjechały z lewej, znikają z korektą przesunięcia.
const NEWS_QUEUE_LIMIT = 15;
const NEWS_SPEED_PX = 60;
const NEWS_REDUCED_INTERVAL_MS = 5000;
const newsTicker = { queue: [], offset: null, track: null, viewport: null, paused: false, lastTs: null, raf: null, loopIndex: 0, reducedAt: 0,
    widthOf: el => el.offsetWidth || 0, viewportWidth: () => newsTicker.viewport?.clientWidth || 0,
    reduced: () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    isHidden: () => typeof document !== 'undefined' && Boolean(document.hidden) };

function isPlayerNews(entry) {
    return Boolean(entry.symbol && ((playerPortfolio?.[entry.symbol]?.shares || 0) > 0 || (playerWallet?.portfolio?.[entry.symbol]?.shares || 0) > 0));
}

/** Kolejka paska: przy przepełnieniu odpada najstarszy wpis spoza spraw gracza (zostaje w historii 📰). */
function enqueueTickerNews(entry) {
    const queue = newsTicker.queue;
    queue.push(entry);
    while (queue.length > NEWS_QUEUE_LIMIT) {
        const drop = queue.findIndex(n => !isPlayerNews(n));
        queue.splice(drop >= 0 ? drop : 0, 1);
    }
}

/** Wpis na pasek newsów (klik otwiera kartę spółki). Nie przebudowuje przewijanego pasa. */
function pushNews(text, symbol = null) {
    if (!text) return;
    const stock = symbol ? stocks.find(s => s.symbol === symbol) : (typeof findMentionedStock === 'function' ? findMentionedStock(String(text)) : null);
    const entry = { text: String(text), symbol: stock?.symbol || null };
    newsLog.unshift(entry);
    if (newsLog.length > NEWS_HISTORY_LIMIT) newsLog.length = NEWS_HISTORY_LIMIT;
    enqueueTickerNews(entry);
    attachNewsTicker();
    const history = typeof document !== 'undefined' ? document.getElementById('news-history') : null;
    if (history && !history.hidden) renderNewsHistory();
}

function makeNewsElement(entry) {
    const el = document.createElement('span');
    el.className = 'news-entry';
    el.innerHTML = `<span class="news-item${entry.symbol ? ' clickable' : ''}"${entry.symbol ? ` onclick="openDescriptionModal('${entry.symbol}')"` : ''}>${escapeHtml(entry.text)}</span><span class="news-sep">•</span>`;
    return el;
}

/** Następny wpis: z kolejki, a gdy pusta — kopia z historii (zapętlenie ostatnich wpisów). */
function nextTickerEntry() {
    if (newsTicker.queue.length) return newsTicker.queue.shift();
    const recent = newsLog.slice(0, NEWS_TICKER_ITEMS);
    if (!recent.length) return null;
    newsTicker.loopIndex = (newsTicker.loopIndex + 1) % recent.length;
    return recent[recent.length - 1 - newsTicker.loopIndex];
}

/** Podpięcie pasa (gra: #news-ticker-track; testy: własny element) i start pętli rAF. */
function attachNewsTicker(track = null, viewport = null) {
    if (typeof document === 'undefined') return null;
    if (track) { newsTicker.track = track; newsTicker.viewport = viewport || track.parentElement; newsTicker.offset = null; }
    if (!newsTicker.track) {
        const el = document.getElementById('news-ticker-track');
        if (!el) return null;
        newsTicker.track = el; newsTicker.viewport = el.parentElement;
        const bar = document.getElementById('news-ticker');
        if (bar) {
            // 0.14.5: pauza po najechaniu, przy fokusie klawiatury i przyciskiem (WCAG 2.2.2)
            const sync = () => { newsTicker.paused = Boolean(newsTicker.hover || newsTicker.focusInside || newsTicker.userPaused); };
            bar.addEventListener('mouseenter', () => { newsTicker.hover = true; sync(); });
            bar.addEventListener('mouseleave', () => { newsTicker.hover = false; sync(); });
            bar.addEventListener('focusin', () => { newsTicker.focusInside = true; sync(); });
            bar.addEventListener('focusout', () => { newsTicker.focusInside = false; sync(); });
            newsTicker.syncPause = sync;
        }
    }
    if (!newsTicker.raf && !track && typeof requestAnimationFrame === 'function') {
        const loop = ts => {
            newsTicker.raf = requestAnimationFrame(loop);
            const dt = newsTicker.lastTs === null ? 0 : Math.min(0.1, (ts - newsTicker.lastTs) / 1000); // bez nadrabiania skokiem
            newsTicker.lastTs = ts;
            stepNewsTicker(dt);
        };
        newsTicker.raf = requestAnimationFrame(loop);
    }
    return newsTicker.track;
}

/** Jeden krok ruchu o dt sekund. */
function stepNewsTicker(dt) {
    const t = newsTicker, track = t.track;
    if (!track) return;
    if (t.isHidden()) return;
    if (t.reduced()) { // jeden news naraz, zmiana co 5 s bez animacji
        t.reducedAt += dt * 1000;
        if (track.children.length && t.reducedAt < NEWS_REDUCED_INTERVAL_MS) return;
        const entry = nextTickerEntry();
        t.reducedAt = 0;
        if (entry) { track.replaceChildren(makeNewsElement(entry)); track.style.transform = ''; }
        return;
    }
    const view = t.viewportWidth();
    if (t.offset === null) t.offset = view; // pierwszy wpis wjeżdża z prawej
    if (!t.paused) t.offset -= NEWS_SPEED_PX * dt;
    // Wpisy, które w całości wyjechały z lewej: usunięcie z korektą przesunięcia (bez skoku).
    while (track.firstElementChild && t.offset + (track.firstElementChild._w ?? 0) < 0) {
        t.offset += track.firstElementChild._w ?? 0;
        track.firstElementChild.remove();
    }
    // Następny wpis, gdy ostatni w pełni wjechał.
    let total = 0;
    for (const child of track.children) total += child._w ?? 0;
    while (t.offset + total <= view) {
        const entry = nextTickerEntry();
        if (!entry) break;
        const el = makeNewsElement(entry);
        track.appendChild(el);
        el._w = t.widthOf(el);
        if (!(el._w > 0)) { el._w = 0; break; } // pasek niewidoczny (brak układu) — bez dokładania w pętli
        total += el._w;
    }
    track.style.transform = `translate3d(${t.offset.toFixed(1)}px, 0, 0)`;
}

/** Zgodność: pełne odświeżenie (tylko przy starcie / wczytaniu gry). */
function renderNewsTicker() {
    const t = newsTicker;
    if (!attachNewsTicker()) return;
    t.track.replaceChildren(); t.offset = null; t.queue = newsLog.slice(0, NEWS_TICKER_ITEMS).reverse();
    const history = document.getElementById('news-history');
    if (history && !history.hidden) renderNewsHistory();
}

function renderNewsHistory() {
    const history = document.getElementById('news-history');
    if (!history) return;
    history.innerHTML = `<h4 class="my-1">📰 Ostatnie wiadomości (${newsLog.length})</h4><ul class="list-plain text-sm">${newsLog.map(n => `<li${n.symbol ? ` class="clickable" onclick="openDescriptionModal('${n.symbol}')"` : ''}>${escapeHtml(n.text)}</li>`).join('') || '<li class="text-muted">Brak wiadomości.</li>'}</ul>`;
}

function toggleNewsHistory() {
    const history = document.getElementById('news-history');
    if (!history) return;
    history.hidden = !history.hidden;
    if (!history.hidden) renderNewsHistory();
}

function showToast(message, type = 'default', duration = 3000) {
    // 0.14.2 P7: odpowiedź na akcję gracza zawsze; zdarzenia gry — tylko sprawy gracza, ≤ 3 na minutę gry, reszta na pasek.
    if (Date.now() < userActionUntil) toastStats.feedback++;
    else if (!isPlayerMatter(message)) { toastStats.toNews++; pushNews(message); return; }
    else {
        const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
        toastGameTimes = toastGameTimes.filter(t => now - t < 60000 && now >= t);
        if (toastGameTimes.length >= TOAST_LIMIT_PER_GAME_MINUTE) { toastStats.limited++; pushNews(message); return; }
        toastGameTimes.push(now);
    }
    toastStats.shown++;
    const toastElement = document.getElementById('toast-notification');
    if (!toastElement) return;

    // Anuluj poprzedni timer, jeśli powiadomienie jest aktywne
    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    // Ustaw tekst i odpowiednią klasę stylu
    toastElement.textContent = message;
    toastElement.className = ''; // Resetuj klasy
    duration = Math.max(duration, 2500 + String(message).length * 50); // 0.14.5: dłuższy tekst = dłużej widoczny
    if (type !== 'default') {
        toastElement.classList.add(`toast-${type}`);
    }

    // Pokaż powiadomienie
    toastElement.style.display = 'block';

    // Ustaw timer do ukrycia powiadomienia
    toastTimer = setTimeout(() => {
        toastElement.style.display = 'none';
        toastTimer = null;
    }, duration);
}

function openStartupOfferModal(offerDetails) {
    const { startup, offer } = offerDetails;
    const modal = document.getElementById('startup-offer-modal');
    if (!modal) return;

    document.getElementById('startup-offer-title').textContent = `Oferta Specjalna od ${startup.name}!`;
    document.getElementById('startup-offer-message').textContent = offer.offerText;
    document.getElementById('startup-offer-amount').value = '';

    const acceptBtn = document.getElementById('accept-startup-offer-btn');
    const declineBtn = document.getElementById('decline-startup-offer-btn');

    // Klonujemy przycisk akceptacji, aby usunąć stare event listenery
    const newAcceptBtn = acceptBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);

    newAcceptBtn.onclick = () => {
        const amount = document.getElementById('startup-offer-amount').valueAsNumber;
        if (isNaN(amount) || amount <= 0) {
            showToast("Proszę wpisać poprawną, dodatnią kwotę inwestycji.");
            return;
        }
        acceptStartupOffer(startup.symbol, amount, offer.type, offer.value);
    };

    declineBtn.onclick = () => {
        logEvent(`Odrzucono ofertę specjalną od ${startup.name}.`, 'review');
        modal.style.display = 'none';
    };

    modal.style.display = 'block';
}

function openStartupAutoInvestModal(symbol) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup) return;

    const modal = document.getElementById('startup-autoinvest-modal');

    // Upewnij się, że mamy obiekt ustawień dla tego startupu
    if (!playerStartupAutoInvest[symbol]) {
        playerStartupAutoInvest[symbol] = {
            isEnabled: false,
            amount: 100,
            interval: 30000,
            timer: 30000
        };
    }
    const settings = playerStartupAutoInvest[symbol];

    // Pobierz elementy z modala
    document.getElementById('startup-autoinvest-title').textContent = `🤖 Auto-inwestowanie: ${startup.name}`;
    const amountInput = document.getElementById('startup-autoinvest-amount');
    const intervalSlider = document.getElementById('startup-autoinvest-interval');
    const intervalValueSpan = document.getElementById('startup-autoinvest-interval-value');
    const toggleBtn = document.getElementById('toggle-startup-autoinvest-btn');

    // Wypełnij modal aktualnymi danymi
    amountInput.value = settings.amount;
    intervalSlider.value = settings.interval / 1000;
    intervalValueSpan.textContent = `${intervalSlider.value}s`;

    // Funkcja do aktualizacji przycisku włącz/wyłącz
    function updateToggleButton() {
        if (settings.isEnabled) {
            toggleBtn.textContent = 'Wyłącz Automatyzację';
            toggleBtn.style.backgroundColor = 'var(--color-down)';
        } else {
            toggleBtn.textContent = 'Włącz Automatyzację';
            toggleBtn.style.backgroundColor = 'var(--color-up)';
        }
    }
    updateToggleButton();

    // Ustaw eventy dla kontrolek
    amountInput.onchange = () => {
        settings.amount = Math.max(10, amountInput.valueAsNumber);
    };

    intervalSlider.oninput = () => {
        settings.interval = intervalSlider.value * 1000;
        intervalValueSpan.textContent = `${intervalSlider.value}s`;
    };

    toggleBtn.onclick = () => {
        settings.isEnabled = !settings.isEnabled;
        if (settings.isEnabled) {
            settings.timer = settings.interval; // Resetuj timer po włączeniu
        }
        updateToggleButton();
        displayStartups(getCurrentStartupInputValues()); // Odśwież tabelę, by pokazać zieloną ramkę
    };

    modal.style.display = 'block';
}

// Ta funkcja jest zduplikowana w obu plikach, ale jest identyczna. Zostawiamy jedną.
function updateChartTypeButtons() {
    const candlestickBtn = document.getElementById('chart-type-candlestick-btn');
    const lineBtn = document.getElementById('chart-type-line-btn');

    if (!candlestickBtn || !lineBtn) return;

    // Aktywny typ wykresu — klasa zamiast stylów (motyw jasny/ciemny).
    candlestickBtn.classList.add('chart-type-btn');
    lineBtn.classList.add('chart-type-btn');
    candlestickBtn.classList.toggle('active', playerChartSettings.type === 'candlestick');
    lineBtn.classList.toggle('active', playerChartSettings.type !== 'candlestick');
    candlestickBtn.setAttribute('aria-pressed', String(playerChartSettings.type === 'candlestick'));
    lineBtn.setAttribute('aria-pressed', String(playerChartSettings.type !== 'candlestick'));
}

// Motyw: od 0.14.5 gra ma jeden, ciemny motyw (decyzja redesignu). toggleDarkMode zostaje dla zgodności.
const THEME_KEY = 'gra_inwestycyjna_theme';
let currentTheme = 'dark';

function toggleDarkMode() {
  currentTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, currentTheme); } catch (e) { /* brak dostępu do pamięci */ }
  document.body.classList.toggle('dark-mode', currentTheme === 'dark');
}

function applyInitialTheme() {
  currentTheme = 'dark';
  document.body.classList.add('dark-mode');
}

// =================================================================================
// U2: KARTA SPÓŁKI (okno informacji): nagłówek, kafelki wskaźników, zakładki
// =================================================================================

let companyCardView = { symbol: null, tab: 'overview' };

const COMPANY_CARD_TABS = [
    ['overview', 'Przegląd'],
    ['finance', 'Finanse'],
    ['owners', 'Akcjonariat'],
    ['manage', 'Zarządzanie'],
    ['workforce', 'Zatrudnienie'],
    ['group', 'Grupa'] // 0.14 T5: karta koncernu
];

function openDescriptionModal(symbol, tab = null) {
    const stock = stocks.find(s => s.symbol === symbol);
    const modal = document.getElementById('description-modal');
    if (!stock || !modal) return;
    if (companyCardView.symbol !== symbol) companyCardView.tab = 'overview';
    companyCardView.symbol = symbol;
    if (tab) companyCardView.tab = tab;
    renderCompanyCard();
    modal.style.display = 'block';
}

function setCompanyCardTab(tab) {
    companyCardView.tab = tab;
    renderCompanyCard();
}

function formatRatio(value, eps) {
    if (value === null || value === undefined || !Number.isFinite(value)) return eps < 0 ? 'strata' : '—';
    return formatNumberPl(value, 1);
}

function renderCompanyCard() {
    const stock = stocks.find(s => s.symbol === companyCardView.symbol);
    if (!stock) return;
    // U3: każda notowana spółka (także państwowa i miejska) ma bilans i wyniki do wskaźników.
    if (!stock.assetType || stock.assetType === 'Holding') {
        if (!stock.balanceSheet && typeof initializeBalanceSheetForStock === 'function') initializeBalanceSheetForStock(stock);
        if (!stock.fundamentals && stock.balanceSheet && typeof initializeFundamentals === 'function') initializeFundamentals(stock, true);
    }
    const f = stock.fundamentals ? updateFundamentalRatios(stock) : null;
    const week = getStockChangePct(stock, 1);
    const sector = formatMainSectorLabel(stock); // T1b: sektor główny z ikoną i podsektorem
    const exchange = exchanges[stock.exchange]?.name || stock.exchange || '—';
    const health = Number(stock.financialHealth) || 0;
    const healthLabel = health >= 3 ? 'bardzo dobra' : health >= 1 ? 'dobra' : health > -1 ? 'przeciętna' : health > -3 ? 'słaba' : 'krytyczna';
    const dividendYield = typeof getTrailingDividendYield === 'function' ? getTrailingDividendYield(stock) : 0;
    const debtRatio = stock.balanceSheet?.assets > 0 ? stock.balanceSheet.liabilities / stock.balanceSheet.assets : null;

    document.getElementById('company-card-header').innerHTML = `
        <div class="cc-header">
            <div>
                <div class="cc-kicker">${sectorIcon(getMainSector(stock), 14)}${escapeHtml(sector)} · ${escapeHtml(stripEmoji(exchange))}</div>
                <h2 class="m-0">${escapeHtml(stock.name)} <span class="cc-symbol">${escapeHtml(stock.symbol)}</span></h2>
                <div class="text-sm text-muted">${stock.isStateOwned ? '<span class="badge badge--neutral">Skarb Państwa</span> ' : ''}${typeof isConcern === 'function' && isConcern(stock) ? '<span class="badge badge--info">koncern</span> ' : ''}${stock.ceo?.name ? `prezes ${escapeHtml(stock.ceo.name)}` : ''}</div>
            </div>
            <div class="cc-price">
                <strong>${formatZl(stock.price)}</strong>
                <span class="${week > 0 ? 'text-up' : week < 0 ? 'text-down' : 'text-muted'}">${week > 0 ? '▲' : week < 0 ? '▼' : '■'} ${formatPct(week)} w tygodniu</span>
            </div>
        </div>
        ${renderSegmentBar(stock)}
        ${typeof renderDividendBadges === 'function' ? renderDividendBadges(stock) : ''}
        ${stock.pendingDividend ? `<p class="text-sm cc-exdiv">Ogłoszona dywidenda <strong>${formatZl(stock.pendingDividend.dps)} na akcję</strong> — dzień odcięcia za ok. ${Math.max(1, Math.round(stock.dividendTimer / BASE_DELAYS.weekly))} tydz. gry. Dywidendę dostaje, kto ma akcje w dniu odcięcia; tego dnia kurs spada o mniej więcej jej wartość.</p>` : ''}`;

    // N1: porównanie z medianą sektora pod wartością kafelka.
    const med = typeof getSectorMedians === 'function' ? getSectorMedians(getMainSector(stock)) : null;
    const vs = (value, sectorValue, options) => { const c = med && typeof compareWithSector === 'function' ? compareWithSector(value, sectorValue, options) : null; return c ? `<em class="${c.cls}">${c.text}</em>` : ''; };
    const tile = (label, value, hint, cls = '', extra = '') => `<div class="cc-kpi" title="${escapeHtml(hint)}"><span>${label}</span><strong class="${cls}">${value}</strong>${extra}</div>`;
    const pctFmt = v => `${formatNumberPl(v * 100, 1)}%`;
    document.getElementById('company-card-kpis').innerHTML = [
        tile('Kapitalizacja', formatZl(getMarketCapValue(stock), 0), 'Kurs × liczba akcji: ile rynek płaci za całą spółkę.'),
        tile('C/Z', formatRatio(f?.peRatio, f?.epsTtm), 'Cena / zysk na akcję z 4 kwartałów. Niżej = taniej względem zysków (porównuj w sektorze).', '', vs(f?.peRatio > 0 ? f.peRatio : NaN, med?.pe)),
        tile('C/WK', f?.pbRatio ? formatNumberPl(f.pbRatio, 2) : '—', 'Cena / wartość księgowa na akcję. Poniżej 1 = rynek wycenia spółkę niżej niż jej majątek netto.', '', vs(f?.pbRatio, med?.pb, { format: v => v.toFixed(2) })),
        tile('Stopa dywidendy', `${formatNumberPl(dividendYield * 100, 2)}%`, 'Dywidendy z ostatniego roku / kurs.', '', dividendYield > 0 ? vs(dividendYield, med?.dy, { lowerIsCheap: false, format: pctFmt, labels: ['wyższa', 'niższa'] }) : ''),
        tile('Zadłużenie', debtRatio === null ? '—' : `${formatNumberPl(debtRatio * 100, 0)}%`, 'Zobowiązania / aktywa. Powyżej ~70% spółka jest mocno zadłużona.', debtRatio > 0.7 ? 'text-down' : '', vs(debtRatio, med?.debt, { format: pctFmt, labels: ['niższe', 'wyższe'] })),
        tile('Kondycja', `${formatNumberPl(health, 1)} · ${healthLabel}`, 'Kondycja finansowa od −5 (bankructwo) do +5.', health >= 1 ? 'text-up' : health <= -2 ? 'text-down' : '')
    ].join('') + renderSubsectorMedianLine(stock, med);

    document.getElementById('company-card-tabs').innerHTML = COMPANY_CARD_TABS
        .filter(([id]) => id !== 'workforce' || (typeof hasWorkforce === 'function' && hasWorkforce(stock)))
        .filter(([id]) => id !== 'group' || hasGroupCard(stock))
        .map(([id, label]) => `<button role="tab" aria-selected="${companyCardView.tab === id}" class="${companyCardView.tab === id ? 'active' : ''}" onclick="setCompanyCardTab('${id}')">${label}</button>`).join('');

    if (typeof unlockAcademyEntry === 'function') ['cwk', 'dywidenda', 'zadluzenie'].forEach(id => unlockAcademyEntry(id));
    const body = document.getElementById('company-card-body');
    if (companyCardView.tab === 'finance') {
        if (typeof unlockAcademyEntry === 'function') ['eps', 'marza', 'roe', 'plynnosc'].forEach(id => unlockAcademyEntry(id));
        if (typeof noteMentorEvent === 'function') noteMentorEvent('financeView', stock);
        body.innerHTML = renderCompanyCardFinance(stock, f);
    }
    else if (companyCardView.tab === 'owners') body.innerHTML = renderCompanyCardOwners(stock);
    else if (companyCardView.tab === 'manage') body.innerHTML = renderCompanyCardManage(stock);
    else if (companyCardView.tab === 'workforce') body.innerHTML = renderCompanyCardWorkforce(stock);
    else if (companyCardView.tab === 'group' && hasGroupCard(stock)) body.innerHTML = renderCompanyCardGroup(stock);
    else body.innerHTML = renderCompanyCardOverview(stock);
}

function renderCompanyCardOverview(stock) {
    const traits = (stock.ceo?.traits || []).map(trait => {
        const data = ceoTraits[trait.id];
        return data ? `<span class="ceo-trait" style="--trait-color: ${data.color};" title="${escapeHtml(data.description)}">${escapeHtml(data.name)}</span>` : '';
    }).join('');
    const phase = stock.corporatePhase && getSkillLevel('financialAnalyst') >= 1 ? `<p class="text-sm"><strong>Faza cyklu życia:</strong> ${escapeHtml(stock.corporatePhase)}</p>` : '';
    const research = stock.research?.isResearching && stock.research.currentTech ? `<p class="text-sm">🔬 W fazie R&D: <strong>${escapeHtml(technologies[stock.research.currentTech]?.name || stock.research.currentTech)}</strong></p>` : '';
    const insights = typeof getAnalystInsights === 'function' ? getAnalystInsights(stock) : [];
    return `
        <div class="cc-grid">
            <section><h4>O spółce</h4><div class="text-sm text-justify">${assembleDescription(stock)}</div>${phase}${research}</section>
            <section>
                ${stock.ceo?.name ? `<h4>Prezes</h4><p class="m-0"><strong>👔 ${escapeHtml(stock.ceo.name)}</strong></p>
                    <p class="text-xs text-muted mt-0">wiek ${stock.ceo.age ?? '—'}, staż ${Math.floor((stock.ceo.tenure || 0) / 4)} lat</p>
                    <div class="ceo-traits-container">${traits}</div>` : ''}
                ${insights.length ? `<h4>Analityk</h4>${insights.map(line => `<p class="text-sm">🔎 ${escapeHtml(line)}</p>`).join('')}` : ''}
            </section>
        </div>`;
}

function renderCompanyCardFinance(stock, f) {
    if (!f || !(stock.balanceSheet?.assets > 0)) return '<p class="text-muted">Spółka nie publikuje jeszcze pełnych danych finansowych.</p>';
    const money = value => Number.isFinite(value) ? formatZl(value, 0) : '—';
    const perShare = value => Number.isFinite(value) ? formatZl(value) : '—';
    const row = (label, value, hint) => `<tr><td title="${escapeHtml(hint)}">${label} <span class="text-muted">ⓘ</span></td><td class="cell-number">${value}</td></tr>`;
    const last = stock.lastDividend;
    const shownFair = typeof getDisplayedFairValue === 'function' ? getDisplayedFairValue(stock) : f.fairValue;
    const fair = getSkillLevel('financialAnalyst') >= 1 && shownFair > 0
        ? row('Wycena analityczna', `${perShare(shownFair)} (${((shownFair / stock.price - 1) * 100).toFixed(1)}% vs kurs)${f.fairValue > 0 ? '' : stock.assetType === 'Holding' ? ' · NAV portfela' : ' · z majątku'}`, 'Wartość godziwa z zysków i majątku; holdingi i REIT-y — z wartości aktywów netto (szkolenie Analityk Finansowy).') : '';
    const metrics = typeof getCompanyMetrics === 'function' ? getCompanyMetrics(stock) : null;
    const pct = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(1)}%`;
    const extra = metrics ? row('Marża netto', pct(metrics.margin), 'Zysk netto / przychody.') + row('ROE', pct(metrics.roe), 'Zysk netto / kapitał własny.')
        + row('Płynność (gotówka / zobowiązania)', metrics.liquidity === null ? '—' : metrics.liquidity.toFixed(2), 'Ile gotówki przypada na złotówkę zobowiązań.')
        + row('Wzrost zysku r/r', pct(metrics.growth), 'Zysk z 4 ostatnich kwartałów vs 4 wcześniejszych.') : '';
    return `
        <div class="cc-grid">
            <section><h4>Wyniki (4 ostatnie kwartały)</h4>
                <table class="asset-mini-table w-full"><tbody>
                    ${row('Przychody', f.revenueTtm > 0 ? money(f.revenueTtm) : '—', 'Sprzedaż spółki z ostatniego roku.')}
                    ${row('EBITDA', money(f.ebitdaTtm), 'Zysk operacyjny przed amortyzacją, odsetkami i podatkiem.')}
                    ${row('Zysk netto', money(f.netIncomeTtm), 'Zysk po wszystkich kosztach i podatku.')}
                    ${row('Zysk na akcję (EPS)', perShare(f.epsTtm), 'Zysk netto / liczba akcji.')}
                    ${row('Sprzedaż na akcję', f.revenueTtm > 0 ? perShare(f.salesPerShare) : '—', 'Przychody / liczba akcji.')}
                    ${extra}
                    ${fair}
                </tbody></table></section>
            <section><h4>Bilans i dywidenda</h4>
                <table class="asset-mini-table w-full"><tbody>
                    ${row('Aktywa', money(stock.balanceSheet.assets), 'Wszystko, co spółka posiada.')}
                    ${row('Zobowiązania', money(stock.balanceSheet.liabilities), 'Długi i inne zobowiązania.')}
                    ${row('Gotówka', money(stock.cash), 'Pieniądze na koncie spółki.')}
                    ${row('Wartość księgowa / akcję', perShare(f.bookValuePerShare), '(Aktywa − zobowiązania) / liczba akcji.')}
                    ${stock.assetType !== 'REIT' ? row('Polityka dywidendy', escapeHtml(getDividendPolicyLabel(stock.dividendPolicy)), 'Jak dużą część zysku spółka wypłaca.') : ''}
                    ${row('Ostatnia dywidenda', last ? `${last.dps.toFixed(4)} PLN (${(last.yield * 100).toFixed(2)}%)` : 'brak', 'Ostatnia wypłata na akcję i stopa w dniu wypłaty.')}
                </tbody></table></section>
        </div>
        ${renderValuationSection(stock, f)}
        ${typeof renderAccountingSection === 'function' ? renderAccountingSection(stock) : ''}`;
}

/** N2: metody wyceny (Analityk Finansowy 1–2) i konsensus (poziom 3). */
function renderValuationSection(stock, f) {
    const level = getSkillLevel('financialAnalyst');
    if (level < 1 || typeof getValuationMethods !== 'function') {
        return '<p class="text-xs text-muted mt-2">🔒 Metody wyceny i konsensus analityków odblokujesz szkoleniem „Analityk Finansowy”.</p>';
    }
    const v = getValuationMethods(stock);
    if (!v) return '';
    const fmt = value => value > 0 ? `${formatZl(value)} <span class="${value > stock.price ? 'text-up' : 'text-down'}">(${((value / stock.price - 1) * 100).toFixed(0)}%)</span>` : '—';
    const rows = [
        ['Porównawcza: EPS × mediana C/Z sektora', fmt(v.pe)],
        ...(level >= 2 ? [
            ['Majątkowa: wartość księgowa × mediana C/WK sektora', fmt(v.book)],
            [`Dywidendowa (Gordon): D·(1+g)/(r−g), r = ${(v.r * 100).toFixed(1)}%, g = ${(v.g * 100).toFixed(1)}%`, v.gordon ? fmt(v.gordon) : 'spółka nie płaci dywidend']
        ] : [])
    ];
    const consensus = level >= 3 ? `
        <p class="text-sm">📊 Konsensus na najbliższy raport: zysk na akcję ≈ <strong>${formatZl(f.expectedEps)}</strong> za kwartał.
        ${Number.isFinite(stock.lastSurprise) ? `Ostatni raport: <span class="${stock.lastSurprise > 0 ? 'text-up' : stock.lastSurprise < 0 ? 'text-down' : ''}">${stock.lastSurprise >= 0 ? '+' : ''}${(stock.lastSurprise * 100).toFixed(0)}% vs konsensus</span> — kurs reaguje na niespodziankę, nie na sam wynik.` : ''}</p>` : '';
    return `<h4 class="mt-3">Wycena (kurs ${formatZl(stock.price)})</h4>
        <table class="asset-mini-table w-full"><tbody>${rows.map(([label, value]) => `<tr><td>${label}</td><td class="cell-number">${value}</td></tr>`).join('')}</tbody></table>
        <p class="text-xs text-muted">Różne metody dają różne wyniki — traktuj je jako przedział, nie jedną cenę.${level < 2 ? ' Kolejne metody: Analityk Finansowy poziom 2.' : ''}</p>${consensus}`;
}

function renderCompanyCardOwners(stock) {
    const fundPct = typeof getFundStakePct === 'function' ? getFundStakePct(stock) : 0;
    const wallet = playerWallet?.portfolio?.[stock.symbol]?.shares || 0;
    // 0.13.1 (B3): wolny obrót = dostępne na rynku + akcje u inwestorów (gdzie są akcje).
    const freeFloat = getFreeFloatShares(stock), available = getAvailableShares(stock);
    const byKind = {};
    for (const holder of getShareholders(stock)) if (!['state', 'insiders'].includes(holder.kind)) byKind[holder.kind] = (byKind[holder.kind] || 0) + holder.shares;
    const kindLabels = { player: 'Twój fundusz', wallet: 'konto prywatne', ai: 'inwestorzy (boty)', botFund: 'fundusze kolegów', bank: 'banki', etf: 'ETF-y', holding: 'holdingi', company: 'spółki', city: 'miasto' };
    const where = Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([kind, shares]) => `${kindLabels[kind] || kind} ${shares.toLocaleString('pl-PL')}`).join(' · ');
    return `
        <p class="text-sm">Fundusz: <strong>${(fundPct * 100).toFixed(2)}%</strong>${wallet ? ` · konto prywatne: <strong>${wallet.toLocaleString('pl-PL')} akcji</strong>` : ''}</p>
        <p class="text-sm">Wolny obrót: <strong>${freeFloat.toLocaleString('pl-PL')}</strong> z ${stock.totalShares.toLocaleString('pl-PL')} akcji = <strong>${available.toLocaleString('pl-PL')}</strong> dostępnych na rynku + <strong>${Math.max(0, freeFloat - available).toLocaleString('pl-PL')}</strong> u inwestorów${where ? ` (${escapeHtml(where)})` : ''}.${available <= 0 ? ' <span class="text-warn">Teraz nie da się kupić — akcje kupisz, gdy ktoś je sprzeda.</span>' : ''}</p>
        <div class="gov-bars">${typeof renderShareholderBars === 'function' ? renderShareholderBars(stock) : ''}</div>
        <button class="btn-secondary mt-2" onclick="openStockDetailsModal('${stock.symbol}')">🥧 Wykres akcjonariatu</button>`;
}

function renderCompanyCardManage(stock) {
    const pct = typeof getFundStakePct === 'function' ? getFundStakePct(stock) : 0;
    const governed = typeof isGovernedCompany === 'function' && isGovernedCompany(stock);
    const seats = typeof getBoardSeats === 'function' ? getBoardSeats(stock) : { label: '—' };
    return `
        <p class="text-sm">Udział funduszu: <strong>${(pct * 100).toFixed(2)}%</strong> · rada nadzorcza: <strong>${escapeHtml(seats.label)}</strong>.
            Od 5% głosujesz na walnych, od 20% masz miejsce w radzie, powyżej 50% kontrolujesz spółkę.</p>
        <div class="d-flex gap-2 flex-wrap">
            ${governed ? `<button class="btn-secondary" onclick="openGovernanceModal('${stock.symbol}')">🗳️ Walne zgromadzenie</button>` : ''}
            <button class="btn-secondary" onclick="openCompanyInvestments('${stock.symbol}')">📈 Inwestycje spółki</button>
            ${pct > 0.5 ? `<button onclick="openManagementModal('${stock.symbol}')">👑 Zarządzaj spółką</button>` : ''}
        </div>
        ${renderStrategyOrders(stock)}`;
}

/** 0.14 T3.6: zlecenia większościowca (rozszerzenie, podsektor, specjalizacja, pivot) — opcjonalne, domyślnie decyduje prezes. */
function renderStrategyOrders(stock) {
    if (typeof isStrategyCompany !== 'function' || !isStrategyCompany(stock)) return '';
    const strategy = stock.strategy || {};
    const status = strategy.pivot ? `🔄 trwa zmiana profilu na ${escapeHtml(strategy.pivot.to)} (do kw. ${strategy.pivot.until})`
        : strategy.process ? `⏳ w toku: ${escapeHtml(describeStrategyProposal({ type: strategy.process.type, target: strategy.process.sector === getMainSector(stock) && strategy.process.type !== 'expand' ? (strategy.process.subsector || strategy.process.niche) : strategy.process.sector }))} (do kw. ${strategy.process.dueQuarter})`
        : strategy.pendingProposal ? `🧭 propozycja prezesa: ${escapeHtml(describeStrategyProposal(strategy.pendingProposal))} — decyzja w poczcie` : 'brak trwających procesów';
    if (!(typeof canFundControlAgm === 'function' && canFundControlAgm(stock))) return `<p class="text-sm text-muted mt-2">Strategia spółki: ${status}. Zlecać może tylko większościowy akcjonariusz.</p>`;
    const have = new Set(stock.segments.map(seg => seg.sector));
    const sectorOptions = SECTOR_NAMES.filter(name => !have.has(name) && name !== 'Bankowość')
        .map(name => `<option value="${escapeHtml(name)}">${SECTORS[name].icon} ${escapeHtml(name)}${[...have].some(h => areSectorsRelated(h, name)) ? ' (powiązana)' : ''}</option>`).join('');
    const nicheSeg = typeof getNicheCandidate === 'function' ? getNicheCandidate(stock) : null;
    const nicheOptions = nicheSeg ? Object.keys(SECTORS[nicheSeg.sector].niches).filter(n => n !== nicheSeg.niche).map(n => `<option>${escapeHtml(n)}</option>`).join('') : '';
    const sym = stock.symbol;
    return `<div class="strategy-orders mt-2">
        <p class="text-sm">Strategia spółki: ${status}. Zlecenia są opcjonalne — bez nich decyduje prezes.</p>
        <div class="d-flex gap-2 flex-wrap items-center">
            <select id="strategy-expand-${sym}" aria-label="Nowy segment">${sectorOptions}</select>
            <button class="btn-secondary" onclick="orderStrategy('${sym}', 'expand', document.getElementById('strategy-expand-${sym}').value)">🧩 Rozszerz (10–20% przychodów)</button>
            <button class="btn-secondary" onclick="orderStrategy('${sym}', 'pivot', document.getElementById('strategy-expand-${sym}').value)">🔄 Pivot w ten sektor</button>
            <button class="btn-secondary" onclick="orderStrategy('${sym}', 'subsector')">🎯 Wejdź w podsektor</button>
            ${nicheOptions ? `<select id="strategy-niche-${sym}" aria-label="Specjalizacja">${nicheOptions}</select><button class="btn-secondary" onclick="orderStrategy('${sym}', 'niche', document.getElementById('strategy-niche-${sym}').value)">🏷️ Specjalizacja${nicheSeg.niche ? ' (zmiana)' : ''}</button>` : ''}
        </div></div>`;
}

function updateStateOfferInfo() {
    const select = document.getElementById('state-company-select');
    const quantityInput = document.getElementById('state-offer-quantity');
    const costLabel = document.getElementById('state-offer-cost');
    const cooldownLabel = document.getElementById('state-offer-cooldown');

    // Dodajemy sprawdzenie, czy elementy istnieją, na wypadek gdyby HTML bazy (ui.js) ich nie miał
    if (!select || !quantityInput || !costLabel || !cooldownLabel) return;

    if (!select.value) {
        costLabel.textContent = "0.00 PLN";
        cooldownLabel.textContent = "Wybierz spółkę.";
        return;
    }

    const stock = stocks.find(s => s.symbol === select.value);
    const quantity = quantityInput.valueAsNumber || 0;

    // Obliczanie ceny z premią
    const exchangeLevel = exchanges[stock.exchange].level;
    let premium = 1.10; // Domyślna premia 10%
    if (exchangeLevel >= 3) premium = 1.25; // Giełda Złota i wyżej: 25%
    else if (exchangeLevel >= 2) premium = 1.20; // Giełda Srebrna: 20%
    else if (exchangeLevel >= 1) premium = 1.15; // Giełda Brązowa: 15%

    const offerPrice = stock.price * premium;
    costLabel.textContent = `${(offerPrice * quantity).toFixed(2)} PLN (cena za akcję: ~${offerPrice.toFixed(2)} PLN)`;

    // Sprawdzanie cooldownu
    if (stock.stateOfferCooldownUntil && Date.now() < stock.stateOfferCooldownUntil) {
        const remainingTime = Math.ceil((stock.stateOfferCooldownUntil - Date.now()) / 1000); // POPRAWIONA LINIA
        cooldownLabel.textContent = `Następna oferta dla tej spółki możliwa za: ${remainingTime}s`;
        document.getElementById('state-offer-controls').style.opacity = '0.5';
    } else {
        cooldownLabel.textContent = '';
        document.getElementById('state-offer-controls').style.opacity = '1';
    }
}

function setPriceAlert(symbol, type) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const inputId = type === 'buy' ? 'price-alert-buy' : 'price-alert-sell';
    const value = document.getElementById(inputId).valueAsNumber;

    if (isNaN(value)) { // Jeśli pole jest puste, usuń alert
        stock.priceAlerts[type] = null;
    } else if (value <= 0) {
        showToast("Cena musi być dodatnia!");
        return;
    } else {
        stock.priceAlerts[type] = value;
    }

    document.getElementById('price-alert-modal').style.display = 'none';
    // Ponowne narysowanie wykresu, aby pokazać/ukryć linie
    showPriceHistoryModal(symbol);
}

function openPriceAlertModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const modal = document.getElementById('price-alert-modal');
    document.getElementById('price-alert-title').textContent = `Alerty dla: ${stock.name}`;
    document.getElementById('price-alert-current-price').textContent = stock.price.toFixed(2) + " PLN";

    // Wypełnij pola obecnymi wartościami alertów
    const buyInput = document.getElementById('price-alert-buy');
    const sellInput = document.getElementById('price-alert-sell');
    buyInput.value = stock.priceAlerts.buy || '';
    sellInput.value = stock.priceAlerts.sell || '';

    // Ustaw akcje dla przycisków
    document.getElementById('set-buy-alert-btn').onclick = () => setPriceAlert(symbol, 'buy');
    document.getElementById('set-sell-alert-btn').onclick = () => setPriceAlert(symbol, 'sell');

    modal.style.display = 'block';
}

function openResearchModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !stock.researchUnlocks) {
        console.error("Błąd: Próbowano otworzyć panel R&D dla spółki, która go nie obsługuje.", stock);
        return;
    }

    const modal = document.getElementById('research-modal');
    modal.dataset.currentSymbol = symbol;
    document.getElementById('research-modal-title').textContent = `🔬 Panel R&D: ${stock.name}`;

    const unlocks = stock.researchUnlocks;
    const research = stock.research;
    const specializations = ["wzmacnianie rozwoju", "wzmacnianie pozycji na rynku", "wzmacnianie ceny i zysków"];

    const tier1_locked = document.getElementById('rd-tier1-locked');
    const tier1_unlocked = document.getElementById('rd-tier1-unlocked');
    const tier2_section = document.getElementById('rd-tier2-section');
    const tier2_locked = document.getElementById('rd-tier2-locked');
    const tier2_unlocked = document.getElementById('rd-tier2-unlocked');
    const tier3_section = document.getElementById('rd-tier3-section');
    const tier3_locked = document.getElementById('rd-tier3-locked');
    const tier3_unlocked = document.getElementById('rd-tier3-unlocked');
    const tier4_section = document.getElementById('rd-tier4-section');
    const tier4_locked = document.getElementById('rd-tier4-locked');
    const tier4_unlocked = document.getElementById('rd-tier4-unlocked');
    const tier5_section = document.getElementById('rd-tier5-section');
    const tier5_locked = document.getElementById('rd-tier5-locked');
    const tier5_unlocked = document.getElementById('rd-tier5-unlocked');

    // --- TIER 1 ---
    if (unlocks.canSeeSpecialization) {
        tier1_locked.style.display = 'none';
        tier1_unlocked.style.display = 'block';
        document.getElementById('rd-specialization-name').textContent = research.specialization;
        tier2_section.style.display = 'block';
    } else {
        tier1_locked.style.display = 'block';
        tier1_unlocked.style.display = 'none';
        document.getElementById('rd-unlock-tier1-btn').onclick = () => unlockResearchTier(symbol, 'canSeeSpecialization', 1000);
        tier2_section.style.display = 'none';
    }

    // --- TIER 2 ---
    if (unlocks.canSeeResults) {
        tier2_locked.style.display = 'none';
        tier2_unlocked.style.display = 'block';
        const tech = technologies[research.currentTech];
        document.getElementById('rd-current-tech-details-name').textContent = tech ? tech.name : "Brak";
        document.getElementById('rd-tech-effect-desc').textContent = tech ? tech.description : "Firma nie prowadzi badań.";
        tier3_section.style.display = 'block';
    } else {
        tier2_locked.style.display = 'block';
        tier2_unlocked.style.display = 'none';
        document.getElementById('rd-unlock-tier2-btn').onclick = () => unlockResearchTier(symbol, 'canSeeResults', 2500);
        tier3_section.style.display = 'none';
    }

    // --- TIER 3 ---
    if (unlocks.canFund) {
        tier3_locked.style.display = 'none';
        tier3_unlocked.style.display = 'block';
        document.getElementById('rd-fund-btn').onclick = () => fundResearch(symbol);
        tier4_section.style.display = 'block';
    } else {
        tier3_locked.style.display = 'block';
        tier3_unlocked.style.display = 'none';
        document.getElementById('rd-unlock-tier3-btn').onclick = () => unlockResearchTier(symbol, 'canFund', 5000);
        tier4_section.style.display = 'none';
    }

    // --- TIER 4 ---
    if (unlocks.canInfluence) {
        tier4_locked.style.display = 'none';
        tier4_unlocked.style.display = 'block';
        const specSelect = document.getElementById('rd-specialization-select');
        specSelect.innerHTML = '';
        specializations.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec;
            option.textContent = spec;
            if (spec === research.specialization) option.selected = true;
            specSelect.appendChild(option);
        });
        document.getElementById('rd-change-spec-btn').onclick = () => changeResearchSpecialization(symbol);
        tier5_section.style.display = 'block';
    } else {
        tier4_locked.style.display = 'block';
        tier4_unlocked.style.display = 'none';
        document.getElementById('rd-unlock-tier4-btn').onclick = () => unlockResearchTier(symbol, 'canInfluence', 10000);
        tier5_section.style.display = 'none';
    }

    // --- TIER 5 ---
    if (unlocks.canInterfere) {
        tier5_locked.style.display = 'none';
        const canShowChoice = research.isResearching && !research.currentTech;
        if (canShowChoice) {
            tier5_unlocked.style.display = 'block';
            const choiceContainer = document.getElementById('rd-tech-choice-container');
            choiceContainer.innerHTML = 'Firma czeka na Twoją decyzję...';
            // Pozostała logika (znajdowanie 2 opcji) bez zmian
        } else {
            tier5_unlocked.style.display = 'none';
        }
    } else {
        tier5_locked.style.display = 'block';
        tier5_unlocked.style.display = 'none';
        document.getElementById('rd-unlock-tier5-btn').onclick = () => unlockResearchTier(symbol, 'canInterfere', 20000);
    }

    modal.style.display = 'block';
}

function openCeoChoiceModal(symbol, candidates, successChance) {
    const modal = document.getElementById('ceo-choice-modal');
    const container = document.getElementById('ceo-candidates-container');

    document.getElementById('ceo-choice-title').textContent = `Wybierz kandydata na nowego prezesa dla ${symbol}`;
    container.innerHTML = '';

    candidates.forEach((candidate, index) => {
        const card = document.createElement('div');
        card.classList.add('choice-card');

        let traitsHTML = '';
        if (candidate.traits && candidate.traits.length > 0) {
            candidate.traits.forEach(trait => {
                const traitData = ceoTraits[trait.id];
                if (traitData) {
                    traitsHTML += `<span class="ceo-trait m-half" style="--trait-color: ${traitData.color}" title="${traitData.description}">${traitData.name}</span>`;
                }
            });
        } else {
            traitsHTML = '<p class="text-sm text-muted">Brak wyróżniających cech</p>';
        }

        const tenureYears = Math.floor(candidate.tenure / 4);
        card.innerHTML = `
            <h4 class="mb-1">${candidate.name}</h4>
            <p class="my-1 text-sm text-muted">Wiek: ${candidate.age}, Doświadczenie: ${tenureYears} lat</p>
            <div class="ceo-traits-container mt-2 min-h-50" >${traitsHTML}</div>
            <button onclick="confirmCeoChange('${symbol}', ${index})">Zatwierdź Kandydata</button>
            <p class="mt-2 fw-bold text-md">Szansa: ${(successChance * 100).toFixed(0)}%</p>
        `;
        container.appendChild(card);
    });

    modal.style.display = 'block';
}

/**
* Otwiera modal ustawień.
*/
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (typeof renderSavePanel === 'function') renderSavePanel(); // 0.14.3 Z5
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Zamyka modal ustawień.
 */
function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/** Przycisk zamykania w oknie: zamyka najbliższe okno .modal. */
function closeModalFrom(element) {
    const modal = element?.closest('.modal');
    if (modal) modal.style.display = 'none';
}

function closeVisibleModals() {
    document.querySelectorAll('div[id$="-modal"]').forEach(modal => {
        if (modal instanceof HTMLElement) modal.style.display = 'none';
    });
}

function initializeDraggableModals() {
    // Tylko kontenery okien (div) — przycisk #theme-toggle-btn-modal też kończy się na "-modal".
    const modals = Array.from(document.querySelectorAll('div[id$="-modal"]'));
    modals.forEach(modal => {
        if (!(modal instanceof HTMLElement)) return;
        modal.classList.add('modal');
        modal.style.position = 'fixed';
        modal.style.touchAction = 'none';
        const dragHandle = modal.querySelector('.modal-header') || modal;
        dragHandle.style.cursor = 'move';

        const onMouseDown = e => {
            if (e.button !== 0) return;
            if (e.target.closest('button, input, select, textarea, a, .close-btn')) return;
            e.preventDefault();

            const rect = modal.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            const initialLeft = rect.left;
            const initialTop = rect.top;

            modal.style.transform = 'none';
            modal.style.left = `${initialLeft}px`;
            modal.style.top = `${initialTop}px`;

            const onMouseMove = moveEvent => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;
                modal.style.left = `${initialLeft + dx}px`;
                modal.style.top = `${initialTop + dy}px`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.userSelect = '';
            };

            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        dragHandle.addEventListener('mousedown', onMouseDown);
    });
}

window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        // 0.14.5: najpierw poczta (nakładka), potem zwykłe okna; scenka startowa się nie zamyka
        const mail = document.getElementById('mail-overlay');
        if (mail && !mail.hidden) { closeMailbox(); return; }
        if (document.getElementById('game-confirm-modal')?.style.display === 'block') { closeGameConfirm(false); return; }
        closeVisibleModals();
    }
});

// =================================================================================
// 0.14.5 WSPÓLNA OBSŁUGA OKIEN (02_dostepnosc.md §4): rola dialogu, tytuł, zasłona,
// fokus do okna i z powrotem, pułapka Tab. Działa dla wszystkich open…Modal() bez ich zmiany —
// obserwuje style/hidden okien (.modal i nakładek .intro-overlay).
// =================================================================================
const modalA11y = { stack: [], observer: null };
const FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function isDialogElement(el) {
    return el instanceof HTMLElement && (el.classList.contains('modal') || el.classList.contains('intro-overlay'));
}

function isDialogOpen(el) {
    if (el.classList.contains('intro-overlay')) return !el.hidden;
    return el.style.display !== '' && el.style.display !== 'none';
}

function onDialogOpened(el) {
    if (modalA11y.stack.some(entry => entry.el === el)) return;
    modalA11y.stack.push({ el, returnFocus: document.activeElement });
    const box = el.classList.contains('intro-overlay') ? (el.firstElementChild || el) : el;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    const title = box.querySelector('h1, h2, h3');
    if (title) {
        if (!title.id) title.id = `${el.id || 'okno'}-tytul`;
        box.setAttribute('aria-labelledby', title.id);
    }
    if (!box.hasAttribute('tabindex')) box.tabIndex = -1;
    if (!box.contains(document.activeElement)) {
        try { box.focus({ preventScroll: true }); } catch (e) { /* element niewidoczny */ }
    }
    updateModalBackdrop();
}

function onDialogClosed(el) {
    const index = modalA11y.stack.findIndex(entry => entry.el === el);
    if (index < 0) return;
    const [{ returnFocus }] = modalA11y.stack.splice(index, 1);
    updateModalBackdrop();
    if (returnFocus && document.contains(returnFocus) && typeof returnFocus.focus === 'function' && !modalA11y.stack.length) {
        try { returnFocus.focus({ preventScroll: true }); } catch (e) { /* brak */ }
    }
}

function updateModalBackdrop() {
    const anyModal = modalA11y.stack.some(entry => entry.el.classList.contains('modal'));
    let backdrop = document.getElementById('modal-backdrop');
    if (anyModal && !backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'modal-backdrop';
        backdrop.className = 'modal-backdrop';
        document.body.appendChild(backdrop);
    }
    if (backdrop) backdrop.hidden = !anyModal;
    document.body.classList.toggle('has-dialog', modalA11y.stack.length > 0);
}

function watchDialog(el) {
    if (!modalA11y.observer || el.dataset.dialogWatched) return;
    el.dataset.dialogWatched = '1';
    modalA11y.observer.observe(el, { attributes: true, attributeFilter: ['style', 'hidden'] });
    if (isDialogOpen(el)) onDialogOpened(el);
}

function initDialogA11y() {
    if (typeof MutationObserver === 'undefined' || modalA11y.observer) return;
    modalA11y.observer = new MutationObserver(records => {
        for (const record of records) {
            const el = record.target;
            if (isDialogOpen(el)) onDialogOpened(el); else onDialogClosed(el);
        }
    });
    document.querySelectorAll('.modal, .intro-overlay').forEach(watchDialog);
    // okna tworzone później (skaner, potwierdzenie…) — bezpośrednie dzieci body
    new MutationObserver(records => {
        for (const record of records) for (const node of record.addedNodes) if (isDialogElement(node)) watchDialog(node);
    }).observe(document.body, { childList: true });
    // pułapka fokusu: Tab nie wychodzi z najwyższego okna
    document.addEventListener('keydown', event => {
        if (event.key !== 'Tab' || !modalA11y.stack.length) return;
        const top = modalA11y.stack[modalA11y.stack.length - 1].el;
        const items = [...top.querySelectorAll(FOCUSABLE_SELECTOR)].filter(node => node.offsetParent !== null);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !top.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !top.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    });
    // elementy role="button" (wiersze poczty, karty klientów) — Enter/Spacja jak kliknięcie
    document.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const target = event.target;
        if (!(target instanceof HTMLElement) || target.matches('button, a, input, select, textarea, summary') || target.getAttribute('role') !== 'button') return;
        event.preventDefault();
        target.click();
    });
}
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDialogA11y);
    else initDialogA11y();
}

window.addEventListener('DOMContentLoaded', initializeDraggableModals);

function openCityInvestmentModal() {
    const modal = document.getElementById('city-investment-modal');
    if (!modal) return;
    
    modal.style.display = 'block';
    updateCityModalContent(); // po pokazaniu — funkcja aktualizuje tylko widoczne okno
}

/**
 * Aktualizuje TYLKO DANE TEKSTOWE wewnątrz okna miasta (bez przebudowywania HTML).
 */
function updateCityModalContent() {
    const modal = document.getElementById('city-investment-modal');
    if (!modal || modal.style.display !== 'block') {
        return; // Nie aktualizuj, jeśli niewidoczne
    }

    const festivalContent = modal.querySelector('#city-content-festival');
    const tabsContainer = modal.querySelector('.bank-tabs');
    
    // Sprawdź, czy trwa festyn
    if (festival && festival.isActive) {
        // --- WIDOK FESTYNU ---
        tabsContainer.style.display = 'none'; // Ukryj zakładki
        // Ukryj wszystkie normalne treści zakładek
        document.querySelectorAll('#city-investment-modal .bank-tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        festivalContent.style.display = 'block'; // Pokaż kontener festynu
        renderFestivalView(festivalContent); // Przekaż kontener do funkcji renderującej festyn

    } else {
        // --- WIDOK STANDARDOWY (ZAKŁADKI) ---
        festivalContent.style.display = 'none'; // Ukryj festyn
        tabsContainer.style.display = 'flex'; // Pokaż zakładki

        // Aktualizuj zakładkę "Panel Główny"
        document.getElementById('city-budget-display').textContent = city.budget.toLocaleString('pl-PL', { maximumFractionDigits: 0 });
        document.getElementById('city-population-display').textContent = city.population.toLocaleString('pl-PL');
        document.getElementById('city-infra-level').textContent = (city.infrastructureLevel * 100).toFixed(0) + '%';
        // Odliczanie festynu
        const countdownSeconds = Math.max(0, Math.floor(nextFestivalCountdown / 1000));
        const minutes = Math.floor(countdownSeconds / 60);
        const seconds = countdownSeconds % 60;
        document.getElementById('next-festival-countdown').textContent = nextFestivalCountdown > 0 ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : "Wkrótce...";
        
        // Zarząd
        document.getElementById('city-election-timer').textContent = `${city.mayor.electionYear} ${city.mayor.electionYear === 1 ? 'rok' : 'lata'}`;
        renderCityTicker();
        renderCityPpp();
        renderCitySpecialProjects();
        document.getElementById('city-mayor-name').textContent = city.mayor.name;
        const policy = MAYOR_POLICIES[city.mayor.policy];
        document.getElementById('city-mayor-policy').textContent = `${policy?.label || city.mayor.policy} — ${policy?.description || ''}`;
        const support = document.getElementById('city-mayor-support');
        if (support) support.textContent = `${Number(city.mayor.support || 0).toFixed(0)}%`;
        const electionTab = document.getElementById('tab-btn-city-election');
        if (electionTab) electionTab.style.display = city.election ? '' : 'none';
        renderCityElection();
        
        // Wkład gracza
        document.getElementById('city-total-donated').textContent = city.playerDonatedAmount.toFixed(2); // Użyj nowego pola
        const statusEl = document.getElementById('city-unlock-status');
        if (city.playerHasUnlocked) {
            statusEl.textContent = "Odblokowane!";
            statusEl.style.color = 'var(--color-up)';
        } else {
            statusEl.textContent = `Zablokowane (cel: ${CITY_UNLOCK_DONATION.toLocaleString('pl-PL')} PLN)`;
            statusEl.style.color = 'var(--color-down)';
        }

        // Aktualizuj zakładkę "Spółki Miejskie"
        const municipalList = document.getElementById('city-municipal-list');
        municipalList.innerHTML = '';
        if (municipalCompanies.length > 0) {
            municipalCompanies.forEach(comp => {
                municipalList.innerHTML += `
                    <tr>
                        <td>${comp.name}</td>
                        <td>${comp.type}</td>
                        <td>${comp.budget.toLocaleString('pl-PL')} PLN</td>
                        <td>${comp.baseIncome.toLocaleString('pl-PL')} PLN</td>
                    </tr>`;
            });
        } else {
            municipalList.innerHTML = '<tr><td colspan="4">Wszystkie spółki miejskie weszły na giełdę.</td></tr>';
        }
        
        // Aktualizuj zakładkę "Firmy Prywatne"
        const privateList = document.getElementById('city-private-list');
        privateList.innerHTML = '';
        if (privateCompanies.length > 0) {
            privateCompanies.forEach(comp => {
                privateList.innerHTML += `
                    <tr>
                        <td>${comp.name}</td>
                        <td>${comp.value.toLocaleString('pl-PL')} PLN</td>
                        <td><progress value="${comp.developmentProgress}" max="100"></progress></td>
                    </tr>`;
            });
        } else {
             privateList.innerHTML = '<tr><td colspan="4">Brak firm prywatnych w mieście.</td></tr>';
        }
        
        // Pokaż aktywną zakładkę (nie festyn)
        const activeTab = document.querySelector('#city-investment-modal .bank-tab-btn.active');
        const activeTabId = activeTab ? activeTab.id.replace('tab-btn-city-', 'city-content-') : 'city-content-main';
        document.getElementById(activeTabId).style.display = 'block';
    }
}



function renderFestivalView(festivalContainer) {
    if (!festival || !festival.isActive) {
        festivalContainer.innerHTML = '<p>Błąd: Festyn nie jest aktywny.</p>';
        return;
    }
    
    const playerParticipant = festival.participants.find(p => p.ownerId === 'player');
    const timeLeft = Math.max(0, Math.ceil((Number(festival.remainingMs) || 0) / 1000));

    // --- Sekcja Gracza ---
    let playerSectionHTML = '';
    if (playerParticipant) {
        // Logika dla gracza, który dołączył
        const currentLevel = FESTIVAL_STALL_LEVELS[playerParticipant.level - 1];
        const nextLevel = FESTIVAL_STALL_LEVELS[playerParticipant.level];
        playerSectionHTML = `
            <h4>Twoje stoisko (Poziom ${playerParticipant.level}: ${currentLevel.name})</h4>
            <p>Zdobyte zainteresowanie: <strong>${playerParticipant.interest.toFixed(1)}</strong></p>
            <div class="mb-2">
                ${nextLevel ? `<button onclick="playerUpgradeStall()">Ulepsz do: "${nextLevel.name}" (${nextLevel.cost} PLN)</button>` : '<p>Osiągnięto maksymalny poziom stoiska.</p>'}
            </div>
            <div>
                <p>Promuj stoisko:</p>
                <button onclick="playerPromoteStall('flyers')" title="+5 zainteresowania">${PROMOTION_ACTIONS.flyers.name} (${PROMOTION_ACTIONS.flyers.cost} PLN)</button>
                <button onclick="playerPromoteStall('contest')" title="+10 zainteresowania">${PROMOTION_ACTIONS.contest.name} (${PROMOTION_ACTIONS.contest.cost} PLN)</button>
                <button onclick="playerPromoteStall('kids')" title="+10 zainteresowania">${PROMOTION_ACTIONS.kids.name} (${PROMOTION_ACTIONS.kids.cost} PLN)</button>
                <button onclick="playerPromoteStall('merch')" title="+12 zainteresowania">${PROMOTION_ACTIONS.merch.name} (${PROMOTION_ACTIONS.merch.cost} PLN)</button>
            </div>
        `;
    } else {
        // --- SEKCJA DOŁĄCZANIA DO FESTYNU ---
        let companyButtonsHTML = '';
        for (const symbol in playerPortfolio) {
            const stock = stocks.find(s => s.symbol === symbol);
            // Sprawdź, czy stock istnieje, czy gracz ma akcje i czy te akcje dają ponad 50%
            if (stock && playerPortfolio[symbol].shares > 0 && stock.totalShares > 0 && (playerPortfolio[symbol].shares / stock.totalShares >= 0.05)) { // fundusz ≥5% akcji
                companyButtonsHTML += `<button onclick="playerJoinFestival({type: 'company', id: '${symbol}'})">Spółkę ${symbol}</button>`;
            }
        }
        playerSectionHTML = `
            <h4>Dołącz do festynu! (Koszt: ${FESTIVAL_STALL_LEVELS[0].cost} PLN)</h4>
            <p>Co chcesz promować?</p>
            <div id="join-festival-options">
                <button onclick="playerJoinFestival({type: 'self'})">Siebie</button>
                ${companyButtonsHTML}
            </div>
        `;
    }

    // --- Sekcja Rankingu Uczestników ---
    let participantsTableHTML = `
        <h4>Ranking Stoisk na Żywo</h4>
        <table class="w-full">
            <thead><tr><th>#</th><th>Wystawca</th><th>Cel Promocji</th><th>Zainteresowanie</th></tr></thead>
            <tbody>
    `;
    const sortedParticipants = [...festival.participants].sort((a, b) => b.interest - a.interest);
    sortedParticipants.forEach((p, index) => {
        // Logika nazw uczestników
        const ownerName = p.ownerId === 'player' ? 'Ty' : (p.ownerId === 'city' ? 'Miasto Gdańsk' : (aiCompetitors.find(a => a.id === p.ownerId)?.name || p.ownerName || stocks.find(s => s.symbol === p.ownerId)?.name || p.ownerId));
        let targetName = '';
        switch (p.promotionTarget.type) {
            case 'self': targetName = 'Własny wizerunek'; break;
            case 'company': targetName = p.promotionTarget.id; break;
            case 'city': targetName = 'Miasto Gdańsk'; break;
            case 'bank_promo': targetName = p.ownerName; break; // Dla banków
        }
        participantsTableHTML += `<tr style="${p.ownerId === 'player' ? 'font-weight: bold; background-color: var(--bg-elevated-2);' : ''}">
            <td>${index + 1}</td>
            <td>${ownerName}</td>
            <td>${targetName}</td>
            <td>${p.interest.toFixed(1)}</td>
        </tr>`;
    });
    participantsTableHTML += `</tbody></table>`;

    // --- Sekcja Aktywnych Bonusów Gracza ---
    const playerActiveBonuses = activeModifiers.filter(m => m.target.type === 'self' || m.target.type === 'player_company' || (m.target.type === 'company' && playerPortfolio[m.target.id]));
    let bonusesHTML = '';
    if (playerActiveBonuses.length > 0) {
        bonusesHTML = '<h4>Twoje Aktywne Bonusy z Festynów</h4><ul>';
        playerActiveBonuses.forEach(mod => {
            const bonusTimeLeft = Math.max(0, Math.ceil((mod.expiryTime - Date.now()) / 1000));
            bonusesHTML += `<li>Bonus dla "${mod.target.type}" (Mnożnik: x${mod.multiplier}) - wygasa za ${bonusTimeLeft}s</li>`;
        });
        bonusesHTML += '</ul>';
    }

    // --- Finalne złożenie widoku (renderowanie do kontenera) ---
    festivalContainer.innerHTML = `
        <h2 class="mt-0 text-center">🎉 Trwa ${festival.name}! 🎉</h2>
        <div class="bank-section">
            <p>Koniec za: <strong>${timeLeft}s</strong> | Zainteresowanie wydarzeniem: <strong>${festival.globalInterest.toFixed(1)}</strong></p>
            <p class="text-sm">Atrakcje: ${festival.attractions.join(', ')}</p>
            <button onclick="playerPromoteEvent()">Promuj wydarzenie (500 PLN)</button>
        </div>
        <div class="bank-section">
            ${playerSectionHTML}
        </div>
        <div class="bank-section">
            ${participantsTableHTML}
        </div>
        <div class="bank-section">
            ${bonusesHTML}
        </div>
    `;
}

/**
 * Renderuje tabele z ofertami obligacji wewnątrz modala banku.
 */
function renderBondMarketInBank() {
    const stateBondsBody = document.getElementById('state-bonds-table').getElementsByTagName('tbody')[0];
    stateBondsBody.innerHTML = '';

    const bondTypes = ['shortTerm', 'mediumTerm', 'longTerm'];
    bondTypes.forEach(type => {
        const offer = stateBondOffer[type];
        const row = stateBondsBody.insertRow();

        let typeName = '';
        if (type === 'shortTerm') typeName = 'Krótkoterminowe (10 min)';
        if (type === 'mediumTerm') typeName = 'Średnioterminowe (25 min)';
        if (type === 'longTerm') typeName = 'Długoterminowe (45 min)';
        row.insertCell().textContent = typeName;

        let interestText;
        if (type === 'shortTerm') {
            interestText = `${((offer.interest + getDeficitBondPremium()) * 100).toFixed(2)}% (stałe)`;
        } else {
            const inflationProxy = marketVolatilityIndex / 100;
            interestText = `~${((inflationProxy + offer.interestBase + getDeficitBondPremium()) * 100).toFixed(1)}% (zmienne)`;
        }
        if (getDeficitBondPremium() > 0) interestText += ' · +0,25 pp za deficyt';
        row.insertCell().textContent = interestText;
        row.insertCell().textContent = offer.available;

        const actionsCell = row.insertCell();
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.value = '1';
        input.classList.add('w-xs');
        const buyBtn = document.createElement('button');
        buyBtn.textContent = 'Kup';

        // ZMIANA #1 TUTAJ
        // Dodajemy 'player' jako pierwszy argument
        buyBtn.onclick = () => buyStateBond('player', type, parseInt(input.value));

        actionsCell.appendChild(input);
        actionsCell.appendChild(buyBtn);
    });

    // Renderowanie innych obligacji
    const otherBondsBody = document.getElementById('other-bonds-table').getElementsByTagName('tbody')[0];
    otherBondsBody.innerHTML = '';
    activeBonds.forEach(bond => {
        const row = otherBondsBody.insertRow();
        if (bond.isRescueBond) {
            
            row.title = 'Obligacja ratunkowa - podwyższone ryzyko!';
        }
        row.insertCell().textContent = bond.issuerName;
        row.insertCell().textContent = bond.type.replace(' 🆘', '');
        row.insertCell().textContent = bond.type;
        row.insertCell().textContent = `${(bond.interestRate * 100).toFixed(1)}%`;
        row.insertCell().textContent = `${bond.durationMinutes} min`;
        row.insertCell().textContent = `${(bond.risk * 100).toFixed(0)}%`;
        const riskCell = row.insertCell();
        riskCell.textContent = `${(bond.risk * 100).toFixed(0)}%`;
        if (bond.risk > 0.5) riskCell.style.color = 'var(--color-down)'; // Oznacz wysokie ryzyko
        else if (bond.risk > 0.3) riskCell.style.color = 'var(--color-warn)'; // Oznacz średnie ryzyko
        row.insertCell().textContent = bond.available;

        const actionsCell = row.insertCell();
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.value = '1';
        input.classList.add('w-xs');
        const buyBtn = document.createElement('button');
        buyBtn.textContent = 'Kup';

        // ZMIANA #2 TUTAJ
        // Dodajemy 'player' jako pierwszy argument
        buyBtn.onclick = () => buyOtherBond('player', bond.id, parseInt(input.value));

        actionsCell.appendChild(input);
        actionsCell.appendChild(buyBtn);
    });
}

function openFestivalResultsModal(participants, festivalName) {
    // B2: nie przerywamy gry — powiadomienie z przyciskiem „Otwórz”.
    pushNotification(`🎪 Wyniki wydarzenia: ${festivalName}`, () => showFestivalResultsModal(participants, festivalName));
}

function showFestivalResultsModal(participants, festivalName) {
    const modal = document.getElementById('festival-results-modal');
    document.getElementById('festival-results-title').textContent = `Wyniki wydarzenia: ${festivalName}`;
    const body = document.getElementById('festival-results-body');
    body.innerHTML = '';

    participants.forEach((p, index) => {
        const row = body.insertRow();
        let ownerName = 'Nieznany'; // Domyślna nazwa

        // --- 👇 START POPRAWIONEJ LOGIKI NAZWY 👇 ---
        if (p.ownerId === 'player') {
            ownerName = 'Ty (Gracz)';
        } else if (p.ownerId === 'city') {
            ownerName = 'Miasto Gdańsk';
        } else {
            // Spróbuj znaleźć bota AI
            const ai = aiCompetitors.find(a => a.id === p.ownerId);
            if (ai) {
                ownerName = ai.name;
            } else {
                // Jeśli to nie AI, zakładamy, że to symbol spółki giełdowej
                const stock = stocks.find(s => s.symbol === p.ownerId);
                if (stock) {
                    ownerName = stock.name; // Użyj pełnej nazwy spółki
                } else {
                    ownerName = p.ownerId; // W ostateczności pokaż ID
                }
            }
        }
        // --- 👆 KONIEC POPRAWIONEJ LOGIKI NAZWY 👆 ---

        row.insertCell().textContent = `#${index + 1}`;
        row.insertCell().textContent = ownerName;
        row.insertCell().textContent = p.interest.toFixed(1);

        if (p.ownerId === 'player') {
            row.style.fontWeight = 'bold';
            
        }
    });

    modal.style.display = 'block';
}

/**
 * Przesyła ofertę gracza w aukcji bonów.
 */
function submitPlayerTBillBid() {
    const quantityInput = document.getElementById('t-bill-bid-quantity');
    const priceInput = document.getElementById('t-bill-bid-price');
    const quantity = quantityInput.valueAsNumber;
    const price = priceInput.valueAsNumber;

    if (placeTBillBid('player', quantity, price)) {
        // Wyczyść pola po udanym złożeniu oferty
        quantityInput.value = '1';
        priceInput.value = '';
    }
}

/**
 * Aktualizuje sekcję aukcji bonów w modalu banku.
 */
function updateTBillAuctionSection() {
    const section = document.getElementById('t-bill-auction-section');
    if (!section) return;

    if (currentTBillAuction && playerHasTBillAccess) {
        const timeLeft = Math.max(0, Math.ceil((currentTBillAuction.endTime - Date.now()) / 1000));
        document.getElementById('t-bill-auction-available').textContent = currentTBillAuction.quantityAvailable;
        document.getElementById('t-bill-auction-timer').textContent = timeLeft;

        // Wyświetl oferty gracza
        const playerBidsList = document.getElementById('player-t-bill-bids');
        playerBidsList.innerHTML = '';
        currentTBillAuction.bids.filter(b => b.bidderId === 'player').forEach(bid => {
            const li = document.createElement('li');
            li.textContent = `${bid.quantity} szt. po ${bid.price.toFixed(2)} PLN`;
            playerBidsList.appendChild(li);
        });

        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

// --- PONIŻEJ FUNKCJE Z BAZY ui.js (Bankowość Komercyjna) ---

function openSellSharesToBankModal(bankId) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const modal = document.getElementById('sell-shares-to-bank-modal');
    if (!bank || !modal) return;

    // Wypełnij dane modala
    modal.querySelector('#sell-shares-bank-name').textContent = bank.name;
    modal.querySelector('#sell-shares-quantity').value = '1'; // Resetuj ilość

    // Wypełnij listę rozwijaną akcjami gracza
    const select = modal.querySelector('#sell-shares-stock-select');
    select.innerHTML = '<option value="">-- Wybierz akcje do sprzedaży --</option>'; // Opcja pusta
    let hasEligibleShares = false; // Flaga
    Object.keys(playerPortfolio).forEach(symbol => {
        const holding = playerPortfolio[symbol];
        const stock = stocks.find(s => s.symbol === symbol && !s.assetType); // Tylko standardowe akcje
        // Sprawdź, czy gracz ma dostępne akcje (niezablokowane)
        const availableShares = holding.shares - (holding.lockedShares || 0);
        if (stock && availableShares > 0) {
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = `${stock.name} (${symbol}) - dostępne: ${availableShares}`;
            select.appendChild(option);
            hasEligibleShares = true; // Gracz ma co sprzedać
        }
    });

    // Funkcja pomocnicza do aktualizacji szacunkowej ceny odkupu
    const updateEstimatedPrice = () => {
        const selectedSymbol = select.value;
        const stock = stocks.find(s => s.symbol === selectedSymbol);
        const priceEl = modal.querySelector('#sell-shares-estimated-price');
        const quantityInput = modal.querySelector('#sell-shares-quantity');
        const holding = playerPortfolio[selectedSymbol];
        const availableShares = holding ? holding.shares - (holding.lockedShares || 0) : 0;

        // Walidacja ilości
        const quantity = quantityInput.valueAsNumber || 0;
        if (quantity > availableShares) {
            quantityInput.value = availableShares;
        }
        if (quantity < 1 && availableShares > 0) {
            quantityInput.value = 1;
        }


        if (stock) {
            let priceMultiplier = 0.95; // Bazowa zniżka
            if (stock.financialHealth < 0) priceMultiplier -= 0.05;
            if (stock.financialHealth < -2) priceMultiplier -= 0.05;
            priceEl.textContent = (stock.price * priceMultiplier).toFixed(2);
        } else {
            priceEl.textContent = '0.00';
        }
    };
    // Przypisz eventy
    select.onchange = updateEstimatedPrice;
    modal.querySelector('#sell-shares-quantity').oninput = updateEstimatedPrice; // Aktualizuj też przy zmianie ilości
    updateEstimatedPrice(); // Wywołaj raz na start

    // Ustaw akcję dla przycisku "Sprzedaj"
    const sellBtn = modal.querySelector('#sell-shares-to-bank-btn');
    sellBtn.onclick = () => {
        const symbol = select.value;
        const quantity = parseInt(modal.querySelector('#sell-shares-quantity').value);
        sellSharesToInvestmentBank(bankId, symbol, quantity);
    };
    // Wyłącz przycisk, jeśli gracz nie ma nic do sprzedania
    sellBtn.disabled = !hasEligibleShares;

    modal.style.display = 'block'; // Pokaż modal
}

function submitPlayerCollateralBid() {
    const quantityInput = document.getElementById('collateral-bid-quantity');
    const priceInput = document.getElementById('collateral-bid-price');
    const quantity = quantityInput.valueAsNumber;
    const price = priceInput.valueAsNumber;

    if (placeCollateralBid('player', quantity, price)) {
        quantityInput.value = '1';
        priceInput.value = '';
    }
}

/**
 * Aktualizuje sekcję aukcji akcji w modalu banku.
 */
function updateCollateralAuctionSection() {
    const section = document.getElementById('collateral-auction-section');
    if (!section) return;

    if (currentCollateralAuction) {
        const timeLeft = Math.max(0, Math.ceil((currentCollateralAuction.endTime - Date.now()) / 1000));
        document.getElementById('collateral-auction-symbol').textContent = currentCollateralAuction.stockSymbol;
        document.getElementById('collateral-auction-available').textContent = currentCollateralAuction.quantityAvailable;
        document.getElementById('collateral-auction-min-price').textContent = currentCollateralAuction.minPrice.toFixed(2);
        document.getElementById('collateral-auction-timer').textContent = timeLeft;

        // Wyświetl oferty gracza
        const playerBidsList = document.getElementById('player-collateral-bids');
        playerBidsList.innerHTML = '';
        currentCollateralAuction.bids.filter(b => b.bidderId === 'player').forEach(bid => {
            const li = document.createElement('li');
            li.textContent = `${bid.quantity} szt. po ${bid.price.toFixed(2)} PLN`;
            playerBidsList.appendChild(li);
        });

        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

function closeInteractionModal() {
    // Ukryj wszystkie modale interakcji
    document.getElementById('commercial-loan-modal').style.display = 'none';
    document.getElementById('commercial-deposit-modal').style.display = 'none';
    document.getElementById('mortgage-modal').style.display = 'none';
    document.getElementById('sell-shares-to-bank-modal').style.display = 'none';

    // Odśwież listę banków po zamknięciu modala, jeśli zakładka jest aktywna
    const bankModal = document.getElementById('bank-modal');
    const commercialTab = document.getElementById('bank-content-commercial');
    if (bankModal?.style.display === 'block' && commercialTab?.style.display === 'block') {
        renderCommercialBanksList();
    }
}

function openBankIPOOfferModal(message) {
    pushNotification('🏦 Oferta IPO banku dla funduszu', () => showBankIPOOfferModal(message), () => Boolean(currentBankIPOOffer));
}

function showBankIPOOfferModal(message) {
    const modal = document.getElementById('bank-ipo-offer-modal');
    if (!modal || !currentBankIPOOffer) return;

    modal.querySelector('#bank-ipo-offer-message').innerHTML = message;
    // Przypisz akcję do przycisku akceptacji
    modal.querySelector('#accept-bank-ipo-btn').onclick = () => resolveBankIPO('accept');

    modal.style.display = 'block';
}

/** Zamyka modal oferty IPO banku */
function closeBankIPOOfferModal() {
    const modal = document.getElementById('bank-ipo-offer-modal');
    if (modal) modal.style.display = 'none';
    currentBankIPOOffer = null; // Wyczyść ofertę na wypadek zamknięcia przez 'X'
}

// --- PONIŻEJ FUNKCJE DODANE Z ui2.js (Panel Finansowy i Zwijanie) ---

/**
* Przełącza widoczność panelu Inkubatora Start-upów.
* DODANE Z ui2.js
*/
// 0.14.2 P8: zwijane sekcje rynku akcji i ETF (stan w localStorage, nie w zapisie gry).
const COLLAPSIBLE_SECTIONS = { market: { content: 'market-content', icon: 'toggle-icon-market' }, etf: { content: 'etf-content', icon: 'toggle-icon-etf' } };

function readSectionCollapsed(key) {
    try { return localStorage.getItem(`sectionCollapsed:${key}`) === '1'; } catch (e) { return false; }
}

function applySectionCollapse(key, collapsed) {
    const def = COLLAPSIBLE_SECTIONS[key];
    const content = def && document.getElementById(def.content);
    if (!content) return;
    content.hidden = collapsed;
    const icon = document.getElementById(def.icon);
    if (icon) icon.textContent = collapsed ? '▶' : '▼';
}

function toggleSection(key) {
    const collapsed = !readSectionCollapsed(key);
    try { localStorage.setItem(`sectionCollapsed:${key}`, collapsed ? '1' : '0'); } catch (e) { /* tryb prywatny */ }
    applySectionCollapse(key, collapsed);
}

function restoreSectionCollapse() {
    for (const key of Object.keys(COLLAPSIBLE_SECTIONS)) applySectionCollapse(key, readSectionCollapsed(key));
}
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restoreSectionCollapse);
    else restoreSectionCollapse();
}

function toggleStartupPanelVisibility() {
    startupPanelCollapsed = !startupPanelCollapsed; // Odwróć stan
    const panel = document.getElementById('startup-incubator-panel');
    const icon = document.getElementById('toggle-icon-startup');

    if (panel && icon) {
        if (startupPanelCollapsed) {
            panel.classList.add('collapsed'); // Dodaj klasę, aby ukryć treść (CSS zadziała)
            icon.textContent = '▶'; // Zmień ikonkę na "rozwinięty"
        } else {
            panel.classList.remove('collapsed'); // Usuń klasę, aby pokazać treść
            icon.textContent = '▼'; // Zmień ikonkę na "zwinięty"
        }
    }
    // Zapisz stan w localStorage, aby był pamiętany po odświeżeniu
    localStorage.setItem('startupPanelCollapsed', startupPanelCollapsed);
}

/**
* Otwiera modal ze szczegółami finansowymi spółki.
* DODANE Z ui2.js
* @param {string} symbol Symbol spółki.
*/
function openFinancialDetailsModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const modal = document.getElementById('financial-details-modal');
    const title = document.getElementById('financial-details-title');
    const content = document.getElementById('financial-details-content');
    const anomalyReport = document.getElementById('financial-anomaly-report');

    title.textContent = `Szczegóły Finansowe: ${stock.name}`;
    anomalyReport.innerHTML = ''; // Wyczyść raport anomalii

    // Sprawdzenie dostępu (powtórzone dla pewności)
    const accountantLevel = getSkillLevel('accountant');
    const playerRep = stock.reputation['player'];
    // Sprawdź, czy gracz ma flagę dostępu LUB (ma Lvl 2+ ORAZ jest większościowcem)
    const hasAccess = stock.playerHasFinancialAccess || (accountantLevel >= 2 && (playerPortfolio[symbol]?.shares / stock.totalShares) > 0.5);

    if (!hasAccess || accountantLevel === 0) { // Jeśli nie ma dostępu LUB nie ma umiejętności
        content.innerHTML = '<p class="text-down">Brak dostępu do danych finansowych.</p>';
        modal.style.display = 'block';
        return;
    }

    // Wyświetlanie danych z bilansu
    if (stock.balanceSheet) {
        content.innerHTML = `
            <h4>Bilans Spółki:</h4>
            <p><strong>Aktywa:</strong> ${stock.balanceSheet.assets.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <p><strong>Zobowiązania (Pasywa):</strong> ${stock.balanceSheet.liabilities.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <p><strong>Kapitał Własny:</strong> ${(stock.balanceSheet.assets - stock.balanceSheet.liabilities).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <p> &nbsp; - Kapitał Zakładowy: ${stock.balanceSheet.shareCapital.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <p> &nbsp; - Zyski Zatrzymane: ${stock.balanceSheet.retainedEarnings.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <hr>
            <p><strong>Zysk Kwartalny (Ostatni):</strong> ${stock.quarterlyEarnings.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <p><strong>Dług Korporacyjny (jeśli dotyczy):</strong> ${(stock.corporateDebt || 0).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            ${renderFinancialPeriodPreview(stock)}
        `;
    } else {
        content.innerHTML = '<p>Brak szczegółowych danych bilansowych dla tej spółki.</p>';
    }

    // Logika Poziomu 3: Wykrywanie Anomalii
    if (accountantLevel >= 3) {
        // Sprawdź, czy funkcja detectFinancialAnomaly istnieje (na wypadek problemów z ładowaniem plików)
        if (typeof detectFinancialAnomaly === 'function') {
            detectFinancialAnomaly(stock); // Wywołaj funkcję z gameLogic.js
        } else {
            console.error("Funkcja detectFinancialAnomaly nie została znaleziona!");
        }
    }

    modal.style.display = 'block'; // Pokaż modal
}

/** Podgląd pozycji okresu: koszty R&D, kontrakty, nieruchomości i ostatni raport. */
function renderFinancialPeriodPreview(stock) {
    const fmt = value => (Number(value) || 0).toLocaleString('pl-PL', { maximumFractionDigits: 0 }) + ' PLN';
    const rd = getResearchCostSummary(stock);
    const period = getPendingPeriodResult(stock);
    const last = stock.lastReportBreakdown;

    let html = `
        <hr>
        <h4>Bieżący okres (do następnego raportu):</h4>
        <p>R&D — koszty rozpoczęcia: ${fmt(rd.pendingStartup)}, utrzymania: ${fmt(rd.pendingMaintenance)}</p>
        <p>Kontrakty budowlane — przychody: ${fmt(period.constructionRevenue)}, koszty: ${fmt(period.constructionCosts)}</p>
        <p>Nieruchomości (netto): ${fmt(period.propertyIncome)} · Koszty inwestycji: ${fmt(period.investmentExpense)} · Pozostałe: ${fmt(period.otherIncome)}</p>
        <p class="text-xs text-muted">Pozycje te są już rozliczone w gotówce i bilansie; raport kwartalny tylko je wykaże.</p>
        <p>R&D łącznie od początku — rozpoczęcia: ${fmt(rd.totalStartup)}, utrzymanie: ${fmt(rd.totalMaintenance)}</p>`;

    if (last) {
        html += `
        <h4>Ostatni raport kwartalny:</h4>
        <p>Wynik operacyjny: ${fmt(last.operating)} · Koszty R&D: −${fmt(last.researchExpense)}</p>
        <p>Kontrakty: ${fmt(last.constructionRevenue - last.constructionCosts)} · Nieruchomości: ${fmt(last.propertyIncome)} · Inwestycje: −${fmt(last.investmentExpense)}</p>
        <p><strong>Wynik raportowany: ${fmt(last.total)}</strong></p>`;
    }

    return html;
}

/**
 * Obsługuje kliknięcie przycisku "Zobacz Finanse" w Panelu Zarządzania.
 * DODANE Z ui2.js
 * @param {string} symbol Symbol spółki.
 */
function handleViewFinancesClick(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const accountantLevel = getSkillLevel('accountant');
    const playerRep = stock.reputation['player'];
    const isMajorityOwner = (playerPortfolio[symbol]?.shares / stock.totalShares) > 0.5;
    const hasPaidAccess = stock.playerHasFinancialAccess;

    // Warunki blokujące dostęp
    if (accountantLevel === 0) {
        showToast("Musisz odblokować umiejętność 'Księgowy', aby uzyskać dostęp.", 'error');
        return;
    }
    if (playerRep < REPUTATION_LEVELS.NEGATIVE && !isMajorityOwner) {
        showToast(`Twoje relacje z ${stock.name} są zbyt złe (${playerRep.toFixed(1)}), aby udostępnili Ci dane finansowe.`, 'error');
        return;
    }

    // Sprawdzenie, czy dostęp jest darmowy lub już opłacony
    if (hasPaidAccess || (accountantLevel >= 2 && isMajorityOwner)) {
        openFinancialDetailsModal(symbol); // Otwórz modal od razu
        return;
    }

    // Dostęp wymaga opłaty (Lvl 1)
    const accessCost = 2000;
    if (playerCash < accessCost) {
        showToast(`Nie masz wystarczająco gotówki (${accessCost} PLN), aby zapłacić za dostęp.`, 'error');
        return;
    }

    // Zapytaj gracza o potwierdzenie płatności
    gameConfirm(`Czy chcesz zapłacić ${accessCost} PLN za jednorazowy wgląd w finanse ${stock.name}?`, () => {
        playerCash -= accessCost; // Pobierz opłatę
        stock.playerHasFinancialAccess = true; // Ustaw flagę dostępu
        displayCash(); // Zaktualizuj UI gotówki
        logEvent(`Zapłacono ${accessCost} PLN za wgląd w finanse ${stock.name}.`, 'review'); // Zaloguj zdarzenie
        showToast("Dostęp do finansów uzyskany!", 'success'); // Pokaż powiadomienie
        openFinancialDetailsModal(symbol); // Otwórz modal finansowy
        // Odśwież modal zarządzania, aby zaktualizować tekst przycisku/info
        openManagementModal(symbol); // Ponownie otwórz modal zarządzania, by odświeżyć info
    });
}

function openStateModal() {
    const modal = document.getElementById('state-modal');
    if (!modal) return;
    modal.style.display = 'block';
    switchStateTab(stateTab);
}

function toggleSubsidiaryVisibility(parentSymbol) {
    const parentStock = stocks.find(s => s.symbol === parentSymbol);
    if (!parentStock) return;

    parentStock.isSubsidiaryExpanded = parentStock.isSubsidiaryExpanded === false; // 0.14.2 P3: domyślnie rozwinięte

    const subRows = document.querySelectorAll(`.subsidiary-of-${parentSymbol}`);
    subRows.forEach(row => {
        const parentRow = document.querySelector(`tr[data-symbol="${parentSymbol}"]`);
        const parentExchangeKey = parentRow ? stocks.find(s => s.symbol === parentSymbol)?.exchange : null;
        const isExchangeCollapsed = parentExchangeKey ? exchangeCollapseState[parentExchangeKey] : false;

        row.style.display = (parentStock.isSubsidiaryExpanded !== false && !isExchangeCollapsed) ? '' : 'none';
    });

    const parentRow = document.querySelector(`tr[data-symbol="${parentSymbol}"]`);
    if (parentRow) {
        const toggleBtn = parentRow.querySelector('.subsidiary-toggle');
        if (toggleBtn) {
            const expanded = parentStock.isSubsidiaryExpanded !== false;
            toggleBtn.innerHTML = uiIcon(expanded ? 'chevron-down' : 'chevron-right', 14);
            toggleBtn.setAttribute('aria-expanded', String(expanded));
        }
    }
}

function openMaTargetModal(initiatorSymbol) {
    const initiatorStock = stocks.find(s => s.symbol === initiatorSymbol);
    if (!initiatorStock) return;

    const modal = document.getElementById('ma-target-modal');
    const tableBody = document.getElementById('ma-target-table-body');
    document.getElementById('ma-target-title').textContent = `Wybierz Cel dla: ${initiatorStock.name}`;
    tableBody.innerHTML = '';

    const potentialTargets = stocks.filter(target =>
        target.symbol !== initiatorSymbol &&
        !target.assetType &&
        !target.isBankrupt &&
        !target.mergerProcess &&
        !target.isSubsidiaryOf
    );

    if (potentialTargets.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Brak dostępnych celów na rynku.</td></tr>';
    } else {
        potentialTargets.forEach(target => {
            const row = tableBody.insertRow();
            const marketCap = target.price * target.totalShares;
            
            row.insertCell().textContent = `${target.name} (${target.symbol})`;
            row.insertCell().textContent = target.sector.join(', ');
            row.insertCell().textContent = `${marketCap.toLocaleString('pl-PL')} PLN`;
            
            const actionCell = row.insertCell();
            
            // ===>>> ZMIANA: DWA PRZYCISKI PRZEJĘCIA <<<===
            
            // 1. Przycisk Przejęcia (Gotówka)
            const takeoverCashBtn = document.createElement('button');
            takeoverCashBtn.textContent = 'Przejęcie (Gotówka)';
            takeoverCashBtn.title = 'Wrogie przejęcie finansowane z gotówki spółki.';
            takeoverCashBtn.onclick = () => {
                 gameConfirm(`Czy na pewno chcesz zainicjować WROGIE PRZEJĘCIE ${target.name} przez ${initiatorStock.name}? Płatność w GOTÓWCE.`, () => {
                    initiateMergerProcess(initiatorStock, target, 'przejęcie', 'cash');
                    document.getElementById('ma-target-modal').style.display='none';
                    openManagementModal(initiatorSymbol);
                });
            };
            actionCell.appendChild(takeoverCashBtn);

            // 2. Przycisk Przejęcia (LBO)
            const takeoverLboBtn = document.createElement('button');
            takeoverLboBtn.textContent = 'Przejęcie (LBO)';
            takeoverLboBtn.title = 'Wrogie przejęcie finansowane długiem (LBO). Bank sfinansuje transakcję, a Twoja spółka przejmie dług.';
            takeoverLboBtn.classList.add('ml-1');
            takeoverLboBtn.style.borderColor = 'var(--color-warn)'; // Żółta ramka dla odróżnienia
            takeoverLboBtn.onclick = () => {
                 gameConfirm(`Czy na pewno chcesz zainicjować WROGIE PRZEJĘCIE ${target.name} przez ${initiatorStock.name}? Transakcja zostanie sfinansowana KREDYTEM (LBO), który obciąży Twoją spółkę.`, () => {
                    initiateMergerProcess(initiatorStock, target, 'przejęcie', 'lbo');
                    document.getElementById('ma-target-modal').style.display='none';
                    openManagementModal(initiatorSymbol);
                });
            };
            // LBO jest ryzykowne, jeśli firma ma złą kondycję
            if (initiatorStock.financialHealth < 0) {
                takeoverLboBtn.disabled = true;
                takeoverLboBtn.title = 'Nie można sfinansować LBO przy negatywnej kondycji finansowej.';
            }
            actionCell.appendChild(takeoverLboBtn);
            
            // ===>>> KONIEC ZMIAN <<<===


            // Przycisk Fuzji (bez zmian)
            const initiatorMarketCap = initiatorStock.price * initiatorStock.totalShares;
            const sizeRatio = Math.max(marketCap, initiatorMarketCap) / Math.min(marketCap, initiatorMarketCap);
            if (sizeRatio < 2.5) { 
                const mergerBtn = document.createElement('button');
                mergerBtn.textContent = 'Fuzja';
                mergerBtn.title = 'Przyjazna fuzja (wymiana akcji)';
                mergerBtn.classList.add('ml-2');
                mergerBtn.style.borderColor = 'var(--color-up)'; // Zielona ramka
                mergerBtn.onclick = () => {
                    gameConfirm(`Czy na pewno chcesz zaproponować FUZJĘ ${target.name} z ${initiatorStock.name}? Będzie to polegało na wymianie akcji.`, () => {
                        initiateMergerProcess(initiatorStock, target, 'fuzja', 'stockSwap');
                        document.getElementById('ma-target-modal').style.display='none';
                        openManagementModal(initiatorSymbol);
                    });
                };
                actionCell.appendChild(mergerBtn);
            }
        });
    }

    modal.style.display = 'block';
}

function openComplicationModal(stock, decisionData) {
    const modal = document.getElementById('ma-complication-modal');
    if (!modal) return;

    document.getElementById('ma-complication-message').textContent = decisionData.question;
    const optionsContainer = document.getElementById('ma-complication-options');
    optionsContainer.innerHTML = ''; // Wyczyść stare opcje

    decisionData.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.text;
        button.onclick = () => {
            // Wywołaj funkcję logiki, która obsłuży konsekwencje
            resolveComplicationDecision(stock.symbol, option.id);
            modal.style.display = 'none'; // Zamknij modal po wyborze
        };
        optionsContainer.appendChild(button);
    });

    modal.style.display = 'block';
}

// --- Panel Lombardu ---

// ============================================
// ZMIENNE GLOBALNE
// ============================================
let currentConstructionTab = 'main'; // 'main', 'subcontractors'

// ============================================
// FUNKCJE ZARZĄDZANIA ZAKŁADKAMI
// ============================================

/**
 * Przełącza zakładkę w modal sektora budowlanego
 */
function showConstructionTab(tabName) {
    currentConstructionTab = tabName;
    
    const modal = document.getElementById('construction-sector-modal');
    if (!modal) return;
    
    const tabButtons = modal.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabName)) {
            btn.classList.add('active');
        }
    });
    
    const tabContents = modal.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = modal.querySelector(`#construction-${tabName}`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    if (tabName === 'main') {
        renderConstructionCompaniesList();
        renderConstructionProjectsList();
    }
    if (tabName === 'subcontractors') {
        renderConstructionSubcontractorsList();
    }
}

/**
 * Renderuje listę aktywnych przetargów
 */
function renderTendersList() {
    const container = document.getElementById('tenders-list');
    if (!container) return;

    const expandedIds = new Set(
        [...container.querySelectorAll('details[open]')]
            .map(element => element.dataset.tenderId)
    );

    const fragment = document.createDocumentFragment();

    const visibleTenders = activeTenders.filter(
        tender => ['open', 'closed', 'awarded'].includes(tender.status)
    );

    if (visibleTenders.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'construction-empty';
        empty.textContent = 'Brak otwartych lub realizowanych przetargów.';
        fragment.appendChild(empty);
    }

    const statusNames = {
        open: 'Przyjmowanie ofert',
        closed: 'Oczekiwanie na rozstrzygnięcie',
        awarded: 'Kontrakt przyznany'
    };

    for (const tender of visibleTenders) {
        const card = document.createElement('article');
        card.className = 'construction-live-card';

        const title = document.createElement('h4');
        title.textContent = `🏗️ ${tender.buildingType?.name || 'Inwestycja'}`;

        const status = document.createElement('span');
        status.className = 'construction-live-status';
        status.textContent = statusNames[tender.status];

        card.append(title, status);

        card.append(
            createConstructionInfoRow(
                'Zamawiający',
                tender.clientCompany?.name || 'Brak danych'
            ),
            createConstructionInfoRow(
                'Budżet',
                formatConstructionMoney(tender.budget)
            )
        );

        if (tender.status === 'open') {
            card.appendChild(createConstructionInfoRow(
                'Czas na oferty',
                formatConstructionTime(tender.remainingGameMs)
            ));
        }

        if (tender.winner) {
            card.append(
                createConstructionInfoRow(
                    'Wykonawca',
                    tender.winner.bidder?.name || 'Brak danych'
                ),
                createConstructionInfoRow(
                    'Wartość kontraktu',
                    formatConstructionMoney(tender.winner.price)
                )
            );
        }

        const bids = [...(tender.bids || [])].sort(
            (a, b) => calculateBidScore(b, tender) -
                calculateBidScore(a, tender)
        );

        const details = document.createElement('details');
        details.dataset.tenderId = tender.id;
        details.open = expandedIds.has(tender.id);

        const summary = document.createElement('summary');
        summary.textContent = `Oferty wykonawców (${bids.length})`;
        details.appendChild(summary);

        if (bids.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = 'Nie złożono jeszcze żadnej oferty.';
            details.appendChild(empty);
        }

        for (const bid of bids) {
            const offer = document.createElement('div');
            offer.className = 'construction-live-offer';

            offer.append(
                createConstructionInfoRow(
                    'Spółka',
                    bid.bidder?.name || 'Brak danych'
                ),
                createConstructionInfoRow(
                    'Cena',
                    formatConstructionMoney(bid.price)
                ),
                createConstructionInfoRow(
                    'Deklarowany czas',
                    `${bid.time} dni budowy`
                ),
                createConstructionInfoRow(
                    'Ocena oferty',
                    `${calculateBidScore(bid, tender).toFixed(1)} / 100`
                )
            );

            details.appendChild(offer);
        }

        card.appendChild(details);
        fragment.appendChild(card);
    }

    container.replaceChildren(fragment);
}

function renderConstructionCompaniesList() {
    const container = document.getElementById('construction-companies-list');
    if (!container) return;

    const builders = stocks.filter(company => isConstructionCompany(company) && !company.isBankrupt);
    if (builders.length === 0) {
        container.innerHTML = '<p class="construction-empty">Brak spółek budowlanych w grze.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    for (const company of builders) {
        const stats = company.constructionStats || {};
        const active = getActiveProjectsForBuilder(company);
        const openBids = getOpenBidsForBuilder(company).length;
        const bonuses = getConstructionTechnologyBonuses(company);

        const card = document.createElement('div');
        card.className = 'construction-company-card';

        const heading = document.createElement('h4');
        heading.textContent = company.name;
        card.appendChild(heading);

        card.append(
            createConstructionInfoRow('Moce wykonawcze', `${active.length} / ${stats.maxProjects || 0} budów (oferty w toku: ${openBids})`),
            createConstructionInfoRow('Doświadczenie', `${stats.experience || 0} (limit rośnie co 10 pkt, maks. 5 budów)`),
            createConstructionInfoRow('Wygrane przetargi / ukończone', `${stats.wonTenders || 0} / ${stats.completedProjects || 0}`),
            createConstructionInfoRow('Gotówka', formatConstructionMoney(company.cash)),
            createConstructionInfoRow('Kredyt obrotowy na budowy', formatConstructionMoney(company.constructionCredit || 0)),
            createConstructionInfoRow('Technologie: tempo / koszt / ryzyko', `+${(bonuses.speedBonus * 100).toFixed(0)}% / −${(bonuses.costReduction * 100).toFixed(0)}% / −${(bonuses.delayReduction * 100).toFixed(0)}%`)
        );

        const list = document.createElement('ul');
        if (active.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Brak aktywnych budów';
            list.appendChild(li);
        }
        for (const project of active) {
            const li = document.createElement('li');
            li.textContent = `${project.tender.buildingType.name} — ${(project.progress * 100).toFixed(0)}%, ${getConstructionProjectStatusLabel(project)}`;
            list.appendChild(li);
        }
        card.appendChild(list);
        fragment.appendChild(card);
    }

    container.replaceChildren(fragment);
}

function renderConstructionSubcontractorsList() {
    const container = document.getElementById('subcontractors-list');
    const summary = document.getElementById('subcontractors-summary');
    if (!container) return;

    const busyCount = specialists.filter(spec => spec.busyProjectId).length;

    if (summary) {
        summary.innerHTML = `
            <div class="construction-stat-card"><span class="construction-stat-label">Specjaliści</span><strong>${specialists.length}</strong></div>
            <div class="construction-stat-card"><span class="construction-stat-label">Zajęci przy budowach</span><strong>${busyCount}</strong></div>`;
    }

    if (specialists.length === 0) {
        container.innerHTML = '<p class="construction-empty">Brak dostępnych specjalistów.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    const intro = document.createElement('p');
    intro.className = 'construction-empty';
    intro.textContent = 'Wykonawcy zatrudniają podwykonawców, gdy budowa grozi opóźnieniem. ' +
        `Wynagrodzenie (${(CONSTRUCTION_RULES.subcontractorFeeRate * 100).toFixed(0)}% pozostałych kosztów) jest kosztem kontraktu; ` +
        'moce podwykonawcy zwalniają się po odbiorze lub anulowaniu budowy.';
    fragment.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'subcontractor-grid specialist-grid';

    for (const spec of specialists) {
        const project = spec.busyProjectId ? constructionProjects.find(item => item.id === spec.busyProjectId) : null;
        const card = document.createElement('article');
        card.className = 'subcontractor-card specialist-card';

        const top = document.createElement('div');
        top.className = 'card-topline';
        const name = document.createElement('h4');
        name.textContent = spec.name;
        const badge = document.createElement('span');
        badge.className = `status-badge ${project ? 'busy' : 'available'}`;
        badge.textContent = project ? 'Zajęty' : 'Dostępny';
        top.append(name, badge);
        card.appendChild(top);

        card.append(
            createConstructionInfoRow('Poziom', spec.level),
            createConstructionInfoRow('Specjalność', spec.specialty),
            createConstructionInfoRow('Bonus tempa', `+${(spec.bonus * 100).toFixed(1)}%`),
            createConstructionInfoRow('Kontrakty', spec.contractsCompleted),
            createConstructionInfoRow('Gotówka', formatConstructionMoney(spec.cash)),
            createConstructionInfoRow('Obecna budowa', project ? `${project.tender.buildingType.name} (${project.builder.name})` : '—')
        );


        grid.appendChild(card);
    }

    fragment.appendChild(grid);
    container.replaceChildren(fragment);
}

/** Jednolity opis statusu budowy — używany we wszystkich widokach. */
function getConstructionProjectStatusLabel(project) {
    if (project.settled) return project.status === 'completed' ? 'Odebrana' : 'Anulowana';
    if (project.status === 'paused') {
        if (project.delayReason === 'Brak środków wykonawcy.') return 'Wstrzymana — brak finansowania';
        return `Wstrzymana — ${project.delayReason || 'przerwa'}`;
    }
    return getProjectedRemainingMs(project) > getProjectTimeLeftMs(project) ? 'W toku — zagrożony termin' : 'W toku';
}

function renderConstructionProjectsList() {
    const container = document.getElementById('construction-projects-list');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    const projects = constructionProjects.filter(project => !project.settled);

    if (projects.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'construction-empty';
        empty.textContent = 'Brak aktywnych budów.';
        fragment.appendChild(empty);
    }

    for (const project of projects) {
        const card = document.createElement('article');
        card.className = 'construction-live-card';
        card.dataset.projectId = project.id;

        const title = document.createElement('h4');
        title.textContent = `🏗️ ${project.tender?.buildingType?.name || 'Budowa'}`;

        const status = document.createElement('span');
        status.className = 'construction-live-status';
        if (project.status === 'paused') status.classList.add('is-paused');
        status.textContent = getConstructionProjectStatusLabel(project);

        card.append(title, status);

        const progress = Math.max(0, Math.min(1, Number(project.progress) || 0));
        const remainingWork = getProjectedRemainingMs(project) + Math.max(0, Number(project.pauseRemainingMs) || 0);
        const timeLeft = getProjectTimeLeftMs(project);
        const nextMilestone = CONSTRUCTION_RULES.milestones[project.milestonesPaid];

        card.append(
            createConstructionInfoRow('Zamawiający', project.tender?.clientCompany?.name || 'Brak danych'),
            createConstructionInfoRow('Wykonawca', project.builder?.name || 'Brak danych'),
            createConstructionInfoRow('Postęp', `${(progress * 100).toFixed(1)}%`),
            createConstructionInfoRow('Prognoza do końca', formatConstructionTime(remainingWork)),
            createConstructionInfoRow('Do terminu umownego', timeLeft >= 0 ? formatConstructionTime(timeLeft) : `po terminie o ${formatConstructionTime(-timeLeft)}`),
            createConstructionInfoRow('Opóźnienia (wykonawca / zewnętrzne)', `${formatConstructionTime(project.contractorDelayMs)} / ${formatConstructionTime(project.excusedDelayMs)}`)
        );

        const bar = document.createElement('progress');
        bar.className = 'construction-live-progress';
        bar.max = 1;
        bar.value = progress;
        bar.setAttribute('aria-label', `Postęp budowy: ${(progress * 100).toFixed(1)}%`);
        card.appendChild(bar);

        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Rozliczenia kontraktu';
        details.appendChild(summary);

        details.append(
            createConstructionInfoRow('Wartość umowy', formatConstructionMoney(getContractValue(project))),
            createConstructionInfoRow('Zmiany zamówienia', formatConstructionMoney(project.changeOrderAmount)),
            createConstructionInfoRow('Depozyt zamawiającego', formatConstructionMoney(project.escrowBalance)),
            createConstructionInfoRow('Wypłacono wykonawcy (zaliczka + etapy)', formatConstructionMoney(project.paidToBuilder)),
            createConstructionInfoRow('Następny etap płatności', nextMilestone ? `${Math.round(nextMilestone * 100)}% postępu` : 'Odbiór końcowy'),
            createConstructionInfoRow('Koszty poniesione / planowane', `${formatConstructionMoney(project.costsPaid)} / ${formatConstructionMoney(project.estimatedCost)}`),
            createConstructionInfoRow('Planowany wynik kontraktu', formatConstructionMoney(getContractValue(project) - project.estimatedCost)),
            createConstructionInfoRow('Podwykonawca', project.subcontractor ? `${project.subcontractor.name} (${formatConstructionMoney(project.subcontractor.fee)})` : 'Brak')
        );

        card.appendChild(details);
        fragment.appendChild(card);
    }

    container.replaceChildren(fragment);
}

// ============================================
// GŁÓWNA FUNKCJA OTWIERANIA MODALU
// ============================================

function openConstructionSectorModal() {
    const modal = document.getElementById('construction-sector-modal');

    if (!modal) {
        console.error('Nie znaleziono construction-sector-modal.');
        return;
    }

    currentConstructionTab = 'main';

    if (!document.getElementById('tenders-list')) {
        const mainTab = modal.querySelector('#construction-main');

        if (mainTab) {
            const section = document.createElement('section');
            section.className = 'construction-tenders-section';

            const heading = document.createElement('h3');
            heading.textContent = 'Przetargi i zamówienia';

            const list = document.createElement('div');
            list.id = 'tenders-list';

            section.append(heading, list);
            mainTab.prepend(section);
        } else {
            console.warn(
                'Brak construction-main. Sekcja przetargów nie została dodana.'
            );
        }
    }

    renderConstructionSubcontractorsList();

    modal.hidden = false;
    modal.style.display = 'block';

    showConstructionTab('main');
    updateConstructionSectorUI();
}

// --- Panel Windykatora ---
function switchCityTab(tabName) {
    // Ukryj wszystkie kontenery zakładek miasta
    document.querySelectorAll('#city-investment-modal .bank-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    // Pokaż wybrany kontener
    document.getElementById(`city-content-${tabName}`).style.display = 'block';

    // Zaktualizuj wygląd przycisków zakładek
    document.querySelectorAll('#city-investment-modal .bank-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-btn-city-${tabName}`).classList.add('active');
}

// ============================================
// FUNKCJE POMOCNICZE DLA SEKTORA BUDOWLANEGO
// ============================================

function formatConstructionTime(milliseconds) {
    const value = Number(milliseconds);

    if (!Number.isFinite(value)) return 'Brak danych';

    const seconds = Math.ceil(Math.max(0, value) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    return `${minutes} min ${String(remainder).padStart(2, '0')} s symulacji`;
}

function formatConstructionMoney(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return 'Brak danych';

    return amount.toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' PLN';
}

function createConstructionInfoRow(label, value) {
    const row = document.createElement('p');
    row.className = 'construction-info-row';

    const labelElement = document.createElement('span');
    labelElement.className = 'construction-info-label';
    labelElement.textContent = label;

    const valueElement = document.createElement('span');
    valueElement.className = 'construction-info-value';
    valueElement.textContent = String(value);

    row.append(labelElement, valueElement);

    return row;
}

function updateConstructionSectorUI() {
    const modal = document.getElementById('construction-sector-modal');

    if (
        !modal ||
        modal.hidden ||
        getComputedStyle(modal).display === 'none'
    ) {
        return;
    }

    renderTendersList();
    renderConstructionProjectsList();
    renderConstructionCompaniesList();
    renderConstructionHistoryList();
    renderConstructionResearchList();
    renderConstructionTicker();
    renderConstructionFinancing();
}

function getConstructionHistoryRows(companies = stocks) {
    const rows = [];

    for (const company of companies) {
        if (!Array.isArray(company?.constructionHistory)) continue;

        const seenProjects = new Set();

        for (const entry of company.constructionHistory) {
            if (
                !entry.projectId ||
                seenProjects.has(entry.projectId)
            ) {
                continue;
            }

            seenProjects.add(entry.projectId);

            const revenue = Number(entry.revenue);
            const costs = Number(entry.costs);

            if (
                !Number.isFinite(revenue) ||
                revenue < 0 ||
                !Number.isFinite(costs) ||
                costs < 0
            ) {
                continue;
            }

            const cancelled = entry.status === 'cancelled';
            const completedAt = Number(entry.completedAt);

            rows.push({
                projectId: entry.projectId,
                builderName: company.name || company.symbol || 'Spółka',
                builderSymbol: company.symbol || '',
                buildingName: entry.buildingName || 'Inwestycja',
                clientName: entry.clientName || 'Brak danych',
                status: cancelled ? 'cancelled' : 'completed',
                revenue,
                costs,
                profit: revenue - costs,
                margin: revenue > 0
                    ? (revenue - costs) / revenue * 100
                    : null,
                delays: Math.max(0, Number(entry.delays) || 0),
                penalty: Math.max(0, Number(entry.penalty) || 0),
                bonus: Math.max(0, Number(entry.bonus) || 0),
                elapsedGameMs: Number.isFinite(entry.elapsedGameMs)
                    ? entry.elapsedGameMs
                    : null,
                completedAt: Number.isFinite(completedAt) &&
                    completedAt > 0
                    ? completedAt
                    : null,
                reason: entry.reason || ''
            });
        }
    }

    rows.sort((a, b) => {
        const dateDifference =
            (b.completedAt || 0) - (a.completedAt || 0);

        if (dateDifference !== 0) return dateDifference;

        return String(a.projectId).localeCompare(String(b.projectId));
    });

    return rows;
}

function renderConstructionHistoryList(companies = stocks) {
    const modal = document.getElementById('construction-sector-modal');
    const mainTab = modal?.querySelector('#construction-main');

    if (!mainTab) return;

    let container = mainTab.querySelector('#construction-history-list');

    if (!container) {
        const section = document.createElement('section');
        section.className = 'construction-history-section';

        const heading = document.createElement('h3');
        heading.textContent = 'Historia kontraktów';

        container = document.createElement('div');
        container.id = 'construction-history-list';

        section.append(heading, container);
        mainTab.appendChild(section);
    }

    const expandedIds = new Set(
        [...container.querySelectorAll('details[open]')]
            .map(element => element.dataset.historyKey)
    );

    const rows = getConstructionHistoryRows(companies);
    const fragment = document.createDocumentFragment();

    if (rows.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'construction-empty';
        empty.textContent = 'Brak zakończonych lub anulowanych kontraktów.';

        fragment.appendChild(empty);
        container.replaceChildren(fragment);
        return;
    }

    const totals = rows.reduce((sum, row) => {
        sum.revenue += row.revenue;
        sum.costs += row.costs;
        sum.profit += row.profit;

        if (row.status === 'completed') {
            sum.completed++;
        } else {
            sum.cancelled++;
        }

        return sum;
    }, {
        revenue: 0,
        costs: 0,
        profit: 0,
        completed: 0,
        cancelled: 0
    });

    const summaryCard = document.createElement('article');
    summaryCard.className = 'construction-live-card';

    const summaryTitle = document.createElement('h4');
    summaryTitle.textContent = 'Wyniki kontraktów w dostępnej historii';

    summaryCard.append(
        summaryTitle,
        createConstructionInfoRow('Ukończone', totals.completed),
        createConstructionInfoRow('Anulowane', totals.cancelled),
        createConstructionInfoRow(
            'Przychody',
            formatConstructionMoney(totals.revenue)
        ),
        createConstructionInfoRow(
            'Koszty',
            formatConstructionMoney(totals.costs)
        ),
        createConstructionInfoRow(
            'Wynik',
            formatConstructionMoney(totals.profit)
        )
    );

    fragment.appendChild(summaryCard);

    for (const row of rows.slice(0, 30)) {
        const card = document.createElement('article');
        card.className = 'construction-live-card';
        card.dataset.historyProjectId = row.projectId;

        const heading = document.createElement('h4');
        heading.textContent = row.buildingName;

        const status = document.createElement('span');
        status.className = 'construction-live-status';
        status.textContent = row.status === 'cancelled'
            ? 'Kontrakt anulowany'
            : 'Kontrakt ukończony';

        if (row.status === 'cancelled') {
            status.classList.add('is-paused');
        }

        card.append(
            heading,
            status,
            createConstructionInfoRow('Wykonawca', row.builderName),
            createConstructionInfoRow(
                'Wynik kontraktu',
                formatConstructionMoney(row.profit)
            )
        );

        const key = JSON.stringify([
            row.builderSymbol || row.builderName,
            row.projectId
        ]);

        const details = document.createElement('details');
        details.dataset.historyKey = key;
        details.open = expandedIds.has(key);

        const detailsTitle = document.createElement('summary');
        detailsTitle.textContent = 'Rozliczenie i szczegóły';

        details.append(
            detailsTitle,
            createConstructionInfoRow('Zamawiający', row.clientName),
            createConstructionInfoRow(
                'Przychód',
                formatConstructionMoney(row.revenue)
            ),
            createConstructionInfoRow(
                'Koszty realizacji',
                formatConstructionMoney(row.costs)
            ),
            createConstructionInfoRow(
                'Marża kontraktu',
                row.margin === null
                    ? 'Nie dotyczy'
                    : `${row.margin.toFixed(1)}%`
            ),
            createConstructionInfoRow(
                'Czas realizacji',
                row.elapsedGameMs === null
                    ? 'Brak danych'
                    : formatConstructionTime(row.elapsedGameMs)
            ),
            createConstructionInfoRow('Opóźnienia', row.delays),
            createConstructionInfoRow('Kara umowna / premia', `${formatConstructionMoney(row.penalty)} / ${formatConstructionMoney(row.bonus)}`),
            createConstructionInfoRow(
                'Data odbioru',
                row.completedAt === null
                    ? 'Brak danych'
                    : new Date(row.completedAt).toLocaleString('pl-PL')
            )
        );

        if (row.reason) {
            details.appendChild(createConstructionInfoRow(
                'Powód anulowania',
                row.reason
            ));
        }

        card.appendChild(details);
        fragment.appendChild(card);
    }

    if (rows.length > 30) {
        const note = document.createElement('p');
        note.className = 'construction-empty';
        note.textContent =
            `Wyświetlono 30 z ${rows.length} kontraktów. ` +
            'Pełna historia pozostaje w danych spółek.';

        fragment.appendChild(note);
    }

    container.replaceChildren(fragment);
}

function renderConstructionResearchList(companies = stocks) {
    const modal = document.getElementById('construction-sector-modal');
    const mainTab = modal?.querySelector('#construction-main');

    if (!mainTab) return;

    let container = mainTab.querySelector(
        '#construction-research-list'
    );

    if (!container) {
        const section = document.createElement('section');
        section.className = 'construction-research-section';

        const heading = document.createElement('h3');
        heading.textContent = 'Badania spółek budowlanych';

        container = document.createElement('div');
        container.id = 'construction-research-list';

        section.append(heading, container);
        mainTab.appendChild(section);
    }

    const expandedCompanies = new Set(
        [...container.querySelectorAll('details[open]')]
            .map(element => element.dataset.researchCompany)
    );

    const builders = companies.filter(
        company =>
            !company.isBankrupt &&
            Array.isArray(company.sector) &&
            company.sector.includes('Budowlany')
    );

    const fragment = document.createDocumentFragment();

    if (builders.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'construction-empty';
        empty.textContent = 'Brak aktywnych spółek budowlanych.';
        fragment.appendChild(empty);
    }

    for (const company of builders) {
        const card = document.createElement('article');
        card.className = 'construction-live-card';

        const heading = document.createElement('h4');
        heading.textContent = `🔬 ${company.name}`;

        const research = company.research;
        const currentTech = technologies[research?.currentTech];
        const bonuses = getConstructionTechnologyBonuses(company);

        let researchStatus = 'Nie prowadzi badań';

        if (research?.currentTech) {
            researchStatus = research.isResearching
                ? 'Badanie w toku'
                : 'Badanie wstrzymane';
        } else if (research?.choiceAvailableUntil) {
            researchStatus = 'Oczekiwanie na wybór badania';
        }

        card.append(
            heading,
            createConstructionInfoRow('Status R&D', researchStatus),
            createConstructionInfoRow(
                'Specjalizacja',
                research?.specialization || 'Nie wybrano'
            ),
            createConstructionInfoRow(
                'Aktualne badanie',
                currentTech?.name ||
                (research?.currentTech ? 'Nieznana technologia' : 'Brak')
            ),
            createConstructionInfoRow(
                'Bonus szybkości nowych budów',
                `${(bonuses.speedBonus * 100).toFixed(1)}%`
            ),
            createConstructionInfoRow(
                'Obniżka kosztów nowych budów',
                `${(bonuses.costReduction * 100).toFixed(1)}%`
            ),
            createConstructionInfoRow(
                'Względna redukcja ryzyka opóźnień',
                `${(bonuses.delayReduction * 100).toFixed(1)}%`
            )
        );

        const requiredPoints = Number(currentTech?.cost);
        const currentPoints = Number(research?.progress);

        if (
            Number.isFinite(requiredPoints) &&
            requiredPoints > 0 &&
            Number.isFinite(currentPoints)
        ) {
            const progress = Math.max(
                0,
                Math.min(1, currentPoints / requiredPoints)
            );

            card.appendChild(createConstructionInfoRow(
                'Postęp badania',
                `${(progress * 100).toFixed(1)}%`
            ));

            const bar = document.createElement('progress');
            bar.className = 'construction-live-progress';
            bar.max = 1;
            bar.value = progress;
            bar.setAttribute('aria-label', 'Postęp badania');

            card.appendChild(bar);
        }

        const options = getConstructionResearchOptions(company);

        const details = document.createElement('details');
        const companyKey = company.symbol || company.id || company.name;

        details.dataset.researchCompany = companyKey;
        details.open = expandedCompanies.has(companyKey);

        const summary = document.createElement('summary');
        summary.textContent =
            `Technologie sektorowe (${options.length})`;

        details.appendChild(summary);

        for (const option of options) {
            const item = document.createElement('div');
            item.className = 'construction-live-offer';

            const title = document.createElement('h4');
            title.textContent = `${option.icon} ${option.name}`;

            const description = document.createElement('p');
            description.textContent = option.description;

            item.append(
                title,
                description,
                createConstructionInfoRow('Status', option.status),
                createConstructionInfoRow(
                    'Koszt rozpoczęcia',
                    formatConstructionMoney(option.initialCashCost)
                ),
                createConstructionInfoRow(
                    'Wymagany postęp',
                    Number.isFinite(option.researchPoints)
                        ? `${option.researchPoints} pkt`
                        : 'Brak danych'
                ),
                createConstructionInfoRow(
                    'Kierunek badań',
                    option.type
                )
            );

            details.appendChild(item);
        }

        card.appendChild(details);
        fragment.appendChild(card);
    }

    container.replaceChildren(fragment);
}

function updateResearchChoiceTimerUI() {
    const modal = document.getElementById('research-modal');
    const timer = document.getElementById('rd-choice-timer');

    if (
        !modal ||
        !timer ||
        modal.hidden ||
        getComputedStyle(modal).display === 'none'
    ) {
        return;
    }

    const company = stocks.find(
        stock => stock.symbol === modal.dataset.currentSymbol
    );

    const research = company?.research;

    if (
        !research ||
        research.currentTech ||
        !research.choiceAvailableUntil
    ) {
        timer.textContent = '—';
        return;
    }

    const remaining = Number.isFinite(research.choiceRemainingGameMs)
        ? Math.max(0, research.choiceRemainingGameMs)
        : 15000;

    timer.textContent =
        `${Math.ceil(remaining / 1000)} s symulacji` +
        (isGamePaused ? ' — pauza' : '');
}

// =================================================================================
// FUNDUSZ GRACZA (etap B): panel funduszu, wykres okresów, rywale, klienci,
// konto prywatne, CV ze szkoleniami i scenka startowa
// =================================================================================

// 0.14.5: jeden format liczb w całej grze (04_teksty.md): „14 040,25 PLN”, „−7,20%”, minus typograficzny.
const MINUS_SIGN = '\u2212';

const NUMBER_FORMATS_PL = {}; // cache Intl.NumberFormat — toLocaleString z opcjami tworzy formatter przy każdym wywołaniu
function formatNumberPl(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const format = NUMBER_FORMATS_PL[digits] || (NUMBER_FORMATS_PL[digits] = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
    const text = format.format(Math.abs(number));
    return (number < 0 && /[1-9]/.test(text) ? MINUS_SIGN : '') + text;
}

/** Kwota w PLN (nazwa formatZl zostaje — używana w całej grze). */
function formatZl(value, digits = 2) {
    const text = formatNumberPl(value, digits);
    return text === '—' ? text : `${text} PLN`;
}

/** Krótka kwota: 3,5 mln PLN / 1,2 mld PLN; poniżej miliona pełna kwota bez groszy. */
function formatPLNShort(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const abs = Math.abs(number);
    if (abs >= 1e9) return `${formatNumberPl(number / 1e9, 1)} mld PLN`;
    if (abs >= 1e6) return `${formatNumberPl(number / 1e6, 1)} mln PLN`;
    return formatZl(number, 0);
}

/** Zmiana procentowa ze znakiem: +2,10% / −7,20% / 0,00% (value jako ułamek). */
function formatPct(value, digits = 2) {
    const number = Number(value) * 100;
    if (!Number.isFinite(number)) return '—';
    const text = formatNumberPl(number, digits);
    return `${number > 0 && /[1-9]/.test(text) ? '+' : ''}${text}%`;
}

/** NAV / udział: 4 miejsca po przecinku. */
function formatNav(value) { return formatZl(value, 4); }

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// =================================================================================
// PANEL FUNDUSZU
// =================================================================================

/** B5: panel „Dlaczego klienci odchodzą / przychodzą” — rozbicie przepływów ostatniego i bieżącego kwartału. */
function renderFundFlowReasons() {
    const box = document.getElementById('fund-flow-reasons');
    if (!box || typeof getFundFlowStats !== 'function') return;
    const stats = getFundFlowStats();
    const quarterTable = (quarter, label) => {
        if (!quarter) return `<p class="text-muted text-sm">${label}: brak danych.</p>`;
        const rows = (entries, names, sign) => Object.entries(entries).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
            .map(([key, value]) => `<li>${names[key] || key}: <strong class="${sign > 0 ? 'text-up' : 'text-down'}">${sign > 0 ? '+' : '−'}${formatZl(value, 0)}</strong></li>`).join('');
        const base = Math.max(1, quarter.startUnits);
        const net = (quarter.inUnits - quarter.outUnits) / base * 100;
        return `<div class="text-sm"><strong>${label}</strong> (kw. ${quarter.quarter}): napływ ${formatNumberPl(quarter.inUnits / base * 100, 1)}% udziałów, odpływ ${formatNumberPl(quarter.outUnits / base * 100, 1)}% udziałów, netto ${net >= 0 ? '+' : ''}${net.toFixed(1)}%
            <div class="d-flex gap-2 flex-wrap"><div><em>Odchodzą, bo:</em><ul>${rows(quarter.out, FUND_FLOW_OUT_REASONS, -1) || '<li>nikt nie odszedł</li>'}</ul></div>
            <div><em>Przychodzą:</em><ul>${rows(quarter.in, FUND_FLOW_IN_REASONS, 1) || '<li>brak wpłat</li>'}</ul></div></div></div>`;
    };
    box.innerHTML = quarterTable(stats.last, 'Ostatni kwartał') + quarterTable(stats.current, 'Bieżący kwartał')
        + `<p class="text-xs text-muted">Napływ nowych klientów (emisja ${isFundOpenForSubscriptions() ? 'otwarta' : 'zamknięta'}): ok. ${(isFundOpenForSubscriptions() ? getOrganicInflowRate() * 100 : 0).toFixed(1)}% aktywów rocznie — zależy od zaufania, reputacji i wyniku vs GIG.</p>`;
}

/** Skrót z powiadomienia: otwiera panel przepływów funduszu. */
function showFundFlowPanel() {
    const details = document.getElementById('fund-flow-details');
    if (details) { details.open = true; details.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    renderFundFlowReasons();
}

function displayFundPanel() {
    if (!playerFund) return;
    const openBox = document.getElementById('fund-open-subscriptions');
    if (openBox) openBox.checked = isFundOpenForSubscriptions(); // B5: domyślnie otwarta
    renderFundFlowReasons();

    const title = document.getElementById('fund-panel-title');
    if (title) title.textContent = playerProfile?.fundName || 'Fundusz';

    document.getElementById('account-btn-fund')?.classList.toggle('active', activeTradingAccount === 'fund');
    document.getElementById('account-btn-private')?.classList.toggle('active', activeTradingAccount === 'private');

    renderFundSummary();
    renderFundPeriodsChart();
    renderFundRivalsTable();
    renderFundClients();
    renderPrivatePanel();
    renderCareerPanel();
    renderPawnPanel();
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
            <div><span>NAV / udział</span><strong>${formatNav(nav)}</strong></div>
            <div><span>Udziały</span><strong>${formatNumberPl(playerFund.units, 1)}</strong></div>
            <div><span>Klienci</span><strong>${playerFund.clients.length}</strong></div>
            <div><span>Stanowisko</span><strong>${escapeHtml(getPlayerPosition().name)}</strong></div>
        </div>
        <div class="fund-trust">
            <span>Zaufanie klientów: <strong>${trust}/100</strong></span>
            <div class="fund-trust-bar"><div class="fund-trust-fill ${trustClass}" style="width:${trust}%"></div></div>
        </div>
        ${(() => { const reasons = typeof getTrustDropReasons === 'function' ? getTrustDropReasons() : []; return reasons.length ? `<div class="alert alert--warn" role="status">${uiIcon('alert', 16)}<div><strong>Zaufanie spada</strong><br>${escapeHtml(reasons[0])}</div></div>` : ''; })()}
        <div class="fund-period-line">
            Okres ${current.number}: ${formatPct(periodReturn)} vs GIG ${formatPct(benchmarkReturn)}
            · emisje ${current.emissions}/${MAX_EMISSIONS_PER_PERIOD}
            · obsunięcie ${formatNumberPl(current.maxDrawdown * 100, 1)}%
        </div>
        <div class="fund-period-progress" title="Postęp okresu oceny (15 min gry)">
            <div style="width:${(periodProgress * 100).toFixed(1)}%"></div>
        </div>`;
    updateEmissionControls();
}

/** 0.14.2 P12: przycisk emisji — próg zaufania, licznik X/2, maksymalna wielkość. */
function updateEmissionControls() {
    const button = document.getElementById('fund-emission-btn'), info = document.getElementById('fund-emission-info');
    if (!button || !playerFund) return;
    const reason = getEmissionBlockReason();
    button.disabled = Boolean(reason);
    button.title = reason || `Najwyżej ${getMaxEmissionUnits()} udziałów w jednej emisji (5% + 20% × zaufanie obecnych udziałów).`;
    if (info) info.textContent = `${reason ? `${reason} ` : ''}Emisje w tym okresie: ${playerFund.current.emissions}/${MAX_EMISSIONS_PER_PERIOD} · próg zaufania ${EMISSION_MIN_TRUST}% · maks. ${getMaxEmissionUnits()} udziałów naraz.`;
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
        { key: 'fund', label: 'Twój fundusz', color: 'var(--color-chart-fund)' },
        { key: 'benchmark', label: 'GIG', color: 'var(--color-chart-index)' },
        { key: 'rivals', label: 'Fundusze zewnętrzne (śr.)', color: 'var(--color-chart-rivals)' }
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
            svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 1).toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" style="fill:${item.color}" fill-opacity="${row.partial ? 0.55 : 1}"><title>${row.label} — ${item.label}: ${formatPct(value)}</title></rect>`;
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
        container.innerHTML = '<p class="fund-muted">Porównanie z rywalami pojawi się po pierwszym okresie (ok. 15 min gry).</p>';
        return;
    }

    const rows = [
        { name: playerProfile?.fundName || 'Twój fundusz', ret: last.fundReturn, extra: `zmienność ${(last.volatility * 100).toFixed(2)}%, obsunięcie ${(last.maxDrawdown * 100).toFixed(1)}%`, mine: true },
        { name: 'GIG (indeks rynku)', ret: last.benchmarkReturn, extra: '' },
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
                const def = CLIENT_TYPES[client.type] || CLIENT_TYPES.careful;
                const sat = Math.round(client.satisfaction * 100);
                return `<tr>
                    <td title="${def.label}">${escapeHtml(client.name)}</td>
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
        <p>Konto prywatne: <strong>${formatZl(playerWallet.cash)}</strong>
           · udziały własnego funduszu: <strong>${formatNumberPl(playerWallet.fundUnits, 2)}</strong> (${formatZl(playerWallet.fundUnits * nav)})</p>
        <ul class="fund-private-list">${holdings}</ul>
        <div class="fund-emission">
            <input type="number" id="private-ju-amount" min="1" value="50" aria-label="Kwota lub liczba udziałów">
            <button class="btn-secondary" onclick="buyOwnFundUnits(document.getElementById('private-ju-amount').value)">Kup udziały za PLN</button>
            <button class="btn-secondary" onclick="sellOwnFundUnits(document.getElementById('private-ju-amount').value)">Umórz udziały</button>
        </div>
        <p class="fund-muted">Prywatny handel akcjami: przełącz konto na „Konto prywatne” i kupuj w tabeli rynku.
           Kupowanie akcji, które fundusz kupił w tym tygodniu, grozi kontrolą compliance.</p>`;
}

function handleFundEmission() {
    const input = document.getElementById('fund-emission-units');
    const units = Math.floor(Number(input?.value) || 0);
    if (!(units > 0)) return;
    const result = issueFundUnits(units);
    const blockedText = result.blocked === 'size' ? 'Emisja: przy obecnym zaufaniu limit wielkości to 0 udziałów.' : result.blocked;
    showToast(result.issued > 0 ? `Emisja: sprzedano ${formatNumberPl(result.issued, 1)} udziałów (${formatZl(result.raised)})${units > getMaxEmissionUnits() ? ` — limit wielkości ${getMaxEmissionUnits()} udziałów` : ''}` : blockedText || 'Emisja: brak chętnych', result.issued > 0 ? 'success' : 'warning');
    refreshFundViews();
}

// =================================================================================
// CV I SZKOLENIA (zastępuje drzewko umiejętności)
// =================================================================================

function renderSkillsPanel() {
    renderCvPanel();
}

let cvTab = 'cv'; // N1: 'cv' | 'academy'

function setCvTab(tab) {
    cvTab = tab;
    renderCvPanel();
}

function renderCvPanel() {
    const list = document.getElementById('skills-list');
    const money = document.getElementById('skills-modal-xp');
    if (!list) return;
    if (money) money.textContent = playerWallet.cash.toFixed(2);
    const tabs = `<div class="cc-tabs" role="tablist"><button role="tab" aria-selected="${cvTab === 'cv'}" class="${cvTab === 'cv' ? 'active' : ''}" onclick="setCvTab('cv')">CV i szkolenia</button><button role="tab" aria-selected="${cvTab === 'academy'}" class="${cvTab === 'academy' ? 'active' : ''}" onclick="setCvTab('academy')">Akademia</button><button role="tab" aria-selected="${cvTab === 'mentor'}" class="${cvTab === 'mentor' ? 'active' : ''}" onclick="setCvTab('mentor')">Mentor</button></div>`;
    if (cvTab === 'academy' && typeof renderAcademyPanel === 'function') {
        list.innerHTML = tabs + renderAcademyPanel();
        return;
    }
    if (cvTab === 'mentor' && typeof renderMentorPanel === 'function') {
        list.innerHTML = tabs + renderMentorPanel();
        return;
    }

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
            ${next ? `<button ${canBuy ? '' : 'disabled'} onclick="buyTraining('${id}')">${reqMet ? `Szkolenie: ${cost} PLN` : 'Wymaga wcześniejszego szkolenia'}</button>` : ''}
        </article>`;
    }).join('');

    list.innerHTML = tabs + `
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

    // Tryb debug: opcja „Pomijaj scenkę z babcią” — od razu profil domyślny z formularza.
    if (isDebugMode() && isIntroSkipEnabled()) {
        completeIntroScene();
        return;
    }

    overlay.hidden = false;
    thread.innerHTML = '';
    form.hidden = true;
    const skip = document.getElementById('intro-skip-btn');
    if (skip) skip.hidden = !isDebugMode();

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
            title="${country.available ? 'Dostępny' : `Przepustka: ${country.passCost.toLocaleString('pl-PL')} PLN (wkrótce)`}">
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
    if (typeof syncCeoTitle === 'function') syncCeoTitle(); // nazwa korporacji z formularza
    logEvent(`💼 Witaj, ${playerProfile.name}! Zarządzasz funduszem „${playerProfile.fundName}” w ${playerProfile.corporation}. Wznów grę, aby zacząć.`, 'review');

    // Jedno powitanie w poczcie — z nazwami z formularza (startNewCareer wysłał wcześniej domyślne).
    mailbox = createMailbox();
    addMail({
        sender: 'corporation',
        subject: `Witamy w ${playerProfile.corporation}, ${playerProfile.name}!`,
        body: `Od dziś zarządzasz funduszem „${playerProfile.fundName}”. Wyniki oceniamy co 4 okresy. Wiadomości z rynku przysyłają czasopisma — prenumeraty ustawisz w zakładce Subskrypcje.`,
        importance: 2
    });
    refreshFundViews();
}

// =================================================================================
// TRYB DEBUG (ustawienia): prędkości ×10/×50, dodawanie pieniędzy, wymuszenie okresu i oceny
// =================================================================================

const DEBUG_MODE_KEY = 'gra_inwestycyjna_debug_mode';

function isDebugMode() {
    try { return localStorage.getItem(DEBUG_MODE_KEY) === '1'; } catch (e) { return false; }
}

function applyDebugModeUi() {
    const enabled = isDebugMode();
    document.querySelectorAll('.debug-only').forEach(element => { element.hidden = !enabled; });
    const tools = document.getElementById('debug-tools');
    if (tools) tools.hidden = !enabled;
    const button = document.getElementById('debug-toggle-btn');
    if (button) button.textContent = `🛠️ Tryb debug: ${enabled ? 'włączony' : 'wyłączony'}`;
    const skipButton = document.getElementById('debug-skip-intro-btn');
    if (skipButton) skipButton.textContent = `⏭️ Pomijaj scenkę z babcią: ${isIntroSkipEnabled() ? 'tak' : 'nie'}`;
    if (!enabled && currentSpeedMultiplier > 5) setGameSpeed(5);
}

const INTRO_SKIP_KEY = 'gra_inwestycyjna_skip_intro';

function isIntroSkipEnabled() {
    try { return localStorage.getItem(INTRO_SKIP_KEY) === '1'; } catch (e) { return false; }
}

/** Przełącznik w ustawieniach debug: kolejne nowe gry startują bez scenki z babcią. */
function toggleIntroSkip() {
    try { localStorage.setItem(INTRO_SKIP_KEY, isIntroSkipEnabled() ? '0' : '1'); } catch (e) { /* brak localStorage */ }
    applyDebugModeUi();
}

/** Pomija trwającą scenkę (przycisk w scence, widoczny w trybie debug). */
function skipIntroScene() {
    completeIntroScene();
}

function toggleDebugMode() {
    try { localStorage.setItem(DEBUG_MODE_KEY, isDebugMode() ? '0' : '1'); } catch (e) { /* brak localStorage */ }
    applyDebugModeUi();
}

function debugAddWallet(amount) {
    playerWallet.cash += amount;
    logEvent(`🛠️ [DEBUG] +${amount} PLN do portfela prywatnego.`, 'review');
    refreshFundViews();
}

/** Dodaje gotówkę funduszowi bez nowych JU (NAV rośnie). */
function debugAddFund(amount) {
    playerCash += amount;
    logEvent(`🛠️ [DEBUG] +${amount} PLN do gotówki funduszu.`, 'review');
    refreshFundViews();
}

function debugEndPeriod() {
    if (playerFund) closeFundPeriod();
    refreshFundViews();
}

function debugBoardReview() {
    if (typeof runBoardEvaluation === 'function') runBoardEvaluation();
    refreshFundViews();
}

/**
 * Niezmienniki świata gry (testy i tryb debug): skończone liczby, brak ujemnej gotówki funduszy,
 * akcje w obrocie w granicach, JU klientów = JU funduszu, zastawy ≤ posiadanych, istniejące giełdy.
 * Zwraca listę naruszeń (pusta = OK).
 */
function checkWorldInvariants() {
    const problems = [];
    const finite = (value, label) => { if (!Number.isFinite(Number(value))) problems.push(`${label}: ${value}`); };
    const EPS = 1e-6;

    for (const stock of stocks) {
        if (stock.isBankrupt || stock.assetType === 'Startup') continue; // startup: wycena po wpłatach, bez gotówki i akcji
        finite(stock.price, `cena ${stock.symbol}`);
        if (!(stock.price > 0)) problems.push(`cena ${stock.symbol} ≤ 0`);
        finite(stock.cash, `gotówka ${stock.symbol}`);
        if (!exchanges[stock.exchange] && stock.exchange !== 'INCUBATOR') problems.push(`nieznana giełda ${stock.symbol}: ${stock.exchange}`);
        if (stock.sharesHeld < -EPS || stock.sharesHeld > stock.totalShares + EPS) problems.push(`sharesHeld ${stock.symbol}: ${stock.sharesHeld}/${stock.totalShares}`);
        const tracked = getTrackedHeldShares(stock);
        if (Math.abs(stock.sharesHeld - tracked) > 0.5) problems.push(`akcje w obrocie ${stock.symbol}: ${Math.round(stock.sharesHeld)} ≠ posiadacze ${Math.round(tracked)}`);
        if (Number(stock.cash) < 0 && !stock.assetType) problems.push(`ujemna gotówka ${stock.symbol}: ${Math.round(stock.cash)}`);
    }

    if (playerFund) {
        finite(playerCash, 'gotówka funduszu');
        if (playerCash < -EPS) problems.push(`ujemna gotówka funduszu: ${playerCash}`);
        finite(getFundNav(), 'NAV');
        const clientUnits = playerFund.clients.reduce((sum, client) => sum + client.units, 0);
        if (Math.abs(clientUnits - playerFund.units) > Math.max(EPS, playerFund.units * 1e-9)) problems.push(`JU klientów ${clientUnits} ≠ JU funduszu ${playerFund.units}`);
        finite(playerWallet?.cash, 'portfel prywatny');
    }
    const checkPortfolio = (portfolio, owner) => {
        for (const [symbol, holding] of Object.entries(portfolio || {})) {
            if (holding.assetType === 'Startup') { finite(holding.investedAmount, `startup ${owner} ${symbol}`); continue; }
            finite(holding.shares, `akcje ${owner} ${symbol}`);
            if (holding.shares < -EPS) problems.push(`ujemne akcje ${owner} ${symbol}`);
            if ((holding.lockedShares || 0) > holding.shares + EPS) problems.push(`zastaw > posiadanych ${owner} ${symbol}`);
        }
    };
    checkPortfolio(playerPortfolio, 'fundusz');
    for (const ai of aiCompetitors) { finite(ai.cash, `gotówka ${ai.name}`); checkPortfolio(ai.portfolio, ai.name); }
    for (const manager of corporation?.managers || []) {
        finite(manager.fund.cash, `gotówka funduszu ${manager.name}`);
        if (manager.fund.cash < -EPS) problems.push(`ujemna gotówka funduszu ${manager.name}`);
        finite(getBotFundNav(manager.fund), `NAV ${manager.name}`);
        checkPortfolio(manager.fund.portfolio, manager.name);
    }
    for (const bond of allBonds) finite(bond.faceValue, `obligacja ${bond.id}`);
    if (corporation) finite(corporation.budget, 'budżet korporacji');
    // A3: przycięcia „duchów posiadaczy” to ostrzeżenia, nie naruszenia — mogą maskować prawdziwy rozjazd.
    // 0.14.1 R0: niezmienniki puli i inkubatora jako ostrzeżenia (rozjazd = pieniądze bez rozliczenia).
    const moneyWarnings = [...(typeof checkPoolInvariants === 'function' ? checkPoolInvariants() : []), ...(typeof checkIncubatorInvariants === 'function' ? checkIncubatorInvariants() : [])];
    // 0.14.2 P1: bezpiecznik ceny — kurs > 100× wartości godziwej albo C/Z > 1000.
    for (const stock of stocks) {
        if (stock.isBankrupt || stock.assetType === 'Startup') continue;
        const fair = typeof getDisplayedFairValue === 'function' ? getDisplayedFairValue(stock) : null;
        const pe = Number(stock.fundamentals?.peRatio);
        // 0.14.2 P9: spółka z ujemnym kapitałem czeka na upadłość (wartość godziwa bez znaczenia); C/Z > 1000 przy cenie
        // bliskiej wartości z kapitału (zysk ≈ 0, kotwica księgowa) nie jest błędem wyceny.
        const insolvent = stock.balanceSheet && (Number(stock.balanceSheet.assets) || 0) - (Number(stock.balanceSheet.liabilities) || 0) <= 0;
        if (fair > 0 && stock.price > fair * 100 && !insolvent) moneyWarnings.push(`cena ${stock.symbol} ${Math.round(stock.price)} > 100× wartości godziwej (${fair.toFixed(2)})`);
        else if (pe > 1000 && !(fair > 0 && stock.price <= fair * 10)) moneyWarnings.push(`C/Z ${stock.symbol}: ${Math.round(pe)}`); // cena 3–10× po spadku zysku: chwilowe opóźnienie kursu
    }
    problems.warnings = (typeof ghostTrimLog !== 'undefined' ? ghostTrimLog : []).map(t =>
        `przycięcie ${t.symbol}: ${t.holder} −${Math.round(t.shares)} akcji (kwartał ${t.quarter}, ${t.source === 'load' ? 'wczytanie' : 'gra'})`).concat(moneyWarnings);
    return problems;
}

function debugCheckInvariants() {
    const problems = checkWorldInvariants();
    const warnings = problems.warnings || [];
    const note = warnings.length ? `, przycięcia: ${warnings.length}` : '';
    showToast(problems.length ? `Naruszenia: ${problems.length}${note} (szczegóły w konsoli)` : `Świat gry spójny ✔${note}`, problems.length ? 'error' : warnings.length ? 'warning' : 'success', 6000);
    if (problems.length) console.warn('[niezmienniki]', problems);
    if (warnings.length) console.warn('[niezmienniki: przycięcia]', warnings);
    return problems;
}

document.addEventListener('DOMContentLoaded', applyDebugModeUi);

// =================================================================================
// KARIERA I KORPORACJA (etap C)
// =================================================================================

let corporationTab = 'firm';

function renderCareerPanel() {
    const container = document.getElementById('fund-career-panel');
    if (!container || !corporation) return;

    const periodsDone = playerFund.periods.length;
    const inCycle = periodsDone % BOARD_REVIEW_EVERY_PERIODS;
    const reviewProgress = (inCycle + playerFund.current.elapsedMs / FUND_PERIOD_MS) / BOARD_REVIEW_EVERY_PERIODS;
    const takeovers = getTakeoverProgress();
    const score = corporation.lastPlayerScore;

    container.innerHTML = `
        <div class="career-panel">
            <div class="career-row"><span>Stanowisko</span><strong>${escapeHtml(getPlayerPosition().name)}</strong></div>
            <div class="career-row"><span>Ocena zarządu za</span><span>${BOARD_REVIEW_EVERY_PERIODS - inCycle} okr.${score !== null ? ` (ostatnio ${Math.round(score)}/100)` : ''}</span></div>
            <div class="career-progress" title="Do następnej oceny zarządu"><span style="width:${Math.min(100, reviewProgress * 100).toFixed(0)}%"></span></div>
            ${corporation.playerWeakReviews > 0 ? `<div class="loss">⚠️ Słabe oceny z rzędu: ${corporation.playerWeakReviews}/2</div>` : ''}
            <div class="career-row"><span>Budżet korporacji</span><span>${formatZl(corporation.budget, 0)}</span></div>
            <div class="career-row"><span>Cel: przejęcia</span><span>${takeovers.done}/${takeovers.required}</span></div>
            ${corporation.victory ? `<div class="profit">👑 Zwycięstwo: ${corporation.victory.type === 'ceo' ? 'CEO' : 'dominacja'}</div>` : ''}
            <button class="btn-secondary" onclick="openCorporationModal()">🏢 Korporacja</button>
        </div>`;
}

function openCorporationModal(tab = corporationTab) {
    if (!corporation) return;
    document.getElementById('corporation-overlay').hidden = false;
    setCorporationTab(tab);
}

function closeCorporationModal() {
    document.getElementById('corporation-overlay').hidden = true;
}

function setCorporationTab(tab) {
    corporationTab = tab;
    document.querySelectorAll('.corp-tabs button').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
    const title = document.getElementById('corporation-title');
    if (title) title.textContent = `🏢 ${corporation.name}`;
    renderCorporationBody();
}

/** Akcja z okna korporacji: wykonaj i odśwież widoki. */
function corporationAction(fn, ...args) {
    fn(...args);
    refreshFundViews();
    renderCorporationBody();
}

function renderCorporationBody() {
    const body = document.getElementById('corporation-body');
    if (!body || !corporation) return;
    const renderers = { firm: renderCorporationFirm, board: renderCorporationBoard, analysts: renderCorporationAnalysts, cooperation: renderCorporationCooperation, takeovers: renderCorporationTakeovers };
    body.innerHTML = (renderers[corporationTab] || renderCorporationFirm)();
}

function renderCorporationBoard() {
    const lastReview = corporation.reviews[corporation.reviews.length - 1];
    const people = [
        { name: playerProfile.name, positionId: playerProfile.positionId, mine: true, score: lastReview?.results.find(r => r.isPlayer)?.score },
        ...corporation.managers.map(manager => ({
            name: manager.name, positionId: manager.positionId, manager,
            personality: MANAGER_PERSONALITIES[manager.personality].label,
            score: lastReview?.results.find(r => !r.isPlayer && r.name === manager.name)?.score
        }))
    ].sort((a, b) => getPositionIndex(b.positionId) - getPositionIndex(a.positionId));

    const supervise = canSuperviseFunds();
    const positionName = id => CAREER_POSITIONS[getPositionIndex(id)].name;

    return `
        <p class="fund-muted">Ocena zarządu co ${BOARD_REVIEW_EVERY_PERIODS} okresy: nadwyżka nad GIG, stabilność, zaufanie klientów, miejsce w rankingu, compliance.
        Awans od ${PROMOTION_SCORE} pkt (przy braku miejsca — zamiana z najsłabszym na wyższym stanowisku), 2 oceny poniżej ${WEAK_SCORE} z rzędu = degradacja.
        Limity: CEO 1, zarząd 3, kierownicy projektu 2. Twoja reputacja w zarządzie: ${corporation.boardReputation.toFixed(0)}/100.</p>
        <table class="asset-mini-table">
            <thead><tr><th>Osoba</th><th>Stanowisko</th><th>Styl</th><th>Ostatnia ocena</th><th></th></tr></thead>
            <tbody>${people.map(person => {
                const supervised = person.manager && corporation.supervisedManagerId === person.manager.id;
                const canTake = supervise && person.manager && getPositionIndex(person.positionId) < getPositionIndex(playerProfile.positionId);
                const action = supervised
                    ? `<button onclick="corporationAction(consolidateSupervisedFund)">🔗 Konsoliduj (głosowanie)</button>`
                    : canTake ? `<button onclick="corporationAction(superviseManagerFund, '${person.manager.id}')">👔 Nadzoruj</button>` : '';
                return `<tr class="${person.mine ? 'mine' : ''}">
                    <td>${escapeHtml(person.name)}${person.mine ? ' (Ty)' : ''}</td>
                    <td>${escapeHtml(positionName(person.positionId))}</td>
                    <td>${escapeHtml(person.personality || '—')}</td>
                    <td>${person.score ?? '—'}</td>
                    <td>${action}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>
        ${supervise ? '' : '<p class="fund-muted">Nadzór nad funduszem innego zarządcy i konsolidacja — od stanowiska Kierownik projektu.</p>'}
        <h4>Historia ocen</h4>
        <ul>${corporation.reviews.slice().reverse().map(review => {
            const me = review.results.find(r => r.isPlayer);
            return `<li>Po okresie ${review.periodNumber}: ${me.score}/100, ${escapeHtml(positionName(me.from))} → ${escapeHtml(positionName(me.to))}</li>`;
        }).join('') || '<li class="fund-muted">Jeszcze nie było oceny.</li>'}</ul>`;
}

function renderCorporationAnalysts() {
    const allowed = canHireAnalysts();
    return `
        <p class="fund-muted">Analitycy (od stanowiska Starszy zarządca) dodają wgląd w oknie akcjonariatu spółki. Zatrudnienie i tygodniowa pensja z portfela prywatnego (${formatZl(playerWallet.cash)}). Gwiazdki = dokładność.</p>
        <div class="corp-cards">${Object.entries(ANALYST_TYPES).map(([type, def]) => {
            const hired = getAnalyst(type);
            return `<article class="corp-card">
                <h4>${escapeHtml(def.label)} ${hired ? '★'.repeat(hired.stars) : ''}</h4>
                <p>${escapeHtml(def.description)}</p>
                <p class="fund-muted">${hired ? `Pensja: ${formatZl(hired.salary)} / tydzień` : `Zatrudnienie: ${formatZl(def.hireCost, 0)}, pensja ok. ${formatZl(def.salary, 0)} / tydzień`}</p>
                ${hired ? '<p class="profit">Zatrudniony</p>' : `<button ${allowed ? '' : 'disabled'} onclick="corporationAction(hireAnalyst, '${type}')">Zatrudnij</button>`}
            </article>`;
        }).join('')}</div>`;
}

function renderCorporationCooperation() {
    const period = playerFund.current.number;
    const companies = stocks.filter(stock => !stock.assetType && !stock.isBankrupt && !stock.isBankStock)
        .sort((a, b) => (Number(b.reputation?.player) || 0) - (Number(a.reputation?.player) || 0))
        .slice(0, 12);

    return `
        <p class="fund-muted">Spotkanie z inwestorem (${formatZl(MEETING_COST, 0)}, raz na okres): szansa zależy od zaufania, wyniku vs GIG i charakteru inwestora — sukces = zakup udziałów.
        Lunch z prezesem (${formatZl(CEO_LUNCH_COST, 0)}) poprawia relacje; przy dobrej opinii spółka z nadwyżką gotówki lokuje część w udziałach funduszu (uwaga na konflikt interesów, gdy fundusz ma &gt;5% jej akcji).</p>
        <h4>Wielcy inwestorzy</h4>
        <div class="corp-cards">${getBigInvestors().map(ai => {
            const met = corporation.lastMeetings[ai.id] === period;
            return `<article class="corp-card">
                <h4>${escapeHtml(ai.name)}</h4>
                <p class="fund-muted">Gotówka: ${formatZl(ai.cash, 0)}</p>
                <button ${met ? 'disabled' : ''} onclick="corporationAction(meetInvestor, '${ai.id}')">${met ? 'Spotkanie odbyte' : '☕ Spotkanie'}</button>
            </article>`;
        }).join('')}</div>
        <h4>Prezesi spółek</h4>
        <table class="asset-mini-table">
            <thead><tr><th>Spółka</th><th>Prezes</th><th>Relacje</th><th>Gotówka</th><th></th></tr></thead>
            <tbody>${companies.map(stock => {
                const met = corporation.lastMeetings[stock.symbol] === period;
                return `<tr>
                    <td>${escapeHtml(stock.symbol)}</td>
                    <td>${escapeHtml(stock.ceo?.name || stock.ceo || '—')}</td>
                    <td>${(Number(stock.reputation?.player) || 0).toFixed(0)}</td>
                    <td>${formatZl(stock.cash || 0, 0)}</td>
                    <td><button ${met ? 'disabled' : ''} onclick="corporationAction(lunchWithCeo, '${stock.symbol}')">🍽️ Lunch</button></td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
}

function renderCorporationTakeovers() {
    const allowed = canProposeTakeovers();
    const progress = getTakeoverProgress();
    return `
        <p class="fund-muted">Fundusze zewnętrzne to firmy zarządzające. Przejęcie proponuje członek zarządu; zarząd głosuje (reputacja, ostatnia ocena), a cena (${(EXTERNAL_FIRM_VALUE_PER_AUM * 100).toFixed(0)}% aktywów) schodzi z budżetu korporacji (${formatZl(corporation.budget, 0)}).
        Proces ma 7 etapów (postęp co kwartał) i może mieć komplikacje. Cel zwycięstwa: przejąć wskazane 🎯 fundusze (${progress.done}/${progress.required}).</p>
        <div class="corp-cards">${getExternalFunds().map(stock => {
            const isTarget = corporation.takeoverTargets.includes(stock.symbol);
            const process = stock.mergerProcess?.type === 'fundTakeover' ? stock.mergerProcess : null;
            const price = getExternalFirmValuation(stock);
            let action;
            if (stock.managedByCorporation) action = '<p class="profit">✅ Przejęty</p>';
            else if (process) action = `<p>Etap ${process.stage}/7 · postęp ${process.progress}%</p>`;
            else action = `<button ${allowed && corporation.budget >= price ? '' : 'disabled'} onclick="corporationAction(proposeFundTakeover, '${stock.symbol}')">🗳️ Wniosek o przejęcie</button>`;
            return `<article class="corp-card ${isTarget ? 'target' : ''} ${stock.managedByCorporation ? 'done' : ''}">
                <h4>${isTarget ? '🎯 ' : ''}${escapeHtml(getExternalFirmName(stock))}</h4>
                <p>Aktywa: ${formatZl(getExternalFundValue(stock) * stock.totalShares, 0)}</p>
                <p>Cena przejęcia: ${formatZl(price, 0)}</p>
                ${action}
            </article>`;
        }).join('')}</div>
        ${allowed ? '' : '<p class="fund-muted">Wnioski o przejęcie — od stanowiska Członek zarządu.</p>'}`;
}

function showVictoryScreen(victory) {
    const overlay = document.getElementById('victory-overlay');
    const body = document.getElementById('victory-body');
    if (!overlay || !body) return;
    body.innerHTML = `
        <p>${victory.type === 'ceo'
            ? `${escapeHtml(playerProfile.name)} zostaje <strong>CEO</strong> ${escapeHtml(corporation.name)}!`
            : `${escapeHtml(corporation.name)} przejmuje wszystkie wskazane fundusze — <strong>dominacja</strong>!`}</p>
        <p>Okresy: ${victory.periods} · aktywa funduszu: ${formatZl(victory.assets, 0)} · przejęcia: ${corporation.acquiredFunds.length}</p>
        <p class="fund-muted">Możesz grać dalej.</p>`;
    overlay.hidden = false;
}

// =================================================================================
// SKRZYNKA MAILOWA (etap E1) — układ jak Gmail
// =================================================================================

let mailView = { folder: 'inbox', selectedId: null, pane: 'mail' }; // pane: mail | subscriptions | media

const MAIL_FOLDER_LABELS = {
    inbox: '📥 Odebrane', starred: '⭐ Oznaczone', corporation: '🏢 Korporacja',
    PULS: '📰 Puls Rynku', FLESZ: '📰 Flesz Giełdowy', OBSER: '📰 Obserwator', spam: '🚫 Spam'
};

function openMailbox(folder = mailView.folder) {
    mailView.folder = folder;
    mailView.pane = 'mail';
    document.getElementById('mail-overlay').hidden = false;
    renderMailbox();
}

function closeMailbox() {
    document.getElementById('mail-overlay').hidden = true;
}

function updateMailBadge() {
    const badge = document.querySelector('#open-mail-btn .nav-badge');
    if (!badge || !mailbox) return;
    const unread = getUnreadMailCount('inbox');
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.hidden = unread === 0;
}

function formatMailTime(clockMs) {
    const totalMinutes = Math.floor((clockMs || 0) / 60000);
    return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

function setMailFolder(folder) {
    mailView = { folder, selectedId: null, pane: 'mail' };
    renderMailbox();
}

function setMailPane(pane) {
    mailView.pane = pane;
    mailView.selectedId = null;
    renderMailbox();
}

function selectMail(id) {
    mailView.selectedId = id;
    markMailRead(id);
    renderMailbox();
}

function mailAction(fn, ...args) {
    fn(...args);
    renderMailbox();
}

function renderMailbox() {
    const overlay = document.getElementById('mail-overlay');
    updateMailBadge();
    if (!overlay || overlay.hidden || !mailbox) return;

    const folders = document.getElementById('mail-folders');
    folders.innerHTML = MAIL_FOLDERS.map(folder => {
        const unread = getUnreadMailCount(folder);
        const active = mailView.pane === 'mail' && mailView.folder === folder;
        return `<button class="mail-folder ${active ? 'active' : ''}" onclick="setMailFolder('${folder}')">
            <span>${MAIL_FOLDER_LABELS[folder]}</span>${unread ? `<b>${unread}</b>` : ''}</button>`;
    }).join('') + `
        <hr>
        <button class="mail-folder ${mailView.pane === 'subscriptions' ? 'active' : ''}" onclick="setMailPane('subscriptions')">⚙️ Subskrypcje</button>`;

    const list = document.getElementById('mail-list');
    const preview = document.getElementById('mail-preview');

    if (mailView.pane === 'subscriptions') {
        list.hidden = true;
        preview.innerHTML = renderMailSubscriptions();
        return;
    }

    list.hidden = false;
    const messages = getMailInFolder(mailView.folder);
    list.innerHTML = `
        <div class="mail-list-toolbar">
            <strong>${MAIL_FOLDER_LABELS[mailView.folder]}</strong>
            <button class="btn-secondary" onclick="mailAction(markAllMailRead, '${mailView.folder}')">Oznacz wszystkie jako przeczytane</button>
        </div>
        ${messages.length ? messages.slice(0, 80).map(message => `
            <div class="mail-row ${message.read ? '' : 'unread'} ${message.id === mailView.selectedId ? 'selected' : ''}" role="button" tabindex="0" aria-current="${message.id === mailView.selectedId ? 'true' : 'false'}" onclick="selectMail(${message.id})">
                <button class="mail-star ${message.starred ? 'on' : ''}" onclick="event.stopPropagation(); mailAction(toggleMailStar, ${message.id})" aria-label="Gwiazdka">${message.starred ? '★' : '☆'}</button>
                <span class="mail-from">${escapeHtml(getMailSenderName(message.sender))}</span>
                <span class="mail-subject">${message.importance >= 3 ? '❗ ' : ''}${message.isSpam ? '<span class="mail-tag">Reklama</span> ' : ''}${escapeHtml(message.subject)}
                    <span class="mail-snippet"> — ${escapeHtml(message.body.slice(0, 80))}</span></span>
                <span class="mail-time">${formatMailTime(message.at)}</span>
            </div>`).join('') : '<p class="fund-muted mail-empty">Brak wiadomości w tym folderze.</p>'}`;

    const selected = mailbox.messages.find(m => m.id === mailView.selectedId);
    preview.innerHTML = selected ? renderMailPreview(selected) : '<p class="fund-muted mail-empty">Wybierz wiadomość z listy.</p>';
}

function renderMailPreview(message) {
    let action = '';
    if (message.action?.type === 'botBlock') {
        const offer = botRelations.blockOffer?.symbol === message.action.symbol ? botRelations.blockOffer : null;
        action = offer
            ? `<div class="mail-action"><p>${offer.shares.toLocaleString('pl-PL')} akcji po ${formatZl(offer.price)} · razem ${formatZl(offer.shares * offer.price, 0)}</p><button onclick="mailAction(acceptBotBlock)">Kup pakiet z rabatem</button></div>`
            : '<p class="fund-muted">Oferta pakietu wygasła.</p>';
    } else if (message.action?.type === 'spinoff') { // 0.14 T4: decyzja większościowca o wydzieleniu
        const stock = stocks.find(s => s.symbol === message.action.symbol);
        action = stock && !stock.spinoff && typeof canAnnounceSpinoff === 'function' && canAnnounceSpinoff(stock) && isPlayerSpinoffMajority(stock)
            ? `<div class="mail-action"><button onclick="mailAction(playerSpinoffDecision, '${stock.symbol}', 'now')">✂️ Zleć zapowiedź teraz</button> <button class="btn-secondary" onclick="mailAction(playerSpinoffDecision, '${stock.symbol}', 'block')">✋ Zablokuj na rok</button><p class="text-xs text-muted">Bez decyzji — decyduje prezes.</p></div>`
            : '<p class="fund-muted">Decyzja nie jest już aktualna.</p>';
    } else if (message.action?.type === 'tender') { // 0.14 T6: wezwanie po sprzedaży pakietu kontrolnego
        const stock = stocks.find(s => s.symbol === message.action.symbol);
        action = stock?.tender && getPlayerStakePct(stock) > 0
            ? `<div class="mail-action"><button onclick="mailAction(playerTenderDecision, '${stock.symbol}', 'sell')">Sprzedaj po ${formatZl(stock.tender.price)}</button> <button class="btn-secondary" onclick="mailAction(playerTenderDecision, '${stock.symbol}', 'stay')">Zostaję</button></div>`
            : '<p class="fund-muted">Wezwanie już się zakończyło.</p>';
    } else if (message.action?.type === 'bankBlock') { // 0.14.2 P5: pakiet od banku inwestycyjnego
        const bank = commercialBanks.find(b => b.id === message.action.bankId);
        const offer = bank?.resaleOffer?.symbol === message.action.symbol ? bank.resaleOffer : null;
        action = offer && (bank.stockPortfolio?.[offer.symbol]?.shares || 0) >= offer.shares
            ? `<div class="mail-action"><p>${offer.shares.toLocaleString('pl-PL')} akcji po ${formatZl(offer.price)} · razem ${formatZl(offer.shares * offer.price, 0)}</p><button onclick="mailAction(acceptBankBlockOffer, '${bank.id}')">Odkup pakiet</button></div>`
            : '<p class="fund-muted">Oferta pakietu wygasła.</p>';
    } else if (message.action?.type === 'agm') {
        action = `<div class="mail-action"><button onclick="openGovernanceModal('${message.action.symbol}')">Otwórz walne zgromadzenie</button></div>`;
    } else if (message.action?.type === 'takeover') {
        action = `<div class="mail-action"><button onclick="openTakeoverModal('${message.action.symbol}')">Otwórz decyzję w sprawie przejęcia</button></div>`;
    } else if (message.action?.type === 'rescue') {
        action = getRescueOffer(message.action.symbol) // 0.14.2 P2: oferta tej spółki, nie „bieżąca”
            ? `<div class="mail-action"><button onclick="openRescueOfferingModal('${message.action.symbol}')">Otwórz ofertę emisji</button></div>`
            : '<p class="fund-muted">Ta emisja jest już zamknięta.</p>';
    }
    if (message.action?.type === 'unionDemand') {
        const stock = stocks.find(s => s.symbol === message.action.symbol);
        const pending = stock?.workforce?.pendingDemand;
        action = pending
            ? `<div class="mail-action">${pending.choice ? `<p>Wybrano: <strong>${{ agree: 'zgoda', negotiate: 'negocjacje', refuse: 'odmowa' }[pending.choice]}</strong> — możesz zmienić do końca kwartału.</p>` : ''}<button onclick="mailAction(respondUnionDemand, '${stock.symbol}', 'agree')">Zgoda</button> <button class="btn-secondary" onclick="mailAction(respondUnionDemand, '${stock.symbol}', 'negotiate')">Negocjacje</button> <button class="btn-danger" onclick="mailAction(respondUnionDemand, '${stock.symbol}', 'refuse')">Odmowa</button></div>`
            : '<p class="fund-muted">Sprawa została już rozstrzygnięta.</p>';
    }
    if (message.action?.type === 'strategyDecision') { // 0.14 T3.6: plan prezesa w spółce kontrolowanej przez fundusz
        const stock = stocks.find(s => s.symbol === message.action.symbol);
        const pending = stock?.strategy?.pendingProposal;
        action = pending
            ? `<div class="mail-action">${pending.choice ? `<p>Wybrano: <strong>${pending.choice === 'approve' ? 'zatwierdzenie' : 'blokada'}</strong> — możesz zmienić do końca kwartału.</p>` : ''}<button onclick="mailAction(respondStrategyProposal, '${stock.symbol}', 'approve')">Zatwierdź</button> <button class="btn-danger" onclick="mailAction(respondStrategyProposal, '${stock.symbol}', 'block')">Zablokuj</button></div>`
            : '<p class="fund-muted">Decyzja została już podjęta.</p>';
    }
    if (message.action?.type === 'pppRestructure') {
        const stake = (playerFund?.ppp || []).find(item => item.id === message.action.stakeId);
        action = stake?.restructure === 'pending'
            ? `<div class="mail-action"><button onclick="mailAction(respondPppRestructure, '${stake.id}', true)">Zgódź się</button> <button class="btn-secondary" onclick="mailAction(respondPppRestructure, '${stake.id}', false)">Odmów</button></div>`
            : '<p class="fund-muted">Decyzja w sprawie restrukturyzacji została podjęta.</p>';
    }
    if (message.action?.type === 'privatization') {
        const offer = privatizationOffer?.symbol === message.action.symbol ? privatizationOffer : null;
        action = offer
            ? `<div class="mail-action">
                   <p>Cena: <strong>${formatZl(offer.price)}</strong> · dostępne: ${offer.remaining.toLocaleString('pl-PL')} akcji · limit funduszu: ${(Math.floor(offer.shares * offer.maxFundShare) - offer.fundShares).toLocaleString('pl-PL')}</p>
                   <input type="text" inputmode="numeric" id="privatization-qty" value="10" aria-label="Liczba akcji">
                   <button onclick="mailAction(subscribePrivatization, parseInt(document.getElementById('privatization-qty').value, 10))">Zapisz fundusz</button>
               </div>`
            : '<p class="fund-muted">Zapisy na tę ofertę są zamknięte.</p>';
    }
    return `
        <article class="mail-message">
            <h3>${escapeHtml(message.subject)}</h3>
            <p class="fund-muted">Od: ${escapeHtml(getMailSenderName(message.sender))} · ${formatMailTime(message.at)}${message.isSpam ? ' · reklama' : ''}</p>
            <p>${escapeHtml(message.body)}</p>
            ${action}
            <div class="mail-message-actions">
                ${message.symbol ? `<button onclick="openStockDetailsModal('${message.symbol}')">Pokaż spółkę</button>` : ''}
                <button onclick="mailAction(toggleMailStar, ${message.id})">${message.starred ? '★ Usuń gwiazdkę' : '☆ Oznacz gwiazdką'}</button>
                <button onclick="mailAction(markMailRead, ${message.id}, false)">Oznacz jako nieprzeczytane</button>
                <button onclick="mailView.selectedId = null; mailAction(deleteMail, ${message.id})">🗑️ Usuń</button>
            </div>
        </article>`;
}

function renderMailSubscriptions() {
    const filter = getSkillLevel('adblock');
    return `
        <h3>Subskrypcje czasopism</h3>
        <p class="fund-muted">Wersja darmowa przysyła wszystkie wiadomości czasopisma razem z jego spamem. Premium (płatne co tydzień z portfela prywatnego: ${formatZl(playerWallet.cash)}) — tylko ważne wiadomości, bez spamu. Każde czasopismo to spółka z giełdy.</p>
        <table class="asset-mini-table">
            <thead><tr><th>Czasopismo</th><th>Profil</th><th>Premium / tydz.</th><th>Subskrypcja</th></tr></thead>
            <tbody>${Object.entries(MAGAZINES).map(([symbol, def]) => {
                const current = mailbox.subscriptions[symbol];
                const option = (level, label) => `<button class="${current === level ? 'active' : ''}" onclick="mailAction(setMagazineSubscription, '${symbol}', ${level ? `'${level}'` : 'null'})">${label}</button>`;
                return `<tr>
                    <td>${escapeHtml(def.label)}</td>
                    <td>${escapeHtml(def.profile)}</td>
                    <td>${formatZl(def.premiumWeekly, 0)}</td>
                    <td class="mail-sub-options">${option('free', 'Darmowa')}${option('premium', 'Premium')}${option(null, 'Wyłącz')}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>
        <p class="fund-muted">Filtr antyspamowy (szkolenie w CV): poziom ${filter}/2 — ${filter >= 2 ? 'reklamy i spam czasopism trafiają do folderu Spam' : filter >= 1 ? 'reklamy spółek trafiają do folderu Spam' : 'spam trafia do skrzynki odbiorczej'}.</p>`;
}

// =================================================================================
// MIASTO: KAMPANIA WYBORCZA (etap E1)
// =================================================================================

function renderCityElection() {
    const container = document.getElementById('city-content-election');
    if (!container || container.contains(document.activeElement)) return; // nie przerywaj wpisywania kwoty
    if (!city.election) {
        const last = city.lastElection;
        container.innerHTML = last
            ? `<h4>Ostatnie wybory</h4><ul>${last.map(r => `<li>${escapeHtml(r.name)} (${escapeHtml(MAYOR_POLICIES[r.policy].label)}): ${(r.share * 100).toFixed(0)}%</li>`).join('')}</ul>`
            : '<p class="fund-muted">Kampania rusza na rok przed wyborami.</p>';
        return;
    }
    container.innerHTML = `
        <h4>Kampania wyborcza — wybory za ${city.mayor.electionYear} ${city.mayor.electionYear === 1 ? 'rok' : 'lata'}</h4>
        <p class="fund-muted">Darowizny z portfela prywatnego (${formatZl(playerWallet.cash)}) zwiększają szanse kandydata. Darowizna od ${PLAYER_DONATION_COMPLIANCE_LIMIT} PLN zwraca uwagę compliance. Wygrany pamięta wsparcie.</p>
        <table class="asset-mini-table">
            <thead><tr><th>Kandydat</th><th>Polityka</th><th>Siła kampanii</th><th>Twoje wsparcie</th><th></th></tr></thead>
            <tbody>${city.election.candidates.map(c => `<tr>
                <td>${escapeHtml(c.name)}${c.incumbent ? ' (urzędujący)' : ''}</td>
                <td title="${escapeHtml(MAYOR_POLICIES[c.policy].description)}">${escapeHtml(MAYOR_POLICIES[c.policy].label)}</td>
                <td>${getCandidateScore(c).toFixed(0)}</td>
                <td>${formatZl(c.playerDonations, 0)}</td>
                <td><input type="text" inputmode="numeric" id="campaign-${c.id}" value="100" size="6" aria-label="Kwota darowizny">
                    <button onclick="donateToCampaign('${c.id}', parseFloat(document.getElementById('campaign-${c.id}').value)); updateCityModalContent();">Wesprzyj</button></td>
            </tr>`).join('')}</tbody>
        </table>`;
}

// =================================================================================
// LOMBARD FUNDUSZU (etap E2)
// =================================================================================

function renderPawnPanel() {
    const container = document.getElementById('fund-pawn-panel');
    if (!container || !playerFund || container.contains(document.activeElement)) return; // nie przerywaj wpisywania
    const account = getFundAccount();
    const pawnShop = getPawnShop();
    const holdings = Object.entries(playerPortfolio)
        .filter(([, h]) => (h.assetType === 'stock' || !h.assetType) && h.shares - (h.lockedShares || 0) > 0);

    container.innerHTML = `
        <p class="fund-muted">Zastaw do ${(PAWN_MAX_SHARE_OF_ASSETS * 100).toFixed(0)}% aktywów funduszu, ${(PAWN_LOAN_TO_VALUE * 100).toFixed(0)}% wartości akcji, ${(PAWN_ANNUAL_RATE * 100).toFixed(0)}% rocznie, ${PAWN_WEEKS} tygodni.
        Każdy zastaw obniża zaufanie klientów i zwiększa ryzyko compliance. ${COLLECTOR_AFTER_MISSED} niezapłacone odsetki = windykator zajmuje akcje.</p>
        <div class="career-row"><span>Zadłużenie / limit</span><span>${formatZl(getPawnOutstanding(account), 0)} / ${formatZl(getPawnOutstanding(account) + getPawnCapacity(account), 0)}</span></div>
        ${account.loans.map(loan => `
            <div class="career-row">
                <span>${escapeHtml(loan.symbol)} × ${loan.shares} · ${formatZl(loan.principal, 0)} · ${loan.weeksLeft} tyg.${loan.missed ? ` · <span class="loss">zaległość ${loan.missed}</span>` : ''}</span>
                <button onclick="repayFundPawn('${loan.id}')">Spłać</button>
            </div>`).join('')}
        ${pawnShop && holdings.length ? `
            <div class="fund-emission">
                <select id="pawn-symbol" aria-label="Akcje do zastawu">${holdings.map(([symbol, h]) => `<option value="${symbol}">${symbol} (wolne: ${h.shares - (h.lockedShares || 0)})</option>`).join('')}</select>
                <input type="text" inputmode="numeric" id="pawn-qty" value="10" aria-label="Liczba akcji">
                <button class="btn-secondary" onclick="pawnFundShares(document.getElementById('pawn-symbol').value, parseInt(document.getElementById('pawn-qty').value, 10))">Zastaw</button>
            </div>` : `<p class="fund-muted">${pawnShop ? 'Brak wolnych akcji do zastawu.' : 'Lombard jest nieczynny.'}</p>`}`;
}

/** Okno lombardu: warunki, zastawy funduszu gracza i zapas przejętych akcji. */
function openPawnShopPanel() {
    const modal = document.getElementById('pawnshop-modal');
    const body = document.getElementById('pawnshop-body');
    if (!modal || !body) return;
    const pawnShop = getPawnShop();
    const holdings = shop => Object.entries(shop?.holdingPortfolio || {})
        .map(([symbol, item]) => `<li>${item.quantity} × ${escapeHtml(symbol)} (przejęte po ${formatZl(item.purchasePrice)})</li>`).join('');

    body.innerHTML = pawnShop ? `
        <p><strong>${escapeHtml(pawnShop.name)}</strong> (${escapeHtml(pawnShop.symbol)}) · gotówka ${formatZl(pawnShop.cash, 0)}</p>
        <p class="fund-muted">Pożyczki pod zastaw akcji dla funduszy: ${(PAWN_LOAN_TO_VALUE * 100).toFixed(0)}% wartości, ${(PAWN_ANNUAL_RATE * 100).toFixed(0)}% rocznie, ${PAWN_WEEKS} tygodni, do ${(PAWN_MAX_SHARE_OF_ASSETS * 100).toFixed(0)}% aktywów funduszu. Zastaw ustawisz w panelu funduszu (sekcja „Lombard”).</p>
        <h4>Zastawy Twojego funduszu</h4>
        <ul>${(playerFund?.pawnLoans || []).map(loan => `<li>${loan.shares} × ${escapeHtml(loan.symbol)}: ${formatZl(loan.principal)} · ${loan.weeksLeft} tyg.${loan.missed ? ` · zaległość ${loan.missed}` : ''}</li>`).join('') || '<li class="fund-muted">Brak.</li>'}</ul>
        <h4>Akcje przejęte przez lombard</h4>
        <ul>${holdings(pawnShop) || '<li class="fund-muted">Brak.</li>'}</ul>`
        : '<p class="loss">Lombard nie jest dostępny.</p>';
    modal.style.display = 'block';
}

/** Okno windykatora: zasady i akcje zajęte dłużnikom (fundusze, boty). */
function openDebtCollectorPanel() {
    const modal = document.getElementById('debtcollector-modal');
    const body = document.getElementById('debtcollector-body');
    if (!modal || !body) return;
    const collector = getDebtCollector();
    const seized = Object.entries(collector?.holdingPortfolio || {})
        .map(([symbol, item]) => `<li>${item.quantity} × ${escapeHtml(symbol)}</li>`).join('');
    const botDebts = aiCompetitors.reduce((sum, ai) => sum + (ai.loans || []).filter(loan => (loan.missedPayments || 0) > 0).length, 0);

    body.innerHTML = collector ? `
        <p><strong>${escapeHtml(collector.name)}</strong> (${escapeHtml(collector.symbol)}) · gotówka ${formatZl(collector.cash, 0)}</p>
        <p class="fund-muted">Windykator przejmuje zaległe długi (kredyty botów z zaległościami, niespłacone zastawy funduszy po ${COLLECTOR_AFTER_MISSED} nieopłaconych odsetkach) i zajmuje akcje dłużników z dyskontem ${(100 - COLLECTOR_DISCOUNT * 100).toFixed(0)}%.</p>
        <p>Kredyty botów z zaległościami: <strong>${botDebts}</strong></p>
        <h4>Zajęte akcje</h4>
        <ul>${seized || '<li class="fund-muted">Brak.</li>'}</ul>`
        : '<p class="loss">Windykator nie jest dostępny.</p>';
    modal.style.display = 'block';
}

// =================================================================================
// CENTRUM BANKOWE (okno banku): wskaźniki, zakładki, banki komercyjne, lokaty funduszu
// =================================================================================

const BANK_TYPE_STYLES = {
    INVESTMENT: 'invest', CORPORATE: 'corporate', UNIVERSAL: 'universal', INTERNATIONAL: 'international',
    COOPERATIVE: 'cooperative', INTERNET: 'internet', MORTGAGE: 'mortgage'
};

function getBankTypeClass(type) {
    const key = Object.keys(BANK_TYPES).find(name => BANK_TYPES[name] === type);
    return `bank-type-${BANK_TYPE_STYLES[key] || 'other'}`;
}

/** Pasek wskaźników na górze okna banku. */
function renderBankTicker() {
    const ticker = document.getElementById('bank-ticker');
    if (!ticker) return;
    const pct = value => `${(value * 100).toFixed(2)}%`;
    const items = [
        ['Stopa bazowa BC', pct(centralBank.baseInterestRate || 0)],
        ['Kredyt (rynek)', pct(getLoanRate())],
        ['Depozyt (rynek)', pct(getDepositRate())],
        ['Gotówka funduszu', formatZl(playerCash, 0)],
        ['Lokaty funduszu', formatZl(getFundDepositsValue(), 0)],
        ['Obligacje funduszu', formatZl(getFundBondsValue(), 0)]
    ];
    ticker.innerHTML = items.map(([label, value]) => `<div class="bank-ticker-item"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function switchBankTab(tabName) {
    const modal = document.getElementById('bank-modal');
    if (!modal) return;
    modal.querySelectorAll('.bank-tab-content').forEach(content => { content.style.display = 'none'; });
    document.getElementById(`bank-content-${tabName}`).style.display = 'block';
    modal.querySelectorAll('.bank-tab-btn').forEach(button => button.classList.toggle('active', button.id === `tab-btn-${tabName}`));
    renderBankTicker();
    if (tabName === 'bonds') renderBondMarketInBank();
    else if (tabName === 'commercial') renderCommercialBanksList();
}

function renderFundDeposits() {
    const container = document.getElementById('fund-deposits-list');
    if (!container) return;
    const deposits = getFundDeposits();
    container.innerHTML = deposits.length ? deposits.map(deposit => `
        <div class="bank-deposit">
            <div class="bank-deposit-info">
                <strong>${escapeHtml(deposit.bankName)}</strong>
                <span class="text-muted text-sm">${deposit.termWeeks} tyg. · ${(deposit.rate * 100).toFixed(2)}% rocznie · zostało ${deposit.weeksLeft} tyg.</span>
            </div>
            <div class="bank-deposit-amount">${formatZl(deposit.principal)} <span class="text-up text-sm">+${formatZl(deposit.accrued)}</span></div>
            <div class="bank-deposit-progress"><span style="width:${(100 * (1 - deposit.weeksLeft / deposit.termWeeks)).toFixed(0)}%"></span></div>
            <button class="btn-secondary text-sm" onclick="breakFundDeposit('${deposit.id}'); renderFundDeposits(); renderBankTicker();">Zerwij</button>
        </div>`).join('') : '<p class="text-muted">Fundusz nie ma lokat. Wybierz bank poniżej.</p>';
}

/** Karty banków: typ, oprocentowanie, lokata funduszu, sprzedaż akcji (bank inwestycyjny). */
function renderCommercialBanksList() {
    renderFundDeposits();
    const list = document.getElementById('commercial-banks-list');
    if (!list) return;
    const banks = commercialBanks.filter(bank => bank.isActive);
    if (!banks.length) { list.innerHTML = '<p class="text-muted">Na rynku nie działa żaden bank komercyjny.</p>'; return; }

    list.innerHTML = banks.map(bank => {
        const loanRate = (getLoanRate() + (Number(bank.baseInterestRateMargin) || 0)) * 100;
        const terms = FUND_DEPOSIT_TERMS.map(term => `<option value="${term.weeks}">${term.label} · ${(getFundDepositRate(bank, term.weeks) * 100).toFixed(2)}%</option>`).join('');
        const deposit = canBankTakeFundDeposits(bank) ? `
            <div class="bank-card-form">
                <select id="deposit-term-${bank.id}" aria-label="Okres lokaty">${terms}</select>
                <input type="text" inputmode="numeric" id="deposit-amount-${bank.id}" value="${Math.max(FUND_DEPOSIT_MIN, Math.floor(playerCash * 0.1))}" aria-label="Kwota lokaty">
                <button onclick="openFundDeposit('${bank.id}', parseFloat(document.getElementById('deposit-amount-${bank.id}').value), parseInt(document.getElementById('deposit-term-${bank.id}').value, 10)); renderCommercialBanksList(); renderBankTicker();">Załóż lokatę</button>
            </div>` : '<p class="text-muted text-sm">Bank nie przyjmuje lokat funduszy.</p>';

        let sales = '';
        if (bank.type === BANK_TYPES.INVESTMENT && bank.stockPortfolio) {
            const offers = Object.entries(bank.stockPortfolio).filter(([, holding]) => holding.shares > 0).map(([symbol, holding]) => {
                const stock = stocks.find(s => s.symbol === symbol);
                return stock ? `<li><span>${escapeHtml(symbol)} · ${holding.shares} szt. · ${formatZl(stock.price * 1.10)}</span>
                    <span class="bank-card-form"><input type="text" inputmode="numeric" id="buy-from-bank-${bank.id}-${symbol}" value="1" aria-label="Liczba akcji">
                    <button onclick="buySharesFromInvestmentBank('${bank.id}', '${symbol}')">Kup</button></span></li>` : '';
            }).join('');
            sales = `<div class="bank-card-sales"><h5>Akcje na sprzedaż (+10% do kursu)</h5>${offers ? `<ul class="list-plain">${offers}</ul>` : '<p class="text-muted text-sm">Brak ofert.</p>'}
                <button class="btn-secondary text-sm" onclick="openSellSharesToBankModal('${bank.id}')">Sprzedaj akcje bankowi</button></div>`;
        }

        return `<article class="bank-card ${getBankTypeClass(bank.type)}">
            <header class="bank-card-head">
                <span class="bank-card-icon" aria-hidden="true">🏦</span>
                <div><h4>${escapeHtml(bank.name)}</h4><span class="bank-card-type">${escapeHtml(bank.type)}</span></div>
            </header>
            <dl class="bank-card-rates">
                <div><dt>Kredyt</dt><dd>${loanRate.toFixed(2)}%</dd></div>
                <div><dt>Lokata 16 tyg.</dt><dd>${canBankTakeFundDeposits(bank) ? (getFundDepositRate(bank, 16) * 100).toFixed(2) + '%' : '—'}</dd></div>
                <div><dt>Kapitał</dt><dd>${formatZl(bank.cash, 0)}</dd></div>
            </dl>
            ${typeof renderParabankExtras === 'function' ? renderParabankExtras(bank) : ''}
            ${deposit}
            ${sales}
        </article>`;
    }).join('');
}

// =================================================================================
// KLIENCI I RYNEK JU (okno obserwacji — gracz nie handluje)
// =================================================================================

let juView = { filter: 'all', clientId: null };

function openJuMarket() {
    document.getElementById('clients-modal').style.display = 'block';
    renderJuMarket();
}

function setJuClientFilter(filter) {
    juView.filter = filter;
    juView.clientId = null;
    renderJuMarket();
}

function showJuClient(id) {
    juView.clientId = juView.clientId === id ? null : id;
    renderJuMarket();
}

function formatPremium(value) {
    const pct = (value || 0) * 100;
    return `<span class="${pct > 0.05 ? 'text-up' : pct < -0.05 ? 'text-down' : 'text-muted'}">${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%</span>`;
}

/** B4: opłata za zarządzanie i kampania marketingowa (pod paskiem rynku JU). */
function renderJuDecisions() {
    const ticker = document.getElementById('ju-ticker');
    if (!ticker || !playerFund) return;
    let box = document.getElementById('ju-decisions');
    if (!box) { box = document.createElement('div'); box.id = 'ju-decisions'; box.className = 'bank-grid mt-3'; ticker.after(box); }
    if (box.contains(document.activeElement)) return;
    const campaign = playerFund.campaign;
    box.innerHTML = `
        <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">💼</span><div><h4>Opłata za zarządzanie</h4><span class="bank-card-type">teraz ${(getPlayerFeeRate() * 100).toFixed(2)}% rocznie · standard ${(MANAGEMENT_FEE_ANNUAL * 100).toFixed(1)}%</span></div></header>
            <p class="text-sm">Niższa opłata przyciąga klientów (zwłaszcza skner), wyższa zasila budżet korporacji i Twój udział, ale klienci wrażliwi na koszty odchodzą. Zmiana raz na kwartał.</p>
            <div class="bank-card-form"><input type="text" inputmode="decimal" id="fee-rate-input" value="${(getPlayerFeeRate() * 100).toFixed(2)}" aria-label="Opłata w % rocznie">
            <button onclick="setPlayerFeeRate(parseFloat(document.getElementById('fee-rate-input').value.replace(',', '.'))); renderJuMarket();">Ustaw (0,5–3%)</button></div></article>
        <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">📣</span><div><h4>Kampania marketingowa</h4><span class="bank-card-type">koszt ${formatZl(getMarketingCost(), 0)} z budżetu korporacji · ${MARKETING_WEEKS} tyg.</span></div></header>
            ${campaign?.weeksLeft > 0 ? `<p class="text-sm">Trwa: ${MARKETING_TARGETS[campaign.target].icon} ${MARKETING_TARGETS[campaign.target].label}, zostało ${campaign.weeksLeft} tyg.</p>`
                : `<p class="text-sm">Dodatkowi kupujący udziały z wybranej grupy klientów. Nowe wpłaty nadal wymagają zaufania ≥ 50.</p>
                <div class="bank-card-form">${Object.entries(MARKETING_TARGETS).map(([id, t]) => `<button class="btn-secondary" onclick="startMarketingCampaign('${id}'); renderJuMarket();">${t.icon} ${t.label}</button>`).join('')}</div>`}</article>`;
}

function renderJuMarket() {
    const modal = document.getElementById('clients-modal');
    if (!modal || modal.style.display !== 'block' || !playerFund) return;

    const funds = getJuMarketFunds();
    const playerStats = juMarket.stats.player?.history[0];
    const weekFlows = playerStats ? playerStats.inflow : 0;
    const best = funds.find(fund => fund.id === juMarket.bestFundId);

    document.getElementById('ju-ticker').innerHTML = [
        ['Klienci funduszu', playerFund.clients.length],
        ['Wpłaty nowych (tydz.)', formatZl(weekFlows, 0)],
        ['Premia do NAV', formatPremium(playerStats?.premium)],
        ['Obrót udziałami (tydz.)', formatNumberPl(playerStats?.volume || 0, 1)],
        ['Tydzień rynku', juMarket.week],
        ['Najlepiej sprzedaje się', best ? escapeHtml(best.name) : '—']
    ].map(([label, value]) => `<div class="bank-ticker-item"><span>${label}</span><strong>${value}</strong></div>`).join('');
    renderJuDecisions();

    // Tabela funduszy rynku wtórnego
    const rows = funds.map(fund => {
        const history = juMarket.stats[fund.id]?.history || [];
        const last = history[0] || {};
        const trend = history.slice(0, 4).reduce((sum, item) => sum + (item.premium || 0), 0) / Math.max(1, Math.min(4, history.length));
        return { fund, last, trend, popularity: getJuPopularity(fund.id, fund.assets) };
    }).sort((a, b) => b.popularity - a.popularity);
    document.getElementById('ju-funds-table').innerHTML = `
        <table class="asset-mini-table ju-table">
            <thead><tr><th>#</th><th>Fundusz</th><th>NAV</th><th>Cena udziału vs NAV</th><th>Trend (4 tyg.)</th><th>Wolumen</th><th>Nowi klienci</th><th>Klienci</th></tr></thead>
            <tbody>${rows.map((row, index) => `
                <tr class="${row.fund.kind === 'player' ? 'mine' : ''} ${row.fund.id === juMarket.bestFundId ? 'ju-best' : ''}">
                    <td>${index + 1}</td>
                    <td>${row.fund.kind === 'player' ? '💼' : row.fund.kind === 'bot' ? '🏢' : '🌐'} ${escapeHtml(row.fund.name)}</td>
                    <td>${row.fund.nav.toFixed(2)}</td>
                    <td>${formatPremium(row.last.premium)}</td>
                    <td>${formatPremium(row.trend)}</td>
                    <td>${(row.last.volume || 0).toFixed(1)}</td>
                    <td>${row.last.newClients || 0}</td>
                    <td>${row.last.clients ?? '—'}</td>
                </tr>`).join('')}</tbody>
        </table>`;

    // Taśma transakcji
    document.getElementById('ju-tape').innerHTML = juMarket.tape.length
        ? juMarket.tape.map(item => `<li class="ju-tape-${item.kind}"><span class="text-muted">t.${item.week}</span> ${escapeHtml(item.text)}</li>`).join('')
        : '<li class="text-muted">Rynek ruszy po pierwszym tygodniu gry.</li>';

    // Klienci funduszu gracza z filtrem po charakterze
    const filters = ['all', ...CLIENT_CHARACTER_KEYS, 'institution', 'investor'];
    document.getElementById('ju-client-filters').innerHTML = filters.map(key => {
        const def = CLIENT_TYPES[key];
        const count = key === 'all' ? playerFund.clients.length : playerFund.clients.filter(client => client.type === key).length;
        if (key !== 'all' && !count) return '';
        return `<button class="${juView.filter === key ? 'active' : ''}" onclick="setJuClientFilter('${key}')">${key === 'all' ? 'Wszyscy' : `${def.icon} ${def.label}`} (${count})</button>`;
    }).join('');

    const nav = getFundNav();
    const clients = playerFund.clients
        .filter(client => juView.filter === 'all' || client.type === juView.filter)
        .sort((a, b) => b.units - a.units);
    document.getElementById('ju-clients').innerHTML = clients.map(client => {
        const def = getClientCharacter(client);
        const gain = client.avgCost > 0 ? nav / client.avgCost - 1 : 0;
        const card = juView.clientId === client.id ? `
            <div class="ju-client-card">
                <p class="fst-italic">„${escapeHtml(client.motive || '')}”</p>
                <p>Średni koszt udziału: ${formatZl(client.avgCost)} · zysk na udziale: ${formatPremium(gain)}${client.loyal ? ' · 💙 lojalny' : ''}${client.pendingSellUnits > 0 ? ` · wystawił ${client.pendingSellUnits.toFixed(1)} JU na rynku wtórnym` : ''}</p>
                <ul class="list-plain text-sm">${(client.history || []).map(item => `<li><span class="text-muted">t.${item.week}</span> ${escapeHtml(item.text)}</li>`).join('') || '<li class="text-muted">Brak historii.</li>'}</ul>
            </div>` : '';
        return `<div class="ju-client ${juView.clientId === client.id ? 'open' : ''}" role="button" tabindex="0" aria-expanded="${juView.clientId === client.id}" onclick="showJuClient(${client.id})">
            <span class="ju-client-icon" title="${escapeHtml(def.label)}">${def.icon}</span>
            <span class="ju-client-name">${escapeHtml(client.name)}<small class="text-muted"> ${escapeHtml(def.label)}</small></span>
            <span class="ju-client-units">${formatNumberPl(client.units, 1)} udz. · ${formatZl(client.units * nav, 0)}</span>
            <span class="ju-satisfaction" title="Zadowolenie"><span style="width:${(client.satisfaction * 100).toFixed(0)}%"></span></span>
        </div>${card}`;
    }).join('') || '<p class="text-muted">Brak klientów w tej grupie.</p>';
}

// =================================================================================
// OKNA PAŃSTWA, MIASTA I BUDOWNICTWA (etap F3): nagłówek, wskaźniki, nowe mechaniki
// =================================================================================

function renderTicker(elementId, items) {
    const ticker = document.getElementById(elementId);
    if (ticker) ticker.innerHTML = items.map(([label, value]) => `<div class="bank-ticker-item"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

// ---------- Państwo ----------
let stateTab = 'overview';

function switchStateTab(tab) {
    stateTab = tab;
    document.querySelectorAll('#state-modal .bank-tab-btn').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
    updateStateModalContent();
}

function updateStateModalContent() {
    const modal = document.getElementById('state-modal');
    if (!modal || modal.style.display !== 'block') return;
    const phase = getEconomyPhaseInfo();
    renderTicker('state-ticker', [
        ['Skarb Państwa', formatZl(governmentTreasury, 0)],
        ['Faza koniunktury', escapeHtml(phase.name || '—')],
        ['Stopa bazowa BC', `${((centralBank.baseInterestRate || 0) * 100).toFixed(2)}%`],
        ['Inflacja', `${(macro.inflation * 100).toFixed(1)}%`],
        ['Rząd', escapeHtml(getRulingParty().name)],
        ['Korupcja', `${(oversight?.corruption || 0).toFixed(0)}/100`],
        ['Spółki państwowe', stocks.filter(s => s.isStateOwned && !s.isBankrupt).length]
    ]);

    const body = document.getElementById('state-body');
    if (!body) return;
    if (stateTab === 'overview') {
        body.innerHTML = `
            <div class="bank-grid">
                <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">⚖️</span><div><h4>Urząd antymonopolowy</h4><span class="bank-card-type">poziom ${antitrustOffice.level}/5</span></div></header>
                    <dl class="bank-card-rates"><div><dt>Szansa analizy</dt><dd>${(antitrustOffice.analysisCapacity * 100).toFixed(0)}%</dd></div><div><dt>Dokładność</dt><dd>${(antitrustOffice.accuracy * 100).toFixed(0)}%</dd></div><div><dt>Monopoliści</dt><dd>${stocks.filter(s => s.isMonopolist).length}</dd></div></dl>
                    <p class="text-sm text-muted">Karze monopolistów i może zablokować skup akcji przez spółkę z Giełdy Diamentowej. Państwo samo inwestuje w rozwój urzędu.</p></article>
                <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">📊</span><div><h4>Koniunktura</h4><span class="bank-card-type">${escapeHtml(phase.name || '')}</span></div></header>
                    <p class="text-sm">${escapeHtml(phase.description || 'Faza cyklu gospodarczego wpływa na wyniki spółek, sektory wrażliwe na cykl i stopy procentowe.')}</p>
                    <p class="text-sm text-muted">Wskaźnik koniunktury: ${Number(economyCycle.index || 0).toFixed(0)}/100 · zmiana PKB w kwartale: ${((economyCycle.gdpGrowth || 0) * 100).toFixed(2)}%.</p></article>
                <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">🏭</span><div><h4>Spółki Skarbu Państwa</h4><span class="bank-card-type">nacjonalizacje i prywatyzacje</span></div></header>
                    <ul class="list-plain text-sm">${stocks.filter(s => s.isStateOwned && !s.isBankrupt).slice(0, 8).map(s => `<li>${escapeHtml(s.name)} — ${((s.stateOwnershipPct || 0) * 100).toFixed(0)}%</li>`).join('') || '<li class="text-muted">Brak.</li>'}</ul></article>
            </div>`;
    } else if (stateTab === 'macro') {
        body.innerHTML = renderMacroPanel();
    } else if (stateTab === 'country') {
        body.innerHTML = renderCountryPanel();
    } else if (stateTab === 'markets') {
        body.innerHTML = renderMarketsPanel();
    } else if (stateTab === 'oversight') {
        body.innerHTML = renderOversightPanel();
    } else if (stateTab === 'taxes') {
        body.innerHTML = `
            <table class="asset-mini-table w-full">
                <thead><tr><th>Podatek</th><th>Stawka</th><th>Kogo dotyczy</th></tr></thead>
                <tbody>
                    <tr><td>Dywidendy</td><td>${(TAX_RATES.dividend * 100).toFixed(0)}%</td><td>inwestorzy prywatni i Twoje konto prywatne; <strong>fundusz zwolniony</strong> (dywidenda podnosi NAV)</td></tr>
                    <tr><td>Zyski kapitałowe</td><td>${(TAX_RATES.capitalGains * 100).toFixed(0)}%</td><td>konto prywatne (z ulgami szkoleń); klienci funduszu płacą przy umorzeniu udziałów</td></tr>
                    <tr><td>CIT spółek</td><td>wg progów</td><td>zysk spółek giełdowych (raport kwartalny)</td></tr>
                    <tr><td>Podatek miejski</td><td>od zysku spółek</td><td>spółki; stawkę zmienia polityka burmistrza (${escapeHtml(MAYOR_POLICIES[city.mayor?.policy]?.label || '—')})</td></tr>
                    <tr><td>Podatek od bogactwa</td><td>progi</td><td>wielcy inwestorzy prywatni (boty); nie dotyczy funduszu</td></tr>
                </tbody>
            </table>`;
    } else if (stateTab === 'pension') {
        const ranking = getPensionRanking().slice(0, 8);
        const last = statePension.history[0];
        body.innerHTML = `
            <p class="bank-lead">Raz w roku gry Skarb Państwa powierza mandaty emerytalne (napływ kapitału) 3 najlepszym funduszom: liczy się wynik vs GIG z 4 okresów i zaufanie klientów. Następny przydział: przy rocznym rozliczeniu (wybory za ${city.mayor?.electionYear ?? '—'} ${city.mayor?.electionYear === 1 ? 'rok' : 'lata'}).</p>
            <table class="asset-mini-table w-full">
                <thead><tr><th>#</th><th>Fundusz</th><th>Ocena kwalifikacji</th><th></th></tr></thead>
                <tbody>${ranking.map((fund, index) => `<tr class="${fund.kind === 'player' ? 'mine' : ''}"><td>${index + 1}</td><td>${escapeHtml(fund.name)}</td><td>${fund.score.toFixed(1)}</td><td>${index < 3 ? '🏅 mandat' : ''}</td></tr>`).join('')}</tbody>
            </table>
            <h4>Ostatni przydział</h4>
            <p class="text-sm">${last ? last.grants.map(g => `${escapeHtml(g.name)}: ${formatZl(g.amount, 0)}`).join(' · ') : 'Jeszcze nie było przydziału.'}</p>`;
    } else {
        const entries = eventLog.filter(entry => entry.category === 'state').slice(0, 15);
        body.innerHTML = `<p class="bank-lead">Rzeczywiste działania państwa w tej grze (z dziennika zdarzeń).</p>
            <ul class="ju-tape list-plain">${entries.map(entry => `<li>${escapeHtml(entry.text)}</li>`).join('') || '<li class="text-muted">Brak działań państwa.</li>'}</ul>`;
    }
}

// ---------- Miasto: PPP ----------
function renderCityPpp() {
    const container = document.getElementById('city-content-ppp');
    if (!container || container.contains(document.activeElement) || !playerFund) return;
    const ppp = ensurePpp();
    container.innerHTML = `
        <p class="bank-lead">Partnerstwo publiczno-prywatne: fundusz współfinansuje inwestycje miasta. Odsetki co tydzień z budżetu miasta, kapitał w terminie. Ryzyko rośnie przy słabym budżecie i niskim poparciu burmistrza. Limit: ${(PPP_FUND_LIMIT * 100).toFixed(0)}% aktywów (wolne: ${formatZl(getFundPppCapacity(), 0)}).</p>
        <h4>Udziały funduszu</h4>
        <div class="bank-deposits">${playerFund.ppp.map(stake => `
            <div class="bank-deposit"><div class="bank-deposit-info"><strong>${stake.icon} ${escapeHtml(stake.name)}</strong><span class="text-muted text-sm">${(stake.rate * 100).toFixed(1)}% rocznie · zostało ${stake.weeksLeft} tyg.${stake.unpaid ? ' · ⚠️ zaległe odsetki' : ''}</span></div>
            <div class="bank-deposit-amount">${formatZl(stake.principal)}</div><span></span>
            <div class="bank-deposit-progress"><span style="width:${(100 * (1 - stake.weeksLeft / stake.termWeeks)).toFixed(0)}%"></span></div></div>`).join('') || '<p class="text-muted">Fundusz nie ma udziałów w projektach miejskich.</p>'}</div>
        <h4>Projekty szukające finansowania</h4>
        <div class="bank-grid">${ppp.offers.map(offer => `
            <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${offer.icon}</span><div><h4>${escapeHtml(offer.name)}</h4><span class="bank-card-type">oferta ważna ${offer.weeksLeft} tyg.</span></div></header>
                <dl class="bank-card-rates"><div><dt>Oprocentowanie</dt><dd>${(offer.rate * 100).toFixed(1)}%</dd></div><div><dt>Okres</dt><dd>${offer.termWeeks} tyg.</dd></div><div><dt>Do zebrania</dt><dd>${formatZl(offer.total - offer.raised, 0)}</dd></div></dl>
                <div class="bank-card-form"><input type="text" inputmode="numeric" id="ppp-amount-${offer.id}" value="${Math.min(offer.total - offer.raised, Math.floor(getFundPppCapacity()))}" aria-label="Kwota udziału">
                <button onclick="investInPpp('${offer.id}', parseFloat(document.getElementById('ppp-amount-${offer.id}').value)); renderCityPpp();">Współfinansuj</button></div>
            </article>`).join('') || '<p class="text-muted">Brak otwartych projektów — miasto ogłasza nowe co kwartał.</p>'}</div>`;
}

// ---------- Budownictwo: finansowanie pomostowe ----------
function renderConstructionFinancing() {
    const container = document.getElementById('construction-financing-body');
    if (!container || !playerFund) return;
    const loans = getFundBridgeLoans();
    container.innerHTML = `
        <p class="bank-lead">Spółki budowlane z budową w toku i niską gotówką proszą fundusz o pożyczkę pomostową. Spłata z odsetkami w terminie; przy braku gotówki jedno przedłużenie o 4 tygodnie, potem częściowa spłata; upadek wykonawcy = odzysk ${(BRIDGE_RECOVERY * 100).toFixed(0)}%. Limit: ${(BRIDGE_FUND_LIMIT * 100).toFixed(0)}% aktywów (wolne: ${formatZl(getFundBridgeCapacity(), 0)}).</p>
        <h4>Pożyczki funduszu</h4>
        <div class="bank-deposits">${loans.map(loan => `
            <div class="bank-deposit"><div class="bank-deposit-info"><strong>🏗️ ${escapeHtml(loan.name)}</strong><span class="text-muted text-sm">${escapeHtml(loan.project)} · ${(loan.rate * 100).toFixed(1)}% · zostało ${loan.weeksLeft} tyg.${loan.extended ? ' · przedłużona' : ''}</span></div>
            <div class="bank-deposit-amount">${formatZl(loan.principal)} <span class="text-up text-sm">+${formatZl(loan.accrued)}</span></div><span></span>
            <div class="bank-deposit-progress"><span style="width:${(100 * (1 - loan.weeksLeft / loan.termWeeks)).toFixed(0)}%"></span></div></div>`).join('') || '<p class="text-muted">Fundusz nie finansuje żadnej budowy.</p>'}</div>
        <h4>Prośby o finansowanie</h4>
        <div class="bank-grid">${bridgeLoanOffers.map(offer => `
            <article class="bank-card bank-type-internet"><header class="bank-card-head"><span class="bank-card-icon">🏗️</span><div><h4>${escapeHtml(offer.name)}</h4><span class="bank-card-type">${escapeHtml(offer.project)}</span></div></header>
                <dl class="bank-card-rates"><div><dt>Kwota</dt><dd>${formatZl(offer.amount, 0)}</dd></div><div><dt>Oprocentowanie</dt><dd>${(offer.rate * 100).toFixed(1)}%</dd></div><div><dt>Okres</dt><dd>${offer.weeks} tyg.</dd></div></dl>
                <button onclick="fundBridgeLoan('${offer.id}'); renderConstructionFinancing();">Udziel pożyczki</button>
            </article>`).join('') || '<p class="text-muted">Brak próśb — pojawiają się, gdy budowlańcom brakuje gotówki na kontrakty.</p>'}</div>`;
}

function renderConstructionTicker() {
    const builders = stocks.filter(s => !s.isBankrupt && (s.sector || []).includes('Budowlany'));
    const projects = constructionProjects.filter(p => !p.settled);
    renderTicker('construction-ticker', [
        ['Firmy budowlane', builders.length],
        ['Budowy w toku', projects.length],
        ['Otwarte przetargi', activeTenders.filter(t => t.status === 'open').length],
        ['Pożyczki funduszu', formatZl(getFundBridgeLoansValue(), 0)],
        ['Prośby o finansowanie', bridgeLoanOffers.length]
    ]);
}

function renderCityTicker() {
    renderTicker('city-ticker', [
        ['Budżet miasta', formatZl(city.budget, 0)],
        ['Mieszkańcy', Number(city.population || 0).toLocaleString('pl-PL')],
        ['Burmistrz', escapeHtml(city.mayor?.name || '—')],
        ['Poparcie', `${Number(city.mayor?.support || 0).toFixed(0)}%`],
        ['Udziały PPP funduszu', formatZl(getFundPppValue(), 0)]
    ]);
}

// =================================================================================
// OKNO POTWIERDZENIA GRY (zamiast confirm())
// =================================================================================

let gameConfirmAction = null;

/** Okno potwierdzenia. options: { title, confirmLabel, cancelLabel, danger } (0.14.5: tytuł = pytanie, przycisk = nazwa działania). */
function gameConfirm(message, onConfirm, options = {}) {
    let modal = document.getElementById('game-confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'game-confirm-modal';
        modal.className = 'modal modal-sm game-confirm';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'game-confirm-title');
        modal.innerHTML = `
            <button class="close-btn" onclick="closeGameConfirm(false)" aria-label="Zamknij">&times;</button>
            <h3 class="mt-0" id="game-confirm-title">Potwierdzenie</h3>
            <p id="game-confirm-message"></p>
            <div class="game-confirm-actions">
                <button class="btn-secondary" id="game-confirm-cancel" onclick="closeGameConfirm(false)">Anuluj</button>
                <button class="btn-primary" id="game-confirm-ok" onclick="closeGameConfirm(true)">Potwierdź</button>
            </div>`;
        document.body.appendChild(modal);
    }
    gameConfirmAction = onConfirm;
    document.getElementById('game-confirm-title').textContent = options.title || 'Potwierdzenie';
    document.getElementById('game-confirm-message').textContent = message;
    document.getElementById('game-confirm-cancel').textContent = options.cancelLabel || 'Anuluj';
    const ok = document.getElementById('game-confirm-ok');
    ok.textContent = options.confirmLabel || 'Potwierdź';
    ok.className = options.danger ? 'btn-danger' : 'btn-primary';
    gameConfirmReturnFocus = document.activeElement;
    modal.style.display = 'block';
    document.getElementById('game-confirm-cancel').focus();
}

let gameConfirmReturnFocus = null;

/** 0.14.5: „Nowa gra…” z menu paska — okno gry zamiast confirm(); kasowanie zapisu jak w resetGame(). */
function requestNewGame() {
    gameConfirm('Obecny zapis zostanie usunięty i nie da się go przywrócić. Jeśli chcesz go zachować, najpierw wyeksportuj zapis (menu → Eksportuj zapis).',
        () => resetSavedGame().finally(() => location.reload()),
        { title: 'Zacząć nową grę?', confirmLabel: 'Usuń zapis i zacznij', danger: true });
}

// ----- 0.14.5 mobile: szuflada menu zamyka się kliknięciem poza nią, Escape i po wyborze pozycji -----
if (typeof document !== 'undefined') {
    document.addEventListener('click', event => {
        if (!document.body.classList.contains('sidebar-open')) return;
        const sidebar = document.getElementById('app-sidebar');
        if (event.target.closest('.mobile-nav-toggle')) return;
        if (!sidebar?.contains(event.target) || event.target.closest('.sidebar-nav-btn')) document.body.classList.remove('sidebar-open');
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) document.body.classList.remove('sidebar-open');
    });
}

// ----- menu paska górnego (Zapisz grę, Eksportuj zapis, Ustawienia, Nowa gra) -----
function toggleTopbarMenu(force) {
    const menu = document.getElementById('topbar-menu');
    const btn = document.getElementById('topbar-menu-btn');
    if (!menu || !btn) return;
    const open = typeof force === 'boolean' ? force : menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('button')?.focus();
}
function closeTopbarMenu() { toggleTopbarMenu(false); }
if (typeof document !== 'undefined') {
    document.addEventListener('click', event => {
        const wrap = document.querySelector('.topbar-menu-wrap');
        if (wrap && !wrap.contains(event.target)) closeTopbarMenu();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.getElementById('topbar-menu') && !document.getElementById('topbar-menu').hidden) {
            closeTopbarMenu();
            document.getElementById('topbar-menu-btn')?.focus();
        }
    });
}

function closeGameConfirm(confirmed) {
    const modal = document.getElementById('game-confirm-modal');
    if (modal) modal.style.display = 'none';
    if (gameConfirmReturnFocus && typeof gameConfirmReturnFocus.focus === 'function') gameConfirmReturnFocus.focus();
    gameConfirmReturnFocus = null;
    const action = gameConfirmAction;
    gameConfirmAction = null;
    if (confirmed && typeof action === 'function') action();
}

// =================================================================================
// PANEL INWESTYCJI SPÓŁKI (etap G4): gotówka, w toku (etapy), działające, katalog
// =================================================================================

function renderStageBar(segments, currentLabel) {
    return `<div class="inv-stages" title="${escapeHtml(currentLabel)}">${segments.map(segment => `
        <div class="inv-stage ${segment.fill >= 1 ? 'done' : segment.fill > 0 ? 'active' : ''}" style="flex:${segment.share}">
            <span class="inv-stage-fill" style="width:${(segment.fill * 100).toFixed(0)}%"></span>
            <span class="inv-stage-label">${segment.label}</span>
        </div>`).join('')}</div>`;
}

/** Panel inwestycji; canAct = władza większościowego akcjonariusza (zlecanie, blokada, dopłata). */
function renderInvestmentPanel(stock, container, canAct) {
    if (!Array.isArray(stock.activeInvestments)) stock.activeInvestments = [];
    const devLevel = Number(stock.departments?.development?.level) || 0;
    const stockKey = getEntityKey(stock);
    const tenders = activeTenders.filter(t => ['open', 'closed'].includes(t.status) && getEntityKey(t.clientCompany) === stockKey);
    const projects = constructionProjects.filter(p => !p.settled && getEntityKey(p.tender?.clientCompany) === stockKey);
    const fundCan = canAct && canFundTopUp(stock);
    const section = document.createElement('div');
    section.className = 'inv-panel';

    const internal = stock.activeInvestments.map(project => {
        const info = getInvestmentStageInfo(project);
        const topUp = fundCan ? `
            <div class="bank-card-form">
                <input type="text" inputmode="numeric" id="topup-${project.uid}" value="${Math.min(Math.floor(playerCash), Math.max(0, project.cost - (project.fundTopUp || 0)))}" aria-label="Kwota dopłaty">
                <select id="topup-mode-${project.uid}" aria-label="Forma dopłaty"><option value="shares">za nowe akcje (−5%)</option><option value="income">za udział w zysku</option></select>
                <button onclick="fundTopUpInvestment('${stock.symbol}', '${project.uid}', parseFloat(document.getElementById('topup-${project.uid}').value), document.getElementById('topup-mode-${project.uid}').value); refreshInvestmentViews('${stock.symbol}');">Dopłać z funduszu</button>
            </div>` : '';
        const funding = [
            project.fundTopUp ? `fundusz: ${formatZl(project.fundTopUp, 0)}${project.fundIncomePct ? ` (${(project.fundIncomePct * 100).toFixed(0)}% zysku)` : ''}` : '',
            project.publicFunding === 'state' ? 'dofinansowanie BC' : project.publicFunding === 'city' ? 'dofinansowanie miasta' : ''
        ].filter(Boolean).join(' · ');
        return `<li class="inv-item">
            <div class="d-flex justify-between items-center"><strong>${escapeHtml(project.name)}</strong>
                ${canAct ? `<button class="text-xs" onclick="blockInvestment('${stock.symbol}', '${project.uid || project.id}')">Zablokuj</button>` : ''}</div>
            ${renderStageBar(info.segments, info.current.label)}
            <div class="text-xs text-muted">Etap: ${info.current.label} · ${(info.fraction * 100).toFixed(0)}% · koszt ${formatZl(project.cost, 0)}${funding ? ` · ${funding}` : ''}</div>
            ${topUp}
        </li>`;
    });
    const building = [
        ...tenders.map(t => ({ name: t.buildingType.name, label: 'Projekt — przetarg', segments: INVESTMENT_STAGES.map((s, i) => ({ ...s, fill: i === 0 ? 0.5 : 0 })), detail: t.status === 'open' ? `oferty: ${t.bids.length}` : 'rozstrzyganie' })),
        ...projects.map(p => ({ name: p.tender.buildingType.name, label: 'Budowa', segments: INVESTMENT_STAGES.map((s, i) => ({ ...s, fill: i === 0 ? 1 : i === 1 ? Math.min(1, p.progress) : 0 })), detail: `wykonawca: ${p.builder.name} · ${getConstructionProjectStatusLabel(p)}` }))
    ].map(item => `<li class="inv-item"><strong>${escapeHtml(item.name)}</strong>${renderStageBar(item.segments, item.label)}<div class="text-xs text-muted">${escapeHtml(item.detail)}</div></li>`);

    const operating = (stock.operatingInvestments || []).map(op => {
        const quality = INVESTMENT_QUALITY[op.quality] || INVESTMENT_QUALITY.ok;
        return `<tr>
            <td>${escapeHtml(op.name)}</td>
            <td title="Wydajność ${(op.efficiency * 100).toFixed(0)}%">${quality.icon} ${quality.label}</td>
            <td>${(op.roi * 100).toFixed(0)}% / rok</td>
            <td class="${op.lastResult >= 0 ? 'profit' : 'loss'}">${formatZl(op.lastResult, 0)}</td>
            <td class="${op.totalResult >= 0 ? 'profit' : 'loss'}">${formatZl(op.totalResult, 0)}</td>
            <td>${op.fundIncomePct ? `${(op.fundIncomePct * 100).toFixed(0)}% (wypł. ${formatZl(op.fundPaid, 0)})` : '—'}</td>
        </tr>`;
    }).join('');

    const limitReached = countCompanyInvestmentOrders(stock) >= Math.max(1, devLevel);
    const catalog = getInvestmentCatalogForCompany(stock).map(inv => {
        const cost = getInvestmentCostForCompany(stock, inv);
        const isConstruction = CONSTRUCTION_KINDS.includes(inv.kind);
        let action = '';
        if (devLevel < inv.minDevLevel) action = `<span class="text-muted">dział rozwoju ${inv.minDevLevel}</span>`;
        else if (hasCompanyInvestmentInProgress(stock, inv.id)) action = '<span class="text-info">w toku</span>';
        else if (!canAct) action = '<span class="text-muted">—</span>';
        else if (!canFinanceAmount(stock, isConstruction ? getConstructionSpec(inv.id).cost * 1.2 : cost)) action = '<span class="text-down">brak środków</span>';
        else if (limitReached) action = '<span class="text-warn">limit projektów</span>';
        else action = `<button class="btn-xs" onclick="forceCompanyInvestment('${stock.symbol}', '${inv.id}')">${isConstruction ? 'Przetarg' : 'Zleć'}</button>`;
        return `<tr>
            <td><img src="${inv.icon || 'img/box.png'}" class="icon-24 mr-2 va-middle" onerror="this.style.display='none'">${escapeHtml(inv.name)}</td>
            <td>${formatZl(cost, 0)}</td>
            <td>${inv.durationDays} dni</td>
            <td>${(getExpectedAnnualRoi(inv.incomeBonus) * 100).toFixed(0)}% / rok</td>
            <td>${action}</td>
        </tr>`;
    }).join('');

    section.innerHTML = `
        <div class="inv-cash"><span>💰 Gotówka spółki</span><strong>${formatZl(stock.cash, 0)}</strong></div>
        <h5>🚧 W toku (${countCompanyInvestmentOrders(stock)}/${Math.max(1, devLevel)})</h5>
        <ul class="list-plain inv-list">${[...internal, ...building].join('') || '<li class="text-muted">Brak inwestycji w toku.</li>'}</ul>
        ${fundCan ? '<p class="text-xs text-muted">Jako większościowy akcjonariusz fundusz może dopłacić do inwestycji w toku: za nowe akcje (emisja po cenie −5%, także ponad limit) albo za udział w zyskach tej inwestycji (do 60%).</p>' : ''}
        <h5>⚙️ Działające</h5>
        ${operating ? `<table class="asset-mini-table w-full text-xs"><thead><tr><th>Inwestycja</th><th>Jakość</th><th>Oczek. zwrot</th><th>Ost. kwartał</th><th>Łącznie</th><th>Udział funduszu</th></tr></thead><tbody>${operating}</tbody></table>` : '<p class="text-muted text-sm">Brak działających inwestycji.</p>'}
        <h5>📋 Katalog inwestycji</h5>
        <table class="asset-mini-table w-full text-xs"><thead><tr><th>Inwestycja</th><th>Koszt</th><th>Czas</th><th>Oczek. zwrot</th><th></th></tr></thead><tbody>${catalog}</tbody></table>`;
    container.appendChild(section);
}

/** Okno inwestycji dla dowolnej spółki (podgląd; akcje tylko przy władzy korony). */
function openCompanyInvestments(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    const modal = document.getElementById('company-investments-modal');
    const body = document.getElementById('company-investments-body');
    if (!stock || !modal || !body) return;
    document.getElementById('company-investments-title').textContent = `📈 Inwestycje: ${stock.name} (${stock.symbol})`;
    body.innerHTML = '';
    renderInvestmentPanel(stock, body, getFundStakePct(stock) > 0.5);
    modal.style.display = 'block';
}

/** Odświeża otwarte widoki inwestycji po dopłacie funduszu. */
function refreshInvestmentViews(symbol) {
    const modal = document.getElementById('company-investments-modal');
    if (modal && modal.style.display === 'block') openCompanyInvestments(symbol);
    const management = document.getElementById('management-modal');
    if (management && management.style.display === 'block') openManagementModal(symbol, 'depts');
}

// =================================================================================
// OKNA: WROGIE PRZEJĘCIE I EMISJA RATUNKOWA (etap G2)
// =================================================================================

/** Przyciski obron dla spółki-celu (fundusz z większością). */
function renderDefenseButtons(target) {
    return Object.entries(TAKEOVER_DEFENSES).map(([type, defense]) => {
        const check = canUseDefense(target, type, 'player');
        const action = type === 'negotiate' ? `openNegotiationModal('${target.symbol}', true)` : `activateDefenseMechanism('${target.symbol}', '${type}', 'player')`;
        return `<button class="btn-secondary" ${check.ok ? '' : 'disabled'} title="${escapeHtml(defense.desc)}"
            onclick="${action}">
            ${defense.label}<br><span class="text-xs">${check.ok ? formatZl(check.cost, 0) : escapeHtml(check.reason)}</span></button>`;
    }).join('');
}

function openTakeoverModal(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    const modal = document.getElementById('takeover-modal');
    const body = document.getElementById('takeover-body');
    if (!modal || !body) return;
    if (!pair) {
        body.innerHTML = '<p class="text-muted">Ta oferta przejęcia nie jest już aktualna.</p>';
        modal.style.display = 'block';
        return;
    }
    const { initiator, process } = pair;
    const offer = process.offerDetails;
    const holding = playerPortfolio[symbol];
    const pct = getFundStakePct(target);
    const value = (holding?.shares || 0) * offer.buyoutPricePerShare;
    const decided = { sold: 'Fundusz sprzedał pakiet agresorowi.', against: 'Fundusz głosuje przeciw przejęciu.' }[process.fundDecision];
    const defense = process.defenseActive && process.defenseActive !== 'none'
        ? `<p>Aktywna obrona: <strong>${TAKEOVER_DEFENSES[process.defenseActive]?.label || process.defenseActive}</strong>${process.defenseBy ? ` (${escapeHtml(process.defenseBy)})` : ''}</p>` : '';

    body.innerHTML = `
        <div class="bank-ticker">
            <div class="bank-ticker-item"><span>${process.hostile === false ? 'Przyjazny oferent' : 'Agresor'}</span><strong>${escapeHtml(initiator.name)}</strong></div>
            <div class="bank-ticker-item"><span>Cena oferty (premia ${((offer.premium || 0) * 100).toFixed(0)}%)</span><strong>${formatZl(offer.buyoutPricePerShare)}</strong></div>
            <div class="bank-ticker-item"><span>Udział funduszu</span><strong>${(pct * 100).toFixed(1)}% · ${formatZl(value, 0)}</strong></div>
        </div>
        <p class="text-sm">${escapeHtml(process.statusMessage || '')}</p>
        ${defense}
        ${decided ? `<p class="text-info">${decided}</p>` : `
        <div class="d-flex gap-2 flex-wrap">
            <button onclick="sellFundSharesToAggressor('${symbol}')">💰 Sprzedaj akcje po cenie oferty</button>
            <button class="btn-danger" onclick="voteAgainstTakeover('${symbol}')">🗳️ Głosuj przeciw</button>
        </div>`}
        ${pct > 0.5 ? `<h4 class="mt-3">Obrona (akcjonariusz większościowy)</h4><div class="defense-grid">${renderDefenseButtons(target)}</div>` : ''}`;
    modal.style.display = 'block';
}

/** U1: osobne okno negocjacji (rundy, żądanie premii, kontroferta agresora). */
function openNegotiationModal(symbol, start = false) {
    if (start && !startPlayerNegotiation(symbol)) return;
    let modal = document.getElementById('negotiation-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'negotiation-modal';
        modal.className = 'modal';
        modal.innerHTML = '<button class="close-btn" onclick="closeModalFrom(this)" aria-label="Zamknij">&times;</button><h2 class="mt-0">🤝 Negocjacje</h2><div id="negotiation-body"></div>';
        document.body.appendChild(modal);
    }
    renderNegotiation(symbol);
    modal.style.display = 'block';
}

function negotiationAction(symbol, fn, ...args) {
    const result = fn(symbol, ...args);
    const labels = { accepted: '✅ Agresor przyjął żądanie!', counter: '↩️ Agresor składa kontrofertę.', walkout: '🚪 Agresor zerwał rozmowy i wycofał ofertę.' };
    if (labels[result]) showToast(labels[result], result === 'walkout' ? 'warning' : 'success', 5000);
    renderNegotiation(symbol);
    if (typeof refreshTakeoverViews === 'function') refreshTakeoverViews(symbol);
}

function renderNegotiation(symbol) {
    const body = document.getElementById('negotiation-body');
    if (!body) return;
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    const neg = pair?.process.negotiation;
    if (!pair || !neg) { body.innerHTML = '<p class="text-muted">Negocjacje zakończone — oferta przejęcia nie jest już aktualna.</p>'; return; }
    const { initiator, process } = pair;
    const offer = process.offerDetails;
    const owner = findMajorityShareholder(initiator);
    const history = neg.history.map(h => `<li>Runda ${h.round}: ${h.result === 'counterAccepted' ? `przyjęto kontrofertę +${(h.counter * 100).toFixed(0)} pkt` : `żądanie +${(h.demand * 100).toFixed(0)} pkt → ${{ accepted: '✅ przyjęte', counter: `↩️ kontroferta +${(h.counter * 100).toFixed(0)} pkt`, walkout: '🚪 zerwanie' }[h.result]}`}</li>`).join('');
    const demandInput = Number(document.getElementById('neg-demand')?.value) || 15;
    body.innerHTML = `
        <div class="bank-ticker">
            <div class="bank-ticker-item"><span>Agresor</span><strong>${escapeHtml(initiator.name)}</strong></div>
            <div class="bank-ticker-item"><span>Właściciel agresora</span><strong>${escapeHtml(owner?.name || 'rozproszony')}</strong></div>
            <div class="bank-ticker-item"><span>Cena oferty</span><strong>${formatZl(offer.buyoutPricePerShare)} (premia ${((offer.premium || 0) * 100).toFixed(0)}%)</strong></div>
            <div class="bank-ticker-item"><span>Runda</span><strong>${Math.min(neg.round, NEGOTIATION_MAX_ROUNDS)}/${NEGOTIATION_MAX_ROUNDS}</strong></div>
        </div>
        ${neg.open ? `
            <p class="text-sm">Im wyższe żądanie, tym mniejsza szansa zgody. Agresor może przyjąć, złożyć kontrofertę albo zerwać rozmowy (i wycofać ofertę). Charakter właściciela agresora wpływa na jego upór.</p>
            <div class="bank-card-form">
                <label class="text-sm">Żądam podniesienia premii o <input type="number" id="neg-demand" min="2" max="50" step="1" value="${demandInput}" class="w-xs" oninput="document.getElementById('neg-chance').textContent = (getNegotiationAcceptChance(stocks.find(s => s.symbol === '${initiator.symbol}'), this.value / 100, ${neg.round}) * 100).toFixed(0) + '%'"> pkt proc.</label>
                <span class="text-sm">szansa zgody ≈ <strong id="neg-chance">${(getNegotiationAcceptChance(initiator, demandInput / 100, neg.round) * 100).toFixed(0)}%</strong></span>
                <button onclick="negotiationAction('${symbol}', negotiationDemand, document.getElementById('neg-demand').value / 100)">Złóż żądanie</button>
            </div>
            ${neg.counter ? `<div class="mail-action"><p>Kontroferta agresora: premia <strong>+${(neg.counter * 100).toFixed(0)} pkt proc.</strong></p>
                <button onclick="negotiationAction('${symbol}', negotiationAcceptCounter)">✅ Przyjmij kontrofertę</button></div>` : ''}
            <button class="btn-secondary mt-2" onclick="negotiationAction('${symbol}', negotiationEnd)">Zakończ negocjacje (oferta bez zmian)</button>`
        : '<p class="text-info">Negocjacje zakończone.</p>'}
        ${history ? `<h4>Przebieg</h4><ul class="list-plain text-sm">${history}</ul>` : ''}`;
}

function openRescueOfferingModal(symbol) {
    const offer = getRescueOffer(symbol);
    const stock = offer && stocks.find(s => s.symbol === symbol);
    const modal = document.getElementById('rescue-offering-modal');
    const message = document.getElementById('rescue-offering-message');
    if (!modal || !message) return;
    if (!stock) {
        message.innerHTML = '<p class="text-muted">Ta emisja jest już zamknięta.</p>';
        modal.style.display = 'block';
        return;
    }
    const maxAffordable = Math.min(offer.fundReserved, Math.floor(playerCash / offer.price));
    message.innerHTML = `
        <p><strong>${escapeHtml(stock.name)}</strong> ma kłopoty z długiem i oferuje funduszowi do <strong>${offer.fundReserved.toLocaleString('pl-PL')}</strong> nowych akcji
        po <strong>${formatZl(offer.price)}</strong> (rynek: ${formatZl(stock.price)}). Pieniądze idą na spłatę zobowiązań.</p>
        <div class="bank-card-form">
            <input type="text" inputmode="numeric" id="rescue-qty" value="${maxAffordable}" aria-label="Liczba akcji">
            <button onclick="acceptRescueOffer('${symbol}', parseInt(document.getElementById('rescue-qty').value, 10))">✅ Obejmij akcje ${escapeHtml(symbol)}</button>
            <button class="btn-secondary" onclick="declineRescueOffer('${symbol}')">❌ Odrzuć</button>
        </div>`;
    modal.style.display = 'block';
}

function closeRescueOfferingModal() {
    const modal = document.getElementById('rescue-offering-modal');
    if (modal) modal.style.display = 'none';
}

// =================================================================================
// OKNO „WALNE ZGROMADZENIA” (etap G3)
// =================================================================================

let governanceView = { symbol: null };

function getGovernanceCompanies() {
    return stocks.filter(s => isGovernedCompany(s) && (playerPortfolio[s.symbol]?.shares || 0) > 0)
        .sort((a, b) => ensureGovernance(a).quartersToAgm - ensureGovernance(b).quartersToAgm || getFundStakePct(b) - getFundStakePct(a));
}

function openGovernanceModal(symbol = null) {
    const modal = document.getElementById('governance-modal');
    if (!modal) return;
    if (symbol) governanceView.symbol = symbol;
    renderGovernance();
    modal.style.display = 'block';
}

function refreshGovernanceView(symbol) {
    const modal = document.getElementById('governance-modal');
    if (modal && modal.style.display === 'block') openGovernanceModal(symbol);
}

function renderGovernance() {
    const list = document.getElementById('governance-list');
    const detail = document.getElementById('governance-detail');
    if (!list || !detail) return;
    const companies = getGovernanceCompanies();
    if (!governanceView.symbol || !stocks.some(s => s.symbol === governanceView.symbol)) governanceView.symbol = companies[0]?.symbol || null;

    list.innerHTML = companies.length ? companies.map(stock => {
        const gov = ensureGovernance(stock);
        const pct = getFundStakePct(stock);
        return `<button class="gov-company ${stock.symbol === governanceView.symbol ? 'active' : ''}" onclick="openGovernanceModal('${stock.symbol}')">
            <strong>${escapeHtml(stock.symbol)}</strong> <span class="text-xs">${(pct * 100).toFixed(1)}%</span>
            <span class="text-xs text-muted d-block">${gov.pendingAgm ? '🗳️ walne w przyszłym kwartale' : `walne za ${gov.quartersToAgm} kw.`}</span>
        </button>`;
    }).join('') : '<p class="text-muted text-sm">Fundusz nie ma akcji żadnej spółki.</p>';

    const stock = stocks.find(s => s.symbol === governanceView.symbol);
    detail.innerHTML = stock ? renderGovernanceDetail(stock) : '<p class="text-muted">Kup akcje spółki, aby uczestniczyć w jej walnych zgromadzeniach.</p>';
}

function renderShareholderBars(stock) {
    const holders = getShareholders(stock);
    const listed = holders.reduce((sum, h) => sum + h.shares, 0);
    const rows = [...holders.slice(0, 7), { name: 'Rozproszeni akcjonariusze', kind: 'retail', pct: Math.max(0, stock.totalShares - listed) / stock.totalShares }];
    return rows.map(h => `<div class="gov-bar ${h.kind === 'player' ? 'is-fund' : ''}">
        <span class="gov-bar-name">${escapeHtml(h.name)}</span>
        <span class="gov-bar-track"><span style="width:${Math.min(100, h.pct * 100).toFixed(1)}%"></span></span>
        <span class="gov-bar-pct">${h.entity?.isMafia ? `~${Math.max(5, Math.round(h.pct * 20) * 5)}%` : `${(h.pct * 100).toFixed(1)}%`}</span>
    </div>`).join('');
}

function renderGovernanceDetail(stock) {
    const gov = ensureGovernance(stock);
    const pct = getFundStakePct(stock);
    const seats = getBoardSeats(stock);
    const insight = getBoardInsight(stock);
    const canPropose = canFundControlAgm(stock);
    const last = gov.history[0];

    const agenda = gov.pendingAgm ? gov.pendingAgm.items.map(item => `
        <li class="gov-item ${item.kind === 'activist' ? 'is-activist' : ''}">
            <div><strong>${escapeHtml(item.label)}</strong> <span class="text-xs text-muted">${item.kind === 'activist' ? 'wniosek akcjonariusza' : 'wniosek zarządu'}</span></div>
            <div class="d-flex gap-2 items-center">
                ${canPropose ? `<select aria-label="Głos funduszu" onchange="setAgmVote('${stock.symbol}', '${item.id}', this.value)">
                    ${[['for', 'Za'], ['against', 'Przeciw'], ['abstain', 'Wstrzymuję się']].map(([value, label]) => `<option value="${value}" ${item.playerVote === value ? 'selected' : ''}>${label}</option>`).join('')}
                </select>` : '<span class="text-xs text-muted">fundusz: za</span>'}
                ${item.by === 'player' ? (item.campaign ? '<span class="text-xs text-info">📣 kampania trwa</span>'
                    : `<button class="btn-xs" onclick="runProxyCampaign('${stock.symbol}', '${item.id}')">📣 Kampania (${formatZl(getCampaignCost(stock), 0)})</button>`) : ''}
            </div>
        </li>`).join('') : '';

    const history = gov.history.map(record => `
        <details class="gov-history"><summary>Walne — frekwencja ${(record.turnout * 100).toFixed(0)}%, przyjęte ${record.results.filter(r => r.passed).length}/${record.results.length}</summary>
            <ul class="list-plain">${record.results.map(r => `<li>${r.passed ? '✅' : '❌'} ${escapeHtml(r.label)} — za ${(r.for / Math.max(1, r.for + r.against) * 100).toFixed(0)}%${r.effect ? ` · ${escapeHtml(r.effect)}` : ''}</li>`).join('')}</ul>
        </details>`).join('');

    return `
        <div class="bank-ticker">
            <div class="bank-ticker-item"><span>${escapeHtml(stock.name)}</span><strong>${(pct * 100).toFixed(1)}% głosów</strong></div>
            <div class="bank-ticker-item"><span>Rada nadzorcza</span><strong>${seats.label}</strong></div>
            <div class="bank-ticker-item"><span>Najbliższe walne</span><strong>${gov.pendingAgm ? 'w przyszłym kwartale' : `za ${gov.quartersToAgm} kw.`}</strong></div>
            <div class="bank-ticker-item"><span>Ostatnia frekwencja</span><strong>${last ? (last.turnout * 100).toFixed(0) + '%' : '—'}</strong></div>
        </div>
        <h4>Akcjonariat</h4>
        <div class="gov-bars">${renderShareholderBars(stock)}</div>
        <h4>Porządek obrad</h4>
        ${agenda ? `<ul class="list-plain gov-agenda">${agenda}</ul>` : '<p class="text-muted text-sm">Porządek obrad pojawi się kwartał przed zgromadzeniem.</p>'}
        <h4>Wniosek akcjonariusza</h4>
        ${canPropose ? `<div class="bank-card-form">
            <select id="gov-proposal-type" aria-label="Rodzaj wniosku">${Object.entries(ACTIVIST_PROPOSALS).map(([id, p]) => `<option value="${id}" title="${escapeHtml(p.desc)}">${p.label}</option>`).join('')}</select>
            <button onclick="submitShareholderProposal('${stock.symbol}', document.getElementById('gov-proposal-type').value)">Zgłoś na walne</button>
        </div>` : '<p class="text-muted text-sm">Głosuje, zgłasza wnioski i prowadzi kampanie tylko akcjonariusz większościowy (> 50%). Poniżej fundusz głosuje „za” wnioskami zarządu.</p>'}
        ${typeof getListingMoveTargets === 'function' && getListingMoveTargets(stock).length ? `<h4>Rynek notowań</h4>
            <p class="text-sm">Teraz: <strong>${escapeHtml(getMarketLabel(getStockMarket(stock)))}</strong>. Rynki alternatywne mają niższą prowizję i opłatę za notowanie, ale mniej inwestorów (wycena −3%). Koszt: 0,3% kapitalizacji z gotówki spółki, raz na rok.</p>
            <div class="bank-card-form">${getListingMoveTargets(stock).map(id => `<button class="btn-secondary" onclick="moveListing('${stock.symbol}', '${id}'); openGovernanceModal('${stock.symbol}');">Przenieś na ${escapeHtml(getMarketLabel(id))}</button>`).join('')}</div>` : ''}
        ${insight ? `<h4>Wgląd rady nadzorczej</h4>
            <p class="text-sm">Prognoza wyniku kwartału: <strong class="${insight.forecast >= 0 ? 'text-up' : 'text-down'}">${formatZl(insight.forecast, 0)}</strong></p>
            <ul class="list-plain text-sm">${insight.plans.map(p => `<li>• ${escapeHtml(p)}</li>`).join('') || '<li class="text-muted">Brak planów inwestycyjnych.</li>'}</ul>` : ''}
        ${history ? `<h4>Historia uchwał</h4>${history}` : ''}`;
}

// ---------- Państwo: panel Makro (0.10.2) ----------
function renderSparkline(values, { width = 160, height = 36 } = {}) {
    if (values.length < 2) return '<span class="text-xs text-muted">za mało danych</span>';
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const points = values.map((value, i) => `${(i / (values.length - 1) * width).toFixed(1)},${(height - 3 - (value - min) / span * (height - 6)).toFixed(1)}`).join(' ');
    return `<svg class="macro-spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}"/></svg>`;
}

function renderMacroPanel() {
    const pct = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;
    const series = key => macro.history.map(entry => entry[key]);
    const card = (icon, title, value, sub, key) => `
        <article class="bank-card macro-card"><header class="bank-card-head"><span class="bank-card-icon">${icon}</span><div><h4>${title}</h4><span class="bank-card-type">${sub}</span></div></header>
            <div class="macro-value">${value}</div>${renderSparkline(series(key))}</article>`;
    const decision = macro.lastDecision;
    const election = macro.election;
    const sectors = Object.entries(macro.sectorCycles).sort(([a], [b]) => a.localeCompare(b, 'pl'));
    return `
        <div class="bank-grid">
            ${card('🔥', 'Inflacja', pct(macro.inflation), `cel BC ${pct(INFLATION_TARGET)}`, 'inflation')}
            ${card('👷', 'Bezrobocie', pct(macro.unemployment), `naturalne ${pct(NATURAL_UNEMPLOYMENT)}`, 'unemployment')}
            ${card('🏭', 'PKB r/r', pct(macro.gdpAnnual), escapeHtml(getEconomyPhaseInfo().name), 'gdp')}
            ${card('🏛️', 'Stopa referencyjna', pct(centralBank.baseInterestRate, 2), `kredyty ${pct(LOAN_INTEREST_RATE, 2)} · lokaty ${pct(DEPOSIT_INTEREST_RATE, 2)}`, 'rate')}
        </div>
        <div class="bank-grid mt-3">
            <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">📰</span><div><h4>Posiedzenia Banku Centralnego</h4><span class="bank-card-type">co kwartał · prezes ${escapeHtml(centralBank.ceo?.name || '—')}</span></div></header>
                <p class="text-sm">Ostatnia decyzja: <strong>${decision ? describeRateChange(decision.change) : '—'}</strong>${decision && Math.abs(decision.surprise) >= 0.001 ? ' <span class="text-warn">(niespodzianka)</span>' : ''}</p>
                <p class="text-sm">Oczekiwania analityków na następne posiedzenie: <strong>${escapeHtml(macro.expectation?.label || '—')}</strong></p>
                <p class="text-xs text-muted">Cechy prezesa: ${(centralBank.ceo?.traits || []).map(t => escapeHtml(t.name)).join(', ') || 'brak'}. Rynek reaguje mocniej na niespodziankę niż na decyzję zgodną z oczekiwaniami.</p></article>
            <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">🗳️</span><div><h4>Polityka</h4><span class="bank-card-type">${escapeHtml(getRulingParty().name)}</span></div></header>
                <p class="text-sm">${election.campaign ? '<strong class="text-warn">Trwa kampania wyborcza.</strong>' : `Wybory za ${election.quartersLeft} kw.`}</p>
                <p class="text-xs text-muted">Prywatyzacje ×${getRulingParty().privatization} · nacjonalizacje ×${getRulingParty().nationalization} · dotacje ×${getRulingParty().subsidies}</p>
                ${getPoliticalFavor() ? `<p class="text-sm ${getPoliticalFavor() > 0 ? 'text-up' : 'text-down'}">${getPoliticalFavor() > 0 ? '🤝 Władza jest przychylna funduszowi' : '😠 Władza jest nieprzychylna funduszowi'} (${election.favor.quartersLeft} kw.)</p>` : ''}
                ${election.campaign && playerFund ? `<p class="text-xs text-muted">Darowizna z pieniędzy funduszu (do 2% aktywów): przychylność wygranych, ale podejrzenia KNF i spadek zaufania klientów. Wpłacono: ${formatZl(Object.values(election.donations || {}).reduce((sum, value) => sum + (Number(value) || 0), 0), 0)}.</p>
                <div class="bank-card-form"><select id="donation-party" aria-label="Partia">${Object.entries(RULING_PARTIES).map(([id, p]) => `<option value="${id}">${escapeHtml(p.name)}</option>`).join('')}</select>
                <input type="text" inputmode="numeric" id="donation-amount" value="${Math.max(100, Math.round(getFundAssets() * 0.005))}" aria-label="Kwota darowizny">
                <button class="btn-secondary" onclick="supportElectionCampaign(document.getElementById('donation-party').value, parseFloat(document.getElementById('donation-amount').value)); updateStateModalContent();">Wesprzyj kampanię</button></div>` : ''}</article>
        </div>
        <h4>Cykle sektorów</h4>
        <div class="macro-sectors">${sectors.map(([sector, cycle]) => {
            const phase = SECTOR_CYCLE_PHASES[cycle.phase];
            return `<div class="macro-sector is-${cycle.phase}"><span>${phase.icon} ${escapeHtml(sector)}</span><strong>${phase.name}</strong><span class="text-xs text-muted">${cycle.quartersLeft} kw.</span></div>`;
        }).join('')}</div>`;
}

// =================================================================================
// POWIADOMIENIA (B2): zamiast okien otwieranych samoczynnie w trakcie gry
// =================================================================================

const notificationActions = new Map();
let notificationSeq = 0;

/** Powiadomienie w rogu ekranu: „Otwórz” lub ✕. isValid — gdy zwróci false, powiadomienie znika. */
function pushNotification(text, onOpen, isValid = null) {
    const bar = document.getElementById('notif-bar');
    if (!bar) { if (typeof onOpen === 'function') onOpen(); return; }
    const id = `n${++notificationSeq}`;
    notificationActions.set(id, { onOpen, isValid });
    const item = document.createElement('div');
    item.className = 'notif-item';
    item.dataset.id = id;
    item.innerHTML = `${uiIcon('info', 16)}<span>${escapeHtml(stripEmoji(text))}</span><button class="btn-ghost btn-sm" onclick="openNotification('${id}')">Otwórz</button><button class="notif-close" aria-label="Zamknij powiadomienie" onclick="dismissNotification('${id}')">${uiIcon('zamknij', 14)}</button>`;
    bar.prepend(item);
    while (bar.querySelectorAll('.notif-item').length > 4) dismissNotification(bar.querySelector('.notif-item:last-of-type').dataset.id);
    updateNotificationOverflow();
}

/** 0.14.5: przycisk pauzy paska wiadomości. */
function toggleNewsTickerPause() {
    newsTicker.userPaused = !newsTicker.userPaused;
    if (typeof newsTicker.syncPause === 'function') newsTicker.syncPause(); else newsTicker.paused = newsTicker.userPaused;
    const btn = document.getElementById('news-ticker-pause');
    if (btn) {
        btn.setAttribute('aria-pressed', String(newsTicker.userPaused));
        btn.setAttribute('aria-label', newsTicker.userPaused ? 'Wznów pasek wiadomości' : 'Wstrzymaj pasek wiadomości');
        btn.innerHTML = uiIcon(newsTicker.userPaused ? 'start' : 'pauza', 14);
    }
}

/** 0.14.5: widoczne najwyżej 2 powiadomienia, reszta pod przyciskiem „+N”. */
const NOTIF_VISIBLE = 2;
function updateNotificationOverflow() {
    const bar = document.getElementById('notif-bar');
    if (!bar) return;
    const items = [...bar.querySelectorAll('.notif-item')];
    const expanded = bar.classList.contains('expanded');
    items.forEach((item, index) => item.classList.toggle('is-collapsed', !expanded && index >= NOTIF_VISIBLE));
    let more = bar.querySelector('.notif-more');
    const hidden = items.length - NOTIF_VISIBLE;
    if (hidden > 0) {
        if (!more) {
            more = document.createElement('button');
            more.type = 'button';
            more.className = 'notif-more btn-ghost btn-sm';
            more.onclick = () => { bar.classList.toggle('expanded'); updateNotificationOverflow(); };
            bar.appendChild(more);
        }
        more.textContent = expanded ? 'Zwiń powiadomienia' : `+${hidden} ${hidden === 1 ? 'powiadomienie' : hidden < 5 ? 'powiadomienia' : 'powiadomień'}`;
    } else {
        more?.remove();
        bar.classList.remove('expanded');
    }
}

function openNotification(id) {
    const entry = notificationActions.get(id);
    dismissNotification(id);
    if (entry && (!entry.isValid || entry.isValid())) entry.onOpen?.();
    else showToast('To powiadomienie jest już nieaktualne.', 'default');
}

function dismissNotification(id) {
    notificationActions.delete(id);
    document.querySelector(`#notif-bar [data-id="${id}"]`)?.remove();
    updateNotificationOverflow();
}

// =================================================================================
// 0.13: ZAKŁADKA „KRAJ” (okno Państwo) i „ZATRUDNIENIE” (karta spółki)
// =================================================================================

const CLASS_COLORS = { poor: '#c2410c', lowerMid: '#d97706', mid: '#16a34a', upperMid: '#0891b2', rich: '#2563eb', veryRich: '#7c3aed' };
const PARTY_COLORS = { people: '#65a30d', state: '#dc2626', market: '#2563eb' };

function openCountryPanel() {
    stateTab = 'country';
    openStateModal();
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('strukturaSpoleczna');
}

function renderSocietyClassBar() {
    const segments = SOCIETY_CLASSES.map(cls => {
        const share = society.classes[cls.id] || 0;
        return `<span class="society-seg" style="width:${(share * 100).toFixed(2)}%;background:${CLASS_COLORS[cls.id]}" title="${escapeHtml(cls.name)}: ${(share * 100).toFixed(1)}%"></span>`;
    }).join('');
    const legend = SOCIETY_CLASSES.map(cls => `<li><span class="society-dot" style="background:${CLASS_COLORS[cls.id]}"></span>${cls.icon} ${escapeHtml(cls.name)} <strong>${((society.classes[cls.id] || 0) * 100).toFixed(1)}%</strong>
        <span class="text-xs text-muted">konsumpcja ×${getClassWeight(cls).toFixed(2)} · ${escapeHtml(cls.sectors.join(', '))}</span></li>`).join('');
    return `<div class="society-classbar" role="img" aria-label="Struktura klas">${segments}</div><ul class="list-plain society-legend">${legend}</ul>`;
}

function renderPartyBars(support) {
    return PARTY_IDS.map(id => `<div class="party-row"><span>${escapeHtml(RULING_PARTIES[id].name)}${macro.election.ruling === id ? ' 👑' : macro.election.coalition?.partner === id ? ' 🤝' : ''}</span>
        <span class="party-bar"><span style="width:${Math.min(100, support[id] || 0).toFixed(1)}%;background:${PARTY_COLORS[id]}"></span></span><strong>${(support[id] || 0).toFixed(0)}%</strong></div>`).join('');
}

function renderCountryPanel() {
    ensureSocietyState();
    const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
    const series = key => society.history.map(entry => entry[key]);
    const card = (icon, title, value, sub, key) => `
        <article class="bank-card macro-card"><header class="bank-card-head"><span class="bank-card-icon">${icon}</span><div><h4>${title}</h4><span class="bank-card-type">${sub}</span></div></header>
            <div class="macro-value">${value}</div>${key && typeof renderSparkline === 'function' ? renderSparkline(series(key)) : ''}</article>`;
    const m = society.migration;
    const budget = society.budget;
    const pending = society.pendingLaw;
    const support = macro.election.campaign && macro.election.support ? macro.election.support : computePartySupport(false);
    const wf = getWorkforceCompanies();
    const unions = wf.filter(s => s.workforce.union).length;
    const striking = wf.filter(s => s.workforce.strike);
    const sectorUnions = Object.keys(society.sectorUnions || {});
    const lastGrowth = Number(society.lastGrowth) || 0;
    const laws = Object.entries(SOCIAL_LAWS).map(([id, law]) => {
        const level = society.laws[id];
        return `<tr><td>${law.icon} ${escapeHtml(law.name)}</td><td><strong>${escapeHtml(describeLawLevel(id))}</strong></td>
            <td class="text-xs text-muted">${pending?.law === id ? `📜 zapowiedź: → ${escapeHtml(describeLawLevel(id, pending.to))} od przyszłego kwartału` : `zmiany: ${society.lawChanges[id] || 0}`}</td>
            <td>${law.levels.map((_, i) => `<span class="law-pip ${i <= level ? 'on' : ''}"></span>`).join('')}</td></tr>`;
    }).join('');
    const wages = WORKFORCE_GROUPS.map(g => `<tr><td>${escapeHtml(g.name)}</td><td class="cell-number ${society.wages[g.id] > 1.005 ? 'text-down' : society.wages[g.id] < 0.995 ? 'text-up' : ''}">${society.wages[g.id].toFixed(3)}</td></tr>`).join('');
    return `
        <p class="bank-lead">Kraj to ludzie: od struktury klas zależy popyt (sektory luksusowe kontra podstawowe), od płac i zadowolenia — koszt pracy w spółkach, od ustaw — budżet państwa i bezrobocie. Liczby płac to indeksy realne (1,00 = poziom startowy, bez inflacji).</p>
        <div class="bank-grid">
            ${card('👥', 'Populacja', formatPopulation(society.population), `${lastGrowth >= 0 ? '+' : ''}${(lastGrowth * 100).toFixed(2)}% w kwartale`, 'population')}
            ${card('🛒', 'Indeks popytu', society.demandIndex.toFixed(3), 'start = 1,000 · Σ udział × waga', 'demand')}
            ${card('🎓', 'Edukacja', `${society.education.toFixed(0)}/100`, `priorytet państwa: ${EDUCATION_LABELS[society.educationPriority]} (cel ${EDUCATION_TARGETS[society.educationPriority]})`, 'education')}
            ${card('✈️', 'Migracja', `${(m.lastPeople || 0) >= 0 ? '+' : ''}${Math.round(m.lastPeople || 0).toLocaleString('pl-PL')}`, `atrakcyjność kraju ${Number(m.attractiveness || 0).toFixed(0)}/100${m.lowQuarters ? ` · ⚠️ ${m.lowQuarters} kw. poniżej 40` : ''}`, 'migration')}
            ${card('🧠', 'Niedobór specjalistów', society.shortage.toFixed(2), society.shortage > 1 ? 'popyt > podaż: płace specjalistów rosną' : 'podaż wystarcza', 'shortage')}
        </div>
        <div class="bank-grid mt-3">
            <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">🏘️</span><div><h4>Struktura społeczna</h4><span class="bank-card-type">6 klas zamożności</span></div></header>
                ${renderSocietyClassBar()}
                <p class="text-xs text-muted">Co kwartał część każdej klasy awansuje albo spada o szczebel: wzrost PKB pomaga, bezrobocie i inflacja szkodzą. Płaca minimalna i mieszkania socjalne przesuwają biednych do klasy średniej niższej.</p></article>
            <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">💼</span><div><h4>Rynek pracy</h4><span class="bank-card-type">bezrobocie ${pct(macro.unemployment)} · indeksy płac realnych</span></div></header>
                <table class="asset-mini-table w-full"><tbody>${wages}</tbody></table>
                <p class="text-xs text-muted">Krzywa Phillipsa: niskie bezrobocie podnosi płace, wysokie je hamuje. Niedobór specjalistów zależy od edukacji i drenażu mózgów.</p>
                <p class="text-sm">✊ Związki zakładowe: <strong>${unions}</strong>/${wf.length} spółek · sektorowe: <strong>${sectorUnions.length ? escapeHtml(sectorUnions.join(', ')) : 'brak'}</strong> · strajki teraz: <strong>${striking.length}</strong>${striking.length ? ` (${striking.slice(0, 4).map(s => escapeHtml(s.name)).join(', ')})` : ''}</p></article>
        </div>
        <div class="bank-grid mt-3">
            <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">📜</span><div><h4>Ustawy</h4><span class="bank-card-type">rząd zmienia 1 ustawę na rok, zapowiedź kwartał wcześniej</span></div></header>
                <table class="asset-mini-table w-full"><tbody>${laws}</tbody></table>
                ${pending ? `<p class="text-sm">📣 Rynek już reaguje na zapowiedź — tak działa dyskontowanie: kurs zmienia się przy ogłoszeniu, nie w dniu wejścia ustawy w życie.</p>` : ''}
                ${society.housingProgram > 0 ? `<p class="text-sm">🏗️ Trwa program mieszkań socjalnych (${society.housingProgram} kw.): przetargi dla budowlanki i deweloperów.</p>` : ''}</article>
            <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">🏦</span><div><h4>Budżet państwa</h4><span class="bank-card-type">Skarb Państwa ${formatZl(governmentTreasury, 0)}</span></div></header>
                <dl class="bank-card-rates">
                    <div><dt>Saldo kwartału</dt><dd class="${budget.balance < 0 ? 'text-down' : 'text-up'}">${formatZl(budget.balance || 0, 0)}</dd></div>
                    <div><dt>Deficyt od</dt><dd>${budget.deficitQuarters} kw.</dd></div>
                    <div><dt>Zasiłki</dt><dd>${formatZl(budget.socialSpending || 0, 0)}</dd></div>
                    <div><dt>Podatki od pracy</dt><dd>${formatZl(budget.laborTaxes || 0, 0)}</dd></div>
                    <div><dt>Ubytek przez szarą strefę</dt><dd class="${budget.greyTaxLoss > 0 ? 'text-down' : ''}">${formatZl(budget.greyTaxLoss || 0, 0)}</dd></div>
                    <div><dt>CIT</dt><dd>${(getCompanyIncomeTaxRate() * 100).toFixed(0)}%</dd></div>
                </dl>
                <p class="text-xs text-muted">Deficyt przez 4 kwartały podnosi rentowność obligacji skarbowych o 0,25 pp${budget.bondPremium ? ' (teraz: ✅ premia naliczana)' : ''}. Przez 8 kwartałów — rząd podnosi CIT albo tnie ustawy (zależnie od partii).</p></article>
            <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">🗳️</span><div><h4>Partie</h4><span class="bank-card-type">${escapeHtml(getRulingParty().name)} · wybory za ${macro.election.quartersLeft} kw.</span></div></header>
                ${renderPartyBars(support)}
                <p class="text-xs text-muted">Sondaż: poparcie liczone z klas (biedni wolą Ludowców, zamożni Koalicję Rynkową), plus zmęczenie władzą, koniunktura i szum. Zwycięzca poniżej 40% rządzi w koalicji z drugą partią.</p></article>
        </div>`;
}

// ---------- Karta spółki: Zatrudnienie ----------
function renderCompanyCardWorkforce(stock) {
    const wf = ensureWorkforce(stock);
    if (!wf) return '<p class="text-muted">Ta spółka nie ma modelu zatrudnienia (bank, fundusz, startup).</p>';
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('kosztPracy');
    const counts = getWorkforceGroupCounts(stock);
    const policy = LABOR_POLICIES[wf.policy] || LABOR_POLICIES.standard;
    const index = getLaborCostIndex(stock);
    const laborPct = wf.laborShare * index;
    const peers = getWorkforceCompanies().filter(s => getMainSector(s) === getMainSector(stock));
    const sectorPct = peers.length ? peers.reduce((sum, s) => sum + s.workforce.laborShare * getLaborCostIndex(s), 0) / peers.length : laborPct;
    const controls = typeof canFundControlAgm === 'function' && canFundControlAgm(stock);
    const locked = isLaborPolicyLocked(stock);
    const union = wf.union || getSectorUnion(stock);
    const status = getUnionStatus(stock);
    const pending = wf.pendingDemand;
    const premium = 1 + (Number(wf.wagePremium) || 0);
    const rows = WORKFORCE_GROUPS.map(g => {
        const wage = (g.id === 'grey' ? getMarketWage('cheap') * GREY_WAGE_FACTOR : getMarketWage(g.id) * premium) * (Number(wf.payMult) || 1);
        return `<tr class="${g.id === 'grey' && counts.grey > 0 ? 'text-down' : ''}"><td>${escapeHtml(g.name)}</td><td class="cell-number">${counts[g.id].toLocaleString('pl-PL')}</td><td class="cell-number">${wage.toFixed(2)}</td></tr>`;
    }).join('');
    const satClass = wf.satisfaction >= 70 ? 'text-up' : wf.satisfaction < 35 ? 'text-down' : '';
    const policyButtons = controls ? `<div class="d-flex gap-2 flex-wrap mt-2">${LABOR_POLICY_ORDER.map(id => `<button class="btn-xs ${id === wf.policy ? '' : 'btn-secondary'}" ${locked || id === wf.policy ? 'disabled' : ''} onclick="setLaborPolicy('${stock.symbol}', '${id}'); renderCompanyCard();">${LABOR_POLICIES[id].icon} ${LABOR_POLICIES[id].name}</button>`).join('')}</div>
        <p class="text-xs text-muted">${locked ? `Blokada: kolejna zmiana za ${wf.policyLockUntil - getWorkforceQuarter()} kw.` : 'Możesz (nie musisz) zmienić politykę. Marża dochodzi do nowej polityki w 2 kwartały, zadowolenie zmienia się od razu (obniżka −15, podwyżka +5). Blokada: 4 kwartały.'}</p>` : '<p class="text-xs text-muted">Politykę ustala prezes według cech. Zmienić ją może większościowy akcjonariusz (> 50%).</p>';
    const decision = pending && controls ? `<div class="mail-action"><p>✊ ${pending.strike ? 'Trwa strajk' : `Związek żąda +${(pending.raise * 100).toFixed(1)}%`} — decyzja do końca kwartału${pending.choice ? ` (wybrano: <strong>${{ agree: 'zgoda', negotiate: 'negocjacje', refuse: 'odmowa' }[pending.choice]}</strong>)` : ' (bez odpowiedzi zdecyduje prezes)'}.</p>
        <button onclick="respondUnionDemand('${stock.symbol}', 'agree'); renderCompanyCard();">Zgoda</button> <button class="btn-secondary" onclick="respondUnionDemand('${stock.symbol}', 'negotiate'); renderCompanyCard();">Negocjacje</button> <button class="btn-danger" onclick="respondUnionDemand('${stock.symbol}', 'refuse'); renderCompanyCard();">Odmowa</button></div>` : '';
    const poachTargets = controls ? stocks.filter(s => s !== stock && hasWorkforce(s) && s.ceo && !s.isBankrupt).sort((a, b) => (b.ceo.traits?.length || 0) - (a.ceo.traits?.length || 0)).slice(0, 25) : [];
    const poach = controls ? `<h4 class="mt-3">👔 Podkup prezesa</h4>
        <p class="text-xs text-muted">Koszt: 1% kapitalizacji spółki, z której odchodzi prezes — płaci ${escapeHtml(stock.name)} ze swojej gotówki. Szansa: 60% − zadowolenie pracowników tamtej spółki / 2. Prezes zabiera swoje cechy. Limit: 1 na rok.</p>
        <div class="bank-card-form"><select id="poach-ceo-source" aria-label="Spółka">${poachTargets.map(s => `<option value="${s.symbol}">${escapeHtml(s.ceo.name)} — ${escapeHtml(s.name)} (${(s.ceo.traits || []).map(t => escapeHtml(t.name)).join(', ') || 'bez cech'})</option>`).join('')}</select>
        <button onclick="playerPoachCeo('${stock.symbol}', document.getElementById('poach-ceo-source').value); renderCompanyCard();">Złóż ofertę</button></div>` : '';
    const sat = wf.satisfactionHistory.length > 1 && typeof renderSparkline === 'function' ? renderSparkline(wf.satisfactionHistory, { width: 140, height: 30 }) : '';
    return `
        <div class="cc-grid">
            <section><h4>Zatrudnienie: ${wf.employees.toLocaleString('pl-PL')} osób</h4>
                <table class="asset-mini-table w-full"><thead><tr><th>Grupa</th><th class="cell-number">Osób</th><th class="cell-number" title="Płaca względem startowego poziomu rynku (1,00), z polityką i podwyżkami związkowymi">Płaca</th></tr></thead><tbody>${rows}</tbody></table>
                <p class="text-sm">Koszt pracy: <strong class="${laborPct > sectorPct * 1.05 ? 'text-down' : laborPct < sectorPct * 0.95 ? 'text-up' : ''}">${(laborPct * 100).toFixed(1)}% przychodów</strong> · średnia sektora ${(sectorPct * 100).toFixed(1)}% · indeks kosztu pracy ${index.toFixed(3)}</p>
                <p class="text-xs text-muted">Marża = marża bazowa + ${(wf.laborShare * 100).toFixed(0)}% × (1 − indeks). Niższy indeks (tańsza praca, wyższa wydajność) podnosi marżę — ale z dźwignią operacyjną działa to w obie strony.</p></section>
            <section><h4>Ludzie i polityka</h4>
                <p class="m-0">Zadowolenie: <strong class="${satClass}">${wf.satisfaction.toFixed(0)}/100</strong> ${sat}</p>
                <p class="text-xs text-muted mt-0">cel ${getSatisfactionTarget(stock).toFixed(0)} · wydajność ${(((wf.productivity || 1) + (wf.productivityBonus || 0)) * 100).toFixed(1)}%${wf.rotation ? ` · rotacja ${(wf.rotation * 100).toFixed(1)}%/kw.` : ''}${wf.layoffs ? ' · ⚠️ zwolnienia' : ''}</p>
                <p class="m-0">Polityka kadrowa: <strong>${policy.icon} ${policy.name}</strong> <span class="text-xs text-muted">(${{ owner: 'decyzja funduszu', bot: 'decyzja większościowca', ceo: 'decyzja prezesa' }[wf.policySetBy] || 'decyzja prezesa'})</span></p>
                ${policyButtons}
                <p class="m-0 mt-2">Związek: <strong>${{ none: 'brak', company: '✊ zakładowy', sector: '✊ sektorowy' }[status]}</strong>${union?.agreementUntil >= getWorkforceQuarter() ? ` · 📄 układ zbiorowy do kw. ${union.agreementUntil}` : ''}${wf.strike ? ` · <strong class="text-down">STRAJK (−${(wf.strike.pct * 100).toFixed(0)}% przychodów, ${wf.strike.quarters}. kw.)</strong>` : ''}</p>
                <p class="text-xs text-muted">Ryzyko strajku: ${escapeHtml(getStrikeRisk(stock) || '—')}${wf.greyCaughtQuarter !== null && wf.greyCaughtQuarter !== undefined ? ` · 🦺 kara Inspekcji Pracy w kw. ${wf.greyCaughtQuarter}` : ''}</p>
                ${decision}
            </section>
        </div>
        ${poach}`;
}

/** 0.14 T6: decyzje większościowca matki wobec córki (opcjonalne — bez nich decyduje prezes matki). */
function renderSubsidiaryControls(child, stake) {
    const c = child.symbol;
    const transfer = [0.3, 0.4, 0.5, 0.6, 0.7].map(r => `<option value="${r}" ${Math.abs(getProfitTransferRate(child) - r) < 0.001 ? 'selected' : ''}>${r * 100}%</option>`).join('');
    return `<div class="d-flex gap-2 flex-wrap items-center mt-1">
        <label class="text-xs">Transfer zysku <select onchange="playerSubsidiaryAction('${c}', 'transfer', Number(this.value))">${transfer}</select></label>
        ${child.groupLoan ? '' : `<select id="sub-loan-${c}" aria-label="Oprocentowanie pożyczki"><option value="1">pożyczka rynkowa</option><option value="0.5">pożyczka −50% (nierynkowa)</option><option value="1.5">pożyczka +50% (nierynkowa)</option></select><button class="btn-secondary btn-sm" onclick="playerSubsidiaryAction('${c}', 'loan', Number(document.getElementById('sub-loan-${c}').value))">🤲 Pożycz (do 20% gotówki)</button>`}
        <button class="btn-secondary btn-sm" onclick="playerSubsidiaryAction('${c}', 'secondary')">🕊️ Oferta wtórna</button>
        <button class="btn-secondary btn-sm" onclick="playerSubsidiaryAction('${c}', 'spinoff')">✂️ Spin-off reszty</button>
        ${stake >= SUB_SQUEEZE_THRESHOLD - 1e-9 ? `<button class="btn-secondary btn-sm" onclick="playerSubsidiaryAction('${c}', 'absorb')">🧲 Wchłoń (wykup 10–20% premii)</button>` : ''}
        <button class="btn-secondary btn-sm" onclick="playerSubsidiaryAction('${c}', 'sell')">💼 Sprzedaj pakiet kontrolny</button>
    </div>`;
}

/** 0.14 T5: czy pokazać kartę „Grupa” (koncern, zależne, matka albo kooperacje). */
function hasGroupCard(stock) {
    return typeof isConcern === 'function' && (isConcern(stock) || Boolean(stock.isSubsidiaryOf) || getSubsidiaryCount(stock) > 0 || getStockCooperations(stock).length > 0 || Boolean(stock.tender));
}

/** 0.14 T5: karta koncernu — mapa grupy (matka, zależne, kooperanci) i suma części vs kapitalizacja. */
function renderCompanyCardGroup(stock) {
    const sym = stock.symbol;
    const name = s => s ? `<a href="#" onclick="openDescriptionModal('${s.symbol}'); return false;">${escapeHtml(s.name)}</a> <span class="text-muted">${escapeHtml(s.symbol)}</span>` : '—';
    const parent = stock.isSubsidiaryOf ? stocks.find(s => s.symbol === stock.isSubsidiaryOf) : null;
    const children = stocks.filter(s => s.isSubsidiaryOf === sym && !s.isBankrupt);
    const status = isConcern(stock)
        ? `<p class="text-sm">🏢 <strong>Koncern</strong> od kw. ${stock.concern.since}: ${getStockSegments(stock).length} segmenty, ${children.length} spółek zależnych, czołówka kapitalizacji. Zawiera do ${COOP_MAX_PER_CONCERN} kooperacji.</p>`
        : `<p class="text-sm text-muted">Koncern 🏢 to spółka z górnych ${Math.round(CONCERN_TOP_SHARE * 100)}% kapitalizacji z ≥ 2 segmentami (w tym niepowiązanym z głównym), ≥ ${CONCERN_MIN_SUBSIDIARIES} spółkami zależnymi albo ≥ 2 segmentami i spółką zależną.</p>`;
    const level = getSkillLevel('accountant');
    const groupRows = [
        parent ? `<li>⬆️ matka: ${name(parent)}${Number.isFinite(stock.parentStakePct) ? ` (${(stock.parentStakePct * 100).toFixed(0)}%)` : ''}</li>` : '',
        ...children.map(c => { const stake = (stock.equityStakes?.[c.symbol] || 0) / Math.max(1, c.totalShares); return `<li>↳ zależna: ${name(c)} — ${(stake * 100).toFixed(0)}%, pakiet ${formatZl(getMarketCapValue(c) * stake, 0)} · transfer zysku ${(getProfitTransferRate(c) * 100).toFixed(0)}%${c.groupLoan ? ` · pożyczka ${formatZl(c.groupLoan.principal, 0)} (${(c.groupLoan.rate * 100).toFixed(1)}%${isOffMarketGroupLoan(c) && level >= 4 ? ' 🚩' : ''})` : ''}${canFundControlAgm(stock) ? renderSubsidiaryControls(c, stake) : ''}</li>`; })
    ].filter(Boolean).join('');
    const coops = getStockCooperations(stock).map(coop => {
        const side = getCoopSide(coop, stock);
        const partner = stocks.find(s => s.symbol === side.partner);
        const terms = coop.terms === 'market' ? 'warunki rynkowe' : coop.terms === sym ? '<span class="text-warn">warunki korzystne dla tej spółki</span>' : '<span class="text-down">warunki korzystne dla partnera</span>';
        const flag = coop.flag && level >= 4 ? ` · <span class="text-down" title="Wspólny właściciel ${escapeHtml(coop.flag.name)}: ${(coop.flag.pctA * 100).toFixed(0)}% w ${coop.a} i ${(coop.flag.pctB * 100).toFixed(0)}% w ${coop.b}.">🚩 podmioty powiązane</span>` : '';
        const complaint = coop.complaint ? ` · ⚖️ skarga do KNF${coop.complaint.result ? `: ${escapeHtml(coop.complaint.result)}` : ' w toku'}` : '';
        const actions = [
            canFundControlAgm(stock) ? `<button class="btn-secondary btn-sm" onclick="playerBreakCooperation('${coop.id}', '${sym}')">💔 Zerwij (kara umowna)</button>` : '',
            canPlayerFileKnfComplaint(coop, stock) ? `<button class="btn-secondary btn-sm" onclick="playerFileKnfComplaint('${coop.id}', '${sym}')">⚖️ Skarga do KNF</button>` : ''
        ].join(' ');
        return `<li>🤝 ${name(partner)}: ${escapeHtml(side.ownSeg)} ↔ ${escapeHtml(side.partnerSeg)}, do kw. ${coop.end} · ${terms}${flag}${complaint} ${actions}</li>`;
    }).join('');
    const sotp = getSumOfParts(stock);
    const sotpRows = sotp.parts.map(p => `<tr><td>${escapeHtml(p.label)}</td><td class="text-muted text-xs">${escapeHtml(p.method)}</td><td class="cell-number">${formatZl(p.value, 0)}</td></tr>`).join('');
    const premium = sotp.premium === null ? '' : `<p class="text-sm">Kapitalizacja ${formatZl(sotp.cap, 0)} vs suma części ${formatZl(sotp.total, 0)}: <strong class="${sotp.premium >= 0 ? 'text-up' : 'text-down'}">${sotp.premium >= 0 ? 'premia' : 'dyskonto'} holdingowe ${(Math.abs(sotp.premium) * 100).toFixed(0)}%</strong>.</p>`;
    const partners = getPlayerCooperationPartners(stock);
    const form = partners.length ? `<div class="d-flex gap-2 flex-wrap items-center mt-2">
            <select id="coop-partner-${sym}" aria-label="Kooperant">${partners.map(p => `<option value="${p.symbol}">${escapeHtml(p.name)} (${(getPlayerStakePct(p) * 100).toFixed(0)}%)</option>`).join('')}</select>
            <select id="coop-terms-${sym}" aria-label="Warunki"><option value="market">warunki rynkowe</option><option value="${sym}">korzystne dla ${escapeHtml(stock.symbol)}</option><option value="partner">korzystne dla partnera</option></select>
            <button class="btn-secondary" onclick="(() => { const p = document.getElementById('coop-partner-${sym}').value, t = document.getElementById('coop-terms-${sym}').value; playerProposeCooperation('${sym}', p, t === 'partner' ? p : t); })()">🤝 Zaproponuj kooperację (12 kw.)</button>
        </div><p class="text-xs text-muted">Umowy między spółkami jednego właściciela przy nierównych udziałach dostają czerwoną flagę; warunki nierynkowe przenoszą ok. 1% przychodów segmentu na kwartał i grożą skargą do KNF.</p>` : '';
    const tender = stock.tender ? `<p class="text-sm">📣 Wezwanie: ${escapeHtml(stock.tender.buyerName)} kupuje akcje po <strong>${formatZl(stock.tender.price)}</strong> do kw. ${stock.tender.until}.${getPlayerStakePct(stock) > 0 ? ` <button class="btn-secondary btn-sm" onclick="playerTenderDecision('${sym}', 'sell')">Sprzedaj w wezwaniu</button>` : ''}</p>` : '';
    const policy = canFundControlAgm(stock) && children.length ? `<label class="text-sm"><input type="checkbox" ${stock.groupPolicy ? 'checked' : ''} onchange="playerSubsidiaryAction('${children[0].symbol}', 'policy', this.checked)"> Wspólna polityka kadrowa dla grupy</label>` : '';
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('grupaKapitalowa');
    return `${status}${tender}${policy}
        <div class="cc-grid">
            <section><h4>Mapa grupy</h4><ul class="text-sm">${groupRows || '<li class="text-muted">brak spółek zależnych i matki</li>'}${coops || '<li class="text-muted">brak kooperacji</li>'}</ul>${form}</section>
            <section><h4>Suma części (SOTP)</h4><table class="asset-mini-table w-full"><tbody>${sotpRows}</tbody></table>${premium}
                <p class="text-xs text-muted">Segmenty wyceniane medianą C/Z sektora (przy stracie: C/S × 0,5), pakiety w zależnych po kursie rynkowym. Uproszczenie: zysk matki zawiera transfer zysku córek.</p></section>
        </div>`;
}
