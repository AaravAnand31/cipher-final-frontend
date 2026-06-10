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
    <path d="M4 5h18a1 1 0 011 1v11a1 1 0 01-1 1H8l-5 4V6a1 1 0 011-1z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
  </svg>`,
  requests: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path d="M13 3a5 5 0 100 10A5 5 0 0013 3zM4 22c0-4 4-7 9-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M19 17v6M16 20h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
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
              ? `<span class="tab-badge">${pendingCount > 9 ? '9+' : pendingCount}</span>`
              : ''}
            ${t.id === 'chats' && unreadCount > 0
              ? `<span class="tab-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>`
              : ''}
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

  // Load real badge counts asynchronously
  loadBadgeCounts();
}

// Fetch real pending requests count + unread message count
// Updates state and re-renders badges without re-rendering whole page
async function loadBadgeCounts() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const headers = { 'Authorization': `Bearer ${token}` };

  try {
    const [reqRes, unreadRes] = await Promise.all([
      fetch(`${API_URL}/connections/requests`,    { headers }),
      fetch(`${API_URL}/connections/unread-total`, { headers }),
    ]);

    let changed = false;

    if (reqRes.ok) {
      const reqs  = await reqRes.json();
      const count = reqs.length;
      if (getState().pendingCount !== count) {
        setState({ pendingCount: count });
        changed = true;
      }
    }

    if (unreadRes.ok) {
      const { total } = await unreadRes.json();
      if (getState().unreadCount !== total) {
        setState({ unreadCount: total });
        changed = true;
      }
    }

    // Update badges in DOM without full re-render
    if (changed) updateBadgesInDOM();

  } catch (_) {}
}

function updateBadgesInDOM() {
  const { pendingCount = 0, unreadCount = 0 } = getState();

  // Requests badge
  const reqIcon = document.querySelector('[data-nav="/requests"] .tab-icon');
  if (reqIcon) {
    reqIcon.querySelector('.tab-badge')?.remove();
    if (pendingCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'tab-badge';
      badge.textContent = pendingCount > 9 ? '9+' : pendingCount;
      reqIcon.appendChild(badge);
    }
  }

  // Chats badge
  const chatIcon = document.querySelector('[data-nav="/chats"] .tab-icon');
  if (chatIcon) {
    chatIcon.querySelector('.tab-badge')?.remove();
    if (unreadCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'tab-badge';
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      chatIcon.appendChild(badge);
    }
  }
}

// Call this from outside (e.g. after receiving a new message via socket)
export function refreshBadges() {
  loadBadgeCounts();
}