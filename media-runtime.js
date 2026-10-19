function previewOverrides() {
  const value = new URLSearchParams(location.search).get('mediaPreview');
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.error('Mega Rewards media preview data is invalid:', error);
    return {};
  }
}

function runMediaOverrides(replacements, mediaTypes) {
  const overrides = { ...replacements };
  const types = { ...mediaTypes };
  for (const [id, replacement] of Object.entries(previewOverrides())) {
    if (!replacement || typeof replacement.url !== 'string') {
      delete overrides[id];
      delete types[id];
    } else {
      overrides[id] = replacement.url;
      types[id] = replacement.type || '';
    }
  }

  const originals = new WeakMap();
  const isVideo = (url, type) => type?.startsWith('video/') || /\.(?:mp4|webm)(?:[?#]|$)/i.test(url);
  const apply = (element) => {
    const source = element.getAttribute('src') || '';
    const photo = source.match(/\/photo-(\d+-[a-z0-9]+)/i);
    const id = element.dataset.p || (photo && photo[1]);
    if (!id) return;
    const replacement = overrides[id];
    if (!replacement) return;
    const video = isVideo(replacement, types[id]);
    if (video && element instanceof HTMLImageElement) {
      const original = element.cloneNode(true);
      const player = document.createElement('video');
      for (const attribute of element.attributes) {
        if (attribute.name !== 'alt' && attribute.name !== 'src') player.setAttribute(attribute.name, attribute.value);
      }
      player.dataset.p = id;
      player.setAttribute('aria-label', element.alt || 'Website video');
      player.autoplay = true;
      player.controls = false;
      player.loop = true;
      player.muted = true;
      player.playsInline = true;
      player.preload = 'metadata';
      player.style.display = 'block';
      player.style.width = '100%';
      player.style.height = '100%';
      player.style.objectFit = 'cover';
      player.src = replacement;
      originals.set(player, original);
      element.replaceWith(player);
    } else if (!video && element instanceof HTMLVideoElement) {
      const original = originals.get(element);
      const image = original || document.createElement('img');
      image.dataset.p = id;
      image.src = replacement;
      originals.set(image, image.cloneNode(true));
      element.replaceWith(image);
    } else if (video && element instanceof HTMLVideoElement) {
      if (element.getAttribute('src') !== replacement) element.src = replacement;
    } else if (!video && element instanceof HTMLImageElement) {
      if (element.getAttribute('src') !== replacement) element.src = replacement;
    }
  };
  document.querySelectorAll('img[data-p], video[data-p], img[src*="images.unsplash.com/photo-"], video[src*="images.unsplash.com/photo-"]').forEach(apply);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target instanceof HTMLImageElement || record.target instanceof HTMLVideoElement) apply(record.target);
        continue;
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('img[data-p], video[data-p], img[src*="images.unsplash.com/photo-"], video[src*="images.unsplash.com/photo-"]')) apply(node);
        node.querySelectorAll('img[data-p], video[data-p], img[src*="images.unsplash.com/photo-"], video[src*="images.unsplash.com/photo-"]').forEach(apply);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-p'] });
}

fetch('/api/media-config', { credentials: 'same-origin', cache: 'no-store' })
  .then((response) => {
    if (!response.ok) throw new Error(`Media configuration request failed (${response.status})`);
    return response.json();
  })
  .then((state) => runMediaOverrides(state.replacements || {}, state.mediaTypes || {}))
  .catch((error) => console.error('Mega Rewards media replacements could not be loaded:', error));
