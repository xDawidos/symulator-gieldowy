// Uruchamia wyrażenie JS z pliku (argument 1) na stronie testów po zakończeniu testów i drukuje wynik (JSON).
// Usage: node plany/design/narzedzia/probe.mjs wyrazenie.js   (opcjonalnie SIM_PORT/SIM_CDP); treść pliku to ciało funkcji async (zwraca wynik przez return)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const PORT = Number(process.env.SIM_PORT) || 8771, CDP = Number(process.env.SIM_CDP) || 9271;
const expr = fs.readFileSync(process.argv[2], 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(req.url.split('?')[0])).split('..').join('');
  fs.readFile(path.join(process.cwd(), p === '/' ? 'index.html' : p), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  });
});
server.listen(PORT, async () => {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  spawn(edgePath, ['--headless=new', '--disable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--user-data-dir=' + path.join(process.env.TEMP || '.', 'edge-probe-' + process.pid), '--remote-debugging-port=' + CDP, `http://localhost:${PORT}/tests/tests.html`]);
  const done = code => {
    try { spawnSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*edge-probe-${process.pid}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`]); } catch (e) {}
    server.close(); process.exit(code);
  };
  for (let a = 0; a < 40; a++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const tab = (await (await fetch(`http://localhost:${CDP}/json`)).json()).find(t => t.url?.includes('tests.html'));
      if (!tab?.webSocketDebuggerUrl) continue;
      const ws = new WebSocket(tab.webSocketDebuggerUrl); let id = 0; const pend = {};
      const call = (method, params) => new Promise(res => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
      ws.onmessage = e => { const d = JSON.parse(e.data); if (pend[d.id]) { pend[d.id](d.result); delete pend[d.id]; } };
      await new Promise(r => ws.onopen = r);
      for (let k = 0; k < 120; k++) { const r = await call('Runtime.evaluate', { expression: '!!window.__testSummary', returnByValue: true }); if (r?.result?.value) break; await new Promise(r => setTimeout(r, 500)); }
      const r = await call('Runtime.evaluate', { expression: `(async()=>{try{return JSON.stringify(await (async()=>{${expr}\n})())}catch(e){return 'ERR '+e.stack}})()`, awaitPromise: true, returnByValue: true });
      console.log(r?.result?.value ?? JSON.stringify(r)); ws.close(); done(0); return;
    } catch (e) {}
  }
  console.error('brak strony testów'); done(1);
});
