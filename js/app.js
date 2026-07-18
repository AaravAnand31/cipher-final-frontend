// js/app.js  —  Router + Global Socket
import { register, navigate, getState, setState } from './helpers.js';
import { renderLogin, renderRegister }  from './screens/auth.js';
import { renderSetup }                  from './screens/setup.js';
import { renderDiscover, renderChats, renderChatroom, renderRequests } from './screens/main.js';
import { renderProfile, renderSettings, renderBlocked, renderEditProfile, renderConnections, renderViewProfile } from './screens/profile.js';
import { renderSearch }                 from './screens/search.js';
import { renderEvents, renderEventDetail, renderEventEdit } from './screens/events.js';

/* ═══════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════ */
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
register('/events',       () => renderEvents());
register('/event-detail', () => renderEventDetail());
register('/event-edit',   () => renderEventEdit());


/* ═══════════════════════════════════════════════
   DECODE USER ID FROM JWT
   More reliable than reading from state — JWT
   always contains the real MongoDB _id.
═══════════════════════════════════════════════ */
export function getMyUserId() {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
        // JWT structure: header.payload.signature — payload is base64url
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.id || payload._id || '';
    } catch (_) {
        // Fallback to state
        const me = getState().currentUser;
        return me?.uid || me?._id || '';
    }
}


/* ═══════════════════════════════════════════════
   GLOBAL SOCKET
   One connection for the whole session.
   Stays alive across ALL page navigations.

   IMPORTANT: listens for "message_notification"
   (NOT "new_message") for badge updates.
   The chatroom listens for "new_message" separately.
   This prevents duplicate message rendering.
═══════════════════════════════════════════════ */
window._currentChatId = null;   // set by chatroom when open

export function initGlobalSocket() {
    const myId = getMyUserId();
    if (!myId || !window.io) return;

    // Already connected — just re-announce
    if (window._cipherSocket?.connected) {
        window._cipherSocket.emit('user_online', myId);
        return;
    }

    window._cipherSocket = window.io('https://cipher-425d.onrender.com');

    window._cipherSocket.on('connect', () => {
        console.log('Global socket connected, announcing user_online:', myId);
        window._cipherSocket.emit('user_online', myId);
    });

    // Badge update — lightweight notification, does NOT render a message bubble
    window._cipherSocket.on('message_notification', ({ connectionId }) => {
        // Only increment badge if user is NOT currently in that chat
        if (connectionId === window._currentChatId) return;
        const cur = getState().unreadCount || 0;
        setState({ unreadCount: cur + 1 });
        _updateBadge('/chats', getState().unreadCount);
    });

    // New connection request
    window._cipherSocket.on('new_request', () => {
        const cur = getState().pendingCount || 0;
        setState({ pendingCount: cur + 1 });
        _updateBadge('/requests', getState().pendingCount);
    });

    // Online/offline status dots (for pages other than chatroom)
    window._cipherSocket.on('friend_online', ({ userId }) => {
        _updateOnlineDot(userId, true);
    });

    window._cipherSocket.on('friend_offline', ({ userId }) => {
        _updateOnlineDot(userId, false);
    });

    window._cipherSocket.on('disconnect', () => {
        console.log('Global socket disconnected — will auto-reconnect');
    });

    window._cipherSocket.on('reconnect', () => {
        // Re-announce online status after reconnect
        window._cipherSocket.emit('user_online', myId);
    });
}

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

function _updateOnlineDot(userId, isOnline) {
    document.querySelectorAll(`[data-online-uid="${userId}"]`).forEach(dot => {
        dot.style.background = isOnline ? '#34c759' : '#c7c7cc';
    });
}


/* ═══════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════ */
const token = localStorage.getItem('token');
if (token) {
    navigate('/discover');
    // Init socket after state is loaded
    setTimeout(() => initGlobalSocket(), 100);
} else {
    navigate('/login');
}