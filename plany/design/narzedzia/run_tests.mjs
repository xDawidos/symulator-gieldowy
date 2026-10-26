import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const PORT = Number(process.env.SIM_PORT) || 8765;
const CDP = Number(process.env.SIM_CDP) || 9222;
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
  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--user-data-dir=' + path.join(process.env.TEMP || '.', 'edge-run-' + process.pid),
    '--remote-debugging-port=' + CDP,
    `http://localhost:${PORT}/tests/tests.html`
  ]);

  let finished = false;

  const cleanup = () => {
    if (!finished) {
      finished = true;
      try { spawnSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*edge-run-${process.pid}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`]); } catch (e) {} // zabija całe drzewo Edge z tego przebiegu
      server.close();
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);

  // Poll CDP for tabs
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://localhost:' + CDP + '/json');
      const tabs = await res.json();
      const tab = tabs.find(t => t.url && t.url.includes('tests.html'));
      if (tab && tab.webSocketDebuggerUrl) {
        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        ws.onopen = () => {
          // Poll window.__testSummary
          let checkInterval = setInterval(() => {
            ws.send(JSON.stringify({
              id: 1,
              method: 'Runtime.evaluate',
              params: {
                expression: 'JSON.stringify(window.__testSummary || null)',
                returnByValue: true
              }
            }));
          }, 300);

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === 1 && data.result && data.result.result) {
              const val = JSON.parse(data.result.result.value);
              if (val) {
                clearInterval(checkInterval);
                console.log(`TEST SUMMARY: Passed: ${val.passed}, Failed: ${val.failed}`);
                if (val.errors && val.errors.length) {
                  console.error('FAILURES:\n' + val.errors.join('\n'));
                }
                ws.close();
                cleanup();
                process.exit(val.failed > 0 ? 1 : 0);
              }
            }
          };
        };
        break;
      }
    } catch (e) {}
  }
});
