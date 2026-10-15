import { json, wrap, remove, sessionUid, clearCookie } from './_lib.js';
export default wrap(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const key = sessionUid(request);
  if (!key) return json({ error: 'Not logged in' }, 401);
  await remove(key);
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
});
