// --- Funkcje związane z wykresem historii cen ---

/**
 * Agreguje szczegółowe świece (np. 15s) w większe interwały (np. 1m).
 * @param {Array} candles - Tablica obiektów świec do przetworzenia.
 * @param {number} interval - Docelowy interwał w milisekundach.
 * @returns {Array} - Nowa tablica z zagregowanymi świecami.
 */
function aggregateCandles(candles, interval) {
    const baseInterval = 15000;
    if (interval < baseInterval * 1.5 || candles.length === 0) {
        return candles;
    }

    const result = [];
    const groupByKey = {};

    for (const candle of candles) {
        const key = Math.floor(candle.time / interval) * interval;
        if (!groupByKey[key]) {
            groupByKey[key] = {
                time: key,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
            };
        } else {
            groupByKey[key].high = Math.max(groupByKey[key].high, candle.high);
            groupByKey[key].low = Math.min(groupByKey[key].low, candle.low);
            groupByKey[key].close = candle.close;
        }
    }

    for (const key in groupByKey) {
        result.push(groupByKey[key]);
    }
    
    return result;
}

/**
 * Przerzedza dane dla wykresu liniowego na podstawie czasu.
 * @param {Array} lineHistory - Pełna historia cen jako obiekty {time, price}.
 * @param {number} interval - Docelowy interwał w milisekundach.
 * @returns {Array} - Nowa, przefiltrowana tablica cen.
 */
function filterLineData(lineHistory, interval) {
    if (interval <= 1000 || lineHistory.length === 0) {
        return lineHistory.map(p => p.price);
    }
    
    const filtered = [];
    let lastTime = 0;

    for (const point of lineHistory) {
        if (point.time >= lastTime + interval) {
            filtered.push(point.price);
            lastTime = point.time;
        }
    }
    
    if (lineHistory.length > 0) {
        const lastPoint = lineHistory[lineHistory.length - 1];
        if (!filtered.includes(lastPoint.price)) {
            filtered.push(lastPoint.price);
        }
    }

    return filtered.length > 1 ? filtered : lineHistory.map(p => p.price);
}

/**
 * Rysuje kolorowy, segmentowy wykres liniowy.
 */
function drawLineChart(data, svg, getX, getY) {
    const svgNs = "http://www.w3.org/2000/svg";
    if (data.length < 2) return;

    const colorProfit = '#28a745';
    const colorLoss = '#dc3545';
    const colorNeutral = '#6c757d';

    for (let i = 1; i < data.length; i++) {
        const prevPrice = data[i - 1];
        const currentPrice = data[i];

        let segmentColor = colorNeutral;
        if (currentPrice > prevPrice) segmentColor = colorProfit;
        else if (currentPrice < prevPrice) segmentColor = colorLoss;

        const x1 = getX(i - 1, data.length);
        const y1 = getY(prevPrice);
        const x2 = getX(i, data.length);
        const y2 = getY(currentPrice);

        if (![x1, y1, x2, y2].some(isNaN)) {
            const line = document.createElementNS(svgNs, "line");
            line.setAttribute("x1", x1.toString());
            line.setAttribute("y1", y1.toString());
            line.setAttribute("x2", x2.toString());
            line.setAttribute("y2", y2.toString());
            line.setAttribute("stroke", segmentColor);
            line.setAttribute("stroke-width", "2");
            svg.appendChild(line);
        }
    }
}

/**
 * Rysuje wykres świecowy.
 */
function drawCandlestickChart(history, svg, chartWidth, getX, getY) {
    const svgNs = "http://www.w3.org/2000/svg";
    if (history.length < 1) return;

    const candleWidth = Math.max(2, (chartWidth / history.length) * 0.7);

    history.forEach((candle, index) => {
        if (!candle) return;
        
        const x = getX(index, history.length);
        const yOpen = getY(candle.open);
        const yClose = getY(candle.close);
        const yHigh = getY(candle.high);
        const yLow = getY(candle.low);
        
        const isBullish = candle.close >= candle.open;
        const color = isBullish ? '#28a745' : '#dc3545';

        const wick = document.createElementNS(svgNs, "line");
        wick.setAttribute("x1", x.toString()); wick.setAttribute("y1", yHigh.toString());
        wick.setAttribute("x2", x.toString()); wick.setAttribute("y2", yLow.toString());
        wick.setAttribute("stroke", color); wick.setAttribute("stroke-width", "1");
        svg.appendChild(wick);
        
        const body = document.createElementNS(svgNs, "rect");
        body.setAttribute("x", (x - candleWidth / 2).toString()); body.setAttribute("y", (isBullish ? yClose : yOpen).toString());
        body.setAttribute("width", candleWidth.toString()); body.setAttribute("height", Math.abs(yOpen - yClose).toString());
        body.setAttribute("fill", color);
        svg.appendChild(body);
    });
}

