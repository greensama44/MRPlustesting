import { json, wrap, body } from '../_lib.js';
import { fail } from '../_admin.js';
import { load, guardWrite, uploadFile, register, assign, remove, fileResponse, TYPES, DIRECT } from '../_media.js';
import { handleUpload } from '@vercel/blob/client';

export default wrap(async (req) => {
  const act = new URL(req.url).pathname.replace(/\/+$/, '').split('/').pop();
  if (act === 'list') return json(await load());
  if (act === 'file') return (await fileResponse(new URL(req.url).searchParams.get('id') || '')) || json({ error: 'Media not found' }, 404);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  guardWrite(req, act !== 'token');
  if (act === 'upload') return json(await uploadFile(req), 201);
  if (act === 'token') { // direct browser-to-Blob upload for videos and large images
    const b = await body(req);
    return json(await handleUpload({ request: req, body: b, onBeforeGenerateToken: async (path) => {
      if (!DIRECT.test(path)) throw fail(400, 'Invalid file name.');
      return { allowedContentTypes: Object.keys(TYPES), maximumSizeInBytes: 200 * 1024 * 1024, addRandomSuffix: false, allowOverwrite: false };
    }, onUploadCompleted: async () => {} }));
  }
  const b = await body(req);
  if (act === 'register') return json(await register(req, b), 201);
  if (act === 'assign') { const r = await assign(b); return json({ ok: true, map: r.map, mobile: r.mobile, video: r.video }); }
  if (act === 'delete') { const o = await remove(b); return json(o.body, o.status); }
  return json({ error: 'Not found' }, 404);
});
