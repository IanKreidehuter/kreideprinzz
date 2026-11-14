/**
 * PERSONAL MOOD JOURNAL & EMOTIONAL TRACKER — FRONTEND APPLICATION (script.js)
 * Connects GitHub Pages frontend to the Google Apps Script Web App (/exec) backend.
 */

const APP_CONFIG = {
  // Replace with your deployed Google Apps Script Web App "/exec" URL
  API_URL: https://script.google.com/macros/s/AKfycbyxg6kw0d_e2bDLtua6cvx4sH1P3Y8kDnOQOZRadrMZkc-2iwyCoEpJP42wvSM0zWgb-A/exec,

  // Maximum single file upload size in MB (safe for Google Apps Script POST limits)
  MAX_UPLOAD_MB: 25
};

/* ==========================================================================
   FEELINGS WHEEL EMOTIONAL TAXONOMY (7 PRIMARY CATEGORIES)
   ========================================================================== */

const EMOTION_CATEGORIES = [
  {
    name: 'Joy',
    emotions: [
      'Happy', 'Excited', 'Proud', 'Optimistic', 'Content',
      'Relieved', 'Playful', 'Hopeful', 'Confident', 'Peaceful', 'Inspired'
    ]
  },
  {
    name: 'Sadness',
    emotions: [
      'Lonely', 'Grief', 'Disappointed', 'Hopeless', 'Vulnerable',
      'Empty', 'Hurt', 'Miserable', 'Abandoned', 'Nostalgic', 'Melancholic'
    ]
  },
  {
    name: 'Anger',
    emotions: [
      'Frustrated', 'Irritated', 'Resentful', 'Furious', 'Annoyed',
      'Bitter', 'Jealous', 'Defensive', 'Impatient', 'Agitated'
    ]
  },
  {
    name: 'Fear',
    emotions: [
      'Anxious', 'Insecure', 'Overwhelmed', 'Worried', 'Nervous',
      'Terrified', 'Helpless', 'Uncertain', 'Restless', 'Apprehensive'
    ]
  },
  {
    name: 'Disgust',
    emotions: [
      'Disapproval', 'Dislike', 'Revulsion', 'Disturbed', 'Judgmental',
      'Uncomfortable', 'Skeptical', 'Repelled'
    ]
  },
  {
    name: 'Surprise',
    emotions: [
      'Confused', 'Amazed', 'Astonished', 'Startled', 'Shocked',
      'Perplexed', 'Curious', 'Awed'
    ]
  },
  {
    name: 'Love',
    emotions: [
      'Affectionate', 'Caring', 'Trusting', 'Grateful', 'Accepted',
      'Appreciated', 'Connected', 'Compassionate', 'Warm', 'Devoted'
    ]
  }
];

// Fast reverse lookup: emotion name -> primary category name
const EMOTION_TO_CATEGORY = {};
EMOTION_CATEGORIES.forEach(cat => {
  cat.emotions.forEach(em => {
    EMOTION_TO_CATEGORY[em.toLowerCase()] = cat.name;
  });
});

function getCategoryForEmotion(emotionName) {
  if (!emotionName) return 'Joy';
  return EMOTION_TO_CATEGORY[String(emotionName).trim().toLowerCase()] || 'Joy';
}

/* ==========================================================================
   API CLIENT (COMMUNICATES WITH GOOGLE APPS SCRIPT /EXEC URL)
   ========================================================================== */

function isApiConfigured() {
  return (
    APP_CONFIG.API_URL &&
    APP_CONFIG.API_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_EXEC_URL' &&
    /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(APP_CONFIG.API_URL.trim())
  );
}

async function apiGet(params = {}) {
  if (!isApiConfigured()) {
    throw new Error('Backend API URL is not configured yet. Set APP_CONFIG.API_URL in script.js.');
  }
  const url = new URL(APP_CONFIG.API_URL.trim());
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`Network error (${response.status})`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.message || 'Backend request failed.');
  }
  return json;
}

