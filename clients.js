// clients.js — Klienci z charakterami i rynek wtórny jednostek uczestnictwa (etap F1)
//
// Każdy klient funduszu gracza ma charakter (motyw i skłonności). Co tydzień:
//   zadowolony + duże zaufanie  → dokupuje JU (wpłata do funduszu po NAV),
//   zadowolony + małe zaufanie  → wystawia JU na rynku wtórnym (fundusz bez zmian gotówki i JU),
//   niezadowolony               → umarza część lub całość.
// Rynek wtórny obejmuje fundusz gracza, fundusze botów-zarządców i fundusze zewnętrzne (holdingi):
// kupują fikcyjni uczestnicy z zewnątrz (nowi klienci) i klienci innych funduszy szukający okazji.
// Gracz tylko obserwuje — nie handluje na tym rynku.

const CLIENT_CHARACTER_KEYS = ['sly', 'careful', 'fearful', 'brave', 'rich', 'miser'];

// Migracja starych typów (etap B) na charaktery.
const LEGACY_CLIENT_TYPES = { retiree: 'careful', saver: 'miser', speculator: 'sly', loyal: 'brave' };

const JU_MARKET_MAX_PREMIUM = 0.10;
const JU_SELL_ORDER_PATIENCE = 2;          // tygodni bez kupca → umorzenie
const JU_TAPE_LIMIT = 40;
const JU_HISTORY_WEEKS = 8;
const CLIENT_HISTORY_LIMIT = 10;
const MAX_WEEKLY_NEW_MONEY_SHARE = 0.08;   // napływ nowych klientów ≤ 8% aktywów tygodniowo

const CLIENT_MOTIVES = {
    sly: ['Szybki zysk i wyjście na szczycie.', 'Kupuje plotki, sprzedaje fakty.', 'Zawsze szuka premii.'],
    careful: ['Najważniejsze, żeby nie stracić.', 'Odkłada na emeryturę, nie na loterię.', 'Woli 3% pewne niż 30% możliwe.'],
    fearful: ['Każdy spadek to bezsenna noc.', 'Wycofa się przy pierwszej plotce.', 'Patrzy na NAV kilka razy dziennie.'],
    brave: ['Spadki to okazja do zakupu.', 'Gra na długi wzrost.', 'Ufa zarządcy, póki wyniki bronią się same.'],
    rich: ['Lokuje nadwyżki z biznesu.', 'Dywersyfikuje majątek rodzinny.', 'Ma czas i duże kwoty.'],
    miser: ['Liczy każdą złotówkę opłat.', 'Kupuje tylko z rabatem.', 'Opłata za zarządzanie to dla niego zdrada.'],
    institution: ['Mandat inwestycyjny zarządu.', 'Długoterminowa lokata instytucji.'],
    investor: ['Wielki inwestor szukający alfy.', 'Testuje nowego zarządcę.']
};
const CLIENT_NAMES = ['Anna', 'Piotr', 'Maria', 'Tomasz', 'Ewa', 'Jan', 'Kasia', 'Marek', 'Zofia', 'Adam', 'Halina', 'Krzysztof', 'Agata', 'Paweł', 'Irena',
    'Bartek', 'Ola', 'Kamil', 'Jadwiga', 'Stefan', 'Iga', 'Mateusz', 'Bożena', 'Rafał', 'Wanda', 'Szymon', 'Natalia', 'Edward', 'Kinga', 'Leon'];

let juMarket = createJuMarket();

function createJuMarket() {
    return {
        week: 0,
        stats: {},            // fundId → { history: [{ week, volume, premium, buyers, sellers, newClients, inflow, outflow }], trust? }
        tape: [],             // ostatnie transakcje i zdarzenia
        bestFundId: null
    };
}

// =================================================================================
// KLIENCI FUNDUSZU GRACZA
// =================================================================================

function getClientCharacter(client) {
    return CLIENT_TYPES[client?.type] || CLIENT_TYPES.careful;
}

function randomCharacter(trust = 50) {
    const weights = { sly: 1.2, careful: 1.4, fearful: 1, brave: 0.8 + trust / 100, rich: 0.3 + trust / 200, miser: 1 };
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [key, weight] of Object.entries(weights)) {
        roll -= weight;
        if (roll <= 0) return key;
    }
    return 'careful';
}

