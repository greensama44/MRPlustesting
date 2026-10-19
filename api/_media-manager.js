import { del, get, put } from '@vercel/blob';
import { json, read, write } from './_lib.js';
import { mediaCatalog } from '../media-catalog.js';

export const MEDIA_STATE_PATH = 'media/manager.json';
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;
const emptyState = () => ({ revision: 0, replacements: {}, library: [] });

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

export async function readMediaState() {
  if (process.env.MR_STORE !== 'memory' && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw Object.assign(new Error('Server is not configured (BLOB_READ_WRITE_TOKEN is missing)'), { status: 503 });
  }
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
