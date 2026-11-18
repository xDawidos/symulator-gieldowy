// =================================================================================
// 0.18.7 E2: SYSTEM ZADAŃ (makiety 22 i 24) — rejestr i logika bez DOM.
// Dom zadań: TeamedUP! → Zadania i oceny; do panelu funduszu gracz przypina najwyżej 3. Na starcie gra sama przypina
// Pierwsze kroki i dopina kolejne w wolne miejsce. Zadania „Rynek” uruchamiają jawne fakty o GIG (bez nazwy fazy).
// Nagrody tylko na konto prywatne (nic do aktywów funduszu).
// =================================================================================
const TASK_RULES = { pinMax: 3, activeMax: { market: 2, mech: 3 }, marketGapQ: 4, doneKeepQ: 1 };
const TASK_CATS = {
    start: { name: 'Pierwsze kroki', icon: 'start', when: 'od startu gry; znikają po wykonaniu wszystkich' },
    board: { name: 'Od zarządu', icon: 'zarzad', when: 'targety okresu i cele zarządu' },
    market: { name: 'Rynek', icon: 'wykres', when: 'przy dużych ruchach GIG' },
    mech: { name: 'Mechaniki', icon: 'akademia', when: 'gdy masz to, czego zadanie uczy' }
};

/** Stan potrzebny zadaniom (czytany raz na sprawdzenie). */
function getTaskContext() {
    const holdings = Object.entries(typeof playerPortfolio === 'object' ? playerPortfolio : {}).filter(([, h]) => (h?.shares || 0) > 0);
    const stockOf = sym => stocks.find(s => s.symbol === sym);
    const shareValue = holdings.reduce((sum, [sym, h]) => sum + (stockOf(sym)?.price || 0) * h.shares, 0);
    const t = playerProfile?.tasks || {};
    return {
        q: typeof macro === 'object' ? Number(macro.quarter) || 0 : 0,
        holdings, shareValue, stockOf,
        sectors: new Set(holdings.map(([sym]) => { const s = stockOf(sym); return s && typeof getMainSector === 'function' ? getMainSector(s) : null; }).filter(Boolean)),
        deposits: typeof getFundDeposits === 'function' ? getFundDeposits() : [],
        bonds: typeof getFundBondsValue === 'function' ? getFundBondsValue() : 0,
        assets: typeof getFundAssets === 'function' ? getFundAssets() : 0,
        cash: Number(typeof playerCash !== 'undefined' ? playerCash : 0) || 0,
        gig: typeof getBenchmarkValue === 'function' ? getBenchmarkValue() : 0,
        gigPeak: Number(t.gigPeak) || 0, gigQ: t.gigQ || []
    };
}
const pct = (v, max) => ({ value: Math.max(0, Math.min(max, v)), max });

