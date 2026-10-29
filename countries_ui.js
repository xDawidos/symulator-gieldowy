// =================================================================================
// 0.16.2 UI: lotnisko i bilety (zakładka „Lotnisko” w oknie Miasto), rynki zagraniczne, karta kraju.
// Komponenty 0.14.5 (bank-card, asset-mini-table, tab-btn), flagi i ikony walut z flags.js, bez emoji, kolor nigdy jedynym nośnikiem.
// Warstwa wyświetlania jest osobno od logiki (countries.js: bilety i dostęp), żeby w 0.16.5 okno lotniska przeniosło się na stronę
// „Ferie i wakacje” w Internecie: wystarczy wywołać `renderAirportWindow(id)` z innym kontenerem.
// =================================================================================

/** Haczyk animacji po zakupie biletu: samolot startuje w chmury (ok. 2 s, pomijalna, wyłączona przy prefers-reduced-motion) — wykonanie przez czat designu. */
function onTicketPurchased(country, opened) {
    const def = COUNTRY_DEFS[country];
    if (typeof showToast === 'function') showToast(`Bilet na rynek: ${def?.name || country}${opened ? ' — giełda kraju się otwiera.' : '.'}`, 'success');
    let reduced = false;
    try { reduced = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reduced = false; }
    if (!reduced && typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('ticket-flight', { detail: { country, durationMs: 2000, skippable: true } }));
}

