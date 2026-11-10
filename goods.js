// =================================================================================
// 0.18.1 P1: REJESTR DÓBR I ŁAŃCUCHÓW (bez DOM i window; dane dla chains.js i chains_ui.js)
// =================================================================================
// Ogniwo grafu to jednostka „podsektor × kraj” (klucz `Sektor/Podsektor` albo `Sektor`). Dobro ma producenta (jednostki),
// odbiorców z udziałami popytu (plan serii, sekcja 4; „*” = reszta gospodarki) i klasę: M materiał, P półprodukt,
// K dobro kapitałowe (popyt = amortyzacja δ + rozbudowa), Z końcowe zwykłe, L końcowe luksusowe.
// Dobra spoza pilotażu są wpisane z `active: false` (0.18.2 tylko je włącza). Liczby startowe; stroi je bramka.

const GOOD_CLASSES = { M: 'materiał', P: 'półprodukt', K: 'dobro kapitałowe', Z: 'końcowe zwykłe', L: 'końcowe luksusowe' };
const CHAIN_LINK_KINDS = { mining: 'Wydobycie', processing: 'Przetwórstwo', factory: 'Fabryka', transport: 'Transport', distribution: 'Dystrybucja', consumption: 'Konsumpcja' };

/**
 * Dobro: id, name, cls, link (rodzaj ogniwa producenta), producers (jednostki; dla surowców z kontraktem także spółki z profilu surowcowego),
 * contract (id z COMMODITY_DEFS albo null), use (odbiorcy → udział popytu), delta (dla K), icon (symbol z UI_ICON_PATHS), active.
 */
