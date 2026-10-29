// =================================================================================
// 0.16.5 „Internet”: przeglądarka w grze zamiast okna Kantor. Strony otwierają się TYLKO z ulubionych (kafelki, pasek adresu
// tylko do odczytu), każda ma własny cel: Kantory24 (kantor, GDR, rynki, forex), Tied (posty prezesów i wiadomości od inwestorów),
// Startupy (inkubator i pula), Ferie i wakacje (bilety do rynków zagranicznych), Lombard. Logika (bez DOM) jest na górze pliku,
// wyświetlanie niżej; bilety i dostęp do rynku zostają w countries.js. Komponenty 0.14.5, ikony SVG, tylko ciemny motyw.
// =================================================================================

const TIED_POST_LIMIT = 60;
const TIED_POSITIVE_NEWS = /wynik|kontrakt|raport|współprac|kooperac|dywidend|rekord|przełom|technolog|nowa (oferta|placówk)/i;

/** Ulubione: jedyna droga do stron. `unlocked` — mechanika gry (nie zakup); `hint` — opis zablokowanego kafelka. */
const INTERNET_FAVORITES = [
    { id: 'kantory24', tag: 'Waluty i forex', tone: 'amber', title: 'Kantory24', host: 'kantory24.pl', icon: 'moneta', desc: 'Waluty, kwity GDR, rynki zagraniczne i forex.', unlocked: () => true },
    { id: 'tied', tag: 'Sieć zawodowa', tone: 'blue', title: 'Tied', host: 'tied.net', icon: 'grupa', desc: 'Posty prezesów i wiadomości od inwestorów.', unlocked: () => isTiedUnlocked(), hint: 'Odblokuje się po awansie na Zarządcę funduszu albo po pierwszych relacjach z inwestorami.' },
    { id: 'startupy', tag: 'Venture capital', tone: 'violet', title: 'Startupy', host: 'startupy.gielda.pl', icon: 'rakieta', desc: 'Inkubator, pula start-upów i rundy finansowania.', unlocked: () => true },
    { id: 'ferie', tag: 'Mobilność', tone: 'teal', title: 'Ferie i wakacje', host: 'ferie-i-wakacje.pl', icon: 'samolot', desc: 'Bilety do rynków zagranicznych, lotnisko miasta.', unlocked: () => true },
    { id: 'lombard', tag: 'Płynność', tone: 'orange', title: 'Lombard', host: 'lombardex.pl', icon: 'lombard', desc: 'Pożyczki pod zastaw akcji.', unlocked: () => true }
];

/** Barwy kraju (ciemne tło okna i akcent) — kolor nigdy jedynym nośnikiem: nazwa i flaga stoją w pasku okna. */
const COUNTRY_THEMES = {
    DE: { bg: '#1d1a0f', accent: '#ffce00' }, FR: { bg: '#10182b', accent: '#7aa2ff' }, US: { bg: '#141a2e', accent: '#e8606b' },
    CZ: { bg: '#14213a', accent: '#ee707a' }, SE: { bg: '#0f2236', accent: '#ffd24a' }, CH: { bg: '#2b1114', accent: '#ff7b7b' },
    JP: { bg: '#2a1219', accent: '#ff6b7d' }, CN: { bg: '#2e1111', accent: '#ffd23f' }, IN: { bg: '#27180b', accent: '#ffa24d' },
    TW: { bg: '#101c33', accent: '#ff7a8f' }
};

let internetState = { page: null, country: null }; // page: null = ekran ulubionych; stan interfejsu, poza zapisem gry

function getInternetFavorite(id) { return INTERNET_FAVORITES.find(f => f.id === id) || null; }

/** Tied: po awansie na Zarządcę albo po pierwszych relacjach z inwestorami. */
function isTiedUnlocked() {
    if (typeof playerProfile === 'undefined' || !playerProfile) return false;
    if (getPositionIndex(playerProfile.positionId) >= 1) return true;
    return typeof botRelations === 'object' && Object.values(botRelations?.values || {}).some(v => Number(v) !== 0);
}

/** Strona otwiera się wyłącznie z ulubionych i tylko odblokowana. Zwraca { ok, reason }. */
function canOpenInternetPage(id) {
    const fav = getInternetFavorite(id);
    if (!fav) return { ok: false, reason: 'Tej strony nie ma w ulubionych — przeglądarka otwiera tylko ulubione.' };
    if (!fav.unlocked()) return { ok: false, reason: fav.hint || 'Strona jest jeszcze zablokowana.' };
    return { ok: true };
}

