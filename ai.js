// =================================================================================
// ai.js: Boty-inwestorzy: decyzje AI, kredyty botów, relacje gracza z botami.
// Złączone pliki: ai.js, relations.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## ai.js
// #################################################################################

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
        customLogic: 'wolf', // 0.16.3 G14b: pump and dump (bots_domestic.js); osobowość zostaje do M&A i relacji
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
    },
    { // 0.16.3 G14b: Graham — cierpliwy inwestor wartości (bots_domestic.js)
        id: 'ai9',
        name: 'Beniamin „Margines” Grahamski',
        cash: 12000,
        portfolio: {},
        personality: 'graham',
        customLogic: 'graham',
        accessLevel: 1,
        hasTBillAccess: false,
        tBills: [],
        skillPoints: 0,
        unlockedSkills: {},
        creditScore: 100
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
    const interestRate = Number(bestBank.interestRateLoan) || (getLoanRate() + (Number(bestBank.baseInterestRateMargin) || 0)); // bez NaN dla nowych banków
    const loanDurationWeeks = 26; // Stały okres dla AI
    const maturityDate = Date.now() + (loanDurationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    const weeklyRate = interestRate / 52;
    let weeklyPayment;
if (weeklyRate === 0) {
    // Brak odsetek, po prostu dzielimy kwotę przez czas
    weeklyPayment = amount / loanDurationWeeks;
} else {
    // Twój stary, dobry wzór dla odsetek > 0
    weeklyPayment = amount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);
}
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
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return false;
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

    // Dostępne = wolny obrót minus akcje posiadane przez inwestorów (gracz + AI + banki)
    const availableShares = getAvailableShares(stockToBuy);

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
    if (typeof chargeMarketCommission === 'function') chargeMarketCommission(stockToBuy, totalCost, ai); // prowizja operatora rynku
    stockToBuy.sharesHeld += quantity; // Zwiększ liczbę akcji posiadanych przez graczy/AI
    // Symuluj niewielki wpływ na cenę (płynność rynku)
    stockToBuy.price *= 1 + Math.min(0.02, quantity * 0.000005); // wpływ na kurs, najwyżej +2% na transakcję (audyt A4)

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
    if (typeof isMarketHalted === 'function' && isMarketHalted()) return false;
    const holding = ai.portfolio[symbol];

    // Sprawdź, czy AI ma tę pozycję i czy ilość jest poprawna
    // Akcje w zastawie (lombard, hipoteka) nie mogą być sprzedane.
    if (!holding || holding.shares - (holding.lockedShares || 0) < quantity || quantity <= 0) return;

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
    if (typeof chargeMarketCommission === 'function') chargeMarketCommission(stockToSell, totalGainGross, ai);
    holding.shares -= quantity;
    stockToSell.sharesHeld -= quantity; // Zaktualizuj liczbę akcji w obiegu rynkowym
    // Symuluj niewielki wpływ na cenę
    stockToSell.price *= 1 - Math.min(0.02, quantity * 0.000005); // najwyżej −2% na transakcję (audyt A4)

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
            return hasAccess && (isDividendStock || isReit) && canBotInvestIn(ai, s);
        });
        
        if (dividendStocks.length > 0) {
            const marianRegime = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            const isBearOrCapitulation = marianRegime?.phase === 'bear' || marianRegime?.phase === 'capitulation';
            if (isBearOrCapitulation) {
                // 0.15 H5: W bessie dokupują spółki o najwyższej stopie dywidendy
                dividendStocks.sort((a, b) => {
                    const yieldA = (a.lastDividend || a.dividendAmount || 0) / Math.max(1, a.price);
                    const yieldB = (b.lastDividend || b.dividendAmount || 0) / Math.max(1, b.price);
                    return yieldB - yieldA;
                });
            } else {
                dividendStocks.sort((a, b) => a.dividendTimer - b.dividendTimer);
            }
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
            return hasAccess && isGoodHealth && !isDividendStock && canBotInvestIn(ai, s); // Szukamy zdrowych firm, które NIE są celem jego głównej strategii
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


/** Raz na tydzień gry: pożyczki lombardowe (termin), raty i odsetki kredytów, zaległości. */
function processAiLoansWeekly(ai) {
    // ===>>> ZMODYFIKOWANA PĘTLA SPŁATY KREDYTÓW AI <<<===
    const now = Date.now();
    if (ai.loans && ai.loans.length > 0) {
        
        // Sprawdź najpierw pożyczki lombardowe (mają twardy termin)
        for (let i = ai.loans.length - 1; i >= 0; i--) {
            const loan = ai.loans[i];
            if (loan.isPawnLoan && now >= loan.maturityDate) {
                const pawnShop = stocks.find(s => s.symbol === loan.collectorSymbol);
                if (!loan.collateral) { // zastaw rozliczony wykupem przy wycofaniu spółki (delistWithBuyout): spłata z gotówki, reszta umorzona
                    const paid = Math.min(loan.amount, Math.max(0, ai.cash));
                    ai.cash -= paid;
                    if (pawnShop) pawnShop.cash += paid;
                    ai.loans.splice(i, 1);
                    continue;
                }

                if (ai.cash >= loan.amount) {
                    // AI ma pieniądze - spłaca
                    ai.cash -= loan.amount;
                    if (pawnShop) pawnShop.cash += loan.amount;
                    console.log(`[AI] ${ai.name} spłacił pożyczkę lombardową w ${loan.bankName} (${loan.amount.toFixed(2)} PLN).`);
                    
                    // Odblokuj akcje
                    const holding = ai.portfolio[loan.collateral.symbol];
                    if (holding && holding.lockedShares) {
                        holding.lockedShares = Math.max(0, holding.lockedShares - loan.collateral.quantity);
                    }
                    ai.loans.splice(i, 1);
                
                } else {
                    // AI nie ma pieniędzy - DEFAULT
                    console.log(`[AI] ❌ ${ai.name} NIE SPŁACIŁ pożyczki lombardowej! ${loan.bankName} przejmuje ${loan.collateral.quantity} akcji ${loan.collateral.symbol}!`);

                    // Przeniesienie akcji
                    const holding = ai.portfolio[loan.collateral.symbol];
                    if (holding) {
                        holding.shares = Math.max(0, holding.shares - loan.collateral.quantity);
                        holding.lockedShares = Math.max(0, Math.min((holding.lockedShares || 0) - loan.collateral.quantity, holding.shares));
                        if (holding.shares <= 0) delete ai.portfolio[loan.collateral.symbol];
                    }
                    if (pawnShop) {
                        if (!pawnShop.holdingPortfolio) pawnShop.holdingPortfolio = {};
                        const pawnHolding = pawnShop.holdingPortfolio[loan.collateral.symbol];
                        if (pawnHolding) {
                            pawnHolding.quantity += loan.collateral.quantity;
                        } else {
                            const stock = stocks.find(s => s.symbol === loan.collateral.symbol);
                            pawnShop.holdingPortfolio[loan.collateral.symbol] = {
                                quantity: loan.collateral.quantity,
                                purchasePrice: stock ? stock.price : 0
                            };
                        }
                    }
                    ai.loans.splice(i, 1);
                }
            }
        } // Koniec pętli lombardowej

        // Teraz obsłuż normalne kredyty (bankowe i windykacyjne)
        {
            let paidLoanThisTurn = false;
            for (let i = ai.loans.length - 1; i >= 0; i--) {
                const loan = ai.loans[i];
                if (loan.isPawnLoan) continue; // Pomiń lombardowe, już obsłużone

                // Naprawa kredytów ze starych zapisów (hipoteki bez oprocentowania → NaN).
                if (!Number.isFinite(loan.interestRate)) loan.interestRate = getLoanRate() * 1.1;
                if (!Number.isFinite(loan.amount)) loan.amount = Math.max(0, Number(loan.weeklyPayment) || 0) * 26;
                if (!Number.isFinite(ai.cash)) ai.cash = 0;

                // Obliczanie odsetek
                const weeklyInterestRate = loan.interestRate / 52;
                loan.amount += loan.amount * weeklyInterestRate; 

                if (ai.cash >= loan.weeklyPayment) {
                    loan.missedPayments = 0;
                    if (loan.bankId && typeof recordBankInterestIncome === 'function') recordBankInterestIncome(loan.bankId, loan.amount * weeklyInterestRate / (1 + weeklyInterestRate));
                    const payment = Math.min(loan.weeklyPayment, loan.amount);
                    ai.cash -= payment;
                    loan.amount -= payment;
                    paidLoanThisTurn = true; 
                    chargeAccountingFee(payment, ai.id);

                    // --- Kierowanie płatności ---
                    if (loan.collectorSymbol) {
                        const collector = stocks.find(s => s.symbol === loan.collectorSymbol);
                        if (collector) collector.cash += payment;
                    } else if (loan.bankId) {
                        const bank = commercialBanks.find(b => b.id === loan.bankId);
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
                    }
                    // --- Koniec kierowania ---

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
                    loan.missedPayments = (loan.missedPayments || 0) + 1;
                    const scorePenalty = 5;
                    ai.creditScore = Math.max(0, ai.creditScore - scorePenalty);
                    console.log(`[AI Kredyt] Wynik kredytowy ${ai.name} spadł do ${ai.creditScore} (-${scorePenalty}) za brak spłaty.`);

                    // Windykator twardy: egzekucja akcji dłużnika przy zaległościach
                    if (loan.collectorSymbol && loan.missedPayments >= 2) {
                        const collector = stocks.find(s => s.symbol === loan.collectorSymbol);
                        if (collector) {
                            for (const sym in ai.portfolio) {
                                const h = ai.portfolio[sym];
                                if (!h || h.shares <= 0 || h.assetType === 'Startup') continue;
                                const st = stocks.find(s => s.symbol === sym);
                                if (!st || st.price <= 0) continue;

                                const neededVal = Math.min(loan.amount, loan.weeklyPayment * 4);
                                const free = h.shares - (h.lockedShares || 0); // 0.15.0.1 B4: akcje w zastawie zostają
                                const sharesToSeize = Math.min(free, Math.ceil(neededVal / (st.price * 0.8)));
                                if (sharesToSeize <= 0) continue;

                                h.shares -= sharesToSeize;
                                if (h.shares <= 0) delete ai.portfolio[sym];

                                if (!collector.holdingPortfolio) collector.holdingPortfolio = {};
                                if (!collector.holdingPortfolio[sym]) {
                                    collector.holdingPortfolio[sym] = { quantity: 0, purchasePrice: st.price * 0.8 };
                                }
                                collector.holdingPortfolio[sym].quantity += sharesToSeize;

                                const recovered = Math.round(sharesToSeize * st.price * 0.8);
                                loan.amount = Math.max(0, loan.amount - recovered);
                                loan.missedPayments = 0;

                                if (typeof logEvent === 'function') {
                                    logEvent(`⚖️ Windykator ${collector.name} zajął ${sharesToSeize} akcji ${sym} od bota ${ai.name} na poczet długu (odzyskane: ${formatZl(recovered, 0)}).`, 'review');
                                }
                                break;
                            }
                        }
                    }
                }
            } // Koniec pętli for
            
        }
    }
    // ===>>> KONIEC ZMODYFIKOWANEJ PĘTLI KREDYTOWEJ <<<===
}

function makeAiDecision(ai) {
  
    let targetStockSymbol = null;
    let targetStock = null;
    for (const symbol in ai.portfolio) {
        const stock = stocks.find(s => s.symbol === symbol);
        // Sprawdź, czy AI ma >50% udziałów, czy spółka jest celem, czy nie podjęto jeszcze obrony
        if (stock && 
            stock.mergerProcess && 
            (stock.mergerProcess.type === 'przejęcie' || stock.mergerProcess.type === 'influenceTakeover') &&
            stock.mergerProcess.initiatorSymbol !== stock.symbol && // Upewnij się, że AI jest celem, a nie inicjatorem
            !stock.mergerProcess.defenseActive && // Jeśli obrona nie jest już aktywna
            (ai.portfolio[symbol].shares / stock.totalShares) > 0.5) 
        {
            targetStockSymbol = symbol;
            targetStock = stock;
            break; // Znaleziono cel, przerwij pętlę
        }
    }

    // Jeśli AI jest atakowane, podejmuje decyzję o obronie
    if (targetStock) {
        const process = targetStock.mergerProcess;
        const offerPremium = process.offerDetails.premium; // Premia (np. 0.25 dla 25%)

        let defenseChance = 0.5; // Bazowa szansa na podjęcie walki

        // Modyfikatory szansy na obronę w zależności od osobowości
        switch (ai.personality) {
            case 'calm':
                if (offerPremium > 0.3) defenseChance = 0.05; // Zaakceptuje dobrą ofertę
                else defenseChance = 0.6; // Będzie walczył, jeśli oferta jest słaba
                break;
            case 'reckless':
            case 'yolo_trader':
                defenseChance = 0.3; // Mniej zainteresowani obroną, wolą szybką gotówkę
                break;
            case 'whale':
            case 'pro_investor':
                defenseChance = 0.8; // Będą walczyć o swoje aktywa
                if (offerPremium > 0.4) defenseChance = 0.2; // Ale skuszą się na bardzo wysoką premię
                break;
            case 'dividend_chaser':
                defenseChance = 0.9; // Będzie walczył o swoje spółki dywidendowe
                break;
            case 'banker':
                 defenseChance = 0.7; // Bankier jest ostrożny
                break;
        }

        // CEO celu (jeśli jest "Oddany") zwiększa szansę obrony
        if (targetStock.ceo?.traits?.some(t => t.id === 'oddany')) {
            defenseChance += 0.25;
        }
        
        // Finalna decyzja
        if (Math.random() < defenseChance) {
            // AI decyduje się na obronę -> aktywuj "Zatrutą Pigułkę"
            console.log(`[M&A AI Obrona] ${ai.name} aktywuje "Zatrutą Pigułkę" w ${targetStock.symbol}!`);
            activateDefenseMechanism(targetStock.symbol, chooseDefenseForPersonality(ai.personality, targetStock, ai.id), ai.id);
            return; // AI podjęło akcję obronną, kończy turę
        } else {
            // AI nie aktywuje obrony (akceptuje ofertę lub czeka)
            console.log(`[M&A AI Obrona] ${ai.name} postanawia nie bronić aktywnie ${targetStock.symbol}.`);
            // Oznaczamy proces, aby AI nie pytało ponownie
            targetStock.mergerProcess.defenseActive = 'none'; // Flaga oznaczająca podjęcie decyzji o braku obrony
            return;
        }
    }
    // ===>>> KONIEC SEKCJI REAKCJI NA PRZEJĘCIE <<<===


    // Podstawowe sprawdzenia i dostępne akcje
    const accessibleStocks = stocks.filter(s => {
        // AI nie handluje startupami, REITami, Instytutami
        if (s.assetType || s.isBankrupt) return false;
        const exchange = exchanges[s.exchange];
        // Sprawdź dostęp do giełdy i czy spółka nie jest zablokowana
        return exchange && exchange.level <= ai.accessLevel && !s.isTradeLocked && canBotInvestIn(ai, s);
    });
    // Bankier może działać (np. zarządzać depozytami/kredytami) nawet bez dostępnych akcji
    if (accessibleStocks.length === 0 && ai.personality !== 'banker') return;

    const portfolioSize = Object.keys(ai.portfolio).length;
    const aiNetWorth = calculateNetWorth(ai); // Oblicz raz na turę
    const cashRatio = (aiNetWorth > 0) ? ai.cash / aiNetWorth : 1.0; // Stosunek gotówki do wartości netto (unikaj dzielenia przez zero)
    const activeInvestmentBanks = commercialBanks.filter(b => b.isActive && b.type === BANK_TYPES.INVESTMENT);


    // Raty i odsetki kredytów: processAiLoansWeekly (pętla tygodniowa).


    // Główna logika inwestycyjna zależna od osobowości
    switch (ai.personality) {
        case 'reckless':
        case 'yolo_trader': {
            const regime = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
            const isBullOrEuphoria = regime?.phase === 'bull' || regime?.phase === 'euphoria';
            const isBearOrCrash = regime?.phase === 'bear' || regime?.phase === 'capitulation' || (typeof marketCrashState !== 'undefined' && marketCrashState?.active);

            // 0.15 H5: W bessie/kapitulacji/krachu spekulanci uciekają z rynku — sprzedaż 30–50% pozycji
            if (isBearOrCrash && portfolioSize > 0 && Math.random() < 0.6) {
                for (const symbol in ai.portfolio) {
                    const holding = ai.portfolio[symbol];
                    if (holding?.assetType === 'Startup') continue;
                    const sharesToDump = Math.max(1, Math.floor(holding.shares * getRandomInRange(0.30, 0.50)));
                    aiSellStock(ai, symbol, sharesToDump);
                }
                return;
            }

            const currentLoansValue = (ai.loans || []).reduce((sum, l) => sum + l.amount, 0);
            let baseLeverageCap = typeof getKnfLeverageCap === 'function' 
                ? getKnfLeverageCap(ai.personality) 
                : (ai.personality === 'yolo_trader' ? 0.7 : 0.5); // Yolo bardziej ryzykuje
            // 0.15 H5: W hossie/euforii biorą więcej kredytu (lewar +25%)
            if (isBullOrEuphoria) {
                baseLeverageCap = Math.min(0.90, baseLeverageCap * 1.25);
            }
            const maxLeverageRatio = baseLeverageCap;

            // --- Priorytet spłaty długu (jeśli nadmiar gotówki) ---
            if (cashRatio > 0.6 && currentLoansValue > 0) {
                ai.loans.sort((a, b) => b.interestRate - a.interestRate); // Spłać najdroższy
                const loanToRepay = ai.loans[0];
                const repaymentAmount = Math.min(loanToRepay.amount, ai.cash * 0.5); // Użyj 50% gotówki na spłatę
                if (repaymentAmount > 100) {
                     if (aiRepayLoan(ai, loanToRepay.id, repaymentAmount)) {
                        console.log(`[AI ${ai.personality}] ${ai.name} spłacił ${repaymentAmount.toFixed(0)} PLN pożyczki (nadmiar gotówki).`);
                        return; // Zrób tylko to w tej turze
                     }
                }
            }
            // --- Koniec spłaty długu ---

            if (Math.random() < 0.5) { // Szansa na akcję giełdową
                // Próba zakupu ryzykownych akcji
                if (Math.random() < 0.7 || portfolioSize === 0) {
                    let stockToBuy = null;
                    if (isBullOrEuphoria) {
                        // 0.15 H5: kupują spółki z największym wzrostem z 4 tygodni (ranking weekly)
                        const ranked = accessibleStocks.map(s => {
                            const closes = s.weeklyCloses || [];
                            const ref = closes[closes.length - 4] || closes[0] || s.price;
                            const chg = ref > 0 ? (s.price / ref - 1) : 0;
                            return { stock: s, chg };
                        }).sort((a, b) => b.chg - a.chg);
                        if (ranked.length > 0) {
                            const topCandidates = ranked.slice(0, Math.min(3, ranked.length)).map(r => r.stock);
                            stockToBuy = getRandomElement(topCandidates);
                        }
                    }
                    if (!stockToBuy) {
                        stockToBuy = getRandomElement(accessibleStocks.filter(s => s.volatilityFactor > 1.5 && s.financialHealth >= -1));
                    }
                    if (stockToBuy) {
                        const desiredInvestment = ai.cash * getRandomInRange(0.4, 0.8);
                        const desiredQuantity = Math.floor(desiredInvestment / stockToBuy.price);
                        const affordableQuantity = Math.floor(ai.cash / stockToBuy.price);

                        if (desiredQuantity > 0) {
                            if (affordableQuantity >= desiredQuantity) {
                                aiBuyStock(ai, stockToBuy.symbol, desiredQuantity);
                            } 
                            // --- Logika brania kredytu ---
                            else if (affordableQuantity < desiredQuantity && 
                                     (currentLoansValue / aiNetWorth) < maxLeverageRatio && 
                                     ai.creditScore > 60 && 
                                     Math.random() < 0.4) 
                            {
                                const neededCash = (desiredQuantity - affordableQuantity) * stockToBuy.price;
                                // Uproszczone do zwykłego kredytu
                                if (aiTakeLoan(ai, neededCash)) { 
                                    const nowAffordable = Math.floor(ai.cash / stockToBuy.price);
                                    if (nowAffordable >= desiredQuantity) aiBuyStock(ai, stockToBuy.symbol, desiredQuantity);
                                    else if (nowAffordable > 0) aiBuyStock(ai, stockToBuy.symbol, nowAffordable);
                                } else if (affordableQuantity > 0) {
                                    aiBuyStock(ai, stockToBuy.symbol, affordableQuantity); 
                                }
                            } else if (affordableQuantity > 0) {
                                aiBuyStock(ai, stockToBuy.symbol, affordableQuantity); 
                            }
                            // --- Koniec logiki kredytu ---
                        }
                    }
                }
                // Próba sprzedaży (losowa)
                else if (portfolioSize > 0) {
                    const randomOwnedSymbol = getRandomElement(Object.keys(ai.portfolio));
                    if (ai.portfolio[randomOwnedSymbol] && ai.portfolio[randomOwnedSymbol].assetType !== 'Startup') {
                        const sharesToSell = Math.max(1, Math.floor(ai.portfolio[randomOwnedSymbol].shares * 0.5));
                        aiSellStock(ai, randomOwnedSymbol, sharesToSell);
                    }
                }
            }

            // Inwestycje w startupy (jeśli ma umiejętność)
            if (aiCanInvestInStartups(ai)) { // 0.13.1 (B7)
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
        }

        case 'police_chief': {
            // Komendant Jakub: kocha spółki defensywne, nie lubi nowych spółek
            if (Math.random() < 0.5) {
                // Sprzedaż: realizuje zyski powyżej 35% lub przy katastrofalnej kondycji
                for (const symbol in ai.portfolio) {
                    const holding = ai.portfolio[symbol];
                    const stock = stocks.find(s => s.symbol === symbol);
                    if (!stock) continue;
                    if (stock.price > holding.avgPrice * 1.35 || stock.financialHealth <= -4) {
                        aiSellStock(ai, symbol, holding.shares);
                        return;
                    }
                }

                // Zakup: tylko sektory defensywne, nie lubi nowych spółek
                const defPool = accessibleStocks.filter(s => {
                    if (!s || s.assetType === 'Startup' || s.isBankrupt) return false;
                    if (typeof isStockDefensive === 'function' && !isStockDefensive(s)) return false;
                    if (s.companyAge !== undefined && s.companyAge < 8) return false;
                    return true;
                });

                if (defPool.length > 0) {
                    const stockToBuy = getRandomElement(defPool);
                    if (stockToBuy) {
                        const targetShares = Math.max(1, Math.floor(2500 / Math.max(0.01, stockToBuy.price)));
                        const cost = targetShares * stockToBuy.price;
                        const subsidy = ai.cash < cost ? takeFromTreasury(Math.max(1000, Math.ceil(cost - ai.cash) + 500)) : 0; // 0.15.0.1 B6: ze skarbu państwa
                        if (subsidy > 0) {
                            ai.cash += subsidy;
                            if (typeof logEvent === 'function') {
                                logEvent(`🚓 Komendant Jakub otrzymał państwową dopłatę (${formatZl(subsidy, 0)}) na zakup akcji defensywnych ${stockToBuy.name}.`, 'state');
                            }
                        }
                        const buyShares = Math.min(targetShares, Math.floor(ai.cash / stockToBuy.price));
                        if (buyShares > 0) {
                            aiBuyStock(ai, stockToBuy.symbol, buyShares);
                        }
                    }
                }
            }
            break;
        }

        case 'calm':
        case 'dividend_chaser':
            if (ai.personality === 'dividend_chaser') {
                runAiMarian(ai); // Marian ma swoją logikę
            } else { // Logika dla 'calm'
                if (Math.random() < 0.25) {
                    const calmRegime = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
                    const calmPremium = calmRegime?.premium ?? 0;
                    const calmSentiment = calmRegime?.sentiment ?? 50;

                    // 0.15 H5: calm redukuje pozycje przy premii rynku > +20%
                    if (calmPremium > 0.20) {
                        for (const symbol in ai.portfolio) {
                            const holding = ai.portfolio[symbol];
                            if (holding.assetType === 'Startup') continue;
                            const toSell = Math.max(1, Math.floor(holding.shares * 0.3));
                            aiSellStock(ai, symbol, toSell);
                            return;
                        }
                    }

                    for (const symbol in ai.portfolio) {
                        const holding = ai.portfolio[symbol];
                        if (holding.assetType === 'Startup') continue;
                        const marketData = stocks.find(s => s.symbol === symbol);
                        if (marketData && (marketData.price > holding.avgPrice * 1.3 || marketData.financialHealth <= -4)) {
                            aiSellStock(ai, symbol, holding.shares);
                            return;
                        }
                    }
                    // 0.15 H5: calm kupuje chętniej przy wskaźniku strachu < 25
                    let calmPool = accessibleStocks.filter(s => s.volatilityFactor < 1.2 && s.financialHealth >= 0);
                    if (calmSentiment < 25) {
                        calmPool = accessibleStocks.filter(s => s.financialHealth >= 1);
                    }
                    const stockToBuy = getRandomElement(calmPool);
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
                const proRegime = typeof getMarketRegime === 'function' ? getMarketRegime('home') : null;
                const proPremium = proRegime?.premium ?? 0;
                const proSentiment = proRegime?.sentiment ?? 50;

                // 0.15 H5: pro_investor redukuje pozycje przy premii rynku > +20%
                if (ai.personality === 'pro_investor' && proPremium > 0.20 && Math.random() < 0.5) {
                    for (const symbol in ai.portfolio) {
                        const holding = ai.portfolio[symbol];
                        if (holding.assetType === 'Startup') continue;
                        const toSell = Math.max(1, Math.floor(holding.shares * 0.35));
                        aiSellStock(ai, symbol, toSell);
                        return;
                    }
                }

                // Sprzedaż
                for (const symbol in ai.portfolio) {
                    const holding = ai.portfolio[symbol];
                    if (holding.assetType === 'Startup') continue;
                    const stock = stocks.find(s => s.symbol === symbol);
                    if (!stock) continue; 
                    const profitTarget = ai.personality === 'pro_investor' ? 1.25 : 1.35;
                    const healthThreshold = ai.personality === 'pro_investor' ? -1 : 0;
                    if (stock.price > holding.avgPrice * profitTarget || stock.financialHealth < healthThreshold) {
                        aiSellStock(ai, symbol, holding.shares);
                        return;
                    }
                }

                // Inwestycje w startupy (jeśli ma umiejętność)
                if (aiCanInvestInStartups(ai)) { // 0.13.1 (B7)
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

                // Zakup najlepszych akcji
                const isAccumulation = proRegime?.phase === 'accumulation';
                const allowsBuy = (portfolioSize < (ai.personality === 'pro_investor' ? 3 : 5)) || (ai.personality === 'whale' && isAccumulation) || (ai.personality === 'pro_investor' && proSentiment < 25);
                if (allowsBuy) {
                    const healthMin = ai.personality === 'pro_investor' ? 1 : (isAccumulation ? 0 : 2);
                    const bestBuys = accessibleStocks.filter(s => s.financialHealth >= healthMin).sort((a, b) => b.financialHealth - a.financialHealth);
                    if (bestBuys.length > 0) {
                        const stockToBuy = bestBuys[0];
                        const neededCash = stockToBuy.price * (ai.personality === 'pro_investor' ? 5 : 10);
                        if (ai.cash < neededCash && ai.cash > (neededCash * (ai.personality === 'pro_investor' ? 0.7 : 0.5))) {
                             const loanAmount = neededCash * (ai.personality === 'pro_investor' ? 0.3 : 0.5);
                             aiTakeLoan(ai, loanAmount);
                        }
                        // 0.15 H5: whale kupuje duże pakiety w Akumulacji
                        const buyFraction = (ai.personality === 'whale' && isAccumulation) ? 0.60 : (ai.personality === 'pro_investor' ? 0.33 : 0.4);
                        const quantity = Math.floor((ai.cash * buyFraction) / stockToBuy.price);
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
                        const ownsTooMuch = ai.portfolio[symbol] && stock && stock.totalShares > 0 && (ai.portfolio[symbol].shares / stock.totalShares) > 0.2; 
                        if (stock && bankHolding.shares > 0 && stock.financialHealth >= 1 && !ownsTooMuch) {
                            const bankSellPrice = stock.price * 1.10;
                            const acceptablePremium = ai.portfolio[symbol] ? ai.portfolio[symbol].avgPrice * 1.15 : bankSellPrice * 1.01;
                            if (bankSellPrice <= acceptablePremium) {
                                const maxAffordableQuantity = Math.floor(ai.cash * 0.3 / bankSellPrice);
                                const buyQuantity = Math.min(bankHolding.shares, maxAffordableQuantity, getRandomIntInRange(10, 100));
                                if (buyQuantity > 0) {
                                    if (aiBuySharesFromInvestmentBank(ai, bank.id, symbol, buyQuantity)) {
                                        console.log(`[AI ${ai.personality}] ${ai.name} strategicznie kupił ${buyQuantity} ${symbol} od banku ${bank.name}.`);
                                        return; 
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
                        return;
                    }
                }
            }
            break; // Koniec whale/pro_investor

        case 'banker':
            const banker = ai;
            const bankerNetWorth = aiNetWorth;
            const bankerPortfolioSize = portfolioSize;
            const financeSectors = ['Finanse', 'Bankowość'];

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
            const cashRatioBanker = cashRatio;
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
            const currentLoansValueBanker = (banker.loans || []).reduce((sum, l) => sum + l.amount, 0);
            const maxLeverageRatioBanker = 0.4;
            if (cashRatioBanker < 0.15 && (currentLoansValueBanker / bankerNetWorth) < maxLeverageRatioBanker) {
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
                        for (const sym in banker.portfolio) {
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

    // Spłata Pożyczek (jeśli AI ma nadmiar gotówki) - OPRÓCZ BANKIERA (ma swoją logikę)
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
/** 0.13.1 (B7): boty-inwestorzy finansują startupy także bez szkolenia (poza animatorem rynku, mafią i Gwardią). */
function aiCanInvestInStartups(ai) {
    if (!ai || ai.isMafia || ai.isGuard || ai.personality === 'market_maker') return false;
    return (ai.unlockedSkills?.['startupInvestor'] || 0) >= 1 || ['pro_investor', 'yolo_trader', 'reckless', 'whale', 'calm', 'dividend_chaser'].includes(ai.personality);
}

function aiInvestInStartup(ai, symbol, amount) {
    const startup = stocks.find(s => s.symbol === symbol);
    if (!startup || startup.assetType !== 'Startup') return;
    amount = Math.min(amount * (startup.operatorStartup || typeof getStartupFundingFactor !== 'function' ? 1 : getStartupFundingFactor()), typeof getStartupFundingGap === 'function' ? getStartupFundingGap(startup) : amount); // 0.13.1 (B6): najwyżej brakująca kwota celu; D2: mniej na nasyconym rynku
    if (ai.cash < amount || !(amount >= 1)) {
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
            const availableShares = getAvailableShares(stock); // wolny obrót bez pakietów inwestorów, insiderów i akcji własnych

            if (sharesToBuy > 0 && sharesToBuy <= availableShares) {
                // Pakiet państwa jest poza wolnym obrotem (getFreeFloatShares) — sharesHeld się nie zmienia.
                const newTotalStateShares = (stock.totalShares * stock.stateOwnershipPct) + sharesToBuy;
                stock.stateOwnershipPct = newTotalStateShares / stock.totalShares;
                logEvent(`🏛️ Skarb Państwa dokupuje pakiet 2% akcji w ${stock.name}, aby wzmocnić swoją pozycję.`, 'market');
            }
        }
        // Jeśli państwo ma za dużo udziałów, sprzedaje mały pakiet
        else if (stock.stateOwnershipPct > 0.95) {
            const sharesToSell = Math.floor(stock.totalShares * 0.01); // Sprzedaj 1%
            if (sharesToSell > 0) {
                // Sprzedaż pakietu państwa powiększa wolny obrót; akcje inwestorów (sharesHeld) bez zmian.
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
                
                const availableShares = getAvailableShares(targetStock);

                const cost = sharesToBuy * targetStock.price;
                if (sharesToBuy > 0 && sharesToBuy <= availableShares && governmentTreasury >= cost) {
                    governmentTreasury -= cost; // zakup z rynku (pakiet państwa jest poza wolnym obrotem)
                    targetStock.stateOwnershipPct = (Number(targetStock.stateOwnershipPct) || 0) + sharesToBuy / targetStock.totalShares;
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
    const liabilities = Number(stock.balanceSheet?.liabilities) || 0;
    if (liabilities > marketValue * 0.2 && stock.financialHealth < -1 && ai.cash > liabilities * 0.1) {
        const bailoutAmount = Math.min(ai.cash * 0.2, liabilities); // AI używa 20% swojej gotówki na ratunek
        if (bailoutAmount > 0) {
            // Bot spłaca część długu spółki ze swojej gotówki (wcześniej płacił fundusz gracza).
            ai.cash -= bailoutAmount;
            adjustBalanceSheet(stock, { liabilities: -bailoutAmount, retainedEarnings: bailoutAmount });
            stock.financialHealth = Math.min(5, stock.financialHealth + 1);
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
             setCompanyDividendPolicy(stock, desiredPolicy);
             stock.dividendPolicyLockedByOwner = true;
             logEvent(`[AI] 👑 ${ai.name} jako główny udziałowiec zmienia politykę dywidendową ${stock.name} na: ${getDividendPolicyLabel(desiredPolicy)}!`, 'review');
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
            const availableShares = getAvailableShares(targetStock);

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
    if (ai.personality === 'whale' && !cityInvestment.aiHasUnlocked && ai.cash > 20000) {
        aiDonateToCity(ai, 10000);
        return;
    }

    if (currentCollateralAuction && getAuctionNow() < currentCollateralAuction.endTime && ai.hasTBillAccess) { // Używamy TBillAccess jako ogólnego dostępu do aukcji BC
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
    if (currentTBillAuction && getAuctionNow() < currentTBillAuction.endTime && ai.hasTBillAccess) {
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

// =================================================================================
// 0.14.2 P5: BANK INWESTYCYJNY — „PAKIET DO ODSPRZEDAŻY”, POPULARNE SPÓŁKI, PORTFEL SKONCENTROWANY
// =================================================================================
const IB_MAX_POSITIONS = 12;
const IB_MIN_POSITION = 0.01;          // minimalna pozycja: 1% akcji spółki
const IB_DUST_POSITION = 0.005;        // pozycje < 0,5% bank sprzedaje
const IB_BLOCK_HOLDER = [0.40, 0.50];  // posiadacz blisko kontroli
const IB_BLOCK_TARGET = [0.10, 0.15];  // pakiet banku
const IB_RESALE_PREMIUM = [0.10, 0.20];
const IB_RESALE_CHANCE = 0.10;         // na turę: bot/spółka „chce przekroczyć 50%” i odkupuje pakiet
const IB_POPULAR_TOP = 5;
const IB_OFFER_QUARTERS = 2;           // oferta dla gracza ważna 2 kwartały
const IB_IGNORED_HOLDERS = ['insiders', 'state', 'city', 'etf', 'bank', 'wallet'];

function ensureInvestmentBankState(bank) {
    if (!bank.stockPortfolio) bank.stockPortfolio = {};
    if (!bank.resaleBlocks) bank.resaleBlocks = {};      // symbol → { holderId, kind }
    if (!bank.resaleStats) bank.resaleStats = { blocks: 0, resold: 0, tender: 0 };
    return bank;
}

/** Posiadacz z 40–50% akcji (kandydat do odkupienia pakietu) albo null. */
function findNearControlHolder(stock, bank) {
    const top = getShareholders(stock).find(h => !IB_IGNORED_HOLDERS.includes(h.kind) && h.id !== bank.id);
    return top && top.pct >= IB_BLOCK_HOLDER[0] && top.pct <= IB_BLOCK_HOLDER[1] ? top : null;
}

/** Spółki najpopularniejsze w ostatnim kwartale (obrót). */
function getPopularStocks(limit = IB_POPULAR_TOP) {
    return stocks.filter(s => !s.assetType && !s.isBankrupt && !s.isTradeLocked && (Number(s.lastTurnover) || 0) > 0)
        .sort((a, b) => (b.lastTurnover || 0) - (a.lastTurnover || 0)).slice(0, limit);
}

function ibSell(bank, stock, quantity) {
    const holding = bank.stockPortfolio[stock.symbol];
    quantity = Math.min(Math.floor(quantity), holding?.shares || 0);
    if (!(quantity > 0)) return 0;
    const proceeds = stock.price * quantity;
    bank.cash += proceeds;
    if (typeof chargeMarketCommission === 'function') chargeMarketCommission(stock, proceeds, bank);
    holding.shares -= quantity;
    stock.sharesHeld -= quantity; // akcje wracają na rynek
    if (holding.shares <= 0) { delete bank.stockPortfolio[stock.symbol]; delete bank.resaleBlocks[stock.symbol]; }
    return quantity;
}

function ibBuy(bank, stock, quantity, tag) {
    quantity = Math.min(Math.floor(quantity), getAvailableShares(stock), Math.floor(bank.cash / Math.max(0.01, stock.price)));
    if (!(quantity > 0)) return 0;
    const cost = quantity * stock.price;
    bank.cash -= cost;
    const existing = bank.stockPortfolio[stock.symbol];
    bank.stockPortfolio[stock.symbol] = existing
        ? { ...existing, shares: existing.shares + quantity, avgPrice: (existing.avgPrice * existing.shares + cost) / (existing.shares + quantity) }
        : { shares: quantity, avgPrice: stock.price, tag };
    stock.sharesHeld += quantity;
    if (typeof chargeMarketCommission === 'function') chargeMarketCommission(stock, cost, bank);
    return quantity;
}

/** Przeniesienie pakietu z banku do kupującego (bot, fundusz bota, spółka, gracz) po cenie z premią. */
function transferBankBlock(bank, stock, holder, shares, price) {
    const cost = shares * price;
    const take = () => { const h = bank.stockPortfolio[stock.symbol]; h.shares -= shares; if (h.shares <= 0) { delete bank.stockPortfolio[stock.symbol]; delete bank.resaleBlocks[stock.symbol]; } bank.cash += cost; };
    if (holder.kind === 'ai') {
        const ai = holder.entity; if (!ai || ai.cash < cost) return false;
        ai.cash -= cost; const h = ai.portfolio[stock.symbol] || (ai.portfolio[stock.symbol] = { shares: 0, avgPrice: price });
        h.avgPrice = (h.avgPrice * h.shares + cost) / (h.shares + shares); h.shares += shares;
    } else if (holder.kind === 'botFund') {
        const fund = holder.entity?.fund; if (!fund || fund.cash < cost) return false;
        fund.cash -= cost; const h = fund.portfolio[stock.symbol] || (fund.portfolio[stock.symbol] = { shares: 0, avgPrice: price });
        h.avgPrice = (h.avgPrice * h.shares + cost) / (h.shares + shares); h.shares += shares;
    } else if (holder.kind === 'company') {
        const owner = holder.entity; if (!owner || (Number(owner.cash) || 0) < cost) return false;
        adjustCompanyCash(owner, -cost);
        owner.equityStakes = owner.equityStakes || {}; owner.equityStakes[stock.symbol] = (owner.equityStakes[stock.symbol] || 0) + shares;
    } else if (holder.kind === 'player') {
        if (playerCash < cost) return false;
        playerCash -= cost;
        const h = playerPortfolio[stock.symbol] || (playerPortfolio[stock.symbol] = { shares: 0, avgPrice: price, assetType: 'stock' });
        h.avgPrice = (h.avgPrice * h.shares + cost) / (h.shares + shares); h.shares += shares;
        recordPayment('player-fund', `external:${bank.id}`, cost, `Pakiet ${stock.symbol} od ${bank.name}`);
    } else return false;
    take();
    return true;
}

/** Gracz przyjmuje ofertę pakietu od banku inwestycyjnego (mail). */
function acceptBankBlockOffer(bankId) {
    const bank = commercialBanks.find(b => b.id === bankId);
    const offer = bank?.resaleOffer;
    const stock = offer && stocks.find(s => s.symbol === offer.symbol);
    const held = stock && bank.stockPortfolio[stock.symbol]?.shares || 0;
    if (!stock || held < offer.shares) { showToast('Oferta pakietu wygasła.', 'default'); if (bank) bank.resaleOffer = null; return false; }
    if (playerCash < offer.shares * offer.price) { showToast('Za mało gotówki funduszu.', 'error'); return false; }
    if (!transferBankBlock(bank, stock, { kind: 'player' }, offer.shares, offer.price)) return false;
    bank.resaleOffer = null;
    bank.resaleStats.resold++;
    logEvent(`🏦 Fundusz odkupuje od ${bank.name} pakiet ${offer.shares.toLocaleString('pl-PL')} akcji ${stock.name} po ${formatZl(offer.price)} (premia za kontrolę).`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

function runInvestmentBankAI(bank) {
    if (!bank.isActive || bank.type !== BANK_TYPES.INVESTMENT) return;
    ensureInvestmentBankState(bank);
    const quarter = typeof macro === 'object' ? macro.quarter : 0;

    // 1. Porządek: bankruci znikają, pozycje < 0,5% akcji idą na rynek.
    for (const symbol of Object.keys(bank.stockPortfolio)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (!stock || stock.isBankrupt) { delete bank.stockPortfolio[symbol]; delete bank.resaleBlocks[symbol]; continue; }
        if (bank.stockPortfolio[symbol].shares / Math.max(1, stock.totalShares) < IB_DUST_POSITION && !stock.isTradeLocked) { ibSell(bank, stock, bank.stockPortfolio[symbol].shares); return; }
    }
    // Ponad 12 pozycji (np. akcje z debiutu startupu, w który bank wpłacił) — sprzedaj najmniejszą (poza pakietem do odsprzedaży).
    if (Object.keys(bank.stockPortfolio).length > IB_MAX_POSITIONS) {
        const smallest = Object.entries(bank.stockPortfolio).filter(([symbol]) => !bank.resaleBlocks[symbol])
            .map(([symbol, h]) => ({ stock: stocks.find(s => s.symbol === symbol), h }))
            .filter(x => x.stock && !x.stock.isTradeLocked)
            .sort((a, b) => a.h.shares * a.stock.price - b.h.shares * b.stock.price)[0];
        if (smallest) { ibSell(bank, smallest.stock, smallest.h.shares); return; }
    }

    // 2. Pakiety do odsprzedaży: wezwanie → pakiet dla wzywającego; posiadacz 40–50% → odkupienie z premią.
    for (const [symbol, block] of Object.entries(bank.resaleBlocks)) {
        const stock = stocks.find(s => s.symbol === symbol);
        const holding = bank.stockPortfolio[symbol];
        if (!stock || !holding) { delete bank.resaleBlocks[symbol]; continue; }
        const pair = typeof getTakeoverAgainst === 'function' ? getTakeoverAgainst(stock) : null;
        const tenderPrice = pair?.process?.offerDetails?.buyoutPricePerShare;
        if (pair && tenderPrice > 0 && (Number(pair.initiator.cash) || 0) >= holding.shares * tenderPrice) {
            const shares = holding.shares;
            transferBankBlock(bank, stock, { kind: 'company', entity: pair.initiator }, shares, tenderPrice);
            bank.resaleStats.tender++;
            logEvent(`🏦 ${bank.name} sprzedaje w wezwaniu pakiet ${shares.toLocaleString('pl-PL')} akcji ${stock.name} spółce ${pair.initiator.name}.`, 'market');
            return;
        }
        const holder = getShareholders(stock).find(h => h.id === block.holderId);
        if (!holder || holder.pct > 0.5 || holder.pct < IB_BLOCK_HOLDER[0] - 0.05) { delete bank.resaleBlocks[symbol]; continue; } // posiadacz zmienił plany — zwykła pozycja
        const price = stock.price * (1 + getRandomInRange(...IB_RESALE_PREMIUM));
        if (holder.kind === 'player') {
            if (!bank.resaleOffer || quarter > bank.resaleOffer.expiresQuarter) {
                bank.resaleOffer = { symbol, shares: holding.shares, price, expiresQuarter: quarter + IB_OFFER_QUARTERS };
                if (typeof addMail === 'function') addMail({
                    sender: bank.name, subject: `🏦 Pakiet ${stock.name} do odkupienia`,
                    body: `${bank.name} ma ${holding.shares.toLocaleString('pl-PL')} akcji ${stock.name} (${(holding.shares / stock.totalShares * 100).toFixed(1)}%). Z Twoimi ${(holder.pct * 100).toFixed(1)}% to kontrola nad spółką. Cena ${formatZl(price)} za akcję (premia za kontrolę ${((price / stock.price - 1) * 100).toFixed(0)}%). Oferta ważna ${IB_OFFER_QUARTERS} kw.`,
                    importance: 2, symbol, action: { type: 'bankBlock', bankId: bank.id, symbol }
                });
            }
        } else if (Math.random() < IB_RESALE_CHANCE && transferBankBlock(bank, stock, holder, holding.shares, price)) {
            bank.resaleStats.resold++;
            logEvent(`🏦 ${holder.name} odkupuje od ${bank.name} pakiet akcji ${stock.name} z premią ${((price / stock.price - 1) * 100).toFixed(0)}% i przekracza 50%.`, 'market');
            return;
        }
    }

    // 3. Popularne spółki: sprzedaż, gdy wypadły z czołówki obrotu.
    const popular = getPopularStocks();
    for (const [symbol, holding] of Object.entries(bank.stockPortfolio)) {
        if (holding.tag !== 'popular' || popular.some(s => s.symbol === symbol)) continue;
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock && !stock.isTradeLocked && Math.random() < 0.3) { ibSell(bank, stock, holding.shares); return; }
    }

    // 4. Zakupy (najwyżej 12 pozycji, min. 1% akcji, tylko wolny obrót).
    const positions = Object.keys(bank.stockPortfolio).length;
    if (positions >= IB_MAX_POSITIONS || bank.cash <= (bank.initialCapital || 0) * 0.12) return;
    const eligible = s => !s.assetType && !s.isBankrupt && !s.isTradeLocked && !s.isBankStock && exchanges[s.exchange]?.level >= 1;
    for (const stock of stocks) {
        if (!eligible(stock) || bank.stockPortfolio[stock.symbol]) continue;
        const holder = findNearControlHolder(stock, bank);
        if (!holder) continue;
        const target = Math.floor(stock.totalShares * getRandomInRange(...IB_BLOCK_TARGET));
        if (Math.min(target, getAvailableShares(stock)) < stock.totalShares * IB_MIN_POSITION) continue;
        const bought = ibBuy(bank, stock, Math.min(target, Math.floor(bank.cash * 0.5 / stock.price)), 'block');
        if (bought >= stock.totalShares * IB_MIN_POSITION) {
            bank.resaleBlocks[stock.symbol] = { holderId: holder.id, kind: holder.kind, since: quarter };
            bank.resaleStats.blocks++;
            logEvent(`🏦 ${bank.name} skupuje ${bought.toLocaleString('pl-PL')} akcji ${stock.name} (${(bought / stock.totalShares * 100).toFixed(1)}%) — pakiet do odsprzedaży dla posiadacza ${(holder.pct * 100).toFixed(0)}%.`, 'market');
            return;
        }
    }
    for (const stock of popular) {
        if (!eligible(stock) || bank.stockPortfolio[stock.symbol]) continue;
        const quantity = Math.min(Math.floor(bank.cash * getRandomInRange(0.15, 0.25) / stock.price), Math.floor(stock.totalShares * 0.05));
        if (Math.min(quantity, getAvailableShares(stock)) < stock.totalShares * IB_MIN_POSITION) continue;
        if (ibBuy(bank, stock, quantity, 'popular') > 0) return;
    }
}

function aiMakeDeposit(ai, bankId, amount) {
    const bank = commercialBanks.find(b => b.id === bankId && b.isActive);
    if (!bank || isNaN(amount) || amount <= 0 || ai.cash < amount) {
        return false;
    }

    const interestRate = Number(bank.interestRateDeposit) || getDepositRate();

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

    if (loan.isPawnLoan || loan.collectorSymbol) {
        const creditorStock = stocks.find(s => s.symbol === loan.collectorSymbol);
        if (creditorStock) creditorStock.cash += amountToRepay;
    } else if (bank) {
        bank.cash += amountToRepay;
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

/**
 * AI decyduje, czy przyjąć ofertę przejęcia długu od windykatora.
 * @param {object} ai - Obiekt bota AI.
 * @param {object} collectorStock - Obiekt spółki WRN.
 * @param {object} loan - Obiekt pożyczki AI.
 * @param {number} newInterestRate - Nowe, wyższe oprocentowanie.
 */
function aiDecideOnDebtOffer(ai, collectorStock, loan, newInterestRate, takeoverCost = null) {
    let acceptChance = 0.30; // Zwiększona akceptacja restrukturyzacji

    if (ai.creditScore < 50 || (loan.missedPayments && loan.missedPayments >= 1)) {
        acceptChance = 0.95; // 95% szans przy problemach ze spłatą
    }

    if (ai.personality === 'reckless' || ai.personality === 'yolo_trader') {
        acceptChance += 0.10;
    }

    if (Math.random() < acceptChance) {
        console.log(`[AI Decyzja] ${ai.name} akceptuje ofertę przejęcia długu przez ${collectorStock.name}.`);
        executeDebtTransfer(collectorStock, ai, loan, newInterestRate, takeoverCost);
    } else {
        console.log(`[AI Decyzja] ${ai.name} odrzuca ofertę przejęcia długu.`);
    }
}

function aiDecideOnPawnOffer(ai, pawnShop, targetStock, quantity, loanAmount, newInterestRate, durationWeeks) {
    let acceptChance = 0.20; // Domyślnie to ryzykowna oferta

    // Jeśli AI ma mało gotówki lub niski credit score, jest bardziej zdesperowane
    const netWorth = calculateNetWorth(ai);
    const cashRatio = ai.cash / netWorth;
    if (cashRatio < 0.1 || ai.creditScore < 60) {
        acceptChance = 0.85; // 85% szans
    }

    // Osobowość
    if (ai.personality === 'reckless' || ai.personality === 'yolo_trader') {
        acceptChance = 0.95; // Prawie zawsze wezmą
    }
    if (ai.personality === 'calm' || ai.personality === 'pro_investor' || ai.personality === 'banker') {
        acceptChance = 0.1; // Prawie nigdy nie wezmą, wolą kredyt w banku
    }

    if (Math.random() < acceptChance) {
        // AI Akceptuje
        console.log(`[AI Decyzja] ${ai.name} akceptuje ofertę pożyczki lombardowej od ${pawnShop.name}.`);
        executePawnLoan(ai, pawnShop, targetStock, quantity, loanAmount, newInterestRate, durationWeeks);
    } else {
        // AI Odrzuca
        console.log(`[AI Decyzja] ${ai.name} odrzuca ofertę pożyczki lombardowej.`);
    }
}

function aiTakeMortgageLoan(ai, bankId, collateralSymbol, collateralQuantity, requestedAmount) {
    const bank = commercialBanks.find(b => b.id === bankId && b.type === BANK_TYPES.MORTGAGE);
    const stock = stocks.find(s => s.symbol === collateralSymbol && !s.assetType);
    const holding = ai.portfolio[collateralSymbol];

    // Podstawowa walidacja
    if (!bank || !bank.isActive || !stock || !holding || holding.shares < collateralQuantity || requestedAmount <= 0) {
        console.warn(`[AI Hipoteka] Walidacja nie powiodła się dla ${ai.name} przy próbie wzięcia hipoteki.`);
        return false;
    }

    const creditScoreThreshold = 50;
    if (ai.creditScore < creditScoreThreshold) {
        console.log(`[AI Hipoteka] ${ai.name} ma zbyt niski wynik kredytowy (${ai.creditScore}), aby wziąć hipotekę.`);
        return false; // Zablokuj wzięcie hipoteki
    }

    const collateralValue = stock.price * collateralQuantity;
    const maxLoanAmount = collateralValue * 0.5; // Max 50% wartości zastawu

    // Kwota, którą AI faktycznie pożyczy (nie więcej niż limit i nie więcej niż bank może)
    const finalLoanAmount = Math.min(requestedAmount, maxLoanAmount, bank.cash * 0.1);

    if (finalLoanAmount <= 0) {
        console.log(`[AI Hipoteka] ${ai.name} nie mógł wziąć hipoteki (kwota ${finalLoanAmount} <= 0).`);
        return false;
    }

    // Parametry pożyczki (takie same jak dla gracza)
    const interestRate = (Number(bank.interestRateLoan) || (getLoanRate() + (Number(bank.baseInterestRateMargin) || 0))) * 1.1;
    const loanDurationWeeks = 52;
    const maturityDate = Date.now() + (loanDurationWeeks * BASE_DELAYS.weekly / currentSpeedMultiplier);
    const weeklyRate = interestRate / 52;
    const weeklyPayment = finalLoanAmount * (weeklyRate * Math.pow(1 + weeklyRate, loanDurationWeeks)) / (Math.pow(1 + weeklyRate, loanDurationWeeks) - 1);

    // Transakcja
    ai.cash += finalLoanAmount; // AI otrzymuje gotówkę
    bank.cash -= finalLoanAmount; // Bank wypłaca
    // Dodaj pożyczkę do portfela banku
    if (!bank.loanPortfolio[ai.id]) bank.loanPortfolio[ai.id] = [];
    bank.loanPortfolio[ai.id].push({
        id: `mort_ai_${Date.now()}`,
        initialAmount: finalLoanAmount,
        remainingAmount: finalLoanAmount,
        interestRate: interestRate,
        collateral: { symbol: collateralSymbol, quantity: collateralQuantity }
    });

    // Zapisz pożyczkę u AI (potrzebujemy nowej struktury)
    if (!ai.loans) ai.loans = []; // Upewnij się, że tablica pożyczek istnieje
    ai.loans.push({
        id: `mort_ai_${Date.now()}`,
        bankId: bankId,
        bankName: bank.name,
        amount: finalLoanAmount, // Pozostała kwota
        interestRate: interestRate, // brak tego pola dawał NaN w odsetkach → NaN w gotówce bota
        weeklyPayment: weeklyPayment, // Rata
        maturityDate: maturityDate,
        collateral: { symbol: collateralSymbol, quantity: collateralQuantity }
    });

    // Zablokuj zastawione akcje w portfelu AI
    if (!holding.lockedShares) holding.lockedShares = 0;
    holding.lockedShares += collateralQuantity;

    console.log(`[AI Hipoteka] ${ai.name} wziął ${finalLoanAmount.toFixed(0)} PLN hipoteki w ${bank.name} pod zastaw ${collateralQuantity} ${collateralSymbol}.`);
    return true; // Sukces
}

function aiUseMediaInfluence(ai) {
    const skillLvl = ai.unlockedSkills['mediaManipulation'] || 0;
    if (skillLvl === 0) return; // AI nie ma tej umiejętności

    const costPR = 10000;
    const costBlackPR = 25000;
    
    // Znajdź spółkę, którą AI kontroluje (do Pozytywnego PR)
    const controlledStock = Object.keys(ai.portfolio).find(sym => {
        const s = stocks.find(s => s.symbol === sym);
        return s && !s.assetType && (ai.portfolio[sym].shares / s.totalShares) > 0.5;
    });

    // 1. Pozytywny PR (Działanie defensywne)
    if (controlledStock && ai.cash > costPR && (ai.personality === 'pro_investor' || ai.personality === 'whale' || ai.personality === 'banker')) {
        const stock = stocks.find(s => s.symbol === controlledStock);
        // Użyj PR, jeśli kondycja firmy spada LUB reputacja AI w niej jest niska
        if (stock.financialHealth < 0 || (stock.reputation[ai.id] && stock.reputation[ai.id] < 0)) {
            if (Math.random() < 0.25) { // 25% szans na reakcję
                ai.cash -= costPR;
                logEvent(`📰 ${stock.name} (kontrolowany przez ${ai.name}) publikuje sponsorowany artykuł, aby poprawić swój wizerunek.`, 'review');
                applyPriceEffect(stock.symbol, 0.03, 'positive', 'review');
                stock.prShieldExpiry = Date.now() + (BASE_DELAYS.quarterly / currentSpeedMultiplier);
                return; // AI podjęło akcję
            }
        }
    }

    // 2. Czarny PR (Działanie ofensywne) - Wymagany Lvl 2
    if (skillLvl < 2 || ai.cash < costBlackPR) return;

    // Tylko agresywne osobowości używają Czarnego PR
    if (ai.personality === 'reckless' || ai.personality === 'pro_investor' || ai.personality === 'whale') {
        if (Math.random() < 0.1) { // 10% szans w kwartale na próbę ataku
            
            // Znajdź cel (konkurenta)
            let targetStock = null;
            if (controlledStock) {
                // Jeśli AI kontroluje spółkę, atakuje rywala z sektora
                const controlled = stocks.find(s => s.symbol === controlledStock);
                targetStock = getRandomElement(stocks.filter(s => 
                    !s.assetType && !s.isBankrupt && s.sector.includes(getMainSector(controlled)) && s.symbol !== controlledStock
                ));
            } else {
                // Jeśli AI nie kontroluje niczego, atakuje losową spółkę
                targetStock = getRandomElement(stocks.filter(s => !s.assetType && !s.isBankrupt));
            }
            
            if (targetStock) {
                ai.cash -= costBlackPR;
                blackPRRiskCounter++; // Użycie przez AI również zwiększa globalne ryzyko!
                
                // Sprawdź, czy AI zostało wykryte
                const currentRisk = BLACK_PR_BASE_RISK + (blackPRRiskCounter * BLACK_PR_RISK_INCREASE);
                if (Math.random() < currentRisk) {
                    logEvent(`🚨 Śledztwo dziennikarskie wykryło próbę manipulacji rynkiem przez ${ai.name}!`, 'error');
                    // AI nie traci reputacji w ten sam sposób co gracz, ale jego atak się nie powiódł
                    return; // Atak AI nie powiódł się
                }

                // Atak AI się powiódł
                const outcomeRoll = Math.random();
                if (outcomeRoll < 0.05) { // Duży event
                    logEvent(`🔥 Skandal w ${targetStock.name} (spowodowany przez AI)!`, 'company');
                    applyPriceEffect(targetStock.symbol, -0.15, 'negative', 'company');
                } else if (outcomeRoll < 0.15) { // Obrona
                    logEvent(`🛡️ ${targetStock.name} skutecznie dementuje plotki (atak AI nie powiódł się).`, 'company');
                } else { // Mały event
                    logEvent(`📉 Pojawiły się plotki na temat ${targetStock.name} (spowodowane przez AI).`, 'company');
                    applyPriceEffect(targetStock.symbol, -0.05, 'negative', 'company');
                }
            }
        }
    }
}

// #################################################################################
// ## relations.js
// #################################################################################

// relations.js — Relacje gracza z botami i zakładka „Firma” (wersja 0.10.2, część M4)
//
// Każdy bot — inwestor giełdowy (aiCompetitors) i kolega z korporacji (corporation.managers) — ma relację
// z graczem w skali −100…100. Reguły:
//   • wymuszenie dywidendy w spółce, gdzie bot ma > 1% akcji: −0,25 pkt za każdy % jego akcji;
//   • działanie na szkodę spółki, w której bot jest większościowcem (zrzut pakietu, wrogie przejęcie): −10;
//   • współpraca: prezent, wsparcie kursu (zakup pakietu), datek dla jego spółki — relacja rośnie;
//   • nadzór i konsolidacja funduszu kolegi, przeskoczenie go w ocenie zarządu — relacja spada.
// Relacje powoli wracają do zera. Wrogi bot (< −40) szydzi w mailach, wzmacnia pozycję w spółkach gracza,
// próbuje przejąć jego spółki i rozsiewa plotki. Przyjazny (> 40) nie przeszkadza, daje rady i pozytywne
// maile, czasem sprzedaje pakiet z rabatem.

const RELATION_HOSTILE = -40;
const RELATION_FRIENDLY = 40;
const RELATION_DECAY = 0.05;            // co kwartał 5% drogi do zera
const RELATION_LOG_LIMIT = 30;
const GIFT_RELATION_PER_100 = 1;        // +1 pkt za 100 PLN prezentu
const GIFT_MAX_GAIN = 15;
const BOT_BLOCK_DISCOUNT = 0.05;

let botRelations = createBotRelations();

function createBotRelations() {
    return { values: {}, log: [], lastGift: {}, blockOffer: null };
}

function ensureBotRelations() {
    botRelations = { ...createBotRelations(), ...(botRelations || {}) };
    if (!Array.isArray(botRelations.log)) botRelations.log = [];
    return botRelations;
}

// =================================================================================
// UCZESTNICY I WARTOŚCI
// =================================================================================

/** Wszystkie osoby, z którymi gracz ma relacje: inwestorzy giełdowi i koledzy z firmy. */
function getRelationPeople() {
    const investors = aiCompetitors.filter(ai => ai.personality !== 'market_maker' && !ai.isMafia)
        .map(ai => ({ id: ai.id, name: ai.name, kind: 'investor', entity: ai }));
    const colleagues = (corporation?.managers || []).map(manager => ({ id: manager.id, name: manager.name, kind: 'colleague', entity: manager }));
    return [...colleagues, ...investors];
}

function findRelationPerson(id) {
    return getRelationPeople().find(person => person.id === id) || null;
}

function getRelation(id) {
    return Number(botRelations.values?.[id]) || 0;
}

function getRelationMood(value) {
    if (value <= -70) return { label: 'wróg', icon: '😡', cls: 'text-down' };
    if (value <= RELATION_HOSTILE) return { label: 'nieprzychylny', icon: '😠', cls: 'text-down' };
    if (value < -10) return { label: 'chłodny', icon: '😒', cls: 'text-muted' };
    if (value <= 10) return { label: 'neutralny', icon: '😐', cls: 'text-muted' };
    if (value < RELATION_FRIENDLY) return { label: 'życzliwy', icon: '🙂', cls: 'text-info' };
    if (value < 70) return { label: 'przyjazny', icon: '😊', cls: 'text-up' };
    return { label: 'sojusznik', icon: '🤝', cls: 'text-up' };
}

/** Zmiana relacji z wpisem do historii. */
function changeRelation(id, delta, reason) {
    ensureBotRelations();
    const person = findRelationPerson(id);
    if (!person || !Number.isFinite(delta) || Math.abs(delta) < 0.01) return 0;
    const before = getRelation(id);
    const after = Math.max(-100, Math.min(100, before + delta));
    botRelations.values[id] = after;
    botRelations.log.unshift({ id, name: person.name, delta: after - before, reason, at: typeof getMailClockMs === 'function' ? getMailClockMs() : Date.now() });
    botRelations.log.length = Math.min(botRelations.log.length, RELATION_LOG_LIMIT);
    return after - before;
}

/** Bot-inwestor z większością (> 50%) w spółce albo null. */
function getMajorityBot(stock) {
    const owner = findMajorityShareholder(stock);
    return owner?.kind === 'ai' ? owner.entity : null;
}

function getBotStakePct(ai, stock) {
    return (ai.portfolio?.[stock.symbol]?.shares || 0) / Math.max(1, stock.totalShares);
}

// =================================================================================
// REGUŁY (wołane z akcji gracza)
// =================================================================================

/** Wymuszenie dywidendy: −0,25 pkt za każdy % akcji bota (> 1%). */
function onPlayerForcedDividend(stock) {
    for (const ai of aiCompetitors) {
        const pct = getBotStakePct(ai, stock) * 100;
        if (pct > 1) changeRelation(ai.id, -0.25 * pct, `wymuszona dywidenda w ${stock.name}`);
    }
}

/** Handel funduszu: zrzut ≥ 1% akcji spółki bota szkodzi, zakup ≥ 0,5% wspiera jej kurs. */
function onFundTrade(stock, quantity, side) {
    const bot = getMajorityBot(stock);
    if (!bot) return;
    const pct = quantity / Math.max(1, stock.totalShares);
    if (side === 'sell' && pct >= 0.01) changeRelation(bot.id, -10, `zrzut pakietu ${stock.name}`);
    else if (side === 'buy' && pct >= 0.005) changeRelation(bot.id, 3, `wsparcie kursu ${stock.name}`);
}

/** Datek funduszu dla spółki bota. */
function onPlayerDonation(stock, amount) {
    const bot = getMajorityBot(stock);
    if (bot) changeRelation(bot.id, Math.min(10, amount / 500), `datek dla ${stock.name}`);
}

/** Spółka gracza (większość) atakuje spółkę bota — wrogie przejęcie to czyn na szkodę. */
function onTakeoverStartedRelations(initiator, target) {
    const bot = getMajorityBot(target);
    const playerControls = findMajorityShareholder(initiator)?.kind === 'player';
    if (bot && playerControls) changeRelation(bot.id, -10, `wrogie przejęcie ${target.name}`);
}

/** Koledzy z firmy: nadzór, konsolidacja, przeskoczenie w ocenie. */
function onColleagueEvent(managerId, kind) {
    const deltas = { supervise: -15, consolidate: -25, overtaken: -10 };
    const reasons = { supervise: 'przejęcie nadzoru nad jego funduszem', consolidate: 'konsolidacja jego funduszu', overtaken: 'zamiana stanowisk w ocenie zarządu' };
    if (deltas[kind]) changeRelation(managerId, deltas[kind], reasons[kind]);
}

/** Prezent z portfela prywatnego (współpraca). */
function giveGiftToBot(id, amount) {
    const person = findRelationPerson(id);
    amount = Math.floor(Number(amount));
    if (!person) return false;
    if (!(amount >= 100)) { showToast('Prezent: minimum 100 PLN.', 'warning'); return false; }
    if (playerWallet.cash < amount) { showToast('Za mało pieniędzy w portfelu prywatnym.', 'error'); return false; }
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    if (botRelations.lastGift[id] === quarter) { showToast(`${person.name} dostał już prezent w tym kwartale.`, 'warning'); return false; }
    // B1: charaktery i malejący efekt — przyjaźni nie da się po prostu kupić.
    const personality = person.entity.personality;
    if (personality === 'calm') { showToast(`${person.name} grzecznie odmawia przyjęcia prezentu.`, 'default'); return false; }
    if (['whale', 'pro_investor'].includes(personality) && amount < 1000) { showToast(`${person.name} nie zauważa tak drobnych gestów (minimum 1000 PLN).`, 'default'); return false; }
    playerWallet.cash -= amount;
    if (person.kind === 'investor') person.entity.cash += amount;
    else person.entity.fund.cash += amount;
    recordPayment('player-wallet', `external:${person.id}`, amount, `Prezent dla ${person.name}`);
    botRelations.lastGift[id] = quarter;
    botRelations.giftCount = botRelations.giftCount || {};
    const count = botRelations.giftCount[id] = (botRelations.giftCount[id] || 0) + 1;
    const raw = Math.min(GIFT_MAX_GAIN, amount / 100 * GIFT_RELATION_PER_100) * Math.pow(0.5, count - 1);
    const room = Math.max(0, 60 - getRelation(id)); // samymi prezentami najwyżej do 60
    const gain = changeRelation(id, Math.min(raw, room), 'prezent');
    showToast(`${person.name}: relacja ${gain >= 0 ? '+' : ''}${gain.toFixed(1)}.`, 'success');
    return true;
}

// =================================================================================
// CO KWARTAŁ: powrót do zera, zachowanie wrogich i przyjaznych botów, maile
// =================================================================================

function processRelationsQuarterly() {
    ensureBotRelations();
    botRelations.blockOffer = null; // oferta pakietu ważna do końca kwartału
    botRelations.mockedThisQuarter = false;
    for (const id of Object.keys(botRelations.values)) {
        botRelations.values[id] *= 1 - RELATION_DECAY;
        if (Math.abs(botRelations.values[id]) < 0.5) delete botRelations.values[id];
    }
    if (!playerFund) return;
    for (const person of getRelationPeople()) {
        const value = getRelation(person.id);
        if (value <= RELATION_HOSTILE) runHostileBot(person, value);
        else if (value >= RELATION_FRIENDLY) runFriendlyBot(person, value);
    }
}

/** Spółki, w których fundusz ma udziały (najpierw większościowe). */
function getPlayerCompanies() {
    return stocks.filter(s => !s.assetType && !s.isBankrupt && (playerPortfolio[s.symbol]?.shares || 0) > 0)
        .sort((a, b) => getFundStakePct(b) - getFundStakePct(a));
}

function runHostileBot(person, value) {
    const roll = Math.random();
    if (roll < 0.35 && !botRelations.mockedThisQuarter) { botRelations.mockedThisQuarter = true; sendBotMail(person, 'hostile'); } // B2: najwyżej 1 na kwartał
    if (person.kind !== 'investor') return;
    const ai = person.entity;
    const companies = getPlayerCompanies();
    if (!companies.length) return;

    // Wzmacnia pozycję w spółkach, gdzie gracz ma udziały.
    if (Math.random() < 0.5) {
        const target = getRandomElement(companies.slice(0, 5));
        const quantity = Math.floor(Math.min(getAvailableShares(target), ai.cash * 0.2 / Math.max(0.01, target.price)));
        if (quantity > 0) {
            aiBuyStock(ai, target.symbol, quantity);
            logEvent(`😠 ${ai.name} skupuje akcje ${target.name}, by osłabić pozycję Twojego funduszu.`, 'review');
        }
    }
    // Próba przejęcia spółki gracza przez spółkę kontrolowaną przez bota.
    const playerMajority = companies.filter(s => getFundStakePct(s) > 0.5 && !s.mergerProcess);
    const botCompanies = stocks.filter(s => !s.assetType && !s.mergerProcess && !s.isBankrupt && getMajorityBot(s) === ai);
    if (playerMajority.length && botCompanies.length && Math.random() < (value <= -70 ? 0.4 : 0.15)) {
        const target = getRandomElement(playerMajority);
        const initiator = botCompanies.sort((a, b) => b.cash - a.cash)[0];
        if (initiator.cash >= getMarketCapValue(target) * 1.3) {
            logEvent(`⚔️ ${ai.name} przez ${initiator.name} rusza na Twoją spółkę ${target.name}!`, 'review');
            initiateMergerProcess(initiator, target, 'przejęcie', 'cash', 0.2);
        }
    }
    // Plotki przez „gazetę anty-gracz”.
    if (value <= -60 && Math.random() < 0.25) {
        const target = companies[0];
        applyPriceEffect(target.symbol, -0.03, 'negative', 'company');
        logEvent(`🗞️ Plotka: „${target.name} ukrywa straty” — źródło podobno blisko ${ai.name}. Kurs ${target.name} spada.`, 'company');
    }
}

function runFriendlyBot(person, value) {
    if (Math.random() < 0.3) sendBotMail(person, Math.random() < 0.6 ? 'tip' : 'friendly');
    if (person.kind === 'investor' && value >= 60 && !botRelations.blockOffer && Math.random() < 0.2) offerBotBlock(person.entity);
}

// =================================================================================
// MAILE BOTÓW
// =================================================================================

function getBotSender(person) {
    return `bot:${person.id}`;
}

function getBotTip() {
    const undervalued = stocks.filter(s => !s.assetType && !s.isBankrupt && s.fundamentals?.fairValue > s.price * 1.3 && s.fundamentals.fairValue < s.price * 4)
        .sort((a, b) => b.fundamentals.fairValue / b.price - a.fundamentals.fairValue / a.price)[0];
    if (undervalued && Math.random() < 0.6) {
        return { text: `Przyjrzyj się ${undervalued.name} (${undervalued.symbol}). Moim zdaniem rynek wycenia ją dużo poniżej wartości — kupuję po cichu.`, symbol: undervalued.symbol };
    }
    const turning = Object.entries(macro?.sectorCycles || {}).find(([, cycle]) => cycle.phase === 'trough' && cycle.quartersLeft <= 1);
    if (turning) return { text: `Słyszę od ludzi z branży, że sektor ${turning[0]} lada moment odbije. Warto mieć tam pozycję.`, symbol: null };
    return { text: 'Na rynku nic pewnego, ale trzymaj trochę gotówki — przed posiedzeniem BC bywa nerwowo.', symbol: null };
}

function getHostileLine(person) {
    const fundReturn = playerFund ? getPeriodReturn(playerFund.current.startNav, getFundNav()) : 0;
    const benchmark = playerFund ? getPeriodReturn(playerFund.current.startBenchmark, getBenchmarkValue()) : 0;
    const lines = [
        `Wynik ${(fundReturn * 100).toFixed(1)}% przy GIG ${(benchmark * 100).toFixed(1)}%? Gratuluję — moja babcia z lokatą ma lepiej.`,
        'Widziałem Twoje ostatnie transakcje. Kupujesz drogo, sprzedajesz tanio — to jakaś nowa strategia?',
        'Twoi klienci już pytają mnie o przeniesienie środków. Mam dla nich miejsce.',
        'Zarządzanie funduszem to nie loteria. Choć patrząc na Twój portfel, chyba myślisz inaczej.',
        'Kwestionuję każdą Twoją decyzję na ostatnim walnym. I zapamiętam to przy następnym.',
        'Nie martw się, jak zbankrutujesz, odkupię Twoje pakiety za grosze.'
    ];
    return getRandomElement(lines);
}

function sendBotMail(person, kind) {
    if (typeof addMail !== 'function') return null;
    if (kind === 'hostile') {
        return addMail({ sender: getBotSender(person), subject: `😠 ${person.name}: ${getRandomElement(['słówko o Twoich wynikach', 'serio?', 'kilka uwag', 'do zarządzającego'])}`, body: getHostileLine(person), importance: 1 });
    }
    if (kind === 'tip') {
        const tip = getBotTip();
        return addMail({ sender: getBotSender(person), subject: `💡 ${person.name}: dobra rada`, body: tip.text, importance: 2, symbol: tip.symbol });
    }
    return addMail({ sender: getBotSender(person), subject: `🙂 ${person.name}`, body: getRandomElement([
        'Dobra robota w tym kwartale. Rynek zauważa Twój fundusz.',
        'Jeśli będziesz potrzebować partnera przy większym pakiecie — daj znać.',
        'Szacunek za ostatnie decyzje. Nie wchodzę Ci w drogę.'
    ]), importance: 1 });
}

// =================================================================================
// PAKIET Z RABATEM OD PRZYJAZNEGO BOTA
// =================================================================================

function offerBotBlock(ai) {
    const holdings = Object.entries(ai.portfolio || {})
        .map(([symbol, holding]) => ({ stock: stocks.find(s => s.symbol === symbol), shares: holding.shares }))
        .filter(item => item.stock && !item.stock.assetType && !item.stock.isBankrupt && item.shares > 0 && canAccessExchange(item.stock.exchange));
    if (!holdings.length) return null;
    const defense = ai.isGuard && typeof isDefenseCompany === 'function' ? holdings.filter(item => isDefenseCompany(item.stock)) : [];
    const pick = getRandomElement(defense.length ? defense : holdings);
    const shares = Math.max(1, Math.floor(Math.min(pick.shares * 0.5, pick.stock.totalShares * 0.03)));
    const price = pick.stock.price * (1 - BOT_BLOCK_DISCOUNT);
    botRelations.blockOffer = { aiId: ai.id, symbol: pick.stock.symbol, shares, price };
    addMail({
        sender: `bot:${ai.id}`, subject: `🤝 ${ai.name}: pakiet ${pick.stock.symbol} dla Ciebie`,
        body: `Mogę odstąpić Twojemu funduszowi ${shares.toLocaleString('pl-PL')} akcji ${pick.stock.name} po ${price.toFixed(2)} PLN (${(BOT_BLOCK_DISCOUNT * 100).toFixed(0)}% poniżej rynku). Oferta ważna do końca kwartału.`,
        importance: 2, symbol: pick.stock.symbol, action: { type: 'botBlock', symbol: pick.stock.symbol }
    });
    return botRelations.blockOffer;
}

function acceptBotBlock() {
    const offer = botRelations.blockOffer;
    const ai = offer && aiCompetitors.find(a => a.id === offer.aiId);
    const stock = offer && stocks.find(s => s.symbol === offer.symbol);
    const holding = ai?.portfolio?.[offer?.symbol];
    if (!offer || !ai || !stock || !holding || holding.shares < offer.shares) { showToast('Oferta pakietu jest nieaktualna.', 'default'); botRelations.blockOffer = null; return false; }
    const cost = offer.shares * offer.price;
    if (playerCash < cost) { showToast('Za mało gotówki funduszu.', 'error'); return false; }
    playerCash -= cost;
    ai.cash += cost;
    holding.shares -= offer.shares;
    if (holding.shares <= 0) delete ai.portfolio[offer.symbol];
    const target = playerPortfolio[offer.symbol] || (playerPortfolio[offer.symbol] = { shares: 0, avgPrice: 0, assetType: 'stock' });
    target.avgPrice = (target.avgPrice * target.shares + cost) / (target.shares + offer.shares);
    target.shares += offer.shares; // sharesHeld bez zmian — akcje zmieniają właściciela
    recordPayment('player-fund', `external:${ai.id}`, cost, `Pakiet ${offer.symbol} od ${ai.name}`);
    changeRelation(ai.id, 3, `zakup pakietu ${offer.symbol}`);
    logEvent(`🤝 Fundusz odkupuje od ${ai.name} ${offer.shares.toLocaleString('pl-PL')} akcji ${stock.name} z rabatem.`, 'review');
    botRelations.blockOffer = null;
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

// =================================================================================
// ZAKŁADKA „FIRMA”: hierarchia, szef, targety
// =================================================================================

/** Bezpośredni przełożony: najniżej postawiona osoba powyżej gracza. */
function getPlayerBoss() {
    const myLevel = getPositionIndex(playerProfile.positionId);
    const above = (corporation?.managers || []).filter(m => getPositionIndex(m.positionId) > myLevel)
        .sort((a, b) => getPositionIndex(a.positionId) - getPositionIndex(b.positionId));
    if (above.length) return { kind: 'colleague', id: above[0].id, name: above[0].name, positionId: above[0].positionId, opinion: getRelation(above[0].id) * 0.6 + (corporation.boardReputation - 50) * 0.8 };
    return { kind: 'board', id: null, name: 'Rada nadzorcza korporacji', positionId: null, opinion: (corporation.boardReputation - 50) * 2 };
}

/** Cele okresu z postępem (0–1). */
function getPlayerTargets() {
    if (!playerFund) return [];
    const fundReturn = getPeriodReturn(playerFund.current.startNav, getFundNav());
    const benchmark = getPeriodReturn(playerFund.current.startBenchmark, getBenchmarkValue());
    const takeovers = getTakeoverProgress();
    const hurdle = Math.max(getDepositRate(), macro?.inflation || 0) * (playerFund.current.elapsedMs / (BASE_DELAYS.quarterly * 4));
    return [
        { label: 'Pobij GIG w tym okresie', value: `${formatNumberPl(((fundReturn - benchmark) * 100), 1)} pkt proc.`, progress: Math.max(0, Math.min(1, 0.5 + (fundReturn - benchmark) * 10)), done: fundReturn > benchmark },
        { label: 'Wynik powyżej lokaty i inflacji', value: `${formatNumberPl((fundReturn * 100), 1)}% vs ${formatNumberPl((hurdle * 100), 1)}%`, progress: hurdle > 0 ? Math.max(0, Math.min(1, fundReturn / hurdle)) : 1, done: fundReturn >= hurdle },
        { label: 'Zaufanie klientów ≥ 60', value: `${playerFund.trust.toFixed(0)}/100`, progress: Math.min(1, playerFund.trust / 60), done: playerFund.trust >= 60 },
        { label: `Ocena zarządu ≥ ${PROMOTION_SCORE} (awans)`, value: corporation.lastPlayerScore !== null ? `${Math.round(corporation.lastPlayerScore)}/100` : 'brak oceny', progress: Math.min(1, (corporation.lastPlayerScore || 0) / PROMOTION_SCORE), done: (corporation.lastPlayerScore || 0) >= PROMOTION_SCORE },
        { label: 'Przejęcia firm zarządzających', value: `${takeovers.done}/${takeovers.required}`, progress: takeovers.done / Math.max(1, takeovers.required), done: takeovers.done >= takeovers.required }
    ];
}

function renderRelationBar(value) {
    const left = value < 0 ? 50 + value / 2 : 50;
    const width = Math.abs(value) / 2;
    return `<span class="rel-bar"><span class="rel-bar-fill ${value < 0 ? 'neg' : 'pos'}" style="left:${left}%;width:${width}%"></span></span>`;
}

function renderCorporationFirm() {
    ensureBotRelations();
    const boss = getPlayerBoss();
    const bossMood = getRelationMood(boss.opinion);
    const positions = [...CAREER_POSITIONS].reverse();
    const hierarchy = positions.map(position => {
        const people = [
            ...(playerProfile.positionId === position.id ? [`<strong>${escapeHtml(playerProfile.name)} (Ty)</strong>`] : []),
            ...corporation.managers.filter(m => m.positionId === position.id).map(m => `${getRelationMood(getRelation(m.id)).icon} ${escapeHtml(m.name)}`)
        ];
        return `<div class="firm-level ${playerProfile.positionId === position.id ? 'mine' : ''}"><span class="firm-level-name">${escapeHtml(position.name)}</span><span>${people.join(' · ') || '<span class="text-muted">—</span>'}</span></div>`;
    }).join('');
    const relations = getRelationPeople().map(person => {
        const value = getRelation(person.id);
        const mood = getRelationMood(value);
        return `<tr><td>${escapeHtml(person.name)}<span class="text-xs text-muted d-block">${person.kind === 'colleague' ? `kolega · ${escapeHtml(CAREER_POSITIONS[getPositionIndex(person.entity.positionId)].name)}` : person.entity?.isGuard ? 'fundusz patriotyczny · głosuje na walnych, współinwestuje w obronność' : 'inwestor giełdowy'}</span></td>
            <td>${renderRelationBar(value)}</td><td class="${mood.cls}">${mood.icon} ${value.toFixed(0)} · ${mood.label}</td>
            <td><div class="d-flex gap-1"><input type="text" inputmode="numeric" class="w-xs" id="gift-${person.id}" value="200" aria-label="Kwota prezentu">
                <button class="btn-xs" onclick="corporationAction(giveGiftToBot, '${person.id}', parseFloat(document.getElementById('gift-${person.id}').value))">Prezent</button></div></td></tr>`;
    }).join('');
    const log = botRelations.log.slice(0, 8).map(entry => `<li><span class="${entry.delta >= 0 ? 'text-up' : 'text-down'}">${entry.delta >= 0 ? '+' : ''}${entry.delta.toFixed(1)}</span> ${escapeHtml(entry.name)} — ${escapeHtml(entry.reason)}</li>`).join('');

    return `
        <div class="firm-grid">
            <section><h4>Hierarchia</h4><div class="firm-hierarchy">${hierarchy}</div></section>
            <section>
                <h4>Szef</h4>
                <div class="firm-boss"><strong>${escapeHtml(boss.name)}</strong>${boss.positionId ? `<span class="text-xs text-muted">${escapeHtml(CAREER_POSITIONS[getPositionIndex(boss.positionId)].name)}</span>` : ''}
                    <span class="${bossMood.cls}">${bossMood.icon} ${boss.opinion >= RELATION_FRIENDLY ? 'lubi Cię' : boss.opinion <= RELATION_HOSTILE ? 'nie lubi Cię' : boss.opinion > 10 ? 'ma o Tobie dobre zdanie' : boss.opinion < -10 ? 'ma zastrzeżenia' : 'jest neutralny'} (${boss.opinion.toFixed(0)})</span></div>
                <h4>Zadania i oceny zarządu</h4>
                <p class="fund-muted">Targety okresu, cele zarządu i wyniki ocen są teraz w aplikacji TeamedUP!.</p>
                <button class="btn-primary btn-sm" onclick="closeVisibleModals(); openTeamedUp('tasks')">Otwórz TeamedUP!</button>
            </section>
        </div>
        <h4>Relacje (−100…100)</h4>
        <p class="fund-muted">Wymuszanie dywidend, zrzucanie pakietów i ataki na spółki botów psują relacje; prezenty (portfel prywatny, raz na kwartał), wspieranie ich spółek (zakup pakietu, datek) i odkupienie pakietu — poprawiają. Wrodzy boty szydzą, skupują akcje Twoich spółek i próbują je przejąć; przyjaźni dają rady i pakiety z rabatem.</p>
        <table class="asset-mini-table w-full"><thead><tr><th>Osoba</th><th>Relacja</th><th></th><th>Prezent (PLN)</th></tr></thead><tbody>${relations}</tbody></table>
        <h4>Ostatnie zmiany</h4><ul class="list-plain text-sm">${log || '<li class="text-muted">Brak zmian.</li>'}</ul>`;
}


// 0.15: Spawnowanie bota Komendant Jakub przy maksymalnym poziomie policji (poziom 5)
function checkPoliceChiefSpawn() {
    if (typeof oversight !== 'object' || !oversight?.police) return null;
    if (oversight.police.level >= 5) {
        let jakub = aiCompetitors.find(ai => ai.id === 'komendant_jakub');
        if (!jakub) {
            jakub = {
                id: 'komendant_jakub',
                name: 'Komendant Jakub',
                cash: 5000,
                portfolio: {},
                personality: 'police_chief',
                accessLevel: 1,
                hasTBillAccess: false,
                tBills: [],
                skillPoints: 0,
                unlockedSkills: {},
                creditScore: 100
            };
            aiCompetitors.push(jakub);
            if (typeof logEvent === 'function') {
                logEvent('🚓 Program policyjny: Komendant Jakub dołącza do inwestorów giełdowych (kapitał 5 000 PLN, spółki defensywne).', 'state');
            }
        }
        return jakub;
    }
    return null;
}
