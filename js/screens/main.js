// js/screens/main.js — Discover · Chats · Chatroom · Requests
import {
  navigate, back, getParams, getState, setState,
  avatarHTML, tagHTML, timeAgo, toast, confirm,
  LOOKING, YEARS,
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
   DISCOVER — real users from DB
══════════════════════════════════════════════════ */
let _users   = [];
let _skip    = 0;
let _done    = false;
let _loading = false;
let _filter  = { year: 'All', lookingFor: 'All' };

export function renderDiscover() {
  _users = []; _skip = 0; _done = false; _loading = false;
  _filter = { year: 'All', lookingFor: 'All' };

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="background:var(--bg-secondary)">
      <div class="nav-bar">
        <div class="nav-left">
          <div>
            <div class="nav-title-large">Cipher</div>
            <div class="nav-subtitle">Christ University · Gzb</div>
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

      <div class="scroll-row" id="quick-filters" style="padding-top:12px;padding-bottom:4px">
        ${['All',...LOOKING.slice(0,4)].map(l =>
          `<button class="chip ${_filter.lookingFor===l?'selected':''}" data-lf="${l}">${l}</button>`
        ).join('')}
      </div>

      <div class="screen-body" id="feed-area" style="padding-top:8px">
        <div style="text-align:center;padding:80px 0" id="feed-loader">
          <div class="spinner"></div>
          <div style="font-size:13px;color:var(--label-secondary);margin-top:12px">Finding people near you…</div>
        </div>
      </div>

      ${tabBarHTML('discover')}
    </div>`;

  bindTabs();
  fetchUsers();

  document.getElementById('feed-area').addEventListener('scroll', e => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) fetchUsers();
  });

  document.getElementById('quick-filters').addEventListener('click', e => {
    const b = e.target.closest('[data-lf]'); if (!b) return;
    _filter.lookingFor = b.dataset.lf;
    document.querySelectorAll('#quick-filters .chip').forEach(c => c.classList.remove('selected'));
    b.classList.add('selected');
    renderCards();
  });

  document.getElementById('filter-btn').addEventListener('click', openFilterSheet);
}

async function fetchUsers() {
  if (_loading || _done) return;
  _loading = true;

  try {
    const res = await fetch(`${API_URL}/users/discover?limit=10&skip=${_skip}`, { headers: authHeaders() });

    if (res.status === 401) { toast('Session expired — please login again', 'error'); navigate('/login'); return; }
    if (!res.ok) throw new Error('Failed');

    const newUsers = await res.json();
    document.getElementById('feed-loader')?.remove();

    if (newUsers.length === 0) {
      _done = true;
    } else {
      _users = [..._users, ...newUsers];
      _skip += newUsers.length;
    }
    renderCards();
  } catch (err) {
    console.error(err);
    document.getElementById('feed-loader')?.remove();
    const area = document.getElementById('feed-area');
    if (area && !_users.length) {
      area.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Could not load users</div>
          <div class="empty-body">Check that your backend is running on port 5500</div>
          <button class="btn btn-secondary-fill" style="margin-top:16px" onclick="location.reload()">Retry</button>
        </div>`;
    }
  }
  _loading = false;
}

function visible() {
  return _users.filter(u => {
    if (_filter.year !== 'All' && u.year !== _filter.year) return false;
    if (_filter.lookingFor !== 'All' && !(u.lookingFor||[]).includes(_filter.lookingFor)) return false;
    return true;
  });
}

