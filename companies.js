
let currentCollateralAuction = null; // { stockSymbol, quantity, minPrice, endTime, bids: [] }
// Nowa globalna tablica na spółki miejskie (nienotowane na giełdzie)
let municipalCompanies = [];
let privateCompanies = [];
const MINIMUM_STARTUPS = 3; 
const TARGET_STARTUPS = 5;
let currentBankIPOOffer = null;
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


const ALL_COMMERCIAL_BANKS_DEFINITIONS = [
    // Inwestycyjne (3 + 1)
    { id: 'inv1', name: 'Bank Spryciarski', type: BANK_TYPES.INVESTMENT, initialCapital: 5000000, reserveRatio: 0.1, baseInterestRateMargin: 0.01 },
    { id: 'inv2', name: 'Galeria Bankowa', type: BANK_TYPES.INVESTMENT, initialCapital: 4500000, reserveRatio: 0.1, baseInterestRateMargin: 0.012 },
    { id: 'inv3', name: 'Bank Kolekcjonerski RPK', type: BANK_TYPES.INVESTMENT, initialCapital: 4000000, reserveRatio: 0.1, baseInterestRateMargin: 0.009 },
    // --> NOWY: Bank Hipotezy jako Inwestycyjny <--
    { id: 'bhi', name: 'Bank Hipotezy', type: BANK_TYPES.INVESTMENT, initialCapital: 8000000, reserveRatio: 0.11, baseInterestRateMargin: 0.011, isActiveFromStart: true }, // Kapitał szacowany

    // Korporacyjne (3)
    { id: 'corp1', name: 'Syriusz Corp.', type: BANK_TYPES.CORPORATE, initialCapital: 7000000, reserveRatio: 0.15, baseInterestRateMargin: 0.015 },
    { id: 'corp2', name: 'Krupiewicz Group S.A', type: BANK_TYPES.CORPORATE, initialCapital: 6500000, reserveRatio: 0.16, baseInterestRateMargin: 0.016 },
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
    'PLATINUM': { name: 'Giełda Platynowa 💎', level: 4, color: '#e5e4e2', minPrice: 1500, maxPrice: Infinity, licenseCost: 500000 },
    // Giełdy elitarne (etap E2): przydział wg rankingu kapitalizacji, nie ceny — finance.js
    'RUBY': { name: 'Giełda Rubinowa 🔴', level: 5, color: '#c3112f', minPrice: Infinity, maxPrice: Infinity, licenseCost: 0, rankBased: true },
    'EMERALD': { name: 'Giełda Szmaragdowa 🟢', level: 6, color: '#1f9d55', minPrice: Infinity, maxPrice: Infinity, licenseCost: 0, rankBased: true },
    'DIAMOND': { name: 'Giełda Diamentowa 💠', level: 7, color: '#6ec6ff', minPrice: Infinity, maxPrice: Infinity, licenseCost: 0, rankBased: true }
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
        holdingPortfolio: { 'WRN': { quantity: 8, purchasePrice: 620 } },
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

const CONSTRUCTION_COMPANIES_DATA = [
    { name: 'Budimix', exchange: 'GOLD', price: 450, volatility: 0.8, sector: ['Budowlany'] },
    { name: 'DrogiStal', exchange: 'SILVER', price: 120, volatility: 1.1, sector: ['Budowlany', 'Przemysł'] },
    { name: 'BobBuild', exchange: 'BRONZE', price: 40, volatility: 1.5, sector: ['Budowlany'] },
    { name: 'Infrastrukturex', exchange: 'GOLD', price: 520, volatility: 0.7, sector: ['Budowlany'] },
    { name: 'Budipol', exchange: 'SILVER', price: 180, volatility: 0.9, sector: ['Budowlany'] },
    // Betonex już istnieje w initialStocks, zaktualizujemy go dynamicznie lub ręcznie
    { name: 'Bractwo Stali', exchange: 'PLATINUM', price: 1600, volatility: 0.6, sector: ['Budowlany', 'Przemysł'] },
    { name: 'Majsterbud', exchange: 'BRONZE', price: 25, volatility: 2.0, sector: ['Budowlany'] },
    { name: 'Giereklud', exchange: 'GOLD', price: 380, volatility: 0.5, sector: ['Budowlany'], isStateOwned: true, stateOwnershipPct: 1.0 }
];

// Rodzaje pozycji katalogu inwestycji:
//  construction — wymaga robót budowlanych (budowa, rozbudowa, modernizacja infrastruktury)
//  mixed        — etap budowlany (przetarg) + etap wyposażenia realizowany przez samą spółkę
//  equipment, software, marketing, training, organization, expansion — bez robót budowlanych
//                 (realizowane jako zwykłe inwestycje; w przyszłości zlecenia sektorowe)
const CONSTRUCTION_KINDS = ['construction', 'mixed'];

// Jawna klasyfikacja każdej pozycji — nie zgadujemy po nazwie.
// constructionShare — część kosztu przypadająca na roboty budowlane (dla 'mixed').
// requirements — minimalne wymagania wobec wykonawcy (doświadczenie, technologia).
const INVESTMENT_CLASSIFICATION = {
    marketing_campaign: { kind: 'marketing' },
    equipment_upgrade: { kind: 'equipment' },
    software_update: { kind: 'software' },
    new_branch: { kind: 'construction' },
    foreign_expansion: { kind: 'expansion' },
    employee_training: { kind: 'training' },

    new_factory: { kind: 'construction' },
    new_mine: { kind: 'construction', requirements: { minExperience: 15 } },

    server_room: { kind: 'mixed', constructionShare: 0.45 },
    chip_factory: { kind: 'mixed', constructionShare: 0.60, requirements: { minExperience: 20 } },
    software_development_center: { kind: 'organization' },

    research_lab: { kind: 'mixed', constructionShare: 0.50 },
    hospital: { kind: 'construction', requirements: { minExperience: 20 } },
    pharma_factory: { kind: 'mixed', constructionShare: 0.65 },

    energy_plant: { kind: 'construction', requirements: { minExperience: 20 } },
    wind_farm: { kind: 'construction' },
    solar_park: { kind: 'construction' },

    logistics_hub: { kind: 'construction' },
    distribution_center: { kind: 'construction' },
    warehouse_automation: { kind: 'mixed', constructionShare: 0.45 },

    office_building: { kind: 'construction' },
    warehouse: { kind: 'construction' },
    residential_complex: { kind: 'construction', requirements: { minExperience: 10 } },
    shopping_center: { kind: 'construction', requirements: { minExperience: 15 } },
    industrial_park: { kind: 'construction', requirements: { minExperience: 20 } },
    skyscraper: { kind: 'construction', requirements: { minExperience: 30, requiredTech: 'BUILDING_HIGH_RISE_1' } },

    game_studio: { kind: 'organization' },
    esports_arena: { kind: 'construction' },
    vr_development_lab: { kind: 'equipment' },
    mobile_game_studio: { kind: 'organization' },
    streaming_platform: { kind: 'software' },
    gaming_casino: { kind: 'construction' },

    hotel_chain: { kind: 'construction' },
    resort: { kind: 'construction', requirements: { minExperience: 10 } },
    theme_park: { kind: 'construction', requirements: { minExperience: 15 } },
    cruise_terminal: { kind: 'construction', requirements: { minExperience: 15 } },
    ski_resort: { kind: 'construction' },
    casino: { kind: 'construction' },

    food_processing_plant: { kind: 'mixed', constructionShare: 0.60 },
    dairy_farm: { kind: 'construction' },
    brewery: { kind: 'mixed', constructionShare: 0.55 },

    production_facility: { kind: 'construction' },
    textile_factory: { kind: 'mixed', constructionShare: 0.55 },
    electronics_assembly: { kind: 'equipment' },

    service_center: { kind: 'organization' },
    call_center: { kind: 'organization' },
    consulting_office: { kind: 'organization' },
    it_services_center: { kind: 'organization' },
    legal_services: { kind: 'organization' },
    accounting_firm: { kind: 'organization' },

    research_facility: { kind: 'construction', requirements: { minExperience: 10 } },
    innovation_lab: { kind: 'mixed', constructionShare: 0.40 },
    testing_center: { kind: 'mixed', constructionShare: 0.50 },
    biotech_lab: { kind: 'mixed', constructionShare: 0.40 },
    aerospace_research: { kind: 'construction', requirements: { minExperience: 20 } },
    materials_science_lab: { kind: 'mixed', constructionShare: 0.45 },

    bank_headquarters: { kind: 'construction', requirements: { minExperience: 15 } },
    data_center_finance: { kind: 'mixed', constructionShare: 0.45 },
    vault_building: { kind: 'construction' },

    financial_tower: { kind: 'construction', requirements: { minExperience: 25 } },
    trading_floor: { kind: 'equipment' },
    fintech_hub: { kind: 'software' },

    chemical_plant: { kind: 'construction', requirements: { minExperience: 15 } },
    refinery: { kind: 'construction', requirements: { minExperience: 20 } },
    rnd_lab_chemistry: { kind: 'mixed', constructionShare: 0.45 },

    tv_studio: { kind: 'mixed', constructionShare: 0.50 },
    broadcasting_center: { kind: 'construction' },
    cinema_complex: { kind: 'construction' },

    cargo_terminal: { kind: 'construction', requirements: { minExperience: 15 } },
    container_port: { kind: 'construction', requirements: { minExperience: 25 } },
    fuel_station_network: { kind: 'construction' }
};

const INVESTMENT_KIND_LABELS = {
    construction: 'Budowa (przetarg)',
    mixed: 'Budowa + wyposażenie',
    equipment: 'Sprzęt',
    software: 'Oprogramowanie',
    marketing: 'Marketing',
    training: 'Szkolenia',
    organization: 'Organizacja',
    expansion: 'Ekspansja',
    investment: 'Inwestycja'
};

function classifyInvestmentCatalogEntry(investment) {
    if (!investment || typeof investment !== 'object') return 'investment';
    return INVESTMENT_CLASSIFICATION[investment.id]?.kind || investment.kind || 'investment';
}

function isConstructionInvestment(investment) {
    const entry = investment?.id ? getCatalogEntryById(investment.id) : null;
    return CONSTRUCTION_KINDS.includes(classifyInvestmentCatalogEntry(entry || investment));
}

const INVESTMENT_CATALOG = {
    'general': [
        { 
            id: 'marketing_campaign', 
            name: "Kampania Marketingowa", 
            icon: 'img/billboardicon.png', 
            cost: 100000, duration: 4, assetValue: 0, incomeBonus: 0.15, healthBonus: 0, minDevLevel: 1,
            maintenance: 0 // Marketing nie ma kosztów utrzymania po zakończeniu
        },
        { 
            id: 'equipment_upgrade', 
            name: "Modernizacja Sprzętu", 
            icon: 'img/equipment.png', 
            cost: 50000, duration: 2, assetValue: 30000, incomeBonus: 0.02, healthBonus: 0.5, minDevLevel: 1,
            maintenance: 500 // Serwisowanie sprzętu
        },
        { 
            id: 'software_update', 
            name: "Aktualizacja Systemów IT", 
            icon: 'img/update.png', 
            cost: 20000, duration: 1, assetValue: 0, incomeBonus: 0.01, healthBonus: 0.1, minDevLevel: 1,
            maintenance: 200 // Licencje
        },
        { 
            id: 'new_branch', 
            name: "Nowa Filia", 
            icon: 'img/branch.png', 
            cost: 200000, duration: 12, assetValue: 150000, incomeBonus: 0.1, healthBonus: 0.2, minDevLevel: 2,
            maintenance: 2000 // Czynsz, media
        },
        { 
            id: 'foreign_expansion', 
            name: "Ekspansja Zagraniczna", 
            icon: 'img/globe.png', 
            cost: 1000000, duration: 36, assetValue: 800000, incomeBonus: 0.25, healthBonus: 0, minDevLevel: 3,
            maintenance: 10000 // Biura zagraniczne
        },
        { 
            id: 'employee_training', 
            name: "Centrum Szkoleniowe", 
            icon: 'img/box.png', 
            cost: 150000, duration: 8, assetValue: 100000, incomeBonus: 0.03, healthBonus: 0.8, minDevLevel: 2,
            maintenance: 1000 
        }
    ],
    'Przemysł': [
        { id: 'new_factory', name: "Nowa Fabryka", icon: 'img/fabrykaicon.png', cost: 800000, duration: 40, assetValue: 700000, incomeBonus: 0.2, healthBonus: 0.5, minDevLevel: 2, maintenance: 5000 },
        { id: 'new_mine', name: "Nowy Szyb Wydobywczy", icon: 'img/mine.png', cost: 1500000, duration: 50, assetValue: 1200000, incomeBonus: 0.3, healthBonus: 0.2, minDevLevel: 3, maintenance: 8000 }
    ],
    'Technologia': [
        { id: 'server_room', name: "Własna Serwerownia", icon: 'img/server.png', cost: 400000, duration: 16, assetValue: 300000, incomeBonus: 0.15, healthBonus: 0.2, minDevLevel: 2, maintenance: 3000 }, // Prąd!
        { id: 'chip_factory', name: "Fabryka Chipów", icon: 'img/fabrykaicon.png', cost: 1200000, duration: 50, assetValue: 1000000, incomeBonus: 0.25, healthBonus: 0.5, minDevLevel: 3, maintenance: 8000 },
        { id: 'software_development_center', name: "Centrum Rozwoju Oprogramowania", icon: 'img/server.png', cost: 600000, duration: 25, assetValue: 500000, incomeBonus: 0.18, healthBonus: 0.3, minDevLevel: 2, maintenance: 4000 }
    ],
    'Medycyna': [
        { id: 'research_lab', name: "Laboratorium Badawcze", icon: 'img/medlab.png', cost: 600000, duration: 20, assetValue: 500000, incomeBonus: 0.1, healthBonus: 1.5, minDevLevel: 2, maintenance: 4000 },
        { id: 'hospital', name: "Szpital", icon: 'img/branch.png', cost: 1500000, duration: 60, assetValue: 1200000, incomeBonus: 0.3, healthBonus: 2.0, minDevLevel: 4, maintenance: 10000 },
        { id: 'pharma_factory', name: "Fabryka Leków", icon: 'img/fabrykaicon.png', cost: 1000000, duration: 40, assetValue: 800000, incomeBonus: 0.22, healthBonus: 1.0, minDevLevel: 3, maintenance: 6000 }
    ],
    'Energia': [
        { id: 'energy_plant', name: "Rozbudowa Elektrowni", icon: 'img/fabrykaicon.png', cost: 1200000, duration: 30, assetValue: 1000000, incomeBonus: 0.18, healthBonus: 1.0, minDevLevel: 3, maintenance: 6000 },
        { id: 'wind_farm', name: "Farma Wiatrowa", icon: 'img/fabrykaicon.png', cost: 800000, duration: 35, assetValue: 650000, incomeBonus: 0.15, healthBonus: 0.8, minDevLevel: 2, maintenance: 4000 },
        { id: 'solar_park', name: "Park Słoneczny", icon: 'img/fabrykaicon.png', cost: 600000, duration: 25, assetValue: 500000, incomeBonus: 0.12, healthBonus: 0.6, minDevLevel: 2, maintenance: 3000 }
    ],
    'Logistyka': [
        { id: 'logistics_hub', name: "Centrum Logistyczne", icon: 'img/box.png', cost: 500000, duration: 24, assetValue: 400000, incomeBonus: 0.12, healthBonus: 0.3, minDevLevel: 2, maintenance: 2500 },
        { id: 'distribution_center', name: "Centrum Dystrybucyjne", icon: 'img/box.png', cost: 700000, duration: 30, assetValue: 550000, incomeBonus: 0.16, healthBonus: 0.4, minDevLevel: 2, maintenance: 3500 },
        { id: 'warehouse_automation', name: "Automatyczna Hala Magazynowa", icon: 'img/box.png', cost: 900000, duration: 40, assetValue: 700000, incomeBonus: 0.2, healthBonus: 0.5, minDevLevel: 3, maintenance: 4500 }
    ],
    'Budowlany': [
        { id: 'office_building', name: "Biurowiec", icon: 'img/branch.png', cost: 600000, duration: 30, assetValue: 500000, incomeBonus: 0.15, healthBonus: 0.4, minDevLevel: 2, maintenance: 3000 },
        { id: 'warehouse', name: "Hala Magazynowa", icon: 'img/box.png', cost: 400000, duration: 20, assetValue: 350000, incomeBonus: 0.1, healthBonus: 0.2, minDevLevel: 1, maintenance: 2000 },
        { id: 'residential_complex', name: "Osiedle Mieszkaniowe", icon: 'img/branch.png', cost: 1000000, duration: 45, assetValue: 800000, incomeBonus: 0.2, healthBonus: 0.5, minDevLevel: 3, maintenance: 5000 },
        { id: 'shopping_center', name: "Centrum Handlowe", icon: 'img/branch.png', cost: 1500000, duration: 60, assetValue: 1200000, incomeBonus: 0.25, healthBonus: 0.6, minDevLevel: 4, maintenance: 8000 },
        { id: 'industrial_park', name: "Park Przemysłowy", icon: 'img/fabrykaicon.png', cost: 2000000, duration: 80, assetValue: 1600000, incomeBonus: 0.3, healthBonus: 0.7, minDevLevel: 5, maintenance: 10000 },
        { id: 'skyscraper', name: "Wieżowiec", icon: 'img/branch.png', cost: 3000000, duration: 100, assetValue: 2400000, incomeBonus: 0.35, healthBonus: 0.8, minDevLevel: 6, maintenance: 15000 }
    ],
    'Gaming': [
        { id: 'game_studio', name: "Studio Gier", icon: 'img/server.png', cost: 300000, duration: 12, assetValue: 250000, incomeBonus: 0.08, healthBonus: 0.5, minDevLevel: 1, maintenance: 1500 },
        { id: 'esports_arena', name: "Arena eSport", icon: 'img/branch.png', cost: 600000, duration: 25, assetValue: 480000, incomeBonus: 0.15, healthBonus: 0.3, minDevLevel: 2, maintenance: 3000 },
        { id: 'vr_development_lab', name: "Laboratorium VR", icon: 'img/medlab.png', cost: 800000, duration: 35, assetValue: 640000, incomeBonus: 0.18, healthBonus: 0.4, minDevLevel: 3, maintenance: 4000 },
        { id: 'mobile_game_studio', name: "Studio Gier Mobilnych", icon: 'img/server.png', cost: 400000, duration: 15, assetValue: 320000, incomeBonus: 0.1, healthBonus: 0.6, minDevLevel: 1, maintenance: 2000 },
        { id: 'streaming_platform', name: "Platforma Streamingowa", icon: 'img/server.png', cost: 1000000, duration: 40, assetValue: 800000, incomeBonus: 0.22, healthBonus: 0.5, minDevLevel: 3, maintenance: 5000 },
        { id: 'gaming_casino', name: "Kasyno Gier", icon: 'img/branch.png', cost: 700000, duration: 30, assetValue: 550000, incomeBonus: 0.16, healthBonus: 0.35, minDevLevel: 2, maintenance: 3500 }
    ],
    'Turystyka': [
        { id: 'hotel_chain', name: "Łańcuch Hoteli", icon: 'img/branch.png', cost: 800000, duration: 35, assetValue: 600000, incomeBonus: 0.18, healthBonus: 0.4, minDevLevel: 2, maintenance: 4000 },
        { id: 'resort', name: "Kurort", icon: 'img/globe.png', cost: 1200000, duration: 50, assetValue: 900000, incomeBonus: 0.22, healthBonus: 0.5, minDevLevel: 3, maintenance: 6000 },
        { id: 'theme_park', name: "Park Rozrywki", icon: 'img/globe.png', cost: 2000000, duration: 70, assetValue: 1500000, incomeBonus: 0.3, healthBonus: 0.6, minDevLevel: 4, maintenance: 10000 },
        { id: 'cruise_terminal', name: "Terminal Promowy", icon: 'img/box.png', cost: 1000000, duration: 40, assetValue: 800000, incomeBonus: 0.2, healthBonus: 0.45, minDevLevel: 3, maintenance: 5000 },
        { id: 'ski_resort', name: "Ośrodek Narciarski", icon: 'img/globe.png', cost: 900000, duration: 45, assetValue: 700000, incomeBonus: 0.19, healthBonus: 0.42, minDevLevel: 2, maintenance: 4500 },
        { id: 'casino', name: "Kasyno", icon: 'img/branch.png', cost: 600000, duration: 25, assetValue: 480000, incomeBonus: 0.14, healthBonus: 0.3, minDevLevel: 2, maintenance: 3000 }
    ],
    'Żywność': [
        { id: 'food_processing_plant', name: "Zakład Przetwórstwa Żywności", icon: 'img/fabrykaicon.png', cost: 700000, duration: 28, assetValue: 550000, incomeBonus: 0.16, healthBonus: 0.3, minDevLevel: 2, maintenance: 3500 },
        { id: 'dairy_farm', name: "Farma Mleczna", icon: 'img/fabrykaicon.png', cost: 500000, duration: 20, assetValue: 400000, incomeBonus: 0.14, healthBonus: 0.25, minDevLevel: 1, maintenance: 2500 },
        { id: 'brewery', name: "Browar", icon: 'img/fabrykaicon.png', cost: 600000, duration: 25, assetValue: 480000, incomeBonus: 0.18, healthBonus: 0.35, minDevLevel: 2, maintenance: 3000 }
    ],
    'Dobra konsumpcyjne': [
        { id: 'production_facility', name: "Zakład Produkcyjny", icon: 'img/fabrykaicon.png', cost: 500000, duration: 22, assetValue: 400000, incomeBonus: 0.12, healthBonus: 0.25, minDevLevel: 1, maintenance: 2500 },
        { id: 'textile_factory', name: "Fabryka Tekstyliów", icon: 'img/fabrykaicon.png', cost: 400000, duration: 18, assetValue: 320000, incomeBonus: 0.1, healthBonus: 0.2, minDevLevel: 1, maintenance: 2000 },
        { id: 'electronics_assembly', name: "Linia Montażu Elektroniki", icon: 'img/fabrykaicon.png', cost: 800000, duration: 30, assetValue: 640000, incomeBonus: 0.2, healthBonus: 0.4, minDevLevel: 2, maintenance: 4000 }
    ],
    'Usługi': [
        { id: 'service_center', name: "Centrum Usługowe", icon: 'img/branch.png', cost: 400000, duration: 18, assetValue: 300000, incomeBonus: 0.1, healthBonus: 0.2, minDevLevel: 1, maintenance: 2000 },
        { id: 'call_center', name: "Centrum Obsługi Klienta", icon: 'img/branch.png', cost: 300000, duration: 15, assetValue: 240000, incomeBonus: 0.08, healthBonus: 0.15, minDevLevel: 1, maintenance: 1500 },
        { id: 'consulting_office', name: "Biuro Konsultingowe", icon: 'img/branch.png', cost: 500000, duration: 20, assetValue: 400000, incomeBonus: 0.12, healthBonus: 0.25, minDevLevel: 2, maintenance: 2500 },
        { id: 'it_services_center', name: "Centrum Usług IT", icon: 'img/server.png', cost: 600000, duration: 25, assetValue: 480000, incomeBonus: 0.14, healthBonus: 0.3, minDevLevel: 2, maintenance: 3000 },
        { id: 'legal_services', name: "Biuro Prawnicze", icon: 'img/branch.png', cost: 350000, duration: 16, assetValue: 280000, incomeBonus: 0.09, healthBonus: 0.18, minDevLevel: 1, maintenance: 1800 },
        { id: 'accounting_firm', name: "Firma Księgowa", icon: 'img/branch.png', cost: 250000, duration: 12, assetValue: 200000, incomeBonus: 0.07, healthBonus: 0.12, minDevLevel: 1, maintenance: 1300 }
    ],
    'Badania': [
        { id: 'research_facility', name: "Obiekt Badawczy", icon: 'img/medlab.png', cost: 900000, duration: 40, assetValue: 700000, incomeBonus: 0.14, healthBonus: 1.0, minDevLevel: 3, maintenance: 4500 },
        { id: 'innovation_lab', name: "Laboratorium Innowacji", icon: 'img/medlab.png', cost: 700000, duration: 30, assetValue: 550000, incomeBonus: 0.12, healthBonus: 0.8, minDevLevel: 2, maintenance: 3500 },
        { id: 'testing_center', name: "Centrum Testowe", icon: 'img/medlab.png', cost: 500000, duration: 20, assetValue: 400000, incomeBonus: 0.1, healthBonus: 0.6, minDevLevel: 1, maintenance: 2500 },
        { id: 'biotech_lab', name: "Laboratorium Biotechnologiczne", icon: 'img/medlab.png', cost: 1100000, duration: 45, assetValue: 850000, incomeBonus: 0.16, healthBonus: 1.2, minDevLevel: 3, maintenance: 5500 },
        { id: 'aerospace_research', name: "Centrum Badań Lotniczych", icon: 'img/medlab.png', cost: 1500000, duration: 60, assetValue: 1200000, incomeBonus: 0.2, healthBonus: 1.5, minDevLevel: 4, maintenance: 7500 },
        { id: 'materials_science_lab', name: "Laboratorium Nauk Materiałowych", icon: 'img/medlab.png', cost: 800000, duration: 35, assetValue: 650000, incomeBonus: 0.13, healthBonus: 0.9, minDevLevel: 2, maintenance: 4000 }
    ],
    'Bankowość': [
        { id: 'bank_headquarters', name: "Siedziba Banku", icon: 'img/branch.png', cost: 1800000, duration: 50, assetValue: 1500000, incomeBonus: 0.28, healthBonus: 0.8, minDevLevel: 4, maintenance: 12000 },
        { id: 'data_center_finance', name: "Centrum Danych Finansowych", icon: 'img/server.png', cost: 1200000, duration: 35, assetValue: 900000, incomeBonus: 0.2, healthBonus: 0.6, minDevLevel: 3, maintenance: 7000 },
        { id: 'vault_building', name: "Budynk Sejfów", icon: 'img/branch.png', cost: 800000, duration: 25, assetValue: 600000, incomeBonus: 0.15, healthBonus: 0.4, minDevLevel: 2, maintenance: 5000 }
    ],
    'Finanse': [
        { id: 'financial_tower', name: "Wieża Finansowa", icon: 'img/branch.png', cost: 2000000, duration: 55, assetValue: 1700000, incomeBonus: 0.3, healthBonus: 0.85, minDevLevel: 4, maintenance: 13000 },
        { id: 'trading_floor', name: "Piętro Tradingowe", icon: 'img/branch.png', cost: 1500000, duration: 40, assetValue: 1200000, incomeBonus: 0.25, healthBonus: 0.7, minDevLevel: 3, maintenance: 9000 },
        { id: 'fintech_hub', name: "Hub FinTech", icon: 'img/server.png', cost: 1000000, duration: 30, assetValue: 800000, incomeBonus: 0.2, healthBonus: 0.5, minDevLevel: 2, maintenance: 6000 }
    ],
    'Chemia': [
        { id: 'chemical_plant', name: "Zakład Chemiczny", icon: 'img/fabrykaicon.png', cost: 1300000, duration: 45, assetValue: 1100000, incomeBonus: 0.24, healthBonus: 0.7, minDevLevel: 3, maintenance: 8000 },
        { id: 'refinery', name: "Rafineria", icon: 'img/fabrykaicon.png', cost: 1800000, duration: 60, assetValue: 1500000, incomeBonus: 0.32, healthBonus: 0.9, minDevLevel: 4, maintenance: 11000 },
        { id: 'rnd_lab_chemistry', name: "Laboratorium R&D Chemiczne", icon: 'img/medlab.png', cost: 900000, duration: 35, assetValue: 700000, incomeBonus: 0.18, healthBonus: 1.2, minDevLevel: 3, maintenance: 5000 }
    ],
    'Media': [
        { id: 'tv_studio', name: "Studio Telewizyjne", icon: 'img/branch.png', cost: 1400000, duration: 45, assetValue: 1100000, incomeBonus: 0.22, healthBonus: 0.6, minDevLevel: 3, maintenance: 8500 },
        { id: 'broadcasting_center', name: "Centrum Nadawcze", icon: 'img/branch.png', cost: 1000000, duration: 35, assetValue: 800000, incomeBonus: 0.18, healthBonus: 0.5, minDevLevel: 2, maintenance: 6000 },
        { id: 'cinema_complex', name: "Kompleks Kinowy", icon: 'img/branch.png', cost: 800000, duration: 28, assetValue: 650000, incomeBonus: 0.16, healthBonus: 0.4, minDevLevel: 2, maintenance: 4500 }
    ],
    'Transport': [
        { id: 'cargo_terminal', name: "Terminal Cargo", icon: 'img/box.png', cost: 1100000, duration: 38, assetValue: 900000, incomeBonus: 0.2, healthBonus: 0.55, minDevLevel: 3, maintenance: 6500 },
        { id: 'container_port', name: "Port Kontenerowy", icon: 'img/box.png', cost: 1600000, duration: 55, assetValue: 1300000, incomeBonus: 0.26, healthBonus: 0.75, minDevLevel: 4, maintenance: 9500 },
        { id: 'fuel_station_network', name: "Sieć Stacji Paliw", icon: 'img/branch.png', cost: 700000, duration: 22, assetValue: 550000, incomeBonus: 0.14, healthBonus: 0.35, minDevLevel: 2, maintenance: 4000 }
    ]
};

// Uzupełnienie pozycji katalogu: rodzaj, wymagania i jednolita jednostka czasu.
// Czas w katalogu jest wyrażony w DNIACH (budowy lub realizacji); 1 dzień = 1/7 tygodnia gry.
Object.values(INVESTMENT_CATALOG).forEach(category => {
    if (!Array.isArray(category)) return;

    category.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const classification = INVESTMENT_CLASSIFICATION[item.id] || {};

        item.kind = classification.kind || item.kind || 'investment';
        item.type = item.kind;
        item.durationDays = Number(item.durationDays ?? item.duration) || 1;
        item.constructionShare = item.kind === 'mixed'
            ? Number(classification.constructionShare) || 0.5
            : (item.kind === 'construction' ? 1 : 0);
        item.requirements = classification.requirements || {};
        item.isConstructionProject = CONSTRUCTION_KINDS.includes(item.kind);
    });
});

