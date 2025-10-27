const aiCompetitors = [
    {
        id: 'ai1',
        name: 'Adam "Ryzyko" Kowalski',
        cash: 10000,
        portfolio: {},
        personality: 'reckless',
        accessLevel: 1,
        hasTBillAccess: false, 
        tBills: [],
        skillPoints: 0,         
        unlockedSkills: {},      
        creditScore: 100 
    },
    {
        id: 'ai2',
        name: 'Beata "Stoik" Nowak',
        cash: 9000,
        portfolio: {},
        personality: 'calm',
        accessLevel: 0,
        hasTBillAccess: false, 
        tBills: [],
        skillPoints: 0,         
        unlockedSkills: {},      
        creditScore: 100
    },
    {
        id: 'ai3',
        name: 'Cezary "Wieloryb" Wiśniewski',
        cash: 30000,
        portfolio: {},
        personality: 'whale',
        accessLevel: 2,
        hasTBillAccess: true, 
        tBills: [],
        skillPoints: 0,         
        unlockedSkills: {},      
        creditScore: 100
    },
    // --- NOWE BOTY ---
    {
        id: 'ai4',
        name: 'Jordan "Wilk" Belfort',
        cash: 10500,
        portfolio: {},
        personality: 'pro_investor', 
        accessLevel: 1,
        hasTBillAccess: false, 
        tBills: [],
        skillPoints: 0,         
        unlockedSkills: {},      
        creditScore: 100 
    },
    {
        id: 'ai5',
        name: 'Darek "Yolo" Nowobogacki',
        cash: 8500,
        portfolio: {},
        personality: 'yolo_trader', // Nowa osobowość: Początkujący/Hazardzista
        accessLevel: 0,
        hasTBillAccess: false, 
        tBills: [],
        skillPoints: 0,         
        unlockedSkills: {},      
        creditScore: 100
    },
	{
        id: 'ai6',
        name: 'Inwestorzy Mniejszościowi',
        cash: 50000, // Dajemy mu dużo gotówki, żeby mógł handlować
        portfolio: {},
        personality: 'market_maker', // Nowa, unikalna osobowość
        accessLevel: 4, // Dostęp do wszystkich rynków
        marketMakerBoost: {
            isActive: false,
            expiryTime: 0,
            cashBonus: 0
        }
    },
    {
        id: 'ai7',
    name: "Marian 'Dywidendusz' Marciniak",
    personality: 'dividend_chaser',
    cash: 10000,
    portfolio: {},
    risk_aversion: 0.3,
    decision_speed: 7000,
        hasTBillAccess: false, 
        tBills: [],
        skillPoints: 0,         
        unlockedSkills: {},      
        creditScore: 100,
    accessLevel: 2, // Zaczyna z dostępem do Srebrnej Giełdy
    memory: {} // Pamięć na ceny zakupu
},
{ // ---> NOWY BOT: Bankier <---
        id: 'ai8',
        name: 'Grzegorz "Bankier" Kacperczyk', // Przykładowe imię
        cash: 9000,
        portfolio: {},
        personality: 'banker', // Nowa osobowość
        accessLevel: 1, // Zaczyna z dostępem do Brązowej Giełdy
        hasTBillAccess: false, // Na start nie ma dostępu do bonów
        tBills: [],
        loans: [], // Tablica na zaciągnięte pożyczki (komercyjne/hipoteczne)
        deposits: [], // Tablica na złożone depozyty (opcjonalnie, jeśli chcemy śledzić)
        initialDeposit: 500, // Kwota startowego depozytu
        creditScore: 100, // Zaczyna z dobrą zdolnością
        skillPoints: 0,
        unlockedSkills: {},
        // Można dodać preferencje np. do ryzyka
        riskAversionFactor: 0.2 // (0=bardzo ryzykowny, 1=bardzo ostrożny)
    }


];
/**
 * Funkcja pomocnicza do kupowania akcji przez AI.
 * @param {object} ai - Obiekt bota, który kupuje.
 * @param {string} symbol - Symbol kupowanej akcji.
 * @param {number} quantity - Liczba kupowanych akcji.
 */
 
function aiTakeLoan(ai, amount) {
    // 1. Wybierz najlepszy bank
    const bestBank = aiChooseCommercialBank('loan', ai);
    if (!bestBank) {
        console.log(`[AI Kredyt] ${ai.name} nie znalazł banku do wzięcia kredytu.`);
        return false;
    }
    if (isNaN(amount) || amount <= 0) return false; // Podstawowa walidacja
    
    const creditScoreThreshold = 50; // Próg poniżej którego blokujemy
    if (ai.creditScore < creditScoreThreshold) {
        console.log(`[AI Kredyt] ${ai.name} ma zbyt niski wynik kredytowy (${ai.creditScore}), aby wziąć nowy kredyt.`);
        return false; // Zablokuj wzięcie pożyczki
    }
    // 2. Sprawdź limit kredytowy AI (analogicznie do gracza)
    const netWorth = calculateNetWorth(ai);
    const existingLoansTotal = (ai.loans || []).reduce((sum, loan) => sum + loan.amount, 0);
    const maxLoanPossible = netWorth * 0.3 - existingLoansTotal;

    if (amount > maxLoanPossible) {
        console.log(`[AI Kredyt] ${ai.name} chciał pożyczyć ${amount.toFixed(0)}, ale limit to ${Math.max(0, maxLoanPossible).toFixed(0)}.`);
        return false;
    }
    // Sprawdź limit banku
    if (amount > bestBank.cash * 0.2) {
        console.log(`[AI Kredyt] Bank ${bestBank.name} nie mógł udzielić kredytu ${amount.toFixed(0)} dla ${ai.name} (limit banku).`);
        return false;
    }

    // 3. Oblicz parametry kredytu
    const interestRate = bestBank.interestRateLoan;
    const loanDurationWeeks = 26; // Stały okres dla AI
    const maturityDate = Date.now() + (loanDurationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    const weeklyRate = interestRate / 52;
    const weeklyPayment = amount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);

    // 4. Przeprowadź transakcję
    ai.cash += amount; // AI otrzymuje gotówkę
    bestBank.cash -= amount; // Bank wypłaca
    // Dodaj kredyt do portfela banku
    if (!bestBank.loanPortfolio[ai.id]) bestBank.loanPortfolio[ai.id] = [];
    bestBank.loanPortfolio[ai.id].push({
        id: `loan_ai_${Date.now()}`,
        initialAmount: amount,
        remainingAmount: amount,
        interestRate: interestRate
    });

    // 5. Zapisz kredyt u AI
    if (!ai.loans) ai.loans = [];
    ai.loans.push({
        id: `loan_ai_${Date.now()}`,
        bankId: bestBank.id,
        bankName: bestBank.name,
        initialAmount: amount,
        amount: amount,
        interestRate: interestRate,
        weeklyPayment: weeklyPayment,
        maturityDate: maturityDate,
        collateral: null // Zwykły kredyt, bez hipoteki
    });

    console.log(`[AI Kredyt] ${ai.name} wziął ${amount.toFixed(0)} PLN kredytu w ${bestBank.name}. Rata: ${weeklyPayment.toFixed(2)} PLN/tydz.`);
    return true; // Sukces
}


function aiBuyStock(ai, symbol, quantity) {
    const stockToBuy = stocks.find(s => s.symbol === symbol);
    // Sprawdź, czy akcja istnieje i czy handel nie jest zablokowany
    if (!stockToBuy || stockToBuy.isTradeLocked) return;
    // Sprawdź, czy ilość jest poprawna
    if (isNaN(quantity) || quantity <= 0) return;

    // Sprawdź limit 30% udziałów między bankami
    const buyerIsBank = commercialBanks.some(b => b.id === ai.id && b.isActive); // Sprawdź, czy AI to aktywny bank
    // Sprawdź, czy cel zakupu to akcja innego banku komercyjnego
    if (buyerIsBank && stockToBuy.isBankStock === true && ai.id !== stockToBuy.bankData.id) { // Bank nie kupuje sam siebie
        const bankBuyer = commercialBanks.find(b => b.id === ai.id);
        const currentHolding = bankBuyer.stockPortfolio[symbol]?.shares || 0; // Obecne udziały banku-kupującego w banku-celu
        const potentialHolding = currentHolding + quantity; // Potencjalne udziały po zakupie

        // Sprawdź, czy potencjalny udział przekroczyłby 30%
        if ((potentialHolding / stockToBuy.totalShares) > 0.30) {
            console.log(`[AI Bank Limiter] ${ai.name} próbował przekroczyć 30% udziałów w banku ${symbol}. Zakup zablokowany.`);
            return; // Zablokuj transakcję
        }
    }

    // Obliczanie dostępnych akcji na rynku
    let sharesOnMarket;
    if (stockToBuy.isStateOwned) {
        // Dla spółek państwowych dostępne są tylko akcje niebędące w posiadaniu państwa
        sharesOnMarket = Math.floor(stockToBuy.totalShares * (1 - stockToBuy.stateOwnershipPct));
    } else {
        sharesOnMarket = stockToBuy.totalShares;
    }
    // Dostępne = Całkowita pula (lub public float) - już posiadane przez kogokolwiek (gracz + AI + inne banki)
    const availableShares = sharesOnMarket - stockToBuy.sharesHeld;

    // Dostosuj ilość, jeśli na rynku jest mniej akcji
    if (quantity > availableShares) {
        quantity = availableShares;
    }
    // Jeśli po dostosowaniu ilość jest <= 0, zakończ
    if (quantity <= 0) return;

    // Oblicz koszt transakcji
    const totalCost = stockToBuy.price * quantity;
    // Sprawdź, czy AI ma wystarczająco gotówki
    if (ai.cash < totalCost) return;

    // Przeprowadź transakcję
    ai.cash -= totalCost; // Odejmij gotówkę AI
    stockToBuy.sharesHeld += quantity; // Zwiększ liczbę akcji posiadanych przez graczy/AI
    // Symuluj niewielki wpływ na cenę (płynność rynku)
    stockToBuy.price += (quantity * stockToBuy.price) * 0.000005;

    // Zaktualizuj portfel AI
    if (ai.portfolio[symbol]) {
        // Jeśli AI już ma akcje tej spółki, uśrednij cenę zakupu
        const existingHolding = ai.portfolio[symbol];
        const oldTotalValue = existingHolding.avgPrice * existingHolding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        existingHolding.shares += quantity;
        existingHolding.avgPrice = newTotalValue / existingHolding.shares;
    } else {
        // Jeśli to pierwszy zakup, stwórz nowy wpis w portfelu
        ai.portfolio[symbol] = { shares: quantity, avgPrice: stockToBuy.price };
    }
    console.log(`[AI] ${ai.name} kupił ${quantity} szt. ${symbol}`);
}

