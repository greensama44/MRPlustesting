import { json, wrap } from './_lib.js';
import {
  adminCookie,
  adminEmail,
  checkAdminPassword,
  clearAdminCookie,
  parseJson,
  requireSameOrigin
} from './_media-manager.js';

export default wrap(async (request) => {
  if (request.method === 'GET') {
    const email = adminEmail(request);
    return email ? json({ authenticated: true, email }) : json({ authenticated: false }, 401);
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const body = await parseJson(request);
  if (body.action === 'logout') {
    return json({ ok: true }, 200, { 'set-cookie': clearAdminCookie(request) });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const configuredEmail = process.env.MEDIA_ADMIN_EMAIL || '';
  const validEmail = /^\S+@\S+\.\S+$/.test(configuredEmail) && configuredEmail.length <= 160;
  const validPassword = await checkAdminPassword(body.password);
  if (!validEmail || !validPassword || email !== configuredEmail.trim().toLowerCase()) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return json({ error: 'Email or password is incorrect' }, 401);
  }
  return json({ authenticated: true, email }, 200, { 'set-cookie': adminCookie(email, request) });
});
