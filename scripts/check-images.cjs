#!/usr/bin/env node
/*
  Lists every Unsplash photo ID the site uses and (unless --list is passed) checks that each one
  still resolves on the Unsplash CDN, so removed or moved photos are caught before visitors see them.

    node scripts/check-images.cjs          # check every ID (needs internet)
    node scripts/check-images.cjs --list   # just list IDs and the pages that use them
*/
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const uses = new Map();
for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
  const s = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of s.matchAll(/\b(\d{10,13}-[0-9a-f]{12})\b/g)) {
    if (!uses.has(m[1])) uses.set(m[1], new Map());
    uses.get(m[1]).set(f, (uses.get(m[1]).get(f) || 0) + 1);
  }
}
const rows = [...uses].map(([id, pages]) => ({ id, pages: [...pages].map(([p, n]) => `${p}${n > 1 ? ' x' + n : ''}`).join(', ') }));
rows.sort((a, b) => b.pages.length - a.pages.length);
if (process.argv.includes('--list')) {
  rows.forEach(r => console.log(r.id.padEnd(28), r.pages));
  console.log(`\n${rows.length} unique photo IDs`);
  process.exit(0);
}
(async () => {
  let bad = 0;
  for (const r of rows) {
    const url = `https://images.unsplash.com/photo-${r.id}?auto=format&fit=crop&q=60&w=200`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) { bad++; console.log(`MISSING (${res.status})  ${r.id}  used on: ${r.pages}`); }
    } catch (e) { bad++; console.log(`ERROR  ${r.id}  ${e.message}`); }
  }
  console.log(bad ? `\n${bad} of ${rows.length} photos need replacing.` : `\nAll ${rows.length} photos resolve.`);
  process.exit(bad ? 1 : 0);
})();
