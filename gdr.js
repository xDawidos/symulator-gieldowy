// =================================================================================
// 0.16.1 G3: KWITY DEPOZYTOWE (GDR) I WYDARZENIE „GIGANT WKRACZA NA SCENĘ”
// GDR to instrument pochodny: notowany w złotych kwit na akcję zagranicznego giganta. Cena = cena obca × kurs × (1 ± 0,5%).
// Pełne podwójne notowanie i córki zagraniczne dopiero w 0.20; dołączenie kraju (0.16.2) zamieni kwity 1:1 w akcje.
// Obcy emitent jest uproszczony: cena w swojej walucie, bez pracowników, segmentów i bilansu.
// Zasada niezmiennika: posiadacze GDR (dziś tylko gracz) ≤ pula kwitów (float); reszta puli jest „w rynku”.
// =================================================================================

/** Giganci zagraniczni z załącznika B planu 0.16 (cena w walucie kraju, sektor z istniejącego rejestru). */
const FOREIGN_GIANTS = [
    { id: 'GLS', name: 'Glasses', country: 'US', currency: 'USD', sector: 'Technologia', price: 180 },
    { id: 'AMZ', name: 'Amazonka Corp.', country: 'US', currency: 'USD', sector: 'Usługi', price: 140 },
    { id: 'PER', name: 'Pear', country: 'US', currency: 'USD', sector: 'Technologia', price: 210 },
    { id: 'VWA', name: 'VolksDeutsch Auto', country: 'DE', currency: 'EUR', sector: 'Motoryzacja', price: 95 },
    { id: 'CRH', name: 'Chemiefabrik Rhein AG', country: 'DE', currency: 'EUR', sector: 'Chemia', price: 70 },
    { id: 'TYM', name: 'Toyotomi Motors', country: 'JP', currency: 'JPY', sector: 'Przemysł', price: 2800 },
    { id: 'ALB', name: 'Alibaka Group', country: 'CN', currency: 'CNY', sector: 'Technologia', price: 90 },
    { id: 'TNC', name: 'Tencentyl', country: 'CN', currency: 'CNY', sector: 'Technologia', price: 380 },
    { id: 'LVT', name: 'Luxe Vuitonnet', country: 'FR', currency: 'EUR', sector: 'Dobra konsumpcyjne', price: 640 },
    { id: 'IKJ', name: 'IKEJA', country: 'SE', currency: 'SEK', sector: 'Dobra konsumpcyjne', price: 420 },
    { id: 'ROV', name: 'Rochevartis Pharma', country: 'CH', currency: 'CHF', sector: 'Medycyna', price: 105 },
    { id: 'NSK', name: 'Nestlik', country: 'CH', currency: 'CHF', sector: 'Żywność', price: 98 },
    { id: 'HSR', name: 'HelloSir!', country: 'IN', currency: 'INR', sector: 'Technologia', price: 1500 },
    { id: 'KWS', name: 'Krzemowa Wyspa Semiconductor', country: 'TW', currency: 'TWD', sector: 'Technologia', price: 700 }
];

const GDR_RULES = {
    depositSpread: 0.005,       // cena kwitu = cena obca × kurs × (1 ± 0,5%)
    float: 1_000_000,           // pula kwitów jednego giganta
    eventChancePerQuarter: 0.115, // ≈ raz na 2 lata, ale nie częściej niż co 4 kwartały
    eventCooldownQuarters: 4,
    gdrShare: 0.70,             // reszta zdarzeń to zagraniczne przejęcie spółki krajowej
    takeoverPremium: [0.25, 0.45],
    driftYear: 0.08, bearDriftYear: -0.20, volScale: 0.24, historyWeeks: 52
};

let foreignIssuers = {};      // id giganta → instancja (tworzona przy pierwszej potrzebie)
let giantEventState = { lastQ: -99, count: 0, gdr: 0, takeover: 0 };
let giantEventLog = [];       // { q, kind, giant | symbol, ... } — ostatnie zdarzenia
let pendingGiantEvent = null; // wynik do pokazania w oknie (UI w ui.js; bez UI zostaje w dzienniku)

function resetGdrState() { foreignIssuers = {}; giantEventState = { lastQ: -99, count: 0, gdr: 0, takeover: 0 }; giantEventLog = []; pendingGiantEvent = null; if (typeof resetCountriesState === 'function') resetCountriesState(); }

function getGdrSymbol(issuer) { return issuer.kind === 'share' ? `${issuer.id}.${issuer.country}` : `${issuer.id}.GDR`; }
function getForeignIssuerList() { return Object.values(foreignIssuers); }

