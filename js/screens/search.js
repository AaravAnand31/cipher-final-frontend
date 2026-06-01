// js/screens/search.js
import {
  navigate, getState, setState,
  avatarHTML, tagHTML, toast,
  DUMMY_PEOPLE, DUMMY_USER,
} from '../helpers.js';
import { tabBarHTML, bindTabs } from './tabs.js';

/* ══════════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════════ */
let searchConnected = new Set();

export function renderSearch() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="background:var(--bg-secondary)">

      <!-- Search nav bar -->
      <div class="nav-bar" style="padding-bottom:8px">
        <div style="width:100%">
          <div style="font-size:34px;font-weight:700;letter-spacing:-0.5px;color:var(--label-primary);margin-bottom:10px">
            Search
          </div>
          <!-- Search input -->
          <div style="display:flex;align-items:center;gap:10px;background:var(--fill-tertiary);border-radius:var(--r-sm);padding:9px 14px">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" style="flex-shrink:0;color:var(--label-tertiary)">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.8"/>
              <path d="M11.5 11.5L15 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <input
              id="search-input"
              type="search"
              placeholder="Search students, interests, department…"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              style="flex:1;font-size:16px;color:var(--label-primary);background:transparent;border:none;outline:none;font-family:var(--font)"
            />
            <button id="search-clear" style="display:none;color:var(--label-tertiary);font-size:18px;line-height:1;padding:0 2px" aria-label="Clear">✕</button>
          </div>
        </div>
      </div>

      <!-- Results -->
      <div class="screen-body" id="search-results" style="padding:12px 16px 8px">
        ${suggestionsHTML()}
      </div>

      ${tabBarHTML('search')}
    </div>`;

  bindTabs();

  const input     = document.getElementById('search-input');
  const clearBtn  = document.getElementById('search-clear');
  const results   = document.getElementById('search-results');

  // Auto-focus
  requestAnimationFrame(() => input.focus());

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.style.display = q ? 'block' : 'none';
    results.innerHTML = q.length ? searchResultsHTML(q) : suggestionsHTML();
    bindResultActions();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    results.innerHTML = suggestionsHTML();
    input.focus();
  });

  bindResultActions();
}

/* ── Suggestions (shown before typing) ─────────────── */
function suggestionsHTML() {
  const categories = [
    { label: '🎯 Make friends',    filter: 'Make friends'    },
    { label: '🤝 Project partner', filter: 'Project partner' },
    { label: '📚 Study buddy',     filter: 'Study buddy'     },
    { label: '🚀 Startup ideas',   filter: 'Startup ideas'   },
    { label: '☕ Chai & chat',      filter: 'Chai & chat'     },
    { label: '🎓 Mentor / learn',  filter: 'Mentor / learn'  },
  ];

  const topStudents = DUMMY_PEOPLE.slice(0, 3);

  return `
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
      <div style="background:var(--bg-card);border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-sm)">
        ${topStudents.map((p, i) => miniRowHTML(p, i === topStudents.length - 1)).join('')}
      </div>
    </div>`;
}

/* ── Search results ─────────────────────────────────── */
function searchResultsHTML(query) {
  const q = query.toLowerCase();
  const all = DUMMY_PEOPLE;

  // Score each person
  const scored = all.map(p => {
    let score = 0;
    const name   = p.name.toLowerCase();
    const dept   = (p.department || '').toLowerCase();
    const year   = (p.year || '').toLowerCase();
    const bio    = (p.bio || '').toLowerCase();
    const ice    = (p.icebreaker || '').toLowerCase();
    const tags   = (p.lookingFor || []).join(' ').toLowerCase();
    const ints   = (p.interests || []).join(' ').toLowerCase();

    if (name.startsWith(q))         score += 100;
    else if (name.includes(q))      score += 60;
    if (dept.includes(q))           score += 40;
    if (year.includes(q))           score += 30;
    if (ints.includes(q))           score += 25;
    if (tags.includes(q))           score += 20;
    if (bio.includes(q))            score += 10;
    if (ice.includes(q))            score += 8;

    return { p, score };
  })
  .filter(x => x.score > 0)
  .sort((a, b) => b.score - a.score);

  if (!scored.length) return `
    <div class="empty-state" style="padding-top:48px">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">No results</div>
      <div class="empty-body">Try a name, department, interest, or year like "BCA" or "Chess".</div>
    </div>`;

  return `
    <div style="font-size:13px;font-weight:600;color:var(--label-secondary);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:10px">
      ${scored.length} student${scored.length !== 1 ? 's' : ''} found
    </div>
    <div style="background:var(--bg-card);border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-sm)">
      ${scored.map(({p}, i) => miniRowHTML(p, i === scored.length - 1)).join('')}
    </div>`;
}

/* ── Mini row card ──────────────────────────────────── */
function miniRowHTML(p, isLast) {
  const isConnected = searchConnected.has(p.uid);
  const tags = (p.lookingFor || []).slice(0, 2).map(tagHTML).join('');

  return `
    <div class="search-person-row" data-uid="${p.uid}"
      style="display:flex;align-items:center;gap:12px;padding:12px 16px;
             border-bottom:${isLast ? 'none' : '0.5px solid var(--separator)'};
             cursor:pointer;transition:background 0.15s"
      onmouseenter="this.style.background='var(--fill-tertiary)'"
      onmouseleave="this.style.background=''"
    >
      ${avatarHTML(p.name, p.photoURL, 46)}
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:600;color:var(--label-primary)">${p.name}</div>
        <div style="font-size:13px;color:var(--label-secondary);margin-top:1px">${p.department} · ${p.year}</div>
        ${tags ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">${tags}</div>` : ''}
      </div>
      <button
        class="btn btn-pill btn-sm search-connect-btn"
        data-connect-uid="${p.uid}"
        style="width:auto;flex-shrink:0;${isConnected ? 'opacity:0.5;pointer-events:none' : ''}"
      >
        ${isConnected ? '✓ Sent' : '+ Connect'}
      </button>
    </div>`;
}

/* ── Bind actions ───────────────────────────────────── */
function bindResultActions() {
  // Suggestion chips → pre-fill search
  document.querySelectorAll('[data-suggest]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('search-input');
      const clearBtn = document.getElementById('search-clear');
      input.value = btn.dataset.suggest;
      clearBtn.style.display = 'block';
      document.getElementById('search-results').innerHTML = searchResultsHTML(btn.dataset.suggest);
      bindResultActions();
      input.focus();
    });
  });

  // Connect buttons
  document.querySelectorAll('.search-connect-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const uid = btn.dataset.connectUid;
      if (searchConnected.has(uid)) return;
      btn.disabled = true;
      btn.textContent = '...';
      setTimeout(() => {
        searchConnected.add(uid);
        btn.textContent = '✓ Sent';
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
        toast('Connection request sent! 🤝', 'success');
      }, 500);
    });
  });
}
