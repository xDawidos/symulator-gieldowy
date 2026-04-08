// ui.js (Połączony)
// Funkcje odpowiedzialne za aktualizację i wyświetlanie interfejsu użytkownika

let startupPanelCollapsed = false; // <<< DODANE Z ui2.js

function getCurrentInputValues() {
    const values = {};
    stocks.forEach(stock => {
        const inputElement = document.getElementById(`quantity-${stock.symbol}`);
        if (inputElement) {
            values[stock.symbol] = inputElement.value;
        }
    });
    return values;
}

function displayCash() {
    const cashElement = document.getElementById('cash');
    if (cashElement) {
        cashElement.textContent = playerCash.toFixed(2);
    }
}



function displayStocks(previousInputValues = {}) {
    const stockTableBody = document.getElementById('stock-table-body');
    if (!stockTableBody) return;

    // Aktualizacja nagłówka ceny (strzałki sortowania)
    const priceHeader = document.getElementById('price-header-cell');
    if (priceHeader) {
        let headerText = 'Cena (PLN)';
        if (currentSortState === 'price_asc') headerText += ' ▲';
        else if (currentSortState === 'price_desc') headerText += ' ▼';
        priceHeader.innerHTML = headerText;
    }

    const selectedSector = document.getElementById('sector-filter').value;
    
    // Filtrowanie spółek do wyświetlenia
    let baseStocksToDisplay;
    if (selectedSector === 'all') {
        baseStocksToDisplay = stocks.filter(stock => !stock.isSubsidiaryOf);
    } else if (selectedSector === 'REIT') {
        baseStocksToDisplay = stocks.filter(stock => stock.assetType === 'REIT' && !stock.isSubsidiaryOf);
    } else {
        baseStocksToDisplay = stocks.filter(stock => Array.isArray(stock.sector) && stock.sector.includes(selectedSector) && !stock.isSubsidiaryOf);
    }

    stockTableBody.innerHTML = '';
    const sortedExchanges = Object.keys(exchanges).sort((a, b) => exchanges[a].level - exchanges[b].level);
    const hasAnalystSkill = getSkillLevel('financialAnalyst') > 0; // Używamy helpera

    // --- Funkcja pomocnicza do renderowania wiersza ---
    const renderStockRow = (stock, isSubsidiary = false, parentSymbol = null) => {
        // ===>>> TU BYŁ BŁĄD: Definiujemy hasAccess na początku <<<===
        const exchangeData = exchanges[stock.exchange];
        const hasAccess = exchangeData ? exchangeData.level <= playerAccessLevel : false;
        const isLocked = stock.isTradeLocked;
        // ==========================================================

        const row = stockTableBody.insertRow();
        row.dataset.symbol = stock.symbol;

        // --- Style wiersza ---
        if (stock.isBankrupt) {
            row.style.backgroundColor = '#ffe6e6';
            row.style.border = '2px solid red';
            row.style.textDecoration = 'line-through';
            row.title = 'BANKRUCTWO!';
            row.querySelectorAll('input, button').forEach(el => el.disabled = true);
        } else if (isLocked) {
            row.style.backgroundColor = '#e9ecef';
            row.style.color = '#6c757d';
            row.title = 'HANDEL WSTRZYMANY';
        } else if (stock.financialHealth === -4) {
            row.style.backgroundColor = '#fff3cd';
            row.title = 'UWAGA: Spółka jest na krawędzi bankructwa!';
        }

        if (isSubsidiary) {
            row.classList.add('subsidiary-row');
            if (parentSymbol) row.classList.add(`subsidiary-of-${parentSymbol}`);
            row.style.display = 'none';
        }
        row.className += ` exchange-group-${stock.exchange}`;

        const sharesOwned = playerPortfolio[stock.symbol] ? playerPortfolio[stock.symbol].shares : 0;
        const playerSharePct = stock.totalShares > 0 ? (sharesOwned / stock.totalShares) * 100 : 0;

        // Komórka 1: Nazwa
        const nameCell = row.insertCell();
        const nameWrapper = document.createElement('div');
        nameWrapper.style.display = 'flex';
        nameWrapper.style.alignItems = 'center';
        if (isSubsidiary) nameWrapper.style.paddingLeft = '25px';

        if (stock.subsidiaries && stock.subsidiaries.length > 0) {
            const toggleBtn = document.createElement('span');
            toggleBtn.textContent = stock.isSubsidiaryExpanded ? '▼ ' : '▶ ';
            toggleBtn.style.cursor = 'pointer';
            toggleBtn.style.marginRight = '5px';
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                toggleSubsidiaryVisibility(stock.symbol);
            };
            toggleBtn.classList.add('subsidiary-toggle');
            nameWrapper.appendChild(toggleBtn);
        }

        let stockNameContent = '';
        if (playerSharePct > 50) stockNameContent += '👑 ';
        if (stock.assetType === 'ResearchInstitute') stockNameContent += '🧪 ';
        if (stock.isMonopolist) stockNameContent += '🦁 '; // Ikona monopolisty

        if (stock.isStateOwned) {
            stockNameContent += `🏛️ ${stock.name}`;
            nameCell.title = 'Spółka Skarbu Państwa';
        } else {
            stockNameContent += stock.name;
        }

        const nameSpan = document.createElement('span');
        nameSpan.innerHTML = stockNameContent;
        if (sharesOwned > 0) nameSpan.style.fontWeight = 'bold';

        const infoButton = document.createElement('button');
        infoButton.textContent = 'i';
        infoButton.className = 'info-btn';
        infoButton.onclick = () => openDescriptionModal(stock.symbol);

        nameWrapper.appendChild(nameSpan);
        nameWrapper.appendChild(infoButton);

        // Pasek M&A
        if (stock.mergerProcess) {
            const process = stock.mergerProcess;
            const mergerStatusContainer = document.createElement('div');
            mergerStatusContainer.style.marginLeft = '10px';
            mergerStatusContainer.style.width = '70px';
            mergerStatusContainer.title = `Proces M&A: ${process.statusMessage}`;

            const statusText = document.createElement('span');
            statusText.textContent = `Etap: ${process.stage}/7`;
            statusText.style.fontSize = '10px';
            statusText.style.display = 'block';

            const progressBar = document.createElement('progress');
            progressBar.value = process.progress;
            progressBar.max = 100;
            progressBar.style.width = '100%';
            
            if (process.decisionRequired) progressBar.classList.add('decision');
            else if (process.complications > 0) progressBar.classList.add('complication');

            mergerStatusContainer.appendChild(statusText);
            mergerStatusContainer.appendChild(progressBar);
            nameWrapper.appendChild(mergerStatusContainer);
        }

        nameCell.appendChild(nameWrapper);

        // Komórka 2: Cena + faza cyklu
        const priceCell = row.insertCell();
        priceCell.textContent = stock.price.toFixed(2);
        if (stock.corporatePhase) {
            const phaseBadge = document.createElement('span');
            phaseBadge.style.cssText = 'font-size:10px;margin-left:4px;padding:1px 4px;border-radius:3px;';
            const phaseColors = {
                'Wzrost': '#28a745', 'Stabilność': '#6c757d', 'Spadek': '#dc3545',
                'Reorganizacja': '#ffc107', 'Złoty Rok ✨': '#ffd700',
                'Zejście w Cień 👻': '#6f42c1', 'Impuls Innowacji 💡': '#17a2b8'
            };
            const col = phaseColors[stock.corporatePhase] || '#6c757d';
            phaseBadge.style.color = col;
            phaseBadge.style.border = '1px solid ' + col;
            phaseBadge.textContent = stock.corporatePhase;
            phaseBadge.title = 'Faza cyklu spółki';
            priceCell.appendChild(phaseBadge);
        }

        // Komórka 3: Dostępne
        let availableShares;
        const treasuryShares = stock.treasuryShares || 0;
        if (stock.isStateOwned) {
            const publicFloat = Math.floor(stock.totalShares * (1 - stock.stateOwnershipPct));
            availableShares = publicFloat - stock.sharesHeld - treasuryShares;
        } else {
            availableShares = stock.totalShares - stock.sharesHeld - treasuryShares;
        }
        row.insertCell().textContent = Math.max(0, Math.floor(availableShares)).toLocaleString('pl-PL');

        // Komórka 4: Posiadane
        row.insertCell().textContent = sharesOwned.toLocaleString('pl-PL');

        // Komórka 5: Akcje (Input + Przyciski)
        const actionsCell = row.insertCell();
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.min = '1';
        quantityInput.value = previousInputValues[stock.symbol] !== undefined ? previousInputValues[stock.symbol] : '1';
        quantityInput.style.width = '50px';
        quantityInput.id = `quantity-${stock.symbol}`;
        
        // Logika blokowania
        const isDisabled = !hasAccess || isLocked || stock.isBeingMerged || stock.canBeTraded === false;
        quantityInput.disabled = isDisabled;
        actionsCell.appendChild(quantityInput);

        // Przycisk Kup
        const buyButton = document.createElement('button');
        buyButton.textContent = hasAccess ? 'Kup' : '🔒';
        buyButton.disabled = isDisabled;
        if (hasAccess && isLocked) buyButton.textContent = '⛔';
        
        if (!isDisabled) {
            buyButton.onclick = () => {
                const quantity = parseInt(quantityInput.value, 10);
                if (!isNaN(quantity) && quantity > 0) buyStock(stock.symbol, quantity);
            };
        }
        actionsCell.appendChild(buyButton);

        // Przycisk Sprzedaj
        const sellButton = document.createElement('button');
        sellButton.textContent = 'Sprzedaj';
        sellButton.disabled = isDisabled || sharesOwned === 0;
        if (isLocked) sellButton.textContent = '⛔';

        if (!isDisabled) {
            sellButton.onclick = () => {
                const quantity = parseInt(quantityInput.value, 10);
                if (!isNaN(quantity) && quantity > 0) sellStock(stock.symbol, quantity);
            };
        }
        actionsCell.appendChild(sellButton);

        // Przycisk Sprzedaj MAX
        const sellAllButton = document.createElement('button');
        sellAllButton.textContent = 'MAX';
        sellAllButton.title = "Sprzedaj wszystko";
        sellAllButton.style.marginLeft = '2px';
        sellAllButton.disabled = isDisabled || sharesOwned === 0;

        if (!isDisabled) {
            sellAllButton.onclick = () => {
                if (confirm(`Czy na pewno chcesz sprzedać wszystkie akcje ${stock.name}?`)) {
                    sellAllShares(stock.symbol);
                }
            };
        }
        actionsCell.appendChild(sellAllButton);

        // Przycisk Wykres
        const historyButton = document.createElement('button');
        historyButton.textContent = '📈';
        historyButton.title = 'Wykres';
        historyButton.style.marginLeft = '5px';
        historyButton.disabled = !hasAccess;
        historyButton.onclick = () => showPriceHistoryModal(stock.symbol);
        actionsCell.appendChild(historyButton);

        // Przycisk Akcjonariat
        const detailsButton = document.createElement('button');
        detailsButton.textContent = '📊';
        detailsButton.title = "Akcjonariat";
        detailsButton.style.marginLeft = '2px';
        detailsButton.disabled = !hasAccess;
        detailsButton.onclick = () => openStockDetailsModal(stock.symbol);
        actionsCell.appendChild(detailsButton);

        // Przycisk Zarządzaj
        if (playerSharePct > 50) {
            const manageButton = document.createElement('button');
            manageButton.textContent = '👑';
            manageButton.title = 'Panel Zarządzania';
            manageButton.style.marginLeft = '5px';
            manageButton.style.border = '1px solid #007bff';
            manageButton.onclick = () => openManagementModal(stock.symbol);
            actionsCell.appendChild(manageButton);
        }

        // Komórka 6: Raport
        const reportCell = row.insertCell();
        reportCell.style.textAlign = 'center';
        
        const hasDebt = stock.balanceSheet ? stock.balanceSheet.liabilities > 0 : false;
        let reportContent = '';

        if (hasAnalystSkill) {
            switch (stock.lastReport) {
                case 'excellent': reportContent = '💎'; break;
                case 'good': reportContent = '📈'; break;
                case 'neutral': reportContent = '😐'; break;
                case 'bad': reportContent = '📉'; break;
                case 'tragic': reportContent = '🔥'; break;
                default: reportContent = '-';
            }
        } else {
            reportContent = '🔒';
        }

        if (hasDebt && (hasAnalystSkill || playerSharePct > 50)) {
            reportContent += ' <span style="color:red; font-size: 10px;">DŁUG</span>';
        }
        
        reportCell.innerHTML = reportContent;

        return row;
    };

    // --- Pętla renderująca giełdy ---
    sortedExchanges.forEach(exchangeKey => {
        const exchange = exchanges[exchangeKey];
        let stocksOnThisExchange = baseStocksToDisplay.filter(stock => stock.exchange === exchangeKey);

        if (currentSortState === 'price_asc') {
            stocksOnThisExchange.sort((a, b) => a.price - b.price);
        } else if (currentSortState === 'price_desc') {
            stocksOnThisExchange.sort((a, b) => b.price - a.price);
        }

        if (stocksOnThisExchange.length > 0) {
            const headerRow = stockTableBody.insertRow();
            headerRow.className = 'exchange-header';
            headerRow.onclick = () => toggleExchangeVisibility(exchangeKey);
            const headerCell = headerRow.insertCell();
            headerCell.colSpan = "6";
            const icon = exchangeCollapseState[exchangeKey] ? '▶' : '▼';
            headerCell.innerHTML = `<h4 style="margin: 5px 0; color: ${exchange.color}; display: flex; justify-content: space-between;">${exchange.name}<span>${icon}</span></h4>`;
        }

        stocksOnThisExchange.forEach(stock => {
            const mainRow = renderStockRow(stock, false);
            if (exchangeCollapseState[exchangeKey]) mainRow.style.display = 'none';

            if (stock.subsidiaries && stock.subsidiaries.length > 0) {
                stock.subsidiaries.forEach(subSymbol => {
                    const subStock = stocks.find(s => s.symbol === subSymbol);
                    if (subStock) {
                        const subRow = renderStockRow(subStock, true, stock.symbol);
                        if (exchangeCollapseState[exchangeKey] || !stock.isSubsidiaryExpanded) subRow.style.display = 'none';
                        else subRow.style.display = '';
                    }
                });
            }
        });
    });
}

function showPriceHistoryModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) { alert(`Nie znaleziono akcji o symbolu ${symbol}.`); return; }

    currentlyDisplayedChartSymbol = symbol;

    const modal = document.getElementById('price-chart-modal');
    const chartTitle = document.getElementById('chart-title');
    const svgArea = document.getElementById('chart-svg-area');

    // Pobierz kontrolki
    const candlestickBtn = document.getElementById('chart-type-candlestick-btn');
    const lineBtn = document.getElementById('chart-type-line-btn');
    const lineIntervalSelect = document.getElementById('line-chart-interval-select');
    const candleIntervalSelect = document.getElementById('candle-chart-interval-select');
    const openAlertBtn = document.getElementById('open-alert-modal-btn');

    chartTitle.textContent = `Historia Cen: ${stock.name} (${stock.symbol})`;

    const redrawChart = () => {
        const svgWidth = svgArea.offsetWidth;
        const svgHeight = svgArea.offsetHeight;
        renderChartSVGForStock(stock, svgArea, svgWidth, svgHeight);
    };

    const updateControlsVisibility = () => {
        if (playerChartSettings.type === 'candlestick') {
            lineIntervalSelect.style.display = 'none';
            candleIntervalSelect.style.display = 'inline-block';
        } else {
            lineIntervalSelect.style.display = 'inline-block';
            candleIntervalSelect.style.display = 'none';
        }
        updateChartTypeButtons();

    };

    // Ustaw wartości początkowe
    lineIntervalSelect.value = playerChartSettings.lineInterval;
    candleIntervalSelect.value = playerChartSettings.candleInterval;

    // Przypisz eventy
    candlestickBtn.onclick = () => {
        if (playerChartSettings.type === 'candlestick') return;
        playerChartSettings.type = 'candlestick';
        updateControlsVisibility();
        redrawChart();
    };

    lineBtn.onclick = () => {
        if (playerChartSettings.type === 'line') return;
        playerChartSettings.type = 'line';
        updateControlsVisibility();
        redrawChart();
    };

    lineIntervalSelect.onchange = () => {
        playerChartSettings.lineInterval = parseInt(lineIntervalSelect.value, 10);
        redrawChart();
    };

    candleIntervalSelect.onchange = () => {
        playerChartSettings.candleInterval = parseInt(candleIntervalSelect.value, 10);
        redrawChart();
    };
    openAlertBtn.onclick = () => openPriceAlertModal(symbol);
    // Pokaż modal i narysuj wykres
    modal.style.display = 'block';
    updateControlsVisibility();
    redrawChart();
}

function renderSkillsPanel() {
    const skillsListDiv = document.getElementById('skills-list');
    const xpCounterSpan = document.getElementById('skills-modal-xp');
    if (!skillsListDiv || !xpCounterSpan) return;

    skillsListDiv.innerHTML = '';
    xpCounterSpan.textContent = playerXP.toFixed(2);

    for (const skillId in skills) {
        const skillData = skills[skillId];
        const currentLevel = getSkillLevel(skillId);
        const nextLevelInfo = getNextSkillLevelInfo(skillId);

        const skillDiv = document.createElement('div');
        skillDiv.style.border = '1px solid #ddd';
        skillDiv.style.padding = '10px';
        skillDiv.style.marginBottom = '10px';
        skillDiv.style.borderRadius = '5px';

        const skillName = document.createElement('h4');
        skillName.textContent = `${skillData.name} (Poziom: ${currentLevel})`;
        skillName.style.margin = '0 0 5px 0';

        skillDiv.appendChild(skillName);

        if (nextLevelInfo) {
            // --- POCZĄTEK POPRAWKI: Sprawdzanie wymagań ---
            const requirement = nextLevelInfo.requires;
            const requirementMet = requirement ? getSkillLevel(requirement.skillId) >= requirement.level : true;

            if (!requirementMet) {
                const reqText = document.createElement('p');
                const requiredSkill = skills[requirement.skillId];
                reqText.textContent = `Wymaga: ${requiredSkill.name} (Poziom ${requirement.level})`;
                reqText.style.color = '#dc3545';
                reqText.style.fontWeight = 'bold';
                reqText.style.fontSize = '12px';
                skillDiv.appendChild(reqText);
            }


            const skillDesc = document.createElement('p');
            skillDesc.textContent = `Następny poziom: ${nextLevelInfo.description}`;
            skillDesc.style.margin = '0 0 10px 0';
            skillDesc.style.fontSize = '14px';

            const skillCost = document.createElement('p');
            skillCost.textContent = `Koszt: ${nextLevelInfo.cost} XP`;
            skillCost.style.margin = '0';
            skillCost.style.fontWeight = 'bold';

            const buyButton = document.createElement('button');
            buyButton.textContent = `Ulepsz do poz. ${nextLevelInfo.level}`;
            buyButton.onclick = () => buySkill(skillId);

            // Przycisk jest nieaktywny, jeśli brakuje XP LUB nie spełniono wymagań
            if (playerXP < nextLevelInfo.cost || !requirementMet) {
                buyButton.disabled = true;
            }

            skillDiv.appendChild(skillDesc);
            skillDiv.appendChild(skillCost);
            skillDiv.appendChild(buyButton);
        } else {
            const maxLevelText = document.createElement('p');
            maxLevelText.textContent = 'Osiągnięto maksymalny poziom umiejętności.';
            maxLevelText.style.fontWeight = 'bold';
            maxLevelText.style.color = '#28a745';
            skillDiv.appendChild(maxLevelText);
        }
        skillsListDiv.appendChild(skillDiv);
        updateWorkButtonVisibility();
        updateDividendTrackerButtonVisibility();
    }
}