function createForeignIssuer(giantId) {
    const def = FOREIGN_GIANTS.find(g => g.id === giantId);
    if (!def || foreignIssuers[giantId]) return foreignIssuers[giantId] || null;
    const issuer = { id: def.id, name: def.name, country: def.country, currency: def.currency, sector: def.sector, price: def.price, float: GDR_RULES.float, holders: {}, history: [def.price], listedQ: typeof macro === 'object' ? macro.quarter : 0 };
    foreignIssuers[giantId] = issuer;
    return issuer;
}

/** Cena obca × kurs: środek kwitu w złotych. */
function getGdrMid(issuer) { return toPln(issuer.price, issuer.currency); }
function getGdrQuote(issuer, side = 'buy') { const mid = getGdrMid(issuer); return side === 'buy' ? mid * (1 + GDR_RULES.depositSpread) : mid * (1 - GDR_RULES.depositSpread); }
function getGdrHeld(issuer, holder = 'player') { return Number(issuer.holders?.[holder]) || 0; }
function getGdrFree(issuer) { return issuer.float - Object.values(issuer.holders || {}).reduce((s, v) => s + (Number(v) || 0), 0); }

/** Wartość kwitów gracza po cenie środkowej (do NAV). */
function getFundGdrValue() {
    let total = 0;
    for (const issuer of Object.values(foreignIssuers)) total += getGdrHeld(issuer) * getGdrMid(issuer);
    return total;
}

/** Tygodniowy ruch cen obcych emitentów: dryf wg fazy rynku krajowego i zmienność wg beta sektora. */
function stepForeignIssuers() {
    const phase = typeof getMarketRegime === 'function' ? getMarketRegime('home')?.phase : 'bull';
    const bear = ['bear', 'capitulation'].includes(phase) || (typeof isCrisisActive === 'function' && isCrisisActive());
    for (const issuer of Object.values(foreignIssuers)) {
        if (issuer.kind === 'share') continue; // spółki krajów dołączonych: countries.js
        const beta = (typeof SECTORS === 'object' && SECTORS[issuer.sector]?.profile?.beta) || 1;
        const sigma = GDR_RULES.volScale * beta / Math.sqrt(52);
        const drift = (bear ? GDR_RULES.bearDriftYear : GDR_RULES.driftYear) / 52;
        issuer.price = Math.max(issuer.price * 0.2, issuer.price * Math.exp(drift - sigma * sigma / 2 + sigma * normalFx()));
        issuer.history.push(Math.round(issuer.price * 1000) / 1000);
        if (issuer.history.length > GDR_RULES.historyWeeks) issuer.history.shift();
    }
}

function buyGdr(giantId, quantity) {
    const issuer = foreignIssuers[giantId];
    quantity = Math.floor(Number(quantity));
    if (!issuer) return { ok: false, reason: 'Ten kwit nie jest notowany.' };
    if (!(quantity > 0)) return { ok: false, reason: 'Podaj liczbę kwitów.' };
    if (typeof playerFund !== 'object' || !playerFund) return { ok: false, reason: 'Kwity kupuje fundusz.' };
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return { ok: false, reason: 'Handel wstrzymany — zadziałał bezpiecznik giełdowy.' };
    if (quantity > getGdrFree(issuer)) return { ok: false, reason: 'Nie ma tylu kwitów w obrocie.' };
    const cost = quantity * getGdrQuote(issuer, 'buy');
    if (cost > playerCash + 1e-9) return { ok: false, reason: 'Za mało gotówki funduszu.' };
    const spreadCost = cost - quantity * getGdrMid(issuer);
    playerCash -= cost;
    issuer.holders.player = getGdrHeld(issuer) + quantity;
    if (spreadCost > 0) recordPayment('player-fund', 'external:depozytariusz', spreadCost, 'GDR: spread depozytowy');
    return { ok: true, cost };
}

function sellGdr(giantId, quantity) {
    const issuer = foreignIssuers[giantId];
    quantity = Math.floor(Number(quantity));
    if (!issuer || !(quantity > 0)) return { ok: false, reason: 'Podaj liczbę kwitów.' };
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return { ok: false, reason: 'Handel wstrzymany — zadziałał bezpiecznik giełdowy.' };
    const held = getGdrHeld(issuer);
    if (quantity > held) return { ok: false, reason: 'Za mało kwitów.' };
    const proceeds = quantity * getGdrQuote(issuer, 'sell');
    const spreadCost = quantity * getGdrMid(issuer) - proceeds;
    issuer.holders.player = held - quantity;
    if (issuer.holders.player <= 0) delete issuer.holders.player;
    playerCash += proceeds;
    if (spreadCost > 0) recordPayment('player-fund', 'external:depozytariusz', spreadCost, 'GDR: spread depozytowy');
    return { ok: true, proceeds };
}

