// =================================================================================
// ma.js: Ład korporacyjny: fuzje i przejęcia, obrony, walne zgromadzenia, rada nadzorcza, aktywizm.
// Złączone pliki: ma.js, governance.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## ma.js
// #################################################################################

// ma.js — Fuzje i przejęcia, akcjonariat (etap G)
//
// G2: obrony (pigułka, Biały Rycerz, Pac-Man, negocjacje), wrogie przejęcia z decyzją funduszu,
// emisja ratunkowa z nowymi akcjonariuszami.
// G1: jeden licznik procesu (prowadzi inicjator), etap ≈ 1 kwartał, komplikacje jako dane
// (przeżywają zapis), decyzje AI wg osobowości, walidacja LBO, kara antymonopolowa.
// Wspólny rejestr akcjonariuszy (fundusz, konto prywatne, boty, fundusze botów, holdingi, banki,
// państwo, insiderzy) — używany przez obrony, wrogie przejęcia i walne zgromadzenia.

const MA_STAGE_PROGRESS = 100;            // postęp na kwartał (≈ 1 etap / kwartał)
const MA_POISON_PILL_SLOWDOWN = 0.6;
const MA_MINI_EVENT_CHANCE = 0.15;
const MA_COMPLICATION_CHANCE = 0.18;
const MA_MAJOR_COMPLICATION_AT = 2;
const LBO_MAX_DEBT_TO_ASSETS = 0.8;

// =================================================================================
// AKCJONARIAT
// =================================================================================

/** Lista posiadaczy akcji spółki (pakiety ≥ 1 akcji). */
function getShareholders(stock) {
    if (isForeignShare(stock)) return getForeignShareholders(stock); // 0.16.12 D2: spółki zagraniczne na tym samym kodzie walnych
    const list = [];
    const add = (id, name, kind, shares, entity = null) => { if (shares >= 1) list.push({ id, name, kind, shares, pct: shares / stock.totalShares, entity }); };
    const symbol = stock.symbol;

    add('player', playerProfile?.fundName || 'Twój fundusz', 'player', playerPortfolio[symbol]?.shares || 0);
    add('wallet', 'Twoje konto prywatne', 'wallet', playerWallet?.portfolio?.[symbol]?.shares || 0);
    for (const ai of aiCompetitors) add(ai.id, ai.isMafia ? 'Akcjonariusz nieujawniony' : ai.isGuard ? `🛡️ ${ai.name} (fundusz)` : ai.name, 'ai', ai.portfolio?.[symbol]?.shares || 0, ai); // Bruno Gato ukryty; Gwardia to fundusz
    for (const manager of corporation?.managers || []) add(manager.id, `Fundusz ${manager.name}`, 'botFund', manager.fund.portfolio?.[symbol]?.shares || 0, manager);
    for (const owner of stocks) {
        const quantity = owner.holdingPortfolio?.[symbol]?.quantity || 0;
        if (quantity > 0 && owner.symbol !== symbol) add(owner.symbol, owner.name, 'holding', quantity, owner);
        const stake = owner.equityStakes?.[symbol] || 0;
        if (stake > 0) add(`${owner.symbol}:stake`, owner.name, 'company', stake, owner);
    }
    for (const bank of commercialBanks) add(bank.id, bank.name, 'bank', bank.stockPortfolio?.[symbol]?.shares || 0, bank);
    for (const etf of etfs) add(`etf:${etf.symbol}`, etf.name, 'etf', etf.holdings?.[symbol] || 0, etf);
    if (stock.isStateOwned || stock.stateOwnershipPct > 0) add('state', 'Skarb Państwa', 'state', Math.floor(stock.totalShares * (stock.stateOwnershipPct || 0)));
    add('city', 'Miasto', 'city', Number(stock.cityShares) || 0);
    add('insiders', 'Zarząd i pracownicy', 'insiders', Number(stock.insiderShares) || 0);
    return list.sort((a, b) => b.shares - a.shares);
}

/** Akcjonariusz kontrolujący (> 50%) albo null. */
function findMajorityShareholder(stock) {
    const top = getShareholders(stock)[0];
    return top && top.pct > 0.5 ? top : null;
}

function getFundStakePct(stock) {
    if (isForeignShare(stock)) return getGdrHeld(stock) / Math.max(1, stock.totalShares);
    return (playerPortfolio[stock.symbol]?.shares || 0) / Math.max(1, stock.totalShares);
}

// =================================================================================
// PROCES M&A
// =================================================================================

/** Kopia stanu procesu u partnera (cel widzi to samo, ale nie prowadzi procesu). */
// =================================================================================
// 0.15.1 M2: OFERTY KUPNA DLA WIĘKSZOŚCIOWCA (fundusz albo bot z ≥ 33% akcji)
// =================================================================================

const BUYOUT_OFFER_MIN_STAKE = 0.33;
const BUYOUT_OFFER_MAX_ACTIVE = 2;
const BUYOUT_OFFER_VALID_QUARTERS = 2;
const BUYOUT_OFFER_COOLDOWN = 4;
const BUYOUT_OFFER_MAX_ROUNDS = 3;
const BUYOUT_AUCTION_FEE = 0.005;
const BUYOUT_MAX_PREMIUM_CAP = 1.60; // cena maksymalna oferenta ≤ kurs × 1,6 (pomiar: premie do +158%)
const BUYOUT_STANCES = {
    determined: { label: 'zdeterminowany', maxMult: 1.10, insult: 0.30 },
    flexible: { label: 'elastyczny', maxMult: 1.00, insult: 0.60 },
    opportunist: { label: 'oportunista', maxMult: 0.90, insult: 0.80 }
};

let buyoutState = createBuyoutState();
function createBuyoutState() { return { offers: {}, cooldown: {} }; }
function getBuyoutQuarter() { return typeof macro === 'object' ? Number(macro.quarter) || 0 : 0; }

/** Szansa oferty na kwartał: 6% + tania spółka 4 pp + Hossa/Euforia/bańka 3 pp − Bessa/Kapitulacja 3 pp. */
function getBuyoutOfferChance(stock) {
    let chance = 0.06;
    const fair = typeof getDisplayedFairValue === 'function' ? getDisplayedFairValue(stock) : null;
    if (fair > 0 && stock.price / fair < 0.9) chance += 0.04;
    const phase = typeof getMarketRegime === 'function' ? getMarketRegime('home')?.phase : null;
    if (phase === 'bull' || phase === 'euphoria' || (typeof isCompanyInSectorBubble === 'function' && isCompanyInSectorBubble(stock))) chance += 0.03;
    if (phase === 'bear' || phase === 'capitulation') chance -= 0.03;
    return Math.max(0, chance);
}

/** Większościowiec spółki (≥ 33%): fundusz gracza albo bot; null, gdy nikt. */
function getBuyoutHolder(stock) {
    const fundPct = getFundStakePct(stock);
    if (fundPct >= BUYOUT_OFFER_MIN_STAKE) return { kind: 'player', pct: fundPct, shares: playerPortfolio[stock.symbol].shares };
    for (const ai of aiCompetitors) {
        const shares = ai.portfolio?.[stock.symbol]?.shares || 0;
        if (shares / stock.totalShares >= BUYOUT_OFFER_MIN_STAKE) return { kind: 'ai', ai, pct: shares / stock.totalShares, shares };
    }
    return null;
}

function sharesSegment(a, b) {
    const sa = new Set(getStockSegments(a).map(s => s.sector));
    return getStockSegments(b).some(s => sa.has(s.sector));
}

/** Oferent: spółka z tego samego / pokrewnego sektora z gotówką albo zdolnością LBO; przy pakiecie także bot-inwestor. */
function pickBuyoutBidder(target, wholeCompany, cost) {
    const companies = stocks.filter(s => s !== target && !s.assetType && !s.isBankrupt && !s.mergerProcess && !s.isSubsidiaryOf && !s.isStateOwned && !s.isBankStock
        && (s.cash >= cost || (wholeCompany && validateLbo(s, target, cost).ok)));
    const related = companies.filter(s => sharesSegment(s, target));
    const pool = related.length && Math.random() < 0.8 ? related : companies;
    if (pool.length) { const bidder = getRandomElement(pool); return { kind: 'company', symbol: bidder.symbol, name: bidder.name, related: sharesSegment(bidder, target), financing: bidder.cash >= cost ? 'cash' : 'lbo' }; }
    if (wholeCompany) return null;
    const bots = aiCompetitors.filter(ai => ['whale', 'pro_investor'].includes(ai.personality) && ai.cash >= cost);
    if (!bots.length) return null;
    const ai = getRandomElement(bots);
    return { kind: 'ai', id: ai.id, name: ai.name, related: false, financing: 'cash' };
}

function getBuyoutBidderCash(offer) {
    if (offer.bidder.kind === 'ai') return aiCompetitors.find(ai => ai.id === offer.bidder.id)?.cash || 0;
    return stocks.find(s => s.symbol === offer.bidder.symbol)?.cash || 0;
}

/** Tworzy ofertę (ukryta cena maksymalna i nastawienie oferenta). */
function createBuyoutOffer(target, holder) {
    const wholeCompany = holder.kind === 'player' ? holder.pct > 0.5 : holder.pct > 0.5;
    const shares = wholeCompany ? target.totalShares : holder.shares;
    const premium = getRandomInRange(0.10, 0.30) + (Number(target.financialHealth) || 0) * 0.01;
    const price = target.price * (1 + Math.max(0.10, Math.min(0.30, premium)));
    const bidder = pickBuyoutBidder(target, wholeCompany, price * shares);
    if (!bidder) return null;
    const stanceKey = getRandomElement(Object.keys(BUYOUT_STANCES));
    const synergy = bidder.related ? getRandomInRange(1.20, 1.40) : getRandomInRange(1.10, 1.30);
    const fair = typeof getDisplayedFairValue === 'function' ? getDisplayedFairValue(target) : null;
    let maxPrice = Math.max(target.price * 1.15, (fair > 0 ? fair : target.price) * synergy) * (1 + getRandomInRange(0, 0.15)) * BUYOUT_STANCES[stanceKey].maxMult;
    const bidderCash = bidder.financing === 'lbo' ? Infinity : (bidder.kind === 'ai' ? aiCompetitors.find(ai => ai.id === bidder.id).cash : stocks.find(s => s.symbol === bidder.symbol).cash);
    const roomAboveOffer = price + target.price * getRandomInRange(0.05, 0.20) * BUYOUT_STANCES[stanceKey].maxMult; // pomiar M8: bez tego +31 pp ponad ofertę
    maxPrice = Math.max(price, Math.min(maxPrice, roomAboveOffer, target.price * BUYOUT_MAX_PREMIUM_CAP, bidderCash / shares)); // limit: wartość godziwa tanich spółek bywa 2× ponad kurs
    return {
        symbol: target.symbol, holder: holder.kind === 'player' ? 'player' : holder.ai.id, wholeCompany, shares,
        bidder, stance: stanceKey, maxPrice, price, initialPrice: price, preOfferPrice: target.price,
        quarter: getBuyoutQuarter(), round: 1, talked: null, lastWord: false, auction: null, history: [{ round: 1, text: `oferta wstępna ${formatZl(price)} (premia ${Math.round((price / target.price - 1) * 100)}%)` }]
    };
}

/** Co kwartał: wygasanie ofert, nowe oferty dla funduszu i botów (boty decydują od razu). */
function processBuyoutOffersQuarterly() {
    const quarter = getBuyoutQuarter();
    for (const [symbol, offer] of Object.entries(buyoutState.offers)) {
        const target = stocks.find(s => s.symbol === symbol);
        if (!target || target.isBankrupt || quarter - offer.quarter >= BUYOUT_OFFER_VALID_QUARTERS) {
            delete buyoutState.offers[symbol];
            buyoutState.cooldown[symbol] = quarter + BUYOUT_OFFER_COOLDOWN;
            if (target && offer.holder === 'player') logEvent(`⌛ Oferta kupna ${target.name} od ${offer.bidder.name} wygasła.`, 'review');
        }
    }
    for (const stock of stocks) {
        if (Object.keys(buyoutState.offers).length >= BUYOUT_OFFER_MAX_ACTIVE) break;
        if (stock.assetType || stock.isBankrupt || stock.mergerProcess || stock.isSubsidiaryOf || stock.isStateOwned || buyoutState.offers[stock.symbol]) continue;
        if ((buyoutState.cooldown[stock.symbol] || 0) > quarter) continue;
        const holder = getBuyoutHolder(stock);
        if (!holder || Math.random() >= getBuyoutOfferChance(stock)) continue;
        const offer = createBuyoutOffer(stock, holder);
        if (!offer) continue;
        if (holder.kind === 'ai') { decideBotBuyoutOffer(offer, holder.ai); continue; }
        buyoutState.offers[stock.symbol] = offer;
        addMail({
            sender: CORPORATION_SENDER,
            subject: `🤝 Oferta kupna: ${offer.bidder.name} chce kupić ${offer.wholeCompany ? stock.name : `pakiet funduszu w ${stock.name}`}`,
            body: `${offer.bidder.name} oferuje ${formatZl(offer.price)} za akcję (premia ${Math.round((offer.price / stock.price - 1) * 100)}%) za ${offer.wholeCompany ? 'całą spółkę — mniejszościowi dostaną tę samą cenę' : `pakiet ${offer.shares.toLocaleString('pl-PL')} akcji funduszu`}. Oferta ważna ${BUYOUT_OFFER_VALID_QUARTERS} kw. Możesz rozmawiać, negocjować, zaprosić drugiego oferenta albo przyjąć.`,
            importance: 2, symbol: stock.symbol, action: { type: 'buyoutOffer', symbol: stock.symbol }
        });
        if (typeof pushNews === 'function') pushNews(`${offer.bidder.name} składa ofertę kupna ${stock.name}`, stock.symbol);
        if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('cena_maksymalna');
    }
}

/** Bot-większościowiec: spokojni przyjmują ≥ 25% premii, ryzykanci żądają +10 pp (do ceny maks.), reszta jak spokojni. */
function decideBotBuyoutOffer(offer, ai) {
    const target = stocks.find(s => s.symbol === offer.symbol);
    const need = ['reckless', 'yolo_trader'].includes(ai.personality) ? 0.35 : 0.25;
    const wanted = offer.preOfferPrice * (1 + need);
    if (offer.price >= wanted) return startBuyoutDeal(offer, offer.price);
    if (wanted <= offer.maxPrice) return startBuyoutDeal(offer, wanted);
    buyoutState.cooldown[offer.symbol] = getBuyoutQuarter() + BUYOUT_OFFER_COOLDOWN;
    logEvent(`🤝 ${ai.name} odrzuca ofertę ${offer.bidder.name} za ${target?.name || offer.symbol}.`, 'market');
    return false;
}

/** Rozmowy wstępne: nastawienie i przedział ceny maksymalnej ±10% (raz na ofertę). */
function talkBuyoutOffer(symbol) {
    const offer = buyoutState.offers[symbol];
    if (!offer || offer.talked) return null;
    const shift = getRandomInRange(-0.05, 0.05);
    offer.talked = { low: Math.max(offer.price, offer.maxPrice * (0.9 + shift)), high: Math.max(offer.price, offer.maxPrice * (1.1 + shift)) }; // nie poniżej obecnej oferty
    offer.history.push({ round: offer.round, text: `rozmowy wstępne: nastawienie „${BUYOUT_STANCES[offer.stance].label}”, cena maks. ${formatZl(offer.talked.low)}–${formatZl(offer.talked.high)}` });
    return offer.talked;
}

