// js/screens/main.js  —  Discover, Chats, Chatroom, Requests
import {
  navigate, back, getParams, getState, setState,
  avatarHTML, tagHTML, timeAgo, toast, spinnerHTML, confirm,
  DUMMY_MESSAGES, YEARS, LOOKING,
} from '../helpers.js';
import { tabBarHTML, bindTabs } from './tabs.js';
import API_URL from '../api.js';

// Helper — attach auth header to every API call
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  };
}

/* ══════════════════════════════════════════════════
   DISCOVER  — real users from database
══════════════════════════════════════════════════ */
let discoverFilter = { year: 'All', lookingFor: 'All' };
let discoverUsers  = [];   // cache so filters don't re-fetch
let discoverSkip   = 0;
let discoverDone   = false;
let discoverLoading = false;

export function renderDiscover() {
  discoverUsers  = [];
  discoverSkip   = 0;
  discoverDone   = false;
  discoverLoading = false;
  discoverFilter  = { year: 'All', lookingFor: 'All' };

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="background:var(--bg-secondary)">
      <div class="nav-bar">
        <div class="nav-left">
          <div style="display:flex;flex-direction:column">
            <span class="nav-title-large">Cipher</span>
            <span class="nav-subtitle">Christ University · Gzb</span>
          </div>
        </div>
        <div class="nav-right">
          <button class="nav-btn" id="filter-btn" title="Filter">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4h14M5 9h8M8 14h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Quick filter chips -->
      <div class="scroll-row" id="quick-filters" style="padding-top:12px;padding-bottom:4px;flex-shrink:0">
        ${['All', ...LOOKING.slice(0,4)].map(l =>
          `<button class="chip ${discoverFilter.lookingFor === l ? 'selected':''}" data-lf="${l}">${l}</button>`
        ).join('')}
      </div>

      <div class="screen-body" id="feed-area" style="padding-top:8px">
        <div style="text-align:center;padding:60px 0" id="feed-loader">
          <div class="spinner"></div>
        </div>
      </div>

      ${tabBarHTML('discover')}
    </div>`;

  bindTabs();
  loadMoreUsers();

  // Infinite scroll
  document.getElementById('feed-area').addEventListener('scroll', e => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      loadMoreUsers();
    }
  });

  document.getElementById('quick-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-lf]'); if (!btn) return;
    discoverFilter.lookingFor = btn.dataset.lf;
    document.querySelectorAll('#quick-filters .chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    // Re-filter locally (no refetch needed)
    renderFeed();
  });

  document.getElementById('filter-btn').addEventListener('click', openFilterSheet);
}

async function loadMoreUsers() {
  if (discoverLoading || discoverDone) return;
  discoverLoading = true;

  try {
    const res = await fetch(
      `${API_URL}/users/discover?limit=10&skip=${discoverSkip}`,
      { headers: authHeaders() }
    );

    if (res.status === 401) {
      toast('Session expired — please login again', 'error');
      navigate('/login'); return;
    }
    if (!res.ok) throw new Error('Failed to load');

    const users = await res.json();

    if (users.length === 0) {
      discoverDone = true;
    } else {
      discoverUsers = [...discoverUsers, ...users];
      discoverSkip += users.length;
    }

    renderFeed();
  } catch (err) {
    console.error(err);
    toast('Could not load users', 'error');
    document.getElementById('feed-loader')?.remove();
  }

  discoverLoading = false;
}

function filterVisible() {
  return discoverUsers.filter(p => {
    if (discoverFilter.year !== 'All' && p.year !== discoverFilter.year) return false;
    if (discoverFilter.lookingFor !== 'All' && !(p.lookingFor||[]).includes(discoverFilter.lookingFor)) return false;
    return true;
  });
}

function renderFeed() {
  const area  = document.getElementById('feed-area');
  const list  = filterVisible();

  // Remove loader
  document.getElementById('feed-loader')?.remove();

  // Clear only cards (not the load-more trigger)
  area.querySelectorAll('.discover-card').forEach(c => c.remove());
  area.querySelector('.discover-empty-state')?.remove();
  area.querySelector('#load-more-btn')?.remove();

  if (list.length === 0 && discoverDone) {
    area.innerHTML += `
      <div class="empty-state discover-empty-state">
        <div class="empty-icon">🧭</div>
        <div class="empty-title">You've seen everyone!</div>
        <div class="empty-body">New students join every day — check back soon.</div>
      </div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  list.forEach(p => {
    const card = document.createElement('div');
    card.innerHTML = personCard(p);
    fragment.appendChild(card.firstElementChild);
  });
  area.appendChild(fragment);

  // Load more button if not done
  if (!discoverDone) {
    const btn = document.createElement('button');
    btn.id = 'load-more-btn';
    btn.className = 'btn btn-secondary-fill';
    btn.style.cssText = 'margin:8px 16px 24px;width:calc(100% - 32px)';
    btn.textContent = 'Load more';
    btn.onclick = () => { btn.remove(); loadMoreUsers(); };
    area.appendChild(btn);
  }

  bindFeed();
}

