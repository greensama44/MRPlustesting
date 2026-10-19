import { mediaCatalog } from '../media-catalog.js';

const $ = (selector) => document.querySelector(selector);
const PAGE_LABELS = {
  index: 'Homepage',
  giveaways: 'Giveaways',
  winners: 'Winners',
  plus: 'Membership and subscription',
  account: 'Account',
  community: 'Community',
  partner: 'Partner',
  profile: 'Profile',
  rewards: 'Rewards',
  store: 'Store',
  tipping: 'Mega Tipping'
};
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']);
const state = {
  revision: 0,
  replacements: {},
  pending: {},
  library: [],
  selectedItem: null,
  previewMode: 'desktop',
  previewPage: null
};

function mediaUrl(id) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=75&w=900`;
}

function resolvedUrl(url) {
  return url.startsWith('/') && !url.startsWith('//') ? new URL(url, location.origin).href : url;
}

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  return readApiResponse(response);
}

async function readApiResponse(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('The Media Manager API is unavailable. Run the site with Vercel Functions (vercel dev) or deploy it to Vercel; a static-file server cannot load or save media.');
  }
  if (!response.ok) {
    const message = response.status === 405
      ? 'The server rejected this request (405). The Media Manager API is not enabled on this server. Run the site with Vercel Functions (vercel dev) or deploy the API files to Vercel.'
      : body.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

function showNotice(message, error = false) {
  const box = $('#manager-notice');
  box.textContent = message;
  box.classList.toggle('error', error);
  box.hidden = false;
}

function currentUrl(id) {
  return state.replacements[id] || mediaUrl(id);
}

function wantedUrl(id) {
  if (!Object.hasOwn(state.pending, id)) return currentUrl(id);
  if (!state.pending[id]) return mediaUrl(id);
  return state.pending[id];
}

function typeForUrl(url) {
  return state.library.find((asset) => asset.url === url)?.type ||
    (/\.(?:mp4|webm)(?:[?#]|$)/i.test(url) ? 'video/' : '');
}

function updatePendingLabel() {
  const count = Object.keys(state.pending).length;
  $('#pending-label').textContent = count ? `${count} pending replacement${count === 1 ? '' : 's'}` : 'No pending changes';
  $('#save-button').disabled = !count;
  $('#discard-button').disabled = !count;
}

function mediaPreview(url, label) {
  const wrap = document.createElement('div');
  wrap.className = 'media-preview';
  if (!url) {
    const empty = document.createElement('span');
    empty.className = 'empty-preview';
    empty.textContent = label;
    wrap.append(empty);
    return wrap;
  }
  const isVideo = typeForUrl(url).startsWith('video/') ||
    /\.(?:mp4|webm)(?:[?#]|$)/i.test(url) || url.includes('video/');
  const media = document.createElement(isVideo ? 'video' : 'img');
  if (isVideo) {
    media.controls = true;
    media.muted = true;
    media.preload = 'metadata';
  } else {
    media.alt = label;
    media.loading = 'lazy';
  }
  media.src = resolvedUrl(url);
  media.onerror = () => {
    wrap.replaceChildren();
    const error = document.createElement('span');
    error.className = 'empty-preview';
    error.textContent = 'Preview unavailable';
    wrap.append(error);
  };
  wrap.append(media);
  return wrap;
}

function renderCard(item) {
  const card = document.createElement('article');
  card.className = 'asset-card';

  const info = document.createElement('div');
  info.className = 'asset-info';
  const title = document.createElement('h3');
  title.textContent = item.label;
  const id = document.createElement('span');
  id.className = 'asset-id';
  id.textContent = `Unsplash photo-${item.id}`;
  const uses = document.createElement('ul');
  uses.className = 'use-list';
  const usesTitle = document.createElement('li');
  usesTitle.innerHTML = '<strong>Page and location</strong>';
  uses.append(usesTitle);
  for (const [page, locations] of Object.entries(item.uses)) {
    const line = document.createElement('li');
    line.textContent = `${PAGE_LABELS[page]}: ${locations.join(', ')}`;
    uses.append(line);
  }
  info.append(title, id, uses);

  const current = document.createElement('div');
  current.className = 'media-column';
  const currentLabel = document.createElement('p');
  currentLabel.className = 'column-label';
  currentLabel.textContent = 'Current media';
  const currentPreview = mediaPreview(currentUrl(item.id), 'Current image preview');
  current.append(currentLabel, currentPreview);

  const replacement = document.createElement('div');
  replacement.className = 'media-column';
  const replacementLabel = document.createElement('p');
  replacementLabel.className = 'column-label';
  replacementLabel.textContent = 'Replacement media';
  let proposedPreview = mediaPreview(wantedUrl(item.id), 'Choose an image or enter a media URL');
  const urlInput = document.createElement('input');
  urlInput.className = 'replacement-url';
  urlInput.type = 'url';
  urlInput.inputMode = 'url';
  urlInput.placeholder = 'https://… or /site-relative-file';
  urlInput.setAttribute('aria-label', `Replacement URL for ${item.label}`);
  urlInput.value = Object.hasOwn(state.pending, item.id)
    ? state.pending[item.id]
    : (state.replacements[item.id] || '');
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const previewButton = document.createElement('button');
  previewButton.className = 'button secondary';
  previewButton.type = 'button';
  previewButton.textContent = 'Preview on page';
  previewButton.addEventListener('click', () => previewItem(item));
  const originalButton = document.createElement('button');
  originalButton.className = 'button subtle';
  originalButton.type = 'button';
  originalButton.textContent = 'Use original';
  originalButton.addEventListener('click', () => setPending(item.id, ''));
  const uploadLabel = document.createElement('label');
  uploadLabel.className = 'button subtle upload-label';
  uploadLabel.textContent = 'Upload';
  const upload = document.createElement('input');
  upload.className = 'upload-input';
  upload.type = 'file';
  upload.accept = [...ALLOWED_TYPES].join(',');
  upload.setAttribute('aria-label', `Upload a replacement for ${item.label}`);
  upload.addEventListener('change', () => uploadFile(upload.files[0], item));
  uploadLabel.append(upload);
  actions.append(previewButton, originalButton, uploadLabel);
  replacement.append(replacementLabel, proposedPreview, urlInput, actions);

  urlInput.addEventListener('input', () => {
    const value = urlInput.value.trim();
    setPendingValue(item.id, value, false);
    const nextPreview = mediaPreview(value || currentUrl(item.id), 'Choose an image or enter a media URL');
    proposedPreview.replaceWith(nextPreview);
    proposedPreview = nextPreview;
    if (state.previewPage && Object.hasOwn(item.uses, state.previewPage)) schedulePagePreview();
  });

  card.append(info, current, replacement);
  return card;
}

function renderAssets() {
  const page = $('#page-filter').value;
  const assets = mediaCatalog.filter((item) => page === 'all' || Object.hasOwn(item.uses, page));
  $('#asset-count').textContent = `${assets.length} media items`;
  const list = $('#asset-list');
  list.replaceChildren(...assets.map(renderCard));
}

function renderLibrary() {
  const list = $('#library-list');
  list.replaceChildren();
  if (!state.library.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No uploads yet. Your existing website images are shown above.';
    list.append(empty);
    return;
  }
  for (const asset of state.library) {
    const card = document.createElement('article');
    card.className = 'library-item';
    card.append(mediaPreview(asset.url, asset.name));
    const name = document.createElement('p');
    name.className = 'library-name';
    name.textContent = asset.name;
    const meta = document.createElement('p');
    meta.className = 'library-meta';
    meta.textContent = `${asset.type} · ${formatBytes(asset.size)}`;
    const use = document.createElement('button');
    use.className = 'button subtle';
    use.type = 'button';
    use.textContent = 'Use for selected item';
    use.disabled = !state.selectedItem;
    use.addEventListener('click', () => {
      if (state.selectedItem) {
        setPending(state.selectedItem, asset.url);
        renderAssets();
      }
    });
    card.append(name, meta, use);
    list.append(card);
  }
}

function setPending(id, url) {
  setPendingValue(id, url, true);
}

function setPendingValue(id, url, rerender) {
  if ((url || '') === (state.replacements[id] || '')) delete state.pending[id];
  else state.pending[id] = url || '';
  updatePendingLabel();
  if (rerender) {
    renderAssets();
    renderLibrary();
    renderPagePreview();
  }
}

function previewItem(item) {
  state.selectedItem = item.id;
  const selectedPage = $('#page-filter').value;
  state.previewPage = selectedPage !== 'all' && Object.hasOwn(item.uses, selectedPage)
    ? selectedPage
    : Object.keys(item.uses)[0];
  $('#preview-description').textContent = `${PAGE_LABELS[state.previewPage]} — pending replacements are shown only in this preview.`;
  renderLibrary();
  renderPagePreview();
}

let previewTimer;
function schedulePagePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPagePreview, 350);
}

function renderPagePreview() {
  if (!state.previewPage) return;
  const overrides = {};
  for (const item of mediaCatalog) {
    if (!Object.hasOwn(item.uses, state.previewPage)) continue;
    if (Object.hasOwn(state.pending, item.id)) {
      const url = state.pending[item.id];
      overrides[item.id] = { url, type: url ? typeForUrl(url) : '' };
    }
  }
  const page = new URL(`../${state.previewPage}.html`, location.href);
  page.searchParams.set('mediaPreview', JSON.stringify(overrides));
  $('#site-preview').src = page.href;
  $('#preview-frame-wrap').classList.toggle('empty', false);
  $('#preview-frame-wrap').classList.toggle('mobile', state.previewMode === 'mobile');
}

async function uploadFile(file, item = null) {
  if (!file) return;
  if (!ALLOWED_TYPES.has(file.type)) {
    showNotice('Choose a JPG, PNG, WebP, MP4 or WebM file.', true);
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    showNotice('Uploads must be 4 MB or smaller.', true);
    return;
  }
  try {
    const response = await fetch('/api/media-upload', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': file.type,
        'x-media-revision': String(state.revision),
        'x-media-name': file.name
      },
      body: file
    });
    const body = await readApiResponse(response);
    state.library.unshift(body.asset);
    state.revision = body.revision;
    if (item) setPending(item.id, body.asset.url);
    else if (state.selectedItem) setPending(state.selectedItem, body.asset.url);
    renderLibrary();
    showNotice('Upload added to your media library. It will not appear publicly until you save changes.');
  } catch (error) {
    showNotice(error.message, true);
  }
}

async function loadState() {
  const result = await request('/api/media-config?manage=1');
  state.revision = result.revision || 0;
  state.replacements = result.replacements || {};
  state.library = (result.library || []).map((asset) => ({
    ...asset,
    type: asset.contentType,
    url: `/api/media-file?id=${asset.id}`
  }));
  state.pending = {};
  renderAssets();
  renderLibrary();
  updatePendingLabel();
}

$('#page-filter').addEventListener('change', renderAssets);
$('#save-button').addEventListener('click', async () => {
  const replacements = { ...state.replacements };
  for (const [id, url] of Object.entries(state.pending)) {
    if (url) replacements[id] = url;
    else delete replacements[id];
  }
  try {
    const result = await request('/api/media-config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revision: state.revision, replacements })
    });
    state.revision = result.revision;
    state.replacements = replacements;
    state.pending = {};
    renderAssets();
    updatePendingLabel();
    showNotice('Changes saved. Refresh the website to see the new media.');
    renderPagePreview();
  } catch (error) {
    showNotice(error.message, true);
  }
});

$('#discard-button').addEventListener('click', () => {
  state.pending = {};
  renderAssets();
  renderLibrary();
  updatePendingLabel();
  showNotice('Pending replacements discarded. Uploaded files remain available in the library.');
  renderPagePreview();
});

$('#library-upload').addEventListener('change', (event) => {
  uploadFile(event.currentTarget.files[0]);
  event.currentTarget.value = '';
});

document.querySelectorAll('[data-preview-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    state.previewMode = button.dataset.previewMode;
    document.querySelectorAll('[data-preview-mode]').forEach((mode) => mode.classList.toggle('active', mode === button));
    $('#preview-frame-wrap').classList.toggle('mobile', state.previewMode === 'mobile');
  });
});

loadState().catch((error) => {
  showNotice(error.message, true);
});
