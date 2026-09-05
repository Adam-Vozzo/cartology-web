import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { verifyPages } from './verify-pages.mjs';

const root = path.resolve('docs');
await verifyPages(root);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};
createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost:4173');
    if (url.pathname === '/' || url.pathname === '/game13') {
      response.writeHead(302, { Location: '/game13/' }).end();
      return;
    }
    if (!url.pathname.startsWith('/game13/')) {
      response.writeHead(404).end('Not found');
      return;
    }
    const relative =
      decodeURIComponent(url.pathname.slice('/game13/'.length)) || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const body = await readFile(file);
    response
      .writeHead(200, {
        'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      .end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(4173, '127.0.0.1', () => {
  console.log('Preview the GitHub Pages build: http://127.0.0.1:4173/game13/');
});
