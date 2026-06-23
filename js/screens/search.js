// js/screens/search.js
import {
  navigate, getState, setState,
  avatarHTML, tagHTML, toast,
} from '../helpers.js';
import { tabBarHTML, bindTabs } from './tabs.js';
import API_URL from '../api.js';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  };
}

/* ══════════════════════════════════════════════════
   SEARCH — real backend search, debounced
══════════════════════════════════════════════════ */
let _connecting = new Set();   // uids currently sending a request
let _connected  = new Set();   // uids we've already sent a request to (this session)
let _debounceTimer = null;
let _cachedSuggestions = null; // small set of people shown before typing

export function renderSearch() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="background:var(--bg-secondary)">

      <div class="nav-bar" style="padding-bottom:8px">
        <div style="width:100%">
          <div style="font-size:34px;font-weight:700;letter-spacing:-0.5px;color:var(--label-primary);margin-bottom:10px">
            Search
          </div>
          <div style="display:flex;align-items:center;gap:10px;background:var(--fill-tertiary);border-radius:var(--r-sm);padding:9px 14px">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" style="flex-shrink:0;color:var(--label-tertiary)">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.8"/>
              <path d="M11.5 11.5L15 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <input
              id="search-input"
              type="search"
              placeholder="Search students, interests, department…"
              autocomplete="off" autocorrect="off" spellcheck="false"
              style="flex:1;font-size:16px;color:var(--label-primary);background:transparent;border:none;outline:none;font-family:var(--font)"
            />
            <button id="search-clear" style="display:none;color:var(--label-tertiary);font-size:18px;line-height:1;padding:0 2px" aria-label="Clear">✕</button>
          </div>
        </div>
      </div>

      <div class="screen-body" id="search-results" style="padding:12px 16px 8px">
        <div style="text-align:center;padding:60px 0"><div class="spinner"></div></div>
      </div>

      ${tabBarHTML('search')}
    </div>`;

  bindTabs();

  const input    = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');

  requestAnimationFrame(() => input.focus());

  // Load suggestions on first open
  loadSuggestions();

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.style.display = q ? 'block' : 'none';

    clearTimeout(_debounceTimer);

    if (!q) {
      renderSuggestions();
      return;
    }

    // Debounce — wait 300ms after typing stops before hitting the API
    document.getElementById('search-results').innerHTML = `
      <div style="text-align:center;padding:60px 0"><div class="spinner"></div></div>`;

    _debounceTimer = setTimeout(() => runSearch(q), 300);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    renderSuggestions();
    input.focus();
  });
}

/* ── Suggestions (shown before typing) ─────────────── */
async function loadSuggestions() {
  try {
    const res = await fetch(`${API_URL}/users?limit=5`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed');
    _cachedSuggestions = await res.json();
  } catch (err) {
    console.error('Could not load suggestions:', err);
    _cachedSuggestions = [];
  }
  renderSuggestions();
}

function renderSuggestions() {
  const results = document.getElementById('search-results');
  if (!results) return;

  const categories = [
    { label: '🎯 Make friends',    filter: 'Make friends'    },
    { label: '🤝 Project partner', filter: 'Project partner' },
    { label: '📚 Study buddy',     filter: 'Study buddy'     },
    { label: '🚀 Startup ideas',   filter: 'Startup ideas'   },
    { label: '☕ Chai & chat',      filter: 'Chai & chat'     },
    { label: '🎓 Mentor / learn',  filter: 'Mentor / learn'  },
  ];

  const people = _cachedSuggestions || [];

  results.innerHTML = `
    <div style="margin-bottom:8px">
      <div style="font-size:13px;font-weight:600;color:var(--label-secondary);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:10px">
        Browse by vibe
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
        ${categories.map(c => `
          <button class="chip" data-suggest="${c.filter}" style="font-size:13px">${c.label}</button>
        `).join('')}
      </div>

      <div style="font-size:13px;font-weight:600;color:var(--label-secondary);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:10px">
        People you might know
      </div>
      ${people.length ? `
        <div style="background:var(--bg-card);border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-sm)">
          ${people.map((p, i) => miniRowHTML(p, i === people.length - 1)).join('')}
        </div>` : `
        <div class="empty-state" style="padding-top:24px">
          <div class="empty-icon">👥</div>
          <div class="empty-title">No one to show yet</div>
          <div class="empty-body">New students join every day.</div>
        </div>`}
    </div>`;

  bindSuggestionChips();
  bindResultActions();
}

/* ── Real search against backend ───────────────────── */
async function runSearch(query) {
  const results = document.getElementById('search-results');
  if (!results) return;

  try {
    const res = await fetch(`${API_URL}/users?search=${encodeURIComponent(query)}`, {
      headers: authHeaders(),
    });

    if (res.status === 401) {
      toast('Session expired — please login again', 'error');
      navigate('/login');
      return;
    }
    if (!res.ok) throw new Error('Search failed');

    const people = await res.json();

    if (!people.length) {
      results.innerHTML = `
        <div class="empty-state" style="padding-top:48px">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">No results</div>
          <div class="empty-body">Try a name, department, interest, or year like "BCA" or "Chess".</div>
        </div>`;
      return;
    }

    results.innerHTML = `
      <div style="font-size:13px;font-weight:600;color:var(--label-secondary);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:10px">
        ${people.length} student${people.length !== 1 ? 's' : ''} found
      </div>
      <div style="background:var(--bg-card);border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-sm)">
        ${people.map((p, i) => miniRowHTML(p, i === people.length - 1)).join('')}
      </div>`;

    bindResultActions();

  } catch (err) {
    console.error('Search error:', err);
    results.innerHTML = `
      <div class="empty-state" style="padding-top:48px">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not search</div>
        <div class="empty-body">Check your connection and try again.</div>
      </div>`;
  }
}

/* ── Mini row card ──────────────────────────────────── */
function miniRowHTML(p, isLast) {
  const name = p.username || p.name || 'Student';
  const uid  = p._id || p.uid || '';
  const isConnected = _connected.has(uid) || p.connectionStatus === 'pending' || p.connectionStatus === 'accepted';
  const tags = (p.lookingFor || []).slice(0, 2).map(tagHTML).join('');

  return `
    <div class="search-person-row" data-uid="${uid}"
      style="display:flex;align-items:center;gap:12px;padding:12px 16px;
             border-bottom:${isLast ? 'none' : '0.5px solid var(--separator)'};
             cursor:pointer;transition:background 0.15s"
      onmouseenter="this.style.background='var(--fill-tertiary)'"
      onmouseleave="this.style.background=''"
    >
      <div style="position:relative;flex-shrink:0">
        ${avatarHTML(name, p.photoURL, 46)}
        <div data-online-uid="${uid}" style="position:absolute;bottom:0;right:0;
          width:11px;height:11px;border-radius:50%;
          background:${p.isOnline ? '#34c759' : '#c7c7cc'};
          border:2px solid var(--bg-card)"></div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:600;color:var(--label-primary)">${name}</div>
        <div style="font-size:13px;color:var(--label-secondary);margin-top:1px">${p.department || ''} ${p.year ? '· ' + p.year : ''}</div>
        ${tags ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">${tags}</div>` : ''}
      </div>
      <button
        class="btn btn-pill btn-sm search-connect-btn"
        data-connect-uid="${uid}"
        style="width:auto;flex-shrink:0;${isConnected ? 'opacity:0.5;pointer-events:none' : ''}"
      >
        ${isConnected ? '✓ Sent' : '+ Connect'}
      </button>
    </div>`;
}

/* ── Bind suggestion chips ──────────────────────────── */
function bindSuggestionChips() {
  document.querySelectorAll('[data-suggest]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input    = document.getElementById('search-input');
      const clearBtn = document.getElementById('search-clear');
      input.value = btn.dataset.suggest;
      clearBtn.style.display = 'block';

      document.getElementById('search-results').innerHTML = `
        <div style="text-align:center;padding:60px 0"><div class="spinner"></div></div>`;
      runSearch(btn.dataset.suggest);
      input.focus();
    });
  });
}

/* ── Bind connect buttons → real API call ──────────── */
function bindResultActions() {
  document.querySelectorAll('.search-connect-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const uid = btn.dataset.connectUid;
      if (!uid || _connected.has(uid) || _connecting.has(uid)) return;

      _connecting.add(uid);
      btn.disabled = true;
      btn.textContent = '…';

      try {
        const res = await fetch(`${API_URL}/connections/request`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ toUserId: uid }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Failed to send request');

        _connected.add(uid);
        btn.textContent = '✓ Sent';
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
        toast('Connection request sent! 🤝', 'success');

      } catch (err) {
        toast(err.message || 'Could not send request', 'error');
        btn.disabled = false;
        btn.textContent = '+ Connect';
      } finally {
        _connecting.delete(uid);
      }
    });
  });

  // Tap a row (not the button) → view that person's profile
  document.querySelectorAll('.search-person-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.search-connect-btn')) return;
      const uid = row.dataset.uid;
      if (uid) navigate('/view-profile', { userId: uid });
    });
  });
}