const GOODS = [
    // --- materiały (wydobycie i rolnictwo) ---
    { id: 'iron_ore', name: 'Ruda żelaza', cls: 'M', link: 'mining', producers: ['Przemysł/Wydobycie'], contract: 'iron', use: { 'Przemysł/Hutnictwo': 0.9, '*': 0.1 }, icon: 'surowiec-iron', active: true },
    { id: 'copper', name: 'Miedź', cls: 'M', link: 'mining', producers: ['Przemysł/Wydobycie'], contract: 'copper', use: { 'Energia': 0.35, 'Chemia/Baterie': 0.20, 'Technologia': 0.20, 'Budowlany': 0.15, 'Mennica': 0.05, '*': 0.05 }, icon: 'surowiec-copper', active: true },
    { id: 'coal', name: 'Węgiel', cls: 'M', link: 'mining', producers: ['Przemysł/Wydobycie'], contract: 'coal', use: { 'Energia': 0.7, 'Przemysł/Hutnictwo': 0.25, '*': 0.05 }, icon: 'surowiec-coal', active: true },
    { id: 'oil', name: 'Ropa', cls: 'M', link: 'mining', producers: ['Energia/Rafinerie'], contract: 'oil', use: { 'Energia/Rafinerie': 0.9, '*': 0.1 }, icon: 'surowiec-oil', active: true },
    { id: 'gas', name: 'Gaz', cls: 'M', link: 'mining', producers: ['Energia/Gaz'], contract: 'gas', use: { 'Energia': 0.55, 'Chemia/Nawozy': 0.25, 'Chemia': 0.10, '*': 0.10 }, icon: 'surowiec-gas', active: true },
    { id: 'grain', name: 'Zboże', cls: 'M', link: 'mining', producers: ['Żywność/Rolnictwo'], contract: 'grain', use: { 'Żywność/Przetwórstwo spożywcze': 0.55, 'Alkohole': 0.20, 'Żywność': 0.15, '*': 0.10 }, icon: 'surowiec-grain', active: true },
    // --- półprodukty ---
    { id: 'steel', name: 'Stal', cls: 'P', link: 'processing', producers: ['Przemysł/Hutnictwo'], contract: null, use: { 'Motoryzacja': 0.25, 'Przemysł/Maszyny': 0.25, 'Budowlany': 0.20, 'Przemysł/Stocznie': 0.12, 'Obronność': 0.08, '*': 0.10 }, icon: 'huta', active: true },
    { id: 'fuel', name: 'Paliwa', cls: 'P', link: 'processing', producers: ['Energia/Rafinerie'], contract: null, use: { 'Transport i logistyka': 0.50, 'Żywność/Rolnictwo': 0.12, 'Przemysł': 0.18, 'Obronność': 0.08, '*': 0.12 }, icon: 'surowiec-oil', active: true },
    { id: 'chem', name: 'Półprodukty chemiczne', cls: 'P', link: 'processing', producers: ['Energia/Rafinerie'], contract: null, use: { 'Chemia/Chemia polimerowa': 0.30, 'Chemia/Farmacja': 0.20, 'Chemia/Nawozy': 0.20, 'Chemia': 0.30 }, icon: 'fabryka', active: true },
    { id: 'rubber', name: 'Guma', cls: 'P', link: 'processing', producers: ['Chemia/Chemia polimerowa'], contract: null, use: { 'Motoryzacja': 0.40, 'Przemysł/Maszyny': 0.25, 'Przemysł': 0.15, 'Medycyna': 0.10, '*': 0.10 }, icon: 'fabryka', active: true },
    { id: 'fertilizer', name: 'Nawozy', cls: 'P', link: 'processing', producers: ['Chemia/Nawozy'], contract: null, use: { 'Żywność/Rolnictwo': 0.9, '*': 0.1 }, icon: 'fabryka', active: true },
    // --- dobra kapitałowe (popyt = δ·K + rozbudowa) ---
    { id: 'machines', name: 'Maszyny', cls: 'K', link: 'factory', producers: ['Przemysł/Maszyny'], contract: null, delta: 0.02, use: { 'Przemysł': 0.30, 'Motoryzacja': 0.15, 'Chemia': 0.10, 'Żywność': 0.10, 'Przemysł/Stocznie': 0.08, 'Energia': 0.07, '*': 0.20 }, icon: 'fabryka', active: true },
    { id: 'ships', name: 'Statki', cls: 'K', link: 'factory', producers: ['Przemysł/Stocznie'], contract: null, delta: 0.01, use: { 'Transport i logistyka/Morski': 0.75, 'Rybołówstwo': 0.15, 'Obronność': 0.10 }, icon: 'statek', active: true },
    { id: 'trucks', name: 'Pojazdy użytkowe', cls: 'K', link: 'factory', producers: ['Motoryzacja'], contract: null, delta: 0.03, use: { 'Transport i logistyka/Lądowy': 0.45, 'Transport i logistyka': 0.15, 'Obronność': 0.10, 'Budowlany': 0.15, '*': 0.15 }, icon: 'transport-land', active: true },
    // --- końcowe ---
    { id: 'cars', name: 'Samochody osobowe', cls: 'Z', link: 'consumption', producers: ['Motoryzacja'], contract: null, use: { '#': 0.75, 'Usługi': 0.25 }, icon: 'transport-land', active: true },
    { id: 'food', name: 'Żywność', cls: 'Z', link: 'consumption', producers: ['Żywność/Przetwórstwo spożywcze', 'Żywność'], contract: null, use: { '#': 0.75, 'Usługi': 0.25 }, icon: 'kosz', active: true },
    { id: 'beer', name: 'Piwo', cls: 'Z', link: 'consumption', producers: ['Alkohole', 'Alkohole/Piwowarstwo i napoje'], contract: null, use: { '#': 0.75, 'Usługi': 0.25 }, icon: 'kosz', active: true },
    // --- 0.18.2+ (wpisane, wyłączone) ---
    { id: 'silver', name: 'Srebro', cls: 'M', link: 'mining', producers: ['Przemysł/Wydobycie'], contract: null, use: { 'Technologia': 0.45, 'Medycyna': 0.20, 'Mennica': 0.20, '#': 0.15 }, icon: 'surowiec-gold', active: true },
    { id: 'gold', name: 'Złoto', cls: 'M', link: 'mining', producers: ['Przemysł/Wydobycie'], contract: 'gold', use: { 'Mennica': 0.25, '#': 0.30, '*': 0.45 }, icon: 'surowiec-gold', active: true },
    { id: 'rare_earths', name: 'Ziemie rzadkie', cls: 'M', link: 'mining', producers: ['Przemysł/Wydobycie'], contract: null, use: { 'Technologia/Półprzewodniki': 0.45, 'Chemia/Baterie': 0.45, 'Obronność/Drony': 0.10 }, icon: 'kopalnia', active: true },
    { id: 'sulfur', name: 'Siarka', cls: 'M', link: 'mining', producers: ['Przemysł/Wydobycie'], contract: null, use: { 'Chemia': 0.40, 'Chemia/Nawozy': 0.30, 'Chemia/Farmacja': 0.15, 'Obronność': 0.15 }, icon: 'kopalnia', active: true },
    { id: 'uranium', name: 'Uran', cls: 'M', link: 'mining', producers: ['Przemysł/Wydobycie'], contract: 'uranium', use: { 'Energia/Energetyka jądrowa': 1 }, icon: 'surowiec-uranium', active: true },
    { id: 'wood', name: 'Drewno', cls: 'M', link: 'mining', producers: ['Przemysł/Leśnictwo'], contract: null, use: { 'Przemysł/Papiernie': 0.6, 'Budowlany': 0.3, 'Alkohole': 0.1 }, icon: 'lisc', active: true },
    { id: 'lumber', name: 'Tarcica', cls: 'P', link: 'processing', producers: ['Przemysł/Leśnictwo'], contract: null, use: { 'Budowlany': 1 }, icon: 'lisc', active: true },
    { id: 'paper', name: 'Papier', cls: 'P', link: 'processing', producers: ['Przemysł/Papiernie'], contract: null, use: { 'Mennica': 0.15, 'Media': 0.25, 'Chemia/Farmacja': 0.15, 'Edukacja': 0.10, 'Żywność/Słodycze': 0.25, '*': 0.10 }, icon: 'karteczka', active: true },
    { id: 'batteries', name: 'Baterie', cls: 'P', link: 'processing', producers: ['Chemia/Baterie'], contract: null, use: { 'Przemysł/Robotyka': 0.30, 'Obronność/Drony': 0.20, 'Medycyna/Sprzęt medyczny': 0.20, 'Motoryzacja': 0.30 }, icon: 'fabryka', active: true },
    { id: 'chips', name: 'Półprzewodniki', cls: 'P', link: 'processing', producers: ['Technologia/Półprzewodniki'], contract: null, use: { 'Technologia/Sztuczna inteligencja': 0.20, 'Gaming': 0.15, 'Przemysł/Robotyka': 0.15, 'Motoryzacja': 0.15, 'Obronność/Drony': 0.10, 'Media': 0.10, '*': 0.15 }, icon: 'fabryka', active: true },
    { id: 'power', name: 'Prąd', cls: 'P', link: 'processing', producers: ['Energia', 'Energia/Energetyka węglowa', 'Energia/Energetyka gazowa', 'Energia/Energetyka jądrowa', 'Energia/OZE'], contract: null, external: true, use: { '*': 1 }, icon: 'prad', active: true },
    { id: 'cash', name: 'Pieniądz gotówkowy', cls: 'P', link: 'processing', producers: ['Mennica'], contract: null, use: { 'Bankowość': 0.8, '*': 0.2 }, icon: 'moneta', get active() { return typeof MINT_ACTIVE !== 'undefined' && MINT_ACTIVE; } },
    { id: 'planes', name: 'Samoloty', cls: 'K', link: 'factory', producers: ['Przemysł/Przemysł lotniczy'], contract: null, delta: 0.012, use: { 'Transport i logistyka/Lotnictwo': 0.8, 'Obronność': 0.2 }, icon: 'samolot', active: true },
    { id: 'robots', name: 'Roboty', cls: 'K', link: 'factory', producers: ['Przemysł/Robotyka'], contract: null, delta: 0.03, use: { 'Przemysł': 0.5, 'Motoryzacja': 0.3, 'Przemysł/Wydobycie': 0.2 }, icon: 'fabryka', active: true },
    { id: 'med_equipment', name: 'Sprzęt medyczny', cls: 'K', link: 'factory', producers: ['Medycyna/Sprzęt medyczny'], contract: null, delta: 0.02, use: { 'Medycyna': 1 }, icon: 'fabryka', active: true },
    { id: 'drugs', name: 'Leki', cls: 'Z', link: 'consumption', producers: ['Chemia/Farmacja', 'Medycyna', 'Medycyna/Biotechnologia'], contract: null, use: { '#': 0.55, 'Usługi': 0.15, 'Medycyna': 0.3 }, icon: 'kosz', active: true },
    { id: 'tea', name: 'Herbata', cls: 'Z', classByCountry: { asia: 'Z', other: 'L' }, link: 'consumption', producers: ['Żywność/Herbata'], contract: null, use: { '#': 1 }, icon: 'kosz', active: true }, // 0.18.3 M2: w Azji zwykła, poza nią luksus
    { id: 'luxury', name: 'Dobra luksusowe', cls: 'L', link: 'consumption', producers: ['Alkohole', 'Żywność/Słodycze', 'Dobra konsumpcyjne'], // 0.18.3 M2: wino, whiskey, słodycze, auta i jachty luksusowe
      contract: null, use: { '#': 1 }, icon: 'kosz', active: true }
];
/** 0.18.2 G7: Mennica (papier, maszyny, złoto, srebro, miedź → gotówka dla banków) — eksperyment z wyłącznikiem; jednostkę „Mennica” dodaje adapter (core.js). */
let MINT_ACTIVE = false;
const GOOD_BY_ID = Object.fromEntries(GOODS.map(g => [g.id, g]));
const CHAIN_ASIA = ['JP', 'CN', 'TW', 'IN'];
/** Klasa dobra w kraju (herbata: Z w Azji, L poza nią). */
function getGoodClass(good, country) { return good.classByCountry ? good.classByCountry[CHAIN_ASIA.includes(country) ? 'asia' : 'other'] : good.cls; }
/** 0.18.3 M3: substytucja i R&D — technologie spółek ogniwa (średni poziom badań) obniżają udział wsadu stopniowo, z limitem rocznej zmiany. */
const CHAIN_SUBSTITUTION = {
    'Motoryzacja': { steel: { name: 'kompozyty zamiast stali', perLevel: 0.06, max: 0.30 } },
    'Przemysł/Przemysł lotniczy': { steel: { name: 'kompozyty zamiast stali', perLevel: 0.06, max: 0.30 } },
    'Przemysł/Maszyny': { steel: { name: 'lżejsze konstrukcje', perLevel: 0.04, max: 0.20 } },
    'Chemia/Chemia polimerowa': { chem: { name: 'recykling tworzyw', perLevel: 0.04, max: 0.20 } }
};
function getActiveGoods() { return GOODS.filter(g => g.active); }

