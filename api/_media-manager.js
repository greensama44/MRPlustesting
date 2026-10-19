import crypto from 'node:crypto';
import { del, get, put } from '@vercel/blob';
import { json, read, write } from './_lib.js';
import { mediaCatalog } from '../media-catalog.js';

export const MEDIA_STATE_PATH = 'media/manager.json';
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;
const COOKIE = 'mr_media_admin';
const emptyState = () => ({ revision: 0, replacements: {}, library: [] });

function adminSettings() {
  const email = process.env.MEDIA_ADMIN_EMAIL || '';
  const passwordHash = process.env.MEDIA_ADMIN_PASSWORD_HASH || '';
  const sessionSecret = process.env.MEDIA_ADMIN_SESSION_SECRET || '';
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) {
    throw Object.assign(new Error('Server is not configured (MEDIA_ADMIN_EMAIL is invalid)'), { status: 503 });
  }
  const match = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/i.exec(passwordHash);
  if (!match) {
    throw Object.assign(new Error('Server is not configured (MEDIA_ADMIN_PASSWORD_HASH is invalid)'), { status: 503 });
  }
  if (sessionSecret.length < 32) {
    throw Object.assign(new Error('Server is not configured (MEDIA_ADMIN_SESSION_SECRET must be at least 32 characters)'), { status: 503 });
  }
  return {
    email: email.trim().toLowerCase(),
    salt: Buffer.from(match[1], 'hex'),
    hash: Buffer.from(match[2], 'hex'),
    sessionSecret
  };
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function requestIsSecure(request) {
  const url = new URL(request.url);
  return url.protocol === 'https:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

export function adminEmail(request) {
  const match = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match) return null;
  const [payload, signature] = match[1].split('.');
  if (!payload || !signature) return null;
  try {
    const settings = adminSettings();
    const expected = sign(payload, settings.sessionSecret);
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.email === settings.email && session.exp > Date.now() ? settings.email : null;
  } catch {
    return null;
  }
}

export function adminCookie(email, request) {
  const settings = adminSettings();
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const secure = requestIsSecure(request) ? 'Secure; ' : '';
  return `${COOKIE}=${payload}.${sign(payload, settings.sessionSecret)}; Path=/; HttpOnly; ${secure}SameSite=Strict; Max-Age=28800`;
}

export function clearAdminCookie(request) {
  const secure = requestIsSecure(request) ? 'Secure; ' : '';
  return `${COOKIE}=; Path=/; HttpOnly; ${secure}SameSite=Strict; Max-Age=0`;
}

export function requireSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return json({ error: 'Missing request origin' }, 403);
  try {
    if (new URL(origin).origin !== new URL(request.url).origin) return json({ error: 'Cross-origin request denied' }, 403);
  } catch {
    return json({ error: 'Invalid request origin' }, 403);
  }
  return null;
}

export async function parseJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw Object.assign(new Error('Content-Type must be application/json'), { status: 415 });
  }
  try {
    const value = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON'), { status: 400 });
  }
}

export async function checkAdminPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) return false;
  const settings = adminSettings();
  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(password, settings.salt, 64, (error, key) => error ? reject(error) : resolve(key));
  });
  return crypto.timingSafeEqual(derived, settings.hash);
}

export async function readMediaState() {
  return (await read(MEDIA_STATE_PATH)) || emptyState();
}

export async function saveMediaState(state) {
  state.revision = (Number(state.revision) || 0) + 1;
  state.updatedAt = Date.now();
  await write(MEDIA_STATE_PATH, state);
}

export function validateMediaUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048 || /[\u0000-\u001f]/.test(value)) {
    throw Object.assign(new Error('Enter a valid HTTPS media URL or a site-relative URL'), { status: 400 });
  }
  const valueTrimmed = value.trim();
  if (valueTrimmed.startsWith('/') && !valueTrimmed.startsWith('//')) return valueTrimmed;
  try {
    const url = new URL(valueTrimmed);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch {}
  throw Object.assign(new Error('Media URLs must use HTTPS or be relative to this website'), { status: 400 });
}

export function validateReplacements(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Object.assign(new Error('Media replacements must be an object'), { status: 400 });
  }
  const allowed = new Set(mediaCatalog.map((item) => item.id));
  const entries = Object.entries(value);
  if (entries.length > allowed.size) throw Object.assign(new Error('Too many media replacements'), { status: 400 });
  const result = {};
  for (const [id, url] of entries) {
    if (!allowed.has(id)) throw Object.assign(new Error('This media item is not part of the website catalog'), { status: 400 });
    result[id] = validateMediaUrl(url);
  }
  return result;
}

export async function saveUploadedMedia(id, extension, contentType, bytes) {
  const path = `media/assets/${id}.${extension}`;
  await put(path, bytes, { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType });
  return { id, path, contentType, size: bytes.byteLength };
}

export async function getUploadedMedia(path) {
  return get(path, { access: 'private', useCache: false });
}

export async function deleteUploadedMedia(path) {
  await del(path);
}
