import { json, wrap } from './_lib.js';
import { getUploadedMedia, readMediaState } from './_media-manager.js';

export default wrap(async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Media not found' }, 404);
  const state = await readMediaState();
  const asset = (state.library || []).find((item) => item.id === id);
  if (!asset) return json({ error: 'Media not found' }, 404);
  const result = await getUploadedMedia(asset.path);
  if (!result || result.statusCode !== 200) return json({ error: 'Media is unavailable' }, 404);
  return new Response(result.stream, {
    status: 200,
    headers: {
      'content-type': asset.contentType,
      'content-length': String(asset.size),
      'cache-control': 'public, max-age=3600',
      'x-content-type-options': 'nosniff'
    }
  });
});
