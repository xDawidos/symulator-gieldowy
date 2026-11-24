// 0.17 S5: infrastruktura z serii — node infra_serie.mjs a1.json,a2.json
// Ukończone projekty na grę wg typu, odcinki i firmy na autostradę, zerwane budowy, sloty Budowlanego zajęte przez infrastrukturę,
// deficyt budżetu (kwartały z ujemnym saldem, saldo / wpływy), poziomy ustawy w czasie, przepustowość na koniec.
import { load } from './baza_serie.mjs';
const games = load(process.argv[2].split(',')).filter(g => g.inf?.q?.length);
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const n = games.length, f2 = v => Number.isFinite(v) ? v.toFixed(2) : '—';
console.log(`n=${n}`);
const types = ['port', 'airport', 'rail', 'highway'];
console.log('ukończone na grę: ' + types.map(t => `${t} ${f2(mean(games.map(g => g.inf.stats?.done?.[t] || 0)))}`).join(', ') + `; ogłoszone ${f2(mean(games.map(g => g.inf.stats?.announced || 0)))}, zerwane budowy ${f2(mean(games.map(g => g.inf.stats?.cancels || 0)))}`);
const hw = games.flatMap(g => (g.inf.projects || []).filter(p => p.type === 'highway'));
console.log(`autostrady: ${hw.length} (${f2(hw.length / n)}/grę), odcinków średnio ${f2(mean(hw.map(p => p.segs)))}, ukończonych odcinków ${f2(mean(hw.map(p => p.done)))}, firm na autostradę ${f2(mean(hw.filter(p => p.firms).map(p => p.firms)))}`);
const busy = games.map(g => mean(g.inf.q.map(x => x.slots ? x.infraBusy / x.slots : 0))), busyAll = games.map(g => mean(g.inf.q.map(x => x.slots ? x.busy / x.slots : 0)));
console.log(`sloty Budowlanego zajęte przez infrastrukturę: ${f2(mean(busy) * 100)}% (wszystkie budowy ${f2(mean(busyAll) * 100)}%)`);
const defQ = games.map(g => g.inf.q.filter(x => x.bal < 0).length / g.inf.q.length), balRev = games.map(g => mean(g.inf.q.filter(x => x.rev > 0).map(x => x.bal / x.rev)));
console.log(`deficyt: ${f2(mean(defQ) * 100)}% kwartałów, saldo / wpływy średnio ${f2(mean(balRev) * 100)}%, infrastruktura / wpływy ${f2(mean(games.map(g => mean(g.inf.q.filter(x => x.rev > 0).map(x => x.infSp / x.rev)))) * 100)}%`);
const lv = {}; for (const g of games) for (const x of g.inf.q) lv[x.law] = (lv[x.law] || 0) + 1;
const tot = Object.values(lv).reduce((s, v) => s + v, 0);
console.log('poziom ustawy (udział kwartałów): ' + Object.keys(lv).sort().map(k => `${k}: ${f2(lv[k] / tot * 100)}%`).join(', ') + `; na koniec średnio ${f2(mean(games.map(g => g.inf.q.at(-1).law)))}`);
for (const m of ['sea', 'air', 'land']) { const v = games.map(g => g.inf.cap?.[m]).filter(Number.isFinite); console.log(`przepustowość ${m} na koniec: mediana ${f2(q(v, 0.5))}, p10 ${f2(q(v, 0.1))}, p90 ${f2(q(v, 0.9))}`); }
// decyzja 24: lotnisko S5, kraje i połączenia giełd; przyczyny zerwanych budów
const fq = games.map(g => g.inf.stats?.firstQ?.airport).filter(Number.isFinite);
console.log(`pierwsze lotnisko: w ${fq.length}/${n} gier, kwartał średnio ${f2(mean(fq))} (mediana ${q(fq, 0.5) ?? '—'}); otwarte kraje na grę ${f2(mean(games.map(g => g.joinedN || 0)))}; połączenia giełd na grę ${f2(mean(games.map(g => (g.linkMerged || 0) + (g.linkIntl || 0))))} (przejęcia ${f2(mean(games.map(g => g.linkTaken || 0)))})`);
const why = {}; for (const g of games) for (const [k, v] of Object.entries(g.inf.stats?.cancelWhy || {})) why[k] = (why[k] || 0) + v;
console.log('zerwane budowy — przyczyny: ' + (Object.entries(why).map(([k, v]) => `${k} ${v}`).join('; ') || '—'));
