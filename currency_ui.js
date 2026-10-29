// =================================================================================
// 0.16.1 G4: INTERFEJS — okno kantoru (kursy, wykres, kupno i sprzedaż), zakładka „Obce” (GDR), okno „Gigant wkracza na scenę”,
// hasła Akademii. Komponenty 0.14.5 (bank-card, bank-grid, asset-mini-table, tab-btn), ikony SVG ze sprite'a, bez emoji,
// kolor nigdy jedynym nośnikiem (znak ▲▼ i słowa), jedyne nowe okna: kantor i wydarzenie z pauzą gry.
// =================================================================================

let kantorSelected = 'EUR';
let kantorTab = 'rates';
let obceFilter = { country: '', currency: '' };
let kantorProviderId = 'std';
let gdrBrokerId = 'std';

const COUNTRY_NAMES = { PL: 'Polska', DE: 'Niemcy', US: 'USA', CZ: 'Czechy', SE: 'Szwecja', CH: 'Szwajcaria', JP: 'Japonia', CN: 'Chiny', IN: 'Indie', TW: 'Tajwan', FR: 'Francja' };

/** Kraj i waluta spółki do karty (zaległość z planu: „kraj · waluta · cena”). Dziś wszystkie spółki są polskie, w złotych. */
function getCompanyCountryNote(stock) {
    const country = getCompanyOrigin(stock) === 'PL' || !stock?.country ? 'PL' : stock.country;
    return `${COUNTRY_NAMES[country] || country} · PLN`;
}

function fmtRate(value, code) {
    const digits = value < 0.1 ? 5 : value < 1 ? 4 : 3;
    return formatNumberPl(value, digits);
}

/** Zmiana kursu w ostatnich `weeks` tygodniach (krócej, gdy historia jest krótsza). */
function getFxChange(code, weeks = 52) {
    const h = fxHistory[code] || [];
    if (h.length < 2) return 0;
    const base = h[Math.max(0, h.length - 1 - weeks)];
    return base > 0 ? fxRates[code] / base - 1 : 0;
}
function getFxChangeWeeks(code, weeks = 52) { return Math.min(weeks, Math.max(0, (fxHistory[code] || []).length - 1)); }

function fxArrow(change) { return change > 0.0005 ? '▲' : change < -0.0005 ? '▼' : '■'; }
function fxPct(change) { return `${change > 0 ? '+' : ''}${formatNumberPl(change * 100, 1)}%`; }

/** Wykres kursu: linia z historii (do 104 tygodni) na tle widełek waluty. */
function renderFxChart(code) {
    const h = fxHistory[code] || [];
    const def = CURRENCIES[code];
    const W = 560, H = 150, pad = 6;
    if (h.length < 2) return '<p class="text-sm text-muted">Za mało danych — wykres pojawi się po kilku tygodniach gry.</p>';
    const y = v => H - pad - (v - def.min) / (def.max - def.min) * (H - 2 * pad);
    const x = i => pad + i / (h.length - 1) * (W - 2 * pad);
    const points = h.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const band = (v, label) => `<line x1="${pad}" x2="${W - pad}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="4 4"/><text x="${W - pad}" y="${y(v) + (v === def.min ? -3 : 11)}" text-anchor="end" font-size="10" fill="currentColor" fill-opacity="0.7">${label}</text>`;
    return `<svg class="fx-chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Wykres kursu ${code}: od ${fmtRate(h[0], code)} do ${fmtRate(h[h.length - 1], code)} zł">
        ${band(def.max, 'góra widełek ' + fmtRate(def.max, code))}${band(def.min, 'dół widełek ' + fmtRate(def.min, code))}
        <polyline points="${points}" fill="none" stroke="var(--accent-info)" stroke-width="2"/></svg>`;
}

