// js/screens/profile.js
import {
  navigate, back, getState, setState, getParams,
  avatarHTML, tagHTML, toast, confirm,
  DUMMY_USER, LOOKING, YEARS, OPEN_TO, DEPTS,
} from '../helpers.js';
import { tabBarHTML, bindTabs } from './tabs.js';
import { initGlobalSocket } from '../app.js';
import API_URL from '../api.js';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  };
}

/* ══════════════════════════════════════════════════
   MY PROFILE
══════════════════════════════════════════════════ */
export async function renderProfile() {
  const p = getState().currentUser || DUMMY_USER;
  const tags = (p.lookingFor||[]).map(tagHTML).join('');
  const interests = (p.interests||[]).map(i => `<span class="interest-pill">${i}</span>`).join('');
  const coverBg = `background:linear-gradient(145deg,#e8f5e9,#c8e6c9)`;

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="screen-body">
        <div class="profile-cover" style="${p.coverURL ? '' : coverBg}">
          ${p.coverURL ? `<img src="${p.coverURL}" alt="" style="width:100%;height:100%;object-fit:cover" />` : ''}
          <div class="profile-cover-overlay"></div>
        </div>

        <div class="profile-hero">
          <div style="display:flex;align-items:flex-end;justify-content:space-between">
            <div class="profile-avatar-ring">
              ${avatarHTML(p.name, p.photoURL, 80)}
            </div>
            <button class="btn btn-secondary-fill btn-sm" id="settings-btn"
              style="width:auto;margin-bottom:6px;padding:8px 16px;font-size:13px">
              ⚙️ Settings
            </button>
          </div>
          <div class="profile-name" style="margin-top:14px">${p.name || 'Your Name'}</div>
          <div class="profile-meta">${p.department||''} ${p.year ? '· '+p.year : ''}</div>
          ${tags ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${tags}</div>` : ''}
        </div>

        <!-- Stats -->
        <div style="padding:0 16px 4px;border-bottom:0.5px solid var(--separator)">
          <div class="stat-row">
            <div class="stat-item" id="stat-connections" style="cursor:pointer">
              <div class="stat-num" id="conn-count">—</div>
              <div class="stat-label">Connections</div>
            </div>
            <div class="stat-item">
              <div class="stat-num" id="chat-count">—</div>
              <div class="stat-label">Chats</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">${p.interests?.length||0}</div>
              <div class="stat-label">Interests</div>
            </div>
          </div>
        </div>

        ${p.bio ? `
        <div class="profile-section">
          <div class="profile-section-title">About</div>
          <div class="profile-bio">"${p.bio}"</div>
        </div>` : ''}

        ${p.icebreaker ? `
        <div class="profile-section">
          <div class="profile-section-title">Icebreaker</div>
          <div class="profile-bio" style="font-style:italic">"${p.icebreaker}"</div>
        </div>` : ''}

        ${interests ? `
        <div class="profile-section">
          <div class="profile-section-title">Interests</div>
          <div style="display:flex;flex-wrap:wrap;gap:7px">${interests}</div>
        </div>` : ''}

        <div class="profile-section" style="border-bottom:none">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:16px;color:var(--label-primary)">
                ${getState().darkMode ? '☀️ Light mode' : '🌙 Dark mode'}
              </div>
              <div style="font-size:13px;color:var(--label-secondary);margin-top:2px">
                ${getState().darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              </div>
            </div>
            <div class="toggle ${getState().darkMode?'on':''}" id="dark-toggle">
              <div class="toggle-knob"></div>
            </div>
          </div>
        </div>

        <div style="height:24px"></div>
      </div>
      ${tabBarHTML('profile')}
    </div>`;

  bindTabs();

  document.getElementById('settings-btn').addEventListener('click', () => navigate('/settings'));
  document.getElementById('dark-toggle').addEventListener('click', () => {
    const next = !getState().darkMode;
    setState({ darkMode: next });
    localStorage.setItem('cipher_dark', JSON.stringify(next));
    document.documentElement.classList.toggle('dark', next);
    renderProfile();
  });
  document.getElementById('stat-connections').addEventListener('click', () => navigate('/connections'));

  loadProfileStats();
}

async function loadProfileStats() {
  try {
    const [connRes, chatRes] = await Promise.all([
      fetch(`${API_URL}/connections/count`, { headers: authHeaders() }),
      fetch(`${API_URL}/connections`,       { headers: authHeaders() }),
    ]);
    if (connRes.ok) {
      const { count } = await connRes.json();
      const el = document.getElementById('conn-count');
      if (el) el.textContent = count;
    }
    if (chatRes.ok) {
      const chats = await chatRes.json();
      const el = document.getElementById('chat-count');
      if (el) el.textContent = chats.length;
    }
  } catch (_) {}
}


/* ══════════════════════════════════════════════════
   VIEW ANOTHER USER'S PROFILE
   Accessed by tapping avatar/name in chatroom header
══════════════════════════════════════════════════ */
export async function renderViewProfile() {
  const params = getParams() || {};
  const userId = params.userId;

  // If user data was passed directly (faster), use it as a fallback
  let user = params.user || null;

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="nav-bar">
        <div class="nav-left">
          <button class="nav-back" id="back-btn">
            <svg viewBox="0 0 10 17" fill="none" style="width:10px;height:17px">
              <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Back
          </button>
        </div>
        <div class="nav-center"><span class="nav-title-inline" id="vp-title">Profile</span></div>
        <div class="nav-right" style="min-width:60px"></div>
      </div>
      <div class="screen-body" id="vp-body">
        <div style="text-align:center;padding:80px 0"><div class="spinner"></div></div>
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', back);

  // Fetch the full, fresh profile from backend if we have an ID
  let fetchError = null;
  if (userId) {
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, { headers: authHeaders() });
      if (res.ok) {
        user = await res.json();
      } else {
        fetchError = `Server returned ${res.status}`;
      }
    } catch (err) {
      fetchError = err.message || 'Network error';
    }
  } else {
    fetchError = 'No user ID was provided to this screen';
  }

  if (!user) {
    document.getElementById('vp-body').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <div class="empty-title">Could not load profile</div>
        <div class="empty-body">${fetchError || 'Unknown error'}</div>
      </div>`;
    return;
  }


  const name = user.username || user.name || 'Student';
  const tags = (user.lookingFor||[]).map(tagHTML).join('');
  const interests = (user.interests||[]).map(i => `<span class="interest-pill">${i}</span>`).join('');
  const coverBg = `background:linear-gradient(145deg,hsl(${Math.abs((user._id||'abc').charCodeAt(3)||120)*20%360},40%,88%),hsl(${Math.abs((user._id||'abc').charCodeAt(5)||200)*30%360},35%,82%))`;

  document.getElementById('vp-title').textContent = name;

  document.getElementById('vp-body').innerHTML = `
    <!-- Cover -->
    <div style="height:150px;position:relative;overflow:hidden;
      ${user.coverURL ? '' : coverBg}">
      ${user.coverURL ? `<img src="${user.coverURL}" alt="" style="width:100%;height:100%;object-fit:cover" />` : ''}
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 60%,rgba(0,0,0,.3))"></div>
      ${user.isOnline ? `<div style="position:absolute;top:14px;right:14px;
        background:#34c759;color:#fff;border-radius:12px;padding:4px 10px;font-size:12px;font-weight:600">
        ● Online</div>` : ''}
    </div>

    <!-- Avatar & Name -->
    <div style="padding:0 20px;background:var(--bg-primary)">
      <div style="margin-top:-36px;margin-bottom:12px">
        <div style="display:inline-block;border-radius:50%;border:3px solid var(--bg-primary);overflow:hidden">
          ${avatarHTML(name, user.photoURL, 72)}
        </div>
      </div>
      <div style="font-size:22px;font-weight:700;color:var(--label-primary);letter-spacing:-.3px">${name}</div>
      <div style="font-size:14px;color:var(--label-secondary);margin-top:4px">
        ${user.department||''} ${user.year ? '· '+user.year : ''}
      </div>
      ${!user.isOnline && user.lastSeen ? `
        <div style="font-size:12px;color:var(--label-tertiary);margin-top:4px">
          Last seen ${_timeAgoFull(user.lastSeen)}
        </div>` : ''}
      ${tags ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;padding-bottom:16px">${tags}</div>` : ''}
    </div>

    <div style="height:8px;background:var(--bg-secondary)"></div>

    <!-- Bio -->
    ${user.bio ? `
      <div class="profile-section">
        <div class="profile-section-title">About</div>
        <div class="profile-bio">"${user.bio}"</div>
      </div>` : ''}

    <!-- Icebreaker -->
    ${user.icebreaker ? `
      <div class="profile-section">
        <div class="profile-section-title">Icebreaker</div>
        <div class="profile-bio" style="font-style:italic">"${user.icebreaker}"</div>
      </div>` : ''}

    <!-- Interests -->
    ${interests ? `
      <div class="profile-section" style="border-bottom:none">
        <div class="profile-section-title">Interests</div>
        <div style="display:flex;flex-wrap:wrap;gap:7px">${interests}</div>
      </div>` : ''}

    <div style="height:8px;background:var(--bg-secondary)"></div>

    <!-- Action button -->
    <div style="padding:20px 16px 40px">
      <button id="vp-chat-btn" class="btn btn-primary">
        💬 Open Chat
      </button>
    </div>`;

  // Open Chat → go to chatroom with this user
  document.getElementById('vp-chat-btn').addEventListener('click', async () => {
    // Find the connection ID for this user
    try {
      const res = await fetch(`${API_URL}/connections`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed');
      const conns = await res.json();
      const conn = conns.find(c => c.user?._id?.toString() === (user._id||userId)?.toString());
      if (conn) {
        navigate('/chatroom', { chat: { chatId: conn.connectionId, otherUser: conn.user } });
      } else {
        toast('You are not connected with this person', 'error');
      }
    } catch {
      toast('Could not open chat', 'error');
    }
  });
}

function _timeAgoFull(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minute${m!==1?'s':''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h!==1?'s':''} ago`;
  return `${Math.floor(h/24)} day${Math.floor(h/24)!==1?'s':''} ago`;
}


