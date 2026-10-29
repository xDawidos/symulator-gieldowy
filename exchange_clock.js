// =================================================================================
// 0.16.8 F3b: ZEGAR GIEŁD I GODZINY SESJI
// Stan sesji jest osobno od renderowania: `getMarketStatus(rynek, zegarMs)` to czysta funkcja czasu gry (`getGameClockMs`). Doba gry = jeden tydzień gry
// (BASE_DELAYS.weekly), więc wskazówki są czytelne i nie zależą od pauzy ani prędkości (zegar gry stoi razem z grą). Czas letni: kwartały 2–3 roku gry
// (półkula północna), odwrotnie w Sydney; Japonia, Chiny, Indie i Tajwan bez zmiany czasu. Widok to karta (nie okno): nic w nim nie pauzuje symulacji.
// Handel zagraniczny poza sesją: bez blokady, z dopłatą do prowizji (`SESSION_RULES.offHoursSurcharge`).
// =================================================================================

const SESSION_RULES = { offHoursSurcharge: 0.004, dayStartUtc: 0 };
/** Strefa (UTC standardowo), czas letni (northern | southern | null) i sesja w czasie lokalnym (godziny dziesiętne). Miasta bez giełdy w grze (Londyn, Sydney) tylko na zegarze. */
const MARKET_SESSIONS = {
    PL: { city: 'Warszawa', utc: 1, dst: 'northern', open: 9, close: 17 },
    DE: { city: 'Frankfurt', utc: 1, dst: 'northern', open: 9, close: 17.5 },
    CZ: { city: 'Praga', utc: 1, dst: 'northern', open: 9, close: 16.5 },
    SE: { city: 'Sztokholm', utc: 1, dst: 'northern', open: 9, close: 17.5 },
    CH: { city: 'Zurych', utc: 1, dst: 'northern', open: 9, close: 17.5 },
    FR: { city: 'Paryż', utc: 1, dst: 'northern', open: 9, close: 17.5 },
    US: { city: 'Nowy Jork', utc: -5, dst: 'northern', open: 9.5, close: 16 },
    JP: { city: 'Tokio', utc: 9, dst: null, open: 9, close: 15 },
    CN: { city: 'Szanghaj', utc: 8, dst: null, open: 9.5, close: 15 },
    IN: { city: 'Bombaj', utc: 5.5, dst: null, open: 9.25, close: 15.5 },
    TW: { city: 'Tajpej', utc: 8, dst: null, open: 9, close: 13.5 },
    GB: { city: 'Londyn', utc: 0, dst: 'northern', open: 8, close: 16.5, clockOnly: true },
    AU: { city: 'Sydney', utc: 10, dst: 'southern', open: 10, close: 16, clockOnly: true }
};
const CLOCK_CITIES = ['GB', 'US', 'AU', 'JP']; // zegary analogowe jak w platformach forex

function getMarketClockDayMs() { return BASE_DELAYS.weekly; }
/** Godzina UTC (0–24) w czasie gry. */
function getGameUtcHour(clockMs = getGameClockMs()) { return (((clockMs / getMarketClockDayMs()) * 24 + SESSION_RULES.dayStartUtc) % 24 + 24) % 24; }
function isMarketDst(def, quarter = macro.quarter) {
    if (!def.dst) return false;
    const summerNorth = (quarter % 4 === 1 || quarter % 4 === 2);
    return def.dst === 'northern' ? summerNorth : !summerNorth;
}
/** Godzina lokalna (0–24) giełdy `market` w momencie `clockMs`. */
function getMarketLocalHour(market, clockMs = getGameClockMs()) {
    const def = MARKET_SESSIONS[market];
    return def ? (((getGameUtcHour(clockMs) + def.utc + (isMarketDst(def) ? 1 : 0)) % 24) + 24) % 24 : 0;
}
/** Stan sesji: otwarta?, godzina lokalna, godziny do zmiany stanu i opis tekstem. Giełda PL (macierzysta) i nieznane rynki są zawsze otwarte. */
function getMarketStatus(market, clockMs = getGameClockMs()) {
    const def = MARKET_SESSIONS[market];
    if (!def || market === 'home') return { open: true, localHour: 0, hoursToChange: Infinity, text: 'otwarta' };
    const h = getMarketLocalHour(market, clockMs), open = h >= def.open && h < def.close;
    const hoursToChange = open ? def.close - h : (h < def.open ? def.open - h : 24 - h + def.open);
    const fmt = x => `${formatNumberPl(x, 1)} h`;
    return { open, localHour: h, hoursToChange, text: open ? `otwarta, zamyka się za ${fmt(hoursToChange)}` : `zamknięta, otwiera się za ${fmt(hoursToChange)}` };
}
function isMarketOpen(market, clockMs = getGameClockMs()) { return getMarketStatus(market, clockMs).open; }
/** Dopłata do prowizji za handel poza sesją (tylko rynki zagraniczne z definicji sesji). */
function getOffHoursSurcharge(country) { return MARKET_SESSIONS[country] && !MARKET_SESSIONS[country].clockOnly && !isMarketOpen(country) ? SESSION_RULES.offHoursSurcharge : 0; }

