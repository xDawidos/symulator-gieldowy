// 0.17 S6: zbrojenia i bezpieczeństwo z serii — node obrona_serie.mjs a1.json,a2.json [ref1.json,ref2.json]
// Udział obronny i poziom bezpieczeństwa w czasie, kwartały z podbiciem po embargu, linia budżetu / wpływy, indeks zbrojeń,
// deficyt i CIT z deficytu, przychód krajowej zbrojeniówki (wzrost od 4. kwartału do końca). Drugi argument: seria odniesienia (deficyt, CIT, zbrojeniówka).
import { load } from './baza_serie.mjs';
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const f2 = v => Number.isFinite(v) ? v.toFixed(2) : '—';
const common = (label, games) => {
    const n = games.length;
    const defQ = mean(games.map(g => g.inf.q.filter(x => x.rev > 0 && x.bal < 0).length / Math.max(1, g.inf.q.filter(x => x.rev > 0).length)));
    const balRev = mean(games.map(g => mean(g.inf.q.filter(x => x.rev > 0).map(x => x.bal / x.rev))));
    const cit = games.some(g => g.inf.q.at(-1).cit !== undefined) ? games.filter(g => (g.inf.q.at(-1).cit || 0) > 0).length : '—';
    const grow = games.map(g => { const a = g.inf.q[3]?.defRev, b = g.inf.q.at(-1)?.defRev; return a > 0 && b > 0 ? Math.pow(b / a, 4 / (g.inf.q.length - 4)) - 1 : NaN; }).filter(Number.isFinite);
    console.log(`${label}: n=${n}; deficyt ${f2(defQ * 100)}% kwartałów, saldo / wpływy ${f2(balRev * 100)}%, gier z CIT +2 pp ${cit}/${n}; zbrojeniówka: wzrost przychodu ${f2(mean(grow) * 100)}%/rok (mediana ${f2(q(grow, 0.5) * 100)})`);
};
const games = load(process.argv[2].split(',')).filter(g => g.inf?.q?.some(x => Number.isFinite(x.S)));
const qs = games.flatMap(g => g.inf.q.filter(x => Number.isFinite(x.S)));
const sh = {}; for (const x of qs) { const k = (x.dsh * 100).toFixed(2); sh[k] = (sh[k] || 0) + 1; }
console.log('udział obronny (udział kwartałów): ' + Object.keys(sh).sort((a, b) => a - b).map(k => `${k}%: ${f2(sh[k] / qs.length * 100)}%`).join(', '));
const S = qs.map(x => x.S);
console.log(`bezpieczeństwo S: średnio ${f2(mean(S))}, p10 ${f2(q(S, 0.1))}, mediana ${f2(q(S, 0.5))}, p90 ${f2(q(S, 0.9))}, min ${f2(Math.min(...S))}, max ${f2(Math.max(...S))}`);
console.log(`podbicie po embargu: ${f2(qs.filter(x => x.boost).length / qs.length * 100)}% kwartałów, w ${games.filter(g => g.inf.q.some(x => x.boost)).length}/${games.length} gier`);
console.log(`budżet obronny / wpływy: ${f2(mean(qs.filter(x => x.rev > 0).map(x => x.dsp / x.rev)) * 100)}%; indeks zbrojeń: średnio ${f2(mean(qs.map(x => x.gidx)))}, max ${f2(Math.max(...qs.map(x => x.gidx)))}`);
common('S6', games);
if (process.argv[3]) common('odniesienie', load(process.argv[3].split(',')).filter(g => g.inf?.q?.length));