/** Okno lotniska: stan budowy, ceny biletów, zakup. `targetId`: kontener (domyślnie zakładka Miasto → Lotnisko). */
function renderAirportWindow(targetId = 'city-content-airport', { tickets = false } = {}) {
    const root = document.getElementById(targetId);
    if (!root) return;
    const built = isAirportBuilt(), building = isAirportInProgress();
    const status = built ? 'Lotnisko stoi — bilety są w sprzedaży.'
        : building ? 'Lotnisko jest w budowie (megaprojekt miasta, wykonawca: spółka budowlana).'
            : 'Lotnisko jeszcze nie powstało. Miasto może je zlecić przez przetarg budowlany; bez niego nie kupisz biletów.';
    const orderBtn = !built && !building ? `<button class="btn-primary" onclick="airportUiOrder()">Zleć budowę lotniska</button>` : '';
    const rows = !tickets ? '' : Object.values(COUNTRY_DEFS).map(def => {
        const has = hasTicket('player', def.id), price = getTicketPrice(def.id), joined = isCountryJoined(def.id);
        const action = has ? `<span class="text-muted">masz bilet</span> <button class="btn-ghost" onclick="feriePickCountry('${def.id}')">Zobacz rynek</button>` : `<button class="btn-ghost" ${built ? '' : 'disabled'} onclick="airportUiBuy('${def.id}')">Kup bilet za ${formatZl(price, 0)}</button>`;
        return `<tr><td>${flagIcon(def.id, 14)} <strong>${escapeHtml(def.name)}</strong></td><td>${currencyIcon(def.currency, 14)} ${def.currency}</td>
            <td>${escapeHtml(def.operator.name)}</td><td>${joined ? 'giełda otwarta' : 'jeszcze zamknięta (pierwszy bilet ją otworzy)'}</td><td class="text-right">${action}</td></tr>`;
    }).join('');
    root.innerHTML = `${tickets && typeof renderMarketClockCard === 'function' ? renderMarketClockCard() : ''}<div class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('rynek', 20)}</span><div><h4>Lotnisko i bilety</h4><span class="bank-card-type">licencje na rynki zagraniczne</span></div></header>
        <p class="text-sm" aria-live="polite">${status}</p>${orderBtn}
        ${tickets ? `<table class="asset-mini-table w-full"><thead><tr><th>Rynek</th><th>Waluta</th><th>Operator</th><th>Stan</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : `<div class="btn-row"><button class="btn-ghost" onclick="openInternetPage('ferie')">Bilety: Internet → Ferie i wakacje</button></div>`}
        <p class="text-sm text-muted">Bilet kupujesz z gotówki funduszu (od ${formatZl(TICKET_RULES.min, 0)}). Z biletem kupujesz spółki kraju przez kantor z prowizją ${formatNumberPl(COUNTRY_RULES.commission * 100, 1)}% (na rynku krajowym 0,25%). Każdy inwestor ma bilet osobno, a każdy sprzedany bilet daje Turystyce małą premię.</p></div>`;
}

function airportUiOrder() {
    const r = orderAirport();
    showToast(r.ok ? 'Miasto ogłasza budowę lotniska.' : r.reason, r.ok ? 'success' : 'warning');
    refreshAirportViews();
}

function refreshAirportViews() {
    if (document.getElementById('city-content-airport')) renderAirportWindow();
    if (document.getElementById('net-ferie-body') && internetState.page === 'ferie') renderFeriePage();
}

function airportUiBuy(country) {
    const r = buyTicket(country);
    if (!r.ok) showToast(r.reason, 'warning');
    else if (typeof selectInternetCountry === 'function') selectInternetCountry(country); // tło okna w barwach kraju
    refreshAirportViews();
    if (typeof updateUI === 'function') updateUI();
}

// =================================================================================
// Rynki zagraniczne: zakładki krajów z flagami i walutą, karta kraju (nastrój, stopa, waluta, spółki państwowe), handel z biletem.
// Zakładka „Rynki” w oknie Kantor. Stan słowami (faza, kierunek ▲▼■), kolor nigdy jedynym nośnikiem.
// =================================================================================

let marketsSelected = null;

function selectMarketCountry(id) { marketsSelected = id; if (typeof selectInternetCountry === 'function') selectInternetCountry(id); renderKantor(); }

function renderCountryCard(id) {
    const def = COUNTRY_DEFS[id], st = countryState[id], regime = marketRegimes[id];
    const phase = MARKET_PHASES[regime.phase] || MARKET_PHASES.bull, premium = regime.premium;
    const stateIssuers = getCountryIssuers(id).filter(i => i.state);
    const rate = fxRates[def.currency], change = typeof getFxChange === 'function' ? getFxChange(def.currency) : 0;
    const crisis = typeof crisisState === 'object' && crisisState.pendingImport?.origin === id ? 'kryzys wybuchł tutaj i zmierza do Polski'
        : (typeof crisisLine === 'object' && crisisLine?.origin === id ? 'kryzys zaczął się tutaj' : (crisisLine ? 'odczuwa kryzys z Polski' : 'bez kryzysu'));
    return `<div class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${flagIcon(id, 22)}</span><div><h4>${escapeHtml(def.name)}</h4><span class="bank-card-type">${escapeHtml(def.operator.name)} · ${currencyIcon(def.currency, 14)} ${def.currency}</span></div></header>
        <dl class="bank-card-rates">
            <div><dt>Nastrój rynku</dt><dd>${uiIcon(phase.icon, 14)} ${phase.name}, premia ${premium > 0 ? '▲ +' : premium < 0 ? '▼ ' : '■ '}${formatNumberPl(premium * 100, 0)}%</dd></div>
            <div><dt>Stopa w kraju</dt><dd>${formatNumberPl(st.rate * 100, 2)}%</dd></div>
            <div><dt>Kurs ${def.currency}</dt><dd>${fmtRate(rate, def.currency)} zł (${fxArrow(change)} ${fxPct(change)} w roku)</dd></div>
            <div><dt>Powiązanie z Polską</dt><dd>${formatNumberPl(def.rho * 100, 0)}%</dd></div>
            <div><dt>Kryzys</dt><dd>${crisis}</dd></div>
            <div><dt>Spółki państwowe</dt><dd>${stateIssuers.length ? stateIssuers.map(i => escapeHtml(i.name)).join(', ') : 'brak'}${stateIssuers.length ? ` · skarb kraju (licznik): ${formatNumberPl(st.treasury, 0)} ${def.currency}` : ''}</dd></div>
            <div><dt>Pracownicy (profil kraju)</dt><dd>prawa ${escapeHtml(def.labour.rights)}, szansa związku ×${formatNumberPl(def.labour.unionMult, 1)}${def.labour.shadow ? `, szara strefa +${def.labour.shadow} pp` : ''}</dd></div>
            <div><dt>Nadzór</dt><dd>${escapeHtml(getOversight(id).name)} (poziom ${getOversight(id).level}/3), próg wezwania ${Math.round(getCallThreshold(id) * 100)}% głosów</dd></div>
            <div><dt>Spółek na giełdzie</dt><dd>${getCountryIssuers(id).length} z limitu ${getCountryLimit(id)} (wielkość rynku ×${formatNumberPl(getCountryLimitMult(id), 2)} liczby startowej)</dd></div>
            <div><dt>Sesja</dt><dd>${typeof getMarketStatus === 'function' ? getMarketStatus(id).text : '—'}</dd></div>
            <div><dt>Prowizja operatora</dt><dd>${formatNumberPl(getCountryCommission(id) * 100, 1)}% (z biletem)</dd></div>
        </dl></div>`;
}

function renderMarketsTab() {
    const joined = getJoinedCountries();
    if (!joined.length) return `<p class="text-muted">Żaden rynek zagraniczny nie jest jeszcze otwarty. Pierwszy bilet w Internecie (Ferie i wakacje) otwiera giełdę kraju; boty mogą być szybsze.</p>
        <div class="btn-row"><button class="btn-ghost" onclick="openInternetPage('ferie')">Idź do Ferie i wakacje</button></div>`;
    if (!marketsSelected || !joined.includes(marketsSelected)) marketsSelected = joined[0];
    const id = marketsSelected, def = COUNTRY_DEFS[id], access = canTradeCountry('player', id);
    const tabs = joined.map(c => `<button class="tab-btn ${c === id ? 'active' : ''}" onclick="selectMarketCountry('${c}')" aria-pressed="${c === id}">${flagIcon(c, 12)} ${escapeHtml(COUNTRY_DEFS[c].name)} · ${COUNTRY_DEFS[c].currency}</button>`).join('');
    const rows = getCountryIssuers(id).map(i => {
        const h = i.history, change = h.length > 1 ? i.price / h[0] - 1 : 0, held = getGdrHeld(i), free = getGdrFree(i);
        return `<tr><td><strong>${getGdrSymbol(i)}</strong> <span class="text-muted">${escapeHtml(i.name)}</span>${i.state ? ' <span class="text-xs">(państwowa)</span>' : ''}${i.giant ? ' <span class="text-xs">(gigant)</span>' : ''}${typeof renderForeignCompanyLine === 'function' ? renderForeignCompanyLine(i) : ''}</td>
            <td>${escapeHtml(i.sectors.map(s => s[0]).join(' + '))}</td>
            <td class="text-right">${formatNumberPl(i.price, 2)} ${i.currency}<br><span class="text-muted text-xs">${fxArrow(change)} ${fxPct(change)} w ${h.length - 1} tyg.</span></td>
            <td class="text-right">${formatZl(toPln(i.price, i.currency), 2)}</td>
            <td class="text-right">${held > 0 ? `${formatNumberPl(held, 0)} (${formatZl(held * toPln(i.price, i.currency), 0)})` : '—'}</td>
            <td class="text-right"><input type="number" min="1" step="1" value="100" id="mkt-qty-${i.id}" aria-label="Liczba akcji ${escapeHtml(i.name)}" style="width:5.5em" ${free <= 0 ? 'disabled' : ''}>
                <button class="btn-primary btn-sm" onclick="marketsUiTrade('${i.id}','buy')" ${access && free > 0 ? '' : 'disabled'}>Kup</button> <button class="btn-ghost btn-sm" onclick="marketsUiTrade('${i.id}','sell')" ${held > 0 ? '' : 'disabled'}>Sprzedaj</button></td></tr>`;
    }).join('');
    return `${typeof renderMarketClockCard === 'function' ? renderMarketClockCard() : ''}${renderLinksCard()}<div class="tab-buttons" role="group" aria-label="Rynki zagraniczne">${tabs}</div>
        ${renderCountryCard(id)}
        ${id === 'CH' ? renderHiddenCashCard() : ''}
        ${access ? '' : `<p class="text-sm" role="status">Brak biletu na ten rynek — kupowanie jest zablokowane (sprzedaż posiadanych akcji działa). Bilet kupisz w Internecie, na stronie Ferie i wakacje (${formatZl(getTicketPrice(id), 0)}).</p>`}
        ${countryState[id]?.link ? `<p class="text-sm" role="status">Giełda połączona z naszą: spółki ${escapeHtml(def.name)} (${id}) są na głównej liście akcji, z kupnem i sprzedażą jak krajowe (prowizja krajowa, bez biletu). Tu zostają kursy walut, forex i kwity GDR.</p>` : `<table class="asset-mini-table w-full mt-3"><thead><tr><th>Spółka</th><th>Sektor</th><th class="text-right">Cena (waluta)</th><th class="text-right">Cena w PLN</th><th class="text-right">Twoje akcje</th><th class="text-right">Zlecenie</th></tr></thead><tbody>${rows}</tbody></table>`}
        <p class="text-sm text-muted">Kupno płacisz najpierw gotówką w ${def.currency}, resztę wymienia kantor (spread). Prowizja ${formatNumberPl(getCountryCommission(id) * 100, 1)}%. Wpływy ze sprzedaży trafiają na konto walutowe — złotówki dostaniesz w kantorze. Zysk to zmiana ceny <em>i</em> kursu ${def.currency}; ceny zawierają dywidendy.</p>`;
}

/** 0.16.9: spółki krajów połączonych (bez biletu, prowizja krajowa) stoją na głównej liście akcji, w blokach wg kraju. Handel przez marketsUiTrade (jedno źródło cen i transakcji). */
function renderLinkedStockRow(tbody, i, previous = {}) {
    const row = tbody.insertRow(), c = i.country, h = i.history, change = h.length > 1 ? i.price / h[0] - 1 : 0, held = getGdrHeld(i), free = getGdrFree(i);
    const cls = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    row.className = 'stock-row foreign-row'; row.dataset.symbol = getGdrSymbol(i); row.dataset.country = c;
    const name = row.insertCell(); name.className = 'stock-company-cell';
    name.innerHTML = `<div class="stock-identity"><div class="stock-name-line"><span class="stock-name" title="${escapeHtml(i.name)}">${escapeHtml(i.name)}</span>${held > 0 ? '<span class="owned-dot" title="Masz akcje tej spółki"></span>' : ''}</div>
        <div class="stock-meta">${escapeHtml(i.sectors.map(x => x[0]).join(' + '))} · ${getGdrSymbol(i)} · ${flagIcon(c, 12)} ${c} · ${i.currency}${i.state ? ' · państwowa' : ''}${i.giant ? ' · gigant' : ''}${typeof renderForeignCompanyLine === 'function' ? renderForeignCompanyLine(i) : ''}</div></div>`;
    const price = row.insertCell(); price.className = 'cell-number cell-price';
    price.innerHTML = `<div class="price-main">${formatZl(toPln(i.price, i.currency), 2)}</div><div class="text-xs text-muted">${formatNumberPl(i.price, 2)} ${i.currency}</div>`;
    const ch = row.insertCell(); ch.className = 'cell-number'; ch.innerHTML = `<span class="change-pill ${cls}"><span aria-hidden="true">${fxArrow(change)}</span> ${fxPct(change)}</span>`;
    row.insertCell().innerHTML = `<div class="availability-cell"><span class="availability-value">${formatNumberPl(free, 0)}</span></div>`;
    const own = row.insertCell(); own.className = 'cell-number'; own.innerHTML = held > 0 ? `<span class="owned-badge">${formatNumberPl(held, 0)}</span>` : '<span class="owned-zero">0</span>';
    const act = row.insertCell(); act.className = 'trade-actions-cell text-center';
    act.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;max-width:7.5em"><input type="number" min="1" step="1" value="${escapeHtml(String(previous['f:' + i.id] ?? 100))}" id="mkt-qty-${i.id}" data-linked-qty aria-label="Liczba akcji ${escapeHtml(i.name)}" style="width:100%" ${free <= 0 ? 'disabled' : ''}>
        <button class="btn-primary btn-sm" onclick="marketsUiTrade('${i.id}','buy')" ${free > 0 ? '' : 'disabled'}>Kup</button> <button class="btn-ghost btn-sm" onclick="marketsUiTrade('${i.id}','sell')" ${held > 0 ? '' : 'disabled'}>Sprzedaj</button></div>`;
    return row;
}

