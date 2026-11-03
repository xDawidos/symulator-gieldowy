// =================================================================================
// 0.17 S6: ZBROJENIA, SUROWCE I BEZPIECZEŃSTWO PAŃSTWA
// =================================================================================
// Budżet obronny kraju startowego = przychody budżetu × defenseShare partii (wydatek budżetu, schodzi ze skarbu).
// Zamówienia trafiają do krajowej zbrojeniówki proporcjonalnie do kapitalizacji jako przychód kwartału — względem
// poziomu przy udziale 2% (ten jest już w bazie przychodów), więc przy 2% średnio zero. Poziom bezpieczeństwa (0–100)
// wpływa na napływ kapitału zagranicznego, C/Z, popyt konsumentów i szansę embarga. Stan w society.defense (zapis w całości).

const DEFENSE_RULES = {
    neutralShare: 0.02,          // udział, przy którym zamówienia i premia Półprzewodników dają zero
    worldShare: 0.025,           // udział krajów obcych (stały) i mianownik indeksu zbrojeń
    embargoBoost: 1.5, boostQuarters: [4, 8],
    shock: [5, 15], shockQuarters: [4, 8],
    semiconductorPremium: 0.01,  // +1% przychodu Półprzewodników przy udziale 3,5%
    peRange: 0.02,               // ±2% wyceny przy S = 100 / 0
    demandRange: 0.005,          // ±0,5 pp popytu przy odchyleniu S o 25
    botBase: 0.8, botSlope: 0.4  // szansa zakupu botów zagranicznych × (0,8 + 0,4·S/100)
};

function ensureDefense() {
    if (!society.defense || typeof society.defense !== 'object') society.defense = { boostUntil: -1, shocks: [], orders: {} };
    const d = society.defense;
    if (!Array.isArray(d.shocks)) d.shocks = [];
    if (!d.orders || typeof d.orders !== 'object') d.orders = {};
    if (!Number.isFinite(d.boostUntil)) d.boostUntil = -1;
    return d;
}

/** Udział obronny rządu (koalicja: średnia ważona), ×1,5 w 4–8 kw. po embargu. */
function getDefenseShare() {
    const party = typeof getRulingParty === 'function' && typeof macro === 'object' ? getRulingParty() : null;
    const base = Number(party?.defenseShare) || DEFENSE_RULES.neutralShare;
    return base * (isDefenseBoosted() ? DEFENSE_RULES.embargoBoost : 1);
}
function isDefenseBoosted() { return typeof society === 'object' && society?.defense ? society.defense.boostUntil > macro.quarter : false; }

/** Szok geopolityczny (start embarga): podbicie udziałów i spadek bezpieczeństwa wszystkich krajów. */
function noteGeopoliticalShock() {
    if (typeof society !== 'object' || !society) return;
    const d = ensureDefense(), q = macro.quarter;
    d.boostUntil = Math.max(d.boostUntil, q + getRandomIntInRange(...DEFENSE_RULES.boostQuarters));
    d.shocks.push({ v: Math.round(getRandomInRange(...DEFENSE_RULES.shock) * 10) / 10, until: q + getRandomIntInRange(...DEFENSE_RULES.shockQuarters) });
    if (typeof logSociety === 'function') logSociety(`🛡️ Szok geopolityczny: rząd podnosi wydatki obronne o 50% (${(getDefenseShare() * 100).toFixed(1)}% przychodów budżetu), poziom bezpieczeństwa spada.`);
}
function getGeopoliticalShockSum() {
    if (typeof society !== 'object' || !society?.defense) return 0;
    const d = society.defense;
    d.shocks = d.shocks.filter(s => s.until > macro.quarter);
    return d.shocks.reduce((sum, s) => sum + (Number(s.v) || 0), 0);
}

