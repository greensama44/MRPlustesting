import { json, wrap, body, read, write, emailKey, emailOk, hashPw, sessionCookie, cleanDoc, RESERVED } from './_lib.js';
export default wrap(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const b = await body(request);
  const email = String(b.email || '').trim().toLowerCase(), name = String(b.name || '').trim(), pw = String(b.password || '');
  if (name.length < 2) return json({ error: 'Add your first name' }, 400);
  if (!emailOk(email)) return json({ error: 'Add a valid email address' }, 400);
  if (pw.length < 8 || pw.length > 200) return json({ error: 'Use at least 8 characters' }, 400);
  if (RESERVED.includes(email)) return json({ error: 'An account with that email already exists. Try logging in.' }, 409);
  const key = emailKey(email);
  if (await read(key)) return json({ error: 'An account with that email already exists. Try logging in.' }, 409);
  const id = 'u' + key.slice(6, 16);
  const rec = { v: 1, id, email, name, pw: await hashPw(pw), created: Date.now() };
  rec.doc = cleanDoc(b.doc, rec);
  await write(key, rec);
  return json({ user: rec.doc }, 201, { 'set-cookie': sessionCookie(key) });
});