function getCatalogEntryById(id) {
    if (!id) return null;
    for (const category of Object.values(INVESTMENT_CATALOG)) {
        const found = category.find(item => item.id === id);
        if (found) return found;
    }
    return null;
}

/** Wszystkie pozycje katalogu dostępne dla spółki: ogólne + wszystkie jej sektory, bez duplikatów. */
function getInvestmentCatalogForCompany(company) {
    const sectors = Array.isArray(company?.sector) ? company.sector : [];
    const seen = new Set();
    const result = [];

    for (const key of ['general', ...sectors]) {
        for (const item of INVESTMENT_CATALOG[key] || []) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            result.push(item);
        }
    }

    return result;
}

/** Specyfikacja etapu budowlanego dla przetargu (null, jeśli pozycja nie wymaga robót budowlanych). */
function getConstructionSpec(id) {
    const item = getCatalogEntryById(id);
    if (!item || !CONSTRUCTION_KINDS.includes(item.kind)) return null;

    const share = item.constructionShare;
    const days = Math.max(1, Math.round(item.durationDays * (item.kind === 'mixed' ? Math.max(0.6, share) : 1)));

    return {
        id: item.id,
        name: item.kind === 'mixed' ? `${item.name} (etap budowlany)` : item.name,
        kind: item.kind,
        cost: Math.round(item.cost * share),
        catalogCost: item.cost,
        constructionShare: share,
        durationDays: days,
        duration: days,
        estimatedMarketValue: Math.round((Number(item.assetValue) || 0) * share),
        incomeBonus: item.kind === 'construction' ? Number(item.incomeBonus) || 0 : 0,
        maintenance: Math.round((Number(item.maintenance) || 0) * share),
        healthBonus: item.kind === 'construction' ? Number(item.healthBonus) || 0 : 0,
        minDevLevel: Number(item.minDevLevel) || 0,
        requirements: { ...(item.requirements || {}) }
    };
}