/** Kontroferta gracza (cena za akcję): 'accepted' | 'middle' | 'lastWord' | 'insulted' | null. */
function counterBuyoutOffer(symbol, price) {
    const offer = buyoutState.offers[symbol];
    price = Number(price);
    if (!offer || !(price > 0) || offer.round > BUYOUT_OFFER_MAX_ROUNDS) return null;
    offer.round++;
    let result;
    if (price <= offer.maxPrice) {
        if (offer.talked && price >= offer.talked.low + (offer.talked.high - offer.talked.low) * 0.9 && !offer.lastWord) { // górne 10% przedziału
            offer.price = Math.max(offer.price, (offer.price + price) / 2);
            result = 'middle';
        } else {
            offer.price = Math.max(offer.price, price);
            result = 'accepted';
        }
    } else if (price <= offer.maxPrice * 1.15 && !offer.lastWord) {
        offer.raised = offer.maxPrice > offer.price + 0.005; offer.price = offer.maxPrice; offer.lastWord = true; result = 'lastWord';
    } else if (Math.random() < BUYOUT_STANCES[offer.stance].insult) {
        result = 'insulted';
    } else {
        offer.raised = offer.maxPrice > offer.price + 0.005; offer.price = offer.maxPrice; offer.lastWord = true; result = 'lastWord';
    }
    const labels = { accepted: 'oferent przyjmuje', middle: `oferent proponuje środek: ${formatZl(offer.price)}`, lastWord: offer.raised ? `oferent podnosi do ${formatZl(offer.price)} — „ostatnie słowo”` : `oferent nie podnosi ceny (${formatZl(offer.price)}) — „ostatnie słowo”`, insulted: 'oferent urażony — zrywa rozmowy' };
    offer.history.push({ round: offer.round - 1, text: `kontroferta ${formatZl(price)} → ${labels[result]}` });
    if (result === 'accepted') startBuyoutDeal(offer, offer.price);
    if (result === 'insulted') insultBuyoutBidder(offer);
    return result;
}

function insultBuyoutBidder(offer) {
    const target = stocks.find(s => s.symbol === offer.symbol);
    delete buyoutState.offers[offer.symbol];
    buyoutState.cooldown[offer.symbol] = getBuyoutQuarter() + BUYOUT_OFFER_COOLDOWN;
    logEvent(`😤 ${offer.bidder.name} urażony żądaniem — wycofuje ofertę za ${target?.name}.`, 'review');
    const bidder = offer.bidder.kind === 'company' ? stocks.find(s => s.symbol === offer.bidder.symbol) : null;
    if (target && bidder && getFundStakePct(target) < 0.66 && Math.random() < 0.3 && !target.mergerProcess && !bidder.mergerProcess) {
        logEvent(`⚔️ ${bidder.name} ogłasza wrogie wezwanie na ${target.name}!`, 'market');
        initiateMergerProcess(bidder, target, 'przejęcie', bidder.cash >= target.price * 1.2 * target.totalShares ? 'cash' : 'lbo', 0.2);
    }
}

/** Aukcja: doradca 0,5% wartości; 50% szans na drugą ofertę; podbicia 3–8% do niższej z cen maksymalnych. */
function inviteSecondBidder(symbol) {
    const offer = buyoutState.offers[symbol];
    const target = stocks.find(s => s.symbol === symbol);
    if (!offer || offer.auction || !target) return null;
    const fee = offer.price * offer.shares * BUYOUT_AUCTION_FEE;
    if (playerCash < fee) { showToast('Za mało gotówki funduszu na doradcę.', 'error'); return null; }
    playerCash -= fee;
    recordPayment('player-fund', 'external:doradcy_ma', fee, `Doradca: aukcja ${symbol}`);
    offer.auction = { fee, second: null };
    if (Math.random() >= 0.5) { offer.history.push({ round: offer.round, text: 'doradca nie znalazł drugiego oferenta' }); return 'none'; }
    const second = createBuyoutOffer(target, getBuyoutHolder(target));
    if (!second || second.bidder.name === offer.bidder.name) { offer.history.push({ round: offer.round, text: 'doradca nie znalazł drugiego oferenta' }); return 'none'; }
    const cap = Math.min(offer.maxPrice, second.maxPrice);
    let price = Math.max(offer.price, second.price);
    const rounds = Math.random() < 0.5 ? 1 : 2;
    for (let i = 0; i < rounds; i++) price = Math.min(cap, price * (1 + getRandomInRange(0.03, 0.08)));
    offer.auction.second = { name: second.bidder.name, price };
    if (Math.random() < 0.2 && second.maxPrice >= price) { // pierwszy oferent urażony — zostaje drugi
        offer.bidder = second.bidder; offer.maxPrice = second.maxPrice; offer.stance = second.stance; offer.talked = null;
        offer.history.push({ round: offer.round, text: `aukcja: pierwszy oferent wycofał się urażony, ${second.bidder.name} płaci ${formatZl(price)}` });
    } else offer.history.push({ round: offer.round, text: `aukcja z ${second.bidder.name}: cena rośnie do ${formatZl(price)}` });
    offer.price = Math.max(offer.price, price);
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('aukcja_sprzedazy');
    return 'second';
}

function acceptBuyoutOffer(symbol) {
    const offer = buyoutState.offers[symbol];
    return offer ? startBuyoutDeal(offer, offer.price) : false;
}

function rejectBuyoutOffer(symbol) {
    const offer = buyoutState.offers[symbol];
    if (!offer) return false;
    delete buyoutState.offers[symbol];
    buyoutState.cooldown[symbol] = getBuyoutQuarter() + BUYOUT_OFFER_COOLDOWN;
    logEvent(`🤝 Fundusz odrzuca ofertę ${offer.bidder.name} za ${symbol}.`, 'review');
    return true;
}

/**
 * Transakcja uzgodniona: cała spółka — wezwanie po uzgodnionej cenie, 3 kw. do rozliczenia (z arbitrażem M1);
 * pakiet 33–50% — transfer poza rynkiem od razu.
 */
function startBuyoutDeal(offer, price) {
    const target = stocks.find(s => s.symbol === offer.symbol);
    delete buyoutState.offers[offer.symbol];
    buyoutState.cooldown[offer.symbol] = getBuyoutQuarter() + BUYOUT_OFFER_COOLDOWN;
    if (!target) return false;
    if (offer.wholeCompany) {
        const bidder = stocks.find(s => s.symbol === offer.bidder.symbol);
        if (!bidder || bidder.mergerProcess || target.mergerProcess) return false;
        const ok = initiateMergerProcess(bidder, target, 'przejęcie', offer.bidder.financing, price / target.price - 1, { friendly: true, offer: true });
        if (!ok) return false;
        bidder.mergerProcess.stage = 4; // badanie, zgody, rozliczenie: 3 kw.
        bidder.mergerProcess.kind = 'offer';
        bidder.mergerProcess.offerDetails.buyoutPricePerShare = price;
        bidder.mergerProcess.offerDetails.totalCost = price * target.totalShares;
        bidder.mergerProcess.offerDetails.premium = price / offer.preOfferPrice - 1;
        bidder.mergerProcess.offerMax = offer.maxPrice; // M3: negocjacje po badaniu
        bidder.mergerProcess.offerMeta = { fundSeller: offer.holder === 'player', auction: Boolean(offer.auction?.second), initialPrice: offer.initialPrice, preSaleAudit: hasPreSaleAudit(target) }; // M7
        if (bidder.mergerProcess.arb) target.price = price * (1 - bidder.mergerProcess.arb.spread);
        syncPartnerProcess(bidder, target);
        logEvent(`🤝 Uzgodniono sprzedaż ${target.name} spółce ${bidder.name} po ${formatZl(price)} za akcję (premia ${Math.round((price / offer.preOfferPrice - 1) * 100)}%). Rozliczenie za 3 kw.`, 'market');
        return true;
    }
    // Pakiet: kupujący przejmuje akcje sprzedającego (fundusz albo bot) poza rynkiem.
    const sellerIsPlayer = offer.holder === 'player';
    const seller = sellerIsPlayer ? null : aiCompetitors.find(ai => ai.id === offer.holder);
    const held = sellerIsPlayer ? (playerPortfolio[target.symbol]?.shares || 0) - (playerPortfolio[target.symbol]?.lockedShares || 0) : (seller?.portfolio?.[target.symbol]?.shares || 0) - (seller?.portfolio?.[target.symbol]?.lockedShares || 0);
    const shares = Math.min(offer.shares, Math.max(0, Math.floor(held)));
    const cost = shares * price;
    if (!(shares > 0) || getBuyoutBidderCash(offer) < cost) return false;
    if (offer.bidder.kind === 'ai') {
        const buyer = aiCompetitors.find(ai => ai.id === offer.bidder.id);
        buyer.cash -= cost;
        const pos = buyer.portfolio[target.symbol] = buyer.portfolio[target.symbol] || { shares: 0, avgPrice: price };
        pos.avgPrice = (pos.avgPrice * pos.shares + cost) / (pos.shares + shares); pos.shares += shares;
    } else {
        const buyer = stocks.find(s => s.symbol === offer.bidder.symbol);
        adjustCompanyCash(buyer, -cost); // gotówka → pakiet (aktywa bez zmian)
        buyer.equityStakes = buyer.equityStakes || {};
        buyer.equityStakes[target.symbol] = (buyer.equityStakes[target.symbol] || 0) + shares;
    }
    if (sellerIsPlayer) {
        const holding = playerPortfolio[target.symbol];
        holding.shares -= shares;
        if (holding.shares <= 0) delete playerPortfolio[target.symbol];
        playerCash += cost;
        recordPayment(`external:${offer.bidder.kind === 'ai' ? offer.bidder.id : offer.bidder.symbol}`, 'player-fund', cost, `Sprzedaż pakietu ${target.symbol}`);
    } else {
        const pos = seller.portfolio[target.symbol];
        pos.shares -= shares; if (pos.shares <= 0) delete seller.portfolio[target.symbol];
        seller.cash += cost;
    }
    logEvent(`🤝 ${sellerIsPlayer ? 'Fundusz sprzedaje' : `${seller.name} sprzedaje`} pakiet ${shares.toLocaleString('pl-PL')} akcji ${target.name} dla ${offer.bidder.name} po ${formatZl(price)} (premia ${Math.round((price / offer.preOfferPrice - 1) * 100)}%).`, 'market');
    return true;
}

// =================================================================================
// 0.15.1 M5: KNF — PRZEKROCZENIE 50% TRANSAKCJAMI PAKIETOWYMI (drabina, wezwanie, odsprzedaż)
// =================================================================================

const KNF_TENDER_FINE = 0.02;
const KNF_RESALE_QUARTERS = 2;

function getTenderRecord() {
    const rec = getRecord('player');
    if (!Array.isArray(rec.tenderCases)) rec.tenderCases = [];
    rec.tenderStrikes = Number(rec.tenderStrikes) || 0;
    return rec;
}

function getRecentBlockBuys(symbol, quarters = 2) {
    const now = getBuyoutQuarter();
    return blockDealState.log.filter(e => e.symbol === symbol && now - e.q <= quarters);
}

/** Po transakcji pakietowej: przekroczenie 50% z udziałem pakietów z ostatnich 2 kw. → sprawa dla KNF (raz na przekroczenie). */
function onBlockBuyCompleted(stock) {
    if (getFundStakePct(stock) <= 0.5 || stock.knfTenderCase || !getRecentBlockBuys(stock.symbol).length) return false;
    stock.knfTenderCase = true;
    getTenderRecord().tenderCases.push({ symbol: stock.symbol, quarter: getBuyoutQuarter() });
    return true;
}

/** Co kwartał: KNF wykrywa sprawy z szansą = skuteczność; drabina 1 → 2 → 3+; nakazy odsprzedaży. */
function processTenderOversightQuarterly() {
    const rec = getTenderRecord();
    const eff = typeof getInstitutionEffectiveness === 'function' ? getInstitutionEffectiveness(oversight.knf) : 0.3;
    for (const stock of stocks) if (stock.knfTenderCase && getFundStakePct(stock) <= 0.5) stock.knfTenderCase = false;
    for (const c of [...rec.tenderCases]) {
        const stock = stocks.find(s => s.symbol === c.symbol);
        if (!stock || stock.isBankrupt) { rec.tenderCases.splice(rec.tenderCases.indexOf(c), 1); continue; }
        if (Math.random() >= eff) continue; // niewykryte — sprawdzane dalej
        rec.tenderCases.splice(rec.tenderCases.indexOf(c), 1);
        rec.tenderStrikes++;
        applyKnfTenderStep(stock, rec.tenderStrikes);
    }
    for (const stock of stocks.filter(s => s.knfResaleOrder)) {
        if (getBuyoutQuarter() < stock.knfResaleOrder.until) continue;
        const excess = Math.floor((playerPortfolio[stock.symbol]?.shares || 0) - stock.totalShares * 0.5);
        if (excess > 0) sellFundSharesForced(stock, excess, 'nakaz KNF: odsprzedaż nadwyżki ponad 50%');
        stock.knfResaleOrder = null;
    }
}

function applyKnfTenderStep(stock, strike) {
    const threshold = getTenderThreshold();
    if (strike === 1) {
        addMail({ sender: 'KNF', subject: `⚠️ KNF: przekroczenie 50% w ${stock.name} bez wezwania`, body: `Fundusz przekroczył 50% głosów w ${stock.name}, kupując pakiety poza rynkiem. Przy kolejnym takim przypadku KNF nałoży karę, a potem nakaże wezwanie na akcje pozostałych akcjonariuszy do progu ${Math.round(threshold * 100)}% (ustawa „Próg wezwania”). To ochrona akcjonariuszy mniejszościowych: przy zmianie kontroli też mogą sprzedać po uczciwej cenie.`, importance: 3, symbol: stock.symbol });
        if (typeof unlockAcademyEntry === 'function') { unlockAcademyEntry('ochrona_mniejszosciowych'); unlockAcademyEntry('prog_wezwania'); }
        return 'warning';
    }
    if (strike === 2) {
        const value = getRecentBlockBuys(stock.symbol).reduce((s, e) => s + e.shares * e.price, 0);
        const fine = Math.round(value * KNF_TENDER_FINE);
        playerCash -= fine;
        governmentTreasury += fine;
        recordPayment('player-fund', 'external:skarb-panstwa', fine, `Kara KNF: przekroczenie 50% w ${stock.symbol}`);
        playerFund.trust = Math.max(0, playerFund.trust - 3);
        addMail({ sender: 'KNF', subject: `💸 KNF: kara za przekroczenie 50% w ${stock.name}`, body: `Drugie przekroczenie progu kontroli transakcjami pakietowymi: kara ${formatZl(fine, 0)} (2% wartości pakietów z ostatnich 2 kw.). Klienci funduszu tracą zaufanie (−3). Kolejny raz — nakaz wezwania.`, importance: 3, symbol: stock.symbol });
        return 'fine';
    }
    return runKnfTenderOrder(stock, threshold);
}

/** Nakaz wezwania do progu po cenie ≥ najwyższej zapłaconej w ostatnich 2 kw.; brak gotówki przy KNF ≥ 3 → nakaz odsprzedaży. */
function runKnfTenderOrder(stock, threshold = getTenderThreshold()) {
    const symbol = stock.symbol;
    const paid = getRecentBlockBuys(symbol).map(e => e.price);
    const price = Math.max(stock.price, ...paid);
    let need = Math.max(0, Math.floor(stock.totalShares * threshold - (playerPortfolio[symbol]?.shares || 0)));
    const sellers = [];
    for (const holder of getShareholders(stock)) {
        if (!['ai', 'botFund'].includes(holder.kind) || need <= 0) continue;
        const h = getBlockHolder(stock, holder.id);
        if (h && getBlockReservePrice(stock, h) <= price) { const n = Math.min(need, Math.floor(h.shares)); if (n > 0) { sellers.push({ holder: h, n }); need -= n; } }
    }
    const retail = Math.min(need, Math.floor(getAvailableShares(stock) * getRandomInRange(0.6, 0.9)));
    const total = sellers.reduce((s, x) => s + x.n, 0) + retail;
    const cost = total * price;
    if (playerCash < cost) {
        if ((Number(oversight.knf?.level) || 0) >= 3) {
            stock.knfResaleOrder = { until: getBuyoutQuarter() + KNF_RESALE_QUARTERS };
            addMail({ sender: 'KNF', subject: `⛔ KNF: nakaz odsprzedaży akcji ${stock.name}`, body: `Fundusz nie ma gotówki na wezwanie (${formatZl(cost, 0)}). KNF nakazuje zejść do 50% głosów w ${KNF_RESALE_QUARTERS} kw. — inaczej nadwyżka zostanie sprzedana na rynku.`, importance: 3, symbol });
            return 'resale';
        }
        const scale = Math.max(0, playerCash / Math.max(1, cost));
        for (const s of sellers) s.n = Math.floor(s.n * scale);
        return finishKnfTender(stock, sellers, Math.floor(retail * scale), price);
    }
    return finishKnfTender(stock, sellers, retail, price);
}

