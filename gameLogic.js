// --- Zmienne globalne stanu gry ---
// Diagnostic: potwierdź załadowanie pliku
if (typeof window !== 'undefined' && window.console) {
    console.log('[diag] gameLogic.js loaded');
}
let playerCash = 100000000.00;
let playerXP = 1000000;
let isGamePaused = true;
let playerPortfolio = {};
let playerLoan = {
    amount: 0,
    weeklyPayment: 0,
    missedPayments: 0
};
let isAutoRepayEnabled = true;
let playerDeposit = 0;
let lastWeekStockPrices = {};
let playerStartupAutoInvest = {};
let currentlyDisplayedChartSymbol = null;
let exchangeCollapseState = {};
let playerAccessLevel = 0;
let playerHasPremiumSubscription = false;
let premiumSubscriptionEndTime = 0;
let activePremiumRumors = [];
let marketVolatilityIndex = 0;
let playerCompany = null;
let workPassiveProgress = 0;
const PASSIVE_WORK_INTERVAL = 90000;
const PREMIUM_SUBSCRIPTION_COST = 5000;
const PREMIUM_SUBSCRIPTION_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 dni
let investmentPool = {
    totalFunds: 0,
    contributors: {}, // Przechowuje wkłady, np. { 'player': 5000, 'ai1': 2000 }
    playerStakes: {},
    investmentTimer: 90000, // Czas do następnej inwestycji (1 minuta)
    INVESTMENT_INTERVAL: 90000 // Stały interwał
};
let playerChartSettings = {
    type: 'candlestick',
    lineInterval: 1000,       // Domyślny interwał dla wykresu liniowego: 1 sekunda
    candleInterval: 15000     // Domyślny interwał dla wykresu świecowego: 15 sekund
};

// --- NOWE ZMIENNE DLA RYNKU OBLIGACJI I MIASTA ---

let allBonds = []; // Przechowuje obligacje gracza
let activeBonds = []; // Oferty obligacji korporacyjnych i komunalnych

let cityInvestment = {
    donatedAmount: 0, // Całkowita kwota wpłacona przez WSZYSTKICH
    playerHasUnlocked: false, // Czy GRACZ odblokował?
    aiHasUnlocked: false      // Czy JAKIKOLWIEK BOT odblokował?
};
console.log("STAN POCZĄTKOWY cityInvestment:", JSON.stringify(cityInvestment)); 

const bondIssuers = {
    municipal: [ // Emitenci komunalni
        { name: "Miejskie Wodociągi Gdańsk", risk: 0.1 },
        { name: "Zarząd Transportu Miejskiego", risk: 0.15 },
        { name: "Gdańskie Nieruchomości Komunalne", risk: 0.12 }
    ],
    corporate_non_public: [ // Korporacje pozagiełdowe
        { name: "Północna Grupa Budowlana Sp. z o.o.", risk: 0.6 },
        { name: "Pomorskie Centrum Logistyczne 'Amber'", risk: 0.5 },
        { name: "Stocznia Remontowa 'Neptun'", risk: 0.7 }
    ]
};

let stateBondOffer = {
    shortTerm: { available: 0, interest: 0.03 },
    mediumTerm: { available: 0, interestBase: 0.02 },
    longTerm: { available: 0, interestBase: 0.05 }
};

// --- NOWY FRAGMENT ---
// Ustawienia Auto-inwestowania Gracza
let playerAutoInvest = {
    isEnabled: false,
    amount: 100,      // Domyślna kwota
    interval: 30000,  // Domyślny interwał (30 sekund)
    timer: 30000      // Odliczanie do następnej inwestycji
};
// --- KONIEC NOWEGO FRAGMENTU ---

// ZMIANA OD KOLEGI: Dodano zmienną do śledzenia sortowania
let currentSortState = 'none'; // 'none', 'price_asc', 'price_desc'

const startupSectors = [['Technologia'], ['Gaming'], ['Medycyna'], ['Energia'], ['Żywność'], ['Nieruchomości'], ['Chemia'], ['Przemysł'], ['Dobra konsumpcyjne'], ['Usługi'], ['Turystyka'], ['Bankowość']];

const techPrefixes = ['Quantum', 'Cyber', 'Data', 'Nano', 'Aero', 'Geo'];
const techSuffixes = ['Leap', 'Verse', 'Solutions', 'Dynamics', 'Core'];
const gamingPrefixes = ['Pixel', 'Rogue', 'Iron', 'Grim', 'Mad', 'True', 'Good', 'Toxic', 'Giga'];
const gamingSuffixes = ['Punx', 'Tale', 'Forge', 'Horde', 'Quest', 'Id', 'Rats', 'Cache', 'Byte', 'Pro'];
const medPrefixes = ['Bio', 'Neuro', 'Vita', 'Cardio', 'Hema'];
const medSuffixes = ['Gen', 'Cure', 'Pulse', 'Labs', 'Health'];
const energyPrefixes = ['Eco', 'Hydro', 'Geo', 'Sun', 'Volt'];
const energySuffixes = ['Volt', 'Charge', 'Power', 'Grid', 'Source'];
const financePrefixes = ['Fin', 'Apex', 'Alpha', 'Quantum', 'Secure', 'Virtuo'];
const financeSuffixes = ['Vest', 'Trade', 'Trust', 'Cap', 'Fund'];
const foodPrefixes = ['Agro', 'Bio', 'Eko', 'Smak', 'Fresh', 'Poli'];
const foodSuffixes = ['Food', 'Farm', 'Pex', 'Pol', 'Vit', 'Garden'];
const realtyPrefixes = ['Bud', 'Dom', 'Pro', 'Euro', 'Poli', 'Global'];
const realtySuffixes = ['Dom', 'Bud', 'Invest', 'Estate', 'Plaza'];
const chemPrefixes = ['Chem', 'Poli', 'Anwil', 'Syntho', 'Nitro'];
const chemSuffixes = ['Plast', 'Chem', 'Tech', 'Novia', 'Corp'];
const industryPrefixes = ['Poli', 'Stal', 'Indu', 'Mega', 'Bud', 'Raw', 'Euro', 'Neo', 'Hard', 'Max', 'Daw'];
const industrySuffixes = ['Stal', 'Bud', 'Tech', 'Weld', 'Corp', 'System', 'Max', 'Ex', 'Pol'];
const consumerPrefixes = ['Neo', 'Poli', 'Comfort', 'Pro', 'Lux', 'Every'];
const consumerSuffixes = ['Lux', 'Plast', 'Dom', 'Produkt', 'Line', 'Day'];
const servicesPrefixes = ['Serwis', 'Pro', 'Pol', 'Euro', 'Global', 'Biz'];
const servicesSuffixes = ['Net', 'Com', 'Serv', 'Line', 'Team', 'Solutions'];
const tourismPrefixes = ['Poli', 'Travel', 'Euro', 'Sun', 'Go', 'Sky'];
const tourismSuffixes = ['Pol', 'Travel', 'Sun', 'Fly', 'Tour', 'Ways'];
const bankingPrefixes = ['Fin', 'Euro', 'Pol', 'Pro', 'Secure', 'Capital', 'Super', 'Mega', 'Giga', 'Star', 'Amber'];
const bankingSuffixes = ['Bank', 'Trust', 'Vest', 'Kapitał', 'Finance', 'Invest', 'Vabank', 'Parabank', 'Gold'];


const ceoTraits = {
    // === CECHY POSPOLITE (COMMON) ===
    wyjadacz: {
        name: "Wyjadacz",
        rarity: "common",
        color: "#a0a0a0",
        description: "Delikatnie zwiększa bazowy wzrost ceny akcji (+1%)."
    },
    hobbista: {
        name: "Hobbista",
        rarity: "common",
        color: "#a0a0a0",
        description: "Zwiększa wahania kursu akcji (+2% do volatilityFactor)."
    },
    tyran: {
        name: "Tyran",
        rarity: "common",
        color: "#a0a0a0",
        description: "Z powodu niskiego morale w firmie, bazowy wzrost ceny akcji jest spowolniony (-2%)."
    },
    rozrzutny: {
        name: "Rozrzutny",
        rarity: "common",
        color: "#a0a0a0",
        description: "Nieefektywne zarządzanie finansami spowalnia bazowy wzrost ceny akcji (-2%)."
    },
    glowa_w_chmurach: {
        name: "Głowa w chmurach",
        rarity: "common",
        color: "#a0a0a0",
        description: "Brak skupienia na detalach spowalnia postęp badań w firmie (-5%)."
    },
    niezdecydowany: {
        name: "Niezdecydowany",
        rarity: "common",
        color: "#a0a0a0",
        description: "Jego niezdecydowanie wprowadza chaos. Co kwartał istnieje 25% szans, że polityka dywidendowa firmy zostanie losowo zmieniona."
    },
    biurowy_dron: {
        name: "Biurowy Dron",
        rarity: "common",
        color: "#a0a0a0",
        description: "Skupiony na procesach, a nie na wynikach. Przyspiesza badania (+5%), ale spowalnia wzrost ceny akcji (-1%)."
    },
    ryzykant: {
        name: "Ryzykant",
        rarity: "common",
        color: "#a0a0a0",
        description: "Lubi grać va banque. Zwiększa zmienność akcji (+10%), ale wzmacnia też pozytywne zdarzenia losowe (+5%)."
    },
    ksiegowy: {
        name: "Księgowy",
        rarity: "common",
        color: "#a0a0a0",
        description: "Przedkłada stabilność nad innowacje. Obniża zmienność akcji (-5%), ale spowalnia też postęp badań (-5%)."
    },
    plotkarz: {
        name: "Plotkarz",
        rarity: "common",
        color: "#a0a0a0",
        description: "Jego gadulstwo sprawia, że firma mocniej reaguje na plotki. Wzmacnia efekty wszystkich zdarzeń firmowych o 10% (pozytywnych i negatywnych)."
    },

    // === CECHY RZADKIE (RARE) ===
    pewniak: {
        name: "Pewniak",
        rarity: "rare",
        color: "#4caf50",
        description: "Utrzymuje stabilność firmy. Współczynnik zmienności (volatilityFactor) nigdy nie przekroczy 3.0 i nie spadnie poniżej 0.5."
    },
    prowiec: {
        name: "PRowiec",
        rarity: "rare",
        color: "#4caf50",
        description: "Mistrz public relations. Wzmacnia efekty pozytywnych zdarzeń losowych dla tej spółki o 3%."
    },
    doswiadczony: {
        name: "Doświadczony",
        rarity: "rare",
        color: "#4caf50",
        description: "Weteran biznesu. Osłabia negatywne zdarzenia o 15% i wzmacnia pozytywne o 1%."
    },
    filar_w_branzy: {
        name: "Filar w branży",
        rarity: "rare",
        color: "#4caf50",
        description: "Jego reputacja sprawia, że cena akcji rośnie o 1% szybciej niż średnia dla tego sektora."
    },
    reakcjonista: {
        name: "Reakcjonista",
        rarity: "rare",
        color: "#4caf50",
        description: "Pod jego rządami firma bardzo emocjonalnie reaguje na wiadomości. Efekty zdarzeń (pozytywnych i negatywnych) są o 10% silniejsze."
    },
    nieudacznik: {
        name: "Nieudacznik",
        rarity: "rare",
        color: "#f44336",
        description: "Kombinacja pecha i złych decyzji. Spowalnia wzrost ceny akcji o 5% i zwiększa jej wahania o 5%."
    },
    skompromitowany: {
        name: "Skompromitowany",
        rarity: "rare",
        color: "#f44336",
        description: "Ciągnie się za nim zła sława. Zwiększa szansę na negatywne, specyficzne dla firmy zdarzenie o 10%."
    },
    oddany: {
        name: "Oddany",
        rarity: "rare",
        color: "#4caf50",
        description: "Lojalny firmie i jej pracownikom. Próba jego zwolnienia przez radę nadzorczą ma o 25% mniejszą szansę powodzenia."
    },
    skapiec: {
        name: "Skąpiec",
        rarity: "rare",
        color: "#f44336",
        description: "Nienawidzi dzielić się zyskiem. Blokuje wszelkie wypłaty dywidendy, niezależnie od polityki firmy. Kumulowany kapitał nieznacznie poprawia kondycję finansową (+0.25 co kwartał)."
    },
    szczodry: {
        name: "Szczodry",
        rarity: "rare",
        color: "#4caf50",
        description: "Uwielbia dzielić się zyskiem. Zwiększa kwotę wypłacanej dywidendy o 15% i ignoruje politykę 'Wzrostu'."
    },
    spec_od_kryzysu: {
        name: "Specjalista ds. Kryzysu",
        rarity: "rare",
        color: "#4caf50",
        description: "Gdy kondycja firmy spada poniżej zera, ma 20% szans w każdym kwartale na jej natychmiastowe ustabilizowanie do poziomu 0."
    },
    lowca_glow: {
        name: "Łowca Głów",
        rarity: "rare",
        color: "#4caf50",
        description: "Agresywnie rekrutuje talenty. Przyspiesza badania (+10%), ale jego metody zwiększają zmienność akcji (+15%)."
    },
    lojalista: {
        name: "Lojalista",
        rarity: "rare",
        color: "#4caf50",
        description: "Ma silne poczucie obowiązku państwowego. Jeśli prezesuje spółce państwowej, zwiększa jej odporność na negatywne zdarzenia o dodatkowe 20%."
    },

    // === CECHY BARDZO RZADKIE (VERY RARE) ===
    stoik: {
        name: "Stoik",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Opoka spokoju. Permanentnie obniża zmienność akcji (volatilityFactor) o 40% i osłabia efekty wszystkich zdarzeń o 25%."
    },
    wizjoner: {
        name: "Wizjoner",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Patrzy w przyszłość. Przyspiesza postęp badań o 10%, ale jego ryzykowne decyzje zwiększają zmienność akcji o 5%."
    },
    rekin: {
        name: "Rekin",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Agresywny i skuteczny. Zwiększa bazowy wzrost ceny akcji o 5%."
    },
    kapitalista: {
        name: "Kapitalista",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Wierzy w siłę kapitału. Spółka automatycznie skupuje niewielką liczbę swoich akcji co 4-7 minut, wspierając kurs."
    },
    geniusz_innowacji: {
        name: "Geniusz Innowacji",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Jego umysł wyprzedza epokę. Drastycznie przyspiesza wszelkie prace badawczo-rozwojowe w firmie (+25%)."
    },
    ulubieniec_rzadu: {
        name: "Ulubieniec Rządu",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Ma doskonałe kontakty w sferach rządowych. Jeśli prezesuje spółce państwowej, co kwartał ma 15% szans na otrzymanie pokaźnego grantu finansowego."
    },
    ekspansjonista: {
        name: "Ekspansjonista",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Zawsze myśli o rozwoju. Co dwa kwartały zwiększa maksymalną liczbę akcji (maxShares) spółki o 1%, otwierając drogę do przyszłych emisji."
    },
    patron: {
        name: "Patron",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Wspiera zdolnych inwestorów. Gracz otrzymuje o 10% więcej XP za zyskowne transakcje na akcjach tej spółki."
    },
    magik_finansowy: {
        name: "Magik Finansowy",
        rarity: "very_rare",
        color: "#2196f3",
        description: "Potrafi sprawić, że problemy znikają. Co kwartał ma 10% szans na całkowite wyzerowanie długu korporacyjnego spółki."
    },

    // === CECHY WYJĄTKOWE (EXCEPTIONAL) ===
    bogacz: {
        name: "Bogacz",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Ma tak rozległe wpływy i prywatne środki, że jego firma nie może zbankrutować ani zostać znacjonalizowana."
    },
    legenda: {
        name: "Legenda",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Ikona biznesu. Negatywne eventy są osłabione o 50%, pozytywne pojawiają się 5% częściej, a co 10 minut cena akcji otrzymuje stały bonus +3.5%."
    },
    czlowiek_z_ludu: {
        name: "Człowiek z Ludu",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Jest tak lubiany i szanowany, że jego firma jest całkowicie odporna na negatywne zdarzenia losowe dotyczące bezpośrednio spółki (kategorii 'company')."
    },
    midas: {
        name: "Midas",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Wszystko, czego dotknie, zamienia się w złoto. Przy objęciu stanowiska jednorazowo podnosi kondycję finansową firmy o +3 i cenę akcji o +15%."
    },
    tytan_przemyslu: {
        name: "Tytan Przemysłu",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Jego imperium jest niewzruszone. Spółka jest całkowicie odporna na negatywne zdarzenia sektorowe i ogólnorynkowe."
    },
    wladca_marionetek: {
        name: "Władca Marionetek",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Pociąga za sznurki w całej branży. Co kwartał ma 5% szans na wywołanie pozytywnego zdarzenia dla WŁASNEJ firmy."
    },
    imperator: {
        name: "Imperator",
        rarity: "exceptional",
        color: "#ffc107",
        description: "Jego władza jest absolutna. Spółka, której przewodzi, nie może zostać wrogo przejęta przez innego gracza lub AI."
    }
};

const centralBankGovernorTraits = {
    // Polityka Monetarna
    jastrzab: { name: "Jastrząb", rarity: "rare", color: "#f44336", description: "Preferuje wyższe stopy procentowe, aby kontrolować inflację, nawet kosztem wzrostu gospodarczego." },
    golab: { name: "Gołąb", rarity: "rare", color: "#4caf50", description: "Skłania się ku niższym stopom procentowym, aby stymulować gospodarkę, ryzykując wyższą inflacją." },
    stabilizator: { name: "Stabilizator", rarity: "common", color: "#a0a0a0", description: "Dąży do utrzymania stabilnych stóp procentowych, unikając gwałtownych ruchów." },
    // Stosunek do Regulacji
    regulator: { name: "Regulator", rarity: "rare", color: "#ffc107", description: "Zwolennik ścisłego nadzoru nad bankami komercyjnymi, częściej podnosi wymogi rezerwowe." },
    deregulator: { name: "Deregulator", rarity: "rare", color: "#2196f3", description: "Uważa, że rynek sam się wyreguluje, skłonny do obniżania wymogów rezerwowych." },
    // Stosunek do Państwa
    etatysta: { name: "Etatysta", rarity: "very_rare", color: "#663399", description: "Silnie wspiera sektor państwowy, chętniej finansuje spółki Skarbu Państwa i rozważa nacjonalizację." },
    libertarianin: { name: "Libertarianin", rarity: "very_rare", color: "#000000", description: "Sceptyczny wobec interwencji państwa, rzadziej finansuje spółki państwowe, preferuje prywatyzację." },
    // Inne
    niezalezny: { name: "Niezależny Ekspert", rarity: "common", color: "#a0a0a0", description: "Podejmuje decyzje w oparciu o dane makroekonomiczne, mniej podatny na naciski." },
    partyjniak: { name: "Człowiek Partii", rarity: "rare", color: "#8B4513", description: "Jego decyzje są często podyktowane bieżącą polityką, co prowadzi do nieprzewidywalnych ruchów." }
};


// --- Dane ---
const exchanges = {
    'JUNK': { name: 'Giełda Śmieciowa 🗑️', level: 0, color: '#6c757d', minPrice: 0, maxPrice: 20, licenseCost: 0 },
    'BRONZE': { name: 'Rynek Brązowy 🥉', level: 1, color: '#cd7f32', minPrice: 20, maxPrice: 75, licenseCost: 20000 },
    'SILVER': { name: 'Giełda Srebrna 🥈', level: 2, color: '#c0c0c0', minPrice: 75, maxPrice: 400, licenseCost: 125000 },
    'GOLD': { name: 'Giełda Złota 🥇', level: 3, color: '#ffd700', minPrice: 400, maxPrice: 1500, licenseCost: 250000 },
    'PLATINUM': { name: 'Giełda Platynowa 💎', level: 4, color: '#e5e4e2', minPrice: 1500, maxPrice: Infinity, licenseCost: 500000 }
};

const SHARE_LIMIT_RANGES = {
    'JUNK': { min: 800, max: 1200 },
    'BRONZE': { min: 8000, max: 12000 },
    'SILVER': { min: 40000, max: 60000 },
    'GOLD': { min: 80000, max: 120000 },
    'PLATINUM': { min: 800000, max: 1200000 }
};

let marketIndexes = [
    {
        id: 'GIG',
        name: 'Główny Indeks Giełdowy',
        description: 'Śledzi ogólną kondycję całego rynku na podstawie średniej ceny wszystkich akcji.',
        value: 0,
        change: 0,
        priceHistory: [] // NOWA WŁAŚCIWOŚĆ
    },
    {
        id: 'TIG5',
        name: 'Topowy Indeks Giełdowy 5',
        description: 'Śledzi kondycję 5 spółek o największej kapitalizacji rynkowej (tzw. blue chip).',
        value: 0,
        change: 0,
        priceHistory: [] // NOWA WŁAŚCIWOŚĆ
    },
    {
        id: 'SIG20',
        name: 'Szeroki Indeks Giełdowy 20',
        description: 'Śledzi kondycję 20 największych spółek na giełdzie.',
        value: 0,
        change: 0,
        priceHistory: [] // NOWA WŁAŚCIWOŚĆ
    }
];

const initialStocks = [
    // GIEŁDA ŚMIECIOWA (Poziom 0)
    {
    name: 'EcoLube', price: 5.00, volatilityFactor: 2.1, symbol: 'ECL', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
 lineHistory: [], playerTransactions: [], sector: ['Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Elektrownia SA', price: 15.00, volatilityFactor: 0.5, symbol: 'ELE', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Energia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Konfiturex', price: 2.00, volatilityFactor: 4.5, symbol: 'KFX', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Wieczne Ziemniaki Sp. z o.o.', price: 1.50, volatilityFactor: 3.5, symbol: 'WZM', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Wąs Janusza S.A.', price: 0.80, volatilityFactor: 4.0, symbol: 'WJS', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Dobra konsumpcyjne'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Pikselowe Marzenia', price: 7.50, volatilityFactor: 3.8, symbol: 'PIX', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Błyskawiczna Proteza', price: 12.00, volatilityFactor: 3.2, symbol: 'BLP', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Super Makarony', price: 18.00, volatilityFactor: 0.6, symbol: 'SUM', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },

    // RYNEK BRĄZOWY (Poziom 1)
    {
    name: 'Alicante Housing', price: 30.00, volatilityFactor: 0.8, symbol: 'ALI', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Kopalnie Węgla Mine', price: 35.00, volatilityFactor: 1.6, symbol: 'KWM', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'BPN BK', price: 45.00, volatilityFactor: 0.6, symbol: 'BPN', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Bankowość'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'KolenBreg', price: 19.00, volatilityFactor: 1.5, symbol: 'KOB', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Komfucja', price: 19.00, volatilityFactor: 2.2, symbol: 'KOM', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Gwarancja-SI', price: 20.00, volatilityFactor: 2.8, symbol: 'GAI', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia', 'Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Knor-FIX', price: 24.00, volatilityFactor: 1.0, symbol: 'FIX', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Czysty Błysk', price: 30.00, volatilityFactor: 0.7, symbol: 'CZB', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Gdańska Stocznia Krzeseł', price: 22.00, volatilityFactor: 1.1, symbol: 'GSK', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Drużyna Holding', price: 22.00, volatilityFactor: 1.1, symbol: 'DRH', exchange: 'BRONZE', totalShares: 8000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Bałtyckie Rejsy', price: 45.00, volatilityFactor: 1.6, symbol: 'BAL', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Turystyka'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Boazeria Organiczna', price: 48.00, volatilityFactor: 1.2, symbol: 'BOO', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'DarAwansu', price: 47.00, volatilityFactor: 3.0, symbol: 'DAW', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Lek-Pol', price: 60.00, volatilityFactor: 1.1, symbol: 'LEK', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'BurgerLand', price: 58.00, volatilityFactor: 1.4, symbol: 'BUL', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Beretxol', price: 68.00, volatilityFactor: 1.1, symbol: 'BER', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },

    // GIEŁDA SREBRNA (Poziom 2) - Limit: 50,000
    {
        name: 'Bank Żywności', price: 76.00, volatilityFactor: 1.8, symbol: 'BAZ', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Bankowość', 'Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Firma Tłusta Pucha', price: 80.00, volatilityFactor: 1.6, symbol: 'FTP', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność', 'Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Luksusowe Spinacze', price: 88.00, volatilityFactor: 0.8, symbol: 'LUS', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Dobra konsumpcyjne'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Krajoznawsto Obce', price: 78.00, volatilityFactor: 2.5, symbol: 'KRO', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Turystyka'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Plandex', price: 99.00, volatilityFactor: 1.3, symbol: 'PLX', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Turystyka'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'GUM Med Research', price: 78.00, volatilityFactor: 0.7, symbol: 'GUM', exchange: 'SILVER',
        totalShares: 42000, maxShares: 42000, sharesHeld: 0, sector: ['Badania'],
        financialHealth: 1, lastReport: 'neutral', isStateOwned: false, stateOwnershipPct: 0,
        assetType: 'ResearchInstitute',
        research: { isResearching: false, unlockedTechs: [] },
        researchUnlocks: {}, playerTransactions: [], priceAlerts: { buy: null, sell: null },
        candlestickHistory: [], lineHistory: [], currentCandle: null, dividendPolicy: 'Growth'
    },
    {
        name: 'Linapol', price: 114.00, volatilityFactor: 0.9, symbol: 'LIN', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Betonex', price: 120.00, volatilityFactor: 1.0, symbol: 'BTX', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł', 'Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'VitaGen', price: 180.00, volatilityFactor: 2.2, symbol: 'VTG', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna', 'Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Cyber-Ochrona', price: 210.00, volatilityFactor: 1.9, symbol: 'CRO', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi', 'Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Annesco', price: 298.00, volatilityFactor: 1.2, symbol: 'ANN', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Meferox', price: 292.00, volatilityFactor: 1.7, symbol: 'MEF', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Energia', 'Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
     {
        name: 'Instytut Badań Stosowanych', price: 80.00, volatilityFactor: 0.5, symbol: 'IBS', exchange: 'SILVER',
        totalShares: 40000, maxShares: 40000, sharesHeld: 0, sector: ['Badania'],
        financialHealth: 2, lastReport: 'neutral', isStateOwned: false, stateOwnershipPct: 0,
        assetType: 'ResearchInstitute', // Specjalny typ do identyfikacji
        research: { isResearching: false, unlockedTechs: [] }, // Same nie badają
        researchUnlocks: {}, playerTransactions: [], priceAlerts: { buy: null, sell: null },
        candlestickHistory: [], lineHistory: [], currentCandle: null, dividendPolicy: 'Growth'
    },
    {
        name: 'Bank Hipotezy', price: 330.00, volatilityFactor: 0.8, symbol: 'BHI', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Bankowość'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Siarkobrzeg', price: 337.00, volatilityFactor: 1.4, symbol: 'SIK', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'BlueBull', price: 150.00, volatilityFactor: 1.2, symbol: 'BLB', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Cyberfood Corp', price: 250.00, volatilityFactor: 1.8, symbol: 'CYF', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność', 'Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    
    {
        name: 'Uniwersytet Gdański', price: 110.00, volatilityFactor: 0.6, symbol: 'UnG', exchange: 'SILVER',
        totalShares: 35000, maxShares: 35000, sharesHeld: 0, sector: ['Badania'],
        financialHealth: 1, lastReport: 'neutral', isStateOwned: false, stateOwnershipPct: 0,
        assetType: 'ResearchInstitute',
        research: { isResearching: false, unlockedTechs: [] },
        researchUnlocks: {}, playerTransactions: [], priceAlerts: { buy: null, sell: null },
        candlestickHistory: [], lineHistory: [], currentCandle: null, dividendPolicy: 'Growth'
    },
    

    // GIEŁDA ZŁOTA (Poziom 3)
    {
        name: 'WielkiWoltaż', price: 410.00, volatilityFactor: 0.9, symbol: 'WIW', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Energia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Krawaciarze Inc.', price: 485.00, volatilityFactor: 0.7, symbol: 'KRA', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł', 'Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Sanitas Szpitale', price: 550.00, volatilityFactor: 0.6, symbol: 'SAN', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Stocznia Morska', price: 777.00, volatilityFactor: 1.3, symbol: 'STM', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Mieszkalnictwo Inwestycyjne',
        price: 0, volatilityFactor: 0.8, symbol: 'MIN', exchange: 'GOLD',
        totalShares: 100000, maxShares: 100000, sharesHeld: 0,
        sector: ['Finanse'], // Teraz głównym sektorem są Finanse
        financialHealth: 1, lastReport: 'brak', cash: 89000000, isTradeLocked: false,
        assetType: 'Holding', // <-- ZMIANA: Konwersja na fundusz
        holdingPortfolio: {}, // <-- NOWOŚĆ: Pusty portfel na start
        specializationSectors: ['Nieruchomości'], // <-- NOWOŚĆ: Specjalizacja w nieruchomościach
        priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null }
    },
    {
        name: 'SuperKonsumpcja!', price: 950.00, volatilityFactor: 1.1, symbol: 'SKP', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Dobra konsumpcyjne'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Bank Klasy Światowej', price: 1000.00, volatilityFactor: 0.3, symbol: 'BKS', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Bankowość'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },

    // GIEŁDA PLATYNOWA (Poziom 4)
    {
        name: 'Universal Projects', price: 1525.00, volatilityFactor: 1.5, symbol: 'UNP', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Cortex Neural', price: 1850.00, volatilityFactor: 2.4, symbol: 'CTX', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'KrzeUraFos4', price: 2300.00, volatilityFactor: 2.9, symbol: 'KUP', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Biurowce Obsługi Rachunkowej', price: 3000.00, volatilityFactor: 0.6, symbol: 'BOR', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi', 'Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    // --- NOWE SPÓŁKI SKARBU PAŃSTWA ---
    
    // NOWY KOD (POPRAWIONY)
    {
        name: 'Bank Finansowania Projektów',
        price: 0, volatilityFactor: 0.4, symbol: 'BFP', exchange: 'SILVER',
        totalShares: 50000, maxShares: 60000, sharesHeld: 0,
        sector: ['Finanse'],
        financialHealth: 2, lastReport: 'brak', cash: 14000000, isTradeLocked: false,
        assetType: 'Holding',
        holdingPortfolio: {},
        specializationFilter: 'stateOwned',
        priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z)  candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null },

        // --- DODANE LUB POPRAWIONE LINIE ---
        isStateOwned: true,           // Ustawienie flagi państwowej
        stateOwnershipPct: 0.75,      // Przykładowo 75% udziałów państwa
        eventResistance: 0.6,         // Odporność na zdarzenia (typowa dla spółek państwowych)
        stateOfferCooldownUntil: 0    // Timer dla ofert gracza
        // --- KONIEC POPRAWEK ---
    },
    {
    name: 'Energa', price: 90.00, volatilityFactor: 0.6, symbol: 'ENG', exchange: 'SILVER', totalShares: 55000, maxShares: 65000, sharesHeld: 0, stateOfferCooldownUntil: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Energia'], financialHealth: 1, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, isStateOwned: true, stateOwnershipPct: 0.60, eventResistance: 0.6, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Tauron', price: 85.00, volatilityFactor: 0.7, symbol: 'TRN', exchange: 'SILVER', totalShares: 60000, maxShares: 70000, sharesHeld: 0, stateOfferCooldownUntil: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Energia'], financialHealth: 1, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, isStateOwned: true, stateOwnershipPct: 0.55, eventResistance: 0.6, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Państwowy Uran', price: 420.00, volatilityFactor: 0.9, symbol: 'PUR', exchange: 'GOLD', totalShares: 80000, maxShares: 100000, sharesHeld: 0, stateOfferCooldownUntil: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Przemysł', 'Energia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, isStateOwned: true, stateOwnershipPct: 0.80, eventResistance: 0.7, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Miedź Ludowa', price: 450.00, volatilityFactor: 0.8, symbol: 'MLD', exchange: 'GOLD', totalShares: 90000, maxShares: 110000, sharesHeld: 0, stateOfferCooldownUntil: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 1, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, isStateOwned: true, stateOwnershipPct: 0.65, eventResistance: 0.7, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Narodowy Operator Cyfrowy', price: 510.00, volatilityFactor: 0.5, symbol: 'NOC', exchange: 'GOLD', totalShares: 100000, maxShares: 120000, stateOfferCooldownUntil: 0, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Technologia', 'Usługi'], financialHealth: 2, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, isStateOwned: true, stateOwnershipPct: 0.90, eventResistance: 0.8, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },

    // --- NOWE SPÓŁKI TYPU REIT ---
    {
        name: 'Global Real Estate Trust',
        price: 450.00, volatilityFactor: 0.2, symbol: 'GRET', exchange: 'GOLD',
    totalShares: 100000, maxShares: 100000, sharesHeld: 0, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], priceAlerts: { buy: null, sell: null },
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Nieruchomości'],
        financialHealth: 3, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, isStateOwned: false,
        assetType: 'REIT', dividendPerShare: 0.1, dividendTimer: 2 * 60 * 1000 // REIT-y mają własny, stały zegar i dywidendę na akcję
    },
    {
        name: 'Urban Office REIT',
        price: 520.00, volatilityFactor: 0.2, symbol: 'UOR', exchange: 'GOLD',
    totalShares: 80000, maxShares: 80000, sharesHeld: 0, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], priceAlerts: { buy: null, sell: null },
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Nieruchomości'],
        financialHealth: 2, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, isStateOwned: false,
        assetType: 'REIT', dividendPerShare: 0.15, dividendTimer: 2 * 60 * 1000
    },

    {
        name: 'Hospital rental',
        price: 1350.00, volatilityFactor: 0.18, symbol: 'HOR', exchange: 'PLATINUM',
    totalShares: 800000, maxShares: 1500000, sharesHeld: 0, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], priceAlerts: { buy: null, sell: null },
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Nieruchomości'],
        financialHealth: 3, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, isStateOwned: false,
        assetType: 'REIT', dividendPerShare: 0.2, dividendTimer: 2 * 60 * 1100
    },
    {
        name: 'Morskie REITy',
        price: 790.00, volatilityFactor: 0.25, symbol: 'REJS', exchange: 'GOLD',
    totalShares: 66000, maxShares: 150000, sharesHeld: 0, priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], priceAlerts: { buy: null, sell: null },
  lineHistory: [], playerTransactions: [], playerTransactions: [], sector: ['Nieruchomości'],
        financialHealth: 2, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, isStateOwned: false,
        assetType: 'REIT', dividendPerShare: 0.166, dividendTimer: 2 * 60 * 1000
    },

    {
        name: 'Heavy Metal Holding',
        price: 120.00, volatilityFactor: 0.5, symbol: 'HMH', exchange: 'SILVER',
        totalShares: 75000, maxShares: 75000, sharesHeld: 0, 
        sector: ['Finanse'], financialHealth: 2, lastReport: 'brak', cash: 9000000,
        assetType: 'Holding', // Specjalny typ spółki
        holdingPortfolio: {}, // Wewnętrzny portfel akcji
        specializationSectors: ['Energia', 'Chemia', 'Przemysł', 'Dobra konsumpcyjne'], // Specjalizacja
        priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null }
    },
    {
        name: 'Quick Buissness Finance',
        price: 150.00, volatilityFactor: 0.8, symbol: 'QBF', exchange: 'GOLD',
        totalShares: 90000, maxShares: 90000, sharesHeld: 0,
        sector: ['Finanse'], financialHealth: 2, lastReport: 'brak', cash: 13500000,
        assetType: 'Holding',
        holdingPortfolio: {},
        specializationSectors: ['Technologia', 'Bankowość', 'Usługi', 'Nieruchomości'],
        priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null }
    },
    {
        name: 'Holding Rekreacyjny',
        price: 135.00, volatilityFactor: 0.4, symbol: 'VSF', exchange: 'SILVER',
        totalShares: 80000, maxShares: 80000, sharesHeld: 0,
        sector: ['Finanse'], financialHealth: 2, lastReport: 'brak', cash: 10800000,
        assetType: 'Holding',
        holdingPortfolio: {},
        specializationSectors: ['Żywność', 'Turystyka', 'Medycyna', 'Gaming'],
        priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], lineHistory: [], playerTransactions: [], priceAlerts: { buy: null, sell: null }
    }

];

const REPUTATION_LEVELS = {
    TRAGIC: -75,
    NEGATIVE: -16,
    NEUTRAL: 30,
    CORRECT: 49,
    POSITIVE: 89,
    FRIENDLY: 100
};


/**
 * Inicjalizuje system reputacji dla wszystkich spółek na starcie gry.
 */
function initializeReputation() {
    const allEntities = ['player', ...aiCompetitors.map(ai => ai.id)];
    stocks.forEach(stock => {
        if (stock.assetType === 'Startup') return; // Reputacja nie dotyczy startupów

        stock.reputation = {};
        allEntities.forEach(id => {

            // --- POPRAWKA: Uwzględnienie Charyzmy Lvl 2 ---
            let baseRep = 0;
            // Jeśli jednostka to gracz i ma odblokowany Lvl 2 Charyzmy, jego startowa reputacja to 10.
            if (id === 'player' && getSkillLevel('charisma') >= 2) {
                baseRep = 10;
            }
            stock.reputation[id] = baseRep; // Początkowa reputacja
            // --- KONIEC POPRAWKI ---
        });
    });
    console.log("[SYSTEM] Zainicjalizowano system reputacji.");
}



function changeReputation(entityId, stockSymbol, change) {
    const stock = stocks.find(s => s.symbol === stockSymbol);
    if (!stock || !stock.reputation || stock.reputation[entityId] === undefined) return;

    let finalChange = change;

    // Jeśli relacje są przyjacielskie, kara jest mniejsza
    if (change < 0 && stock.reputation[entityId] >= REPUTATION_LEVELS.POSITIVE) {
        finalChange *= 0.8; // Zmniejszenie kary o 20%
    }

    stock.reputation[entityId] += finalChange;

    // Ograniczenie reputacji do przedziału -100 do 100
    if (stock.reputation[entityId] > 100) stock.reputation[entityId] = 100;
    if (stock.reputation[entityId] < -100) stock.reputation[entityId] = -100;

    // --- NOWY BLOK: Charyzma Lvl 2 i Lvl 5 (Egzekwowanie podłogi reputacji) ---
    if (entityId === 'player') {
        const charismaLevel = getSkillLevel('charisma');
        let reputationFloor = -100; // Domyślna podłoga

        const holding = playerPortfolio[stockSymbol];

        // Lvl 5: Jeśli masz 70%+, podłoga = 0 (ma wyższy priorytet)
        if (charismaLevel >= 5 && holding && (holding.shares / stock.totalShares) > 0.70) {
            reputationFloor = 0;
        }
        // Lvl 2: W przeciwnym razie, jeśli masz Lvl 2+, podłoga = 10
        else if (charismaLevel >= 2) {
            reputationFloor = 10;
        }

        // Zastosuj obliczoną podłogę
        if (stock.reputation[entityId] < reputationFloor) {
            stock.reputation[entityId] = reputationFloor;
        }
    }
    // --- KONIEC NOWEGO BLOKU ---

    console.log(`[REPUTACJA] Relacje ${entityId} z ${stockSymbol} zmieniły się o ${finalChange.toFixed(1)} i wynoszą teraz ${stock.reputation[entityId].toFixed(1)}`);
}

// Plik: gameLogic.js

/**
 * Gracz lub AI przekazuje "datek" na rzecz firmy, aby poprawić relacje.
 * @param {string} symbol - Symbol spółki.
 * @param {number} amount - Kwota datku.
 * @param {string} donorId - 'player' lub ID bota.
 */