function formatClockHour(h) { const m = Math.round((h % 24) * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }

function renderAnalogClock(market, size = 78) {
    const def = MARKET_SESSIONS[market], h = getMarketLocalHour(market), st = getMarketStatus(market), r = size / 2 - 3, c = size / 2;
    const hand = (angle, len, w) => `<line x1="${c}" y1="${c}" x2="${(c + Math.sin(angle) * len).toFixed(1)}" y2="${(c - Math.cos(angle) * len).toFixed(1)}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;
    const ticks = Array.from({ length: 12 }, (_, k) => { const a = k * Math.PI / 6; return `<line x1="${(c + Math.sin(a) * (r - 4)).toFixed(1)}" y1="${(c - Math.cos(a) * (r - 4)).toFixed(1)}" x2="${(c + Math.sin(a) * r).toFixed(1)}" y2="${(c - Math.cos(a) * r).toFixed(1)}" stroke="currentColor" stroke-width="1" opacity="0.5"/>`; }).join('');
    const day = h >= 6 && h < 20;
    return `<figure class="mclock" style="margin:0;text-align:center"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${def.city}: ${formatClockHour(h)}, ${st.text}">
        <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="currentColor" stroke-width="${st.open ? 3 : 1}"/>${ticks}${hand(((h % 12) / 12) * Math.PI * 2, r * 0.5, 2.5)}${hand(((h % 1)) * Math.PI * 2, r * 0.8, 1.5)}</svg>
        <figcaption><strong>${def.city}</strong><br><span class="text-xs">${formatClockHour(h)} · ${day ? 'dzień' : 'noc'}</span><br><span class="text-xs text-muted">${st.open ? '● otwarta' : '○ zamknięta'}</span></figcaption></figure>`;
}

/** Pas sesji na osi 24 h w czasie Warszawy: pełny pasek = sesja, linia „teraz”; stan tekstem po prawej. */
function renderSessionBand(markets) {
    const w = 560, row = 20, left = 92, plot = w - left - 8, base = MARKET_SESSIONS.PL, nowWarsaw = getMarketLocalHour('PL');
    const toX = hr => left + (((hr % 24) + 24) % 24) / 24 * plot;
    const rows = markets.map((m, k) => {
        const def = MARKET_SESSIONS[m], shift = (base.utc + (isMarketDst(base) ? 1 : 0)) - (def.utc + (isMarketDst(def) ? 1 : 0)), a = def.open + shift, b = def.close + shift, y = 24 + k * row;
        const seg = (x1, x2) => `<rect x="${x1.toFixed(1)}" y="${y}" width="${Math.max(1, x2 - x1).toFixed(1)}" height="12" rx="2" fill="currentColor" opacity="${getMarketStatus(m).open ? 0.85 : 0.35}"/>`;
        const x1 = toX(a), x2 = toX(b), bars = x2 > x1 ? seg(x1, x2) : seg(x1, left + plot) + seg(left, x2); // sesja przechodzi przez północ w czasie Warszawy
        return `<text x="0" y="${y + 10}" font-size="11" fill="currentColor">${def.city}</text>${bars}<text x="${left + plot - 2}" y="${y + 10}" font-size="10" text-anchor="end" fill="currentColor" opacity="0.8">${getMarketStatus(m).open ? 'otwarta' : 'zamknięta'}</text>`;
    }).join('');
    const axis = [0, 6, 12, 18, 24].map(hr => `<text x="${toX(hr === 24 ? 23.999 : hr)}" y="12" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">${String(hr % 24).padStart(2, '0')}:00</text>`).join('');
    const nx = toX(nowWarsaw), H = 30 + markets.length * row;
    return `<svg viewBox="0 0 ${w} ${H}" width="100%" role="img" aria-label="Sesje giełd na osi doby w czasie Warszawy, teraz ${formatClockHour(nowWarsaw)}">${axis}${rows}<line x1="${nx.toFixed(1)}" y1="16" x2="${nx.toFixed(1)}" y2="${H - 4}" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/><text x="${nx.toFixed(1)}" y="${H}" font-size="10" text-anchor="middle" fill="currentColor">teraz ${formatClockHour(nowWarsaw)}</text></svg>`;
}

function renderMarketClockCard() {
    startMarketClockRefresh();
    const joined = typeof getJoinedCountries === 'function' ? getJoinedCountries().filter(id => MARKET_SESSIONS[id]) : [];
    const list = ['PL', ...joined, ...CLOCK_CITIES.filter(c => MARKET_SESSIONS[c].clockOnly)];
    const status = ['PL', ...joined].map(m => `<li>${escapeHtml(MARKET_SESSIONS[m].city)} — ${getMarketStatus(m).text}</li>`).join('');
    return `<div class="bank-card" id="market-clock" role="group" aria-label="Czas na giełdach"><header class="bank-card-head"><div><h4>Czas na giełdach</h4><span class="bank-card-type">doba gry = tydzień gry · czas letni w kw. 2–3 · handel poza sesją z dopłatą ${formatNumberPl(SESSION_RULES.offHoursSurcharge * 100, 1)}%</span></div></header>
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:space-around;margin:8px 0">${CLOCK_CITIES.map(c => renderAnalogClock(c)).join('')}</div>
        ${renderSessionBand(list)}<ul class="text-sm" style="margin:6px 0 0;padding-left:18px">${status}</ul></div>`;
}

/** Odświeżanie karty co sekundę, tylko gdy jest w DOM (nie tworzy okna i nie dotyka pauzy gry). */
let marketClockTimer = null;
function startMarketClockRefresh() {
    if (marketClockTimer || typeof document === 'undefined') return;
    marketClockTimer = setInterval(() => { const el = document.getElementById('market-clock'); if (el) el.outerHTML = renderMarketClockCard(); }, 1000);
}
