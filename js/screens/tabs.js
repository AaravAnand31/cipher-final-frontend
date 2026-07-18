// js/screens/tabs.js
import { navigate, getState, setState } from '../helpers.js';
import API_URL from '../api.js';

const SVGs = {
  discover: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="13" r="11" stroke="currentColor" stroke-width="1.7"/>
    <path d="M17 9l-3 7-4-4 7-3z" fill="currentColor"/>
  </svg>`,
  search: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.7"/>
    <path d="M16.5 16.5L22 22" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,
  chats: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path d="M4 5h18a1 1 0 011 1v11a1 1 0 01-1 1H8l-5 4V6a1 1 0 011-1z"
      stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
  </svg>`,
  requests: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path d="M13 3a5 5 0 100 10A5 5 0 0013 3zM4 22c0-4 4-7 9-7"
      stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M19 17v6M16 20h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  </svg>`,
  events: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <rect x="4" y="5" width="18" height="17" rx="2.5" stroke="currentColor" stroke-width="1.7"/>
    <path d="M4 10h18" stroke="currentColor" stroke-width="1.7"/>
    <path d="M8.5 3v4M17.5 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <circle cx="9" cy="14.5" r="1.3" fill="currentColor"/>
    <circle cx="13" cy="14.5" r="1.3" fill="currentColor"/>
  </svg>`,
  profile: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="9" r="5" stroke="currentColor" stroke-width="1.7"/>
    <path d="M4 22c0-5 4-9 9-9s9 4 9 9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  </svg>`,
};

export function tabBarHTML(active) {
  const { pendingCount = 0, unreadCount = 0 } = getState();

  const tabs = [
    { id: 'discover',  label: 'Discover', path: '/discover' },
    { id: 'events',    label: 'Events',   path: '/events'   },
    { id: 'search',    label: 'Search',   path: '/search'   },
    { id: 'chats',     label: 'Chats',    path: '/chats'    },
    { id: 'requests',  label: 'Requests', path: '/requests' },
    { id: 'profile',   label: 'Profile',  path: '/profile'  },
  ];

  return `
    <nav class="tab-bar">
      ${tabs.map(t => `
        <div class="tab-item ${t.id === active ? 'active' : ''}" data-nav="${t.path}">
          <div class="tab-icon">
            ${SVGs[t.id]}
            ${t.id === 'requests' && pendingCount > 0
              ? `<span class="tab-badge">${pendingCount > 9 ? '9+' : pendingCount}</span>` : ''}
            ${t.id === 'chats' && unreadCount > 0
              ? `<span class="tab-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
          </div>
          <span class="tab-label">${t.label}</span>
        </div>`).join('')}
    </nav>`;
}

export function bindTabs() {
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-nav]').forEach(el =>
      el.addEventListener('click', () => navigate(el.dataset.nav))
    );
  });
  // Fetch real counts from backend and update badges
  loadBadgeCounts();
}

/* ═══════════════════════════════════════════════
   Fetch real counts and update DOM badges.
   Called on every page that has a tab bar.
   Also called by main.js after marking messages seen.
═══════════════════════════════════════════════ */
export async function refreshBadges() {
  await loadBadgeCounts();
}

async function loadBadgeCounts() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const headers = { 'Authorization': `Bearer ${token}` };

  try {
    const [reqRes, unreadRes] = await Promise.all([
      fetch(`${API_URL}/connections/requests`,     { headers }),
      fetch(`${API_URL}/connections/unread-total`, { headers }),
    ]);

    if (reqRes.ok) {
      const reqs  = await reqRes.json();
      const count = reqs.length;
      if (getState().pendingCount !== count) setState({ pendingCount: count });
      updateBadgeDOM('/requests', count);
    }

    if (unreadRes.ok) {
      const { total } = await unreadRes.json();
      if (getState().unreadCount !== total) setState({ unreadCount: total });
      updateBadgeDOM('/chats', total);
    }
  } catch (_) { /* silent */ }
}

export function updateBadgeDOM(path, count) {
  const icon = document.querySelector(`[data-nav="${path}"] .tab-icon`);
  if (!icon) return;
  icon.querySelector('.tab-badge')?.remove();
  if (count > 0) {
    const b = document.createElement('span');
    b.className = 'tab-badge';
    b.textContent = count > 9 ? '9+' : count;
    icon.appendChild(b);
  }
}