// Ta funkcja jest z ui.js (baza), zachowujemy ją, ponieważ obsługuje bankowość komercyjną
function displayPortfolio() {
    const myStocksList = document.getElementById('my-stocks-list');
    if (!myStocksList) {
        return;
    }

    myStocksList.innerHTML = ''; // Wyczyść listę przed ponownym renderowaniem
    let hasOwnedStocks = false; // Zmieniona nazwa flagi dla jasności
    let totalPortfolioProfitLoss = 0;
    let totalStocksValue = 0; // Wartość tylko akcji, ETFów i indeksów

    // --- Wyświetlanie Aktywów ---
    for (const symbol in playerPortfolio) {
        hasOwnedStocks = true;
        const holding = playerPortfolio[symbol];

        if (holding.assetType === 'Startup') {
            // Wyświetlanie Inwestycji w Startupy
            const startupData = stocks.find(s => s.symbol === symbol);
            if (startupData) {
                const listItem = document.createElement('li');
                listItem.textContent = `🚀 ${startupData.name} (Inwestycja): ${holding.investedAmount.toFixed(2)} PLN`;
                if (holding.isInsured) {
                    listItem.textContent += ' 🛡️(Ubezp.)'; // Oznacz ubezpieczone
                }
                myStocksList.appendChild(listItem);
            }
        } else {
            // Wyświetlanie Akcji, ETFów, Indeksów
            let marketData, currentPrice = 0, name = symbol;
            if (holding.assetType === 'etf') {
                marketData = etfs.find(e => e.symbol === symbol);
                if (marketData) { currentPrice = marketData.price; name = marketData.name; }
            } else if (holding.assetType === 'index') {
                marketData = marketIndexes.find(i => i.id === symbol);
                if (marketData) { currentPrice = marketData.value; name = marketData.name; }
            } else { // Zakładamy, że to standardowe akcje
                marketData = stocks.find(s => s.symbol === symbol);
                if (marketData) { currentPrice = marketData.price; name = marketData.name; }
            }

            if (!marketData || holding.shares <= 0) continue; // Pomiń, jeśli brak danych lub udziałów

            const currentValue = currentPrice * holding.shares;
            const purchaseValue = holding.avgPrice * holding.shares;
            const profitLoss = currentValue - purchaseValue;
            totalStocksValue += currentValue; // Sumuj wartość rynkową
            totalPortfolioProfitLoss += profitLoss; // Sumuj zysk/stratę

            const listItem = document.createElement('li');
            const profitLossSpan = document.createElement('span');
            profitLossSpan.textContent = ` (Z/S: ${profitLoss.toFixed(2)} PLN)`;
            if (profitLoss > 0) profitLossSpan.className = 'profit';
            else if (profitLoss < 0) profitLossSpan.className = 'loss';

            const unitName = (holding.assetType === 'etf' || holding.assetType === 'index') ? 'jedn.' : 'szt.';
            listItem.textContent = `${name} (${symbol}): ${holding.shares} ${unitName}`;

            // --- 👇 TUTAJ JEST DODANY BLOK DLA ZABLOKOWANYCH AKCJI 👇 ---
            if (holding.lockedShares && holding.lockedShares > 0) {
                listItem.textContent += ` (Zablokowane: ${holding.lockedShares})`;
                listItem.style.opacity = '0.7'; // Lekko przygaś
                listItem.title = `${holding.lockedShares} akcji jest zablokowanych jako zabezpieczenie kredytu hipotecznego.`;
            }
            // --- 👆 KONIEC BLOKU 👆 ---

            listItem.textContent += ` | Śr. cena zakupu: ${holding.avgPrice.toFixed(2)} | Wartość: ${currentValue.toFixed(2)} PLN`;
            listItem.appendChild(profitLossSpan);
            myStocksList.appendChild(listItem);
        }
    }

    // --- Wyświetlanie Obligacji ---
    const playerBonds = allBonds.filter(b => b.ownerId === 'player' && b.isStateBond !== undefined); // Filtruj obligacje (nie bony)
    if (playerBonds.length > 0) {
        const bondHeader = document.createElement('li');
        bondHeader.innerHTML = `<hr><strong>Obligacje (${playerBonds.length} szt.):</strong>`;
        myStocksList.appendChild(bondHeader);
        const groupedBonds = {};
        playerBonds.forEach(bond => {
            const key = `${bond.issuerName}_${bond.type}`;
            if (!groupedBonds[key]) {
                groupedBonds[key] = { count: 0, name: bond.issuerName, type: bond.type, nextMaturity: bond.maturityDate };
            }
            groupedBonds[key].count++;
            groupedBonds[key].nextMaturity = Math.min(groupedBonds[key].nextMaturity, bond.maturityDate);
        });
        for (const key in groupedBonds) {
            const group = groupedBonds[key];
            const remainingTime = Math.max(0, Math.ceil((group.nextMaturity - Date.now()) / 1000));
            const bondItem = document.createElement('li');
            bondItem.textContent = `- ${group.name} (${group.type}): ${group.count} szt. (najbliższa za: ${remainingTime}s)`;
            myStocksList.appendChild(bondItem);
        }
        hasOwnedStocks = true;
    }

    // --- Wyświetlanie Bonów Skarbowych ---
    const playerTBills = allBonds.filter(b => b.ownerId === 'player' && b.isTBill === true);
    if (playerTBills.length > 0) {
        const tBillHeader = document.createElement('li');
        tBillHeader.innerHTML = `<hr><strong>Bony Skarbowe (${playerTBills.length} szt.):</strong>`;
        myStocksList.appendChild(tBillHeader);
        let nextMaturity = Infinity;
        playerTBills.forEach(tBill => { nextMaturity = Math.min(nextMaturity, tBill.maturityDate); });
        const remainingTime = Math.max(0, Math.ceil((nextMaturity - Date.now()) / 1000));
        const tBillItem = document.createElement('li');
        tBillItem.textContent = `- Posiadasz ${playerTBills.length} bonów (najbliższy wykup za: ${remainingTime}s)`;
        myStocksList.appendChild(tBillItem);
        hasOwnedStocks = true;
    }

    // --- Wyświetlanie Depozytów Komercyjnych ---
    if (playerCommercialDeposits.length > 0) {
        const depositHeader = document.createElement('li');
        depositHeader.innerHTML = `<hr><strong>Depozyty Komercyjne:</strong>`;
        myStocksList.appendChild(depositHeader);
        playerCommercialDeposits.forEach(dep => {
            const depItem = document.createElement('li');
            depItem.textContent = `- ${dep.bankName}: ${dep.amount.toFixed(2)} PLN (${(dep.interestRate * 100).toFixed(1)}%)`;
            myStocksList.appendChild(depItem);
        });
        hasOwnedStocks = true;
    }

    // --- Wyświetlanie Wkładu w Pulę Inwestycyjną ---
    const playerPoolStake = investmentPool.playerStakes['player'] || 0;
    if (playerPoolStake > 0) {
        const poolItem = document.createElement('li');
        poolItem.innerHTML = `<hr>🏊‍♂️ Wkład w pulę inwestycyjną: <strong>${playerPoolStake.toFixed(2)} PLN</strong>`;
        myStocksList.appendChild(poolItem);
        hasOwnedStocks = true;
    }

    // Komunikat, jeśli brak aktywów
    if (!hasOwnedStocks) {
        myStocksList.innerHTML = '<li>Brak posiadanych aktywów.</li>';
    }

    // --- Wyświetlanie Pasywów (Kredytów Komercyjnych) ---
    const myLiabilitiesList = document.getElementById('my-liabilities-list');
    myLiabilitiesList.innerHTML = '';
    let hasLiabilities = false;
    if (playerCommercialLoans.length > 0) {
        playerCommercialLoans.forEach(loan => {
            const loanItem = document.createElement('li');
            loanItem.style.backgroundColor = '#fff';
            loanItem.style.marginBottom = '6px';
            loanItem.style.padding = '4px';
            if (loan.isPawnLoan) {
                const timeLeft = Math.max(0, Math.ceil((loan.maturityDate - Date.now()) / 1000));
                const minutesLeft = Math.floor(timeLeft / 60);
                const secondsLeft = timeLeft % 60;
                loanItem.innerHTML = `🏦 Lombard (${loan.bankName}): <strong class="loss">${loan.amount.toFixed(2)} PLN</strong> [Zastaw: ${loan.collateral.quantity} ${loan.collateral.symbol}] <span style="color:#856404;">(Termin: ${minutesLeft}m ${secondsLeft}s)</span>`;
            } else if (loan.collectorSymbol && !loan.bankId) {
                loanItem.innerHTML = `⚠️ Windykator (${loan.bankName}): <strong class="loss">${loan.amount.toFixed(2)} PLN</strong> (Rata: ${loan.weeklyPayment.toFixed(2)} PLN/tydz.)`;
            } else {
                loanItem.innerHTML = `Kredyt (${loan.bankName}): <strong class="loss">${loan.amount.toFixed(2)} PLN</strong> (Rata: ${loan.weeklyPayment.toFixed(2)} PLN/tydz.)`;
            }
            if (loan.collateral && !loan.isPawnLoan) {
                loanItem.innerHTML += ` [Zastaw: ${loan.collateral.quantity} ${loan.collateral.symbol}]`;
            }
            // Przycisk szybkiej spłaty
            const repaySpan = document.createElement('span');
            repaySpan.style.marginLeft = '8px';
            repaySpan.innerHTML = `<button onclick="repayCommercialLoan('${loan.id}', ${loan.amount.toFixed(2)})" style="font-size:10px;padding:1px 6px;background:#28a745;color:#fff;border:none;border-radius:3px;cursor:pointer;" title="Spłać całość">Spłać</button>`;
            loanItem.appendChild(repaySpan);
            myLiabilitiesList.appendChild(loanItem);
        });
        hasLiabilities = true;
    }

    if (!hasLiabilities) {
        myLiabilitiesList.innerHTML = '<li>Brak zobowiązań.</li>';
    }

    // --- Podsumowanie Wartości Portfela ---
    const totalPlElement = document.getElementById('total-profit-loss');
    if (totalPlElement) {
        totalPlElement.textContent = totalPortfolioProfitLoss.toFixed(2);
        totalPlElement.className = (totalPortfolioProfitLoss > 0) ? 'profit' : (totalPortfolioProfitLoss < 0) ? 'loss' : '';
    }

    const totalPortfolioValueElement = document.getElementById('total-portfolio-value');
    if (totalPortfolioValueElement) {
        let startupValue = 0;
        for (const symbol in playerPortfolio) {
            if (playerPortfolio[symbol].assetType === 'Startup') {
                startupValue += playerPortfolio[symbol].investedAmount;
            }
        }
        const totalDeposits = playerCommercialDeposits.reduce((sum, dep) => sum + dep.amount, 0);
        // Całkowita wartość = Gotówka + Wartość akcji/ETF/Indeksów + Wartość inwestycji w startupy + Depozyty + Wkład w pulę
        const totalPortfolioValue = playerCash + totalStocksValue + startupValue + totalDeposits + playerPoolStake;
        totalPortfolioValueElement.textContent = totalPortfolioValue.toFixed(2);
    }
}

function displayEventMessage(message, durationSeconds, percentageInfo = null, category = 'market') {
    // Ta funkcja nie musi już niczego wyświetlać na głównym ekranie,
    // jej jedynym zadaniem jest teraz przekazanie eventu do systemu logowania.

    let fullMessage = message;
    if (percentageInfo !== null) {
        const fullMessageWithPercent = `${message} (Zmiana: ${(percentageInfo * 100).toFixed(1)}%!)`;
        logEvent(fullMessageWithPercent, category);
    } else {
        logEvent(message, category);
    }
}

function displayXP() {
    const xpElement = document.getElementById('player-xp');
    if (xpElement) {
        xpElement.textContent = playerXP.toFixed(2);
    }
}

function openSkillsModal() {
    const modal = document.getElementById('skills-modal');
    if (modal) {
        renderSkillsPanel();
        modal.style.display = 'block';
    }
}


function displayEventLog() {
    const logList = document.getElementById('event-log-list');
    if (!logList) return;

    logList.innerHTML = '';

    eventLog.forEach(message => {
        const listItem = document.createElement('li');
        listItem.textContent = message;
        listItem.style.borderBottom = '1px solid #eee';
        listItem.style.padding = '4px 2px';
        logList.appendChild(listItem);
    });
}

function toggleExchangeVisibility(exchangeKey) {
    exchangeCollapseState[exchangeKey] = !exchangeCollapseState[exchangeKey];
    displayStocks(getCurrentInputValues());
}

// POPRAWKA: Usunięto zduplikowaną, starszą wersję funkcji. Pozostaje jedna, poprawna.
function displayLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;

    // Filtrujemy botów, aby ukryć "Inwestorów Mniejszościowych"
    const competitorsForLeaderboard = aiCompetitors.filter(ai => ai.personality !== 'market_maker');

    const allPlayers = [
        { name: 'Ty (Gracz)', cash: playerCash, portfolio: playerPortfolio },
        ...competitorsForLeaderboard // <-- TUTAJ BYŁ BŁĄD (literówka)
    ];

    const rankedPlayers = allPlayers.map(player => {
        let stocksValue = 0;
        for (const symbol in player.portfolio) {
            const holding = player.portfolio[symbol];
            // --- POPRAWKA: Uwzględnienie różnych typów aktywów (akcje, etf, indeksy) ---
            let marketData;
            let currentPrice = 0;

            if (holding.assetType === 'etf') {
                marketData = etfs.find(e => e.symbol === symbol);
                if (marketData) currentPrice = marketData.price;
            } else if (holding.assetType === 'index') {
                marketData = marketIndexes.find(i => i.id === symbol);
                if (marketData) currentPrice = marketData.value;
            } else {
                marketData = stocks.find(s => s.symbol === symbol);
                if (marketData) currentPrice = marketData.price;
            }

            if (marketData) {
                stocksValue += currentPrice * holding.shares;
            }
        }
        const poolStake = investmentPool.playerStakes[player.id] || 0;
        const totalValue = player.cash + stocksValue + poolStake;
        return { name: player.name, totalValue: totalValue };
    });

    rankedPlayers.sort((a, b) => b.totalValue - a.totalValue);

    leaderboardList.innerHTML = '';
    rankedPlayers.forEach((player, index) => {
        const listItem = document.createElement('li');
        if (player.name === 'Ty (Gracz)') {
            listItem.style.fontWeight = 'bold';
            listItem.style.color = '#0056b3';
        }
        listItem.textContent = `#${index + 1}: ${player.name} - ${player.totalValue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}`;
        leaderboardList.appendChild(listItem);
    });
}

function openLeaderboardModal() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) {
        displayLeaderboard();
        modal.style.display = 'block';
    }
}

function displayEtfs() {
    const etfSection = document.getElementById('etf-section');
    const etfTableBody = document.getElementById('etf-table-body');
    if (!etfSection || !etfTableBody) return;

    if (getSkillLevel('etfExpert') === 0) { // POPRAWKA WARUNKU
        etfSection.style.display = 'none';
        return;
    }

    etfSection.style.display = 'block';

    etfTableBody.innerHTML = '';

    etfs.forEach(etf => {
        const row = etfTableBody.insertRow();
        row.insertCell().textContent = `${etf.name} (${etf.symbol})`;
        row.insertCell().textContent = etf.price.toFixed(2);

        const sharesOwned = playerPortfolio[etf.symbol] ? playerPortfolio[etf.symbol].shares : 0;
        row.insertCell().textContent = sharesOwned;

        const actionsCell = row.insertCell();

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.min = '1';
        quantityInput.value = '1';
        quantityInput.style.width = '50px';
        quantityInput.id = `quantity-${etf.symbol}`;
        actionsCell.appendChild(quantityInput);

        const buyButton = document.createElement('button');
        buyButton.textContent = 'Kup';
        buyButton.onclick = () => {
            const quantity = parseInt(quantityInput.value, 10);
            if (quantity > 0) buyEtf(etf.symbol, quantity);
        };
        actionsCell.appendChild(buyButton);

        const sellButton = document.createElement('button');
        sellButton.textContent = 'Sprzedaj';
        sellButton.onclick = () => {
            const quantity = parseInt(quantityInput.value, 10);
            if (quantity > 0) sellEtf(etf.symbol, quantity);
        };
        actionsCell.appendChild(sellButton);
    });
}

function switchNewspaperTab(symbol) {
    const mediaStock = stocks.find(s => s.symbol === symbol);
    if (!mediaStock) {
        console.error(`Nie znaleziono spółki medialnej o symbolu: ${symbol}`);
        return;
    }
    
    const modal = document.getElementById('newspaper-modal');
    if (!modal) return;
    
    // 1. Zaktualizuj przyciski zakładek
    modal.querySelectorAll('.bank-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`tab-btn-newspaper-${symbol}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // 2. Przypisz aktualnie otwartą gazetę do modala (do użycia przez PR)
    modal.dataset.currentNewspaper = symbol;
    
    // 3. Wywołaj funkcję, która odświeża całą treść gazety
    updateNewspaperContent(mediaStock);
}

/**
 * Otwiera modal gazety i domyślnie włącza pierwszą zakładkę.
 */
function openNewspaperModal() {
    const modal = document.getElementById('newspaper-modal');
    if (!modal) return;
    
    // Domyślnie otwórz pierwszą gazetę ('PULS')
    switchNewspaperTab('PULS'); 
    
    modal.style.setProperty('display', 'flex', 'important');
}

/**
 * Aktualizuje treść modala gazety na podstawie danych konkretnej spółki medialnej.
 * @param {object} mediaStock - Obiekt spółki medialnej (np. PULS, FLESZ).
 */
function updateNewspaperContent(mediaStock) {
    if (!mediaStock || !mediaStock.newspaperData) return;

    // 1. Ustaw tytuł gazety
    const newspaperTitle = document.getElementById('newspaper-title');
    if (newspaperTitle) newspaperTitle.textContent = mediaStock.name;

    // 2. Aktualizacja daty
    const newspaperDate = document.getElementById('newspaper-date');
    if (newspaperDate) newspaperDate.textContent = `Gdańsk, ${new Date().toLocaleDateString('pl-PL')}`;

    // 3. Logika Reklamy (dla przychodu spółki medialnej)
    const adContainer = document.getElementById('newspaper-ad-container');
    if (adContainer) {
        if (Math.random() < 0.6) { // 60% szans na reklamę
            const adStock = getRandomElement(stocks.filter(s => !s.assetType && !s.isBankrupt && s.symbol !== mediaStock.symbol));
            if (adStock) {
                adContainer.innerHTML = `<p><strong>REKLAMA:</strong> Zainwestuj w <strong>${adStock.name} (${adStock.symbol})</strong>! Niesamowity potencjał wzrostu! Kup teraz!</p>`;
                adContainer.style.display = 'block';
                
                // Mechanika przychodu za kliknięcie (teraz za KAŻDYM przełączeniem zakładki)
                mediaStock.cash += mediaStock.newspaperData.adRevenuePerClick;
                // Można dodać logikę pobierania kasy od reklamodawcy
                if (adStock.cash > mediaStock.newspaperData.adRevenuePerClick) {
                    adStock.cash -= mediaStock.newspaperData.adRevenuePerClick;
                }
            }
        } else {
            adContainer.style.display = 'none'; // Brak reklamy
        }
    }

    // 4. Logika Subskrypcji (na razie ukryta)
    const statusText = document.getElementById('subscription-status-text');
    const buyButton = document.getElementById('buy-subscription-btn');
    if (statusText && buyButton) {
        statusText.innerHTML = "Wiadomości premium (już wkrótce)."; // Placeholder
        buyButton.style.display = 'none'; // Ukryj stary przycisk
    }

    // 5. Wypełnianie Kolumn (TODO Krok 2: Zmienić 'eventLog' na 'mediaStock.newspaperData.eventLog')
    const newspaperLog = eventLog; // Na razie nadal używamy głównego logu
    
    const marketNewsList = document.getElementById('market-news-list');
    const companyNewsList = document.getElementById('company-news-list');
    const premiumContentList = document.getElementById('premium-content');

    // ===>>> NOWA LOGIKA DLA NASTAWIENIA GAZETY <<<===
    const premiumTitle = document.getElementById('premium-section-title');
    premiumContentList.innerHTML = ''; // Wyczyść stare plotki

    if (mediaStock.stance === 'pro-player') {
        premiumTitle.textContent = 'Strefa Inwestora (Wgląd Analityczny)';
        premiumTitle.style.color = '#28a745';
        // TODO: W przyszłości ta gazeta może pokazywać tu prawdziwe wskazówki
        premiumContentList.innerHTML = '<li style="color: #666;">Jesteśmy po Twojej stronie. Szukamy dla Ciebie najlepszych okazji.</li>';
    } else if (mediaStock.stance === 'anti-player') {
        premiumTitle.textContent = 'Felieton Krytyczny';
        premiumTitle.style.color = '#dc3545';
        // TODO: Tutaj gazeta może krytykować ostatnie ruchy gracza
        premiumContentList.innerHTML = '<li style="color: #666;">Obserwujemy Twoje ruchy... i nie jesteśmy pod wrażeniem. Uważaj.</li>';
    } else {
        premiumTitle.textContent = 'Strefa Premium';
        premiumTitle.style.color = ''; // Domyślny kolor
        premiumContentList.innerHTML = '<li style="color: #666;">Neutralne analizy (już wkrótce).</li>';
    }
    // ===>>> KONIEC LOGIKI NASTAWIENIA <<<===

    // Wypełnianie głównych newsów (bez zmian)
    const marketMessages = newspaperLog.filter(e => e.category === 'market').slice(0, 15);
    if (marketMessages.length > 0) {
        marketNewsList.innerHTML = '';
        marketMessages.forEach(msg => { marketNewsList.innerHTML += `<li>${msg.text}</li>`; });
    } else {
         marketNewsList.innerHTML = '<li>Brak ważnych wiadomości z rynku.</li>';
    }

    const companyMessages = newspaperLog.filter(e => e.category === 'company' || e.category === 'review' || e.category === 'state').slice(0, 15);
    if (companyMessages.length > 0) {
        companyNewsList.innerHTML = '';
        companyMessages.forEach(msg => { companyNewsList.innerHTML += `<li>${msg.text}</li>`; });
    } else {
        companyNewsList.innerHTML = '<li>Brak doniesień ze spółek.</li>';
    }

    // 6. Sekcja "Wpływ na Media" (logika bez zmian)
    const mediaSection = document.getElementById('media-influence-section');
    const positiveControls = document.getElementById('positive-pr-controls');
    const blackControls = document.getElementById('black-pr-controls');
    const skillLvl = getSkillLevel('mediaManipulation');

    if (skillLvl > 0 && mediaSection && positiveControls && blackControls) {
        mediaSection.style.display = 'block';
        
        // Pozytywny PR (Lvl 1+)
        positiveControls.style.display = 'block';
        const posSelect = document.getElementById('positive-pr-select');
        posSelect.innerHTML = ''; 
        const ownedStocks = stocks.filter(s => {
            const holding = playerPortfolio[s.symbol];
            return holding && !s.assetType && (holding.shares / s.totalShares > 0.5);
        });
        if (ownedStocks.length > 0) {
            ownedStocks.forEach(s => { posSelect.innerHTML += `<option value="${s.symbol}">${s.name} (${s.symbol})</option>`; });
            document.getElementById('positive-pr-btn').disabled = false;
        } else {
            posSelect.innerHTML = '<option value="">(Brak spółek 👑)</option>';
            document.getElementById('positive-pr-btn').disabled = true;
        }

        // Czarny PR (Lvl 2+)
        if (skillLvl >= 2) {
            blackControls.style.display = 'block';
            const blackSelect = document.getElementById('black-pr-select');
            blackSelect.innerHTML = ''; 
            const targetStocks = stocks.filter(s => {
                 const holding = playerPortfolio[s.symbol];
                 const isOwned = holding && !s.assetType && (holding.shares / s.totalShares > 0.5);
                 return !s.assetType && !s.isBankrupt && !s.isSubsidiaryOf && !isOwned;
            });
            if (targetStocks.length > 0) {
                targetStocks.forEach(s => { blackSelect.innerHTML += `<option value="${s.symbol}">${s.name} (${s.symbol})</option>`; });
                document.getElementById('black-pr-btn').disabled = false;
            } else {
                 blackSelect.innerHTML = '<option value="">(Brak celów)</option>';
                 document.getElementById('black-pr-btn').disabled = true;
            }
            const currentRisk = BLACK_PR_BASE_RISK + (blackPRRiskCounter * BLACK_PR_RISK_INCREASE);
            document.getElementById('black-pr-risk-display').textContent = `${(currentRisk * 100).toFixed(1)}%`;
        } else {
            blackControls.style.display = 'none';
        }
    } else if (mediaSection) {
        mediaSection.style.display = 'none';
    }
}


function displayMarketIndexes() {
    const indexesPanel = document.getElementById('indexes-panel');
    const indexesContainer = document.getElementById('indexes-container');
    if (!indexesPanel || !indexesContainer) return;

    if (getSkillLevel('indexAnalystLvl1') === 0) { // POPRAWKA WARUNKU
        indexesPanel.style.display = 'none';
        return;
    }

    indexesPanel.style.display = 'block';
    indexesContainer.innerHTML = '';

    const canTradeIndexes = getSkillLevel('indexAnalystLvl1') >= 2;

    // Wyświetlanie głównych indeksów (GIG, TIG5, SIG20)
    marketIndexes.forEach(index => {
        const indexDiv = document.createElement('div');
        indexDiv.className = 'index-item';

        const change = index.change;
        let arrow = '➡️';
        let colorClass = '';

        if (change > 0.01) { arrow = '⬆️'; colorClass = 'profit'; }
        else if (change < -0.01) { arrow = '⬇️'; colorClass = 'loss'; }

        indexDiv.innerHTML = `
            <span class="index-name">${index.name} (${index.id})</span>
            <span class="index-value ${colorClass}">${index.value.toFixed(2)}</span>
            <span class="index-change ${colorClass}">${arrow} ${change.toFixed(2)}</span>
        `;

        if (canTradeIndexes) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'index-actions';
            actionsDiv.innerHTML = `
                <input type="number" min="1" value="1" id="quantity-index-${index.id}">
                <button onclick="buyIndex('${index.id}', document.getElementById('quantity-index-${index.id}').valueAsNumber)">Kup</button>
                <button onclick="sellIndex('${index.id}', document.getElementById('quantity-index-${index.id}').valueAsNumber)">Sprzedaj</button>
            `;
            indexDiv.appendChild(actionsDiv);
        }
        indexesContainer.appendChild(indexDiv);
    });

    // --- NOWA LOGIKA: Wyświetlanie Wskaźnika Niestabilności Rynku (WNR) dla Lvl 3 ---
    if (getSkillLevel('indexAnalystLvl1') >= 3) {
        const vixDiv = document.createElement('div');
        vixDiv.className = 'index-item vix-item'; // Dodatkowa klasa do stylów

        let description = 'Stabilny';
        let color = '#28a745'; // Zielony

        if (marketVolatilityIndex > 1.5) {
            description = 'Niestabilny';
            color = '#dc3545'; // Czerwony
        } else if (marketVolatilityIndex > 0.8) {
            description = 'Zmienny';
            color = '#ffc107'; // Pomarańczowy/żółty
        }

        vixDiv.innerHTML = `
            <span class="index-name">Niestabilność Rynku (WNR)</span>
            <span class="index-value" style="color: ${color};">${marketVolatilityIndex.toFixed(2)}</span>
            <span class="index-change" style="color: ${color}; font-weight: bold;">${description}</span>
        `;
        indexesContainer.appendChild(vixDiv);
    }
}

