// =================================================================================
// finance.js: Finanse: banki, lokaty, obligacje, lombard, ETF-y, operatorzy rynków.
// Złączone pliki: finance.js, etf.js, markets.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## finance.js
// #################################################################################

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
            const interest = balance * getDepositRate() * CORPORATE_DEPOSIT_RATE_SHARE / 52; // lokaty firmowe niżej oprocentowane niż detaliczne
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
    // Audyt A1: wolna płynność (ponad rezerwę) bank lokuje w bonach i w Banku Centralnym — wcześniej
    // płacił odsetki od depozytów, nic na nich nie zarabiając, i banki z dużymi depozytami bankrutowały.
    // Podstawa: depozyty spółek w księdze banku (bank.cash odzwierciedla wszystkie przepływy klientów).
    const deposits = Object.values(bank.depositBook || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const liquidity = deposits * (1 - (Number(bank.reserveRatio) || 0.1));
    const treasuryIncome = liquidity * ((Number(centralBank?.baseInterestRate) || 0.03) + 0.005) / 4; // bony skarbowe z rynku
    if (treasuryIncome > 0) {
        bank.cash += treasuryIncome;
        ledger.interestIncome += treasuryIncome;
    }
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

const CORPORATE_DEPOSIT_RATE_SHARE = 0.6; // lokaty spółek: 60% stopy depozytowej

const FUND_DEPOSIT_TERMS = [
    { weeks: 4, premium: 0, label: '4 tygodnie' },
    { weeks: 8, premium: 0.006, label: '8 tygodni' },
    { weeks: 16, premium: 0.014, label: '16 tygodni' }
];
const FUND_DEPOSIT_BANK_TYPES = () => [BANK_TYPES.UNIVERSAL, BANK_TYPES.INTERNATIONAL, BANK_TYPES.INTERNET, BANK_TYPES.COOPERATIVE, BANK_TYPES.CORPORATE];
const FUND_DEPOSIT_BREAK_PENALTY = 0.01;
const FUND_DEPOSIT_MIN = 500;

function canBankTakeFundDeposits(bank) {
    return Boolean(bank?.isActive && !bank.frozen && FUND_DEPOSIT_BANK_TYPES().includes(bank.type)); // zamrożony parabank nie przyjmuje lokat
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
    if (account.portfolio === playerPortfolio && typeof notePlayerPositionLoss === 'function') notePlayerPositionLoss(symbol, quantity, `konfiskata akcji przez ${institution?.name || 'organy państwa'}`);
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

// U1: oprocentowanie = stopa bazowa BC + premia za oczekiwaną niewypłacalność (+ mała nadwyżka), z limitem.
const BOND_DEFAULT_PER_QUARTER = 0.05;  // szansa niewypłacalności na kwartał = ryzyko × 5%

function getRiskBondRate(risk, extra = 0) {
    const base = Math.max(0.01, Number(centralBank?.baseInterestRate) || 0.05);
    const annualDefault = 1 - Math.pow(1 - Math.max(0, risk) * BOND_DEFAULT_PER_QUARTER, 4);
    return base + Math.min(0.15, annualDefault * 1.1 + 0.005 + extra);
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
        annual = getRiskBondRate(risk);
    } else if (roll < 0.60) {
        const company = getRandomElement(stocks.filter(s => !s.assetType && !s.isBankrupt));
        if (!company) return;
        issuer = { name: company.name, risk: Math.min(0.3, (Number(company.volatilityFactor) || 1) / 10 + Math.max(0, -Number(company.financialHealth) || 0) * 0.02) };
        issuerSymbol = company.symbol;
        type = 'Korporacyjna (Giełdowa)';
        risk = issuer.risk;
        duration = getRandomIntInRange(10, 50);
        annual = getRiskBondRate(risk);
    } else {
        issuer = getRandomElement(bondIssuers.corporate_non_public);
        type = 'Korporacyjna (Pozagiełdowa)';
        risk = issuer.risk;
        duration = getRandomIntInRange(20, 50);
        annual = getRiskBondRate(risk, 0.01); // pozagiełdowe: mała premia za brak płynności
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

    const deficitPremium = typeof getDeficitBondPremium === 'function' ? getDeficitBondPremium() : 0; // 0.13: długi deficyt podnosi rentowność
    const annual = (type === 'shortTerm'
        ? offer.interest
        : Math.max(0.01, marketVolatilityIndex / 100 + offer.interestBase)) + deficitPremium;
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
        if (!bond.isStateBond && Math.random() < (Number(bond.risk) || 0) * BOND_DEFAULT_PER_QUARTER) {
            bond.defaulted = true;
            if (bond.ownerId === 'player') {
                logEvent(`💥 Niewypłacalność emitenta ${bond.issuerName}! Kupony przestają płynąć.`, 'error');
                if (typeof onAcademyEvent === 'function') onAcademyEvent('bondDefault');
            }
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
    if (typeof hasFreeListingSlot === 'function' && !hasFreeListingSlot()) return null; // P1: twardy sufit spółek krajowych
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
    if (!parent.equityStakes) parent.equityStakes = {};
    parent.equityStakes[symbol] = child.sharesHeld; // pakiet matki zapisany (audyt A1: akcje w obrocie = posiadacze)
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
        if (count >= def.maxSubsidiaries || Math.random() > 0.1 * getDebutFactor()) continue;
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
        if (!hasFreeListingSlot()) continue; // P1: uwolniona zależna liczy się do limitu — przy pełnej giełdzie matka nie sprzedaje
        if (Math.random() > 0.03 || getMarketCap(child) < getMarketCap(parent) * 0.3) continue;

        const sold = child.parentStakePct * 0.5;
        const proceeds = getMarketCap(child) * sold;
        adjustCompanyCash(parent, proceeds);
        const soldShares = Math.min(Math.floor(child.totalShares * sold), parent.equityStakes?.[child.symbol] ?? Infinity);
        if (parent.equityStakes?.[child.symbol]) parent.equityStakes[child.symbol] -= soldShares;
        child.sharesHeld = Math.max(0, child.sharesHeld - soldShares); // akcje wracają na rynek
        child.parentStakePct -= sold;
        if (child.parentStakePct < 0.5) {
            child.isSubsidiaryOf = null;
            parent.subsidiaries = (parent.subsidiaries || []).filter(symbol => symbol !== child.symbol);
            logEvent(`🕊️ ${child.name} uwalnia się spod kontroli ${parent.name} — matka sprzedaje część udziałów.`, 'market');
        }
    }
}

// =================================================================================
// FINANSOWANIE POMOSTOWE BUDÓW (etap F3)
// Spółka budowlana z budową w toku i niską gotówką prosi fundusz o pożyczkę. Odsetki naliczane
// co tydzień, spłata w terminie; brak gotówki = jedno przedłużenie, potem częściowa spłata;
// bankructwo wykonawcy = odzysk 40%. Łącznie do 15% aktywów funduszu.
// =================================================================================

const BRIDGE_FUND_LIMIT = 0.15;
const BRIDGE_RECOVERY = 0.4;
let bridgeLoanOffers = [];

function getFundBridgeLoans() {
    if (!playerFund) return [];
    if (!playerFund.bridgeLoans) playerFund.bridgeLoans = [];
    return playerFund.bridgeLoans;
}

function getFundBridgeLoansValue() {
    return getFundBridgeLoans().reduce((sum, loan) => sum + loan.principal + loan.accrued, 0);
}

function getFundBridgeCapacity() {
    return Math.max(0, getFundAssets() * BRIDGE_FUND_LIMIT - getFundBridgeLoansValue());
}

/** Nowe prośby o finansowanie: budowlańcy z budową w toku i gotówką poniżej 5% aktywów. */
function generateBridgeLoanOffers() {
    bridgeLoanOffers = bridgeLoanOffers.filter(offer => --offer.weeksLeft > 0);
    if (bridgeLoanOffers.length >= 3 || Math.random() > 0.35) return null;
    const busy = new Set(constructionProjects.filter(project => !project.settled && project.status === 'in_progress').map(project => project.builder?.symbol));
    const candidates = stocks.filter(stock => busy.has(stock.symbol) && !stock.isBankrupt &&
        stock.cash < (stock.balanceSheet?.assets || 0) * 0.05 && !bridgeLoanOffers.some(offer => offer.symbol === stock.symbol) &&
        !getFundBridgeLoans().some(loan => loan.symbol === stock.symbol));
    const company = getRandomElement(candidates);
    if (!company) return null;
    const project = constructionProjects.find(item => item.builder?.symbol === company.symbol && !item.settled);
    const risk = Math.max(0, -Number(company.financialHealth) || 0) * 0.02;
    const offer = {
        id: nextSimulationId('pomost'),
        symbol: company.symbol,
        name: company.name,
        project: project?.buildingType?.name || 'budowa',
        amount: Math.round(Math.min(20000, Math.max(2000, (project?.price || 50000) * 0.1)) / 100) * 100,
        rate: 0.12 + risk + getRandomInRange(0, 0.06),
        weeks: getRandomIntInRange(8, 16),
        weeksLeft: 3
    };
    bridgeLoanOffers.push(offer);
    logEvent(`🏗️ ${company.name} szuka finansowania pomostowego na „${offer.project}”: ${offer.amount.toLocaleString('pl-PL')} zł, ${(offer.rate * 100).toFixed(1)}% rocznie.`, 'construction');
    return offer;
}

function fundBridgeLoan(offerId) {
    const offer = bridgeLoanOffers.find(item => item.id === offerId);
    const company = offer && stocks.find(s => s.symbol === offer.symbol);
    if (!offer || !company || company.isBankrupt) { showToast('Oferta nieaktualna.', 'error'); return null; }
    if (offer.amount > playerCash) { showToast('Za mało gotówki funduszu.', 'error'); return null; }
    if (offer.amount > getFundBridgeCapacity() + 1e-6) { showToast(`Limit finansowania pomostowego: ${(BRIDGE_FUND_LIMIT * 100).toFixed(0)}% aktywów.`, 'error'); return null; }

    playerCash -= offer.amount;
    adjustCompanyCash(company, offer.amount);
    adjustBalanceSheet(company, { assets: offer.amount, liabilities: offer.amount });
    recordPayment('player-fund', company, offer.amount, `Pożyczka pomostowa: ${offer.project}`);
    const loan = { id: offer.id, symbol: company.symbol, name: company.name, project: offer.project, principal: offer.amount, rate: offer.rate, accrued: 0, weeksLeft: offer.weeks, termWeeks: offer.weeks, extended: false };
    getFundBridgeLoans().push(loan);
    bridgeLoanOffers = bridgeLoanOffers.filter(item => item !== offer);
    logEvent(`🏗️ Fundusz udziela ${company.name} pożyczki pomostowej ${offer.amount.toLocaleString('pl-PL')} zł (${(offer.rate * 100).toFixed(1)}%, ${offer.weeks} tyg.).`, 'review');
    if (typeof refreshFundViews === 'function') refreshFundViews();
    return loan;
}

function closeBridgeLoan(loan, received, text) {
    playerCash += received;
    playerFund.bridgeLoans = getFundBridgeLoans().filter(item => item !== loan);
    logEvent(text, 'review');
}

/** Co tydzień: odsetki, spłata w terminie, przedłużenie, odzysk przy bankructwie. */
function processBridgeLoansWeekly() {
    generateBridgeLoanOffers();
    for (const loan of [...getFundBridgeLoans()]) {
        const company = stocks.find(s => s.symbol === loan.symbol);
        if (!company || company.isBankrupt) {
            const recovery = loan.principal * BRIDGE_RECOVERY;
            closeBridgeLoan(loan, recovery, `💥 ${loan.name} upada — fundusz odzyskuje ${recovery.toFixed(0)} z ${loan.principal.toFixed(0)} zł pożyczki pomostowej.`);
            continue;
        }
        loan.accrued += loan.principal * loan.rate / FUND_WEEKS_PER_YEAR;
        loan.weeksLeft--;
        if (loan.weeksLeft > 0) continue;

        const due = loan.principal + loan.accrued;
        if (company.cash >= due) {
            adjustCompanyCash(company, -due);
            adjustBalanceSheet(company, { assets: -due, liabilities: -loan.principal, retainedEarnings: -loan.accrued });
            closeBridgeLoan(loan, due, `🏗️ ${company.name} spłaca pożyczkę pomostową: ${due.toFixed(0)} zł (odsetki ${loan.accrued.toFixed(0)} zł).`);
        } else if (!loan.extended) {
            loan.extended = true;
            loan.weeksLeft = 4;
            logEvent(`⚠️ ${company.name} prosi o przesunięcie spłaty pożyczki pomostowej o 4 tygodnie.`, 'construction');
        } else {
            const paid = Math.max(0, company.cash * 0.5);
            adjustCompanyCash(company, -paid);
            adjustBalanceSheet(company, { assets: -paid, liabilities: -Math.min(paid, loan.principal) });
            closeBridgeLoan(loan, paid, `💥 ${company.name} spłaca tylko ${paid.toFixed(0)} z ${due.toFixed(0)} zł pożyczki pomostowej.`);
        }
    }
}

// #################################################################################
// ## etf.js
// #################################################################################

// etf.js — ETF-y z prawdziwym portfelem (wersja 0.10.2, część M3)
//
// Każdy ETF ma emitenta (bank inwestycyjny / internetowy albo GPW), strategię z losowymi zasadami
// (sektor, maks. udział jednej spółki, tylko płacący dywidendę, tylko giełda złota+, tylko spółki
// państwowe, tylko arystokraci, REIT-y, holdingi), portfel prawdziwych akcji kupionych na rynku
// (widoczny w akcjonariacie spółek) i cenę = wartość aktywów netto / liczba jednostek.
// Co kwartał przegląda skład (rebalancing). Co roku sprawdza cel wzrostu (5–12%): gdy go nie dowozi,
// zmienia sposób ważenia. Banki tworzą nowe ETF-y; małe ETF-y banków są zamykane.

const ETF_CASH_BUFFER = 0.03;
const ETF_START_UNITS = 10000;
const ETF_MAX_COUNT = 22;
const ETF_CLOSE_NAV = 150000;
const ETF_MIN_SHARES = 5000;
const ETF_MAX_TRADE_PCT = 0.05; // jednorazowo najwyżej 5% akcji spółki
const ETF_WEIGHTINGS = { cap: 'wg kapitalizacji', equal: 'równe wagi', value: 'niedowartościowane' };

const ETF_TEMPLATES = [
    { key: 'Technologia', label: 'Tech', rules: { sectors: ['Technologia', 'Gaming', 'Badania'] } },
    { key: 'Bankowość', label: 'Banki', rules: { sectors: ['Bankowość', 'Bankowość Komercyjna', 'Finanse'] } },
    { key: 'Przemysł', label: 'Przemysł', rules: { sectors: ['Przemysł', 'Chemia'] } },
    { key: 'Energia', label: 'Energia', rules: { sectors: ['Energia'] } },
    { key: 'Nieruchomości', label: 'Nieruchomości', rules: { sectors: ['Nieruchomości', 'Budowlany'] } },
    { key: 'Medycyna', label: 'Zdrowie', rules: { sectors: ['Medycyna'] } },
    { key: 'Konsument', label: 'Konsument', rules: { sectors: ['Dobra konsumpcyjne', 'Żywność', 'Turystyka'] } },
    { key: 'Usługi', label: 'Usługi', rules: { sectors: ['Usługi', 'Logistyka', 'Transport', 'Media'] } },
    { key: 'Dywidendowy', label: 'Dywidendowy', rules: { dividendOnly: true } },
    { key: 'Arystokraci', label: 'Arystokratów', rules: { aristocratsOnly: true } },
    { key: 'Złoty', label: 'Blue Chip', rules: { minExchangeLevel: 3 } },
    { key: 'Państwowy', label: 'Skarbu Państwa', rules: { stateOnly: true } },
    { key: 'REIT', label: 'REIT', rules: { assetType: 'REIT' } },
    { key: 'Holding', label: 'Holdingów', rules: { assetType: 'Holding' } },
    { key: 'Obronność', label: 'Zbrojeniowy', rules: { sectors: ['Obronność'] } }
];

// Startowy zestaw (symbole zachowane z poprzednich wersji tam, gdzie się da).
const ETF_START_SET = [
    ['TSX', 'Technologia'], ['FSX', 'Bankowość'], ['PSX', 'Przemysł'], ['ESX', 'Energia'], ['NSX', 'Nieruchomości'],
    ['MHX', 'Medycyna'], ['DKX', 'Konsument'], ['USX', 'Usługi'], ['DVX', 'Dywidendowy'], ['ARX', 'Arystokraci'],
    ['BCX', 'Złoty'], ['SPX', 'Państwowy'], ['RTX', 'REIT'], ['HDX', 'Holding']
];

function getEtfIssuers() {
    return commercialBanks.filter(bank => bank.isActive && !bank.isParabank && [BANK_TYPES.INVESTMENT, BANK_TYPES.INTERNET].includes(bank.type));
}

function randomEtfRules(template) {
    const rules = { sectors: [], assetType: null, maxWeight: getRandomInRange(0.1, 0.25), dividendOnly: false, minExchangeLevel: 0, stateOnly: false, aristocratsOnly: false, ...template.rules };
    // Losowe dodatkowe zasady — każdy ETF jest trochę inny.
    if (!rules.dividendOnly && !rules.assetType && Math.random() < 0.2) rules.dividendOnly = true;
    if (!rules.minExchangeLevel && !rules.assetType && Math.random() < 0.15) rules.minExchangeLevel = 2;
    return rules;
}

function describeEtfRules(etf) {
    const r = etf.rules;
    const parts = [];
    if (r.sectors?.length) parts.push(r.sectors.join(', '));
    if (r.assetType) parts.push(r.assetType === 'REIT' ? 'tylko REIT-y' : 'tylko holdingi');
    if (r.dividendOnly) parts.push('tylko płacący dywidendę');
    if (r.aristocratsOnly) parts.push('tylko arystokraci');
    if (r.stateOnly) parts.push('tylko spółki państwowe');
    if (r.minExchangeLevel) parts.push(`giełda: ${Object.values(exchanges).find(e => e.level === r.minExchangeLevel)?.name || r.minExchangeLevel}+`);
    parts.push(`maks. ${(r.maxWeight * 100).toFixed(0)}% na spółkę`);
    parts.push(ETF_WEIGHTINGS[etf.weighting]);
    return parts.join(' · ');
}

function createEtf({ symbol, templateKey, issuer = null, seed }) {
    const template = ETF_TEMPLATES.find(t => t.key === templateKey) || ETF_TEMPLATES[0];
    const issuerName = issuer?.name || 'GPW';
    const etf = {
        symbol,
        name: `${issuerName} ${template.label} ETF`,
        template: template.key,
        issuerId: issuer?.id || null,
        issuerName,
        rules: randomEtfRules(template),
        weighting: getRandomElement(Object.keys(ETF_WEIGHTINGS)),
        holdings: {},
        cash: seed,
        units: ETF_START_UNITS,
        price: seed / ETF_START_UNITS,
        priceHistory: [],
        yearTarget: getRandomInRange(0.05, 0.12),
        yearStartPrice: seed / ETF_START_UNITS,
        quartersInYear: 0,
        ageQuarters: 0,
        lastResult: null
    };
    etf.description = `Emitent: ${issuerName}. Zasady: ${describeEtfRules(etf)}.`;
    return etf;
}

/** Nowa gra (i migracja starszych zapisów): startowy zestaw ETF-ów z portfelami. */
function initializeEtfs() {
    etfs.length = 0;
    const issuers = getEtfIssuers();
    for (const [symbol, templateKey] of ETF_START_SET) {
        const issuer = Math.random() < 0.6 && issuers.length ? getRandomElement(issuers) : null;
        const etf = createEtf({ symbol, templateKey, issuer, seed: getRandomIntInRange(5, 20) * 100000 });
        etfs.push(etf);
        rebalanceEtf(etf, true);
        updateEtfPrice(etf);
    }
}

// =================================================================================
// SKŁAD I WYCENA
// =================================================================================

function isEtfEligible(etf, stock) {
    const r = etf.rules;
    if (!stock || stock.isBankrupt || stock.canBeTraded === false || stock.exchange === 'INCUBATOR' || !(stock.price > 0)) return false;
    // Ostrożność: bez małych emisji i cen oderwanych od wartości godziwej.
    if ((stock.totalShares || 0) < ETF_MIN_SHARES) return false;
    const fair = Number(stock.fundamentals?.fairValue);
    if (fair > 0 && (stock.price > fair * 4 || stock.price < fair / 4)) return false;
    if (r.assetType ? stock.assetType !== r.assetType : Boolean(stock.assetType)) return false;
    if (r.sectors?.length && !stock.sector?.some(sector => r.sectors.includes(sector))) return false;
    if (r.dividendOnly && !(stock.assetType === 'REIT' || (stock.dividendHistory || []).length > 0 || stock.dividendPolicy && stock.dividendPolicy !== 'Growth')) return false;
    if (r.aristocratsOnly && !stock.isDividendAristocrat) return false;
    if (r.stateOnly && !stock.isStateOwned) return false;
    if (r.minExchangeLevel && (exchanges[stock.exchange]?.level || 0) < r.minExchangeLevel) return false;
    return true;
}

function getEtfUniverse(etf) {
    let universe = stocks.filter(stock => isEtfEligible(etf, stock));
    // Arystokratów jeszcze nie ma — tymczasowo płacący dywidendę.
    if (!universe.length && etf.rules.aristocratsOnly) universe = stocks.filter(stock => isEtfEligible({ ...etf, rules: { ...etf.rules, aristocratsOnly: false, dividendOnly: true } }, stock));
    return universe;
}

function getEtfTargetWeights(etf, universe) {
    const raw = universe.map(stock => {
        if (etf.weighting === 'equal') return 1;
        if (etf.weighting === 'value') {
            const fair = Number(stock.fundamentals?.fairValue) || stock.price;
            return Math.max(0.2, Math.min(3, fair / stock.price)) * Math.sqrt(stock.price * stock.totalShares);
        }
        return stock.price * stock.totalShares;
    });
    let weights = normalizeWeights(raw);
    // Limit udziału jednej spółki — nadwyżkę rozdziel na pozostałe (kilka przejść).
    const cap = Math.max(etf.rules.maxWeight, 1 / Math.max(1, universe.length));
    for (let pass = 0; pass < 5; pass++) {
        const over = weights.reduce((sum, w) => sum + Math.max(0, w - cap), 0);
        if (over < 1e-9) break;
        const free = weights.reduce((sum, w) => sum + (w < cap ? w : 0), 0) || 1;
        weights = weights.map(w => w >= cap ? cap : w + over * w / free);
    }
    return weights;
}

function normalizeWeights(values) {
    const total = values.reduce((sum, v) => sum + v, 0) || 1;
    return values.map(v => v / total);
}

function getEtfNav(etf) {
    let value = Math.max(0, Number(etf.cash) || 0);
    for (const [symbol, shares] of Object.entries(etf.holdings)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) value += shares * stock.price;
    }
    return value;
}

function updateEtfPrice(etf) {
    etf.price = Math.max(0.01, getEtfNav(etf) / Math.max(1, etf.units));
    etf.priceHistory.push(etf.price);
    if (etf.priceHistory.length > 15) etf.priceHistory.shift();
}

/** Wołane co tik (economy.js) zamiast średniej cen sektora. */
function updateEtfPrices() {
    etfs.forEach(updateEtfPrice);
}

function etfSell(etf, stock, shares) {
    shares = Math.min(shares, etf.holdings[stock.symbol] || 0);
    if (!(shares > 0)) return 0;
    etf.holdings[stock.symbol] -= shares;
    if (etf.holdings[stock.symbol] <= 0) delete etf.holdings[stock.symbol];
    stock.sharesHeld = Math.max(0, stock.sharesHeld - shares);
    etf.cash += shares * stock.price;
    if (!etf.silentTrades && typeof chargeMarketCommission === 'function') chargeMarketCommission(stock, shares * stock.price, etf); // B1: równe zasady
    if (!etf.silentTrades) applyTradeImpact(stock, shares, -1);
    return shares;
}

function etfBuy(etf, stock, shares) {
    shares = Math.floor(Math.min(shares, getAvailableShares(stock), etf.cash / stock.price, stock.totalShares * ETF_MAX_TRADE_PCT));
    if (!(shares > 0)) return 0;
    etf.holdings[stock.symbol] = (etf.holdings[stock.symbol] || 0) + shares;
    stock.sharesHeld += shares;
    etf.cash -= shares * stock.price;
    if (!etf.silentTrades && typeof chargeMarketCommission === 'function') chargeMarketCommission(stock, shares * stock.price, etf);
    if (!etf.silentTrades) applyTradeImpact(stock, shares, 1);
    return shares;
}

/** Przegląd składu: sprzedaj nadwyżki i spółki spoza zasad, dokup braki. */
function rebalanceEtf(etf, silent = false) {
    etf.silentTrades = silent;
    const universe = getEtfUniverse(etf);
    const weights = getEtfTargetWeights(etf, universe);
    const investable = getEtfNav(etf) * (1 - ETF_CASH_BUFFER);
    const targets = new Map(universe.map((stock, i) => [stock.symbol, Math.floor(investable * weights[i] / stock.price)]));

    for (const symbol of Object.keys(etf.holdings)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (!stock) { delete etf.holdings[symbol]; continue; }
        const excess = etf.holdings[symbol] - (targets.get(symbol) || 0);
        if (excess > 0) etfSell(etf, stock, excess);
    }
    for (const stock of universe) {
        const missing = (targets.get(stock.symbol) || 0) - (etf.holdings[stock.symbol] || 0);
        if (missing > 0) etfBuy(etf, stock, missing);
    }
    etf.silentTrades = false;
}

/** Sprzedaż akcji proporcjonalnie, by mieć gotówkę na umorzenie jednostek. */
function raiseEtfCash(etf, amount) {
    const nav = getEtfNav(etf);
    if (etf.cash >= amount || nav <= 0) return;
    const fraction = Math.min(1, (amount - etf.cash) / Math.max(1, nav - etf.cash) * 1.02);
    for (const [symbol, shares] of Object.entries(etf.holdings)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) etfSell(etf, stock, Math.ceil(shares * fraction));
    }
}

