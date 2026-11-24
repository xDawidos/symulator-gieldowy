// 0.17 S4: zapis i fracht z serii — node fracht_serie.mjs a1.json,a2.json
import { load } from './baza_serie.mjs';
const games = load(process.argv[2].split(','));
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const save = games.map(g => g.save).filter(Number.isFinite);
console.log(`n=${games.length} zapis średnio ${mean(save).toFixed(0)}, p90 ${q(save, 0.9)}, maks. ${Math.max(...save)}, > 2,49 mln: ${save.filter(v => v > 2.49e6).length}`);
const fr = games.map(g => g.fr).filter(Boolean);
for (const id of ['sea', 'air', 'land']) { const v = fr.map(f => f[id]); console.log(`${id}: mediana ${q(v, 0.5)}, p10 ${q(v, 0.1)}, p90 ${q(v, 0.9)}`); }
const ev = {}; for (const g of games) for (const [k, n] of Object.entries(g.frEv || {})) ev[k] = (ev[k] || 0) + n;
console.log('zakłócenia na grę:', Object.entries(ev).map(([k, n]) => `${k} ${(n / games.length).toFixed(2)}`).join(', '));
