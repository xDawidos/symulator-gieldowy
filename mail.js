// mail.js — Skrzynka mailowa (etap E1)
//
// Zastępuje gazetę i popupy reklam. Zdarzenia z logEvent trafiają jako maile do czasopism-spółek
// (PULS, FLESZ, OBSER) według ich profilu albo od korporacji (sprawy gracza). Subskrypcja darmowa
// przysyła wszystko razem ze spamem, premium (płatna z portfela prywatnego) tylko ważne maile.
// Szkolenie „Filtr antyspamowy” (adblock) przenosi spam do folderu Spam.

const MAIL_LIMIT = 150;
const MAIL_FOLDERS = ['inbox', 'starred', 'corporation', 'PULS', 'FLESZ', 'OBSER', 'spam'];
const CORPORATION_SENDER = 'corporation';

const MAGAZINES = {
    PULS:  { label: 'Puls Rynku', premiumWeekly: 15, profile: 'Rynek, spółki, raporty i dywidendy' },
    FLESZ: { label: 'Flesz Giełdowy', premiumWeekly: 10, profile: 'Prezesi, skandale i plotki (nie zawsze prawdziwe)' },
    OBSER: { label: 'Obserwator Finansowy', premiumWeekly: 20, profile: 'Gospodarka, państwo, banki i miasto' }
};
const FREE_READER_AD_REVENUE = 5;   // zł tygodniowo dla czasopisma za darmowego czytelnika
const COMPANY_AD_COST = 200;        // tyle płaci spółka za mail sponsorowany

// Słowa kluczowe profili (sprawdzane w kolejności: korporacja, OBSER, FLESZ, reszta → PULS).
const MAIL_RULES = {
    corporation: /fundusz|Twój|Twoje|Twoja|Ocena zarządu|premi|Koniec okresu|zarząd|klient|\bJU\b|compliance|Przejęt|przejęci|Analityk|konsolidac|nadzór|Kamień milowy|ZWYCIĘSTWO|szkoleni|kieszonkow|Zatrudnion/i,
    OBSER: /PKB|koniunktur|stop[aąy] procent|Bank Centraln|inflac|recesj|ożywieni|rząd|państw|Skarb|miast|burmistrz|prezydent miasta|wybor|festyn|festiwal|obligac|\bbank|antymonopol|nacjonaliz|prywatyz|podat/i,
    FLESZ: /prezes|CEO|skandal|plotk|afer|dymisj|TikTok|influencer|celebryt|szejk|romans|sensac/i
};
const CORPORATION_CATEGORIES = ['review', 'success', 'warning', 'error'];
const ROUTINE_NEWS = /RAPORT|badani|Nowa oferta|przetarg|kampania marketingowa/i;
const NOISE_PATTERNS = /otrzymuje .* dywidendy|Fundusz .* nabywa|\[AI\]/i;

let mailbox = createMailbox();

function createMailbox() {
    return {
        messages: [],
        subscriptions: { PULS: 'free', FLESZ: 'free', OBSER: 'free' },
        nextId: 1,
        rumors: []   // plotki FLESZ czekające na sprostowanie lub potwierdzenie
    };
}

// =================================================================================
// DODAWANIE MAILI I FILTRY
// =================================================================================

function getMailClockMs() {
    return playerFund?.clockMs ?? 0;
}

/** Folder wiadomości: spam trafia do „Spam” tylko przy odpowiednim poziomie filtra. */
function getMailFolder(message) {
    if (message.isSpam) {
        const filter = getSkillLevel('adblock');
        if (message.spamKind === 'ad' && filter >= 1) return 'spam';
        if (message.spamKind === 'magazine' && filter >= 2) return 'spam';
    }
    return message.sender === CORPORATION_SENDER ? 'corporation' : message.sender;
}