// =================================================================================
// CO KWARTAŁ: REBALANCING, CEL ROCZNY, NOWE I ZAMYKANE ETF-y
// =================================================================================

function processEtfsQuarterly() {
    for (const etf of [...etfs]) {
        etf.ageQuarters++;
        etf.quartersInYear++;
        rebalanceEtf(etf);
        updateEtfPrice(etf);
        if (etf.quartersInYear >= 4) reviewEtfYear(etf);
        if (etf.issuerId && etf.ageQuarters >= 8 && getEtfNav(etf) < ETF_CLOSE_NAV) closeEtf(etf, 'za małe aktywa');
    }
    maybeLaunchBankEtf();
}

function reviewEtfYear(etf) {
    const result = etf.price / Math.max(0.01, etf.yearStartPrice) - 1;
    const hit = result >= etf.yearTarget;
    etf.lastResult = { result, target: etf.yearTarget, hit };
    if (!hit) {
        const previous = etf.weighting;
        etf.weighting = getRandomElement(Object.keys(ETF_WEIGHTINGS).filter(w => w !== previous));
        if (Math.random() < 0.3) etf.rules.maxWeight = Math.max(0.08, Math.min(0.35, etf.rules.maxWeight + getRandomInRange(-0.05, 0.05)));
        etf.description = `Emitent: ${etf.issuerName}. Zasady: ${describeEtfRules(etf)}.`;
        logEvent(`📊 ${etf.name} nie osiągnął celu (${(result * 100).toFixed(1)}% vs ${(etf.yearTarget * 100).toFixed(1)}%) — zmienia strategię na „${ETF_WEIGHTINGS[etf.weighting]}”.`, 'market');
    }
    etf.yearTarget = getRandomInRange(0.05, 0.12);
    etf.yearStartPrice = etf.price;
    etf.quartersInYear = 0;
}