function finishKnfTender(stock, sellers, retail, price) {
    const symbol = stock.symbol;
    let bought = 0;
    for (const { holder, n } of sellers) {
        if (!(n > 0)) continue;
        const pos = holder.kind === 'ai' ? holder.entity.portfolio[symbol] : holder.entity.fund.portfolio[symbol];
        pos.shares -= n;
        if (pos.shares <= 0.001) { if (holder.kind === 'ai') delete holder.entity.portfolio[symbol]; else delete holder.entity.fund.portfolio[symbol]; }
        if (holder.kind === 'ai') holder.entity.cash += n * price; else holder.entity.fund.cash += n * price;
        bought += n;
    }
    if (retail > 0) { stock.sharesHeld = (Number(stock.sharesHeld) || 0) + retail; bought += retail; }
    const cost = bought * price;
    playerCash -= cost;
    recordPayment('player-fund', 'external:akcjonariusze', cost, `Wezwanie (nakaz KNF) ${symbol}`);
    const holding = playerPortfolio[symbol] = playerPortfolio[symbol] || { shares: 0, avgPrice: price, assetType: 'stock' };
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / Math.max(1, holding.shares + bought);
    holding.shares += bought;
    addMail({ sender: 'KNF', subject: `📣 Nakaz wezwania: ${stock.name}`, body: `Na nakaz KNF fundusz ogłosił wezwanie po ${formatZl(price)} (najwyższa cena z transakcji pakietowych). Akcjonariusze sprzedali ${bought.toLocaleString('pl-PL')} akcji za ${formatZl(cost, 0)}; fundusz ma teraz ${(getFundStakePct(stock) * 100).toFixed(1)}%.`, importance: 3, symbol });
    logEvent(`📣 Nakaz KNF: wezwanie funduszu na akcje ${stock.name} po ${formatZl(price)} — kupiono ${bought.toLocaleString('pl-PL')} akcji.`, 'review');
    return 'tender';
}

/** Sprzedaż na rynku z wpływem na cenę (nakaz KNF). */
function sellFundSharesForced(stock, quantity, reason) {
    const holding = playerPortfolio[stock.symbol];
    const free = (holding?.shares || 0) - (holding?.lockedShares || 0);
    const n = Math.min(Math.floor(quantity), Math.floor(free));
    if (!(n > 0)) return 0;
    const proceeds = n * stock.price * 0.99;
    playerCash += proceeds;
    holding.shares -= n;
    stock.sharesHeld -= n;
    if (typeof applyTradeImpact === 'function') applyTradeImpact(stock, n, -1);
    if (holding.shares <= 0) delete playerPortfolio[stock.symbol];
    if (typeof notePlayerPositionLoss === 'function') notePlayerPositionLoss(stock.symbol, n, reason, proceeds);
    logEvent(`⛔ ${reason}: fundusz sprzedaje ${n.toLocaleString('pl-PL')} akcji ${stock.name}.`, 'review');
    return n;
}

// =================================================================================
// 0.15.1 M4: ODKUP PAKIETÓW OD AKCJONARIUSZY I OD PREZESA (poza rynkiem)
// =================================================================================

const BLOCK_PERSONALITY_BASE = { calm: 0.05, dividend_chaser: 0.08, pro_investor: 0.10, whale: 0.15, reckless: 0, yolo_trader: 0 };
const BLOCK_PRICE_RANGE = [-0.10, 0.50];
let blockDealState = createBlockDealState();
function createBlockDealState() { return { talks: {}, log: [] }; }
function getBlockKey(symbol, holderId) { return `${symbol}|${holderId}`; }

/** Posiadacze, od których fundusz może odkupić pakiet: bot-inwestor, fundusz kolegi, zarząd. */
function getBlockHolder(stock, holderId) {
    const holder = getShareholders(stock).find(h => h.id === holderId && ['ai', 'botFund', 'insiders'].includes(h.kind));
    if (!holder || (holder.kind === 'ai' && (holder.entity?.isMafia || holder.entity?.personality === 'market_maker'))) return null;
    if (holder.kind === 'ai') holder.shares = Math.max(0, holder.shares - (holder.entity.portfolio[stock.symbol]?.lockedShares || 0));
    return holder;
}

function getBlockRelation(holder, stock) {
    if (holder.kind === 'insiders') return Number(stock.reputation?.player) || 0;
    return typeof getRelation === 'function' ? getRelation(holder.id) : 0;
}

/** Ukryta cena rezerwowa za akcję. */
function getBlockReservePrice(stock, holder) {
    const fair = typeof getDisplayedFairValue === 'function' ? getDisplayedFairValue(stock) : null;
    const base = Math.max(stock.price, fair > 0 ? fair : stock.price);
    const relation = getBlockRelation(holder, stock);
    let markup;
    if (holder.kind === 'insiders') {
        const loyal = stock.ceo?.traits?.some(t => t.id === 'oddany') || stock.ceo?.isFounder;
        markup = 0.20 + (loyal ? 0.10 : 0);
    } else if (holder.kind === 'botFund') markup = 0.08;
    else {
        markup = BLOCK_PERSONALITY_BASE[holder.entity?.personality] ?? 0.08;
        if (markup === 0 && getMarketRegime('home')?.phase === 'euphoria') markup = 0.10;
    }
    let price = base * (1 + markup - relation / 1000);
    if (holder.kind !== 'insiders' && relation >= 70) price *= 0.95; // sojusznik
    return price;
}

function getBlockTalk(symbol, holderId) {
    const key = getBlockKey(symbol, holderId);
    return blockDealState.talks[key] || (blockDealState.talks[key] = { proposedQuarter: null, talkedQuarter: null, blockedUntil: null, range: null, mood: null, counter: null });
}

function getBlockMood(holder, stock) {
    const relation = getBlockRelation(holder, stock);
    if (holder.kind !== 'insiders' && relation <= RELATION_HOSTILE) return 'wrogi — nie sprzeda';
    if (relation >= 40) return 'życzliwy';
    if (relation <= -10) return 'chłodny';
    return 'neutralny';
}

/** Rozmowa (bezpłatna, raz na kwartał): przedział ceny rezerwowej ±10% i nastawienie. */
function talkBlockHolder(symbol, holderId) {
    const stock = stocks.find(s => s.symbol === symbol);
    const holder = stock && getBlockHolder(stock, holderId);
    if (!holder) return null;
    const talk = getBlockTalk(symbol, holderId);
    const quarter = getBuyoutQuarter();
    if (talk.blockedUntil > quarter || talk.talkedQuarter === quarter) return null;
    const reserve = getBlockReservePrice(stock, holder);
    const shift = getRandomInRange(-0.05, 0.05);
    talk.talkedQuarter = quarter;
    talk.range = { low: reserve * (0.9 + shift), high: reserve * (1.1 + shift) };
    talk.mood = getBlockMood(holder, stock);
    return talk;
}

/** Propozycja odkupu: 'accepted' | 'counter' | 'insulted' | 'refused' | null. */
function proposeBlockBuy(symbol, holderId, shares, price) {
    const stock = stocks.find(s => s.symbol === symbol);
    const holder = stock && getBlockHolder(stock, holderId);
    shares = Math.floor(Number(shares)); price = Number(price);
    if (!holder || !(shares > 0) || !(price > 0)) return null;
    const talk = getBlockTalk(symbol, holderId);
    const quarter = getBuyoutQuarter();
    if (talk.blockedUntil > quarter) { showToast('Ten akcjonariusz nie chce teraz rozmawiać.', 'warning'); return null; }
    if (talk.proposedQuarter === quarter) { showToast('Propozycję temu akcjonariuszowi możesz złożyć raz na kwartał.', 'warning'); return null; }
    price = Math.max(stock.price * (1 + BLOCK_PRICE_RANGE[0]), Math.min(stock.price * (1 + BLOCK_PRICE_RANGE[1]), price));
    shares = Math.min(shares, Math.floor(holder.shares));
    if (playerCash < shares * price) { showToast('Za mało gotówki funduszu na ten pakiet.', 'error'); return null; }
    talk.proposedQuarter = quarter;
    talk.counter = null;
    if (holder.kind === 'ai' && getRelation(holder.id) <= RELATION_HOSTILE) return 'refused';
    const reserve = getBlockReservePrice(stock, holder);
    if (price >= reserve) {
        executeBlockBuy(stock, holder, shares, price);
        if (price >= reserve * 1.1 && holder.kind !== 'insiders') changeRelation(holder.id, 3, `hojna cena za pakiet ${symbol}`);
        return 'accepted';
    }
    if (price >= reserve * 0.85) { talk.counter = { shares, price: (price + reserve) / 2 }; return 'counter'; }
    if (holder.kind === 'insiders') changeReputation('player', symbol, -10);
    else changeRelation(holder.id, -10, `zaniżona oferta za pakiet ${symbol}`);
    talk.blockedUntil = quarter + 2;
    return 'insulted';
}

function acceptBlockCounter(symbol, holderId) {
    const stock = stocks.find(s => s.symbol === symbol);
    const holder = stock && getBlockHolder(stock, holderId);
    const talk = blockDealState.talks[getBlockKey(symbol, holderId)];
    if (!holder || !talk?.counter) return false;
    const { shares, price } = talk.counter;
    talk.counter = null;
    if (playerCash < shares * price) { showToast('Za mało gotówki funduszu.', 'error'); return false; }
    executeBlockBuy(stock, holder, Math.min(shares, Math.floor(holder.shares)), price);
    return true;
}

/** Transfer poza rynkiem: bez wpływu na kurs; zarząd: akcje wchodzą do obrotu (sharesHeld += n). */
function executeBlockBuy(stock, holder, shares, price) {
    const cost = shares * price;
    const symbol = stock.symbol;
    playerCash -= cost;
    if (holder.kind === 'ai') {
        const pos = holder.entity.portfolio[symbol];
        pos.shares -= shares; if (pos.shares <= 0.001) delete holder.entity.portfolio[symbol];
        holder.entity.cash += cost;
        recordPayment('player-fund', `external:${holder.id}`, cost, `Pakiet ${symbol} od ${holder.name}`);
    } else if (holder.kind === 'botFund') {
        const pos = holder.entity.fund.portfolio[symbol];
        pos.shares -= shares; if (pos.shares <= 0.001) delete holder.entity.fund.portfolio[symbol];
        holder.entity.fund.cash += cost;
        recordPayment('player-fund', `external:${holder.id}`, cost, `Pakiet ${symbol} od ${holder.name}`);
    } else {
        const before = Number(stock.insiderShares) || 0;
        stock.insiderShares = before - shares;
        stock.sharesHeld = (Number(stock.sharesHeld) || 0) + shares;
        recordPayment('player-fund', 'external:zarzad', cost, `Wypłata dla zarządu ${symbol}`);
        if (shares > before / 2 && stock.ceo && Math.random() < 0.3) {
            logEvent(`👔 Prezes ${stock.ceo.name} sprzedał większość udziałów i odchodzi z ${stock.name}.`, 'company');
            if (typeof replaceCeo === 'function') replaceCeo(stock);
        }
    }
    const holding = playerPortfolio[symbol] = playerPortfolio[symbol] || { shares: 0, avgPrice: price, assetType: 'stock' };
    holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + shares);
    holding.shares += shares;
    blockDealState.log.push({ q: getBuyoutQuarter(), symbol, shares, price, from: holder.kind });
    blockDealState.log = blockDealState.log.filter(e => getBuyoutQuarter() - e.q <= 8);
    logEvent(`🤝 Fundusz odkupuje pakiet ${shares.toLocaleString('pl-PL')} akcji ${stock.name} od ${holder.name} po ${formatZl(price)} (poza rynkiem).`, 'review');
    if (typeof unlockAcademyEntry === 'function') { unlockAcademyEntry('transakcja_pakietowa'); if (getFundStakePct(stock) > 0.5) unlockAcademyEntry('pakiet_kontrolny'); }
    if (typeof onBlockBuyCompleted === 'function') onBlockBuyCompleted(stock); // M5: KNF i próg wezwania
    if (typeof displayCash === 'function') displayCash();
}

/** Formularz w liście akcjonariuszy (rozwijany, bez okna modalnego). */
function renderBlockBuyForm(stock, holder) {
    const talk = blockDealState.talks[getBlockKey(stock.symbol, holder.id)];
    const quarter = getBuyoutQuarter();
    const blocked = talk?.blockedUntil > quarter;
    const range = talk?.talkedQuarter === quarter ? talk.range : null;
    const id = `blk-${stock.symbol}-${String(holder.id).replace(/[^a-zA-Z0-9]/g, '')}`;
    const open = blockDealState.uiOpen === getBlockKey(stock.symbol, holder.id) ? ' open' : ''; // po akcji formularz zostaje rozwinięty
    const min = stock.price * (1 + BLOCK_PRICE_RANGE[0]), max = stock.price * (1 + BLOCK_PRICE_RANGE[1]);
    const label = v => !range ? '' : v < range.low ? 'poniżej oczekiwań' : v <= range.high ? 'w przedziale oczekiwań' : 'powyżej oczekiwań';
    if (blocked) return `<p class="text-xs text-muted">Rozmowy zablokowane do kw. ${talk.blockedUntil} (urażony niską ofertą).</p>`;
    return `<details class="block-buy"${open}><summary class="text-xs">Zaproponuj odkup</summary>
        <div class="bank-card-form">
            ${range ? `<span class="text-xs">Nastawienie: <strong>${escapeHtml(talk.mood)}</strong>; oczekuje ok. ${formatZl(range.low)}–${formatZl(range.high)} za akcję.</span>` : `<button class="btn-xs btn-secondary" onclick="blockAction('${stock.symbol}', '${holder.id}', talkBlockHolder)">Rozmowa (bez kosztu, raz na kwartał)</button>`}
            <label class="text-xs">Akcji: <input type="number" id="${id}-n" class="w-xs" min="1" max="${Math.floor(holder.shares)}" value="${Math.floor(holder.shares)}"></label>
            <label class="text-xs">Cena: <input type="range" id="${id}-p" min="${min.toFixed(2)}" max="${max.toFixed(2)}" step="0.01" value="${(range ? range.high : stock.price * 1.15).toFixed(2)}" oninput="document.getElementById('${id}-v').textContent = formatZl(this.value) + (${range ? 'true' : 'false'} ? ' · ' + (this.value < ${range?.low || 0} ? 'poniżej oczekiwań' : this.value <= ${range?.high || 0} ? 'w przedziale oczekiwań' : 'powyżej oczekiwań') : '')"></label>
            <span class="text-xs" id="${id}-v">${formatZl(range ? range.high : stock.price * 1.15)}${range ? ` · ${label(range.high)}` : ''}</span>
            <button class="btn-xs" onclick="blockAction('${stock.symbol}', '${holder.id}', proposeBlockBuy, document.getElementById('${id}-n').value, document.getElementById('${id}-p').value)">Złóż propozycję</button>
            ${talk?.counter ? `<span class="text-xs">Kontroferta: ${talk.counter.shares.toLocaleString('pl-PL')} akcji po ${formatZl(talk.counter.price)}</span><button class="btn-xs" onclick="blockAction('${stock.symbol}', '${holder.id}', acceptBlockCounter)">Przyjmij kontrofertę</button>` : ''}
        </div></details>`;
}

function blockAction(symbol, holderId, fn, ...args) {
    blockDealState.uiOpen = getBlockKey(symbol, holderId);
    const result = fn(symbol, holderId, ...args);
    const labels = { accepted: 'Zgoda — pakiet przechodzi do funduszu.', counter: 'Akcjonariusz proponuje cenę pośrodku.', insulted: 'Akcjonariusz urażony — rozmowy zablokowane na 2 kw.', refused: 'Akcjonariusz wrogi — odmawia.' };
    if (labels[result]) showToast(labels[result], result === 'accepted' ? 'success' : 'warning', 5000);
    if (typeof renderCompanyCard === 'function' && companyCardView?.symbol === symbol) renderCompanyCard();
    if (typeof refreshGovernanceView === 'function') refreshGovernanceView(symbol);
}

// =================================================================================
// 0.15.1 M3: BADANIE KUPUJĄCEGO (due diligence)
// =================================================================================

const DD_FRAUD_FIND = 0.70;
const DD_HIDDEN_FIND = 0.60;

