// main.js (Połączony)

// Obiekt do przechowywania ID interwałów, aby można je było czyścić
const gameTimers = {
    stockUpdate: null,
    weekly: null,
    quarterly: null,
    event: null,
    ceoEvent: null,
    semiAnnual: null,
    yearly: null,
    reputationDecay: null,
    tBillMaturityCheck: null,
    mortgageCheck: null, // Z bazy main.js
    stateBondIssuance: null, // Z bazy main.js
    otherBondIssuance: null, // Z bazy main.js
    bondMaturityCheck: null   // Z bazy main.js
};

// Zmienna przechowująca aktualną prędkość gry
let currentSpeedMultiplier = 1;

// Podstawowe opóźnienia w milisekundach
const BASE_DELAYS = {
    stockUpdate: 1000, // 1 sekunda
    weekly: 60000,     // 1 minuta (tydzień w grze)
    quarterly: 300000, // 5 minut (kwartał w grze)
    event: 45000       // 45 sekund
};

/**
 * Zatrzymuje wszystkie aktywne pętle gry. Niezbędne przy zmianie prędkości.
 */
function clearIntervals() {
    for (const key in gameTimers) {
        if (gameTimers[key]) {
            clearInterval(gameTimers[key]);
            gameTimers[key] = null;
        }
    }
    console.log("Wszystkie pętle gry zostały zatrzymane.");
}

/**
 * Ustawia nową prędkość gry, czyszcząc stare pętle i tworząc nowe.
 * @param {number} speedMultiplier - Mnożnik prędkości (np. 1, 2, 5).
 */
