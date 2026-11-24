// Kolejka serii: node kolejka_przebiegow.mjs <plik.json z zadaniami> [równolegle=5]
// Zadanie: { "label": "t1_b27_1", "preset": "bierny", "runs": 17, "quarters": 27, "noui": true }
// Uruchamia run_przebiegi.mjs w katalogu bieżącym, najwyżej N naraz, każde na własnych portach. Postęp i wynik na stdout.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [file, parallel = '5'] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(file, 'utf8'));
const max = Number(parallel) || 5;
const runner = path.join('plany', 'design', 'narzedzia', 'run_przebiegi.mjs');
let next = 0, running = 0, done = 0, port = 0;

function start() {
    while (running < max && next < jobs.length) {
        const job = jobs[next++], n = ++port;
        const out = path.join('plany', 'raporty', `${job.label}.json`);
        if (fs.existsSync(out)) { console.log(`pominięte (jest wynik): ${job.label}`); done++; continue; }
        const args = [runner, `--preset=${job.preset || 'none'}`, `--runs=${job.runs}`, `--quarters=${job.quarters}`, '--speed=200', `--label=${job.label}`];
        if (job.noui) args.push('--noui');
        if (job.patch) args.push(`--patch=${job.patch}`);
        const env = { ...process.env, SIM_PORT: String(9400 + n), SIM_CDP: String(9900 + n) };
        const child = spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
        running++;
        const t0 = Date.now();
        console.log(`${new Date().toLocaleTimeString('pl-PL')} start ${job.label} (${job.preset}, ${job.runs} × ${job.quarters} kw.)`);
        child.stdout.on('data', () => {});
        child.stderr.on('data', () => {});
        child.on('exit', code => {
            running--; done++;
            const ok = fs.existsSync(out);
            console.log(`${new Date().toLocaleTimeString('pl-PL')} ${ok ? 'koniec' : 'BŁĄD (brak wyniku, kod ' + code + ')'} ${job.label} po ${Math.round((Date.now() - t0) / 1000)} s · ${done}/${jobs.length}`);
            start();
            if (done === jobs.length) console.log('WSZYSTKO GOTOWE');
        });
    }
}
start();
