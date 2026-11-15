// Starlight Salvage — tiny static file server for local play.
// Serves game/ on http://localhost:8080 with no dependencies.
// Run with: node serve.ts

import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PORT = 8080;
const gameDir = resolve(join(fileURLToPath(new URL('.', import.meta.url)), 'game'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const file = resolve(join(gameDir, normalize(path)));
    // Never serve anything outside game/.
    if (!file.startsWith(gameDir + '/') && file !== gameDir) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Starlight Salvage at http://localhost:${PORT}`);
});