function makeEtfSymbol(issuer) {
    const base = (issuer?.name || 'ETF').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2) || 'EX';
    for (let i = 0; i < 50; i++) {
        const symbol = `${base}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}X`;
        if (!etfs.some(e => e.symbol === symbol) && !stocks.some(s => s.symbol === symbol)) return symbol;
    }
    return `${base}${Date.now() % 1000}`;
}

function maybeLaunchBankEtf() {
    if (etfs.length >= ETF_MAX_COUNT) return null;
    const issuers = getEtfIssuers().filter(bank => bank.cash > 2e6 && etfs.filter(e => e.issuerId === bank.id).length < 3);
    if (!issuers.length || Math.random() > 0.15) return null;
    const issuer = getRandomElement(issuers);
    const seed = Math.round(issuer.cash * 0.05);
    issuer.cash -= seed;
    const etf = createEtf({ symbol: makeEtfSymbol(issuer), templateKey: getRandomElement(ETF_TEMPLATES).key, issuer, seed });
    etfs.push(etf);
    rebalanceEtf(etf);
    updateEtfPrice(etf);
    logEvent(`🆕 ${issuer.name} wprowadza na giełdę ${etf.name} (${etf.symbol}). ${etf.description}`, 'market');
    return etf;
}

/** Likwidacja: sprzedaż akcji, wypłata posiadaczom jednostek (fundusz gracza po cenie jednostki). */
function closeEtf(etf, reason) {
    for (const [symbol, shares] of Object.entries(etf.holdings)) {
        const stock = stocks.find(s => s.symbol === symbol);
        if (stock) etfSell(etf, stock, shares);
    }
    const price = etf.cash / Math.max(1, etf.units);
    const holding = playerPortfolio[etf.symbol];
    if (holding) {
        playerCash += holding.shares * price;
        if (typeof notePlayerPositionLoss === 'function') notePlayerPositionLoss(etf.symbol, holding.shares, 'zamknięcie ETF-u — rozliczenie po wartości aktywów', holding.shares * price);
        delete playerPortfolio[etf.symbol];
        showToast(`${etf.name} zostaje zamknięty — fundusz dostaje ${formatZl(holding.shares * price, 0)}.`, 'warning', 7000);
    }
    const issuer = commercialBanks.find(b => b.id === etf.issuerId);
    if (issuer) issuer.cash += Math.max(0, etf.cash - (holding ? holding.shares * price : 0)) * 0.5; // część wraca do emitenta (jego wkład)
    etfs.splice(etfs.indexOf(etf), 1);
    logEvent(`🔒 ${etf.name} zostaje zamknięty (${reason}).`, 'market');
}

