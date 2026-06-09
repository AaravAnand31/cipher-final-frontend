// js/screens/profile.js
import {
  navigate, back, getState, setState,
  avatarHTML, avatarWithStatusHTML, tagHTML, lastSeenText, toast, confirm,
  DUMMY_USER, LOOKING, YEARS, OPEN_TO, DEPTS,
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
   MY PROFILE  — fixes #1 (count) + feature #2 (list)
══════════════════════════════════════════════════ */
export async function renderProfile() {
  const _base = getState().currentUser || DUMMY_USER;
  const p = {
    ..._base,
    photoURL: localStorage.getItem('cipher_photoURL') || _base.photoURL || '',
    coverURL: localStorage.getItem('cipher_coverURL') || _base.coverURL || '',
  };

  const coverBg = `background:linear-gradient(145deg,#e8f5e9,#c8e6c9)`;

  // Render skeleton while we fetch real data
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="screen-body" id="profile-scroll">

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
            <button class="btn btn-secondary-fill btn-sm" id="settings-btn"
              style="width:auto;margin-bottom:6px;padding:8px 14px">
              ⚙️ Settings
            </button>
          </div>
          <div class="profile-name" style="margin-top:14px">${p.name || 'Student'}</div>
          <div class="profile-meta">${p.department || '—'} · ${p.year || '—'}</div>
          ${(p.lookingFor||[]).length ? `
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">
              ${(p.lookingFor||[]).map(tagHTML).join('')}
            </div>` : ''}
        </div>

        <!-- Stats  (skeleton until data loads) -->
        <div class="profile-stats-section" id="stats-section">
          <div class="stat-row">
            <div class="stat-item">
              <div class="stat-num" id="stat-connections">
                <span class="skeleton-num"></span>
              </div>
              <div class="stat-label">Connections</div>
            </div>
            <div class="stat-item">
              <div class="stat-num" id="stat-views">0</div>
              <div class="stat-label">Profile views</div>
            </div>
            <div class="stat-item">
              <div class="stat-num" id="stat-chats">
                <span class="skeleton-num"></span>
              </div>
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

        ${(p.interests||[]).length ? `
        <div class="profile-section">
          <div class="profile-section-title">Interests</div>
          <div style="display:flex;flex-wrap:wrap;gap:7px">
            ${(p.interests||[]).map(i => `<span class="interest-pill">${i}</span>`).join('')}
          </div>
        </div>` : ''}

        <!-- Connections list (loads async) -->
        <div class="profile-section" id="connections-section">
          <div class="profile-section-title">Connections</div>
          <div id="connections-list" style="margin-top:4px">
            <div style="display:flex;justify-content:center;padding:20px 0">
              <div class="spinner"></div>
            </div>
          </div>
        </div>

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

  // ── Load real connection data ──
  _loadProfileData(p);
}

async function _loadProfileData(p) {
  const onlineUsers = getState().onlineUsers || new Set();

  try {
    // Fetch connections list (also gives us the count)
    const res = await fetch(`${API_URL}/connections`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load connections');
    const conns = await res.json();
    const count = conns.length;

    // ── FIX #1: Update stats with real count ──
    const statEl = document.getElementById('stat-connections');
    if (statEl) statEl.textContent = count;
    const chatEl = document.getElementById('stat-chats');
    if (chatEl) chatEl.textContent = count; // same — each connection = 1 potential chat

    // ── FEATURE #2: Render connections list ──
    const listEl = document.getElementById('connections-list');
    if (!listEl) return;

    if (!count) {
      listEl.innerHTML = `
        <div style="text-align:center;padding:20px 0;color:var(--label-secondary);font-size:14px">
          No connections yet — discover people and connect!
        </div>`;
      return;
    }

    listEl.innerHTML = `
      <div class="connections-list">
        ${conns.map(c => {
          const u    = c.user;
          const name = u.username || u.name || 'Student';
          const isOnline = u.isOnline || onlineUsers.has(u._id?.toString());
          return `
            <div class="connection-row">
              <div style="flex-shrink:0">
                ${avatarWithStatusHTML(name, u.photoURL, 46, isOnline)}
              </div>
              <div class="connection-info">
                <div class="connection-name">${name}</div>
                <div class="connection-meta">${u.department || ''} · ${u.year || ''}</div>
                <div class="connection-status" style="font-size:12px;margin-top:2px">
                  ${lastSeenText(isOnline, u.lastSeen)}
                </div>
              </div>
              <button class="btn btn-pill btn-sm connection-chat-btn"
                data-chatid="${c.connectionId}"
                data-userid="${u._id}"
                data-username="${name}"
                data-dept="${u.department || ''}"
                data-year="${u.year || ''}"
                data-photo="${u.photoURL || ''}">
                Chat
              </button>
            </div>`;
        }).join('')}
      </div>`;

    // Bind chat buttons
    listEl.querySelectorAll('.connection-chat-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        navigate('/chatroom', {
          chat: {
            chatId: btn.dataset.chatid,
            otherUser: {
              _id:        btn.dataset.userid,
              username:   btn.dataset.username,
              department: btn.dataset.dept,
              year:       btn.dataset.year,
              photoURL:   btn.dataset.photo,
            },
          },
        });
      })
    );

    // Also update pending count while we're here
    try {
      const reqRes = await fetch(`${API_URL}/connections/requests`, { headers: authHeaders() });
      if (reqRes.ok) {
        const reqs = await reqRes.json();
        setState({ pendingCount: reqs.length });
      }
    } catch (_) {}

  } catch (err) {
    console.error(err);
    const statEl = document.getElementById('stat-connections');
    if (statEl) statEl.textContent = '—';
    const listEl = document.getElementById('connections-list');
    if (listEl) listEl.innerHTML = `
      <div style="text-align:center;padding:20px 0;color:var(--label-secondary);font-size:13px">
        Could not load connections
      </div>`;
  }
}


