// Shared helpers for the accounts API.
// Storage: a PRIVATE Vercel Blob store (one JSON file per account). Set MR_STORE=memory for local tests.
import crypto from 'node:crypto';
import { get, put, del } from '@vercel/blob';

const mem = (globalThis.__mrmem ||= new Map());
const useMem = () => process.env.MR_STORE === 'memory';
const MAX_DOC = 400 * 1024; // bytes, per account document

export const RESERVED = ['alex@example.com', 'jordan@example.com', 'sam@example.com', 'casey@example.com'];

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

export const emailKey = (email) => 'users/' + crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex') + '.json';

export async function read(path) {
  if (useMem()) return mem.has(path) ? JSON.parse(mem.get(path)) : null;
  const r = await get(path, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}
export async function write(path, obj) {
  const body = JSON.stringify(obj);
  if (body.length > MAX_DOC) throw Object.assign(new Error('Account data is too large'), { status: 413 });
  if (useMem()) { mem.set(path, body); return; }
  await put(path, body, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
}
export async function remove(path) {
  if (useMem()) { mem.delete(path); return; }
  await del(path);
}

// ---- passwords (scrypt) ----
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
export async function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  return { salt: salt.toString('hex'), hash: (await scrypt(pw, salt)).toString('hex') };
}
export async function checkPw(pw, rec) {
  const k = await scrypt(pw, Buffer.from(rec.salt, 'hex'));
  const h = Buffer.from(rec.hash, 'hex');
  return k.length === h.length && crypto.timingSafeEqual(k, h);
}

// ---- sessions: signed, HttpOnly cookie ----
const COOKIE = 'mr_session';
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw Object.assign(new Error('Server is not configured (SESSION_SECRET missing)'), { status: 503 });
  return s;
};
const sign = (p) => crypto.createHmac('sha256', secret()).update(p).digest('base64url');
export function makeSession(uid) {
  const p = Buffer.from(JSON.stringify({ uid, exp: Date.now() + 30 * 864e5 })).toString('base64url');
  return `${p}.${sign(p)}`;
}
export function sessionCookie(uid) {
  return `${COOKIE}=${makeSession(uid)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 86400}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export function sessionUid(request) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  if (!m) return null;
  const [p, s] = m[1].split('.');
  if (!p || !s) return null;
  const good = sign(p);
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    return d.exp > Date.now() ? d.uid : null;
  } catch { return null; }
}

// ---- guards ----
export const emailOk = (e) => typeof e === 'string' && e.length <= 160 && /^\S+@\S+\.\S+$/.test(e);
export async function body(request) {
  try { return await request.json(); } catch { return {}; }
}
export function cleanDoc(doc, rec) {
  const d = doc && typeof doc === 'object' ? { ...doc } : {};
  delete d.pw;
  d.email = rec.email; d.name = typeof d.name === 'string' && d.name.trim().length > 1 ? d.name.trim().slice(0, 80) : rec.name;
  d.id = rec.id; d.upd = Date.now();
  return d;
}
export const wrap = (fn) => ({
  fetch: async (request) => {
    try { return await fn(request); }
    catch (e) { return json({ error: e.status && e.status < 500 || e.status === 503 ? e.message : 'Something went wrong. Please try again.' }, e.status || 500); }
  }
});
