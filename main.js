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
    // ---> DODAJ TĘ LINIĘ <---
    if (adPopupTimerId) {
        clearTimeout(adPopupTimerId);
        adPopupTimerId = null;
    }
    // ---> KONIEC DODAWANIA <---
    console.log("Wszystkie pętle gry zostały zatrzymane.");
}

/**
 * Ustawia nową prędkość gry, czyszcząc stare pętle i tworząc nowe.
 * @param {number} speedMultiplier - Mnożnik prędkości (np. 1, 2, 5).
 */
function setGameSpeed(speedMultiplier) {
    clearIntervals(); // Zatrzymaj wszystkie istniejące pętle
    currentSpeedMultiplier = speedMultiplier; // Ustaw nowy mnożnik

    if (adPopupTimerId) {
        clearTimeout(adPopupTimerId);
        adPopupTimerId = null;
    }

    // Zaktualizuj wygląd przycisków prędkości
    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => btn.classList.remove('active'));
    let activeBtn;
    if (speedMultiplier === 1) activeBtn = speedButtons[0];
    if (speedMultiplier === 2) activeBtn = speedButtons[1];
    if (speedMultiplier === 5) activeBtn = speedButtons[2];
    if (activeBtn) activeBtn.classList.add('active');

    console.log(`Ustawiono prędkość gry na x${speedMultiplier}`);

    if (!isAdPopupVisible) {
         scheduleAdPopup();
    }

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

        if (document.getElementById('state-modal').style.display === 'block') {
            updateStateModalContent();
        }


        if (document.getElementById('state-modal').style.display === 'block') {
             // Sprawdź czy funkcja istnieje przed wywołaniem
            if (typeof updateStateModalContent === 'function') {
                updateStateModalContent();
            }
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
        clearExpiredBankBonuses();
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


    if (playerCompany && playerCompany.employees.length > 0) {
        let totalEmployeeSalary = 0;
        let totalEquipmentRunningCost = 0;

        // Koszty pracowników
        playerCompany.employees.forEach(employee => {
            // Użyj pensji pracownika, jeśli istnieje, inaczej bazowej
            totalEmployeeSalary += employee.salary || EMPLOYEE_BASE_SALARY;
        });

        // Modyfikator HR (jeśli HR istnieje i ma poziom > 0)
        if (playerCompany.hrLevel > 0) {
            const salaryReduction = 1 - (playerCompany.hrLevel * 0.05);
            totalEmployeeSalary *= salaryReduction;
        }

        // Koszty sprzętu
        playerCompany.equipment.forEach(eq => {
            totalEquipmentRunningCost += eq.quantity * getRandomInRange(eq.runningCostMin, eq.runningCostMax);
        });

        const totalCompanyCosts = totalEmployeeSalary + totalEquipmentRunningCost;

        if (playerCash >= totalCompanyCosts) {
            playerCash -= totalCompanyCosts;
            if (totalEmployeeSalary > 0) logEvent(`💸 Twoja firma wypłaciła ${totalEmployeeSalary.toFixed(2)} PLN pensji.`);
            if (totalEquipmentRunningCost > 0) logEvent(`💡 Twoja firma zapłaciła ${totalEquipmentRunningCost.toFixed(2)} PLN za utrzymanie sprzętu.`);
        } else {
            // Brak środków - konsekwencje (np. obniżenie morale)
            logEvent(`🚨 Brak wystarczających środków (${totalCompanyCosts.toFixed(2)} PLN) na pokrycie kosztów firmy! Morale pracowników spada!`, 'error');
            // Zastosuj karę do morale (implementacja morale w kroku 4)
             if (typeof applyMoralePenalty === 'function') {
                 applyMoralePenalty(playerCompany.employees, 10); // Np. kara -10 morale
             }
            // Można dodać zaciąganie długu przez firmę lub inne kary
        }
        displayCash(); // Zaktualizuj gotówkę po odjęciu kosztów
    }

    if (playerCompany && typeof updateAllEmployeeMorale === 'function') {
        updateAllEmployeeMorale();
    }

    // Obsługa automatycznej spłaty kredytów komercyjnych gracza
    // ---> WAŻNE: Używamy pętli 'for' z iteracją wstecz, aby uniknąć problemów przy usuwaniu elementów (splice) <---
    for (let index = playerCommercialLoans.length - 1; index >= 0; index--) {
        const loan = playerCommercialLoans[index];
        const weeklyInterest = loan.amount * (loan.interestRate / 52);
        loan.amount += weeklyInterest; // Dolicz odsetki do salda

        let autoRepayActive = typeof isAutoRepayEnabled !== 'undefined' ? isAutoRepayEnabled : true;

        if (autoRepayActive && playerCash >= loan.weeklyPayment) {
            const payment = Math.min(loan.weeklyPayment, loan.amount);
            playerCash -= payment;
            loan.amount -= payment;

            const bank = commercialBanks.find(b => b.id === loan.bankId);
            if (bank) {
                bank.cash += payment;
                // --- POPRAWKA AKTUALIZACJI PORTFELA BANKU ---
                // Musimy znaleźć konkretną pożyczkę w portfelu banku i ją zaktualizować/usunąć
                if (bank.loanPortfolio && bank.loanPortfolio['player']) {
                    const bankLoanIndex = bank.loanPortfolio['player'].findIndex(bl => bl.id === loan.id);
                    if (bankLoanIndex !== -1) {
                        bank.loanPortfolio['player'][bankLoanIndex].remainingAmount -= payment;
                        if (bank.loanPortfolio['player'][bankLoanIndex].remainingAmount <= 0.01) {
                            bank.loanPortfolio['player'].splice(bankLoanIndex, 1);
                        }
                    }
                }
                // --- KONIEC POPRAWKI ---
            }

            if (loan.amount <= 0.01) { // Użyj małego progu dla bezpieczeństwa
                logEvent(` Kredyt komercyjny w ${loan.bankName} został spłacony!`, 'success');
                if (loan.collateral) {
                    // Sprawdź, czy funkcja unlockCollateral istnieje przed wywołaniem
                    if (typeof unlockCollateral === 'function') {
                         unlockCollateral(loan.collateral.symbol, loan.collateral.quantity);
                    } else {
                        console.warn("Funkcja unlockCollateral nie została znaleziona!");
                    }
                }
                playerCommercialLoans.splice(index, 1); // Usuń spłaconą pożyczkę
            } else {
                logEvent(` Automatycznie spłacono ${payment.toFixed(2)} PLN raty kredytu w ${loan.bankName}.`, 'market');
            }
        } else if (autoRepayActive) {
            logEvent(`⚠️ Brak środków na spłatę raty kredytu komercyjnego w ${loan.bankName}!`, 'warning');
            loan.missedPayments = (loan.missedPayments || 0) + 1;
            if (loan.missedPayments >= 3 && loan.collateral) {
                 // Sprawdź, czy funkcja triggerCollateralAuction istnieje
                 if (typeof triggerCollateralAuction === 'function') {
                    // Przekażemy obiekt pożyczki, aby funkcja aukcji miała potrzebne dane
                    triggerCollateralAuction(loan); // UWAGA: Upewnij się, że triggerCollateralAuction obsługuje obiekt pożyczki
                 } else {
                    console.warn("Funkcja triggerCollateralAuction nie została znaleziona!");
                 }
                playerCommercialLoans.splice(index, 1);
            }
        }
    } // Koniec pętli for dla pożyczek

    // ---> NOWA PĘTLA DLA KOSZTÓW BADAŃ <---
    stocks.forEach(stock => {
        // Sprawdź tylko ZWYKŁE spółki (NIE banki, NIE startupy itp.)
        // i te, które mają obiekt badań
        if (!stock.assetType && !stock.isBankStock && stock.research) { // Dodano !stock.isBankStock
            // Sprawdź, czy badania są aktywne
            if (stock.research.isResearching && stock.research.currentTech) {
                if (stock.cash >= RESEARCH_MAINTENANCE_COST) {
                    stock.cash -= RESEARCH_MAINTENANCE_COST;
                } else {
                    // Wstrzymaj badania (logika bez zmian)
                    stock.research.isResearching = false;
                    stock.research.researchPaused = true;
                    const techName = technologies[stock.research.currentTech]?.name || "nieznanej technologii";
                    logEvent(`⏸️ ${stock.name} wstrzymuje badania nad "${techName}" z powodu braku środków na utrzymanie.`, 'company');
                    showToast(`Badania w ${stock.name} wstrzymane - brak funduszy!`, 'warning');
                }
            }
            // Sprawdź, czy badania były wstrzymane i można je wznowić
            else if (stock.research.researchPaused && stock.research.currentTech) {
                if (stock.cash >= RESEARCH_MAINTENANCE_COST) {
                    // Wznów badania (logika bez zmian)
                    stock.cash -= RESEARCH_MAINTENANCE_COST;
                    stock.research.isResearching = true;
                    stock.research.researchPaused = false;
                    const techName = technologies[stock.research.currentTech]?.name || "nieznanej technologii";
                    logEvent(`▶️ ${stock.name} wznawia badania nad "${techName}".`, 'company');
                }
            }
        }
        // --- NOWA LOGIKA: Wznawianie zapauzowanych INWESTYCJI bankowych ---
        else if (stock.isBankStock && stock.research && stock.research.investmentPaused && stock.research.currentInvestmentId) {
             const bankData = commercialBanks.find(b => b.id === stock.bankData.id);
             const investment = bankInvestments[stock.research.currentInvestmentId];
             if(bankData && investment && bankData.cash >= (investment.initialCashCost || 0)) {
                 // Wznów inwestycję
                 bankData.cash -= (investment.initialCashCost || 0);
                 stock.research.isResearching = true;
                 stock.research.investmentPaused = false;
                 if((investment.initialCashCost || 0) > 0) logEvent(`💸 Bank ${stock.name} wznawia inwestycję "${investment.name}" kosztem ${(investment.initialCashCost || 0).toLocaleString()} PLN.`);
                 else logEvent(`▶️ Bank ${stock.name} wznawia inwestycję "${investment.name}".`);
             }
        }
    });
    // ---> KONIEC NOWEJ PĘTLI <---

    if (typeof processCityAndCitizenTaxes === 'function') {
        processCityAndCitizenTaxes();
    } else {
        console.error("Funkcja processCityAndCitizenTaxes nie została znaleziona!");
    }

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
        stocks.forEach(stock => {
        if (typeof updateCorporatePhase === 'function') {
            updateCorporatePhase(stock);
        }
    });
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
        if (Date.now() >= nextWealthTaxTime) {
         if (typeof processWealthTax === 'function') {
             processWealthTax();
         } else {
             console.error("Funkcja processWealthTax nie została znaleziona!");
         }
    }

    checkSanEscobarRisk();




    if (Math.random() < 0.3) {
        if (typeof triggerGovernmentSpendingEvent === 'function') {
            triggerGovernmentSpendingEvent();
        } else {
            console.error("Funkcja triggerGovernmentSpendingEvent nie została znaleziona!");
        }
    }

        updateCity(); // Aktualizacja miasta i start festynu
    }, BASE_DELAYS.quarterly * 4 / speedMultiplier); // Co rok
}