/** Audyt przed sprzedażą: zakończony audyt celu z ostatnich 4 kw. */
function hasPreSaleAudit(target) {
    const audit = target?.audit;
    const quarter = typeof getAccountingQuarter === 'function' ? getAccountingQuarter() : 0;
    return Boolean(audit?.done && quarter - (Number(audit.doneQuarter) || -99) <= 4);
}

/**
 * Badanie kupującego: oszustwo (70%) → 50% obniżka 15–30%, 50% zerwanie i ujawnienie; ukryte zobowiązania (60%) →
 * obniżka o ich wartość na akcję. Audyt przed sprzedażą: obniżka o połowę mniejsza, bez zerwania.
 * Zwraca { cut (ułamek ceny), cancel, found[] }.
 */
function runBuyerDueDiligence(initiator, target, process) {
    process.dd = { quarter: getBuyoutQuarter() };
    const preSale = hasPreSaleAudit(target);
    const price = Number(process.offerDetails?.buyoutPricePerShare) || target.price;
    const result = { cut: 0, cancel: false, found: [], preSale };
    if (target.fraud && Math.random() < DD_FRAUD_FIND) {
        result.found.push('oszustwo księgowe');
        if (!preSale && Math.random() < 0.5) result.cancel = true;
        else result.cut += getRandomInRange(0.15, 0.30) * (preSale ? 0.5 : 1);
    }
    if (target.hiddenLiabilities > 0 && Math.random() < DD_HIDDEN_FIND) {
        result.found.push('ukryte zobowiązania');
        result.cut += target.hiddenLiabilities / target.totalShares / price * (preSale ? 0.5 : 1);
        revealHiddenLiabilities(target, `badanie ${initiator.name}`);
    }
    result.cut = Math.min(0.6, result.cut);
    process.dd.result = result;
    if (result.cancel) {
        if (typeof revealFraud === 'function') revealFraud(target, `badanie ${initiator.name}`);
        cancelMerger(initiator, 'Badanie spółki wykryło oszustwo księgowe.');
        if (target.mergerProcess) cancelMerger(target, 'Badanie spółki wykryło oszustwo księgowe.');
        return result;
    }
    if (result.cut > 0) {
        const newPrice = price * (1 - result.cut);
        if (process.kind === 'offer' && getFundStakePct(target) > 0.5) {
            process.ddPending = { oldPrice: price, newPrice, found: result.found, quarter: getBuyoutQuarter(), negotiated: false };
            addMail({
                sender: CORPORATION_SENDER,
                subject: `🔎 Badanie ${target.name}: ${initiator.name} obniża cenę`,
                body: `Badanie spółki wykryło: ${result.found.join(', ')}. ${initiator.name} proponuje ${formatZl(newPrice)} za akcję zamiast ${formatZl(price)}${preSale ? ' (audyt przed sprzedażą zmniejszył obniżkę o połowę)' : ''}. Możesz przyjąć, negocjować raz albo zerwać transakcję bez kary. Bez decyzji w ciągu kwartału obniżka zostaje przyjęta.`,
                importance: 3, symbol: target.symbol, action: { type: 'ddResult', symbol: target.symbol }
            });
        } else setMergerPrice(initiator, target, newPrice);
        logEvent(`🔎 ${initiator.name} po badaniu ${target.name} (${result.found.join(', ')}) obniża cenę do ${formatZl(newPrice)}.`, 'market');
    }
    if (typeof unlockAcademyEntry === 'function' && (getFundStakePct(target) > 0 || getFundStakePct(initiator) > 0)) unlockAcademyEntry('due_diligence');
    return result;
}

function setMergerPrice(initiator, target, price) {
    const process = initiator.mergerProcess;
    if (!process) return;
    process.offerDetails.buyoutPricePerShare = price;
    process.offerDetails.totalCost = price * target.totalShares;
    process.ddPending = null;
    syncPartnerProcess(initiator, target);
}

function getDdPair(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const initiator = target?.mergerProcess && stocks.find(s => s.symbol === target.mergerProcess.initiatorSymbol);
    const pending = initiator?.mergerProcess?.ddPending;
    return pending ? { target, initiator, pending } : null;
}

function ddAcceptCut(symbol) {
    const pair = getDdPair(symbol);
    if (!pair) return false;
    setMergerPrice(pair.initiator, pair.target, pair.pending.newPrice);
    logEvent(`🔎 Fundusz przyjmuje obniżoną cenę ${formatZl(pair.pending.newPrice)} za ${pair.target.name}.`, 'review');
    return true;
}

/** Jedna runda: oferent przyjmuje połowę różnicy, jeśli mieści się w jego cenie maksymalnej. */
function ddNegotiate(symbol) {
    const pair = getDdPair(symbol);
    if (!pair || pair.pending.negotiated) return false;
    pair.pending.negotiated = true;
    const middle = (pair.pending.oldPrice + pair.pending.newPrice) / 2;
    const max = Number(pair.initiator.mergerProcess.offerMax) || pair.pending.newPrice;
    const ok = middle <= max * (1 - (pair.initiator.mergerProcess.dd?.result?.cut || 0)); // cena maks. po wykrytych problemach
    if (ok) pair.pending.newPrice = middle;
    const text = ok ? `${pair.initiator.name} zgadza się na ${formatZl(middle)} za akcję ${pair.target.name}.` : `${pair.initiator.name} nie podnosi ceny ${pair.target.name} — zostaje ${formatZl(pair.pending.newPrice)}.`;
    logEvent(`🔎 ${text}`, 'review');
    if (typeof showToast === 'function') showToast(text, ok ? 'success' : 'warning', 5000);
    return ok ? 'raised' : 'refused';
}

function ddCancel(symbol) {
    const pair = getDdPair(symbol);
    if (!pair) return false;
    pair.initiator.mergerProcess.ddPending = null;
    cancelMerger(pair.initiator, 'Fundusz zerwał transakcję po badaniu spółki.');
    if (pair.target.mergerProcess) cancelMerger(pair.target, 'Fundusz zerwał transakcję po badaniu spółki.');
    return true;
}

// =================================================================================
// 0.15.1 M1: ARBITRAŻ FUZJI — kurs celu = cena oferty × (1 − spread)
// =================================================================================

const MERGER_SPREAD_MAX = 0.15;

/** Spread ryzyka transakcji: podstawa 3%, wrogie / obrona +4 pp, LBO +3 pp, antymonopol +4 pp, +0,5 pp za każdy etap do końca. */
function getMergerSpread(initiator, target, process) {
    const stagesLeft = Math.max(0, 7 - (Number(process.stage) || 1));
    if (process.type === 'fuzja') return Math.min(0.08, 0.03 + stagesLeft / 6 * 0.05); // wymiana akcji: 3–8%
    let spread = 0.03 + stagesLeft * 0.005; // pomiar M8: 1 pp za etap dawało medianę 13% (cel 4–10%)
    if (process.hostile || process.defenseActive) spread += 0.04;
    if (process.financing === 'lbo') spread += 0.03;
    if (isMergerAntitrustRisky(initiator, target)) spread += 0.04;
    return Math.min(MERGER_SPREAD_MAX, spread);
}

/** Ryzyko antymonopolowe: inicjator i cel mają razem > 25% kapitalizacji sektora celu. */
function isMergerAntitrustRisky(initiator, target) {
    const sector = getMainSector(target);
    const sectorCap = stocks.filter(s => !s.assetType && !s.isBankrupt && getMainSector(s) === sector).reduce((sum, s) => sum + getMarketCapValue(s), 0);
    const joint = getMarketCapValue(target) + (getMainSector(initiator) === sector ? getMarketCapValue(initiator) : 0);
    return sectorCap > 0 && joint / sectorCap > 0.25;
}

/** Kurs, do którego wraca cel w trakcie procesu (null: zwykły powrót do wartości godziwej). */
function getMergerArbAnchor(stock) {
    const process = stock?.mergerProcess;
    if (!process?.arb || process.initiatorSymbol === stock.symbol) return null;
    if (process.type === 'fuzja') {
        const initiator = stocks.find(s => s.symbol === process.initiatorSymbol);
        return initiator ? initiator.price * process.arb.parity * (1 - process.arb.spread) : null;
    }
    const offer = Number(process.offerDetails?.buyoutPricePerShare) || 0;
    return offer > 0 ? offer * (1 - process.arb.spread) : null;
}

/** Ogłoszenie przejęcia (gotówka, LBO) albo fuzji: skok kursu celu do ceny oferty minus spread, reakcja inicjatora. */
function announceMergerArbitrage(initiator, target) {
    const process = initiator.mergerProcess;
    if (!process || !['przejęcie', 'fuzja'].includes(process.type)) return;
    const premium = Number(process.offerDetails?.premium) || 0;
    process.arb = { preDealPrice: target.price, parity: initiator.price > 0 ? target.price / initiator.price : 0, spread: 0 };
    process.arb.spread = getMergerSpread(initiator, target, process);
    if (process.type === 'przejęcie') {
        const anchor = getMergerArbAnchor({ ...target, mergerProcess: process });
        if (anchor > 0) target.price = anchor;
        initiator.price *= 1 - Math.min(0.08, Math.max(0, (premium - 0.20) / 0.10 * 0.01)); // −1% za każde 10 pp premii ponad 20%
    }
    if (process.financing === 'stockSwap' || process.type === 'fuzja') initiator.price *= 0.97; // rozwodnienie
    syncPartnerProcess(initiator, target);
    if (typeof pushNews === 'function') pushNews(process.type === 'fuzja'
        ? `${initiator.name} ogłasza fuzję z ${target.name} (wymiana akcji)`
        : `${initiator.name} ogłasza ${process.hostile ? 'wrogie ' : ''}wezwanie na ${target.name}: ${formatZl(process.offerDetails.buyoutPricePerShare)} za akcję (premia ${Math.round(premium * 100)}%)`, target.symbol);
    if (typeof unlockAcademyEntry === 'function' && ((playerPortfolio?.[target.symbol]?.shares || 0) > 0 || (playerPortfolio?.[initiator.symbol]?.shares || 0) > 0)) unlockAcademyEntry('premia_przejecia');
}

/** Co kwartał (inicjator): spread maleje z etapem. */
function updateMergerSpread(initiator, target, process) {
    if (process.arb) process.arb.spread = getMergerSpread(initiator, target, process);
}

/** Zerwanie: kurs celu wraca w okolice ceny sprzed ogłoszenia (±5%). Wołane przed wyczyszczeniem procesu. */
function onMergerArbitrageCancelled(stock) {
    const process = stock?.mergerProcess;
    if (!process?.arb || process.arb.cancelled) return;
    process.arb.cancelled = true;
    const target = process.initiatorSymbol === stock.symbol ? stocks.find(s => s.symbol === process.partnerSymbol) : stock;
    if (!target) return;
    const anchor = getMergerArbAnchor(target);
    if (anchor > 0 && process.type === 'przejęcie') target.price *= process.arb.preDealPrice / anchor * (1 + getRandomInRange(-0.05, 0.05));
    if (typeof pushNews === 'function') pushNews(`Zerwane przejęcie: ${target.name} — kurs wraca w okolice ceny sprzed oferty`, target.symbol);
}

/** 0.15.1 M7: flagi osiągnięć przy rozliczeniu przejęcia (fundusz jeszcze ma akcje celu). */
function noteTakeoverAchievements(process, target, price) {
    if (!playerProfile) return;
    const holding = playerPortfolio[target.symbol];
    const meta = process.offerMeta;
    if (meta?.fundSeller && (holding?.shares || 0) > target.totalShares * 0.5) {
        if (price >= (process.arb?.preDealPrice || target.price) * 1.4) playerProfile._soldWithPremium = true;
        if (meta.auction && price >= meta.initialPrice * 1.1) playerProfile._auctioneer = true;
        if (meta.preSaleAudit) playerProfile._cleanBooks = true;
    }
    const pre = process.arb?.preDealPrice;
    if (holding?.shares > 0 && pre > 0 && holding.avgPrice > pre * 1.02 && price > holding.avgPrice) playerProfile._arbWins = (Number(playerProfile._arbWins) || 0) + 1;
}

/** Linia w karcie spółki-celu. */
function renderMergerArbLine(stock) {
    const process = stock?.mergerProcess;
    if (!process?.arb || process.initiatorSymbol === stock.symbol) return '';
    const offer = process.type === 'fuzja' ? null : process.offerDetails?.buyoutPricePerShare;
    return `<p class="text-sm cc-arb">W trakcie ${process.type === 'fuzja' ? 'fuzji' : 'przejęcia'} przez ${escapeHtml(process.initiatorSymbol)}: ${offer ? `oferta ${formatZl(offer)} · ` : ''}kurs ${formatZl(stock.price)} · spread ${formatNumberPl(process.arb.spread * 100, 1)}% · etap ${process.stage}/7</p>`;
}

function syncPartnerProcess(stock, partner) {
    if (!partner?.mergerProcess || !stock.mergerProcess) return;
    Object.assign(partner.mergerProcess, stock.mergerProcess, { partnerSymbol: stock.symbol });
}

function advanceMergerProcess(stock) {
    if (!stock.mergerProcess) return;
    if (stock.mergerProcess.type === 'fundTakeover') return advanceFundTakeover(stock); // career.js
    const process = stock.mergerProcess;

    // Proces prowadzi wyłącznie inicjator — cel tylko odzwierciedla stan.
    if (process.initiatorSymbol && process.initiatorSymbol !== stock.symbol) return;

    const partner = stocks.find(s => s.symbol === process.partnerSymbol);
    if (!partner || partner.isBankrupt) {
        cancelMerger(stock, 'Partner przestał istnieć lub zbankrutował.');
        if (partner) cancelMerger(partner, 'Partner przestał istnieć lub zbankrutował.');
        return;
    }

    // Stare zapisy: decyzja z funkcjami nie przetrwała — wygeneruj ją ponownie.
    if (process.decisionRequired && !process.decisionRequired.kind) process.decisionRequired = null;
    if (process.decisionRequired) {
        resolvePendingComplication(stock, partner);
        return;
    }

    // 0.15.1 M3: badanie kupującego — oferta uzgodniona w 1. kwartale, przejęcia botów od etapu 2.
    if (process.type === 'przejęcie' && !process.dd && (process.kind === 'offer' || process.stage >= 2)) {
        const dd = runBuyerDueDiligence(stock, partner, process);
        if (dd.cancel || !stock.mergerProcess) return;
    }
    if (process.ddPending) { // czeka na decyzję funduszu; po kwartale obniżka przyjęta
        if (getBuyoutQuarter() - process.ddPending.quarter < 1) return;
        setMergerPrice(stock, partner, process.ddPending.newPrice);
    }

    let speed = MA_STAGE_PROGRESS;
    if (process.defenseActive === 'poisonPill') {
        speed *= MA_POISON_PILL_SLOWDOWN;
        process.costs += Math.round(getMarketCapValue(partner) * 0.002);
        if (Math.random() < getAggressorRetreatChance(stock)) {
            logEvent(`[M&A] 🏳️ ${stock.name} wycofuje się z przejęcia ${partner.name} z powodu „Zatrutej Pigułki”.`, 'company');
            cancelMerger(stock, 'Agresor wycofał ofertę.');
            cancelMerger(partner, 'Agresor wycofał ofertę.');
            return;
        }
    }
    // Sprzeciw akcjonariuszy (głos funduszu przeciw) — co kwartał szansa wycofania agresora.
    if (process.opposition && process.stage < 6 && Math.random() < process.opposition * 0.5) {
        logEvent(`[M&A] 🗳️ ${stock.name} wycofuje ofertę za ${partner.name} — akcjonariusze są przeciw.`, 'company');
        cancelMerger(stock, 'Sprzeciw akcjonariuszy celu.');
        cancelMerger(partner, 'Sprzeciw akcjonariuszy celu.');
        return;
    }
    process.progress = Math.min(100, process.progress + speed);

    const roll = Math.random();
    if (roll < MA_MINI_EVENT_CHANCE) {
        triggerMergerMiniEvent(stock, partner, process);
    } else if (roll < MA_MINI_EVENT_CHANCE + MA_COMPLICATION_CHANCE) {
        process.complications++;
        process.statusMessage = `Etap ${process.stage}: komplikacja nr ${process.complications} 🔴`;
        if (process.complications >= MA_MAJOR_COMPLICATION_AT) {
            handleMajorComplication(stock, partner, process);
            syncPartnerProcess(stock, partner);
            return;
        }
    }

    if (process.progress >= 100) {
        process.stage++;
        process.progress = 0;
        process.complications = 0;
        if (!runMergerStage(stock, partner, process)) return;
    }
    updateMergerSpread(stock, partner, process);
    syncPartnerProcess(stock, partner);
    if (typeof displayStocks === 'function') displayStocks(getCurrentInputValues());
}

