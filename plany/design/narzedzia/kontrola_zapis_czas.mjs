// 0.17 S7: zapis i czas kroku z serii — node kontrola_zapis_czas.mjs etykieta=a1.json,a2.json ...
// Na serię: średnia, p90, maksimum zapisu i gry ponad 2,49 mln znaków; ms/kw.; niezmienniki, ujemna gotówka, błędy JS.
import { load } from './baza_serie.mjs';
const q = (a, p) => { a = [...a].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const m = a => a.reduce((s, v) => s + v, 0) / a.length;
for (const arg of process.argv.slice(2)) {
    const [k, f] = arg.split('='), g = load(f.split(','));
    const s = g.map(x => x.save).filter(Number.isFinite), t = g.map(x => x.msq).filter(Number.isFinite), n = key => g.reduce((a, x) => a + (x[key] || 0), 0);
    console.log(`${k}: n=${g.length}, zapis śr. ${Math.round(m(s))}, p90 ${q(s, 0.9)}, max ${Math.max(...s)}, ponad 2,49 mln ${s.filter(v => v > 2490000).length}/${s.length}; ms/kw. śr. ${Math.round(m(t))}, max ${Math.round(Math.max(...t))}; niezm. ${n('inv')}, ujemna got. ${n('neg')}, JS ${n('err')}; GIG ${(m(g.map(x => x.gig).filter(Number.isFinite)) * 100).toFixed(2)}%`);
}
