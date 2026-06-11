// js/app.js  —  Router + Global Socket
import { register, navigate, getState, setState } from './helpers.js';
import { renderLogin, renderRegister }  from './screens/auth.js';
import { renderSetup }                  from './screens/setup.js';
import { renderDiscover, renderChats, renderChatroom, renderRequests } from './screens/main.js';
import { renderProfile, renderSettings, renderBlocked, renderEditProfile, renderConnections, renderViewProfile } from './screens/profile.js';
import { renderSearch }                 from './screens/search.js';

/* ═══════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════ */
register('/login',        () => renderLogin());
register('/register',     () => renderRegister());
register('/setup',        () => renderSetup());
register('/discover',     () => renderDiscover());
register('/chats',        () => renderChats());
register('/chatroom',     () => renderChatroom());
register('/requests',     () => renderRequests());
register('/profile',      () => renderProfile());
register('/connections',  () => renderConnections());
register('/view-profile', () => renderViewProfile());
register('/settings',     () => renderSettings());
register('/blocked',      () => renderBlocked());
register('/edit-profile', () => renderEditProfile());
register('/search',       () => renderSearch());


/* ═══════════════════════════════════════════════════════
   GLOBAL SOCKET  — one connection for the entire session
   Stays alive across ALL page navigations.
   Handles: live badge updates, online/offline events.
   The chatroom REUSES this same socket (no duplicate connections).
═══════════════════════════════════════════════════════ */

// Public: which chatroom is currently open (null = none)
window._currentChatId = null;

export function initGlobalSocket() {
  const me = getState().currentUser;
  if (!me || !window.io) return;

  const myId = me.uid || me._id || '';
  if (!myId) return;

  // Already connected — just re-announce online status
  if (window._cipherSocket?.connected) {
    window._cipherSocket.emit('user_online', myId);
    return;
  }

  window._cipherSocket = window.io('https://cipher-425d.onrender.com');

  window._cipherSocket.on('connect', () => {
    window._cipherSocket.emit('user_online', myId);
  });

  // ── New message arrived ──────────────────────────────
  // If user is NOT in that specific chatroom, show badge
  window._cipherSocket.on('new_message', (msg) => {
    const chatId = window._currentChatId;
    const connId = msg.connectionId?.toString() || msg.connectionId;
    if (connId && connId === chatId) return; // user is looking at that chat, skip badge

    // Increment badge
    const cur = getState().unreadCount || 0;
    setState({ unreadCount: cur + 1 });
    _updateBadge('/chats', getState().unreadCount);
  });

  // ── New connection request ───────────────────────────
  window._cipherSocket.on('new_request', () => {
    const cur = getState().pendingCount || 0;
    setState({ pendingCount: cur + 1 });
    _updateBadge('/requests', getState().pendingCount);
  });

  // ── Friend came online ───────────────────────────────
  window._cipherSocket.on('friend_online', ({ userId }) => {
    // Update any visible online dots in the chats list
    _updateOnlineDot(userId, true);
  });

  // ── Friend went offline ──────────────────────────────
  window._cipherSocket.on('friend_offline', ({ userId }) => {
    _updateOnlineDot(userId, false);
  });

  window._cipherSocket.on('disconnect', () => {
    // Socket.io auto-reconnects — no manual action needed
  });
}

// Update a tab badge count in DOM
function _updateBadge(path, count) {
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

// Update all online status dots that are currently visible in DOM
function _updateOnlineDot(userId, isOnline) {
  document.querySelectorAll(`[data-online-uid="${userId}"]`).forEach(dot => {
    dot.style.background = isOnline ? '#34c759' : '#c7c7cc';
  });
}


/* ═══════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════ */
const token = localStorage.getItem('token');
if (token) {
  navigate('/discover');
  // Short delay so currentUser is in state before socket init
  setTimeout(() => initGlobalSocket(), 300);
} else {
  navigate('/login');
}