function renderDepartmentsSection(stock, container) {
    // Sprawdź czy sekcja już istnieje, jeśli tak - wyczyść, jeśli nie - stwórz
    let deptSection = document.getElementById('departments-section');
    if (!deptSection) {
        deptSection = document.createElement('div');
        deptSection.id = 'departments-section';
        deptSection.className = 'bank-section';
        container.appendChild(deptSection);
    }
    deptSection.innerHTML = ''; // Reset zawartości
    
    if (!stock.departments) {
        deptSection.innerHTML = '<p>Ta spółka nie posiada struktury działów.</p>';
        return;
    }

    deptSection.innerHTML = `<h4>🏢 Działy i Inwestycje</h4>`;

    // --- 1. KARTY DZIAŁÓW ---
    const deptsDiv = document.createElement('div');
    deptsDiv.style.display = 'flex';
    deptsDiv.style.justifyContent = 'space-between';
    deptsDiv.style.marginBottom = '15px';
    
    const deptNames = { research: "Badania (R&D)", development: "Rozwój (Inv)", economy: "Ekonomia" };
    
    for (const [key, data] of Object.entries(stock.departments)) {
        const deptCard = document.createElement('div');
        deptCard.style.border = '1px solid #ccc';
        deptCard.style.padding = '8px';
        deptCard.style.borderRadius = '4px';
        deptCard.style.textAlign = 'center';
        deptCard.style.flex = '1';
        deptCard.style.margin = '0 4px';
        deptCard.style.backgroundColor = '#fff';
        
        let upgradeBtn = '';
        if (data.level < 3) {
            const cost = 50000 * Math.pow(2, data.level);
            upgradeBtn = `<button onclick="fundDepartmentUpgrade('${stock.symbol}', '${key}')" style="font-size: 10px; margin-top: 5px; width: 100%;">Ulepsz (${(cost/1000).toFixed(0)}k)</button>`;
        } else {
            upgradeBtn = `<span style="font-size: 10px; color: green; font-weight: bold;">MAX LEVEL</span>`;
        }

        deptCard.innerHTML = `
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">${deptNames[key]}</div>
            <div style="font-size: 18px; color: #007bff;">Lvl ${data.level}</div>
            ${upgradeBtn}
        `;
        deptsDiv.appendChild(deptCard);
    }
    deptSection.appendChild(deptsDiv);

    // --- 2. TRWAJĄCE INWESTYCJE ---
    const activeDiv = document.createElement('div');
    activeDiv.innerHTML = `<h5>🚧 Trwające Projekty (${stock.activeInvestments.length}/${stock.departments.development.level})</h5>`;
    
    if (stock.activeInvestments.length > 0) {
        const invList = document.createElement('ul');
        invList.style.listStyle = 'none';
        invList.style.padding = '0';
        
        stock.activeInvestments.forEach(inv => {
            const li = document.createElement('li');
            li.style.marginBottom = '8px';
            li.style.padding = '8px';
            li.style.backgroundColor = '#f8f9fa';
            li.style.borderLeft = '3px solid #007bff';
            
            const progressPct = (inv.progress / inv.totalDuration) * 100;
            const contractorInfo = inv.contractor ? `<br><small>Wykonawca: ${inv.contractor}</small>` : '<br><small>Realizacja własna</small>';
            
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <strong>${inv.name}</strong>
                    <button onclick="blockInvestment('${stock.symbol}', '${inv.id}')" style="font-size: 9px; background-color: #ffdddd; border: 1px solid red; color: red;">Anuluj</button>
                </div>
                <progress value="${inv.progress}" max="${inv.totalDuration}" style="width: 100%; height: 10px; margin-top: 4px;"></progress>
                <div style="font-size: 10px; color: #666; display: flex; justify-content: space-between;">
                    <span>${progressPct.toFixed(0)}%</span>
                    <span>${inv.progress.toFixed(1)} / ${inv.totalDuration} tyg.</span>
                </div>
                ${contractorInfo}
            `;
            invList.appendChild(li);
        });
        activeDiv.appendChild(invList);
    } else {
        activeDiv.innerHTML += `<p style="font-size: 12px; color: #888; font-style: italic;">Brak aktywnych projektów.</p>`;
    }
    deptSection.appendChild(activeDiv);

    // --- 3. KATALOG DOSTĘPNYCH INWESTYCJI ---
    const catalogDiv = document.createElement('div');
    catalogDiv.style.marginTop = '15px';
    catalogDiv.innerHTML = `<h5>📋 Katalog Inwestycji</h5>`;

    // Pobierz inwestycje ogólne + sektorowe
    let availableOptions = [...INVESTMENT_CATALOG['general']];
    if (stock.sector[0] && INVESTMENT_CATALOG[stock.sector[0]]) {
        availableOptions = availableOptions.concat(INVESTMENT_CATALOG[stock.sector[0]]);
    }

    const table = document.createElement('table');
    table.style.fontSize = '11px';
    table.style.width = '100%';
    table.innerHTML = `
        <thead>
            <tr style="background-color: #e9ecef;">
                <th>Nazwa</th>
                <th>Koszt</th>
                <th>Czas</th>
                <th>Efekt</th>
                <th>Akcja</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    availableOptions.forEach(inv => {
        const tr = document.createElement('tr');
            
            // Logika kosztów i wymagań
            const realCost = stock.departments.development.level >= 3 ? inv.cost * 0.9 : inv.cost;
            const isAffordable = stock.cash >= realCost;
            const hasLevel = stock.departments.development.level >= inv.minDevLevel;
            const isLimitReached = stock.activeInvestments.length >= stock.departments.development.level;

            // Przycisk akcji
            let statusBtn = '';
            if (!hasLevel) {
                statusBtn = `<span style="color: gray; font-size: 9px;">Wymaga Lvl ${inv.minDevLevel}</span>`;
            } else if (!isAffordable) {
                statusBtn = `<span style="color: #dc3545; font-size: 9px;">Brak środków</span>`;
            } else if (isLimitReached) {
                statusBtn = `<span style="color: #ffc107; font-size: 9px;">Limit projektów</span>`;
            } else {
                statusBtn = `<button onclick="forceCompanyInvestment('${stock.symbol}', '${inv.id}')" style="padding: 2px 8px; font-size: 11px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">Start</button>`;
            }

            // Ikona (domyślna jeśli brak pliku)
            const iconSrc = inv.icon || 'img/box.png'; 

            tr.innerHTML = `
                <td style="display: flex; align-items: center;">
                    <img src="${iconSrc}" style="width: 24px; height: 24px; margin-right: 8px; object-fit: contain;" onerror="this.style.display='none'">
                    <span>${inv.name}</span>
                </td>
                <td>${(realCost/1000).toFixed(0)}k PLN</td>
                <td>${inv.duration} tyg.</td>
                <td>
                    <div style="font-size: 10px; color: #555;">
                        ${inv.assetValue > 0 ? `<div>🏠 +${(inv.assetValue/1000).toFixed(0)}k</div>` : ''}
                        ${inv.incomeBonus > 0 ? `<div>💰 +${(inv.incomeBonus*100).toFixed(0)}%</div>` : ''}
                        ${inv.healthBonus > 0 ? `<div>❤️ +${inv.healthBonus}</div>` : ''}
                    </div>
                </td>
                <td style="text-align: center;">${statusBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    
    catalogDiv.appendChild(table);
    deptSection.appendChild(catalogDiv);
}



function openManagementModal(symbol, defaultTab = 'main') {
    const modal = document.getElementById('management-modal');
    const stock = stocks.find(s => s.symbol === symbol);
    
    // Zabezpieczenie: jeśli modal lub spółka nie istnieje
    if (!modal || !stock) return;

    // Przypisujemy symbol do modala, aby odświeżanie (np. po ulepszeniu działu) wiedziało, kogo dotyczy
    modal.dataset.currentSymbol = symbol;

    // Helper do bezpiecznego ustawiania tekstu (zapobiega błędom, gdy element nie istnieje)
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    safeSetText('management-title', `👑 Panel Zarządzania: ${stock.name}`);

    // --- 1. Dywidenda Specjalna ---
    const dividendBtn = document.getElementById('force-dividend-btn');
    const cooldownInfo = document.getElementById('dividend-cooldown-info');
    
    if (dividendBtn && cooldownInfo) {
        if (stock.dividendCooldownUntil && Date.now() < stock.dividendCooldownUntil) {
            dividendBtn.disabled = true;
            const remainingTime = Math.ceil((stock.dividendCooldownUntil - Date.now()) / 1000);
            cooldownInfo.textContent = `Następna dywidenda dostępna za: ${remainingTime} s.`;
        } else {
            dividendBtn.disabled = false;
            cooldownInfo.textContent = '';
        }
        // Resetujemy onlick, aby nie kumulować eventów
        dividendBtn.onclick = () => forceDividend(symbol);
    }

    // --- 2. Walne Zgromadzenie (CEO) ---
    const fireCeoBtn = document.getElementById('fire-ceo-btn');
    const fireCeoCooldownInfo = document.getElementById('fire-ceo-cooldown-info');
    
    if (fireCeoBtn && fireCeoCooldownInfo) {
        if (stock.ceo && stock.ceo.fireCooldown && Date.now() < stock.ceo.fireCooldown) {
            fireCeoBtn.disabled = true;
            const remainingTime = Math.ceil((stock.ceo.fireCooldown - Date.now()) / 1000);
            fireCeoCooldownInfo.textContent = `Następne zgromadzenie możliwe za: ${remainingTime} s`;
        } else {
            fireCeoBtn.disabled = false;
            fireCeoCooldownInfo.textContent = '';
        }
        fireCeoBtn.onclick = () => initiateCeoChange(symbol);
    }

    // --- 3. Polityka Dywidendowa ---
    const policySelect = document.getElementById('policy-select');
    if (policySelect) {
        policySelect.dataset.symbol = symbol;
        policySelect.value = stock.dividendPolicy || 'Growth';
        // Uwaga: onchange jest zazwyczaj zdefiniowany w HTML, ale upewnij się, że działa
    }

    // --- 4. Wybór Banku ---
    const bankSelect = document.getElementById('bank-select');
    const changeBankBtn = document.getElementById('change-bank-btn');
    
    if (bankSelect && changeBankBtn) {
        bankSelect.innerHTML = '<option value="">-- Brak --</option>';
        const activeBanks = commercialBanks.filter(b => b.isActive && (b.type === 'Korporacyjny' || b.type === 'Uniwersalny'));
        
        activeBanks.forEach(bank => {
            const option = document.createElement('option');
            option.value = bank.id;
            option.textContent = `${bank.name} (Gotówka: ${bank.cash.toLocaleString()} PLN)`;
            if (stock.bankAccountId === bank.id) option.selected = true;
            bankSelect.appendChild(option);
        });
        
        changeBankBtn.onclick = () => changeCompanyBank(symbol, bankSelect.value);
    }

    // --- 5. Zadłużenie (Ratunek) ---
    const debtSection = document.getElementById('debt-management-section');
    if (debtSection) {
        // Sprawdzamy liabilities z bilansu
        if (stock.balanceSheet && stock.balanceSheet.liabilities > 0) {
            safeSetText('corporate-debt-amount', stock.balanceSheet.liabilities.toFixed(2));
            
            const repaymentInput = document.getElementById('debt-repayment-amount');
            if (repaymentInput) repaymentInput.value = '';
            
            const repayBtn = document.getElementById('repay-debt-btn');
            if (repayBtn) {
                repayBtn.onclick = () => {
                    const amount = parseFloat(repaymentInput.value);
                    if (!isNaN(amount)) playerBailsOutCompany(symbol, amount);
                };
            }
            debtSection.style.display = 'block';
        } else {
            debtSection.style.display = 'none';
        }
    }

    // --- 6. Panel Badań (R&D) ---
    const rdSection = document.getElementById('rd-management-section');
    if (rdSection) {
        if (stock.research && stock.research.isResearching && stock.research.currentTech) {
            const tech = technologies[stock.research.currentTech];
            safeSetText('rd-current-tech-name', tech ? tech.name : "Nieznane");
            
            const progressBar = document.getElementById('rd-progress-bar');
            if (progressBar) {
                const cost = tech ? tech.cost : 1;
                const progressPercent = (stock.research.progress / cost) * 100;
                progressBar.value = progressPercent;
            }
            
            const openRdBtn = document.getElementById('open-research-panel-btn');
            if (openRdBtn) openRdBtn.onclick = () => openResearchModal(symbol);
            
            rdSection.style.display = 'block';
        } else {
            rdSection.style.display = 'none';
        }
    }

    // --- 7. Dostęp Finansowy (Księgowy) ---
    const financialSection = document.getElementById('financial-access-section');
    const viewFinancesBtn = document.getElementById('view-finances-btn');
    const financesInfo = document.getElementById('finances-access-info');

    if (financialSection && viewFinancesBtn && financesInfo) {
        const accountantLevel = getSkillLevel('accountant');
        // Gracz ma większość?
        const playerShares = playerPortfolio[symbol] ? playerPortfolio[symbol].shares : 0;
        const isMajorityOwner = (playerShares / stock.totalShares) > 0.5;

        if (accountantLevel > 0) {
            financialSection.style.display = 'block';
            viewFinancesBtn.onclick = () => handleViewFinancesClick(symbol);
            financesInfo.textContent = '';

            if (stock.playerHasFinancialAccess || (accountantLevel >= 2 && isMajorityOwner)) {
                viewFinancesBtn.disabled = false;
                financesInfo.textContent = 'Dostęp aktywny.';
                financesInfo.style.color = 'green';
            } else {
                viewFinancesBtn.disabled = false;
                financesInfo.textContent = 'Wymagana opłata: 2000 PLN.';
                financesInfo.style.color = '#666';
            }
        } else {
            financialSection.style.display = 'none';
        }
    }

    // --- 8. Reputacja ---
    const repSection = document.getElementById('reputation-management-section');
    if (repSection) {
        if (stock.reputation && stock.reputation['player'] !== undefined) {
            safeSetText('reputation-status', `${stock.reputation['player'].toFixed(1)}`);
            
            const donateBtn = document.getElementById('donate-btn');
            if (donateBtn) {
                donateBtn.onclick = () => {
                    const amount = document.getElementById('donation-amount').valueAsNumber;
                    donateToCompany(symbol, amount);
                };
            }
            repSection.style.display = 'block';
        } else {
            // Fallback dla nowych spółek bez zainicjowanej reputacji
            safeSetText('reputation-status', '0.0');
            repSection.style.display = 'block';
        }
    }

    // --- 9. Wpływy i Naciski ---
    const influenceSection = document.getElementById('influence-section');
    if (influenceSection) {
        if (stock.influence) {
            safeSetText('influence-total-received', stock.influence.totalReceived.toFixed(1));
            
            // Wypełnij listy wpływów
            const exertedListEl = document.getElementById('influence-exerted-list');
            if (exertedListEl) {
                exertedListEl.innerHTML = '';
                const exertedEntries = Object.entries(stock.influence.exerted || {});
                if (exertedEntries.length > 0) {
                    exertedEntries.sort(([, a], [, b]) => b - a);
                    exertedEntries.forEach(([targetSym, val]) => {
                        const li = document.createElement('li');
                        li.textContent = `${targetSym}: ${val.toFixed(1)}`;
                        exertedListEl.appendChild(li);
                    });
                } else {
                    exertedListEl.innerHTML = '<li>Brak</li>';
                }
            }

            const receivedListEl = document.getElementById('influence-received-list');
            if (receivedListEl) {
                receivedListEl.innerHTML = '';
                const receivedEntries = Object.entries(stock.influence.received || {});
                if (receivedEntries.length > 0) {
                    receivedEntries.sort(([, a], [, b]) => b - a);
                    receivedEntries.forEach(([sourceSym, val]) => {
                        const li = document.createElement('li');
                        li.textContent = `${sourceSym}: ${val.toFixed(1)}`;
                        receivedListEl.appendChild(li);
                    });
                } else {
                    receivedListEl.innerHTML = '<li>Brak</li>';
                }
            }
            influenceSection.style.display = 'block';
        } else {
            influenceSection.style.display = 'none';
        }
    }

    // --- 10. Fuzje i Przejęcia (M&A) ---
    const maInitiation = document.getElementById('ma-initiation-section');
    const maDefense = document.getElementById('ma-defense-section');
    
    if (maInitiation && maDefense) {
        if (stock.mergerProcess) {
            maInitiation.style.display = 'none';
            // Jeśli jesteśmy celem ataku
            if ((stock.mergerProcess.type === 'przejęcie' || stock.mergerProcess.type === 'influenceTakeover') && 
                stock.mergerProcess.initiatorSymbol !== symbol) {
                
                maDefense.style.display = 'block';
                safeSetText('ma-defense-info', `Atakuje: ${stock.mergerProcess.initiatorSymbol}`);
                
                const poisonBtn = document.getElementById('ma-defense-poisonpill-btn');
                if (poisonBtn) {
                    if(stock.mergerProcess.defenseActive) {
                        poisonBtn.disabled = true;
                        poisonBtn.textContent = `Obrona aktywna: ${stock.mergerProcess.defenseActive}`;
                    } else {
                        poisonBtn.disabled = false;
                        poisonBtn.textContent = 'Aktywuj "Zatrutą Pigułkę"';
                        poisonBtn.onclick = () => activateDefenseMechanism(symbol, 'poisonPill');
                    }
                }
            } else {
                maDefense.style.display = 'none';
            }
        } else {
            maInitiation.style.display = 'block';
            maDefense.style.display = 'none';
            const maBtn = document.getElementById('ma-open-target-modal-btn');
            if (maBtn) maBtn.onclick = () => openMaTargetModal(symbol);
        }
    }

    // === 11. ZAKŁADKA: Działy i Inwestycje ===
    const deptsContent = document.getElementById('mgmt-content-depts');
    if (deptsContent) {
        if (typeof renderDepartmentsSection === 'function') {
            renderDepartmentsSection(stock, deptsContent);
        } else {
            deptsContent.innerHTML = '<p style="color:red">Błąd: Brak funkcji renderDepartmentsSection.</p>';
        }
    }

    // Przełączenie na odpowiednią zakładkę (np. po kliknięciu "Ulepsz" chcemy wrócić do działów)
    if (typeof switchManagementTab === 'function') {
        switchManagementTab(defaultTab);
    }

    // Pokaż modal
    modal.style.display = 'block';
}

function switchManagementTab(tabName) {
    // Ukryj wszystkie treści
    document.getElementById('mgmt-content-main').style.display = 'none';
    document.getElementById('mgmt-content-depts').style.display = 'none';
    
    // Odznacz przyciski
    document.getElementById('tab-btn-mgmt-main').classList.remove('active');
    document.getElementById('tab-btn-mgmt-depts').classList.remove('active');
    
    // Pokaż wybraną treść i zaznacz przycisk
    document.getElementById(`mgmt-content-${tabName}`).style.display = 'block';
    document.getElementById(`tab-btn-mgmt-${tabName}`).classList.add('active');
}

function toggleAutoRepay(isEnabled) {
    // Ta funkcja jest specyficzna dla ui2.js (prosty kredyt). 
    // W ui.js (baza) system auto-spłaty nie jest zaimplementowany dla kredytów komercyjnych.
    // Na razie zostawiamy ją, ale może nie być używana.
    isAutoRepayEnabled = isEnabled;
    logEvent(`System automatycznej spłaty kredytu został ${isEnabled ? 'WŁĄCZONY' : 'WYŁĄCZONY'}.`, 'market');
}


// Plik: ui.js
// Ta funkcja jest z ui.js (baza) i obsługuje złożony modal bankowy (z zakładkami)
function openBankModal() {
    const centralTabContent = document.getElementById('bank-content-central');
    if (centralTabContent && centralBank.ceo) {
        let ceoInfoHtml = `
            <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #ccc;">
                <strong>Prezes Banku Centralnego:</strong> ${centralBank.ceo.name}<br>
                <span style="font-size: 11px; color: #6c757d;">
        `;
        centralBank.ceo.traits.forEach(trait => {
            ceoInfoHtml += `<span title="${trait.description}">[${trait.name}] </span>`;
        });
        ceoInfoHtml += `</span></div>`;

        // Sprawdź, czy info już istnieje, aby uniknąć duplikacji
        if (!centralTabContent.querySelector('.central-bank-ceo-info')) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'central-bank-ceo-info'; // Dodaj klasę do identyfikacji
            infoDiv.innerHTML = ceoInfoHtml;
            // Wstaw info pod nagłówkiem H2
            centralTabContent.insertBefore(infoDiv, centralTabContent.children[1]);
        }
    }

    // Logika z ui2.js dotycząca 'playerLoan' (prosty kredyt) jest zastąpiona
    // przez system bankowości komercyjnej z ui.js.
    // Poniższe elementy z ui2.js (dotyczące playerLoan) mogą nie istnieć w HTML dla ui.js

    // Aktualizacja checkboxa auto-spłaty (z ui2.js)
    const autoRepayToggle = document.getElementById('auto-repay-toggle');
    if (autoRepayToggle) {
        autoRepayToggle.checked = isAutoRepayEnabled;
    }

    // Aktualizacja informacji o pominiętych ratach (z ui2.js)
    const missedPaymentsInfo = document.getElementById('missed-payments-info');
    if (missedPaymentsInfo) {
        // Zakładamy, że 'playerLoan' nadal istnieje równolegle, albo ta sekcja powinna być usunięta
        // Jeśli ui.js *całkowicie* usuwa playerLoan, ten blok jest martwy.
        // Na potrzeby łączenia, zakładamy, że HTML może jeszcze to mieć.
        if (typeof playerLoan !== 'undefined' && playerLoan.missedPayments > 0) {
            if (playerLoan.missedPayments >= 3) {
                missedPaymentsInfo.textContent = `KONTO ZABLOKOWANE! Posiadasz ${playerLoan.missedPayments} pominiętych rat. Spłać część długu, aby odblokować inwestycje.`;
                missedPaymentsInfo.style.color = '#dc3545';
            } else {
                missedPaymentsInfo.textContent = `Liczba pominiętych rat: ${playerLoan.missedPayments}. Przy 3 ratach konto zostanie zablokowane.`;
                missedPaymentsInfo.style.color = '#ffc107';
            }
            missedPaymentsInfo.style.display = 'block';
        } else {
            missedPaymentsInfo.style.display = 'none';
        }
    }


    // Aktualizacja sekcji licencji (z bazy ui.js)
    const licenseInfoText = document.getElementById('license-info-text');
    const licenseButton = document.getElementById('buy-license-btn');
    const nextLevel = playerAccessLevel + 1;
    const nextExchange = Object.values(exchanges).find(e => e.level === nextLevel);

    if (licenseInfoText && licenseButton) { // Sprawdź, czy elementy istnieją
        if (nextExchange) {
            licenseInfoText.innerHTML = `Następny poziom dostępu: <strong>${nextExchange.name}</strong><br>Koszt licencji: <strong>${nextExchange.licenseCost.toLocaleString('pl-PL')} PLN</strong>`;
            licenseButton.style.display = 'block';
            licenseButton.disabled = playerCash < nextExchange.licenseCost;
        } else {
            licenseInfoText.textContent = "Gratulacje! Posiadasz dostęp do wszystkich giełd.";
            licenseButton.style.display = 'none';
        }
    }


    // Aktualizacja sekcji ofert do państwa (z bazy ui.js)
    const stateCompanySelect = document.getElementById('state-company-select');
    const stateOfferSection = document.getElementById('state-offer-section'); // Dodano sprawdzenie
    if (stateCompanySelect && stateOfferSection) { // Sprawdź, czy elementy istnieją
        stateCompanySelect.innerHTML = '<option value="">-- Wybierz --</option>';
        const ownedStateCompanies = stocks.filter(s => s.isStateOwned && playerPortfolio[s.symbol] && playerPortfolio[s.symbol].shares > 0);

        if (ownedStateCompanies.length > 0) {
            ownedStateCompanies.forEach(stock => {
                const option = document.createElement('option');
                option.value = stock.symbol;
                option.textContent = stock.name;
                stateCompanySelect.appendChild(option);
            });
            stateOfferSection.style.display = 'block';
            updateStateOfferInfo();
        } else {
            stateOfferSection.style.display = 'none';
        }
    }


    // Sprawdź dostęp do bonów, zanim pokażesz sekcję aukcji (z bazy ui.js)
    checkTBillAccess();
    updateTBillAuctionSection();
    updateCollateralAuctionSection(); // Funkcja z ui.js

    const baseRateEl = document.getElementById('bc-base-rate-display');
    if (baseRateEl) {
        baseRateEl.textContent = (centralBank.baseInterestRate * 100).toFixed(1);
    }

    switchBankTab('central'); // Ustaw domyślną zakładkę
    document.getElementById('bank-modal').style.display = 'block';
}


function openStockDetailsModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const modal = document.getElementById('stock-details-modal');
    const title = document.getElementById('details-title');

    title.textContent = `Struktura Akcjonariatu: ${stock.name} (${symbol})`;
    renderOwnershipPieChart(symbol); // Wywołujemy naszą funkcję do renderowania wykresu

    modal.style.display = 'block';
}

let nextNumberToClick = 1;
const WORK_REWARD = 100;

function updateWorkButtonVisibility() {
    const workBtn = document.getElementById('open-work-btn');
    if (getSkillLevel('work') > 0) {
        workBtn.style.display = 'inline-block';
    } else {
        workBtn.style.display = 'none';
    }
}

function openWorkModal() {
    const workLevel = getSkillLevel('work');
    if (workLevel === 0) return;

    const modal = document.getElementById('work-modal');
    const activePanel = document.getElementById('active-work-panel');
    const passivePanel = document.getElementById('passive-work-panel');
    const companyPanel = document.getElementById('company-panel');
    const separator = document.getElementById('work-separator');

    // Ukrywamy wszystko
    activePanel.style.display = 'none';
    passivePanel.style.display = 'none';
    companyPanel.style.display = 'none';
    separator.style.display = 'none';

    if (workLevel >= 4 && playerCompany) {
        // --- NOWA LOGIKA DLA PANELU FIRMY ---
        companyPanel.style.display = 'block';

        document.getElementById('company-name').textContent = playerCompany.name;
        document.getElementById('company-value').textContent = playerCompany.value.toLocaleString('pl-PL', { maximumFractionDigits: 0 });

        // Aktualizacja dochodu (teraz jest liczony w updateCompanyStatus)
        // Musimy pobrać ostatnio obliczony dochód lub pokazać 0
        const lastCycleIncomeElement = document.getElementById('company-income');
        // Tu można by przechowywać ostatni dochód w playerCompany, na razie 0
        lastCycleIncomeElement.textContent = "0.00"; // Placeholder

        // Lista pracowników
        const employeeList = document.getElementById('employee-list');
        const employeeCountSpan = document.getElementById('employee-count');
        employeeList.innerHTML = '';
        employeeCountSpan.textContent = playerCompany.employees.length;
        if (playerCompany.employees.length > 0) {
            playerCompany.employees.forEach(emp => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';
                li.style.marginBottom = '5px';
                li.style.padding = '3px';
                li.style.borderBottom = '1px dotted #eee';

                const performancePercent = Math.round(emp.performance * 100);
                const moraleText = emp.morale.toFixed(0);
                let statusText = '';
                if (emp.status === 'vacation') statusText = '🏖️';
                else if (emp.status === 'sick') statusText = 'ố';

                li.innerHTML = `
                    <span>${statusText} ${emp.name} (Wyd: ${performancePercent}%, Morale: ${moraleText})</span>
                    <button onclick="fireEmployee(${emp.id})" style="font-size: 11px; padding: 2px 5px; background-color: #ffdddd;">Zwolnij</button>
                `;
                employeeList.appendChild(li);
            });
        } else {
            employeeList.innerHTML = '<li>Brak pracowników.</li>';
        }

        // Lista sprzętu
        const equipmentList = document.getElementById('equipment-list');
        const equipmentCountSpan = document.getElementById('equipment-count');
        const employeeSlotsSpan = document.getElementById('employee-slots-for-equipment');
        equipmentList.innerHTML = '';
        const totalEquipment = playerCompany.equipment.reduce((sum, eq) => sum + eq.quantity, 0);
        equipmentCountSpan.textContent = totalEquipment;
        employeeSlotsSpan.textContent = playerCompany.employees.length; // Max sprzętu = liczba pracowników

        if (playerCompany.equipment.length > 0) {
            playerCompany.equipment.forEach(eq => {
                const li = document.createElement('li');
                li.textContent = `- ${eq.name}: ${eq.quantity} szt.`;
                equipmentList.appendChild(li);
            });
        } else {
            equipmentList.innerHTML = '<li>Brak sprzętu.</li>';
        }

        // Wypełnienie selecta sprzętu
        const equipmentSelect = document.getElementById('equipment-select');
        equipmentSelect.innerHTML = ''; // Wyczyść opcje
        for (const id in EQUIPMENT_TYPES) {
            const eq = EQUIPMENT_TYPES[id];
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${eq.name} (${eq.purchaseCost} PLN)`;
            equipmentSelect.appendChild(option);
        }

        // Dział HR
        const hrLevelSpan = document.getElementById('hr-level');
        const hrReductionSpan = document.getElementById('hr-salary-reduction');
        const hrCostSpan = document.getElementById('hr-upgrade-cost');
        const hrUpgradeBtn = document.getElementById('upgrade-hr-btn');
        const hrCostP = document.getElementById('hr-upgrade-cost-p');

        hrLevelSpan.textContent = playerCompany.hrLevel;
        hrReductionSpan.textContent = `${playerCompany.hrLevel * 5}%`;

        if (playerCompany.hrLevel < 10) {
            const upgradeCost = 5000 * Math.pow(2, playerCompany.hrLevel); // Przykładowy rosnący koszt
            hrCostSpan.textContent = upgradeCost.toLocaleString('pl-PL');
            hrUpgradeBtn.disabled = playerCash < upgradeCost;
            hrUpgradeBtn.style.display = 'inline-block';
            hrCostP.style.display = 'block';
        } else {
            hrCostSpan.textContent = 'MAX';
            hrUpgradeBtn.disabled = true;
            hrUpgradeBtn.style.display = 'none';
            hrCostP.style.display = 'none';
        }

        // Przycisk IPO (bez zmian)
        const ipoBtn = document.getElementById('ipo-btn');
        ipoBtn.disabled = playerCompany.value < 25000;
        // --- KONIEC NOWEJ LOGIKI ---

    } else if (workLevel === 3) {
        // Poziom 3: panel aktywny i pasywny (bez zmian)
        activePanel.style.display = 'block';
        passivePanel.style.display = 'block';
        separator.style.display = 'block';
        startWorkMinigame();
        updatePassiveWorkUI();
    } else {
        // Poziom 1 i 2: panel aktywny (bez zmian)
        activePanel.style.display = 'block';
        startWorkMinigame();
    }
    modal.style.display = 'block';
}

// Nowa funkcja do kupowania wybranego sprzętu
function buySelectedEquipment() {
    const select = document.getElementById('equipment-select');
    if (select.value) {
        buyEquipment(select.value, 1); // Kupujemy jedną sztukę
    }
}

// Nowa funkcja do ulepszania HR
function upgradeHR() {
    if (!playerCompany || playerCompany.hrLevel >= 10) return;
    const upgradeCost = 5000 * Math.pow(2, playerCompany.hrLevel);
    if (playerCash < upgradeCost) {
        alert("Za mało gotówki na ulepszenie HR!");
        return;
    }
    playerCash -= upgradeCost;
    playerCompany.hrLevel++;
    logEvent(`🏢 Ulepszono dział HR do poziomu ${playerCompany.hrLevel}!`);
    displayCash();
    openWorkModal(); // Odśwież widok
}

// Nowe funkcje do obsługi modala zatrudniania
function openHireModal() {
    const modal = document.getElementById('hire-employee-modal');
    document.getElementById('candidate-list').innerHTML = ''; // Wyczyść listę kandydatów
    modal.style.display = 'block';
}

function generateCandidates(contractType) {
    const candidateListDiv = document.getElementById('candidate-list');
    candidateListDiv.innerHTML = ''; // Wyczyść poprzednich
    const candidateCount = 3; // Pokaż 3 kandydatów

    for (let i = 0; i < candidateCount; i++) {
        const isPermanent = contractType === 'permanent';
        const performanceMultiplier = isPermanent ? getRandomInRange(0.9, 1.4) : getRandomInRange(0.7, 1.1); // Lepsza wydajność na stałe
        const salaryMultiplier = isPermanent ? getRandomInRange(1.0, 1.3) : getRandomInRange(0.8, 1.0); // Wyższa pensja na stałe
        const baseSalary = EMPLOYEE_BASE_SALARY;

        const candidate = {
            name: generateEmployeeName(),
            performance: performanceMultiplier,
            salary: baseSalary * salaryMultiplier,
            contractType: contractType
        };

        const card = createCandidateCard(candidate);
        candidateListDiv.appendChild(card);
    }
}

function createCandidateCard(candidate) {
    const card = document.createElement('div');
    card.style.border = "1px solid #ccc";
    card.style.padding = "10px";
    card.style.borderRadius = "5px";
    card.style.width = "160px";
    card.style.textAlign = "center";

    const hrLevel = playerCompany ? playerCompany.hrLevel : 0;
    let performanceText = '??';
    let salaryText = '??';

    // Logika odkrywania statystyk z HR
    if (hrLevel >= 8) { // Wysoki poziom HR odkrywa wszystko
        performanceText = `${Math.round(candidate.performance * 100)}%`;
        salaryText = `${candidate.salary.toFixed(2)} PLN/tydz.`;
    } else if (hrLevel >= 4) { // Średni poziom daje zakresy
        const perfLower = Math.max(70, Math.round(candidate.performance * 100) - 10);
        const perfUpper = Math.min(150, Math.round(candidate.performance * 100) + 10);
        performanceText = `${perfLower}-${perfUpper}%`;
        const salaryLower = Math.max(50, candidate.salary - 15);
        const salaryUpper = candidate.salary + 15;
        salaryText = `${salaryLower.toFixed(0)}-${salaryUpper.toFixed(0)} PLN/tydz.`;
    } else { // Niski poziom daje tylko "gwiazdki" lub ogólniki
        if (candidate.performance > 1.2) performanceText = '⭐⭐⭐ (Wysoka)';
        else if (candidate.performance > 0.9) performanceText = '⭐⭐ (Średnia)';
        else performanceText = '⭐ (Niska)';

        if (candidate.salary > EMPLOYEE_BASE_SALARY * 1.1) salaryText = 'Wysoka';
        else if (candidate.salary < EMPLOYEE_BASE_SALARY * 0.9) salaryText = 'Niska';
        else salaryText = 'Średnia';
    }

    card.innerHTML = `
        <h5 style="margin: 0 0 5px 0;">${candidate.name}</h5>
        <p style="font-size: 12px; margin: 3px 0;">Umowa: ${candidate.contractType === 'permanent' ? 'o Pracę' : 'Zlecenie'}</p>
        <p style="font-size: 12px; margin: 3px 0;">Wydajność: ${performanceText}</p>
        <p style="font-size: 12px; margin: 3px 0;">Pensja: ${salaryText}</p>
        <button onclick='confirmHire(${JSON.stringify(candidate)})' style="margin-top: 10px;">Zatrudnij</button>
    `;
    return card;
}

// Nowa funkcja do potwierdzenia zatrudnienia wybranego kandydata
function confirmHire(candidateData) {
     if (!playerCompany) return;

     // Koszt zatrudnienia = pierwsza pensja
     const hiringCost = candidateData.salary;
     if (playerCash < hiringCost) {
         alert(`Nie stać Cię na zatrudnienie tego pracownika (wymagana pierwsza pensja: ${hiringCost.toFixed(2)} PLN).`);
         return;
     }
     playerCash -= hiringCost;

     const newEmployee = {
        id: Date.now() + Math.random(),
        name: candidateData.name,
        performance: candidateData.performance,
        salary: candidateData.salary,
        morale: getRandomIntInRange(60, 80),
        status: 'working',
        contractType: candidateData.contractType,
        vacationEnds: 0
    };

    playerCompany.employees.push(newEmployee);
    logEvent(`👨‍💼 Zatrudniono nowego pracownika: ${newEmployee.name} (${newEmployee.contractType === 'permanent' ? 'Umowa o Pracę' : 'Zlecenie'}). Zapłacono pierwszą pensję ${hiringCost.toFixed(2)} PLN.`);
    displayCash();

    // Zamknij modal zatrudniania i odśwież panel firmy
    document.getElementById('hire-employee-modal').style.display='none';
    if (document.getElementById('work-modal')?.style.display === 'block') {
        openWorkModal();
    }
}

// Funkcja pomocnicza do odświeżania panelu pasywnego
// Funkcja pomocnicza do odświeżania panelu pasywnego
function updatePassiveWorkUI() {
    const progressBar = document.getElementById('passive-work-progress');
    const rewardInfo = document.getElementById('passive-reward-info');
    const collectBtn = document.getElementById('collect-reward-btn');
    const timerSpan = document.getElementById('passive-work-timer'); // Nowy element

    const progressPercent = (workPassiveProgress / PASSIVE_WORK_INTERVAL) * 100;
    progressBar.value = progressPercent > 100 ? 100 : progressPercent;

    // Nowa logika licznika
    const remainingTime = PASSIVE_WORK_INTERVAL - workPassiveProgress;
    const remainingSeconds = Math.max(0, Math.ceil(remainingTime / 1000));
    if (timerSpan) {
        timerSpan.textContent = remainingSeconds;
    }

    if (progressPercent >= 100) {
        rewardInfo.textContent = "100.00";
        collectBtn.disabled = false;
    } else {
        rewardInfo.textContent = "0.00";
        collectBtn.disabled = true;
    }
}

function startWorkMinigame() {
    const grid = document.getElementById('work-grid');
    grid.innerHTML = '';
    nextNumberToClick = 1;
    document.getElementById('next-number-info').textContent = nextNumberToClick;

    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // --- NOWA LOGIKA: Tasowanie zależy od poziomu ---
    // Poziom 1: Tasujemy liczby
    if (getSkillLevel('work') === 1) {
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
    }
    // Poziom 2 (i wyższe): Liczby pozostają posortowane

    numbers.forEach(num => {
        const cell = document.createElement('button');
        cell.textContent = num;
        cell.style.padding = '20px';
        cell.style.fontSize = '18px';
        cell.style.textAlign = 'center';
        cell.onclick = () => onNumberClick(num);
        grid.appendChild(cell);
    });
}

function onNumberClick(clickedNumber) {
    if (clickedNumber === nextNumberToClick) {
        nextNumberToClick++;
        document.getElementById('next-number-info').textContent = nextNumberToClick;

        const buttons = document.getElementById('work-grid').children;
        for (const btn of buttons) {
            if (parseInt(btn.textContent) === clickedNumber) {
                btn.disabled = true;
                btn.style.backgroundColor = '#28a745';
                btn.style.color = 'white';
            }
        }

        if (nextNumberToClick > 10) {
            // --- NOWA LOGIKA: Nagroda zależy od poziomu ---
            const workLevel = getSkillLevel('work');
            const reward = (workLevel >= 2) ? 200 : 100; // Poziom 2 i wyższe dają 200 PLN

            playerCash += reward;
            logEvent(`✍️ Wykonano zadanie! Otrzymujesz ${reward} PLN.`, 'review');
            displayCash();
            alert(`Dobrze wykonana robota! Otrzymujesz ${reward} PLN.`);

            // Zamykamy modal po wykonaniu zadania
            document.getElementById('work-modal').style.display = 'none';
        }
    }
}

function updateDividendTrackerButtonVisibility() {
    const btn = document.getElementById('open-dividend-tracker-btn');
    if (!btn) return;
    btn.style.display = getSkillLevel('dividendAnalyst') > 0 ? 'inline-block' : 'none';
}

function renderDividendTrackerContent() {
    const body = document.getElementById('dividend-tracker-body');
    if (!body) return;

    body.innerHTML = '';
    const skillLvl = getSkillLevel('dividendAnalyst');

    const dividendStocks = stocks
        .filter(s => (s.dividendPolicy && s.dividendPolicy !== 'Growth') || s.assetType === 'REIT')
        .sort((a, b) => a.dividendTimer - b.dividendTimer);

    if (dividendStocks.length === 0) {
        const row = body.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.textContent = "Brak spółek dywidendowych na rynku lub wymaganego poziomu umiejętności.";
        cell.style.textAlign = "center";
        return;
    }

    dividendStocks.forEach(stock => {
        const row = body.insertRow();
        row.insertCell().textContent = stock.name;
        row.insertCell().textContent = stock.assetType === 'REIT' ? 'REIT (Częsta)' : stock.dividendPolicy;

        // ⏳ Czas do wypłaty
        const timeLeftCell = row.insertCell();
        if (skillLvl >= 2) {
            if (typeof stock.dividendTimer === "number") {
                timeLeftCell.textContent = `${Math.max(0, Math.floor(stock.dividendTimer / 1000))} s`;
            } else {
                timeLeftCell.textContent = "Brak danych";
            }
        } else {
            timeLeftCell.textContent = "Wkrótce";
        }

        // 💰 Szacowana dywidenda
        const estimateCell = row.insertCell();
        if (skillLvl >= 3) {
            if (typeof stock.estimatedDividend === "number") {
                estimateCell.textContent = `${stock.estimatedDividend.toFixed(4)} PLN`;
            } else {
                estimateCell.textContent = "Brak danych";
            }
        } else {
            estimateCell.textContent = "???";
        }
    });
}

function openDividendTrackerModal() {
    const modal = document.getElementById('dividend-tracker-modal');
    renderDividendTrackerContent();
    modal.style.display = 'flex'; // ważne! nie 'block', bo w CSS masz flex
}

function openRescueOfferingModal(offerDetails) {
    const modal = document.getElementById('rescue-offering-modal');
    const message = document.getElementById('rescue-offering-message');

    // Destrukturyzacja obiektu dla łatwiejszego dostępu
    const { targetCompany, sharesOffered, promotionalPrice, totalCost } = offerDetails;

    // Tworzenie treści wiadomości
    message.innerHTML = `Spółka <strong>${targetCompany.name}</strong>, w której masz udziały, jest w tarapatach! <br><br>
        Aby spłacić długi, oferują Ci zakup <strong>${sharesOffered}</strong> nowych akcji po promocyjnej cenie <strong>${promotionalPrice.toFixed(2)} PLN</strong> za sztukę. <br><br>
        Całkowity koszt: <strong>${totalCost.toFixed(2)} PLN</strong>. <br><br>
        Czy chcesz skorzystać z okazji i pomóc firmie?`;

    // Ustawienie akcji dla przycisków
    document.getElementById('accept-rescue-btn').onclick = () => acceptRescueOffer(offerDetails);
    document.getElementById('decline-rescue-btn').onclick = () => declineRescueOffer(offerDetails);

    modal.style.display = 'block';
}

function displayStartups(previousInputValues = {}) {
    const startupPanel = document.getElementById('startup-incubator-panel');
    const startupTableBody = document.getElementById('startup-table-body');
    if (!startupTableBody || !startupPanel) return;

    if (!isSkillUnlocked('startupInvestor')) {
        startupPanel.style.display = 'none';
        return;
    } else {
        startupPanel.style.display = 'block';
    }

    const startups = stocks.filter(s => s.assetType === 'Startup');
    startupTableBody.innerHTML = '';

    startups.forEach(startup => {
        const row = startupTableBody.insertRow();

        // --- POCZĄTEK LOGIKI DLA POZIOMU 3 i 6 ---
        let scamDetectionChance = 0;
        const skillLvl = getSkillLevel('startupInvestor');
        if (skillLvl >= 6) {
            scamDetectionChance = 0.50;
        } else if (skillLvl >= 3) {
            scamDetectionChance = 0.15;
        }

        if (scamDetectionChance > 0 && startup.isScam && !startup.isScamDetected) {
            if (Math.random() < scamDetectionChance) {
                startup.isScamDetected = true;
            }
        }
        // --- KONIEC LOGIKI DLA POZIOMU 3 i 6 ---

        if (startup.isScamDetected) {
            row.style.backgroundColor = '#FFD2D2';
            row.title = 'UWAGA! Ten start-up to prawdopodobnie oszustwo!';
        }

        // Komórka 1: Nazwa
        const nameCell = row.insertCell();
        let nameHTML = `${startup.name} (${startup.symbol})`;
        if (startup.isPrivatized) {
            nameHTML += ` <span title="Projekt sprywatyzowany. Sukces gwarantowany, ale możliwe komplikacje.">🏢</span>`;
        }
        nameHTML += ` <button onclick="openInvestorsModal('${startup.symbol}')" style="margin-left: 10px; padding: 2px 6px; font-size: 12px;">🏆 Ranking</button>`;
        nameCell.innerHTML = nameHTML;

        // Komórka 2: Cel Finansowania
        row.insertCell().textContent = `${startup.fundingGoal.toLocaleString('pl-PL')} PLN`;

        // Komórki 3, 4 i 5
        const fundingCell = row.insertCell();
        const progressCell = row.insertCell();
        const actionsCell = row.insertCell();

        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.placeholder = 'Kwota';
        amountInput.style.width = '80px';
        amountInput.id = `invest-amount-${startup.symbol}`;
        amountInput.value = previousInputValues[startup.symbol] || '';
        const investButton = document.createElement('button');

        switch (startup.stage) {
            case 'funding': {
                fundingCell.innerHTML = `${startup.currentFunding.toFixed(2)} PLN <progress value="${startup.currentFunding}" max="${startup.fundingGoal}" style="width: 100%;"></progress>`;
                progressCell.innerHTML = `<progress value="0" max="100" style="width: 100%;"></progress>`;
                investButton.textContent = 'Zainwestuj';
                investButton.onclick = () => {
                    const amount = parseFloat(amountInput.value);
                    investInStartup(startup.symbol, amount);
                };
                if (startup.isScamDetected || startup.isPrivatized) investButton.disabled = true;

                actionsCell.appendChild(amountInput);
                actionsCell.appendChild(investButton);

                // Przycisk Prywatyzacji (Logika Poziomu 5)
                if (skillLvl >= 5 && !startup.isPrivatized) {
                    const privatizeButton = document.createElement('button');
                    privatizeButton.textContent = '🏢 Prywatyzuj';
                    privatizeButton.title = 'Wykup projekt na wyłączność. Gwarantuje to sukces, ale wprowadza ryzyko dodatkowych kosztów lub opóźnień.';
                    privatizeButton.style.marginLeft = '4px';
                    privatizeButton.onclick = () => privatizeStartup(startup.symbol);
                    actionsCell.appendChild(privatizeButton);
                }

                // Przycisk Auto-inwestycji (ten, który dodawaliśmy ostatnio)
                const autoInvestSettings = playerStartupAutoInvest[startup.symbol];
                const autoInvestButton = document.createElement('button');
                autoInvestButton.textContent = '🔄';
                autoInvestButton.title = 'Ustaw automatyczne inwestowanie';
                autoInvestButton.style.marginLeft = '4px';
                if (autoInvestSettings && autoInvestSettings.isEnabled) {
                    autoInvestButton.style.borderColor = '#28a745';
                    autoInvestButton.style.borderWidth = '2px';
                }
                autoInvestButton.onclick = () => openStartupAutoInvestModal(startup.symbol);
                actionsCell.appendChild(autoInvestButton);

                break;
            }

            case 'development':
                fundingCell.innerHTML = `<strong style="color: #007bff;">W trakcie rozwoju...</strong>`;

                if (startup.pendingExtraCost) {
                    progressCell.innerHTML = `<span style="color: red; font-weight: bold;">WSTRZYMANO</span>`;
                    actionsCell.innerHTML = `<span>Wymaga: ${startup.pendingExtraCost.toFixed(2)} PLN</span>
                                           <button onclick="payExtraStartupCost('${startup.symbol}')">Zapłać</button>`;
                } else if (startup.developmentPausedUntil && Date.now() < startup.developmentPausedUntil) {
                    const timeLeft = Math.ceil((startup.developmentPausedUntil - Date.now()) / 1000);
                    progressCell.innerHTML = `<span style="color: orange;">OPÓŹNIENIE (${timeLeft}s)</span>`;
                    actionsCell.innerHTML = 'Prace wstrzmane';
                } else {
                    progressCell.innerHTML = `<progress value="${startup.developmentProgress}" max="100" style="width: 100%;"></progress>`;
                    actionsCell.innerHTML = 'Zablokowane';
                }
                break;

            case 'financial_complications':
                const timeLeftFC = Math.max(0, Math.floor(startup.rescueTimeLeft / 1000));
                fundingCell.innerHTML = `
                    <strong style="color: #dc3545;">Wymagane dofinansowanie!</strong>
                    <progress value="${startup.rescueCurrent}" max="${startup.rescueGoal}" style="width: 100%;"></progress>
                    <span>${startup.rescueCurrent.toLocaleString('pl-PL')} / ${startup.rescueGoal.toLocaleString('pl-PL')} PLN</span>
                `;
                progressCell.innerHTML = `<strong style="color: #dc3545;">Pozostały czas: ${timeLeftFC}s</strong>`;

                const rescueInput = document.createElement('input');
                rescueInput.type = 'number';
                rescueInput.placeholder = 'Kwota';
                rescueInput.style.width = '80px';
                const rescueButton = document.createElement('button');
                rescueButton.textContent = 'Dofinansuj';
                rescueButton.onclick = () => {
                    const amount = parseFloat(rescueInput.value);
                    playerRescuesStartup(startup.symbol, amount);
                };

                // Pokaż przycisk tylko jeśli gracz jest już inwestorem
                if (playerPortfolio[startup.symbol]) {
                    actionsCell.appendChild(rescueInput);
                    actionsCell.appendChild(rescueButton);
                } else {
                    actionsCell.textContent = 'Tylko dla inwestorów';
                }
                break;



            case 'overfunding': {
                const timeLeftOF = Math.max(0, Math.floor(startup.overfundingTimeLeft / 1000));
                fundingCell.innerHTML = `<strong style="color: #28a745;">Cel osiągnięty!</strong><br>Czas na bonus: ${timeLeftOF}s`;
                progressCell.innerHTML = `<progress value="0" max="100" style="width: 100%;"></progress>`;
                investButton.textContent = 'Zainwestuj (Bonus)';

                // Tworzenie przycisku auto-inwestycji (ten kod jest poprawny)
                const autoInvestSettings = playerStartupAutoInvest[startup.symbol];
                const autoInvestButton = document.createElement('button');
                autoInvestButton.textContent = '🔄'; // Użyłem sugerowanej przez Ciebie emotki
                autoInvestButton.title = 'Ustaw automatyczne inwestowanie';
                autoInvestButton.style.marginLeft = '4px';
                if (autoInvestSettings && autoInvestSettings.isEnabled) {
                    autoInvestButton.style.borderColor = '#28a745'; // Zielona ramka dla aktywnych
                    autoInvestButton.style.borderWidth = '2px';
                }
                autoInvestButton.onclick = () => openStartupAutoInvestModal(startup.symbol); // To też jest potrzebne!

                investButton.onclick = () => {
                    const amount = parseFloat(amountInput.value);
                    investInStartup(startup.symbol, amount);
                };

                if (startup.isScamDetected) investButton.disabled = true;

                // Dodawanie elementów do komórki
                actionsCell.appendChild(amountInput);
                actionsCell.appendChild(investButton);
                actionsCell.appendChild(autoInvestButton);

                break;
            }
        }

        // Ubezpieczenie (Logika Poziomu 4)
        const holding = playerPortfolio[startup.symbol];
        if ((startup.stage === 'funding' || startup.stage === 'overfunding') && skillLvl >= 4 && holding && !holding.isInsured && !startup.isScamDetected) {
            const insuranceButton = document.createElement('button');
            insuranceButton.textContent = '🛡️ Ubezpiecz';
            insuranceButton.title = 'Koszt: 5% Twojej dotychczasowej inwestycji';
            insuranceButton.style.marginLeft = '4px';
            insuranceButton.onclick = () => buyStartupInsurance(startup.symbol);
            actionsCell.appendChild(insuranceButton);
        }
    });
}

function openInvestorsModal(symbol) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || !startup.investors) return;

    const modal = document.getElementById('investors-modal');
    const title = document.getElementById('investors-modal-title');
    const tableBody = document.getElementById('investors-table-body');

    title.textContent = `Ranking Inwestorów: ${startup.name}`;
    tableBody.innerHTML = ''; // Wyczyść poprzednią zawartość

    // Przekształcamy obiekt inwestorów w tablicę i sortujemy
    const sortedInvestors = Object.entries(startup.investors)
        .sort(([, a], [, b]) => b - a); // Sortuj malejąco po kwocie

    if (sortedInvestors.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Brak inwestorów.</td></tr>';
    } else {
        sortedInvestors.forEach(([name, amount], index) => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = `#${index + 1}`;
            row.insertCell().textContent = name;
            row.insertCell().textContent = `${amount.toLocaleString('pl-PL')} PLN`;

            if (name === "Ty (Gracz)") {
                row.style.fontWeight = 'bold';
                row.style.backgroundColor = '#E3F2FD'; // Lekkie podświetlenie dla gracza
            }
        });
    }

    modal.style.display = 'block';
}