/**
 * Katalog budowlany dostępny dla konkretnej spółki — ta sama funkcja dla UI i dla AI.
 * Wymaganie to poziom działu rozwoju (nie kondycja finansowa).
 */
function getConstructionCatalogForCompany(company, options = {}) {
    const devLevel = Number(company?.departments?.development?.level) || 0;

    return getInvestmentCatalogForCompany(company)
        .filter(item => CONSTRUCTION_KINDS.includes(item.kind))
        .filter(item => options.ignoreLevel || devLevel >= (Number(item.minDevLevel) || 0));
}

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



let specialists = [
    { id: 'spec1', name: 'Voltomax Systemy', specialty: 'technology', bonus: 0.1, contractsCompleted: 0, level: 1, cash: 101000 },
    { id: 'spec2', name: 'Hydronex Serwis', specialty: 'general', bonus: 0.08, contractsCompleted: 0, level: 1, cash: 80000 },
    { id: 'spec3', name: 'Linea Architekci', specialty: 'office', bonus: 0.12, contractsCompleted: 0, level: 1, cash: 120000 },
    { id: 'spec4', name: 'Inżynierowie Strukturalni', specialty: 'industrial', bonus: 0.15, contractsCompleted: 0, level: 1, cash: 150000 },
    { id: 'spec5', name: 'Konstruktorium S.A', specialty: 'residential', bonus: 0.09, contractsCompleted: 0, level: 1, cash: 90000 },
    { id: 'spec6', name: 'WiesBud', specialty: 'residential', bonus: 0.04, contractsCompleted: 0, level: 1, cash: 65000 },
    { id: 'spec7', name: 'Pomocex', specialty: 'office', bonus: 0.1, contractsCompleted: 0, level: 1, cash: 100000 }
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
        
        stock.balanceSheet = { assets: 0, liabilities: 0, shareCapital: 0, retainedEarnings: 0 };
        stock.quarterlyEarnings = 0;
        stock.cash = 0; // Inicjalizuj gotówkę na 0 dla typów specjalnych
        return;
    }

    if (stock.assetType || stock.isBankStock) {
        stock.balanceSheet = { assets: 0, liabilities: 0, shareCapital: 0, retainedEarnings: 0 };
        stock.cash = 0;
        return;
    }

    const marketCap = stock.price * stock.totalShares;
    const assets = marketCap * getRandomInRange(0.9, 1.5);
    
    // ZMIANA: Dług zależny od kondycji. Zdrowe firmy (Health > 1) mogą nie mieć długu.
    let liabilitiesRatio = 0;
    if (stock.financialHealth < 2) {
        // Słabe firmy mają dług (10% - 60%)
        liabilitiesRatio = getRandomInRange(0.1, 0.5) - (stock.financialHealth * 0.05);
    } else {
        // Dobre firmy mają mały dług lub wcale (0% - 30%)
        if (Math.random() < 0.75) {
            liabilitiesRatio = getRandomInRange(0.05, 0.3);
        } else {
            liabilitiesRatio = 0; // Brak długu
        }
    }
    
    // Zabezpieczenie, żeby dług nie był ujemny
    const liabilities = assets * Math.max(0, liabilitiesRatio);
    
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
    stock.cash = assets * getRandomInRange(0.01, 0.05);

    const exchangeLevel = exchanges[stock.exchange]?.level ?? 0;
    stock.companyAge = getRandomIntInRange(1, 5) + exchangeLevel * 8;

    if (stock.companyAge < 12 && stock.financialHealth >= 1) {
        stock.corporatePhase = CORPORATE_PHASES.GROWTH;
    } else if (stock.financialHealth <= -2) {
        stock.corporatePhase = CORPORATE_PHASES.DECLINE;
    } else {
        stock.corporatePhase = CORPORATE_PHASES.STABILITY;
    }
    stock.phaseTimer = 0;
    
    if (stock.bankAccountId) {
        const bank = commercialBanks.find(b => b.id === stock.bankAccountId);
        if (bank) bank.cash += stock.cash;
    }

}

let stocks = JSON.parse(JSON.stringify(initialStocks)); // Inicjalizacja głównej tablicy

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
    syncSharesHeldWithInitialPortfolios();
}

/** Startowe portfele holdingów i instytucji (np. lombard) to akcje w obrocie — liczą się do sharesHeld. */
function syncSharesHeldWithInitialPortfolios() {
    for (const owner of stocks) {
        for (const [symbol, holding] of Object.entries(owner.holdingPortfolio || {})) {
            const stock = stocks.find(s => s.symbol === symbol);
            if (stock) stock.sharesHeld = (Number(stock.sharesHeld) || 0) + (Number(holding.quantity) || 0);
        }
    }
}



// =================================================================================
// FUNDAMENTY SPÓŁEK
// Zysk nie zależy od ceny akcji. Spółka ma przychody (kalibrowane raz na starcie tak, by
// wycena początkowa odpowiadała kapitalizacji), marżę EBITDA, amortyzację, odsetki i CIT.
// Co kwartał liczymy wskaźniki (EPS, C/Z, C/WK, sprzedaż i WK na akcję) oraz wartość godziwą,
// do której cena powoli wraca (economy.js → updateStockPrices).
// =================================================================================

const FUNDAMENTALS_HISTORY_QUARTERS = 8;

const PHASE_GROWTH_ADJUSTMENT = {
    [CORPORATE_PHASES.GROWTH]: 0.015,
    [CORPORATE_PHASES.STABILITY]: 0,
    [CORPORATE_PHASES.DECLINE]: -0.02,
    [CORPORATE_PHASES.REORGANIZATION]: -0.005,
    [CORPORATE_PHASES.GOLDEN_YEAR]: 0.03,
    [CORPORATE_PHASES.SHADOW_DESCENT]: -0.04,
    [CORPORATE_PHASES.INNOVATION_PUSH]: 0.005
};

/** Spółki z pełnym modelem przychodów (bez typów specjalnych i banków). */
function hasRevenueModel(stock) {
    return Boolean(stock && !stock.assetType && !stock.isBankStock);
}

/**
 * Spółki, których cena jest kotwiczona w wartości godziwej.
 * Banki są wyłączone: ich bilans zawiera depozyty klientów (wartość księgowa wielokrotnie
 * przewyższa kapitalizację), a zysk to stały % aktywów — model banku do osobnej kalibracji.
 */
function hasValuationAnchor(stock) {
    return Boolean(stock && !stock.assetType);
}

function getLoanRate() {
    return typeof LOAN_INTEREST_RATE === 'number' && Number.isFinite(LOAN_INTEREST_RATE) ? LOAN_INTEREST_RATE : 0.10;
}

function initializeFundamentals(stock, force = false) {
    if (!stock || (stock.fundamentals?.version === 1 && !force)) return stock?.fundamentals || null;

    const profile = getSectorProfile(stock);
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const marketCap = Math.max(0.01, Number(stock.price) || 0.01) * shares;
    const liabilities = Math.max(0, Number(stock.balanceSheet?.liabilities) || 0);

    // Kalibracja: roczny zysk netto przy przeciętnej kondycji ≈ kapitalizacja / C/Z sektora.
    const netAnnual = marketCap / profile.pe;
    const ebtAnnual = netAnnual / (1 - COMPANY_INCOME_TAX_RATE);
    const operatingMargin = Math.max(0.05, profile.margin - profile.da);
    const revenue = hasRevenueModel(stock)
        ? Math.max(1000, (ebtAnnual + liabilities * getLoanRate()) / operatingMargin / 4)
        : 0;
    const netQuarter = netAnnual / 4;

    stock.fundamentals = {
        version: 1,
        revenue,
        history: [],
        fairValue: Number(stock.price) || 0.01,
        expectedEps: netQuarter / shares
    };

    // Syntetyczna historia 4 kwartałów, żeby EPS z 4 kwartałów istniał od startu.
    for (let i = 0; i < 4; i++) {
        stock.fundamentals.history.push({
            revenue,
            ebitda: revenue * profile.margin,
            netIncome: netQuarter,
            eps: netQuarter / shares,
            synthetic: true
        });
    }

    updateFundamentalRatios(stock);
    return stock.fundamentals;
}

/** Wynik kwartału z modelu przychodów (bez zmian gotówki — to robi raport). */
function computeQuarterResults(stock) {
    const fundamentals = stock.fundamentals || initializeFundamentals(stock);
    const profile = getSectorProfile(stock);
    const health = Number(stock.financialHealth) || 0;
    const phaseAdj = PHASE_GROWTH_ADJUSTMENT[stock.corporatePhase] || 0;
    const gdp = Number(economyCycle?.gdpGrowth) || 0;

    const growth = profile.growth / 4 + profile.beta * gdp + health * 0.004 + phaseAdj + gaussianRandom() * 0.02;
    fundamentals.revenue = Math.max(1000, fundamentals.revenue * (1 + Math.max(-0.25, Math.min(0.25, growth))));

    const revenue = fundamentals.revenue;
    const margin = Math.max(-0.4, Math.min(0.6, profile.margin + health * 0.015 + phaseAdj * 0.5 + profile.beta * gdp * 2));
    const fixedExpenses = Math.max(0, Number(stock.fixedExpenses) || 0);

    const ebitda = revenue * margin - fixedExpenses;
    const depreciation = revenue * profile.da;
    const interest = Math.max(0, Number(stock.balanceSheet?.liabilities) || 0) * getLoanRate() / 4;
    const ebt = ebitda - depreciation - interest;
    const tax = ebt > 0 ? ebt * COMPANY_INCOME_TAX_RATE : 0;
    let netIncome = ebt - tax;

    // Spółki państwowe: Skarb Państwa pokrywa 70% straty (dotacja).
    let subsidy = 0;
    if (stock.isStateOwned && netIncome < 0) {
        subsidy = -netIncome * 0.7;
        governmentTreasury -= subsidy;
        netIncome += subsidy;
    }

    governmentTreasury += tax;

    return { revenue, ebitda, depreciation, interest, tax, subsidy, netIncome };
}

/** Zapisuje kwartał w historii i przelicza wskaźniki. Zwraca niespodziankę EPS względem oczekiwań. */
function recordQuarterFundamentals(stock, quarter) {
    const fundamentals = stock.fundamentals || initializeFundamentals(stock);
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const eps = quarter.netIncome / shares;
    const expected = Number(fundamentals.expectedEps) || 0;

    fundamentals.history.push({
        revenue: quarter.revenue,
        ebitda: quarter.ebitda,
        netIncome: quarter.netIncome,
        eps
    });
    if (fundamentals.history.length > FUNDAMENTALS_HISTORY_QUARTERS) fundamentals.history.shift();

    const profile = getSectorProfile(stock);
    fundamentals.expectedEps = eps * (1 + profile.growth / 4);
    fundamentals.lastEps = eps;

    updateFundamentalRatios(stock);

    if (Math.abs(expected) < 1e-9) return 0;
    return (eps - expected) / Math.abs(expected);
}

function updateFundamentalRatios(stock) {
    const fundamentals = stock?.fundamentals;
    if (!fundamentals) return null;

    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const last4 = fundamentals.history.slice(-4);
    const sum = key => last4.reduce((total, quarter) => total + (Number(quarter[key]) || 0), 0);

    const equity = (Number(stock.balanceSheet?.assets) || 0) - (Number(stock.balanceSheet?.liabilities) || 0);
    const price = Math.max(0.01, Number(stock.price) || 0.01);

    fundamentals.revenueTtm = sum('revenue');
    fundamentals.ebitdaTtm = sum('ebitda');
    fundamentals.netIncomeTtm = sum('netIncome');
    fundamentals.epsTtm = fundamentals.netIncomeTtm / shares;
    fundamentals.salesPerShare = fundamentals.revenueTtm / shares;
    fundamentals.bookValuePerShare = equity / shares;
    fundamentals.peRatio = fundamentals.epsTtm > 0 ? price / fundamentals.epsTtm : null;
    fundamentals.pbRatio = fundamentals.bookValuePerShare > 0 ? price / fundamentals.bookValuePerShare : null;

    if (hasValuationAnchor(stock)) {
        const profile = getSectorProfile(stock);
        const healthPremium = 1 + Math.max(-0.3, Math.min(0.3, (Number(stock.financialHealth) || 0) * 0.03));
        const bvps = Math.max(0, fundamentals.bookValuePerShare);

        if (stock.isBankStock) {
            // Bank: wycena z zysku (marża odsetkowa); wartość księgowa zawiera depozyty, więc bez kotwicy P/BV.
            fundamentals.fairValue = fundamentals.epsTtm > 0 && (stock.ledgerQuarters || 0) >= 4 ? fundamentals.epsTtm * profile.pe * healthPremium : null;
        } else {
            fundamentals.fairValue = fundamentals.epsTtm > 0
                ? 0.75 * fundamentals.epsTtm * profile.pe * getValuationMultiplier(stock) * healthPremium + 0.25 * bvps
                : Math.max(0.01, bvps * 0.7);
        }
    } else {
        fundamentals.fairValue = null;
    }

    return fundamentals;
}

/** Kondycja finansowa podąża powoli za rentownością (obok wpływu zdarzeń). */
function updateHealthFromProfitability(stock, quarter) {
    if (!(quarter.revenue > 0)) return;
    const netMargin = quarter.netIncome / quarter.revenue;
    const target = Math.max(-5, Math.min(5, (netMargin - 0.06) * 30));
    const health = Number(stock.financialHealth) || 0;
    stock.financialHealth = Math.max(-5, Math.min(5, health + (target - health) * 0.1));
}

// =================================================================================
// STRUKTURA WŁASNOŚCI
// insiderShares — pakiet zarządu i pracowników (poza obrotem). Państwo: stateOwnershipPct.
// Jedno miejsce liczenia akcji dostępnych w obrocie: getAvailableShares.
// =================================================================================

function initializeOwnership(stock) {
    if (!stock || Number.isFinite(stock.insiderShares)) return;

    const privateCompany = !stock.assetType && !stock.isBankStock && !stock.isStateOwned;
    // Pakiety insiderów 15–40%: gracz i boty nadal mogą zdobyć większość (>50%) z wolnego obrotu.
    stock.insiderShares = privateCompany ? Math.floor((Number(stock.totalShares) || 0) * getRandomInRange(0.15, 0.40)) : 0;
}