function randomClientPersonName() {
    return `${getRandomElement(CLIENT_NAMES)} ${getRandomElement(CLIENT_LAST_INITIALS)}`;
}

/** Uzupełnia klienta o pola etapu F1 (nowi klienci i migracja starych zapisów). */
function ensureClientProfile(client) {
    if (LEGACY_CLIENT_TYPES[client.type]) {
        if (client.type === 'loyal') client.loyal = true;
        client.type = LEGACY_CLIENT_TYPES[client.type];
    }
    if (!CLIENT_TYPES[client.type]) client.type = 'careful';
    if (!client.motive) client.motive = getRandomElement(CLIENT_MOTIVES[client.type] || CLIENT_MOTIVES.careful);
    if (!Array.isArray(client.history)) client.history = [];
    if (!Number.isFinite(client.pendingSellUnits)) client.pendingSellUnits = 0;
    if (!Number.isFinite(client.pendingSellWeeks)) client.pendingSellWeeks = 0;
    return client;
}

function noteClientHistory(client, text) {
    client.history.unshift({ week: juMarket.week, text });
    if (client.history.length > CLIENT_HISTORY_LIMIT) client.history.length = CLIENT_HISTORY_LIMIT;
}

function pushTape(kind, text) {
    juMarket.tape.unshift({ week: juMarket.week, kind, text });
    if (juMarket.tape.length > JU_TAPE_LIMIT) juMarket.tape.length = JU_TAPE_LIMIT;
}

/** Wpłata klienta do funduszu po NAV (nie liczy się jako emisja gracza). */
function subscribeClient(client, value) {
    const nav = getFundNav();
    if (!(value > 0) || !(nav > 0)) return 0;
    const units = value / nav;
    client.avgCost = (client.avgCost * client.units + value) / (client.units + units);
    client.units += units;
    playerCash += value;
    playerFund.units += units;
    playerFund.current.inflow += value;
    recordPayment('external:klienci', 'player-fund', value, 'Wpłata klienta');
    return units;
}

/** Trust próg zależny od charakteru (strachliwy potrzebuje więcej, odważny mniej). */
function getTrustThreshold(character) {
    return 55 + (character.trustNeed || 0);
}