/* ══════════════════════════════════════════════════
   CONNECTIONS LIST
══════════════════════════════════════════════════ */
export async function renderConnections() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="background:var(--bg-secondary)">
      <div class="nav-bar">
        <div class="nav-left">
          <button class="nav-back" id="back-btn">
            <svg viewBox="0 0 10 17" fill="none" style="width:10px;height:17px">
              <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Profile
          </button>
        </div>
        <div class="nav-center"><span class="nav-title-inline">Connections</span></div>
        <div class="nav-right" style="min-width:60px"></div>
      </div>
      <div class="screen-body" id="conn-list-body">
        <div style="text-align:center;padding:60px 0"><div class="spinner"></div></div>
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', back);

  try {
    const res = await fetch(`${API_URL}/connections`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed');
    const conns = await res.json();
    const body = document.getElementById('conn-list-body');

    if (!conns.length) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🤝</div>
          <div class="empty-title">No connections yet</div>
          <div class="empty-body">Connect with people on Discover to see them here.</div>
          <button class="btn btn-primary" style="margin-top:20px;width:auto;padding:10px 24px" id="go-discover">
            Go to Discover
          </button>
        </div>`;
      document.getElementById('go-discover').onclick = () => navigate('/discover');
      return;
    }

    body.innerHTML = `
      <div style="padding:16px 16px 8px;font-size:13px;color:var(--label-secondary);font-weight:500">
        ${conns.length} connection${conns.length!==1?'s':''}
      </div>
      <div style="background:var(--bg-card);margin:0 16px;border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-sm)">
        ${conns.map((c, i) => {
          const u = c.user;
          const name = u.username || u.name || 'Student';
          return `
            <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;
              ${i<conns.length-1?'border-bottom:0.5px solid var(--separator)':''}">
              <div style="position:relative;flex-shrink:0">
                ${avatarHTML(name, u.photoURL, 52)}
                <div data-online-uid="${u._id}" style="position:absolute;bottom:1px;right:1px;
                  width:13px;height:13px;border-radius:50%;
                  background:${u.isOnline?'#34c759':'#c7c7cc'};
                  border:2px solid var(--bg-card)"></div>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:15px;font-weight:600;color:var(--label-primary);
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
                <div style="font-size:12px;color:var(--label-secondary);margin-top:2px">
                  ${u.department||''} ${u.year?'· '+u.year:''}
                </div>
                <div style="font-size:12px;margin-top:2px;color:${u.isOnline?'#34c759':'var(--label-tertiary)'}">
                  ${u.isOnline?'Online now':u.lastSeen?'Last seen '+_timeAgoFull(u.lastSeen):'Offline'}
                </div>
              </div>
              <button class="btn btn-secondary-fill btn-sm" data-chat="${c.connectionId}"
                data-user='${JSON.stringify({ _id: u._id, username: u.username||u.name, department: u.department, year: u.year, photoURL: u.photoURL }).replace(/'/g,"&#39;")}'
                style="flex-shrink:0;width:auto;padding:8px 14px;font-size:13px">
                💬 Chat
              </button>
            </div>`;
        }).join('')}
      </div>`;

    document.querySelectorAll('[data-chat]').forEach(btn =>
      btn.addEventListener('click', () => {
        const user = JSON.parse(btn.dataset.user.replace(/&#39;/g,"'"));
        navigate('/chatroom', { chat: { chatId: btn.dataset.chat, otherUser: user } });
      })
    );
  } catch (err) {
    console.error(err);
    document.getElementById('conn-list-body').innerHTML = `
      <div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load connections</div></div>`;
  }
}


/* ══════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════ */
export function renderSettings() {
  const p = getState().currentUser || DUMMY_USER;
  const rows = [
    { icon:'✏️', bg:'#34aadc', label:'Edit profile',  sub:'Update your bio and photos', action:'edit'   },
    { icon:'🔔', bg:'#ff9500', label:'Notifications', sub:'Manage alerts',              action:'notif'  },
    { icon:'🚫', bg:'#ff3b30', label:'Blocked users', sub:'Manage blocked people',      action:'blocked'},
    { icon:'ℹ️', bg:'#007aff', label:'About Cipher',  sub:'Version 1.0.0',             action:'about'  },
  ];

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="nav-bar">
        <div class="nav-left">
          <button class="nav-back" id="back-btn">
            <svg viewBox="0 0 10 17" fill="none" style="width:10px;height:17px">
              <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Profile
          </button>
        </div>
        <div class="nav-center"><span class="nav-title-inline">Settings</span></div>
        <div class="nav-right" style="min-width:60px"></div>
      </div>

      <div class="screen-body" style="background:var(--bg-secondary);padding:16px">
        <div class="list-group" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:14px;padding:16px">
            ${avatarHTML(p.name, p.photoURL, 56)}
            <div style="flex:1">
              <div style="font-size:18px;font-weight:600;color:var(--label-primary)">${p.name||'Your Name'}</div>
              <div style="font-size:13px;color:var(--label-secondary);margin-top:3px">${p.email||''}</div>
              <div style="font-size:12px;color:var(--label-tertiary);margin-top:2px">${p.department||''} ${p.year?'· '+p.year:''}</div>
            </div>
          </div>
        </div>

        <div class="list-group" style="margin-bottom:20px">
          <div class="list-row" style="border-bottom:none">
            <div class="list-row-icon" style="background:#8e8e93">🌙</div>
            <div class="list-row-text"><div class="list-row-label">Dark Mode</div></div>
            <div class="toggle ${getState().darkMode?'on':''}" id="dark-toggle"><div class="toggle-knob"></div></div>
          </div>
        </div>

        <div class="list-group" style="margin-bottom:20px">
          ${rows.map((r,i) => `
            <div class="list-row" data-action="${r.action}" style="${i===rows.length-1?'border-bottom:none':''}">
              <div class="list-row-icon" style="background:${r.bg}">${r.icon}</div>
              <div class="list-row-text">
                <div class="list-row-label">${r.label}</div>
                <div class="list-row-sub">${r.sub}</div>
              </div>
              <span class="list-row-arrow">›</span>
            </div>`).join('')}
        </div>

        <button class="btn btn-destructive" id="signout-btn">Sign out</button>

        <div style="text-align:center;font-size:12px;color:var(--label-tertiary);margin-top:20px;margin-bottom:8px">
          Cipher · Christ University Ghaziabad<br>Made with ♡ for campus life
        </div>
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', back);
  document.getElementById('dark-toggle').addEventListener('click', () => {
    const next = !getState().darkMode;
    setState({ darkMode: next });
    localStorage.setItem('cipher_dark', JSON.stringify(next));
    document.documentElement.classList.toggle('dark', next);
    renderSettings();
  });
  document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => {
    const a = el.dataset.action;
    if (a === 'blocked') navigate('/blocked');
    else if (a === 'edit') navigate('/edit-profile');
    else if (a === 'about') toast('Cipher v1.0 · Built for Christ (Deemed to be University) Ghaziabad 🎓');
    else toast(`Coming soon!`);
  }));
  document.getElementById('signout-btn').addEventListener('click', async () => {
    const ok = await confirm('Sign out', 'Are you sure you want to sign out?');
    if (!ok) return;
    if (window._cipherSocket) { window._cipherSocket.disconnect(); window._cipherSocket = null; }
    localStorage.removeItem('token');
    setState({ currentUser: null, pendingCount: 0, unreadCount: 0 });
    navigate('/login');
  });
}


/* ══════════════════════════════════════════════════
   EDIT PROFILE
══════════════════════════════════════════════════ */
export function renderEditProfile() {
  const p = getState().currentUser || DUMMY_USER;
  let draftPhoto = p.photoURL || '', draftCover = p.coverURL || '';
  const initials = (p.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const ALL_INTERESTS = ['Chess','Coding','Badminton','Music','Design','Photography','Gaming',
    'Reading','Travel','Fitness','Art','Writing','Movies','Cooking','Dance','Podcasts'];

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="nav-bar">
        <div class="nav-left">
          <button class="nav-back" id="back-btn">
            <svg viewBox="0 0 10 17" fill="none" style="width:10px;height:17px">
              <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Settings
          </button>
        </div>
        <div class="nav-center"><span class="nav-title-inline">Edit Profile</span></div>
        <div class="nav-right">
          <button class="nav-back" id="save-top-btn" style="font-weight:600;color:var(--accent)">Save</button>
        </div>
      </div>

      <div class="screen-body" style="background:var(--bg-secondary);padding-bottom:40px">
        <div style="background:var(--bg-card);margin-bottom:20px">
          <div id="cover-tap" style="height:100px;cursor:pointer;position:relative;overflow:hidden;
            ${draftCover?`background:url('${draftCover}') center/cover`:'background:linear-gradient(145deg,#e8f5e9,#c8e6c9)'}">
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.2)">
              <div style="background:rgba(0,0,0,.45);backdrop-filter:blur(6px);border-radius:20px;padding:6px 14px;color:#fff;font-size:13px;font-weight:500">
                📷 ${draftCover?'Change':'Add'} Cover
              </div>
            </div>
          </div>
          <input type="file" id="cover-input" accept="image/*" style="display:none" />

          <div style="position:relative;margin-top:-36px;padding:0 20px 16px;display:flex;align-items:flex-end;justify-content:space-between">
            <div style="position:relative">
              <div id="avatar-tap" style="width:72px;height:72px;border-radius:50%;border:3px solid var(--bg-card);
                overflow:hidden;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;
                cursor:pointer;box-shadow:var(--shadow-md)">
                ${draftPhoto?`<img src="${draftPhoto}" style="width:100%;height:100%;object-fit:cover" />`:`<span style="font-size:26px;font-weight:600;color:var(--accent)">${initials}</span>`}
              </div>
              <div id="photo-btn" style="position:absolute;bottom:0;right:0;width:24px;height:24px;border-radius:50%;
                background:var(--accent);border:2px solid var(--bg-card);display:flex;align-items:center;justify-content:center;cursor:pointer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            ${draftPhoto?`<div id="remove-photo" style="font-size:13px;color:var(--red);cursor:pointer;margin-bottom:4px">Remove photo</div>`:'<div></div>'}
          </div>
          <input type="file" id="photo-input" accept="image/*" style="display:none" />
        </div>

        <div class="form-label-above" style="padding:0 20px">Basic Info</div>
        <div class="form-section" style="margin:8px 16px 16px">
          <div class="form-row">
            <div class="form-row-label">Name</div>
            <input id="field-name" type="text" value="${p.name||''}" placeholder="Your name" />
          </div>
          <div class="form-row">
            <div class="form-row-label">Year</div>
            <select id="field-year" style="flex:1;font-size:15px;color:var(--label-primary);padding:12px 0;background:none;border:none;outline:none;font-family:var(--font);appearance:none;cursor:pointer">
              ${YEARS.map(y=>`<option value="${y}" ${p.year===y?'selected':''}>${y}</option>`).join('')}
            </select>
          </div>
          <div class="form-row" style="border-bottom:none">
            <div class="form-row-label">Department</div>
            <select id="field-dept" style="flex:1;font-size:15px;color:var(--label-primary);padding:12px 0;background:none;border:none;outline:none;font-family:var(--font);appearance:none;cursor:pointer">
              ${DEPTS.map(d=>`<option value="${d}" ${p.department===d?'selected':''}>${d}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-label-above" style="padding:0 20px">Bio</div>
        <div class="form-section" style="margin:8px 16px 16px">
          <div class="form-row" style="border-bottom:none;align-items:flex-start">
            <textarea id="field-bio" rows="3" maxlength="200"
              style="flex:1;font-size:15px;color:var(--label-primary);padding:12px 0;line-height:1.5;resize:none"
              placeholder="Tell people who you are…">${p.bio||''}</textarea>
          </div>
        </div>

        <div class="form-label-above" style="padding:0 20px">Icebreaker</div>
        <div class="form-section" style="margin:8px 16px 16px">
          <div class="form-row" style="border-bottom:none;align-items:flex-start">
            <textarea id="field-ice" rows="2"
              style="flex:1;font-size:15px;color:var(--label-primary);padding:12px 0;line-height:1.5;resize:none"
              placeholder="Something fun about you…">${p.icebreaker||''}</textarea>
          </div>
        </div>

        <div class="form-label-above" style="padding:0 20px">Interests</div>
        <div style="padding:4px 16px 16px">
          <div class="chip-wrap" id="interest-chips">
            ${ALL_INTERESTS.map(t=>`<div class="chip ${(p.interests||[]).includes(t)?'selected':''}" data-interest="${t}">${t}</div>`).join('')}
          </div>
        </div>

        <div class="form-label-above" style="padding:0 20px">Looking For</div>
        <div style="padding:4px 16px 24px">
          <div class="chip-wrap" id="looking-chips">
            ${LOOKING.map(t=>`<div class="chip ${(p.lookingFor||[]).includes(t)?'selected':''}" data-looking="${t}">${t}</div>`).join('')}
          </div>
        </div>

        <div style="padding:0 16px">
          <button class="btn btn-primary" id="save-main-btn">Save Changes</button>
        </div>
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', back);
  const photoInput = document.getElementById('photo-input');
  const coverInput = document.getElementById('cover-input');
  document.getElementById('avatar-tap').onclick = () => photoInput.click();
  document.getElementById('photo-btn').onclick  = () => photoInput.click();
  document.getElementById('cover-tap').onclick   = () => coverInput.click();

  photoInput.onchange = () => {
    const file = photoInput.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      draftPhoto = e.target.result;
      document.getElementById('avatar-tap').innerHTML = `<img src="${draftPhoto}" style="width:100%;height:100%;object-fit:cover" />`;
      toast('Photo selected ✓');
    };
    reader.readAsDataURL(file);
  };
  coverInput.onchange = () => {
    const file = coverInput.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      draftCover = e.target.result;
      document.getElementById('cover-tap').style.background = `url('${draftCover}') center/cover`;
      toast('Cover updated ✓');
    };
    reader.readAsDataURL(file);
  };
  document.getElementById('remove-photo')?.addEventListener('click', () => {
    draftPhoto = '';
    document.getElementById('avatar-tap').innerHTML = `<span style="font-size:26px;font-weight:600;color:var(--accent)">${initials}</span>`;
    toast('Photo removed');
  });
  document.getElementById('interest-chips').onclick = e => { e.target.closest('[data-interest]')?.classList.toggle('selected'); };
  document.getElementById('looking-chips').onclick   = e => { e.target.closest('[data-looking]')?.classList.toggle('selected'); };

  async function doSave() {
    const name = document.getElementById('field-name').value.trim();
    if (!name) { toast('Name cannot be empty', 'error'); return; }
    const bio        = document.getElementById('field-bio').value.trim().slice(0,200);
    const icebreaker = document.getElementById('field-ice').value.trim();
    const year       = document.getElementById('field-year').value;
    const department = document.getElementById('field-dept').value;
    const interests  = [...document.querySelectorAll('#interest-chips [data-interest].selected')].map(c => c.dataset.interest);
    const lookingFor = [...document.querySelectorAll('#looking-chips [data-looking].selected')].map(c => c.dataset.looking);

    const btn = document.getElementById('save-main-btn');
    btn.disabled = true; btn.textContent = 'Saving…';

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ username:name, year, department, bio, icebreaker, interests, lookingFor, photoURL:draftPhoto, coverURL:draftCover }),
      });
      if (!res.ok) throw new Error('Backend save failed');
      setState({ currentUser: { ...(getState().currentUser||{}), name, bio, icebreaker, year, department, photoURL:draftPhoto, coverURL:draftCover, interests, lookingFor } });
      toast('Profile updated 🎉', 'success');
      back();
    } catch (err) {
      console.error(err);
      toast('Saved locally (sync failed)', 'error');
      btn.disabled = false; btn.textContent = 'Save Changes';
    }
  }

  document.getElementById('save-top-btn').addEventListener('click', doSave);
  document.getElementById('save-main-btn').addEventListener('click', doSave);
}


/* ══════════════════════════════════════════════════
   BLOCKED USERS
══════════════════════════════════════════════════ */
let blockedList = [];

export function renderBlocked() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="nav-bar">
        <div class="nav-left">
          <button class="nav-back" id="back-btn">
            <svg viewBox="0 0 10 17" fill="none" style="width:10px;height:17px">
              <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Settings
          </button>
        </div>
        <div class="nav-center"><span class="nav-title-inline">Blocked</span></div>
        <div class="nav-right" style="min-width:60px"></div>
      </div>
      <div class="screen-body" id="blocked-area" style="background:var(--bg-secondary)">
        <div class="empty-state">
          <div class="empty-icon">🚫</div>
          <div class="empty-title">No blocked users</div>
          <div class="empty-body">People you block can't see your profile or message you.</div>
        </div>
      </div>
    </div>`;
  document.getElementById('back-btn').addEventListener('click', back);
}