function getFreeFloatShares(stock) {
    const total = Math.max(0, Number(stock?.totalShares) || 0);
    const insiders = Math.max(0, Number(stock?.insiderShares) || 0);
    const treasury = Math.max(0, Number(stock?.treasuryShares) || 0);
    const state = stock?.isStateOwned ? Math.floor(total * (Number(stock.stateOwnershipPct) || 0)) : 0;
    return Math.max(0, total - insiders - treasury - state);
}

/** Akcje, które można dziś kupić na rynku (wolny obrót minus akcje posiadane przez inwestorów). */
function getAvailableShares(stock) {
    return Math.max(0, Math.floor(getFreeFloatShares(stock) - Math.max(0, Number(stock?.sharesHeld) || 0)));
}

// =================================================================================
// DYWIDENDY — strategia = stopa wypłaty z zysku netto kwartału
// Po raporcie zarząd ogłasza dywidendę; wypłata następuje po krótkim czasie (dividendTimer),
// z gotówki spółki. W dniu wypłaty cena spada o dywidendę na akcję.
// =================================================================================

const DIVIDEND_POLICIES = {
    Growth:     { label: 'Wzrost (0%)',      min: 0,    max: 0 },
    Balanced:   { label: 'Zachęta (1–10%)',  min: 0.01, max: 0.10 },
    Aggressive: { label: 'Wysoka (10–50%)',  min: 0.10, max: 0.50 },
    Total:      { label: 'Pełna (100%)',     min: 1.0,  max: 1.0 }
};

const DIVIDEND_POLICY_ORDER = ['Growth', 'Balanced', 'Aggressive', 'Total'];

function normalizeDividendPolicy(policy) {
    return DIVIDEND_POLICIES[policy] ? policy : 'Growth'; // 'None' i brak = Wzrost
}

function getDividendPolicyLabel(policy) {
    return DIVIDEND_POLICIES[normalizeDividendPolicy(policy)].label;
}

function setCompanyDividendPolicy(stock, policy) {
    stock.dividendPolicy = normalizeDividendPolicy(policy);
    const def = DIVIDEND_POLICIES[stock.dividendPolicy];
    stock.dividendPayoutRatio = def.min === def.max ? def.min : getRandomInRange(def.min, def.max);
}

function assignInitialDividendPolicies() {
    stocks.forEach(stock => {
        if (stock.assetType === 'REIT') return;
        if (stock.exchange === 'JUNK' || stock.assetType) {
            setCompanyDividendPolicy(stock, 'Growth');
        } else {
            setCompanyDividendPolicy(stock, getRandomElement(DIVIDEND_POLICY_ORDER));
        }
    });
    console.log('[START GRY] Przypisano początkowe polityki dywidendowe.');
}

function initializeDividendEstimates() {
    stocks.forEach(stock => {
        if (stock.assetType === 'REIT') {
            stock.estimatedDividend = stock.dividendPerShare;
            return;
        }
        if (!Number.isFinite(stock.dividendPayoutRatio)) setCompanyDividendPolicy(stock, stock.dividendPolicy);
        const eps = Number(stock.fundamentals?.expectedEps) || 0;
        stock.estimatedDividend = Math.max(0, eps * stock.dividendPayoutRatio);
        stock.dividendTimer = BASE_DELAYS.quarterly;
    });
}

/** Zarząd (AI) rzadko zmienia strategię wg cyklu, kondycji i gotówki — chyba że narzucił ją właściciel. */
function reviewDividendPolicy(stock) {
    if (stock.assetType || stock.dividendPolicyLockedByOwner || Math.random() > 0.08) return;

    const index = DIVIDEND_POLICY_ORDER.indexOf(normalizeDividendPolicy(stock.dividendPolicy));
    const health = Number(stock.financialHealth) || 0;
    let next = index;

    if ((economyCycle.phase === 'recession' || health < -1) && index > 0) next = index - 1;
    else if ((economyCycle.phase === 'expansion' || economyCycle.phase === 'overheating') && health > 2 && index < 2) next = index + 1;
    else if (stock.corporatePhase === CORPORATE_PHASES.GROWTH && index > 0) next = 0;

    if (next !== index) {
        setCompanyDividendPolicy(stock, DIVIDEND_POLICY_ORDER[next]);
        logEvent(`💼 Zarząd ${stock.name} zmienia strategię dywidendową na: ${getDividendPolicyLabel(stock.dividendPolicy)}.`, 'company');
    }
}

/** Ogłoszenie dywidendy po raporcie (wypłata po dividendTimer). */
function declareQuarterDividend(stock, reportedNetIncome) {
    if (stock.assetType === 'REIT') return;

    stock.pendingDividend = null;
    stock.estimatedDividend = 0;
    stock.dividendTimer = BASE_DELAYS.quarterly;

    if (!Number.isFinite(stock.dividendPayoutRatio)) setCompanyDividendPolicy(stock, stock.dividendPolicy);

    if (stock.ceo?.traits?.some(t => t.id === 'skapiec')) return;

    let ratio = stock.dividendPayoutRatio;
    const isGenerous = stock.ceo?.traits?.some(t => t.id === 'szczodry');
    if (isGenerous) ratio = Math.min(1, Math.max(ratio, 0.05) * 1.15);

    if (!(ratio > 0) || !(reportedNetIncome > 0)) return;

    const available = Math.max(0, Number(stock.cash) || 0) * 0.8;
    const total = Math.min(reportedNetIncome * ratio, available);
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    if (total <= 0) return;

    stock.pendingDividend = { total, dps: total / shares, declaredAt: Date.now() };
    stock.estimatedDividend = total / shares;
    stock.dividendTimer = getRandomIntInRange(30000, 90000);
}

/** Wypłata dywidendy: z gotówki spółki, cena spada o dywidendę na akcję. */
function payCompanyDividend(stock, dividendPerShare, purpose = 'Dywidenda') {
    const shares = Math.max(1, Number(stock.totalShares) || 1);
    const maxTotal = Math.max(0, Number(stock.cash) || 0);
    const total = Math.min(dividendPerShare * shares, maxTotal);
    if (!(total > 0)) return 0;

    const dps = total / shares;
    adjustCompanyCash(stock, -total);
    adjustBalanceSheet(stock, { assets: -total, retainedEarnings: -total });
    recordPayment(stock, 'external:akcjonariusze', total, purpose);

    stock.lastDividend = { dps, total, paidAt: Date.now(), yield: dps / Math.max(0.01, stock.price) };
    payDividendToShareholders(stock, dps);
    return total;
}

function updateDividendTimers(deltaTime) {
    stocks.forEach(stock => {
        if (stock.isBankrupt) return;

        if (stock.assetType === 'REIT') {
            stock.dividendTimer -= deltaTime;
            if (stock.dividendTimer <= 0) {
                processReitDividend(stock);
                stock.dividendTimer = 2 * 60 * 1000;
            }
            return;
        }

        if (!stock.pendingDividend) return;

        stock.dividendTimer -= deltaTime;
        if (stock.dividendTimer > 0) return;

        const declared = stock.pendingDividend;
        stock.pendingDividend = null;
        stock.estimatedDividend = 0;
        stock.dividendTimer = BASE_DELAYS.quarterly;
        payCompanyDividend(stock, declared.dps, 'Dywidenda kwartalna');
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

        // Dochód bazowy typów specjalnych (lombard, biuro rachunkowe). Spółki standardowe mają model przychodów.
        const baseQuarterlyIncome = 0;
        let quarterModel = null;   // wynik z modelu przychodów (spółki standardowe)
        let nonCashCosts = 0;      // amortyzacja: obniża wynik, ale nie gotówkę
        if (!stock.fundamentals) initializeFundamentals(stock);


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
            // Wynik = marża odsetkowa z księgi banku (finance.js); stary wzór tylko bez danych.
            const ledgerResult = typeof getBankQuarterlyEarnings === 'function' ? getBankQuarterlyEarnings(stock) : null;
            if (ledgerResult !== null) {
                quarterlyEarnings = ledgerResult;
            } else {
                const loanIncome = stock.balanceSheet.assets * 0.01;
                const depositCosts = stock.balanceSheet.liabilities * 0.005;
                quarterlyEarnings = (loanIncome - depositCosts) * (1 + (stock.financialHealth / 10));
            }

        } else if (!stock.assetType) {
            // 🏭 Spółki standardowe i państwowe: model przychodów, kosztów, amortyzacji, odsetek i CIT.
            // Zysk nie zależy od ceny akcji.
            quarterModel = computeQuarterResults(stock);
            quarterlyEarnings = quarterModel.netIncome;
            nonCashCosts = quarterModel.depreciation;
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
        // Koszty stałe z inwestycji: w modelu przychodów są już w EBITDA.
        if (stock.fixedExpenses && !quarterModel) {
            quarterlyEarnings -= stock.fixedExpenses;
        }

        // --- Wynik raportowany a przepływy gotówki ---
        // quarterlyEarnings to wynik operacyjny symulowany przez raport: wpływa na gotówkę teraz.
        // Koszty R&D, wynik kontraktów budowlanych, dochody z nieruchomości i koszty inwestycji
        // zostały rozliczone w gotówce i bilansie w chwili zdarzenia — raport tylko je pokazuje
        // i nie "wypłaca" ich drugi raz. Ponowny raport nie zobaczy tych samych pozycji.
        const operatingCashResult = quarterlyEarnings;
        const recognizedResearchExpense = recognizeResearchExpenses(stock);
        const periodResults = takePeriodResults(stock);
        const constructionResult = periodResults.constructionRevenue - periodResults.constructionCosts;
        const reportedQuarterlyEarnings = operatingCashResult - recognizedResearchExpense + periodResults.total;

        stock.quarterlyEarnings = reportedQuarterlyEarnings;
        stock.lastReportBreakdown = {
            reportedAt: Date.now(),
            operating: operatingCashResult,
            researchExpense: recognizedResearchExpense,
            constructionRevenue: periodResults.constructionRevenue,
            constructionCosts: periodResults.constructionCosts,
            propertyIncome: periodResults.propertyIncome,
            investmentExpense: periodResults.investmentExpense,
            otherIncome: periodResults.otherIncome,
            total: reportedQuarterlyEarnings
        };

        // Gotówka: zysk netto + amortyzacja (koszt niegotówkowy). Aktywa i kapitał: zysk netto.
        adjustCompanyCash(stock, operatingCashResult + nonCashCosts);
        adjustBalanceSheet(stock, { assets: operatingCashResult, retainedEarnings: operatingCashResult });

        // Fundamenty kwartału (EPS z wyniku raportowanego: z R&D i kontraktami).
        const earningsSurprise = recordQuarterFundamentals(stock, {
            revenue: (quarterModel ? quarterModel.revenue : 0) + periodResults.constructionRevenue,
            ebitda: quarterModel ? quarterModel.ebitda : reportedQuarterlyEarnings,
            netIncome: reportedQuarterlyEarnings
        });
        if (quarterModel) {
            stock.lastReportBreakdown.revenue = quarterModel.revenue;
            stock.lastReportBreakdown.ebitda = quarterModel.ebitda;
            stock.lastReportBreakdown.depreciation = quarterModel.depreciation;
            stock.lastReportBreakdown.interest = quarterModel.interest;
            stock.lastReportBreakdown.tax = quarterModel.tax;
            stock.lastReportBreakdown.subsidy = quarterModel.subsidy;
            updateHealthFromProfitability(stock, quarterModel);
        }

        // Wynik kontraktów wpływa na ocenę kondycji spółki (ograniczony wpływ).
        if (constructionResult !== 0) {
            const scale = Math.max(50000, Math.abs(marketCap) * 0.02);
            const change = Math.max(-0.5, Math.min(0.5, constructionResult / scale));
            stock.financialHealth = Math.min(5, (Number(stock.financialHealth) || 0) + change);
        }

        // Transfer 50% zysku do spółki-matki — tylko z dodatniego wyniku i w granicach gotówki.
        if (stock.isSubsidiaryOf && reportedQuarterlyEarnings > 0) {
            const parentStock = stocks.find(s => s.symbol === stock.isSubsidiaryOf);
            const earningsToTransfer = parentStock
                ? Math.min(reportedQuarterlyEarnings * 0.5, Math.max(0, Number(stock.cash) || 0))
                : 0;

            if (earningsToTransfer > 0) {
                transferCompanyCash(stock, parentStock, earningsToTransfer, 'Transfer zysku do spółki-matki');
                adjustBalanceSheet(stock, { assets: -earningsToTransfer, retainedEarnings: -earningsToTransfer });
                adjustBalanceSheet(parentStock, { assets: earningsToTransfer, retainedEarnings: earningsToTransfer });

                logEvent(`💸 Spółka zależna ${stock.name} transferuje ${earningsToTransfer.toFixed(0)} PLN zysku do ${parentStock.name}.`, 'company');
            }
        }

        // Finansowanie: decyzje na podstawie pełnego wyniku (z R&D i kontraktami).
        if (reportedQuarterlyEarnings < 0 && stock.assetType !== 'Holding' && !stock.isBankStock) {
            // Firma ze stratą zaciąga mały dług, aby zachować płynność (gotówka i dług rosną razem).
            const debtIncrease = Math.abs(reportedQuarterlyEarnings) * getRandomInRange(0.1, 0.4);
            borrowForCompany(stock, debtIncrease, 'Kredyt na płynność po stracie');
        } else if (reportedQuarterlyEarnings > 0 && stock.balanceSheet.liabilities > 0 && stock.cash > 0) {
            // Firma z zyskiem spłaca część długu.
            const debtRepayment = Math.min(stock.cash * 0.5, reportedQuarterlyEarnings * getRandomInRange(0.1, 0.3));
            repayCompanyDebt(stock, Math.min(debtRepayment, stock.balanceSheet.liabilities));
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

        // Reakcja rynku na raport: niespodzianka EPS względem oczekiwań (nie progi kondycji).
        let reportResult = 'neutral';
        let magnitude = 0;
        let eventMessage = '';
        const surprise = Math.max(-1, Math.min(1, earningsSurprise));

        if (surprise >= 0.5) {
            reportResult = 'excellent';
            eventMessage = `📈 DOSKONAŁY RAPORT! ${stock.name} (${stock.symbol}): zysk znacznie powyżej oczekiwań.`;
        } else if (surprise >= 0.15) {
            reportResult = 'good';
            eventMessage = `📈 DOBRY RAPORT: Wyniki ${stock.name} (${stock.symbol}) powyżej oczekiwań.`;
        } else if (surprise <= -0.5) {
            reportResult = 'tragic';
            eventMessage = `📉 TRAGICZNY RAPORT! ${stock.name} (${stock.symbol}) mocno rozczarowuje wynikami.`;
        } else if (surprise <= -0.15) {
            reportResult = 'bad';
            eventMessage = `📉 SŁABY RAPORT: ${stock.name} (${stock.symbol}) notuje wyniki poniżej prognoz.`;
        }

        if (reportResult !== 'neutral') {
            magnitude = Math.max(-0.12, Math.min(0.12, surprise * 0.12));
        }

        stock.lastReport = reportResult;
        if (reportResult !== 'neutral') {
            logEvent(eventMessage);
            applyPriceEffect(stock.symbol, magnitude, magnitude < 0 ? 'negative' : 'positive', 'review');
        }

        // Dywidenda: zarząd może zmienić strategię, potem ogłasza wypłatę z zysku kwartału.
        reviewDividendPolicy(stock);
        declareQuarterDividend(stock, reportedQuarterlyEarnings);

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
                     adjustCompanyCash(stock, -cityTax);
                     adjustBalanceSheet(stock, { assets: -cityTax, retainedEarnings: -cityTax });
                     city.budget += cityTax;
                 }
                 // Nie logujemy tego, żeby nie spamować
            }
        }

    } // Koniec pętli for

    // Wartość godziwa po raportach (nowa faza cyklu i stopy mogły zmienić wyceny).
    stocks.forEach(stock => {
        if (!stock.isBankrupt && stock.fundamentals) updateFundamentalRatios(stock);
    });

    displayStocks(getCurrentInputValues());
    displayPortfolio();
    console.log("[RAPORTY KWARTALNE] Przetwarzanie zakończone.");
    checkCompanyCounterActions();
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
    // Przejęcie firmy zarządzającej przez korporację gracza (career.js) — bez spółki-inicjatora.
    if (stock.mergerProcess.type === 'fundTakeover') return advanceFundTakeover(stock);
    const process = stock.mergerProcess;
    const partnerStock = stocks.find(s => s.symbol === process.partnerSymbol);
