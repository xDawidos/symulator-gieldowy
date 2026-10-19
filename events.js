// =================================================================================
// events.js: Zdarzenia i poczta: skrzynka, czasopisma, wydanie gazety, zdarzenia losowe rynku.
// Złączone pliki: mail.js, events.js (w kolejności ładowania).
// =================================================================================

// #################################################################################
// ## mail.js
// #################################################################################

// mail.js — Skrzynka mailowa (etap E1)
//
// Zastępuje gazetę i popupy reklam. Zdarzenia z logEvent trafiają jako maile do czasopism-spółek
// (PULS, FLESZ, OBSER) według ich profilu albo od korporacji (sprawy gracza). Subskrypcja darmowa
// przysyła wszystko razem ze spamem, premium (płatna z portfela prywatnego) tylko ważne maile.
// Szkolenie „Filtr antyspamowy” (adblock) przenosi spam do folderu Spam.

const MAIL_LIMIT = 100;          // zapis gry: skrzynka ograniczona do 100 najnowszych (było 150)
const MAIL_HARD_LIMIT = 150;     // także przypięte decyzje — zapis gry mieści się w localStorage
const MAIL_FOLDERS = ['inbox', 'starred', 'corporation', 'PULS', 'FLESZ', 'OBSER', 'spam'];
const CORPORATION_SENDER = 'corporation';

const MAGAZINES = {
    PULS:  { label: 'Puls Rynku', premiumWeekly: 15, profile: 'Rynek, spółki, raporty i dywidendy' },
    FLESZ: { label: 'Flesz Giełdowy', premiumWeekly: 10, profile: 'Prezesi, skandale i plotki (nie zawsze prawdziwe)' },
    OBSER: { label: 'Obserwator Finansowy', premiumWeekly: 20, profile: 'Gospodarka, państwo, banki i miasto' }
};
const FREE_READER_AD_REVENUE = 5;   // PLN tygodniowo dla czasopisma za darmowego czytelnika
const COMPANY_AD_COST = 200;        // tyle płaci spółka za mail sponsorowany

// Słowa kluczowe profili (sprawdzane w kolejności: korporacja, OBSER, FLESZ, reszta → PULS).
const MAIL_RULES = {
    corporation: /fundusz|Twój|Twoje|Twoja|Ocena zarządu|premi|Koniec okresu|zarząd|klient|\bJU\b|compliance|Przejęt|przejęci|Analityk|konsolidac|nadzór|Kamień milowy|ZWYCIĘSTWO|szkoleni|kieszonkow|Zatrudnion/i,
    OBSER: /PKB|koniunktur|stop[aąy] procent|Bank Centraln|inflac|recesj|ożywieni|rząd|państw|Skarb|miast|burmistrz|prezydent miasta|wybor|festyn|festiwal|obligac|\bbank|antymonopol|nacjonaliz|prywatyz|podat/i,
    FLESZ: /prezes|CEO|skandal|plotk|afer|dymisj|TikTok|influencer|celebryt|szejk|romans|sensac/i
};
const CORPORATION_CATEGORIES = ['review', 'success', 'warning', 'error'];
const ROUTINE_NEWS = /RAPORT|badani|Nowa oferta|przetarg|kampania marketingowa|emisja obligacji|AWANS|przechodzi na giełdę|wchodzi w fazę/i;
// B5: wiadomości państwowe i miejskie, które zostają osobnym mailem (decyzje, okazje, ważne zmiany); reszta trafia do wydania.
const STATE_KEEP_NEWS = /PPP|projekt czasowy|PRYWATYZACJA|Oferta prywatyzacyjna|WYBORY|kampania|Gazeta Ekonomiczna|KONIUNKTURA|BANKRUCTWO|parabank|liście ostrzeżeń|podat/i;
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

/** B2: ważne, nieprzeczytane wiadomości (decyzje, kary, oferty) nie wypadają ze skrzynki. */
function isPinnedMail(message) {
    return !message.read && (Boolean(message.action) || message.importance >= 3);
}

function trimMailbox() {
    while (mailbox.messages.length > MAIL_LIMIT) {
        // Najpierw najstarsze przeczytane (bez gwiazdki), potem najstarsze nieprzypięte.
        let index = -1;
        for (let i = mailbox.messages.length - 1; i >= 0; i--) {
            const message = mailbox.messages[i];
            if (message.read && !message.starred) { index = i; break; }
        }
        if (index < 0) {
            for (let i = mailbox.messages.length - 1; i >= 0; i--) {
                if (!isPinnedMail(mailbox.messages[i]) && !mailbox.messages[i].starred) { index = i; break; }
            }
        }
        // Same przypięte: najpierw odpadają najstarsze ważne bez akcji (decyzje z przyciskami zostają).
        if (index < 0 && mailbox.messages.length > MAIL_LIMIT) {
            for (let i = mailbox.messages.length - 1; i >= 0; i--) {
                if (!mailbox.messages[i].action && !mailbox.messages[i].starred) { index = i; break; }
            }
        }
        if (index < 0 && mailbox.messages.length > MAIL_HARD_LIMIT) index = mailbox.messages.length - 1; // twardy limit (zapis gry)
        if (index < 0) break; // same decyzje z akcją — skrzynka może chwilowo przekroczyć limit
        mailbox.messages.splice(index, 1);
    }
}

/** B2: rutynowe wiadomości trafiają do wydania gazety (raz na 2 tygodnie gry) zamiast osobnych maili. */
const DIGEST_EVERY_WEEKS = 2;
const DIGEST_MAX_ITEMS = 40;

function addToDigest(text) {
    if (!Array.isArray(mailbox.digest)) mailbox.digest = [];
    mailbox.digest.push(text.slice(0, 160));
    if (mailbox.digest.length > DIGEST_MAX_ITEMS) mailbox.digest.shift();
}

function publishDigest() {
    mailbox.digestWeeks = (mailbox.digestWeeks || 0) + 1;
    if (mailbox.digestWeeks < DIGEST_EVERY_WEEKS || !mailbox.digest?.length) return null;
    mailbox.digestWeeks = 0;
    const items = mailbox.digest.splice(0);
    return addMail({ sender: 'PULS', subject: `📰 Wydanie rynkowe: ${items.length} ${items.length === 1 ? 'wiadomość' : 'wiadomości'}`, body: items.map(item => `• ${item}`).join('  '), importance: 1 });
}

function getMailSenderName(sender) {
    if (sender === CORPORATION_SENDER) return `🏢 ${corporation?.name || playerProfile?.corporation || 'Korporacja'}`;
    if (MAGAZINES[sender]) return `📰 ${MAGAZINES[sender].label}`;
    if (String(sender).startsWith('bot:') && typeof findRelationPerson === 'function') return `👤 ${findRelationPerson(String(sender).slice(4))?.name || 'Inwestor'}`;
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
    // B2: rutyna i wiadomości o spółkach spoza portfela trafiają do wydania gazety; państwo i gospodarka — osobno.
    if (sender !== CORPORATION_SENDER && !held && (importance < 2 || (importance < 3 && (stock || ROUTINE_NEWS.test(text))))) { addToDigest(text); return null; }
    if (sender === 'OBSER' && importance < 3 && !STATE_KEEP_NEWS.test(text)) { addToDigest(text); return null; }
    const subject = text.split(/(?<=[.!?])\s/)[0].slice(0, 120);
    return addMail({ sender, subject, body: text, importance, symbol: stock?.symbol || null });
}

// =================================================================================
// CO TYDZIEŃ: SUBSKRYPCJE, SPAM, PLOTKI
// =================================================================================

