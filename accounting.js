// =================================================================================
// 0.12 N3: KSIĘGOWY → AUDYTOR. Kreatywna księgowość (zawyżanie zysków), przepływy
// pieniężne, należności, czerwone flagi, audyt zlecany przez fundusz.
//
// Spółka-oszust raportuje zysk wyższy od prawdziwego. Gotówka płynie z PRAWDZIWEGO
// zysku, a różnica trafia do należności (aktywa „na papierze”). Po 3–7 kwartałach
// przychodzi korekta (3–7 kw.): odpis należności, spadek kursu, zmiana prezesa.
// Cel: ok. 3–5% notowanych spółek naraz (decyzja użytkownika).
// =================================================================================

const FRAUD_MAX_SHARE = 0.05;          // najwyżej 5% notowanych spółek naraz
const FRAUD_START_CHANCE = 0.008;      // bazowa szansa na kwartał (słaba kondycja ×2, skłonny prezes ×3)
const FRAUD_FAKE_CAP = 0.12;           // zawyżenie najwyżej 12% przychodów kwartału
const AUDIT_MISS_CHANCE = 0.1;         // audytor przeocza oszustwo
const ACCOUNTANT_REQUIRED = { pnl: 1, balance: 2, cashflow: 3, flags: 4, audit: 5 };

function isFraudEligible(stock) {
    return stock && !stock.assetType && !stock.isBankrupt && !stock.isBankStock && !stock.isStateOwned && !stock.marketOperator && stock.fundamentals;
}

function getAccountingQuarter() {
    return typeof macro === 'object' ? macro.quarter : 0;
}

// ---------------------------------------------------------------------------------
// RAPORT KWARTALNY: zawyżenie, należności, przepływy (wołane z processQuarterlyReports)
// ---------------------------------------------------------------------------------

/** Ile spółka „dopisze” do zysku w tym raporcie (0 dla uczciwych). */
function getFraudInflation(stock, quarterModel, realEarnings) {
    const fraud = stock.fraud;
    if (!fraud || !quarterModel) return 0;
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const expected = (Number(stock.fundamentals?.expectedEps) || 0) * shares;
    // Wynik „tuż nad konsensusem” — typowy ślad zarządzania wynikiem.
    const target = expected > 0 ? expected * (1 + getRandomInRange(0.01, 0.06)) : 0;
    const fake = Math.max(quarterModel.revenue * 0.015, target - realEarnings);
    return Math.min(fake, quarterModel.revenue * FRAUD_FAKE_CAP);
}

/**
 * Po raporcie: należności (uczciwe ~ przychody × wskaźnik + zawyżenie) i przepływy z działalności.
 * Zwraca { receivables, ocf } do zapisania w historii kwartału.
 */
function recordAccountingQuarter(stock, quarterModel, realEarnings, fake) {
    if (!Number.isFinite(stock.receivablesRatio)) stock.receivablesRatio = getRandomInRange(0.15, 0.35);
    const revenue = quarterModel?.revenue || 0;
    const honest = revenue * stock.receivablesRatio * (1 + gaussianRandom() * 0.08);
    const previousHonest = Number.isFinite(stock.honestReceivables) ? stock.honestReceivables : honest;
    stock.honestReceivables = honest;
    if (fake > 0) {
        stock.fraud.total += fake;
        adjustBalanceSheet(stock, { assets: fake, retainedEarnings: fake }); // „zysk” bez gotówki = należności
    }
    const depreciation = quarterModel?.depreciation || 0;
    const ocf = realEarnings + depreciation - (honest - previousHonest);
    return { receivables: honest + (stock.fraud?.total || 0), ocf };
}

// ---------------------------------------------------------------------------------
// CO KWARTAŁ: nowe oszustwa, zmiany audytora, korekty, audyty
// ---------------------------------------------------------------------------------