function setGameSpeed(speedMultiplier) {
    clearIntervals(); // Zatrzymaj wszystkie istniejące pętle
    currentSpeedMultiplier = speedMultiplier; // Ustaw nowy mnożnik

    // Zaktualizuj wygląd przycisków prędkości
    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => btn.classList.remove('active'));
    let activeBtn;
    if (speedMultiplier === 1) activeBtn = speedButtons[0];
    if (speedMultiplier === 2) activeBtn = speedButtons[1];
    if (speedMultiplier === 5) activeBtn = speedButtons[2];
    if (activeBtn) activeBtn.classList.add('active');

    console.log(`Ustawiono prędkość gry na x${speedMultiplier}`);

    // --- URUCHOMIENIE NOWYCH PĘTLI Z NOWĄ PRĘDKOŚCIĄ ---

    // Pętla sprawdzania niespłaconych hipotek (z bazy main.js)
    gameTimers.mortgageCheck = setInterval(() => {
        if (isGamePaused) return;
        checkMortgageDefaults();
    }, BASE_DELAYS.weekly / speedMultiplier); // Sprawdzaj co tydzień

    // Pętla sprawdzania zapadalności bonów skarbowych
    gameTimers.tBillMaturityCheck = setInterval(() => {
        if (isGamePaused) return;
        checkTBillMaturities();
    }, 5000 / speedMultiplier);

    // Główna pętla gry (aktualizacje co sekundę czasu gry)
    gameTimers.stockUpdate = setInterval(() => {

        if (isGamePaused) {
            return; // Jeśli gra jest zapauzowana, nie wykonuj żadnych akcji
        }

        // --- ZAPAMIĘTYWANIE STANU INTERFEJSU ---
        const activeElement = document.activeElement;
        const isActiveInputElement = activeElement && (activeElement.id.startsWith('quantity-') || activeElement.id.startsWith('invest-amount-'));
        const activeElementId = isActiveInputElement ? activeElement.id : null;
        const selectionStart = isActiveInputElement ? activeElement.selectionStart : null;
        const selectionEnd = isActiveInputElement ? activeElement.selectionEnd : null;
        const currentMarketInputs = getCurrentInputValues();
        const currentStartupInputs = getCurrentStartupInputValues();


        if (Date.now() % 10 < 1) { // Prosty sposób na uruchamianie co 10 ticków
            updateResearchInstitutes();
            checkResearchInstitutePositions();
        }

        // --- AKTUALIZACJA LOGIKI GRY ---
        const gameTimeDelta = BASE_DELAYS.stockUpdate; // Każdy tick to zawsze 1 sekunda CZASU GRY
        cleanupBankruptStocks(currentSpeedMultiplier);
        updateStockPrices();
        updateHoldingCompanies();
        updateStartups(gameTimeDelta);
        checkSubscriptionStatus();
        generatePremiumRumor();
        checkTBillAccess();
        updateMarketVolatilityIndex();
        updatePassiveWork(gameTimeDelta);
        updateCompanyStatus();
        updateInvestmentPoolTimer(gameTimeDelta);
        updateAutoInvestTimer(gameTimeDelta);
        updateStartupAutoInvestTimers(gameTimeDelta);
        updateDividendTimers(gameTimeDelta);
        updateFestival(); // Aktualizacja festynu
        updateFestivalCountdown(gameTimeDelta); // Odliczanie do festynu
        applyActiveModifiers(); // Aplikowanie rocznych bonusów
        if (currentTBillAuction && Date.now() > currentTBillAuction.endTime) {
            resolveTBillAuction(); // Rozstrzygnij aukcję
        }
        processCeoActions(gameTimeDelta);
        runAllAi(); // Zawiera AI banków z bazy main.js
        checkPriceAlerts();
        checkResearchChoiceTimers()
        updateResearchProgress(gameTimeDelta);

        // --- ODŚWIEŻANIE INTERFEJSU ---
        displayStocks(currentMarketInputs);
        displayStartups(currentStartupInputs);
        displayEtfs();
        displayPortfolio();
        displayMarketIndexes();
        displayInvestmentPool();
        updateCityModalContent(); // Aktualizacja okna miasta (tylko gdy otwarte)

        // --- POCZĄTEK BLOKU (DODANE Z main2.js) ---
        // Odświeżanie rynku obligacji w banku
        const bankModalForBonds = document.getElementById('bank-modal'); // Używamy innej nazwy zmiennej
        const bondsTabContent = document.getElementById('bank-content-bonds');
        // Sprawdź, czy modal banku jest widoczny ORAZ czy zakładka obligacji jest aktywna
        if (bankModalForBonds && bankModalForBonds.style.display === 'block' && bondsTabContent && bondsTabContent.style.display === 'block') {
            // Sprawdź, czy funkcja renderująca istnieje przed jej wywołaniem
            if (typeof renderBondMarketInBank === 'function') {
                renderBondMarketInBank();
            } else {
                console.warn("Funkcja renderBondMarketInBank nie została znaleziona."); // Opcjonalny log ostrzegawczy
            }
        }
        // --- KONIEC BLOKU (DODANE Z main2.js) ---

        // Odświeżanie licznika firmy w modalu pracy
        if (document.getElementById('work-modal').style.display === 'block' && playerCompany) {
            const timerEl = document.getElementById('company-income-timer');
            if (timerEl && playerCompany.lastIncomeTime) {
                const remainingMs = (playerCompany.lastIncomeTime + playerCompany.incomeInterval) - Date.now();
                const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
                timerEl.textContent = remainingSeconds;
            }
        }

        // Odświeżanie otwartych modali
        if (document.getElementById('leaderboard-modal').style.display === 'block') {
            displayLeaderboard();
        }
        if (document.getElementById('research-modal').style.display === 'block') {
            const symbol = document.getElementById('research-modal').dataset.currentSymbol;
            if (symbol) {
                const stock = stocks.find(s => s.symbol === symbol);
                if (stock && stock.research && stock.research.choiceAvailableUntil) {
                    const timeLeft = Math.max(0, Math.ceil((stock.research.choiceAvailableUntil - Date.now()) / 1000));
                    document.getElementById('rd-choice-timer').textContent = timeLeft;
                }
            }
        }
        if (document.getElementById('management-modal').style.display === 'block') {
            const symbol = document.getElementById('management-modal').dataset.currentSymbol;
            if (symbol) {
                const stock = stocks.find(s => s.symbol === symbol);
                if (stock && stock.research && stock.research.isResearching && stock.research.currentTech) {
                    const tech = technologies[stock.research.currentTech];
                    const progressPercent = (stock.research.progress / tech.cost) * 100;
                    document.getElementById('rd-progress-bar').value = progressPercent;
                }
                // Dynamiczna aktualizacja cooldownu CEO
                const fireCeoCooldownInfo = document.getElementById('fire-ceo-cooldown-info');
                if (stock && stock.ceo && stock.ceo.fireCooldown && Date.now() < stock.ceo.fireCooldown) {
                    const remainingTime = Math.ceil((stock.ceo.fireCooldown - Date.now()) / 1000);
                    fireCeoCooldownInfo.textContent = `Następne zgromadzenie możliwe za: ${remainingTime} s`;
                } else if (stock && fireCeoCooldownInfo && fireCeoCooldownInfo.textContent !== '') {
                    fireCeoCooldownInfo.textContent = '';
                }
            }
        }
        // Odświeżanie modala banku (z bazy main.js - zawiera aukcje zabezpieczeń)
        if (document.getElementById('bank-modal').style.display === 'block') {
            // Dynamiczna aktualizacja cooldownu oferty państwowej
            const select = document.getElementById('state-company-select');
            const cooldownLabel = document.getElementById('state-offer-cooldown');
            if (select && cooldownLabel && select.value) {
                const symbol = select.value;
                const stock = stocks.find(s => s.symbol === symbol);
                if (stock && stock.stateOfferCooldownUntil && Date.now() < stock.stateOfferCooldownUntil) {
                    const remainingTime = Math.ceil((stock.stateOfferCooldownUntil - Date.now()) / 1000);
                    cooldownLabel.textContent = `Następna oferta dla tej spółki możliwa za: ${remainingTime}s`;
                    document.getElementById('state-offer-controls').style.opacity = '0.5';
                } else if (stock && cooldownLabel.textContent.startsWith('Następna oferta')) {
                    cooldownLabel.textContent = '';
                    document.getElementById('state-offer-controls').style.opacity = '1';
                }
            }

            // Zawsze odświeżaj sekcje aukcji, jeśli jest widoczna zakładka Banku Centralnego
            if (document.getElementById('bank-content-central').style.display === 'block') {
                updateTBillAuctionSection();
                updateCollateralAuctionSection(); // Z bazy main.js
            }
            // Odświeżanie rynku obligacji jest teraz obsługiwane przez dodany blok z main2.js
            // if (document.getElementById('bank-content-bonds').style.display === 'block') {
            //     renderBondMarketInBank(); // Ten if jest już wyżej
            // }
        }
        if (document.getElementById('dividend-tracker-modal').style.display === 'flex') {
            renderDividendTrackerContent();
        }
        if (document.getElementById('newspaper-modal').style.display === 'flex') {
            updateNewspaperContent();
        }

        // Odświeżanie wykresu, jeśli jest otwarty
        if (currentlyDisplayedChartSymbol) {
            const stockToUpdate = stocks.find(s => s.symbol === currentlyDisplayedChartSymbol);
            const modal = document.getElementById('price-chart-modal');
            if (stockToUpdate && modal && modal.style.display === 'block') {
                const svgArea = document.getElementById('chart-svg-area');
                if (svgArea) {
                    const svgWidth = svgArea.offsetWidth > 0 ? svgArea.offsetWidth : 360;
                    const svgHeight = svgArea.offsetHeight > 0 ? svgArea.offsetHeight : 180;
                    renderChartSVGForStock(stockToUpdate, svgArea, svgWidth, svgHeight);
                }
            }
        }

        // --- PRZYWRACANIE FOKUSU ---
        if (activeElementId) {
            const elementToFocus = document.getElementById(activeElementId);
            if (elementToFocus) {
                elementToFocus.focus();
                // Przywróć pozycję kursora, jeśli była zapamiętana
                if (selectionStart !== null && selectionEnd !== null) {
                    try { // Użyj try-catch na wypadek, gdyby element nie obsługiwał selection
                        elementToFocus.setSelectionRange(selectionStart, selectionEnd);
                    } catch (e) {
                        // Ignoruj błąd, jeśli nie można ustawić zaznaczenia
                    }
                }
            }
        }

    }, BASE_DELAYS.stockUpdate / speedMultiplier);

    // Pętla tygodniowa (z bazy main.js - bankowość komercyjna)
    gameTimers.weekly = setInterval(() => {
        if (isGamePaused) return;

        processCompanyBanking(); // Bankowość korporacyjna
        processBankStartupSponsorship(); // Sponsorowanie startupów przez banki

        // Naliczanie odsetek od depozytów komercyjnych gracza
        playerCommercialDeposits.forEach(deposit => {
            const weeklyRate = deposit.interestRate / 52;
            const interestEarned = deposit.amount * weeklyRate;
            playerCash += interestEarned;
            if (interestEarned > 0.01) {
                logEvent(` Naliczono ${interestEarned.toFixed(2)} PLN odsetek od depozytu w ${deposit.bankName}.`, 'market');
            }
        });

        // Obsługa automatycznej spłaty kredytów komercyjnych gracza
        playerCommercialLoans.forEach((loan, index) => {
            const weeklyInterest = loan.amount * (loan.interestRate / 52);
            loan.amount += weeklyInterest; // Dolicz odsetki do salda

            // Sprawdzamy czy auto-spłata jest włączona (zmienna isAutoRepayEnabled może pochodzić z ui.js)
            let autoRepayActive = typeof isAutoRepayEnabled !== 'undefined' ? isAutoRepayEnabled : true; // Domyślnie włączona, jeśli zmienna nie istnieje

            if (autoRepayActive && playerCash >= loan.weeklyPayment) {
                const payment = Math.min(loan.weeklyPayment, loan.amount); // Nie spłacaj więcej niż zostało
                playerCash -= payment;
                loan.amount -= payment;

                // Znajdź bank i zaktualizuj jego stan
                const bank = commercialBanks.find(b => b.id === loan.bankId);
                if (bank) {
                    bank.cash += payment;
                    bank.loanPortfolio['player'] = Math.max(0, (bank.loanPortfolio['player'] || 0) - payment);
                }

                if (loan.amount <= 0) {
                    logEvent(` Kredyt komercyjny w ${loan.bankName} został spłacony!`, 'success');
                    // Odblokuj zastaw, jeśli istniał
                    if (loan.collateral) unlockCollateral(loan.collateral.symbol, loan.collateral.quantity);
                    playerCommercialLoans.splice(index, 1); // Usuń spłaconą pożyczkę
                } else {
                    logEvent(` Automatycznie spłacono ${payment.toFixed(2)} PLN raty kredytu w ${loan.bankName}.`, 'market');
                }
            } else if (autoRepayActive) {
                // TODO: Logika pominiętych rat dla kredytów komercyjnych
                logEvent(`⚠️ Brak środków na spłatę raty kredytu komercyjnego w ${loan.bankName}!`, 'warning');
                loan.missedPayments = (loan.missedPayments || 0) + 1; // Zliczaj pominięte raty
                // Sprawdź warunki niewypłacalności (np. 3 pominięte raty)
                if (loan.missedPayments >= 3 && loan.collateral) {
                    triggerCollateralAuction(loan); // Uruchom aukcję zastawu
                    playerCommercialLoans.splice(index, 1); // Usuń kredyt po uruchomieniu aukcji
                }
            }
        });
        if (playerCash > 0) displayCash(); // Aktualizuj gotówkę po operacjach

    }, BASE_DELAYS.weekly / speedMultiplier);

    // Pętla kwartalna (z bazy main.js - zawiera AI Banku Centralnego)
    gameTimers.quarterly = setInterval(() => {
        if (isGamePaused) return;
        reviewCompanyPlacements();
        processFinancialReports();
        updateCeoTenureAndAge(); // Zmieniona nazwa, ale to samo
        updateAnalyticalProperties();
        runCentralBankAI(); // Z bazy main.js
    }, BASE_DELAYS.quarterly / speedMultiplier);

    // Pętla reputacji (powolny powrót do zera)
    gameTimers.reputationDecay = setInterval(() => {
        if (isGamePaused) return;
        stocks.forEach(stock => {
            if (stock.reputation) {
                for (const entityId in stock.reputation) {
                    const currentRep = stock.reputation[entityId];
                    if (currentRep > 0) {
                        changeReputation(entityId, stock.symbol, -5);
                        if (stock.reputation[entityId] < 0) stock.reputation[entityId] = 0;
                    } else if (currentRep < 0) {
                        changeReputation(entityId, stock.symbol, 5);
                        if (stock.reputation[entityId] > 0) stock.reputation[entityId] = 0;
                    }
                }
            }
        });
    }, 180000 / speedMultiplier); // 3 minuty czasu gry

    // Pętla wydarzeń losowych
    gameTimers.event = setInterval(() => {
        if (isGamePaused) return;
        triggerMainMarketEventCycle();
    }, BASE_DELAYS.event / speedMultiplier);

    // Pętle dla obligacji (z bazy main.js)
    gameTimers.stateBondIssuance = setInterval(() => {
        if (isGamePaused) return;
        issueStateBonds();
    }, 15 * 60 * 1000 / speedMultiplier); // 15 minut

    gameTimers.otherBondIssuance = setInterval(() => {
        if (isGamePaused) return;
        issueNewBondOffer();
    }, 40 * 1000 / speedMultiplier); // Co 40 sekund

    gameTimers.bondMaturityCheck = setInterval(() => {
        if (isGamePaused) return;
        checkBondMaturities();
    }, 5000 / speedMultiplier); // Co 5 sekund

    // Pętle dla zdarzeń CEO, półrocznych i rocznych
    gameTimers.ceoEvent = setInterval(() => {
        if (isGamePaused) return;
        triggerCeoEvent();
    }, BASE_DELAYS.quarterly * 2 / speedMultiplier); // Co 2 kwartały

    gameTimers.semiAnnual = setInterval(() => {
        if (isGamePaused) return;
        triggerSemiAnnualEvents();
    }, BASE_DELAYS.quarterly * 2 / speedMultiplier); // Co pół roku

    gameTimers.yearly = setInterval(() => {
        if (isGamePaused) return;
        updateCeoTenureAndAge();
        triggerYearlyCeoEvents();
        updateCity(); // Aktualizacja miasta i start festynu
    }, BASE_DELAYS.quarterly * 4 / speedMultiplier); // Co rok
}