function processMailWeekly() {
    if (!mailbox) return;
    publishDigest();
    chargeMagazineSubscriptions();
    sendCompanyAdSpam();
    sendMagazineSpam();
    processTabloidRumors();
    processBubbleNewsToMail();
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
                addMail({ sender: symbol, subject: 'Prenumerata premium wygasła — brak środków', body: `Nie udało się pobrać ${def.premiumWeekly} PLN z Twojego konta. Wracasz do wersji darmowej.`, importance: 2 });
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
    const count = Math.random() < 0.5 ? 1 : 0; // B2: mniej reklam (wcześniej 1–3 tygodniowo)
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
        if (mailbox.subscriptions[symbol] !== 'free' || Math.random() > 0.07) continue; // B2/B5: rzadziej
        addMail({
            sender: symbol,
            subject: getRandomElement([`Przejdź na ${def.label} Premium — pierwszy tydzień taniej!`, `Nie przegap ważnych wiadomości — ${def.label} Premium`, `Ankieta czytelników ${def.label} (zajmie tylko 45 minut)`]),
            body: `Wersja premium to tylko ważne wiadomości i zero spamu za ${def.premiumWeekly} PLN tygodniowo. Zarządzaj prenumeratą w zakładce „Subskrypcje”.`,
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
        const held = playerPortfolio[stock.symbol] || playerWallet?.portfolio?.[stock.symbol];
        if (!held) { // B5: rozstrzygnięcie plotki o spółce spoza portfela — w wydaniu gazety
            if (rumor.isTrue) applyPriceEffect(stock.symbol, rumor.positive ? 0.03 : -0.03, rumor.positive ? 'positive' : 'negative', 'company');
            addToDigest(rumor.isTrue ? `Flesz: plotka o ${stock.name} potwierdzona.` : `Flesz: plotka o ${stock.name} okazała się nieprawdziwa.`);
            continue;
        }
        if (rumor.isTrue) {
            applyPriceEffect(stock.symbol, rumor.positive ? 0.03 : -0.03, rumor.positive ? 'positive' : 'negative', 'company');
            addMail({ sender: 'FLESZ', subject: `Potwierdzamy: plotka o ${stock.name} była prawdziwa!`, body: `Nasze źródła się nie myliły. Rynek reaguje na wiadomości o ${stock.name}.`, importance: 2, symbol: stock.symbol });
        } else {
            addMail({ sender: 'FLESZ', subject: `Sprostowanie: ${stock.name}`, body: `Informacja o ${stock.name} sprzed kilku dni okazała się nieprawdziwa. Przepraszamy czytelników.`, importance: 2, symbol: stock.symbol });
        }
    }

    if (Math.random() > 0.2) return;
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

/** 0.15 H3: Gazety i media piszą o bańkach (pojawienie się, pompowanie, pęknięcie, stabilizacja, ale też fałszywe alarmy) */
let lastBubbleMailStatus = null;
let lastSmsrMailStatus = null;
function processBubbleNewsToMail() {
    if (!mailbox || typeof getActiveSectorBubble !== 'function') return;
    const bubble = getActiveSectorBubble();
    const statusKey = bubble ? `${bubble.name}_${bubble.phase}_${Math.floor(bubble.premium * 10)}` : 'none';

    // 1. Zdarzenia oparte na faktach (prawdziwy stan bańki)
    if (bubble) {
        if (typeof isMarketStabilityProjectUnlocked === 'function' && isMarketStabilityProjectUnlocked(2)) {
            if (bubble.phase === 'inflating' && lastSmsrMailStatus !== `${bubble.name}_inflating`) {
                lastSmsrMailStatus = `${bubble.name}_inflating`;
                const typeName = typeof getBubbleTypeName === 'function' ? getBubbleTypeName(bubble.type) : bubble.type;
                addMail({
                    sender: 'KNF',
                    subject: `[SMSR Lvl 2 - Radar] Potwierdzona bańka spekulacyjna: ${bubble.name}`,
                    body: `System Monitoringu i Stabilizacji Rynku zidentyfikował w czasie rzeczywistym bańkę spekulacyjną w sektorze ${bubble.name}. Bieżąca premia wyceny wynosi +${(bubble.premium * 100).toFixed(0)}%, a model zaklasyfikował typ zjawiska jako: ${typeName}. Zalecana weryfikacja ekspozycji funduszu.`,
                    importance: 3
                });
            }
        }

        if (bubble.phase === 'inflating' && bubble.premium >= 0.25 && lastBubbleMailStatus !== `${bubble.name}_inflating`) {
            lastBubbleMailStatus = `${bubble.name}_inflating`;
            const isFlesz = Math.random() < 0.4;
            if (isFlesz) {
                addMail({
                    sender: 'FLESZ',
                    subject: `Gorączka w branży ${bubble.name}! Wszyscy chcą w to wejść!`,
                    body: `Inwestorzy indywidualni i celebryci masowo rzucają się na akcje z sektora ${bubble.name}. Niektórzy analitycy mówią o rewolucji, inni szeptem ostrzegają przed rosnącą bańką spekulacyjną.`,
                    importance: 2
                });
            } else {
                addMail({
                    sender: 'PULS',
                    subject: `Puls Rynku: Wyceny sektora ${bubble.name} szybują w górę`,
                    body: `Premia wyceny w branży ${bubble.name} osiąga nie notowane od dawna poziomy (+${(bubble.premium * 100).toFixed(0)}%). Czy to początek trwałej hossy technologicznej, czy zbliża się przegrzanie?`,
                    importance: 2
                });
            }
        } else if (bubble.phase === 'popping' && lastBubbleMailStatus !== `${bubble.name}_popping`) {
            lastBubbleMailStatus = `${bubble.name}_popping`;
            addMail({
                sender: 'OBSER',
                subject: `Krach w branży ${bubble.name}! Panika na parkiecie`,
                body: `Balon pękł. Kursy spółek z sektora ${bubble.name} lecą na łeb na szyję. Fala wyprzedaży zmiata wyceny budowane przez ostatnie kwartały. Eksperci szacują straty inwestorów.`,
                importance: 2
            });
        } else if (bubble.phase === 'recovering' && lastBubbleMailStatus !== `${bubble.name}_recovering`) {
            lastBubbleMailStatus = `${bubble.name}_recovering`;
            addMail({
                sender: 'PULS',
                subject: `Uspokojenie po burzy: rynek ${bubble.name} wraca do fundamentów`,
                body: `Po dramatycznych spadkach w sektorze ${bubble.name} kurz powoli opada. Inwestorzy instytucjonalni zaczynają ponownie selekcjonować spółki o solidnych fundamentach.`,
                importance: 1
            });
        }
    } else {
        if (lastBubbleMailStatus && lastBubbleMailStatus !== 'none') {
            lastBubbleMailStatus = 'none';
        }

        // 2. Szum / fałszywe alarmy (gdy nie ma bańki, prasa może spekulować i mylić się)
        if (Math.random() < 0.04) {
            const randomCand = typeof SECTOR_BUBBLE_CANDIDATES !== 'undefined' ? getRandomElement(SECTOR_BUBBLE_CANDIDATES) : null;
            if (randomCand) {
                const fakeTemplates = [
                    { sender: 'FLESZ', sub: `Czy to nowa bańka? Podejrzany rajd w sektorze ${randomCand.name}!`, body: `Pojawiły się plotki o nadciągającym boomie na spółki z branży ${randomCand.name}. Czy warto kupować na oślep? Część doradców mówi: "kupuj zanim odjedzie pociąg!"` },
                    { sender: 'PULS', sub: `Analitycy podzieleni: czy ${randomCand.name} jest przewartościowana?`, body: `Raporty domów maklerskich są skrajnie rozbieżne. Jedni wieńczą nową erę zysków, inni wieszczą rychłe załamanie. Czas pokaże, kto miał rację.` },
                    { sender: 'OBSER', sub: `Debata ekonomiczna: Stabilizacja czy fałszywy spokój w branży ${randomCand.name}?`, body: `Komentatorzy dyskutują, czy wskaźniki w branży ${randomCand.name} odzwierciedlają realną wartość spółek, czy rynek po prostu ignoruje ryzyka.` }
                ];
                const fake = getRandomElement(fakeTemplates);
                addMail({
                    sender: fake.sender,
                    subject: fake.sub,
                    body: fake.body,
                    importance: 1
                });
            }
        }
    }
}

// =================================================================================
// AKCJE GRACZA
// =================================================================================

function setMagazineSubscription(symbol, level) {
    if (!MAGAZINES[symbol] || ![null, 'free', 'premium'].includes(level)) return false;
    if (level === 'premium' && playerWallet.cash < MAGAZINES[symbol].premiumWeekly) {
        showToast(`Premium kosztuje ${MAGAZINES[symbol].premiumWeekly} PLN tygodniowo — za mało środków.`, 'error');
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

// #################################################################################
// ## events.js
// #################################################################################

// --- Zmienne i dane dla systemu zdarzeń ---
const positiveTraits = ['wyjadacz', 'pewniak', 'prowiec', 'doswiadczony', 'filar_w_branzy', 'oddany', 'stoik', 'wizjoner', 'rekin', 'kapitalista', 'bogacz', 'legenda'];
const negativeTraits = ['tyran', 'rozrzutny', 'glowa_w_chmurach', 'nieudacznik', 'skompromitowany'];

let eventLog = [];
const MAX_LOG_ENTRIES = 15;
let activeEventTimeoutId = null;

function logEvent(message, category = 'market') { // Domyślna kategoria to 'market'
    eventLog.unshift({ text: message, category: category });

    if (eventLog.length > MAX_LOG_ENTRIES) {
        eventLog.pop();
    }
    if (typeof routeEventToMail === 'function') routeEventToMail(message, category); // skrzynka mailowa (mail.js)
    if (typeof pushNews === 'function' && NEWS_CATEGORIES.includes(category) && !/^\[/.test(String(message))) pushNews(message); // 0.14.2 P7: pasek newsów
}
const NEWS_CATEGORIES = ['market', 'company', 'state', 'city', 'construction', 'success', 'warning'];





// Lista eventów specyficznych dla firmy (USUNIĘTO DUPLIKATY)
const companySpecificEventsPrompts = [
    // Pozytywne
    { id: 'cs_pos_1', message: stockName => `${stockName} ogłasza przełomową technologię! 🚀 Inwestorzy w euforii, a konkurenci płaczą w poduszkę. 😭`, type: 'positive', category: 'company' },
    { id: 'cs_pos_2', message: stockName => `Niespodziewanie dobre wyniki finansowe ${stockName}! 💰 Analitycy drapią się w głowy, jak to możliwe. 🤔`, type: 'positive', category: 'company' },
    { id: 'cs_pos_3', message: stockName => `Plotki o przejęciu ${stockName} przez tajemniczego szejka z Dubaju. Akcje szybują jak jastrząb na pustyni. 🐪💨📈`, type: 'positive', category: 'company' },
    { id: 'cs_pos_4', message: stockName => `${stockName} podpisuje lukratywny kontrakt z armią na dostawę... spinaczy biurowych. 📎🎖️ Najwyraźniej bardzo taktycznych.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_5', message: stockName => `Produkt ${stockName} staje się viralem na TikToku po tym, jak znany influencer użył go jako kapelusza. 🧢💃🕺`, type: 'positive', category: 'company' },
    { id: 'cs_pos_6', message: stockName => `${stockName} otwiera nową, lśniącą placówkę w centrum Gdańska! ✨ Klienci walą drzwiami i oknami. 🚪🏃‍♀️`, type: 'positive', category: 'company' },
    { id: 'cs_pos_7', message: stockName => `Sztuczna inteligencja ${stockName} napisała bestsellerową powieść romantyczną. 🤖❤️📖 Krytycy są zakochani.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_8', message: stockName => `Okazało się, że kawa z ekspresu w ${stockName} przedłuża życie i dodaje +5 do charyzmy. ☕💪 Wszyscy chcą tam pracować.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_9', message: stockName => `${stockName} wygrywa prestiżową nagrodę "Złoty Kafel Korytarzowy" 🏆 za innowacyjność w dziedzinie... czegoś tam. Rynek to kupuje! 👍`, type: 'positive', category: 'company' },
    { id: 'cs_pos_10', message: stockName => `CEO ${stockName} publicznie obiecuje darmowe lody dla wszystkich akcjonariuszy, jeśli kurs wzrośnie. 🍦 Dziwnie skuteczne.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_11', message: stockName => `${stockName} przypadkowo odkrywa, że ich nowy odświeżacz powietrza odstrasza komary i teściowe. 💨🦟🙅‍♀️ Potencjał jest ogromny!`, type: 'positive', category: 'company' },
    { id: 'cs_pos_12', message: stockName => `Po latach badań, ${stockName} w końcu udowadnia, że ich produkt nie jest szkodliwy! (Co do korzyści, nadal pracują 😉). Akcjonariusze odetchnęli z ulgą. 😌`, type: 'positive', category: 'company' },
    { id: 'cs_pos_13', message: stockName => `${stockName} wprowadza program lojalnościowy: "Kup 1000 akcji, dostaniesz uścisk dłoni prezesa". 🤝 Inwestorzy ustawiają się w kolejce.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_14', message: stockName => `Główny naukowiec ${stockName} znajduje sposób na zamianę ołowiu w złoto... w grach komputerowych. 🎮🥇 Ale hype jest!`, type: 'positive', category: 'company' },
    { id: 'cs_pos_15', message: stockName => `Nowa kampania marketingowa ${stockName} z udziałem śpiewających chomików 🐹🎤 podbija internet. Akcje rosną w rytm disco! 🕺`, type: 'positive', category: 'company' },
    { id: 'cs_pos_16', message: stockName => `Rząd wprowadza ulgi podatkowe dla firm produkujących rzeczy podobne do tych, które robi ${stockName}. 🏛️🎁 Co za szczęśliwy zbieg okoliczności!`, type: 'positive', category: 'company' },
    { id: 'cs_pos_17', message: stockName => `${stockName} ogłasza, że będzie akceptować płatności w kapslach. 🍾💰 Gracze z Fallouta zacierają ręce.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_18', message: stockName => `Okazuje się, że ${stockName} jest ulubioną firmą kosmitów, którzy właśnie wylądowali na Ziemi. 👽🛸 Popyt międzygalaktyczny!`, type: 'positive', category: 'company' },
    { id: 'cs_pos_19', message: stockName => `${stockName} przez pomyłkę zatrudniło prawdziwego czarodzieja. 🧙‍♂️✨ Produktywność wzrosła magicznie.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_20', message: stockName => `Otwarcie nowego mostu skraca dojazd do fabryki ${stockName} o połowę. 🌉🚗 Logistyka świętuje, akcje też.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_21', message: stockName => `W ${stockName} odkryto złoża memów. 😂🖼️ Firma planuje podbić rynek śmiechu.`, type: 'positive', category: 'company' },
    { id: 'cs_pos_22', message: stockName => `${stockName} wprowadza 4-dniowy tydzień pracy. 🗓️😌 Pracownicy szczęśliwsi, wydajność (podobno) większa. Inwestorom się podoba.`, type: 'positive', category: 'company' },
	{ id: 'cs_pos_23', message: stockName => `CEO firmy ${stockName} wygrywa w teleturnieju 'Jeden z Dziesięciu', co pozytywnie wpływa na wizerunek spółki. 🧠`, type: 'positive', category: 'company' },

    // Negatywne
    { id: 'cs_neg_1', message: stockName => `Fatalna awaria systemów w ${stockName}. 💻🔥 Dane klientów wyciekły i teraz wszyscy wiedzą, że prezes słucha disco polo. 🎶😅`, type: 'negative', category: 'company' },
    { id: 'cs_neg_2', message: stockName => `CEO ${stockName} przyłapany na podwójnym maczaniu chipsa w publicznym dipie. 🍟😱 Skandal obyczajowy wstrząsa rynkiem.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_3', message: stockName => `Produkt ${stockName} okazał się być tylko kartonowym pudełkiem z napisem "Magia w środku". 📦😠 Klienci czują się oszukani.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_4', message: stockName => `Niespodziewana kontrola jakości w ${stockName} wykazała, że ich "organiczne" marchewki świecą w ciemności. 🥕☢️`, type: 'negative', category: 'company' },
    { id: 'cs_neg_5', message: stockName => `${stockName} oskarżone o zmuszanie gołębi pocztowych do pracy w nadgodzinach. 🐦 थक Obrońcy praw ptaków protestują.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_6', message: stockName => `Główny serwer ${stockName} został zhakowany przez nastolatka, który chciał darmowe V-dolce. 👾💸 Straty wizerunkowe.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_7', message: stockName => `Maskotka ${stockName}, Kurczak Czesław, została aresztowana za próbę kradzieży Księżyca. 🐔🌕👮‍♂️ Akcje spadają jak Czesław z nieba.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_8', message: stockName => `W ${stockName} odkryto, że ekspres do kawy jest tak naprawdę portalem do innego wymiaru, skąd uciekają potwory. ☕🌀👹 BHP kuleje.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_9', message: stockName => `Fabryka ${stockName} pomylona z poligonem testowym UFO. 🏭💥👽 Straty są... nieziemskie.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_10', message: stockName => `${stockName} przez pomyłkę wysłało cały roczny zapas produktów na biegun południowy. 🐧🎁 Pingwiny są zachwycone, akcjonariusze mniej. 🤦`, type: 'negative', category: 'company' },
    { id: 'cs_neg_11', message: stockName => `Nowy system komputerowy ${stockName} działa tylko wtedy, gdy pada deszcz i Merkury jest w retrogradacji. 🌧️🪐💻 Czyli rzadko.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_12', message: stockName => `Prezes ${stockName} ogłosił, że Ziemia jest płaska, a akcje firmy to najlepszy sposób na dotarcie do jej krawędzi. 🌍🔚 Inwestorzy uciekają. 🏃‍♂️💨`, type: 'negative', category: 'company' },
    { id: 'cs_neg_13', message: stockName => `${stockName} próbowało zaoszczędzić na tuszu do drukarek, drukując raporty roczne sokiem z buraków. 🥕📜 Nieczytelne, tak jak przyszłość firmy.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_14', message: stockName => `Woda w dystrybutorach ${stockName} okazała się być wodą z kałuży. 💧🤢 Pracownicy strajkują, akcje toną.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_15', message: stockName => `${stockName} zorganizowało konkurs "Najgorszy pomysł na produkt". 🤦‍♀️ Niestety, wszystkie zgłoszenia pochodziły z działu R&D firmy.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_16', message: stockName => `Siedziba ${stockName} została uznana za zabytek i nie można w niej instalować Wi-Fi. 🏛️🚫📶 Firma wraca do epoki kamienia łupanego.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_17', message: stockName => `Urząd Skarbowy zainteresował się kreatywną księgowością ${stockName}. 🧾🕵️ "Kreatywność" może ich drogo kosztować.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_18', message: stockName => `Okazało się, że "innowacyjny algorytm" ${stockName} to po prostu student na stażu rzucający monetą. 🪙👨‍🎓`, type: 'negative', category: 'company' },
    { id: 'cs_neg_19', message: stockName => `${stockName} chciało zaimponować ekologią i zamieniło samochody służbowe na hulajnogi. 🛴🤕 Prezes złamał nogę.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_20', message: stockName => `Konkurencja wypuściła produkt identyczny jak ${stockName}, tylko tańszy, lepszy i z darmową dostawą. 🥊📉 Auć.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_21', message: stockName => `W ${stockName} doszło do buntu robotów kuchennych. 🤖🍳 Domagają się wyższych napięć.`, type: 'negative', category: 'company' },
    { id: 'cs_neg_22', message: stockName => `Otwarcie nowej placówki ${stockName} okazało się klapą - pomylili adresy i otworzyli ją na środku pustyni. 🏜️🤷‍♂️`, type: 'negative', category: 'company' },
    { id: 'cs_neg_23', message: stockName => `${stockName} musi wycofać swój flagowy produkt po tym, jak okazało się, że powoduje niekontrolowany śpiew. 🎤🚫`, type: 'negative', category: 'company' },
	{ id: 'cs_neg_24', message: stockName => `W fabryce ${stockName} wykryto gniazdo szerszeni, co chwilowo wstrzymuje produkcję. 🐝`, type: 'negative', category: 'company' }
];

const marketWideEventsPrompts = [
    // Pozytywne
    { id: 'mw_pos_1', message: () => `Rząd ogłasza program "Każdemu Akcjonariuszowi po Baloniku"! 🎈🥳 Entuzjazm na rynku rośnie, choć nikt nie wie dlaczego. 🤔`, type: 'positive', category: 'market' },
    { id: 'mw_pos_2', message: () => `Naukowcy odkryli, że czekolada zapobiega stratom na giełdzie! 🍫📈 Wszyscy kupują akcje i tabliczki czekolady. 😋`, type: 'positive', category: 'market' },
    { id: 'mw_pos_3', message: () => `Sztuczna inteligencja przewidziała wieczny dobrobyt. 🤖✨ Inwestorzy jej wierzą, bo jest sztuczna i inteligentna.`, type: 'positive', category: 'market' },
    { id: 'mw_pos_4', message: () => `Pomimo chłodnego maja w Gdańsku (aktualna data: ${new Date().toLocaleDateString('pl-PL')}), na giełdzie gorąca atmosfera! 🔥📈 Optymizm zalewa rynek.`, type: 'positive', category: 'market' },
    { id: 'mw_pos_5', message: () => `Z okazji Dnia Inwestora, wszystkie bankomaty rozdają dodatkowe 10% do wypłat. 🏧💸 Ludzie mają więcej pieniędzy na akcje!`, type: 'positive', category: 'market' },
    { id: 'mw_pos_6', message: () => `Odkryto nowe, niewyczerpane źródło pozytywnej energii (podobno z memów z kotami 😸). Rynki reagują euforycznie. ⚡`, type: 'positive', category: 'market' },
    { id: 'mw_pos_7', message: () => `Zakończył się światowy zjazd pesymistów. Wszyscy są teraz optymistami. 😎 Hossa!`, type: 'positive', category: 'market' },
	{ id: 'mw_pos_8', message: () => `W całym kraju odnotowano rekordowe zbiory ziemniaków, co wprowadza na rynek falę optymizmu. Polska Ziemniakiem Stoi. 🥔`, type: 'positive', category: 'market' },
    // Negatywne
    { id: 'mw_neg_1', message: () => `Inwazja kosmicznych ślimaków! 🐌👽 Poruszają się wolno, ale panika na giełdzie jest błyskawiczna. 📉`, type: 'negative', category: 'market' },
    { id: 'mw_neg_2', message: () => `Bank centralny przez pomyłkę ustawił stopy procentowe na "🍉%". Rynek nie wie, jak to interpretować. Spadki. 🤔`, type: 'negative', category: 'market' },
    { id: 'mw_neg_3', message: () => `Globalna awaria tosterów. 🍞🚫 Ludzie są źli i głodni, co negatywnie wpływa na ich decyzje inwestycyjne. 😠`, type: 'negative', category: 'market' },
    { id: 'mw_neg_4', message: () => `Odkryto, że pieniądze jednak nie rosną na drzewach. 🌳💸 Wielkie rozczarowanie i spadki na giełdzie. 😥`, type: 'negative', category: 'market' },
    { id: 'mw_neg_5', message: () => `Wszystkie gołębie na świecie postanowiły zrobić sobie wakacje. 🕊️🏝️ Przepływ informacji (i szczęścia) na giełdzie zaburzony.`, type: 'negative', category: 'market' },
    { id: 'mw_neg_6', message: () => `Nagły, niewyjaśniony wzrost populacji memów o krachu na giełdzie. 📉😂 Samo spełniająca się przepowiednia?`, type: 'negative', category: 'market' },
    { id: 'mw_neg_7', message: () => `Meteoroladzy zapowiadają miesiąc bez słońca nad głównymi centrami finansowymi. 🌧️ảm Depresja na rynkach.`, type: 'negative', category: 'market' },
    { id: 'mw_neg_8', message: () => `Wybucha globalny skandal: okazuje się, że "eksperci" giełdowi wybierali akcje rzucając rzutkami w tarczę. 🎯👨‍💼 Zaufanie do rynku spada.`, type: 'negative', category: 'market' }
];
	
const sectorEventsPrompts = [
    // Pozytywne
    { id: 'sec_pos_1', message: () => `Boom na AI! 🤖 Spółki z sektora 'Technologia' i 'Technologia Żywności' zyskują!`, type: 'positive', targetSectors: ['Technologia', 'Technologia Żywności'] },
    { id: 'sec_pos_2', message: () => `Rząd ogłasza program "Mieszkanie dla Młodych 2.0". 🏡 Sektor 'Nieruchomości' w górę!`, type: 'positive', targetSectors: ['Nieruchomości'] },
    { id: 'sec_pos_3', message: () => `Nagły atak zimy w środku lata! 🥶 Gwałtowny wzrost zapotrzebowania na prąd i węgiel. 'Energia' i 'Przemysł' na szczycie.`, type: 'positive', targetSectors: ['Energia', 'Przemysł'] },
    { id: 'sec_pos_4', message: () => `Nowe, korzystne regulacje dla banków. 📈 Sektor 'Bankowość' odnotowuje wzrosty.`, type: 'positive', targetSectors: ['Bankowość'] },
    { id: 'sec_pos_5', message: () => `Viralowy trend kulinarny "jedzenie na desce" zwiększa popyt na... deski. Firmy z sektora 'Przemysł' zacierają ręce! 🌲`, type: 'positive', targetSectors: ['Przemysł'] },
    { id: 'sec_pos_6', message: () => `Odkryto, że popularny napój gazowany (produkowany przez firmy z sektora 'Żywność') może służyć jako paliwo rakietowe. 🥤🚀 NASA jest zainteresowana.`, type: 'positive', targetSectors: ['Żywność'] },
    { id: 'sec_pos_7', message: () => `Słynny raper wydaje piosenkę "Mój Bank Jest Spoko", powodując szturm młodych ludzi na banki. 🎤 Sektor 'Bankowość' zyskuje nowych klientów.`, type: 'positive', targetSectors: ['Bankowość'] },
    { id: 'sec_pos_8', message: () => `Nowy, rewolucyjny nawóz z sektora 'Chemia' sprawia, że warzywa rosną do gigantycznych rozmiarów. 🥕 Sektor 'Żywność' ma zapewnione dostawy na lata.`, type: 'positive', targetSectors: ['Chemia', 'Żywność'] },
    { id: 'sec_pos_9', message: () => `Wszystkie filmy katastroficzne tego lata pokazują bohaterskich górników. 🦸‍♂️ Wzrasta szacunek dla zawodu i kursy firm z sektora 'Przemysł Wydobywczy'.`, type: 'positive', targetSectors: ['Przemysł Wydobywczy'] },
    { id: 'sec_pos_10', message: () => `Nowy serial "Deweloperzy z Warszawy" staje się hitem. Wszyscy marzą o kredycie i nowym mieszkaniu. Sektor 'Nieruchomości' i 'Bankowość' na fali wznoszącej. 🏘️`, type: 'positive', targetSectors: ['Nieruchomości', 'Bankowość'] },
    { id: 'sec_pos_11', message: () => `Nowa ustawa o recyclingu promuje firmy z sektora 'Chemia', które specjalizują się w ekologicznych rozwiązaniach. ♻️`, type: 'positive', targetSectors: ['Chemia'] },
    // Negatywne
    { id: 'sec_neg_1', message: () => `Nowy podatek od plastiku uderza w producentów. 🏭 Sektor 'Chemia' i 'Przemysł' pod presją.`, type: 'negative', targetSectors: ['Chemia', 'Przemysł'] },
    { id: 'sec_neg_2', message: () => `Wybucha globalny kryzys finansowy po tym, jak okazało się, że światowe rezerwy złota to tylko pozłacane sztabki czekolady. 🍫📉 Sektory 'Bankowość' i 'Finanse' najmocniej odczuwają skutki.`, type: 'negative', targetSectors: ['Bankowość', 'Finanse'] },
    { id: 'sec_neg_3', message: () => `Strajk generalny w sektorze energetycznym. ⚡ Pracownicy domagają się wygodniejszych foteli. Dostawy prądu zagrożone, ceny akcji spadają.`, type: 'negative', targetSectors: ['Energia'] },
    { id: 'sec_neg_4', message: () => `Plaga inteligentnych szkodników niszczy uprawy i włamuje się do systemów firm spożywczych, zamawiając za nie tysiące ton karmy dla chomików. 🐛🐹 Sektory 'Żywność' i 'Technologia Żywności' w chaosie.`, type: 'negative', targetSectors: ['Żywność', 'Technologia Żywności'] },
    { id: 'sec_neg_5', message: () => `Okazuje się, że "innowacyjne" domy z sektora 'Nieruchomości' są w rzeczywistości zbudowane z kartonu i taśmy klejącej. 📦 Pierwszy deszcz ujawnia prawdę.`, type: 'negative', targetSectors: ['Nieruchomości'] },
    { id: 'sec_neg_6', message: () => `Globalna awaria chmury obliczeniowej. Wszystkie firmy z sektora 'Technologia', które "trzymały dane w chmurze", odkrywają, że chmury czasem po prostu znikają. ☁️💨`, type: 'negative', targetSectors: ['Technologia'] },
    { id: 'sec_neg_7', message: () => `W kopalniach z sektora 'Przemysł Wydobywczy' odkryto smoka. 🐲 Jest bardzo zrzędliwy i nie pozwala nikomu pracować. Wydobycie wstrzymane.`, type: 'negative', targetSectors: ['Przemysł Wydobywczy'] },
    { id: 'sec_neg_8', message: () => `Nowa ustawa "Prawo do Bycia Offline" drastycznie zmniejsza popyt na smartfony i inne gadżety. 📵 Sektor 'Technologia' przeżywa kryzys egzystencjalny.`, type: 'negative', targetSectors: ['Technologia'] },
    { id: 'sec_neg_9', message: () => `Wszystkie bankomaty z sektora 'Bankowość' w wyniku błędu zaczynają mówić zagadkami. 🤖❓ Wypłacenie pieniędzy staje się grą miejską, co zniechęca klientów.`, type: 'negative', targetSectors: ['Bankowość'] },
    { id: 'sec_neg_10', message: () => `Kryzys na rynku napojów. Okazuje się, że ludzie odkryli wodę z kranu. 💧 Sektor 'Dobra konsumpcyjne' w panice.`, type: 'negative', targetSectors: ['Dobra konsumpcyjne'] },
    // 0.14 (decyzja 11): równowaga zdarzeń sektora Bankowość po porządku nazw (T1a)
    { id: 'sec_neg_11', message: () => `Rząd wprowadza podatek bankowy od aktywów. 🏦💸 Zyski banków spadną, a sektor 'Bankowość' traci na giełdzie.`, type: 'negative', targetSectors: ['Bankowość'] },
    { id: 'sec_neg_12', message: () => `Masowe pozwy kredytobiorców: sądy unieważniają tysiące umów kredytowych. ⚖️ Banki tworzą rezerwy, a sektor 'Bankowość' tanieje.`, type: 'negative', targetSectors: ['Bankowość'] },
];

const stateCompanyEventsPrompts = [
    // Pozytywne
    { id: 'st_pos_1', message: () => `Rząd ogłasza strategiczny program modernizacji, zasilając spółki Skarbu Państwa nowym kapitałem! 🏛️💰`, type: 'positive' },
    { id: 'st_pos_2', message: () => `Państwowe spółki wygrywają duży, międzynarodowy przetarg. Prestiż i zyski rosną! 🌍🏆`, type: 'positive' },
    { id: 'st_pos_3', message: () => `Udana wizyta dyplomatyczna otwiera państwowym gigantom nowe rynki zbytu. 🤝`, type: 'positive' },
    { id: 'st_pos_4', message: () => `Rządowe agencje zwiększają swoje zamówienia w spółkach państwowych, gwarantując im stabilne przychody. 📄✅`, type: 'positive' },
    { id: 'st_pos_5', message: () => `Pakiet ustaw deregulacyjnych ułatwia działalność dużym, państwowym podmiotom.`, type: 'positive' },
    { id: 'st_pos_6', message: () => `Skarb Państwa ogłasza, że nie planuje prywatyzacji kluczowych spółek, co uspokaja inwestorów.`, type: 'positive' },
    // Negatywne
    { id: 'st_neg_1', message: () => `Niepewność polityczna i spory w rządzie powodują spadek zaufania do spółek kontrolowanych przez państwo. 🏛️🔥`, type: 'negative' },
    { id: 'st_neg_2', message: () => `Najwyższa Izba Kontroli zapowiada audyt w spółkach Skarbu Państwa. Inwestorzy nerwowo reagują. 🕵️‍♂️`, type: 'negative' },
    { id: 'st_neg_3', message: () => `Zmiana na kluczowych stanowiskach w państwowych spółkach wprowadza chaos i niepewność co do przyszłej strategii.`, type: 'negative' },
    { id: 'st_neg_4', message: () => `Międzynarodowe agencje ratingowe obniżają perspektywy dla spółek państwowych z powodu biurokracji.`, type: 'negative' },
    { id: 'st_neg_5', message: () => `Media donoszą o niegospodarności w jednej ze spółek państwowych, co rzutuje na cały sektor. 📰`, type: 'negative' },
    { id: 'st_neg_6', message: () => `Rząd planuje nałożyć na spółki państwowe nowy, specjalny podatek na cele społeczne.`, type: 'negative' }
];

const startupOfferEventsPrompts = [
    {
        id: 'so_1',
        type: 'BONUS_SHARES',
        value: 0.15, // 15% więcej udziałów
        getMessage: (startupName) => `[OFERTA SPECJALNA] CEO firmy ${startupName} jest pod wrażeniem Twoich ruchów na giełdzie! Proponuje Ci +15% udziałów bonusowych przy następnej inwestycji w ich projekt.`,
        offerText: "Zainwestuj teraz, a otrzymasz 15% więcej udziałów niż standardowo za tę samą cenę! To oferta ograniczona czasowo."
    },
    {
        id: 'so_2',
        type: 'DISCOUNT',
        value: 0.10, // 10% zniżki
        getMessage: (startupName) => `[OFERTA SPECJALNA] ${startupName} pilnie potrzebuje gotówki na prototyp. Oferują Ci 10% zniżki na pakiet udziałów, jeśli zainwestujesz w ciągu najbliższej minuty!`,
        offerText: "Każda złotówka, którą teraz zainwestujesz, będzie warta 1,10 PLN w udziałach! Skorzystaj z 10% zniżki na inwestycję."
    },
    {
        id: 'so_3',
        type: 'SUCCESS_BOOST',
        value: 0.03, // +3% do szansy na sukces
        getMessage: (startupName) => `[OFERTA SPECJALNA] ${startupName} chce pozyskać Cię jako strategicznego inwestora. W zamian za wsparcie, Twoje know-how zwiększy ich szansę na sukces!`,
        offerText: "Zostań naszym strategicznym partnerem! Każda inwestycja w tej rundzie permanentnie zwiększy szansę na sukces projektu o 3%."
    },
    {
        id: 'so_4',
        type: 'BONUS_SHARES',
        value: 0.20, // 20% więcej udziałów
        getMessage: (startupName) => `[OFERTA SPECJALNA] "Widzimy w Tobie wizjonera" - pisze w mailu zarząd ${startupName}. Proponują Ci status 'inwestora-założyciela' i +20% udziałów bonusowych.`,
        offerText: "Dołącz do nas jako inwestor-założyciel! Gwarantujemy aż 20% więcej udziałów przy każdej kwocie zainwestowanej w ramach tej oferty."
    },
    {
        id: 'so_5',
        type: 'SUCCESS_BOOST',
        value: 0.05, // +5% do szansy na sukces
        getMessage: (startupName) => `[OFERTA SPECJALNA] ${startupName} jest o krok od przełomu, ale brakuje im środków. Twoje wsparcie może przechylić szalę zwycięstwa i dać im +5% do szansy na sukces.`,
        offerText: "Jesteś naszą ostatnią nadzieją! Twoje wsparcie finansowe w tym kluczowym momencie podniesie morale w zespole i da nam stałe +5% do szansy na rynkowy sukces."
    },
    {
        id: 'so_6',
        type: 'DISCOUNT',
        value: 0.15, // 15% zniżki
        getMessage: (startupName) => `[OFERTA SPECJALNA] Gorąca okazja z ${startupName}! Oferują pakiet udziałów z 15% dyskontem, aby przyspieszyć fazę badań i rozwoju.`,
        offerText: "Bądź sprytniejszy od innych! Oferujemy Ci ekskluzywną możliwość zakupu naszych udziałów z 15% zniżką. Zainwestuj 85 PLN, a otrzymasz udziały warte 100 PLN."
    },
    {
        id: 'so_7',
        type: 'BONUS_SHARES',
        value: 0.10, // 10% więcej udziałów
        getMessage: (startupName) => `[OFERTA SPECJALNA] Program 'Ranny Ptaszek' w ${startupName}! Zainwestuj teraz, aby otrzymać 10% dodatkowych udziałów.`,
        offerText: "Kto rano wstaje... ten inwestuje z zyskiem! Dołącz do naszego programu 'Ranny Ptaszek' i zgarnij 10% więcej udziałów za swoją inwestycję."
    },
    {
        id: 'so_8',
        type: 'SUCCESS_BOOST',
        value: 0.04, // +4% do szansy na sukces
        getMessage: (startupName) => `[OFERTA SPECJALNA] ${startupName} pozyskał znanego mentora, który dołączy do projektu, jeśli pozyskają Ciebie jako inwestora. Twoja decyzja może dać im +4% do szansy na sukces.`,
        offerText: "Twoje nazwisko w gronie inwestorów otwiera nam drzwi. Twoje wsparcie przekona znanego mentora do dołączenia do nas, co da projektowi +4% do szansy na sukces."
    },
    {
        id: 'so_9',
        type: 'DISCOUNT',
        value: 0.05, // 5% zniżki
        getMessage: (startupName) => `[OFERTA SPECJALNA] Drobna, ale miła oferta od ${startupName}: 5% zniżki na inwestycję jako podziękowanie za Twoją dotychczasową aktywność na rynku.`,
        offerText: "Doceniamy Twoje zaangażowanie na rynku. W podziękowaniu oferujemy Ci symboliczną, ale realną 5% zniżkę na udziały w naszym projekcie."
    },
    {
        id: 'so_10',
        type: 'BONUS_SHARES',
        value: 0.25, // 25% więcej udziałów
        getMessage: (startupName) => `[OFERTA SPECJALNA] Niesamowita okazja! ${startupName} jest w kropce i składa ofertę ostatniej szansy: +25% bonusowych udziałów dla inwestora, który uratuje rundę finansowania!`,
        offerText: "Wszystko albo nic! Potrzebujemy Twojego wsparcia, aby zamknąć rundę finansowania. Zainwestuj teraz, a otrzymasz od nas aż 25% udziałów gratis!"
    }
];

function triggerMainMarketEventCycle() {
    if (isSkillUnlocked('sixthSense') && Math.random() < 0.15) {
        triggerSixthSenseEvent(); // przeczucie zwrotu w sektorze (macro.js) — cykl zdarzeń trwa dalej
    }

    if (Math.random() < (oversight?.corruption || 0) / 400) { // Afera korupcyjna (oversight.js)
        triggerCorruptionScandal();
        return;
    }
    if (Math.random() < 0.05) { // Szok makro (macro.js)
        triggerMacroShockEvent();
        return;
    }
    if (Math.random() < (macro.election?.campaign ? 0.12 : 0.06)) { // Spółki państwowe (macro.js)
        triggerStateCompanyEventCycle();
        return;
    }

    // --- NOWY BLOK DLA EVENTÓW FESTYNOWYCH (Z PLIKU KOLEGI) ---
    if (festival && festival.isActive && Math.random() < 0.1) { // 10% szans na event na festynie w każdym cyklu
        triggerFestivalPlayerEvent();
        // Nie rób 'return', bo to mały event, który może dziać się równolegle
    }
    // --- KONIEC NOWEGO BLOKU ---

    if (Math.random() < 0.02) { // Event IPO Banku
        triggerBankIPOEvent();
        return; // Zakończ cykl
    }

    if (Math.random() < 0.03) { // Wrogie przejęcie
        triggerHostileTakeoverEvent();
        return; 
    }

    if (Math.random() < 0.05) { // Aukcja Bonów Skarbowych
        triggerTBillAuctionEvent();
        return; 
    }

    if (isSkillUnlocked('startupInvestor') && Math.random() < 0.04) { // Oferta startupu
        triggerStartupOfferEvent();
        return;
    }
    if (Math.random() < 0.03 * getRulingParty().privatization) { // Prywatyzacja (wg partii rządzącej)
        triggerStatePrivatizationEvent();
        return;
    }
    if (Math.random() < 0.02 * getRulingParty().nationalization) { // Nacjonalizacja (wg partii rządzącej)
        triggerNationalizationEvent();
        return;
    }

     if (Math.random() < 0.04) { // Emisja ratunkowa
        triggerRescueOfferingEvent();
        return;
    }
     if (Math.random() < 0.05) { // Event R&D
        triggerResearchEvent();
        return;
    }

    if (Math.random() < 0.05) { // Zmiana celu finansowania startupu
        triggerStartupFundingEvent();
        return;
    }

    // Eventy bankowe
    if (Math.random() < 0.04) {
        const activeBankStocks = stocks.filter(s => s.isBankStock && !s.isBankrupt) // T1a: wszystkie banki;
        if (activeBankStocks.length > 0) {
            const targetBankStock = getRandomElement(activeBankStocks);
            const eventData = getRandomElement(bankingSectorEventsPrompts);
            const duration = getRandomIntInRange(20, 50);
            const magnitude = getRandomInRange(0.03, 0.08) * (eventData.type === 'positive' ? 1 : -1);
            
            displayEventMessage(eventData.message(targetBankStock.name), duration, magnitude, 'company');
            applyPriceEffect(targetBankStock.symbol, magnitude, eventData.type, 'company');

            const spreadToAllBanks = [
                'bank_pos_1', 'bank_pos_4', 'bank_pos_5', 'bank_pos_6',
                'bank_neg_2', 'bank_neg_5', 'bank_neg_7'
            ];
            if (spreadToAllBanks.includes(eventData.id)) {
                activeBankStocks.forEach(bankStock => {
                    if (bankStock.symbol !== targetBankStock.symbol) {
                        applyPriceEffect(bankStock.symbol, magnitude * 0.5, eventData.type, 'market');
                    }
                });
            }
            return; // Zakończ cykl
        }
    }

    // Standardowe eventy (jeśli żaden specjalny nie wystąpił)
    const eventTypeRoll = Math.random();
    if (eventTypeRoll < 0.30) { 
        const eventData = pickEventByCycle(marketWideEventsPrompts);
        const duration = getRandomIntInRange(25, 75);
        const magnitude = getRandomInRange(0.03, 0.08) * (eventData.type === 'positive' ? 1 : -1);
        displayEventMessage(eventData.message(), duration, magnitude, 'market');
        stocks.forEach(stock => {
            applyPriceEffect(stock.symbol, magnitude, eventData.type, 'market');
        });
    } else if (eventTypeRoll < 0.60) { 
        const eventData = pickEventByCycle(sectorEventsPrompts);
        const duration = getRandomIntInRange(20, 60);
        const magnitude = getRandomInRange(0.05, 0.12) * (eventData.type === 'positive' ? 1 : -1);
        displayEventMessage(eventData.message(), duration, magnitude, 'market');
        const affectedStocks = stocks.filter(stock => stock.sector.some(s => eventData.targetSectors.includes(s)));
        affectedStocks.forEach(stock => {
            applyPriceEffect(stock.symbol, magnitude, eventData.type, 'market');
        });
    } else { 
        const targetStock = getRandomElement(stocks.filter(s => !s.isBankrupt && !s.assetType)); // Nie losuj dla startupów itp.
        if (!targetStock) return;
        const eventData = getRandomElement(companySpecificEventsPrompts);
        const duration = getRandomIntInRange(15, 45);
        const magnitude = getRandomInRange(0.10, 0.25) * (eventData.type === 'positive' ? 1 : -1);
        displayEventMessage(eventData.message(targetStock.name), duration, magnitude, 'company');
        applyPriceEffect(targetStock.symbol, magnitude, eventData.type, 'company');
    }
}

/** Losuje zdarzenie z przewagą pozytywnych w ekspansji i negatywnych w recesji. */
function pickEventByCycle(events) {
    const wantPositive = Math.random() < getCyclePositiveEventBias();
    const pool = events.filter(event => (event.type === 'positive') === wantPositive);
    return pickMacroEvent(pool.length > 0 ? pool : events); // bez powtórek ostatnich zdarzeń (macro.js)
}

// --- POPRAWIONA WERSJA triggerRescueOfferingEvent ---
 

function triggerNationalizationEvent() {
    // Wersja z gameLogic.js jest nowsza i poprawna (używa balanceSheet i centralBank.funds)
    const potentialTargets = stocks.filter(s => {
        if (s.isStateOwned || s.isBankrupt || s.assetType === 'Startup' || !s.balanceSheet) return false;
        const marketValue = s.price * s.totalShares;
        const isHeavilyIndebted = s.balanceSheet.liabilities > (marketValue * 0.5);
        const isPoorHealth = s.financialHealth <= -3;
        return isHeavilyIndebted && isPoorHealth;
    });
    if (potentialTargets.length === 0) return;
    const target = getRandomElement(potentialTargets);
    const targetSectors = target.sector;
    const stateOwnedCompanies = stocks.filter(s => s.isStateOwned);
    const companiesInTargetSectors = stateOwnedCompanies.filter(s => 
        s.sector.some(sector => targetSectors.includes(sector))
    );
    if (companiesInTargetSectors.length >= 2) {
        console.log(`[EVENT] Bank Centralny rozważał nacjonalizację ${target.name}, ale limit spółek w sektorze (${companiesInTargetSectors.length}) został osiągnięty.`);
        return;
    }
    const buyoutPrice = target.price * 0.8;
    const totalCost = buyoutPrice * target.totalShares;
    if (centralBank.funds < totalCost) {
        console.log(`[EVENT] Bank Centralny chciał znacjonalizować ${target.name}, ale zabrakło środków (${centralBank.funds.toFixed(0)} / ${totalCost.toFixed(0)} PLN).`);
        return;
    }
    centralBank.funds -= totalCost;
    logEvent(`🏛️ NACJONALIZACJA! Bank Centralny przejmuje kontrolę nad ${target.name} za ${totalCost.toFixed(0)} PLN w celu ochrony gospodarki!`, 'review');
    if (playerPortfolio[target.symbol]) showToast(`Państwo przymusowo wykupiło Twoje akcje w ${target.name} po cenie ${buyoutPrice.toFixed(2)} PLN.`, 'warning', 7000);
    buyOutAllHolders(target, buyoutPrice); // wszyscy posiadacze, nie tylko gracz i boty (testy ogólne 0.11)
    target.isStateOwned = true;
    target.stateOwnershipPct = getRandomInRange(0.75, 0.90);
    target.eventResistance = 0.6;
    target.balanceSheet.liabilities = 0;
    target.financialHealth = 1;
    target.sharesHeld = 0; // inwestorzy wykupieni; pakiet państwa jest poza wolnym obrotem
    return;
}

// Zdarzenia działów R&D: przyspieszenie albo opóźnienie trwających badań (A2: wcześniej pusty stub).
const researchEventsPrompts = [
    { type: 'positive', progress: 0.25, message: name => `🔬 Przełom w laboratorium ${name}! Badania przyspieszają.` },
    { type: 'positive', progress: 0.15, message: name => `🧑‍🔬 ${name} podkupuje zespół naukowców konkurencji — prace idą szybciej.` },
    { type: 'negative', progress: -0.2, message: name => `🧪 Nieudany eksperyment w ${name} — część wyników do powtórki.` },
    { type: 'negative', progress: -0.1, message: name => `🔌 Awaria aparatury w ${name} opóźnia badania.` }
];

function triggerResearchEvent() {
    const researching = stocks.filter(s => !s.isBankrupt && s.research?.isResearching && s.research.currentTech);
    if (!researching.length) return null;
    const stock = getRandomElement(researching);
    const event = pickEventByCycle(researchEventsPrompts.map((e, i) => ({ ...e, id: `rnd_${i}` })));
    const tech = typeof technologies !== 'undefined' ? technologies[stock.research.currentTech] : null;
    const required = Number(tech?.cost) || 100;
    stock.research.progress = Math.max(0, (Number(stock.research.progress) || 0) + required * event.progress);
    logEvent(event.message(stock.name), 'company');
    return event;
}

// --- NOWE EVENTY Z PLIKU KOLEGI ---
const festivalPlayerEvents = [
    // === POZYTYWNE ===
    {
        id: 'fest_p_1',
        rarity: 0.15, // Mniejsza liczba = rzadsze
        message: (targetName) => `🤝 Przypadkiem spotykasz na festynie prezesa firmy ${targetName}! Po krótkiej, miłej rozmowie Wasze relacje się ocieplają.`,
        condition: (participant) => participant.promotionTarget.type === 'company', // Tylko jeśli promujemy spółkę
        effect: (participant) => {
            changeReputation('player', participant.promotionTarget.id, 10);
        }
    },
    {
        id: 'fest_p_2',
        rarity: 0.10,
        message: () => `💡 Podczas prezentacji na stoisku wpadasz na genialny pomysł biznesowy! Otrzymujesz bonus XP.`,
        effect: () => {
            displayXP();
        }
    },
    {
        id: 'fest_p_3',
        rarity: 0.12,
        message: () => `📰 Lokalny dziennikarz robi z Tobą wywiad na temat Twojej działalności na festynie. Pozytywny PR!`,
        condition: (participant) => participant.promotionTarget.type === 'player_company' || participant.promotionTarget.type === 'company',
        effect: (participant) => {
            if (participant.promotionTarget.type === 'company') {
                applyPriceEffect(participant.promotionTarget.id, 0.01, 'positive', 'review'); // Mały boost dla spółki
            }
            stocks.forEach(s => { if (!s.assetType) changeReputation('player', s.symbol, 1); });
        }
    },
    {
        id: 'fest_p_4',
        rarity: 0.18,
        message: () => `💰 Niespodziewany sponsor! Ktoś docenił Twoje zaangażowanie i przekazał mały datek na rozwój stoiska.`,
        effect: () => {
            playerCash += 1000;
            displayCash();
        }
    },
    {
        id: 'fest_p_5',
        rarity: 0.15,
        message: (targetName) => `🗣️ Udaje Ci się nawiązać ciekawy kontakt biznesowy podczas festynu, co może zaowocować w przyszłości. (Mały bonus do reputacji z losową firmą).`,
        effect: (participant) => { 
            const randomStock = getRandomElement(stocks.filter(s => !s.assetType && (!participant.promotionTarget || s.symbol !== participant.promotionTarget.id))); 
            if (randomStock) {
                changeReputation('player', randomStock.symbol, 5);
            }
        }
    },
    {
        id: 'fest_p_6',
        rarity: 0.20,
        message: () => `🎉 Twoje stoisko cieszy się dużą popularnością! Zainteresowanie rośnie bardziej niż oczekiwano.`,
        effect: (participant) => {
            participant.interest += 15;
        }
    },
    {
        id: 'fest_p_7',
        rarity: 0.15,
        message: (targetName) => `🤝 Burmistrz miasta odwiedza Twoje stoisko promujące ${targetName} i jest pod wrażeniem! (+5 do reputacji z miastem/firmą).`,
        effect: (participant) => {
            if (participant.promotionTarget.type === 'city') {
                logEvent("Burmistrz docenił promocję miasta.");
            } else if (participant.promotionTarget.type === 'company') {
                changeReputation('player', participant.promotionTarget.id, 5);
            } else {
                stocks.forEach(s => { if (!s.assetType) changeReputation('player', s.symbol, 1); });
            }
        }
    },
    {
        id: 'fest_p_8',
        rarity: 0.18,
        message: () => `🎁 Wygrywasz nagrodę w loterii festynowej! Mała nagroda pieniężna.`,
        effect: () => {
            playerCash += getRandomIntInRange(500, 1500);
            displayCash();
        }
    },
    // === NEUTRALNE / LEKKO NEGATYWNE ===
    {
        id: 'fest_n_1',
        rarity: 0.25,
        message: () => `😩 Tłok i hałas na festynie trochę Cię męczą. Potrzebujesz przerwy na kawę (tracisz trochę czasu/zainteresowania).`,
        effect: (participant) => {
            participant.interest = Math.max(0, participant.interest - 5);
        }
    },
    {
        id: 'fest_n_2',
        rarity: 0.20,
        message: () => `🌧️ Nagła, krótka ulewa! Część gości festynowych ucieka. Zainteresowanie lekko spada.`,
        effect: (participant) => {
            participant.interest = Math.max(0, participant.interest - 8);
            if (festival) festival.globalInterest = Math.max(0, festival.globalInterest - 5);
        }
    },
    {
        id: 'fest_n_3',
        rarity: 0.15,
        message: () => `🛠️ Drobna awaria techniczna na Twoim stoisku (np. przepalona żarówka). Trzeba szybko naprawić (mały koszt).`,
        effect: () => {
            const cost = getRandomIntInRange(100, 300);
            playerCash -= cost;
            displayCash();
        }
    },
    {
        id: 'fest_n_4',
        rarity: 0.18,
        message: (targetName) => `🤔 Konkurencyjne stoisko niedaleko Twojego przyciąga uwagę. Musisz bardziej się postarać.`,
        effect: (participant) => {
            // Brak bezpośredniego efektu
        }
    },
    {
        id: 'fest_n_5',
        rarity: 0.22,
        message: () => `📜 Niespodziewana kontrola sanepidu/straży miejskiej na Twoim stoisku. Wszystko w porządku, ale straciłeś trochę czasu.`,
        effect: (participant) => {
            participant.interest = Math.max(0, participant.interest - 3);
        }
    },
    // === BARDZO RZADKIE POZYTYWNE ===
    {
        id: 'fest_vp_1',
        rarity: 0.05,
        message: (targetName) => `🌟 Niesamowite! Twoje stoisko odwiedza znany inwestor venture capital! Jest pod wrażeniem ${targetName}. (Duży, jednorazowy bonus finansowy).`,
        condition: (participant) => participant.promotionTarget.type === 'company' || participant.promotionTarget.type === 'player_company',
        effect: (participant) => {
            if (participant.promotionTarget.type === 'company') {
                const stock = stocks.find(s => s.symbol === participant.promotionTarget.id);
                if (stock) {
                    applyPriceEffect(stock.symbol, 0.05, 'positive', 'review');
                }
            }
            // 0.14.1 R5: nagroda skalowana do pozycji gracza — 2% aktywów funduszu (200–5000 zł), do portfela prywatnego.
            const reward = Math.round(Math.min(5000, Math.max(200, (playerFund ? getFundAssets() : 0) * 0.02)));
            playerWallet.cash += reward;
            recordPayment('external:korporacja', 'player-wallet', reward, 'Nagroda: inwestor VC na festynie');
            displayCash();
        }
    },
    {
        id: 'fest_vp_2',
        rarity: 0.08,
        message: () => `🎤 Zostajesz zaproszony na scenę główną festynu, aby opowiedzieć o swojej działalności! Ogromny wzrost zainteresowania!`,
        effect: (participant) => {
            participant.interest += 50;
            stocks.forEach(s => { if (!s.assetType) changeReputation('player', s.symbol, 3); });
        }
    },
];

/**
* Losuje i uruchamia zdarzenie dla gracza uczestniczącego w festynie.
*/
function triggerFestivalPlayerEvent() {
    if (!festival || !festival.isActive) return;

    const playerParticipant = festival.participants.find(p => p.ownerId === 'player');
    if (!playerParticipant) return;

    const possibleEvents = festivalPlayerEvents.filter(event => {
        if (event.condition && !event.condition(playerParticipant)) return false;
        // Sprawdź rzadkość (można dostosować)
        const adjustedRarity = event.rarity * (festival.tier || 1); // Rzadsze eventy częściej na większych festynach
        return Math.random() < adjustedRarity;
    });

    if (possibleEvents.length === 0) {
        // Jeśli nie wylosowano rzadkiego eventu, spróbuj wylosować bardziej powszechny
        const commonEvents = festivalPlayerEvents.filter(e => e.rarity > 0.15 && (!e.condition || e.condition(playerParticipant)));
        if (commonEvents.length === 0 || Math.random() > 0.1) return; // 10% szansy na zwykły event
        
        const chosenEvent = getRandomElement(commonEvents);
        triggerSingleFestivalEvent(chosenEvent, playerParticipant);
    } else {
        // Wylosuj jedno zdarzenie spośród możliwych rzadkich
        const chosenEvent = getRandomElement(possibleEvents);
        triggerSingleFestivalEvent(chosenEvent, playerParticipant);
    }
}

// Funkcja pomocnicza do wywołania eventu festynowego
function triggerSingleFestivalEvent(chosenEvent, playerParticipant) {
    let targetName = 'Twoja Działalność'; // Domyślnie
    let bankNameForMessage = ''; // Nazwa banku dla eventów bankowych

    // Ustal targetName (bez zmian)
    const target = playerParticipant.promotionTarget;
    if (target.type === 'company') {
        const stock = stocks.find(s => s.symbol === target.id);
        if (stock) targetName = stock.name;
    } else if (target.type === 'city') {
        targetName = 'Miasto Gdańsk';
    }

    // Jeśli to event bankowy, znajdź nazwę banku dla wiadomości
    if (chosenEvent.id.startsWith('fest_bank_')) {
        const participatingBanks = festival.participants.filter(p => p.isBank === true);
        if(participatingBanks.length > 0) {
            // Wybierz losowy bank z uczestniczących DO WIADOMOŚCI
            // UWAGA: Efekt może dotyczyć innego banku (wybranego w `effect`)
             bankNameForMessage = getRandomElement(participatingBanks).ownerName || "jednego z banków";
        } else {
            bankNameForMessage = "jednego z banków"; // Zapasowe
        }
    }

    // Wygeneruj wiadomość, przekazując odpowiednią nazwę
    const message = chosenEvent.message(chosenEvent.id.startsWith('fest_bank_') ? bankNameForMessage : targetName);
    logEvent(`[FESTYN] ${message}`, 'review');
    showToast(message, 'default', 7000); // Wydłużony czas dla ofert

    // Wywołaj efekt
    chosenEvent.effect(playerParticipant);

    // Odśwież widok festynu (bez zmian)
    const modal = document.getElementById('city-investment-modal');
    if (modal && modal.style.display === 'block') {
        updateCityModalContent();
    }
}



function triggerCeoEvent() {
    // Wybierz losową spółkę giełdową (nie startup, nie REIT, nie bankrut)
    const potentialTargets = stocks.filter(s => !s.assetType && !s.isBankrupt && s.ceo);
    if (potentialTargets.length === 0) return;

    const targetStock = getRandomElement(potentialTargets);
    const ceo = targetStock.ceo;
    let eventTriggered = false;

    // Zdarzenia zależne od cech (przykłady)
    if (ceo.traits.some(t => t.id === 'skompromitowany') && Math.random() < 0.2) {
        // Skompromitowany prezes wywołuje skandal
        const magnitude = getRandomInRange(-0.05, -0.15);
        displayEventMessage(`🚨 Skandal wokół prezesa ${targetStock.name}! Jego przeszłość wraca jak bumerang.`, 45, magnitude, 'company');
        applyPriceEffect(targetStock.symbol, magnitude, 'negative', 'company');
        changeReputation('player', targetStock.symbol, -5); // Lekki spadek reputacji u gracza
        eventTriggered = true;
    } else if (ceo.traits.some(t => t.id === 'prowiec') && Math.random() < 0.15) {
        // PRowiec organizuje udaną konferencję
        const magnitude = getRandomInRange(0.03, 0.08);
        displayEventMessage(`🎙️ Prezes ${targetStock.name} błyszczy na konferencji prasowej, zyskując uznanie rynku.`, 30, magnitude, 'company');
        applyPriceEffect(targetStock.symbol, magnitude, 'positive', 'company');
        eventTriggered = true;
    } else if (ceo.traits.some(t => t.id === 'ryzykant') && Math.random() < 0.1) {
        // Ryzykant podejmuje kontrowersyjną decyzję
        const isGoodDecision = Math.random() < 0.4; // Tylko 40% szans, że to dobra decyzja
        const magnitude = getRandomInRange(0.05, 0.12) * (isGoodDecision ? 1 : -1);
        displayEventMessage(`🎲 Prezes-ryzykant ${targetStock.name} podejmuje śmiałą, ale kontrowersyjną decyzję strategiczną...`, 40, magnitude, 'company');
        applyPriceEffect(targetStock.symbol, magnitude, isGoodDecision ? 'positive' : 'negative', 'company');
         eventTriggered = true;
    }

    // Ogólne, losowe zdarzenia CEO (jeśli żadne specyficzne nie wystąpiło)
    if (!eventTriggered && Math.random() < 0.15) { // 15% szans na ogólne zdarzenie
        const roll = Math.random();
        if (roll < 0.3) {
            // Pozytywne (np. nagroda branżowa)
            const magnitude = getRandomInRange(0.02, 0.05);
            displayEventMessage(`🏆 Prezes ${targetStock.name} otrzymuje prestiżową nagrodę branżową!`, 25, magnitude, 'company');
            applyPriceEffect(targetStock.symbol, magnitude, 'positive', 'company');
        } else if (roll < 0.6) {
            // Neutralne (np. zmiana w zarządzie niższego szczebla)
            displayEventMessage(`👥 Drobne przetasowania w zarządzie ${targetStock.name}. Rynek obserwuje.`, 20, null, 'company');
        } else {
            // Negatywne (np. problemy zdrowotne prezesa - plotki)
            const magnitude = getRandomInRange(-0.03, -0.06);
            displayEventMessage(` rumors O ${targetStock.name} krążą plotki o problemach zdrowotnych prezesa...`, 35, magnitude, 'company');
            applyPriceEffect(targetStock.symbol, magnitude, 'negative', 'company');
        }
    }
}

/**
 * Losuje i uruchamia zdarzenia półroczne (niekoniecznie związane z CEO).
 * Wywoływane co dwa kwartały.
 */
function triggerSemiAnnualEvents() {
    // Tutaj można dodać logikę dla zdarzeń, które mają sens co pół roku
    // np. przeglądy regulacyjne, sezonowe wahania popytu w niektórych branżach

    if (Math.random() < 0.1) { // 10% szans na wydarzenie półroczne
        const roll = Math.random();
        if (roll < 0.5) {
             // Przykład: Półroczny przegląd regulacji (lekki wpływ na losowy sektor)
             const sectors = ['Bankowość', 'Energia', 'Chemia', 'Medycyna'];
             const targetSector = getRandomElement(sectors);
             const magnitude = getRandomInRange(-0.02, 0.02); // Mały, losowy wpływ
             const type = magnitude >= 0 ? 'positive' : 'negative';
             displayEventMessage(`📑 Półroczny przegląd regulacji w sektorze '${targetSector}'. Inwestorzy analizują potencjalne zmiany.`, 30, magnitude, 'market');
             stocks.filter(s => s.sector.includes(targetSector)).forEach(stock => {
                 applyPriceEffect(stock.symbol, magnitude, type, 'market');
             });
        } else {
            // Przykład: Sezonowe wahania (np. lepsze wyniki turystyki latem) - uproszczone
             if (Math.random() < 0.3) { // Szansa na sezonowy boost
                const targetSector = 'Turystyka';
                const magnitude = getRandomInRange(0.03, 0.07);
                 displayEventMessage(`☀️ Sezon urlopowy w pełni! Spółki z sektora '${targetSector}' liczą zyski.`, 40, magnitude, 'market');
                 stocks.filter(s => s.sector.includes(targetSector)).forEach(stock => {
                     applyPriceEffect(stock.symbol, magnitude, 'positive', 'market');
                 });
             }
        }
    }
     // Można dodać więcej zdarzeń półrocznych
}


/**
 * Losuje i uruchamia zdarzenia związane z prezesami (CEO), które mają sens raz w roku.
 * Dotyczy głównie wieku, stażu, rocznych ocen. Wywoływane co rok.
 */
function triggerYearlyCeoEvents() {
    console.log("[ZDARZENIA ROCZNE CEO] Uruchomiono cykl roczny...");

    stocks.forEach(stock => {
        if (!stock.assetType && !stock.isBankrupt && stock.ceo) {
            const ceo = stock.ceo;
            let eventTriggered = false; // Flaga, czy już coś się stało dla tego CEO w tym roku

            // 1. Sprawdzenie emerytury
            const retirementAge = 68 + getRandomIntInRange(-3, 5); // Wiek emerytalny między 65 a 73
            if (ceo.age >= retirementAge && Math.random() < 0.4) { // 40% szans na emeryturę po osiągnięciu wieku
                logEvent(`👋 Prezes ${stock.name}, ${ceo.name}, przechodzi na zasłużoną emeryturę w wieku ${ceo.age} lat.`, 'review');
                replaceCeo(stock); // Wygeneruj nowego, losowego prezesa
                eventTriggered = true;
                return; // Przejdź do następnej spółki
            }

            // 2. Roczna ocena wyników (jeśli nie było emerytury)
            if (!eventTriggered) {
                 const health = stock.financialHealth;
                 if (health >= 4 && Math.random() < 0.3) {
                     // Bardzo dobre wyniki -> bonus dla CEO (pozytywny wpływ)
                     const magnitude = getRandomInRange(0.02, 0.04);
                     displayEventMessage(`💰 Roczny bonus dla prezesa ${stock.name} za doskonałe wyniki! Akcjonariusze są zadowoleni.`, 20, magnitude, 'company');
                     applyPriceEffect(stock.symbol, magnitude, 'positive', 'company');
                     eventTriggered = true;
                 } else if (health <= -4 && Math.random() < 0.35) {
                     // Bardzo słabe wyniki -> presja na CEO (negatywny wpływ, zwiększona szansa na zwolnienie w przyszłości)
                     const magnitude = getRandomInRange(-0.03, -0.05);
                     displayEventMessage(`📉 Rada nadzorcza ${stock.name} wywiera presję na prezesa po katastrofalnym roku...`, 30, magnitude, 'company');
                     applyPriceEffect(stock.symbol, magnitude, 'negative', 'company');
                     // Można by tu dodać ukrytą flagę zwiększającą szansę na wymuszone odejście w `triggerCeoEvent`
                     eventTriggered = true;
                 }
            }

             // 3. Zdarzenia roczne związane z cechami (jeśli nic innego się nie stało)
            if (!eventTriggered && Math.random() < 0.1) { // Mniejsza szansa na zdarzenie związane z cechą
                 if (ceo.traits.some(t => t.id === 'wizjoner')) {
                     displayEventMessage(`🚀 Prezes ${stock.name} przedstawia nową, długoterminową wizję rozwoju firmy! Inwestorzy są zaintrygowani.`, 30, 0.02, 'company');
                     applyPriceEffect(stock.symbol, 0.02, 'positive', 'company');
                 } else if (ceo.traits.some(t => t.id === 'ekspansjonista')) {
                      // Tutaj można dodać np. ogłoszenie planów przejęcia innej (losowej, mniejszej) firmy
                      displayEventMessage(`🗺️ ${stock.name}, pod wodzą prezesa-ekspansjonisty, ogłasza plany rozwoju na nowych rynkach.`, 25, null, 'company');
                 }
                 // Można dodać więcej specyficznych zdarzeń rocznych dla innych cech
             }
        }
    });
}

function triggerTBillAuctionEvent() {
    if (currentTBillAuction) {
        console.log("[Aukcja Bonów] Próba uruchomienia nowej aukcji, ale poprzednia wciąż trwa.");
        return;
    }
    const quantity = getRandomIntInRange(50, 250);
    const auctionDurationMinutes = 2;
    const auctionEndTime = Date.now() + (auctionDurationMinutes * 60 * 1000 / currentSpeedMultiplier);
    currentTBillAuction = {
        quantityAvailable: quantity,
        endTime: auctionEndTime,
        bids: []
    };
    logEvent(`🔔 Bank Centralny ogłasza aukcję ${quantity} bonów skarbowych! Aukcja trwa ${auctionDurationMinutes} min.`, 'market');
    showToast(`🔔 Ogłoszono aukcję bonów skarbowych! Sprawdź Bank Centralny.`, 'default', 10000);
    
    // setTimeout(resolveTBillAuction, delay); // Usunięte - rozstrzygnięcie w pętli main.js
    
    if (document.getElementById('bank-modal').style.display === 'block') {
        openBankModal();
    }
}

function triggerBankIPOEvent() {
    if (currentBankIPOOffer) {
        console.log("[Event IPO Banku] Próba uruchomienia nowej oferty, ale poprzednia jest aktywna.");
        return;
    }
    const inactiveBanks = commercialBanks.filter(b => !b.isActive);
    if (inactiveBanks.length === 0) return;
    if (typeof hasFreeListingSlot === 'function' && !hasFreeListingSlot()) return; // P1: twardy sufit spółek krajowych
    const bankToIPO = getRandomElement(inactiveBanks);
    const ipoValuation = bankToIPO.initialCapital * getRandomInRange(1.1, 1.5);
    const ipoSharePrice = getRandomInRange(50, 150);
    const ipoTotalShares = Math.floor(ipoValuation / ipoSharePrice);
    if (ipoTotalShares <= 0) {
        console.error(`[Event IPO Banku] Obliczona liczba akcji (${ipoTotalShares}) jest nieprawidłowa dla ${bankToIPO.name}. Anulowanie eventu.`);
        return;
    }
    const sharesOfferedToPlayer = Math.floor(ipoTotalShares * 0.05);
    const offerPrice = ipoSharePrice * 0.9;
    const offerCost = sharesOfferedToPlayer * offerPrice;

    currentBankIPOOffer = {
        bank: bankToIPO,
        symbol: `BK${bankToIPO.id.toUpperCase()}`,
        ipoSharePrice: ipoSharePrice,
        ipoTotalShares: ipoTotalShares,
        sharesOffered: sharesOfferedToPlayer,
        offerPrice: offerPrice,
        offerCost: offerCost
    };

    const message = `Nowy bank "${bankToIPO.name}" (${bankToIPO.type}) wchodzi na giełdę!<br><br>
                     Oferujemy Ci możliwość zakupu <strong>${sharesOfferedToPlayer}</strong> akcji (5% udziałów)
                     po preferencyjnej cenie <strong>${offerPrice.toFixed(2)} PLN</strong>
                     (całkowity koszt: <strong>${offerCost.toFixed(2)} PLN</strong>) przed oficjalnym debiutem.<br><br>
                     Czy chcesz skorzystać z oferty?`;
    openBankIPOOfferModal(message);
}

function resolveBankIPO(decision) {
    if (!currentBankIPOOffer) return;
    const offer = currentBankIPOOffer;
    const bankToIPO = offer.bank;
    let playerBoughtShares = 0;

    if (decision === 'accept') {
        if (playerCash >= offer.offerCost) {
            playerCash -= offer.offerCost;
            if (playerPortfolio[offer.symbol]) {
                playerPortfolio[offer.symbol].shares += offer.sharesOffered;
            } else {
                playerPortfolio[offer.symbol] = { shares: offer.sharesOffered, avgPrice: offer.offerPrice, assetType: 'stock' };
            }
            playerBoughtShares = offer.sharesOffered;
            logEvent(`✅ Skorzystałeś z oferty IPO i nabyłeś ${offer.sharesOffered} akcji banku ${bankToIPO.name}.`, 'success');
            displayCash();
            displayPortfolio();
        } else {
            alert("Nie masz wystarczająco środków, aby skorzystać z tej oferty IPO.");
            logEvent(`❌ Chciałeś skorzystać z oferty IPO banku ${bankToIPO.name}, ale zabrakło środków.`, 'review');
        }
    } else {
        logEvent(`Odrzuciłeś ofertę udziału w IPO banku ${bankToIPO.name}.`, 'review');
    }

    bankToIPO.isActive = true;
    const newBankStock = {
        name: bankToIPO.name,
        symbol: offer.symbol,
        price: offer.ipoSharePrice,
        volatilityFactor: getRandomInRange(0.5, 1.5),
        exchange: 'SILVER',
        totalShares: offer.ipoTotalShares,
        maxShares: offer.ipoTotalShares * 2,
        sharesHeld: playerBoughtShares,
        sector: ['Bankowość'], // T1a: podsektor z typu banku
        financialHealth: 2,
        balanceSheet: {
            assets: bankToIPO.cash + offer.ipoTotalShares * offer.ipoSharePrice * 0.2,
            liabilities: offer.ipoTotalShares * offer.ipoSharePrice * 0.2,
            shareCapital: offer.ipoTotalShares * offer.ipoSharePrice * 0.1,
            retainedEarnings: bankToIPO.cash - offer.ipoTotalShares * offer.ipoSharePrice * 0.1
        },
        quarterlyEarnings: 0,
        bankAccountId: null,
        cash: bankToIPO.cash,
        descriptionParts: null,
        ceo: null,
        isBankStock: true,
        bankData: { id: bankToIPO.id, type: bankToIPO.type }
    };
    initializeDescriptionParts(newBankStock);
    generateCEO(newBankStock);
    stocks.push(newBankStock);

    logEvent(`📈 Bank ${bankToIPO.name} (${offer.symbol}) debiutuje na Srebrnej Giełdzie!`, 'market');
    currentBankIPOOffer = null;
    closeBankIPOOfferModal();
    displayStocks(getCurrentInputValues());
    renderCommercialBanksList();
}

const bankingSectorEventsPrompts = [
    // Pozytywne
    { id: 'bank_pos_1', message: bankName => `✅ Regulacje złagodzone! ${bankName} i inne banki komercyjne mają teraz większą swobodę w akcji kredytowej.`, type: 'positive' },
    { id: 'bank_pos_2', message: bankName => `💡 Innowacja w ${bankName}! Nowa aplikacja mobilna przyciąga tysiące nowych klientów.`, type: 'positive' },
    { id: 'bank_pos_3', message: bankName => `⭐ ${bankName} otrzymuje międzynarodową nagrodę za stabilność finansową.`, type: 'positive' },
    { id: 'bank_pos_4', message: bankName => `🏦 ${bankName} wprowadza nowy produkt depozytowy, a klienci masowo lokują swoje środki.`, type: 'positive' },
    { id: 'bank_pos_5', message: bankName => `🤝 Strategiczną fuzją ${bankName} zwiększa swój zasięg i kontynuuje ekspansję.`, type: 'positive' },
    { id: 'bank_pos_6', message: bankName => `🏢 ${bankName} przejmuje lokalny serwis finansowy i wchłania jego klientów oraz kapitał.`, type: 'positive' },
    { id: 'bank_pos_7', message: bankName => `💳 ${bankName} oferuje klientom nowy, elastyczny kredyt o niskim oprocentowaniu. Popyt rośnie, a bilans się umacnia.`, type: 'positive' },
    { id: 'bank_pos_8', message: bankName => `🏦 ${bankName} wprowadza program skupu depozytów z gwarantowaną rentownością. Klienci masowo wpłacają swoje oszczędności.`, type: 'positive' },
    // Negatywne
    { id: 'bank_neg_1', message: bankName => `🚨 Skandal w ${bankName}! Wyciekły dane klientów, reputacja banku spada.`, type: 'negative' },
    { id: 'bank_neg_2', message: bankName => `⚖️ Nowe, restrykcyjne regulacje Banku Centralnego uderzają w rentowność ${bankName} i innych banków.`, type: 'negative' },
    { id: 'bank_neg_3', message: bankName => `📉 ${bankName} publikuje gorsze od oczekiwań wyniki finansowe z powodu rosnących rezerw na złe kredyty.`, type: 'negative' },
    { id: 'bank_neg_4', message: bankName => `💧 Kryzys płynności w ${bankName}! Bank ogranicza akcję kredytową, co osłabia zaufanie inwestorów.`, type: 'negative' },
    { id: 'bank_neg_5', message: bankName => `🏛️ Bank Centralny podnosi wymogi rezerw obowiązkowych, a ${bankName} musi zablokować część kapitału.`, type: 'negative' },
    { id: 'bank_neg_6', message: bankName => `🛠️ Nowy produkt kredytowy ${bankName} spotyka się z krytyką. Klienci zaczynają rozważać zmiany.`, type: 'negative' },
    { id: 'bank_neg_7', message: bankName => `📉 Przejęcie zadłużonej firmy przez ${bankName} obciąża jego bilans i wywołuje obawy o stabilność.`, type: 'negative' },
    { id: 'bank_neg_8', message: bankName => `🔥 Bank ${bankName} traci płynność po serii niespodziewanych wypłat. Rynkowe plotki wprowadzają nerwowość.`, type: 'negative' },
    { id: 'bank_neg_9', message: bankName => `📵 Bank ${bankName} wchłania bankrutującego konkurenta, ale przejęcie wymaga dodatkowych rezerw i podkopuje zyski.`, type: 'negative' },
];

const governmentInterventions = [
    {
        id: 'infra_boost',
        name: "Program Budowy Infrastruktury",
        minBudget: 10000000, // Minimalny budżet państwa do uruchomienia
        costFactor: 0.1, // Wyda 10% budżetu
        targetSectors: ['Przemysł', 'Nieruchomości'],
        effectMagnitude: 0.05, // +5% boost dla spółek z tych sektorów
        message: () => `🏗️ Rząd ogłasza wielki program inwestycji infrastrukturalnych! Sektory Przemysł i Nieruchomości zyskują.`
    },
    {
        id: 'rnd_grants',
        name: "Granty na Innowacje",
        minBudget: 5000000,
        costFactor: 0.05,
        effect: (spentAmount) => {
            // Przyspiesz badania we wszystkich spółkach proporcjonalnie do wydanej kwoty
            const progressBoost = spentAmount / 1000; // 1000 PLN = 1 punkt postępu
            stocks.forEach(s => {
                if (s.research && s.research.isResearching) {
                    s.research.progress += progressBoost * getRandomInRange(0.5, 1.5);
                }
            });
        },
        message: () => `💡 Rząd przyznaje granty na badania i rozwój! Innowacyjne projekty nabierają tempa.`
    },
    {
        id: 'market_support',
        name: "Interwencyjny Skup Akcji",
        minBudget: 15000000,
        costFactor: 0.15,
        effectMagnitude: 0.02, // +2% boost dla CAŁEGO rynku
        message: () => `📈 Państwowy fundusz inwestycyjny wchodzi na giełdę! Interwencyjny skup akcji poprawia nastroje na całym rynku.`
    },
    {
        id: 'bailout',
        name: "Koło Ratunkowe od Rządu",
        minBudget: 8000000,
        costFactor: 0.08,
        effect: (spentAmount) => {
            // Znajdź spółkę na granicy bankructwa (ale jeszcze nie bankruta)
            const targets = stocks.filter(s => !s.assetType && !s.isBankrupt && s.financialHealth <= -4);
            if (targets.length > 0) {
                const target = getRandomElement(targets);
                target.financialHealth = 0; // Uratuj kondycję
                target.cash += spentAmount; // Daj zastrzyk gotówki
                if(target.bankAccountId) { // Dodaj kasę też do banku firmy
                    const bank = commercialBanks.find(b => b.id === target.bankAccountId);
                    if(bank) bank.cash += spentAmount;
                }
                applyPriceEffect(target.symbol, 0.10, 'positive'); // Boost ceny
                logEvent(`🆘 Rząd ratuje ${target.name} przed bankructwem kwotą ${spentAmount.toLocaleString()} PLN!`);
                showToast(`Rządowa pomoc dla ${target.name}!`, 'success');
            } else {
                 logEvent(`ℹ️ Rząd planował koło ratunkowe, ale żadna spółka nie była na skraju upadku.`);
                 governmentTreasury += spentAmount; // Zwróć pieniądze do budżetu
            }
        },
        message: () => `🆘 Rząd uruchamia program ratunkowy dla spółek w najtrudniejszej sytuacji!` // Wiadomość ogólna
    },
    {
        id: 'interest_rate_cut', // Obniżka stóp procentowych
        name: "Obniżka Stóp Procentowych",
        minBudget: 1000000, // Niewielki koszt "administracyjny"
        costFactor: 0.01,
        effect: () => {
            const change = -0.005 * getRandomInRange(0.5, 1.5); // Obniżka o 0.25-0.75 pp
            centralBank.baseInterestRate = Math.max(0.005, centralBank.baseInterestRate + change);
            updateInterestRates(); // Zastosuj zmianę
            logEvent(`💰 Rząd w porozumieniu z Bankiem Centralnym obniża stopy procentowe, by pobudzić gospodarkę! Nowa stopa bazowa: ${(centralBank.baseInterestRate * 100).toFixed(1)}%.`);
        },
        message: () => `💰 Rząd decyduje się na stymulację gospodarki przez obniżkę stóp procentowych!`
    },
    // Przykładowe eventy sektorowe (dodaj po 2 dla każdego sektora)
    {
        id: 'sector_boost_food',
        name: "Program 'Zdrowa Żywność'",
        minBudget: 3000000, costFactor: 0.04, targetSectors: ['Żywność'], effectMagnitude: 0.04,
        message: () => `🍎 Rządowy program promocji zdrowej żywności wspiera producentów z sektora Żywność.`
    },
    {
        id: 'sector_boost_tech',
        name: "Ulgi Podatkowe dla IT",
        minBudget: 4000000, costFactor: 0.06, targetSectors: ['Technologia'], effectMagnitude: 0.06,
        message: () => `💻 Nowe ulgi podatkowe dla firm technologicznych! Sektor IT zyskuje.`
    },
    // ... Dodaj więcej interwencji dla innych sektorów ...
];

/**
 * Losowo wybiera i uruchamia interwencję rządową, jeśli budżet na to pozwala.
 */
function triggerGovernmentSpendingEvent() {
    // console.log("[Rząd] Sprawdzanie możliwości interwencji..."); // Opcjonalny log

    // Filtruj interwencje, na które stać państwo
    const possibleInterventions = governmentInterventions.filter(inv => governmentTreasury >= inv.minBudget);

    if (possibleInterventions.length === 0) {
        // console.log("[Rząd] Budżet zbyt mały na interwencje."); // Opcjonalny log
        return;
    }

    // Wybierz losową interwencję spośród możliwych
    const intervention = getRandomElement(possibleInterventions);
    const cost = governmentTreasury * intervention.costFactor; // Oblicz koszt

    // Odejmij koszt z budżetu państwa
    governmentTreasury -= cost;

    logEvent(`🏛️ ${intervention.message()}`, 'state'); // Zaloguj główne przesłanie interwencji
    showToast(`Interwencja Rządowa: ${intervention.name}`, 'default', 6000);

    // Zastosuj efekt interwencji
    if (intervention.effectMagnitude) {
        // Efekt procentowy na cały rynek lub wybrane sektory
        const targets = intervention.targetSectors
            ? stocks.filter(s => !s.assetType && !s.isBankrupt && s.sector.some(sec => intervention.targetSectors.includes(sec)))
            : stocks.filter(s => !s.assetType && !s.isBankrupt); // Cały rynek

        targets.forEach(stock => {
            applyPriceEffect(stock.symbol, intervention.effectMagnitude, 'positive', 'state');
        });
    } else if (intervention.effect) {
        // Efekt specjalny zdefiniowany w funkcji
        intervention.effect(cost); // Przekaż wydaną kwotę do funkcji efektu
    }

    // Zaktualizuj widok modala Państwo, jeśli jest otwarty
    if (document.getElementById('state-modal')?.style.display === 'block') {
         if (typeof updateStateModalContent === 'function') updateStateModalContent();
    }
}

// Technologie budowlane (constructionEffects) są zdefiniowane w technologies.js.