/**
 * Oblicza optymalny zakres i krok dla osi Y wykresu.
 */
function calculateNiceYAxisRange(minPrice, maxPrice) {
    let rangeMin = minPrice;
    let rangeMax = maxPrice;
    
    const dataRange = rangeMax - rangeMin;
    const avgPrice = (rangeMax + rangeMin) / 2;
    const minVisibleRange = Math.max(avgPrice * 0.2, 2.0);

    if (dataRange < minVisibleRange) {
        const center = (rangeMax + rangeMin) / 2;
        rangeMin = center - (minVisibleRange / 2);
        rangeMax = center + (minVisibleRange / 2);
    }

    const range = rangeMax - rangeMin;
    if (range <= 0) {
        return { min: Math.floor(minPrice) - 1, max: Math.ceil(maxPrice) + 1, step: 1 };
    }
    const targetTickCount = 4;
    const roughStep = range / (targetTickCount - 1);
    const exponent = Math.floor(Math.log10(roughStep));
    const powerOf10 = Math.pow(10, exponent);
    const magnitude = roughStep / powerOf10;
    let niceMagnitude;
    if (magnitude < 1.5) niceMagnitude = 1;
    else if (magnitude < 3) niceMagnitude = 2;
    else if (magnitude < 7) niceMagnitude = 5;
    else niceMagnitude = 10;
    const niceStep = niceMagnitude * powerOf10;
    const niceMin = Math.floor(rangeMin / niceStep) * niceStep;
    const niceMax = Math.ceil(rangeMax / niceStep) * niceStep;
    const finalStep = niceStep > 0 ? niceStep : 1;
    
    return { min: niceMin, max: (niceMax > niceMin ? niceMax : niceMin + finalStep), step: finalStep };
}

/**
 * Główna funkcja renderująca wykres, która decyduje, jaki typ wykresu narysować.
 */