function donateToCompany(symbol, amount, donorId = 'player') {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    let entity, cash;
    if (donorId === 'player') {
        entity = { name: 'Gracz' };
        cash = playerCash;
    } else {
        entity = aiCompetitors.find(ai => ai.id === donorId);
        cash = entity.cash;
    }

    if (cash < amount) {
        if (donorId === 'player') alert("Nie masz wystarczająco gotówki na taki datek!");
        return;
    }

    // Odjęcie gotówki
    if (donorId === 'player') playerCash -= amount;
    else entity.cash -= amount;

    // Obliczenie przyrostu reputacji
    const currentRep = stock.reputation[donorId];
    let repGainPer100 = 1;
    if (currentRep < REPUTATION_LEVELS.TRAGIC) repGainPer100 = 0.25;
    else if (currentRep < REPUTATION_LEVELS.NEGATIVE) repGainPer100 = 0.5;

    let totalRepGain = (amount / 100) * repGainPer100;

    // --- NOWY BLOK: Charyzma Lvl 3 ---
    // Jeśli dawcą jest gracz i ma Lvl 3 Charyzmy, zwiększ zysk reputacji o 25%
    if (donorId === 'player' && getSkillLevel('charisma') >= 3) {
        totalRepGain *= 1.25;
    }
    // --- KONIEC NOWEGO BLOKU ---

    changeReputation(donorId, symbol, totalRepGain);

    logEvent(`🤝 ${entity.name} przekazał datek w wysokości ${amount.toFixed(2)} PLN na rzecz ${stock.name}, poprawiając relacje.`);
    if (donorId === 'player') {
        displayCash();
        openManagementModal(symbol); // Odśwież widok
    }
}


const BASE_SKILL_COST = 100;
const SKILL_COST_INCREASE_FACTOR = 0.75;

const skills = {

    'work': {
        name: 'Praca ✍️',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 100, description: 'Odblokowuje panel Pracy, gdzie możesz wykonywać proste zadania za pieniądze.' },
            { level: 2, cost: 250, description: 'Zadania stają się łatwiejsze, a nagroda wzrasta do 200 PLN.' },
            { level: 3, cost: 600, description: 'Odblokowuje pracę pasywną (100 PLN co 90 sek.)' },
            { level: 4, cost: 1200, name: 'Własna Firma', description: 'Zakładasz własną firmę! Rozwijaj ją, zatrudniaj pracowników i wprowadź na giełdę.' }
        ]
    },

    'analyticalMind': {
        name: 'Analityczny Umysł 🧠',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 250, description: 'Odblokowuje wgląd w ukryty wskaźnik "Stabilności Zarządu" w opisie spółki.' },
            { level: 2, cost: 600, description: 'Odkrywa plany firmy, pokazując jej "Kolejny Ruch Strategiczny".' },
            { level: 3, cost: 1400, description: 'Daje dostęp do kluczowej oceny "Kompetencji Prezesa", pokazującej jego realne umiejętności zarządcze.' }
        ]
    },
    'ironNerves': {
        name: 'Żelazne Nerwy 🧘',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 250, description: 'Negatywne zdarzenia rynkowe mają o 5% mniejszy wpływ na Twoje akcje.' },
            { level: 2, cost: 600, description: 'Redukcja negatywnych zdarzeń wzrasta do 12%.' },
            { level: 3, cost: 1400, description: 'Redukcja negatywnych zdarzeń wynosi 20%, a dodatkowo zyskujesz niewielką odporność na panikę rynkową (WNR ma na Ciebie mniejszy wpływ).' }
        ]
    },
    'sharkCharisma': {
        name: 'Charyzma Rekina 🦈',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 300, description: 'Otrzymujesz o 0.5% lepszą cenę przy każdej transakcji kupna i sprzedaży.' },
            { level: 2, cost: 750, description: 'Bonus do ceny transakcji wzrasta do 1%.' },
            { level: 3, cost: 1600, description: 'Bonus do ceny transakcji wzrasta do 1.5%, a dodatkowo Twoje transakcje generują o 10% więcej XP.' }

        ]
    },
    'hardNegotiator': {
        name: 'Twardy Negocjator 💼',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 300, description: 'Zmniejsza oprocentowanie naliczane od zaciągniętych pożyczek o 10%.' },
            { level: 2, cost: 700, description: 'Redukcja oprocentowania pożyczek wzrasta do 20%.' },
            { level: 3, cost: 1500, description: 'Redukcja oprocentowania wynosi 25%, a dodatkowo Twój maksymalny limit kredytowy jest o 10% wyższy.' }

        ]
    },
    'bankMagnet': {
        name: 'Bankowy Magnes 🧲',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 450, description: 'Zwiększa oprocentowanie depozytów bankowych o 10%.' },
            { level: 2, cost: 900, description: 'Bonus do oprocentowania depozytów wzrasta do 20%.' },
            { level: 3, cost: 1800, description: 'Bonus do oprocentowania wynosi 25%, a dodatkowo otrzymujesz cotygodniowy bonus XP za utrzymywanie dużego depozytu (powyżej 100 000 PLN).' }

        ]
    },
    'dividendAnalyst': {
        name: 'Analityk Dywidend 🧐',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 300, description: 'Odblokowuje Panel Dywidend, pokazujący, które firmy wkrótce wypłacą dywidendę.' },
            { level: 2, cost: 700, description: 'Panel Dywidend pokazuje teraz dokładny czas pozostały do wypłaty.' },
            { level: 3, cost: 1500, description: 'Panel Dywidend pokazuje teraz szacowaną wysokość dywidendy na akcję.' }
        ]
    },
    'financialAnalyst': {
        name: 'Analityk Finansowy 🧐',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 500, description: 'Odblokowuje wgląd w ostatnie raporty finansowe spółek w tabeli rynku.' }
        ]
    },
    'etfExpert': {
        name: 'Ekspert Rynków Globalnych 🌍',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 300, description: 'Odblokowuje dostęp do handlu funduszami ETF.' },
            { level: 2, cost: 1000, description: 'Jeszcze nie dodano' },// dodaje etf top 5 i 15 i 10 oprócz 5 pierwszych, największych spółek
            { level: 3, cost: 1800, description: 'jeszcze nie dodano' } //dodaj możliwość tworzenia własnego etf
        ]
    },
    'insiderAccess': {
        name: 'Dostęp Poufny 💼',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 150, description: 'Otrzymujesz 10% szans na ofertę prywatnej emisji akcji po cenie niższej o 10%.' },
            { level: 2, cost: 400, name: 'Nagięcia na giełdzie', description: 'W ofercie prywatnej możesz zadeklarować chęć kupna o 10% więcej akcji, niż wynika z Twojego udziału.' },
            { level: 3, cost: 1000, name: 'Twardy negocjator', description: 'Cena akcji w ofercie prywatnej jest niższa o dodatkowe 15%.' }
        ]
    },
    'sixthSense': {
        name: 'Szósty Zmysł 💡',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 200, description: 'Niewielka szansa na otrzymanie prywatnego "przeczucia" o przyszłych wynikach losowej firmy.' },
            { level: 2, cost: 500, description: 'Twoje "przeczucia" wskazują teraz, czy nadchodzące wydarzenie będzie pozytywne, czy negatywne.' }
        ]
    },

    'indexAnalystLvl1': {
        name: 'Analityk Indeksowy 📈',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 150, description: 'Odblokowuje podgląd podstawowych indeksów giełdowych (GIG, TIG5, SIG20) na pulpicie.' },
            { level: 2, cost: 350, description: 'Odblokowuje możliwość handlu jednostkami głównych indeksów giełdowych.', requires: { skillId: 'indexAnalystLvl1', level: 1 } },
            { level: 3, cost: 550, description: 'Odblokowuje "Wskaźnik Niestabilności Rynku" (WNR).', requires: { skillId: 'indexAnalystLvl1', level: 2 } }
        ]
    },
    'nepotism': {
        name: 'Nepotyzm 🤝',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 1200, description: 'Pozwala Ci inwestować w strategiczne Spółki Skarbu Państwa.' }
        ]
    },
    'startupInvestor': {
        name: 'Anioł Biznesu 👼',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 800, description: 'Odblokowuje dostęp do "Inkubatora Start-upów", pozwalając na inwestowanie w ryzykowne, młode firmy.' },
            { level: 2, cost: 1500, description: 'Twoje doświadczenie i wsparcie zapewniają każdemu start-upowi, w który zainwestujesz, stały bonus +5% do szansy na sukces.' },
            { level: 3, cost: 3000, description: 'Twoja intuicja pozwala Ci z 15% szansą natychmiast wykryć, że dany start-up to oszustwo.' },
            { level: 4, cost: 5000, description: 'BFG – odblokowuje możliwość wykupienia "ubezpieczenia" dla inwestycji w start-up. W razie porażki odzyskasz 75% zainwestowanych środków.' },
            { level: 5, cost: 7500, description: '(Prywatyzacja) Możliwość kupienia start-upu na wyłączność. Gwarantuje to sukces projektu, ale jego szansa na porażkę zamienia się w ryzyko dodatkowych kosztów lub opóźnień.' },
            { level: 6, cost: 10000, description: 'Twoja zdolność do wykrywania oszustw wzrasta do 50%.' }
        ]
    },

      'charisma': {
        name: 'Charyzma 🌟',
        unlockedLevel: 0,
        levels: [
            { level: 1, cost: 400, description: 'Twoja reputacja Cię wyprzedza. Negatywne efekty zdarzeń losowych i Twoich działań (jak wymuszona dywidenda) są zmniejszone o 15%.' },
            { level: 2, cost: 900, description: 'Twój bazowy poziom reputacji we wszystkich spółkach startuje od 10 (zamiast 0). Reputacja nigdy nie spadnie poniżej 10.' },
            { level: 3, cost: 2000, description: 'Twoje datki na rzecz spółek (poprawiające reputację) są o 25% bardziej efektywne.' },
            { level: 4, cost: 4500, description: 'Mistrz dyplomacji. Redukcja negatywnych efektów (z Poziomu 1) wzrasta do 50%.' },
            { level: 5, cost: 10000, description: 'Ikona Biznesu. Jeśli posiadasz ponad 70% akcji w spółce, Twoja reputacja w niej nigdy nie spadnie poniżej Neutralnej (0), nawet jeśli normalnie wynosiłaby 10 (z Poziomu 2).' }
        ]
    },

    // ZMIANA OD KOLEGI: Dodano nową umiejętność "Księgowy"
    'accountant': {
        name: 'Księgowy 🧐',
        unlockedLevel: 0,
        levels: [
            {
                level: 1,
                cost: 600, // Przykładowy koszt XP
                description: 'Odblokowuje możliwość wglądu w podstawowe finanse ("faktury") spółki za opłatą 2000 PLN. Dostęp może być zablokowany przy negatywnych relacjach.'
            },
            {
                level: 2,
                cost: 1500, // Przykładowy koszt XP
                description: 'Wgląd w finanse jest darmowy dla spółek, w których posiadasz ponad 50% akcji.'
            },
            {
                level: 3,
                cost: 3500, // Przykładowy koszt XP
                description: 'Twoje doświadczenie pozwala Ci wykrywać anomalie. Zyskujesz 15% szans przy każdym wglądzie w finanse na wykrycie nieprawidłowości (co może zapobiec negatywnemu zdarzeniu) lub ukrytego potencjału (co może dać mały bonus).'
            }
        ]
    }
};


const etfs = [
    {
        name: 'Tech Sektor ETF',
        symbol: 'TSX',
        description: 'Fundusz naśladujący wyniki spółek z sektora Technologia.',
        targetSectors: ['Technologia'],
        price: 0,
        priceHistory: []
    },
    {
        name: 'Bankowość Sektor ETF',
        symbol: 'FSX',
        description: 'Fundusz naśladujący wyniki spółek z sektora Bankowość i Finanse.',
        targetSectors: ['Bankowość'],
        price: 0,
        priceHistory: []
    },
    {
        name: 'Przemysł Sektor ETF',
        symbol: 'PSX',
        description: 'Fundusz naśladujący wyniki spółek z sektora Przemysł.',
        targetSectors: ['Przemysł'],
        price: 0,
        priceHistory: []
    },
    {
        name: 'Energia Sektor ETF',
        symbol: 'ESX',
        description: 'Fundusz naśladujący wyniki spółek z sektora Energia.',
        targetSectors: ['Energia'],
        price: 0,
        priceHistory: []
    },
    {
        name: 'Nieruchomości Sektor ETF',
        symbol: 'NSX',
        description: 'Fundusz naśladujący wyniki spółek z sektora Nieruchomości.',
        targetSectors: ['Nieruchomości'],
        price: 0,
        priceHistory: []
    },
    {
        name: 'Chemia Sektor ETF',
        symbol: 'CHSX',
        description: 'Fundusz naśladujący wyniki spółek z sektora Chemia.',
        targetSectors: ['Chemia'],
        price: 0,
        priceHistory: []
    },
    {
        name: 'Medycyna Sektor ETF',
        symbol: 'MHX',
        description: 'Fundusz naśladujący wyniki spółek z sektora Medycyna.',
        targetSectors: ['Medycyna'],
        price: 0,
        priceHistory: []
    },
    {
        name: 'Turystyka Sektor ETF',
        symbol: 'TRSX',
        description: 'Fundusz naśladujący wyniki spółek z sektora tursytyka.',
        targetSectors: ['Turystyka'],
        price: 0,
        priceHistory: []
    },
    {
        name: 'Dobra konsumpcyjne Sektor ETF',
        symbol: 'DKX',
        description: 'Fundusz naśladujący wyniki spółek z sektora Dobra konsumpcyjne.',
        targetSectors: ['Dobra konsumpcyjne'],
        price: 0,
        priceHistory: []
    },
    {
        name: 'Usługi Sektor ETF',
        symbol: 'USX',
        description: 'Fundusz naśladujący wyniki spółek z sektora Usługi.',
        targetSectors: ['Usługi'],
        price: 0,
        priceHistory: []
    }
];

let stocks = JSON.parse(JSON.stringify(initialStocks));
try {
    randomizeInitialShareCounts();
} catch (e) {
    console.error('[diag] Błąd podczas randomizeInitialShareCounts():', e);
}
function randomizeInitialShareCounts() {
    console.log("[START GRY] Randomizowanie liczby akcji...");
    stocks.forEach(stock => {
        const range = SHARE_LIMIT_RANGES[stock.exchange];
        if (range) {
            const randomShares = getRandomIntInRange(range.min, range.max);
            stock.totalShares = randomShares;
            stock.maxShares = randomShares;
            stock.sharesHeld = 0; // Upewniamy się, że na starcie nikt nie ma akcji
        }
    });
}

function isSkillUnlocked(skillId) {
    // Sprawdzamy, czy w nowej strukturze istnieje taki klucz 
    // i czy jego odblokowany poziom jest większy niż 0
    return skills[skillId] && skills[skillId].unlockedLevel > 0;
}

function getSkillLevel(skillId) {
    return skills[skillId] ? skills[skillId].unlockedLevel : 0;
}

function getNextSkillLevelInfo(skillId) {
    const skill = skills[skillId];
    if (!skill) return null;
    const currentLevel = skill.unlockedLevel;
    return skill.levels.find(l => l.level === currentLevel + 1);
}


const CANDLE_INTERVAL = 15 * 1000; // 15 sekund na jedną świecę bazową

function updateStockPrices() {
    const now = Date.now();
    const marketModifier = 1 + (marketVolatilityIndex - 1) * 0.5;

    stocks.forEach(stock => {
        if (stock.assetType === 'Holding') {
            return; // Pomiń tę spółkę, jej cena jest obliczana w updateHoldingCompanies()
        }
        let priceGrowthModifier = 1.0;
        let volatilityModifier = 1.0;
        let isVolatilityCapped = false;

        if (stock.ceo && stock.ceo.traits) {
            stock.ceo.traits.forEach(trait => {
                switch (trait.id) {
                    // Modyfikatory wzrostu ceny
                    case 'wyjadacz': priceGrowthModifier += 0.01; break;
                    case 'rekin': priceGrowthModifier += 0.05; break;
                    case 'filar_w_branzy': priceGrowthModifier += 0.01; break;
                    case 'tyran': priceGrowthModifier -= 0.02; break;
                    case 'rozrzutny': priceGrowthModifier -= 0.02; break;
                    case 'nieudacznik': priceGrowthModifier -= 0.05; volatilityModifier += 0.05; break;
                    case 'biurowy_dron': priceGrowthModifier -= 0.01; break; // NOWA LINIA

                    // Modyfikatory zmienności
                    case 'hobbista': volatilityModifier += 0.02; break;
                    case 'wizjoner': volatilityModifier += 0.05; break;
                    case 'stoik': volatilityModifier *= 0.60; break;
                    case 'pewniak': isVolatilityCapped = true; break;
                    case 'ryzykant': volatilityModifier += 0.10; break; // NOWA LINIA
                    case 'ksiegowy': volatilityModifier *= 0.95; break; // NOWA LINIA
                    case 'lowca_glow': volatilityModifier += 0.15; break; // NOWA LINIA
                }
            });
        }

        // Reszta funkcji pozostaje taka sama, jak w Twoim pliku
        if (!stock.currentCandle || !stock.candlestickHistory) {
            stock.candlestickHistory = [];
            stock.lineHistory = [];
            stock.currentCandle = { time: now, open: stock.price, high: stock.price, low: stock.price, close: stock.price };
        }

        let change;

        let effectiveVolatility = stock.volatilityFactor * volatilityModifier;

        if (isVolatilityCapped) {
            if (effectiveVolatility < 0.5) effectiveVolatility = 0.5;
            if (effectiveVolatility > 3.0) effectiveVolatility = 3.0;
        }

        if (stock.marketBehavior) {
            // ... (logika IPO bez zmian) ...
        }

        if (stock.activePositiveBoostUntil && now < stock.activePositiveBoostUntil) {
            change = (0.015 + Math.random() * 0.025) * effectiveVolatility;
        } else if (stock.activeNegativeBoostUntil && now < stock.activeNegativeBoostUntil) {
            change = -(0.015 + Math.random() * 0.025) * effectiveVolatility;
        } else {
            if (stock.activePositiveBoostUntil && now >= stock.activePositiveBoostUntil) stock.activePositiveBoostUntil = null;
            if (stock.activeNegativeBoostUntil && now >= stock.activeNegativeBoostUntil) stock.activeNegativeBoostUntil = null;
            change = (Math.random() - 0.5) * 0.2 * effectiveVolatility * marketModifier;
        }

        const priceDrift = stock.price * 0.00005 * (priceGrowthModifier - 1.0);
        stock.price += change + priceDrift;

        if (stock.price < 0.01) stock.price = 0.01;

        if (stock.price < 1.00 && !stock.isTradeLocked) {
            if (Math.random() < 0.80) {
                stock.isTradeLocked = true;
                logEvent(`⛔ Handel akcjami ${stock.name} (${stock.symbol}) został tymczasowo wstrzymany z powodu niskiej ceny!`, 'review');
            }
        } else if (stock.price > 1.50 && stock.isTradeLocked) {
            stock.isTradeLocked = false;
            logEvent(`✅ Handel akcjami ${stock.name} (${stock.symbol}) został wznowiony!`, 'review');
        }

        if (stock.financialHealth <= -5 && !stock.isBankrupt) {
            let canGoBankrupt = true;
            if (stock.ceo && stock.ceo.traits.some(t => t.id === 'bogacz')) {
                canGoBankrupt = false;
                if (stock.financialHealth < -4) stock.financialHealth = -4; // Blokada na -4
            }
        }

        let historyLimit = 15;
        const mindLevel = getSkillLevel('analyticalMind');
        if (mindLevel === 1) historyLimit = 20;
        if (mindLevel === 2) historyLimit = 25;

        stock.lineHistory.push({ time: now, price: stock.price });
        if (stock.lineHistory.length > (historyLimit * 60)) {
            stock.lineHistory.shift();
        }

        const candle = stock.currentCandle;
        candle.close = stock.price;
        if (stock.price > candle.high) candle.high = stock.price;
        if (stock.price < candle.low) candle.low = stock.price;

        if (now - candle.time >= CANDLE_INTERVAL) {
            stock.candlestickHistory.push(candle);
            if (stock.candlestickHistory.length > historyLimit * 4) {
                stock.candlestickHistory.shift();
            }
            stock.currentCandle = { time: now, open: stock.price, high: stock.price, low: stock.price, close: stock.price };
        }
    });

    etfs.forEach(etf => {
        const underlyingStocks = stocks.filter(stock =>
            stock.sector.some(s => etf.targetSectors.includes(s))
        );
        if (underlyingStocks.length > 0) {
            const totalValue = underlyingStocks.reduce((sum, stock) => sum + stock.price, 0);
            etf.price = totalValue / underlyingStocks.length;
            etf.priceHistory.push(etf.price);
            if (etf.priceHistory.length > 15) {
                etf.priceHistory.shift();
            }
        }
    });
}

function buyStock(symbol, quantity) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const stockToBuy = stocks.find(stock => stock.symbol === symbol);
    if (!stockToBuy) {
        alert("Błąd systemowy: Nie znaleziono takiej akcji!");
        return;
    }
    if (stockToBuy.isStateOwned && getSkillLevel('nepotism') === 0) {
        alert("Nie masz odpowiednich znajomości, aby inwestować w tę strategiczną spółkę Skarbu Państwa!");
        return;
    }
    if (stockToBuy.isTradeLocked) {
        alert(`Handel akcjami ${stockToBuy.name} jest tymczasowo wstrzymany!`);
        return;
    }
    const currentSharesHeld = stockToBuy.sharesHeld || 0; // Zabezpieczenie przed błędem NaN

    let sharesOnMarket;
    if (stockToBuy.isStateOwned) {
        const publicFloat = Math.floor(stockToBuy.totalShares * (1 - stockToBuy.stateOwnershipPct));
        sharesOnMarket = publicFloat - stockToBuy.sharesHeld;
    } else {
        sharesOnMarket = stockToBuy.totalShares;
    }
    if (quantity > sharesOnMarket) {
        alert(`Nie ma wystarczającej liczby akcji na rynku! Dostępne: ${availableShares}`);
        return;
    }

    /*
    const playerIsBank = false; // W przyszłości tu będzie sprawdzenie, czy gracz jest bankiem
    const targetIsBank = commercialBanks.some(b => b.id === `bank_${stockToBuy.symbol}` && b.isActive); // Placeholder
    if (playerIsBank && targetIsBank) {
        // TODO: Sprawdzić obecny udział gracza w banku-celu i zablokować, jeśli przekroczy 30%
        // console.log("Gracz (jako bank) próbuje kupić inny bank - sprawdzenie limitu (jeszcze nie zaimplementowane)");
    }
    */

    let totalCost = stockToBuy.price * quantity;
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        if (charismaLevel === 1) charismaBonus = 0.005;
        if (charismaLevel === 2) charismaBonus = 0.01;
        if (charismaLevel === 3) charismaBonus = 0.015;
        totalCost *= (1 - charismaBonus);
    }

    if (playerCash < totalCost) {
        alert("Nie masz wystarczająco gotówki, aby dokonać tego zakupu!");
        return;
    }

    playerCash -= totalCost;
    stockToBuy.sharesHeld += quantity;
    stockToBuy.price += (quantity * stockToBuy.price) * 0.000005;

    // --- NOWY FRAGMENT - ZAPIS TRANSAKCJI ---
    stockToBuy.playerTransactions.push({
        type: 'buy',
        time: Date.now(),
        price: stockToBuy.price,
        quantity: quantity
    });
    // --- KONIEC NOWEGO FRAGMENTU ---

    if (playerPortfolio[symbol]) {
        const existingHolding = playerPortfolio[symbol];
        const oldTotalValue = existingHolding.avgPrice * existingHolding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        existingHolding.shares += quantity;
        existingHolding.avgPrice = newTotalValue / existingHolding.shares;
    } else {
        playerPortfolio[symbol] = {
            shares: quantity,
            avgPrice: stockToBuy.price
        };
    }

    const playerShares = playerPortfolio[symbol]?.shares || 0;
    const ownershipPct = (playerShares / stockToBuy.totalShares) * 100;
    if (ownershipPct > 50) {
        const repGain = Math.floor(quantity / 100) * 0.5;
        if (repGain > 0) {
            changeReputation('player', symbol, repGain);
        }
    }
    displayCash();
    displayStocks(getCurrentInputValues());
    displayPortfolio();
    checkPlayerTierUpgrade();
}

function sellStock(symbol, quantity) {
    const stockToSell = stocks.find(stock => stock.symbol === symbol);
    const holding = playerPortfolio[symbol];

    if (!holding || holding.shares < quantity) {
        alert(`Nie masz wystarczającej liczby akcji ${stockToSell ? stockToSell.name : symbol}.`);
        return;
    }

    if (stockToSell.isTradeLocked) {
        alert(`Handel akcjami ${stockToSell.name} jest tymczasowo wstrzymany!`);
        return;
    }

    let totalGain = stockToSell.price * quantity;
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        if (charismaLevel === 1) charismaBonus = 0.005;
        if (charismaLevel === 2) charismaBonus = 0.01;
        if (charismaLevel === 3) charismaBonus = 0.015;
        totalGain *= (1 + charismaBonus);
    }

    const profitPerShare = (totalGain / quantity) - holding.avgPrice;
    const totalProfit = profitPerShare * quantity;

    if (totalProfit > 0) {
        let xpGained = totalProfit / 100;
        if (getSkillLevel('sharkCharisma') === 3) xpGained *= 1.10;

        // --- NOWY BLOK ---
        if (stockToSell.ceo?.traits?.some(t => t.id === 'patron')) {
            xpGained *= 1.10; // +10% XP
            logEvent(`🤝 [CEO] Patron z ${stockToSell.name} docenia Twój zmysł inwestycyjny! Otrzymujesz bonusowe XP.`);
        }
        // --- KONIEC NOWEGO BLOKU ---

        if (xpGained > 0) {
            playerXP += xpGained;
            displayXP();
        }
    }

    playerCash += totalGain;
    holding.shares -= quantity;
    stockToSell.sharesHeld -= quantity;
    stockToSell.price -= (quantity * stockToSell.price) * 0.000005;

    if (holding.shares === 0) {
        stockToSell.playerTransactions = [];
        delete playerPortfolio[symbol];
    }

    displayCash();
    displayStocks(getCurrentInputValues());
    displayPortfolio();
    checkPlayerTierUpgrade();
}

function sellAllShares(symbol) {
    const holding = playerPortfolio[symbol];
    if (!holding || holding.shares <= 0) {
        alert("Nie posiadasz akcji tej spółki.");
        return;
    }
    // Wywołujemy istniejącą funkcję sellStock z całą posiadaną ilością
    sellStock(symbol, holding.shares);
}


function buySkill(skillId) {
    const nextLevelInfo = getNextSkillLevelInfo(skillId);
    if (!nextLevelInfo) return;

    // --- POCZĄTEK POPRAWKI: Sprawdzanie wymagań przed zakupem ---
    const requirement = nextLevelInfo.requires;
    const requirementMet = requirement ? getSkillLevel(requirement.skillId) >= requirement.level : true;

    if (!requirementMet) {
        alert("Nie spełniasz wymagań, aby odblokować tę umiejętność!");
        return;
    }
    // --- KONIEC POPRAWKI ---

    if (playerXP >= nextLevelInfo.cost) {
        playerXP -= nextLevelInfo.cost;
        skills[skillId].unlockedLevel++;
        if (skillId === 'work' && skills[skillId].unlockedLevel === 4) {
            foundPlayerCompany();
        }
        displayXP();
        renderSkillsPanel();
    } else {
        alert("Za mało punktów doświadczenia (XP)!");
    }
}

function getStocksValue() {
    let totalValue = 0;
    for (const symbol in playerPortfolio) {
        const holding = playerPortfolio[symbol];
        const marketData = stocks.find(s => s.symbol === symbol);
        if (marketData) {
            totalValue += marketData.price * holding.shares;
        }
    }
    return totalValue;
}

function takeLoan() {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const loanAmountInput = document.getElementById('loan-amount');
    const amount = parseFloat(loanAmountInput.value);

    if (isNaN(amount) || amount <= 0) {
        alert("Proszę wpisać poprawną, dodatnią kwotę pożyczki.");
        return;
    }

    if (playerLoan.amount > 0) {
        alert("Musisz najpierw spłacić obecną pożyczkę, zanim weźmiesz kolejną!");
        return;
    }

    const totalPortfolioValue = playerCash + getStocksValue();
    let loanLimit = totalPortfolioValue * 0.5;
    if (getSkillLevel('hardNegotiator') === 3) {
        loanLimit *= 1.10; // Zwiększenie limitu o 10% na 3 poziomie
    } processWeeklyInterest

    if (amount > loanLimit) {
        alert(`Nie możesz pożyczyć tyle pieniędzy! Twój maksymalny limit kredytowy to ${Math.max(0, loanLimit).toFixed(2)} PLN.`);
        return;
    }

    playerCash += amount;
    playerLoan.amount = amount;
    // Rata tygodniowa to 2% pożyczonej kwoty + odsetki (zmieniono z 5% na 2% dla lepszego balansu)
    playerLoan.weeklyPayment = (amount * 0.02) + (amount * (LOAN_INTEREST_RATE / 52));
    playerLoan.missedPayments = 0;

    loanAmountInput.value = '';
    logEvent(`🏦 Wzięto pożyczkę w wysokości ${amount.toFixed(2)} PLN. Twoja tygodniowa rata wynosi ${playerLoan.weeklyPayment.toFixed(2)} PLN.`, 'market');
    displayCash();
    openBankModal();
}
function repayLoan() {
    const loanAmountInput = document.getElementById('loan-amount');
    const amount = parseFloat(loanAmountInput.value);

    if (isNaN(amount) || amount <= 0) {
        alert("Proszę wpisać poprawną, dodatnią kwotę do spłaty.");
        return;
    }

    const amountToRepay = Math.min(amount, playerLoan.amount);

    if (amountToRepay > playerCash) {
        alert("Nie masz wystarczająco gotówki, aby spłacić tę kwotę.");
        return;
    }

    playerCash -= amountToRepay;
    playerLoan.amount -= amountToRepay;

    // Po spłacie części długu, rata powinna zostać przeliczona
    if (playerLoan.amount > 0) {
        playerLoan.weeklyPayment = (playerLoan.amount * 0.02) + (playerLoan.amount * (LOAN_INTEREST_RATE / 52));
    } else {
        // Jeśli pożyczka spłacona w całości, resetujemy system
        playerLoan.amount = 0;
        playerLoan.weeklyPayment = 0;
        playerLoan.missedPayments = 0;
        logEvent(`🎉 Gratulacje! Pożyczka została w całości spłacona!`, 'review');
    }

    loanAmountInput.value = '';

    // --- NOWY BLOK: Resetowanie licznika kar ---
    // Jeśli gracz dokonał jakiejkolwiek ręcznej spłaty, resetujemy licznik pominiętych rat
    if (amountToRepay > 0 && playerLoan.missedPayments > 0) {
        playerLoan.missedPayments = 0;
        logEvent(`✅ KONTO ODBLOKOWANE! Ręczna spłata kredytu przywróciła Twoją wiarygodność. Możesz znowu inwestować.`, 'success');
        showToast("Konto inwestycyjne odblokowane!", 'success');
    }
    // --- KONIEC NOWEGO BLOKU ---

    displayCash();
    openBankModal();
}

function processLoanRepayment() {
    if (playerLoan.amount <= 0) {
        return; // Nie rób nic, jeśli nie ma pożyczki
    }

    // Odsetki naliczają się co tydzień od pozostałej kwoty
    let currentLoanInterestRate = LOAN_INTEREST_RATE;
    const negotiatorLevel = getSkillLevel('hardNegotiator');
    if (negotiatorLevel > 0) {
        let interestModifier = 1.0;
        switch (negotiatorLevel) {
            case 1: interestModifier = 0.90; break; // 10% zniżki
            case 2: interestModifier = 0.80; break; // 20% zniżki
            case 3: interestModifier = 0.75; break; // 25% zniżki
        }
        currentLoanInterestRate *= interestModifier;
    }
    const weeklyInterest = playerLoan.amount * (currentLoanInterestRate / 52);
    playerLoan.amount += weeklyInterest;
    logEvent(`🏦 Naliczono odsetki od kredytu w wysokości ${weeklyInterest.toFixed(2)} PLN.`, 'market');

    // Spłata raty tylko jeśli auto-spłata jest włączona
    if (isAutoRepayEnabled) {
        if (playerCash >= playerLoan.weeklyPayment) {
            // Gracz ma pieniądze, pobieramy ratę
            const amountPaid = Math.min(playerLoan.amount, playerLoan.weeklyPayment); // Nie spłacaj więcej niż zostało długu
            playerCash -= amountPaid;
            playerLoan.amount -= amountPaid;
            logEvent(`🏦 Automatycznie spłacono ratę kredytu w wysokości ${amountPaid.toFixed(2)} PLN.`, 'market');

            if (playerLoan.amount <= 0) {
                playerLoan.amount = 0;
                playerLoan.weeklyPayment = 0;
                playerLoan.missedPayments = 0;
                logEvent(`🎉 Gratulacje! Pożyczka została w całości spłacona!`, 'review');
            } else {
                // Przelicz ratę po spłacie
                playerLoan.weeklyPayment = (playerLoan.amount * 0.02) + (playerLoan.amount * (LOAN_INTEREST_RATE / 52));
            }
        } else {
            // --- POCZĄTEK POPRAWKI: NOWA LOGIKA KARY ---
            // Gracz nie ma pieniędzy na spłatę
            playerLoan.missedPayments++;

            // Zamiast psuć OPROCENTOWANIE, doliczamy jednorazową opłatę karną
            const penaltyFee = playerLoan.weeklyPayment * 0.25; // Kara 25% wartości pominiętej raty
            playerLoan.amount += penaltyFee; // Opłata karna jest dodawana do głównego długu

            logEvent(`🚨 OSTRZEŻENIE! Brak środków na spłatę raty! Doliczono opłatę karną: ${penaltyFee.toFixed(2)} PLN. Liczba pominiętych rat: ${playerLoan.missedPayments}.`, 'review');

            // Konsekwencje (Blokada + Zajęcie depozytu)
            if (playerLoan.missedPayments >= 3) {
                logEvent(`❌ KONTO ZABLOKOWANE! Z powodu 3 pominiętych rat, możliwość inwestowania została wstrzymana!`, 'error');

                // Bank automatycznie spróbuje pobrać środki z depozytu, jeśli są dostępne
                if (playerDeposit > 0) {
                    const amountToSeize = Math.min(playerDeposit, playerLoan.amount);
                    playerDeposit -= amountToSeize;
                    playerLoan.amount -= amountToSeize;
                    logEvent(`🏦 BANK ZAJĄŁ TWOJĄ LOKATĘ! Wpłata ${amountToSeize.toFixed(2)} PLN z depozytu na poczet długu!`, 'review');

                    // Sprawdźmy, czy to wystarczyło do "spłaty" zaległej raty
                    if (amountToSeize >= playerLoan.weeklyPayment) {
                        playerLoan.missedPayments = 0; // Wyzeruj licznik, jeśli lokata pokryła zaległości
                        logEvent(`✅ KONTO ODBLOKOWANE! Lokata pokryła zaległości. Możesz znowu inwestować.`, 'success');
                    }
                }
            }
            // --- KONIEC POPRAWKI ---
        }
    }

    displayCash();
    if (document.getElementById('bank-modal').style.display === 'block') {
        openBankModal();
    }
}

function makeDeposit() {
    const depositAmountInput = document.getElementById('deposit-amount');
    const amount = parseFloat(depositAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert("Proszę wpisać poprawną, dodatnią kwotę depozytu.");
        return;
    }
    if (amount > playerCash) {
        alert("Nie masz wystarczająco gotówki, aby złożyć taki depozyt.");
        return;
    }
    playerCash -= amount;
    playerDeposit += amount;
    depositAmountInput.value = '';
    displayCash();
    openBankModal();
}

function withdrawDeposit() {
    const depositAmountInput = document.getElementById('deposit-amount');
    const amount = parseFloat(depositAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert("Proszę wpisać poprawną, dodatnią kwotę do wypłaty.");
        return;
    }
    if (amount > playerDeposit) {
        alert(`Nie możesz wypłacić więcej, niż masz na depozycie. Dostępne środki: ${playerDeposit.toFixed(2)} PLN.`);
        return;
    }
    playerDeposit -= amount;
    playerCash += amount;
    depositAmountInput.value = '';
    displayCash();
    openBankModal();
}

function processWeeklyInterest() {
    updateInterestRates(); // Zmieniono z `processLoanRepayment` na `processWeeklyInterest`

    if (playerDeposit > 0) {
        let currentDepositRate = DEPOSIT_INTEREST_RATE;
        const magnetLevel = getSkillLevel('bankMagnet');

        if (magnetLevel > 0) {
            let depositBonus = 1.0;
            switch (magnetLevel) {
                case 1: depositBonus = 1.10; break; // +10%
                case 2: depositBonus = 1.20; break; // +20%
                case 3: depositBonus = 1.25; break; // +25%
            }
            currentDepositRate *= depositBonus;
        }

        const weeklyDepositRate = currentDepositRate / 52;
        const depositInterest = playerDeposit * weeklyDepositRate;
        playerCash += depositInterest;

        const interestMessage = `Naliczono odsetki od depozytu: ${depositInterest.toFixed(2)} PLN.`;
        logEvent(`🏦 ${interestMessage}`, 'market');

        // Bonus XP za 3 poziom umiejętności
        if (magnetLevel === 3 && playerDeposit >= 100000) {
            const xpBonus = 50; // Przykładowa stała wartość bonusu
            playerXP += xpBonus;
            logEvent(`🧲 Otrzymujesz ${xpBonus} XP bonusu od Bankowego Magnesu za utrzymanie dużego depozytu!`, 'review');
            displayXP(); // Aktualizujemy interfejs
        }
    }

    displayCash();
}

// SCALONA WERSJA updateInterestRates (Twoja wersja, bo jest nowsza)
function updateInterestRates() {
    // Stopy rynkowe są sumą stopy bazowej BC i stałej marży rynkowej
    LOAN_INTEREST_RATE = centralBank.baseInterestRate + 0.05; // Marża 5% ponad stopę BC
    DEPOSIT_INTEREST_RATE = centralBank.baseInterestRate + 0.01; // Marża 1% ponad stopę BC

    // Upewnij się, że stopy nie spadną poniżej minimum
    LOAN_INTEREST_RATE = Math.max(0.01, LOAN_INTEREST_RATE);
    DEPOSIT_INTEREST_RATE = Math.max(0.005, DEPOSIT_INTEREST_RATE);

    // Aktualizuj oprocentowanie w bankach komercyjnych (teraz bazuje na globalnych stopach)
    commercialBanks.forEach(bank => {
        if (bank.isActive) {
            bank.interestRateLoan = LOAN_INTEREST_RATE + bank.baseInterestRateMargin;
            bank.interestRateDeposit = DEPOSIT_INTEREST_RATE + bank.baseInterestRateMargin * 0.5; // Marża depozytowa niższa
        }
    });
  // Aktualizuj UI Banku Centralnego, jeśli otwarty
    const bankModal = document.getElementById('bank-modal');
    const centralTab = document.getElementById('bank-content-central');
    if (bankModal?.style.display === 'block' && centralTab?.style.display === 'block') {
         const baseRateEl = document.getElementById('bc-base-rate-display');
         if(baseRateEl) baseRateEl.textContent = (centralBank.baseInterestRate * 100).toFixed(1); // Aktualizuj stopę bazową
    }
}

