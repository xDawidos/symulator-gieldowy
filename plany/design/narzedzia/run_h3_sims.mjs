import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 8767;
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
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, async () => {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9225',
    `http://localhost:${PORT}/tests/test_h3_bubbles.html`
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
      const res = await fetch('http://localhost:9225/json');
      const tabs = await res.json();
      const tab = tabs.find(t => t.url && t.url.includes('test_h3_bubbles.html'));
      if (tab && tab.webSocketDebuggerUrl) {
        ws = new WebSocket(tab.webSocketDebuggerUrl);
        break;
      }
    } catch (e) {}
  }

  if (!ws) {
    console.error('Failed to connect to browser CDP.');
    cleanup();
    process.exit(1);
  }

  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
  };

  let summaryStarted = false;
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value !== undefined ? a.value : JSON.stringify(a)).join(' ');
        if (summaryStarted || text.includes('TEST') || text.includes('===') || text.includes('Cykl:') || text.toLowerCase().includes('najdłuższy')) {
          if (text.includes('PODSUMOWANIE')) summaryStarted = true;
          console.log(text);
        }
        if (text.includes('__ALL_TESTS_DONE__')) {
          cleanup();
          process.exit(0);
        }
      }
    } catch (e) {}
  };
});
