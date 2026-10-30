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
    fairPull: 0.018,         // 0.16.9 W2: tygodniowy powrót kursu do wartości godziwej: 0,0003 na tick krajowych × 60 ticków na tydzień (PRICE_MEAN_REVERSION_PER_TICK), luka obcięta do −50%…+100%
    growthTilt: 0.03,        // wzrost przychodów kwartalnie na 1,0 premii rynku kraju
    shockTilt: 0.15          // ... i na 1,0 premii sektorowej
};
/** 0.16.9 W2: liczniki zdarzeń spółek zagranicznych (sonda częstości w tests/przebiegi.html; nie zapisywane). */
let foreignStats = {};
function resetForeignStats() { foreignStats = { reports: 0, dividends: 0, dividendPln: 0, splits: 0, consolidations: 0, bankruptcies: 0, rescues: 0, ceoChanges: 0 }; }
resetForeignStats();
function noteForeignStat(key, n = 1) { foreignStats[key] = (foreignStats[key] || 0) + n; }

/** Podatek u źródła od dywidendy (stawki zbliżone do realnych, po umowach o unikaniu podwójnego opodatkowania). */
const FOREIGN_WITHHOLDING = { PL: 0.15, DE: 0.15, US: 0.15, CZ: 0.15, SE: 0.15, CH: 0.15, FR: 0.15, JP: 0.10, CN: 0.10, IN: 0.10, TW: 0.21 };

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

/** Tygodniowy składnik log-zwrotu: kurs dąży do wartości godziwej z fundamentów (jak PRICE_MEAN_REVERSION_PER_TICK × luka u krajowych); 0 przed pierwszym raportem. */
function foreignFairPull(i) {
    const fair = Number(i.fundamentals?.fairValue);
    if (!(fair > 0) || !(i.price > 0)) return 0;
    const gap = Math.max(-0.5, Math.min(1, fair / i.price - 1));
    return FOREIGN_CO.fairPull * gap * (i.fundamentals.lossAnchor ? LOSS_REVERSION_FACTOR : 1);
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
    i.quarterlyEarnings = net; noteForeignStat('reports');
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
            if (i.parentId) payForeignParentDividend(i, dps); // 0.16.12 D1
            noteForeignDividend(i, dps); noteForeignStat('dividends'); noteForeignStat('dividendPln', toPln(total, i.currency));
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
    i.statePack = i.state ? Math.round(i.shares * COUNTRY_RULES.statePct) : 0; i.parentPack = Math.floor((i.parentPack || 0) * factor + 1e-9); i.float = i.shares - i.statePack - i.parentPack;
    i.price = priceAfter; i.ema = i.ema / factor; i.history = i.history.map(p => p / factor);
    const f = i.fundamentals;
    if (f) { scalePerShareList(f.history, factor, ['eps']); f.expectedEps /= factor; if (Number.isFinite(f.lastEps)) f.lastEps /= factor; f.fairValue /= factor; updateFundamentalRatios(i); }
    if (i.lastDividend) { i.lastDividend.dps /= factor; }
    if (i.divHistory) i.divHistory = i.divHistory.map(d => d / factor);
    i.lastSplitQuarter = macro.quarter; noteForeignStat(factor > 1 ? 'splits' : 'consolidations');
    const text =`✂️ ${i.name} (${getShareSymbol(i)}): ${factor > 1 ? `podział akcji ${formatSplitRatio(factor)}` : `konsolidacja akcji ${formatSplitRatio(factor)}`}, kurs ${formatNumberPl(priceBefore, 2)} → ${formatNumberPl(priceAfter, 2)} ${i.currency}.`;
    logEvent(text, 'market');
    if ((i.holders?.player || 0) > 0 && typeof pushNews === 'function') pushNews(text, null);
    return { factor, priceBefore, priceAfter };
}