/* ══════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════ */
export function renderSettings() {
  const p = getState().currentUser || DUMMY_USER;

  const rows = [
    { icon: '✏️', bg: '#34aadc', label: 'Edit profile',   sub: 'Update your bio and photos', action: 'edit' },
    { icon: '🔔', bg: '#ff9500', label: 'Notifications',   sub: 'Manage alerts',              action: 'notif' },
    { icon: '🔒', bg: '#636366', label: 'Privacy',         sub: 'Who can see your profile',   action: 'privacy' },
    { icon: '🚫', bg: '#ff3b30', label: 'Blocked users',   sub: 'Manage blocked people',      action: 'blocked' },
    { icon: 'ℹ️', bg: '#007aff',  label: 'About Cipher',   sub: 'Version 1.0.0',              action: 'about' },
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
            <div style="flex:1;min-width:0">
              <div style="font-size:19px;font-weight:600;color:var(--label-primary);
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
              <div style="font-size:14px;color:var(--label-secondary);margin-top:3px;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.email}</div>
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
      if (a === 'blocked')  navigate('/blocked');
      else if (a === 'edit') navigate('/edit-profile');
      else if (a === 'about') toast('Cipher v1.0 · Built for Christ (Deemed to be University) Ghaziabad 🎓');
      else toast(`${el.querySelector('.list-row-label').textContent} — coming soon!`);
    })
  );

  document.getElementById('signout-btn').addEventListener('click', async () => {
    const ok = await confirm('Sign out', 'Are you sure you want to sign out?');
    if (ok) {
      localStorage.removeItem('token');
      localStorage.removeItem('cipher_photoURL');
      localStorage.removeItem('cipher_coverURL');
      setState({ currentUser: null, pendingCount: 0, unreadCounts: {} });
      navigate('/login');
    }
  });
}