function processAccountingQuarterly() {
    const quarter = getAccountingQuarter();
    const listed = stocks.filter(s => !s.assetType && !s.isBankrupt);
    let active = listed.filter(s => s.fraud).length;
    const knf = typeof getInstitutionEffectiveness === 'function' && typeof oversight === 'object' ? getInstitutionEffectiveness(oversight.knf) : 0.3;

    for (const stock of listed) {
        // Zmiana audytora: częsta u oszustów, rzadka u uczciwych (szum).
        if (Math.random() < (stock.fraud ? 0.25 : 0.02)) stock.auditorChangedQuarter = quarter;

        if (stock.fraud) {
            const early = quarter - stock.fraud.start >= 2 && Math.random() < knf * 0.08; // KNF wykrywa wcześniej (nie od razu)
            if (early || quarter >= stock.fraud.correctAt) revealFraud(stock, early ? 'KNF' : 'audytor');
            continue;
        }
        if (!isFraudEligible(stock) || active >= Math.max(1, Math.floor(listed.length * FRAUD_MAX_SHARE))) continue;
        let chance = FRAUD_START_CHANCE;
        if ((Number(stock.financialHealth) || 0) < 0) chance *= 2;
        if (stock.ceo?.traits?.some(t => ['skorumpowany', 'sklonny_do_korupcji', 'chciwy'].includes(t.id))) chance *= 3;
        if (Math.random() < chance) { stock.fraud = { start: quarter, correctAt: quarter + getRandomIntInRange(3, 7), total: 0 }; active++; }
    }

    // Zlecone audyty: wynik po kwartale.
    for (const stock of stocks.filter(s => s.audit && !s.audit.done && quarter > s.audit.quarter)) finishAudit(stock);
}

/** Korekta wyników: odpis zawyżonych należności, spadek kursu, nowy prezes. */
function revealFraud(stock, by) {
    const fraud = stock.fraud;
    stock.fraud = null;
    if (!fraud) return;
    const writeOff = Math.min(fraud.total, Math.max(0, Number(stock.balanceSheet?.assets) || 0));
    if (writeOff > 0) adjustBalanceSheet(stock, { assets: -writeOff, retainedEarnings: -writeOff });
    const drop = 0.2 + Math.min(0.2, writeOff / Math.max(1, getMarketCapValue(stock)));
    applyPriceEffect(stock.symbol, -drop, 'negative', 'company');
    stock.financialHealth = Math.max(-5, (Number(stock.financialHealth) || 0) - 1.5);
    stock.fraudHistory = [...(stock.fraudHistory || []), { quarter: getAccountingQuarter(), writeOff, by }].slice(-3);
    if (typeof replaceCeo === 'function' && stock.ceo) replaceCeo(stock);
    if (typeof addChartEvent === 'function') addChartEvent(stock, '🧾', `Korekta wyników: odpis ${formatZl(writeOff, 0)}`);
    const text = `🧾 KOREKTA WYNIKÓW: ${stock.name} (${stock.symbol}) zawyżała zyski — odpis ${formatZl(writeOff, 0)}, kurs −${(drop * 100).toFixed(0)}%, zarząd odwołany (wykrył: ${by}).`;
    logEvent(text, 'company');
    if (typeof showBreakingNews === 'function') showBreakingNews(text, false);

    // Afera audytora: firma, która niedawno dała „czystą” opinię.
    if (stock.audit?.done && stock.audit.clean && stock.audit.missed) {
        const firm = stocks.find(s => s.symbol === stock.audit.firm);
        if (firm) { applyPriceEffect(firm.symbol, -0.15, 'negative', 'company'); logEvent(`🧾 Afera audytora: ${firm.name} przeoczyła oszustwo w ${stock.name}.`, 'company'); }
    }
    if (typeof unlockAcademyEntry === 'function') {
        const held = (playerPortfolio[stock.symbol]?.shares || 0) > 0;
        unlockAcademyEntry('kreatywna', held ? `${stock.name}: korekta wyników w Twojej spółce` : '');
    }
}

// ---------------------------------------------------------------------------------
// CZERWONE FLAGI
// ---------------------------------------------------------------------------------