function addMail({ sender, subject, body = '', importance = 1, isSpam = false, spamKind = null, symbol = null, action = null }) {
    if (!mailbox) return null;

    // Premium: tylko ważne maile, bez spamu tego czasopisma.
    const subscription = MAGAZINES[sender] ? mailbox.subscriptions[sender] : 'free';
    if (MAGAZINES[sender]) {
        if (!subscription) return null;
        if (subscription === 'premium' && (isSpam || importance < 2)) return null;
    }

    const message = {
        id: mailbox.nextId++,
        sender, subject, body, importance, isSpam, spamKind, symbol, action,
        read: false,
        starred: false,
        at: getMailClockMs()
    };
    mailbox.messages.unshift(message);
    trimMailbox();
    if (typeof updateMailBadge === 'function') updateMailBadge();
    return message;
}

function trimMailbox() {
    while (mailbox.messages.length > MAIL_LIMIT) {
        // Najpierw najstarsze przeczytane (bez gwiazdki), potem najstarsze w ogóle.
        let index = -1;
        for (let i = mailbox.messages.length - 1; i >= 0; i--) {
            const message = mailbox.messages[i];
            if (message.read && !message.starred) { index = i; break; }
        }
        mailbox.messages.splice(index >= 0 ? index : mailbox.messages.length - 1, 1);
    }
}

function getMailSenderName(sender) {
    if (sender === CORPORATION_SENDER) return `🏢 ${corporation?.name || playerProfile?.corporation || 'Korporacja'}`;
    if (MAGAZINES[sender]) return `📰 ${MAGAZINES[sender].label}`;
    const stock = stocks.find(s => s.symbol === sender);
    return stock ? `📣 ${stock.name}` : String(sender);
}

// =================================================================================
// ZDARZENIA → MAILE
// =================================================================================

function findMentionedStock(text) {
    let best = null;
    for (const stock of stocks) {
        if (!stock.name || stock.name.length < 3) continue;
        if (text.includes(stock.name) && (!best || stock.name.length > best.name.length)) best = stock;
    }
    return best;
}

function getMailImportance(text, sender) {
    if (/ZWYCIĘSTWO|AWANS|degradac|NACJONALIZACJA|BANKRUCTWO|bankrut|upad|Przejęto|prywatyzac|wybory|Kamień milowy|kara/i.test(text)) return 3;
    if (/Ocena zarządu|Koniec okresu|raport|wyniki|dywidend|przejęci|fuzj|IPO|debiut|emisj|stop[aąy] procent|faza|recesj|ożywieni|antymonopol|skandal/i.test(text)) return 2;
    if (sender === CORPORATION_SENDER) return 1;
    return 1;
}

/** Wołane z logEvent: kieruje zdarzenie do właściwego nadawcy. */
function routeEventToMail(text, category) {
    if (!mailbox || !text || NOISE_PATTERNS.test(text)) return null;

    let sender;
    if (CORPORATION_CATEGORIES.includes(category) && MAIL_RULES.corporation.test(text)) sender = CORPORATION_SENDER;
    else if (category === 'state' || category === 'city' || MAIL_RULES.OBSER.test(text)) sender = 'OBSER';
    else if (MAIL_RULES.FLESZ.test(text)) sender = 'FLESZ';
    else if (['market', 'company', 'construction', 'review', 'success', 'warning'].includes(category)) sender = 'PULS';
    else return null;

    const stock = findMentionedStock(text);
    let importance = Math.max(getMailImportance(text, sender), category === 'state' || category === 'city' ? 2 : 0);
    const held = stock && (playerPortfolio[stock.symbol] || playerWallet?.portfolio?.[stock.symbol]);
    if (held) importance = Math.max(importance, 2);                                        // spółki z portfela zawsze ważne
    else if (ROUTINE_NEWS.test(text) && importance < 3) importance = 1;                   // rutyna o innych spółkach
    // Czasopisma nie piszą o wszystkim: drobne wiadomości tylko czasem (bez spółki — rzadziej).
    if (sender !== CORPORATION_SENDER && importance < 2 && Math.random() > (stock ? 0.25 : 0.1)) return null;
    const subject = text.split(/(?<=[.!?])\s/)[0].slice(0, 120);
    return addMail({ sender, subject, body: text, importance, symbol: stock?.symbol || null });
}

