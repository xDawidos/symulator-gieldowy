// =================================================================================
// 0.18.1 P5: INTERFEJS ŁAŃCUCHÓW — Państwo → Łańcuchy (wzór: energy_ui.js) i wiersz łańcucha w karcie spółki.
// Wygląd: plany/design/13_lancuch_0.18.md i makiety/13_lancuch_018.html (kafle w kolumnach ogniw, krawędzie SVG, szczegóły ogniwa).
// Status zawsze ikoną, słowem i liczbą (kolor nigdy jedynym nośnikiem). Dane: chains.js (chainState), goods.js (GOODS, CHAINS, CHAIN_RECIPES).
// =================================================================================

const CHAIN_STATUS = {
    surplus: { w: 'Nadwyżka', badge: 'up', ic: 'faza-hossa' }, ok: { w: 'Równowaga', badge: 'neutral', ic: 'waga' },
    tight: { w: 'Napięte', badge: 'warn', ic: 'alert' }, short: { w: 'Niedobór', badge: 'warn', ic: 'alert' }, broken: { w: 'Przerwane', badge: 'down', ic: 'blokada' }
};
const chainStatusOf = b => b >= 1.05 ? 'surplus' : b >= 0.95 ? 'ok' : b >= 0.85 ? 'tight' : b >= 0.6 ? 'short' : 'broken';
const CHAIN_COLS = [['mining', 'Wydobycie', 'kopalnia'], ['processing', 'Przetwórstwo', 'huta'], ['factory', 'Fabryka', 'fabryka'], ['transport', 'Transport', 'transport-land'], ['distribution', 'Dystrybucja', 'koszyk'], ['consumption', 'Konsumpcja', 'klienci']];
let chainsView = { chain: 'metals', good: null, country: null };

const chPct = v => `${formatNumberPl(Math.round(v * 100), 0)}%`;
const chSigned = v => `${v > 0.0005 ? '▲ +' : v < -0.0005 ? '▼ ' : '■ '}${formatNumberPl(Math.round(v * 100), 0)}%`;

/** Krawędzie łańcucha: dobro A → dobro B, gdy producent B ma A w recepturze; grubość z udziału wsadu. */
function getChainEdges(chain) {
    const edges = [];
    for (const to of chain.goods) for (const p of GOOD_BY_ID[to].producers) {
        const rec = CHAIN_RECIPES[matchChainKey(CHAIN_RECIPES, p)] || {};
        for (const from of chain.goods) if (from !== to && rec[from] > 0 && !edges.some(e => e[0] === from && e[1] === to)) edges.push([from, to, Math.max(1.5, Math.min(7, rec[from] * 25))]);
    }
    return edges;
}

function chainNodeHtml(g, v, selected) {
    const k = chainStatusOf(v.b), s = CHAIN_STATUS[k], good = GOOD_BY_ID[g];
    const label = `${good.name}, ${GOOD_CLASSES[good.cls]}: ${s.w}, pokrycie ${chPct(v.b)}, zapas ${formatNumberPl(v.cover, 1)} kw., cena ${chSigned(v.P - 1)}`;
    return `<button type="button" data-node="${g}" class="ch-node st-${k}${selected ? ' is-selected' : ''}" aria-pressed="${selected}" aria-label="${escapeHtml(label)}" onclick="selectChainGood('${g}')">
        <span class="ch-node-top">${uiIcon(good.icon, 14)}<strong title="${escapeHtml(good.name)}">${escapeHtml(good.name)}</strong><span class="gd-cls${good.cls === 'K' || good.cls === 'L' ? ' is-' + good.cls : ''}" title="${escapeHtml(GOOD_CLASSES[good.cls])}">${good.cls}</span></span>
        <span><span class="badge badge--${s.badge}">${uiIcon(s.ic, 12)} ${s.w}</span> <b class="ch-num">${chPct(v.b)}</b></span>
        <span class="limit-meter${v.cover < 0.4 ? ' is-warn' : ''}" style="--v:${Math.min(100, v.cover * 100)};--limit:50" aria-hidden="true"><i></i><b></b></span><small>zapas ${formatNumberPl(v.cover, 1)} kw.</small>
        <small>${chSigned(v.P - 1)} ceny · ${escapeHtml(v.where || '—')}</small>
    </button>`;
}