function checkPlayerTierUpgrade() {
    let newAccessLevel = playerAccessLevel;
    const totalPortfolioValue = playerCash + getStocksValue();
    if (totalPortfolioValue >= 35000 && playerAccessLevel < 1) {
        newAccessLevel = 1;
    }
    if (totalPortfolioValue >= 150000 && playerAccessLevel < 2) {
        newAccessLevel = 2;
    }
    if (totalPortfolioValue >= 310000 && playerAccessLevel < 3) {
        newAccessLevel = 3;
    }
    if (totalPortfolioValue >= 750000 && playerAccessLevel < 4) {
        newAccessLevel = 4;
    }
    for (const symbol in playerPortfolio) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) {
            const stockExchangeLevel = exchanges[stock.exchange].level;
            if (stockExchangeLevel > newAccessLevel) {
                newAccessLevel = stockExchangeLevel;
            }
        }
    }
    if (newAccessLevel > playerAccessLevel) {
        playerAccessLevel = newAccessLevel;
        const newExchange = Object.values(exchanges).find(e => e.level === newAccessLevel);
        const message = `🎉 GRATULACJE! Uzyskano dostęp do: ${newExchange.name}`;
        displayEventMessage(message, 30, null, 'review');
    }
}




function buyExchangeLicense() {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const nextLevel = playerAccessLevel + 1;
    const nextExchange = Object.values(exchanges).find(e => e.level === nextLevel);
    if (!nextExchange) {
        alert("Błąd: Nie ma kolejnego poziomu do odblokowania.");
        return;
    }
    const cost = nextExchange.licenseCost;
    if (playerCash >= cost) {
        playerCash -= cost;
        playerAccessLevel++;
        const message = `✅ Zakupiono licencję! Uzyskano dostęp do: ${newExchange.name}`;
        logEvent(message, 'market');
        displayCash();
        displayStocks(getCurrentInputValues());
        openBankModal();
    } else {
        alert("Nie masz wystarczająco gotówki, aby kupić tę licencję.");
    }
}

function buyEtf(symbol, quantity) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    if (getSkillLevel('etfExpert') === 0) { // POPRAWKA WARUNKU
        alert("Musisz odblokować umiejętność 'Ekspert Rynków Globalnych', aby handlować funduszami ETF!");
        return;
    }

    const etfToBuy = etfs.find(e => e.symbol === symbol);
    if (!etfToBuy) {
        alert("Błąd systemowy: Nie znaleziono takiego funduszu ETF!");
        return;
    }

    let totalCost = etfToBuy.price * quantity;
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        switch (charismaLevel) {
            case 1: charismaBonus = 0.005; break; // 0.5%
            case 2: charismaBonus = 0.01; break;  // 1.0%
            case 3: charismaBonus = 0.015; break; // 1.5%
        }
        totalCost *= (1 - charismaBonus); // Przy sprzedaży dodajemy bonus
    }

    if (playerCash < totalCost) {
        alert("Nie masz wystarczająco gotówki, aby dokonać tego zakupu!");
        return;
    }

    playerCash -= totalCost;

    if (playerPortfolio[symbol]) {
        const existingHolding = playerPortfolio[symbol];
        const oldTotalValue = existingHolding.avgPrice * existingHolding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        existingHolding.shares += quantity;
        existingHolding.avgPrice = newTotalValue / existingHolding.shares;
    } else {
        playerPortfolio[symbol] = {
            shares: quantity,
            avgPrice: etfToBuy.price,
            assetType: 'etf'
        };
    }

    displayCash();
    displayPortfolio();
    checkPlayerTierUpgrade();
}

function sellEtf(symbol, quantity) {
    const etfToSell = etfs.find(e => e.symbol === symbol);
    const holding = playerPortfolio[symbol];

    // BŁĄD W ORYGINALE: Ta funkcja powinna sprawdzać 'etfExpert', a nie 'indexAnalystLvl1'
    if (getSkillLevel('etfExpert') === 0) { 
        alert("Musisz odblokować umiejętność 'Ekspert Rynków Globalnych', aby handlować funduszami ETF!");
        return;
    }


    let totalGain = etfToSell.price * quantity;
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        switch (charismaLevel) {
            case 1: charismaBonus = 0.005; break; // 0.5%
            case 2: charismaBonus = 0.01; break;  // 1.0%
            case 3: charismaBonus = 0.015; break; // 1.5%
        }
        totalGain *= (1 + charismaBonus); // Przy sprzedaży dodajemy bonus
    }

    const profitPerShare = (totalGain / quantity) - holding.avgPrice;
    const totalProfit = profitPerShare * quantity;
    console.log(`Sprzedaż ${quantity} jedn. ${symbol}. Zysk/strata na transakcji: ${totalProfit.toFixed(2)} PLN`);

    if (totalProfit > 0) {
        const xpGained = totalProfit / 100;
        if (xpGained > 0) {
            playerXP += xpGained;
            displayXP();
        }
    }

    playerCash += totalGain;
    holding.shares -= quantity;

    if (holding.shares === 0) {
        delete playerPortfolio[symbol];
    }

    displayCash();
    displayPortfolio();
    checkPlayerTierUpgrade();
}
/**
 * Funkcja do zakupu subskrypcji premium "Pulsu Rynku".
 */
function buyPremiumSubscription() {
    if (playerHasPremiumSubscription) {
        alert("Posiadasz już aktywną subskrypcję!");
        return;
    }

    if (playerCash < PREMIUM_SUBSCRIPTION_COST) {
        alert("Nie masz wystarczająco gotówki, aby zakupić subskrypcję!");
        return;
    }

    playerCash -= PREMIUM_SUBSCRIPTION_COST;
    playerHasPremiumSubscription = true;
    premiumSubscriptionEndTime = Date.now() + PREMIUM_SUBSCRIPTION_DURATION;

    displayCash();
    logEvent(`📰 Zakupiono subskrypcję premium "Pulsu Rynku"! Dostęp ważny przez 7 dni.`);

    // Odśwież widok gazety, jeśli jest otwarta
    if (document.getElementById('newspaper-modal').style.display === 'block') {
        openNewspaperModal();
    }
}

/**
 * Sprawdza, czy subskrypcja gracza wygasła.
 */
function checkSubscriptionStatus() {
    if (playerHasPremiumSubscription && Date.now() > premiumSubscriptionEndTime) {
        playerHasPremiumSubscription = false;
        logEvent("📰 Twoja subskrypcja premium 'Pulsu Rynku' wygasła.");
        alert("Twoja subskrypcja premium 'Pulsu Rynku' wygasła!");
    }
}

function generatePremiumRumor() {
    // Generuj plotkę tylko jeśli gracz ma subskrypcję i jest mała szansa na to w danym cyklu
    if (!playerHasPremiumSubscription || Math.random() > 0.3) {
        return;
    }

    const prompt = getRandomElement(premiumNewsPrompts);
    let rumorText = "";
    let targetStock = null;

    if (prompt.scope === 'company') {
        targetStock = getRandomElement(stocks);
        rumorText = prompt.message(targetStock.name);
    } else if (prompt.scope === 'sector') {
        const targetSector = getRandomElement(prompt.targetSectors);
        rumorText = prompt.message(targetSector);
    }

    // Dodaj plotkę do listy aktywnych
    activePremiumRumors.unshift({ text: rumorText, date: new Date() });
    // Ogranicz liczbę plotek do 5
    if (activePremiumRumors.length > 5) activePremiumRumors.pop();

    logEvent(`📰 [Puls Rynku] Nowa wiadomość w strefie premium!`);

    // Ustaw "tykającą bombę" - zdarzenie, które może, ale nie musi się wydarzyć
    const delay = getRandomIntInRange(20, 40) * 1000; // Opóźnienie od 20 do 40 sekund
    setTimeout(() => {
        if (Math.random() < prompt.chanceToHappen) {
            // Plotka okazała się prawdziwa!
            console.log(`[Puls Rynku] Plotka "${prompt.id}" okazała się prawdziwa!`);
            const magnitude = (Math.random() * 0.1) + 0.05; // Wpływ 5-15%
            const finalMagnitude = prompt.type === 'positive' ? magnitude : -magnitude;

            if (prompt.scope === 'company' && targetStock) {
                displayEventMessage(`[Z OSTATNIEJ CHWILI] Potwierdziły się doniesienia o ${targetStock.name}!`, 30, finalMagnitude);
                applyPriceEffect(targetStock.symbol, finalMagnitude);
            } else if (prompt.scope === 'sector') {
                // Tutaj można by zaimplementować logikę dla całego sektora
            }
        } else {
            // Plotka była fałszywa
            console.log(`[Puls Rynku] Plotka "${prompt.id}" okazała się fałszywa.`);
        }
    }, delay);
}

function processFinancialReports() {
    console.log("[RAPORTY KWARTALNE] Rozpoczęto przetwarzanie raportów finansowych...");

    // Zmienna pomocnicza do zliczania technologii dla Instytutów Badawczych
    let totalUnlockedTechs = 0;
    stocks.forEach(s => {
        if (s.research && s.research.unlockedTechs) {
            totalUnlockedTechs += s.research.unlockedTechs.length;
        }
    });

    for (let i = stocks.length - 1; i >= 0; i--) {
        const stock = stocks[i];

        // Pomiń start-upy w fazie inkubacji, one nie generują raportów
        if (stock.assetType === 'Startup' || stock.isBankrupt) continue;

        let quarterlyEarnings = 0;
        const marketCap = stock.price * stock.totalShares;

        // =====================================================================
        // === GŁÓWNA LOGIKA UNIKALNYCH MECHANIK ZAROBKOWYCH ===
        // =====================================================================

        if (stock.assetType === 'REIT') {
            // 🏡 REITy zarabiają na "wynajmie" (stały % od aktywów)
            const rentalIncomeRate = 0.02; // 2% przychodu od wartości aktywów na kwartał
            const maintenanceCostRate = 0.005; // 0.5% kosztów
            const healthModifier = 1 + (stock.financialHealth / 50); // Modyfikator +/- 10%
            
            const rentalIncome = stock.balanceSheet.assets * rentalIncomeRate;
            const maintenanceCosts = stock.balanceSheet.assets * maintenanceCostRate;
            quarterlyEarnings = (rentalIncome - maintenanceCosts) * healthModifier;

        } else if (stock.assetType === 'Holding') {
            // 🏢 Holdingi zarabiają na zarządzaniu i inwestycjach
            const portfolioValue = Object.values(stock.holdingPortfolio).reduce((sum, holding) => {
                const ownedStock = stocks.find(s => s.symbol === Object.keys(stock.holdingPortfolio).find(key => stock.holdingPortfolio[key] === holding));
                return sum + (ownedStock ? ownedStock.price * holding.quantity : 0);
            }, 0);
            
            const managementFee = (stock.cash + portfolioValue) * 0.0025; // 0.25% opłaty za zarządzanie
            
            // Symulacja zysku/straty na portfelu na podstawie kondycji i losowości
            const portfolioPerformance = portfolioValue * ((stock.financialHealth * 0.005) + getRandomInRange(-0.02, 0.02));
            
            quarterlyEarnings = managementFee + portfolioPerformance;

        } else if (stock.assetType === 'ResearchInstitute') {
            // 🧪 Instytuty zarabiają na ogólnym postępie technologicznym
            const earningsPerTech = 5000;
            quarterlyEarnings = totalUnlockedTechs * earningsPerTech * getRandomInRange(0.9, 1.1);

        } else if (stock.isStateOwned) {
            // 🏛️ Spółki państwowe działają normalnie, ale z interwencją państwa
            const baseEarnings = marketCap * ((stock.financialHealth * 0.01) + getRandomInRange(-0.015, 0.015));
            if (baseEarnings < 0) {
                const subsidy = Math.abs(baseEarnings) * 0.70; // Państwo pokrywa 70% strat
                quarterlyEarnings = baseEarnings + subsidy;
                logEvent(`🏛️ ${stock.name} otrzymuje dotację w wys. ${subsidy.toFixed(0)} PLN na pokrycie strat.`, 'state');
            } else {
                const specialTax = baseEarnings * 0.40; // Państwo zabiera 40% zysku
                quarterlyEarnings = baseEarnings - specialTax;
                logEvent(`🏛️ ${stock.name} odprowadza do budżetu państwa ${specialTax.toFixed(0)} PLN specjalnego podatku.`, 'state');
            }

        } else {
            // 🏭 Standardowe spółki (logika, którą już zaimplementowaliśmy)
            const earningsBase = (stock.financialHealth * 0.01) + (getRandomInRange(-0.015, 0.015));
            quarterlyEarnings = marketCap * earningsBase;
        }

        stock.quarterlyEarnings = quarterlyEarnings;

        // --- Aktualizacja bilansu na podstawie obliczonych zysków ---
        if (stock.balanceSheet) {
            stock.balanceSheet.assets += quarterlyEarnings;
            stock.balanceSheet.retainedEarnings += quarterlyEarnings;

            if (quarterlyEarnings < 0 && stock.assetType !== 'Holding') { // Holdingi zarządzają gotówką inaczej
                const debtIncrease = Math.abs(quarterlyEarnings) * getRandomInRange(0.1, 0.4);
                stock.balanceSheet.liabilities += debtIncrease;
                stock.balanceSheet.assets += debtIncrease;
            } else if (quarterlyEarnings > 0 && stock.balanceSheet.liabilities > 0) {
                const debtRepayment = quarterlyEarnings * getRandomInRange(0.1, 0.3);
                const actualRepayment = Math.min(debtRepayment, stock.balanceSheet.liabilities);
                stock.balanceSheet.liabilities -= actualRepayment;
                stock.balanceSheet.assets -= actualRepayment;
            }
        }
        
        // =====================================================================
        // === KONIEC GŁÓWNEJ LOGIKI - RESZTA FUNKCJI POZOSTAJE PODOBNA ===
        // =====================================================================

        // Losowa zmiana kondycji finansowej (dla wszystkich)
        const healthChange = getRandomIntInRange(-1, 1);
        stock.financialHealth += healthChange;
        if (stock.financialHealth > 5) stock.financialHealth = 5;
        if (stock.financialHealth < -5) stock.financialHealth = -5;
        
        // Logika bankructwa (działa dla wszystkich typów, które mogą zbankrutować)
        const equity = stock.balanceSheet ? stock.balanceSheet.assets - stock.balanceSheet.liabilities : stock.financialHealth;
        if ((equity <= 0 || stock.financialHealth <= -5) && !stock.isBankrupt) {
             let bankruptcyChance = 0.30;
             if (stock.ceo?.traits?.some(t => t.id === 'bogacz')) {
                 bankruptcyChance = 0;
                 logEvent(`[CEO] Prywatne środki i wpływy prezesa ratują ${stock.name} przed bankructwem!`);
                 if (stock.balanceSheet) {
                    const bailout = Math.abs(equity) + (stock.price * stock.totalShares * 0.1);
                    stock.balanceSheet.assets += bailout;
                    stock.balanceSheet.retainedEarnings += bailout;
                 }
                 stock.financialHealth = 1;
             } else if (stock.assetType === 'REIT') {
                bankruptcyChance = 0.05;
             }

             if (bankruptcyChance > 0 && Math.random() < bankruptcyChance) {
                 logEvent(`🔥 BANKRUCTWO! Spółka ${stock.name} (${stock.symbol}) ogłasza upadłość!`, 'review');
                 if (playerPortfolio[stock.symbol]) { delete playerPortfolio[stock.symbol]; }
                 aiCompetitors.forEach(ai => { if (ai.portfolio[stock.symbol]) { delete ai.portfolio[stock.symbol]; } });
                 stock.isBankrupt = true;
                 stock.timeOfDeath = Date.now();
             }
        }

        // Generowanie raportów i zdarzeń (wspólne dla wszystkich)
        let reportResult = 'neutral';
        let eventMessage = "";
        let magnitude = 0;

        // ... (logika raportów excellent/good/bad, emisji akcji, zmiany volatility etc.)
        
        if (stock.financialHealth >= 5) {
            reportResult = 'excellent';
            magnitude = getRandomInRange(0.10, 0.15);
            eventMessage = `📈 DOSKONAŁY RAPORT! ${stock.name} (${stock.symbol}) publikuje rekordowe zyski!`;
        } else if (stock.financialHealth >= 3) {
            reportResult = 'good';
            magnitude = getRandomInRange(0.04, 0.09);
            eventMessage = `📈 DOBRY RAPORT: Wyniki ${stock.name} (${stock.symbol}) powyżej oczekiwań.`;
        } else if (stock.financialHealth <= -5) {
            reportResult = 'tragic';
            magnitude = getRandomInRange(-0.12, -0.18);
            eventMessage = `📉 TRAGICZNY RAPORT! ${stock.name} (${stock.symbol}) ogłasza ogromne straty!`;
        } else if (stock.financialHealth <= -3) {
            reportResult = 'bad';
            magnitude = getRandomInRange(-0.05, -0.10);
            eventMessage = `📉 SŁABY RAPORT: ${stock.name} (${stock.symbol}) notuje wyniki poniżej prognoz.`;
        }

        stock.lastReport = reportResult;
        if (reportResult !== 'neutral') {
            logEvent(eventMessage);
            applyPriceEffect(stock.symbol, magnitude, reportResult === 'bad' || reportResult === 'tragic' ? 'negative' : 'positive', 'review');
        }

        const baseVolatility = initialStocks.find(s => s.symbol === stock.symbol)?.volatilityFactor || stock.volatilityFactor;
        if (stock.financialHealth > 0) {
            stock.volatilityFactor *= 0.95;
            if (stock.volatilityFactor < baseVolatility) stock.volatilityFactor = baseVolatility;
        } else if (stock.financialHealth < 0) {
            stock.volatilityFactor *= 1.05;
        }
        if (stock.volatilityFactor < 0.1) stock.volatilityFactor = 0.1;
    }

    // Estymacja dywidend i odświeżenie widoków (bez zmian)
    stocks.forEach(stock => {
        stock.lastQuarterValue = stock.price * stock.totalShares;
        if (stock.assetType === 'REIT') {
            stock.estimatedDividend = stock.dividendPerShare;
        } else if (stock.dividendPolicy && stock.dividendPolicy !== 'Growth') {
            const estimatedProfit = stock.quarterlyEarnings > 0 ? stock.quarterlyEarnings : 0;
            const estimatedTotal = estimatedProfit * 0.1; // Uproszczona estymacja
            stock.estimatedDividend = stock.totalShares > 0 ? estimatedTotal / stock.totalShares : 0;
        } else {
            stock.estimatedDividend = 0;
        }
    });

    displayStocks(getCurrentInputValues());
    displayPortfolio();
    console.log("[RAPORTY KWARTALNE] Przetwarzanie zakończone.");
    checkCompanyCounterActions();
}


function updateMarketIndexes() {
    // Zabezpieczenie na wypadek, gdyby nie było żadnych spółek
    if (stocks.length === 0) return;

    // --- Obliczanie GIG (Główny Indeks Giełdowy) ---
    // Średnia cena wszystkich akcji w grze.
    const gigIndex = marketIndexes.find(idx => idx.id === 'GIG');
    if (gigIndex) {
        const oldValue = gigIndex.value;
        const totalValue = stocks.reduce((sum, stock) => sum + stock.price, 0);
        const newValue = totalValue / stocks.length;
        gigIndex.value = newValue;
        gigIndex.change = newValue - oldValue;
    }

    // --- Obliczanie TIG5 i SIG20 (na podstawie kapitalizacji rynkowej) ---

    // 1. Stwórz tymczasową tablicę spółek z obliczoną kapitalizacją
    const stocksWithMarketCap = stocks.map(stock => ({
        ...stock,
        marketCap: stock.price * stock.totalShares
    }));

    // 2. Posortuj spółki od największej do najmniejszej pod względem kapitalizacji
    stocksWithMarketCap.sort((a, b) => b.marketCap - a.marketCap);

    // 3. Oblicz TIG5 (Topowy Indeks Giełdowy 5)
    const tig5Index = marketIndexes.find(idx => idx.id === 'TIG5');
    if (tig5Index) {
        const top5 = stocksWithMarketCap.slice(0, 5); // Weź 5 pierwszych spółek z posortowanej listy
        if (top5.length > 0) {
            const oldValue = tig5Index.value;
            const totalValue = top5.reduce((sum, stock) => sum + stock.price, 0);
            const newValue = totalValue / top5.length;
            tig5Index.value = newValue;
            tig5Index.change = newValue - oldValue;
        }
    }

    // 4. Oblicz SIG20 (Szeroki Indeks Giełdowy 20)
    const sig20Index = marketIndexes.find(idx => idx.id === 'SIG20');
    if (sig20Index) {
        const top20 = stocksWithMarketCap.slice(0, 20); // Weź 20 pierwszych spółek
        if (top20.length > 0) {
            const oldValue = sig20Index.value;
            const totalValue = top20.reduce((sum, stock) => sum + stock.price, 0);
            const newValue = totalValue / top20.length;
            sig20Index.value = newValue;
            sig20Index.change = newValue - oldValue;
        }
    }
}

function setDividendPolicy(symbol, newPolicy) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
        stock.dividendPolicy = newPolicy;
        logEvent(`👑 Na Twój wniosek, ${stock.name} zmienia politykę dywidendową na: ${newPolicy}.`, 'review');
        // Odśwież widok modala, jeśli jest otwarty
        if (document.getElementById('management-modal').style.display === 'block') {
            openManagementModal(symbol);
        }
    }
}

function buyIndex(indexId, quantity) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    // Sprawdzenie, czy gracz ma odblokowaną umiejętność Poziomu 2
    if (getSkillLevel('indexAnalystLvl1') < 2) {
        alert("Musisz odblokować umiejętność 'Makler Indeksowy' (Analityk Indeksowy poz. 2), aby handlować indeksami!");
        return;
    }

    const indexToBuy = marketIndexes.find(i => i.id === indexId);
    if (!indexToBuy) {
        alert("Błąd systemowy: Nie znaleziono takiego indeksu!");
        return;
    }

    let totalCost = indexToBuy.value * quantity;
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        switch (charismaLevel) {
            case 1: charismaBonus = 0.005; break; // 0.5%
            case 2: charismaBonus = 0.01; break;  // 1.0%
            case 3: charismaBonus = 0.015; break; // 1.5%
        }
        totalCost *= (1 - charismaBonus); // Przy sprzedaży dodajemy bonus
    }

    if (playerCash < totalCost) {
        alert("Nie masz wystarczająco gotówki, aby dokonać tego zakupu!");
        return;
    }

    playerCash -= totalCost;

    // Aktualizacja portfela
    if (playerPortfolio[indexId]) {
        const holding = playerPortfolio[indexId];
        const oldTotalValue = holding.avgPrice * holding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        holding.shares += quantity;
        holding.avgPrice = newTotalValue / holding.shares;
    } else {
        playerPortfolio[indexId] = {
            shares: quantity,
            avgPrice: indexToBuy.value,
            assetType: 'index' // Ważne do identyfikacji w portfelu!
        };
    }

    displayCash();
    displayPortfolio();
}

/**
 * Aplikuje procentową zmianę ceny na daną akcję, uwzględniając modyfikatory.
 * @param {string} stockSymbol - Symbol akcji, której cena ma się zmienić.
 * @param {number} percentageChange - Procentowa zmiana (np. 0.1 dla +10%, -0.05 dla -5%).
 * @param {string} eventType - Typ wydarzenia ('positive' lub 'negative').
 * @param {string} eventCategory - Kategoria wydarzenia ('market', 'company', 'state', 'review').
 */
function applyPriceEffect(stockSymbol, percentageChange, eventType, eventCategory = 'company') {
    const stock = stocks.find(s => s.symbol === stockSymbol);
    if (!stock) return;

    // --- Sekcja 1: Pełna odporność na zdarzenia (z cech CEO) ---
    // Te warunki sprawdzane są na samym początku, bo całkowicie anulują zdarzenie.

    // Cecha "Człowiek z Ludu" chroni przed negatywnymi zdarzeniami firmowymi.
    if (
        percentageChange < 0 &&
        eventCategory === 'company' &&
        stock.ceo?.traits?.some(t => t.id === 'czlowiek_z_ludu')
    ) {
        logEvent(`🛡️ [Człowiek z Ludu] Reputacja prezesa ${stock.name} ochroniła firmę przed negatywnymi skutkami zdarzenia!`);
        return; // Zakończ funkcję, nie aplikuj negatywnego efektu.
    }

    // Cecha "Tytan Przemysłu" chroni przed negatywnymi zdarzeniami rynkowymi i sektorowymi.
    if (
        percentageChange < 0 &&
        (eventCategory === 'market' || eventCategory === 'sector') &&
        stock.ceo?.traits?.some(t => t.id === 'tytan_przemyslu')
    ) {
        logEvent(`🛡️ [Tytan Przemysłu] Niewzruszona pozycja ${stock.name} na rynku uchroniła ją przed negatywnym zdarzeniem!`);
        return; // Zakończ funkcję.
    }

    // --- Sekcja 2: Obliczanie modyfikatorów ---
    const oldPrice = stock.price;
    let finalPercentageChange = percentageChange;

    // Modyfikatory wynikające z cech CEO
    if (stock.ceo && stock.ceo.traits) {
        stock.ceo.traits.forEach(trait => {
            switch (trait.id) {
                case 'prowiec':
                    if (finalPercentageChange > 0) finalPercentageChange *= 1.03;
                    break;
                case 'doswiadczony':
                    if (finalPercentageChange > 0) finalPercentageChange *= 1.01;
                    else finalPercentageChange *= 0.85;
                    break;
                case 'reakcjonista':
                    finalPercentageChange *= 1.10;
                    break;
                case 'stoik':
                    finalPercentageChange *= 0.75;
                    break;
                case 'legenda':
                    if (finalPercentageChange < 0) finalPercentageChange *= 0.50;
                    break;
                case 'ryzykant':
                    if (finalPercentageChange > 0) finalPercentageChange *= 1.05;
                    break;
                case 'plotkarz':
                    if (eventCategory === 'company') finalPercentageChange *= 1.10;
                    break;
            }
        });
    }

    // Modyfikatory dla negatywnych zdarzeń (odporność spółek państwowych i umiejętności gracza)
    if (finalPercentageChange < 0) {
        let totalResistance = 0;

        // Bazowa odporność spółki państwowej
        if (stock.isStateOwned && stock.eventResistance > 0) {
            totalResistance += stock.eventResistance;
        }

        // Dodatkowa odporność z cechy "Lojalista" dla spółek państwowych
        if (stock.isStateOwned && stock.ceo?.traits?.some(t => t.id === 'lojalista')) {
            totalResistance += 0.20;
        }

        // Zastosuj skumulowaną odporność
        if (totalResistance > 0) {
            finalPercentageChange *= (1 - Math.min(1, totalResistance)); // Ograniczenie do 100% odporności
        }

        // Umiejętność gracza "Żelazne Nerwy"
        const nervesLevel = getSkillLevel('ironNerves');
        if (nervesLevel > 0) {
            let nervesModifier = 1.0;
            switch (nervesLevel) {
                case 1: nervesModifier = 0.95; break; // 5% redukcji
                case 2: nervesModifier = 0.88; break; // 12% redukcji
                case 3: nervesModifier = 0.80; break; // 20% redukcji
            }
            finalPercentageChange *= nervesModifier;
        }

        // --- NOWY BLOK: Charyzma (z 'sharkCharisma') Lvl 1 i 4 ---
        // Redukuje negatywny wpływ zdarzeń losowych
        // POPRAWKA: Użyto 'sharkCharisma', ponieważ 'charisma' nie istnieje w gameLogic.js
        // SCALONO: (Używamy 'charisma' jak w definicji umiejętności)
        const charismaLevel = getSkillLevel('charisma'); 
        if (charismaLevel > 0) {
            let charismaModifier = 1.0;
            if (charismaLevel >= 3) {
                charismaModifier = 0.50; // 50% redukcji (Lvl 4)
            } else if (charismaLevel >= 1) {
                charismaModifier = 0.85; // 15% redukcji (Lvl 1-3)
            }
            finalPercentageChange *= charismaModifier;
        }
        // --- KONIEC NOWEGO BLOKU ---
    }

    // --- Sekcja 3: Zastosowanie finalnej zmiany ceny ---
    stock.price *= (1 + finalPercentageChange);

    // Zabezpieczenie przed ujemną ceną
    if (stock.price < 0.01) {
        stock.price = 0.01;
    }

    // Każde zdarzenie lekko zwiększa zmienność
    stock.volatilityFactor *= 1.1;

    console.log(`Efekt cenowy dla ${stock.name}: ${oldPrice.toFixed(2)} -> ${stock.price.toFixed(2)} (finalna zmiana: ${(finalPercentageChange * 100).toFixed(2)}%)`);
}


function sellIndex(indexId, quantity) {
    const indexToSell = marketIndexes.find(i => i.id === indexId);
    const holding = playerPortfolio[indexId];

    if (!indexToSell || !holding || holding.shares < quantity) {
        alert(`Nie masz wystarczającej liczby jednostek ${indexToSell.name}. Posiadasz: ${holding ? holding.shares : 0}`);
        return;
    }

    let totalGain = indexToSell.value * quantity;
    const charismaLevel = getSkillLevel('sharkCharisma');
    if (charismaLevel > 0) {
        let charismaBonus = 0;
        switch (charismaLevel) {
            case 1: charismaBonus = 0.005; break; // 0.5%
            case 2: charismaBonus = 0.01; break;  // 1.0%
            case 3: charismaBonus = 0.015; break; // 1.5%
        }
        totalGain *= (1 + charismaBonus); // Przy sprzedaży dodajemy bonus
    }

    // Obliczanie zysku i przyznawanie XP
    const profitPerShare = (totalGain / quantity) - holding.avgPrice;
    const totalProfit = profitPerShare * quantity;
    if (totalProfit > 0) {
        const xpGained = totalProfit / 100;
        if (xpGained > 0) {
            playerXP += xpGained;
            displayXP();
        }
    }

    playerCash += totalGain;
    holding.shares -= quantity;

    if (holding.shares === 0) {
        delete playerPortfolio[indexId];
    }

    displayCash();
    displayPortfolio();
}

function updateMarketVolatilityIndex() {
    if (stocks.length === 0) {
        marketVolatilityIndex = 0;
        return;
    }

    let totalVolatility = 0;
    let validStocksCount = 0;

    // Użyjemy pętli forEach zamiast reduce, aby mieć lepszą kontrolę
    stocks.forEach(stock => {
        // Sprawdzamy, czy volatilityFactor istnieje, jest liczbą i nie jest NaN
        if (typeof stock.volatilityFactor === 'number' && !isNaN(stock.volatilityFactor)) {
            totalVolatility += stock.volatilityFactor;
            validStocksCount++;
        } else {
            // JEŚLI ZNAJDZIEMY PROBLEM, WYŚWIETLAMY BŁĄD W KONSOLI
            console.error("!!! ZNALEZIONO SPÓŁKĘ BEZ POPRAWNEGO 'volatilityFactor':", stock);
        }
    });

    // Obliczamy średnią tylko na podstawie poprawnych danych
    if (validStocksCount > 0) {
        marketVolatilityIndex = totalVolatility / validStocksCount;
    } else {
        marketVolatilityIndex = 0; // Wartość awaryjna, jeśli żadna spółka nie ma poprawnych danych
    }

    // Dodatkowe zabezpieczenie, aby marketVolatilityIndex nigdy nie był NaN
    if (isNaN(marketVolatilityIndex)) {
        console.error("!!! marketVolatilityIndex to wciąż NaN! Resetuję do 0.", { totalVolatility, validStocksCount });
        marketVolatilityIndex = 0;
    }
}

function updatePassiveWork(deltaTime) {
    if (getSkillLevel('work') >= 3 && workPassiveProgress < PASSIVE_WORK_INTERVAL) {
        workPassiveProgress += deltaTime;
    }
}

function collectPassiveWorkReward() {
    if (workPassiveProgress >= PASSIVE_WORK_INTERVAL) {
        playerCash += 100;
        workPassiveProgress = 0; // Resetuj postęp
        logEvent('✍️ Odebrano pasywny dochód w wysokości 100 PLN.', 'review');
        displayCash();

        // Odśwież widok panelu, jeśli jest otwarty
        if (document.getElementById('work-modal').style.display === 'block') {
            openWorkModal();
        }
    }
}

function foundPlayerCompany() {
    if (playerCompany === null) {
        playerCompany = {
            name: "Twoja Firma",
            value: 0,
            employees: 0,
            cashInvested: 0,
            baseIncome: 100, // Dochód bazowy
            incomeInterval: 90000, // 90 sekund
            lastIncomeTime: Date.now()
        };
        logEvent('🏢 Gratulacje! Założyłeś Własną Firmę!', 'review');
    }
}

function hireEmployee() {
    const cost = 5000;
    if (playerCash >= cost) {
        playerCash -= cost;
        playerCompany.employees++;
        displayCash();
        openWorkModal(); // Odśwież widok
    } else {
        alert("Nie masz wystarczająco gotówki, aby zatrudnić pracownika.");
    }
}

function investInCompany() {
    const amount = parseFloat(document.getElementById('company-invest-amount').value);
    if (isNaN(amount) || amount <= 0) {
        alert("Wpisz poprawną kwotę.");
        return;
    }
    if (playerCash >= amount) {
        playerCash -= amount;
        playerCompany.cashInvested += amount;
        displayCash();
        document.getElementById('company-invest-amount').value = '';
        openWorkModal(); // Odśwież widok
    } else {
        alert("Nie masz tyle gotówki.");
    }
}

// Ta funkcja będzie wywoływana w pętli gry
function updateCompanyStatus() {
    if (getSkillLevel('work') < 4 || playerCompany === null) return;

    // Obliczanie dochodu
    const totalIncome = playerCompany.baseIncome + (playerCompany.employees * 100);
    if (Date.now() - playerCompany.lastIncomeTime >= playerCompany.incomeInterval) {
        playerCash += totalIncome;
        playerCompany.lastIncomeTime = Date.now();
        logEvent(`🏢 Twoja firma wygenerowała ${totalIncome} PLN dochodu.`, 'review');
        displayCash();
    }

    // Obliczanie wartości firmy
    playerCompany.value = playerCompany.cashInvested + (playerCompany.employees * 7500);
}
function calculateInitialHoldingPrices() {
    const holdingCompanies = stocks.filter(s => s.assetType === 'Holding');

    holdingCompanies.forEach(holding => {
        if (holding.totalShares > 0) {
            // Cena startowa jest oparta wyłącznie na gotówce, zanim fundusz dokona jakichkolwiek inwestycji.
            holding.price = holding.cash / holding.totalShares;
        }
    });
    console.log("[SYSTEM] Obliczono i ustawiono ceny startowe dla spółek finansowych.");
}
function triggerIPO() {
    if (playerCompany.value >= 25000) {
        const companySymbol = playerCompany.name.substring(0, 3).toUpperCase() + "X";
        const newStock = {
            name: playerCompany.name,
            price: playerCompany.value / 1000, // Wartość początkowa akcji
            volatilityFactor: 1.5,
            symbol: companySymbol,
            exchange: 'JUNK', // Debiut na najniższej giełdzie
            totalShares: 1000,
            maxShares: 2000,
            sharesHeld: 800, // 80% akcji jest Twoje
            priceHistory: [], balanceSheet: {
        assets: 0,          // Aktywa (majątek firmy)
        liabilities: 0,     // Pasywa (głównie zadłużenie)
        shareCapital: 0,    // Kapitał zakładowy (wartość nominalna akcji)
        retainedEarnings: 0 // Zyski zatrzymane (skumulowane zyski/straty)
    },
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z)
            sector: ['Usługi'],
            financialHealth: 1,
            isTradeLocked: false,
            dividendCooldownUntil: 0
        };

        stocks.push(newStock);
        playerPortfolio[companySymbol] = { shares: 800, avgPrice: newStock.price };

        alert(`GRATULACJE! Twoja firma ${playerCompany.name} (${companySymbol}) weszła na giełdę! Otrzymujesz 80% akcji.`);
        playerCompany = null; // Resetujemy firmę, teraz jest spółką giełdową

        // Zamykamy i odświeżamy widoki
        document.getElementById('work-modal').style.display = 'none';
        updateWorkButtonVisibility();
        displayStocks();
        displayPortfolio();
    }
}

function updateDividendTimers(deltaTime) {
    stocks.forEach(stock => {
        if (!stock.dividendPolicy && stock.assetType !== 'REIT') return;

        stock.dividendTimer -= deltaTime;

        if (stock.dividendTimer <= 0) {
            console.log(`[Dywidenda] Czas upłynął dla ${stock.name}. Przetwarzanie wypłaty...`); // <-- LOG
            if (stock.assetType === 'REIT') {
                processReitDividend(stock);
                stock.dividendTimer = 2 * 60 * 1000;
            } else {
                processDividendPayout(stock);
                stock.dividendTimer = getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000);
            }
        }
    });
}

function processDividendPayout(stock) {
    if (stock.ceo?.traits?.some(t => t.id === 'skapiec')) {
        logEvent(`[CEO] Prezes-skąpiec w ${stock.name} blokuje wypłatę dywidendy, kumulując kapitał w firmie.`);
        return;
    }

    const isGenerous = stock.ceo?.traits?.some(t => t.id === 'szczodry');
    if (stock.dividendPolicy === 'Growth' && !isGenerous) return;

    if (stock.sharesHeld === 0) return;

    const currentValue = stock.price * stock.totalShares;
    const profit = currentValue - stock.lastQuarterValue;

    if (profit <= 0 && stock.financialHealth <= 0) {
        logEvent(`📉 ${stock.name} wstrzymuje dywidendę z powodu strat.`);
        return;
    }

    const healthModifier = 1 + (stock.financialHealth / 10);
    let dividendTotalAmount = 0;
    const zyskDoPodzialu = profit > 0 ? profit : currentValue * 0.02;

    let effectivePolicy = stock.dividendPolicy;
    if (effectivePolicy === 'Growth' && isGenerous) {
        effectivePolicy = 'Balanced';
    }

    switch (effectivePolicy) {
        case 'Balanced':
            dividendTotalAmount = zyskDoPodzialu * getRandomInRange(0.01, 0.10) * healthModifier;
            break;
        case 'Aggressive':
            dividendTotalAmount = zyskDoPodzialu * getRandomInRange(0.50, 1.00) * healthModifier;
            break;
        case 'Total':
            dividendTotalAmount = profit > 0 ? profit : 0;
            break;
    }

    if (isGenerous) {
        dividendTotalAmount *= 1.15;
    }

    if (dividendTotalAmount <= 0) return;

    let dividendPerShare = dividendTotalAmount / stock.totalShares;

    if (dividendPerShare > stock.price * 0.50) {
        console.warn(`[DYWIDENDA] Ograniczono dywidendę dla ${stock.name}, aby zapobiec krachowi.`);
        dividendPerShare = stock.price * 0.50;
    }

    payDividendToShareholders(stock, dividendPerShare);
}

function initializeBalanceSheetForStock(stock) {
    // Pomiń start-upy, REIT-y i inne specjalne typy
    if (stock.assetType) {
        stock.balanceSheet = { assets: 0, liabilities: 0, shareCapital: 0, retainedEarnings: 0 };
        stock.quarterlyEarnings = 0;
        return;
    }

    const marketCap = stock.price * stock.totalShares;

    // 1. Aktywa są powiązane z kapitalizacją, ale z pewną losowością
    const assets = marketCap * getRandomInRange(0.9, 1.5);

    // 2. Zadłużenie jest większe dla firm o niższej kondycji
    const liabilitiesRatio = getRandomInRange(0.1, 0.6) - (stock.financialHealth * 0.05);
    const liabilities = assets * Math.max(0.05, liabilitiesRatio);

    // 3. Kapitał zakładowy to mała, stała część kapitału własnego
    const equity = assets - liabilities; // Kapitał własny = Aktywa - Zobowiązania
    const shareCapital = equity * getRandomInRange(0.1, 0.2);

    // 4. Reszta kapitału własnego to zyski zatrzymane
    const retainedEarnings = equity - shareCapital;

    stock.balanceSheet = {
        assets: assets,
        liabilities: liabilities,
        shareCapital: shareCapital,
        retainedEarnings: retainedEarnings
    };
    stock.quarterlyEarnings = 0; // Zaczynamy z zerowym zyskiem kwartalnym
}