/** Bloki [{code, rows}] dla krajów połączonych, z filtrami listy (sektor, „tylko moje”, poziom giełdy, typ) i sortowaniem po kursie. */
function buildLinkedStockBlocks(previous = {}) {
    if (typeof getLinkedCountries !== 'function' || currentMarketLevel !== 'ALL' || (sectorFilterState.type && sectorFilterState.type !== 'all') || sectorFilterState.subsector) return [];
    const dir = currentSortState === 'price_asc' ? 1 : currentSortState === 'price_desc' ? -1 : 0, tbody = document.createElement('tbody');
    return getLinkedCountries().map(c => {
        let list = getCountryIssuers(c);
        if (sectorFilterState.sector !== 'all') list = list.filter(i => i.sectors.some(x => x[0] === sectorFilterState.sector));
        if (ownedOnlyFilter) list = list.filter(i => getGdrHeld(i) > 0);
        if (dir) list = [...list].sort((a, b) => (toPln(a.price, a.currency) - toPln(b.price, b.currency)) * dir);
        if (!list.length) return null;
        const head = tbody.insertRow(); head.className = 'exchange-header linked-market-header';
        const cell = head.insertCell(); cell.colSpan = 6;
        cell.innerHTML = `<h4 class="my-1 exchange-title">${flagIcon(c, 14)} ${escapeHtml(COUNTRY_DEFS[c].name)} (${c}) <span class="exchange-meta">· giełda połączona z naszą · ${COUNTRY_DEFS[c].currency} · prowizja ${formatNumberPl(getCountryCommission(c) * 100, 2)}% · ${list.length} spółek</span></h4>`;
        return { code: c, rows: [head, ...list.map(i => renderLinkedStockRow(tbody, i, previous))] };
    }).filter(Boolean);
}

