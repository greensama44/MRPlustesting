#!/usr/bin/env node
/*
  Scans the site and writes media-manifest.json: every image the pages use, with the pages and sections that use it.
  The Media Management screen reads this file. Re-run after adding or moving images in the code:
    node scripts/build-media-manifest.cjs
*/
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const LABEL = {
  '1679391029864-d46f366a456b': 'Stadium crowd under lights', '1545525201-e1a5a2a18293': 'Basketball (JackJumpers, Mega Shot)', '1629217855633-79a6925d6c47': 'Basketball (NBL, VIP Game-Day)',
  '1690984651796-6bbb102fbf30': 'Motorsport (bp Grand Final)', '1560692830-04adc2f31119': 'Motorsport (Supercars)', '1527269534026-c86f4009eace': 'Cash and dining', '1503266980949-bd30d04d0b7a': 'Confetti celebration',
  '1534452203293-494d7ddbf7e0': 'Shopping bag', '1576696058573-12b47c49559e': 'Family on a beach', '1694837449886-80df7fe6024e': 'Apple Watch', '1610229452706-666ac2d49c45': 'Lifestyle (Mega tier, profile)',
  '1561715276-a2d087060f1d': 'Utilities and finance', '1641849461096-7e796050f12b': 'Lifestyle (Plus tier)', '1557775692-91fa57f514a6': 'Fuel and vouchers', 'logo': 'Mega Rewards logo'
};
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
const clean = (s) => s.replace(/data:[a-z\/+\-]+;base64,[A-Za-z0-9+\/=]{200,}/g, '').replace(/data:image\/svg\+xml[^'"`)]{200,}/g, '');
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html') && f !== 'testing.html').sort();
const A = new Map();
const slot = (key, kind, src, label) => { if (!A.has(key)) A.set(key, { key, kind, label: label || LABEL[key] || key.split('/').pop(), src, pages: {} }); return A.get(key); };
const use = (a, page, where) => { const p = (a.pages[page] ||= { count: 0, where: new Set() }); p.count++; if (where) p.where.add(where); };
const unsplash = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=700`;
let logo = '';
for (const page of pages) {
  const raw = fs.readFileSync(path.join(root, page), 'utf8'), t = clean(raw);
  if (!logo) { const m = raw.match(/data:image\/svg\+xml[^'"`]{200,}/); if (m) logo = m[0]; }
  for (const m of t.matchAll(/\b(\d{10,13}-[0-9a-f]{12})\b/g)) {
    const i = m.index, pre = t.slice(Math.max(0, i - 1800), i), near = t.slice(Math.max(0, i - 14), i);
    let where;
    if (/data-p="$/.test(near)) {
      const tail = pre.slice(-260);
      if (/class="end"/.test(tail)) where = 'Closing banner background';
      else if (/<header class="ph2"/.test(tail) || /<div class="bg">$/.test(pre.slice(-40)) && /ph2/.test(tail)) where = 'Page hero background';
      else { const h = [...pre.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)].pop(), eb = [...pre.matchAll(/<p class="eb"[^>]*>([\s\S]*?)<\/p>/g)].pop(); where = 'Section: ' + (strip((h && h[1]) || (eb && eb[1]) || '') || 'page content'); }
    } else {
      const row = [...t.slice(Math.max(0, i - 400), i).matchAll(/\[\s*'((?:[^'\\]|\\.){2,90})'/g)].pop();
      where = 'Card: ' + (row ? row[1].replace(/\\'/g, "'") : 'listing');
    }
    use(slot(m[1], 'unsplash', unsplash(m[1])), page, where);
  }
  for (const m of t.matchAll(/(assets\/[\w./-]+\.(?:jpe?g|png|webp|svg))/g)) {
    const pre = t.slice(Math.max(0, m.index - 900), m.index), fc = [...t.slice(m.index, m.index + 400).matchAll(/<figcaption>(?:<small>[^<]*<\/small>)?([^<]+)</g)][0];
    use(slot(m[1], 'local', m[1]), page, fc ? 'Experience strip: ' + fc[1] : 'Page content');
  }
  for (const m of t.matchAll(/'@([\w-]+)'/g)) {
    const row = [...t.slice(Math.max(0, m.index - 400), m.index).matchAll(/\[\s*'((?:[^'\\]|\\.){2,90})'/g)].pop();
    use(slot(`assets/store/${m[1]}.jpg`, 'local', `assets/store/${m[1]}.jpg`), page, 'Card: ' + (row ? row[1] : 'listing'));
  }
  const n = (raw.match(/class="lgo"/g) || []).length;
  if (n) use(slot('logo', 'logo', logo, 'Mega Rewards logo'), page, 'Header and footer logo'), (A.get('logo').pages[page].count = n);
}
const assets = [...A.values()].map((a) => {
  const pg = Object.entries(a.pages).map(([page, p]) => ({ page, count: p.count, where: [...p.where].slice(0, 8) }));
  return { key: a.key, kind: a.kind, label: a.label, src: a.src, type: 'image', total: pg.reduce((s, p) => s + p.count, 0), pages: pg };
}).sort((a, b) => b.total - a.total);
fs.writeFileSync(path.join(root, 'media-manifest.json'), JSON.stringify({ generated: new Date().toISOString(), assets }, null, 1));
console.log(assets.length + ' assets;', assets.reduce((s, a) => s + a.total, 0) + ' placements across ' + pages.length + ' pages');
assets.slice(0, 6).forEach((a) => console.log(' ', a.key.padEnd(30), String(a.total).padStart(3), a.pages.map((p) => p.page.replace('.html', '')).join(',')));