// Funkcja inicjalizująca grę
function initializeGame() {
    console.log("--- Funkcja initializeGame() została wywołana ---");
    applyInitialTheme(); // Stosuje motyw (ciemny/jasny)

    // --- POCZĄTEK BLOKU (DODANE Z main2.js) ---
    // Wczytaj zapisany stan zwinięcia panelu startupów
    const savedStartupCollapseState = localStorage.getItem('startupPanelCollapsed');
    if (savedStartupCollapseState !== null) {
        // Zakładamy, że zmienna startupPanelCollapsed jest dostępna globalnie (zdefiniowana w ui.js)
        if (typeof startupPanelCollapsed !== 'undefined') {
            startupPanelCollapsed = JSON.parse(savedStartupCollapseState);
        } else {
            console.warn("Zmienna startupPanelCollapsed nie jest dostępna globalnie w main.js");
            // Można ustawić domyślną wartość na wszelki wypadek
            // startupPanelCollapsed = false;
        }
    }
    // --- KONIEC BLOKU (DODANE Z main2.js) ---

    // Inicjalizacja banków komercyjnych (z bazy main.js)
    initializeCommercialBanks();
    generateCentralBankGovernor(); // Z bazy main.js

    // Tworzenie początkowych start-upów, jeśli ich brakuje
    const existingStartups = Array.isArray(stocks) ? stocks.filter(s => s.assetType === 'Startup').length : 0;
    if (existingStartups < 5) {
        const genFn = (typeof generateNewStartup === 'function') ? generateNewStartup : (typeof window !== 'undefined' && typeof window.generateNewStartup === 'function') ? window.generateNewStartup : null;
        if (genFn) {
            const toCreate = 5 - existingStartups;
            for (let i = 0; i < toCreate; i++) {
                try {
                    stocks.push(genFn());
                } catch (err) {
                    console.error('Błąd podczas generowania start-upu:', err);
                }
            }
        } else {
            console.warn('generateNewStartup nie jest dostępna — pomijam tworzenie dodatkowych start-upów.');
        }
    }

    // --- Logika inicjalizacji opisów, CEO, bilansów itp. ---
    let availableResearchDescriptions = [];
    if (typeof researchInstituteDescriptions !== 'undefined' && Array.isArray(researchInstituteDescriptions)) {
        availableResearchDescriptions = [...researchInstituteDescriptions];
    } else {
        console.warn("Zmienna researchInstituteDescriptions nie jest zdefiniowana lub nie jest tablicą.");
    }

    stocks.forEach(stock => {
        if (stock.assetType === 'Startup') {
            generateCEO(stock);
        } else if (stock.assetType === 'ResearchInstitute') {
            generateCEO(stock);
            if (availableResearchDescriptions.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableResearchDescriptions.length);
                const randomDescription = availableResearchDescriptions.splice(randomIndex, 1)[0];
                stock.description = `${randomDescription} Na czele instytutu stoi prezes ${stock.ceo ? stock.ceo.name : 'nieznany'}.`;
            }
        } else { // Dla zwykłych spółek
            initializeDescriptionParts(stock);
            initializeAnalyticalProperties(stock);
            initializeResearchForStock(stock);
            // --- POCZĄTEK LINII (DODANE Z main2.js) ---
            stock.playerHasFinancialAccess = false; // Inicjalizacja dostępu finansowego
            // --- KONIEC LINII (DODANE Z main2.js) ---
        }
        // Wspólne dla wszystkich lub prawie wszystkich
        initializeBalanceSheetForStock(stock);
    });
    // --- Koniec logiki inicjalizacji opisów ---

    initializeReputation();
    initializeHoldingPortfolios();
    assignInitialDividendPolicies();
    if (typeof initializeDividendEstimates === 'function') {
        initializeDividendEstimates();
    } else if (typeof window !== 'undefined' && typeof window.initializeDividendEstimates === 'function') {
        window.initializeDividendEstimates();
    } else {
        console.warn('initializeDividendEstimates nie jest dostępna — pomijam inicjalizację estymat dywidend.');
    }

    // --- Aktywacja banków i przypisanie kont (z bazy main.js) ---
    console.log("[START GRY] Aktywowanie banków startowych...");
    const activeBankTypes = new Set();
    // (Kod aktywacji banków - bez zmian z main.js)
    const investmentBanks = commercialBanks.filter(b => b.type === BANK_TYPES.INVESTMENT);
    if (investmentBanks.length > 0) {
        const chosenInv = getRandomElement(investmentBanks);
        chosenInv.isActive = true; activeBankTypes.add(chosenInv.type); console.log(`- Aktywowano bank inwestycyjny: ${chosenInv.name}`);
    }
    const corporateBanks = commercialBanks.filter(b => b.type === BANK_TYPES.CORPORATE);
    if (corporateBanks.length > 0) {
        const chosenCorp = getRandomElement(corporateBanks);
        chosenCorp.isActive = true; activeBankTypes.add(chosenCorp.type); console.log(`- Aktywowano bank korporacyjny: ${chosenCorp.name}`);
    }
    const otherBankTypes = Object.values(BANK_TYPES).filter(t => t !== BANK_TYPES.INVESTMENT && t !== BANK_TYPES.CORPORATE);
    const availableOtherBanks = commercialBanks.filter(b => otherBankTypes.includes(b.type) && !b.isActive);
    if (availableOtherBanks.length > 0) {
        const chosenOther = getRandomElement(availableOtherBanks);
        chosenOther.isActive = true; activeBankTypes.add(chosenOther.type); console.log(`- Aktywowano losowy bank: ${chosenOther.name} (${chosenOther.type})`);
    }

    console.log("[START GRY] Przypisywanie kont bankowych spółkom...");
    const activeCorpAndUniBanks = commercialBanks.filter(b => b.isActive && (b.type === BANK_TYPES.CORPORATE || b.type === BANK_TYPES.UNIVERSAL));
    stocks.forEach(stock => {
        if (!stock.assetType && !stock.bankAccountId) {
            if (activeCorpAndUniBanks.length > 0) {
                const assignedBank = getRandomElement(activeCorpAndUniBanks);
                stock.bankAccountId = assignedBank.id;
                assignedBank.corporateClients.push(stock.symbol);
                const initialCash = stock.balanceSheet.assets * getRandomInRange(0.01, 0.05);
                stock.cash = initialCash;
                assignedBank.cash += initialCash;
            } else {
                console.warn(`! Brak aktywnych banków korporacyjnych/uniwersalnych do przypisania konta dla ${stock.symbol}`);
            }
        }
    });
    // --- Koniec aktywacji banków ---

    // --- POCZĄTEK BLOKU (DODANE Z main2.js) ---
    // Ustaw początkowy stan zwinięcia panelu startupów
    const startupPanel = document.getElementById('startup-incubator-panel');
    const startupIcon = document.getElementById('toggle-icon-startup');
    if (startupPanel && startupIcon) {
        let isCollapsed = false; // Wartość domyślna
        if (typeof startupPanelCollapsed !== 'undefined') {
            isCollapsed = startupPanelCollapsed;
        }

        if (isCollapsed) {
            startupPanel.classList.add('collapsed');
            startupIcon.textContent = '▶';
        } else {
            startupPanel.classList.remove('collapsed');
            startupIcon.textContent = '▼';
        }
    }
    // --- KONIEC BLOKU (DODANE Z main2.js) ---

    // Inicjalizacja UI
    setupAutoInvestModal();
    displayCash();
    displayPortfolio();
    displayXP();
    displayMarketIndexes();
    updateWorkButtonVisibility();
    updateDividendTrackerButtonVisibility();

    // Aktualizacja przycisku pauzy
    const pauseButton = document.getElementById('pause-game-btn');
    if (isGamePaused && pauseButton) {
        pauseButton.textContent = '▶️ Wznów';
        pauseButton.style.backgroundColor = '#28a745';
    }

    // Obliczenie początkowych stóp procentowych (z bazy main.js)
    updateInterestRates();

    // Uruchomienie pętli gry
    setGameSpeed(1);
}