/** Kraj tła okna: bilet (albo połączona giełda) na wybrany kraj, tylko na stronach rynkowych. */
function getInternetThemeCountry() {
    const c = internetState.country;
    if (!c || !COUNTRY_THEMES[c] || !['ferie', 'kantory24'].includes(internetState.page)) return null;
    return typeof canTradeCountry === 'function' && canTradeCountry('player', c) ? c : null;
}

function selectInternetCountry(id) {
    internetState.country = COUNTRY_THEMES[id] ? id : null;
    applyInternetTheme();
}

// --- Tied: posty prezesów z faktycznych zdarzeń spółki (wołane z logEvent) ---
function getTiedPosts() { return (mailbox && mailbox.tied) || []; }

function addTiedPost({ symbol, author, text, kind = 'result' }) {
    if (!mailbox) return null;
    if (!Array.isArray(mailbox.tied)) mailbox.tied = [];
    const post = { id: mailbox.nextId++, at: typeof getMailClockMs === 'function' ? getMailClockMs() : 0, symbol, author, text, kind };
    mailbox.tied.unshift(post);
    if (mailbox.tied.length > TIED_POST_LIMIT) mailbox.tied.length = TIED_POST_LIMIT;
    return post;
}

/** Zdarzenie spółki → post jej prezesa (tylko dobre wieści; reszta to nie chwalenie się). */
function noteTiedEvent(message, category) {
    if (category !== 'company' || !mailbox || typeof stocks === 'undefined' || !TIED_POSITIVE_NEWS.test(message)) return null;
    const stock = stocks.find(s => s.ceo && typeof s.ceo === 'object' && message.includes(s.name));
    if (!stock) return null;
    const kind = /współprac|kooperac/i.test(message) ? 'coop' : 'result';
    const lead = kind === 'coop' ? 'Cieszę się, że możemy to ogłosić:' : 'Z dumą dzielę się wiadomością:';
    const text = `${lead} ${String(message).replace(/\p{Extended_Pictographic}|️/gu, '').replace(/\s+/g, ' ').trim()}`;
    if (getTiedPosts().some(p => p.symbol === stock.symbol && p.text === text)) return null;
    return addTiedPost({ symbol: stock.symbol, author: stock.ceo.name, text, kind });
}

/** Kanał wiadomości: Poczta (newsy, ciekawostki, reklamy), TeamedUP! (szefostwo i współpracownicy), Tied (inwestorzy i spółki, po odblokowaniu). Nic nie ginie — kanał liczy się przy wyświetlaniu. */
function getMailChannel(message) {
    const s = String(message.sender);
    if (s === CORPORATION_SENDER) return 'teamedup';
    if (MAGAZINES[s] || message.isSpam) return 'poczta'; // reklamy zostają w Poczcie (Spam), Tied jest bez reklam
    if (s.startsWith('bot:') && typeof findRelationPerson === 'function' && findRelationPerson(s.slice(4))?.kind === 'colleague') return 'teamedup';
    return isTiedUnlocked() ? 'tied' : 'poczta';
}

// =================================================================================
// Wyświetlanie
// =================================================================================

/** Wejście z menu i z innych okien. `null` = ekran ulubionych. */
function openInternetPage(id = null) {
    if (id !== null) {
        const check = canOpenInternetPage(id);
        if (!check.ok) { if (typeof showToast === 'function') showToast(check.reason, 'warning'); return false; }
    }
    internetState.page = id;
    const modal = document.getElementById('internet-modal');
    if (!modal) return true;
    modal.hidden = false;
    modal.style.display = 'block';
    renderInternet();
    return true;
}

function applyInternetTheme() {
    const modal = document.getElementById('internet-modal');
    if (!modal) return;
    const c = getInternetThemeCountry(), theme = c && COUNTRY_THEMES[c];
    if (theme) { modal.dataset.country = c; modal.style.setProperty('--net-bg', theme.bg); modal.style.setProperty('--net-accent', theme.accent); }
    else { delete modal.dataset.country; modal.style.removeProperty('--net-bg'); modal.style.removeProperty('--net-accent'); }
    const badge = document.getElementById('net-country-badge');
    if (badge) badge.innerHTML = c ? `${flagIcon(c, 14)} <strong>Rynek: ${escapeHtml(COUNTRY_DEFS[c].name)}</strong> · ${COUNTRY_DEFS[c].currency}` : '';
}

