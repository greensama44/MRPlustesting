import { json, wrap, read, sessionUid, clearCookie } from './_lib.js';
export default wrap(async (request) => {
  const key = sessionUid(request);
  const rec = key && (await read(key));
  if (!rec) return json({ error: 'Not logged in' }, 401, { 'set-cookie': clearCookie() });
  return json({ user: rec.doc });
});
