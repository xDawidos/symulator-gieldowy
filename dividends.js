// dividends.js — Dywidendy (wersja 0.10.2, część M2)
//
// Dywidendowy arystokrata: spółka, która ≥ 12 kwartałów z rzędu ogłasza dywidendę i jej nie obniża
// (tolerancja 5%). Bonusy w skali modyfikatorów kursu: +0,2 stabilności (zmienność −20%),
// +0,05 przyrostu (dryf kursu jak cechy prezesa), +0,07 zainteresowania (wycena ×1,07).
// Obcięcie dywidendy odbiera status i przecenia kurs. Nie dotyczy REIT-ów.
// Historia wypłat i seria kwartałów w karcie spółki; polityka zarządu reaguje na stopy procentowe.

const ARISTOCRAT_MIN_STREAK = 12; // audyt A4: przy 8 kwartałach status miało 20–40% spółek
const ARISTOCRAT_BONUS = { stability: 0.2, growth: 0.05, interest: 0.07 };
const DIVIDEND_CUT_TOLERANCE = 0.95;
const ARISTOCRAT_CUT_PENALTY = -0.06;
const DIVIDEND_HISTORY_LIMIT = 8;

/** Wołane po ogłoszeniu (lub braku) dywidendy w raporcie kwartalnym. */
function updateDividendStreak(stock) {
    if (stock.assetType) return;
    const declared = stock.pendingDividend?.dps || 0;
    const previous = Number(stock.lastDeclaredDps) || 0;
    const wasAristocrat = Boolean(stock.isDividendAristocrat);

    if (declared > 0 && (previous <= 0 || declared >= previous * DIVIDEND_CUT_TOLERANCE)) {
        stock.dividendStreak = (Number(stock.dividendStreak) || 0) + 1;
    } else {
        stock.dividendStreak = declared > 0 ? 1 : 0; // obcięta dywidenda zaczyna serię od nowa
    }
    stock.lastDeclaredDps = declared;
    stock.isDividendAristocrat = stock.dividendStreak >= ARISTOCRAT_MIN_STREAK;

    if (!wasAristocrat && stock.isDividendAristocrat) {
        logEvent(`👑 ${stock.name} zostaje dywidendowym arystokratą — ${stock.dividendStreak} kwartałów rosnącej lub stałej dywidendy.`, 'company');
    } else if (wasAristocrat && !stock.isDividendAristocrat) {
        applyPriceEffect(stock.symbol, ARISTOCRAT_CUT_PENALTY, 'negative', 'company');
        logEvent(`💔 ${stock.name} ${declared > 0 ? 'obcina' : 'wstrzymuje'} dywidendę i traci status dywidendowego arystokraty. Kurs spada.`, 'company');
    }
}

/** Wpis do historii wypłat (wołane z payCompanyDividend). */
function recordDividendPayment(stock, dps) {
    if (!Array.isArray(stock.dividendHistory)) stock.dividendHistory = [];
    stock.dividendHistory.unshift({ dps, yield: dps / Math.max(0.01, stock.price), at: typeof getMailClockMs === 'function' ? getMailClockMs() : Date.now() });
    stock.dividendHistory.length = Math.min(stock.dividendHistory.length, DIVIDEND_HISTORY_LIMIT);
}

/** Stopa dywidendy z ostatnich 4 wypłat (≈ roczna). */
function getTrailingDividendYield(stock) {
    if (stock.assetType === 'REIT') return stock.lastDividend?.yield ? stock.lastDividend.yield * 4 : 0;
    const paid = (stock.dividendHistory || []).slice(0, 4).reduce((sum, entry) => sum + entry.dps, 0);
    return paid / Math.max(0.01, stock.price);
}

function getAristocratValuationFactor(stock) {
    return stock?.isDividendAristocrat ? 1 + ARISTOCRAT_BONUS.interest : 1;
}

/** Presja akcjonariuszy przy wysokich stopach: zdrowa spółka podnosi wypłaty. */
function getRatePressureOnDividend(stock) {
    const rate = Number(centralBank?.baseInterestRate) || 0.05;
    return rate > 0.06 && (Number(stock.financialHealth) || 0) > 0 ? 1 : rate < 0.02 ? -1 : 0;
}

/** Linijka pod nazwą spółki w karcie: status arystokraty, stopa dywidendy, seria. */
function renderDividendBadges(stock) {
    if (stock.assetType && stock.assetType !== 'REIT') return '';
    const yieldPct = (getTrailingDividendYield(stock) * 100).toFixed(2);
    const badge = stock.isDividendAristocrat
        ? `<span class="badge-aristocrat" title="Stabilność +${ARISTOCRAT_BONUS.stability}, przyrost +${ARISTOCRAT_BONUS.growth}, zainteresowanie +${ARISTOCRAT_BONUS.interest}">👑 Dywidendowy arystokrata</span>` : '';
    const history = (stock.dividendHistory || []).slice(0, 6).map(entry => entry.dps.toFixed(2)).join(' · ');
    const market = typeof getStockMarket === 'function' && getStockMarket(stock) !== 'GPW' ? `<span class="badge-market">członek rynku ${escapeHtml(getMarketLabel(getStockMarket(stock)))}</span>` : '';
    return `<p class="dividend-badges">${badge}${market}
        <span class="text-sm">Stopa dywidendy: <strong>${yieldPct}%</strong></span>
        ${stock.assetType ? '' : `<span class="text-sm text-muted">seria: ${stock.dividendStreak || 0}/${ARISTOCRAT_MIN_STREAK} kw.</span>`}
        ${history ? `<span class="text-xs text-muted d-block">Ostatnie wypłaty (zł/akcję): ${history}</span>` : ''}</p>`;
}
