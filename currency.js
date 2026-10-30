// =================================================================================
// 0.16.1 G2: WALUTY I KANTOR
// Rejestr walut, kursy (powrót do średniej w twardych widełkach, średnia dryfuje wolno), gotówka w walutach
// (gracz: `playerCashByCurrency`, boty: `entity.cashByCurrency`), kantor ze spreadem 1–2%.
// Waluta bazowa to waluta kraju startowego (0.16.11 K2; PL → PLN). Wewnątrz gry liczymy w „jednostkach gry” = waluta bazowa × BASE_SCALES (PLN 1, EUR 4, USD 4, CZK 0,2),
// więc wszystkie stałe zbalansowane w złotych działają bez zmian, a UI dzieli przez skalę i podpisuje walutą bazową (formatZl).
// `toPln(kwota, waluta)` (nazwa zostaje) jest jedynym przelicznikiem wyceny (NAV, majątek, ranking, niezmienniki): kurs względem waluty bazowej.
// =================================================================================

/** Widełki i kursy startowe (zł za 1 jednostkę) — załącznik F planu 0.16. `safe`: walutowa „bezpieczna przystań” w kryzysie. */
const CURRENCIES = {
    PLN: { code: 'PLN', name: 'złoty', region: 'PL', min: 1, max: 1, start: 1 },
    EUR: { code: 'EUR', name: 'euro', region: 'EU', min: 3.80, max: 5.50, start: 4.30 },
    USD: { code: 'USD', name: 'dolar amerykański', region: 'US', min: 3.40, max: 5.00, start: 4.00, safe: true },
    CHF: { code: 'CHF', name: 'frank szwajcarski', region: 'EU', min: 3.90, max: 5.60, start: 4.50, safe: true },
    SEK: { code: 'SEK', name: 'korona szwedzka', region: 'EU', min: 0.32, max: 0.48, start: 0.40 },
    CZK: { code: 'CZK', name: 'korona czeska', region: 'EU', min: 0.15, max: 0.21, start: 0.18 },
    CNY: { code: 'CNY', name: 'juan', region: 'AS', min: 0.45, max: 0.70, start: 0.57 },
    JPY: { code: 'JPY', name: 'jen', region: 'AS', min: 0.022, max: 0.036, start: 0.029, safe: true },
    INR: { code: 'INR', name: 'rupia indyjska', region: 'AS', min: 0.040, max: 0.060, start: 0.050 },
    TWD: { code: 'TWD', name: 'dolar tajwański', region: 'AS', min: 0.10, max: 0.16, start: 0.13 }
};
const FX_CODES = Object.keys(CURRENCIES).filter(code => code !== 'PLN'); // waluty z własnym procesem kursu (kwotowane w PLN)
/** Waluta bazowa konta wg kraju startowego i skala jednostek gry (kurs ≈ startowy kurs waluty, zaokrąglony). */
const BASE_CURRENCY_BY_COUNTRY = { PL: 'PLN', DE: 'EUR', US: 'USD', CZ: 'CZK' };
const BASE_SCALES = { PLN: 1, EUR: 4, USD: 4, CZK: 0.2 };
/** Waluty inne niż bazowa (kantor, salda): przy PL dawne obce waluty, przy DE także złoty. Tablica zmienia się w miejscu (referencje). */
const FOREIGN_CURRENCIES = Object.keys(CURRENCIES).filter(code => code !== 'PLN');
function getBaseCurrency() {
    const base = typeof playerProfile === 'object' && playerProfile ? playerProfile.baseCurrency : null; // zapis v21; starsze zapisy i PL: złoty
    return BASE_SCALES[base] ? base : 'PLN';
}
function getBaseScale() { return BASE_SCALES[getBaseCurrency()] || 1; }
/** Po zmianie kraju startowego i po wczytaniu zapisu: lista walut obcych bez bazowej. */
function syncBaseCurrency() {
    const base = getBaseCurrency();
    FOREIGN_CURRENCIES.splice(0, FOREIGN_CURRENCIES.length, ...Object.keys(CURRENCIES).filter(code => code !== base));
    if (typeof localizeStaticCurrency === 'function') localizeStaticCurrency(); // 0.16.12 D4: statyczne teksty z PLN/zł → waluta bazowa
}

