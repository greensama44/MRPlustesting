import { json, wrap, body, read, write, sessionUid, cleanDoc } from './_lib.js';
export default wrap(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const key = sessionUid(request);
  const rec = key && (await read(key));
  if (!rec) return json({ error: 'Not logged in' }, 401);
  const b = await body(request);
  if (!b.doc || typeof b.doc !== 'object') return json({ error: 'Nothing to save' }, 400);
  rec.doc = cleanDoc(b.doc, rec);
  await write(key, rec);
  return json({ ok: true, upd: rec.doc.upd });
});
