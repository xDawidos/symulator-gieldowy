// =================================================================================
// 0.16.7 F1/F2: PEŁNE SPÓŁKI ZAGRANICZNE (wspólny model i wspólny kod; diagnoza: plany/raporty/diagnoza_0.16.7.md)
// Spółka zagraniczna zostaje w `foreignIssuers` (magazyn rynku: posiadacze w walucie, bilety, nadzór, boty), ale ma te same pola co krajowa
// (`totalShares`, `symbol`, `market`, `balanceSheet`, `cash`, `financialHealth`, `fundamentals`, `ceo`, polityka dywidendy) i jej wynik liczą te same funkcje
// (`computeQuarterResults`, `recordQuarterFundamentals`, `updateHealthFromProfitability`, `generateCeoCandidate`, progi splitu z splits.js).
// Cienki adapter: kwoty w walucie kraju (model jest bez skali), CIT i dotacje idą do skarbu kraju, dywidenda do `holders` z podatkiem u źródła,
// progi „w złotych” (split, minimalna dywidenda) przeliczane kursem. Procedur krajowych (M&A między spółkami, spółki zależne, walne, strajki, R&D,
// księgowość oszukańcza) świadomie nie powielamy — zob. diagnozę.
// =================================================================================

const FOREIGN_CO = {
    assetsCap: 0.8,          // aktywa startowe = 80% kapitalizacji
    debtShare: 0.3,          // zadłużenie = 30% aktywów
    cashShare: 0.06,         // gotówka = 6% aktywów
    surpriseMove: 0.02,      // reakcja kursu na raport: niespodzianka EPS (−1…1) × 2% (większa psuje korelację z GIG, test G5)
    divCash: 0.8,            // dywidenda najwyżej z 80% gotówki spółki
    divMinPct: 0.001,        // dywidenda poniżej 0,1% kursu albo 0,01 zł (w walucie) jest pomijana
    ceoRetireAge: 65,
    bankruptcyChance: 0.30,
    growthTilt: 0.03,        // wzrost przychodów kwartalnie na 1,0 premii rynku kraju
    shockTilt: 0.15          // ... i na 1,0 premii sektorowej
};
/** Podatek u źródła od dywidendy (stawki zbliżone do realnych, po umowach o unikaniu podwójnego opodatkowania). */
const FOREIGN_WITHHOLDING = { DE: 0.15, US: 0.15, CZ: 0.15, SE: 0.15, CH: 0.15, FR: 0.15, JP: 0.10, CN: 0.10, IN: 0.10, TW: 0.21 };

function getForeignWithholding(country) { return FOREIGN_WITHHOLDING[country] ?? 0.15; }
function roundSig(x, digits = 6) { return Number.isFinite(x) ? Number(x.toPrecision(digits)) : 0; }

/** Idempotentnie dokłada spółce obcej pola spółki krajowej (nowa gra, debiut, migracja zapisu v17 → v18). */
function ensureForeignCompany(i, full = false) {
    if (!i || i.kind !== 'share') return i;
    i.totalShares = i.shares; i.symbol = getShareSymbol(i); i.market = i.country; i.isStateOwned = Boolean(i.state);
    if (!i.balanceSheet) {
        const cap = i.price * i.shares, assets = cap * FOREIGN_CO.assetsCap, liabilities = assets * FOREIGN_CO.debtShare;
        i.balanceSheet = { assets, liabilities, shareCapital: (assets - liabilities) * 0.4, retainedEarnings: (assets - liabilities) * 0.6 };
        i.cash = assets * FOREIGN_CO.cashShare;
        i.financialHealth = Number(i.financialHealth) || 0;
        i.growthBase = Number.isFinite(i.growthBase) ? i.growthBase : getRandomInRange(-0.006, 0.006);
        i.growthAdj = i.growthBase;
        setCompanyDividendPolicy(i, i.special === 'loyal' || i.state ? 'Aggressive' : getRandomElement(['Growth', 'Growth', 'Balanced', 'Balanced', 'Aggressive', 'Total']));
        if (!i.state) i.ceo = newForeignCeo(i);
        i.divYield = 0;
    }
    if (full && !i.fundamentals) initializeFundamentals(i); // leniwie (pierwszy raport): losuje szum historii, więc nie przy każdym tworzeniu emitenta
    return i;
}