function processReitDividend(stock) {
    if (stock.sharesHeld === 0) return;

    // Logika wzrostu dywidendy dla REIT
    const roll = Math.random();
    if (roll > 0.81) { // 19% szans na wzrost
        stock.dividendPerShare += getRandomInRange(0.05, 0.5);
    } // w 81% przypadków zostaje bez zmian

    payDividendToShareholders(stock, stock.dividendPerShare);
}

function payDividendToShareholders(stock, dividendPerShare) {
    const oldPrice = stock.price; // <-- LOG
    if (playerPortfolio[stock.symbol]) {
        let finalDividendPerShare = dividendPerShare;
        const playerRep = stock.reputation['player'];

        if (playerRep < REPUTATION_LEVELS.NEGATIVE) {
            finalDividendPerShare *= 0.8; // Kara 20%
        } else if (playerRep >= REPUTATION_LEVELS.CORRECT && playerRep < REPUTATION_LEVELS.POSITIVE) {
            finalDividendPerShare *= 1.01; // Bonus 1%
        } else if (playerRep >= REPUTATION_LEVELS.POSITIVE) {
            finalDividendPerShare *= 1.05; // Bonus 5%
        }

        const playerDividend = playerPortfolio[stock.symbol].shares * finalDividendPerShare;
        playerCash += playerDividend;
        displayCash();
        logEvent(`💰 Otrzymujesz ${playerDividend.toFixed(2)} PLN dywidendy od ${stock.name}!`, 'review');
    }

    aiCompetitors.forEach(ai => {
    if (ai.portfolio[stock.symbol]) {
        let finalDividendPerShare = dividendPerShare;
        const aiRep = stock.reputation[ai.id]; // Pobieramy reputację konkretnego bota

        // Używamy reputacji bota (aiRep) do obliczeń
        if (aiRep < REPUTATION_LEVELS.NEGATIVE) {
            finalDividendPerShare *= 0.8; // Kara 20%
        } else if (aiRep >= REPUTATION_LEVELS.CORRECT && aiRep < REPUTATION_LEVELS.POSITIVE) {
            finalDividendPerShare *= 1.01; // Bonus 1%
        } else if (aiRep >= REPUTATION_LEVELS.POSITIVE) {
            finalDividendPerShare *= 1.05; // Bonus 5%
        }
        
        ai.cash += ai.portfolio[stock.symbol].shares * finalDividendPerShare;
    }
});

    stock.price -= dividendPerShare;
    if (stock.price < 0.01) stock.price = 0.01;

    console.log(`[Dywidenda] Wypłata ${dividendPerShare.toFixed(4)} na akcję dla ${stock.name}. Cena spada z ${oldPrice.toFixed(2)} do ${stock.price.toFixed(2)}`); // <-- LOG
}

function getRandomIntInRange(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function reviewCompanyPlacements() {
    console.log(`[PRZEGLĄD RYNKU] Uruchomiono cykliczny przegląd...`);
    let promotionOccurred = false;

    stocks.forEach(stock => {
        if (stock.assetType === 'REIT' || stock.assetType === 'Startup' || stock.isBankrupt) {
            return;
        }

        const currentExchangeKey = stock.exchange;
        const currentLevel = exchanges[currentExchangeKey].level;
        let correctExchangeKey = null;

        for (const key in exchanges) {
            const exchange = exchanges[key];
            if (stock.price >= exchange.minPrice && stock.price < exchange.maxPrice) {
                correctExchangeKey = key;
                break;
            }
        }
        // Obsługa spółek z ceną powyżej progu PLATINUM
        if (stock.price >= exchanges['PLATINUM'].maxPrice) {
             correctExchangeKey = 'PLATINUM';
        }


        if (!correctExchangeKey || correctExchangeKey === currentExchangeKey) return;

        promotionOccurred = true;
        const newExchange = exchanges[correctExchangeKey];

        stock.exchange = correctExchangeKey;

        let message = '';
        
        // --- KLUCZOWA POPRAWKA JEST TUTAJ ---
        // Zamiast wywoływać starą, nieistniejącą funkcję...
        // ...wywołujemy nową, która regeneruje części składowe opisu.
        initializeDescriptionParts(stock); 
        // --- KONIEC POPRAWKI ---

        if (newExchange.level > currentLevel) { // Logika dla AWANSU
            const magnitude = (Math.random() * 0.05) + 0.03;
            message = `📈 AWANS: ${stock.name} przechodzi na giełdę "${newExchange.name}"!`;
            applyPriceEffect(stock.symbol, magnitude, 'positive', 'review');
            
            const newLimitRange = SHARE_LIMIT_RANGES[correctExchangeKey];
            if (newLimitRange) stock.maxShares = getRandomIntInRange(newLimitRange.min, newLimitRange.max);

            if (currentLevel === 0) {
                const policies = ['Balanced', 'Aggressive', 'Growth', 'Total'];
                stock.dividendPolicy = getRandomElement(policies);
                message += ` Spółka ustala swoją politykę dywidendową na: ${stock.dividendPolicy}.`;
            } else if (Math.random() < 0.25) {
                const oldPolicy = stock.dividendPolicy;
                const policies = ['Balanced', 'Aggressive', 'Growth', 'Total'];
                stock.dividendPolicy = getRandomElement(policies);
                if (oldPolicy !== stock.dividendPolicy) {
                    message += ` Zarząd rewiduje strategię i zmienia politykę dywidendową na: ${stock.dividendPolicy}!`;
                }
            }
        } else { // Logika dla SPADKU
            const magnitude = ((Math.random() * 0.05) + 0.03) * -1;
            message = `📉 SPADEK: ${stock.name} spada na giełdę "${newExchange.name}"...`;
            applyPriceEffect(stock.symbol, magnitude, 'negative', 'review');

            const newLimitRange = SHARE_LIMIT_RANGES[correctExchangeKey];
            if (newLimitRange) stock.maxShares = getRandomIntInRange(newLimitRange.min, newLimitRange.max);
        }

        logEvent(message, 'review');
    });

    if (promotionOccurred) {
        displayStocks(getCurrentInputValues());
        checkPlayerTierUpgrade();
    }
}

function assignInitialDividendPolicies() {
    const policies = ['Balanced', 'Aggressive', 'Growth', 'Total'];
    stocks.forEach(stock => {
        if (stock.exchange !== 'JUNK' && stock.assetType !== 'REIT') {
            stock.dividendPolicy = getRandomElement(policies);
        }
    });
    console.log("[START GRY] Przypisano początkowe polityki dywidendowe.");
}

function cleanupBankruptStocks(speedMultiplier) {
    const oneMinuteInGame = 60000 / speedMultiplier;
    const now = Date.now();

    // stocks.filter tworzy nową tablicę, więc musimy nadpisać starą
    const originalCount = stocks.length;
    stocks = stocks.filter(stock => {
        if (!stock.isBankrupt) {
            return true; // Zostawiamy aktywne spółki
        }
        // Jeśli spółka jest bankrutem, sprawdzamy, czy minął już czas
        return (now - stock.timeOfDeath) < oneMinuteInGame;
    });

    if (stocks.length < originalCount) {
        console.log("Usunięto zbankrutowane spółki z listy.");
    }
}

/**
 * Gracz (jako większościowy udziałowiec) spłaca część długu korporacyjnego.
 * @param {string} symbol - Symbol spółki, której pomaga.
 * @param {number} amount - Kwota do spłaty.
 */
function playerBailsOutCompany(symbol, amount) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !stock.corporateDebt || stock.corporateDebt <= 0) return;

    if (isNaN(amount) || amount <= 0) {
        alert("Proszę wpisać poprawną, dodatnią kwotę.");
        return;
    }

    const amountToRepay = Math.min(amount, stock.corporateDebt); // Nie można spłacić więcej niż wynosi dług

    if (playerCash < amountToRepay) {
        alert("Nie masz wystarczająco gotówki!");
        return;
    }

    // Transakcja
    playerCash -= amountToRepay;
    stock.corporateDebt -= amountToRepay;

    // Nagroda za pomoc
    stock.financialHealth += 1; // Natychmiastowa poprawa kondycji finansowej
    if (stock.financialHealth > 5) stock.financialHealth = 5; // Ograniczenie do max

    const priceBoost = getRandomInRange(0.01, 0.03); // Niewielki wzrost kursu o 1-3%
    applyPriceEffect(symbol, priceBoost, 'positive', 'review');

    logEvent(`💵‼️ Uratowałeś finanse ${stock.name}, wpłacając ${amountToRepay.toFixed(2)} PLN! Kondycja firmy i kurs akcji rosną.`, 'review');

    displayCash();
    // Odświeżamy widok panelu zarządzania, aby pokazać zaktualizowany dług
    openManagementModal(symbol);
}

function acceptRescueOffer(offerDetails) {
    const { targetCompany, sharesOffered, totalCost, promotionalPrice, cashRaisedSoFar, sharesBoughtSoFar } = offerDetails;

    if (playerCash < totalCost) {
        alert("Nie masz wystarczająco gotówki, aby skorzystać z tej oferty!");
        return;
    }

    playerCash -= totalCost;

    const symbol = targetCompany.symbol;
    if (playerPortfolio[symbol]) {
        const existingHolding = playerPortfolio[symbol];
        const oldTotalValue = existingHolding.avgPrice * existingHolding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        existingHolding.shares += sharesOffered;
        existingHolding.avgPrice = newTotalValue / existingHolding.shares;
    }

    // sharesHeld gracza jest już zaktualizowane powyżej
    // sharesHeld botów zostało zaktualizowane w ich własnej logice
    // Teraz musimy tylko zaktualizować sharesHeld ogólne dla spółki
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
        stock.sharesHeld += sharesOffered;
    }

    logEvent(`📢 Skorzystałeś z oferty ratunkowej i nabyłeś ${sharesOffered} akcji ${targetCompany.name}!`, 'review');

    // Finalizacja eventu z uwzględnieniem wkładu gracza
    const finalCashRaised = cashRaisedSoFar + totalCost;
    const finalSharesBought = sharesBoughtSoFar + sharesOffered;
    finalizeRescueOffering(targetCompany, finalCashRaised, finalSharesBought);

    displayCash();
    displayPortfolio();
    document.getElementById('rescue-offering-modal').style.display = 'none';
}


function declineRescueOffer(offerDetails) {
    logEvent(`Odrzuciłeś ofertę zakupu akcji ratunkowych w ${offerDetails.targetCompany.name}.`, 'review');
    changeReputation('player', offerDetails.targetCompany.symbol, -20);
    // Finalizujemy event tylko z wkładem botów, bez udziału gracza
    finalizeRescueOffering(offerDetails.targetCompany, offerDetails.cashRaisedSoFar, offerDetails.sharesBoughtSoFar);

    document.getElementById('rescue-offering-modal').style.display = 'none';
}


function finalizeRescueOffering(targetCompany, totalCashRaised, totalSharesBought) {
    const stock = stocks.find(s => s.symbol === targetCompany.symbol);
    if (!stock) return;

    const initialDebt = stock.corporateDebt;
    stock.corporateDebt -= totalCashRaised;
    if (stock.corporateDebt < 0) stock.corporateDebt = 0;

    // Zwiększamy liczbę akcji w obiegu o te, które zostały faktycznie kupione
    stock.totalShares += totalSharesBought;

    logEvent(`[FINAŁ EMISJI] Emisja ratunkowa w ${stock.name} zebrała ${totalCashRaised.toFixed(2)} PLN. Dług spółki zmniejszył się z ${initialDebt.toFixed(2)} PLN do ${stock.corporateDebt.toFixed(2)} PLN.`, 'review');

    // Nagroda: Poprawa kondycji finansowej, jeśli udało się zebrać jakiekolwiek środki
    if (totalCashRaised > 0) {
        stock.financialHealth += 1;
        if (stock.financialHealth > 5) stock.financialHealth = 5;
    }
}

function investInStartup(symbol, amount) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        // Jeśli nie jest, spróbuj pobrać wartość bezpośrednio z inputa jako ostateczność
        const inputAmount = document.getElementById(`invest-amount-${symbol}`)?.valueAsNumber;
        if (typeof inputAmount !== 'number' || isNaN(inputAmount) || inputAmount <= 0) {
            alert("Proszę wpisać poprawną, dodatnią kwotę inwestycji.");
            return; // Zakończ funkcję, jeśli kwota jest nieprawidłowa
        }
        amount = inputAmount; // Użyj wartości z inputa, jeśli była poprawna
    }

    if (!isSkillUnlocked('startupInvestor')) {
        alert("Musisz odblokować umiejętność 'Anioł Biznesu', aby inwestować w start-upy!");
        return;
    }

    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.assetType !== 'Startup') return;

    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki!");
        return;
    }

    // Zmieniamy logikę w zależności od etapu start-upu
    if (startup.stage === 'funding') {
        startup.currentFunding += amount;
        const successChanceBonus = (amount / startup.fundingGoal) * 0.05;
        startup.successChance += successChanceBonus;
        if (startup.successChance > 1) startup.successChance = 1;
        logEvent(`Zainwestowałeś ${amount.toFixed(2)} PLN w fazie finansowania ${startup.name}!`, 'review');
    } else if (startup.stage === 'overfunding') {
        startup.ipoPriceBonus += amount; // Wpłata idzie na bonus do ceny IPO
        logEvent(`Zainwestowałeś ${amount.toFixed(2)} PLN w fazie 'overfunding' ${startup.name}, zwiększając jego wartość przy debiucie!`, 'review');
    } else {
        alert(`${startup.name} jest już w fazie rozwoju i nie przyjmuje inwestycji.`);
        return;
    }

    // Transakcja i zapis w portfelu (wspólne dla obu etapów)
    playerCash -= amount;
    const sharesBought = amount / startup.price;
    if (playerPortfolio[symbol]) {
        playerPortfolio[symbol].investedAmount += amount;
    } else {
        playerPortfolio[symbol] = { investedAmount: amount, assetType: 'Startup', isInsured: false };
    }

    const playerName = "Ty (Gracz)";
    startup.investors[playerName] = (startup.investors[playerName] || 0) + amount;

    displayCash();
    displayPortfolio();
    displayStartups(getCurrentStartupInputValues());
}

function updateStartups(deltaTime) {
    const now = Date.now();
    for (let i = stocks.length - 1; i >= 0; i--) {
        const startup = stocks[i];
        if (startup.assetType !== 'Startup') continue;

        // Używamy instrukcji switch, aby zarządzać etapami życia start-upu
        switch (startup.stage) {
            case 'funding':
                // Etap zbierania funduszy (pasywne finansowanie wciąż działa)
                if (startup.currentFunding < startup.fundingGoal) {
                    let donation = 0;
                    const roll = Math.random();
                    if (roll < 0.01) { donation = getRandomInRange(20, 100); } 
                    else if (roll < 0.20) { donation = getRandomInRange(1, 20); }
                    if (donation > 0) {
                        startup.currentFunding += donation;
                        if (startup.currentFunding > startup.fundingGoal) {
                            startup.currentFunding = startup.fundingGoal;
                        }
                    }
                }

                // Jeśli cel został osiągnięty, przechodzimy do etapu 'overfunding'
                if (startup.currentFunding >= startup.fundingGoal) {
                    startup.stage = 'overfunding';
                    startup.overfundingTimeLeft = 120000; // Ustawiamy timer na 2 minuty
                    logEvent(`[START-UP] ${startup.name} osiągnął cel finansowy! Rozpoczyna się 2-minutowy okres na dodatkowe inwestycje bonusowe.`, 'review');
                }
                displayStartups(getCurrentStartupInputValues());
                break;

            case 'overfunding':
                // Etap "dopłacania" po osiągnięciu celu
                startup.overfundingTimeLeft -= deltaTime; // Odliczamy czas
                
                if (startup.overfundingTimeLeft <= 0) {
                    // Jeśli czas minął, przechodzimy do etapu rozwoju
                    startup.stage = 'development';
                    logEvent(`[START-UP] Okres dodatkowych inwestycji dla ${startup.name} zakończył się...`, 'review');
                }
                displayStartups(getCurrentStartupInputValues());
                break;

            case 'development':
                // Etap rozwoju
                if (startup.developmentProgress < 100) {
                    const progressIncrease = (deltaTime / 1000) * 0.5; 
                    startup.developmentProgress += progressIncrease;
                }

                // --- NOWY BLOK KODU DLA MINI-EVENTÓW ---
                // Sprawdź, czy gracz odblokował start-upy, czy to start-up gamingowy i czy wylosowano event
                if (isSkillUnlocked('startupInvestor') && startup.sector.includes('Gaming') && Math.random() < 0.005) {
                    triggerGamingStartupEvent(startup);
                }
                // --- KONIEC NOWEGO BLOKU ---

                if (startup.developmentProgress >= 100 && startup.stage === 'development') {
                    // NATYCHMIAST zmieniamy etap, aby ten blok kodu nie wykonał się ponownie
                    startup.stage = 'finalized'; 
                    startup.developmentProgress = 100;
                    finalizeStartup(startup); // Wywołujemy finał tylko RAZ
                }
                break;
            
            case 'financial_complications':
                startup.rescueTimeLeft -= deltaTime;

                // Logika wkładu AI (mała szansa w każdym cyklu)
                if (Math.random() < 0.02) {
                    const contributingAI = aiCompetitors.find(ai => ai.portfolio[startup.symbol] && Math.random() < 0.5);
                    if (contributingAI) {
                        const amount = Math.min(contributingAI.cash * 0.1, startup.rescueGoal - startup.rescueCurrent);
                        if (amount > 100) {
                            contributingAI.cash -= amount;
                            startup.rescueCurrent += amount;
                            logEvent(`[START-UP] ${contributingAI.name} dofinansowuje ${startup.name} kwotą ${amount.toFixed(2)} PLN!`);
                        }
                    }
                }

                if (startup.rescueTimeLeft <= 0 && startup.rescueCurrent < startup.rescueGoal) {
                    // Czas minął, a cel nie został osiągnięty -> KRYTYCZNA PORAŻKA
                    showToast(`Nie udało się uratować ${startup.name}! Firma upada.`, 'error', 5000);
                    logEvent(`[START-UP] 🔥 ${startup.name} nie zebrał na czas środków na ratunek.`, 'review');
                    removeStartup(startup, 0.05, 0.15); // Zwrot 5-15%
                }
                break;
        }

    }
}
    
    function playerRescuesStartup(symbol, amount) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.stage !== 'financial_complications') return;
    if (isNaN(amount) || amount <= 0) {
        alert("Wpisz poprawną kwotę dofinansowania.");
        return;
    }
    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki!");
        return;
    }

    playerCash -= amount;
    startup.rescueCurrent += amount;
    logEvent(`[START-UP] hero Dofinansowałeś ${startup.name} kwotą ${amount.toFixed(2)} PLN!`);
    displayCash();

    // Sprawdź, czy cel został osiągnięty
    if (startup.rescueCurrent >= startup.rescueGoal) {
        showToast(`${startup.name} został uratowany! Przygotowuje się do debiutu.`, 'success', 4000);
        logEvent(`[START-UP] ✅ Dzięki wsparciu inwestorów, ${startup.name} wchodzi na giełdę!`);
        
        // Uruchamiamy scenariusz "Debiut bez Echa"
        const successMultiplier = getRandomInRange(1, 5);
        handleSuccessfulIPO(startup, successMultiplier);
    }
}
    
function issueStateBonds() {
    stateBondOffer.shortTerm.available = getRandomIntInRange(50, 200);
    stateBondOffer.mediumTerm.available = getRandomIntInRange(30, 150);
    stateBondOffer.longTerm.available = getRandomIntInRange(20, 100);

    // Rzadki event modyfikujący oprocentowanie
    if (Math.random() < 0.1) { // 10% szans
        const change = Math.random() < 0.5 ? 0.005 : -0.005;
        stateBondOffer.mediumTerm.interestBase += change;
        stateBondOffer.longTerm.interestBase += change;
        logEvent(`🏛️ Bank Centralny koryguje oprocentowanie obligacji o ${change > 0 ? '+' : ''}${(change * 100).toFixed(1)}%!`, 'market');
    }

    logEvent("🏛️ Bank Centralny wyemitował nową serię obligacji skarbowych.", 'market');
    // Jeśli gracz ma otwarty modal banku, odśwież go
    if (document.getElementById('bank-modal').style.display === 'block') {
        openBankModal();
    }
}

/**
 * Generuje ofertę obligacji korporacyjnej lub komunalnej.
 */
function issueNewBondOffer() {
    if (activeBonds.length >= 10) return; // Ograniczenie liczby aktywnych ofert

    const roll = Math.random();
    let issuer, type, interest, risk, duration;

   if (roll < 0.15 && (cityInvestment.playerHasUnlocked || cityInvestment.aiHasUnlocked)) {
        // Obligacja komunalna (rzadka i tylko po odblokowaniu)
        issuer = getRandomElement(bondIssuers.municipal);
        type = 'Komunalna';
        risk = issuer.risk;
        duration = getRandomIntInRange(15, 35); // krótsze
        interest = 0.03 + (duration / 100) + (risk * 2); // Niskie oprocentowanie
    } else if (roll < 0.60) {
        // Obligacja korporacyjna spółki giełdowej
        const publicCompany = getRandomElement(stocks.filter(s => !s.assetType));
        if (!publicCompany) return;
        issuer = { name: publicCompany.name, risk: publicCompany.volatilityFactor / 10 };
        type = 'Korporacyjna (Giełdowa)';
        risk = issuer.risk;
        duration = getRandomIntInRange(10, 50);
        interest = 0.04 + (duration / 80) + (risk * 3);
    } else {
        // Obligacja korporacyjna spółki pozagiełdowej (ryzykowna)
        issuer = getRandomElement(bondIssuers.corporate_non_public);
        type = 'Korporacyjna (Pozagiełdowa)';
        risk = issuer.risk;
        duration = getRandomIntInRange(20, 50);
        interest = 0.06 + (duration / 60) + (risk * 4);
    }

    const newBond = {
        id: `bond_${Date.now()}_${Math.random()}`,
        issuerName: issuer.name,
        type: type,
        interestRate: interest,
        durationMinutes: duration,
        risk: risk,
        faceValue: 1000, // Wartość nominalna
        available: getRandomIntInRange(50, 500)
    };
    
    activeBonds.push(newBond);
    logEvent(`📰 Nowa emisja obligacji (${newBond.type}) od ${newBond.issuerName}!`, 'market');
}

function buyStateBond(buyer, type, quantity) {
    const offer = stateBondOffer[type];
    if (quantity <= 0 || isNaN(quantity)) return;

    if (quantity > offer.available) {
        if (buyer === 'player') alert("Nie ma wystarczającej liczby dostępnych obligacji tej serii.");
        return;
    }

    const totalCost = 1000 * quantity;
    const buyerCash = (buyer === 'player') ? playerCash : buyer.cash;

    if (buyerCash < totalCost) {
        if (buyer === 'player') alert("Nie masz wystarczająco gotówki.");
        return;
    }

    if (buyer === 'player') {
        playerCash -= totalCost;
    } else {
        buyer.cash -= totalCost;
    }
    offer.available -= quantity;

    let interestRate, durationMinutes;
    if (type === 'shortTerm') {
        interestRate = offer.interest;
        durationMinutes = 10;
    } else {
        const inflationProxy = marketVolatilityIndex / 100; 
        interestRate = inflationProxy + offer.interestBase;
        durationMinutes = (type === 'mediumTerm') ? 25 : 45;
    }

    const maturityDate = Date.now() + (durationMinutes * 60 * 1000 / currentSpeedMultiplier);
    const ownerId = (buyer === 'player') ? 'player' : buyer.id;

    for (let i = 0; i < quantity; i++) {
        allBonds.push({
            id: `bond_${Date.now()}_${i}`,
            ownerId: ownerId, // Nowe pole identyfikujące właściciela
            issuerName: 'Skarb Państwa',
            type: `Skarbowa (${type})`,
            purchasePrice: 1000,
            faceValue: 1000,
            interestRate: interestRate,
            maturityDate: maturityDate,
            isStateBond: true
        });
    }

    if (ownerId === 'player') {
        logEvent(`Zakupiono ${quantity} szt. obligacji skarbowych.`, 'review');
        displayCash();
        openBankModal();
    } else {
        console.log(`[AI] ${buyer.name} kupił ${quantity} szt. obligacji skarbowych.`);
    }
}

/**
 * Logika zakupu obligacji korporacyjnej/komunalnej.
 * @param {string} bondId - ID oferty obligacji.
 * @param {number} quantity - Liczba kupowanych sztuk.
 */
function buyOtherBond(buyer, bondId, quantity) {
    const offerIndex = activeBonds.findIndex(b => b.id === bondId);
    if (offerIndex === -1) {
        if (buyer === 'player') alert("Ta oferta jest już nieaktualna.");
        return;
    }
    const offer = activeBonds[offerIndex];
    if (quantity <= 0 || isNaN(quantity)) return;

    if (quantity > offer.available) {
        if (buyer === 'player') alert("Nie ma wystarczającej liczby dostępnych obligacji w tej ofercie.");
        return;
    }

    const totalCost = offer.faceValue * quantity;
    const buyerCash = (buyer === 'player') ? playerCash : buyer.cash;

    if (buyerCash < totalCost) {
        if (buyer === 'player') alert("Nie masz wystarczająco gotówki.");
        return;
    }

    if (buyer === 'player') {
        playerCash -= totalCost;
    } else {
        buyer.cash -= totalCost;
    }
    
    offer.available -= quantity;
    if (offer.available <= 0) {
        activeBonds.splice(offerIndex, 1);
    }

    const maturityDate = Date.now() + (offer.durationMinutes * 60 * 1000 / currentSpeedMultiplier);
    const ownerId = (buyer === 'player') ? 'player' : buyer.id;

    for (let i = 0; i < quantity; i++) {
        allBonds.push({
            id: `bond_${Date.now()}_${i}`,
            ownerId: ownerId,
            issuerName: offer.issuerName,
            type: offer.type,
            purchasePrice: offer.faceValue,
            faceValue: offer.faceValue,
            interestRate: offer.interestRate,
            maturityDate: maturityDate,
            risk: offer.risk,
            isStateBond: false
        });
    }
    
    if (ownerId === 'player') {
        logEvent(`Zakupiono ${quantity} szt. obligacji od ${offer.issuerName}.`, 'review');
        displayCash();
        renderBondMarketInBank(); // Odśwież widok
    } else {
        console.log(`[AI] ${buyer.name} kupił ${quantity} szt. obligacji od ${offer.issuerName}.`);
    }
}

/**
 * Sprawdza, czy któreś z posiadanych obligacji osiągnęły termin zapadalności.
 */
function checkBondMaturities() {
    const now = Date.now();
    for (let i = allBonds.length - 1; i >= 0; i--) {
        const bond = allBonds[i];
        if (now >= bond.maturityDate) {
            let payout = 0;
            let didDefault = false;

            if (bond.isStateBond || Math.random() > bond.risk) {
                payout = bond.faceValue * (1 + bond.interestRate);
            } else {
                didDefault = true;
                payout = bond.faceValue * getRandomInRange(0.1, 0.5);
            }
            
            // Znajdź właściciela i wypłać mu pieniądze
            if (bond.ownerId === 'player') {
                playerCash += payout;
                const profit = payout - bond.purchasePrice;
                if (didDefault) {
                    logEvent(`💥 Niewypłacalność! Obligacja od ${bond.issuerName} nie została spłacona w całości! Odzyskano tylko ${payout.toFixed(2)} PLN.`, 'error');
                } else {
                    logEvent(`💰 Obligacja od ${bond.issuerName} dojrzała. Otrzymujesz ${payout.toFixed(2)} PLN (zysk: ${profit.toFixed(2)} PLN).`, 'review');
                }
                displayCash();
                displayPortfolio();
            } else {
                const aiOwner = aiCompetitors.find(ai => ai.id === bond.ownerId);
                if (aiOwner) {
                    aiOwner.cash += payout;
                }
            }

            allBonds.splice(i, 1); // Usuń obligację z globalnej listy
        }
    }
}

function aiDonateToCity(ai, amount) {
    if (ai.cash < amount) return;

    ai.cash -= amount;
    cityInvestment.donatedAmount += amount;
    console.log(`[AI] ${ai.name} przekazał ${amount.toFixed(2)} PLN na rozwój miasta.`);

    if (!cityInvestment.aiHasUnlocked && cityInvestment.donatedAmount >= 10000) { // Sprawdzamy tylko flagę AI
    cityInvestment.aiHasUnlocked = true; // Ustawiamy TYLKO flagę AI
    console.log(`!!! BOT ${ai.name} ODBLOKOWAŁ MIASTO (dla AI) !!!`, cityInvestment.donatedAmount);
    logEvent("🎉 Wkład inwestorów w rozwój miasta odblokował dostęp do obligacji komunalnych!", 'success');
    // showToast nie jest potrzebny dla AI
    }
}

function finalizeStartup(startup) {
    const symbol = startup.symbol;
    logEvent(`[START-UP] Nadszedł dzień sądu dla ${startup.name}!`, 'review');

    // Scenariusz oszustwa jest sprawdzany na samym początku
    if (startup.isScam) {
        showToast(`OSZUSTWO! Start-up ${startup.name} okazał się piramidą finansową!`, 'error', 5000);
        removeStartup(startup, 0, 0); // Utrata 100%
        return; // Zakończ funkcję
    }

    // KROK 1: Obliczamy ostateczną szansę i wykonujemy rzut kostką
    let finalSuccessChance = startup.successChance;
    if (getSkillLevel('startupInvestor') >= 2 && playerPortfolio[symbol]) {
        finalSuccessChance += 0.05;
    }
    const roll = Math.random();

    // KROK 2: Rozbudowana logika sprawdzania wyników
    if (roll > finalSuccessChance) {
        // --- GAŁĄŹ PORAŻKI ---
        if (finalSuccessChance > 0.40 && roll < finalSuccessChance + 0.15) {
            // Scenariusz "O WŁOS": losujemy między Opóźnieniem a Komplikacjami
            if (Math.random() < 0.5) {
                // --- WYNIK: OPÓŹNIENIE ---
                showToast(`Opóźnienie... ${startup.name} potrzebuje więcej czasu.`, 'warning', 4000);
                logEvent(`[START-UP] ⏳ Niewiele brakowało! Projekt ${startup.name} wraca do fazy rozwoju.`, 'review');
                startup.stage = 'development';
                startup.developmentProgress = 50; // Cofamy postęp do 50%
                startup.fundingGoal *= 1.15; // Koszty rosną o 15% na poprawki
                startup.successChance -= 0.10; // Szansa na sukces przy następnej próbie jest niższa
                logEvent(`Cel finansowy ${startup.name} wzrósł do ${startup.fundingGoal.toLocaleString('pl-PL')} PLN!`);
            } else {
                // --- WYNIK: KOMPLIKACJE FINANSOWE ---
                showToast(`Komplikacje! ${startup.name} potrzebuje natychmiastowego dofinansowania!`, 'warning', 5000);
                logEvent(`[START-UP] 💸 ${startup.name} napotkał problemy finansowe na ostatniej prostej!`, 'review');
                startup.stage = 'financial_complications';
                startup.rescueGoal = getRandomIntInRange(1000, 10000);
                startup.rescueCurrent = 0;
                startup.rescueTimeLeft = 120000; // 2 minuty na zebranie środków
            }
        } else {
            // Scenariusz "DOTKLIWA PORAŻKA": losujemy między 3 typami porażki
            const failureRoll = Math.random();
            if (failureRoll < 0.50) {
                // --- WYNIK: PORAŻKA (50% szans) ---
                showToast(`Porażka. ${startup.name} nie wchodzi na giełdę.`, 'error', 4000);
                logEvent(`[START-UP] 📉 Projekt ${startup.name} upadł, ale udało się odzyskać część środków.`, 'review');
                removeStartup(startup, 0.5, 0.7); // Zwrot 50-70%
            } else if (failureRoll < 0.85) {
                // --- WYNIK: KRYTYCZNA PORAŻKA (35% szans) ---
                showToast(`Krytyczna porażka! Prawie cała inwestycja w ${startup.name} przepadła.`, 'error', 5000);
                logEvent(`[START-UP] 🔥 Projekt ${startup.name} zakończył się dotkliwą porażką finansową.`, 'review');
                removeStartup(startup, 0.05, 0.15); // Zwrot 5-15%
            } else {
                // --- WYNIK: BANKRUCTWO (15% szans) ---
                showToast(`BANKRUCTWO! Inwestycja w ${startup.name} stracona w 100%.`, 'error', 5000);
                logEvent(`[START-UP] 💥 Totalne bankructwo ${startup.name}! Inwestorzy tracą wszystko.`, 'review');
                removeStartup(startup, 0, 0); // Zwrot 0%
            }
        }
    } else {
        // --- GAŁĄŹ SUKCESU ---
        let successMultiplier, successType, toastType;

        if (startup.isPrivatized) {
            // --- WYNIK DLA START-UPU SPRYWATYZOWANEGO ---
            successMultiplier = getRandomInRange(1.1, 2.5); // Znacznie niższy, ale gwarantowany zysk
            successType = 'Prywatyzacja Zakończona Sukcesem';
            toastType = 'default';
        } else if (roll < 0.10) { // Zmniejszamy szansę na krytyczny sukces
            // --- WYNIK: KRYTYCZNY SUKCES (NERF) ---
            successMultiplier = getRandomInRange(8, 12); // Było 15-30
            successType = 'Krytyczny Sukces';
            toastType = 'success';
        } else if (roll < finalSuccessChance * 0.5) {
            // --- WYNIK: CICHY SUKCES (NERF) ---
            successMultiplier = getRandomInRange(3, 7); // Było 5-15
            successType = 'Cichy Sukces';
            toastType = 'success';
        } else {
            // --- WYNIK: DEBIUT BEZ ECHA (NERF) ---
            successMultiplier = getRandomInRange(1.1, 2.8); // Było 1-5
            successType = 'Debiut bez Echa';
            toastType = 'default';
        }

        showToast(`${successType}! ${startup.name} wchodzi na giełdę!`, toastType, 4000);
        logEvent(`[IPO] ${successType} dla ${startup.name}! Mnożnik wyceny: x${successMultiplier.toFixed(1)}`, 'review');

        // Wywołanie funkcji pomocniczej, która zajmie się całym procesem IPO
        handleSuccessfulIPO(startup, successMultiplier);
    }
    displayStartups(getCurrentStartupInputValues());
}

function generateNewStartup() {
    let name;
    let sector;
    do {
        sector = getRandomElement(startupSectors);
    } while (sector[0] === 'Bankowość'); // Losuj ponownie, jeśli wylosowano Bankowość
    switch (sector[0]) {
        case 'Technologia':
            name = `${getRandomElement(techPrefixes)}${getRandomElement(techSuffixes)}`;
            break;
        case 'Gaming':
            name = `${getRandomElement(gamingPrefixes)}${getRandomElement(gamingSuffixes)}`;
            break;
        case 'Medycyna':
            name = `${getRandomElement(medPrefixes)}${getRandomElement(medSuffixes)}`;
            break;
        case 'Energia':
            name = `${getRandomElement(energyPrefixes)}${getRandomElement(energySuffixes)}`;
            break;
        case 'Finanse':
            name = `${getRandomElement(financePrefixes)}${getRandomElement(financeSuffixes)}`;
            break;
        case 'Żywność':
            name = `${getRandomElement(foodPrefixes)}${getRandomElement(foodSuffixes)}`;
            break;
        case 'Nieruchomości':
            name = `${getRandomElement(realtyPrefixes)}${getRandomElement(realtySuffixes)}`;
            break;
        case 'Chemia':
            name = `${getRandomElement(chemPrefixes)}${getRandomElement(chemSuffixes)}`;
            break;
        case 'Przemysł':
            name = `${getRandomElement(industryPrefixes)}${getRandomElement(industrySuffixes)}`;
            break;
        case 'Dobra konsumpcyjne':
            name = `${getRandomElement(consumerPrefixes)}${getRandomElement(consumerSuffixes)}`;
            break;
        case 'Usługi':
            name = `${getRandomElement(servicesPrefixes)}${getRandomElement(servicesSuffixes)}`;
            break;
        case 'Turystyka':
            name = `${getRandomElement(tourismPrefixes)}${getRandomElement(tourismSuffixes)}`;
            break;
        case 'Bankowość':
            name = `${getRandomElement(bankingPrefixes)}${getRandomElement(bankingSuffixes)}`;
            break;
        default:
            name = 'DejwCorp';
            break;
    }
    let symbol = (name.substring(0, 3) + name.charAt(Math.floor(name.length / 2))).toUpperCase();

    while (stocks.some(s => s.symbol === symbol)) {
        symbol += 'X';
    }


    let successChance = getRandomInRange(0.50, 0.75); // Bazowa szansa na sukces: 50-75%
    let isScam = false;
    let isWhiteCrow = false;
    let fundingGoal = Math.round(getRandomIntInRange(20000, 150000) / 1000) * 1000;

    // --- LOGIKA SPECJALNYCH PRZYPADKÓW ---
    const specialRoll = Math.random();

    if (specialRoll < 0.02) { // 2% szans na "białego kruka"
        isWhiteCrow = true;
        successChance = 1;

        fundingGoal *= 1.3; // "Białe kruki" mają wyższe cele
    } else if (specialRoll < 0.12) { // 10% szans na oszustwo (przedział od 2% do 12%)
        isScam = true;
        successChance = 0;
    }

    // Specjalna zasada dla firm gamingowych - większe ryzyko
    if (sector.includes('Gaming') && !isWhiteCrow) {
        successChance *= 0.7; // Obniżamy szansę na sukces o 30%
    }

    const newStartup = {
        name: name,
        symbol: symbol,
        exchange: 'INCUBATOR',
        price: getRandomInRange(0.5, 2.5),
        totalShares: 100000, maxShares: 100000, sharesHeld: 0, priceHistory: [], // Zysk za ostatni kwartał (dla wskaźnika C/Z) candlestickHistory: [], priceAlerts: { buy: null, sell: null },
        lineHistory: [], playerTransactions: [], playerTransactions: [],
        sector: sector,
        financialHealth: 0,
        volatilityFactor: getRandomInRange(2.5, 4.5),
        dividendPolicy: 'None',
        assetType: 'Startup',
        fundingGoal: Math.round(fundingGoal),
        currentFunding: 0,
        developmentProgress: 0,
        successChance: successChance,
        isScam: isScam,
        isWhiteCrow: isWhiteCrow,
        stage: 'funding',
        ipoPriceBonus: 0,
        marketBehavior: null,
        overfundingEndTime: 0,
        investors: {}
    };

    return newStartup;
}

// Upewniamy się, że funkcja jest dostępna globalnie w przeglądarce (bezpiecznie)
if (typeof window !== 'undefined') {
    try {
        if (typeof generateNewStartup === 'function') {
            window.generateNewStartup = generateNewStartup;
        } else {
            console.warn('[diag] generateNewStartup nie jest funkcją w tej chwili, nie przypisano do window.');
        }
    } catch (e) {
        console.warn('[diag] Nie udało się przypisać generateNewStartup do window:', e);
    }
}