/** Spółka znika z gry (przejęcie, bankructwo): pakiety ETF-ów. pricePerShare — wypłata w przejęciu. */
function settleEtfHoldings(symbol, pricePerShare = 0) {
    for (const etf of etfs) {
        const shares = etf.holdings[symbol] || 0;
        if (!shares) continue;
        etf.cash += shares * pricePerShare;
        delete etf.holdings[symbol];
    }
}

// =================================================================================
// HANDEL FUNDUSZU GRACZA (jednostki ETF: kreacja i umorzenie po wartości aktywów)
// =================================================================================

function getEtfCharismaBonus() {
    return [0, 0.005, 0.01, 0.015][Math.min(3, getSkillLevel('sharkCharisma'))] || 0;
}

function buyEtf(symbol, quantity) {
    if (getSkillLevel('etfExpert') === 0) { showToast("Musisz odblokować umiejętność 'Ekspert Rynków Globalnych', aby handlować funduszami ETF!"); return false; }
    const etf = etfs.find(e => e.symbol === symbol);
    quantity = Math.floor(Number(quantity));
    if (!etf || !(quantity > 0)) { showToast('Nieprawidłowe zlecenie ETF.', 'error'); return false; }
    const value = etf.price * quantity;
    const cost = value * (1 - getEtfCharismaBonus());
    if (playerCash < cost) { showToast('Nie masz wystarczająco gotówki, aby dokonać tego zakupu!'); return false; }

    playerCash -= cost;
    etf.units += quantity;
    etf.cash += value; // kreacja jednostek po wartości aktywów (rabat z charyzmy płaci emitent)
    const holding = playerPortfolio[symbol];
    if (holding) {
        holding.avgPrice = (holding.avgPrice * holding.shares + cost) / (holding.shares + quantity);
        holding.shares += quantity;
    } else {
        playerPortfolio[symbol] = { shares: quantity, avgPrice: cost / quantity, assetType: 'etf' };
    }
    displayCash();
    displayPortfolio();
    if (typeof checkPlayerTierUpgrade === 'function') checkPlayerTierUpgrade();
    return true;
}

