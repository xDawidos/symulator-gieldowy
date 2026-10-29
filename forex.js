// forex.js: 0.16.4 G21. Ogólny silnik depozytu (marginEngine) i Forex z dźwignią.
// Silnik jest niezależny od rynku: rynek rejestruje funkcję `priceOf(instrument)`, a pozycje (długie/krótkie, depozyt = wartość / dźwignia)
// są wyceniane, obciążane kosztem utrzymania i zamykane automatycznie, gdy kapitał pozycji spadnie poniżej 50% depozytu.
// 0.17 użyje tego samego silnika do kontraktów towarowych (wystarczy zarejestrować rynek).
// Pozycja nie ma wpływu na akcje; depozyt idzie z gotówki funduszu, a wartość pozycji wchodzi do aktywów (getFundAssets).

const MARGIN_RULES = {
    maxLeverage: 10,          // dźwignia pozycji do 1:10
    fundLeverageCap: 3,       // łączna wartość pozycji ≤ 3 × aktywa funduszu
    warnBelow: 0.7,           // ostrzeżenie (margin call): kapitał < 70% depozytu
    closeBelow: 0.5,          // zamknięcie automatyczne: kapitał < 50% depozytu
    holdingCostYear: 0.03,    // swap: roczny koszt finansowania pożyczonej części wartości pozycji
    entrySpread: 0.002,       // spread przy otwarciu (od wartości pozycji)
    minNotional: 1000
};

const marginMarkets = {};     // id → { name, priceOf(instrument) → liczba > 0 | null }
let marginPositions = [];
let marginNextId = 1;
let marginClosedLog = [];     // ostatnie zamknięcia (do podglądu): { id, instrument, side, pnl, reason, w }

function registerMarginMarket(id, def) { marginMarkets[id] = def; }
function resetMarginState() { marginPositions = []; marginNextId = 1; marginClosedLog = []; }

function getMarginPositions(market) { return marginPositions.filter(p => !market || p.market === market); }
function getMarginPrice(pos) { const m = marginMarkets[pos.market]; const price = m ? Number(m.priceOf(pos.instrument)) : NaN; return price > 0 ? price : pos.entry; }
function getMarginPnl(pos) { return pos.side * pos.notional * (getMarginPrice(pos) / pos.entry - 1); }
/** Kapitał pozycji = depozyt + wynik − naliczony koszt utrzymania (nie spada poniżej 0: strata ograniczona do depozytu). */
function getMarginEquity(pos) { return Math.max(0, pos.deposit + getMarginPnl(pos) - pos.accrued); }
function getMarginCoverage(pos) { return getMarginEquity(pos) / pos.deposit; }
function getFundMarginValue() { return marginPositions.reduce((s, p) => s + getMarginEquity(p), 0); }
function getMarginNotional() { return marginPositions.reduce((s, p) => s + p.notional, 0); }

/** Otwarcie pozycji: depozyt (wartość / dźwignia) i spread z gotówki funduszu. */
function openMarginPosition({ market, instrument, side, notional, leverage }) {
    const m = marginMarkets[market];
    if (!m) return { ok: false, reason: 'Nieznany rynek.' };
    if (typeof playerFund !== 'object' || !playerFund) return { ok: false, reason: 'Pozycje otwiera fundusz.' };
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return { ok: false, reason: 'Handel wstrzymany — zadziałał bezpiecznik giełdowy.' };
    side = side === -1 ? -1 : 1; notional = Number(notional); leverage = Math.floor(Number(leverage));
    if (!(leverage >= 1 && leverage <= MARGIN_RULES.maxLeverage)) return { ok: false, reason: `Dźwignia od 1 do ${MARGIN_RULES.maxLeverage}.` };
    if (!(notional >= MARGIN_RULES.minNotional)) return { ok: false, reason: `Najmniejsza pozycja to ${MARGIN_RULES.minNotional} zł.` };
    const price = Number(m.priceOf(instrument));
    if (!(price > 0)) return { ok: false, reason: 'Nieznany instrument.' };
    if (getMarginNotional() + notional > MARGIN_RULES.fundLeverageCap * getFundAssets() + 1e-9) return { ok: false, reason: `Limit funduszu: pozycje do ${MARGIN_RULES.fundLeverageCap}× aktywów.` };
    const deposit = notional / leverage, spread = notional * MARGIN_RULES.entrySpread;
    if (deposit + spread > playerCash + 1e-9) return { ok: false, reason: 'Za mało gotówki na depozyt i spread.' };
    playerCash -= deposit + spread;
    const pos = { id: marginNextId++, market, instrument, side, notional, leverage, deposit, entry: price, accrued: 0, warned: false, w: typeof fxWeek === 'number' ? fxWeek : 0 };
    marginPositions.push(pos);
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('dzwigniaMarginCall');
    return { ok: true, position: pos, deposit, spread };
}