function newForeignCeo(i) {
    const ceo = generateCeoCandidate(i);
    const trait = getIssuerCeoTrait(i);
    ceo.traits = trait ? [{ id: trait }] : []; // cechy prezesa krajowego (countries.js, `ceoTraits[...].fx`) — jedna na spółkę, stała
    return ceo;
}

/** CIT i dotacja państwowa idą do skarbu kraju spółki, nie do skarbu PL (`computeQuarterResults` dolicza je globalnie). */
function withCountryTreasury(st, fn) {
    const g0 = governmentTreasury, c0 = typeof society === 'object' && society?.budget ? society.budget.citQuarter : undefined;
    try { return fn(); } finally {
        if (st) st.treasury += governmentTreasury - g0;
        governmentTreasury = g0;
        if (c0 !== undefined) society.budget.citQuarter = c0;
    }
}

function foreignGrowthTilt(i) {
    const regime = marketRegimes[i.country];
    return Math.max(-0.04, Math.min(0.04, (regime?.premium || 0) * FOREIGN_CO.growthTilt + (i.sp || 0) * FOREIGN_CO.shockTilt));
}

/** Raport kwartalny: wynik z modelu spółki, bilans, gotówka, kondycja, reakcja kursu. Zwraca { q, surprise }. */
function runForeignReport(i, st) {
    i.growthAdj = (Number.isFinite(i.growthBase) ? i.growthBase : 0) + foreignGrowthTilt(i);
    const q = withCountryTreasury(st, () => computeQuarterResults(i));
    const net = q.netIncome;
    adjustCompanyCash(i, net + q.depreciation);
    adjustBalanceSheet(i, { assets: net, retainedEarnings: net });
    const surprise = recordQuarterFundamentals(i, { revenue: q.revenue, ebitda: q.ebitda, netIncome: net, depreciation: q.depreciation, interest: q.interest, tax: q.tax, labor: q.labor, ocf: net + q.depreciation });
    updateHealthFromProfitability(i, q);
    const sheet = i.balanceSheet;
    if (net < 0) { const debt = -net * getRandomInRange(0.1, 0.4); sheet.liabilities += debt; adjustCompanyCash(i, debt); sheet.assets += debt; }
    else if (net > 0 && sheet.liabilities > 0 && i.cash > 0) { const repay = Math.min(i.cash * 0.5, net * getRandomInRange(0.1, 0.3), sheet.liabilities); sheet.liabilities -= repay; sheet.assets -= repay; adjustCompanyCash(i, -repay); }
    if (i.cash < 0) { const fix = -i.cash + Math.abs(net) * 0.05; adjustCompanyCash(i, fix); sheet.liabilities += fix; sheet.assets += fix; } // jak coverNegativeCash: bank dokredytowuje do zera
    i.quarterlyEarnings = net;
    i.lastSurprise = Math.max(-1, Math.min(1, surprise));
    if (!i.tradeHalted) {
        i.price = Math.max(0.05, Math.round(i.price * (1 + i.lastSurprise * FOREIGN_CO.surpriseMove) * 1000) / 1000);
        if (i.history.length) i.history[i.history.length - 1] = i.price;
    }
    return { q, surprise: i.lastSurprise };
}

