// Admin helpers: login, CSRF, content store, validation and image upload (demo CMS on Vercel Blob).
import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { read, write, checkPw } from './_lib.js';

const C = 'mr_admin', TTL = 8 * 3600e3;
export const fail = (status, message) => Object.assign(new Error(message), { status });
const secret = () => { const s = process.env.SESSION_SECRET; if (!s || s.length < 16) throw fail(503, 'Server is not configured (SESSION_SECRET missing)'); return s + ':admin'; };
const sign = (p) => crypto.createHmac('sha256', secret()).update(p).digest('base64url');
export const admins = () => (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

export function adminCookie(email) {
  const p = Buffer.from(JSON.stringify({ e: email, x: Date.now() + TTL })).toString('base64url');
  return `${C}=${p}.${sign(p)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL / 1000}`;
}
export const clearAdmin = () => `${C}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export function adminOf(req) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + C + '=([^;]+)'));
  if (!m) return null;
  const [p, s] = m[1].split('.');
  if (!p || !s) return null;
  const good = sign(p);
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try { const d = JSON.parse(Buffer.from(p, 'base64url').toString()); return d.x > Date.now() && admins().includes(d.e) ? d.e : null; } catch { return null; }
}
// Writes must come from our own origin and carry the custom header (blocks cross-site form posts).
export function csrf(req) {
  if (req.method === 'GET') return;
  const o = req.headers.get('origin');
  if (o && new URL(o).host !== req.headers.get('host')) throw fail(403, 'Blocked: cross-site request');
  if (req.headers.get('x-mr-admin') !== '1') throw fail(403, 'Blocked: missing admin header');
}
export function guard(req) {
  csrf(req);
  const who = adminOf(req);
  if (!who) throw fail(401, 'Please log in');
  return who;
}
export async function passwordOk(email, pw) {
  if (!admins().includes(email)) return false;
  const h = process.env.ADMIN_PASSWORD_HASH;
  if (h) { const [salt, hash] = h.split(':'); return !!salt && !!hash && checkPw(pw, { salt, hash }); }
  const p = process.env.ADMIN_PASSWORD || '';
  if (p.length < 12) return false;
  const a = crypto.createHash('sha256').update(pw).digest(), b = crypto.createHash('sha256').update(p).digest();
  return crypto.timingSafeEqual(a, b);
}
// Best-effort lockout (per server instance): 5 failures then 15 minutes.
const tries = (globalThis.__mrtry ||= new Map());
export const ipOf = (req) => (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
export function locked(ip) { const t = tries.get(ip); if (t && Date.now() - t.at > 15 * 60e3) tries.delete(ip); if ((tries.get(ip)?.n || 0) >= 5) throw fail(429, 'Too many attempts. Try again in 15 minutes.'); }
export const noteFail = (ip) => { const t = tries.get(ip) || { n: 0, at: Date.now() }; t.n++; tries.set(ip, t); };
export const clearFails = (ip) => tries.delete(ip);

// ---- validation ----
const CAT = ['Cash', 'Experience', 'Voucher'], GRP = ['motor', 'basket', 'every'], ST = ['open', 'up', 'done'];
const PHOTO = /^\d{10,13}-[0-9a-f]{12}$/;
const urlOk = (v) => typeof v === 'string' && (/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(v) || /^https:\/\/images\.unsplash\.com\//.test(v) || (process.env.MR_STORE === 'memory' && v.startsWith('data:image/')));
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const plain = (v, max) => { const s = str(v, max); if (/[<>]/.test(s)) throw fail(400, 'Text cannot contain < or >.'); return s; };

export function cleanDoc(d) {
  const o = { text: {}, images: {}, giveaways: [] };
  for (const [k, v] of Object.entries(d?.text || {})) if (/^[a-z]+\.[a-z0-9.]{1,40}$/.test(k) && typeof v === 'string' && v.trim()) o.text[k] = plain(v, 300);
  for (const [k, v] of Object.entries(d?.images || {})) { if (!PHOTO.test(k)) continue; if (!urlOk(v)) throw fail(400, 'Replacement images must be uploaded through the admin.'); o.images[k] = v; }
  const seen = new Set();
  for (const g of (Array.isArray(d?.giveaways) ? d.giveaways : []).slice(0, 200)) {
    const e = (m) => { throw fail(400, `${str(g?.title, 40) || 'Giveaway'}: ${m}`); };
    const x = { id: /^g_[a-z0-9]{6,12}$/.test(g?.id) ? g.id : e('missing id'), title: plain(g.title, 90), cat: g.cat, group: g.group, prize: plain(g.prize, 60), desc: plain(g.desc, 140), img: g.img, status: g.status, date: str(g.date, 10), featured: !!g.featured, hidden: !!g.hidden };
    if (seen.has(x.id)) e('duplicate id'); seen.add(x.id);
    if (x.title.length < 3) e('the title needs at least 3 characters');
    if (!CAT.includes(x.cat)) e('choose a category');
    if (!GRP.includes(x.group)) e('choose a group');
    if (!ST.includes(x.status)) e('choose a status');
    if (!x.prize) e('add the prize line');
    if (!(PHOTO.test(x.img) || urlOk(x.img))) e('choose a photo');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date) || isNaN(Date.parse(x.date))) e('add a valid draw date');
    if (x.featured && !x.desc) e('featured giveaways need a short description');
    o.giveaways.push(x);
  }
  return o;
}

// ---- store (private Blob JSON, reuses api/_lib.js read/write) ----
export const draftDoc = async () => (await read('cms/draft.json')) || (await read('cms/published.json')) || { text: {}, images: {}, giveaways: [] };
export async function audit(by, action, detail = '') {
  const a = (await read('cms/audit.json')) || [];
  a.unshift({ at: new Date().toISOString(), by, action, detail: String(detail).slice(0, 200) });
  await write('cms/audit.json', a.slice(0, 200));
}
export async function publishDoc(doc, by) {
  const d = cleanDoc(doc), pub = (await read('cms/published.json')) || {}, hist = (await read('cms/history.json')) || [];
  if (pub.n) hist.unshift({ n: pub.n, at: pub.at, by: pub.by, doc: { text: pub.text, images: pub.images, giveaways: pub.giveaways } });
  while (hist.length > 10 || JSON.stringify(hist).length > 300000) hist.pop();
  const out = { ...d, n: (pub.n || 0) + 1, at: new Date().toISOString(), by };
  await write('cms/published.json', out); await write('cms/history.json', hist); await write('cms/draft.json', d);
  return out;
}

// ---- image upload (public Blob) ----
export async function upload(req) {
  const type = (req.headers.get('content-type') || '').split(';')[0], buf = Buffer.from(await req.arrayBuffer());
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type];
  if (!ext) throw fail(400, 'Upload a JPG, PNG or WebP image.');
  if (buf.length > 4.4 * 1024 * 1024) throw fail(413, 'Image is too large (max 4.4 MB).');
  const ok = ext === 'jpg' ? buf[0] === 0xff && buf[1] === 0xd8 : ext === 'png' ? buf.toString('hex', 0, 4) === '89504e47' : buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  if (!ok) throw fail(400, 'That file is not a valid image.');
  if (process.env.MR_STORE === 'memory') return `data:${type};base64,${buf.toString('base64')}`;
  return (await put(`cms/img/${crypto.randomBytes(6).toString('hex')}.${ext}`, buf, { access: 'public', contentType: type, addRandomSuffix: true })).url;
}