function removeStartup(startup, refundPercentageMin = 0, refundPercentageMax = 0) {
    const symbol = startup.symbol;

    // Oblicz zwrot dla gracza
    const playerHolding = playerPortfolio[symbol];
    if (playerHolding && playerHolding.investedAmount > 0) {
        let refund = 0;
        if (playerHolding.isInsured) {
            refund = playerHolding.investedAmount * 0.75;
            // Wiadomość o ubezpieczeniu jest już w showToast, ale logEvent może być przydatny
            logEvent(`[BFG] 🛡️ Inwestycja gracza w ${startup.name} była ubezpieczona. Zwrot: ${refund.toFixed(2)} PLN.`, 'review');
        } else if (refundPercentageMax > 0) {
            refund = playerHolding.investedAmount * getRandomInRange(refundPercentageMin, refundPercentageMax);
        }

        if (refund > 0) {
            playerCash += refund;
            logEvent(`Otrzymujesz ${refund.toFixed(2)} PLN zwrotu z inwestycji w ${startup.name}.`, 'review');
        }
    }

    // Oblicz zwrot dla AI
    aiCompetitors.forEach(ai => {
        const aiHolding = ai.portfolio[symbol];
        if (aiHolding && aiHolding.investedAmount > 0) {
            const aiRefund = aiHolding.investedAmount * getRandomInRange(refundPercentageMin, refundPercentageMax);
            if (aiRefund > 0) {
                ai.cash += aiRefund;
            }
        }
    });

    // Usuń start-up z wszystkich list i portfeli
    const index = stocks.findIndex(s => s.symbol === symbol);
    if (index > -1) {
        stocks.splice(index, 1);
    }
    if (playerPortfolio[symbol]) {
        delete playerPortfolio[symbol];
    }
    aiCompetitors.forEach(ai => {
        if (ai.portfolio[symbol]) {
            delete ai.portfolio[symbol];
        }
    });

    // Zaplanuj pojawienie się nowego start-upu w przyszłości
    const delay = getRandomIntInRange(30000, 60000);
    setTimeout(() => {
        console.log('%c[GENERATOR] Uruchomiono tworzenie nowego start-upu!', 'color: orange; font-weight: bold;');
        const newStartup = generateNewStartup();
        stocks.push(newStartup);
        logEvent(`[INKUBATOR] Na rynku pojawił się nowy, obiecujący start-up: ${newStartup.name}!`, 'market');
    }, delay);

    // SCALONO: Usunięto wywołanie `displayStartups` z `removeStartup`, ponieważ było też w `finalizeStartup`
}

function handleSuccessfulIPO(startup, successMultiplier) {
    const symbol = startup.symbol;

    // Obliczanie wyceny i parametrów nowej spółki
    let totalInvested = startup.fundingGoal + startup.ipoPriceBonus;
    const ipoValuation = totalInvested * successMultiplier;
    const newIpoPrice = getRandomInRange(25, 50);
    const newTotalShares = Math.floor(ipoValuation / newIpoPrice);

    if (newTotalShares <= 0) return; // Zabezpieczenie na wypadek bardzo niskiej wyceny

    // Logika rozdawania akcji wszystkim inwestorom
    let sharesHeldByKnownInvestors = 0;

    // Inwestorzy bezpośredni (Gracz)
    const playerHolding = playerPortfolio[symbol];
    if (playerHolding && playerHolding.investedAmount > 0) {
        const playerOwnershipPct = playerHolding.investedAmount / totalInvested;
        playerPortfolio[symbol] = {
            shares: Math.floor(newTotalShares * playerOwnershipPct),
            avgPrice: newIpoPrice,
            // SCALONO: Zachowano 'assetType' z Twojej wersji, aby poprawnie wyświetlał się w portfelu po IPO
            assetType: 'stock' 
        };
        sharesHeldByKnownInvestors += playerPortfolio[symbol].shares;
    }

    // Inwestorzy bezpośredni (AI)
    aiCompetitors.forEach(ai => {
        const aiHolding = ai.portfolio[symbol];
        if (aiHolding && aiHolding.investedAmount > 0) {
            const aiOwnershipPct = aiHolding.investedAmount / totalInvested;
            ai.portfolio[symbol] = {
                shares: Math.floor(newTotalShares * aiOwnershipPct),
                avgPrice: newIpoPrice
                 // SCALONO: AI nie potrzebuje 'assetType: stock', domyślnie jest to akcja
            };
            sharesHeldByKnownInvestors += ai.portfolio[symbol].shares;
        }
    });

    // Inwestorzy z puli inwestycyjnej
    if (startup.poolInvestors) {
        startup.poolInvestors.forEach(investment => {
            const poolInvestmentFraction = investment.amount / totalInvested;
            const sharesForThisPoolInvestment = Math.floor(newTotalShares * poolInvestmentFraction);
            const totalContributionsInRound = Object.values(investment.contributors).reduce((a, b) => a + b, 0);

            if (totalContributionsInRound === 0) return;

            for (const [id, contribution] of Object.entries(investment.contributors)) {
                const contributorFraction = contribution / totalContributionsInRound;
                const sharesToDistribute = Math.floor(sharesForThisPoolInvestment * contributorFraction);

                if (sharesToDistribute <= 0) continue;

                if (id === 'player') {
                    if (playerPortfolio[symbol]) {
                        playerPortfolio[symbol].shares += sharesToDistribute;
                    } else {
                        // SCALONO: Dodano 'assetType: stock' dla spójności
                        playerPortfolio[symbol] = { shares: sharesToDistribute, avgPrice: newIpoPrice, assetType: 'stock' };
                    }
                    sharesHeldByKnownInvestors += sharesToDistribute;
                } else if (id.startsWith('ai')) {
                    const ai = aiCompetitors.find(a => a.id === id);
                    if (ai) {
                        if (ai.portfolio[symbol]) {
                            ai.portfolio[symbol].shares += sharesToDistribute;
                        } else {
                            ai.portfolio[symbol] = { shares: sharesToDistribute, avgPrice: newIpoPrice };
                        }
                        sharesHeldByKnownInvestors += sharesToDistribute;
                    }
                }
                if (investmentPool.playerStakes[id]) {
                    investmentPool.playerStakes[id] -= contribution;
                    if (investmentPool.playerStakes[id] < 0) investmentPool.playerStakes[id] = 0;
                }
            }
        });
        displayStartups(getCurrentStartupInputValues());
    }

    // --- 👇 NOWY BLOK: Przydział akcji dla banków sponsorujących (z Twojej wersji) 👇 ---
    commercialBanks.forEach(bank => {
        if (bank.startupInvestments && bank.startupInvestments[symbol]) {
            const investedAmount = bank.startupInvestments[symbol];
            const ownershipPct = investedAmount / totalInvested; // Procent w stosunku do CAŁOŚCI inwestycji
            const sharesForBank = Math.floor(newTotalShares * ownershipPct);

            if (sharesForBank > 0) {
                // Dodaj akcje do portfela banku
                bank.stockPortfolio[symbol] = { shares: sharesForBank, avgPrice: newIpoPrice };
                sharesHeldByKnownInvestors += sharesForBank;
                console.log(`[IPO] Bank ${bank.name} otrzymał ${sharesForBank} akcji ${symbol} za sponsoring.`);
                delete bank.startupInvestments[symbol]; // Usuń zapis o inwestycji
            }
        }
    });
    // --- 👆 KONIEC NOWEGO BLOKU 👆 ---

    // Ostateczna transformacja start-upu w spółkę giełdową
    startup.assetType = undefined;
    startup.exchange = 'BRONZE';
    startup.price = newIpoPrice;
    startup.totalShares = newTotalShares;
    startup.maxShares = newTotalShares * 2;
    startup.sharesHeld = sharesHeldByKnownInvestors;
    startup.financialHealth = getRandomIntInRange(1, 4); // Startuje z dobrą kondycją
    const boostDuration = getRandomIntInRange(8000, 20000);
    startup.marketBehavior = { phase: 'ipo_boost', endTime: Date.now() + boostDuration };
    
    // Usuwamy zbędne już właściwości start-upu
    delete startup.fundingGoal;
    delete startup.currentFunding;
    delete startup.developmentProgress;
    delete startup.successChance;
    delete startup.stage;
    delete startup.poolInvestors;

    initializeDescriptionParts(startup);
    initializeResearchForStock(startup);

    logEvent(`Spółka ${startup.name} wchodzi na rynek z ceną ${newIpoPrice.toFixed(2)} PLN i kapitałem ${newTotalShares.toLocaleString('pl-PL')} akcji!`, 'review');
}

function buyStartupInsurance(symbol) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const holding = playerPortfolio[symbol];
    if (!holding || holding.assetType !== 'Startup') return;

    // Sprawdź warunki
    if (getSkillLevel('startupInvestor') < 4) {
        alert("Musisz mieć 4 poziom 'Anioła Biznesu', aby wykupić ubezpieczenie.");
        return;
    }
    if (holding.isInsured) {
        alert("Ta inwestycja jest już ubezpieczona.");
        return;
    }

    // Oblicz koszt ubezpieczenia (5% wartości inwestycji)
    // SCALONO: W Twojej wersji było `holding.shares * holding.avgPrice`, co nie ma sensu dla startupu.
    // Zmieniam na `holding.investedAmount`, co jest logiczne.
    const insuranceCost = holding.investedAmount * 0.05;

    if (playerCash < insuranceCost) {
        alert(`Nie masz wystarczająco gotówki, aby wykupić ubezpieczenie! Potrzebujesz ${insuranceCost.toFixed(2)} PLN.`);
        return;
    }

    if (confirm(`Czy na pewno chcesz wykupić ubezpieczenie dla inwestycji w ${symbol} za ${insuranceCost.toFixed(2)} PLN?`)) {
        // Transakcja
        playerCash -= insuranceCost;
        holding.isInsured = true;

        logEvent(`🛡️ Wykupiono ubezpieczenie dla inwestycji w ${symbol} za ${insuranceCost.toFixed(2)} PLN.`, 'review');
        displayCash();
    }
}

function initializeDividendEstimates() {
    stocks.forEach(stock => {
        if (stock.assetType === 'REIT') {
            stock.estimatedDividend = stock.dividendPerShare;
        } else if (stock.dividendPolicy && stock.dividendPolicy !== 'Growth') {
            const estimatedTotal = stock.price * 0.02; // Uproszczona estymacja na start
            stock.estimatedDividend = stock.totalShares > 0 ? estimatedTotal / stock.totalShares : 0;
        } else {
            stock.estimatedDividend = 0;
        }
    });
}

function togglePauseGame() {
    isGamePaused = !isGamePaused;
    const pauseButton = document.getElementById('pause-game-btn');
    if (isGamePaused) {
        pauseButton.textContent = '▶️ Wznów';
        pauseButton.style.backgroundColor = '#28a745';
        console.log('--- GRA ZAPAUZOWANA ---');
    } else {
        pauseButton.textContent = '⏸️ Pauza';
        pauseButton.style.backgroundColor = '';
        console.log('--- GRA WZNOWIONA ---');
    }
}

function contributeToInvestmentPool(contributorId, amount) {
    // Walidacja dla gracza
    if (contributorId === 'player') {
        if (isPlayerInDefault()) return; // <-- DODANA LINIA
        if (isNaN(amount) || amount <= 0) {
            alert("Proszę wpisać poprawną kwotę.");
            return;
        }
        if (playerCash < amount) {
            alert("Nie masz wystarczająco gotówki!");
            return;
        }
        playerCash -= amount;
        displayCash();
    }
    // Walidacja dla AI
    else if (contributorId.startsWith('ai')) {
        const ai = aiCompetitors.find(a => a.id === contributorId);
        if (!ai || ai.cash < amount) {
            return; // AI nie może wpłacić, jeśli nie ma środków
        }
        ai.cash -= amount;
    }

    investmentPool.totalFunds += amount;
    investmentPool.contributors[contributorId] = (investmentPool.contributors[contributorId] || 0) + amount;
    investmentPool.playerStakes[contributorId] = (investmentPool.playerStakes[contributorId] || 0) + amount;
    console.log(`[PULA] ${contributorId} wpłacił(a) ${amount.toFixed(2)} PLN do puli inwestycyjnej.`, 'market');
}

function processPoolInvestments() {
    if (investmentPool.totalFunds < 1000) {
        return; // Nie inwestuj, jeśli w puli jest za mało środków
    }

    const availableStartups = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding');
    if (availableStartups.length === 0) {
        return; // Brak celów inwestycyjnych
    }

    const targetStartup = getRandomElement(availableStartups);
    const investmentAmount = investmentPool.totalFunds;

    // "Inwestujemy" w imieniu puli
    targetStartup.currentFunding += investmentAmount;
    targetStartup.investors['Pula Inwestycyjna'] = (targetStartup.investors['Pula Inwestycyjna'] || 0) + investmentAmount;
    // Zapisujemy, kto i ile zainwestował w tej rundzie, aby potem poprawnie rozdać akcje
    if (!targetStartup.poolInvestors) {
        targetStartup.poolInvestors = [];
    }
    targetStartup.poolInvestors.push({
        amount: investmentAmount,
        contributors: { ...investmentPool.contributors } // Kopia obecnych współtwórców
    });

    logEvent(`[PULA] 💰 Pula inwestycyjna zainwestowała ${investmentAmount.toFixed(2)} PLN w ${targetStartup.name}!`);

    // Resetujemy pulę
    investmentPool.totalFunds = 0;
    investmentPool.contributors = {};
}

function updateInvestmentPoolTimer(deltaTime) {
    if (investmentPool.investmentTimer > 0) {
        investmentPool.investmentTimer -= deltaTime;
    } else {
        processPoolInvestments();
        investmentPool.investmentTimer = investmentPool.INVESTMENT_INTERVAL; // Reset timera
    }
}

/**
 * Aktualizuje timer auto-inwestowania gracza i zleca wpłatę, jeśli czas minął.
 * @param {number} deltaTime - Czas, który upłynął od ostatniego ticka gry (w ms).
 */
function updateAutoInvestTimer(deltaTime) {
    if (!playerAutoInvest.isEnabled) {
        return; // Funkcja nie robi nic, jeśli auto-inwestowanie jest wyłączone.
    }

    playerAutoInvest.timer -= deltaTime;

    if (playerAutoInvest.timer <= 0) {
        // Czas minął, próbujemy zainwestować.
        if (playerCash >= playerAutoInvest.amount) {
            contributeToInvestmentPool('player', playerAutoInvest.amount);
            logEvent(`[AUTO-INWESTOWANIE] Automatycznie wpłacono ${playerAutoInvest.amount.toFixed(2)} PLN do puli.`);
        } else {
            // Gracz nie ma wystarczająco środków, wyłączamy auto-inwestowanie.
            playerAutoInvest.isEnabled = false;
            logEvent(`[AUTO-INWESTOWANIE] Brak środków! Auto-inwestowanie zostało wyłączone.`, 'review');
            // Opcjonalnie: powiadom gracza alertem
            alert("Brak wystarczających środków na koncie. Twoje auto-inwestowanie w pulę start-upów zostało wstrzymane.");
        }

        // Resetujemy timer na nową wartość z ustawień.
        playerAutoInvest.timer = playerAutoInvest.interval;
    }
}


const MINIMUM_STARTUPS = 3; // Poniżej tej liczby system zareaguje
const TARGET_STARTUPS = 5;  // Do tej liczby system uzupełni braki

function maintainStartupCount() {
    const currentStartups = stocks.filter(s => s.assetType === 'Startup').length;

    // Funkcja działa tylko wtedy, gdy liczba start-upów spadnie PONIŻEJ minimum
    if (currentStartups < MINIMUM_STARTUPS) {
        const startupsToAdd = TARGET_STARTUPS - currentStartups;
        console.log(`[INKUBATOR] Liczba start-upów (${currentStartups}) spadła poniżej minimum. Dodawanie ${startupsToAdd} nowych...`);

        for (let i = 0; i < startupsToAdd; i++) {
            const newStartup = generateNewStartup();
            stocks.push(newStartup);
            logEvent(`[INKUBATOR] Na rynku pojawił się nowy, obiecujący start-up: ${newStartup.name}!`, 'market');
        }
    }
}

/**
* Gracz próbuje sprywatyzować start-up.
* @param {string} symbol Symbol start-upu do sprywatyzowania.
*/
function privatizeStartup(symbol) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    if (getSkillLevel('startupInvestor') < 5) {
        alert("Musisz osiągnąć 5 poziom 'Anioła Biznesu', aby prywatyzować start-upy!");
        return;
    }

    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.assetType !== 'Startup') return;

    if (startup.isPrivatized) {
        alert("Ten start-up jest już prywatny.");
        return;
    }

    if (startup.stage !== 'funding') {
        alert("Można prywatyzować start-upy tylko w fazie finansowania.");
        return;
    }

    const privatizationCost = startup.fundingGoal * 1.2; // 20% premii za wykupienie
    const playerInvestment = playerPortfolio[symbol]?.investedAmount || 0;
    const finalCost = privatizationCost - playerInvestment;

    if (playerCash < finalCost) {
        alert(`Nie masz wystarczająco gotówki! Koszt prywatyzacji to ${finalCost.toFixed(2)} PLN.`);
        return;
    }

    if (confirm(`Czy na pewno chcesz sprywatyzować ${startup.name} za ${finalCost.toFixed(2)} PLN? To zagwarantuje sukces projektu, ale w przyszłości może wiązać się z dodatkowymi kosztami lub opóźnieniami.`)) {
        playerCash -= finalCost;

        // Oznacz jako sprywatyzowany
        startup.isPrivatized = true;

        // Zapisz oryginalne ryzyko i zagwarantuj sukces
        startup.originalSuccessChance = startup.successChance;
        startup.successChance = 1.0;

        // Dofinansuj do końca i przejmij w całości
        startup.currentFunding = startup.fundingGoal;
        startup.investors = { "Ty (Gracz)": startup.fundingGoal };
        if (playerPortfolio[symbol]) {
            playerPortfolio[symbol].investedAmount = startup.fundingGoal;
        } else {
            playerPortfolio[symbol] = { investedAmount: startup.fundingGoal, assetType: 'Startup', isInsured: false };
        }

        logEvent(`🏢 Sprywatyzowałeś start-up ${startup.name}! Projekt ma zagwarantowany sukces.`, 'review');

        displayCash();
        displayPortfolio();
        displayStartups(getCurrentStartupInputValues());
    }
}

/**
 * Gracz opłaca dodatkowy koszt komplikacji w sprywatyzowanym start-upie.
 * @param {string} symbol Symbol start-upu.
 */
function payExtraStartupCost(symbol) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || !startup.pendingExtraCost) return;

    const cost = startup.pendingExtraCost;

    if (playerCash < cost) {
        alert(`Nie masz wystarczająco gotówki, aby pokryć dodatkowe koszty (${cost.toFixed(2)} PLN).`);
        return;
    }
    playerCash -= cost;
    startup.pendingExtraCost = null; // Usuń blokadę kosztową
    startup.developmentProgress += 1; // Daj mały "kopniak", aby wznowić postęp

    logEvent(`Zapłacono dodatkowe ${cost.toFixed(2)} PLN, aby wznowić prace nad ${startup.name}.`, 'review');

    displayCash();
    displayStartups(getCurrentStartupInputValues());
}

/**
 * Uruchamia komplikację dla sprywatyzowanego start-upu, który w normalnych warunkach by upadł.
 * @param {object} startup Obiekt start-upu.
 */
function triggerPrivatizedStartupComplication(startup) {
    logEvent(`[Prywatyzacja] Wystąpiły nieprzewidziane problemy z projektem ${startup.name}...`, 'review');

    if (Math.random() < 0.5) {
        // Komplikacja: Dodatkowe koszty
        const extraCost = startup.fundingGoal * getRandomInRange(0.15, 0.30);
        startup.pendingExtraCost = extraCost;
        logEvent(`Projekt ${startup.name} wymaga dodatkowych ${extraCost.toFixed(2)} PLN! Prace zostały wstrzymane do czasu uregulowania płatności.`, 'review');
    } else {
        // Komplikacja: Opóźnienie
        const delaySeconds = getRandomIntInRange(45, 90);
        startup.developmentPausedUntil = Date.now() + (delaySeconds * 1000);
        logEvent(`Prace nad ${startup.name} zostały opóźnione o ${delaySeconds} sekund z powodu problemów technicznych.`, 'review');
    }
}


// Upewniamy się, że funkcja jest dostępna globalnie
if (typeof window !== 'undefined') {
    try {
        if (typeof initializeDividendEstimates === 'function') {
            window.initializeDividendEstimates = initializeDividendEstimates;
        } else {
            console.warn('[diag] initializeDividendEstimates nie jest funkcją w tej chwili, nie przypisano do window.');
        }
    } catch (e) {
        console.warn('[diag] Nie udało się przypisać initializeDividendEstimates do window:', e);
    }
}

// Sygnalizuj, że plik gameLogic.js został w pełni załadowany i wykonany
if (typeof window !== 'undefined') {
    try {
        window.dispatchEvent(new Event('gameLogicReady'));
        console.log('[diag] gameLogicReady event dispatched');
    } catch (e) {
        console.warn('[diag] Nie udało się rozesłać gameLogicReady:', e);
    }
}

function acceptStartupOffer(symbol, amount, offerType, offerValue) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.assetType !== 'Startup' || startup.stage !== 'funding') {
        alert("Niestety, ta oferta jest już nieaktualna!");
        return;
    }

    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki, aby dokonać tej inwestycji!");
        return;
    }

    let finalAmount = amount;
    let successChanceBonus = (amount / startup.fundingGoal) * 0.05; // Standardowy bonus
    let logMessage = `Przyjęto ofertę od ${startup.name} i zainwestowano ${amount.toFixed(2)} PLN.`;

    // Zastosuj bonusy z oferty
    switch (offerType) {
        case 'DISCOUNT':
            const discountedCost = amount * (1 - offerValue);
            if (playerCash < discountedCost) {
                alert(`Nie masz wystarczająco gotówki! Koszt po zniżce to ${discountedCost.toFixed(2)} PLN.`);
                return;
            }
            playerCash -= discountedCost;
            finalAmount = amount; // Inwestowana kwota pozostaje ta sama, płacisz mniej
            logMessage += ` Otrzymano ${offerValue * 100}% zniżki!`;
            break;
        case 'BONUS_SHARES':
            playerCash -= amount;
            finalAmount = amount * (1 + offerValue); // Wartość inwestycji jest wirtualnie powiększona
            logMessage += ` Otrzymano ${offerValue * 100}% bonusowych udziałów!`;
            break;
        case 'SUCCESS_BOOST':
            playerCash -= amount;
            finalAmount = amount;
            startup.successChance += offerValue; // Dodajemy stały bonus do szansy na sukces
            if (startup.successChance > 1) startup.successChance = 1;
            logMessage += ` Szansa na sukces projektu wzrosła o ${offerValue * 100}%!`;
            break;
        default:
             playerCash -= amount;
             break;
    }
    
    // Zaktualizuj dane start-upu
    startup.currentFunding += finalAmount;
    startup.successChance += successChanceBonus;
    if (startup.successChance > 1) startup.successChance = 1;

    // Zaktualizuj portfel gracza
    if (playerPortfolio[symbol]) {
        playerPortfolio[symbol].investedAmount += finalAmount;
    } else {
        playerPortfolio[symbol] = { investedAmount: finalAmount, assetType: 'Startup', isInsured: false };
    }
    
    const playerName = "Ty (Gracz)";
    startup.investors[playerName] = (startup.investors[playerName] || 0) + finalAmount;
    
    logEvent(logMessage, 'review');

    // Zamknij modal i odśwież widok
    document.getElementById('startup-offer-modal').style.display = 'none';
    displayCash();
    displayPortfolio();
    displayStartups(getCurrentStartupInputValues());
}

function updateStartupAutoInvestTimers(deltaTime) {
    for (const symbol in playerStartupAutoInvest) {
        const settings = playerStartupAutoInvest[symbol];
        
        if (settings.isEnabled) {
            settings.timer -= deltaTime;

            if (settings.timer <= 0) {
                const startup = stocks.find(s => s.symbol === symbol);
                // Sprawdź, czy inwestycja jest nadal możliwa
                if (startup && (startup.stage === 'funding' || startup.stage === 'overfunding')) {
                    if (playerCash >= settings.amount) {
                        investInStartup(symbol, settings.amount);
                        logEvent(`[AUTO-STARTUP] Automatycznie zainwestowano ${settings.amount.toFixed(2)} PLN w ${startup.name}.`);
                    } else {
                        settings.isEnabled = false; // Wyłącz, jeśli brak środków
                        logEvent(`[AUTO-STARTUP] Brak środków! Auto-inwestowanie w ${startup.name} zostało wyłączone.`, 'review');
                        showToast(`Brak środków! Auto-inwestowanie w ${startup.name} wyłączone.`, 'error');
                    }
                } else {
                    settings.isEnabled = false; // Wyłącz, jeśli start-up nie przyjmuje już wpłat
                    logEvent(`[AUTO-STARTUP] Start-up ${symbol} nie przyjmuje już inwestycji. Auto-inwestowanie wyłączone.`, 'review');
                }
                
                settings.timer = settings.interval; // Zresetuj timer
            }
        }
    }
}

function makeOfferToState() {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const symbol = document.getElementById('state-company-select').value;
    const quantity = document.getElementById('state-offer-quantity').valueAsNumber;

    if (!symbol) {
        alert("Proszę wybrać spółkę, której akcje chcesz kupić.");
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        alert("Proszę wpisać poprawną, dodatnią liczbę akcji.");
        return;
    }

    const stock = stocks.find(s => s.symbol === symbol);

    if (stock.stateOfferCooldownUntil && Date.now() < stock.stateOfferCooldownUntil) {
        alert("Możesz złożyć kolejną ofertę dla tej spółki dopiero po upływie czasu oczekiwania.");
        return;
    }

    const exchangeLevel = exchanges[stock.exchange].level;
    let premium = 1.10;
    if (exchangeLevel >= 3) premium = 1.25;
    else if (exchangeLevel >= 2) premium = 1.20;
    else if (exchangeLevel >= 1) premium = 1.15;
    
    const offerPrice = stock.price * premium;
    const totalCost = offerPrice * quantity;

    if (playerCash < totalCost) {
        alert(`Nie masz wystarczająco gotówki! Potrzebujesz ${totalCost.toFixed(2)} PLN.`);
        return;
    }

    if (stock.financialHealth >= 4 && Math.random() < 0.5) {
        // --- ZMIANA 1: Alert -> Toast (Odmowa) ---
        showToast("Oferta odrzucona! Państwo nie jest zainteresowane sprzedażą.", 'error', 5000);
        stock.stateOfferCooldownUntil = Date.now() + (120 * 1000 / currentSpeedMultiplier);
        updateStateOfferInfo();
        return;
    }

    const stateShares = Math.floor(stock.totalShares * stock.stateOwnershipPct);
    if (quantity > stateShares) {
        alert(`Państwo nie posiada wystarczającej liczby akcji na sprzedaż. Maksymalna dostępna liczba to ${stateShares}.`);
        return;
    }

    // Transakcja udana
    playerCash -= totalCost;
    playerPortfolio[symbol].shares += quantity;
    
    const newOwnedByState = stateShares - quantity;
    stock.stateOwnershipPct = newOwnedByState / stock.totalShares;

    stock.stateOfferCooldownUntil = Date.now() + (120 * 1000 / currentSpeedMultiplier);

    // --- ZMIANA 2: Alert -> Toast (Akceptacja) ---
    showToast(`Oferta przyjęta! Nabyłeś ${quantity} akcji ${stock.name}.`, 'success', 5000);
    logEvent(`🏛️ Nabyłeś w ofercji specjalnej ${quantity} akcji ${stock.name} od państwa.`, 'review');

    displayCash();
    displayPortfolio();
    updateStateOfferInfo();
}

function checkPriceAlerts() {
    stocks.forEach(stock => {
        if (!stock.priceAlerts) return;

        // Sprawdź alert kupna (cena spada poniżej progu)
        if (stock.priceAlerts.buy !== null && stock.price <= stock.priceAlerts.buy) {
            showToast(`🔔 ALERT CENOWY: ${stock.name} osiągnął cenę zakupu ${stock.priceAlerts.buy.toFixed(2)} PLN!`, 'success', 7000);
            stock.priceAlerts.buy = null; // Wyłącz alert po aktywacji
        }

        // Sprawdź alert sprzedaży (cena rośnie powyżej progu)
        if (stock.priceAlerts.sell !== null && stock.price >= stock.priceAlerts.sell) {
            showToast(`🔔 ALERT CENOWY: ${stock.name} osiągnął cenę sprzedaży ${stock.priceAlerts.sell.toFixed(2)} PLN!`, 'error', 7000);
            stock.priceAlerts.sell = null; // Wyłącz alert po aktywacji
        }
    });
}

function applyTechnology(stock, techId) {
    const tech = technologies[techId];
    if (!tech) return;

    tech.applyEffect(stock);
    stock.research.unlockedTechs.push(techId);
    
    // --- KLUCZOWA LOGIKA DECYZYJNA ---
    if (stock.researchUnlocks.canInterfere) {
        // Zatrzymaj badania i ustaw timer na podjęcie decyzji
        stock.research.currentTech = null;
        stock.research.progress = 0;
        stock.research.choiceAvailableUntil = Date.now() + 15000; // 15 sekund rzeczywistego czasu
        logEvent(`🔬 ${stock.name} kończy badania i czeka na Twoją decyzję co do następnego projektu!`);
    } else {
        // Losuj następną technologię automatycznie (stara logika)
        const availableTechs = Object.keys(technologies).filter(id => 
            !stock.research.unlockedTechs.includes(id) &&
            (technologies[id].sector === 'common' || stock.sector.includes(technologies[id].sector)) &&
            technologies[id].type === stock.research.specialization
        );

        if (availableTechs.length > 0) {
            stock.research.currentTech = getRandomElement(availableTechs);
            stock.research.progress = 0;
            logEvent(`🔬 ${stock.name} rozpoczyna nowe badania nad technologią: "${technologies[stock.research.currentTech].name}".`);
        } else {
            stock.research.isResearching = false;
            stock.research.currentTech = null;
            logEvent(`🔬 ${stock.name} zakończył wszystkie dostępne badania w swojej specjalizacji.`);
        }
    }
}

function checkResearchChoiceTimers() {
    stocks.forEach(stock => {
        // Sprawdź, czy dla spółki jest aktywny timer wyboru
        if (stock.research && stock.research.choiceAvailableUntil && Date.now() > stock.research.choiceAvailableUntil) {
            
            // Czas minął, dokonaj losowego wyboru
            console.log(`[TIMER] Czas na wybór technologii dla ${stock.name} minął. Wybieranie losowe.`);
            
            const availableTechs = Object.keys(technologies).filter(id => 
                !stock.research.unlockedTechs.includes(id) &&
                (technologies[id].sector === 'common' || stock.sector.includes(technologies[id].sector)) &&
                technologies[id].type === stock.research.specialization
            );

            if (availableTechs.length > 0) {
                const randomChoice = getRandomElement(availableTechs);
                // Używamy istniejącej funkcji, aby wybrać technologię
                chooseNextResearch(stock.symbol, randomChoice); 
            }
            
            // Wyłącz timer
            stock.research.choiceAvailableUntil = null;
        }
    });
}

function updateResearchProgress(deltaTime) {
    const researchPoints = deltaTime / 2500;

    stocks.forEach(stock => {
        if (stock.research && stock.research.isResearching && stock.research.currentTech) {
            const baseSpeedMultiplier = stock.research.researchSpeedMultiplier || 1.0;
            let ceoMultiplier = 1.0;
            if (stock.ceo && stock.ceo.traits) {
                if (stock.ceo.traits.some(t => t.id === 'wizjoner')) ceoMultiplier *= 1.10;
                if (stock.ceo.traits.some(t => t.id === 'glowa_w_chmurach')) ceoMultiplier *= 0.95;
                if (stock.ceo.traits.some(t => t.id === 'geniusz_innowacji')) ceoMultiplier *= 1.25;
                if (stock.ceo.traits.some(t => t.id === 'biurowy_dron')) ceoMultiplier *= 1.05;
                if (stock.ceo.traits.some(t => t.id === 'ksiegowy')) ceoMultiplier *= 0.95;
                if (stock.ceo.traits.some(t => t.id === 'lowca_glow')) ceoMultiplier *= 1.10;
            }

            stock.research.progress += researchPoints * baseSpeedMultiplier * ceoMultiplier;

            const currentTechCost = technologies[stock.research.currentTech]?.cost;
            if (currentTechCost && stock.research.progress >= currentTechCost) {
                logEvent(`💡 PRZEŁOM! ${stock.name} zakończył badania nad technologią: "${technologies[stock.research.currentTech].name}"!`);
                applyTechnology(stock, stock.research.currentTech);
            }
        }
    });
}

function initializeResearchForStock(stock) {
    // Ta funkcja nie dotyczy start-upów i funduszy REIT
    if (stock.assetType === 'Startup' || stock.assetType === 'REIT' || stock.assetType === 'ResearchInstitute') {
        return; // Ta funkcja nie dotyczy start-upów, REIT-ów i Instytutów Badawczych
    }

    const specializations = ["wzmacnianie rozwoju", "wzmacnianie pozycji na rynku", "wzmacnianie ceny i zysków"];
    const shouldResearch = Math.random() > 0.10; // 90% szans, że firma prowadzi badania

    stock.research = {
        isResearching: shouldResearch,
        specialization: null,
        researchSpeedMultiplier: 1.0,
        currentTech: null,
        progress: 0,
        unlockedTechs: []
    };
    stock.researchUnlocks = {
        canSeeSpecialization: false, canSeeResults: false, canFund: false,
        canInfluence: false, canInterfere: false
    };

    if (shouldResearch) {
        // Losuj specjalizację
        stock.research.specialization = getRandomElement(specializations);
        
        // Znajdź pierwszą dostępną technologię dla tej specjalizacji i sektora
        const availableTechs = Object.keys(technologies).filter(id => 
            (technologies[id].sector === 'common' || stock.sector.includes(technologies[id].sector)) &&
            technologies[id].type === stock.research.specialization
        );

        if (availableTechs.length > 0) {
            stock.research.currentTech = getRandomElement(availableTechs);
        } else {
            // Jeśli w danym sektorze nie ma badań dla tej specjalizacji, wyłącz badania
            stock.research.isResearching = false;
        }
    }
}

function unlockResearchTier(symbol, tierName, cost) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const stock = stocks.find(s => s.symbol === symbol);
    let finalCost = cost;
    const playerRep = stock.reputation['player'];

    if (playerRep < REPUTATION_LEVELS.NEGATIVE) finalCost *= 1.10; // 10% drożej
    else if (playerRep >= REPUTATION_LEVELS.POSITIVE) finalCost *= 0.98; // 2% taniej
    if (!stock || playerCash < cost) {
        showToast("Za mało gotówki, aby odblokować ten poziom!", 'error');
        return;
    }
    if (stock.researchUnlocks[tierName]) {
        showToast("Ten poziom jest już odblokowany.", 'default');
        return;
    }

    playerCash -= cost;
    stock.researchUnlocks[tierName] = true;
    
    showToast("Dostęp odblokowany!", 'success');
    logEvent(`🔬 Odblokowałeś nowy poziom dostępu do R&D w ${stock.name}.`);

    displayCash();
    openResearchModal(symbol); // Odśwież widok panelu badań
}

function fundResearch(symbol) {
    if (isPlayerInDefault()) return; // <-- DODAJ TĘ LINIĘ
    const stock = stocks.find(s => s.symbol === symbol);
    const amountInput = document.getElementById('rd-funding-amount');
    const amount = amountInput.valueAsNumber;

    if (!stock || !amount || amount <= 0) {
        alert("Wpisz poprawną kwotę.");
        return;
    }
    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki!");
        return;
    }

    playerCash -= amount;
    stock.research.progress += amount; // 1 PLN = 1 punkt postępu
    
    showToast(`Sfinansowano badania w ${stock.name} kwotą ${amount.toFixed(2)} PLN!`, 'success');
    logEvent(`🔬 Przyspieszono badania w ${stock.name} o ${amount} punktów.`);

    displayCash();
    openResearchModal(symbol); // Odśwież widok
    openManagementModal(symbol); // Odśwież też główny panel, by zaktualizować pasek
    amountInput.value = '';
}

function changeResearchSpecialization(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    const newSpecialization = document.getElementById('rd-specialization-select').value;

    if (!stock || stock.research.specialization === newSpecialization) return;

    stock.research.specialization = newSpecialization;
    stock.research.progress = 0; // Reset postępu
    
    // Znajdź nową technologię w nowej specjalizacji
    const availableTechs = Object.keys(technologies).filter(id => 
        !stock.research.unlockedTechs.includes(id) &&
        (technologies[id].sector === 'common' || stock.sector.includes(technologies[id].sector)) &&
        technologies[id].type === newSpecialization
    );
    
    if (availableTechs.length > 0) {
        stock.research.currentTech = getRandomElement(availableTechs);
        logEvent(`🔬 Pod Twoim wpływem, ${stock.name} zmienia specjalizację badawczą i rozpoczyna pracę nad: "${technologies[stock.research.currentTech].name}".`, 'review');
    } else {
        stock.research.isResearching = false;
        stock.research.currentTech = null;
        logEvent(`🔬 ${stock.name} zmienia specjalizację, ale nie ma w niej dostępnych badań. Program R&D wstrzymany.`);
    }

    openResearchModal(symbol); // Odśwież widok
    openManagementModal(symbol);
}

function chooseNextResearch(symbol, chosenTechId) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !chosenTechId) return;

    stock.research.currentTech = chosenTechId;
    stock.research.progress = 0;
    
    logEvent(`🔬 Ingerencja w ${stock.name} udana! Firma rozpoczyna badania nad wybraną technologią: "${technologies[chosenTechId].name}".`, 'review');
    showToast("Nowy projekt badawczy został wybrany!", 'success');
    
    openResearchModal(symbol);
    openManagementModal(symbol);
}

function updateResearchInstitutes() {
    // 1. Policz wszystkie technologie odblokowane przez inne firmy
    const totalTechsByType = {
        'wzmacnianie rozwoju': 0,
        'wzmacnianie pozycji na rynku': 0,
        'wzmacnianie ceny i zysków': 0
    };
    
    stocks.filter(s => s.assetType !== 'ResearchInstitute' && s.research?.unlockedTechs.length > 0)
          .forEach(s => {
              s.research.unlockedTechs.forEach(techId => {
                  const tech = technologies[techId];
                  if (tech && totalTechsByType.hasOwnProperty(tech.type)) {
                      totalTechsByType[tech.type]++;
                  }
              });
          });

    // 2. Znajdź instytuty badawcze
    const researchInstitutes = stocks.filter(s => s.assetType === 'ResearchInstitute');
    
    // 3. Zastosuj bonusy do każdego instytutu
    researchInstitutes.forEach(stock => {
        let priceBonus = 0;
        let healthBonus = 0;
        let volatilityModifier = 1.0;

        // Bonus do ceny za technologie zysków
        priceBonus += totalTechsByType['wzmacnianie ceny i zysków'] * 0.05; // +0.05 PLN do ceny za każdą taką tech.

        // Bonus do kondycji za technologie rozwoju
        healthBonus += totalTechsByType['wzmacnianie rozwoju'] * 0.02;

        // Bonus do stabilności (niższa zmienność) za technologie pozycji na rynku
        const marketPositionTechs = totalTechsByType['wzmacnianie pozycji na rynku'];
        volatilityModifier -= (marketPositionTechs * 0.005); // -0.5% do zmienności za każdą taką tech.
        
        // Zastosuj efekty
        stock.price += priceBonus;
        stock.financialHealth += healthBonus;
        stock.volatilityFactor *= volatilityModifier;
        if(stock.volatilityFactor < 0.1) stock.volatilityFactor = 0.1;
    });
}