function getMarketCapValue(stock) {
    return (Number(stock.price) || 0) * (Number(stock.totalShares) || 0);
}

/** Szansa wycofania agresora co kwartał przy pigułce — zależna od osobowości właściciela inicjatora. */
function getAggressorRetreatChance(initiator) {
    const owner = findMajorityShareholder(initiator);
    const personality = owner?.entity?.personality;
    if (personality === 'reckless' || personality === 'yolo_trader') return 0.05;
    if (personality === 'calm' || personality === 'dividend_chaser') return 0.3;
    return 0.15;
}

/** Logika etapu. Zwraca false, gdy proces się zakończył (anulowanie lub finalizacja). */
function runMergerStage(stock, partner, process) {
    switch (process.stage) {
        case 2:
            process.statusMessage = 'Etap 2: negocjacje warunków…';
            return true;
        case 3: {
            process.costs += 5000 + (getMarketCapValue(stock) + getMarketCapValue(partner)) * 0.005;
            process.statusMessage = `Etap 3: strategia i finansowanie (koszty: ${formatZl(process.costs, 0)}).`;
            return true;
        }
        case 4:
            process.statusMessage = 'Etap 4: analiza prawna i kontrola antymonopolowa…';
            if (checkAntitrust(stock, partner)) {
                const fine = Math.round(Math.max(0, stock.cash) * (0.01 + (antitrustOffice?.accuracy || 0.2) * 0.04));
                if (fine > 0) {
                    adjustCompanyCash(stock, -fine);
                    adjustBalanceSheet(stock, { assets: -fine, retainedEarnings: -fine });
                    governmentTreasury += fine;
                    logEvent(`⚖️ Urząd antymonopolowy blokuje ${process.type} ${stock.name} → ${partner.name} i nakłada na inicjatora karę ${formatZl(fine, 0)}.`, 'state');
                }
                cancelMerger(stock, 'Zablokowane przez urząd antymonopolowy.');
                cancelMerger(partner, 'Zablokowane przez urząd antymonopolowy.');
                return false;
            }
            process.statusMessage = 'Etap 4: analiza prawna zaakceptowana.';
            triggerMergerMiniEvent(stock, partner, process);
            return true;
        case 5:
            process.statusMessage = 'Etap 5: integracja operacyjna…';
            stock.mergerPartnerVisible = true;
            partner.mergerPartnerVisible = true;
            partner.isBeingMerged = true; // 0.15.1 M1: bez skoku kursu — cel idzie za ceną oferty minus spread
            return true;
        case 6:
            process.statusMessage = 'Etap 6: finalizacja umowy i transfery…';
            partner.canBeTraded = false;
            return true;
        case 7:
            resolveMerger(stock, partner, process);
            return false;
        default:
            process.statusMessage = `Etap ${process.stage}`;
            return true;
    }
}

// =================================================================================
// KOMPLIKACJE (dane zamiast funkcji)
// =================================================================================

const COMPLICATION_OPTIONS = [
    { id: 'cancel', text: 'Anuluj proces (negatywne konsekwencje dla obu firm)' },
    { id: 'expensive', text: 'Kontynuuj mimo wszystko (koszty +25%)' },
    { id: 'stronger', text: 'Wykorzystaj kryzys, by wzmocnić współpracę (30% bonus, 70% anulowanie)' }
];

function handleMajorComplication(stock, partner, process) {
    process.progress = 0;
    process.statusMessage = '🔴 Poważne komplikacje — wymagana decyzja…';
    process.decisionRequired = {
        kind: 'complication',
        question: `Proces ${process.type} między ${stock.name} a ${partner.name} napotkał poważne trudności. Co robimy?`,
        options: COMPLICATION_OPTIONS.map(option => ({ ...option }))
    };
    logEvent(`[M&A] 🔴 Poważne komplikacje w procesie ${stock.name} ↔ ${partner.name} — wymagana decyzja.`, 'warning');
    resolvePendingComplication(stock, partner);
}

/** Kto decyduje: fundusz (> 50% którejś strony) w oknie gry; w innym wypadku od razu właściciel/zarząd. */
function resolvePendingComplication(stock, partner) {
    const process = stock.mergerProcess;
    if (!process?.decisionRequired) return;
    const playerStock = getFundStakePct(stock) > 0.5 ? stock : getFundStakePct(partner) > 0.5 ? partner : null;
    if (playerStock) {
        if (typeof openComplicationModal === 'function') openComplicationModal(playerStock, process.decisionRequired);
        return;
    }
    applyComplicationOption(stock.symbol, chooseComplicationOption(stock));
}

/** Decyzja AI wg osobowości właściciela inicjatora (lub zarządu przy rozproszonym akcjonariacie). */
function chooseComplicationOption(stock) {
    const personality = findMajorityShareholder(stock)?.entity?.personality;
    if (personality === 'reckless' || personality === 'yolo_trader') return 'stronger';
    if (personality === 'calm' || personality === 'dividend_chaser') return Math.random() < 0.6 ? 'cancel' : 'expensive';
    return Math.random() < 0.7 ? 'expensive' : 'cancel';
}

function applyComplicationOption(stockSymbol, optionId) {
    let stock = stocks.find(s => s.symbol === stockSymbol);
    if (!stock?.mergerProcess) return false;
    // Decyzję wykonuje zawsze proces inicjatora.
    const initiator = stocks.find(s => s.symbol === stock.mergerProcess.initiatorSymbol) || stock;
    stock = initiator;
    const process = stock.mergerProcess;
    const partner = stocks.find(s => s.symbol === process.partnerSymbol);
    if (!process?.decisionRequired || !partner) return false;

    process.decisionRequired = null;
    process.complications = 0;
    if (optionId === 'cancel') {
        cancelMerger(stock, 'Anulowano z powodu komplikacji.');
        cancelMerger(partner, 'Anulowano z powodu komplikacji.');
        return true;
    }
    if (optionId === 'expensive') {
        process.costs = (process.costs || 0) * 1.25 + 5000;
        process.statusMessage = 'Kontynuacja mimo wyższych kosztów…';
    } else if (optionId === 'stronger') {
        if (Math.random() < 0.3) {
            triggerMergerMiniEvent(stock, partner, process);
            process.statusMessage = 'Kryzys wzmocnił współpracę!';
        } else {
            cancelMerger(stock, 'Nie udało się przezwyciężyć kryzysu.');
            cancelMerger(partner, 'Nie udało się przezwyciężyć kryzysu.');
            return true;
        }
    }
    syncPartnerProcess(stock, partner);
    return true;
}

function resolveComplicationDecision(stockSymbol, optionId) {
    applyComplicationOption(stockSymbol, optionId);
    if (typeof displayStocks === 'function') displayStocks(getCurrentInputValues());
    const modal = document.getElementById('management-modal');
    if (modal?.style.display === 'block' && typeof openManagementModal === 'function') openManagementModal(stockSymbol);
}

// =================================================================================
// WALIDACJA LBO
// =================================================================================

/** LBO: potrzebny bank-kredytodawca, a zadłużenie po transakcji ≤ 80% aktywów obu spółek. */
function validateLbo(initiator, target, totalCost) {
    const lender = typeof findBestLenderBank === 'function' ? findBestLenderBank(initiator, totalCost) : null;
    if (!lender) return { ok: false, reason: 'żaden bank nie sfinansuje wykupu lewarowanego' };
    const assets = (initiator.balanceSheet?.assets || 0) + (target.balanceSheet?.assets || 0);
    const debt = (initiator.balanceSheet?.liabilities || 0) + (target.balanceSheet?.liabilities || 0) + totalCost;
    if (assets <= 0 || debt / assets > LBO_MAX_DEBT_TO_ASSETS) return { ok: false, reason: `zadłużenie po wykupie przekroczyłoby ${(LBO_MAX_DEBT_TO_ASSETS * 100).toFixed(0)}% aktywów` };
    if ((Number(initiator.financialHealth) || 0) < -1) return { ok: false, reason: 'zbyt słaba kondycja inicjatora' };
    return { ok: true, lender };
}

// =================================================================================
// G2: OBRONY PRZED PRZEJĘCIEM
// =================================================================================

const TAKEOVER_DEFENSES = {
    poisonPill: { label: '🧪 Zatruta pigułka', costPct: 0.05, desc: 'Emisja dla obecnych akcjonariuszy: przejęcie droższe o 20% kapitalizacji, agresor może się wycofać. Kondycja spółki spada.' },
    whiteKnight: { label: '🛡️ Biały Rycerz', costPct: 0.01, desc: 'Przyjazna spółka z sektora składa ofertę z wyższą premią. Agresor podbija albo się wycofuje.' },
    pacMan: { label: '👾 Pac-Man', costPct: 0.01, desc: 'Spółka skupuje 10% akcji agresora (wymaga gotówki ≥ 30% jego kapitalizacji). Agresor broni się albo wycofuje.' },
    negotiate: { label: '🤝 Negocjacje', costPct: 0.005, desc: 'Zarząd żąda premii wyższej o 10–20 pkt proc. Agresor akceptuje albo odchodzi.' }
};
const PAC_MAN_CASH_REQUIREMENT = 0.3;
const PAC_MAN_STAKE = 0.1;

/** Proces przejęcia, w którym spółka jest celem: { process (inicjatora), initiator } albo null. */
function getTakeoverAgainst(target) {
    const own = target?.mergerProcess;
    if (!own || !['przejęcie', 'influenceTakeover'].includes(own.type) || own.initiatorSymbol === target.symbol) return null;
    const initiator = stocks.find(s => s.symbol === own.initiatorSymbol);
    if (!initiator?.mergerProcess) return null;
    return { process: initiator.mergerProcess, initiator };
}

function getDefenseCost(target, type) {
    return Math.round(getMarketCapValue(target) * (TAKEOVER_DEFENSES[type]?.costPct || 0));
}

/** Kto płaci za obronę: fundus gracza, bot albo sama spółka. */
function getDefensePayer(entityId, target) {
    if (entityId === 'player') return { name: playerProfile?.fundName || 'Fundusz', cash: playerCash, pay: amount => { playerCash -= amount; recordPayment('player-fund', 'external:doradcy_ma', amount, `Obrona ${target.symbol}`); } };
    const ai = aiCompetitors.find(a => a.id === entityId);
    if (ai) return { name: ai.name, cash: ai.cash, pay: amount => { ai.cash -= amount; } };
    return {
        name: target.name, cash: target.cash, pay: amount => {
            adjustCompanyCash(target, -amount);
            adjustBalanceSheet(target, { assets: -amount, retainedEarnings: -amount });
            recordPayment(target, 'external:doradcy_ma', amount, 'Obrona przed przejęciem');
        }
    };
}

/** Czy obrona jest dostępna: { ok, reason, cost }. */
function canUseDefense(target, type, entityId = 'player') {
    const pair = getTakeoverAgainst(target);
    if (!pair) return { ok: false, reason: 'spółka nie jest celem przejęcia' };
    if (pair.process.defenseActive && pair.process.defenseActive !== 'none') return { ok: false, reason: 'obrona już użyta' };
    if (!TAKEOVER_DEFENSES[type]) return { ok: false, reason: 'nieznana obrona' };
    const cost = getDefenseCost(target, type);
    if (getDefensePayer(entityId, target).cash < cost) return { ok: false, reason: 'brak gotówki', cost };
    if (type === 'pacMan' && target.cash < getMarketCapValue(pair.initiator) * PAC_MAN_CASH_REQUIREMENT) return { ok: false, reason: 'spółka ma za mało gotówki na kontratak', cost };
    return { ok: true, cost };
}

/** Szansa, że agresor przyjmie warunki (podbicie, wyższa premia) — wg osobowości właściciela. */
function getAggressorPersistence(initiator) {
    const personality = findMajorityShareholder(initiator)?.entity?.personality;
    if (personality === 'reckless' || personality === 'yolo_trader') return 0.7;
    if (personality === 'whale') return 0.6;
    if (personality === 'pro_investor') return 0.45;
    if (personality === 'calm' || personality === 'dividend_chaser') return 0.25;
    return 0.45;
}

function raiseTakeoverOffer(initiator, target, process, extra) {
    const offer = process.offerDetails;
    offer.premium = (offer.premium || 0) + extra;
    offer.buyoutPricePerShare *= (1 + extra);
    offer.totalCost = offer.buyoutPricePerShare * target.totalShares - (offer.prepaid || 0);
}

function syncTakeover(initiator, target) {
    if (initiator.mergerProcess && target.mergerProcess) syncPartnerProcess(initiator, target);
}

function abortTakeover(initiator, target, reason) {
    cancelMerger(initiator, reason);
    if (target.mergerProcess) cancelMerger(target, reason);
}

/**
 * Aktywuje obronę spółki-celu. entityId: 'player' (fundusz z większością), id bota albo 'company' (zarząd).
 * Zwraca true, gdy obrona została użyta.
 */
function activateDefenseMechanism(symbol, defenseType, entityId = 'player') {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    const notify = (text, type = 'warning') => { if (entityId === 'player') showToast(text, type); };
    if (!pair) { notify('Spółka nie jest celem przejęcia.'); return false; }
    if (entityId === 'player' && getFundStakePct(target) <= 0.5) { notify('Obronę uruchamia akcjonariusz większościowy (> 50%).'); return false; }
    const check = canUseDefense(target, defenseType, entityId);
    if (!check.ok) { notify(`Nie można użyć obrony: ${check.reason}.`); return false; }

    const { process, initiator } = pair;
    const payer = getDefensePayer(entityId, target);
    if (check.cost > 0) payer.pay(check.cost);
    process.defenseActive = defenseType;
    process.defenseBy = payer.name;

    switch (defenseType) {
        case 'poisonPill':
            target.financialHealth = Math.max(-5, (Number(target.financialHealth) || 0) - 0.5);
            logEvent(`🧪 ${target.name} aktywuje „Zatrutą Pigułkę” przeciw ${initiator.name} (koszt ${formatZl(check.cost, 0)}, płaci: ${payer.name}).`, 'review');
            break;
        case 'negotiate':
            runTakeoverNegotiation(initiator, target, process);
            break;
        case 'whiteKnight':
            runWhiteKnight(initiator, target, process);
            break;
        case 'pacMan':
            runPacMan(initiator, target, process);
            break;
    }
    syncTakeover(initiator, target);
    if (entityId === 'player') {
        if (typeof displayCash === 'function') displayCash();
        refreshTakeoverViews(symbol);
    }
    return true;
}

function runTakeoverNegotiation(initiator, target, process) {
    const demand = 0.1 + Math.random() * 0.1;
    const newTotal = process.offerDetails.buyoutPricePerShare * (1 + demand) * target.totalShares;
    const affordable = process.financing !== 'cash' || initiator.cash >= newTotal;
    if (affordable && Math.random() < getAggressorPersistence(initiator) + 0.2) {
        raiseTakeoverOffer(initiator, target, process, demand);
        logEvent(`🤝 ${initiator.name} przyjmuje żądania ${target.name}: premia rośnie o ${(demand * 100).toFixed(0)} pkt proc. (cena ${formatZl(process.offerDetails.buyoutPricePerShare, 2)}).`, 'review');
    } else {
        logEvent(`🤝 ${initiator.name} odrzuca żądania ${target.name} i wycofuje ofertę.`, 'review');
        abortTakeover(initiator, target, 'Agresor odrzucił żądania wyższej premii.');
    }
}

function findWhiteKnight(initiator, target, premium) {
    const cost = target.price * (1 + premium) * target.totalShares;
    return stocks.filter(s => s !== target && s !== initiator && !s.assetType && !s.mergerProcess && !s.isBankrupt
        && !s.isSubsidiaryOf && s.sector?.some(sector => target.sector?.includes(sector))
        && s.cash >= cost * 1.15 && !checkAntitrust(s, target))
        .sort((a, b) => getMarketCapValue(b) - getMarketCapValue(a))[0] || null;
}

