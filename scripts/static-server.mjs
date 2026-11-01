import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function serve(root = 'dist', port = 0) {
  const base = path.resolve(root);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let name = decodeURIComponent(url.pathname).replace(/^\/preview\//, '/');
      if (name === '/') name = '/index.html';
      const file = path.resolve(base, '.' + name);
      if (!file.startsWith(base + path.sep) || !(await stat(file)).isFile()) throw new Error('Not found');
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve) => server.listen(port, '0.0.0.0', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/preview/` };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { server, url } = await serve('dist', 4173);
  console.log(`Reviewing the production export at ${url} for up to 15 minutes.`);
  const timeout = setTimeout(() => server.close(), 15 * 60 * 1000);
  process.on('SIGINT', () => { clearTimeout(timeout); server.close(); });
}