/** 0.16.6 S1: rachunek w Waschmabanku (ukryty przed nadzorem, ale w majątku funduszu). */
function renderHiddenCashCard() {
    if (!canUseWaschmabank()) return '';
    const r = HIDDEN_CASH_RULES;
    return `<div class="bank-card mt-3"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('blokada', 20)}</span><div><h4>Rachunek w Waschmabanku</h4><span class="bank-card-type">poza kontrolą nadzoru · liczy się do majątku funduszu</span></div></header>
        <p class="text-sm">Saldo: <strong id="hidden-cash-balance">${formatZl(getHiddenBalance(), 0)}</strong>. Wpłata kosztuje ${formatNumberPl(r.depositFee * 100, 0)}%, wypłata ${formatNumberPl(r.withdrawFee * 100, 0)}%. Kary i rekwizycja nielegalnych zysków sięgają tylko gotówki na koncie funduszu, ale każdy kwartał grozi wykryciem rachunku, a wyciek „Swiss Leaks” w Waschmabanku ujawnia go od razu: konfiskata całości, przewinienie i spadek zaufania klientów.</p>
        <div class="bank-card-form"><input type="number" min="${r.min}" step="100" id="hidden-cash-amount" placeholder="Kwota (PLN)" aria-label="Kwota wpłaty lub wypłaty (PLN)">
            <button class="btn-primary" onclick="hiddenCashUi('hide')">Wpłać</button> <button class="btn-ghost" onclick="hiddenCashUi('unhide')" ${getHiddenBalance() > 0 ? '' : 'disabled'}>Wypłać</button></div></div>`;
}

