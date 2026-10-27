// =================================================================================
// 0.16.1: FLAGI 10 KRAJÓW (+ UE) I IKONY WALUT jako SVG (bez emoji). Uproszczone, geometryczne; zawsze z podpisem tekstowym obok
// (kolor nigdy jedynym nośnikiem). Flagi: viewBox 24×16; ikony walut: koło 24×24 ze znakiem waluty.
// =================================================================================

const FLAG_MARKUP = {
    PL: '<rect width="24" height="8" fill="#fff"/><rect y="8" width="24" height="8" fill="#dc143c"/>',
    DE: '<rect width="24" height="5.4" fill="#000"/><rect y="5.3" width="24" height="5.4" fill="#d00"/><rect y="10.6" width="24" height="5.4" fill="#ffce00"/>',
    FR: '<rect width="8" height="16" fill="#0055a4"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ef4135"/>',
    CZ: '<rect width="24" height="8" fill="#fff"/><rect y="8" width="24" height="8" fill="#d7141a"/><path d="M0 0l12 8-12 8z" fill="#11457e"/>',
    SE: '<rect width="24" height="16" fill="#006aa7"/><rect x="7" width="3.6" height="16" fill="#fecc00"/><rect y="6.2" width="24" height="3.6" fill="#fecc00"/>',
    CH: '<rect width="24" height="16" fill="#d52b1e"/><rect x="10.2" y="3.5" width="3.6" height="9" fill="#fff"/><rect x="7.5" y="6.2" width="9" height="3.6" fill="#fff"/>',
    JP: '<rect width="24" height="16" fill="#fff"/><circle cx="12" cy="8" r="4.6" fill="#bc002d"/>',
    CN: '<rect width="24" height="16" fill="#de2910"/><path d="M5 2.2l.9 2.7h2.8l-2.3 1.6.9 2.7L5 7.6 2.7 9.2l.9-2.7L1.3 4.9h2.8z" fill="#ffde00"/>',
    IN: '<rect width="24" height="5.4" fill="#ff9933"/><rect y="5.3" width="24" height="5.4" fill="#fff"/><rect y="10.6" width="24" height="5.4" fill="#138808"/><circle cx="12" cy="8" r="2" fill="none" stroke="#000080" stroke-width=".8"/>',
    TW: '<rect width="24" height="16" fill="#fe0000"/><rect width="12" height="8" fill="#000095"/><circle cx="6" cy="4" r="2.2" fill="#fff"/>',
    US: '<rect width="24" height="16" fill="#fff"/><g fill="#b22234"><rect width="24" height="2.3"/><rect y="4.6" width="24" height="2.3"/><rect y="9.2" width="24" height="2.3"/><rect y="13.7" width="24" height="2.3"/></g><rect width="10.5" height="9.2" fill="#3c3b6e"/>',
    EU: '<rect width="24" height="16" fill="#003399"/><g fill="#ffcc00"><circle cx="12" cy="3.5" r="1"/><circle cx="12" cy="12.5" r="1"/><circle cx="7.5" cy="8" r="1"/><circle cx="16.5" cy="8" r="1"/><circle cx="8.7" cy="4.7" r="1"/><circle cx="15.3" cy="4.7" r="1"/><circle cx="8.7" cy="11.3" r="1"/><circle cx="15.3" cy="11.3" r="1"/></g>'
};

const FLAG_NAMES = { PL: 'Polska', DE: 'Niemcy', FR: 'Francja', CZ: 'Czechy', SE: 'Szwecja', CH: 'Szwajcaria', JP: 'Japonia', CN: 'Chiny', IN: 'Indie', TW: 'Tajwan', US: 'USA', EU: 'Unia Europejska' };

/** Kraj wystawiający walutę (do flagi przy kursie). */
const CURRENCY_FLAG = { PLN: 'PL', EUR: 'EU', USD: 'US', CHF: 'CH', SEK: 'SE', CZK: 'CZ', CNY: 'CN', JPY: 'JP', INR: 'IN', TWD: 'TW' };

/** Znak waluty w ikonie. */
const CURRENCY_GLYPH = { PLN: 'zł', EUR: '€', USD: '$', CHF: 'Fr', SEK: 'kr', CZK: 'Kč', CNY: '¥', JPY: '¥', INR: '₹', TWD: 'NT$' };

/** Flaga jako SVG (wysokość h px, proporcje 3:2); `aria-label` z nazwą kraju. */
function flagIcon(country, height = 14) {
    const markup = FLAG_MARKUP[country];
    if (!markup) return '';
    const w = Math.round(height * 1.5);
    return `<svg class="flag-ic" width="${w}" height="${height}" viewBox="0 0 24 16" role="img" aria-label="Flaga: ${FLAG_NAMES[country] || country}" focusable="false"><title>${FLAG_NAMES[country] || country}</title><clipPath id="fc-${country}"><rect width="24" height="16" rx="2"/></clipPath><g clip-path="url(#fc-${country})">${markup}</g><rect width="24" height="16" rx="2" fill="none" stroke="currentColor" stroke-opacity=".35"/></svg>`;
}

/** Ikona waluty: koło z jej znakiem (tekst, dziedziczy kolor). */
function currencyIcon(code, size = 18) {
    const glyph = CURRENCY_GLYPH[code];
    if (!glyph) return '';
    const fs = glyph.length > 2 ? 7 : glyph.length > 1 ? 9 : 12;
    return `<svg class="cur-ic" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="Waluta ${code}" focusable="false"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="12" y="12" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="700" fill="currentColor" font-family="inherit">${glyph}</text></svg>`;
}

/** Flaga + ikona waluty + kod (do tabel i nagłówków). */
function currencyLabel(code) {
    return `${flagIcon(CURRENCY_FLAG[code], 12)} ${currencyIcon(code, 16)} <strong>${code}</strong>`;
}
