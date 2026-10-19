import crypto from 'node:crypto';
import { json, wrap } from './_lib.js';
import {
  deleteUploadedMedia,
  MAX_MEDIA_BYTES,
  readMediaState,
  requireSameOrigin,
  saveMediaState,
  saveUploadedMedia
} from './_media-manager.js';

function detectMedia(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', contentType: 'image/jpeg' };
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return { extension: 'png', contentType: 'image/png' };
  }
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString() === 'RIFF' &&
      Buffer.from(bytes.subarray(8, 12)).toString() === 'WEBP') {
    return { extension: 'webp', contentType: 'image/webp' };
  }
  const mp4Brand = bytes.length >= 12 ? Buffer.from(bytes.subarray(8, 12)).toString() : '';
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(4, 8)).toString() === 'ftyp' &&
      ['isom', 'iso2', 'mp41', 'mp42', 'M4V ', 'MSNV', 'avc1', 'dash', 'qt  '].includes(mp4Brand)) {
    return { extension: 'mp4', contentType: 'video/mp4' };
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { extension: 'webm', contentType: 'video/webm' };
  }
  return null;
}

export default wrap(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_MEDIA_BYTES) return json({ error: 'Uploads must be 4 MB or smaller' }, 413);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length || bytes.byteLength > MAX_MEDIA_BYTES) {
    return json({ error: 'Choose a file between 1 byte and 4 MB' }, 413);
  }
  const media = detectMedia(bytes);
  if (!media) return json({ error: 'Upload a valid JPG, PNG, WebP, MP4 or WebM file' }, 415);

  const state = await readMediaState();
  const revision = Number(request.headers.get('x-media-revision'));
  if (!Number.isInteger(revision) || revision !== state.revision) {
    return json({ error: 'Media settings changed in another session. Reload before uploading.', conflict: true }, 409);
  }
  state.library ||= [];
  if (state.library.length >= 100) return json({ error: 'Media library limit reached (100 items)' }, 409);

  const id = crypto.randomUUID();
  const stored = await saveUploadedMedia(id, media.extension, media.contentType, bytes);
  const rawName = request.headers.get('x-media-name') || `Uploaded ${media.extension.toUpperCase()}`;
  const name = rawName.replace(/[\\/\u0000-\u001f]/g, '').trim().slice(0, 160) || `Uploaded ${media.extension.toUpperCase()}`;
  const asset = { ...stored, name, createdAt: Date.now() };
  state.library.unshift(asset);
  try {
    await saveMediaState(state);
  } catch (error) {
    try {
      await deleteUploadedMedia(stored.path);
    } catch (cleanupError) {
      console.error('Could not remove an uploaded media file after saving its library entry failed:', cleanupError);
    }
    throw error;
  }
  return json({
    asset: { id, name, type: media.contentType, size: stored.size, createdAt: asset.createdAt, url: `/api/media-file?id=${id}` },
    revision: state.revision
  }, 201);
});