function checkResearchInstitutePositions() {
    // 1. Zresetuj wszystkie bonusy prędkości badań
    stocks.forEach(s => {
        if(s.research) s.research.researchSpeedMultiplier = 1.0;
    });

    const researchInstitutesIndices = [];
    stocks.forEach((s, index) => {
        if (s.assetType === 'ResearchInstitute') {
            researchInstitutesIndices.push(index);
        }
    });

    researchInstitutesIndices.forEach(index => {
        const neighbors = [stocks[index - 1], stocks[index + 1]];
        
        // 2. Zastosuj bonus do sąsiadów
        neighbors.forEach(neighbor => {
            if (neighbor && neighbor.research && neighbor.research.isResearching) {
                neighbor.research.researchSpeedMultiplier = 1.05; // Bonus +5%
            }
        });

        // 3. Sprawdź, czy sąsiad też jest instytutem badawczym
        const nextStock = stocks[index + 1];
        if (nextStock && nextStock.assetType === 'ResearchInstitute') {
            const stockToMove = Math.random() < 0.5 ? stocks[index] : nextStock;
            const direction = Math.random() < 0.5 ? 'up' : 'down';
            
            let priceChange = direction === 'up' ? 2.5 : -0.8; // Mnożnik x2.5 lub /5
            
            applyPriceEffect(stockToMove.symbol, priceChange, 'neutral');
            
            const message = direction === 'up' 
                ? `Wybuch innowacji! Konkurencja między ${stockToMove.name} a sąsiadem owocuje przełomem i skokowym wzrostem wyceny!`
                : `Konflikt o patenty! Wojna podjazdowa między ${stockToMove.name} a sąsiadem negatywnie wpływa na jego wycenę.`;
                
            showToast(message, direction === 'up' ? 'success' : 'error', 6000);
            logEvent(`🧪 ${message}`);
        }
    });
}

function processCeoActions(deltaTime) {
    stocks.forEach(stock => {
        if (!stock.ceo || !stock.ceo.traits) return;

        stock.ceo.traits.forEach(trait => {
            if (!stock.ceo.timers) stock.ceo.timers = {};

            // --- POCZĄTEK ZMIAN DLA CECHY KAPITALISTA ---
            if (trait.id === 'kapitalista') {
                if (stock.ceo.timers.buyback === undefined) {
                    stock.ceo.timers.buyback = getRandomIntInRange(4 * 60 * 1000, 7 * 60 * 1000);
                }
                stock.ceo.timers.buyback -= deltaTime;

                if (stock.ceo.timers.buyback <= 0) {
                    const sharesToBuy = Math.floor(stock.totalShares * 0.001); // Skup 0.1% akcji
                    const availableSharesOnMarket = stock.totalShares - stock.sharesHeld - (stock.treasuryShares || 0);

                    if (sharesToBuy > 0 && sharesToBuy <= availableSharesOnMarket) {
                        // Inicjalizuj 'treasuryShares', jeśli nie istnieje
                        if (!stock.treasuryShares) stock.treasuryShares = 0;
                        
                        // Zamiast niszczyć akcje, dodajemy je do puli akcji własnych spółki
                        stock.treasuryShares += sharesToBuy;
                        
                        logEvent(`📈 [Kapitalista] Zarząd ${stock.name} ogłasza skup akcji własnych w celu podniesienia wartości dla akcjonariuszy!`, 'company');
                    }
                    stock.ceo.timers.buyback = getRandomIntInRange(4 * 60 * 1000, 7 * 60 * 1000); // Reset timera
                }
            }
            // --- KONIEC ZMIAN DLA CECHY KAPITALISTA ---

            if (trait.id === 'legenda') {
                if (stock.ceo.timers.legendBoost === undefined) {
                    stock.ceo.timers.legendBoost = 10 * 60 * 1000;
                }
                stock.ceo.timers.legendBoost -= deltaTime;

                if (stock.ceo.timers.legendBoost <= 0) {
                    applyPriceEffect(stock.symbol, 0.035, 'positive', 'review');
                    logEvent(`🏆 [Legenda] Charyzma prezesa ${stock.name} znów przyciąga inwestorów!`, 'company');
                    stock.ceo.timers.legendBoost = 10 * 60 * 1000; // Reset timera
                }
            }
        });
    });
}

function initiateCeoChange(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    const playerShares = playerPortfolio[symbol]?.shares || 0;
    const ownershipPct = (playerShares / stock.totalShares) * 100;

    if (ownershipPct <= 50) {
        showToast("Musisz posiadać ponad 50% akcji, aby zainicjować zmianę prezesa!", 'error');
        return;
    }

    // Generujemy 3 kandydatów
    const candidates = [
        generateCeoCandidate(stock),
        generateCeoCandidate(stock),
        generateCeoCandidate(stock)
    ];
    
    // Obliczamy szansę na sukces
    const baseChance = 0.50;
    const bonusChance = (ownershipPct - 50) * 0.01;
    const successChance = Math.min(1.0, baseChance + bonusChance); // Ogranicz do 100%

    // Zapisujemy kandydatów tymczasowo w obiekcie spółki
    stock.ceoCandidates = candidates;
    
    openCeoChoiceModal(symbol, candidates, successChance);
}

/**
* Finalizuje próbę zmiany prezesa po wyborze kandydata przez gracza.
* @param {string} symbol Symbol spółki.
* @param {number} candidateIndex Indeks wybranego kandydata.
*/
/**
 * Finalizuje próbę zmiany prezesa po wyborze kandydata przez gracza.
 * Wersja zaktualizowana: pobiera opłatę za próbę i wpływa na reputację.
 * @param {string} symbol Symbol spółki.
 * @param {number} candidateIndex Indeks wybranego kandydata.
 */
function confirmCeoChange(symbol, candidateIndex) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !stock.ceoCandidates) return;

    const chosenCandidate = stock.ceoCandidates[candidateIndex];
    document.getElementById('ceo-choice-modal').style.display = 'none'; // Zamknij modal

    // --- POCZĄTEK POPRAWEK ---

    // 1. Oblicz i pobierz koszt operacji (5% wartości rynkowej)
    const marketCap = stock.price * stock.totalShares;
    const operationCost = marketCap * 0.05;

    // 2. Sprawdź, czy gracza stać NA TEN MOMENT
    // (Mógł wydać pieniądze, gdy okno wyboru było otwarte)
    if (playerCash < operationCost) {
        showToast("Brak środków! Nie stać Cię na przeprowadzenie operacji zmiany prezesa.", 'error');

        // Ustawiamy cooldown mimo wszystko, bo próba została podjęta i nie powiodła się
        stock.ceo.fireCooldown = Date.now() + (BASE_DELAYS.quarterly * 2 / currentSpeedMultiplier);
        delete stock.ceoCandidates;
        openManagementModal(symbol); // Odśwież widok
        return; // Zakończ funkcję
    }

    // 3. Pobierz opłatę za próbę
    playerCash -= operationCost;
    displayCash(); // Natychmiast zaktualizuj gotówkę
    logEvent(`💸 Pobrano ${operationCost.toFixed(2)} PLN za próbę zwołania walnego zgromadzenia w ${stock.name}.`, 'review');

    // --- KONIEC POPRAWEK ---

    const playerShares = playerPortfolio[symbol]?.shares || 0;
    const ownershipPct = (playerShares / stock.totalShares) * 100;
    const baseChance = 0.50;
    const bonusChance = (ownershipPct - 50) * 0.01;
    const successChance = Math.min(1.0, baseChance + bonusChance);

    if (Math.random() < successChance) {
        // SUKCES!
        const oldCeo = stock.ceo; // Zapisujemy cały obiekt starego CEO
        replaceCeo(stock, chosenCandidate); // Przekazujemy wybranego kandydata
        logEvent(`👑 Zmiana warty w ${stock.name}! Po Twojej interwencji powołano nowego prezesa.`, 'review');
        showToast(`Sukces! W ${stock.name} powołano nowego prezesa.`, 'success');

        // POPRAWKA: Mniejszy cios w reputację za sukces
        changeReputation('player', symbol, -10); // -10 za udaną "intrygę"

    } else {
        // PORAŻKA
        logEvent(`👑 Twoja próba powołania nowego prezesa w ${stock.name} nie powiodła się. Rada nadzorcza odrzuciła kandydaturę.`, 'review');
        showToast("Porażka! Rada nadzorcza zablokowała Twoją decyzję.", 'error');

        // POPRAWKA: Większy cios w reputację za porażkę
        changeReputation('player', symbol, -25); // -25 za nieudaną próbę (wygląda to źle)
    }

    // Ustaw cooldown i wyczyść kandydatów (ten kod był już poprawny)
    stock.ceo.fireCooldown = Date.now() + (BASE_DELAYS.quarterly * 2 / currentSpeedMultiplier);
    delete stock.ceoCandidates;
    openManagementModal(symbol); // Odśwież widok
}

/**
 * Aktualizuje staż pracy (tenure) wszystkich prezesów. Wywoływane co kwartał.
 */
function updateCeoTenureAndAge() {
    stocks.forEach(stock => {
        if (stock.ceo && stock.ceo.tenure !== undefined) {
            stock.ceo.tenure += 4; // Dodajemy 4 kwartały (rok)
            stock.ceo.age += 1; // Prezes starzeje się o rok
        }
    });
}

function replaceCeo(stock, newCeo) {
    const oldCeo = stock.ceo;

    // 1. Sprawdź cechy starego prezesa
    if (oldCeo && oldCeo.traits.some(t => t.id === 'kapitalista') && stock.treasuryShares > 0) {
        const soldShares = stock.treasuryShares;
        stock.treasuryShares = 0; // Akcje wracają na rynek (zwiększając free float)
        
        // Aplikujemy mały, negatywny wpływ na cenę
        applyPriceEffect(stock.symbol, -0.01, 'negative', 'company');
        logEvent(`[CEO] Po odejściu prezesa-kapitalisty, ${stock.name} sprzedaje ${soldShares.toLocaleString('pl-PL')} akcji własnych, co lekko obniża kurs.`, 'review');
    }

    // 2. Przypisz nowego prezesa
    newCeo.tenure = 0; // Upewnij się, że nowy prezes ma zerowy staż w firmie
    stock.ceo = newCeo;
}

function executeForcedDividend(stock) {
    if (Date.now() < stock.dividendCooldownUntil) {
        return false; // Nie można jeszcze wymusić dywidendy
    }

    const dividendTotalAmount = (stock.price * stock.totalShares) * 0.04; // 4% wartości rynkowej
    const dividendPerShare = dividendTotalAmount / stock.totalShares;

    // Wywołujemy uniwersalną funkcję, która płaci wszystkim akcjonariuszom
    payDividendToShareholders(stock, dividendPerShare);

    // Ustawiamy cooldown
    stock.dividendCooldownUntil = Date.now() + (BASE_DELAYS.quarterly / 2); // Cooldown na pół kwartału
    
    // Zmniejszamy kondycję finansową, bo to obciąża firmę
    stock.financialHealth -= 0.5;

    return true; // Sukces
}

/**
 * Funkcja wywoływana, gdy gracz klika przycisk w panelu zarządzania.
 * @param {string} symbol Symbol spółki.
 */
function forceDividend(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    if (executeForcedDividend(stock)) {
        logEvent(`👑 Na Twój wniosek, zarząd ${stock.name} wypłaca specjalną dywidendę!`, 'review');
        showToast("Dywidenda została wypłacona!", 'success');

        // --- POCZĄTEK POPRAWKI: Uwzględnienie Charyzmy Lvl 1 i 4 ---
        // Działanie gracza (wymuszenie dywidendy) ma mniejszy negatywny skutek dla reputacji
        let repLoss = -15;
        // SCALONO: (Używamy 'charisma' jak w definicji umiejętności)
        const charismaLevel = getSkillLevel('charisma');

        if (charismaLevel >= 4) {
            repLoss *= 0.50; // Lvl 4: 50% redukcji
        } else if (charismaLevel >= 1) {
            repLoss *= 0.85; // Lvl 1-3: 15% redukcji
        }
        changeReputation('player', symbol, repLoss);
        // --- KONIEC POPRAWKI ---

        openManagementModal(symbol); // Odśwież widok modala
    } else {
        showToast("Nie można jeszcze zażądać kolejnej dywidendy.", 'warning');
    }
}
function initializeAnalyticalProperties(stock) {
    const stabilityOptions = ["Bardzo Stabilny", "Stabilny", "Niestabilny", "Wewnętrzne tarcia", "Chaos"];
    const strategyOptions = ["Agresywna ekspansja", "Cięcia kosztów", "Kampania marketingowa", "Skup akcji własnych", "Inwestycje w R&D", "Poszukiwanie celu do przejęcia"];

    stock.analytical = {
        stability: getRandomElement(stabilityOptions),
        strategy: getRandomElement(strategyOptions),
        ceoCompetence: getRandomIntInRange(-5, 5)
    };
}

function updateAnalyticalProperties() {
    console.log("[Analityka] Aktualizowanie ukrytych danych korporacyjnych...");
    const stabilityOptions = ["Bardzo Stabilny", "Stabilny", "Niestabilny", "Wewnętrzne tarcia", "Chaos"];
    const strategyOptions = ["Agresywna ekspansja", "Cięcia kosztów", "Kampania marketingowa", "Skup akcji własnych", "Inwestycje w R&D", "Poszukiwanie celu do przejęcia"];

    stocks.forEach(stock => {
        if (stock.analytical && Math.random() < 0.25) { // 25% szans na zmianę w kwartale
            if (Math.random() < 0.5) {
                stock.analytical.strategy = getRandomElement(strategyOptions);
            } else {
                stock.analytical.stability = getRandomElement(stabilityOptions);
            }
        }
    });
}

function checkCompanyCounterActions() {
    stocks.forEach(stock => {
        if (stock.assetType === 'Startup' || stock.isBankrupt) return;

        for (const entityId in stock.reputation) {
            const rep = stock.reputation[entityId];
            
            // Sprawdź, czy reputacja jest negatywna
            if (rep < REPUTATION_LEVELS.NEGATIVE) {
                let holding;
                if (entityId === 'player') {
                    holding = playerPortfolio[stock.symbol];
                } else {
                    const ai = aiCompetitors.find(a => a.id === entityId);
                    holding = ai?.portfolio[stock.symbol];
                }
                
                // Sprawdź, czy dana jednostka ma ponad 50% udziałów
                if (holding && (holding.shares / stock.totalShares) > 0.5) {
                    
                    // Uruchom akcję z 25% szansą w każdym cyklu
                    if (Math.random() < 0.25) {
                        triggerCompanyCounterAction(stock, entityId);
                    }
                    return; // Tylko jedna akcja na spółkę na cykl
                }
            }
        }
    });
}

/**
 * Spółka próbuje osłabić pozycję dominującego udziałowca z negatywną reputacją.
 * @param {object} stock - Obiekt spółki.
 * @param {string} dominantEntityId - ID gracza lub AI, którego pozycję trzeba osłabić.
 */
function triggerCompanyCounterAction(stock, dominantEntityId) {
    const sharesToIssue = Math.floor(stock.totalShares * 0.05); // Emisja 5% nowych akcji
    const discountPrice = stock.price * (1 - getRandomInRange(0.10, 0.20)); // Cena ze zniżką 10-20%

    logEvent(`🚨 ${stock.name} próbuje osłabić Twoją dominację, emitując ${sharesToIssue} nowych akcji ze zniżką dla konkurencji!`, 'review');

    // Zwiększamy pule akcji
    stock.totalShares += sharesToIssue;
    stock.maxShares += sharesToIssue;
    
    // Logika oferowania akcji konkurencji (w tym przypadku botom)
    const potentialBuyers = aiCompetitors.filter(ai => ai.id !== dominantEntityId);
    let sharesSold = 0;

    potentialBuyers.forEach(ai => {
        const sharesToOffer = Math.floor(sharesToIssue / potentialBuyers.length);
        const cost = sharesToOffer * discountPrice;

        let acceptanceChance = 0.2; // Bazowa szansa
        if (ai.cash > cost * 2) acceptanceChance += 0.3;
        if (ai.portfolio[stock.symbol]) acceptanceChance += 0.4; // Chętniej dokupią, jeśli już mają

        if (Math.random() < acceptanceChance) {
            aiBuyStock(ai, stock.symbol, sharesToOffer);
            sharesSold += sharesToOffer;
        }
    });
    
    if (sharesSold > 0) {
        logEvent(`Konkurencja nabyła ${sharesSold} akcji ${stock.name} po obniżonej cenie.`);
    }
}

function initializeHoldingPortfolios() {
    const holdingCompanies = stocks.filter(s => s.assetType === 'Holding');
    const regularStocks = stocks.filter(s => !s.assetType);

    holdingCompanies.forEach(holding => {
        let potentialTargets;
        if (holding.specializationFilter === 'stateOwned') {
            potentialTargets = regularStocks.filter(target => target.isStateOwned);
        } else {
            potentialTargets = regularStocks.filter(target =>
                target.sector && target.sector.some(sector => holding.specializationSectors.includes(sector))
            );
        }

        const numberOfInvestments = getRandomIntInRange(1, 3);

        for (let i = 0; i < numberOfInvestments; i++) {
            if (potentialTargets.length === 0) break;
            const targetIndex = Math.floor(Math.random() * potentialTargets.length);
            const targetStock = potentialTargets.splice(targetIndex, 1)[0];

            if (targetStock) {
                const quantity = getRandomIntInRange(1, 10);
                const cost = quantity * targetStock.price;
                const availableShares = targetStock.totalShares - targetStock.sharesHeld;

                if (quantity <= availableShares && holding.cash >= cost) {
                    holding.cash -= cost;
                    // ZAPISUJEMY OBIEKT Z DANYMI, A NIE TYLKO LICZBĘ
                    holding.holdingPortfolio[targetStock.symbol] = { 
                        quantity: quantity, 
                        purchasePrice: targetStock.price 
                    };
                    targetStock.sharesHeld += quantity;
                }
            }
        }
    });
    console.log("[SYSTEM] Zainicjalizowano portfele startowe dla spółek finansowych.");
}

/**
 * Aktualizuje wycenę spółek typu Holding na podstawie wartości posiadanych przez nie aktywów.
 * Ta funkcja powinna być wywoływana w głównej pętli gry.
 */
function updateHoldingCompanies() {
    const holdingCompanies = stocks.filter(s => s.assetType === 'Holding');

    holdingCompanies.forEach(holding => {
        if (Math.random() < 0.05) { 
            runHoldingCompanyAI(holding);
        }

        let portfolioValue = 0;
        for (const symbol in holding.holdingPortfolio) {
            const ownedStock = stocks.find(s => s.symbol === symbol);
            const holdingData = holding.holdingPortfolio[symbol]; // Pobieramy cały obiekt
            if (ownedStock && holdingData) {
                portfolioValue += ownedStock.price * holdingData.quantity; // Mnożymy przez .quantity
            }
        }

        const totalAssetValue = holding.cash + portfolioValue;

        if (holding.totalShares > 0) {
            const navPerShare = totalAssetValue / holding.totalShares;
           holding.price = Math.max(0.01, (holding.price * 0.5) + (navPerShare * 0.5)); 
        // Możesz eksperymentować z proporcjami, np. 0.6 + 0.4 dla wolniejszych zmian
        }

        // Logika aktualizacji wykresów (pozostaje bez zmian)
        const now = Date.now();
        if (!holding.currentCandle || !holding.candlestickHistory) {
            holding.candlestickHistory = [];
            holding.lineHistory = [];
            holding.currentCandle = { time: now, open: holding.price, high: holding.price, low: holding.price, close: holding.price };
        }

        holding.lineHistory.push({ time: now, price: holding.price });
        if (holding.lineHistory.length > (15 * 60)) {
            holding.lineHistory.shift();
        }

        const candle = holding.currentCandle;
        candle.close = holding.price;
        if (holding.price > candle.high) candle.high = holding.price;
        if (holding.price < candle.low) candle.low = holding.price;

        if (now - candle.time >= CANDLE_INTERVAL) {
            holding.candlestickHistory.push(candle);
            if (holding.candlestickHistory.length > (15 * 4)) {
                holding.candlestickHistory.shift();
            }
            holding.currentCandle = { time: now, open: holding.price, high: holding.price, low: holding.price, close: holding.price };
        }
    });
}


/**
* Sprawdza, czy gracz ma poważne zaległości w spłacie kredytu.
* Jeśli tak, blokuje transakcję i wyświetla alert.
* @returns {boolean} True, jeśli gracz ma 3 lub więcej pominiętych rat.
*/
function isPlayerInDefault() {
    if (playerLoan.missedPayments >= 3) {
        alert("Transakcja zablokowana! Masz 3 lub więcej pominiętych rat kredytu. Spłać część długu ręcznie w banku, aby odblokować inwestycje.");
        return true;
    }
    return false;
}

function donateToCity(amount) {
    if (isNaN(amount) || amount <= 0) {
        alert("Wpisz poprawną kwotę.");
        return;
    }
    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki.");
        return;
    }

    playerCash -= amount;
    cityInvestment.donatedAmount += amount;
    logEvent(`🏙️ Przekazano ${amount.toFixed(2)} PLN na rozwój miasta. Całkowity wkład: ${cityInvestment.donatedAmount.toFixed(2)} PLN.`, 'review');

    if (!cityInvestment.playerHasUnlocked && cityInvestment.donatedAmount >= 10000) { // Sprawdzamy tylko flagę gracza
    cityInvestment.playerHasUnlocked = true; // Ustawiamy TYLKO flagę gracza
    logEvent("🎉 Gratulacje! Twój wkład w rozwój miasta odblokował dostęp do obligacji komunalnych i nowych wydarzeń miejskich!", 'success');
    showToast("Odblokowano inwestycje miejskie!", 'success');
}

    displayCash();
    // Odśwież modal miasta
    updateCityModalContent();
}

// --- NOWE ZMIENNE DLA MIASTA I FESTYNU ---

let nextFestivalCountdown = 0; // Odliczanie w ms do następnego festynu
let activeModifiers = []; // Przechowuje aktywne, roczne bonusy z festynu
let city = {
    budget: 50000, // Budżet startowy
    population: getRandomIntInRange(15000, 25000), // Losowa populacja na start
    availableAttractions: [ // Lista możliwych do sfinansowania atrakcji
        { name: "Koncert rockowy", cost: 20000, interestBonus: 15 },
        { name: "Występ znanego artysty", cost: 50000, interestBonus: 30 },
        { name: "Pokaz mody", cost: 12000, interestBonus: 10 },
        { name: "Wystawa samochodów zabytkowych", cost: 8000, interestBonus: 8 },
        { name: "Festiwal foodtrucków", cost: 15000, interestBonus: 12 }
    ]
};

let festival = null; // Gdy nie ma festynu, ten obiekt ma wartość null

const FESTIVAL_STALL_LEVELS = [
    { level: 1, name: "Miejsce", cost: 1000 },
    { level: 2, name: "Stolik promujący", cost: 1000 },
    { level: 3, name: "Stoisko", cost: 1000 },
    { level: 4, name: "Obszar", cost: 1000 },
    { level: 5, name: "Cała sekcja", cost: 1000 }
];

const PROMOTION_ACTIONS = {
    flyers: { name: "Ulotki", cost: 200, interest: 5 },
    contest: { name: "Konkurs z nagrodami", cost: 500, interest: 10 },
    kids: { name: "Atrakcje dla dzieci", cost: 1000, interest: 10 },
    merch: { name: "Merch festiwalowy", cost: 1200, interest: 12 }
};

/**
 * Aktualizuje stan miasta: zbiera podatki i uruchamia festyn. Wywoływane raz w roku.
 */
function updateCity() {
    const taxRevenue = city.population * 10;
    city.budget += taxRevenue;
    city.population += Math.floor(city.population * getRandomInRange(0.01, 0.025)); // Naturalny przyrost
    logEvent(`🏙️ Miasto zebrało ${taxRevenue.toFixed(0)} PLN z podatków. Nowy budżet: ${city.budget.toFixed(0)} PLN.`, 'review');
    
    startFestival();
}

/**
 * Inicjalizuje coroczny festyn.
 */
function startFestival() {
    if (festival) return; // Nie uruchamiaj, jeśli już trwa

    let tier, name, durationMs;
    // Miesiąc w grze to jeden kwartał
    const festivalMonthDuration = BASE_DELAYS.quarterly; 

    if (city.budget < 100000) {
        tier = 1; name = "Festyn Osiedlowy"; durationMs = festivalMonthDuration / 2; // Krótszy, 2.5 min
    } else if (city.budget < 500000) {
        tier = 2; name = "Festiwal Miejski"; durationMs = festivalMonthDuration; // Pełny miesiąc, 5 min
    } else {
        tier = 3; name = "Wydarzenie Narodowe"; durationMs = festivalMonthDuration * 1.5; // Dłuższy, 7.5 min
    }

    const budgetForAttractions = city.budget * 0.8;
    let spentOnAttractions = 0;
    const attractions = [getRandomElement(city.availableAttractions).name];
    
    city.availableAttractions.forEach(attr => {
        if (spentOnAttractions + attr.cost < budgetForAttractions && Math.random() > 0.5) {
            attractions.push(attr.name);
            spentOnAttractions += attr.cost;
        }
    });
    city.budget -= spentOnAttractions;

    festival = {
        isActive: true,
        name: name,
        tier: tier,
        endTime: Date.now() + (durationMs / currentSpeedMultiplier),
        globalInterest: getRandomIntInRange(20, 50) + (tier * 10),
        attractions: attractions,
        participants: [] // Lista stoisk, na razie pusta
    };
    
    // --- POCZĄTEK NOWEJ LOGIKI ---

    // 1. Miasto zawsze dołącza do festynu
    festival.participants.push({
        ownerId: 'city',
        promotionTarget: { type: 'city' },
        level: 1,
        interest: 15 + (tier * 5) // Miasto ma startowy bonus do zainteresowania
    });

    // 2. Losowe spółki giełdowe dołączają
    const potentialCompanies = stocks.filter(s => !s.assetType && !s.isBankrupt);
    const numberOfCompanies = getRandomIntInRange(4, 7); // Do festynu dołączy od 1 do 3 spółek

    for (let i = 0; i < numberOfCompanies; i++) {
        if (potentialCompanies.length === 0) break;
        
        const company = getRandomElement(potentialCompanies);
        // Usuń wybraną spółkę z puli, aby się nie powtórzyła
        potentialCompanies.splice(potentialCompanies.indexOf(company), 1); 

        festival.participants.push({
            ownerId: company.symbol, // Używamy symbolu jako ID
            promotionTarget: { type: 'company', id: company.symbol },
            level: 1,
            interest: getRandomIntInRange(5, 15)
        });
    }

    // --- KONIEC NOWEJ LOGIKI ---

    nextFestivalCountdown = 0;
    logEvent(`🎉 Rozpoczyna się ${name}! Wydarzenie potrwa miesiąc czasu gry.`, 'success');
    showToast(`🎉 Rozpoczyna się ${name}!`, 'success', 7000);
}

// SCALONO: Wybrano Twoją wersję `updateFestival`, która zawierała poprawkę błędu 'startsWith'
function updateFestival() {
    if (!festival || !festival.isActive) return; // Jeśli nie ma festynu, wyjdź

    // --- Sprawdzenie końca festynu ---
    if (Date.now() > festival.endTime) {
        endFestival();
        return; // Festyn się skończył, zakończ funkcję
    }

    // --- Losowe zdarzenia globalne (np. pogoda) ---
    if (Math.random() < 0.01) { // Szansa na pozytywne zdarzenie pogodowe
        const change = getRandomIntInRange(5, 15);
        festival.globalInterest += change;
        logEvent(`☀️ Dobra pogoda i pozytywna atmosfera! Zainteresowanie festynem rośnie o ${change} punktów.`, 'review');
    } else if (Math.random() < 0.005) { // Mniejsza szansa na negatywne zdarzenie pogodowe
        const change = getRandomIntInRange(5, 15);
        festival.globalInterest -= change;
        logEvent(`🌧️ Nagłe załamanie pogody! Zainteresowanie festynem spada o ${change} punktów.`, 'review');
    }

    // --- Logika działań Miasta i Spółek Giełdowych ---
    festival.participants.forEach(participant => {
        // Upewnij się, że participant i ownerId istnieją
        if (!participant || !participant.ownerId) {
            console.warn("[Festival Update] Znaleziono nieprawidłowego uczestnika:", participant);
            return; // Pomiń tego uczestnika
        }

        const isCity = participant.ownerId === 'city';
        const isPlayer = participant.ownerId === 'player';
        // --- 👇 POPRAWIONY WARUNEK isCompany 👇 ---
        // Sprawdź, czy ownerId jest stringiem PRZED użyciem startsWith
        const isAI = typeof participant.ownerId === 'string' && participant.ownerId.startsWith('ai');
        const isCompany = !isCity && !isPlayer && !isAI; // Jeśli to nie miasto, gracz ani AI, to musi być spółka
        // --- 👆 KONIEC POPRAWKI isCompany 👆 ---


        if (isCity || isCompany) {
            // Mają szansę na wykonanie akcji w każdej turze
            if (Math.random() < 0.05) { // 5% szansy na akcję
                const actionRoll = Math.random();

                // 30% szans na ulepszenie stoiska (jeśli to możliwe)
                if (actionRoll < 0.3) {
                    const nextLevel = FESTIVAL_STALL_LEVELS[participant.level]; // Poziom zaczyna się od 1, indeks od 0
                    if (nextLevel) { // Sprawdź, czy istnieje następny poziom
                        if (isCity && city.budget >= nextLevel.cost) {
                            city.budget -= nextLevel.cost;
                            participant.level++;
                            participant.interest += 15; // Bonus za ulepszenie (mniejszy niż dla gracza)
                        } else if (isCompany) {
                            // Prosta symulacja budżetu spółki na festyn
                            if (Math.random() > 0.4) { // 60% szans, że spółkę "stać"
                                participant.level++;
                                participant.interest += 15;
                            }
                        }
                    }
                }
                // 70% szans na promocję stoiska
                else {
                    const promoKeys = Object.keys(PROMOTION_ACTIONS);
                    const randomPromoKey = getRandomElement(promoKeys);
                    const promo = PROMOTION_ACTIONS[randomPromoKey];

                    if (isCity && city.budget >= promo.cost) {
                        city.budget -= promo.cost;
                        participant.interest += promo.interest * 0.8; // Mniejszy efekt promocji
                    } else if (isCompany) {
                        // Prosta symulacja decyzji o promocji
                        if (Math.random() > 0.3) { // 70% szans, że firma zdecyduje się na promocję
                            participant.interest += promo.interest * 0.8;
                        }
                    }
                }
            }
        }
    });
    // --- KONIEC Logiki działań Miasta i Spółek Giełdowych ---

    // --- NOWY BLOK: Losowe zdarzenie dla gracza ---
    // (Ta funkcja nie była zdefiniowana w żadnym pliku, zostawiam wywołanie)
     if (Math.random() < 0.02 / currentSpeedMultiplier) {
        triggerFestivalPlayerEvent(); // Wywołaj funkcję losującą zdarzenie dla gracza
     }
    // --- KONIEC NOWEGO BLOKU ---

} // <-- Koniec funkcji updateFestival

/**
 * Kończy festyn, oblicza wyniki i przyznaje nagrody.
 */
function endFestival() {
    if (!festival) return;

    logEvent(`🏁 ${festival.name} dobiegł końca! Czas na podsumowanie.`, 'review');
    festival.participants.sort((a, b) => b.interest - a.interest);

    // Wyświetl tabelę wyników
    openFestivalResultsModal(festival.participants, festival.name);

    festival.participants.forEach((participant, index) => {
        let bonusMultiplier = 0;
        if (index === 0) bonusMultiplier = 1.0;
        else if (index === 1) bonusMultiplier = 0.5;
        else if (index === 2) bonusMultiplier = 0.1;
        if (bonusMultiplier > 0) applyFestivalBonus(participant, bonusMultiplier);
    });

    const successScore = festival.globalInterest + (festival.participants.length * 5) + (festival.attractions.length * 10);
    if (successScore > 100) {
        const populationGrowth = Math.floor(city.population * (successScore / 5000));
        city.population += populationGrowth;
        logEvent(`✅ Udany festyn przyciągnął ${populationGrowth} nowych mieszkańców!`, 'success');
        const marketMaker = aiCompetitors.find(ai => ai.personality === 'market_maker');
        if (marketMaker) {
            marketMaker.marketMakerBoost.isActive = true;
            marketMaker.marketMakerBoost.expiryTime = Date.now() + (5 * 60 * 1000 / currentSpeedMultiplier); // Bonus na 5 minut
            marketMaker.marketMakerBoost.cashBonus = 50000 * festival.tier; // Bonusowa gotówka zależna od rangi festynu
            marketMaker.cash += marketMaker.marketMakerBoost.cashBonus;

            logEvent('📈 Udany festyn zwiększył zainteresowanie giełdą! Inwestorzy Mniejszościowi stają się bardziej aktywni.', 'review');
            showToast('Zainteresowanie giełdą wzrosło!', 'success');
        }
    }

    festival = null;
    nextFestivalCountdown = BASE_DELAYS.quarterly * 4; // Ustaw odliczanie na rok

    updateCityModalContent();
}

/**
 * Aplikuje bonusy dla zwycięzców festynu.
 * @param {object} participant - Obiekt uczestnika.
 * @param {number} multiplier - Mnożnik bonusu (1.0, 0.5, 0.1).
 */
function applyFestivalBonus(participant, multiplier) {
    const ownerName = participant.ownerId === 'player' ? 'Twoje stoisko' : aiCompetitors.find(a => a.id === participant.ownerId)?.name || 'Stoisko';
    const effectDuration = BASE_DELAYS.quarterly * 4; // Efekt trwa rok
    
    const modifier = {
        source: 'Festival',
        multiplier: multiplier,
        expiryTime: Date.now() + (effectDuration / currentSpeedMultiplier),
        target: participant.promotionTarget
    };

    activeModifiers.push(modifier);

    // --- POCZĄTEK NOWEJ LOGIKI ---
    // Dodatkowy, mały bonus do reputacji dla zwycięzcy, jeśli jest nim gracz
    if (participant.ownerId === 'player' && multiplier === 1.0) {
        stocks.forEach(s => {
            if (!s.assetType) { // Bonus nie dotyczy startupów, REITów etc.
                changeReputation('player', s.symbol, 2);
            }
        });
        logEvent('🏆 Zwycięstwo w festynie poprawia Twoją reputację w oczach biznesu (+2 do relacji)!', 'review');
    }
    // --- KONIEC NOWEJ LOGIKI ---

    switch (participant.promotionTarget.type) {
        case 'self':
            logEvent(`🏆 ${ownerName} zdobywa roczny bonus do reputacji!`, 'review');
            break;
        case 'company':
            const stock = stocks.find(s => s.symbol === participant.promotionTarget.id);
            if (stock) logEvent(`🏆 Stoisko ${stock.name} zdobywa roczny bonus do zainteresowania inwestorów!`, 'review');
            break;
        case 'player_company':
             if (playerCompany) logEvent(`🏆 Twoja firma zdobywa roczny bonus do generowanej wartości!`, 'review');
            break;
        case 'city':
            const budgetBoost = 1000 * multiplier; // Bonus do budżetu jest natychmiastowy
            city.budget += budgetBoost;
            logEvent(`🏆 Stoisko miasta przynosi ${budgetBoost.toFixed(0)} PLN do budżetu.`, 'review');
            break;
    }
}

function playerJoinFestival(promotionTarget) {
    if (!festival || !festival.isActive || playerCash < FESTIVAL_STALL_LEVELS[0].cost) return;

    playerCash -= FESTIVAL_STALL_LEVELS[0].cost;
    festival.participants.push({
        ownerId: 'player',
        promotionTarget: promotionTarget,
        level: 1,
        interest: 10 // Startowe zainteresowanie
    });
    
    logEvent("Wystawiasz swoje stoisko na festynie!", 'review');
    openCityInvestmentModal(); // Odśwież widok
}

function playerUpgradeStall() {
    const participant = festival.participants.find(p => p.ownerId === 'player');
    const nextLevel = FESTIVAL_STALL_LEVELS[participant.level];
    if (!participant || !nextLevel || playerCash < nextLevel.cost) return;

    playerCash -= nextLevel.cost;
    participant.level++;
    participant.interest += 20; // Bonus za ulepszenie
    openCityInvestmentModal();
}

function playerPromoteStall(promoType) {
    const participant = festival.participants.find(p => p.ownerId === 'player');
    const action = PROMOTION_ACTIONS[promoType];
    if (!participant || !action || playerCash < action.cost) return;

    playerCash -= action.cost;
    participant.interest += action.interest;
    openCityInvestmentModal();
}

function playerPromoteEvent() {
    if (!festival || playerCash < 500) return;
    playerCash -= 500;
    festival.globalInterest += 10;
    openCityInvestmentModal();
}

function updateFestivalCountdown(deltaTime) {
    if (nextFestivalCountdown > 0) {
        nextFestivalCountdown -= deltaTime;
    }
}

/**
 * Aplikuje ciągłe efekty rocznych bonusów i usuwa przestarzałe.
 */
function applyActiveModifiers() {
    const now = Date.now();
    activeModifiers = activeModifiers.filter(mod => now < mod.expiryTime); // Usuń przestarzałe

    activeModifiers.forEach(mod => {
        switch (mod.target.type) {
            case 'self':
                // Co jakiś czas lekko podbijaj reputację gracza
                if (Math.random() < 0.05) {
                    stocks.forEach(s => changeReputation('player', s.symbol, 1 * mod.multiplier));
                }
                break;
            case 'company':
                const stock = stocks.find(s => s.symbol === mod.target.id);
                if (stock) {
                    // Lekki, stały "dryf" ceny w górę
                    stock.price *= (1 + 0.00001 * mod.multiplier);
                }
                break;
            case 'player_company':
                if (playerCompany) {
                    // Bonus do generowanej wartości
                    playerCompany.value += 0.1 * mod.multiplier;
                }
                break;
        }
    });
}


// --- NOWE ZMIENNE DLA BONÓW SKARBOWYCH ---

let currentTBillAuction = null; // Przechowuje stan aktywnej aukcji (lub null)
let allTBills = []; // Lista wszystkich posiadanych bonów (gracza i AI)
let playerHasTBillAccess = false; // Czy gracz odblokował dostęp

function calculateNetWorth(entity) {
    let value = (entity === 'player') ? playerCash : entity.cash;
    const portfolio = (entity === 'player') ? playerPortfolio : entity.portfolio;
    for (const symbol in portfolio) {
        const holding = portfolio[symbol];
        if (holding.assetType === 'Startup') {
            value += holding.investedAmount; // Uproszczona wycena startupu
        } else {
            const marketData = stocks.find(s => s.symbol === symbol) || etfs.find(e => e.symbol === symbol) || marketIndexes.find(i => i.id === symbol);
            if (marketData) {
                value += (marketData.price || marketData.value || 0) * holding.shares;
            }
        }
    }
    // Dodaj wartość obligacji (prosta estymacja)
    
    // --- 👇 POPRAWIONA LINIA 👇 ---
    // Dodajemy || [], aby zapewnić, że 'bonds' zawsze będzie tablicą, nawet jeśli entity.tBills nie istnieje
    const bonds = (entity === 'player') ? allBonds.filter(b => b.ownerId === 'player') : (entity.tBills || []); 
    
    value += bonds.length * 1000; // Teraz bezpiecznie można użyć .length

    return value;
}