/** Widok dobra w kraju + gdzie się je produkuje (kraje z największą podażą). */
function getChainNodeView(g, country) {
    const v = getChainGoodView(g, country);
    if (!v) return null;
    const s = chainState.g[g], cs = chainState.cal.countries;
    v.where = cs.map((c, i) => [c, s.S[i]]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c).join(', ');
    return v;
}

function renderChainsPanel() {
    if (typeof chainState === 'undefined' || !chainState?.cal) return '<p class="notice-inline">' + uiIcon('info', 14) + '<span>Dane pojawią się po pierwszym kwartale gry.</span></p>';
    const cs = chainState.cal.countries, home = typeof getStartCountry === 'function' ? getStartCountry() : 'PL';
    if (!chainsView.country || !cs.includes(chainsView.country)) chainsView.country = cs.includes(home) ? home : cs[0];
    const chain = CHAINS[chainsView.chain] || CHAINS.metals, country = chainsView.country;
    const goods = chain.goods.filter(g => chainState.g[g]);
    if (!chainsView.good || !goods.includes(chainsView.good)) chainsView.good = goods.find(g => GOOD_BY_ID[g].cls === 'P') || goods[0];
    const views = Object.fromEntries(goods.map(g => [g, getChainNodeView(g, country)]).filter(([, v]) => v));
    const shock = typeof crisisLine === 'object' && crisisLine?.id === 'supply' ? crisisLine : null;
    const chips = Object.entries(CHAINS).filter(([, c]) => c.active).map(([id, c]) => `<button type="button" class="sector-chip${id === chainsView.chain ? ' active' : ''}" aria-pressed="${id === chainsView.chain}" onclick="selectChain('${id}')">${uiIcon(c.icon, 14)} ${escapeHtml(c.name)}${shock ? ' <small>szok</small>' : ''}</button>`).join('');
    const countryChips = cs.map(c => `<button type="button" class="sector-chip${c === country ? ' active' : ''}" aria-pressed="${c === country}" onclick="selectChainCountry('${c}')">${escapeHtml(COUNTRY_DEFS?.[c]?.name || (c === 'PL' ? 'Polska' : c))}</button>`).join('');
    const list = Object.entries(views), weakest = list.sort((a, b) => a[1].b - b[1].b)[0];
    const finalGood = chain.goods.filter(g => views[g] && ['Z', 'L'].includes(GOOD_BY_ID[g].cls)).at(-1), fin = finalGood ? views[finalGood] : null;
    const cover = list.length ? list.reduce((s, [, v]) => s + v.cover, 0) / list.length : 0;
    const ticker = `<div class="bank-ticker mt-3">
        <div class="bank-ticker-item"><span>Najsłabsze ogniwo</span><strong>${escapeHtml(weakest ? GOOD_BY_ID[weakest[0]].name : '—')}</strong><small class="text-muted">pokrycie ${weakest ? chPct(weakest[1].b) : '—'}</small></div>
        <div class="bank-ticker-item"><span>Na końcu łańcucha</span><strong>${fin ? chPct(Math.min(1, fin.b)) : '—'}</strong><small class="text-muted">popytu pokryte${finalGood ? ` (${escapeHtml(GOOD_BY_ID[finalGood].name.toLowerCase())})` : ''}</small></div>
        <div class="bank-ticker-item"><span>Cena na końcu</span><strong class="${fin && fin.P > 1.0005 ? 'text-down' : fin && fin.P < 0.9995 ? 'text-up' : ''}">${fin ? chSigned(fin.P - 1) : '—'}</strong><small class="text-muted">wobec startu</small></div>
        <div class="bank-ticker-item"><span>Zapas w łańcuchu</span><strong>${formatNumberPl(cover, 1)} kw.</strong><small class="text-muted">cel ${formatNumberPl(CHAIN_RULES.cover, 1)} kw.</small></div></div>`;
    const cols = CHAIN_COLS.map(([kind, name, ic]) => [kind, name, ic, goods.filter(g => views[g] && GOOD_BY_ID[g].link === kind)]).filter(c => c[3].length);
    const axis = `<div class="ch-flow mt-3" id="chain-flow"><svg class="ch-edges" id="chain-edges" aria-hidden="true"></svg>
        <ol class="ch-axis" style="grid-template-columns:repeat(${cols.length}, minmax(0, 1fr))" aria-label="Ogniwa łańcucha ${escapeHtml(chain.name)}">${cols.map(([, name, ic, gs]) => `<li class="ch-col"><h5>${uiIcon(ic, 14)} ${name}</h5>${gs.map(g => chainNodeHtml(g, views[g], g === chainsView.good)).join('')}</li>`).join('')}</ol></div>
        <ul class="ch-legend"><li><span class="ln"></span> normalnie</li><li><span class="ln is-tight"></span> napięte</li><li><span class="ln is-broken"></span> niedobór lub przerwa</li><li>grubość: udział wsadu</li></ul>`;
    const mode = typeof CHAINS_ACTIVE !== 'undefined' && !CHAINS_ACTIVE ? `<p class="notice-inline">${uiIcon('info', 14)}<span>Tryb pomiaru: łańcuch liczy podaż i popyt, ale jeszcze nie zmienia wyników spółek.</span></p>` : '';
    return `${mode}<div class="sector-chips mt-3" role="group" aria-label="Łańcuch">${chips}</div><div class="sector-chips mt-2" role="group" aria-label="Kraj">${countryChips}</div>${ticker}${axis}${renderChainDetail(chainsView.good, country)}${renderChainShock(shock)}`;
}

