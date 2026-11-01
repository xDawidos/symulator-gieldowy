// Kryterium kalibracji 0.17 (S2, S4, S6): node porownaj_marze.mjs baza=a1.json,a2.json nowa=b1.json,b2.json
// Średnia odchyłek marż sektorów (nowa − baza, sektory obecne w obu ramionach) ma być 0 ± 0,3 pp;
// earningsIndexCagr i marża końcowa: różnica ramion względem błędu różnicy (|Δ| < 1,96·SE).
// Do średniej wchodzą sektory z ≥ 10 grami w obu ramionach i SE różnicy ≤ 2 pp (bez Bankowości: marża banku nie pochodzi z modelu wyników).
import { load, summarize } from './baza_serie.mjs';
const arms = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')).map(([k, v]) => [k, summarize(load(v.split(',')))]));
const [A, B] = Object.values(arms), [nA, nB] = Object.keys(arms);
const pp = v => v == null ? '—' : (v * 100).toFixed(2);
const diff = k => { const a = A[k], b = B[k], d = b.mean - a.mean, se = Math.sqrt(a.se ** 2 + b.se ** 2); return { d, se, ok: Math.abs(d) < 1.96 * se }; };
console.log(`${nA}: n=${A.n} (przerwane ${A.failed.length}), ${nB}: n=${B.n} (przerwane ${B.failed.length})`);
const seOf = k => Math.sqrt(A.secMargin[k].se ** 2 + B.secMargin[k].se ** 2);
const all = Object.keys(A.secMargin).filter(k => B.secMargin[k] && A.secMargin[k].n >= 10 && B.secMargin[k].n >= 10).sort();
const rows = all.filter(k => k !== 'Bankowość' && seOf(k) <= 0.02);
console.log(`pominięte (szum): ${all.filter(k => !rows.includes(k)).map(k => `${k} SE ${pp(seOf(k))}`).join(', ') || '—'}`);
let sum = 0;
for (const k of rows) { const a = A.secMargin[k], b = B.secMargin[k], d = b.mean - a.mean; sum += d; console.log(`${k.padEnd(24)} ${pp(a.mean)} → ${pp(b.mean)}  Δ ${pp(d)} pp (SE ${pp(Math.sqrt(a.se ** 2 + b.se ** 2))})`); }
const avg = sum / rows.length, avgSe = Math.sqrt(rows.reduce((t, k) => t + seOf(k) ** 2, 0)) / rows.length;
const hit = rows.filter(k => ['Chemia', 'Przemysł', 'Motoryzacja', 'Energia', 'Transport i logistyka', 'Żywność', 'Budowlany', 'Obronność'].includes(k));
console.log(`sektory z wsadem (${hit.length}): średnia ${pp(hit.reduce((t, k) => t + B.secMargin[k].mean - A.secMargin[k].mean, 0) / hit.length)} pp`);
console.log(`średnia odchyłek marż sektorów (${rows.length}): ${pp(avg)} pp (SE ${pp(avgSe)}) — ${Math.abs(avg) <= 0.003 ? 'OK' : 'POZA'} (0 ± 0,3 pp)`);
for (const [k, label] of [['earnIdx', 'earningsIndexCagr'], ['margin', 'marża końcowa'], ['gig', 'GIG']]) {
    const r = diff(k);
    console.log(`${label}: ${pp(A[k].mean)}% → ${pp(B[k].mean)}%  Δ ${pp(r.d)} pp (SE ${pp(r.se)}) — ${r.ok ? 'w widełkach' : 'POZA'}`);
}
console.log(`zapis: ${A.save.mean?.toFixed(0)} → ${B.save.mean?.toFixed(0)} znaków (${((B.save.mean / A.save.mean - 1) * 100).toFixed(1)}%), ms/kw. ${A.msq.mean?.toFixed(0)} → ${B.msq.mean?.toFixed(0)}; niezm. ${A.inv}/${B.inv}, ujemna got. ${A.neg}/${B.neg}, JS ${A.err}/${B.err}, invAfterLoad ${A.invAfterLoad}/${B.invAfterLoad}`);
