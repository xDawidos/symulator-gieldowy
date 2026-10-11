// =================================================================================
// 0.12 N4: MENTOR — zadania szkoleniowe i certyfikaty (warunek awansu, decyzja użytkownika).
// Trzy ścieżki: Analityk (przed Kierownikiem projektu), Ryzyko (przed Członkiem zarządu),
// Audyt (przed CEO). Certyfikat = zaliczona wymagana liczba zadań ze ścieżki.
// Stan: playerProfile.mentor = { active: [{ id, since, data }], done: { id: kwartał },
//       certificates: { track: kwartał }, events: { financeViews: [], flaggedSell: false } }.
// =================================================================================

const MENTOR_NAME = 'Halina Wróblewska';
const MENTOR_ACTIVE_TASKS = 3;
const MENTOR_REWARD = 150; // zł do portfela prywatnego za zadanie

const MENTOR_TRACKS = {
    analyst: { label: 'Certyfikat Analityka', icon: '📐', required: 3, position: 'projectLead' },
    risk:    { label: 'Certyfikat Zarządzania Ryzykiem', icon: '🛡️', required: 3, position: 'board' },
    audit:   { label: 'Certyfikat Audytora', icon: '🔍', required: 2, position: 'ceo' }
};

function mentorQuarter() {
    return typeof macro === 'object' ? macro.quarter : 0;
}

function heldStocks() {
    return stocks.filter(s => !s.assetType && !s.isBankrupt && (playerPortfolio[s.symbol]?.shares || 0) > 0);
}

function quizzesPassed(ids) {
    const quizzes = typeof getAcademy === 'function' ? getAcademy().quizzes : {};
    return ids.filter(id => quizzes[id]).length;
}

/** check(task) → true (zaliczone) | false; progress(task) → tekst postępu. */
const MENTOR_TASKS = {
    cheapPe: {
        track: 'analyst', title: 'Tania względem sektora',
        text: 'Kup spółkę z C/Z poniżej mediany jej sektora i dodatnim zyskiem. Trzymaj ją 2 kwartały.',
        lesson: 'cz',
        check: task => {
            const pick = heldStocks().find(s => { const m = getCompanyMetrics(s); const med = getSectorMedians(s.sector?.[0]); return m?.pe && med?.pe && m.pe < med.pe && m.eps > 0; });
            if (!pick) { task.data = {}; return false; }
            if (task.data.symbol !== pick.symbol) task.data = { symbol: pick.symbol, from: mentorQuarter() };
            return mentorQuarter() - task.data.from >= 2;
        },
        progress: task => task.data?.symbol ? `${task.data.symbol}: ${mentorQuarter() - task.data.from}/2 kw.` : 'brak takiej spółki w portfelu'
    },
    bookValue: {
        track: 'analyst', title: 'Poniżej wartości księgowej',
        text: 'Znajdź w skanerze spółkę z C/WK < 1 i dodatnim zyskiem, i kup ją do funduszu.',
        lesson: 'cwk',
        check: () => heldStocks().some(s => { const m = getCompanyMetrics(s); return m?.pb && m.pb < 1 && m.eps > 0; }),
        progress: () => 'kup spółkę z C/WK < 1'
    },
    compareValuation: {
        track: 'analyst', title: 'Trzy spojrzenia na wycenę',
        text: 'Otwórz zakładkę Finanse w kartach 3 różnych spółek i porównaj ich wskaźniki.',
        lesson: 'wycena',
        check: () => (getMentor().events.financeViews || []).length >= 3,
        progress: () => `${Math.min(3, (getMentor().events.financeViews || []).length)}/3 spółek`
    },
    valuationQuiz: {
        track: 'analyst', title: 'Egzamin z wyceny',
        text: 'Zalicz quizy Akademii: C/Z, C/WK i Wycena.',
        lesson: 'wycena',
        check: () => quizzesPassed(['cz', 'cwk', 'wycena']) >= 3,
        progress: () => `${quizzesPassed(['cz', 'cwk', 'wycena'])}/3 quizy`
    },
    diversify: {
        track: 'risk', title: 'Pięć koszyków',
        text: 'Zbuduj portfel z co najmniej 5 sektorów, w którym żadna spółka nie przekracza 30% aktywów.',
        lesson: 'dywersyfikacja',
        check: () => { const held = heldStocks(); const sectors = new Set(held.map(s => s.sector?.[0])); const assets = Math.max(1, getFundAssets()); return sectors.size >= 5 && held.every(s => playerPortfolio[s.symbol].shares * s.price / assets <= 0.3); },
        progress: () => `${new Set(heldStocks().map(s => s.sector?.[0])).size}/5 sektorów`
    },
    safeAssets: {
        track: 'risk', title: 'Bezpieczna część portfela',
        text: 'Ulokuj część pieniędzy funduszu w obligacjach albo na lokacie.',
        lesson: 'obligacje',
        check: () => allBonds.some(b => b.ownerId === 'player') || (typeof getFundDeposits === 'function' && getFundDeposits().length > 0),
        progress: () => 'kup obligacje albo załóż lokatę'
    },
    calmPeriod: {
        track: 'risk', title: 'Spokojna ręka',
        text: 'Zakończ okres oceny z obsunięciem funduszu poniżej 5%.',
        lesson: 'zmiennosc',
        check: task => (playerFund?.periods || []).some(p => p.number > (task.data.fromPeriod ?? 0) && p.maxDrawdown < 0.05),
        init: task => { task.data.fromPeriod = playerFund?.periods?.slice(-1)[0]?.number ?? 0; },
        progress: () => `bieżące obsunięcie ${((playerFund?.current?.maxDrawdown || 0) * 100).toFixed(1)}%`
    },
    riskQuiz: {
        track: 'risk', title: 'Egzamin z ryzyka',
        text: 'Zalicz quizy Akademii: Dywersyfikacja, Zmienność i obsunięcie, Obligacje.',
        lesson: 'dywersyfikacja',
        check: () => quizzesPassed(['dywersyfikacja', 'zmiennosc', 'obligacje']) >= 3,
        progress: () => `${quizzesPassed(['dywersyfikacja', 'zmiennosc', 'obligacje'])}/3 quizy`
    },
    sellFlagged: {
        track: 'audit', title: 'Ucieczka przed korektą',
        text: 'Sprzedaj akcje spółki, która ma co najmniej 2 czerwone flagi (szkolenie Księgowy, poziom 4).',
        lesson: 'kreatywna',
        check: () => Boolean(getMentor().events.flaggedSell),
        progress: () => 'sprzedaj spółkę z 🚩🚩'
    },
    orderAudit: {
        track: 'audit', title: 'Sprawdź u źródła',
        text: 'Zleć audyt spółki (szkolenie Księgowy, poziom 5).',
        lesson: 'audyt',
        check: () => stocks.some(s => s.audit),
        progress: () => 'zleć audyt w karcie spółki'
    },
    auditQuiz: {
        track: 'audit', title: 'Egzamin audytora',
        text: 'Zalicz quizy Akademii: Przepływy pieniężne, Kreatywna księgowość, Audyt.',
        lesson: 'audyt',
        check: () => quizzesPassed(['przeplywy', 'kreatywna', 'audyt']) >= 3,
        progress: () => `${quizzesPassed(['przeplywy', 'kreatywna', 'audyt'])}/3 quizy`
    }
};