function getCurrentStartupInputValues() {
    const values = {};
    const startups = stocks.filter(s => s.assetType === 'Startup');
    startups.forEach(startup => {
        const inputElement = document.getElementById(`invest-amount-${startup.symbol}`);
        if (inputElement) {
            values[startup.symbol] = inputElement.value;
        }
    });
    return values;
}

function displayInvestmentPool() {
    const totalFundsEl = document.getElementById('pool-total-funds');
    const timerEl = document.getElementById('pool-timer');
    const contributorsListEl = document.getElementById('pool-contributors-list');

    if (!totalFundsEl) return; // Panel nie istnieje, nic nie rób

    totalFundsEl.textContent = `${investmentPool.totalFunds.toLocaleString('pl-PL')} PLN`;
    timerEl.textContent = `${Math.floor(investmentPool.investmentTimer / 1000)}`;

    contributorsListEl.innerHTML = '';
    const contributors = Object.entries(investmentPool.contributors);

    if (contributors.length === 0) {
        contributorsListEl.textContent = 'Brak wpłat w tej rundzie.';
    } else {
        // Prosta wizualizacja w formie pasków
        contributors.forEach(([id, amount]) => {
            const percentage = (amount / investmentPool.totalFunds) * 100;
            const name = id === 'player' ? 'Ty (Gracz)' : aiCompetitors.find(a => a.id === id)?.name || 'Nieznany AI';

            const barContainer = document.createElement('div');
            barContainer.style.marginBottom = '5px';
            barContainer.innerHTML = `
                <span>${name}: ${amount.toLocaleString('pl-PL')} PLN</span>
                <div style="width: 100%; background-color: #eee;">
                    <div style="width: ${percentage}%; background-color: #007bff; color: white; text-align: right; padding-right: 5px; box-sizing: border-box;">
                        ${percentage.toFixed(1)}%
                    </div>
                </div>
            `;
            contributorsListEl.appendChild(barContainer);
        });
    }

    // Na końcu dodaj tę linię:
    updateAutoInvestStatus();
}