function personCard(p) {
  const name  = p.username || p.name || 'Student';
  const tags  = (p.lookingFor||[]).map(tagHTML).join('');
  const pills = (p.interests||[]).slice(0,4).map(i => `<span class="interest-pill">${i}</span>`).join('');
  const coverBg = `background:linear-gradient(135deg,hsl(${(p._id||'').charCodeAt(3)*20%360},40%,88%),hsl(${(p._id||'').charCodeAt(5)*40%360},35%,82%))`;

  return `
    <div class="discover-card" data-uid="${p._id}">
      <div class="card-cover" style="${p.coverURL ? '' : coverBg}">
        ${p.coverURL ? `<img src="${p.coverURL}" alt="" />` : ''}
        <div class="card-cover-gradient"></div>
        ${p.year ? `<div class="card-badge">${p.year}</div>` : ''}
      </div>

      <div class="card-avatar-row">
        <div class="card-avatar-border">
          ${avatarHTML(name, p.photoURL, 62)}
        </div>
      </div>

      <div class="card-body">
        <div class="card-name">${name}</div>
        <div class="card-meta">${p.department || ''}</div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      </div>

      ${p.icebreaker
        ? `<div class="card-icebreaker">"${p.icebreaker}"</div>`
        : p.bio ? `<div class="card-icebreaker">"${p.bio}"</div>` : ''}

      ${pills ? `<div class="card-interests">${pills}</div>` : ''}

      <div class="card-actions">
        <button class="card-btn-skip"    data-skip="${p._id}">✕ &nbsp;Pass</button>
        <button class="card-btn-connect" data-connect="${p._id}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Connect
        </button>
      </div>
    </div>`;
}

