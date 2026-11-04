// =================================================================================
// 0.16.1: IKONY WALUT jako SVG (bez emoji): koło 24×24 ze znakiem waluty, zawsze z kodem obok. Flagi krajów usunięte z gry (2026-11-04).
// =================================================================================

/** Znak waluty w ikonie. */
const CURRENCY_GLYPH = { PLN: 'zł', EUR: '€', USD: '$', CHF: 'Fr', SEK: 'kr', CZK: 'Kč', CNY: '¥', JPY: '¥', INR: '₹', TWD: 'NT$' };

/** Ikona waluty: koło z jej znakiem (tekst, dziedziczy kolor). */
function currencyIcon(code, size = 18) {
    const glyph = CURRENCY_GLYPH[code];
    if (!glyph) return '';
    const fs = glyph.length > 2 ? 7 : glyph.length > 1 ? 9 : 12;
    return `<svg class="cur-ic" width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="Waluta ${code}" focusable="false"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="12" y="12" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="700" fill="currentColor" font-family="inherit">${glyph}</text></svg>`;
}

/** Ikona waluty + kod (do tabel i nagłówków). */
function currencyLabel(code) {
    return `${currencyIcon(code, 16)} <strong>${code}</strong>`;
}