/** Co tydzień: zadowolenie i decyzje klientów funduszu gracza. */
function processClientsWeekly() {
    if (!playerFund) return;
    playerFund.clients.forEach(ensureClientProfile);

    const nav = getFundNav();
    const current = playerFund.current;
    const excess = getPeriodReturn(current.startNav, nav) - getPeriodReturn(current.startBenchmark, getBenchmarkValue());
    const lastPeriod = playerFund.periods[playerFund.periods.length - 1];
    const lastRankBad = lastPeriod && lastPeriod.rankOf > 1 && lastPeriod.rank === lastPeriod.rankOf;
    const trust = playerFund.trust;
    let redemptionBudget = Math.floor(playerFund.units * MAX_WEEKLY_REDEMPTION_SHARE);
    let newMoneyBudget = getFundAssets() * MAX_WEEKLY_NEW_MONEY_SHARE;

    for (const client of [...playerFund.clients]) {
        const def = getClientCharacter(client);

        // Zadowolenie: zaufanie, wynik vs GIG (pogoń za wynikiem), obsunięcie, opłaty (sknera), porównanie z rywalami.
        const drift = (trust - 50) / 50 * 0.04
            + excess * def.chase * 0.8
            - current.maxDrawdown * def.volAversion * 0.3
            - (def.feeSensitivity || 0) * 0.01
            - (def.comparesRivals && lastRankBad ? 0.05 : 0);
        client.satisfaction = Math.max(0, Math.min(1, client.satisfaction + drift));

        // Sprzedaż czekająca na kupca zbyt długo → klient umarza.
        if (client.pendingSellUnits > 0) {
            client.pendingSellWeeks++;
            if (client.pendingSellWeeks >= JU_SELL_ORDER_PATIENCE && redemptionBudget > 0) {
                const units = Math.min(client.pendingSellUnits, redemptionBudget, client.units);
                const paid = redeemClientUnits(client, units);
                redemptionBudget -= units;
                client.pendingSellUnits = 0;
                client.pendingSellWeeks = 0;
                noteClientHistory(client, `Brak kupca na rynku wtórnym — umorzenie ${units.toFixed(1)} JU (${paid.toFixed(0)} zł).`);
            }
            continue;
        }

        const satisfied = client.satisfaction >= 0.6;
        const unhappy = client.satisfaction < 0.35;
        const highTrust = trust >= getTrustThreshold(def);

        if (unhappy) {
            if (client.loyal && Math.random() < 0.9) continue;
            if (Math.random() >= (1 - def.patience) * 0.8 || redemptionBudget <= 0) continue;
            const fraction = client.satisfaction < 0.15 || def.panic ? 1 : getRandomInRange(0.25, 0.6);
            const units = Math.min(redemptionBudget, Math.max(1, client.units * fraction));
            const paid = redeemClientUnits(client, units);
            redemptionBudget -= units;
            noteClientHistory(client, `Niezadowolony — umarza ${units.toFixed(1)} JU (${paid.toFixed(0)} zł).`);
        } else if (satisfied && highTrust) {
            if (Math.random() >= def.buyBias * 0.3 || newMoneyBudget <= 0) continue;
            const value = Math.min(newMoneyBudget, getRandomInRange(def.size[0], def.size[1]) * 0.4);
            const units = subscribeClient(client, value);
            newMoneyBudget -= value;
            noteClientHistory(client, `Dokupuje ${units.toFixed(1)} JU za ${value.toFixed(0)} zł.`);
            pushTape('topup', `${def.icon} ${client.name} dokupuje ${units.toFixed(1)} JU funduszu ${playerProfile.fundName} (${formatPlnShort(value)}).`);
        } else if (satisfied && !highTrust) {
            if (Math.random() >= def.secondaryBias * 0.35) continue;
            client.pendingSellUnits = client.units * getRandomInRange(0.2, def.key === 'sly' ? 0.6 : 0.45);
            client.pendingSellWeeks = 0;
            noteClientHistory(client, `Zadowolony z wyników, ale nie ufa funduszowi — wystawia ${client.pendingSellUnits.toFixed(1)} JU na rynku wtórnym.`);
        } else if (def.key === 'sly' && (juMarket.stats.player?.history[0]?.premium || 0) > 0.03 && Math.random() < 0.3) {
            client.pendingSellUnits = client.units * getRandomInRange(0.2, 0.5); // realizacja premii
            client.pendingSellWeeks = 0;
            noteClientHistory(client, 'Premia na rynku wtórnym — wystawia część JU, by zrealizować zysk.');
        }
    }
}

function formatPlnShort(value) {
    return `${Math.round(value).toLocaleString('pl-PL')} zł`;
}

// =================================================================================
// RYNEK WTÓRNY JU (raz na tydzień)
// =================================================================================

/** Uczestnicy rynku: fundusz gracza, fundusze botów, fundusze zewnętrzne. */
function getJuMarketFunds() {
    const funds = [];
    if (playerFund) {
        const periods = playerFund.periods.slice(-4);
        funds.push({ id: 'player', name: playerProfile?.fundName || 'Twój fundusz', kind: 'player', nav: getFundNav(), assets: getFundAssets(), trust: playerFund.trust, ret: periods.reduce((s, p) => s + p.fundReturn - p.benchmarkReturn, 0) });
    }
    for (const manager of corporation?.managers || []) {
        const periods = manager.fund.periods.slice(-4);
        funds.push({ id: manager.id, name: `Fundusz ${manager.name.split(' ')[1] || manager.name}`, kind: 'bot', nav: getBotFundNav(manager.fund), assets: getBotFundAssets(manager.fund), trust: manager.fund.trust, ret: periods.reduce((s, p) => s + p.fundReturn - p.benchmarkReturn, 0) });
    }
    for (const stock of typeof getExternalFunds === 'function' ? getExternalFunds() : []) {
        const returns = (playerFund?.periods || []).slice(-4).map(p => (p.rivals.find(r => r.symbol === stock.symbol)?.return ?? 0) - p.benchmarkReturn);
        const ret = returns.reduce((s, r) => s + r, 0);
        funds.push({ id: stock.symbol, name: getExternalFirmName(stock), kind: 'external', nav: getExternalFundValue(stock), assets: getExternalFundValue(stock) * stock.totalShares, trust: Math.max(5, Math.min(95, 50 + ret * 400)), ret });
    }
    return funds;
}

