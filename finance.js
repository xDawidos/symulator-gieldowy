// finance.js — Instytucje finansowe (etap E2)
//
// Banki: depozyty spółek z odsetkami, rezerwy, kredyty z zaległościami i odpisami, wynik = marża
// odsetkowa. Lombard dla funduszy (gracza i botów-zarządców) z limitem 20% aktywów i windykacją.
// Obligacje: oprocentowanie roczne, kupony kwartalne, zapadalność w czasie gry, wycena rynkowa.
// Giełdy elitarne Rubin / Szmaragd / Diament wg rankingu kapitalizacji, spółki zależne, Diament
// dążący do monopolu.

const GAME_YEAR_MS = BASE_DELAYS.quarterly * 4;

// =================================================================================
// BANKI
// =================================================================================

const BANK_RESERVE_RATIO = 0.10;       // gotówka banku ≥ 10% depozytów
const BANK_OPERATING_COST = 0.25;      // koszty działania jako część przychodów
const LOAN_WRITE_OFF_AFTER = 4;        // tyle zaległych rat do odpisu części kredytu
const LOAN_WRITE_OFF_SHARE = 0.25;

function getBankLedger(bank) {
    if (!bank.ledger) bank.ledger = { interestIncome: 0, interestExpense: 0, fees: 0, writeOffs: 0 };
    if (!bank.depositBook) bank.depositBook = {};
    return bank.ledger;
}

function getBankDepositsTotal(bank) {
    return Object.values(bank.depositBook || {}).reduce((sum, value) => sum + value, 0);
}

function canBankLend(bank, amount) {
    return bank.cash - amount >= getBankDepositsTotal(bank) * BANK_RESERVE_RATIO;
}

function getCompanyLoanRate(bank) {
    return (getLoanRate() + (Number(bank.baseInterestRateMargin) || 0)) * 1.1;
}

/** Stopa depozytowa (przed pierwszym updateInterestRates: stopa BC + 1 pp). */
function getDepositRate() {
    if (typeof DEPOSIT_INTEREST_RATE === 'number' && Number.isFinite(DEPOSIT_INTEREST_RATE)) return DEPOSIT_INTEREST_RATE;
    return (Number(centralBank?.baseInterestRate) || 0.03) + 0.01;
}

function getBankForStock(stock) {
    return commercialBanks.find(bank => bank.id === stock?.bankData?.id) || null;
}

/** Co tydzień: opłaty, depozyty z odsetkami, kredyty spółek (rata, zaległości, odpisy). */
function processCompanyBanking() {
    const activeBanks = commercialBanks.filter(bank => bank.isActive);
    if (activeBanks.length === 0) return;

    for (const stock of stocks) {
        if (stock.assetType || stock.isBankrupt || !stock.bankAccountId) continue;
        const bank = activeBanks.find(item => item.id === stock.bankAccountId);
        if (!bank) continue;
        const ledger = getBankLedger(bank);
        const symbol = stock.symbol;

        // 1. Opłata za prowadzenie konta.
        if (stock.cash > 0) {
            const fee = Math.min(stock.cash, stock.cash * 0.0005 + 50);
            stock.cash -= fee;
            bank.cash += fee;
            ledger.fees += fee;
            adjustBalanceSheet(stock, { assets: -fee, retainedEarnings: -fee });
        }

        // 2. Depozyt: nadwyżka gotówki na lokatę, wypłata przy niedoborze; odsetki kapitalizowane.
        const minCash = Math.max(10000, (Number(stock.balanceSheet?.assets) || 0) * 0.02);
        const deposit = bank.depositBook[symbol] || 0;
        if (stock.cash > minCash * 3) {
            const amount = (stock.cash - minCash * 3) * 0.1;
            stock.cash -= amount;
            bank.cash += amount;
            bank.depositBook[symbol] = deposit + amount;
        } else if (stock.cash < minCash && deposit > 0) {
            const amount = Math.min(deposit, minCash * 2 - stock.cash, Math.max(0, bank.cash));
            stock.cash += amount;
            bank.cash -= amount;
            bank.depositBook[symbol] = deposit - amount;
        }
        const balance = bank.depositBook[symbol] || 0;
        if (balance > 0) {
            const interest = balance * getDepositRate() / 52;
            bank.cash -= interest;
            bank.depositBook[symbol] = balance + interest;
            ledger.interestExpense += interest;
            adjustBalanceSheet(stock, { assets: interest, retainedEarnings: interest });
        } else {
            delete bank.depositBook[symbol];
        }

        // 3. Nowy kredyt (tylko gdy bank spełnia wymóg rezerw).
        const needsLoan = stock.cash < (stock.balanceSheet.assets * 0.01) && stock.financialHealth < 1;
        const canLendType = bank.type === BANK_TYPES.CORPORATE || bank.type === BANK_TYPES.UNIVERSAL;
        if (needsLoan && canLendType && Math.random() < 0.1) {
            const loanAmount = stock.balanceSheet.assets * getRandomInRange(0.05, 0.15);
            if (canBankLend(bank, loanAmount)) {
                stock.cash += loanAmount;
                stock.balanceSheet.liabilities += loanAmount;
                stock.balanceSheet.assets += loanAmount;
                bank.loanPortfolio[symbol] = (bank.loanPortfolio[symbol] || 0) + loanAmount;
                bank.cash -= loanAmount;
                logEvent(`🏦 Kredyt korporacyjny: ${stock.name} zaciąga ${loanAmount.toFixed(0)} zł w ${bank.name}.`, 'market');
            }
        }

        // 4. Rata kredytu: 1% kapitału + odsetki; zaległości prowadzą do odpisu.
        const loan = Number(bank.loanPortfolio[symbol]) || 0;
        if (loan > 0) {
            const interest = loan * getCompanyLoanRate(bank) / 52;
            const capital = loan * 0.01;
            if (stock.cash >= interest + capital) {
                stock.cash -= interest + capital;
                bank.cash += interest + capital;
                ledger.interestIncome += interest;
                adjustBalanceSheet(stock, { assets: -(interest + capital), liabilities: -capital, retainedEarnings: -interest });
                bank.loanPortfolio[symbol] = loan - capital;
                stock.loanMissedPayments = 0;
                if (bank.loanPortfolio[symbol] <= 1) delete bank.loanPortfolio[symbol];
            } else {
                stock.loanMissedPayments = (stock.loanMissedPayments || 0) + 1;
                stock.financialHealth -= 0.1;
                logEvent(`⚠️ ${stock.name} nie płaci raty kredytu w ${bank.name} (zaległość ${stock.loanMissedPayments}).`, 'warning');
                if (stock.loanMissedPayments >= LOAN_WRITE_OFF_AFTER) {
                    const writeOff = loan * LOAN_WRITE_OFF_SHARE;
                    bank.loanPortfolio[symbol] = loan - writeOff;
                    ledger.writeOffs += writeOff;
                    adjustBalanceSheet(stock, { liabilities: -writeOff, retainedEarnings: writeOff });
                    stock.loanMissedPayments = 0;
                    logEvent(`🏦 ${bank.name} odpisuje ${writeOff.toFixed(0)} zł kredytu ${stock.name} — restrukturyzacja długu.`, 'market');
                }
            }
        }
    }
}

