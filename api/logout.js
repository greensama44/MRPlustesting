import { json, wrap, clearCookie } from './_lib.js';
export default wrap(async () => json({ ok: true }, 200, { 'set-cookie': clearCookie() }));
