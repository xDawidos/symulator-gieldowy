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
function renderAirportWindow(targetId = 'city-content-airport') {
    const root = document.getElementById(targetId);
    if (!root) return;
    const built = isAirportBuilt(), building = isAirportInProgress();
    const status = built ? 'Lotnisko stoi — bilety są w sprzedaży.'
        : building ? 'Lotnisko jest w budowie (megaprojekt miasta, wykonawca: spółka budowlana).'
            : 'Lotnisko jeszcze nie powstało. Miasto może je zlecić przez przetarg budowlany; bez niego nie kupisz biletów.';
    const orderBtn = !built && !building ? `<button class="btn-primary" onclick="airportUiOrder()">Zleć budowę lotniska</button>` : '';
    const rows = Object.values(COUNTRY_DEFS).map(def => {
        const has = hasTicket('player', def.id), price = getTicketPrice(def.id), joined = isCountryJoined(def.id);
        const action = has ? '<span class="text-muted">masz bilet</span>' : `<button class="btn-ghost" ${built ? '' : 'disabled'} onclick="airportUiBuy('${def.id}')">Kup bilet za ${formatZl(price, 0)}</button>`;
        return `<tr><td>${flagIcon(def.id, 14)} <strong>${escapeHtml(def.name)}</strong></td><td>${currencyIcon(def.currency, 14)} ${def.currency}</td>
            <td>${escapeHtml(def.operator.name)}</td><td>${joined ? 'giełda otwarta' : 'jeszcze zamknięta (pierwszy bilet ją otworzy)'}</td><td class="text-right">${action}</td></tr>`;
    }).join('');
    root.innerHTML = `<div class="bank-card"><header class="bank-card-head"><span class="bank-card-icon">${uiIcon('rynek', 20)}</span><div><h4>Lotnisko i bilety</h4><span class="bank-card-type">licencje na rynki zagraniczne</span></div></header>
        <p class="text-sm" aria-live="polite">${status}</p>${orderBtn}
        <table class="asset-mini-table w-full"><thead><tr><th>Rynek</th><th>Waluta</th><th>Operator</th><th>Stan</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        <p class="text-sm text-muted">Bilet kupujesz z gotówki funduszu (od ${formatZl(TICKET_RULES.min, 0)}). Z biletem kupujesz spółki kraju przez kantor z prowizją ${formatNumberPl(COUNTRY_RULES.commission * 100, 1)}% (na rynku krajowym 0,25%). Każdy inwestor ma bilet osobno, a każdy sprzedany bilet daje Turystyce małą premię.</p></div>`;
}

function airportUiOrder() {
    const r = orderAirport();
    showToast(r.ok ? 'Miasto ogłasza budowę lotniska.' : r.reason, r.ok ? 'success' : 'warning');
    renderAirportWindow();
}

function airportUiBuy(country) {
    const r = buyTicket(country);
    if (!r.ok) showToast(r.reason, 'warning');
    renderAirportWindow();
    if (typeof updateUI === 'function') updateUI();
}