/** Premia/dyskonto do NAV z nierównowagi popytu i podaży (wartości w zł). */
function computeJuPremium(demand, supply) {
    if (demand + supply <= 0) return 0;
    return Math.max(-JU_MARKET_MAX_PREMIUM, Math.min(JU_MARKET_MAX_PREMIUM, (demand - supply) / (demand + supply) * JU_MARKET_MAX_PREMIUM));
}

/** Fikcyjni kupujący z zewnątrz: liczba i kwoty zależą od zaufania i wyniku funduszu. */
function generateOutsideBuyers(fund, scale = 1) {
    const expected = Math.max(0, (fund.trust - 35) / 18 + fund.ret * 20);
    const count = Math.min(8, Math.floor(expected + Math.random()));
    const buyers = [];
    for (let i = 0; i < count; i++) {
        const key = randomCharacter(fund.trust);
        const def = CLIENT_TYPES[key];
        buyers.push({ name: randomClientPersonName(), key, def, value: getRandomInRange(def.size[0], def.size[1]) * scale });
    }
    return buyers;
}

function recordFundWeek(fundId, entry) {
    const stats = juMarket.stats[fundId] || (juMarket.stats[fundId] = { history: [] });
    stats.history.unshift({ week: juMarket.week, ...entry });
    if (stats.history.length > JU_HISTORY_WEEKS) stats.history.length = JU_HISTORY_WEEKS;
}

/** Fundusz gracza: prawdziwe zlecenia klientów + fikcyjni kupujący; nadwyżka popytu wpłaca po NAV. */
function runPlayerJuMarket(fund) {
    const nav = fund.nav;
    const sellers = playerFund.clients.filter(client => client.pendingSellUnits > 0);
    let buyers = generateOutsideBuyers(fund);
    const supplyValue = sellers.reduce((sum, client) => sum + client.pendingSellUnits * nav, 0);
    const demandValue = buyers.reduce((sum, buyer) => sum + buyer.value, 0);
    const premium = computeJuPremium(demandValue, supplyValue);
    const price = nav * (1 + premium);
    let volume = 0, newClients = 0, inflow = 0;

    // Sknera kupuje tylko z dyskontem.
    buyers = buyers.filter(buyer => buyer.key !== 'miser' || premium <= -0.02);

    for (const seller of sellers) {
        while (seller.pendingSellUnits > 0.01 && buyers.length) {
            const buyer = buyers[0];
            const units = Math.min(seller.pendingSellUnits, buyer.value / price);
            if (!(units > 0.01)) { buyers.shift(); continue; }
            seller.pendingSellUnits -= units;
            seller.units -= units;
            buyer.value -= units * price;
            volume += units;

            // Kupujący zostaje klientem funduszu (JU przechodzą między klientami; NAV i gotówka bez zmian).
            let client = buyer.client;
            if (!client) {
                client = addFundClient(buyer.key, 0, price);
                client.name = buyer.name;
                ensureClientProfile(client);
                buyer.client = client;
                newClients++;
                noteClientHistory(client, `Dołącza, kupując JU na rynku wtórnym po ${price.toFixed(2)} zł.`);
            }
            client.avgCost = (client.avgCost * client.units + units * price) / (client.units + units);
            client.units += units;
            const sellerDef = getClientCharacter(seller);
            noteClientHistory(seller, `Sprzedaje ${units.toFixed(1)} JU na rynku wtórnym po ${price.toFixed(2)} zł (${(premium * 100).toFixed(1)}% do NAV).`);
            pushTape('trade', `${sellerDef.icon} ${seller.name} → ${buyer.def.icon} ${client.name}: ${units.toFixed(1)} JU funduszu ${fund.name} po ${price.toFixed(2)} zł (${premium >= 0 ? '+' : ''}${(premium * 100).toFixed(1)}%).`);
            if (buyer.value < price) buyers.shift();
        }
        if (seller.pendingSellUnits <= 0.01) { seller.pendingSellUnits = 0; seller.pendingSellWeeks = 0; }
        if (seller.units < 0.5) redeemClientUnits(seller, seller.units); // resztka umorzona, klient odchodzi
    }

    // Niewykorzystany popyt: nowi klienci wpłacają do funduszu po NAV (gdy zaufanie pozwala).
    let budget = getFundAssets() * MAX_WEEKLY_NEW_MONEY_SHARE;
    for (const buyer of buyers) {
        if (fund.trust < 50 || budget <= 0 || buyer.value < nav) continue;
        const value = Math.min(buyer.value, budget);
        let client = buyer.client;
        if (!client) {
            client = addFundClient(buyer.key, 0, nav);
            client.name = buyer.name;
            ensureClientProfile(client);
            newClients++;
            pushTape('new', `🆕 Nowy klient: ${buyer.def.icon} ${client.name} (${buyer.def.label}) wpłaca ${formatPlnShort(value)} do funduszu ${fund.name}.`);
        }
        const units = subscribeClient(client, value);
        noteClientHistory(client, `Wpłaca ${value.toFixed(0)} zł (${units.toFixed(1)} JU po NAV).`);
        inflow += value;
        budget -= value;
    }

    recordFundWeek('player', { volume, premium, buyers: demandValue, sellers: supplyValue, newClients, inflow, clients: playerFund.clients.length, nav });
}