/** Prezes: starzeje się, po 65. roku emerytura (zmiana osoby, ta sama cecha kraju). */
function stepForeignCeo(i) {
    if (!i.ceo) return;
    i.ceo.age += 0.25; i.ceo.tenure += 1;
    if (i.ceo.age >= FOREIGN_CO.ceoRetireAge && Math.random() < (i.ceo.age - 64) * 0.15 / 4) {
        const old = i.ceo.name; noteForeignStat('ceoChanges');
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
        i.financialHealth = Math.max(i.financialHealth, -1); noteForeignStat('rescues');
        return false;
    }
    if (Math.random() >= FOREIGN_CO.bankruptcyChance) return false;
    const text = `🔥 Upadłość: ${i.name} (${getShareSymbol(i)}) znika z giełdy ${COUNTRY_DEFS[i.country]?.name || i.country}; akcjonariusze odzyskują ułamek wartości.`;
    logEvent(text, 'market');
    if ((i.holders?.player || 0) > 0 && typeof pushNews === 'function') pushNews(text, null);
    delistForeignIssuer(i, i.price * 0.02); noteForeignStat('bankruptcies');
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
    processForeignSubsidiariesQuarterly(countryId); // 0.16.12 D1
}

// ---------------------------------------------------------------------------------
// Zapis (pole `c` wiersza emitenta w snapshotcie krajów; zapis v17 go nie ma: ensureForeignCompany buduje model z ceny)
// ---------------------------------------------------------------------------------

function getForeignCompanySnapshot(i) {
    if (!i.fundamentals || !i.balanceSheet) return undefined;
    const f = i.fundamentals, b = i.balanceSheet, rs = x => roundSig(x);
    const row = {
        n: i.shares, ...(i.parentPack > 0 ? { pp: i.parentPack } : {}), b: [rs(b.assets), rs(b.liabilities), rs(b.shareCapital), rs(b.retainedEarnings)], c: rs(i.cash), h: roundSig(i.financialHealth, 4),
        f: { r: rs(f.revenue), e: rs(f.expectedEps), fv: rs(f.fairValue), le: rs(f.lastEps || 0), hs: f.history.map(x => [rs(x.revenue), rs(x.ebitda), rs(x.netIncome), rs(x.eps)]) },
        a: [roundSig(i.marginAdj, 4), roundSig(i.growthBase, 4), roundSig(i.valuationGap, 4)], dp: [i.dividendPolicy, roundSig(i.dividendPayoutRatio, 4)], dy: roundSig(i.divYield, 4)
    };
    if (i.ceo) row.ceo = [i.ceo.name, Math.round(i.ceo.age * 4) / 4, i.ceo.tenure, i.ceo.traits?.[0]?.id || null];
    if (i.lastDividend) row.ld = [rs(i.lastDividend.dps), i.lastDividend.q];
    if (i.divHistory?.length) row.dh = i.divHistory.map(rs);
    if (i.lastSplitQuarter !== undefined) row.ls = i.lastSplitQuarter;
    if (i.lastSurprise !== undefined) row.su = roundSig(i.lastSurprise, 3);
    return row;
}