function renderCards() {
  const area = document.getElementById('feed-area');
  area.querySelectorAll('.discover-card').forEach(c => c.remove());
  area.querySelector('.discover-empty')?.remove();
  area.querySelector('#load-more-btn')?.remove();

  const list = visible();

  if (!list.length && _done) {
    area.innerHTML += `
      <div class="empty-state discover-empty">
        <div class="empty-icon">🎉</div>
        <div class="empty-title">You've seen everyone!</div>
        <div class="empty-body">New students join every day — check back soon.</div>
      </div>`;
    return;
  }

  list.forEach(u => {
    const name  = u.username || u.name || 'Student';
    const tags  = (u.lookingFor||[]).map(tagHTML).join('');
    const pills = (u.interests||[]).slice(0,4).map(i => `<span class="interest-pill">${i}</span>`).join('');
    const card  = document.createElement('div');
    card.className = 'discover-card';
    card.dataset.uid = u._id;
    card.innerHTML = `
      <div class="card-cover" style="${u.coverURL ? `background:url('${u.coverURL}') center/cover` : `background:linear-gradient(135deg,hsl(${Math.abs(u._id?.charCodeAt(3)||120)*20%360},40%,90%),hsl(${Math.abs(u._id?.charCodeAt(5)||200)*30%360},35%,85%))`}">
        <div class="card-cover-gradient"></div>
        ${u.year ? `<div class="card-badge">${u.year}</div>` : ''}
      </div>
      <div class="card-avatar-row">
        <div class="card-avatar-border">${avatarHTML(name, u.photoURL, 62)}</div>
      </div>
      <div class="card-body">
        <div class="card-name">${name}</div>
        <div class="card-meta">${u.department || ''}</div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      </div>
      ${u.icebreaker||u.bio ? `<div class="card-icebreaker">"${u.icebreaker||u.bio}"</div>` : ''}
      ${pills ? `<div class="card-interests">${pills}</div>` : ''}
      <div class="card-actions">
        <button class="card-btn-skip"    data-skip="${u._id}">✕ &nbsp;Pass</button>
        <button class="card-btn-connect" data-connect="${u._id}">+ &nbsp;Connect</button>
      </div>`;
    area.appendChild(card);
  });

  if (!_done) {
    const btn = document.createElement('button');
    btn.id = 'load-more-btn';
    btn.className = 'btn btn-secondary-fill';
    btn.style.cssText = 'margin:8px 16px 24px;width:calc(100% - 32px)';
    btn.textContent = 'Load more people';
    btn.onclick = () => { btn.remove(); fetchUsers(); };
    area.appendChild(btn);
  }

  bindFeedButtons();
}

function bindFeedButtons() {
  document.querySelectorAll('[data-skip]').forEach(btn =>
    btn.onclick = () => {
      const card = document.querySelector(`.discover-card[data-uid="${btn.dataset.skip}"]`);
      _users = _users.filter(u => u._id !== btn.dataset.skip);
      card?.remove();
      if (!visible().length && _done) renderCards();
    }
  );

  document.querySelectorAll('[data-connect]').forEach(btn =>
    btn.onclick = async () => {
      const uid = btn.dataset.connect;
      btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>`;
      try {
        const res = await fetch(`${API_URL}/connections/request`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ toUserId: uid }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.message);
        toast('Request sent! 🤝', 'success');
        _users = _users.filter(u => u._id !== uid);
        document.querySelector(`.discover-card[data-uid="${uid}"]`)?.remove();
        if (!visible().length && _done) renderCards();
      } catch (err) {
        toast(err.message || 'Could not send request', 'error');
        btn.disabled = false; btn.innerHTML = '+ &nbsp;Connect';
      }
    }
  );
}

function openFilterSheet() {
  let yr = _filter.year, lf = _filter.lookingFor;
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet" style="padding:0 20px 32px">
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
      <button class="btn btn-primary" id="apply-filter" style="margin-top:24px">Apply</button>
    </div>`;
  document.getElementById('sheet-container').appendChild(overlay);

  overlay.querySelector('#f-year').onclick = e => {
    const b = e.target.closest('[data-y]'); if (!b) return;
    yr = b.dataset.y;
    overlay.querySelectorAll('#f-year .chip').forEach(c => c.classList.remove('selected'));
    b.classList.add('selected');
  };
  overlay.querySelector('#f-look').onclick = e => {
    const b = e.target.closest('[data-l]'); if (!b) return;
    lf = b.dataset.l;
    overlay.querySelectorAll('#f-look .chip').forEach(c => c.classList.remove('selected'));
    b.classList.add('selected');
  };
  overlay.querySelector('#apply-filter').onclick = () => {
    _filter = { year: yr, lookingFor: lf };
    overlay.remove();
    renderCards();
  };
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}


/* ══════════════════════════════════════════════════
   CHATS — real accepted connections
══════════════════════════════════════════════════ */
export async function renderChats() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="nav-bar">
        <div class="nav-left">
          <div>
            <div class="nav-title-large">Chats</div>
            <div class="nav-subtitle" id="chats-sub">Loading…</div>
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
    const conns = await res.json();

    const sub = document.getElementById('chats-sub');
    sub.textContent = `${conns.length} conversation${conns.length !== 1 ? 's' : ''}`;

    const body = document.getElementById('chats-body');
    if (!conns.length) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <div class="empty-title">No chats yet</div>
          <div class="empty-body">Connect with someone on Discover to start chatting.</div>
        </div>`;
      return;
    }

    body.innerHTML = `
      <div style="background:var(--bg-card);margin:16px;border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-sm)">
        ${conns.map((c, i) => {
          const u = c.user;
          const name = u.username || u.name || 'Student';
          return `
            <div class="chat-row" data-chatid="${c.connectionId}" style="${i===conns.length-1?'border-bottom:none':''}">
              <div style="position:relative">
                ${avatarHTML(name, u.photoURL, 50)}
                <div style="position:absolute;bottom:1px;right:1px;width:11px;height:11px;background:#34c759;border-radius:50%;border:2px solid var(--bg-card)"></div>
              </div>
              <div class="chat-info">
                <div class="chat-name">${name}</div>
                <div class="chat-preview">${u.department||''} · ${u.year||''}</div>
              </div>
              <div class="chat-right">
                <span class="chat-time">${timeAgo(c.connectedAt)}</span>
                <span class="chat-arrow">›</span>
              </div>
            </div>`;
        }).join('')}
      </div>`;

    document.querySelectorAll('[data-chatid]').forEach(el =>
      el.onclick = () => {
        const conn = conns.find(c => c.connectionId === el.dataset.chatid);
        if (conn) navigate('/chatroom', { chat: { chatId: conn.connectionId, otherUser: conn.user } });
      }
    );
  } catch (err) {
    console.error(err);
    document.getElementById('chats-body').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load chats</div>
      </div>`;
  }
}