function sellEtf(symbol, quantity) {
    if (getSkillLevel('etfExpert') === 0) { showToast("Musisz odblokować umiejętność 'Ekspert Rynków Globalnych', aby handlować funduszami ETF!"); return false; }
    const etf = etfs.find(e => e.symbol === symbol);
    const holding = playerPortfolio[symbol];
    quantity = Math.floor(Number(quantity));
    if (!etf || !holding || !(quantity > 0) || holding.shares < quantity) {
        showToast(`Nie masz wystarczającej liczby jednostek ${etf ? etf.name : symbol}. Posiadasz: ${holding ? holding.shares : 0}`);
        return false;
    }
    const value = etf.price * quantity;
    raiseEtfCash(etf, value);
    const paid = Math.min(value, etf.cash);
    etf.cash -= paid;
    etf.units -= quantity;
    const proceeds = paid * (1 + getEtfCharismaBonus());
    const profit = proceeds - holding.avgPrice * quantity;
    playerCash += proceeds;
    holding.shares -= quantity;
    if (holding.shares <= 0) delete playerPortfolio[symbol];
    logEvent(`Fundusz umarza ${quantity} jedn. ${etf.name} (wynik ${profit >= 0 ? '+' : ''}${profit.toFixed(2)} zł).`, 'review');
    displayCash();
    displayPortfolio();
    if (typeof checkPlayerTierUpgrade === 'function') checkPlayerTierUpgrade();
    return true;
}

/** Skład ETF-u (top pozycje z wagami) — do tabeli i okna szczegółów. */
function getEtfTopHoldings(etf, limit = 3) {
    const nav = getEtfNav(etf) || 1;
    return Object.entries(etf.holdings)
        .map(([symbol, shares]) => { const stock = stocks.find(s => s.symbol === symbol); return stock ? { symbol, weight: shares * stock.price / nav } : null; })
        .filter(Boolean).sort((a, b) => b.weight - a.weight).slice(0, limit);
}

// =================================================================================
// ZAPIS
// =================================================================================

function serializeEtfs() {
    return etfs.map(etf => ({ ...etf, silentTrades: undefined }));
}

function restoreEtfs(saved) {
    if (!Array.isArray(saved) || !saved.length || !saved[0].holdings) { initializeEtfs(); return false; }
    etfs.length = 0;
    for (const etf of saved) etfs.push({ ...etf, priceHistory: Array.isArray(etf.priceHistory) ? etf.priceHistory : [] });
    return true;
}

// #################################################################################
// ## markets.js
// #################################################################################

// markets.js — Spółki rynkowe i maklerzy (wersja 0.10.2, część M5)
//
// GPW to główny operator: notowana spółka, na której są wszystkie dotychczasowe spółki. XTD i PLU5
// rodzą się jako startupy — bardzo drogie, rozwijają się powoli, ale mogą nagle zyskać sponsora, który
// wchodzi na giełdę jako „członek rynku XTD”. Gdy operator zadebiutuje, na jego rynek wchodzi 5–10
// nowych spółek z istniejących sektorów. Euronext jest widoczny, ale nieaktywny.
// Operatorzy pobierają prowizję od transakcji na swoim rynku i opłatę za notowanie, inwestują w swoje
// spółki członkowskie i podpisują umowy na wyłączność. Zamknięcie operatora usuwa jego spółki z widoku
// gracza — posiadacze akcji są rozliczani po ostatniej cenie.

const MARKET_OPERATOR_DEFS = {
    GPW:      { name: 'Giełda Papierów Wartościowych', short: 'GPW', commission: 0.003, color: '#1f6feb', main: true },
    XTD:      { name: 'XTD Markets', short: 'XTD', commission: 0.002, color: '#8957e5' },
    PLU5:     { name: 'PLU5 Exchange', short: 'PLU5', commission: 0.0015, color: '#d29922' },
    EURONEXT: { name: 'Euronext', short: 'Euronext', commission: 0.0025, color: '#3fb950', dormantForever: true }
};
const OPERATOR_STARTUP_GOAL = [300000, 600000];  // bardzo drogie startupy
const OPERATOR_STARTUP_SLOWDOWN = 0.25;         // rozwój 4× wolniej niż zwykły startup
const OPERATOR_SPONSOR_CHANCE = 0.12;           // co kwartał w fazie startupu
const OPERATOR_SPAWN_CHANCE = 0.1;              // co kwartał, od 4. kwartału gry
const OPERATOR_LISTING_FEE = 0.0002;            // opłata za notowanie: % kapitalizacji członka na kwartał
const OPERATOR_EXCLUSIVITY_CHANCE = 0.1;
const LISTING_FEE_FACTOR = { GPW: 1, XTD: 0.7, PLU5: 0.5, EURONEXT: 1 }; // B4: tańsze rynki alternatywne
const LISTING_MOVE_PRICE_EFFECT = { GPW: 0.02, XTD: -0.03, PLU5: -0.03 };  // mniej inwestorów = niższa wycena

const MEMBER_NAME_PREFIXES = ['Nova', 'Prime', 'Delta', 'Orion', 'Vega', 'Atlas', 'Zenit', 'Polar', 'Astra', 'Kappa', 'Sigma', 'Aurora', 'Vistula', 'Baltica'];

let marketOperators = null;

function createMarketOperators() {
    const operators = {};
    for (const [id, def] of Object.entries(MARKET_OPERATOR_DEFS)) {
        operators[id] = { id, status: def.main ? 'active' : def.dormantForever ? 'inactive' : 'dormant', symbol: null, startupSymbol: null, sponsors: [], members: 0, commissionsTotal: 0 };
    }
    return operators;
}

function getStockMarket(stock) {
    return stock?.market || 'GPW';
}

function getMarketLabel(id) {
    return getMarketDef(id)?.short || id;
}

// =================================================================================
// 0.13.1 (D1): RYNKI INTERNETOWE — XTD, PLU5 i nowe rynki powstające w trakcie gry
// Startup operatora ma gwarancję debiutu; po debiucie operator nie upada, dopóki ma ≥ 3 spółki.
// Każdy rynek ma limit 8 spółek członkowskich (nie liczą się do limitu spółek krajowych).
// Gracz może kupić jednorazową koncesję na rynek: handel jego spółkami bez prowizji.
// =================================================================================

const INTERNET_MEMBER_LIMIT = 8;
const INTERNET_PROTECTION_MEMBERS = 3;
const MAX_INTERNET_MARKETS = 4;
const NEW_INTERNET_MARKET_CHANCE = 0.04;   // co kwartał, od 8. kwartału, gdy rynków < MAX_INTERNET_MARKETS
const INTERNET_MARKET_POOL = [
    { short: 'NETX', name: 'NetXchange', color: '#0ea5e9' }, { short: 'BRSN', name: 'Bursa.net', color: '#14b8a6' },
    { short: 'TH24', name: 'TradeHub 24', color: '#f97316' }, { short: 'EGLD', name: 'eGiełda', color: '#a855f7' },
    { short: 'KLIK', name: 'KlikMarket', color: '#ec4899' }, { short: 'CHMR', name: 'Chmura Kapitału', color: '#22c55e' }
];

/** Definicja rynku: stała (GPW, XTD, PLU5, Euronext) albo zapisana przy rynku powstałym w trakcie gry. */
function getMarketDef(id) {
    return MARKET_OPERATOR_DEFS[id] || (typeof marketOperators === 'object' && marketOperators ? marketOperators[id]?.def : null) || null;
}

function isInternetMarket(id) {
    const def = getMarketDef(id);
    return Boolean(def && !def.main && !def.dormantForever);
}

/** Spółka notowana na rynku internetowym (członek albo sam operator) — osobna zakładka i osobny limit. */
function isInternetMarketStock(stock) {
    return Boolean(stock && !stock.isBankrupt && isInternetMarket(getStockMarket(stock)));
}

function getInternetMarketIds() {
    ensureMarketOperators();
    return Object.keys(marketOperators).filter(id => isInternetMarket(id));
}

function getMarketMembers(operatorId) {
    const operator = marketOperators?.[operatorId];
    return stocks.filter(s => getStockMarket(s) === operatorId && !s.isBankrupt && !s.assetType && s.symbol !== operator?.symbol);
}

function hasInternetMemberSlot(operatorId) {
    return getMarketMembers(operatorId).length < INTERNET_MEMBER_LIMIT;
}

/** Operator chroniony przed upadkiem: rynek internetowy z co najmniej kilkoma spółkami. */
function isProtectedMarketOperator(stock) {
    return Boolean(stock?.marketOperator && isInternetMarket(stock.marketOperator) && getMarketMembers(stock.marketOperator).length >= INTERNET_PROTECTION_MEMBERS);
}

