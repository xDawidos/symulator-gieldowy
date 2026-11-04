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
    return typeof stocks !== 'undefined' ? stocks.filter(s => !s.isBankrupt && typeof isDefenseCompany === 'function' && isDefenseCompany(s)) : [];
}
/** Spółka rynku krajowego (krajowe mają country 'PL' jako kraj pochodzenia, więc decyduje lista `stocks`, nie pole). */
function isHomeIssuer(stock) { return typeof stocks !== 'undefined' && stocks.includes(stock); }

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
    if (typeof society !== 'object' || !society?.defense || !isHomeIssuer(stock)) return 1;
    let f = 1;
    const order = Number(society.defense.orders[stock.symbol]) || 0;
    if (order && baseRevenue > 0) f += Math.max(-0.5, Math.min(0.5, order / baseRevenue));
    const semi = getStockSegments(stock).filter(seg => seg.subsector === 'Półprzewodniki').reduce((s, seg) => s + seg.share, 0);
    if (semi > 0) f += DEFENSE_RULES.semiconductorPremium * (getDefenseShare() - DEFENSE_RULES.neutralShare) / 0.015 * semi;
    return f;
}

/** Poziom bezpieczeństwa słowem i liczbą (karta kraju, budżet). */
function getSecurityLabel(level) { return `${level >= 70 ? 'wysokie' : level >= 45 ? 'umiarkowane' : 'niskie'} (${Math.round(level)}/100)`; }

/** Premia za ryzyko kraju: ±2% wyceny przy S = 100 / 0. */
function getSecurityValuationFactor(stock) {
    if (typeof society !== 'object' || !society) return 1;
    return 1 + DEFENSE_RULES.peRange * (getCountrySecurityLevel(isHomeIssuer(stock) ? null : stock?.country) - 50) / 50;
}
/** Popyt konsumentów: ±0,5 pp przy odchyleniu S o 25 od 50. */
function getSecurityDemandAdj() { return DEFENSE_RULES.demandRange * (getHomeSecurityLevel() - 50) / 25; }
/** Szansa zakupu przez boty zagraniczne na rynku krajowym. */
function getSecurityBotFactor() { return DEFENSE_RULES.botBase + DEFENSE_RULES.botSlope * getHomeSecurityLevel() / 100; }