/** Dywidenda po raporcie: z gotówki spółki, do posiadaczy (gracz, boty) w walucie spółki z podatkiem u źródła; pakiet państwa do skarbu kraju. */
function payForeignDividend(i, st, net) {
    let paid = 0, dps = 0;
    const shares = Math.max(1, i.shares), ceoMiser = i.ceo?.traits?.some(t => t.id === 'skapiec');
    if (!ceoMiser && net > 0 && i.dividendPayoutRatio > 0 && !i.tradeHalted) {
        let ratio = i.dividendPayoutRatio;
        if (i.ceo?.traits?.some(t => t.id === 'szczodry')) ratio = Math.min(1, Math.max(ratio, 0.05) * 1.15);
        const total = Math.min(net * ratio, Math.max(0, i.cash) * FOREIGN_CO.divCash);
        dps = total / shares;
        const minDps = Math.max(fromPln(MIN_DIVIDEND_PER_SHARE, i.currency), i.price * FOREIGN_CO.divMinPct);
        if (total > 0 && dps >= minDps) {
            paid = total;
            adjustCompanyCash(i, -total); adjustBalanceSheet(i, { assets: -total, retainedEarnings: -total });
            const keep = 1 - getForeignWithholding(i.country);
            for (const [holder, qty] of Object.entries(i.holders || {})) {
                const gross = Number(qty) * dps;
                if (!(gross > 0)) continue;
                if (holder === 'player') { addCurrencyCash('player', i.currency, gross * keep); if (typeof noteCorporateGoal === 'function') noteCorporateGoal('dividends', toPln(gross * keep, i.currency)); }
                else { const bot = aiCompetitors.find(b => b.id === holder); if (bot) addCurrencyCash(bot, i.currency, gross * keep); }
            }
            if (i.statePack > 0) st.treasury += i.statePack * dps; // dywidenda państwowa do skarbu kraju
            i.lastDividend = { dps, total, q: macro.quarter, yield: dps / Math.max(0.01, i.price) };
            if ((i.holders?.player || 0) > 0) logEvent(`💰 ${i.name} (${getShareSymbol(i)}): dywidenda ${formatNumberPl(dps, 2)} ${i.currency} na akcję (po podatku u źródła ${Math.round((1 - keep) * 100)}%).`, 'review');
        }
    }
    i.divYield = 0.75 * (Number(i.divYield) || 0) + 0.25 * (paid > 0 ? Math.min(0.15, 4 * dps / Math.max(0.01, i.price)) : 0); // dryf ceny pomniejszony o wypłacaną stopę (zwrot całkowity bez podwójnego liczenia)
    return paid;
}

/** Split / konsolidacja: progi z splits.js liczone w złotych po kursie (kurs 1000 zł, nie 1000 JPY). Posiadacze dostają floor(akcje × współczynnik). */
function maybeForeignSplit(i) {
    const pln = toPln(i.price, i.currency);
    if (i.tradeHalted || !(pln > 0) || macro.quarter - (Number(i.lastSplitQuarter) || -99) < SPLIT_COOLDOWN_QUARTERS) return null;
    const proposal = getSplitProposal(pln);
    if (!proposal || Math.random() >= getSplitChance(pln)) return null;
    const factor = proposal.kind === 'split' ? proposal.ratio : 1 / proposal.ratio;
    return applyForeignShareChange(i, factor);
}

function applyForeignShareChange(i, factor) {
    if (!(factor > 0) || factor === 1) return null;
    const floorShares = x => Math.floor(x + 1e-9), priceBefore = i.price, priceAfter = priceBefore / factor;
    for (const [holder, qty] of Object.entries(i.holders || {})) {
        const next = floorShares(qty * factor), fraction = qty * factor - next;
        if (next > 0) i.holders[holder] = next; else delete i.holders[holder];
        if (fraction > 1e-9 && factor < 1) { // ułamek akcji przy konsolidacji: spółka wypłaca gotówką po nowym kursie
            if (holder === 'player') addCurrencyCash('player', i.currency, fraction * priceAfter);
            else { const bot = aiCompetitors.find(b => b.id === holder); if (bot) addCurrencyCash(bot, i.currency, fraction * priceAfter); }
        }
    }
    i.shares = Math.max(1, floorShares(i.shares * factor)); i.totalShares = i.shares;
    i.statePack = i.state ? Math.round(i.shares * COUNTRY_RULES.statePct) : 0; i.float = i.shares - i.statePack;
    i.price = priceAfter; i.ema = i.ema / factor; i.history = i.history.map(p => p / factor);
    const f = i.fundamentals;
    if (f) { scalePerShareList(f.history, factor, ['eps']); f.expectedEps /= factor; if (Number.isFinite(f.lastEps)) f.lastEps /= factor; f.fairValue /= factor; updateFundamentalRatios(i); }
    if (i.lastDividend) { i.lastDividend.dps /= factor; }
    i.lastSplitQuarter = macro.quarter;
    const text = `✂️ ${i.name} (${getShareSymbol(i)}): ${factor > 1 ? `podział akcji ${formatSplitRatio(factor)}` : `konsolidacja akcji ${formatSplitRatio(factor)}`}, kurs ${formatNumberPl(priceBefore, 2)} → ${formatNumberPl(priceAfter, 2)} ${i.currency}.`;
    logEvent(text, 'market');
    if ((i.holders?.player || 0) > 0 && typeof pushNews === 'function') pushNews(text, null);
    return { factor, priceBefore, priceAfter };
}