// =================================================================================
// CO TYDZIEŃ: SUBSKRYPCJE, SPAM, PLOTKI
// =================================================================================

function processMailWeekly() {
    if (!mailbox) return;
    chargeMagazineSubscriptions();
    sendCompanyAdSpam();
    sendMagazineSpam();
    processTabloidRumors();
}

function chargeMagazineSubscriptions() {
    for (const [symbol, def] of Object.entries(MAGAZINES)) {
        const stock = stocks.find(s => s.symbol === symbol);
        const subscription = mailbox.subscriptions[symbol];
        if (!subscription || !stock) continue;

        if (subscription === 'premium') {
            if (playerWallet.cash >= def.premiumWeekly) {
                playerWallet.cash -= def.premiumWeekly;
                adjustCompanyCash(stock, def.premiumWeekly);
                recordPayment('player-wallet', stock, def.premiumWeekly, `Prenumerata premium: ${def.label}`);
            } else {
                mailbox.subscriptions[symbol] = 'free';
                addMail({ sender: symbol, subject: 'Prenumerata premium wygasła — brak środków', body: `Nie udało się pobrać ${def.premiumWeekly} zł z Twojego konta. Wracasz do wersji darmowej.`, importance: 2 });
            }
        } else {
            // Darmowy czytelnik = przychód od reklamodawców (z zewnątrz modelu).
            adjustCompanyCash(stock, FREE_READER_AD_REVENUE);
            recordPayment('external:reklamodawcy', stock, FREE_READER_AD_REVENUE, 'Reklamy w wersji darmowej');
        }
    }
}

const AD_TEMPLATES = [
    s => [`🔥 ${s.name} — okazja, której nie możesz przegapić!`, `Zainwestuj w ${s.name} (${s.symbol}) już dziś! Analitycy* są zachwyceni. *Analitycy opłaceni przez ${s.name}.`],
    s => [`Tylko dziś: ${s.name} z rabatem 50%!`, `Produkty ${s.name} taniej niż kiedykolwiek. Kup teraz, zanim zrobią to inni!`],
    s => [`Gratulacje! Wygrałeś voucher od ${s.name} 🎁`, `Kliknij, aby odebrać nagrodę. (To nie jest phishing, słowo ${s.name}.)`],
    s => [`${s.name} szuka partnerów biznesowych`, `Dołącz do sieci ${s.name} i zarabiaj od pierwszego dnia!`]
];

function sendCompanyAdSpam() {
    const advertisers = stocks.filter(s => !s.assetType && !s.isBankrupt && s.cash > COMPANY_AD_COST * 10);
    const count = getRandomIntInRange(1, 3);
    for (let i = 0; i < count && advertisers.length; i++) {
        const stock = getRandomElement(advertisers);
        const media = stocks.find(s => s.symbol === getRandomElement(Object.keys(MAGAZINES)));
        adjustCompanyCash(stock, -COMPANY_AD_COST);
        if (media) {
            adjustCompanyCash(media, COMPANY_AD_COST);
            recordPayment(stock, media, COMPANY_AD_COST, 'Kampania mailowa');
        }
        const [subject, body] = getRandomElement(AD_TEMPLATES)(stock);
        addMail({ sender: stock.symbol, subject, body, importance: 0, isSpam: true, spamKind: 'ad', symbol: stock.symbol });
    }
}

function sendMagazineSpam() {
    for (const [symbol, def] of Object.entries(MAGAZINES)) {
        if (mailbox.subscriptions[symbol] !== 'free' || Math.random() > 0.5) continue;
        addMail({
            sender: symbol,
            subject: getRandomElement([`Przejdź na ${def.label} Premium — pierwszy tydzień taniej!`, `Nie przegap ważnych wiadomości — ${def.label} Premium`, `Ankieta czytelników ${def.label} (zajmie tylko 45 minut)`]),
            body: `Wersja premium to tylko ważne wiadomości i zero spamu za ${def.premiumWeekly} zł tygodniowo. Zarządzaj prenumeratą w zakładce „Subskrypcje”.`,
            importance: 0, isSpam: true, spamKind: 'magazine'
        });
    }
}

