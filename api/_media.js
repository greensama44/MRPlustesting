// Media registry: uploaded assets plus "slot -> asset" replacements, stored as one private Blob JSON document.
// Files are stored in the project's PRIVATE Blob store and served through /api/media/file (the store is private).
// No login by request; writes still require same-origin + header, strict validation and a rate limit.
import crypto from 'node:crypto';
import { put, del, get, head } from '@vercel/blob';
import { read, write } from './_lib.js';
import { fail, ipOf } from './_admin.js';

const REG = 'media/registry.json', MEM = () => process.env.MR_STORE === 'memory';
export const TYPES = { 'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/svg+xml': 'image', 'video/mp4': 'video', 'video/webm': 'video' };
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm' };
export const KEY = /^(\d{10,13}-[0-9a-f]{12}|logo|assets\/[\w./-]{1,120}\.(?:jpe?g|png|webp|svg))$/;
export const TARGETS = { all: 'map', mobile: 'mobile', video: 'video' };
export const DIRECT = /^media\/direct-[\w.-]{1,120}\.(?:jpe?g|png|webp|svg|mp4|webm)$/i;
const MAX_API = 4.4 * 1024 * 1024; // Vercel functions accept ~4.5 MB bodies

const need = () => { if (!MEM() && !process.env.BLOB_READ_WRITE_TOKEN) throw fail(503, 'Media storage is not configured (BLOB_READ_WRITE_TOKEN is missing). Connect a Blob store to the Vercel project.'); };
export const load = async () => { need(); return (await read(REG)) || { v: 1, assets: [], map: {}, mobile: {}, video: {}, log: [] }; };
const save = (r) => { r.log = r.log.slice(0, 100); return write(REG, r); };
export const urlOf = (r, id) => r.assets.find((a) => a.id === id)?.url;
export const usage = (r, id) => Object.entries(TARGETS).flatMap(([t, f]) => Object.entries(r[f]).filter(([, v]) => v === id).map(([key]) => ({ target: t, key })));

// 30 changes per 5 minutes per IP (best effort, per server instance)
const hits = (globalThis.__mrmedia ||= new Map());
function limit(req) {
  const ip = ipOf(req), now = Date.now(), h = (hits.get(ip) || []).filter((t) => now - t < 300e3);
  if (h.length >= 30) throw fail(429, 'Too many changes in a short time. Try again in a few minutes.');
  h.push(now); hits.set(ip, h);
}
// Same-origin check for every write. Our own screen also sends x-mr-admin; the direct-upload token route cannot (the Blob SDK makes that call).
export function guardWrite(req, strict = true) {
  const o = req.headers.get('origin');
  if (o && new URL(o).host !== req.headers.get('host')) throw fail(403, 'Blocked: cross-site request');
  if (strict && req.headers.get('x-mr-admin') !== '1') throw fail(403, 'Blocked: missing header');
  limit(req);
}

