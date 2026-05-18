// js/screens/profile.js
import {
  navigate, back, getState, setState,
  avatarHTML, tagHTML, toast, confirm,
  DUMMY_USER, LOOKING, YEARS, OPEN_TO,
} from '../helpers.js';
import { tabBarHTML, bindTabs } from './tabs.js';

/* ══════════════════════════════════════════════════
   MY PROFILE
══════════════════════════════════════════════════ */
export function renderProfile() {
  const p = getState().currentUser || DUMMY_USER;
  const tags = (p.lookingFor||[]).map(tagHTML).join('');
  const interests = (p.interests||[]).map(i =>
    `<span class="interest-pill">${i}</span>`).join('');
  const coverBg = `background:linear-gradient(145deg,#e8f5e9,#c8e6c9)`;

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="screen-body">
        <!-- Cover -->
        <div class="profile-cover" style="${p.coverURL ? '' : coverBg}">
          ${p.coverURL ? `<img src="${p.coverURL}" alt="" />` : ''}
          <div class="profile-cover-overlay"></div>
        </div>

        <!-- Hero -->
        <div class="profile-hero">
          <div style="display:flex;align-items:flex-end;justify-content:space-between">
            <div class="profile-avatar-ring">
              ${avatarHTML(p.name, p.photoURL, 80)}
            </div>
            <button class="btn btn-secondary-fill btn-sm" id="settings-btn" style="width:auto;margin-bottom:6px">
              ⚙️ Settings
            </button>
          </div>
          <div class="profile-name" style="margin-top:14px">${p.name}</div>
          <div class="profile-meta">${p.department} · ${p.year}</div>
          ${tags ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">${tags}</div>` : ''}
        </div>

        <!-- Stats -->
        <div style="padding:16px;border-bottom:0.5px solid var(--separator)">
          <div class="stat-row">
            <div class="stat-item">
              <div class="stat-num">${p.connections?.length || 0}</div>
              <div class="stat-label">Connections</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">0</div>
              <div class="stat-label">Profile views</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">0</div>
              <div class="stat-label">Chats</div>
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

        ${p.interests?.length ? `
        <div class="profile-section">
          <div class="profile-section-title">Interests</div>
          <div style="display:flex;flex-wrap:wrap;gap:7px">${interests}</div>
        </div>` : ''}

        <!-- Dark mode toggle -->
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
            <div class="toggle ${getState().darkMode ? 'on' : ''}" id="dark-toggle">
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
}

/* ══════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════ */
export function renderSettings() {
  const p = getState().currentUser || DUMMY_USER;

  const rows = [
    { icon: '✏️', bg: '#34aadc', label: 'Edit profile',          sub: 'Update your bio and photos', action: 'edit' },
    { icon: '🔔', bg: '#ff9500', label: 'Notifications',          sub: 'Manage alerts',              action: 'notif' },
    { icon: '🔒', bg: '#636366', label: 'Privacy',               sub: 'Who can see your profile',   action: 'privacy' },
    { icon: '🚫', bg: '#ff3b30', label: 'Blocked users',          sub: 'Manage blocked people',      action: 'blocked' },
    { icon: 'ℹ️',  bg: '#007aff', label: 'About Cipher',          sub: 'Version 1.0.0',              action: 'about' },
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

        <!-- Account card -->
        <div class="list-group" style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:14px;padding:16px">
            ${avatarHTML(p.name, p.photoURL, 56)}
            <div style="flex:1">
              <div style="font-size:19px;font-weight:600;color:var(--label-primary)">${p.name}</div>
              <div style="font-size:14px;color:var(--label-secondary);margin-top:3px">${p.email}</div>
            </div>
          </div>
        </div>

        <!-- Dark mode -->
        <div class="list-group" style="margin-bottom:24px">
          <div class="list-row" id="dark-row" style="border-bottom:none">
            <div class="list-row-icon" style="background:#8e8e93">🌙</div>
            <div class="list-row-text">
              <div class="list-row-label">Dark Mode</div>
            </div>
            <div class="toggle ${getState().darkMode ? 'on' : ''}" id="dark-toggle">
              <div class="toggle-knob"></div>
            </div>
          </div>
        </div>

        <!-- Settings rows -->
        <div class="list-group" style="margin-bottom:24px">
          ${rows.map((r, i) => `
            <div class="list-row ${i === rows.length-1 ? 'no-border' : ''}" data-action="${r.action}"
              style="${i === rows.length-1 ? 'border-bottom:none' : ''}">
              <div class="list-row-icon" style="background:${r.bg}">${r.icon}</div>
              <div class="list-row-text">
                <div class="list-row-label">${r.label}</div>
                <div class="list-row-sub">${r.sub}</div>
              </div>
              <span class="list-row-arrow">›</span>
            </div>`).join('')}
        </div>

        <!-- Sign out -->
        <button class="btn btn-destructive" id="signout-btn">Sign out</button>

        <div style="text-align:center;font-size:13px;color:var(--label-tertiary);margin-top:20px;margin-bottom:8px">
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

  document.querySelectorAll('[data-action]').forEach(el =>
    el.addEventListener('click', () => {
      const a = el.dataset.action;
      if (a === 'blocked') navigate('/blocked');
      else if (a === 'about') toast('Cipher v1.0 · Built for Christ (Deemed to be University) Ghaziabad 🎓');
      else toast(`${el.querySelector('.list-row-label').textContent} — coming soon!`);
    })
  );

  document.getElementById('signout-btn').addEventListener('click', async () => {
    const ok = await confirm('Sign out', 'Are you sure you want to sign out?');
    if (ok) {
      setState({ currentUser: null });
      navigate('/login');
    }
  });
}

/* ══════════════════════════════════════════════════
   BLOCKED USERS
══════════════════════════════════════════════════ */
let blockedList = [
  { uid: 'ub1', name: 'Rahul Dey', department: 'B.Tech CSE', year: '3rd year', photoURL: '' },
];

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
        <div class="nav-center"><span class="nav-title-inline">Blocked Users</span></div>
        <div class="nav-right" style="min-width:60px"></div>
      </div>

      <div class="screen-body" id="blocked-area" style="background:var(--bg-secondary)">
        ${blockedHTML()}
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', back);
  bindBlocked();
}

function blockedHTML() {
  if (!blockedList.length) return `
    <div class="empty-state">
      <div class="empty-icon">🚫</div>
      <div class="empty-title">No blocked users</div>
      <div class="empty-body">People you block can't see your profile or contact you.</div>
    </div>`;

  return `
    <div class="list-group" style="margin:16px">
      ${blockedList.map((u, i) => `
        <div class="blocked-row" style="${i === blockedList.length-1 ? 'border-bottom:none' : ''}">
          ${avatarHTML(u.name, u.photoURL, 44)}
          <div style="flex:1">
            <div style="font-size:16px;font-weight:500;color:var(--label-primary)">${u.name}</div>
            <div style="font-size:13px;color:var(--label-secondary);margin-top:2px">${u.department} · ${u.year}</div>
          </div>
          <button class="btn btn-pill btn-sm" data-unblock="${u.uid}">Unblock</button>
        </div>`).join('')}
    </div>`;
}

function bindBlocked() {
  document.querySelectorAll('[data-unblock]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const uid  = btn.dataset.unblock;
      const user = blockedList.find(u => u.uid === uid);
      const ok   = await confirm(`Unblock ${user.name}?`, "They'll be able to see your profile again.");
      if (!ok) return;
      blockedList = blockedList.filter(u => u.uid !== uid);
      document.getElementById('blocked-area').innerHTML = blockedHTML();
      bindBlocked();
      toast(`${user.name} unblocked`, 'success');
    })
  );
}
