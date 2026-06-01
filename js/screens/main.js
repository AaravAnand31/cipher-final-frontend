// js/screens/main.js  —  Discover, Chats, Chatroom, Requests

import {
  navigate, back, getParams, getState, setState,
  avatarHTML, tagHTML, timeAgo, toast, spinnerHTML, confirm,
  DUMMY_PEOPLE, DUMMY_CHATS, DUMMY_MESSAGES, DUMMY_REQUESTS,
  YEARS, LOOKING,
} from '../helpers.js';
import { tabBarHTML, bindTabs } from './tabs.js';

/* ══════════════════════════════════════════════════
   DISCOVER
══════════════════════════════════════════════════ */
let skipped = new Set();
let connected = new Set();
let discoverFilter = { year: 'All', lookingFor: 'All' };

export function renderDiscover() {
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
        ${feedHTML()}
      </div>

      ${tabBarHTML('discover')}
    </div>`;

  bindTabs();
  bindFeed();

  document.getElementById('quick-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-lf]'); if (!btn) return;
    discoverFilter.lookingFor = btn.dataset.lf;
    document.querySelectorAll('#quick-filters .chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('feed-area').innerHTML = feedHTML();
    bindFeed();
  });

  document.getElementById('filter-btn').addEventListener('click', openFilterSheet);
}

function visible() {
  return DUMMY_PEOPLE.filter(p => {
    if (skipped.has(p.uid) || connected.has(p.uid)) return false;
    if (discoverFilter.year !== 'All' && p.year !== discoverFilter.year) return false;
    if (discoverFilter.lookingFor !== 'All' && !p.lookingFor.includes(discoverFilter.lookingFor)) return false;
    return true;
  });
}

function feedHTML() {
  const list = visible();
  if (!list.length) return `
    <div class="empty-state">
      <div class="empty-icon">🧭</div>
      <div class="empty-title">You've seen everyone!</div>
      <div class="empty-body">Come back tomorrow — new students join every day.</div>
      <button class="btn btn-secondary-fill" id="refresh-btn"
        style="margin-top:24px;width:auto;padding:12px 32px">Refresh feed</button>
    </div>`;

  return `<div style="padding-bottom:20px">${list.map(p => personCard(p)).join('')}</div>`;
}

function personCard(p) {
  const tags = (p.lookingFor||[]).map(tagHTML).join('');
  const interests = (p.interests||[]).slice(0,4).map(i =>
    `<span class="interest-pill">${i}</span>`).join('');
  const coverBg = `background:linear-gradient(135deg,hsl(${p.uid.charCodeAt(1)*20},40%,88%),hsl(${p.uid.charCodeAt(1)*40},35%,82%))`;

  return `
    <div class="discover-card" data-uid="${p.uid}">
      <div class="card-cover" style="${p.coverURL ? '' : coverBg}">
        ${p.coverURL ? `<img src="${p.coverURL}" alt="" />` : ''}
        <div class="card-cover-gradient"></div>
        <div class="card-badge">${p.year}</div>
      </div>

      <div class="card-avatar-row">
        <div class="card-avatar-border">
          ${avatarHTML(p.name, p.photoURL, 62)}
        </div>
      </div>

      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-meta">${p.department}</div>
        <div class="card-tags">${tags}</div>
      </div>

      ${p.icebreaker
        ? `<div class="card-icebreaker">"${p.icebreaker}"</div>`
        : p.bio ? `<div class="card-icebreaker">"${p.bio}"</div>` : ''}

      ${interests ? `<div class="card-interests">${interests}</div>` : ''}

      <div class="card-actions">
        <button class="card-btn-skip" data-skip="${p.uid}">✕ &nbsp;Pass</button>
        <button class="card-btn-connect" data-connect="${p.uid}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Connect
        </button>
      </div>
    </div>`;
}

function bindFeed() {
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    skipped = new Set(); connected = new Set();
    document.getElementById('feed-area').innerHTML = feedHTML();
    bindFeed();
  });
  document.querySelectorAll('[data-skip]').forEach(btn =>
    btn.addEventListener('click', () => {
      skipped.add(btn.dataset.skip);
      document.getElementById('feed-area').innerHTML = feedHTML();
      bindFeed();
    })
  );
  document.querySelectorAll('[data-connect]').forEach(btn =>
    btn.addEventListener('click', () => {
      const uid = btn.dataset.connect;
      const orig = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>`;
      setTimeout(() => {
        connected.add(uid);
        toast('Connection request sent! 🤝', 'success');
        document.getElementById('feed-area').innerHTML = feedHTML();
        bindFeed();
      }, 700);
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
    document.getElementById('feed-area').innerHTML = feedHTML();
    bindFeed();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ══════════════════════════════════════════════════
   CHATS
══════════════════════════════════════════════════ */
export function renderChats() {
  const chats = DUMMY_CHATS;

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="nav-bar">
        <div class="nav-left">
          <div style="display:flex;flex-direction:column">
            <span class="nav-title-large">Chats</span>
            <span class="nav-subtitle">${chats.length} conversations</span>
          </div>
        </div>
        <div class="nav-right">
          <button class="nav-btn" title="New chat">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 4v10M4 9h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="screen-body">
        ${chats.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">💬</div>
            <div class="empty-title">No chats yet</div>
            <div class="empty-body">When you and someone both connect, your chat opens here.</div>
          </div>` :
          `<div style="background:var(--bg-card);margin:16px;border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-sm)">
            ${chats.map((c, i) => chatRow(c, i === chats.length - 1)).join('')}
          </div>`
        }
      </div>

      ${tabBarHTML('chats')}
    </div>`;

  bindTabs();
  document.querySelectorAll('[data-chatid]').forEach(el =>
    el.addEventListener('click', () => {
      const chat = DUMMY_CHATS.find(c => c.chatId === el.dataset.chatid);
      navigate('/chatroom', { chat });
    })
  );
}

function chatRow(c, isLast) {
  const u = c.otherUser;
  return `
    <div class="chat-row" data-chatid="${c.chatId}" style="${isLast ? 'border-bottom:none' : ''}">
      <div style="position:relative">
        ${avatarHTML(u.name, u.photoURL, 50)}
        <div style="position:absolute;bottom:0;right:0;width:12px;height:12px;
          background:#34c759;border-radius:50%;border:2px solid var(--bg-card)"></div>
      </div>
      <div class="chat-info">
        <div class="chat-name">${u.name}</div>
        <div class="chat-preview">${c.lastMessage}</div>
      </div>
      <div class="chat-right">
        <span class="chat-time">${timeAgo(c.lastMessageAt)}</span>
        ${c.unread > 0 ? `<span class="chat-unread">${c.unread}</span>` : ''}
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════
   CHAT ROOM
══════════════════════════════════════════════════ */
let chatMessages = {};

export function renderChatroom() {
  const { chat } = getParams();
  if (!chat) { back(); return; }

  const u = chat.otherUser;
  const msgs = chatMessages[chat.chatId] || DUMMY_MESSAGES[chat.chatId] || [];
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
          ${avatarHTML(u.name, u.photoURL, 36)}
          <div class="chatroom-info">
            <div class="chatroom-name">${u.name}</div>
            <div class="chatroom-sub">${u.year} · ${u.department}</div>
          </div>
          <button class="nav-btn" id="more-btn" style="margin-left:auto">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="4" r="1.3" fill="currentColor"/>
              <circle cx="9" cy="9" r="1.3" fill="currentColor"/>
              <circle cx="9" cy="14" r="1.3" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <div class="messages-list" id="msgs"></div>

        <div class="input-bar">
          <div class="msg-input-wrap">
            <textarea class="msg-input" id="msg-input"
              placeholder="iMessage" rows="1" maxlength="500"></textarea>
          </div>
          <button class="send-btn" id="send-btn" disabled>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 13V3M3 8l5-5 5 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>`;

  renderMessages(chat.chatId);

  document.getElementById('back-btn').addEventListener('click', back);
  document.getElementById('more-btn').addEventListener('click', async () => {
    const ok = await confirm(`Block ${u.name}?`, `They won't see your profile or message you. You can unblock them in Settings.`);
    if (ok) { toast(`${u.name} blocked`, 'success'); back(); }
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

    const newMsg = { id: Date.now(), senderUid: 'me-001', text, time: new Date() };
    chatMessages[chat.chatId] = [...(chatMessages[chat.chatId] || []), newMsg];
    renderMessages(chat.chatId);
  });
}

function renderMessages(chatId) {
  const el = document.getElementById('msgs');
  if (!el) return;
  const msgs = chatMessages[chatId] || [];

  el.innerHTML = msgs.map((m, i) => {
    const isMe = m.senderUid === 'me-001';
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
   REQUESTS
══════════════════════════════════════════════════ */
let requests = [...DUMMY_REQUESTS];

export function renderRequests() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="background:var(--bg-secondary)">
      <div class="nav-bar">
        <div class="nav-left">
          <div style="display:flex;flex-direction:column">
            <span class="nav-title-large">Requests</span>
            <span class="nav-subtitle" id="req-sub">${requests.length} pending</span>
          </div>
        </div>
      </div>

      <div class="screen-body" id="req-area" style="padding-top:16px">
        ${reqListHTML()}
      </div>

      ${tabBarHTML('requests')}
    </div>`;

  bindTabs();
  bindRequests();
}

function reqListHTML() {
  if (!requests.length) return `
    <div class="empty-state">
      <div class="empty-icon">🔔</div>
      <div class="empty-title">No requests yet</div>
      <div class="empty-body">When someone wants to connect with you, they'll appear here.</div>
    </div>`;

  return requests.map(req => {
    const u = req.fromUser;
    const tags = (u.lookingFor||[]).map(tagHTML).join('');
    return `
      <div class="request-card" data-rid="${req.requestId}">
        <div class="req-top">
          ${avatarHTML(u.name, u.photoURL, 52)}
          <div class="req-info">
            <div class="req-name">${u.name}</div>
            <div class="req-meta">${u.department} · ${u.year}</div>
            ${u.bio ? `<div class="req-bio">"${u.bio}"</div>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${tags}</div>
        <div class="req-actions">
          <button class="req-btn-decline" data-action="decline" data-rid="${req.requestId}">Decline</button>
          <button class="req-btn-accept"  data-action="accept"  data-rid="${req.requestId}">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l4 4 6-7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Accept
          </button>
        </div>
      </div>`;
  }).join('');
}

function bindRequests() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rid    = btn.dataset.rid;
      const action = btn.dataset.action;
      const orig   = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>`;

      setTimeout(() => {
        requests = requests.filter(r => r.requestId !== rid);
        setState({ pendingCount: requests.length });

        if (action === 'accept') {
          toast('Connected! 🎉 Chat is now open', 'success');
        } else {
          toast('Request declined');
        }

        document.getElementById('req-area').innerHTML = reqListHTML();
        const sub = document.getElementById('req-sub');
        if (sub) sub.textContent = requests.length > 0 ? `${requests.length} pending` : 'All caught up';
        bindRequests();
      }, 600);
    });
  });
}