function hiddenCashUi(action) {
    const amount = Number(document.getElementById('hidden-cash-amount')?.value) || 0;
    const r = action === 'hide' ? hideCash(amount) : unhideCash(amount);
    showToast(r.ok ? (action === 'hide' ? `Wpłacono na rachunek w Waschmabanku (prowizja ${formatZl(r.fee, 0)}).` : `Wypłacono ${formatZl(r.received, 0)}.`) : r.reason, r.ok ? 'success' : 'warning');
    renderKantor();
    if (typeof updateUI === 'function') updateUI();
}

function marketsUiTrade(id, side) {
    const qty = Number(document.getElementById(`mkt-qty-${id}`)?.value) || 0;
    const r = side === 'buy' ? buyForeignShares(id, qty) : sellForeignShares(id, qty);
    if (r.needsConfirm && typeof gameConfirm === 'function') { // 0.16.6 S1: kupno ponad próg wezwania — drabina nadzoru
        gameConfirm(`${r.reason} Kupno ponad próg grozi ostrzeżeniem, karą i nakazem odsprzedaży nadzoru. Kupić mimo to?`, () => { const t = buyForeignShares(id, qty, { overThreshold: true }); showToast(t.ok ? `Kupiono ${qty} akcji (ponad próg wezwania).` : t.reason, t.ok ? 'warning' : 'error'); renderKantor(); if (typeof updateUI === 'function') updateUI(); }, { title: 'Przekroczenie progu wezwania', confirmLabel: 'Kupuję mimo to', danger: true });
        return;
    }
    const label = foreignIssuers[id] ? getGdrSymbol(foreignIssuers[id]) : id;
    showToast(r.ok ? `${side === 'buy' ? 'Kupiono' : 'Sprzedano'} ${qty} akcji ${label}${side === 'buy' ? ` za ${formatZl(r.cost, 0)} (prowizja ${formatZl(r.commissionPln, 0)})` : ` — wpływ ${formatNumberPl(r.proceeds, 2)} ${r.currency}`}.` : r.reason, r.ok ? 'success' : 'warning');
    renderKantor();
    if (typeof updateUI === 'function') updateUI();
}