/** Wynik kwartalny banku: odsetki i opłaty − odsetki od depozytów − odpisy − koszty. Zeruje księgę. */
function getBankQuarterlyEarnings(stock) {
    const bank = getBankForStock(stock);
    if (!bank || !bank.ledger) return null;
    const ledger = bank.ledger;
    const revenue = ledger.interestIncome + ledger.fees;
    const operatingCost = revenue * BANK_OPERATING_COST;
    const result = revenue - ledger.interestExpense - ledger.writeOffs - operatingCost;
    bank.lastLedger = { ...ledger, operatingCost, result };
    stock.ledgerQuarters = (stock.ledgerQuarters || 0) + 1; // kotwica wyceny dopiero po 4 kwartałach nowej księgi
    bank.ledger = { interestIncome: 0, interestExpense: 0, fees: 0, writeOffs: 0 };
    return result;
}

/** Wpływ odsetek od kredytów botów do księgi banku (wołane z ai.js). */
function recordBankInterestIncome(bankId, interest) {
    const bank = commercialBanks.find(item => item.id === bankId);
    if (bank && interest > 0) getBankLedger(bank).interestIncome += interest;
}

// =================================================================================
// LOKATY TERMINOWE FUNDUSZU (nowa mechanika banku)
// Wolna gotówka funduszu na 4/8/16 tygodni; odsetki naliczane co tydzień (wchodzą do NAV),
// wypłata z kapitałem w terminie; zerwanie = utrata odsetek i kara 1%. Odsetki płaci bank.
// =================================================================================

const FUND_DEPOSIT_TERMS = [
    { weeks: 4, premium: 0, label: '4 tygodnie' },
    { weeks: 8, premium: 0.006, label: '8 tygodni' },
    { weeks: 16, premium: 0.014, label: '16 tygodni' }
];
const FUND_DEPOSIT_BANK_TYPES = () => [BANK_TYPES.UNIVERSAL, BANK_TYPES.INTERNATIONAL, BANK_TYPES.INTERNET, BANK_TYPES.COOPERATIVE, BANK_TYPES.CORPORATE];
const FUND_DEPOSIT_BREAK_PENALTY = 0.01;
const FUND_DEPOSIT_MIN = 500;

function canBankTakeFundDeposits(bank) {
    return Boolean(bank?.isActive && FUND_DEPOSIT_BANK_TYPES().includes(bank.type));
}

/** Oprocentowanie roczne lokaty: stopa depozytowa + połowa marży banku + premia za długość. */
function getFundDepositRate(bank, weeks) {
    const term = FUND_DEPOSIT_TERMS.find(item => item.weeks === weeks) || FUND_DEPOSIT_TERMS[0];
    return Math.max(0.005, getDepositRate() + (Number(bank?.baseInterestRateMargin) || 0) * 0.5 + term.premium);
}

function getFundDeposits() {
    if (!playerFund) return [];
    if (!playerFund.deposits) playerFund.deposits = [];
    return playerFund.deposits;
}

function getFundDepositsValue() {
    return getFundDeposits().reduce((sum, deposit) => sum + deposit.principal + deposit.accrued, 0);
}

