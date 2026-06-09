// js/helpers.js  —  Router + Store + Utils

/* ═══════════ STORE ═══════════ */
const _state = {
  currentUser: null,
  darkMode: JSON.parse(localStorage.getItem('cipher_dark') || 'false'),
  // ── CHANGED: pendingCount is now fetched from backend, not a dummy value ──
  pendingCount: 0,
  // ── NEW: unreadCounts map  { connectionId → count } ──
  unreadCounts: {},
  // ── NEW: onlineUsers set  { userId } ──
  onlineUsers: new Set(),
};
const _subs = {};

export function getState()     { return _state; }
export function setState(patch) {
  const update = typeof patch === 'function' ? patch(_state) : patch;
  Object.assign(_state, update);
  ((_subs['*']) || []).forEach(fn => fn(_state));
}
export function subscribe(fn) {
  if (!_subs['*']) _subs['*'] = [];
  _subs['*'].push(fn);
  return () => { _subs['*'] = _subs['*'].filter(f => f !== fn); };
}

// Apply dark mode immediately
if (_state.darkMode) document.documentElement.classList.add('dark');

/* ═══════════ ROUTER ═══════════ */
const _routes  = {};
let   _params  = {};
let   _history = [];

export function getParams() { return _params; }
export function getPrevRoute() { return _history[_history.length - 2] || null; }

export function register(path, handler) { _routes[path] = handler; }

export function navigate(path, params = {}) {
  _params = params;
  _history.push(path);
  _dispatch(path);
}

export function back() {
  if (_history.length > 1) {
    _history.pop();
    const prev = _history[_history.length - 1] || '/login';
    _dispatch(prev, true);
  }
}

function _dispatch(path, isBack = false) {
  if (_routes[path]) { _routes[path]({ back: isBack }); return; }
  for (const pattern of Object.keys(_routes)) {
    const pParts = pattern.split('/').filter(Boolean);
    const aParts = path.split('/').filter(Boolean);
    if (pParts.length !== aParts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < pParts.length; i++) {
      if (pParts[i].startsWith(':')) params[pParts[i].slice(1)] = decodeURIComponent(aParts[i]);
      else if (pParts[i] !== aParts[i]) { ok = false; break; }
    }
    if (ok) { _params = { ..._params, ...params }; _routes[pattern]({ back: isBack }); return; }
  }
  console.log("Route not found:", path);
}

/* ═══════════ UTILS ═══════════ */

// Toast
export function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

// Confirm sheet
export function confirm(title, body) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.innerHTML = `
      <div class="sheet" style="padding-left:20px;padding-right:20px">
        <div class="sheet-handle"></div>
        <div style="font-size:20px;font-weight:700;margin-bottom:8px;color:var(--label-primary)">${title}</div>
        <div style="font-size:15px;color:var(--label-secondary);line-height:1.5;margin-bottom:24px">${body}</div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-secondary-fill flex-1" id="c-no">Cancel</button>
          <button class="btn btn-primary flex-1" id="c-yes" style="background:var(--red)">Confirm</button>
        </div>
      </div>`;
    document.getElementById('sheet-container').appendChild(overlay);
    overlay.querySelector('#c-no').onclick  = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#c-yes').onclick = () => { overlay.remove(); resolve(true); };
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
  });
}

// Avatar — returns DOM element
export function avatarEl(name = '', photoURL = '', size = 46) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
  const fontSize = Math.round(size * 0.36);
  const div = document.createElement('div');
  div.className = 'avatar';
  div.style.cssText = `width:${size}px;height:${size}px;font-size:${fontSize}px`;
  if (photoURL) {
    const img = document.createElement('img');
    img.src = photoURL; img.alt = name;
    img.onerror = () => { img.remove(); div.textContent = initials; };
    div.appendChild(img);
  } else {
    div.textContent = initials;
  }
  return div;
}

// Avatar — returns HTML string (no online dot)
export function avatarHTML(name = '', photoURL = '', size = 46) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
  const fontSize = Math.round(size * 0.36);
  const img = photoURL ? `<img src="${photoURL}" alt="${name}" onerror="this.remove()" />` : '';
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${fontSize}px">${img}${photoURL ? '' : initials}</div>`;
}

// ── NEW: Avatar with online dot ──
export function avatarWithStatusHTML(name = '', photoURL = '', size = 46, isOnline = false) {
  const dotSize  = Math.max(10, Math.round(size * 0.22));
  const dotBorder = Math.max(2, Math.round(dotSize * 0.2));
  return `
    <div style="position:relative;display:inline-block;flex-shrink:0">
      ${avatarHTML(name, photoURL, size)}
      ${isOnline ? `<div class="online-dot" style="width:${dotSize}px;height:${dotSize}px;border-width:${dotBorder}px"></div>` : ''}
    </div>`;
}

// Time ago (short)
export function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── NEW: lastSeen display text ──
export function lastSeenText(isOnline, lastSeen) {
  if (isOnline) return '<span class="online-label">● Online</span>';
  if (!lastSeen) return '<span style="color:var(--label-tertiary)">Offline</span>';
  const diff = Date.now() - new Date(lastSeen).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return '<span style="color:var(--label-tertiary)">Last seen just now</span>';
  if (m < 60) return `<span style="color:var(--label-tertiary)">Last seen ${m}m ago</span>`;
  const h = Math.floor(m / 60);
  if (h < 24) return `<span style="color:var(--label-tertiary)">Last seen ${h}h ago</span>`;
  const d = Math.floor(h / 24);
  return `<span style="color:var(--label-tertiary)">Last seen ${d}d ago</span>`;
}

// Tag colors
const TAG_MAP = {
  'Make friends':    '#e8f5e9|#2e7d32',
  'Project partner': '#e3f2fd|#1565c0',
  'Study buddy':     '#fff3e0|#e65100',
  'Startup ideas':   '#f3e5f5|#6a1b9a',
  'Chai & chat':     '#fce4ec|#880e4f',
  'Mentor / learn':  '#e8eaf6|#283593',
};
export function tagHTML(label) {
  const [bg, color] = (TAG_MAP[label] || '#f0faf2|#1c6b2a').split('|');
  return `<span class="tag" style="background:${bg};color:${color}">${label}</span>`;
}

// Spinner
export const spinnerHTML = `<span class="spinner"></span>`;
export const spinnerDarkHTML = `<span class="spinner spinner-dark"></span>`;

/* ═══════════ STATIC LISTS ═══════════ */
export const YEARS   = ['1st year', '2nd year', '3rd year', 'Final year', 'PG'];
export const LOOKING = ['Make friends', 'Project partner', 'Study buddy', 'Mentor / learn', 'Chai & chat', 'Startup ideas'];
export const DEPTS   = ['B.Tech CSE', 'B.Tech ECE', 'BCA', 'BBA', 'MBA', 'B.Com', 'BA', 'Other'];
export const OPEN_TO = ['Everyone', 'Same year', 'Seniors only', 'Juniors only'];

/* ═══════════ DUMMY DATA (kept for fallback/dev) ═══════════ */
export const DUMMY_USER = {
  uid: 'me-001',
  name: 'Aarav Anand',
  email: 'aarav.anand@christuniversity.in',
  year: '2nd year',
  department: 'B.Tech CSE',
  bio: 'Builder by day, chess nerd by night.',
  icebreaker: 'The one thing I want to build at college is a startup that actually ships.',
  lookingFor: ['Project partner', 'Startup ideas', 'Make friends'],
  interests: ['Chess', 'Coding', 'Badminton', 'Music', 'Design'],
  openTo: ['Everyone'],
  photoURL: '',
  coverURL: '',
  profileDone: true,
};