// Funkcja inicjalizująca grę
function initializeGame() {
    console.log("--- Funkcja initializeGame() została wywołana ---"); // Log startowy
    applyInitialTheme(); // Stosuje motyw (ciemny/jasny)

    // Wczytaj zapisany stan zwinięcia panelu startupów
    const savedStartupCollapseState = localStorage.getItem('startupPanelCollapsed');
    if (savedStartupCollapseState !== null) {
        if (typeof startupPanelCollapsed !== 'undefined') {
            startupPanelCollapsed = JSON.parse(savedStartupCollapseState);
        } else {
            // console.warn("Zmienna startupPanelCollapsed nie jest dostępna globalnie w main.js"); // Usunięty log diagnostyczny
        }
    }

    // Inicjalizacja banków komercyjnych (ta funkcja teraz ustawia isActive dla banków startowych)
    initializeCommercialBanks(); // Tworzy banki, może ustawić isActiveFromStart
    generateCentralBankGovernor();

    
    let activatedBankIds = []; // Tablica do śledzenia ID aktywowanych banków
    let activatedBanksCount = 0; // Licznik aktywowanych banków

    // --- Krok 1: Resetuj isActive dla wszystkich banków ---
    // Zapewnia, że nasza logika wyboru ma pierwszeństwo przed flagą isActiveFromStart
    commercialBanks.forEach(bank => bank.isActive = false);

    // --- Krok 2: Aktywuj JEDEN bank inwestycyjny ---
    const investmentBanks = commercialBanks.filter(b => b.type === BANK_TYPES.INVESTMENT);
    if (investmentBanks.length > 0) {
        const chosenInv = getRandomElement(investmentBanks);
        chosenInv.isActive = true;
        activatedBankIds.push(chosenInv.id);
        activatedBanksCount++;
        
    } else {
        console.warn("! Brak banków inwestycyjnych do aktywacji.");
    }

    // --- Krok 3: Aktywuj JEDEN bank korporacyjny (inny niż już aktywowany) ---
    const corporateBanks = commercialBanks.filter(b => b.type === BANK_TYPES.CORPORATE && !activatedBankIds.includes(b.id));
    if (corporateBanks.length > 0) {
        const chosenCorp = getRandomElement(corporateBanks);
        chosenCorp.isActive = true;
        activatedBankIds.push(chosenCorp.id);
        activatedBanksCount++;
        
    } else {
        console.warn("! Brak dostępnych *nieaktywowanych* banków korporacyjnych do aktywacji.");
    }

    // --- Krok 4: Aktywuj DWA inne, losowe banki (inne niż już aktywowane) ---
    const remainingInactiveBanks = commercialBanks.filter(b => !activatedBankIds.includes(b.id));
    const neededRandomBanks = 4 - activatedBanksCount; // Ile jeszcze brakuje do 4

    for (let i = 0; i < neededRandomBanks && remainingInactiveBanks.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * remainingInactiveBanks.length);
        const chosenOther = remainingInactiveBanks.splice(randomIndex, 1)[0]; // Wybierz i usuń z puli
        chosenOther.isActive = true;
        activatedBankIds.push(chosenOther.id);
        activatedBanksCount++;
        console.log(`- [Aktywacja OK] Losowy bank ${i + 1}: ${chosenOther.name} (ID: ${chosenOther.id}, Typ: ${chosenOther.type})`);
    }

    if (activatedBanksCount < 4) {
        console.warn(`! Nie udało się aktywować 4 banków, aktywnych jest tylko ${activatedBanksCount}. Sprawdź definicje banków.`);
    }

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
                    console.error('Błąd podczas generowania start-upu:', err); // Zachowany błąd
                }
            }
        } else {
            console.warn('generateNewStartup nie jest dostępna — pomijam tworzenie dodatkowych start-upów.'); // Zachowane ostrzeżenie
        }
    }

    // Inicjalizacja opisów R&D Instytutów
    let availableResearchDescriptions = [];
    if (typeof researchInstituteDescriptions !== 'undefined' && Array.isArray(researchInstituteDescriptions)) {
        availableResearchDescriptions = [...researchInstituteDescriptions];
    } else {
        console.warn("Zmienna researchInstituteDescriptions nie jest zdefiniowana lub nie jest tablicą."); // Zachowane ostrzeżenie
    }
    // (Pętla inicjalizująca opisy Instytutów - zakładam, że jest w innej części kodu lub była w usuniętym fragmencie)

    // --- Dodawanie aktywnych banków do giełdy ---
    console.log("[START GRY] Dodawanie aktywnych banków na giełdę...");
    let banksAddedToStocks = 0;
    commercialBanks.forEach(bank => {
        if (bank.isActive) { // Dodajemy tylko te, które TERAZ oznaczyliśmy jako aktywne
            let bankStock = stocks.find(s => s.isBankStock && s.bankData && s.bankData.id === bank.id);

            if (bankStock) {
                banksAddedToStocks++;
            } else if (typeof createBankStockObject === 'function') {
                bankStock = createBankStockObject(bank, 'SILVER');
                if (bankStock) {
                    const existingStockWithSymbol = stocks.find(s => s.symbol === bankStock.symbol);
                    if (!existingStockWithSymbol) {
                        stocks.push(bankStock);
                        banksAddedToStocks++;
                    } else {
                         if(existingStockWithSymbol.bankData && existingStockWithSymbol.bankData.id === bank.id) {
                            console.warn(`! Próbowano dodać bank ${bank.name} (${bankStock.symbol}), ale już istnieje w 'stocks'.`);
                        } else {
                             console.error(`!!! KRYTYCZNY BŁĄD: Wygenerowano zduplikowany symbol ${bankStock.symbol} dla różnych banków (${bank.name} vs ${existingStockWithSymbol.name})!`);
                        }
                    }
                } else {
                     console.error(`! createBankStockObject zwrócił null dla banku ${bank.name}`);
                }
            } else {
                console.error("! Funkcja createBankStockObject nie jest dostępna!");
            }
        }
    });
    console.log(`[initializeGame] Zakończono dodawanie banków. ${banksAddedToStocks} banków jest teraz w 'stocks'. Całkowita liczba banków w 'stocks': ${stocks.filter(s=>s.isBankStock).length}`);
    console.log("[initializeGame] Inicjalizacja startowych depozytów AI...");
    aiCompetitors.forEach(ai => {
        if (ai.initialDeposit && ai.initialDeposit > 0) {
            // Znajdź odpowiedni, aktywny bank dla depozytu (np. uniwersalny lub internetowy)
            const eligibleBanks = commercialBanks.filter(b =>
                b.isActive &&
                (b.type === BANK_TYPES.UNIVERSAL || b.type === BANK_TYPES.INTERNET || b.type === BANK_TYPES.COOPERATIVE) // Banki detaliczne
            );
            if (eligibleBanks.length > 0) {
                const chosenBank = getRandomElement(eligibleBanks);
                const depositAmount = ai.initialDeposit;

                // Sprawdź, czy bank ma tyle kapitału (na wszelki wypadek)
                // W tym przypadku AI wpłaca, więc bankowi przybywa, ale zachowajmy spójność
                if (ai.cash >= depositAmount) { // AI musi mieć środki na depozyt
                    ai.cash -= depositAmount; // Odejmij z gotówki AI
                    chosenBank.cash += depositAmount; // Dodaj do gotówki banku

                    // Zapisz depozyt w portfelu banku
                    if (!chosenBank.depositPortfolio[ai.id]) chosenBank.depositPortfolio[ai.id] = [];
                    chosenBank.depositPortfolio[ai.id].push({
                        id: `dep_init_${ai.id}_${Date.now()}`,
                        amount: depositAmount,
                        interestRate: chosenBank.interestRateDeposit // Użyj aktualnej stopy banku
                    });

                    // Opcjonalnie: Zapisz depozyt u AI (jeśli dodano pole ai.deposits)
                     if (ai.deposits) {
                         ai.deposits.push({
                            id: `dep_init_${ai.id}_${Date.now()}`,
                            bankId: chosenBank.id,
                            bankName: chosenBank.name,
                            amount: depositAmount,
                            interestRate: chosenBank.interestRateDeposit,
                            startDate: Date.now()
                         });
                     }
                    console.log(`- Bankier ${ai.name} umieścił startowy depozyt ${depositAmount} PLN w ${chosenBank.name}.`);
                } else {
                    console.warn(`! Bankier ${ai.name} nie miał wystarczająco gotówki (${ai.cash}) na startowy depozyt (${depositAmount}).`);
                }
            } else {
                console.warn(`! Nie znaleziono odpowiedniego banku dla startowego depozytu AI ${ai.name}.`);
            }
        }
    });

    // Przypisywanie kont bankowych spółkom
    console.log("[START GRY] Przypisywanie kont bankowych spółkom..."); // Log informacyjny
    const activeCorpAndUniBanks = commercialBanks.filter(b => b.isActive && (b.type === BANK_TYPES.CORPORATE || b.type === BANK_TYPES.UNIVERSAL));
    stocks.forEach(stock => {
        if (!stock.assetType && !stock.isBankStock && !stock.bankAccountId) {
            if (activeCorpAndUniBanks.length > 0) {
                const assignedBank = getRandomElement(activeCorpAndUniBanks);
                stock.bankAccountId = assignedBank.id;
                assignedBank.corporateClients.push(stock.symbol);
                if (stock.cash === undefined || stock.cash === 0) {
                     if (!stock.balanceSheet) {
                        initializeBalanceSheetForStock(stock);
                     }
                     if (stock.balanceSheet) {
                        const initialCash = stock.balanceSheet.assets * getRandomInRange(0.01, 0.05);
                        stock.cash = initialCash;
                        assignedBank.cash += initialCash;
                     } else {
                         console.warn(`! Nie można zainicjalizować gotówki dla ${stock.symbol}, brak bilansu.`); // Zachowane ostrzeżenie
                         stock.cash = 0;
                     }
                } else {
                    assignedBank.cash += stock.cash;
                }
            } else {
                console.warn(`! Brak aktywnych banków korporacyjnych/uniwersalnych do przypisania konta dla ${stock.symbol}`); // Zachowane ostrzeżenie
                stock.cash = 0;
            }
        }
    });

    // Końcowa inicjalizacja danych dla wszystkich spółek w 'stocks'
    console.log("[initializeGame] Końcowa inicjalizacja bilansów, CEO, R&D itp. dla wszystkich spółek w 'stocks'..."); // Log informacyjny
    stocks.forEach(stock => {
        if (!stock.balanceSheet && !stock.assetType) {
             initializeBalanceSheetForStock(stock);
        }
        if (stock.cash === undefined) {
             stock.cash = stock.balanceSheet ? stock.balanceSheet.assets * getRandomInRange(0.01, 0.05) : 0;
        }
        if (!stock.ceo && !stock.assetType) generateCEO(stock);
        if (!stock.descriptionParts && !stock.description && !stock.assetType) initializeDescriptionParts(stock);
        if (!stock.analytical && !stock.assetType) initializeAnalyticalProperties(stock);
        if (!stock.research && !stock.assetType) initializeResearchForStock(stock);
        if (stock.playerHasFinancialAccess === undefined) stock.playerHasFinancialAccess = false;
    });

    // Inicjalizacja systemów globalnych
    initializeReputation();
    initializeHoldingPortfolios();
    assignInitialDividendPolicies();
    if (typeof initializeDividendEstimates === 'function') {
        initializeDividendEstimates();
    } else {
        console.warn('initializeDividendEstimates nie jest dostępna — pomijam inicjalizację estymat dywidend.'); // Zachowane ostrzeżenie
    }

    // Ustawienie UI
    const startupPanel = document.getElementById('startup-incubator-panel');
    const startupIcon = document.getElementById('toggle-icon-startup');
    if (startupPanel && startupIcon) {
        let isCollapsed = false;
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

    console.log("[initializeGame] Końcowa inicjalizacja UI..."); // Log informacyjny
    setupAutoInvestModal();
    displayCash();
    displayPortfolio();
    displayXP();
    displayMarketIndexes();
    updateWorkButtonVisibility();
    updateDividendTrackerButtonVisibility();

    const pauseButton = document.getElementById('pause-game-btn');
    if (isGamePaused && pauseButton) {
        pauseButton.textContent = '▶️ Wznów';
        pauseButton.style.backgroundColor = '#28a745';
    }

    updateInterestRates();

    // Wyświetlenie początkowego stanu rynku
    displayStocks();
    displayStartups();
    displayEtfs();

   if (typeof initializeGameTimeRelatedVariables === 'function') {
        initializeGameTimeRelatedVariables();
    } else {
        console.error("Funkcja initializeGameTimeRelatedVariables nie została znaleziona w gameLogic.js!");
         // Awaryjne ustawienie, jeśli funkcja nie istnieje
        if(typeof BASE_DELAYS !== 'undefined' && typeof BASE_DELAYS.quarterly !== 'undefined') {
             WEALTH_TAX_INTERVAL = BASE_DELAYS.quarterly * 4; // Zdefiniuj WEALTH_TAX_INTERVAL globalnie (mniej idealne)
             nextWealthTaxTime = Date.now() + WEALTH_TAX_INTERVAL;
        } else {
            console.error("BASE_DELAYS lub BASE_DELAYS.quarterly nie jest zdefiniowane!");
        }
    }

    if (playerCompany && typeof hireEmployee === 'function') {
        hireEmployee('initial');
    }

    // Uruchomienie pętli gry
    setGameSpeed(1);

    scheduleAdPopup();
}

