// companies.js - Spółki, Banki, Startupy, M&A

let currentCollateralAuction = null; // { stockSymbol, quantity, minPrice, endTime, bids: [] }
let currentPawnOffer = null;
// Nowa globalna tablica na spółki miejskie (nienotowane na giełdzie)
let municipalCompanies = [];
let privateCompanies = [];
const MINIMUM_STARTUPS = 3; 
const TARGET_STARTUPS = 5;

// cechy prezesów
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
// generowanie startupów
const startupSectors = [['Technologia'], ['Gaming'], ['Medycyna'], ['Media'], ['Energia'], ['Żywność'], ['Nieruchomości'], ['Chemia'], ['Przemysł'], ['Dobra konsumencje'], ['Usługi'], ['Turystyka'], ['Bankowość'], ['Finanse Konsumenckie']];

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


//cechy prezesów banku
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
// --- Definicje banków ---
const BANK_TYPES = {
    INVESTMENT: 'Inwestycyjny',
    CORPORATE: 'Korporacyjny',
    UNIVERSAL: 'Uniwersalny',
    INTERNATIONAL: 'Międzynarodowy',
    COOPERATIVE: 'Spółdzielczy',
    INTERNET: 'Internetowy (e-bank)',
    MORTGAGE: 'Hipoteczny'
};

const ALL_COMMERCIAL_BANKS_DEFINITIONS = [
    // Inwestycyjne (3 + 1)
    { id: 'inv1', name: 'Bank Spryciarski', type: BANK_TYPES.INVESTMENT, initialCapital: 5000000, reserveRatio: 0.1, baseInterestRateMargin: 0.01 },
    { id: 'inv2', name: 'Galeria Bankowa', type: BANK_TYPES.INVESTMENT, initialCapital: 4500000, reserveRatio: 0.1, baseInterestRateMargin: 0.012 },
    { id: 'inv3', name: 'Bank Kolekcjonerski RPK', type: BANK_TYPES.INVESTMENT, initialCapital: 4000000, reserveRatio: 0.1, baseInterestRateMargin: 0.009 },
    // --> NOWY: Bank Hipotezy jako Inwestycyjny <--
    { id: 'bhi', name: 'Bank Hipotezy', type: BANK_TYPES.INVESTMENT, initialCapital: 8000000, reserveRatio: 0.11, baseInterestRateMargin: 0.011, isActiveFromStart: true }, // Kapitał szacowany

    // Korporacyjne (3)
    { id: 'corp1', name: 'Syriusz Corp.', type: BANK_TYPES.CORPORATE, initialCapital: 7000000, reserveRatio: 0.15, baseInterestRateMargin: 0.015 },
    { id: 'corp2', name: 'Krupiewicz Group S.a', type: BANK_TYPES.CORPORATE, initialCapital: 6500000, reserveRatio: 0.16, baseInterestRateMargin: 0.016 },
    { id: 'corp3', name: 'Biuro Pokrytego Investment Group', type: BANK_TYPES.CORPORATE, initialCapital: 6000000, reserveRatio: 0.14, baseInterestRateMargin: 0.014 },

    // Uniwersalny (2)
    { id: 'uni1', name: 'Bank Powszechny', type: BANK_TYPES.UNIVERSAL, initialCapital: 10000000, reserveRatio: 0.12, baseInterestRateMargin: 0.02 },
    { id: 'bpn', name: 'BPN BK', type: BANK_TYPES.UNIVERSAL, initialCapital: 6000000, reserveRatio: 0.13, baseInterestRateMargin: 0.021, isActiveFromStart: true }, // Kapitał szacowany

    // Międzynarodowy (2)
    { id: 'int1', name: 'Gildia Handlowa', type: BANK_TYPES.INTERNATIONAL, initialCapital: 15000000, reserveRatio: 0.1, baseInterestRateMargin: 0.018 },
    { id: 'bks', name: 'Bank Klasy Światowej', type: BANK_TYPES.INTERNATIONAL, initialCapital: 20000000, reserveRatio: 0.09, baseInterestRateMargin: 0.017, isActiveFromStart: true }, // Kapitał szacowany

    // Spółdzielczy (1)
    { id: 'coop1', name: 'Wiejski Bank Spółdzielczy', type: BANK_TYPES.COOPERATIVE, initialCapital: 2000000, reserveRatio: 0.18, baseInterestRateMargin: 0.025 },

    // Internetowy (1)
    { id: 'net1', name: 'EmBank', type: BANK_TYPES.INTERNET, initialCapital: 3000000, reserveRatio: 0.08, baseInterestRateMargin: 0.017 },

    // Hipoteczny (1)
    { id: 'mort1', name: 'Super Bank Hipoteczny', type: BANK_TYPES.MORTGAGE, initialCapital: 5000000, reserveRatio: 0.13, baseInterestRateMargin: 0.022 },
];

let commercialBanks = []; // Zainicjowane banki

const exchanges = {
    'JUNK': { name: 'Giełda Śmieciowa 🗑️', level: 0, color: '#6c757d', minPrice: 0, maxPrice: 20, licenseCost: 0 },
    'BRONZE': { name: 'Rynek Brązowy 🥉', level: 1, color: '#cd7f32', minPrice: 20, maxPrice: 75, licenseCost: 20000 },
    'SILVER': { name: 'Giełda Srebrna 🥈', level: 2, color: '#c0c0c0', minPrice: 75, maxPrice: 400, licenseCost: 125000 },
    'GOLD': { name: 'Giełda Złota 🥇', level: 3, color: '#ffd700', minPrice: 400, maxPrice: 1500, licenseCost: 250000 },
    'PLATINUM': { name: 'Giełda Platynowa 💎', level: 4, color: '#e5e4e2', minPrice: 1500, maxPrice: Infinity, licenseCost: 500000 }
};

const CORPORATE_PHASES = {
    GROWTH: 'Wzrost',
    STABILITY: 'Stabilność',
    DECLINE: 'Spadek',
    REORGANIZATION: 'Reorganizacja',
    GOLDEN_YEAR: 'Złoty Rok ✨', // Faza unikalna
    SHADOW_DESCENT: 'Zejście w Cień 👻', // Faza unikalna
    INNOVATION_PUSH: 'Impuls Innowacji 💡' // Faza unikalna
};

