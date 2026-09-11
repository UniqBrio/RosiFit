/**
 * The static server the browser checks run against.
 *
 * `npx serve` is not enough for this export: Expo Router writes a dynamic
 * route as `course/[id].html`, and a plain static server answers 404 for
 * `/course/c1`. This maps a path with no file of its own onto the `[id]`
 * page in the same directory, which is what the route is.
 *
 * No dependencies, so a check can be run on a fresh clone.
 *   node .harness/serve.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('dist');
const PORT = Number(process.argv[2] ?? 8100);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

/** The file this URL means, or null. */
function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\/+$/, '') || '/index';
  const direct = path.join(ROOT, clean);
  // an asset, exactly as asked for
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  // a route: /more -> more.html
  if (fs.existsSync(`${direct}.html`)) return `${direct}.html`;
  // a directory route: /(tabs) -> (tabs)/index.html
  const index = path.join(direct, 'index.html');
  if (fs.existsSync(index)) return index;
  // A DYNAMIC ROUTE. /course/c1 has no file; course/[id].html is the page.
  const dir = path.dirname(direct);
  if (fs.existsSync(dir)) {
    const dynamic = fs.readdirSync(dir).find(f => /^\[.+\]\.html$/.test(f));
    if (dynamic) return path.join(dir, dynamic);
  }
  return null;
}

http.createServer((req, res) => {
  const file = resolveFile(req.url ?? '/');
  if (!file) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`serving dist on http://127.0.0.1:${PORT}`));