function svgSafe(buf) {
  const s = buf.toString('utf8');
  if (!/<svg[\s>]/i.test(s) || /<script|<foreignObject|<iframe|<embed|<object|\son\w+\s*=|javascript:|data:text\/html|(?:xlink:)?href\s*=\s*["']?https?:/i.test(s)) throw fail(400, 'That SVG contains scripts or external links and cannot be used.');
}
function magicOk(type, b) {
  if (type === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8;
  if (type === 'image/png') return b.toString('hex', 0, 4) === '89504e47';
  if (type === 'image/webp') return b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  if (type === 'video/mp4') return b.length > 11 && b.toString('ascii', 4, 8) === 'ftyp';
  if (type === 'video/webm') return b.length > 3 && b.toString('hex', 0, 4) === '1a45dfa3';
  return true;
}
const safeName = (n) => String(n || 'file').normalize('NFKD').replace(/[^\w.\- ]+/g, '').trim().slice(-80) || 'file';
const num = (v) => (Number.isFinite(+v) && +v > 0 && +v < 100000 ? Math.round(+v) : 0);
const newId = () => 'a_' + crypto.randomBytes(5).toString('hex');

async function addAsset(r, a) {
  const asset = { id: a.id, name: safeName(a.name), kind: TYPES[a.type], type: a.type, url: a.url, path: a.path || '', size: num(a.size), w: num(a.w), h: num(a.h), dur: num(a.dur), hash: a.hash || '', at: new Date().toISOString() };
  r.assets.unshift(asset); r.log.unshift({ at: asset.at, action: 'Uploaded', detail: asset.name });
  return { asset, dup: false };
}

// Upload through the API (up to ~4.4 MB): images and short videos.
export async function uploadFile(req) {
  const type = (req.headers.get('content-type') || '').split(';')[0], buf = Buffer.from(await req.arrayBuffer());
  if (!TYPES[type]) throw fail(400, 'Upload a JPG, PNG, WebP, SVG, MP4 or WebM file.');
  if (buf.length > MAX_API) throw fail(413, 'This file is larger than 4.4 MB. Larger files use the direct upload.');
  if (!magicOk(type, buf)) throw fail(400, 'That file is not a valid ' + EXT[type].toUpperCase() + ' file.');
  if (type === 'image/svg+xml') svgSafe(buf);
  const hash = crypto.createHash('sha256').update(buf).digest('hex'), r = await load(), ex = r.assets.find((x) => x.hash === hash);
  if (ex) return { asset: ex, dup: true };
  const id = newId(), path = `media/${id}.${EXT[type]}`, name = decodeURIComponent(req.headers.get('x-filename') || 'file.' + EXT[type]);
  let url = `/api/media/file?id=${id}`;
  if (MEM()) url = `data:${type};base64,${buf.toString('base64')}`;
  else await put(path, buf, { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: type });
  const out = await addAsset(r, { id, name, type, url, path: MEM() ? '' : path, size: buf.length, hash, w: req.headers.get('x-width'), h: req.headers.get('x-height'), dur: req.headers.get('x-duration') });
  await save(r); return out;
}
// Register a file the browser uploaded straight to Blob (larger files). Size and type come from Blob, not the browser.
export async function register(req, b) {
  const r = await load();
  let pathname = '', type = String(b.type || ''), size = b.size, url;
  const id = newId();
  if (MEM()) { if (!String(b.url).startsWith('data:')) throw fail(400, 'Unsupported upload.'); url = b.url; }
  else {
    pathname = String(b.pathname || '');
    if (!DIRECT.test(pathname)) throw fail(400, 'That file was not uploaded through the media library.');
    const ex = r.assets.find((x) => x.path === pathname); if (ex) return { asset: ex, dup: true };
    const h = await head(pathname).catch(() => null);
    if (!h) throw fail(404, 'The uploaded file could not be found.');
    type = h.contentType; size = h.size; url = `/api/media/file?id=${id}`;
  }
  if (!TYPES[type]) throw fail(400, 'Unsupported file type.');
  const ex = b.hash && r.assets.find((x) => x.hash === b.hash); if (ex) return { asset: ex, dup: true };
  const out = await addAsset(r, { id, name: b.name, type, url, path: pathname, size, w: b.w, h: b.h, dur: b.dur, hash: b.hash });
  await save(r); return out;
}
export async function assign(b) {
  const f = TARGETS[b.target || 'all'];
  if (!f) throw fail(400, 'Unknown target.');
  if (!KEY.test(String(b.key))) throw fail(400, 'Unknown image slot.');
  const r = await load();
  if (b.assetId === null) { delete r[f][b.key]; r.log.unshift({ at: new Date().toISOString(), action: 'Restored original', detail: `${b.key} (${b.target || 'all'})` }); }
  else {
    const a = r.assets.find((x) => x.id === b.assetId);
    if (!a) throw fail(404, 'That asset no longer exists.');
    if ((f === 'video') !== (a.kind === 'video')) throw fail(400, f === 'video' ? 'Choose a video file for a background video.' : 'Choose an image file for an image slot.');
    r[f][b.key] = a.id; r.log.unshift({ at: new Date().toISOString(), action: 'Replaced', detail: `${b.key} (${b.target || 'all'}) -> ${a.name}` });
  }
  await save(r); return r;
}
export async function remove(b) {
  const r = await load(), a = r.assets.find((x) => x.id === b.id);
  if (!a) throw fail(404, 'That asset no longer exists.');
  const u = usage(r, a.id);
  if (u.length && !b.force) return { status: 409, body: { error: 'This asset is still in use.', usage: u } };
  for (const f of Object.values(TARGETS)) for (const k of Object.keys(r[f])) if (r[f][k] === a.id) delete r[f][k];
  r.assets = r.assets.filter((x) => x.id !== a.id); r.log.unshift({ at: new Date().toISOString(), action: 'Deleted', detail: a.name });
  if (!MEM() && a.path) { try { await del(a.path); } catch { /* file already gone */ } }
  await save(r); return { status: 200, body: { ok: true, reverted: u.length } };
}
// Serves an uploaded file from the private store. The id is unique per file, so the response can be cached for a year.
export async function fileResponse(id) {
  if (!/^a_[0-9a-f]{10}$/.test(id)) return null;
  const r = await load(), a = r.assets.find((x) => x.id === id);
  if (!a) return null;
  let body;
  if (MEM()) { if (!a.url.startsWith('data:')) return null; body = Buffer.from(a.url.split(',')[1], 'base64'); }
  else { const g = await get(a.path, { access: 'private', useCache: false }); if (!g || g.statusCode !== 200) return null; body = g.stream; }
  return new Response(body, { status: 200, headers: { 'content-type': a.type, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" } });
}
