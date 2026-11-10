// 0.17.1: miary dużej serii i presetów z jednego pliku albo listy plików.
// node t171_miary.mjs etykieta=plik1.json,plik2.json ...
import fs from 'node:fs';
const mean = a => (a = a.filter(Number.isFinite)).length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const q = (a, p) => { a = a.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN; };
const f = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : '-';
for (const arg of process.argv.slice(2)) {
    const [label, files] = arg.split('=');
    const runs = files.split(',').flatMap(p => Object.values(JSON.parse(fs.readFileSync(p, 'utf8'))));
    const years = runs.map(r => r.h0?.years).filter(Number.isFinite);
    const y = mean(years) || 6.5;
    const out = [];
    // kryzysy: linie i krachy na 20 lat
    const lines = runs.map(r => (r.crises?.history || []).length), crashes = runs.map(r => (r.halts?.crashes ?? r.mood?.crashes ?? 0));
    out.push(`linie kryzysu na grę ${f(mean(lines), 2)} (na 20 lat ${f(mean(lines) * 20 / y, 2)})`);
    // premia rynku: średnia premia reżimu rynku w grze
    const prem = runs.map(r => r.mood?.avgPremium); // premia nastroju rynku (reżim), jak w kontrolach 0.15.x
    if (prem.some(Number.isFinite)) out.push(`premia rynku śr. ${f(mean(prem) * 100, 1)}% (gry poza −3…+3%: ${prem.filter(v => Math.abs(v) > 0.03).length}/${prem.filter(Number.isFinite).length})`);
    // spółki krajowe
    const dom = runs.map(r => r.p0156?.domMax), last = runs.map(r => r.p0156?.last?.domestic);
    const over125 = runs.map(r => (r.p0156?.counts || []).filter(c => (c.domestic || 0) > 125).length);
    out.push(`spółki krajowe: koniec śr. ${f(mean(last), 0)}, maks. ${Math.max(...dom.filter(Number.isFinite))}, gier z >115: ${dom.filter(v => v > 115).length}/${runs.length}, punktów >125: ${over125.reduce((a, b) => a + b, 0)}`);
    // HHI i debiuty
    out.push(`HHI mediana ${f(mean(runs.map(r => r.p0156?.hhi?.median)), 3)}, startupy udane ${f(mean(runs.map(r => r.p0156?.startups?.ok)), 1)}, nieudane ${f(mean(runs.map(r => r.p0156?.startups?.fail)), 1)}`);
    // fundusz = GIG: udziały i zaufanie
    const fund = runs.map(r => r.fund).filter(x => Array.isArray(x) && x.length > 1);
    if (fund.length) {
        const unitsYear = fund.map(x => (Math.pow(x.at(-1).units / x[0].units, 1 / y) - 1) * 100);
        const trust = fund.map(x => x.at(-1).trust);
        out.push(`fundusz: udziały ${f(mean(unitsYear), 1)}%/rok (w ±3%: ${unitsYear.filter(v => Math.abs(v) <= 3).length}/${unitsYear.filter(Number.isFinite).length}), zaufanie mediana ${f(q(trust, 0.5), 0)} (45–55: ${trust.filter(v => v >= 45 && v <= 55).length}/${trust.filter(Number.isFinite).length})`);
    }
    // wybory
    let re = 0, n = 0; const win = {};
    for (const r of runs) { const e = r.elections || []; for (let i = 0; i < e.length; i++) { win[e[i].winner] = (win[e[i].winner] || 0) + 1; if (i) { n++; if (e[i].winner === e[i - 1].winner) re++; } } }
    out.push(`wybory: wygrane ${JSON.stringify(win)}, reelekcja ${f(re / Math.max(1, n) * 100, 0)}% z ${n}`);
    // energia i środowisko
    const pow = runs.map(r => r.s017?.pow?.at(-1)).filter(x => x?.cap);
    if (pow.length) {
        out.push(`prąd: rezerwa koniec ${f(mean(pow.map(x => x.cap / x.dem)), 3)}, blackouty na grę ${f(mean(pow.map(x => x.b)), 2)}, bloki ${f(mean(pow.map(x => x.blk)), 1)}, Narodowy Atom ${pow.filter(x => x.atom).length}/${pow.length}, miejskie ${f(mean(pow.map(x => x.mun)), 2)}`);
        out.push(`środowisko: P koniec śr. ${f(mean(pow.map(x => x.P)), 1)} (maks. ${f(Math.max(...pow.map(x => x.P)), 1)}), życie p10/med/p90 ${f(q(pow.map(x => x.L), 0.1), 1)}/${f(q(pow.map(x => x.L), 0.5), 1)}/${f(q(pow.map(x => x.L), 0.9), 1)}, UEiE ${f(mean(pow.map(x => x.lvl)), 2)}, ESG ${f(mean(pow.map(x => x.esg || 0)), 2)}, Zieloni ${pow.filter(x => x.greens).length}/${pow.length}`);
        const ev = {}; for (const x of pow) for (const [k, v] of Object.entries(x.ev || {})) ev[k] = (ev[k] || 0) + v / pow.length;
        out.push(`zdarzenia środowiska na grę ${JSON.stringify(Object.fromEntries(Object.entries(ev).map(([k, v]) => [k, +v.toFixed(2)])))}`);
    }
    // Tied i obietnice
    const t = runs.map(r => r.s017?.tied171).filter(Boolean);
    if (t.length) out.push(`Tied: relacje med ${f(mean(t.map(x => x.rel.med)), 1)} (p10 ${f(mean(t.map(x => x.rel.p10)), 1)}, p90 ${f(mean(t.map(x => x.rel.p90)), 1)}), posty ${f(mean(t.map(x => x.posts)), 0)}, obietnice: oferty ${f(mean(t.map(x => x.prom.offers)), 1)}, przyjęte ${f(mean(t.map(x => x.prom.accepted)), 1)}, spełnione ${f(mean(t.map(x => x.prom.fulfilled)), 1)}, kary KNF ${f(mean(t.map(x => x.prom.knf)), 2)}`);
    // presety T2
    const p = runs.map(r => r.s017?.t171).filter(Boolean);
    if (p.length) out.push(`preset: ${JSON.stringify(p.slice(0, 1)).slice(0, 300)} …`);
    out.push(`błędy: niezmienniki ${runs.reduce((a, r) => a + (r.invariants?.length || 0), 0)}, ujemna gotówka ${runs.reduce((a, r) => a + (r.negCash?.length || 0), 0)}, JS ${runs.reduce((a, r) => a + (r.errorCount || 0), 0)}, preset ${runs.reduce((a, r) => a + (r.presetErrors?.length || 0), 0)}, pieniądze ${runs.reduce((a, r) => a + (r.moneyWarn?.length || 0), 0)}`);
    console.log(`== ${label} (n=${runs.length}, ${f(y, 1)} lat)\n  ` + out.join('\n  '));
}