/** Parametry procesu tygodniowego: powrót do średniej, szum, dryf średniej (±10%/rok), wpływ kryzysu. */
const FX_RULES = {
    reversion: 0.012,       // część odchylenia od średniej wygaszana tygodniowo (połowiczny zanik ≈ 1,1 roku)
    noise: 0.011,           // szum tygodniowy (log) ≈ 8% rocznie
    meanDrift: 0.10,        // roczny dryf średniej (odchylenie standardowe, log)
    crisisPush: 0.0035,     // tygodniowe przesunięcie w kryzysie: bezpieczne przystanie w górę, reszta w dół
    historyWeeks: 104,      // historia do wykresu kantora
    edge: 0.04              // średnia nie zbliża się do krawędzi widełek bliżej niż 4% (log szerokości)
};

/** Spread kantoru (kupno + sprzedaż razem) maleje z kwotą: 2% do 50 tys., 1,5% do 1 mln, 1% powyżej. */
const KANTOR_SPREAD_TIERS = [{ upTo: 50_000, spread: 0.02 }, { upTo: 1_000_000, spread: 0.015 }, { upTo: Infinity, spread: 0.01 }];

let fxRates = {};
let fxMeans = {};
let fxHistory = {};
let fxWeek = 0;
let playerCashByCurrency = {};
let playerFxBasis = {}; // 0.16.9 W1: średni kurs nabycia sald walutowych funduszu (zł za jednostkę; zapis v20)
let kantorOffers = {}; // id dostawcy → { w, s: {waluta: spread}, b: {waluta: przesunięcie kursu} }
let kantorLog = [];   // ostatnie transakcje gracza w kantorze (do podglądu)

function initFxState() {
    fxRates = {}; fxMeans = {}; fxHistory = {}; fxWeek = 0; playerCashByCurrency = {}; playerFxBasis = {}; kantorLog = []; kantorOffers = {};
    for (const code of FX_CODES) {
        fxRates[code] = CURRENCIES[code].start;
        fxMeans[code] = CURRENCIES[code].start;
        fxHistory[code] = [CURRENCIES[code].start];
    }
}
initFxState();

/** Kurs „surowy”: PLN za 1 jednostkę (proces kursów jest kwotowany w złotych niezależnie od waluty bazowej). */
function getRawFxRate(code) {
    if (!code || code === 'PLN') return 1;
    const rate = Number(fxRates[code]);
    return rate > 0 ? rate : (CURRENCIES[code]?.start || 1);
}
/** Jednostki gry za 1 jednostkę waluty (przy bazie PLN: zł za jednostkę, jak dotąd). Waluta bazowa = skala stała, więc jej saldo nie „pływa”. */
function getFxRate(code) {
    if (!code) return 1;
    const base = getBaseCurrency();
    return base === 'PLN' ? getRawFxRate(code) : getRawFxRate(code) / getRawFxRate(base) * BASE_SCALES[base];
}

/** Wartość kwoty w złotych po kursie środkowym. Dla PLN zwraca dokładnie tę samą liczbę (tożsamość wyceny). */
function toPln(amount, code = null) { // bez kodu waluty: kwota już w jednostkach gry
    const value = Number(amount) || 0;
    return !code || (code === 'PLN' && getBaseCurrency() === 'PLN') ? value : value * getFxRate(code);
}

function fromPln(amountPln, code = null) {
    const value = Number(amountPln) || 0;
    return !code || (code === 'PLN' && getBaseCurrency() === 'PLN') ? value : value / getFxRate(code);
}

function normalFx() {
    let sum = 0;
    for (let i = 0; i < 6; i++) sum += Math.random();
    return (sum - 3) / Math.sqrt(0.5); // ≈ N(0, 1)
}

