import { json, wrap } from './_lib.js';
import {
  adminEmail,
  parseJson,
  readMediaState,
  requireSameOrigin,
  saveMediaState,
  validateReplacements
} from './_media-manager.js';

export default wrap(async (request) => {
  if (request.method === 'GET') {
    if (new URL(request.url).searchParams.get('manage') === '1') {
      if (!adminEmail(request)) return json({ error: 'Admin login required' }, 401);
    }
    const state = await readMediaState();
    if (new URL(request.url).searchParams.get('manage') === '1') return json(state);
    const mediaTypes = {};
    for (const [id, url] of Object.entries(state.replacements || {})) {
      const match = /^\/api\/media-file\?id=([0-9a-f-]{36})$/i.exec(url);
      const asset = match && (state.library || []).find((item) => item.id === match[1]);
      if (asset) mediaTypes[id] = asset.contentType;
    }
    return json({ replacements: state.replacements || {}, mediaTypes });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  if (!adminEmail(request)) return json({ error: 'Admin login required' }, 401);
  const body = await parseJson(request);
  const state = await readMediaState();
  if (!Number.isInteger(body.revision) || body.revision !== state.revision) {
    return json({ error: 'Media settings changed in another session. Reload before saving.', conflict: true, revision: state.revision }, 409);
  }
  state.replacements = validateReplacements(body.replacements);
  await saveMediaState(state);
  return json({ ok: true, revision: state.revision });
});