/** Lista sygnałów ostrzegawczych z danych publicznych: [{ id, label, desc }]. */
function getRedFlags(stock) {
    const history = stock?.fundamentals?.history || [];
    const real = history.filter(q => !q.synthetic);
    const flags = [];
    const last4 = real.slice(-4);
    if (last4.length >= 3) {
        const net = last4.reduce((s, q) => s + (Number(q.netIncome) || 0), 0);
        const ocf = last4.reduce((s, q) => s + (Number(q.ocf) || 0), 0);
        if (net > 0 && ocf < net * 0.6) flags.push({ id: 'cash', label: 'Zysk bez gotówki', desc: `Przepływy z działalności (${formatZl(ocf, 0)}) dużo niższe od zysku (${formatZl(net, 0)}).` });
    }
    if (real.length >= 5) {
        const now = real[real.length - 1], before = real[real.length - 5];
        const recvGrowth = before.receivables > 0 ? now.receivables / before.receivables - 1 : 0;
        const revGrowth = before.revenue > 0 ? now.revenue / before.revenue - 1 : 0;
        if (recvGrowth - revGrowth > 0.25) flags.push({ id: 'receivables', label: 'Należności rosną szybciej niż sprzedaż', desc: `Należności +${(recvGrowth * 100).toFixed(0)}%, przychody ${revGrowth >= 0 ? '+' : ''}${(revGrowth * 100).toFixed(0)}% r/r.` });
    }
    if (Number.isFinite(stock.auditorChangedQuarter) && getAccountingQuarter() - stock.auditorChangedQuarter <= 4) {
        flags.push({ id: 'auditor', label: 'Zmiana audytora', desc: `Spółka zmieniła firmę audytorską ${getAccountingQuarter() - stock.auditorChangedQuarter} kw. temu.` });
    }
    const surprises = (stock.surpriseHistory || []).slice(-3);
    if (surprises.length === 3 && surprises.every(s => s >= 0 && s <= 0.08)) {
        flags.push({ id: 'beat', label: 'Wyniki zawsze tuż nad konsensusem', desc: 'Trzy raporty z rzędu minimalnie powyżej oczekiwań — możliwe „zarządzanie wynikiem”.' });
    }
    return flags;
}

// ---------------------------------------------------------------------------------
// AUDYT (Księgowy poziom 5)
// ---------------------------------------------------------------------------------

function getAuditCost(stock) {
    return Math.round(Math.max(3000, getMarketCapValue(stock) * 0.002));
}

function orderAudit(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || stock.assetType) return false;
    if (getSkillLevel('accountant') < ACCOUNTANT_REQUIRED.audit) { showToast('Audyt zleca Audytor (Księgowy poziom 5).', 'warning'); return false; }
    if (stock.audit && !stock.audit.done) { showToast('Audyt tej spółki już trwa.', 'default'); return false; }
    const cost = getAuditCost(stock);
    if (playerCash < cost) { showToast(`Audyt kosztuje ${formatZl(cost, 0)} — za mało gotówki funduszu.`, 'error'); return false; }
    const firm = stocks.filter(s => s.assetType === 'Accounting' && !s.isBankrupt)[0] || null;
    playerCash -= cost;
    if (firm) { adjustCompanyCash(firm, cost); firm.quarterlyEarnings = (Number(firm.quarterlyEarnings) || 0) + cost; }
    recordPayment('player-fund', firm || 'external:audytor', cost, `Audyt: ${stock.name}`);
    stock.audit = { quarter: getAccountingQuarter(), firm: firm?.symbol || null, done: false };
    logEvent(`🔍 Fundusz zleca audyt ${stock.name} (${formatZl(cost, 0)}). Wynik w przyszłym kwartale.`, 'review');
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('audyt');
    return true;
}