function runWhiteKnight(initiator, target, process) {
    const knightPremium = (process.offerDetails.premium || 0.2) + 0.1;
    const knight = findWhiteKnight(initiator, target, knightPremium);
    if (!knight) {
        logEvent(`🛡️ ${target.name} szuka „Białego Rycerza”, ale żadna spółka z sektora nie może złożyć oferty.`, 'review');
        return;
    }
    const counter = 0.15;
    const counterTotal = process.offerDetails.buyoutPricePerShare * (1 + counter) * target.totalShares;
    if ((process.financing !== 'cash' || initiator.cash >= counterTotal) && Math.random() < getAggressorPersistence(initiator)) {
        raiseTakeoverOffer(initiator, target, process, counter);
        logEvent(`🛡️ ${knight.name} staje do walki o ${target.name}, ale ${initiator.name} podbija ofertę o ${(counter * 100).toFixed(0)}% — Rycerz rezygnuje.`, 'review');
        return;
    }
    abortTakeover(initiator, target, `Wygrała przyjazna oferta ${knight.name}.`);
    logEvent(`🛡️ Biały Rycerz: ${knight.name} przejmuje inicjatywę i składa przyjazną ofertę za ${target.name} (premia ${(knightPremium * 100).toFixed(0)}%).`, 'review');
    initiateMergerProcess(knight, target, 'przejęcie', 'cash', knightPremium, { friendly: true });
}

function runPacMan(initiator, target, process) {
    const stakeCost = getMarketCapValue(initiator) * PAC_MAN_STAKE;
    const shares = Math.min(getAvailableShares(initiator), Math.floor(stakeCost / Math.max(0.01, initiator.price)));
    const paid = shares * initiator.price;
    if (shares > 0) {
        adjustCompanyCash(target, -paid); // gotówka → akcje agresora (aktywa bez zmian)
        initiator.sharesHeld += shares;
        if (!target.equityStakes) target.equityStakes = {};
        target.equityStakes[initiator.symbol] = (target.equityStakes[initiator.symbol] || 0) + shares;
        applyTradeImpact(initiator, shares, 1);
    }
    logEvent(`👾 Pac-Man: ${target.name} skupuje ${shares.toLocaleString('pl-PL')} akcji agresora ${initiator.name}!`, 'review');
    if (Math.random() > getAggressorPersistence(initiator) * 0.7) {
        abortTakeover(initiator, target, 'Kontratak Pac-Man — agresor musi bronić się sam.');
    } else {
        process.costs += Math.round(getMarketCapValue(target) * 0.05);
        logEvent(`👾 ${initiator.name} nie ustępuje mimo kontrataku — koszty przejęcia rosną.`, 'review');
    }
}

/** Obrona wybrana wg osobowości bota (albo cechy prezesa przy decyzji zarządu). */
function chooseDefenseForPersonality(personality, target, entityId) {
    const prefs = {
        whale: ['pacMan', 'whiteKnight', 'poisonPill'],
        pro_investor: ['whiteKnight', 'negotiate', 'poisonPill'],
        calm: ['negotiate', 'whiteKnight'],
        dividend_chaser: ['negotiate', 'poisonPill'],
        reckless: ['poisonPill', 'pacMan'],
        yolo_trader: ['poisonPill', 'negotiate'],
        banker: ['whiteKnight', 'negotiate']
    }[personality] || ['poisonPill', 'negotiate'];
    return prefs.find(type => canUseDefense(target, type, entityId).ok) || 'negotiate';
}

// =================================================================================
// G2: WROGIE PRZEJĘCIA I DECYZJA FUNDUSZU
// =================================================================================

/** Wołane przez initiateMergerProcess po starcie przejęcia. */
function onTakeoverStarted(initiator, target, options = {}) {
    const process = initiator.mergerProcess;
    process.hostile = !options.friendly;
    syncTakeover(initiator, target);
    if (options.offer) return; // 0.15.1 M2: transakcja uzgodniona z większościowcem — bez okna decyzji i bez obrony
    if (typeof addChartEvent === 'function') addChartEvent(target, '🤝', `${options.friendly ? 'Oferta przejęcia' : 'Wrogie przejęcie'}: ${initiator.name}`);
    if (typeof onTakeoverStartedRelations === 'function') onTakeoverStartedRelations(initiator, target);
    if (getFundStakePct(target) >= 0.2 && playerFund) notifyFundOfTakeover(initiator, target);

    const owner = findMajorityShareholder(target);
    if (options.friendly || owner?.kind === 'player' || owner?.kind === 'ai') return; // gracz w oknie, bot w swojej turze
    if (isPuppetOf(target, initiator.symbol)) return; // 0.15.1 M9: marionetka nie broni się przed matką
    if (Math.random() < 0.3) {
        const loyalCeo = target.ceo?.traits?.some(t => t.id === 'oddany');
        activateDefenseMechanism(target.symbol, chooseDefenseForPersonality(loyalCeo ? 'reckless' : 'pro_investor', target, 'company'), 'company');
    }
}

function notifyFundOfTakeover(initiator, target) {
    const process = initiator.mergerProcess;
    process.fundDecision = 'pending';
    syncTakeover(initiator, target);
    const pct = getFundStakePct(target);
    addMail({
        sender: CORPORATION_SENDER,
        subject: `🚨 Wezwanie: ${initiator.name} chce przejąć ${target.name}`,
        body: `${initiator.name} oferuje ${formatZl(process.offerDetails.buyoutPricePerShare, 2)} za akcję ${target.name} (premia ${((process.offerDetails.premium || 0) * 100).toFixed(0)}%). Fundusz ma ${(pct * 100).toFixed(1)}% akcji — zdecyduj: sprzedaż po cenie oferty albo głos przeciw${pct > 0.5 ? ', a jako większościowy akcjonariusz także obrona' : ''}.`,
        importance: 3, symbol: target.symbol, action: { type: 'takeover', symbol: target.symbol }
    });
    // U1: decyzja o przejęciu wyskakuje na ekranie i pauzuje grę (wyjątek od zasady „bez okien”).
    if (document.getElementById('takeover-modal') && typeof openTakeoverModal === 'function') {
        if (typeof isGamePaused !== 'undefined' && !isGamePaused && typeof togglePauseGame === 'function') togglePauseGame();
        openTakeoverModal(target.symbol);
        showToast(`🚨 Wrogie przejęcie ${target.name}! Gra wstrzymana do Twojej decyzji.`, 'warning', 7000);
    } else {
        showToast(`🚨 Wrogie przejęcie ${target.name}! Decyzja funduszu w poczcie.`, 'warning', 7000);
    }
}

// =================================================================================
// U1: NEGOCJACJE W RUNDACH (osobny panel; fundusz z większością)
// =================================================================================

const NEGOTIATION_MAX_ROUNDS = 3;

/** Szansa przyjęcia żądania: charakter właściciela agresora, wysokość żądania, zmęczenie rundami. */
function getNegotiationAcceptChance(initiator, demand, round = 1) {
    return Math.max(0.05, Math.min(0.95, getAggressorPersistence(initiator) + 0.25 - demand * 2.5 - (round - 1) * 0.1));
}

function startPlayerNegotiation(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    if (!pair) { showToast('Spółka nie jest celem przejęcia.', 'warning'); return false; }
    if (getFundStakePct(target) <= 0.5) { showToast('Negocjuje akcjonariusz większościowy (> 50%).', 'warning'); return false; }
    const check = canUseDefense(target, 'negotiate', 'player');
    if (!check.ok) { showToast(`Nie można negocjować: ${check.reason}.`, 'warning'); return false; }
    getDefensePayer('player', target).pay(check.cost);
    pair.process.defenseActive = 'negotiate';
    pair.process.defenseBy = playerProfile?.fundName || 'Fundusz';
    pair.process.negotiation = { round: 1, counter: null, open: true, history: [] };
    syncTakeover(pair.initiator, target);
    logEvent(`🤝 ${target.name} rozpoczyna negocjacje z ${pair.initiator.name} (doradcy: ${formatZl(check.cost, 0)}).`, 'review');
    return true;
}

/** Runda: fundusz żąda podniesienia premii o `demand` (np. 0,15 = 15 pkt proc.). */
function negotiationDemand(symbol, demand) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    const neg = pair?.process.negotiation;
    demand = Number(demand);
    if (!neg?.open) { showToast('Negocjacje są zakończone.', 'default'); return null; }
    if (!(demand >= 0.02 && demand <= 0.5)) { showToast('Żądanie: od 2 do 50 pkt proc. premii.', 'warning'); return null; }
    const { initiator, process } = pair;
    const newTotal = process.offerDetails.buyoutPricePerShare * (1 + demand) * target.totalShares;
    const affordable = process.financing !== 'cash' || initiator.cash >= newTotal;
    const chance = affordable ? getNegotiationAcceptChance(initiator, demand, neg.round) : 0;
    let result;
    if (Math.random() < chance) {
        raiseTakeoverOffer(initiator, target, process, demand);
        neg.open = false;
        result = 'accepted';
        logEvent(`🤝 ${initiator.name} przyjmuje żądanie: premia +${(demand * 100).toFixed(0)} pkt proc. (cena ${formatZl(process.offerDetails.buyoutPricePerShare, 2)}).`, 'review');
    } else if (neg.round < NEGOTIATION_MAX_ROUNDS && affordable && Math.random() < 0.6) {
        neg.counter = Math.round(demand * getRandomInRange(0.3, 0.6) * 100) / 100;
        result = 'counter';
    } else {
        neg.open = false;
        result = 'walkout';
        logEvent(`🤝 ${initiator.name} zrywa negocjacje i wycofuje ofertę za ${target.name}.`, 'review');
        abortTakeover(initiator, target, 'Agresor zerwał negocjacje.');
    }
    neg.history.push({ round: neg.round, demand, result, counter: neg.counter });
    neg.round++;
    return result;
}

function negotiationAcceptCounter(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    const neg = pair?.process.negotiation;
    if (!neg?.open || !(neg.counter > 0)) return false;
    raiseTakeoverOffer(pair.initiator, target, pair.process, neg.counter);
    neg.open = false;
    neg.history.push({ round: neg.round, result: 'counterAccepted', counter: neg.counter });
    logEvent(`🤝 Porozumienie: ${pair.initiator.name} podnosi premię za ${target.name} o ${(neg.counter * 100).toFixed(0)} pkt proc.`, 'review');
    return true;
}

function negotiationEnd(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const neg = target && getTakeoverAgainst(target)?.process.negotiation;
    if (neg) neg.open = false;
    return true;
}

/** Fundusz sprzedaje (niezablokowane) akcje celu agresorowi po cenie oferty. */
function sellFundSharesToAggressor(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    const holding = playerPortfolio[symbol];
    if (!pair || !holding) { showToast('Oferta przejęcia nie jest już aktualna.', 'default'); return false; }
    const { initiator, process } = pair;
    const shares = Math.floor(holding.shares - (holding.lockedShares || 0));
    const price = process.offerDetails.buyoutPricePerShare;
    const amount = shares * price;
    if (!(shares > 0)) { showToast('Brak akcji do sprzedaży (zastaw).', 'warning'); return false; }
    if (initiator.cash < amount) { showToast(`${initiator.name} nie ma gotówki na odkup pakietu.`, 'error'); return false; }

    adjustCompanyCash(initiator, -amount); // gotówka → akcje celu (aktywa bez zmian)
    if (!initiator.equityStakes) initiator.equityStakes = {};
    initiator.equityStakes[symbol] = (initiator.equityStakes[symbol] || 0) + shares;
    playerCash += amount;
    const profit = (price - holding.avgPrice) * shares;
    holding.shares -= shares;
    if (holding.shares <= 0) delete playerPortfolio[symbol];
    recordPayment(initiator, 'player-fund', amount, `Odkup akcji ${symbol} w przejęciu`);
    process.offerDetails.prepaid = (process.offerDetails.prepaid || 0) + amount;
    process.offerDetails.totalCost = Math.max(0, process.offerDetails.totalCost - amount);
    process.fundDecision = 'sold';
    syncTakeover(initiator, target);
    logEvent(`💰 Fundusz sprzedaje ${shares.toLocaleString('pl-PL')} akcji ${target.name} spółce ${initiator.name} po ${formatZl(price, 2)} (wynik ${profit >= 0 ? '+' : ''}${formatZl(profit, 0)}).`, 'review');
    showToast(`Sprzedano pakiet ${symbol} za ${formatZl(amount, 0)}.`, 'success');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    refreshTakeoverViews(symbol);
    return true;
}

/** Fundusz głosuje przeciw: co kwartał szansa, że agresor się wycofa (rośnie z udziałem funduszu). */
function voteAgainstTakeover(symbol) {
    const target = stocks.find(s => s.symbol === symbol);
    const pair = target && getTakeoverAgainst(target);
    if (!pair) { showToast('Oferta przejęcia nie jest już aktualna.', 'default'); return false; }
    pair.process.fundDecision = 'against';
    pair.process.opposition = Math.min(0.8, getFundStakePct(target) * 0.8);
    syncTakeover(pair.initiator, target);
    logEvent(`🗳️ Fundusz głosuje przeciw przejęciu ${target.name} przez ${pair.initiator.name}.`, 'review');
    refreshTakeoverViews(symbol);
    return true;
}

/** Losowe wrogie przejęcie przez spółkę kontrolowaną przez bota lub zarząd (czasem w spółce funduszu). */
function triggerHostileTakeoverEvent(forcedTarget = null) {
    const free = s => !s.assetType && !s.mergerProcess && !s.isBankrupt && !s.isSubsidiaryOf && s.canBeTraded !== false;
    const initiators = stocks.filter(s => free(s) && !['player', 'wallet'].includes(findMajorityShareholder(s)?.kind) && s.cash > 0);
    if (!initiators.length) return null;
    const initiator = getRandomElement(initiators);
    const premium = 0.15 + Math.random() * 0.25;
    const affordable = stocks.filter(s => free(s) && s !== initiator && !s.isStateOwned && getMarketCapValue(s) * (1 + premium) <= initiator.cash);
    // Przyjazny bot-właściciel nie atakuje spółek, w których fundusz ma duży udział (relations.js).
    const ownerBot = findMajorityShareholder(initiator)?.kind === 'ai' ? findMajorityShareholder(initiator).entity : null;
    const spareFund = ownerBot && typeof getRelation === 'function' && getRelation(ownerBot.id) >= RELATION_FRIENDLY;
    const fundTargets = spareFund ? [] : affordable.filter(s => getFundStakePct(s) >= 0.2);
    const pool = spareFund ? affordable.filter(s => getFundStakePct(s) < 0.2) : affordable;
    const target = forcedTarget || (fundTargets.length && Math.random() < 0.5 ? getRandomElement(fundTargets) : getRandomElement(pool));
    if (!target) return null;
    logEvent(`🚨 WROGIE PRZEJĘCIE: ${initiator.name} ogłasza ofertę za ${target.name} (premia ${(premium * 100).toFixed(0)}%).`, 'market');
    return initiateMergerProcess(initiator, target, 'przejęcie', 'cash', premium) ? { initiator, target } : null;
}

function refreshTakeoverViews(symbol) {
    const modal = document.getElementById('takeover-modal');
    if (modal && modal.style.display === 'block') openTakeoverModal(symbol);
    const management = document.getElementById('management-modal');
    if (management && management.style.display === 'block' && typeof openManagementModal === 'function') openManagementModal(symbol);
}

// =================================================================================
// G2: EMISJA RATUNKOWA
// =================================================================================

// 0.14.2 P2: oferty per spółka (dawniej jedna globalna oferta — nowa emisja innej spółki podmieniała ofertę
// w otwartym oknie, więc „Obejmij” kupował akcje innej spółki niż na ekranie).
let rescueOffers = {};
const RESCUE_OFFER_QUARTERS = 1; // oferta dla funduszu ważna do końca następnego kwartału

function getRescueOffer(symbol) {
    const offer = rescueOffers[symbol];
    return offer && !offer.closed ? offer : null;
}