function renderInternet() {
    const fav = getInternetFavorite(internetState.page);
    const home = document.getElementById('net-home');
    if (!home) return;
    home.hidden = Boolean(fav);
    for (const f of INTERNET_FAVORITES) { const el = document.getElementById(`net-page-${f.id}`); if (el) el.hidden = !fav || fav.id !== f.id; }
    const address = document.getElementById('net-address');
    if (address) address.value = fav ? `https://${fav.host}` : 'ulubione://start';
    const tab = document.getElementById('net-tab-title');
    if (tab) tab.textContent = fav ? fav.title : 'Ulubione';
    const back = document.getElementById('net-back-btn');
    if (back) back.disabled = !fav;
    if (!fav) { home.innerHTML = renderInternetFavorites(); applyInternetTheme(); return; }
    if (fav.id === 'kantory24') showKantorTab(typeof kantorTab === 'string' ? kantorTab : 'rates');
    else if (fav.id === 'ferie') renderFeriePage();
    else if (fav.id === 'tied') renderTiedPage();
    else if (fav.id === 'lombard') renderLombardPage();
    applyInternetTheme();
}

function renderInternetFavorites() {
    const tiles = INTERNET_FAVORITES.map(f => {
        const ok = f.unlocked();
        const extra = f.id === 'tied' && ok ? unreadTiedCount() : 0;
        return `<button type="button" role="listitem" class="net-fav tone-${f.tone} ${ok ? '' : 'locked'}" ${ok ? '' : 'aria-disabled="true"'} onclick="openInternetPage('${f.id}')">
            <span class="net-fav-top"><span class="net-fav-icon">${uiIcon(ok ? f.icon : 'klodka', 22)}</span>
                ${ok ? `<span class="net-chip">${escapeHtml(f.tag)}</span>` : `<span class="net-chip">${uiIcon('klodka', 11)} Zablokowane</span>`}${extra ? `<span class="net-new">${extra} ${extra === 1 ? 'nowa' : 'nowe'}</span>` : ''}</span>
            <strong>${escapeHtml(f.title)}</strong>
            <span class="net-fav-desc">${escapeHtml(ok ? f.desc : (f.hint || 'Zablokowane'))}</span>${ok ? `<span class="net-fav-arrow" aria-hidden="true">&rarr;</span>` : ''}</button>`;
    }).join('');
    return `<p class="net-notice">${uiIcon('info', 16)} Ulubione to jedyny sposób wejścia na strony. Nowe odblokowuje gra, nie zakup.</p><div class="net-favs" role="list" aria-label="Ulubione strony">${tiles}</div>`;
}

function unreadTiedCount() { return mailbox ? mailbox.messages.filter(m => !m.read && getMailChannel(m) === 'tied').length : 0; }