function closeMarginPosition(id, reason = 'manual') {
    const i = marginPositions.findIndex(p => p.id === id);
    if (i < 0) return { ok: false, reason: 'Brak pozycji.' };
    const pos = marginPositions[i], equity = getMarginEquity(pos);
    marginPositions.splice(i, 1);
    playerCash += equity;
    const pnl = equity - pos.deposit;
    marginClosedLog.push({ id: pos.id, instrument: pos.instrument, side: pos.side, pnl: Math.round(pnl), reason, w: typeof fxWeek === 'number' ? fxWeek : 0 });
    if (marginClosedLog.length > 20) marginClosedLog.shift();
    return { ok: true, equity, pnl, reason };
}

/** Co tydzień: koszt utrzymania, ostrzeżenie o niedoborze depozytu i automatyczne zamknięcie. */
function stepMarginPositions() {
    for (const pos of marginPositions.slice()) {
        pos.accrued += pos.notional * (1 - 1 / pos.leverage) * MARGIN_RULES.holdingCostYear / 52;
        const coverage = getMarginCoverage(pos);
        if (coverage < MARGIN_RULES.closeBelow) {
            const res = closeMarginPosition(pos.id, 'margin');
            const text = `📉 Margin call: pozycja ${pos.side > 0 ? 'długa' : 'krótka'} ${pos.instrument} (dźwignia 1:${pos.leverage}) zamknięta automatycznie. Odzyskano ${formatZl(res.equity, 0)} z depozytu ${formatZl(pos.deposit, 0)}.`;
            if (typeof showToast === 'function') showToast(text, 'error');
            if (typeof addMail === 'function') addMail({ sender: 'Dom maklerski', subject: `📉 Margin call: ${pos.instrument}`, body: text, importance: 3 });
        } else if (coverage < MARGIN_RULES.warnBelow && !pos.warned) {
            pos.warned = true;
            const text = `⚠️ Pozycja ${pos.instrument} (1:${pos.leverage}) ma kapitał ${Math.round(coverage * 100)}% depozytu. Poniżej ${Math.round(MARGIN_RULES.closeBelow * 100)}% zostanie zamknięta.`;
            if (typeof showToast === 'function') showToast(text, 'warning');
        } else if (coverage >= MARGIN_RULES.warnBelow) pos.warned = false;
    }
}

// --- Forex: pary walutowe (kurs krzyżowy z kursów w złotych) ---
const FOREX_CODES = () => (typeof CURRENCIES !== 'undefined' ? Object.keys(CURRENCIES) : ['PLN']); // wszystkie waluty gry, niezależnie od bazowej
function isForexInstrument(pair) { const [a, b] = String(pair).split('/'); return a !== b && FOREX_CODES().includes(a) && FOREX_CODES().includes(b); }
registerMarginMarket('forex', { name: 'Forex', priceOf: pair => isForexInstrument(pair) ? getFxRate(pair.split('/')[0]) / getFxRate(pair.split('/')[1]) : null });
/** Forex dostępny po otwarciu drugiego rynku (przynajmniej jeden kraj obcy). */
function isForexAvailable() { return typeof getJoinedCountries === 'function' && getJoinedCountries().length >= 1; }
function openForexPosition(pair, side, notional, leverage) {
    if (!isForexAvailable()) return { ok: false, reason: 'Forex odblokuje drugi rynek (kraj obcy).' };
    return openMarginPosition({ market: 'forex', instrument: pair, side, notional, leverage });
}

