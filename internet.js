// =================================================================================
// 0.16.5 „Internet”: przeglądarka w grze zamiast okna Kantor. Strony otwierają się TYLKO z ulubionych (kafelki, pasek adresu
// tylko do odczytu), każda ma własny cel: Kantory24 (kantor, rynki, forex), Tied (posty prezesów i wiadomości od inwestorów),
// Startupy (inkubator i pula), Ferie i wakacje (bilety do rynków zagranicznych), Lombard. Logika (bez DOM) jest na górze pliku,
// wyświetlanie niżej; bilety i dostęp do rynku zostają w countries.js. Komponenty 0.14.5, ikony SVG, tylko ciemny motyw.
// =================================================================================


/** Ulubione: jedyna droga do stron. */
const INTERNET_FAVORITES = [
    { id: 'kantory24', tag: 'Waluty i forex', tone: 'amber', title: 'Kantory24', host: 'kantory24.pl', icon: 'moneta', desc: 'Waluty, rynki zagraniczne i forex.' },
    { id: 'tied', tag: 'Sieć zawodowa', tone: 'blue', title: 'Tied', host: 'tied.net', icon: 'grupa', desc: 'Posty prezesów i wiadomości od inwestorów.' },
    { id: 'startupy', tag: 'Venture capital', tone: 'violet', title: 'Startupy', host: 'startupy.gielda.pl', icon: 'rakieta', desc: 'Inkubator, pula start-upów i rundy finansowania.' },
    { id: 'ferie', tag: 'Mobilność', tone: 'teal', title: 'Ferie i wakacje', host: 'ferie-i-wakacje.pl', icon: 'samolot', desc: 'Bilety do rynków zagranicznych, lotnisko miasta.' },
    { id: 'lombard', tag: 'Płynność', tone: 'orange', title: 'Lombard', host: 'lombardex.pl', icon: 'lombard', desc: 'Pożyczki pod zastaw akcji.' },
    { id: 'windykacja', tag: 'Długi', tone: 'amber', title: 'Windykacja', host: 'wrona-windykacja.pl', icon: 'umowa', desc: 'Zaległe długi, zajęte akcje i pożyczki konsumenckie Wrony.' }
];

/** Barwy kraju (ciemne tło okna i akcent) — kolor nigdy jedynym nośnikiem: nazwa stoi w pasku okna. */
const COUNTRY_THEMES = {
    DE: { bg: '#1d1a0f', accent: '#ffce00' }, FR: { bg: '#10182b', accent: '#7aa2ff' }, US: { bg: '#141a2e', accent: '#e8606b' },
    CZ: { bg: '#14213a', accent: '#ee707a' }, SE: { bg: '#0f2236', accent: '#ffd24a' }, CH: { bg: '#2b1114', accent: '#ff7b7b' },
    JP: { bg: '#2a1219', accent: '#ff6b7d' }, CN: { bg: '#2e1111', accent: '#ffd23f' }, IN: { bg: '#27180b', accent: '#ffa24d' },
    TW: { bg: '#101c33', accent: '#ff7a8f' }
};

let internetState = { page: null, country: null, open: false, pausedBefore: false }; // page: null = ekran ulubionych; stan interfejsu, poza zapisem gry

function getInternetFavorite(id) { return INTERNET_FAVORITES.find(f => f.id === id) || null; }

