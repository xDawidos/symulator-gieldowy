// main.js

// Obiekt do przechowywania ID interwałów, aby można je było czyścić
const gameTimers = {
    stockUpdate: null,
    weekly: null,
    quarterly: null,
    event: null,
    ceoEvent: null, // NOWE
    semiAnnual: null, // NOWE
    yearly: null,      // NOWE
    reputationDecay: null,
    tBillMaturityCheck: null
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

    gameTimers.mortgageCheck = setInterval(() => {
        if (isGamePaused) return;
        checkMortgageDefaults();
    }, BASE_DELAYS.weekly / speedMultiplier); // Sprawdzaj co tydzień

    // --- URUCHOMIENIE NOWYCH PĘTLI Z NOWĄ PRĘDKOŚCIĄ ---


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
        runAllAi();
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
         if (document.getElementById('bank-modal').style.display === 'block') {
    // Dynamiczna aktualizacja cooldownu oferty państwowej (bez zmian)
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

   
    // Zawsze odświeżaj sekcję aukcji, jeśli jest widoczna (na zakładce Banku Centralnego)
    if (document.getElementById('bank-content-central').style.display === 'block') {
        updateTBillAuctionSection();
        updateCollateralAuctionSection();
    }
    // Zawsze odświeżaj rynek obligacji, jeśli jest widoczny (na zakładce Obligacji)
    if (document.getElementById('bank-content-bonds').style.display === 'block') {
        renderBondMarketInBank();
    }
    
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

    // Pętla tygodniowa (odsetki, spłata kredytu)
    gameTimers.weekly = setInterval(() => {
        if (isGamePaused) return;
        
        
        processCompanyBanking();
        processBankStartupSponsorship();
        playerCommercialDeposits.forEach(deposit => {
        const weeklyRate = deposit.interestRate / 52;
        const interestEarned = deposit.amount * weeklyRate;
        playerCash += interestEarned;
        if (interestEarned > 0.01) {
            logEvent(` Naliczono ${interestEarned.toFixed(2)} PLN odsetek od depozytu w ${deposit.bankName}.`, 'market');
        }
    });

    // 2. Obsłuż automatyczną spłatę kredytów komercyjnych gracza
    playerCommercialLoans.forEach((loan, index) => {
        const weeklyInterest = loan.amount * (loan.interestRate / 52);
        loan.amount += weeklyInterest; // Dolicz odsetki do salda

        if (isAutoRepayEnabled && playerCash >= loan.weeklyPayment) {
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
                playerCommercialLoans.splice(index, 1); // Usuń spłaconą pożyczkę
            } else {
                 logEvent(` Automatycznie spłacono ${payment.toFixed(2)} PLN raty kredytu w ${loan.bankName}.`, 'market');
            }
        } else if (isAutoRepayEnabled) {
            // TODO: Logika pominiętych rat dla kredytów komercyjnych (może być inna niż w BC)
            logEvent(`⚠️ Brak środków na spłatę raty kredytu komercyjnego w ${loan.bankName}!`, 'warning');
        }
    });
    if (playerCash > 0) displayCash();
    }, BASE_DELAYS.weekly / speedMultiplier);

    // Pętla kwartalna (raporty finansowe, przegląd giełd)
    gameTimers.quarterly = setInterval(() => {
        if (isGamePaused) return;
        reviewCompanyPlacements();
        processFinancialReports();
        updateCeoTenureAndAge(); // Zmieniona nazwa
        updateAnalyticalProperties();
        runCentralBankAI();
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

    // Pętle dla obligacji
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

    // Pętle dla zdarzeń CEO
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

function initializeGame() {
    console.log("--- Funkcja initializeGame() została wywołana ---");
    applyInitialTheme();
    initializeCommercialBanks();
    generateCentralBankGovernor();
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

    // --- NOWA, ZINTEGROWANA LOGIKA PRZYDZIELANIA OPISÓW ---
    // Stwórz kopię puli opisów, którą będziemy mogli modyfikować
    let availableResearchDescriptions = [...researchInstituteDescriptions];

    stocks.forEach(stock => {
        if (stock.assetType === 'Startup') {
            // Dla start-upów generujemy tylko prezesa
            generateCEO(stock);
        } else if (stock.assetType === 'ResearchInstitute') {
            // Dla spółek badawczych losuj unikalny opis z puli
            generateCEO(stock);
            if (availableResearchDescriptions.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableResearchDescriptions.length);
                const randomDescription = availableResearchDescriptions.splice(randomIndex, 1)[0];
                stock.description = `${randomDescription} Na czele instytutu stoi prezes ${stock.ceo}.`;
            }
        } else {
            // Dla zwykłych spółek generuj części składowe opisu
            initializeDescriptionParts(stock);
        }

        initializeBalanceSheetForStock(stock);
        // Inicjalizuj system R&D dla wszystkich spółek giełdowych
        initializeResearchForStock(stock);

        // --- ZINTEGROWANY KOD ---
        initializeAnalyticalProperties(stock);

        
    });
    // --- KONIEC NOWEJ LOGIKI ---
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

    // --- NOWY BLOK: Aktywacja banków i przypisanie kont ---
    console.log("[START GRY] Aktywowanie banków startowych...");
    const activeBankTypes = new Set();

    // Aktywuj 1 inwestycyjny
    const investmentBanks = commercialBanks.filter(b => b.type === BANK_TYPES.INVESTMENT);
    if (investmentBanks.length > 0) {
        const chosenInv = getRandomElement(investmentBanks);
        chosenInv.isActive = true;
        activeBankTypes.add(chosenInv.type);
        console.log(`- Aktywowano bank inwestycyjny: ${chosenInv.name}`);
    }

    // Aktywuj 1 korporacyjny
    const corporateBanks = commercialBanks.filter(b => b.type === BANK_TYPES.CORPORATE);
    if (corporateBanks.length > 0) {
        const chosenCorp = getRandomElement(corporateBanks);
        chosenCorp.isActive = true;
        activeBankTypes.add(chosenCorp.type);
        console.log(`- Aktywowano bank korporacyjny: ${chosenCorp.name}`);
    }

    // Aktywuj 1 losowy z pozostałych typów
    const otherBankTypes = Object.values(BANK_TYPES).filter(t => t !== BANK_TYPES.INVESTMENT && t !== BANK_TYPES.CORPORATE);
    const availableOtherBanks = commercialBanks.filter(b => otherBankTypes.includes(b.type) && !b.isActive);
    if (availableOtherBanks.length > 0) {
        const chosenOther = getRandomElement(availableOtherBanks);
        chosenOther.isActive = true;
        activeBankTypes.add(chosenOther.type);
        console.log(`- Aktywowano losowy bank: ${chosenOther.name} (${chosenOther.type})`);
    }

    console.log("[START GRY] Przypisywanie kont bankowych spółkom...");
    const activeCorpAndUniBanks = commercialBanks.filter(b => b.isActive && (b.type === BANK_TYPES.CORPORATE || b.type === BANK_TYPES.UNIVERSAL));
    
    stocks.forEach(stock => {
        if (!stock.assetType && !stock.bankAccountId) { // Jeśli to standardowa spółka bez konta
             if (activeCorpAndUniBanks.length > 0) {
                const assignedBank = getRandomElement(activeCorpAndUniBanks);
                stock.bankAccountId = assignedBank.id;
                assignedBank.corporateClients.push(stock.symbol); // Dodaj spółkę do listy klientów banku

                // Inicjalizuj gotówkę spółki (np. 1-5% jej aktywów)
                const initialCash = stock.balanceSheet.assets * getRandomInRange(0.01, 0.05);
                stock.cash = initialCash;
                // Wpłać tę gotówkę do banku (zwiększ rezerwy banku)
                assignedBank.cash += initialCash; // Uproszczone: gotówka banku = rezerwy + kapitał

                // console.log(`- Spółce ${stock.symbol} przypisano konto w ${assignedBank.name} i ${initialCash.toFixed(0)} PLN gotówki.`);
             } else {
                 console.warn(`! Brak aktywnych banków korporacyjnych/uniwersalnych do przypisania konta dla ${stock.symbol}`);
             }
        }
    });

    setupAutoInvestModal();
    displayCash();
    displayPortfolio();
    displayXP();
    displayMarketIndexes();
    updateWorkButtonVisibility();
    updateDividendTrackerButtonVisibility();

    // Aktualizacja przycisku pauzy, aby odzwierciedlał stan początkowy
    const pauseButton = document.getElementById('pause-game-btn');
    if (isGamePaused && pauseButton) {
        pauseButton.textContent = '▶️ Wznów';
        pauseButton.style.backgroundColor = '#28a745';
    }
    updateInterestRates(); // Oblicz początkowe stopy procentowe dla rynku i banków
    // Uruchom grę z domyślną prędkością x1
    setGameSpeed(1);
}

// Uruchom grę, gdy cała strona się załaduje
// Używamy mechanizmu oczekiwania na zależności, bo część funkcji może być zdefiniowana dopiero później
window.addEventListener('load', () => {
    const required = [
        'generateNewStartup',
        'initializeDividendEstimates',
        'assembleDescription',
        'initializeCommercialBanks'
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
            // Spróbujmy uruchomić initializeGame ostrożnie, żeby złapać błąd i nie rozbić całej strony
            try { initializeGame(); } catch (e) { console.error('[loader] initializeGame() nie mogło zostać wywołane (brak zależności):', e); }
        }
    }

    checkDeps();
});

function runAllAi() {
    aiCompetitors.forEach(ai => {
        if (Math.random() < 0.15) {
            makeAiDecision(ai);
            checkAiTierUpgrade(ai);
        }
        commercialBanks.forEach(bank => {
        if (bank.type === BANK_TYPES.INVESTMENT && bank.isActive) {
            if (Math.random() < 0.10) { // Banki inwestycyjne działają jeszcze rzadziej
                runInvestmentBankAI(bank);
            }
        }
        // W przyszłości dodamy tu logikę AI dla innych typów banków
    });
    });
    if (Math.random() < 0.02) { // Szansa 2% w każdym cyklu (raz na ok. 50 sekund przy prędkości x1)
        runStateActions();
    }
}