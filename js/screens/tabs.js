// js/screens/tabs.js
import { navigate, getState } from '../helpers.js';

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
  const { pendingCount } = getState();
  const tabs = [
    { id: 'discover',  label: 'Discover', path: '/discover' },
    { id: 'search',    label: 'Search',   path: '/search'  },
    { id: 'chats',     label: 'Chats',    path: '/chats'   },
    { id: 'requests',  label: 'Requests', path: '/requests'},
    { id: 'profile',   label: 'Profile',  path: '/profile' },
  ];
  return `
    <nav class="tab-bar">
      ${tabs.map(t => `
        <div class="tab-item ${t.id === active ? 'active' : ''}" data-nav="${t.path}">
          <div class="tab-icon">
            ${SVGs[t.id]}
            ${t.id === 'requests' && pendingCount > 0 ? `<span class="tab-badge">${pendingCount}</span>` : ''}
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
}