/** Rejestr. check(ctx, task) → { value, max, text }; done, gdy value ≥ max. expired(ctx, task) → true, gdy fakt minął. */
const TASKS = {
    'start.buy': { cat: 'start', title: 'Kup pierwsze akcje', teach: 'Handel: przycisk przy spółce otwiera zlecenie.', go: ['Pokaż rynek', 'market'], reward: { pln: 50 },
        check: c => ({ ...pct(c.holdings.length ? 1 : 0, 1), text: c.holdings.length ? 'masz akcje' : 'brak akcji' }) },
    'start.three': { cat: 'start', title: 'Miej akcje 3 spółek', teach: 'Dywersyfikacja: mniejsze ryzyko jednej spółki.', go: ['Pokaż rynek', 'market'], reward: { pln: 50 }, academy: 'dywersyfikacja',
        check: c => ({ ...pct(c.holdings.length, 3), text: `${Math.min(3, c.holdings.length)} z 3` }) },
    'start.deposit': { cat: 'start', title: 'Załóż lokatę w banku', teach: 'Lokaty: pewny procent za zamrożoną gotówkę.', go: ['Otwórz Bank', 'bank'], reward: { pln: 50 },
        check: c => ({ ...pct(c.deposits.length ? 1 : 0, 1), text: c.deposits.length ? 'lokata założona' : 'brak lokaty' }) },
    'start.boss': { cat: 'start', title: 'Przeczytaj zadanie od szefa', teach: 'Cele zarządu decydują o ocenie i awansie.', go: ['Otwórz TeamedUP!', 'teamedup'], reward: { pln: 50 },
        check: () => { const seen = Boolean(playerProfile?.tasks?.seenBoss); return { ...pct(seen ? 1 : 0, 1), text: seen ? 'przeczytane' : 'nieprzeczytane' }; } },

    'market.dip': { cat: 'market', title: 'Kup tanio w spadkach', teach: 'Spadki to okazja dla cierpliwych: większa wartość akcji funduszu po niższych cenach.', go: ['Pokaż rynek', 'market'], reward: { pln: 120 },
        when: c => c.gigPeak > 0 && c.gig <= c.gigPeak * 0.8,
        start: c => ({ base: c.shareValue, trough: c.gig }),
        fact: c => `GIG jest ${formatNumberPl((1 - c.gig / c.gigPeak) * 100, 0)}% poniżej szczytu.`,
        check: (c, t) => { const target = Math.max(1, t.base * 1.1 || 1); return { ...pct(c.shareValue, target), text: `${formatZl(c.shareValue, 0)} / ${formatZl(target, 0)}` }; },
        expired: (c, t) => { t.trough = Math.min(t.trough || c.gig, c.gig); return c.gig >= t.trough * 1.1; }, expiresText: 'do odbicia GIG o 10%' },
    'market.secure': { cat: 'market', title: 'Zabezpiecz zyski', teach: 'Po długich wzrostach część gotówki lub obligacji chroni wynik przed korektą.', go: ['Otwórz Bank', 'bank'], reward: { pln: 120 },
        when: c => c.gigQ.length >= 6 && c.gigQ[c.gigQ.length - 6] > 0 && c.gig >= c.gigQ[c.gigQ.length - 6] * 1.3,
        fact: c => `GIG urósł o ${formatNumberPl((c.gig / c.gigQ[c.gigQ.length - 6] - 1) * 100, 0)}% w półtora roku.`,
        check: c => { const safe = c.assets > 0 ? (c.cash + c.bonds + c.deposits.reduce((s, d) => s + (d.principal || 0), 0)) / c.assets : 0; return { ...pct(safe * 100, 15), text: `${formatNumberPl(safe * 100, 0)}% / 15% aktywów` }; },
        expired: (c, t) => c.gigPeak > 0 && c.gig <= c.gigPeak * 0.9 || c.q - t.since >= 4, expiresText: 'do korekty GIG o 10% albo 4 kw.' },

    'mech.diversify': { cat: 'mech', title: 'Akcje z 5 różnych sektorów', teach: 'Uczy: dywersyfikacja sektorowa (Akademia: Dywersyfikacja).', go: ['Pokaż rynek', 'market'], reward: { pln: 100 }, academy: 'dywersyfikacja',
        when: c => c.holdings.length >= 3, check: c => ({ ...pct(c.sectors.size, 5), text: `${Math.min(5, c.sectors.size)} z 5` }) },
    'mech.deposit8': { cat: 'mech', title: 'Lokata na co najmniej 8 tygodni', teach: 'Uczy: dłuższy termin lokaty daje wyższą stopę.', go: ['Otwórz Bank', 'bank'], reward: { pln: 80 },
        when: c => c.deposits.length > 0, check: c => { const ok = c.deposits.some(d => (d.termWeeks || 0) >= 8); return { ...pct(ok ? 1 : 0, 1), text: ok ? 'jest' : 'brak' }; } },
    'mech.bonds': { cat: 'mech', title: 'Kup obligacje', teach: 'Uczy: obligacje to stały kupon i mniejsze wahania niż akcje.', go: ['Otwórz Bank', 'bank'], reward: { pln: 100 },
        when: c => c.q >= 2, check: c => ({ ...pct(c.bonds > 0 ? 1 : 0, 1), text: c.bonds > 0 ? formatZl(c.bonds, 0) : 'brak obligacji' }) },
    'mech.stake': { cat: 'mech', title: 'Podnieś wartość swojej spółki o 10%', teach: 'Uczy: duży udział daje głos na WZA (dywidendy, inwestycje).', go: ['Pokaż rynek', 'market'], reward: { pln: 300 },
        when: c => c.holdings.some(([sym, h]) => { const s = c.stockOf(sym); return s?.totalShares > 0 && h.shares / s.totalShares >= 0.2; }),
        start: c => { const [sym] = c.holdings.find(([s, h]) => { const st = c.stockOf(s); return st?.totalShares > 0 && h.shares / st.totalShares >= 0.2; }); const s = c.stockOf(sym); return { symbol: sym, base: s.price * s.totalShares }; },
        check: (c, t) => { const s = c.stockOf(t.symbol); const cap = s ? s.price * s.totalShares : 0; return { ...pct(cap, t.base * 1.1), text: `${s?.name || t.symbol}: ${formatPct(t.base > 0 ? cap / t.base - 1 : 0, 1)} / +10%` }; } },
    'mech.ipo': { cat: 'mech', title: 'Złóż zapis na IPO', teach: 'Uczy: zapisy na debiut, redukcja przy nadsubskrypcji.', go: ['Otwórz Internet', 'internet'], reward: { pln: 100 },
        when: () => stocks.some(s => s.stage === 'ipoOffer'), check: () => { const ok = stocks.some(s => s.stage === 'ipoOffer' && s.ipoOffer?.amount > 0) || Boolean(playerProfile?.tasks?.ipoSubscribed); return { ...pct(ok ? 1 : 0, 1), text: ok ? 'zapis złożony' : 'brak zapisu' }; } },
    'mech.campaign': { cat: 'mech', title: 'Przeprowadź kampanię emisyjną', teach: 'Uczy: nowe udziały i klienci, lock-up transz.', go: ['Pokaż fundusz', 'fund'], reward: { pln: 150 },
        when: c => c.q >= 1, check: () => { const ok = (playerFund?.current?.emissions || 0) > 0 || Boolean(playerFund?.subscription); return { ...pct(ok ? 1 : 0, 1), text: ok ? 'kampania ruszyła' : 'brak kampanii' }; } }
};