function aiSellStock(ai, symbol, quantity) {
    const holding = ai.portfolio[symbol];

    // Sprawdź, czy AI ma tę pozycję i czy ilość jest poprawna
    if (!holding || holding.shares < quantity || quantity <= 0) return;

    // Zabezpieczenie przed sprzedażą startupu
    if (holding.assetType === 'Startup') {
        console.warn(`[AI ZABEZPIECZENIE] ${ai.name} próbował sprzedać udziały w start-upie ${symbol}. Operacja zablokowana.`);
        return;
    }

    const stockToSell = stocks.find(s => s.symbol === symbol);
    // Sprawdź, czy akcja istnieje ORAZ czy handel nie jest zablokowany
    if (!stockToSell || stockToSell.isTradeLocked) {
        // Jeśli handel zablokowany, po prostu zakończ funkcję
        if (stockToSell && stockToSell.isTradeLocked) {
            // Można dodać log, jeśli chcesz wiedzieć, kiedy AI próbowało sprzedać zablokowane akcje
            // console.log(`[AI] ${ai.name} - Próba sprzedaży zablokowanych akcji ${symbol} nie powiodła się.`);
        }
        return;
    }


    const sellPrice = stockToSell.price;
    const avgBuyPrice = holding.avgPrice;
    const profit = (sellPrice - avgBuyPrice) * quantity; // Zysk brutto

    let taxToPay = 0;

    // ---> TUTAJ ZACZYNA SIĘ BRAKUJĄCY BLOK PODATKOWY <---
    if (profit > 0) {
        let taxRateCapitalGains = TAX_RATES.capitalGains;
        let aiTaxModifier = 1.0;
        // Sprawdź umiejętność San Escobar AI
        const aiSanEscobarLvl = ai.unlockedSkills ? (ai.unlockedSkills['sanEscobar'] || 0) : 0;
        if (aiSanEscobarLvl >= 1) aiTaxModifier = 0.95; // Lvl 1: 5% zniżki
        if (aiSanEscobarLvl >= 4) aiTaxModifier = 0.0; // Lvl 4: Brak podatku

        taxToPay = profit * taxRateCapitalGains * aiTaxModifier; // Oblicz podatek
        governmentTreasury += taxToPay; // Dodaj podatek do budżetu państwa
    }
    // ---> TUTAJ KOŃCZY SIĘ BRAKUJĄCY BLOK PODATKOWY <---

    // Przyznawanie punktów umiejętności (bez zmian, liczymy od zysku brutto)
    if (profit > 0 && ai.skillPoints !== undefined) {
        const skillPointsGained = profit / 1000;
        ai.skillPoints = (ai.skillPoints || 0) + skillPointsGained;
        console.log(`[AI Skills] ${ai.name} zyskał ${skillPointsGained.toFixed(2)} pkt umiejętności za sprzedaż ${symbol}. Total: ${ai.skillPoints.toFixed(2)}`);
    }

    // Transakcja sprzedaży
    const totalGainGross = sellPrice * quantity; // Przychód brutto
    const totalGainNet = totalGainGross - taxToPay; // Przychód netto po podatku

    ai.cash += totalGainNet; // AI otrzymuje kwotę netto
    holding.shares -= quantity;
    stockToSell.sharesHeld -= quantity; // Zaktualizuj liczbę akcji w obiegu rynkowym
    // Symuluj niewielki wpływ na cenę
    stockToSell.price -= (quantity * stockToSell.price) * 0.000005;

    // Logowanie z informacją o podatku
    console.log(`[AI] ${ai.name} sprzedał ${quantity} szt. ${symbol}. Zysk brutto: ${profit.toFixed(2)}, Podatek: ${taxToPay.toFixed(2)}.`);

    // Usuń pozycję z portfela, jeśli sprzedano wszystko
    if (holding.shares <= 0.001) { // Użyj małego progu dla bezpieczeństwa
        delete ai.portfolio[symbol];
        // Jeśli AI używa pamięci (jak Marian), usuń wpis
        if (ai.memory && ai.memory[symbol]) {
            delete ai.memory[symbol];
        }
    }
}

function runAiMarian(ai) {
    // --- ETAP 1: SPRZEDAŻ (obsługuje obie strategie w zależności od zapisu w pamięci) ---
    for (const symbol in ai.portfolio) {
        const memory = ai.memory[symbol];
        if (!memory || !memory.strategy) continue;

        const stock = stocks.find(s => s.symbol === symbol);
        if (!stock) continue;

        // Jeśli akcja była kupiona DLA DYWIDENDY, sprzedaj ją po wypłacie
        if (memory.strategy === 'dividend') {
            if (stock.dividendTimer > 100000) { // Timer zresetowany = dywidenda wypłacona
                console.log(`[AI Marian] Sprzedaję ${symbol} po otrzymaniu dywidendy.`);
                aiSellStock(ai, symbol, ai.portfolio[symbol].shares);
                delete ai.memory[symbol];
                return;
            }
        } 
        // Jeśli akcja była kupiona DLA ZYSKU, sprzedaj po osiągnięciu celu +10%
        else if (memory.strategy === 'profit') {
            if (stock.price > memory.purchasePrice * 1.10) {
                console.log(`[AI Marian] Sprzedaję ${symbol} z 10% zyskiem (strategia poboczna).`);
                aiSellStock(ai, symbol, ai.portfolio[symbol].shares);
                delete ai.memory[symbol];
                return;
            }
        }
    }

    // --- ETAP 2: ZAKUP (z losowaniem strategii 80/20) ---
    if (Object.keys(ai.portfolio).length >= 5) return; // Ograniczenie do 5 spółek

    if (Math.random() < 0.80) {
        // --- 80% SZANS: Główna strategia dywidendowa ---
        const dividendStocks = stocks.filter(s => {
            if (s.assetType === 'Startup') return false;
            const exchange = exchanges[s.exchange];
            if (!exchange) return false;
            const hasAccess = exchange.level <= ai.accessLevel;
            const isDividendStock = s.dividendPolicy && s.dividendPolicy !== 'None' && s.dividendPolicy !== 'Growth';
            const isReit = s.assetType === 'REIT';
            return hasAccess && (isDividendStock || isReit);
        });
        
        if (dividendStocks.length > 0) {
            dividendStocks.sort((a, b) => a.dividendTimer - b.dividendTimer);
            const targetStock = dividendStocks[0];

            if (targetStock && targetStock.dividendTimer < 100000 && !ai.portfolio[targetStock.symbol]) {
                const investmentAmount = ai.cash * 0.25;
                const quantity = Math.floor(investmentAmount / targetStock.price);
                if (quantity > 0) {
                    aiBuyStock(ai, targetStock.symbol, quantity);
                    ai.memory[targetStock.symbol] = { strategy: 'dividend' }; // Zapisz, z jaką strategią kupił
                }
            }
        }
    } else {
        // --- 20% SZANS: Poboczna strategia zysku ---
        const profitStocks = stocks.filter(s => {
            if (s.assetType === 'Startup') return false;
            const exchange = exchanges[s.exchange];
            if (!exchange) return false;
            const hasAccess = exchange.level <= ai.accessLevel;
            const isGoodHealth = s.financialHealth >= 1;
            const isDividendStock = (s.dividendPolicy && s.dividendPolicy !== 'None' && s.dividendPolicy !== 'Growth') || s.assetType === 'REIT';
            return hasAccess && isGoodHealth && !isDividendStock; // Szukamy zdrowych firm, które NIE są celem jego głównej strategii
        });

        if (profitStocks.length > 0) {
            const targetStock = getRandomElement(profitStocks);
            if (targetStock && !ai.portfolio[targetStock.symbol]) {
                const investmentAmount = ai.cash * 0.20; // Inwestuje mniejszą część kapitału
                const quantity = Math.floor(investmentAmount / targetStock.price);
                if (quantity > 0) {
                    aiBuyStock(ai, targetStock.symbol, quantity);
                    ai.memory[targetStock.symbol] = { strategy: 'profit', purchasePrice: targetStock.price }; // Zapisz strategię i cenę zakupu
                }
            }
        }
    }
}

/**
 * Logika decyzyjna dla pojedynczego bota AI.
 */
