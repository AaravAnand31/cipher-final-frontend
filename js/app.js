// js/app.js  —  Pure frontend, no Firebase
import { register, navigate, getState } from './helpers.js';
import { renderLogin, renderRegister }  from './screens/auth.js';
import { renderSetup }                  from './screens/setup.js';
import { renderDiscover, renderChats, renderChatroom, renderRequests } from './screens/main.js';
import { renderProfile, renderSettings, renderBlocked } from './screens/profile.js';

// ── Register all routes ────────────────────────────────
register('/login',            () => renderLogin());
register('/register',         () => renderRegister());
register('/setup',            () => renderSetup());
register('/discover',         () => renderDiscover());
register('/chats',            () => renderChats());
register('/chatroom',         () => renderChatroom());
register('/requests',         () => renderRequests());
register('/profile',          () => renderProfile());
register('/settings',         () => renderSettings());
register('/blocked',          () => renderBlocked());

// ── Boot ───────────────────────────────────────────────
// Start at login (your backend friend will add real auth checks here later)
navigate('/login');