// =================================================================================
// 0.16.3 G12/G16: połączone giełdy — okno wydarzenia (z pauzą) i karta stanu połączeń (dane: exchange_links.js)
// =================================================================================

const LINK_KIND_LABELS = { merged: 'przejęta przez naszą giełdę', intl: 'giełda międzynarodowa', taken: 'przejęła naszą giełdę (wariant B)' };

/** Karta stanu: połączone kraje, giełda międzynarodowa, wspólnota europejska, szansa kolejnego wydarzenia słowami. */
function renderLinksCard() {
    const linked = getLinkedCountries();
    const chance = getEffectiveLinkChance();
    const hint = chance >= 0.16 ? 'wysoka' : chance >= 0.04 ? 'rośnie' : 'niska';
    const rows = linked.map(id => `<li>${flagIcon(id, 12)} <strong>${escapeHtml(COUNTRY_DEFS[id].name)}</strong> — ${LINK_KIND_LABELS[countryState[id].link]}; bez biletu, prowizja ${formatNumberPl(LINK_RULES.domesticCommission * 100, 2)}%</li>`).join('');
    const intl = exchangeLinks.intl ? `<p class="text-sm">Giełda międzynarodowa: ${['PL', ...exchangeLinks.intl.members.filter(m => m !== 'PL')].map(m => escapeHtml(m === 'PL' ? 'Polska' : COUNTRY_DEFS[m]?.name || m)).join(', ')}.</p>` : '';
    const taken = exchangeLinks.takenBy ? `<p class="text-sm text-warn">Wariant B: nasza giełda należy do ${escapeHtml(COUNTRY_DEFS[exchangeLinks.takenBy].name)} — opłaty za notowanie na GPW ×${LINK_RULES.listingFeeMult}.</p>` : '';
    const community = isEuropeanCommunity() ? '<p class="text-sm">Wspólnota europejska giełd działa — na rynku gra europejski hazardzista.</p>' : `<p class="text-sm text-muted">Wspólnota europejska powstanie, gdy na giełdzie będą ${LINK_RULES.communityMin} kraje europejskie (teraz ${countEuropeanJoined()}).</p>`;
    return `<div class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('rynek', 20)}</span><div><h4>Połączone giełdy</h4><span class="bank-card-type">szansa na kolejne połączenie: ${hint}</span></div></header>
        ${linked.length ? `<ul class="text-sm">${rows}</ul>` : '<p class="text-sm text-muted">Żadna giełda nie jest jeszcze połączona z naszą. Połączenie (przejęcie, giełda międzynarodowa albo przejęcie nas) zdarza się samo, od drugiego roku gry.</p>'}
        ${intl}${taken}${community}</div>`;
}