function applyForeignCompanySnapshot(i, row) {
    if (!row || !Array.isArray(row.b)) return ensureForeignCompany(i); // zapis v17: model z bieżącej ceny
    i.parentPack = Number(row.pp) > 0 ? Number(row.pp) : 0; // 0.16.12 D1: pakiet matki (poza wolnym obrotem)
    if (Number(row.n) > 0) { i.shares = Number(row.n); i.statePack = i.state ? Math.round(i.shares * COUNTRY_RULES.statePct) : 0; i.float = i.shares - i.statePack - i.parentPack; }
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
    if (Array.isArray(row.dh)) i.divHistory = row.dh.map(Number).filter(Number.isFinite);
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
        if (i.statePack + (i.parentPack || 0) + i.float !== i.shares) problems.push(`${i.id}: pakiet państwa + pakiet matki + float ≠ akcje`);
        if (i.parentId && (!foreignIssuers[i.parentId] || !(i.parentPack > 0))) problems.push(`${i.id}: spółka zależna bez matki albo bez pakietu`);
        if (getForeignChildren(i).length > FOREIGN_SUB.max) problems.push(`${i.id}: więcej niż ${FOREIGN_SUB.max} spółek powiązanych`);
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

// =================================================================================
// 0.16.9 W3: spółki zagraniczne jak krajowe — poziomy giełd i wspólny widok „źródło danych” (diagnoza: plany/raporty/diagnoza_0.16.9.md)
// Nic z tego nie jest zapisywane: poziom wynika z ceny (i kapitalizacji) w złotych, widok karty to kopia spółki przeliczona na PLN.
// =================================================================================

const FOREIGN_ELITE_ORDER = ['EMERALD', 'RUBY']; // Diament jest jeden i krajowy; elitarne poziomy obcych mają własne limity (liczone tylko wśród spółek krajów połączonych)

let foreignEliteCache = { q: -1, size: -1, map: {} };

/** Ranking kapitalizacji (w PLN) spółek krajów połączonych → Szmaragd i Rubin wg progów i limitów giełd elitarnych; odświeżany raz na kwartał. */
function getForeignEliteMap() {
    const linked = typeof getLinkedCountries === 'function' ? getLinkedCountries() : [];
    const key = macro.quarter * 1000 + linked.length;
    if (foreignEliteCache.q === key && foreignEliteCache.size === foreignIssuerCount()) return foreignEliteCache.map;
    const pool = linked.flatMap(c => getCountryIssuers(c)).filter(i => i.kind === 'share' && !i.tradeHalted && toPln(i.price, i.currency) >= exchanges.PLATINUM.minPrice)
        .map(i => ({ i, cap: toPln(i.price * i.shares, i.currency) })).sort((a, b) => b.cap - a.cap);
    const map = {};
    let idx = 0;
    for (const tier of FOREIGN_ELITE_ORDER) {
        const def = ELITE_EXCHANGES[tier];
        for (let n = 0; idx < pool.length && n < def.limit && pool[idx].cap >= def.minCap; n++) map[pool[idx++].i.id] = tier;
    }
    foreignEliteCache = { q: key, size: foreignIssuerCount(), map };
    return map;
}
function foreignIssuerCount() { return Object.keys(foreignIssuers).length; }

/** Poziom giełdy spółki: kraj połączony → nasze poziomy (Śmieciowa…Platynowa po cenie w PLN, Szmaragd/Rubin po kapitalizacji); inny kraj → własne poziomy giełdy kraju. */
function getForeignTier(i) {
    const pln = toPln(i.price, i.currency), linked = typeof isCountryLinked === 'function' && isCountryLinked(i.country);
    let key = Object.keys(exchanges).find(k => !isEliteExchange(k) && pln >= exchanges[k].minPrice && pln < exchanges[k].maxPrice) || 'PLATINUM';
    if (linked) {
        key = getForeignEliteMap()[i.id] || key;
        return { key, level: exchanges[key].level, linked: true, label: exchanges[key].name, exchange: key };
    }
    const op = COUNTRY_DEFS[i.country]?.operator;
    return { key, level: exchanges[key].level, linked: false, label: `${op?.id || i.country}: ${exchanges[key].name}`, exchange: `${i.country}:${key}` };
}

/** Spółki krajów połączonych na danym poziomie naszych giełd (filtry listy jak dla krajowych: sektor, „tylko moje”). */
function getLinkedIssuersForExchange(key) {
    if (typeof getLinkedCountries !== 'function' || (typeof sectorFilterState === 'object' && ((sectorFilterState.type && sectorFilterState.type !== 'all') || sectorFilterState.subsector))) return [];
    let list = getLinkedCountries().flatMap(c => getCountryIssuers(c)).filter(i => getForeignTier(i).key === key);
    if (typeof sectorFilterState === 'object' && sectorFilterState.sector !== 'all') list = list.filter(i => i.sectors.some(x => x[0] === sectorFilterState.sector));
    if (typeof ownedOnlyFilter !== 'undefined' && ownedOnlyFilter) list = list.filter(i => getGdrHeld(i) > 0);
    return list;
}

/** Wiersz historii dywidend w walucie spółki (najnowsza pierwsza, 4 ostatnie): stopa dywidendy jak u krajowych liczy się z roku, nie z jednej wypłaty. */
function noteForeignDividend(i, dps) {
    i.divHistory = [dps, ...(i.divHistory || [])].slice(0, 4);
}

/**
 * Widok „źródło danych” dla karty spółki: kopia spółki obcej przeliczona na złote (kurs z chwili otwarcia), w kształcie spółki krajowej,
 * żeby karta (nagłówek, wskaźniki, finanse, wycena) renderowała się tym samym kodem. Pola walutowe: cena, flow bilansu i wyników, wartości na akcję.
 */
function buildForeignCardStock(i) {
    ensureForeignCompany(i, true); // karta przed pierwszym raportem: fundamenty leniwie
    const r = toPln(1, i.currency), t = getForeignTier(i), f = i.fundamentals;
    const segments = i.sectors.map(([sector, share], n) => ({ sector, share, subsector: n === 0 ? i.subsector : null, niche: n === 0 ? i.niche : null }));
    const vm = {
        ...i, foreignSource: i, nativeCurrency: i.currency, nativePrice: i.price, rateToPln: r,
        name: i.name, symbol: getShareSymbol(i), price: i.price * r, totalShares: i.shares, exchange: t.exchange, exchangeLabel: t.label,
        sector: segments.map(s => s.sector), segments, assetType: undefined, isStateOwned: Boolean(i.state), foreignHolders: i.holders,
        cash: (i.cash || 0) * r, weeklyCloses: (i.history || []).map(p => p * r), foreignHistory: [...(i.history || [])],
        balanceSheet: i.balanceSheet ? { assets: i.balanceSheet.assets * r, liabilities: i.balanceSheet.liabilities * r, shareCapital: i.balanceSheet.shareCapital * r, retainedEarnings: i.balanceSheet.retainedEarnings * r } : undefined,
        dividendHistory: (i.divHistory || (i.lastDividend ? [i.lastDividend.dps] : [])).map(dps => ({ dps: dps * r })),
        lastDividend: i.lastDividend ? { ...i.lastDividend, dps: i.lastDividend.dps * r, total: (i.lastDividend.total || 0) * r } : null,
        playerTransactions: [], chartEvents: [],
        isSubsidiaryOf: i.parentId && foreignIssuers[i.parentId] ? getShareSymbol(foreignIssuers[i.parentId]) : undefined, parentStakePct: i.parentPack > 0 ? i.parentPack / i.shares : undefined // 0.16.12 D1
    };
    if (f) {
        vm.fundamentals = { ...f, revenue: f.revenue * r, expectedEps: f.expectedEps * r, lastEps: (f.lastEps || 0) * r, fairValue: f.fairValue * r,
            history: f.history.map(q => ({ ...q, revenue: q.revenue * r, ebitda: q.ebitda * r, netIncome: q.netIncome * r, eps: q.eps * r })) };
        updateFundamentalRatios(vm);
    }
    return vm;
}

/** Źródło danych karty po symbolu: spółka krajowa z `stocks` albo widok spółki zagranicznej (symbol „ID.KRAJ”). */
function getCompanyCardSource(symbol) {
    const domestic = stocks.find(s => s.symbol === symbol);
    if (domestic || typeof symbol !== 'string' || !symbol.includes('.')) return domestic || null;
    const issuer = foreignIssuers[symbol.split('.')[0]];
    return issuer && issuer.kind === 'share' && getShareSymbol(issuer) === symbol ? buildForeignCardStock(issuer) : null;
}

// =================================================================================
// 0.16.12 D1: SPÓŁKI ZALEŻNE SPÓŁEK ZAGRANICZNYCH (okrojone)
// Spółka zagraniczna zakłada najwyżej jedną córkę i dwie spółki zależne (łącznie ≤ 3 powiązane). Nazwa i segment z `pickSubsidiaryName` /
// `pickSubsidiarySegment` (finance.js — ta sama reguła: długi człon matki skraca się do 3 liter bez polskich znaków). Córka jest zwykłym emitentem kraju
// (liczy się do limitu giełdy kraju, F3 z 0.16.8); pakiet matki (`parentPack`) jest poza wolnym obrotem, jak pakiet państwa, a dywidenda córki płynie do kasy matki.
// Pierwsza założona to córka, kolejne to spółki zależne (etykieta wynika z kolejności listingu, nic poza `parentId` i `parentPack` nie jest zapisywane).
// =================================================================================

const FOREIGN_SUB = {
    max: 3, maxDaughters: 1,
    chance: 0.06,                 // na kwartał i spółkę spełniającą warunki (bardziej opłacalne duże, zdrowe spółki)
    minHealth: 1,                 // kondycja finansowa matki
    capitalPln: 500000,           // minimalny kapitał córki (w przeliczeniu na walutę kraju); matka musi mieć co najmniej 2× tyle gotówki
    stake: [0.6, 0.8],            // pakiet matki po IPO córki
    priceRangePln: [8, 25]        // cena akcji córki (PLN) → liczba akcji wynika z kapitału
};

function getForeignChildren(parent) {
    return getCountryIssuers(parent.country).filter(c => c.parentId === parent.id).sort((a, b) => a.listedQ - b.listedQ || a.id.localeCompare(b.id));
}
function getForeignParent(child) { return child?.parentId ? foreignIssuers[child.parentId] || null : null; }
/** „córka” (pierwsza założona) albo „spółka zależna” (kolejne). */
function getForeignSubsidiaryKind(child) {
    const parent = getForeignParent(child);
    return parent && getForeignChildren(parent)[0] === child ? 'córka' : 'spółka zależna';
}
/** Matka bez spółki-widmo: pakiet wraca do wolnego obrotu (matka znika z giełdy, np. upadłość, przejęcie). */
function releaseForeignChildren(parentId) {
    for (const child of Object.values(foreignIssuers)) {
        if (child.parentId !== parentId) continue;
        delete child.parentId; child.float += child.parentPack || 0; child.parentPack = 0;
    }
}

/** Cienki obiekt dla `pickSubsidiarySegment`/`pickSubsidiaryName` (finance.js): nazwa i segmenty matki zagranicznej. */
function foreignParentProxy(parent) {
    return { name: parent.name, segments: parent.sectors.map(([sector, share], n) => ({ sector, share, subsector: n === 0 ? parent.subsector : null })) };
}

function canFoundForeignSubsidiary(parent) {
    if (parent.kind !== 'share' || parent.state || parent.giant || parent.special || parent.parentId || parent.tradeHalted || !parent.fundamentals) return false;
    const def = COUNTRY_DEFS[parent.country], kids = getForeignChildren(parent);
    if (!def || kids.length >= FOREIGN_SUB.max || getCountryIssuers(parent.country).length >= getCountryLimit(parent.country)) return false;
    return parent.financialHealth >= FOREIGN_SUB.minHealth && parent.cash >= 2 * fromPln(FOREIGN_SUB.capitalPln, parent.currency);
}

/** IPO spółki zależnej: kapitał z gotówki matki (10% gotówki, nie więcej niż 5% kapitalizacji), pakiet matki 60–80%. Zwraca emitenta albo null. */
function foundForeignSubsidiary(parent) {
    if (!canFoundForeignSubsidiary(parent)) return null;
    const def = COUNTRY_DEFS[parent.country], cur = parent.currency;
    const capital = Math.max(fromPln(FOREIGN_SUB.capitalPln, cur), Math.min(parent.cash * 0.1, parent.price * parent.shares * 0.05));
    if (parent.cash < capital) return null;
    const proxy = foreignParentProxy(parent), seg = pickSubsidiarySegment(proxy);
    const name = pickSubsidiaryName(proxy, seg.sector);
    let n = 1, id;
    do { id = `${parent.id.slice(0, 3)}Z${n++}`; } while (foreignIssuers[id]);
    const price = Math.round(fromPln(getRandomInRange(...FOREIGN_SUB.priceRangePln), cur) * 100) / 100 || 10;
    const child = createCountryIssuer(def, { id, name, sector: seg.sector, subsector: seg.subsector, kind: 'normal', price, generated: true });
    child.generated = true; child.parentId = parent.id;
    child.shares = child.totalShares = Math.max(100000, Math.round(capital * 1.5 / price));
    child.parentPack = Math.floor(child.shares * getRandomInRange(...FOREIGN_SUB.stake));
    child.statePack = 0; child.float = child.shares - child.parentPack;
    child.balanceSheet = { assets: capital, liabilities: 0, shareCapital: capital, retainedEarnings: 0 }; child.cash = capital; child.financialHealth = 1;
    child.dividendPolicy = parent.dividendPolicy; if (typeof setCompanyDividendPolicy === 'function') setCompanyDividendPolicy(child, parent.dividendPolicy);
    adjustCompanyCash(parent, -capital); // gotówka → udziały w córce (aktywa matki bez zmian)
    logEvent(`🆕 IPO: ${parent.name} zakłada ${getForeignChildren(parent).length === 1 ? 'spółkę-córkę' : 'spółkę zależną'} ${child.name} (${getShareSymbol(child)}) na giełdzie ${def.name} — ${Math.round((1 - child.parentPack / child.shares) * 100)}% akcji w ofercie publicznej.`, 'market');
    return child;
}

/** Kwartalnie: spółki zagraniczne z zapasem gotówki zakładają zależne (wywoływane z processForeignCompaniesQuarterly po raportach). */
function processForeignSubsidiariesQuarterly(countryId) {
    for (const parent of [...getCountryIssuers(countryId)]) {
        if (Math.random() < FOREIGN_SUB.chance) foundForeignSubsidiary(parent);
    }
}

/** Dywidenda córki: pakiet matki wpływa do jej kasy (reszta idzie do posiadaczy jak zwykle). */
function payForeignParentDividend(child, dps) {
    const parent = getForeignParent(child);
    if (parent && dps > 0 && child.parentPack > 0) adjustCompanyCash(parent, child.parentPack * dps); // spółki jednego kraju: bez podatku u źródła
}

function describeForeignSubsidiaryLine(child) {
    const parent = getForeignParent(child);
    return parent ? `${getForeignSubsidiaryKind(child)} ${parent.name} (${Math.round(child.parentPack / child.shares * 100)}%)` : '';
}

// =================================================================================
// 0.16.12 D2: WALNE ZGROMADZENIA SPÓŁEK ZAGRANICZNYCH NA WSPÓLNYM KODZIE (ma.js)
// `holdAgm`, `tallyAgmItem`, porządek obrad i okno „Walne” działają na emitencie zagranicznym przez cienkie haki: `isForeignShare`, lista akcjonariuszy z `holders`
// (gracz, boty, pakiet państwa, pakiet matki), udział funduszu z `holders.player`, kwoty emisji/skupu w walucie spółki. Dodatkowe punkty porządku obrad:
// wynagrodzenia zarządu i odwołanie prezesa przy złej kondycji. Gracz głosuje i zgłasza wnioski od >50% głosów (jak przy krajowych).
// Drabina nadzoru po przekroczeniu progu wezwania kraju (`COUNTRY_DEFS[…].oversight.callThreshold`): ostrzeżenie → kara → nakaz wezwania na pozostałe akcje
// (gdy fundusz ma na nie gotówkę; inaczej nakaz odsprzedaży).
// =================================================================================

const FOREIGN_AGM = { payMargin: 0.002, tenderPremium: 0.10, tenderBotShare: 0.7, tenderRetail: [0.6, 0.9] };

function isForeignShare(stock) { return Boolean(stock && stock.kind === 'share' && stock.country && stock.holders && stock.currency); }
function getForeignGovernedList() { return getForeignIssuerList().filter(i => i.kind === 'share' && i.fundamentals && !i.tradeHalted); }
function getForeignIssuerBySymbol(symbol) {
    if (typeof symbol !== 'string' || !symbol.includes('.')) return null;
    const issuer = foreignIssuers[symbol.split('.')[0]];
    return issuer && issuer.kind === 'share' && getShareSymbol(issuer) === symbol ? issuer : null;
}

function getForeignShareholders(i) {
    const list = [], add = (id, name, kind, shares, entity = null) => { if (shares >= 1) list.push({ id, name, kind, shares, pct: shares / i.totalShares, entity }); };
    for (const [id, qty] of Object.entries(i.holders || {})) {
        if (id === 'player') add('player', playerProfile?.fundName || 'Twój fundusz', 'player', Number(qty));
        else { const bot = aiCompetitors.find(b => b.id === id); if (bot) add(id, bot.isMafia ? 'Akcjonariusz nieujawniony' : bot.name, 'ai', Number(qty), bot); }
    }
    if (i.statePack > 0) add('state', 'Skarb Państwa', 'state', i.statePack);
    if (i.parentPack > 0) { const parent = getForeignParent(i); add(`${i.parentId}:stake`, parent?.name || 'Spółka matka', 'company', i.parentPack, parent); }
    return list.sort((a, b) => b.shares - a.shares);
}

/** Dodatkowe punkty porządku obrad spółki zagranicznej: wynagrodzenia (co drugie walne) i odwołanie prezesa przy kondycji ≤ −2. */
function getForeignAgmItems(i) {
    const items = [];
    if (Math.random() < 0.5) items.push({ id: 'pay', kind: 'board', type: 'pay', label: 'Podwyżka wynagrodzeń zarządu o 10%' });
    if (i.ceo && i.financialHealth <= -2 && (i.ceo.tenure || 0) >= 2) items.push({ id: 'replaceCeo', kind: 'board', type: 'replaceCeo', label: `Odwołanie prezesa ${i.ceo.name}` });
    return items;
}

/** Skutki uchwał, które w spółkach krajowych dotykają `stocks`/akcji w obrocie; tu na modelu emitenta (kwoty w walucie spółki, akcje przez `shares` i `float`). */
function applyForeignAgmResolution(i, item) {
    const syncPrice = () => { if (i.history.length) i.history[i.history.length - 1] = i.price; };
    switch (item.type) {
        case 'buyback': {
            if (typeof noteCapitalCycleResolution === 'function') noteCapitalCycleResolution(i, item);
            const n = Math.floor(Math.min(getGdrFree(i), Math.max(0, i.cash) * 0.1 / Math.max(0.01, i.price)));
            if (n <= 0) return 'brak akcji do skupu';
            const cost = n * i.price;
            adjustCompanyCash(i, -cost); adjustBalanceSheet(i, { assets: -cost, retainedEarnings: -cost });
            i.shares -= n; i.totalShares = i.shares; i.float -= n; i.price *= 1.02; syncPrice();
            return `skupiono ${n.toLocaleString('pl-PL')} akcji`;
        }
        case 'issue': {
            if (typeof noteCapitalCycleResolution === 'function') noteCapitalCycleResolution(i, item);
            const n = Math.floor(i.shares * 0.1), amount = n * i.price * 0.95;
            if (n <= 0) return '';
            i.shares += n; i.totalShares = i.shares; i.float += n;
            adjustCompanyCash(i, amount); adjustBalanceSheet(i, { assets: amount });
            i.balanceSheet.shareCapital = (Number(i.balanceSheet.shareCapital) || 0) + amount;
            i.price *= 0.97; syncPrice();
            return `wyemitowano ${n.toLocaleString('pl-PL')} akcji`;
        }
        case 'replaceCeo':
            i.ceo = newForeignCeo(i); noteForeignStat('ceoChanges');
            return `nowy prezes: ${i.ceo.name}`;
        case 'pay':
            i.marginAdj = Math.max(-0.6, (Number(i.marginAdj) || 0) - FOREIGN_AGM.payMargin / Math.max(0.05, getSectorProfile(i).margin)); // marginAdj jest względne (±30%): −0,2 pp marży
            return 'wyższe koszty wynagrodzeń';
        case 'sellCompany':
            return typeof acceptForeignTakeoverProposal === 'function' ? acceptForeignTakeoverProposal(i) : 'brak nabywcy';
    }
    return '';
}

/**
 * Nakaz wezwania na pozostałe akcje (trzecie przekroczenie progu): fundusz kupuje po kursie +10% pakiety botów (70%) i 60–90% wolnego obrotu.
 * Brak gotówki na całość: przy nadzorze poziomu ≥ 3 nakaz odsprzedaży, inaczej wezwanie na tyle akcji, na ile starcza gotówki. Zwraca 'tender' albo 'resale'.
 */
function runForeignTenderOrder(issuer) {
    const o = getOversight(issuer.country), cur = issuer.currency, price = Math.round(issuer.price * (1 + FOREIGN_AGM.tenderPremium) * 1000) / 1000, sym = getGdrSymbol(issuer);
    const bots = Object.entries(issuer.holders).filter(([id, q]) => id !== 'player' && q >= 1).map(([id, q]) => [id, Math.floor(q * FOREIGN_AGM.tenderBotShare)]);
    const botTotal = bots.reduce((s, [, n]) => s + n, 0), retail = Math.floor(Math.max(0, getGdrFree(issuer)) * getRandomInRange(...FOREIGN_AGM.tenderRetail));
    const localCash = getCurrencyCash('player', cur), have = Math.max(0, playerCash) + toPln(localCash, cur), costPln = toPln((botTotal + retail) * price, cur);
    let scale = 1;
    if (costPln > have) {
        if ((o.level || 0) >= 3) {
            issuer.oversightResale = { until: macro.quarter + FOREIGN_OVERSIGHT.resaleQuarters };
            const body = `Fundusz nie ma gotówki na wezwanie na pozostałe akcje ${issuer.name} (${formatZl(costPln, 0)}). ${o.name} nakazuje zejść poniżej progu ${Math.round(o.callThreshold * 100)}% w ${FOREIGN_OVERSIGHT.resaleQuarters} kw. — inaczej nadwyżka zostanie sprzedana na rynku.`;
            if (typeof addMail === 'function') addMail({ sender: o.name, subject: `⛔ ${o.name}: nakaz odsprzedaży ${issuer.name}`, body, importance: 3 });
            logEvent(`⚖️ ${o.name}: ${body}`, 'review');
            return 'resale';
        }
        scale = have / costPln;
    }
    let bought = 0;
    for (const [id, n0] of bots) {
        const n = Math.floor(n0 * scale), bot = aiCompetitors.find(b => b.id === id);
        if (!bot || n <= 0) continue;
        issuer.holders[id] -= n; if (issuer.holders[id] < 1) delete issuer.holders[id];
        addCurrencyCash(bot, cur, n * price); bought += n;
    }
    bought += Math.floor(retail * scale);
    const cost = bought * price, useLocal = Math.min(localCash, cost);
    if (useLocal > 0) { playerCashByCurrency[cur] = localCash - useLocal; if (playerCashByCurrency[cur] < 1e-9) delete playerCashByCurrency[cur]; }
    const costPlnPaid = toPln(cost - useLocal, cur);
    playerCash -= costPlnPaid;
    if (costPlnPaid > 0) recordPayment('player-fund', 'external:akcjonariusze', costPlnPaid, `Wezwanie (nakaz ${o.name}) ${sym}`);
    issuer.holders.player = getGdrHeld(issuer) + bought;
    const body = `Na nakaz ${o.name} fundusz ogłosił wezwanie na pozostałe akcje ${issuer.name} po ${formatNumberPl(price, 2)} ${cur} (kurs +${Math.round(FOREIGN_AGM.tenderPremium * 100)}%). Sprzedano ${bought.toLocaleString('pl-PL')} akcji za ${formatZl(toPln(cost, cur), 0)}; fundusz ma teraz ${(getIssuerStake(issuer, 'player') * 100).toFixed(1)}% głosów.`;
    if (typeof addMail === 'function') addMail({ sender: o.name, subject: `📣 ${o.name}: nakaz wezwania ${issuer.name}`, body, importance: 3 });
    logEvent(`📣 ${o.name}: ${body}`, 'review');
    return 'tender';
}
