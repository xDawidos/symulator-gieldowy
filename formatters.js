// =================================================================================
// 0.18.6 O3: JEDNO FORMATOWANIE — czysty moduł bez DOM, ładowany pierwszy (index.html, testy).
// Zasady (design/04_teksty.md, makieta 18): polskie separatory („14 040,25 PLN”), minus typograficzny, „—” dla NaN;
// waluta zawsze z getBaseCurrency() (currency.js, czytana przy wywołaniu); udział funduszu (NAV) 4 miejsca, kwoty 2,
// liczby akcji 0, procenty 2, punkty procentowe 1.
// =================================================================================
const MINUS_SIGN = '\u2212';

const NUMBER_FORMATS_PL = {}; // cache Intl.NumberFormat — toLocaleString z opcjami tworzy formatter przy każdym wywołaniu
function formatNumberPl(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const format = NUMBER_FORMATS_PL[digits] || (NUMBER_FORMATS_PL[digits] = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
    const text = format.format(Math.abs(number));
    return (number < 0 && /[1-9]/.test(text) ? MINUS_SIGN : '') + text;
}

/** Kwota w PLN (nazwa formatZl zostaje — używana w całej grze). */
function formatZl(value, digits = 2) { // 0.16.11 K2: wartość w jednostkach gry → waluta bazowa konta (PL: PLN, bez zmian)
    const text = formatNumberPl(Number(value) / getBaseScale(), digits);
    return text === '—' ? text : `${text} ${getBaseCurrency()}`;
}

/** Krótka kwota: 3,5 mln PLN / 1,2 mld PLN; poniżej miliona pełna kwota bez groszy. */
function formatPLNShort(value) {
    const number = Number(value) / getBaseScale(), code = getBaseCurrency();
    if (!Number.isFinite(number)) return '—';
    const abs = Math.abs(number);
    if (abs >= 1e9) return `${formatNumberPl(number / 1e9, 1)} mld ${code}`;
    if (abs >= 1e6) return `${formatNumberPl(number / 1e6, 1)} mln ${code}`;
    return formatZl(number * getBaseScale(), 0);
}

/** Zmiana procentowa ze znakiem: +2,10% / −7,20% / 0,00% (value jako ułamek). */
function formatPct(value, digits = 2) {
    const number = Number(value) * 100;
    if (!Number.isFinite(number)) return '—';
    const text = formatNumberPl(number, digits);
    return `${number > 0 && /[1-9]/.test(text) ? '+' : ''}${text}%`;
}

/** NAV / udział: 4 miejsca po przecinku. */
function formatNav(value) { return formatZl(value, 4); }

/** Liczba całkowita (np. liczba akcji, klientów): „1 250”. */
function formatInt(value) { return formatNumberPl(Math.round(Number(value)), 0); }

/** Liczba akcji z odmianą: „1 akcja”, „3 akcje”, „1 250 akcji”. */
function formatShares(value) {
    const n = Math.round(Math.abs(Number(value)));
    if (!Number.isFinite(n)) return '—';
    const word = n === 1 ? 'akcja' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'akcje' : 'akcji';
    return `${formatInt(value)} ${word}`;
}

/** Punkty procentowe ze znakiem (wartość już w pp): „+1,3 pp”, „−0,4 pp”. */
function formatPp(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const text = formatNumberPl(number, digits);
    return `${number > 0 && /[1-9]/.test(text) ? '+' : ''}${text} pp`;
}

/** Data gry w kalendarzu: „Rok 3 · kw. 2 · tydz. 4” (krótko „R3 · K2 · T4”). */
function formatGameDate(cal = getGameCalendar(), short = false) {
    return short ? `R${cal.year} · K${cal.quarter} · T${cal.week}` : `Rok ${cal.year} · kw. ${cal.quarter} · tydz. ${cal.week}`;
}

/** Termin kwartalny (numer bezwzględny) w tym samym formacie: „Rok 3 · kw. 2”. */
function formatQuarterDate(absQuarter) {
    return `Rok ${Math.floor(absQuarter / 4) + 1} · kw. ${(absQuarter % 4) + 1}`;
}

/** Długa data do raportów i CV: „rok 3, 2. kwartał, tydzień 4”. */
function formatDateLong(cal = getGameCalendar()) {
    return `rok ${cal.year}, ${cal.quarter}. kwartał, tydzień ${cal.week}`;
}
