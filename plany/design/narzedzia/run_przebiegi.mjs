import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Usage: node run_przebiegi.mjs --preset=none --runs=20 --quarters=27 --speed=200 --label=sim_base
const args = {};
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=');
    args[k] = v === undefined ? true : v;
  }
}

const preset = args.preset && args.preset !== 'none' ? args.preset : '';
const runs = args.runs || '20';
const quarters = args.quarters || '27'; // 6.5 years = 27 quarters (1 start + 26)
const speed = args.speed || '200';
const label = args.label || (preset ? `sim_${preset}` : 'sim_base');

const PORT = Number(process.env.SIM_PORT) || 8766;
const CDP = Number(process.env.SIM_CDP) || 9223;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  const safePath = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(process.cwd(), safePath === '/' ? 'index.html' : safePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

server.listen(PORT, async () => {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const url = `http://localhost:${PORT}/tests/przebiegi.html?runs=${runs}&quarters=${quarters}&speed=${speed}&label=${label}${preset ? `&preset=${preset}` : ''}`;
  console.log(`Starting headless runner: ${url}`);
  
  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--user-data-dir=' + path.join(process.env.TEMP || '.', 'edge-run-' + process.pid),
    '--remote-debugging-port=' + CDP,
    url
  ]);

  let finished = false;
  const cleanup = () => {
    if (!finished) {
      finished = true;
      try { edge.kill(); } catch (e) {}
      server.close();
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);

  let ws = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://localhost:' + CDP + '/json');
      const tabs = await res.json();
      const tab = tabs.find(t => t.url && t.url.includes('przebiegi.html'));
      if (tab && tab.webSocketDebuggerUrl) {
        ws = new WebSocket(tab.webSocketDebuggerUrl);
        break;
      }
    } catch (e) {}
  }

  if (!ws) {
    console.error('Could not connect to Edge via CDP WebSocket');
    cleanup();
    process.exit(1);
  }

  ws.onopen = () => {
    let msgId = 1;
    const interval = setInterval(() => {
      ws.send(JSON.stringify({
        id: ++msgId,
        method: 'Runtime.evaluate',
        params: {
          expression: `JSON.stringify({ done: !!window.__done, status: document.getElementById('status')?.textContent || '' })`,
          returnByValue: true
        }
      }));
    }, 1000);

    let fetchingResults = false;
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.result && data.result.result) {
        try {
          const val = JSON.parse(data.result.result.value);
          if (val && typeof val.status === 'string' && !val.done) {
            process.stdout.write(`\r${val.status}    `);
          }
          if (val && val.done && !fetchingResults) {
            fetchingResults = true;
            clearInterval(interval);
            console.log(`\nSimulation complete. Fetching data for label: ${label}...`);
            ws.send(JSON.stringify({
              id: 999999,
              method: 'Runtime.evaluate',
              params: {
                expression: `localStorage.getItem('__sim_${label}')`,
                returnByValue: true
              }
            }));
          }
        } catch (e) {}

        if (data.id === 999999) {
          const raw = data.result?.result?.value;
          if (raw) {
            const outPath = path.join(process.cwd(), 'plany', 'raporty', `${label}.json`);
            fs.writeFileSync(outPath, raw, 'utf8');
            console.log(`Saved simulation results to ${outPath}`);
          }
          ws.close();
          cleanup();
          process.exit(0);
        }
      }
    };
  };
});
