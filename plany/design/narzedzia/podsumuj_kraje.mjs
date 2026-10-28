// Podsumowanie krajów w przebiegach 0.16.2 (tests/przebiegi.html, pole `countries`): node podsumuj_kraje.mjs plik1.json [plik2.json ...]
// Wypisuje: dołączone kraje (liczba, kwartał), korelację z GIG (kwartalną), rozmiar zapisu krajów, pochodzenie linii kryzysu, boty, naruszenia.
import fs from 'node:fs';

const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = a => { const s = a.filter(Number.isFinite); return s.length ? s.reduce((x, y) => x + y, 0) / s.length : null; };
const f = (v, d = 2) => v == null ? '—' : v.toFixed(d);

for (const file of process.argv.slice(2)) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const runs = Array.isArray(d) ? d : Object.values(d);
  const withC = runs.filter(r => r.countries);
  const joinedCounts = withC.map(r => r.countries.joined.length);
  const corr = withC.flatMap(r => r.countries.joined.map(j => j.corrGig));
  const corrByCountry = {};
  for (const r of withC) for (const j of r.countries.joined) (corrByCountry[j.id] = corrByCountry[j.id] || []).push(j.corrGig);
  const premium = withC.flatMap(r => r.countries.joined.map(j => j.premium));
  const bytes = withC.map(r => r.countries.bytes);
  const origins = withC.flatMap(r => r.countries.crisisOrigins);
  const foreign = origins.filter(o => o.origin !== 'PL');
  const bots = withC.flatMap(r => r.countries.botsPln);
  const joinQs = withC.flatMap(r => r.countries.joined.map(j => j.q));
  console.log(`\n== ${file} (${runs.length} gier, z polem countries: ${withC.length})`);
  console.log(`Kraje dołączone na końcu: mediana ${med(joinedCounts)}, średnia ${f(mean(joinedCounts))}, rozkład ${[0, 1, 2, 3].map(n => `${n}: ${joinedCounts.filter(x => x === n).length}`).join(', ')}; lotnisko stoi w ${withC.filter(r => r.countries.airport).length} grach`);
  console.log(`Kwartał dołączenia (mediana): ${med(joinQs)}; w grach, gdzie kraje dołączyły samodzielnie: ${withC.filter(r => r.countries.joined.length).length}`);
  console.log(`Korelacja kwartalna z GIG: mediana ${f(med(corr))}, średnia ${f(mean(corr))}; wg kraju: ${Object.entries(corrByCountry).map(([k, v]) => `${k} ${f(med(v))}`).join(', ')}`);
  console.log(`Premia rynku kraju na końcu: średnia ${f(mean(premium), 3)}`);
  console.log(`Zapis krajów (znaki JSON): mediana ${Math.round(med(bytes) || 0)}, maks ${Math.max(...bytes.filter(Number.isFinite), 0)}`);
  console.log(`Linie kryzysu: ${origins.length} (zagraniczne ${foreign.length}), opóźnienia ${JSON.stringify(foreign.map(o => o.delayQ))}`);
  console.log(`Boty zagraniczne (majątek PLN): mediana ${Math.round(med(bots.map(b => b.pln)) || 0)}, pozycji w spółkach: ${f(mean(bots.map(b => b.stakes)), 1)}`);
  console.log(`Naruszenia krajów: ${withC.filter(r => r.countries.problems.length).length}; niezmienniki: ${runs.filter(r => (r.invariants || []).length).length}; błędy presetu: ${runs.filter(r => (r.presetErrors || []).length).length}; błędy JS: ${runs.filter(r => (r.errors || []).length).length}`);
}
