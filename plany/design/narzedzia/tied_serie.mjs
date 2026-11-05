// 0.17.3 R6: kontrola Tied — node tied_serie.mjs baza=a1.json,a2.json nowa=b1.json,b2.json [czytelnik=c1.json,c2.json]
// Zdarzenia spółek na grę (średnia, błąd, różnica względem bazy), plany i wiceprezesi na koniec, przewaga presetu „czytelnik Tied”.
import fs from 'node:fs';
const read = list => list.split(',').flatMap(f => { const d = JSON.parse(fs.readFileSync(f, 'utf8')); return Array.isArray(d) ? d : d.games || d.results || d.runs; });
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
const se = a => Math.sqrt(a.reduce((s, v) => s + (v - mean(a)) ** 2, 0) / Math.max(1, a.length - 1) / a.length);
const f = v => Number.isFinite(v) ? v.toFixed(2) : '—';
const arms = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')).map(([k, v]) => [k, read(v)]));
const kinds = ['dividend', 'buyback', 'strategy', 'takeover'];
const base = arms.baza, next = arms.nowa;
for (const kind of kinds) {
    const a = base.map(r => r.s017?.ev?.[kind]).filter(Number.isFinite), b = next.map(r => r.s017?.ev?.[kind]).filter(Number.isFinite);
    const d = mean(b) - mean(a), s = Math.sqrt(se(a) ** 2 + se(b) ** 2);
    console.log(`${kind}: ${f(mean(a))} → ${f(mean(b))} na grę, Δ ${f(d)} (SE ${f(s)}), ${f(d / mean(a) * 100)}%`);
}
const stats = next.map(r => r.s017?.tiedStats).filter(Boolean);
console.log(`koniec gry: postów ${f(mean(stats.map(x => x.posts)))}, planów ${f(mean(stats.map(x => x.plans)))}, wiceprezesów ${f(mean(stats.map(x => x.deputies)))} w ${f(mean(stats.map(x => x.withDeputies)))} spółkach`);
if (arms.czytelnik) {
    const rows = arms.czytelnik.map(r => r.s017?.tiedReader).filter(Boolean), all = key => rows.flatMap(r => r[key]);
    const edge = list => mean(list.map(x => x.r - x.m));
    const hint = all('hint'), plain = all('base'), real = hint.filter(x => x.real), fake = hint.filter(x => !x.real);
    console.log(`czytelnik: zapowiedzi ${hint.length} (prawdziwe ${real.length}, ${f(real.length / hint.length * 100)}%), baza ${plain.length}`);
    console.log(`wynik 2 kw. ponad GIG: po zapowiedzi ${f(edge(hint) * 100)} pp (SE ${f(se(hint.map(x => x.r - x.m)) * 100)}), prawdziwe ${f(edge(real) * 100)}, bez pokrycia ${f(edge(fake) * 100)}, losowa spółka ${f(edge(plain) * 100)} pp (SE ${f(se(plain.map(x => x.r - x.m)) * 100)})`);
    console.log(`przewaga nad presetem bazowym: ${f((edge(hint) - edge(plain)) * 100)} pp na 2 kw.`);
}