// Uruchom grę po załadowaniu strony (z bazy main.js - zawiera zależność od banków komercyjnych)
window.addEventListener('load', () => {
    console.log('[loader] Zdarzenie "load" strony wystąpiło. Uruchamiam initializeGame().');
    try {
        // Podstawowe sprawdzenie, czy kluczowe funkcje z innych plików istnieją
        if (typeof initializeCommercialBanks !== 'function' ||
            typeof generateNewStartup !== 'function' ||
            typeof assembleDescription !== 'function' ||
            typeof createBankStockObject !== 'function') { // Sprawdzenie nowej funkcji
            console.error('[loader] Krytyczne funkcje z innych plików nie są dostępne! Sprawdź kolejność i zawartość skryptów w HTML.');
            alert("Błąd ładowania gry! Niezbędne funkcje nie zostały znalezione. Sprawdź konsolę deweloperską (F12).");
            return; // Nie kontynuuj, jeśli brakuje podstaw
        }

        // Sprawdzenie istnienia kluczowych stałych z gameLogic.js
        // Upewnij się, że BASE_DELAYS jest zdefiniowane w gameLogic.js
        if (typeof BANK_TYPES === 'undefined' ||
            typeof ALL_COMMERCIAL_BANKS_DEFINITIONS === 'undefined' ||
            typeof BASE_DELAYS === 'undefined') {
             console.error('[loader] Krytyczne stałe z gameLogic.js nie są dostępne! Sprawdź definicje na początku gameLogic.js.');
             alert("Błąd ładowania gry! Niezbędne stałe nie zostały znalezione. Sprawdź konsolę deweloperską (F12).");
             return;
        }


        initializeGame(); // Wywołaj inicjalizację bezpośrednio

    } catch (e) {
        console.error('[loader] Błąd podczas wywoływania initializeGame():', e);
        alert("Wystąpił krytyczny błąd podczas inicjalizacji gry. Sprawdź konsolę deweloperską (F12).");
    }
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

