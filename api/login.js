import { json, wrap, body, read, emailKey, emailOk, checkPw, sessionCookie } from './_lib.js';
export default wrap(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const b = await body(request), email = String(b.email || '').trim().toLowerCase(), pw = String(b.password || '');
  const bad = async () => { await new Promise((r) => setTimeout(r, 400)); return json({ error: 'That email and password do not match.' }, 401); };
  if (!emailOk(email) || !pw) return bad();
  const key = emailKey(email), rec = await read(key);
  if (!rec || !(await checkPw(pw, rec.pw))) return bad();
  return json({ user: rec.doc }, 200, { 'set-cookie': sessionCookie(key) });
});