/** Jeden krok tygodniowy kursów (wołany z `processFundWeekly`). Kurs zawsze w widełkach. */
function stepFxRates() {
    fxWeek++;
    const crisis = (typeof isCrisisActive === 'function' && isCrisisActive()) || Boolean(typeof crisisState === 'object' && crisisState?.pendingImport); // 0.16.2 G9: także kryzys zagraniczny w drodze
    const bear = !crisis && typeof getMarketRegime === 'function' && ['bear', 'capitulation'].includes(getMarketRegime('home')?.phase);
    const stress = crisis ? 1 : bear ? 0.5 : 0;
    for (const code of FX_CODES) {
        const def = CURRENCIES[code];
        const lo = Math.log(def.min), hi = Math.log(def.max), width = hi - lo;
        // średnia dryfuje wolno i nie wychodzi poza widełki (miękko, z odbiciem od krawędzi)
        let mean = Math.log(fxMeans[code]) + normalFx() * FX_RULES.meanDrift / Math.sqrt(52);
        const pad = width * FX_RULES.edge * 2.5;
        if (mean < lo + pad) mean = lo + pad + (lo + pad - mean) * 0.5;
        if (mean > hi - pad) mean = hi - pad - (mean - (hi - pad)) * 0.5;
        mean = Math.max(lo + pad, Math.min(hi - pad, mean));
        fxMeans[code] = Math.exp(mean);
        let x = Math.log(fxRates[code]);
        x += FX_RULES.reversion * (mean - x) + normalFx() * FX_RULES.noise;
        if (stress) x += (def.safe ? 1 : (code === 'EUR' || code === 'CHF' ? 0 : -1)) * FX_RULES.crisisPush * stress * (width / 0.35);
        x = Math.max(lo, Math.min(hi, x));
        fxRates[code] = Math.exp(x);
        const history = fxHistory[code] || (fxHistory[code] = []);
        history.push(Math.round(fxRates[code] * 1e5) / 1e5);
        if (history.length > FX_RULES.historyWeeks) history.shift();
    }
}

/** 0.16.6 S1: przepływ bota (Bayer) przesuwa kursy o kwota/głębokość rynku, najwyżej ±1% (widoczne w ostatnim punkcie historii). Zwraca skalę przesunięcia. */
const FX_FLOW_DEPTH_PLN = 5_000_000, FX_FLOW_MAX = 0.01;
function applyFxFlow(buyCode, sellCode, amountPln) {
    const impact = Math.min(FX_FLOW_MAX, Math.max(0, amountPln) / FX_FLOW_DEPTH_PLN);
    for (const [code, sign] of [[buyCode, 1], [sellCode, -1]]) {
        const def = CURRENCIES[code];
        if (!def || !fxRates[code]) continue;
        fxRates[code] = Math.max(def.min, Math.min(def.max, fxRates[code] * (1 + sign * impact)));
        const history = fxHistory[code];
        if (history?.length) history[history.length - 1] = Math.round(fxRates[code] * 1e5) / 1e5;
    }
    return impact;
}

// ---------------------------------------------------------------------------------
// Gotówka w walutach
// ---------------------------------------------------------------------------------

function getCurrencyCash(entity, code) {
    if (entity === 'player' || !entity) return Number(playerCashByCurrency[code]) || 0;
    return Number(entity.cashByCurrency?.[code]) || 0;
}

/** Wartość całej obcej gotówki podmiotu w złotych (gracz: 'player'). */
function getForeignCashPln(entity = 'player') {
    const bag = entity === 'player' ? playerCashByCurrency : entity?.cashByCurrency;
    let total = 0;
    for (const code in bag || {}) total += toPln(bag[code], code);
    return total;
}

/** `rate`: kurs nabycia partii (zł za jednostkę; domyślnie środkowy) — wchodzi do średniego kursu salda funduszu. */
function addCurrencyCash(entity, code, amount, rate = getFxRate(code)) {
    const base = getBaseCurrency();
    if (code === base) { // waluta bazowa to zwykła gotówka (jednostki gry)
        if (base === 'PLN') return;
        if (entity === 'player') playerCash += amount * BASE_SCALES[base]; else entity.cash = (Number(entity.cash) || 0) + amount * BASE_SCALES[base];
        return;
    }
    if (entity === 'player') {
        const old = Number(playerCashByCurrency[code]) || 0;
        if (amount > 0) playerFxBasis[code] = old > 1e-9 && playerFxBasis[code] > 0 ? (old * playerFxBasis[code] + amount * rate) / (old + amount) : rate;
        playerCashByCurrency[code] = old + amount;
        return;
    }
    if (!entity.cashByCurrency) entity.cashByCurrency = {};
    entity.cashByCurrency[code] = (Number(entity.cashByCurrency[code]) || 0) + amount;
}

// ---------------------------------------------------------------------------------
// Kantor
// ---------------------------------------------------------------------------------

function getKantorSpread(amountPln) {
    const value = Math.abs(Number(amountPln) || 0);
    return KANTOR_SPREAD_TIERS.find(tier => value <= tier.upTo).spread;
}