/** Strona otwiera się wyłącznie z ulubionych. Zwraca { ok, reason }. */
function canOpenInternetPage(id) {
    const fav = getInternetFavorite(id);
    if (!fav) return { ok: false, reason: 'Tej strony nie ma w ulubionych — przeglądarka otwiera tylko ulubione.' };
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

const POCZTA_SENDERS = ['KNF', 'NBP', 'Dział obsługi klienta'];

/** Kanał wiadomości: Poczta (newsy, ciekawostki, reklamy), TeamedUP! (szefostwo i współpracownicy), Tied (inwestorzy i spółki). Nic nie ginie — kanał liczy się przy wyświetlaniu. */
function getMailChannel(message) {
    const s = String(message.sender);
    if (s === CORPORATION_SENDER) return 'teamedup';
    if (POCZTA_SENDERS.includes(s)) return 'poczta'; // urzędy i obsługa klienta: Poczta ma znaczek w menu, Tied nie
    if (message.action) return 'poczta'; // przyciski wiadomości (pakiet, VIP) pokazuje tylko podgląd Poczty i TeamedUP!
    if (MAGAZINES[s] || message.isSpam) return 'poczta'; // reklamy zostają w Poczcie (Spam), Tied jest bez reklam
    if (s.startsWith('bot:') && typeof findRelationPerson === 'function' && findRelationPerson(s.slice(4))?.kind === 'colleague') return 'teamedup';
    return 'tied';
}

// =================================================================================
// Wyświetlanie
// =================================================================================

/** Wejście z menu i z innych okien. `null` = ekran ulubionych. */
function openInternetPage(id = null) {
    if (isIntroActive()) return false; // 0.16.10: do końca scenki startowej reszta gry jest zablokowana
    if (id !== null) {
        const check = canOpenInternetPage(id);
        if (!check.ok) { if (typeof showToast === 'function') showToast(check.reason, 'warning'); return false; }
    }
    internetState.page = id;
    // 2026-11-08: Internet zatrzymuje czas gry; przejścia między stronami w otwartym oknie nie ruszają pauzy
    if (!internetState.open) {
        internetState.open = true;
        internetState.pausedBefore = Boolean(isGamePaused);
        if (!isGamePaused && typeof togglePauseGame === 'function') togglePauseGame();
    }
    const modal = document.getElementById('internet-modal');
    if (!modal) return true;
    modal.hidden = false;
    modal.style.display = 'block';
    renderInternet();
    return true;
}

/** Zamknięcie (krzyżyk, tło, Escape): czas gry wraca do stanu sprzed otwarcia. Wywołanie drugi raz nic nie robi. */
function closeInternet() {
    const modal = document.getElementById('internet-modal');
    if (modal && modal.style.display !== 'none') modal.style.display = 'none';
    if (!internetState.open) return false;
    internetState.open = false;
    if (!internetState.pausedBefore && isGamePaused && typeof togglePauseGame === 'function') togglePauseGame();
    return true;
}
if (typeof document !== 'undefined') {
    // tło pod oknem zamyka Internet jak krzyżyk; inne drogi zamknięcia (Escape) wychwytuje obserwator stylu
    document.addEventListener('click', event => { if (event.target?.id === 'modal-backdrop' && internetState.open) closeInternet(); });
    const watchInternet = () => {
        const modal = document.getElementById('internet-modal');
        if (!modal || typeof MutationObserver === 'undefined') return;
        new MutationObserver(() => { if (internetState.open && modal.style.display === 'none') closeInternet(); }).observe(modal, { attributes: true, attributeFilter: ['style'] });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchInternet); else watchInternet();
}

function applyInternetTheme() {
    const modal = document.getElementById('internet-modal');
    if (!modal) return;
    const c = getInternetThemeCountry(), theme = c && COUNTRY_THEMES[c];
    if (theme) { modal.dataset.country = c; modal.style.setProperty('--net-bg', theme.bg); modal.style.setProperty('--net-accent', theme.accent); }
    else { delete modal.dataset.country; modal.style.removeProperty('--net-bg'); modal.style.removeProperty('--net-accent'); }
    const badge = document.getElementById('net-country-badge');
    if (badge) badge.innerHTML = c ? `<strong>Rynek: ${escapeHtml(COUNTRY_DEFS[c].name)}</strong> · ${COUNTRY_DEFS[c].currency}` : '';
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
    else if (fav.id === 'windykacja') renderDebtCollectorPage();
    applyInternetTheme();
}

function renderInternetFavorites() {
    const tiles = INTERNET_FAVORITES.map(f => {
        const extra = f.id === 'tied' ? unreadTiedCount() : 0;
        return `<button type="button" role="listitem" class="net-fav tone-${f.tone}" onclick="openInternetPage('${f.id}')">
            <span class="net-fav-top"><span class="net-fav-icon">${uiIcon(f.icon, 22)}</span>
                <span class="net-chip">${escapeHtml(f.tag)}</span>${extra ? `<span class="net-new">${extra} ${extra === 1 ? 'nowa' : 'nowe'}</span>` : ''}</span>
            <strong>${escapeHtml(f.title)}</strong>
            <span class="net-fav-desc">${escapeHtml(f.desc)}</span><span class="net-fav-arrow" aria-hidden="true">&rarr;</span></button>`;
    }).join('');
    return `<p class="net-notice">${uiIcon('info', 16)} Ulubione to jedyny sposób wejścia na strony.</p><div class="net-favs" role="list" aria-label="Ulubione strony">${tiles}</div>`;
}

function unreadTiedCount() { return mailbox ? mailbox.messages.filter(m => !m.read && getMailChannel(m) === 'tied').length : 0; }

// --- Ferie i wakacje ---
function renderFeriePage() {
    const root = document.getElementById('net-ferie-body');
    if (!root) return;
    const built = isAirportBuilt(), building = isAirportInProgress();
    const status = built ? ['Stoi', 'Lotnisko miasta działa — bilety są w sprzedaży.'] : building ? ['W budowie', 'Lotnisko to projekt państwa; wykonawcą jest spółka budowlana. Do ukończenia bilety są niedostępne.'] : ['Brak lotniska', 'Lotnisko jeszcze nie powstało. Państwo może je zlecić przez przetarg budowlany; bez niego nie kupisz biletów.'];
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
            <header><div><h4>${escapeHtml(def.name)} <span class="net-chip">${currencyIcon(def.currency, 12)} ${def.currency}</span></h4><span class="text-sm text-muted">${escapeHtml(def.operator.name)}</span></div>
                <span class="net-status ${joined ? 'open' : ''}">${joined ? 'Giełda otwarta' : 'Jeszcze zamknięta'}</span></header>
            <div class="net-dest-row"><span><small>${has ? 'Status licencji' : 'Koszt biletu'}</small>${money}</span><span class="text-right"><small>Prowizja z biletem</small><strong>${formatNumberPl(getCountryCommission(def.id) * 100, 1)}%</strong></span></div>
            <footer><span class="text-sm">${wallet}</span>${action}</footer>${joined ? '' : '<p class="text-xs text-muted">Pierwszy bilet otwiera giełdę kraju.</p>'}</article>`;
    }).join('');
    root.innerHTML = `<section class="net-airport"><span class="net-airport-icon">${uiIcon('samolot', 22)}</span><div><h3>Port lotniczy miasta <span class="net-status ${built ? 'open' : ''}">${status[0]}</span></h3><p class="text-sm" aria-live="polite">${status[1]}</p></div>${order}</section>
        <section class="net-hero"><span class="net-kicker">Międzynarodowe połączenia kapitałowe</span><h3>Bilet na rynek zagraniczny</h3><p class="text-sm text-muted">Odblokuj bezpośredni obrót spółkami kraju. Bilet kupujesz z gotówki funduszu, od ${formatZl(TICKET_RULES.min, 0)}.</p>
            <div class="net-route"><div><small>Wylot (z)</small><strong>${escapeHtml(getHomeCityLabel())}</strong><span class="text-sm text-muted">Rynek bazowy · ${getBaseCurrency()}</span></div><span class="net-route-line" aria-hidden="true">${uiIcon('samolot', 18)}</span>
                <div><small>Przylot (do)</small>${owns ? `<strong>${escapeHtml(COUNTRY_DEFS[c].name)}</strong><span class="text-sm text-muted">${escapeHtml(COUNTRY_DEFS[c].operator.name)} · ${COUNTRY_DEFS[c].currency}</span>` : `<strong>Wybierz giełdę</strong><span class="text-sm text-muted">${defs.length} rynków globalnych</span>`}</div>
                <div><small>Klasa lotu</small><strong>Fundusz (inwestor)</strong><small>Ważność</small><strong>Bezterminowo</strong></div></div></section>
        <div class="net-section-head"><h3>Katalog lotów i licencji</h3><span class="text-sm text-muted">Dostępnych: ${defs.length} krajów</span></div>
        <div class="net-dests">${cards}</div><div id="net-ferie-country"></div>`;
    const box = document.getElementById('net-ferie-country');
    if (!owns) return;
    const rows = getCountryIssuers(c).map(i => `<tr><td><strong>${getShareSymbol(i)}</strong> <span class="text-muted">${escapeHtml(i.name)}</span></td><td>${escapeHtml(i.sectors.map(s => s[0]).join(' + '))}</td><td class="text-right">${formatNumberPl(i.price, 2)} ${i.currency}</td><td class="text-right">${formatZl(toPln(i.price, i.currency), 2)}</td></tr>`).join('');
    box.innerHTML = `<div class="net-section-head"><h3>Rynek: ${escapeHtml(COUNTRY_DEFS[c].name)}</h3></div>${renderCountryCard(c)}<table class="asset-mini-table w-full mt-3"><thead><tr><th>Spółka</th><th>Sektor</th><th class="text-right">Cena</th><th class="text-right">Cena w ${getBaseCurrency()}</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="btn-row"><button class="btn-primary" onclick="marketsSelected='${c}'; kantorTab='markets'; openInternetPage('kantory24')">Handluj w Kantory24</button><button class="btn-ghost" onclick="selectInternetCountry(null); renderFeriePage()">Wróć do neutralnego okna</button></div>`;
}

function feriePickCountry(id) { selectInternetCountry(id); renderFeriePage(); }

// --- Lombard (jedno źródło prawdy: renderPawnPanel z panelu funduszu + renderPawnShopInfo z ui.js) ---
/** Windykacja (dawne okno Windykatora): zasady, długi botów, pożyczki Wrony i zajęte akcje. */
function renderDebtCollectorPage() {
    const root = document.getElementById('net-windykacja-body');
    if (!root) return;
    const collector = typeof getDebtCollector === 'function' ? getDebtCollector() : null;
    const seized = Object.entries(collector?.holdingPortfolio || {}).map(([symbol, item]) => `<li>${item.quantity} × ${escapeHtml(symbol)}</li>`).join('');
    const botDebts = aiCompetitors.reduce((sum, ai) => sum + (ai.loans || []).filter(loan => (loan.missedPayments || 0) > 0).length, 0);
    root.innerHTML = collector ? `<div class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('umowa', 20)}</span><div><h4>${escapeHtml(collector.name)}</h4><span class="bank-card-type">${escapeHtml(collector.symbol)} · gotówka ${formatZl(collector.cash, 0)}</span></div></header>
        <p class="fund-muted">Windykator przejmuje zaległe długi (kredyty botów z zaległościami, niespłacone zastawy funduszy po ${COLLECTOR_AFTER_MISSED} nieopłaconych odsetkach) i zajmuje akcje dłużników.</p>
        <p>Kredyty botów z zaległościami: <strong>${botDebts}</strong></p>
        <h4>Pożyczki konsumenckie Wrony</h4>${renderConsumerLoansSummary(collector)}
        <h4>Zajęte akcje</h4><ul>${seized || '<li class="fund-muted">Brak.</li>'}</ul></div>`
        : '<p class="loss">Windykator nie jest dostępny.</p>';
}

function renderLombardPage() {
    const root = document.getElementById('net-lombard-body');
    if (!root) return;
    root.innerHTML = `<div class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('lombard', 20)}</span><div><h4>Lombardex S.A.</h4><span class="bank-card-type">pożyczki pod zastaw akcji</span></div></header>
        ${renderPawnShopInfo()}<h4>Zastawy Twojego funduszu</h4><div id="net-lombard-pawn"></div></div>`;
    if (playerFund) { const box = document.getElementById('net-lombard-pawn'); renderPawnPanel('net-lombard-pawn'); if (!box.innerHTML) box.innerHTML = '<p class="fund-muted">Brak aktywnego funduszu.</p>'; }
    else document.getElementById('net-lombard-pawn').innerHTML = '<p class="fund-muted">Zastaw jest dostępny dla funduszu.</p>';
}

// --- Dojście z dawnych wejść ---
/** Zgodność: dawne wywołania okna Kantor. */
function openKantorModal() { return openInternetPage('kantory24'); }