// --- NOWY FRAGMENT - FUNKCJE DLA MODALA AUTO-INWESTOWANIA ---

function updateAutoInvestStatus() {
    const statusEl = document.getElementById('autoinvest-status');
    if (!statusEl) return;

    if (playerAutoInvest.isEnabled) {
        statusEl.innerHTML = `✅ Aktywne: <strong>${playerAutoInvest.amount} PLN</strong> co <strong>${playerAutoInvest.interval / 1000}s</strong>`;
        statusEl.style.color = '#28a745';
    } else {
        statusEl.textContent = '❌ Nieaktywne';
        statusEl.style.color = '#dc3545';
    }
}

function setupAutoInvestModal() {
    const modal = document.getElementById('autoinvest-modal');
    const openBtn = document.getElementById('open-autoinvest-modal-btn');
    const amountInput = document.getElementById('autoinvest-amount');
    const intervalSlider = document.getElementById('autoinvest-interval');
    const intervalValueSpan = document.getElementById('autoinvest-interval-value');
    const toggleBtn = document.getElementById('toggle-autoinvest-btn');

    if (!modal || !openBtn) return;

    openBtn.onclick = () => {
        // Wypełnij modal aktualnymi danymi
        amountInput.value = playerAutoInvest.amount;
        intervalSlider.value = playerAutoInvest.interval / 1000;
        intervalValueSpan.textContent = `${intervalSlider.value}s`;
        updateToggleButton();
        modal.style.display = 'block';
    };

    amountInput.onchange = () => {
        playerAutoInvest.amount = Math.max(10, amountInput.valueAsNumber); // Minimalna kwota 10
        updateAutoInvestStatus();
    };

    intervalSlider.oninput = () => {
        playerAutoInvest.interval = intervalSlider.value * 1000;
        intervalValueSpan.textContent = `${intervalSlider.value}s`;
        updateAutoInvestStatus();
    };

    toggleBtn.onclick = () => {
        playerAutoInvest.isEnabled = !playerAutoInvest.isEnabled;
        if (playerAutoInvest.isEnabled) {
            // Po włączeniu, zresetuj timer, aby pierwsza wpłata była od razu po ustawionym czasie
            playerAutoInvest.timer = playerAutoInvest.interval;
        }
        updateToggleButton();
        updateAutoInvestStatus();
    };

    function updateToggleButton() {
        if (playerAutoInvest.isEnabled) {
            toggleBtn.textContent = 'Wyłącz Automatyzację';
            toggleBtn.style.backgroundColor = '#dc3545';
        } else {
            toggleBtn.textContent = 'Włącz Automatyzację';
            toggleBtn.style.backgroundColor = '#28a745';
        }
    }
}

let toastTimer = null;

function showToast(message, type = 'default', duration = 3000) {
    const toastElement = document.getElementById('toast-notification');
    if (!toastElement) return;

    // Anuluj poprzedni timer, jeśli powiadomienie jest aktywne
    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    // Ustaw tekst i odpowiednią klasę stylu
    toastElement.textContent = message;
    toastElement.className = ''; // Resetuj klasy
    if (type !== 'default') {
        toastElement.classList.add(`toast-${type}`);
    }

    // Pokaż powiadomienie
    toastElement.style.display = 'block';

    // Ustaw timer do ukrycia powiadomienia
    toastTimer = setTimeout(() => {
        toastElement.style.display = 'none';
        toastTimer = null;
    }, duration);
}

function openStartupOfferModal(offerDetails) {
    const { startup, offer } = offerDetails;
    const modal = document.getElementById('startup-offer-modal');
    if (!modal) return;

    document.getElementById('startup-offer-title').textContent = `Oferta Specjalna od ${startup.name}!`;
    document.getElementById('startup-offer-message').textContent = offer.offerText;
    document.getElementById('startup-offer-amount').value = '';

    const acceptBtn = document.getElementById('accept-startup-offer-btn');
    const declineBtn = document.getElementById('decline-startup-offer-btn');

    // Klonujemy przycisk akceptacji, aby usunąć stare event listenery
    const newAcceptBtn = acceptBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);

    newAcceptBtn.onclick = () => {
        const amount = document.getElementById('startup-offer-amount').valueAsNumber;
        if (isNaN(amount) || amount <= 0) {
            alert("Proszę wpisać poprawną, dodatnią kwotę inwestycji.");
            return;
        }
        acceptStartupOffer(startup.symbol, amount, offer.type, offer.value);
    };

    declineBtn.onclick = () => {
        logEvent(`Odrzucono ofertę specjalną od ${startup.name}.`, 'review');
        modal.style.display = 'none';
    };

    modal.style.display = 'block';
}

function openStartupAutoInvestModal(symbol) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup) return;

    const modal = document.getElementById('startup-autoinvest-modal');

    // Upewnij się, że mamy obiekt ustawień dla tego startupu
    if (!playerStartupAutoInvest[symbol]) {
        playerStartupAutoInvest[symbol] = {
            isEnabled: false,
            amount: 100,
            interval: 30000,
            timer: 30000
        };
    }
    const settings = playerStartupAutoInvest[symbol];

    // Pobierz elementy z modala
    document.getElementById('startup-autoinvest-title').textContent = `🤖 Auto-inwestowanie: ${startup.name}`;
    const amountInput = document.getElementById('startup-autoinvest-amount');
    const intervalSlider = document.getElementById('startup-autoinvest-interval');
    const intervalValueSpan = document.getElementById('startup-autoinvest-interval-value');
    const toggleBtn = document.getElementById('toggle-startup-autoinvest-btn');

    // Wypełnij modal aktualnymi danymi
    amountInput.value = settings.amount;
    intervalSlider.value = settings.interval / 1000;
    intervalValueSpan.textContent = `${intervalSlider.value}s`;

    // Funkcja do aktualizacji przycisku włącz/wyłącz
    function updateToggleButton() {
        if (settings.isEnabled) {
            toggleBtn.textContent = 'Wyłącz Automatyzację';
            toggleBtn.style.backgroundColor = '#dc3545';
        } else {
            toggleBtn.textContent = 'Włącz Automatyzację';
            toggleBtn.style.backgroundColor = '#28a745';
        }
    }
    updateToggleButton();

    // Ustaw eventy dla kontrolek
    amountInput.onchange = () => {
        settings.amount = Math.max(10, amountInput.valueAsNumber);
    };

    intervalSlider.oninput = () => {
        settings.interval = intervalSlider.value * 1000;
        intervalValueSpan.textContent = `${intervalSlider.value}s`;
    };

    toggleBtn.onclick = () => {
        settings.isEnabled = !settings.isEnabled;
        if (settings.isEnabled) {
            settings.timer = settings.interval; // Resetuj timer po włączeniu
        }
        updateToggleButton();
        displayStartups(getCurrentStartupInputValues()); // Odśwież tabelę, by pokazać zieloną ramkę
    };

    modal.style.display = 'block';
}

function updateChartTypeButtons() {
    const candlestickBtn = document.getElementById('chart-type-candlestick-btn');
    const lineBtn = document.getElementById('chart-type-line-btn');

    if (candlestickBtn && lineBtn) {
        if (playerChartSettings.type === 'candlestick') {
            candlestickBtn.style.borderColor = '#007bff'; // Aktywny
            lineBtn.style.borderColor = 'transparent'; // Nieaktywny
        } else {
            candlestickBtn.style.borderColor = 'transparent';
            lineBtn.style.borderColor = '#007bff';
        }
    }
}

function openStockDetailModal(stockSymbol) {
    const stock = stocks.find(s => s.symbol === stockSymbol);
    if (!stock) {
        return;
    }

    const modal = document.getElementById('stock-detail-modal');
    modal.style.display = 'block';

    document.getElementById('stock-detail-name').textContent = stock.name;
    document.getElementById('stock-detail-symbol').textContent = stock.symbol;
    document.getElementById('stock-detail-price').textContent = `Cena: ${stock.price.toFixed(2)} PLN`;
    document.getElementById('stock-detail-volatility').textContent = `Zmienność: ${stock.volatilityFactor.toFixed(2)}`;
    document.getElementById('stock-detail-sector').textContent = `Sektor: ${stock.sector.join(', ')}`;
    document.getElementById('stock-detail-ceo').textContent = `CEO: ${stock.ceo}`;
    document.getElementById('stock-detail-desc').textContent = stock.description;

    const chartContainer = document.getElementById('stock-chart-svg');
    renderChartSVGForStock(stock, chartContainer, 400, 200); // Rysuj wykres przy otwarciu

    // --- NOWY FRAGMENT - OBSŁUGA PRZYCISKÓW WYKRESÓW ---
    const candlestickBtn = document.getElementById('chart-type-candlestick-btn');
    const lineBtn = document.getElementById('chart-type-line-btn');

    if (candlestickBtn) {
        candlestickBtn.onclick = () => {
            playerChartSettings.type = 'candlestick';
            updateChartTypeButtons();
            renderChartSVGForStock(stock, chartContainer, 400, 200);
        };
    }
    if (lineBtn) {
        lineBtn.onclick = () => {
            playerChartSettings.type = 'line';
            updateChartTypeButtons();
            renderChartSVGForStock(stock, chartContainer, 400, 200);
        };
    }
    updateChartTypeButtons(); // Ustaw początkowe zaznaczenie
    // --- KONIEC NOWEGO FRAGMENTU ---
}

// Ta funkcja jest zduplikowana w obu plikach, ale jest identyczna. Zostawiamy jedną.
function updateChartTypeButtons() {
    const candlestickBtn = document.getElementById('chart-type-candlestick-btn');
    const lineBtn = document.getElementById('chart-type-line-btn');

    if (!candlestickBtn || !lineBtn) return;

    // Zresetuj style obu przycisków
    candlestickBtn.style.backgroundColor = 'transparent';
    lineBtn.style.backgroundColor = 'transparent';
    candlestickBtn.style.border = '2px solid transparent';
    lineBtn.style.border = '2px solid transparent';

    // Ustaw styl dla aktywnego przycisku
    if (playerChartSettings.type === 'candlestick') {
        candlestickBtn.style.backgroundColor = '#e0e0e0';
        candlestickBtn.style.border = '2px solid #007bff';
    } else {
        lineBtn.style.backgroundColor = '#e0e0e0';
        lineBtn.style.border = '2px solid #007bff';
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');

    // Zapisz wybór w pamięci przeglądarki
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

function openDescriptionModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;
    console.log(`[MODAL_DESC] Otwieranie opisu dla: ${symbol}`, stock);

    const modal = document.getElementById('description-modal');
    document.getElementById('description-modal-title').textContent = `${stock.name} (${stock.symbol})`;
    document.getElementById('description-modal-content').innerHTML = assembleDescription(stock);

    const phaseInfoDiv = document.getElementById('description-modal-phase'); // Potrzebny nowy div w HTML
    console.log(`[MODAL_DESC] ${symbol} - Wartość stock.corporatePhase:`, stock.corporatePhase);
    if (phaseInfoDiv && stock.corporatePhase) {
         phaseInfoDiv.innerHTML = `<strong>Faza cyklu życia:</strong> ${stock.corporatePhase}`;
         // Można dodać kolorowanie w zależności od fazy
         if(stock.corporatePhase === CORPORATE_PHASES.GOLDEN_YEAR || stock.corporatePhase === CORPORATE_PHASES.GROWTH) phaseInfoDiv.style.color = '#28a745';
         else if(stock.corporatePhase === CORPORATE_PHASES.DECLINE || stock.corporatePhase === CORPORATE_PHASES.SHADOW_DESCENT) phaseInfoDiv.style.color = '#dc3545';
         else phaseInfoDiv.style.color = ''; // Domyślny kolor

         phaseInfoDiv.style.display = 'block';
    } else if (phaseInfoDiv) {
        phaseInfoDiv.style.display = 'none';
        console.log(`[MODAL_DESC] ${symbol} - Ukrywanie sekcji fazy (brak elementu lub brak danych)`);
    }

    const ceoInfoDiv = document.getElementById('description-modal-ceo');
    ceoInfoDiv.innerHTML = ''; // Wyczyśćmy na start

    if (stock.ceo && stock.ceo.name) {
        const tenureYears = Math.floor(stock.ceo.tenure / 4);
        let ceoHTML = `
            <div style="text-align: center; margin-bottom: 10px;">
                <h3 style="margin: 0;">${stock.ceo.name}</h3>
                <p style="margin: 5px 0; font-size: 12px; color: #666;">Wiek: ${stock.ceo.age}, Staż w firmie: ${tenureYears} lat</p>
            </div>
        `;
        if (stock.ceo.traits && stock.ceo.traits.length > 0) {
            ceoHTML += `<h4>Cechy:</h4><div class="ceo-traits-container">`;
            stock.ceo.traits.forEach(trait => {
                const traitData = ceoTraits[trait.id];
                if (traitData) {
                    ceoHTML += `<span class="ceo-trait" style="background-color: ${traitData.color};" title="${traitData.description}">${traitData.name}</span>`;
                }
            });
            ceoHTML += '</div>';
        }
        ceoInfoDiv.innerHTML = ceoHTML;
        ceoInfoDiv.style.display = 'block';
    } else {
        ceoInfoDiv.style.display = 'none';
    }

    const analyticalDiv = document.getElementById('description-modal-analytical');
    analyticalDiv.innerHTML = '';
    let indicatorsHTML = '<h4>Kluczowe Wskaźniki Finansowe:</h4>';
    let indicatorsAdded = false;

    console.log(`[MODAL_DESC] ${symbol} - Dane do wskaźników: balanceSheet=`, stock.balanceSheet, `quarterlyEarnings=`, stock.quarterlyEarnings, `totalShares=`, stock.totalShares);

    // Sprawdzamy, czy spółka ma zaimplementowany bilans
    if (stock.balanceSheet && stock.balanceSheet.assets > 0) {
        // 1. Kapitalizacja Rynkowa
        const marketCap = stock.price * stock.totalShares;
        indicatorsHTML += `<p><strong>Kapitalizacja rynkowa:</strong> ${marketCap.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>`;

        // 2. Wskaźnik Ceny do Zysku (C/Z, P/E)
        const earningsPerShare = stock.quarterlyEarnings / stock.totalShares;
        let peRatio_display = "N/A"; // Domyślna wartość (Not Applicable)
        if (earningsPerShare > 0) {
            const peRatio = stock.price / earningsPerShare;
            peRatio_display = peRatio.toFixed(2);
        } else if (stock.quarterlyEarnings < 0) {
            peRatio_display = "Strata";
        }
        indicatorsHTML += `<p><strong>Cena/Zysk (C/Z):</strong> ${peRatio_display}</p>`;

        // 3. Wskaźnik Aktywów do Pasywów
        let assetsToLiabilities_display = "∞"; // Nieskończoność, jeśli brak długu
        if (stock.balanceSheet.liabilities > 0) {
            const ratio = stock.balanceSheet.assets / stock.balanceSheet.liabilities;
            assetsToLiabilities_display = ratio.toFixed(2);
        }
        indicatorsHTML += `<p><strong>Aktywa / Pasywa:</strong> ${assetsToLiabilities_display}</p>`;

        indicatorsAdded = true;
        console.log(`[MODAL_DESC] ${symbol} - Wskaźniki obliczone.`); // <--- LOG 4
    } else {
        console.log(`[MODAL_DESC] ${symbol} - Warunki do obliczenia wskaźników niespełnione.`); // <--- LOG 5
    }

    if (indicatorsAdded) {
        analyticalDiv.innerHTML = indicatorsHTML;
        analyticalDiv.style.display = 'block';
    } else {
        analyticalDiv.style.display = 'none';
        console.log(`[MODAL_DESC] ${symbol} - Ukrywanie sekcji wskaźników.`); // <--- LOG 6
    }
    // --- KONIEC NOWEJ LOGIKI WSKAŹNIKÓW ---

    const researchInfoDiv = document.getElementById('description-modal-research');
    if (stock.research && stock.research.isResearching && stock.research.currentTech) {
        const techName = technologies[stock.research.currentTech].name;
        researchInfoDiv.innerHTML = `🔬 Aktualnie w fazie R&D: <strong>${techName}</strong>`;
        researchInfoDiv.style.display = 'block';
    } else {
        researchInfoDiv.style.display = 'none';
    }

    modal.style.display = 'block';
}

function updateStateOfferInfo() {
    const select = document.getElementById('state-company-select');
    const quantityInput = document.getElementById('state-offer-quantity');
    const costLabel = document.getElementById('state-offer-cost');
    const cooldownLabel = document.getElementById('state-offer-cooldown');

    // Dodajemy sprawdzenie, czy elementy istnieją, na wypadek gdyby HTML bazy (ui.js) ich nie miał
    if (!select || !quantityInput || !costLabel || !cooldownLabel) return;

    if (!select.value) {
        costLabel.textContent = "0.00 PLN";
        cooldownLabel.textContent = "Wybierz spółkę.";
        return;
    }

    const stock = stocks.find(s => s.symbol === select.value);
    const quantity = quantityInput.valueAsNumber || 0;

    // Obliczanie ceny z premią
    const exchangeLevel = exchanges[stock.exchange].level;
    let premium = 1.10; // Domyślna premia 10%
    if (exchangeLevel >= 3) premium = 1.25; // Giełda Złota i wyżej: 25%
    else if (exchangeLevel >= 2) premium = 1.20; // Giełda Srebrna: 20%
    else if (exchangeLevel >= 1) premium = 1.15; // Giełda Brązowa: 15%

    const offerPrice = stock.price * premium;
    costLabel.textContent = `${(offerPrice * quantity).toFixed(2)} PLN (cena za akcję: ~${offerPrice.toFixed(2)} PLN)`;

    // Sprawdzanie cooldownu
    if (stock.stateOfferCooldownUntil && Date.now() < stock.stateOfferCooldownUntil) {
        const remainingTime = Math.ceil((stock.stateOfferCooldownUntil - Date.now()) / 1000); // POPRAWIONA LINIA
        cooldownLabel.textContent = `Następna oferta dla tej spółki możliwa za: ${remainingTime}s`;
        document.getElementById('state-offer-controls').style.opacity = '0.5';
    } else {
        cooldownLabel.textContent = '';
        document.getElementById('state-offer-controls').style.opacity = '1';
    }
}

function setPriceAlert(symbol, type) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const inputId = type === 'buy' ? 'price-alert-buy' : 'price-alert-sell';
    const value = document.getElementById(inputId).valueAsNumber;

    if (isNaN(value)) { // Jeśli pole jest puste, usuń alert
        stock.priceAlerts[type] = null;
    } else if (value <= 0) {
        alert("Cena musi być dodatnia!");
        return;
    } else {
        stock.priceAlerts[type] = value;
    }

    document.getElementById('price-alert-modal').style.display = 'none';
    // Ponowne narysowanie wykresu, aby pokazać/ukryć linie
    showPriceHistoryModal(symbol);
}

function openPriceAlertModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const modal = document.getElementById('price-alert-modal');
    document.getElementById('price-alert-title').textContent = `Alerty dla: ${stock.name}`;
    document.getElementById('price-alert-current-price').textContent = stock.price.toFixed(2) + " PLN";

    // Wypełnij pola obecnymi wartościami alertów
    const buyInput = document.getElementById('price-alert-buy');
    const sellInput = document.getElementById('price-alert-sell');
    buyInput.value = stock.priceAlerts.buy || '';
    sellInput.value = stock.priceAlerts.sell || '';

    // Ustaw akcje dla przycisków
    document.getElementById('set-buy-alert-btn').onclick = () => setPriceAlert(symbol, 'buy');
    document.getElementById('set-sell-alert-btn').onclick = () => setPriceAlert(symbol, 'sell');

    modal.style.display = 'block';
}

function openResearchModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock || !stock.researchUnlocks) {
        console.error("Błąd: Próbowano otworzyć panel R&D dla spółki, która go nie obsługuje.", stock);
        return;
    }

    const modal = document.getElementById('research-modal');
    modal.dataset.currentSymbol = symbol;
    document.getElementById('research-modal-title').textContent = `🔬 Panel R&D: ${stock.name}`;

    const unlocks = stock.researchUnlocks;
    const research = stock.research;
    const specializations = ["wzmacnianie rozwoju", "wzmacnianie pozycji na rynku", "wzmacnianie ceny i zysków"];

    const tier1_locked = document.getElementById('rd-tier1-locked');
    const tier1_unlocked = document.getElementById('rd-tier1-unlocked');
    const tier2_section = document.getElementById('rd-tier2-section');
    const tier2_locked = document.getElementById('rd-tier2-locked');
    const tier2_unlocked = document.getElementById('rd-tier2-unlocked');
    const tier3_section = document.getElementById('rd-tier3-section');
    const tier3_locked = document.getElementById('rd-tier3-locked');
    const tier3_unlocked = document.getElementById('rd-tier3-unlocked');
    const tier4_section = document.getElementById('rd-tier4-section');
    const tier4_locked = document.getElementById('rd-tier4-locked');
    const tier4_unlocked = document.getElementById('rd-tier4-unlocked');
    const tier5_section = document.getElementById('rd-tier5-section');
    const tier5_locked = document.getElementById('rd-tier5-locked');
    const tier5_unlocked = document.getElementById('rd-tier5-unlocked');

    // --- TIER 1 ---
    if (unlocks.canSeeSpecialization) {
        tier1_locked.style.display = 'none';
        tier1_unlocked.style.display = 'block';
        document.getElementById('rd-specialization-name').textContent = research.specialization;
        tier2_section.style.display = 'block';
    } else {
        tier1_locked.style.display = 'block';
        tier1_unlocked.style.display = 'none';
        document.getElementById('rd-unlock-tier1-btn').onclick = () => unlockResearchTier(symbol, 'canSeeSpecialization', 1000);
        tier2_section.style.display = 'none';
    }

    // --- TIER 2 ---
    if (unlocks.canSeeResults) {
        tier2_locked.style.display = 'none';
        tier2_unlocked.style.display = 'block';
        const tech = technologies[research.currentTech];
        document.getElementById('rd-current-tech-details-name').textContent = tech ? tech.name : "Brak";
        document.getElementById('rd-tech-effect-desc').textContent = tech ? tech.description : "Firma nie prowadzi badań.";
        tier3_section.style.display = 'block';
    } else {
        tier2_locked.style.display = 'block';
        tier2_unlocked.style.display = 'none';
        document.getElementById('rd-unlock-tier2-btn').onclick = () => unlockResearchTier(symbol, 'canSeeResults', 2500);
        tier3_section.style.display = 'none';
    }

    // --- TIER 3 ---
    if (unlocks.canFund) {
        tier3_locked.style.display = 'none';
        tier3_unlocked.style.display = 'block';
        document.getElementById('rd-fund-btn').onclick = () => fundResearch(symbol);
        tier4_section.style.display = 'block';
    } else {
        tier3_locked.style.display = 'block';
        tier3_unlocked.style.display = 'none';
        document.getElementById('rd-unlock-tier3-btn').onclick = () => unlockResearchTier(symbol, 'canFund', 5000);
        tier4_section.style.display = 'none';
    }

    // --- TIER 4 ---
    if (unlocks.canInfluence) {
        tier4_locked.style.display = 'none';
        tier4_unlocked.style.display = 'block';
        const specSelect = document.getElementById('rd-specialization-select');
        specSelect.innerHTML = '';
        specializations.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec;
            option.textContent = spec;
            if (spec === research.specialization) option.selected = true;
            specSelect.appendChild(option);
        });
        document.getElementById('rd-change-spec-btn').onclick = () => changeResearchSpecialization(symbol);
        tier5_section.style.display = 'block';
    } else {
        tier4_locked.style.display = 'block';
        tier4_unlocked.style.display = 'none';
        document.getElementById('rd-unlock-tier4-btn').onclick = () => unlockResearchTier(symbol, 'canInfluence', 10000);
        tier5_section.style.display = 'none';
    }

    // --- TIER 5 ---
    if (unlocks.canInterfere) {
        tier5_locked.style.display = 'none';
        const canShowChoice = research.isResearching && !research.currentTech;
        if (canShowChoice) {
            tier5_unlocked.style.display = 'block';
            const choiceContainer = document.getElementById('rd-tech-choice-container');
            choiceContainer.innerHTML = 'Firma czeka na Twoją decyzję...';
            // Pozostała logika (znajdowanie 2 opcji) bez zmian
        } else {
            tier5_unlocked.style.display = 'none';
        }
    } else {
        tier5_locked.style.display = 'block';
        tier5_unlocked.style.display = 'none';
        document.getElementById('rd-unlock-tier5-btn').onclick = () => unlockResearchTier(symbol, 'canInterfere', 20000);
    }

    modal.style.display = 'block';
}