function createTaskState(fresh = true) {
    const st = { active: [], pinned: [], done: [], lastEnd: {}, rewards: 0, collapsed: false, seenBoss: false, gigPeak: 0, gigQ: [], message: '' };
    if (fresh) {
        for (const id of Object.keys(TASKS).filter(id => TASKS[id].cat === 'start')) st.active.push({ id, since: 0 });
        st.pinned = st.active.slice(0, TASK_RULES.pinMax).map(t => t.id);
    }
    return st;
}
/** Stan zadań; stary zapis bez pola: bez Pierwszych kroków. */
function ensureTaskState() {
    if (!playerProfile) return null;
    if (!playerProfile.tasks) playerProfile.tasks = createTaskState(false);
    const st = playerProfile.tasks; st.lastEnd = st.lastEnd || {}; st.rewards = Number(st.rewards) || 0; st.gigQ = st.gigQ || [];
    return st;
}
function getTaskProgress(task, ctx = getTaskContext()) {
    const def = TASKS[task.id];
    try { return def ? def.check(ctx, task) : { value: 0, max: 1, text: '' }; } catch (e) { return { value: 0, max: 1, text: '' }; }
}
function isTaskPinned(id) { return Boolean(playerProfile?.tasks?.pinned?.includes(id)); }
/** Przypnij / odepnij. Zwraca { ok, reason }. */
function toggleTaskPin(id) {
    const st = ensureTaskState(); if (!st) return { ok: false };
    if (st.pinned.includes(id)) { st.pinned = st.pinned.filter(x => x !== id); return { ok: true, pinned: false }; }
    if (!st.active.some(t => t.id === id)) return { ok: false, reason: 'Zadanie nie jest aktywne.' };
    if (st.pinned.length >= TASK_RULES.pinMax) return { ok: false, reason: `Przypięte ${TASK_RULES.pinMax} z ${TASK_RULES.pinMax}. Odepnij jedno, żeby przypiąć inne.` };
    st.pinned.push(id); return { ok: true, pinned: true };
}
function payTaskReward(def) {
    const pln = Number(def.reward?.pln) || 0;
    if (!(pln > 0) || !playerWallet) return 0;
    playerWallet.cash += pln; playerProfile.tasks.rewards = (Number(playerProfile.tasks.rewards) || 0) + pln;
    if (typeof recordPayment === 'function') recordPayment('external:korporacja', 'player-wallet', pln, `Zadanie: ${def.title}`);
    return pln;
}
/**
 * Sprawdzenie zadań (po transakcji, przy otwarciu okna, raz na tydzień): wykonane → nagroda (raz), wygasłe → znika,
 * nowe „Rynek”/„Mechaniki” w limitach 2/3, Pierwsze kroki dopinane w wolne miejsce. Zwraca listę komunikatów.
 */
