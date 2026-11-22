// =================================================================================
// 0.18.8 D4: AUTOMATY PORTFELA (bez DOM). Każdy po certyfikacie Akademii (MENTOR_TRACKS), działa jak zlecenie gracza
// (te same opłaty i ograniczenia), więc daje tylko oszczędność klików:
//  1) auto-rolowanie lokat: zapadła lokata wraca na ten sam okres do banku z najwyższą stopą (≥ progu minimalnego);
//  2) auto-udział w aukcjach bonów: oferta przy każdej aukcji do limitu gotówki (% gotówki funduszu), cena z minimalnej rentowności;
//  3) alert koncentracji sektora (decyzja 2026-11-14: tylko alert): wiadomość raz przy przekroczeniu limitu, ponownie po zejściu poniżej.
// Stan: playerProfile.automation = { deposits: {on, minRate}, tbills: {on, cashPct, minYield}, sector: {on, limit, alerted: {}}, log: [≤ 20] }.
// =================================================================================
const AUTOMATION_RULES = { logMax: 20, defaults: { deposits: { on: false, minRate: 0.02 }, tbills: { on: false, cashPct: 0.10, minYield: 0.04 }, sector: { on: false, limit: 0.35 } } };
const AUTOMATION_UNLOCK = { deposits: 'risk', tbills: 'analyst', sector: 'risk' }; // certyfikat Akademii (mentor), który odblokowuje automat
const AUTOMATION_LABELS = { deposits: 'Auto-rolowanie lokat', tbills: 'Auto-oferty na aukcjach bonów', sector: 'Alert koncentracji sektora' };

function getAutomation() {
    if (!playerProfile) return null;
    const d = AUTOMATION_RULES.defaults, a = playerProfile.automation || (playerProfile.automation = {});
    for (const k of Object.keys(d)) a[k] = { ...d[k], ...(a[k] || {}) };
    if (!a.sector.alerted) a.sector.alerted = {};
    if (!Array.isArray(a.log)) a.log = [];
    return a;
}
function isAutomationUnlocked(kind) { return Boolean(playerProfile?.mentor?.certificates?.[AUTOMATION_UNLOCK[kind]] !== undefined); }
function isAutomationOn(kind) { const a = getAutomation(); return Boolean(a?.[kind]?.on && isAutomationUnlocked(kind)); }
function setAutomation(kind, patch) { const a = getAutomation(); if (!a || !a[kind]) return null; Object.assign(a[kind], patch); return a[kind]; }
function logAutomation(kind, text) {
    const a = getAutomation(); if (!a) return;
    a.log.unshift({ kind, text, q: typeof macro === 'object' ? macro.quarter : 0 });
    if (a.log.length > AUTOMATION_RULES.logMax) a.log.length = AUTOMATION_RULES.logMax;
}

/** 1) Wołane po zapadnięciu lokaty (processFundDepositsWeekly). */
function autoRollDeposit(deposit, payout) {
    if (!isAutomationOn('deposits') || !(payout >= FUND_DEPOSIT_MIN) || payout > playerCash) return null;
    const best = commercialBanks.filter(canBankTakeFundDeposits).map(b => ({ b, rate: getFundDepositRate(b, deposit.termWeeks) })).sort((x, y) => y.rate - x.rate)[0];
    if (!best || best.rate < getAutomation().deposits.minRate) { logAutomation('deposits', `Lokata ${formatZl(payout, 0)} nie odnowiona: najlepsza stopa ${best ? formatNumberPl(best.rate * 100, 2) + '%' : 'brak banku'} poniżej progu ${formatNumberPl(getAutomation().deposits.minRate * 100, 1)}%.`); return null; }
    const d = openFundDeposit(best.b.id, payout, deposit.termWeeks);
    if (d) logAutomation('deposits', `Lokata ${formatZl(payout, 0)} odnowiona w ${best.b.name} na ${deposit.termWeeks} tyg. (${formatNumberPl(best.rate * 100, 2)}%).`);
    return d;
}

/** Cena bonu (nominał 1000, zapada po ok. kwartale) dla rocznej rentowności `y`. */
const tbillPriceForYield = y => Math.floor(1000 / Math.pow(1 + y, 0.25) * 100) / 100;
/** 2) Wołane po ogłoszeniu aukcji: oferta do limitu gotówki, bez okien i powiadomień jak u gracza. */
function autoBidTBills() {
    if (!isAutomationOn('tbills') || !currentTBillAuction || (typeof playerHasTBillAccess !== 'undefined' && !playerHasTBillAccess)) return null;
    if (currentTBillAuction.bids.some(b => b.bidderId === 'player')) return null;
    const cfg = getAutomation().tbills, price = tbillPriceForYield(cfg.minYield), budget = Math.max(0, playerCash) * cfg.cashPct;
    const quantity = Math.min(currentTBillAuction.quantityAvailable, Math.floor(budget / price));
    if (!(quantity > 0)) return null;
    currentTBillAuction.bids.push({ bidderId: 'player', quantity, price });
    logAutomation('tbills', `Oferta na ${quantity} bonów po ${formatZl(price, 2)} (rentowność ok. ${formatNumberPl(cfg.minYield * 100, 1)}% rocznie).`);
    return { quantity, price };
}

/** Udziały sektorów (sektor główny) w akcjach funduszu. */
function getFundSectorShares() {
    const by = {}; let total = 0;
    for (const [sym, p] of Object.entries(typeof playerPortfolio === 'object' ? playerPortfolio : {})) {
        const s = stocks.find(x => x.symbol === sym); if (!s || s.assetType || !(p?.shares > 0)) continue;
        const v = p.shares * s.price, sec = typeof getMainSector === 'function' ? getMainSector(s) : 'Inne';
        total += v; (by[sec] = by[sec] || { value: 0, top: null, topValue: 0 }).value += v;
        if (v > by[sec].topValue) { by[sec].top = sym; by[sec].topValue = v; }
    }
    return Object.entries(by).map(([sector, x]) => ({ sector, share: total > 0 ? x.value / total : 0, top: x.top }));
}
/** 3) Co tydzień: alert raz przy przekroczeniu limitu; ponownie dopiero po zejściu poniżej. */
function checkSectorConcentration() {
    if (!isAutomationOn('sector')) return [];
    const cfg = getAutomation().sector, sent = [];
    for (const x of getFundSectorShares()) {
        if (x.share > cfg.limit && !cfg.alerted[x.sector]) {
            cfg.alerted[x.sector] = true;
            const text = `${x.sector} to ${formatNumberPl(x.share * 100, 0)}% akcji funduszu (limit ${formatNumberPl(cfg.limit * 100, 0)}%).`;
            if (typeof addMail === 'function') addMail({ sender: 'Dom Maklerski', subject: `Alert koncentracji: ${x.sector}`, body: `${text} Sprawdź pozycje w tym sektorze.`, importance: 2, symbol: x.top });
            logAutomation('sector', text); sent.push(x.sector);
        } else if (x.share <= cfg.limit && cfg.alerted[x.sector]) delete cfg.alerted[x.sector];
    }
    for (const sec of Object.keys(cfg.alerted)) if (!getFundSectorShares().some(x => x.sector === sec)) delete cfg.alerted[sec];
    return sent;
}