/** Nowy rynek internetowy w trakcie gry (startup operatora z puli nazw). */
function spawnInternetMarket() {
    ensureMarketOperators();
    const used = new Set(Object.values(marketOperators).map(op => getMarketDef(op.id)?.short));
    const pick = INTERNET_MARKET_POOL.find(item => !used.has(item.short));
    if (!pick) return null;
    const id = pick.short;
    marketOperators[id] = { id, status: 'dormant', symbol: null, startupSymbol: null, sponsors: [], members: 0, commissionsTotal: 0,
        def: { name: pick.name, short: pick.short, commission: Math.round(getRandomInRange(0.001, 0.0025) * 10000) / 10000, color: pick.color, internet: true } };
    LISTING_FEE_FACTOR[id] = 0.6;
    spawnOperatorStartup(marketOperators[id]);
    return marketOperators[id];
}

// --- Koncesja gracza ---
function getInternetConcessionCost(operatorId) {
    const operatorStock = getOperatorStock(operatorId);
    const cap = operatorStock ? getMarketCapValue(operatorStock) : 0;
    return Math.round(Math.max(500, Math.min(50000, cap * 0.002)));
}

function hasInternetConcession(operatorId) {
    return playerFund?.internetConcessions?.[operatorId] !== undefined; // wartość = kwartał zakupu (także 0)
}

function buyInternetConcession(operatorId) {
    if (!playerFund || !isInternetMarket(operatorId)) return false;
    if (hasInternetConcession(operatorId)) { showToast('Fundusz ma już koncesję na ten rynek.', 'default'); return false; }
    const operatorStock = getOperatorStock(operatorId);
    if (!operatorStock) { showToast('Rynek jeszcze nie działa — koncesję kupisz po debiucie operatora.', 'warning'); return false; }
    const cost = getInternetConcessionCost(operatorId);
    if (playerCash < cost) { showToast(`Koncesja kosztuje ${formatZl(cost, 0)} z gotówki funduszu.`, 'error'); return false; }
    playerCash -= cost;
    adjustCompanyCash(operatorStock, cost);
    adjustBalanceSheet(operatorStock, { assets: cost, retainedEarnings: cost });
    recordPayment('player-fund', operatorStock, cost, `Koncesja ${getMarketLabel(operatorId)}`);
    if (!playerFund.internetConcessions) playerFund.internetConcessions = {};
    playerFund.internetConcessions[operatorId] = typeof macro === 'object' ? macro.quarter : 0;
    logEvent(`🔑 Fundusz kupuje koncesję na rynek ${getMarketLabel(operatorId)} za ${formatZl(cost, 0)} — handel jego spółkami bez prowizji.`, 'review');
    return true;
}

/** Nowa gra (i migracja): stan operatorów + notowana spółka GPW. */
function initMarketOperators() {
    marketOperators = createMarketOperators();
    let gpw = stocks.find(s => s.marketOperator === 'GPW');
    if (!gpw) {
        gpw = createListedCompany({ name: MARKET_OPERATOR_DEFS.GPW.name, symbol: uniqueSymbol('GPW'), sector: ['Finanse'], price: getRandomInRange(110, 160), totalShares: 400000, exchange: 'SILVER' });
        gpw.marketOperator = 'GPW';
        stocks.push(gpw);
    }
    marketOperators.GPW.symbol = gpw.symbol;
    return marketOperators;
}

function ensureMarketOperators() {
    if (!marketOperators || !marketOperators.GPW) initMarketOperators();
    for (const op of Object.values(marketOperators)) if (op?.def?.short && LISTING_FEE_FACTOR[op.id] === undefined) LISTING_FEE_FACTOR[op.id] = 0.6; // rynki z zapisu
    for (const id of Object.keys(MARKET_OPERATOR_DEFS)) if (!marketOperators[id]) marketOperators[id] = createMarketOperators()[id];
    return marketOperators;
}

function uniqueSymbol(base) {
    let symbol = base;
    while (stocks.some(s => s.symbol === symbol) || (typeof etfs !== 'undefined' && etfs.some(e => e.symbol === symbol))) symbol += 'X';
    return symbol;
}

// =================================================================================
// NOWE SPÓŁKI (sponsor, członkowie nowego rynku)
// =================================================================================

/** Zwykła notowana spółka zbudowana jak debiutant ze startupu (pełna inicjalizacja). */
function createListedCompany({ name, symbol, sector, price, totalShares, exchange = 'BRONZE', market = 'GPW' }) {
    const base = generateNewStartup();
    const stock = {
        ...base,
        name: name || base.name,
        symbol: symbol || base.symbol,
        sector: sector || base.sector,
        exchange,
        market,
        price,
        totalShares,
        maxShares: totalShares,
        sharesHeld: 0,
        insiderShares: 0,
        financialHealth: getRandomIntInRange(0, 3),
        volatilityFactor: getRandomInRange(0.8, 1.8),
        reputation: { player: 0 }
    };
    delete stock.assetType;
    ['fundingGoal', 'currentFunding', 'developmentProgress', 'successChance', 'stage', 'isScam', 'isWhiteCrow', 'investors', 'ipoPriceBonus', 'overfundingEndTime'].forEach(key => delete stock[key]);
    const equity = price * totalShares;
    stock.balanceSheet = { assets: equity * 1.2, liabilities: equity * 0.2, shareCapital: equity * 0.3, retainedEarnings: equity * 0.7 };
    stock.cash = equity * getRandomInRange(0.05, 0.12);
    stock.quarterlyEarnings = 0;
    if (typeof initializeDepartments === 'function') initializeDepartments(stock);
    if (typeof initializeDescriptionParts === 'function') initializeDescriptionParts(stock);
    if (typeof initializeResearchForStock === 'function') initializeResearchForStock(stock);
    if (typeof generateCEO === 'function') generateCEO(stock);
    initializeFundamentals(stock, true);
    setCompanyDividendPolicy(stock, getRandomElement(['Growth', 'Balanced']));
    return stock;
}

function spawnMarketMember(operatorId, reason) {
    if (isInternetMarket(operatorId) ? !(hasInternetMemberSlot(operatorId) && hasFreeTotalListingSlot()) : !hasFreeListingSlot()) return null; // D1: limit spółek na rynek; P1: sufit krajowy i łączny
    const sectors = Object.keys(SECTOR_PROFILES).filter(s => !['Bankowość', 'Bankowość Komercyjna'].includes(s));
    const sector = [getRandomElement(sectors)];
    const base = generateNewStartup();
    // Generator startupów nie zna wszystkich sektorów — wtedy nazwa „marka + sektor”.
    const name = base.name.startsWith('DejwCorp') || !base.sector?.includes(sector[0])
        ? `${getRandomElement(MEMBER_NAME_PREFIXES)} ${sector[0]}` : base.name;
    const symbol = uniqueSymbol((name.normalize('NFD').replace(/[^A-Za-z ]/g, '').split(' ').map(w => w.slice(0, 2)).join('').toUpperCase() || 'NEW').slice(0, 4));
    const stock = createListedCompany({
        name, symbol, sector,
        price: getRandomInRange(25, 70), totalShares: getRandomIntInRange(20, 80) * 1000, exchange: 'BRONZE', market: operatorId
    });
    stocks.push(stock);
    logEvent(`🏛️ ${stock.name} (${stock.symbol}) wchodzi na giełdę jako członek rynku ${getMarketLabel(operatorId)}${reason ? ` — ${reason}` : ''}.`, 'market');
    return stock;
}

// =================================================================================
// CYKL ŻYCIA OPERATORÓW
// =================================================================================

function spawnOperatorStartup(operator) {
    const def = getMarketDef(operator.id);
    const startup = generateNewStartup();
    startup.name = def.name;
    startup.symbol = uniqueSymbol(def.short.toUpperCase());
    startup.sector = ['Finanse'];
    startup.fundingGoal = Math.round(getRandomIntInRange(...OPERATOR_STARTUP_GOAL) / 1000) * 1000;
    startup.successChance = getRandomInRange(0.55, 0.75);
    startup.isScam = false;
    startup.operatorStartup = operator.id;
    stocks.push(startup);
    operator.status = 'startup';
    operator.startupSymbol = startup.symbol;
    logEvent(`🚀 W inkubatorze pojawia się ${def.name} — przyszły operator rynku (cel finansowania ${startup.fundingGoal.toLocaleString('pl-PL')} zł).`, 'market');
    return startup;
}