/** Prezes: starzeje się, po 65. roku emerytura (zmiana osoby, ta sama cecha kraju). */
function stepForeignCeo(i) {
    if (!i.ceo) return;
    i.ceo.age += 0.25; i.ceo.tenure += 1;
    if (i.ceo.age >= FOREIGN_CO.ceoRetireAge && Math.random() < (i.ceo.age - 64) * 0.15 / 4) {
        const old = i.ceo.name;
        i.ceo = newForeignCeo(i);
        if ((i.holders?.player || 0) > 0) logEvent(`👴 Prezes ${old} (${i.name}) przechodzi na emeryturę; nowy prezes: ${i.ceo.name}.`, 'company');
    }
}

/** Kapitał własny ≤ 0 albo kondycja ≤ −5: upadłość 30% (spółka państwowa dostaje dokapitalizowanie ze skarbu kraju; giganci, Waschmabank i parabank są chronieni). */
function maybeForeignBankruptcy(i, st) {
    const sheet = i.balanceSheet, equity = sheet.assets - sheet.liabilities;
    if (equity > 0 && i.financialHealth > -5) return false;
    if (i.state || i.giant || i.special === 'launder' || (typeof parabank === 'object' && parabank?.foreignId === i.id)) {
        const inject = -equity + i.price * i.shares * 0.05; // ratunek: dokapitalizowanie, kondycja do −1
        sheet.assets += Math.max(0, inject); sheet.retainedEarnings += Math.max(0, inject); adjustCompanyCash(i, Math.max(0, inject));
        i.financialHealth = Math.max(i.financialHealth, -1);
        return false;
    }
    if (Math.random() >= FOREIGN_CO.bankruptcyChance) return false;
    const text = `🔥 Upadłość: ${i.name} (${getShareSymbol(i)}) znika z giełdy ${COUNTRY_DEFS[i.country]?.name || i.country}; akcjonariusze odzyskują ułamek wartości.`;
    logEvent(text, 'market');
    if ((i.holders?.player || 0) > 0 && typeof pushNews === 'function') pushNews(text, null);
    delistForeignIssuer(i, i.price * 0.02);
    return true;
}

/** Kwartał spółek kraju: raport → dywidenda → split → prezes → upadłość. Wywoływane z processCountriesQuarterly. */
function processForeignCompaniesQuarterly(countryId) {
    const st = countryState[countryId];
    if (!st) return;
    for (const issuer of [...getCountryIssuers(countryId)]) {
        ensureForeignCompany(issuer, true);
        if (issuer.tradeHalted) continue;
        const { q } = runForeignReport(issuer, st);
        payForeignDividend(issuer, st, q.netIncome);
        if (maybeForeignBankruptcy(issuer, st)) continue;
        maybeForeignSplit(issuer);
        stepForeignCeo(issuer);
    }
}

// ---------------------------------------------------------------------------------
// Zapis (pole `c` wiersza emitenta w snapshotcie krajów; zapis v17 go nie ma: ensureForeignCompany buduje model z ceny)
// ---------------------------------------------------------------------------------

function getForeignCompanySnapshot(i) {
    if (!i.fundamentals || !i.balanceSheet) return undefined;
    const f = i.fundamentals, b = i.balanceSheet, rs = x => roundSig(x);
    const row = {
        n: i.shares, b: [rs(b.assets), rs(b.liabilities), rs(b.shareCapital), rs(b.retainedEarnings)], c: rs(i.cash), h: roundSig(i.financialHealth, 4),
        f: { r: rs(f.revenue), e: rs(f.expectedEps), fv: rs(f.fairValue), le: rs(f.lastEps || 0), hs: f.history.map(x => [rs(x.revenue), rs(x.ebitda), rs(x.netIncome), rs(x.eps)]) },
        a: [roundSig(i.marginAdj, 4), roundSig(i.growthBase, 4), roundSig(i.valuationGap, 4)], dp: [i.dividendPolicy, roundSig(i.dividendPayoutRatio, 4)], dy: roundSig(i.divYield, 4)
    };
    if (i.ceo) row.ceo = [i.ceo.name, Math.round(i.ceo.age * 4) / 4, i.ceo.tenure, i.ceo.traits?.[0]?.id || null];
    if (i.lastDividend) row.ld = [rs(i.lastDividend.dps), i.lastDividend.q];
    if (i.lastSplitQuarter !== undefined) row.ls = i.lastSplitQuarter;
    if (i.lastSurprise !== undefined) row.su = roundSig(i.lastSurprise, 3);
    return row;
}