/** Sprawdza i aktualizuje dostęp gracza do aukcji bonów skarbowych */
function checkTBillAccess() {
    if (!playerHasTBillAccess && calculateNetWorth('player') >= 100000) {
        playerHasTBillAccess = true;
        logEvent("💰 Osiągnięto próg 100,000 PLN wartości netto! Odblokowano dostęp do aukcji bonów skarbowych w Banku Centralnym.", 'success');
        showToast("Odblokowano aukcje bonów skarbowych!", 'success');
        // Odśwież widok banku, jeśli jest otwarty
        if (document.getElementById('bank-modal').style.display === 'block') {
            openBankModal();
        }
    }
    // Sprawdź dostęp dla AI
    aiCompetitors.forEach(ai => {
        if (!ai.hasTBillAccess && calculateNetWorth(ai) >= 100000) {
            ai.hasTBillAccess = true;
            console.log(`[AI] ${ai.name} odblokował dostęp do aukcji bonów skarbowych.`);
        }
    });
}

function placeTBillBid(bidder, quantity, price) {
    if (!currentTBillAuction || Date.now() > currentTBillAuction.endTime) {
        if (bidder === 'player') alert("Aukcja nie jest aktywna.");
        return false;
    }
    if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0 || price >= 1000) {
        if (bidder === 'player') alert("Wprowadź poprawną ilość i cenę (poniżej 1000 PLN).");
        return false;
    }

    const bidderId = (bidder === 'player') ? 'player' : bidder.id;
    const bidderCash = (bidder === 'player') ? playerCash : bidder.cash;
    const totalCost = quantity * price;

    if (bidderCash < totalCost) {
        if (bidder === 'player') alert("Nie masz wystarczająco środków na złożenie tej oferty.");
        return false;
    }

    // Dodaj ofertę do listy
    currentTBillAuction.bids.push({ bidderId, quantity, price });

    if (bidder === 'player') {
        logEvent(`Złożono ofertę zakupu ${quantity} bonów skarbowych po ${price.toFixed(2)} PLN.`, 'review');
        showToast("Oferta złożona!", 'success');
        openBankModal(); // Odśwież widok banku
    } else {
        console.log(`[AI] ${bidder.name} złożył ofertę na ${quantity} bonów po ${price.toFixed(2)} PLN.`);
    }
    return true;
}

/**
 * Rozstrzyga zakończoną aukcję bonów skarbowych.
 */
function resolveTBillAuction() {
    if (!currentTBillAuction) return;

    logEvent("🔔 Aukcja bonów skarbowych zakończona! Rozpoczyna się alokacja.", 'market');

    let remainingQuantity = currentTBillAuction.quantityAvailable;
    const bids = currentTBillAuction.bids;

    // Sortuj oferty od najwyższej ceny
    bids.sort((a, b) => b.price - a.price);

    // Przydzielaj bony
    for (const bid of bids) {
        if (remainingQuantity <= 0) break;

        const quantityToAllocate = Math.min(bid.quantity, remainingQuantity);
        const totalCost = quantityToAllocate * bid.price;

        let bidderObject = null;
        if (bid.bidderId === 'player') {
            bidderObject = 'player';
        } else {
            bidderObject = aiCompetitors.find(ai => ai.id === bid.bidderId);
        }

        if (!bidderObject) continue;

        const bidderCash = (bidderObject === 'player') ? playerCash : bidderObject.cash;

        // Sprawdź ponownie, czy stać licytanta (mógł wydać pieniądze)
        if (bidderCash >= totalCost) {
            // Pobierz pieniądze
            if (bidderObject === 'player') {
                playerCash -= totalCost;
            } else {
                bidderObject.cash -= totalCost;
            }

            // Dodaj bony do portfela
            const maturityDate = Date.now() + (5 * 60 * 1000 / currentSpeedMultiplier); // 5 minut
            for (let i = 0; i < quantityToAllocate; i++) {
                const newTBill = {
                    id: `tbil_${Date.now()}_${i}`,
                    ownerId: bid.bidderId,
                    purchasePrice: bid.price,
                    maturityDate: maturityDate,
                    isTBill: true
                };
                if (bid.bidderId === 'player') {
                    allTBills.push(newTBill); // Dodaj do globalnej listy, jeśli właścicielem jest gracz
                } else if (bidderObject.tBills) {
                    bidderObject.tBills.push(newTBill); // Dodaj do listy AI
                }
            }

            remainingQuantity -= quantityToAllocate;

            // Poinformuj gracza o wyniku
            if (bid.bidderId === 'player') {
                logEvent(`✅ Przydzielono Ci ${quantityToAllocate} bonów skarbowych po cenie ${bid.price.toFixed(2)} PLN.`, 'success');
                displayCash();
                displayPortfolio();
            } else {
                console.log(`[AI] ${bidderObject.name} wygrał ${quantityToAllocate} bonów po ${bid.price.toFixed(2)} PLN.`);
            }

        } else if (bid.bidderId === 'player') {
            logEvent(`⚠️ Twoja oferta na ${bid.quantity} bonów po ${bid.price.toFixed(2)} PLN została odrzucona z powodu braku środków!`, 'error');
        }
    }

    // Zakończ aukcję
    currentTBillAuction = null;
    logEvent("Alokacja bonów zakończona.", 'market');
    // Odśwież widok banku, jeśli jest otwarty
    if (document.getElementById('bank-modal').style.display === 'block') {
        openBankModal();
    }
}

/**
 * Sprawdza i wykupuje dojrzałe bony skarbowe.
 */
function checkTBillMaturities() {
    const now = Date.now();
    const faceValue = 1000; // Stała wartość wykupu

    // Sprawdź bony gracza (nadal używamy allBonds)
    for (let i = allBonds.length - 1; i >= 0; i--) {
        const tBill = allBonds[i];
        // SCALONO: Sprawdzamy `isTBill` (z Twojej wersji) ORAZ `ownerId` (z obu wersji)
        if (tBill.isTBill && tBill.ownerId === 'player' && now >= tBill.maturityDate) {
            playerCash += faceValue;
            logEvent(`🪙 Bon skarbowy (zakup: ${tBill.purchasePrice.toFixed(2)} PLN) dojrzał. Otrzymujesz ${faceValue} PLN.`, 'review');
            allBonds.splice(i, 1); // Usuwamy z globalnej listy
            displayCash();
            displayPortfolio();
        }
    }

    // Sprawdź bony AI
    aiCompetitors.forEach(ai => {
        if (!ai.tBills) return; // Pomiń boty bez listy bonów (np. Market Maker)
        for (let i = ai.tBills.length - 1; i >= 0; i--) {
            const tBill = ai.tBills[i];
             // SCALONO: Sprawdzamy `isTBill` (z Twojej wersji)
            if (tBill.isTBill && now >= tBill.maturityDate) {
                ai.cash += faceValue;
                console.log(`[AI] Bon skarbowy ${ai.name} (zakup: ${tBill.purchasePrice.toFixed(2)}) dojrzał. Otrzymuje ${faceValue} PLN.`);
                ai.tBills.splice(i, 1);
            }
        }
    });
}

// --- NOWA FUNKCJA (od kolegi) ---
/**
 * Przełącza tryb sortowania tabeli akcji według ceny.
 */
function togglePriceSort() {
    console.log(`Przełączanie sortowania. Obecny stan: ${currentSortState}`); // Log diagnostyczny
    if (currentSortState === 'none') {
        currentSortState = 'price_asc';
    } else if (currentSortState === 'price_asc') {
        currentSortState = 'price_desc';
    } else { // currentSortState === 'price_desc'
        currentSortState = 'none'; // Wróć do domyślnego sortowania wg giełdy
    }
    console.log(`Nowy stan sortowania: ${currentSortState}`); // Log diagnostyczny
    displayStocks(getCurrentInputValues()); // Odśwież tabelę z nowym sortowaniem
}

// --- NOWA FUNKCJA (od kolegi) ---
/**
* Logika Poziomu 3 umiejętności "Księgowy".
* Losuje, czy gracz wykryje anomalię finansową.
* @param {object} stock Obiekt spółki.
*/
function detectFinancialAnomaly(stock) {
    const anomalyReportElement = document.getElementById('financial-anomaly-report');
    if (!anomalyReportElement) return; // Upewnij się, że element istnieje
    anomalyReportElement.innerHTML = ''; // Wyczyść poprzedni raport

    // SCALONO: Zmieniono 'accountant' na 'financialAnalyst' (pasując do Twojej definicji umiejętności)
    // Zakładam, że chcesz to podpiąć pod 'financialAnalyst' lub dodać 'accountant' do obiektu 'skills'
    // Na razie używam 'financialAnalyst'
    if (getSkillLevel('financialAnalyst') < 3 || Math.random() > 0.15) {
        // Nie wykryto anomalii (lub brak umiejętności)
        return;
    }

    // Wykryto anomalię!
    if (Math.random() < 0.5) {
        // ANOMALIA NEGATYWNA (np. ukryte koszty, ryzyko kary)
        const possibleNegativeOutcomes = [
            { text: "Wykryto nieprawidłowości w rozliczeniach! Może to prowadzić do drobnej kary finansowej.", effect: () => { stock.financialHealth -= 0.2; applyPriceEffect(stock.symbol, -0.01, 'negative'); } },
            { text: "Znaleziono dowody na nieefektywne zarządzanie zapasami. Wpłynie to negatywnie na najbliższe wyniki.", effect: () => { stock.financialHealth -= 0.1; } },
            { text: "Twoja analiza wskazuje na potencjalne ryzyko sporu prawnego, co niepokoi rynek.", effect: () => { applyPriceEffect(stock.symbol, -0.02, 'negative'); } }
        ];
        const outcome = getRandomElement(possibleNegativeOutcomes);
        anomalyReportElement.innerHTML = `<span style="color: #dc3545;">🚨 Wykryto Anomalię! ${outcome.text}</span>`;
        logEvent(`[Księgowy] Wykryto negatywną anomalię w finansach ${stock.name}!`, 'review');
        outcome.effect(); // Zastosuj negatywny efekt
        showToast(`Wykryto anomalię w ${stock.name}!`, 'warning');

    } else {
        // ANOMALIA POZYTYWNA (np. niedoszacowane aktywa, potencjał oszczędności)
        const possiblePositiveOutcomes = [
            { text: "Odkryto niedoszacowane aktywa w bilansie! Spółka może być warta więcej niż sądzono.", effect: () => { applyPriceEffect(stock.symbol, 0.015, 'positive'); } },
            { text: "Twoja analiza wskazuje na możliwość znacznych oszczędności kosztów operacyjnych.", effect: () => { stock.financialHealth += 0.15; } },
            { text: "Zidentyfikowano potencjalne źródło dodatkowych przychodów, wcześniej pomijane przez zarząd.", effect: () => { stock.financialHealth += 0.1; applyPriceEffect(stock.symbol, 0.01, 'positive'); } }
        ];
        const outcome = getRandomElement(possiblePositiveOutcomes);
        anomalyReportElement.innerHTML = `<span style="color: #28a745;">💡 Wykryto Potencjał! ${outcome.text}</span>`;
        logEvent(`[Księgowy] Wykryto pozytywną anomalię (potencjał) w finansach ${stock.name}!`, 'review');
        outcome.effect(); // Zastosuj pozytywny efekt
        showToast(`Wykryto potencjał w ${stock.name}!`, 'success');
    }
    // Po zastosowaniu efektu, odśwież modal finansowy, aby pokazać ewentualne zmiany
    openFinancialDetailsModal(stock.symbol);
}

// --- Banki Komercyjne (Twoja wersja, była bardziej rozbudowana) ---
let commercialBanks = []; // Tablica na banki komercyjne
// Definicje typów banków komercyjnych
const BANK_TYPES = {
    INVESTMENT: 'Inwestycyjny',
    CORPORATE: 'Korporacyjny',
    UNIVERSAL: 'Uniwersalny',
    INTERNATIONAL: 'Międzynarodowy',
    COOPERATIVE: 'Spółdzielczy',
    INTERNET: 'Internetowy (e-bank)',
    MORTGAGE: 'Hipoteczny'
};

// Definicje wszystkich banków w grze
const ALL_COMMERCIAL_BANKS_DEFINITIONS = [
    // Inwestycyjne (3)
    { id: 'inv1', name: 'Apex Capital Partners', type: BANK_TYPES.INVESTMENT, initialCapital: 5000000, reserveRatio: 0.1, baseInterestRateMargin: 0.01 },
    { id: 'inv2', name: 'Quantum Financial Group', type: BANK_TYPES.INVESTMENT, initialCapital: 4500000, reserveRatio: 0.1, baseInterestRateMargin: 0.012 },
    { id: 'inv3', name: 'Meridian Trade Bank', type: BANK_TYPES.INVESTMENT, initialCapital: 4000000, reserveRatio: 0.1, baseInterestRateMargin: 0.009 },
    // Korporacyjne (3)
    { id: 'corp1', name: 'Proxima Business Bank', type: BANK_TYPES.CORPORATE, initialCapital: 7000000, reserveRatio: 0.15, baseInterestRateMargin: 0.015 },
    { id: 'corp2', name: 'Centauri Corporate Finance', type: BANK_TYPES.CORPORATE, initialCapital: 6500000, reserveRatio: 0.16, baseInterestRateMargin: 0.016 },
    { id: 'corp3', name: 'Sirius Enterprise Bank', type: BANK_TYPES.CORPORATE, initialCapital: 6000000, reserveRatio: 0.14, baseInterestRateMargin: 0.014 },
    // Uniwersalny (1)
    { id: 'uni1', name: 'Bank Powszechny Gdański', type: BANK_TYPES.UNIVERSAL, initialCapital: 10000000, reserveRatio: 0.12, baseInterestRateMargin: 0.02 },
    // Międzynarodowy (1)
    { id: 'int1', name: 'Global Finance Alliance', type: BANK_TYPES.INTERNATIONAL, initialCapital: 15000000, reserveRatio: 0.1, baseInterestRateMargin: 0.018 },
    // Spółdzielczy (1)
    { id: 'coop1', name: 'Pomorski Bank Spółdzielczy', type: BANK_TYPES.COOPERATIVE, initialCapital: 2000000, reserveRatio: 0.18, baseInterestRateMargin: 0.025 },
    // Internetowy (1)
    { id: 'net1', name: 'CyberBank Connect', type: BANK_TYPES.INTERNET, initialCapital: 3000000, reserveRatio: 0.08, baseInterestRateMargin: 0.017 },
    // Hipoteczny (1)
    { id: 'mort1', name: 'DomInvest Bank Hipoteczny', type: BANK_TYPES.MORTGAGE, initialCapital: 5000000, reserveRatio: 0.13, baseInterestRateMargin: 0.022 },
];

// Inicjalizacja banków (dodanie pól dynamicznych)
function initializeCommercialBanks() {
    commercialBanks = ALL_COMMERCIAL_BANKS_DEFINITIONS.map(def => ({
        ...def,
        cash: def.initialCapital, // Gotówka banku
        reservesBC: 0, // Rezerwy w Banku Centralnym
        loanPortfolio: {}, // Udzielone kredyty {clientId: amount}
        depositPortfolio: {}, // Przyjęte depozyty {clientId: amount}
        stockPortfolio: {}, // Portfel akcji dla banków inwestycyjnych {symbol: {shares: x, avgPrice: y}}
        corporateClients: [], // Lista ID spółek będących klientami
        interestRateDeposit: 0, // Aktualne oprocentowanie depozytów
        interestRateLoan: 0, // Aktualne oprocentowanie kredytów
        isActive: false // Domyślnie nieaktywny
    }));
}

function processCompanyBanking() {
    const activeBanks = commercialBanks.filter(b => b.isActive);
    if (activeBanks.length === 0) return;

    stocks.forEach(stock => {
        // Pomiń typy specjalne, zbankrutowane lub bez konta
        if (stock.assetType || stock.isBankrupt || !stock.bankAccountId) return;

        const bank = activeBanks.find(b => b.id === stock.bankAccountId);
        if (!bank) return; // Bank nieaktywny lub nie znaleziono

        // 1. Płacenie opłat i wpłata depozytu (bez zmian)
        if (stock.cash > 0) {
            const accountFee = Math.min(stock.cash, stock.cash * 0.0005 + 50);
            stock.cash -= accountFee;
            bank.cash += accountFee;

            const depositAmount = stock.cash * 0.1;
            stock.cash -= depositAmount;
            bank.cash += depositAmount;
        }

        // 2. Zarządzanie rezerwami BC (bez zmian)
        const requiredReserves = bank.cash * centralBank.reserveRequirement;
        const reserveDifference = requiredReserves - bank.reservesBC;
        if (reserveDifference > 0) {
            const amountToTransfer = Math.min(reserveDifference, bank.cash * 0.1);
            if (amountToTransfer > 0) { /* ... transfer do BC ... */ }
        } else if (reserveDifference < 0) {
            const amountToWithdraw = Math.min(Math.abs(reserveDifference), centralBank.funds * 0.01);
             if (amountToWithdraw > 0) { /* ... wypłata z BC ... */ }
        }

        // 3. Zaciąganie kredytów przez spółki (bez zmian)
        const needsLoan = stock.cash < (stock.balanceSheet.assets * 0.01) && stock.financialHealth < 1;
        const canTakeLoan = bank.type === BANK_TYPES.CORPORATE || bank.type === BANK_TYPES.UNIVERSAL;
        if (needsLoan && canTakeLoan && Math.random() < 0.1) {
             const loanAmount = stock.balanceSheet.assets * getRandomInRange(0.05, 0.15);
             const loanInterest = (LOAN_INTEREST_RATE + bank.baseInterestRateMargin) * 1.1;
             stock.cash += loanAmount;
             stock.balanceSheet.liabilities += loanAmount;
             bank.loanPortfolio[stock.symbol] = (bank.loanPortfolio[stock.symbol] || 0) + loanAmount; // Śledzimy sumę pożyczoną danej firmie
             bank.cash -= loanAmount;
             logEvent(` Kredyt Korporacyjny: ${stock.name} zaciąga ${loanAmount.toFixed(0)} PLN pożyczki w ${bank.name}.`, 'market');
        }

        // --- 👇 NOWA LOGIKA: SPŁATA KREDYTÓW PRZEZ SPÓŁKI 👇 ---
        // Sprawdź, czy spółka ma kredyt w tym banku (używamy `bank.loanPortfolio`)
        const companyLoanAmount = bank.loanPortfolio[stock.symbol] || 0;
        if (companyLoanAmount > 0) {
            // Oblicz tygodniową ratę (prosta: np. 1% kapitału + odsetki)
            const weeklyInterestRate = ((LOAN_INTEREST_RATE + bank.baseInterestRateMargin) * 1.1) / 52;
            const interestPayment = companyLoanAmount * weeklyInterestRate;
            const capitalPayment = companyLoanAmount * 0.01; // Spłaca 1% kapitału tygodniowo
            const weeklyPayment = interestPayment + capitalPayment;

            if (stock.cash >= weeklyPayment) {
                // Spółkę stać na spłatę
                stock.cash -= weeklyPayment; // Pieniądze znikają z konta spółki
                stock.balanceSheet.liabilities -= capitalPayment; // Zmniejsz zadłużenie o część kapitałową
                bank.cash += weeklyPayment; // Bank otrzymuje płatność
                // Zaktualizuj kwotę kredytu w portfelu banku
                bank.loanPortfolio[stock.symbol] = Math.max(0, companyLoanAmount - capitalPayment);
                if (bank.loanPortfolio[stock.symbol] === 0) {
                    delete bank.loanPortfolio[stock.symbol]; // Usuń, jeśli spłacono
                }
            } else {
                // Spółki nie stać na spłatę - kara
                const penalty = weeklyPayment * 0.1; // Kara 10% raty
                stock.balanceSheet.liabilities += penalty; // Zwiększ zadłużenie
                stock.financialHealth -= 0.1; // Lekkie pogorszenie kondycji
                logEvent(`⚠️ ${stock.name} ma problemy ze spłatą kredytu w ${bank.name}!`, 'warning');
            }
        }
        // --- 👆 KONIEC NOWEJ LOGIKI 👆 ---
    });

    // Zysk dla Banku Centralnego (bez zmian)
    centralBank.funds *= 1.001;
}

let playerCommercialLoans = []; // { id, bankId, amount, interestRate, weeklyPayment, maturityDate, collateral: null }
let playerCommercialDeposits = []; // { id, bankId, amount, interestRate, startDate }

// Plik: gameLogic.js

function takeCommercialLoan(bankId, amount) {
    const bank = commercialBanks.find(b => b.id === bankId);
    if (!bank || !bank.isActive) {
        alert("Wybrany bank jest nieaktywny lub nie istnieje.");
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        alert("Wprowadź poprawną kwotę kredytu.");
        return;
    }
    // Sprawdź, czy gracz nie jest w stanie niewypłacalności (jeśli taka mechanika istnieje)
    if (isPlayerInDefault && isPlayerInDefault()) {
         alert("Nie możesz wziąć kredytu, mając niespłacone zobowiązania!");
         return;
    }

    const netWorth = calculateNetWorth('player');
    const existingLoansTotal = playerCommercialLoans.reduce((sum, loan) => sum + loan.amount, 0);
    // Limit kredytowy: 30% wartości netto minus istniejące kredyty komercyjne
    const maxLoanPossible = netWorth * 0.3 - existingLoansTotal;

    if (amount > maxLoanPossible) {
        alert(`Twój limit kredytowy w bankach komercyjnych wynosi ${Math.max(0, maxLoanPossible).toFixed(0)} PLN. Nie możesz pożyczyć ${amount.toFixed(0)} PLN.`);
        return;
    }
    // Bank też ma limit - nie pożyczy więcej niż np. 20% swojej gotówki na raz
    if (amount > bank.cash * 0.2) {
        alert(`Bank ${bank.name} nie może udzielić tak wysokiego kredytu w tym momencie. Spróbuj mniejszą kwotę.`);
        return;
    }


    const interestRate = bank.interestRateLoan;
    const loanDurationWeeks = 26; // Kredyt na pół roku (26 tygodni)
    const maturityDate = Date.now() + (loanDurationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    // Dokładniejsza kalkulacja raty (annuitetowa, uproszczona)
    const weeklyRate = interestRate / 52;
    const weeklyPayment = amount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);

    // Transakcja
    playerCash += amount;
    bank.cash -= amount; // Bank wypłaca środki
    // Zapisz pożyczkę w portfelu banku (kwota początkowa)
    if (!bank.loanPortfolio['player']) bank.loanPortfolio['player'] = [];
    bank.loanPortfolio['player'].push({ id: `loan_${Date.now()}`, initialAmount: amount, remainingAmount: amount, interestRate: interestRate });

    const newLoan = {
        id: `loan_${Date.now()}`,
        bankId: bankId,
        bankName: bank.name,
        initialAmount: amount,
        amount: amount, // Kwota pozostała do spłaty
        interestRate: interestRate,
        weeklyPayment: weeklyPayment,
        maturityDate: maturityDate,
        collateral: null
    };
    playerCommercialLoans.push(newLoan);

    logEvent(` Zaciągnięto kredyt ${amount.toFixed(0)} PLN w ${bank.name} na ${loanDurationWeeks} tyg. Rata: ${weeklyPayment.toFixed(2)} PLN/tydz.`, 'review');
    displayCash();
    displayPortfolio(); // Aby odświeżyć listę pasywów
    closeInteractionModal(); // Zamknij modal interakcji
}

function repayCommercialLoan(loanId, amount) {
    const loanIndex = playerCommercialLoans.findIndex(l => l.id === loanId);
    if (loanIndex === -1) {
        alert("Nie znaleziono takiej pożyczki.");
        return;
    }
    const loan = playerCommercialLoans[loanIndex];
    const bank = commercialBanks.find(b => b.id === loan.bankId);

    if (isNaN(amount) || amount <= 0) {
        alert("Wprowadź poprawną kwotę spłaty.");
        return;
    }
    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki.");
        return;
    }

    const amountToRepay = Math.min(amount, loan.amount); // Nie spłacaj więcej niż zostało

    // Transakcja
    playerCash -= amountToRepay;
    loan.amount -= amountToRepay;
    if(bank) {
        bank.cash += amountToRepay; // Bank otrzymuje spłatę
        // Aktualizuj portfel kredytowy banku (znajdź odpowiednią pożyczkę)
        if (bank.loanPortfolio['player']) {
            const bankLoanIndex = bank.loanPortfolio['player'].findIndex(bl => bl.id === loan.id);
            if (bankLoanIndex !== -1) {
                bank.loanPortfolio['player'][bankLoanIndex].remainingAmount -= amountToRepay;
                if (bank.loanPortfolio['player'][bankLoanIndex].remainingAmount <= 0) {
                    bank.loanPortfolio['player'].splice(bankLoanIndex, 1); // Usuń spłaconą pożyczkę z portfela banku
                }
            }
        }
    }

    logEvent(` Spłacono ${amountToRepay.toFixed(2)} PLN kredytu w ${loan.bankName}.`, 'review');

    // Jeśli spłacono całość
    if (loan.amount <= 0.01) { // Użyj małego progu dla błędów zmiennoprzecinkowych
        playerCommercialLoans.splice(loanIndex, 1); // Usuń pożyczkę z listy
        logEvent(` Kredyt w ${loan.bankName} został w całości spłacony!`, 'success');
        showToast(`Kredyt w ${loan.bankName} spłacony!`, 'success');
    }

    displayCash();
    displayPortfolio();
    closeInteractionModal(); // Zamknij modal interakcji (jeśli był otwarty)
    // Jeśli okno kredytów jest otwarte, odśwież je
    if(document.getElementById('commercial-loan-modal')?.style.display === 'block'){
        openCommercialLoanModal(loan.bankId);
    }
}

function makeCommercialDeposit(bankId, amount) {
    const bank = commercialBanks.find(b => b.id === bankId);
    if (!bank || !bank.isActive) {
        alert("Wybrany bank jest nieaktywny lub nie istnieje.");
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        alert("Wprowadź poprawną kwotę depozytu.");
        return;
    }
    if (playerCash < amount) {
        alert("Nie masz wystarczająco gotówki.");
        return;
    }

    const interestRate = bank.interestRateDeposit;

    // Transakcja
    playerCash -= amount;
    bank.cash += amount; // Bank przyjmuje środki
    // Zapisz depozyt w portfelu banku
    if (!bank.depositPortfolio['player']) bank.depositPortfolio['player'] = [];
    bank.depositPortfolio['player'].push({ id: `dep_${Date.now()}`, amount: amount, interestRate: interestRate });


    // Sprawdź, czy gracz ma już depozyt w tym banku (w strukturze gracza)
    const existingDeposit = playerCommercialDeposits.find(d => d.bankId === bankId);
    if (existingDeposit) {
        existingDeposit.amount += amount; // Po prostu zwiększ kwotę
        existingDeposit.interestRate = interestRate; // Zaktualizuj oprocentowanie na wypadek zmiany
    } else {
        const newDeposit = {
            id: `dep_${Date.now()}_player`, // Unikalne ID dla gracza
            bankId: bankId,
            bankName: bank.name,
            amount: amount,
            interestRate: interestRate,
            startDate: Date.now()
        };
        playerCommercialDeposits.push(newDeposit);
    }

    logEvent(` Wpłacono ${amount.toFixed(2)} PLN depozytu do ${bank.name}.`, 'review');
    displayCash();
    displayPortfolio();
    closeInteractionModal();
}

function withdrawCommercialDeposit(depositId, amount) {
    const depositIndex = playerCommercialDeposits.findIndex(d => d.id === depositId);
    if (depositIndex === -1) {
        // Jeśli nie znaleziono po ID, spróbuj znaleźć po bankId (na wypadek starej logiki)
        const depositByBank = playerCommercialDeposits.find(d => d.bankId === depositId); // Tu depositId to tak naprawdę bankId
         if(depositByBank){
             depositId = depositByBank.id; // Użyj poprawnego ID
             depositIndex = playerCommercialDeposits.findIndex(d => d.id === depositId);
         } else {
            alert("Nie znaleziono takiego depozytu.");
            return;
         }
    }

    const deposit = playerCommercialDeposits[depositIndex];
    const bank = commercialBanks.find(b => b.id === deposit.bankId);

    if (isNaN(amount) || amount <= 0) {
        alert("Wprowadź poprawną kwotę wypłaty.");
        return;
    }

    const amountToWithdraw = Math.min(amount, deposit.amount);

    if (!bank) {
         console.warn(`Nie znaleziono banku ${deposit.bankId} przy wypłacie depozytu.`);
         // Wypłać graczowi, ale nie aktualizuj banku
    } else if (bank.cash < amountToWithdraw) {
        alert(`Bank ${bank.name} ma chwilowe problemy z płynnością i nie może wypłacić tej kwoty.`);
        return;
    } else {
        // Zaktualizuj bank
        bank.cash -= amountToWithdraw;
        // Znajdź i zmniejsz odpowiedni depozyt w portfelu banku (uproszczone)
        if (bank.depositPortfolio['player']) {
             // W bardziej złożonym systemie znaleźlibyśmy konkretny depozyt po ID
             // Tutaj uproszczenie: odejmujemy od ogólnej puli depozytów gracza w banku
             const totalPlayerDepositsInBank = bank.depositPortfolio['player'].reduce((sum, dep) => sum + dep.amount, 0);
             const newTotal = Math.max(0, totalPlayerDepositsInBank - amountToWithdraw);
             // Aktualizacja - zamiast prostej sumy, usuwamy/zmniejszamy konkretny depozyt
             const bankDepIndex = bank.depositPortfolio['player'].findIndex(dep => dep.id.startsWith('dep_')); // Proste znalezienie
             if(bankDepIndex !== -1){
                 bank.depositPortfolio['player'][bankDepIndex].amount -= amountToWithdraw;
                 if(bank.depositPortfolio['player'][bankDepIndex].amount <= 0) {
                     bank.depositPortfolio['player'].splice(bankDepIndex, 1);
                 }
             }
        }
    }

    // Transakcja dla gracza
    playerCash += amountToWithdraw;
    deposit.amount -= amountToWithdraw;

    logEvent(` Wypłacono ${amountToWithdraw.toFixed(2)} PLN depozytu z ${deposit.bankName}.`, 'review');

    // Jeśli wypłacono całość
    if (deposit.amount <= 0.01) {
        playerCommercialDeposits.splice(depositIndex, 1); // Usuń depozyt z listy gracza
    }

    displayCash();
    displayPortfolio();
    closeInteractionModal();
     // Jeśli okno depozytów jest otwarte, odśwież je
    if(document.getElementById('commercial-deposit-modal')?.style.display === 'block'){
        openCommercialDepositModal(deposit.bankId);
    }
}

function takeMortgageLoan(bankId, collateralSymbol, collateralQuantity, requestedAmount) {
    const bank = commercialBanks.find(b => b.id === bankId && b.type === BANK_TYPES.MORTGAGE);
    const stock = stocks.find(s => s.symbol === collateralSymbol && !s.assetType);
    const holding = playerPortfolio[collateralSymbol];

    if (!bank || !bank.isActive) {
        alert("Wybrany bank jest nieaktywny lub nie obsługuje hipotek."); return;
    }
    if (!stock) {
        alert("Wybrano nieprawidłowe akcje jako zastaw."); return;
    }
    // SCALONO: Poprawiono walidację - sprawdza dostępne akcje (shares - lockedShares)
    const availableShares = holding ? holding.shares - (holding.lockedShares || 0) : 0;
    if (!holding || availableShares < collateralQuantity) {
        alert(`Nie posiadasz wystarczającej liczby *dostępnych* akcji ${collateralSymbol} (dostępne: ${availableShares}).`); return;
    }
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
        alert("Wprowadź poprawną kwotę pożyczki."); return;
    }
    // Sprawdź, czy gracz nie jest w stanie niewypłacalności
    if (isPlayerInDefault && isPlayerInDefault()) {
         alert("Nie możesz wziąć hipoteki, mając niespłacone zobowiązania!");
         return;
    }

    const collateralValue = stock.price * collateralQuantity;
    const maxLoanAmount = collateralValue * 0.5; // Max 50% wartości zastawu

    if (requestedAmount > maxLoanAmount) {
        alert(`Maksymalna kwota pożyczki pod ten zastaw to ${maxLoanAmount.toFixed(0)} PLN.`); return;
    }
    if (requestedAmount > bank.cash * 0.1) { // Bank nie pożyczy więcej niż 10% swojej gotówki na raz
        alert(`Bank ${bank.name} nie może udzielić tak wysokiej hipoteki w tym momencie.`); return;
    }

    // Parametry pożyczki hipotecznej
    const interestRate = bank.interestRateLoan * 1.1; // Hipoteka ma wyższe ryzyko dla banku
    const loanDurationWeeks = 52; // Hipoteka na rok
    const maturityDate = Date.now() + (loanDurationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    const weeklyRate = interestRate / 52;
    const weeklyPayment = requestedAmount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);

    // Transakcja
    playerCash += requestedAmount;
    bank.cash -= requestedAmount;
    if (!bank.loanPortfolio['player']) bank.loanPortfolio['player'] = [];
    bank.loanPortfolio['player'].push({ id: `mort_${Date.now()}`, initialAmount: requestedAmount, remainingAmount: requestedAmount, interestRate: interestRate, collateral: { symbol: collateralSymbol, quantity: collateralQuantity } });


    // Zapisz pożyczkę u gracza
    const newLoan = {
        id: `mort_${Date.now()}`,
        bankId: bankId,
        bankName: bank.name,
        initialAmount: requestedAmount,
        amount: requestedAmount,
        interestRate: interestRate,
        weeklyPayment: weeklyPayment,
        maturityDate: maturityDate,
        collateral: { symbol: collateralSymbol, quantity: collateralQuantity }
    };
    playerCommercialLoans.push(newLoan);

    // Zablokuj zastawione akcje (dodajemy nową właściwość do portfela)
    if (!holding.lockedShares) holding.lockedShares = 0;
    holding.lockedShares += collateralQuantity;

    logEvent(` Zaciągnięto kredyt hipoteczny ${requestedAmount.toFixed(0)} PLN w ${bank.name} pod zastaw ${collateralQuantity} ${collateralSymbol}.`, 'review');
    displayCash();
    displayPortfolio();
    closeInteractionModal();
}

function checkMortgageDefaults() {
    const now = Date.now();
    let auctionStartedThisCycle = false; // Flaga, aby uruchomić max jedną aukcję na cykl

    // Sprawdź hipoteki gracza
    for (let i = playerCommercialLoans.length - 1; i >= 0; i--) {
        const loan = playerCommercialLoans[i];
        // Sprawdź, czy to hipoteka, termin minął i nie jest spłacona
        if (loan.collateral && now >= loan.maturityDate && loan.amount > 0.01) {
            logEvent(`⏰ Termin spłaty Twojej hipoteki pod zastaw ${loan.collateral.quantity} ${loan.collateral.symbol} minął! Akcje trafiają na aukcję.`, 'warning');
            showToast(`Niespłacona hipoteka! Akcje ${loan.collateral.symbol} trafiają na aukcję!`, 'error', 8000);

            // Uruchom aukcję (ta funkcja sama usuwa akcje z portfela)
            startCollateralAuction('player', loan.collateral.symbol, loan.collateral.quantity);

            // Usuń niespłaconą pożyczkę z listy gracza
            playerCommercialLoans.splice(i, 1);

            // Znajdź i usuń pożyczkę z portfela banku
            const bank = commercialBanks.find(b => b.id === loan.bankId);
            if (bank && bank.loanPortfolio['player']) {
                const bankLoanIndex = bank.loanPortfolio['player'].findIndex(bl => bl.id === loan.id);
                if (bankLoanIndex !== -1) {
                    bank.loanPortfolio['player'].splice(bankLoanIndex, 1);
                }
            }

            auctionStartedThisCycle = true; // Uruchomiono aukcję
            displayPortfolio(); // Odśwież portfel od razu
            break; // Tylko jedna aukcja na cykl
        }
    }

    // --- 👇 ZAKTUALIZOWANA LOGIKA: Sprawdź hipoteki AI 👇 ---
    if (!auctionStartedThisCycle) { // Sprawdzaj AI tylko, jeśli gracz nie stracił akcji w tym cyklu
        for (const ai of aiCompetitors) { // Pętla po wszystkich botach
            if (!ai.loans || ai.loans.length === 0) continue; // Pomiń AI bez pożyczek

            for (let i = ai.loans.length - 1; i >= 0; i--) { // Pętla po pożyczkach bota
                const loan = ai.loans[i];
                // Sprawdź, czy to hipoteka, termin minął i nie jest spłacona
                if (loan.collateral && now >= loan.maturityDate && loan.amount > 0.01) {
                    logEvent(`⏰ ${ai.name} nie spłacił hipoteki pod zastaw ${loan.collateral.quantity} ${loan.collateral.symbol}! Akcje trafiają na aukcję.`, 'market');

                    // Uruchom aukcję (funkcja sama usunie akcje z portfela AI)
                    startCollateralAuction(ai.id, loan.collateral.symbol, loan.collateral.quantity);

                    // Usuń niespłaconą pożyczkę z listy AI
                    ai.loans.splice(i, 1);

                    // Znajdź i usuń pożyczkę z portfela banku
                    const bank = commercialBanks.find(b => b.id === loan.bankId);
                     if (bank && bank.loanPortfolio[ai.id]) { // Użyj ID bota
                        const bankLoanIndex = bank.loanPortfolio[ai.id].findIndex(bl => bl.id === loan.id);
                        if (bankLoanIndex !== -1) {
                            bank.loanPortfolio[ai.id].splice(bankLoanIndex, 1);
                        }
                    }

                    auctionStartedThisCycle = true; // Uruchomiono aukcję
                    break; // Tylko jedna aukcja AI na cykl dla danego bota
                }
            }
            if (auctionStartedThisCycle) break; // Przerwij zewnętrzną pętlę AI, jeśli uruchomiono aukcję
        }
    }
    // --- 👆 KONIEC ZAKTUALIZOWANEJ LOGIKI 👆 ---
}

function sellSharesToInvestmentBank(bankId, symbol, quantity) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const stock = stocks.find(s => s.symbol === symbol);
    const holding = playerPortfolio[symbol];

    // SCALONO: Dodano sprawdzenie `holding.lockedShares`
    const availableShares = holding ? holding.shares - (holding.lockedShares || 0) : 0;
    if (!bank || bank.type !== BANK_TYPES.INVESTMENT || !stock || !holding || availableShares < quantity) {
        alert("Wystąpił błąd podczas sprzedaży (sprawdź, czy masz wystarczająco *dostępnych* akcji).");
        return;
    }

    // Cena odkupu: 95% ceny rynkowej, obniżona dla słabych spółek
    let priceMultiplier = 0.95;
    if (stock.financialHealth < 0) priceMultiplier -= 0.05;
    if (stock.financialHealth < -2) priceMultiplier -= 0.05;
    const purchasePrice = stock.price * priceMultiplier;
    const totalCostForBank = purchasePrice * quantity;

    if (bank.cash < totalCostForBank) {
        alert(`Bank ${bank.name} nie ma wystarczająco gotówki, aby odkupić te akcje.`);
        return;
    }

    // Transakcja
    bank.cash -= totalCostForBank;
    playerCash += totalCostForBank;

    // Aktualizacja portfela gracza
    holding.shares -= quantity;
    if (holding.shares <= 0) {
        delete playerPortfolio[symbol];
    }

    // Aktualizacja portfela banku
    if (bank.stockPortfolio[symbol]) {
        const bankHolding = bank.stockPortfolio[symbol];
        const oldTotalValue = bankHolding.avgPrice * bankHolding.shares;
        const newTotalValue = oldTotalValue + totalCostForBank;
        bankHolding.shares += quantity;
        bankHolding.avgPrice = newTotalValue / bankHolding.shares;
    } else {
        bank.stockPortfolio[symbol] = { shares: quantity, avgPrice: purchasePrice };
    }

    logEvent(`Sprzedałeś ${quantity} akcji ${symbol} bankowi ${bank.name} po ${purchasePrice.toFixed(2)} PLN.`, 'review');
    displayCash();
    displayPortfolio();
}

