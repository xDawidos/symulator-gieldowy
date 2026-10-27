// Podsumowanie serii przebiegów (tests/przebiegi.html): node podsumuj_serie.mjs plik1.json [plik2.json ...]
// Wypisuje medianę i rozrzut GIG (CAGR), marży końcowej, zapisu, czasu kroku, ostrzeżeń oraz liczniki błędów.
import fs from 'node:fs';

const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = a => { const s = a.filter(Number.isFinite); return s.length ? s.reduce((x, y) => x + y, 0) / s.length : null; };
const sd = a => { const s = a.filter(Number.isFinite), m = mean(s); return s.length > 1 ? Math.sqrt(s.reduce((x, y) => x + (y - m) ** 2, 0) / (s.length - 1)) : null; };
const pct = (v, d = 1) => v == null ? '—' : (v * 100).toFixed(d) + '%';

for (const file of process.argv.slice(2)) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const runs = Array.isArray(d) ? d : Object.values(d);
  const gig = runs.map(r => r.h0?.gigCagr);
  const margin = runs.map(r => r.h0?.marginWtdEnd);
  const units = runs.map(r => r.h0?.trustBreakdown?.unitsChange);
  const trust = runs.map(r => r.h0?.trustBreakdown?.trust);
  const save = runs.map(r => r.saveSizes?.now);
  const perStock = runs.map(r => r.saveSizes?.perStock);
  const msq = runs.map(r => r.msPerQuarter);
  const count = f => runs.filter(f).length;
  console.log(`\n== ${file} (${runs.length} gier)`);
  console.log(`GIG CAGR: mediana ${pct(med(gig))}, średnia ${pct(mean(gig))} ± ${pct(sd(gig))}`);
  console.log(`Marża końcowa (ważona): mediana ${pct(med(margin))}, średnia ${pct(mean(margin))}`);
  console.log(`Udziały funduszu (zmiana/rok): mediana ${pct(med(units))}, średnia ${pct(mean(units))} ± ${pct(sd(units))}; zakres ${pct(Math.min(...units.filter(Number.isFinite)))}…${pct(Math.max(...units.filter(Number.isFinite)))}; zaufanie mediana ${med(trust)?.toFixed(0)}`);
  console.log(`Zapis (znaki JSON): mediana ${Math.round(med(save) || 0)}; na spółkę ${Math.round(med(perStock) || 0)}; czas kroku (ms/kw.): mediana ${Math.round(med(msq) || 0)}`);
  console.log(`Gry z naruszeniem niezmienników: ${count(r => (r.invariants || []).length)}; z ujemną gotówką: ${count(r => (r.negCash || []).length)}; z błędami JS: ${count(r => (r.errors || []).length)}; z ostrzeżeniami: ${count(r => (r.moneyWarnQuarters || 0) > 0)}; ze złą ceną: ${count(r => (r.badPrice || []).length)}`);
}