/** Debiut startupu-operatora (wołane z handleSuccessfulIPO). */
function activateMarketOperator(startup) {
    const operator = ensureMarketOperators()[startup.operatorStartup];
    if (!operator) return;
    operator.status = 'active';
    operator.symbol = startup.symbol;
    startup.marketOperator = operator.id;
    startup.market = operator.id;
    // D1: rynek internetowy ma własny limit (INTERNET_MEMBER_LIMIT) — wliczają się sponsorzy z fazy startupu.
    const count = Math.max(0, Math.min(getRandomIntInRange(5, 8), INTERNET_MEMBER_LIMIT - getMarketMembers(operator.id).length));
    const fresh = Math.max(Math.min(1, count), Math.round(count * 0.7));
    for (let i = 0; i < fresh; i++) spawnMarketMember(operator.id, 'otwarcie nowego rynku');
    for (let i = fresh; i < count; i++) signExclusivity(operator, startup);
    logEvent(`🏛️ ${getMarketDef(operator.id).name} debiutuje i otwiera własny rynek internetowy: ${fresh} nowych spółek${count > fresh ? `, ${count - fresh} przechodzi z GPW` : ''}!`, 'market');
}

/** Upadek startupu-operatora (wołane z removeStartup). */
function onOperatorStartupRemoved(startup) {
    const operator = marketOperators?.[startup.operatorStartup];
    if (operator && operator.status === 'startup') closeMarketOperator(operator, 'startup operatora upadł');
}

/** Wykup wszystkich śledzonych posiadaczy po cenie (bez usuwania spółki). Zwraca wypłaconą kwotę. */
function buyOutAllHolders(stock, price) {
    const symbol = stock.symbol;
    let paid = 0;
    const fund = playerPortfolio[symbol];
    if (fund?.shares > 0) {
        if (typeof notePlayerPositionLoss === 'function') notePlayerPositionLoss(symbol, fund.shares, 'przymusowy wykup wszystkich akcjonariuszy (zamknięcie rynku / wycofanie z obrotu)', fund.shares * price);
        playerCash += fund.shares * price;
        paid += fund.shares * price;
        recordPayment(`external:${symbol}`, 'player-fund', fund.shares * price, `Wykup akcji ${symbol}`);
    }
    delete playerPortfolio[symbol];
    const wallet = playerWallet?.portfolio?.[symbol];
    if (wallet?.shares > 0) { playerWallet.cash += wallet.shares * price; paid += wallet.shares * price; }
    if (playerWallet?.portfolio) delete playerWallet.portfolio[symbol];
    for (const ai of aiCompetitors) {
        if (ai.portfolio?.[symbol]?.shares > 0) { ai.cash += ai.portfolio[symbol].shares * price; paid += ai.portfolio[symbol].shares * price; }
        if (ai.portfolio) delete ai.portfolio[symbol];
    }
    for (const manager of corporation?.managers || []) {
        const held = manager.fund?.portfolio?.[symbol]?.shares || 0;
        if (held > 0) { manager.fund.cash += held * price; paid += held * price; }
        if (manager.fund?.portfolio) delete manager.fund.portfolio[symbol];
    }
    for (const bank of commercialBanks) {
        if (bank.stockPortfolio?.[symbol]?.shares > 0) { bank.cash += bank.stockPortfolio[symbol].shares * price; paid += bank.stockPortfolio[symbol].shares * price; }
        if (bank.stockPortfolio) delete bank.stockPortfolio[symbol];
    }
    for (const owner of stocks) {
        const shares = (owner.holdingPortfolio?.[symbol]?.quantity || 0) + (owner.equityStakes?.[symbol] || 0);
        if (shares > 0) { adjustCompanyCash(owner, shares * price); paid += shares * price; }
        if (owner.holdingPortfolio) delete owner.holdingPortfolio[symbol];
        if (owner.equityStakes) delete owner.equityStakes[symbol];
    }
    if (typeof settleEtfHoldings === 'function') settleEtfHoldings(symbol, price);
    if (stock.cityShares > 0 && typeof city === 'object') { city.budget += stock.cityShares * price; stock.cityShares = 0; }
    stock.sharesHeld = 0;
    return paid;
}

/** Rozliczenie posiadaczy po ostatniej cenie i zdjęcie spółki z rynku. */
function delistStockAtPrice(stock, price) {
    buyOutAllHolders(stock, price);
    removeStockFromGame(stock.symbol);
}

function closeMarketOperator(operator, reason) {
    if (!operator || operator.status === 'closed' || getMarketDef(operator.id)?.main) return;
    const members = stocks.filter(s => getStockMarket(s) === operator.id && s.marketOperator !== operator.id);
    for (const stock of members) delistStockAtPrice(stock, stock.price);
    operator.status = 'closed';
    operator.sponsors = [];
    logEvent(`🔒 Rynek ${getMarketLabel(operator.id)} zostaje zamknięty (${reason}). ${members.length} spółek znika z notowań — posiadacze rozliczeni po ostatniej cenie.`, 'market');
}

// =================================================================================
// PROWIZJE I PRZYCHODY
// =================================================================================

function getOperatorStock(operatorId) {
    const operator = marketOperators?.[operatorId];
    return operator?.status === 'active' && operator.symbol ? stocks.find(s => s.symbol === operator.symbol && !s.isBankrupt) : null;
}

/** Prowizja od transakcji na rynku spółki; payer: 'player' albo bot. Zwraca pobraną kwotę. */
function chargeMarketCommission(stock, value, payer) {
    if (!marketOperators || !(value > 0)) return 0;
    const operatorId = getStockMarket(stock);
    const operatorStock = getOperatorStock(operatorId);
    if (!operatorStock || operatorStock === stock) return 0;
    const fee = value * (getMarketDef(operatorId)?.commission || 0);
    if (payer === 'player') {
        if (hasInternetConcession(operatorId)) return 0; // D1: koncesja — gracz handluje bez prowizji
        playerCash -= fee;
        recordPayment('player-fund', operatorStock, fee, `Prowizja ${getMarketLabel(operatorId)}`);
    } else if (payer && Number.isFinite(payer.cash)) {
        payer.cash -= fee;
    } else return 0;
    adjustCompanyCash(operatorStock, fee);
    adjustBalanceSheet(operatorStock, { assets: fee, retainedEarnings: fee });
    marketOperators[operatorId].commissionsTotal += fee;
    return fee;
}

// =================================================================================
// CO KWARTAŁ
// =================================================================================

function processMarketsQuarterly() {
    ensureMarketOperators();
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    // D1: kolejne rynki internetowe w trakcie gry.
    const liveInternet = Object.values(marketOperators).filter(op => isInternetMarket(op.id) && ['startup', 'active'].includes(op.status)).length;
    if (quarter >= 8 && liveInternet < MAX_INTERNET_MARKETS && hasFreeTotalListingSlot() && Math.random() < NEW_INTERNET_MARKET_CHANCE) spawnInternetMarket(); // P1: łączny sufit
    for (const operator of Object.values(marketOperators)) {
        const def = getMarketDef(operator.id);
        operator.members = stocks.filter(s => getStockMarket(s) === operator.id && s.marketOperator !== operator.id && !s.assetType).length;

        if (operator.status === 'dormant' && quarter >= 4 && Math.random() < OPERATOR_SPAWN_CHANCE) {
            spawnOperatorStartup(operator);
        } else if (operator.status === 'startup') {
            const startup = stocks.find(s => s.symbol === operator.startupSymbol);
            if (!startup) { closeMarketOperator(operator, 'startup operatora zniknął'); continue; }
            if (Math.random() < OPERATOR_SPONSOR_CHANCE) { // D1: rynki internetowe mają własny limit, nie krajowy
                const sponsor = spawnMarketMember(operator.id, `sponsor ${def.name}`);
                if (!sponsor) continue;
                operator.sponsors.push(sponsor.symbol);
                startup.successChance = Math.min(0.95, startup.successChance + 0.05);
            }
        } else if (operator.status === 'active') {
            const operatorStock = getOperatorStock(operator.id);
            if (!operatorStock) { if (!def.main) closeMarketOperator(operator, 'upadek operatora'); continue; }
            if (isProtectedMarketOperator(operatorStock) && (Number(operatorStock.financialHealth) || 0) < -2) operatorStock.financialHealth = -1; // D1: chroniony operator
            collectListingFees(operator, operatorStock);
            investInMembers(operator, operatorStock);
            if (!def.main && Math.random() < OPERATOR_EXCLUSIVITY_CHANCE) signExclusivity(operator, operatorStock);
        }
    }
}