// =================================================================================
// 0.17 S7: AKADEMIA — 8 lekcji o surowcach, frachcie i bezpieczeństwie
// =================================================================================
Object.assign(ACADEMY_ENTRIES, {
    cyklSurowcowy: {
        title: 'Cykl surowcowy', get icon() { return academyIcon('rynek'); },
        text: 'Ceny surowców falują wokół średniej. Drogi surowiec zachęca do nowych kopalń i oszczędzania, więc po czasie podaż rośnie, popyt słabnie i cena wraca. Tani działa odwrotnie. Do tego dochodzą koniunktura w przemyśle, pora roku i szoki, takie jak embargo albo susza. Szok mija, ale ślad w wynikach spółek zostaje na kilka kwartałów.',
        example: () => { const id = COMMODITY_IDS.reduce((a, b) => Math.abs(getCommodityTrendRatio(b) - 1) > Math.abs(getCommodityTrendRatio(a) - 1) ? b : a); return `Najdalej od średniej z 8 kwartałów jest teraz ${COMMODITY_DEFS[id].name}: ${formatNumberPl((getCommodityTrendRatio(id) - 1) * 100, 0)}%.`; },
        quiz: [
            { q: 'Co zwykle dzieje się po długim okresie drogiego surowca?', a: ['podaż rośnie, a cena wraca w dół', 'cena rośnie bez końca', 'popyt zawsze rośnie'], c: 0 },
            { q: 'Co najczęściej zaczyna nagły skok ceny ropy?', a: ['szok, np. embargo', 'wypłata dywidendy', 'split akcji'], c: 0 },
            { q: 'Dlaczego „drogo” nie znaczy „będzie drożej”?', a: ['ceny surowców wracają do średniej', 'giełda zamyka się w piątki', 'surowce nie mają ceny'], c: 0 }
        ]
    },
    kosztWsadu: {
        title: 'Koszt wsadu i przerzucenie na ceny', get icon() { return academyIcon('magazyn'); },
        text: 'Wsad to surowiec zużywany w produkcji: ropa w chemii, metale w przemyśle. Gdy drożeje, marża spada od razu, ale spółka z czasem podnosi ceny i przerzuca część kosztu na klientów. Zanim to zrobi, mija kilka kwartałów. Część spółek zabezpiecza się kontraktami i przez pewien czas płaci starą cenę. Producent surowca zyskuje tam, gdzie odbiorca traci.',
        example: () => `Ropa jest teraz ${formatNumberPl((getCommodityTrendRatio('oil') - 1) * 100, 0)}% od średniej z 8 kwartałów: tyle zmienia się koszt wsadu przed przerzuceniem i zabezpieczeniem.`,
        quiz: [
            { q: 'Co dzieje się z marżą zaraz po wzroście ceny wsadu?', a: ['spada', 'rośnie', 'nie zmienia się nigdy'], c: 0 },
            { q: 'Co łagodzi ten spadek po kilku kwartałach?', a: ['przerzucenie kosztu na ceny', 'split akcji', 'zmiana giełdy'], c: 0 },
            { q: 'Kto zyskuje na drogim surowcu?', a: ['jego producent', 'każdy odbiorca', 'nikt'], c: 0 }
        ]
    },
    kontraktTerminowy: {
        title: 'Kontrakt terminowy', get icon() { return academyIcon('waga'); },
        text: 'Kontrakt terminowy to umowa na cenę surowca w dniu zapadalności. Pozycja długa zarabia na wzroście, krótka na spadku. Nikt nie dostarcza beczek: na koniec kwartału wynik rozlicza się gotówką po cenie z tego dnia. Płacisz tylko depozyt, więc dźwignia mnoży i zysk, i stratę. Podatek od zysku z kontraktów jest taki jak od akcji: fundusz jest zwolniony, a zysk podnosi NAV i jest opodatkowany u klientów przy umorzeniu udziałów.',
        example: () => { const q = getContractSeries()[1] ?? getContractSeries()[0]; return `Seria ${getContractName('oil', q)}: ${fmtCommodityUsd(getContractPriceUsd('oil', q))} przy cenie bieżącej ${fmtCommodityUsd(getCommodityPrice('oil'))}.`; },
        quiz: [
            { q: 'Jak rozlicza się kontrakt w dniu zapadalności?', a: ['gotówką po cenie z tego dnia', 'dostawą surowca do funduszu', 'nie rozlicza się'], c: 0 },
            { q: 'Która pozycja zarabia na spadku ceny?', a: ['krótka', 'długa', 'żadna'], c: 0 },
            { q: 'Gdzie płaci się podatek od zysku funduszu z kontraktów?', a: ['u klientów, przy umorzeniu udziałów', 'w funduszu i drugi raz u klientów', 'nigdzie'], c: 0 }
        ]
    },
    contangoBackwardation: {
        title: 'Contango i backwardation', get icon() { return academyIcon('rynek'); },
        text: 'Contango znaczy, że kontrakt jest droższy od ceny bieżącej. Backwardation, że tańszy. W cenie kontraktu siedzi koszt przechowania i oczekiwany powrót do średniej: surowiec drogi ma kontrakty tańsze, a tani droższe. Dlatego „kup tanio i czekaj” nie daje darmowego zysku. Przedłużając długą pozycję w contango, co kwartał kupujesz drożej i tracisz na tej różnicy.',
        example: () => { const q = getContractSeries()[1] ?? getContractSeries()[0]; return `Ropa: ${getContractStructure('oil', q)} na serii ${getContractName('oil', q)}.`; },
        quiz: [
            { q: 'Kontrakt jest droższy od ceny bieżącej. Jak to się nazywa?', a: ['contango', 'backwardation', 'dywidenda'], c: 0 },
            { q: 'Jaką strukturę zwykle ma surowiec dużo droższy od średniej?', a: ['backwardation', 'contango', 'żadną'], c: 0 },
            { q: 'Co traci długa pozycja przedłużana w contango?', a: ['różnicę przy każdym przedłużeniu', 'nic', 'depozyt w całości'], c: 0 }
        ]
    },
    depozytTowary: {
        title: 'Depozyt i margin call na towarach', get icon() { return academyIcon('alert'); },
        text: 'Depozyt to część wartości pozycji, którą blokujesz na czas kontraktu. Przy dźwigni 1:5 ruch ceny o 10% to 50% depozytu. Gdy kapitał pozycji spadnie poniżej połowy depozytu, dostajesz margin call. Gdy spadnie jeszcze niżej, pozycja zamyka się sama. Surowce potrafią skoczyć o kilkadziesiąt procent w jednym szoku, dlatego dźwignia na gazie i węglu jest mniejsza niż na złocie.',
        example: () => `Teraz: dźwignia do 1:${COMMODITY_MARKET.leverage.gold} na złocie, do 1:${COMMODITY_MARKET.leverage.gas} na gazie. Margin call poniżej ${Math.round(MARGIN_RULES.warnBelow * 100)}% depozytu.`,
        quiz: [
            { q: 'Dźwignia 1:5, cena spada o 10%. Ile depozytu tracisz?', a: ['50%', '10%', '5%'], c: 0 },
            { q: 'Co się dzieje, gdy kapitał pozycji spadnie zbyt nisko?', a: ['pozycja zamyka się sama', 'cena wraca', 'dopłaca bank'], c: 0 },
            { q: 'Dlaczego gaz ma mniejszą dźwignię niż złoto?', a: ['jego cena mocniej się waha', 'jest tańszy', 'nie ma powodu'], c: 0 }
        ]
    },
    etcEtf: {
        title: 'ETC i ETF surowcowy', get icon() { return academyIcon('moneta'); },
        text: 'ETC to papier, który podąża za ceną jednego surowca. ETF koszykowy trzyma kilka surowców po równo i co kwartał wraca do równych wag. Nie ma tu dźwigni, depozytu ani zapadalności, więc nie grozi margin call. Płacisz za to roczną opłatą i spreadem. To prostszy sposób wejścia w surowce niż kontrakty, ale wynik w złotych dalej zależy od kursu dolara.',
        example: () => `ETF „${COMMODITY_BASKET_NAME}” kosztuje teraz ${formatZl(getCommodityFundPrice('basket'), 2)}, opłata ${commodityPct(COMMODITY_FUNDS.basketFee)}% rocznie.`,
        quiz: [
            { q: 'Czego nie ma w ETC w porównaniu z kontraktem?', a: ['dźwigni i margin callu', 'ceny', 'opłaty'], c: 0 },
            { q: 'Co robi ETF koszykowy co kwartał?', a: ['wraca do równych wag', 'wypłaca dywidendę', 'zmienia walutę'], c: 0 },
            { q: 'Od czego poza ceną surowca zależy wynik w złotych?', a: ['od kursu dolara', 'od ceny akcji banku', 'od niczego'], c: 0 }
        ]
    },
    frachtWaskieGardla: {
        title: 'Fracht i wąskie gardła', get icon() { return academyIcon('samolot'); },
        text: 'Indeks frachtu pokazuje koszt przewozu: morzem, powietrzem i lądem. Rośnie z ceną paliwa, popytem w przemyśle i zakłóceniami, takimi jak strajk kolejarzy. Spada, gdy kraj ma większą przepustowość: porty, lotniska, tory i autostrady. Drogi fracht to zysk przewoźnika i koszt dla importera. Dlatego budowa infrastruktury zmienia wyniki spółek daleko od budownictwa, ale dopiero po latach.',
        example: () => `Fracht lądowy: ${formatNumberPl(getFreightIndex('land'), 0)} (baza 100), przepustowość ${formatNumberPl(getFreightCapacity('land'), 2)}.`,
        quiz: [
            { q: 'Co obniża indeks frachtu?', a: ['większa przepustowość kraju', 'droższe paliwo', 'strajk'], c: 0 },
            { q: 'Kto zyskuje na drogim frachcie?', a: ['przewoźnik', 'importer', 'każda spółka'], c: 0 },
            { q: 'Co się dzieje z przepustowością bez wydatków na utrzymanie?', a: ['spada przez zużycie', 'rośnie sama', 'nie zmienia się'], c: 0 }
        ]
    },
    bezpieczenstwoZbrojenia: {
        title: 'Bezpieczeństwo państwa i zbrojenia', get icon() { return academyIcon('bank'); },
        text: 'Budżet obronny to część wpływów państwa, zależna od rządzącej partii. Daje zamówienia zbrojeniówce, ale pogłębia deficyt. Po szoku geopolitycznym rządy zwiększają wydatki, a metale i ropa drożeją. Kraj bezpieczny ma wyższe wyceny, spokojniejszych konsumentów i więcej kapitału z zagranicy. Rzadziej też dotyka go embargo. Te skutki są małe w jednym kwartale, ale działają stale.',
        example: () => `Teraz: wydatki obronne ${formatNumberPl(getDefenseShare() * 100, 1)}% wpływów, bezpieczeństwo ${getSecurityLabel(getHomeSecurityLevel())}.`,
        quiz: [
            { q: 'Co podnosi budżet obronny poza zamówieniami dla zbrojeniówki?', a: ['deficyt budżetu', 'podatek od dywidend', 'liczbę akcji'], c: 0 },
            { q: 'Co drożeje, gdy świat się zbroi?', a: ['metale', 'zboże przede wszystkim', 'nic'], c: 0 },
            { q: 'Jak wysokie bezpieczeństwo działa na embargo?', a: ['zmniejsza jego szansę', 'zwiększa jego szansę', 'nie działa'], c: 0 }
        ]
    }
});
