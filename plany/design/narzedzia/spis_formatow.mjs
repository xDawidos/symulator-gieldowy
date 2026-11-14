// 0.18.6 O0: spis formatowania liczb poza helperami (toFixed, toLocaleString, stałe „zł”) z klasyfikacją:
//   tekst  — wynik trafia do tekstu dla gracza (wstawka ${…} w szablonie, sklejenie z napisem, textContent/innerHTML),
//   log    — console.*, logi diagnostyczne,
//   obliczenie — zaokrąglenie liczby (Number(x.toFixed(n)), +x.toFixed, parseFloat(…toFixed), porównania, klucze).
// Użycie: node plany/design/narzedzia/spis_formatow.mjs            → tabela per plik + lista (markdown na stdout)
//         node plany/design/narzedzia/spis_formatow.mjs --kontrola → kod wyjścia 1, gdy w tekstach są toFixed albo „zł” (O3)
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SKIP = new Set(['formatters.js', 'debug.js']); // helpery i narzędzia deweloperskie
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !SKIP.has(f)).sort();

export function classify(line) {
    const t = line.trim();
    if (/^\/\//.test(t) || /^\/?\*/.test(t)) return 'komentarz';
    if (/console\.(log|warn|error|info|debug)/.test(t)) return 'log';
    // współrzędne SVG i style (toFixed skraca liczbę w atrybucie, gracz jej nie czyta)
    const all = (t.match(/\.toFixed\(/g) || []).length;
    const attr = (t.match(/\b(?:d|points|cx|cy|x|y|x1|y1|x2|y2|r|transform|viewBox|width|height)="[^"]*?\.toFixed\(|(?:width|left|top|height|right|bottom|flex-basis|--[\w-]+):\s*\$\{[^}]*?\.toFixed\(|\b[MLHVC]\$\{[^}]*?\.toFixed\(|(?<=[MLHVC]\$\{[^}]*\}[ ,])\$\{[^}]*?\.toFixed\(/g) || []).length;
    if (all && attr >= all) return 'svg';
    // obliczenie: wynik toFixed wraca do liczby
    if (/(Number|parseFloat|Math\.\w+)\(\s*[^()]*\.toFixed\(/.test(t) || /\+\s*\(?[\w.\[\]]+\.toFixed\(/.test(t) || /\.toFixed\(\d\)\s*\)?\s*(===|!==|==|<=|>=|<|>)/.test(t)) return 'obliczenie';
    // tekst: wstawka szablonu, sklejenie z napisem albo przypisanie do DOM
    if (/\$\{[^}]*\.(toFixed|toLocaleString)\(/.test(t) || /(textContent|innerHTML|innerText|title|label|text|body|subject)\s*[:=]/.test(t) || /['"`]\s*\+\s*[^;]*\.(toFixed|toLocaleString)\(|\.(toFixed|toLocaleString)\([^)]*\)\s*\+\s*['"`]/.test(t)) return 'tekst';
    return 'obliczenie?';
}

/** „zł”: komentarz, log, dane (wyrażenie regularne podmiany waluty, słownik symboli) albo tekst dla gracza. */
function zlKind(line) {
    const c = classify(line);
    if (c === 'komentarz' || c === 'log') return c;
    if (/\/[^/\n]*zł[^/\n]*\/[gimsuy]*/.test(line) && /(RX|\.test\(|match\(|replace\()/.test(line) || /CURRENCY_GLYPH/.test(line)) return 'dane';
    return 'tekst';
}
const rows = [];
for (const f of files) {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/);
    lines.forEach((raw, i) => {
        const line = raw.replace(/(^|[^:\\])\/\/.*$/, '$1'); // bez komentarza na końcu linii
        if (!line.trim()) return;
        const kinds = [];
        if (/\.toFixed\(/.test(line)) kinds.push('toFixed');
        if (/\.toLocaleString\(/.test(line)) kinds.push('toLocaleString');
        if (/(^|[^a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ])zł(?![a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ])/.test(line) && !/^\s*\/\//.test(line)) kinds.push('zł');
        for (const k of kinds) rows.push({ f, n: i + 1, k, c: k === 'zł' ? zlKind(line) : classify(line), src: raw.trim().slice(0, 140) });
    });
}
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').split(/\r?\n/);
html.forEach((line, i) => { if (/(^|[^a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ])zł(?![a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ])/.test(line) && !/<!--/.test(line)) rows.push({ f: 'index.html', n: i + 1, k: 'zł', c: 'tekst', src: line.trim().slice(0, 140) }); });

if (process.argv.includes('--kontrola')) {
    const bad = rows.filter(r => r.c === 'tekst' && (r.k === 'toFixed' || r.k === 'zł'));
    console.log(`tekst: toFixed ${bad.filter(r => r.k === 'toFixed').length}, „zł” ${bad.filter(r => r.k === 'zł').length}`);
    for (const r of bad.slice(0, 40)) console.log(`${r.f}:${r.n} ${r.k} ${r.src}`);
    process.exit(bad.length ? 1 : 0);
}
const by = {};
for (const r of rows) { const o = by[r.f] || (by[r.f] = {}); const key = `${r.k}/${r.c}`; o[key] = (o[key] || 0) + 1; }
const cols = ['toFixed/tekst', 'toFixed/svg', 'toFixed/obliczenie', 'toFixed/obliczenie?', 'toFixed/log', 'toLocaleString/tekst', 'toLocaleString/obliczenie?', 'zł/tekst', 'zł/dane'];
console.log(`| Plik | ${cols.join(' | ')} |\n|---|${cols.map(() => '---').join('|')}|`);
for (const [f, o] of Object.entries(by).sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0))) console.log(`| ${f} | ${cols.map(c => o[c] || 0).join(' | ')} |`);
const tot = c => rows.filter(r => `${r.k}/${r.c}` === c).length;
console.log(`| **razem** | ${cols.map(c => `**${tot(c)}**`).join(' | ')} |`);
if (process.argv.includes('--lista')) for (const r of rows) console.log(`${r.f}:${r.n}\t${r.k}\t${r.c}\t${r.src}`);
