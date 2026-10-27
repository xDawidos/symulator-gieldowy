import fs from 'node:fs';
import path from 'node:path';

export function analyzeBatch(jsonPath) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const valid = data.filter(d => d.h0 && d.h0.gigCagr !== null);
  const n = valid.length;
  if (!n) return null;

  const stats = (fn) => {
    const vals = valid.map(fn).filter(v => Number.isFinite(v));
    if (!vals.length) return { mean: 0, std: 0, err: 0 };
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, vals.length - 1);
    const std = Math.sqrt(variance);
    const err = std / Math.sqrt(vals.length);
    return { mean, std, err, count: vals.length };
  };

  const gig = stats(d => d.h0.gigCagr);
  const cap10 = stats(d => d.h0.cap10Cagr);
  const buyHold = stats(d => d.h0.buyHoldCagr);
  const survivors = stats(d => d.h0.survivorsCagr);
  const epsP10 = stats(d => d.h0.epsGrowthP10);
  const epsP50 = stats(d => d.h0.epsGrowthP50);
  const epsP90 = stats(d => d.h0.epsGrowthP90);
  const peStart = stats(d => d.h0.peMedianStart);
  const peEnd = stats(d => d.h0.peMedianEnd);
  const peCagr = stats(d => d.h0.peCagr);
  const marginMedStart = stats(d => d.h0.marginMedStart);
  const marginMedEnd = stats(d => d.h0.marginMedEnd);
  const marginWtdStart = stats(d => d.h0.marginWtdStart);
  const marginWtdEnd = stats(d => d.h0.marginWtdEnd);

  // Trust breakdown
  const trust = stats(d => d.h0.trustBreakdown?.trust);
  const unitsChange = stats(d => d.h0.trustBreakdown?.unitsChange);

  // CEO wallet
  const ceoGoals = stats(d => {
    if (!d.wallet?.byPos?.ceo) return null;
    const ceo = d.wallet.byPos.ceo;
    const corpGoal = (ceo['corporate-goal'] || 0) + (ceo['corp-goal'] || 0);
    const total = Object.values(ceo).reduce((a, b) => a + b, 0);
    return total > 0 ? corpGoal / total : 0;
  });

  return {
    runs: n,
    years: valid[0].h0.years,
    gig,
    cap10,
    buyHold,
    survivors,
    epsP10,
    epsP50,
    epsP90,
    peStart,
    peEnd,
    peCagr,
    marginMedStart,
    marginMedEnd,
    marginWtdStart,
    marginWtdEnd,
    trust,
    unitsChange,
    ceoGoals
  };
}

if (process.argv[1] && process.argv[1].endsWith('analyze_h0.mjs')) {
  const p = process.argv[2];
  if (!p) {
    console.log('Usage: node analyze_h0.mjs <path-to-json>');
    process.exit(1);
  }
  const res = analyzeBatch(p);
  console.log(JSON.stringify(res, null, 2));
}