/** Wycena kantoru: kurs kupna (my kupujemy walutę) jest wyższy od środkowego o pół spreadu, kurs sprzedaży niższy. */
function getKantorQuote(code, amountPln, side = 'buy') {
    const mid = getFxRate(code);
    const spread = getKantorSpread(amountPln);
    const rate = side === 'buy' ? mid * (1 + spread / 2) : mid * (1 - spread / 2);
    return { code, mid, rate, spread, side };
}

// ---------------------------------------------------------------------------------
// Dostawcy kursów: kantor gry, banki (internetowy, uniwersalny, międzynarodowy) i Kantor Miejski (spółka miejska poza giełdą).
// Każdy ustala własny spread i własne przesunięcie kursu (odświeżane co kwartał), więc kursy się różnią — warto porównywać.
// ---------------------------------------------------------------------------------

/** Zasady dostawców wg typu banku. spread: zakres całkowity (kupno+sprzedaż); minPln: poniżej tej kwoty spread ×2 (bank międzynarodowy
 *  obsługuje dużych graczy); maxPln: limit jednej transakcji; currencies: oferowane waluty (null = wszystkie). */
const KANTOR_PROVIDER_RULES = {
    [BANK_TYPES.INTERNET]: { spread: [0.010, 0.016], maxPln: 300_000, currencies: ['EUR', 'USD', 'CHF', 'CZK', 'SEK'], tag: 'e-bank' },
    [BANK_TYPES.UNIVERSAL]: { spread: [0.017, 0.026], maxPln: Infinity, currencies: ['EUR', 'USD', 'CHF', 'CZK', 'SEK'], tag: 'bank uniwersalny' },
    [BANK_TYPES.INTERNATIONAL]: { spread: [0.006, 0.011], minPln: 100_000, maxPln: Infinity, currencies: null, tag: 'bank międzynarodowy', gdrSpreadFactor: 0.5 }
};
const MUNICIPAL_KANTOR_RULE = { spread: [0.012, 0.020], maxPln: 30_000, currencies: ['EUR', 'USD', 'CZK'], tag: 'spółka miejska' };
const KANTOR_OFFER_WEEKS = 13; // oferty dostawców odświeżane co kwartał gry

function getMunicipalKantor() { return typeof municipalCompanies !== 'undefined' ? municipalCompanies.find(c => c.kantor) || null : null; }

/** Lista dostawców: kantor gry (standard, wszystkie waluty), aktywne banki z funkcją kantorową i Kantor Miejski. */
function getKantorProviders() {
    const list = [{ id: 'std', name: 'Kantor gry', kind: 'std', tag: 'standard', currencies: null, maxPln: Infinity }];
    for (const bank of typeof commercialBanks !== 'undefined' ? commercialBanks : []) {
        const rule = KANTOR_PROVIDER_RULES[bank.type];
        if (rule && bank.isActive && !bank.isParabank && !bank.frozen) list.push({ id: bank.id, name: bank.name, kind: bank.type === BANK_TYPES.INTERNATIONAL ? 'international' : 'bank', rule, tag: rule.tag, currencies: rule.currencies, maxPln: rule.maxPln });
    }
    if (getMunicipalKantor()) list.push({ id: 'mun-kantor', name: getMunicipalKantor().name, kind: 'municipal', rule: MUNICIPAL_KANTOR_RULE, tag: MUNICIPAL_KANTOR_RULE.tag, currencies: MUNICIPAL_KANTOR_RULE.currencies, maxPln: MUNICIPAL_KANTOR_RULE.maxPln });
    return list;
}

function getKantorProvider(id) { return getKantorProviders().find(p => p.id === id) || null; }

/** Odświeża oferty dostawcy, gdy są starsze niż kwartał: spread z zakresu typu i przesunięcie kursu ≤ ±30% spreadu. */
function ensureKantorOffer(provider) {
    if (provider.kind === 'std') return null;
    const cur = kantorOffers[provider.id];
    if (cur && fxWeek - cur.w < KANTOR_OFFER_WEEKS) return cur;
    const [lo, hi] = provider.rule.spread, offer = { w: fxWeek, s: {}, b: {} };
    const bankFactor = Math.random(); // cały bank jest raz tańszy, raz droższy
    for (const code of FOREIGN_CURRENCIES) {
        const spread = lo + (hi - lo) * Math.min(1, Math.max(0, bankFactor * 0.7 + Math.random() * 0.3));
        offer.s[code] = Math.round(spread * 1e4) / 1e4;
        offer.b[code] = Math.round(spread * (Math.random() * 0.6 - 0.3) * 1e4) / 1e4;
    }
    kantorOffers[provider.id] = offer;
    return offer;
}

