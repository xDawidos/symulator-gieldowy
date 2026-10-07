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
  // Zakładka poziomu rynku (ui-update.js: setMarketLevel) — pokazujemy tylko wybraną giełdę.
  const sortedExchanges = Object.keys(exchanges)
    .filter(key => typeof currentMarketLevel === 'undefined' || currentMarketLevel === 'ALL' || key === currentMarketLevel)
    .sort((a, b) => exchanges[a].level - exchanges[b].level);
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
    row.classList.add('clickable');

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
      toggleBtn.classList.add('clickable');
      toggleBtn.classList.add('mr-1');
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
      mergerStatusContainer.classList.add('mt-1');
      mergerStatusContainer.classList.add('w-sm');
      mergerStatusContainer.title = `Proces M&A: ${process.statusMessage}`;

      const statusText = document.createElement('span');
      statusText.textContent = `Etap: ${process.stage}/7`;
      statusText.classList.add('text-xs');
      statusText.style.display = 'block';

      const progressBar = document.createElement('progress');
      progressBar.value = process.progress;
      progressBar.max = 100;
      progressBar.classList.add('w-full');

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
      phaseBadge.classList.add('phase-badge');
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
    actionsCell.classList.add('text-center');

    if (!hasAccess) {
      const lockSpan = document.createElement('span');
      lockSpan.textContent = '🔒';
      lockSpan.title = 'Brak dostępu do giełdy';
      lockSpan.classList.add('text-lg');
      actionsCell.appendChild(lockSpan);
    } else if (isLocked || stock.isBeingMerged || stock.canBeTraded === false) {
      const stopSpan = document.createElement('span');
      stopSpan.textContent = '⛔';
      stopSpan.title = 'Handel wstrzymany';
      stopSpan.classList.add('text-lg');
      actionsCell.appendChild(stopSpan);
    } else {
      const drawerBtn = document.createElement('button');
      drawerBtn.className = 'btn-ghost-icon drawer-toggle-btn';
      drawerBtn.dataset.symbol = stock.symbol;
      drawerBtn.title = 'Kup / Sprzedaj / Wykres';
      drawerBtn.innerHTML =
        sharesOwned > 0
          ? '<span class="text-up">▼</span>'
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
        repSpan.classList.add('row-icon');
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
      debtSpan.classList.add('row-icon', 'row-icon-sm');
      actionsCell.appendChild(debtSpan);
    }

    if (playerSharePct > 50) {
      const manageButton = document.createElement('button');
      manageButton.textContent = '👑';
      manageButton.title = 'Panel Zarządzania';
      manageButton.className = 'btn-ghost-icon';
      manageButton.classList.add('ml-1');
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
      headerCell.innerHTML = `<h4 style="color: ${
        exchange.color
      }" class="my-1 d-flex justify-between">${
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
                listItem.classList.add('dimmed');
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
                groupedBonds[key] = { count: 0, name: bond.issuerName, type: bond.type, nextMaturity: Infinity, value: 0, defaulted: 0 };
            }
            groupedBonds[key].count++;
            groupedBonds[key].nextMaturity = Math.min(groupedBonds[key].nextMaturity, Number(bond.remainingGameMs) || 0);
            groupedBonds[key].value += getBondValue(bond);
            if (bond.defaulted) groupedBonds[key].defaulted++;
        });
        for (const key in groupedBonds) {
            const group = groupedBonds[key];
            const remainingTime = Math.max(0, Math.ceil(group.nextMaturity / 60000));
            const bondItem = document.createElement('li');
            bondItem.textContent = `- ${group.name} (${group.type}): ${group.count} szt., wycena ${group.value.toFixed(0)} zł (zapada za ~${remainingTime} min gry)${group.defaulted ? ' ⚠️ niewypłacalny emitent' : ''}`;
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
    for (const loan of playerFund?.pawnLoans || []) { // zastawy funduszu w lombardzie (finance.js)
        const loanItem = document.createElement('li');
        loanItem.innerHTML = `🏦 Lombard: <strong class="loss">${loan.principal.toFixed(2)} zł</strong> [zastaw: ${loan.shares} ${escapeHtml(loan.symbol)}] · ${loan.weeksLeft} tyg.`;
        myLiabilitiesList.appendChild(loanItem);
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
        listItem.classList.add('divider-bottom');
        listItem.classList.add('py-1');
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
        quantityInput.classList.add('w-xs');
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
            <span class="index-change fw-bold" style="color: ${color}">${description}</span>
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
    deptsDiv.classList.add('justify-between');
    deptsDiv.classList.add('mb-3');
    
    const deptNames = { research: "Badania (R&D)", development: "Rozwój (Inv)", economy: "Ekonomia" };
    
    for (const [key, data] of Object.entries(stock.departments)) {
        const deptCard = document.createElement('div');
        deptCard.classList.add('dept-card');
        
        let upgradeBtn = '';
        if (data.level < 3) {
            const cost = 50000 * Math.pow(2, data.level);
            upgradeBtn = `<button onclick="fundDepartmentUpgrade('${stock.symbol}', '${key}')" class="text-xs mt-1 w-full">Ulepsz (${(cost/1000).toFixed(0)}k)</button>`;
        } else {
            upgradeBtn = `<span class="text-xs text-up fw-bold">MAX LEVEL</span>`;
        }

        deptCard.innerHTML = `
            <div class="fw-bold text-sm mb-1">${deptNames[key]}</div>
            <div class="text-lg text-info">Lvl ${data.level}</div>
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
        invList.classList.add('list-plain');
        invList.classList.add('p-0');

        for (const order of orders) {
            const li = document.createElement('li');
            li.classList.add('mb-2');
            li.classList.add('p-2');
            li.classList.add('border-left-info');

            const head = document.createElement('div');
            head.style.display = 'flex';
            head.classList.add('justify-between');
            const name = document.createElement('strong');
            name.textContent = order.name;
            const cancel = document.createElement('button');
            cancel.textContent = 'Zablokuj';
            cancel.classList.add('text-xs');
            cancel.onclick = () => blockInvestment(stock.symbol, order.ref);
            head.append(name, cancel);

            const bar = document.createElement('progress');
            bar.max = 1;
            bar.value = order.progress;
            bar.dataset.orderRef = order.ref;
            bar.classList.add('w-full');
            bar.classList.add('h-10');

            const info = document.createElement('div');
            info.classList.add('text-xs');
            info.textContent = `${(order.progress * 100).toFixed(0)}% · ${order.detail} · ${order.path}`;

            li.append(head, bar, info);
            invList.appendChild(li);
        }
        activeDiv.appendChild(invList);
    } else {
        activeDiv.innerHTML += `<p class="text-sm text-muted fst-italic">Brak aktywnych projektów.</p>`;
    }
    deptSection.appendChild(activeDiv);

    // --- 3. KATALOG DOSTĘPNYCH INWESTYCJI (wszystkie sektory spółki, bez duplikatów) ---
    const catalogDiv = document.createElement('div');
    catalogDiv.classList.add('mt-3');
    catalogDiv.innerHTML = `<h5>📋 Katalog Inwestycji</h5>
        <p class="text-xs text-muted">Pozycje budowlane trafiają do przetargu (cena = budżet przetargu, czas w dniach budowy).
        Pozostałe spółka realizuje sama. Czas podany w dniach (1 dzień = 1/7 tygodnia gry).</p>`;

    const table = document.createElement('table');
    table.classList.add('text-xs');
    table.classList.add('w-full');
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
            statusBtn = `<span class="text-muted text-xs">Wymaga działu rozwoju Lvl ${inv.minDevLevel}</span>`;
        } else if (inProgress) {
            statusBtn = `<span class="text-info text-xs">W toku</span>`;
        } else if (!isAffordable) {
            statusBtn = `<span class="text-down text-xs">Brak środków</span>`;
        } else if (isLimitReached) {
            statusBtn = `<span class="text-warn text-xs">Limit projektów</span>`;
        } else {
            statusBtn = `<button onclick="forceCompanyInvestment('${stock.symbol}', '${inv.id}')" class="btn-xs text-xs bg-up text-on-accent btn-plain clickable">${isConstruction ? 'Przetarg' : 'Start'}</button>`;
        }

        const iconSrc = inv.icon || 'img/box.png';
        const kindLabel = INVESTMENT_KIND_LABELS[inv.kind] || inv.kind;
        const mixedNote = inv.kind === 'mixed' ? `<div class="text-xs text-muted">budowa ${(inv.constructionShare * 100).toFixed(0)}% kosztu</div>` : '';

        tr.innerHTML = `
            <td class="d-flex items-center">
                <img src="${iconSrc}" class="icon-24 mr-2" onerror="this.style.display='none'">
                <span>${inv.name}</span>
            </td>
            <td>${kindLabel}${mixedNote}</td>
            <td>${(realCost / 1000).toFixed(0)}k PLN</td>
            <td>${inv.durationDays} dni</td>
            <td>
                <div class="text-xs text-muted">
                    ${inv.assetValue > 0 ? `<div>🏠 szac. ${(inv.assetValue / 1000).toFixed(0)}k</div>` : ''}
                    ${inv.incomeBonus > 0 ? `<div>💰 +${(inv.incomeBonus * 100).toFixed(0)}%</div>` : ''}
                    ${inv.healthBonus > 0 ? `<div>❤️ +${inv.healthBonus}</div>` : ''}
                </div>
            </td>
            <td class="text-center">${statusBtn}</td>
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
                financesInfo.style.color = 'var(--text-muted)';
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
            deptsContent.innerHTML = '<p class="text-down">Błąd: Brak funkcji renderDepartmentsSection.</p>';
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

// Plik: ui.js
// Ta funkcja jest z ui.js (baza) i obsługuje złożony modal bankowy (z zakładkami)
function openBankModal() {
    const ceoInfo = document.querySelector('#bank-content-central .central-bank-ceo-info');
    if (ceoInfo && centralBank.ceo) {
        const traits = centralBank.ceo.traits.map(trait => `<span class="bank-trait" title="${escapeHtml(trait.description)}">${escapeHtml(trait.name)}</span>`).join('');
        ceoInfo.innerHTML = `<div class="bank-ceo"><span class="bank-ceo-label">Prezes Banku Centralnego</span><strong>${escapeHtml(centralBank.ceo.name)}</strong><div class="bank-traits">${traits}</div></div>`;
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

    renderBankTicker();
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
        cell.classList.add('text-center');
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
        nameHTML += ` <button onclick="openInvestorsModal('${startup.symbol}')" class="ml-2 btn-xs text-sm">🏆 Ranking</button>`;
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
        amountInput.classList.add('w-sm');
        amountInput.id = `invest-amount-${startup.symbol}`;
        amountInput.value = previousInputValues[startup.symbol] || '';
        const investButton = document.createElement('button');

        switch (startup.stage) {
            case 'funding': {
                fundingCell.innerHTML = `${startup.currentFunding.toFixed(2)} PLN <progress value="${startup.currentFunding}" max="${startup.fundingGoal}" class="w-full"></progress>`;
                progressCell.innerHTML = `<progress value="0" max="100" class="w-full"></progress>`;
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
                    privatizeButton.classList.add('ml-1');
                    privatizeButton.onclick = () => privatizeStartup(startup.symbol);
                    actionsCell.appendChild(privatizeButton);
                }

                // Przycisk Auto-inwestycji (ten, który dodawaliśmy ostatnio)
                const autoInvestSettings = playerStartupAutoInvest[startup.symbol];
                const autoInvestButton = document.createElement('button');
                autoInvestButton.textContent = '🔄';
                autoInvestButton.title = 'Ustaw automatyczne inwestowanie';
                autoInvestButton.classList.add('ml-1');
                if (autoInvestSettings && autoInvestSettings.isEnabled) {
                    autoInvestButton.style.borderColor = 'var(--color-up)';
                    autoInvestButton.style.borderWidth = '2px';
                }
                autoInvestButton.onclick = () => openStartupAutoInvestModal(startup.symbol);
                actionsCell.appendChild(autoInvestButton);

                break;
            }

            case 'development':
                fundingCell.innerHTML = `<strong class="text-info">W trakcie rozwoju...</strong>`;

                if (startup.pendingExtraCost) {
                    progressCell.innerHTML = `<span class="text-down fw-bold">WSTRZYMANO</span>`;
                    actionsCell.innerHTML = `<span>Wymaga: ${startup.pendingExtraCost.toFixed(2)} PLN</span>
                                           <button onclick="payExtraStartupCost('${startup.symbol}')">Zapłać</button>`;
                } else if (startup.developmentPausedUntil && Date.now() < startup.developmentPausedUntil) {
                    const timeLeft = Math.ceil((startup.developmentPausedUntil - Date.now()) / 1000);
                    progressCell.innerHTML = `<span class="text-warn">OPÓŹNIENIE (${timeLeft}s)</span>`;
                    actionsCell.innerHTML = 'Prace wstrzmane';
                } else {
                    progressCell.innerHTML = `<progress value="${startup.developmentProgress}" max="100" class="w-full"></progress>`;
                    actionsCell.innerHTML = 'Zablokowane';
                }
                break;

            case 'financial_complications':
                const timeLeftFC = Math.max(0, Math.floor(startup.rescueTimeLeft / 1000));
                fundingCell.innerHTML = `
                    <strong class="text-down">Wymagane dofinansowanie!</strong>
                    <progress value="${startup.rescueCurrent}" max="${startup.rescueGoal}" class="w-full"></progress>
                    <span>${startup.rescueCurrent.toLocaleString('pl-PL')} / ${startup.rescueGoal.toLocaleString('pl-PL')} PLN</span>
                `;
                progressCell.innerHTML = `<strong class="text-down">Pozostały czas: ${timeLeftFC}s</strong>`;

                const rescueInput = document.createElement('input');
                rescueInput.type = 'number';
                rescueInput.placeholder = 'Kwota';
                rescueInput.classList.add('w-sm');
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
                fundingCell.innerHTML = `<strong class="text-up">Cel osiągnięty!</strong><br>Czas na bonus: ${timeLeftOF}s`;
                progressCell.innerHTML = `<progress value="0" max="100" class="w-full"></progress>`;
                investButton.textContent = 'Zainwestuj (Bonus)';

                // Tworzenie przycisku auto-inwestycji (ten kod jest poprawny)
                const autoInvestSettings = playerStartupAutoInvest[startup.symbol];
                const autoInvestButton = document.createElement('button');
                autoInvestButton.textContent = '🔄'; // Użyłem sugerowanej przez Ciebie emotki
                autoInvestButton.title = 'Ustaw automatyczne inwestowanie';
                autoInvestButton.classList.add('ml-1');
                if (autoInvestSettings && autoInvestSettings.isEnabled) {
                    autoInvestButton.style.borderColor = 'var(--color-up)'; // Zielona ramka dla aktywnych
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
            insuranceButton.classList.add('ml-1');
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
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Brak inwestorów.</td></tr>';
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
            barContainer.classList.add('mb-1');
            barContainer.innerHTML = `
                <span>${name}: ${amount.toLocaleString('pl-PL')} PLN</span>
                <div class="w-full bg-muted">
                    <div style="width: ${percentage}%" class="bg-info text-on-accent text-right">
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
        statusEl.style.color = 'var(--color-up)';
    } else {
        statusEl.textContent = '❌ Nieaktywne';
        statusEl.style.color = 'var(--color-down)';
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
            toggleBtn.style.backgroundColor = 'var(--color-down)';
        } else {
            toggleBtn.textContent = 'Włącz Automatyzację';
            toggleBtn.style.backgroundColor = 'var(--color-up)';
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
            toggleBtn.style.backgroundColor = 'var(--color-down)';
        } else {
            toggleBtn.textContent = 'Włącz Automatyzację';
            toggleBtn.style.backgroundColor = 'var(--color-up)';
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
        candlestickBtn.style.backgroundColor = 'var(--bg-elevated-2)';
        candlestickBtn.style.border = '2px solid #007bff';
    } else {
        lineBtn.style.backgroundColor = 'var(--bg-elevated-2)';
        lineBtn.style.border = '2px solid #007bff';
    }
}