/* ══════════════════════════════════════════════════
   CHATROOM — live chat via Socket.io
══════════════════════════════════════════════════ */
let _socket = null;

export function renderChatroom() {
  const { chat } = getParams();
  if (!chat) { back(); return; }

  const u    = chat.otherUser;
  const name = u.username || u.name || 'Student';
  const me   = getState().currentUser;

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
            <div class="chatroom-sub" id="chat-status">${u.year||''} · ${u.department||''}</div>
          </div>
        </div>

        <div class="messages-list" id="msgs">
          <div style="text-align:center;padding:60px 0" id="msgs-loader">
            <div class="spinner"></div>
          </div>
        </div>

        <div class="input-bar">
          <div class="msg-input-wrap">
            <textarea class="msg-input" id="msg-input" placeholder="Message…" rows="1" maxlength="1000"></textarea>
          </div>
          <button class="send-btn" id="send-btn" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 13V3M3 8l5-5 5 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>`;

  document.getElementById('back-btn').onclick = () => {
    if (_socket) { _socket.emit('typing', { connectionId: chat.chatId, isTyping: false }); }
    back();
  };

  // Load message history
  loadHistory(chat.chatId, me);

  // Connect socket
  connectSocket(chat, me, name);

  // Input handling
  const input   = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');
  let typingTimer = null;

  input.oninput = () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    sendBtn.disabled = !input.value.trim();

    // Typing indicator
    if (_socket) {
      _socket.emit('typing', { connectionId: chat.chatId, isTyping: true });
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        _socket?.emit('typing', { connectionId: chat.chatId, isTyping: false });
      }, 1500);
    }
  };

  input.onkeydown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
  };

  sendBtn.onclick = () => {
    const text = input.value.trim();
    if (!text || !_socket) return;

    _socket.emit('send_message', {
      connectionId:  chat.chatId,
      senderUserId:  me?.uid || me?._id || '',
      text,
    });

    input.value = ''; input.style.height = 'auto'; sendBtn.disabled = true;
    _socket.emit('typing', { connectionId: chat.chatId, isTyping: false });
  };
}

async function loadHistory(connectionId, me) {
  try {
    const res = await fetch(`${API_URL}/messages/${connectionId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed');
    const msgs = await res.json();
    document.getElementById('msgs-loader')?.remove();
    if (msgs.length === 0) {
      const el = document.getElementById('msgs');
      if (el) el.innerHTML = `
        <div style="text-align:center;padding:60px 16px;color:var(--label-secondary);font-size:14px;line-height:1.6">
          👋 You're connected!<br>Say something to start the conversation.
        </div>`;
    } else {
      msgs.forEach(m => appendMessage(m, me));
    }
  } catch (err) {
    console.error(err);
    document.getElementById('msgs-loader')?.remove();
  }
}