/** Notowanie dostawcy: { ok, rate, mid, spread } albo { ok: false, reason }. `mid` to prawdziwy kurs środkowy (do liczenia kosztu spreadu). */
function getProviderQuote(providerId, code, amountPln, side = 'buy') {
    const provider = getKantorProvider(providerId || 'std');
    if (!provider) return { ok: false, reason: 'Ten kantor nie działa.' };
    if (provider.kind === 'std') return { ok: true, ...getKantorQuote(code, amountPln, side), provider };
    if (provider.currencies && !provider.currencies.includes(code)) return { ok: false, reason: `${provider.name} nie wymienia ${code}.` };
    if (Math.abs(amountPln) > provider.maxPln) return { ok: false, reason: `${provider.name}: limit jednej transakcji ${Math.round(provider.maxPln).toLocaleString('pl-PL')} zł.` };
    const offer = ensureKantorOffer(provider);
    const mid = getFxRate(code);
    let spread = offer.s[code];
    if (provider.rule.minPln && Math.abs(amountPln) < provider.rule.minPln) spread *= 2; // mała kwota w banku międzynarodowym
    const own = mid * (1 + offer.b[code]);
    const rate = side === 'buy' ? own * (1 + spread / 2) : own * (1 - spread / 2);
    return { ok: true, code, mid, rate, spread, side, provider };
}

/** Wpływ ze spreadu trafia do dostawcy (bank: gotówka banku; Kantor Miejski: budżet spółki), kantor gry — poza obieg. */
function settleKantorIncome(provider, spreadCost, purpose) {
    if (!(spreadCost > 0)) return;
    if (provider.kind === 'bank' || provider.kind === 'international') {
        const bank = commercialBanks.find(b => b.id === provider.id);
        if (bank) { bank.cash += spreadCost; if (typeof recordPayment === 'function') recordPayment('player-fund', bank.id, spreadCost, purpose); return; }
    } else if (provider.kind === 'municipal') {
        const comp = getMunicipalKantor();
        if (comp) { comp.budget += spreadCost; if (typeof recordPayment === 'function') recordPayment('player-fund', comp.id, spreadCost, purpose); return; }
    }
    if (typeof recordPayment === 'function') recordPayment('player-fund', 'external:kantor', spreadCost, purpose);
}

function canUseKantor() { return Boolean(typeof playerFund === 'object' && playerFund); }

/** Kupno waluty za złote z gotówki funduszu. Zwraca { ok, foreign, spreadCost } albo { ok: false, reason }. */
function kantorBuyCurrency(code, amountPln, providerId = 'std') {
    amountPln = Number(amountPln);
    if (!canUseKantor()) return { ok: false, reason: 'Kantor działa dla funduszu.' };
    if (!FOREIGN_CURRENCIES.includes(code)) return { ok: false, reason: 'Nieznana waluta.' };
    if (!(amountPln >= 1)) return { ok: false, reason: 'Podaj kwotę w złotych.' };
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return { ok: false, reason: 'Handel wstrzymany — zadziałał bezpiecznik giełdowy.' };
    if (amountPln > playerCash + 1e-9) return { ok: false, reason: 'Za mało złotych w gotówce funduszu.' };
    const quote = getProviderQuote(providerId, code, amountPln, 'buy');
    if (!quote.ok) return { ok: false, reason: quote.reason };
    const foreign = amountPln / quote.rate;
    const spreadCost = amountPln - foreign * quote.mid;
    playerCash -= amountPln;
    addCurrencyCash('player', code, foreign, quote.rate);
    settleKantorIncome(quote.provider, spreadCost, 'Kantor: spread');
    if (typeof unlockAcademyEntry === 'function') { unlockAcademyEntry('ryzykoWalutowe'); unlockAcademyEntry('spread'); }
    kantorLog.push({ w: fxWeek, side: 'buy', code, pln: Math.round(amountPln), foreign: Math.round(foreign * 100) / 100, rate: Math.round(quote.rate * 1e5) / 1e5 });
    if (kantorLog.length > 20) kantorLog.shift();
    return { ok: true, foreign, spreadCost, rate: quote.rate };
}

