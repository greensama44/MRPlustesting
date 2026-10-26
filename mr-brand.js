/* Mega Rewards brand layer for the inner pages (pairs with mr-brand.css).
   Adds the "Just won" ticker, pixel blocks on imagery, branded giveaway thumbnails
   and the Mega red / yellow section colours. Winners come from giveaways-data.js (window.MR_WINNERS). */
(function () {
  var doc = document, root = doc.documentElement;
  var BIG = '0,0;1,0;2,0;3,0;0,1;1,1;2,1;0,2;1,2;0,3;4,0d;2,2d;0,4d;4,2;2,4;5,1g';
  var SMALL = '0,0;1,0;2,0;0,1;1,1;0,2;3,0d;1,2d;3,2;2,3g';
  var HERO = '0,0;1,0;2,0;3,0;4,0;0,1;1,1;2,1;3,1;0,2;1,2;2,2;0,3;1,3;0,4;5,0d;3,2d;1,4d;5,2;3,4;6,1g';

  function blocks(host, corner, size, pattern) {
    if (!host || host.querySelector(':scope > .pxs')) return;
    var h = doc.createElement('div');
    h.className = 'pxs pa-' + corner + (size ? ' ' + size : '');
    h.setAttribute('aria-hidden', 'true');
    pattern.split(';').forEach(function (t) {
      var m = /^(\d+),(\d+)([a-z]?)$/.exec(t.trim()); if (!m) return;
      var i = doc.createElement('i');
      i.style.setProperty('--cx', m[1]); i.style.setProperty('--cy', m[2]);
      if (m[3]) i.className = m[3];
      h.appendChild(i);
    });
    host.appendChild(h);
  }

  /* Featured giveaway cards become branded thumbnails */
  var STAIR = [[0,5],[1,5],[2,5],[3,5],[0,6],[1,6],[0,7],[4,5,'b'],[2,6,'a'],[1,7,'b'],[0,8,'a']];
  var cardN = 0;
  function brandCard(cd) {
    if (cd.classList.contains('bt') || cd.classList.contains('all')) return;
    var img = cd.querySelector(':scope > img'), box = cd.querySelector(':scope > div');
    if (!img || !box) return;
    cd.classList.add('bt', 'g' + (cardN++ % 2));
    var cpx = doc.createElement('div'); cpx.className = 'cpx'; cpx.setAttribute('aria-hidden', 'true');
    STAIR.forEach(function (p) {
      var i = doc.createElement('i'); i.style.setProperty('--cx', p[0]); i.style.setProperty('--cy', p[1]);
      if (p[2]) i.className = p[2]; cpx.appendChild(i);
    });
    img.after(cpx);
    box.classList.add('ctx');
    var tag = box.querySelector('.tg3'), name = box.querySelector('b');
    if (tag) {
      cd.appendChild(tag);
      if (name) { var l = doc.createElement('em'); l.className = 'lbl'; l.textContent = tag.textContent + ' giveaway'; box.insertBefore(l, name); }
    }
  }

  function decorate(scope) {
    scope.querySelectorAll('.fcg .cd, .mc4 .cd').forEach(brandCard);
    scope.querySelectorAll('.gc .im, .pc .im, .qc .im').forEach(function (e) { blocks(e, 'tr', 'sm3', SMALL); });
    scope.querySelectorAll('.ptc, .tl').forEach(function (e) { blocks(e, 'tr', 'sm3', SMALL); });
  }

  /* Hero, sections and the join banner */
  var ph = doc.querySelector('.ph2');
  /* hero text sits bottom-left, so the staircase rises from the bottom-right; skipped where the hero holds a tile row */
  if (ph && !doc.querySelector('.ac2') && !ph.querySelector('.dept')) blocks(ph, 'br', '', BIG);
  var end = doc.querySelector('.end');
  if (end) { blocks(end, 'bl', '', HERO); blocks(end, 'tr', 'sm2', SMALL); }
  /* the first dark section turns Mega red; a points section (earn tiles) stays black and passes the red on */
  var darks = [].slice.call(doc.querySelectorAll('.dk2'));
  var pts = darks.filter(function (d) { return d.querySelector('.earn'); })[0];
  var red = darks.filter(function (d) { return d !== pts; })[0];
  if (red) red.classList.add('mr-red');
  ['#grid', '#plans'].forEach(function (s) { var e = doc.querySelector(s); if (e) e.classList.add('mr-yel'); });
  decorate(doc);
  new MutationObserver(function (list) {
    list.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) decorate(n.parentNode || doc); }); });
  }).observe(doc.body, { childList: true, subtree: true });

  /* Winners ticker above the nav (marketing pages only) */
  function ticker() {
    var W = window.MR_WINNERS || [], nav = doc.querySelector('.nav');
    if (!W.length || !nav || doc.querySelector('.wtk')) return;
    var esc = function (x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var one = W.map(function (w) { return '<span><b>' + esc(w.who) + '</b> ' + esc(w.won) + ' <em>· ' + esc(w.where) + '</em></span>'; }).join('');
    var k = doc.createElement('div');
    k.className = 'wtk'; k.setAttribute('aria-label', 'Recent winners');
    k.innerHTML = '<span class="wlb">Just won</span><div class="wtr"><div class="wtt">' + one + one + '</div></div><a class="wsa" href="winners.html">See all winners</a>';
    [].slice.call(k.querySelectorAll('.wtt span'), W.length).forEach(function (s) { s.setAttribute('aria-hidden', 'true'); });
    nav.parentNode.insertBefore(k, nav);
    root.classList.add('tk');
  }
  if (!doc.querySelector('.ac2, .pp-px')) {
    if (window.MR_WINNERS) ticker();
    else { var s = doc.createElement('script'); s.src = 'giveaways-data.js'; s.onload = ticker; doc.head.appendChild(s); }
  }
  var scr = function () { doc.body.classList.toggle('scr', scrollY > 40); };
  addEventListener('scroll', scr, { passive: true }); scr();
})();
