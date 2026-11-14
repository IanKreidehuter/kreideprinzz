/* My Mood Journal — frontend (index.html + admin.html). Vanilla JS, no dependencies. */
(() => {
'use strict';

/* =====================================================================
   CONFIG — paste your deployed Google Apps Script Web App URL (ends in /exec)
   ===================================================================== */
const API_URL = 'https://script.google.com/macros/s/AKfycbyxg6kw0d_e2bDLtua6cvx4sH1P3Y8kDnOQOZRadrMZkc-2iwyCoEpJP42wvSM0zWgb-A/exec';

const MAX_UPLOAD_MB = 25;
const TOKEN_KEY = 'moodjournal.token';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];

/* =====================================================================
   Small helpers
   ===================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);

function h(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
  }
  kids.flat().forEach(c => {
    if (c === null || c === undefined || c === false) return;
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return n;
}

let toastTimer;
function toast(message, kind = 'ok') {
  let t = $('#toast');
  if (!t) { t = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = message;
  t.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3800);
}

function showMsg(el, text, kind = '') {
  if (!el) return;
  el.textContent = text || '';
  el.className = `msg ${kind}`.trim();
  el.hidden = !text;
}

function parseLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
}
function fmtEntryDate(s) {
  const d = parseLocal(s);
  return d ? d.toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : String(s || '');
}
function fmtStamp(iso) {
  const d = new Date(iso);
  return isNaN(d) ? String(iso || '') : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

/* =====================================================================
   API  (all requests go to the Apps Script /exec URL with fetch)
   POST bodies are text/plain JSON so the browser sends a "simple" request (no CORS preflight).
   ===================================================================== */
async function api(action, payload = {}, method = 'POST') {
  if (!/^https:\/\/script\.google\.com\//.test(API_URL)) {
    throw new Error('Set API_URL at the top of script.js to your deployed Web App /exec URL.');
  }
  let res;
  try {
    if (method === 'GET') {
      const qs = new URLSearchParams({ action });
      Object.entries(payload).forEach(([k, v]) => { if (v !== '' && v != null) qs.set(k, v); });
      res = await fetch(`${API_URL}?${qs}`);
    } else {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload })
      });
    }
  } catch (e) {
    throw new Error('Could not reach the server. Check your connection and the API URL.');
  }
  let json;
  try { json = await res.json(); } catch (e) { throw new Error('The server returned an unexpected response. Is the Web App deployed for "Anyone"?'); }
  if (!json || !json.success) throw new Error((json && json.message) || 'Request failed');
  return json.data;
}

/* =====================================================================
   Media: URL validation + safe rendering
   ===================================================================== */
function parseHttps(s) {
  try {
    const u = new URL(String(s).trim());
    return u.protocol === 'https:' && !u.username && !u.password ? u : null;
  } catch (e) { return null; }
}

/** Returns {kind:'youtube'|'vimeo'|'file', src} or null. Embed URLs are BUILT from parsed IDs, never copied from input. */
function videoKind(u) {
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else { const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/); id = m && m[1]; }
  }
  if (id && /^[\w-]{11}$/.test(id)) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}` };
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/\/(?:video\/)?(\d{5,})/);
    if (m) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${m[1]}` };
  }
  if (/\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(u.pathname)) return { kind: 'file', src: u.href };
  return null;
}

function imageSrc(item) {
  if (item.preview) return item.preview;                       // local blob preview (not yet uploaded)
  if (item.source === 'drive' && /^[\w-]{10,}$/.test(item.driveId || '')) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(item.driveId)}&sz=w2000`;
  }
  const u = parseHttps(item.url);
  return u ? u.href : null;
}

function videoSource(item) {
  if (item.preview) return { kind: 'file', src: item.preview };
  if (item.source === 'drive' && /^[\w-]{10,}$/.test(item.driveId || '')) {
    return { kind: 'drive', src: `https://drive.google.com/file/d/${encodeURIComponent(item.driveId)}/preview` };
  }
  const u = parseHttps(item.url);
  return u ? videoKind(u) : null;
}

