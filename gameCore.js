// gameCore.js - Rdzeń silnika gry, stałe i helpery

// Diagnostic
if (typeof window !== 'undefined' && window.console) {
    console.log('[diag] gameCore.js loaded');
}

// --- Zmienne Stanu Gry ---
let isGamePaused = true;
let currentlyDisplayedChartSymbol = null;
let playerAccessLevel = 0; // Poziom dostępu do giełd
let currentSortState = 'none'; // 'none', 'price_asc', 'price_desc'
let isAutoRepayEnabled = true;
let lastWeekStockPrices = {};
// --- Stałe Czasowe ---
const BASE_DELAYS = {
    stockUpdate: 1000, // 1 sekunda
    weekly: 60000,     // 1 minuta
    quarterly: 300000, // 5 minut
    event: 45000       // 45 sekund
};

const SHARE_LIMIT_RANGES = {
    'JUNK': { min: 800, max: 1200 },
    'BRONZE': { min: 8000, max: 12000 },
    'SILVER': { min: 40000, max: 60000 },
    'GOLD': { min: 80000, max: 120000 },
    'PLATINUM': { min: 800000, max: 1200000 }
};

const REPUTATION_LEVELS = {
    TRAGIC: -75,
    NEGATIVE: -16,
    NEUTRAL: 30,
    CORRECT: 49,
    POSITIVE: 89,
    FRIENDLY: 100
};

const PASSIVE_WORK_INTERVAL = 90000;
const PREMIUM_SUBSCRIPTION_COST = 5000;
const PREMIUM_SUBSCRIPTION_DURATION = 1000 * 60 * 60 * 24 * 7; 
const BLACK_PR_BASE_RISK = 0.10; 
const BLACK_PR_RISK_INCREASE = 0.025; 

// --- Funkcje Pomocnicze (Helpers) ---

function getRandomIntInRange(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomElement(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
}

// Funkcja pauzy (używana przez UI)
function togglePauseGame() {
    isGamePaused = !isGamePaused;
    const pauseButton = document.getElementById('pause-game-btn');
    if (pauseButton) {
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
}

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

function initializeGameTimeRelatedVariables() {
    // ---> Inicjalizacja wartości TUTAJ <---
    WEALTH_TAX_INTERVAL = BASE_DELAYS.quarterly * 4;
    nextWealthTaxTime = Date.now() + WEALTH_TAX_INTERVAL; // Ustawienie początkowe
    console.log(`[INIT] WEALTH_TAX_INTERVAL ustawiono na: ${WEALTH_TAX_INTERVAL} ms`);
    // Tutaj można inicjalizować inne zmienne czasowe, jeśli są potrzebne
}