// Uruchom grę po załadowaniu strony (z bazy main.js - zawiera zależność od banków komercyjnych)
window.addEventListener('load', () => {
    const required = [
        'generateNewStartup',
        'initializeDividendEstimates',
        'assembleDescription',
        'initializeCommercialBanks' // Zależność z bazy main.js
    ];
    const start = Date.now();
    const timeout = 5000;
    const interval = 50; // ms

    function checkDeps() {
        const missing = required.filter(name => !(typeof globalThis[name] === 'function'));
        if (missing.length === 0) {
            console.log('[loader] Wszystkie zależności dostępne, uruchamiam initializeGame()');
            try { initializeGame(); } catch (e) { console.error('[loader] initializeGame() rzucił wyjątek:', e); }
            return;
        }
        if (Date.now() - start < timeout) {
            setTimeout(checkDeps, interval);
        } else {
            console.error('[loader] Timeout: brakujące zależności:', missing);
            try { initializeGame(); } catch (e) { console.error('[loader] initializeGame() nie mogło zostać wywołane (brak zależności):', e); }
        }
    }

    checkDeps();
});

// Funkcja uruchamiająca AI (z bazy main.js - zawiera AI banków inwestycyjnych)
function runAllAi() {
    aiCompetitors.forEach(ai => {
        if (Math.random() < 0.15) {
            makeAiDecision(ai);
            checkAiTierUpgrade(ai);
        }
    });
    // AI dla banków inwestycyjnych (z bazy main.js)
    commercialBanks.forEach(bank => {
        if (bank.type === BANK_TYPES.INVESTMENT && bank.isActive) {
            if (Math.random() < 0.10) {
                runInvestmentBankAI(bank);
            }
        }
        // W przyszłości dodamy tu logikę AI dla innych typów banków
    });
    if (Math.random() < 0.02) {
        runStateActions();
    }
}