function bindFeed() {
  document.querySelectorAll('[data-skip]').forEach(btn =>
    btn.addEventListener('click', () => {
      const uid  = btn.dataset.skip;
      const card = document.querySelector(`.discover-card[data-uid="${uid}"]`);
      // Remove locally only — no backend call needed for skip
      discoverUsers = discoverUsers.filter(u => u._id !== uid);
      card?.remove();
      if (filterVisible().length === 0 && discoverDone) renderFeed();
    })
  );

  document.querySelectorAll('[data-connect]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const uid  = btn.dataset.connect;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span>`;

      try {
        const res = await fetch(`${API_URL}/connections/request`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ toUserId: uid }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed');

        toast('Connection request sent! 🤝', 'success');
        // Remove card from feed
        discoverUsers = discoverUsers.filter(u => u._id !== uid);
        document.querySelector(`.discover-card[data-uid="${uid}"]`)?.remove();
        if (filterVisible().length === 0 && discoverDone) renderFeed();

      } catch (err) {
        toast(err.message || 'Could not send request', 'error');
        btn.disabled = false;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="white" stroke-width="2" stroke-linecap="round"/></svg> Connect`;
      }
    })
  );
}

function openFilterSheet() {
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  let yr = discoverFilter.year, lf = discoverFilter.lookingFor;

  overlay.innerHTML = `
    <div class="sheet" style="padding-left:20px;padding-right:20px">
      <div class="sheet-handle"></div>
      <div class="sheet-title" style="padding-left:0">Filter people</div>

      <div class="form-label-above" style="margin-top:0">Year</div>
      <div class="chip-wrap" id="f-year">
        ${['All',...YEARS].map(y => `<button class="chip ${yr===y?'selected':''}" data-y="${y}">${y}</button>`).join('')}
      </div>
      <div class="form-label-above">Looking for</div>
      <div class="chip-wrap" id="f-look">
        ${['All',...LOOKING].map(l => `<button class="chip ${lf===l?'selected':''}" data-l="${l}">${l}</button>`).join('')}
      </div>
      <button class="btn btn-primary" id="apply-f" style="margin-top:24px">Apply filters</button>
    </div>`;

  document.getElementById('sheet-container').appendChild(overlay);

  overlay.querySelector('#f-year').addEventListener('click', e => {
    const b = e.target.closest('[data-y]'); if (!b) return;
    yr = b.dataset.y;
    overlay.querySelectorAll('#f-year .chip').forEach(c => c.classList.remove('selected'));
    b.classList.add('selected');
  });
  overlay.querySelector('#f-look').addEventListener('click', e => {
    const b = e.target.closest('[data-l]'); if (!b) return;
    lf = b.dataset.l;
    overlay.querySelectorAll('#f-look .chip').forEach(c => c.classList.remove('selected'));
    b.classList.add('selected');
  });
  overlay.querySelector('#apply-f').addEventListener('click', () => {
    discoverFilter = { year: yr, lookingFor: lf };
    overlay.remove();
    renderFeed();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}


/* ══════════════════════════════════════════════════
   CHATS  — shows real accepted connections
══════════════════════════════════════════════════ */
export async function renderChats() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="nav-bar">
        <div class="nav-left">
          <div style="display:flex;flex-direction:column">
            <span class="nav-title-large">Chats</span>
            <span class="nav-subtitle" id="chats-sub">Loading…</span>
          </div>
        </div>
      </div>
      <div class="screen-body" id="chats-body">
        <div style="text-align:center;padding:60px 0"><div class="spinner"></div></div>
      </div>
      ${tabBarHTML('chats')}
    </div>`;

  bindTabs();

  try {
    const res = await fetch(`${API_URL}/connections`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed');
    const connections = await res.json();

    const sub  = document.getElementById('chats-sub');
    const body = document.getElementById('chats-body');
    sub.textContent = `${connections.length} conversation${connections.length !== 1 ? 's' : ''}`;

    if (connections.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <div class="empty-title">No chats yet</div>
          <div class="empty-body">When you and someone connect, your chat opens here.</div>
        </div>`;
      return;
    }

    body.innerHTML = `
      <div style="background:var(--bg-card);margin:16px;border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-sm)">
        ${connections.map((c, i) => chatRow(c, i === connections.length - 1)).join('')}
      </div>`;

    document.querySelectorAll('[data-chatid]').forEach(el =>
      el.addEventListener('click', () => {
        const conn = connections.find(c => c.connectionId === el.dataset.chatid);
        if (conn) navigate('/chatroom', { chat: { chatId: conn.connectionId, otherUser: conn.user } });
      })
    );

  } catch (err) {
    console.error(err);
    document.getElementById('chats-body').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load chats</div>
        <div class="empty-body">Check your connection and try again.</div>
      </div>`;
  }
}

function chatRow(c, isLast) {
  const u = c.user;
  const name = u.username || u.name || 'Student';
  return `
    <div class="chat-row" data-chatid="${c.connectionId}" style="${isLast ? 'border-bottom:none' : ''}">
      <div style="position:relative">
        ${avatarHTML(name, u.photoURL, 50)}
        <div style="position:absolute;bottom:0;right:0;width:12px;height:12px;
          background:#34c759;border-radius:50%;border:2px solid var(--bg-card)"></div>
      </div>
      <div class="chat-info">
        <div class="chat-name">${name}</div>
        <div class="chat-preview">${u.department || ''} · ${u.year || ''}</div>
      </div>
      <div class="chat-right">
        <span class="chat-time">${timeAgo(c.connectedAt)}</span>
      </div>
    </div>`;
}


/* ══════════════════════════════════════════════════
   CHAT ROOM  — (Phase 2 will add real message storage)
══════════════════════════════════════════════════ */
let chatMessages = {};

export function renderChatroom() {
  const { chat } = getParams();
  if (!chat) { back(); return; }

  const u    = chat.otherUser;
  const name = u.username || u.name || 'Student';
  const msgs = chatMessages[chat.chatId] || [];
  chatMessages[chat.chatId] = [...msgs];

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="chatroom">
        <div class="chatroom-header">
          <button class="nav-back" id="back-btn">
            <svg viewBox="0 0 10 17" fill="none" style="width:10px;height:17px">
              <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Back
          </button>
          ${avatarHTML(name, u.photoURL, 36)}
          <div class="chatroom-info">
            <div class="chatroom-name">${name}</div>
            <div class="chatroom-sub">${u.year || ''} · ${u.department || ''}</div>
          </div>
          <button class="nav-btn" id="more-btn" style="margin-left:auto">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="4" r="1.3" fill="currentColor"/>
              <circle cx="9" cy="9" r="1.3" fill="currentColor"/>
              <circle cx="9" cy="14" r="1.3" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <div class="messages-list" id="msgs">
          <div style="text-align:center;padding:40px 16px;color:var(--label-secondary);font-size:13px">
            💬 Say hi to ${name}!<br>
            <span style="color:var(--label-tertiary)">Real-time chat coming soon</span>
          </div>
        </div>

        <div class="input-bar">
          <div class="msg-input-wrap">
            <textarea class="msg-input" id="msg-input"
              placeholder="Message…" rows="1" maxlength="500"></textarea>
          </div>
          <button class="send-btn" id="send-btn" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 13V3M3 8l5-5 5 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>`;

  if (msgs.length > 0) renderMessages(chat.chatId);

  document.getElementById('back-btn').addEventListener('click', back);
  document.getElementById('more-btn').addEventListener('click', async () => {
    const ok = await confirm(`Block ${name}?`, `They won't be able to see your profile or message you.`);
    if (ok) { toast(`${name} blocked`, 'success'); back(); }
  });

  const input   = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    sendBtn.disabled = !input.value.trim();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
  });

  sendBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = ''; input.style.height = 'auto'; sendBtn.disabled = true;

    const me = getState().currentUser;
    const newMsg = { id: Date.now(), senderUid: me?.uid || 'me', text, time: new Date() };
    chatMessages[chat.chatId] = [...(chatMessages[chat.chatId] || []), newMsg];
    renderMessages(chat.chatId);
  });
}