/** Przymusowa płynność: po obcej gotówce sprzedajemy kwity (od największej pozycji). Zwraca zdobyte złote. */
function liquidateGdr(amountPln) {
    let raised = 0;
    const positions = Object.values(foreignIssuers).filter(i => getGdrHeld(i) > 0).sort((a, b) => getGdrHeld(b) * getGdrMid(b) - getGdrHeld(a) * getGdrMid(a));
    for (const issuer of positions) {
        if (raised >= amountPln) break;
        const qty = Math.min(getGdrHeld(issuer), Math.ceil((amountPln - raised) / getGdrQuote(issuer, 'sell')));
        const result = sellGdr(issuer.id, qty);
        if (result.ok) raised += result.proceeds;
    }
    return raised;
}

// ---------------------------------------------------------------------------------
// Wydarzenie „Gigant wkracza na scenę”
// ---------------------------------------------------------------------------------

/** Cel zagranicznego przejęcia: zdrowa spółka krajowa z górnej połowy kapitalizacji (te same zabezpieczenia co przy wycofaniu z giełdy). */
function pickForeignTakeoverTarget() {
    const pool = stocks.filter(s => hasListingMoveGuards(s) && (Number(s.financialHealth) || 0) >= 0 && !s.assetType && (playerPortfolio?.[s.symbol]?.shares || 0) <= s.totalShares * 0.3);
    if (pool.length < 4) return null;
    pool.sort((a, b) => getMarketCapValue(b) - getMarketCapValue(a));
    const top = pool.slice(0, Math.max(3, Math.ceil(pool.length / 2)));
    const weights = top.map(s => Math.sqrt(getMarketCapValue(s)));
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < top.length; i++) { roll -= weights[i]; if (roll <= 0) return top[i]; }
    return top[0];
}

/** Zagraniczny inwestor wykupuje wszystkich akcjonariuszy z premią i zdejmuje spółkę z giełdy; gotówka płynie z zewnątrz (po kursie). */
function executeForeignTakeover(stock, giant) {
    const premium = getRandomInRange(GDR_RULES.takeoverPremium[0], GDR_RULES.takeoverPremium[1]);
    const offer = stock.price * (1 + premium);
    const heldByPlayer = (playerPortfolio?.[stock.symbol]?.shares || 0) > 0 || (playerWallet?.portfolio?.[stock.symbol]?.shares || 0) > 0;
    const symbol = stock.symbol, name = stock.name;
    const paid = buyOutAllHolders(stock, offer);
    removeStockFromGame(symbol);
    purgeSymbolHolders(symbol);
    for (const ai of aiCompetitors) for (const loan of ai.loans || []) if (loan.collateral?.symbol === symbol) loan.collateral = null;
    for (const bank of commercialBanks) for (const loans of Object.values(bank.loanPortfolio || {})) if (Array.isArray(loans)) for (const loan of loans) if (loan.collateral?.symbol === symbol) loan.collateral = null;
    if (paid > 0) recordPayment('external:inwestor-zagraniczny', 'external:akcjonariusze', paid, 'Przejęcie przez zagranicznego inwestora');
    const text = `🌍 ${giant.name} (${CURRENCIES[giant.currency]?.name || giant.currency}) przejmuje ${name} (${symbol}): wykup wszystkich akcjonariuszy po cenie ${formatNumberPl(offer, 2)} zł (premia ${(premium * 100).toFixed(0)}%). Spółka znika z giełdy.`;
    logEvent(text, 'market');
    if (typeof pushNews === 'function') pushNews(text, null);
    if (heldByPlayer && typeof addMail === 'function') addMail({ sender: 'PULS', subject: `🌍 ${name}: przejęcie przez zagraniczny koncern`, body: `${text}\n\nTwoje akcje rozliczono gotówką po cenie wykupu.` });
    return { symbol, name, offer, premium, paid, heldByPlayer };
}

