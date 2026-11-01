// Agregacja serii bazowych (0.17 S0): node baza_serie.mjs etykieta=plik1.json,plik2.json ... [--out=skrot.json]
// Łączy pliki w jedną serię i liczy na grę oraz w agregacji: średnia, odch., mediana, błąd średniej, przedział 95%.
import fs from 'node:fs';
const T = { 1: 12.7, 2: 4.3, 3: 3.18, 4: 2.78, 5: 2.57, 6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23, 11: 2.2, 12: 2.18, 15: 2.13, 20: 2.09, 30: 2.05, 60: 2.0 };
const tq = df => { const k = Object.keys(T).map(Number).filter(x => x <= df).pop(); return T[k] ?? 1.96; };
const fin = a => a.filter(Number.isFinite);
const mean = a => { a = fin(a); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; };
const sd = a => { a = fin(a); const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)) : null; };
const med = a => { const s = fin(a).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const stat = a => { a = fin(a); const n = a.length, m = mean(a), s = sd(a), se = s == null ? null : s / Math.sqrt(n); return { n, mean: m, sd: s, med: med(a), se, ci: se == null ? null : tq(n - 1) * se }; };
const sum = o => Object.values(o || {}).reduce((x, y) => x + (Number(y) || 0), 0);

export function perGame(r) {
  const q = r.quarters?.at(-1) || {}, f = r.fund?.at(-1) || {}, links = r.countries?.links?.history || [];
  const dist = r.p0156?.dist?.at(-1);
  const kinds = k => links.filter(h => h.kind === k).length;
  return {
    gig: r.h0?.gigCagr, margin: r.h0?.marginWtdEnd,
    fundValue: f.units * f.nav, units: f.units, trust: f.trust,
    capMedian: dist?.cap?.[2], capMax: dist?.cap?.[4], capP75: dist?.cap?.[3],
    domestic: q.domestic, foreign: r.foreign?.listed, total: q.totalCompanies, listedAll: r.p0156?.last?.total,
    bankrupt: sum(r.p0156?.bankrupt) + (r.foreign?.stats?.bankruptcies || 0),
    debuts: r.p0156?.startups?.ok, debutFail: r.p0156?.startups?.fail,
    maResolved: r.ma?.resolved, maStarted: r.ma?.started, foreignTakeovers: r.foreign?.stats?.takeovers, giantTakeover: r.giant?.log?.filter(x => x.kind === 'takeover').length, giantGdr: r.giant?.log?.filter(x => x.kind === 'gdr').length,
    crisisLines: (r.crises?.history || []).length, crisisKinds: (r.crises?.history || []).map(h => h.id || h.kind || '?'), crisisUsed: r.crises?.used || [],
    linkMerged: kinds('merged'), linkIntl: kinds('intl'), linkTaken: kinds('taken'), takenByForeign: Boolean(r.countries?.links?.takenBy),
    startCountries: (r.countries?.joined || []).filter(j => j.q === 0).map(j => j.id), joinedN: (r.countries?.joined || []).length,
    msq: r.msPerQuarter, realMs: r.realMs, save: r.saveSizes?.now, saveGz: r.saveCheck?.gzBytes, saveBuildMs: r.saveCheck?.buildMs,
    inv: (r.invariants || []).length, neg: (r.negCash || []).length, err: (r.errors || []).length, saveOk: r.saveCheck ? (r.saveCheck.lossless !== false && r.saveCheck.loadOk !== false && !(r.saveCheck.error)) : null,
    cp: (r.countries?.problems || []).length + (r.foreign?.problems || []).length + (r.giant?.fxProblems || []).length,
    moneyWarn: r.moneyWarnQuarters || 0, badPrice: (r.badPrice || []).length,
    invAfterLoad: (r.saveCheck?.invAfterLoad || []).length, lzShare: r.saveCheck?.lzShare, // 0.17 S0b
    capPl: r.s017?.capPl, capForeign: r.s017?.capForeign, capAll: r.s017 ? r.s017.capPl + r.s017.capForeign : undefined,
    d3: r.s017?.d3?.n, d3DomAcq: r.s017?.d3?.domAcq, d3DomTgt: r.s017?.d3?.domTgt
  };
}

export function load(files) {
  const games = []; games.failed = [];
  for (const f of files) { const d = JSON.parse(fs.readFileSync(f, 'utf8')); for (const r of (Array.isArray(d) ? d : Object.values(d))) { if (r.error) games.failed.push(String(r.error).split(String.fromCharCode(10))[0]); else games.push(perGame(r)); } }
  return games;
}

export function summarize(g, expected) {
  const num = k => stat(g.map(x => x[k]));
  const cnt = f => g.filter(f).length;
  const sub = f => { const s = g.filter(f); return { n: s.length, gig: stat(s.map(x => x.gig)), margin: stat(s.map(x => x.margin)) }; };
  const kinds = {}; for (const x of g) for (const k of x.crisisKinds) kinds[k] = (kinds[k] || 0) + 1;
  const starts = {}; for (const x of g) for (const k of x.startCountries) starts[k] = (starts[k] || 0) + 1;
  const out = { n: g.length, failed: g.failed || [], expected: expected ?? g.length + (g.failed || []).length };
  for (const k of ['gig', 'margin', 'fundValue', 'capMedian', 'capMax', 'domestic', 'foreign', 'total', 'bankrupt', 'debuts', 'debutFail', 'maResolved', 'foreignTakeovers', 'giantTakeover', 'giantGdr', 'crisisLines', 'linkMerged', 'linkIntl', 'linkTaken', 'joinedN', 'msq', 'save', 'saveGz', 'saveBuildMs', 'trust', 'lzShare', 'capPl', 'capForeign', 'capAll', 'd3'])
    out[k] = num(k);
  out.crisisKinds = kinds; out.startCountries = starts;
  out.withTaken = sub(x => x.takenByForeign); out.withoutTaken = sub(x => !x.takenByForeign);
  out.inv = cnt(x => x.inv); out.neg = cnt(x => x.neg); out.err = cnt(x => x.err); out.cp = cnt(x => x.cp); out.moneyWarn = cnt(x => x.moneyWarn > 0); out.badPrice = cnt(x => x.badPrice); out.saveFail = cnt(x => x.saveOk === false);
  out.invAfterLoad = cnt(x => x.invAfterLoad); out.moneyWarnQ = num('moneyWarn'); // gry z naruszeniem po wczytaniu; kwartały z ostrzeżeniem na grę
  const d3 = g.reduce((a, x) => a + (x.d3 || 0), 0); // udział spółek krajowych w przejęciach D3 (kupiec / cel), z sumy przejęć serii
  out.d3Dom = d3 ? { n: d3, acq: g.reduce((a, x) => a + (x.d3DomAcq || 0), 0) / d3, tgt: g.reduce((a, x) => a + (x.d3DomTgt || 0), 0) / d3 } : null;
  return out;
}

if (process.argv[1].endsWith("baza_serie.mjs")) {
  const outArg = process.argv.find(a => a.startsWith('--out='));
  const res = {};
  for (const a of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
    const [label, files] = a.split('='); const g = load(files.split(',')); res[label] = summarize(g);
  }
  if (outArg) fs.writeFileSync(outArg.slice(6), JSON.stringify(res, null, 1));
  const p = (v, d = 2) => v == null ? '—' : (v * 100).toFixed(d) + '%';
  for (const [l, s] of Object.entries(res)) console.log(`${l}: n=${s.n}${s.failed.length ? ' (przerwane: ' + s.failed.join('; ') + ')' : ''} GIG ${p(s.gig.mean)} ± ${p(s.gig.sd)} (med ${p(s.gig.med)}, SE ${p(s.gig.se)}, CI95 ±${p(s.gig.ci)}) marża ${p(s.margin.mean)} ms/kw ${s.msq.mean?.toFixed(0)} zapis ${s.save.mean?.toFixed(0)} inv ${s.inv} neg ${s.neg} err ${s.err} invAfterLoad ${s.invAfterLoad} moneyWarn ${s.moneyWarn} lz/limit ${p(s.lzShare.mean, 1)} kap. ${s.capAll.mean == null ? '—' : (s.capAll.mean / 1e9).toFixed(1)} mld D3 ${s.d3Dom ? `${s.d3Dom.n} (krajowy kupiec ${p(s.d3Dom.acq, 0)}, cel ${p(s.d3Dom.tgt, 0)})` : '—'}`);
}
