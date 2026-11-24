// =================================================================================
// 0.18.8 D6: PODSUMOWANIA DEKAD I HISTORIA ŚWIATA (bez DOM). Co 10 lat gry raport dekady: wynik funduszu wobec GIG, rynek (GIG,
// inflacja), najlepsza i najgorsza spółka i sektor, kryzysy (z łabędziami), rządy, kariera gracza. Zapis zagregowany (kilkadziesiąt
// liczb na dekadę). Wiadomość TeamedUP! od „Kronika Rynku” (makieta 23 §3), pełna wersja w Ranking → Historia.
// =================================================================================
const DECADE_RULES = { quarters: 40, keep: 30 };
const DECADE_SENDER = 'Kronika Rynku';
function createDecadeState() { return { reports: [], cur: null }; }
let decadeState = createDecadeState();
const decadeQ = () => (typeof macro === 'object' ? Number(macro.quarter) || 0 : 0);
const stockCapNow = s => (Number(s.price) || 0) * (Number(s.totalShares) || 0);

/** Początek dekady: punkty odniesienia (GIG, NAV, kapitalizacje spółek). */
function startDecade(q = decadeQ()) {
    const caps = {};
    for (const s of stocks) if (!s.assetType && !s.isBankrupt && stockCapNow(s) > 0) caps[s.symbol] = Math.round(stockCapNow(s));
    decadeState.cur = { q0: q, gig0: typeof getGigIndexValue === 'function' ? getGigIndexValue() : 0, nav0: typeof getFundNav === 'function' && playerFund ? getFundNav() : 0, caps, infl: 0, n: 0, parties: [] };
}

/** Co kwartał (po advanceMacroQuarter): inflacja, partia rządząca; koniec dekady → raport. */
function noteDecadeQuarter() {
    if (!decadeState.cur) { startDecade(); return null; }
    const c = decadeState.cur, q = decadeQ();
    c.infl += Number(macro?.inflation) || 0; c.n++;
    const party = typeof getRulingParty === 'function' && macro?.election ? getRulingParty()?.name : null;
    if (party && c.parties[c.parties.length - 1] !== party) c.parties.push(party);
    if (q - c.q0 < DECADE_RULES.quarters) return null;
    const report = buildDecadeReport(c, q);
    decadeState.reports = [...decadeState.reports, report].slice(-DECADE_RULES.keep);
    sendDecadeMessage(report);
    startDecade(q);
    return report;
}

function buildDecadeReport(c, q) {
    const n = decadeState.reports.length ? decadeState.reports[decadeState.reports.length - 1].n + 1 : 1;
    const gig1 = typeof getGigIndexValue === 'function' ? getGigIndexValue() : 0, nav1 = typeof getFundNav === 'function' && playerFund ? getFundNav() : 0;
    const changes = [], bySector = {};
    for (const s of stocks) {
        const c0 = c.caps[s.symbol]; if (!(c0 > 0) || s.assetType) continue;
        const ch = s.isBankrupt ? -1 : stockCapNow(s) / c0 - 1;
        changes.push({ symbol: s.symbol, name: s.name, ch });
        const sec = typeof getMainSector === 'function' ? getMainSector(s) : null;
        if (sec) (bySector[sec] = bySector[sec] || []).push(ch);
    }
    changes.sort((a, b) => b.ch - a.ch);
    const sectors = Object.entries(bySector).filter(([, a]) => a.length >= 2).map(([sector, a]) => ({ sector, ch: a.reduce((x, y) => x + y, 0) / a.length })).sort((a, b) => b.ch - a.ch);
    let bestPos = null;
    for (const [sym, p] of Object.entries(typeof playerPortfolio === 'object' ? playerPortfolio : {})) {
        const s = stocks.find(x => x.symbol === sym); if (!s || !(p?.shares > 0) || !(p.avgPrice > 0)) continue;
        const ch = s.price / p.avgPrice - 1; if (!bestPos || ch > bestPos.ch) bestPos = { symbol: sym, name: s.name, ch };
    }
    const crises = (typeof crisisState === 'object' ? crisisState.history || [] : []).filter(h => h.startQ >= c.q0 && h.startQ < q).map(h => ({ id: h.id, name: typeof CRISIS_LINES === 'object' ? CRISIS_LINES[h.id]?.name || h.id : h.id, q: h.startQ }));
    const swans = (typeof blackSwanState === 'object' ? blackSwanState.history || [] : []).filter(h => h.q >= c.q0 && h.q < q).map(h => ({ id: h.id, name: h.name, q: h.q }));
    const pos = typeof CAREER_POSITIONS === 'object' ? CAREER_POSITIONS.find(p => p.id === playerProfile?.positionId)?.name : null;
    const r = x => Math.round(x * 1e4) / 1e4;
    return {
        n, q0: c.q0, q1: q,
        nav0: r(c.nav0), nav1: r(nav1), fund: c.nav0 > 0 ? r(nav1 / c.nav0 - 1) : null, gig: c.gig0 > 0 ? r(gig1 / c.gig0 - 1) : null,
        infl: c.n ? r(c.infl / c.n) : 0,
        best: changes[0] ? { ...changes[0], ch: r(changes[0].ch) } : null, worst: changes.length ? { ...changes[changes.length - 1], ch: r(changes[changes.length - 1].ch) } : null,
        bestSector: sectors[0] ? { ...sectors[0], ch: r(sectors[0].ch) } : null, worstSector: sectors.length ? { ...sectors[sectors.length - 1], ch: r(sectors[sectors.length - 1].ch) } : null,
        bestPos: bestPos ? { ...bestPos, ch: r(bestPos.ch) } : null,
        crises, swans, parties: c.parties.slice(0, 6),
        career: { position: pos, certs: Object.keys(playerProfile?.mentor?.certificates || {}).length, clients: playerFund?.clients?.length || 0 }
    };
}

const decadeYears = rep => [Math.floor(rep.q0 / 4) + 1, Math.floor((rep.q1 - 1) / 4) + 1];
function sendDecadeMessage(rep) {
    if (typeof addMail !== 'function') return;
    const [y0, y1] = decadeYears(rep);
    addMail({ sender: DECADE_SENDER, subject: `Dekada ${rep.n} (rok ${y0}–${y1}): podsumowanie`, importance: 2, action: { type: 'decade', n: rep.n },
        body: `Fundusz ${rep.fund === null ? '—' : formatPct(rep.fund, 0)}, GIG ${rep.gig === null ? '—' : formatPct(rep.gig, 0)}. Pełny raport: Ranking → Historia.` });
}
function getDecadeReport(n) { return decadeState.reports.find(r => r.n === n) || null; }
function getDecadeSnapshot() { return decadeState; }
function applyDecadeSnapshot(snap) { decadeState = { ...createDecadeState(), ...(snap && typeof snap === 'object' ? snap : {}) }; if (!Array.isArray(decadeState.reports)) decadeState.reports = []; }