/** Sprzedaż waluty za złote (kwota w walucie obcej). */
function kantorSellCurrency(code, amountForeign, providerId = 'std') {
    amountForeign = Number(amountForeign);
    if (!canUseKantor()) return { ok: false, reason: 'Kantor działa dla funduszu.' };
    if (!FOREIGN_CURRENCIES.includes(code)) return { ok: false, reason: 'Nieznana waluta.' };
    if (!(amountForeign > 0)) return { ok: false, reason: 'Podaj kwotę w walucie.' };
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return { ok: false, reason: 'Handel wstrzymany — zadziałał bezpiecznik giełdowy.' };
    const have = getCurrencyCash('player', code);
    if (amountForeign > have + 1e-9) return { ok: false, reason: 'Za mało tej waluty.' };
    amountForeign = Math.min(amountForeign, have);
    const quote = getProviderQuote(providerId, code, amountForeign * getFxRate(code), 'sell');
    if (!quote.ok) return { ok: false, reason: quote.reason };
    const pln = amountForeign * quote.rate;
    const spreadCost = amountForeign * quote.mid - pln;
    playerCashByCurrency[code] = have - amountForeign;
    if (playerCashByCurrency[code] < 1e-9) delete playerCashByCurrency[code];
    playerCash += pln;
    settleKantorIncome(quote.provider, spreadCost, 'Kantor: spread');
    kantorLog.push({ w: fxWeek, side: 'sell', code, pln: Math.round(pln), foreign: Math.round(amountForeign * 100) / 100, rate: Math.round(quote.rate * 1e5) / 1e5 });
    if (kantorLog.length > 20) kantorLog.shift();
    return { ok: true, pln, spreadCost, rate: quote.rate };
}

/** Przymusowa płynność: najpierw sprzedajemy obcą gotówkę (przed akcjami). Zwraca zdobyte złote. */
function liquidateForeignCash(amountPln, reason = 'brak złotych na obowiązkową płatność') {
    let raised = 0, spread = 0;
    const done = [];
    for (const code of Object.keys(playerCashByCurrency).sort((a, b) => toPln(getCurrencyCash('player', b), b) - toPln(getCurrencyCash('player', a), a))) { // od największego salda: najmniej wymian
        if (raised >= amountPln) break;
        const have = getCurrencyCash('player', code);
        if (!(have > 0)) continue;
        const quote = getKantorQuote(code, amountPln - raised, 'sell');
        const need = Math.min(have, (amountPln - raised) / quote.rate);
        const result = kantorSellCurrency(code, need);
        if (result.ok) { raised += result.pln; spread += result.spreadCost; done.push(`${formatNumberPl(need, 2)} ${code}`); }
    }
    // 0.16.9 W1: automatyczne przewalutowanie nie dzieje się po cichu — dziennik mówi, co i za ile (z kosztem spreadu)
    if (raised > 0 && typeof logEvent === 'function') logEvent(`💱 ${reason[0].toUpperCase() + reason.slice(1)}: fundusz przewalutował ${done.join(', ')} na ${formatZl(raised, 0)} (spread ${formatZl(spread, 0)}).`, 'warning');
    return raised;
}

/**
 * 0.16.9 W1: obowiązkowe płatności w złotych (opłata za zarządzanie, umorzenia, gwarancje) płaci gotówka PLN; gdy jej brakuje,
 * fundusz przewalutowuje sald walutowe z ostrzeżeniem w dzienniku (spread jest kosztem funduszu). Dobrowolne zakupy złotówkowe nie przewalutowują
 * się same: kupno odmawia z podpowiedzią (zob. getForeignCashHint). Zwraca true, gdy po operacji PLN ≥ kwota.
 */
function ensurePlnCash(amountPln, reason, buffer = 1) { // buffer: przy cyklicznych opłatach przewalutowuje od razu kilka okresów (jeden wpis w dzienniku, jeden spread)
    if (playerCash + 1e-9 >= amountPln) return true;
    liquidateForeignCash(amountPln * buffer - playerCash, reason);
    return playerCash + 1e-9 >= amountPln;
}

/** Podpowiedź do odmowy kupna za złote, gdy fundusz ma gotówkę w walutach (kupno nie przewalutowuje samo). */
function getForeignCashHint() {
    const held = getForeignCashPln('player');
    return held >= 1 ? ` Masz ${formatZl(held, 0)} w walutach — przewalutuj je po kliknięciu w gotówkę funduszu.` : '';
}