// --- Ferie i wakacje ---
function renderFeriePage() {
    const root = document.getElementById('net-ferie-body');
    if (!root) return;
    const built = isAirportBuilt(), building = isAirportInProgress();
    const status = built ? ['Stoi', 'Lotnisko miasta działa — bilety są w sprzedaży.'] : building ? ['W budowie', 'Lotnisko to megaprojekt miasta; wykonawcą jest spółka budowlana. Do ukończenia bilety są niedostępne.'] : ['Brak lotniska', 'Lotnisko jeszcze nie powstało. Miasto może je zlecić przez przetarg budowlany; bez niego nie kupisz biletów.'];
    const order = !built && !building ? '<button class="btn-primary btn-sm" onclick="airportUiOrder()">Zleć budowę lotniska</button>' : '';
    const c = internetState.country, owns = c && canTradeCountry('player', c);
    const defs = Object.values(COUNTRY_DEFS);
    const cards = defs.map(def => {
        const has = hasTicket('player', def.id), price = getTicketPrice(def.id), joined = isCountryJoined(def.id), theme = COUNTRY_THEMES[def.id] || {};
        const missing = price - playerCash;
        const money = has ? '<span class="net-ok">' + uiIcon('ok', 14) + ' Bilet aktywny</span>' : `<strong>${formatZl(price, 0)}</strong>`;
        const wallet = has ? 'Opłacono bezterminowo' : !built ? 'Lotnisko nie stoi' : missing > 0 ? `<span class="net-short">Brakuje ${formatZl(missing, 0)}</span>` : `Dostępne (gotówka ${formatZl(playerCash, 0)})`;
        const action = has ? `<button class="btn-primary" onclick="feriePickCountry('${def.id}')">Zobacz rynek</button>` : `<button class="btn-primary" ${built && missing <= 0 ? '' : 'disabled'} onclick="airportUiBuy('${def.id}')">Kup bilet za ${formatZl(price, 0)}</button>`;
        return `<article class="net-dest ${def.id === c ? 'selected' : ''}" style="--dest:${theme.accent || 'var(--amber-400)'}">
            <header><span class="net-dest-flag">${flagIcon(def.id, 28)}</span><div><h4>${escapeHtml(def.name)} <span class="net-chip">${currencyIcon(def.currency, 12)} ${def.currency}</span></h4><span class="text-sm text-muted">${escapeHtml(def.operator.name)}</span></div>
                <span class="net-status ${joined ? 'open' : ''}">${joined ? 'Giełda otwarta' : 'Jeszcze zamknięta'}</span></header>
            <div class="net-dest-row"><span><small>${has ? 'Status licencji' : 'Koszt biletu'}</small>${money}</span><span class="text-right"><small>Prowizja z biletem</small><strong>${formatNumberPl(getCountryCommission(def.id) * 100, 1)}%</strong></span></div>
            <footer><span class="text-sm">${wallet}</span>${action}</footer>${joined ? '' : '<p class="text-xs text-muted">Pierwszy bilet otwiera giełdę kraju.</p>'}</article>`;
    }).join('');
    root.innerHTML = `<section class="net-airport"><span class="net-airport-icon">${uiIcon('samolot', 22)}</span><div><h3>Port lotniczy miasta <span class="net-status ${built ? 'open' : ''}">${status[0]}</span></h3><p class="text-sm" aria-live="polite">${status[1]}</p></div>${order}</section>
        <section class="net-hero"><span class="net-kicker">Międzynarodowe połączenia kapitałowe</span><h3>Bilet na rynek zagraniczny</h3><p class="text-sm text-muted">Odblokuj bezpośredni obrót spółkami kraju. Bilet kupujesz z gotówki funduszu, od ${formatZl(TICKET_RULES.min, 0)}.</p>
            <div class="net-route"><div><small>Wylot (z)</small><strong>Warszawa (GPW)</strong><span class="text-sm text-muted">Rynek bazowy · PLN</span></div><span class="net-route-line" aria-hidden="true">${uiIcon('samolot', 18)}</span>
                <div><small>Przylot (do)</small>${owns ? `<strong>${flagIcon(c, 14)} ${escapeHtml(COUNTRY_DEFS[c].name)}</strong><span class="text-sm text-muted">${escapeHtml(COUNTRY_DEFS[c].operator.name)} · ${COUNTRY_DEFS[c].currency}</span>` : `<strong>Wybierz giełdę</strong><span class="text-sm text-muted">${defs.length} rynków globalnych</span>`}</div>
                <div><small>Klasa lotu</small><strong>Fundusz (inwestor)</strong><small>Ważność</small><strong>Bezterminowo</strong></div></div></section>
        <div class="net-section-head"><h3>Katalog lotów i licencji</h3><span class="text-sm text-muted">Dostępnych: ${defs.length} krajów</span></div>
        <div class="net-dests">${cards}</div><div id="net-ferie-country"></div>`;
    const box = document.getElementById('net-ferie-country');
    if (!owns) return;
    const rows = getCountryIssuers(c).map(i => `<tr><td><strong>${getGdrSymbol(i)}</strong> <span class="text-muted">${escapeHtml(i.name)}</span></td><td>${escapeHtml(i.sectors.map(s => s[0]).join(' + '))}</td><td class="text-right">${formatNumberPl(i.price, 2)} ${i.currency}</td><td class="text-right">${formatZl(toPln(i.price, i.currency), 2)}</td></tr>`).join('');
    box.innerHTML = `<div class="net-section-head"><h3>Rynek: ${escapeHtml(COUNTRY_DEFS[c].name)}</h3></div>${renderCountryCard(c)}<table class="asset-mini-table w-full mt-3"><thead><tr><th>Spółka</th><th>Sektor</th><th class="text-right">Cena</th><th class="text-right">Cena w PLN</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="btn-row"><button class="btn-primary" onclick="marketsSelected='${c}'; kantorTab='markets'; openInternetPage('kantory24')">Handluj w Kantory24</button><button class="btn-ghost" onclick="selectInternetCountry(null); renderFeriePage()">Wróć do neutralnego okna</button></div>`;
}

function feriePickCountry(id) { selectInternetCountry(id); renderFeriePage(); }

// --- Tied ---
const initials = name => String(name || '?').split(/\s+/).map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase();