function buySharesFromInvestmentBank(bankId, symbol) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const stock = stocks.find(s => s.symbol === symbol);
    const bankHolding = bank?.stockPortfolio[symbol];
    const inputElement = document.getElementById(`buy-from-bank-${bankId}-${symbol}`);
    const quantity = inputElement ? inputElement.valueAsNumber : 0;

    if (!bank || !stock || !bankHolding || bankHolding.shares < quantity || isNaN(quantity) || quantity <= 0) {
        alert("Nie można zrealizować tej transakcji (sprawdź ilość lub dostępność).");
        return;
    }

    const sellPrice = stock.price * 1.10; // Cena z marżą +10%
    const totalCost = sellPrice * quantity;

    if (playerCash < totalCost) {
        alert("Nie masz wystarczająco gotówki.");
        return;
    }

    // Transakcja
    playerCash -= totalCost;
    bank.cash += totalCost;

    // Aktualizacja portfela banku
    bankHolding.shares -= quantity;
    if (bankHolding.shares <= 0) {
        delete bank.stockPortfolio[symbol];
    }

    // Aktualizacja portfela gracza
    if (playerPortfolio[symbol]) {
        const playerHolding = playerPortfolio[symbol];
        const oldTotalValue = playerHolding.avgPrice * playerHolding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        playerHolding.shares += quantity;
        playerHolding.avgPrice = newTotalValue / playerHolding.shares;
    } else {
        playerPortfolio[symbol] = { shares: quantity, avgPrice: sellPrice };
    }

    logEvent(`Kupiłeś ${quantity} akcji ${symbol} od banku ${bank.name} po ${sellPrice.toFixed(2)} PLN.`, 'review');
    displayCash();
    displayPortfolio();
    renderCommercialBanksList(); // Odśwież listę banków, bo zmieniła się dostępność akcji
}

function processBankStartupSponsorship() {
    const activeBanks = commercialBanks.filter(b => b.isActive && (b.type === BANK_TYPES.INVESTMENT || b.type === BANK_TYPES.UNIVERSAL));
    if (activeBanks.length === 0) return;

    const potentialStartups = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding' && !s.isPrivatized && !s.isScamDetected);
    if (potentialStartups.length === 0) return;

    activeBanks.forEach(bank => {
        // Niska szansa (np. 2%) w każdym cyklu tygodniowym na próbę sponsorowania
        if (Math.random() < 0.02 && bank.cash > 50000) { // Bank musi mieć trochę gotówki
            const targetStartup = getRandomElement(potentialStartups);
            const investmentAmount = getRandomIntInRange(5000, 20000); // Kwota sponsorowania

            if (bank.cash >= investmentAmount) {
                bank.cash -= investmentAmount;
                targetStartup.currentFunding += investmentAmount;

                // Bank pojawia się na liście fundatorów
                targetStartup.investors[bank.name] = (targetStartup.investors[bank.name] || 0) + investmentAmount;

                // Bank otrzymuje "prawo do udziałów" (zapisujemy kwotę)
                if (!bank.startupInvestments) bank.startupInvestments = {};
                bank.startupInvestments[targetStartup.symbol] = (bank.startupInvestments[targetStartup.symbol] || 0) + investmentAmount;

                // Zwiększ szansę na sukces startupu
                const successChanceBonus = (investmentAmount / targetStartup.fundingGoal) * 0.03; // Mniejszy bonus niż od gracza/AI
                targetStartup.successChance += successChanceBonus;
                if (targetStartup.successChance > 1) targetStartup.successChance = 1;

                // Zwiększ szansę na wrogie przejęcie w przyszłości (jeśli wejdzie na giełdę)
                if (!targetStartup.acquisitionTargetChance) targetStartup.acquisitionTargetChance = 0;
                targetStartup.acquisitionTargetChance += 0.05; // +5% szansy

                logEvent(`🏦 Bank ${bank.name} sponsoruje startup ${targetStartup.name} kwotą ${investmentAmount.toLocaleString()} PLN!`, 'market');
                
                // Odśwież widok startupów, jeśli otwarty
                if (document.getElementById('startup-incubator-panel').style.display === 'block') {
                    displayStartups(getCurrentStartupInputValues());
                }
            }
        }
    });
}

function takeMortgageLoan(bankId, collateralSymbol, collateralQuantity, requestedAmount) {
    const bank = commercialBanks.find(b => b.id === bankId && b.type === BANK_TYPES.MORTGAGE);
    const stock = stocks.find(s => s.symbol === collateralSymbol && !s.assetType);
    const holding = playerPortfolio[collateralSymbol];

    if (!bank || !bank.isActive) {
        alert("Wybrany bank jest nieaktywny lub nie obsługuje hipotek."); return;
    }
    if (!stock) {
        alert("Wybrano nieprawidłowe akcje jako zastaw."); return;
    }
    
    // SCALONO: Poprawiona walidacja sprawdzająca 'lockedShares'
    const availableShares = holding ? holding.shares - (holding.lockedShares || 0) : 0;
    if (!holding || availableShares < collateralQuantity) {
        alert(`Nie posiadasz wystarczającej liczby *dostępnych* akcji ${collateralSymbol} (dostępne: ${availableShares}).`); return;
    }
    
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
        alert("Wprowadź poprawną kwotę pożyczki."); return;
    }
    // Sprawdź, czy gracz nie jest w stanie niewypłacalności
    if (isPlayerInDefault && isPlayerInDefault()) {
         alert("Nie możesz wziąć hipoteki, mając niespłacone zobowiązania!");
         return;
    }

    const collateralValue = stock.price * collateralQuantity;
    const maxLoanAmount = collateralValue * 0.5; // Max 50% wartości zastawu

    if (requestedAmount > maxLoanAmount) {
        alert(`Maksymalna kwota pożyczki pod ten zastaw to ${maxLoanAmount.toFixed(0)} PLN.`); return;
    }
    if (requestedAmount > bank.cash * 0.1) { // Bank nie pożyczy więcej niż 10% swojej gotówki na raz
        alert(`Bank ${bank.name} nie może udzielić tak wysokiej hipoteki w tym momencie.`); return;
    }

    // Parametry pożyczki hipotecznej
    const interestRate = bank.interestRateLoan * 1.1; // Hipoteka ma wyższe ryzyko dla banku
    const loanDurationWeeks = 52; // Hipoteka na rok
    const maturityDate = Date.now() + (loanDurationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    const weeklyRate = interestRate / 52;
    const weeklyPayment = requestedAmount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);

    // Transakcja
    playerCash += requestedAmount;
    bank.cash -= requestedAmount;
    if (!bank.loanPortfolio['player']) bank.loanPortfolio['player'] = [];
    bank.loanPortfolio['player'].push({ id: `mort_${Date.now()}`, initialAmount: requestedAmount, remainingAmount: requestedAmount, interestRate: interestRate, collateral: { symbol: collateralSymbol, quantity: collateralQuantity } });


    // Zapisz pożyczkę u gracza
    const newLoan = {
        id: `mort_${Date.now()}`,
        bankId: bankId,
        bankName: bank.name,
        initialAmount: requestedAmount,
        amount: requestedAmount,
        interestRate: interestRate,
        weeklyPayment: weeklyPayment,
        maturityDate: maturityDate,
        collateral: { symbol: collateralSymbol, quantity: collateralQuantity }
    };
    playerCommercialLoans.push(newLoan);

    // Zablokuj zastawione akcje (dodajemy nową właściwość do portfela)
    if (!holding.lockedShares) holding.lockedShares = 0;
    holding.lockedShares += collateralQuantity;

    logEvent(` Zaciągnięto kredyt hipoteczny ${requestedAmount.toFixed(0)} PLN w ${bank.name} pod zastaw ${collateralQuantity} ${collateralSymbol}.`, 'review');
    displayCash();
    displayPortfolio();
    closeInteractionModal();
}

function checkMortgageDefaults() {
    const now = Date.now();
    let auctionStartedThisCycle = false; // Flaga, aby uruchomić max jedną aukcję na cykl

    // Sprawdź hipoteki gracza
    for (let i = playerCommercialLoans.length - 1; i >= 0; i--) {
        const loan = playerCommercialLoans[i];
        // Sprawdź, czy to hipoteka, termin minął i nie jest spłacona
        if (loan.collateral && now >= loan.maturityDate && loan.amount > 0.01) {
            logEvent(`⏰ Termin spłaty Twojej hipoteki pod zastaw ${loan.collateral.quantity} ${loan.collateral.symbol} minął! Akcje trafiają na aukcję.`, 'warning');
            showToast(`Niespłacona hipoteka! Akcje ${loan.collateral.symbol} trafiają na aukcję!`, 'error', 8000);

            // Uruchom aukcję (ta funkcja sama usuwa akcje z portfela)
            startCollateralAuction('player', loan.collateral.symbol, loan.collateral.quantity);

            // Usuń niespłaconą pożyczkę z listy gracza
            playerCommercialLoans.splice(i, 1);

            // Znajdź i usuń pożyczkę z portfela banku
            const bank = commercialBanks.find(b => b.id === loan.bankId);
            if (bank && bank.loanPortfolio['player']) {
                const bankLoanIndex = bank.loanPortfolio['player'].findIndex(bl => bl.id === loan.id);
                if (bankLoanIndex !== -1) {
                    bank.loanPortfolio['player'].splice(bankLoanIndex, 1);
                }
            }

            auctionStartedThisCycle = true; // Uruchomiono aukcję
            displayPortfolio(); // Odśwież portfel od razu
            break; // Tylko jedna aukcja na cykl
        }
    }

    // --- 👇 ZAKTUALIZOWANA LOGIKA: Sprawdź hipoteki AI 👇 ---
    if (!auctionStartedThisCycle) { // Sprawdzaj AI tylko, jeśli gracz nie stracił akcji w tym cyklu
        for (const ai of aiCompetitors) { // Pętla po wszystkich botach
            if (!ai.loans || ai.loans.length === 0) continue; // Pomiń AI bez pożyczek

            for (let i = ai.loans.length - 1; i >= 0; i--) { // Pętla po pożyczkach bota
                const loan = ai.loans[i];
                // Sprawdź, czy to hipoteka, termin minął i nie jest spłacona
                if (loan.collateral && now >= loan.maturityDate && loan.amount > 0.01) {
                    logEvent(`⏰ ${ai.name} nie spłacił hipoteki pod zastaw ${loan.collateral.quantity} ${loan.collateral.symbol}! Akcje trafiają na aukcję.`, 'market');

                    // Uruchom aukcję (funkcja sama usunie akcje z portfela AI)
                    startCollateralAuction(ai.id, loan.collateral.symbol, loan.collateral.quantity);

                    // Usuń niespłaconą pożyczkę z listy AI
                    ai.loans.splice(i, 1);

                    // Znajdź i usuń pożyczkę z portfela banku
                    const bank = commercialBanks.find(b => b.id === loan.bankId);
                     if (bank && bank.loanPortfolio[ai.id]) { // Użyj ID bota
                        const bankLoanIndex = bank.loanPortfolio[ai.id].findIndex(bl => bl.id === loan.id);
                        if (bankLoanIndex !== -1) {
                            bank.loanPortfolio[ai.id].splice(bankLoanIndex, 1);
                        }
                    }

                    auctionStartedThisCycle = true; // Uruchomiono aukcję
                    break; // Tylko jedna aukcja AI na cykl dla danego bota
                }
            }
            if (auctionStartedThisCycle) break; // Przerwij zewnętrzną pętlę AI, jeśli uruchomiono aukcję
        }
    }
    // --- 👆 KONIEC ZAKTUALIZOWANEJ LOGIKI 👆 ---
}

function sellSharesToInvestmentBank(bankId, symbol, quantity) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const stock = stocks.find(s => s.symbol === symbol);
    const holding = playerPortfolio[symbol];

    // SCALONO: Poprawiona walidacja sprawdzająca 'lockedShares'
    const availableShares = holding ? holding.shares - (holding.lockedShares || 0) : 0;
    if (!bank || bank.type !== BANK_TYPES.INVESTMENT || !stock || !holding || availableShares < quantity) {
        alert("Wystąpił błąd podczas sprzedaży (sprawdź, czy masz wystarczająco *dostępnych* akcji).");
        return;
    }

    // Cena odkupu: 95% ceny rynkowej, obniżona dla słabych spółek
    let priceMultiplier = 0.95;
    if (stock.financialHealth < 0) priceMultiplier -= 0.05;
    if (stock.financialHealth < -2) priceMultiplier -= 0.05;
    const purchasePrice = stock.price * priceMultiplier;
    const totalCostForBank = purchasePrice * quantity;

    if (bank.cash < totalCostForBank) {
        alert(`Bank ${bank.name} nie ma wystarczająco gotówki, aby odkupić te akcje.`);
        return;
    }

    // Transakcja
    bank.cash -= totalCostForBank;
    playerCash += totalCostForBank;

    // Aktualizacja portfela gracza
    holding.shares -= quantity;
    if (holding.shares <= 0) {
        delete playerPortfolio[symbol];
    }

    // Aktualizacja portfela banku
    if (bank.stockPortfolio[symbol]) {
        const bankHolding = bank.stockPortfolio[symbol];
        const oldTotalValue = bankHolding.avgPrice * bankHolding.shares;
        const newTotalValue = oldTotalValue + totalCostForBank;
        bankHolding.shares += quantity;
        bankHolding.avgPrice = newTotalValue / bankHolding.shares;
    } else {
        bank.stockPortfolio[symbol] = { shares: quantity, avgPrice: purchasePrice };
    }

    logEvent(`Sprzedałeś ${quantity} akcji ${symbol} bankowi ${bank.name} po ${purchasePrice.toFixed(2)} PLN.`, 'review');
    displayCash();
    displayPortfolio();
}

function buySharesFromInvestmentBank(bankId, symbol) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const stock = stocks.find(s => s.symbol === symbol);
    const bankHolding = bank?.stockPortfolio[symbol];
    const inputElement = document.getElementById(`buy-from-bank-${bankId}-${symbol}`);
    const quantity = inputElement ? inputElement.valueAsNumber : 0;

    if (!bank || !stock || !bankHolding || bankHolding.shares < quantity || isNaN(quantity) || quantity <= 0) {
        alert("Nie można zrealizować tej transakcji (sprawdź ilość lub dostępność).");
        return;
    }

    const sellPrice = stock.price * 1.10; // Cena z marżą +10%
    const totalCost = sellPrice * quantity;

    if (playerCash < totalCost) {
        alert("Nie masz wystarczająco gotówki.");
        return;
    }

    // Transakcja
    playerCash -= totalCost;
    bank.cash += totalCost;

    // Aktualizacja portfela banku
    bankHolding.shares -= quantity;
    if (bankHolding.shares <= 0) {
        delete bank.stockPortfolio[symbol];
    }

    // Aktualizacja portfela gracza
    if (playerPortfolio[symbol]) {
        const playerHolding = playerPortfolio[symbol];
        const oldTotalValue = playerHolding.avgPrice * playerHolding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        playerHolding.shares += quantity;
        playerHolding.avgPrice = newTotalValue / playerHolding.shares;
    } else {
        playerPortfolio[symbol] = { shares: quantity, avgPrice: sellPrice };
    }

    logEvent(`Kupiłeś ${quantity} akcji ${symbol} od banku ${bank.name} po ${sellPrice.toFixed(2)} PLN.`, 'review');
    displayCash();
    displayPortfolio();
    renderCommercialBanksList(); // Odśwież listę banków, bo zmieniła się dostępność akcji
}

function processBankStartupSponsorship() {
    const activeBanks = commercialBanks.filter(b => b.isActive && (b.type === BANK_TYPES.INVESTMENT || b.type === BANK_TYPES.UNIVERSAL));
    if (activeBanks.length === 0) return;

    const potentialStartups = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding' && !s.isPrivatized && !s.isScamDetected);
    if (potentialStartups.length === 0) return;

    activeBanks.forEach(bank => {
        // Niska szansa (np. 2%) w każdym cyklu tygodniowym na próbę sponsorowania
        if (Math.random() < 0.02 && bank.cash > 50000) { // Bank musi mieć trochę gotówki
            const targetStartup = getRandomElement(potentialStartups);
            const investmentAmount = getRandomIntInRange(5000, 20000); // Kwota sponsorowania

            if (bank.cash >= investmentAmount) {
                bank.cash -= investmentAmount;
                targetStartup.currentFunding += investmentAmount;

                // Bank pojawia się na liście fundatorów
                targetStartup.investors[bank.name] = (targetStartup.investors[bank.name] || 0) + investmentAmount;

                // Bank otrzymuje "prawo do udziałów" (zapisujemy kwotę)
                if (!bank.startupInvestments) bank.startupInvestments = {};
                bank.startupInvestments[targetStartup.symbol] = (bank.startupInvestments[targetStartup.symbol] || 0) + investmentAmount;

                // Zwiększ szansę na sukces startupu
                const successChanceBonus = (investmentAmount / targetStartup.fundingGoal) * 0.03; // Mniejszy bonus niż od gracza/AI
                targetStartup.successChance += successChanceBonus;
                if (targetStartup.successChance > 1) targetStartup.successChance = 1;

                // Zwiększ szansę na wrogie przejęcie w przyszłości (jeśli wejdzie na giełdę)
                if (!targetStartup.acquisitionTargetChance) targetStartup.acquisitionTargetChance = 0;
                targetStartup.acquisitionTargetChance += 0.05; // +5% szansy

                logEvent(`🏦 Bank ${bank.name} sponsoruje startup ${targetStartup.name} kwotą ${investmentAmount.toLocaleString()} PLN!`, 'market');
                
                // Odśwież widok startupów, jeśli otwarty
                if (document.getElementById('startup-incubator-panel').style.display === 'block') {
                    displayStartups(getCurrentStartupInputValues());
                }
            }
        }
    });
}

//Bank Centrlany

let centralBank = {
    funds: 100000000, // Środki BC na start
    baseInterestRate: 0.05, // Bazowa stopa procentowa (wpływa na LOAN_INTEREST_RATE i DEPOSIT_INTEREST_RATE)
    reserveRequirement: 0.10, // Wymagany poziom rezerw (10%)
    ceo: null
};

let LOAN_INTEREST_RATE; // Będzie obliczane
let DEPOSIT_INTEREST_RATE; // Będzie obliczane

function runCentralBankAI() {
    // Decyzje podejmowane rzadziej (np. 15% szans co kwartał)
    if (Math.random() > 0.15) return;

    const avgHealth = stocks.filter(s=>!s.assetType).reduce((sum, s) => sum + s.financialHealth, 0) / stocks.filter(s=>!s.assetType).length;
    let interestRateChange = 0;
    let reserveRequirementChange = 0;
    const ceoTraits = centralBank.ceo.traits.map(t => t.name); // Pobierz nazwy cech

    // Analiza rynku
    const isOverheated = marketVolatilityIndex > 1.8 && avgHealth > 1;
    const isSlowdown = marketVolatilityIndex < 0.8 && avgHealth < -0.5;

    // Podstawowa decyzja na podstawie rynku
    if (isOverheated) { interestRateChange = 0.005; reserveRequirementChange = 0.01; }
    else if (isSlowdown) { interestRateChange = -0.005; reserveRequirementChange = -0.01; }

    // Modyfikacje na podstawie cech CEO
    if (ceoTraits.includes("Jastrząb")) interestRateChange += 0.003;
    if (ceoTraits.includes("Gołąb")) interestRateChange -= 0.003;
    if (ceoTraits.includes("Stabilizator")) { interestRateChange *= 0.2; reserveRequirementChange *= 0.2; } // Znacznie mniejsze zmiany
    if (ceoTraits.includes("Regulator")) reserveRequirementChange += 0.005;
    if (ceoTraits.includes("Deregulator")) reserveRequirementChange -= 0.005;
    if (ceoTraits.includes("Partyjniak") && Math.random() < 0.3) { // 30% szans na losową, nieuzasadnioną decyzję
        interestRateChange = getRandomInRange(-0.007, 0.007);
        reserveRequirementChange = getRandomInRange(-0.015, 0.015);
        logEvent("🏛️ Niespodziewana decyzja Prezesa BC! Zmiana polityki monetarnej niezgodna z trendami.", 'warning');
    }

    // Zastosuj zmiany
    if (Math.abs(interestRateChange) > 0.001 || Math.abs(reserveRequirementChange) > 0.001) {
        centralBank.baseInterestRate += interestRateChange;
        centralBank.reserveRequirement += reserveRequirementChange;

        // Ograniczenia
        centralBank.baseInterestRate = Math.max(0.005, Math.min(0.15, centralBank.baseInterestRate));
        centralBank.reserveRequirement = Math.max(0.05, Math.min(0.25, centralBank.reserveRequirement));

        logEvent(`🏛️ Bank Centralny zmienia politykę! Stopa bazowa: ${(centralBank.baseInterestRate * 100).toFixed(1)}%, Rezerwy: ${(centralBank.reserveRequirement * 100).toFixed(0)}%.`, 'market');
        updateInterestRates();
        showToast("Bank Centralny zmienił politykę monetarną!", 'default', 6000);
    }

    // --- 👇 DODAJ LOGIKĘ FINANSOWANIA SPÓŁEK PAŃSTWOWYCH 👇 ---
    fundStateOwnedCompanies();
    // --- 👆 KONIEC DODAWANIA 👆 ---

}

let currentCollateralAuction = null; // { stockSymbol, quantity, minPrice, endTime, bids: [] }



/**
 * Rozpoczyna aukcję na akcje przejęte z niespłaconej hipoteki.
 * @param {string} originalOwnerId - Kto stracił akcje ('player' lub ID bota)
 * @param {string} symbol - Symbol licytowanych akcji.
 * @param {number} quantity - Liczba akcji na aukcji.
 */
function startCollateralAuction(originalOwnerId, symbol, quantity) {
    if (currentCollateralAuction) return; // Już trwa inna aukcja

    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const auctionDurationMinutes = 3;
    const auctionEndTime = Date.now() + (auctionDurationMinutes * 60 * 1000 / currentSpeedMultiplier);
    const minPrice = stock.price * 0.7; // Cena minimalna 70% wartości rynkowej

    currentCollateralAuction = {
        stockSymbol: symbol,
        quantityAvailable: quantity,
        minPrice: minPrice,
        endTime: auctionEndTime,
        bids: [] // { bidderId, quantity, price }
    };

    // Usuń akcje z portfela dłużnika
    if (originalOwnerId === 'player') {
        if (playerPortfolio[symbol]) {
            // SCALONO: Sprawdzamy 'lockedShares' i odejmujemy od nich, a potem od zwykłych akcji
            const holding = playerPortfolio[symbol];
            if (holding.lockedShares >= quantity) {
                holding.lockedShares -= quantity;
            } else {
                const remainingToSeize = quantity - (holding.lockedShares || 0);
                holding.lockedShares = 0;
                holding.shares -= remainingToSeize; // Odejmij resztę z wolnych akcji
            }
            if (holding.shares <= 0) delete playerPortfolio[symbol];
        }
    } else {
        const ai = aiCompetitors.find(a => a.id === originalOwnerId);
        if (ai && ai.portfolio[symbol]) {
             // SCALONO: Logika 'lockedShares' dla AI
             const holding = ai.portfolio[symbol];
             if (holding.lockedShares >= quantity) {
                holding.lockedShares -= quantity;
             } else {
                const remainingToSeize = quantity - (holding.lockedShares || 0);
                holding.lockedShares = 0;
                holding.shares -= remainingToSeize;
             }
             if (ai.portfolio[symbol].shares <= 0) delete ai.portfolio[symbol];
        }
    }
    // UWAGA: Te akcje formalnie "znikają" na czas aukcji. Zostaną dodane do zwycięzcy.

    logEvent(` AUKCJA AKCJI! ${quantity} szt. ${symbol} trafia na licytację (cena min. ${minPrice.toFixed(2)} PLN). Aukcja trwa ${auctionDurationMinutes} min.`, 'warning');
    showToast(` AUKCJA AKCJI ${symbol}! Sprawdź Bank Centralny.`, 'warning', 10000);

    // Zaplanuj rozstrzygnięcie
    const delay = auctionEndTime - Date.now();
    // SCALONO: Twoja wersja miała 'setTimeout', ale w 'main.js' jest pętla sprawdzająca.
    // Usuwam 'setTimeout', aby polegać na pętli z 'main.js' (która sprawdza `currentCollateralAuction.endTime`)
    // setTimeout(resolveCollateralAuction, delay); 

    if (document.getElementById('bank-modal')?.style.display === 'block') openBankModal();
}

/**
 * Gracz lub AI składa ofertę w aukcji akcji.
 */
function placeCollateralBid(bidder, quantity, price) {
    if (!currentCollateralAuction || Date.now() > currentCollateralAuction.endTime) {
        if (bidder === 'player') alert("Aukcja akcji nie jest aktywna.");
        return false;
    }
    if (isNaN(quantity) || quantity <= 0 || quantity > currentCollateralAuction.quantityAvailable ||
        isNaN(price) || price < currentCollateralAuction.minPrice) {
        if (bidder === 'player') alert(`Wprowadź poprawną ilość (max ${currentCollateralAuction.quantityAvailable}) i cenę (min ${currentCollateralAuction.minPrice.toFixed(2)} PLN).`);
        return false;
    }

    const bidderId = (bidder === 'player') ? 'player' : bidder.id;
    const bidderCash = (bidder === 'player') ? playerCash : bidder.cash;
    const totalCost = quantity * price;

    if (bidderCash < totalCost) {
        if (bidder === 'player') alert("Nie masz wystarczająco środków na złożenie tej oferty.");
        return false;
    }

    currentCollateralAuction.bids.push({ bidderId, quantity, price });

    if (bidder === 'player') {
        logEvent(`Złożono ofertę zakupu ${quantity} akcji ${currentCollateralAuction.stockSymbol} po ${price.toFixed(2)} PLN.`, 'review');
        showToast("Oferta na akcje złożona!", 'success');
        openBankModal();
    } else {
        console.log(`[AI] ${bidder.name} złożył ofertę na ${quantity} akcji ${currentCollateralAuction.stockSymbol} po ${price.toFixed(2)} PLN.`);
    }
    return true;
}

/**
 * Rozstrzyga aukcję akcji.
 */
function resolveCollateralAuction() {
    if (!currentCollateralAuction) return;
    const { stockSymbol, bids } = currentCollateralAuction;
    let remainingQuantity = currentCollateralAuction.quantityAvailable;
    const stock = stocks.find(s => s.symbol === stockSymbol); // Potrzebne do aktualizacji portfela

    logEvent(`🔔 Aukcja akcji ${stockSymbol} zakończona! Rozpoczyna się alokacja.`, 'market');
    bids.sort((a, b) => b.price - a.price); // Najwyższa cena pierwsza

    for (const bid of bids) {
        if (remainingQuantity <= 0) break;
        const quantityToAllocate = Math.min(bid.quantity, remainingQuantity);
        const totalCost = quantityToAllocate * bid.price;

        let bidderObject = (bid.bidderId === 'player') ? 'player' : aiCompetitors.find(ai => ai.id === bid.bidderId);
        if (!bidderObject) continue;
        const bidderCash = (bidderObject === 'player') ? playerCash : bidderObject.cash;

        if (bidderCash >= totalCost) {
            // Pobierz kasę
            if (bidderObject === 'player') playerCash -= totalCost;
            else bidderObject.cash -= totalCost;

            // Dodaj akcje do portfela zwycięzcy
            const targetPortfolio = (bidderObject === 'player') ? playerPortfolio : bidderObject.portfolio;
            if (targetPortfolio[stockSymbol]) {
                const holding = targetPortfolio[stockSymbol];
                const oldVal = holding.avgPrice * holding.shares;
                holding.shares += quantityToAllocate;
                holding.avgPrice = (oldVal + totalCost) / holding.shares;
            } else {
                targetPortfolio[stockSymbol] = { shares: quantityToAllocate, avgPrice: bid.price };
            }

            remainingQuantity -= quantityToAllocate;

            // Informacje
            if (bid.bidderId === 'player') {
                logEvent(`✅ Wygrałeś ${quantityToAllocate} akcji ${stockSymbol} na aukcji po cenie ${bid.price.toFixed(2)} PLN!`, 'success');
                displayCash(); displayPortfolio();
            } else {
                console.log(`[AI] ${bidderObject.name} wygrał ${quantityToAllocate} akcji ${stockSymbol} po ${bid.price.toFixed(2)} PLN.`);
            }

            // Pieniądze z aukcji trafiają do banku hipotecznego (uproszczone - na razie do BC)
            centralBank.funds += totalCost;

        } else if (bid.bidderId === 'player') {
            logEvent(`⚠️ Twoja oferta na akcje ${stockSymbol} została odrzucona (brak środków)!`, 'error');
        }
    }
    
    // SCALONO: Logika dla niesprzedanych akcji (jeśli jakieś zostały)
    if (remainingQuantity > 0) {
        logEvent(`Aukcja ${stockSymbol} zakończona. ${remainingQuantity} akcji nie znalazło nabywcy i przepada.`);
        // Te akcje po prostu znikają z rynku (nie są dodawane do nikogo).
    }

    currentCollateralAuction = null;
    logEvent("Alokacja akcji z aukcji zakończona.", 'market');
    if (document.getElementById('bank-modal')?.style.display === 'block') openBankModal();
}

/**
 * Zmienia bank komercyjny przypisany do spółki.
 * @param {string} symbol - Symbol spółki.
 * @param {string} newBankId - ID nowego banku.
 */
function changeCompanyBank(symbol, newBankId) {
    const stock = stocks.find(s => s.symbol === symbol);
    const newBank = commercialBanks.find(b => b.id === newBankId && b.isActive);

    // Walidacja (bez zmian)
    if (!stock || stock.assetType) { console.error("..."); return; }
    if (!newBank) { alert("Wybrany bank jest nieaktywny lub nie istnieje."); return; }
    if (stock.bankAccountId === newBankId) { alert(`Spółka ${stock.name} już korzysta z usług banku ${newBank.name}.`); return; }

    const oldBankId = stock.bankAccountId;
    const oldBank = commercialBanks.find(b => b.id === oldBankId);

    // --- 👇 NOWA LOGIKA TRANSFERU 👇 ---
    // 1. Transfer gotówki spółki
    const cashToTransfer = stock.cash;
    if (oldBank) {
        oldBank.cash -= cashToTransfer; // Zmniejsz gotówkę starego banku
    }
    newBank.cash += cashToTransfer; // Zwiększ gotówkę nowego banku
    // `stock.cash` pozostaje bez zmian

    // 2. Transfer kredytów spółki (jeśli istnieją)
    let transferredLoanAmount = 0;
    if (oldBank && oldBank.loanPortfolio[symbol]) {
        transferredLoanAmount = oldBank.loanPortfolio[symbol];
        // Przenieś kredyt do nowego banku
        newBank.loanPortfolio[symbol] = (newBank.loanPortfolio[symbol] || 0) + transferredLoanAmount;
        // Usuń kredyt ze starego banku
        delete oldBank.loanPortfolio[symbol];

        // Symulacja przepływu środków między bankami (nowy bank "spłaca" stary)
        oldBank.cash += transferredLoanAmount; // Stary bank odzyskuje środki
        newBank.cash -= transferredLoanAmount; // Nowy bank wydaje środki na przejęcie kredytu
        logEvent(` Kredyt spółki ${symbol} (${transferredLoanAmount.toFixed(0)} PLN) został przeniesiony do ${newBank.name}.`);
    }
    // --- 👆 KONIEC NOWEJ LOGIKI TRANSFERU 👆 ---

    // Aktualizacja przypisania banku i list klientów (bez zmian)
    if (oldBank) {
        const clientIndex = oldBank.corporateClients.indexOf(symbol);
        if (clientIndex > -1) oldBank.corporateClients.splice(clientIndex, 1);
    }
    stock.bankAccountId = newBankId;
    if (!newBank.corporateClients.includes(symbol)) {
        newBank.corporateClients.push(symbol);
    }

    logEvent(`🏦 Spółka ${stock.name} przenosi swój rachunek (saldo: ${cashToTransfer.toFixed(0)} PLN${transferredLoanAmount > 0 ? `, kredyt: ${transferredLoanAmount.toFixed(0)} PLN` : ''}) do banku ${newBank.name}.`, 'review');
    showToast(`Rachunek ${stock.name} przeniesiony do ${newBank.name}.`, 'success');

    // Odśwież widok panelu zarządzania (bez zmian)
    if (document.getElementById('management-modal')?.style.display === 'block' && document.getElementById('management-modal').dataset.currentSymbol === symbol) {
        openManagementModal(symbol);
    }
}

function aiTakeMortgageLoan(ai, bankId, collateralSymbol, collateralQuantity, requestedAmount) {
    const bank = commercialBanks.find(b => b.id === bankId && b.type === BANK_TYPES.MORTGAGE);
    const stock = stocks.find(s => s.symbol === collateralSymbol && !s.assetType);
    const holding = ai.portfolio[collateralSymbol];

    // Podstawowa walidacja
    if (!bank || !bank.isActive || !stock || !holding || holding.shares < collateralQuantity || requestedAmount <= 0) {
        console.warn(`[AI Hipoteka] Walidacja nie powiodła się dla ${ai.name} przy próbie wzięcia hipoteki.`);
        return false;
    }

    const creditScoreThreshold = 50;
    if (ai.creditScore < creditScoreThreshold) {
        console.log(`[AI Hipoteka] ${ai.name} ma zbyt niski wynik kredytowy (${ai.creditScore}), aby wziąć hipotekę.`);
        return false; // Zablokuj wzięcie hipoteki
    }

    const collateralValue = stock.price * collateralQuantity;
    const maxLoanAmount = collateralValue * 0.5; // Max 50% wartości zastawu

    // Kwota, którą AI faktycznie pożyczy (nie więcej niż limit i nie więcej niż bank może)
    const finalLoanAmount = Math.min(requestedAmount, maxLoanAmount, bank.cash * 0.1);

    if (finalLoanAmount <= 0) {
        console.log(`[AI Hipoteka] ${ai.name} nie mógł wziąć hipoteki (kwota ${finalLoanAmount} <= 0).`);
        return false;
    }

    // Parametry pożyczki (takie same jak dla gracza)
    const interestRate = bank.interestRateLoan * 1.1;
    const loanDurationWeeks = 52;
    const maturityDate = Date.now() + (loanDurationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    const weeklyRate = interestRate / 52;
    const weeklyPayment = finalLoanAmount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);

    // Transakcja
    ai.cash += finalLoanAmount; // AI otrzymuje gotówkę
    bank.cash -= finalLoanAmount; // Bank wypłaca
    // Dodaj pożyczkę do portfela banku
    if (!bank.loanPortfolio[ai.id]) bank.loanPortfolio[ai.id] = [];
    bank.loanPortfolio[ai.id].push({
        id: `mort_ai_${Date.now()}`,
        initialAmount: finalLoanAmount,
        remainingAmount: finalLoanAmount,
        interestRate: interestRate,
        collateral: { symbol: collateralSymbol, quantity: collateralQuantity }
    });

    // Zapisz pożyczkę u AI (potrzebujemy nowej struktury)
    if (!ai.loans) ai.loans = []; // Upewnij się, że tablica pożyczek istnieje
    ai.loans.push({
        id: `mort_ai_${Date.now()}`,
        bankId: bankId,
        bankName: bank.name,
        amount: finalLoanAmount, // Pozostała kwota
        weeklyPayment: weeklyPayment, // Rata
        maturityDate: maturityDate,
        collateral: { symbol: collateralSymbol, quantity: collateralQuantity }
    });

    // Zablokuj zastawione akcje w portfelu AI
    if (!holding.lockedShares) holding.lockedShares = 0;
    holding.lockedShares += collateralQuantity;

    console.log(`[AI Hipoteka] ${ai.name} wziął ${finalLoanAmount.toFixed(0)} PLN hipoteki w ${bank.name} pod zastaw ${collateralQuantity} ${collateralSymbol}.`);
    return true; // Sukces
}

/**
 * Generuje Prezesa Banku Centralnego z unikalnymi cechami.
 */
function generateCentralBankGovernor() {
    const isFemale = Math.random() < 0.3;
    const firstName = isFemale ? getRandomElement(femaleFirstNames) : getRandomElement(maleFirstNames);
    let lastName = getRandomElement(ceoLastNames);
    if (isFemale && lastName.endsWith('ski')) lastName = lastName.slice(0, -1) + 'a';
    else if (isFemale && lastName.endsWith('cki')) lastName = lastName.slice(0, -1) + 'a';

    const age = getRandomIntInRange(50, 70); // Prezesi BC są zwykle starsi
    const tenureQuarters = 0; // Kadencja liczona od teraz

    const governor = {
        name: `${firstName} ${lastName}`,
        age: age,
        tenure: tenureQuarters,
        traits: []
    };

    // Przypisz 1-2 cechy specyficzne dla BC
    const traitsPool = Object.values(centralBankGovernorTraits);
    const numTraits = Math.random() < 0.4 ? 2 : 1; // 40% szans na 2 cechy
    for (let i = 0; i < numTraits; i++) {
        let potentialTraits = traitsPool.filter(t => !governor.traits.some(assigned => assigned.name === t.name));
        if (potentialTraits.length === 0) break;
        // Prost Losowanie (bez rzadkości na razie dla uproszczenia)
        const chosenTrait = getRandomElement(potentialTraits);
        governor.traits.push({ name: chosenTrait.name, description: chosenTrait.description });
    }

    centralBank.ceo = governor;
    console.log(`[BC] Powołano nowego Prezesa Banku Centralnego: ${governor.name}`);
}

function fundStateOwnedCompanies() {
    const ceoTraits = centralBank.ceo.traits.map(t => t.name);
    let fundingChance = 0.1; // Bazowa szansa 10%

    if (ceoTraits.includes("Etatysta")) fundingChance += 0.2; // +20%
    if (ceoTraits.includes("Libertarianin")) fundingChance -= 0.08; // -8%

    if (Math.random() < fundingChance) {
        const stateOwnedCompanies = stocks.filter(s => s.isStateOwned && !s.isBankrupt && s.financialHealth < 1); // Celuj w te potrzebujące wsparcia
        if (stateOwnedCompanies.length === 0) return;

        const targetCompany = getRandomElement(stateOwnedCompanies);
        const fundingAmount = centralBank.funds * getRandomInRange(0.01, 0.03); // Finansowanie 1-3% funduszy BC

        if (centralBank.funds >= fundingAmount) {
            centralBank.funds -= fundingAmount;
            targetCompany.cash += fundingAmount; // Dodaj do gotówki spółki
            // Popraw bilans spółki
            if (targetCompany.balanceSheet) {
                targetCompany.balanceSheet.assets += fundingAmount;
                // Traktujemy to jako "dotację", zwiększa kapitał własny
                targetCompany.balanceSheet.retainedEarnings += fundingAmount;
            }
            targetCompany.financialHealth += 0.5; // Lekka poprawa kondycji
            if(targetCompany.financialHealth > 5) targetCompany.financialHealth = 5;

            logEvent(`🏛️ Bank Centralny zasila ${targetCompany.name} kwotą ${fundingAmount.toFixed(0)} PLN na rozwój!`, 'state');
        } else {
            console.log(`[BC Finansowanie] BC chciał wesprzeć ${targetCompany.name}, ale zabrakło środków.`);
        }
    }
}