function renderChartSVGForStock(stock, svgAreaElement, width, height) {
    svgAreaElement.innerHTML = '';
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.style.display = "block";

    const padding = { top: 10, bottom: 20, left: 45, right: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    let dataToDraw, minPrice, maxPrice, historyForMapping;

    if (playerChartSettings.type === 'candlestick') {
        const fullHistory = (stock.candlestickHistory || []).concat(stock.currentCandle || []);
        dataToDraw = aggregateCandles(fullHistory, playerChartSettings.candleInterval);
        historyForMapping = dataToDraw; // Do mapowania transakcji użyjemy zagregowanych danych
        if (dataToDraw.length === 0) {
            svgAreaElement.innerHTML = `<p style="text-align: center; padding-top: 60px;">Brak danych do narysowania wykresu.</p>`;
            return;
        }
        minPrice = Math.min(...dataToDraw.map(c => c.low));
        maxPrice = Math.max(...dataToDraw.map(c => c.high));
    } else { // 'line'
        historyForMapping = stock.lineHistory || []; // Do mapowania transakcji użyjemy pełnej, surowej historii
        dataToDraw = filterLineData(historyForMapping, playerChartSettings.lineInterval);
        if (dataToDraw.length === 0) {
            svgAreaElement.innerHTML = `<p style="text-align: center; padding-top: 60px;">Brak danych do narysowania wykresu.</p>`;
            return;
        }
        minPrice = Math.min(...dataToDraw);
        maxPrice = Math.max(...dataToDraw);
    }

    const yAxis = calculateNiceYAxisRange(minPrice, maxPrice);
    const getX = (index, historyLength) => padding.left + (index / Math.max(1, historyLength - 1)) * (chartWidth - 20) + 10;
    const getY = (price) => padding.top + chartHeight - ((price - yAxis.min) / Math.max(0.1, yAxis.max - yAxis.min)) * chartHeight;

    // Rysowanie siatki i osi Y
    if (yAxis.step > 0) {
        for (let priceVal = yAxis.min; priceVal <= yAxis.max; priceVal += yAxis.step) {
            if (isNaN(priceVal)) continue;
            const y = getY(priceVal);
            const gridLine = document.createElementNS(svgNs, "line");
            gridLine.setAttribute("x1", padding.left.toString());
            gridLine.setAttribute("y1", y.toString());
            gridLine.setAttribute("x2", (padding.left + chartWidth).toString());
            gridLine.setAttribute("y2", y.toString());
            gridLine.setAttribute("stroke", "#e0e0e0");
            gridLine.setAttribute("stroke-dasharray", "2,2");
            svg.appendChild(gridLine);
            const textLabel = document.createElementNS(svgNs, "text");
            textLabel.setAttribute("x", (padding.left - 8).toString());
            textLabel.setAttribute("y", (y + 4).toString());
            textLabel.setAttribute("font-size", "10");
            textLabel.setAttribute("text-anchor", "end");
            textLabel.textContent = priceVal.toFixed(2);
            svg.appendChild(textLabel);
        }
    }
    
    // Wywołaj odpowiednią funkcję rysującą
    if (playerChartSettings.type === 'candlestick') {
        drawCandlestickChart(dataToDraw, svg, chartWidth, getX, getY);
    } else {
        drawLineChart(dataToDraw, svg, getX, getY);
    }
    
    // --- SEKCJA RYSOWANIA ZNACZNIKÓW TRANSAKCJI (z niestandardowym dymkiem) ---
    const tooltip = document.getElementById('chart-tooltip');

    (stock.playerTransactions || []).forEach(tx => {
        if (tx.type === 'buy') {
            let closestPointIndex = -1;
            let minTimeDiff = Infinity;

            historyForMapping.forEach((point, index) => {
                const timeDiff = Math.abs((point.time || 0) - tx.time);
                if (timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    closestPointIndex = index;
                }
            });

            if (closestPointIndex !== -1) {
                const x = getX(closestPointIndex, historyForMapping.length);
                const y = getY(tx.price);

                const marker = document.createElementNS(svgNs, "circle");
                marker.setAttribute("cx", x.toString());
                marker.setAttribute("cy", y.toString());
                marker.setAttribute("r", "5");
                marker.setAttribute("fill", "rgba(0, 123, 255, 0.7)");
                marker.setAttribute("stroke", "white");
                marker.setAttribute("stroke-width", "1.5");
                marker.style.cursor = "pointer";
                svg.appendChild(marker);

                marker.addEventListener('mouseover', (event) => {
                    tooltip.innerHTML = `Kupiono: ${tx.quantity} szt. po ${tx.price.toFixed(2)} PLN`;
                    tooltip.style.display = 'block';
                    tooltip.style.left = `${event.pageX + 15}px`;
                    tooltip.style.top = `${event.pageY + 15}px`;
                });

                marker.addEventListener('mousemove', (event) => {
                    tooltip.style.left = `${event.pageX + 15}px`;
                    tooltip.style.top = `${event.pageY + 15}px`;
                });

                marker.addEventListener('mouseout', () => {
                    tooltip.style.display = 'none';
                });
            }
        }
    });
    // --- KONIEC SEKCJI ---
    if (stock.priceAlerts) {
        // Linia alertu zakupu (zielona)
        if (stock.priceAlerts.buy !== null) {
            const y = getY(stock.priceAlerts.buy);
            const line = document.createElementNS(svgNs, "line");
            line.setAttribute("x1", padding.left.toString());
            line.setAttribute("y1", y.toString());
            line.setAttribute("x2", (padding.left + chartWidth).toString());
            line.setAttribute("y2", y.toString());
            line.setAttribute("stroke", "#28a745");
            line.setAttribute("stroke-width", "1.5");
            line.setAttribute("stroke-dasharray", "4,4");
            svg.appendChild(line);
        }
        // Linia alertu sprzedaży (czerwona)
        if (stock.priceAlerts.sell !== null) {
            const y = getY(stock.priceAlerts.sell);
            const line = document.createElementNS(svgNs, "line");
            line.setAttribute("x1", padding.left.toString());
            line.setAttribute("y1", y.toString());
            line.setAttribute("x2", (padding.left + chartWidth).toString());
            line.setAttribute("y2", y.toString());
            line.setAttribute("stroke", "#dc3545");
            line.setAttribute("stroke-width", "1.5");
            line.setAttribute("stroke-dasharray", "4,4");
            svg.appendChild(line);
        }
    }
    
    svgAreaElement.appendChild(svg);
}

// --- Pozostałe funkcje pliku ---

function showPriceHistoryModal(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) {
        alert(`Nie znaleziono akcji o symbolu ${symbol}.`);
        return;
    }
    currentlyDisplayedChartSymbol = symbol;
    const modal = document.getElementById('price-chart-modal');
    const chartTitle = document.getElementById('chart-title');
    const svgArea = document.getElementById('chart-svg-area');
    const candlestickBtn = document.getElementById('chart-type-candlestick-btn');
    const lineBtn = document.getElementById('chart-type-line-btn');
    const lineIntervalSelect = document.getElementById('line-chart-interval-select');
    const candleIntervalSelect = document.getElementById('candle-chart-interval-select');
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
    lineIntervalSelect.value = playerChartSettings.lineInterval;
    candleIntervalSelect.value = playerChartSettings.candleInterval;
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
    modal.style.display = 'block';
    updateControlsVisibility();
    redrawChart();
}