function applyForeignCompanySnapshot(i, row) {
    if (!row || !Array.isArray(row.b)) return ensureForeignCompany(i); // zapis v17: model z bieżącej ceny
    if (Number(row.n) > 0) { i.shares = Number(row.n); i.statePack = i.state ? Math.round(i.shares * COUNTRY_RULES.statePct) : 0; i.float = i.shares - i.statePack; }
    i.totalShares = i.shares; i.symbol = getShareSymbol(i); i.market = i.country; i.isStateOwned = Boolean(i.state);
    i.balanceSheet = { assets: row.b[0], liabilities: row.b[1], shareCapital: row.b[2], retainedEarnings: row.b[3] };
    i.cash = Number(row.c) || 0; i.financialHealth = Number(row.h) || 0;
    [i.marginAdj, i.growthBase, i.valuationGap] = row.a || [undefined, undefined, undefined];
    i.growthAdj = Number.isFinite(i.growthBase) ? i.growthBase : 0;
    const f = row.f || {};
    i.fundamentals = { version: 1, revenue: Number(f.r) || 1000, history: (f.hs || []).map(([revenue, ebitda, netIncome, eps]) => ({ revenue, ebitda, netIncome, eps })), fairValue: Number(f.fv) || i.price, expectedEps: Number(f.e) || 0, lastEps: Number(f.le) || 0 };
    updateFundamentalRatios(i);
    setCompanyDividendPolicy(i, row.dp?.[0]); if (Number.isFinite(row.dp?.[1])) i.dividendPayoutRatio = row.dp[1];
    i.divYield = Number(row.dy) || 0;
    if (row.ceo) i.ceo = { name: row.ceo[0], age: Number(row.ceo[1]) || 50, tenure: Number(row.ceo[2]) || 0, traits: row.ceo[3] ? [{ id: row.ceo[3] }] : [] };
    if (row.ld) i.lastDividend = { dps: row.ld[0], q: row.ld[1], total: 0, yield: row.ld[0] / Math.max(0.01, i.price) };
    if (row.ls !== undefined) i.lastSplitQuarter = row.ls;
    if (row.su !== undefined) i.lastSurprise = row.su;
    return i;
}

/** Niezmienniki modelu spółki: skończone kwoty, akcje = suma pakietu państwa i floatu, bilans nie przeczy gotówce. */
function checkForeignCompanyInvariants() {
    const problems = [];
    for (const i of getForeignIssuerList()) {
        if (i.kind !== 'share' || !i.fundamentals) continue;
        const b = i.balanceSheet;
        if (![b.assets, b.liabilities, i.cash, i.financialHealth, i.fundamentals.revenue].every(Number.isFinite)) problems.push(`${i.id}: niefinitywna wartość w bilansie lub fundamentach`);
        if (i.totalShares !== i.shares) problems.push(`${i.id}: totalShares ≠ shares`);
        if (i.statePack + i.float !== i.shares) problems.push(`${i.id}: pakiet państwa + float ≠ akcje`);
        if (i.cash < -1e-6) problems.push(`${i.id}: ujemna gotówka spółki`);
    }
    return problems;
}

/** Linia pod nazwą spółki w oknie rynków: C/Z, EPS, kapitał własny na akcję, dywidenda, prezes (tekst, bez koloru jako nośnika). */
function renderForeignCompanyLine(i) {
    const f = i.fundamentals;
    if (!f || !f.history?.length) return '<br><span class="text-muted text-xs">Pierwszy raport w najbliższym kwartale.</span>';
    const pe = f.peRatio ? `C/Z ${formatNumberPl(f.peRatio, 1)}` : 'C/Z brak (strata)', eps = `EPS (12 mies.) ${formatNumberPl(f.epsTtm, 2)} ${i.currency}`;
    const div = i.lastDividend ? `dywidenda ${formatNumberPl(i.lastDividend.dps, 2)} ${i.currency} (${formatNumberPl(i.lastDividend.yield * 100, 1)}%)` : 'bez dywidendy';
    const ceo = i.ceo ? ` · prezes ${escapeHtml(i.ceo.name)}` : '';
    return `<br><span class="text-muted text-xs">${pe} · ${eps} · ${div}${ceo}</span>`;
}
