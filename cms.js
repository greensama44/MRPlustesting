/* Mega Rewards site runtime: applies managed media replacements and CMS text over the page's built-in defaults.
   Defaults stay in the HTML, so the site renders normally if /api/content is unreachable. */
(function () {
  'use strict';
  var K = 'mr_media_v2', PH = /photo-(\d{10,13}-[0-9a-f]{12})/, mq = matchMedia('(max-width:700px)'), M = null, pv = /[?&]cms=preview/.test(location.search);
  var st = document.createElement('style');
  st.textContent = '.mrv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;pointer-events:none}';
  document.head.appendChild(st);

  function keyOf(el) {
    if (el.classList.contains('lgo')) return 'logo';
    var s = el.getAttribute('src') || '', m = PH.exec(s);
    if (m) return m[1];
    if (/^(data:|https?:|blob:)/.test(s)) return null;
    try { s = decodeURIComponent(s.split('?')[0]).replace(/^\.?\//, ''); } catch (e) { return null; }
    return /^assets\//.test(s) ? s : null;
  }
  function lazy(v) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection && navigator.connection.saveData) || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (x.isIntersecting) { if (v.getAttribute('src') !== v.dataset.u) v.src = v.dataset.u; var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
      });
    }, { rootMargin: '200px' }).observe(v);
  }
  function vid(el, k, poster) {
    var u = M.videos[k], p = el.parentElement, ex = el.nextElementSibling;
    ex = ex && ex.classList && ex.classList.contains('mrv') ? ex : null;
    if (!u || !p) { if (ex) ex.remove(); return; }
    if (ex) { if (ex.dataset.u !== u) { ex.dataset.u = u; ex.removeAttribute('src'); lazy(ex); } return; }
    if (getComputedStyle(p).position === 'static') p.style.position = 'relative';
    var v = document.createElement('video');
    v.className = 'mrv'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none'; v.tabIndex = -1;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.dataset.u = u; if (poster) v.poster = poster;
    el.after(v); lazy(v);
  }
  function img(el) {
    if (!M) return;
    var k = el.dataset.mk || keyOf(el);
    if (!k) return;
    el.dataset.mk = k;
    var u = (mq.matches && M.mobile[k]) || M.images[k], cur = el.getAttribute('src') || '';
    if (u) { if (cur !== u) { if (!el.dataset.o && cur) el.dataset.o = cur; el.removeAttribute('srcset'); el.setAttribute('src', u); } }
    else if (el.dataset.o && cur !== el.dataset.o) el.setAttribute('src', el.dataset.o);
    vid(el, k, u || el.dataset.o || cur);
  }
  function text() {
    document.querySelectorAll('[data-cms]').forEach(function (e) {
      if (!e.dataset.def) e.dataset.def = e.textContent;
      var v = M.text[e.dataset.cms];
      e.textContent = v ? v : e.dataset.def;
    });
  }
  function apply(m) {
    M = { images: m.images || {}, mobile: m.mobile || {}, videos: m.videos || {}, text: m.text || {} };
    window.MRC = m;
    document.querySelectorAll('img').forEach(img);
    text();
    document.dispatchEvent(new Event('mrcontent'));
  }
  new MutationObserver(function (ms) {
    if (!M) return;
    ms.forEach(function (m) {
      if (m.type === 'attributes') { if (m.target.tagName === 'IMG') img(m.target); return; }
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.tagName === 'IMG') img(n);
        if (n.querySelectorAll) n.querySelectorAll('img').forEach(img);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  mq.addEventListener && mq.addEventListener('change', function () { if (M) document.querySelectorAll('img[data-mk]').forEach(img); });

  window.MRC = { n: 0, text: {}, images: {}, mobile: {}, videos: {}, giveaways: [] };
  var cached = null;
  try { cached = !pv && JSON.parse(localStorage.getItem(K)); } catch (e) {}
  if (cached) { M = { images: cached.images || {}, mobile: cached.mobile || {}, videos: cached.videos || {}, text: cached.text || {} }; window.MRC = cached; document.addEventListener('DOMContentLoaded', function () { apply(cached); }); }
  fetch('/api/content' + (pv ? '?preview=1' : ''), { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) {
      if (!c) return;
      if (!pv) try { localStorage.setItem(K, JSON.stringify(c)); } catch (e) {}
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { apply(c); }); else apply(c);
    }).catch(function () {});
})();