function fallbackBody(item, text) {
  const u = item.source === 'external' ? parseHttps(item.url) : null;
  return h('div', { class: 'media-fallback' },
    h('span', { text }),
    u ? h('a', { href: u.href, target: '_blank', rel: 'noopener noreferrer nofollow', text: 'Open original ↗' }) : null);
}

function mediaNode(item, gallery, index) {
  if (item.type === 'image') {
    const src = imageSrc(item);
    const fig = h('figure', { class: 'media media-img' });
    if (!src) { fig.append(fallbackBody(item, 'Image unavailable.')); return fig; }
    const img = h('img', { src, alt: item.alt || 'Journal photo', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => fig.replaceChildren(fallbackBody(item, 'This image could not be loaded.')));
    fig.append(h('button', {
      type: 'button', class: 'zoom', 'aria-label': 'Open image larger',
      onclick: () => openLightbox(gallery, index)
    }, img));
    return fig;
  }

  const v = videoSource(item);
  if (!v) return h('div', { class: 'media media-video' }, fallbackBody(item, 'This video link is not supported.'));

  if (v.kind === 'file') {
    const wrap = h('div', { class: 'media media-video' });
    const vid = h('video', { controls: true, preload: 'metadata', playsinline: true, src: v.src });
    vid.addEventListener('error', () => wrap.replaceChildren(fallbackBody(item, 'This video could not be played.')));
    wrap.append(vid);
    return wrap;
  }
  // YouTube / Vimeo / Drive: sandboxed iframe on a fixed allow-list of hosts
  return h('div', { class: 'media media-embed' }, h('iframe', {
    src: v.src, title: 'Embedded video', loading: 'lazy', allowfullscreen: true,
    referrerpolicy: 'strict-origin-when-cross-origin',
    sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups',
    allow: 'fullscreen; picture-in-picture; encrypted-media'
  }));
}

function renderMedia(items) {
  const sorted = [...(items || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!sorted.length) return null;
  const gallery = sorted.filter(m => m.type === 'image').map(imageSrc).filter(Boolean);
  let imgIdx = -1;
  const nodes = sorted.map(m => {
    if (m.type === 'image') imgIdx++;
    return mediaNode(m, gallery, imgIdx);
  });
  return h('div', { class: `media-grid n${Math.min(sorted.length, 4)}` }, nodes);
}

/* ---------- lightbox ---------- */
let lb, lbState = { list: [], i: 0 };
function ensureLightbox() {
  if (lb) return lb;
  const img = h('img', { alt: '' });
  const count = h('p', { class: 'lb-count' });
  const step = d => { lbState.i = (lbState.i + d + lbState.list.length) % lbState.list.length; paint(); };
  const paint = () => {
    img.src = lbState.list[lbState.i] || '';
    count.textContent = lbState.list.length > 1 ? `${lbState.i + 1} / ${lbState.list.length}` : '';
    lb.classList.toggle('single', lbState.list.length < 2);
  };
  lb = h('dialog', { class: 'lightbox', 'aria-label': 'Image viewer' },
    h('button', { type: 'button', class: 'lb-close', 'aria-label': 'Close', onclick: () => lb.close(), text: '✕' }),
    h('button', { type: 'button', class: 'lb-prev', 'aria-label': 'Previous image', onclick: () => step(-1), text: '‹' }),
    img,
    h('button', { type: 'button', class: 'lb-next', 'aria-label': 'Next image', onclick: () => step(1), text: '›' }),
    count);
  lb.paint = paint;
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  document.body.append(lb);
  return lb;
}
function openLightbox(list, i) {
  if (!list.length) return;
  ensureLightbox();
  lbState = { list, i: Math.max(0, i) };
  lb.paint();
  if (!lb.open) lb.showModal();
}

/* =====================================================================
   Emotion catalog + chips
   ===================================================================== */
let CATALOG = [];
let CAT_OF = {};
function setCatalog(cat) {
  CATALOG = cat || [];
  CAT_OF = {};
  CATALOG.forEach(c => c.emotions.forEach(e => { CAT_OF[e] = c.id; }));
}

function chipList(emotions, onPick) {
  return h('ul', { class: 'chips', 'aria-label': 'Feelings' }, emotions.map(e => {
    const inner = onPick
      ? h('button', { type: 'button', class: 'chip chip-btn', dataset: { cat: CAT_OF[e] || '' }, title: `Show entries feeling ${e}`, onclick: () => onPick(e), text: e })
      : h('span', { class: 'chip', dataset: { cat: CAT_OF[e] || '' }, text: e });
    return h('li', null, inner);
  }));
}

/* =====================================================================
   Entry card (used by the feed, the admin preview dialog)
   ===================================================================== */
function renderEntry(e, opts = {}) {
  const edited = e.updatedAt && e.createdAt && e.updatedAt !== e.createdAt;
  const links = (e.links || []).map(parseUrlLoose).filter(Boolean);
  return h('article', { class: 'entry card' },
    h('header', { class: 'entry-head' },
      h('h2', { text: e.title }),
      h('time', { datetime: e.entryDate, text: fmtEntryDate(e.entryDate) })),
    h('p', { class: 'prose', text: e.content }),
    renderMedia(e.media),
    chipList(e.emotions || [], opts.onEmotion),
    links.length ? h('ul', { class: 'links' }, links.map(u =>
      h('li', null, h('a', { href: u.href, target: '_blank', rel: 'noopener noreferrer nofollow', text: `${u.hostname.replace(/^www\./, '')}${u.pathname.length > 1 ? u.pathname.slice(0, 40) : ''} ↗` })))) : null,
    h('footer', { class: 'entry-foot', text: `Saved ${fmtStamp(e.createdAt)}${edited ? ` · edited ${fmtStamp(e.updatedAt)}` : ''}` }));
}
function parseUrlLoose(s) {
  try { const u = new URL(String(s)); return /^https?:$/.test(u.protocol) ? u : null; } catch (e) { return null; }
}

/* =====================================================================
   MOOD CHECKER — pick exactly three feelings from seven categories
   ===================================================================== */
function createMoodChecker(root, { selected = [], onChange } = {}) {
  let sel = selected.slice(0, 3);
  let active = (CATALOG[0] || {}).id;

  const counter = h('span', { class: 'counter', 'aria-live': 'polite' });
  const slots = h('div', { class: 'slots' });
  const hint = h('p', { class: 'hint', role: 'status' });
  const tabs = h('div', { class: 'cats', role: 'tablist', 'aria-label': 'Feeling categories' });
  const panel = h('div', { class: 'panel', role: 'tabpanel' });

  root.replaceChildren(
    h('div', { class: 'tray' },
      h('div', { class: 'tray-top' }, h('h3', { text: 'Your three feelings' }), counter),
      slots, hint),
    tabs, panel);

  const fire = () => onChange && onChange(sel.slice());

  function toggle(emotion, btn) {
    const at = sel.indexOf(emotion);
    if (at >= 0) sel.splice(at, 1);
    else if (sel.length >= 3) {
      hint.textContent = 'You already have three. Remove one first to pick another.';
      if (btn) { btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); }
      return;
    } else sel.push(emotion);
    refresh();
    fire();
  }

  function drawTabs() {
    tabs.replaceChildren(...CATALOG.map(c => {
      const n = c.emotions.filter(x => sel.includes(x)).length;
      return h('button', {
        type: 'button', class: 'cat', role: 'tab', dataset: { cat: c.id },
        'aria-selected': String(c.id === active),
        onclick: () => { active = c.id; drawTabs(); drawPanel(); }
      }, `${c.icon} ${c.label}`, h('span', { class: `n${n ? ' has' : ''}`, text: n || '' }));
    }));
  }

  function drawPanel() {
    const c = CATALOG.find(x => x.id === active);
    if (!c) return;
    panel.dataset.cat = c.id;
    panel.replaceChildren(
      h('h3', { text: `${c.icon} ${c.label}` }),
      h('p', { class: 'desc', text: c.hint }),
      h('ul', { class: 'emos' }, c.emotions.map(e => h('li', null, h('button', {
        type: 'button', class: 'emo', dataset: { emo: e }, 'aria-pressed': String(sel.includes(e)),
        onclick: ev => toggle(e, ev.currentTarget), text: e
      })))));
  }

  function refresh() {
    counter.textContent = `${sel.length}/3`;
    counter.classList.toggle('full', sel.length === 3);
    root.classList.toggle('is-full', sel.length === 3);
    hint.textContent = sel.length === 3 ? 'Perfect — that’s your three. Tap one to swap it.' : 'Browse the categories and tap feelings. Mix them however you like.';
    slots.replaceChildren(...[0, 1, 2].map(i => sel[i]
      ? h('div', { class: 'slot filled' }, sel[i],
          h('button', { type: 'button', class: 'x', 'aria-label': `Remove ${sel[i]}`, onclick: () => toggle(sel[i]), text: '✕' }))
      : h('div', { class: 'slot', text: `Feeling ${i + 1}` })));
    panel.querySelectorAll('.emo').forEach(b => b.setAttribute('aria-pressed', String(sel.includes(b.dataset.emo))));
    drawTabs();
  }

  refresh(); drawPanel();
  return {
    get: () => sel.slice(),
    set(list) { sel = (list || []).slice(0, 3); refresh(); fire(); }
  };
}

/* =====================================================================
   JOURNAL PAGE (index.html)
   ===================================================================== */
function initJournal() {
  const feed = $('#feed'), count = $('#count');
  const f = { q: $('#q'), date: $('#f-date'), month: $('#f-month'), year: $('#f-year'), emotion: $('#f-emotion') };
  const years = new Set();
  let reqId = 0, timer;

  const params = () => ({ q: f.q.value.trim(), date: f.date.value, month: f.month.value, year: f.year.value, emotion: f.emotion.value });
  const hasFilter = () => Object.values(params()).some(Boolean);

  function fillYears() {
    const cur = f.year.value;
    f.year.replaceChildren(h('option', { value: '', text: 'All years' }),
      ...[...years].sort().reverse().map(y => h('option', { value: y, text: y })));
    f.year.value = cur;
  }

  async function load() {
    const my = ++reqId;
    feed.setAttribute('aria-busy', 'true');
    try {
      const data = await api('list', params(), 'GET');
      if (my !== reqId) return;
      const entries = data.entries || [];
      if (!hasFilter() || years.size === 0) { entries.forEach(e => years.add(e.entryDate.slice(0, 4))); fillYears(); }
      count.textContent = entries.length ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${hasFilter() ? ' found' : ''}` : '';
      feed.replaceChildren(...(entries.length
        ? entries.map(e => renderEntry(e, { onEmotion: pickEmotion }))
        : [h('div', { class: 'state' }, hasFilter() ? 'No entries match those filters.' : 'No entries yet. Your first one will appear here.')]));
    } catch (err) {
      if (my !== reqId) return;
      count.textContent = '';
      feed.replaceChildren(h('div', { class: 'state err' }, err.message,
        h('button', { type: 'button', class: 'btn small', onclick: load, text: 'Try again' })));
    } finally {
      if (my === reqId) feed.setAttribute('aria-busy', 'false');
    }
  }

  function pickEmotion(e) { f.emotion.value = e; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  // date / month / year are alternative "when" filters: choosing one clears the others
  const when = { date: f.date, month: f.month, year: f.year };
  Object.entries(when).forEach(([name, el]) => el.addEventListener('change', () => {
    if (el.value) Object.entries(when).forEach(([n, o]) => { if (n !== name) o.value = ''; });
    load();
  }));
  f.emotion.addEventListener('change', load);
  f.q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 350); });
  $('#f-clear').addEventListener('click', () => { Object.values(f).forEach(el => { el.value = ''; }); load(); });

  (async () => {
    try {
      const meta = await api('meta', {}, 'GET');
      setCatalog(meta.catalog);
      CATALOG.forEach(c => f.emotion.append(h('optgroup', { label: `${c.icon} ${c.label}` },
        c.emotions.map(e => h('option', { value: e, text: e })))));
      if (meta.appName) { document.title = meta.appName; const b = $('.brand'); if (b) b.textContent = meta.appName; }
    } catch (err) {
      feed.replaceChildren(h('div', { class: 'state err' }, err.message,
        h('button', { type: 'button', class: 'btn small', onclick: () => location.reload(), text: 'Reload' })));
      return;
    }
    load();
  })();
}

/* =====================================================================
   ADMIN PAGE (admin.html)
   ===================================================================== */
function initAdmin() {
  const el = {
    login: $('#login'), loginForm: $('#login-form'), pw: $('#pw'), loginMsg: $('#login-msg'),
    app: $('#app'), logout: $('#logout'), form: $('#composer'), title: $('#f-title'), when: $('#f-when'),
    content: $('#f-content'), links: $('#f-links'), mood: $('#mood-root'),
    fileImages: $('#file-images'), fileVideos: $('#file-videos'),
    urlImage: $('#url-image'), urlVideo: $('#url-video'),
    addImageUrl: $('#add-image-url'), addVideoUrl: $('#add-video-url'),
    mediaMsg: $('#media-msg'), atts: $('#attachments'), formMsg: $('#form-msg'),
    save: $('#btn-save'), preview: $('#btn-preview'), cancel: $('#btn-cancel'),
    banner: $('#edit-banner'), heading: $('#composer-title'), manage: $('#manage'), cleanup: $('#cleanup')
  };
  const state = { token: sessionStorage.getItem(TOKEN_KEY) || '', editingId: null, media: [], entries: [], mood: null, busy: false };

  /* ---------- auth ---------- */
  function signOut(message) {
    sessionStorage.removeItem(TOKEN_KEY);
    state.token = '';
    el.app.hidden = true;
    el.login.hidden = false;
    showMsg(el.loginMsg, message || '', 'err');
    el.pw.value = '';
  }
  async function authed(action, payload = {}) {
    try { return await api(action, { token: state.token, ...payload }); }
    catch (err) {
      if (/^Unauthorized/.test(err.message)) signOut('Your session expired. Please sign in again.');
      throw err;
    }
  }
  el.loginForm.addEventListener('submit', async ev => {
    ev.preventDefault();
    const btn = el.loginForm.querySelector('button');
    btn.disabled = true; showMsg(el.loginMsg, '');
    try {
      const data = await api('login', { password: el.pw.value });
      state.token = data.token;
      sessionStorage.setItem(TOKEN_KEY, state.token);
      el.pw.value = '';
      await showApp();
    } catch (err) { showMsg(el.loginMsg, err.message, 'err'); }
    finally { btn.disabled = false; }
  });
  el.logout.addEventListener('click', () => { resetForm(); signOut(''); });

  async function showApp() {
    el.login.hidden = true; el.app.hidden = false;
    try {
      if (!CATALOG.length) setCatalog((await api('meta', {}, 'GET')).catalog);
      if (!state.mood) state.mood = createMoodChecker(el.mood);
      if (!el.when.value) el.when.value = nowLocalInput();
      await loadEntries();
      renderAttachments();
    } catch (err) { if (!el.app.hidden) toast(err.message, 'err'); }
  }

  /* ---------- attachments ---------- */
  function mediaNotice(text, kind = 'err') { showMsg(el.mediaMsg, text, kind); }

  function addFiles(fileList, type) {
    mediaNotice('');
    const allowed = type === 'image' ? IMAGE_TYPES : VIDEO_TYPES;
    const problems = [];
    [...fileList].forEach(file => {
      if (!allowed.includes(file.type)) { problems.push(`${file.name}: unsupported ${type} type.`); return; }
      if (file.size > MAX_UPLOAD_MB * 1048576) { problems.push(`${file.name}: larger than ${MAX_UPLOAD_MB} MB.`); return; }
      state.media.push({ id: uid('media'), type, source: 'drive', pending: true, file, name: file.name, preview: URL.createObjectURL(file) });
    });
    if (problems.length) mediaNotice(problems.join(' '));
    renderAttachments();
  }
  el.fileImages.addEventListener('change', () => { addFiles(el.fileImages.files, 'image'); el.fileImages.value = ''; });
  el.fileVideos.addEventListener('change', () => { addFiles(el.fileVideos.files, 'video'); el.fileVideos.value = ''; });

  function probeImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const t = setTimeout(() => reject(new Error('timeout')), 10000);
      img.onload = () => { clearTimeout(t); resolve(); };
      img.onerror = () => { clearTimeout(t); reject(new Error('error')); };
      img.referrerPolicy = 'no-referrer'; img.src = url;
    });
  }
  function probeVideo(url) {
    return new Promise((resolve, reject) => {
      const v = document.createElement('video'); const t = setTimeout(() => { v.src = ''; reject(new Error('timeout')); }, 10000);
      v.preload = 'metadata';
      v.onloadedmetadata = () => { clearTimeout(t); resolve(); };
      v.onerror = () => { clearTimeout(t); reject(new Error('error')); };
      v.src = url;
    });
  }

  async function addImageUrl() {
    mediaNotice('');
    const u = parseHttps(el.urlImage.value);
    if (!u) return mediaNotice('Enter a valid https:// image link.');
    el.addImageUrl.disabled = true;
    try {
      await probeImage(u.href);
      state.media.push({ id: uid('media'), type: 'image', source: 'external', url: u.href });
      el.urlImage.value = ''; renderAttachments();
    } catch (e) {
      mediaNotice('That link did not load as an image. Use a direct link to a JPG, PNG, GIF or WebP file.');
    } finally { el.addImageUrl.disabled = false; }
  }
  async function addVideoUrl() {
    mediaNotice('');
    const u = parseHttps(el.urlVideo.value);
    if (!u) return mediaNotice('Enter a valid https:// video link.');
    const kind = videoKind(u);
    if (!kind) return mediaNotice('Unsupported video link. Use a direct MP4/WebM file, or a YouTube or Vimeo link.');
    el.addVideoUrl.disabled = true;
    try {
      if (kind.kind === 'file') await probeVideo(u.href);
      state.media.push({ id: uid('media'), type: 'video', source: 'external', url: u.href });
      el.urlVideo.value = ''; renderAttachments();
    } catch (e) {
      mediaNotice('That video could not be loaded. Check the link, or that the host allows embedding.');
    } finally { el.addVideoUrl.disabled = false; }
  }
  el.addImageUrl.addEventListener('click', addImageUrl);
  el.addVideoUrl.addEventListener('click', addVideoUrl);
  el.urlImage.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } });
  el.urlVideo.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addVideoUrl(); } });

  function moveMedia(i, d) {
    const j = i + d;
    if (j < 0 || j >= state.media.length) return;
    [state.media[i], state.media[j]] = [state.media[j], state.media[i]];
    renderAttachments();
  }
  function removeMedia(i) {
    const [m] = state.media.splice(i, 1);
    if (m && m.preview && m.pending) URL.revokeObjectURL(m.preview);
    renderAttachments();
  }

  function renderAttachments() {
    if (!state.media.length) {
      el.atts.replaceChildren(h('li', { class: 'att-empty', text: 'No attachments yet.' }));
      return;
    }
    el.atts.replaceChildren(...state.media.map((m, i) => {
      const where = m.pending ? 'Will upload to Drive on publish' : m.source === 'drive' ? 'Google Drive' : 'External link';
      return h('li', { class: 'att' },
        h('div', { class: 'att-preview' }, mediaNode(m, [imageSrc(m)].filter(Boolean), 0)),
        h('div', { class: 'att-side' },
          h('p', { class: 'att-meta' },
            h('span', { class: 'badge', text: `${i + 1}. ${m.type}` }),
            h('span', { class: `badge ${m.source}`, text: where })),
          h('p', { class: 'att-name', text: m.name || m.url || '' }),
          h('div', { class: 'att-ctl' },
            h('button', { type: 'button', class: 'btn small', 'aria-label': 'Move up', disabled: i === 0, onclick: () => moveMedia(i, -1), text: '↑' }),
            h('button', { type: 'button', class: 'btn small', 'aria-label': 'Move down', disabled: i === state.media.length - 1, onclick: () => moveMedia(i, 1), text: '↓' }),
            h('button', { type: 'button', class: 'btn small danger', onclick: () => removeMedia(i), text: 'Remove' }))));
    }));
  }

  /* ---------- form ---------- */
  function resetForm() {
    state.media.forEach(m => { if (m.preview && m.pending) URL.revokeObjectURL(m.preview); });
    state.media = []; state.editingId = null;
    el.form.reset();
    el.when.value = nowLocalInput();
    if (state.mood) state.mood.set([]);
    el.banner.hidden = true; el.cancel.hidden = true;
    el.heading.textContent = 'New entry';
    el.save.textContent = 'Publish';
    showMsg(el.formMsg, ''); showMsg(el.mediaMsg, '');
    renderAttachments();
  }
  el.cancel.addEventListener('click', resetForm);

  function parseLinks() {
    return el.links.value.split('\n').map(s => s.trim()).filter(Boolean);
  }

  function collectDraft() {
    const problems = [];
    const title = el.title.value.trim(), content = el.content.value.trim();
    const emotions = state.mood ? state.mood.get() : [];
    const links = parseLinks();
    if (!title) problems.push('Add a title.');
    if (!el.when.value) problems.push('Choose the date and time.');
    if (!content) problems.push('Write something in the journal.');
    if (emotions.length !== 3) problems.push('Select exactly three feelings.');
    links.forEach(l => { if (!parseUrlLoose(l)) problems.push(`Invalid link: ${l.slice(0, 60)}`); });
    return { problems, title, content, emotions, links, entryDate: el.when.value };
  }

  el.preview.addEventListener('click', () => {
    const d = collectDraft();
    const nowIso = new Date().toISOString();
    const dlg = h('dialog', { class: 'preview-dialog', 'aria-label': 'Entry preview' },
      h('div', { class: 'bar' }, h('h2', { text: 'Preview' }),
        h('button', { type: 'button', class: 'btn small', onclick: () => dlg.close(), text: 'Close' })),
      renderEntry({
        title: d.title || '(untitled)', entryDate: d.entryDate || nowLocalInput(), content: d.content || '',
        emotions: d.emotions, links: d.links, createdAt: nowIso, updatedAt: nowIso,
        media: state.media.map((m, i) => ({ ...m, order: i + 1 }))
      }),
      d.problems.length ? h('p', { class: 'msg err', text: `Still needed: ${d.problems.join(' ')}` }) : null);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
    dlg.showModal();
  });

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(new Error(`Could not read ${file.name}`));
      r.readAsDataURL(file);
    });
  }

  el.form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (state.busy) return;
    const d = collectDraft();
    if (d.problems.length) return showMsg(el.formMsg, d.problems.join(' '), 'err');

    state.busy = true; el.save.disabled = true; el.preview.disabled = true;
    const label = el.save.textContent;
    try {
      // 1) upload only the files the owner explicitly chose
      const pending = state.media.filter(m => m.pending);
      for (let n = 0; n < pending.length; n++) {
        const m = pending[n];
        showMsg(el.formMsg, `Uploading ${n + 1} of ${pending.length}: ${m.name}…`, '');
        const data = await authed('upload', { file: { name: m.file.name, mimeType: m.file.type, data: await fileToBase64(m.file) } });
        const up = data.media;
        if (m.preview) URL.revokeObjectURL(m.preview);
        Object.assign(m, { id: up.id, driveId: up.driveId, url: up.url, source: 'drive', pending: false, preview: null, file: null });
        renderAttachments();
      }
      // 2) save the entry
      showMsg(el.formMsg, 'Saving entry…', '');
      const entry = {
        title: d.title, content: d.content, entryDate: d.entryDate, emotions: d.emotions, links: d.links,
        media: state.media.map((m, i) => ({ id: m.id, type: m.type, source: m.source, url: m.url, driveId: m.driveId, order: i + 1 }))
      };
      if (state.editingId) entry.id = state.editingId;
      await authed(state.editingId ? 'update' : 'create', { entry });
      toast(state.editingId ? 'Entry updated' : 'Entry published');
      resetForm();
      await loadEntries();
    } catch (err) {
      showMsg(el.formMsg, `${err.message}${state.media.some(m => !m.pending && m.source === 'drive') ? ' (Files already uploaded are kept; just press Publish again.)' : ''}`, 'err');
    } finally {
      state.busy = false; el.save.disabled = false; el.preview.disabled = false; el.save.textContent = label;
    }
  });

  /* ---------- manage entries ---------- */
  async function loadEntries() {
    try {
      const data = await api('list', {}, 'GET');
      state.entries = data.entries || [];
      renderManage();
    } catch (err) {
      el.manage.replaceChildren(h('div', { class: 'state err', text: err.message }));
    }
  }

  function renderManage() {
    if (!state.entries.length) { el.manage.replaceChildren(h('div', { class: 'state', text: 'No entries yet.' })); return; }
    el.manage.replaceChildren(...state.entries.map(e => h('div', { class: 'manage-row' },
      h('div', { class: 'manage-main' },
        h('strong', { text: e.title }),
        h('small', { text: `${fmtEntryDate(e.entryDate)} · ${e.emotions.join(', ')} · ${(e.media || []).length} attachment(s)` })),
      h('div', { class: 'manage-ctl' },
        h('button', { type: 'button', class: 'btn small', onclick: () => previewSaved(e), text: 'Preview' }),
        h('button', { type: 'button', class: 'btn small', onclick: () => startEdit(e), text: 'Edit' }),
        h('button', { type: 'button', class: 'btn small danger', onclick: () => remove(e), text: 'Delete' })))));
  }

  function previewSaved(e) {
    const dlg = h('dialog', { class: 'preview-dialog', 'aria-label': 'Entry preview' },
      h('div', { class: 'bar' }, h('h2', { text: 'Preview' }), h('button', { type: 'button', class: 'btn small', onclick: () => dlg.close(), text: 'Close' })),
      renderEntry(e));
    dlg.addEventListener('close', () => dlg.remove());
    dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });
    document.body.append(dlg); dlg.showModal();
  }

  function startEdit(e) {
    resetForm();
    state.editingId = e.id;
    el.title.value = e.title; el.when.value = e.entryDate.slice(0, 16); el.content.value = e.content;
    el.links.value = (e.links || []).join('\n');
    state.media = [...(e.media || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map(m => ({ ...m }));
    state.mood.set(e.emotions);
    el.heading.textContent = 'Edit entry';
    el.save.textContent = 'Save changes';
    el.cancel.hidden = false;
    showMsg(el.banner, `Editing “${e.title}”. Existing attachments are kept unless you remove them.`, '');
    renderAttachments();
    el.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function remove(e) {
    if (!confirm(`Delete “${e.title}”? Its uploaded Drive files are moved to the Drive trash.`)) return;
    try {
      await authed('delete', { id: e.id });
      if (state.editingId === e.id) resetForm();
      toast('Entry deleted');
      await loadEntries();
    } catch (err) { toast(err.message, 'err'); }
  }

  el.cleanup.addEventListener('click', async () => {
    if (!confirm('Move Drive files that no entry uses (older than 15 minutes) to the Drive trash? Only files in the journal media folder are touched.')) return;
    el.cleanup.disabled = true;
    try {
      const r = await authed('cleanup');
      toast(`Trashed ${r.trashed} unused file(s); kept ${r.kept}.`);
    } catch (err) { toast(err.message, 'err'); }
    finally { el.cleanup.disabled = false; }
  });

  /* ---------- start ---------- */
  (async () => {
    if (!state.token) { el.login.hidden = false; return; }
    try {
      await api('verify', { token: state.token });
      await showApp();
    } catch (err) {
      signOut(/^Unauthorized/.test(err.message) ? '' : err.message);
    }
  })();
}

/* =====================================================================
   Boot
   ===================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'journal') initJournal();
  if (page === 'admin') initAdmin();
});
})();