/** FLESZ publikuje plotki — część okazuje się prawdziwa, część dostaje sprostowanie. */
function processTabloidRumors() {
    for (const rumor of [...mailbox.rumors]) {
        rumor.weeksLeft--;
        if (rumor.weeksLeft > 0) continue;
        mailbox.rumors = mailbox.rumors.filter(item => item !== rumor);
        const stock = stocks.find(s => s.symbol === rumor.symbol);
        if (!stock) continue;
        if (rumor.isTrue) {
            applyPriceEffect(stock.symbol, rumor.positive ? 0.03 : -0.03, rumor.positive ? 'positive' : 'negative', 'company');
            addMail({ sender: 'FLESZ', subject: `Potwierdzamy: plotka o ${stock.name} była prawdziwa!`, body: `Nasze źródła się nie myliły. Rynek reaguje na wiadomości o ${stock.name}.`, importance: 2, symbol: stock.symbol });
        } else {
            addMail({ sender: 'FLESZ', subject: `Sprostowanie: ${stock.name}`, body: `Informacja o ${stock.name} sprzed kilku dni okazała się nieprawdziwa. Przepraszamy czytelników.`, importance: 2, symbol: stock.symbol });
        }
    }

    if (Math.random() > 0.3) return;
    const stock = getRandomElement(stocks.filter(s => !s.assetType && !s.isBankrupt));
    if (!stock) return;
    const positive = Math.random() < 0.5;
    mailbox.rumors.push({ symbol: stock.symbol, positive, isTrue: Math.random() < 0.5, weeksLeft: getRandomIntInRange(1, 3) });
    addMail({
        sender: 'FLESZ',
        subject: positive ? `PLOTKA: ${stock.name} szykuje wielki kontrakt?` : `PLOTKA: kłopoty w zarządzie ${stock.name}?`,
        body: positive
            ? `Nieoficjalnie: ${stock.name} jest o krok od podpisania umowy, która zmieni wszystko. Spółka milczy.`
            : `Według naszych informatorów prezes ${stock.name} ma poważne problemy. Spółka nie komentuje.`,
        importance: 1, symbol: stock.symbol
    });
}

// =================================================================================
// AKCJE GRACZA
// =================================================================================

function setMagazineSubscription(symbol, level) {
    if (!MAGAZINES[symbol] || ![null, 'free', 'premium'].includes(level)) return false;
    if (level === 'premium' && playerWallet.cash < MAGAZINES[symbol].premiumWeekly) {
        showToast(`Premium kosztuje ${MAGAZINES[symbol].premiumWeekly} zł tygodniowo — za mało środków.`, 'error');
        return false;
    }
    mailbox.subscriptions[symbol] = level;
    return true;
}

function markMailRead(id, read = true) {
    const message = mailbox.messages.find(m => m.id === id);
    if (message) message.read = read;
    if (typeof updateMailBadge === 'function') updateMailBadge();
}

function toggleMailStar(id) {
    const message = mailbox.messages.find(m => m.id === id);
    if (message) message.starred = !message.starred;
}

function deleteMail(id) {
    mailbox.messages = mailbox.messages.filter(m => m.id !== id);
    if (typeof updateMailBadge === 'function') updateMailBadge();
}

function markAllMailRead(folder) {
    getMailInFolder(folder).forEach(message => { message.read = true; });
    if (typeof updateMailBadge === 'function') updateMailBadge();
}

function getMailInFolder(folder) {
    if (folder === 'starred') return mailbox.messages.filter(m => m.starred);
    if (folder === 'inbox') return mailbox.messages.filter(m => getMailFolder(m) !== 'spam');
    return mailbox.messages.filter(m => getMailFolder(m) === folder);
}

function getUnreadMailCount(folder = 'inbox') {
    return getMailInFolder(folder).filter(m => !m.read).length;
}