function connectSocket(chat, me, otherName) {
  if (!window.io) { console.warn('Socket.io not loaded'); return; }

  // Disconnect old socket if any
  if (_socket) { _socket.disconnect(); }

  _socket = window.io('http://localhost:5500');

  _socket.on('connect', () => {
    _socket.emit('user_online', me?.uid || me?._id || '');
    _socket.emit('join_chat', chat.chatId);
  });

  _socket.on('new_message', msg => {
    document.getElementById('msgs-loader')?.remove();
    // Remove the "say something" placeholder if it exists
    const placeholder = document.querySelector('#msgs div[style*="You\'re connected"]');
    placeholder?.remove();
    appendMessage(msg, me);
  });

  _socket.on('user_typing', ({ userId, isTyping }) => {
    const sub = document.getElementById('chat-status');
    if (!sub) return;
    if (isTyping && userId !== (me?.uid || me?._id)) {
      sub.textContent = `${otherName} is typing…`;
      sub.style.color = 'var(--accent)';
    } else {
      sub.textContent = `${chat.otherUser.year||''} · ${chat.otherUser.department||''}`;
      sub.style.color = '';
    }
  });

  _socket.on('disconnect', () => { _socket = null; });
}

function appendMessage(m, me) {
  const el   = document.getElementById('msgs');
  if (!el) return;

  const myId = me?.uid || me?._id || '';
  const senderId = m.senderUser?._id || m.senderUser;
  const isMe = senderId?.toString() === myId?.toString();

  const time = new Date(m.createdAt || Date.now());
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const div = document.createElement('div');
  div.innerHTML = `
    <div class="msg-row ${isMe ? 'me' : 'them'}">
      <div class="bubble ${isMe ? 'me' : 'them'}">${esc(m.text)}</div>
    </div>
    <div class="msg-time-row ${isMe ? 'me' : 'them'}">${timeStr}</div>`;

  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\n/g,'<br>');
}


/* ══════════════════════════════════════════════════
   REQUESTS — real pending requests from DB
══════════════════════════════════════════════════ */
export async function renderRequests() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="background:var(--bg-secondary)">
      <div class="nav-bar">
        <div class="nav-left">
          <div>
            <div class="nav-title-large">Requests</div>
            <div class="nav-subtitle" id="req-sub">Loading…</div>
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
      requests.length ? `${requests.length} pending` : 'All caught up';

    const area = document.getElementById('req-area');

    if (!requests.length) {
      area.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔔</div>
          <div class="empty-title">No requests yet</div>
          <div class="empty-body">When someone wants to connect, they'll appear here.</div>
        </div>`;
      return;
    }

    area.innerHTML = requests.map(req => {
      const u    = req.fromUser;
      const name = u.username || u.name || 'Student';
      const tags = (u.lookingFor||[]).map(tagHTML).join('');
      return `
        <div class="request-card" data-conn-id="${req._id}">
          <div style="display:flex;gap:12px;align-items:center">
            ${avatarHTML(name, u.photoURL, 52)}
            <div style="flex:1">
              <div style="font-size:16px;font-weight:600;color:var(--label-primary)">${name}</div>
              <div style="font-size:13px;color:var(--label-secondary);margin-top:2px">${u.department||''} · ${u.year||''}</div>
              ${u.bio ? `<div style="font-size:13px;color:var(--label-secondary);margin-top:4px">"${u.bio}"</div>` : ''}
            </div>
          </div>
          ${tags ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${tags}</div>` : ''}
          <div class="req-actions">
            <button class="req-btn-decline" data-action="reject"  data-conn-id="${req._id}">Decline</button>
            <button class="req-btn-accept"  data-action="accept"  data-conn-id="${req._id}">✓ Accept</button>
          </div>
        </div>`;
    }).join('');

    document.querySelectorAll('[data-action]').forEach(btn =>
      btn.onclick = async () => {
        const connId = btn.dataset.connId;
        const action = btn.dataset.action;
        const card   = btn.closest('.request-card');
        btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';

        try {
          const res2 = await fetch(`${API_URL}/connections/${action}`, {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ connectionId: connId }),
          });
          if (!res2.ok) throw new Error('Failed');

          toast(action === 'accept' ? 'Connected! 🎉 Open Chats to say hi' : 'Request declined', 'success');
          card?.remove();

          const remaining = document.querySelectorAll('.request-card').length;
          const sub = document.getElementById('req-sub');
          if (sub) sub.textContent = remaining ? `${remaining} pending` : 'All caught up';

          if (!remaining) {
            document.getElementById('req-area').innerHTML = `
              <div class="empty-state">
                <div class="empty-icon">✅</div>
                <div class="empty-title">All caught up!</div>
              </div>`;
          }
        } catch {
          toast('Something went wrong', 'error');
          btn.disabled = false;
          btn.textContent = action === 'accept' ? '✓ Accept' : 'Decline';
        }
      }
    );
  } catch (err) {
    console.error(err);
    document.getElementById('req-area').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load requests</div>
      </div>`;
  }
}