function renderChainDetail(g, country) {
    const good = GOOD_BY_ID[g], s = chainState.g[g];
    if (!good || !s) return '';
    const cs = chainState.cal.countries, ci = cs.indexOf(country), v = getChainNodeView(g, country), k = chainStatusOf(v.b), st = CHAIN_STATUS[k];
    const rows = cs.map((c, i) => ({ c, S: s.S[i], D: s.D[i], b: s.b[i], base: s.D0[i] || s.D[i] || 1 })).filter(r => r.S > 0 || r.D > 0).sort((x, y) => y.D - x.D).slice(0, 8)
        .map(r => `<tr><td>${escapeHtml(COUNTRY_DEFS?.[r.c]?.name || (r.c === 'PL' ? 'Polska' : r.c))}</td><td class="text-right">${formatNumberPl(r.S / r.base, 2)}</td><td class="text-right">${formatNumberPl(r.D / r.base, 2)}</td><td class="text-right">${chPct(r.b)}</td></tr>`).join('');
    const producers = good.producers.join(', ').replace(/\//g, ' · ');
    const inputs = Object.entries(CHAIN_RECIPES[matchChainKey(CHAIN_RECIPES, good.producers[0])] || {}).map(([id, sh]) => `${GOOD_BY_ID[id]?.name || id} ${chPct(sh)} kosztu`).join(', ') || 'surowce z giełdy towarowej (profil spółek)';
    const users = Object.entries(good.use).map(([key, sh]) => `${key === '*' ? 'inne' : key === '#' ? 'obywatele' : key.replace('/', ' · ')} ${chPct(sh)}`).join(', ');
    return `<div class="ch-detail mt-3">
        <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon(good.icon, 20)}</span><div><h4>${escapeHtml(good.name)} <span class="gd-cls" title="${escapeHtml(GOOD_CLASSES[good.cls])}">${good.cls}</span></h4><span class="bank-card-type">${escapeHtml(producers)}</span></div></header>
            <div class="en-state st-${k}"><span class="badge badge--${st.badge}">${uiIcon(st.ic, 12)} ${st.w}</span> pokrycie <b class="ch-num">${chPct(v.b)}</b>, cena wewnętrzna <b class="ch-num">${chSigned(v.P - 1)}</b></div>
            <table class="asset-mini-table w-full"><thead><tr><th>Kraj</th><th class="text-right">Podaż</th><th class="text-right">Popyt</th><th class="text-right">Bilans</th></tr></thead><tbody>${rows}</tbody></table>
            <p class="text-xs text-muted">Podaż i popyt wobec popytu kraju na starcie (1,00 = poziom startowy). Niedobór pokrywa import z krajów z nadwyżką do limitu portów.</p></article>
        <article class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('magazyn', 20)}</span><div><h4>Zapas i przepływ</h4><span class="bank-card-type">co ogniwo bierze i komu oddaje</span></div></header>
            <p class="text-sm">Zapas <b class="ch-num">${formatNumberPl(v.cover, 1)} kw.</b> z celu ${formatNumberPl(CHAIN_RULES.cover, 1)} kw. · import ${formatNumberPl(ci >= 0 ? s.I[ci] / Math.max(1e-9, s.D[ci]) * 100 : 0, 0)}% popytu, eksport ${formatNumberPl(ci >= 0 ? s.E[ci] / Math.max(1e-9, s.D[ci]) * 100 : 0, 0)}%</p>
            <span class="limit-meter${v.cover < 0.4 ? ' is-warn' : ''} en-wide" role="img" aria-label="Zapas ${formatNumberPl(v.cover, 1)} kwartału, cel ${formatNumberPl(CHAIN_RULES.cover, 1)}" style="--v:${Math.min(100, v.cover * 100)};--limit:50"><i></i><b></b></span>
            <h5 class="bank-section-title mt-3">Wsady</h5><p class="text-sm">${escapeHtml(inputs)}.</p>
            <h5 class="bank-section-title mt-3">Odbiorcy</h5><p class="text-sm">${escapeHtml(users)}. Przy niedoborze obronność i spółki państwowe odczuwają go słabiej, reszta proporcjonalnie.</p></article></div>`;
}

function renderChainShock(line) {
    if (!line) return `<p class="notice-inline">${uiIcon('ok', 14)}<span>Żadne ogniwo nie jest teraz w szoku podażowym. Taki szok pojawia się najwyżej 1–2 razy na 20 lat.</span></p>`;
    const def = CRISIS_LINES.supply, variant = def.variants[line.variant], idx = CRISIS_STAGES.indexOf(line.stage);
    const steps = CRISIS_STAGES.map((st, i) => `<li class="${i < idx ? 'done' : i === idx ? 'current' : ''}"${i === idx ? ' aria-current="step"' : ''}><span class="crisis-step-no">${i + 1}</span>${CRISIS_STAGE_NAMES[st]}${i === idx ? ' (teraz)' : ''}</li>`).join('');
    const list = items => items.map(it => `<li><span>${escapeHtml(it.subsector ? `${it.sector} · ${it.subsector}` : it.sector)}</span><b class="ch-num ${it.premium < 0 ? 'text-down' : 'text-up'}">${it.premium < 0 ? '▼ ' : '▲ +'}${formatNumberPl(Math.round(it.premium * 100), 0)}%</b></li>`).join('');
    return `<div class="alert alert--warn mt-3">${uiIcon('szok', 16)}<div><strong>${escapeHtml(variant?.name || def.name)}.</strong> ${escapeHtml(variant?.burst || '')}</div></div>
        <div class="crisis-section mt-3"><ol class="crisis-axis" aria-label="Etapy szoku">${steps}</ol></div>
        <div class="ch-gainers mt-3"><article class="bank-card"><h5 class="bank-section-title">${uiIcon('faza-bessa', 14)} Tracą (premia kursu)</h5><ul>${list(def.lose)}</ul></article>
        <article class="bank-card"><h5 class="bank-section-title">${uiIcon('faza-hossa', 14)} Zyskują</h5><ul>${list(def.gain)}</ul></article></div>`;
}

/** Krawędzie SVG między kaflami (po renderze; tylko przy otwartej zakładce). */
function drawChainEdges() {
    const flow = typeof document !== 'undefined' ? document.getElementById('chain-flow') : null, svg = document.getElementById('chain-edges');
    if (!flow || !svg || !chainState?.cal || getComputedStyle(svg).display === 'none') return;
    const box = flow.getBoundingClientRect(), chain = CHAINS[chainsView.chain], country = chainsView.country;
    const r = id => flow.querySelector(`[data-node="${id}"]`)?.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.innerHTML = getChainEdges(chain).map(([a, b, w]) => {
        const A = r(a), B = r(b), v = getChainGoodView(a, country);
        if (!A || !B || !v) return '';
        const x1 = A.right - box.left, y1 = A.top + A.height / 2 - box.top, x2 = B.left - box.left, y2 = B.top + B.height / 2 - box.top, mx = (x1 + x2) / 2, k = chainStatusOf(v.b);
        return `<path class="g-edge${k === 'tight' ? ' is-tight' : k === 'short' || k === 'broken' ? ' is-broken' : ''}" d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" stroke-width="${w}"/>`;
    }).join('');
}
function rerenderChainsPanel() { if (typeof stateTab !== 'undefined' && stateTab === 'chains' && typeof updateStateModalContent === 'function') updateStateModalContent(); }
function selectChain(id) { chainsView.chain = id; chainsView.good = null; rerenderChainsPanel(); }
function selectChainGood(g) { chainsView.good = g; rerenderChainsPanel(); }
function selectChainCountry(c) { chainsView.country = c; rerenderChainsPanel(); }
function openChainForStock(symbol) {
    const tile = getStockChainTile(stocks.find(s => s.symbol === symbol) || getCompanyCardSource?.(symbol));
    if (tile) { chainsView = { chain: tile.chain, good: tile.good, country: tile.country }; }
    if (typeof openStateModal === 'function') openStateModal();
    if (typeof switchStateTab === 'function') switchStateTab('chains');
}

/** Wiersz łańcucha w karcie spółki (Przegląd): tylko spółki, których podsektor jest ogniwem. */
function getStockChainTile(stock) {
    if (!stock || typeof chainState === 'undefined' || !chainState?.cal) return null;
    const src = stock.foreignSource || stock, country = src.kind === 'share' ? src.country : (typeof getStartCountry === 'function' ? getStartCountry() : 'PL');
    const seg = src.kind === 'share' ? { sector: src.sectors?.[0]?.[0], subsector: src.subsector } : getMainSegment(src);
    if (!seg?.sector) return null;
    const key = getChainUnitKey(seg.sector, seg.subsector);
    const good = GOODS.find(g => g.active && !g.contract && g.producers.includes(key) && chainState.g[g.id]);
    const recipe = CHAIN_RECIPES[matchChainKey(CHAIN_RECIPES, key)] || {};
    const mainIn = Object.entries(recipe).filter(([id]) => chainState.g[id]).sort((a, b) => b[1] - a[1])[0];
    if (!good && !mainIn) return null;
    const chainId = Object.entries(CHAINS).find(([, c]) => c.active && c.goods.includes(good?.id || mainIn[0]))?.[0];
    const v = good ? getChainGoodView(good.id, country) : null, vin = mainIn ? getChainGoodView(mainIn[0], country) : null;
    const share = Object.entries(recipe).reduce((s, [id, sh]) => s + (chainState.g[id] ? sh : 0), 0);
    const shocked = typeof crisisLine === 'object' && crisisLine?.id === 'supply';
    const exposure = share * (shocked ? 2 : 1) >= 0.3 ? 'wysokie' : share >= 0.12 ? 'średnie' : 'niskie';
    return { chain: chainId || 'metals', good: good?.id || mainIn?.[0], country, key, product: good, v, input: mainIn ? GOOD_BY_ID[mainIn[0]] : null, inShare: mainIn?.[1] || 0, vin, exposure, share };
}
function renderStockChainTiles(stock) {
    const t = getStockChainTile(stock);
    if (!t) return '';
    const cover = (t.v || t.vin).cover, inWord = t.input ? `${chPct(t.inShare)} kosztu z: ${t.input.name.toLowerCase()}` : 'bez wsadu z łańcucha';
    return `<div class="cc-kpis">
        <div class="cc-kpi" title="Ogniwo w łańcuchu ${escapeHtml(CHAINS[t.chain]?.name || '')}"><span>Ogniwo</span><strong style="font-family:inherit">${uiIcon(t.product?.icon || 'fabryka', 14)} ${escapeHtml(t.key.split('/').pop())}</strong><em class="text-muted">${escapeHtml(t.product ? `produkt: ${t.product.name.toLowerCase()}` : CHAINS[t.chain]?.name || '')}</em></div>
        <div class="cc-kpi${cover < 0.4 ? ' st-tight' : ''}" title="Zapas dobra w kraju wobec celu"><span>Zapas</span><strong>${formatNumberPl(cover, 1)} kw.</strong><em class="${cover < 0.4 ? 'text-warn' : 'text-muted'}">${cover < 0.4 ? '▼' : '■'} cel ${formatNumberPl(CHAIN_RULES.cover, 1)} kw.</em></div>
        <div class="cc-kpi" title="Udział wsadów z łańcucha w kosztach"><span>Wystawienie na szok</span><strong>${t.exposure}</strong><em class="${t.exposure === 'wysokie' ? 'text-warn' : 'text-muted'}">${escapeHtml(inWord)}</em></div></div>
        <p class="text-sm"><button type="button" class="btn-link" onclick="openChainForStock('${escapeHtml(stock.symbol)}')">Zobacz łańcuch ${escapeHtml(CHAINS[t.chain]?.name || '')}</button></p>`;
}

// --- Akademia (0.18.1 P5): hasła odblokowuje zakładka Łańcuchy i linia `supply` ---
if (typeof ACADEMY_ENTRIES === 'object') Object.assign(ACADEMY_ENTRIES, {
    lancuchWartosci: {
        title: 'Łańcuch wartości', get icon() { return academyIcon('lancuch'); },
        text: 'Łańcuch wartości to droga towaru od wydobycia do klienta: kopalnia daje rudę, huta robi z niej stal, fabryka maszyny i samochody, a handel sprzedaje je ludziom. Każde ogniwo dokłada swoją marżę i jest odbiorcą poprzedniego. Gdy jedno ogniwo staje, kolejne dostają mniej wsadu i płacą za niego więcej, a dostawcy z innych krajów mogą na tym zarobić.',
        example: () => typeof chainState !== 'undefined' && chainState?.cal ? `W grze są teraz ${Object.keys(chainState.g).length} dobra w łańcuchach, liczone dla ${chainState.cal.countries.length} krajów.` : 'Dane pojawią się po pierwszym kwartale gry.',
        quiz: [
            { q: 'Co jest wsadem huty?', a: ['ruda żelaza i węgiel', 'samochody', 'piwo'], c: 0 },
            { q: 'Kto zyskuje, gdy krajowa huta stoi?', a: ['huty i dostawcy z innych krajów', 'krajowa motoryzacja', 'nikt'], c: 0 },
            { q: 'Co dokłada każde ogniwo łańcucha?', a: ['swoją marżę', 'tylko koszty transportu', 'podatek od akcji'], c: 0 }
        ]
    },
    efektByka: {
        title: 'Efekt byka (bicza)', get icon() { return academyIcon('szok'); },
        text: 'Efekt byka (bicza) to wzmacnianie wahań w górę łańcucha: mały spadek sprzedaży w sklepach daje większy spadek zamówień w fabrykach, a jeszcze większy w hutach i kopalniach, bo każdy po drodze tnie też zapasy. Działa w obie strony: przy szoku podażowym braki docierają do kolejnych ogniw z opóźnieniem kwartału lub dwóch.',
        example: () => typeof crisisLine === 'object' && crisisLine?.id === 'supply' ? `Trwa szok podażowy, etap ${CRISIS_STAGE_NAMES[crisisLine.stage]}.` : 'Szok podażowy jest teraz nieaktywny.',
        quiz: [
            { q: 'Gdzie wahania są największe?', a: ['na początku łańcucha (huty, kopalnie)', 'w sklepach', 'wszędzie po równo'], c: 0 },
            { q: 'Dlaczego wahania rosną?', a: ['bo ogniwa zmieniają też zapasy', 'bo rośnie inflacja', 'bo spada kurs walut'], c: 0 },
            { q: 'Kiedy brak stali odczuje motoryzacja?', a: ['z opóźnieniem 1–2 kwartałów', 'tego samego dnia', 'nigdy'], c: 0 }
        ]
    },
    bilansDobra: {
        title: 'Bilans dobra', get icon() { return academyIcon('waga'); },
        text: 'Bilans dobra porównuje podaż (produkcja w kraju, import i zapas ponad cel) z popytem odbiorców. Powyżej 1 jest nadwyżka i cena wewnętrzna spada, poniżej 1 brakuje towaru i cena rośnie. Zapas to bufor: pełny magazyn łagodzi szok, ale jego utrzymanie kosztuje. Brak pokrywa najpierw import z krajów z nadwyżką, do limitu portów.',
        example: () => { const v = typeof getChainGoodView === 'function' && chainState?.cal ? getChainGoodView('steel', typeof getStartCountry === 'function' ? getStartCountry() : 'PL') : null; return v ? `Stal w kraju: bilans ${formatNumberPl(v.b * 100, 0)}%, zapas ${formatNumberPl(v.cover, 1)} kw.` : 'Dane pojawią się po pierwszym kwartale gry.'; },
        quiz: [
            { q: 'Co znaczy bilans 0,8?', a: ['brakuje 20% towaru', 'jest 20% nadwyżki', 'cena spadnie'], c: 0 },
            { q: 'Co pokrywa niedobór najpierw?', a: ['import z krajów z nadwyżką', 'drukowanie pieniędzy', 'nic'], c: 0 },
            { q: 'Do czego służy zapas?', a: ['łagodzi szok podażowy', 'podnosi kurs', 'zmniejsza podatki'], c: 0 }
        ]
    }
});