/** Fundusze botów i zewnętrzne: zagregowane zlecenia (bez listy osób), wpisy na taśmie. */
function runSyntheticJuMarket(fund) {
    const unitsTotal = fund.nav > 0 ? fund.assets / fund.nav : 0;
    const supplyShare = Math.max(0, (60 - fund.trust) / 60) * getRandomInRange(0, 0.03) + getRandomInRange(0, 0.004);
    const demandShare = Math.max(0, (fund.trust - 40) / 60) * getRandomInRange(0, 0.03) + Math.max(0, fund.ret) * 0.05 * Math.random();
    const supplyValue = unitsTotal * supplyShare * fund.nav;
    const demandValue = unitsTotal * demandShare * fund.nav;
    const premium = computeJuPremium(demandValue, supplyValue);
    const volume = Math.min(supplyValue, demandValue) / Math.max(0.01, fund.nav);
    const prevClients = juMarket.stats[fund.id]?.history[0]?.clients ?? Math.max(20, Math.round(fund.assets / 3000));
    const newClients = Math.max(0, Math.round((demandValue - supplyValue) / Math.max(500, fund.nav * 50)));
    recordFundWeek(fund.id, { volume, premium, buyers: demandValue, sellers: supplyValue, newClients, inflow: Math.max(0, demandValue - supplyValue), clients: prevClients + newClients, nav: fund.nav });

    if (volume > 0 && Math.random() < 0.5) {
        const seller = CLIENT_TYPES[randomCharacter(100 - fund.trust)];
        const buyer = CLIENT_TYPES[randomCharacter(fund.trust)];
        const units = Math.max(1, Math.round(volume * getRandomInRange(0.05, 0.3)));
        pushTape('trade', `${seller.icon} ${randomClientPersonName()} → ${buyer.icon} ${randomClientPersonName()}: ${units} JU funduszu ${fund.name} (${premium >= 0 ? '+' : ''}${(premium * 100).toFixed(1)}%).`);
    }
}

/** „Popularność” tygodnia: premia + napływ netto względem aktywów (porównywalne między funduszami różnej wielkości). */
function getJuPopularity(fundId, assets) {
    const last = juMarket.stats[fundId]?.history[0];
    if (!last) return -Infinity;
    return last.premium + (last.inflow + last.volume * (last.nav || 0)) / Math.max(1, assets);
}

function runJuMarketWeekly() {
    juMarket.week++;
    const funds = getJuMarketFunds();
    for (const fund of funds) {
        if (fund.kind === 'player') runPlayerJuMarket(fund);
        else runSyntheticJuMarket(fund);
    }
    const best = funds.map(fund => ({ fund, score: getJuPopularity(fund.id, fund.assets) })).sort((a, b) => b.score - a.score)[0];
    juMarket.bestFundId = best?.fund.id || null;
    if (best) pushTape('best', `🏆 Najlepiej sprzedający się fundusz tygodnia: ${best.fund.name}.`);
    if (typeof renderJuMarket === 'function') renderJuMarket();
}