function renderMessages(chatId) {
  const el = document.getElementById('msgs');
  if (!el) return;
  const msgs = chatMessages[chatId] || [];
  const me   = getState().currentUser;

  el.innerHTML = msgs.map((m, i) => {
    const isMe    = m.senderUid === (me?.uid || 'me');
    const timeStr = new Date(m.time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    const showTime = i === msgs.length - 1 ||
      (Math.abs(new Date(msgs[i+1]?.time) - new Date(m.time)) > 5 * 60000);

    return `
      <div class="msg-row ${isMe ? 'me' : 'them'}">
        <div class="bubble ${isMe ? 'me' : 'them'}">${esc(m.text)}</div>
      </div>
      ${showTime ? `<div class="msg-time-row ${isMe?'me':'them'}">${timeStr}</div>` : ''}`;
  }).join('');

  el.scrollTop = el.scrollHeight;
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\n/g,'<br>');
}


/* ══════════════════════════════════════════════════
   REQUESTS  — real pending requests from database
══════════════════════════════════════════════════ */
export async function renderRequests() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="background:var(--bg-secondary)">
      <div class="nav-bar">
        <div class="nav-left">
          <div style="display:flex;flex-direction:column">
            <span class="nav-title-large">Requests</span>
            <span class="nav-subtitle" id="req-sub">Loading…</span>
          </div>
        </div>
      </div>
      <div class="screen-body" id="req-area" style="padding-top:16px">
        <div style="text-align:center;padding:60px 0"><div class="spinner"></div></div>
      </div>
      ${tabBarHTML('requests')}
    </div>`;

  bindTabs();

  try {
    const res = await fetch(`${API_URL}/connections/requests`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed');
    const requests = await res.json();

    document.getElementById('req-sub').textContent =
      requests.length > 0 ? `${requests.length} pending` : 'All caught up';

    document.getElementById('req-area').innerHTML = requests.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon">🔔</div>
           <div class="empty-title">No requests yet</div>
           <div class="empty-body">When someone wants to connect, they'll appear here.</div>
         </div>`
      : requests.map(req => reqCard(req)).join('');

    bindRequestButtons();

  } catch (err) {
    console.error(err);
    document.getElementById('req-area').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load requests</div>
      </div>`;
  }
}

function reqCard(req) {
  const u    = req.fromUser;
  const name = u.username || u.name || 'Student';
  const tags = (u.lookingFor||[]).map(tagHTML).join('');
  return `
    <div class="request-card" data-conn-id="${req._id}">
      <div class="req-top">
        ${avatarHTML(name, u.photoURL, 52)}
        <div class="req-info">
          <div class="req-name">${name}</div>
          <div class="req-meta">${u.department || ''} · ${u.year || ''}</div>
          ${u.bio ? `<div class="req-bio">"${u.bio}"</div>` : ''}
        </div>
      </div>
      ${tags ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${tags}</div>` : ''}
      <div class="req-actions">
        <button class="req-btn-decline" data-action="reject"  data-conn-id="${req._id}">Decline</button>
        <button class="req-btn-accept"  data-action="accept"  data-conn-id="${req._id}">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l4 4 6-7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Accept
        </button>
      </div>
    </div>`;
}

function bindRequestButtons() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const connectionId = btn.dataset.connId;
      const action       = btn.dataset.action;   // "accept" or "reject"
      const card         = btn.closest('.request-card');

      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span>`;

      try {
        const res = await fetch(`${API_URL}/connections/${action}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ connectionId }),
        });
        if (!res.ok) throw new Error('Failed');

        toast(action === 'accept' ? 'Connected! 🎉 Say hi in Chats' : 'Request declined', 'success');
        card?.remove();

        // Update subtitle count
        const remaining = document.querySelectorAll('.request-card').length;
        const sub = document.getElementById('req-sub');
        if (sub) sub.textContent = remaining > 0 ? `${remaining} pending` : 'All caught up';

        if (remaining === 0) {
          document.getElementById('req-area').innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">🔔</div>
              <div class="empty-title">All caught up!</div>
              <div class="empty-body">No more pending requests.</div>
            </div>`;
        }

      } catch (err) {
        toast('Something went wrong', 'error');
        btn.disabled = false;
        btn.textContent = action === 'accept' ? 'Accept' : 'Decline';
      }
    });
  });
}