function showKantorTab(tab) {
    kantorTab = tab;
    document.querySelectorAll('#net-page-kantory24 .tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    renderKantor();
}

function selectKantorCurrency(code) { kantorSelected = code; renderKantor(); }

function renderKantor() {
    const body = document.getElementById('kantor-body');
    if (!body || !playerFund) { if (body) body.innerHTML = '<p class="text-muted">Kantor działa po założeniu funduszu.</p>'; return; }
    const ticker = document.getElementById('kantor-ticker');
    if (ticker) ticker.textContent = `Gotówka funduszu: ${formatZl(playerCash, 0)} · waluty: ${formatZl(getForeignCashPln('player'), 0)} · kwity GDR: ${formatZl(getFundGdrValue(), 0)}`;
    body.innerHTML = kantorTab === 'foreign' ? renderForeignTab() : (kantorTab === 'forex' && typeof renderForexTab === 'function') ? renderForexTab() : (kantorTab === 'markets' && typeof renderMarketsTab === 'function') ? renderMarketsTab() : renderRatesTab();
    if (kantorTab === 'rates') updateKantorQuote();
}

function renderRatesTab() {
    const rows = FOREIGN_CURRENCIES.map(code => {
        const def = CURRENCIES[code], change = getFxChange(code), held = getCurrencyCash('player', code);
        return `<tr class="${code === kantorSelected ? 'row-selected' : ''}" onclick="selectKantorCurrency('${code}')" tabindex="0" onkeydown="if(event.key==='Enter')selectKantorCurrency('${code}')">
            <td>${currencyLabel(code)} <span class="text-muted">${escapeHtml(def.name)}</span></td>
            <td class="text-right">${fmtRate(fxRates[code], code)} zł</td>
            <td class="text-right">${fxArrow(change)} ${fxPct(change)}<span class="text-muted"> w ${getFxChangeWeeks(code)} tyg.</span></td>
            <td class="text-right">${held > 0 ? `${formatNumberPl(held, 2)} ${code} (${formatZl(toPln(held, code), 0)})` : '—'}</td></tr>`;
    }).join('');
    const code = kantorSelected, def = CURRENCIES[code];
    return `<table class="asset-mini-table w-full"><thead><tr><th>Waluta</th><th class="text-right">Kurs środkowy</th><th class="text-right">Zmiana</th><th class="text-right">Twoja pozycja</th></tr></thead><tbody>${rows}</tbody></table>
        <h4 class="mt-3">${flagIcon(CURRENCY_FLAG[code], 14)} ${currencyIcon(code, 18)} ${code} — ${escapeHtml(def.name)}</h4>
        ${renderFxChart(code)}
        <p class="text-sm text-muted">Kurs porusza się w widełkach ${fmtRate(def.min, code)}–${fmtRate(def.max, code)} zł i wraca do wolno zmieniającej się średniej. ${def.safe ? 'Waluta „bezpiecznej przystani”: w kryzysie zwykle drożeje.' : 'W kryzysie zwykle słabnie wobec bezpiecznych przystani (USD, CHF, JPY).'}</p>
        <div class="bank-card mt-3"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('moneta', 20)}</span><div><h4>Wymiana ${code}</h4><span class="bank-card-type">kupno i sprzedaż po kursie kantoru</span></div></header>
            <div class="kantor-form"><label for="kantor-provider" class="text-sm">Kantor <select id="kantor-provider" onchange="setKantorProvider(this.value)">${renderProviderOptions(kantorProviderId, code)}</select></label>
            <label for="kantor-amount" class="text-sm">Kwota (złote przy kupnie, jednostki ${code} przy sprzedaży)</label>
            <input id="kantor-amount" type="number" min="1" step="any" value="${Math.max(1000, Math.round(Math.min(playerCash, 50000) / 1000) * 1000)}" oninput="updateKantorQuote()" aria-describedby="kantor-quote">
            <div class="btn-row"><button class="btn-primary" onclick="kantorUiBuy()">Kup ${code} za PLN</button><button class="btn-ghost" onclick="kantorUiSell()">Sprzedaj ${code}</button></div></div>
            <p id="kantor-quote" class="text-sm" aria-live="polite"></p></div>
        <h4 class="mt-3">Porównanie kursów ${code}</h4><div id="kantor-compare"></div>
        <p class="text-sm text-muted">Banki (e-bank, uniwersalny, międzynarodowy) i Kantor Miejski ustalają własne kursy i spready, odświeżane co kwartał. Bank międzynarodowy jest najtańszy przy dużych kwotach (od 100 tys. zł) i wymienia wszystkie waluty; e-bank ma limit transakcji, Kantor Miejski wymienia tylko EUR, USD i CZK do 30 tys. zł, a jego zysk zasila miasto.</p>`;
}

function providerLabel(p) { return `${p.name} (${p.tag})`; }
function renderProviderOptions(selected, code) {
    return getKantorProviders().map(p => `<option value="${escapeHtml(p.id)}" ${p.id === selected ? 'selected' : ''}>${escapeHtml(providerLabel(p))}${p.currencies && !p.currencies.includes(code) ? ' — bez ' + code : ''}</option>`).join('');
}
function setKantorProvider(id) { kantorProviderId = id; updateKantorQuote(); }

/** Tabela porównawcza dostawców dla wybranej waluty i kwoty (najlepszy kurs kupna i sprzedaży oznaczony słowem). */
function renderKantorCompare(code, amount) {
    const rows = getKantorProviders().map(p => ({ p, buy: getProviderQuote(p.id, code, amount, 'buy'), sell: getProviderQuote(p.id, code, amount, 'sell') })); // kwota porównania w złotych dla obu stron
    const okBuy = rows.filter(r => r.buy.ok).map(r => r.buy.rate), okSell = rows.filter(r => r.sell.ok).map(r => r.sell.rate);
    const bestBuy = Math.min(...okBuy), bestSell = Math.max(...okSell);
    const body = rows.map(r => r.buy.ok && r.sell.ok
        ? `<tr><td>${escapeHtml(r.p.name)} <span class="text-muted text-xs">${escapeHtml(r.p.tag)}</span></td><td class="text-right">${fmtRate(r.buy.rate, code)} zł${r.buy.rate === bestBuy ? ' · najtaniej' : ''}</td><td class="text-right">${fmtRate(r.sell.rate, code)} zł${r.sell.rate === bestSell ? ' · najdrożej' : ''}</td><td class="text-right">${formatNumberPl(r.buy.spread * 100, 2)}%</td></tr>`
        : `<tr class="text-muted"><td>${escapeHtml(r.p.name)} <span class="text-xs">${escapeHtml(r.p.tag)}</span></td><td colspan="3">${escapeHtml((r.buy.ok ? r.sell.reason : r.buy.reason) || 'niedostępny')}</td></tr>`).join('');
    return `<table class="asset-mini-table w-full"><thead><tr><th>Kantor</th><th class="text-right">Kupno ${code} (płacisz)</th><th class="text-right">Sprzedaż (dostajesz)</th><th class="text-right">Spread</th></tr></thead><tbody>${body}</tbody></table>`;
}

function updateKantorQuote() {
    const el = document.getElementById('kantor-quote'), input = document.getElementById('kantor-amount');
    if (!el || !input) return;
    const code = kantorSelected, amount = Number(input.value) || 0;
    const cmp = document.getElementById('kantor-compare');
    if (cmp) cmp.innerHTML = renderKantorCompare(code, amount);
    const buy = getProviderQuote(kantorProviderId, code, amount, 'buy'), sell = getProviderQuote(kantorProviderId, code, amount * getFxRate(code), 'sell');
    if (!buy.ok || !sell.ok) { el.textContent = (buy.ok ? sell.reason : buy.reason) || 'Ten kantor jest niedostępny.'; return; }
    const spread = buy.spread;
    el.innerHTML = `Kupno: ${fmtRate(buy.rate, code)} zł za 1 ${code} (${formatNumberPl(amount / buy.rate, 2)} ${code} za ${formatZl(amount, 0)}). Sprzedaż: ${fmtRate(sell.rate, code)} zł. `
        + `Spread kantoru ${formatNumberPl(spread * 100, 1)}% — tyle tracisz na kupnie i sprzedaży razem, więc kurs musi się ruszyć o więcej, żeby to się opłaciło.`;
}

function kantorUiBuy() {
    const amount = Number(document.getElementById('kantor-amount')?.value) || 0;
    const r = kantorBuyCurrency(kantorSelected, amount, kantorProviderId);
    showToast(r.ok ? `Kupiono ${formatNumberPl(r.foreign, 2)} ${kantorSelected} za ${formatZl(amount, 0)} (spread ${formatZl(r.spreadCost, 0)}).` : r.reason, r.ok ? 'success' : 'warning');
    renderKantor();
    if (typeof updateUI === 'function') updateUI();
}

/** Sprzedaż: kwota w oknie to liczba jednostek waluty (nie złotych). */
function kantorUiSell() {
    const amount = Number(document.getElementById('kantor-amount')?.value) || 0;
    const r = kantorSellCurrency(kantorSelected, amount, kantorProviderId);
    showToast(r.ok ? `Sprzedano ${formatNumberPl(amount, 2)} ${kantorSelected} za ${formatZl(r.pln, 0)} (spread ${formatZl(r.spreadCost, 0)}).` : r.reason, r.ok ? 'success' : 'warning');
    renderKantor();
    if (typeof updateUI === 'function') updateUI();
}

// --- Zakładka „Obce”: kwity depozytowe ---

function setObceFilter(key, value) { obceFilter[key] = value; renderKantor(); }

function renderForeignTab() {
    const issuers = getForeignIssuerList().filter(i => i.kind !== 'share'); // akcje krajów dołączonych są w zakładce Rynki
    const countries = [...new Set(FOREIGN_GIANTS.map(g => g.country))], currencies = [...new Set(FOREIGN_GIANTS.map(g => g.currency))];
    const opts = (list, current, label) => `<option value="">${label}</option>` + list.map(v => `<option value="${v}" ${v === current ? 'selected' : ''}>${escapeHtml(COUNTRY_NAMES[v] || v)}</option>`).join('');
    const filtered = issuers.filter(i => (!obceFilter.country || i.country === obceFilter.country) && (!obceFilter.currency || i.currency === obceFilter.currency));
    const rows = filtered.map(i => {
        const held = getGdrHeld(i), h = i.history, change = h.length > 1 ? i.price / h[0] - 1 : 0;
        return `<tr><td><strong>${getGdrSymbol(i)}</strong> <span class="text-muted">${escapeHtml(i.name)}</span></td>
            <td>${flagIcon(i.country, 12)} ${escapeHtml(COUNTRY_NAMES[i.country] || i.country)} · ${currencyIcon(i.currency, 14)} ${i.currency}</td>
            <td class="text-right">${formatNumberPl(i.price, 2)} ${i.currency}<br><span class="text-muted text-xs">${fxArrow(change)} ${fxPct(change)} w ${h.length - 1} tyg.</span></td>
            <td class="text-right">${formatZl(getGdrMid(i), 2)}<br><span class="text-muted text-xs">kupno ${formatZl(getGdrQuote(i, 'buy'), 2)} · sprzedaż ${formatZl(getGdrQuote(i, 'sell'), 2)}</span></td>
            <td class="text-right">${held > 0 ? `${formatNumberPl(held, 0)} (${formatZl(held * getGdrMid(i), 0)})` : '—'}</td>
            <td class="text-right"><input type="number" min="1" step="1" value="100" id="gdr-qty-${i.id}" aria-label="Liczba kwitów ${escapeHtml(i.name)}" style="width:5.5em">
                <button class="btn-primary btn-sm" onclick="gdrUiTrade('${i.id}','buy')">Kup</button> <button class="btn-ghost btn-sm" onclick="gdrUiTrade('${i.id}','sell')" ${held > 0 ? '' : 'disabled'}>Sprzedaj</button></td></tr>`;
    }).join('');
    const brokers = getKantorProviders().filter(p => p.kind === 'international');
    const brokerSel = `<label class="text-sm">Pośrednik <select onchange="gdrBrokerId = this.value">${`<option value="std">Depozytariusz (spread ${formatNumberPl(GDR_RULES.depositSpread * 100, 2)}%)</option>` + brokers.map(b => `<option value="${escapeHtml(b.id)}" ${b.id === gdrBrokerId ? 'selected' : ''}>${escapeHtml(b.name)} (połowa spreadu)</option>`).join('')}</select></label>`;
    return `<div class="btn-row">${brokerSel}<label class="text-sm">Kraj <select onchange="setObceFilter('country', this.value)">${opts(countries, obceFilter.country, 'wszystkie')}</select></label>
        <label class="text-sm">Waluta <select onchange="setObceFilter('currency', this.value)">${`<option value="">wszystkie</option>` + currencies.map(c => `<option value="${c}" ${c === obceFilter.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div>
        ${issuers.length ? `<table class="asset-mini-table w-full mt-3"><thead><tr><th>Kwit</th><th>Kraj · waluta</th><th class="text-right">Cena obca</th><th class="text-right">Cena kwitu w PLN</th><th class="text-right">Twoje kwity</th><th class="text-right">Zlecenie</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="text-muted">Brak kwitów dla tego filtra.</td></tr>'}</tbody></table>`
            : '<p class="text-muted mt-3">Żaden zagraniczny gigant nie jest jeszcze notowany. Pojawi się w wydarzeniu „Gigant wkracza na scenę” (średnio raz na 2 lata).</p>'}
        <p class="text-sm text-muted">Kwit depozytowy (GDR) to notowany u nas w złotych papier oparty na akcji zagranicznej spółki. Jego cena to cena akcji × kurs waluty ± ${formatNumberPl(GDR_RULES.depositSpread * 100, 1)}% spreadu depozytowego, więc zysk z akcji może zjeść kurs waluty — i odwrotnie.</p>`;
}

function gdrUiTrade(id, side) {
    const qty = Number(document.getElementById(`gdr-qty-${id}`)?.value) || 0;
    const r = side === 'buy' ? buyGdr(id, qty, gdrBrokerId) : sellGdr(id, qty, gdrBrokerId);
    showToast(r.ok ? `${side === 'buy' ? 'Kupiono' : 'Sprzedano'} ${qty} kwitów ${id}.GDR za ${formatZl(r.cost ?? r.proceeds, 0)}.` : r.reason, r.ok ? 'success' : 'warning');
    renderKantor();
    if (typeof updateUI === 'function') updateUI();
}

// --- Okno wydarzenia „Gigant wkracza na scenę” (pauza gry; w przebiegach pauza jest blokowana przez narzędzia) ---

function showGiantEventWindow(result) {
    const modal = document.getElementById('giant-event-modal');
    if (!modal || !result) return;
    if (!isGamePaused && typeof togglePauseGame === 'function') togglePauseGame();
    const body = document.getElementById('giant-event-body');
    if (result.kind === 'gdr') {
        body.innerHTML = `<p><strong>${escapeHtml(result.giantName)}</strong> (${flagIcon(result.country, 12)} ${escapeHtml(COUNTRY_NAMES[result.country] || result.country)}) wchodzi na naszą giełdę jako kwity depozytowe <strong>${escapeHtml(result.symbol)}</strong>.</p>
            <dl class="bank-card-rates"><div><dt>Cena w ${result.currency}</dt><dd>${formatNumberPl(result.priceForeign, 2)}</dd></div><div><dt>Cena kwitu w PLN</dt><dd>${formatZl(result.pricePln, 2)}</dd></div><div><dt>Spread depozytowy</dt><dd>${formatNumberPl(GDR_RULES.depositSpread * 100, 1)}%</dd></div></dl>
            <p class="text-sm">Kupisz je w oknie Kantor → Obce. Pamiętaj: wynik kwitu to zmiana ceny akcji <em>i</em> kursu ${result.currency}.</p>`;
    } else {
        body.innerHTML = `<p><strong>${escapeHtml(result.giantName)}</strong> przejmuje <strong>${escapeHtml(result.name)}</strong> (${escapeHtml(result.symbol)}).</p>
            <dl class="bank-card-rates"><div><dt>Cena wykupu</dt><dd>${formatZl(result.offer, 2)}</dd></div><div><dt>Premia do kursu</dt><dd>${formatNumberPl(result.premium * 100, 0)}%</dd></div><div><dt>Wypłacono akcjonariuszom</dt><dd>${formatZl(result.paid, 0)}</dd></div></dl>
            <p class="text-sm">${result.heldByPlayer ? 'Twoje akcje rozliczono gotówką po cenie wykupu.' : 'Nie miałeś akcji tej spółki.'} Spółka znika z giełdy.</p>
            <p class="text-sm">W jej miejsce w ciągu 1–4 kwartałów zadebiutuje nowa spółka krajowa${result.replacementSector ? ` z sektora ${escapeHtml(result.replacementSector)}` : ''} (informacja w wiadomościach).${result.listedSymbol ? ` Przejmujący koncern wchodzi do obrotu jako kwity <strong>${escapeHtml(result.listedSymbol)}</strong> (Kantor → Obce).` : ''}</p>`;
    }
    modal.hidden = false;
    modal.style.display = 'block';
}

function closeGiantEventWindow() {
    const modal = document.getElementById('giant-event-modal');
    if (modal) modal.style.display = 'none';
    pendingGiantEvent = null;
    if (isGamePaused && typeof togglePauseGame === 'function') togglePauseGame();
}

// --- Akademia ---
Object.assign(ACADEMY_ENTRIES, {
    ryzykoWalutowe: {
        title: 'Ryzyko walutowe', get icon() { return academyIcon('moneta'); },
        text: 'Gdy trzymasz papiery albo gotówkę w obcej walucie, Twój wynik w złotych zależy od dwóch rzeczy: od ceny papieru i od kursu. Zysk 10% na akcji w euro znika, jeśli euro w tym czasie potanieje o 10%. Kurs waluty rośnie i spada w widełkach, a w kryzysie „bezpieczne przystanie” (frank, jen, dolar) zwykle drożeją, a waluty rynków wschodzących tanieją.',
        example: () => { const eur = fxRates.EUR; const held = getForeignCashPln('player'); return `Teraz 1 EUR kosztuje ${formatNumberPl(eur, 3)} zł; w walutach trzymasz ${formatZl(held, 0)}.`; },
        quiz: [
            { q: 'Akcja w euro zyskała 10%, a euro potaniało o 10%. Jaki jest Twój wynik w złotych?', a: ['ok. 1% straty', '+10%', '+20%'], c: 0 },
            { q: 'Która waluta zwykle drożeje w kryzysie?', a: ['frank szwajcarski', 'rupia indyjska', 'żadna'], c: 0 },
            { q: 'Co zmniejsza ryzyko walutowe?', a: ['rozłożenie majątku na kilka walut i złote', 'trzymanie wszystkiego w jednej obcej walucie', 'brak jest sposobu'], c: 0 }
        ]
    },
    spread: {
        title: 'Spread', get icon() { return academyIcon('moneta'); },
        text: 'Spread to różnica między ceną kupna a sprzedaży. Kantor kupuje walutę drożej, niż ją odkupuje, i to jest jego zarobek: u nas 1–2%, tym mniej, im większa kwota. Każda wymiana tam i z powrotem kosztuje cały spread, więc częste „kręcenie” walutą zjada zysk, a pewnego zysku z samego powrotu kursu do średniej nie ma.',
        example: () => `Dla kwoty 100 tys. zł spread kantoru wynosi ${formatNumberPl(getKantorSpread(100000) * 100, 1)}%, dla 5 mln zł — ${formatNumberPl(getKantorSpread(5e6) * 100, 1)}%.`,
        quiz: [
            { q: 'Kupujesz walutę i od razu ją sprzedajesz. Co się dzieje z Twoimi pieniędzmi?', a: ['tracisz spread', 'zyskujesz spread', 'nic'], c: 0 },
            { q: 'Kiedy spread kantoru jest niższy?', a: ['przy większych kwotach', 'przy mniejszych kwotach', 'zawsze taki sam'], c: 0 },
            { q: 'Czy kupowanie waluty po niskim kursie zawsze daje zysk?', a: ['nie — spread i dryf średniej mogą go zjeść', 'tak', 'tylko w piątek'], c: 0 }
        ]
    },
    dzwigniaMarginCall: {
        title: 'Dźwignia i margin call', get icon() { return academyIcon('samolot'); },
        text: 'Dźwignia 1:10 oznacza, że wkładasz 10% wartości pozycji (depozyt), a resztę „pożycza” rynek. Zysk i strata liczą się od całej wartości, więc ruch kursu o 5% daje ±50% depozytu. Gdy kapitał pozycji spadnie poniżej 70% depozytu, dostajesz ostrzeżenie (margin call), a poniżej 50% pozycja zamyka się automatycznie. Za utrzymanie pozycji płacisz koszt finansowania (swap), a przy otwarciu spread. Strata nie przekroczy depozytu.',
        example: () => `Pozycja 100 000 zł z dźwignią 1:10 ma depozyt 10 000 zł. Kurs spada o 5% → strata 5 000 zł, kapitał 50% depozytu — pozycja zostaje zamknięta.`,
        quiz: [
            { q: 'Ile wynosi depozyt pozycji 50 000 zł przy dźwigni 1:10?', a: ['5 000 zł', '50 000 zł', '500 zł'], c: 0 },
            { q: 'Co się dzieje, gdy kapitał pozycji spada poniżej 50% depozytu?', a: ['pozycja zamyka się automatycznie', 'dopłacasz bez końca', 'nic'], c: 0 },
            { q: 'Czym jest swap w tej grze?', a: ['kosztem finansowania pozycji z dźwignią', 'zyskiem z kursu', 'prowizją od akcji'], c: 0 }
        ]
    },
    konsolidacjaGield: {
        title: 'Konsolidacja giełd', get icon() { return academyIcon('samolot'); },
        text: 'Giełdy łączą się, żeby obniżyć koszty i przyciągnąć więcej inwestorów. Gdy giełda przejmuje inną, jej spółki trafiają do wspólnego obrotu. Gdy przejmuje ją obca giełda, spółki płacą wyższe opłaty za notowanie, a kursy chwilowo spadają. Wspólny rynek zwykle zmniejsza spread i prowizje, ale zwiększa zarażanie kryzysami między krajami.',
        example: () => (typeof getLinkedCountries === 'function' && getLinkedCountries().length) ? `Połączone kraje: ${getLinkedCountries().map(id => COUNTRY_DEFS[id].name).join(', ')}.` : 'Żadna giełda nie jest jeszcze połączona z naszą.',
        quiz: [
            { q: 'Co się dzieje z kursami, gdy obca giełda przejmuje naszą?', a: ['chwilowo spadają', 'rosną na stałe', 'nic'], c: 0 },
            { q: 'Czy spółki połączonego kraju kupisz bez biletu?', a: ['tak, z prowizją krajową', 'nie, zawsze trzeba biletu', 'tylko za dolary'], c: 0 },
            { q: 'Co zwykle daje wspólny rynek?', a: ['niższe koszty i szybsze zarażanie kryzysami', 'brak ryzyka', 'zamknięcie giełdy'], c: 0 }
        ]
    },
    adrGdr: {
        title: 'ADR i GDR (kwity depozytowe)', get icon() { return academyIcon('samolot'); },
        text: 'Kwit depozytowy (ADR w USA, GDR na innych giełdach) to papier notowany u nas, którego zabezpieczeniem są akcje zagranicznej spółki trzymane w depozycie. Kupujesz go w złotych, bez rachunku za granicą, ale płacisz spread depozytowy, a jego cena zależy od ceny akcji i kursu waluty. Kwit nie daje praw głosu w spółce.',
        example: () => { const list = getForeignIssuerList(); return list.length ? `Notowane kwity: ${list.map(i => `${getGdrSymbol(i)} (${formatZl(getGdrMid(i), 2)})`).join(', ')}.` : 'Żaden kwit nie jest jeszcze notowany — pojawią się w wydarzeniu „Gigant wkracza na scenę”.'; },
        quiz: [
            { q: 'Od czego zależy cena kwitu depozytowego?', a: ['od ceny akcji zagranicznej i kursu waluty', 'tylko od ceny akcji', 'tylko od kursu'], c: 0 },
            { q: 'Czy kwit daje prawo głosu w zagranicznej spółce?', a: ['nie', 'tak, pełne', 'tak, połowę'], c: 0 },
            { q: 'Po co istnieją kwity depozytowe?', a: ['by kupować zagraniczne spółki bez rachunku za granicą', 'by omijać podatki', 'by zastąpić akcje krajowe'], c: 0 }
        ]
    }
});