function finishAudit(stock) {
    const audit = stock.audit;
    const fraud = stock.fraud;
    audit.done = true;
    audit.doneQuarter = getAccountingQuarter();
    audit.missed = Boolean(fraud) && Math.random() < AUDIT_MISS_CHANCE;
    audit.clean = !fraud || audit.missed;
    audit.inflation = fraud && !audit.missed ? fraud.total : 0;
    const body = audit.clean
        ? `Audyt ${stock.name}: sprawozdania rzetelne, bez istotnych zastrzeżeń.`
        : `Audyt ${stock.name}: zysk zawyżony o ok. ${formatZl(audit.inflation, 0)} (fikcyjne należności). Korekta wyników jest kwestią czasu.`;
    if (typeof addMail === 'function') addMail({ sender: CORPORATION_SENDER, subject: audit.clean ? `🔍 Audyt ${stock.symbol}: czysto` : `🔍 Audyt ${stock.symbol}: NIEPRAWIDŁOWOŚCI`, body, importance: audit.clean ? 2 : 3, symbol: stock.symbol });
}

// ---------------------------------------------------------------------------------
// WIDOK: sekcje w zakładce „Finanse” karty spółki
// ---------------------------------------------------------------------------------

function renderAccountingSection(stock) {
    const level = getSkillLevel('accountant');
    const history = (stock.fundamentals?.history || []).slice(-8);
    const locked = (need, label) => `<p class="text-xs text-muted mt-2">🔒 ${label} — szkolenie „Księgowy”, poziom ${need}.</p>`;
    const money = v => Number.isFinite(v) ? formatZl(v, 0) : '—';
    let html = '';

    // 1. Rachunek zysków i strat
    if (level >= ACCOUNTANT_REQUIRED.pnl) {
        const cols = history.map((q, i) => `<th class="cell-number">${q.synthetic ? 'est.' : `Q−${history.length - 1 - i}`}</th>`).join('');
        const rowOf = (label, key, hint) => `<tr><td title="${escapeHtml(hint)}">${label}</td>${history.map(q => `<td class="cell-number">${money(q[key])}</td>`).join('')}</tr>`;
        html += `<h4 class="mt-3">📒 Rachunek zysków i strat (kwartały)</h4>
            <div class="scanner-table-wrap"><table class="asset-mini-table w-full"><thead><tr><th></th>${cols}</tr></thead><tbody>
                ${rowOf('Przychody', 'revenue', 'Sprzedaż w kwartale.')}
                ${rowOf('EBITDA', 'ebitda', 'Wynik operacyjny przed amortyzacją.')}
                ${rowOf('− Amortyzacja', 'depreciation', 'Zużycie majątku — koszt bez wydatku gotówki.')}
                ${rowOf('− Odsetki', 'interest', 'Koszt długu.')}
                ${rowOf('− Podatek', 'tax', 'Podatek dochodowy.')}
                ${rowOf('= Zysk netto', 'netIncome', 'To, co zostaje dla akcjonariuszy.')}
            </tbody></table></div>`;
    } else return locked(1, 'Rachunek zysków i strat, bilans, przepływy, czerwone flagi i audyt');

    // 2. Bilans
    if (level >= ACCOUNTANT_REQUIRED.balance) {
        const assets = Number(stock.balanceSheet?.assets) || 0, liabilities = Number(stock.balanceSheet?.liabilities) || 0;
        const cash = Math.max(0, Number(stock.cash) || 0);
        const receivables = Math.min(assets, (stock.honestReceivables || 0) + (stock.fraud?.total || 0));
        const equity = assets - liabilities;
        const bar = (value, total, cls) => `<span class="acc-bar ${cls}" style="width:${total > 0 ? Math.max(2, Math.min(100, value / total * 100)) : 0}%"></span>`;
        html += `<h4 class="mt-3">⚖️ Bilans</h4>
            <div class="acc-balance">
                <div><strong>Aktywa ${money(assets)}</strong><div class="acc-bars">${bar(cash, assets, 'cash')}${bar(receivables, assets, 'recv')}${bar(Math.max(0, assets - cash - receivables), assets, 'other')}</div>
                    <span class="text-xs">🟩 gotówka ${money(cash)} · 🟨 należności ${money(receivables)} · ⬜ pozostałe ${money(Math.max(0, assets - cash - receivables))}</span></div>
                <div><strong>Pasywa ${money(assets)}</strong><div class="acc-bars">${bar(Math.max(0, equity), assets, 'equity')}${bar(liabilities, assets, 'debt')}</div>
                    <span class="text-xs">🟦 kapitał własny ${money(equity)} · 🟥 zobowiązania ${money(liabilities)}</span></div>
            </div>
            <p class="text-sm">Dług netto (zobowiązania − gotówka): <strong>${money(liabilities - cash)}</strong>. Bilans zawsze się równa: aktywa = kapitał własny + zobowiązania.</p>`;
    } else html += locked(2, 'Bilans');

    // 3. Przepływy pieniężne
    if (level >= ACCOUNTANT_REQUIRED.cashflow) {
        const real = history.filter(q => !q.synthetic && Number.isFinite(q.ocf));
        const net = real.reduce((s, q) => s + q.netIncome, 0), ocf = real.reduce((s, q) => s + q.ocf, 0);
        html += `<h4 class="mt-3">💧 Przepływy pieniężne z działalności</h4>
            ${real.length ? `<table class="asset-mini-table w-full"><thead><tr><th></th>${real.map((q, i) => `<th class="cell-number">Q−${real.length - 1 - i}</th>`).join('')}</tr></thead><tbody>
                <tr><td>Zysk netto</td>${real.map(q => `<td class="cell-number">${money(q.netIncome)}</td>`).join('')}</tr>
                <tr><td>Gotówka z działalności</td>${real.map(q => `<td class="cell-number ${q.ocf < q.netIncome * 0.6 && q.netIncome > 0 ? 'text-down' : ''}">${money(q.ocf)}</td>`).join('')}</tr>
            </tbody></table>
            <p class="text-sm">Zysk pokryty gotówką: <strong class="${net > 0 && ocf < net * 0.6 ? 'text-down' : ''}">${net > 0 ? `${(ocf / net * 100).toFixed(0)}%` : '—'}</strong>. Zdrowa spółka zamienia zysk w gotówkę (zwykle ≥ 80%).</p>`
            : '<p class="text-sm text-muted">Przepływy pojawią się po pierwszym raporcie kwartalnym.</p>'}`;
    } else html += locked(3, 'Przepływy pieniężne');

    // 4. Czerwone flagi
    if (level >= ACCOUNTANT_REQUIRED.flags) {
        const flags = getRedFlags(stock);
        html += `<h4 class="mt-3">🚩 Czerwone flagi</h4>${flags.length
            ? `<ul class="list-plain text-sm">${flags.map(f => `<li>🚩 <strong>${escapeHtml(f.label)}</strong> — ${escapeHtml(f.desc)}</li>`).join('')}</ul><p class="text-xs text-muted">Jedna flaga bywa przypadkiem. Kilka naraz to poważne ostrzeżenie.</p>`
            : '<p class="text-sm text-up">Brak sygnałów ostrzegawczych.</p>'}`;
    } else html += locked(4, 'Czerwone flagi');

    // 5. Audyt
    if (level >= ACCOUNTANT_REQUIRED.audit) {
        const audit = stock.audit;
        html += `<h4 class="mt-3">🔍 Audyt</h4>${audit && !audit.done ? '<p class="text-sm">Audyt w toku — wynik w przyszłym kwartale.</p>'
            : `${audit?.done ? `<p class="text-sm ${audit.clean ? 'text-up' : 'text-down'}">Ostatni audyt (kw. ${audit.doneQuarter}): ${audit.clean ? 'bez zastrzeżeń' : `zysk zawyżony o ok. ${money(audit.inflation)}`}.</p>` : ''}
                <button class="btn-secondary" onclick="orderAudit('${stock.symbol}'); renderCompanyCard();">Zleć audyt (${formatZl(getAuditCost(stock), 0)} z funduszu)</button>
                <p class="text-xs text-muted">Audytor sprawdza dokumenty u źródła. Rzadko, ale zdarza się, że przeoczy oszustwo.</p>`}`;
    } else html += locked(5, 'Audyt');
    return html;
}