function openFundDeposit(bankId, amount, weeks) {
    const bank = commercialBanks.find(item => item.id === bankId);
    amount = Math.floor(Number(amount) * 100) / 100;
    if (!canBankTakeFundDeposits(bank)) { showToast('Ten bank nie przyjmuje lokat funduszy.', 'error'); return null; }
    if (!(amount >= FUND_DEPOSIT_MIN)) { showToast(`Minimalna lokata: ${FUND_DEPOSIT_MIN} zł.`, 'error'); return null; }
    if (amount > playerCash) { showToast('Za mało wolnej gotówki funduszu.', 'error'); return null; }

    const deposit = {
        id: nextSimulationId('lokata'),
        bankId: bank.id,
        bankName: bank.name,
        principal: amount,
        accrued: 0,
        rate: getFundDepositRate(bank, weeks),
        termWeeks: weeks,
        weeksLeft: weeks
    };
    playerCash -= amount;
    bank.cash += amount;
    getFundDeposits().push(deposit);
    recordPayment('player-fund', bank, amount, `Lokata ${weeks} tyg.`);
    logEvent(`🏦 Fundusz zakłada lokatę w ${bank.name}: ${amount.toFixed(2)} zł na ${weeks} tyg. (${(deposit.rate * 100).toFixed(2)}% rocznie).`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return deposit;
}

function settleFundDeposit(deposit, broken = false) {
    const bank = commercialBanks.find(item => item.id === deposit.bankId);
    let payout = deposit.principal + deposit.accrued;
    if (broken) {
        const penalty = deposit.principal * FUND_DEPOSIT_BREAK_PENALTY;
        payout = deposit.principal - penalty;
        if (bank) {
            bank.cash += deposit.accrued; // utracone odsetki wracają do banku
            getBankLedger(bank).fees += penalty;
        }
    }
    if (bank) bank.cash -= payout - (broken ? 0 : deposit.accrued); // odsetki bank wypłacił już co tydzień
    playerCash += payout;
    const list = getFundDeposits();
    list.splice(list.indexOf(deposit), 1);
    return payout;
}

function breakFundDeposit(depositId) {
    const deposit = getFundDeposits().find(item => item.id === depositId);
    if (!deposit) return false;
    const payout = settleFundDeposit(deposit, true);
    logEvent(`🏦 Fundusz zrywa lokatę w ${deposit.bankName}: wypłata ${payout.toFixed(2)} zł (utrata odsetek i kara ${(FUND_DEPOSIT_BREAK_PENALTY * 100).toFixed(0)}%).`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return true;
}

/** Co tydzień: odsetki (płaci bank), zapadalność lokat. Upadły/nieaktywny bank zwraca kapitał. */
function processFundDepositsWeekly() {
    for (const deposit of [...getFundDeposits()]) {
        const bank = commercialBanks.find(item => item.id === deposit.bankId);
        if (!bank || !bank.isActive) {
            playerCash += deposit.principal + deposit.accrued; // gwarancja depozytów
            getFundDeposits().splice(getFundDeposits().indexOf(deposit), 1);
            logEvent(`🏦 ${deposit.bankName} kończy działalność — lokata funduszu zwrócona z gwarancji depozytów.`, 'review');
            continue;
        }
        const interest = deposit.principal * deposit.rate / FUND_WEEKS_PER_YEAR;
        deposit.accrued += interest;
        bank.cash -= interest;
        getBankLedger(bank).interestExpense += interest;
        deposit.weeksLeft--;
        if (deposit.weeksLeft <= 0) {
            const payout = settleFundDeposit(deposit);
            logEvent(`🏦 Lokata w ${deposit.bankName} zapada: fundusz otrzymuje ${payout.toFixed(2)} zł (odsetki ${deposit.accrued.toFixed(2)} zł).`, 'review');
        }
    }
}

// =================================================================================
// LOMBARD DLA FUNDUSZY (gracz i boty-zarządcy)
// =================================================================================

const PAWN_MAX_SHARE_OF_ASSETS = 0.20;
const PAWN_LOAN_TO_VALUE = 0.60;
const PAWN_ANNUAL_RATE = 0.25;            // rok gry = 20 tygodni
const PAWN_WEEKS = 12;
const PAWN_TRUST_PENALTY = 3;
const COLLECTOR_AFTER_MISSED = 2;
const COLLECTOR_DISCOUNT = 0.8;

function getPawnShop() {
    return stocks.find(stock => stock.assetType === 'PawnShop' && !stock.isBankrupt) || null;
}

function getDebtCollector() {
    return stocks.find(stock => stock.assetType === 'DebtCollector' && !stock.isBankrupt) || null;
}

/** Wspólny widok funduszu gracza i funduszy botów dla lombardu. */
function getFundAccount(manager = null) {
    if (!manager) {
        if (!playerFund.pawnLoans) playerFund.pawnLoans = [];
        return {
            isPlayer: true,
            name: playerProfile?.fundName || 'Fundusz gracza',
            get cash() { return playerCash; },
            set cash(value) { playerCash = value; },
            portfolio: playerPortfolio,
            loans: playerFund.pawnLoans,
            assets: () => getFundAssets()
        };
    }
    const fund = manager.fund;
    if (!fund.pawnLoans) fund.pawnLoans = [];
    return {
        isPlayer: false,
        manager,
        name: `Fundusz ${manager.name}`,
        get cash() { return fund.cash; },
        set cash(value) { fund.cash = value; },
        portfolio: fund.portfolio,
        loans: fund.pawnLoans,
        assets: () => getBotFundAssets(fund)
    };
}

function getPawnOutstanding(account) {
    return account.loans.reduce((sum, loan) => sum + loan.principal, 0);
}

function getPawnCapacity(account) {
    return Math.max(0, account.assets() * PAWN_MAX_SHARE_OF_ASSETS - getPawnOutstanding(account));
}

function pawnShares(account, symbol, quantity) {
    const stock = stocks.find(s => s.symbol === symbol);
    const holding = account.portfolio[symbol];
    const pawnShop = getPawnShop();
    quantity = Math.floor(quantity);
    const fail = message => { if (account.isPlayer) showToast(message, 'error'); return null; };

    if (!stock || !holding || !pawnShop) return fail('Brak lombardu albo akcji do zastawu.');
    const free = holding.shares - (holding.lockedShares || 0);
    if (!(quantity > 0) || quantity > free) return fail(`Możesz zastawić najwyżej ${free} wolnych akcji.`);

    const principal = Math.min(quantity * stock.price * PAWN_LOAN_TO_VALUE, getPawnCapacity(account), pawnShop.cash * 0.5);
    if (!(principal >= 1)) return fail(`Limit zastawów: ${(PAWN_MAX_SHARE_OF_ASSETS * 100).toFixed(0)}% aktywów funduszu.`);

    const loan = {
        id: nextSimulationId('pawn'),
        symbol,
        shares: quantity,
        principal,
        weeksLeft: PAWN_WEEKS,
        missed: 0
    };
    account.loans.push(loan);
    holding.lockedShares = (holding.lockedShares || 0) + quantity;
    account.cash += principal;
    adjustCompanyCash(pawnShop, -principal);
    recordPayment(pawnShop, account.isPlayer ? 'player-fund' : `fund:${account.manager.id}`, principal, `Pożyczka pod zastaw ${symbol}`);

    if (account.isPlayer) {
        playerFund.trust = Math.max(0, playerFund.trust - PAWN_TRUST_PENALTY);
        playerWallet.complianceRisk = (playerWallet.complianceRisk || 0) + 1;
        logEvent(`🏦 Fundusz zastawia ${quantity} akcji ${stock.name} w lombardzie ${pawnShop.name}: ${principal.toFixed(2)} zł na ${PAWN_WEEKS} tygodni. Klienci patrzą na to nieufnie.`, 'review');
    }
    return loan;
}

function releasePawnCollateral(account, loan) {
    const holding = account.portfolio[loan.symbol];
    if (holding) holding.lockedShares = Math.max(0, (holding.lockedShares || 0) - loan.shares);
    const index = account.loans.indexOf(loan);
    if (index >= 0) account.loans.splice(index, 1);
}

function repayPawnLoan(account, loanId) {
    const loan = account.loans.find(item => item.id === loanId);
    const pawnShop = getPawnShop();
    if (!loan) return false;
    if (account.cash < loan.principal) {
        if (account.isPlayer) showToast('Za mało gotówki funduszu na spłatę.', 'error');
        return false;
    }
    account.cash -= loan.principal;
    if (pawnShop) adjustCompanyCash(pawnShop, loan.principal);
    releasePawnCollateral(account, loan);
    if (account.isPlayer) logEvent(`🏦 Fundusz spłaca pożyczkę lombardową (${loan.principal.toFixed(2)} zł) i odzyskuje ${loan.shares} akcji ${loan.symbol}.`, 'review');
    return true;
}

/** Przeniesienie akcji z funduszu do instytucji (lombard/windykator) — akcje dalej są w obrocie. */
function seizeShares(account, symbol, quantity, institution) {
    const holding = account.portfolio[symbol];
    if (!holding || !(quantity > 0)) return 0;
    quantity = Math.min(quantity, holding.shares);
    holding.shares -= quantity;
    holding.lockedShares = Math.max(0, Math.min(holding.lockedShares || 0, holding.shares));
    if (holding.shares <= 0) delete account.portfolio[symbol];
    if (institution) {
        if (!institution.holdingPortfolio) institution.holdingPortfolio = {};
        const stock = stocks.find(s => s.symbol === symbol);
        const target = institution.holdingPortfolio[symbol] || { quantity: 0, purchasePrice: stock?.price || 0 };
        target.quantity += quantity;
        institution.holdingPortfolio[symbol] = target;
    }
    return quantity;
}

/** Co tydzień: odsetki, termin spłaty, przejęcie zastawu i windykacja. */
function processPawnLoansWeekly(account) {
    const pawnShop = getPawnShop();
    for (const loan of [...account.loans]) {
        const stock = stocks.find(s => s.symbol === loan.symbol);
        const interest = loan.principal * PAWN_ANNUAL_RATE / FUND_WEEKS_PER_YEAR;

        if (account.cash >= interest) {
            account.cash -= interest;
            if (pawnShop) adjustCompanyCash(pawnShop, interest);
            loan.missed = 0;
        } else {
            loan.missed++;
        }

        loan.weeksLeft--;
        if (loan.weeksLeft <= 0) {
            if (account.cash >= loan.principal) {
                repayPawnLoan(account, loan.id);
            } else {
                // Brak spłaty: lombard zatrzymuje zastaw.
                releasePawnCollateral(account, loan);
                const taken = seizeShares(account, loan.symbol, loan.shares, pawnShop);
                notifyDebtAction(account, `🏦 Lombard ${pawnShop?.name || ''} przejmuje ${taken} akcji ${stock?.name || loan.symbol} z zastawu ${account.name}.`);
            }
            continue;
        }

        if (loan.missed >= COLLECTOR_AFTER_MISSED) collectPawnDebt(account, loan);
    }
}

/** Windykator przejmuje dług: zajmuje akcje dłużnika (najpierw zastaw) po cenie z dyskontem. */
function collectPawnDebt(account, loan) {
    const collector = getDebtCollector();
    const pawnShop = getPawnShop();
    if (!collector) return 0;

    let debt = loan.principal * 1.1;
    releasePawnCollateral(account, loan);
    const symbols = [loan.symbol, ...Object.keys(account.portfolio).filter(symbol => symbol !== loan.symbol)];
    let seizedValue = 0;
    for (const symbol of symbols) {
        if (debt <= 0) break;
        const stock = stocks.find(s => s.symbol === symbol);
        const holding = account.portfolio[symbol];
        if (!stock || !holding || holding.assetType === 'etf' || holding.assetType === 'index') continue;
        const price = stock.price * COLLECTOR_DISCOUNT;
        const quantity = Math.min(holding.shares, Math.ceil(debt / price));
        const taken = seizeShares(account, symbol, quantity, collector);
        debt -= taken * price;
        seizedValue += taken * price;
    }
    // Windykator spłaca lombard i zostaje z akcjami.
    const payout = Math.min(loan.principal, Math.max(0, collector.cash));
    adjustCompanyCash(collector, -payout);
    if (pawnShop) adjustCompanyCash(pawnShop, payout);

    notifyDebtAction(account, `⚖️ Windykator ${collector.name} zajmuje akcje ${account.name} o wartości ${seizedValue.toFixed(0)} zł za niespłaconą pożyczkę lombardową.`);
    return seizedValue;
}

function notifyDebtAction(account, text) {
    if (account.isPlayer) {
        playerFund.trust = Math.max(0, playerFund.trust - 5);
        playerProfile?.cv.push({ type: 'compliance', text });
        logEvent(text, 'review');
    } else {
        logEvent(text, 'state');
    }
}

/** Agresywni zarządcy-boty używają dźwigni, gdy brakuje gotówki na okazje. */
function maybeBotPawn(manager) {
    if (manager.personality !== 'aggressive') return null;
    const account = getFundAccount(manager);
    if (account.cash > account.assets() * 0.02 || getPawnCapacity(account) < 100 || Math.random() > 0.3) return null;
    const [symbol, holding] = Object.entries(account.portfolio).sort((a, b) => b[1].shares - a[1].shares)[0] || [];
    if (!symbol) return null;
    const free = holding.shares - (holding.lockedShares || 0);
    return free > 0 ? pawnShares(account, symbol, Math.ceil(free / 2)) : null;
}

// Interfejs gracza
function pawnFundShares(symbol, quantity) {
    const loan = pawnShares(getFundAccount(), symbol, quantity);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return loan;
}

function repayFundPawn(loanId) {
    const ok = repayPawnLoan(getFundAccount(), loanId);
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return ok;
}

function processFundPawnLoansWeekly() {
    if (playerFund) processPawnLoansWeekly(getFundAccount());
    for (const manager of corporation?.managers || []) {
        maybeBotPawn(manager);
        processPawnLoansWeekly(getFundAccount(manager));
    }
}

// =================================================================================
// OBLIGACJE
// =================================================================================

const BOND_OFFER_LIFETIME_MS = BASE_DELAYS.weekly * 4;
const BOND_RECOVERY = [0.3, 0.5];

function getBondMarketRate(bond) {
    const base = Math.max(0.005, (Number(centralBank?.baseInterestRate) || 0.03) + 0.01);
    return base + (bond.isStateBond ? 0 : (Number(bond.risk) || 0) * 0.5);
}

/** Wartość bieżąca obligacji: kupony + nominał zdyskontowane stopą rynkową (rok gry). */
function getBondValue(bond) {
    const face = Number(bond.faceValue) || 1000;
    if (bond.isTBill) return face; // bony skarbowe: osobna logika (economy.js)
    if (bond.defaulted) return face * (BOND_RECOVERY[0] + BOND_RECOVERY[1]) / 2;
    const years = Math.max(0, (Number(bond.remainingGameMs) || 0) / GAME_YEAR_MS);
    const rate = getBondMarketRate(bond);
    const coupon = Number(bond.interestRate) || 0;
    const discount = Math.pow(1 + rate, -years);
    const annuity = rate > 0 ? (1 - discount) / rate : years;
    return face * coupon * annuity + face * discount;
}

function getFundBondsValue() {
    return allBonds.filter(bond => bond.ownerId === 'player').reduce((sum, bond) => sum + getBondValue(bond), 0);
}

function createBondRecord(ownerId, offer, durationMinutes, annualRate) {
    return {
        id: nextSimulationId('bond'),
        ownerId,
        issuerName: offer.issuerName,
        issuerSymbol: offer.issuerSymbol || null,
        type: offer.type,
        purchasePrice: offer.faceValue || 1000,
        faceValue: offer.faceValue || 1000,
        interestRate: annualRate,
        remainingGameMs: durationMinutes * 60000,
        risk: offer.risk || 0,
        isStateBond: !!offer.isStateBond,
        defaulted: false
    };
}

function issueNewBondOffer() {
    if (activeBonds.length >= 10) return;

    const roll = Math.random();
    let issuer, type, risk, duration, annual, issuerSymbol = null;

    if (roll < 0.15 && (cityInvestment.playerHasUnlocked || cityInvestment.aiHasUnlocked)) {
        issuer = getRandomElement(bondIssuers.municipal);
        type = 'Komunalna';
        risk = issuer.risk;
        duration = getRandomIntInRange(15, 35);
        annual = 0.04 + risk * 0.5;
    } else if (roll < 0.60) {
        const company = getRandomElement(stocks.filter(s => !s.assetType && !s.isBankrupt));
        if (!company) return;
        issuer = { name: company.name, risk: Math.min(0.3, (Number(company.volatilityFactor) || 1) / 10 + Math.max(0, -Number(company.financialHealth) || 0) * 0.02) };
        issuerSymbol = company.symbol;
        type = 'Korporacyjna (Giełdowa)';
        risk = issuer.risk;
        duration = getRandomIntInRange(10, 50);
        annual = 0.05 + risk * 0.6;
    } else {
        issuer = getRandomElement(bondIssuers.corporate_non_public);
        type = 'Korporacyjna (Pozagiełdowa)';
        risk = issuer.risk;
        duration = getRandomIntInRange(20, 50);
        annual = 0.07 + risk * 0.8;
    }

    const offer = {
        id: nextSimulationId('bondoffer'),
        issuerName: issuer.name,
        issuerSymbol,
        type,
        interestRate: annual,
        durationMinutes: duration,
        risk,
        faceValue: 1000,
        available: getRandomIntInRange(50, 500),
        remainingOfferMs: BOND_OFFER_LIFETIME_MS
    };
    activeBonds.push(offer);
    logEvent(`📰 Nowa emisja obligacji (${type}) od ${issuer.name}: ${(annual * 100).toFixed(1)}% rocznie, ${duration} min.`, 'market');
}

function payForBonds(buyer, totalCost) {
    if (buyer === 'player') {
        if (playerCash < totalCost) { showToast('Za mało gotówki funduszu.', 'error'); return false; }
        playerCash -= totalCost;
    } else {
        if (buyer.cash < totalCost) return false;
        buyer.cash -= totalCost;
    }
    return true;
}

function buyStateBond(buyer, type, quantity) {
    const offer = stateBondOffer[type];
    quantity = Math.floor(quantity);
    if (!offer || !(quantity > 0)) return false;
    if (quantity > offer.available) { if (buyer === 'player') showToast('Brak tylu obligacji tej serii.', 'error'); return false; }
    if (!payForBonds(buyer, 1000 * quantity)) return false;
    offer.available -= quantity;
    governmentTreasury += 1000 * quantity;

    const annual = type === 'shortTerm'
        ? offer.interest
        : Math.max(0.01, marketVolatilityIndex / 100 + offer.interestBase);
    const duration = type === 'shortTerm' ? 10 : type === 'mediumTerm' ? 25 : 45;
    const ownerId = buyer === 'player' ? 'player' : buyer.id;
    const template = { issuerName: 'Skarb Państwa', type: `Skarbowa (${type})`, faceValue: 1000, risk: 0, isStateBond: true };
    for (let i = 0; i < quantity; i++) allBonds.push(createBondRecord(ownerId, template, duration, annual));

    if (ownerId === 'player') {
        logEvent(`Fundusz kupuje ${quantity} szt. obligacji skarbowych (${(annual * 100).toFixed(1)}% rocznie).`, 'review');
        if (typeof displayCash === 'function') displayCash();
        if (typeof openBankModal === 'function' && document.getElementById('bank-modal')?.style.display === 'block') openBankModal();
    }
    return true;
}

function buyOtherBond(buyer, bondId, quantity) {
    const index = activeBonds.findIndex(bond => bond.id === bondId);
    quantity = Math.floor(quantity);
    if (index === -1) { if (buyer === 'player') showToast('Ta oferta jest już nieaktualna.', 'error'); return false; }
    const offer = activeBonds[index];
    if (!(quantity > 0) || quantity > offer.available) { if (buyer === 'player') showToast('Brak tylu obligacji w ofercie.', 'error'); return false; }

    const totalCost = offer.faceValue * quantity;
    if (!payForBonds(buyer, totalCost)) return false;
    offer.available -= quantity;

    const issuer = stocks.find(s => s.symbol === (offer.issuerSymbol));
    if (issuer) {
        adjustCompanyCash(issuer, totalCost);
        adjustBalanceSheet(issuer, { assets: totalCost, liabilities: totalCost });
    } else {
        governmentTreasury += totalCost;
    }
    if (offer.available <= 0) activeBonds.splice(index, 1);

    const ownerId = buyer === 'player' ? 'player' : buyer.id;
    for (let i = 0; i < quantity; i++) allBonds.push(createBondRecord(ownerId, offer, offer.durationMinutes, offer.interestRate));

    if (ownerId === 'player') {
        logEvent(`Fundusz kupuje ${quantity} szt. obligacji ${offer.issuerName} (${(offer.interestRate * 100).toFixed(1)}% rocznie).`, 'review');
        if (typeof displayCash === 'function') displayCash();
        if (typeof renderBondMarketInBank === 'function') renderBondMarketInBank();
    }
    return true;
}

function payBondOwner(ownerId, amount) {
    if (ownerId === 'player') { playerCash += amount; return; }
    const ai = aiCompetitors.find(item => item.id === ownerId);
    if (ai) ai.cash += amount;
}

/** Co kwartał: kupony; emitent może ogłosić niewypłacalność (ryzyko). */
function payBondCoupons() {
    for (const bond of allBonds) {
        if (bond.defaulted || bond.isTBill) continue;
        if (!bond.isStateBond && Math.random() < (Number(bond.risk) || 0) * 0.1) {
            bond.defaulted = true;
            if (bond.ownerId === 'player') logEvent(`💥 Niewypłacalność emitenta ${bond.issuerName}! Kupony przestają płynąć.`, 'error');
            continue;
        }
        const coupon = bond.faceValue * bond.interestRate / 4;
        payBondOwner(bond.ownerId, coupon);
        const issuer = bond.issuerSymbol && stocks.find(s => s.symbol === bond.issuerSymbol);
        if (issuer) {
            adjustCompanyCash(issuer, -coupon);
            adjustBalanceSheet(issuer, { assets: -coupon, retainedEarnings: -coupon });
        }
    }
}

/** Upływ czasu gry: zapadalność obligacji i wygasanie ofert. */
function checkBondMaturities(deltaGameMs = 5000) {
    for (let i = activeBonds.length - 1; i >= 0; i--) {
        const offer = activeBonds[i];
        if (!Number.isFinite(offer.remainingOfferMs)) offer.remainingOfferMs = BOND_OFFER_LIFETIME_MS;
        offer.remainingOfferMs -= deltaGameMs;
        if (offer.remainingOfferMs <= 0) activeBonds.splice(i, 1);
    }

    for (let i = allBonds.length - 1; i >= 0; i--) {
        const bond = allBonds[i];
        if (bond.isTBill) continue; // checkTBillMaturities
        if (!Number.isFinite(bond.remainingGameMs)) bond.remainingGameMs = Math.max(0, (Number(bond.maturityDate) || 0) - Date.now()) * (currentSpeedMultiplier || 1);
        bond.remainingGameMs -= deltaGameMs;
        if (bond.remainingGameMs > 0) continue;

        const payout = bond.defaulted ? bond.faceValue * getRandomInRange(...BOND_RECOVERY) : bond.faceValue;
        payBondOwner(bond.ownerId, payout);
        const issuer = bond.issuerSymbol && stocks.find(s => s.symbol === bond.issuerSymbol);
        if (issuer && !bond.defaulted) {
            adjustCompanyCash(issuer, -payout);
            adjustBalanceSheet(issuer, { assets: -payout, liabilities: -payout });
        }
        if (bond.ownerId === 'player') {
            logEvent(bond.defaulted
                ? `💥 Obligacja ${bond.issuerName} zapada po niewypłacalności — odzysk ${payout.toFixed(2)} zł.`
                : `💰 Obligacja ${bond.issuerName} zapada: fundusz otrzymuje nominał ${payout.toFixed(2)} zł.`, 'review');
        }
        allBonds.splice(i, 1);
    }
}

// =================================================================================
// GIEŁDY ELITARNE: RUBIN, SZMARAGD, DIAMENT
// =================================================================================

const ELITE_EXCHANGES = {
    RUBY:    { limit: 6, volatility: 0.80, resistance: 0.10, maxSubsidiaries: 1, minCap: 1.5e9 },
    EMERALD: { limit: 3, volatility: 0.65, resistance: 0.20, maxSubsidiaries: 3, minCap: 2.5e9 }, // największe spółki
    DIAMOND: { limit: 1, volatility: 0.50, resistance: 0.30, maxSubsidiaries: 3, minGameMs: 30 * 60000 }
};
const ELITE_ORDER = ['DIAMOND', 'EMERALD', 'RUBY'];

function isEliteExchange(key) {
    return Boolean(ELITE_EXCHANGES[key]);
}

function getMarketCap(stock) {
    return (Number(stock.price) || 0) * (Number(stock.totalShares) || 0);
}

function getGameClockMs() {
    return playerFund?.clockMs ?? 0;
}

/** Ranking kapitalizacji spółek z Platynowej i wyżej → przydział do giełd elitarnych. */
function assignEliteExchanges() {
    const pool = stocks
        .filter(s => !s.assetType && !s.isBankStock && !s.isBankrupt && !s.isSubsidiaryOf &&
            (s.exchange === 'PLATINUM' || isEliteExchange(s.exchange)))
        .sort((a, b) => getMarketCap(b) - getMarketCap(a));

    const target = {};
    let index = 0;
    if (getGameClockMs() >= ELITE_EXCHANGES.DIAMOND.minGameMs && pool[0]) target[pool[index++].symbol] = 'DIAMOND';
    let emeralds = 0;
    while (index < pool.length && emeralds < ELITE_EXCHANGES.EMERALD.limit && getMarketCap(pool[index]) >= ELITE_EXCHANGES.EMERALD.minCap) {
        target[pool[index++].symbol] = 'EMERALD';
        emeralds++;
    }
    for (let rubies = 0; index < pool.length && rubies < ELITE_EXCHANGES.RUBY.limit && getMarketCap(pool[index]) >= ELITE_EXCHANGES.RUBY.minCap; rubies++) target[pool[index++].symbol] = 'RUBY';

    const changes = [];
    for (const stock of pool) {
        const next = target[stock.symbol] || 'PLATINUM';
        if (next === stock.exchange) { applyEliteBonuses(stock); continue; }
        const up = exchanges[next].level > exchanges[stock.exchange].level;
        stock.exchange = next;
        applyEliteBonuses(stock);
        applyPriceEffect(stock.symbol, up ? 0.03 : -0.03, up ? 'positive' : 'negative', 'review');
        logEvent(`${up ? '📈 AWANS' : '📉 SPADEK'}: ${stock.name} ${up ? 'wchodzi na' : 'spada na'} ${exchanges[next].name} (kapitalizacja ${(getMarketCap(stock) / 1e6).toFixed(1)} mln zł).`, 'market');
        changes.push([stock.symbol, next]);
    }
    return changes;
}

/** Premie stabilności (mniejsza zmienność, odporność na zdarzenia) według giełdy. */
function applyEliteBonuses(stock) {
    if (!Number.isFinite(stock.baseVolatilityFactor)) stock.baseVolatilityFactor = Number(stock.volatilityFactor) || 1;
    if (!Number.isFinite(stock.baseEventResistance)) stock.baseEventResistance = Number(stock.eventResistance) || 0;
    const def = ELITE_EXCHANGES[stock.exchange];
    stock.volatilityFactor = stock.baseVolatilityFactor * (def ? def.volatility : 1);
    stock.eventResistance = Math.min(0.9, stock.baseEventResistance + (def ? def.resistance : 0));
}

/** Nowa spółka zależna: kapitał od matki, te same badania, polityki i sektor; IPO na niższej giełdzie. */
function foundSubsidiary(parent) {
    const capital = Math.max(100000, Math.min(parent.cash * 0.1, getMarketCap(parent) * 0.05));
    if (parent.cash < capital) return null;

    let suffix = 1;
    let symbol;
    do { symbol = `${parent.symbol.slice(0, 3)}Z${suffix++}`; } while (stocks.some(s => s.symbol === symbol));

    const totalShares = 10000;
    const price = Math.round(capital / totalShares * 1.5 * 100) / 100;
    const exchangeKey = Object.keys(exchanges).find(key => !isEliteExchange(key) && exchanges[key].minPrice <= price && price < exchanges[key].maxPrice) || 'SILVER';
    const parentStake = 0.6;

    const child = {
        name: `${parent.name} ${getRandomElement(['Nova', 'Plus', 'Labs', 'Serwis', 'Invest'])}`,
        symbol,
        price,
        totalShares,
        maxShares: totalShares,
        sharesHeld: Math.floor(totalShares * parentStake),
        insiderShares: 0,
        exchange: exchangeKey,
        sector: [...(parent.sector || [])],
        specializationSectors: [...(parent.specializationSectors || parent.sector || [])],
        financialHealth: 1,
        volatilityFactor: Number(parent.baseVolatilityFactor || parent.volatilityFactor) || 1,
        cash: capital,
        balanceSheet: { assets: capital, liabilities: 0, shareCapital: capital, retainedEarnings: 0 },
        quarterlyEarnings: 0,
        departments: JSON.parse(JSON.stringify(parent.departments || {})),
        research: { ...JSON.parse(JSON.stringify(parent.research || {})), isResearching: false, currentTech: null, progress: 0 },
        researchUnlocks: { ...(parent.researchUnlocks || {}) },
        activeInvestments: [],
        dividendPolicy: parent.dividendPolicy,
        reputation: { player: 0 },
        priceHistory: [], candlestickHistory: [], lineHistory: [], playerTransactions: [],
        lastReport: 'brak', isTradeLocked: false, dividendCooldownUntil: 0,
        isStateOwned: false, stateOwnershipPct: 0,
        bankAccountId: parent.bankAccountId,
        isSubsidiaryOf: parent.symbol,
        parentStakePct: parentStake,
        ceo: typeof generateCeoCandidate === 'function' ? generateCeoCandidate(parent) : parent.ceo
    };

    adjustCompanyCash(parent, -capital); // gotówka → udziały w zależnej (aktywa matki bez zmian)
    stocks.push(child);
    if (!parent.subsidiaries) parent.subsidiaries = [];
    parent.subsidiaries.push(symbol);
    parent.foundedSubsidiaries = (parent.foundedSubsidiaries || 0) + 1;
    if (typeof initializeFundamentals === 'function') initializeFundamentals(child, true);
    if (typeof initializeDescriptionParts === 'function') initializeDescriptionParts(child);

    logEvent(`🆕 IPO: ${parent.name} zakłada spółkę zależną ${child.name} (${symbol}) na ${exchanges[exchangeKey].name} — 40% akcji w ofercie publicznej.`, 'market');
    return child;
}

/** Szmaragd: wykup słabszej spółki z tego samego sektora jako zależnej. */
function acquireWeakerSubsidiary(parent) {
    const target = stocks
        .filter(s => !s.assetType && !s.isBankStock && !s.isBankrupt && !s.isSubsidiaryOf && !s.isStateOwned &&
            !isEliteExchange(s.exchange) && s.symbol !== parent.symbol && (Number(s.financialHealth) || 0) <= 0 &&
            (s.sector || []).some(sector => (parent.sector || []).includes(sector)) && getMarketCap(s) < getMarketCap(parent) * 0.2)
        .sort((a, b) => getMarketCap(a) - getMarketCap(b))[0];
    if (!target) return null;

    const cost = getMarketCap(target) * 0.51 * 1.2;
    if (parent.cash < cost) return null;
    adjustCompanyCash(parent, -cost);
    recordPayment(parent, 'external:akcjonariusze', cost, `Wykup ${target.symbol}`);
    target.parentStakePct = 0.51;
    if (typeof makeSubsidiary === 'function') makeSubsidiary(parent, target);
    else { target.isSubsidiaryOf = parent.symbol; (parent.subsidiaries = parent.subsidiaries || []).push(target.symbol); }
    applyPriceEffect(target.symbol, 0.1, 'positive', 'company');
    logEvent(`🤝 ${parent.name} wykupuje 51% ${target.name} — spółka staje się zależną.`, 'market');
    return target;
}

/** Diament dąży do monopolu: skupuje akcje spółek z niższych giełd (poza Szmaragdem) w swoim sektorze. */
function runDiamondStrategy() {
    const diamond = stocks.find(s => s.exchange === 'DIAMOND' && !s.isBankrupt);
    if (!diamond) return null;
    const targets = stocks.filter(s => !s.assetType && !s.isBankStock && !s.isBankrupt && s !== diamond &&
        s.exchange !== 'EMERALD' && s.isSubsidiaryOf !== diamond.symbol &&
        (s.sector || []).some(sector => (diamond.sector || []).includes(sector)));
    const target = getRandomElement(targets);
    if (!target) return null;

    if (Math.random() < (antitrustOffice?.analysisCapacity || 0) * 0.5) {
        const fine = Math.round(Math.max(0, diamond.cash) * 0.01);
        adjustCompanyCash(diamond, -fine);
        governmentTreasury += fine;
        logEvent(`⚖️ Urząd antymonopolowy blokuje skup akcji ${target.name} przez ${diamond.name} i nakłada karę ${fine.toLocaleString('pl-PL')} zł.`, 'state');
        return null;
    }

    const quantity = Math.min(getAvailableShares(target), Math.floor(target.totalShares * 0.05));
    const cost = quantity * target.price;
    if (!(quantity > 0) || diamond.cash < cost) return null;
    adjustCompanyCash(diamond, -cost);
    target.sharesHeld += quantity;
    applyTradeImpact(target, quantity, 1);
    if (!diamond.equityStakes) diamond.equityStakes = {};
    diamond.equityStakes[target.symbol] = (diamond.equityStakes[target.symbol] || 0) + quantity;

    const stake = diamond.equityStakes[target.symbol] / target.totalShares;
    logEvent(`💎 ${diamond.name} skupuje ${quantity} akcji ${target.name} (udział ${(stake * 100).toFixed(1)}%).`, 'market');
    if (stake > 0.5 && !target.isSubsidiaryOf) {
        target.parentStakePct = stake;
        if (typeof makeSubsidiary === 'function') makeSubsidiary(diamond, target);
        logEvent(`💎 ${target.name} staje się spółką zależną ${diamond.name}.`, 'market');
    }
    return target.symbol;
}

/** Co kwartał: przydział giełd elitarnych, zależne, Diament. */
function processEliteExchangesQuarterly() {
    assignEliteExchanges();
    for (const stock of stocks.filter(s => isEliteExchange(s.exchange) && !s.isBankrupt)) {
        const def = ELITE_EXCHANGES[stock.exchange];
        const count = (stock.subsidiaries || []).length;
        if (count >= def.maxSubsidiaries || Math.random() > 0.1) continue;
        if (stock.exchange === 'RUBY' && !(stock.foundedSubsidiaries > 0)) foundSubsidiary(stock);
        else if (stock.exchange !== 'RUBY' && (stock.newSubsidiaries || 0) < 2) {
            const added = Math.random() < 0.5 ? acquireWeakerSubsidiary(stock) : foundSubsidiary(stock);
            if (added) stock.newSubsidiaries = (stock.newSubsidiaries || 0) + 1;
        }
    }
    runDiamondStrategy();
    processSubsidiaryIndependence();
}

/** Spółka zależna może się uwolnić, gdy matka sprzeda udziały (mniej niż 50%). */
function processSubsidiaryIndependence() {
    for (const child of stocks.filter(s => s.isSubsidiaryOf && Number.isFinite(s.parentStakePct))) {
        const parent = stocks.find(s => s.symbol === child.isSubsidiaryOf);
        if (!parent || parent.isBankrupt) { child.isSubsidiaryOf = null; continue; }
        if (Math.random() > 0.03 || getMarketCap(child) < getMarketCap(parent) * 0.3) continue;

        const sold = child.parentStakePct * 0.5;
        const proceeds = getMarketCap(child) * sold;
        adjustCompanyCash(parent, proceeds);
        child.sharesHeld = Math.max(0, child.sharesHeld - Math.floor(child.totalShares * sold));
        child.parentStakePct -= sold;
        if (child.parentStakePct < 0.5) {
            child.isSubsidiaryOf = null;
            parent.subsidiaries = (parent.subsidiaries || []).filter(symbol => symbol !== child.symbol);
            logEvent(`🕊️ ${child.name} uwalnia się spod kontroli ${parent.name} — matka sprzedaje część udziałów.`, 'market');
        }
    }
}