function getMentor() {
    if (!playerProfile) return { active: [], done: {}, certificates: {}, events: {} };
    if (!playerProfile.mentor) playerProfile.mentor = { active: [], done: {}, certificates: {}, events: { financeViews: [], flaggedSell: false } };
    const mentor = playerProfile.mentor;
    if (!mentor.events) mentor.events = { financeViews: [], flaggedSell: false };
    return mentor;
}

function hasCertificate(track) {
    return track in getMentor().certificates;
}

/** Certyfikat wymagany do awansu na dane stanowisko (null = brak wymogu). */
function getRequiredCertificate(positionId) {
    return Object.entries(MENTOR_TRACKS).find(([, t]) => t.position === positionId)?.[0] || null;
}

function getTrackProgress(track) {
    const mentor = getMentor();
    return Object.entries(MENTOR_TASKS).filter(([id, t]) => t.track === track && mentor.done[id] !== undefined).length;
}

/** Uzupełnia aktywne zadania (najpierw ścieżka potrzebna do najbliższego awansu). */
function assignMentorTasks() {
    const mentor = getMentor();
    if (mentor.active.length >= MENTOR_ACTIVE_TASKS) return;
    const order = Object.keys(MENTOR_TRACKS).filter(track => !hasCertificate(track));
    const busy = new Set(mentor.active.map(t => t.id));
    for (const track of order) {
        const free = Object.entries(MENTOR_TASKS).filter(([id, t]) => t.track === track && mentor.done[id] === undefined && !busy.has(id));
        for (const [id, def] of free) {
            if (mentor.active.length >= MENTOR_ACTIVE_TASKS) return;
            const task = { id, since: mentorQuarter(), data: {} };
            if (def.init) def.init(task);
            mentor.active.push(task);
            busy.add(id);
        }
    }
}