/** Nowe akcje z emisji ratunkowej: pieniądze spłacają dług, kupujący (także nowi) dostają akcje. */
function issueRescueShares(stock, buyer, shares, price) {
    shares = Math.floor(shares);
    const amount = shares * price;
    if (!(shares > 0)) return 0;
    if (buyer === 'player') {
        if (playerCash < amount) return 0;
        playerCash -= amount;
        const holding = playerPortfolio[stock.symbol] || (playerPortfolio[stock.symbol] = { shares: 0, avgPrice: 0, assetType: 'stock' });
        holding.avgPrice = (holding.avgPrice * holding.shares + amount) / (holding.shares + shares);
        holding.shares += shares;
        recordPayment('player-fund', stock, amount, `Emisja ratunkowa ${stock.symbol}`);
    } else {
        if (buyer.cash < amount) return 0;
        buyer.cash -= amount;
        const holding = buyer.portfolio[stock.symbol] || (buyer.portfolio[stock.symbol] = { shares: 0, avgPrice: 0 });
        holding.avgPrice = (holding.avgPrice * holding.shares + amount) / (holding.shares + shares);
        holding.shares += shares;
    }
    stock.maxShares = Math.max(Number(stock.maxShares) || 0, stock.totalShares) + shares;
    stock.totalShares += shares;
    stock.sharesHeld += shares;
    adjustCompanyCash(stock, amount);
    const repay = Math.min(amount, Math.max(0, stock.balanceSheet?.liabilities || 0));
    if (repay > 0) adjustCompanyCash(stock, -repay);
    adjustBalanceSheet(stock, { assets: amount - repay, liabilities: -repay });
    if (stock.balanceSheet) stock.balanceSheet.shareCapital = (Number(stock.balanceSheet.shareCapital) || 0) + amount;
    stock.rescueRaised = (stock.rescueRaised || 0) + amount;
    return shares;
}

/** Bot decyduje wg osobowości, ile akcji obejmie (także jako nowy akcjonariusz). */
function aiDecideOnRescueOffer(ai, offer, shares) {
    const chance = { calm: 0.5, pro_investor: 0.7, whale: 0.6, yolo_trader: 0.8, reckless: 0.8, dividend_chaser: 0.4 }[ai.personality] ?? 0.5;
    const holder = (ai.portfolio[offer.symbol]?.shares || 0) > 0;
    if (Math.random() > chance + (holder ? 0.2 : 0)) return 0;
    const stock = stocks.find(s => s.symbol === offer.symbol);
    const affordable = Math.floor(ai.cash * 0.2 / offer.price);
    return stock ? issueRescueShares(stock, ai, Math.min(shares, affordable), offer.price) : 0;
}

function triggerRescueOfferingEvent(forcedTarget = null) {
    const candidates = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.mergerProcess && s.balanceSheet
        && s.balanceSheet.liabilities > getMarketCapValue(s) * 0.3);
    let stock = forcedTarget;
    if (!stock && candidates.length > 0) {
        stock = getRandomElement(candidates); // 0.15.0.1 C4: ratunek zadłużonych, bez wagi bańki (emisje w cyklu idą przez walne)
    }
    if (!stock) return null;
    const price = stock.price * (1 - getRandomInRange(0.15, 0.25));
    const total = Math.floor(Math.min(stock.balanceSheet.liabilities * 0.5 / price, stock.totalShares * 0.3));
    if (!(price > 0) || total <= 0) return null;

    if (getRescueOffer(stock.symbol)) finalizeRescueOffering(stock); // poprzednia emisja tej spółki zamknięta przed nową
    const offer = { symbol: stock.symbol, price, total, remaining: total, fundReserved: 0, closed: false, quarter: typeof macro === 'object' ? macro.quarter : 0 };
    logEvent(`📢 EMISJA RATUNKOWA: ${stock.name} oferuje ${total.toLocaleString('pl-PL')} nowych akcji po ${formatZl(price, 2)}, aby spłacić długi.`, 'market');

    // Fundusz: pula zarezerwowana (do 40%) — gracz decyduje w oknie/poczcie.
    const fundEligible = playerFund && canAccessExchange(stock.exchange);
    if (fundEligible) offer.fundReserved = Math.floor(total * 0.4);
    let forBots = total - offer.fundReserved;
    for (const ai of [...aiCompetitors].sort(() => Math.random() - 0.5)) {
        if (forBots <= 0) break;
        const bought = aiDecideOnRescueOffer(ai, offer, Math.ceil(forBots * getRandomInRange(0.2, 0.6)));
        if (bought > 0) logEvent(`[AI] ${ai.name} obejmuje ${bought.toLocaleString('pl-PL')} akcji z emisji ratunkowej ${stock.symbol}.`, 'market');
        forBots -= bought;
    }

    if (offer.fundReserved > 0) {
        rescueOffers[stock.symbol] = offer;
        addMail({
            sender: CORPORATION_SENDER,
            subject: `Emisja ratunkowa: ${stock.name}`,
            body: `${stock.name} oferuje funduszowi do ${offer.fundReserved.toLocaleString('pl-PL')} nowych akcji po ${formatZl(price, 2)} (dyskonto do rynku). Pieniądze idą na spłatę długu.`,
            importance: 2, symbol: stock.symbol, action: { type: 'rescue', symbol: stock.symbol }
        });
        if ((playerPortfolio[stock.symbol]?.shares || 0) > 0) openRescueOfferingModal(stock.symbol);
    } else {
        finalizeRescueOffering(stock);
    }
    return offer;
}

/** Fundusz obejmuje akcje z emisji ratunkowej spółki `symbol` (zawsze tej z maila/okna, nie „bieżącej” oferty). */
function acceptRescueOffer(symbol, quantity) {
    const offer = getRescueOffer(symbol);
    const stock = offer && stocks.find(s => s.symbol === symbol);
    if (!stock) { showToast('Oferta emisji ratunkowej jest zamknięta.', 'default'); return false; }
    quantity = Math.min(Math.floor(Number(quantity) || 0), offer.fundReserved);
    if (!(quantity > 0)) { showToast('Podaj liczbę akcji.', 'warning'); return false; }
    if (playerCash < quantity * offer.price) { showToast('Za mało gotówki funduszu.', 'error'); return false; }
    const before = playerPortfolio[symbol]?.shares || 0;
    const issued = issueRescueShares(stock, 'player', quantity, offer.price);
    if (!(issued > 0) || (playerPortfolio[symbol]?.shares || 0) - before !== issued) { showToast('Nie udało się objąć akcji.', 'error'); return false; }
    logEvent(`📢 Fundusz obejmuje ${issued.toLocaleString('pl-PL')} akcji ${stock.name} (${symbol}) z emisji ratunkowej po ${formatZl(offer.price)} — razem ${formatZl(issued * offer.price, 0)}.`, 'review');
    changeReputation('player', stock.symbol, 10);
    finalizeRescueOffering(stock);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    if (typeof displayStocks === 'function' && typeof getCurrentInputValues === 'function') displayStocks(getCurrentInputValues()); // filtr „Moje”
    closeRescueOfferingModal();
    return issued;
}

function declineRescueOffer(symbol) {
    const offer = getRescueOffer(symbol);
    const stock = offer && stocks.find(s => s.symbol === symbol);
    if (stock) {
        if ((playerPortfolio[stock.symbol]?.shares || 0) > 0) changeReputation('player', stock.symbol, -5);
        finalizeRescueOffering(stock);
    }
    closeRescueOfferingModal();
}

/** Co kwartał: oferty bez decyzji wygasają po RESCUE_OFFER_QUARTERS (emisja zamknięta bez funduszu). */
function expireRescueOffers() {
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    for (const [symbol, offer] of Object.entries(rescueOffers)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (!stock || stock.isBankrupt) { delete rescueOffers[symbol]; continue; }
        if (!offer.closed && quarter - (offer.quarter || 0) > RESCUE_OFFER_QUARTERS) {
            logEvent(`📢 Oferta emisji ratunkowej ${stock.name} dla funduszu wygasła bez decyzji.`, 'review');
            finalizeRescueOffering(stock);
        }
    }
}

function finalizeRescueOffering(stock) {
    if (rescueOffers[stock.symbol]) { rescueOffers[stock.symbol].closed = true; delete rescueOffers[stock.symbol]; }
    const raised = stock.rescueRaised || 0;
    stock.rescueRaised = 0;
    if (raised > 0) stock.financialHealth = Math.min(5, (Number(stock.financialHealth) || 0) + 0.5);
    logEvent(`📢 Emisja ratunkowa ${stock.name} zamknięta: zebrano ${formatZl(raised, 0)} na spłatę długu.`, 'review');
}

// #################################################################################
// ## governance.js
// #################################################################################

// governance.js — Fundusz jako aktywny akcjonariusz (etap G3)
//
// Każda spółka ma walne zgromadzenie raz w roku gry (terminy rozłożone po kwartałach). Kwartał przed
// terminem powstaje porządek obrad; fundusz z udziałem ≥ 5% dostaje mail i ustawia głosy w oknie
// „Walne zgromadzenia”. Głosy liczone wg akcji; rozproszeni akcjonariusze głosują przy frekwencji 40–70%.
// Udział gracza (mail, głos, wnioski, kampanie) tylko jako większościowiec (> 50%); poniżej fundusz
// głosuje „za” w tle. Rada nadzorcza: ≥ 20% → 1 miejsce, ≥ 35% → 2, > 50% → większość (wgląd).

const AGM_CONTROL_THRESHOLD = 0.5; // gracz bierze udział w walnym tylko jako większościowiec

function canFundControlAgm(stock) {
    return Boolean(playerFund) && getFundStakePct(stock) > AGM_CONTROL_THRESHOLD;
}
const AGM_HISTORY_LIMIT = 4;
const ACTIVIST_PROPOSALS = {
    raiseDividend: { label: 'Wyższa dywidenda', desc: 'Polityka dywidendy o stopień wyżej.' },
    replaceCeo: { label: 'Zmiana prezesa', desc: 'Odwołanie prezesa i powołanie nowego.' },
    buyback: { label: 'Skup akcji własnych', desc: 'Spółka skupuje do 10% gotówki w akcjach z rynku.' },
    sellCompany: { label: 'Sprzedaż spółki', desc: 'Zarząd szuka nabywcy (przyjazne przejęcie z premią).' }
};

// =================================================================================
// STAN I RADA NADZORCZA
// =================================================================================

/** Spółka krajowa z `stocks` albo zagraniczna po symbolu „ID.KRAJ” (walne na wspólnym kodzie). */
function findGovernedStock(symbol) { return stocks.find(s => s.symbol === symbol) || getForeignIssuerBySymbol(symbol); }

function ensureGovernance(stock) {
    if (!stock.governance) {
        stock.governance = { quartersToAgm: 2 + Math.floor(Math.random() * 4), // pierwsze walne nie w 1. kwartale
            pendingAgm: null, proposals: [], history: [] };
    }
    return stock.governance;
}

function isGovernedCompany(stock) {
    return stock && !stock.assetType && !stock.isBankrupt && stock.totalShares > 0;
}

/** Miejsca funduszu w radzie nadzorczej wg udziału. */
function getBoardSeats(stock) {
    const pct = getFundStakePct(stock);
    if (pct > 0.5) return { seats: 3, label: 'większość rady (3/5)' };
    if (pct >= 0.35) return { seats: 2, label: '2 miejsca w radzie' };
    if (pct >= 0.2) return { seats: 1, label: '1 miejsce w radzie' };
    return { seats: 0, label: 'brak miejsc' };
}

/** Wgląd członka rady: prognoza wyniku i plany inwestycyjne. */
function getBoardInsight(stock) {
    if (getBoardSeats(stock).seats < 1) return null;
    const last = Number(stock.quarterlyEarnings) || 0;
    const health = Number(stock.financialHealth) || 0;
    const toPlnMult = isForeignShare(stock) ? toPln(1, stock.currency) : 1; // walne obcej spółki: prognoza w złotych
    const forecast = (last * (1 + health * 0.04) + (stock.operatingInvestments || []).reduce((sum, op) => sum + op.cost * op.roi / 4 * op.efficiency, 0) * 0.5) * toPlnMult;
    const plans = [
        ...(stock.activeInvestments || []).map(item => `w toku: ${item.name}`),
        ...(typeof getInvestmentCatalogForCompany === 'function' && !isForeignShare(stock)
            ? getInvestmentCatalogForCompany(stock).filter(inv => inv.minDevLevel <= (stock.departments?.development?.level || 0) && !hasCompanyInvestmentInProgress(stock, inv.id)).slice(0, 2).map(inv => `rozważa: ${inv.name}`)
            : [])
    ];
    return { forecast, plans };
}

// =================================================================================
// PORZĄDEK OBRAD
// =================================================================================

function buildAgmAgenda(stock) {
    const gov = ensureGovernance(stock);
    const health = Number(stock.financialHealth) || 0;
    const items = [];
    const order = DIVIDEND_POLICY_ORDER;
    const current = Math.max(0, order.indexOf(stock.dividendPolicy || 'Growth'));
    // Zarząd proponuje politykę dopasowaną do kondycji (audyt A4: stałe „+1” prowadziło do dryfu wypłat w górę).
    // „Pełna (100%)” zostaje tylko tam, gdzie już obowiązuje i spółka jest w świetnej kondycji.
    const target = health >= 3 ? 'Aggressive' : health >= 1 ? 'Balanced' : health <= -1 ? 'Growth' : order[current];
    const keepTotal = order[current] === 'Total' && health >= 3;
    const step = Math.sign(order.indexOf(target) - current); // najwyżej o jeden stopień na walnym
    const proposedPolicy = keepTotal ? 'Total' : order[Math.max(0, Math.min(order.length - 1, current + step))];
    items.push({ id: 'dividend', kind: 'board', type: 'dividend', policy: proposedPolicy, label: `Polityka dywidendy: ${DIVIDEND_POLICIES[proposedPolicy].label}` });
    items.push({ id: 'discharge', kind: 'board', type: 'discharge', label: `Absolutorium dla prezesa ${stock.ceo?.name || ''}`.trim() });
    const capital = getCapitalAgmProposal(stock);
    if (capital) items.push(capital);
    if (isForeignShare(stock)) items.push(...getForeignAgmItems(stock)); // wynagrodzenia, zmiana prezesa

    for (const proposal of gov.proposals) {
        items.push({ id: `p-${proposal.type}`, kind: 'activist', type: proposal.type, by: 'player', label: `Wniosek funduszu: ${ACTIVIST_PROPOSALS[proposal.type].label}` });
    }
    gov.proposals = [];
    for (const item of items) item.playerVote = 'for'; // domyślnie „za wnioskiem”
    return items;
}

/** 0.15.0.1 C4: wycena akcji spółki na tle rynku — drogie (premia rynku > +10% albo kurs ≥ 1,3 × wartości godziwej) lub tanie. */
function getShareValuationMood(stock) {
    const regime = typeof getMarketRegime === 'function' ? getMarketRegime(isForeignShare(stock) && marketRegimes[stock.country] ? stock.country : 'home') : null;
    const premium = Number(regime?.premium) || 0;
    const bearish = regime?.phase === 'bear' || regime?.phase === 'capitulation'; // okno emisji zamknięte
    const fair = typeof getDisplayedFairValue === 'function' ? getDisplayedFairValue(stock) : null;
    const ratio = fair > 0 ? stock.price / fair : 1;
    // W Bessie i Kapitulacji okno emisji jest zamknięte (premia goni cel z opóźnieniem, więc sama premia nie wystarcza).
    return { expensive: !bearish && (premium > 0.10 || ratio >= 1.3), cheap: premium < -0.15 || ratio <= 0.75, bearish };
}

/**
 * Uchwała kapitałowa zarządu (najwyżej jedna na walne): emisja przy braku gotówki (rzadziej, gdy akcje tanie) albo drogich akcjach
 * (×2 w sektorze bańki), skup przy nadmiarze gotówki (gdy akcje nie są drogie) albo tanich akcjach.
 */
function getCapitalAgmProposal(stock) {
    const cap = getMarketCapValue(stock);
    const { expensive, cheap, bearish } = getShareValuationMood(stock);
    const issue = reason => ({ id: 'issue', kind: 'board', type: 'issue', reason, label: reason === 'expensive' ? 'Emisja 10% nowych akcji przy wysokiej wycenie' : 'Emisja 10% nowych akcji' });
    const buyback = reason => ({ id: 'buyback', kind: 'board', type: 'buyback', reason, label: reason === 'cheap' ? 'Program skupu akcji własnych przy niskiej wycenie' : 'Program skupu akcji własnych' });
    if (stock.cash < cap * 0.03 && Math.random() < (cheap || bearish ? 0.2 : 0.5)) return issue('cash'); // przy tanich akcjach zarząd woli kredyt niż emisję
    if (expensive && Math.random() < (typeof isCompanyInSectorBubble === 'function' && isCompanyInSectorBubble(stock) ? 0.8 : 0.4)) return issue('expensive'); // decyzja użytkownika: 30% → 40% (przy 37% rozwodnienie nadal ≈ 0)
    if (stock.cash > cap * 0.15 && !expensive && Math.random() < 0.25) return buyback('cash'); // 0.15.0.1: 50% → 25% (decyzja użytkownika; rozwodnienie rynku ≈ 0 przy 30–50%)
    if (cheap && stock.cash > cap * 0.05 && Math.random() < 0.3) return buyback('cheap'); // decyzja użytkownika: 40% → 30% (rozwodnienie ≈ 0)
    return null;
}