async function apiPost(payload) {
  if (!isApiConfigured()) {
    throw new Error('Backend API URL is not configured yet. Set APP_CONFIG.API_URL in script.js.');
  }

  // Send as text/plain to prevent CORS preflight OPTIONS requests on Google Apps Script
  const response = await fetch(APP_CONFIG.API_URL.trim(), {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Network error (${response.status})`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.message || 'Operation failed.');
  }
  return json;
}

/* ==========================================================================
   SECURITY, URL PARSING & SHARED MEDIA RENDERING
   ========================================================================== */

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidHttpUrl(urlString) {
  try {
    const parsed = new URL(String(urlString || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Safely classify a video URL into an embeddable player or direct HTML5 video.
 * Never executes arbitrary HTML or trusts unvalidated iframe URLs.
 */
function parseVideoSource(rawUrl) {
  if (!isValidHttpUrl(rawUrl)) {
    return { kind: 'unsupported', safeUrl: '' };
  }

  const url = new URL(rawUrl.trim());
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const path = url.pathname;

  // 1. YouTube (youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/)
  let ytId = '';
  if (host === 'youtu.be') {
    ytId = path.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (path === '/watch') {
      ytId = url.searchParams.get('v') || '';
    } else if (path.startsWith('/shorts/') || path.startsWith('/embed/')) {
      ytId = path.split('/')[2] || '';
    }
  }
  if (ytId && /^[a-zA-Z0-9_-]{11}$/.test(ytId)) {
    return {
      kind: 'iframe',
      provider: 'YouTube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
      safeUrl: url.href
    };
  }

  // 2. Vimeo (vimeo.com/123456789)
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const vimeoMatch = path.match(/\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      return {
        kind: 'iframe',
        provider: 'Vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
        safeUrl: url.href
      };
    }
  }

  // 3. Google Drive Video Preview (drive.google.com/file/d/FILE_ID/preview or view)
  if (host === 'drive.google.com') {
    const driveMatch = path.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const idParam = url.searchParams.get('id');
    const fileId = driveMatch ? driveMatch[1] : idParam;
    if (fileId && /^[a-zA-Z0-9_-]+$/.test(fileId)) {
      return {
        kind: 'iframe',
        provider: 'Google Drive',
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        safeUrl: url.href
      };
    }
  }

  // 4. Direct Video Files (MP4, WebM, OGG, MOV)
  if (/\.(mp4|webm|ogg|ogv|mov)(\?.*)?$/i.test(path)) {
    return {
      kind: 'native',
      safeUrl: url.href
    };
  }

  return { kind: 'unsupported', safeUrl: url.href };
}

/**
 * Create a DOM <figure> element for a single media attachment (image or video).
 */
function createMediaFigureElement(item, entryTitle = '') {
  const figure = document.createElement('figure');
  figure.className = 'media-figure';

  if (!item || !isValidHttpUrl(item.url)) {
    figure.innerHTML = `<div class="media-fallback">Invalid or inaccessible media URL.</div>`;
    return figure;
  }

  if (item.type === 'image') {
    const img = document.createElement('img');
    img.className = 'media-image';
    img.loading = 'lazy';
    img.src = item.url;
    img.alt = item.fileName ? `${entryTitle} — ${item.fileName}` : `${entryTitle} photo attachment`;

    img.addEventListener('click', () => openLightbox(item.url, img.alt));
    img.addEventListener('error', () => {
      figure.innerHTML = `
        <div class="media-fallback">
          Image could not be loaded.
          <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">Open source link</a>
        </div>`;
    });

    figure.appendChild(img);
    return figure;
  }

  // Video attachment
  const parsedVideo = parseVideoSource(item.url);

  if (parsedVideo.kind === 'native') {
    const video = document.createElement('video');
    video.className = 'media-video-native';
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.src = parsedVideo.safeUrl;

    video.addEventListener('error', () => {
      figure.innerHTML = `
        <div class="media-fallback">
          Video format unsupported or unavailable.
          <a href="${escapeHTML(parsedVideo.safeUrl)}" target="_blank" rel="noopener noreferrer">Open video link</a>
        </div>`;
    });

    figure.appendChild(video);
    return figure;
  }

  if (parsedVideo.kind === 'iframe') {
    const wrap = document.createElement('div');
    wrap.className = 'media-iframe-wrap';

    const iframe = document.createElement('iframe');
    iframe.src = parsedVideo.embedUrl;
    iframe.title = `${parsedVideo.provider} video player`;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-presentation allow-popups'
    );
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;

    wrap.appendChild(iframe);
    figure.appendChild(wrap);
    return figure;
  }

  figure.innerHTML = `
    <div class="media-fallback">
      Unsupported video link format.
      <a href="${escapeHTML(parsedVideo.safeUrl)}" target="_blank" rel="noopener noreferrer">Open external video</a>
    </div>`;
  return figure;
}

/* ==========================================================================
   DATE & TIME FORMATTING HELPERS
   ========================================================================== */

function formatDisplayDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatShortTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function toLocalDateTimeInputValue(isoString) {
  const date = isoString ? new Date(isoString) : new Date();
  if (isNaN(date.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function getLocalDateYYYYMMDD(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return String(isoString || '').slice(0, 10);
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/* ==========================================================================
   SHARED LIGHTBOX MODAL
   ========================================================================== */

function initLightbox() {
  const modal = document.getElementById('lightbox-modal');
  const closeBtn = document.getElementById('btn-close-lightbox');
  if (!modal || !closeBtn) return;

  closeBtn.addEventListener('click', closeLightbox);
  modal.addEventListener('click', e => {
    if (e.target === modal) closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeLightbox();
    }
  });
}

function openLightbox(imageUrl, captionText = '') {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-image');
  const caption = document.getElementById('lightbox-caption');
  if (!modal || !img) return;

  img.src = imageUrl;
  if (caption) caption.textContent = captionText;
  modal.classList.remove('hidden');
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-image');
  if (!modal) return;
  modal.classList.add('hidden');
  if (img) img.src = '';
}

/* ==========================================================================
   JOURNAL ENTRY CARD RENDERER (USED ON INDEX.HTML & ADMIN PREVIEW)
   ========================================================================== */

function buildJournalCardElement(entry, options = {}) {
  const { allowEmotionFilterClick = false, onEmotionClick = null } = options;

  const article = document.createElement('article');
  article.className = 'journal-card';

  // Header: Entry Date & Time
  const header = document.createElement('div');
  header.className = 'entry-header';
  header.innerHTML = `<time class="entry-date" datetime="${escapeHTML(entry.entryDate)}">${escapeHTML(formatDisplayDateTime(entry.entryDate))}</time>`;
  article.appendChild(header);

  // Title
  const titleEl = document.createElement('h2');
  titleEl.className = 'entry-title';
  titleEl.textContent = entry.title;
  article.appendChild(titleEl);

  // Exactly THREE Selected Emotions
  const emotionsRow = document.createElement('div');
  emotionsRow.className = 'entry-emotions-row';
  (entry.emotions || []).forEach(emotion => {
    const category = getCategoryForEmotion(emotion);
    const pill = document.createElement(allowEmotionFilterClick ? 'button' : 'span');
    if (allowEmotionFilterClick) {
      pill.type = 'button';
      pill.className = `emotion-pill emotion-pill-clickable cat-${category}`;
      pill.title = `Filter by ${emotion}`;
      pill.addEventListener('click', () => {
        if (onEmotionClick) onEmotionClick(emotion);
      });
    } else {
      pill.className = `emotion-pill cat-${category}`;
    }
    pill.innerHTML = `<span class="emotion-dot" aria-hidden="true"></span>${escapeHTML(emotion)}`;
    emotionsRow.appendChild(pill);
  });
  article.appendChild(emotionsRow);

  // Written Journal Content (collapsible if very long)
  const contentEl = document.createElement('div');
  contentEl.className = 'entry-body';
  contentEl.textContent = entry.content;
  article.appendChild(contentEl);

  if (entry.content && entry.content.length > 650) {
    contentEl.classList.add('collapsed');
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn-read-more';
    toggleBtn.textContent = 'Read full entry';
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = contentEl.classList.toggle('collapsed');
      toggleBtn.textContent = isCollapsed ? 'Read full entry' : 'Show less';
    });
    article.appendChild(toggleBtn);
  }

  // Media Attachments (preserving original attachment order)
  if (Array.isArray(entry.media) && entry.media.length > 0) {
    const gallery = document.createElement('div');
    gallery.className = 'entry-media-gallery';

    const orderedMedia = [...entry.media].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    orderedMedia.forEach(item => {
      gallery.appendChild(createMediaFigureElement(item, entry.title));
    });

    article.appendChild(gallery);
  }

  // Optional External Links
  if (Array.isArray(entry.links) && entry.links.length > 0) {
    const linksWrap = document.createElement('div');
    linksWrap.className = 'entry-links-list';

    entry.links.forEach(link => {
      if (!link || !isValidHttpUrl(link.url)) return;
      const a = document.createElement('a');
      a.className = 'external-link-chip';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `↗ ${link.label || link.url}`;
      linksWrap.appendChild(a);
    });

    if (linksWrap.children.length > 0) {
      article.appendChild(linksWrap);
    }
  }

  // Footer: Entry Creation Timestamp
  const footer = document.createElement('footer');
  footer.className = 'entry-footer';
  footer.innerHTML = `
    <span>Recorded ${escapeHTML(formatShortTimestamp(entry.createdAt))}</span>
    ${entry.updatedAt && entry.updatedAt !== entry.createdAt
      ? `<span>Edited ${escapeHTML(formatShortTimestamp(entry.updatedAt))}</span>`
      : ''}
  `;
  article.appendChild(footer);

  return article;
}

/* ==========================================================================
   1. MAIN JOURNAL FEED PAGE CONTROLLER (index.html)
   ========================================================================== */

function initJournalFeedPage() {
  const timelineEl = document.getElementById('journal-timeline');
  const statusBanner = document.getElementById('feed-status-banner');
  const keywordInput = document.getElementById('filter-keyword');
  const emotionSelect = document.getElementById('filter-emotion');
  const dateInput = document.getElementById('filter-date');
  const monthSelect = document.getElementById('filter-month');
  const yearSelect = document.getElementById('filter-year');
  const resetBtn = document.getElementById('btn-reset-filters');

  let allEntries = [];

  // Populate Emotion Filter Dropdown grouped by Primary Category
  EMOTION_CATEGORIES.forEach(cat => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = cat.name;
    cat.emotions.forEach(em => {
      const opt = document.createElement('option');
      opt.value = em;
      opt.textContent = em;
      optgroup.appendChild(opt);
    });
    emotionSelect.appendChild(optgroup);
  });

  function showFeedStatus(message, type = 'info') {
    statusBanner.textContent = message;
    statusBanner.className = `status-banner ${type}`;
    statusBanner.classList.remove('hidden');
  }

  function populateYearOptions(entries) {
    const years = new Set([String(new Date().getFullYear())]);
    entries.forEach(entry => {
      const y = getLocalDateYYYYMMDD(entry.entryDate).slice(0, 4);
      if (/^\d{4}$/.test(y)) years.add(y);
    });

    const sortedYears = Array.from(years).sort((a, b) => Number(b) - Number(a));
    yearSelect.innerHTML = '<option value="">All Years</option>';
    sortedYears.forEach(yr => {
      const opt = document.createElement('option');
      opt.value = yr;
      opt.textContent = yr;
      yearSelect.appendChild(opt);
    });
  }

  function updateSummaryStats(entries, filteredCount) {
    document.getElementById('stat-total-entries').textContent = String(entries.length);
    document.getElementById('stat-filtered-entries').textContent = String(filteredCount);

    const topContainer = document.getElementById('stat-top-emotions');
    if (entries.length === 0) {
      topContainer.innerHTML = '<span class="muted-text text-sm">No entries recorded yet</span>';
      return;
    }

    const counts = {};
    entries.forEach(entry => {
      (entry.emotions || []).forEach(em => {
        counts[em] = (counts[em] || 0) + 1;
      });
    });

    const topThree = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    topContainer.innerHTML = '';
    topThree.forEach(([em, count]) => {
      const cat = getCategoryForEmotion(em);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `emotion-pill emotion-pill-clickable cat-${cat}`;
      btn.innerHTML = `<span class="emotion-dot"></span>${escapeHTML(em)} (${count})`;
      btn.addEventListener('click', () => {
        emotionSelect.value = em;
        applyFiltersAndRender();
      });
      topContainer.appendChild(btn);
    });
  }

  function applyFiltersAndRender() {
    const keyword = keywordInput.value.trim().toLowerCase();
    const selectedEmotion = emotionSelect.value.trim().toLowerCase();
    const selectedDate = dateInput.value.trim();
    const selectedMonth = monthSelect.value.trim();
    const selectedYear = yearSelect.value.trim();

    const hasActiveFilter = Boolean(keyword || selectedEmotion || selectedDate || selectedMonth || selectedYear);
    resetBtn.classList.toggle('hidden', !hasActiveFilter);

    const filtered = allEntries.filter(entry => {
      const localDate = getLocalDateYYYYMMDD(entry.entryDate); // YYYY-MM-DD

      if (selectedDate && localDate !== selectedDate) return false;
      if (selectedYear && localDate.slice(0, 4) !== selectedYear) return false;
      if (selectedMonth && localDate.slice(5, 7) !== selectedMonth) return false;

      if (selectedEmotion) {
        const matchesEmotion = (entry.emotions || []).some(
          em => em.toLowerCase() === selectedEmotion
        );
        if (!matchesEmotion) return false;
      }

      if (keyword) {
        const searchable = [
          entry.title,
          entry.content,
          ...(entry.emotions || []),
          ...(entry.links || []).map(l => `${l.label} ${l.url}`)
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(keyword)) return false;
      }

      return true;
    });

    updateSummaryStats(allEntries, filtered.length);
    timelineEl.innerHTML = '';

    if (filtered.length === 0) {
      timelineEl.innerHTML = `
        <div class="empty-state">
          <p><strong>No journal entries match your current view.</strong></p>
          <p class="text-sm">${allEntries.length === 0
            ? 'Use the Write / Admin page to record your first entry.'
            : 'Try adjusting your search keywords or date/emotion filters.'}</p>
        </div>`;
      return;
    }

    filtered.forEach(entry => {
      const card = buildJournalCardElement(entry, {
        allowEmotionFilterClick: true,
        onEmotionClick: em => {
          emotionSelect.value = em;
          applyFiltersAndRender();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      timelineEl.appendChild(card);
    });
  }

  // Filter Event Listeners
  keywordInput.addEventListener('input', applyFiltersAndRender);
  emotionSelect.addEventListener('change', applyFiltersAndRender);
  dateInput.addEventListener('change', applyFiltersAndRender);
  monthSelect.addEventListener('change', applyFiltersAndRender);
  yearSelect.addEventListener('change', applyFiltersAndRender);

  resetBtn.addEventListener('click', () => {
    keywordInput.value = '';
    emotionSelect.value = '';
    dateInput.value = '';
    monthSelect.value = '';
    yearSelect.value = '';
    applyFiltersAndRender();
  });

  // Load entries from Google Apps Script API
  (async function loadJournal() {
    try {
      const res = await apiGet({ action: 'getEntries' });
      allEntries = Array.isArray(res.data.entries) ? res.data.entries : [];
      if (res.data.appTitle) {
        document.getElementById('journal-app-title').textContent = res.data.appTitle;
        document.title = res.data.appTitle;
      }
      populateYearOptions(allEntries);
      applyFiltersAndRender();
    } catch (err) {
      timelineEl.innerHTML = '';
      showFeedStatus(err.message, 'error');
    }
  })();
}

/* ==========================================================================
   2. PRIVATE ADMINISTRATION PAGE CONTROLLER (admin.html)
   ========================================================================== */

function initAdminPage() {
  const TOKEN_STORAGE_KEY = 'mood_journal_admin_token';

  // DOM References
  const loginSection = document.getElementById('admin-login-section');
  const workspaceSection = document.getElementById('admin-workspace');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('btn-logout');
  const passwordModalBtn = document.getElementById('btn-open-password-modal');
  const adminStatusBanner = document.getElementById('admin-status-banner');

  // Composer Elements
  const entryForm = document.getElementById('entry-form');
  const entryIdInput = document.getElementById('entry-id');
  const titleInput = document.getElementById('entry-title');
  const dateInput = document.getElementById('entry-date');
  const contentInput = document.getElementById('entry-content');
  const wordCounter = document.getElementById('word-counter');
  const composerModeBadge = document.getElementById('composer-mode-badge');
  const composerHeading = document.getElementById('composer-heading');
  const cancelEditBtn = document.getElementById('btn-cancel-edit');
  const saveEntryBtn = document.getElementById('btn-save-entry');
  const previewEntryBtn = document.getElementById('btn-preview-entry');

  // Mood Checker Elements
  const selectedTray = document.getElementById('selected-emotions-tray');
  const emotionCounterBadge = document.getElementById('emotion-counter-badge');
  const categoryTabsEl = document.getElementById('emotion-category-tabs');
  const emotionOptionsPanel = document.getElementById('emotion-options-panel');

  // Media Composer Elements
  const uploadImageInput = document.getElementById('upload-image-input');
  const uploadVideoInput = document.getElementById('upload-video-input');
  const uploadProgressArea = document.getElementById('upload-progress-area');
  const extImageUrlInput = document.getElementById('external-image-url');
  const extVideoUrlInput = document.getElementById('external-video-url');
  const addExtImageBtn = document.getElementById('btn-add-external-image');
  const addExtVideoBtn = document.getElementById('btn-add-external-video');
  const mediaPreviewList = document.getElementById('media-preview-list');
  const attachmentCountEl = document.getElementById('attachment-count');

  // Links Builder Elements
  const linkLabelInput = document.getElementById('link-label-input');
  const linkUrlInput = document.getElementById('link-url-input');
  const addLinkBtn = document.getElementById('btn-add-link');
  const linksPreviewList = document.getElementById('links-preview-list');

  // Manage Entries Elements
  const manageSearchInput = document.getElementById('admin-manage-search');
  const adminEntriesList = document.getElementById('admin-entries-list');

  // Admin Application State
  let sessionToken = sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
  let activeCategoryName = EMOTION_CATEGORIES[0].name;
  let selectedEmotions = []; // Must contain exact 3 strings on save
  let draftMedia = [];       // Ordered array of { id, type, source, url, fileId, fileName, order }
  let draftLinks = [];       // Array of { label, url }
  let entriesCache = [];
  let activeUploadsCount = 0;

  function showToast(message, type = 'default') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  function showAdminBanner(message, type = 'error') {
    adminStatusBanner.textContent = message;
    adminStatusBanner.className = `status-banner ${type}`;
    adminStatusBanner.classList.remove('hidden');
  }

  function hideAdminBanner() {
    adminStatusBanner.classList.add('hidden');
  }

  function setAuthenticatedUI(isAuth) {
    loginSection.classList.toggle('hidden', isAuth);
    workspaceSection.classList.toggle('hidden', !isAuth);
    logoutBtn.classList.toggle('hidden', !isAuth);
    passwordModalBtn.classList.toggle('hidden', !isAuth);
  }

  /* ------------------------------------------------------------------------
     AUTHENTICATION FLOW
     ------------------------------------------------------------------------ */

  async function checkExistingSession() {
    if (!isApiConfigured()) {
      showAdminBanner(
        'Backend API URL is not configured yet. Open script.js and set APP_CONFIG.API_URL to your Google Apps Script /exec URL.',
        'error'
      );
      return;
    }

    if (!sessionToken) {
      setAuthenticatedUI(false);
      return;
    }

    try {
      await apiPost({ action: 'verifySession', token: sessionToken });
      setAuthenticatedUI(true);
      resetComposerToNew();
      await loadAdminEntries();
    } catch {
      sessionToken = '';
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      setAuthenticatedUI(false);
    }
  }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    hideAdminBanner();
    const passwordInput = document.getElementById('admin-password');
    const submitBtn = document.getElementById('btn-login-submit');
    const password = passwordInput.value;

    if (!password) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying…';

    try {
      const res = await apiPost({ action: 'login', password });
      sessionToken = res.data.token;
      sessionStorage.setItem(TOKEN_STORAGE_KEY, sessionToken);
      passwordInput.value = '';
      setAuthenticatedUI(true);
      resetComposerToNew();
      showToast('Signed in to Journal Studio.', 'success');
      await loadAdminEntries();
    } catch (err) {
      showAdminBanner(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Unlock Journal Studio';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      if (sessionToken) {
        await apiPost({ action: 'logout', token: sessionToken });
      }
    } catch {
      // Ignore logout network errors and clear local session
    }
    sessionToken = '';
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthenticatedUI(false);
    showToast('Signed out.');
  });

  // Change Password Modal
  const passwordModal = document.getElementById('password-modal');
  const changePasswordForm = document.getElementById('change-password-form');
  passwordModalBtn.addEventListener('click', () => passwordModal.classList.remove('hidden'));
  document.getElementById('btn-close-password-modal').addEventListener('click', () => {
    passwordModal.classList.add('hidden');
  });
  changePasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const btn = document.getElementById('btn-submit-password');

    btn.disabled = true;
    btn.textContent = 'Updating…';
    try {
      await apiPost({
        action: 'changePassword',
        token: sessionToken,
        currentPassword,
        newPassword
      });
      changePasswordForm.reset();
      passwordModal.classList.add('hidden');
      showToast('Administrator password updated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  });

  /* ------------------------------------------------------------------------
     INTERACTIVE CATEGORY-BASED MOOD CHECKER (EXACTLY 3 EMOTIONS)
     ------------------------------------------------------------------------ */

  function renderMoodChecker() {
    // 1. Update counter badge (0/3, 1/3, 2/3, 3/3)
    const count = selectedEmotions.length;
    emotionCounterBadge.textContent = `${count}/3 selected`;
    emotionCounterBadge.classList.toggle('complete', count === 3);

    // 2. Render the 3 Selected Emotion Slots
    selectedTray.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const em = selectedEmotions[i];
      const slot = document.createElement('div');
      if (em) {
        const cat = getCategoryForEmotion(em);
        slot.className = `emotion-slot filled cat-${cat}`;
        slot.innerHTML = `
          <span><strong>${i + 1}.</strong> ${escapeHTML(em)}</span>
          <button type="button" class="slot-remove-btn" aria-label="Remove ${escapeHTML(em)}">&times;</button>
        `;
        slot.querySelector('.slot-remove-btn').addEventListener('click', () => {
          toggleEmotionSelection(em);
        });
      } else {
        slot.className = 'emotion-slot empty';
        slot.textContent = `${i + 1}. Choose a feeling`;
      }
      selectedTray.appendChild(slot);
    }

    // 3. Render Primary Category Tabs
    categoryTabsEl.innerHTML = '';
    EMOTION_CATEGORIES.forEach(cat => {
      const selectedInCat = cat.emotions.filter(em => selectedEmotions.includes(em)).length;
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.role = 'tab';
      tabBtn.className = `cat-tab-btn${cat.name === activeCategoryName ? ' active' : ''}`;
      tabBtn.setAttribute('aria-selected', String(cat.name === activeCategoryName));
      tabBtn.innerHTML = `
        <span class="emotion-dot" style="background: var(--cat-${cat.name.toLowerCase()}-dot)"></span>
        ${escapeHTML(cat.name)}${selectedInCat > 0 ? ` (${selectedInCat})` : ''}
      `;
      tabBtn.addEventListener('click', () => {
        activeCategoryName = cat.name;
        renderMoodChecker();
      });
      categoryTabsEl.appendChild(tabBtn);
    });

    // 4. Render Secondary & Specific Emotion Chips for Active Category
    const currentCategory = EMOTION_CATEGORIES.find(c => c.name === activeCategoryName) || EMOTION_CATEGORIES[0];
    const limitReached = selectedEmotions.length >= 3;

    emotionOptionsPanel.innerHTML = '';
    currentCategory.emotions.forEach(em => {
      const isSelected = selectedEmotions.includes(em);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `emotion-choice-btn${isSelected ? ` selected cat-${currentCategory.name}` : ''}`;
      chip.disabled = !isSelected && limitReached;
      chip.setAttribute('aria-pressed', String(isSelected));
      chip.innerHTML = `<span class="emotion-dot" style="background: var(--cat-${currentCategory.name.toLowerCase()}-dot)"></span>${escapeHTML(em)}`;
      chip.addEventListener('click', () => toggleEmotionSelection(em));
      emotionOptionsPanel.appendChild(chip);
    });
  }

  function toggleEmotionSelection(emotion) {
    const idx = selectedEmotions.indexOf(emotion);
    if (idx !== -1) {
      selectedEmotions.splice(idx, 1);
      renderMoodChecker();
      return;
    }
    if (selectedEmotions.length >= 3) {
      showToast('You have already selected 3 emotions. Remove one to change your selection.', 'error');
      return;
    }
    selectedEmotions.push(emotion);
    renderMoodChecker();
  }

  /* ------------------------------------------------------------------------
     MEDIA COMPOSER (METHOD A: DRIVE UPLOAD & METHOD B: EXTERNAL URLS)
     ------------------------------------------------------------------------ */

  function updateUploadIndicator() {
    if (activeUploadsCount > 0) {
      uploadProgressArea.textContent = `Uploading ${activeUploadsCount} file(s) to Google Drive… Please wait.`;
      uploadProgressArea.classList.remove('hidden');
      saveEntryBtn.disabled = true;
    } else {
      uploadProgressArea.classList.add('hidden');
      saveEntryBtn.disabled = false;
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const commaIndex = result.indexOf(',');
        if (commaIndex === -1) {
          reject(new Error('Failed to encode file.'));
          return;
        }
        resolve(result.slice(commaIndex + 1));
      };
      reader.onerror = () => reject(new Error(`Could not read file "${file.name}".`));
      reader.readAsDataURL(file);
    });
  }

  async function handleFileUploads(fileList, mediaType) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    for (const file of files) {
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > APP_CONFIG.MAX_UPLOAD_MB) {
        showToast(`"${file.name}" exceeds ${APP_CONFIG.MAX_UPLOAD_MB}MB upload limit.`, 'error');
        continue;
      }

      activeUploadsCount++;
      updateUploadIndicator();

      try {
        const base64Data = await fileToBase64(file);
        const res = await apiPost({
          action: 'uploadMedia',
          token: sessionToken,
          fileName: file.name,
          mimeType: file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
          mediaType,
          base64Data
        });

        draftMedia.push({
          ...res.data.media,
          order: draftMedia.length + 1
        });
        renderMediaPreviewTray();
        showToast(`Uploaded "${file.name}" to Google Drive.`, 'success');
      } catch (err) {
        showToast(`Upload failed for "${file.name}": ${err.message}`, 'error');
      } finally {
        activeUploadsCount--;
        updateUploadIndicator();
      }
    }
  }

  uploadImageInput.addEventListener('change', e => {
    handleFileUploads(e.target.files, 'image');
    e.target.value = '';
  });

  uploadVideoInput.addEventListener('change', e => {
    handleFileUploads(e.target.files, 'video');
    e.target.value = '';
  });

  // Method B: External Image URL (NEVER uploaded to Google Drive)
  addExtImageBtn.addEventListener('click', () => {
    const rawUrl = extImageUrlInput.value.trim();
    if (!isValidHttpUrl(rawUrl)) {
      showToast('Please enter a valid http:// or https:// image URL.', 'error');
      return;
    }

    // Verify image loads in browser before adding
    const probe = new Image();
    addExtImageBtn.disabled = true;
    addExtImageBtn.textContent = 'Checking…';

    probe.onload = () => {
      draftMedia.push({
        id: `media_ext_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'image',
        source: 'external',
        url: rawUrl,
        fileId: '',
        fileName: '',
        order: draftMedia.length + 1
      });
      extImageUrlInput.value = '';
      addExtImageBtn.disabled = false;
      addExtImageBtn.textContent = 'Add Image';
      renderMediaPreviewTray();
      showToast('External image added.', 'success');
    };

    probe.onerror = () => {
      addExtImageBtn.disabled = false;
      addExtImageBtn.textContent = 'Add Image';
      showToast('Could not load image from that URL. Ensure it is a direct accessible image link.', 'error');
    };

    probe.src = rawUrl;
  });

  // Method B: External Video URL (NEVER uploaded to Google Drive)
  addExtVideoBtn.addEventListener('click', () => {
    const rawUrl = extVideoUrlInput.value.trim();
    if (!isValidHttpUrl(rawUrl)) {
      showToast('Please enter a valid http:// or https:// video URL.', 'error');
      return;
    }

    const parsed = parseVideoSource(rawUrl);
    if (parsed.kind === 'unsupported') {
      showToast('Unsupported video URL. Use a direct .mp4/.webm link or a YouTube/Vimeo link.', 'error');
      return;
    }

    draftMedia.push({
      id: `media_ext_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'video',
      source: 'external',
      url: rawUrl,
      fileId: '',
      fileName: '',
      order: draftMedia.length + 1
    });
    extVideoUrlInput.value = '';
    renderMediaPreviewTray();
    showToast('External video added.', 'success');
  });

  function renderMediaPreviewTray() {
    // Re-index order numbers sequentially
    draftMedia.forEach((m, idx) => {
      m.order = idx + 1;
    });

    attachmentCountEl.textContent = String(draftMedia.length);
    mediaPreviewList.innerHTML = '';

    if (draftMedia.length === 0) {
      mediaPreviewList.innerHTML = '<p class="empty-tray-text">No photos or videos attached yet.</p>';
      return;
    }

    draftMedia.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'attachment-item';

      // Thumbnail Preview
      const thumb = document.createElement('div');
      thumb.className = 'attachment-thumb';
      if (item.type === 'image') {
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = item.fileName || 'Attachment preview';
        img.addEventListener('click', () => openLightbox(item.url, item.fileName || item.url));
        thumb.appendChild(img);
      } else {
        const parsed = parseVideoSource(item.url);
        if (parsed.kind === 'native') {
          const vid = document.createElement('video');
          vid.src = parsed.safeUrl;
          vid.muted = true;
          vid.preload = 'metadata';
          thumb.appendChild(vid);
        } else {
          thumb.innerHTML = `<span class="attachment-video-badge">▶ ${escapeHTML(parsed.provider || 'Video')}</span>`;
        }
      }

      // Metadata
      const meta = document.createElement('div');
      meta.className = 'attachment-meta';
      meta.innerHTML = `
        <div class="attachment-tags">
          <span class="tag-pill">#${index + 1}</span>
          <span class="tag-pill">${item.type === 'video' ? 'Video' : 'Image'}</span>
          <span class="tag-pill ${item.source}">${item.source === 'drive' ? 'Google Drive' : 'External URL'}</span>
        </div>
        <div class="attachment-url-text" title="${escapeHTML(item.url)}">
          ${escapeHTML(item.fileName || item.url)}
        </div>
      `;

      // Reorder & Remove Actions
      const actions = document.createElement('div');
      actions.className = 'attachment-actions';

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'btn btn-secondary btn-xs';
      upBtn.textContent = '↑';
      upBtn.title = 'Move up';
      upBtn.disabled = index === 0;
      upBtn.addEventListener('click', () => {
        [draftMedia[index - 1], draftMedia[index]] = [draftMedia[index], draftMedia[index - 1]];
        renderMediaPreviewTray();
      });

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'btn btn-secondary btn-xs';
      downBtn.textContent = '↓';
      downBtn.title = 'Move down';
      downBtn.disabled = index === draftMedia.length - 1;
      downBtn.addEventListener('click', () => {
        [draftMedia[index], draftMedia[index + 1]] = [draftMedia[index + 1], draftMedia[index]];
        renderMediaPreviewTray();
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn btn-danger-ghost btn-xs';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', async () => {
        const [removed] = draftMedia.splice(index, 1);
        renderMediaPreviewTray();

        // If removing an un-saved new Drive upload, clean it up immediately
        if (removed && removed.source === 'drive' && removed.fileId && !entryIdInput.value) {
          try {
            await apiPost({
              action: 'deleteMediaFile',
              token: sessionToken,
              fileId: removed.fileId
            });
          } catch {
            // Non-blocking cleanup
          }
        }
      });

      actions.append(upBtn, downBtn, removeBtn);
      row.append(thumb, meta, actions);
      mediaPreviewList.appendChild(row);
    });
  }

  /* ------------------------------------------------------------------------
     OPTIONAL EXTERNAL LINKS BUILDER
     ------------------------------------------------------------------------ */

  addLinkBtn.addEventListener('click', () => {
    const url = linkUrlInput.value.trim();
    const label = linkLabelInput.value.trim() || url;

    if (!isValidHttpUrl(url)) {
      showToast('Please enter a valid http:// or https:// URL.', 'error');
      return;
    }

    draftLinks.push({ label, url });
    linkLabelInput.value = '';
    linkUrlInput.value = '';
    renderLinksPreviewTray();
  });

  function renderLinksPreviewTray() {
    linksPreviewList.innerHTML = '';
    draftLinks.forEach((lnk, idx) => {
      const chip = document.createElement('span');
      chip.className = 'link-draft-chip';
      chip.innerHTML = `
        <a href="${escapeHTML(lnk.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(lnk.label)}</a>
        <button type="button" class="slot-remove-btn" aria-label="Remove link">&times;</button>
      `;
      chip.querySelector('button').addEventListener('click', () => {
        draftLinks.splice(idx, 1);
        renderLinksPreviewTray();
      });
      linksPreviewList.appendChild(chip);
    });
  }

  /* ------------------------------------------------------------------------
     COMPOSER STATE, PREVIEW & SAVE (CREATE / UPDATE)
     ------------------------------------------------------------------------ */

  contentInput.addEventListener('input', () => {
    const words = contentInput.value.trim().split(/\s+/).filter(Boolean).length;
    wordCounter.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
  });

  function resetComposerToNew() {
    entryIdInput.value = '';
    titleInput.value = '';
    dateInput.value = toLocalDateTimeInputValue(new Date().toISOString());
    contentInput.value = '';
    wordCounter.textContent = '0 words';

    selectedEmotions = [];
    draftMedia = [];
    draftLinks = [];

    composerModeBadge.textContent = 'New Entry';
    composerModeBadge.classList.remove('editing');
    composerHeading.textContent = "Document Today's Experience";
    saveEntryBtn.textContent = 'Publish Journal Entry';
    cancelEditBtn.classList.add('hidden');

    renderMoodChecker();
    renderMediaPreviewTray();
    renderLinksPreviewTray();
  }

  function loadEntryIntoComposer(entry) {
    entryIdInput.value = entry.id;
    titleInput.value = entry.title;
    dateInput.value = toLocalDateTimeInputValue(entry.entryDate);
    contentInput.value = entry.content;
    const words = entry.content.trim().split(/\s+/).filter(Boolean).length;
    wordCounter.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;

    selectedEmotions = [...(entry.emotions || [])].slice(0, 3);
    draftMedia = (entry.media || []).map((m, i) => ({ ...m, order: i + 1 }));
    draftLinks = (entry.links || []).map(l => ({ ...l }));

    composerModeBadge.textContent = 'Editing Entry';
    composerModeBadge.classList.add('editing');
    composerHeading.textContent = `Editing: ${entry.title}`;
    saveEntryBtn.textContent = 'Save Changes';
    cancelEditBtn.classList.remove('hidden');

    renderMoodChecker();
    renderMediaPreviewTray();
    renderLinksPreviewTray();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEditBtn.addEventListener('click', resetComposerToNew);

  function buildDraftEntryObject() {
    const localVal = dateInput.value;
    const isoEntryDate = localVal ? new Date(localVal).toISOString() : new Date().toISOString();
    return {
      id: entryIdInput.value.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entryDate: isoEntryDate,
      title: titleInput.value.trim(),
      content: contentInput.value.trim(),
      emotions: [...selectedEmotions],
      media: draftMedia.map((m, idx) => ({ ...m, order: idx + 1 })),
      links: [...draftLinks]
    };
  }

  // Preview Modal
  const previewModal = document.getElementById('preview-modal');
  const previewModalBody = document.getElementById('preview-modal-body');

  previewEntryBtn.addEventListener('click', () => {
    const draft = buildDraftEntryObject();
    if (!draft.title) draft.title = '(Untitled Entry)';
    if (!draft.content) draft.content = '(No written content yet)';
    previewModalBody.innerHTML = '';
    previewModalBody.appendChild(buildJournalCardElement(draft));
    previewModal.classList.remove('hidden');
  });

  document.getElementById('btn-close-preview').addEventListener('click', () => {
    previewModal.classList.add('hidden');
  });
  previewModal.addEventListener('click', e => {
    if (e.target === previewModal) previewModal.classList.add('hidden');
  });

  // Submit Create or Update
  entryForm.addEventListener('submit', async e => {
    e.preventDefault();
    const draft = buildDraftEntryObject();

    if (!draft.title) {
      showToast('Please enter a journal title.', 'error');
      titleInput.focus();
      return;
    }
    if (!dateInput.value) {
      showToast('Please choose an entry date and time.', 'error');
      dateInput.focus();
      return;
    }
    if (!draft.content) {
      showToast('Please write your journal content.', 'error');
      contentInput.focus();
      return;
    }
    if (draft.emotions.length !== 3) {
      showToast(`Please select exactly 3 emotions (currently ${draft.emotions.length}/3).`, 'error');
      return;
    }

    const isEditing = Boolean(draft.id);
    saveEntryBtn.disabled = true;
    saveEntryBtn.textContent = isEditing ? 'Saving Changes…' : 'Publishing…';

    try {
      await apiPost({
        action: isEditing ? 'updateEntry' : 'createEntry',
        token: sessionToken,
        id: draft.id,
        title: draft.title,
        entryDate: draft.entryDate,
        content: draft.content,
        emotions: draft.emotions,
        media: draft.media,
        links: draft.links
      });

      showToast(
        isEditing ? 'Journal entry updated!' : 'Journal entry published!',
        'success'
      );
      resetComposerToNew();
      await loadAdminEntries();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveEntryBtn.disabled = false;
      saveEntryBtn.textContent = entryIdInput.value ? 'Save Changes' : 'Publish Journal Entry';
    }
  });

  /* ------------------------------------------------------------------------
     MANAGE EXISTING ENTRIES (EDIT & DELETE)
     ------------------------------------------------------------------------ */

  async function loadAdminEntries() {
    adminEntriesList.innerHTML = '<p class="muted-text">Loading journal entries…</p>';
    try {
      const res = await apiGet({ action: 'getEntries' });
      entriesCache = Array.isArray(res.data.entries) ? res.data.entries : [];
      renderManageList();
    } catch (err) {
      adminEntriesList.innerHTML = `<p class="status-banner error">${escapeHTML(err.message)}</p>`;
    }
  }

  function renderManageList() {
    const query = manageSearchInput.value.trim().toLowerCase();
    const filtered = entriesCache.filter(entry => {
      if (!query) return true;
      const hay = `${entry.title} ${entry.content} ${(entry.emotions || []).join(' ')}`.toLowerCase();
      return hay.includes(query);
    });

    adminEntriesList.innerHTML = '';

    if (filtered.length === 0) {
      adminEntriesList.innerHTML = '<p class="muted-text">No entries found.</p>';
      return;
    }

    filtered.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'manage-entry-row';

      const info = document.createElement('div');
      info.className = 'manage-entry-info';

      const title = document.createElement('h3');
      title.className = 'manage-entry-title';
      title.textContent = entry.title;

      const sub = document.createElement('div');
      sub.className = 'manage-entry-sub';
      sub.innerHTML = `
        <span>${escapeHTML(formatShortTimestamp(entry.entryDate))}</span>
        <span>&bull;</span>
        <span>${escapeHTML((entry.emotions || []).join(', '))}</span>
        ${entry.media && entry.media.length > 0 ? `<span>&bull; ${entry.media.length} attachment(s)</span>` : ''}
      `;

      info.append(title, sub);

      const actions = document.createElement('div');
      actions.className = 'manage-entry-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => loadEntryIntoComposer(entry));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger-ghost btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => handleDeleteEntry(entry, deleteBtn));

      actions.append(editBtn, deleteBtn);
      row.append(info, actions);
      adminEntriesList.appendChild(row);
    });
  }

  async function handleDeleteEntry(entry, buttonEl) {
    const confirmed = window.confirm(
      `Delete "${entry.title}"?\n\nThis will permanently remove the entry from Google Sheets and clean up any media files uploaded to Google Drive for this entry.`
    );
    if (!confirmed) return;

    buttonEl.disabled = true;
    buttonEl.textContent = 'Deleting…';

    try {
      await apiPost({
        action: 'deleteEntry',
        token: sessionToken,
        id: entry.id
      });
      if (entryIdInput.value === entry.id) {
        resetComposerToNew();
      }
      showToast('Journal entry deleted.', 'success');
      await loadAdminEntries();
    } catch (err) {
      showToast(err.message, 'error');
      buttonEl.disabled = false;
      buttonEl.textContent = 'Delete';
    }
  }

  manageSearchInput.addEventListener('input', renderManageList);

  // Start Admin Initialization
  checkExistingSession();
}

/* ==========================================================================
   APPLICATION BOOTSTRAP
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initLightbox();

  if (document.getElementById('journal-feed-view')) {
    initJournalFeedPage();
  }
  if (document.getElementById('admin-app-view')) {
    initAdminPage();
  }
});
