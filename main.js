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
    bondMaturityCheck: null,  // Z bazy main.js
    autoSave: null
};

// Zmienna przechowująca aktualną prędkość gry
let currentSpeedMultiplier = 1;
let uiRefreshTick = 0;

// Zapis i wczytanie gry: save.js

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
    const activeBtn = document.querySelector(`.speed-btn[data-speed="${speedMultiplier}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    console.log(`Ustawiono prędkość gry na x${speedMultiplier}`);

    // --- URUCHOMIENIE NOWYCH PĘTLI Z NOWĄ PRĘDKOŚCIĄ ---

    // Pętla sprawdzania niespłaconych hipotek (z bazy main.js)
    gameTimers.mortgageCheck = setInterval(() => {
        if (isGamePaused) return;
        checkMortgageDefaults();
    }, BASE_DELAYS.weekly / speedMultiplier); // Sprawdzaj co tydzień

    gameTimers.autoSave = setInterval(() => {
        if (typeof saveGameState === 'function') {
            saveGameState();
        }
    }, 60000 / speedMultiplier);

    // Pętla sprawdzania zapadalności bonów skarbowych
    gameTimers.tBillMaturityCheck = setInterval(() => {
        if (isGamePaused) return;
        checkTBillMaturities();
    }, 5000 / speedMultiplier);

    // Główna pętla gry (aktualizacje co sekundę czasu gry)
    gameTimers.stockUpdate = setInterval(() => {

        document.querySelectorAll('#stock-table-body tr').forEach(row => {
    const symbol = row.dataset.symbol;
    if (!symbol) return;
    
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock && stock.mergerProcess) {
        // Złap pasek postępu i jego etykietę wewnątrz tego wiersza
        const progressBar = row.querySelector('progress');
        const statusTexts = row.querySelectorAll('span'); 
        
        if (progressBar) {
            progressBar.value = stock.mergerProcess.progress;
            
            // Aktualizacja kolorów w zależności od statusu
            if (stock.mergerProcess.decisionRequired) {
                progressBar.classList.add('decision');
            } else if (stock.mergerProcess.complications > 0) {
                progressBar.classList.add('complication');
                progressBar.classList.remove('decision');
            } else {
                progressBar.classList.remove('decision', 'complication');
            }
        }
        
        // Zaktualizuj tekst z aktualnym etapem (znajdujemy właściwy span po dopasowaniu tekstu)
        statusTexts.forEach(span => {
            if (span.textContent.includes('Etap:')) {
                span.textContent = `Etap: ${stock.mergerProcess.stage}/7`;
            }
        });
    }
});


        if (isGamePaused) {
            return; // Jeśli gra jest zapauzowana, nie wykonuj żadnych akcji
        }

        stocks.forEach(stock => {
            if (stock.prShieldExpiry && Date.now() > stock.prShieldExpiry) {
                stock.prShieldExpiry = null;
                logEvent(`🛡️ Tarcza PR dla ${stock.name} wygasła.`, 'company');
            }
        });

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
        updateStockPrices();
        updateMarketIndexes(); // GIG/TIG5/SIG20 — benchmark funduszu (wcześniej nigdy nie był liczony)
        updateHoldingCompanies();
        if (FEATURE_FLAGS.startups) {
            updateStartups(gameTimeDelta);
            updateInvestmentPoolTimer(gameTimeDelta);
            updateAutoInvestTimer(gameTimeDelta);
            updateStartupAutoInvestTimers(gameTimeDelta);
        }
        checkTBillAccess();
        updateMarketVolatilityIndex();
        updateDividendTimers(gameTimeDelta);
        updateFund(gameTimeDelta); // NAV, obsunięcie, zamykanie okresów funduszu
        updateFestival(gameTimeDelta); // Aktualizacja festynu (czas gry)
        updateFestivalCountdown(gameTimeDelta); // Odliczanie do festynu
        applyActiveModifiers(); // Aplikowanie rocznych bonusów
        if (currentTBillAuction && Date.now() > currentTBillAuction.endTime) {
            resolveTBillAuction(); // Rozstrzygnij aukcję
        }
        processCeoActions(gameTimeDelta);
        runAllAi(); // Zawiera AI banków z bazy main.js
        checkPriceAlerts();
        checkResearchChoiceTimers(gameTimeDelta);
        updateResearchAutoRetry(gameTimeDelta);
        updateResearchProgress(gameTimeDelta);
        processConstructionProjects(gameTimeDelta);
        updateTenderSystem(gameTimeDelta); // zawiera też oferty AI
        updateConstructionSectorUI();

        // Przy prędkościach debug (×10, ×50) odświeżamy interfejs rzadziej — logika gry liczy się co tik.
        uiRefreshTick++;
        if (speedMultiplier >= 10 && uiRefreshTick % Math.round(speedMultiplier / 5) !== 0) return;

        // --- ODŚWIEŻANIE INTERFEJSU ---
        displayStocks(currentMarketInputs);
        displayStartups(currentStartupInputs);
        displayEtfs();
        displayPortfolio();
        displayFundPanel();
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

        // Odświeżanie otwartych modali
        if (document.getElementById('leaderboard-modal').style.display === 'block') {
            displayLeaderboard();
        }
        updateResearchChoiceTimerUI();
        if (document.getElementById('management-modal').style.display === 'block') {
            const symbol = document.getElementById('management-modal').dataset.currentSymbol;
            if (symbol) {
                const stock = stocks.find(s => s.symbol === symbol);
                if (stock && stock.research && stock.research.isResearching && stock.research.currentTech) {
                    const tech = technologies[stock.research.currentTech];
                    const progressPercent = (stock.research.progress / tech.cost) * 100;
                    document.getElementById('rd-progress-bar').value = progressPercent;
                }
                // Dynamiczna aktualizacja pasków postępu budów zamówionych przez spółkę
                const deptContent = document.getElementById('mgmt-content-depts');
                if (stock && deptContent && deptContent.style.display !== 'none') {
                    deptContent.querySelectorAll('progress[data-order-ref]').forEach(bar => {
                        const project = constructionProjects.find(item => item.id === bar.dataset.orderRef);
                        if (project) bar.value = project.progress;
                    });
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

        // ===>>> NOWE WYWOŁANIE SKANERA WINDYKATORA <<<===
        if (typeof runDebtCollectorAI === 'function') {
            runDebtCollectorAI(); //
        }
        // ===>>> NOWE WYWOŁANIE SKANERA LOMBARDU <<<===
        if (typeof runPawnShopAI === 'function') {
            runPawnShopAI(); //
        }

        if (typeof runCorporateLogic === 'function') {
        runCorporateLogic(); // Obsługa działów i inwestycji
    }

        processCompanyBanking(); //
        processBankStartupSponsorship(); //


        if (typeof recordWeeklyCloses === 'function') recordWeeklyCloses(); // U2: zmiana tygodniowa w tabeli spółek
        if (typeof checkAcademyTriggers === 'function') checkAcademyTriggers(); // N1: hasła Akademii przy pierwszym kontakcie
        if (typeof checkMentorTasks === 'function') checkMentorTasks(); // N4: zadania mentora i certyfikaty

        // Fundusz gracza: opłata za zarządzanie, zaufanie, decyzje klientów
        processFundWeekly();
        processFundPawnLoansWeekly(); // zastawy funduszy w lombardzie (finance.js)
        processFundDepositsWeekly(); // lokaty terminowe funduszu (finance.js)
        maintainStartupCount(); // inkubator: nowe startupy w czasie gry (startups.js)
        processPppWeekly(); // projekty miejskie PPP (city.js)
        processBridgeLoansWeekly(); // finansowanie pomostowe budów (finance.js)
        aiCompetitors.forEach(processAiLoansWeekly); // raty i odsetki kredytów botów raz na tydzień
        processMailWeekly();          // prenumeraty, spam, plotki (mail.js)
        processPrivatizationWeekly(); // zapisy na akcje w prywatyzacji (city.js)



        // Utrzymanie standardowego R&D oraz wznowienia inwestycji bankowych (osobne systemy).
        stocks.forEach(stock => {
            if (stock.isBankStock) {
                processBankInvestmentResume(stock);
            } else if (!stock.assetType && stock.research) {
                processResearchMaintenanceAndPause(stock);
            }
        });
        
        // Podatki miejskie (bez zmian)
        if (typeof processCityAndCitizenTaxes === 'function') { //
            processCityAndCitizenTaxes(); //
        }

        // Zamówienia budowlane AI powstają w runCorporateLogic (jedna ścieżka inwestycji),
        // a oferty wykonawców w updateTenderSystem (pętla główna). Konsorcja są wyłączone.

        // Przetwarzanie dochodów z nieruchomości
        if (typeof processBuildingIncome === 'function') {
            processBuildingIncome();
        }

        if (playerCash > 0) displayCash(); //

    }, BASE_DELAYS.weekly / speedMultiplier);

    // Pętla kwartalna (z bazy main.js - zawiera AI Banku Centralnego)
    gameTimers.quarterly = setInterval(() => {
        if (isGamePaused) return;
        reviewCompanyPlacements();
        processEliteExchangesQuarterly(); // Rubin / Szmaragd / Diament, spółki zależne (finance.js)
        payBondCoupons(); // kupony kwartalne (finance.js)
        processPublicInvestmentFunding(); // BC → spółki państwowe, miasto → spółki miejskie (investments.js)
        processGovernanceQuarter(); // walne zgromadzenia (governance.js)
        processEtfsQuarterly(); // rebalancing, cele roczne, nowe i zamykane ETF-y (etf.js)
        processRelationsQuarterly(); // relacje z botami: wrogowie i przyjaciele (relations.js)
        processMarketsQuarterly(); // operatorzy rynków i maklerzy (markets.js)
        processSpecialProjectsQuarterly(); // konsorcja i projekty specjalne (projects.js)
        reconcileSharesHeld(); // audyt A1: akcje w obrocie = suma posiadaczy
        processOversightQuarterly(); // korupcja, policja, KNF (oversight.js)
        processMafiaQuarterly(); // mafia, Bruno Gato, porachunki (mafia.js)
        processScandalsQuarterly(); // parabanki i wojny PR (scandals.js)
        processDefenseQuarterly(); // zbrojeniówka i fundusz Gwardia (defense.js)
        if (typeof processAccountingQuarterly === 'function') processAccountingQuarterly(); // N3: kreatywna księgowość, audyty (accounting.js)
        advanceEconomyCycle(); // nowa faza koniunktury przed raportami
        advanceMacroQuarter(); // inflacja, bezrobocie, cykle sektorów, wybory (macro.js)
        processCityQuarterly(); // festyn raz w roku (city.js)
        processFinancialReports(); // zawiera koszty R&D, wynik kontraktów, pozycje okresu i dywidendy
        updateInfluence();
        updateCeoTenureAndAge(); // Zmieniona nazwa, ale to samo
        updateAnalyticalProperties();
        runCentralBankAI(); // posiedzenie BC, gazeta, rezerwy, dotacje (macro.js)
        aiCompetitors.forEach(ai => {
            // Sprawdź, czy to "prawdziwy" bot (nie market maker) i czy funkcja istnieje
            if (ai.skillPoints !== undefined && typeof aiUseMediaInfluence === 'function') { 
                aiUseMediaInfluence(ai);
            }
        });
        stocks.forEach(stock => {
            if (typeof updateCorporatePhase === 'function') {
                updateCorporatePhase(stock);
            }
            // ===>>> AKTUALIZACJA PROCESÓW M&A (JEŚLI TRWAJĄ) <<<===
            if (stock.mergerProcess && typeof advanceMergerProcess === 'function') {
                advanceMergerProcess(stock);
            }
        });
        if (typeof updateInfluence === 'function') {
             updateInfluence();
        }
        
        // ===>>> SPRAWDZENIE NOWYCH M&A PRZEZ AI <<<===
        if (typeof checkForPotentialMA === 'function') {
            checkForPotentialMA();
        }
        
        // ===>>> SPRAWDZENIE STATUSU MONOPOLISTY <<<===
        if (typeof checkMonopolyStatus === 'function') {
             checkMonopolyStatus();
        }

        if (typeof runPrivateCompanyLogic === 'function') {
            runPrivateCompanyLogic(); // Logika rozwoju firm prywatnych
        }

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
        checkBondMaturities(5000); // 5 s czasu gry
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

    if (typeof aiUpgradeAntitrustOffice === 'function') {
            aiUpgradeAntitrustOffice(); // Państwo (AI) decyduje o ulepszeniu urzędu
        }


    if (Math.random() < 0.3) {
        if (typeof triggerGovernmentSpendingEvent === 'function') {
            triggerGovernmentSpendingEvent();
        } else {
            console.error("Funkcja triggerGovernmentSpendingEvent nie została znaleziona!");
        }
    }

        processCityYearly(); // gospodarka miasta, polityka burmistrza, spółki miejskie, kampania i wybory (city.js)
    }, BASE_DELAYS.quarterly * 4 / speedMultiplier); // Co rok
}

// Funkcja inicjalizująca grę
function initializeGame() {
    console.log("--- Funkcja initializeGame() została wywołana ---"); // Log startowy
    if (typeof applyInitialTheme === 'function') {
        applyInitialTheme(); // Stosuje motyw (ciemny/jasny)
    } else {
        console.warn("applyInitialTheme not available, skipping theme application");
    }

    // Wczytaj zapisany stan zwinięcia panelu startupów
    const savedStartupCollapseState = localStorage.getItem('startupPanelCollapsed');
    if (savedStartupCollapseState !== null) {
        if (typeof startupPanelCollapsed !== 'undefined') {
            startupPanelCollapsed = JSON.parse(savedStartupCollapseState);
        } else {
            // console.warn("Zmienna startupPanelCollapsed nie jest dostępna globalnie w main.js"); // Usunięty log diagnostyczny
        }
    }

    // Wczytanie zapisu (save.js). Przy udanym wczytaniu NIE tworzymy nowego świata,
    // więc nie ma ponownej inicjalizacji, kasowania postępu ani kosztów startowych.
    const restoredFromSave = typeof restoreSavedGame === 'function' ? restoreSavedGame() : false;

    if (!restoredFromSave) {
        createNewWorld();
        // Fundusz startowy z domyślnym profilem; scenka startowa uzupełnia imię i nazwy.
        startNewCareer({});
    }

    // Mechaniki wyłączone w etapie B: ukrycie ich paneli.
    if (!FEATURE_FLAGS.startups) {
        const incubator = document.getElementById('startup-incubator-panel');
        if (incubator) incubator.style.display = 'none';
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
    if (typeof setupAutoInvestModal === 'function') {
        setupAutoInvestModal();
    } else {
        console.warn('[initializeGame] setupAutoInvestModal nie jest dostępna.');
    }

     if (typeof setupAutoInvestModal === 'function') setupAutoInvestModal();
    if (typeof displayCash === 'function') displayCash();
    if (typeof displayPortfolio === 'function') displayPortfolio();
    if (typeof displayXP === 'function') displayXP();
    if (typeof displayMarketIndexes === 'function') displayMarketIndexes();
    if (typeof updateDividendTrackerButtonVisibility === 'function') updateDividendTrackerButtonVisibility();

    const pauseButton = document.getElementById('pause-game-btn');
    if (isGamePaused && pauseButton) {
        pauseButton.textContent = '▶️ Wznów';
        pauseButton.classList.add('is-paused');
    }

    updateInterestRates();

    // Wyświetlenie początkowego stanu rynku
    displayStocks();
    displayStartups();
    displayEtfs();

   if (restoredFromSave) {
        // Liczniki czasu zostały odtworzone z zapisu.
    } else if (typeof initializeGameTimeRelatedVariables === 'function') {
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

    if (!restoredFromSave && typeof showIntroScene === 'function') {
        showIntroScene(); // SMS od babci + profil gracza (gra stoi na pauzie)
    }

    // Uruchomienie pętli gry — jedyne miejsce tworzenia timerów (setGameSpeed czyści poprzednie
    // — nie tworzymy ich nigdzie indziej).
    setGameSpeed(restoredFromSave ? currentSpeedMultiplier : 1);
    if (typeof localStorage !== 'undefined') {
        window.addEventListener('beforeunload', saveGameState);
    }
}

/** Tworzy nowy świat gry (banki, spółki budowlane, startupy, bilanse, R&D...). */
function createNewWorld() {
    // Inicjalizacja banków komercyjnych (ta funkcja teraz ustawia isActive dla banków startowych)
    initializeCommercialBanks(); // Tworzy banki, może ustawić isActiveFromStart
    generateCentralBankGovernor();
    initializeConstructionCompanies();
    initializeAllConstructionStats(); // Inicjalizuje maxProjects i currentProjects dla spółek budowlanych
    
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
    console.log("[START GRY] Przypisywanie kont bankowych spółkom...");
    stocks.forEach(stock => {
        // Używamy funkcji z companies.js
        if (typeof assignBankToCompany === 'function') {
            assignBankToCompany(stock);
        }
        
        // ZMIANA: Inicjalizacja działów dla WSZYSTKICH odpowiednich spółek na starcie
        if (typeof initializeDepartments === 'function') {
            initializeDepartments(stock);
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
        if (!stock.assetType && !stock.isBankStock) { // Tylko dla zwykłych spółek
            stock.influence = {
                exerted: {}, 
                received: {}, 
                totalReceived: 0 
            };
        } else {
            stock.influence = null; 
        }
    });

    // Koniunktura startowa, fundamenty spółek (kalibracja przychodów do obecnych wycen)
    // i struktura własności (pakiety insiderów).
    economyCycle = createEconomyCycle(getRandomElement(['recovery', 'expansion']));
    macro = createMacroState(); // wskaźniki makro, cykle sektorów, wybory (macro.js)
    botRelations = createBotRelations(); // relacje z botami (relations.js)
    oversight = createOversight(); // korupcja i nadzór (oversight.js)
    mafia = createMafia(); // mafia (mafia.js)
    scandals = createScandals(); // afery (scandals.js)
    updateMarketTrendFromCycle();
    stocks.forEach(stock => {
        if (stock.balanceSheet && stock.assetType !== 'Startup') initializeFundamentals(stock, true);
        initializeOwnership(stock);
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
    initializeCityCompanies();
    initCityModel();
    // Holdingi bez ceny startowej (wyliczanej z NAV dopiero przy pierwszym ticku) dostają cenę = NAV.
    stocks.filter(stock => stock.assetType === 'Holding' && !(stock.price > 0)).forEach(stock => { stock.price = Math.max(0.01, getExternalFundValue(stock)); });
    assignEliteExchanges(); // giełdy Rubinowa i Szmaragdowa od startu (Diamentowa po 30 min gry)
    maintainStartupCount(); // inkubator startuje z kilkoma startupami
    initMarketOperators(); // GPW i przyszli operatorzy rynków (markets.js)
    initDefenseSector(); // spółki zbrojeniowe i fundusz Gwardia (defense.js)
    specialProjects = createSpecialProjects(); // projekty specjalne miasta (projects.js)
    initializeEtfs(); // ETF-y z portfelami prawdziwych akcji (etf.js)
    console.log("[M&A Init] Inicjalizacja nastawienia mediów...");
    const mediaCompanies = stocks.filter(s => s.specializationSectors?.includes('Media'));
    if (mediaCompanies.length >= 2) {
        const shuffledMedia = mediaCompanies.sort(() => 0.5 - Math.random());
        shuffledMedia[0].stance = 'pro-player';
        shuffledMedia[1].stance = 'anti-player';
        console.log(`[M&A Init] Gazeta PRO-gracz: ${shuffledMedia[0].symbol}, Gazeta ANTI-gracz: ${shuffledMedia[1].symbol}`);
    }
}

// Uruchom grę po załadowaniu strony (z bazy main.js - zawiera zależność od banków komercyjnych)
// W trybie testów (tests/tests.html) gra nie startuje automatycznie.
if (typeof window !== 'undefined' && !window.__GAME_TEST_MODE__) window.addEventListener('load', () => {
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
        if (ai.isMafia || ai.isGuard) return; // Bruno Gato (mafia.js) i Gwardia (defense.js) mają własną logikę
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


