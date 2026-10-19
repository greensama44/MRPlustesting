// Public: published CMS content plus media replacements. Never breaks the site: on any error it returns an empty overlay.
import { json, read } from './_lib.js';
import { adminOf } from './_admin.js';
import { load, urlOf } from './_media.js';
export default { async fetch(req) {
  const empty = { n: 0, text: {}, images: {}, mobile: {}, videos: {}, giveaways: [] };
  try {
    const pv = new URL(req.url).searchParams.get('preview') === '1' && adminOf(req);
    const doc = (pv && (await read('cms/draft.json'))) || (await read('cms/published.json')) || {};
    const r = await load(), pick = (m) => Object.fromEntries(Object.entries(m).map(([k, id]) => [k, urlOf(r, id)]).filter(([, u]) => u));
    return json({ n: doc.n || 0, text: doc.text || {}, images: { ...(doc.images || {}), ...pick(r.map) }, mobile: pick(r.mobile), videos: pick(r.video), giveaways: (doc.giveaways || []).filter((g) => !g.hidden) }, 200, { 'cache-control': pv ? 'no-store' : 'public, s-maxage=15, stale-while-revalidate=120' });
  } catch { return json(empty, 200, { 'cache-control': 'no-store' }); }
} };
