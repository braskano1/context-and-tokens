// Tiny static server for previewing the page over http:// instead of file://.
// Dev-time only, no dependencies. `npm run serve`, then open the printed URL.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const ROOT = new URL('../', import.meta.url);
const PORT = Number(process.env.PORT || 8123);
const TYPES = { '.html': 'text/html; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  if (path.includes('..')) {
    res.writeHead(400).end('bad path');
    return;
  }
  try {
    const body = await readFile(new URL(path, ROOT));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => {
  console.log(`serving on http://localhost:${PORT}/index.html`);
});