/**
 * Receptury: udział wsadu w kosztach odbiorcy (przychód × udział = wartość wsadu na starcie). Dla dóbr K to udział amortyzacji i rozbudowy.
 * Klucz to jednostka odbiorcy; najbardziej szczegółowy pasujący klucz wygrywa (podsektor przed sektorem).
 */
const CHAIN_RECIPES = {
    'Przemysł/Hutnictwo': { iron_ore: 0.30, coal: 0.10, machines: 0.03 },
    'Energia/Rafinerie': { oil: 0.60 },
    'Energia/Energetyka jądrowa': { uranium: 0.20, machines: 0.02 },
    'Chemia/Chemia polimerowa': { chem: 0.30, machines: 0.02 },
    'Chemia/Nawozy': { gas: 0.25, chem: 0.10, sulfur: 0.04 },
    'Chemia/Farmacja': { chem: 0.12, sulfur: 0.03, paper: 0.02 },
    'Chemia': { chem: 0.20, gas: 0.05 },
    'Przemysł/Maszyny': { steel: 0.25, rubber: 0.04, machines: 0.03 },
    'Przemysł/Stocznie': { steel: 0.30, machines: 0.06 },
    'Przemysł': { steel: 0.12, rubber: 0.03, fuel: 0.04, machines: 0.04 },
    'Motoryzacja': { steel: 0.15, rubber: 0.05, machines: 0.04 },
    'Budowlany': { steel: 0.08, lumber: 0.05, trucks: 0.02 },
    'Obronność': { steel: 0.08, fuel: 0.03, ships: 0.01, trucks: 0.02, chips: 0.03, sulfur: 0.02, planes: 0.02 },
    'Żywność/Rolnictwo': { fertilizer: 0.10, fuel: 0.05, machines: 0.03 },
    'Żywność/Przetwórstwo spożywcze': { grain: 0.20, machines: 0.02 },
    'Żywność': { grain: 0.10, machines: 0.02 },
    'Alkohole': { grain: 0.10 },
    'Transport i logistyka/Morski': { fuel: 0.15, ships: 0.04 },
    'Transport i logistyka/Lądowy': { fuel: 0.18, trucks: 0.05 },
    'Transport i logistyka': { fuel: 0.15, trucks: 0.02 },
    'Rybołówstwo': { fuel: 0.08, ships: 0.03 },
    'Medycyna': { drugs: 0.15, med_equipment: 0.04, rubber: 0.02 },
    'Energia': { machines: 0.02, copper: 0.03 },
    // 0.18.2 G1–G5: surowce, chemia i papier, przemysł i technologia, obronność i zdrowie
    'Przemysł/Leśnictwo': { fuel: 0.05, machines: 0.03 },
    'Przemysł/Papiernie': { wood: 0.30, machines: 0.03 },
    'Chemia/Baterie': { copper: 0.15, rare_earths: 0.15, chem: 0.10 },
    'Technologia/Półprzewodniki': { rare_earths: 0.08, silver: 0.04, chem: 0.05, machines: 0.05 },
    'Przemysł/Przemysł lotniczy': { steel: 0.10, rubber: 0.04, chips: 0.05, machines: 0.04 },
    'Przemysł/Robotyka': { steel: 0.06, chips: 0.08, batteries: 0.06 },
    'Medycyna/Sprzęt medyczny': { rubber: 0.05, steel: 0.04, silver: 0.02, batteries: 0.04, chips: 0.04 },
    'Technologia/Sztuczna inteligencja': { chips: 0.08 },
    'Technologia': { chips: 0.04, copper: 0.02 },
    'Gaming': { chips: 0.05 },
    'Media': { paper: 0.05, chips: 0.02 },
    'Obronność/Drony': { chips: 0.08, batteries: 0.08, rare_earths: 0.02 },
    'Transport i logistyka/Lotnictwo': { fuel: 0.20, planes: 0.04 },
    'Usługi': { food: 0.08, cars: 0.05, beer: 0.03, drugs: 0.02 }, // 0.18.2 G7: handel jako ogniwo dystrybucji dóbr końcowych
    'Mennica': { paper: 0.20, machines: 0.05, gold: 0.15, silver: 0.10, copper: 0.10 }
};