/** Raz na kwartał: szansa na zdarzenie (≈ raz na 2 lata, nie częściej niż raz na rok). force: 'gdr' | 'takeover' wymusza rodzaj. */
function processGiantEventQuarterly(force = null) {
    const q = typeof macro === 'object' ? macro.quarter : 0;
    if (!force && (q - giantEventState.lastQ < GDR_RULES.eventCooldownQuarters || q < 4 || Math.random() >= GDR_RULES.eventChancePerQuarter)) return null;
    const free = FOREIGN_GIANTS.filter(g => !foreignIssuers[g.id]);
    let kind = force || (Math.random() < GDR_RULES.gdrShare ? 'gdr' : 'takeover');
    if (kind === 'gdr' && !free.length) kind = 'takeover';
    let result = null;
    if (kind === 'takeover') {
        const target = pickForeignTakeoverTarget();
        const giant = FOREIGN_GIANTS[Math.floor(Math.random() * FOREIGN_GIANTS.length)];
        if (target) result = { kind: 'takeover', giant: giant.id, giantName: giant.name, country: giant.country, ...executeForeignTakeover(target, giant) };
        else if (free.length) kind = 'gdr';
    }
    if (!result && kind === 'gdr' && free.length) {
        const giant = free[Math.floor(Math.random() * free.length)];
        const issuer = createForeignIssuer(giant.id);
        const text = `🌍 Gigant wkracza na scenę: ${issuer.name} (${issuer.country}) wchodzi na naszą giełdę jako kwity depozytowe ${getGdrSymbol(issuer)}. Cena w złotych = cena w ${issuer.currency} × kurs, spread depozytowy ${(GDR_RULES.depositSpread * 100).toFixed(1)}%.`;
        logEvent(text, 'market');
        if (typeof pushNews === 'function') pushNews(text, null);
        result = { kind: 'gdr', giant: giant.id, giantName: issuer.name, country: issuer.country, currency: issuer.currency, symbol: getGdrSymbol(issuer), priceForeign: issuer.price, pricePln: getGdrMid(issuer) };
    }
    if (!result) return null;
    result.q = q;
    giantEventState.lastQ = q; giantEventState.count++; giantEventState[result.kind]++;
    giantEventLog.push({ q, kind: result.kind, giant: result.giant, symbol: result.symbol || null });
    if (giantEventLog.length > 20) giantEventLog.shift();
    pendingGiantEvent = result;
    if (result.kind === 'gdr' && typeof unlockAcademyEntry === 'function') unlockAcademyEntry('adrGdr');
    if (typeof showGiantEventWindow === 'function') showGiantEventWindow(result); // okno z pauzą (ui.js); bez interfejsu zostaje dziennik
    return result;
}

// ---------------------------------------------------------------------------------
// Niezmienniki, zapis
// ---------------------------------------------------------------------------------

function checkGdrInvariants() {
    const problems = [];
    for (const issuer of Object.values(foreignIssuers)) {
        if (!(issuer.price > 0) || !Number.isFinite(issuer.price)) problems.push(`cena ${issuer.id} (${issuer.price})`);
        let sum = 0;
        for (const [holder, qty] of Object.entries(issuer.holders || {})) {
            if (!Number.isFinite(qty) || qty < 0) problems.push(`kwity ${getGdrSymbol(issuer)}: ${holder} ${qty}`);
            sum += qty;
        }
        if (sum > issuer.float + 1e-6) problems.push(`kwity ${getGdrSymbol(issuer)}: posiadacze ${sum} > pula ${issuer.float}`);
    }
    return problems;
}

function getGdrSnapshot() { return { issuers: Object.fromEntries(Object.entries(foreignIssuers).filter(([, i]) => i.kind !== 'share')), events: giantEventState, log: giantEventLog }; } // akcje krajów: countries.js

function applyGdrSnapshot(snapshot) {
    resetGdrState();
    if (!snapshot || typeof snapshot !== 'object') return; // zapis sprzed v16: bez kwitów
    for (const raw of Object.values(snapshot.issuers || {})) {
        const def = FOREIGN_GIANTS.find(g => g.id === raw?.id);
        if (!def || !(Number(raw.price) > 0)) continue;
        const issuer = createForeignIssuer(def.id);
        issuer.price = Number(raw.price);
        issuer.float = Number(raw.float) > 0 ? Number(raw.float) : GDR_RULES.float;
        issuer.listedQ = Number(raw.listedQ) || 0;
        issuer.history = Array.isArray(raw.history) ? raw.history.map(Number).filter(Number.isFinite).slice(-GDR_RULES.historyWeeks) : [issuer.price];
        for (const [holder, qty] of Object.entries(raw.holders || {})) if (Number(qty) > 0) issuer.holders[holder] = Number(qty);
    }
    const ev = snapshot.events || {};
    giantEventState = { lastQ: Number.isFinite(Number(ev.lastQ)) ? Number(ev.lastQ) : -99, count: Number(ev.count) || 0, gdr: Number(ev.gdr) || 0, takeover: Number(ev.takeover) || 0 };
    giantEventLog = Array.isArray(snapshot.log) ? snapshot.log.slice(-20) : [];
}