function renderTiedPage() {
    const root = document.getElementById('net-tied-body');
    if (!root) return;
    const me = playerProfile || {}, position = CAREER_POSITIONS[getPositionIndex(me.positionId)]?.name || '';
    const posts = getTiedPosts().map(p => {
        const st = stocks.find(x => x.symbol === p.symbol);
        return `<article class="net-post"><header><span class="net-avatar" aria-hidden="true">${escapeHtml(initials(p.author))}</span><div><strong>${escapeHtml(p.author || 'Prezes')}</strong>
            <span class="text-sm text-muted">Prezes · ${escapeHtml(st?.name || p.symbol)} (${escapeHtml(p.symbol)}) · ${formatMailTime(p.at)}</span></div><span class="net-chip">${p.kind === 'coop' ? 'Współpraca' : 'Wyniki'}</span></header>
            <p>${escapeHtml(p.text)}</p><footer>${st ? `<span class="text-sm">Kurs ${escapeHtml(p.symbol)}: <strong>${formatZl(st.price, 2)}</strong></span>` : '<span></span>'}<button class="btn-ghost btn-sm" onclick="openStockDetailsModal('${escapeHtml(p.symbol)}')">${uiIcon('rynek', 14)} Pokaż spółkę</button></footer></article>`;
    }).join('');
    const msgsAll = mailbox.messages.filter(m => getMailChannel(m) === 'tied'), unread = msgsAll.filter(m => !m.read).length;
    const msgs = msgsAll.slice(0, 20).map(m => `<li class="net-msg ${m.read ? '' : 'unread'}"><span class="net-avatar sm" aria-hidden="true">${escapeHtml(initials(getMailSenderName(m.sender).replace(/^\P{L}+/u, '')))}</span><div><strong>${escapeHtml(getMailSenderName(m.sender).replace(/^\P{L}+/u, ''))}</strong>${m.read ? '' : ' <span class="net-chip">Nowa</span>'}
        <div class="text-sm">${escapeHtml(m.subject)}</div><div class="text-sm text-muted">${escapeHtml(m.body.slice(0, 140))}</div>${m.read ? '' : `<button type="button" class="btn-ghost btn-sm" onclick="markMailRead(${m.id}); renderTiedPage()">Oznacz jako przeczytane</button>`}</div></li>`).join('');
    root.innerHTML = `<div class="net-tied">
        <aside class="net-tied-profile"><div class="net-card"><span class="net-avatar lg" aria-hidden="true">${escapeHtml(initials(me.name))}</span><h4>${escapeHtml(me.name || 'Ty')}</h4><span class="text-sm text-muted">${escapeHtml(position)}${playerFund?.name ? ' · ' + escapeHtml(playerFund.name) : ''}</span>
            <dl class="net-kv"><div><dt>Konto prywatne</dt><dd>${formatZl(playerWallet?.cash || 0, 2)}</dd></div><div><dt>Zaufanie klientów</dt><dd>${(playerFund?.trust ?? 0).toFixed(0)} / 100</dd></div></dl></div></aside>
        <section class="net-tied-feed"><div class="net-feed-tab">Najnowsze z rynku</div>${posts || '<p class="net-empty">Prezesi jeszcze nic nie opublikowali — posty pojawiają się przy dobrych wiadomościach ze spółek.</p>'}</section>
        <aside class="net-tied-msgs"><div class="net-card"><h4>${uiIcon('poczta', 16)} Wiadomości <span class="net-count">${unread}</span></h4>${msgs ? `<ul class="list-plain">${msgs}</ul>` : '<p class="text-sm text-muted">Brak wiadomości od inwestorów i spółek.</p>'}</div></aside></div>`;
}

// --- Lombard (jedno źródło prawdy: okno Lombardex, tu tylko wejście) ---
function renderLombardPage() {
    const root = document.getElementById('net-lombard-body');
    if (root) root.innerHTML = `<div class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('lombard', 20)}</span><div><h4>Lombardex S.A.</h4><span class="bank-card-type">pożyczki pod zastaw akcji</span></div></header>
        <p class="text-sm">Zastaw akcji w zamian za gotówkę. Szczegóły i spłaty są w oknie Lombardex (dostęp także z TeamedUP!).</p><div class="btn-row"><button class="btn-primary" onclick="openPawnShopPanel()">Otwórz Lombardex</button></div></div>`;
}

// --- Dojście z dawnych wejść ---
/** Zgodność: dawne wywołania okna Kantor. */
function openKantorModal() { return openInternetPage('kantory24'); }