/** Łańcuchy do widoku (kolumny ogniw z makiety 13_lancuch_018: wydobycie → przetwórstwo → fabryka → transport → dystrybucja → konsumpcja). */
const CHAINS = {
    metals: { name: 'Metale → motoryzacja i stocznie', icon: 'huta', goods: ['iron_ore', 'coal', 'steel', 'machines', 'ships', 'trucks', 'cars'], active: true },
    oil: { name: 'Ropa i gaz → paliwa i chemia', icon: 'surowiec-oil', goods: ['oil', 'gas', 'fuel', 'chem', 'rubber', 'fertilizer'], active: true },
    food: { name: 'Zboże → żywność', icon: 'kosz', goods: ['fertilizer', 'grain', 'food', 'beer', 'tea', 'luxury'], active: true },
    // 0.18.2: pełny graf
    paper: { name: 'Drewno → papier i tarcica', icon: 'lisc', goods: ['wood', 'lumber', 'paper'], active: true },
    copper: { name: 'Miedź i srebro → elektronika i energia', icon: 'surowiec-copper', goods: ['copper', 'silver', 'batteries', 'chips', 'power'], active: true },
    chips: { name: 'Ziemie rzadkie → baterie i chipy', icon: 'kopalnia', goods: ['rare_earths', 'batteries', 'chips', 'robots', 'planes'], active: true },
    nuclear: { name: 'Uran → energetyka jądrowa', icon: 'surowiec-uranium', goods: ['uranium', 'power'], active: true },
    defense: { name: 'Obronność', icon: 'tarcza', goods: ['steel', 'sulfur', 'chips', 'batteries', 'trucks', 'planes'], active: true },
    health: { name: 'Zdrowie', icon: 'hospital', goods: ['chem', 'sulfur', 'paper', 'drugs', 'med_equipment'], active: true },
    mint: { name: 'Pieniądz (Mennica)', icon: 'moneta', goods: ['paper', 'gold', 'silver', 'copper', 'cash'], get active() { return typeof MINT_ACTIVE !== 'undefined' && MINT_ACTIVE; } }
};
/** Produkty spółek poza profilem surowcowym (dobra bez kontraktu wydobywane przez konkretne spółki): symbol/id → { dobro: udział przychodu }. */
const CHAIN_COMPANY_PRODUCTS = { SRE: { rare_earths: 1 }, SIK: { sulfur: 0.3 } };
/** Współprodukty: dobro → [dobro macierzyste, udział jego przychodu] (srebro z miedzi, siarka z rafinacji ropy). */
const CHAIN_COPRODUCTS = { silver: ['copper', 0.08], sulfur: ['oil', 0.03] };