function evaluateTasks() {
    if (!playerProfile?.tasks) return []; // stan tworzy tylko krok tygodniowy i TeamedUP! (bez zmian zapisu „z boku”)
    const st = ensureTaskState();
    const ctx = getTaskContext(), messages = [];
    for (const task of [...st.active]) {
        const def = TASKS[task.id];
        if (!def) { st.active = st.active.filter(t => t !== task); continue; }
        const p = getTaskProgress(task, ctx);
        if (p.value >= p.max) {
            st.active = st.active.filter(t => t !== task); st.pinned = st.pinned.filter(x => x !== task.id);
            st.done.push({ id: task.id, q: ctx.q }); st.lastEnd[task.id] = ctx.q;
            const pln = payTaskReward(def); messages.push(`Zadanie wykonane: ${def.title}${pln ? `, plus ${formatZl(pln, 0)} na konto prywatne` : ''}.`);
        } else if (def.expired && def.expired(ctx, task)) {
            st.active = st.active.filter(t => t !== task); st.pinned = st.pinned.filter(x => x !== task.id); st.lastEnd[task.id] = ctx.q;
        }
    }
    st.done = st.done.filter(d => ctx.q - d.q <= TASK_RULES.doneKeepQ || TASKS[d.id]?.cat === 'start' || TASKS[d.id]?.cat === 'mech'); // „Rynek” wraca do puli; reszta raz na grę
    for (const cat of ['market', 'mech']) {
        for (const [id, def] of Object.entries(TASKS)) {
            if (def.cat !== cat || st.active.filter(t => TASKS[t.id]?.cat === cat).length >= TASK_RULES.activeMax[cat]) continue;
            if (st.active.some(t => t.id === id) || (cat === 'mech' && st.done.some(d => d.id === id)) || (cat === 'market' && (st.lastEnd[id] ?? -99) > ctx.q - TASK_RULES.marketGapQ)) continue;
            let ok = false; try { ok = def.when ? def.when(ctx) : false; } catch (e) { ok = false; }
            if (!ok) continue;
            st.active.push({ id, since: ctx.q, ...(def.start ? def.start(ctx) : {}), ...(def.fact ? { fact: def.fact(ctx) } : {}) });
            messages.push(`Nowe zadanie (${TASK_CATS[cat].name}): ${def.title}.`);
        }
    }
    // Pierwsze kroki dopinają się same w wolne miejsce
    for (const t of st.active) if (TASKS[t.id]?.cat === 'start' && !st.pinned.includes(t.id) && st.pinned.length < TASK_RULES.pinMax) st.pinned.push(t.id);
    if (messages.length) st.message = messages[messages.length - 1];
    return messages;
}
/** Raz na tydzień (main.js): szczyt GIG do zadań „Rynek”, potem sprawdzenie zadań. */
function noteTaskWeek() {
    const st = ensureTaskState(); if (!st) return [];
    const gig = typeof getBenchmarkValue === 'function' ? getBenchmarkValue() : 0;
    if (gig > 0) st.gigPeak = Math.max(st.gigPeak || 0, gig);
    return evaluateTasks();
}
/** Raz na kwartał: zapis GIG do warunku „półtora roku wzrostów”. */
function noteTaskQuarter() {
    const st = ensureTaskState(); if (!st) return;
    const gig = typeof getBenchmarkValue === 'function' ? getBenchmarkValue() : 0;
    if (gig > 0) { st.gigQ.push(gig); if (st.gigQ.length > 8) st.gigQ.shift(); }
}
function getTaskRewardsTotal() { return Number(playerProfile?.tasks?.rewards) || 0; }
