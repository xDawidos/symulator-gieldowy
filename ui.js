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
    // Gotówka FUNDUSZU (pieniądze klientów); prywatne pieniądze gracza pokazuje displayXP.
    const cashElement = document.getElementById('cash');
    if (cashElement) {
        cashElement.textContent = playerCash.toFixed(2);
    }
    if (typeof displayXP === 'function') displayXP();
}



function displayStocks(previousInputValues = {}) {
  const stockTableBody = document.getElementById('stock-table-body');
  if (!stockTableBody) return;

  // Panel kupna (drawer) przenosimy między odświeżeniami tabeli zamiast budować go od nowa:
  // wpisana ilość, kursor i kliknięcia w przyciski nie giną co sekundę.
  const openDrawer = typeof openStockDrawerSymbol !== 'undefined' && openStockDrawerSymbol
    ? document.getElementById(`drawer-${openStockDrawerSymbol}`)
    : null;
  const drawerInput = openDrawer ? openDrawer.querySelector('input') : null;
  const drawerState = drawerInput ? {
    focused: document.activeElement === drawerInput,
    selectionStart: drawerInput.selectionStart,
    selectionEnd: drawerInput.selectionEnd
  } : null;
  if (openDrawer) openDrawer.remove();

  // Nagłówek ceny (strzałki sortowania)
  const priceHeader = document.getElementById('price-header-cell');
  if (priceHeader) {
    let headerText = 'Cena PLN';
    if (currentSortState === 'price_asc') headerText += ' ▲';
    else if (currentSortState === 'price_desc') headerText += ' ▼';
    priceHeader.textContent = headerText;
  }

  const selectedSector = document.getElementById('sector-filter').value;

  // Filtrowanie spółek do wyświetlenia
  let baseStocksToDisplay;
  if (selectedSector === 'all') {
    baseStocksToDisplay = stocks.filter(stock => !stock.isSubsidiaryOf);
  } else if (selectedSector === 'REIT') {
    baseStocksToDisplay = stocks.filter(
      stock => stock.assetType === 'REIT' && !stock.isSubsidiaryOf
    );
  } else {
    baseStocksToDisplay = stocks.filter(
      stock =>
        Array.isArray(stock.sector) &&
        stock.sector.includes(selectedSector) &&
        !stock.isSubsidiaryOf
    );
  }

  stockTableBody.innerHTML = '';
  const sortedExchanges = Object.keys(exchanges).sort(
    (a, b) => exchanges[a].level - exchanges[b].level
  );
  const hasAnalystSkill = getSkillLevel('financialAnalyst') > 0;

  // --- Funkcja pomocnicza do renderowania wiersza ---
  const renderStockRow = (stock, isSubsidiary = false, parentSymbol = null) => {
    const exchangeData = exchanges[stock.exchange];
    const hasAccess = exchangeData ? exchangeData.level <= playerAccessLevel : false;
    const isLocked = stock.isTradeLocked;

    const row = stockTableBody.insertRow();
    row.dataset.symbol = stock.symbol;
    row.classList.add('stock-row');
    row.dataset.level = stock.exchange || 'ALL';
    row.style.cursor = 'pointer';

    row.addEventListener('click', e => {
      if (
        !e.target.closest('button') &&
        !e.target.closest('input') &&
        !e.target.closest('.subsidiary-toggle')
      ) {
        toggleStockDrawer(stock.symbol);
      }
    });

    if (stock.isBankrupt) {
      row.classList.add('bankrupt-row');
      row.title = 'BANKRUCTWO!';
    } else if (isLocked) {
      row.classList.add('locked-row');
      row.title = 'HANDEL WSTRZYMANY';
    } else if (stock.financialHealth <= -4) {
      row.classList.add('warning-row');
      row.title = 'UWAGA: Spółka jest na krawędzi bankructwa!';
    }

    if (isSubsidiary) {
      row.classList.add('subsidiary-row');
      if (parentSymbol) row.classList.add(`subsidiary-of-${parentSymbol}`);
      row.style.display = 'none';
    }

    row.classList.add(`exchange-group-${stock.exchange}`);

    const sharesOwned = playerPortfolio[stock.symbol]
      ? playerPortfolio[stock.symbol].shares
      : 0;
    const playerSharePct =
      stock.totalShares > 0 ? (sharesOwned / stock.totalShares) * 100 : 0;

    const availableShares = getAvailableShares(stock);

    let changePct = 0;
    if (Array.isArray(stock.priceHistory) && stock.priceHistory.length >= 2) {
      const prevPrice = stock.priceHistory[stock.priceHistory.length - 2];
      if (prevPrice > 0) {
        changePct = ((stock.price - prevPrice) / prevPrice) * 100;
      }
    }

    const changeClass = changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat';
    const changeSign = changePct > 0 ? '+' : '';
    const primarySector =
      Array.isArray(stock.sector) && stock.sector.length > 0
        ? stock.sector[0]
        : 'Rynek';
    const availabilityPct =
      stock.totalShares > 0
        ? Math.max(
            0,
            Math.min(100, (availableShares / stock.totalShares) * 100)
          )
        : 0;

    const isDisabled =
      !hasAccess || isLocked || stock.isBeingMerged || stock.canBeTraded === false;

    // KOMÓRKA 1: SPÓŁKA
    const nameCell = row.insertCell();
    nameCell.classList.add('stock-company-cell');

    const identityWrap = document.createElement('div');
    identityWrap.className = 'stock-identity';

    const topLine = document.createElement('div');
    topLine.className = 'stock-name-line';
    if (isSubsidiary) topLine.style.paddingLeft = '25px';

    if (stock.subsidiaries && stock.subsidiaries.length > 0) {
      const toggleBtn = document.createElement('span');
      toggleBtn.textContent = stock.isSubsidiaryExpanded ? '▼' : '▶';
      toggleBtn.style.cursor = 'pointer';
      toggleBtn.style.marginRight = '6px';
      toggleBtn.onclick = e => {
        e.stopPropagation();
        toggleSubsidiaryVisibility(stock.symbol);
      };
      toggleBtn.classList.add('subsidiary-toggle');
      topLine.appendChild(toggleBtn);
    }

    let markerPrefix = '';
    if (playerSharePct > 50) markerPrefix += '👑 ';
    if (stock.assetType === 'ResearchInstitute') markerPrefix += '🧪 ';
    if (stock.isMonopolist) markerPrefix += '🦁 ';
    if (stock.isStateOwned) {
      markerPrefix += '🏛️ ';
      nameCell.title = 'Spółka Skarbu Państwa';
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'stock-name';
    nameSpan.textContent = `${markerPrefix}${stock.name}`;
    topLine.appendChild(nameSpan);

    if (sharesOwned > 0) {
      const ownedDot = document.createElement('span');
      ownedDot.className = 'owned-dot';
      ownedDot.title = 'Masz akcje tej spółki';
      topLine.appendChild(ownedDot);
    }

    const infoButton = document.createElement('button');
    infoButton.textContent = 'i';
    infoButton.className = 'info-btn';
    infoButton.onclick = () => openDescriptionModal(stock.symbol);
    topLine.appendChild(infoButton);

    const metaLine = document.createElement('div');
    metaLine.className = 'stock-meta';
    metaLine.textContent = `${primarySector} • ${stock.symbol}`;

    identityWrap.appendChild(topLine);
    identityWrap.appendChild(metaLine);

    if (stock.mergerProcess) {
      const process = stock.mergerProcess;
      const mergerStatusContainer = document.createElement('div');
      mergerStatusContainer.style.marginTop = '6px';
      mergerStatusContainer.style.width = '90px';
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
      else if (process.complications > 0)
        progressBar.classList.add('complication');

      mergerStatusContainer.appendChild(statusText);
      mergerStatusContainer.appendChild(progressBar);
      identityWrap.appendChild(mergerStatusContainer);
    }

    nameCell.appendChild(identityWrap);

    // KOMÓRKA 2: SEKTOR
    const sectorCell = row.insertCell();
    sectorCell.textContent = primarySector;

    // KOMÓRKA 3: CENA
    const priceCell = row.insertCell();
    priceCell.classList.add('cell-number', 'cell-price');
    priceCell.innerHTML = `
      <div class="price-main">
        ${stock.price.toLocaleString('pl-PL', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })} PLN
      </div>
    `;

    if (stock.corporatePhase && getSkillLevel('financialAnalyst') >= 1) {
      const phaseBadge = document.createElement('div');
      phaseBadge.style.cssText =
        'font-size:10px;margin-top:4px;padding:2px 6px;border-radius:999px;display:inline-block;';
      const phaseColors = {
        Wzrost: '#28a745',
        Stabilność: '#6c757d',
        Spadek: '#dc3545',
        Reorganizacja: '#ffc107',
        'Złoty Rok ✨': '#ffd700',
        'Zejście w Cień 👻': '#6f42c1',
        'Impuls Innowacji 💡': '#17a2b8'
      };
      const col = phaseColors[stock.corporatePhase] || '#6c757d';
      phaseBadge.style.color = col;
      phaseBadge.style.border = '1px solid ' + col;
      phaseBadge.textContent = stock.corporatePhase;
      phaseBadge.title = 'Faza cyklu spółki';
      priceCell.appendChild(phaseBadge);
    }

    // KOMÓRKA 4: ZMIANA 24h
    const changeCell = row.insertCell();
    changeCell.classList.add('cell-number');
    changeCell.innerHTML = `
      <span class="change-pill ${changeClass}">
        ${changeSign}${changePct.toFixed(2)}%
      </span>
    `;

    // KOMÓRKA 5: WOLUMEN / dostępne
    const availableCell = row.insertCell();
    availableCell.innerHTML = `
      <div class="availability-cell">
        <div class="availability-value">
          ${availableShares.toLocaleString('pl-PL')}
        </div>
        <div class="mini-progress">
          <div class="mini-progress-bar" style="width:${availabilityPct}%"></div>
        </div>
      </div>
    `;

    // KOMÓRKA 6: Moje akcje
    const ownedCell = row.insertCell();
    ownedCell.classList.add('cell-number');
    ownedCell.innerHTML =
      sharesOwned > 0
        ? `<span class="owned-badge">${sharesOwned.toLocaleString(
            'pl-PL'
          )}</span>`
        : `<span class="owned-zero">0</span>`;

    // KOMÓRKA 7: Akcja
    const actionsCell = row.insertCell();
    actionsCell.classList.add('trade-actions-cell');
    actionsCell.style.textAlign = 'center';

    if (!hasAccess) {
      const lockSpan = document.createElement('span');
      lockSpan.textContent = '🔒';
      lockSpan.title = 'Brak dostępu do giełdy';
      lockSpan.style.fontSize = '18px';
      actionsCell.appendChild(lockSpan);
    } else if (isLocked || stock.isBeingMerged || stock.canBeTraded === false) {
      const stopSpan = document.createElement('span');
      stopSpan.textContent = '⛔';
      stopSpan.title = 'Handel wstrzymany';
      stopSpan.style.fontSize = '18px';
      actionsCell.appendChild(stopSpan);
    } else {
      const drawerBtn = document.createElement('button');
      drawerBtn.className = 'btn-ghost-icon drawer-toggle-btn';
      drawerBtn.dataset.symbol = stock.symbol;
      drawerBtn.title = 'Kup / Sprzedaj / Wykres';
      drawerBtn.innerHTML =
        sharesOwned > 0
          ? '<span style="color:var(--accent-primary)">▼</span>'
          : '▼';
      drawerBtn.onclick = e => {
        e.stopPropagation();
        toggleStockDrawer(stock.symbol);
      };
      actionsCell.appendChild(drawerBtn);
    }

    const hiddenQty = document.createElement('input');
    hiddenQty.type = 'number';
    hiddenQty.id = `quantity-${stock.symbol}`;
    hiddenQty.value =
      previousInputValues[stock.symbol] !== undefined
        ? previousInputValues[stock.symbol]
        : '1';
    hiddenQty.style.display = 'none';
    actionsCell.appendChild(hiddenQty);

    if (hasAnalystSkill) {
      const reportMap = {
        excellent: { icon: '💎', label: 'Doskonały' },
        good: { icon: '📈', label: 'Dobry' },
        neutral: { icon: '😐', label: 'Neutralny' },
        bad: { icon: '📉', label: 'Zły' },
        tragic: { icon: '🔥', label: 'Tragiczny' }
      };
      const rep = reportMap[stock.lastReport];
      if (rep) {
        const repSpan = document.createElement('span');
        repSpan.textContent = rep.icon;
        repSpan.title = `Raport: ${rep.label}`;
        repSpan.style.cssText =
          'font-size:14px;margin-left:4px;cursor:default;';
        actionsCell.appendChild(repSpan);
      }
    }

    const hasDebt = stock.balanceSheet
      ? stock.balanceSheet.liabilities > 0
      : false;
    if (hasDebt && (hasAnalystSkill || playerSharePct > 50)) {
      const debtSpan = document.createElement('span');
      debtSpan.textContent = '💳';
      debtSpan.title = 'Spółka ma zobowiązania';
      debtSpan.style.cssText =
        'font-size:12px;margin-left:2px;cursor:default;';
      actionsCell.appendChild(debtSpan);
    }

    if (playerSharePct > 50) {
      const manageButton = document.createElement('button');
      manageButton.textContent = '👑';
      manageButton.title = 'Panel Zarządzania';
      manageButton.className = 'btn-ghost-icon';
      manageButton.style.marginLeft = '4px';
      manageButton.onclick = e => {
        e.stopPropagation();
        openManagementModal(stock.symbol);
      };
      actionsCell.appendChild(manageButton);
    }

    return row;
  };

  // --- Pętla renderująca giełdy ---
  sortedExchanges.forEach(exchangeKey => {
    const exchange = exchanges[exchangeKey];
    let stocksOnThisExchange = baseStocksToDisplay.filter(
      stock => stock.exchange === exchangeKey
    );

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
      headerCell.colSpan = 7;
      const icon = exchangeCollapseState[exchangeKey] ? '▶' : '▼';
      headerCell.innerHTML = `<h4 style="margin: 5px 0; color: ${
        exchange.color
      }; display: flex; justify-content: space-between;">${
        exchange.name
      }<span>${icon}</span></h4>`;
    }

    stocksOnThisExchange.forEach(stock => {
      const mainRow = renderStockRow(stock, false);
      if (exchangeCollapseState[exchangeKey]) mainRow.style.display = 'none';

      if (stock.subsidiaries && stock.subsidiaries.length > 0) {
        stock.subsidiaries.forEach(subSymbol => {
          const subStock = stocks.find(s => s.symbol === subSymbol);
          if (subStock) {
            const subRow = renderStockRow(subStock, true, stock.symbol);
            if (
              exchangeCollapseState[exchangeKey] ||
              !stock.isSubsidiaryExpanded
            )
              subRow.style.display = 'none';
            else subRow.style.display = '';
          }
        });
      }
    });
  });

  if (typeof openStockDrawerSymbol !== 'undefined' && openStockDrawerSymbol) {
    const targetRow = document.querySelector(`#stock-table-body tr[data-symbol="${openStockDrawerSymbol}"]`);
    if (targetRow) {
      if (openDrawer) {
        targetRow.after(openDrawer);
      } else {
        renderStockDrawer(openStockDrawerSymbol);
      }
      if (drawerInput && drawerState?.focused) {
        drawerInput.focus();
        try { drawerInput.setSelectionRange(drawerState.selectionStart, drawerState.selectionEnd); } catch (e) { /* brak zaznaczenia */ }
      }
    } else {
      openStockDrawerSymbol = null;
    }
  }
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

const skillCategoryDefinitions = {
    bear: {
        title: 'Bessa & Obrona',
        description: 'Umiejętności chroniące kapitał podczas spadków, regulacji i ryzyka finansowego.'
    },
    bull: {
        title: 'Hossa & Wzrost',
        description: 'Zwiększaj zyski, dźwignię bankową i śmiałe inwestycje na rynku.'
    },
    balance: {
        title: 'Równowaga & Kontrola',
        description: 'Wsparcie analityczne, zarządzanie ryzykiem i bardziej stabilne decyzje.'
    }
};

const skillCategoryMap = {
    adblock: 'balance',
    work: 'bull',
    analyticalMind: 'balance',
    ironNerves: 'bear',
    sharkCharisma: 'bull',
    hardNegotiator: 'bear',
    bankMagnet: 'bull',
    dividendAnalyst: 'bull',
    financialAnalyst: 'bull',
    etfExpert: 'bull',
    insiderAccess: 'bull',
    sanEscobar: 'bear',
    sixthSense: 'balance',
    indexAnalystLvl1: 'bull',
    nepotism: 'balance',
    startupInvestor: 'bull',
    charisma: 'bear',
    accountant: 'bear',
    mediaManipulation: 'bear'
};

function getSkillCategory(skillId) {
    return skillCategoryMap[skillId] || 'balance';
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
        // Aktywa funduszu: gotówka + akcje/ETF/indeksy + obligacje i bony (fund.js)
        const totalPortfolioValue = playerFund ? getFundAssets() : playerCash + totalStocksValue + startupValue;
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

/** Ranking funduszy: gracz, zarządcy korporacji i fundusze zewnętrzne — zwrot z 4 okresów, stabilność, zaufanie. */
function getFundRanking() {
    const compound = returns => returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
    const average = (periods, key) => periods.length ? periods.reduce((sum, p) => sum + p[key], 0) / periods.length : 0;
    const playerPeriods = (playerFund?.periods || []).slice(-FUND_PERIODS_SHOWN);
    const rows = [{
        name: `💼 ${playerProfile?.fundName || 'Twój fundusz'}`, owner: `${playerProfile?.name || 'Ty'} · ${getPlayerPosition().name}`,
        ret: compound(playerPeriods.map(p => p.fundReturn)), vol: average(playerPeriods, 'volatility'),
        trust: playerFund?.trust ?? null, assets: playerFund ? getFundAssets() : 0, mine: true
    }];

    for (const manager of corporation?.managers || []) {
        const periods = manager.fund.periods.slice(-FUND_PERIODS_SHOWN);
        rows.push({
            name: `🏢 Fundusz ${manager.name.split(' ')[1] || manager.name}`,
            owner: `${manager.name} · ${CAREER_POSITIONS[getPositionIndex(manager.positionId)].name}`,
            ret: compound(periods.map(p => p.fundReturn)), vol: average(periods, 'volatility'),
            trust: manager.fund.trust, assets: getBotFundAssets(manager.fund)
        });
    }

    for (const fund of getExternalFunds()) {
        const returns = playerPeriods.map(p => p.rivals.find(r => r.symbol === fund.symbol)?.return).filter(Number.isFinite);
        rows.push({
            name: `🌐 ${getExternalFirmName(fund)}`, owner: fund.managedByCorporation ? 'Przejęty przez korporację' : 'Firma zewnętrzna',
            ret: compound(returns), vol: null, trust: null, assets: getExternalFundValue(fund) * fund.totalShares
        });
    }
    return rows.sort((a, b) => b.ret - a.ret);
}

function displayLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    if (!playerFund) { container.innerHTML = '<p class="fund-muted">Brak funduszu.</p>'; return; }

    container.innerHTML = `
        <p class="fund-muted">Zwrot skumulowany z ${FUND_PERIODS_SHOWN} ostatnich okresów. Liczy się wynik, nie wielkość funduszu.</p>
        <table class="asset-mini-table leaderboard-table">
            <thead><tr><th>#</th><th>Fundusz</th><th>Zwrot</th><th>Zmienność</th><th>Zaufanie</th><th>Aktywa</th></tr></thead>
            <tbody>${getFundRanking().map((row, index) => `
                <tr class="${row.mine ? 'mine' : ''}">
                    <td>${index + 1}</td>
                    <td>${escapeHtml(row.name)}<br><small class="fund-muted">${escapeHtml(row.owner)}</small></td>
                    <td class="${row.ret >= 0 ? 'profit' : 'loss'}">${formatPct(row.ret)}</td>
                    <td>${row.vol === null ? '—' : formatPct(row.vol)}</td>
                    <td>${row.trust === null ? '—' : row.trust.toFixed(0)}</td>
                    <td>${formatZl(row.assets, 0)}</td>
                </tr>`).join('')}</tbody>
        </table>`;
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

/** Kontrola mediów (PR) — panel w skrzynce mailowej, od szkolenia „Manipulacja mediami”. */
function renderMediaInfluence() {
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

    // --- 2. INWESTYCJE W TOKU (wewnętrzne + zamówienia budowlane) ---
    if (!Array.isArray(stock.activeInvestments)) stock.activeInvestments = [];
    const devLevel = stock.departments.development.level;
    const stockKey = getEntityKey(stock);
    const openTenders = activeTenders.filter(tender =>
        ['open', 'closed'].includes(tender.status) && getEntityKey(tender.clientCompany) === stockKey
    );
    const clientProjects = constructionProjects.filter(project =>
        !project.settled && getEntityKey(project.tender?.clientCompany) === stockKey
    );

    const activeDiv = document.createElement('div');
    activeDiv.innerHTML = `<h5>🚧 Inwestycje w toku (${countCompanyInvestmentOrders(stock)}/${Math.max(1, devLevel)})</h5>`;

    const orders = [
        ...stock.activeInvestments.map(inv => ({
            ref: inv.uid || inv.id,
            name: inv.name,
            path: 'Realizacja własna',
            progress: Math.min(1, inv.progress / inv.totalDuration),
            detail: `${Math.min(inv.progress, inv.totalDuration).toFixed(0)} / ${inv.totalDuration} dni`
        })),
        ...openTenders.map(tender => ({
            ref: tender.id,
            name: tender.buildingType.name,
            path: 'Przetarg budowlany',
            progress: 0,
            detail: tender.status === 'open'
                ? `Oferty: ${tender.bids.length}, zostało ${formatConstructionTime(tender.remainingGameMs)}`
                : 'Rozstrzyganie przetargu'
        })),
        ...clientProjects.map(project => ({
            ref: project.id,
            name: project.tender.buildingType.name,
            path: `Wykonawca: ${project.builder.name}`,
            progress: project.progress,
            detail: getConstructionProjectStatusLabel(project)
        }))
    ];

    if (orders.length > 0) {
        const invList = document.createElement('ul');
        invList.style.listStyle = 'none';
        invList.style.padding = '0';

        for (const order of orders) {
            const li = document.createElement('li');
            li.style.marginBottom = '8px';
            li.style.padding = '8px';
            li.style.borderLeft = '3px solid #007bff';

            const head = document.createElement('div');
            head.style.display = 'flex';
            head.style.justifyContent = 'space-between';
            const name = document.createElement('strong');
            name.textContent = order.name;
            const cancel = document.createElement('button');
            cancel.textContent = 'Zablokuj';
            cancel.style.fontSize = '9px';
            cancel.onclick = () => blockInvestment(stock.symbol, order.ref);
            head.append(name, cancel);

            const bar = document.createElement('progress');
            bar.max = 1;
            bar.value = order.progress;
            bar.dataset.orderRef = order.ref;
            bar.style.width = '100%';
            bar.style.height = '10px';

            const info = document.createElement('div');
            info.style.fontSize = '10px';
            info.textContent = `${(order.progress * 100).toFixed(0)}% · ${order.detail} · ${order.path}`;

            li.append(head, bar, info);
            invList.appendChild(li);
        }
        activeDiv.appendChild(invList);
    } else {
        activeDiv.innerHTML += `<p style="font-size: 12px; color: #888; font-style: italic;">Brak aktywnych projektów.</p>`;
    }
    deptSection.appendChild(activeDiv);

    // --- 3. KATALOG DOSTĘPNYCH INWESTYCJI (wszystkie sektory spółki, bez duplikatów) ---
    const catalogDiv = document.createElement('div');
    catalogDiv.style.marginTop = '15px';
    catalogDiv.innerHTML = `<h5>📋 Katalog Inwestycji</h5>
        <p style="font-size: 10px; color: #666;">Pozycje budowlane trafiają do przetargu (cena = budżet przetargu, czas w dniach budowy).
        Pozostałe spółka realizuje sama. Czas podany w dniach (1 dzień = 1/7 tygodnia gry).</p>`;

    const table = document.createElement('table');
    table.style.fontSize = '11px';
    table.style.width = '100%';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Nazwa</th>
                <th>Rodzaj</th>
                <th>Koszt</th>
                <th>Czas</th>
                <th>Efekt</th>
                <th>Akcja</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    const isLimitReached = countCompanyInvestmentOrders(stock) >= Math.max(1, devLevel);

    getInvestmentCatalogForCompany(stock).forEach(inv => {
        const tr = document.createElement('tr');
        const realCost = getInvestmentCostForCompany(stock, inv);
        const isConstruction = CONSTRUCTION_KINDS.includes(inv.kind);
        const isAffordable = canFinanceAmount(stock, isConstruction ? getConstructionSpec(inv.id).cost * 1.2 : realCost);
        const hasLevel = devLevel >= inv.minDevLevel;
        const inProgress = hasCompanyInvestmentInProgress(stock, inv.id);

        let statusBtn = '';
        if (!hasLevel) {
            statusBtn = `<span style="color: gray; font-size: 9px;">Wymaga działu rozwoju Lvl ${inv.minDevLevel}</span>`;
        } else if (inProgress) {
            statusBtn = `<span style="color: #17a2b8; font-size: 9px;">W toku</span>`;
        } else if (!isAffordable) {
            statusBtn = `<span style="color: #dc3545; font-size: 9px;">Brak środków</span>`;
        } else if (isLimitReached) {
            statusBtn = `<span style="color: #ffc107; font-size: 9px;">Limit projektów</span>`;
        } else {
            statusBtn = `<button onclick="forceCompanyInvestment('${stock.symbol}', '${inv.id}')" style="padding: 2px 8px; font-size: 11px; background-color: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">${isConstruction ? 'Przetarg' : 'Start'}</button>`;
        }

        const iconSrc = inv.icon || 'img/box.png';
        const kindLabel = INVESTMENT_KIND_LABELS[inv.kind] || inv.kind;
        const mixedNote = inv.kind === 'mixed' ? `<div style="font-size: 9px; color: #666;">budowa ${(inv.constructionShare * 100).toFixed(0)}% kosztu</div>` : '';

        tr.innerHTML = `
            <td style="display: flex; align-items: center;">
                <img src="${iconSrc}" style="width: 24px; height: 24px; margin-right: 8px; object-fit: contain;" onerror="this.style.display='none'">
                <span>${inv.name}</span>
            </td>
            <td>${kindLabel}${mixedNote}</td>
            <td>${(realCost / 1000).toFixed(0)}k PLN</td>
            <td>${inv.durationDays} dni</td>
            <td>
                <div style="font-size: 10px; color: #555;">
                    ${inv.assetValue > 0 ? `<div>🏠 szac. ${(inv.assetValue / 1000).toFixed(0)}k</div>` : ''}
                    ${inv.incomeBonus > 0 ? `<div>💰 +${(inv.incomeBonus * 100).toFixed(0)}%</div>` : ''}
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
        policySelect.value = normalizeDividendPolicy(stock.dividendPolicy);
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

    const insights = document.getElementById('analyst-insights');
    if (insights) {
        const lines = typeof getAnalystInsights === 'function' ? getAnalystInsights(stock) : [];
        insights.innerHTML = lines.map(line => `<p>🔎 ${escapeHtml(line)}</p>`).join('');
    }

    modal.style.display = 'block';
}

let nextNumberToClick = 1;
const WORK_REWARD = 100;

function updateWorkButtonVisibility() {
    const workBtn = document.getElementById('open-work-btn');
    if (!workBtn) return;

    workBtn.style.display = getSkillLevel('work') > 0 ? 'inline-block' : 'none';
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
    if (!FEATURE_FLAGS.minigames) { if (typeof showToast === 'function') showToast('Minigry są zamrożone.', 'default'); return; } // wyłączone w etapie B
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

    // Ogłoszone (oczekujące) dywidendy i REIT-y — najbliższe wypłaty na górze.
    const dividendStocks = stocks
        .filter(s => !s.isBankrupt && (s.pendingDividend || s.assetType === 'REIT'))
        .sort((a, b) => a.dividendTimer - b.dividendTimer);

    if (dividendStocks.length === 0) {
        const row = body.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.textContent = "Brak spółek dywidendowych na rynku lub wymaganego poziomu umiejętności.";
        cell.style.textAlign = "center";
        return;
    }

    dividendStocks.forEach(stock => {
        const row = body.insertRow();
        row.insertCell().textContent = stock.name;
        row.insertCell().textContent = stock.assetType === 'REIT' ? 'REIT (co 2 min)' : getDividendPolicyLabel(stock.dividendPolicy);

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

        // 📈 Stopa dywidendy (dywidenda / cena)
        const yieldCell = row.insertCell();
        const dps = Number(stock.estimatedDividend) || 0;
        yieldCell.textContent = skillLvl >= 3 && stock.price > 0 ? `${(dps / stock.price * 100).toFixed(2)}%` : '???';
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
                row.classList.add('player-row'); // Dodaj klasę CSS dla gracza
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

    let currentTheme = 'light';
    function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
}

function applyInitialTheme() {
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
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
    if (phaseInfoDiv && stock.corporatePhase && getSkillLevel('financialAnalyst') >= 1) {
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
            <div style="display:flex; align-items:center; gap:12px; margin-bottom: 10px;">
                <div style="flex: 0 0 80px; text-align:center; background:#f1f1f1; border-radius:12px; padding:10px;">
                    <span style="font-size:24px;">👔</span>
                </div>
                <div style="flex:1;">
                    <h4 style="margin: 0;">${stock.ceo.name}</h4>
                    <p style="margin: 5px 0; font-size: 12px; color: #666;">Wiek: ${stock.ceo.age}, Staż w firmie: ${tenureYears} lat</p>
                </div>
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

        // 2. Fundamenty (4 ostatnie kwartały): przychody, EBITDA, zysk, EPS, C/Z, C/WK, na akcję
        const f = stock.fundamentals ? updateFundamentalRatios(stock) : null;
        if (f) {
            const money = value => Number.isFinite(value) ? `${value.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN` : 'N/A';
            const perShare = value => Number.isFinite(value) ? `${value.toFixed(2)} PLN` : 'N/A';
            const ratio = value => value === null || !Number.isFinite(value) ? (f.epsTtm < 0 ? 'Strata' : 'N/A') : value.toFixed(2);

            indicatorsHTML += `<p><strong>Przychody (4 kw.):</strong> ${f.revenueTtm > 0 ? money(f.revenueTtm) : 'N/A'}</p>`;
            indicatorsHTML += `<p><strong>EBITDA (4 kw.):</strong> ${money(f.ebitdaTtm)}</p>`;
            indicatorsHTML += `<p><strong>Zysk netto (4 kw.):</strong> ${money(f.netIncomeTtm)}</p>`;
            indicatorsHTML += `<p><strong>Zysk na akcję (EPS):</strong> ${perShare(f.epsTtm)}</p>`;
            indicatorsHTML += `<p><strong>Cena/Zysk (C/Z):</strong> ${ratio(f.peRatio)}</p>`;
            indicatorsHTML += `<p><strong>Sprzedaż na akcję:</strong> ${f.revenueTtm > 0 ? perShare(f.salesPerShare) : 'N/A'}</p>`;
            indicatorsHTML += `<p><strong>Wartość księgowa na akcję:</strong> ${perShare(f.bookValuePerShare)} (C/WK: ${f.pbRatio ? f.pbRatio.toFixed(2) : 'N/A'})</p>`;

            if (getSkillLevel('financialAnalyst') >= 1 && f.fairValue > 0) {
                indicatorsHTML += `<p><strong>Wycena analityczna:</strong> ${perShare(f.fairValue)} (${((f.fairValue / stock.price - 1) * 100).toFixed(1)}% vs kurs)</p>`;
            }
        }

        // Dywidenda: strategia, ostatnia wypłata, ogłoszona wypłata
        if (stock.assetType !== 'REIT') {
            const last = stock.lastDividend;
            indicatorsHTML += `<p><strong>Strategia dywidendowa:</strong> ${getDividendPolicyLabel(stock.dividendPolicy)}</p>`;
            indicatorsHTML += `<p><strong>Ostatnia dywidenda:</strong> ${last ? `${last.dps.toFixed(4)} PLN/akcję (stopa ${(last.yield * 100).toFixed(2)}%)` : 'brak'}</p>`;
            if (stock.pendingDividend) {
                indicatorsHTML += `<p><strong>Ogłoszona wypłata:</strong> ${stock.pendingDividend.dps.toFixed(4)} PLN/akcję za ${Math.ceil(Math.max(0, stock.dividendTimer) / 1000)} s</p>`;
            }
        }

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

function closeVisibleModals() {
    document.querySelectorAll('div[id$="-modal"]').forEach(modal => {
        if (modal instanceof HTMLElement) modal.style.display = 'none';
    });
}

function initializeDraggableModals() {
    // Tylko kontenery okien (div) — przycisk #theme-toggle-btn-modal też kończy się na "-modal".
    const modals = Array.from(document.querySelectorAll('div[id$="-modal"]'));
    modals.forEach(modal => {
        if (!(modal instanceof HTMLElement)) return;
        modal.classList.add('modal');
        modal.style.position = 'fixed';
        modal.style.touchAction = 'none';
        const dragHandle = modal.querySelector('.modal-header') || modal;
        dragHandle.style.cursor = 'move';

        const onMouseDown = e => {
            if (e.button !== 0) return;
            if (e.target.closest('button, input, select, textarea, a, .close-btn')) return;
            e.preventDefault();

            const rect = modal.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            const initialLeft = rect.left;
            const initialTop = rect.top;

            modal.style.transform = 'none';
            modal.style.left = `${initialLeft}px`;
            modal.style.top = `${initialTop}px`;

            const onMouseMove = moveEvent => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;
                modal.style.left = `${initialLeft + dx}px`;
                modal.style.top = `${initialTop + dy}px`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.userSelect = '';
            };

            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        dragHandle.addEventListener('mousedown', onMouseDown);
    });
}

window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeVisibleModals();
    }
});

window.addEventListener('DOMContentLoaded', initializeDraggableModals);

function openCityInvestmentModal() {
    const modal = document.getElementById('city-investment-modal');
    if (!modal) return;
    
    modal.style.display = 'block';
    updateCityModalContent(); // po pokazaniu — funkcja aktualizuje tylko widoczne okno
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
        const policy = MAYOR_POLICIES[city.mayor.policy];
        document.getElementById('city-mayor-policy').textContent = `${policy?.label || city.mayor.policy} — ${policy?.description || ''}`;
        const support = document.getElementById('city-mayor-support');
        if (support) support.textContent = `${Number(city.mayor.support || 0).toFixed(0)}%`;
        const electionTab = document.getElementById('tab-btn-city-election');
        if (electionTab) electionTab.style.display = city.election ? '' : 'none';
        renderCityElection();
        
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
    if (!FEATURE_FLAGS.privateLoans) { if (typeof showToast === 'function') showToast('Zarządca funduszu nie zaciąga prywatnych kredytów ani lokat.', 'default'); return; } // wyłączone w etapie B
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
    if (!FEATURE_FLAGS.privateLoans) { if (typeof showToast === 'function') showToast('Zarządca funduszu nie zaciąga prywatnych kredytów ani lokat.', 'default'); return; } // wyłączone w etapie B
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
    if (!FEATURE_FLAGS.privateLoans) { if (typeof showToast === 'function') showToast('Zarządca funduszu nie zaciąga prywatnych kredytów ani lokat.', 'default'); return; } // wyłączone w etapie B
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
            ${renderFinancialPeriodPreview(stock)}
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

/** Podgląd pozycji okresu: koszty R&D, kontrakty, nieruchomości i ostatni raport. */
function renderFinancialPeriodPreview(stock) {
    const fmt = value => (Number(value) || 0).toLocaleString('pl-PL', { maximumFractionDigits: 0 }) + ' PLN';
    const rd = getResearchCostSummary(stock);
    const period = getPendingPeriodResult(stock);
    const last = stock.lastReportBreakdown;

    let html = `
        <hr>
        <h4>Bieżący okres (do następnego raportu):</h4>
        <p>R&D — koszty rozpoczęcia: ${fmt(rd.pendingStartup)}, utrzymania: ${fmt(rd.pendingMaintenance)}</p>
        <p>Kontrakty budowlane — przychody: ${fmt(period.constructionRevenue)}, koszty: ${fmt(period.constructionCosts)}</p>
        <p>Nieruchomości (netto): ${fmt(period.propertyIncome)} · Koszty inwestycji: ${fmt(period.investmentExpense)} · Pozostałe: ${fmt(period.otherIncome)}</p>
        <p style="font-size: 11px; color: #666;">Pozycje te są już rozliczone w gotówce i bilansie; raport kwartalny tylko je wykaże.</p>
        <p>R&D łącznie od początku — rozpoczęcia: ${fmt(rd.totalStartup)}, utrzymanie: ${fmt(rd.totalMaintenance)}</p>`;

    if (last) {
        html += `
        <h4>Ostatni raport kwartalny:</h4>
        <p>Wynik operacyjny: ${fmt(last.operating)} · Koszty R&D: −${fmt(last.researchExpense)}</p>
        <p>Kontrakty: ${fmt(last.constructionRevenue - last.constructionCosts)} · Nieruchomości: ${fmt(last.propertyIncome)} · Inwestycje: −${fmt(last.investmentExpense)}</p>
        <p><strong>Wynik raportowany: ${fmt(last.total)}</strong></p>`;
    }

    return html;
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

    // --- Wskaźnik koniunktury (faza cyklu gospodarczego) ---
    const sentimentEl = document.getElementById('market-sentiment-display');
    if (sentimentEl) {
        const phase = getEconomyPhaseInfo();
        const icons = { recovery: '🌱', expansion: '🟢', overheating: '🔥', recession: '🔴' };
        const gdp = (economyCycle.gdpGrowth * 100).toFixed(1);
        sentimentEl.innerHTML = `${icons[economyCycle.phase] || '⚪'} ${phase.name} · wskaźnik ${economyCycle.index}/100 · PKB ${gdp >= 0 ? '+' : ''}${gdp}% kw.`;
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

// ============================================
// ZMIENNE GLOBALNE
// ============================================
let currentConstructionTab = 'main'; // 'main', 'subcontractors'

// ============================================
// FUNKCJE ZARZĄDZANIA ZAKŁADKAMI
// ============================================

/**
 * Przełącza zakładkę w modal sektora budowlanego
 */
function showConstructionTab(tabName) {
    currentConstructionTab = tabName;
    
    const modal = document.getElementById('construction-sector-modal');
    if (!modal) return;
    
    const tabButtons = modal.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabName)) {
            btn.classList.add('active');
        }
    });
    
    const tabContents = modal.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = modal.querySelector(`#construction-${tabName}`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    if (tabName === 'main') {
        renderConstructionCompaniesList();
        renderConstructionProjectsList();
    }
    if (tabName === 'subcontractors') {
        renderConstructionSubcontractorsList();
    }
}

/**
 * Renderuje listę aktywnych przetargów
 */
function renderTendersList() {
    const container = document.getElementById('tenders-list');
    if (!container) return;

    const expandedIds = new Set(
        [...container.querySelectorAll('details[open]')]
            .map(element => element.dataset.tenderId)
    );

    const fragment = document.createDocumentFragment();

    const visibleTenders = activeTenders.filter(
        tender => ['open', 'closed', 'awarded'].includes(tender.status)
    );

    if (visibleTenders.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'construction-empty';
        empty.textContent = 'Brak otwartych lub realizowanych przetargów.';
        fragment.appendChild(empty);
    }

    const statusNames = {
        open: 'Przyjmowanie ofert',
        closed: 'Oczekiwanie na rozstrzygnięcie',
        awarded: 'Kontrakt przyznany'
    };

    for (const tender of visibleTenders) {
        const card = document.createElement('article');
        card.className = 'construction-live-card';

        const title = document.createElement('h4');
        title.textContent = `🏗️ ${tender.buildingType?.name || 'Inwestycja'}`;

        const status = document.createElement('span');
        status.className = 'construction-live-status';
        status.textContent = statusNames[tender.status];

        card.append(title, status);

        card.append(
            createConstructionInfoRow(
                'Zamawiający',
                tender.clientCompany?.name || 'Brak danych'
            ),
            createConstructionInfoRow(
                'Budżet',
                formatConstructionMoney(tender.budget)
            )
        );

        if (tender.status === 'open') {
            card.appendChild(createConstructionInfoRow(
                'Czas na oferty',
                tender.timerVersion === 2
                    ? formatConstructionTime(tender.remainingGameMs)
                    : 'Stary przetarg — wymaga migracji'
            ));
        }

        if (tender.winner) {
            card.append(
                createConstructionInfoRow(
                    'Wykonawca',
                    tender.winner.bidder?.name || 'Brak danych'
                ),
                createConstructionInfoRow(
                    'Wartość kontraktu',
                    formatConstructionMoney(tender.winner.price)
                )
            );
        }

        const bids = [...(tender.bids || [])].sort(
            (a, b) => calculateBidScore(b, tender) -
                calculateBidScore(a, tender)
        );

        const details = document.createElement('details');
        details.dataset.tenderId = tender.id;
        details.open = expandedIds.has(tender.id);

        const summary = document.createElement('summary');
        summary.textContent = `Oferty wykonawców (${bids.length})`;
        details.appendChild(summary);

        if (bids.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = 'Nie złożono jeszcze żadnej oferty.';
            details.appendChild(empty);
        }

        for (const bid of bids) {
            const offer = document.createElement('div');
            offer.className = 'construction-live-offer';

            offer.append(
                createConstructionInfoRow(
                    'Spółka',
                    bid.bidder?.name || 'Brak danych'
                ),
                createConstructionInfoRow(
                    'Cena',
                    formatConstructionMoney(bid.price)
                ),
                createConstructionInfoRow(
                    'Deklarowany czas',
                    `${bid.time} dni budowy`
                ),
                createConstructionInfoRow(
                    'Ocena oferty',
                    `${calculateBidScore(bid, tender).toFixed(1)} / 100`
                )
            );

            details.appendChild(offer);
        }

        card.appendChild(details);
        fragment.appendChild(card);
    }

    container.replaceChildren(fragment);
}

function renderConstructionCompaniesList() {
    const container = document.getElementById('construction-companies-list');
    if (!container) return;

    const builders = stocks.filter(company => isConstructionCompany(company) && !company.isBankrupt);
    if (builders.length === 0) {
        container.innerHTML = '<p class="construction-empty">Brak spółek budowlanych w grze.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    for (const company of builders) {
        const stats = company.constructionStats || {};
        const active = getActiveProjectsForBuilder(company);
        const openBids = getOpenBidsForBuilder(company).length;
        const bonuses = getConstructionTechnologyBonuses(company);

        const card = document.createElement('div');
        card.className = 'construction-company-card';

        const heading = document.createElement('h4');
        heading.textContent = company.name;
        card.appendChild(heading);

        card.append(
            createConstructionInfoRow('Moce wykonawcze', `${active.length} / ${stats.maxProjects || 0} budów (oferty w toku: ${openBids})`),
            createConstructionInfoRow('Doświadczenie', `${stats.experience || 0} (limit rośnie co 10 pkt, maks. 5 budów)`),
            createConstructionInfoRow('Wygrane przetargi / ukończone', `${stats.wonTenders || 0} / ${stats.completedProjects || 0}`),
            createConstructionInfoRow('Gotówka', formatConstructionMoney(company.cash)),
            createConstructionInfoRow('Kredyt obrotowy na budowy', formatConstructionMoney(company.constructionCredit || 0)),
            createConstructionInfoRow('Technologie: tempo / koszt / ryzyko', `+${(bonuses.speedBonus * 100).toFixed(0)}% / −${(bonuses.costReduction * 100).toFixed(0)}% / −${(bonuses.delayReduction * 100).toFixed(0)}%`)
        );

        const list = document.createElement('ul');
        if (active.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Brak aktywnych budów';
            list.appendChild(li);
        }
        for (const project of active) {
            const li = document.createElement('li');
            li.textContent = `${project.tender.buildingType.name} — ${(project.progress * 100).toFixed(0)}%, ${getConstructionProjectStatusLabel(project)}`;
            list.appendChild(li);
        }
        card.appendChild(list);
        fragment.appendChild(card);
    }

    container.replaceChildren(fragment);
}

function renderConstructionSubcontractorsList() {
    const container = document.getElementById('subcontractors-list');
    const summary = document.getElementById('subcontractors-summary');
    if (!container) return;

    const busyCount = specialists.filter(spec => spec.busyProjectId).length;

    if (summary) {
        summary.innerHTML = `
            <div class="construction-stat-card"><span class="construction-stat-label">Specjaliści</span><strong>${specialists.length}</strong></div>
            <div class="construction-stat-card"><span class="construction-stat-label">Zajęci przy budowach</span><strong>${busyCount}</strong></div>`;
    }

    if (specialists.length === 0) {
        container.innerHTML = '<p class="construction-empty">Brak dostępnych specjalistów.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    const intro = document.createElement('p');
    intro.className = 'construction-empty';
    intro.textContent = 'Wykonawcy zatrudniają podwykonawców, gdy budowa grozi opóźnieniem. ' +
        `Wynagrodzenie (${(CONSTRUCTION_RULES.subcontractorFeeRate * 100).toFixed(0)}% pozostałych kosztów) jest kosztem kontraktu; ` +
        'moce podwykonawcy zwalniają się po odbiorze lub anulowaniu budowy.';
    fragment.appendChild(intro);

    const grid = document.createElement('div');
    grid.className = 'subcontractor-grid specialist-grid';

    for (const spec of specialists) {
        const project = spec.busyProjectId ? constructionProjects.find(item => item.id === spec.busyProjectId) : null;
        const card = document.createElement('article');
        card.className = 'subcontractor-card specialist-card';

        const top = document.createElement('div');
        top.className = 'card-topline';
        const name = document.createElement('h4');
        name.textContent = spec.name;
        const badge = document.createElement('span');
        badge.className = `status-badge ${project ? 'busy' : 'available'}`;
        badge.textContent = project ? 'Zajęty' : 'Dostępny';
        top.append(name, badge);
        card.appendChild(top);

        card.append(
            createConstructionInfoRow('Poziom', spec.level),
            createConstructionInfoRow('Specjalność', spec.specialty),
            createConstructionInfoRow('Bonus tempa', `+${(spec.bonus * 100).toFixed(1)}%`),
            createConstructionInfoRow('Kontrakty', spec.contractsCompleted),
            createConstructionInfoRow('Gotówka', formatConstructionMoney(spec.cash)),
            createConstructionInfoRow('Obecna budowa', project ? `${project.tender.buildingType.name} (${project.builder.name})` : '—')
        );

        const button = document.createElement('button');
        const canIpo = spec.contractsCompleted >= 10 && !spec.busyProjectId;
        button.disabled = !canIpo;
        button.textContent = canIpo ? 'Wejdź na giełdę' : (spec.busyProjectId ? 'IPO po zakończeniu budowy' : 'IPO od 10 kontraktów');
        if (canIpo) button.onclick = () => goPublicSpecialist(spec.id);
        card.appendChild(button);

        grid.appendChild(card);
    }

    fragment.appendChild(grid);
    container.replaceChildren(fragment);
}

/** Jednolity opis statusu budowy — używany we wszystkich widokach. */
function getConstructionProjectStatusLabel(project) {
    if (project.settled) return project.status === 'completed' ? 'Odebrana' : 'Anulowana';
    if (project.status === 'paused') {
        if (project.delayReason === 'Brak środków wykonawcy.') return 'Wstrzymana — brak finansowania';
        return `Wstrzymana — ${project.delayReason || 'przerwa'}`;
    }
    return getProjectedRemainingMs(project) > getProjectTimeLeftMs(project) ? 'W toku — zagrożony termin' : 'W toku';
}

function renderConstructionProjectsList() {
    const container = document.getElementById('construction-projects-list');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    const projects = constructionProjects.filter(project => !project.settled);

    if (projects.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'construction-empty';
        empty.textContent = 'Brak aktywnych budów.';
        fragment.appendChild(empty);
    }

    for (const project of projects) {
        const card = document.createElement('article');
        card.className = 'construction-live-card';
        card.dataset.projectId = project.id;

        const title = document.createElement('h4');
        title.textContent = `🏗️ ${project.tender?.buildingType?.name || 'Budowa'}`;

        const status = document.createElement('span');
        status.className = 'construction-live-status';
        if (project.status === 'paused') status.classList.add('is-paused');
        status.textContent = getConstructionProjectStatusLabel(project);

        card.append(title, status);

        const progress = Math.max(0, Math.min(1, Number(project.progress) || 0));
        const remainingWork = getProjectedRemainingMs(project) + Math.max(0, Number(project.pauseRemainingMs) || 0);
        const timeLeft = getProjectTimeLeftMs(project);
        const nextMilestone = CONSTRUCTION_RULES.milestones[project.milestonesPaid];

        card.append(
            createConstructionInfoRow('Zamawiający', project.tender?.clientCompany?.name || 'Brak danych'),
            createConstructionInfoRow('Wykonawca', project.builder?.name || 'Brak danych'),
            createConstructionInfoRow('Postęp', `${(progress * 100).toFixed(1)}%`),
            createConstructionInfoRow('Prognoza do końca', formatConstructionTime(remainingWork)),
            createConstructionInfoRow('Do terminu umownego', timeLeft >= 0 ? formatConstructionTime(timeLeft) : `po terminie o ${formatConstructionTime(-timeLeft)}`),
            createConstructionInfoRow('Opóźnienia (wykonawca / zewnętrzne)', `${formatConstructionTime(project.contractorDelayMs)} / ${formatConstructionTime(project.excusedDelayMs)}`)
        );

        const bar = document.createElement('progress');
        bar.className = 'construction-live-progress';
        bar.max = 1;
        bar.value = progress;
        bar.setAttribute('aria-label', `Postęp budowy: ${(progress * 100).toFixed(1)}%`);
        card.appendChild(bar);

        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Rozliczenia kontraktu';
        details.appendChild(summary);

        details.append(
            createConstructionInfoRow('Wartość umowy', formatConstructionMoney(getContractValue(project))),
            createConstructionInfoRow('Zmiany zamówienia', formatConstructionMoney(project.changeOrderAmount)),
            createConstructionInfoRow('Depozyt zamawiającego', formatConstructionMoney(project.escrowBalance)),
            createConstructionInfoRow('Wypłacono wykonawcy (zaliczka + etapy)', formatConstructionMoney(project.paidToBuilder)),
            createConstructionInfoRow('Następny etap płatności', nextMilestone ? `${Math.round(nextMilestone * 100)}% postępu` : 'Odbiór końcowy'),
            createConstructionInfoRow('Koszty poniesione / planowane', `${formatConstructionMoney(project.costsPaid)} / ${formatConstructionMoney(project.estimatedCost)}`),
            createConstructionInfoRow('Planowany wynik kontraktu', formatConstructionMoney(getContractValue(project) - project.estimatedCost)),
            createConstructionInfoRow('Podwykonawca', project.subcontractor ? `${project.subcontractor.name} (${formatConstructionMoney(project.subcontractor.fee)})` : 'Brak')
        );

        card.appendChild(details);
        fragment.appendChild(card);
    }

    container.replaceChildren(fragment);
}

// ============================================
// GŁÓWNA FUNKCJA OTWIERANIA MODALU
// ============================================

function openConstructionSectorModal() {
    const modal = document.getElementById('construction-sector-modal');

    if (!modal) {
        console.error('Nie znaleziono construction-sector-modal.');
        return;
    }

    currentConstructionTab = 'main';

    if (!document.getElementById('tenders-list')) {
        const mainTab = modal.querySelector('#construction-main');

        if (mainTab) {
            const section = document.createElement('section');
            section.className = 'construction-tenders-section';

            const heading = document.createElement('h3');
            heading.textContent = 'Przetargi i zamówienia';

            const list = document.createElement('div');
            list.id = 'tenders-list';

            section.append(heading, list);
            mainTab.prepend(section);
        } else {
            console.warn(
                'Brak construction-main. Sekcja przetargów nie została dodana.'
            );
        }
    }

    renderConstructionSubcontractorsList();

    modal.hidden = false;
    modal.style.display = 'block';

    showConstructionTab('main');
    updateConstructionSectorUI();
}

function openPawnShopPanel() {
    const modal = document.getElementById('pawnshop-modal');
    if (!modal) return;
    const statusDiv = document.getElementById('pawnshop-status');
    const inventorySection = document.getElementById('pawnshop-inventory-section');
    const listDiv = document.getElementById('pawnshop-loans-list');

    const pawnShop = stocks.find(s => s.assetType === 'PawnShop' && !s.isBankrupt);
    if (!pawnShop) {
        statusDiv.innerHTML = '<p style="color:#dc3545;">Lombard nie jest dostępny.</p>';
        listDiv.innerHTML = '';
        if (inventorySection) inventorySection.innerHTML = '<p style="margin:0;color:#666;">Brak zasobów w lombardzie.</p>';
        modal.style.display = 'block';
        return;
    }

    statusDiv.innerHTML = `<p><strong>${pawnShop.name}</strong> (${pawnShop.symbol})</p>
        <p>Oprocentowanie: <strong>25% rocznie</strong> | Okres spłaty: <strong>12 tygodni</strong></p>
        <p>Gotówka lombardu: ${pawnShop.cash.toLocaleString('pl-PL')} PLN</p>`;

    const pawnLoans = playerCommercialLoans.filter(l => l.isPawnLoan);
    listDiv.innerHTML = '';

    if (inventorySection) {
        const inventoryStocks = pawnShop.holdingPortfolio || {};
        const inventoryKeys = Object.keys(inventoryStocks);
        if (inventoryKeys.length > 0) {
            let invHtml = '<h4 style="margin:0 0 8px; font-size:14px;">Zapas Lombardu</h4>';
            inventoryKeys.forEach(key => {
                const item = inventoryStocks[key];
                const stockData = stocks.find(s => s.symbol === key);
                const name = stockData ? stockData.name : key;
                invHtml += `<p style="margin:2px 0;">• ${item.quantity} × ${name} (${key}) @ ${item.purchasePrice.toFixed(2)} PLN</p>`;
            });
            inventorySection.innerHTML = invHtml;
        } else {
            inventorySection.innerHTML = '<p style="margin:0;color:#666;">Brak zasobów w lombardzie.</p>';
        }
    }
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

function goPublicSpecialist(specId) {
    const spec = specialists.find(s => s.id === specId);
    if (!spec || spec.contractsCompleted < 10 || spec.busyProjectId) return;
    
    // Create a new stock for the specialist
    const newStock = {
        name: spec.name,
        symbol: spec.name.substring(0, 3).toUpperCase() + 'S',
        price: 10, // Starting price
        totalShares: 10000,
        sharesHeld: 0,
        sector: ['Usługi'],
        exchange: 'BRONZE',
        cash: spec.cash,
        // Add other necessary fields
        // Bilans odpowiada faktycznym środkom specjalisty (bez kapitału "z powietrza").
        balanceSheet: { assets: spec.cash, liabilities: 0, shareCapital: spec.cash, retainedEarnings: 0 },
        quarterlyEarnings: 0,
        priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        isStateOwned: false,
        dividendPolicy: 'Growth',
        dividendTimer: getRandomIntInRange(60000, 120000),
        financialHealth: 1,
        volatilityFactor: 1.5
    };
    initializeDescriptionParts(newStock);
    generateCEO(newStock);
    initializeDepartments(newStock);
    assignBankToCompany(newStock);
    initializeReputation(newStock);
    
    stocks.push(newStock);
    specialists = specialists.filter(s => s.id !== specId);
    logEvent(`🏛️ ${spec.name} wchodzi na giełdę jako spółka ${newStock.symbol}.`, 'construction');
    renderConstructionSubcontractorsList();
}

// ============================================
// FUNKCJE POMOCNICZE DLA SEKTORA BUDOWLANEGO
// ============================================

function formatConstructionTime(milliseconds) {
    const value = Number(milliseconds);

    if (!Number.isFinite(value)) return 'Brak danych';

    const seconds = Math.ceil(Math.max(0, value) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    return `${minutes} min ${String(remainder).padStart(2, '0')} s symulacji`;
}

function formatConstructionMoney(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return 'Brak danych';

    return amount.toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' PLN';
}

function createConstructionInfoRow(label, value) {
    const row = document.createElement('p');
    row.className = 'construction-info-row';

    const labelElement = document.createElement('span');
    labelElement.className = 'construction-info-label';
    labelElement.textContent = label;

    const valueElement = document.createElement('span');
    valueElement.className = 'construction-info-value';
    valueElement.textContent = String(value);

    row.append(labelElement, valueElement);

    return row;
}

function updateConstructionSectorUI() {
    const modal = document.getElementById('construction-sector-modal');

    if (
        !modal ||
        modal.hidden ||
        getComputedStyle(modal).display === 'none'
    ) {
        return;
    }

    renderTendersList();
    renderConstructionProjectsList();
    renderConstructionCompaniesList();
    renderConstructionHistoryList();
    renderConstructionResearchList();
}

function getConstructionHistoryRows(companies = stocks) {
    const rows = [];

    for (const company of companies) {
        if (!Array.isArray(company?.constructionHistory)) continue;

        const seenProjects = new Set();

        for (const entry of company.constructionHistory) {
            if (
                !entry.projectId ||
                seenProjects.has(entry.projectId)
            ) {
                continue;
            }

            seenProjects.add(entry.projectId);

            const revenue = Number(entry.revenue);
            const costs = Number(entry.costs);

            if (
                !Number.isFinite(revenue) ||
                revenue < 0 ||
                !Number.isFinite(costs) ||
                costs < 0
            ) {
                continue;
            }

            const cancelled = entry.status === 'cancelled';
            const completedAt = Number(entry.completedAt);

            rows.push({
                projectId: entry.projectId,
                builderName: company.name || company.symbol || 'Spółka',
                builderSymbol: company.symbol || '',
                buildingName: entry.buildingName || 'Inwestycja',
                clientName: entry.clientName || 'Brak danych',
                status: cancelled ? 'cancelled' : 'completed',
                revenue,
                costs,
                profit: revenue - costs,
                margin: revenue > 0
                    ? (revenue - costs) / revenue * 100
                    : null,
                delays: Math.max(0, Number(entry.delays) || 0),
                penalty: Math.max(0, Number(entry.penalty) || 0),
                bonus: Math.max(0, Number(entry.bonus) || 0),
                elapsedGameMs: Number.isFinite(entry.elapsedGameMs)
                    ? entry.elapsedGameMs
                    : null,
                completedAt: Number.isFinite(completedAt) &&
                    completedAt > 0
                    ? completedAt
                    : null,
                reason: entry.reason || ''
            });
        }
    }

    rows.sort((a, b) => {
        const dateDifference =
            (b.completedAt || 0) - (a.completedAt || 0);

        if (dateDifference !== 0) return dateDifference;

        return String(a.projectId).localeCompare(String(b.projectId));
    });

    return rows;
}

function renderConstructionHistoryList(companies = stocks) {
    const modal = document.getElementById('construction-sector-modal');
    const mainTab = modal?.querySelector('#construction-main');

    if (!mainTab) return;

    let container = mainTab.querySelector('#construction-history-list');

    if (!container) {
        const section = document.createElement('section');
        section.className = 'construction-history-section';

        const heading = document.createElement('h3');
        heading.textContent = 'Historia kontraktów';

        container = document.createElement('div');
        container.id = 'construction-history-list';

        section.append(heading, container);
        mainTab.appendChild(section);
    }

    const expandedIds = new Set(
        [...container.querySelectorAll('details[open]')]
            .map(element => element.dataset.historyKey)
    );

    const rows = getConstructionHistoryRows(companies);
    const fragment = document.createDocumentFragment();

    if (rows.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'construction-empty';
        empty.textContent = 'Brak zakończonych lub anulowanych kontraktów.';

        fragment.appendChild(empty);
        container.replaceChildren(fragment);
        return;
    }

    const totals = rows.reduce((sum, row) => {
        sum.revenue += row.revenue;
        sum.costs += row.costs;
        sum.profit += row.profit;

        if (row.status === 'completed') {
            sum.completed++;
        } else {
            sum.cancelled++;
        }

        return sum;
    }, {
        revenue: 0,
        costs: 0,
        profit: 0,
        completed: 0,
        cancelled: 0
    });

    const summaryCard = document.createElement('article');
    summaryCard.className = 'construction-live-card';

    const summaryTitle = document.createElement('h4');
    summaryTitle.textContent = 'Wyniki kontraktów w dostępnej historii';

    summaryCard.append(
        summaryTitle,
        createConstructionInfoRow('Ukończone', totals.completed),
        createConstructionInfoRow('Anulowane', totals.cancelled),
        createConstructionInfoRow(
            'Przychody',
            formatConstructionMoney(totals.revenue)
        ),
        createConstructionInfoRow(
            'Koszty',
            formatConstructionMoney(totals.costs)
        ),
        createConstructionInfoRow(
            'Wynik',
            formatConstructionMoney(totals.profit)
        )
    );

    fragment.appendChild(summaryCard);

    for (const row of rows.slice(0, 30)) {
        const card = document.createElement('article');
        card.className = 'construction-live-card';
        card.dataset.historyProjectId = row.projectId;

        const heading = document.createElement('h4');
        heading.textContent = row.buildingName;

        const status = document.createElement('span');
        status.className = 'construction-live-status';
        status.textContent = row.status === 'cancelled'
            ? 'Kontrakt anulowany'
            : 'Kontrakt ukończony';

        if (row.status === 'cancelled') {
            status.classList.add('is-paused');
        }

        card.append(
            heading,
            status,
            createConstructionInfoRow('Wykonawca', row.builderName),
            createConstructionInfoRow(
                'Wynik kontraktu',
                formatConstructionMoney(row.profit)
            )
        );

        const key = JSON.stringify([
            row.builderSymbol || row.builderName,
            row.projectId
        ]);

        const details = document.createElement('details');
        details.dataset.historyKey = key;
        details.open = expandedIds.has(key);

        const detailsTitle = document.createElement('summary');
        detailsTitle.textContent = 'Rozliczenie i szczegóły';

        details.append(
            detailsTitle,
            createConstructionInfoRow('Zamawiający', row.clientName),
            createConstructionInfoRow(
                'Przychód',
                formatConstructionMoney(row.revenue)
            ),
            createConstructionInfoRow(
                'Koszty realizacji',
                formatConstructionMoney(row.costs)
            ),
            createConstructionInfoRow(
                'Marża kontraktu',
                row.margin === null
                    ? 'Nie dotyczy'
                    : `${row.margin.toFixed(1)}%`
            ),
            createConstructionInfoRow(
                'Czas realizacji',
                row.elapsedGameMs === null
                    ? 'Brak danych'
                    : formatConstructionTime(row.elapsedGameMs)
            ),
            createConstructionInfoRow('Opóźnienia', row.delays),
            createConstructionInfoRow('Kara umowna / premia', `${formatConstructionMoney(row.penalty)} / ${formatConstructionMoney(row.bonus)}`),
            createConstructionInfoRow(
                'Data odbioru',
                row.completedAt === null
                    ? 'Brak danych'
                    : new Date(row.completedAt).toLocaleString('pl-PL')
            )
        );

        if (row.reason) {
            details.appendChild(createConstructionInfoRow(
                'Powód anulowania',
                row.reason
            ));
        }

        card.appendChild(details);
        fragment.appendChild(card);
    }

    if (rows.length > 30) {
        const note = document.createElement('p');
        note.className = 'construction-empty';
        note.textContent =
            `Wyświetlono 30 z ${rows.length} kontraktów. ` +
            'Pełna historia pozostaje w danych spółek.';

        fragment.appendChild(note);
    }

    container.replaceChildren(fragment);
}

function renderConstructionResearchList(companies = stocks) {
    const modal = document.getElementById('construction-sector-modal');
    const mainTab = modal?.querySelector('#construction-main');

    if (!mainTab) return;

    let container = mainTab.querySelector(
        '#construction-research-list'
    );

    if (!container) {
        const section = document.createElement('section');
        section.className = 'construction-research-section';

        const heading = document.createElement('h3');
        heading.textContent = 'Badania spółek budowlanych';

        container = document.createElement('div');
        container.id = 'construction-research-list';

        section.append(heading, container);
        mainTab.appendChild(section);
    }

    const expandedCompanies = new Set(
        [...container.querySelectorAll('details[open]')]
            .map(element => element.dataset.researchCompany)
    );

    const builders = companies.filter(
        company =>
            !company.isBankrupt &&
            Array.isArray(company.sector) &&
            company.sector.includes('Budowlany')
    );

    const fragment = document.createDocumentFragment();

    if (builders.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'construction-empty';
        empty.textContent = 'Brak aktywnych spółek budowlanych.';
        fragment.appendChild(empty);
    }

    for (const company of builders) {
        const card = document.createElement('article');
        card.className = 'construction-live-card';

        const heading = document.createElement('h4');
        heading.textContent = `🔬 ${company.name}`;

        const research = company.research;
        const currentTech = technologies[research?.currentTech];
        const bonuses = getConstructionTechnologyBonuses(company);

        let researchStatus = 'Nie prowadzi badań';

        if (research?.currentTech) {
            researchStatus = research.isResearching
                ? 'Badanie w toku'
                : 'Badanie wstrzymane';
        } else if (research?.choiceAvailableUntil) {
            researchStatus = 'Oczekiwanie na wybór badania';
        }

        card.append(
            heading,
            createConstructionInfoRow('Status R&D', researchStatus),
            createConstructionInfoRow(
                'Specjalizacja',
                research?.specialization || 'Nie wybrano'
            ),
            createConstructionInfoRow(
                'Aktualne badanie',
                currentTech?.name ||
                (research?.currentTech ? 'Nieznana technologia' : 'Brak')
            ),
            createConstructionInfoRow(
                'Bonus szybkości nowych budów',
                `${(bonuses.speedBonus * 100).toFixed(1)}%`
            ),
            createConstructionInfoRow(
                'Obniżka kosztów nowych budów',
                `${(bonuses.costReduction * 100).toFixed(1)}%`
            ),
            createConstructionInfoRow(
                'Względna redukcja ryzyka opóźnień',
                `${(bonuses.delayReduction * 100).toFixed(1)}%`
            )
        );

        const requiredPoints = Number(currentTech?.cost);
        const currentPoints = Number(research?.progress);

        if (
            Number.isFinite(requiredPoints) &&
            requiredPoints > 0 &&
            Number.isFinite(currentPoints)
        ) {
            const progress = Math.max(
                0,
                Math.min(1, currentPoints / requiredPoints)
            );

            card.appendChild(createConstructionInfoRow(
                'Postęp badania',
                `${(progress * 100).toFixed(1)}%`
            ));

            const bar = document.createElement('progress');
            bar.className = 'construction-live-progress';
            bar.max = 1;
            bar.value = progress;
            bar.setAttribute('aria-label', 'Postęp badania');

            card.appendChild(bar);
        }

        const options = getConstructionResearchOptions(company);

        const details = document.createElement('details');
        const companyKey = company.symbol || company.id || company.name;

        details.dataset.researchCompany = companyKey;
        details.open = expandedCompanies.has(companyKey);

        const summary = document.createElement('summary');
        summary.textContent =
            `Technologie sektorowe (${options.length})`;

        details.appendChild(summary);

        for (const option of options) {
            const item = document.createElement('div');
            item.className = 'construction-live-offer';

            const title = document.createElement('h4');
            title.textContent = `${option.icon} ${option.name}`;

            const description = document.createElement('p');
            description.textContent = option.description;

            item.append(
                title,
                description,
                createConstructionInfoRow('Status', option.status),
                createConstructionInfoRow(
                    'Koszt rozpoczęcia',
                    formatConstructionMoney(option.initialCashCost)
                ),
                createConstructionInfoRow(
                    'Wymagany postęp',
                    Number.isFinite(option.researchPoints)
                        ? `${option.researchPoints} pkt`
                        : 'Brak danych'
                ),
                createConstructionInfoRow(
                    'Kierunek badań',
                    option.type
                )
            );

            details.appendChild(item);
        }

        card.appendChild(details);
        fragment.appendChild(card);
    }

    container.replaceChildren(fragment);
}

function updateResearchChoiceTimerUI() {
    const modal = document.getElementById('research-modal');
    const timer = document.getElementById('rd-choice-timer');

    if (
        !modal ||
        !timer ||
        modal.hidden ||
        getComputedStyle(modal).display === 'none'
    ) {
        return;
    }

    const company = stocks.find(
        stock => stock.symbol === modal.dataset.currentSymbol
    );

    const research = company?.research;

    if (
        !research ||
        research.currentTech ||
        !research.choiceAvailableUntil
    ) {
        timer.textContent = '—';
        return;
    }

    const remaining = Number.isFinite(research.choiceRemainingGameMs)
        ? Math.max(0, research.choiceRemainingGameMs)
        : 15000;

    timer.textContent =
        `${Math.ceil(remaining / 1000)} s symulacji` +
        (isGamePaused ? ' — pauza' : '');
}

// =================================================================================
// FUNDUSZ GRACZA (etap B): panel funduszu, wykres okresów, rywale, klienci,
// konto prywatne, CV ze szkoleniami i scenka startowa
// =================================================================================

function formatZl(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return number.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' zł';
}

function formatPct(value, digits = 2) {
    const number = Number(value) * 100;
    if (!Number.isFinite(number)) return '—';
    return `${number >= 0 ? '+' : ''}${number.toFixed(digits)}%`;
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// =================================================================================
// PANEL FUNDUSZU
// =================================================================================

function displayFundPanel() {
    if (!playerFund) return;

    const title = document.getElementById('fund-panel-title');
    if (title) title.textContent = `💼 ${playerProfile?.fundName || 'Mój fundusz'}`;

    document.getElementById('account-btn-fund')?.classList.toggle('active', activeTradingAccount === 'fund');
    document.getElementById('account-btn-private')?.classList.toggle('active', activeTradingAccount === 'private');

    renderFundSummary();
    renderFundPeriodsChart();
    renderFundRivalsTable();
    renderFundClients();
    renderPrivatePanel();
    renderCareerPanel();
}

function renderFundSummary() {
    const container = document.getElementById('fund-summary');
    if (!container) return;

    const current = playerFund.current;
    const nav = getFundNav();
    const periodProgress = Math.min(1, current.elapsedMs / FUND_PERIOD_MS);
    const periodReturn = getPeriodReturn(current.startNav, nav);
    const benchmarkReturn = getPeriodReturn(current.startBenchmark, getBenchmarkValue());
    const trust = Math.round(playerFund.trust);
    const trustClass = trust >= 60 ? 'good' : trust >= 40 ? 'mid' : 'bad';

    container.innerHTML = `
        <div class="fund-kpis">
            <div><span>NAV / JU</span><strong>${nav.toFixed(4)} zł</strong></div>
            <div><span>Liczba JU</span><strong>${playerFund.units.toFixed(1)}</strong></div>
            <div><span>Klienci</span><strong>${playerFund.clients.length}</strong></div>
            <div><span>Stanowisko</span><strong>${escapeHtml(getPlayerPosition().name)}</strong></div>
        </div>
        <div class="fund-trust">
            <span>Zaufanie klientów: <strong>${trust}/100</strong></span>
            <div class="fund-trust-bar"><div class="fund-trust-fill ${trustClass}" style="width:${trust}%"></div></div>
        </div>
        <div class="fund-period-line">
            Okres ${current.number}: ${formatPct(periodReturn)} vs GIG ${formatPct(benchmarkReturn)}
            · emisje ${current.emissions}/${MAX_EMISSIONS_PER_PERIOD}
            · obsunięcie ${(current.maxDrawdown * 100).toFixed(1)}%
        </div>
        <div class="fund-period-progress" title="Postęp okresu oceny (15 min gry)">
            <div style="width:${(periodProgress * 100).toFixed(1)}%"></div>
        </div>`;
}

/** Wykres słupkowy: 4 ostatnie okresy + bieżący — fundusz vs GIG vs średnia funduszy zewnętrznych. */
function renderFundPeriodsChart() {
    const container = document.getElementById('fund-periods-chart');
    if (!container) return;

    const current = playerFund.current;
    const rivalsNow = getExternalFunds().filter(fund => current.startRivals[fund.symbol] > 0)
        .map(fund => getPeriodReturn(current.startRivals[fund.symbol], getExternalFundValue(fund)));

    const rows = playerFund.periods.slice(-FUND_PERIODS_SHOWN).map(period => ({
        label: `Okres ${period.number}`,
        fund: period.fundReturn,
        benchmark: period.benchmarkReturn,
        rivals: period.rivals.length ? period.rivals.reduce((sum, rival) => sum + rival.return, 0) / period.rivals.length : 0
    }));
    rows.push({
        label: `Teraz`,
        fund: getPeriodReturn(current.startNav, getFundNav()),
        benchmark: getPeriodReturn(current.startBenchmark, getBenchmarkValue()),
        rivals: rivalsNow.length ? rivalsNow.reduce((sum, value) => sum + value, 0) / rivalsNow.length : 0,
        partial: true
    });

    const series = [
        { key: 'fund', label: 'Twój fundusz', color: '#22C55E' },
        { key: 'benchmark', label: 'GIG', color: '#38BDF8' },
        { key: 'rivals', label: 'Fundusze zewnętrzne (śr.)', color: '#F59E0B' }
    ];

    const width = 320;
    const height = 150;
    const pad = { top: 10, bottom: 22, left: 34, right: 6 };
    const values = rows.flatMap(row => series.map(item => row[item.key]));
    const maxAbs = Math.max(0.01, ...values.map(Math.abs));
    const plotH = height - pad.top - pad.bottom;
    const zeroY = pad.top + plotH / 2;
    const groupW = (width - pad.left - pad.right) / rows.length;
    const barW = Math.max(4, groupW / (series.length + 1));

    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Stopy zwrotu w ostatnich okresach">`;
    svg += `<line x1="${pad.left}" x2="${width - pad.right}" y1="${zeroY}" y2="${zeroY}" stroke="currentColor" stroke-opacity="0.35"/>`;
    svg += `<text x="${pad.left - 4}" y="${pad.top + 8}" font-size="8" text-anchor="end" fill="currentColor">${formatPct(maxAbs, 1)}</text>`;
    svg += `<text x="${pad.left - 4}" y="${height - pad.bottom}" font-size="8" text-anchor="end" fill="currentColor">${formatPct(-maxAbs, 1)}</text>`;

    rows.forEach((row, index) => {
        const groupX = pad.left + index * groupW + barW / 2;
        series.forEach((item, seriesIndex) => {
            const value = row[item.key];
            const h = Math.abs(value) / maxAbs * (plotH / 2);
            const x = groupX + seriesIndex * barW;
            const y = value >= 0 ? zeroY - h : zeroY;
            svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 1).toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" fill="${item.color}" fill-opacity="${row.partial ? 0.55 : 1}"><title>${row.label} — ${item.label}: ${formatPct(value)}</title></rect>`;
        });
        svg += `<text x="${(pad.left + index * groupW + groupW / 2).toFixed(1)}" y="${height - 8}" font-size="8" text-anchor="middle" fill="currentColor">${row.label}</text>`;
    });
    svg += '</svg>';

    const legend = series.map(item => `<span><i style="background:${item.color}"></i>${item.label}</span>`).join('');
    container.innerHTML = svg + `<div class="fund-legend">${legend}</div>`;
}

function renderFundRivalsTable() {
    const container = document.getElementById('fund-rivals-table');
    if (!container) return;

    const last = playerFund.periods[playerFund.periods.length - 1];
    if (!last) {
        container.innerHTML = '<p class="fund-muted">Porównanie z rywalami pojawi się po pierwszym okresie (15 min gry).</p>';
        return;
    }

    const rows = [
        { name: `💼 ${playerProfile?.fundName || 'Twój fundusz'}`, ret: last.fundReturn, extra: `zmienność ${(last.volatility * 100).toFixed(2)}%, obsunięcie ${(last.maxDrawdown * 100).toFixed(1)}%`, mine: true },
        { name: '📈 GIG (benchmark)', ret: last.benchmarkReturn, extra: '' },
        ...last.rivals.map(rival => ({ name: rival.name, ret: rival.return, extra: '' }))
    ].sort((a, b) => b.ret - a.ret);

    container.innerHTML = `
        <table class="asset-mini-table fund-rivals">
            <caption>Okres ${last.number}: miejsce ${last.rank}/${last.rankOf}, premia ${formatZl(last.bonus)}</caption>
            <thead><tr><th>Fundusz</th><th>Zwrot</th></tr></thead>
            <tbody>${rows.map(row => `
                <tr class="${row.mine ? 'mine' : ''}" title="${escapeHtml(row.extra)}">
                    <td>${escapeHtml(row.name)}</td>
                    <td class="${row.ret >= 0 ? 'profit' : 'loss'}">${formatPct(row.ret)}</td>
                </tr>`).join('')}</tbody>
        </table>`;
}

function renderFundClients() {
    const container = document.getElementById('fund-clients-list');
    if (!container) return;
    const nav = getFundNav();

    const clients = [...playerFund.clients].sort((a, b) => b.units - a.units);
    container.innerHTML = `
        <table class="asset-mini-table">
            <thead><tr><th>Klient</th><th>Wartość</th><th>Zadowolenie</th></tr></thead>
            <tbody>${clients.map(client => {
                const def = CLIENT_TYPES[client.type] || CLIENT_TYPES.saver;
                const sat = Math.round(client.satisfaction * 100);
                return `<tr>
                    <td title="${def.label}">${def.icon} ${escapeHtml(client.name)}</td>
                    <td>${formatZl(client.units * nav, 0)}</td>
                    <td class="${sat >= 55 ? 'profit' : sat < 35 ? 'loss' : ''}">${sat}%</td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
}

function renderPrivatePanel() {
    const container = document.getElementById('fund-private-panel');
    if (!container) return;
    const nav = getFundNav();

    const holdings = Object.entries(playerWallet.portfolio).map(([symbol, holding]) => {
        const stock = stocks.find(s => s.symbol === symbol);
        const value = (stock?.price || 0) * holding.shares;
        const pl = value - holding.avgPrice * holding.shares;
        return `<li>${symbol}: ${holding.shares} szt. · ${formatZl(value)} <span class="${pl >= 0 ? 'profit' : 'loss'}">(${pl >= 0 ? '+' : ''}${pl.toFixed(2)})</span></li>`;
    }).join('') || '<li class="fund-muted">Brak prywatnych akcji.</li>';

    container.innerHTML = `
        <p>Moje pieniądze: <strong>${formatZl(playerWallet.cash)}</strong>
           · JU własnego funduszu: <strong>${playerWallet.fundUnits.toFixed(2)}</strong> (${formatZl(playerWallet.fundUnits * nav)})</p>
        <ul class="fund-private-list">${holdings}</ul>
        <div class="fund-emission">
            <input type="number" id="private-ju-amount" min="1" value="50" aria-label="Kwota lub liczba JU">
            <button class="btn-secondary" onclick="buyOwnFundUnits(document.getElementById('private-ju-amount').value)">Kup JU za zł</button>
            <button class="btn-secondary" onclick="sellOwnFundUnits(document.getElementById('private-ju-amount').value)">Umórz JU</button>
        </div>
        <p class="fund-muted">Prywatny handel akcjami: przełącz konto na „Prywatne” i kupuj w tabeli rynku.
           Kupowanie akcji, które fundusz kupił w tym tygodniu, grozi kontrolą compliance.</p>`;
}

function handleFundEmission() {
    const input = document.getElementById('fund-emission-units');
    const units = Math.floor(Number(input?.value) || 0);
    if (!(units > 0)) return;
    const result = issueFundUnits(units);
    showToast(result.issued > 0 ? `Emisja: sprzedano ${result.issued.toFixed(1)} JU (${formatZl(result.raised)})` : 'Emisja: brak chętnych', result.issued > 0 ? 'success' : 'warning');
    refreshFundViews();
}

// =================================================================================
// CV I SZKOLENIA (zastępuje drzewko umiejętności)
// =================================================================================

function renderSkillsPanel() {
    renderCvPanel();
}

function renderCvPanel() {
    const list = document.getElementById('skills-list');
    const money = document.getElementById('skills-modal-xp');
    if (!list) return;
    if (money) money.textContent = playerWallet.cash.toFixed(2);

    const trainings = getAvailableTrainings();
    const completed = trainings.filter(id => getSkillLevel(id) > 0);
    const periods = playerFund?.periods || [];
    const bestExcess = periods.length ? Math.max(...periods.map(p => p.fundReturn - p.benchmarkReturn)) : null;

    const medals = completed.map(id => {
        const medal = getTrainingMedal(getSkillLevel(id));
        return `<span class="cv-medal cv-medal-${medal.id}" title="${escapeHtml(skills[id].name)} — poziom ${getSkillLevel(id)}">${medal.icon} ${escapeHtml(skills[id].name)}</span>`;
    }).join('') || '<span class="fund-muted">Brak ukończonych szkoleń.</span>';

    const history = (playerProfile?.cv || []).slice(-8).reverse()
        .map(entry => `<li class="cv-entry-${entry.type}">${escapeHtml(entry.text)}</li>`).join('');

    const cards = trainings.map(id => {
        const skill = skills[id];
        const level = getSkillLevel(id);
        const next = getNextSkillLevelInfo(id);
        const medal = getTrainingMedal(level);
        const cost = getTrainingCost(id);
        const reqMet = !next?.requires || getSkillLevel(next.requires.skillId) >= next.requires.level;
        const canBuy = next && reqMet && playerWallet.cash >= cost;

        return `<article class="cv-training">
            <h4>${escapeHtml(skill.name)} ${medal ? `<span class="cv-medal cv-medal-${medal.id}">${medal.icon}</span>` : ''}</h4>
            <p class="fund-muted">Poziom ${level}/${skill.levels.length}</p>
            ${next ? `<p>${escapeHtml(next.description || '')}</p>` : '<p><strong>Ukończone w pełni.</strong></p>'}
            ${next ? `<button ${canBuy ? '' : 'disabled'} onclick="buyTraining('${id}')">${reqMet ? `Szkolenie: ${cost} zł` : 'Wymaga wcześniejszego szkolenia'}</button>` : ''}
        </article>`;
    }).join('');

    list.innerHTML = `
        <section class="cv-card">
            <div class="cv-avatar" aria-hidden="true">${escapeHtml((playerProfile?.name || '?').slice(0, 1).toUpperCase())}</div>
            <div>
                <h3>${escapeHtml(playerProfile?.name || 'Gracz')}</h3>
                <p>${escapeHtml(getPlayerPosition().name)} · ${escapeHtml(playerProfile?.corporation || '')}</p>
                <p class="fund-muted">Fundusz: ${escapeHtml(playerProfile?.fundName || '')} · okresów: ${periods.length}
                   ${bestExcess !== null ? `· najlepszy wynik vs GIG: ${formatPct(bestExcess)}` : ''}</p>
            </div>
        </section>
        <h4>Odznaki szkoleń</h4>
        <div class="cv-medals">${medals}</div>
        <h4>Historia zawodowa</h4>
        <ul class="cv-history">${history}</ul>
        <h4>Dostępne szkolenia</h4>
        <div class="cv-trainings">${cards}</div>`;
}

function displayXP() {
    const element = document.getElementById('player-xp');
    if (element) element.textContent = formatZl(playerWallet.cash);
}

// =================================================================================
// SCENKA STARTOWA: SMS OD BABCI
// =================================================================================

const INTRO_SMS = [
    'Cześć Wnusiu! 😊',
    'Słyszałam, że dostałeś pracę w tej wielkiej firmie od pieniędzy. Jestem z Ciebie taka dumna! ❤️',
    'Wysyłam Ci 100 zł kieszonkowego na dobry start. Kup sobie coś mądrego, może jakąś książkę albo kurs.',
    'Tylko nie przepuść wszystkiego od razu! Całuję, Babcia 👵'
];

function showIntroScene() {
    const overlay = document.getElementById('intro-overlay');
    const thread = document.getElementById('intro-sms-thread');
    const form = document.getElementById('intro-form');
    if (!overlay || !thread || !form) return;

    overlay.hidden = false;
    thread.innerHTML = '';
    form.hidden = true;

    let index = 0;
    const typeNext = () => {
        if (index >= INTRO_SMS.length) {
            const transfer = document.createElement('div');
            transfer.className = 'intro-transfer';
            transfer.textContent = `💸 Przelew przychodzący: +${GRANDMA_POCKET_MONEY},00 zł od: Babcia`;
            thread.appendChild(transfer);
            renderIntroCountries();
            form.hidden = false;
            return;
        }
        const bubble = document.createElement('div');
        bubble.className = 'intro-sms typing';
        bubble.textContent = '…';
        thread.appendChild(bubble);
        setTimeout(() => {
            bubble.classList.remove('typing');
            bubble.textContent = INTRO_SMS[index++];
            setTimeout(typeNext, 450);
        }, 700);
    };
    typeNext();
}

function renderIntroCountries() {
    const container = document.getElementById('intro-countries');
    if (!container) return;
    container.innerHTML = START_COUNTRIES.map(country => `
        <button type="button" class="intro-country ${country.available ? 'selected' : 'locked'}" ${country.available ? '' : 'disabled'}
            title="${country.available ? 'Dostępny' : `Przepustka: ${country.passCost.toLocaleString('pl-PL')} zł (wkrótce)`}">
            ${country.flag} ${country.name}${country.available ? '' : ' 🔒'}
        </button>`).join('');
}

function completeIntroScene(event) {
    if (event) event.preventDefault();
    const value = id => (document.getElementById(id)?.value || '').trim();

    playerProfile.name = value('intro-name') || playerProfile.name;
    playerProfile.corporation = value('intro-corporation') || playerProfile.corporation;
    playerProfile.fundName = value('intro-fund') || playerProfile.fundName;
    playerProfile.country = 'PL';
    playerProfile.cv = [{ type: 'start', text: `Zatrudnienie w ${playerProfile.corporation} jako Młodszy zarządca funduszu „${playerProfile.fundName}”.` }];

    document.getElementById('intro-overlay').hidden = true;
    logEvent(`💼 Witaj, ${playerProfile.name}! Zarządzasz funduszem „${playerProfile.fundName}” w ${playerProfile.corporation}. Wznów grę, aby zacząć.`, 'review');
    refreshFundViews();
}

// =================================================================================
// TRYB DEBUG (ustawienia): prędkości ×10/×50, dodawanie pieniędzy, wymuszenie okresu i oceny
// =================================================================================

const DEBUG_MODE_KEY = 'gra_inwestycyjna_debug_mode';

function isDebugMode() {
    try { return localStorage.getItem(DEBUG_MODE_KEY) === '1'; } catch (e) { return false; }
}

function applyDebugModeUi() {
    const enabled = isDebugMode();
    document.querySelectorAll('.debug-only').forEach(element => { element.hidden = !enabled; });
    const tools = document.getElementById('debug-tools');
    if (tools) tools.hidden = !enabled;
    const button = document.getElementById('debug-toggle-btn');
    if (button) button.textContent = `🛠️ Tryb debug: ${enabled ? 'włączony' : 'wyłączony'}`;
    if (!enabled && currentSpeedMultiplier > 5) setGameSpeed(5);
}

function toggleDebugMode() {
    try { localStorage.setItem(DEBUG_MODE_KEY, isDebugMode() ? '0' : '1'); } catch (e) { /* brak localStorage */ }
    applyDebugModeUi();
}

function debugAddWallet(amount) {
    playerWallet.cash += amount;
    logEvent(`🛠️ [DEBUG] +${amount} zł do portfela prywatnego.`, 'review');
    refreshFundViews();
}

/** Dodaje gotówkę funduszowi bez nowych JU (NAV rośnie). */
function debugAddFund(amount) {
    playerCash += amount;
    logEvent(`🛠️ [DEBUG] +${amount} zł do gotówki funduszu.`, 'review');
    refreshFundViews();
}

function debugEndPeriod() {
    if (playerFund) closeFundPeriod();
    refreshFundViews();
}

function debugBoardReview() {
    if (typeof runBoardEvaluation === 'function') runBoardEvaluation();
    refreshFundViews();
}

document.addEventListener('DOMContentLoaded', applyDebugModeUi);

// =================================================================================
// KARIERA I KORPORACJA (etap C)
// =================================================================================

let corporationTab = 'board';

function renderCareerPanel() {
    const container = document.getElementById('fund-career-panel');
    if (!container || !corporation) return;

    const periodsDone = playerFund.periods.length;
    const inCycle = periodsDone % BOARD_REVIEW_EVERY_PERIODS;
    const reviewProgress = (inCycle + playerFund.current.elapsedMs / FUND_PERIOD_MS) / BOARD_REVIEW_EVERY_PERIODS;
    const takeovers = getTakeoverProgress();
    const score = corporation.lastPlayerScore;

    container.innerHTML = `
        <div class="career-panel">
            <div class="career-row"><span>Stanowisko</span><strong>${escapeHtml(getPlayerPosition().name)}</strong></div>
            <div class="career-row"><span>Ocena zarządu za</span><span>${BOARD_REVIEW_EVERY_PERIODS - inCycle} okr.${score !== null ? ` (ostatnio ${Math.round(score)}/100)` : ''}</span></div>
            <div class="career-progress" title="Do następnej oceny zarządu"><span style="width:${Math.min(100, reviewProgress * 100).toFixed(0)}%"></span></div>
            ${corporation.playerWeakReviews > 0 ? `<div class="loss">⚠️ Słabe oceny z rzędu: ${corporation.playerWeakReviews}/2</div>` : ''}
            <div class="career-row"><span>Budżet korporacji</span><span>${formatZl(corporation.budget, 0)}</span></div>
            <div class="career-row"><span>Cel: przejęcia</span><span>${takeovers.done}/${takeovers.required}</span></div>
            ${corporation.victory ? `<div class="profit">👑 Zwycięstwo: ${corporation.victory.type === 'ceo' ? 'CEO' : 'dominacja'}</div>` : ''}
            <button class="btn-secondary" onclick="openCorporationModal()">🏢 Korporacja</button>
        </div>`;
}

function openCorporationModal(tab = corporationTab) {
    if (!corporation) return;
    document.getElementById('corporation-overlay').hidden = false;
    setCorporationTab(tab);
}

function closeCorporationModal() {
    document.getElementById('corporation-overlay').hidden = true;
}

function setCorporationTab(tab) {
    corporationTab = tab;
    document.querySelectorAll('.corp-tabs button').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
    const title = document.getElementById('corporation-title');
    if (title) title.textContent = `🏢 ${corporation.name}`;
    renderCorporationBody();
}

/** Akcja z okna korporacji: wykonaj i odśwież widoki. */
function corporationAction(fn, ...args) {
    fn(...args);
    refreshFundViews();
    renderCorporationBody();
}

function renderCorporationBody() {
    const body = document.getElementById('corporation-body');
    if (!body || !corporation) return;
    const renderers = { board: renderCorporationBoard, analysts: renderCorporationAnalysts, cooperation: renderCorporationCooperation, takeovers: renderCorporationTakeovers };
    body.innerHTML = (renderers[corporationTab] || renderCorporationBoard)();
}

function renderCorporationBoard() {
    const lastReview = corporation.reviews[corporation.reviews.length - 1];
    const people = [
        { name: playerProfile.name, positionId: playerProfile.positionId, mine: true, score: lastReview?.results.find(r => r.isPlayer)?.score },
        ...corporation.managers.map(manager => ({
            name: manager.name, positionId: manager.positionId, manager,
            personality: MANAGER_PERSONALITIES[manager.personality].label,
            score: lastReview?.results.find(r => !r.isPlayer && r.name === manager.name)?.score
        }))
    ].sort((a, b) => getPositionIndex(b.positionId) - getPositionIndex(a.positionId));

    const supervise = canSuperviseFunds();
    const positionName = id => CAREER_POSITIONS[getPositionIndex(id)].name;

    return `
        <p class="fund-muted">Ocena zarządu co ${BOARD_REVIEW_EVERY_PERIODS} okresy: nadwyżka nad GIG, stabilność, zaufanie klientów, miejsce w rankingu, compliance.
        Awans od ${PROMOTION_SCORE} pkt (przy braku miejsca — zamiana z najsłabszym na wyższym stanowisku), 2 oceny poniżej ${WEAK_SCORE} z rzędu = degradacja.
        Limity: CEO 1, zarząd 3, kierownicy projektu 2. Twoja reputacja w zarządzie: ${corporation.boardReputation.toFixed(0)}/100.</p>
        <table class="asset-mini-table">
            <thead><tr><th>Osoba</th><th>Stanowisko</th><th>Styl</th><th>Ostatnia ocena</th><th></th></tr></thead>
            <tbody>${people.map(person => {
                const supervised = person.manager && corporation.supervisedManagerId === person.manager.id;
                const canTake = supervise && person.manager && getPositionIndex(person.positionId) < getPositionIndex(playerProfile.positionId);
                const action = supervised
                    ? `<button onclick="corporationAction(consolidateSupervisedFund)">🔗 Konsoliduj (głosowanie)</button>`
                    : canTake ? `<button onclick="corporationAction(superviseManagerFund, '${person.manager.id}')">👔 Nadzoruj</button>` : '';
                return `<tr class="${person.mine ? 'mine' : ''}">
                    <td>${escapeHtml(person.name)}${person.mine ? ' (Ty)' : ''}</td>
                    <td>${escapeHtml(positionName(person.positionId))}</td>
                    <td>${escapeHtml(person.personality || '—')}</td>
                    <td>${person.score ?? '—'}</td>
                    <td>${action}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>
        ${supervise ? '' : '<p class="fund-muted">Nadzór nad funduszem innego zarządcy i konsolidacja — od stanowiska Kierownik projektu.</p>'}
        <h4>Historia ocen</h4>
        <ul>${corporation.reviews.slice().reverse().map(review => {
            const me = review.results.find(r => r.isPlayer);
            return `<li>Po okresie ${review.periodNumber}: ${me.score}/100, ${escapeHtml(positionName(me.from))} → ${escapeHtml(positionName(me.to))}</li>`;
        }).join('') || '<li class="fund-muted">Jeszcze nie było oceny.</li>'}</ul>`;
}

function renderCorporationAnalysts() {
    const allowed = canHireAnalysts();
    return `
        <p class="fund-muted">Analitycy (od stanowiska Starszy zarządca) dodają wgląd w oknie akcjonariatu spółki. Zatrudnienie i tygodniowa pensja z portfela prywatnego (${formatZl(playerWallet.cash)}). Gwiazdki = dokładność.</p>
        <div class="corp-cards">${Object.entries(ANALYST_TYPES).map(([type, def]) => {
            const hired = getAnalyst(type);
            return `<article class="corp-card">
                <h4>${escapeHtml(def.label)} ${hired ? '★'.repeat(hired.stars) : ''}</h4>
                <p>${escapeHtml(def.description)}</p>
                <p class="fund-muted">${hired ? `Pensja: ${formatZl(hired.salary)} / tydzień` : `Zatrudnienie: ${formatZl(def.hireCost, 0)}, pensja ok. ${formatZl(def.salary, 0)} / tydzień`}</p>
                ${hired ? '<p class="profit">Zatrudniony</p>' : `<button ${allowed ? '' : 'disabled'} onclick="corporationAction(hireAnalyst, '${type}')">Zatrudnij</button>`}
            </article>`;
        }).join('')}</div>`;
}

function renderCorporationCooperation() {
    const period = playerFund.current.number;
    const companies = stocks.filter(stock => !stock.assetType && !stock.isBankrupt && !stock.isBankStock)
        .sort((a, b) => (Number(b.reputation?.player) || 0) - (Number(a.reputation?.player) || 0))
        .slice(0, 12);

    return `
        <p class="fund-muted">Spotkanie z inwestorem (${formatZl(MEETING_COST, 0)}, raz na okres): szansa zależy od zaufania, wyniku vs GIG i charakteru inwestora — sukces = zakup JU.
        Lunch z prezesem (${formatZl(CEO_LUNCH_COST, 0)}) poprawia relacje; przy dobrej opinii spółka z nadwyżką gotówki lokuje część w JU (uwaga na konflikt interesów, gdy fundusz ma &gt;5% jej akcji).</p>
        <h4>Wielcy inwestorzy</h4>
        <div class="corp-cards">${getBigInvestors().map(ai => {
            const met = corporation.lastMeetings[ai.id] === period;
            return `<article class="corp-card">
                <h4>${escapeHtml(ai.name)}</h4>
                <p class="fund-muted">Gotówka: ${formatZl(ai.cash, 0)}</p>
                <button ${met ? 'disabled' : ''} onclick="corporationAction(meetInvestor, '${ai.id}')">${met ? 'Spotkanie odbyte' : '☕ Spotkanie'}</button>
            </article>`;
        }).join('')}</div>
        <h4>Prezesi spółek</h4>
        <table class="asset-mini-table">
            <thead><tr><th>Spółka</th><th>Prezes</th><th>Relacje</th><th>Gotówka</th><th></th></tr></thead>
            <tbody>${companies.map(stock => {
                const met = corporation.lastMeetings[stock.symbol] === period;
                return `<tr>
                    <td>${escapeHtml(stock.symbol)}</td>
                    <td>${escapeHtml(stock.ceo?.name || stock.ceo || '—')}</td>
                    <td>${(Number(stock.reputation?.player) || 0).toFixed(0)}</td>
                    <td>${formatZl(stock.cash || 0, 0)}</td>
                    <td><button ${met ? 'disabled' : ''} onclick="corporationAction(lunchWithCeo, '${stock.symbol}')">🍽️ Lunch</button></td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
}

function renderCorporationTakeovers() {
    const allowed = canProposeTakeovers();
    const progress = getTakeoverProgress();
    return `
        <p class="fund-muted">Fundusze zewnętrzne to firmy zarządzające. Przejęcie proponuje członek zarządu; zarząd głosuje (reputacja, ostatnia ocena), a cena (${(EXTERNAL_FIRM_VALUE_PER_AUM * 100).toFixed(0)}% aktywów) schodzi z budżetu korporacji (${formatZl(corporation.budget, 0)}).
        Proces ma 7 etapów (postęp co kwartał) i może mieć komplikacje. Cel zwycięstwa: przejąć wskazane 🎯 fundusze (${progress.done}/${progress.required}).</p>
        <div class="corp-cards">${getExternalFunds().map(stock => {
            const isTarget = corporation.takeoverTargets.includes(stock.symbol);
            const process = stock.mergerProcess?.type === 'fundTakeover' ? stock.mergerProcess : null;
            const price = getExternalFirmValuation(stock);
            let action;
            if (stock.managedByCorporation) action = '<p class="profit">✅ Przejęty</p>';
            else if (process) action = `<p>Etap ${process.stage}/7 · postęp ${process.progress}%</p>`;
            else action = `<button ${allowed && corporation.budget >= price ? '' : 'disabled'} onclick="corporationAction(proposeFundTakeover, '${stock.symbol}')">🗳️ Wniosek o przejęcie</button>`;
            return `<article class="corp-card ${isTarget ? 'target' : ''} ${stock.managedByCorporation ? 'done' : ''}">
                <h4>${isTarget ? '🎯 ' : ''}${escapeHtml(getExternalFirmName(stock))}</h4>
                <p>Aktywa: ${formatZl(getExternalFundValue(stock) * stock.totalShares, 0)}</p>
                <p>Cena przejęcia: ${formatZl(price, 0)}</p>
                ${action}
            </article>`;
        }).join('')}</div>
        ${allowed ? '' : '<p class="fund-muted">Wnioski o przejęcie — od stanowiska Członek zarządu.</p>'}`;
}

function showVictoryScreen(victory) {
    const overlay = document.getElementById('victory-overlay');
    const body = document.getElementById('victory-body');
    if (!overlay || !body) return;
    body.innerHTML = `
        <p>${victory.type === 'ceo'
            ? `${escapeHtml(playerProfile.name)} zostaje <strong>CEO</strong> ${escapeHtml(corporation.name)}!`
            : `${escapeHtml(corporation.name)} przejmuje wszystkie wskazane fundusze — <strong>dominacja</strong>!`}</p>
        <p>Okresy: ${victory.periods} · aktywa funduszu: ${formatZl(victory.assets, 0)} · przejęcia: ${corporation.acquiredFunds.length}</p>
        <p class="fund-muted">Możesz grać dalej.</p>`;
    overlay.hidden = false;
}

// =================================================================================
// SKRZYNKA MAILOWA (etap E1) — układ jak Gmail
// =================================================================================

let mailView = { folder: 'inbox', selectedId: null, pane: 'mail' }; // pane: mail | subscriptions | media

const MAIL_FOLDER_LABELS = {
    inbox: '📥 Odebrane', starred: '⭐ Oznaczone', corporation: '🏢 Korporacja',
    PULS: '📰 Puls Rynku', FLESZ: '📰 Flesz Giełdowy', OBSER: '📰 Obserwator', spam: '🚫 Spam'
};

function openMailbox(folder = mailView.folder) {
    mailView.folder = folder;
    mailView.pane = 'mail';
    document.getElementById('mail-overlay').hidden = false;
    renderMailbox();
}

function closeMailbox() {
    document.getElementById('mail-overlay').hidden = true;
}

function updateMailBadge() {
    const badge = document.querySelector('#open-mail-btn .nav-badge');
    if (!badge || !mailbox) return;
    const unread = getUnreadMailCount('inbox');
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.hidden = unread === 0;
}

function formatMailTime(clockMs) {
    const totalMinutes = Math.floor((clockMs || 0) / 60000);
    return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

function setMailFolder(folder) {
    mailView = { folder, selectedId: null, pane: 'mail' };
    renderMailbox();
}

function setMailPane(pane) {
    mailView.pane = pane;
    mailView.selectedId = null;
    renderMailbox();
}

function selectMail(id) {
    mailView.selectedId = id;
    markMailRead(id);
    renderMailbox();
}

function mailAction(fn, ...args) {
    fn(...args);
    renderMailbox();
}

function renderMailbox() {
    const overlay = document.getElementById('mail-overlay');
    updateMailBadge();
    if (!overlay || overlay.hidden || !mailbox) return;

    const folders = document.getElementById('mail-folders');
    folders.innerHTML = MAIL_FOLDERS.map(folder => {
        const unread = getUnreadMailCount(folder);
        const active = mailView.pane === 'mail' && mailView.folder === folder;
        return `<button class="mail-folder ${active ? 'active' : ''}" onclick="setMailFolder('${folder}')">
            <span>${MAIL_FOLDER_LABELS[folder]}</span>${unread ? `<b>${unread}</b>` : ''}</button>`;
    }).join('') + `
        <hr>
        <button class="mail-folder ${mailView.pane === 'subscriptions' ? 'active' : ''}" onclick="setMailPane('subscriptions')">⚙️ Subskrypcje</button>
        ${getSkillLevel('mediaManipulation') > 0 ? `<button class="mail-folder ${mailView.pane === 'media' ? 'active' : ''}" onclick="setMailPane('media')">📣 Kontrola mediów</button>` : ''}`;

    const list = document.getElementById('mail-list');
    const preview = document.getElementById('mail-preview');
    const media = document.getElementById('media-influence-section');
    if (media) media.style.display = 'none';

    if (mailView.pane === 'subscriptions') {
        list.hidden = true;
        preview.innerHTML = renderMailSubscriptions();
        return;
    }
    if (mailView.pane === 'media') {
        list.hidden = true;
        preview.innerHTML = '';
        renderMediaInfluence();
        return;
    }

    list.hidden = false;
    const messages = getMailInFolder(mailView.folder);
    list.innerHTML = `
        <div class="mail-list-toolbar">
            <strong>${MAIL_FOLDER_LABELS[mailView.folder]}</strong>
            <button class="btn-secondary" onclick="mailAction(markAllMailRead, '${mailView.folder}')">Oznacz wszystkie jako przeczytane</button>
        </div>
        ${messages.length ? messages.slice(0, 80).map(message => `
            <div class="mail-row ${message.read ? '' : 'unread'} ${message.id === mailView.selectedId ? 'selected' : ''}" onclick="selectMail(${message.id})">
                <button class="mail-star ${message.starred ? 'on' : ''}" onclick="event.stopPropagation(); mailAction(toggleMailStar, ${message.id})" aria-label="Gwiazdka">${message.starred ? '★' : '☆'}</button>
                <span class="mail-from">${escapeHtml(getMailSenderName(message.sender))}</span>
                <span class="mail-subject">${message.importance >= 3 ? '❗ ' : ''}${message.isSpam ? '<span class="mail-tag">Reklama</span> ' : ''}${escapeHtml(message.subject)}
                    <span class="mail-snippet"> — ${escapeHtml(message.body.slice(0, 80))}</span></span>
                <span class="mail-time">${formatMailTime(message.at)}</span>
            </div>`).join('') : '<p class="fund-muted mail-empty">Brak wiadomości w tym folderze.</p>'}`;

    const selected = mailbox.messages.find(m => m.id === mailView.selectedId);
    preview.innerHTML = selected ? renderMailPreview(selected) : '<p class="fund-muted mail-empty">Wybierz wiadomość z listy.</p>';
}

function renderMailPreview(message) {
    let action = '';
    if (message.action?.type === 'privatization') {
        const offer = privatizationOffer?.symbol === message.action.symbol ? privatizationOffer : null;
        action = offer
            ? `<div class="mail-action">
                   <p>Cena: <strong>${formatZl(offer.price)}</strong> · dostępne: ${offer.remaining.toLocaleString('pl-PL')} akcji · limit funduszu: ${(Math.floor(offer.shares * offer.maxFundShare) - offer.fundShares).toLocaleString('pl-PL')}</p>
                   <input type="text" inputmode="numeric" id="privatization-qty" value="10" aria-label="Liczba akcji">
                   <button onclick="mailAction(subscribePrivatization, parseInt(document.getElementById('privatization-qty').value, 10))">Zapisz fundusz</button>
               </div>`
            : '<p class="fund-muted">Zapisy na tę ofertę są zamknięte.</p>';
    }
    return `
        <article class="mail-message">
            <h3>${escapeHtml(message.subject)}</h3>
            <p class="fund-muted">Od: ${escapeHtml(getMailSenderName(message.sender))} · ${formatMailTime(message.at)}${message.isSpam ? ' · reklama' : ''}</p>
            <p>${escapeHtml(message.body)}</p>
            ${action}
            <div class="mail-message-actions">
                ${message.symbol ? `<button onclick="openStockDetailsModal('${message.symbol}')">Pokaż spółkę</button>` : ''}
                <button onclick="mailAction(toggleMailStar, ${message.id})">${message.starred ? '★ Usuń gwiazdkę' : '☆ Oznacz gwiazdką'}</button>
                <button onclick="mailAction(markMailRead, ${message.id}, false)">Oznacz jako nieprzeczytane</button>
                <button onclick="mailView.selectedId = null; mailAction(deleteMail, ${message.id})">🗑️ Usuń</button>
            </div>
        </article>`;
}

function renderMailSubscriptions() {
    const filter = getSkillLevel('adblock');
    return `
        <h3>Subskrypcje czasopism</h3>
        <p class="fund-muted">Wersja darmowa przysyła wszystkie wiadomości czasopisma razem z jego spamem. Premium (płatne co tydzień z portfela prywatnego: ${formatZl(playerWallet.cash)}) — tylko ważne wiadomości, bez spamu. Każde czasopismo to spółka z giełdy.</p>
        <table class="asset-mini-table">
            <thead><tr><th>Czasopismo</th><th>Profil</th><th>Premium / tydz.</th><th>Subskrypcja</th></tr></thead>
            <tbody>${Object.entries(MAGAZINES).map(([symbol, def]) => {
                const current = mailbox.subscriptions[symbol];
                const option = (level, label) => `<button class="${current === level ? 'active' : ''}" onclick="mailAction(setMagazineSubscription, '${symbol}', ${level ? `'${level}'` : 'null'})">${label}</button>`;
                return `<tr>
                    <td>${escapeHtml(def.label)}</td>
                    <td>${escapeHtml(def.profile)}</td>
                    <td>${formatZl(def.premiumWeekly, 0)}</td>
                    <td class="mail-sub-options">${option('free', 'Darmowa')}${option('premium', 'Premium')}${option(null, 'Wyłącz')}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>
        <p class="fund-muted">Filtr antyspamowy (szkolenie w CV): poziom ${filter}/2 — ${filter >= 2 ? 'reklamy i spam czasopism trafiają do folderu Spam' : filter >= 1 ? 'reklamy spółek trafiają do folderu Spam' : 'spam trafia do skrzynki odbiorczej'}.</p>`;
}

// =================================================================================
// MIASTO: KAMPANIA WYBORCZA (etap E1)
// =================================================================================

function renderCityElection() {
    const container = document.getElementById('city-content-election');
    if (!container || container.contains(document.activeElement)) return; // nie przerywaj wpisywania kwoty
    if (!city.election) {
        const last = city.lastElection;
        container.innerHTML = last
            ? `<h4>Ostatnie wybory</h4><ul>${last.map(r => `<li>${escapeHtml(r.name)} (${escapeHtml(MAYOR_POLICIES[r.policy].label)}): ${(r.share * 100).toFixed(0)}%</li>`).join('')}</ul>`
            : '<p class="fund-muted">Kampania rusza na rok przed wyborami.</p>';
        return;
    }
    container.innerHTML = `
        <h4>Kampania wyborcza — wybory za ${city.mayor.electionYear} ${city.mayor.electionYear === 1 ? 'rok' : 'lata'}</h4>
        <p class="fund-muted">Darowizny z portfela prywatnego (${formatZl(playerWallet.cash)}) zwiększają szanse kandydata. Darowizna od ${PLAYER_DONATION_COMPLIANCE_LIMIT} zł zwraca uwagę compliance. Wygrany pamięta wsparcie.</p>
        <table class="asset-mini-table">
            <thead><tr><th>Kandydat</th><th>Polityka</th><th>Siła kampanii</th><th>Twoje wsparcie</th><th></th></tr></thead>
            <tbody>${city.election.candidates.map(c => `<tr>
                <td>${escapeHtml(c.name)}${c.incumbent ? ' (urzędujący)' : ''}</td>
                <td title="${escapeHtml(MAYOR_POLICIES[c.policy].description)}">${escapeHtml(MAYOR_POLICIES[c.policy].label)}</td>
                <td>${getCandidateScore(c).toFixed(0)}</td>
                <td>${formatZl(c.playerDonations, 0)}</td>
                <td><input type="text" inputmode="numeric" id="campaign-${c.id}" value="100" size="6" aria-label="Kwota darowizny">
                    <button onclick="donateToCampaign('${c.id}', parseFloat(document.getElementById('campaign-${c.id}').value)); updateCityModalContent();">Wesprzyj</button></td>
            </tr>`).join('')}</tbody>
        </table>`;
}