function openCeoChoiceModal(symbol, candidates, successChance) {
    const modal = document.getElementById('ceo-choice-modal');
    const container = document.getElementById('ceo-candidates-container');

    document.getElementById('ceo-choice-title').textContent = `Wybierz kandydata na nowego prezesa dla ${symbol}`;
    container.innerHTML = '';

    candidates.forEach((candidate, index) => {
        const card = document.createElement('div');
        card.style.border = "1px solid #ccc";
        card.style.borderRadius = "8px";
        card.style.padding = "15px";
        card.style.textAlign = "center";
        card.style.flex = "1";

        let traitsHTML = '';
        if (candidate.traits && candidate.traits.length > 0) {
            candidate.traits.forEach(trait => {
                const traitData = ceoTraits[trait.id];
                if (traitData) {
                    traitsHTML += `<span class="ceo-trait" style="background-color: ${traitData.color}; margin: 2px;" title="${traitData.description}">${traitData.name}</span>`;
                }
            });
        } else {
            traitsHTML = '<p style="font-size: 12px; color: #888;">Brak wyróżniających cech</p>';
        }

        const tenureYears = Math.floor(candidate.tenure / 4);
        card.innerHTML = `
            <h4 style="margin: 0 0 5px 0;">${candidate.name}</h4>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">Wiek: ${candidate.age}, Doświadczenie: ${tenureYears} lat</p>
            <div class="ceo-traits-container" style="margin-top: 10px; min-height: 50px;">${traitsHTML}</div>
            <button onclick="confirmCeoChange('${symbol}', ${index})">Zatwierdź Kandydata</button>
            <p style="margin-top: 10px; font-weight: bold; font-size: 14px;">Szansa: ${(successChance * 100).toFixed(0)}%</p>
        `;
        container.appendChild(card);
    });

    modal.style.display = 'block';
}

/**
* Otwiera modal ustawień.
*/
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Zamyka modal ustawień.
 */
function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}



function openCityInvestmentModal() {
    const modal = document.getElementById('city-investment-modal');
    if (!modal) return;
    
    // Zawsze wywołuj aktualizację danych
    updateCityModalContent(); 

    modal.style.display = 'block';
}

/**
 * Aktualizuje TYLKO DANE TEKSTOWE wewnątrz okna miasta (bez przebudowywania HTML).
 */
