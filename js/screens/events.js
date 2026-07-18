// js/screens/events.js
import {
  navigate, back, getState, getParams,
  toast, confirm,
} from '../helpers.js';
import { tabBarHTML, bindTabs } from './tabs.js';
import API_URL from '../api.js';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  };
}

function isOrganizer() {
  return (getState().currentUser?.role || 'student') === 'organizer';
}

/* ══════════════════════════════════════════════════
   EVENTS LIST — newest posted first
══════════════════════════════════════════════════ */
export async function renderEvents() {
  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter" style="background:var(--bg-secondary)">
      <div class="nav-bar">
        <div class="nav-left">
          <div>
            <div class="nav-title-large">Events</div>
            <div class="nav-subtitle" id="events-sub">Loading…</div>
          </div>
        </div>
        ${isOrganizer() ? `
          <div class="nav-right">
            <button class="nav-btn" id="create-event-btn" title="Create event">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>` : ''}
      </div>

      <div class="screen-body" id="events-area" style="padding:14px 16px 8px">
        <div class="page-loader-wrap">
          <div class="page-loader">
            <span class="page-loader-dot"></span>
            <span class="page-loader-dot"></span>
            <span class="page-loader-dot"></span>
          </div>
        </div>
      </div>

      ${tabBarHTML('events')}
    </div>`;

  bindTabs();
  document.getElementById('create-event-btn')?.addEventListener('click', () => navigate('/event-edit'));

  try {
    const res = await fetch(`${API_URL}/events`, { headers: authHeaders() });
    if (res.status === 401) { toast('Session expired — please login again', 'error'); navigate('/login'); return; }
    if (!res.ok) throw new Error('Failed to load events');

    const events = await res.json();
    const area = document.getElementById('events-area');
    document.getElementById('events-sub').textContent =
      events.length ? `${events.length} event${events.length !== 1 ? 's' : ''}` : 'Nothing posted yet';

    if (!events.length) {
      area.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎉</div>
          <div class="empty-title">No events yet</div>
          <div class="empty-body">${isOrganizer()
            ? 'Tap the + button above to post the first one.'
            : 'Check back soon — event leads will post here.'}</div>
        </div>`;
      return;
    }

    area.innerHTML = events.map((e, i) => eventCardHTML(e, i)).join('');

    document.querySelectorAll('.event-card').forEach(card => {
      card.addEventListener('click', () => navigate('/event-detail', { eventId: card.dataset.id }));
    });

  } catch (err) {
    console.error(err);
    document.getElementById('events-area').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load events</div>
        <div class="empty-body">Check your connection and try again.</div>
      </div>`;
  }
}

function eventCardHTML(e, i) {
  const cover = e.coverImages?.[0] || '';
  const dateObj = new Date(e.eventDate);
  const dateStr = dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const isPast = dateObj < new Date();

  return `
    <div class="event-card" data-id="${e._id}" style="animation-delay:${Math.min(i, 6) * 0.05}s">
      <div class="event-card-cover" style="${cover
        ? `background-image:url('${cover}')`
        : `background:linear-gradient(135deg,var(--accent-mid),var(--accent))`}">
        ${!cover ? `<div class="event-card-cover-icon">🎓</div>` : ''}
        <div class="event-card-cover-gradient"></div>
        <div class="event-card-date-badge ${isPast ? 'event-past' : ''}">
          <div class="event-card-date-day">${dateObj.getDate()}</div>
          <div class="event-card-date-month">${dateObj.toLocaleDateString('en-IN', { month: 'short' })}</div>
        </div>
      </div>
      <div class="event-card-body">
        <div class="event-card-title">${esc(e.title)}</div>
        <div class="event-card-meta">
          <span>🕐 ${dateStr} · ${timeStr}</span>
          ${e.location ? `<span>📍 ${esc(e.location)}</span>` : ''}
        </div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════
   EVENT DETAIL
