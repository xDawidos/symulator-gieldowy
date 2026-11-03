// 0.17 S7: exploit kontraktów z serii presetu `kontrakty` — node kontrakty_serie.mjs a1.json,a2.json
// Dla każdej strategii: wynik roczny na depozycie i na wartości pozycji (bez dźwigni) względem średniej lokaty; kryterium: ≤ lokata + 6 pp.
import fs from 'node:fs';
const runs = process.argv[2].split(',').flatMap(f => { const d = JSON.parse(fs.readFileSync(f, 'utf8')); return Array.isArray(d) ? d : d.games || d.results || d.runs; }).map(r => r.s017?.kontrakty).filter(Boolean);
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN, pct = v => (v * 100).toFixed(2);
const se = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1) / a.length); };
const rate = mean(runs.map(r => r.rate / Math.max(1, r.q)));
console.log(`n=${runs.length}, lokata średnio ${pct(rate)}%/rok, próg ${pct(rate + 0.06)}%`);
for (const k of ['rev', 'carry']) {
    const g = runs.map(r => r[k]).filter(s => s.closed > 0);
    const tot = f => g.reduce((s, x) => s + f(x), 0);
    const onDep = g.map(s => s.cap ? s.pnl / (s.cap / 4) : NaN).filter(Number.isFinite), onNot = g.map(s => s.not ? s.pnl / (s.not / 4) : NaN).filter(Number.isFinite);
    const dep = tot(s => s.pnl) / (tot(s => s.cap) / 4), not = tot(s => s.pnl) / (tot(s => s.not) / 4);
    console.log(`${k}: gier ${g.length}, pozycji ${tot(s => s.closed)}, wygranych ${pct(tot(s => s.win) / tot(s => s.closed))}%, zamkniętych przymusowo ${tot(s => s.forced)}`);
    console.log(`  na depozycie: ${pct(dep)}%/rok łącznie, ${pct(mean(onDep))}% średnia gier (SE ${pct(se(onDep))}) — ${dep <= rate + 0.06 ? 'OK' : 'POZA'}`);
    console.log(`  na wartości pozycji: ${pct(not)}%/rok łącznie, ${pct(mean(onNot))}% średnia gier (SE ${pct(se(onNot))}) — ${not <= rate + 0.06 ? 'OK' : 'POZA'}`);
}
