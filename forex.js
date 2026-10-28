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
const FOREX_CODES = () => ['PLN', ...(typeof FOREIGN_CURRENCIES !== 'undefined' ? FOREIGN_CURRENCIES : [])];
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