if (!partnerStock || partnerStock.isBankrupt) {
  cancelMerger(stock, "Partner przestał istnieć lub zbankrutował.");
  if (partnerStock) {
    cancelMerger(partnerStock, "Partner przestał istnieć lub zbankrutował.");
  }
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

function initializeResearchForStock(stock, options = {}) {
    if (!stock || stock.isBankrupt) return false;

    // Nie resetujemy już istniejącego systemu.
    if (stock.research && typeof stock.research === 'object') {
        return false;
    }

    const excludedTypes = [
        'Startup',
        'REIT',
        'ResearchInstitute'
    ];

    if (excludedTypes.includes(stock.assetType)) {
        stock.research = null;
        stock.researchUnlocks = null;
        return false;
    }

    // Banki nadal korzystają z własnego systemu inwestycji.
    if (stock.isBankStock) {
        const investmentIds = Object.keys(bankInvestments);

        if (investmentIds.length === 0) {
            stock.research = null;
            return false;
        }

        const firstId = getRandomElement(investmentIds);
        const investment = bankInvestments[firstId];
        const bank = commercialBanks.find(
            item => item.id === stock.bankData?.id
        );

        const cost = Number(investment.initialCashCost ?? 0);
        const requiredProgress = Number(investment.baseCost);

        if (
            !Number.isFinite(cost) ||
            cost < 0 ||
            !Number.isFinite(requiredProgress) ||
            requiredProgress <= 0
        ) {
            return false;
        }

        stock.research = {
            isInvestment: true,
            isResearching: false,
            currentInvestmentId: firstId,
            progress: 0,
            requiredProgress,
            completedInvestments: Object.fromEntries(
                investmentIds.map(id => [id, 0])
            ),
            investmentPaused: false,
            ledger: [],
            pendingQuarterlyExpense: 0
        };

        if (
            bank &&
            Number.isFinite(Number(bank.cash)) &&
            Number(bank.cash) >= cost
        ) {
            bank.cash = Number(bank.cash) - cost;
            stock.research.isResearching = true;

            logEvent(
                `Bank ${stock.name} rozpoczyna inwestycję ` +
                `„${investment.name}” za ${cost.toFixed(2)} PLN.`,
                'company'
            );
        } else {
            stock.research.investmentPaused = true;

            logEvent(
                `Bank ${stock.name} oczekuje na środki na inwestycję ` +
                `„${investment.name}”.`,
                'company'
            );
        }

        return true;
    }

    if (!Array.isArray(stock.sector)) return false;

    const specializations = [
        'wzmacnianie rozwoju',
        'wzmacnianie pozycji na rynku',
        'wzmacnianie ceny i zysków'
    ];

    const shouldResearch = typeof options.enabled === 'boolean'
        ? options.enabled
        : Math.random() > 0.10;

    const specialization = specializations.includes(options.specialization)
        ? options.specialization
        : getRandomElement(specializations);

    stock.research = {
        isInvestment: false,
        isResearching: false,
        specialization,
        researchSpeedMultiplier: 1,
        currentTech: null,
        progress: 0,
        unlockedTechs: [],
        researchPaused: false,
        choiceAvailableUntil: null,
        choiceRemainingGameMs: null,
        autoResearchEnabled: shouldResearch,
        autoRetryGameMs: null,
        ledger: [],
        pendingQuarterlyExpense: 0
    };

    const unlockDefaults = {
        canSeeSpecialization: false,
        canSeeResults: false,
        canFund: false,
        canInfluence: false,
        canInterfere: false
    };

    stock.researchUnlocks = {
        ...unlockDefaults,
        ...(stock.researchUnlocks || {})
    };

    if (!shouldResearch) return true;

    const available = getAvailableCompanyResearch(stock, true);

    if (available.length === 0) {
        stock.research.autoRetryGameMs = BASE_DELAYS.weekly;

        logEvent(
            `${stock.name}: R&D przygotowane, ale brak dostępnego ` +
            'badania, na które spółkę stać. Wybór zostanie ponowiony.',
            'company'
        );

        return true;
    }

    const isBuilder = stock.sector.includes('Budowlany');

    const preferred = isBuilder
        ? available.filter(
            id =>
                technologies[id].sector === 'Budowlany' &&
                technologies[id].constructionEffects
        )
        : [];

    const pool = preferred.length > 0 ? preferred : available;

    const firstId = (
        options.firstTechId &&
        available.includes(options.firstTechId)
    )
        ? options.firstTechId
        : getRandomElement(pool);

    const started = startCompanyResearch(stock, firstId);

    if (!started) {
        stock.research.autoRetryGameMs = BASE_DELAYS.weekly;
    }

    return true;
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
    if (!FEATURE_FLAGS.startups) { if (typeof showToast === 'function') showToast('Inwestycje w startupy są tymczasowo wyłączone.', 'default'); return; } // wyłączone w etapie B

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
                const availableShares = getAvailableShares(targetStock);

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
        { name: "Oczyszczalnia Ścieków 'Woda Czysta'", type: 'Usługi', budget: 50000 },
        { name: "Drogi i Zieleń Miejska", type: 'Przemysł', budget: 30000 },
        { name: "Sortownia Odpadów 'EkoGdańsk'", type: 'Usługi', budget: 40000 },
        { name: "Elektrociepłownia Miejska", type: 'Energia', budget: 150000 },
        { name: "Stadion Miejski", type: 'Turystyka', budget: 10000 },
        { name: "Szpital Miejski", type: 'Medycyna', budget: 80000 },
        { name: "Dom Kultury", type: 'Usługi', budget: 5000 },
        { name: "Wodociągi Miejskie", type: 'Usługi', budget: 60000 }
    ];

    municipalNames.forEach(comp => {
        municipalCompanies.push({
            id: `mun_${comp.name.substring(0, 3).toUpperCase()}`,
            name: comp.name,
            type: comp.type,
            budget: comp.budget,
            baseIncome: comp.budget * 0.1
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

// setDividendPolicy: zob. player.js (jedna implementacja).

function executeForcedDividend(stock) {
    if (Date.now() < stock.dividendCooldownUntil) {
        return false; // Nie można jeszcze wymusić dywidendy
    }

    // Specjalna dywidenda: do 4% kapitalizacji, ale tylko z gotówki spółki.
    const dividendTotalAmount = Math.min((stock.price * stock.totalShares) * 0.04, Math.max(0, Number(stock.cash) || 0) * 0.8);
    if (!(dividendTotalAmount > 0)) return false;

    payCompanyDividend(stock, dividendTotalAmount / stock.totalShares, 'Dywidenda specjalna');

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

function runDebtCollectorAI() {
    const collectors = stocks.filter(s => s.assetType === 'DebtCollector' && !s.isBankrupt && s.cash > 20000); // Musi mieć gotówkę
    if (collectors.length === 0) return;

    // Zbierz wszystkie potencjalne długi (tylko bankowe z problemami)
    const potentialDebts = [];
    
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

    if (targetEntity === 'player') return; // gracz nie ma prywatnych kredytów (fundusz: finance.js)
    aiDecideOnDebtOffer(targetEntity, collectorStock, loan, newInterestRate);
}

function runPawnShopAI() {
    const pawnShops = stocks.filter(s => s.assetType === 'PawnShop' && !s.isBankrupt && s.cash > 50000); // Musi mieć gotówkę na pożyczki
    if (pawnShops.length === 0) return;

    // Zbierz potencjalnych klientów (Gracz i AI, którzy mają kłopoty LUB cenne akcje)
    const potentialClients = [];
    
    // Klienci: tylko boty (zastaw funduszu gracza: finance.js)
    aiCompetitors.forEach(ai => {
        const aiNetWorth = calculateNetWorth(ai);
        const aiCashRatio = ai.cash / aiNetWorth;
        const aiHasDebt = ai.loans && ai.loans.some(l => (l.missedPayments || 0) > 0);
        if (aiHasDebt || aiCashRatio < 0.03) { // prawdziwe zaległości lub brak gotówki
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


    if (targetEntity === 'player') return;
    aiDecideOnPawnOffer(targetEntity, pawnShop, stockToPawn, quantity, loanAmount, newInterestRate, durationWeeks);
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
    const stock = stocks.find(s => s.symbol === targetCompany?.symbol);
    if (!stock) return;

    totalCashRaised = Number(totalCashRaised) || 0;
    totalSharesBought = Number(totalSharesBought) || 0;
    const initialDebt = Number(stock.corporateDebt) || 0;

    stock.corporateDebt = initialDebt - totalCashRaised;
    if (stock.corporateDebt < 0) stock.corporateDebt = 0;

    // Zwiększamy liczbę akcji w obiegu o te, które zostały faktycznie kupione
    stock.totalShares = Number(stock.totalShares || 0) + totalSharesBought;

    logEvent(`[FINAŁ EMISJI] Emisja ratunkowa w ${stock.name} zebrała ${totalCashRaised.toFixed(2)} PLN. Dług spółki zmniejszył się z ${initialDebt.toFixed(2)} PLN do ${stock.corporateDebt.toFixed(2)} PLN.`, 'review');

    // Nagroda: Poprawa kondycji finansowej, jeśli udało się zebrać jakiekolwiek środki
    if (totalCashRaised > 0) {
        stock.financialHealth = Number(stock.financialHealth || 0) + 1;
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

function checkMortgageDefaults() {
    const now = Date.now();
    let auctionStartedThisCycle = false; // Flaga, aby uruchomić max jedną aukcję na cykl

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

function applyTechnology(company, techId) {
    const research = company?.research;
    const tech = technologies[techId];

    if (
        !company ||
        company.isBankrupt ||
        !research ||
        research.isInvestment ||
        !tech ||
        research.currentTech !== techId ||
        !research.isResearching
    ) {
        return false;
    }

    const progress = Number(research.progress);
    const required = Number(tech.cost);

    if (
        !Number.isFinite(progress) ||
        !Number.isFinite(required) ||
        required <= 0 ||
        progress < required
    ) {
        return false;
    }

    if (!Array.isArray(research.unlockedTechs)) {
        research.unlockedTechs = [];
    }

    if (research.unlockedTechs.includes(techId)) {
        research.currentTech = null;
        research.progress = 0;
        research.isResearching = false;
        research.researchPaused = false;
        research.choiceAvailableUntil = null;
        research.choiceRemainingGameMs = null;
        return false;
    }

    if (typeof tech.applyEffect === 'function') {
        tech.applyEffect(company);
    }

    research.unlockedTechs.push(techId);
    research.currentTech = null;
    research.progress = 0;
    research.isResearching = false;
    research.researchPaused = false;
    research.choiceAvailableUntil = null;
    research.choiceRemainingGameMs = null;

    logEvent(
        `${company.name} ukończyła badanie „${tech.name}”.`,
        'company'
    );

    const available = getAvailableCompanyResearch(company);

    if (available.length === 0) {
        logEvent(
            `${company.name}: brak kolejnych dostępnych badań ` +
            'w obecnej specjalizacji.',
            'company'
        );

        return true;
    }

    if (company.researchUnlocks?.canInterfere) {
        research.choiceRemainingGameMs = 15000;

        // Pole pozostaje sygnałem dla dotychczasowych elementów UI.
        research.choiceAvailableUntil = Date.now() + 15000;
        research.isResearching = true;

        logEvent(
            `${company.name} czeka na wybór kolejnego badania. ` +
            'Czas decyzji: 15 sekund symulacji.',
            'company'
        );
    } else {
        const affordable = getAvailableCompanyResearch(company, true);

        if (affordable.length > 0) {
            startCompanyResearch(
                company,
                getRandomElement(affordable)
            );
        } else {
            logEvent(
                `${company.name}: brak środków na kolejne badanie.`,
                'company'
            );
        }
    }

    return true;
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
                let baseSpeedMultiplier = stock.research.researchSpeedMultiplier || 1.0;
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
                if (stock.departments && stock.departments.research.level >= 3) {
            baseSpeedMultiplier *= 1.10; // +10% prędkości
                }

                let phaseMultiplier = 1.0;
                if (stock.corporatePhase === CORPORATE_PHASES.INNOVATION_PUSH) {
                    phaseMultiplier = 1.5; // +50% prędkości badań
                } else if (stock.corporatePhase === CORPORATE_PHASES.DECLINE || stock.corporatePhase === CORPORATE_PHASES.SHADOW_DESCENT) {
                     phaseMultiplier = 0.7; // -30% prędkości w fazie spadku
                }

                // Dodaj punkty postępu
                stock.research.progress += researchPoints * baseSpeedMultiplier * ceoMultiplier * phaseMultiplier;

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
    const company = stocks.find(stock => stock.symbol === symbol);

    if (
        !company ||
        !company.researchUnlocks?.canInterfere
    ) {
        return false;
    }

    const started = startCompanyResearch(company, chosenTechId);

    if (!started) return false;

    const researchModal = document.getElementById('research-modal');

    if (
        researchModal?.style.display === 'block' &&
        researchModal.dataset.currentSymbol === symbol
    ) {
        openResearchModal(symbol);
    }

    updateConstructionSectorUI();

    return true;
}

function checkResearchChoiceTimers(deltaTime = 0) {
    const delta = Number(deltaTime);

    if (!Number.isFinite(delta) || delta < 0) return;

    for (const company of stocks) {
        const research = company.research;

        if (!research || research.isInvestment) continue;

        if (company.isBankrupt) {
            research.choiceAvailableUntil = null;
            research.choiceRemainingGameMs = null;
            continue;
        }

        if (research.currentTech || !research.choiceAvailableUntil) {
            research.choiceRemainingGameMs = null;
            continue;
        }

        // Starsza, aktywna decyzja otrzymuje pełne 15 s symulacji.
        if (
            !Number.isFinite(research.choiceRemainingGameMs) ||
            research.choiceRemainingGameMs < 0
        ) {
            research.choiceRemainingGameMs = 15000;
        }

        if (isGamePaused) continue;

        research.choiceRemainingGameMs = Math.max(
            0,
            research.choiceRemainingGameMs - delta
        );

        if (research.choiceRemainingGameMs > 0) continue;

        research.choiceAvailableUntil = null;
        research.choiceRemainingGameMs = null;
        research.isResearching = false;

        const available = getAvailableCompanyResearch(company, true);

        if (available.length > 0) {
            startCompanyResearch(
                company,
                getRandomElement(available)
            );
        } else {
            logEvent(
                `${company.name}: czas wyboru minął, ale brak ` +
                'dostępnego badania, na które spółkę stać.',
                'company'
            );
        }
    }
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

    if (!stock.research || stock.research.isInvestment || !stock.research.currentTech) {
        alert("Spółka nie prowadzi teraz badania, które można sfinansować.");
        return;
    }

    playerCash -= amount;
    stock.research.progress += amount; // 1 PLN = 1 punkt postępu
    // Gracz płaci za zewnętrzne prace badawcze — środki opuszczają model (jawnie oznaczone).
    recordPayment('player', 'external:uslugi_badawcze', amount, `Finansowanie badań w ${stock.name}`);
    
    showToast(`Sfinansowano badania w ${stock.name} kwotą ${amount.toFixed(2)} PLN!`, 'success');
    logEvent(`🔬 Przyspieszono badania w ${stock.name} o ${amount} punktów.`);

    displayCash();
    openResearchModal(symbol); // Odśwież widok
    openManagementModal(symbol); // Odśwież też główny panel, by zaktualizować pasek
    amountInput.value = '';
}

function changeResearchSpecialization(symbol) {
    const company = stocks.find(stock => stock.symbol === symbol);
    const select = document.getElementById('rd-specialization-select');
    const research = company?.research;

    if (
        !company ||
        !research ||
        research.isInvestment ||
        !company.researchUnlocks?.canInfluence ||
        !select
    ) {
        return false;
    }

    if (research.currentTech) {
        showToast(
            'Najpierw ukończ obecne badanie. Zmiana kierunku nie może go porzucić.',
            'warning'
        );
        return false;
    }

    const allowed = [
        'wzmacnianie rozwoju',
        'wzmacnianie pozycji na rynku',
        'wzmacnianie ceny i zysków'
    ];

    const selected = select.value;

    if (
        !allowed.includes(selected) ||
        selected === research.specialization
    ) {
        return false;
    }

    research.specialization = selected;
    research.progress = 0;
    research.choiceAvailableUntil = null;
    research.isResearching = false;
    research.researchPaused = false;

    const affordable = getAvailableCompanyResearch(company, true);

    if (affordable.length > 0) {
        startCompanyResearch(
            company,
            getRandomElement(affordable)
        );
    }

    logEvent(
        `${company.name} zmienia kierunek badań na „${selected}”.`,
        'company'
    );

    openResearchModal(symbol);
    updateConstructionSectorUI();

    return true;
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
                    const availableSharesOnMarket = getAvailableShares(stock);

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
        // Sprawdzamy tylko aktywne spółki z prezesami
        if (stock.ceo && !stock.isBankrupt && !stock.assetType) {
            
            // 1. Podstawowe starzenie prezesa
            stock.ceo.age += 1;
            stock.ceo.tenure += 4; // Dodajemy 4 kwartały do stażu
            
            // 2. NOWOŚĆ: Logika przejścia na emeryturę (start od 65 lat)
            if (stock.ceo.age >= 65) {
                // Szansa rośnie z każdym rokiem (65 lat = 15%, 66 lat = 30%, 70 lat = 90%)
                const retirementChance = (stock.ceo.age - 64) * 0.15; 
                
                if (Math.random() < retirementChance) {
                    logEvent(`👴 Prezes ${stock.ceo.name} (${stock.name}) przeszedł na zasłużoną emeryturę w wieku ${stock.ceo.age} lat.`, 'company');
                    
                    // Powołanie nowej osoby na miejsce starego prezesa
                    if (typeof generateCEO === 'function') {
                        generateCEO(stock);
                    }
                }
            }
        }
    });
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
        // Giełdy elitarne przydziela ranking kapitalizacji (assignEliteExchanges, finance.js).
        if (exchanges[currentExchangeKey]?.rankBased && correctExchangeKey === 'PLATINUM') return;

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
                setCompanyDividendPolicy(stock, getRandomElement(DIVIDEND_POLICY_ORDER));
                message += ` Spółka ustala swoją politykę dywidendową na: ${getDividendPolicyLabel(stock.dividendPolicy)}.`;
            } else if (Math.random() < 0.25) {
                const oldPolicy = stock.dividendPolicy;
                if (!stock.dividendPolicyLockedByOwner) setCompanyDividendPolicy(stock, getRandomElement(DIVIDEND_POLICY_ORDER));
                if (oldPolicy !== stock.dividendPolicy) {
                    message += ` Zarząd rewiduje strategię i zmienia politykę dywidendową na: ${getDividendPolicyLabel(stock.dividendPolicy)}!`;
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

    if (!targetEntity.loans) targetEntity.loans = [];
    targetEntity.loans.push(newLoan);

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

function initializeConstructionCompanies() {
    CONSTRUCTION_COMPANIES_DATA.forEach(data => {
        const tempSymbol = data.name.substring(0, 3).toUpperCase() + 'B';
        const existing = stocks.find(s => s.symbol === tempSymbol || s.name === data.name);
        
        if (existing) {
            if (!existing.sector.includes('Budowlany')) existing.sector.push('Budowlany');
            if (!existing.constructionStats) {
                existing.constructionStats = { experience: getRandomIntInRange(10, 80), currentProjects: 0, wonTenders: 0 };
                updateConstructionCapacity(existing);
            }
            if (!existing.departments) initializeDepartments(existing);
            if (!existing.bankAccountId) assignBankToCompany(existing);
            return;
        }

        // ZMIANA: Losowa liczba akcji zamiast MAX
        const range = SHARE_LIMIT_RANGES[data.exchange];
        const totalShares = getRandomIntInRange(range.min, range.max);

        // ZMIANA: Losowa polityka dywidendowa
        const policies = ['Balanced', 'Aggressive', 'Growth', 'Total'];
        const randomPolicy = getRandomElement(policies);

        const newStock = {
            name: data.name,
            symbol: tempSymbol, 
            price: data.price,
            volatilityFactor: data.volatility,
            exchange: data.exchange,
            totalShares: totalShares,
            maxShares: totalShares, // Na start max = total
            sharesHeld: data.isStateOwned ? Math.floor(totalShares * data.stateOwnershipPct) : 0,
            sector: data.sector,
            financialHealth: 1,
            // Bilans startowy
            balanceSheet: { assets: data.price * totalShares, liabilities: 0, shareCapital: data.price * totalShares * 0.1, retainedEarnings: data.price * totalShares * 0.9 },
            quarterlyEarnings: 0,
            cash: data.price * totalShares * 0.05, 
            priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
            isStateOwned: data.isStateOwned || false,
            stateOwnershipPct: data.stateOwnershipPct || 0,
            dividendPolicy: randomPolicy, // Zastosowanie losowej polityki
            dividendTimer: getRandomIntInRange(60000, 120000),
            
            constructionStats: {
                experience: getRandomIntInRange(0, 50),
                currentProjects: 0,
                wonTenders: 0
            }
        };
        
        initializeDescriptionParts(newStock);
        generateCEO(newStock);
        initializeDepartments(newStock);
        assignBankToCompany(newStock);
        initializeReputation(newStock);
        
        stocks.push(newStock);
    });
    console.log("[COMPANIES] Sektor budowlany zainicjalizowany (z losowością).");
}

// --- FUNKCJE LOGIKI DZIAŁÓW I INWESTYCJI (Wklej na dole companies.js) ---

function initializeDepartments(stock) {
    // Pomiń typy specjalne, one nie mają działów
    if (stock.assetType || stock.isBankStock) return;

    stock.departments = {
        research: { level: getRandomIntInRange(0, 1) },
        development: { level: getRandomIntInRange(0, 1) },
        economy: { level: getRandomIntInRange(0, 1) }
    };
    stock.activeInvestments = [];
}

function runCorporateLogic() {
    stocks.forEach(stock => {
        if (stock.assetType || stock.isBankrupt || stock.isBankStock) return;

        // Autonaprawa działów
        if (!stock.departments) initializeDepartments(stock);
        if (!stock.departments) return;
        if (!Array.isArray(stock.activeInvestments)) stock.activeInvestments = [];

        // --- 1. Dział Ekonomii ---
        // Lvl 2: Optymalizacja Bankowa (szukanie lepszego oprocentowania)
        if (stock.departments.economy.level >= 2 && Math.random() < 0.02) {
            optimizeBankChoice(stock);
        }

        // --- 2. Dział Rozwoju ---
        if (stock.departments.development.level >= 1) {
            if (countCompanyInvestmentOrders(stock) < stock.departments.development.level) {
                // AI decyduje o inwestycji, jeśli ma nadmiar gotówki
                if (stock.cash > 150000 && Math.random() < 0.03 * getCycleInvestmentAppetite()) {
                    startRandomInvestment(stock);
                }
            }
            processActiveInvestments(stock);
        }

        // --- 3. Dział Badań ---
        // Logika (bonus prędkości i odblokowanie Tier 2) jest sprawdzana w updateResearchProgress i applyTechnology
    });
}

// ============================================
// INWESTYCJE SPÓŁEK — JEDNA ŚCIEŻKA REALIZACJI
// construction / mixed  -> przetarg budowlany (gameCore.js)
// pozostałe rodzaje     -> inwestycja wewnętrzna (activeInvestments)
// ============================================

/** Liczba zamówień spółki w toku: inwestycje wewnętrzne + przetargi + budowy jako zamawiający. */
function countCompanyInvestmentOrders(stock) {
    const key = getEntityKey(stock);
    const internal = Array.isArray(stock.activeInvestments) ? stock.activeInvestments.length : 0;
    const tenders = activeTenders.filter(tender =>
        ['open', 'closed'].includes(tender.status) && getEntityKey(tender.clientCompany) === key
    ).length;
    const projects = constructionProjects.filter(project =>
        !project.settled && getEntityKey(project.tender?.clientCompany) === key
    ).length;

    return internal + tenders + projects;
}

function getInvestmentCostForCompany(stock, investment) {
    const level = Number(stock?.departments?.development?.level) || 0;
    return level >= 3 ? investment.cost * 0.9 : investment.cost;
}

/** Czy spółka może zapłacić kwotę z gotówki lub kredytu (bez wykonywania operacji). */
function canFinanceAmount(stock, amount) {
    const value = Number(amount);
    if (!(value > 0)) return true;

    const cash = Math.max(0, Number(stock?.cash) || 0);
    if (cash >= value) return true;

    const sheet = stock?.balanceSheet;
    if (!sheet) return false;

    const shortfall = value - cash;
    const assets = Math.max(1, Number(sheet.assets) || 0);
    return ((Number(sheet.liabilities) || 0) + shortfall) / (assets + shortfall) < 0.7;
}

/**
 * Zapewnia spółce gotówkę na wydatek: brakującą kwotę pożycza w swoim banku
 * (gotówka i zobowiązania rosną razem). Niczego nie wydaje.
 */
function financeInvestment(stock, amount) {
    const value = Number(amount);
    if (!stock || !Number.isFinite(value)) return false;
    if (value <= 0) return true;

    const cash = Math.max(0, Number(stock.cash) || 0);
    if (cash >= value) return true;
    if (!canFinanceAmount(stock, value)) return false;

    borrowForCompany(stock, value - cash, 'Kredyt inwestycyjny');
    return true;
}

/** Kredyt z banku spółki: gotówka, aktywa i zobowiązania rosną o tę samą kwotę. */
function borrowForCompany(stock, amount, purpose = 'Kredyt') {
    const value = Number(amount);
    if (!stock || !(value > 0)) return 0;

    const bank = getCompanyBank(stock);
    if (bank) bank.cash = (Number(bank.cash) || 0) - value; // bank wypłaca kredyt ze swoich środków

    adjustCompanyCash(stock, value);
    adjustBalanceSheet(stock, { assets: value, liabilities: value });
    recordPayment(bank ? bank.id : 'external:bank_credit', stock, value, purpose);

    return value;
}

/** Spłata długu: gotówka, aktywa i zobowiązania maleją o tę samą kwotę. */
function repayCompanyDebt(stock, amount) {
    const value = Math.min(Number(amount) || 0, Math.max(0, Number(stock?.cash) || 0), Math.max(0, Number(stock?.balanceSheet?.liabilities) || 0));
    if (!(value > 0)) return 0;

    adjustCompanyCash(stock, -value);
    const bank = getCompanyBank(stock);
    if (bank) bank.cash = (Number(bank.cash) || 0) + value;

    adjustBalanceSheet(stock, { assets: -value, liabilities: -value });
    recordPayment(stock, bank ? bank.id : 'external:bank_credit', value, 'Spłata długu');

    return value;
}

function hasCompanyInvestmentInProgress(stock, investmentId) {
    if ((stock.activeInvestments || []).some(inv => inv.id === investmentId)) return true;
    return typeof hasOpenConstructionOrder === 'function' && hasOpenConstructionOrder(stock, investmentId);
}

/**
 * Jedyny punkt startu inwestycji spółki (AI i decyzje właściciela).
 * @returns {{ok: boolean, message: string}}
 */
function startCompanyInvestment(stock, investmentId, source = 'ai') {
    const investment = getCatalogEntryById(investmentId);
    const fail = message => ({ ok: false, message });

    if (!stock || stock.isBankrupt || !investment) return fail('Nieznana inwestycja.');
    if (!getInvestmentCatalogForCompany(stock).some(item => item.id === investment.id)) {
        return fail('Ta inwestycja nie jest dostępna dla tej spółki.');
    }
    if (!Array.isArray(stock.activeInvestments)) stock.activeInvestments = [];

    const level = Number(stock.departments?.development?.level) || 0;
    if (level < investment.minDevLevel) return fail(`Wymagany poziom działu rozwoju: ${investment.minDevLevel}.`);
    if (countCompanyInvestmentOrders(stock) >= Math.max(1, level)) {
        return fail(`Osiągnięto limit jednoczesnych inwestycji (${Math.max(1, level)}).`);
    }
    if (hasCompanyInvestmentInProgress(stock, investment.id)) return fail('Ta inwestycja jest już w toku.');

    if (CONSTRUCTION_KINDS.includes(investment.kind)) {
        const spec = getConstructionSpec(investment.id);
        const budget = spec.cost * (source === 'owner' ? 1.3 : getRandomInRange(1.2, 1.45));
        const weights = source === 'owner' ? {} : randomTenderWeights(stock);
        const tenderId = requestConstructionTender(stock, investment, budget, weights);

        if (!tenderId) return fail('Nie udało się ogłosić przetargu (limit przetargów, brak finansowania lub zamówienie w toku).');

        logEvent(`🏗️ ${stock.name} ogłasza przetarg na ${spec.name}.`, 'company');
        return { ok: true, message: `Ogłoszono przetarg na: ${spec.name}` };
    }

    const cost = getInvestmentCostForCompany(stock, investment);
    if (!financeInvestment(stock, cost)) return fail(`Brak środków i zdolności kredytowej (koszt: ${cost.toLocaleString('pl-PL')} PLN).`);

    startInternalInvestment(stock, investment, cost);
    return { ok: true, message: `Rozpoczęto projekt: ${investment.name}` };
}

function startInternalInvestment(stock, investment, cost, options = {}) {
    // Wydatek: gotówka -> inwestycja w toku (aktywa bez zmian do czasu zakończenia).
    adjustCompanyCash(stock, -cost);
    recordPayment(stock, 'external:dostawcy_inwestycji', cost, `Inwestycja: ${investment.name}`);

    const project = {
        uid: nextSimulationId('inv'),
        id: investment.id,
        name: options.name || investment.name,
        kind: options.phase === 'equipment' ? 'equipment' : investment.kind,
        phase: options.phase || 'main',
        buildingId: options.buildingId || null,
        durationDays: Math.max(1, Number(options.durationDays ?? investment.durationDays) || 1),
        totalDuration: Math.max(1, Number(options.durationDays ?? investment.durationDays) || 1),
        progress: 0,
        cost,
        data: {
            assetValue: Number(options.assetValue ?? investment.assetValue) || 0,
            incomeBonus: Number(investment.incomeBonus) || 0,
            healthBonus: Number(investment.healthBonus) || 0,
            maintenance: Number(options.maintenance ?? investment.maintenance) || 0
        },
        contractor: null
    };

    stock.activeInvestments.push(project);
    logEvent(`🏢 ${stock.name} rozpoczyna projekt: ${project.name} (koszt: ${cost.toFixed(0)} PLN, ${project.durationDays} dni).`, 'company');

    return project;
}

function startRandomInvestment(stock) {
    const level = Number(stock.departments?.development?.level) || 0;
    const options = getInvestmentCatalogForCompany(stock).filter(item =>
        level >= item.minDevLevel && !hasCompanyInvestmentInProgress(stock, item.id)
    );

    if (options.length === 0) return false;
    return startCompanyInvestment(stock, getRandomElement(options).id, 'ai').ok;
}

/** Etap wyposażenia dla pozycji mieszanych — uruchamiany po odbiorze budowy. */
function onConstructionCompleted(client, project) {
    const item = getCatalogEntryById(project.tender?.buildingType?.id);
    if (!item || item.kind !== 'mixed' || client.isBankrupt) return;

    if (!Array.isArray(client.activeInvestments)) client.activeInvestments = [];

    const cost = Math.round(getInvestmentCostForCompany(client, item) * (1 - item.constructionShare));
    const days = Math.max(1, Math.round(item.durationDays * (1 - item.constructionShare) * 0.5));

    if (!financeInvestment(client, cost)) {
        logEvent(`⚠️ ${client.name}: brak środków na wyposażenie „${item.name}”. Obiekt stoi bez wyposażenia.`, 'company');
        return;
    }

    startInternalInvestment(client, item, cost, {
        phase: 'equipment',
        name: `${item.name} (wyposażenie)`,
        durationDays: days,
        buildingId: `building_${project.id}`,
        assetValue: Math.round((Number(item.assetValue) || 0) * (1 - item.constructionShare)),
        maintenance: Math.round((Number(item.maintenance) || 0) * (1 - item.constructionShare))
    });
}

function processActiveInvestments(stock) {
    if (!Array.isArray(stock.activeInvestments)) return;

    for (let i = stock.activeInvestments.length - 1; i >= 0; i--) {
        const project = stock.activeInvestments[i];
        if (!Number.isFinite(project.totalDuration)) project.totalDuration = Number(project.durationDays) || 1;

        // Wywoływane raz na tydzień gry = 7 dni realizacji.
        project.progress = (Number(project.progress) || 0) + 7;

        if (project.progress >= project.totalDuration) {
            finishInvestment(stock, project);
            stock.activeInvestments.splice(i, 1);
        }
    }
}

function finishInvestment(stock, project) {
    const data = project.data || {};
    const cost = Math.max(0, Number(project.cost) || 0);

    // Aktywuje się co najwyżej koszt; reszta (np. marketing) jest kosztem okresu.
    const capitalized = Math.min(cost, Math.max(0, Number(data.assetValue) || 0));
    const expensed = cost - capitalized;

    if (expensed > 0) {
        adjustBalanceSheet(stock, { assets: -expensed, retainedEarnings: -expensed });
        postPeriodEntry(stock, `investment_${project.uid || project.id}`, { investmentExpense: expensed });
    }

    if (project.phase === 'equipment' && project.buildingId) {
        const building = (stock.portfolio?.buildings || []).find(item => item.id === project.buildingId);
        if (building) {
            building.bookValue += capitalized;
            building.purchasePrice += capitalized;
            building.value = building.bookValue;
            building.income = Number(data.incomeBonus) || 0;
            building.maintenance += Number(data.maintenance) || 0;
            building.equipped = true;
        }
    } else if (data.maintenance > 0) {
        stock.fixedExpenses = (Number(stock.fixedExpenses) || 0) + data.maintenance;
    }

    stock.financialHealth = Math.min(5, (Number(stock.financialHealth) || 0) + (Number(data.healthBonus) || 0));

    if (data.incomeBonus > 0) {
        applyPriceEffect(stock.symbol, data.incomeBonus * 0.5, 'positive', 'company');
    }

    logEvent(`✅ ${stock.name} zakończył projekt: „${project.name}” (aktywowano ${capitalized.toFixed(0)} PLN, koszt okresu ${expensed.toFixed(0)} PLN).`, 'success');
}

function payDividendToShareholders(stock, dividendPerShare) {
    // Obsługa spółek zależnych (transfer do matki)
    if (stock.isSubsidiaryOf) {
        const parentStock = stocks.find(s => s.symbol === stock.isSubsidiaryOf);
        if (parentStock) {
            const totalDividendFromSubsidiary = stock.totalShares * dividendPerShare;
            if (parentStock.cash !== undefined) {
                adjustCompanyCash(parentStock, totalDividendFromSubsidiary);
                adjustBalanceSheet(parentStock, { assets: totalDividendFromSubsidiary, retainedEarnings: totalDividendFromSubsidiary });
            }
            logEvent(`💸 Spółka zależna ${stock.name} przekazuje ${totalDividendFromSubsidiary.toFixed(2)} PLN dywidendy do ${parentStock.name}.`, 'company');
            stock.price -= dividendPerShare;
            if (stock.price < 0.01) stock.price = 0.01;
            return;
        }
    }

    // Standardowa wypłata
    const taxRateDividend = TAX_RATES.dividend; // Pobieramy z economy.js

    // 1. Wypłata dla Gracza
    if (playerPortfolio[stock.symbol]) {
        let finalDividendPerShare = dividendPerShare;
        const playerRep = stock.reputation ? stock.reputation['player'] : 0;

        // Modyfikatory reputacji
        if (playerRep < REPUTATION_LEVELS.NEGATIVE) finalDividendPerShare *= 0.8;
        else if (playerRep >= REPUTATION_LEVELS.POSITIVE) finalDividendPerShare *= 1.05;

        const grossDividend = playerPortfolio[stock.symbol].shares * finalDividendPerShare;

        if (typeof playerFund !== 'undefined' && playerFund) {
            // Fundusz nie płaci podatku od dywidend — dywidenda podnosi NAV.
            playerCash += grossDividend;
            logEvent(`💰 Fundusz otrzymuje ${grossDividend.toFixed(2)} zł dywidendy od ${stock.name}.`, 'review');
        } else {
            // Podatki (San Escobar)
            let playerTaxModifier = 1.0;
            const sanEscobarLvl = getSkillLevel('sanEscobar');
            if (sanEscobarLvl >= 1) playerTaxModifier = 0.95;
            if (sanEscobarLvl >= 4) playerTaxModifier = 0.0;

            const taxToPay = grossDividend * taxRateDividend * playerTaxModifier;
            governmentTreasury += taxToPay;
            playerCash += grossDividend - taxToPay;
            logEvent(`💰 Otrzymujesz ${(grossDividend - taxToPay).toFixed(2)} PLN dywidendy netto od ${stock.name} (podatek: ${taxToPay.toFixed(2)} PLN).`, 'review');
        }
        displayCash(); // Funkcja z ui.js
    }

    // 1b. Wypłata na prywatne konto gracza (z podatkiem od dywidend)
    const privateHolding = typeof playerWallet !== 'undefined' ? playerWallet.portfolio[stock.symbol] : null;
    if (privateHolding && privateHolding.shares > 0) {
        const gross = privateHolding.shares * dividendPerShare;
        const tax = gross * taxRateDividend * getPrivateTaxModifier();
        governmentTreasury += tax;
        playerWallet.cash += gross - tax;
        logEvent(`💰 Prywatnie otrzymujesz ${(gross - tax).toFixed(2)} zł dywidendy od ${stock.name} (podatek ${tax.toFixed(2)} zł).`, 'review');
    }

    // 2. Wypłata dla AI
    aiCompetitors.forEach(ai => {
        if (ai.portfolio[stock.symbol]) {
            let finalDividendPerShare = dividendPerShare;
            const aiRep = stock.reputation ? stock.reputation[ai.id] : 0;
            
            if (aiRep < REPUTATION_LEVELS.NEGATIVE) finalDividendPerShare *= 0.8;
            else if (aiRep >= REPUTATION_LEVELS.POSITIVE) finalDividendPerShare *= 1.05;

            const grossDividend = ai.portfolio[stock.symbol].shares * finalDividendPerShare;
            
            // Podatek AI
            let aiTaxModifier = 1.0;
            const aiSanEscobarLvl = ai.unlockedSkills ? (ai.unlockedSkills['sanEscobar'] || 0) : 0;
            if (aiSanEscobarLvl >= 1) aiTaxModifier = 0.95;
            if (aiSanEscobarLvl >= 4) aiTaxModifier = 0.0;

            const taxToPay = grossDividend * taxRateDividend * aiTaxModifier;
            const netDividend = grossDividend - taxToPay;
            
            governmentTreasury += taxToPay;
            ai.cash += netDividend;
        }
    });

    // 2b. Fundusze botów-zarządców korporacji (bez podatku, jak fundusz gracza)
    if (typeof corporation !== 'undefined' && corporation) {
        for (const manager of corporation.managers) {
            const holding = manager.fund.portfolio[stock.symbol];
            if (holding) manager.fund.cash += holding.shares * dividendPerShare;
        }
    }

    // 3. Spadek ceny akcji (odcięcie dywidendy)
    stock.price -= dividendPerShare;
    if (stock.price < 0.01) stock.price = 0.01;
    
    console.log(`[Dywidenda] Wypłacono dywidendę ${dividendPerShare.toFixed(2)} dla ${stock.symbol}`);
}

function assignBankToCompany(stock) {
    // Jeśli to bank, startup, holding lub już ma konto - pomiń
    if (stock.assetType || stock.isBankStock || stock.bankAccountId) return;

    const activeCorpAndUniBanks = commercialBanks.filter(b => b.isActive && (b.type === 'Korporacyjny' || b.type === 'Uniwersalny'));
    
    if (activeCorpAndUniBanks.length > 0) {
        const assignedBank = getRandomElement(activeCorpAndUniBanks);
        stock.bankAccountId = assignedBank.id;
        
        // Upewnij się, że tablica klientów istnieje
        if (!assignedBank.corporateClients) assignedBank.corporateClients = [];
        if (!assignedBank.corporateClients.includes(stock.symbol)) {
            assignedBank.corporateClients.push(stock.symbol);
        }

        // Wpłać gotówkę firmy do banku (symulacja)
        if (stock.cash > 0) {
            assignedBank.cash += stock.cash;
        }
        console.log(`[BANKING] Przypisano ${stock.name} do banku ${assignedBank.name}`);
    }
}

function isTechAvailableForCompany(stock, techId) {
    const tech = technologies[techId];
    const deptLevel = stock.departments ? stock.departments.research.level : 0;
    
    // Wymagany poziom (domyślnie 1)
    const requiredLevel = tech.minResearchLevel || 1;
    
    return deptLevel >= requiredLevel;
}

function optimizeBankChoice(stock) {
    // Działa tylko dla Działu Ekonomii Lvl 2+
    if (!stock.departments || stock.departments.economy.level < 2) return;
    
    // Wykonuj rzadko (np. 5% szans na tydzień), żeby firmy nie skakały ciągle
    if (Math.random() > 0.05) return;

    const currentBank = commercialBanks.find(b => b.id === stock.bankAccountId);
    if (!currentBank) return;

    // Sprawdź oprocentowanie depozytów (dla firm z gotówką) lub kredytów (dla zadłużonych)
    const isSaver = stock.cash > 0;
    
    let bestBank = currentBank;
    let bestRate = isSaver ? currentBank.interestRateDeposit : currentBank.interestRateLoan;

    commercialBanks.filter(b => b.isActive && (b.type === 'Korporacyjny' || b.type === 'Uniwersalny')).forEach(bank => {
        if (isSaver) {
            // Szukamy wyższego oprocentowania depozytów
            if (bank.interestRateDeposit > bestRate) {
                bestRate = bank.interestRateDeposit;
                bestBank = bank;
            }
        } else {
            // Szukamy niższego oprocentowania kredytów
            if (bank.interestRateLoan < bestRate) {
                bestRate = bank.interestRateLoan;
                bestBank = bank;
            }
        }
    });

    // Jeśli znaleziono lepszy bank (różnica min. 0.5 p.p.)
    if (bestBank.id !== currentBank.id && Math.abs(bestRate - (isSaver ? currentBank.interestRateDeposit : currentBank.interestRateLoan)) > 0.005) {
        changeCompanyBank(stock.symbol, bestBank.id); // Używamy istniejącej funkcji z player.js/companies.js
        logEvent(`📊 Dział Ekonomii ${stock.name} przenosi konto do ${bestBank.name} dla lepszych warunków.`, 'company');
    }
}

function forceCompanyInvestment(symbol, investmentId) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const result = startCompanyInvestment(stock, investmentId, 'owner');

    if (!result.ok) {
        showToast(result.message, 'error');
    } else {
        logEvent(`👑 Na wniosek właściciela: ${stock.name} — ${result.message}.`, 'company');
        showToast(result.message, 'success');
    }

    if (typeof openManagementModal === 'function') {
        openManagementModal(symbol, 'depts');
    }
}

function canPlayerBlockInvestments(stock) {
    const isMajority = (playerPortfolio[stock.symbol]?.shares / stock.totalShares) > 0.5;
    const hasCharisma = getSkillLevel('charisma') >= 4;
    return isMajority || hasCharisma;
}

/**
 * Władza Korony: zablokowanie inwestycji przez gracza.
 * orderRef: uid inwestycji wewnętrznej, ID przetargu lub ID projektu budowlanego.
 */
function blockInvestment(symbol, orderRef) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    if (!canPlayerBlockInvestments(stock)) {
        alert("Nie masz wystarczającej władzy, by zablokować tę inwestycję (wymagane >50% akcji lub Charyzma Lvl 4).");
        return;
    }

    const key = getEntityKey(stock);
    const internalIndex = (stock.activeInvestments || []).findIndex(inv => inv.uid === orderRef || inv.id === orderRef);
    const tender = activeTenders.find(item => item.id === orderRef && getEntityKey(item.clientCompany) === key);
    const project = constructionProjects.find(item => item.id === orderRef && getEntityKey(item.tender?.clientCompany) === key);

    if (internalIndex < 0 && !tender && !project) return;

    if (!confirm('Czy na pewno chcesz zablokować tę inwestycję? Spółka poniesie koszty przerwania, a relacje z zarządem ucierpią.')) {
        return;
    }

    if (internalIndex >= 0) {
        // Przerwana inwestycja wewnętrzna: odzysk 50% nakładów, reszta to koszt okresu.
        const inv = stock.activeInvestments[internalIndex];
        const recovered = inv.cost * 0.5;
        const lost = inv.cost - recovered;

        adjustCompanyCash(stock, recovered);
        recordPayment('external:dostawcy_inwestycji', stock, recovered, 'Odzysk nakładów przerwanej inwestycji');
        adjustBalanceSheet(stock, { assets: -lost, retainedEarnings: -lost });
        postPeriodEntry(stock, `investment_block_${inv.uid || inv.id}`, { investmentExpense: lost });

        stock.activeInvestments.splice(internalIndex, 1);
        logEvent(`⛔ [KORONA] Zablokowałeś inwestycję „${inv.name}” w ${stock.name}. Odzyskano ${recovered.toFixed(0)} PLN.`, 'review');
    } else if (project) {
        cancelConstructionProject(project, 'Inwestycja zablokowana przez właściciela.', 'client');
    } else if (tender && ['open', 'closed'].includes(tender.status)) {
        cancelTender(tender, 'Przetarg zablokowany przez właściciela.');
    }

    changeReputation('player', symbol, -35);
    showToast('Inwestycja zablokowana. Strata wizerunkowa!', 'warning');

    if (typeof openManagementModal === 'function') openManagementModal(symbol, 'depts');
}

function getConstructionResearchOptions(company) {
    if (
        !company ||
        !Array.isArray(company.sector) ||
        !company.sector.includes('Budowlany')
    ) {
        return [];
    }

    const research = company.research;
    const unlocked = new Set(
        Array.isArray(research?.unlockedTechs)
            ? research.unlockedTechs
            : []
    );

    const researchLevel = Math.max(
        0,
        Number(company.departments?.research?.level) || 0
    );

    const cash = Number(company.cash);

    return Object.entries(technologies)
        .filter(([, tech]) => tech.sector === 'Budowlany')
        .map(([id, tech]) => {
            const initialCashCost = Math.max(
                0,
                Number(tech.initialCashCost) || 0
            );

            const requiredLevel = Math.max(
                0,
                Number(tech.minResearchLevel) || 0
            );

            const completed = unlocked.has(id);
            const current = research?.currentTech === id;
            const levelMet = researchLevel >= requiredLevel;

            const specializationMet =
                research?.specialization === tech.type;

            const affordable =
                Number.isFinite(cash) &&
                cash >= initialCashCost;

            const hasValidResearchSystem = Boolean(
                research && !research.isInvestment
            );

            const available =
                !company.isBankrupt &&
                hasValidResearchSystem &&
                !completed &&
                !current &&
                levelMet &&
                specializationMet;

            let status;

            if (completed) {
                status = 'Ukończone';
            } else if (current) {
                status = research.isResearching
                    ? 'Badanie w toku'
                    : 'Badanie wstrzymane';
            } else if (company.isBankrupt) {
                status = 'Spółka nieaktywna';
            } else if (!hasValidResearchSystem) {
                status = 'Brak aktywnego systemu R&D';
            } else if (!levelMet) {
                status = `Wymaga działu R&D na poziomie ${requiredLevel}`;
            } else if (!specializationMet) {
                status = 'Inna specjalizacja badań';
            } else if (!affordable) {
                status = 'Brak środków na rozpoczęcie';
            } else {
                status = 'Kandydat do kolejnego badania';
            }

            return {
                id,
                name: tech.name,
                icon: tech.icon || '🔬',
                description: tech.description || '',
                type: tech.type,
                researchPoints: Number(tech.cost),
                initialCashCost,
                requiredLevel,
                completed,
                current,
                available,
                affordable,
                status,
                constructionEffects: tech.constructionEffects || null
            };
        })
        .sort((a, b) => {
            if (a.current !== b.current) return a.current ? -1 : 1;
            if (a.completed !== b.completed) return a.completed ? 1 : -1;

            return a.name.localeCompare(b.name, 'pl');
        });
}

function getAvailableCompanyResearch(company, affordableOnly = false) {
    const research = company?.research;

    if (
        !company ||
        company.isBankrupt ||
        company.isBankStock ||
        !research ||
        research.isInvestment ||
        !Array.isArray(company.sector)
    ) {
        return [];
    }

    const unlocked = new Set(
        Array.isArray(research.unlockedTechs)
            ? research.unlockedTechs
            : []
    );

    const level = Math.max(
        0,
        Number(company.departments?.research?.level) || 0
    );

    const cash = Number(company.cash);

    return Object.keys(technologies).filter(id => {
        const tech = technologies[id];
        const points = Number(tech.cost);
        const initialCost = Number(tech.initialCashCost ?? 0);
        const requiredLevel = Number(tech.minResearchLevel ?? 0);

        if (
            unlocked.has(id) ||
            id === research.currentTech ||
            tech.type !== research.specialization ||
            !(tech.sector === 'common' ||
                company.sector.includes(tech.sector)) ||
            !Number.isFinite(points) ||
            points <= 0 ||
            !Number.isFinite(initialCost) ||
            initialCost < 0 ||
            !Number.isFinite(requiredLevel) ||
            requiredLevel < 0 ||
            level < requiredLevel
        ) {
            return false;
        }

        return !affordableOnly ||
            (Number.isFinite(cash) && cash >= initialCost);
    });
}

// =================================================================================
// KSIĘGOWANIE R&D
// Każda opłata (rozpoczęcie, utrzymanie) przechodzi przez recordResearchExpense:
//  - gotówka (i rachunek bankowy) maleje raz, w chwili płatności,
//  - aktywa i zyski zatrzymane maleją raz (wszystkie wydatki R&D to koszty, bez kapitalizacji),
//  - wpis trafia do dziennika R&D jako "nierozpoznany" i czeka na raport kwartalny,
//  - raport tylko odczytuje sumę (recognizeResearchExpenses) i oznacza wpisy jako rozpoznane.
// Inwestycje bankowe (research.isInvestment) mają osobną ścieżkę i nie korzystają z tego dziennika.
// =================================================================================

const RESEARCH_LEDGER_KEEP_RECOGNIZED = 40;

function ensureResearchLedger(company) {
    if (!company || !company.research || typeof company.research !== 'object') {
        return null;
    }

    const research = company.research;

    if (!Array.isArray(research.ledger)) research.ledger = [];
    if (!research.costTotals || typeof research.costTotals !== 'object') {
        research.costTotals = { startup: 0, maintenance: 0 };
    }
    if (!Number.isFinite(Number(research.pendingQuarterlyExpense))) {
        research.pendingQuarterlyExpense = 0;
    }

    return research;
}

function recordResearchExpense(company, options = {}) {
    const research = ensureResearchLedger(company);
    if (!research || research.isInvestment) return 0;

    const kind = options.kind === 'maintenance' ? 'maintenance' : 'startup';
    const techId = options.techId || research.currentTech || null;
    const amountRaw = Number(options.amount ?? 0);
    const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 0;

    if (amount <= 0) return 0;

    const paymentId = options.paymentId || nextSimulationId(`research_${kind}`);

    // Ten sam identyfikator płatności nigdy nie jest księgowany drugi raz.
    if (research.ledger.some(entry => entry.id === paymentId)) return 0;

    research.ledger.push({
        id: paymentId,
        kind,
        techId,
        amount,
        timestamp: Date.now(),
        recognized: false,
        source: options.source || 'cash'
    });

    research.pendingQuarterlyExpense = Number(research.pendingQuarterlyExpense || 0) + amount;
    research.costTotals[kind] = (Number(research.costTotals[kind]) || 0) + amount;

    adjustCompanyCash(company, -amount);
    adjustBalanceSheet(company, { assets: -amount, retainedEarnings: -amount });
    recordPayment(company, 'external:uslugi_badawcze', amount, kind === 'startup' ? 'R&D: rozpoczęcie badania' : 'R&D: utrzymanie badania', paymentId);

    if (kind === 'startup') {
        research.lastStartupCost = amount;
        research.lastStartupPaymentId = paymentId;
    } else {
        research.lastMaintenanceCost = amount;
        research.lastMaintenancePaymentId = paymentId;
    }

    return amount;
}

function getUnrecognizedResearchExpense(company) {
    const research = company?.research;
    if (!research || !Array.isArray(research.ledger)) return 0;

    return research.ledger
        .filter(entry => !entry.recognized)
        .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
}

/** Podział kosztów R&D okresu (nierozpoznanych) na rozpoczęcie i utrzymanie. */
function getResearchCostSummary(company) {
    const research = company?.research;
    const summary = { pendingStartup: 0, pendingMaintenance: 0, pendingTotal: 0, totalStartup: 0, totalMaintenance: 0, lastReported: 0 };

    if (!research || research.isInvestment) return summary;

    for (const entry of research.ledger || []) {
        if (entry.recognized) continue;
        if (entry.kind === 'maintenance') summary.pendingMaintenance += Number(entry.amount) || 0;
        else summary.pendingStartup += Number(entry.amount) || 0;
    }

    summary.pendingTotal = summary.pendingStartup + summary.pendingMaintenance;
    summary.totalStartup = Number(research.costTotals?.startup) || 0;
    summary.totalMaintenance = Number(research.costTotals?.maintenance) || 0;
    summary.lastReported = Number(research.lastRecognizedExpense) || 0;

    return summary;
}

/**
 * Zwraca koszty R&D do raportu i oznacza je jako rozpoznane.
 * Nie zmienia gotówki ani bilansu — to zrobiono przy płatności.
 */
function recognizeResearchExpenses(company) {
    const research = company?.research;
    if (!research || !Array.isArray(research.ledger)) return 0;

    const pending = getUnrecognizedResearchExpense(company);

    research.ledger.forEach(entry => {
        if (!entry.recognized) entry.recognized = true;
    });

    research.pendingQuarterlyExpense = 0;
    research.lastRecognizedExpense = pending;

    // Ograniczenie historii: zostawiamy wszystkie nierozpoznane i ostatnie rozpoznane.
    const recognized = research.ledger.filter(entry => entry.recognized);
    if (recognized.length > RESEARCH_LEDGER_KEEP_RECOGNIZED) {
        const drop = new Set(recognized.slice(0, recognized.length - RESEARCH_LEDGER_KEEP_RECOGNIZED).map(entry => entry.id));
        research.ledger = research.ledger.filter(entry => !drop.has(entry.id));
    }

    return pending;
}

/**
 * Tygodniowe utrzymanie standardowego R&D.
 *  - badanie w toku: pobiera opłatę utrzymania; przy braku środków wstrzymuje badanie (postęp zostaje),
 *  - badanie wstrzymane: przy dostępnych środkach wznawia, pobierając tylko opłatę utrzymania
 *    (koszt rozpoczęcia nie jest pobierany ponownie).
 */
function processResearchMaintenanceAndPause(stock) {
    if (!stock || !stock.research || stock.assetType || stock.isBankStock || stock.research.isInvestment) {
        return false;
    }

    const research = stock.research;
    const techId = research.currentTech;
    const maintenanceCost = Number(RESEARCH_MAINTENANCE_COST || 0);

    if (!Number.isFinite(maintenanceCost) || maintenanceCost <= 0 || !techId) {
        return false;
    }

    const techName = technologies[techId]?.name || 'nieznanej technologii';

    if (research.isResearching) {
        if ((Number(stock.cash) || 0) >= maintenanceCost) {
            recordResearchExpense(stock, { kind: 'maintenance', techId, amount: maintenanceCost });
            return true;
        }

        research.isResearching = false;
        research.researchPaused = true;
        logEvent(`⏸️ ${stock.name} wstrzymuje badania nad "${techName}" z powodu braku środków na utrzymanie.`, 'company');
        showToast(`Badania w ${stock.name} wstrzymane - brak funduszy!`, 'warning');
        return false;
    }

    if (research.researchPaused && (Number(stock.cash) || 0) >= maintenanceCost) {
        recordResearchExpense(stock, { kind: 'maintenance', techId, amount: maintenanceCost });

        research.isResearching = true;
        research.researchPaused = false;
        logEvent(`▶️ ${stock.name} wznawia badania nad "${techName}".`, 'company');
        return true;
    }

    return false;
}

/** Wznowienie wstrzymanej inwestycji bankowej (osobny system niż standardowe R&D). */
function processBankInvestmentResume(stock) {
    const research = stock?.research;
    if (!stock?.isBankStock || !research?.isInvestment || !research.investmentPaused || !research.currentInvestmentId) {
        return false;
    }

    const bankData = commercialBanks.find(bank => bank.id === stock.bankData?.id);
    const investment = bankInvestments[research.currentInvestmentId];
    const cost = Number(investment?.initialCashCost) || 0;

    if (!bankData || !investment || (Number(bankData.cash) || 0) < cost) return false;

    bankData.cash -= cost;
    if (cost > 0) recordPayment(bankData.id, 'external:inwestycje_bankowe', cost, `Inwestycja bankowa: ${investment.name}`);

    research.isResearching = true;
    research.investmentPaused = false;

    if (cost > 0) logEvent(`💸 Bank ${stock.name} wznawia inwestycję "${investment.name}" kosztem ${cost.toLocaleString()} PLN.`);
    else logEvent(`▶️ Bank ${stock.name} wznawia inwestycję "${investment.name}".`);

    return true;
}

function startCompanyResearch(company, techId) {
    const research = company?.research;

    if (!research || research.isInvestment || research.currentTech) return false;

    if (!getAvailableCompanyResearch(company).includes(techId)) {
        return false;
    }

    const tech = technologies[techId];
    const cost = Number(tech.initialCashCost ?? 0);
    const cash = Number(company.cash);

    if (!Number.isFinite(cash) || cash < cost) {
        return false;
    }

    const paymentId = nextSimulationId(`research_start_${techId}`);
    recordResearchExpense(company, { kind: 'startup', techId, amount: cost, paymentId });

    research.currentTech = techId;
    research.progress = 0;
    research.isResearching = true;
    research.researchPaused = false;
    research.choiceAvailableUntil = null;
    research.choiceRemainingGameMs = null;

    if (!Array.isArray(company.researchCostHistory)) {
        company.researchCostHistory = [];
    }

    company.researchCostHistory.push({ techId, amount: cost, paidAt: Date.now(), paymentId });
    if (company.researchCostHistory.length > 40) company.researchCostHistory.shift();

    logEvent(
        `${company.name} rozpoczyna badanie „${tech.name}”. ` +
        `Koszt rozpoczęcia: ${cost.toFixed(2)} PLN.`,
        'company'
    );

    return true;
}

function updateResearchAutoRetry(
    deltaTime = 0,
    companies = stocks
) {
    if (isGamePaused) return;

    const delta = Number(deltaTime);
    if (!Number.isFinite(delta) || delta < 0) return;

    for (const company of companies) {
        const research = company?.research;

        if (
            !research ||
            company.isBankrupt ||
            company.isBankStock ||
            research.isInvestment
        ) {
            continue;
        }

        if (research.autoResearchEnabled === false) {
            research.autoRetryGameMs = null;
            continue;
        }

        const previouslyResearched =
            (
                Array.isArray(company.researchCostHistory) &&
                company.researchCostHistory.length > 0
            ) ||
            (
                Array.isArray(research.unlockedTechs) &&
                research.unlockedTechs.length > 0
            );

        if (
            research.autoResearchEnabled !== true &&
            !previouslyResearched
        ) {
            continue;
        }

        if (
            research.currentTech ||
            research.choiceAvailableUntil ||
            research.isResearching
        ) {
            research.autoRetryGameMs = null;
            continue;
        }

        if (
            !Number.isFinite(research.autoRetryGameMs) ||
            research.autoRetryGameMs < 0
        ) {
            research.autoRetryGameMs = 0;
        }

        research.autoRetryGameMs = Math.max(
            0,
            research.autoRetryGameMs - delta
        );

        if (research.autoRetryGameMs > 0) continue;

        research.autoRetryGameMs = BASE_DELAYS.weekly;

        const available = getAvailableCompanyResearch(company, true);

        if (available.length === 0) continue;

        const isBuilder =
            Array.isArray(company.sector) &&
            company.sector.includes('Budowlany');

        const preferred = isBuilder
            ? available.filter(
                id =>
                    technologies[id].sector === 'Budowlany' &&
                    technologies[id].constructionEffects
            )
            : [];

        const candidates = preferred.length > 0
            ? preferred
            : available;

        candidates.sort((a, b) => {
            const costDifference =
                Number(technologies[a].initialCashCost ?? 0) -
                Number(technologies[b].initialCashCost ?? 0);

            if (costDifference !== 0) return costDifference;

            return a.localeCompare(b);
        });

        const started = startCompanyResearch(company, candidates[0]);

        if (started) {
            research.autoRetryGameMs = null;
        }
    }
}