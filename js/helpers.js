// js/helpers.js  —  Router + Store + Utils (no Firebase)

/* ═══════════ STORE ═══════════ */
const _state = {
  currentUser: null,    // filled on "login"
  darkMode: JSON.parse(localStorage.getItem('cipher_dark') || 'false'),
  pendingCount: 2,      // dummy badge
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
  // exact match
  if (_routes[path]) { _routes[path]({ back: isBack }); return; }
  // pattern match
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
/* ══════════════════════════════════════════════════
   EMAIL VALIDATION — Gmail-only
   Single source of truth, reused by both login and
   register flows (and by the backend's own copy).
══════════════════════════════════════════════════ */
export function isGmailAddress(email) {
  const clean = String(email || '').trim().toLowerCase();
  return clean.endsWith('@gmail.com');
}

export const GMAIL_ONLY_MESSAGE = 'Only Gmail addresses (@gmail.com) are allowed.';

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

// Avatar
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

export function avatarHTML(name = '', photoURL = '', size = 46) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
  const fontSize = Math.round(size * 0.36);
  const img = photoURL ? `<img src="${photoURL}" alt="${name}" onerror="this.remove()" />` : '';
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${fontSize}px">${img}${photoURL ? '' : initials}</div>`;
}

// Time
export function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
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

/* ═══════════ DUMMY DATA ═══════════ */

export const DUMMY_CHATS = [
  {
    chatId: 'chat-1',
    otherUser: { uid: 'u2', name: 'Rohan Verma', year: '3rd year', department: 'B.Tech ECE', photoURL: 'https://i.pravatar.cc/150?img=12' },
    lastMessage: 'Yo let\'s finalize the project tonight 🔥',
    lastMessageAt: new Date(Date.now() - 8 * 60000),
    unread: 2,
  },
  {
    chatId: 'chat-2',
    otherUser: { uid: 'u3', name: 'Ananya Joshi', year: '1st year', department: 'BCA', photoURL: 'https://i.pravatar.cc/150?img=5' },
    lastMessage: 'That Figma file you sent is 🤌',
    lastMessageAt: new Date(Date.now() - 3 * 3600000),
    unread: 0,
  },
  {
    chatId: 'chat-3',
    otherUser: { uid: 'u4', name: 'Karan Mehta', year: 'Final year', department: 'MBA', photoURL: 'https://i.pravatar.cc/150?img=33' },
    lastMessage: 'Let\'s catch up at the library tomorrow',
    lastMessageAt: new Date(Date.now() - 1 * 86400000),
    unread: 0,
  },
];

export const DUMMY_MESSAGES = {
  'chat-1': [
    { id: 'm1', senderUid: 'u2', text: 'Hey! Saw your profile on Cipher. Looks like we\'re both into hackathons', time: new Date(Date.now() - 45 * 60000) },
    { id: 'm2', senderUid: 'me-001', text: 'Yes!! Are you applying for HackCU next month?', time: new Date(Date.now() - 44 * 60000) },
    { id: 'm3', senderUid: 'u2', text: 'Absolutely. Need a team. Want to pair up?', time: new Date(Date.now() - 43 * 60000) },
    { id: 'm4', senderUid: 'me-001', text: '100% in. I can handle frontend + design, you take hardware/backend?', time: new Date(Date.now() - 42 * 60000) },
    { id: 'm5', senderUid: 'u2', text: 'Perfect combo honestly 🤝', time: new Date(Date.now() - 40 * 60000) },
    { id: 'm6', senderUid: 'u2', text: 'Yo let\'s finalize the project tonight 🔥', time: new Date(Date.now() - 8 * 60000) },
  ],
  'chat-2': [
    { id: 'm1', senderUid: 'me-001', text: 'Hi Ananya! I noticed you\'re into UI design. What tools do you use?', time: new Date(Date.now() - 4 * 3600000) },
    { id: 'm2', senderUid: 'u3', text: 'Figma mostly! Sometimes Framer for prototypes. You?', time: new Date(Date.now() - 3.9 * 3600000) },
    { id: 'm3', senderUid: 'me-001', text: 'Same. Here\'s a file I\'ve been working on', time: new Date(Date.now() - 3.5 * 3600000) },
    { id: 'm4', senderUid: 'u3', text: 'That Figma file you sent is 🤌', time: new Date(Date.now() - 3 * 3600000) },
  ],
};

export const DUMMY_REQUESTS = [
  {
    requestId: 'req-1',
    fromUser: { uid: 'u1', name: 'Priya Sharma', year: '2nd year', department: 'BBA', photoURL: 'https://i.pravatar.cc/150?img=47', bio: 'Marketing enthusiast who loves brand strategy.', lookingFor: ['Make friends', 'Startup ideas'] },
  },
  {
    requestId: 'req-2',
    fromUser: { uid: 'u5', name: 'Ishaan Gupta', year: '2nd year', department: 'B.Tech CSE', photoURL: 'https://i.pravatar.cc/150?img=68', bio: 'Open source contributor with 3 unfinished side projects.', lookingFor: ['Project partner', 'Study buddy'] },
  },
];

// Fallback user shown on profile screen before real data loads
export const DUMMY_USER = {
  uid: '', name: '', email: '', year: '', department: '',
  bio: '', icebreaker: '', interests: [], lookingFor: [],
  openTo: ['Everyone'], photoURL: '', coverURL: '', profileDone: false,
};

// Fallback people list for search screen before real data loads
export const DUMMY_PEOPLE = [];

export const YEARS   = ['1st year', '2nd year', '3rd year', 'Final year', 'PG'];
export const LOOKING = ['Make friends', 'Project partner', 'Study buddy', 'Mentor / learn', 'Chai & chat', 'Startup ideas'];
export const DEPTS   = ['B.Tech CSE', 'B.Tech ECE', 'BCA', 'BBA', 'MBA', 'B.Com', 'BA', 'Other'];
export const OPEN_TO = ['Everyone', 'Same year', 'Seniors only', 'Juniors only'];