/** Wydarzenie połączenia: pauza gry i okno z opisem skutków (reszta: dziennik, pasek, hasło Akademii). */
function onLinkEvent(entry) {
    const names = entry.members.map(m => COUNTRY_DEFS[m].name).join(', ');
    const titles = { merged: 'Nasza giełda przejmuje giełdę zagraniczną', intl: 'Powstaje giełda międzynarodowa', taken: 'Obca giełda przejmuje naszą' };
    if (typeof addMail === 'function') addMail({ sender: 'PULS', subject: `🌍 ${titles[entry.kind]}: ${names}`, body: entry.text, importance: 3 });
    if (typeof document === 'undefined') return;
    let modal = document.getElementById('link-event-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'link-event-modal'; modal.className = 'modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-labelledby', 'link-event-title');
        modal.innerHTML = '<button class="close-btn" onclick="closeModalFrom(this)" aria-label="Zamknij">&times;</button><h2 class="mt-0" id="link-event-title"></h2><div id="link-event-body"></div>';
        document.body.appendChild(modal);
    }
    if (!document.getElementById('toast-notification')) return; // środowisko testowe bez interfejsu
    if (typeof isGamePaused !== 'undefined' && !isGamePaused && typeof togglePauseGame === 'function') togglePauseGame();
    document.getElementById('link-event-title').textContent = titles[entry.kind];
    const effects = entry.kind === 'taken'
        ? `<li>Opłaty za notowanie na GPW rosną ×${LINK_RULES.listingFeeMult}.</li><li>Kurs GPW spada o ok. ${Math.round(entry.drop * 100)}% w ${LINK_RULES.dropQuarters} kwartały.</li>`
        : '<li>Spółki kraju kupisz bez biletu, z prowizją krajową.</li>';
    document.getElementById('link-event-body').innerHTML = `<p>${escapeHtml(entry.text)}</p><ul class="text-sm">${effects}</ul><div class="btn-row"><button class="btn-primary" onclick="closeModalFrom(this)">Rozumiem — wznów grę</button></div>`;
    modal.style.display = 'block';
}