function makeAiDecision(ai) {
    // Podstawowe sprawdzenia i dostępne akcje
    const accessibleStocks = stocks.filter(s => {
        // AI nie handluje startupami, REITami, Instytutami
        if (s.assetType || s.isBankrupt) return false;
        const exchange = exchanges[s.exchange];
        // Sprawdź dostęp do giełdy i czy spółka nie jest zablokowana
        return exchange && exchange.level <= ai.accessLevel && !s.isTradeLocked;
    });
    // Bankier może działać (np. zarządzać depozytami/kredytami) nawet bez dostępnych akcji
    if (accessibleStocks.length === 0 && ai.personality !== 'banker') return;

    const portfolioSize = Object.keys(ai.portfolio).length;
    const aiNetWorth = calculateNetWorth(ai); // Oblicz raz na turę
    const cashRatio = ai.cash / aiNetWorth; // Stosunek gotówki do wartości netto

    // Znajdź aktywne banki inwestycyjne do potencjalnych zakupów
    const activeInvestmentBanks = commercialBanks.filter(b => b.isActive && b.type === BANK_TYPES.INVESTMENT);

    // Główna logika inwestycyjna zależna od osobowości
    switch (ai.personality) {
        case 'reckless':
        case 'yolo_trader':
            if (Math.random() < 0.5) { // Szansa na akcję giełdową
                // Próba zakupu ryzykownych akcji lub wzięcia pożyczki
                if (Math.random() < 0.7 || portfolioSize === 0) {
                    const stockToBuy = getRandomElement(accessibleStocks.filter(s => s.volatilityFactor > 1.5 && s.financialHealth >= -1));
                    if (stockToBuy) {
                        const desiredInvestment = ai.cash * getRandomInRange(0.4, 0.8);
                        const desiredQuantity = Math.floor(desiredInvestment / stockToBuy.price);
                        const affordableQuantity = Math.floor(ai.cash / stockToBuy.price);

                        if (desiredQuantity > 0) {
                            if (affordableQuantity >= desiredQuantity) {
                                aiBuyStock(ai, stockToBuy.symbol, desiredQuantity);
                            } else if (affordableQuantity < desiredQuantity && affordableQuantity > 0 && Math.random() < (ai.personality === 'reckless' ? 0.4 : 0.6)) {
                                const neededCash = (desiredQuantity - affordableQuantity) * stockToBuy.price;
                                const mortgageBank = commercialBanks.find(b => b.isActive && b.type === BANK_TYPES.MORTGAGE);
                                let collateralStock = null, availableCollateralQty = 0;
                                for (const sym in ai.portfolio) {
                                     const h = ai.portfolio[sym];
                                     const s = stocks.find(st => st.symbol === sym && !st.assetType);
                                     const available = h.shares - (h.lockedShares || 0);
                                     if (s && available > 0) { collateralStock = s; availableCollateralQty = available; break; }
                                }
                                if (mortgageBank && collateralStock && neededCash > (ai.personality === 'reckless' ? 100 : 50)) {
                                    const requiredCollateralValue = neededCash * 2;
                                    const requiredCollateralQty = Math.ceil(requiredCollateralValue / collateralStock.price);
                                    if (availableCollateralQty >= requiredCollateralQty) {
                                        if (aiTakeMortgageLoan(ai, mortgageBank.id, collateralStock.symbol, requiredCollateralQty, neededCash)) {
                                            const nowAffordable = Math.floor(ai.cash / stockToBuy.price);
                                            if (nowAffordable >= desiredQuantity) aiBuyStock(ai, stockToBuy.symbol, desiredQuantity);
                                            else if (nowAffordable > 0) aiBuyStock(ai, stockToBuy.symbol, nowAffordable);
                                        }
                                    } else if (affordableQuantity > 0) { aiBuyStock(ai, stockToBuy.symbol, affordableQuantity); }
                                } else if (affordableQuantity > 0) { aiBuyStock(ai, stockToBuy.symbol, affordableQuantity); }
                            } else if (affordableQuantity > 0) { aiBuyStock(ai, stockToBuy.symbol, affordableQuantity); }
                        }
                    }
                }
                // Próba sprzedaży (losowa)
                else if (portfolioSize > 0) {
                    const randomOwnedSymbol = getRandomElement(Object.keys(ai.portfolio));
                    if (ai.portfolio[randomOwnedSymbol] && ai.portfolio[randomOwnedSymbol].assetType !== 'Startup') { // Sprawdź czy to nie startup
                        const sharesToSell = Math.max(1, Math.floor(ai.portfolio[randomOwnedSymbol].shares * 0.5));
                        aiSellStock(ai, randomOwnedSymbol, sharesToSell);
                    }
                }
            }

            // Inwestycje w startupy (jeśli ma umiejętność)
            if ((ai.unlockedSkills['startupInvestor'] || 0) >= 1) {
                if (Math.random() < 0.25) {
                    const targetStartup = getRandomElement(stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding'));
                    if (targetStartup && ai.cash > 1000) {
                        const amount = ai.cash * getRandomInRange(0.10, (ai.personality === 'yolo_trader' ? 0.7 : 0.2));
                        aiInvestInStartup(ai, targetStartup.symbol, amount);
                    }
                }
                 // Wpłata do puli
                if (ai.cash > (ai.personality === 'yolo_trader' ? 200 : 10000) && Math.random() < (ai.personality === 'yolo_trader' ? 0.20 : 0.10)) {
                    const amount = ai.cash * getRandomInRange(0.10, (ai.personality === 'yolo_trader' ? 0.7 : 0.3));
                    contributeToInvestmentPool(ai.id, amount);
                }
            }

            // Kupowanie od banków inwestycyjnych (mała szansa, impulsywnie)
            if (activeInvestmentBanks.length > 0 && Math.random() < 0.05) {
                for (const bank of activeInvestmentBanks) {
                    const potentialBuys = Object.keys(bank.stockPortfolio).filter(symbol => bank.stockPortfolio[symbol].shares > 0);
                    if (potentialBuys.length > 0) {
                        const targetSymbol = getRandomElement(potentialBuys);
                        const stock = stocks.find(s => s.symbol === targetSymbol);
                        const bankHolding = bank.stockPortfolio[targetSymbol];
                        if (stock) {
                            const bankSellPrice = stock.price * 1.10;
                            const maxQuantity = Math.floor(ai.cash * 0.5 / bankSellPrice);
                            const buyQuantity = Math.min(bankHolding.shares, maxQuantity, getRandomIntInRange(1, 20));
                            if (buyQuantity > 0) {
                                if (aiBuySharesFromInvestmentBank(ai, bank.id, targetSymbol, buyQuantity)) {
                                     console.log(`[AI ${ai.personality}] ${ai.name} impulsywnie kupił ${buyQuantity} ${targetSymbol} od banku ${bank.name}.`);
                                    return; // Akcja podjęta
                                }
                            }
                        }
                    }
                }
            }
            break; // Koniec reckless/yolo

        case 'calm':
        case 'dividend_chaser':
            if (ai.personality === 'dividend_chaser') {
                runAiMarian(ai); // Marian ma swoją logikę
            } else { // Logika dla 'calm'
                if (Math.random() < 0.25) {
                    for (const symbol in ai.portfolio) {
                        const holding = ai.portfolio[symbol];
                        if (holding.assetType === 'Startup') continue;
                        const marketData = stocks.find(s => s.symbol === symbol);
                        if (marketData && (marketData.price > holding.avgPrice * 1.3 || marketData.financialHealth <= -4)) {
                            aiSellStock(ai, symbol, holding.shares);
                            return;
                        }
                    }
                    const stockToBuy = getRandomElement(accessibleStocks.filter(s => s.volatilityFactor < 1.2 && s.financialHealth >= 0));
                    if (stockToBuy) {
                        const investmentFraction = 0.1;
                        const quantity = Math.floor((aiNetWorth * investmentFraction) / stockToBuy.price);
                        if (quantity > 0) {
                            aiBuyStock(ai, stockToBuy.symbol, quantity);
                        }
                    }
                }
            } // Koniec logiki dla 'calm'

            // Depozyty (dla obu)
            if (cashRatio > 0.5 && aiNetWorth > 5000) {
                const excessCash = ai.cash - (aiNetWorth * 0.3);
                const depositBank = aiChooseCommercialBank('deposit', ai);
                if (depositBank && excessCash > 500) {
                    if (aiMakeDeposit(ai, depositBank.id, excessCash)) {
                        console.log(`[AI ${ai.personality}] ${ai.name} wpłacił ${excessCash.toFixed(0)} PLN na lokatę w ${depositBank.name}.`);
                        return; // Akcja podjęta
                    }
                }
            }
            break; // Koniec calm/dividend_chaser

        case 'whale':
        case 'pro_investor':
            if (Math.random() < (ai.personality === 'pro_investor' ? 0.7 : 0.4)) {
                // Sprzedaż
                for (const symbol in ai.portfolio) {
                    const holding = ai.portfolio[symbol];
                    if (holding.assetType === 'Startup') continue;
                    const stock = stocks.find(s => s.symbol === symbol);
                    const profitTarget = ai.personality === 'pro_investor' ? 1.25 : 1.35;
                    const healthThreshold = ai.personality === 'pro_investor' ? -1 : 0;
                    if (stock && (stock.price > holding.avgPrice * profitTarget || stock.financialHealth < healthThreshold)) {
                        aiSellStock(ai, symbol, holding.shares);
                        return;
                    }
                }

                // Inwestycje w startupy (jeśli ma umiejętność)
                if ((ai.unlockedSkills['startupInvestor'] || 0) >= 1) {
                    if (Math.random() < 0.15) {
                        const successThreshold = ai.personality === 'pro_investor' ? 0.65 : 0.55;
                        const potentialStartups = stocks.filter(s => s.assetType === 'Startup' && s.stage === 'funding' && s.successChance > successThreshold);
                        if (potentialStartups.length > 0) {
                            const targetStartup = getRandomElement(potentialStartups);
                            if (targetStartup && ai.cash > 2000) {
                                const amount = ai.cash * getRandomInRange(0.05, 0.15);
                                aiInvestInStartup(ai, targetStartup.symbol, amount);
                            }
                        }
                    }
                     // Wpłata do puli
                     const poolCashThreshold = ai.personality === 'pro_investor' ? 15000 : 10000;
                     const poolChance = ai.personality === 'pro_investor' ? 0.08 : 0.10;
                     const poolAmountFactor = ai.personality === 'pro_investor' ? 0.05 : 0.2;
                     if (ai.cash > poolCashThreshold && Math.random() < poolChance) {
                        const amount = ai.cash * poolAmountFactor;
                        contributeToInvestmentPool(ai.id, amount);
                    }
                }

                // Zakup najlepszych akcji (jeśli mało pozycji)
                if (portfolioSize < (ai.personality === 'pro_investor' ? 3 : 5)) {
                    const healthMin = ai.personality === 'pro_investor' ? 1 : 2;
                    const bestBuys = accessibleStocks.filter(s => s.financialHealth >= healthMin).sort((a, b) => b.financialHealth - a.financialHealth);
                    if (bestBuys.length > 0) {
                        const stockToBuy = bestBuys[0];
                        const neededCash = stockToBuy.price * (ai.personality === 'pro_investor' ? 5 : 10);
                        if (ai.cash < neededCash && ai.cash > (neededCash * (ai.personality === 'pro_investor' ? 0.7 : 0.5))) {
                             const loanAmount = neededCash * (ai.personality === 'pro_investor' ? 0.3 : 0.5);
                             aiTakeLoan(ai, loanAmount);
                        }
                        const quantity = Math.floor((ai.cash * (ai.personality === 'pro_investor' ? 0.33 : 0.4)) / stockToBuy.price);
                        if (quantity > 0) {
                            aiBuyStock(ai, stockToBuy.symbol, quantity);
                        }
                    }
                }
            } // Koniec if Math.random() dla handlu

            // Kupowanie od banków inwestycyjnych (bardziej selektywne)
             if (activeInvestmentBanks.length > 0 && Math.random() < 0.15) {
                for (const bank of activeInvestmentBanks) {
                    for (const symbol in bank.stockPortfolio) {
                        const bankHolding = bank.stockPortfolio[symbol];
                        const stock = stocks.find(s => s.symbol === symbol);
                        const ownsTooMuch = ai.portfolio[symbol] && stock && stock.totalShares > 0 && (ai.portfolio[symbol].shares / stock.totalShares) > 0.2; // Dodano stock && stock.totalShares > 0
                        if (stock && bankHolding.shares > 0 && stock.financialHealth >= 1 && !ownsTooMuch) {
                            const bankSellPrice = stock.price * 1.10;
                            const acceptablePremium = ai.portfolio[symbol] ? ai.portfolio[symbol].avgPrice * 1.15 : bankSellPrice * 1.01;
                            if (bankSellPrice <= acceptablePremium) {
                                const maxAffordableQuantity = Math.floor(ai.cash * 0.3 / bankSellPrice);
                                const buyQuantity = Math.min(bankHolding.shares, maxAffordableQuantity, getRandomIntInRange(10, 100));
                                if (buyQuantity > 0) {
                                    if (aiBuySharesFromInvestmentBank(ai, bank.id, symbol, buyQuantity)) {
                                        console.log(`[AI ${ai.personality}] ${ai.name} strategicznie kupił ${buyQuantity} ${symbol} od banku ${bank.name}.`);
                                        return; // Akcja podjęta
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Depozyty
            if (cashRatio > 0.4 && aiNetWorth > 20000) {
                const excessCash = ai.cash - (aiNetWorth * 0.25);
                const depositBank = aiChooseCommercialBank('deposit', ai);
                if (depositBank && excessCash > 1000) {
                    if (aiMakeDeposit(ai, depositBank.id, excessCash)) {
                        console.log(`[AI ${ai.personality}] ${ai.name} wpłacił ${excessCash.toFixed(0)} PLN na lokatę w ${depositBank.name}.`);
                        return; // Akcja podjęta
                    }
                }
            }
            break; // Koniec whale/pro_investor

        case 'banker':
            const banker = ai;
            const bankerNetWorth = aiNetWorth;
            const bankerPortfolioSize = portfolioSize;
            const financeSectors = ['Finanse', 'Bankowość Komercyjna'];

            // 1. Sprzedaż
            let soldSomethingBanker = false;
            for (const symbol in banker.portfolio) {
                if (banker.portfolio[symbol].assetType === 'Startup') continue;
                const stock = stocks.find(s => s.symbol === symbol);
                const holding = banker.portfolio[symbol];
                if (!stock || !holding) continue;
                const profitMargin = stock.price / holding.avgPrice;
                const isRisky = stock.volatilityFactor > (1.5 - banker.riskAversionFactor * 1.0) || stock.financialHealth < (0 - banker.riskAversionFactor * 2);
                const moderateProfitTarget = 1.15 + banker.riskAversionFactor * 0.1;
                if (isRisky || profitMargin > moderateProfitTarget) {
                    const quantityToSell = Math.floor(holding.shares * getRandomInRange(0.5, 1.0));
                    aiSellStock(banker, symbol, quantityToSell);
                    soldSomethingBanker = true;
                    break;
                }
            }
            if (soldSomethingBanker) break;

            // 2. Depozyty
            const cashRatioBanker = cashRatio; // Użyj już obliczonego
            if (cashRatioBanker > 0.4 && bankerNetWorth > 10000) {
                const excessCash = banker.cash - (bankerNetWorth * 0.2);
                const depositBank = aiChooseCommercialBank('deposit', banker);
                if (depositBank && excessCash > 100) {
                    if (aiMakeDeposit(banker, depositBank.id, excessCash)) {
                        console.log(`[AI Bankier] ${banker.name} wpłacił ${excessCash.toFixed(0)} PLN na lokatę w ${depositBank.name}.`);
                        break;
                    }
                }
            }

            // 3. Zakup (Akcje Finansowe/Bankowe z rynku)
            if (cashRatioBanker > 0.1 && bankerPortfolioSize < 6) {
                const potentialTargets = accessibleStocks.filter(s =>
                    (s.isBankStock || s.sector.some(sec => financeSectors.includes(sec))) &&
                    s.financialHealth >= (1 - banker.riskAversionFactor * 2) &&
                    s.volatilityFactor < (2.0 - banker.riskAversionFactor * 1.5)
                ).sort((a, b) => (b.financialHealth - b.volatilityFactor) - (a.financialHealth - a.volatilityFactor));

                if (potentialTargets.length > 0) {
                    const targetStock = potentialTargets[0];
                    const investmentAmount = banker.cash * getRandomInRange(0.3, 0.6);
                    const affordableQuantity = Math.floor(banker.cash / targetStock.price);
                    let quantityToBuy = Math.floor(investmentAmount / targetStock.price);
                    if (quantityToBuy > 0) {
                        aiBuyStock(banker, targetStock.symbol, Math.min(quantityToBuy, affordableQuantity));
                        break;
                    }
                }
            }

             // 3.5 Zakup od banków inwestycyjnych (tylko finanse/banki)
             if (activeInvestmentBanks.length > 0 && Math.random() < 0.1) {
                for (const bank of activeInvestmentBanks) {
                     for (const symbol in bank.stockPortfolio) {
                        const bankHolding = bank.stockPortfolio[symbol];
                        const stock = stocks.find(s => s.symbol === symbol);
                        const isFinanceTarget = stock && (stock.isBankStock || stock.sector.some(sec => financeSectors.includes(sec)));
                        if (isFinanceTarget && bankHolding.shares > 0 && stock.financialHealth >= 0) {
                             const bankSellPrice = stock.price * 1.10;
                             const acceptablePremium = banker.portfolio[symbol] ? banker.portfolio[symbol].avgPrice * 1.10 : bankSellPrice * 1.01;
                             if (bankSellPrice <= acceptablePremium) {
                                const maxAffordableQuantity = Math.floor(banker.cash * 0.2 / bankSellPrice);
                                const buyQuantity = Math.min(bankHolding.shares, maxAffordableQuantity, getRandomIntInRange(5, 50));
                                if (buyQuantity > 0) {
                                    if (aiBuySharesFromInvestmentBank(banker, bank.id, symbol, buyQuantity)) {
                                        console.log(`[AI Bankier] ${banker.name} kupił ${buyQuantity} akcji finansowych ${symbol} od banku ${bank.name}.`);
                                        return;
                                    }
                                }
                             }
                        }
                     }
                }
             }

            // 4. Pożyczki (Leverage)
            const currentLoansValue = (banker.loans || []).reduce((sum, l) => sum + l.amount, 0);
            const maxLeverageRatio = 0.4;
            if (cashRatioBanker < 0.15 && (currentLoansValue / bankerNetWorth) < maxLeverageRatio) {
                 const potentialTargets = accessibleStocks.filter(s =>
                    (s.isBankStock || s.sector.some(sec => financeSectors.includes(sec))) &&
                    s.financialHealth >= (2 - banker.riskAversionFactor * 2) &&
                    s.volatilityFactor < (1.5 - banker.riskAversionFactor * 1.0)
                 ).sort((a, b) => (b.financialHealth - b.volatilityFactor) - (a.financialHealth - a.volatilityFactor));

                 if (potentialTargets.length > 0) {
                    const targetStock = potentialTargets[0];
                    const desiredInvestment = bankerNetWorth * 0.1;
                    const neededCash = Math.max(0, desiredInvestment - banker.cash);
                    if (neededCash > 500) {
                        let loanTaken = false;
                        let collateralStock = null, availableCollateralQty = 0;
                        for (const sym in banker.portfolio) { /* ... znajdź zastaw ... */
                             const h = banker.portfolio[sym];
                             const s = stocks.find(st => st.symbol === sym && !st.assetType);
                             const available = h.shares - (h.lockedShares || 0);
                             if (s && available > 0) { collateralStock = s; availableCollateralQty = available; break; }
                        }
                        const mortgageBank = commercialBanks.find(b => b.isActive && b.type === BANK_TYPES.MORTGAGE);
                        if (mortgageBank && collateralStock) {
                            const requiredCollateralValue = neededCash * 2;
                            const requiredCollateralQty = Math.ceil(requiredCollateralValue / collateralStock.price);
                            if (availableCollateralQty >= requiredCollateralQty) {
                                if (aiTakeMortgageLoan(banker, mortgageBank.id, collateralStock.symbol, requiredCollateralQty, neededCash)) {
                                    loanTaken = true;
                                }
                            }
                        }
                        if (!loanTaken) {
                           if(aiTakeLoan(banker, neededCash)) {
                               loanTaken = true;
                           }
                        }
                        if (loanTaken) {
                            const affordableQuantityNow = Math.floor(banker.cash / targetStock.price);
                            const quantityToBuyNow = Math.floor(desiredInvestment / targetStock.price);
                            if (affordableQuantityNow > 0) {
                                aiBuyStock(banker, targetStock.symbol, Math.min(quantityToBuyNow, affordableQuantityNow));
                            }
                            break;
                        }
                    }
                 }
            }

            // 5. Spłata Pożyczek
            if (cashRatioBanker > 0.5 && banker.loans && banker.loans.length > 0) {
                banker.loans.sort((a, b) => b.interestRate - a.interestRate);
                const loanToRepay = banker.loans[0];
                const repaymentAmount = Math.min(loanToRepay.amount, banker.cash * 0.3);
                if (repaymentAmount > 100) {
                     if (aiRepayLoan(banker, loanToRepay.id, repaymentAmount)) {
                        console.log(`[AI Bankier] ${banker.name} spłacił ${repaymentAmount.toFixed(0)} PLN pożyczki w ${loanToRepay.bankName}.`);
                        break;
                     }
                }
            }
            break; // Koniec case 'banker'

        case 'market_maker':
            // Market maker nie korzysta z depozytów ani nie kupuje od banków
            const isActiveBoost = ai.marketMakerBoost.isActive;
            if (isActiveBoost && Date.now() > ai.marketMakerBoost.expiryTime) {
                 ai.marketMakerBoost.isActive = false;
                 ai.cash -= ai.marketMakerBoost.cashBonus;
                 if (ai.cash < 0) ai.cash = 0;
                 ai.marketMakerBoost.cashBonus = 0;
                 logEvent('📉 Zainteresowanie giełdą wraca do normy.', 'review');
            }
            const actionChance = isActiveBoost ? 1.0 : 0.95;
            const tradeSizeMin = isActiveBoost ? 10 : 1;
            const tradeSizeMax = isActiveBoost ? 50 : 9;

            if (Math.random() < actionChance) {
                if (Math.random() < 0.35 && Object.keys(ai.portfolio).length > 0) {
                    const symbolToSell = getRandomElement(Object.keys(ai.portfolio));
                    if (ai.portfolio[symbolToSell] && ai.portfolio[symbolToSell].assetType !== 'Startup') { // Sprawdź czy to nie startup
                         const sharesToSell = getRandomIntInRange(tradeSizeMin, tradeSizeMax);
                         aiSellStock(ai, symbolToSell, sharesToSell);
                    }
                } else {
                    const allTradeableStocks = stocks.filter(s => !s.assetType && !s.isBankrupt && !s.isTradeLocked); // Dodano !isTradeLocked
                    if (allTradeableStocks.length > 0) {
                        const stockToBuy = getRandomElement(allTradeableStocks);
                        if (stockToBuy) {
                            const quantity = getRandomIntInRange(tradeSizeMin, tradeSizeMax);
                            if (ai.cash > stockToBuy.price * quantity) {
                                aiBuyStock(ai, stockToBuy.symbol, quantity);
                            }
                        }
                    }
                }
            }
            break; // Koniec market_maker

    } // Koniec switch

    // --- Akcje wykonywane przez WSZYSTKIE AI (które mają odpowiednie systemy) ---

    // Sprawdzanie "Korony" i użycie mocy
    if (ai.portfolio) {
        for (const symbol in ai.portfolio) {
            const stock = stocks.find(s => s.symbol === symbol);
            if (!stock || stock.assetType === 'Startup') continue;
            const holding = ai.portfolio[symbol];
            if (holding && typeof holding.shares === 'number' && stock.totalShares > 0) {
                const ownershipPct = (holding.shares / stock.totalShares) * 100;
                if (ownershipPct > 50 && Math.random() < 0.15) {
                    aiUseCrownPowers(ai, stock);
                }
            }
        }
    }

    // Zarządzanie Reputacją
     if (ai.portfolio) {
        for (const symbol in ai.portfolio) {
            const stock = stocks.find(s => s.symbol === symbol);
            if (stock && !stock.assetType && stock.reputation && stock.reputation[ai.id] !== undefined && stock.reputation[ai.id] < -20) {
                if (ai.cash > 50000 && Math.random() < 0.1) {
                    const donationAmount = ai.cash * 0.05;
                    donateToCompany(symbol, donationAmount, ai.id);
                    return;
                }
            }
        }
     }

    // Spłata Pożyczek (jeśli AI ma nadmiar gotówki)
     if (ai.personality !== 'banker' && ai.loans && ai.loans.length > 0) {
          const cashRatioRepay = cashRatio; // Użyj już obliczonego
         if (cashRatioRepay > 0.6) {
             ai.loans.sort((a, b) => b.interestRate - a.interestRate);
             const loanToRepay = ai.loans[0];
             const repaymentAmount = Math.min(loanToRepay.amount, ai.cash * 0.4);
             if (repaymentAmount > 100) {
                 if (aiRepayLoan(ai, loanToRepay.id, repaymentAmount)) {
                     console.log(`[AI] ${ai.name} spłacił ${repaymentAmount.toFixed(0)} PLN pożyczki w ${loanToRepay.bankName}.`);
                     return;
                 }
             }
         }
     }

    // Automatyczna spłata rat (rzadziej)
    if (ai.loans && ai.loans.length > 0 && Math.random() < 0.2) {
        for (let i = ai.loans.length - 1; i >= 0; i--) {
            const loan = ai.loans[i];
            const bank = commercialBanks.find(b => b.id === loan.bankId);
            const weeklyInterestRate = ((LOAN_INTEREST_RATE + bank?.baseInterestRateMargin * (loan.collateral ? 1.1 : 1.0)) || 0.002) / 52;
            loan.amount += loan.amount * weeklyInterestRate;
            if (ai.cash >= loan.weeklyPayment) {
                const payment = Math.min(loan.weeklyPayment, loan.amount);
                ai.cash -= payment;
                loan.amount -= payment;
                if (bank) {
                    bank.cash += payment;
                    if (bank.loanPortfolio[ai.id]) {
                        const bankLoanIndex = bank.loanPortfolio[ai.id].findIndex(bl => bl.id === loan.id);
                        if (bankLoanIndex !== -1) {
                            bank.loanPortfolio[ai.id][bankLoanIndex].remainingAmount -= payment;
                            if (bank.loanPortfolio[ai.id][bankLoanIndex].remainingAmount <= 0.01) {
                                bank.loanPortfolio[ai.id].splice(bankLoanIndex, 1);
                            }
                        }
                    }
                }
                if (loan.amount <= 0.01) {
                    console.log(`[AI] ${ai.name} spłacił kredyt w ${loan.bankName}.`);
                    if (loan.collateral) {
                        const holding = ai.portfolio[loan.collateral.symbol];
                        if (holding && holding.lockedShares) {
                            holding.lockedShares = Math.max(0, holding.lockedShares - loan.collateral.quantity);
                        }
                    }
                    ai.loans.splice(i, 1);
                }
            } else {
                console.log(`[AI] ${ai.name} nie ma środków na spłatę raty kredytu w ${loan.bankName}.`);
                const scorePenalty = 5;
                ai.creditScore = Math.max(0, ai.creditScore - scorePenalty);
                console.log(`[AI Kredyt] Wynik kredytowy ${ai.name} spadł do ${ai.creditScore} (-${scorePenalty}) za brak spłaty.`);
            }
        }
    }

    // Zarządzanie obligacjami, miastem, aukcjami (rzadziej)
    if (Math.random() < 0.1) {
        aiManageBondsAndCity(ai);
    }

    // Akcje na festynie (jeśli trwa)
    if (festival && festival.isActive) {
        aiFestivalActions(ai);
    }

    // Regeneracja Credit Score
    if (ai.creditScore < 100 && Math.random() < 0.1) {
        ai.creditScore = Math.min(100, ai.creditScore + 1);
    }

    // Wydawanie punktów umiejętności
    if (ai.skillPoints !== undefined && ai.unlockedSkills !== undefined) {
         if (Math.random() < 0.2) {
            for (const skillId in skills) {
                if (skillId === 'adblock') continue;
                let canConsiderSanEscobar = ai.skillPoints > 5000;
                if (ai.personality === 'pro_investor' || ai.personality === 'whale') canConsiderSanEscobar = ai.skillPoints > 3000;
                let desiresMaxLevel = (ai.personality === 'reckless' || ai.personality === 'yolo_trader') && ai.skillPoints > 110000;
                if (skillId !== 'sanEscobar' || canConsiderSanEscobar) {
                    const skillData = skills[skillId];
                    const currentAiLevel = ai.unlockedSkills[skillId] || 0;
                    const targetLevel = (desiresMaxLevel && skillId === 'sanEscobar') ? 4 : currentAiLevel + 1;
                    const nextLevelInfo = skillData.levels.find(l => l.level === targetLevel);
                    if (nextLevelInfo) {
                        const requirement = nextLevelInfo.requires;
                        const requirementMet = requirement ? (ai.unlockedSkills[requirement.skillId] || 0) >= requirement.level : true;
                        if (ai.skillPoints >= nextLevelInfo.cost && requirementMet) {
                            ai.skillPoints -= nextLevelInfo.cost;
                            ai.unlockedSkills[skillId] = nextLevelInfo.level;
                            console.log(`[AI Skills] ${ai.name} odblokował/ulepszył ${skillData.name} do poziomu ${nextLevelInfo.level}! Pozostałe punkty: ${ai.skillPoints.toFixed(2)}`);
                            break;
                        }
                    }
                }
            }
         }
    } // Koniec bloku wydawania punktów

} // Koniec funkcji makeAiDecision
    




function checkAiTierUpgrade(ai) {
    const nextLevel = ai.accessLevel + 1;
    const nextExchange = Object.values(exchanges).find(e => e.level === nextLevel);

    // Jeśli bot ma już maksymalny dostęp, nic nie rób
    if (!nextExchange) {
        return;
    }

    // --- Ścieżka Kapitałowa (przez wartość portfela) ---
    let totalAiValue = ai.cash;
    for (const symbol in ai.portfolio) {
        const holding = ai.portfolio[symbol];
        const marketData = stocks.find(s => s.symbol === symbol);
        if (marketData) {
            totalAiValue += marketData.price * holding.shares;
        }
    }
    
    const capitalThresholds = [40000, 200000, 800000, 4000000]; // Progi dla Brąz, Srebro, Złoto, Platyna
    if (totalAiValue >= capitalThresholds[ai.accessLevel]) {
        ai.accessLevel = nextLevel;
        const message = `[AI] ${ai.name} dzięki zyskom awansował na "${nextExchange.name}"!`;
        console.log(message);
        logEvent(message);
        return; // Awansował, więc kończymy sprawdzanie w tej turze
    }

    // --- Ścieżka Finansowa (przez zakup licencji) ---
    // Bot rozważy zakup licencji, jeśli ma 2x więcej gotówki niż jej koszt
    const licenseCost = nextExchange.licenseCost;
    if (ai.cash > licenseCost * 2 && Math.random() < 0.2) { // 20% szans na zakup, jeśli go stać
        ai.cash -= licenseCost;
        ai.accessLevel = nextLevel;
        const message = `[AI] ${ai.name} kupił licencję i uzyskał dostęp do "${nextExchange.name}"!`;
        console.log(message);
        logEvent(message);
    }
}
function runAiTurns() {
    aiCompetitors.forEach(ai => {
        makeAiDecision(ai);
        checkAiTierUpgrade(ai);
    });
}

function aiDecideOnTakeover(aiOwner, acquirer, target, buyoutPrice) {
    // Bot oblicza, jak duża jest oferowana premia w stosunku do aktualnej ceny
    const premium = (buyoutPrice / target.price) - 1;
    let decision = 'reject'; // Domyślnie bot jest ostrożny i odrzuca ofertę

    // Każdy bot decyduje inaczej!
    switch (aiOwner.personality) {
        case 'calm': // Beata "Stoik" Nowak
            // Zaakceptuje, jeśli oferta ma ponad 25% premii - to logiczna, dobra decyzja.
            if (premium > 0.25) decision = 'accept';
            break;
        case 'reckless': // Adam "Ryzyko" Kowalski
            // Decyduje prawie losowo, z 70% szansą na akceptację dla szybkiej akcji.
            if (Math.random() < 0.7) decision = 'accept';
            break;
        case 'yolo_trader': // Darek "Yolo" Nowobogacki
            // Prawie zawsze akceptuje, bo liczy się szybka gotówka.
            if (Math.random() < 0.9) decision = 'accept';
            break;
        case 'whale': // Cezary "Wieloryb" Wiśniewski
            // Jako "wieloryb" jest dumny. Zaakceptuje tylko bardzo wysoką ofertę (ponad 50% premii).
            if (premium > 0.5) decision = 'accept';
            break;
        case 'pro_investor': // Jordan "Wilk" Belfort
            // Analizuje głębiej. Jeśli spółka jest w świetnej kondycji (health > 3), odrzuci ofertę, licząc na dalsze wzrosty.
            if (target.financialHealth > 3) decision = 'reject';
            else if (premium > 0.3) decision = 'accept'; // W innym wypadku, akceptuje dobrą ofertę.
            break;
        case 'dividend_chaser': // Marian 'Dywidendusz' Marciniak
            // Niechętnie sprzeda spółkę dywidendową, chyba że oferta jest nie do odrzucenia (>60% premii).
            const isDividendStock = target.dividendPolicy !== 'Growth' || target.assetType === 'REIT';
            if (isDividendStock && premium < 0.6) decision = 'reject';
            else decision = 'accept';
            break;
        default:
            // Domyślna, bezpieczna decyzja dla innych botów
            if (premium > 0.3) decision = 'accept';
            break;
    }

    // Wykonanie decyzji i zalogowanie jej
    if (decision === 'accept') {
        logEvent(`[DECYZJA AI] 🤝 ${aiOwner.name} akceptuje ofertę przejęcia ${target.name}!`, 'review');
        handleTakeoverAcceptance(acquirer, target, buyoutPrice);
    } else {
        logEvent(`[DECYZJA AI] 🛡️ ${aiOwner.name} odrzuca ofertę przejęcia ${target.name}, chroniąc swoje aktywa!`, 'review');
        handleTakeoverRejection(acquirer, target);
    }
}

function aiDecideOnRescueOffer(ai, offerDetails) {
    const { totalCost, sharesOffered } = offerDetails;

    // Główny warunek: czy bota w ogóle stać na zakup?
    if (ai.cash < totalCost) {
        // Jeśli nie ma pieniędzy, nie może skorzystać z oferty.
        return 0; 
    }

    let acceptanceChance = 0;

    // Każda osobowość ma inną chęć do ryzyka i pomocy firmie
    switch (ai.personality) {
        case 'calm':
        case 'pro_investor':
        case 'whale':
            // Logiczni i profesjonalni inwestorzy widzą w tym okazję.
            acceptanceChance = 0.95; // 95% szans na akceptację, jeśli ich stać.
            break;
        case 'yolo_trader':
        case 'reckless':
            // Ryzykanci zawsze wchodzą w takie okazje.
            acceptanceChance = 0.99; // 99% szans.
            break;
        case 'dividend_chaser':
            // Marian chętnie pomoże firmie, która wypłaca dywidendę, aby nadal to robiła.
            acceptanceChance = 0.90;
            break;
        default:
            acceptanceChance = 0.80; // Domyślna wysoka szansa.
    }

    if (Math.random() < acceptanceChance) {
        // Bot decyduje się na zakup
        ai.cash -= totalCost;
        
        const symbol = offerDetails.targetCompany.symbol;
        if (ai.portfolio[symbol]) {
            ai.portfolio[symbol].shares += sharesOffered;
            // Można by tu uśrednić cenę, ale dla uproszczenia na razie pomijamy.
        }
        
        logEvent(`[AI] ${ai.name} skorzystał z oferty ratunkowej i dokupił akcje ${symbol}.`, 'market');
        return sharesOffered;
    }

    // Bot odrzucił ofertę
    return 0;
}

function aiInvestInStartup(ai, symbol, amount) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.assetType !== 'Startup' || ai.cash < amount || amount <= 0) {
        return; // Zabezpieczenia: czy start-up istnieje, czy bota stać etc.
    }

    // Transakcja
    ai.cash -= amount;
    startup.currentFunding += amount;

    // Zapis w portfelu bota (analogicznie do gracza)
    const sharesBought = amount / startup.price;
    if (ai.portfolio[symbol]) {
    ai.portfolio[symbol].investedAmount += amount;
} else {
    ai.portfolio[symbol] = { investedAmount: amount, assetType: 'Startup', isInsured: false }; // Dodajemy też isInsured dla botów
}

     startup.investors[ai.name] = (startup.investors[ai.name] || 0) + amount;

    // Inwestycja bota również zwiększa szansę na sukces!
    const successChanceBonus = (amount / startup.fundingGoal) * 0.05;
    startup.successChance += successChanceBonus;
    if (startup.successChance > 1) startup.successChance = 1;

    console.log(`[AI] ${ai.name} zainwestował ${amount.toFixed(2)} PLN w start-up ${startup.name}!`);
}

function runStateActions() {
    console.log("[AI PAŃSTWO] Uruchomiono cykl decyzyjny Skarbu Państwa...");

    // === CZĘŚĆ 1: ZARZĄDZANIE SPÓŁKAMI PAŃSTWOWYMI ===
    const stateOwnedCompanies = stocks.filter(s => s.isStateOwned && !s.isBankrupt);

    stateOwnedCompanies.forEach(stock => {
        // Jeśli państwo ma za mało udziałów (np. przez oferty gracza), dokupuje
        if (stock.stateOwnershipPct < 0.50) {
            const sharesToBuy = Math.floor(stock.totalShares * 0.02); // Dokup 2%
            const publicFloat = Math.floor(stock.totalShares * (1 - stock.stateOwnershipPct));
            const availableShares = publicFloat - stock.sharesHeld;

            if (sharesToBuy > 0 && sharesToBuy <= availableShares) {
                stock.sharesHeld += sharesToBuy;
                const newTotalStateShares = (stock.totalShares * stock.stateOwnershipPct) + sharesToBuy;
                stock.stateOwnershipPct = newTotalStateShares / stock.totalShares;
                logEvent(`🏛️ Skarb Państwa dokupuje pakiet 2% akcji w ${stock.name}, aby wzmocnić swoją pozycję.`, 'market');
            }
        }
        // Jeśli państwo ma za dużo udziałów, sprzedaje mały pakiet
        else if (stock.stateOwnershipPct > 0.95) {
            const sharesToSell = Math.floor(stock.totalShares * 0.01); // Sprzedaj 1%
            if (sharesToSell > 0) {
                stock.sharesHeld -= sharesToSell;
                const newTotalStateShares = (stock.totalShares * stock.stateOwnershipPct) - sharesToSell;
                stock.stateOwnershipPct = newTotalStateShares / stock.totalShares;
                logEvent(`🏛️ Skarb Państwa uwalnia na rynek mały pakiet 1% akcji ${stock.name}.`, 'market');
            }
        }
    });

    // === CZĘŚĆ 2: DYWERSYFIKACJA PORTFELA W SPÓŁKACH PRYWATNYCH ===
    if (Math.random() < 0.25) { // Ta akcja dzieje się rzadziej (25% szans w cyklu)
        const allSectors = [...new Set(stocks.flatMap(s => s.sector))];
        const stateSectors = new Set(stocks.filter(s => s.stateOwnershipPct > 0).flatMap(s => s.sector));
        const missingSectors = allSectors.filter(sector => !stateSectors.has(sector));

        if (missingSectors.length > 0) {
            const targetSector = getRandomElement(missingSectors);
            const potentialTargets = stocks.filter(s => !s.isStateOwned && !s.isBankrupt && s.sector.includes(targetSector));
            
            if (potentialTargets.length > 0) {
                const targetStock = getRandomElement(potentialTargets);
                const sharesToBuy = Math.floor(targetStock.totalShares * getRandomInRange(0.01, 0.05)); // Kup 1-5%
                
                const availableShares = targetStock.totalShares - targetStock.sharesHeld;

                if (sharesToBuy > 0 && sharesToBuy <= availableShares) {
                    targetStock.sharesHeld += sharesToBuy;
                    targetStock.stateOwnershipPct = sharesToBuy / targetStock.totalShares;
                    logEvent(`🏛️ Skarb Państwa, w ramach dywersyfikacji, nabywa mniejszościowy pakiet ${ (targetStock.stateOwnershipPct * 100).toFixed(1) }% akcji w prywatnej spółce ${targetStock.name}!`, 'review');
                }
            }
        }
    }
    displayStartups(getCurrentStartupInputValues());
}

function aiUseCrownPowers(ai, stock) {
    // Priorytet 1: Ratowanie firmy przed bankructwem
    const marketValue = stock.price * stock.totalShares;
    if (stock.corporateDebt > marketValue * 0.2 && stock.financialHealth < -1 && ai.cash > stock.corporateDebt * 0.1) {
        const bailoutAmount = ai.cash * 0.2; // AI używa 20% swojej gotówki na ratunek
        if (bailoutAmount > 0) {
            playerBailsOutCompany(stock.symbol, bailoutAmount, ai); // Wywołujemy uniwersalną funkcję ratunku
            logEvent(`[AI] 👑 ${ai.name} ratuje ${stock.name}, spłacając ${bailoutAmount.toFixed(2)} PLN długu!`, 'review');
            return; // Akcja podjęta
        }
    }

    // Priorytet 2: Zwolnienie niekompetentnego prezesa
    const negativeTraitsCount = stock.ceo.traits.filter(t => negativeTraits.includes(t.id)).length;
    if ((stock.financialHealth < -2 || negativeTraitsCount >= 2) && (!stock.ceo.fireCooldown || Date.now() > stock.ceo.fireCooldown)) {
        const ownershipPct = (ai.portfolio[stock.symbol].shares / stock.totalShares) * 100;
        const successChance = Math.min(1.0, 0.5 + (ownershipPct - 50) * 0.01);
        
        if (Math.random() < successChance) {
            const oldCeoName = stock.ceo.name;
            const newCeoCandidate = generateCeoCandidate(stock); // AI wybiera najlepszego kandydata
            replaceCeo(stock, newCeoCandidate); // Przekazujemy kandydata do funkcji
            logEvent(`[AI] 👑 Rada nadzorcza ${stock.name} pod wpływem ${ai.name} odwołuje ${oldCeoName} i powołuje na jego miejsce ${newCeoCandidate.name}!`, 'review');
        }
        stock.ceo.fireCooldown = Date.now() + (BASE_DELAYS.quarterly * 2);
        return; // Akcja podjęta
    }

    // Priorytet 3: Zmiana polityki dywidendowej (działanie jednorazowe/rzadkie)
    if (Math.random() < 0.3) {
         let desiredPolicy = null;
         switch (ai.personality) {
             case 'dividend_chaser': desiredPolicy = 'Aggressive'; break;
             case 'pro_investor': desiredPolicy = 'Balanced'; break;
             case 'yolo_trader': desiredPolicy = 'Total'; break;
         }
         if (desiredPolicy && stock.dividendPolicy !== desiredPolicy) {
             stock.dividendPolicy = desiredPolicy;
             logEvent(`[AI] 👑 ${ai.name} jako główny udziałowiec zmienia politykę dywidendową ${stock.name} na: ${desiredPolicy}!`, 'review');
             return;
         }
    }

    // Priorytet 4: Wymuszenie dywidendy dla szybkiej gotówki
    const totalValue = ai.cash + Object.keys(ai.portfolio).reduce((val, s) => val + (stocks.find(st=>st.symbol===s)?.price || 0) * ai.portfolio[s].shares, 0);
    if (ai.cash < totalValue * 0.1) { // Jeśli gotówka stanowi mniej niż 10% majątku
         if (executeForcedDividend(stock)) {
            logEvent(`[AI] 👑 ${ai.name} potrzebuje gotówki i wymusza wypłatę dywidendy w ${stock.name}!`, 'review');
         }
    }
}

function runHoldingCompanyAI(holding) {
    // === ETAP 1: SPRZEDAŻ AKCJI (z logiką zysku) ===
    if (Math.random() < 0.3) {
        for (const symbol in holding.holdingPortfolio) {
            const ownedStock = stocks.find(s => s.symbol === symbol);
            const holdingData = holding.holdingPortfolio[symbol];
            if (!ownedStock || !holdingData) continue;

            let shouldSell = false;
            let reason = "";

            // ✅ NOWA LOGIKA: Sprawdź, czy osiągnięto zysk
            const profitMargin = ownedStock.price / holdingData.purchasePrice;
            if (profitMargin > 1.40) { // Sprzedaj, jeśli zysk przekracza 40%
                shouldSell = true;
                reason = "realizacji zysków";
            }

            // Istniejąca logika: Sprawdź, czy spółka ma problemy
            if (!shouldSell) {
                const isBadHealth = ownedStock.financialHealth < -1;
                let doesNotFitStrategy = false;
                if (holding.specializationFilter === 'stateOwned') {
                    if (!ownedStock.isStateOwned) doesNotFitStrategy = true;
                } else if (holding.specializationSectors) {
                    if (!ownedStock.sector.some(s => holding.specializationSectors.includes(s))) doesNotFitStrategy = true;
                }
                if (isBadHealth || doesNotFitStrategy) {
                    shouldSell = true;
                    reason = "słabych wyników spółki";
                }
            }

            if (shouldSell) {
                const quantityOwned = holdingData.quantity;
                const proceeds = ownedStock.price * quantityOwned;
                
                holding.cash += proceeds;
                delete holding.holdingPortfolio[symbol]; 
                ownedStock.sharesHeld -= quantityOwned;
                
                logEvent(`💼 Fundusz ${holding.name} sprzedaje ${quantityOwned} akcji ${ownedStock.name} w celu ${reason}.`);
                return; // Wykonaj tylko jedną transakcję na turę
            }
        }
    }

    // === ETAP 2: ZAKUP NOWYCH AKCJI (z uśrednianiem ceny) ===
    if (Math.random() < 0.2 && holding.cash > 1000) {
        // ... (logika wyszukiwania celów pozostaje bez zmian) ...
        let potentialTargets;
        if (holding.specializationFilter === 'stateOwned') {
            potentialTargets = stocks.filter(stock => stock.isStateOwned && !holding.holdingPortfolio[stock.symbol]);
        } else if (holding.specializationSectors) {
            potentialTargets = stocks.filter(stock => !stock.assetType && !holding.holdingPortfolio[stock.symbol] && stock.financialHealth >= 2 && stock.sector.some(s => holding.specializationSectors.includes(s)));
        } else {
            potentialTargets = [];
        }

        if (potentialTargets.length > 0) {
            potentialTargets.sort((a, b) => b.financialHealth - a.financialHealth);
            const targetStock = potentialTargets[0];

            const investmentAmount = holding.cash * 0.25;
            const quantityToBuy = Math.floor(investmentAmount / targetStock.price);
            const cost = quantityToBuy * targetStock.price;
            const availableShares = targetStock.totalShares - targetStock.sharesHeld;

            if (quantityToBuy > 0 && quantityToBuy <= availableShares && holding.cash >= cost) {
                holding.cash -= cost;
                
                // Zapisz nową pozycję w portfelu
                holding.holdingPortfolio[targetStock.symbol] = {
                    quantity: quantityToBuy,
                    purchasePrice: targetStock.price
                };
                
                targetStock.sharesHeld += quantityToBuy;
                logEvent(`💼 Fundusz ${holding.name} nabywa ${quantityToBuy} akcji w ${targetStock.name} za ${cost.toFixed(2)} PLN.`);
                return;
            }
        }
    }
}

function aiManageBondsAndCity(ai) {
    // 1. Inwestycja w miasto (bez zmian)
    if (ai.personality === 'whale' && !cityInvestment.isUnlocked && ai.cash > 20000) {
        aiDonateToCity(ai, 10000);
        return;
    }

    if (currentCollateralAuction && Date.now() < currentCollateralAuction.endTime && ai.hasTBillAccess) { // Używamy TBillAccess jako ogólnego dostępu do aukcji BC
        const alreadyBid = currentCollateralAuction.bids.some(b => b.bidderId === ai.id);
        if (!alreadyBid) {
            const stock = stocks.find(s=>s.symbol === currentCollateralAuction.stockSymbol);
            if (stock) {
                 // Boty zainteresowane aukcją: Whale, Pro, Reckless, Yolo
                 const interestedPersonalities = ['whale', 'pro_investor', 'reckless', 'yolo_trader'];
                 if (interestedPersonalities.includes(ai.personality)) {
                    // Cena oferty: minimalna + % w zależności od osobowości
                    let priceMultiplier = 1.05; // Domyślnie 5% ponad minimum
                    if (ai.personality === 'reckless' || ai.personality === 'yolo_trader') priceMultiplier = getRandomInRange(1.1, 1.25);
                    if (ai.personality === 'whale') priceMultiplier = getRandomInRange(1.02, 1.15);

                    const bidPrice = Math.min(stock.price * 0.98, currentCollateralAuction.minPrice * priceMultiplier); // Nie przepłacaj powyżej ceny rynkowej
                    const maxQuantity = Math.floor(ai.cash * 0.2 / bidPrice); // Max 20% gotówki
                    const bidQuantity = Math.min(maxQuantity, currentCollateralAuction.quantityAvailable, getRandomIntInRange(1, 50)); // Losowa ilość, max 50

                    if (bidQuantity > 0) {
                        placeCollateralBid(ai, bidQuantity, bidPrice);
                        // return; // Można odkomentować, jeśli chcemy tylko jedną akcję AI na cykl
                    }
                 }
            }
        }
    }

    // --- 👇 NOWA LOGIKA LICYTACJI BONÓW 👇 ---
    // 2. Sprawdź, czy trwa aukcja i czy AI ma dostęp
    if (currentTBillAuction && Date.now() < currentTBillAuction.endTime && ai.hasTBillAccess) {
        // Sprawdź, czy AI już złożyło ofertę w tej aukcji (proste zabezpieczenie przed wielokrotnym licytowaniem)
        const alreadyBid = currentTBillAuction.bids.some(b => b.bidderId === ai.id);
        
        if (!alreadyBid) {
            let bidPrice = 0;
            let bidQuantity = 0;
            const cashToUse = ai.cash * 0.3; // Ile gotówki AI chce przeznaczyć

            switch (ai.personality) {
                case 'calm':
                    bidPrice = getRandomInRange(980, 995);
                    bidQuantity = Math.floor(cashToUse / bidPrice) * 0.5; // Mała ilość
                    break;
                case 'yolo_trader':
                    bidPrice = getRandomInRange(990, 999);
                    bidQuantity = Math.floor(cashToUse / bidPrice); // Duża ilość
                    break;
                case 'pro_investor':
                    bidPrice = getRandomInRange(960, 985);
                    bidQuantity = Math.floor(cashToUse / bidPrice) * 0.7; // Umiarkowana ilość
                    break;
                case 'whale':
                    bidPrice = getRandomInRange(970, 995);
                    bidQuantity = Math.floor(cashToUse / bidPrice); // Duża ilość
                    break;
                // Marian nie jest zainteresowany bonami skarbowymi
                case 'dividend_chaser':
                default:
                    return; // Inne osobowości nie licytują
            }

            bidQuantity = Math.floor(bidQuantity); // Upewnij się, że ilość jest całkowita

            if (bidQuantity > 0 && bidPrice > 0) {
                placeTBillBid(ai, bidQuantity, bidPrice);
                return; // Złożono ofertę, zakończ turę
            }
        }
    }
    // --- 👆 KONIEC NOWEJ LOGIKI LICYTACJI 👆 ---


    // 3. Logika zakupu obligacji (bez zmian)
    const hasIdleCash = ai.cash > 50000;
    if (!hasIdleCash) return;

    switch (ai.personality) {
        case 'calm':
            if (stateBondOffer.shortTerm.available > 10) {
                const quantity = Math.min(10, Math.floor((ai.cash * 0.2) / 1000));
                if (quantity > 0) buyStateBond(ai, 'shortTerm', quantity);
            }
            break;
        case 'reckless':
            const riskyBonds = activeBonds.filter(b => b.risk > 0.5 && b.interestRate > 0.1);
            if (riskyBonds.length > 0) {
                const targetBond = riskyBonds[0];
                const quantity = Math.min(targetBond.available, Math.floor((ai.cash * 0.3) / targetBond.faceValue));
                if (quantity > 0) buyOtherBond(ai, targetBond.id, quantity);
            }
            break;
        case 'whale':
            if (ai.cash > 200000 && stateBondOffer.longTerm.available > 50) {
                const quantity = Math.min(50, Math.floor((ai.cash * 0.5) / 1000));
                if (quantity > 0) buyStateBond(ai, 'longTerm', quantity);
            }
            break;
        case 'dividend_chaser':
            const mediumRiskBonds = activeBonds.filter(b => b.risk >= 0.2 && b.risk <= 0.5 && b.interestRate > 0.07);
            if (mediumRiskBonds.length > 0) {
                const targetBond = mediumRiskBonds[0];
                const quantity = Math.min(targetBond.available, Math.floor((ai.cash * 0.25) / targetBond.faceValue));
                if (quantity > 0) buyOtherBond(ai, targetBond.id, quantity);
            }
            break;
    }
}

function aiFestivalActions(ai) {
    if (!festival || !festival.isActive) return;

    const participant = festival.participants.find(p => p.ownerId === ai.id);

    if (!participant) {
        // Decyzja o dołączeniu
        if (ai.cash > 2000 && Math.random() < 0.3) {
            ai.cash -= FESTIVAL_STALL_LEVELS[0].cost;
            festival.participants.push({
                ownerId: ai.id,
                promotionTarget: { type: 'self' }, // Uproszczone: boty promują siebie
                level: 1,
                interest: 10
            });
            console.log(`[AI] ${ai.name} dołącza do festynu.`);
        }
    } else {
        // Decyzje, gdy już uczestniczy
        // Ulepszenie stoiska
        const nextLevel = FESTIVAL_STALL_LEVELS[participant.level];
        if (nextLevel && ai.cash > nextLevel.cost * 2 && Math.random() < 0.2) {
            ai.cash -= nextLevel.cost;
            participant.level++;
            participant.interest += 20;
        }
        // Promocja stoiska
        if (ai.cash > 1000 && Math.random() < 0.15) {
            const promo = getRandomElement(Object.values(PROMOTION_ACTIONS));
            ai.cash -= promo.cost;
            participant.interest += promo.interest;
        }
    }
}

function aiChooseCommercialBank(serviceType, ai) {
    const eligibleBankTypes = [BANK_TYPES.UNIVERSAL, BANK_TYPES.INTERNATIONAL, BANK_TYPES.INTERNET];

    // --- 👇 POPRAWIONA LOGIKA DLA BANKU SPÓŁDZIELCZEGO 👇 ---
    // Znajdź ID banku spółdzielczego (zakładamy, że jest tylko jeden)
    const coopBankDef = ALL_COMMERCIAL_BANKS_DEFINITIONS.find(def => def.type === BANK_TYPES.COOPERATIVE);
    if (coopBankDef) {
        const coopBankStockSymbol = `BK${coopBankDef.id.toUpperCase()}`; // Symbol giełdowy banku
        // Sprawdź, czy AI ma udziały w tym banku
        if (ai.portfolio[coopBankStockSymbol] && ai.portfolio[coopBankStockSymbol].shares > 0) {
            eligibleBankTypes.push(BANK_TYPES.COOPERATIVE); // Dodaj typ spółdzielczy do możliwych wyborów
        }
    }
    // --- 👆 KONIEC POPRAWIONEJ LOGIKI 👆 ---


    const availableBanks = commercialBanks.filter(b => b.isActive && eligibleBankTypes.includes(b.type));
    if (availableBanks.length === 0) return null;

    // Oblicz aktualne oprocentowanie dla każdego dostępnego banku
    availableBanks.forEach(bank => {
        bank.interestRateLoan = (LOAN_INTEREST_RATE + bank.baseInterestRateMargin);
        bank.interestRateDeposit = (DEPOSIT_INTEREST_RATE + bank.baseInterestRateMargin * 0.5);
    });

    // Wybierz najlepszy bank w zależności od usługi
    if (serviceType === 'loan') {
        availableBanks.sort((a, b) => a.interestRateLoan - b.interestRateLoan); // Najniższe oprocentowanie kredytu
    } else { // 'deposit'
        availableBanks.sort((a, b) => b.interestRateDeposit - a.interestRateDeposit); // Najwyższe oprocentowanie depozytu
    }

    return availableBanks[0]; // Zwróć najlepszy
}

function runInvestmentBankAI(bank) {
    if (!bank.isActive || bank.type !== BANK_TYPES.INVESTMENT) return;

    const portfolioSize = Object.keys(bank.stockPortfolio).length;
    const cashReserveRatio = 0.1; // Bank trzyma 10% kapitału jako gotówkę
    const targetPortfolioValue = bank.cash / (1 - cashReserveRatio) * (1 - cashReserveRatio); // Docelowa wartość akcji w portfelu

    // --- 1. Sprzedaż Akcji ---
    if (Math.random() < 0.3) { // 30% szans na próbę sprzedaży
        for (const symbol in bank.stockPortfolio) {
            const holding = bank.stockPortfolio[symbol];
            const stock = stocks.find(s => s.symbol === symbol);
            if (!stock || stock.isBankrupt) {
                delete bank.stockPortfolio[symbol]; // Usuń zbankrutowane
                continue;
            }

            const profitMargin = stock.price / holding.avgPrice;
            const shouldSell = (profitMargin > 1.30 || // Sprzedaj z >30% zyskiem
                                profitMargin < 0.85 || // Ogranicz stratę przy <15% spadku
                                stock.financialHealth < -1); // Sprzedaj słabe spółki

            if (shouldSell) {
                const quantityToSell = Math.floor(holding.shares * getRandomInRange(0.3, 0.7)); // Sprzedaj część
                if (quantityToSell > 0) {
                    const proceeds = stock.price * quantityToSell;
                    bank.cash += proceeds;
                    holding.shares -= quantityToSell;
                    stock.sharesHeld -= quantityToSell; // Akcje wracają na rynek
                    if (holding.shares <= 0) {
                        delete bank.stockPortfolio[symbol];
                    }
                    console.log(`[AI Bank Inw.] ${bank.name} sprzedał ${quantityToSell} akcji ${symbol}.`);
                    return; // Tylko jedna transakcja na turę
                }
            }
        }
    }

    // --- 2. Zakup Akcji ---
    if (Math.random() < 0.4 && bank.cash > bank.initialCapital * cashReserveRatio * 1.2) { // 40% szans i ma nadwyżkę gotówki
        const potentialTargets = stocks.filter(s =>
            !s.assetType && // Nie kupuje specjalnych typów
            !s.isBankrupt &&
            s.financialHealth >= 1 && // Tylko zdrowe spółki
            exchanges[s.exchange].level >= 1 && // Unika śmieciowych
            !bank.stockPortfolio[s.symbol] // Nie kupuje tego, co już ma (uproszczenie)
        );

        if (potentialTargets.length > 0) {
            potentialTargets.sort((a, b) => (b.financialHealth / b.volatilityFactor) - (a.financialHealth / a.volatilityFactor)); // Prosty wskaźnik atrakcyjności
            const targetStock = potentialTargets[0];
            const investmentAmount = bank.cash * getRandomInRange(0.1, 0.25); // Inwestuje 10-25% gotówki
            const quantity = Math.floor(investmentAmount / targetStock.price);
            const cost = quantity * targetStock.price;
            const availableShares = targetStock.totalShares - targetStock.sharesHeld;

            if (quantity > 0 && cost <= bank.cash && quantity <= availableShares) {
                // Sprawdź limit 30% dla innych banków
                const targetIsBank = commercialBanks.some(b => b.id === `bank_${targetStock.symbol}`); // Placeholder - sprawdzimy jak banki wejdą na giełdę
                if (targetIsBank) {
                     // TODO: Dodać logikę sprawdzania limitu 30% (w Etapie 3.5)
                     console.log(`[AI Bank Inw.] ${bank.name} rozważa zakup banku ${targetStock.symbol}, ale limit nie jest jeszcze sprawdzany.`);
                }

                bank.cash -= cost;
                bank.stockPortfolio[targetStock.symbol] = { shares: quantity, avgPrice: targetStock.price };
                targetStock.sharesHeld += quantity;
                console.log(`[AI Bank Inw.] ${bank.name} kupił ${quantity} akcji ${targetStock.symbol}.`);
                return; // Tylko jedna transakcja
            }
        }
    }
}

function aiMakeDeposit(ai, bankId, amount) {
    const bank = commercialBanks.find(b => b.id === bankId && b.isActive);
    if (!bank || isNaN(amount) || amount <= 0 || ai.cash < amount) {
        return false;
    }

    const interestRate = bank.interestRateDeposit;

    // Transakcja
    ai.cash -= amount;
    bank.cash += amount;
    if (!bank.depositPortfolio[ai.id]) bank.depositPortfolio[ai.id] = [];
    bank.depositPortfolio[ai.id].push({ id: `dep_ai_${ai.id}_${Date.now()}`, amount: amount, interestRate: interestRate });

    // Opcjonalnie: Śledzenie depozytów u AI
    if (ai.deposits) {
        const existingDeposit = ai.deposits.find(d => d.bankId === bankId);
        if (existingDeposit) {
            existingDeposit.amount += amount;
            existingDeposit.interestRate = interestRate; // Aktualizuj stopę
        } else {
            ai.deposits.push({
                id: `dep_ai_${ai.id}_${Date.now()}`,
                bankId: bankId,
                bankName: bank.name,
                amount: amount,
                interestRate: interestRate,
                startDate: Date.now()
            });
        }
    }
    return true;
}

/**
 * AI próbuje spłacić część lub całość pożyczki.
 * @param {object} ai - Obiekt bota AI.
 * @param {string} loanId - ID pożyczki do spłaty.
 * @param {number} amount - Kwota do spłaty.
 * @returns {boolean} - True, jeśli spłata (nawet częściowa) się udała.
 */
function aiRepayLoan(ai, loanId, amount) {
    if (!ai.loans || ai.loans.length === 0 || isNaN(amount) || amount <= 0) return false;

    const loanIndex = ai.loans.findIndex(l => l.id === loanId);
    if (loanIndex === -1) return false;

    const loan = ai.loans[loanIndex];
    const bank = commercialBanks.find(b => b.id === loan.bankId);
    const amountToRepay = Math.min(amount, loan.amount, ai.cash); // Spłać max tyle ile można/trzeba/stać

    if (amountToRepay <= 0) return false;

    // Transakcja
    ai.cash -= amountToRepay;
    loan.amount -= amountToRepay;

    if (bank) {
        bank.cash += amountToRepay;
        // Aktualizuj portfel banku
        if (bank.loanPortfolio[ai.id]) {
            const bankLoanIndex = bank.loanPortfolio[ai.id].findIndex(bl => bl.id === loan.id);
            if (bankLoanIndex !== -1) {
                bank.loanPortfolio[ai.id][bankLoanIndex].remainingAmount -= amountToRepay;
                if (bank.loanPortfolio[ai.id][bankLoanIndex].remainingAmount <= 0.01) {
                    bank.loanPortfolio[ai.id].splice(bankLoanIndex, 1);
                }
            }
        }
    }

    // Jeśli spłacono całość
    if (loan.amount <= 0.01) {
        // Odblokuj zastaw, jeśli był
        if (loan.collateral) {
            const holding = ai.portfolio[loan.collateral.symbol];
            if (holding && holding.lockedShares) {
                holding.lockedShares = Math.max(0, holding.lockedShares - loan.collateral.quantity);
            }
        }
        ai.loans.splice(loanIndex, 1); // Usuń pożyczkę z listy AI
    }
    return true; // Spłata (nawet częściowa) się udała
}

function aiBuySharesFromInvestmentBank(ai, bankId, symbol, quantity) {
    const bank = commercialBanks.find(b => b.id === bankId && b.isActive && b.type === BANK_TYPES.INVESTMENT);
    const stock = stocks.find(s => s.symbol === symbol);
    const bankHolding = bank?.stockPortfolio[symbol];

    // Validate
    if (!bank || !stock || !bankHolding || bankHolding.shares < quantity || isNaN(quantity) || quantity <= 0) {
        // console.warn(`[AI Buy From Bank] Validation failed for ${ai.name} buying ${quantity} ${symbol} from ${bankId}`);
        return false;
    }

    const sellPrice = stock.price * 1.10; // Bank sells at market + 10%
    const totalCost = sellPrice * quantity;

    if (ai.cash < totalCost) {
        // console.log(`[AI Buy From Bank] ${ai.name} cannot afford ${quantity} ${symbol} from ${bank.name}`);
        return false;
    }

    // --- Transaction ---
    ai.cash -= totalCost;
    bank.cash += totalCost;

    // Update bank portfolio
    bankHolding.shares -= quantity;
    if (bankHolding.shares <= 0) {
        delete bank.stockPortfolio[symbol];
    }

    // Update AI portfolio (average price calculation)
    if (ai.portfolio[symbol]) {
        const playerHolding = ai.portfolio[symbol]; // Use 'playerHolding' name convention
        const oldTotalValue = playerHolding.avgPrice * playerHolding.shares;
        const newTotalValue = oldTotalValue + totalCost;
        playerHolding.shares += quantity;
        playerHolding.avgPrice = newTotalValue / playerHolding.shares;
    } else {
        ai.portfolio[symbol] = { shares: quantity, avgPrice: sellPrice };
    }

    // Note: sharesHeld on the stock object doesn't change here,
    // because the shares are just transferred from the bank's holding to the AI's.

    return true; // Purchase successful
}