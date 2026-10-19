// Local preview of the whole site plus its API, with in-memory storage (everything resets when you stop it).
//   node scripts/dev-server.mjs        then open  http://localhost:8123/admin/media.html
// For real storage while developing, use `vercel dev` instead.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.MR_STORE = 'memory';
process.env.SESSION_SECRET ||= 'local-dev-secret-not-for-production';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), PORT = process.env.PORT || 8123;
const api = async (f) => (await import(path.join(root, f))).default;
const routes = { '/api/content': await api('api/content.js'), '/api/media/': await api('api/media/[action].js') };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };

http.createServer(async (q, s) => {
  const u = new URL(q.url, `http://localhost:${PORT}`);
  if (u.pathname.startsWith('/api/')) {
    const fn = u.pathname === '/api/content' ? routes['/api/content'] : u.pathname.startsWith('/api/media/') ? routes['/api/media/'] : null;
    if (!fn) { s.statusCode = 404; return s.end('Not available in the local server'); }
    const chunks = []; for await (const c of q) chunks.push(c);
    const h = new Headers(); for (const [k, v] of Object.entries(q.headers)) h.set(k, String(v));
    const r = await (fn.fetch ? fn.fetch.bind(fn) : fn)(new Request(u, { method: q.method, headers: h, body: ['GET', 'HEAD'].includes(q.method) ? undefined : Buffer.concat(chunks) }));
    s.statusCode = r.status; r.headers.forEach((v, k) => s.setHeader(k, v));
    return s.end(Buffer.from(await r.arrayBuffer()));
  }
  let p = path.join(root, decodeURIComponent(u.pathname)); if (!p.startsWith(root)) { s.statusCode = 403; return s.end(); }
  if (u.pathname.endsWith('/')) p = path.join(p, 'index.html');
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.statusCode = 404; return s.end('Not found'); }
  s.setHeader('content-type', MIME[path.extname(p)] || 'application/octet-stream'); s.end(fs.readFileSync(p));
}).listen(PORT, () => console.log(`Mega Rewards local server: http://localhost:${PORT}\nMedia screen:               http://localhost:${PORT}/admin/media.html\n(in-memory storage, resets when stopped)`));