function updateChartTypeButtons() {
    const candlestickBtn = document.getElementById('chart-type-candlestick-btn');
    const lineBtn = document.getElementById('chart-type-line-btn');
    if (!candlestickBtn || !lineBtn) return;
    candlestickBtn.style.backgroundColor = 'transparent';
    lineBtn.style.backgroundColor = 'transparent';
    candlestickBtn.style.border = '2px solid transparent';
    lineBtn.style.border = '2px solid transparent';
    if (playerChartSettings.type === 'candlestick') {
        candlestickBtn.style.backgroundColor = '#e0e0e0';
        candlestickBtn.style.border = '2px solid #007bff';
    } else {
        lineBtn.style.backgroundColor = '#e0e0e0';
        lineBtn.style.border = '2px solid #007bff';
    }
}

function closePriceChartModal() {
    const modal = document.getElementById('price-chart-modal');
    if (modal) modal.style.display = 'none';
    currentlyDisplayedChartSymbol = null;
}

function renderOwnershipPieChart(symbol) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    const container = document.getElementById('pie-chart-container');
    const legend = document.getElementById('pie-chart-legend');
    container.innerHTML = '';
    legend.innerHTML = '';

    // 1. Zbieranie danych o akcjonariuszach
    const owners = [];
    const playerShares = playerPortfolio[symbol] ? playerPortfolio[symbol].shares : 0;
    if (playerShares > 0) {
        owners.push({ name: 'Ty (Gracz)', shares: playerShares, color: '#007bff' });
    }

    let aiColorIndex = 0;
    const aiColors = ['#dc3545', '#ffc107', '#28a745', '#6f42c1', '#fd7e14', '#20c997'];
    aiCompetitors.forEach((ai) => {
        if (ai.portfolio[symbol] && ai.portfolio[symbol].shares > 0) {
            owners.push({
                name: ai.name,
                shares: ai.portfolio[symbol].shares,
                color: aiColors[aiColorIndex % aiColors.length]
            });
            aiColorIndex++;
        }
    });

    let investmentBankColorIndex = 0;
    const investmentBankColors = ['#8E44AD', '#16A085', '#E67E22', '#2980B9', '#C0392B']; // Kolory dla banków

    commercialBanks.forEach(bank => {
        // Sprawdź tylko aktywne banki inwestycyjne
        if (bank.isActive && bank.type === BANK_TYPES.INVESTMENT && bank.stockPortfolio[symbol]) {
            const holding = bank.stockPortfolio[symbol];
            if (holding.shares > 0) {
                owners.push({
                    name: `🏦 ${bank.name}`, // Oznacz ikonką
                    shares: holding.shares,
                    color: investmentBankColors[investmentBankColorIndex % investmentBankColors.length]
                });
                investmentBankColorIndex++;
            }
        }
    });

    const holdingCompanies = stocks.filter(s => s.assetType === 'Holding');
    let holdingColorIndex = 0;
    const holdingColors = ['#8E44AD', '#16A085', '#E67E22', '#2980B9', '#C0392B']; // Nowa paleta kolorów dla funduszy

    holdingCompanies.forEach(holding => {
        const holdingData = holding.holdingPortfolio[symbol]; // Pobieramy cały obiekt
        if (holdingData && holdingData.quantity > 0) { // Sprawdzamy .quantity
            owners.push({
                name: `💼 ${holding.name}`,
                shares: holdingData.quantity, // Używamy .quantity
                color: holdingColors[holdingColorIndex % holdingColors.length]
            });
            holdingColorIndex++;
        }
    });

    const stateShares = Math.floor(stock.totalShares * (stock.stateOwnershipPct || 0));
    if (stateShares > 0 && !stock.isStateOwned) {
        owners.push({ name: '🏛️ Skarb Państwa', shares: stateShares, color: '#663399' });
    }
    
    // --- POCZĄTEK NOWEJ LOGIKI - DODANIE AKCJI WŁASNYCH ---
    const treasuryShares = stock.treasuryShares || 0;
    if (treasuryShares > 0) {
        owners.push({ name: 'Dyrektor (Akcje Własne)', shares: treasuryShares, color: '#ff5733' }); // Pomarańczowy kolor dla wyróżnienia
    }
    // --- KONIEC NOWEJ LOGIKI ---

    // 2. Obliczanie "wolnego obrotu"
    const ownedShares = owners.reduce((sum, owner) => sum + owner.shares, 0);
    
    const totalTradableShares = stock.isStateOwned 
        ? Math.floor(stock.totalShares * (1 - stock.stateOwnershipPct)) 
        : stock.totalShares;
        
    const freeFloatShares = totalTradableShares - ownedShares;
    if (freeFloatShares > 0) {
        owners.push({ name: 'Wolny obrót', shares: freeFloatShares, color: '#6c757d' });
    }
    
    owners.sort((a, b) => b.shares - a.shares);

    // 3. Rysowanie wykresu SVG (bez zmian)
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 32 32");
    container.appendChild(svg);
    
    const radius = 15.9;
    const circumference = 2 * Math.PI * radius;
    let cumulativeAngle = 0;

    owners.forEach(owner => {
        const percentage = owner.shares / totalTradableShares;
        if (percentage <= 0) return;

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("r", radius);
        circle.setAttribute("cx", "16");
        circle.setAttribute("cy", "16");
        circle.setAttribute("fill", "transparent");
        circle.setAttribute("stroke", owner.color);
        circle.setAttribute("stroke-width", "32");
        circle.setAttribute("stroke-dasharray", `${percentage * circumference} ${circumference}`);
        circle.setAttribute("transform", `rotate(${cumulativeAngle - 90}, 16, 16)`);
        svg.appendChild(circle);
        
        cumulativeAngle += percentage * 360;

        // 4. Tworzenie legendy (bez zmian)
        const legendItem = document.createElement('div');
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.justifyContent = 'center';
        legendItem.style.marginBottom = '5px';
        
        const colorBox = document.createElement('span');
        colorBox.className = 'pie-legend-color-box';
        colorBox.style.width = '12px';
        colorBox.style.height = '12px';
        colorBox.style.backgroundColor = owner.color;
        colorBox.style.marginRight = '8px';
        colorBox.style.border = '1px solid #333';

        const ownerLabel = document.createElement('span');
        const ownerPercentTotal = (owner.shares / stock.totalShares * 100).toFixed(2);
        ownerLabel.textContent = `${owner.name}: ${owner.shares.toLocaleString('pl-PL')} szt. (${ownerPercentTotal}%)`;
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(ownerLabel);
        legend.appendChild(legendItem);
    });

    // Informacja o udziałach państwa (bez zmian)
    if (stock.isStateOwned && stateShares > 0) {
        const statePercent = (stock.stateOwnershipPct * 100).toFixed(2);
        const legendItem = document.createElement('div');
        legendItem.innerHTML = `<hr><p style="font-weight: bold; margin-bottom: 5px; text-align: center;">🏛️ Skarb Państwa kontroluje ${statePercent}% akcji (poza wolnym obrotem)</p>`;
        legend.appendChild(legendItem);
    }
}