// Motyw: ciemny domyślnie; wybór gracza zapamiętany w przeglądarce (wygoda, nie stan gry).
const THEME_KEY = 'gra_inwestycyjna_theme';
let currentTheme = 'dark';

function toggleDarkMode() {
  currentTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, currentTheme); } catch (e) { /* brak dostępu do pamięci */ }
  document.body.classList.toggle('dark-mode', currentTheme === 'dark');
}

function applyInitialTheme() {
  try { currentTheme = localStorage.getItem(THEME_KEY) || currentTheme; } catch (e) { /* zostaje domyślny */ }
  document.body.classList.toggle('dark-mode', currentTheme === 'dark');
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
         if(stock.corporatePhase === CORPORATE_PHASES.GOLDEN_YEAR || stock.corporatePhase === CORPORATE_PHASES.GROWTH) phaseInfoDiv.style.color = 'var(--color-up)';
         else if(stock.corporatePhase === CORPORATE_PHASES.DECLINE || stock.corporatePhase === CORPORATE_PHASES.SHADOW_DESCENT) phaseInfoDiv.style.color = 'var(--color-down)';
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
            <div class="d-flex items-center gap-3 mb-2">
                <div class="stat-tile text-center p-2">
                    <span class="text-xl">👔</span>
                </div>
                <div class="flex-1">
                    <h4 class="m-0">${stock.ceo.name}</h4>
                    <p class="my-1 text-sm text-muted">Wiek: ${stock.ceo.age}, Staż w firmie: ${tenureYears} lat</p>
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
        card.classList.add('choice-card');

        let traitsHTML = '';
        if (candidate.traits && candidate.traits.length > 0) {
            candidate.traits.forEach(trait => {
                const traitData = ceoTraits[trait.id];
                if (traitData) {
                    traitsHTML += `<span class="ceo-trait m-half" style="background-color: ${traitData.color}" title="${traitData.description}">${traitData.name}</span>`;
                }
            });
        } else {
            traitsHTML = '<p class="text-sm text-muted">Brak wyróżniających cech</p>';
        }

        const tenureYears = Math.floor(candidate.tenure / 4);
        card.innerHTML = `
            <h4 class="mb-1">${candidate.name}</h4>
            <p class="my-1 text-sm text-muted">Wiek: ${candidate.age}, Doświadczenie: ${tenureYears} lat</p>
            <div class="ceo-traits-container mt-2 min-h-50" >${traitsHTML}</div>
            <button onclick="confirmCeoChange('${symbol}', ${index})">Zatwierdź Kandydata</button>
            <p class="mt-2 fw-bold text-md">Szansa: ${(successChance * 100).toFixed(0)}%</p>
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

/** Przycisk zamykania w oknie: zamyka najbliższe okno .modal. */
function closeModalFrom(element) {
    const modal = element?.closest('.modal');
    if (modal) modal.style.display = 'none';
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
        document.getElementById('city-budget-display').textContent = city.budget.toLocaleString('pl-PL', { maximumFractionDigits: 0 });
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
        document.getElementById('city-total-donated').textContent = city.playerDonatedAmount.toFixed(2); // Użyj nowego pola
        const statusEl = document.getElementById('city-unlock-status');
        if (city.playerHasUnlocked) {
            statusEl.textContent = "Odblokowane!";
            statusEl.style.color = 'var(--color-up)';
        } else {
            statusEl.textContent = `Zablokowane (Cel: 10,000 PLN)`;
            statusEl.style.color = 'var(--color-down)';
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
    const timeLeft = Math.max(0, Math.ceil((Number(festival.remainingMs) || 0) / 1000));

    // --- Sekcja Gracza ---
    let playerSectionHTML = '';
    if (playerParticipant) {
        // Logika dla gracza, który dołączył
        const currentLevel = FESTIVAL_STALL_LEVELS[playerParticipant.level - 1];
        const nextLevel = FESTIVAL_STALL_LEVELS[playerParticipant.level];
        playerSectionHTML = `
            <h4>Twoje stoisko (Poziom ${playerParticipant.level}: ${currentLevel.name})</h4>
            <p>Zdobyte zainteresowanie: <strong>${playerParticipant.interest.toFixed(1)}</strong></p>
            <div class="mb-2">
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
                ${companyButtonsHTML}
            </div>
        `;
    }

    // --- Sekcja Rankingu Uczestników ---
    let participantsTableHTML = `
        <h4>Ranking Stoisk na Żywo</h4>
        <table class="w-full">
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
            case 'city': targetName = 'Miasto Gdańsk'; break;
            case 'bank_promo': targetName = p.ownerName; break; // Dla banków
        }
        participantsTableHTML += `<tr style="${p.ownerId === 'player' ? 'font-weight: bold; background-color: var(--bg-elevated-2);' : ''}">
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
        <h2 class="mt-0 text-center">🎉 Trwa ${festival.name}! 🎉</h2>
        <div class="bank-section">
            <p>Koniec za: <strong>${timeLeft}s</strong> | Zainteresowanie wydarzeniem: <strong>${festival.globalInterest.toFixed(1)}</strong></p>
            <p class="text-sm">Atrakcje: ${festival.attractions.join(', ')}</p>
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
        input.classList.add('w-xs');
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
        if (bond.risk > 0.5) riskCell.style.color = 'var(--color-down)'; // Oznacz wysokie ryzyko
        else if (bond.risk > 0.3) riskCell.style.color = 'var(--color-warn)'; // Oznacz średnie ryzyko
        row.insertCell().textContent = bond.available;

        const actionsCell = row.insertCell();
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.value = '1';
        input.classList.add('w-xs');
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
        content.innerHTML = '<p class="text-down">Brak dostępu do danych finansowych.</p>';
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
        <p class="text-xs text-muted">Pozycje te są już rozliczone w gotówce i bilansie; raport kwartalny tylko je wykaże.</p>
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
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Brak dostępnych celów na rynku.</td></tr>';
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
            takeoverLboBtn.classList.add('ml-1');
            takeoverLboBtn.style.borderColor = 'var(--color-warn)'; // Żółta ramka dla odróżnienia
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
                mergerBtn.classList.add('ml-2');
                mergerBtn.style.borderColor = 'var(--color-up)'; // Zielona ramka
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

// --- Panel Windykatora ---
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
    renderPawnPanel();
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
                const def = CLIENT_TYPES[client.type] || CLIENT_TYPES.careful;
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

    // Tryb debug: opcja „Pomijaj scenkę z babcią” — od razu profil domyślny z formularza.
    if (isDebugMode() && isIntroSkipEnabled()) {
        completeIntroScene();
        return;
    }

    overlay.hidden = false;
    thread.innerHTML = '';
    form.hidden = true;
    const skip = document.getElementById('intro-skip-btn');
    if (skip) skip.hidden = !isDebugMode();

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
    if (typeof syncCeoTitle === 'function') syncCeoTitle(); // nazwa korporacji z formularza
    logEvent(`💼 Witaj, ${playerProfile.name}! Zarządzasz funduszem „${playerProfile.fundName}” w ${playerProfile.corporation}. Wznów grę, aby zacząć.`, 'review');

    // Jedno powitanie w poczcie — z nazwami z formularza (startNewCareer wysłał wcześniej domyślne).
    mailbox = createMailbox();
    addMail({
        sender: 'corporation',
        subject: `Witamy w ${playerProfile.corporation}, ${playerProfile.name}!`,
        body: `Od dziś zarządzasz funduszem „${playerProfile.fundName}”. Wyniki oceniamy co 4 okresy. Wiadomości z rynku przysyłają czasopisma — prenumeraty ustawisz w zakładce Subskrypcje.`,
        importance: 2
    });
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
    const skipButton = document.getElementById('debug-skip-intro-btn');
    if (skipButton) skipButton.textContent = `⏭️ Pomijaj scenkę z babcią: ${isIntroSkipEnabled() ? 'tak' : 'nie'}`;
    if (!enabled && currentSpeedMultiplier > 5) setGameSpeed(5);
}

const INTRO_SKIP_KEY = 'gra_inwestycyjna_skip_intro';

function isIntroSkipEnabled() {
    try { return localStorage.getItem(INTRO_SKIP_KEY) === '1'; } catch (e) { return false; }
}

/** Przełącznik w ustawieniach debug: kolejne nowe gry startują bez scenki z babcią. */
function toggleIntroSkip() {
    try { localStorage.setItem(INTRO_SKIP_KEY, isIntroSkipEnabled() ? '0' : '1'); } catch (e) { /* brak localStorage */ }
    applyDebugModeUi();
}

/** Pomija trwającą scenkę (przycisk w scence, widoczny w trybie debug). */
function skipIntroScene() {
    completeIntroScene();
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

/**
 * Niezmienniki świata gry (testy i tryb debug): skończone liczby, brak ujemnej gotówki funduszy,
 * akcje w obrocie w granicach, JU klientów = JU funduszu, zastawy ≤ posiadanych, istniejące giełdy.
 * Zwraca listę naruszeń (pusta = OK).
 */
function checkWorldInvariants() {
    const problems = [];
    const finite = (value, label) => { if (!Number.isFinite(Number(value))) problems.push(`${label}: ${value}`); };
    const EPS = 1e-6;

    for (const stock of stocks) {
        if (stock.isBankrupt) continue;
        finite(stock.price, `cena ${stock.symbol}`);
        if (!(stock.price > 0)) problems.push(`cena ${stock.symbol} ≤ 0`);
        finite(stock.cash, `gotówka ${stock.symbol}`);
        if (!exchanges[stock.exchange] && stock.exchange !== 'INCUBATOR') problems.push(`nieznana giełda ${stock.symbol}: ${stock.exchange}`);
        if (stock.sharesHeld < -EPS || stock.sharesHeld > stock.totalShares + EPS) problems.push(`sharesHeld ${stock.symbol}: ${stock.sharesHeld}/${stock.totalShares}`);
    }

    if (playerFund) {
        finite(playerCash, 'gotówka funduszu');
        if (playerCash < -EPS) problems.push(`ujemna gotówka funduszu: ${playerCash}`);
        finite(getFundNav(), 'NAV');
        const clientUnits = playerFund.clients.reduce((sum, client) => sum + client.units, 0);
        if (Math.abs(clientUnits - playerFund.units) > Math.max(EPS, playerFund.units * 1e-9)) problems.push(`JU klientów ${clientUnits} ≠ JU funduszu ${playerFund.units}`);
        finite(playerWallet?.cash, 'portfel prywatny');
    }
    const checkPortfolio = (portfolio, owner) => {
        for (const [symbol, holding] of Object.entries(portfolio || {})) {
            finite(holding.shares, `akcje ${owner} ${symbol}`);
            if (holding.shares < -EPS) problems.push(`ujemne akcje ${owner} ${symbol}`);
            if ((holding.lockedShares || 0) > holding.shares + EPS) problems.push(`zastaw > posiadanych ${owner} ${symbol}`);
        }
    };
    checkPortfolio(playerPortfolio, 'fundusz');
    for (const ai of aiCompetitors) { finite(ai.cash, `gotówka ${ai.name}`); checkPortfolio(ai.portfolio, ai.name); }
    for (const manager of corporation?.managers || []) {
        finite(manager.fund.cash, `gotówka funduszu ${manager.name}`);
        if (manager.fund.cash < -EPS) problems.push(`ujemna gotówka funduszu ${manager.name}`);
        finite(getBotFundNav(manager.fund), `NAV ${manager.name}`);
        checkPortfolio(manager.fund.portfolio, manager.name);
    }
    for (const bond of allBonds) finite(bond.faceValue, `obligacja ${bond.id}`);
    if (corporation) finite(corporation.budget, 'budżet korporacji');
    return problems;
}

function debugCheckInvariants() {
    const problems = checkWorldInvariants();
    showToast(problems.length ? `Naruszenia: ${problems.length} (szczegóły w konsoli)` : 'Świat gry spójny ✔', problems.length ? 'error' : 'success', 6000);
    if (problems.length) console.warn('[niezmienniki]', problems);
    return problems;
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
        <button class="mail-folder ${mailView.pane === 'subscriptions' ? 'active' : ''}" onclick="setMailPane('subscriptions')">⚙️ Subskrypcje</button>`;

    const list = document.getElementById('mail-list');
    const preview = document.getElementById('mail-preview');

    if (mailView.pane === 'subscriptions') {
        list.hidden = true;
        preview.innerHTML = renderMailSubscriptions();
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

// =================================================================================
// LOMBARD FUNDUSZU (etap E2)
// =================================================================================

function renderPawnPanel() {
    const container = document.getElementById('fund-pawn-panel');
    if (!container || !playerFund || container.contains(document.activeElement)) return; // nie przerywaj wpisywania
    const account = getFundAccount();
    const pawnShop = getPawnShop();
    const holdings = Object.entries(playerPortfolio)
        .filter(([, h]) => (h.assetType === 'stock' || !h.assetType) && h.shares - (h.lockedShares || 0) > 0);

    container.innerHTML = `
        <p class="fund-muted">Zastaw do ${(PAWN_MAX_SHARE_OF_ASSETS * 100).toFixed(0)}% aktywów funduszu, ${(PAWN_LOAN_TO_VALUE * 100).toFixed(0)}% wartości akcji, ${(PAWN_ANNUAL_RATE * 100).toFixed(0)}% rocznie, ${PAWN_WEEKS} tygodni.
        Każdy zastaw obniża zaufanie klientów i zwiększa ryzyko compliance. ${COLLECTOR_AFTER_MISSED} niezapłacone odsetki = windykator zajmuje akcje.</p>
        <div class="career-row"><span>Zadłużenie / limit</span><span>${formatZl(getPawnOutstanding(account), 0)} / ${formatZl(getPawnOutstanding(account) + getPawnCapacity(account), 0)}</span></div>
        ${account.loans.map(loan => `
            <div class="career-row">
                <span>${escapeHtml(loan.symbol)} × ${loan.shares} · ${formatZl(loan.principal, 0)} · ${loan.weeksLeft} tyg.${loan.missed ? ` · <span class="loss">zaległość ${loan.missed}</span>` : ''}</span>
                <button onclick="repayFundPawn('${loan.id}')">Spłać</button>
            </div>`).join('')}
        ${pawnShop && holdings.length ? `
            <div class="fund-emission">
                <select id="pawn-symbol" aria-label="Akcje do zastawu">${holdings.map(([symbol, h]) => `<option value="${symbol}">${symbol} (wolne: ${h.shares - (h.lockedShares || 0)})</option>`).join('')}</select>
                <input type="text" inputmode="numeric" id="pawn-qty" value="10" aria-label="Liczba akcji">
                <button class="btn-secondary" onclick="pawnFundShares(document.getElementById('pawn-symbol').value, parseInt(document.getElementById('pawn-qty').value, 10))">Zastaw</button>
            </div>` : `<p class="fund-muted">${pawnShop ? 'Brak wolnych akcji do zastawu.' : 'Lombard jest nieczynny.'}</p>`}`;
}

/** Okno lombardu: warunki, zastawy funduszu gracza i zapas przejętych akcji. */
function openPawnShopPanel() {
    const modal = document.getElementById('pawnshop-modal');
    const body = document.getElementById('pawnshop-body');
    if (!modal || !body) return;
    const pawnShop = getPawnShop();
    const holdings = shop => Object.entries(shop?.holdingPortfolio || {})
        .map(([symbol, item]) => `<li>${item.quantity} × ${escapeHtml(symbol)} (przejęte po ${formatZl(item.purchasePrice)})</li>`).join('');

    body.innerHTML = pawnShop ? `
        <p><strong>${escapeHtml(pawnShop.name)}</strong> (${escapeHtml(pawnShop.symbol)}) · gotówka ${formatZl(pawnShop.cash, 0)}</p>
        <p class="fund-muted">Pożyczki pod zastaw akcji dla funduszy: ${(PAWN_LOAN_TO_VALUE * 100).toFixed(0)}% wartości, ${(PAWN_ANNUAL_RATE * 100).toFixed(0)}% rocznie, ${PAWN_WEEKS} tygodni, do ${(PAWN_MAX_SHARE_OF_ASSETS * 100).toFixed(0)}% aktywów funduszu. Zastaw ustawisz w panelu funduszu (sekcja „Lombard”).</p>
        <h4>Zastawy Twojego funduszu</h4>
        <ul>${(playerFund?.pawnLoans || []).map(loan => `<li>${loan.shares} × ${escapeHtml(loan.symbol)}: ${formatZl(loan.principal)} · ${loan.weeksLeft} tyg.${loan.missed ? ` · zaległość ${loan.missed}` : ''}</li>`).join('') || '<li class="fund-muted">Brak.</li>'}</ul>
        <h4>Akcje przejęte przez lombard</h4>
        <ul>${holdings(pawnShop) || '<li class="fund-muted">Brak.</li>'}</ul>`
        : '<p class="loss">Lombard nie jest dostępny.</p>';
    modal.style.display = 'block';
}

/** Okno windykatora: zasady i akcje zajęte dłużnikom (fundusze, boty). */
function openDebtCollectorPanel() {
    const modal = document.getElementById('debtcollector-modal');
    const body = document.getElementById('debtcollector-body');
    if (!modal || !body) return;
    const collector = getDebtCollector();
    const seized = Object.entries(collector?.holdingPortfolio || {})
        .map(([symbol, item]) => `<li>${item.quantity} × ${escapeHtml(symbol)}</li>`).join('');
    const botDebts = aiCompetitors.reduce((sum, ai) => sum + (ai.loans || []).filter(loan => (loan.missedPayments || 0) > 0).length, 0);

    body.innerHTML = collector ? `
        <p><strong>${escapeHtml(collector.name)}</strong> (${escapeHtml(collector.symbol)}) · gotówka ${formatZl(collector.cash, 0)}</p>
        <p class="fund-muted">Windykator przejmuje zaległe długi (kredyty botów z zaległościami, niespłacone zastawy funduszy po ${COLLECTOR_AFTER_MISSED} nieopłaconych odsetkach) i zajmuje akcje dłużników z dyskontem ${(100 - COLLECTOR_DISCOUNT * 100).toFixed(0)}%.</p>
        <p>Kredyty botów z zaległościami: <strong>${botDebts}</strong></p>
        <h4>Zajęte akcje</h4>
        <ul>${seized || '<li class="fund-muted">Brak.</li>'}</ul>`
        : '<p class="loss">Windykator nie jest dostępny.</p>';
    modal.style.display = 'block';
}

// =================================================================================
// CENTRUM BANKOWE (okno banku): wskaźniki, zakładki, banki komercyjne, lokaty funduszu
// =================================================================================

const BANK_TYPE_STYLES = {
    INVESTMENT: 'invest', CORPORATE: 'corporate', UNIVERSAL: 'universal', INTERNATIONAL: 'international',
    COOPERATIVE: 'cooperative', INTERNET: 'internet', MORTGAGE: 'mortgage'
};

function getBankTypeClass(type) {
    const key = Object.keys(BANK_TYPES).find(name => BANK_TYPES[name] === type);
    return `bank-type-${BANK_TYPE_STYLES[key] || 'other'}`;
}

/** Pasek wskaźników na górze okna banku. */
function renderBankTicker() {
    const ticker = document.getElementById('bank-ticker');
    if (!ticker) return;
    const pct = value => `${(value * 100).toFixed(2)}%`;
    const items = [
        ['Stopa bazowa BC', pct(centralBank.baseInterestRate || 0)],
        ['Kredyt (rynek)', pct(getLoanRate())],
        ['Depozyt (rynek)', pct(getDepositRate())],
        ['Gotówka funduszu', formatZl(playerCash, 0)],
        ['Lokaty funduszu', formatZl(getFundDepositsValue(), 0)],
        ['Obligacje funduszu', formatZl(getFundBondsValue(), 0)]
    ];
    ticker.innerHTML = items.map(([label, value]) => `<div class="bank-ticker-item"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function switchBankTab(tabName) {
    const modal = document.getElementById('bank-modal');
    if (!modal) return;
    modal.querySelectorAll('.bank-tab-content').forEach(content => { content.style.display = 'none'; });
    document.getElementById(`bank-content-${tabName}`).style.display = 'block';
    modal.querySelectorAll('.bank-tab-btn').forEach(button => button.classList.toggle('active', button.id === `tab-btn-${tabName}`));
    renderBankTicker();
    if (tabName === 'bonds') renderBondMarketInBank();
    else if (tabName === 'commercial') renderCommercialBanksList();
}

function renderFundDeposits() {
    const container = document.getElementById('fund-deposits-list');
    if (!container) return;
    const deposits = getFundDeposits();
    container.innerHTML = deposits.length ? deposits.map(deposit => `
        <div class="bank-deposit">
            <div class="bank-deposit-info">
                <strong>${escapeHtml(deposit.bankName)}</strong>
                <span class="text-muted text-sm">${deposit.termWeeks} tyg. · ${(deposit.rate * 100).toFixed(2)}% rocznie · zostało ${deposit.weeksLeft} tyg.</span>
            </div>
            <div class="bank-deposit-amount">${formatZl(deposit.principal)} <span class="text-up text-sm">+${formatZl(deposit.accrued)}</span></div>
            <div class="bank-deposit-progress"><span style="width:${(100 * (1 - deposit.weeksLeft / deposit.termWeeks)).toFixed(0)}%"></span></div>
            <button class="btn-secondary text-sm" onclick="breakFundDeposit('${deposit.id}'); renderFundDeposits(); renderBankTicker();">Zerwij</button>
        </div>`).join('') : '<p class="text-muted">Fundusz nie ma lokat. Wybierz bank poniżej.</p>';
}

/** Karty banków: typ, oprocentowanie, lokata funduszu, sprzedaż akcji (bank inwestycyjny). */
function renderCommercialBanksList() {
    renderFundDeposits();
    const list = document.getElementById('commercial-banks-list');
    if (!list) return;
    const banks = commercialBanks.filter(bank => bank.isActive);
    if (!banks.length) { list.innerHTML = '<p class="text-muted">Na rynku nie działa żaden bank komercyjny.</p>'; return; }

    list.innerHTML = banks.map(bank => {
        const loanRate = (getLoanRate() + (Number(bank.baseInterestRateMargin) || 0)) * 100;
        const terms = FUND_DEPOSIT_TERMS.map(term => `<option value="${term.weeks}">${term.label} · ${(getFundDepositRate(bank, term.weeks) * 100).toFixed(2)}%</option>`).join('');
        const deposit = canBankTakeFundDeposits(bank) ? `
            <div class="bank-card-form">
                <select id="deposit-term-${bank.id}" aria-label="Okres lokaty">${terms}</select>
                <input type="text" inputmode="numeric" id="deposit-amount-${bank.id}" value="${Math.max(FUND_DEPOSIT_MIN, Math.floor(playerCash * 0.1))}" aria-label="Kwota lokaty">
                <button onclick="openFundDeposit('${bank.id}', parseFloat(document.getElementById('deposit-amount-${bank.id}').value), parseInt(document.getElementById('deposit-term-${bank.id}').value, 10)); renderCommercialBanksList(); renderBankTicker();">Załóż lokatę</button>
            </div>` : '<p class="text-muted text-sm">Bank nie przyjmuje lokat funduszy.</p>';

        let sales = '';
        if (bank.type === BANK_TYPES.INVESTMENT && bank.stockPortfolio) {
            const offers = Object.entries(bank.stockPortfolio).filter(([, holding]) => holding.shares > 0).map(([symbol, holding]) => {
                const stock = stocks.find(s => s.symbol === symbol);
                return stock ? `<li><span>${escapeHtml(symbol)} · ${holding.shares} szt. · ${formatZl(stock.price * 1.10)}</span>
                    <span class="bank-card-form"><input type="text" inputmode="numeric" id="buy-from-bank-${bank.id}-${symbol}" value="1" aria-label="Liczba akcji">
                    <button onclick="buySharesFromInvestmentBank('${bank.id}', '${symbol}')">Kup</button></span></li>` : '';
            }).join('');
            sales = `<div class="bank-card-sales"><h5>Akcje na sprzedaż (+10% do kursu)</h5>${offers ? `<ul class="list-plain">${offers}</ul>` : '<p class="text-muted text-sm">Brak ofert.</p>'}
                <button class="btn-secondary text-sm" onclick="openSellSharesToBankModal('${bank.id}')">Sprzedaj akcje bankowi</button></div>`;
        }

        return `<article class="bank-card ${getBankTypeClass(bank.type)}">
            <header class="bank-card-head">
                <span class="bank-card-icon" aria-hidden="true">🏦</span>
                <div><h4>${escapeHtml(bank.name)}</h4><span class="bank-card-type">${escapeHtml(bank.type)}</span></div>
            </header>
            <dl class="bank-card-rates">
                <div><dt>Kredyt</dt><dd>${loanRate.toFixed(2)}%</dd></div>
                <div><dt>Lokata 16 tyg.</dt><dd>${canBankTakeFundDeposits(bank) ? (getFundDepositRate(bank, 16) * 100).toFixed(2) + '%' : '—'}</dd></div>
                <div><dt>Kapitał</dt><dd>${formatZl(bank.cash, 0)}</dd></div>
            </dl>
            ${deposit}
            ${sales}
        </article>`;
    }).join('');
}

// =================================================================================
// KLIENCI I RYNEK JU (okno obserwacji — gracz nie handluje)
// =================================================================================

let juView = { filter: 'all', clientId: null };

function openJuMarket() {
    document.getElementById('clients-modal').style.display = 'block';
    renderJuMarket();
}

function setJuClientFilter(filter) {
    juView.filter = filter;
    juView.clientId = null;
    renderJuMarket();
}

function showJuClient(id) {
    juView.clientId = juView.clientId === id ? null : id;
    renderJuMarket();
}

function formatPremium(value) {
    const pct = (value || 0) * 100;
    return `<span class="${pct > 0.05 ? 'text-up' : pct < -0.05 ? 'text-down' : 'text-muted'}">${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%</span>`;
}

function renderJuMarket() {
    const modal = document.getElementById('clients-modal');
    if (!modal || modal.style.display !== 'block' || !playerFund) return;

    const funds = getJuMarketFunds();
    const playerStats = juMarket.stats.player?.history[0];
    const weekFlows = playerStats ? playerStats.inflow : 0;
    const best = funds.find(fund => fund.id === juMarket.bestFundId);

    document.getElementById('ju-ticker').innerHTML = [
        ['Klienci funduszu', playerFund.clients.length],
        ['Wpłaty nowych (tydz.)', formatZl(weekFlows, 0)],
        ['Premia JU funduszu', formatPremium(playerStats?.premium)],
        ['Wolumen JU (tydz.)', (playerStats?.volume || 0).toFixed(1)],
        ['Tydzień rynku', juMarket.week],
        ['Najlepiej sprzedaje się', best ? escapeHtml(best.name) : '—']
    ].map(([label, value]) => `<div class="bank-ticker-item"><span>${label}</span><strong>${value}</strong></div>`).join('');

    // Tabela funduszy rynku wtórnego
    const rows = funds.map(fund => {
        const history = juMarket.stats[fund.id]?.history || [];
        const last = history[0] || {};
        const trend = history.slice(0, 4).reduce((sum, item) => sum + (item.premium || 0), 0) / Math.max(1, Math.min(4, history.length));
        return { fund, last, trend, popularity: getJuPopularity(fund.id, fund.assets) };
    }).sort((a, b) => b.popularity - a.popularity);
    document.getElementById('ju-funds-table').innerHTML = `
        <table class="asset-mini-table ju-table">
            <thead><tr><th>#</th><th>Fundusz</th><th>NAV</th><th>Cena JU vs NAV</th><th>Trend (4 tyg.)</th><th>Wolumen</th><th>Nowi klienci</th><th>Klienci</th></tr></thead>
            <tbody>${rows.map((row, index) => `
                <tr class="${row.fund.kind === 'player' ? 'mine' : ''} ${row.fund.id === juMarket.bestFundId ? 'ju-best' : ''}">
                    <td>${index + 1}</td>
                    <td>${row.fund.kind === 'player' ? '💼' : row.fund.kind === 'bot' ? '🏢' : '🌐'} ${escapeHtml(row.fund.name)}</td>
                    <td>${row.fund.nav.toFixed(2)}</td>
                    <td>${formatPremium(row.last.premium)}</td>
                    <td>${formatPremium(row.trend)}</td>
                    <td>${(row.last.volume || 0).toFixed(1)}</td>
                    <td>${row.last.newClients || 0}</td>
                    <td>${row.last.clients ?? '—'}</td>
                </tr>`).join('')}</tbody>
        </table>`;

    // Taśma transakcji
    document.getElementById('ju-tape').innerHTML = juMarket.tape.length
        ? juMarket.tape.map(item => `<li class="ju-tape-${item.kind}"><span class="text-muted">t.${item.week}</span> ${escapeHtml(item.text)}</li>`).join('')
        : '<li class="text-muted">Rynek ruszy po pierwszym tygodniu gry.</li>';

    // Klienci funduszu gracza z filtrem po charakterze
    const filters = ['all', ...CLIENT_CHARACTER_KEYS, 'institution', 'investor'];
    document.getElementById('ju-client-filters').innerHTML = filters.map(key => {
        const def = CLIENT_TYPES[key];
        const count = key === 'all' ? playerFund.clients.length : playerFund.clients.filter(client => client.type === key).length;
        if (key !== 'all' && !count) return '';
        return `<button class="${juView.filter === key ? 'active' : ''}" onclick="setJuClientFilter('${key}')">${key === 'all' ? 'Wszyscy' : `${def.icon} ${def.label}`} (${count})</button>`;
    }).join('');

    const nav = getFundNav();
    const clients = playerFund.clients
        .filter(client => juView.filter === 'all' || client.type === juView.filter)
        .sort((a, b) => b.units - a.units);
    document.getElementById('ju-clients').innerHTML = clients.map(client => {
        const def = getClientCharacter(client);
        const gain = client.avgCost > 0 ? nav / client.avgCost - 1 : 0;
        const card = juView.clientId === client.id ? `
            <div class="ju-client-card">
                <p class="fst-italic">„${escapeHtml(client.motive || '')}”</p>
                <p>Średni koszt JU: ${client.avgCost.toFixed(2)} zł · zysk na JU: ${formatPremium(gain)}${client.loyal ? ' · 💙 lojalny' : ''}${client.pendingSellUnits > 0 ? ` · wystawił ${client.pendingSellUnits.toFixed(1)} JU na rynku wtórnym` : ''}</p>
                <ul class="list-plain text-sm">${(client.history || []).map(item => `<li><span class="text-muted">t.${item.week}</span> ${escapeHtml(item.text)}</li>`).join('') || '<li class="text-muted">Brak historii.</li>'}</ul>
            </div>` : '';
        return `<div class="ju-client ${juView.clientId === client.id ? 'open' : ''}" onclick="showJuClient(${client.id})">
            <span class="ju-client-icon" title="${escapeHtml(def.label)}">${def.icon}</span>
            <span class="ju-client-name">${escapeHtml(client.name)}<small class="text-muted"> ${escapeHtml(def.label)}</small></span>
            <span class="ju-client-units">${client.units.toFixed(1)} JU · ${formatZl(client.units * nav, 0)}</span>
            <span class="ju-satisfaction" title="Zadowolenie"><span style="width:${(client.satisfaction * 100).toFixed(0)}%"></span></span>
        </div>${card}`;
    }).join('') || '<p class="text-muted">Brak klientów w tej grupie.</p>';
}