/** Walne kwartał po porządku obrad: czy powód uchwały kapitałowej nadal obowiązuje (inaczej zarząd ją wycofuje). */
function isCapitalAgmItemValid(stock, item) {
    if (!['issue', 'buyback'].includes(item.type) || !item.reason || item.by) return true;
    const cap = getMarketCapValue(stock);
    const { expensive, cheap, bearish } = getShareValuationMood(stock);
    if (item.reason === 'expensive') return expensive;
    if (item.reason === 'cheap') return cheap && stock.cash > cap * 0.05;
    if (item.type === 'issue') return stock.cash < cap * 0.03 && !cheap && !bearish; // przy tanich akcjach / w bessie zarząd woli kredyt
    return stock.cash > cap * 0.15 && !expensive;
}

/** Emisja przy wysokiej / skup przy niskiej wycenie w spółce z portfela: wpis w pasku newsów i hasło Akademii. */
function noteCapitalCycleResolution(stock, item) {
    if (!['expensive', 'cheap'].includes(item.reason) || !((playerPortfolio?.[stock.symbol]?.shares || 0) > 0)) return;
    if (typeof pushNews === 'function') pushNews(item.type === 'issue' ? `${stock.name} emituje 10% akcji przy wysokiej wycenie` : `${stock.name} skupuje akcje przy niskiej wycenie`, stock.symbol);
    if (typeof unlockAcademyEntry === 'function') unlockAcademyEntry('emisje_skupy');
}

function createPendingAgm(stock) {
    const gov = ensureGovernance(stock);
    gov.pendingAgm = { items: buildAgmAgenda(stock) };
    if (canFundControlAgm(stock)) {
        addMail({
            sender: CORPORATION_SENDER,
            subject: `🗳️ Walne zgromadzenie ${stock.name} w przyszłym kwartale`,
            body: `Porządek obrad: ${gov.pendingAgm.items.map(item => item.label).join('; ')}. Fundusz ma ${(getFundStakePct(stock) * 100).toFixed(1)}% głosów — ustaw głosy przed terminem (domyślnie „za”).`,
            importance: 2, symbol: stock.symbol, action: { type: 'agm', symbol: stock.symbol }
        });
    }
}

// =================================================================================
// GŁOSOWANIE
// =================================================================================

/** Prawdopodobieństwo głosu „za” danego akcjonariusza w danej sprawie. */
function getVoteForProbability(holder, item, stock) {
    const health = Number(stock.financialHealth) || 0;
    const clamp = value => Math.max(0.02, Math.min(0.98, value));
    // B3: Gwardia głosuje według relacji z graczem w spółkach z udziałem funduszu.
    if (holder.entity?.isGuard && typeof getRelation === 'function' && getFundStakePct(stock) >= 0.05) {
        const relation = getRelation(holder.entity.id);
        if (relation <= RELATION_HOSTILE) return item.kind === 'board' ? 0.1 : 0.02;
        if (relation >= RELATION_FRIENDLY && item.kind === 'activist') return 0.85;
    }
    if (holder.kind === 'company' && isForeignShare(stock)) return item.kind === 'board' ? 1 : 0; // 0.16.12 D1/D2: matka obcej spółki zależnej głosuje za zarządem
    if (holder.kind === 'company' && stock.isSubsidiaryOf === holder.entity?.symbol && isPuppetOf(stock, holder.entity.symbol)) {
        return item.kind === 'board' ? 1 : (item.by === holder.entity.symbol ? 1 : 0); // 0.15.1 M9: matka z marionetką forsuje walne
    }
    if (item.kind === 'board') {
        if (holder.kind === 'insiders') return 1;
        if (holder.kind === 'state' || holder.kind === 'city') return 0.9;
        let p = 0.55 + health * 0.08;
        const personality = holder.entity?.personality;
        if (item.type === 'dividend' && personality === 'dividend_chaser') p += 0.25;
        if (item.type === 'issue') p -= 0.15;
        return clamp(p);
    }
    // Wnioski akcjonariuszy (aktywizm)
    if (holder.kind === 'insiders') return 0;
    if ((holder.kind === 'state' || holder.kind === 'city') && item.type === 'sellCompany') return 0;
    let p = 0.3 - health * 0.06;
    if (item.type === 'raiseDividend' && holder.entity?.personality === 'dividend_chaser') p += 0.3;
    if (item.type === 'replaceCeo' && stock.ceo?.traits?.some(t => t.id === 'oddany')) p -= 0.1;
    if (item.campaign) p += 0.2 + Math.max(-0.1, Math.min(0.2, (stock.reputation?.player || 0) / 250));
    return clamp(p);
}

/** Liczy głosy w jednej sprawie; zwraca { for, against, abstain, passed }. */
function tallyAgmItem(stock, item, holders, retailVoting) {
    const votes = { for: 0, against: 0, abstain: 0 };
    for (const holder of holders) {
        if (holder.kind === 'wallet') { votes.abstain += holder.shares; continue; }
        let choice;
        if (holder.kind === 'player') choice = canFundControlAgm(stock) ? item.playerVote || 'for' : 'for';
        else {
            const roll = Math.random();
            choice = roll < 0.05 ? 'abstain' : roll < 0.05 + 0.95 * getVoteForProbability(holder, item, stock) ? 'for' : 'against';
        }
        votes[choice] += holder.shares;
    }
    const pRetail = getVoteForProbability({ kind: 'retail' }, item, stock);
    votes.for += retailVoting * pRetail;
    votes.against += retailVoting * (1 - pRetail);
    return { ...votes, passed: votes.for > votes.against };
}

function holdAgm(stock) {
    const gov = ensureGovernance(stock);
    const agm = gov.pendingAgm;
    gov.pendingAgm = null;
    if (!agm?.items?.length) return null;
    const withdrawn = agm.items.filter(item => !isCapitalAgmItemValid(stock, item));
    if (withdrawn.length) {
        agm.items = agm.items.filter(item => !withdrawn.includes(item));
        logEvent(`🗳️ Zarząd ${stock.name} wycofuje z porządku obrad: ${withdrawn.map(item => item.label).join('; ')} — zmieniła się wycena albo sytuacja spółki.`, 'company');
        if (!agm.items.length) return null;
    }

    const holders = getShareholders(stock);
    const listed = holders.reduce((sum, holder) => sum + holder.shares, 0);
    const retail = Math.max(0, stock.totalShares - listed);
    const turnoutRetail = 0.4 + Math.random() * 0.3;
    const retailVoting = retail * turnoutRetail;
    const turnout = (listed + retailVoting) / stock.totalShares;

    const results = agm.items.map(item => {
        const tally = tallyAgmItem(stock, item, holders, retailVoting);
        const effect = tally.passed ? applyAgmResolution(stock, item) : '';
        return { label: item.label, kind: item.kind, type: item.type, by: item.by || null, playerVote: item.playerVote, ...tally, effect };
    });

    if (stock.spinoff && results.some(r => r.type === 'spinoff' && !r.passed)) { // 0.14 T4: walne odrzuca wydzielenie
        stock.spinoff = null;
        logEvent(`🗳️ Walne ${stock.name} odrzuca wydzielenie spółki córki.`, 'company');
    }
    for (const result of results.filter(r => r.by === 'player')) {
        changeReputation('player', stock.symbol, result.passed ? 8 : -4);
        if (playerFund) playerFund.trust = Math.max(0, Math.min(100, playerFund.trust + (result.passed ? 1 : -0.5)));
    }

    const record = { at: typeof getMailClockMs === 'function' ? getMailClockMs() : Date.now(), turnout, results };
    gov.history.unshift(record);
    gov.history.length = Math.min(gov.history.length, AGM_HISTORY_LIMIT);

    if (canFundControlAgm(stock)) {
        addMail({
            sender: CORPORATION_SENDER,
            subject: `🗳️ Uchwały walnego zgromadzenia ${stock.name}`,
            body: `Frekwencja ${(turnout * 100).toFixed(0)}%. ` + results.map(r => `${r.label}: ${r.passed ? 'PRZYJĘTA' : 'odrzucona'} (za ${(r.for / Math.max(1, r.for + r.against) * 100).toFixed(0)}%)${r.effect ? ` — ${r.effect}` : ''}`).join('; ') + '.',
            importance: 2, symbol: stock.symbol, action: { type: 'agm', symbol: stock.symbol }
        });
    }
    if (!isForeignShare(stock) || getGdrHeld(stock) > 0) logEvent(`🗳️ Walne zgromadzenie ${stock.name}: ${results.filter(r => r.passed).length}/${results.length} uchwał przyjętych (frekwencja ${(turnout * 100).toFixed(0)}%).`, 'company');
    return record;
}

/** Skutek przyjętej uchwały; zwraca krótki opis. */
function applyAgmResolution(stock, item) {
    if (isForeignShare(stock) && ['buyback', 'issue', 'replaceCeo', 'sellCompany', 'pay'].includes(item.type)) return applyForeignAgmResolution(stock, item);
    switch (item.type) {
        case 'dividend':
            if (item.policy !== stock.dividendPolicy) setCompanyDividendPolicy(stock, item.policy);
            return '';
        case 'discharge':
            return '';
        case 'spinoff': { // 0.14 T4: wydzielenie po uchwale walnego
            const child = typeof executeSpinoff === 'function' ? executeSpinoff(stock) : null;
            return child ? `nowa spółka: ${child.name} (${child.symbol})` : 'wydzielenie odłożone';
        }
        case 'raiseDividend': {
            const order = DIVIDEND_POLICY_ORDER;
            const next = order[Math.min(order.length - 1, Math.max(0, order.indexOf(stock.dividendPolicy || 'Growth')) + 1)];
            setCompanyDividendPolicy(stock, next);
            return `nowa polityka: ${DIVIDEND_POLICIES[next].label}`;
        }
        case 'replaceCeo':
            replaceCeo(stock);
            return `nowy prezes: ${stock.ceo?.name || '—'}`;
        case 'buyback':
            noteCapitalCycleResolution(stock, item);
            return runBuyback(stock);
        case 'issue':
            noteCapitalCycleResolution(stock, item);
            return runAgmIssue(stock);
        case 'sellCompany': {
            const premium = 0.25;
            const buyer = stocks.filter(s => s !== stock && !s.assetType && !s.mergerProcess && !s.isBankrupt && !s.isSubsidiaryOf
                && s.cash >= getMarketCapValue(stock) * (1 + premium) * 1.1).sort((a, b) => b.cash - a.cash)[0];
            if (!buyer || stock.mergerProcess) return 'brak nabywcy';
            initiateMergerProcess(buyer, stock, 'przejęcie', 'cash', premium, { friendly: true });
            return `nabywca: ${buyer.name}`;
        }
    }
    return '';
}

function runBuyback(stock) {
    const shares = Math.floor(Math.min(getAvailableShares(stock), Math.max(0, stock.cash) * 0.1 / Math.max(0.01, stock.price)));
    if (shares <= 0) return 'brak akcji do skupu';
    const cost = shares * stock.price;
    adjustCompanyCash(stock, -cost);
    adjustBalanceSheet(stock, { assets: -cost, retainedEarnings: -cost });
    stock.totalShares -= shares;
    stock.price *= 1.02;
    return `skupiono ${shares.toLocaleString('pl-PL')} akcji`;
}

function runAgmIssue(stock) {
    const shares = Math.floor(stock.totalShares * 0.1);
    const amount = shares * stock.price * 0.95;
    if (shares <= 0) return '';
    stock.maxShares = Math.max(Number(stock.maxShares) || 0, stock.totalShares) + shares;
    stock.totalShares += shares;
    adjustCompanyCash(stock, amount);
    adjustBalanceSheet(stock, { assets: amount });
    if (stock.balanceSheet) stock.balanceSheet.shareCapital = (Number(stock.balanceSheet.shareCapital) || 0) + amount;
    stock.price *= 0.97;
    return `wyemitowano ${shares.toLocaleString('pl-PL')} akcji`;
}

/** Co kwartał (main.js): odliczanie, porządek obrad kwartał wcześniej, potem zgromadzenie. */
function processGovernanceQuarter() {
    for (const stock of [...stocks, ...getForeignGovernedList()]) {
        if (!isGovernedCompany(stock)) continue;
        const gov = ensureGovernance(stock);
        gov.quartersToAgm--;
        if (gov.quartersToAgm <= 0) {
            if (!gov.pendingAgm) createPendingAgm(stock);
            holdAgm(stock);
            gov.quartersToAgm = 4;
        } else if (gov.quartersToAgm === 1 && !gov.pendingAgm) {
            createPendingAgm(stock);
        }
    }
}

// =================================================================================
// DECYZJE FUNDUSZU: głos, wniosek, kampania
// =================================================================================

function setAgmVote(symbol, itemId, vote) {
    const stock = findGovernedStock(symbol);
    const item = stock?.governance?.pendingAgm?.items.find(i => i.id === itemId);
    if (!item || !['for', 'against', 'abstain'].includes(vote) || !canFundControlAgm(stock)) return false;
    item.playerVote = vote;
    return true;
}

function submitShareholderProposal(symbol, type) {
    const stock = findGovernedStock(symbol);
    if (!stock || !ACTIVIST_PROPOSALS[type]) return false;
    if (!canFundControlAgm(stock)) { showToast('Wnioski na walne zgłasza akcjonariusz większościowy (> 50%).', 'warning'); return false; }
    const gov = ensureGovernance(stock);
    const agenda = gov.pendingAgm?.items || [];
    if (agenda.some(i => i.by === 'player') || gov.proposals.length) { showToast('Fundusz zgłosił już wniosek na to zgromadzenie.', 'warning'); return false; }
    const item = { id: `p-${type}`, kind: 'activist', type, by: 'player', label: `Wniosek funduszu: ${ACTIVIST_PROPOSALS[type].label}`, playerVote: 'for' };
    if (gov.pendingAgm) gov.pendingAgm.items.push(item);
    else gov.proposals.push({ type });
    logEvent(`📝 Fundusz zgłasza wniosek do walnego ${stock.name}: ${ACTIVIST_PROPOSALS[type].label}.`, 'review');
    showToast('Wniosek zgłoszony na najbliższe walne.', 'success');
    refreshGovernanceView(symbol);
    return true;
}

function getCampaignCost(stock) {
    return Math.round(Math.max(2000, getMarketCapValue(stock) * (isForeignShare(stock) ? toPln(1, stock.currency) : 1) * 0.002)); // zawsze w złotych
}

/** Kampania o głosy dla wniosku funduszu — koszt z funduszu, zwiększa poparcie botów i drobnych. */
function runProxyCampaign(symbol, itemId) {
    const stock = findGovernedStock(symbol);
    const item = stock?.governance?.pendingAgm?.items.find(i => i.id === itemId);
    if (!item || item.by !== 'player' || !canFundControlAgm(stock)) { showToast('Kampanię prowadzi większościowiec dla wniosku funduszu na zaplanowanym walnym.', 'warning'); return false; }
    if (item.campaign) { showToast('Kampania już trwa.', 'default'); return false; }
    const cost = getCampaignCost(stock) * (isForeignShare(stock) ? toPln(1, stock.currency) : 1);
    if (playerCash < cost) { showToast(`Kampania kosztuje ${formatZl(cost, 0)} — za mało gotówki funduszu.`, 'error'); return false; }
    playerCash -= cost;
    recordPayment('player-fund', 'external:doradcy_ma', cost, `Kampania o głosy ${symbol}`);
    item.campaign = true;
    logEvent(`📣 Fundusz prowadzi kampanię o głosy w ${stock.name} (${formatZl(cost, 0)}).`, 'review');
    if (typeof displayCash === 'function') displayCash();
    refreshGovernanceView(symbol);
    return true;
}