function collectListingFees(operator, operatorStock) {
    for (const stock of stocks.filter(s => getStockMarket(s) === operator.id && s !== operatorStock && !s.assetType && !s.isBankrupt)) {
        const fee = Math.min(Math.max(0, stock.cash) * 0.05, getMarketCapValue(stock) * OPERATOR_LISTING_FEE * (LISTING_FEE_FACTOR[operator.id] ?? 1));
        if (!(fee > 0)) continue;
        adjustCompanyCash(stock, -fee);
        adjustBalanceSheet(stock, { assets: -fee, retainedEarnings: -fee });
        adjustCompanyCash(operatorStock, fee);
        adjustBalanceSheet(operatorStock, { assets: fee, retainedEarnings: fee });
    }
}

/** Operator inwestuje część gotówki w spółki swojego rynku (pakiety liczone w obrocie). */
function investInMembers(operator, operatorStock) {
    const members = stocks.filter(s => getStockMarket(s) === operator.id && s !== operatorStock && !s.assetType && !s.isBankrupt);
    if (!members.length || operatorStock.cash <= 0) return;
    const target = getRandomElement(members);
    const budget = operatorStock.cash * 0.05;
    const quantity = Math.floor(Math.min(getAvailableShares(target), budget / Math.max(0.01, target.price), target.totalShares * 0.02));
    if (quantity <= 0) return;
    const cost = quantity * target.price;
    adjustCompanyCash(operatorStock, -cost); // gotówka → akcje (aktywa bez zmian)
    target.sharesHeld += quantity;
    if (!operatorStock.equityStakes) operatorStock.equityStakes = {};
    operatorStock.equityStakes[target.symbol] = (operatorStock.equityStakes[target.symbol] || 0) + quantity;
}

/** Umowa na wyłączność: spółka z GPW przechodzi na rynek operatora (premia za podpis). */
function signExclusivity(operator, operatorStock) {
    if (isInternetMarket(operator.id) && !hasInternetMemberSlot(operator.id)) return null; // D1: limit spółek rynku
    const candidates = stocks.filter(s => getStockMarket(s) === 'GPW' && !s.marketOperator && !s.assetType && !s.isBankrupt && !s.isStateOwned
        && ['BRONZE', 'SILVER'].includes(s.exchange));
    if (!candidates.length) return null;
    const stock = getRandomElement(candidates);
    const bonus = Math.min(operatorStock.cash * 0.1, getMarketCapValue(stock) * 0.005);
    if (bonus > 0) {
        adjustCompanyCash(operatorStock, -bonus);
        adjustBalanceSheet(operatorStock, { assets: -bonus, retainedEarnings: -bonus });
        adjustCompanyCash(stock, bonus);
        adjustBalanceSheet(stock, { assets: bonus, retainedEarnings: bonus });
    }
    stock.market = operator.id;
    logEvent(`✍️ ${stock.name} podpisuje umowę na wyłączność z ${getMarketDef(operator.id).name} i przechodzi na rynek ${getMarketLabel(operator.id)}.`, 'market');
    return stock;
}

// =================================================================================
// B4: PRZENIESIENIE NOTOWAŃ SPÓŁKI FUNDUSZU (większość > 50%)
// =================================================================================

function getListingMoveTargets(stock) {
    if (!stock || stock.assetType || stock.marketOperator || stock.isStateOwned || getFundStakePct(stock) <= 0.5) return [];
    ensureMarketOperators();
    const fromInternet = isInternetMarketStock(stock);
    return Object.keys(marketOperators).filter(id => id !== getStockMarket(stock) && marketOperators[id]?.status === 'active' && (id in LISTING_MOVE_PRICE_EFFECT || isInternetMarket(id))
        && (isInternetMarket(id) ? hasInternetMemberSlot(id) : (!fromInternet || hasFreeListingSlot()))); // P2: także nowe rynki internetowe; P1: limity rynków
}

/** Efekt ceny przy przenosinach: rynki internetowe spoza listy jak XTD/PLU5. */
function getListingMovePriceEffect(marketId) {
    return LISTING_MOVE_PRICE_EFFECT[marketId] ?? (isInternetMarket(marketId) ? -0.03 : 0);
}

function moveListing(symbol, marketId) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!getListingMoveTargets(stock).includes(marketId)) { showToast('Przeniesienie notowań niemożliwe (wymaga większości i aktywnego rynku).', 'warning'); return false; }
    const quarter = typeof macro === 'object' ? macro.quarter : 0;
    if (stock.listingMovedQuarter !== undefined && quarter - stock.listingMovedQuarter < 4) { showToast('Notowania można przenieść raz na rok gry.', 'warning'); return false; }
    const cost = Math.round(getMarketCapValue(stock) * 0.003);
    if (stock.cash < cost) { showToast(`${stock.name} nie ma gotówki na przeniesienie (${formatZl(cost, 0)}).`, 'error'); return false; }
    adjustCompanyCash(stock, -cost);
    adjustBalanceSheet(stock, { assets: -cost, retainedEarnings: -cost });
    const from = getStockMarket(stock);
    stock.market = marketId;
    stock.listingMovedQuarter = quarter;
    const effect = getListingMovePriceEffect(marketId);
    applyPriceEffect(symbol, effect, effect >= 0 ? 'positive' : 'negative', 'company');
    logEvent(`🔀 ${stock.name} przenosi notowania z ${getMarketLabel(from)} na ${getMarketLabel(marketId)} (prowizja ${((getMarketDef(marketId)?.commission || 0) * 100).toFixed(2)}%, opłata za notowanie ×${LISTING_FEE_FACTOR[marketId] ?? 1}).`, 'market');
    return true;
}

// =================================================================================
// WIDOK: zakładka „Rynki” w oknie Państwa
// =================================================================================

function renderMarketsPanel() {
    ensureMarketOperators();
    const statusLabel = { active: '🟢 aktywny', startup: '🧪 startup w inkubatorze', dormant: '⏳ jeszcze nie istnieje', closed: '🔒 zamknięty', inactive: '⏸️ nieaktywny — wkrótce' };
    return `<p class="bank-lead">Operatorzy rynków pobierają prowizję od każdej transakcji na swoim rynku (płaci też fundusz) i opłatę za notowanie, inwestują w spółki członkowskie i podpisują umowy na wyłączność. Zamknięcie operatora zdejmuje jego spółki z notowań — posiadacze są rozliczani po ostatniej cenie.</p>
        <div class="bank-grid">${Object.values(marketOperators).filter(operator => operator.status === 'active').map(operator => { // tylko rynki notowane na giełdzie
            const def = getMarketDef(operator.id) || { name: operator.id, commission: 0, color: '#888' };
            const stock = operator.symbol ? stocks.find(s => s.symbol === operator.symbol) : null;
            const startup = operator.startupSymbol ? stocks.find(s => s.symbol === operator.startupSymbol && s.assetType === 'Startup') : null;
            return `<article class="bank-card market-card" style="border-top: 3px solid ${def.color}">
                <header class="bank-card-head"><span class="bank-card-icon">🏛️</span><div><h4>${escapeHtml(def.name)}</h4><span class="bank-card-type">${statusLabel[operator.status] || operator.status}</span></div></header>
                <dl class="bank-card-rates">
                    <div><dt>Prowizja</dt><dd>${(def.commission * 100).toFixed(2)}%</dd></div>
                    <div><dt>Spółki</dt><dd>${operator.members}</dd></div>
                    <div><dt>Kurs operatora</dt><dd>${stock ? formatZl(stock.price) : '—'}</dd></div>
                </dl>
                ${startup ? `<p class="text-sm">Finansowanie startupu: ${formatZl(startup.currentFunding, 0)} / ${formatZl(startup.fundingGoal, 0)} · sponsorzy: ${operator.sponsors.length}</p>` : ''}
                ${operator.commissionsTotal > 0 ? `<p class="text-xs text-muted">Prowizje łącznie: ${formatZl(operator.commissionsTotal, 0)}</p>` : ''}
            </article>`;
        }).join('')}</div>`;
}