/** Salda gotówki funduszu: PLN + waluty z wartością w złotych, udziałem i wynikiem kursowym względem średniego kursu nabycia. */
function getCashBalances() {
    const base = getBaseCurrency(), scale = getBaseScale();
    const rows = [{ code: base, amount: playerCash / scale, rate: 1, pln: playerCash, basis: 1, gainPln: 0 }];
    for (const code of FOREIGN_CURRENCIES) {
        const amount = getCurrencyCash('player', code);
        if (!(amount > 1e-9)) continue;
        const rate = getFxRate(code), basis = playerFxBasis[code] > 0 ? playerFxBasis[code] : rate;
        rows.push({ code, amount, rate: rate / scale, pln: amount * rate, basis: basis / scale, gainPln: amount * (rate - basis) }); // rate i basis w walucie bazowej za 1 jednostkę (UI)
    }
    const total = rows.reduce((s, r) => s + Math.max(0, r.pln), 0) || 1;
    rows.forEach(r => { r.share = Math.max(0, r.pln) / total; });
    return rows;
}

/** Całkowita gotówka funduszu w złotych (PLN + salda walutowe po kursie środkowym) — ta sama liczba wchodzi do NAV. */
function getFundCashTotalPln() { return Math.max(0, Number(playerCash) || 0) + getForeignCashPln('player'); }

/**
 * Zmiana waluty: z `from` na `to` (PLN lub obca) przez kantor; waluta obca na obcą idzie przez złote (dwa spready — wynik w `spreadCost`).
 * `amount` w jednostkach waluty `from`. Wszystko albo nic: kwoty i limity dostawcy sprawdzane przed ruchem sald.
 */
function convertCurrency(from, to, amount, providerId = 'std') {
    amount = Number(amount);
    if (!canUseKantor()) return { ok: false, reason: 'Kantor działa dla funduszu.' };
    if (from === to || ![from, to].every(c => c === getBaseCurrency() || FOREIGN_CURRENCIES.includes(c))) return { ok: false, reason: 'Wybierz dwie różne waluty.' };
    if (!(amount > 0)) return { ok: false, reason: 'Podaj kwotę.' };
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return { ok: false, reason: 'Handel wstrzymany — zadziałał bezpiecznik giełdowy.' };
    const base = getBaseCurrency(), have = from === base ? playerCash : getCurrencyCash('player', from); // waluta bazowa: jednostki gry (UI przelicza przez skalę)
    if (amount > have + 1e-9) return { ok: false, reason: `Za mało ${from} na koncie funduszu.` };
    amount = Math.min(amount, have);
    if (from === base) { const r = kantorBuyCurrency(to, amount, providerId); return r.ok ? { ...r, received: r.foreign, receivedCode: to, spreadCost: r.spreadCost } : r; }
    if (to === base) { const r = kantorSellCurrency(from, amount, providerId); return r.ok ? { ...r, received: r.pln, receivedCode: base, spreadCost: r.spreadCost } : r; }
    const sellQuote = getProviderQuote(providerId, from, amount * getFxRate(from), 'sell');
    if (!sellQuote.ok) return { ok: false, reason: sellQuote.reason };
    const pln = amount * sellQuote.rate, buyQuote = getProviderQuote(providerId, to, pln, 'buy');
    if (!buyQuote.ok) return { ok: false, reason: buyQuote.reason };
    const sold = kantorSellCurrency(from, amount, providerId);
    if (!sold.ok) return sold;
    const bought = kantorBuyCurrency(to, Math.min(sold.pln, playerCash), providerId);
    if (!bought.ok) { // nie powinno się zdarzyć po sprawdzeniu wyżej; wycofanie tylko złotych byłoby gorsze niż zostawić je na koncie PLN
        return { ok: false, reason: `Sprzedano ${from}, ale kupno ${to} się nie udało: ${bought.reason} Złote zostały na koncie PLN.` };
    }
    return { ok: true, received: bought.foreign, receivedCode: to, spreadCost: sold.spreadCost + bought.spreadCost, rate: bought.rate };
}

// ---------------------------------------------------------------------------------
// Niezmienniki, zapis
// ---------------------------------------------------------------------------------