// --- Zapis (pole opcjonalne v16), niezmienniki ---
function getForexSnapshot() {
    if (!marginPositions.length && !marginClosedLog.length) return undefined;
    return { p: marginPositions.map(p => ({ ...p, accrued: Math.round(p.accrued * 100) / 100 })), n: marginNextId, l: marginClosedLog };
}
function applyForexSnapshot(snapshot) {
    resetMarginState();
    if (!snapshot || typeof snapshot !== 'object') return;
    for (const p of Array.isArray(snapshot.p) ? snapshot.p : []) {
        if (!marginMarkets[p?.market] || !(p.deposit > 0) || !(p.entry > 0) || !(p.notional > 0) || !(p.leverage >= 1 && p.leverage <= MARGIN_RULES.maxLeverage)) continue;
        marginPositions.push({ id: Number(p.id) || marginNextId, market: p.market, instrument: String(p.instrument), side: p.side === -1 ? -1 : 1, notional: Number(p.notional), leverage: Math.floor(p.leverage), deposit: Number(p.deposit), entry: Number(p.entry), accrued: Math.max(0, Number(p.accrued) || 0), warned: Boolean(p.warned), w: Number(p.w) || 0 });
    }
    marginNextId = Math.max(Number(snapshot.n) || 1, 1 + marginPositions.reduce((m, p) => Math.max(m, p.id), 0));
    marginClosedLog = Array.isArray(snapshot.l) ? snapshot.l.slice(-20) : [];
}
function checkMarginInvariants() {
    const problems = [], ids = new Set();
    for (const p of marginPositions) {
        if (ids.has(p.id)) problems.push(`pozycja ${p.id} zdublowana`);
        ids.add(p.id);
        if (!(p.leverage >= 1 && p.leverage <= MARGIN_RULES.maxLeverage)) problems.push(`pozycja ${p.id}: dźwignia ${p.leverage}`);
        if (Math.abs(p.deposit - p.notional / p.leverage) > 1e-6) problems.push(`pozycja ${p.id}: depozyt ${p.deposit} ≠ wartość/dźwignia`);
        if (!Number.isFinite(getMarginEquity(p))) problems.push(`pozycja ${p.id}: kapitał nie jest liczbą`);
    }
    return problems;
}