══════════════════════════════════════════════════ */
export async function renderEventDetail() {
  const { eventId } = getParams();
  if (!eventId) { back(); return; }

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="nav-bar">
        <div class="nav-left">
          <button class="nav-back" id="back-btn">
            <svg viewBox="0 0 10 17" fill="none" style="width:10px;height:17px">
              <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Events
          </button>
        </div>
        <div class="nav-right" id="event-detail-actions"></div>
      </div>
      <div class="screen-body" id="event-detail-body">
        <div class="page-loader-wrap">
          <div class="page-loader">
            <span class="page-loader-dot"></span>
            <span class="page-loader-dot"></span>
            <span class="page-loader-dot"></span>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', back);

  try {
    const res = await fetch(`${API_URL}/events/${eventId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load event');
    const e = await res.json();

    if (isOrganizer()) {
      document.getElementById('event-detail-actions').innerHTML = `
        <button class="nav-btn" id="edit-event-btn" title="Edit">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M4 16l1-4 9-9 3 3-9 9-4 1z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
          </svg>
        </button>`;
      document.getElementById('edit-event-btn').addEventListener('click', () =>
        navigate('/event-edit', { eventId: e._id, existing: e })
      );
    }

    const dateObj = new Date(e.eventDate);
    const dateStr = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    const images = e.coverImages?.length ? e.coverImages : [];

    document.getElementById('event-detail-body').innerHTML = `
      ${images.length ? `
        <div class="event-gallery" id="event-gallery">
          ${images.map((img, i) => `
            <div class="event-gallery-slide" style="background-image:url('${img}')"></div>
          `).join('')}
        </div>
        ${images.length > 1 ? `
          <div class="event-gallery-dots" id="event-gallery-dots">
            ${images.map((_, i) => `<span class="event-gallery-dot ${i===0?'active':''}"></span>`).join('')}
          </div>` : ''}
      ` : `
        <div class="event-gallery event-gallery-empty">
          <div style="font-size:52px">🎓</div>
        </div>
      `}

      <div style="padding:20px 20px 8px">
        <div class="event-detail-title">${esc(e.title)}</div>

        <div class="event-detail-info-row">
          <div class="event-detail-info-icon">🕐</div>
          <div>
            <div class="event-detail-info-main">${dateStr}</div>
            <div class="event-detail-info-sub">${timeStr}</div>
          </div>
        </div>

        ${e.location ? `
          <div class="event-detail-info-row">
            <div class="event-detail-info-icon">📍</div>
            <div class="event-detail-info-main">${esc(e.location)}</div>
          </div>` : ''}
      </div>

      ${e.description ? `
        <div class="event-detail-section">
          <div class="event-detail-section-title">About</div>
          <div class="event-detail-desc">${esc(e.description).replace(/\n/g, '<br>')}</div>
        </div>` : ''}

      ${e.organizers?.length ? `
        <div class="event-detail-section">
          <div class="event-detail-section-title">Organized by</div>
          <div class="event-organizer-list">
            ${e.organizers.map(org => organizerRowHTML(org)).join('')}
          </div>
        </div>` : ''}

      <div style="height:8px"></div>

      ${e.applyLink ? `
        <div style="padding:16px 20px 36px">
          <a href="${esc(e.applyLink)}" target="_blank" rel="noopener noreferrer"
            class="btn btn-primary" style="text-decoration:none">
            Apply Now →
          </a>
        </div>` : `<div style="height:28px"></div>`}
    `;

    // Simple swipe/scroll gallery dot sync
    const gallery = document.getElementById('event-gallery');
    if (gallery && images.length > 1) {
      gallery.addEventListener('scroll', () => {
        const idx = Math.round(gallery.scrollLeft / gallery.clientWidth);
        document.querySelectorAll('.event-gallery-dot').forEach((d, i) =>
          d.classList.toggle('active', i === idx)
        );
      });
    }

  } catch (err) {
    console.error(err);
    document.getElementById('event-detail-body').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load this event</div>
      </div>`;
  }
}

function organizerRowHTML(org) {
  const contact = org.contact || '';
  const isEmail = contact.includes('@');
  const isPhone = /^[\d+\-\s()]{6,}$/.test(contact);
  const href = isEmail ? `mailto:${contact}` : isPhone ? `tel:${contact.replace(/[^\d+]/g,'')}` : null;

  return `
    <div class="event-organizer-row">
      <div class="event-organizer-avatar">${(org.name||'?').trim()[0]?.toUpperCase() || '?'}</div>
      <div style="flex:1;min-width:0">
        <div class="event-organizer-name">${esc(org.name || 'Unknown')}</div>
        ${org.roleTitle ? `<div class="event-organizer-role">${esc(org.roleTitle)}</div>` : ''}
      </div>
      ${contact ? (href
        ? `<a href="${href}" class="event-organizer-contact-btn">${isEmail ? '✉️' : '📞'}</a>`
        : `<span class="event-organizer-contact-text">${esc(contact)}</span>`
      ) : ''}
    </div>`;
}

/* ══════════════════════════════════════════════════
   CREATE / EDIT EVENT — organizer only
══════════════════════════════════════════════════ */
let _draftImages = [];
let _draftOrganizers = [];

export function renderEventEdit() {
  if (!isOrganizer()) {
    toast('Only event organizers can do this', 'error');
    navigate('/events');
    return;
  }

  const { eventId, existing } = getParams();
  const isEdit = !!eventId;
  const e = existing || {};

  _draftImages = [...(e.coverImages || [])];
  _draftOrganizers = e.organizers?.length ? [...e.organizers] : [{ name: '', contact: '', roleTitle: '' }];

  const dateVal = e.eventDate ? new Date(e.eventDate).toISOString().slice(0, 16) : '';

  document.getElementById('app').innerHTML = `
    <div class="screen screen-enter">
      <div class="nav-bar">
        <div class="nav-left">
          <button class="nav-back" id="back-btn">
            <svg viewBox="0 0 10 17" fill="none" style="width:10px;height:17px">
              <path d="M9 1L1.5 8.5L9 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Cancel
          </button>
        </div>
        <div class="nav-center"><span class="nav-title-inline">${isEdit ? 'Edit Event' : 'New Event'}</span></div>
        <div class="nav-right" style="min-width:60px"></div>
      </div>

      <div class="screen-body" style="background:var(--bg-secondary);padding-bottom:40px">

        <div class="form-label-above" style="padding:0 20px;margin-top:16px">Cover Photos</div>
        <div style="padding:8px 16px 4px">
          <div id="cover-thumbs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"></div>
          <button class="btn btn-secondary-fill" id="add-photo-btn" style="width:auto;padding:10px 18px;font-size:13px">
            📷 Add photo
          </button>
          <input type="file" id="photo-input" accept="image/*" multiple style="display:none" />
        </div>

        <div class="form-label-above" style="padding:0 20px">Event Title</div>
        <div class="form-section" style="margin:8px 16px 16px">
          <div class="form-row" style="border-bottom:none">
            <input id="ev-title" type="text" placeholder="e.g. Tech Fest 2026" value="${esc(e.title||'')}" />
          </div>
        </div>

        <div class="form-label-above" style="padding:0 20px">Date & Time</div>
        <div class="form-section" style="margin:8px 16px 16px">
          <div class="form-row" style="border-bottom:none">
            <input id="ev-date" type="datetime-local" value="${dateVal}"
              style="flex:1;font-size:15px;color:var(--label-primary);padding:12px 0;background:none;border:none;outline:none;font-family:var(--font)" />
          </div>
        </div>

        <div class="form-label-above" style="padding:0 20px">Location</div>
        <div class="form-section" style="margin:8px 16px 16px">
          <div class="form-row" style="border-bottom:none">
            <input id="ev-location" type="text" placeholder="e.g. Main Auditorium" value="${esc(e.location||'')}" />
          </div>
        </div>

        <div class="form-label-above" style="padding:0 20px">Description</div>
        <div class="form-section" style="margin:8px 16px 16px">
          <div class="form-row" style="border-bottom:none;align-items:flex-start">
            <textarea id="ev-desc" rows="4"
              style="flex:1;font-size:15px;color:var(--label-primary);padding:12px 0;line-height:1.5;resize:none"
              placeholder="What's this event about?">${esc(e.description||'')}</textarea>
          </div>
        </div>

        <div class="form-label-above" style="padding:0 20px">Organizers</div>
        <div style="padding:8px 16px 4px" id="organizers-area"></div>
        <div style="padding:4px 16px 16px">
          <button class="btn btn-secondary-fill" id="add-organizer-btn" style="width:auto;padding:9px 16px;font-size:13px">
            + Add organizer
          </button>
        </div>

        <div class="form-label-above" style="padding:0 20px">Application Form Link</div>
        <div class="form-section" style="margin:8px 16px 24px">
          <div class="form-row" style="border-bottom:none">
            <input id="ev-apply" type="url" placeholder="https://forms.gle/…" value="${esc(e.applyLink||'')}" />
          </div>
        </div>

        <div style="padding:0 16px;display:flex;gap:10px">
          ${isEdit ? `<button class="btn btn-secondary-fill" id="delete-event-btn" style="flex:1;color:var(--red)">Delete</button>` : ''}
          <button class="btn btn-primary" id="save-event-btn" style="flex:${isEdit?2:1};margin-top:0">
            ${isEdit ? 'Save Changes' : 'Post Event'}
          </button>
        </div>
      </div>
    </div>`;

  document.getElementById('back-btn').addEventListener('click', () =>
    navigate(isEdit ? '/event-detail' : '/events', isEdit ? { eventId } : {})
  );

  renderCoverThumbs();
  renderOrganizerRows();

  document.getElementById('add-photo-btn').addEventListener('click', () =>
    document.getElementById('photo-input').click()
  );
  document.getElementById('photo-input').addEventListener('change', handlePhotoSelect);
  document.getElementById('add-organizer-btn').addEventListener('click', () => {
    _draftOrganizers.push({ name: '', contact: '', roleTitle: '' });
    renderOrganizerRows();
  });
  document.getElementById('save-event-btn').addEventListener('click', () => saveEvent(eventId));
  document.getElementById('delete-event-btn')?.addEventListener('click', () => deleteEvent(eventId));
}

function renderCoverThumbs() {
  const wrap = document.getElementById('cover-thumbs');
  if (!wrap) return;
  wrap.innerHTML = _draftImages.map((img, i) => `
    <div style="position:relative;width:72px;height:72px;border-radius:12px;overflow:hidden;flex-shrink:0">
      <img src="${img}" style="width:100%;height:100%;object-fit:cover" />
      <button data-remove-img="${i}" style="position:absolute;top:3px;right:3px;width:20px;height:20px;
        border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;font-size:12px;cursor:pointer;
        display:flex;align-items:center;justify-content:center">✕</button>
    </div>`).join('');
  wrap.querySelectorAll('[data-remove-img]').forEach(btn =>
    btn.addEventListener('click', () => {
      _draftImages.splice(parseInt(btn.dataset.removeImg), 1);
      renderCoverThumbs();
    })
  );
}

function handlePhotoSelect(e) {
  const files = Array.from(e.target.files || []).slice(0, 6 - _draftImages.length);
  files.forEach(file => {
    // Resize client-side so uploads stay small regardless of original photo size
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        _draftImages.push(canvas.toDataURL('image/jpeg', 0.75));
        renderCoverThumbs();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function renderOrganizerRows() {
  const wrap = document.getElementById('organizers-area');
  if (!wrap) return;
  wrap.innerHTML = _draftOrganizers.map((org, i) => `
    <div class="form-section" style="margin-bottom:10px;position:relative">
      <div class="form-row">
        <input data-org-field="name" data-org-i="${i}" type="text" placeholder="Name" value="${esc(org.name||'')}" style="font-weight:600" />
      </div>
      <div class="form-row">
        <input data-org-field="roleTitle" data-org-i="${i}" type="text" placeholder="Role (e.g. Event Lead)" value="${esc(org.roleTitle||'')}" />
      </div>
      <div class="form-row" style="border-bottom:none">
        <input data-org-field="contact" data-org-i="${i}" type="text" placeholder="Phone or email" value="${esc(org.contact||'')}" />
      </div>
      ${_draftOrganizers.length > 1 ? `
        <button data-remove-org="${i}" style="position:absolute;top:8px;right:8px;background:none;border:none;
          color:var(--red);font-size:13px;cursor:pointer;padding:4px 8px">Remove</button>` : ''}
    </div>`).join('');

  wrap.querySelectorAll('[data-org-field]').forEach(input =>
    input.addEventListener('input', () => {
      const i = parseInt(input.dataset.orgI);
      _draftOrganizers[i][input.dataset.orgField] = input.value;
    })
  );
  wrap.querySelectorAll('[data-remove-org]').forEach(btn =>
    btn.addEventListener('click', () => {
      _draftOrganizers.splice(parseInt(btn.dataset.removeOrg), 1);
      renderOrganizerRows();
    })
  );
}

async function saveEvent(eventId) {
  const title     = document.getElementById('ev-title').value.trim();
  const eventDate = document.getElementById('ev-date').value;
  const location  = document.getElementById('ev-location').value.trim();
  const description = document.getElementById('ev-desc').value.trim();
  const applyLink = document.getElementById('ev-apply').value.trim();

  if (!title)     { toast('Event title is required', 'error'); return; }
  if (!eventDate) { toast('Event date is required', 'error'); return; }

  const btn = document.getElementById('save-event-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving…';

  const payload = {
    title, eventDate, location, description, applyLink,
    coverImages: _draftImages,
    organizers: _draftOrganizers.filter(o => o.name.trim()),
  };

  try {
    const res = await fetch(
      eventId ? `${API_URL}/events/${eventId}` : `${API_URL}/events`,
      {
        method: eventId ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to save event');

    toast(eventId ? 'Event updated ✓' : 'Event posted 🎉', 'success');
    navigate('/event-detail', { eventId: eventId || data.event._id });

  } catch (err) {
    toast(err.message || 'Could not save event', 'error');
    btn.disabled = false;
    btn.textContent = eventId ? 'Save Changes' : 'Post Event';
  }
}

async function deleteEvent(eventId) {
  const ok = await confirm('Delete event?', 'This cannot be undone. Students will no longer see this event.');
  if (!ok) return;

  const btn = document.getElementById('delete-event-btn');
  btn.disabled = true; btn.textContent = 'Deleting…';

  try {
    const res = await fetch(`${API_URL}/events/${eventId}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to delete');
    toast('Event deleted', 'success');
    navigate('/events');
  } catch (err) {
    toast('Could not delete event', 'error');
    btn.disabled = false; btn.textContent = 'Delete';
  }
}

function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}