/* ══════════════════════════════════════════════════
   EDIT PROFILE — with real backend save
══════════════════════════════════════════════════ */
export function renderEditProfile() {
  const p = getState().currentUser || DUMMY_USER;

  const storedPhoto = localStorage.getItem('cipher_photoURL') || p.photoURL || '';
  const storedCover = localStorage.getItem('cipher_coverURL') || p.coverURL || '';

  let draftPhoto = storedPhoto;
  let draftCover = storedCover;

  const initials = (p.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  function avatarPreviewHTML(url) {
    return url
      ? `<img id="avatar-img" src="${url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%" />`
      : `<span id="avatar-initials" style="font-size:30px;font-weight:600;color:var(--accent)">${initials}</span>`;
  }

  function coverPreviewStyle(url) {
    return url
      ? `background:url('${url}') center/cover no-repeat`
      : `background:linear-gradient(145deg,#e8f5e9,#c8e6c9)`;
  }

  const interests = (p.interests || []);
  const ALL_INTERESTS = ['Chess','Coding','Badminton','Music','Design','Photography','Gaming',
    'Reading','Travel','Fitness','Art','Writing','Movies','Cooking','Dance','Podcasts'];

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" id="edit-screen">
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
          <button class="nav-back" id="save-btn" style="font-weight:600;color:var(--accent)">Save</button>
        </div>
      </div>

      <div class="screen-body" style="background:var(--bg-secondary);padding-bottom:40px">

        <!-- Photo Section -->
        <div style="background:var(--bg-card);margin-bottom:24px">
          <div id="cover-preview" style="height:110px;position:relative;cursor:pointer;${coverPreviewStyle(draftCover)}">
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25)">
              <div style="background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);border-radius:20px;padding:7px 14px;display:flex;align-items:center;gap:6px">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span style="color:#fff;font-size:13px;font-weight:500">Change Cover</span>
              </div>
            </div>
          </div>
          <input type="file" id="cover-input" accept="image/*" style="display:none" />

          <div style="position:relative;margin-top:-38px;padding:0 20px 16px;display:flex;align-items:flex-end;justify-content:space-between">
            <div style="position:relative;display:inline-block">
              <div id="avatar-preview" style="width:76px;height:76px;border-radius:50%;border:3px solid var(--bg-card);background:var(--accent-bg);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;box-shadow:var(--shadow-md);cursor:pointer">
                ${avatarPreviewHTML(draftPhoto)}
              </div>
              <div id="photo-tap" style="position:absolute;bottom:0;right:0;width:26px;height:26px;border-radius:50%;background:var(--accent);border:2px solid var(--bg-card);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:var(--shadow-sm)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <div style="font-size:13px;color:var(--accent);font-weight:500;margin-bottom:4px;cursor:pointer" id="remove-photo-btn">
              ${draftPhoto ? 'Remove photo' : ''}
            </div>
          </div>
          <input type="file" id="photo-input" accept="image/*" style="display:none" />
        </div>

        <!-- Basic Info -->
        <div class="form-label-above" style="padding:0 20px">Basic Info</div>
        <div class="form-section" style="margin:8px 16px 0">
          <div class="form-row">
            <div class="form-row-label">Name</div>
            <input id="field-name" type="text" value="${p.name || ''}" placeholder="Your name" />
          </div>
          <div class="form-row">
            <div class="form-row-label">Year</div>
            <select id="field-year" style="flex:1;font-size:15px;color:var(--label-primary);padding:12px 0;background:none;border:none;outline:none;font-family:var(--font);appearance:none;-webkit-appearance:none;cursor:pointer">
              ${YEARS.map(y => `<option value="${y}" ${p.year===y?'selected':''}>${y}</option>`).join('')}
            </select>
          </div>
          <div class="form-row" style="border-bottom:none">
            <div class="form-row-label">Department</div>
            <select id="field-dept" style="flex:1;font-size:15px;color:var(--label-primary);padding:12px 0;background:none;border:none;outline:none;font-family:var(--font);appearance:none;-webkit-appearance:none;cursor:pointer">
              ${DEPTS.map(d => `<option value="${d}" ${p.department===d?'selected':''}>${d}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Bio -->
        <div class="form-label-above" style="padding:0 20px">Bio</div>
        <div class="form-section" style="margin:8px 16px 0">
          <div class="form-row" style="border-bottom:none;align-items:flex-start">
            <textarea id="field-bio" rows="3" placeholder="Tell people who you are…"
              style="flex:1;font-size:15px;color:var(--label-primary);padding:12px 0;line-height:1.5;resize:none">${p.bio || ''}</textarea>
          </div>
        </div>
        <div class="form-hint" style="padding:0 20px">Max 200 characters</div>

        <!-- Icebreaker -->
        <div class="form-label-above" style="padding:0 20px">Icebreaker</div>
        <div class="form-section" style="margin:8px 16px 0">
          <div class="form-row" style="border-bottom:none;align-items:flex-start">
            <textarea id="field-ice" rows="2" placeholder="Something fun or memorable about you…"
              style="flex:1;font-size:15px;color:var(--label-primary);padding:12px 0;line-height:1.5;resize:none">${p.icebreaker || ''}</textarea>
          </div>
        </div>

        <!-- Interests -->
        <div class="form-label-above" style="padding:0 20px">Interests</div>
        <div style="padding:0 16px 4px">
          <div class="chip-wrap" id="interest-chips">
            ${ALL_INTERESTS.map(tag => `
              <div class="chip ${interests.includes(tag) ? 'selected' : ''}" data-interest="${tag}">${tag}</div>
            `).join('')}
          </div>
        </div>

        <!-- Looking For -->
        <div class="form-label-above" style="padding:0 20px">Looking For</div>
        <div style="padding:0 16px 4px">
          <div class="chip-wrap" id="looking-chips">
            ${LOOKING.map(tag => `
              <div class="chip ${(p.lookingFor||[]).includes(tag) ? 'selected' : ''}" data-looking="${tag}">${tag}</div>
            `).join('')}
          </div>
        </div>

        <div style="padding:24px 16px 0">
          <button class="btn btn-primary" id="save-main-btn">Save Changes</button>
        </div>
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', back);

  // Photo picker
  const photoInput = document.getElementById('photo-input');
  const photoTap   = document.getElementById('photo-tap');
  const avatarPreview = document.getElementById('avatar-preview');

  function triggerPhotoPicker() { photoInput.click(); }
  photoTap.addEventListener('click', triggerPhotoPicker);
  avatarPreview.addEventListener('click', triggerPhotoPicker);

  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Image too large (max 5 MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      draftPhoto = e.target.result;
      avatarPreview.innerHTML = `<img src="${draftPhoto}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
      const rmBtn = document.getElementById('remove-photo-btn');
      if (rmBtn) rmBtn.textContent = 'Remove photo';
      toast('Photo selected ✓', 'success');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('remove-photo-btn').addEventListener('click', () => {
    if (!draftPhoto) return;
    draftPhoto = '';
    avatarPreview.innerHTML = `<span style="font-size:30px;font-weight:600;color:var(--accent)">${initials}</span>`;
    document.getElementById('remove-photo-btn').textContent = '';
    toast('Photo removed');
  });

  // Cover picker
  const coverInput   = document.getElementById('cover-input');
  const coverPreview = document.getElementById('cover-preview');
  coverPreview.addEventListener('click', () => coverInput.click());
  coverInput.addEventListener('change', () => {
    const file = coverInput.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast('Image too large (max 8 MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      draftCover = e.target.result;
      coverPreview.style.background = `url('${draftCover}') center/cover no-repeat`;
      toast('Cover updated ✓', 'success');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('interest-chips').addEventListener('click', e => {
    const chip = e.target.closest('[data-interest]');
    if (chip) chip.classList.toggle('selected');
  });
  document.getElementById('looking-chips').addEventListener('click', e => {
    const chip = e.target.closest('[data-looking]');
    if (chip) chip.classList.toggle('selected');
  });

  async function doSave() {
    const name = document.getElementById('field-name').value.trim();
    if (!name) { toast('Name cannot be empty', 'error'); return; }

    const bio        = document.getElementById('field-bio').value.trim().slice(0, 200);
    const icebreaker = document.getElementById('field-ice').value.trim();
    const year       = document.getElementById('field-year').value;
    const department = document.getElementById('field-dept').value;
    const interests  = [...document.querySelectorAll('#interest-chips [data-interest].selected')].map(c => c.dataset.interest);
    const lookingFor = [...document.querySelectorAll('#looking-chips [data-looking].selected')].map(c => c.dataset.looking);

    const saveBtn = document.getElementById('save-btn');
    const saveMainBtn = document.getElementById('save-main-btn');
    if (saveBtn) { saveBtn.textContent = 'Saving…'; saveBtn.disabled = true; }
    if (saveMainBtn) { saveMainBtn.textContent = 'Saving…'; saveMainBtn.disabled = true; }

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ username: name, bio, icebreaker, year, department, interests, lookingFor, photoURL: draftPhoto, coverURL: draftCover }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');

      if (draftPhoto) localStorage.setItem('cipher_photoURL', draftPhoto);
      else            localStorage.removeItem('cipher_photoURL');
      if (draftCover) localStorage.setItem('cipher_coverURL', draftCover);
      else            localStorage.removeItem('cipher_coverURL');

      const existing = getState().currentUser || {};
      setState({
        currentUser: {
          ...existing,
          name, bio, icebreaker, year, department,
          username: name,
          photoURL: draftPhoto, coverURL: draftCover,
          interests, lookingFor,
        }
      });

      toast('Profile updated 🎉', 'success');
      back();
    } catch (err) {
      toast(err.message || 'Could not save profile', 'error');
      if (saveBtn) { saveBtn.textContent = 'Save'; saveBtn.disabled = false; }
      if (saveMainBtn) { saveMainBtn.textContent = 'Save Changes'; saveMainBtn.disabled = false; }
    }
  }

  document.getElementById('save-btn').addEventListener('click', doSave);
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