/** Poziom bezpieczeństwa kraju startowego: 50 + 600·(udział − 2%) + 10·efektywność policji − szoki. */
function getHomeSecurityLevel() {
    const police = typeof getInstitutionEffectiveness === 'function' && typeof oversight === 'object' && oversight?.police ? getInstitutionEffectiveness(oversight.police) : 0.3;
    return clampValue(50 + 600 * (getDefenseShare() - DEFENSE_RULES.neutralShare) + 10 * police - getGeopoliticalShockSum(), 0, 100);
}
/** Kraj obcy: stała wartość z COUNTRY_DEFS minus szoki; brak kraju / 'PL' → kraj startowy. */
function getCountrySecurityLevel(country) {
    if (!country || country === 'PL') return getHomeSecurityLevel();
    const base = Number(COUNTRY_DEFS[country]?.security);
    return Number.isFinite(base) ? clampValue(base - getGeopoliticalShockSum(), 0, 100) : 50;
}

/** Indeks zbrojeń świata (S1, β_z): średni udział krajów / 2,5%. Kraje obce: stałe 2,5%, też ×1,5 po embargu. */
function getGlobalDefenseIndex() {
    if (typeof society !== 'object' || !society) return 1;
    const foreign = Object.keys(COUNTRY_DEFS).filter(id => id !== 'PL').length;
    const world = DEFENSE_RULES.worldShare * (isDefenseBoosted() ? DEFENSE_RULES.embargoBoost : 1);
    return (getDefenseShare() + foreign * world) / (1 + foreign) / DEFENSE_RULES.worldShare;
}

function getHomeDefenseCompanies() {
    return typeof stocks !== 'undefined' ? stocks.filter(s => !s.country && !s.isBankrupt && typeof isDefenseCompany === 'function' && isDefenseCompany(s)) : [];
}

/** Rozliczenie kwartału (settleSocialBudget): linia budżetu, skarb, zamówienia na następny kwartał. Zwraca wydatek. */
function settleDefenseBudget(revenue) {
    const d = ensureDefense(), share = getDefenseShare();
    const spending = Math.max(0, revenue) * share;
    governmentTreasury -= spending;
    const extra = Math.max(0, revenue) * (share - DEFENSE_RULES.neutralShare); // ponad poziom wliczony w bazę przychodów
    const companies = getHomeDefenseCompanies(), caps = companies.map(s => Math.max(0, getMarketCapValue(s)));
    const total = caps.reduce((a, b) => a + b, 0);
    d.orders = {};
    if (total > 0) companies.forEach((s, i) => { if (caps[i] > 0) d.orders[s.symbol] = Math.round(extra * caps[i] / total); });
    d.lastShare = share;
    return spending;
}

/** Mnożnik przychodu kwartału (computeQuarterResults): zamówienia obronne, premia Półprzewodników. Tylko spółki krajowe. */
function getDefenseRevenueFactor(stock, baseRevenue) {
    if (typeof society !== 'object' || !society?.defense || stock.country) return 1;
    let f = 1;
    const order = Number(society.defense.orders[stock.symbol]) || 0;
    if (order && baseRevenue > 0) f += Math.max(-0.5, Math.min(0.5, order / baseRevenue));
    const semi = getStockSegments(stock).filter(seg => seg.subsector === 'Półprzewodniki').reduce((s, seg) => s + seg.share, 0);
    if (semi > 0) f += DEFENSE_RULES.semiconductorPremium * (getDefenseShare() - DEFENSE_RULES.neutralShare) / 0.015 * semi;
    return f;
}

/** Premia za ryzyko kraju: ±2% wyceny przy S = 100 / 0. */
function getSecurityValuationFactor(stock) {
    if (typeof society !== 'object' || !society) return 1;
    return 1 + DEFENSE_RULES.peRange * (getCountrySecurityLevel(stock?.country) - 50) / 50;
}
/** Popyt konsumentów: ±0,5 pp przy odchyleniu S o 25 od 50. */
function getSecurityDemandAdj() { return DEFENSE_RULES.demandRange * (getHomeSecurityLevel() - 50) / 25; }
/** Szansa zakupu przez boty zagraniczne na rynku krajowym. */
function getSecurityBotFactor() { return DEFENSE_RULES.botBase + DEFENSE_RULES.botSlope * getHomeSecurityLevel() / 100; }