/** Co tydzień i po zdarzeniach: sprawdza zadania, wypłaca nagrody, nadaje certyfikaty. */
function checkMentorTasks() {
    if (!playerProfile || !playerFund) return;
    const mentor = getMentor();
    assignMentorTasks();
    for (const task of [...mentor.active]) {
        const def = MENTOR_TASKS[task.id];
        if (!def) { mentor.active = mentor.active.filter(t => t !== task); continue; }
        let ok = false;
        try { ok = def.check(task); } catch (e) { ok = false; }
        if (!ok) continue;
        mentor.active = mentor.active.filter(t => t !== task);
        mentor.done[task.id] = mentorQuarter();
        playerWallet.cash += MENTOR_REWARD;
        recordPayment('external:korporacja', 'player-wallet', MENTOR_REWARD, `Zadanie mentora: ${def.title}`);
        if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry(def.lesson);
        if (typeof pushNotification === 'function') pushNotification(`🎓 ${MENTOR_NAME}: zadanie „${def.title}” zaliczone (+${MENTOR_REWARD} zł)`, () => openMentor());
    }
    // Certyfikaty: ścieżka z wymaganą liczbą zadań.
    for (const [id, track] of Object.entries(MENTOR_TRACKS)) {
        if (hasCertificate(id) || getTrackProgress(id) < track.required) continue;
        mentor.certificates[id] = mentorQuarter();
        mentor.active = mentor.active.filter(task => MENTOR_TASKS[task.id]?.track !== id); // reszta ścieżki niepotrzebna
        playerProfile.cv.push({ type: 'training', text: `${track.icon} ${track.label}` });
        if (typeof addMail === 'function') addMail({ sender: CORPORATION_SENDER, subject: `${track.icon} ${track.label}`, body: `Gratulacje! Zdobywasz ${track.label}. Spełniasz wymóg certyfikatu do awansu na stanowisko: ${CAREER_POSITIONS[getPositionIndex(track.position)].name}.`, importance: 2 });
    }
    assignMentorTasks();
}

/** Zdarzenia z gry liczone do zadań. */
function noteMentorEvent(kind, stock = null) {
    if (!playerProfile) return;
    const events = getMentor().events;
    if (kind === 'financeView' && stock && !events.financeViews.includes(stock.symbol)) {
        events.financeViews.push(stock.symbol);
        if (events.financeViews.length > 20) events.financeViews.shift();
    }
    if (kind === 'sell' && stock && typeof getRedFlags === 'function' && getSkillLevel('accountant') >= 4 && getRedFlags(stock).length >= 2) events.flaggedSell = true;
    checkMentorTasks();
}

// ---------------------------------------------------------------------------------
// WIDOK: zakładka „Mentor” w oknie CV
// ---------------------------------------------------------------------------------

function openMentor() {
    if (typeof cvTab !== 'undefined') cvTab = 'mentor';
    if (typeof openSkillsModal === 'function') openSkillsModal();
}

function renderMentorPanel() {
    assignMentorTasks();
    const mentor = getMentor();
    const certs = Object.entries(MENTOR_TRACKS).map(([track, t]) => {
        const progress = getTrackProgress(track);
        const has = hasCertificate(track);
        return `<article class="mentor-cert ${has ? 'done' : ''}"><span class="mentor-cert-icon">${has ? t.icon : '🔒'}</span>
            <div><strong>${escapeHtml(t.label)}</strong><span class="text-xs text-muted d-block">wymagany do awansu na: ${escapeHtml(CAREER_POSITIONS[getPositionIndex(t.position)].name)}</span>
            <span class="text-sm">${has ? '✅ zdobyty' : `zadania: ${progress}/${t.required}`}</span></div></article>`;
    }).join('');
    const active = mentor.active.map(task => {
        const def = MENTOR_TASKS[task.id];
        let progress = '';
        try { progress = def.progress(task); } catch (e) { progress = ''; }
        return `<li class="mentor-task"><div><strong>${MENTOR_TRACKS[def.track].icon} ${escapeHtml(def.title)}</strong>
            <p class="text-sm m-0">${escapeHtml(def.text)}</p><span class="text-xs text-muted">${escapeHtml(progress)} · nagroda ${MENTOR_REWARD} zł</span></div>
            <button class="btn-xs btn-secondary" onclick="openAcademy('${def.lesson}')">📘 Hasło</button></li>`;
    }).join('');
    const done = Object.keys(mentor.done).map(id => MENTOR_TASKS[id]).filter(Boolean).map(def => `<li>✅ ${escapeHtml(def.title)}</li>`).join('');
    return `
        <p class="fund-muted">${MENTOR_NAME}, Twoja mentorka w korporacji, daje zadania, które uczą analizy i zarządzania ryzykiem. Zarząd awansuje na wyższe stanowiska tylko z certyfikatem.</p>
        <div class="mentor-certs">${certs}</div>
        <h4>Aktywne zadania</h4>
        <ul class="list-plain mentor-tasks">${active || '<li class="text-muted">Wszystkie zadania wykonane — gratulacje!</li>'}</ul>
        ${done ? `<h4>Wykonane</h4><ul class="list-plain text-sm">${done}</ul>` : ''}`;
}