/** Najbardziej szczegółowy klucz tabeli dla jednostki „Sektor/Podsektor” (podsektor przed sektorem). */
function matchChainKey(table, unitKey) {
    if (table[unitKey]) return unitKey;
    const sector = String(unitKey).split('/')[0];
    return table[sector] ? sector : null;
}
/** Czy jednostka pasuje do klucza odbiorcy (klucz sektora obejmuje też jego podsektory bez własnego wpisu). */
function chainKeyCovers(key, unitKey) { return key === unitKey || (!key.includes('/') && String(unitKey).split('/')[0] === key); }

/** Spójność rejestru: każde aktywne dobro ma producenta i odbiorcę, udziały popytu sumują się do 1, receptury wskazują istniejące dobra. */
function checkGoodsRegistry() {
    const problems = [];
    for (const g of GOODS) {
        if (!g.producers?.length) problems.push(`${g.id}: brak producenta`);
        const sum = Object.values(g.use || {}).reduce((a, b) => a + b, 0);
        if (!g.use || Math.abs(sum - 1) > 1e-6) problems.push(`${g.id}: udziały popytu ${sum.toFixed(3)}`);
        if (!GOOD_CLASSES[g.cls]) problems.push(`${g.id}: klasa ${g.cls}`);
        if (g.cls === 'K' && !(g.delta > 0)) problems.push(`${g.id}: brak δ`);
    }
    for (const [unit, rec] of Object.entries(CHAIN_RECIPES)) for (const id of Object.keys(rec)) if (!GOOD_BY_ID[id]) problems.push(`receptura ${unit}: nieznane dobro ${id}`);
    for (const [id, ch] of Object.entries(CHAINS)) for (const g of ch.goods) if (!GOOD_BY_ID[g]) problems.push(`łańcuch ${id}: nieznane dobro ${g}`);
    return problems;
}