// --- Pula Spółek ---
const initialStocks = [
    // GIEŁDA ŚMIECIOWA (Poziom 0)
    {
    name: 'EcoLube', price: 5.00, volatilityFactor: 2.1, symbol: 'ECL', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
 lineHistory: [], playerTransactions: [], sector: ['Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Elektrownia SA', price: 15.00, volatilityFactor: 0.5, symbol: 'ESA', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Energia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Konfiturex', price: 2.00, volatilityFactor: 4.5, symbol: 'KFX', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Wieczne Ziemniaki Sp. z o.o.', price: 1.50, volatilityFactor: 3.5, symbol: 'WZM', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Six Hand', price: 0.80, volatilityFactor: 4.0, symbol: 'SIX', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Dobra konsumpcyjne'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Pikselowe Marzenia', price: 7.50, volatilityFactor: 3.8, symbol: 'PIX', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Błyskawiczna Proteza', price: 12.00, volatilityFactor: 3.2, symbol: 'BLP', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Super Makarony', price: 18.00, volatilityFactor: 0.6, symbol: 'SUM', exchange: 'JUNK', totalShares: 1000, maxShares: 1000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
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
    name: 'Kopalnie Węgla Mine', price: 35.00, volatilityFactor: 1.6, symbol: 'KWM', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'BPN BK',
        price: 45.00, // Pozostawiamy cenę startową
        volatilityFactor: 0.6,
        symbol: 'BPN',
        exchange: 'BRONZE', // Pozostawiamy giełdę
        totalShares: 10000, maxShares: 10000, // Pozostawiamy akcje
        sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [],
        balanceSheet: { assets: 6000000, liabilities: 0, shareCapital: 600000, retainedEarnings: 5400000 }, // Ustawiamy bilans banku
        quarterlyEarnings: 0, lineHistory: [], playerTransactions: [],
        sector: ['Bankowość Komercyjna', 'Bankowość'], // Zmieniamy sektor
        financialHealth: 2, // Domyślna kondycja
        lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0,
        dividendPolicy: 'Balanced', // Domyślna polityka
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 45 * 10000, estimatedDividend: 0,
        bankAccountId: null, // Banki nie mają kont
        cash: 6000000, // Gotówka banku = kapitał
        isBankStock: true, // --> Dodana flaga <--
        bankData: { id: 'bpn', type: BANK_TYPES.UNIVERSAL } // --> Dodane dane banku <--
    },
    {
    name: 'KolenBreg', price: 19.00, volatilityFactor: 1.5, symbol: 'KOB', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Wolf & Stein Tech.', price: 19.00, volatilityFactor: 2.2, symbol: 'WiS', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'WinPost', price: 20.00, volatilityFactor: 2.8, symbol: 'WIP', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia', 'Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Knor-FIX', price: 24.00, volatilityFactor: 1.0, symbol: 'FIX', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Czysty Błysk', price: 30.00, volatilityFactor: 0.7, symbol: 'CZB', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Dunder Mifflin Paper Company, Inc.', price: 22.00, volatilityFactor: 1.1, symbol: 'DMPC', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Drużyna Holding', price: 22.00, volatilityFactor: 1.1, symbol: 'DRH', exchange: 'BRONZE', totalShares: 8000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Bałtyckie Rejsy', price: 45.00, volatilityFactor: 1.6, symbol: 'BAL', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Turystyka'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Boazeria Organiczna', price: 48.00, volatilityFactor: 1.2, symbol: 'BOO', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'DarAwansu', price: 47.00, volatilityFactor: 3.0, symbol: 'DAW', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
    name: 'Lek-Pol', price: 60.00, volatilityFactor: 1.1, symbol: 'LEK', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'BurgerLand', price: 58.00, volatilityFactor: 1.4, symbol: 'BUL', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Beretxol', price: 68.00, volatilityFactor: 1.1, symbol: 'BER', exchange: 'BRONZE', totalShares: 10000, maxShares: 10000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },

    // GIEŁDA SREBRNA (Poziom 2) - Limit: 50,000
    {
        name: 'Bank Żywności', price: 76.00, volatilityFactor: 1.8, symbol: 'BAZ', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Bankowość', 'Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Firma Tłusta Pucha', price: 80.00, volatilityFactor: 1.6, symbol: 'FTP', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność', 'Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Luksusowe Spinacze', price: 88.00, volatilityFactor: 0.8, symbol: 'LUS', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Dobra konsumpcyjne'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Krajoznawsto Obce', price: 78.00, volatilityFactor: 2.5, symbol: 'KRO', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Turystyka'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Plandex', price: 99.00, volatilityFactor: 1.3, symbol: 'PLX', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
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
        name: 'Linapol', price: 114.00, volatilityFactor: 0.9, symbol: 'LIN', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Betonex', price: 120.00, volatilityFactor: 1.0, symbol: 'BTX', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł', 'Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'VitaGen', price: 180.00, volatilityFactor: 2.2, symbol: 'VTG', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna', 'Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Cyber-Ochrona', price: 210.00, volatilityFactor: 1.9, symbol: 'CRO', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi', 'Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Annesco', price: 298.00, volatilityFactor: 1.2, symbol: 'ANN', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Meferox', price: 292.00, volatilityFactor: 1.7, symbol: 'MEF', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
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
        name: 'Bank Hipotezy',
        price: 330.00, // Pozostawiamy cenę startową
        volatilityFactor: 0.8,
        symbol: 'BHI',
        exchange: 'SILVER', // Pozostawiamy giełdę
        totalShares: 50000, maxShares: 50000, // Pozostawiamy akcje
        sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [],
        balanceSheet: { assets: 8000000, liabilities: 0, shareCapital: 800000, retainedEarnings: 7200000 }, // Ustawiamy bilans banku
        quarterlyEarnings: 0, lineHistory: [], playerTransactions: [],
        sector: ['Bankowość Komercyjna', 'Finanse'], // Zmieniamy sektor
        financialHealth: 2, // Domyślna kondycja
        lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0,
        dividendPolicy: 'Balanced', // Domyślna polityka
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 330 * 50000, estimatedDividend: 0,
        bankAccountId: null, // Banki nie mają kont
        cash: 8000000, // Gotówka banku = kapitał
        isBankStock: true, // --> Dodana flaga <--
        bankData: { id: 'bhi', type: BANK_TYPES.INVESTMENT } // --> Dodane dane banku <--
    },
    {
        name: 'Siarkobrzeg', price: 337.00, volatilityFactor: 1.4, symbol: 'SIK', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'BlueBull', price: 150.00, volatilityFactor: 1.2, symbol: 'BLB', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Żywność'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Cyberfood Corp', price: 250.00, volatilityFactor: 1.8, symbol: 'CYF', exchange: 'SILVER', totalShares: 50000, maxShares: 50000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
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
        name: 'WielkiWoltaż', price: 410.00, volatilityFactor: 0.9, symbol: 'WIW', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Energia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Krawaciarze Inc.', price: 485.00, volatilityFactor: 0.7, symbol: 'KRA', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Przemysł', 'Usługi'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Sanitas Szpitale', price: 550.00, volatilityFactor: 0.6, symbol: 'SAN', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Medycyna'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Stocznia Morska', price: 777.00, volatilityFactor: 1.3, symbol: 'STM', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
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
        name: 'SuperKonsumpcja!', price: 950.00, volatilityFactor: 1.1, symbol: 'SKP', exchange: 'GOLD', totalShares: 100000, maxShares: 100000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Dobra konsumpcyjne'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Bank Klasy Światowej',
        price: 1000.00, // Pozostawiamy cenę startową
        volatilityFactor: 0.3,
        symbol: 'BKS',
        exchange: 'GOLD', // Pozostawiamy giełdę
        totalShares: 100000, maxShares: 100000, // Pozostawiamy akcje
        sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [],
        balanceSheet: { assets: 20000000, liabilities: 0, shareCapital: 2000000, retainedEarnings: 18000000 }, // Ustawiamy bilans banku
        quarterlyEarnings: 0, lineHistory: [], playerTransactions: [],
        sector: ['Bankowość Komercyjna', 'Finanse', 'Międzynarodowy'], // Zmieniamy sektor
        financialHealth: 3, // Domyślna kondycja (lepsza)
        lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0,
        dividendPolicy: 'Balanced', // Domyślna polityka
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 1000 * 100000, estimatedDividend: 0,
        bankAccountId: null, // Banki nie mają kont
        cash: 20000000, // Gotówka banku = kapitał
        isBankStock: true, // --> Dodana flaga <--
        bankData: { id: 'bks', type: BANK_TYPES.INTERNATIONAL } // --> Dodane dane banku <--
    },

    // GIEŁDA PLATYNOWA (Poziom 4)
    {
        name: 'Universal Projects', price: 1525.00, volatilityFactor: 1.5, symbol: 'UNP', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Cortex Neural', price: 1850.00, volatilityFactor: 2.4, symbol: 'CTX', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Technologia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'KrzeUraFos4', price: 2300.00, volatilityFactor: 2.9, symbol: 'KUP', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Chemia'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    {
        name: 'Biurowce Obsługi Rachunkowej', price: 3000.00, volatilityFactor: 0.6, symbol: 'BOR', exchange: 'PLATINUM', totalShares: 1000000, maxShares: 1000000, sharesHeld: 0, activePositiveBoostUntil: null, priceHistory: [], 
    quarterlyEarnings: 0, // Zysk za ostatni kwartał (dla wskaźnika C/Z) 
  lineHistory: [], playerTransactions: [], sector: ['Usługi', 'Nieruchomości'], financialHealth: 0, lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0, stateOwnershipPct: 0, dividendPolicy: 'None',
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: 0, estimatedDividend: 0, bankAccountId: null, // <-- DODAJ TO
    cash: 0 
    },
    // --- NOWE SPÓŁKI: FINANSE KONSUMENCKIE ---
    {
        name: 'WRONA',
        price: 650.00, volatilityFactor: 1.8, symbol: 'WRN', exchange: 'GOLD',
        totalShares: 90000, maxShares: 100000, sharesHeld: 0,
        sector: ['Finanse Konsumenckie', 'Usługi'],
        financialHealth: 2, lastReport: 'brak', cash: 5000000, // Potrzebuje dużo gotówki na start
        assetType: 'DebtCollector', // Unikalny typ dla logiki
        balanceSheet: { assets: 5000000, liabilities: 0, shareCapital: 50000, retainedEarnings: 450000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Growth', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false
    },
    {
        name: 'LOMBARDEX S.A.',
        price: 65.00, volatilityFactor: 1.5, symbol: 'LOM', exchange: 'SILVER',
        totalShares: 35000, maxShares: 45000, sharesHeld: 0,
        sector: ['Finanse Konsumenckie', 'Usługi'],
        financialHealth: 1, lastReport: 'brak', cash: 400000, // Też potrzebuje gotówki na pożyczki
        assetType: 'PawnShop', // Unikalny typ dla logiki
        balanceSheet: { assets: 400000, liabilities: 0, shareCapital: 40000, retainedEarnings: 360000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Balanced', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false
    },
    {
        name: 'Retax Biuro Obrachunkowe',
        price: 40.00, volatilityFactor: 0.8, symbol: 'TAX', exchange: 'BRONZE',
        totalShares: 20000, maxShares: 30000, sharesHeld: 0,
        sector: ['Finanse Konsumenckie', 'Usługi'],
        financialHealth: 3, lastReport: 'brak', cash: 50000, // Stabilny biznes, nie wymaga dużo gotówki
        assetType: 'Accounting', // Unikalny typ dla logiki
        balanceSheet: { assets: 50000, liabilities: 0, shareCapital: 5000, retainedEarnings: 45000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Balanced', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false
    },
    // --- NOWE SPÓŁKI SKARBU PAŃSTWA ---

    {
        name: 'Puls Rynku S.A.',
        price: 110.00, volatilityFactor: 1.1, symbol: 'PULS', exchange: 'SILVER',
        totalShares: 30000, maxShares: 40000, sharesHeld: 0,
        sector: ['Media', 'Usługi'],
        financialHealth: 2, lastReport: 'brak', cash: 300000,
        assetType: 'Holding', // Traktujemy je jak Holdingi, aby mogły kupować akcje innych
        specializationSectors: ['Media'], // Flaga identyfikująca
        holdingPortfolio: {},
        balanceSheet: { assets: 300000, liabilities: 0, shareCapital: 30000, retainedEarnings: 270000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Balanced', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false,
        // Dane specyficzne dla mediów
        newspaperData: { 
            layout: 'layout1', // Inny wygląd (na przyszłość)
            eventLog: [], // Własny log zdarzeń
            adRevenuePerClick: 15.0 // Zysk za otwarcie gazety z reklamą
        },
        stance: 'neutral', // ('neutral', 'pro-player', 'anti-player')
        favors: {} // Obiekt firm, które kupiły przychylność (np. {'PLY': true})
    },
    {
        name: 'Flesz Giełdowy',
        price: 95.00, volatilityFactor: 1.3, symbol: 'FLESZ', exchange: 'SILVER',
        totalShares: 25000, maxShares: 35000, sharesHeld: 0,
        sector: ['Media', 'Usługi'],
        financialHealth: 1, lastReport: 'brak', cash: 200000,
        assetType: 'Holding', 
        specializationSectors: ['Media'],
        holdingPortfolio: {},
        balanceSheet: { assets: 200000, liabilities: 0, shareCapital: 20000, retainedEarnings: 180000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Growth', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false,
        newspaperData: { 
            layout: 'layout2',
            eventLog: [], 
            adRevenuePerClick: 10.0
        },
        stance: 'neutral',
        favors: {}
    },
    {
        name: 'Obserwator Finansowy',
        price: 120.00, volatilityFactor: 0.9, symbol: 'OBSER', exchange: 'SILVER',
        totalShares: 30000, maxShares: 40000, sharesHeld: 0,
        sector: ['Media', 'Usługi'],
        financialHealth: 3, lastReport: 'brak', cash: 400000,
        assetType: 'Holding', 
        specializationSectors: ['Media'],
        holdingPortfolio: {},
        balanceSheet: { assets: 400000, liabilities: 0, shareCapital: 40000, retainedEarnings: 360000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        dividendPolicy: 'Balanced', dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000), estimatedDividend: 0,
        bankAccountId: null, isBankStock: false,
        newspaperData: { 
            layout: 'layout3',
            eventLog: [], 
            adRevenuePerClick: 12.0
        },
        stance: 'neutral',
        favors: {}
    },
    
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
    {
        name: 'Fundacja Przedsiębiorczości Miejskiej',
        price: 100.00, // Cena startowa
        volatilityFactor: 0.1, // Bardzo stabilna
        symbol: 'FPM',
        exchange: 'SILVER',
        totalShares: 100000, maxShares: 100000, sharesHeld: 100000, // 100% akcji "zajętych"
        sector: ['Finanse'],
        financialHealth: 5, lastReport: 'brak', cash: 2000000,
        assetType: 'Holding', // Działa jak Holding
        holdingPortfolio: {},
        specializationSectors: ['Finanse Konsumenckie'], // Specjalizacja (na razie pusta)
        balanceSheet: { assets: 2000000, liabilities: 0, shareCapital: 200000, retainedEarnings: 1800000 },
        quarterlyEarnings: 0, priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        
        isStateOwned: true,           // Traktujemy ją jako "państwową" dla mechaniki
        stateOwnershipPct: 1.0,       // Miasto posiada 100%
        canBeTraded: false,           // ===>>> GRACZ NIE MOŻE JEJ KUPIĆ/SPRZEDAĆ <<<===
        cannotGoBankrupt: true,       // Nie może zbankrutować
        
        dividendPolicy: 'None', dividendTimer: 999999999, estimatedDividend: 0,
        bankAccountId: null, isBankStock: false
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


let stocks = JSON.parse(JSON.stringify(initialStocks)); // Główna tablica spółek w grze

// --- ETFy ---
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

// --- Funkcje Zarządzania Spółkami ---

function initializeCommercialBanks() {
    commercialBanks = ALL_COMMERCIAL_BANKS_DEFINITIONS.map(def => ({
        ...def,
        cash: def.initialCapital,
        reservesBC: 0,
        loanPortfolio: {},
        depositPortfolio: {},
        stockPortfolio: {},
        corporateClients: [],
        interestRateDeposit: 0,
        interestRateLoan: 0,

        isActive: def.isActiveFromStart || false, // <--- Dodaj lub zmodyfikuj tę linię
        startupInvestments: {} // Dodajmy pole na inwestycje startupowe
    }));

}

function createBankStockObject(bank, exchangeLevel = 'SILVER') {
    if (!bank || !bank.isActive) return null;

    // Uproszczone obliczenie parametrów IPO na podstawie kapitału początkowego
    const ipoValuation = bank.initialCapital * getRandomInRange(1.05, 1.3); // Wycena 5-30% wyższa niż kapitał
    const ipoSharePrice = getRandomInRange(75, 150); // Cena akcji w typowym zakresie dla SILVER
    const ipoTotalShares = Math.floor(ipoValuation / ipoSharePrice);

    if (ipoTotalShares <= 0) {
        console.error(`[Bank IPO Init] Obliczona liczba akcji (${ipoTotalShares}) jest nieprawidłowa dla ${bank.name}.`);
        return null;
    }

    const symbol = `BK${bank.id.toUpperCase()}`; // Generowanie symbolu, np. BKINV1

    const newBankStock = {
        name: bank.name,
        symbol: symbol,
        price: ipoSharePrice,
        volatilityFactor: getRandomInRange(0.4, 1.2), // Banki są raczej stabilne
        exchange: exchangeLevel, // Debiut na określonej giełdzie
        totalShares: ipoTotalShares,
        maxShares: ipoTotalShares * 2, // Możliwość przyszłych emisji
        sharesHeld: 0, // Na starcie nikt nie ma akcji
        sector: ['Bankowość Komercyjna', 'Finanse'], // Sektory
        financialHealth: getRandomIntInRange(1, 3), // Startują ze zdrową kondycją
        balanceSheet: { // Uproszczony bilans na start
            assets: bank.cash,
            liabilities: bank.cash - bank.initialCapital, // Różnica jako zobowiązania (uproszczenie)
            shareCapital: bank.initialCapital * 0.1, // Kapitał zakładowy
            retainedEarnings: bank.initialCapital * 0.9 // Zyski zatrzymane
        },
        quarterlyEarnings: 0,
        bankAccountId: null, // Banki nie mają konta w innym banku
        cash: bank.cash, // Gotówka banku
        descriptionParts: null, // Zostaną wygenerowane
        ceo: null, // Zostanie wygenerowany
        isBankStock: true, // Flaga oznaczająca akcje banku
        bankData: { id: bank.id, type: bank.type }, // Dane powiązane z obiektem banku
        // --- Dodaj standardowe pola, których może brakować ---
        priceHistory: [],
        candlestickHistory: [],
        lineHistory: [],
        currentCandle: null,
        playerTransactions: [],
        priceAlerts: { buy: null, sell: null },
        dividendPolicy: 'Balanced', // Domyślna polityka dywidendy dla banków
        dividendTimer: getRandomIntInRange(8 * 60 * 1000, 15 * 60 * 1000),
        lastQuarterValue: ipoValuation,
        estimatedDividend: 0,
        isTradeLocked: false,
        dividendCooldownUntil: 0,
        stateOwnershipPct: 0,
        isStateOwned: false,
        lastReport: 'brak',
        research: null, // Banki używają systemu inwestycji, nie R&D
        researchUnlocks: null
    };

    // Wygeneruj opis i CEO
    initializeDescriptionParts(newBankStock);
    generateCEO(newBankStock);
    console.log(`[createBankStockObject] Utworzono obiekt akcji dla banku ${bank.name}:`, newBankStock);
    return newBankStock;
}

function initializeBalanceSheetForStock(stock) {


    // Pomiń start-upy, REIT-y i inne specjalne typy
    if (stock.assetType || stock.isBankStock) { // Dodano isBankStock
        console.log(`[INIT_BALANCE] Pomijanie inicjalizacji dla ${stock.symbol} (Typ: ${stock.assetType || 'Bank'})`);
        stock.balanceSheet = { assets: 0, liabilities: 0, shareCapital: 0, retainedEarnings: 0 };
        stock.quarterlyEarnings = 0;
        stock.cash = 0; // Inicjalizuj gotówkę na 0 dla typów specjalnych
        return;
    }

    console.log(`[INIT_BALANCE] Inicjalizacja bilansu/fazy dla ZWYKŁEJ spółki: ${stock.symbol}`);

    const marketCap = stock.price * stock.totalShares;
    const assets = marketCap * getRandomInRange(0.9, 1.5);
    const liabilitiesRatio = getRandomInRange(0.1, 0.6) - (stock.financialHealth * 0.05);
    const liabilities = assets * Math.max(0.05, liabilitiesRatio);
    const equity = assets - liabilities;
    const shareCapital = equity * getRandomInRange(0.1, 0.2);
    const retainedEarnings = equity - shareCapital;

    stock.balanceSheet = {
        assets: assets,
        liabilities: liabilities,
        shareCapital: shareCapital,
        retainedEarnings: retainedEarnings
    };
    stock.quarterlyEarnings = 0;

    // ---> INICJALIZACJA GOTÓWKI <---
    // Ustawmy początkową gotówkę jako mały procent aktywów
    stock.cash = assets * getRandomInRange(0.01, 0.05);

    const exchangeLevel = exchanges[stock.exchange]?.level ?? 0; // Użyj ?? 0 dla bezpieczeństwa
    stock.companyAge = getRandomIntInRange(1, 5) + exchangeLevel * 8; // Starsze firmy na wyższych giełdach

    // Faza startowa - zależna od wieku i kondycji
    if (stock.companyAge < 12 && stock.financialHealth >= 1) {
        stock.corporatePhase = CORPORATE_PHASES.GROWTH;
    } else if (stock.financialHealth <= -2) {
        stock.corporatePhase = CORPORATE_PHASES.DECLINE;
    } else {
        stock.corporatePhase = CORPORATE_PHASES.STABILITY;
    }
    stock.phaseTimer = 0; // Licznik dla faz tymczasowych (np. Złoty Rok)
    console.log(`[INIT_BALANCE] ${stock.symbol} - Wiek: ${stock.companyAge}, Faza: ${stock.corporatePhase}, Bilans zainicjalizowany.`);
    // Jeśli firma ma przypisany bank, upewnij się, że bank też "ma" tę gotówkę
    if (stock.bankAccountId) {
        const bank = commercialBanks.find(b => b.id === stock.bankAccountId);
        if (bank) {
            bank.cash += stock.cash; // Dodaj gotówkę firmy do zasobów banku
        }
    }
    // ---> KONIEC INICJALIZACJI GOTÓWKI <---
}


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

function processFinancialReports() {
    console.log("[RAPORTY KWARTALNE] Rozpoczęto przetwarzanie raportów finansowych...");

    // Zliczanie technologii (bez zmian)
    let totalUnlockedTechs = 0;
    stocks.forEach(s => {
        if (s.research && s.research.unlockedTechs) {
            totalUnlockedTechs += s.research.unlockedTechs.length;
        }
    });

    for (let i = stocks.length - 1; i >= 0; i--) {
        const stock = stocks[i];

        if (stock.assetType === 'Startup' || stock.isBankrupt) continue;

        let quarterlyEarnings = 0;
        const marketCap = stock.price * stock.totalShares;

        // ===>>> ZMIANA 1: Obliczanie dochodu bazowego <<<===
        let baseQuarterlyIncome = 0;
        const exchangeLevel = stock.exchange;
        // Dochód bazowy tylko dla standardowych spółek (nie Holdingów, REITów, Banków itp.)
        if (EXCHANGE_BASE_EARNINGS[exchangeLevel] && !stock.assetType && !stock.isBankStock && !stock.isStateOwned) {
            const earningsRange = EXCHANGE_BASE_EARNINGS[exchangeLevel];
            baseQuarterlyIncome = getRandomInRange(earningsRange.min, earningsRange.max);
        }
        // ===>>> KONIEC ZMIANY 1 <<<===


        if (!stock.balanceSheet) {
             console.warn(`[REPORTS] ${stock.symbol} nie miał bilansu. Inicjalizuję pusty.`);
             stock.balanceSheet = { assets: 0, liabilities: 0, shareCapital: 0, retainedEarnings: 0 };
        }
        
        // --- Logika obliczania Zysku/Straty (główna) ---
        if (stock.assetType === 'REIT') {
            // 🏡 REITy
            const assetBase = stock.balanceSheet.assets > 0 ? stock.balanceSheet.assets : marketCap * 0.8;
            if (stock.balanceSheet.assets === 0) stock.balanceSheet.assets = assetBase;
            const rentalIncome = assetBase * 0.02; // 2%
            const maintenanceCosts = assetBase * 0.005; // 0.5%
            quarterlyEarnings = (rentalIncome - maintenanceCosts) * (1 + (stock.financialHealth / 50));

        } else if (stock.assetType === 'Holding') {
            // 🏢 Holdingi
            const portfolioValue = Object.values(stock.holdingPortfolio).reduce((sum, holding) => {
                const ownedStock = stocks.find(s => s.symbol === Object.keys(stock.holdingPortfolio).find(key => stock.holdingPortfolio[key] === holding));
                return sum + (ownedStock ? ownedStock.price * holding.quantity : 0);
            }, 0);
            const managementFee = (stock.cash + portfolioValue) * 0.0025;
            const portfolioPerformance = portfolioValue * ((stock.financialHealth * 0.005) + getRandomInRange(-0.02, 0.02));
            quarterlyEarnings = managementFee + portfolioPerformance;

        } else if (stock.assetType === 'ResearchInstitute') {
            // 🧪 Instytuty
            const earningsPerTech = 5000;
            quarterlyEarnings = totalUnlockedTechs * earningsPerTech * getRandomInRange(0.9, 1.1);
        
        // ===>>> NOWA LOGIKA DLA FINANSÓW KONSUMENCKICH <<<===
        } else if (stock.assetType === 'DebtCollector') {
            // WRONA zarabia na odsetkach od przejętych długów
            let totalInterestCollected = 0;
            // Sprawdź długi gracza
            playerCommercialLoans.forEach(loan => {
                if (loan.collectorSymbol === stock.symbol) {
                    const weeklyInterest = loan.amount * (loan.interestRate / 52);
                    totalInterestCollected += weeklyInterest * 12; // 12 tygodni w kwartale
                }
            });
            // Sprawdź długi AI
            aiCompetitors.forEach(ai => {
                if (ai.loans) {
                    ai.loans.forEach(loan => {
                        if (loan.collectorSymbol === stock.symbol) {
                            const weeklyInterest = loan.amount * (loan.interestRate / 52);
                            totalInterestCollected += weeklyInterest * 12;
                        }
                    });
                }
            });
            quarterlyEarnings = totalInterestCollected * (1 + (stock.financialHealth / 10)); // Modyfikator kondycji
        

        } else if (stock.isBankStock) {
            // 🏦 Banki Komercyjne
            const loanIncome = stock.balanceSheet.assets * 0.01; 
            const depositCosts = stock.balanceSheet.liabilities * 0.005; 
            quarterlyEarnings = (loanIncome - depositCosts) * (1 + (stock.financialHealth / 10));

        } else if (stock.isStateOwned) {
            // 🏛️ Spółki państwowe
            const baseEarnings = marketCap * ((stock.financialHealth * 0.01) + getRandomInRange(-0.015, 0.015));
            if (baseEarnings < 0) {
                const subsidy = Math.abs(baseEarnings) * 0.70;
                quarterlyEarnings = baseEarnings + subsidy;
            } else {
                const specialTax = baseEarnings * 0.40;
                quarterlyEarnings = baseEarnings - specialTax;
            }

        } else if (!stock.assetType) {
            // 🏭 Standardowe spółki
            const earningsBase = (stock.financialHealth * 0.01) + (getRandomInRange(-0.015, 0.015));
            // ===>>> ZMIANA 2: Dodanie dochodu bazowego do zysku <<<===
            quarterlyEarnings = (marketCap * earningsBase) + baseQuarterlyIncome;
            // ===>>> KONIEC ZMIANY 2 <<<===
        }
        else if (stock.assetType === 'DebtCollector') {
            // WRONA zarabia na odsetkach od przejętych długów
            let totalInterestCollected = 0;
            // Sprawdź długi gracza
            playerCommercialLoans.forEach(loan => {
                if (loan.collectorSymbol === stock.symbol) {
                    const weeklyInterest = loan.amount * (loan.interestRate / 52);
                    totalInterestCollected += weeklyInterest * 12; // 12 tygodni w kwartale
                }
            });
            // Sprawdź długi AI
            aiCompetitors.forEach(ai => {
                if (ai.loans) {
                    ai.loans.forEach(loan => {
                        if (loan.collectorSymbol === stock.symbol) {
                            const weeklyInterest = loan.amount * (loan.interestRate / 52);
                            totalInterestCollected += weeklyInterest * 12;
                        }
                    });
                }
            });
            quarterlyEarnings = totalInterestCollected * (1 + (stock.financialHealth / 10)); // Modyfikator kondycji
        } else if (stock.assetType === 'PawnShop') {
            // LOMBARDEX (Na razie mały bazowy zysk + zysk ze sprzedaży)
            let profitFromSales = 0;
            if (stock.holdingPortfolio) {
                for (const symbol in stock.holdingPortfolio) {
                    if (Math.random() < 0.5) { // 50% szans na sprzedaż w tym kwartale
                        const holding = stock.holdingPortfolio[symbol];
                        const targetStock = stocks.find(s => s.symbol === symbol);
                        if (targetStock) {
                            const proceeds = targetStock.price * holding.quantity;
                            const costBasis = holding.purchasePrice * holding.quantity;
                            profitFromSales += (proceeds - costBasis);
                            
                            stock.cash += proceeds; 
                            targetStock.sharesHeld -= holding.quantity; 
                            delete stock.holdingPortfolio[symbol]; 
                            
                            logEvent(`[LOMBARDEX] ${stock.name} sprzedał ${holding.quantity} akcji ${symbol} (zysk: ${profitFromSales.toFixed(0)} PLN).`, 'company');
                        }
                    }
                }
            }
            quarterlyEarnings = profitFromSales + baseQuarterlyIncome + 5000; // Zysk ze sprzedaży + Baza + Stały bonus
        }
        else if (stock.assetType === 'Accounting') {
            // Zysk z prowizji (stock.quarterlyEarnings) był już zbierany co tydzień w chargeAccountingFee()
            // Dodajemy do niego tylko bazowy dochód
            quarterlyEarnings = stock.quarterlyEarnings + baseQuarterlyIncome;
            
            // WAŻNE: Resetujemy licznik zysków na następny kwartał
            stock.quarterlyEarnings = 0; 
        }
        
        // Zapisz całkowity zysk/stratę
        stock.quarterlyEarnings = quarterlyEarnings;

        // ===>>> ZMIANA 3: Dodanie zysku do stock.cash i kasy banku <<<===
        stock.cash += quarterlyEarnings; // Zysk/strata jest dodawana do gotówki firmy
        // Zaktualizuj również stan konta w banku komercyjnym
        if (stock.bankAccountId) {
            const bank = commercialBanks.find(b => b.id === stock.bankAccountId);
            if (bank) {
                bank.cash += quarterlyEarnings; // Bank odzwierciedla zmianę salda firmy
            }
        }
        // ===>>> KONIEC ZMIANY 3 <<<===

        // ===>>> ZMIANA 4: Transfer 50% zysków od spółek zależnych <<<===
        let earningsToTransfer = 0;
        if (stock.isSubsidiaryOf && quarterlyEarnings > 0) {
            const parentStock = stocks.find(s => s.symbol === stock.isSubsidiaryOf);
            if (parentStock) {
                earningsToTransfer = quarterlyEarnings * 0.5; // 50% zysków
                
                // 1. Odejmij gotówkę ze spółki zależnej (dziecka)
                stock.cash -= earningsToTransfer; 
                const childBank = commercialBanks.find(b => b.id === stock.bankAccountId);
                if (childBank) childBank.cash -= earningsToTransfer;

                // 2. Dodaj gotówkę do spółki-matki
                parentStock.cash += earningsToTransfer;
                const parentBank = commercialBanks.find(b => b.id === parentStock.bankAccountId);
                if (parentBank) parentBank.cash += earningsToTransfer;

                // 3. Zaloguj transfer
                logEvent(`💸 Spółka zależna ${stock.name} transferuje 50% zysków (${earningsToTransfer.toFixed(0)} PLN) do ${parentStock.name}.`, 'company');
            }
        }
        // ===>>> KONIEC ZMIANY 4 <<<===


        // --- Aktualizacja bilansu ---
        // Całkowity zysk/strata (quarterlyEarnings) wpływa na aktywa i kapitał
        stock.balanceSheet.assets += quarterlyEarnings; 
        stock.balanceSheet.retainedEarnings += quarterlyEarnings; 

        // Jeśli nastąpił transfer do spółki-matki, musimy skorygować bilanse obu firm
        if (earningsToTransfer > 0) {
             const parentStock = stocks.find(s => s.symbol === stock.isSubsidiaryOf);
             if (parentStock && parentStock.balanceSheet) {
                 // Transfer gotówki to transfer aktywów
                 // Aktywa rodzica rosną (bo dostał gotówkę)
                 parentStock.balanceSheet.assets += earningsToTransfer;
                 // To jest przychód dla rodzica, więc zwiększa jego zyski zatrzymane
                 parentStock.balanceSheet.retainedEarnings += earningsToTransfer;

                 // Aktywa dziecka spadają (bo straciło gotówkę)
                 stock.balanceSheet.assets -= earningsToTransfer;
                 // To jest koszt/dywidenda dla dziecka, więc zmniejsza jego zyski zatrzymane
                 stock.balanceSheet.retainedEarnings -= earningsToTransfer;
             }
        }
        
        // Logika spłaty/zaciągania długu (bez zmian)
        if (quarterlyEarnings < 0 && stock.assetType !== 'Holding' && !stock.isBankStock) {
            // Firma ze stratą zaciąga mały dług, aby zachować płynność
            const debtIncrease = Math.abs(quarterlyEarnings) * getRandomInRange(0.1, 0.4);
            stock.balanceSheet.liabilities += debtIncrease;
            stock.balanceSheet.assets += debtIncrease; // Dług zwiększa też aktywa (jako gotówka)
        } else if (quarterlyEarnings > 0 && stock.balanceSheet.liabilities > 0) {
            // Firma z zyskiem spłaca część długu
            if (stock.cash > 0) { 
                const debtRepayment = Math.min(stock.cash * 0.5, quarterlyEarnings * getRandomInRange(0.1, 0.3)); // Spłać 50% nowej gotówki lub 10-30% zysku
                const actualRepayment = Math.min(debtRepayment, stock.balanceSheet.liabilities);
                
                // Zmniejsz dług
                stock.balanceSheet.liabilities -= actualRepayment;
                // Zmniejsz aktywa (gotówkę)
                stock.balanceSheet.assets -= actualRepayment;
                stock.cash -= actualRepayment;
                // Zaktualizuj bank
                if (stock.bankAccountId) {
                    const bank = commercialBanks.find(b => b.id === stock.bankAccountId);
                    if (bank) bank.cash -= actualRepayment;
                }
            }
        }

        // Logika bankructwa (bez zmian)
        const equity = stock.balanceSheet.assets - stock.balanceSheet.liabilities;
        if ((equity <= 0 || stock.financialHealth <= -5) && !stock.isBankrupt) {
             let bankruptcyChance = 0.30;
             if (stock.ceo?.traits?.some(t => t.id === 'bogacz')) {
                 bankruptcyChance = 0;
                 logEvent(`[CEO] Prywatne środki i wpływy prezesa ratują ${stock.name} przed bankructwem!`);
                 const bailout = Math.abs(equity) + (stock.price * stock.totalShares * 0.1);
                 stock.balanceSheet.assets += bailout;
                 stock.balanceSheet.retainedEarnings += bailout;
                 stock.financialHealth = 1;
             } else if (stock.assetType === 'REIT' || stock.isBankStock) {
                bankruptcyChance = 0.05; // REITy i Banki rzadziej bankrutują
             }

             if (bankruptcyChance > 0 && Math.random() < bankruptcyChance) {
                 logEvent(`🔥 BANKRUCTWO! Spółka ${stock.name} (${stock.symbol}) ogłasza upadłość!`, 'review');
                 removeStockFromGame(stock.symbol); 
                 stock.isBankrupt = true;
                 stock.timeOfDeath = Date.now();
                 continue; 
             }
        }

        // Emisja obligacji ratunkowych (bez zmian)
        const canIssueRescue = stock.financialHealth <= -3 &&
                               stock.balanceSheet.liabilities > stock.balanceSheet.assets * 0.6 &&
                               !stock.assetType && !stock.isBankStock &&
                               (!stock.rescueActionCooldown || Date.now() > stock.rescueActionCooldown) &&
                               Math.random() < 0.25;
        if (canIssueRescue) {
            issueRescueBond(stock);
        }

        // Generowanie raportów (bez zmian)
        let reportResult = 'neutral';
        let eventMessage = "";
        let magnitude = 0;
        
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

        // Aktualizacja zmienności (bez zmian)
        const baseVolatility = initialStocks.find(s => s.symbol === stock.symbol)?.volatilityFactor || stock.volatilityFactor;
        if (stock.financialHealth > 0) {
            stock.volatilityFactor = Math.max(baseVolatility * 0.8, stock.volatilityFactor * 0.95);
        } else if (stock.financialHealth < 0) {
            stock.volatilityFactor = Math.min(baseVolatility * 2.5, stock.volatilityFactor * 1.05);
        }
        if (stock.volatilityFactor < 0.1) stock.volatilityFactor = 0.1;

        if (stock.quarterlyEarnings > 0 && !stock.isBankrupt) {
            let cityTaxRate = 0.005; // 0.5%
            
            // Sprawdź modyfikator podatkowy burmistrza
            if (city.mayor.taxModifier) {
                cityTaxRate += city.mayor.taxModifier; // np. +0.01 lub -0.01
            }
            
            if (cityTaxRate > 0) {
                 const cityTax = stock.quarterlyEarnings * cityTaxRate;
                 if (stock.cash >= cityTax) {
                     stock.cash -= cityTax;
                     city.budget += cityTax;
                     
                     // Zaktualizuj bank
                     if (stock.bankAccountId) {
                         const bank = commercialBanks.find(b => b.id === stock.bankAccountId);
                         if (bank) bank.cash -= cityTax;
                     }
                 }
                 // Nie logujemy tego, żeby nie spamować
            }
        }

    } // Koniec pętli for

    // Estymacja dywidend i odświeżenie widoków (bez zmian)
    stocks.forEach(stock => {
        if (stock.isBankrupt) return;
        stock.lastQuarterValue = stock.price * stock.totalShares;
        if (stock.assetType === 'REIT') {
            stock.estimatedDividend = stock.dividendPerShare;
        } else if (stock.dividendPolicy && stock.dividendPolicy !== 'Growth') {
            const estimatedProfit = stock.quarterlyEarnings > 0 ? stock.quarterlyEarnings : 0;
            const estimatedTotal = estimatedProfit * 0.1;
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

function processReitDividend(stock) {
    if (stock.sharesHeld === 0) return;

    // Logika wzrostu dywidendy dla REIT
    const roll = Math.random();
    if (roll > 0.81) { // 19% szans na wzrost
        stock.dividendPerShare += getRandomInRange(0.05, 0.5);
    } // w 81% przypadków zostaje bez zmian

    payDividendToShareholders(stock, stock.dividendPerShare);
}

function resolveMerger(stock1, stock2, process) {
    console.log(`[M&A Resolve] Finalizowanie procesu ${process.type} dla ${stock1.symbol} i ${stock2.symbol}...`);

    const initiator = stock1.symbol === process.initiatorSymbol ? stock1 : stock2;
    const target = stock1.symbol === process.initiatorSymbol ? stock2 : stock1;
    let successMessage = "";

    // Koszt "Zatrutej Pigułki" (bez zmian)
    let defenseCost = 0;
    if (process.defenseActive === 'poisonPill') {
        defenseCost = (target.price * target.totalShares) * 0.20;
        logEvent(`💊 ${initiator.name} musi zapłacić ${defenseCost.toFixed(0)} PLN za "odtrucie pigułki" w ${target.name}!`, 'review');
        process.costs += defenseCost;
    }
    
    const totalCost = process.offerDetails.totalCost + process.costs; // Całkowity koszt = oferta + koszty procesu + koszty obrony

    // --- Logika dla różnych typów ---
    switch (process.type) {
        case 'przejęcie':
        case 'influenceTakeover':
            
            // ===>>> NOWA LOGIKA FINANSOWANIA <<<===
            if (process.financing === 'cash') {
                // 1. Finansowanie Gotówką
                if (initiator.cash < totalCost) {
                    cancelMerger(initiator, "Brak wystarczających środków na finalizację przejęcia (koszty dodatkowe).");
                    cancelMerger(target, "Inicjator nie pokrył kosztów przejęcia.");
                    return;
                }
                initiator.cash -= totalCost;
                logEvent(`💸 ${initiator.name} wydaje łącznie ${totalCost.toFixed(0)} PLN (z gotówki) na przejęcie ${target.name}.`, 'company');
            
            } else if (process.financing === 'lbo') {
                // 2. Finansowanie Długiem (LBO)
                const lenderBank = findBestLenderBank(initiator, totalCost);
                if (!lenderBank) {
                    cancelMerger(initiator, "Nie udało się zabezpieczyć finansowania LBO. Banki odrzuciły wniosek.");
                    cancelMerger(target, "Inicjatorowi nie udało się pozyskać finansowania LBO.");
                    return;
                }
                
                // Bank płaci (traci gotówkę), Inicjator zyskuje dług
                lenderBank.cash -= totalCost;
                if (initiator.balanceSheet) {
                    initiator.balanceSheet.liabilities += totalCost; // Dług dopisany do bilansu!
                }
                // Dodaj kredyt do portfela banku (śledzenie)
                if (!lenderBank.loanPortfolio[initiator.symbol]) lenderBank.loanPortfolio[initiator.symbol] = 0;
                lenderBank.loanPortfolio[initiator.symbol] += totalCost;
                
                logEvent(`🏦 ${initiator.name} finansuje przejęcie ${target.name} poprzez LBO (dług) w ${lenderBank.name} na kwotę ${totalCost.toFixed(0)} PLN!`, 'company');
            
            } else {
                console.error(`[M&A Resolve] Nieznany typ finansowania: ${process.financing}`);
                cancelMerger(initiator, "Błąd metody finansowania.");
                cancelMerger(target, "Błąd metody finansowania.");
                return;
            }
            // ===>>> KONIEC NOWEJ LOGIKI FINANSOWANIA <<<===


            // 3. Wypłata dla akcjonariuszy spółki-celu (bez zmian)
            const pricePerShare = process.offerDetails.buyoutPricePerShare;
            // Gracz
            if (playerPortfolio[target.symbol]) {
                const holding = playerPortfolio[target.symbol];
                const grossGain = holding.shares * pricePerShare;
                playerCash += grossGain; // TODO: Obliczyć podatek
                logEvent(`💰 Otrzymujesz ${grossGain.toFixed(2)} PLN za akcje ${target.name} w ramach przejęcia.`, 'success');
            }
            // AI
            aiCompetitors.forEach(ai => {
                if (ai.portfolio[target.symbol]) {
                    ai.cash += ai.portfolio[target.symbol].shares * pricePerShare;
                }
            });
            // Holdingi i Banki
            stocks.filter(s => s.assetType === 'Holding' && s.holdingPortfolio[target.symbol]).forEach(h => h.cash += (h.holdingPortfolio[target.symbol].quantity * pricePerShare));
            commercialBanks.filter(b => b.stockPortfolio[target.symbol]).forEach(b => b.cash += (b.stockPortfolio[target.symbol].shares * pricePerShare));

            // 4. Przeniesienie Aktywów i Pasywów (bez zmian)
            if (initiator.balanceSheet && target.balanceSheet) {
                initiator.balanceSheet.assets += target.balanceSheet.assets;
                initiator.balanceSheet.liabilities += target.balanceSheet.liabilities;
                initiator.balanceSheet.retainedEarnings += target.balanceSheet.retainedEarnings;
                initiator.cash += target.cash; 
            }

            // 5. Obsługa CEO (Złoty Spadochron) (bez zmian)
            if (target.ceo?.traits?.some(t => t.id === 'goldenParachute')) {
                const parachuteCost = (target.price * target.totalShares) * 0.02; 
                if (initiator.cash >= parachuteCost) {
                    initiator.cash -= parachuteCost;
                    logEvent(`[CEO] Prezes ${target.name} odpala złoty spadochron! Koszt dla ${initiator.name}: ${parachuteCost.toFixed(0)} PLN.`, 'company');
                }
            }

            // 6. Aktualizacja spółki-matki (bez zmian)
            initiator.financialHealth = Math.max(-5, Math.min(5, ((initiator.financialHealth + target.financialHealth) / 2) + 0.5));
            if (!initiator.subsidiaries) initiator.subsidiaries = [];
            initiator.subsidiaries.push({ symbol: target.symbol, name: target.name, date: Date.now() });

            successMessage = `✅ Przejęcie zakończone! ${initiator.name} wchłonął ${target.name}.`;
            break;

        case 'fuzja':
            // ... (logika fuzji pozostaje bez zmian) ...
            const initiatorValue = initiator.price * initiator.totalShares;
            const targetValue = target.price * target.totalShares;
            const totalNewValue = initiatorValue + targetValue;
            const exchangeRatio = (targetValue / totalNewValue) / target.totalShares; 
            const newSharesForTargetHolders = target.totalShares * exchangeRatio;
            const initiatorRatio = (initiatorValue / totalNewValue) / initiator.totalShares;
            const newSharesForInitiatorHolders = initiator.totalShares * initiatorRatio;
            const newTotalShares = newSharesForTargetHolders + newSharesForInitiatorHolders;

            const playerTargetShares = playerPortfolio[target.symbol]?.shares || 0;
            const playerInitiatorShares = playerPortfolio[initiator.symbol]?.shares || 0;
            const totalNewSharesForPlayer = (playerTargetShares * exchangeRatio) + (playerInitiatorShares * initiatorRatio);
            if (playerTargetShares > 0) delete playerPortfolio[target.symbol];
            if (totalNewSharesForPlayer > 0) {
                 playerPortfolio[initiator.symbol] = { shares: totalNewSharesForPlayer, avgPrice: totalNewValue / newTotalShares, assetType: 'stock' };
                 logEvent(`🔄 Twoje akcje ${target.symbol} i ${initiator.symbol} zostały wymienione na ${totalNewSharesForPlayer.toFixed(0)} akcji nowej spółki.`, 'review');
            }

            [...aiCompetitors, ...stocks.filter(s=>s.assetType==='Holding'), ...commercialBanks].forEach(entity => {
                const portfolio = entity.portfolio || entity.holdingPortfolio || entity.stockPortfolio;
                if (!portfolio) return;
                const targetShares = portfolio[target.symbol]?.shares || portfolio[target.symbol]?.quantity || 0;
                const initiatorShares = portfolio[initiator.symbol]?.shares || portfolio[initiator.symbol]?.quantity || 0;
                const totalNewShares = (targetShares * exchangeRatio) + (initiatorShares * initiatorRatio);
                if (targetShares > 0) delete portfolio[target.symbol];
                if (totalNewShares > 0) {
                    if(entity.portfolio) {
                         portfolio[initiator.symbol] = { shares: totalNewShares, avgPrice: totalNewValue / newTotalShares };
                    } else { 
                         portfolio[initiator.symbol] = { quantity: totalNewShares, purchasePrice: totalNewValue / newTotalShares };
                    }
                }
            });

            initiator.name = `${initiator.name.split(' ')[0]}-${target.name.split(' ')[0]} Group`;
            initiator.totalShares = newTotalShares;
            initiator.maxShares = newTotalShares * 1.5;
            initiator.price = totalNewValue / newTotalShares;
            if (initiator.balanceSheet && target.balanceSheet) {
                initiator.balanceSheet.assets += target.balanceSheet.assets;
                initiator.balanceSheet.liabilities += target.balanceSheet.liabilities;
                initiator.balanceSheet.retainedEarnings += target.balanceSheet.retainedEarnings;
                initiator.cash += target.cash;
            }
            initiator.cash -= process.costs;
            initiator.financialHealth = Math.max(-5, Math.min(5, ((initiator.financialHealth + target.financialHealth) / 2) + 1.0));
            if (!initiator.subsidiaries) initiator.subsidiaries = [];
            initiator.subsidiaries.push({ symbol: target.symbol, name: target.name, date: Date.now() });

            if (target.ceo && target.financialHealth > initiator.financialHealth) {
                initiator.ceo = target.ceo;
            } 

            successMessage = `✅ Fuzja zakończona! Powstaje ${initiator.name}.`;
            break;

        default:
            console.warn(`[M&A Resolve] Nieznany typ procesu: ${process.type}`);
            cancelMerger(stock1, "Nieobsługiwany typ procesu.");
            cancelMerger(stock2, "Nieobsługiwany typ procesu.");
            return;
    }

    // --- Finalizacja (bez zmian) ---
    removeStockFromGame(target.symbol);
    initiator.mergerProcess = null;
    initiator.mergerPartnerVisible = false;

    logEvent(successMessage, 'success');
    showToast(successMessage, 'success', 7000);

    displayStocks(getCurrentInputValues());
    displayPortfolio();
}

/**
 * Anuluje proces fuzji lub przejęcia.
 * @param {object} stock - Spółka, dla której anulujemy proces (druga zostanie znaleziona po partnerSymbol).
 * @param {string} reason - Powód anulowania.
 */
function cancelMerger(stock, reason) {
    if (!stock || !stock.mergerProcess) return;

    const partnerSymbol = stock.mergerProcess.partnerSymbol;
    const partnerStock = stocks.find(s => s.symbol === partnerSymbol);

    logEvent(`❌ Proces M&A między ${stock.symbol} a ${partnerSymbol} został anulowany. Powód: ${reason}`, 'review');
    showToast(`Fuzja/Przejęcie ${stock.symbol}-${partnerSymbol} anulowane!`, 'error');

    // Resetuj stan w obu spółkach
    stock.mergerProcess = null;
    stock.mergerPartnerVisible = false;
    stock.isBeingMerged = false;
    stock.canBeTraded = true;

    if (partnerStock) {
        partnerStock.mergerProcess = null;
        partnerStock.mergerPartnerVisible = false;
        partnerStock.isBeingMerged = false;
        partnerStock.canBeTraded = true;
    }

    // Nałóż karę za nieudany proces (lekki spadek kondycji)
    stock.financialHealth -= 0.3;
    if (partnerStock) {
        partnerStock.financialHealth -= 0.3;
    }

    // Odśwież UI
    displayStocks(getCurrentInputValues());
}

function advanceMergerProcess(stock) {
    if (!stock.mergerProcess) return;
    const process = stock.mergerProcess;
    const partnerStock = stocks.find(s => s.symbol === process.partnerSymbol);
    if (!partnerStock || partnerStock.isBankrupt) {
        cancelMerger(stock, "Partner przestał istnieć lub zbankrutował.");
        if (partnerStock) cancelMerger(partnerStock, "Partner przestał istnieć lub zbankrutował.");
        return;
    }
    if (process.decisionRequired) return;

    // --- Zwiększanie postępu ---
    let progressSpeed = 5; 
    
    // ===>>> EFEKT OBRONY: "Zatruta Pigułka" spowalnia proces <<<===
    if (process.defenseActive === 'poisonPill') {
        progressSpeed *= 0.7; // Postęp wolniejszy o 30%
        process.costs += 10000; // Dodatkowy koszt prawny co cykl
        logEvent(`💊 "Zatruta Pigułka" spowalnia i podnosi koszty przejęcia ${stock.symbol}...`);
        
        // Sprawdź, czy agresor (AI) się nie wycofa
        const initiator = stocks.find(s => s.symbol === process.initiatorSymbol);
        if (initiator && initiator.mergerProcess && !initiator.personality) { // Jeśli inicjatorem jest spółka AI
             if (Math.random() < 0.1) { // 10% szans na wycofanie się w każdym cyklu
                logEvent(`[M&A] 🏳️ ${initiator.name} wycofuje się z przejęcia ${stock.name} z powodu aktywowanej "Zatrutej Pigułki"!`, 'review');
                cancelMerger(stock, "Agresor wycofał ofertę.");
                cancelMerger(partnerStock, "Agresor wycofał ofertę.");
                return;
             }
        }
    }
    // ===>>> KONIEC EFEKTU OBRONY <<<===

    process.progress += progressSpeed;
    process.progress = Math.min(100, process.progress);

    // --- Losowanie Mini-Eventów i Komplikacji ---
    const eventRoll = Math.random();
    if (eventRoll < 0.05) { 
        triggerMergerMiniEvent(stock, partnerStock, process);
    } else if (eventRoll < 0.08) {
        process.complications++;
        process.statusMessage = `Etap ${process.stage}: Komplikacja nr ${process.complications}! 🔴`;
        console.log(`[M&A] Komplikacja ${process.complications} w procesie ${stock.symbol} <-> ${partnerStock.symbol} (Etap ${process.stage})`);
        if (partnerStock.mergerProcess) {
            partnerStock.mergerProcess.complications = process.complications;
            partnerStock.mergerProcess.statusMessage = process.statusMessage;
        }
        if (process.complications >= 3) {
            handleMajorComplication(stock, partnerStock, process);
        }
    }

    // --- Przejście do następnego etapu ---
    if (process.progress >= 100) {
        process.stage++;
        process.progress = 0;
        process.complications = 0; 
        console.log(`[M&A] Proces ${stock.symbol} <-> ${partnerStock.symbol} wchodzi w etap ${process.stage}`);

        // Zaktualizuj proces u partnera przed logiką etapu
        if (partnerStock.mergerProcess) {
             Object.assign(partnerStock.mergerProcess, process);
             partnerStock.mergerProcess.partnerSymbol = stock.symbol;
        }

        // Logika specyficzna dla nowego etapu
        switch (process.stage) {
            case 2:
                process.statusMessage = `Etap 2: Negocjacje warunków...`;
                break;
            case 3: 
                const baseCost = 5000;
                const valueCost = (stock.price * stock.totalShares + partnerStock.price * partnerStock.totalShares) * 0.005;
                process.costs += (baseCost + valueCost);
                process.statusMessage = `Etap 3: Strategia i finansowanie (koszty: ${process.costs.toFixed(0)} PLN).`;
                break;
            case 4: 
                process.statusMessage = `Etap 4: Analiza prawna i kontrola antymonopolowa...`;
                if (checkAntitrust(stock, partnerStock)) {
                    cancelMerger(stock, "Zablokowane przez Urząd Antymonopolowy.");
                    cancelMerger(partnerStock, "Zablokowane przez Urząd Antymonopolowy.");
                    return; 
                } else {
                    process.statusMessage = `Etap 4: Analiza prawna ZAAKCEPTOWANA. Losowanie zdarzeń...`;
                    triggerMergerMiniEvent(stock, partnerStock, process);
                }
                break;
            case 5: 
                process.statusMessage = `Etap 5: Integracja operacyjna...`;
                stock.mergerPartnerVisible = true;
                partnerStock.mergerPartnerVisible = true;
                partnerStock.isBeingMerged = true; 
                partnerStock.price *= 1.1; 
                break;
            case 6: 
                process.statusMessage = `Etap 6: Finalizacja umowy i transfery...`;
                partnerStock.canBeTraded = false; 
                break;
            case 7: 
                resolveMerger(stock, partnerStock, process); 
                return; 
            default:
                console.warn(`[M&A] Nieznany etap procesu: ${process.stage} dla ${stock.symbol}`);
                process.statusMessage = `Etap ${process.stage}: ???`;
                break;
        }
        // Zaktualizuj proces u partnera PO logice etapu
        if (partnerStock.mergerProcess) {
            Object.assign(partnerStock.mergerProcess, process);
            partnerStock.mergerProcess.partnerSymbol = stock.symbol;
        }
    }

    displayStocks(getCurrentInputValues());
}

function initiateMergerProcess(initiatorStock, targetStock, type, financing = 'cash') {
    // Podstawowe walidacje
    if (!initiatorStock || !targetStock || initiatorStock === targetStock) {
        console.error("[M&A Init] Błąd: Nieprawidłowe spółki inicjujące/celu.");
        return false;
    }
    if (initiatorStock.mergerProcess || targetStock.mergerProcess) {
        console.warn(`[M&A Init] Anulowano: Jedna ze spółek (${initiatorStock.symbol} lub ${targetStock.symbol}) jest już w trakcie innego procesu M&A.`);
        // Można dodać logEvent lub showToast dla gracza, jeśli inicjował
        return false;
    }
    if (targetStock.isSubsidiaryOf) {
        console.warn(`[M&A Init] Anulowano: ${targetStock.symbol} jest już spółką zależną.`);
        return false;
    }
    // TODO: Dodać więcej walidacji (np. czy inicjatora stać, czy cel nie jest za duży/mały dla danego typu)

    console.log(`[M&A Init] Rozpoczęto proces: ${initiatorStock.symbol} -> ${targetStock.symbol} (Typ: ${type})`);

    const processData = {
        type: type,
        stage: 1,
        progress: 0,
        partnerSymbol: targetStock.symbol,
        initiatorSymbol: initiatorStock.symbol,
        complications: 0,
        costs: 0,
        statusMessage: `Etap 1: Wstępne rozmowy (${type})...`,
        decisionRequired: null,
        defenseActive: null,
        financing: financing // Zapisz metodę finansowania
        // Można dodać: offerPremium (dla przejęć), exchangeRatio (dla fuzji)
    };

    // Ustaw obiekt procesu w obu spółkach
    initiatorStock.mergerProcess = { ...processData }; // Kopia dla inicjatora
    targetStock.mergerProcess = { ...processData, partnerSymbol: initiatorStock.symbol }; // Kopia dla celu (z zamienionym partnerem)

    logEvent(`🤝 Rozpoczynają się rozmowy o ${type} między ${initiatorStock.name} a ${targetStock.name}!`, 'market');

if (type === 'przejęcie') {
        const majorityOwner = findMajorityShareholder(targetStock); // Znajdź właściciela
        
        if (majorityOwner && (majorityOwner.id === 'player' || majorityOwner.id.startsWith('ai'))) {
            // Właściciel (Gracz lub AI) podejmie decyzję w swoim cyklu (Gracz w UI, AI w makeAiDecision)
            console.log(`[M&A] ${targetStock.symbol} jest pod kontrolą ${majorityOwner.id}. Oczekuję na decyzję o obronie...`);
            // Nie robimy nic, czekamy na reakcję właściciela
        } else {
            // Brak dominującego właściciela -> ZARZĄD decyduje (losowo)
            console.log(`[M&A] Akcjonariat ${targetStock.symbol} jest rozproszony. Zarząd podejmuje decyzję o obronie...`);
            let defenseChance = 0.3; // Bazowa szansa zarządu na obronę
            if (offerPremium < 0.15) defenseChance = 0.7; // Niska oferta = większa szansa obrony
            if (targetStock.ceo?.traits?.some(t => t.id === 'oddany')) defenseChance = 0.9; // Oddany CEO zawsze walczy

            if (Math.random() < defenseChance) {
                // Zarząd aktywuje "Zatrutą Pigułkę" automatycznie
                // Aktywacja przez zarząd nie kosztuje gracza, ale kosztuje samą spółkę
                const activationCost = (targetStock.price * targetStock.totalShares) * 0.05;
                if (targetStock.cash >= activationCost) {
                    targetStock.cash -= activationCost; // Spółka sama płaci za obronę
                    targetStock.mergerProcess.defenseActive = 'poisonPill';
                    targetStock.financialHealth -= 1.0;
                    if (targetStock.balanceSheet) {
                         targetStock.balanceSheet.liabilities += (targetStock.price * targetStock.totalShares) * 0.2;
                    }
                    logEvent(`🛡️ Zarząd ${targetStock.name} (bez większościowego właściciela) aktywuje "Zatrutą Pigułkę"!`, 'review');
                } else {
                    logEvent(`[M&A] Zarząd ${targetStock.name} chciał aktywować obronę, ale spółki nie było stać.`);
                }
            } else {
                logEvent(`[M&A] Zarząd ${targetStock.name} postanawia nie aktywować obrony i rozważyć ofertę.`);
                targetStock.mergerProcess.defenseActive = 'none'; // Oznacz brak obrony
            }
        }
    }

    // Odśwież UI
    displayStocks(getCurrentInputValues());
    return true; // Proces zainicjowany pomyślnie
}

// --- Startupy ---
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

function initializeResearchForStock(stock) {
    // Ta funkcja nie dotyczy start-upów, REIT-ów i Instytutów Badawczych
    if (stock.assetType === 'Startup' || stock.assetType === 'REIT' || stock.assetType === 'ResearchInstitute') {
        stock.research = null; // Upewnij się, że nie mają obiektu research
        stock.researchUnlocks = null;
        return;
    }

    // --- NOWA LOGIKA DLA BANKÓW ---
    if (stock.isBankStock) {
        const investmentIds = Object.keys(bankInvestments);
        if (investmentIds.length === 0) {
            stock.research = null; // Brak dostępnych inwestycji
            return;
        }
        const firstInvestmentId = getRandomElement(investmentIds);
        const firstInvestment = bankInvestments[firstInvestmentId];
        const initialRequiredProgress = firstInvestment.baseCost;

        stock.research = {
            isInvestment: true, // Flaga oznaczająca system inwestycji
            isResearching: false, // Domyślnie nieaktywne, startuje po sprawdzeniu kasy
            currentInvestmentId: firstInvestmentId,
            progress: 0,
            requiredProgress: initialRequiredProgress, // Wymagane punkty dla pierwszej realizacji
            completedInvestments: {}, // Licznik ukończonych { 'ID': level }
            investmentPaused: false // Flaga pauzy
        };
        // Inicjalizuj licznik dla wszystkich inwestycji na 0
        investmentIds.forEach(id => { stock.research.completedInvestments[id] = 0; });

        // Sprawdź, czy bank stać na rozpoczęcie pierwszej inwestycji
        const bankData = commercialBanks.find(b => b.id === stock.bankData.id);
        if (bankData && bankData.cash >= (firstInvestment.initialCashCost || 0)) {
            bankData.cash -= (firstInvestment.initialCashCost || 0);
            stock.research.isResearching = true;
            if((firstInvestment.initialCashCost || 0) > 0) logEvent(`💸 Bank ${stock.name} rozpoczyna inwestycję "${firstInvestment.name}" kosztem ${firstInvestment.initialCashCost.toLocaleString()} PLN.`);
             else logEvent(`▶️ Bank ${stock.name} rozpoczyna inwestycję "${firstInvestment.name}".`);
        } else {
             logEvent(`⏸️ Bank ${stock.name} chciał rozpocząć inwestycję "${firstInvestment.name}", ale brakuje środków (${(firstInvestment.initialCashCost || 0).toLocaleString()} PLN).`);
            stock.research.investmentPaused = true; // Zapauzuj od razu
        }

    } else { // --- STARA LOGIKA DLA ZWYKŁYCH SPÓŁEK ---
        const specializations = ["wzmacnianie rozwoju", "wzmacnianie pozycji na rynku", "wzmacnianie ceny i zysków"];
        const shouldResearch = Math.random() > 0.10; // 90% szans

        stock.research = {
            isInvestment: false, // Oznacz jako standardowe R&D
            isResearching: shouldResearch,
            specialization: null,
            researchSpeedMultiplier: 1.0,
            currentTech: null,
            progress: 0,
            unlockedTechs: [],
            researchPaused: false // Dodajemy flagę pauzy
        };
        stock.researchUnlocks = { // Inicjalizuj odblokowania dla zwykłych spółek
            canSeeSpecialization: false, canSeeResults: false, canFund: false,
            canInfluence: false, canInterfere: false
        };

        if (shouldResearch) {
            stock.research.specialization = getRandomElement(specializations);
            const availableTechs = Object.keys(technologies).filter(id =>
                !stock.research.unlockedTechs.includes(id) &&
                (technologies[id].sector === 'common' || stock.sector.includes(technologies[id].sector)) &&
                technologies[id].type === stock.research.specialization
            );

            if (availableTechs.length > 0) {
                 const firstTechId = getRandomElement(availableTechs);
                 const firstTech = technologies[firstTechId];
                 // Sprawdź koszt początkowy
                 if(stock.cash >= (firstTech.initialCashCost || 0)) {
                    stock.cash -= (firstTech.initialCashCost || 0);
                    stock.research.currentTech = firstTechId;
                     if((firstTech.initialCashCost || 0) > 0) logEvent(`💸 ${stock.name} rozpoczyna badania nad "${firstTech.name}" kosztem ${firstTech.initialCashCost.toLocaleString()} PLN.`);
                     else logEvent(`▶️ ${stock.name} rozpoczyna badania nad "${firstTech.name}".`);
                 } else {
                     logEvent(`⏸️ ${stock.name} chciał rozpocząć badania nad "${firstTech.name}", ale brakuje środków (${(firstTech.initialCashCost || 0).toLocaleString()} PLN). Badania wstrzymane.`);
                     stock.research.isResearching = false;
                     stock.research.researchPaused = true;
                 }
            } else {
                stock.research.isResearching = false; // Brak dostępnych technologii
            }
        }
    }
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
function initializeCityCompanies() {
    // 1. Wyczyść stare dane
    municipalCompanies = [];
    privateCompanies = [];
    
    // 2. Stwórz spółki miejskie
    const municipalNames = [
        { name: "Oczyszczalnia Ścieków 'Woda Czysta'", type: 'utility', budget: 50000 },
        { name: "Drogi i Zieleń Miejska", type: 'infrastructure', budget: 30000 },
        { name: "Sortownia Odpadów 'EkoGdańsk'", type: 'utility', budget: 40000 },
        { name: "Elektrociepłownia Miejska", type: 'energy', budget: 150000 },
        { name: "Stadion Miejski", type: 'leisure', budget: 10000 },
        { name: "Szpital Miejski", type: 'health', budget: 80000 },
        { name: "Dom Kultury", type: 'leisure', budget: 5000 },
        { name: "Wodociągi Miejskie", type: 'utility', budget: 60000 }
    ];

    municipalNames.forEach(comp => {
        municipalCompanies.push({
            id: `mun_${comp.name.substring(0, 3).toUpperCase()}`,
            name: comp.name,
            type: comp.type,
            budget: comp.budget,
            baseIncome: comp.budget * 0.1 // Przykładowy roczny przychód
        });
    });

    // 3. Stwórz firmy prywatne
    const fpf = stocks.find(s => s.symbol === 'FPF'); // Znajdź Fundację
    for (let i = 0; i < 5; i++) { // Stwórz 5 firm prywatnych na start
        const newPrivateCompany = {
            id: `priv_${Date.now() + i}`,
            name: `Prywatna Inicjatywa #${i + 1}`, // TODO: Lepszy generator nazw
            value: getRandomIntInRange(10000, 50000),
            developmentProgress: 0,
            cityOwnership: getRandomInRange(0.01, 0.99) // Udział Fundacji (miasta)
        };
        privateCompanies.push(newPrivateCompany);
        
        // Fundacja przejmuje udziały
        if (fpf && fpf.holdingPortfolio) {
            // Symulujemy udziały jako specjalny wpis w portfolio holdingu
            fpf.holdingPortfolio[newPrivateCompany.id] = {
                quantity: newPrivateCompany.cityOwnership * 100, // Zapiszemy procent jako "ilość"
                purchasePrice: newPrivateCompany.value / 100 // Zapiszemy wartość 1%
            };
        }
    }
    console.log("[MIASTO] Zainicjowano spółki miejskie i firmy prywatne.");
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

function assignInitialDividendPolicies() {
    const policies = ['Balanced', 'Aggressive', 'Growth', 'Total'];
    stocks.forEach(stock => {
        if (stock.exchange !== 'JUNK' && stock.assetType !== 'REIT') {
            stock.dividendPolicy = getRandomElement(policies);
        }
    });
    console.log("[START GRY] Przypisano początkowe polityki dywidendowe.");
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

    function updateCorporatePhase(stock) {
    // Pomiń typy specjalne i bankrutów
    if (stock.assetType || stock.isBankStock || stock.isBankrupt) return;

    stock.companyAge++; // Firma starzeje się o kwartał

    // Obsługa faz tymczasowych (Złoty Rok, Zejście w Cień, Impuls Innowacji)
    if (stock.phaseTimer && stock.phaseTimer > 0) {
        stock.phaseTimer--; // Odliczanie czasu trwania fazy
        if (stock.phaseTimer <= 0) {
            // Faza tymczasowa się skończyła, wróć do fazy bazowej
            const previousPhase = stock.previousPhase || CORPORATE_PHASES.STABILITY; // Wróć do poprzedniej lub domyślnej
            logEvent(`⏳ Faza "${stock.corporatePhase}" dla ${stock.name} dobiegła końca. Powrót do fazy "${previousPhase}".`);
            stock.corporatePhase = previousPhase;
            stock.previousPhase = null; // Wyczyść zapamiętaną fazę
            // Tutaj można dodać jednorazowy efekt po zakończeniu fazy, np. lekka korekta ceny
        }
        return; // Jeśli jesteśmy w fazie tymczasowej, nie zmieniamy jej jeszcze
    }

    const currentPhase = stock.corporatePhase;
    const health = stock.financialHealth;
    const age = stock.companyAge;
    let nextPhase = currentPhase; // Domyślnie zostajemy w tej samej fazie
    let transitionReason = ""; // Opis powodu zmiany

    // Sprawdzenie szansy na unikalne fazy (przed standardowymi przejściami)
    const uniquePhaseRoll = Math.random();
    if (uniquePhaseRoll < 0.02 && (currentPhase === CORPORATE_PHASES.GROWTH || currentPhase === CORPORATE_PHASES.STABILITY || currentPhase === CORPORATE_PHASES.REORGANIZATION)) {
        // 2% szansy na Złoty Rok
        nextPhase = CORPORATE_PHASES.GOLDEN_YEAR;
        stock.phaseTimer = 4; // Faza trwa 4 kwartały (1 rok)
        transitionReason = "niespodziewanego okresu prosperity";
    } else if (uniquePhaseRoll < 0.04 && (currentPhase === CORPORATE_PHASES.DECLINE || currentPhase === CORPORATE_PHASES.REORGANIZATION)) {
        // 2% szansy na Zejście w Cień (jeśli już jest źle)
        nextPhase = CORPORATE_PHASES.SHADOW_DESCENT;
        stock.phaseTimer = getRandomIntInRange(3, 6); // Faza trwa 3-6 kwartałów
        transitionReason = "pogłębiającego się kryzysu";
    } else if (uniquePhaseRoll < 0.07 && (currentPhase === CORPORATE_PHASES.GROWTH || currentPhase === CORPORATE_PHASES.REORGANIZATION)) {
        // 3% szansy na Impuls Innowacji (szczególnie w fazie wzrostu lub reorganizacji)
        nextPhase = CORPORATE_PHASES.INNOVATION_PUSH;
        stock.phaseTimer = getRandomIntInRange(4, 8); // Faza trwa 4-8 kwartałów
        transitionReason = "skupienia na badaniach i rozwoju";
    }

    // Jeśli nie wylosowano fazy unikalnej, sprawdź standardowe przejścia
    if (nextPhase === currentPhase) {
        switch (currentPhase) {
            case CORPORATE_PHASES.GROWTH:
                if (health <= 0 || age > 20) { // Słabe wyniki lub starzenie się
                    nextPhase = CORPORATE_PHASES.STABILITY;
                    transitionReason = health <= 0 ? "spowolnienia rozwoju" : "osiągnięcia dojrzałości";
                } else if (health < -2) { // Nagłe załamanie
                    nextPhase = CORPORATE_PHASES.DECLINE;
                    transitionReason = "gwałtownego pogorszenia wyników";
                }
                break;
            case CORPORATE_PHASES.STABILITY:
                if (health >= 3 && age < 30 && Math.random() < 0.1) { // Dobre wyniki i młody wiek - szansa na powrót do wzrostu
                    nextPhase = CORPORATE_PHASES.GROWTH;
                    transitionReason = "nowego impulsu rozwojowego";
                } else if (health < -1) { // Pogorszenie wyników
                    nextPhase = CORPORATE_PHASES.DECLINE;
                    transitionReason = "pogarszającej się rentowności";
                } else if (health <= 1 && age > 40 && Math.random() < 0.05) { // Starzenie się i przeciętne wyniki
                     nextPhase = CORPORATE_PHASES.DECLINE;
                     transitionReason = "utraty konkurencyjności";
                }
                break;
            case CORPORATE_PHASES.DECLINE:
                if (health <= -5) { // Bardzo źle - ryzyko bankructwa (obsługiwane w processFinancialReports)
                    // Pozostaje w Decline, ale może wejść w Reorganizację po evencie ratunkowym
                } else if (health >= 0 && Math.random() < 0.2) { // Lekka poprawa - szansa na Reorganizację
                    nextPhase = CORPORATE_PHASES.REORGANIZATION;
                    transitionReason = "próby restrukturyzacji";
                }
                break;
            case CORPORATE_PHASES.REORGANIZATION:
                if (health >= 2) { // Udana reorganizacja
                    nextPhase = CORPORATE_PHASES.STABILITY;
                    transitionReason = "udanej restrukturyzacji i stabilizacji";
                } else if (health < -3) { // Porażka reorganizacji
                    nextPhase = CORPORATE_PHASES.DECLINE;
                    transitionReason = "niepowodzenia planu naprawczego";
                }
                // Jeśli health jest neutralne, pozostaje w Reorganization
                break;
        }
    }

    // Zastosuj zmianę fazy, jeśli nastąpiła
    if (nextPhase !== currentPhase) {
        // Zapisz poprzednią fazę bazową, jeśli wchodzimy w fazę tymczasową
        if (stock.phaseTimer > 0 && currentPhase !== CORPORATE_PHASES.GOLDEN_YEAR && currentPhase !== CORPORATE_PHASES.SHADOW_DESCENT && currentPhase !== CORPORATE_PHASES.INNOVATION_PUSH) {
            stock.previousPhase = currentPhase;
        } else if (stock.phaseTimer === 0) { // Wychodzimy z fazy tymczasowej lub normalna zmiana
             stock.previousPhase = null;
        }

        stock.corporatePhase = nextPhase;
        logEvent(`🏢 Spółka ${stock.name} wchodzi w fazę "${nextPhase}" z powodu ${transitionReason}.`, 'company');

        // Można dodać jednorazowy efekt przy zmianie fazy, np. mały boost/spadek ceny
        if (nextPhase === CORPORATE_PHASES.GROWTH) applyPriceEffect(stock.symbol, 0.02, 'positive');
        else if (nextPhase === CORPORATE_PHASES.DECLINE) applyPriceEffect(stock.symbol, -0.03, 'negative');
        else if (nextPhase === CORPORATE_PHASES.GOLDEN_YEAR) applyPriceEffect(stock.symbol, 0.05, 'positive');
        else if (nextPhase === CORPORATE_PHASES.SHADOW_DESCENT) applyPriceEffect(stock.symbol, -0.04, 'negative');
    }
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

/**
 * Funkcja pomocnicza do aktywacji mechanizmu obronnego przez gracza lub AI.
 * @param {string} symbol - Symbol spółki, która się broni.
 *(Ta funkcja powinna już istnieć - zastąp ją tą)
 * @param {'poisonPill' | 'whiteKnight' | 'pacMan'} defenseType - Typ obrony.
 * @param {string} [entityId='player'] - Kto aktywuje ('player' lub ID bota).
 */
function activateDefenseMechanism(symbol, defenseType, entityId = 'player') {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !stock.mergerProcess || stock.mergerProcess.defenseActive) return; // Nie można aktywować, jeśli już coś działa

    let entityCash, entityName;
    if (entityId === 'player') {
        entityCash = playerCash;
        entityName = "Ty";
    } else {
        const ai = aiCompetitors.find(a => a.id === entityId);
        if (!ai) return;
        entityCash = ai.cash;
        entityName = ai.name;
    }

    switch (defenseType) {
        case 'poisonPill':
            // Koszt aktywacji (np. opłaty prawne i doradcze) to 5% wartości rynkowej firmy
            const activationCost = (stock.price * stock.totalShares) * 0.05; 
            
            if (entityCash < activationCost) {
                if(entityId === 'player') alert(`Nie masz wystarczająco gotówki, aby aktywować "Zatrutą Pigułkę"! Wymagane: ${activationCost.toFixed(0)} PLN.`);
                return;
            }
            
            // Potwierdzenie (tylko dla gracza)
            if (entityId === 'player') {
                 if (!confirm(`Aktywacja "Zatrutej Pigułki" będzie Cię kosztować ${activationCost.toFixed(0)} PLN (opłaty doradcze) i natychmiast zaszkodzi firmie (spadek kondycji, wzrost długu), ale może zniechęcić agresora. Kontynuować?`)) {
                    return; // Gracz anulował
                 }
            }

            // --- Transakcja ---
            if (entityId === 'player') playerCash -= activationCost;
            else entityCash -= activationCost;
            
            stock.mergerProcess.defenseActive = 'poisonPill';
            
            // --- Natychmiastowe Kary dla Spółki-Celu ---
            stock.financialHealth -= 1.0; // Natychmiastowa kara dla kondycji
            if (stock.balanceSheet) {
                 // Spółka emituje specjalne warranty lub zaciąga dług, aby zwiększyć toksyczność
                 stock.balanceSheet.liabilities += (stock.price * stock.totalShares) * 0.2; // Dług rośnie o 20% wartości firmy
            }
            
            logEvent(`🛡️ ${stock.name} aktywuje "Zatrutą Pigułkę" (koszt: ${activationCost.toFixed(0)} PLN), aby obronić się przed przejęciem! Kondycja firmy spada, a dług rośnie.`, 'review');
            if(entityId === 'player') {
                showToast(`${stock.name} aktywuje "Zatrutą Pigułkę"!`, 'warning');
                displayCash();
            }
            break;

        case 'whiteKnight':
            // TODO: Logika dla Białego Rycerza (np. ustawienie flagi 'seekingWhiteKnight')
            logEvent(`🛡️ ${stock.name} rozpoczyna poszukiwania "Białego Rycerza"!`, 'review');
            break;
            
        case 'pacMan':
            // TODO: Logika dla obrony Pac-Man (próba wrogiego przejęcia agresora)
            logEvent(`👻 ${stock.name} aktywuje obronę "Pac-Man" i próbuje przejąć agresora!`, 'warning');
            break;
    }

    // Odśwież modal zarządzania, aby pokazać aktywną obronę
    if (entityId === 'player' && document.getElementById('management-modal')?.style.display === 'block') {
        openManagementModal(symbol);
    }
}

/**
 * Inicjuje proces fuzji lub przejęcia między dwoma spółkami.
 * @param {object} initiatorStock - Spółka inicjująca proces.
 * @param {object} targetStock - Spółka będąca celem procesu.
 * @param {'fuzja' | 'przejęcie'} type - Typ procesu M&A.
 * @param {string} financing - Metoda finansowania ('cash', 'stockSwap', 'lbo').
 * @param {number} [offerPremium=0.25] - Premia oferowana ponad cenę rynkową (tylko dla 'przejęcie').
 */
function initiateMergerProcess(initiatorStock, targetStock, type, financing = 'cash', offerPremium = 0.25) {
    // Walidacje
    if (!initiatorStock || !targetStock || initiatorStock === targetStock) {
        console.error("[M&A Init] Błąd: Nieprawidłowe spółki.");
        return false;
    }
    if (initiatorStock.mergerProcess || targetStock.mergerProcess) {
        showToast("Anulowano: Jedna ze spółek jest już w trakcie innego procesu M&A.", 'warning');
        return false;
    }
    if (targetStock.isSubsidiaryOf) {
        showToast("Anulowano: Nie można przejąć spółki zależnej.", 'warning');
        return false;
    }
    if (targetStock.isBankrupt || initiatorStock.isBankrupt) {
        showToast("Anulowano: Nie można przeprowadzać operacji na bankrutach.", 'warning');
        return false;
    }

    // Walidacja finansowania
    let buyoutPricePerShare = 0;
    let totalCost = 0;

    if (type === 'przejęcie') {
        buyoutPricePerShare = targetStock.price * (1 + offerPremium);
        totalCost = buyoutPricePerShare * targetStock.totalShares;
        if (financing === 'cash' && initiatorStock.cash < totalCost) {
            showToast(`Anulowano: ${initiatorStock.name} nie ma wystarczająco gotówki (${totalCost.toFixed(0)} PLN) na przejęcie.`, 'error');
            return false;
        }
        // TODO: Walidacja dla 'lbo' (zdolność kredytowa)
    }

    console.log(`[M&A Init] Rozpoczęto proces: ${initiatorStock.symbol} -> ${targetStock.symbol} (Typ: ${type})`);

    const processData = {
        type: type,
        stage: 1,
        progress: 0,
        partnerSymbol: targetStock.symbol,
        initiatorSymbol: initiatorStock.symbol,
        complications: 0,
        costs: 0,
        statusMessage: `Etap 1: Wstępne rozmowy (${type})...`,
        decisionRequired: null,
        defenseActive: null,
        financing: financing,
        offerDetails: { // Zapisujemy szczegóły oferty
            premium: offerPremium,
            buyoutPricePerShare: buyoutPricePerShare,
            totalCost: totalCost
            // Dla fuzji można tu zapisać 'exchangeRatio'
        }
    };

    // Ustaw obiekt procesu w obu spółkach
    initiatorStock.mergerProcess = { ...processData };
    targetStock.mergerProcess = { ...processData, partnerSymbol: initiatorStock.symbol };

    logEvent(`🤝 Rozpoczynają się rozmowy o ${type} między ${initiatorStock.name} a ${targetStock.name}!`, 'market');
    showToast(`Rozpoczęto rozmowy o ${type} ${initiatorStock.symbol} z ${targetStock.symbol}!`, 'default');

    // Aktywacja obrony dla wrogich przejęć
    if (type === 'przejęcie') {
        // Sprawdź, kto kontroluje spółkę-cel
        const majorityOwner = findMajorityShareholder(targetStock);
        if (majorityOwner && (majorityOwner.id === 'player' || majorityOwner.id.startsWith('ai'))) {
            // Decyzja AI lub gracza o obronie (logika w `makeAiDecision` lub `openManagementModal`)
            console.log(`[M&A] ${targetStock.symbol} jest pod kontrolą ${majorityOwner.name}. Oczekuję na decyzję o obronie...`);
        } else {
            // Zarząd decyduje (losowo)
            if (Math.random() < 0.3) {
                activateDefenseMechanism(targetStock, 'poisonPill'); // Przykładowa domyślna obrona
            }
        }
    }

    displayStocks(getCurrentInputValues());
    return true;
}

function triggerMergerMiniEvent(stock1, stock2, process) {
    const isPositive = Math.random() < 0.5; // 50% szans na pozytywny event

    if (isPositive) {
        // --- Ukryte Złoto ---
        const effects = [
            { desc: "odkryto nieoczekiwane synergie operacyjne!", costChange: -500, progressChange: 5, healthChange: 0.1 },
            { desc: "znaleziono sposób na optymalizację podatkową połączonej firmy!", costChange: -1000, progressChange: 0, healthChange: 0.05 },
            { desc: "kluczowy pracownik konkurencji przechodzi do jednej ze spółek!", costChange: 0, progressChange: 0, healthChange: 0.15 }
        ];
        const effect = getRandomElement(effects);
        process.costs = Math.max(0, process.costs + effect.costChange);
        process.progress += effect.progressChange;
        stock1.financialHealth += effect.healthChange;
        stock2.financialHealth += effect.healthChange;
        process.statusMessage = `✨ Ukryte złoto: ${effect.desc}`;
        logEvent(`[M&A] ✨ ${stock1.symbol} <-> ${stock2.symbol}: ${effect.desc}`, 'review');
    } else {
        // --- Trup w Szafie ---
        const effects = [
            { desc: "ujawniono nieznane wcześniej zobowiązania jednej ze spółek!", costChange: 1500, progressChange: -5, healthChange: -0.1 },
            { desc: "kluczowi menedżerowie ogłaszają odejście w proteście przeciw fuzji!", costChange: 500, progressChange: -10, healthChange: -0.05 },
            { desc: "pojawiają się problemy z integracją systemów IT!", costChange: 800, progressChange: -8, healthChange: 0 }
        ];
        const effect = getRandomElement(effects);
        process.costs += effect.costChange;
        process.progress = Math.max(0, process.progress + effect.progressChange);
        stock1.financialHealth += effect.healthChange;
        stock2.financialHealth += effect.healthChange;
        process.statusMessage = `💀 Trup w szafie: ${effect.desc}`;
        logEvent(`[M&A] 💀 ${stock1.symbol} <-> ${stock2.symbol}: ${effect.desc}`, 'review');
    }
    // Aktualizuj proces w obu spółkach (bo 'process' to referencja do obiektu jednej z nich)
    const partner = stock1.symbol === process.initiatorSymbol ? stock2 : stock1;
    if (partner.mergerProcess) {
        Object.assign(partner.mergerProcess, process); // Nadpisz dane w procesie partnera
    }
}

/**
 * Obsługuje sytuację, gdy w danym etapie M&A wystąpiły 3 komplikacje.
 * Prezentuje decyzję graczowi lub symuluje ją dla AI.
 * @param {object} stock1 - Pierwsza spółka.
 * @param {object} stock2 - Druga spółka.
 * @param {object} process - Obiekt mergerProcess.
 */
function handleMajorComplication(stock1, stock2, process) {
    process.statusMessage = "🔴 POWAŻNE KOMPLIKACJE! Wymagana decyzja...";
    process.progress = 0; // Zatrzymaj postęp etapu

    // Zdefiniuj opcje decyzji
    const decisionData = {
        question: `Proces ${process.type} między ${stock1.name} a ${stock2.name} napotkał poważne trudności! Co robimy?`,
        options: [
            { 
                id: 'cancel', 
                text: "Anuluj proces (negatywne konsekwencje dla obu firm)", 
                consequence: () => { 
                    cancelMerger(stock1, "Anulowano z powodu komplikacji."); 
                    cancelMerger(stock2, "Anulowano z powodu komplikacji."); 
                } 
            },
            { 
                id: 'expensive', 
                text: "Kontynuuj mimo wszystko (proces będzie droższy o 25% i potrwa dłużej)", 
                consequence: () => { 
                    process.costs *= 1.25; 
                    process.complications = 0; 
                    process.decisionRequired = null; 
                    process.statusMessage = "Kontynuacja mimo kosztów...";
                    // Zaktualizuj partnera
                    const partner = stocks.find(s => s.symbol === process.partnerSymbol);
                    if(partner && partner.mergerProcess) {
                        partner.mergerProcess.costs = process.costs;
                        partner.mergerProcess.complications = 0;
                        partner.mergerProcess.decisionRequired = null;
                        partner.mergerProcess.statusMessage = process.statusMessage;
                    }
                } 
            },
            { 
                id: 'stronger', 
                text: "Wykorzystaj kryzys, by wzmocnić współpracę (Ryzyko: 70% szans na anulowanie, 30% na bonus)", 
                consequence: () => { 
                    process.complications = 0; 
                    process.decisionRequired = null; 
                    const partner = stocks.find(s => s.symbol === process.partnerSymbol);
                    if (Math.random() < 0.3) { 
                        // Sukces - bonus
                        triggerMergerMiniEvent(stock1, partner, process); // Wywołaj pozytywny mini-event
                        process.statusMessage = "Kryzys wzmocnił współpracę!";
                        if(partner && partner.mergerProcess) partner.mergerProcess.statusMessage = process.statusMessage;
                    } else { 
                        // Porażka - anuluj
                        cancelMerger(stock1, "Nie udało się przezwyciężyć kryzysu."); 
                        cancelMerger(partner, "Nie udało się przezwyciężyć kryzysu."); 
                    } 
                } 
            }
        ]
    };
    
    // Zapisz dane decyzyjne w procesie
    process.decisionRequired = decisionData;
    if (stock2.mergerProcess) {
        stock2.mergerProcess.decisionRequired = decisionData;
    }

    logEvent(`[M&A] 🔴 Poważne komplikacje w procesie ${stock1.symbol} <-> ${stock2.symbol}! Wymagana decyzja.`, 'warning');

    // Sprawdź, czy gracz jest właścicielem >50% którejkolwiek ze spółek
    const playerOwnsStock1 = playerPortfolio[stock1.symbol] && (playerPortfolio[stock1.symbol].shares / stock1.totalShares) > 0.5;
    const playerOwnsStock2 = playerPortfolio[stock2.symbol] && (playerPortfolio[stock2.symbol].shares / stock2.totalShares) > 0.5;

    if (playerOwnsStock1 || playerOwnsStock2) {
        // --- GRACZ DECYDUJE ---
        // Wybierz spółkę, którą kontroluje gracz, aby przekazać ją do modala
        const playerControlledStock = playerOwnsStock1 ? stock1 : stock2;
        console.log(`[M&A] Otwieranie modala decyzyjnego dla gracza (spółka ${playerControlledStock.symbol}).`);
        // Użyj funkcji z ui.js, aby otworzyć modal
        openComplicationModal(playerControlledStock, decisionData);

    } else {
        // --- AI DECYDUJE ---
        // TODO: Symuluj decyzję AI (np. na podstawie osobowości właściciela lub losowo)
        // Na razie wybieramy losową opcję po 3 sekundach (dla symulacji)
        console.log(`[M&A AI Decision] AI zastanawia się nad komplikacją...`);
        setTimeout(() => {
            // Sprawdź, czy proces nadal istnieje (gracz mógł go zobaczyć i anulować ręcznie?)
            if (stock1.mergerProcess && stock1.mergerProcess.decisionRequired) {
                 const randomChoice = getRandomElement(decisionData.options);
                 console.log(`[M&A AI Decision] AI zdecydowało: ${randomChoice.text}`);
                 randomChoice.consequence(); // Wykonaj konsekwencję
            }
        }, 3000); // 3 sekundy opóźnienia na decyzję AI
    }
}

function checkAntitrust(stock1, stock2) {
    // 1. Sprawdź, czy urząd w ogóle analizuje tę sprawę
    if (Math.random() > antitrustOffice.analysisCapacity) {
        console.log(`[Antymonopol] Urząd nie zainteresował się fuzją ${stock1.symbol} i ${stock2.symbol}.`);
        return false; // Urząd nie podjął analizy
    }

    console.log(`[Antymonopol] Urząd analizuje potencjalną fuzję ${stock1.symbol} i ${stock2.symbol}...`);
    logEvent(`⚖️ Urząd Antymonopolowy przygląda się planom połączenia ${stock1.name} i ${stock2.name}...`, 'state');

    // 2. Oblicz potencjalny udział rynkowy połączonej firmy (uproszczony)
    const combinedMarketCap = (stock1.price * stock1.totalShares) + (stock2.price * stock2.totalShares);
    const commonSectors = stock1.sector.filter(s => stock2.sector.includes(s)); // Znajdź wspólne sektory
    let potentialMarketShare = 0;

    if (commonSectors.length > 0) {
        // Oblicz całkowitą kapitalizację we wspólnym sektorze (głównym)
        const sector = commonSectors[0];
        const sectorTotalMarketCap = stocks
            .filter(s => !s.assetType && !s.isBankrupt && s.sector.includes(sector))
            .reduce((sum, s) => sum + (s.price * s.totalShares), 0);

        if (sectorTotalMarketCap > 0) {
            potentialMarketShare = combinedMarketCap / sectorTotalMarketCap;
        }
    } else {
        // Jeśli brak wspólnych sektorów (fuzja konglomeratowa), ryzyko monopolu jest niskie
        potentialMarketShare = 0.1; // Przykładowo niskie ryzyko
    }

    // 3. Określ próg blokady (np. 40% udziału w rynku)
    const blockThreshold = 0.40;
    const shouldBlock = potentialMarketShare >= blockThreshold;

    // 4. Losuj decyzję urzędu (uwzględniając jego dokładność)
    let blockDecision = false;
    if (shouldBlock) {
        // Jeśli udział przekracza próg, jest szansa na blokadę (zależna od accuracy)
        blockDecision = Math.random() < antitrustOffice.accuracy;
    } else {
        // Jeśli udział jest niski, jest mała szansa na BŁĘDNĄ blokadę (1 - accuracy)
        blockDecision = Math.random() < (1 - antitrustOffice.accuracy) * 0.1; // Mała szansa na błąd
    }

    // 5. Zastosuj i zwróć decyzję
    if (blockDecision) {
        logEvent(`⚖️ BLOKADA! Urząd Antymonopolowy blokuje połączenie ${stock1.name} i ${stock2.name} z powodu ryzyka monopolu!`, 'state');
        showToast(`Urząd Antymonopolowy zablokował fuzję ${stock1.symbol}-${stock2.symbol}!`, 'error');
        // TODO: Opcjonalnie: Można nałożyć karę finansową na inicjatora
        return true; // Fuzja zablokowana
    } else {
        console.log(`[Antymonopol] Urząd zezwolił na połączenie ${stock1.symbol} i ${stock2.symbol}.`);
        logEvent(`⚖️ Urząd Antymonopolowy nie widzi przeciwwskazań dla połączenia ${stock1.name} i ${stock2.name}.`, 'state');
        return false; // Fuzja dozwolona
    }
}

// operacje bankowe

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

function runDebtCollectorAI() {
    const collectors = stocks.filter(s => s.assetType === 'DebtCollector' && !s.isBankrupt && s.cash > 20000); // Musi mieć gotówkę
    if (collectors.length === 0) return;

    // Zbierz wszystkie potencjalne długi (tylko bankowe z problemami)
    const potentialDebts = [];
    
    // Długi Gracza
    playerCommercialLoans.forEach(loan => {
        if (loan.bankId && (loan.missedPayments || 0) > 0) { // Tylko długi bankowe z pominiętymi ratami
            potentialDebts.push({ entity: 'player', loan: loan });
        }
    });

    // Długi AI
    aiCompetitors.forEach(ai => {
        if (ai.loans) {
            ai.loans.forEach(loan => {
                if (loan.bankId && (loan.missedPayments || 0) > 0) {
                    potentialDebts.push({ entity: ai, loan: loan });
                }
            });
        }
    });

    if (potentialDebts.length === 0) return; // Brak długów do przejęcia

    // Każdy windykator próbuje złożyć jedną ofertę
    collectors.forEach(collector => {
        // Niska szansa na działanie w każdym cyklu
        if (Math.random() < 0.1) { 
            const targetDebtInfo = getRandomElement(potentialDebts);
            const loan = targetDebtInfo.loan;

            // Sprawdź, czy oferta nie była niedawno składana
            const now = Date.now();
            if (loan.offerCooldown && now < loan.offerCooldown) {
                return; // Pomiń, ten dług jest na cooldownie
            }

            // Sprawdź, czy windykatora stać
            if (collector.cash >= loan.amount) {
                createDebtTakeoverOffer(collector, targetDebtInfo.entity, loan);
            }
        }
    });
}

function createDebtTakeoverOffer(collectorStock, targetEntity, loan) {
    const newInterestRate = loan.interestRate * 1.5; // Przykładowo: 50% wyższe oprocentowanie
    const offerCooldownTime = BASE_DELAYS.quarterly / currentSpeedMultiplier; // Cooldown na kwartał

    loan.offerCooldown = Date.now() + offerCooldownTime; // Ustaw cooldown, aby nie spamować

    if (targetEntity === 'player') {
        // Sprawdź, czy gracz nie ma już innej oferty
        if (currentDebtOffer) return; 
        
        // Zapisz ofertę globalnie, aby przyciski UI wiedziały, co robić
        currentDebtOffer = {
            collectorSymbol: collectorStock.symbol,
            loanId: loan.id,
            newInterestRate: newInterestRate
        };
        // Otwórz modal w UI
        openDebtOfferModal(collectorStock, loan, newInterestRate);
    } else {
        // To jest AI, wywołaj logikę decyzyjną AI
        aiDecideOnDebtOffer(targetEntity, collectorStock, loan, newInterestRate);
    }
}

function runPawnShopAI() {
    const pawnShops = stocks.filter(s => s.assetType === 'PawnShop' && !s.isBankrupt && s.cash > 50000); // Musi mieć gotówkę na pożyczki
    if (pawnShops.length === 0) return;

    // Zbierz potencjalnych klientów (Gracz i AI, którzy mają kłopoty LUB cenne akcje)
    const potentialClients = [];
    
    // Sprawdź Gracza
    const playerNetWorth = calculateNetWorth('player');
    const playerCashRatio = playerCash / playerNetWorth;
    const playerHasDebt = playerCommercialLoans.some(l => (l.missedPayments || 0) > 0);
    if (playerCashRatio < 0.1 || playerHasDebt) { // Jeśli gracz ma kłopoty
        for (const symbol in playerPortfolio) {
            const holding = playerPortfolio[symbol];
            // Szukaj wartościowych, niezablokowanych akcji
            if (holding.shares > 0 && !holding.assetType && !holding.lockedShares) {
                const stock = stocks.find(s => s.symbol === symbol);
                if (stock && stock.price * holding.shares > 1000) { // Jeśli pakiet jest wart > 1000 PLN
                    potentialClients.push({ entity: 'player', stockToPawn: stock, holding: holding });
                    break; // Wystarczy jedna oferta na raz dla gracza
                }
            }
        }
    }

    // Sprawdź AI
    aiCompetitors.forEach(ai => {
        const aiNetWorth = calculateNetWorth(ai);
        const aiCashRatio = ai.cash / aiNetWorth;
        const aiHasDebt = ai.loans && ai.loans.some(l => (l.missedPayments || 0) > 0);
        if (aiCashRatio < 0.1 || aiHasDebt) {
            for (const symbol in ai.portfolio) {
                const holding = ai.portfolio[symbol];
                if (holding.shares > 0 && !holding.assetType && !holding.lockedShares) {
                    const stock = stocks.find(s => s.symbol === symbol);
                    if (stock && stock.price * holding.shares > 1000) {
                        potentialClients.push({ entity: ai, stockToPawn: stock, holding: holding });
                        break; 
                    }
                }
            }
        }
    });

    if (potentialClients.length === 0) return; // Brak celów

    // Każdy lombard składa jedną ofertę
    pawnShops.forEach(pawnShop => {
        if (Math.random() < 0.05) { // Niska szansa (5%) na ofertę w tygodniu
            const targetClient = getRandomElement(potentialClients);
            const loanAmount = (targetClient.stockToPawn.price * targetClient.holding.shares) * 0.4; // Pożyczka 40% wartości akcji
            
            if (pawnShop.cash >= loanAmount) {
                createPawnLoanOffer(pawnShop, targetClient.entity, targetClient.stockToPawn, targetClient.holding, loanAmount);
            }
        }
    });
}

function createPawnLoanOffer(pawnShop, targetEntity, stockToPawn, holding, loanAmount) {
    // Lombardy mają bardzo wysokie oprocentowanie
    const newInterestRate = 0.25; // 25% rocznie (stałe)
    const durationWeeks = 12; // 12 tygodni (kwartał) na spłatę

    // Zastawiamy wszystkie posiadane akcje danej spółki (uproszczenie)
    const quantity = holding.shares;
    
    // Ustaw cooldown na ofercie dla tej konkretnej spółki w portfelu
    const now = Date.now();
    const offerCooldownTime = BASE_DELAYS.quarterly / currentSpeedMultiplier;
    // Potrzebujemy miejsca do zapisania cooldownu - użyjmy obiektu stockToPawn
    if (!stockToPawn.pawnOfferCooldown) stockToPawn.pawnOfferCooldown = {};
    const entityId = (targetEntity === 'player') ? 'player' : targetEntity.id;
    
    if (stockToPawn.pawnOfferCooldown[entityId] && now < stockToPawn.pawnOfferCooldown[entityId]) {
        return; // Pomiń, ten cel jest na cooldownie
    }
    stockToPawn.pawnOfferCooldown[entityId] = now + offerCooldownTime;


    if (targetEntity === 'player') {
        if (currentPawnOffer) return; // Już jest aktywna oferta dla gracza
        
        currentPawnOffer = {
            pawnShopSymbol: pawnShop.symbol,
            targetStockSymbol: stockToPawn.symbol,
            quantity: quantity,
            loanAmount: loanAmount,
            newInterestRate: newInterestRate,
            durationWeeks: durationWeeks
        };
        // Otwórz modal w UI
        openPawnOfferModal(pawnShop, stockToPawn, quantity, loanAmount, newInterestRate, durationWeeks);
    } else {
        // To jest AI
        aiDecideOnPawnOffer(targetEntity, pawnShop, stockToPawn, quantity, loanAmount, newInterestRate, durationWeeks);
    }
}

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

function issueRescueBond(stock) {
    // Oblicz, ile kapitału potrzeba (np. 30% obecnego długu)
    const capitalNeeded = stock.balanceSheet.liabilities * 0.3;
    if (capitalNeeded <= 0) return; // Nie emituj, jeśli nie ma długu lub potrzeba 0

    const faceValue = 1000;
    const quantityToIssue = Math.ceil(capitalNeeded / faceValue);
    if (quantityToIssue <= 0) return;

    // Wyższe oprocentowanie i ryzyko zależne od kondycji
    const baseInterest = 0.08; // Wyższa baza niż normalnie
    const healthPenaltyInterest = Math.abs(stock.financialHealth) * 0.015; // +1.5% za każdy pkt poniżej 0
    const volatilityRiskBonus = stock.volatilityFactor * 0.05; // Ryzyko rośnie ze zmiennością
    const finalInterest = baseInterest + healthPenaltyInterest;
    const finalRisk = Math.min(0.9, 0.3 + Math.abs(stock.financialHealth) * 0.1 + volatilityRiskBonus); // Ryzyko 30%-90%

    const duration = getRandomIntInRange(15, 35); // Krótszy/Średni termin

    const newBondOffer = {
        id: `res_bond_${stock.symbol}_${Date.now()}`,
        issuerName: `${stock.name} (Ratunkowa)`, // Oznacz nazwę
        issuerSymbol: stock.symbol, // ---> WAŻNE: Dodaj symbol emitenta <---
        type: 'Korporacyjna Ratunkowa 🆘', // Oznacz typ
        interestRate: finalInterest,
        durationMinutes: duration,
        risk: finalRisk,
        faceValue: faceValue,
        available: quantityToIssue,
        isRescueBond: true // ---> Dodaj flagę <---
    };

    activeBonds.push(newBondOffer);
    logEvent(`🆘 Emisja Ratunkowa Obligacji! ${stock.name} emituje ${quantityToIssue} obligacji (${(finalInterest * 100).toFixed(1)}%, Ryzyko: ${(finalRisk * 100).toFixed(0)}%) by pokryć długi!`, 'market');
    showToast(`🆘 ${stock.name} emituje obligacje ratunkowe!`, 'warning');

    // Zapobiegaj natychmiastowej kolejnej emisji (np. cooldown na kwartał)
    stock.rescueActionCooldown = Date.now() + BASE_DELAYS.quarterly / currentSpeedMultiplier;

    // Odśwież widok rynku obligacji, jeśli otwarty
    if (document.getElementById('bank-modal')?.style.display === 'block' && document.getElementById('bank-content-bonds')?.style.display === 'block') {
        if (typeof renderBondMarketInBank === 'function') renderBondMarketInBank();
    }
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

function applyTechnology(stock, techId) {
    const tech = technologies[techId];
    if (!tech) return;

    // Zastosuj efekt ukończonej technologii
    tech.applyEffect(stock);
    stock.research.unlockedTechs.push(techId);

    // Zresetuj flagę pauzy, jeśli była aktywna
    stock.research.researchPaused = false;

    // --- KLUCZOWA LOGIKA DECYZYJNA (rozpoczęcie następnego badania) ---
    // Sprawdź, czy gracz ma odblokowaną możliwość ingerencji (Tier 5)
    if (stock.researchUnlocks.canInterfere) {
        // Tak, gracz ma kontrolę. Wstrzymaj badania i ustaw timer na decyzję.
        stock.research.currentTech = null;
        stock.research.progress = 0;
        // Ustaw timer na 15 sekund RZECZYWISTEGO czasu (niezależnie od prędkości gry)
        stock.research.choiceAvailableUntil = Date.now() + 15000;
        logEvent(`🔬 ${stock.name} kończy badania nad "${tech.name}" i czeka na Twoją decyzję co do następnego projektu! Masz 15 sekund.`);
        showToast(`${stock.name}: Wybierz następny projekt R&D!`, 'default', 10000);
        // Odśwież modale, jeśli są otwarte, aby pokazać opcje wyboru
        if (document.getElementById('research-modal')?.style.display === 'block') openResearchModal(stock.symbol);
        if (document.getElementById('management-modal')?.style.display === 'block') openManagementModal(stock.symbol);

    } else {
        // Nie, gracz nie ma kontroli (lub umiejętność nie jest odblokowana). Wybierz losowo.
        // Znajdź dostępne technologie w tej samej specjalizacji
        const availableTechs = Object.keys(technologies).filter(id =>
            !stock.research.unlockedTechs.includes(id) && // Jeszcze nie zbadana
            (technologies[id].sector === 'common' || stock.sector.includes(technologies[id].sector)) && // Pasuje do sektora
            technologies[id].type === stock.research.specialization // Pasuje do specjalizacji
        );

        if (availableTechs.length > 0) {
            // Jest co badać - wybierz losowo i sprawdź koszt
            const nextTechId = getRandomElement(availableTechs);
            const nextTech = technologies[nextTechId];
            const initialCost = nextTech.initialCashCost || 0;

            if (stock.cash >= initialCost) {
                // Stać firmę, rozpocznij badania
                stock.cash -= initialCost;
                stock.research.currentTech = nextTechId;
                stock.research.progress = 0;
                stock.research.isResearching = true; // Upewnij się, że badania są aktywne
                logEvent(`💸 ${stock.name} inwestuje ${initialCost.toFixed(0)} PLN w rozpoczęcie badań nad "${nextTech.name}".`, 'company');
                logEvent(`🔬 ${stock.name} automatycznie rozpoczyna nowe badania nad technologią: "${nextTech.name}".`);
            } else {
                // Nie stać firmy, wstrzymaj badania
                stock.research.isResearching = false;
                stock.research.currentTech = null;
                logEvent(`📉 ${stock.name} zakończył(a) badania, ale nie ma środków (${initialCost.toFixed(0)} PLN), aby rozpocząć następny projekt. Badania wstrzymane.`, 'company');
            }
        } else {
            // Brak dostępnych technologii w tej specjalizacji
            stock.research.isResearching = false;
            stock.research.currentTech = null;
            logEvent(`🔬 ${stock.name} zakończył wszystkie dostępne badania w swojej specjalizacji.`);
        }
    }
}

// Funkcja pomocnicza do rozpoczynania kolejnej inwestycji bankowej
function startNextBankInvestment(stock, nextInvestmentId, bankData) {
    const nextInvestment = bankInvestments[nextInvestmentId];
    const completedCount = stock.research.completedInvestments[nextInvestmentId] || 0;
    const requiredProgress = nextInvestment.baseCost + (completedCount * nextInvestment.increaseDurationPoints);
    const initialCashCost = nextInvestment.initialCashCost || 0;

    stock.research.currentInvestmentId = nextInvestmentId;
    stock.research.progress = 0;
    stock.research.requiredProgress = requiredProgress; // Zapisz wymagany postęp dla tej realizacji
    stock.research.investmentPaused = false; // Resetuj pauzę

    // Sprawdź, czy bank stać na rozpoczęcie
    if (bankData.cash >= initialCashCost) {
        bankData.cash -= initialCashCost;
        stock.research.isResearching = true;
        if(initialCashCost > 0) logEvent(`💸 Bank ${stock.name} rozpoczyna kolejną inwestycję: "${nextInvestment.name}" (Poziom ${completedCount + 1}) kosztem ${initialCashCost.toLocaleString()} PLN. Czas: ${Math.round(requiredProgress / BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE)} min.`);
        else logEvent(`▶️ Bank ${stock.name} rozpoczyna kolejną inwestycję: "${nextInvestment.name}" (Poziom ${completedCount + 1}). Czas: ${Math.round(requiredProgress / BANK_INVESTMENT_POINT_EQUIVALENT_MINUTE)} min.`);
    } else {
        stock.research.isResearching = false;
        stock.research.investmentPaused = true; // Zapauzuj
        logEvent(`⏸️ Bank ${stock.name} chciał rozpocząć inwestycję "${nextInvestment.name}", ale brakuje środków (${initialCashCost.toLocaleString()} PLN). Inwestycje wstrzymane.`);
    }
}

function applyBankInvestmentEffect(stock, completedInvestmentId) {
    const investment = bankInvestments[completedInvestmentId];
    const bankData = commercialBanks.find(b => b.id === stock.bankData.id);

    if (!investment || !bankData) {
        console.error(`Błąd przy aplikowaniu efektu inwestycji ${completedInvestmentId} dla ${stock.symbol}`);
        stock.research.isResearching = false; // Zatrzymaj proces w razie błędu
        return;
    }

    // 1. Zastosuj efekt ukończonej inwestycji
    investment.applyEffect(stock, bankData);

    // 2. Zaktualizuj licznik ukończonych
    stock.research.completedInvestments[completedInvestmentId]++;
    const currentLevel = stock.research.completedInvestments[completedInvestmentId];
    logEvent(`✅ Bank ${stock.name} zakończył inwestycję "${investment.name}" (Poziom ${currentLevel}).`);

    // 3. Sprawdź, czy osiągnięto maksymalny poziom
    if (investment.maxLevel && currentLevel >= investment.maxLevel) {
        logEvent(`ℹ️ Bank ${stock.name} osiągnął maksymalny poziom inwestycji "${investment.name}".`);
        // Wybierz inną inwestycję (która nie jest na max poziomie)
        const availableInvestmentIds = Object.keys(bankInvestments).filter(id => {
            const inv = bankInvestments[id];
            const completedCount = stock.research.completedInvestments[id] || 0;
            return !inv.maxLevel || completedCount < inv.maxLevel;
        });
        if (availableInvestmentIds.length === 0) {
            logEvent(`🎉 Bank ${stock.name} zrealizował wszystkie dostępne inwestycje!`);
            stock.research.isResearching = false;
            stock.research.currentInvestmentId = null;
            return;
        }
        const nextInvestmentId = getRandomElement(availableInvestmentIds);
        startNextBankInvestment(stock, nextInvestmentId, bankData);

    } else {
        // 4. Wybierz losowo następną inwestycję (może być ta sama)
        const availableInvestmentIds = Object.keys(bankInvestments).filter(id => {
            const inv = bankInvestments[id];
            const completedCount = stock.research.completedInvestments[id] || 0;
            return !inv.maxLevel || completedCount < inv.maxLevel; // Tylko te, które nie są na max poziomie
        });
         if (availableInvestmentIds.length === 0) { // Na wszelki wypadek
            logEvent(`🎉 Bank ${stock.name} zrealizował wszystkie dostępne inwestycje!`);
            stock.research.isResearching = false;
            stock.research.currentInvestmentId = null;
            return;
        }
        const nextInvestmentId = getRandomElement(availableInvestmentIds);
        startNextBankInvestment(stock, nextInvestmentId, bankData);
    }
}

function updateResearchProgress(deltaTime) {
    const researchPoints = deltaTime / 2500; // Ilość punktów postępu w tym cyklu

    stocks.forEach(stock => {
        // Pomiń, jeśli spółka nie ma systemu badań/inwestycji lub nie jest aktywny
        if (!stock.research || !stock.research.isResearching) return;

        // --- Logika dla Inwestycji Bankowych ---
        if (stock.research.isInvestment) {
            if (stock.research.currentInvestmentId) {
                // Dodaj punkty postępu
                stock.research.progress += researchPoints; // Banki na razie bez mnożników prędkości

                // Sprawdź, czy inwestycja została ukończona
                if (stock.research.progress >= stock.research.requiredProgress) {
                    applyBankInvestmentEffect(stock, stock.research.currentInvestmentId);
                }
            }
        }
        // --- Logika dla Standardowego R&D ---
        else {
            if (stock.research.currentTech) {
                const baseSpeedMultiplier = stock.research.researchSpeedMultiplier || 1.0;
                let ceoMultiplier = 1.0;
                // ... (istniejąca logika obliczania ceoMultiplier na podstawie cech) ...
                if (stock.ceo && stock.ceo.traits) {
                    if (stock.ceo.traits.some(t => t.id === 'wizjoner')) ceoMultiplier *= 1.10;
                    if (stock.ceo.traits.some(t => t.id === 'glowa_w_chmurach')) ceoMultiplier *= 0.95;
                    if (stock.ceo.traits.some(t => t.id === 'geniusz_innowacji')) ceoMultiplier *= 1.25;
                    if (stock.ceo.traits.some(t => t.id === 'biurowy_dron')) ceoMultiplier *= 1.05;
                    if (stock.ceo.traits.some(t => t.id === 'ksiegowy')) ceoMultiplier *= 0.95;
                    if (stock.ceo.traits.some(t => t.id === 'lowca_glow')) ceoMultiplier *= 1.10;
                }

                let phaseMultiplier = 1.0;
                if (stock.corporatePhase === CORPORATE_PHASES.INNOVATION_PUSH) {
                    phaseMultiplier = 1.5; // +50% prędkości badań
                } else if (stock.corporatePhase === CORPORATE_PHASES.DECLINE || stock.corporatePhase === CORPORATE_PHASES.SHADOW_DESCENT) {
                     phaseMultiplier = 0.7; // -30% prędkości w fazie spadku
                }

                // Dodaj punkty postępu
                stock.research.progress += researchPoints * baseSpeedMultiplier * ceoMultiplier;

                // Sprawdź, czy badanie zostało ukończone
                const currentTechCost = technologies[stock.research.currentTech]?.cost;
                if (currentTechCost && stock.research.progress >= currentTechCost) {
                    logEvent(`💡 PRZEŁOM! ${stock.name} zakończył badania nad technologią: "${technologies[stock.research.currentTech].name}"!`);
                    applyTechnology(stock, stock.research.currentTech); // Wywołaj starą funkcję
                }
            }
        }
    });
}

function chooseNextResearch(symbol, chosenTechId) {
    const stock = stocks.find(s => s.symbol === symbol);
    const tech = technologies[chosenTechId];

    if (!stock || !tech) return;

    // ---> NOWE SPRAWDZENIE KOSZTU POCZĄTKOWEGO <---
    const initialCost = tech.initialCashCost || 0;
    if (stock.cash < initialCost) {
        logEvent(`📉 ${stock.name} nie ma wystarczająco środków (${initialCost.toFixed(0)} PLN), aby rozpocząć badania nad "${tech.name}". Badania wstrzymane.`, 'company');
        showToast(`Brak środków w ${stock.name} na rozpoczęcie badań!`, 'warning');
        stock.research.currentTech = null; // Anuluj wybór technologii
        stock.research.isResearching = false;
        stock.research.choiceAvailableUntil = null; // Zresetuj timer wyboru, jeśli był aktywny
        // Odśwież modale, jeśli są otwarte
        if (document.getElementById('research-modal')?.style.display === 'block') openResearchModal(symbol);
        if (document.getElementById('management-modal')?.style.display === 'block') openManagementModal(symbol);
        return; // Zakończ funkcję
    }

    // Jeśli firmę stać, pobierz koszt i kontynuuj
    stock.cash -= initialCost;
    logEvent(`💸 ${stock.name} inwestuje ${initialCost.toFixed(0)} PLN w rozpoczęcie badań nad "${tech.name}".`, 'company');
    // ---> KONIEC NOWEGO SPRAWDZENIA <---

    stock.research.currentTech = chosenTechId;
    stock.research.progress = 0;
    stock.research.isResearching = true; // Upewnij się, że badania są aktywne
    stock.research.researchPaused = false; // Upewnij się, że nie są zapauzowane
    stock.research.choiceAvailableUntil = null; // Zresetuj timer wyboru

    logEvent(`🔬 ${stock.name} rozpoczyna badania nad wybraną technologią: "${tech.name}".`, 'review');
    showToast(`Rozpoczęto nowy projekt badawczy w ${stock.name}!`, 'success');

    // Odśwież modale
    if (document.getElementById('research-modal')?.style.display === 'block') openResearchModal(symbol);
    if (document.getElementById('management-modal')?.style.display === 'block') openManagementModal(symbol);
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

function updateResearchInstitutes() {
    // 1. Policz wszystkie technologie odblokowane przez inne firmy
    const totalTechsByType = {
        'wzmacnianie rozwoju': 0,
        'wzmacnianie pozycji na rynku': 0,
        'wzmacnianie ceny i zysków': 0
    };
    
    stocks.filter(s =>
            s.assetType !== 'ResearchInstitute' && // Nie licz instytutów
            s.research &&                           // Upewnij się, że obiekt research istnieje
            s.research.unlockedTechs &&             // Upewnij się, że tablica unlockedTechs istnieje
            s.research.unlockedTechs.length > 0     // Dopiero teraz sprawdź długość
          )
          .forEach(s => {
              s.research.unlockedTechs.forEach(techId => {
                  const tech = technologies[techId];
                  // Sprawdź, czy technologia istnieje i ma poprawny typ
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

    playerCash -= operationCost;
    displayCash(); // Natychmiast zaktualizuj gotówkę
    logEvent(`💸 Pobrano ${operationCost.toFixed(2)} PLN za próbę zwołania walnego zgromadzenia w ${stock.name}.`, 'review');


    const playerShares = playerPortfolio[symbol]?.shares || 0;
    const ownershipPct = (playerShares / stock.totalShares) * 100;
    const baseChance = 0.50;
    const bonusChance = (ownershipPct - 50) * 0.01;
    const successChance = Math.min(1.0, baseChance + bonusChance);

    if (Math.random() < successChance) {
        
        const oldCeo = stock.ceo; // Zapisujemy cały obiekt starego CEO
        replaceCeo(stock, chosenCandidate); // Przekazujemy wybranego kandydata
        logEvent(`👑 Zmiana warty w ${stock.name}! Po Twojej interwencji powołano nowego prezesa.`, 'review');
        showToast(`Sukces! W ${stock.name} powołano nowego prezesa.`, 'success');

       
        changeReputation('player', symbol, -10); // -10 za udaną "intrygę"

    } else {
        
        logEvent(`👑 Twoja próba powołania nowego prezesa w ${stock.name} nie powiodła się. Rada nadzorcza odrzuciła kandydaturę.`, 'review');
        showToast("Porażka! Rada nadzorcza zablokowała Twoją decyzję.", 'error');

        
        changeReputation('player', symbol, -25); // -25 za nieudaną próbę (wygląda to źle)
    }

    
    stock.ceo.fireCooldown = Date.now() + (BASE_DELAYS.quarterly * 2 / currentSpeedMultiplier);
    delete stock.ceoCandidates;
    openManagementModal(symbol); // Odśwież widok
}


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

function makeSubsidiary(parentStock, childStock) {
    if (!parentStock || !childStock || childStock.isSubsidiaryOf) {
        console.warn(`[makeSubsidiary] Błąd: Nie można utworzyć zależności dla ${parentStock?.symbol} -> ${childStock?.symbol}`);
        return; // Zabezpieczenie przed błędami lub ponownym ustawieniem
    }

    // Ustaw flagę zależności
    childStock.isSubsidiaryOf = parentStock.symbol;

    // Dodaj do listy spółek zależnych rodzica (jeśli lista nie istnieje, stwórz ją)
    if (!parentStock.subsidiaries) {
        parentStock.subsidiaries = [];
    }
    // Upewnij się, że nie dodajemy duplikatu
    if (!parentStock.subsidiaries.includes(childStock.symbol)) {
        parentStock.subsidiaries.push(childStock.symbol);
    }

    // Zresetuj proces fuzji/przejęcia, jeśli jakiś był aktywny (na wypadek, gdyby to był wynik wpływu)
    childStock.mergerProcess = null;
    parentStock.mergerProcess = null; // Zresetuj też rodzica na wszelki wypadek

    // Zaloguj zdarzenie
    logEvent(`🏢 Spółka ${childStock.name} (${childStock.symbol}) stała się spółką zależną od ${parentStock.name} (${parentStock.symbol}) z powodu dominującego wpływu!`, 'review');
    showToast(`${childStock.name} jest teraz zależna od ${parentStock.name}!`, 'warning');

    // Opcjonalnie: Można tutaj dodać natychmiastowe efekty, np.
    // - Lekki boost dla ceny parentStock
    // - Lekki spadek zmienności childStock (większa stabilność pod kontrolą)
    applyPriceEffect(parentStock.symbol, 0.02, 'positive'); // +2% dla rodzica
    childStock.volatilityFactor *= 0.9; // Spółka zależna staje się stabilniejsza

    // Odśwież UI, aby pokazać zmiany (np. wcięcie w tabeli)
    displayStocks(getCurrentInputValues());
    // Jeśli modal zarządzania jest otwarty dla którejś z tych spółek, odśwież go
    if (document.getElementById('management-modal')?.style.display === 'block') {
         const currentSymbol = document.getElementById('management-modal').dataset.currentSymbol;
         if(currentSymbol === parentStock.symbol || currentSymbol === childStock.symbol) {
             openManagementModal(currentSymbol);
         }
    }
     // Odśwież też opis, jeśli jest otwarty
    if (document.getElementById('description-modal')?.style.display === 'block') {
        const currentSymbol = document.getElementById('description-modal-title').textContent.match(/\(([^)]+)\)/)?.[1];
         if(currentSymbol === parentStock.symbol || currentSymbol === childStock.symbol) {
             openDescriptionModal(currentSymbol);
         }
    }
}

function updateInfluence() {
    // 1. Filtruj aktywne, niezależne spółki, które mają system wpływów
    const regularStocks = stocks.filter(s => s.influence && !s.isSubsidiaryOf);

    // 2. Oblicz wywierany wpływ (tylko od aktywnych)
    regularStocks.forEach(sourceStock => {
        sourceStock.influence.exerted = {}; // Resetuj wywierany wpływ
        const sourceMarketCap = sourceStock.price * sourceStock.totalShares;

        // Wpływ jest wywierany na WSZYSTKIE spółki (nawet zależne, ale nie na siebie)
        stocks.filter(s => s.influence && s.symbol !== sourceStock.symbol).forEach(targetStock => {
            const targetMarketCap = targetStock.price * targetStock.totalShares;
            let currentInfluence = 0;

            // 1. Wpływ rozmiaru
            if (sourceMarketCap > targetMarketCap) {
                currentInfluence += (sourceMarketCap / targetMarketCap - 1) * 2;
            }
            // 2. Wpływ kondycji
            currentInfluence += (sourceStock.financialHealth - targetStock.financialHealth) * 0.5;

            // 3. Wpływ posiadanych akcji (Holdingi)
            if (sourceStock.assetType === 'Holding' && sourceStock.holdingPortfolio[targetStock.symbol]) {
                const sharesHeld = sourceStock.holdingPortfolio[targetStock.symbol].quantity;
                const ownershipPct = (sharesHeld / targetStock.totalShares) * 100;
                currentInfluence += ownershipPct * 0.5;
            }
            
            // 4. Cechy CEO
            if (sourceStock.ceo?.traits?.some(t => t.id === 'rekin')) {
                currentInfluence *= 1.1;
            }

            // Ograniczenie i zapis
            currentInfluence = Math.max(0, Math.round(currentInfluence));
            if (currentInfluence > 0) {
                sourceStock.influence.exerted[targetStock.symbol] = currentInfluence;
            }
        });
    });

    // 3. Agreguj otrzymywany wpływ dla WSZYSTKICH spółek (nawet zależnych)
    stocks.filter(s => s.influence).forEach(targetStock => {
        targetStock.influence.received = {};
        targetStock.influence.totalReceived = 0;
        // Sprawdź wpływ od wszystkich regularnych (niezależnych) spółek
        regularStocks.forEach(sourceStock => {
            if (sourceStock.influence.exerted[targetStock.symbol]) {
                const received = sourceStock.influence.exerted[targetStock.symbol];
                targetStock.influence.received[sourceStock.symbol] = received;
                targetStock.influence.totalReceived += received;
            }
        });
    });
}

function runMunicipalCompanyLogic() {
    if (Math.random() > 0.20) { // 20% szans rocznie na IPO
        return;
    }

    const targetCompany = getRandomElement(municipalCompanies);
    if (!targetCompany) return;

    // Spółka wchodzi na giełdę
    logEvent(`🎉 IPO SPÓŁKI MIEJSKIEJ! ${targetCompany.name} wchodzi na Giełdę Brązową!`, 'success');

    const cityOwnershipPct = getRandomInRange(0.51, 0.95); // Miasto trzyma 51-95%
    const totalShares = getRandomIntInRange(20000, 50000);
    const initialPrice = (targetCompany.budget + targetCompany.baseIncome * 5) / totalShares; // Prosta wycena

    const newStock = {
        name: targetCompany.name,
        price: Math.max(10, initialPrice), // Cena min. 10 PLN
        volatilityFactor: getRandomInRange(0.2, 0.5), // Bardzo stabilne
        symbol: targetCompany.id,
        exchange: 'BRONZE', 
        totalShares: totalShares,
        maxShares: totalShares * 2,
        sharesHeld: Math.floor(totalShares * cityOwnershipPct), // Akcje "zajęte" przez miasto
        sector: ['Usługi', 'Nieruchomości'], // Uogólniony sektor
        financialHealth: 5, // Bardzo zdrowe
        lastReport: 'good',
        cash: targetCompany.budget,
        assetType: 'Municipal', // Nowy typ
        balanceSheet: { assets: targetCompany.budget * 2, liabilities: targetCompany.budget, shareCapital: totalShares * 10, retainedEarnings: 0 },
        quarterlyEarnings: targetCompany.baseIncome / 4,
        priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        
        isStateOwned: true, // Używamy tej flagi do oznaczenia własności publicznej (miejskiej)
        stateOwnershipPct: cityOwnershipPct,
        canBeTraded: true,
        cannotGoBankrupt: true, // Nigdy nie bankrutują
        
        dividendPolicy: Math.random() < 0.5 ? 'None' : 'Balanced', // 50/50
        dividendTimer: getRandomIntInRange(8*60*1000, 15*60*1000),
        estimatedDividend: 0,
        bankAccountId: null, 
        isBankStock: false
    };
    
    // Zainicjuj bilans, CEO itp.
    initializeBalanceSheetForStock(newStock); // Mimo że ma assetType, chcemy CEO itp.
    initializeDescriptionParts(newStock);
    generateCEO(newStock);
    
    stocks.push(newStock);

    // Usuń z listy spółek miejskich
    const index = municipalCompanies.findIndex(c => c.id === targetCompany.id);
    if (index > -1) municipalCompanies.splice(index, 1);
}

function runPrivateCompanyLogic() {
    privateCompanies.forEach(company => {
        company.developmentProgress += getRandomInRange(1, 5); // Powolny postęp co kwartał

        if (company.developmentProgress >= 100) {
            // Firma dojrzała - podejmuje decyzję
            company.developmentProgress = 0; // Reset
            const decision = Math.random();

            if (decision < 0.2) { // 20% szans na IPO
                logEvent(`📈 Firma prywatna ${company.name} decyduje się na wejście na Giełdę Brązową!`, 'market');
                // TODO: Logika IPO podobna do `runMunicipalCompanyLogic`, ale:
                // 1. Tworzy zwykłą spółkę (bez `cannotGoBankrupt`).
                // 2. Fundacja (FPF) otrzymuje `cityOwnership` procent akcji.
                // 3. Reszta akcji trafia na rynek.
            } else if (decision < 0.4) { // 20% szans na wejście do inkubatora
                logEvent(`🚀 Firma prywatna ${company.name} wchodzi do inkubatora jako startup!`, 'market');
                // TODO: Logika tworzenia `Startupu` na bazie `company.value`.
            } else {
                // 60% szans - pozostaje prywatna, ale rośnie
                company.value *= 1.2; // Wartość rośnie o 20%
                city.infrastructureLevel += 0.01; // Stały, mały bonus do infrastruktury
            }
        }
    });
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

function applyPriceEffect(stockSymbol, percentageChange, eventType, eventCategory = 'company') {
    const stock = stocks.find(s => s.symbol === stockSymbol);
    if (!stock) return;

    // ===>>> NOWY BLOK: TARCZA PR (PR SHIELD CHECK) <<<===
    if (percentageChange < 0 && stock.prShieldExpiry && Date.now() < stock.prShieldExpiry) {
        logEvent(`🛡️ Tarcza PR (artykuł sponsorowany) ochroniła ${stock.name} przed negatywnym zdarzeniem!`, 'review');
        showToast(`Pozytywny PR ochronił ${stock.name} przed negatywnym eventem!`, 'success');
        
        // Opcjonalnie: Tarcza zużywa się po jednej obronie
        // stock.prShieldExpiry = null; 
        
        return; // ZATRZYMAJ negatywny efekt
    }

    if (
        percentageChange < 0 &&
        eventCategory === 'company' &&
        stock.ceo?.traits?.some(t => t.id === 'czlowiek_z_ludu')
    ) {
        logEvent(`🛡️ [Człowiek z Ludu] Reputacja prezesa ${stock.name} ochroniła firmę przed negatywnymi skutkami zdarzenia!`);
        return; 
    }
    if (
        percentageChange < 0 &&
        (eventCategory === 'market' || eventCategory === 'sector') &&
        stock.ceo?.traits?.some(t => t.id === 'tytan_przemyslu')
    ) {
        logEvent(`🛡️ [Tytan Przemysłu] Niewzruszona pozycja ${stock.name} na rynku uchroniła ją przed negatywnym zdarzeniem!`);
        return; 
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

    // Modyfikatory dla negatywnych zdarzeń (spółki państwowe, umiejętności gracza)
    if (finalPercentageChange < 0) {
        let totalResistance = 0;
        if (stock.isStateOwned && stock.eventResistance > 0) {
            totalResistance += stock.eventResistance;
        }
        if (stock.isStateOwned && stock.ceo?.traits?.some(t => t.id === 'lojalista')) {
            totalResistance += 0.20;
        }
        if (totalResistance > 0) {
            finalPercentageChange *= (1 - Math.min(1, totalResistance));
        }

        // Umiejętność gracza "Żelazne Nerwy"
        const nervesLevel = getSkillLevel('ironNerves');
        if (nervesLevel > 0) {
            let nervesModifier = 1.0;
            switch (nervesLevel) {
                case 1: nervesModifier = 0.95; break;
                case 2: nervesModifier = 0.88; break;
                case 3: nervesModifier = 0.80; break;
            }
            finalPercentageChange *= nervesModifier;
        }

        // Umiejętność gracza "Charyzma"
        const charismaLevel = getSkillLevel('charisma'); 
        if (charismaLevel > 0) {
            let charismaModifier = 1.0;
            if (charismaLevel >= 4) { // Poziom 4 (stara nazwa) -> teraz Lvl 3+
                charismaModifier = 0.50; // 50% redukcji
            } else if (charismaLevel >= 1) {
                charismaModifier = 0.85; // 15% redukcji
            }
            finalPercentageChange *= charismaModifier;
        }
    }

    // --- Sekcja 3: Zastosowanie finalnej zmiany ceny ---
    stock.price *= (1 + finalPercentageChange);
    if (stock.price < 0.01) {
        stock.price = 0.01;
    }

    stock.volatilityFactor *= 1.1; // Każde zdarzenie lekko zwiększa zmienność

    console.log(`Efekt cenowy dla ${stock.name}: ${oldPrice.toFixed(2)} -> ${stock.price.toFixed(2)} (finalna zmiana: ${(finalPercentageChange * 100).toFixed(2)}%)`);
}

function checkForPotentialMA() {
    // ... (logika pobierania initiatorów i targetów - bez zmian) ...
    const potentialInitiators = [
        ...aiCompetitors.filter(ai => ai.cash > 50000 && ai.personality !== 'market_maker'), 
        ...stocks.filter(s => s.assetType === 'Holding' && s.cash > 100000), 
        ...commercialBanks.filter(b => b.type === BANK_TYPES.INVESTMENT && b.isActive && b.cash > 1000000)
    ];
    const potentialTargets = stocks.filter(s =>
        !s.assetType && !s.isBankrupt && !s.mergerProcess && !s.isSubsidiaryOf && exchanges[s.exchange].level < 3
    );
    if (potentialInitiators.length === 0 || potentialTargets.length === 0) return;

    const initiator = getRandomElement(potentialInitiators);
    const initiatorObject = (initiator.id ? initiator : { id: initiator.symbol, name: initiator.name, cash: initiator.cash, portfolio: initiator.holdingPortfolio || initiator.stockPortfolio });

    // --- Ustalenie strategii (logika bez zmian) ---
    let checkChance = 0.05; 
    let preferredType = 'przejęcie';
    // ===>>> ZMIANA 1: Domyślne finansowanie <<<===
    let preferredFinancing = 'cash'; // Domyślnie gotówka
    let targetFilter = (target) => target.financialHealth < 0; 

    if (initiator.personality) { 
        switch (initiator.personality) { /* ... (logika switch bez zmian) ... */ }
    } else if (initiator.assetType === 'Holding') {
        checkChance = 0.10;
        targetFilter = (target) => target.sector.some(s => initiator.specializationSectors.includes(s));
    } else if (initiator.type === BANK_TYPES.INVESTMENT) {
        checkChance = 0.12;
        preferredType = 'fuzja'; 
        preferredFinancing = 'stockSwap'; 
        targetFilter = (target) => target.financialHealth >= 1; 
    }

    if (Math.random() > checkChance) return;

    // --- Wybór celu (logika bez zmian) ---
    const eligibleTargets = potentialTargets.filter(target =>
        target.symbol !== initiatorObject.id && targetFilter(target)
    );
    if (eligibleTargets.length === 0) return;
    
    const targetStock = getRandomElement(eligibleTargets);
    
    // ===>>> ZMIANA 2: Sprawdzenie finansowania dla AI <<<===
    if (preferredType === 'przejęcie') {
        const offerPremium = getRandomInRange(0.15, 0.35);
        const totalCost = (targetStock.price * (1 + offerPremium)) * targetStock.totalShares;

        // Sprawdź, czy inicjatora stać na gotówkę
        if (initiatorObject.cash < totalCost) {
            // Nie stać na gotówkę. Sprawdź, czy może wziąć LBO.
            const initiatorStock = stocks.find(s => s.symbol === initiatorObject.id); // Potrzebny obiekt stock dla financialHealth
            const initiatorHealth = initiatorStock ? initiatorStock.financialHealth : (initiator.personality ? 2 : 0); // Uproszczenie dla AI

            if (initiatorHealth >= 0) { // Jeśli ma co najmniej neutralną kondycję
                preferredFinancing = 'lbo'; // Zdecyduj się na LBO
                console.log(`[M&A AI] ${initiatorObject.name} nie ma gotówki, spróbuje LBO na ${targetStock.symbol}.`);
            } else {
                // Nie stać go na gotówkę i jest w złej kondycji - odpuść
                console.log(`[M&A AI] ${initiatorObject.name} odpuszcza przejęcie ${targetStock.symbol} (brak środków i zła kondycja na LBO).`);
                return; // Zakończ
            }
        }
    }
    // ===>>> KONIEC ZMIANY 2 <<<===


    // Finalna szansa na zainicjowanie procesu
    let ceoModifier = 1.0;
    const initiatorStock = stocks.find(s => s.symbol === initiatorObject.id); 
    if (initiatorStock && initiatorStock.ceo?.traits?.some(t => t.id === 'ekspansjonista')) {
        ceoModifier = 2.0; 
    }

    if (Math.random() < 0.5 * ceoModifier) {
        console.log(`[M&A AI] ${initiatorObject.name} (${initiatorObject.id}) inicjuje ${preferredType} celu ${targetStock.symbol} (Finansowanie: ${preferredFinancing})!`);
        
        let finalInitiatorStock = initiatorStock;
        if (initiator.personality) {
             const controlledStockSymbol = Object.keys(initiator.portfolio).find(sym => {
                 const stock = stocks.find(s => s.symbol === sym);
                 return stock && !stock.assetType && (initiator.portfolio[sym].shares / stock.totalShares > 0.5);
             });
             finalInitiatorStock = stocks.find(s => s.symbol === controlledStockSymbol);
        }
        
        if (finalInitiatorStock) {
            // Przekaż wybraną metodę finansowania
            initiateMergerProcess(finalInitiatorStock, targetStock, preferredType, preferredFinancing, getRandomInRange(0.15, 0.35));
        }
    }
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

function executePawnLoan(targetEntity, pawnShop, targetStock, quantity, loanAmount, newInterestRate, durationWeeks) {
    const entityId = (targetEntity === 'player') ? 'player' : targetEntity.id;
    const portfolio = (targetEntity === 'player') ? playerPortfolio : targetEntity.portfolio;
    const holding = portfolio[targetStock.symbol];

    // 1. Sprawdź, czy akcje są nadal dostępne (nie zostały sprzedane)
    const availableShares = holding.shares - (holding.lockedShares || 0);
    if (availableShares < quantity) {
        if (targetEntity === 'player') showToast("Transakcja anulowana. Sprzedałeś akcje, zanim oferta została przyjęta.", 'error');
        return;
    }

    // 2. Transakcja: Lombard płaci, Dłużnik dostaje gotówkę
    pawnShop.cash -= loanAmount;
    if (targetEntity === 'player') playerCash += loanAmount;
    else targetEntity.cash += loanAmount;

    // 3. Stwórz nowy dług lombardowy dla dłużnika
    const maturityDate = Date.now() + (durationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    const totalRepaymentAmount = loanAmount * (1 + (newInterestRate * (durationWeeks / 52))); // Całkowita kwota do spłaty (kapitał + odsetki)

    const newLoan = {
        id: `pawn_${Date.now()}_${entityId}`,
        bankId: null, // To nie jest kredyt bankowy
        bankName: pawnShop.name, // Wierzyciel
        collectorSymbol: pawnShop.symbol, // Używamy tego pola do identyfikacji
        initialAmount: loanAmount,
        amount: totalRepaymentAmount, // Całkowita kwota do spłaty
        interestRate: newInterestRate,
        weeklyPayment: totalRepaymentAmount, // Cała kwota jest płatna na koniec
        maturityDate: maturityDate,
        collateral: { symbol: targetStock.symbol, quantity: quantity },
        isPawnLoan: true // Specjalna flaga
    };

    if (targetEntity === 'player') playerCommercialLoans.push(newLoan);
    else {
        if (!targetEntity.loans) targetEntity.loans = [];
        targetEntity.loans.push(newLoan);
    }

    // 4. Zablokuj akcje dłużnika
    if (!holding.lockedShares) holding.lockedShares = 0;
    holding.lockedShares += quantity;

    logEvent(`💰 ${pawnShop.name} udzielił pożyczki ${loanAmount.toFixed(2)} PLN pod zastaw ${quantity} akcji ${targetStock.symbol}. Termin spłaty: ${durationWeeks} tyg.`, 'review');
    
    if (targetEntity === 'player') {
        showToast("Otrzymano gotówkę z lombardu! Akcje zostały zablokowane.", 'success');
        displayCash();
        displayPortfolio();
    }
}

function executeDebtTransfer(collectorStock, targetEntity, loan, newInterestRate) {
    // 1. Collector (WRONA) płaci bankowi
    collectorStock.cash -= loan.amount;
    collectorStock.balanceSheet.assets += loan.amount; // Dług staje się aktywem windykatora

    // 2. Bank otrzymuje pieniądze i zamyka kredyt
    const bank = commercialBanks.find(b => b.id === loan.bankId);
    if (bank) {
        bank.cash += loan.amount;
        // Usuń kredyt z portfolio banku
        const portfolioKey = (targetEntity === 'player') ? 'player' : targetEntity.id;
        if (bank.loanPortfolio[portfolioKey]) {
            const loanIndex = bank.loanPortfolio[portfolioKey].findIndex(l => l.id === loan.id);
            if (loanIndex > -1) {
                bank.loanPortfolio[portfolioKey].splice(loanIndex, 1);
            }
        }
    }

    // 3. Dłużnik (Gracz/AI) ma zmodyfikowany dług
    loan.bankId = null; // Już nie jest dłużny bankowi
    loan.bankName = collectorStock.name; // Nowy wierzyciel
    loan.collectorSymbol = collectorStock.symbol; // Symbol wierzyciela (dla płatności)
    loan.interestRate = newInterestRate; // NOWE, WYŻSZE OPROCENTOWANIE
    loan.missedPayments = 0; // Windykator daje "czystą kartę"
    // Przelicz ratę
    const loanDurationWeeks = Math.round((loan.maturityDate - Date.now()) / (BASE_DELAYS.weekly / currentSpeedMultiplier));
    const weeklyRate = loan.interestRate / 52;
    if (loanDurationWeeks > 0 && weeklyRate > 0) {
        loan.weeklyPayment = loan.amount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);
    } else {
        loan.weeklyPayment = loan.amount * 0.05; // Awaryjna rata
    }

    const entityName = (targetEntity === 'player') ? "Twój" : `Bota ${targetEntity.name}`;
    logEvent(`🔔 ${collectorStock.name} przejął ${entityName} dług w wysokości ${loan.amount.toFixed(2)} PLN. Nowe oprocentowanie: ${(newInterestRate * 100).toFixed(1)}%.`, 'review');
    
    if(targetEntity === 'player') {
        showToast("Twój dług został przejęty przez windykatora!", 'warning');
        displayPortfolio(); // Odśwież listę pasywów
        if(document.getElementById('commercial-loan-modal')?.style.display === 'block') {
            openCommercialLoanModal(bank ? bank.id : null); // Odśwież modal banku
        }
    }
}

function findBestLenderBank(initiator, loanAmount) {
    // Banki korporacyjne i uniwersalne są najlepsze do LBO
    const potentialLenders = commercialBanks.filter(b =>
        b.isActive &&
        (b.type === BANK_TYPES.CORPORATE || b.type === BANK_TYPES.UNIVERSAL) &&
        b.cash > loanAmount * 1.5 // Bank musi mieć nadwyżkę gotówki
    );

    if (potentialLenders.length === 0) {
        console.warn(`[LBO] Brak banków z wystarczającą płynnością (${loanAmount.toFixed(0)}) dla ${initiator.symbol}.`);
        return null; // Brak chętnych banków
    }

    // Prosta logika: wybierz bank z największą ilością gotówki
    potentialLenders.sort((a, b) => b.cash - a.cash);
    const lender = potentialLenders[0];

    // Sprawdź kondycję biorącego kredyt
    if (initiator.financialHealth < -1) {
        console.log(`[LBO] Bank ${lender.name} odrzucił wniosek ${initiator.symbol} o LBO z powodu złej kondycji finansowej.`);
        return null; // Bank odrzuca zbyt ryzykownego klienta
    }
    
    console.log(`[LBO] Bank ${lender.name} zgodził się sfinansować LBO dla ${initiator.symbol}.`);
    return lender;
}

function removeStockFromGame(symbol) {
    // 1. Usuń z głównej listy `stocks`
    const index = stocks.findIndex(s => s.symbol === symbol);
    if (index > -1) {
        stocks.splice(index, 1);
    }

    // 2. Usuń z portfela gracza
    if (playerPortfolio[symbol]) {
        delete playerPortfolio[symbol];
    }

    // 3. Usuń z portfeli AI
    aiCompetitors.forEach(ai => {
        if (ai.portfolio[symbol]) {
            delete ai.portfolio[symbol];
        }
    });

    // 4. Usuń z portfeli Holdingów
    stocks.forEach(s => {
        if (s.assetType === 'Holding' && s.holdingPortfolio[symbol]) {
            delete s.holdingPortfolio[symbol];
        }
    });

    // 5. Usuń z portfeli Banków Inwestycyjnych
    commercialBanks.forEach(bank => {
        if (bank.stockPortfolio[symbol]) {
            delete bank.stockPortfolio[symbol];
        }
    });

    console.log(`[M&A] Spółka ${symbol} została całkowicie usunięta z gry.`);
}


// TO NA SAMYM DOLE

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