function checkCurrencyInvariants() {
    const problems = [];
    for (const code of FX_CODES) {
        const rate = fxRates[code], def = CURRENCIES[code];
        if (!Number.isFinite(rate) || rate < def.min - 1e-9 || rate > def.max + 1e-9) problems.push(`kurs ${code} poza widełkami: ${rate}`);
    }
    for (const [code, value] of Object.entries(playerCashByCurrency)) {
        if (!Number.isFinite(value) || value < -1e-9) problems.push(`gotówka funduszu w ${code}: ${value}`);
        else if (code in playerFxBasis && !(playerFxBasis[code] > 0)) problems.push(`średni kurs nabycia ${code} nieprawidłowy: ${playerFxBasis[code]}`); // 0.16.9 W1 (v20); brak wpisu = kurs bieżący (getCashBalances)
    }
    if (typeof playerCash === 'number' && playerCash < -1e-6) problems.push(`ujemna gotówka PLN funduszu: ${playerCash}`);
    for (const ai of typeof aiCompetitors !== 'undefined' ? aiCompetitors : []) {
        for (const [code, value] of Object.entries(ai.cashByCurrency || {})) if (!Number.isFinite(value) || value < -1e-9) problems.push(`gotówka ${ai.name} w ${code}: ${value}`);
    }
    return problems;
}

function getCurrencySnapshot() {
    return { rates: fxRates, means: fxMeans, history: fxHistory, week: fxWeek, playerCash: playerCashByCurrency, basis: playerFxBasis, log: kantorLog, offers: kantorOffers };
}

function applyCurrencySnapshot(snapshot) {
    initFxState();
    if (!snapshot || typeof snapshot !== 'object') return; // zapis sprzed v16: kursy startowe, brak walut
    for (const code of Object.keys(CURRENCIES)) {
        const def = CURRENCIES[code];
        if (code === 'PLN') { const pc = Number(snapshot.playerCash?.PLN); if (pc > 0) { playerCashByCurrency.PLN = pc; playerFxBasis.PLN = Number(snapshot.basis?.PLN) > 0 ? Number(snapshot.basis.PLN) : 1; } continue; } // saldo PLN istnieje tylko przy bazie innej niż PLN
        const rate = Number(snapshot.rates?.[code]);
        if (rate >= def.min && rate <= def.max) fxRates[code] = rate;
        const mean = Number(snapshot.means?.[code]);
        if (mean >= def.min && mean <= def.max) fxMeans[code] = mean;
        if (Array.isArray(snapshot.history?.[code])) fxHistory[code] = snapshot.history[code].map(Number).filter(Number.isFinite).slice(-FX_RULES.historyWeeks);
        if (!fxHistory[code]?.length) fxHistory[code] = [fxRates[code]];
        const cash = Number(snapshot.playerCash?.[code]);
        if (cash > 0) {
            playerCashByCurrency[code] = cash;
            const basis = Number(snapshot.basis?.[code]);
            playerFxBasis[code] = basis >= def.min * 0.5 && basis <= def.max * 2 ? basis : fxRates[code]; // v20: zapis v16–v19 nie ma kursu nabycia → bieżący kurs (wynik kursowy liczony od migracji)
        }
    }
    fxWeek = Math.max(0, Number(snapshot.week) || 0);
    kantorLog = Array.isArray(snapshot.log) ? snapshot.log.slice(-20) : [];
    for (const [id, o] of Object.entries(snapshot.offers || {})) if (o && o.s && o.b && Number.isFinite(Number(o.w))) kantorOffers[id] = { w: Number(o.w), s: o.s, b: o.b };
}

/** Szacunek wymiany bez ruchu sald (okno sald walutowych): { ok, received, spreadCost } albo { ok: false, reason }. Te same notowania co convertCurrency. */
function previewConversion(from, to, amount, providerId = 'std') {
    amount = Number(amount);
    if (!(amount > 0) || from === to) return { ok: false, reason: 'Wybierz dwie różne waluty i kwotę.' };
    const base = getBaseCurrency();
    if (from === base) { const q = getProviderQuote(providerId, to, amount, 'buy'); return q.ok ? { ok: true, received: amount / q.rate, spreadCost: amount - amount / q.rate * q.mid } : { ok: false, reason: q.reason }; }
    const sell = getProviderQuote(providerId, from, amount * getFxRate(from), 'sell');
    if (!sell.ok) return { ok: false, reason: sell.reason };
    const pln = amount * sell.rate, sellCost = amount * sell.mid - pln;
    if (to === base) return { ok: true, received: pln, spreadCost: sellCost };
    const buy = getProviderQuote(providerId, to, pln, 'buy');
    return buy.ok ? { ok: true, received: pln / buy.rate, spreadCost: sellCost + (pln - pln / buy.rate * buy.mid) } : { ok: false, reason: buy.reason };
}
