// Analiza serii 0.17.2: bilans mocy, cena, blackouty, zanieczyszczenie, poziom życia, partie, nowe spółki.
// node plany/design/narzedzia/energia_serie.mjs <plik.json lub katalog> [prefiks]
import fs from 'node:fs';
import path from 'node:path';

const [target, prefix = ''] = process.argv.slice(2);
const files = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target).filter(name => name.endsWith('.json') && name.startsWith(prefix)).map(name => path.join(target, name))
    : [target];
const runs = files.flatMap(file => { const data = JSON.parse(fs.readFileSync(file, 'utf8')); return data.runs || data.results || (Array.isArray(data) ? data : [data]); });
const series = runs.map(run => run.s017?.pow).filter(list => list?.length);
const mean = list => list.length ? list.reduce((a, b) => a + b, 0) / list.length : NaN;
const f = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : '-';
const at = (key, q) => mean(series.map(list => list[Math.min(q, list.length - 1)]?.[key]).filter(Number.isFinite));
const last = (key) => series.map(list => list.at(-1)?.[key]).filter(value => value !== undefined);

console.log(`gier: ${series.length}, kwartałów: ${mean(series.map(list => list.length))}`);
console.log('kw   pop(mln) ceny  Energia  odbiorcy  budynki' + (series[0]?.[0]?.cap ? '  moc   zużycie rezerwa cena  P    życie opinia bloki' : ''));
for (const q of [0, 4, 8, 12, 16, 20, 24, 26]) {
    const base = `${String(q).padEnd(4)} ${f(at('pop', q) / 1e6, 1).padEnd(8)} ${f(at('pl', q)).padEnd(5)} ${f(at('en', q) / at('en', 0)).padEnd(8)} ${f(at('use', q) / at('use', 0)).padEnd(9)} ${f(at('bld', q), 1).padEnd(7)}`;
    console.log(base + (series[0]?.[0]?.cap ? ` ${f(at('cap', q), 0).padEnd(6)} ${f(at('dem', q), 0).padEnd(7)} ${f(at('cap', q) / at('dem', q)).padEnd(7)} ${f(at('pr', q)).padEnd(5)} ${f(at('P', q), 1).padEnd(4)} ${f(at('L', q), 1).padEnd(5)} ${f(at('Op', q), 1).padEnd(6)} ${f(at('blk', q), 1)}` : ''));
}
if (series[0]?.[0]?.cap) {
    const reserveLow = series.map(list => Math.min(...list.map(x => x.cap / x.dem)));
    console.log('najniższa rezerwa: średnia', f(mean(reserveLow)), 'min', f(Math.min(...reserveLow)));
    console.log('blackouty na grę', f(mean(last('b'))), 'gry z blackoutem', last('b').filter(Boolean).length, '/', series.length);
    console.log('spółki miejskie na grę', f(mean(last('mun'))), 'projekty państwa', f(mean(last('prj'))), 'poziom UEiE', f(mean(last('lvl'))));
    console.log('Zieloni', last('greens').filter(Boolean).length, '/', series.length, 'Narodowy Atom', last('atom').filter(Boolean).length, 'ESG', f(mean(last('esg').map(Number))), 'kary', f(mean(last('fines').map(Number))));
    const rule = {}; for (const id of last('rule')) rule[id] = (rule[id] || 0) + 1;
    console.log('rządzący na koniec', JSON.stringify(rule));
    const events = {}; for (const ev of last('ev')) for (const [id, n] of Object.entries(ev || {})) events[id] = (events[id] || 0) + n / series.length;
    console.log('zdarzenia na grę', JSON.stringify(Object.fromEntries(Object.entries(events).map(([k, v]) => [k, +v.toFixed(2)]))));
    const L = last('L').filter(Number.isFinite).sort((a, b) => a - b);
    console.log('poziom życia na koniec: p10', f(L[Math.floor(L.length * 0.1)]), 'mediana', f(L[Math.floor(L.length / 2)]), 'p90', f(L[Math.floor(L.length * 0.9)]));
    const mix = [0, 1, 2, 3].map(i => mean(series.map(list => list.at(-1).mix[i] / list.at(-1).cap)));
    console.log('miks na koniec (węgiel, gaz, atom, OZE)', mix.map(v => f(v * 100, 1) + '%').join(', '));
    const laws = [0, 1, 2].map(i => { const c = {}; for (const law of last('law')) c[law[i]] = (c[law[i]] || 0) + 1; return JSON.stringify(c); });
    console.log('ustawy na koniec (polityka, dostawcy, klimat)', laws.join(' '));
}