function updateCityModalContent() {
    const modal = document.getElementById('city-investment-modal');
    if (!modal || modal.style.display !== 'block') {
        return; // Nie aktualizuj, jeśli niewidoczne
    }

    const festivalContent = modal.querySelector('#city-content-festival');
    const tabsContainer = modal.querySelector('.bank-tabs');
    
    // Sprawdź, czy trwa festyn
    if (festival && festival.isActive) {
        // --- WIDOK FESTYNU ---
        tabsContainer.style.display = 'none'; // Ukryj zakładki
        // Ukryj wszystkie normalne treści zakładek
        document.querySelectorAll('#city-investment-modal .bank-tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        festivalContent.style.display = 'block'; // Pokaż kontener festynu
        renderFestivalView(festivalContent); // Przekaż kontener do funkcji renderującej festyn

    } else {
        // --- WIDOK STANDARDOWY (ZAKŁADKI) ---
        festivalContent.style.display = 'none'; // Ukryj festyn
        tabsContainer.style.display = 'flex'; // Pokaż zakładki

        // Aktualizuj zakładkę "Panel Główny"
        document.getElementById('city-budget-display').textContent = `${city.budget.toLocaleString('pl-PL')} PLN`;
        document.getElementById('city-population-display').textContent = city.population.toLocaleString('pl-PL');
        document.getElementById('city-infra-level').textContent = (city.infrastructureLevel * 100).toFixed(0) + '%';
        // Odliczanie festynu
        const countdownSeconds = Math.max(0, Math.floor(nextFestivalCountdown / 1000));
        const minutes = Math.floor(countdownSeconds / 60);
        const seconds = countdownSeconds % 60;
        document.getElementById('next-festival-countdown').textContent = nextFestivalCountdown > 0 ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : "Wkrótce...";
        
        // Zarząd
        document.getElementById('city-election-timer').textContent = city.mayor.electionYear;
        document.getElementById('city-mayor-name').textContent = city.mayor.name;
        document.getElementById('city-mayor-policy').textContent = city.mayor.policy; // TODO: Przetłumaczyć
        
        // Wkład gracza
        document.getElementById('city-total-donated').textContent = `${city.playerDonatedAmount.toFixed(2)} PLN`; // Użyj nowego pola
        const statusEl = document.getElementById('city-unlock-status');
        if (city.playerHasUnlocked) {
            statusEl.textContent = "Odblokowane!";
            statusEl.style.color = '#28a745';
        } else {
            statusEl.textContent = `Zablokowane (Cel: 10,000 PLN)`;
            statusEl.style.color = '#dc3545';
        }

        // Aktualizuj zakładkę "Spółki Miejskie"
        const municipalList = document.getElementById('city-municipal-list');
        municipalList.innerHTML = '';
        if (municipalCompanies.length > 0) {
            municipalCompanies.forEach(comp => {
                municipalList.innerHTML += `
                    <tr>
                        <td>${comp.name}</td>
                        <td>${comp.type}</td>
                        <td>${comp.budget.toLocaleString('pl-PL')} PLN</td>
                        <td>${comp.baseIncome.toLocaleString('pl-PL')} PLN</td>
                    </tr>`;
            });
        } else {
            municipalList.innerHTML = '<tr><td colspan="4">Wszystkie spółki miejskie weszły na giełdę.</td></tr>';
        }
        
        // Aktualizuj zakładkę "Firmy Prywatne"
        const privateList = document.getElementById('city-private-list');
        privateList.innerHTML = '';
        if (privateCompanies.length > 0) {
            privateCompanies.forEach(comp => {
                privateList.innerHTML += `
                    <tr>
                        <td>${comp.name}</td>
                        <td>${comp.value.toLocaleString('pl-PL')} PLN</td>
                        <td>${(comp.cityOwnership * 100).toFixed(1)}%</td>
                        <td><progress value="${comp.developmentProgress}" max="100"></progress></td>
                    </tr>`;
            });
        } else {
             privateList.innerHTML = '<tr><td colspan="4">Brak firm prywatnych w mieście.</td></tr>';
        }
        
        // Pokaż aktywną zakładkę (nie festyn)
        const activeTab = document.querySelector('#city-investment-modal .bank-tab-btn.active');
        const activeTabId = activeTab ? activeTab.id.replace('tab-btn-city-', 'city-content-') : 'city-content-main';
        document.getElementById(activeTabId).style.display = 'block';
    }
}



function renderFestivalView(festivalContainer) {
    if (!festival || !festival.isActive) {
        festivalContainer.innerHTML = '<p>Błąd: Festyn nie jest aktywny.</p>';
        return;
    }
    
    const playerParticipant = festival.participants.find(p => p.ownerId === 'player');
    const timeLeft = Math.max(0, Math.ceil((festival.endTime - Date.now()) / 1000));

    // --- Sekcja Gracza ---
    let playerSectionHTML = '';
    if (playerParticipant) {
        // Logika dla gracza, który dołączył
        const currentLevel = FESTIVAL_STALL_LEVELS[playerParticipant.level - 1];
        const nextLevel = FESTIVAL_STALL_LEVELS[playerParticipant.level];
        playerSectionHTML = `
            <h4>Twoje stoisko (Poziom ${playerParticipant.level}: ${currentLevel.name})</h4>
            <p>Zdobyte zainteresowanie: <strong>${playerParticipant.interest.toFixed(1)}</strong></p>
            <div style="margin-bottom: 10px;">
                ${nextLevel ? `<button onclick="playerUpgradeStall()">Ulepsz do: "${nextLevel.name}" (${nextLevel.cost} PLN)</button>` : '<p>Osiągnięto maksymalny poziom stoiska.</p>'}
            </div>
            <div>
                <p>Promuj stoisko:</p>
                <button onclick="playerPromoteStall('flyers')" title="+5 zainteresowania">${PROMOTION_ACTIONS.flyers.name} (${PROMOTION_ACTIONS.flyers.cost} PLN)</button>
                <button onclick="playerPromoteStall('contest')" title="+10 zainteresowania">${PROMOTION_ACTIONS.contest.name} (${PROMOTION_ACTIONS.contest.cost} PLN)</button>
                <button onclick="playerPromoteStall('kids')" title="+10 zainteresowania">${PROMOTION_ACTIONS.kids.name} (${PROMOTION_ACTIONS.kids.cost} PLN)</button>
                <button onclick="playerPromoteStall('merch')" title="+12 zainteresowania">${PROMOTION_ACTIONS.merch.name} (${PROMOTION_ACTIONS.merch.cost} PLN)</button>
            </div>
        `;
    } else {
        // --- SEKCJA DOŁĄCZANIA DO FESTYNU ---
        let companyButtonsHTML = '';
        for (const symbol in playerPortfolio) {
            const stock = stocks.find(s => s.symbol === symbol);
            // Sprawdź, czy stock istnieje, czy gracz ma akcje i czy te akcje dają ponad 50%
            if (stock && playerPortfolio[symbol].shares > 0 && stock.totalShares > 0 && (playerPortfolio[symbol].shares / stock.totalShares > 0.5)) {
                companyButtonsHTML += `<button onclick="playerJoinFestival({type: 'company', id: '${symbol}'})">Spółkę ${symbol}</button>`;
            }
        }
        playerSectionHTML = `
            <h4>Dołącz do festynu! (Koszt: ${FESTIVAL_STALL_LEVELS[0].cost} PLN)</h4>
            <p>Co chcesz promować?</p>
            <div id="join-festival-options">
                <button onclick="playerJoinFestival({type: 'self'})">Siebie</button>
                <button onclick="playerJoinFestival({type: 'player_company'})" ${!playerCompany ? 'disabled title="Musisz założyć własną firmę"' : ''}>Własną firmę</button>
                ${companyButtonsHTML}
            </div>
        `;
    }

    // --- Sekcja Rankingu Uczestników ---
    let participantsTableHTML = `
        <h4>Ranking Stoisk na Żywo</h4>
        <table style="width: 100%;">
            <thead><tr><th>#</th><th>Wystawca</th><th>Cel Promocji</th><th>Zainteresowanie</th></tr></thead>
            <tbody>
    `;
    const sortedParticipants = [...festival.participants].sort((a, b) => b.interest - a.interest);
    sortedParticipants.forEach((p, index) => {
        // Logika nazw uczestników
        const ownerName = p.ownerId === 'player' ? 'Ty' : (p.ownerId === 'city' ? 'Miasto Gdańsk' : (aiCompetitors.find(a => a.id === p.ownerId)?.name || p.ownerName || stocks.find(s => s.symbol === p.ownerId)?.name || p.ownerId));
        let targetName = '';
        switch (p.promotionTarget.type) {
            case 'self': targetName = 'Własny wizerunek'; break;
            case 'company': targetName = p.promotionTarget.id; break;
            case 'player_company': targetName = playerCompany ? playerCompany.name : 'Moja Firma'; break;
            case 'city': targetName = 'Miasto Gdańsk'; break;
            case 'bank_promo': targetName = p.ownerName; break; // Dla banków
        }
        participantsTableHTML += `<tr style="${p.ownerId === 'player' ? 'font-weight: bold; background-color: #e3f2fd;' : ''}">
            <td>${index + 1}</td>
            <td>${ownerName}</td>
            <td>${targetName}</td>
            <td>${p.interest.toFixed(1)}</td>
        </tr>`;
    });
    participantsTableHTML += `</tbody></table>`;

    // --- Sekcja Aktywnych Bonusów Gracza ---
    const playerActiveBonuses = activeModifiers.filter(m => m.target.type === 'self' || m.target.type === 'player_company' || (m.target.type === 'company' && playerPortfolio[m.target.id]));
    let bonusesHTML = '';
    if (playerActiveBonuses.length > 0) {
        bonusesHTML = '<h4>Twoje Aktywne Bonusy z Festynów</h4><ul>';
        playerActiveBonuses.forEach(mod => {
            const bonusTimeLeft = Math.max(0, Math.ceil((mod.expiryTime - Date.now()) / 1000));
            bonusesHTML += `<li>Bonus dla "${mod.target.type}" (Mnożnik: x${mod.multiplier}) - wygasa za ${bonusTimeLeft}s</li>`;
        });
        bonusesHTML += '</ul>';
    }

    // --- Finalne złożenie widoku (renderowanie do kontenera) ---
    festivalContainer.innerHTML = `
        <h2 style="margin-top: 0; text-align: center;">🎉 Trwa ${festival.name}! 🎉</h2>
        <div class="bank-section">
            <p>Koniec za: <strong>${timeLeft}s</strong> | Zainteresowanie wydarzeniem: <strong>${festival.globalInterest.toFixed(1)}</strong></p>
            <p style="font-size: 12px;">Atrakcje: ${festival.attractions.join(', ')}</p>
            <button onclick="playerPromoteEvent()">Promuj wydarzenie (500 PLN)</button>
        </div>
        <div class="bank-section">
            ${playerSectionHTML}
        </div>
        <div class="bank-section">
            ${participantsTableHTML}
        </div>
        <div class="bank-section">
            ${bonusesHTML}
        </div>
    `;
}

function switchBankTab(tabName) {
    // Ukryj wszystkie kontenery zakładek
    document.querySelectorAll('.bank-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    // Pokaż wybrany kontener
    document.getElementById(`bank-content-${tabName}`).style.display = 'block';

    // Zaktualizuj wygląd przycisków zakładek
    document.querySelectorAll('.bank-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-btn-${tabName}`).classList.add('active');

    // Jeśli aktywowano zakładkę obligacji, odśwież jej zawartość
    if (tabName === 'bonds') {
        renderBondMarketInBank();
    } else if (tabName === 'commercial') { // <-- DODANE Z ui.js
        renderCommercialBanksList();
    }
}

/**
 * Renderuje tabele z ofertami obligacji wewnątrz modala banku.
 */
function renderBondMarketInBank() {
    const stateBondsBody = document.getElementById('state-bonds-table').getElementsByTagName('tbody')[0];
    stateBondsBody.innerHTML = '';

    const bondTypes = ['shortTerm', 'mediumTerm', 'longTerm'];
    bondTypes.forEach(type => {
        const offer = stateBondOffer[type];
        const row = stateBondsBody.insertRow();

        let typeName = '';
        if (type === 'shortTerm') typeName = 'Krótkoterminowe (10 min)';
        if (type === 'mediumTerm') typeName = 'Średnioterminowe (25 min)';
        if (type === 'longTerm') typeName = 'Długoterminowe (45 min)';
        row.insertCell().textContent = typeName;

        let interestText;
        if (type === 'shortTerm') {
            interestText = `${(offer.interest * 100).toFixed(1)}% (stałe)`;
        } else {
            const inflationProxy = marketVolatilityIndex / 100;
            interestText = `~${((inflationProxy + offer.interestBase) * 100).toFixed(1)}% (zmienne)`;
        }
        row.insertCell().textContent = interestText;
        row.insertCell().textContent = offer.available;

        const actionsCell = row.insertCell();
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.value = '1';
        input.style.width = '50px';
        const buyBtn = document.createElement('button');
        buyBtn.textContent = 'Kup';

        // ZMIANA #1 TUTAJ
        // Dodajemy 'player' jako pierwszy argument
        buyBtn.onclick = () => buyStateBond('player', type, parseInt(input.value));

        actionsCell.appendChild(input);
        actionsCell.appendChild(buyBtn);
    });

    // Renderowanie innych obligacji
    const otherBondsBody = document.getElementById('other-bonds-table').getElementsByTagName('tbody')[0];
    otherBondsBody.innerHTML = '';
    activeBonds.forEach(bond => {
        const row = otherBondsBody.insertRow();
        if (bond.isRescueBond) {
            row.style.backgroundColor = '#fff0f0'; // Lekko czerwone tło
            row.title = 'Obligacja ratunkowa - podwyższone ryzyko!';
        }
        row.insertCell().textContent = bond.issuerName;
        row.insertCell().textContent = bond.type.replace(' 🆘', '');
        row.insertCell().textContent = bond.type;
        row.insertCell().textContent = `${(bond.interestRate * 100).toFixed(1)}%`;
        row.insertCell().textContent = `${bond.durationMinutes} min`;
        row.insertCell().textContent = `${(bond.risk * 100).toFixed(0)}%`;
        const riskCell = row.insertCell();
        riskCell.textContent = `${(bond.risk * 100).toFixed(0)}%`;
        if (bond.risk > 0.5) riskCell.style.color = '#dc3545'; // Oznacz wysokie ryzyko
        else if (bond.risk > 0.3) riskCell.style.color = '#ffc107'; // Oznacz średnie ryzyko
        row.insertCell().textContent = bond.available;

        const actionsCell = row.insertCell();
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.value = '1';
        input.style.width = '50px';
        const buyBtn = document.createElement('button');
        buyBtn.textContent = 'Kup';

        // ZMIANA #2 TUTAJ
        // Dodajemy 'player' jako pierwszy argument
        buyBtn.onclick = () => buyOtherBond('player', bond.id, parseInt(input.value));

        actionsCell.appendChild(input);
        actionsCell.appendChild(buyBtn);
    });
}

function openFestivalResultsModal(participants, festivalName) {
    const modal = document.getElementById('festival-results-modal');
    document.getElementById('festival-results-title').textContent = `Wyniki wydarzenia: ${festivalName}`;
    const body = document.getElementById('festival-results-body');
    body.innerHTML = '';

    participants.forEach((p, index) => {
        const row = body.insertRow();
        let ownerName = 'Nieznany'; // Domyślna nazwa

        // --- 👇 START POPRAWIONEJ LOGIKI NAZWY 👇 ---
        if (p.ownerId === 'player') {
            ownerName = 'Ty (Gracz)';
        } else if (p.ownerId === 'city') {
            ownerName = 'Miasto Gdańsk';
        } else {
            // Spróbuj znaleźć bota AI
            const ai = aiCompetitors.find(a => a.id === p.ownerId);
            if (ai) {
                ownerName = ai.name;
            } else {
                // Jeśli to nie AI, zakładamy, że to symbol spółki giełdowej
                const stock = stocks.find(s => s.symbol === p.ownerId);
                if (stock) {
                    ownerName = stock.name; // Użyj pełnej nazwy spółki
                } else {
                    ownerName = p.ownerId; // W ostateczności pokaż ID
                }
            }
        }
        // --- 👆 KONIEC POPRAWIONEJ LOGIKI NAZWY 👆 ---

        row.insertCell().textContent = `#${index + 1}`;
        row.insertCell().textContent = ownerName;
        row.insertCell().textContent = p.interest.toFixed(1);

        if (p.ownerId === 'player') {
            row.style.fontWeight = 'bold';
            row.style.backgroundColor = '#e3f2fd';
        }
    });

    modal.style.display = 'block';
}

/**
 * Przesyła ofertę gracza w aukcji bonów.
 */
function submitPlayerTBillBid() {
    const quantityInput = document.getElementById('t-bill-bid-quantity');
    const priceInput = document.getElementById('t-bill-bid-price');
    const quantity = quantityInput.valueAsNumber;
    const price = priceInput.valueAsNumber;

    if (placeTBillBid('player', quantity, price)) {
        // Wyczyść pola po udanym złożeniu oferty
        quantityInput.value = '1';
        priceInput.value = '';
    }
}

/**
 * Aktualizuje sekcję aukcji bonów w modalu banku.
 */
function updateTBillAuctionSection() {
    const section = document.getElementById('t-bill-auction-section');
    if (!section) return;

    if (currentTBillAuction && playerHasTBillAccess) {
        const timeLeft = Math.max(0, Math.ceil((currentTBillAuction.endTime - Date.now()) / 1000));
        document.getElementById('t-bill-auction-available').textContent = currentTBillAuction.quantityAvailable;
        document.getElementById('t-bill-auction-timer').textContent = timeLeft;

        // Wyświetl oferty gracza
        const playerBidsList = document.getElementById('player-t-bill-bids');
        playerBidsList.innerHTML = '';
        currentTBillAuction.bids.filter(b => b.bidderId === 'player').forEach(bid => {
            const li = document.createElement('li');
            li.textContent = `${bid.quantity} szt. po ${bid.price.toFixed(2)} PLN`;
            playerBidsList.appendChild(li);
        });

        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

// --- PONIŻEJ FUNKCJE Z BAZY ui.js (Bankowość Komercyjna) ---

function renderCommercialBanksList() {
    const listContainer = document.getElementById('commercial-banks-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Wyczyść starą listę
    const activeBanks = commercialBanks.filter(b => b.isActive);

    if (activeBanks.length === 0) {
        listContainer.innerHTML = '<p>Obecnie na rynku nie działają żadne banki komercyjne.</p>';
        return;
    }

    activeBanks.forEach(bank => {
        // Oblicz aktualne oprocentowanie (później dodamy stopy BC)
        // Na razie użyjmy uproszczonych wartości bazowych + marży
        const currentLoanRate = (LOAN_INTEREST_RATE + bank.baseInterestRateMargin) * 100;
        const currentDepositRate = (DEPOSIT_INTEREST_RATE + bank.baseInterestRateMargin * 0.5) * 100; // Depozyty zwykle mniej oprocentowane

        const bankDiv = document.createElement('div');
        bankDiv.className = 'bank-section commercial-bank-item'; // Dodajemy klasę dla styli
        bankDiv.style.borderLeft = `5px solid ${getBankColor(bank.type)}`; // Kolorowa ramka wg typu

        let buttonsHTML = '';
        const canUseCooperative = bank.type === BANK_TYPES.COOPERATIVE ? (playerPortfolio[`${bank.id}_STOCK`] !== undefined && playerPortfolio[`${bank.id}_STOCK`].shares > 0) : true;
        const canInteract = [BANK_TYPES.UNIVERSAL, BANK_TYPES.INTERNATIONAL, BANK_TYPES.INTERNET, BANK_TYPES.COOPERATIVE].includes(bank.type);

        if (canInteract && canUseCooperative) {
            buttonsHTML += `<button onclick="openCommercialLoanModal('${bank.id}')">Weź kredyt</button> `;
            buttonsHTML += `<button onclick="openCommercialDepositModal('${bank.id}')">Złóż depozyt</button> `;
        }
        if (bank.type === BANK_TYPES.MORTGAGE) {
            buttonsHTML += `<button onclick="openMortgageModal('${bank.id}')">Weź hipotekę</button> `;
        }
        if (bank.type === BANK_TYPES.INVESTMENT) {
            buttonsHTML += `<button onclick="openSellSharesToBankModal('${bank.id}')">Sprzedaj akcje</button>`;
        }

        bankDiv.innerHTML = `
            <h4>${bank.name} (${bank.type})</h4>
            <p>Oproc. kredytu: <strong>${currentLoanRate.toFixed(1)}%</strong> | Oproc. depozytu: <strong>${currentDepositRate.toFixed(1)}%</strong></p>
            <div class="bank-actions">
                ${buttonsHTML || '<p>...</p>'}
            </div>
        `;

        // --- 👇 DODAJ TEN BLOK DLA BANKÓW INWESTYCYJNYCH 👇 ---
        if (bank.type === BANK_TYPES.INVESTMENT && Object.keys(bank.stockPortfolio).length > 0) {
            let salesHTML = '<div class="bank-stock-sales"><h5>Akcje na sprzedaż:</h5><ul>';
            for (const symbol in bank.stockPortfolio) {
                const stock = stocks.find(s => s.symbol === symbol);
                const holding = bank.stockPortfolio[symbol];
                if (stock && holding.shares > 0) {
                    const sellPrice = stock.price * 1.10; // Marża +10%
                    salesHTML += `<li>${symbol} (${holding.shares} szt.) - Cena: ${sellPrice.toFixed(2)} PLN 
                                  <input type="number" id="buy-from-bank-${bank.id}-${symbol}" min="1" value="1" style="width:40px; margin-left:5px;">
                                  <button onclick="buySharesFromInvestmentBank('${bank.id}', '${symbol}')">Kup</button>
                                </li>`;
                }
            }
            salesHTML += '</ul></div>';
            bankDiv.innerHTML += salesHTML; // Dodaj HTML do diva banku
        }
        // --- 👆 KONIEC NOWEGO BLOKU 👆 ---

        listContainer.appendChild(bankDiv);
    });
}

/** Funkcja pomocnicza do kolorowania banków wg typu */
function getBankColor(type) {
    switch (type) {
        case BANK_TYPES.INVESTMENT: return '#20c997'; // Turkusowy
        case BANK_TYPES.CORPORATE: return '#6f42c1'; // Fioletowy
        case BANK_TYPES.UNIVERSAL: return '#0d6efd'; // Niebieski
        case BANK_TYPES.INTERNATIONAL: return '#fd7e14'; // Pomarańczowy
        case BANK_TYPES.COOPERATIVE: return '#28a745'; // Zielony
        case BANK_TYPES.INTERNET: return '#ffc107'; // Żółty
        case BANK_TYPES.MORTGAGE: return '#dc3545'; // Czerwony
        default: return '#6c757d'; // Szary
    }
}

function openSellSharesToBankModal(bankId) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const modal = document.getElementById('sell-shares-to-bank-modal');
    if (!bank || !modal) return;

    // Wypełnij dane modala
    modal.querySelector('#sell-shares-bank-name').textContent = bank.name;
    modal.querySelector('#sell-shares-quantity').value = '1'; // Resetuj ilość

    // Wypełnij listę rozwijaną akcjami gracza
    const select = modal.querySelector('#sell-shares-stock-select');
    select.innerHTML = '<option value="">-- Wybierz akcje do sprzedaży --</option>'; // Opcja pusta
    let hasEligibleShares = false; // Flaga
    Object.keys(playerPortfolio).forEach(symbol => {
        const holding = playerPortfolio[symbol];
        const stock = stocks.find(s => s.symbol === symbol && !s.assetType); // Tylko standardowe akcje
        // Sprawdź, czy gracz ma dostępne akcje (niezablokowane)
        const availableShares = holding.shares - (holding.lockedShares || 0);
        if (stock && availableShares > 0) {
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = `${stock.name} (${symbol}) - dostępne: ${availableShares}`;
            select.appendChild(option);
            hasEligibleShares = true; // Gracz ma co sprzedać
        }
    });

    // Funkcja pomocnicza do aktualizacji szacunkowej ceny odkupu
    const updateEstimatedPrice = () => {
        const selectedSymbol = select.value;
        const stock = stocks.find(s => s.symbol === selectedSymbol);
        const priceEl = modal.querySelector('#sell-shares-estimated-price');
        const quantityInput = modal.querySelector('#sell-shares-quantity');
        const holding = playerPortfolio[selectedSymbol];
        const availableShares = holding ? holding.shares - (holding.lockedShares || 0) : 0;

        // Walidacja ilości
        const quantity = quantityInput.valueAsNumber || 0;
        if (quantity > availableShares) {
            quantityInput.value = availableShares;
        }
        if (quantity < 1 && availableShares > 0) {
            quantityInput.value = 1;
        }


        if (stock) {
            let priceMultiplier = 0.95; // Bazowa zniżka
            if (stock.financialHealth < 0) priceMultiplier -= 0.05;
            if (stock.financialHealth < -2) priceMultiplier -= 0.05;
            priceEl.textContent = (stock.price * priceMultiplier).toFixed(2);
        } else {
            priceEl.textContent = '0.00';
        }
    };
    // Przypisz eventy
    select.onchange = updateEstimatedPrice;
    modal.querySelector('#sell-shares-quantity').oninput = updateEstimatedPrice; // Aktualizuj też przy zmianie ilości
    updateEstimatedPrice(); // Wywołaj raz na start

    // Ustaw akcję dla przycisku "Sprzedaj"
    const sellBtn = modal.querySelector('#sell-shares-to-bank-btn');
    sellBtn.onclick = () => {
        const symbol = select.value;
        const quantity = parseInt(modal.querySelector('#sell-shares-quantity').value);
        sellSharesToInvestmentBank(bankId, symbol, quantity);
    };
    // Wyłącz przycisk, jeśli gracz nie ma nic do sprzedania
    sellBtn.disabled = !hasEligibleShares;

    modal.style.display = 'block'; // Pokaż modal
}

function submitPlayerCollateralBid() {
    const quantityInput = document.getElementById('collateral-bid-quantity');
    const priceInput = document.getElementById('collateral-bid-price');
    const quantity = quantityInput.valueAsNumber;
    const price = priceInput.valueAsNumber;

    if (placeCollateralBid('player', quantity, price)) {
        quantityInput.value = '1';
        priceInput.value = '';
    }
}

/**
 * Aktualizuje sekcję aukcji akcji w modalu banku.
 */
function updateCollateralAuctionSection() {
    const section = document.getElementById('collateral-auction-section');
    if (!section) return;

    if (currentCollateralAuction) {
        const timeLeft = Math.max(0, Math.ceil((currentCollateralAuction.endTime - Date.now()) / 1000));
        document.getElementById('collateral-auction-symbol').textContent = currentCollateralAuction.stockSymbol;
        document.getElementById('collateral-auction-available').textContent = currentCollateralAuction.quantityAvailable;
        document.getElementById('collateral-auction-min-price').textContent = currentCollateralAuction.minPrice.toFixed(2);
        document.getElementById('collateral-auction-timer').textContent = timeLeft;

        // Wyświetl oferty gracza
        const playerBidsList = document.getElementById('player-collateral-bids');
        playerBidsList.innerHTML = '';
        currentCollateralAuction.bids.filter(b => b.bidderId === 'player').forEach(bid => {
            const li = document.createElement('li');
            li.textContent = `${bid.quantity} szt. po ${bid.price.toFixed(2)} PLN`;
            playerBidsList.appendChild(li);
        });

        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

function closeInteractionModal() {
    // Ukryj wszystkie modale interakcji
    document.getElementById('commercial-loan-modal').style.display = 'none';
    document.getElementById('commercial-deposit-modal').style.display = 'none';
    document.getElementById('mortgage-modal').style.display = 'none';
    document.getElementById('sell-shares-to-bank-modal').style.display = 'none';

    // Odśwież listę banków po zamknięciu modala, jeśli zakładka jest aktywna
    const bankModal = document.getElementById('bank-modal');
    const commercialTab = document.getElementById('bank-content-commercial');
    if (bankModal?.style.display === 'block' && commercialTab?.style.display === 'block') {
        renderCommercialBanksList();
    }
}

function openCommercialLoanModal(bankId) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const modal = document.getElementById('commercial-loan-modal');
    if (!bank || !modal) return;

    // Oblicz limit kredytowy gracza
    const netWorth = calculateNetWorth('player');
    const existingLoansTotal = playerCommercialLoans.reduce((sum, loan) => sum + loan.amount, 0);
    const maxLoanPossible = Math.max(0, netWorth * 0.3 - existingLoansTotal);

    // Wypełnij dane modala
    modal.querySelector('#commercial-loan-bank-name').textContent = bank.name;
    modal.querySelector('#commercial-loan-rate').textContent = (bank.interestRateLoan * 100).toFixed(1);
    modal.querySelector('#commercial-loan-limit').textContent = maxLoanPossible.toFixed(0);
    modal.querySelector('#commercial-loan-amount').value = ''; // Wyczyść pole kwoty

    // Wyświetl istniejące pożyczki gracza w tym banku i w innych
    const loansList = modal.querySelector('#existing-loans-list');
    loansList.innerHTML = ''; // Wyczyść listę
    if (playerCommercialLoans.length > 0) {
        playerCommercialLoans.forEach(loan => {
            const li = document.createElement('li');
            li.style.marginBottom = '8px'; // Odstęp między pożyczkami
            li.innerHTML = `
                <span>${loan.bankName}: ${loan.amount.toFixed(2)} PLN (Rata: ${loan.weeklyPayment.toFixed(2)})</span>
                <input type="number" placeholder="Kwota spłaty" style="width: 80px; margin-left: 10px;">
                <button style="margin-left: 5px;">Spłać</button>
            `;
            // Dodaj obsługę przycisku spłaty dla tej konkretnej pożyczki
            const repayInput = li.querySelector('input');
            const repayBtn = li.querySelector('button');
            repayBtn.onclick = () => repayCommercialLoan(loan.id, parseFloat(repayInput.value));
            loansList.appendChild(li);
        });
    } else {
        loansList.innerHTML = '<li>Brak aktywnych kredytów komercyjnych.</li>';
    }

    // Ustaw akcję dla głównego przycisku "Weź Kredyt"
    modal.querySelector('#take-commercial-loan-btn').onclick = () => takeCommercialLoan(bankId, parseFloat(modal.querySelector('#commercial-loan-amount').value));

    modal.style.display = 'block'; // Pokaż modal
}

function openCommercialDepositModal(bankId) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const modal = document.getElementById('commercial-deposit-modal');
    if (!bank || !modal) return;

    // Znajdź istniejący depozyt gracza w tym banku
    const existingDeposit = playerCommercialDeposits.find(d => d.bankId === bankId);

    // Wypełnij dane modala
    modal.querySelector('#commercial-deposit-bank-name').textContent = bank.name;
    modal.querySelector('#commercial-deposit-rate').textContent = (bank.interestRateDeposit * 100).toFixed(1);
    modal.querySelector('#commercial-deposit-existing').textContent = existingDeposit ? existingDeposit.amount.toFixed(2) : '0.00';
    modal.querySelector('#commercial-deposit-amount').value = ''; // Wyczyść pole kwoty

    // Ustaw akcję dla przycisku "Wpłać"
    modal.querySelector('#make-commercial-deposit-btn').onclick = () => makeCommercialDeposit(bankId, parseFloat(modal.querySelector('#commercial-deposit-amount').value));

    // Ustaw akcję i stan dla przycisku "Wypłać"
    const withdrawBtn = modal.querySelector('#withdraw-commercial-deposit-btn');
    withdrawBtn.onclick = () => withdrawCommercialDeposit(existingDeposit ? existingDeposit.id : null, parseFloat(modal.querySelector('#commercial-deposit-amount').value));
    withdrawBtn.disabled = !existingDeposit || existingDeposit.amount <= 0; // Wyłącz, jeśli nie ma depozytu

    modal.style.display = 'block'; // Pokaż modal
}

function openMortgageModal(bankId) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const modal = document.getElementById('mortgage-modal');
    if (!bank || !modal) return;

    // Wypełnij dane modala
    modal.querySelector('#mortgage-bank-name').textContent = bank.name;
    modal.querySelector('#mortgage-rate').textContent = (bank.interestRateLoan * 100).toFixed(1); // Używamy oprocentowania kredytu
    modal.querySelector('#mortgage-collateral-quantity').value = '1'; // Resetuj ilość
    modal.querySelector('#mortgage-loan-amount').value = ''; // Wyczyść kwotę

    // Wypełnij listę rozwijaną akcjami gracza (dostępnymi na zastaw)
    const select = modal.querySelector('#mortgage-collateral-select');
    select.innerHTML = '<option value="">-- Wybierz akcje na zastaw --</option>'; // Opcja pusta
    let hasEligibleShares = false; // Flaga sprawdzająca, czy gracz ma co zastawić
    Object.keys(playerPortfolio).forEach(symbol => {
        const holding = playerPortfolio[symbol];
        const stock = stocks.find(s => s.symbol === symbol && !s.assetType); // Tylko standardowe akcje
        const availableShares = holding.shares - (holding.lockedShares || 0); // Akcje dostępne do zastawienia
        if (stock && availableShares > 0) {
            const option = document.createElement('option');
            option.value = symbol;
            // Pokaż dostępne / wszystkie posiadane
            option.textContent = `${stock.name} (${symbol}) - dostępne: ${availableShares} / ${holding.shares}`;
            select.appendChild(option);
            hasEligibleShares = true; // Gracz ma co zastawić
        }
    });

    // Funkcja pomocnicza do aktualizacji wartości zastawu i limitu pożyczki
    const updateCollateralValue = () => {
        const selectedSymbol = select.value;
        const quantityInput = modal.querySelector('#mortgage-collateral-quantity');
        let quantity = quantityInput.valueAsNumber || 0;
        const holding = playerPortfolio[selectedSymbol];
        const stock = stocks.find(s => s.symbol === selectedSymbol);
        const availableShares = holding ? holding.shares - (holding.lockedShares || 0) : 0;
        const collateralValueEl = modal.querySelector('#mortgage-collateral-value');
        const loanAmountInput = modal.querySelector('#mortgage-loan-amount');

        // Walidacja ilości
        if (quantity > availableShares) {
            quantityInput.value = availableShares; // Nie pozwól wpisać więcej niż dostępne
            quantity = availableShares; // Użyj poprawionej wartości
        }
        if (quantity < 1 && availableShares > 0) {
            quantityInput.value = 1;
            quantity = 1;
        }

        if (stock && quantity > 0) {
            const collateralValue = stock.price * quantity;
            collateralValueEl.textContent = collateralValue.toFixed(2);
            loanAmountInput.max = (collateralValue * 0.5).toFixed(0); // Ustaw max kwotę pożyczki
        } else {
            collateralValueEl.textContent = '0.00';
            loanAmountInput.max = 0;
            loanAmountInput.value = ''; // Wyczyść kwotę, jeśli zastaw jest nieważny
        }
    };
    // Przypisz eventy do selecta i inputa ilości
    select.onchange = updateCollateralValue;
    modal.querySelector('#mortgage-collateral-quantity').oninput = updateCollateralValue;
    updateCollateralValue(); // Wywołaj raz na start, aby ustawić wartości początkowe

    // Ustaw akcję dla przycisku "Weź Hipotekę"
    const takeBtn = modal.querySelector('#take-mortgage-loan-btn');
    takeBtn.onclick = () => {
        const symbol = select.value;
        const quantity = parseInt(modal.querySelector('#mortgage-collateral-quantity').value);
        const amount = parseFloat(modal.querySelector('#mortgage-loan-amount').value);
        takeMortgageLoan(bankId, symbol, quantity, amount);
    };
    // Wyłącz przycisk, jeśli gracz nie ma żadnych akcji do zastawienia
    takeBtn.disabled = !hasEligibleShares;

    modal.style.display = 'block'; // Pokaż modal
}

function openBankIPOOfferModal(message) {
    const modal = document.getElementById('bank-ipo-offer-modal');
    if (!modal || !currentBankIPOOffer) return;

    modal.querySelector('#bank-ipo-offer-message').innerHTML = message;
    // Przypisz akcję do przycisku akceptacji
    modal.querySelector('#accept-bank-ipo-btn').onclick = () => resolveBankIPO('accept');

    modal.style.display = 'block';
}

/** Zamyka modal oferty IPO banku */
function closeBankIPOOfferModal() {
    const modal = document.getElementById('bank-ipo-offer-modal');
    if (modal) modal.style.display = 'none';
    currentBankIPOOffer = null; // Wyczyść ofertę na wypadek zamknięcia przez 'X'
}

// --- PONIŻEJ FUNKCJE DODANE Z ui2.js (Panel Finansowy i Zwijanie) ---

/**
* Przełącza widoczność panelu Inkubatora Start-upów.
* DODANE Z ui2.js
*/
function toggleStartupPanelVisibility() {
    startupPanelCollapsed = !startupPanelCollapsed; // Odwróć stan
    const panel = document.getElementById('startup-incubator-panel');
    const icon = document.getElementById('toggle-icon-startup');

    if (panel && icon) {
        if (startupPanelCollapsed) {
            panel.classList.add('collapsed'); // Dodaj klasę, aby ukryć treść (CSS zadziała)
            icon.textContent = '▶'; // Zmień ikonkę na "rozwinięty"
        } else {
            panel.classList.remove('collapsed'); // Usuń klasę, aby pokazać treść
            icon.textContent = '▼'; // Zmień ikonkę na "zwinięty"
        }
    }
    // Zapisz stan w localStorage, aby był pamiętany po odświeżeniu
    localStorage.setItem('startupPanelCollapsed', startupPanelCollapsed);
}

/**
* Otwiera modal ze szczegółami finansowymi spółki.
* DODANE Z ui2.js
* @param {string} symbol Symbol spółki.
*/
function openFinancialDetailsModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const modal = document.getElementById('financial-details-modal');
    const title = document.getElementById('financial-details-title');
    const content = document.getElementById('financial-details-content');
    const anomalyReport = document.getElementById('financial-anomaly-report');

    title.textContent = `Szczegóły Finansowe: ${stock.name}`;
    anomalyReport.innerHTML = ''; // Wyczyść raport anomalii

    // Sprawdzenie dostępu (powtórzone dla pewności)
    const accountantLevel = getSkillLevel('accountant');
    const playerRep = stock.reputation['player'];
    // Sprawdź, czy gracz ma flagę dostępu LUB (ma Lvl 2+ ORAZ jest większościowcem)
    const hasAccess = stock.playerHasFinancialAccess || (accountantLevel >= 2 && (playerPortfolio[symbol]?.shares / stock.totalShares) > 0.5);

    if (!hasAccess || accountantLevel === 0) { // Jeśli nie ma dostępu LUB nie ma umiejętności
        content.innerHTML = '<p style="color: red;">Brak dostępu do danych finansowych.</p>';
        modal.style.display = 'block';
        return;
    }

    // Wyświetlanie danych z bilansu
    if (stock.balanceSheet) {
        content.innerHTML = `
            <h4>Bilans Spółki:</h4>
            <p><strong>Aktywa:</strong> ${stock.balanceSheet.assets.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <p><strong>Zobowiązania (Pasywa):</strong> ${stock.balanceSheet.liabilities.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <p><strong>Kapitał Własny:</strong> ${(stock.balanceSheet.assets - stock.balanceSheet.liabilities).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <p> &nbsp; - Kapitał Zakładowy: ${stock.balanceSheet.shareCapital.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <p> &nbsp; - Zyski Zatrzymane: ${stock.balanceSheet.retainedEarnings.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <hr>
            <p><strong>Zysk Kwartalny (Ostatni):</strong> ${stock.quarterlyEarnings.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
            <p><strong>Dług Korporacyjny (jeśli dotyczy):</strong> ${(stock.corporateDebt || 0).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</p>
        `;
    } else {
        content.innerHTML = '<p>Brak szczegółowych danych bilansowych dla tej spółki.</p>';
    }

    // Logika Poziomu 3: Wykrywanie Anomalii
    if (accountantLevel >= 3) {
        // Sprawdź, czy funkcja detectFinancialAnomaly istnieje (na wypadek problemów z ładowaniem plików)
        if (typeof detectFinancialAnomaly === 'function') {
            detectFinancialAnomaly(stock); // Wywołaj funkcję z gameLogic.js
        } else {
            console.error("Funkcja detectFinancialAnomaly nie została znaleziona!");
        }
    }

    modal.style.display = 'block'; // Pokaż modal
}

/**
 * Obsługuje kliknięcie przycisku "Zobacz Finanse" w Panelu Zarządzania.
 * DODANE Z ui2.js
 * @param {string} symbol Symbol spółki.
 */
function handleViewFinancesClick(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const accountantLevel = getSkillLevel('accountant');
    const playerRep = stock.reputation['player'];
    const isMajorityOwner = (playerPortfolio[symbol]?.shares / stock.totalShares) > 0.5;
    const hasPaidAccess = stock.playerHasFinancialAccess;

    // Warunki blokujące dostęp
    if (accountantLevel === 0) {
        showToast("Musisz odblokować umiejętność 'Księgowy', aby uzyskać dostęp.", 'error');
        return;
    }
    if (playerRep < REPUTATION_LEVELS.NEGATIVE && !isMajorityOwner) {
        showToast(`Twoje relacje z ${stock.name} są zbyt złe (${playerRep.toFixed(1)}), aby udostępnili Ci dane finansowe.`, 'error');
        return;
    }

    // Sprawdzenie, czy dostęp jest darmowy lub już opłacony
    if (hasPaidAccess || (accountantLevel >= 2 && isMajorityOwner)) {
        openFinancialDetailsModal(symbol); // Otwórz modal od razu
        return;
    }

    // Dostęp wymaga opłaty (Lvl 1)
    const accessCost = 2000;
    if (playerCash < accessCost) {
        showToast(`Nie masz wystarczająco gotówki (${accessCost} PLN), aby zapłacić za dostęp.`, 'error');
        return;
    }

    // Zapytaj gracza o potwierdzenie płatności
    if (confirm(`Czy chcesz zapłacić ${accessCost} PLN za jednorazowy wgląd w finanse ${stock.name}?`)) {
        playerCash -= accessCost; // Pobierz opłatę
        stock.playerHasFinancialAccess = true; // Ustaw flagę dostępu
        displayCash(); // Zaktualizuj UI gotówki
        logEvent(`Zapłacono ${accessCost} PLN za wgląd w finanse ${stock.name}.`, 'review'); // Zaloguj zdarzenie
        showToast("Dostęp do finansów uzyskany!", 'success'); // Pokaż powiadomienie
        openFinancialDetailsModal(symbol); // Otwórz modal finansowy
        // Odśwież modal zarządzania, aby zaktualizować tekst przycisku/info
        openManagementModal(symbol); // Ponownie otwórz modal zarządzania, by odświeżyć info
    }
}

function openStateModal() {
    const modal = document.getElementById('state-modal');
    if(modal) {
        updateStateModalContent();
        modal.style.display = 'block';
    }
}

function toggleSubsidiaryVisibility(parentSymbol) {
    const parentStock = stocks.find(s => s.symbol === parentSymbol);
    if (!parentStock) return;

    parentStock.isSubsidiaryExpanded = !parentStock.isSubsidiaryExpanded;

    const subRows = document.querySelectorAll(`.subsidiary-of-${parentSymbol}`);
    subRows.forEach(row => {
        const parentRow = document.querySelector(`tr[data-symbol="${parentSymbol}"]`);
        const parentExchangeKey = parentRow ? stocks.find(s => s.symbol === parentSymbol)?.exchange : null;
        const isExchangeCollapsed = parentExchangeKey ? exchangeCollapseState[parentExchangeKey] : false;

        row.style.display = (parentStock.isSubsidiaryExpanded && !isExchangeCollapsed) ? '' : 'none';
    });

    const parentRow = document.querySelector(`tr[data-symbol="${parentSymbol}"]`);
    if (parentRow) {
        const toggleBtn = parentRow.querySelector('.subsidiary-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = parentStock.isSubsidiaryExpanded ? '▼ ' : '▶ ';
        }
    }
}

function updateStateModalContent() {
    const treasuryDisplay = document.getElementById('government-treasury-display');
    if (treasuryDisplay) {
        treasuryDisplay.textContent = governmentTreasury.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
    }

    // --- >>> UPROSZCZONA LOGIKA DLA URZĘDU ANTYMONOPOLOWEGO <<< ---
    const levelEl = document.getElementById('antitrust-level');
    const capacityEl = document.getElementById('antitrust-capacity');
    const accuracyEl = document.getElementById('antitrust-accuracy');
    const maxLevelInfoEl = document.getElementById('antitrust-max-level-info');

    // Sprawdź, czy elementy istnieją
    if (levelEl && capacityEl && accuracyEl && maxLevelInfoEl) {
        levelEl.textContent = `${antitrustOffice.level}`;
        capacityEl.textContent = `${(antitrustOffice.analysisCapacity * 100).toFixed(0)}%`;
        accuracyEl.textContent = `${(antitrustOffice.accuracy * 100).toFixed(0)}%`;

        if (antitrustOffice.level >= 5) { // Jeśli osiągnięto max poziom
            maxLevelInfoEl.style.display = 'block';
        } else {
            maxLevelInfoEl.style.display = 'none';
        }
    }
    // --- >>> KONIEC UPROSZCZONEJ LOGIKI <<< ---

    // --- Aktualne stawki podatkowe z uwzględnieniem umiejętności ---
    const sanLvl = getSkillLevel('sanEscobar');
    const accLvl = getSkillLevel('accountant');
    let taxModifier = 1.0;
    if (sanLvl >= 4) taxModifier = 0.0;
    else if (sanLvl >= 1) taxModifier = 0.95;
    // Księgowy: -2% za każdy poziom (mnożnik)
    taxModifier *= Math.max(0.9, 1.0 - accLvl * 0.02);

    const effDiv = (TAX_RATES.dividend * taxModifier * 100).toFixed(1);
    const effCap = (TAX_RATES.capitalGains * taxModifier * 100).toFixed(1);

    const divEl = document.getElementById('tax-dividend-display');
    const capEl = document.getElementById('tax-capital-display');
    if (divEl) divEl.textContent = effDiv + '%';
    if (capEl) capEl.textContent = effCap + '%';

    const bonusEl = document.getElementById('tax-skill-bonus-display');
    if (bonusEl) {
        const bonuses = [];
        if (sanLvl > 0) bonuses.push('San Escobar lvl ' + sanLvl);
        if (accLvl > 0) bonuses.push('Księgowy lvl ' + accLvl + ' (-' + (accLvl * 2) + '%)');
        if (bonuses.length > 0) {
            bonusEl.style.display = 'block';
            bonusEl.textContent = '🎯 Ulgi: ' + bonuses.join(', ');
        } else {
            bonusEl.style.display = 'none';
        }
    }

    // --- Wskaźnik koniunktury ---
    const sentimentEl = document.getElementById('market-sentiment-display');
    if (sentimentEl) {
        const gigIndex = marketIndexes.find(idx => idx.id === 'GIG');
        if (gigIndex && gigIndex.priceHistory && gigIndex.priceHistory.length >= 3) {
            const h = gigIndex.priceHistory;
            const last3 = h.slice(-3);
            const allUp = last3.every((v, i) => i === 0 || v >= last3[i - 1]);
            const allDown = last3.every((v, i) => i === 0 || v <= last3[i - 1]);
            if (allUp) sentimentEl.innerHTML = '🟢 Hossa (Wzrost)';
            else if (allDown) sentimentEl.innerHTML = '🔴 Bessa (Spadek)';
            else sentimentEl.innerHTML = '⚪ Neutralna';
        } else {
            sentimentEl.innerHTML = '⚪ Neutralna (brak danych)';
        }
    }
}

function openMaTargetModal(initiatorSymbol) {
    const initiatorStock = stocks.find(s => s.symbol === initiatorSymbol);
    if (!initiatorStock) return;

    const modal = document.getElementById('ma-target-modal');
    const tableBody = document.getElementById('ma-target-table-body');
    document.getElementById('ma-target-title').textContent = `Wybierz Cel dla: ${initiatorStock.name}`;
    tableBody.innerHTML = '';

    const potentialTargets = stocks.filter(target =>
        target.symbol !== initiatorSymbol &&
        !target.assetType &&
        !target.isBankrupt &&
        !target.mergerProcess &&
        !target.isSubsidiaryOf
    );

    if (potentialTargets.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Brak dostępnych celów na rynku.</td></tr>';
    } else {
        potentialTargets.forEach(target => {
            const row = tableBody.insertRow();
            const marketCap = target.price * target.totalShares;
            
            row.insertCell().textContent = `${target.name} (${target.symbol})`;
            row.insertCell().textContent = target.sector.join(', ');
            row.insertCell().textContent = `${marketCap.toLocaleString('pl-PL')} PLN`;
            
            const actionCell = row.insertCell();
            
            // ===>>> ZMIANA: DWA PRZYCISKI PRZEJĘCIA <<<===
            
            // 1. Przycisk Przejęcia (Gotówka)
            const takeoverCashBtn = document.createElement('button');
            takeoverCashBtn.textContent = 'Przejęcie (Gotówka)';
            takeoverCashBtn.title = 'Wrogie przejęcie finansowane z gotówki spółki.';
            takeoverCashBtn.onclick = () => {
                 if (confirm(`Czy na pewno chcesz zainicjować WROGIE PRZEJĘCIE ${target.name} przez ${initiatorStock.name}? Płatność w GOTÓWCE.`)) {
                    initiateMergerProcess(initiatorStock, target, 'przejęcie', 'cash');
                    document.getElementById('ma-target-modal').style.display='none';
                    openManagementModal(initiatorSymbol);
                }
            };
            actionCell.appendChild(takeoverCashBtn);

            // 2. Przycisk Przejęcia (LBO)
            const takeoverLboBtn = document.createElement('button');
            takeoverLboBtn.textContent = 'Przejęcie (LBO)';
            takeoverLboBtn.title = 'Wrogie przejęcie finansowane długiem (LBO). Bank sfinansuje transakcję, a Twoja spółka przejmie dług.';
            takeoverLboBtn.style.marginLeft = '5px';
            takeoverLboBtn.style.borderColor = '#ffc107'; // Żółta ramka dla odróżnienia
            takeoverLboBtn.onclick = () => {
                 if (confirm(`Czy na pewno chcesz zainicjować WROGIE PRZEJĘCIE ${target.name} przez ${initiatorStock.name}? Transakcja zostanie sfinansowana KREDYTEM (LBO), który obciąży Twoją spółkę.`)) {
                    initiateMergerProcess(initiatorStock, target, 'przejęcie', 'lbo');
                    document.getElementById('ma-target-modal').style.display='none';
                    openManagementModal(initiatorSymbol);
                }
            };
            // LBO jest ryzykowne, jeśli firma ma złą kondycję
            if (initiatorStock.financialHealth < 0) {
                takeoverLboBtn.disabled = true;
                takeoverLboBtn.title = 'Nie można sfinansować LBO przy negatywnej kondycji finansowej.';
            }
            actionCell.appendChild(takeoverLboBtn);
            
            // ===>>> KONIEC ZMIAN <<<===


            // Przycisk Fuzji (bez zmian)
            const initiatorMarketCap = initiatorStock.price * initiatorStock.totalShares;
            const sizeRatio = Math.max(marketCap, initiatorMarketCap) / Math.min(marketCap, initiatorMarketCap);
            if (sizeRatio < 2.5) { 
                const mergerBtn = document.createElement('button');
                mergerBtn.textContent = 'Fuzja';
                mergerBtn.title = 'Przyjazna fuzja (wymiana akcji)';
                mergerBtn.style.marginLeft = '10px'; // Trochę większy odstęp
                mergerBtn.style.borderColor = '#28a745'; // Zielona ramka
                mergerBtn.onclick = () => {
                    if (confirm(`Czy na pewno chcesz zaproponować FUZJĘ ${target.name} z ${initiatorStock.name}? Będzie to polegało na wymianie akcji.`)) {
                        initiateMergerProcess(initiatorStock, target, 'fuzja', 'stockSwap');
                        document.getElementById('ma-target-modal').style.display='none';
                        openManagementModal(initiatorSymbol);
                    }
                };
                actionCell.appendChild(mergerBtn);
            }
        });
    }

    modal.style.display = 'block';
}

function openComplicationModal(stock, decisionData) {
    const modal = document.getElementById('ma-complication-modal');
    if (!modal) return;

    document.getElementById('ma-complication-message').textContent = decisionData.question;
    const optionsContainer = document.getElementById('ma-complication-options');
    optionsContainer.innerHTML = ''; // Wyczyść stare opcje

    decisionData.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.text;
        button.onclick = () => {
            // Wywołaj funkcję logiki, która obsłuży konsekwencje
            resolveComplicationDecision(stock.symbol, option.id);
            modal.style.display = 'none'; // Zamknij modal po wyborze
        };
        optionsContainer.appendChild(button);
    });

    modal.style.display = 'block';
}

/**
 * Funkcja pomocnicza wywoływana przez przycisk w modalu komplikacji.
 * Przekazuje wybór gracza do logiki gry.
 * @param {string} stockSymbol - Symbol spółki, której dotyczy decyzja.
 * @param {string} optionId - ID wybranej opcji ('cancel', 'expensive', 'stronger').
 */
function resolveComplicationDecision(stockSymbol, optionId) {
    const stock = stocks.find(s => s.symbol === stockSymbol);
    if (!stock || !stock.mergerProcess || !stock.mergerProcess.decisionRequired) {
        console.error(`[M&A Decision] Nie znaleziono spółki lub procesu decyzyjnego dla ${stockSymbol}`);
        return;
    }

    const process = stock.mergerProcess;
    const partnerStock = stocks.find(s => s.symbol === process.partnerSymbol);
    const decisionData = process.decisionRequired;

    // Znajdź wybraną opcję
    const chosenOption = decisionData.options.find(opt => opt.id === optionId);
    if (!chosenOption) {
        console.error(`[M&A Decision] Nie znaleziono opcji o ID: ${optionId}`);
        return;
    }

    // Wykonaj konsekwencję (która jest funkcją zdefiniowaną w gameLogic.js)
    console.log(`[M&A Decision] Gracz wybrał: ${chosenOption.text}`);
    chosenOption.consequence();

    // Resetuj flagę decyzji (już nie jest wymagana)
    // Funkcje consequence (cancelMerger, itp.) powinny same resetować process.decisionRequired = null
    // Ale na wszelki wypadek, jeśli tego nie robią:
    if (stock.mergerProcess) stock.mergerProcess.decisionRequired = null;
    if (partnerStock && partnerStock.mergerProcess) partnerStock.mergerProcess.decisionRequired = null;
    
    // Odśwież UI, aby pokazać nowy status (jeśli proces nie został anulowany)
    displayStocks(getCurrentInputValues());
    if (document.getElementById('management-modal')?.style.display === 'block') {
        openManagementModal(stockSymbol);
    }
}

function openDebtOfferModal(collectorStock, targetLoan, newInterestRate) {
    const modal = document.getElementById('debt-offer-modal');
    if (!modal || !currentDebtOffer) return; // currentDebtOffer jest ustawiane w gameLogic

    const messageEl = document.getElementById('debt-offer-message');
    const acceptBtn = document.getElementById('debt-offer-accept-btn');
    const declineBtn = document.getElementById('debt-offer-decline-btn');

    messageEl.innerHTML = `
        Firma <strong>${collectorStock.name}</strong> zauważyła Twoje problemy z kredytem w <strong>${targetLoan.bankName}</strong>.<br><br>
        Oferujemy natychmiastową spłatę Twojego długu w wysokości <strong>${targetLoan.amount.toFixed(2)} PLN</strong>.<br><br>
        W zamian zaczniesz spłacać tę kwotę nam, ale z nowym, wyższym oprocentowaniem: <strong>${(newInterestRate * 100).toFixed(1)}%</strong> rocznie (zamiast obecnych ${(targetLoan.interestRate * 100).toFixed(1)}%).<br><br>
        Twoje pominięte raty zostaną wyzerowane. Czy akceptujesz ofertę?
    `;

    // Używamy .onclick, aby mieć pewność, że stare listenery są usuwane
    acceptBtn.onclick = () => {
        acceptDebtOffer(); // Wywołuje funkcję z gameLogic
        modal.style.display = 'none';
    };
    
    declineBtn.onclick = () => {
        declineDebtOffer(); // Wywołuje funkcję z gameLogic
        modal.style.display = 'none';
    };

    modal.style.display = 'block';
}

/**
 * Zamyka modal oferty długu (jeśli gracz kliknie 'X' lub 'Odrzuć').
 */
function closeDebtOfferModal() {
    const modal = document.getElementById('debt-offer-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Funkcja declineDebtOffer() w gameLogic wyczyści currentDebtOffer
}

function openPawnOfferModal(pawnShop, targetStock, quantity, loanAmount, newInterestRate, durationWeeks) {
    const modal = document.getElementById('pawn-offer-modal');
    if (!modal || !currentPawnOffer) return; // currentPawnOffer jest ustawiane w gameLogic

    const messageEl = document.getElementById('pawn-offer-message');
    const acceptBtn = document.getElementById('pawn-offer-accept-btn');
    const declineBtn = document.getElementById('pawn-offer-decline-btn');

    messageEl.innerHTML = `
        Firma <strong>${pawnShop.name}</strong> widzi, że potrzebujesz gotówki.<br><br>
        Oferujemy natychmiastową pożyczkę w wysokości <strong>${loanAmount.toFixed(2)} PLN</strong>.
        Jako zabezpieczenie musisz zastawić <strong>${quantity} szt.</strong> swoich akcji <strong>${targetStock.name} (${targetStock.symbol})</strong>.<br><br>
        Będziesz mieć <strong>${durationWeeks} tygodni</strong> na spłatę kwoty <strong>${loanAmount.toFixed(2)} PLN</strong> wraz z odsetkami (${(newInterestRate * 100).toFixed(1)}% rocznie).
    `;

    acceptBtn.onclick = () => {
        acceptPawnOffer(); // Wywołuje funkcję z gameLogic
        modal.style.display = 'none';
    };
    
    declineBtn.onclick = () => {
        declinePawnOffer(); // Wywołuje funkcję z gameLogic
        modal.style.display = 'none';
    };

    modal.style.display = 'block';
}

/**
 * Zamyka modal oferty lombardu (używane przez declinePawnOffer).
 */
function closePawnOfferModal() {
    const modal = document.getElementById('pawn-offer-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// --- Panel Lombardu ---

function openConstructionSectorModal() {
    const modal = document.getElementById('construction-sector-modal');
    if (!modal) {
        console.error('Construction sector modal not found');
        return;
    }

    const content = modal.querySelector('.modal-content');
    if (!content) return;

    // Tytuły przetargów
    const tendersContainer = content.querySelector('#construction-tenders');
    tendersContainer.innerHTML = '<h3>Aktywne Przetargi Budowlane</h3>';

    // Pobierz spółki budowlane
    const builders = stocks.filter(s => s.sector.includes('Budowlany') && !s.isBankrupt && s.constructionStats);

    // Symuluj aktywne przetargi (w rzeczywistości powinny być przechowywane)
    const activeTenders = [];
    stocks.forEach(stock => {
        if (stock.activeInvestments) {
            stock.activeInvestments.forEach(project => {
                if (project.contractor && typeof project.contractor === 'string' && project.contractor.includes('+')) {
                    // To konsorcjum
                    activeTenders.push({
                        client: stock,
                        project: project,
                        isConsortium: true
                    });
                }
            });
        }
    });

    if (activeTenders.length === 0) {
        tendersContainer.innerHTML += '<p>Brak aktywnych przetargów.</p>';
    } else {
        activeTenders.forEach(tender => {
            const tenderDiv = document.createElement('div');
            tenderDiv.className = 'tender-item';
            tenderDiv.innerHTML = `
                <h4>${tender.project.name} (${tender.client.name})</h4>
                <p>Wykonawca: ${tender.project.contractor}</p>
                <p>Postęp: ${Math.min(100, (tender.project.progress / tender.project.totalDuration * 100).toFixed(1))}%</p>
                <p>Koszt: ${tender.project.cost.toFixed(0)} PLN</p>
                ${tender.isConsortium ? '<p style="color: blue;">🔗 Konsorcjum</p>' : ''}
            `;
            tendersContainer.appendChild(tenderDiv);
        });
    }

    // Projekty do wsparcia
    const projectsContainer = content.querySelector('#construction-projects');
    projectsContainer.innerHTML = '<h3>Projekty Budowlane do Wsparcia</h3>';

    const supportableProjects = [];
    stocks.forEach(stock => {
        if (stock.activeInvestments) {
            stock.activeInvestments.forEach((project, index) => {
                if (project.contractor && !project.contractor.includes('+')) { // Nie konsorcjum
                    supportableProjects.push({
                        stock: stock,
                        project: project,
                        index: index
                    });
                }
            });
        }
    });

    if (supportableProjects.length === 0) {
        projectsContainer.innerHTML += '<p>Brak projektów do wsparcia.</p>';
    } else {
        supportableProjects.forEach(item => {
            const projectDiv = document.createElement('div');
            projectDiv.className = 'project-item';
            const progress = Math.min(100, (item.project.progress / item.project.totalDuration * 100));
            projectDiv.innerHTML = `
                <h4>${item.project.name} (${item.stock.name})</h4>
                <p>Wykonawca: ${item.project.contractor}</p>
                <p>Postęp: ${progress.toFixed(1)}%</p>
                <p>Pozostały czas: ${Math.ceil(item.project.totalDuration - item.project.progress)} tygodni</p>
                <button onclick="supportConstructionProjectUI('${item.stock.symbol}', ${item.index}, 10000)">Wesprzyj 10k PLN</button>
                <button onclick="supportConstructionProjectUI('${item.stock.symbol}', ${item.index}, 50000)">Wesprzyj 50k PLN</button>
            `;
            projectsContainer.appendChild(projectDiv);
        });
    }

    // Informacje o konsorcjach
    const consortiumContainer = content.querySelector('#construction-consortiums');
    consortiumContainer.innerHTML = '<h3>Aktywne Konsorcja Budowlane</h3>';

    const activeConsortiums = [];
    stocks.forEach(stock => {
        if (stock.constructionData && stock.constructionData.consortiumPartner) {
            const partner = stocks.find(s => s.symbol === stock.constructionData.consortiumPartner);
            if (partner) {
                activeConsortiums.push({
                    company1: stock,
                    company2: partner,
                    formedAt: stock.constructionData.consortiumFormedAt,
                    synergy: stock.constructionData.consortiumSynergy
                });
            }
        }
    });

    if (activeConsortiums.length === 0) {
        consortiumContainer.innerHTML += '<p>Brak aktywnych konsorcjów.</p>';
    } else {
        activeConsortiums.forEach(cons => {
            const consDiv = document.createElement('div');
            consDiv.className = 'consortium-item';
            const age = Math.floor((Date.now() - cons.formedAt) / (1000 * 60 * 60 * 24 * 7));
            consDiv.innerHTML = `
                <h4>${cons.company1.name} & ${cons.company2.name}</h4>
                <p>Wiek konsorcjum: ${age} tygodni</p>
                <p>Synergia: ${(cons.synergy * 100).toFixed(1)}%</p>
                <p>Renoma: ${cons.company1.renoma || 0} / ${cons.company2.renoma || 0}</p>
            `;
            consortiumContainer.appendChild(consDiv);
        });
    }

    modal.style.display = 'block';
}

function supportConstructionProjectUI(stockSymbol, projectIndex, amount) {
    if (typeof supportConstructionProject === 'function') {
        supportConstructionProject(stockSymbol, projectIndex, amount);
        openConstructionSectorModal(); // Odśwież modal
    }
}
function openPawnShopPanel() {
    const modal = document.getElementById('pawnshop-modal');
    if (!modal) return;
    const statusDiv = document.getElementById('pawnshop-status');
    const listDiv = document.getElementById('pawnshop-loans-list');

    const pawnShop = stocks.find(s => s.assetType === 'PawnShop' && !s.isBankrupt);
    if (!pawnShop) {
        statusDiv.innerHTML = '<p style="color:#dc3545;">Lombard nie jest dostępny.</p>';
        listDiv.innerHTML = '';
        modal.style.display = 'block';
        return;
    }

    statusDiv.innerHTML = `<p><strong>${pawnShop.name}</strong> (${pawnShop.symbol})</p>
        <p>Oprocentowanie: <strong>25% rocznie</strong> | Okres spłaty: <strong>12 tygodni</strong></p>
        <p>Gotówka lombardu: ${pawnShop.cash.toLocaleString('pl-PL')} PLN</p>`;

    const pawnLoans = playerCommercialLoans.filter(l => l.isPawnLoan);
    listDiv.innerHTML = '';

    if (pawnLoans.length > 0) {
        const h4 = document.createElement('h4');
        h4.textContent = 'Twoje pożyczki lombardowe:';
        h4.style.fontSize = '14px';
        listDiv.appendChild(h4);
        pawnLoans.forEach(loan => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:8px;margin-bottom:6px;background:#fff;border-left:3px solid #28a745;';
            const timeLeft = Math.max(0, Math.ceil((loan.maturityDate - Date.now()) / 1000));
            const minutesLeft = Math.floor(timeLeft / 60);
            div.innerHTML = `<p style="margin:0 0 4px"><strong>${loan.amount.toFixed(2)} PLN</strong> [Zastaw: ${loan.collateral.quantity} × ${loan.collateral.symbol}]</p>
                <p style="margin:0;font-size:12px;color:#856404;">Termin spłaty: ${minutesLeft} min</p>`;
            const btn = document.createElement('button');
            btn.textContent = 'Spłać kredyt';
            btn.style.cssText = 'margin-top:6px;padding:4px 12px;background:#28a745;color:#fff;border:none;border-radius:3px;cursor:pointer;';
            btn.onclick = () => {
                repayCommercialLoan(loan.id, loan.amount);
                openPawnShopPanel();
            };
            div.appendChild(btn);
            listDiv.appendChild(div);
        });
    } else {
        listDiv.innerHTML = '<p style="color:#666;font-style:italic;">Brak aktywnych pożyczek lombardowych. Lombard sam złoży Ci ofertę, gdy będziesz w potrzebie.</p>';
    }

    // --- Sekcja aukcji zabezpieczeń ---
    const collateralSection = document.getElementById('pawnshop-collateral-section');
    if (collateralSection) {
        const pawnLoansWithCollateral = playerCommercialLoans.filter(l => l.isPawnLoan && l.collateral);
        if (pawnLoansWithCollateral.length > 0) {
            let html = '<h4 style="font-size:14px;margin:0 0 8px;color:#dc3545;">Aukcje zabezpieczeń:</h4>';
            pawnLoansWithCollateral.forEach(loan => {
                const stock = stocks.find(s => s.symbol === loan.collateral.symbol);
                const marketValue = stock ? (stock.price * loan.collateral.quantity) : 0;
                const isAuctionActive = currentCollateralAuction && currentCollateralAuction.stockSymbol === loan.collateral.symbol;
                html += `<div style="padding:8px;margin-bottom:6px;background:#fff3cd;border-left:3px solid #dc3545;">
                    <p style="margin:0 0 4px;font-size:13px;"><strong>Zastaw:</strong> ${loan.collateral.quantity} × ${loan.collateral.symbol}</p>
                    <p style="margin:0 0 4px;font-size:12px;color:#666;">Wartość rynkowa: <strong>${marketValue.toFixed(2)} PLN</strong> | Dług: <strong>${loan.amount.toFixed(2)} PLN</strong></p>`;
                if (isAuctionActive) {
                    html += `<p style="margin:0;font-size:12px;color:#856404;font-weight:bold;">⏳ W trakcie aukcji...</p>`;
                } else {
                    html += `<button onclick="sellCollateralAtAuction('${loan.id}')" style="margin-top:4px;padding:4px 12px;background:#dc3545;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:12px;">Wystaw na aukcję</button>`;
                }
                html += '</div>';
            });
            collateralSection.innerHTML = html;
            collateralSection.style.display = 'block';
        } else {
            collateralSection.innerHTML = '';
            collateralSection.style.display = 'none';
        }
    }

    modal.style.display = 'block';
}

// --- Panel Windykatora ---
function openDebtCollectorPanel() {
    const modal = document.getElementById('debtcollector-modal');
    if (!modal) return;
    const statusDiv = document.getElementById('debtcollector-status');
    const listDiv = document.getElementById('debtcollector-debts-list');

    const collector = stocks.find(s => s.assetType === 'DebtCollector' && !s.isBankrupt);
    if (!collector) {
        statusDiv.innerHTML = '<p style="color:#dc3545;">Windykator nie jest dostępny.</p>';
        listDiv.innerHTML = '';
        modal.style.display = 'block';
        return;
    }

    statusDiv.innerHTML = `<p><strong>${collector.name}</strong> (${collector.symbol})</p>
        <p style="font-size:12px;color:#666;">Windykator przejmuje niespłacane długi bankowe za wyższe oprocentowanie (×1.5).</p>`;

    const collectorLoans = playerCommercialLoans.filter(l => l.collectorSymbol === collector.symbol && !l.isPawnLoan);
    listDiv.innerHTML = '';

    if (collectorLoans.length > 0) {
        const h4 = document.createElement('h4');
        h4.textContent = 'Twoje długi u windykatora:';
        h4.style.fontSize = '14px';
        listDiv.appendChild(h4);
        collectorLoans.forEach(loan => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:8px;margin-bottom:6px;background:#fff;border-left:3px solid #ffc107;';
            div.innerHTML = `<p style="margin:0 0 4px"><strong>${loan.amount.toFixed(2)} PLN</strong> (Rata: ${loan.weeklyPayment.toFixed(2)} PLN/tydz.)</p>
                <p style="margin:0;font-size:12px;color:#dc3545;">Oprocentowanie: ${(loan.interestRate * 100).toFixed(1)}%</p>`;
            const inputRow = document.createElement('div');
            inputRow.style.cssText = 'display:flex;gap:6px;margin-top:6px;align-items:center;';
            const input = document.createElement('input');
            input.type = 'number';
            input.placeholder = 'Kwota';
            input.style.cssText = 'width:100px;padding:3px;';
            input.value = loan.amount.toFixed(2);
            const btn = document.createElement('button');
            btn.textContent = 'Spłać';
            btn.style.cssText = 'padding:4px 12px;background:#28a745;color:#fff;border:none;border-radius:3px;cursor:pointer;';
            btn.onclick = () => {
                const val = parseFloat(input.value);
                if (!isNaN(val) && val > 0) {
                    repayCommercialLoan(loan.id, val);
                    openDebtCollectorPanel();
                }
            };
            inputRow.appendChild(input);
            inputRow.appendChild(btn);
            div.appendChild(inputRow);
            listDiv.appendChild(div);
        });
    } else {
        listDiv.innerHTML = '<p style="color:#666;font-style:italic;">Nie masz długów u windykatora. Windykator przejmuje długi, gdy zalegasz ze spłatą w banku.</p>';
    }

    modal.style.display = 'block';
}

function switchCityTab(tabName) {
    // Ukryj wszystkie kontenery zakładek miasta
    document.querySelectorAll('#city-investment-modal .bank-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    // Pokaż wybrany kontener
    document.getElementById(`city-content-${tabName}`).style.display = 'block';

    // Zaktualizuj wygląd przycisków zakładek
    document.querySelectorAll('#city-investment-modal .bank-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-btn-city-${tabName}`).classList.add('active');
}