// --- Interfejs: zakładka Forex w kantorze (G22) ---
let forexForm = { base: 'EUR', quote: 'USD', side: 1, notional: 50000, leverage: 5 };
function renderForexTab() {
    if (!isForexAvailable()) return '<p class="text-muted">Forex odblokuje drugi rynek: gdy otworzysz giełdę obcego kraju, pojawią się pary walutowe z dźwignią do 1:10.</p>';
    const codes = FOREX_CODES(), f = forexForm;
    const opts = sel => codes.map(c => `<option value="${c}" ${c === sel ? 'selected' : ''}>${c}</option>`).join('');
    const notional = getMarginNotional(), cap = MARGIN_RULES.fundLeverageCap * getFundAssets();
    const rows = getMarginPositions('forex').map(p => {
        const equity = getMarginEquity(p), cover = getMarginCoverage(p), pnl = equity - p.deposit;
        const state = cover < MARGIN_RULES.closeBelow + 0.1 ? 'ryzyko zamknięcia' : cover < MARGIN_RULES.warnBelow ? 'margin call' : 'bezpieczna';
        return `<tr><td>${escapeHtml(p.instrument)}</td><td>${p.side > 0 ? 'długa' : 'krótka'}</td><td class="text-right">${formatZl(p.notional, 0)}</td><td class="text-right">1:${p.leverage}</td>
            <td class="text-right">${formatZl(p.deposit, 0)}</td><td class="text-right">${formatNumberPl(p.entry, 4)} → ${formatNumberPl(getMarginPrice(p), 4)}</td>
            <td class="text-right">${pnl >= 0 ? '▲ +' : '▼ '}${formatZl(pnl, 0)}</td><td class="text-right">${Math.round(cover * 100)}% (${state})</td>
            <td><button class="btn-ghost" onclick="forexUiClose(${p.id})">Zamknij</button></td></tr>`;
    }).join('');
    return `<p class="text-sm text-muted">Para A/B pokazuje, ile B kosztuje 1 A. Pozycja długa zyskuje, gdy A drożeje wobec B, krótka — gdy tanieje. Depozyt = wartość / dźwignia, pobierany z gotówki funduszu. Poniżej ${Math.round(MARGIN_RULES.warnBelow * 100)}% depozytu dostajesz ostrzeżenie (margin call), poniżej ${Math.round(MARGIN_RULES.closeBelow * 100)}% pozycja zamyka się sama. Strata nie przekroczy depozytu.</p>
        <div class="kantor-form"><label for="fx-base" class="text-sm">Para</label>
            <select id="fx-base" onchange="forexUiSet()">${opts(f.base)}</select> / <select id="fx-quote" onchange="forexUiSet()">${opts(f.quote)}</select>
            <label for="fx-side" class="text-sm">Kierunek</label><select id="fx-side" onchange="forexUiSet()"><option value="1" ${f.side > 0 ? 'selected' : ''}>długa</option><option value="-1" ${f.side < 0 ? 'selected' : ''}>krótka</option></select>
            <label for="fx-notional" class="text-sm">Wartość pozycji (zł)</label><input id="fx-notional" type="number" min="${MARGIN_RULES.minNotional}" step="1000" value="${f.notional}" onchange="forexUiSet()">
            <label for="fx-leverage" class="text-sm">Dźwignia</label><select id="fx-leverage" onchange="forexUiSet()">${Array.from({ length: MARGIN_RULES.maxLeverage }, (_, i) => `<option value="${i + 1}" ${i + 1 === f.leverage ? 'selected' : ''}>1:${i + 1}</option>`).join('')}</select>
            <p class="text-sm" id="fx-preview" aria-live="polite">Depozyt ${formatZl(f.notional / f.leverage, 0)}, spread ${formatZl(f.notional * MARGIN_RULES.entrySpread, 0)}, koszt utrzymania ok. ${formatZl(f.notional * (1 - 1 / f.leverage) * MARGIN_RULES.holdingCostYear, 0)} rocznie.</p>
            <div class="btn-row"><button class="btn-primary" onclick="forexUiOpen()">Otwórz pozycję</button></div></div>
        <p class="text-sm text-muted">Pozycje: ${formatZl(notional, 0)} z limitu ${formatZl(cap, 0)} (${MARGIN_RULES.fundLeverageCap}× aktywa funduszu).</p>
        ${rows ? `<table class="asset-mini-table w-full"><thead><tr><th>Para</th><th>Kierunek</th><th class="text-right">Wartość</th><th class="text-right">Dźwignia</th><th class="text-right">Depozyt</th><th class="text-right">Kurs</th><th class="text-right">Wynik</th><th class="text-right">Kapitał / depozyt</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="text-muted">Brak otwartych pozycji.</p>'}`;
}
function forexUiSet() {
    const v = id => document.getElementById(id)?.value;
    forexForm = { base: v('fx-base') || forexForm.base, quote: v('fx-quote') || forexForm.quote, side: Number(v('fx-side')) < 0 ? -1 : 1, notional: Math.max(0, Number(v('fx-notional')) || 0), leverage: Math.min(MARGIN_RULES.maxLeverage, Math.max(1, Number(v('fx-leverage')) || 1)) };
    if (typeof renderKantor === 'function') renderKantor();
}
function forexUiOpen() {
    const f = forexForm, r = openForexPosition(`${f.base}/${f.quote}`, f.side, f.notional, f.leverage);
    showToast(r.ok ? `Otwarto pozycję ${f.side > 0 ? 'długą' : 'krótką'} ${f.base}/${f.quote}: depozyt ${formatZl(r.deposit, 0)}.` : r.reason, r.ok ? 'success' : 'warning');
    if (typeof renderKantor === 'function') renderKantor();
    if (typeof updateUI === 'function') updateUI();
}
function forexUiClose(id) {
    const r = closeMarginPosition(id);
    showToast(r.ok ? `Pozycja zamknięta: wynik ${r.pnl >= 0 ? '+' : ''}${formatZl(r.pnl, 0)}.` : r.reason, r.ok ? (r.pnl >= 0 ? 'success' : 'info') : 'warning');
    if (typeof renderKantor === 'function') renderKantor();
    if (typeof updateUI === 'function') updateUI();
}
